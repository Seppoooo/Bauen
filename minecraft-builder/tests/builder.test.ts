import { describe, expect, it } from 'vitest';
import { blockKey, emptyProject, normalizeProject, projectBounds, type BlockData, type BuildProject } from '../src/builder/BuildProject';
import { firstStep, lastStep, nextStep, previousStep, progressUpTo, blocksPerStep } from '../src/builder/BuildSteps';
import { floorForY, floorHeights } from '../src/builder/Floors';
import { countMaterials, filterBlocks, formatStacks } from '../src/builder/Materials';
import { blockVisibility, DEFAULT_VIEW } from '../src/builder/ViewFilter';

function projekt(): BuildProject {
  const p = emptyProject('Test');
  p.floors = [{ id: 0, name: 'EG', minY: 0, maxY: 5 }, { id: 1, name: 'OG', minY: 6, maxY: 10 }];
  const b = (x: number, y: number, z: number, type: string, step: number, part: BlockData['part'], floor = y > 5 ? 1 : 0): BlockData => ({ x, y, z, type, step, part, floor });
  p.blocks = [
    b(0, 0, 0, 'cobblestone', 1, 'foundation'), b(1, 0, 0, 'cobblestone', 1, 'foundation'),
    b(0, 1, 0, 'oak_planks', 2, 'floor'), b(0, 2, 0, 'stone_bricks', 3, 'wall'), b(1, 2, 0, 'stone_bricks', 3, 'wall'),
    b(0, 3, 0, 'glass_pane', 5, 'window'), b(0, 7, 0, 'stone_bricks', 6, 'wall'), b(0, 11, 0, 'deepslate_tile_stairs', 7, 'roof', 1),
    b(0, 12, 0, 'lantern', 8, 'decoration', 1)
  ];
  return p;
}

describe('Bauphasen (Etappen)', () => {
  const p = projekt();
  it('erste, letzte, nächste und vorherige Etappe', () => {
    expect(firstStep(p)).toBe(1);
    expect(lastStep(p)).toBe(8);
    expect(nextStep(p, 1)).toBe(2);
    expect(nextStep(p, 8)).toBe(8);
    expect(previousStep(p, 1)).toBe(1);
    expect(previousStep(p, 3)).toBe(2);
  });
  it('Fortschritt in Prozent', () => {
    expect(progressUpTo(p, 1)).toEqual({ done: 2, total: 9, percent: 22 });
    expect(progressUpTo(p, 8).percent).toBe(100);
    expect(progressUpTo(emptyProject(), 3).percent).toBe(0);
  });
  it('Blöcke je Etappe', () => {
    const m = blocksPerStep(p);
    expect(m.get(1)).toBe(2);
    expect(m.get(3)).toBe(2);
    expect(m.get(4)).toBeUndefined();
  });
});

describe('Sichtbarkeit', () => {
  const p = projekt();
  const wand = p.blocks[3], dach = p.blocks[7];
  it('zeigt nur Blöcke bis zur gewählten Etappe', () => {
    expect(blockVisibility(wand, { ...DEFAULT_VIEW, step: 2 })).toBe(0);
    expect(blockVisibility(wand, { ...DEFAULT_VIEW, step: 3, highlightStep: false })).toBe(1);
  });
  it('hebt die aktuelle Etappe hervor', () => {
    expect(blockVisibility(wand, { ...DEFAULT_VIEW, step: 3 })).toBe(3);
  });
  it('Aktueller Stand zeigt spätere Etappen durchsichtig', () => {
    expect(blockVisibility(dach, { ...DEFAULT_VIEW, step: 3, ghostFuture: true })).toBe(2);
  });
  it('Stockwerk- und Bauteilfilter', () => {
    expect(blockVisibility(wand, { ...DEFAULT_VIEW, step: 8, floors: [1] })).toBe(0);
    expect(blockVisibility(dach, { ...DEFAULT_VIEW, step: 8, hiddenParts: ['roof'] })).toBe(0);
    expect(blockVisibility(wand, { ...DEFAULT_VIEW, step: 8, transparentParts: ['wall'] })).toBe(2);
    // ausgeblendete Bauteile bleiben auch im „Aktuellen Stand“ ausgeblendet
    expect(blockVisibility(dach, { ...DEFAULT_VIEW, step: 1, ghostFuture: true, hiddenParts: ['roof'] })).toBe(0);
  });
});

describe('Stockwerke', () => {
  const p = projekt();
  it('ordnet Höhen dem richtigen Stockwerk zu', () => {
    expect(floorForY(p.floors, 0)).toBe(0);
    expect(floorForY(p.floors, 5)).toBe(0);
    expect(floorForY(p.floors, 6)).toBe(1);
    expect(floorForY(p.floors, 40)).toBe(1);
  });
  it('berechnet Höhenbereiche aus den Blöcken', () => {
    const h = floorHeights(p);
    expect(h.get(0)).toEqual({ minY: 0, maxY: 3, count: 6 });
    expect(h.get(1)?.maxY).toBe(12);
  });
});

describe('Materialliste', () => {
  const p = projekt();
  it('zählt je Blocktyp, größte zuerst', () => {
    const m = countMaterials(p.blocks);
    expect(m[0].count).toBe(3);
    expect(m[0].type).toBe('stone_bricks');
    expect(m.reduce((a, e) => a + e.count, 0)).toBe(9);
  });
  it('filtert nach Etappe, gebaut, noch benötigt und Stockwerk', () => {
    expect(filterBlocks(p, 'step', 3, 'all')).toHaveLength(2);
    expect(filterBlocks(p, 'built', 3, 'all')).toHaveLength(5);
    expect(filterBlocks(p, 'remaining', 3, 'all')).toHaveLength(4);
    expect(filterBlocks(p, 'total', 3, 1)).toHaveLength(3);
    // gebaut + noch benötigt = gesamt
    expect(filterBlocks(p, 'built', 5, 'all').length + filterBlocks(p, 'remaining', 5, 'all').length).toBe(p.blocks.length);
  });
  it('rechnet in Stacks und Shulkerkisten', () => {
    expect(formatStacks(10)).toBe('10');
    expect(formatStacks(64)).toBe('1 St.');
    expect(formatStacks(130)).toBe('2 St. + 2');
    expect(formatStacks(3456)).toContain('2 Shulker');
  });
});

describe('Projektdaten', () => {
  it('Schlüssel sind auch für negative Koordinaten eindeutig', () => {
    const keys = new Set<number>();
    for (let x = -3; x <= 3; x++) for (let y = -2; y <= 2; y++) for (let z = -3; z <= 3; z++) keys.add(blockKey(x, y, z));
    expect(keys.size).toBe(7 * 5 * 7);
    expect(blockKey(500, 211, 500)).not.toBe(blockKey(500, 211, 499));
  });
  it('Grenzen eines Projekts', () => {
    expect(projectBounds(projekt().blocks)).toEqual({ min: [0, 0, 0], max: [1, 12, 0] });
  });
  it('ergänzt fehlende Angaben und meldet kaputte Blöcke verständlich', () => {
    const p = normalizeProject({ name: 'X', blocks: [{ x: 1, y: 2, z: 3, type: 'minecraft:stone' }] });
    expect(p.blocks[0]).toMatchObject({ type: 'stone', floor: 0, step: 1, part: 'other' });
    expect(p.steps.length).toBeGreaterThan(0);
    expect(() => normalizeProject({ blocks: [{ x: 1, type: 'stone' }] })).toThrow(/Block Nr. 1/);
    expect(() => normalizeProject({})).toThrow(/blocks/);
  });
});
