/** Team-To-dos: einfache Aufgabenliste pro Projekt, im Browser gespeichert. */

export interface Todo {
  id: string;
  text: string;
  person: string;
  step: number | null;
  done: boolean;
}

const key = (projekt: string) => `mc-builder.todos.${projekt}`;

export function loadTodos(projekt: string): Todo[] {
  try {
    const raw = localStorage.getItem(key(projekt));
    return raw ? (JSON.parse(raw) as Todo[]) : [];
  } catch {
    return [];
  }
}

export function saveTodos(projekt: string, todos: Todo[]): void {
  try {
    localStorage.setItem(key(projekt), JSON.stringify(todos));
  } catch {
    /* Speicher nicht verfügbar – Liste bleibt nur bis zum Neuladen */
  }
}

export const neueId = () => `t${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
