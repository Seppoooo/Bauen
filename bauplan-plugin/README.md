# BauplanLive – Paper-Plugin

Zeigt den Bauplan (3D-Ansicht, 2D-Plan, Etappen, Materialliste) direkt vom Minecraft-Server aus an –
mit den **Live-Positionen aller Spieler**. Alle aus dem Team öffnen einfach im Browser:

```
http://SERVER-IP:8100
```

## Installation

1. `dist/BauplanLive.jar` in den Ordner `plugins/` des Paper-Servers legen (Paper 1.21 oder neuer, Java 21).
2. Server starten. Es entsteht `plugins/BauplanLive/` mit `einstellungen.properties` und der Website in `web/`.
3. Port **8100** (TCP) in der Firewall bzw. beim Hoster freigeben.
4. Im Spiel an die Nordwest-Ecke unten des Bauplans stellen (dort, wo die Litematica-Schematic beginnt) und
   `/bauplan ursprung` eingeben. Ab jetzt stimmen die Positionen im Plan mit der Welt überein.

## Befehle (Rechte: `bauplanlive.use`, standardmäßig OPs)

| Befehl | Wirkung |
|---|---|
| `/bauplan` | zeigt die Adresse der Website |
| `/bauplan ursprung` | setzt den Ursprung des Bauplans auf deine Position |
| `/bauplan folgen <Spieler>` | „Position gesperrt – gilt für alle“: alle Zuschauer folgen diesem Spieler |
| `/bauplan entsperren` | Sperre aufheben |

Folgen/Entsperren und den Ursprung kann man auch in der Website (Menü *Position*) ändern – es gilt für alle.

## Einstellungen (`plugins/BauplanLive/einstellungen.properties`)

| Schlüssel | Standard | Bedeutung |
|---|---|---|
| `port` | 8100 | Port der Website |
| `intervall-ticks` | 4 | wie oft Positionen erfasst werden (20 Ticks = 1 s) |
| `bauplan` | `projekte/hogwarts.mcbp.gz` | Bauplan, der beim Öffnen geladen wird (`projekte/hogwarts-schloss.mcbp.gz` = nur Schloss) |
| `web-aktualisieren` | true | Website beim Start neu aus dem Plugin entpacken |

Eigene Baupläne: Datei (`.mcbp.gz` oder `.json`) nach `plugins/BauplanLive/web/` kopieren und bei `bauplan` eintragen
(dann `web-aktualisieren=false`, damit sie nicht überschrieben wird). **Originale Minecraft-Texturen** für alle:
PNG-Dateien nach `web/textures/blocks/` legen und in `textures.json` eintragen – oder jeder lädt im Menü
*Einstellungen* seine eigene Minecraft-`.jar`.

## Schnittstelle

| Adresse | Inhalt |
|---|---|
| `GET /api/players` | `[{"name","world","x","y","z","yaw","pitch"}]` |
| `GET /api/stream` | Server-Sent Events, alle 250 ms `{"players":[…],"state":{…}}` |
| `GET/POST /api/state` | `{"origin":[x,y,z],"world","follow","plan"}` – POST ändert `origin` und/oder `follow` |

## Selbst bauen

`./build.sh` kompiliert ohne Internet gegen die Schnittstellen in `stubs/` (nur zur Compile-Zeit) und packt die
Website aus `../minecraft-builder/dist` hinein (vorher dort `npm run build`). Alternativ mit Maven gegen die echte
Paper-API: `mvn package` (die Website dann von Hand nach `src/main/resources/web/` kopieren).

Hinweis: Das Plugin ist gegen einen nachgebauten Testserver geprüft, nicht gegen einen echten Paper-Server.
