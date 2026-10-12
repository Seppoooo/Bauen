#!/usr/bin/env node
/**
 * Exportiert Hogwarts aus dem Blockmodell (../js/modell.js) als Bauplan für den Builder:
 *   public/projekte/hogwarts.mcbp.gz          – alles mit Berg, Wald und Außenanlagen
 *   public/projekte/hogwarts-schloss.mcbp.gz  – nur Schloss, Brücke und Brückenkopf (leichter)
 *
 * Jeder Block bekommt eine Etappe, ein Stockwerk und ein Bauteil. Vom Berg werden nur Blöcke
 * übernommen, die man sehen kann (das Innere des Felsens bleibt weg).
 *
 * Aufruf: npm run hogwarts
 */
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const M = require(join(hier, '..', '..', 'js', 'modell.js'));

const STEPS = [
  { id: 1, name: 'Berg formen', description: 'Fels, Erde und Gras des Berges, Schlucht, Südhügel, See und Fluss' },
  { id: 2, name: 'Fundament & Sockel', description: 'Bruchstein-Sockel des Schlosses und Pfeilerfüße der Brücke' },
  { id: 3, name: 'Mauern Erdgeschoss', description: 'Außenmauern, Fenster und Fassadenrelief im Erdgeschoss' },
  { id: 4, name: 'Obergeschosse & Türme', description: 'Mauern der Obergeschosse, Große Halle und alle 15 Türme' },
  { id: 5, name: 'Dächer & Turmhelme', description: 'Satteldächer, Gauben, Turmhelme, Schornsteine und Blitzableiter' },
  { id: 6, name: 'Innenausbau', description: 'Böden, Treppen, Große Halle, Bibliothek, Klassenzimmer und Licht' },
  { id: 7, name: 'Brücke & Brückenkopf', description: 'Zweistöckiges Viadukt, Torhaus und Steinkreis auf dem Südhügel' },
  { id: 8, name: 'Gärten & Außenanlagen', description: 'Schlossterrasse, Innenhof, Gewächshäuser, Hagrids Hütte, Quidditch-Feld, Steg und Bootshaus' },
  { id: 9, name: 'Wald & Natur', description: 'Selbstgebaute Bäume, Blumen, Seerosen und Zuckerrohr' }
];
const FLOORS = [
  { id: 0, name: 'Berg & Gelände' },
  { id: 1, name: 'Schloss Erdgeschoss', minY: 111, maxY: 120 },
  { id: 2, name: 'Schloss 1. Obergeschoss', minY: 121, maxY: 126 },
  { id: 3, name: 'Schloss 2. Obergeschoss', minY: 127, maxY: 132 },
  { id: 4, name: 'Dächer & Türme', minY: 133, maxY: 211 },
  { id: 5, name: 'Brücke & Brückenkopf' },
  { id: 6, name: 'Außenanlagen' }
];
const PARTS = ['foundation', 'floor', 'wall', 'interior_wall', 'window', 'door', 'stairs', 'roof', 'decoration', 'terrain', 'other'];

const GELAENDE = /^(stone|andesite|dirt|grass_block|sand|gravel|coarse_dirt|moss_block|water|dirt_path)$/;
const NATUR = /(_log|_leaves)$|^(poppy|dandelion|cornflower|fern|allium|azure_bluet|oxeye_daisy|lily_pad|sugar_cane|flowering_azalea)$/;
const DACH = /deepslate_tile|deepslate_brick_stairs|lightning_rod/;
const DEKO = /lantern|chain|candle|carpet|bookshelf|lectern|_wool|campfire|_slab$|spruce_stairs|pumpkin|azalea|moss|fence|concrete/;

function teilVon(type, y0Lokal, bau) {
  if (/glass|pane/.test(type)) return 'window';
  if (type === 'ladder') return 'stairs';
  if (DACH.test(type)) return 'roof';
  if (bau === 'hauptschloss' && y0Lokal <= 3 && /cobblestone$/.test(type)) return 'foundation';
  if (bau === 'bruecke' && y0Lokal <= 8 && /cobblestone$/.test(type)) return 'foundation';
  if (/(dark_oak|spruce)_planks/.test(type)) return 'floor';
  if (GELAENDE.test(type)) return 'terrain';
  if (NATUR.test(type) || DEKO.test(type) || type === 'water') return 'decoration';
  return 'wall';
}

function etappe(bau, teil, type, floor, y0Lokal) {
  if (bau === 'berg') return GELAENDE.test(type) ? 1 : NATUR.test(type) ? 9 : 8;
  if (bau === 'bruecke' || bau === 'brueckenkopf') return teil === 'foundation' ? 2 : 7;
  if (bau !== 'hauptschloss') return 8;
  if (teil === 'foundation') return 2;
  if (teil === 'roof') return 5;
  if (GELAENDE.test(type) || NATUR.test(type) || (type === 'water' && y0Lokal <= 5)) return 8; // Gärten, Innenhof, Brunnen
  if (teil === 'floor' || teil === 'stairs' || teil === 'decoration') return 6;
  if (type === 'campfire' || type === 'chiseled_stone_bricks' && y0Lokal > 22) return 5;
  return floor <= 1 ? 3 : 4;
}

function exportiere(name, beschreibung, mitBerg, datei) {
  const g = M.erzeugeGesamt();
  const deck = g.keys.map((k) => M.block(k).deckend);
  const SX = g.sx, SZ = g.sz, E = SX * SZ, D = g.daten;
  const teile = g.teile.filter((t) => t.id !== 'berg');
  const palette = [], palIndex = new Map();
  const xs = [], ys = [], zs = [], pal = [], fl = [], st = [], pa = [];
  const zaehler = new Map();
  for (let y = 0; y < g.sy; y++) for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) {
    const i = (y * SZ + z) * SX + x, v = D[i];
    if (!v) continue;
    const teil = teile.find((t) => x >= t.lage[0] && y >= t.lage[1] && z >= t.lage[2] && x < t.lage[0] + t.groesse[0] && y < t.lage[1] + t.groesse[1] && z < t.lage[2] + t.groesse[2]);
    let bau = teil ? teil.id : 'berg';
    const key = g.keys[v], b = M.block(key), type = b.id.replace('minecraft:', '');
    // Gelände-Blöcke innerhalb einer Bauwerks-Box gehören trotzdem zum Berg
    if (teil && teil.id !== 'hauptschloss' && GELAENDE.test(type) && bau !== 'quidditch' && bau !== 'hagrid' && bau !== 'gewaechshaeuser') bau = 'berg';
    if (!mitBerg && (bau === 'berg' || bau === 'hagrid' || bau === 'gewaechshaeuser' || bau === 'quidditch')) continue;
    if (bau === 'berg') {
      const innen = deck[v] && x > 0 && x < SX - 1 && z > 0 && z < SZ - 1 && y > 0 && y < g.sy - 1 &&
        deck[D[i - 1]] && deck[D[i + 1]] && deck[D[i - SX]] && deck[D[i + SX]] && deck[D[i - E]] && deck[D[i + E]];
      if (innen) continue;
    }
    const y0 = teil ? y - teil.lage[1] : y;
    const t = teilVon(type, y0, bau);
    const floor = bau === 'hauptschloss' ? (y <= 120 ? 1 : y <= 126 ? 2 : y <= 132 ? 3 : 4) : bau === 'bruecke' || bau === 'brueckenkopf' ? 5 : bau === 'berg' ? 0 : 6;
    const step = etappe(bau, t, type, floor, y0);
    const props = Object.fromEntries(Object.entries(b.props).filter(([k]) => k !== 'waterlogged'));
    const pk = type + JSON.stringify(props);
    let pi = palIndex.get(pk);
    if (pi === undefined) { pi = palette.length; palIndex.set(pk, pi); palette.push(Object.keys(props).length ? { type, props } : { type }); }
    xs.push(x); ys.push(y); zs.push(z); pal.push(pi); fl.push(floor); st.push(step); pa.push(PARTS.indexOf(t));
    zaehler.set(step, (zaehler.get(step) ?? 0) + 1);
  }
  const n = xs.length;
  const benutzt = new Set(st), benutzteEtagen = new Set(fl);
  const kopf = JSON.stringify({
    name, description: beschreibung, author: 'Hogwarts-Bauplan', minecraftVersion: '26.3',
    steps: STEPS.filter((s) => benutzt.has(s.id)), floors: FLOORS.filter((f) => benutzteEtagen.has(f.id)), palette, parts: PARTS, count: n
  });
  const kopfBytes = Buffer.from(kopf, 'utf8');
  const out = Buffer.alloc(10 + kopfBytes.length + n * 11);
  out.write('MCBP1\n', 0, 'latin1');
  out.writeUInt32LE(kopfBytes.length, 6);
  kopfBytes.copy(out, 10);
  let o = 10 + kopfBytes.length;
  for (const a of [xs, ys, zs]) for (let i = 0; i < n; i++, o += 2) out.writeInt16LE(a[i], o);
  for (let i = 0; i < n; i++, o += 2) out.writeUInt16LE(pal[i], o);
  for (const a of [fl, st, pa]) for (let i = 0; i < n; i++) out[o++] = a[i];
  const gz = gzipSync(out, { level: 9 });
  writeFileSync(datei, gz);
  console.log(`${datei.split('/').pop()}: ${n.toLocaleString('de-DE')} Blöcke · ${(gz.length / 1048576).toFixed(1)} MB · Etappen ${[...zaehler.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => k + ':' + v).join(' ')}`);
}

const ziel = join(hier, '..', 'public', 'projekte');
mkdirSync(ziel, { recursive: true });
exportiere('Hogwarts', 'Hogwarts auf dem Berg: Schloss mit eingerichteter Großer Halle, Bibliothek und Klassenzimmern, 15 Türme, Viadukt, Brückenkopf mit Steinkreis, See mit Insel und Bootshaus, Fluss, Wald, Gewächshäuser, Hagrids Hütte und Quidditch-Feld. Vom Berg ist nur die sichtbare Oberfläche enthalten.', true, join(ziel, 'hogwarts.mcbp.gz'));
exportiere('Hogwarts – Schloss', 'Nur Schloss, Viadukt und Brückenkopf – ohne Berg, für schwächere Rechner.', false, join(ziel, 'hogwarts-schloss.mcbp.gz'));
