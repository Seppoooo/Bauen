"""ctypes mirror of the official RaceRoom shared memory layout ($R3E).

Translated 1:1 from sector3studios/r3e-api sample-c/src/r3e.h (version 3.6,
public domain). Everything is packed (pragma pack 1) - do not reorder fields.
"""
import ctypes as C

R3E_SHARED_MEMORY_NAME = "$R3E"
R3E_VERSION_MAJOR = 3
R3E_NUM_DRIVERS_MAX = 128

i32 = C.c_int32
f32 = C.c_float
f64 = C.c_double
u8 = C.c_uint8


class _Packed(C.Structure):
    _pack_ = 1


class Vec3F32(_Packed):
    _fields_ = [("x", f32), ("y", f32), ("z", f32)]


class Vec3F64(_Packed):
    _fields_ = [("x", f64), ("y", f64), ("z", f64)]


class OriF32(_Packed):
    _fields_ = [("pitch", f32), ("yaw", f32), ("roll", f32)]


class SectorStarts(_Packed):
    _fields_ = [("sector1", f32), ("sector2", f32), ("sector3", f32)]


class PlayerData(_Packed):
    _fields_ = [
        ("user_id", i32),
        ("game_simulation_ticks", i32),
        ("game_simulation_time", f64),
        ("position", Vec3F64),
        ("velocity", Vec3F64),
        ("local_velocity", Vec3F64),
        ("acceleration", Vec3F64),
        ("local_acceleration", Vec3F64),
        ("orientation", Vec3F64),
        ("rotation", Vec3F64),
        ("angular_acceleration", Vec3F64),
        ("angular_velocity", Vec3F64),
        ("local_angular_velocity", Vec3F64),
        ("local_g_force", Vec3F64),
        ("steering_force", f64),
        ("steering_force_percentage", f64),
        ("engine_torque", f64),
        ("current_downforce", f64),
        ("voltage", f64),
        ("ers_level", f64),
        ("power_mgu_h", f64),
        ("power_mgu_k", f64),
        ("torque_mgu_k", f64),
        ("suspension_deflection", f64 * 4),
        ("suspension_velocity", f64 * 4),
        ("camber", f64 * 4),
        ("ride_height", f64 * 4),
        ("front_wing_height", f64),
        ("front_roll_angle", f64),
        ("rear_roll_angle", f64),
        ("third_spring_suspension_deflection_front", f64),
        ("third_spring_suspension_velocity_front", f64),
        ("third_spring_suspension_deflection_rear", f64),
        ("third_spring_suspension_velocity_rear", f64),
        ("unused1", f64),
        ("unused2", f64),
        ("unused3", f64),
    ]


class Flags(_Packed):
    _fields_ = [
        ("yellow", i32),
        ("yellowCausedIt", i32),
        ("yellowOvertake", i32),
        ("yellowPositionsGained", i32),
        ("sector_yellow", i32 * 3),
        ("closest_yellow_distance_into_track", f32),
        ("blue", i32),
        ("black", i32),
        ("green", i32),
        ("checkered", i32),
        ("white", i32),
        ("black_and_white", i32),
    ]


class CarDamage(_Packed):
    _fields_ = [
        ("engine", f32),
        ("transmission", f32),
        ("aerodynamics", f32),
        ("suspension", f32),
        ("unused1", f32),
        ("unused2", f32),
    ]


class CutTrackPenalties(_Packed):
    _fields_ = [
        ("drive_through", f32),
        ("stop_and_go", f32),
        ("pit_stop", f32),
        ("time_deduction", f32),
        ("slow_down", f32),
    ]


class DRS(_Packed):
    _fields_ = [
        ("equipped", i32),
        ("available", i32),
        ("numActivationsLeft", i32),
        ("engaged", i32),
    ]


class PushToPass(_Packed):
    _fields_ = [
        ("available", i32),
        ("engaged", i32),
        ("amount_left", i32),
        ("engaged_time_left", f32),
        ("wait_time_left", f32),
    ]


class TireTemp(_Packed):
    _fields_ = [
        ("current_temp", f32 * 3),
        ("optimal_temp", f32),
        ("cold_temp", f32),
        ("hot_temp", f32),
    ]


class BrakeTemp(_Packed):
    _fields_ = [
        ("current_temp", f32),
        ("optimal_temp", f32),
        ("cold_temp", f32),
        ("hot_temp", f32),
    ]


class AidSettings(_Packed):
    _fields_ = [
        ("abs", i32),
        ("tc", i32),
        ("esp", i32),
        ("countersteer", i32),
        ("cornering", i32),
    ]


class DriverInfo(_Packed):
    _fields_ = [
        ("name", u8 * 64),
        ("car_number", i32),
        ("class_id", i32),
        ("model_id", i32),
        ("team_id", i32),
        ("livery_id", i32),
        ("manufacturer_id", i32),
        ("user_id", i32),
        ("slot_id", i32),
        ("class_performance_index", i32),
        ("engine_type", i32),
        ("car_width", f32),
        ("car_length", f32),
        ("rating", f32),
        ("reputation", f32),
        ("unused1", f32),
        ("unused2", f32),
    ]


class DriverData(_Packed):
    _fields_ = [
        ("driver_info", DriverInfo),
        ("finish_status", i32),
        ("place", i32),
        ("place_class", i32),
        ("lap_distance", f32),
        ("lap_distance_fraction", f32),
        ("position", Vec3F32),
        ("track_sector", i32),
        ("completed_laps", i32),
        ("current_lap_valid", i32),
        ("lap_time_current_self", f32),
        ("sector_time_current_self", f32 * 3),
        ("sector_time_previous_self", f32 * 3),
        ("sector_time_best_self", f32 * 3),
        ("time_delta_front", f32),
        ("time_delta_behind", f32),
        ("pitstop_status", i32),
        ("in_pitlane", i32),
        ("num_pitstops", i32),
        ("penalties", CutTrackPenalties),
        ("car_speed", f32),
        ("tire_type_front", i32),
        ("tire_type_rear", i32),
        ("tire_subtype_front", i32),
        ("tire_subtype_rear", i32),
        ("base_penalty_weight", f32),
        ("aid_penalty_weight", f32),
        ("drs_state", i32),
        ("ptp_state", i32),
        ("virtual_energy", f32),
        ("penaltyType", i32),
        ("penaltyReason", i32),
        ("engineState", i32),
        ("orientation", Vec3F32),
        ("start_group", i32),
        ("start_phase", i32),
        ("formation_slot", i32),
    ]


class R3EShared(_Packed):
    _fields_ = [
        # Version
        ("version_major", i32),
        ("version_minor", i32),
        ("all_drivers_offset", i32),
        ("driver_data_size", i32),
        # Game state
        ("game_mode", i32),
        ("game_paused", i32),
        ("game_in_menus", i32),
        ("game_in_replay", i32),
        ("game_using_vr", i32),
        ("game_player_in_garage", i32),
        # High detail
        ("player", PlayerData),
        # Event and session
        ("track_name", u8 * 64),
        ("layout_name", u8 * 64),
        ("track_id", i32),
        ("layout_id", i32),
        ("layout_length", f32),
        ("sector_start_factors", SectorStarts),
        ("race_session_laps", i32 * 3),
        ("race_session_minutes", i32 * 3),
        ("event_index", i32),
        ("session_type", i32),
        ("session_iteration", i32),
        ("session_length_format", i32),
        ("session_pit_speed_limit", f32),
        ("session_phase", i32),
        ("start_lights", i32),
        ("tire_wear_active", i32),
        ("fuel_use_active", i32),
        ("number_of_laps", i32),
        ("session_time_duration", f32),
        ("session_time_remaining", f32),
        ("max_incident_points", i32),
        ("start_mode", i32),
        ("start_group_count", i32),
        # Pit
        ("pit_window_status", i32),
        ("pit_window_start", i32),
        ("pit_window_end", i32),
        ("in_pitlane", i32),
        ("pit_menu_selection", i32),
        ("pit_menu_state", i32 * 12),
        ("pit_state", i32),
        ("pit_total_duration", f32),
        ("pit_elapsed_time", f32),
        ("pit_action", i32),
        ("num_pitstops", i32),
        ("pit_min_duration_total", f32),
        ("pit_min_duration_left", f32),
        # Scoring & timings
        ("flags", Flags),
        ("position", i32),
        ("position_class", i32),
        ("finish_status", i32),
        ("cut_track_warnings", i32),
        ("penalties", CutTrackPenalties),
        ("num_penalties", i32),
        ("completed_laps", i32),
        ("current_lap_valid", i32),
        ("track_sector", i32),
        ("lap_distance", f32),
        ("lap_distance_fraction", f32),
        ("lap_time_best_leader", f32),
        ("lap_time_best_leader_class", f32),
        ("session_best_lap_sector_times", f32 * 3),
        ("lap_time_best_self", f32),
        ("sector_time_best_self", f32 * 3),
        ("lap_time_previous_self", f32),
        ("sector_time_previous_self", f32 * 3),
        ("lap_time_current_self", f32),
        ("sector_time_current_self", f32 * 3),
        ("lap_time_delta_leader", f32),
        ("lap_time_delta_leader_class", f32),
        ("time_delta_front", f32),
        ("time_delta_behind", f32),
        ("time_delta_best_self", f32),
        ("best_individual_sector_time_self", f32 * 3),
        ("best_individual_sector_time_leader", f32 * 3),
        ("best_individual_sector_time_leader_class", f32 * 3),
        ("incident_points", i32),
        ("lap_valid_state", i32),
        ("prev_lap_valid", i32),
        ("discharge_rate", f32),
        ("brake_regen", f32),
        ("unused1", f32),
        # Vehicle information
        ("vehicle_info", DriverInfo),
        ("player_name", u8 * 64),
        # Vehicle state
        ("control_type", i32),
        ("car_speed", f32),
        ("engine_rps", f32),
        ("max_engine_rps", f32),
        ("upshift_rps", f32),
        ("gear", i32),
        ("num_gears", i32),
        ("car_cg_location", Vec3F32),
        ("car_orientation", OriF32),
        ("local_acceleration", Vec3F32),
        ("total_mass", f32),
        ("fuel_left", f32),
        ("fuel_capacity", f32),
        ("fuel_per_lap", f32),
        ("virtual_energy_left", f32),
        ("virtual_energy_capacity", f32),
        ("virtual_energy_per_lap", f32),
        ("engine_temp", f32),
        ("engine_oil_temp", f32),
        ("fuel_pressure", f32),
        ("engine_oil_pressure", f32),
        ("turbo_pressure", f32),
        ("throttle", f32),
        ("throttle_raw", f32),
        ("brake", f32),
        ("brake_raw", f32),
        ("clutch", f32),
        ("clutch_raw", f32),
        ("steer_input_raw", f32),
        ("steer_lock_degrees", i32),
        ("steer_wheel_range_degrees", i32),
        ("aid_settings", AidSettings),
        ("drs", DRS),
        ("pit_limiter", i32),
        ("push_to_pass", PushToPass),
        ("brake_bias", f32),
        ("drs_numActivationsTotal", i32),
        ("ptp_numActivationsTotal", i32),
        ("battery_soc", f32),
        ("water_left", f32),
        ("abs_setting", i32),
        ("headlights", i32),
        ("steer_wheel_max_rotation", i32),
        # Tires
        ("tire_type", i32),
        ("tire_rps", f32 * 4),
        ("tire_speed", f32 * 4),
        ("tire_grip", f32 * 4),
        ("tire_wear", f32 * 4),
        ("tire_flatspot", i32 * 4),
        ("tire_pressure", f32 * 4),
        ("tire_dirt", f32 * 4),
        ("tire_temp", TireTemp * 4),
        ("tire_type_front", i32),
        ("tire_type_rear", i32),
        ("tire_subtype_front", i32),
        ("tire_subtype_rear", i32),
        ("brake_temp", BrakeTemp * 4),
        ("brake_pressure", f32 * 4),
        # Electronics
        ("traction_control_setting", i32),
        ("engine_map_setting", i32),
        ("engine_brake_setting", i32),
        ("traction_control_percent", f32),
        ("tire_on_mtrl", i32 * 4),
        ("tire_load", f32 * 4),
        # Damage
        ("car_damage", CarDamage),
        # Driver info
        ("num_cars", i32),
        ("all_drivers_data_1", DriverData * R3E_NUM_DRIVERS_MAX),
        # Start procedure (3.6)
        ("formation_speed_limit", f32),
        ("formation_pace_floor", f32),
        ("start_corridor_lap_distance", f32),
        ("formation_side", i32),
        ("formation_follow_slot_id", i32),
        ("pitlane_start_delay_remaining", f32),
        ("start_penalty_pending", i32),
    ]


def decode_name(raw) -> str:
    data = bytes(raw)
    return data.split(b"\x00", 1)[0].decode("utf-8", errors="replace")
