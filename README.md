# 🎧 Race Engineer für RaceRoom

Ein digitaler Renningenieur, der live die Telemetrie von **RaceRoom Racing Experience** liest und dir per Sprache Ansagen macht – wie ein echter Ingenieur am Boxenfunk. Dazu gibt's ein **Live-Dashboard** im Browser, das du auch aufs Handy oder Tablet neben dem Rig legen kannst.

## Was er dir ansagt

| Bereich | Ansagen |
|---|---|
| **Start & Flaggen** | Formationsrunde, „Grün, grün, grün!“, gelbe Flagge (mit Sektor) und „Strecke frei“, blaue Flagge, schwarze Flagge, falsche Richtung, letzte Runde, Zielflagge mit Ergebnis |
| **Position & Abstände** | Positionen gewonnen/verloren (erst wenn die Position stabil ist), Abstand nach vorne/hinten mit Namen, ob du aufholst oder verlierst („du holst 3 Zehntel pro Runde auf“), Druck von hinten, Angriffschance vorne |
| **Rundenzeiten** | Persönliche Bestzeit, schnellste Runde im Feld, ungültige Runden (Training/Quali), Rundenzeiten |
| **Sprit-Strategie** | Misst deinen echten Verbrauch pro Runde (Boxenrunden zählen nicht mit), rechnet aus, ob es bis ins Ziel reicht oder wie viele Liter fehlen, warnt bei 3 / 2 / 1 Runde Restsprit |
| **Reifen & Bremsen** | Reifen überhitzt / zu kalt (mit Achse bzw. Ecke), Reifenverschleiß bei 50 / 30 / 15 %, heiße Bremsen |
| **Schaden** | Motor, Getriebe, Aerodynamik, Fahrwerk – leicht / deutlich / schwer |
| **Strafen** | Track-Limits-Verwarnungen, Durchfahrt, Stop-and-Go, Slow-Down, Zeitstrafe |
| **Box** | Pit Limiter vergessen!, Boxenfenster offen, Boxenausfahrt |
| **Session** | Verbleibende Zeit (10 / 5 / 2 / 1 Min), verbleibende Runden |

Veraltete Ansagen werden verworfen (du hörst nichts mehr über eine gelbe Flagge, die längst weg ist), wichtige Meldungen kommen vor unwichtigen.

## Installation (Windows)

1. **Python 3.10 oder neuer** installieren: <https://www.python.org/downloads/> – beim Installieren den Haken bei **„Add Python to PATH“** setzen.
2. Dieses Repository herunterladen (grüner Button **Code → Download ZIP**) und entpacken.
3. **Deutsche Stimme** (falls noch nicht vorhanden): *Einstellungen → Zeit und Sprache → Sprache & Region → Deutsch → Optionen → Sprachausgabe* installieren. Dann gibt's z.B. die Stimme „Microsoft Hedda“.

## Benutzung

1. Doppelklick auf **`start.bat`** (beim ersten Start werden die Abhängigkeiten automatisch installiert).
2. RaceRoom starten und auf die Strecke fahren – der Engineer verbindet sich automatisch („Verbindung zu RaceRoom steht“). In RaceRoom muss nichts eingestellt werden, das Spiel stellt die Telemetrie selbst bereit.
3. Dashboard öffnen: **<http://localhost:8080>**
   Auf dem Handy/Tablet (im selben WLAN) die Adresse öffnen, die im Konsolenfenster steht, z.B. `http://192.168.0.23:8080`. Beim ersten Mal fragt die Windows-Firewall nach – „Private Netzwerke“ erlauben.

**Ohne Spiel ausprobieren:** `start_demo.bat` startet ein simuliertes 12-Runden-Rennen mit Gelbphase, Zweikämpfen, Track-Limits, Schaden, überhitzten Reifen und knappem Sprit.

### Im Dashboard

- **Funk-Zeile** oben: die letzte Ansage groß zum Mitlesen, darunter Flaggen als farbiges Band (Gelb, Blau, Schwarz, Zielflagge, „Pit Limiter!“).
- **Rennlage**: Position (mit Plätzen seit dem Start), Runde mit Fortschritt, Live-Delta zur Bestzeit als Balken, Abstände nach vorne/hinten mit Trend der letzten Runde.
- **Reifen & Bremsen**: Auto von oben, jeder Reifen in drei Zonen (außen/Mitte/innen) nach Temperatur eingefärbt, Gummi-Rest, Druck, Bremstemperatur.
- **Sprit-Strategie**: „Reicht bis ins Ziel“ oder „Es fehlen X Liter“, Reichweite und Restrunden direkt nebeneinander.
- **Fahrzeug**: Gang, Speed, Schaltblitz, Gas/Bremse, Schaden.
- **Rundenzeiten- und Abstands-Grafik** (mit Tabelle), **Klassement** mit Abstand zu dir, **Funkprotokoll** mit Filtern.
- **Frag ihn: Lage / Sprit / Abstände / Reifen** – der Engineer antwortet per Funk.
- **Hier vorlesen** (Ansagen kommen aus Handy/Tablet), **PC-Stimme** an/aus, **Display wach** (Handy-Bildschirm bleibt an), **Vollbild**.

## Einstellungen

In `settings.json` (oder als Parameter an `start.bat`):

| Einstellung | Parameter | Bedeutung |
|---|---|---|
| `verbosity` | `--verbosity 1/2/3` | 1 = nur Wichtiges, 2 = normal, 3 = gesprächig (jede Rundenzeit, Abstände jede Runde) |
| `voice` | `--voice Hedda` | Teil des Stimmen-Namens; ohne Angabe wird automatisch eine deutsche Stimme gewählt |
| `rate` | `--rate 2` | Sprechtempo von -10 bis 10 |
| `volume` | `--volume 80` | Lautstärke 0–100 |
| `speech` | `--no-voice` | Sprachausgabe am PC aus (nur Dashboard) |
| `port` | `--port 8081` | Port des Dashboards |

## Problemlösung

- **„Warte auf RaceRoom …“ obwohl das Spiel läuft:** Läuft RaceRoom als Administrator, muss auch `start.bat` als Administrator gestartet werden.
- **Keine Stimme:** Prüfen, ob eine deutsche Sprachausgabe installiert ist (siehe oben). Im Konsolenfenster steht beim Start, welche Stimme verwendet wird.
- **Dashboard am Handy lädt nicht:** PC und Handy müssen im selben Netz sein, und die Windows-Firewall muss Python erlauben.

## Technik

```
RaceRoom ──($R3E Shared Memory)──▶ games/r3e.py ──▶ Snapshot ──▶ engineer.py ──▶ Ansagen
                                                                     │              ├─▶ speech.py (Windows-Stimme)
                                                                     └──────────────┴─▶ dashboard.py (Browser, live)
```

- `race_engineer/games/r3e_struct.py` – exakte Abbildung der offiziellen RaceRoom-Schnittstelle ([sector3studios/r3e-api](https://github.com/sector3studios/r3e-api), Version 3.6); Größe und Feld-Offsets werden in den Tests gegen den C-Header geprüft.
- `race_engineer/engineer.py` – die Regeln: was wann gesagt wird, Sprit-Rechnung, Cooldowns.
- `race_engineer/games/demo.py` – Rennsimulation zum Testen.
- `race_engineer/web/index.html` – das Dashboard. Liegt eine `demo-replay.json` daneben (erzeugt mit `python tools/record_demo.py`), spielt es dieses aufgezeichnete Rennen ab statt live zu verbinden – so funktioniert die Online-Vorschau.
- Das Datenmodell (`model.py`) ist spielunabhängig – weitere Spiele lassen sich als neue Quelle in `games/` ergänzen.

Tests ausführen: `python -m unittest discover -s tests -t .`
