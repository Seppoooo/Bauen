import type { BuildProject } from '../builder/BuildProject';
import { PART_LABELS } from '../builder/BuildProject';
import { floorName } from '../builder/Floors';
import { stepInfo } from '../builder/BuildSteps';
import type { PickResult } from '../engine/BlockRenderer';
import { blockInfo } from '../engine/BlockTypes';
import type { EditState } from './App';

interface Props {
  hover: PickResult | null;
  locked: boolean;
  camPos: [number, number, number];
  project: BuildProject;
  edit: EditState;
}

/** Überlagerung der 3D-Ansicht: Bauplan-Schild, Fadenkreuz, Block unten links, Steuerung unten */
export function Hud({ hover, locked, camPos, project, edit }: Props) {
  const b = hover?.block;
  const props = b?.props ? Object.entries(b.props).map(([k, v]) => `${k}=${v}`).join(', ') : '';
  return (
    <>
      <div className="schild">
        <small>Bauplan{project.author ? ' von' : ''}</small>
        <strong>{project.author ?? project.name}</strong>
      </div>
      {locked && <div className="fadenkreuz" aria-hidden="true" />}
      <div className="hud-unten-links">
        {b ? (
          <>
            <strong>{blockInfo(b.type).name}</strong>
            <code>minecraft:{b.type}{props ? `[${props}]` : ''}</code>
            <span>X {b.x} · Y {b.y} · Z {b.z}</span>
            <span>{floorName(project, b.floor)} · Etappe {b.step} ({stepInfo(project, b.step)?.name}) · {PART_LABELS[b.part]}</span>
          </>
        ) : (
          <span>Kamera X {camPos[0].toFixed(0)} · Y {camPos[1].toFixed(0)} · Z {camPos[2].toFixed(0)}</span>
        )}
      </div>
      <div className="hud-steuerung">
        <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> fliegen · Maus ziehen umsehen · <kbd>Leertaste</kbd> hoch · <kbd>C</kbd>/<kbd>Strg</kbd> runter ·
        <kbd>Shift</kbd> schneller · Mausrad vorwärts/zurück · <kbd>F</kbd> Flugmodus · <kbd>X</kbd> aktueller Stand
        {edit.enabled && <> · <strong>Bauen:</strong> Rechtsklick setzen, Linksklick abbauen</>}
      </div>
    </>
  );
}
