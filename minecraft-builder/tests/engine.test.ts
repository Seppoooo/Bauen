import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { minecraftToCamera, parseF3C } from '../src/engine/Scene';
import { baseMaterial, blockInfo, shapeOf } from '../src/engine/BlockTypes';
import { getGeometry, shapeKey } from '../src/engine/Shapes';
import { BlockRenderer } from '../src/engine/BlockRenderer';
import { buildPlan } from '../src/engine/PlanRenderer';
import { DEFAULT_VIEW } from '../src/builder/ViewFilter';
import { emptyProject } from '../src/builder/BuildProject';
import demo from '../src/data/demoCastle.json';
import { projectFromJson } from '../src/import/ProjectImport';

describe('Kopplung mit Minecraft', () => {
  it('liest den Text von F3+C', () => {
    expect(parseF3C('/execute in minecraft:overworld run tp @s 1250.50 171.00 2217.30 -90.0 12.5')).toEqual([1250.5, 171, 2217.3, -90, 12.5]);
    expect(parseF3C('irgendein Text')).toBeNull();
  });
  it('rechnet Minecraft-Blickrichtung in die Kamera um', () => {
    // Yaw 0 = Blick nach Süden (+Z), Yaw 90 = Westen (−X), Pitch positiv = nach unten
    const vorwaerts = (yaw: number) => new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const sued = minecraftToCamera(0, 64, 0, 0, 0, [0, 0, 0]);
    expect(vorwaerts(sued.yaw).z).toBeCloseTo(1);
    const west = minecraftToCamera(0, 64, 0, 90, 0, [0, 0, 0]);
    expect(vorwaerts(west.yaw).x).toBeCloseTo(-1);
    const c = minecraftToCamera(1010, 70, 2005, 0, 30, [1000, 60, 2000]);
    expect(c.pos.x).toBe(10); expect(c.pos.y).toBeCloseTo(11.62); expect(c.pos.z).toBe(5);
    expect(c.pitch).toBeLessThan(0);
  });
});

describe('Blocktypen und Formen', () => {
  it('erkennt Formen und Grundmaterial', () => {
    expect(shapeOf('stone_brick_stairs')).toBe('stairs');
    expect(shapeOf('oak_slab')).toBe('slab');
    expect(shapeOf('glass_pane')).toBe('pane');
    expect(shapeOf('poppy')).toBe('cross');
    expect(shapeOf('red_carpet')).toBe('carpet');
    expect(shapeOf('stone')).toBe('cube');
    expect(baseMaterial('deepslate_tile_stairs')).toBe('deepslate_tiles');
    expect(baseMaterial('spruce_fence')).toBe('spruce_planks');
    expect(baseMaterial('red_carpet')).toBe('red_wool');
  });
  it('deutsche Namen und Deckkraft', () => {
    expect(blockInfo('stone_bricks').name).toBe('Steinziegel');
    expect(blockInfo('stone_bricks').opaque).toBe(true);
    expect(blockInfo('glass').opaque).toBe(false);
    expect(blockInfo('oak_leaves').opaque).toBe(false);
    expect(blockInfo('stone_brick_stairs').opaque).toBe(false);
    expect(blockInfo('grass_block').tex.top).toBe('grass_block_top');
    expect(blockInfo('irgendwas_neues').name).toBe('Irgendwas Neues');
  });
  it('Treppen bekommen je Richtung und Hälfte eine eigene Geometrie', () => {
    const a = shapeKey('oak_stairs', { facing: 'north', half: 'bottom' });
    const b = shapeKey('oak_stairs', { facing: 'east', half: 'top' });
    expect(a).not.toBe(b);
    expect(getGeometry(a)).toBe(getGeometry(a));
    const box = new THREE.Box3().setFromBufferAttribute(getGeometry('cube').getAttribute('position') as THREE.BufferAttribute);
    expect(box.min.toArray()).toEqual([0, 0, 0]);
    expect(box.max.toArray()).toEqual([1, 1, 1]);
  });
  it('Seiten sind wie in Minecraft schattiert', () => {
    const farben = getGeometry('cube').getAttribute('color').array as Float32Array;
    const werte = new Set(Array.from(farben).map((v) => Math.round(v * 10) / 10));
    expect([...werte].sort()).toEqual([0.5, 0.6, 0.8, 1]);
  });
});

describe('Renderer', () => {
  const p = emptyProject('Turm');
  for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) for (let z = 0; z < 3; z++) p.blocks.push({ x, y, z, type: 'stone_bricks', floor: 0, step: y < 2 ? 1 : 3, part: 'wall' });
  const r = new BlockRenderer();
  r.setProject(p);
  r.setView({ ...DEFAULT_VIEW, step: 8 });
  it('lässt verdeckte Würfel weg', () => {
    expect(r.stats().instances).toBe(45 - 3); // die mittlere Säule (y 1–3) ist rundum verdeckt
  });
  it('findet Blöcke per Blickstrahl im Raster', () => {
    const hit = r.pickVoxel(new THREE.Vector3(1.5, 20, 1.5), new THREE.Vector3(0, -1, 0));
    expect(hit?.block).toMatchObject({ x: 1, y: 4, z: 1 });
    expect(hit?.normal.toArray()).toEqual([0, 1, 0]);
  });
  it('respektiert die Bauphase beim Treffer-Test und beim Zeichnen', () => {
    r.setView({ ...DEFAULT_VIEW, step: 1 });
    expect(r.pickVoxel(new THREE.Vector3(1.5, 20, 1.5), new THREE.Vector3(0, -1, 0))?.block.y).toBe(1);
    expect(r.stats().instances).toBe(18); // Ebenen 0 und 1, die Mitte ist oben offen
  });
  it('Blöcke setzen und entfernen', () => {
    r.setView({ ...DEFAULT_VIEW, step: 8 });
    r.setBlock({ x: 5, y: 0, z: 5, type: 'oak_planks', floor: 0, step: 8, part: 'floor' });
    expect(r.blockAt(5, 0, 5)?.type).toBe('oak_planks');
    r.removeBlock(0, 0, 0);
    expect(r.blockAt(0, 0, 0)).toBeUndefined();
    expect(r.blockCount).toBe(45);
    expect(r.blockAt(5, 0, 5)?.type).toBe('oak_planks');
  });
});

describe('2D-Plan', () => {
  it('nimmt je Spalte den obersten sichtbaren Block', () => {
    const p = projectFromJson(demo);
    const plan = buildPlan(p, { ...DEFAULT_VIEW, step: 8 });
    expect(plan.w).toBe(49); // Ringmauer 47 breit, die Turmhelme ragen je einen Block über
    const mitte = plan.top[(16 - plan.bounds.min[2]) * plan.w + (23 - plan.bounds.min[0])];
    expect(mitte?.part).toBe('roof');
    const nurFundament = buildPlan(p, { ...DEFAULT_VIEW, step: 1 });
    expect(nurFundament.top.filter(Boolean).every((b) => b!.step === 1)).toBe(true);
  });
});
