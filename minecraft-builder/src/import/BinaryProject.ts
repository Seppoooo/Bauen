import type { BlockData, BuildProject, PartCategory } from '../builder/BuildProject';
import { normalizeProject } from '../builder/BuildProject';
import { gunzip } from './Nbt';

/**
 * Binärformat für große Baupläne (.mcbp, gzip-komprimiert) – Hogwarts mit Berg hat über eine Million Blöcke.
 *
 * Aufbau (Little Endian):
 *   "MCBP1\n"  · uint32 Länge des Kopfes · Kopf als JSON (Name, Etappen, Stockwerke, Palette, Bauteile, Anzahl)
 *   int16 x[n] · int16 y[n] · int16 z[n] · uint16 palette[n] · uint8 floor[n] · uint8 step[n] · uint8 part[n]
 */

interface Kopf {
  name: string;
  description?: string;
  author?: string;
  minecraftVersion?: string;
  steps: BuildProject['steps'];
  floors: BuildProject['floors'];
  palette: { type: string; props?: Record<string, string> }[];
  parts: PartCategory[];
  count: number;
}

export async function readBinaryProject(data: ArrayBuffer): Promise<BuildProject> {
  const buf = await gunzip(data);
  const bytes = new Uint8Array(buf);
  const magic = new TextDecoder().decode(bytes.subarray(0, 6));
  if (magic !== 'MCBP1\n') throw new Error('Keine gültige .mcbp-Datei.');
  const dv = new DataView(buf);
  const kopfLaenge = dv.getUint32(6, true);
  const kopf = JSON.parse(new TextDecoder().decode(bytes.subarray(10, 10 + kopfLaenge))) as Kopf;
  const n = kopf.count;
  let o = 10 + kopfLaenge;
  const lies16 = (signed: boolean) => {
    const a = signed ? new Int16Array(n) : new Uint16Array(n);
    for (let i = 0; i < n; i++, o += 2) a[i] = signed ? dv.getInt16(o, true) : dv.getUint16(o, true);
    return a;
  };
  const x = lies16(true), y = lies16(true), z = lies16(true), pal = lies16(false);
  const floor = bytes.slice(o, o + n); o += n;
  const step = bytes.slice(o, o + n); o += n;
  const part = bytes.slice(o, o + n);
  // Paletten-Einträge teilen sich ein props-Objekt → spart Speicher bei Millionen Blöcken
  const blocks: BlockData[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const p = kopf.palette[pal[i]];
    blocks[i] = { x: x[i], y: y[i], z: z[i], type: p.type, props: p.props, floor: floor[i], step: step[i], part: kopf.parts[part[i]] ?? 'other' };
  }
  const projekt = normalizeProject({ name: kopf.name, description: kopf.description, author: kopf.author, minecraftVersion: kopf.minecraftVersion, steps: kopf.steps, floors: kopf.floors, blocks: [] });
  projekt.blocks = blocks; // bereits gültig – nicht noch einmal einzeln prüfen
  return projekt;
}

export async function fetchBinaryProject(url: string): Promise<BuildProject> {
  const antwort = await fetch(url);
  if (!antwort.ok) throw new Error(`${url} nicht gefunden (${antwort.status})`);
  return readBinaryProject(await antwort.arrayBuffer());
}
