import * as THREE from 'three';

/**
 * Flugsteuerung wie im Kreativmodus:
 * W/A/S/D bewegen, Leertaste hoch, Strg (oder C) runter, Shift schneller,
 * Maus = Blickrichtung (nach Klick eingefangen, ESC gibt die Maus frei).
 * Ohne eingefangene Maus kann man mit gedrückter Maustaste ziehen.
 */
export class CameraController {
  yaw = 0;
  pitch = 0;
  speed = 12;
  private keys = new Set<string>();
  private dragging: { x: number; y: number; moved: boolean } | null = null;
  private velocity = new THREE.Vector3();
  onLockChange?: (locked: boolean) => void;
  /** Klick ohne Ziehen (für Block-Auswahl im entsperrten Zustand) */
  onClick?: (ev: MouseEvent) => void;

  constructor(private camera: THREE.PerspectiveCamera, private dom: HTMLElement) {
    dom.addEventListener('mousedown', this.mouseDown);
    window.addEventListener('mousemove', this.mouseMove);
    window.addEventListener('mouseup', this.mouseUp);
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    window.addEventListener('blur', this.blur);
    document.addEventListener('pointerlockchange', this.lockChange);
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
    dom.addEventListener('wheel', this.wheel, { passive: false });
  }

  get locked(): boolean {
    return document.pointerLockElement === this.dom;
  }

  lock(): void {
    try {
      const r = this.dom.requestPointerLock() as unknown as Promise<void> | undefined;
      if (r && typeof r.catch === 'function') r.catch(() => undefined);
    } catch {
      /* Pointer-Lock nicht verfügbar – Ziehen funktioniert weiterhin */
    }
  }

  unlock(): void {
    if (this.locked) document.exitPointerLock();
  }

  lookAt(position: THREE.Vector3, target: THREE.Vector3): void {
    this.camera.position.copy(position);
    const d = target.clone().sub(position).normalize();
    this.yaw = Math.atan2(-d.x, -d.z);
    this.pitch = Math.asin(THREE.MathUtils.clamp(d.y, -1, 1));
    this.apply();
  }

  update(dt: number): void {
    const vor = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
    const seit = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    const hoch = (this.keys.has('Space') ? 1 : 0) - (this.keys.has('ControlLeft') || this.keys.has('ControlRight') || this.keys.has('KeyC') ? 1 : 0);
    const schnell = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 3 : 1;
    const ziel = new THREE.Vector3();
    const vorwaerts = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const rechts = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    ziel.addScaledVector(vorwaerts, vor).addScaledVector(rechts, seit);
    if (ziel.lengthSq() > 0) ziel.normalize();
    ziel.y = hoch;
    ziel.multiplyScalar(this.speed * schnell);
    // weiches Beschleunigen und Abbremsen wie im Spiel
    this.velocity.lerp(ziel, 1 - Math.exp(-dt * 10));
    this.camera.position.addScaledVector(this.velocity, dt);
    this.apply();
  }

  dispose(): void {
    this.dom.removeEventListener('mousedown', this.mouseDown);
    this.dom.removeEventListener('wheel', this.wheel);
    window.removeEventListener('mousemove', this.mouseMove);
    window.removeEventListener('mouseup', this.mouseUp);
    window.removeEventListener('keydown', this.keyDown);
    window.removeEventListener('keyup', this.keyUp);
    window.removeEventListener('blur', this.blur);
    document.removeEventListener('pointerlockchange', this.lockChange);
  }

  private apply(): void {
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  private turn(dx: number, dy: number, faktor: number): void {
    this.yaw -= dx * faktor;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * faktor, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
  }

  private mouseDown = (e: MouseEvent) => {
    if (this.locked) return;
    this.dragging = { x: e.clientX, y: e.clientY, moved: false };
  };

  private mouseMove = (e: MouseEvent) => {
    if (this.locked) { this.turn(e.movementX, e.movementY, 0.0024); return; }
    if (!this.dragging) return;
    const dx = e.clientX - this.dragging.x, dy = e.clientY - this.dragging.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) this.dragging.moved = true;
    if (this.dragging.moved) { this.turn(dx, dy, 0.004); this.dragging.x = e.clientX; this.dragging.y = e.clientY; }
  };

  private mouseUp = (e: MouseEvent) => {
    if (this.dragging && !this.dragging.moved && e.target === this.dom) this.onClick?.(e);
    this.dragging = null;
  };

  private keyDown = (e: KeyboardEvent) => {
    const ziel = e.target as HTMLElement;
    if (ziel && (ziel.tagName === 'INPUT' || ziel.tagName === 'TEXTAREA' || ziel.tagName === 'SELECT')) return;
    this.keys.add(e.code);
    // Browser-Kürzel unterdrücken, die beim Fliegen stören (Strg+S/D/A). Strg+W lässt sich nicht abfangen.
    if (e.code === 'Space' || ((e.ctrlKey || e.metaKey) && ['KeyS', 'KeyD', 'KeyA'].includes(e.code))) e.preventDefault();
  };

  private keyUp = (e: KeyboardEvent) => { this.keys.delete(e.code); };
  /** Mausrad: ein Stück vorwärts bzw. zurück fliegen */
  private wheel = (e: WheelEvent) => {
    e.preventDefault();
    const schritt = -Math.sign(e.deltaY) * Math.max(1, this.speed * 0.25);
    const richtung = new THREE.Vector3(0, 0, -1).applyEuler(this.camera.rotation);
    this.camera.position.addScaledVector(richtung, schritt);
  };
  private blur = () => { this.keys.clear(); };
  private lockChange = () => { this.onLockChange?.(this.locked); };
}
