import type { BlockData, FloorInfo, PartCategory, StepInfo } from '../builder/BuildProject';
import { DEFAULT_STEPS } from '../builder/BuildProject';

/**
 * Ordnet Blöcken ohne Angaben (z. B. aus einer Schematic) automatisch
 * Bauteil, Stockwerk und Bauphase zu. Das ist eine Heuristik – im Projekt
 * lassen sich die Werte danach jederzeit ändern.
 */

export interface RawBlock {
  x: number;
  y: number;
  z: number;
  type: string;
  props?: Record<string, string>;
}

const DEKO = /lantern|torch|candle|carpet|banner|flower|poppy|dandelion|cornflower|allium|azure|oxeye|fern|leaves|bookshelf|lectern|chest|barrel|crafting|painting|item_frame|bed|campfire|chain|pot|sapling|vine|sugar_cane|lily|wool|hay|anvil|cauldron|bell|skull|head/;
const DACH = /deepslate_tile|_tile_stairs|_tile_slab|roof|lightning_rod/;

export function classifyPart(b: RawBlock, minY: number, nachbarnOben: boolean): PartCategory {
  const t = b.type;
  if (t === 'water' || t === 'lava' || /^(grass_block|dirt|stone|andesite|gravel|sand|coarse_dirt|moss_block|dirt_path)$/.test(t)) return 'terrain';
  if (b.y <= minY + 1 && /cobblestone|stone|bricks|deepslate/.test(t) && !DACH.test(t)) return 'foundation';
  if (/glass|pane|iron_bars/.test(t)) return 'window';
  if (/_door|_gate/.test(t)) return 'door';
  if (/ladder|scaffolding/.test(t) || (/_stairs/.test(t) && /oak|spruce|birch|dark_oak|planks/.test(t))) return 'stairs';
  if (DACH.test(t) || (/_stairs|_slab/.test(t) && !nachbarnOben)) return 'roof';
  if (DEKO.test(t)) return 'decoration';
  if (/planks|_slab/.test(t)) return 'floor';
  return 'wall';
}

export interface Classified {
  blocks: BlockData[];
  floors: FloorInfo[];
  steps: StepInfo[];
}

export function autoClassify(raw: RawBlock[], etagenHoehe = 6): Classified {
  if (!raw.length) return { blocks: [], floors: [], steps: DEFAULT_STEPS };
  // Schleife statt Math.min(...liste): bei über 100.000 Blöcken würde der Aufruf-Stack überlaufen
  let minY = Infinity, maxY = -Infinity;
  for (const b of raw) { if (b.y < minY) minY = b.y; if (b.y > maxY) maxY = b.y; }
  const belegt = new Set(raw.map((b) => `${b.x},${b.y},${b.z}`));
  const anzahlEtagen = Math.max(1, Math.ceil((maxY - minY + 1) / etagenHoehe));
  const floors: FloorInfo[] = Array.from({ length: anzahlEtagen }, (_, i) => ({
    id: i,
    name: i === 0 ? 'Erdgeschoss' : `${i}. Obergeschoss`,
    minY: minY + i * etagenHoehe,
    maxY: minY + (i + 1) * etagenHoehe - 1
  }));
  const blocks: BlockData[] = raw.map((b) => {
    const part = classifyPart(b, minY, belegt.has(`${b.x},${b.y + 1},${b.z}`));
    const floor = Math.min(anzahlEtagen - 1, Math.floor((b.y - minY) / etagenHoehe));
    let step: number;
    switch (part) {
      case 'terrain': case 'foundation': step = 1; break;
      case 'roof': step = 7; break;
      case 'decoration': step = 8; break;
      default:
        if (floor > 0) step = 6;
        else step = part === 'floor' ? 2 : part === 'wall' ? 3 : part === 'interior_wall' || part === 'stairs' ? 4 : 5;
    }
    return { ...b, part, floor, step };
  });
  return { blocks, floors, steps: DEFAULT_STEPS.map((s) => ({ ...s })) };
}
