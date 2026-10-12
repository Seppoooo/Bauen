#!/usr/bin/env node
/*
 * Erzeugt die .litematic-Dateien (Litematica-Schematics) für alle Bauwerke.
 * Aufruf:  node tools/erzeuge-litematic.js
 * Ergebnis: schematics/*.litematic
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { BAUWERKE, TEILE, block, bauhilfe } = require('../js/modell.js');

const DATA_VERSION = 4325; // Minecraft 1.21.5 (Tuff-, Harzziegel, Laubstreu, Wildblumen …) – Litematica in 26.3 konvertiert automatisch hoch

/* ---------- minimaler NBT-Schreiber ---------- */
const T = { end: 0, byte: 1, short: 2, int: 3, long: 4, string: 8, list: 9, compound: 10, longArray: 12 };
const nbt = {
  int: (v) => ({ t: T.int, v }),
  long: (v) => ({ t: T.long, v: BigInt(v) }),
  str: (v) => ({ t: T.string, v }),
  list: (typ, v) => ({ t: T.list, typ, v }),
  comp: (v) => ({ t: T.compound, v }),
  longArr: (v) => ({ t: T.longArray, v })
};

class Puffer {
  constructor() { this.teile = []; }
  u8(n) { const b = Buffer.alloc(1); b.writeUInt8(n); this.teile.push(b); }
  i16(n) { const b = Buffer.alloc(2); b.writeInt16BE(n); this.teile.push(b); }
  i32(n) { const b = Buffer.alloc(4); b.writeInt32BE(n); this.teile.push(b); }
  i64(n) { const b = Buffer.alloc(8); b.writeBigInt64BE(BigInt.asIntN(64, n)); this.teile.push(b); }
  str(s) { const b = Buffer.from(s, 'utf8'); this.i16(b.length); this.teile.push(b); }
  roh(b) { this.teile.push(b); }
  fertig() { return Buffer.concat(this.teile); }
}

function nutzlast(p, tag) {
  switch (tag.t) {
    case T.int: p.i32(tag.v); break;
    case T.long: p.i64(tag.v); break;
    case T.string: p.str(tag.v); break;
    case T.list:
      p.u8(tag.v.length ? tag.typ : T.end); p.i32(tag.v.length);
      for (const e of tag.v) nutzlast(p, e);
      break;
    case T.compound:
      for (const [name, wert] of Object.entries(tag.v)) { p.u8(wert.t); p.str(name); nutzlast(p, wert); }
      p.u8(T.end);
      break;
    case T.longArray: {
      p.i32(tag.v.length);
      const b = Buffer.alloc(tag.v.length * 8);
      for (let i = 0; i < tag.v.length; i++) b.writeBigUInt64BE(tag.v[i], i * 8);
      p.roh(b);
      break;
    }
    default: throw new Error('NBT-Typ fehlt: ' + tag.t);
  }
}

function schreibeNbt(wurzel) {
  const p = new Puffer();
  p.u8(T.compound); p.str(''); nutzlast(p, wurzel);
  return zlib.gzipSync(p.fertig());
}

/* ---------- Litematica-Format ---------- */
function packeBloecke(m) {
  // Palette: Index 0 = Luft (Litematica-Konvention); Modell-Schlüssel -> Palettenindex über Blockzustand
  const palette = [];
  const zustandIndex = new Map();
  const modellZuPalette = new Uint16Array(m.keys.length);
  m.keys.forEach((key, i) => {
    const b = block(key);
    const props = Object.keys(b.props).sort().map((k) => k + '=' + b.props[k]).join(',');
    const zustand = b.id + '[' + props + ']';
    if (!zustandIndex.has(zustand)) { zustandIndex.set(zustand, palette.length); palette.push(b); }
    modellZuPalette[i] = zustandIndex.get(zustand);
  });
  const bits = Math.max(2, Math.ceil(Math.log2(palette.length)));
  const volumen = m.sx * m.sy * m.sz;
  const longs = new BigUint64Array(Math.ceil(volumen * bits / 64));
  for (let i = 0; i < volumen; i++) {
    const wert = modellZuPalette[m.daten[i]];
    if (!wert) continue;
    const startBit = i * bits, li = Math.floor(startBit / 64), off = startBit % 64;
    const v = BigInt(wert);
    longs[li] |= v << BigInt(off);
    if (off + bits > 64) longs[li + 1] |= v >> BigInt(64 - off);
  }
  return { palette, longs };
}

const groesse = (x, y, z) => nbt.comp({ x: nbt.int(x), y: nbt.int(y), z: nbt.int(z) });

function region(m, pos) {
  const { palette, longs } = packeBloecke(m);
  const paletteNbt = palette.map((b) => {
    const e = { Name: nbt.str(b.id) };
    const keys = Object.keys(b.props);
    if (keys.length) e.Properties = nbt.comp(Object.fromEntries(keys.map((k) => [k, nbt.str(b.props[k])])));
    return nbt.comp(e);
  });
  return nbt.comp({
    Position: groesse(pos[0], pos[1], pos[2]),
    Size: groesse(m.sx, m.sy, m.sz),
    BlockStatePalette: nbt.list(T.compound, paletteNbt),
    BlockStates: nbt.longArr(longs),
    TileEntities: nbt.list(T.compound, []),
    Entities: nbt.list(T.compound, []),
    PendingBlockTicks: nbt.list(T.compound, []),
    PendingFluidTicks: nbt.list(T.compound, [])
  });
}

// teile: [{ name, modell, pos }]
function litematic(name, beschreibung, teile) {
  const jetzt = Date.now();
  let gx = 0, gy = 0, gz = 0, bloecke = 0, volumen = 0;
  const regionen = {};
  for (const t of teile) {
    const m = t.modell;
    gx = Math.max(gx, t.pos[0] + m.sx); gy = Math.max(gy, t.pos[1] + m.sy); gz = Math.max(gz, t.pos[2] + m.sz);
    bloecke += m.bloeckeGesamt(); volumen += m.sx * m.sy * m.sz;
    regionen[t.name] = region(m, t.pos);
  }
  return nbt.comp({
    MinecraftDataVersion: nbt.int(DATA_VERSION),
    Version: nbt.int(6),
    SubVersion: nbt.int(1),
    Metadata: nbt.comp({
      Name: nbt.str(name),
      Author: nbt.str('Bauen – Hogwarts Bauplan'),
      Description: nbt.str(beschreibung),
      RegionCount: nbt.int(teile.length),
      TotalBlocks: nbt.int(bloecke),
      TotalVolume: nbt.int(volumen),
      TimeCreated: nbt.long(jetzt),
      TimeModified: nbt.long(jetzt),
      EnclosingSize: groesse(gx, gy, gz)
    }),
    Regions: nbt.comp(regionen)
  });
}

if (require.main === module) {
  const ziel = path.join(__dirname, '..', 'schematics');
  fs.mkdirSync(ziel, { recursive: true });
  const teile = [];
  for (const b of BAUWERKE) {
    // Berg als Bauversion: ohne Wasser, mit Platzhaltern und Grasrahmen (siehe bauhilfe in js/modell.js)
    const m = b.id === 'berg' ? bauhilfe(b.erstelle()) : b.erstelle();
    teile.push({ name: b.titel, modell: m, pos: b.lage });
    const daten = schreibeNbt(litematic('Hogwarts – ' + b.titel, b.text, [{ name: b.titel, modell: m, pos: [0, 0, 0] }]));
    fs.writeFileSync(path.join(ziel, b.datei), daten);
    console.log(`${b.datei.padEnd(36)} ${m.sx}×${m.sy}×${m.sz}  ${m.bloeckeGesamt()} Blöcke  ${(daten.length / 1024).toFixed(0)} KB`);
  }
  const berg = teile.find((t) => t.name === BAUWERKE.find((b) => b.id === 'berg').titel).modell;
  for (const t of TEILE) {
    const m = t.erstelle(berg);
    const daten = schreibeNbt(litematic('Hogwarts – ' + t.titel, t.text, [{ name: t.titel, modell: m, pos: [0, 0, 0] }]));
    fs.writeFileSync(path.join(ziel, t.datei), daten);
    console.log(`${t.datei.padEnd(36)} ${m.sx}×${m.sy}×${m.sz}  ${m.bloeckeGesamt()} Blöcke  ${(daten.length / 1024).toFixed(0)} KB`);
  }
  const gesamt = schreibeNbt(litematic('Hogwarts – Gesamtprojekt',
    'Berg, Hauptschloss, Viadukt, Hagrids Hütte, Gewächshäuser und Quidditch-Feld an ihrer richtigen Lage (500 × 500 Blöcke).', teile));
  fs.writeFileSync(path.join(ziel, 'hogwarts-gesamt.litematic'), gesamt);
  console.log(`${'hogwarts-gesamt.litematic'.padEnd(36)} ${teile.length} Regionen  ${(gesamt.length / 1024).toFixed(0)} KB`);
}

module.exports = { litematic, schreibeNbt };
