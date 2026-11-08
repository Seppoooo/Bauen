"""Die Fähigkeiten von Jarvis. Jede Funktion ist ein Werkzeug, das Claude selbstständig aufrufen kann.

Neue Fähigkeit hinzufügen: Funktion mit Typen + Docstring (inkl. "Args:") schreiben und unten in
ALL_FUNCTIONS eintragen – das Schema für die KI wird automatisch daraus erzeugt.
"""

from __future__ import annotations

import datetime as dt
import json
import os
import platform
import shutil
import subprocess
import threading
import urllib.parse
import urllib.request
import webbrowser
from typing import Callable

from .config import settings

SYSTEM = platform.system()  # "Windows", "Darwin" (macOS) oder "Linux"

# Wird vom Assistenten gesetzt: spricht Text bzw. stellt eine Ja/Nein-Rückfrage.
say: Callable[[str], None] = print
confirm: Callable[[str], bool] = lambda question: input(f"{question} (ja/nein) ").lower().startswith("j")

_WEEKDAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]
_MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August",
           "September", "Oktober", "November", "Dezember"]


def _run(cmd: list[str]) -> None:
    subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


# --------------------------------------------------------------------------- Alltag

def get_datetime() -> str:
    """Gibt das aktuelle Datum, den Wochentag und die Uhrzeit zurück."""
    now = dt.datetime.now()
    return (f"{_WEEKDAYS[now.weekday()]}, {now.day}. {_MONTHS[now.month - 1]} {now.year}, "
            f"{now:%H:%M} Uhr")


def get_weather(city: str) -> str:
    """Holt das aktuelle Wetter und die Tagesvorhersage für eine Stadt.

    Args:
        city: Name der Stadt, z. B. "Berlin".
    """
    url = f"https://wttr.in/{urllib.parse.quote(city)}?format=j1&lang=de"
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "jarvis"}), timeout=10) as r:
            data = json.load(r)
    except Exception as exc:
        return f"Wetterdienst nicht erreichbar: {exc}"
    now = data["current_condition"][0]
    desc = (now.get("lang_de") or now.get("weatherDesc") or [{"value": "?"}])[0]["value"]
    today = data["weather"][0]
    rain = max(int(h.get("chanceofrain", 0)) for h in today.get("hourly", [{"chanceofrain": 0}]))
    return (f"{city}: {desc}, {now['temp_C']} °C (gefühlt {now['FeelsLikeC']} °C), "
            f"Wind {now['windspeedKmph']} km/h, Luftfeuchtigkeit {now['humidity']} %. "
            f"Heute {today['mintempC']} bis {today['maxtempC']} °C, Regenwahrscheinlichkeit bis {rain} %.")


def set_timer(minutes: float, label: str = "Timer") -> str:
    """Stellt einen Timer bzw. eine Erinnerung. Jarvis meldet sich, wenn die Zeit abgelaufen ist.

    Args:
        minutes: Dauer in Minuten (Sekunden als Bruchteil, z. B. 0.5 für 30 Sekunden).
        label: Wofür der Timer ist, z. B. "Pizza".
    """
    seconds = max(1, int(minutes * 60))
    timer = threading.Timer(seconds, lambda: say(f"{settings.user_title}, Ihr Timer ist abgelaufen: {label}."))
    timer.daemon = True
    timer.start()
    ende = dt.datetime.now() + dt.timedelta(seconds=seconds)
    return f"Timer '{label}' läuft, endet um {ende:%H:%M:%S} Uhr."


_NOTES_FILE = settings.data_dir / "notizen.json"


def _load_notes() -> list[dict]:
    try:
        return json.loads(_NOTES_FILE.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def add_note(text: str) -> str:
    """Speichert eine Notiz dauerhaft (z. B. Einkaufsliste, Ideen, Erinnerungen).

    Args:
        text: Inhalt der Notiz.
    """
    notes = _load_notes()
    notes.append({"zeit": dt.datetime.now().isoformat(timespec="minutes"), "text": text})
    _NOTES_FILE.write_text(json.dumps(notes, ensure_ascii=False, indent=2), encoding="utf-8")
    return f"Notiz gespeichert. Es gibt jetzt {len(notes)} Notizen."


def read_notes() -> str:
    """Liest alle gespeicherten Notizen vor."""
    notes = _load_notes()
    if not notes:
        return "Es gibt keine Notizen."
    return "\n".join(f"{i}. ({n['zeit']}) {n['text']}" for i, n in enumerate(notes, 1))


def delete_notes() -> str:
    """Löscht alle gespeicherten Notizen."""
    if not confirm("Soll ich wirklich alle Notizen löschen?"):
        return "Abgebrochen – der Benutzer wollte die Notizen behalten."
    _NOTES_FILE.unlink(missing_ok=True)
    return "Alle Notizen gelöscht."


# --------------------------------------------------------------------------- Internet

def open_website(url: str) -> str:
    """Öffnet eine Webseite im Standardbrowser.

    Args:
        url: Adresse, z. B. "youtube.com" oder "https://wikipedia.org".
    """
    if "://" not in url:
        url = "https://" + url
    webbrowser.open(url)
    return f"{url} geöffnet."


def search_web(query: str, site: str = "google") -> str:
    """Startet eine Suche im Browser.

    Args:
        query: Suchbegriff.
        site: "google", "youtube", "wikipedia" oder "maps".
    """
    q = urllib.parse.quote_plus(query)
    urls = {
        "google": f"https://www.google.com/search?q={q}",
        "youtube": f"https://www.youtube.com/results?search_query={q}",
        "wikipedia": f"https://de.wikipedia.org/w/index.php?search={q}",
        "maps": f"https://www.google.com/maps/search/{q}",
    }
    webbrowser.open(urls.get(site, urls["google"]))
    return f"Suche nach '{query}' auf {site} geöffnet."


# --------------------------------------------------------------------------- PC steuern

# Deutsche/umgangssprachliche Namen -> Befehl je Betriebssystem
_PROGRAMS: dict[str, dict[str, str]] = {
    "rechner":       {"Windows": "calc", "Darwin": "Calculator", "Linux": "gnome-calculator"},
    "taschenrechner": {"Windows": "calc", "Darwin": "Calculator", "Linux": "gnome-calculator"},
    "editor":        {"Windows": "notepad", "Darwin": "TextEdit", "Linux": "gedit"},
    "notepad":       {"Windows": "notepad", "Darwin": "TextEdit", "Linux": "gedit"},
    "explorer":      {"Windows": "explorer", "Darwin": "Finder", "Linux": "nautilus"},
    "dateien":       {"Windows": "explorer", "Darwin": "Finder", "Linux": "nautilus"},
    "paint":         {"Windows": "mspaint", "Darwin": "Preview", "Linux": "gimp"},
    "terminal":      {"Windows": "cmd", "Darwin": "Terminal", "Linux": "gnome-terminal"},
    "einstellungen": {"Windows": "ms-settings:", "Darwin": "System Settings", "Linux": "gnome-control-center"},
    "taskmanager":   {"Windows": "taskmgr", "Darwin": "Activity Monitor", "Linux": "gnome-system-monitor"},
    "chrome":        {"Windows": "chrome", "Darwin": "Google Chrome", "Linux": "google-chrome"},
    "firefox":       {"Windows": "firefox", "Darwin": "Firefox", "Linux": "firefox"},
    "spotify":       {"Windows": "spotify:", "Darwin": "Spotify", "Linux": "spotify"},
    "word":          {"Windows": "winword", "Darwin": "Microsoft Word", "Linux": "libreoffice --writer"},
    "excel":         {"Windows": "excel", "Darwin": "Microsoft Excel", "Linux": "libreoffice --calc"},
    "discord":       {"Windows": "discord:", "Darwin": "Discord", "Linux": "discord"},
    "vscode":        {"Windows": "code", "Darwin": "Visual Studio Code", "Linux": "code"},
}


def open_program(name: str) -> str:
    """Startet ein Programm auf dem Computer (z. B. Rechner, Editor, Spotify, Chrome, Explorer, Word).

    Args:
        name: Name des Programms, wie der Benutzer es genannt hat.
    """
    key = name.lower().replace(" ", "").replace("-", "")
    if key in ("browser", "internet", "webbrowser"):
        webbrowser.open("https://www.google.com")
        return "Browser geöffnet."
    target = _PROGRAMS.get(key, {}).get(SYSTEM, name)
    try:
        if SYSTEM == "Windows":
            # "start" findet Programme aus dem Startmenü/PATH und auch URL-Protokolle wie spotify:
            subprocess.Popen(f'start "" {target}', shell=True)
        elif SYSTEM == "Darwin":
            _run(["open", "-a", target])
        else:
            parts = target.split()
            if not shutil.which(parts[0]):
                return f"Programm '{name}' wurde nicht gefunden."
            _run(parts)
    except Exception as exc:
        return f"Konnte '{name}' nicht starten: {exc}"
    return f"'{name}' wird gestartet."


def open_folder(folder: str) -> str:
    """Öffnet einen Ordner im Dateimanager.

    Args:
        folder: "downloads", "dokumente", "bilder", "musik", "videos", "desktop" oder ein vollständiger Pfad.
    """
    home = os.path.expanduser("~")
    known = {"downloads": "Downloads", "dokumente": "Documents", "bilder": "Pictures",
             "musik": "Music", "videos": "Videos", "desktop": "Desktop", "schreibtisch": "Desktop"}
    path = os.path.join(home, known[folder.lower()]) if folder.lower() in known else os.path.expanduser(folder)
    if not os.path.isdir(path):
        return f"Ordner nicht gefunden: {path}"
    if SYSTEM == "Windows":
        os.startfile(path)  # type: ignore[attr-defined]
    else:
        _run(["open" if SYSTEM == "Darwin" else "xdg-open", path])
    return f"Ordner {path} geöffnet."


def set_volume(percent: int) -> str:
    """Stellt die System-Lautstärke ein (0 = stumm, 100 = maximal).

    Args:
        percent: Lautstärke in Prozent von 0 bis 100.
    """
    percent = max(0, min(100, int(percent)))
    try:
        if SYSTEM == "Windows":
            from ctypes import POINTER, cast

            from comtypes import CLSCTX_ALL
            from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume

            speakers = AudioUtilities.GetSpeakers()
            interface = speakers.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
            volume = cast(interface, POINTER(IAudioEndpointVolume))
            volume.SetMute(percent == 0, None)
            volume.SetMasterVolumeLevelScalar(percent / 100, None)
        elif SYSTEM == "Darwin":
            subprocess.run(["osascript", "-e", f"set volume output volume {percent}"], check=True)
        elif shutil.which("pactl"):
            subprocess.run(["pactl", "set-sink-volume", "@DEFAULT_SINK@", f"{percent}%"], check=True)
        else:
            subprocess.run(["amixer", "-q", "sset", "Master", f"{percent}%"], check=True)
    except ImportError:
        return "Für die Lautstärke unter Windows bitte 'pip install pycaw' ausführen."
    except Exception as exc:
        return f"Lautstärke konnte nicht geändert werden: {exc}"
    return f"Lautstärke auf {percent} % gesetzt."


def media_control(action: str) -> str:
    """Steuert die Musik-/Videowiedergabe über Medientasten.

    Args:
        action: "play_pause", "next" oder "previous".
    """
    try:
        import pyautogui
    except ImportError:
        return "Für Mediensteuerung bitte 'pip install pyautogui' ausführen."
    keys = {"play_pause": "playpause", "next": "nexttrack", "previous": "prevtrack"}
    if action not in keys:
        return f"Unbekannte Aktion '{action}'."
    pyautogui.press(keys[action])
    return f"Medientaste '{action}' gedrückt."


def take_screenshot() -> str:
    """Macht einen Screenshot und speichert ihn im Bilder-Ordner."""
    try:
        import pyautogui
    except ImportError:
        return "Für Screenshots bitte 'pip install pyautogui' ausführen."
    folder = os.path.join(os.path.expanduser("~"), "Pictures")
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, f"jarvis_{dt.datetime.now():%Y-%m-%d_%H-%M-%S}.png")
    pyautogui.screenshot(path)
    return f"Screenshot gespeichert unter {path}."


def system_status() -> str:
    """Zeigt CPU-Auslastung, Arbeitsspeicher, freien Speicherplatz und Akkustand."""
    try:
        import psutil
    except ImportError:
        return "Für den Systemstatus bitte 'pip install psutil' ausführen."
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage(os.path.abspath(os.sep))
    parts = [f"CPU {psutil.cpu_percent(interval=0.5):.0f} %",
             f"RAM {mem.percent:.0f} % belegt ({mem.available / 1e9:.1f} GB frei)",
             f"Festplatte {disk.free / 1e9:.0f} GB frei"]
    battery = psutil.sensors_battery() if hasattr(psutil, "sensors_battery") else None
    if battery:
        parts.append(f"Akku {battery.percent:.0f} %{' (lädt)' if battery.power_plugged else ''}")
    return ", ".join(parts)


def power_action(action: str) -> str:
    """Sperrt, beendet oder startet den Computer neu. Fragt immer vorher nach Bestätigung.

    Args:
        action: "lock" (sperren), "shutdown" (herunterfahren), "restart" (neu starten) oder "sleep" (Ruhezustand).
    """
    commands = {
        "Windows": {"lock": "rundll32.exe user32.dll,LockWorkStation", "shutdown": "shutdown /s /t 5",
                    "restart": "shutdown /r /t 5", "sleep": "rundll32.exe powrprof.dll,SetSuspendState 0,1,0"},
        "Darwin": {"lock": "pmset displaysleepnow", "shutdown": "osascript -e 'tell app \"System Events\" to shut down'",
                   "restart": "osascript -e 'tell app \"System Events\" to restart'", "sleep": "pmset sleepnow"},
        "Linux": {"lock": "loginctl lock-session", "shutdown": "systemctl poweroff",
                  "restart": "systemctl reboot", "sleep": "systemctl suspend"},
    }
    cmd = commands.get(SYSTEM, {}).get(action)
    if not cmd:
        return f"Aktion '{action}' wird auf {SYSTEM} nicht unterstützt."
    names = {"lock": "sperren", "shutdown": "herunterfahren", "restart": "neu starten", "sleep": "in den Ruhezustand versetzen"}
    if action != "lock" and not confirm(f"Soll ich den Computer wirklich {names[action]}?"):
        return "Abgebrochen – der Benutzer hat nicht bestätigt."
    subprocess.Popen(cmd, shell=True)
    return f"Computer wird {names[action]}."


ALL_FUNCTIONS = [
    get_datetime, get_weather, set_timer, add_note, read_notes, delete_notes,
    open_website, search_web, open_program, open_folder, set_volume, media_control,
    take_screenshot, system_status, power_action,
]
