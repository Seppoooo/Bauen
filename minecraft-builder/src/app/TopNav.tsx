export type Tab = 'plan2d' | 'view3d' | 'projects' | 'stages' | 'todos';

interface Props {
  projectName: string;
  tab: Tab;
  onTab: (t: Tab) => void;
  openTodos: number;
  panelOpen: boolean;
  onTogglePanel: () => void;
}

const TABS: [Tab, string][] = [
  ['plan2d', '2D-Plan'],
  ['view3d', '3D-Ansicht'],
  ['projects', 'Baupläne'],
  ['stages', 'Etappen'],
  ['todos', 'Team-To-dos']
];

/** Kopfzeile mit Projekttitel, Reitern und „Menü einklappen“ */
export function TopNav({ projectName, tab, onTab, openTodos, panelOpen, onTogglePanel }: Props) {
  return (
    <header className="topnav">
      <div className="titel">{projectName} <span>Bauplan</span></div>
      <nav className="reiter" aria-label="Bereiche">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" className={tab === id ? 'aktiv' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => onTab(id)}>
            {label}{id === 'todos' && openTodos > 0 && <span className="zaehler">({openTodos})</span>}
          </button>
        ))}
      </nav>
      <button type="button" className="einklappen" onClick={onTogglePanel} aria-expanded={panelOpen}>
        {panelOpen ? 'Menü einklappen ▸' : '◂ Menü ausklappen'}
      </button>
    </header>
  );
}
