import * as THREE from 'three';
import type { BlockData, BuildProject } from '../builder/BuildProject';
import { blockKey } from '../builder/BuildProject';
import { blockVisibility, type ViewState, type Visibility } from '../builder/ViewFilter';
import { blockInfo, shapeOf } from './BlockTypes';
import { getGeometry, shapeKey } from './Shapes';
import { getTexture } from './Textures';

/**
 * Zeichnet die Blöcke eines Projekts.
 * - Die Welt ist in Chunks (16³, bei großen Projekten 32³) aufgeteilt; geändert werden nur betroffene Chunks.
 * - Je Chunk gibt es pro Kombination aus Form, Textur und Darstellungsart genau ein InstancedMesh.
 * - Vollständig verdeckte Würfel werden gar nicht erst gezeichnet.
 * - Materialien und Texturen werden über den ganzen Renderer wiederverwendet.
 */

let CHUNK = 16;
const chunkKey = (x: number, y: number, z: number) => `${Math.floor(x / CHUNK)},${Math.floor(y / CHUNK)},${Math.floor(z / CHUNK)}`;

interface Chunk {
  indices: number[];
  meshes: THREE.InstancedMesh[];
}

export interface PickResult {
  index: number;
  block: BlockData;
  normal: THREE.Vector3;
}

export class BlockRenderer {
  readonly group = new THREE.Group();
  private blocks: BlockData[] = [];
  private index = new Map<number, number>();
  private chunks = new Map<string, Chunk>();
  private visibility = new Uint8Array(0);
  private view: ViewState | null = null;
  private floorOrder = new Map<number, number>();
  private materials = new Map<string, THREE.Material | THREE.Material[]>();
  private matrix = new THREE.Matrix4();

  setProject(project: BuildProject): void {
    this.blocks = project.blocks;
    // große Welten in größere Chunks teilen → weniger Zeichenaufrufe
    for (const c of this.chunks.values()) this.disposeChunk(c);
    this.chunks.clear();
    CHUNK = project.blocks.length > 150000 ? 32 : 16;
    this.index.clear();
    this.blocks.forEach((b, i) => this.index.set(blockKey(b.x, b.y, b.z), i));
    this.floorOrder = new Map(project.floors.map((f, i) => [f.id, i]));
    for (const c of this.chunks.values()) this.disposeChunk(c);
    this.chunks.clear();
    this.blocks.forEach((b, i) => this.chunkFor(b).indices.push(i));
    if (this.view) this.setView(this.view);
  }

  setView(view: ViewState): void {
    const explodeChanged = !this.view || this.view.explode !== view.explode;
    this.view = view;
    const neu = new Uint8Array(this.blocks.length);
    for (let i = 0; i < this.blocks.length; i++) neu[i] = blockVisibility(this.blocks[i], view);
    const alt = this.visibility;
    this.visibility = neu;
    // nur Chunks neu bauen, in denen sich etwas geändert hat (plus Nachbarn wegen verdeckter Flächen)
    const geaendert = new Set<string>();
    for (const [key, c] of this.chunks) {
      if (explodeChanged || alt.length !== neu.length || c.indices.some((i) => alt[i] !== neu[i])) geaendert.add(key);
    }
    const mitNachbarn = new Set<string>(geaendert);
    for (const key of geaendert) {
      const [cx, cy, cz] = key.split(',').map(Number);
      for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        const n = `${cx + dx},${cy + dy},${cz + dz}`;
        if (this.chunks.has(n)) mitNachbarn.add(n);
      }
    }
    for (const key of mitNachbarn) this.rebuildChunk(key);
  }

  /** Block hinzufügen oder ersetzen (Bearbeiten-Modus) */
  setBlock(b: BlockData): void {
    const k = blockKey(b.x, b.y, b.z);
    const vorhanden = this.index.get(k);
    if (vorhanden !== undefined) {
      this.blocks[vorhanden] = b;
    } else {
      this.blocks.push(b);
      const i = this.blocks.length - 1;
      this.index.set(k, i);
      this.chunkFor(b).indices.push(i);
      const v = new Uint8Array(this.blocks.length);
      v.set(this.visibility);
      this.visibility = v;
    }
    const i = this.index.get(k)!;
    if (this.view) this.visibility[i] = blockVisibility(b, this.view);
    this.rebuildAround(b.x, b.y, b.z);
  }

  removeBlock(x: number, y: number, z: number): void {
    const k = blockKey(x, y, z);
    const i = this.index.get(k);
    if (i === undefined) return;
    // letztes Element an die Stelle verschieben, damit das Array dicht bleibt
    const letzter = this.blocks.length - 1;
    const lb = this.blocks[letzter];
    const chunkI = this.chunks.get(chunkKey(x, y, z))!;
    chunkI.indices = chunkI.indices.filter((n) => n !== i);
    if (i !== letzter) {
      this.blocks[i] = lb;
      this.visibility[i] = this.visibility[letzter];
      this.index.set(blockKey(lb.x, lb.y, lb.z), i);
      const cl = this.chunks.get(chunkKey(lb.x, lb.y, lb.z))!;
      cl.indices = cl.indices.map((n) => (n === letzter ? i : n));
      this.rebuildChunk(chunkKey(lb.x, lb.y, lb.z));
    }
    this.blocks.pop();
    this.visibility = this.visibility.slice(0, this.blocks.length);
    this.index.delete(k);
    this.rebuildAround(x, y, z);
  }

  blockAt(x: number, y: number, z: number): BlockData | undefined {
    const i = this.index.get(blockKey(x, y, z));
    return i === undefined ? undefined : this.blocks[i];
  }

  /** Ergebnis eines Raycasts auf ein InstancedMesh in einen Block übersetzen */
  resolvePick(hit: THREE.Intersection): PickResult | null {
    const mesh = hit.object as THREE.InstancedMesh;
    const indices = mesh.userData.indices as number[] | undefined;
    if (!indices || hit.instanceId === undefined) return null;
    const index = indices[hit.instanceId];
    const block = this.blocks[index];
    if (!block) return null;
    const normal = hit.face ? hit.face.normal.clone() : new THREE.Vector3(0, 1, 0);
    return { index, block, normal };
  }

  /**
   * Schneller Treffer-Test direkt im Blockraster (statt Raycast über alle Instanzen).
   * Liefert null, wenn die Explosionsansicht aktiv ist – dann greift der normale Raycast.
   */
  pickVoxel(o: THREE.Vector3, d: THREE.Vector3, maxDist = 300): PickResult | null | undefined {
    if (this.view?.explode) return undefined;
    let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
    const sx = Math.sign(d.x), sy = Math.sign(d.y), sz = Math.sign(d.z);
    const tdx = Math.abs(1 / d.x), tdy = Math.abs(1 / d.y), tdz = Math.abs(1 / d.z);
    let tx = (sx > 0 ? x + 1 - o.x : o.x - x) * tdx, ty = (sy > 0 ? y + 1 - o.y : o.y - y) * tdy, tz = (sz > 0 ? z + 1 - o.z : o.z - z) * tdz;
    const normal = new THREE.Vector3();
    for (let t = 0; t < maxDist;) {
      const i = this.index.get(blockKey(x, y, z));
      if (i !== undefined && (this.visibility[i] === 1 || this.visibility[i] === 3)) return { index: i, block: this.blocks[i], normal: normal.clone() };
      if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; normal.set(-sx, 0, 0); }
      else if (ty < tz) { y += sy; t = ty; ty += tdy; normal.set(0, -sy, 0); }
      else { z += sz; t = tz; tz += tdz; normal.set(0, 0, -sz); }
    }
    return null;
  }

  get blockCount(): number {
    return this.blocks.length;
  }

  stats(): { meshes: number; instances: number } {
    let meshes = 0, instances = 0;
    for (const c of this.chunks.values()) { meshes += c.meshes.length; for (const m of c.meshes) instances += m.count; }
    return { meshes, instances };
  }

  dispose(): void {
    for (const c of this.chunks.values()) this.disposeChunk(c);
    this.chunks.clear();
    for (const m of this.materials.values()) (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose());
    this.materials.clear();
  }

  // ------------------------------------------------------------------ intern

  private chunkFor(b: BlockData): Chunk {
    const key = chunkKey(b.x, b.y, b.z);
    let c = this.chunks.get(key);
    if (!c) { c = { indices: [], meshes: [] }; this.chunks.set(key, c); }
    return c;
  }

  private rebuildAround(x: number, y: number, z: number): void {
    const keys = new Set<string>();
    for (const [dx, dy, dz] of [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) keys.add(chunkKey(x + dx, y + dy, z + dz));
    for (const k of keys) if (this.chunks.has(k)) this.rebuildChunk(k);
  }

  private disposeChunk(c: Chunk): void {
    for (const m of c.meshes) { this.group.remove(m); m.dispose(); }
    c.meshes = [];
  }

  private explodeOffset(b: BlockData): number {
    return this.view && this.view.explode ? (this.floorOrder.get(b.floor) ?? 0) * this.view.explode : 0;
  }

  /** Ist der Würfel von allen sechs Seiten durch sichtbare, undurchsichtige Würfel verdeckt? */
  private verdeckt(b: BlockData): boolean {
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const n = this.index.get(blockKey(b.x + dx, b.y + dy, b.z + dz));
      if (n === undefined) return false;
      const vis = this.visibility[n];
      if (vis !== 1 && vis !== 3) return false;
      const nb = this.blocks[n];
      if (!blockInfo(nb.type).opaque) return false;
      if (this.view?.explode && nb.floor !== b.floor) return false;
    }
    return true;
  }

  private material(texKey: string, art: Visibility, wuerfel: boolean, type: string): THREE.Material | THREE.Material[] {
    const key = `${texKey}|${art}|${wuerfel ? 'w' : 'e'}`;
    const vorhanden = this.materials.get(key);
    if (vorhanden) return vorhanden;
    const info = blockInfo(type);
    const mach = (texName: string) => {
      const durchsichtig = art === 2 || info.translucent;
      const m = new THREE.MeshLambertMaterial({
        map: getTexture(texName),
        transparent: durchsichtig,
        opacity: art === 2 ? 0.22 : 1,
        alphaTest: durchsichtig ? 0.02 : 0.5,
        depthWrite: !durchsichtig,
        side: shapeOf(type) === 'cross' ? THREE.DoubleSide : THREE.FrontSide
      });
      if (art === 3) { m.emissive = new THREE.Color('#ffb200'); m.emissiveIntensity = 0.28; }
      return m;
    };
    const t = info.tex;
    const mat = wuerfel ? [mach(t.side), mach(t.side), mach(t.top), mach(t.bottom), mach(t.side), mach(t.side)] : mach(t.side);
    this.materials.set(key, mat);
    return mat;
  }

  private rebuildChunk(key: string): void {
    const c = this.chunks.get(key);
    if (!c) return;
    this.disposeChunk(c);
    const gruppen = new Map<string, { geom: string; type: string; art: Visibility; idx: number[] }>();
    for (const i of c.indices) {
      const art = this.visibility[i] as Visibility;
      if (!art) continue;
      const b = this.blocks[i];
      const form = shapeKey(b.type, b.props);
      if (form === 'cube' && art !== 2 && this.verdeckt(b)) continue;
      const info = blockInfo(b.type);
      const g = `${form}|${info.tex.top}|${info.tex.side}|${info.tex.bottom}|${art}`;
      let e = gruppen.get(g);
      if (!e) { e = { geom: form, type: b.type, art, idx: [] }; gruppen.set(g, e); }
      e.idx.push(i);
    }
    for (const e of gruppen.values()) {
      const info = blockInfo(e.type);
      const wuerfel = e.geom === 'cube';
      const texKey = `${info.tex.top}/${info.tex.side}/${info.tex.bottom}`;
      const mesh = new THREE.InstancedMesh(getGeometry(e.geom), this.material(texKey, e.art, wuerfel, e.type), e.idx.length);
      e.idx.forEach((i, n) => {
        const b = this.blocks[i];
        this.matrix.makeTranslation(b.x, b.y + this.explodeOffset(b), b.z);
        mesh.setMatrixAt(n, this.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.userData.indices = e.idx;
      if (e.art === 2 || info.translucent) mesh.renderOrder = 1;
      this.group.add(mesh);
      c.meshes.push(mesh);
    }
  }
}
