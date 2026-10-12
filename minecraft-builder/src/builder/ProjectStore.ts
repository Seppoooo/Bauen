import type { BuildProject } from './BuildProject';
import { toCompact } from '../import/ProjectImport';

/** Speichert Projekte im Browser (localStorage). Große Projekte werden kompakt abgelegt. */

const KEY = 'mc-builder.projekte';

export interface StoredProjectMeta {
  id: string;
  name: string;
  blocks: number;
  updated: string;
}

interface StoredProject extends StoredProjectMeta {
  data: unknown;
}

function readAll(): StoredProject[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredProject[]) : [];
  } catch {
    return [];
  }
}

export function listProjects(): StoredProjectMeta[] {
  return readAll().map(({ id, name, blocks, updated }) => ({ id, name, blocks, updated }));
}

export function saveProject(project: BuildProject, id?: string): { ok: true; id: string } | { ok: false; error: string } {
  const all = readAll();
  const eintrag: StoredProject = {
    id: id ?? `p${Date.now().toString(36)}`,
    name: project.name,
    blocks: project.blocks.length,
    updated: new Date().toISOString(),
    data: toCompact(project)
  };
  const i = all.findIndex((p) => p.id === eintrag.id);
  if (i >= 0) all[i] = eintrag; else all.push(eintrag);
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
    return { ok: true, id: eintrag.id };
  } catch {
    return { ok: false, error: 'Der Browser-Speicher ist voll. Exportiere das Projekt stattdessen als JSON-Datei.' };
  }
}

export function loadStored(id: string): unknown | null {
  return readAll().find((p) => p.id === id)?.data ?? null;
}

export function deleteProject(id: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(readAll().filter((p) => p.id !== id)));
  } catch {
    /* nichts zu tun */
  }
}
