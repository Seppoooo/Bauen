import { useState } from 'react';
import type { BuildProject } from '../../builder/BuildProject';
import { neueId, type Todo } from '../../builder/Todos';

interface Props {
  project: BuildProject;
  todos: Todo[];
  onTodos: (t: Todo[]) => void;
}

/** Team-To-dos: wer baut was, verknüpft mit einer Etappe */
export function TodosView({ project, todos, onTodos }: Props) {
  const [text, setText] = useState('');
  const [person, setPerson] = useState('');
  const [step, setStep] = useState<number | null>(null);
  const hinzufuegen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onTodos([...todos, { id: neueId(), text: text.trim(), person: person.trim(), step, done: false }]);
    setText('');
  };
  const offen = todos.filter((t) => !t.done), erledigt = todos.filter((t) => t.done);
  const zeile = (t: Todo) => (
    <li key={t.id} className={t.done ? 'erledigt' : ''}>
      <label>
        <input type="checkbox" checked={t.done} onChange={() => onTodos(todos.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))} />
        <span>{t.text}</span>
      </label>
      {t.person && <span className="chip">{t.person}</span>}
      {t.step !== null && <span className="chip leise">Etappe {t.step}</span>}
      <button type="button" className="mini loeschen" aria-label="Aufgabe löschen" onClick={() => onTodos(todos.filter((x) => x.id !== t.id))}>✕</button>
    </li>
  );
  return (
    <div className="seite">
      <section className="karte gross">
        <h2>Neue Aufgabe</h2>
        <form className="todo-form" onSubmit={hinzufuegen}>
          <input id="todoText" className="eingabe" placeholder="z. B. Dach vom Bergfried decken" value={text} onChange={(e) => setText(e.target.value)} />
          <input id="todoPerson" className="eingabe" placeholder="Wer?" value={person} onChange={(e) => setPerson(e.target.value)} />
          <select id="todoEtappe" value={step ?? ''} onChange={(e) => setStep(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Keine Etappe</option>
            {project.steps.map((s) => <option key={s.id} value={s.id}>{s.id}. {s.name}</option>)}
          </select>
          <button type="submit">Hinzufügen</button>
        </form>
      </section>
      <section className="karte">
        <h2>Offen ({offen.length})</h2>
        <ul className="todos">{offen.map(zeile)}{!offen.length && <li className="leer">Alles erledigt.</li>}</ul>
        {erledigt.length > 0 && (<><h2>Erledigt ({erledigt.length})</h2><ul className="todos">{erledigt.map(zeile)}</ul></>)}
      </section>
    </div>
  );
}
