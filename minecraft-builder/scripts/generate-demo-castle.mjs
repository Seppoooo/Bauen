#!/usr/bin/env node
/**
 * Erzeugt die eingerichtete Beispielburg als Projekt-JSON:  npm run demo
 * Ergebnis: src/data/demoCastle.json
 *
 * Jeder Block bekommt Stockwerk (aus der Höhe), Bauteil und Bauphase:
 *   1 Fundament · 2 Boden · 3 Außenwände · 4 Innenwände · 5 Fenster und Türen
 *   6 Weitere Stockwerke · 7 Dach · 8 Dekoration
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const FLOORS = [
  { id: 0, name: 'Erdgeschoss', minY: 0, maxY: 5 },
  { id: 1, name: 'Obergeschoss', minY: 6, maxY: 10 },
  { id: 2, name: 'Dach & Türme', minY: 11, maxY: 40 }
];
const STEPS = [
  { id: 1, name: 'Fundament', description: 'Bruchstein-Fundament unter allen Mauern und dem Bergfried' },
  { id: 2, name: 'Boden', description: 'Holzboden im Erdgeschoss und gepflasterter Hof' },
  { id: 3, name: 'Außenwände', description: 'Ringmauer, Ecktürme und Außenwände des Erdgeschosses' },
  { id: 4, name: 'Innenwände', description: 'Trennwände und Treppe im Erdgeschoss' },
  { id: 5, name: 'Fenster und Türen', description: 'Fenster, Tore und Türen im Erdgeschoss' },
  { id: 6, name: 'Weitere Stockwerke', description: 'Obergeschoss, Dachboden und obere Turmgeschosse' },
  { id: 7, name: 'Dach', description: 'Satteldach, Turmhelme und Zinnen' },
  { id: 8, name: 'Dekoration', description: 'Einrichtung, Licht, Garten und Brunnen' }
];

const map = new Map();
const floorOf = (y) => (y <= 5 ? 0 : y <= 10 ? 1 : 2);
function stepOf(part, floor) {
  if (part === 'foundation') return 1;
  if (part === 'roof') return 7;
  if (part === 'decoration') return 8;
  if (floor > 0) return 6;
  return { floor: 2, wall: 3, interior_wall: 4, stairs: 4, window: 5, door: 5 }[part] ?? 3;
}
function set(x, y, z, type, part, props, step) {
  const floor = floorOf(y);
  const b = { x, y, z, type, floor, step: step ?? stepOf(part, floor), part };
  if (props) b.props = props;
  map.set(`${x},${y},${z}`, b);
}
const del = (x, y, z) => map.delete(`${x},${y},${z}`);
const get = (x, y, z) => map.get(`${x},${y},${z}`);
function hash(x, y, z) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const mauer = (x, y, z) => { const r = hash(x, y, z); return r < (y < 4 ? 0.16 : 0.06) ? 'mossy_stone_bricks' : r < 0.2 && r > 0.14 ? 'cracked_stone_bricks' : 'stone_bricks'; };
const box = (x0, y0, z0, x1, y1, z1, f) => { for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) f(x, y, z); };
const stair = (facing, half = 'bottom') => ({ facing, half, shape: 'straight' });
const pane = (achse) => (achse === 'x' ? { east: 'true', west: 'true', north: 'false', south: 'false' } : { north: 'true', south: 'true', east: 'false', west: 'false' });

// ================================================== Ringmauer mit Ecktürmen und Torhaus
const RX0 = 0, RX1 = 46, RZ0 = 0, RZ1 = 44;
for (let x = RX0; x <= RX1; x++) for (let z = RZ0; z <= RZ1; z++) {
  const ring = x <= RX0 + 1 || x >= RX1 - 1 || z <= RZ0 + 1 || z >= RZ1 - 1;
  if (!ring) continue;
  set(x, 0, z, 'cobblestone', 'foundation');
  const aussen = x === RX0 || x === RX1 || z === RZ0 || z === RZ1;
  for (let y = 1; y <= 5; y++) set(x, y, z, mauer(x, y, z), 'wall', null, 3);
  set(x, 6, z, aussen ? 'stone_bricks' : 'stone_brick_slab', 'wall', aussen ? null : { type: 'top' }, 3);
  if (aussen && (x + z) % 2 === 0) set(x, 7, z, 'stone_bricks', 'roof', null, 7);
}
// Tor im Süden mit Bogen und Fallgitter
for (let x = 20; x <= 26; x++) for (let z = RZ1 - 1; z <= RZ1; z++) for (let y = 1; y <= 4; y++) del(x, y, z);
for (let z = RZ1 - 1; z <= RZ1; z++) { set(20, 4, z, 'stone_brick_stairs', 'wall', stair('west', 'top'), 3); set(26, 4, z, 'stone_brick_stairs', 'wall', stair('east', 'top'), 3); }
for (let x = 21; x <= 25; x++) set(x, 5, RZ1 - 1, 'iron_bars', 'door', { east: 'true', west: 'true' }, 5);
// Ecktürme 7×7, hohl, mit Böden, Fenstern, Zinnen und Spitzhelm
function eckturm(cx, cz) {
  const r = 3;
  box(cx - r, 0, cz - r, cx + r, 0, cz + r, (x, y, z) => set(x, y, z, 'cobblestone', 'foundation'));
  for (let y = 1; y <= 13; y++) box(cx - r, y, cz - r, cx + r, y, cz + r, (x, yy, z) => {
    const rand = Math.abs(x - cx) === r || Math.abs(z - cz) === r;
    if (rand) set(x, yy, z, yy === 6 || yy === 11 ? 'polished_andesite' : mauer(x, yy, z), 'wall');
    else if (yy === 6 || yy === 11) set(x, yy, z, 'spruce_planks', 'floor');
    else del(x, yy, z);
  });
  box(cx - r + 1, 1, cz - r + 1, cx + r - 1, 1, cz + r - 1, (x, y, z) => set(x, y, z, 'spruce_planks', 'floor'));
  for (let y = 2; y <= 13; y++) set(cx, y, cz - r + 1, 'ladder', y <= 5 ? 'stairs' : 'stairs', { facing: 'south' });
  for (const y of [3, 4, 8, 9]) { set(cx + r, y, cz, 'glass_pane', 'window', pane('z')); set(cx - r, y, cz, 'glass_pane', 'window', pane('z')); set(cx, y, cz + r, 'glass_pane', 'window', pane('x')); }
  box(cx - r - 1, 14, cz - r - 1, cx + r + 1, 14, cz + r + 1, (x, y, z) => {
    const rand = Math.abs(x - cx) === r + 1 || Math.abs(z - cz) === r + 1;
    set(x, y, z, rand ? 'stone_bricks' : 'spruce_planks', rand ? 'roof' : 'floor');
    if (rand && (x + z) % 2 === 0) set(x, 15, z, 'stone_bricks', 'roof');
  });
  for (let x = cx - r - 1; x <= cx + r + 1; x++) for (const z of [cz - r - 1, cz + r + 1]) set(x, 13, z, 'stone_brick_stairs', 'roof', stair(z < cz ? 'south' : 'north', 'top'));
  for (let z = cz - r; z <= cz + r; z++) for (const x of [cx - r - 1, cx + r + 1]) set(x, 13, z, 'stone_brick_stairs', 'roof', stair(x < cx ? 'east' : 'west', 'top'));
  // Pyramidenhelm
  for (let k = 0; k <= r + 1; k++) {
    const y = 16 + k * 2, rr = r + 1 - k;
    for (let dy = 0; dy < 2; dy++) for (let x = cx - rr; x <= cx + rr; x++) for (let z = cz - rr; z <= cz + rr; z++) {
      if (Math.abs(x - cx) !== rr && Math.abs(z - cz) !== rr) continue;
      if (rr === 0) { set(x, y + dy, z, 'deepslate_tiles', 'roof'); continue; }
      const f = Math.abs(x - cx) >= Math.abs(z - cz) ? (x > cx ? 'west' : 'east') : (z > cz ? 'north' : 'south');
      set(x, y + dy, z, dy === 0 ? 'deepslate_tile_stairs' : 'deepslate_tiles', 'roof', dy === 0 ? stair(f) : null);
    }
  }
  set(cx, 16 + (r + 1) * 2 + 1, cz, 'lightning_rod', 'roof');
  set(cx, 10, cz, 'lantern', 'decoration', { hanging: 'true' });
  set(cx, 5, cz, 'lantern', 'decoration', { hanging: 'true' });
}
eckturm(3, 3); eckturm(43, 3); eckturm(3, 41); eckturm(43, 41);
// Torhaustürme
for (const tx of [17, 29]) {
  box(tx - 2, 0, RZ1 - 4, tx + 2, 0, RZ1, (x, y, z) => set(x, y, z, 'cobblestone', 'foundation'));
  for (let y = 1; y <= 10; y++) box(tx - 2, y, RZ1 - 4, tx + 2, y, RZ1, (x, yy, z) => {
    const rand = Math.abs(x - tx) === 2 || z === RZ1 - 4 || z === RZ1;
    if (rand) set(x, yy, z, yy === 6 ? 'polished_andesite' : mauer(x, yy, z), 'wall'); else del(x, yy, z);
  });
  box(tx - 2, 11, RZ1 - 4, tx + 2, 11, RZ1, (x, y, z) => { set(x, y, z, 'stone_bricks', 'roof'); if ((x + z) % 2 === 0 && (Math.abs(x - tx) === 2 || z === RZ1 - 4 || z === RZ1)) set(x, 12, z, 'stone_bricks', 'roof'); });
  for (const y of [3, 8]) set(tx, y, RZ1, 'glass_pane', 'window', pane('x'));
}
for (let x = 20; x <= 26; x++) for (let z = RZ1 - 4; z <= RZ1; z++) { set(x, 8, z, 'stone_bricks', 'wall'); if (z === RZ1 && x % 2 === 0) set(x, 9, z, 'stone_bricks', 'roof'); }
for (let x = 21; x <= 25; x++) for (let z = RZ1 - 3; z <= RZ1 - 1; z++) for (let y = 5; y <= 7; y++) del(x, y, z);
// Treppe auf den Wehrgang (innen an der Westmauer)
for (let i = 0; i < 5; i++) set(2, 1 + i, 30 - i, 'stone_brick_stairs', 'stairs', stair('north'));

// ================================================== Bergfried (Hauptgebäude)
const KX0 = 14, KX1 = 32, KZ0 = 8, KZ1 = 24;
box(KX0 - 1, 0, KZ0 - 1, KX1 + 1, 0, KZ1 + 1, (x, y, z) => set(x, y, z, x === KX0 - 1 || x === KX1 + 1 || z === KZ0 - 1 || z === KZ1 + 1 ? 'polished_andesite' : 'cobblestone', 'foundation'));
const randK = (x, z) => x === KX0 || x === KX1 || z === KZ0 || z === KZ1;
// Erdgeschoss
box(KX0, 1, KZ0, KX1, 5, KZ1, (x, y, z) => {
  if (randK(x, z)) set(x, y, z, (x === KX0 || x === KX1) && (z === KZ0 || z === KZ1) ? 'polished_andesite' : mauer(x, y, z), 'wall');
  else if (y === 1) set(x, y, z, (x + z) % 7 === 0 ? 'spruce_planks' : 'oak_planks', 'floor');
});
// Obergeschoss
box(KX0, 6, KZ0, KX1, 10, KZ1, (x, y, z) => {
  if (randK(x, z)) set(x, y, z, y === 6 ? 'polished_andesite' : (x === KX0 || x === KX1) && (z === KZ0 || z === KZ1) ? 'polished_andesite' : mauer(x, y, z), 'wall');
  else if (y === 6) set(x, y, z, 'spruce_planks', 'floor');
});
// Dachboden-Boden
box(KX0, 11, KZ0, KX1, 11, KZ1, (x, y, z) => set(x, y, z, randK(x, z) ? 'polished_andesite' : 'dark_oak_planks', randK(x, z) ? 'wall' : 'floor'));
// Fenster
for (const y0 of [3, 8]) for (let x = KX0 + 2; x <= KX1 - 2; x += 3) for (const z of [KZ0, KZ1]) {
  if (z === KZ1 && Math.abs(x - 23) <= 1) continue;
  set(x, y0, z, 'glass_pane', 'window', pane('x')); set(x, y0 + 1, z, 'glass_pane', 'window', pane('x'));
}
for (const y0 of [3, 8]) for (let z = KZ0 + 2; z <= KZ1 - 2; z += 3) for (const x of [KX0, KX1]) {
  if (x === KX0 && y0 === 3 && Math.abs(z - 16) <= 2) continue; // Kamin
  set(x, y0, z, 'glass_pane', 'window', pane('z')); set(x, y0 + 1, z, 'glass_pane', 'window', pane('z'));
}
// Eingangstür (doppelt) mit Treppenstufe davor
for (const [x, hinge] of [[22, 'left'], [23, 'right']]) {
  set(x, 1, KZ1, 'oak_planks', 'floor');
  set(x, 2, KZ1, 'oak_door', 'door', { facing: 'north', half: 'lower', hinge, open: 'false' });
  set(x, 3, KZ1, 'oak_door', 'door', { facing: 'north', half: 'upper', hinge, open: 'false' });
  set(x, 1, KZ1 + 1, 'stone_brick_stairs', 'door', stair('north'), 5);
}
set(24, 4, KZ1 + 1, 'lantern', 'decoration'); set(21, 4, KZ1 + 1, 'lantern', 'decoration');
set(21, 3, KZ1 + 1, 'cobblestone_wall', 'decoration'); set(24, 3, KZ1 + 1, 'cobblestone_wall', 'decoration');
set(21, 2, KZ1 + 1, 'cobblestone_wall', 'decoration'); set(24, 2, KZ1 + 1, 'cobblestone_wall', 'decoration');
// Innenwände EG/OG bei x=24 mit Türen
for (const [y0, y1] of [[2, 5], [7, 10]]) for (let z = KZ0 + 1; z < KZ1; z++) for (let y = y0; y <= y1; y++) {
  if (Math.abs(z - 17) <= 0 && y <= y0 + 1) continue;
  set(24, y, z, 'spruce_planks', 'interior_wall');
}
set(24, 2, 17, 'spruce_door', 'door', { facing: 'east', half: 'lower', hinge: 'left', open: 'false' });
set(24, 3, 17, 'spruce_door', 'door', { facing: 'east', half: 'upper', hinge: 'left', open: 'false' });
set(24, 7, 17, 'spruce_door', 'door', { facing: 'east', half: 'lower', hinge: 'left', open: 'false' });
set(24, 8, 17, 'spruce_door', 'door', { facing: 'east', half: 'upper', hinge: 'left', open: 'false' });
for (const y of [5, 10]) for (let z = KZ0 + 1; z < KZ1; z++) set(24, y, z, 'dark_oak_log', 'interior_wall', { axis: 'z' });
// Treppe ins Obergeschoss (rechter Raum, Nordwand) mit Geländer
for (let i = 0; i < 5; i++) for (const z of [9, 10]) set(26 + i, 2 + i, z, 'oak_stairs', 'stairs', stair('east'), 4);
for (let x = 26; x <= 29; x++) for (const z of [9, 10]) del(x, 6, z);
for (let x = 26; x <= 29; x++) set(x, 7, 11, 'spruce_fence', 'stairs', { north: 'false', south: 'false', east: x < 29 ? 'true' : 'false', west: x > 26 ? 'true' : 'false' });
// Leiter auf den Dachboden
for (let y = 7; y <= 11; y++) set(31, y, 22, 'ladder', 'stairs', { facing: 'north' });

// ================================================== Dach (Satteldach, Firstlinie entlang x)
for (let k = 0; ; k++) {
  const y = 12 + k, zn = KZ0 - 1 + k, zs = KZ1 + 1 - k;
  if (zn > zs) break;
  if (zn === zs) { for (let x = KX0 - 1; x <= KX1 + 1; x++) { set(x, y, zn, 'deepslate_tiles', 'roof'); set(x, y + 1, zn, 'deepslate_tile_slab', 'roof'); } break; }
  for (let x = KX0 - 1; x <= KX1 + 1; x++) {
    set(x, y, zn, hash(x, y, zn) < 0.15 ? 'deepslate_brick_stairs' : 'deepslate_tile_stairs', 'roof', stair('south'));
    set(x, y, zs, hash(x, y, zs) < 0.15 ? 'deepslate_brick_stairs' : 'deepslate_tile_stairs', 'roof', stair('north'));
  }
  for (let z = zn + 1; z < zs; z++) { set(KX0, y, z, mauer(KX0, y, z), 'roof'); set(KX1, y, z, mauer(KX1, y, z), 'roof'); }
}
for (const x of [KX0, KX1]) for (const [dz, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) set(x, 15 + dy, 16 + dz, 'glass_pane', 'window', pane('z'), 7);
// Schornstein
for (let y = 6; y <= 22; y++) for (const z of [15, 16, 17]) if (y > 11 || y >= 6) { if (y >= 12) set(KX0 + 1, y, z, 'bricks', 'roof'); }
set(KX0 + 1, 23, 16, 'campfire', 'roof', { lit: 'true', signal_fire: 'false', facing: 'north' });

// ================================================== Einrichtung
// Rittersaal (EG links): Tafel mit Stühlen, Kamin, Banner, Kronleuchter, Teppich
for (let z = 11; z <= 21; z++) for (let x = 17; x <= 21; x++) if (x === 17 || x === 21 || z === 11 || z === 21) set(x, 2, z, 'red_carpet', 'decoration'); else set(x, 2, z, 'red_carpet', 'decoration');
for (let z = 13; z <= 19; z++) {
  set(19, 2, z, 'dark_oak_slab', 'decoration', { type: 'top' });
  set(18, 2, z, 'spruce_stairs', 'decoration', stair('west'));
  set(20, 2, z, 'spruce_stairs', 'decoration', stair('east'));
  if (z % 2) set(19, 3, z, 'candle', 'decoration', { candles: String(1 + (z % 3)), lit: 'true' });
}
set(19, 2, 20, 'spruce_stairs', 'decoration', stair('south'));
// Kamin an der Westwand
for (let y = 2; y <= 4; y++) { set(KX0 + 1, y, 14, 'bricks', 'decoration'); set(KX0 + 1, y, 18, 'bricks', 'decoration'); }
set(KX0 + 1, 2, 16, 'campfire', 'decoration', { lit: 'true', signal_fire: 'false', facing: 'east' });
set(KX0 + 1, 2, 15, 'bricks', 'decoration'); set(KX0 + 1, 2, 17, 'bricks', 'decoration');
for (let z = 14; z <= 18; z++) { set(KX0 + 1, 5, z, 'bricks', 'decoration'); set(KX0 + 2, 5, z, 'stone_brick_stairs', 'decoration', stair('west', 'top')); }
for (const z of [15, 16, 17]) { set(KX0 + 1, 3, z, z === 16 ? 'bricks' : 'bricks', 'decoration'); set(KX0 + 1, 4, z, 'bricks', 'decoration'); }
del(KX0 + 1, 3, 16);
for (const [z, f] of [[10, 'red_wool'], [22, 'blue_wool']]) for (let y = 3; y <= 5; y++) for (const x of [16, 22]) set(x, y, z === 10 ? KZ0 + 1 : KZ1 - 1, f, 'decoration');
for (let y = 4; y <= 5; y++) set(19, y, 16, 'chain', 'decoration', { axis: 'y' });
set(19, 3, 16, 'lantern', 'decoration', { hanging: 'true' });
// Küche/Vorrat (EG rechts)
for (const [x, z, t, p] of [[31, 12, 'furnace', { facing: 'west', lit: 'true' }], [31, 13, 'furnace', { facing: 'west', lit: 'false' }],
  [31, 14, 'crafting_table'], [31, 15, 'barrel', { facing: 'up', open: 'false' }], [31, 16, 'barrel', { facing: 'up', open: 'false' }],
  [31, 19, 'chest', { facing: 'west', type: 'single' }], [31, 20, 'chest', { facing: 'west', type: 'single' }], [27, 23, 'hay_block', { axis: 'y' }],
  [28, 23, 'hay_block', { axis: 'y' }], [27, 22, 'cauldron'], [30, 23, 'barrel', { facing: 'up', open: 'false' }]]) set(x, 2, z, t, 'decoration', p);
for (let x = 26; x <= 29; x++) set(x, 2, 17, 'oak_slab', 'decoration', { type: 'top' });
set(27, 3, 17, 'flower_pot', 'decoration'); set(29, 3, 17, 'candle', 'decoration', { candles: '2', lit: 'true' });
set(28, 5, 19, 'lantern', 'decoration', { hanging: 'true' }); set(28, 5, 14, 'lantern', 'decoration', { hanging: 'true' });
// Bibliothek (OG links)
for (let x = KX0 + 1; x <= 23; x++) for (let y = 7; y <= 9; y++) { if (x !== 19) set(x, y, KZ0 + 1, 'bookshelf', 'decoration'); }
for (let z = KZ0 + 4; z <= KZ1 - 2; z++) for (let y = 7; y <= 9; y++) if (z % 3 !== 0) set(KX0 + 1, y, z, 'bookshelf', 'decoration');
for (let z = 13; z <= 20; z++) for (let x = 17; x <= 21; x++) set(x, 7, z, 'blue_carpet', 'decoration');
set(19, 7, 16, 'lectern', 'decoration', { facing: 'south', has_book: 'false', powered: 'false' });
for (const z of [13, 19]) { set(18, 7, z, 'dark_oak_slab', 'decoration', { type: 'top' }); set(18, 8, z, 'candle', 'decoration', { candles: '3', lit: 'true' }); set(17, 7, z, 'spruce_stairs', 'decoration', stair('west')); }
set(19, 10, 16, 'lantern', 'decoration', { hanging: 'true' });
// Schlafgemach (OG rechts)
set(30, 7, 20, 'red_bed', 'decoration', { facing: 'south', part: 'head', occupied: 'false' });
set(30, 7, 21, 'red_bed', 'decoration', { facing: 'south', part: 'foot', occupied: 'false' });
set(31, 7, 20, 'chest', 'decoration', { facing: 'west', type: 'single' }); set(29, 7, 20, 'spruce_slab', 'decoration', { type: 'top' });
set(29, 8, 20, 'candle', 'decoration', { candles: '1', lit: 'true' });
for (let x = 26; x <= 29; x++) for (let z = 18; z <= 22; z++) if (!get(x, 7, z)) set(x, 7, z, 'green_carpet', 'decoration');
set(26, 7, 14, 'barrel', 'decoration', { facing: 'up', open: 'false' }); set(26, 8, 14, 'flower_pot', 'decoration');
set(28, 10, 16, 'lantern', 'decoration', { hanging: 'true' });
// Dachboden
for (const [x, z, t] of [[18, 16, 'chest'], [19, 16, 'barrel'], [27, 15, 'hay_block'], [27, 16, 'hay_block'], [28, 16, 'barrel']]) set(x, 12, z, t, 'decoration', t === 'chest' ? { facing: 'south', type: 'single' } : t === 'barrel' ? { facing: 'up', open: 'false' } : { axis: 'y' });
set(23, 15, 16, 'lantern', 'decoration', { hanging: 'true' });

// ================================================== Hof: Pflaster, Weg, Brunnen, Bäume, Laternen, Beete
box(RX0 + 2, 0, RZ0 + 2, RX1 - 2, 0, RZ1 - 2, (x, y, z) => {
  if (get(x, 0, z)) return;
  const weg = Math.abs(x - 23) <= 1 && z > KZ1;
  set(x, 0, z, weg ? 'gravel' : hash(x, 0, z) < 0.12 ? 'coarse_dirt' : 'grass_block', 'floor', null, 2);
});
for (let z = KZ1 + 2; z <= RZ1 - 2; z++) for (let x = 22; x <= 24; x++) set(x, 0, z, x === 23 ? 'gravel' : 'cobblestone', 'floor', null, 2);
for (let z = KZ1 + 4; z <= RZ1 - 3; z += 5) for (const x of [20, 26]) {
  set(x, 1, z, 'cobblestone_wall', 'decoration'); set(x, 2, z, 'cobblestone_wall', 'decoration'); set(x, 3, z, 'lantern', 'decoration');
}
// Brunnen
const BX = 35, BZ = 34;
box(BX - 2, 1, BZ - 2, BX + 2, 1, BZ + 2, (x, y, z) => set(x, y, z, Math.abs(x - BX) === 2 || Math.abs(z - BZ) === 2 ? 'stone_bricks' : 'water', 'decoration'));
box(BX - 1, 0, BZ - 1, BX + 1, 0, BZ + 1, (x, y, z) => set(x, y, z, 'cobblestone', 'decoration'));
for (const [x, z] of [[BX - 2, BZ - 2], [BX + 2, BZ - 2], [BX - 2, BZ + 2], [BX + 2, BZ + 2]]) for (let y = 2; y <= 3; y++) set(x, y, z, 'spruce_fence', 'decoration');
box(BX - 2, 4, BZ - 2, BX + 2, 4, BZ + 2, (x, y, z) => set(x, y, z, 'spruce_slab', 'decoration'));
set(BX, 3, BZ, 'lantern', 'decoration', { hanging: 'true' });
// Bäume
function baum(x, z, h) {
  for (let y = 1; y <= h; y++) set(x, y, z, 'oak_log', 'decoration', { axis: 'y' });
  for (let dy = -2; dy <= 2; dy++) for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
    const d = dx * dx + dy * dy * 1.5 + dz * dz;
    if (d <= 8 + hash(x + dx, dy, z + dz) * 3 && !get(x + dx, h + dy, z + dz)) set(x + dx, h + dy, z + dz, 'oak_leaves', 'decoration', { persistent: 'true', distance: '1' });
  }
}
baum(8, 30, 5); baum(38, 16, 6); baum(9, 14, 5);
// Blumenbeete am Bergfried
const blumen = ['poppy', 'dandelion', 'cornflower', 'allium', 'azure_bluet', 'oxeye_daisy'];
for (let x = KX0; x <= KX1; x++) if (Math.abs(x - 23) > 2) set(x, 1, KZ1 + 2, blumen[Math.floor(hash(x, 1, 9) * blumen.length)], 'decoration');
// Marktstand
for (const [x, z] of [[8, 38], [12, 38], [8, 41], [12, 41]]) for (let y = 1; y <= 3; y++) set(x, y, z === 41 ? 40 : z, 'spruce_fence', 'decoration');
box(7, 4, 37, 13, 4, 41, (x, y, z) => set(x, y, z, (x + z) % 2 ? 'red_wool' : 'white_wool', 'decoration'));
for (let x = 9; x <= 11; x++) set(x, 1, 38, 'barrel', 'decoration', { facing: 'up', open: 'false' });
set(10, 2, 38, 'pumpkin', 'decoration');

const blocks = [...map.values()].sort((a, b) => a.y - b.y || a.z - b.z || a.x - b.x);
const projekt = {
  format: 'mc-builder',
  version: 1,
  name: 'Beispielburg',
  description: 'Eingerichtete Burg mit Bergfried, Ringmauer, vier Ecktürmen, Torhaus, Rittersaal, Küche, Bibliothek, Schlafgemach und Hof.',
  minecraftVersion: '26.3',
  steps: STEPS,
  floors: FLOORS,
  blocks
};
const ziel = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'demoCastle.json');
const zeilen = blocks.map((b) => '    ' + JSON.stringify(b));
const kopf = JSON.stringify({ ...projekt, blocks: undefined }, null, 2);
writeFileSync(ziel, kopf.slice(0, -2) + ',\n  "blocks": [\n' + zeilen.join(',\n') + '\n  ]\n}\n');
const proSchritt = STEPS.map((s) => `${s.id}:${blocks.filter((b) => b.step === s.id).length}`).join(' ');
console.log(`demoCastle.json: ${blocks.length} Blöcke · ${proSchritt}`);
