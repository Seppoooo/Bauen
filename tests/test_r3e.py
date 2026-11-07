import ctypes as C
import sys
import time
import unittest

from race_engineer import model as M
from race_engineer.games.r3e import R3ESource, convert
from race_engineer.games.r3e_struct import DriverData, R3EShared


def _set_name(field, text):
    raw = text.encode("utf-8")
    C.memmove(C.addressof(field), raw, len(raw))


class StructLayoutTest(unittest.TestCase):
    """Values were produced by compiling the official r3e.h (API 3.6) with gcc."""

    def test_sizes(self):
        self.assertEqual(C.sizeof(R3EShared), 44024)
        self.assertEqual(C.sizeof(DriverData), 328)

    def test_offsets(self):
        expected = {"player": 40, "track_name": 600, "session_phase": 796, "flags": 932,
                    "position": 988, "time_delta_behind": 1128, "vehicle_info": 1196,
                    "fuel_left": 1456, "tire_temp": 1744, "brake_temp": 1856,
                    "car_damage": 1984, "num_cars": 2008, "all_drivers_data_1": 2012,
                    "start_penalty_pending": 44020}
        for name, off in expected.items():
            self.assertEqual(getattr(R3EShared, name).offset, off, name)
        last = R3EShared.start_penalty_pending
        self.assertEqual(last.offset + last.size, C.sizeof(R3EShared))


class ConvertTest(unittest.TestCase):
    def make(self):
        d = R3EShared()
        d.version_major = 3
        d.game_in_menus = 0
        d.control_type = 0
        d.session_type = 2
        d.session_phase = 5
        _set_name(d.track_name, "Nürburgring")
        _set_name(d.layout_name, "Grand Prix")
        d.position = 2
        d.num_cars = 3
        for i, name in enumerate(["Anna", "Ich", "Bernd"]):
            _set_name(d.all_drivers_data_1[i].driver_info.name, name)
            d.all_drivers_data_1[i].place = i + 1
        d.time_delta_front = 1.5
        d.time_delta_behind = -1.0
        d.car_speed = 50.0
        d.fuel_left = 20.0
        d.fuel_use_active = 1
        d.tire_wear_active = 1
        for i in range(4):
            d.tire_temp[i].current_temp[:] = [80.0, 90.0, 100.0]
            d.tire_wear[i] = 0.75
        for f in ("drive_through", "stop_and_go", "pit_stop", "time_deduction", "slow_down"):
            setattr(d.penalties, f, -1.0)
        d.penalties.drive_through = 0.0
        d.flags.yellow = 1
        d.flags.sector_yellow[:] = [0, 0, 1]
        d.number_of_laps = -1
        return d

    def test_convert(self):
        s = convert(self.make())
        self.assertTrue(s.connected and s.active)
        self.assertEqual(s.session_type, M.RACE)
        self.assertEqual(s.session_phase, M.PHASE_GREEN)
        self.assertEqual(s.track, "Nürburgring – Grand Prix")
        self.assertEqual((s.name_ahead, s.name_behind), ("Anna", "Bernd"))
        self.assertEqual(s.gap_ahead, 1.5)
        self.assertEqual(s.gap_behind, -1.0)
        self.assertAlmostEqual(s.speed_kmh, 180.0, places=3)
        self.assertEqual(s.tire_temp, [90.0] * 4)
        self.assertEqual(s.tire_wear, [0.75] * 4)
        self.assertTrue(s.penalty_drive_through)
        self.assertFalse(s.penalty_stop_and_go)
        self.assertTrue(s.flag_yellow)
        self.assertEqual(s.yellow_sector, 3)
        self.assertEqual(s.total_laps, -1)

    def test_standings_gaps(self):
        d = self.make()
        for i, interval in enumerate([-1.0, 1.5, 2.0]):     # leader has no car in front
            d.all_drivers_data_1[i].time_delta_front = interval
        rows = convert(d).standings
        self.assertEqual([r["pos"] for r in rows], [1, 2, 3])
        self.assertEqual([r["gap"] for r in rows], [-1.5, 0.0, 2.0])
        self.assertTrue(rows[1]["me"])

    def test_menu_is_inactive(self):
        d = self.make()
        d.game_in_menus = 1
        self.assertFalse(convert(d).active)


if __name__ == "__main__":
    unittest.main()


@unittest.skipUnless(sys.platform == "win32", "RaceRoom shared memory exists only on Windows")
class SharedMemoryTest(unittest.TestCase):
    """Creates a "$R3E" mapping exactly like the game does and reads it live."""

    def test_live_coupling(self):
        import mmap
        from race_engineer.games.r3e_struct import R3E_SHARED_MEMORY_NAME
        source = R3ESource()
        self.assertFalse(source.read().connected)          # game not running yet

        game = mmap.mmap(-1, C.sizeof(R3EShared), tagname=R3E_SHARED_MEMORY_NAME)
        try:
            data = ConvertTest.make(self)
            game.seek(0)
            game.write(bytes(data))
            snap = source.read()
            self.assertTrue(snap.connected and snap.active)
            self.assertEqual(snap.position, 2)
            self.assertEqual(snap.track, "Nürburgring – Grand Prix")

            data.position = 1                               # game updates its data
            game.seek(0)
            game.write(bytes(data))
            self.assertEqual(source.read().position, 1)
        finally:
            source.close()
            game.close()
