import { useMemo, useState } from 'react';
import type { BuildProject } from '../builder/BuildProject';
import { countMaterials, filterBlocks, formatStacks, MATERIAL_MODE_LABELS, type MaterialMode } from '../builder/Materials';
import { stepInfo } from '../builder/BuildSteps';
import type { ViewState } from '../builder/ViewFilter';

interface Props {
  project: BuildProject;
  view: ViewState;
  version: number;
}

export function MaterialPanel({ project, view, version }: Props) {
  const [modus, setModus] = useState<MaterialMode>('total');
  const [etage, setEtage] = useState<number | 'all'>('all');
  const liste = useMemo(() => countMaterials(filterBlocks(project, modus, view.step, etage)), [project, modus, view.step, etage, version]);
  const summe = liste.reduce((a, e) => a + e.count, 0);
  const schritt = stepInfo(project, view.step);

  return (
    <aside className="materials" aria-label="Materialliste">
      <h2>Materialliste</h2>
      <div className="filter">
        <select id="materialModus" value={modus} onChange={(e) => setModus(e.target.value as MaterialMode)} aria-label="Welche Blöcke">
          {(Object.keys(MATERIAL_MODE_LABELS) as MaterialMode[]).map((m) => <option key={m} value={m}>{MATERIAL_MODE_LABELS[m]}</option>)}
        </select>
        <select id="materialEtage" value={String(etage)} onChange={(e) => setEtage(e.target.value === 'all' ? 'all' : Number(e.target.value))} aria-label="Stockwerk">
          <option value="all">Alle Stockwerke</option>
          {project.floors.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>
      <p className="kontext">
        {modus === 'total' ? 'Alle Bauphasen' : modus === 'step' ? `Phase ${view.step}: ${schritt?.name ?? ''}` : modus === 'built' ? `Phase 1 bis ${view.step}` : `Ab Phase ${view.step + 1}`}
      </p>
      <ul className="mats">
        {liste.map((e) => (
          <li key={e.type}>
            <span className="muster" style={{ background: e.color }} />
            <span className="name" title={`minecraft:${e.type}`}>{e.name}</span>
            <span className="zahl">{e.count.toLocaleString('de-DE')}<small>{formatStacks(e.count)}</small></span>
          </li>
        ))}
        {!liste.length && <li className="leer">Keine Blöcke in dieser Auswahl.</li>}
      </ul>
      <p className="summe">Summe: <strong>{summe.toLocaleString('de-DE')}</strong> Blöcke · {formatStacks(summe)}</p>
    </aside>
  );
}
