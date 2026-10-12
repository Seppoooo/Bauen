import type { BlockData, PartCategory } from './BuildProject';

/**
 * Was gerade sichtbar ist. Die 3D-Engine bekommt nur diesen Zustand und
 * entscheidet daraus pro Block, ob und wie er gezeichnet wird.
 */
export interface ViewState {
  /** Nur Blöcke bis einschließlich dieser Bauphase zeigen */
  step: number;
  /** Sichtbare Stockwerke; null = alle */
  floors: number[] | null;
  /** Ausgeblendete Bauteile */
  hiddenParts: PartCategory[];
  /** Halb durchsichtig gezeichnete Bauteile */
  transparentParts: PartCategory[];
  /** Explosionsansicht: zusätzlicher Abstand zwischen Stockwerken in Blöcken */
  explode: number;
  /** Blöcke der aktuellen Bauphase farbig hervorheben */
  highlightStep: boolean;
  /** „Aktueller Stand“: spätere Bauphasen als durchsichtigen Plan zeigen statt ausblenden */
  ghostFuture: boolean;
}

export const DEFAULT_VIEW: ViewState = {
  step: 1,
  floors: null,
  hiddenParts: [],
  transparentParts: [],
  explode: 0,
  highlightStep: true,
  ghostFuture: false
};

export type Visibility = 0 | 1 | 2 | 3; // 0 = unsichtbar, 1 = normal, 2 = transparent, 3 = hervorgehoben

export function blockVisibility(b: BlockData, v: ViewState): Visibility {
  if (v.floors && !v.floors.includes(b.floor)) return 0;
  if (v.hiddenParts.includes(b.part)) return 0;
  if (b.step > v.step) return v.ghostFuture ? 2 : 0;
  if (v.transparentParts.includes(b.part)) return 2;
  if (v.highlightStep && b.step === v.step) return 3;
  return 1;
}
