# Minecraft 3D Builder

Interaktive Bauplan-Website: Minecraft-Bauwerke in 3D erkunden, frei herumfliegen, Bauphasen (Etappen)
Schritt für Schritt durchgehen, Stockwerke und Bauteile ein- und ausblenden, Materiallisten berechnen
und Projekte als JSON oder Schematic laden.

Technik: React 18 · TypeScript · Vite · Three.js (InstancedMesh, Chunks) · JSON-Projekte

## Starten

Voraussetzung: [Node.js](https://nodejs.org) ab Version 18.

```bash
cd minecraft-builder
npm install        # einmalig
npm run dev        # öffnet http://localhost:5173 im Browser
```

Weitere Befehle:

| Befehl | Zweck |
|---|---|
| `npm run build` | fertige Website nach `dist/` bauen (Typprüfung inklusive) |
| `npm run preview` | den Build lokal ansehen |
| `npm run typecheck` | nur TypeScript prüfen |
| `npm run demo` | Beispielburg neu erzeugen (`src/data/demoCastle.json`) |
| `npm run hogwarts` | Hogwarts-Baupläne neu erzeugen (`public/projekte/`) |
| `npm run single` | nach dem Build eine einzelne HTML-Datei erzeugen |

## Bedienung

**Oben:** Reiter *2D-Plan*, *3D-Ansicht*, *Baupläne*, *Etappen*, *Team-To-dos* · rechts *Menü einklappen*

**3D-Ansicht – Werkzeugleiste:** Bauplan-Linien (Raster, kräftige Linie alle 4/8/16/32 Blöcke) ·
Wände durchsichtig · Dach aus · Tempo · Vollbild · Flugmodus (F) · Aktueller Stand (X) · Bauen · Live-Spieler

| Taste | Wirkung |
|---|---|
| W / A / S / D | vorwärts / links / rückwärts / rechts |
| Leertaste | nach oben |
| Strg oder C | nach unten (Achtung: Strg+W schließt im Browser den Tab – beim Vorwärtsfliegen lieber C) |
| Shift | schneller fliegen |
| Maus ziehen | umsehen |
| F | Flugmodus: Maus einfangen wie im Spiel (Esc gibt sie frei) |
| Mausrad | vorwärts / zurück |
| X | Aktueller Stand: spätere Etappen als durchsichtiger Plan |
| ← / → | vorherige / nächste Etappe |

Unten links steht immer der Block unter dem Mauszeiger (Name, Minecraft-ID mit Blockzuständen,
Koordinaten, Stockwerk, Etappe, Bauteil). Unten rechts zeigt eine Minikarte Kamera und Live-Spieler.

**Etappen-Zeitleiste:** Zurück/Weiter, Abspielen, Fortschritt in Prozent. Es sind nur Blöcke bis zur
gewählten Etappe sichtbar (oder mit *Aktueller Stand* als Plan durchsichtig).

**Rechtes Menü:** *Position* (Live-Spieler, Kamera folgen/sperren, F3+C-Kopplung) ·
*Einstellungen* (Stockwerke, Bauteile, Explosionsansicht) · *Material* (gesamt, nur diese Etappe,
bis jetzt gebaut, noch benötigt – jeweils pro Stockwerk filterbar, mit Stacks und Shulkerkisten).

**Bauen:** Haken bei *Bauen* setzen, Block und Bauteil wählen, Rechtsklick setzt, Linksklick baut ab.
Neue Blöcke bekommen die aktuelle Etappe und das Stockwerk passend zur Höhe.

## Mitgelieferte Baupläne

Im Reiter *Baupläne*: **Hogwarts mit Berg** (1,1 Mio. sichtbare Blöcke, 500 × 500, 9 Etappen von „Berg formen“ bis
„Wald & Natur“), **Hogwarts – nur Schloss** (245.000 Blöcke) und die **Beispielburg**. Neu erzeugen:
`npm run hogwarts` (liest `../js/modell.js`).

## Originale Minecraft-Texturen

Menü *Einstellungen* → *Minecraft-.jar oder Ressourcenpaket wählen*. Unter Windows liegt die Datei z. B. unter
`%appdata%\.minecraft\versions\26.3\26.3.jar`. Die Texturen werden direkt im Browser ausgelesen (nichts wird
hochgeladen), Gras/Laub/Wasser wie im Spiel eingefärbt und für den nächsten Besuch gespeichert. Die Seiten der
Blöcke werden wie in Minecraft schattiert (oben 100 %, Nord/Süd 80 %, Ost/West 60 %, unten 50 %).

## Mit Minecraft koppeln

**Ohne Mod (F3 + C):** Im Menü *Position* eintragen, wo die Nordwest-Ecke unten des Bauplans in deiner
Welt liegt. Im Spiel **F3+C** drücken (kopiert Position und Blickrichtung), in der Website **Strg+V** –
die 3D-Kamera springt genau dorthin.

**Live mit dem Server-Plugin:** Das Paper-Plugin [`../bauplan-plugin`](../bauplan-plugin/README.md) liefert diese
Website selbst aus (`http://SERVER-IP:8100`) und schickt die Positionen aller Spieler live. Ursprung und
„Position gesperrt“ gelten dann für alle Zuschauer. Ohne Plugin kann man im Menü *Position* auch eine
Server-Adresse eintragen.

**Eigener Mod (WebSocket):** Alternativ verbindet sich die Website mit `ws://…` und erwartet Nachrichten in Minecraft-Koordinaten:

```json
{ "players": [ { "name": "Josef", "x": 123.5, "y": 64, "z": -20.2, "yaw": 90, "pitch": 10 } ] }
```

Ein einzelnes Objekt `{ "x":…, "y":…, "z":…, "yaw":…, "pitch":… }` geht auch. Spieler erscheinen als Figur
mit Namen in 3D, im 2D-Plan und auf der Minikarte; mit *Folgen* fliegt die Kamera live mit.


## Projektformat (JSON)

```json
{
  "format": "mc-builder", "version": 1, "name": "Meine Burg", "minecraftVersion": "26.3",
  "steps":  [ { "id": 1, "name": "Fundament" }, { "id": 2, "name": "Boden" } ],
  "floors": [ { "id": 0, "name": "Erdgeschoss", "minY": 0, "maxY": 5 } ],
  "blocks": [
    { "x": 0, "y": 0, "z": 0, "type": "stone_bricks", "floor": 0, "step": 1, "part": "foundation" },
    { "x": 0, "y": 1, "z": 0, "type": "oak_stairs", "props": { "facing": "east", "half": "bottom" }, "floor": 0, "step": 4, "part": "stairs" }
  ]
}
```

- `type`: Minecraft-Block-ID ohne `minecraft:` · `props`: Blockzustände (optional)
- `part`: foundation, floor, wall, interior_wall, window, door, stairs, roof, decoration, terrain, other
- Große Projekte (ab 20.000 Blöcken) werden kompakt exportiert (`mc-builder-compact`: Palette + Zahlenliste).

**Schematics:** `.litematic` (Litematica) und `.schem` (Sponge/WorldEdit) werden direkt importiert.
Bauteile, Stockwerke (alle 6 Blöcke) und Etappen werden dabei automatisch geschätzt (`src/import/AutoClassify.ts`).

## Eigene Texturen

Der Builder malt alle Texturen selbst. Eigene 16×16-PNGs in `public/textures/blocks/` legen und in
`textures.json` eintragen – siehe README dort.

## Aufbau

```
src/
  app/        React-Oberfläche (App, TopNav, Toolbar, RightPanel, Timeline, Hud, Minimap, views/)
  engine/     3D-Engine ohne React (Scene, CameraController, BlockRenderer, Selection, Shapes, Textures, PlanRenderer)
  builder/    Datenmodell und Logik (BuildProject, BuildSteps, Floors, Materials, ViewFilter, ProjectStore, Todos)
  import/     JSON-, Litematica- und Sponge-Import, NBT-Leser, automatische Einteilung
  data/       demoCastle.json (Beispielburg)
scripts/      generate-demo-castle.mjs
```

Die Engine bekommt von der Oberfläche nur Projekt und Ansichtszustand (`ViewState`) und meldet Ereignisse
(Block unter der Maus, Kamera, Live-Spieler) zurück. Dadurch lassen sich beide Seiten unabhängig erweitern.

**Leistung:** Die Welt ist in 16×16×16-Chunks geteilt; pro Chunk gibt es je Form/Textur ein `InstancedMesh`.
Verdeckte Würfel werden nicht gezeichnet, Materialien und Texturen werden geteilt, und bei Filteränderungen
werden nur betroffene Chunks neu aufgebaut. Getestet: Hogwarts-Hauptschloss mit 192.498 Blöcken.
