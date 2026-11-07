"""Game-independent data model shared by telemetry sources, engineer and UI."""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
import time

# Tire order everywhere: front-left, front-right, rear-left, rear-right
TIRE_NAMES = ("vorne links", "vorne rechts", "hinten links", "hinten rechts")

PRACTICE, QUALIFY, RACE, WARMUP = "practice", "qualify", "race", "warmup"

# Session phases
PHASE_GARAGE, PHASE_GRIDWALK, PHASE_FORMATION = "garage", "gridwalk", "formation"
PHASE_COUNTDOWN, PHASE_GREEN, PHASE_CHECKERED = "countdown", "green", "checkered"


@dataclass
class Snapshot:
    """One telemetry sample. -1 / None means "not available"."""

    connected: bool = False      # telemetry source reachable at all
    active: bool = False         # player is driving (not in menus / replay)
    paused: bool = False

    session_type: str | None = None
    session_phase: str | None = None
    track: str = ""
    car: str = ""
    driver: str = ""
    start_lights: int = -1       # 0 off, 1-5 red, 6 green

    position: int = -1
    num_cars: int = 0
    completed_laps: int = -1
    total_laps: int = -1         # lap-based races only
    session_time_remaining: float = -1.0
    lap_fraction: float = -1.0

    lap_time_current: float = -1.0
    last_lap: float = -1.0
    best_lap: float = -1.0
    session_best_lap: float = -1.0
    lap_valid: bool = True
    last_lap_valid: bool = True
    delta_best: float = -1000.0

    gap_ahead: float = -1.0
    gap_behind: float = -1.0
    name_ahead: str = ""
    name_behind: str = ""

    speed_kmh: float = 0.0
    gear: int = 0
    rpm: float = 0.0
    rpm_max: float = -1.0
    rpm_shift: float = -1.0
    throttle: float = -1.0       # 0..1
    brake: float = -1.0          # 0..1

    fuel_left: float = -1.0
    fuel_capacity: float = -1.0
    fuel_use_active: bool = True

    tire_temp: list = field(default_factory=lambda: [-1.0] * 4)      # avg tread temp
    # left / centre / right tread temperature per tire
    tire_temp_zones: list = field(default_factory=lambda: [[-1.0] * 3 for _ in range(4)])
    tire_temp_cold: list = field(default_factory=lambda: [-1.0] * 4)
    tire_temp_optimal: list = field(default_factory=lambda: [-1.0] * 4)
    tire_temp_hot: list = field(default_factory=lambda: [-1.0] * 4)
    tire_wear: list = field(default_factory=lambda: [-1.0] * 4)      # 1.0 = new
    tire_pressure: list = field(default_factory=lambda: [-1.0] * 4)  # kPa
    brake_temp: list = field(default_factory=lambda: [-1.0] * 4)
    brake_temp_hot: list = field(default_factory=lambda: [-1.0] * 4)

    damage_engine: float = -1.0       # 1.0 = intact
    damage_transmission: float = -1.0
    damage_aero: float = -1.0
    damage_suspension: float = -1.0

    flag_yellow: bool = False
    yellow_sector: int = -1           # 1..3
    flag_blue: bool = False
    flag_black: bool = False
    flag_white: bool = False
    flag_checkered: bool = False
    black_white_reason: int = 0       # 1/2 blue warnings, 3 wrong way, 4 cutting

    cut_track_warnings: int = -1
    num_penalties: int = 0
    penalty_drive_through: bool = False
    penalty_stop_and_go: bool = False
    penalty_slow_down: bool = False
    penalty_time: bool = False

    in_pitlane: bool = False
    pit_limiter: bool = False
    pit_speed_limit_kmh: float = -1.0
    pit_window_status: int = -1       # 0 disabled, 1 closed, 2 open, 3 stopped, 4 completed

    # Whole field in race order: {"pos", "name", "gap" (s to player, <0 = ahead),
    # "laps", "pit", "last", "me"}
    standings: list = field(default_factory=list)

    timestamp: float = field(default_factory=time.monotonic)

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class Callout:
    text: str
    priority: int = 3          # 0 = critical, 1 = high, 2 = normal, 3 = info
    category: str = "info"
    created: float = field(default_factory=time.monotonic)
    wall_time: float = field(default_factory=time.time)

    def to_dict(self) -> dict:
        return {"text": self.text, "priority": self.priority,
                "category": self.category, "time": self.wall_time}
