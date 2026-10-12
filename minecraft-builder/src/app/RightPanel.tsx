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

function PositionTab({ engine, players, liveStatus, onLiveStatus, follow, onFollow, onMessage }: Props) {
  const [ursprung, setUrsprung] = useState('0 64 0');
  const [url, setUrl] = useState('ws://localhost:25599');
  const setzeUrsprung = () => {
    const z = ursprung.trim().split(/[\s,;]+/).map(Number);
    if (z.length !== 3 || z.some((n) => Number.isNaN(n))) { onMessage('Bitte drei Zahlen eingeben, z. B. 120 64 -40'); return; }
    if (engine.current) engine.current.worldOrigin = [z[0], z[1], z[2]];
    onMessage(`Bauplan-Ursprung in deiner Welt: ${z.join(' / ')}`);
  };
  return (
    <>
      <section>
        <h2>Live-Spieler</h2>
        {follow ? (
          <div className="gesperrt-box">
            <span>🔒 Position gesperrt – folgt <strong>{follow}</strong></span>
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
        <div className="reihe">
          <input id="liveUrl" className="eingabe" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="WebSocket-Adresse des Mods" />
          <button type="button" onClick={() => { onLiveStatus('verbinde …'); engine.current?.connectLive(url, onLiveStatus); }}>Verbinden</button>
        </div>
        <button type="button" className="breit leise" onClick={() => {
          // Testspieler, um die Anzeige ohne Mod auszuprobieren
          engine.current?.updatePlayers([{ name: 'Testspieler', x: (engine.current?.worldOrigin[0] ?? 0) + 23, y: (engine.current?.worldOrigin[1] ?? 0) + 1, z: (engine.current?.worldOrigin[2] ?? 0) + 34, yaw: 180, pitch: 10 }]);
        }}>Testspieler anzeigen</button>
      </section>
      <section>
        <h2>Ohne Mod: F3 + C</h2>
        <p className="hinweis">1. Trage ein, wo die Nordwest-Ecke unten des Bauplans in deiner Welt liegt. 2. Im Spiel <kbd>F3</kbd>+<kbd>C</kbd> drücken. 3. Hier <kbd>Strg</kbd>+<kbd>V</kbd> – die Kamera springt genau an deine Position und Blickrichtung.</p>
        <div className="reihe">
          <input id="ursprung" className="eingabe" value={ursprung} onChange={(e) => setUrsprung(e.target.value)} aria-label="Ursprung des Bauplans in der Welt (X Y Z)" />
          <button type="button" onClick={setzeUrsprung}>Setzen</button>
        </div>
      </section>
    </>
  );
}

function SettingsTab({ project, view, onView, engine }: Props) {
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
        <h2>Darstellung</h2>
        <label className="regler" htmlFor="explosion">Explosionsansicht <output>{view.explode ? `${view.explode} Blöcke` : 'aus'}</output></label>
        <input id="explosion" type="range" min={0} max={16} value={view.explode} onChange={(e) => { const n = Number(e.target.value); onView((v) => ({ ...v, explode: n })); }} />
        <label className="haken"><input type="checkbox" checked={view.highlightStep} onChange={(e) => { const c = e.target.checked; onView((v) => ({ ...v, highlightStep: c })); }} />Aktuelle Etappe hervorheben</label>
        <button type="button" className="breit" onClick={() => engine.current?.frameProject()}>Kamera auf Bauwerk</button>
      </section>
    </>
  );
}
