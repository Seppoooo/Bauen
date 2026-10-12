import * as THREE from 'three';
import type { BlockData, BuildProject, PartCategory } from '../builder/BuildProject';
import { projectBounds } from '../builder/BuildProject';
import { floorForY } from '../builder/Floors';
import type { ViewState } from '../builder/ViewFilter';
import { BlockRenderer, type PickResult } from './BlockRenderer';
import { CameraController } from './CameraController';
import { Selection } from './Selection';
import { getTexture } from './Textures';

/**
 * Die 3D-Engine. Sie kennt keine React-Komponenten: Die Oberfläche ruft nur
 * setProject / setView / setEdit usw. auf und bekommt Ereignisse über Callbacks zurück.
 */

export interface LivePlayer {
  name: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

export interface EngineEvents {
  onHover?: (pick: PickResult | null) => void;
  onLockChange?: (locked: boolean) => void;
  onCamera?: (pos: THREE.Vector3, yaw: number) => void;
  onLive?: (players: LivePlayer[], status: string) => void;
  onProjectEdited?: () => void;
  onSync?: (text: string) => void;
}

export interface EditOptions {
  enabled: boolean;
  type: string;
  part: PartCategory;
}

/** Wandelt eine Minecraft-Position (Füße, Yaw/Pitch in Grad) in Kameradaten um. */
export function minecraftToCamera(x: number, y: number, z: number, yawDeg: number, pitchDeg: number, origin: [number, number, number]) {
  return {
    pos: new THREE.Vector3(x - origin[0], y - origin[1] + 1.62, z - origin[2]),
    yaw: Math.PI - THREE.MathUtils.degToRad(yawDeg),
    pitch: -THREE.MathUtils.degToRad(pitchDeg)
  };
}

/** Liest den Text von F3+C: "/execute in minecraft:overworld run tp @s X Y Z YAW PITCH" */
export function parseF3C(text: string): number[] | null {
  const m = text.match(/tp\s+@s\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)/);
  return m ? m.slice(1, 6).map(Number) : null;
}

/** Einfache Spielerfigur mit Namensschild */
function spielerFigur(name: string): THREE.Group {
  const g = new THREE.Group();
  const farbe = new THREE.MeshLambertMaterial({ color: '#d6402f' });
  const koerper = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.3, 0.35), farbe);
  koerper.position.y = 0.65;
  const kopf = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshLambertMaterial({ color: '#e0b48c' }));
  kopf.position.y = 1.55;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const k = c.getContext('2d')!;
  k.fillStyle = 'rgba(0,0,0,0.55)'; k.fillRect(0, 8, 256, 48);
  k.fillStyle = '#fff'; k.font = 'bold 32px sans-serif'; k.textAlign = 'center'; k.fillText(name, 128, 44);
  const schild = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
  schild.scale.set(2.4, 0.6, 1);
  schild.position.y = 2.4;
  g.add(koerper, kopf, schild);
  return g;
}

export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(70, 1, 0.05, 2000);
  readonly blocks = new BlockRenderer();
  readonly controls: CameraController;
  readonly selection: Selection;
  private project: BuildProject | null = null;
  private view: ViewState | null = null;
  private edit: EditOptions = { enabled: false, type: 'stone_bricks', part: 'wall' };
  private clock = new THREE.Clock();
  private frame = 0;
  private hoverTakt = 0;
  private camTakt = 0;
  private mouse: THREE.Vector2 | null = null;
  private ground: THREE.Mesh;
  private resizeObserver: ResizeObserver;
  private live: WebSocket | null = null;
  private grid: THREE.Group | null = null;
  private spieler = new Map<string, { data: LivePlayer; figur: THREE.Group }>();
  /** Name des Spielers, dem die Kamera folgt („Position gesperrt“) */
  followPlayer: string | null = null;
  worldOrigin: [number, number, number] = [0, 0, 0];

  constructor(private container: HTMLElement, private events: EngineEvents = {}) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.tabIndex = 0;

    // Himmel mit Farbverlauf, Nebel am Horizont
    const himmel = new THREE.Mesh(
      new THREE.SphereGeometry(1500, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false,
        uniforms: { oben: { value: new THREE.Color('#5b8fd9') }, unten: { value: new THREE.Color('#cfe6ff') } },
        vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 oben; uniform vec3 unten; varying vec3 p; void main(){ gl_FragColor = vec4(mix(unten, oben, smoothstep(-0.05, 0.5, p.y)), 1.0); }'
      })
    );
    himmel.renderOrder = -1;
    this.scene.add(himmel);
    this.scene.fog = new THREE.Fog('#cfe6ff', 150, 900);

    // Licht: Himmel/Boden-Licht plus Sonne – ergibt die typische Seitenschattierung
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#6b6050', 1.6));
    const sonne = new THREE.DirectionalLight('#fff4e0', 1.5);
    sonne.position.set(0.6, 1, 0.35);
    this.scene.add(sonne);

    // Grasboden mit Kachel-Textur
    const grasTex = getTexture('grass_block_top').clone();
    grasTex.wrapS = grasTex.wrapT = THREE.RepeatWrapping;
    grasTex.repeat.set(1000, 1000);
    grasTex.needsUpdate = true;
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.MeshLambertMaterial({ map: grasTex }));
    this.ground.rotation.x = -Math.PI / 2;
    this.scene.add(this.ground);

    this.scene.add(this.blocks.group);
    this.selection = new Selection(this.camera, this.blocks);
    this.scene.add(this.selection.outline);

    this.controls = new CameraController(this.camera, this.renderer.domElement);
    this.controls.onLockChange = (l) => this.events.onLockChange?.(l);
    this.controls.onClick = (e) => this.handleClick(e);
    this.renderer.domElement.addEventListener('mousemove', this.trackMouse);
    this.renderer.domElement.addEventListener('mouseleave', () => { this.mouse = null; });
    this.renderer.domElement.addEventListener('mousedown', this.lockedClick);
    window.addEventListener('paste', this.paste);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.controls.lookAt(new THREE.Vector3(30, 25, 40), new THREE.Vector3(0, 0, 0));
    this.loop();
  }

  setProject(project: BuildProject, frameCamera = true): void {
    this.project = project;
    this.blocks.setProject(project);
    const b = projectBounds(project.blocks);
    this.ground.position.set((b.min[0] + b.max[0]) / 2, b.min[1] - 0.001, (b.min[2] + b.max[2]) / 2);
    if (frameCamera) this.frameProject();
    if (this.grid) this.setGrid(true, this.grid.userData.abstand as number);
  }

  /** Bauplan-Linien: Raster auf Bodenhöhe, jede n-te Linie kräftiger */
  setGrid(an: boolean, abstand = 16): void {
    if (this.grid) { this.scene.remove(this.grid); this.grid.traverse((o) => (o as THREE.LineSegments).geometry?.dispose()); this.grid = null; }
    if (!an || !this.project) return;
    const b = projectBounds(this.project.blocks);
    const rand = 8;
    const x0 = Math.floor((b.min[0] - rand) / abstand) * abstand, x1 = Math.ceil((b.max[0] + 1 + rand) / abstand) * abstand;
    const z0 = Math.floor((b.min[2] - rand) / abstand) * abstand, z1 = Math.ceil((b.max[2] + 1 + rand) / abstand) * abstand;
    const y = b.min[1] + 0.02;
    const fein: number[] = [], grob: number[] = [];
    for (let x = x0; x <= x1; x++) (x % abstand === 0 ? grob : fein).push(x, y, z0, x, y, z1);
    for (let z = z0; z <= z1; z++) (z % abstand === 0 ? grob : fein).push(x0, y, z, x1, y, z);
    const linien = (pts: number[], farbe: string, deck: number) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: farbe, transparent: true, opacity: deck, depthWrite: false }));
    };
    this.grid = new THREE.Group();
    this.grid.add(linien(fein, '#1d3b14', 0.25), linien(grob, '#ff4fa3', 0.85));
    this.grid.userData.abstand = abstand;
    this.scene.add(this.grid);
  }

  setView(view: ViewState): void {
    this.view = view;
    this.blocks.setView(view);
  }

  setEdit(edit: EditOptions): void {
    this.edit = edit;
  }

  setSpeed(speed: number): void {
    this.controls.speed = speed;
  }

  /** Kamera so setzen, dass das ganze Bauwerk schräg von vorne zu sehen ist */
  frameProject(): void {
    if (!this.project) return;
    const b = projectBounds(this.project.blocks);
    const mitte = new THREE.Vector3((b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2);
    const groesse = Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2], 10);
    const pos = mitte.clone().add(new THREE.Vector3(0.75, 0.55, 1).normalize().multiplyScalar(groesse * 1.25));
    this.controls.lookAt(pos, mitte);
  }

  /** F3+C-Text aus Minecraft anwenden. Rückgabe: ob es geklappt hat */
  syncFromMinecraft(text: string): boolean {
    const w = parseF3C(text);
    if (!w) return false;
    const c = minecraftToCamera(w[0], w[1], w[2], w[3], w[4], this.worldOrigin);
    this.camera.position.copy(c.pos);
    this.controls.yaw = c.yaw;
    this.controls.pitch = c.pitch;
    return true;
  }

  /**
   * Live-Verbindung zu einem Minecraft-Mod (WebSocket). Erwartet Nachrichten wie
   * {"x":123.5,"y":64,"z":-20.2,"yaw":90,"pitch":10} in Minecraft-Koordinaten.
   */
  connectLive(url: string, onStatus: (status: string) => void): void {
    this.disconnectLive();
    try {
      const ws = new WebSocket(url);
      this.live = ws;
      ws.onopen = () => onStatus('verbunden');
      ws.onclose = () => { if (this.live === ws) onStatus('getrennt'); };
      ws.onerror = () => onStatus('keine Verbindung – läuft der Mod?');
      ws.onmessage = (ev) => {
        try {
          const d = JSON.parse(String(ev.data)) as LivePlayer | { players: LivePlayer[] };
          const liste = 'players' in d ? d.players : [{ ...d, name: d.name ?? 'Spieler' }];
          this.updatePlayers(liste);
          onStatus('verbunden');
        } catch { /* ungültige Nachricht ignorieren */ }
      };
    } catch {
      onStatus('ungültige Adresse');
    }
  }

  /** Live-Spieler anzeigen (auch zum Testen ohne Mod aufrufbar) */
  updatePlayers(liste: LivePlayer[]): void {
    const namen = new Set(liste.map((p) => p.name));
    for (const [name, e] of this.spieler) if (!namen.has(name)) { this.scene.remove(e.figur); this.spieler.delete(name); }
    for (const p of liste) {
      let e = this.spieler.get(p.name);
      if (!e) { e = { data: p, figur: spielerFigur(p.name) }; this.spieler.set(p.name, e); this.scene.add(e.figur); }
      e.data = p;
      const c = minecraftToCamera(p.x, p.y, p.z, p.yaw, p.pitch, this.worldOrigin);
      e.figur.position.set(c.pos.x, c.pos.y - 1.62, c.pos.z);
      e.figur.rotation.y = c.yaw;
      if (this.followPlayer === p.name) {
        this.camera.position.copy(c.pos);
        this.controls.yaw = c.yaw;
        this.controls.pitch = c.pitch;
      }
    }
    this.events.onLive?.(liste, 'verbunden');
  }

  /** Live-Spieler in Bauplan-Koordinaten (für 2D-Plan und Minikarte) */
  livePlayersLocal(): { name: string; x: number; y: number; z: number; yaw: number }[] {
    return [...this.spieler.values()].map(({ data }) => ({
      name: data.name, x: data.x - this.worldOrigin[0], y: data.y - this.worldOrigin[1], z: data.z - this.worldOrigin[2], yaw: data.yaw
    }));
  }

  flyTo(x: number, y: number, z: number): void {
    this.controls.lookAt(new THREE.Vector3(x + 0.5, y + 12, z + 18), new THREE.Vector3(x + 0.5, y, z + 0.5));
  }

  toggleFlyMode(): void {
    if (this.controls.locked) this.controls.unlock(); else this.controls.lock();
  }

  disconnectLive(): void {
    if (this.live) { const ws = this.live; this.live = null; ws.close(); }
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.disconnectLive();
    this.resizeObserver.disconnect();
    this.controls.dispose();
    window.removeEventListener('paste', this.paste);
    this.blocks.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  // ------------------------------------------------------------------ intern

  private resize(): void {
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private loop = () => {
    this.frame = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.1);
    this.controls.update(dt);
    if ((this.hoverTakt += dt) > 0.08) {
      this.hoverTakt = 0;
      const pick = this.controls.locked ? this.selection.pick() : this.mouse ? this.selection.pick(this.mouse) : (this.selection.clear(), null);
      this.events.onHover?.(pick);
    }
    if ((this.camTakt += dt) > 0.2) { this.camTakt = 0; this.events.onCamera?.(this.camera.position, this.controls.yaw); }
    this.renderer.render(this.scene, this.camera);
  };

  private trackMouse = (e: MouseEvent) => {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.mouse = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };

  private paste = (e: ClipboardEvent) => {
    const text = e.clipboardData?.getData('text') ?? '';
    if (parseF3C(text)) {
      e.preventDefault();
      this.syncFromMinecraft(text);
      this.events.onSync?.(text);
    }
  };

  /** Klick ohne eingefangene Maus: im Bauen-Modus Blöcke setzen/entfernen (Flugmodus startet mit F) */
  private handleClick(e: MouseEvent): void {
    if (this.edit.enabled) this.applyEdit(e.button === 2 ? 'place' : 'remove', this.mouse ?? undefined);
  }

  private lockedClick = (e: MouseEvent) => {
    if (!this.controls.locked || !this.edit.enabled) return;
    this.applyEdit(e.button === 2 ? 'place' : 'remove');
  };

  private applyEdit(action: 'place' | 'remove', ndc?: THREE.Vector2): void {
    if (!this.project || !this.view) return;
    const pick = this.selection.pick(ndc);
    if (!pick) return;
    const b = pick.block;
    if (action === 'remove') {
      this.blocks.removeBlock(b.x, b.y, b.z);
    } else {
      const n = pick.normal;
      const x = b.x + Math.round(n.x), y = b.y + Math.round(n.y), z = b.z + Math.round(n.z);
      if (this.blocks.blockAt(x, y, z)) return;
      const neu: BlockData = { x, y, z, type: this.edit.type, floor: floorForY(this.project.floors, y), step: this.view.step, part: this.edit.part };
      this.blocks.setBlock(neu);
    }
    this.events.onProjectEdited?.();
  }
}
