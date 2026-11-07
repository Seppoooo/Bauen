"""Start: python -m race_engineer   (Demo: python -m race_engineer --demo)"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys
import time

from .dashboard import Hub, lan_ip, start_server
from .engineer import Engineer
from .model import Callout
from .speech import Speaker

CONFIG_FILE = Path("settings.json")
DEFAULTS = {"port": 8080, "verbosity": 2, "voice": None, "rate": 1, "volume": 100,
            "speech": True}


def load_config() -> dict:
    cfg = dict(DEFAULTS)
    if CONFIG_FILE.exists():
        try:
            cfg.update(json.loads(CONFIG_FILE.read_text(encoding="utf-8")))
        except (OSError, ValueError) as exc:
            print(f"[Config] settings.json konnte nicht gelesen werden: {exc}")
    return cfg


def parse_args(cfg: dict):
    ap = argparse.ArgumentParser(prog="race_engineer",
                                 description="Digitaler Race Engineer für RaceRoom")
    ap.add_argument("--demo", action="store_true", help="simuliertes Rennen statt Spiel")
    ap.add_argument("--demo-speed", type=float, default=3.0, help="Zeitraffer im Demo-Modus")
    ap.add_argument("--port", type=int, default=cfg["port"], help="Port fürs Dashboard")
    ap.add_argument("--verbosity", type=int, choices=(1, 2, 3), default=cfg["verbosity"],
                    help="1 = nur Wichtiges, 2 = normal, 3 = gesprächig")
    ap.add_argument("--voice", default=cfg["voice"], help="Teil des Stimmen-Namens, z.B. Hedda")
    ap.add_argument("--rate", type=int, default=cfg["rate"], help="Sprechtempo -10..10")
    ap.add_argument("--volume", type=int, default=cfg["volume"], help="Lautstärke 0..100")
    ap.add_argument("--no-voice", action="store_true", default=not cfg["speech"],
                    help="keine Sprachausgabe am PC (nur Dashboard)")
    ap.add_argument("--hz", type=float, default=20.0, help="Telemetrie-Abtastrate")
    return ap.parse_args()


def make_source(args):
    if args.demo:
        from .games.demo import DemoSource
        return DemoSource(speed=args.demo_speed)
    from .games.r3e import R3ESource
    return R3ESource()


def main():
    args = parse_args(load_config())
    try:
        source = make_source(args)
    except RuntimeError as exc:
        print(exc)
        sys.exit(1)

    engineer = Engineer(verbosity=args.verbosity)
    speaker = Speaker(enabled=not args.no_voice, voice=args.voice,
                      rate=args.rate, volume=args.volume)
    hub = Hub()
    voice_on = {"value": speaker.enabled}

    def emit(callout: Callout):
        print(f"[{time.strftime('%H:%M:%S')}] 🎧 {callout.text}")
        if voice_on["value"]:
            speaker.say(callout)
        hub.publish("callout", callout.to_dict())

    pending_commands: list[str] = []
    hub.on_command = pending_commands.append

    try:
        start_server(hub, port=args.port)
    except OSError as exc:
        print(f"Dashboard konnte Port {args.port} nicht öffnen ({exc}). Anderen Port mit --port wählen.")
        sys.exit(1)
    print(f"Race Engineer läuft – Quelle: {source.name}")
    print(f"Dashboard:  http://localhost:{args.port}   (Handy/Tablet im WLAN: http://{lan_ip()}:{args.port})")
    print("Beenden mit Strg+C\n")

    was_connected = False
    period = 1.0 / args.hz
    next_state = 0.0
    try:
        while True:
            started = time.monotonic()
            snap = source.read()

            if snap.connected != was_connected:
                was_connected = snap.connected
                emit(Callout(f"Verbindung zu {source.name} steht." if snap.connected
                             else f"Warte auf {source.name} …", 3, "system"))
                if getattr(source, "version_warning", None):
                    print(source.version_warning)

            for callout in engineer.update(snap):
                emit(callout)

            while pending_commands:
                cmd = pending_commands.pop(0)
                if cmd in ("status", "fuel", "gaps", "tires"):
                    for callout in engineer.report(cmd):
                        emit(callout)
                elif cmd == "toggle_voice":
                    voice_on["value"] = not voice_on["value"] and speaker.enabled
                    next_state = 0

            if started >= next_state:
                next_state = started + 0.25
                hub.publish("state", {"source": source.name, "snapshot": snap.to_dict(),
                                      "strategy": engineer.strategy(),
                                      "voice_on": voice_on["value"]})

            time.sleep(max(0.0, period - (time.monotonic() - started)))
    except KeyboardInterrupt:
        print("\nBis zum nächsten Rennen!")
    finally:
        speaker.close()
        if hasattr(source, "close"):
            source.close()


if __name__ == "__main__":
    main()
