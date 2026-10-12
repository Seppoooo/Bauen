import type { BuildProject, FloorInfo } from './BuildProject';

/** Stockwerke: Namen, Höhenbereiche und Zuordnung neuer Blöcke. */

export function floorName(project: BuildProject, id: number): string {
  return project.floors.find((f) => f.id === id)?.name ?? `Stockwerk ${id}`;
}

/** Ordnet eine Höhe dem passenden Stockwerk zu (über minY/maxY), sonst das oberste darunter. */
export function floorForY(floors: FloorInfo[], y: number): number {
  const passend = floors.find((f) => f.minY !== undefined && f.maxY !== undefined && y >= f.minY && y <= f.maxY);
  if (passend) return passend.id;
  const darunter = floors.filter((f) => f.minY !== undefined && f.minY <= y).sort((a, b) => (b.minY ?? 0) - (a.minY ?? 0));
  return darunter[0]?.id ?? floors[0]?.id ?? 0;
}

/** Ermittelt für jedes Stockwerk die tatsächliche Höhe aus den Blöcken. */
export function floorHeights(project: BuildProject): Map<number, { minY: number; maxY: number; count: number }> {
  const m = new Map<number, { minY: number; maxY: number; count: number }>();
  for (const b of project.blocks) {
    const e = m.get(b.floor);
    if (!e) m.set(b.floor, { minY: b.y, maxY: b.y, count: 1 });
    else { e.minY = Math.min(e.minY, b.y); e.maxY = Math.max(e.maxY, b.y); e.count++; }
  }
  return m;
}
