"""Einfache Befehle ohne KI – damit Jarvis auch ohne API-Schlüssel oder Internet etwas kann."""

from __future__ import annotations

import re

from . import tools

_NUMBERS = {"eine": 1, "einen": 1, "ein": 1, "zwei": 2, "drei": 3, "vier": 4, "fünf": 5, "sechs": 6,
            "sieben": 7, "acht": 8, "neun": 9, "zehn": 10, "fünfzehn": 15, "zwanzig": 20, "dreißig": 30}


def _number(word: str) -> float | None:
    word = word.replace(",", ".")
    try:
        return float(word)
    except ValueError:
        return _NUMBERS.get(word)


def handle(text: str) -> str | None:
    """Gibt eine Antwort zurück, oder None, wenn der Befehl nicht erkannt wurde."""
    original = text.strip(" .!?")
    t = original.lower()

    if "wie spät" in t or "uhrzeit" in t or "wieviel uhr" in t or "wie viel uhr" in t:
        return "Es ist " + tools.get_datetime().split(", ")[-1] + "."
    if "datum" in t or "welcher tag" in t or "welches datum" in t:
        return "Heute ist " + tools.get_datetime().rsplit(",", 1)[0] + "."

    if m := re.search(r"wetter (?:in|für) ([\wäöüß\- ]+)", t):
        return tools.get_weather(m.group(1).strip().title())

    if m := re.search(r"timer (?:auf |für )?(\S+) (sekunde|minute|stunde)", t):
        n = _number(m.group(1))
        if n is not None:
            factor = {"sekunde": 1 / 60, "minute": 1, "stunde": 60}[m.group(2)]
            return tools.set_timer(n * factor)

    if m := re.search(r"(?:notiere|notiz:?|merke dir) (.+)", original, re.IGNORECASE):
        return tools.add_note(m.group(1))
    if "notizen" in t and ("lies" in t or "vor" in t or "zeig" in t):
        return tools.read_notes()

    if m := re.search(r"lautstärke (?:auf )?(\d+)", t):
        return tools.set_volume(int(m.group(1)))
    if t in ("stumm", "ton aus", "mute"):
        return tools.set_volume(0)

    if m := re.search(r"(?:suche|google) (?:nach )?(.+)", original, re.IGNORECASE):
        return tools.search_web(m.group(1))
    if m := re.search(r"öffne (?:den ordner |ordner )(.+)", t):
        return tools.open_folder(m.group(1))
    if m := re.search(r"öffne (?:die seite |die webseite )?([\w\-]+\.(?:de|com|org|net|io|tv)\S*)", t):
        return tools.open_website(m.group(1))
    if m := re.search(r"(?:öffne|starte) (?:den |die |das )?(.+)", t):
        return tools.open_program(m.group(1))

    if "systemstatus" in t or "system status" in t:
        return tools.system_status()
    if "screenshot" in t or "bildschirmfoto" in t:
        return tools.take_screenshot()
    if "sperr" in t:
        return tools.power_action("lock")
    return None
