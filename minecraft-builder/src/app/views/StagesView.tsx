import { useMemo } from 'react';
import type { BuildProject } from '../../builder/BuildProject';
import { blocksPerStep } from '../../builder/BuildSteps';
import { countMaterials, formatStacks } from '../../builder/Materials';

interface Props {
  project: BuildProject;
  step: number;
  version: number;
  onStep: (s: number) => void;
  onRename: (id: number, name: string) => void;
  onShow3d: () => void;
}

/** Etappen: jede Bauphase mit Beschreibung, Blockzahl und Material */
export function StagesView({ project, step, version, onStep, onRename, onShow3d }: Props) {
  const proSchritt = useMemo(() => blocksPerStep(project), [project, version]);
  const material = useMemo(() => {
    const m = new Map<number, ReturnType<typeof countMaterials>>();
    for (const s of project.steps) m.set(s.id, countMaterials(project.blocks.filter((b) => b.step === s.id)).slice(0, 6));
    return m;
  }, [project, version]);
  return (
    <div className="seite">
      <ol className="etappen">
        {project.steps.map((s) => {
          const zustand = s.id < step ? 'fertig' : s.id === step ? 'aktuell' : 'offen';
          return (
            <li key={s.id} className={`karte ${zustand}`}>
              <div className="etappe-kopf">
                <span className="nr">{s.id}</span>
                <input className="eingabe titel-eingabe" value={s.name} onChange={(e) => onRename(s.id, e.target.value)} aria-label={`Name von Etappe ${s.id}`} />
                <span className="status">{zustand === 'fertig' ? 'fertig' : zustand === 'aktuell' ? 'aktuell' : 'geplant'}</span>
              </div>
              {s.description && <p className="hinweis">{s.description}</p>}
              <p><strong>{(proSchritt.get(s.id) ?? 0).toLocaleString('de-DE')}</strong> Blöcke · {formatStacks(proSchritt.get(s.id) ?? 0)}</p>
              <ul className="mats klein">
                {(material.get(s.id) ?? []).map((e) => (
                  <li key={e.type}><span className="muster" style={{ background: e.color }} /><span className="name">{e.name}</span><span className="zahl">{e.count.toLocaleString('de-DE')}</span></li>
                ))}
              </ul>
              <div className="reihe">
                <button type="button" onClick={() => onStep(s.id)}>Als aktuellen Stand setzen</button>
                <button type="button" onClick={() => { onStep(s.id); onShow3d(); }}>In 3D ansehen</button>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
