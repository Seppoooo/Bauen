import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { shapeOf } from './BlockTypes';

/**
 * Geometrien für Blockformen. Alle liegen im Einheitswürfel [0,1]³ und werden
 * per InstancedMesh an die Blockposition verschoben. Jede Form wird nur einmal erzeugt.
 */

type Box = [number, number, number, number, number, number]; // x0,y0,z0,x1,y1,z1

function box([x0, y0, z0, x1, y1, z1]: Box): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  // UVs an die Teilgröße anpassen, damit Stufen und Treppen keine gestauchten Texturen haben
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  const flaechen: [number, number, number, number][] = [
    [1 - z1, 1 - z0, y0, y1], [z0, z1, y0, y1], // +x, -x
    [x0, x1, 1 - z1, 1 - z0], [x0, x1, z0, z1], // +y, -y
    [x0, x1, y0, y1], [1 - x1, 1 - x0, y0, y1]  // +z, -z
  ];
  for (let f = 0; f < 6; f++) {
    const [u0, u1, v0, v1] = flaechen[f];
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, uv.getX(k) ? u1 : u0, uv.getY(k) ? v1 : v0);
    }
  }
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}

function kreuz(): THREE.BufferGeometry {
  const a = new THREE.PlaneGeometry(1.2, 0.95);
  a.rotateY(Math.PI / 4); a.translate(0.5, 0.475, 0.5);
  const b = new THREE.PlaneGeometry(1.2, 0.95);
  b.rotateY(-Math.PI / 4); b.translate(0.5, 0.475, 0.5);
  return mergeGeometries([a, b])!;
}

const cache = new Map<string, THREE.BufferGeometry>();

/** Schlüssel der Geometrie für Typ + Zustände (z. B. Treppenrichtung) */
export function shapeKey(type: string, props?: Record<string, string>): string {
  const s = shapeOf(type);
  const p = props ?? {};
  switch (s) {
    case 'stairs': return `stairs:${p.facing ?? 'north'}:${p.half ?? 'bottom'}`;
    case 'slab': return `slab:${p.type ?? 'bottom'}`;
    case 'pane': return `pane:${p.east === 'true' || p.west === 'true' ? 'ew' : p.north === 'true' || p.south === 'true' ? 'ns' : 'post'}`;
    case 'thin': return `thin:${p.facing ?? 'north'}:${type.endsWith('_trapdoor') ? (p.open === 'true' ? 'open' : p.half ?? 'bottom') : 'ladder'}`;
    case 'door': return `door:${p.facing ?? 'north'}`;
    case 'post': return `post:${type.includes('fence') ? 'fence' : 'thin'}:${['north', 'east', 'south', 'west'].filter((r) => p[r] === 'true').join('')}`;
    default: return s;
  }
}

export function getGeometry(key: string): THREE.BufferGeometry {
  const vorhanden = cache.get(key);
  if (vorhanden) return vorhanden;
  const [form, a, b] = key.split(':');
  let g: THREE.BufferGeometry;
  switch (form) {
    case 'cube': g = box([0, 0, 0, 1, 1, 1]); break;
    case 'slab': g = box(a === 'top' ? [0, 0.5, 0, 1, 1, 1] : a === 'double' ? [0, 0, 0, 1, 1, 1] : [0, 0, 0, 1, 0.5, 1]); break;
    case 'stairs': {
      const oben = b === 'top';
      const y0 = oben ? 0 : 0.5, y1 = oben ? 0.5 : 1;
      const teil: Record<string, Box> = {
        north: [0, y0, 0, 1, y1, 0.5], south: [0, y0, 0.5, 1, y1, 1], east: [0.5, y0, 0, 1, y1, 1], west: [0, y0, 0, 0.5, y1, 1]
      };
      g = mergeGeometries([box(oben ? [0, 0.5, 0, 1, 1, 1] : [0, 0, 0, 1, 0.5, 1]), box(teil[a] ?? teil.north)])!;
      break;
    }
    case 'pane': g = box(a === 'ew' ? [0, 0, 0.44, 1, 1, 0.56] : a === 'ns' ? [0.44, 0, 0, 0.56, 1, 1] : [0.44, 0, 0.44, 0.56, 1, 0.56]); break;
    case 'wall': g = box([0.25, 0, 0.25, 0.75, 1, 0.75]); break;
    case 'post': {
      if (a !== 'fence') { g = box([0.44, 0, 0.44, 0.56, 1, 0.56]); break; }
      const teile = [box([0.375, 0, 0.375, 0.625, 1, 0.625])];
      for (const [y0, y1] of [[0.38, 0.56], [0.75, 0.93]]) {
        if (b.includes('north')) teile.push(box([0.44, y0, 0, 0.56, y1, 0.375]));
        if (b.includes('south')) teile.push(box([0.44, y0, 0.625, 0.56, y1, 1]));
        if (b.includes('west')) teile.push(box([0, y0, 0.44, 0.375, y1, 0.56]));
        if (b.includes('east')) teile.push(box([0.625, y0, 0.44, 1, y1, 0.56]));
      }
      g = mergeGeometries(teile)!;
      break;
    }
    case 'cross': g = kreuz(); break;
    case 'carpet': g = box([0, 0, 0, 1, 0.0625, 1]); break;
    case 'small': g = box([0.3, 0, 0.3, 0.7, 0.55, 0.7]); break;
    case 'thin': {
      const dicke = 0.1875;
      const platte: Record<string, Box> = {
        north: [0, 0, 1 - dicke, 1, 1, 1], south: [0, 0, 0, 1, 1, dicke], east: [0, 0, 0, dicke, 1, 1], west: [1 - dicke, 0, 0, 1, 1, 1]
      };
      if (b === 'bottom') g = box([0, 0, 0, 1, dicke, 1]);
      else if (b === 'top') g = box([0, 1 - dicke, 0, 1, 1, 1]);
      else g = box(platte[a] ?? platte.north);
      break;
    }
    case 'door': {
      const d = 0.1875;
      const platte: Record<string, Box> = {
        north: [0, 0, 1 - d, 1, 1, 1], south: [0, 0, 0, 1, 1, d], east: [0, 0, 0, d, 1, 1], west: [1 - d, 0, 0, 1, 1, 1]
      };
      g = box(platte[a] ?? platte.north);
      break;
    }
    default: g = box([0, 0, 0, 1, 1, 1]);
  }
  cache.set(key, g);
  return g;
}
