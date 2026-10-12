import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { exportJson, projectFromJson, readLitematic, readSponge, toCompact, schematicToProject } from '../src/import/ProjectImport';
import { gunzip, readNbt } from '../src/import/Nbt';
import { readBinaryProject } from '../src/import/BinaryProject';
import { autoClassify, classifyPart } from '../src/import/AutoClassify';
import { PART_ORDER, blockKey, type BuildProject } from '../src/builder/BuildProject';
import demo from '../src/data/demoCastle.json';

const wurzel = join(__dirname, '..', '..');
const ab = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

function pruefeProjekt(p: BuildProject) {
  const ids = new Set(p.steps.map((s) => s.id));
  const etagen = new Set(p.floors.map((f) => f.id));
  const orte = new Set<number>();
  for (const b of p.blocks) {
    expect(ids.has(b.step), `Etappe ${b.step} fehlt`).toBe(true);
    expect(etagen.has(b.floor), `Stockwerk ${b.floor} fehlt`).toBe(true);
    expect(PART_ORDER).toContain(b.part);
    orte.add(blockKey(b.x, b.y, b.z));
  }
  expect(orte.size, 'doppelte Blockpositionen').toBe(p.blocks.length);
}

describe('Beispielburg', () => {
  const p = projectFromJson(demo);
  it('ist vollständig und stimmig', () => {
    expect(p.blocks.length).toBe(9667);
    expect(p.steps.map((s) => s.name)).toEqual(['Fundament', 'Boden', 'Außenwände', 'Innenwände', 'Fenster und Türen', 'Weitere Stockwerke', 'Dach', 'Dekoration']);
    pruefeProjekt(p);
  });
  it('jede Etappe hat Blöcke', () => {
    for (const s of p.steps) expect(p.blocks.some((b) => b.step === s.id), s.name).toBe(true);
  });
});

describe('JSON-Export und -Import', () => {
  const p = projectFromJson(demo);
  it('ausführliches Format übersteht Hin und Zurück unverändert', () => {
    const zurueck = projectFromJson(JSON.parse(exportJson(p, false)));
    expect(zurueck.blocks).toEqual(p.blocks);
    expect(zurueck.steps).toEqual(p.steps);
    expect(zurueck.floors).toEqual(p.floors);
  });
  it('kompaktes Format übersteht Hin und Zurück unverändert', () => {
    const zurueck = projectFromJson(JSON.parse(JSON.stringify(toCompact(p))));
    expect(zurueck.blocks).toEqual(p.blocks);
    expect(zurueck.name).toBe(p.name);
  });
});

describe('Litematica-Import', () => {
  it('liest die Hogwarts-Brücke Block für Block', async () => {
    const nbt = readNbt(await gunzip(ab(readFileSync(join(wurzel, 'schematics', 'hogwarts-bruecke.litematic')))));
    const roh = readLitematic(nbt);
    expect(roh.length).toBe(58213);
    // Blockwechsel: Tuff, Tiefenschiefer und gemeißelte Nischen geben der Brücke Tiefe
    for (const t of ['tuff', 'deepslate_bricks', 'deepslate_tiles', 'chiseled_stone_bricks', 'polished_andesite']) expect(roh.some((b) => b.type === t)).toBe(true);
    expect(roh.some((b) => b.type === 'stone_brick_stairs' && b.props?.half === 'top')).toBe(true);
    const p = schematicToProject('Brücke', roh);
    pruefeProjekt(p);
  });
  it('liest mehrere Regionen (Gesamtdatei) mit Versatz', async () => {
    const nbt = readNbt(await gunzip(ab(readFileSync(join(wurzel, 'schematics', 'hogwarts-hagrids-huette.litematic')))));
    const roh = readLitematic(nbt);
    expect(roh.length).toBe(821);
    expect(Math.min(...roh.map((b) => b.y))).toBe(0);
  });
});

/** Kleiner NBT-Schreiber nur für den Sponge-Test */
function nbtSponge(): ArrayBuffer {
  const teile: number[] = [];
  const u8 = (n: number) => teile.push(n & 255);
  const i16 = (n: number) => { u8(n >> 8); u8(n); };
  const i32 = (n: number) => { u8(n >> 24); u8(n >> 16); u8(n >> 8); u8(n); };
  const str = (s: string) => { const b = Buffer.from(s); i16(b.length); b.forEach(u8); };
  const tag = (t: number, name: string) => { u8(t); str(name); };
  tag(10, 'Schematic');
  tag(3, 'Version'); i32(2);
  tag(2, 'Width'); i16(3); tag(2, 'Height'); i16(1); tag(2, 'Length'); i16(1);
  tag(10, 'Palette');
  tag(3, 'minecraft:air'); i32(0); tag(3, 'minecraft:stone'); i32(1); tag(3, 'minecraft:oak_stairs[facing=east,half=bottom]'); i32(2);
  u8(0);
  tag(7, 'BlockData'); i32(3); u8(1); u8(0); u8(2);
  u8(0);
  return ab(gzipSync(Buffer.from(teile)));
}

describe('Sponge-Import (.schem)', () => {
  it('liest Palette, Blockdaten und Zustände', async () => {
    const roh = readSponge(readNbt(await gunzip(nbtSponge())));
    expect(roh).toEqual([
      { x: 0, y: 0, z: 0, type: 'stone', props: undefined },
      { x: 2, y: 0, z: 0, type: 'oak_stairs', props: { facing: 'east', half: 'bottom' } }
    ]);
  });
});

describe('Automatische Einteilung', () => {
  it('erkennt Bauteile am Blocktyp', () => {
    expect(classifyPart({ x: 0, y: 5, z: 0, type: 'glass_pane' }, 0, false)).toBe('window');
    expect(classifyPart({ x: 0, y: 5, z: 0, type: 'deepslate_tile_stairs' }, 0, false)).toBe('roof');
    expect(classifyPart({ x: 0, y: 0, z: 0, type: 'cobblestone' }, 0, true)).toBe('foundation');
    expect(classifyPart({ x: 0, y: 5, z: 0, type: 'oak_door' }, 0, false)).toBe('door');
    expect(classifyPart({ x: 0, y: 5, z: 0, type: 'lantern' }, 0, false)).toBe('decoration');
    expect(classifyPart({ x: 0, y: 5, z: 0, type: 'stone_bricks' }, 0, true)).toBe('wall');
  });
  it('teilt Stockwerke alle 6 Blöcke und vergibt Etappen', () => {
    const c = autoClassify([{ x: 0, y: 10, z: 0, type: 'stone_bricks' }, { x: 0, y: 17, z: 0, type: 'stone_bricks' }, { x: 0, y: 30, z: 0, type: 'deepslate_tile_stairs' }]);
    expect(c.floors.length).toBe(4);
    expect(c.blocks.map((b) => b.floor)).toEqual([0, 1, 3]);
    expect(c.blocks[2].step).toBe(7);
  });
});

describe('Hogwarts-Baupläne (.mcbp)', () => {
  it('nur Schloss: vollständig, 7 Etappen, keine doppelten Blöcke', async () => {
    const p = await readBinaryProject(ab(readFileSync(join(__dirname, '..', 'public', 'projekte', 'hogwarts-schloss.mcbp.gz'))));
    expect(p.blocks.length).toBeGreaterThan(240000);
    expect(p.blocks.length).toBeLessThan(300000);
    expect(p.steps.length).toBe(7);
    pruefeProjekt(p);
  });
  it('mit Berg: über eine Million Blöcke, 10 Etappen, alle gültig', async () => {
    const p = await readBinaryProject(ab(readFileSync(join(__dirname, '..', 'public', 'projekte', 'hogwarts.mcbp.gz'))));
    expect(p.blocks.length).toBeGreaterThan(1_000_000);
    expect(p.steps.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    pruefeProjekt(p);
    // Schloss steht auf dem Plateau (Y 111), das Wasser am Rand auf Y 3
    expect(p.blocks.some((b) => b.type === 'water' && b.x === 0 && b.y === 3)).toBe(true);
    // Großer Burgturm als eigene Etappe am Seeufer, mit Ziegeldächern
    const turm = p.blocks.filter((b) => b.step === 10);
    expect(turm.length).toBeGreaterThan(5000);
    expect(turm.every((b) => b.x >= 53 && b.x < 76 && b.z >= 325 && b.z < 348)).toBe(true);
    expect(turm.some((b) => b.type === 'brick_stairs')).toBe(true);
  });
  it('Schloss-Details: Fallgitter, Zugbrücke mit Ketten, Fachwerk und Drachenbrunnen', async () => {
    const p = await readBinaryProject(ab(readFileSync(join(__dirname, '..', 'public', 'projekte', 'hogwarts-schloss.mcbp.gz'))));
    const anzahl = (t: string) => p.blocks.filter((b) => b.type === t).length;
    expect(anzahl('iron_bars')).toBeGreaterThanOrEqual(8);
    expect(anzahl('chain')).toBeGreaterThan(10);
    expect(anzahl('birch_planks')).toBeGreaterThan(100);
    expect(anzahl('spruce_fence')).toBeGreaterThanOrEqual(10);
    // Fachwerk gehört zur Turm-Etappe, nicht zum Wald
    expect(p.blocks.filter((b) => b.type === 'birch_planks').every((b) => b.step === 4)).toBe(true);
  });
  it('lehnt falsche Dateien ab', async () => {
    await expect(readBinaryProject(ab(gzipSync(Buffer.from('kein bauplan'))))).rejects.toThrow(/mcbp/);
  });
});
