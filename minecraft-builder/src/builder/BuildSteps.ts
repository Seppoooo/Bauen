import type { BuildProject, StepInfo } from './BuildProject';

/** Hilfen für die Zeitleiste der Bauphasen. */

export function stepIds(project: BuildProject): number[] {
  return project.steps.map((s) => s.id);
}

export function firstStep(project: BuildProject): number {
  return project.steps[0]?.id ?? 1;
}

export function lastStep(project: BuildProject): number {
  return project.steps[project.steps.length - 1]?.id ?? 1;
}

export function nextStep(project: BuildProject, current: number): number {
  const ids = stepIds(project);
  const i = ids.indexOf(current);
  return i < 0 || i === ids.length - 1 ? current : ids[i + 1];
}

export function previousStep(project: BuildProject, current: number): number {
  const ids = stepIds(project);
  const i = ids.indexOf(current);
  return i <= 0 ? current : ids[i - 1];
}

export function stepInfo(project: BuildProject, id: number): StepInfo | undefined {
  return project.steps.find((s) => s.id === id);
}

/** Anzahl der Blöcke je Bauphase (für die Balken in der Zeitleiste). */
export function blocksPerStep(project: BuildProject): Map<number, number> {
  const m = new Map<number, number>();
  for (const b of project.blocks) m.set(b.step, (m.get(b.step) ?? 0) + 1);
  return m;
}

/** Fortschritt in Prozent: Blöcke bis einschließlich der Phase / alle Blöcke. */
export function progressUpTo(project: BuildProject, step: number): { done: number; total: number; percent: number } {
  const total = project.blocks.length;
  let done = 0;
  for (const b of project.blocks) if (b.step <= step) done++;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}
