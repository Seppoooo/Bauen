import type { PartCategory } from '../builder/BuildProject';
import { PART_LABELS, PART_ORDER } from '../builder/BuildProject';
import type { ViewState } from '../builder/ViewFilter';
import { blockInfo } from '../engine/BlockTypes';
import type { EditState } from './App';

const PALETTE = ['stone_bricks', 'cobblestone', 'polished_andesite', 'oak_planks', 'spruce_planks', 'dark_oak_planks', 'oak_log',
  'glass_pane', 'deepslate_tiles', 'stone_brick_slab', 'bricks', 'red_wool', 'bookshelf', 'lantern', 'oak_leaves', 'grass_block', 'gravel', 'water'];

export interface ToolbarState {
  grid: boolean;
  gridSpacing: number;
  speed: number;
}

interface Props {
  view: ViewState;
  onView: (f: (v: ViewState) => ViewState) => void;
  tools: ToolbarState;
  onTools: (t: ToolbarState) => void;
  flying: boolean;
  onFly: () => void;
  onFullscreen: () => void;
  liveCount: number;
  liveStatus: string;
  edit: EditState;
  onEdit: (e: EditState) => void;
}

/** Werkzeugleiste direkt über der 3D-Ansicht */
export function Toolbar({ view, onView, tools, onTools, flying, onFly, onFullscreen, liveCount, liveStatus, edit, onEdit }: Props) {
  const waende = view.transparentParts.includes('wall');
  return (
    <div className="werkzeuge" role="toolbar" aria-label="3D-Werkzeuge">
      <label className="pille">
        <input type="checkbox" checked={tools.grid} onChange={(e) => onTools({ ...tools, grid: e.target.checked })} />
        Bauplan-Linien
      </label>
      <label className="pille">
        Linien
        <select value={tools.gridSpacing} onChange={(e) => onTools({ ...tools, gridSpacing: Number(e.target.value) })} aria-label="Abstand der kräftigen Linien">
          {[4, 8, 16, 32].map((n) => <option key={n} value={n}>alle {n}</option>)}
        </select>
      </label>
      <label className="pille">
        <input type="checkbox" checked={waende} onChange={() => onView((v) => ({
          ...v, transparentParts: waende ? v.transparentParts.filter((p) => p !== 'wall' && p !== 'interior_wall') : [...v.transparentParts, 'wall', 'interior_wall']
        }))} />
        Wände durchsichtig
      </label>
      <label className="pille">
        <input type="checkbox" checked={view.hiddenParts.includes('roof')} onChange={() => onView((v) => ({
          ...v, hiddenParts: v.hiddenParts.includes('roof') ? v.hiddenParts.filter((p) => p !== 'roof') : [...v.hiddenParts, 'roof']
        }))} />
        Dach aus
      </label>
      <label className="pille tempo">
        Tempo
        <input type="range" min={3} max={60} value={tools.speed} onChange={(e) => onTools({ ...tools, speed: Number(e.target.value) })} aria-label="Fluggeschwindigkeit" />
      </label>
      <button type="button" className="pille" onClick={onFullscreen}>Vollbild</button>
      <button type="button" className="pille" aria-pressed={flying} onClick={onFly}>Flugmodus (F)</button>
      <button type="button" className="pille" aria-pressed={view.ghostFuture} onClick={() => onView((v) => ({ ...v, ghostFuture: !v.ghostFuture }))}>Aktueller Stand (X)</button>
      <label className="pille">
        <input type="checkbox" checked={edit.enabled} onChange={(e) => onEdit({ ...edit, enabled: e.target.checked })} />
        Bauen
      </label>
      {edit.enabled && (
        <>
          <select className="pille" value={edit.type} onChange={(e) => onEdit({ ...edit, type: e.target.value })} aria-label="Block zum Setzen">
            {PALETTE.map((t) => <option key={t} value={t}>{blockInfo(t).name}</option>)}
          </select>
          <select className="pille" value={edit.part} onChange={(e) => onEdit({ ...edit, part: e.target.value as PartCategory })} aria-label="Bauteil">
            {PART_ORDER.map((p) => <option key={p} value={p}>{PART_LABELS[p]}</option>)}
          </select>
        </>
      )}
      <span className={`live ${liveCount ? 'an' : ''}`} title={`Live-Kopplung: ${liveStatus}`}>Live-Spieler ({liveCount})</span>
    </div>
  );
}
