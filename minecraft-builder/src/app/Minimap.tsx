import { useEffect, useRef } from 'react';
import type { PlanData } from '../engine/PlanRenderer';
import { drawMarker, drawPlan } from '../engine/PlanRenderer';

interface Props {
  plan: PlanData;
  camPos: [number, number, number];
  camYaw: number;
  players: { name: string; x: number; z: number; yaw: number }[];
}

/** Kleine Karte unten rechts in der 3D-Ansicht: Draufsicht mit Kamera und Live-Spielern */
export function Minimap({ plan, camPos, camYaw, players }: Props) {
  const basis = useRef<HTMLCanvasElement | null>(null);
  const ziel = useRef<HTMLCanvasElement>(null);
  const px = Math.max(1, Math.floor(200 / Math.max(plan.w, plan.d)));

  useEffect(() => {
    const c = document.createElement('canvas');
    drawPlan(c, plan, px, null, false);
    basis.current = c;
  }, [plan, px]);

  useEffect(() => {
    const c = ziel.current, b = basis.current;
    if (!c || !b) return;
    c.width = b.width; c.height = b.height;
    const g = c.getContext('2d')!;
    g.drawImage(b, 0, 0);
    const { min } = plan.bounds;
    drawMarker(g, (camPos[0] - min[0]) * px, (camPos[2] - min[2]) * px, camYaw, '#f2b33d');
    for (const p of players) drawMarker(g, (p.x - min[0]) * px, (p.z - min[2]) * px, Math.PI - (p.yaw * Math.PI) / 180, '#ff4fa3', p.name);
  });

  return <canvas ref={ziel} className="minimap" aria-label="Minikarte" />;
}
