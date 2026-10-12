import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BuildProject, PartCategory } from '../builder/BuildProject';
import { emptyProject } from '../builder/BuildProject';
import { firstStep, lastStep, nextStep, previousStep } from '../builder/BuildSteps';
import { DEFAULT_VIEW, type ViewState } from '../builder/ViewFilter';
import { saveProject } from '../builder/ProjectStore';
import { loadTodos, saveTodos, type Todo } from '../builder/Todos';
import { Engine, type LivePlayer } from '../engine/Scene';
import type { PickResult } from '../engine/BlockRenderer';
import { buildPlan } from '../engine/PlanRenderer';
import { loadTextureOverrides, refreshAllTextures, resetTextures } from '../engine/Textures';
import { clearPack, loadPackFile, loadStoredPack } from '../engine/TexturePack';
import { exportJson, importFile, projectFromJson } from '../import/ProjectImport';
import { fetchBinaryProject } from '../import/BinaryProject';
import { detectServer, ServerLink, type ServerUpdate } from '../live/ServerLink';
import demoCastle from '../data/demoCastle.json';
import { TopNav, type Tab } from './TopNav';
import { Toolbar, type ToolbarState } from './Toolbar';
import { RightPanel } from './RightPanel';
import { Timeline } from './Timeline';
import { Hud } from './Hud';
import { Minimap } from './Minimap';
import { PlanView } from './views/PlanView';
import { ProjectsView } from './views/ProjectsView';
import { StagesView } from './views/StagesView';
import { TodosView } from './views/TodosView';

export interface EditState {
  enabled: boolean;
  type: string;
  part: PartCategory;
}

const demo = () => projectFromJson(demoCastle);

export function App() {
  const huelle = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const engine = useRef<Engine | null>(null);
  const [tab, setTab] = useState<Tab>('view3d');
  const [panelOpen, setPanelOpen] = useState(true);
  const [project, setProject] = useState<BuildProject>(demo);
  const [view, setView] = useState<ViewState>(() => ({ ...DEFAULT_VIEW, step: lastStep(demo()) }));
  const [version, setVersion] = useState(0);
  const [hover, setHover] = useState<PickResult | null>(null);
  const [locked, setLocked] = useState(false);
  const [cam, setCam] = useState<{ pos: [number, number, number]; yaw: number }>({ pos: [0, 0, 0], yaw: 0 });
  const [edit, setEdit] = useState<EditState>({ enabled: false, type: 'stone_bricks', part: 'wall' });
  const [tools, setTools] = useState<ToolbarState>({ grid: false, gridSpacing: 16, speed: 12 });
  const [storedId, setStoredId] = useState<string | undefined>();
  const [meldung, setMeldung] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [players, setPlayers] = useState<LivePlayer[]>([]);
  const [liveStatus, setLiveStatus] = useState('aus');
  const [follow, setFollow] = useState<string | null>(null);
  const [todos, setTodos] = useState<Todo[]>(() => loadTodos(demo().name));
  const [serverMode, setServerMode] = useState(false);
  const [packName, setPackName] = useState<string | null>(null);
  const link = useRef<ServerLink | null>(null);
  const welt = useRef<string>('');

  const zeige = useCallback((text: string) => {
    setMeldung(text);
    window.setTimeout(() => setMeldung((m) => (m === text ? null : m)), 3500);
  }, []);

  // Engine einmalig anlegen
  useEffect(() => {
    if (!viewport.current) return;
    const e = new Engine(viewport.current, {
      onHover: setHover,
      onLockChange: setLocked,
      onCamera: (p, yaw) => setCam({ pos: [p.x, p.y, p.z], yaw }),
      onProjectEdited: () => setVersion((v) => v + 1),
      onSync: () => zeige('Kamera an deine Minecraft-Position gesetzt (F3+C)'),
      onLive: (liste) => setPlayers(liste)
    });
    engine.current = e;
    void loadTextureOverrides();
    // gespeicherte Original-Texturen vom letzten Besuch wieder anwenden
    void loadStoredPack().then(async (name) => {
      if (!name) return;
      await refreshAllTextures();
      setPackName(name);
      setVersion((v) => v + 1);
    });
    return () => { e.dispose(); engine.current = null; };
  }, [zeige]);

  /** Server-Update: Spieler (nur aus der Bauplan-Welt), Ursprung und „Position gesperrt“ für alle */
  const serverUpdate = useCallback((u: ServerUpdate) => {
    const e = engine.current;
    if (!e) return;
    e.worldOrigin = u.state.origin;
    welt.current = u.state.world;
    setFollow((f) => (f === u.state.follow ? f : u.state.follow));
    e.followPlayer = u.state.follow;
    e.updatePlayers(u.players.filter((p) => !u.state.world || !p.world || p.world === u.state.world));
  }, []);

  const verbindeServer = useCallback((base: string) => {
    link.current?.stop();
    const l = new ServerLink(base, serverUpdate, setLiveStatus);
    link.current = l;
    l.start();
    setServerMode(true);
  }, [serverUpdate]);

  // Kommt die Seite vom BauplanLive-Plugin? Dann automatisch verbinden und dessen Bauplan laden
  useEffect(() => {
    let aktiv = true;
    void detectServer().then(async (s) => {
      if (!s || !aktiv) return;
      if (engine.current) engine.current.worldOrigin = s.state.origin;
      verbindeServer(s.base);
      if (s.state.plan) {
        try {
          zeige('Lade den Bauplan vom Server …');
          const p = s.state.plan.endsWith('.json') ? projectFromJson(await (await fetch(s.state.plan)).json()) : await fetchBinaryProject(s.state.plan);
          if (aktiv) ladeProjektRef.current?.(p, 'Server');
        } catch (err) { zeige(`Bauplan vom Server nicht geladen: ${(err as Error).message}`); }
      }
    });
    return () => { aktiv = false; link.current?.stop(); };
  }, [verbindeServer, zeige]);

  useEffect(() => { engine.current?.setProject(project); }, [project]);
  useEffect(() => { engine.current?.setView(view); }, [view, project]);
  useEffect(() => { engine.current?.setEdit(edit); }, [edit]);
  useEffect(() => { engine.current?.setSpeed(tools.speed); }, [tools.speed]);
  useEffect(() => { engine.current?.setGrid(tools.grid, tools.gridSpacing); }, [tools.grid, tools.gridSpacing, project]);
  useEffect(() => { if (engine.current) engine.current.followPlayer = follow; }, [follow]);
  const setzeFollow = useCallback((name: string | null) => {
    setFollow(name);
    if (link.current) void link.current.setState({ follow: name });
  }, []);
  const setzeUrsprung = useCallback((o: [number, number, number]) => {
    if (engine.current) engine.current.worldOrigin = o;
    if (link.current) void link.current.setState({ origin: o });
    zeige(`Bauplan-Ursprung in der Welt: ${o.join(' / ')}${link.current ? ' (für alle)' : ''}`);
  }, [zeige]);
  const texturen = useMemo(() => ({
    laden: async (file: File) => {
      try {
        zeige(`Lese Texturen aus ${file.name} …`);
        const n = await loadPackFile(file);
        const ersetzt = await refreshAllTextures();
        setPackName(file.name);
        setVersion((v) => v + 1);
        zeige(`${n} Original-Texturen gefunden, ${ersetzt} sofort angewendet`);
      } catch (err) { zeige(`Texturen nicht geladen: ${(err as Error).message}`); }
    },
    entfernen: async () => {
      await clearPack();
      resetTextures();
      setPackName(null);
      setVersion((v) => v + 1);
      zeige('Zurück zu den gemalten Texturen');
    }
  }), [zeige]);
  const verbinde = useCallback((url: string) => {
    if (/^wss?:/.test(url)) { setLiveStatus('verbinde …'); engine.current?.connectLive(url, setLiveStatus); }
    else verbindeServer(url);
  }, [verbindeServer]);
  useEffect(() => { saveTodos(project.name, todos); }, [todos, project.name]);

  // Etappen abspielen
  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => {
      setView((v) => {
        const n = nextStep(project, v.step);
        if (n === v.step) { setPlaying(false); return v; }
        return { ...v, step: n };
      });
    }, 1400);
    return () => window.clearInterval(t);
  }, [playing, project]);

  // Tasten: F Flugmodus, X aktueller Stand, ←/→ Etappe
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = (e.target as HTMLElement).tagName;
      if (t === 'INPUT' || t === 'SELECT' || t === 'TEXTAREA' || tab !== 'view3d') return;
      if (e.code === 'KeyF') engine.current?.toggleFlyMode();
      if (e.code === 'KeyX') setView((v) => ({ ...v, ghostFuture: !v.ghostFuture }));
      if (e.code === 'ArrowRight' || e.code === 'PageUp') setView((v) => ({ ...v, step: nextStep(project, v.step) }));
      if (e.code === 'ArrowLeft' || e.code === 'PageDown') setView((v) => ({ ...v, step: previousStep(project, v.step) }));
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [project, tab]);

  const ladeProjekt = useCallback((p: BuildProject, quelle: string) => {
    setProject(p);
    setView({ ...DEFAULT_VIEW, step: lastStep(p) });
    setStoredId(undefined);
    setTodos(loadTodos(p.name));
    setVersion((v) => v + 1);
    zeige(`${quelle}: „${p.name}“ mit ${p.blocks.length.toLocaleString('de-DE')} Blöcken geladen`);
  }, [zeige]);
  const ladeProjektRef = useRef(ladeProjekt);
  ladeProjektRef.current = ladeProjekt;

  const aktionen = useMemo(() => ({
    ladeUrl: async (url: string, titel: string) => {
      try {
        zeige(`Lade ${titel} …`);
        ladeProjekt(await fetchBinaryProject(url), 'Bauplan');
        setTab('view3d');
      } catch (err) { zeige(`Laden fehlgeschlagen: ${(err as Error).message}`); }
    },
    neu: () => {
      const p = emptyProject();
      p.blocks.push({ x: 0, y: 0, z: 0, type: 'stone_bricks', floor: 0, step: 1, part: 'foundation' });
      ladeProjekt(p, 'Neuer Bauplan');
      setEdit((e) => ({ ...e, enabled: true }));
      setTab('view3d');
    },
    demo: () => { ladeProjekt(demo(), 'Beispiel'); setTab('view3d'); },
    importieren: async (file: File) => {
      try {
        zeige(`Lade ${file.name} …`);
        ladeProjekt(await importFile(file), 'Import');
        setTab('view3d');
      } catch (err) {
        zeige(`Import fehlgeschlagen: ${(err as Error).message}`);
      }
    },
    exportieren: () => {
      const blob = new Blob([exportJson(project)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${project.name.replace(/[^\wäöüÄÖÜß-]+/g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    },
    speichern: () => {
      const r = saveProject(project, storedId);
      if (r.ok) { setStoredId(r.id); zeige('Im Browser gespeichert'); } else zeige(r.error);
    },
    laden: (p: unknown) => {
      try { ladeProjekt(projectFromJson(p), 'Gespeichert'); setTab('view3d'); } catch (err) { zeige((err as Error).message); }
    },
    umbenennen: (name: string) => setProject((p) => ({ ...p, name }))
  }), [project, storedId, ladeProjekt, zeige]);

  const plan = useMemo(() => buildPlan(project, view), [project, view, version]);
  const lokaleSpieler = useMemo(() => engine.current?.livePlayersLocal() ?? [], [players]);
  const vollbild = () => {
    const el = huelle.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else el.requestFullscreen?.().catch(() => zeige('Vollbild wird hier nicht unterstützt'));
  };

  return (
    <div className={`app ${panelOpen ? '' : 'ohne-panel'}`} ref={huelle}>
      <TopNav projectName={project.name} tab={tab} onTab={setTab} openTodos={todos.filter((t) => !t.done).length} panelOpen={panelOpen} onTogglePanel={() => setPanelOpen((o) => !o)} />
      <main className="haupt">
        <section className={`ansicht3d ${tab === 'view3d' ? '' : 'versteckt'}`} aria-label="3D-Ansicht">
          <Toolbar view={view} onView={setView} tools={tools} onTools={setTools} flying={locked} onFly={() => engine.current?.toggleFlyMode()}
            onFullscreen={vollbild} liveCount={players.length} liveStatus={liveStatus} edit={edit} onEdit={setEdit} />
          <div className="viewport" ref={viewport}>
            <Hud hover={hover} locked={locked} camPos={cam.pos} project={project} edit={edit} />
            <Minimap plan={plan} camPos={cam.pos} camYaw={cam.yaw} players={lokaleSpieler} />
            {meldung && <div className="meldung" role="status">{meldung}</div>}
          </div>
          <Timeline project={project} step={view.step} version={version} playing={playing}
            onStep={(s) => { setPlaying(false); setView((v) => ({ ...v, step: s })); }}
            onPlay={() => { if (!playing && view.step === lastStep(project)) setView((v) => ({ ...v, step: firstStep(project) })); setPlaying((p) => !p); }} />
        </section>
        {tab === 'plan2d' && (
          <PlanView project={project} plan={plan} camPos={cam.pos} camYaw={cam.yaw} players={lokaleSpieler}
            onFlyTo={(x, y, z) => { engine.current?.flyTo(x, y, z); setTab('view3d'); }} />
        )}
        {tab === 'projects' && <ProjectsView project={project} actions={aktionen} />}
        {tab === 'stages' && (
          <StagesView project={project} step={view.step} version={version}
            onStep={(s) => setView((v) => ({ ...v, step: s }))}
            onRename={(id, name) => setProject((p) => ({ ...p, steps: p.steps.map((s) => (s.id === id ? { ...s, name } : s)) }))}
            onShow3d={() => setTab('view3d')} />
        )}
        {tab === 'todos' && <TodosView project={project} todos={todos} onTodos={setTodos} />}
        {meldung && tab !== 'view3d' && <div className="meldung" role="status">{meldung}</div>}
      </main>
      {panelOpen && (
        <RightPanel project={project} view={view} onView={setView} engine={engine} version={version} players={players}
          liveStatus={liveStatus} onLiveStatus={setLiveStatus} follow={follow} onFollow={setzeFollow} onMessage={zeige}
          onOrigin={setzeUrsprung} onConnect={verbinde} serverMode={serverMode} packName={packName} textures={texturen} />
      )}
    </div>
  );
}
