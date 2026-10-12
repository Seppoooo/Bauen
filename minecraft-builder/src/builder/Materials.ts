import type { BlockData, BuildProject } from './BuildProject';
import { blockInfo } from '../engine/BlockTypes';

/** Materialzählung: gesamt, je Stockwerk, je Bauphase und noch benötigt. */

export interface MaterialEntry {
  type: string;
  name: string;
  color: string;
  count: number;
}

export type MaterialMode = 'total' | 'step' | 'built' | 'remaining';

export const MATERIAL_MODE_LABELS: Record<MaterialMode, string> = {
  total: 'Gesamtes Projekt',
  step: 'Nur diese Bauphase',
  built: 'Bis jetzt gebaut',
  remaining: 'Noch benötigt'
};

/** Für die Materialliste zählen Varianten (Ausrichtung, Hälfte) als ein Material. */
export function countMaterials(blocks: Iterable<BlockData>): MaterialEntry[] {
  const m = new Map<string, number>();
  for (const b of blocks) m.set(b.type, (m.get(b.type) ?? 0) + 1);
  return [...m.entries()]
    .map(([type, count]) => {
      const info = blockInfo(type);
      return { type, name: info.name, color: info.color, count };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function filterBlocks(project: BuildProject, mode: MaterialMode, step: number, floor: number | 'all'): BlockData[] {
  return project.blocks.filter((b) => {
    if (floor !== 'all' && b.floor !== floor) return false;
    switch (mode) {
      case 'total': return true;
      case 'step': return b.step === step;
      case 'built': return b.step <= step;
      case 'remaining': return b.step > step;
    }
  });
}

/** Stack-Darstellung wie im Spiel: 64 Blöcke je Stack, 27 Stacks je Shulkerkiste. */
export function formatStacks(n: number): string {
  const stacks = Math.floor(n / 64), rest = n % 64;
  let t = stacks ? `${stacks} St.${rest ? ' + ' + rest : ''}` : `${rest}`;
  if (n >= 1728) t += ` · ${(n / 1728).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Shulker`;
  return t;
}
