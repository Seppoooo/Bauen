import unittest

from race_engineer import model as M
from race_engineer.engineer import Engineer, FuelTracker, laptime_spoken, gap_text
from race_engineer.games.demo import DemoSource


def race_snap(t, **kw):
    base = dict(connected=True, active=True, session_type=M.RACE, session_phase=M.PHASE_GREEN,
                track="Test", car="GT3", position=5, num_cars=10, completed_laps=2,
                total_laps=20, speed_kmh=150.0, fuel_left=50.0, timestamp=t)
    base.update(kw)
    return M.Snapshot(**base)


class Runner:
    def __init__(self, verbosity=2):
        self.eng = Engineer(verbosity)
        self.said = []

    def feed(self, snap):
        out = self.eng.update(snap)
        self.said += [c.text for c in out]
        return [c.text for c in out]


class FormattingTest(unittest.TestCase):
    def test_formats(self):
        self.assertEqual(laptime_spoken(92.43), "1 32,4")
        self.assertEqual(gap_text(0.43), "4 Zehntel")
        self.assertEqual(gap_text(2.26), "2,3 Sekunden")


class EngineerRulesTest(unittest.TestCase):
    def test_yellow_flag_and_clear(self):
        r = Runner()
        r.feed(race_snap(0))
        out = r.feed(race_snap(1, flag_yellow=True, yellow_sector=2))
        self.assertIn("Gelbe Flagge in Sektor 2", out[0])
        out = r.feed(race_snap(2))
        self.assertIn("Gelb aufgehoben", out[0])

    def test_pit_limiter_warning(self):
        r = Runner()
        r.feed(race_snap(0))
        out = r.feed(race_snap(1, in_pitlane=True, pit_limiter=False, speed_kmh=90,
                               pit_speed_limit_kmh=60))
        self.assertEqual(out, ["Pit Limiter!"])
        out = r.feed(race_snap(2, in_pitlane=True, pit_limiter=True, speed_kmh=59,
                               pit_speed_limit_kmh=60))
        self.assertEqual(out, [])

    def test_position_needs_to_be_stable(self):
        r = Runner()
        r.feed(race_snap(0, position=5))
        r.feed(race_snap(1, position=5))
        self.assertEqual(r.feed(race_snap(2, position=4)), [])
        self.assertEqual(r.feed(race_snap(3, position=3)), [])
        out = r.feed(race_snap(6.5, position=3))
        self.assertEqual(out, ["2 Positionen gewonnen, du bist jetzt P3!"])

    def test_position_flicker_is_ignored(self):
        r = Runner()
        r.feed(race_snap(0, position=5))
        r.feed(race_snap(0.5, position=5))
        r.feed(race_snap(1, position=4))
        r.feed(race_snap(2, position=5))
        self.assertEqual(r.feed(race_snap(10, position=5)), [])

    def test_penalty_and_track_limits(self):
        r = Runner()
        r.feed(race_snap(0, cut_track_warnings=0))
        out = r.feed(race_snap(1, cut_track_warnings=1))
        self.assertIn("Track Limits", out[0])
        out = r.feed(race_snap(2, cut_track_warnings=1, num_penalties=1,
                               penalty_drive_through=True))
        self.assertIn("Durchfahrtsstrafe", out[0])

    def test_lap_time_waits_for_new_time(self):
        r = Runner(verbosity=1)
        snap = dict(session_type=M.QUALIFY)
        r.feed(race_snap(0, completed_laps=1, last_lap=95.0, best_lap=95.0, **snap))
        # counter jumps first, lap time follows one frame later
        self.assertEqual(r.feed(race_snap(1, completed_laps=2, last_lap=95.0, best_lap=95.0, **snap)), [])
        out = r.feed(race_snap(1.05, completed_laps=2, last_lap=93.2, best_lap=93.2, **snap))
        self.assertEqual(out, ["1 33,2. Persönliche Bestzeit!"])

    def test_session_time_countdown(self):
        r = Runner()
        r.feed(race_snap(0, session_time_remaining=301, total_laps=-1))
        out = r.feed(race_snap(1, session_time_remaining=299, total_laps=-1))
        self.assertEqual(out, ["Noch 5 Minuten."])

    def test_fuel_warning_when_short(self):
        r = Runner()
        fuel = 10.0
        for lap in range(2, 6):   # 3 L per lap, 20-lap race -> far too little fuel
            r.feed(race_snap(lap * 100, completed_laps=lap, last_lap=90.0 + lap, fuel_left=fuel))
            r.feed(race_snap(lap * 100 + 1, completed_laps=lap, last_lap=90.0 + lap, fuel_left=fuel))
            fuel -= 3.0
        self.assertTrue(any("Sprit" in t and "knapp" in t for t in r.said), r.said)
        self.assertTrue(any("Box, Box" in t for t in r.said), r.said)

    def test_no_callouts_in_menu(self):
        r = Runner()
        r.feed(race_snap(0))
        self.assertEqual(r.feed(race_snap(1, active=False, flag_yellow=True)), [])

    def test_damage(self):
        r = Runner()
        r.feed(race_snap(0, damage_engine=1.0))
        out = r.feed(race_snap(1, damage_engine=0.3))
        self.assertEqual(out, ["Schwerer Schaden: Motor. Wir sollten an die Box."])
        self.assertEqual(r.feed(race_snap(2, damage_engine=0.3)), [])


class FuelTrackerTest(unittest.TestCase):
    def test_pit_laps_ignored(self):
        f = FuelTracker()
        f.on_lap(50, -1, True)          # baseline
        f.on_lap(47, 90, True)
        f.taint()                       # pit stop on this lap
        f.on_lap(80, 120, True)
        f.on_lap(77, 90, True)
        self.assertAlmostEqual(f.per_lap, 3.0)
        self.assertAlmostEqual(f.avg_lap, 90.0)


class DemoRaceTest(unittest.TestCase):
    def test_full_demo_race(self):
        src = DemoSource()
        r = Runner()
        while src.t < 1200:
            src.step(0.05)
            r.feed(src.snapshot())
        text = "\n".join(r.said)
        for expected in ("Funkcheck", "Grün, grün, grün", "Gelbe Flagge", "Track Limits",
                         "Schaden: Aerodynamik", "überhitzen", "Letzte Runde", "Zielflagge"):
            self.assertIn(expected, text)
        self.assertNotRegex(text, r"\bp\d")   # positions are spoken as "P3", not "p3"
        self.assertEqual(text.count("Letzte Runde"), 1)
        self.assertEqual(text.count("Zielflagge"), 1)
        self.assertGreater(len(r.eng.status_report()[0].text), 10)


if __name__ == "__main__":
    unittest.main()
