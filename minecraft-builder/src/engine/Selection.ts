import * as THREE from 'three';
import type { BlockRenderer, PickResult } from './BlockRenderer';

/** Block unter dem Mauszeiger bzw. Fadenkreuz finden und mit einem Rahmen markieren. */
export class Selection {
  private raycaster = new THREE.Raycaster();
  readonly outline: THREE.LineSegments;
  current: PickResult | null = null;

  constructor(private camera: THREE.Camera, private renderer: BlockRenderer) {
    this.raycaster.far = 300;
    this.outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004)),
      new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.85 })
    );
    this.outline.visible = false;
  }

  /** ndc: Bildschirmposition von -1..1; ohne Angabe die Bildmitte (Fadenkreuz) */
  pick(ndc?: THREE.Vector2): PickResult | null {
    this.raycaster.setFromCamera(ndc ?? new THREE.Vector2(0, 0), this.camera);
    const schnell = this.renderer.pickVoxel(this.raycaster.ray.origin, this.raycaster.ray.direction, this.raycaster.far);
    if (schnell !== undefined) {
      this.current = schnell;
      if (schnell) {
        this.outline.position.set(schnell.block.x + 0.5, schnell.block.y + 0.5, schnell.block.z + 0.5);
        this.outline.visible = true;
      } else this.outline.visible = false;
      return schnell;
    }
    const hits = this.raycaster.intersectObjects(this.renderer.group.children, false);
    for (const hit of hits) {
      const mat = (hit.object as THREE.Mesh).material as THREE.Material | THREE.Material[];
      const erstes = Array.isArray(mat) ? mat[0] : mat;
      if (erstes.opacity < 0.5) continue; // durchsichtige Bauteile überspringen
      const r = this.renderer.resolvePick(hit);
      if (r) {
        const p = new THREE.Vector3();
        const m = new THREE.Matrix4();
        (hit.object as THREE.InstancedMesh).getMatrixAt(hit.instanceId!, m);
        p.setFromMatrixPosition(m);
        this.outline.position.set(p.x + 0.5, p.y + 0.5, p.z + 0.5);
        this.outline.visible = true;
        this.current = r;
        return r;
      }
    }
    this.outline.visible = false;
    this.current = null;
    return null;
  }

  clear(): void {
    this.outline.visible = false;
    this.current = null;
  }
}
