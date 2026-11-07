"""RaceRoom Racing Experience telemetry via the "$R3E" shared memory (Windows)."""
from __future__ import annotations

import ctypes as C
import sys

from .. import model as M
from .r3e_struct import (R3E_SHARED_MEMORY_NAME, R3E_VERSION_MAJOR, R3EShared,
                         decode_name)

_SESSION = {0: M.PRACTICE, 1: M.QUALIFY, 2: M.RACE, 3: M.WARMUP}
_PHASE = {1: M.PHASE_GARAGE, 2: M.PHASE_GRIDWALK, 3: M.PHASE_FORMATION,
          4: M.PHASE_COUNTDOWN, 5: M.PHASE_GREEN, 6: M.PHASE_CHECKERED}

FILE_MAP_READ = 0x0004


class R3ESource:
    """Reads the RaceRoom shared memory. Reconnects automatically."""

    name = "RaceRoom"

    def __init__(self):
        if sys.platform != "win32":
            raise RuntimeError("RaceRoom-Telemetrie gibt es nur unter Windows. "
                               "Zum Ausprobieren: --demo")
        self._k32 = C.WinDLL("kernel32", use_last_error=True)
        self._k32.OpenFileMappingW.restype = C.c_void_p
        self._k32.OpenFileMappingW.argtypes = [C.c_uint32, C.c_int, C.c_wchar_p]
        self._k32.MapViewOfFile.restype = C.c_void_p
        self._k32.MapViewOfFile.argtypes = [C.c_void_p, C.c_uint32, C.c_uint32,
                                            C.c_uint32, C.c_size_t]
        self._k32.UnmapViewOfFile.argtypes = [C.c_void_p]
        self._k32.CloseHandle.argtypes = [C.c_void_p]
        self._handle = None
        self._view = None
        self._buf = R3EShared()
        self.version_warning = None

    def _open(self) -> bool:
        h = self._k32.OpenFileMappingW(FILE_MAP_READ, False, R3E_SHARED_MEMORY_NAME)
        if not h:
            return False
        view = self._k32.MapViewOfFile(h, FILE_MAP_READ, 0, 0, C.sizeof(R3EShared))
        if not view:
            self._k32.CloseHandle(h)
            return False
        self._handle, self._view = h, view
        return True

    def close(self):
        if self._view:
            self._k32.UnmapViewOfFile(self._view)
        if self._handle:
            self._k32.CloseHandle(self._handle)
        self._handle = self._view = None

    def read(self) -> M.Snapshot:
        if not self._view and not self._open():
            return M.Snapshot(connected=False)
        C.memmove(C.addressof(self._buf), self._view, C.sizeof(R3EShared))
        d = self._buf
        if d.version_major == 0:          # mapping exists but game not writing yet
            return M.Snapshot(connected=False)
        if d.version_major != R3E_VERSION_MAJOR and not self.version_warning:
            self.version_warning = (f"Unerwartete R3E-API-Version {d.version_major}."
                                    f"{d.version_minor} - Daten evtl. fehlerhaft")
        return convert(d)


def _f(v, scale=1.0):
    return float(v) * scale if v >= 0 else -1.0


def convert(d: R3EShared) -> M.Snapshot:
    """Translate the raw R3E struct into a game-independent Snapshot."""
    s = M.Snapshot(connected=True)
    s.paused = d.game_paused == 1
    s.active = (d.game_in_menus != 1 and d.game_in_replay != 1
                and d.control_type == 0 and d.session_type >= 0)

    s.session_type = _SESSION.get(d.session_type)
    s.session_phase = _PHASE.get(d.session_phase)
    track = decode_name(d.track_name)
    layout = decode_name(d.layout_name)
    s.track = f"{track} – {layout}" if layout and layout != track else track
    s.car = decode_name(d.vehicle_info.name)
    s.driver = decode_name(d.player_name)
    s.start_lights = d.start_lights

    s.position = d.position
    s.num_cars = max(0, d.num_cars)
    s.completed_laps = d.completed_laps
    s.total_laps = d.number_of_laps if d.number_of_laps > 0 else -1
    s.session_time_remaining = _f(d.session_time_remaining)
    s.lap_fraction = d.lap_distance_fraction

    s.lap_time_current = _f(d.lap_time_current_self)
    s.last_lap = _f(d.lap_time_previous_self)
    s.best_lap = _f(d.lap_time_best_self)
    s.session_best_lap = _f(d.lap_time_best_leader_class)
    s.lap_valid = d.current_lap_valid != 0
    s.last_lap_valid = d.prev_lap_valid != 0
    s.delta_best = d.time_delta_best_self

    s.gap_ahead = _f(d.time_delta_front)
    s.gap_behind = _f(d.time_delta_behind)
    # all_drivers_data_1 is sorted by place
    n = min(s.num_cars, len(d.all_drivers_data_1))
    for i in range(n):
        place = d.all_drivers_data_1[i].place
        if place == s.position - 1:
            s.name_ahead = decode_name(d.all_drivers_data_1[i].driver_info.name)
        elif place == s.position + 1:
            s.name_behind = decode_name(d.all_drivers_data_1[i].driver_info.name)

    s.speed_kmh = max(0.0, d.car_speed * 3.6)
    s.gear = d.gear
    s.rpm = d.engine_rps * 60 / (2 * 3.141592653589793) if d.engine_rps > 0 else 0.0

    s.fuel_left = _f(d.fuel_left)
    s.fuel_capacity = _f(d.fuel_capacity)
    s.fuel_use_active = d.fuel_use_active != 0

    for i in range(4):
        t = d.tire_temp[i]
        temps = [x for x in t.current_temp if x > -1]
        s.tire_temp[i] = sum(temps) / len(temps) if temps else -1.0
        s.tire_temp_cold[i] = t.cold_temp
        s.tire_temp_optimal[i] = t.optimal_temp
        s.tire_temp_hot[i] = t.hot_temp
        s.tire_wear[i] = _f(d.tire_wear[i]) if d.tire_wear_active != 0 else -1.0
        s.tire_pressure[i] = _f(d.tire_pressure[i])
        s.brake_temp[i] = _f(d.brake_temp[i].current_temp)
        s.brake_temp_hot[i] = _f(d.brake_temp[i].hot_temp)

    dmg = d.car_damage
    s.damage_engine = _f(dmg.engine)
    s.damage_transmission = _f(dmg.transmission)
    s.damage_aero = _f(dmg.aerodynamics)
    s.damage_suspension = _f(dmg.suspension)

    fl = d.flags
    s.flag_yellow = fl.yellow == 1
    for i in range(3):
        if fl.sector_yellow[i] == 1:
            s.yellow_sector = i + 1
            break
    s.flag_blue = fl.blue == 1
    s.flag_black = fl.black == 1
    s.flag_white = fl.white == 1
    s.flag_checkered = fl.checkered == 1
    s.black_white_reason = max(0, fl.black_and_white)

    s.cut_track_warnings = d.cut_track_warnings
    s.num_penalties = max(0, d.num_penalties)
    p = d.penalties
    s.penalty_drive_through = p.drive_through >= 0
    s.penalty_stop_and_go = p.stop_and_go >= 0
    s.penalty_slow_down = p.slow_down >= 0
    s.penalty_time = p.time_deduction >= 0

    s.in_pitlane = d.in_pitlane == 1
    s.pit_limiter = d.pit_limiter == 1
    s.pit_speed_limit_kmh = _f(d.session_pit_speed_limit, 3.6)
    s.pit_window_status = d.pit_window_status
    return s
