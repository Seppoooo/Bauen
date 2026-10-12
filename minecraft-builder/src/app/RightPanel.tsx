import { useMemo, useState, type MutableRefObject } from 'react';
import type { BuildProject, PartCategory } from '../builder/BuildProject';
import { PART_LABELS, PART_ORDER } from '../builder/BuildProject';
import { floorHeights } from '../builder/Floors';
import type { ViewState } from '../builder/ViewFilter';
import type { Engine, LivePlayer } from '../engine/Scene';
import { MaterialPanel } from './MaterialPanel';

type PanelTab = 'position' | 'settings' | 'material';

interface Props {
  project: BuildProject;
  view: ViewState;
  onView: (f: (v: ViewState) => ViewState) => void;
  engine: MutableRefObject<Engine | null>;
  version: number;
  players: LivePlayer[];
  liveStatus: string;
  onLiveStatus: (s: string) => void;
  follow: string | null;
  onFollow: (name: string | null) => void;
  onMessage: (t: string) => void;
  /** Ursprung setzen (im Server-Modus für alle) */
  onOrigin: (o: [number, number, number]) => void;
  /** Mit einer Server-Adresse (http…) oder einem Mod (ws…) verbinden */
  onConnect: (url: string) => void;
  serverMode: boolean;
  packName: string | null;
  textures: { laden: (f: File) => void; entfernen: () => void };
}

/** Rechtes Panel mit den Reitern Position, Einstellungen und Material */
export function RightPanel(props: Props) {
  const [tab, setTab] = useState<PanelTab>('position');
  return (
    <aside className="rechts" aria-label="Menü">
      <div className="panel-reiter" role="tablist">
        {([['position', 'Position'], ['settings', 'Einstellungen'], ['material', 'Material']] as [PanelTab, string][]).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'aktiv' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      <div className="panel-inhalt">
        {tab === 'position' && <PositionTab {...props} />}
        {tab === 'settings' && <SettingsTab {...props} />}
        {tab === 'material' && <MaterialPanel project={props.project} view={props.view} version={props.version} />}
      </div>
    </aside>
  );
}

function PositionTab({ engine, players, liveStatus, follow, onFollow, onMessage, onOrigin, onConnect, serverMode }: Props) {
  const [ursprung, setUrsprung] = useState(() => (engine.current?.worldOrigin ?? [0, 60, 0]).join(' '));
  const [url, setUrl] = useState('http://localhost:8100');
  const setzeUrsprung = () => {
    const z = ursprung.trim().split(/[\s,;]+/).map(Number);
    if (z.length !== 3 || z.some((n) => Number.isNaN(n))) { onMessage('Bitte drei Zahlen eingeben, z. B. 120 60 -40'); return; }
    onOrigin([z[0], z[1], z[2]]);
  };
  return (
    <>
      <section>
        <h2>Live-Spieler</h2>
        {follow ? (
          <div className="gesperrt-box">
            <span>🔒 Position gesperrt{serverMode ? ' – gilt für alle' : ''} · folgt <strong>{follow}</strong></span>
            <button type="button" onClick={() => onFollow(null)}>Entsperren</button>
          </div>
        ) : null}
        <ul className="spieler">
          {players.map((p) => (
            <li key={p.name}>
              <div>
                <strong>{p.name}</strong>
                <small>X {Math.floor(p.x)} · Y {Math.floor(p.y)} · Z {Math.floor(p.z)}</small>
              </div>
              <button type="button" aria-pressed={follow === p.name} onClick={() => onFollow(follow === p.name ? null : p.name)}>
                {follow === p.name ? 'Entsperren' : 'Folgen'}
              </button>
            </li>
          ))}
          {!players.length && <li className="leer">Niemand verbunden. Status: {liveStatus}</li>}
        </ul>
        {serverMode ? <p className="hinweis">Verbunden mit dem BauplanLive-Server. {liveStatus}</p> : (
          <>
            <p className="hinweis">Adresse deines Servers mit BauplanLive-Plugin (z. B. http://123.45.67.89:8100):</p>
            <div className="reihe">
              <input id="liveUrl" className="eingabe" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Adresse des Minecraft-Servers" />
              <button type="button" onClick={() => onConnect(url)}>Verbinden</button>
            </div>
          </>
        )}
        <button type="button" className="breit leise" onClick={() => {
          // Testspieler, um die Anzeige ohne Mod auszuprobieren
          engine.current?.updatePlayers([{ name: 'Testspieler', x: (engine.current?.worldOrigin[0] ?? 0) + 23, y: (engine.current?.worldOrigin[1] ?? 0) + 1, z: (engine.current?.worldOrigin[2] ?? 0) + 34, yaw: 180, pitch: 10 }]);
        }}>Testspieler anzeigen</button>
      </section>
      <section>
        <h2>Bauplan-Ursprung in der Welt</h2>
        <p className="hinweis">Wo liegt die Nordwest-Ecke unten des Bauplans (dort, wo die Schematic beginnt)? {serverMode ? 'Gilt für alle. Im Spiel geht es auch mit /bauplan ursprung.' : 'Ohne Plugin: im Spiel F3+C drücken und hier Strg+V – die Kamera springt an deine Position.'}</p>
        <div className="reihe">
          <input id="ursprung" className="eingabe" value={ursprung} onChange={(e) => setUrsprung(e.target.value)} aria-label="Ursprung des Bauplans in der Welt (X Y Z)" />
          <button type="button" onClick={setzeUrsprung}>Setzen</button>
        </div>
      </section>
    </>
  );
}

function SettingsTab({ project, view, onView, engine, packName, textures }: Props) {
  const hoehen = useMemo(() => floorHeights(project), [project]);
  const teile = useMemo(() => PART_ORDER.filter((p) => project.blocks.some((b) => b.part === p)), [project]);
  const sichtbar = (id: number) => !view.floors || view.floors.includes(id);
  const toggleFloor = (id: number) => onView((v) => {
    const alle = project.floors.map((f) => f.id);
    const aktuell = v.floors ?? alle;
    const neu = aktuell.includes(id) ? aktuell.filter((f) => f !== id) : [...aktuell, id];
    return { ...v, floors: neu.length === alle.length ? null : neu };
  });
  const toggle = (feld: 'hiddenParts' | 'transparentParts', p: PartCategory) => onView((v) => ({
    ...v, [feld]: v[feld].includes(p) ? v[feld].filter((x) => x !== p) : [...v[feld], p]
  }));
  return (
    <>
      <section>
        <h2>Stockwerke</h2>
        <ul className="liste">
          {project.floors.map((f) => {
            const h = hoehen.get(f.id);
            return (
              <li key={f.id}>
                <label><input type="checkbox" checked={sichtbar(f.id)} onChange={() => toggleFloor(f.id)} /><span>{f.name}</span><small>{h ? `Y ${h.minY}–${h.maxY}` : 'leer'}</small></label>
                <button type="button" className="mini" onClick={() => onView((v) => ({ ...v, floors: [f.id] }))}>nur</button>
              </li>
            );
          })}
        </ul>
        <div className="reihe">
          <button type="button" onClick={() => onView((v) => ({ ...v, floors: null, hiddenParts: [] }))}>Alles zeigen</button>
          <button type="button" onClick={() => onView((v) => ({ ...v, floors: null, hiddenParts: PART_ORDER.filter((p) => p !== 'foundation') }))}>Nur Fundament</button>
        </div>
      </section>
      <section>
        <h2>Bauteile</h2>
        <ul className="liste">
          {teile.map((p) => (
            <li key={p}>
              <label><input type="checkbox" checked={!view.hiddenParts.includes(p)} onChange={() => toggle('hiddenParts', p)} /><span>{PART_LABELS[p]}</span></label>
              <button type="button" className="mini" aria-pressed={view.transparentParts.includes(p)} onClick={() => toggle('transparentParts', p)} title="Durchsichtig darstellen">◌</button>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Original-Minecraft-Texturen</h2>
        {packName ? (
          <div className="gesperrt-box"><span>✓ Aktiv: <strong>{packName}</strong></span><button type="button" onClick={textures.entfernen}>Entfernen</button></div>
        ) : (
          <p className="hinweis">Wähle deine Minecraft-Datei – dann sieht jeder Block genau aus wie im Spiel. Windows: <code>%appdata%\.minecraft\versions\26.3\26.3.jar</code> (oder ein Ressourcenpaket als .zip). Die Datei bleibt auf deinem PC.</p>
        )}
        <label className="datei-knopf">
          <input type="file" id="texturPaket" accept=".jar,.zip" onChange={(e) => { const f = e.target.files?.[0]; if (f) textures.laden(f); e.target.value = ''; }} />
          {packName ? 'Andere Datei wählen' : 'Minecraft-.jar oder Ressourcenpaket wählen'}
        </label>
      </section>
      <section>
        <h2>Darstellung</h2>
        <label className="regler" htmlFor="explosion">Explosionsansicht <output>{view.explode ? `${view.explode} Blöcke` : 'aus'}</output></label>
        <input id="explosion" type="range" min={0} max={16} value={view.explode} onChange={(e) => { const n = Number(e.target.value); onView((v) => ({ ...v, explode: n })); }} />
        <label className="haken"><input type="checkbox" checked={view.highlightStep} onChange={(e) => { const c = e.target.checked; onView((v) => ({ ...v, highlightStep: c })); }} />Aktuelle Etappe hervorheben</label>
        <button type="button" className="breit" onClick={() => engine.current?.frameProject()}>Kamera auf Bauwerk</button>
      </section>
    </>
  );
}
