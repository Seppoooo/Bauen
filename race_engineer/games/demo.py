"""Simulated race for trying the engineer without the game running."""
from __future__ import annotations

import math
import random
import time

from .. import model as M

NAMES = ["L. Brandt", "M. Kovac", "S. Lindqvist", "T. Moreau", "J. Albers",
         "R. Castillo", "K. Yamada", "D. Novak", "P. Hartmann"]


class _Car:
    def __init__(self, name, pace, start_dist):
        self.name, self.pace, self.dist = name, pace, start_dist
        self.phase = sum(map(ord, name)) % 10


class DemoSource:
    name = "Demo"

    LAP_LEN = 3000.0
    LAPS = 12

    def __init__(self, speed: float = 3.0, seed: int = 7, clock=time.monotonic):
        self.speed = speed
        self.clock = clock
        self.rng = random.Random(seed)
        self._last_real = None
        self.t = 0.0                       # simulated seconds since start
        grid_gap = 12.0
        self.cars = [_Car(n, 90.2 + 0.35 * i + self.rng.uniform(-0.3, 0.3), -grid_gap * i)
                     for i, n in enumerate(NAMES)]
        self.player = _Car("Du", 90.0, -grid_gap * 5)   # starts P6
        self.cars.insert(5, self.player)
        self.fuel = 30.0
        self.wear = 1.0
        self.last_lap = -1.0
        self.best_lap = -1.0
        self.lap_start_t = None
        self.completed = 0
        self.finished = False
        self.cut_warnings = 0
        self.aero = 1.0
        self.green_at = 6.0

    # ------------------------------------------------------------------
    def read(self) -> M.Snapshot:
        now = self.clock()
        if self._last_real is not None:
            self.step(min(0.5, now - self._last_real) * self.speed)
        self._last_real = now
        return self.snapshot()

    def step(self, dt: float):
        self.t += dt
        if self.t < self.green_at or self.finished:
            return
        for car in self.cars:
            lap_no = int(max(car.dist, 0) // self.LAP_LEN)
            pace = car.pace
            if car is self.player:
                pace += (1 - self.wear) * 1.5 - 0.6 * math.sin(lap_no * 1.3) - (lap_no == 4) * 1.5
            pace += math.sin(self.t * 0.05 + car.phase) * 0.4
            car.dist += self.LAP_LEN / pace * dt * (0.55 if self.t - self.green_at < 4 else 1.0)

        player_laps = int(max(self.player.dist, 0) // self.LAP_LEN)
        if player_laps > self.completed:
            lap = self.t - (self.lap_start_t if self.lap_start_t is not None else self.green_at)
            self.lap_start_t = self.t
            self.completed = player_laps
            self.last_lap = lap
            if lap > 0 and (self.best_lap < 0 or lap < self.best_lap):
                self.best_lap = lap
            self.wear = max(0.0, self.wear - 0.062)
            if self.completed >= self.LAPS:
                self.finished = True
        self.fuel = max(0.0, self.fuel - 2.62 / 90.0 * dt)
        frac = (self.player.dist % self.LAP_LEN) / self.LAP_LEN
        if self.completed == 3 and 0.40 < frac < 0.42 and self.cut_warnings == 0:
            self.cut_warnings = 1
        if self.completed == 5 and frac > 0.6 and self.aero == 1.0:
            self.aero = 0.82

    # ------------------------------------------------------------------
    def snapshot(self) -> M.Snapshot:
        s = M.Snapshot(connected=True, active=True)
        s.timestamp = self.t
        s.session_type = M.RACE
        s.track, s.car, s.driver = "Demo-Ring", "GT3 Demo", "Du"
        s.total_laps = self.LAPS
        s.pit_speed_limit_kmh = 60.0
        if self.t < 1:
            s.session_phase, s.start_lights = M.PHASE_GRIDWALK, 0
        elif self.t < self.green_at:
            s.session_phase, s.start_lights = M.PHASE_COUNTDOWN, min(5, int(self.t))
        elif self.finished:
            s.session_phase, s.start_lights = M.PHASE_CHECKERED, 6
        else:
            s.session_phase, s.start_lights = M.PHASE_GREEN, 6

        order = sorted(self.cars, key=lambda c: -c.dist)
        idx = order.index(self.player)
        s.position, s.num_cars = idx + 1, len(order)
        speed_ms = self.LAP_LEN / 90.0
        if idx > 0:
            s.gap_ahead = (order[idx - 1].dist - self.player.dist) / speed_ms
            s.name_ahead = order[idx - 1].name
        if idx < len(order) - 1:
            s.gap_behind = (self.player.dist - order[idx + 1].dist) / speed_ms
            s.name_behind = order[idx + 1].name

        for i, car in enumerate(order):
            lap_done = int(max(car.dist, 0) // self.LAP_LEN)
            s.standings.append({"pos": i + 1, "name": car.name,
                                "gap": round((self.player.dist - car.dist) / speed_ms, 2),
                                "laps": lap_done, "pit": False,
                                "last": round(car.pace + math.sin(lap_done + car.phase) * 0.4, 3) if lap_done else -1.0,
                                "me": car is self.player})
        s.completed_laps = self.completed
        frac = (max(self.player.dist, 0) % self.LAP_LEN) / self.LAP_LEN
        s.lap_fraction = frac
        start = self.lap_start_t if self.lap_start_t is not None else self.green_at
        s.lap_time_current = max(0.0, self.t - start) if self.t >= self.green_at else 0.0
        s.last_lap, s.best_lap = self.last_lap, self.best_lap
        s.session_best_lap = 89.4
        s.delta_best = (s.lap_time_current - self.best_lap * frac) if self.best_lap > 0 else -1000.0

        moving = self.t >= self.green_at and not self.finished
        s.speed_kmh = (150 + 90 * math.sin(frac * 2 * math.pi * 6)) if moving else 0.0
        s.gear = max(1, min(6, int(s.speed_kmh / 45) + 1)) if moving else 1
        s.rpm = 4000 + (s.speed_kmh % 45) * 80
        s.rpm_max, s.rpm_shift = 8000.0, 7400.0
        wave = math.sin(frac * 2 * math.pi * 6)
        if moving:
            s.throttle = max(0.0, min(1.0, 0.55 + wave * 0.9))
            s.brake = max(0.0, min(1.0, -wave * 1.4 - 0.4))
        else:
            s.throttle, s.brake = 0.0, 0.3

        s.fuel_left, s.fuel_capacity = self.fuel, 100.0
        overheating = self.completed in (6, 7)
        for i in range(4):
            base = 72 + min(1.0, max(0.0, (self.t - self.green_at) / 60)) * 14
            if overheating and i < 2:
                base += 22
            s.tire_temp[i] = base + 2 * math.sin(self.t / 7 + i)
            # front tyres run hotter on the inside (camber); left = outside for left tyres
            spread = 6.0 if i < 2 else 3.0
            inner, outer = s.tire_temp[i] + spread, s.tire_temp[i] - spread
            s.tire_temp_zones[i] = [outer, s.tire_temp[i], inner] if i % 2 == 0 else [inner, s.tire_temp[i], outer]
            s.tire_temp_cold[i], s.tire_temp_optimal[i], s.tire_temp_hot[i] = 70.0, 85.0, 100.0
            s.tire_wear[i] = max(0.0, self.wear - 0.02 * (i < 2))
            s.tire_pressure[i] = 178.0 + (s.tire_temp[i] - 85) * 0.4
            s.brake_temp[i] = 380 + 150 * math.sin(frac * 2 * math.pi * 4) ** 2
            s.brake_temp_hot[i] = 750.0
        s.damage_engine = s.damage_transmission = s.damage_suspension = 1.0
        s.damage_aero = self.aero

        yellow = self.completed == 2 and 0.3 < frac < 0.55
        s.flag_yellow, s.yellow_sector = yellow, (2 if yellow else -1)
        s.flag_blue = False
        s.flag_white = self.completed == self.LAPS - 1 and not self.finished
        s.flag_checkered = self.finished
        s.cut_track_warnings = self.cut_warnings
        s.pit_window_status = 0
        return s
