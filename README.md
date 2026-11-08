# Jarvis – dein persönlicher KI-Assistent

Ein Sprachassistent für den PC im Stil von J.A.R.V.I.S. aus Iron Man. Er hört auf sein Aktivierungswort,
antwortet per Stimme, unterhält sich mit dir über die Claude-KI und kann deinen Computer steuern.

## Was Jarvis kann

| Bereich | Beispiele (einfach sagen: „Jarvis, …“) |
|---|---|
| Unterhaltung | „erklär mir schwarze Löcher“, „schreib mir einen Witz“, Rückfragen ohne erneutes „Jarvis“ |
| Alltag | „wie spät ist es?“, „wie wird das Wetter in Hamburg?“, „stell einen Timer auf 10 Minuten für die Pizza“ |
| Notizen | „notiere Milch kaufen“, „lies meine Notizen vor“, „lösche alle Notizen“ |
| Internet | „öffne YouTube“, „suche nach Rezepten für Lasagne“, „zeig mir Berlin auf der Karte“ |
| PC steuern | „öffne den Rechner / Spotify / Chrome / Word“, „öffne den Ordner Downloads“, „Lautstärke auf 30“ |
| Medien | „nächstes Lied“, „Pause“, „mach einen Screenshot“ |
| System | „wie ist der Systemstatus?“, „sperr den Computer“, „fahr den PC herunter“ (mit Rückfrage) |
| Steuerung | „neues Gespräch“ (Verlauf vergessen), „beenden“ / „auf Wiedersehen“ |

Ohne API-Schlüssel läuft Jarvis in einem einfachen **Offline-Modus** (Uhrzeit, Timer, Notizen, Programme öffnen …).

## Installation

Voraussetzung: **Python 3.10 oder neuer** ([python.org](https://www.python.org/downloads/) – unter Windows
bei der Installation „Add Python to PATH“ anhaken).

```bash
git clone https://github.com/seppoooo/bauen.git
cd bauen
python -m venv .venv
# Windows:      .venv\Scripts\activate
# macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt
```

**Mikrofon-Treiber (PyAudio):**
- Windows: wird mit `pip` normalerweise direkt installiert.
- macOS: vorher `brew install portaudio`
- Linux: vorher `sudo apt install portaudio19-dev python3-pyaudio espeak-ng`

**API-Schlüssel eintragen:** `.env.example` nach `.env` kopieren und den Schlüssel von
[console.anthropic.com](https://console.anthropic.com/settings/keys) bei `ANTHROPIC_API_KEY=` einfügen.

## Starten

```bash
python -m jarvis            # Sprachmodus: „Jarvis, wie spät ist es?“
python -m jarvis --text     # Tippen statt sprechen (gut zum Testen)
python -m jarvis --stumm    # Antworten nur anzeigen, nicht vorlesen
python -m jarvis --immer    # reagiert auf alles, ohne Aktivierungswort
```

Nach einer Antwort hört Jarvis noch etwa 6 Sekunden zu – für Rückfragen musst du „Jarvis“ dann nicht erneut sagen.

## Anpassen

In der `.env` kannst du Name, Aktivierungswort, Anrede („Sir“, „Chef“, dein Name …), Sprechtempo und das
KI-Modell ändern. `JARVIS_EFFORT=low` hält die Antworten schnell; `medium` oder `high` denkt gründlicher nach.

**Neue Fähigkeit hinzufügen:** In `jarvis/tools.py` eine Funktion mit Typangaben und Docstring schreiben
und in `ALL_FUNCTIONS` eintragen. Die KI erkennt anhand des Docstrings selbst, wann sie sie benutzen soll:

```python
def wuerfeln(seiten: int = 6) -> str:
    """Würfelt eine Zahl.

    Args:
        seiten: Anzahl der Seiten des Würfels.
    """
    import random
    return str(random.randint(1, seiten))
```

## Aufbau

```
jarvis/
├── assistant.py   Hauptschleife: Aktivierungswort, Zuhören, Antworten
├── brain.py       Claude-KI mit Werkzeugnutzung
├── tools.py       alle Fähigkeiten (Wetter, Timer, Programme, Lautstärke …)
├── offline.py     einfache Befehle ohne KI
├── voice.py       Spracherkennung und Sprachausgabe
└── config.py      Einstellungen aus .env
```

## Hinweise

- Die Spracherkennung nutzt den kostenlosen Google-Dienst und braucht Internet. Die Sprachausgabe läuft offline
  über die Stimmen deines Betriebssystems (unter Windows ggf. eine deutsche Stimme in den Spracheinstellungen installieren).
- Gespräche mit der KI kosten pro Anfrage etwas Guthaben auf deinem Anthropic-Konto.
- Herunterfahren, Neustarten und das Löschen von Notizen bestätigt Jarvis immer erst per Rückfrage.
- Notizen liegen in `~/.jarvis/notizen.json`.
