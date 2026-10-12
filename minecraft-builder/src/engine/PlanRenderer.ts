import type { BlockData, BuildProject } from '../builder/BuildProject';
import { projectBounds, type Bounds } from '../builder/BuildProject';
import { blockVisibility, type ViewState } from '../builder/ViewFilter';
import { blockInfo } from './BlockTypes';

/** 2D-Darstellung von oben: Draufsicht (oberster Block) oder eine einzelne Ebene. */

export interface PlanData {
  bounds: Bounds;
  w: number;
  d: number;
  /** pro Spalte der oberste sichtbare Block */
  top: (BlockData | undefined)[];
  /** Blöcke nach Ebene, Schlüssel "x,z" */
  layers: Map<number, Map<string, BlockData>>;
}

export function buildPlan(project: BuildProject, view: ViewState): PlanData {
  const bounds = projectBounds(project.blocks);
  const w = bounds.max[0] - bounds.min[0] + 1, d = bounds.max[2] - bounds.min[2] + 1;
  const top: (BlockData | undefined)[] = new Array(w * d);
  const layers = new Map<number, Map<string, BlockData>>();
  for (const b of project.blocks) {
    const vis = blockVisibility(b, view);
    if (!vis) continue;
    let l = layers.get(b.y);
    if (!l) { l = new Map(); layers.set(b.y, l); }
    l.set(`${b.x},${b.z}`, b);
    if (vis === 2) continue;
    const i = (b.z - bounds.min[2]) * w + (b.x - bounds.min[0]);
    const t = top[i];
    if (!t || b.y > t.y) top[i] = b;
  }
  return { bounds, w, d, top, layers };
}

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

/** Zeichnet die Draufsicht (layer = null) oder eine Ebene in ein Canvas. px = Pixel je Block */
export function drawPlan(canvas: HTMLCanvasElement, plan: PlanData, px: number, layer: number | null, raster: boolean): void {
  canvas.width = Math.max(1, plan.w * px);
  canvas.height = Math.max(1, plan.d * px);
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#2f6fbf';
  g.fillRect(0, 0, canvas.width, canvas.height);
  const { min, max } = plan.bounds;
  const hoehe = Math.max(1, max[1] - min[1]);
  if (layer === null) {
    for (let z = 0; z < plan.d; z++) for (let x = 0; x < plan.w; x++) {
      const b = plan.top[z * plan.w + x];
      if (!b) continue;
      const links = x > 0 ? plan.top[z * plan.w + x - 1] : undefined;
      const relief = links ? Math.max(-0.25, Math.min(0.25, (b.y - links.y) * 0.08)) : 0;
      g.fillStyle = shade(blockInfo(b.type).color, 0.75 + 0.4 * ((b.y - min[1]) / hoehe) + relief);
      g.fillRect(x * px, z * px, px, px);
    }
  } else {
    const unten = plan.layers.get(layer - 1), hier = plan.layers.get(layer);
    unten?.forEach((b) => { g.fillStyle = shade(blockInfo(b.type).color, 0.4); g.fillRect((b.x - min[0]) * px, (b.z - min[2]) * px, px, px); });
    hier?.forEach((b) => { g.fillStyle = blockInfo(b.type).color; g.fillRect((b.x - min[0]) * px, (b.z - min[2]) * px, px, px); });
  }
  if (raster && px >= 4) {
    g.lineWidth = 1;
    for (let x = 0; x <= plan.w; x++) {
      const welt = x + min[0];
      g.strokeStyle = welt % 16 === 0 ? 'rgba(255,79,163,0.8)' : 'rgba(0,0,0,0.12)';
      g.beginPath(); g.moveTo(x * px + 0.5, 0); g.lineTo(x * px + 0.5, canvas.height); g.stroke();
    }
    for (let z = 0; z <= plan.d; z++) {
      const welt = z + min[2];
      g.strokeStyle = welt % 16 === 0 ? 'rgba(255,79,163,0.8)' : 'rgba(0,0,0,0.12)';
      g.beginPath(); g.moveTo(0, z * px + 0.5); g.lineTo(canvas.width, z * px + 0.5); g.stroke();
    }
  }
}

/** Markierung (Kamera oder Spieler) als Pfeil mit Blickrichtung */
export function drawMarker(g: CanvasRenderingContext2D, x: number, y: number, yawRad: number, farbe: string, name?: string): void {
  g.save();
  g.translate(x, y);
  g.rotate(-yawRad);
  g.fillStyle = farbe; g.strokeStyle = '#fff'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 6); g.lineTo(0, 3); g.lineTo(-6, 6); g.closePath();
  g.fill(); g.stroke();
  g.restore();
  if (name) {
    g.font = 'bold 11px system-ui, sans-serif';
    const breite = g.measureText(name).width + 8;
    g.fillStyle = 'rgba(0,0,0,0.65)'; g.fillRect(x - breite / 2, y - 26, breite, 15);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(name, x, y - 15);
  }
}
