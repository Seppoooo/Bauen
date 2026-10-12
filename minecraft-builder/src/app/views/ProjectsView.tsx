import { useRef, useState } from 'react';
import type { BuildProject } from '../../builder/BuildProject';
import { projectBounds } from '../../builder/BuildProject';
import { deleteProject, listProjects, loadStored } from '../../builder/ProjectStore';

interface Props {
  project: BuildProject;
  actions: {
    ladeUrl: (url: string, titel: string) => void;
    neu: () => void;
    demo: () => void;
    importieren: (f: File) => void;
    exportieren: () => void;
    speichern: () => void;
    laden: (data: unknown) => void;
    umbenennen: (name: string) => void;
  };
}

const MITGELIEFERT = [
  { name: 'Hogwarts mit Berg', url: './projekte/hogwarts.mcbp.gz', info: '1,1 Mio. sichtbare Blöcke · 500 × 500 · 9 Etappen · braucht einen guten PC' },
  { name: 'Hogwarts – nur Schloss', url: './projekte/hogwarts-schloss.mcbp.gz', info: '245.000 Blöcke · Schloss, Viadukt, Brückenkopf' }
];

/** Baupläne: aktuelles Projekt, gespeicherte Projekte, Import und Export */
export function ProjectsView({ project, actions }: Props) {
  const datei = useRef<HTMLInputElement>(null);
  const [, neuZeichnen] = useState(0);
  const liste = listProjects();
  const b = projectBounds(project.blocks);
  return (
    <div className="seite">
      <section className="karte gross">
        <h2>Aktueller Bauplan</h2>
        <label className="feld">Name<input id="projektName" className="eingabe" value={project.name} onChange={(e) => actions.umbenennen(e.target.value)} /></label>
        <dl className="werte">
          <div><dt>Blöcke</dt><dd>{project.blocks.length.toLocaleString('de-DE')}</dd></div>
          <div><dt>Größe</dt><dd>{b.max[0] - b.min[0] + 1} × {b.max[1] - b.min[1] + 1} × {b.max[2] - b.min[2] + 1}</dd></div>
          <div><dt>Stockwerke</dt><dd>{project.floors.length}</dd></div>
          <div><dt>Etappen</dt><dd>{project.steps.length}</dd></div>
          <div><dt>Minecraft</dt><dd>{project.minecraftVersion ?? '–'}</dd></div>
        </dl>
        {project.description && <p className="hinweis">{project.description}</p>}
        <div className="reihe">
          <button type="button" onClick={actions.speichern}>Im Browser speichern</button>
          <button type="button" onClick={actions.exportieren}>Als JSON exportieren</button>
          <button type="button" onClick={() => datei.current?.click()}>Importieren (.json, .mcbp, .litematic, .schem)</button>
          <button type="button" onClick={actions.neu}>Neuer leerer Bauplan</button>
          <button type="button" onClick={actions.demo}>Beispielburg laden</button>
        </div>
        <input ref={datei} id="dateiImport" type="file" accept=".json,.mcbp,.gz,.litematic,.schem" hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) actions.importieren(f); e.target.value = ''; }} />
      </section>
      <section className="karte">
        <h2>Mitgelieferte Baupläne</h2>
        <ul className="projektliste">
          {MITGELIEFERT.map((p) => (
            <li key={p.url}>
              <div><strong>{p.name}</strong><small>{p.info}</small></div>
              <button type="button" onClick={() => actions.ladeUrl(p.url, p.name)}>Öffnen</button>
            </li>
          ))}
          <li>
            <div><strong>Beispielburg</strong><small>9.667 Blöcke · eingerichtet · 8 Etappen</small></div>
            <button type="button" onClick={actions.demo}>Öffnen</button>
          </li>
        </ul>
      </section>
      <section className="karte">
        <h2>Gespeicherte Baupläne</h2>
        <ul className="projektliste">
          {liste.map((p) => (
            <li key={p.id}>
              <div><strong>{p.name}</strong><small>{p.blocks.toLocaleString('de-DE')} Blöcke · {new Date(p.updated).toLocaleString('de-DE')}</small></div>
              <button type="button" onClick={() => { const d = loadStored(p.id); if (d) actions.laden(d); }}>Öffnen</button>
              <button type="button" className="loeschen" onClick={() => { deleteProject(p.id); neuZeichnen((n) => n + 1); }}>Löschen</button>
            </li>
          ))}
          {!liste.length && <li className="leer">Noch nichts gespeichert. „Im Browser speichern“ legt den aktuellen Bauplan hier ab.</li>}
        </ul>
      </section>
    </div>
  );
}
