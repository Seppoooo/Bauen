import type { BlockData, BuildProject, PartCategory } from '../builder/BuildProject';
import { normalizeProject, PART_ORDER } from '../builder/BuildProject';
import { autoClassify, type RawBlock } from './AutoClassify';
import { gunzip, readNbt, type NbtCompound, type NbtValue } from './Nbt';
import { readBinaryProject } from './BinaryProject';

/**
 * Laden und Speichern von Projekten.
 *
 * Unterstützt:
 * - JSON im ausführlichen Format (eine Zeile pro Block, siehe README)
 * - JSON im kompakten Format (Palette + Zahlenlisten, für große Bauwerke)
 * - Litematica-Schematics (.litematic)
 * - Sponge-Schematics (.schem, Version 2 und 3, z. B. von WorldEdit)
 */

interface CompactProject {
  format: 'mc-builder-compact';
  version: 1;
  name: string;
  description?: string;
  minecraftVersion?: string;
  steps: BuildProject['steps'];
  floors: BuildProject['floors'];
  palette: { type: string; props?: Record<string, string> }[];
  parts: PartCategory[];
  /** je Block: x, y, z, Palettenindex, Stockwerk, Bauphase, Bauteilindex */
  data: number[];
}

export function toCompact(p: BuildProject): CompactProject {
  const palette: CompactProject['palette'] = [];
  const pIndex = new Map<string, number>();
  const data: number[] = [];
  for (const b of p.blocks) {
    const key = b.type + (b.props ? JSON.stringify(b.props) : '');
    let i = pIndex.get(key);
    if (i === undefined) { i = palette.length; pIndex.set(key, i); palette.push(b.props ? { type: b.type, props: b.props } : { type: b.type }); }
    data.push(b.x, b.y, b.z, i, b.floor, b.step, PART_ORDER.indexOf(b.part));
  }
  return { format: 'mc-builder-compact', version: 1, name: p.name, description: p.description, minecraftVersion: p.minecraftVersion, steps: p.steps, floors: p.floors, palette, parts: PART_ORDER, data };
}

function fromCompact(c: CompactProject): BuildProject {
  const blocks: BlockData[] = [];
  for (let i = 0; i < c.data.length; i += 7) {
    const pal = c.palette[c.data[i + 3]];
    blocks.push({ x: c.data[i], y: c.data[i + 1], z: c.data[i + 2], type: pal.type, props: pal.props, floor: c.data[i + 4], step: c.data[i + 5], part: c.parts[c.data[i + 6]] ?? 'other' });
  }
  return normalizeProject({ name: c.name, description: c.description, minecraftVersion: c.minecraftVersion, steps: c.steps, floors: c.floors, blocks });
}

/** Lädt ein Projekt aus JSON-Daten (ausführlich oder kompakt). */
export function projectFromJson(data: unknown): BuildProject {
  if (data && typeof data === 'object' && (data as { format?: string }).format === 'mc-builder-compact') return fromCompact(data as CompactProject);
  return normalizeProject(data);
}

/** Exportiert als JSON-Text. Ab 20.000 Blöcken automatisch kompakt. */
export function exportJson(p: BuildProject, kompakt = p.blocks.length > 20000): string {
  if (kompakt) return JSON.stringify(toCompact(p));
  const zeilen = p.blocks.map((b) => '    ' + JSON.stringify(b));
  const kopf = { format: p.format, version: p.version, name: p.name, description: p.description, minecraftVersion: p.minecraftVersion, steps: p.steps, floors: p.floors };
  const json = JSON.stringify(kopf, null, 2);
  return json.slice(0, -2) + ',\n  "blocks": [\n' + zeilen.join(',\n') + '\n  ]\n}\n';
}

/** Lädt eine Datei, egal ob JSON oder Schematic. */
export async function importFile(file: File): Promise<BuildProject> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.json')) return projectFromJson(JSON.parse(await file.text()));
  if (name.endsWith('.mcbp') || name.endsWith('.mcbp.gz')) return readBinaryProject(await file.arrayBuffer());
  const nbt = readNbt(await gunzip(await file.arrayBuffer()));
  const titel = file.name.replace(/\.[^.]+$/, '');
  let raw: RawBlock[];
  if (name.endsWith('.litematic')) raw = readLitematic(nbt);
  else if (name.endsWith('.schem')) raw = readSponge(nbt);
  else throw new Error('Unbekanntes Dateiformat. Erlaubt sind .json, .mcbp, .litematic und .schem.');
  return schematicToProject(titel, raw);
}

export function schematicToProject(name: string, raw: RawBlock[]): BuildProject {
  const { blocks, floors, steps } = autoClassify(raw);
  const benutzt = new Set(blocks.map((b) => b.step));
  return normalizeProject({ name, minecraftVersion: '26.3', steps: steps.filter((s) => benutzt.has(s.id)), floors, blocks });
}

// ------------------------------------------------------------------ Schematic-Leser

function blockState(e: NbtCompound): { type: string; props?: Record<string, string> } {
  const type = String(e.Name).replace(/^minecraft:/, '');
  const p = e.Properties as Record<string, NbtValue> | undefined;
  if (!p) return { type };
  const props: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) if (k !== 'waterlogged') props[k] = String(v);
  return { type, props };
}

const IGNORIERT = new Set(['air', 'cave_air', 'void_air', 'structure_void']);

/** Litematica: mehrere Regionen, Blockzustände als dicht gepackte Bitfolge in Long-Werten */
export function readLitematic(nbt: NbtCompound): RawBlock[] {
  const regions = nbt.Regions as Record<string, NbtCompound>;
  if (!regions) throw new Error('Keine Regionen in der Litematica-Datei gefunden.');
  const out: RawBlock[] = [];
  for (const reg of Object.values(regions)) {
    const pos = reg.Position as Record<string, number>, size = reg.Size as Record<string, number>;
    const sx = Math.abs(size.x), sy = Math.abs(size.y), sz = Math.abs(size.z);
    const ox = pos.x + Math.min(0, size.x + 1), oy = pos.y + Math.min(0, size.y + 1), oz = pos.z + Math.min(0, size.z + 1);
    const palette = (reg.BlockStatePalette as NbtCompound[]).map(blockState);
    const longs = reg.BlockStates as BigInt64Array;
    const bits = Math.max(2, Math.ceil(Math.log2(palette.length)));
    const maske = (1n << BigInt(bits)) - 1n;
    const anzahl = sx * sy * sz;
    for (let i = 0; i < anzahl; i++) {
      const start = i * bits, li = Math.floor(start / 64), off = start % 64;
      let v = BigInt.asUintN(64, longs[li]) >> BigInt(off);
      if (off + bits > 64) v |= BigInt.asUintN(64, longs[li + 1]) << BigInt(64 - off);
      const st = palette[Number(v & maske)];
      if (!st || IGNORIERT.has(st.type)) continue;
      const x = i % sx, z = Math.floor(i / sx) % sz, y = Math.floor(i / (sx * sz));
      out.push({ x: ox + x, y: oy + y, z: oz + z, type: st.type, props: st.props });
    }
  }
  return normalisiereUrsprung(out);
}

/** Sponge-Schematic (.schem): Palette Name→Index, Blockdaten als VarInt-Folge */
export function readSponge(nbt: NbtCompound): RawBlock[] {
  const wurzel = (nbt.Schematic as NbtCompound) ?? nbt; // Version 3 verschachtelt alles unter "Schematic"
  const w = Number(wurzel.Width), l = Number(wurzel.Length);
  const bloecke = (wurzel.Blocks as NbtCompound) ?? wurzel;
  const pal = bloecke.Palette as Record<string, number>;
  const daten = (bloecke.Data ?? wurzel.BlockData) as Int8Array;
  if (!pal || !daten) throw new Error('Diese .schem-Datei hat keine Blockpalette.');
  const namen: { type: string; props?: Record<string, string> }[] = [];
  for (const [zustand, idx] of Object.entries(pal)) {
    const m = zustand.match(/^(?:minecraft:)?([^[]+)(?:\[(.*)\])?$/);
    if (!m) continue;
    const props: Record<string, string> = {};
    if (m[2]) for (const teil of m[2].split(',')) { const [k, v] = teil.split('='); if (k !== 'waterlogged') props[k] = v; }
    namen[idx] = { type: m[1], props: m[2] ? props : undefined };
  }
  const out: RawBlock[] = [];
  let i = 0, p = 0;
  while (p < daten.length) {
    let wert = 0, verschiebung = 0, byte: number;
    do { byte = daten[p++] & 0xff; wert |= (byte & 0x7f) << verschiebung; verschiebung += 7; } while (byte & 0x80);
    const st = namen[wert];
    if (st && !IGNORIERT.has(st.type)) {
      const x = i % w, z = Math.floor(i / w) % l, y = Math.floor(i / (w * l));
      out.push({ x, y, z, type: st.type, props: st.props });
    }
    i++;
  }
  return normalisiereUrsprung(out);
}

function normalisiereUrsprung(bl: RawBlock[]): RawBlock[] {
  if (!bl.length) return bl;
  let mx = Infinity, my = Infinity, mz = Infinity;
  for (const b of bl) { if (b.x < mx) mx = b.x; if (b.y < my) my = b.y; if (b.z < mz) mz = b.z; }
  return bl.map((b) => ({ ...b, x: b.x - mx, y: b.y - my, z: b.z - mz }));
}
