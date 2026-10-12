import * as THREE from 'three';
import { blockInfo, allBlockInfos } from './BlockTypes';
import { hasPack, mittelfarbe, packImage } from './TexturePack';

/**
 * Texturen im Minecraft-Stil (16 × 16 Pixel), prozedural gemalt.
 * Eigene PNGs aus public/textures/blocks/ (Liste in textures.json) ersetzen die gemalten Texturen.
 */

const K = 16;
type Px = (x: number, y: number, rgb: number[], f?: number, a?: number) => void;

function rgb(hex: string): number[] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function zufall(seed: string) {
  let s = 0;
  for (const c of seed) s = (Math.imul(s, 31) + c.charCodeAt(0)) | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Relief für Ziegel und Fliesen: Kanten oben/links hell, unten/rechts dunkel */
function relief(feld: (x: number, y: number) => number) {
  return (x: number, y: number) => {
    const id = feld(x, y);
    if (id < 0) return 0.6;
    if (feld(x, y - 1) !== id || feld(x - 1, y) !== id) return 1.16;
    if (feld(x, y + 1) !== id || feld(x + 1, y) !== id) return 0.8;
    return 1;
  };
}
const aussen = (x: number, y: number) => x < 0 || y < 0 || x > 15 || y > 15;

function male(name: string, px: Px, r: () => number): void {
  const basis = name.replace(/_top$|_side$/, '');
  const c = rgb(blockInfo(basis).color);
  const flaeche = (farbe: number[], s: number) => { for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) px(x, y, farbe, 1 - s + r() * s * 2); };

  if (/stone_bricks|deepslate_bricks|^bricks$/.test(name)) {
    const moos = name.includes('mossy'), riss = name.includes('cracked'), meissel = name.includes('chiseled');
    const feld = (x: number, y: number) => aussen(x, y) ? -2 : (y % 8 === 7 || (y < 8 ? x === 15 : x === 7)) ? -1 : (y < 8 ? 0 : x < 7 ? 1 : 2);
    const rf = relief(feld);
    for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) {
      let f = rf(x, y) * (0.93 + r() * 0.12), farbe = c;
      if (moos && r() < 0.24 + (y > 10 ? 0.15 : 0)) farbe = [86, 116, 58];
      if (riss && feld(x, y) >= 0 && ((x + y * 2) % 13 === 0 || (x * 3 + y) % 17 === 0)) f = 0.5;
      if (meissel) f = (x < 2 || y < 2 ? 1.12 : x > 13 || y > 13 ? 0.8 : Math.abs(Math.hypot(x - 7.5, y - 7.5) - 4.5) < 1 ? 0.7 : 1) * (0.95 + r() * 0.08);
      px(x, y, farbe, f);
    }
    return;
  }
  if (name.includes('cobblestone')) {
    const p = Array.from({ length: 8 }, () => [r() * K, r() * K]);
    for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) {
      const d = p.map(([a, b]) => Math.hypot(a - x, b - y)).sort((a, b) => a - b);
      const moos = name.includes('mossy') && r() < 0.3;
      px(x, y, moos ? [85, 112, 60] : c, d[1] - d[0] < 1.3 ? 0.6 : 0.9 + r() * 0.22 + (d[0] < 1.5 ? 0.08 : 0));
    }
    return;
  }
  if (name.includes('deepslate_tiles')) {
    const feld = (x: number, y: number) => aussen(x, y) ? -2 : (x % 4 === 3 || y % 4 === 3) ? -1 : Math.floor(x / 4) + 4 * Math.floor(y / 4);
    const rf = relief(feld);
    for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) px(x, y, c, rf(x, y) * (0.9 + r() * 0.16));
    return;
  }
  if (name.endsWith('_planks')) {
    const enden = [3, 11, 7, 14];
    for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) {
      const reihe = Math.floor(y / 4), fuge = y % 4 === 3 || x === enden[reihe];
      px(x, y, c, fuge ? 0.62 : (y % 4 === 0 ? 1.08 : 1) * ((x * 7 + reihe * 5) % 9 === 0 ? 0.88 : 1) * (0.94 + r() * 0.1));
    }
    return;
  }
  if (name.endsWith('_log_top')) {
    const innen = name.startsWith('birch') ? [215, 200, 150] : name.startsWith('oak') ? [176, 143, 88] : name.startsWith('dark_oak') ? [70, 50, 30] : [118, 88, 55];
    for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) {
      const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
      px(x, y, d > 6.5 ? c : innen, d > 6.5 ? 0.9 : (Math.floor(d) % 2 ? 0.86 : 1) + r() * 0.08);
    }
    return;
  }
  if (name === 'birch_log') {
    for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) {
      const fleck = (y * 5 + Math.floor(x / 3) * 7) % 11 < 2 && r() < 0.8;
      px(x, y, fleck ? [40, 40, 36] : [216, 212, 200], 0.9 + r() * 0.12);
    }
    return;
  }
  if (name.endsWith('_log')) {
    const streifen = Array.from({ length: K }, () => 0.75 + r() * 0.35);
    for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) px(x, y, c, streifen[x] * (0.92 + r() * 0.12));
    return;
  }
  if (name.endsWith('leaves')) {
    for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) {
      const b = Math.sin(x * 1.7 + y * 0.9) + Math.cos(y * 1.3 - x * 0.7);
      px(x, y, c, (b > 0.6 ? 1.25 : b < -0.6 ? 0.7 : 0.95) * (0.88 + r() * 0.24), r() < 0.16 ? 0 : 255);
    }
    return;
  }
  if (name.includes('glass')) {
    const getoent = name.includes('stained');
    const f = getoent ? c : [196, 228, 240];
    for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) {
      const rand = x === 0 || y === 0 || x === 15 || y === 15;
      const glanz = (x - y === 3 || x - y === 4) && x > 4 && x < 13;
      px(x, y, rand ? f.map((v) => v * 0.8 + 40) : glanz ? [255, 255, 255] : f, 1, rand ? 235 : glanz ? 170 : getoent ? 160 : 60);
    }
    return;
  }
  if (name === 'grass_block_top') return flaeche([93, 154, 59], 0.14);
  if (name === 'grass_block_side') {
    for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) px(x, y, y < 3 || (y === 3 && r() < 0.5) ? [93, 154, 59] : [134, 96, 67], 0.85 + r() * 0.25);
    return;
  }
  if (name === 'dirt_path_top') return flaeche([148, 121, 63], 0.12);
  if (name === 'bookshelf') {
    const farben = [[150, 40, 35], [60, 80, 150], [70, 120, 60], [170, 140, 60], [110, 60, 120], [140, 90, 50]];
    for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) {
      if (y === 0 || y === 7 || y === 8 || y === 15) { px(x, y, [160, 126, 78], 0.85 + r() * 0.15); continue; }
      px(x, y, x % 3 === 2 ? [60, 40, 25] : farben[(x * 3 + (y < 8 ? 1 : 4)) % farben.length], 0.85 + r() * 0.2);
    }
    return;
  }
  if (name === 'water') {
    for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) px(x, y, [58, 111, 216], 0.85 + r() * 0.2 + Math.sin((x + y * 2) / 2) * 0.05, 180);
    return;
  }
  if (name === 'lantern') {
    for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) {
      const rahmen = x < 3 || x > 12 || y < 3 || y > 12;
      px(x, y, rahmen ? [55, 58, 70] : [255, 205, 110], 1);
    }
    return;
  }
  if (name === 'ladder' || name.endsWith('_trapdoor')) {
    for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) {
      const holz = x <= 2 || x >= 13 || y % 4 === 1;
      px(x, y, c, 0.9 + r() * 0.1, holz ? 255 : 0);
    }
    return;
  }
  if (name.endsWith('_door')) {
    for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) {
      const rahmen = x <= 1 || x >= 14 || y <= 1 || y >= 14 || y === 7;
      px(x, y, c, rahmen ? 0.78 : 1 + r() * 0.08);
    }
    return;
  }
  if (/^(poppy|dandelion|cornflower|allium|azure_bluet|oxeye_daisy)$/.test(name)) {
    for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) {
      const kopf = Math.hypot(x - 7, y - 4.5) < 2.6, stiel = x === 7 && y > 6, blatt = (y === 11 && (x === 6 || x === 8)) || (y === 12 && (x === 5 || x === 9));
      if (kopf) px(x, y, c, 1); else if (stiel || blatt) px(x, y, [60, 120, 40], 1); else px(x, y, [0, 0, 0], 1, 0);
    }
    return;
  }
  if (name === 'fern' || name === 'sugar_cane' || name.endsWith('_sapling') || name === 'short_grass') {
    for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) {
      const an = name === 'sugar_cane' ? [3, 4, 8, 9, 12].includes(x) : Math.abs(x - 7.5) < (16 - y) * 0.45 && (x + y) % 3 !== 0 && y > 3;
      px(x, y, c, 0.8 + r() * 0.4, an ? 255 : 0);
    }
    return;
  }
  if (name.endsWith('_wool')) {
    for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) px(x, y, c, (Math.sin((x + y) * 1.2) * 0.06 + 0.96) * (0.95 + r() * 0.08));
    return;
  }
  if (name === 'crafting_table_top') {
    for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) px(x, y, [160, 120, 70], (x % 5 === 0 || y % 5 === 0 ? 0.6 : 1) * (0.9 + r() * 0.15));
    return;
  }
  if (name === 'chest' || name === 'barrel' || name === 'crafting_table') {
    for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) px(x, y, c, (x === 0 || y === 0 || x === 15 || y === 15 || y === 5 ? 0.6 : 1) * (0.9 + r() * 0.15));
    if (name === 'chest') { px(7, 5, [200, 200, 200]); px(8, 5, [200, 200, 200]); px(7, 6, [160, 160, 160]); px(8, 6, [160, 160, 160]); }
    return;
  }
  if (name.startsWith('hay_block')) {
    for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) px(x, y, c, (name.endsWith('top') ? 1 : y === 3 || y === 12 ? 0.6 : 1) * (0.85 + r() * 0.25));
    return;
  }
  if (name === 'polished_andesite' || name === 'smooth_stone' || name.endsWith('concrete')) {
    for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) px(x, y, c, (x === 0 || y === 0 ? 1.1 : x === 15 || y === 15 ? 0.82 : 1) * (0.96 + r() * 0.06));
    return;
  }
  if (name === 'gravel' || name === 'andesite') return flaeche(c, 0.25);
  flaeche(c, 0.1);
}

const cache = new Map<string, THREE.Texture>();
let ueberschreibungen: Set<string> | null = null;
const loader = new THREE.TextureLoader();

/** Lädt die Liste eigener PNG-Texturen (einmalig beim Start). */
export async function loadTextureOverrides(): Promise<void> {
  try {
    const antwort = await fetch('./textures/blocks/textures.json');
    ueberschreibungen = new Set(antwort.ok ? ((await antwort.json()) as string[]) : []);
  } catch {
    ueberschreibungen = new Set();
  }
}

export function getTexture(name: string): THREE.Texture {
  const vorhanden = cache.get(name);
  if (vorhanden) return vorhanden;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = K;
  const g = canvas.getContext('2d')!;
  const img = g.createImageData(K, K);
  const r = zufall(name);
  male(name, (x, y, farbe, f = 1, a = 255) => {
    const o = (y * K + x) * 4;
    img.data[o] = Math.min(255, farbe[0] * f); img.data[o + 1] = Math.min(255, farbe[1] * f);
    img.data[o + 2] = Math.min(255, farbe[2] * f); img.data[o + 3] = a;
  }, r);
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  cache.set(name, tex);
  if (hasPack()) void wendePackAn(name, tex);
  else if (ueberschreibungen?.has(name)) {
    loader.load(`./textures/blocks/${name}.png`, (png) => {
      tex.image = png.image;
      tex.needsUpdate = true;
    });
  }
  return tex;
}

/** Originaltextur aus dem Minecraft-Paket auf eine Textur anwenden und Blockfarben angleichen */
async function wendePackAn(name: string, tex: THREE.Texture): Promise<boolean> {
  const bild = await packImage(name);
  if (!bild) return false;
  tex.image = bild;
  tex.needsUpdate = true;
  const farbe = mittelfarbe(bild);
  if (farbe) for (const info of allBlockInfos()) if (info.tex.top === name) info.color = farbe;
  return true;
}

/** Nach dem Laden eines Texturpakets: alle schon benutzten Texturen austauschen */
export async function refreshAllTextures(): Promise<number> {
  let n = 0;
  await Promise.all([...cache.entries()].map(async ([name, tex]) => { if (await wendePackAn(name, tex)) n++; }));
  return n;
}

/** Zurück zu den gemalten Texturen */
export function resetTextures(): void {
  for (const [name, tex] of cache) {
    const neu = getTextureUncached(name);
    tex.image = neu.image;
    tex.needsUpdate = true;
  }
}

function getTextureUncached(name: string): THREE.Texture {
  const alt = cache.get(name);
  cache.delete(name);
  const t = getTexture(name);
  if (alt) cache.set(name, alt);
  return t;
}
