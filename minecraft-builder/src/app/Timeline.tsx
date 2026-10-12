import { useMemo } from 'react';
import type { BuildProject } from '../builder/BuildProject';
import { blocksPerStep, firstStep, lastStep, nextStep, previousStep, progressUpTo, stepInfo } from '../builder/BuildSteps';

interface Props {
  project: BuildProject;
  step: number;
  version: number;
  playing: boolean;
  onStep: (s: number) => void;
  onPlay: () => void;
}

export function Timeline({ project, step, version, playing, onStep, onPlay }: Props) {
  const proSchritt = useMemo(() => blocksPerStep(project), [project, version]);
  const fortschritt = useMemo(() => progressUpTo(project, step), [project, step, version]);
  const info = stepInfo(project, step);
  let max = 1;
  for (const n of proSchritt.values()) if (n > max) max = n;

  return (
    <footer className="timeline" aria-label="Bauphasen">
      <div className="steuer">
        <button type="button" onClick={() => onStep(firstStep(project))} aria-label="Zur ersten Bauphase">⏮</button>
        <button type="button" onClick={() => onStep(previousStep(project, step))} aria-label="Vorherige Bauphase">◀ Zurück</button>
        <button type="button" className="play" onClick={onPlay} aria-pressed={playing}>{playing ? '❚❚ Pause' : '▶ Abspielen'}</button>
        <button type="button" onClick={() => onStep(nextStep(project, step))} aria-label="Nächste Bauphase">Weiter ▶</button>
        <button type="button" onClick={() => onStep(lastStep(project))} aria-label="Zur letzten Bauphase">⏭</button>
      </div>
      <ol className="phasen">
        {project.steps.map((s) => {
          const n = proSchritt.get(s.id) ?? 0;
          const zustand = s.id < step ? 'fertig' : s.id === step ? 'aktuell' : 'offen';
          return (
            <li key={s.id} className={zustand}>
              <button type="button" onClick={() => onStep(s.id)} aria-current={s.id === step ? 'step' : undefined} title={s.description ?? s.name}>
                <span className="balken" style={{ height: `${8 + (n / max) * 22}px` }} />
                <span className="nr">{s.id}</span>
                <span className="name">{s.name}</span>
                <span className="anzahl">{n.toLocaleString('de-DE')}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="fortschritt">
        <strong>{fortschritt.percent} %</strong>
        <div className="leiste" role="progressbar" aria-valuenow={fortschritt.percent} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${fortschritt.percent}%` }} />
        </div>
        <small>{fortschritt.done.toLocaleString('de-DE')} / {fortschritt.total.toLocaleString('de-DE')} Blöcke{info?.description ? ` · ${info.description}` : ''}</small>
      </div>
    </footer>
  );
}
