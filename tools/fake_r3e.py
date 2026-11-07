"""Kopplungstest ohne RaceRoom (Windows).

Legt die RaceRoom-Shared-Memory "$R3E" an und füllt sie mit einem fahrenden
Auto - genau so, wie es das Spiel tut. Startest du danach den Race Engineer
(ohne --demo), muss er "Verbindung zu RaceRoom steht" melden.

    python tools/fake_r3e.py 60      # 60 Sekunden lang Daten senden
"""
import ctypes as C
import math
import mmap
from pathlib import Path
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from race_engineer.games.r3e_struct import R3E_SHARED_MEMORY_NAME, R3EShared  # noqa: E402


def _name(field, text):
    raw = text.encode("utf-8")[:63]
    C.memmove(C.addressof(field), raw, len(raw))


def build() -> R3EShared:
    d = R3EShared()
    d.version_major, d.version_minor = 3, 6
    d.game_in_menus = d.game_in_replay = d.game_paused = 0
    d.control_type = 0
    d.session_type, d.session_phase = 2, 5            # race, green
    _name(d.track_name, "Kopplungstest")
    _name(d.vehicle_info.name, "Test-GT3")
    _name(d.player_name, "Du")
    d.position, d.num_cars = 2, 3
    for i, name in enumerate(["Vorne", "Du", "Hinten"]):
        _name(d.all_drivers_data_1[i].driver_info.name, name)
        d.all_drivers_data_1[i].place = i + 1
        d.all_drivers_data_1[i].time_delta_front = -1.0 if i == 0 else 1.2
    d.time_delta_front = d.time_delta_behind = 1.2
    d.number_of_laps = 10
    d.fuel_left, d.fuel_capacity, d.fuel_use_active = 40.0, 100.0, 1
    d.tire_wear_active = 1
    for i in range(4):
        d.tire_temp[i].current_temp[:] = [84.0, 86.0, 88.0]
        d.tire_temp[i].cold_temp, d.tire_temp[i].optimal_temp, d.tire_temp[i].hot_temp = 70.0, 85.0, 100.0
        d.tire_wear[i] = 0.9
    for f in ("drive_through", "stop_and_go", "pit_stop", "time_deduction", "slow_down"):
        setattr(d.penalties, f, -1.0)
    d.car_damage.engine = d.car_damage.transmission = 1.0
    d.car_damage.aerodynamics = d.car_damage.suspension = 1.0
    d.cut_track_warnings = 0
    d.lap_time_best_self = d.lap_time_previous_self = -1.0
    d.session_time_remaining = -1.0
    return d


def main(seconds: float):
    if sys.platform != "win32":
        sys.exit("Nur unter Windows möglich.")
    game = mmap.mmap(-1, C.sizeof(R3EShared), tagname=R3E_SHARED_MEMORY_NAME)
    d = build()
    start = time.monotonic()
    print(f"Sende RaceRoom-Testdaten für {seconds:.0f} s … (Strg+C beendet)")
    try:
        while time.monotonic() - start < seconds:
            t = time.monotonic() - start
            d.lap_distance_fraction = (t / 30.0) % 1.0
            d.car_speed = 40 + 25 * math.sin(t)
            d.gear = 3 + int(2 * math.sin(t))
            d.engine_rps, d.max_engine_rps, d.upshift_rps = 600 + 150 * math.sin(t), 840, 780
            d.throttle = max(0.0, math.sin(t))
            d.brake = max(0.0, -math.sin(t))
            d.lap_time_current_self = t % 30.0
            game.seek(0)
            game.write(bytes(d))
            time.sleep(0.05)
    except KeyboardInterrupt:
        pass
    finally:
        game.close()


if __name__ == "__main__":
    main(float(sys.argv[1]) if len(sys.argv) > 1 else 60)
