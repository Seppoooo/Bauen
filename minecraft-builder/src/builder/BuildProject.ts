/**
 * Datenmodell eines Bauprojekts.
 *
 * Jeder Block hat Koordinaten, einen Blocktyp (Minecraft-ID ohne "minecraft:"),
 * optionale Blockzustände (z. B. facing=north), ein Stockwerk, eine Bauphase und eine Bauteilkategorie.
 */

export type PartCategory =
  | 'foundation'
  | 'floor'
  | 'wall'
  | 'interior_wall'
  | 'window'
  | 'door'
  | 'stairs'
  | 'roof'
  | 'decoration'
  | 'terrain'
  | 'other';

export const PART_LABELS: Record<PartCategory, string> = {
  foundation: 'Fundament',
  floor: 'Böden & Decken',
  wall: 'Außenwände',
  interior_wall: 'Innenwände',
  window: 'Fenster',
  door: 'Türen',
  stairs: 'Treppen & Leitern',
  roof: 'Dach',
  decoration: 'Dekoration',
  terrain: 'Gelände',
  other: 'Sonstiges'
};

export const PART_ORDER: PartCategory[] = [
  'foundation', 'floor', 'wall', 'interior_wall', 'window', 'door', 'stairs', 'roof', 'decoration', 'terrain', 'other'
];

export interface BlockData {
  x: number;
  y: number;
  z: number;
  /** Minecraft-Block-ID ohne Namensraum, z. B. "stone_bricks" */
  type: string;
  /** Blockzustände wie in Minecraft, z. B. { facing: 'north', half: 'top' } */
  props?: Record<string, string>;
  floor: number;
  step: number;
  part: PartCategory;
}

export interface StepInfo {
  id: number;
  name: string;
  description?: string;
}

export interface FloorInfo {
  id: number;
  name: string;
  minY?: number;
  maxY?: number;
}

export interface BuildProject {
  format: 'mc-builder';
  version: 1;
  name: string;
  description?: string;
  author?: string;
  minecraftVersion?: string;
  steps: StepInfo[];
  floors: FloorInfo[];
  blocks: BlockData[];
}

export const DEFAULT_STEPS: StepInfo[] = [
  { id: 1, name: 'Fundament' },
  { id: 2, name: 'Boden' },
  { id: 3, name: 'Außenwände' },
  { id: 4, name: 'Innenwände' },
  { id: 5, name: 'Fenster und Türen' },
  { id: 6, name: 'Weitere Stockwerke' },
  { id: 7, name: 'Dach' },
  { id: 8, name: 'Dekoration' }
];

export function emptyProject(name = 'Neues Projekt'): BuildProject {
  return {
    format: 'mc-builder',
    version: 1,
    name,
    minecraftVersion: '26.3',
    steps: DEFAULT_STEPS.map((s) => ({ ...s })),
    floors: [{ id: 0, name: 'Erdgeschoss', minY: 0, maxY: 5 }],
    blocks: []
  };
}

/** Zahlenschlüssel für eine Blockposition (schneller und sparsamer als Text bei Millionen Blöcken). Bereich x/z ±2048, y ±1024 */
export const blockKey = (x: number, y: number, z: number) => ((y + 1024) * 4096 + (z + 2048)) * 4096 + (x + 2048);

export interface Bounds {
  min: [number, number, number];
  max: [number, number, number];
}

export function projectBounds(blocks: BlockData[]): Bounds {
  if (!blocks.length) return { min: [0, 0, 0], max: [0, 0, 0] };
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const b of blocks) {
    if (b.x < min[0]) min[0] = b.x; if (b.y < min[1]) min[1] = b.y; if (b.z < min[2]) min[2] = b.z;
    if (b.x > max[0]) max[0] = b.x; if (b.y > max[1]) max[1] = b.y; if (b.z > max[2]) max[2] = b.z;
  }
  return { min, max };
}

/** Prüft ein geladenes Objekt und ergänzt fehlende Felder mit sinnvollen Standardwerten. */
export function normalizeProject(raw: unknown): BuildProject {
  if (!raw || typeof raw !== 'object') throw new Error('Die Datei enthält kein Projekt.');
  const r = raw as Partial<BuildProject> & { blocks?: unknown };
  if (!Array.isArray(r.blocks)) throw new Error('Im Projekt fehlt die Liste "blocks".');
  const blocks: BlockData[] = (r.blocks as Partial<BlockData>[]).map((b, i) => {
    if (typeof b.x !== 'number' || typeof b.y !== 'number' || typeof b.z !== 'number' || typeof b.type !== 'string') {
      throw new Error(`Block Nr. ${i + 1} hat keine gültigen Koordinaten oder keinen Typ.`);
    }
    return {
      x: b.x, y: b.y, z: b.z,
      type: b.type.replace(/^minecraft:/, ''),
      props: b.props,
      floor: typeof b.floor === 'number' ? b.floor : 0,
      step: typeof b.step === 'number' ? b.step : 1,
      part: (b.part && b.part in PART_LABELS ? b.part : 'other') as PartCategory
    };
  });
  const stepIds = new Set(blocks.map((b) => b.step));
  const steps = Array.isArray(r.steps) && r.steps.length
    ? r.steps
    : DEFAULT_STEPS.filter((s) => stepIds.has(s.id)).concat(
      [...stepIds].filter((id) => !DEFAULT_STEPS.some((s) => s.id === id)).map((id) => ({ id, name: `Schritt ${id}` })));
  const floorIds = [...new Set(blocks.map((b) => b.floor))].sort((a, b) => a - b);
  const floors = Array.isArray(r.floors) && r.floors.length
    ? r.floors
    : floorIds.map((id) => ({ id, name: id === 0 ? 'Erdgeschoss' : `${id}. Stockwerk` }));
  return {
    format: 'mc-builder',
    version: 1,
    name: typeof r.name === 'string' ? r.name : 'Unbenanntes Projekt',
    description: r.description,
    author: r.author,
    minecraftVersion: r.minecraftVersion,
    steps: [...steps].sort((a, b) => a.id - b.id),
    floors: [...floors].sort((a, b) => a.id - b.id),
    blocks
  };
}
