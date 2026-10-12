import type { LivePlayer } from '../engine/Scene';

/**
 * Verbindung zum BauplanLive-Plugin auf dem Minecraft-Server.
 * Die Website kann vom Plugin selbst ausgeliefert werden (gleiche Adresse) oder sich mit
 * einer eingegebenen Server-Adresse verbinden (z. B. http://123.45.67.89:8100).
 */

export interface ServerState {
  origin: [number, number, number];
  world: string;
  follow: string | null;
  /** Bauplan, den das Plugin standardmäßig zeigt (relativer Pfad, z. B. projekte/hogwarts.mcbp.gz) */
  plan?: string;
}

export interface ServerUpdate {
  players: (LivePlayer & { world?: string })[];
  state: ServerState;
}

/** Prüft, ob die Seite von einem BauplanLive-Server kommt. Liefert die Basisadresse oder null. */
export async function detectServer(): Promise<{ base: string; state: ServerState } | null> {
  try {
    const antwort = await fetch('./api/state', { cache: 'no-store' });
    if (!antwort.ok) return null;
    const state = (await antwort.json()) as ServerState;
    return Array.isArray(state.origin) ? { base: './', state } : null;
  } catch {
    return null;
  }
}

export class ServerLink {
  private quelle: EventSource | null = null;
  readonly base: string;

  constructor(base: string, private onUpdate: (u: ServerUpdate) => void, private onStatus: (s: string) => void) {
    this.base = base.endsWith('/') ? base : base + '/';
  }

  start(): void {
    this.stop();
    const es = new EventSource(this.base + 'api/stream');
    this.quelle = es;
    es.onopen = () => this.onStatus('verbunden mit dem Server');
    es.onerror = () => this.onStatus('Verbindung unterbrochen – versuche es erneut …');
    es.onmessage = (ev) => {
      try { this.onUpdate(JSON.parse(ev.data) as ServerUpdate); } catch { /* unvollständige Nachricht */ }
    };
  }

  stop(): void {
    this.quelle?.close();
    this.quelle = null;
  }

  /** Gemeinsamen Zustand ändern – gilt für alle, die die Website offen haben */
  async setState(teil: Partial<Pick<ServerState, 'origin' | 'follow'>>): Promise<void> {
    await fetch(this.base + 'api/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(teil) });
  }
}
