"""Record a demo race (telemetry + engineer callouts) for the dashboard replay.

    python tools/record_demo.py out/demo-replay.json

The dashboard plays the file back when it is served next to index.html and no
live engineer is running (used for the online preview).
"""
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from race_engineer.engineer import Engineer  # noqa: E402
from race_engineer.games.demo import DemoSource  # noqa: E402


def compact(value):
    if isinstance(value, float):
        return round(value, 2)
    if isinstance(value, list):
        return [compact(v) for v in value]
    if isinstance(value, dict):
        return {k: compact(v) for k, v in value.items()}
    return value


def main(out_path: str, frame_every: float = 1.0, step: float = 0.05):
    src = DemoSource()
    eng = Engineer(verbosity=2)
    frames, callouts = [], []
    next_frame = 0.0
    while src.t < 1130:
        src.step(step)
        snap = src.snapshot()
        for c in eng.update(snap):
            callouts.append({"t": round(src.t, 2), "text": c.text,
                             "priority": c.priority, "category": c.category})
        if src.t >= next_frame:
            next_frame += frame_every
            data = snap.to_dict()
            data.pop("timestamp")
            strat = eng.strategy()
            frames.append({"t": round(src.t, 2), "snapshot": compact(data),
                           "strategy": compact(strat)})
    # laps history is cumulative - keep it only where it changes
    last_len = -1
    for f in frames:
        laps = f["strategy"]["laps"]
        if len(laps) == last_len:
            f["strategy"].pop("laps")
        last_len = len(laps)
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    Path(out_path).write_text(json.dumps({"source": "Demo", "frames": frames,
                                          "callouts": callouts}, separators=(",", ":")),
                              encoding="utf-8")
    print(f"{len(frames)} Frames, {len(callouts)} Ansagen -> {out_path}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "demo-replay.json")
