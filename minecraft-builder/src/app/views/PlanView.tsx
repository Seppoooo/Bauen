import { useEffect, useRef, useState } from 'react';
import type { BlockData, BuildProject } from '../../builder/BuildProject';
import { PART_LABELS } from '../../builder/BuildProject';
import { floorName } from '../../builder/Floors';
import { drawMarker, drawPlan, type PlanData } from '../../engine/PlanRenderer';
import { blockInfo } from '../../engine/BlockTypes';

interface Props {
  project: BuildProject;
  plan: PlanData;
  camPos: [number, number, number];
  camYaw: number;
  players: { name: string; x: number; z: number; yaw: number }[];
  onFlyTo: (x: number, y: number, z: number) => void;
}

/** 2D-Plan: Draufsicht oder einzelne Ebenen, mit Raster, Kamera und Live-Spielern */
export function PlanView({ project, plan, camPos, camYaw, players, onFlyTo }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ebene, setEbene] = useState<number | null>(null);
  const [zoom, setZoom] = useState(() => Math.max(3, Math.min(14, Math.floor(900 / Math.max(plan.w, plan.d)))));
  const [raster, setRaster] = useState(true);
  const [info, setInfo] = useState<BlockData | null>(null);
  const { min, max } = plan.bounds;

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    drawPlan(c, plan, zoom, ebene, raster);
    const g = c.getContext('2d')!;
    drawMarker(g, (camPos[0] - min[0]) * zoom, (camPos[2] - min[2]) * zoom, camYaw, '#f2b33d', 'Kamera');
    for (const p of players) drawMarker(g, (p.x - min[0]) * zoom, (p.z - min[2]) * zoom, Math.PI - (p.yaw * Math.PI) / 180, '#ff4fa3', p.name);
  }, [plan, zoom, ebene, raster, camPos, camYaw, players, min]);

  const zelle = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: Math.floor((e.clientX - r.left) / zoom) + min[0], z: Math.floor((e.clientY - r.top) / zoom) + min[2] };
  };
  const finde = (x: number, z: number) => (ebene === null ? plan.top[(z - min[2]) * plan.w + (x - min[0])] : plan.layers.get(ebene)?.get(`${x},${z}`)) ?? null;

  return (
    <div className="planansicht">
      <div className="werkzeuge">
        <label className="pille">
          Ansicht
          <select value={ebene === null ? 'top' : 'ebene'} onChange={(e) => setEbene(e.target.value === 'top' ? null : min[1])}>
            <option value="top">Draufsicht</option>
            <option value="ebene">Einzelne Ebene</option>
          </select>
        </label>
        {ebene !== null && (
          <label className="pille breit-regler">
            Ebene Y {ebene}
            <input type="range" min={min[1]} max={max[1]} value={ebene} onChange={(e) => setEbene(Number(e.target.value))} />
          </label>
        )}
        <label className="pille">Zoom<input type="range" min={2} max={24} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} /></label>
        <label className="pille"><input type="checkbox" checked={raster} onChange={(e) => setRaster(e.target.checked)} />Bauplan-Linien</label>
        <span className="hinweis-inline">Doppelklick = in der 3D-Ansicht dorthin fliegen</span>
      </div>
      <div className="plan-scroll">
        <canvas
          ref={canvas}
          onMouseMove={(e) => { const { x, z } = zelle(e); setInfo(finde(x, z)); }}
          onMouseLeave={() => setInfo(null)}
          onDoubleClick={(e) => { const { x, z } = zelle(e); const b = finde(x, z); onFlyTo(x, b?.y ?? ebene ?? min[1], z); }}
        />
      </div>
      <div className="hud-unten-links">
        {info ? (
          <>
            <strong>{blockInfo(info.type).name}</strong>
            <span>X {info.x} · Y {info.y} · Z {info.z} · {floorName(project, info.floor)} · Etappe {info.step} · {PART_LABELS[info.part]}</span>
          </>
        ) : <span>Zeige auf einen Block</span>}
      </div>
    </div>
  );
}
