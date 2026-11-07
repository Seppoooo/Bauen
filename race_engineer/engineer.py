"""The race engineer: watches snapshots and decides what to say and when."""
from __future__ import annotations

from collections import deque
import math

from . import model as M
from .model import Callout, Snapshot

CRITICAL, HIGH, NORMAL, INFO = 0, 1, 2, 3


# ---------------------------------------------------------------- formatting
def num(value: float, digits: int = 1) -> str:
    """German decimal: 1.25 -> '1,3' (TTS reads 'eins Komma drei')."""
    return f"{value:.{digits}f}".replace(".", ",")


def laptime(t: float) -> str:
    if t is None or t <= 0:
        return "--"
    m, s = divmod(t, 60)
    return f"{int(m)}:{s:04.1f}".replace(".", ",") if m else f"{num(s)}"


def laptime_spoken(t: float) -> str:
    """'1 32,4' reads naturally ("eins zweiunddreißig Komma vier")."""
    if t <= 0:
        return ""
    m, s = divmod(t, 60)
    return f"{int(m)} {num(s)}" if m else f"{num(s)} Sekunden"


def gap_text(gap: float) -> str:
    if gap < 1.0:
        tenths = round(gap * 10)
        return "ein Zehntel" if tenths <= 1 else f"{tenths} Zehntel"
    return f"{num(gap)} Sekunden"


def tires_text(indices: list[int]) -> str:
    idx = set(indices)
    if idx == {0, 1, 2, 3}:
        return "alle Reifen"
    if idx == {0, 1}:
        return "die Vorderreifen"
    if idx == {2, 3}:
        return "die Hinterreifen"
    if idx == {0, 2}:
        return "die linken Reifen"
    if idx == {1, 3}:
        return "die rechten Reifen"
    return " und ".join(f"Reifen {M.TIRE_NAMES[i]}" for i in sorted(idx))


def cap(text: str) -> str:
    return text[:1].upper() + text[1:]


def positions_word(n: int) -> str:
    return "eine Position" if n == 1 else f"{n} Positionen"


# ---------------------------------------------------------------- fuel
class FuelTracker:
    """Measures real consumption per lap (ignores laps with pit stops)."""

    def __init__(self, window: int = 5):
        self.samples: deque[float] = deque(maxlen=window)
        self.lap_times: deque[float] = deque(maxlen=window)
        self.lap_start_fuel: float | None = None
        self.lap_tainted = True     # first (partial) lap is never measured

    def taint(self):
        self.lap_tainted = True

    def on_lap(self, fuel_now: float, last_lap: float, valid: bool):
        if not self.lap_tainted and self.lap_start_fuel is not None:
            used = self.lap_start_fuel - fuel_now
            if used > 0.05:
                self.samples.append(used)
            if last_lap > 0 and valid:
                self.lap_times.append(last_lap)
        self.lap_start_fuel = fuel_now
        self.lap_tainted = False

    @property
    def per_lap(self) -> float | None:
        return sum(self.samples) / len(self.samples) if self.samples else None

    @property
    def avg_lap(self) -> float | None:
        return sum(self.lap_times) / len(self.lap_times) if self.lap_times else None

    def laps_left(self, fuel: float) -> float | None:
        per = self.per_lap
        return fuel / per if per and fuel >= 0 else None


# ---------------------------------------------------------------- engineer
class Engineer:
    """verbosity: 1 = only important, 2 = normal, 3 = chatty."""

    def __init__(self, verbosity: int = 2):
        self.verbosity = verbosity
        self._reset_session()

    # -------------------------------------------------------------- state
    def _reset_session(self):
        self.prev: Snapshot | None = None
        self.fuel = FuelTracker()
        self._cooldown: dict[str, float] = {}
        self._once: set[str] = set()
        self._since: dict[str, float] = {}
        self._session_key = None
        self._announced_position = -1
        self._position_candidate = -1
        self._position_since = 0.0
        self._gap_history: deque[float] = deque(maxlen=3)
        self._damage_level = {}
        self._wear_level = 0
        self._fuel_level = 0
        self._pending_lap = None
        self._best_lap_seen = -1.0
        self.last_snapshot: Snapshot | None = None

    def _ready(self, key: str, seconds: float, now: float) -> bool:
        if now < self._cooldown.get(key, -math.inf):
            return False
        self._cooldown[key] = now + seconds
        return True

    def _first(self, key: str) -> bool:
        if key in self._once:
            return False
        self._once.add(key)
        return True

    def _sustained(self, key: str, condition: bool, seconds: float, now: float) -> bool:
        if not condition:
            self._since.pop(key, None)
            return False
        start = self._since.setdefault(key, now)
        return now - start >= seconds

    # -------------------------------------------------------------- public
    def strategy(self) -> dict:
        s = self.last_snapshot
        per = self.fuel.per_lap
        out = {"fuel_per_lap": per, "fuel_laps_left": None, "race_laps_left": None,
               "fuel_to_add": None, "avg_lap": self.fuel.avg_lap}
        if s is None:
            return out
        out["fuel_laps_left"] = self.fuel.laps_left(s.fuel_left)
        remaining = self._race_laps_remaining(s)
        out["race_laps_left"] = remaining
        if per and remaining is not None and s.fuel_left >= 0:
            out["fuel_to_add"] = max(0.0, (remaining + 0.5) * per - s.fuel_left)
        return out

    def update(self, s: Snapshot) -> list[Callout]:
        out: list[Callout] = []
        if not s.connected or not s.active:
            self.prev = None if not s.connected else self.prev
            return out
        key = (s.session_type, s.track, s.car)
        if key != self._session_key or (self.prev and s.completed_laps < self.prev.completed_laps):
            self._reset_session()
            self._session_key = key
            out += self._session_intro(s)
        self.last_snapshot = s
        p = self.prev
        self.prev = s
        if p is None or s.paused:
            return out

        say = lambda text, prio=NORMAL, cat="info": out.append(Callout(text, prio, cat))
        now = s.timestamp

        self._start_and_flags(s, p, now, say)
        self._penalties(s, p, now, say)
        self._pit(s, p, now, say)
        if s.completed_laps > p.completed_laps:
            # lap counter and lap time are not always updated in the same frame
            self._pending_lap = (now, p.last_lap)
        if self._pending_lap and (s.last_lap != self._pending_lap[1]
                                  or now - self._pending_lap[0] > 1.5):
            self._pending_lap = None
            self._lap_completed(s, p, now, say)
        self._positions(s, now, say)
        self._session_time(s, p, say)
        self._fuel_warnings(s, p, say)
        self._tires(s, now, say)
        self._brakes(s, now, say)
        self._damage(s, say)
        self._battles(s, now, say)
        out.sort(key=lambda c: c.priority)
        return out

    def status_report(self) -> list[Callout]:
        s = self.last_snapshot
        if s is None:
            return [Callout("Ich habe noch keine Daten vom Spiel.", INFO, "status")]
        parts = []
        if s.position > 0:
            parts.append(f"P{s.position} von {s.num_cars}.")
        if s.session_type == M.RACE:
            if s.gap_ahead > 0 and s.name_ahead:
                parts.append(f"Vorne {gap_text(s.gap_ahead)} auf {s.name_ahead}.")
            if s.gap_behind > 0 and s.name_behind:
                parts.append(f"Hinten {gap_text(s.gap_behind)} zu {s.name_behind}.")
        elif s.best_lap > 0:
            parts.append(f"Deine Bestzeit ist {laptime_spoken(s.best_lap)}.")
        laps = self.fuel.laps_left(s.fuel_left)
        if laps is not None and s.fuel_use_active:
            parts.append(f"Sprit für {self._laps_word(laps)}.")
        strat = self.strategy()
        if strat["fuel_to_add"] is not None and s.session_type == M.RACE:
            if strat["fuel_to_add"] > 0.5:
                parts.append(f"Bis ins Ziel fehlen {num(strat['fuel_to_add'], 0)} Liter.")
            else:
                parts.append("Sprit reicht bis ins Ziel.")
        worn = [w for w in s.tire_wear if w >= 0]
        if worn:
            parts.append(f"Reifen bei {round(min(worn) * 100)} Prozent.")
        return [Callout(" ".join(parts) or "Alles ruhig.", HIGH, "status")]

    # -------------------------------------------------------------- rules
    def _session_intro(self, s: Snapshot) -> list[Callout]:
        names = {M.PRACTICE: "Training", M.QUALIFY: "Qualifying",
                 M.RACE: "Rennen", M.WARMUP: "Warm-up"}
        name = names.get(s.session_type)
        if not name:
            return []
        text = f"Funkcheck. {name}"
        if s.track:
            text += f" in {s.track.split(' – ')[0]}"
        text += ". Ich bin bei dir."
        return [Callout(text, INFO, "session")]

    def _start_and_flags(self, s, p, now, say):
        if s.session_type == M.RACE:
            if s.session_phase == M.PHASE_FORMATION and self._first("formation"):
                say("Formationsrunde. Bring Temperatur in Reifen und Bremsen.", NORMAL, "start")
            if (s.start_lights == 6 and p.start_lights != 6) or \
               (s.session_phase == M.PHASE_GREEN and p.session_phase in (M.PHASE_COUNTDOWN, M.PHASE_FORMATION)):
                if self._first("green"):
                    say("Grün, grün, grün! Los geht's!", CRITICAL, "start")
                    self.fuel.taint()

        if s.flag_yellow and not p.flag_yellow and self._ready("yellow", 8, now):
            where = f" in Sektor {s.yellow_sector}" if s.yellow_sector > 0 else ""
            say(f"Gelbe Flagge{where}. Vorsicht, nicht überholen.", CRITICAL, "flag")
        elif p.flag_yellow and not s.flag_yellow and self._ready("yellow_clear", 15, now):
            say("Gelb aufgehoben, Strecke ist frei.", NORMAL, "flag")

        if s.flag_blue and not p.flag_blue and self._ready("blue", 20, now):
            say("Blaue Flagge. Schnelleres Auto hinter dir, lass ihn vorbei.", HIGH, "flag")
        if s.flag_black and not p.flag_black:
            say("Schwarze Flagge gegen dich!", CRITICAL, "flag")

        if s.black_white_reason != p.black_white_reason and s.black_white_reason:
            msg = {1: "Verwarnung wegen blauer Flagge. Lass ihn vorbei!",
                   2: "Letzte Verwarnung, blaue Flagge! Sofort Platz machen!",
                   3: "Du fährst in die falsche Richtung!",
                   4: "Verwarnung, du kürzt die Strecke ab."}.get(s.black_white_reason)
            if msg and self._ready(f"bw{s.black_white_reason}", 10, now):
                say(msg, CRITICAL, "flag")

        if s.session_type == M.RACE and s.flag_white and not p.flag_white and self._first("lastlap"):
            say("Letzte Runde! Bring es nach Hause.", HIGH, "race")

        finished = (s.flag_checkered and not p.flag_checkered) or \
                   (s.session_phase == M.PHASE_CHECKERED and p.session_phase != M.PHASE_CHECKERED)
        if finished and self._first("checkered"):
            if s.session_type == M.RACE and s.position > 0:
                comment = {1: "Sieg! Riesen Job, Glückwunsch!",
                           2: "Starkes Ergebnis.", 3: "Podium! Klasse gemacht."}.get(
                    s.position, "Gut gefahren, wir schauen uns die Daten an.")
                say(f"Zielflagge! Du bist P{s.position}. {comment}", HIGH, "race")
            else:
                best = f" Deine Bestzeit: {laptime_spoken(s.best_lap)}." if s.best_lap > 0 else ""
                say(f"Session vorbei.{best}", HIGH, "session")

    def _penalties(self, s, p, now, say):
        if s.num_penalties > p.num_penalties:
            if s.penalty_drive_through and not p.penalty_drive_through:
                say("Durchfahrtsstrafe! Du musst in den nächsten Runden durch die Box.", CRITICAL, "penalty")
            elif s.penalty_stop_and_go and not p.penalty_stop_and_go:
                say("Stop-and-Go-Strafe! Komm in die Box.", CRITICAL, "penalty")
            elif s.penalty_slow_down and not p.penalty_slow_down:
                say("Strafe: Du musst Zeit zurückgeben. Lupf kurz das Gas.", CRITICAL, "penalty")
            elif s.penalty_time and not p.penalty_time:
                say("Zeitstrafe erhalten.", CRITICAL, "penalty")
            else:
                say("Du hast eine Strafe bekommen.", CRITICAL, "penalty")
        if p.cut_track_warnings >= 0 and s.cut_track_warnings > p.cut_track_warnings \
                and self._ready("cut", 5, now):
            n = s.cut_track_warnings
            say(f"Track Limits! Das ist Verwarnung Nummer {n}." if n > 1
                else "Track Limits, erste Verwarnung. Bleib auf der Strecke.", HIGH, "penalty")

    def _pit(self, s, p, now, say):
        if s.in_pitlane:
            self.fuel.taint()
            limit = s.pit_speed_limit_kmh
            too_fast = limit > 0 and s.speed_kmh > limit + 2
            if not s.pit_limiter and (too_fast or not p.in_pitlane) \
                    and s.speed_kmh > 20 and self._ready("limiter", 6, now):
                say("Pit Limiter!", CRITICAL, "pit")
        if p.in_pitlane and not s.in_pitlane and self._ready("pit_exit", 30, now):
            say("Raus aus der Box. Vorsicht beim Einfädeln, Reifen sind kalt.", NORMAL, "pit")
        if s.pit_window_status == 2 and p.pit_window_status == 1:
            say("Boxenfenster ist offen.", HIGH, "pit")
        if s.fuel_left > p.fuel_left + 1.0:      # refuelled
            self._fuel_level = 0
        if all(w >= 0 for w in s.tire_wear) and min(s.tire_wear) > 0.97 \
                and any(0 <= w < 0.9 for w in p.tire_wear):
            self._wear_level = 0                 # fresh tyres fitted

    def _lap_completed(self, s, p, now, say):
        valid = s.last_lap_valid
        self.fuel.on_lap(s.fuel_left, s.last_lap, valid)
        lap = s.last_lap
        is_race = s.session_type == M.RACE
        new_pb = valid and lap > 0 and s.best_lap > 0 and abs(s.best_lap - lap) < 0.001 \
            and (self._best_lap_seen < 0 or lap < self._best_lap_seen - 0.001)
        first_timed_lap = self._best_lap_seen < 0
        if new_pb:
            self._best_lap_seen = lap
        if is_race and first_timed_lap:
            new_pb = False          # lap 1 from a standing start says nothing

        # --- lap time
        if lap > 0:
            if not valid and not is_race:
                say("Die Runde war ungültig.", NORMAL, "lap")
            elif new_pb and s.session_best_lap > 0 and lap <= s.session_best_lap + 0.001 \
                    and s.num_cars > 1:
                say(f"{laptime_spoken(lap)}. Schnellste Runde im Feld! Stark!", HIGH, "lap")
            elif new_pb:
                say(f"{laptime_spoken(lap)}. Persönliche Bestzeit!", NORMAL if is_race else HIGH, "lap")
            elif not is_race or self.verbosity >= 3:
                text = laptime_spoken(lap)
                if s.best_lap > 0 and lap > s.best_lap:
                    text += f", {num(lap - s.best_lap)} über deiner Bestzeit"
                say(text + ".", INFO, "lap")

        if not is_race or "checkered" in self._once:
            return

        # --- laps remaining (lap-based races)
        if s.total_laps > 0:
            left = s.total_laps - s.completed_laps
            if left == 1 and self._first("lastlap"):
                say("Letzte Runde! Bring es nach Hause.", HIGH, "race")
            elif left in (10, 5, 3, 2) and self.verbosity >= 2:
                say(f"Noch {left} Runden.", INFO, "race")

        # --- gaps and trend
        self._gap_history.append(s.gap_ahead)
        every = 1 if self.verbosity >= 3 else 2
        if self.verbosity >= 2 and s.completed_laps >= 1 and s.completed_laps % every == 0:
            parts = [f"P{s.position}."]
            if s.gap_ahead > 0 and s.position > 1:
                trend = ""
                if len(self._gap_history) >= 2 and self._gap_history[-2] > 0:
                    diff = self._gap_history[-2] - s.gap_ahead
                    if abs(diff) >= 0.2:
                        trend = (f", du holst {gap_text(abs(diff))} pro Runde auf" if diff > 0
                                 else f", du verlierst {gap_text(abs(diff))} pro Runde")
                who = f" auf {s.name_ahead}" if s.name_ahead else ""
                parts.append(f"Vorne {gap_text(s.gap_ahead)}{who}{trend}.")
            if s.gap_behind > 0 and s.position < s.num_cars:
                parts.append(f"Hinten {gap_text(s.gap_behind)}.")
            if len(parts) > 1:
                say(" ".join(parts), INFO, "gap")

        # --- fuel outlook
        strat = self.strategy()
        if s.fuel_use_active and strat["fuel_to_add"] is not None and \
                (self._first("fuel_outlook") or s.completed_laps % 5 == 0):
            if strat["fuel_to_add"] > 0.5:
                say(f"Sprit: Bis ins Ziel fehlen etwa {num(strat['fuel_to_add'], 0)} Liter. "
                    f"Verbrauch {num(self.fuel.per_lap)} pro Runde.", NORMAL, "fuel")
            elif self.verbosity >= 2:
                say("Sprit reicht bis ins Ziel.", INFO, "fuel")

    def _positions(self, s, now, say):
        if s.session_type != M.RACE or s.session_phase != M.PHASE_GREEN or s.position <= 0:
            self._announced_position = s.position
            return
        if self._announced_position <= 0:
            self._announced_position = s.position
            return
        if s.position != self._position_candidate:
            self._position_candidate = s.position
            self._position_since = now
            return
        if s.position == self._announced_position or now - self._position_since < 3:
            return                               # unchanged or not yet stable
        diff = self._announced_position - s.position
        self._announced_position = s.position
        if diff > 0:
            say(cap(f"{positions_word(diff)} gewonnen, du bist jetzt P{s.position}!"),
                NORMAL, "position")
        else:
            say(cap(f"{positions_word(-diff)} verloren, jetzt P{s.position}."),
                NORMAL, "position")

    def _session_time(self, s, p, say):
        r, pr = s.session_time_remaining, p.session_time_remaining
        if r < 0 or pr < 0 or s.session_type not in (M.RACE, M.QUALIFY, M.PRACTICE):
            return
        for minutes in (10, 5, 2, 1):
            t = minutes * 60
            if pr > t >= r:
                if minutes == 1 and s.session_type == M.QUALIFY:
                    say("Noch eine Minute. Letzte Chance für eine schnelle Runde!", HIGH, "session")
                elif minutes == 1:
                    say("Noch eine Minute.", NORMAL, "session")
                elif minutes in (10, 5) or self.verbosity >= 2:
                    say(f"Noch {minutes} Minuten.", NORMAL, "session")
        if pr > 0 >= r and s.session_type == M.RACE:
            say("Die Zeit ist abgelaufen. Das hier ist deine letzte Runde.", HIGH, "race")
            self._once.add("lastlap")

    def _fuel_warnings(self, s, p, say):
        if not s.fuel_use_active:
            return
        laps = self.fuel.laps_left(s.fuel_left)
        if laps is None:
            return
        if s.session_type == M.RACE:
            remaining = self._race_laps_remaining(s)
            if remaining is not None and laps >= remaining + 0.3:
                return                              # enough to finish, stay quiet
        for level, threshold in ((3, 1.0), (2, 2.0), (1, 3.0)):
            if laps < threshold and self._fuel_level < level:
                self._fuel_level = level
                if threshold == 1.0:
                    say("Sprit kritisch! Weniger als eine Runde im Tank. Box, Box!", CRITICAL, "fuel")
                else:
                    say(f"Sprit wird knapp, noch {self._laps_word(laps)}.", HIGH, "fuel")
                break

    def _tires(self, s, now, say):
        if s.in_pitlane or s.speed_kmh < 60:
            return
        hot, cold = [], []
        for i in range(4):
            t = s.tire_temp[i]
            if t <= 0:
                continue
            if s.tire_temp_hot[i] > 0 and t > s.tire_temp_hot[i]:
                hot.append(i)
            elif s.tire_temp_cold[i] > 0 and t < s.tire_temp_cold[i]:
                cold.append(i)
        if self._sustained("tires_hot", bool(hot), 6, now) and self._ready("tires_hot", 90, now):
            say(f"Achtung, {tires_text(hot)} überhitzen. Schone sie ein bisschen.", NORMAL, "tires")
        warmed_up = s.completed_laps >= 1 and s.lap_fraction > 0.3
        if warmed_up and self._sustained("tires_cold", bool(cold), 10, now) \
                and self._ready("tires_cold", 120, now):
            say(cap(f"{tires_text(cold)} sind zu kalt. Mehr Temperatur reinbringen."),
                INFO, "tires")

        wear = [w for w in s.tire_wear if w >= 0]
        if wear:
            worst = min(wear)
            for level, threshold, prio, text in (
                    (3, 0.15, HIGH, "Die Reifen sind fast hinüber, {p} Prozent. Box empfohlen."),
                    (2, 0.30, NORMAL, "Reifen bei {p} Prozent. Grip lässt nach."),
                    (1, 0.50, INFO, "Reifen bei der Hälfte, {p} Prozent.")):
                if worst < threshold and self._wear_level < level:
                    self._wear_level = level
                    say(text.format(p=round(worst * 100)), prio, "tires")
                    break

    def _brakes(self, s, now, say):
        hot = [i for i in range(4) if s.brake_temp_hot[i] > 0 and s.brake_temp[i] > s.brake_temp_hot[i]]
        if self._sustained("brakes", bool(hot), 4, now) and self._ready("brakes", 120, now):
            where = "vorne" if all(i < 2 for i in hot) else "hinten" if all(i >= 2 for i in hot) else ""
            say(f"Bremsen {where} sind sehr heiß. Etwas früher bremsen.".replace("  ", " "),
                NORMAL, "brakes")

    def _damage(self, s, say):
        parts = {"Motor": s.damage_engine, "Getriebe": s.damage_transmission,
                 "Aerodynamik": s.damage_aero, "Fahrwerk": s.damage_suspension}
        for name, value in parts.items():
            if value < 0:
                continue
            level = 3 if value < 0.4 else 2 if value < 0.75 else 1 if value < 0.95 else 0
            if level > self._damage_level.get(name, 0):
                self._damage_level[name] = level
                severity = {1: "Leichter", 2: "Deutlicher", 3: "Schwerer"}[level]
                advice = " Wir sollten an die Box." if level == 3 else ""
                say(f"{severity} Schaden: {name}.{advice}", HIGH if level >= 2 else NORMAL, "damage")

    def _battles(self, s, now, say):
        if s.session_type != M.RACE or s.session_phase != M.PHASE_GREEN or s.completed_laps < 1 \
                or s.in_pitlane:
            return
        if 0 < s.gap_behind < 0.5 and self._sustained("pressure", True, 3, now) \
                and self._ready("pressure", 75, now):
            who = s.name_behind or "Das Auto hinter dir"
            say(f"{who} sitzt dir im Nacken. Innenbahn zumachen.", NORMAL, "battle")
        elif not (0 < s.gap_behind < 0.5):
            self._since.pop("pressure", None)
        if 0 < s.gap_ahead < 0.5 and self._sustained("attack", True, 3, now) \
                and self._ready("attack", 75, now):
            who = f" an {s.name_ahead}" if s.name_ahead else ""
            say(f"Du bist dran{who}. Such die Lücke!", INFO, "battle")
        elif not (0 < s.gap_ahead < 0.5):
            self._since.pop("attack", None)

    # -------------------------------------------------------------- helpers
    def _race_laps_remaining(self, s: Snapshot) -> float | None:
        if s.session_type != M.RACE:
            return None
        frac = s.lap_fraction if 0 <= s.lap_fraction <= 1 else 0.0
        if s.total_laps > 0 and s.completed_laps >= 0:
            return max(0.0, s.total_laps - s.completed_laps - frac)
        avg = self.fuel.avg_lap
        if s.session_time_remaining >= 0 and avg:
            return s.session_time_remaining / avg + 1.0
        return None

    @staticmethod
    def _laps_word(laps: float) -> str:
        if laps < 1:
            return "weniger als eine Runde"
        whole = int(laps)
        return "eine Runde" if whole == 1 else f"{whole} Runden"
