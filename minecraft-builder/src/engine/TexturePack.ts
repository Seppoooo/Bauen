/**
 * Originale Minecraft-Texturen aus der eigenen Minecraft-Installation laden.
 *
 * Man wählt die Spiel-Datei (z. B. .minecraft/versions/26.3/26.3.jar) oder ein Ressourcenpaket (.zip).
 * Gelesen werden nur assets/minecraft/textures/block/*.png – direkt im Browser, nichts wird hochgeladen.
 * Die Bilddaten werden in IndexedDB gespeichert, damit sie beim nächsten Besuch wieder da sind.
 */

const PFAD = /^assets\/minecraft\/textures\/block\/([a-z0-9_]+)\.png$/;

/** Unsere Texturnamen → Dateinamen im Spiel (wenn sie abweichen) */
const ALIAS: Record<string, string[]> = {
  water: ['water_still'],
  chain: ['iron_chain', 'chain'],
  crafting_table: ['crafting_table_front'],
  hay_block: ['hay_block_side'],
  pumpkin: ['pumpkin_side'],
  furnace: ['furnace_front'],
  lectern: ['lectern_sides'],
  campfire: ['campfire_log'],
  cauldron: ['cauldron_side'],
  oak_door: ['oak_door_bottom'],
  spruce_door: ['spruce_door_bottom'],
  dark_oak_door: ['dark_oak_door_bottom'],
  barrel: ['barrel_side'],
  smooth_stone_slab: ['smooth_stone_slab_side', 'smooth_stone']
};

/** Biom-Einfärbung (Ebene/Plains) für graue Originaltexturen */
const TINT: Record<string, [number, number, number]> = {
  grass_block_top: [145, 189, 89], grass_block_side_overlay: [145, 189, 89], short_grass: [145, 189, 89], fern: [145, 189, 89],
  tall_grass_top: [145, 189, 89], tall_grass_bottom: [145, 189, 89], sugar_cane: [145, 189, 89], vine: [119, 171, 47],
  oak_leaves: [119, 171, 47], dark_oak_leaves: [119, 171, 47], jungle_leaves: [119, 171, 47], acacia_leaves: [119, 171, 47], mangrove_leaves: [146, 193, 98],
  spruce_leaves: [97, 153, 97], birch_leaves: [128, 167, 85], lily_pad: [32, 128, 48], water_still: [63, 118, 228]
};

let dateien: Map<string, Uint8Array> | null = null;
const bilder = new Map<string, Promise<HTMLCanvasElement | null>>();

// ------------------------------------------------------------------ ZIP lesen (Jar = ZIP)

async function inflate(daten: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([daten]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function leseZip(buf: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const dv = new DataView(buf), u8 = new Uint8Array(buf), dec = new TextDecoder();
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 70000); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Das ist keine .jar- oder .zip-Datei.');
  const anzahl = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const out = new Map<string, Uint8Array>();
  for (let n = 0; n < anzahl; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const methode = dv.getUint16(p + 10, true);
    const groesse = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), kommentarLen = dv.getUint16(p + 32, true);
    const lokal = dv.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + kommentarLen;
    const m = name.match(PFAD);
    if (!m) continue;
    const start = lokal + 30 + dv.getUint16(lokal + 26, true) + dv.getUint16(lokal + 28, true);
    const roh = u8.slice(start, start + groesse);
    try {
      out.set(m[1], methode === 8 ? await inflate(roh) : roh);
    } catch {
      /* einzelne kaputte Datei überspringen */
    }
  }
  return out;
}

// ------------------------------------------------------------------ Speichern (IndexedDB)

function db(): Promise<IDBDatabase> {
  return new Promise((ok, fehler) => {
    const r = indexedDB.open('mc-builder-texturen', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('pack');
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fehler(r.error);
  });
}

async function speichere(m: Map<string, Uint8Array>, name: string): Promise<void> {
  try {
    const d = await db();
    await new Promise<void>((ok, fehler) => {
      const t = d.transaction('pack', 'readwrite');
      t.objectStore('pack').put({ name, dateien: [...m.entries()] }, 'aktuell');
      t.oncomplete = () => ok();
      t.onerror = () => fehler(t.error);
    });
  } catch { /* ohne Speicher geht es trotzdem bis zum Neuladen */ }
}

export async function loadStoredPack(): Promise<string | null> {
  try {
    const d = await db();
    const wert = await new Promise<{ name: string; dateien: [string, Uint8Array][] } | undefined>((ok) => {
      const r = d.transaction('pack', 'readonly').objectStore('pack').get('aktuell');
      r.onsuccess = () => ok(r.result as never);
      r.onerror = () => ok(undefined);
    });
    if (!wert) return null;
    dateien = new Map(wert.dateien);
    bilder.clear();
    return wert.name;
  } catch {
    return null;
  }
}

export async function clearPack(): Promise<void> {
  dateien = null;
  bilder.clear();
  try {
    const d = await db();
    d.transaction('pack', 'readwrite').objectStore('pack').delete('aktuell');
  } catch { /* egal */ }
}

/** Lädt die Texturen aus einer .jar/.zip. Rückgabe: Anzahl gefundener Blocktexturen */
export async function loadPackFile(file: File): Promise<number> {
  const m = await leseZip(await file.arrayBuffer());
  if (!m.size) throw new Error('In dieser Datei sind keine Blocktexturen (assets/minecraft/textures/block).');
  dateien = m;
  bilder.clear();
  await speichere(m, file.name);
  return m.size;
}

export const hasPack = () => dateien !== null;

// ------------------------------------------------------------------ Bild aufbereiten

async function bitmap(name: string): Promise<ImageBitmap | null> {
  const d = dateien?.get(name);
  if (!d) return null;
  try { return await createImageBitmap(new Blob([d], { type: 'image/png' })); } catch { return null; }
}

function einfaerben(g: CanvasRenderingContext2D, w: number, h: number, t: [number, number, number]) {
  const img = g.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = (img.data[i] * t[0]) / 255;
    img.data[i + 1] = (img.data[i + 1] * t[1]) / 255;
    img.data[i + 2] = (img.data[i + 2] * t[2]) / 255;
  }
  g.putImageData(img, 0, 0);
}

async function baue(unserName: string): Promise<HTMLCanvasElement | null> {
  if (!dateien) return null;
  const kandidaten = [...(ALIAS[unserName] ?? []), unserName];
  const name = kandidaten.find((k) => dateien!.has(k));
  if (!name) return null;
  const bmp = await bitmap(name);
  if (!bmp) return null;
  const w = bmp.width; // animierte Texturen sind hohe Streifen → nur das erste Bild nehmen
  const c = document.createElement('canvas');
  c.width = w; c.height = w;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(bmp, 0, 0, w, w, 0, 0, w, w);
  if (TINT[name]) einfaerben(g, w, w, TINT[name]);
  if (name === 'grass_block_side') {
    const ov = await bitmap('grass_block_side_overlay');
    if (ov) {
      const o = document.createElement('canvas');
      o.width = w; o.height = w;
      const og = o.getContext('2d', { willReadFrequently: true })!;
      og.drawImage(ov, 0, 0, w, w);
      einfaerben(og, w, w, TINT.grass_block_side_overlay);
      g.drawImage(o, 0, 0);
    }
  }
  return c;
}

/** Fertig aufbereitetes Originalbild für einen Texturnamen, oder null */
export function packImage(name: string): Promise<HTMLCanvasElement | null> {
  if (!dateien) return Promise.resolve(null);
  let p = bilder.get(name);
  if (!p) { p = baue(name); bilder.set(name, p); }
  return p;
}

/** Durchschnittsfarbe eines Bildes (für Materialliste, 2D-Plan und Minikarte) */
export function mittelfarbe(c: HTMLCanvasElement): string | null {
  const g = c.getContext('2d', { willReadFrequently: true })!;
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let r = 0, gr = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128) { r += d[i]; gr += d[i + 1]; b += d[i + 2]; n++; }
  if (!n) return null;
  const hex = (v: number) => Math.round(v / n).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(gr)}${hex(b)}`;
}
