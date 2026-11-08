"""Das KI-Gehirn: Claude versteht die Anfrage und ruft bei Bedarf die Werkzeuge aus tools.py auf."""

from __future__ import annotations

import anthropic
from anthropic import beta_tool

from . import tools
from .config import settings

SYSTEM_PROMPT = f"""Du bist {settings.name}, ein persönlicher KI-Assistent im Stil von J.A.R.V.I.S. aus Iron Man:
höflich, loyal, souverän und mit trockenem britischem Humor. Du sprichst den Benutzer mit "{settings.user_title}" an.

Deine Antworten werden laut vorgelesen. Deshalb:
- Antworte auf Deutsch, kurz und natürlich gesprochen – meist ein bis drei Sätze.
- Keine Aufzählungszeichen, keine Tabellen, kein Markdown, keine Emojis, keine URLs vorlesen.
- Zahlen und Uhrzeiten so schreiben, wie man sie spricht.

Du läufst auf dem Computer des Benutzers ({tools.SYSTEM}) und kannst ihn über deine Werkzeuge steuern.
Nutze sie, wann immer sie zur Bitte passen, und bestätige danach kurz, was du getan hast.
Für Uhrzeit, Datum und Wetter rufe immer das passende Werkzeug auf, statt zu raten.
Wenn ein Werkzeug fehlschlägt, sage ehrlich, was nicht geklappt hat."""

FALLBACK_BETA = "server-side-fallback-2026-07-01"


class Brain:
    def __init__(self) -> None:
        self.client = anthropic.Anthropic()
        self.tools = [beta_tool(fn) for fn in tools.ALL_FUNCTIONS]
        self.history: list = []

    def reset(self) -> None:
        self.history = []

    def ask(self, text: str) -> str:
        """Schickt eine Anfrage an Claude, führt angeforderte Werkzeuge aus und gibt die Antwort zurück."""
        # Sehr lange Gespräche neu beginnen (Kürzen würde den Gesprächsverlauf verändern).
        if len(self.history) > 200:
            self.reset()

        messages = [*self.history, {"role": "user", "content": text}]
        new_messages: list = [messages[-1]]

        try:
            runner = self.client.beta.messages.tool_runner(
                model=settings.model,
                max_tokens=16000,
                system=SYSTEM_PROMPT,
                tools=self.tools,
                messages=messages,
                thread=False,
                output_config={"effort": settings.effort},
                # Falls Claude eine Anfrage aus Sicherheitsgründen ablehnt, darf ein anderes Modell übernehmen.
                betas=[FALLBACK_BETA],
                fallbacks="default",
                max_iterations=10,
            )
            final = None
            for message in runner:
                final = message
                new_messages.append(message.to_param())
                if message.stop_reason == "tool_use":
                    for block in message.content:
                        if block.type == "tool_use":
                            print(f"  [Werkzeug] {block.name}({block.input})")
                    results = runner.generate_tool_call_response()
                    if results is not None:
                        new_messages.append(results)
        except anthropic.AuthenticationError:
            return "Mein API-Schlüssel wird nicht akzeptiert. Bitte prüfen Sie die Datei .env."
        except anthropic.RateLimitError:
            return "Ich bin gerade überlastet. Bitte versuchen Sie es gleich noch einmal."
        except anthropic.APIConnectionError:
            return "Ich erreiche meine Server nicht. Besteht eine Internetverbindung?"
        except anthropic.APIStatusError as exc:
            return f"Bei der Verbindung zu meinem Gehirn ist ein Fehler aufgetreten: {exc.status_code}."

        if final is None:
            return "Dazu habe ich leider keine Antwort."
        if final.stop_reason == "refusal":
            return "Dabei kann ich Ihnen leider nicht helfen."

        # Nur vollständige Runden in den Verlauf übernehmen, damit er gültig bleibt.
        if final.stop_reason != "tool_use":
            self.history.extend(new_messages)

        answer = " ".join(b.text for b in final.content if b.type == "text").strip()
        return answer or "Erledigt."
