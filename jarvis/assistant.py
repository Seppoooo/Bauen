"""Hauptschleife: auf das Aktivierungswort warten, zuhören, denken, antworten."""

from __future__ import annotations

import argparse
import datetime as dt
import re

from . import offline, tools
from .config import settings
from .voice import Listener, Speaker

EXIT_WORDS = ("beenden", "auf wiedersehen", "tschüss", "schlaf gut", "programm beenden", "jarvis aus")
RESET_WORDS = ("neues gespräch", "vergiss alles", "neu anfangen")
FOLLOW_UP_SECONDS = 6  # so lange hört Jarvis nach einer Antwort ohne Aktivierungswort weiter zu


def _greeting() -> str:
    hour = dt.datetime.now().hour
    tageszeit = "Guten Morgen" if hour < 11 else "Guten Tag" if hour < 18 else "Guten Abend"
    return f"{tageszeit}, {settings.user_title}. {settings.name} ist online. Wie kann ich helfen?"


class Assistant:
    def __init__(self, use_microphone: bool, use_voice: bool, always_listen: bool) -> None:
        self.speaker = Speaker(enabled=use_voice)
        self.listener = Listener(use_microphone=use_microphone)
        # Im Textmodus braucht man kein Aktivierungswort
        self.always_listen = always_listen or not self.listener.use_microphone
        tools.say = lambda text: self.speaker.say(text, wait=False)
        tools.confirm = self._confirm

        self.brain = None
        if settings.has_api_key:
            from .brain import Brain

            self.brain = Brain()
        else:
            print("[Hinweis] Kein ANTHROPIC_API_KEY gefunden – Jarvis läuft im einfachen Offline-Modus.")

    def _confirm(self, question: str) -> bool:
        self.speaker.say(question)
        answer = (self.listener.listen(timeout=8) or "").lower()
        return any(w in answer for w in ("ja", "jawohl", "mach", "bestätigt", "okay", "ok", "sicher"))

    def _strip_wake_word(self, text: str) -> str | None:
        """Gibt den Befehl nach dem Aktivierungswort zurück ('' = nur gerufen), sonst None."""
        match = re.search(rf"\b{re.escape(settings.wake_word)}\b[,.!?]?\s*(.*)", text, re.IGNORECASE)
        return match.group(1).strip() if match else None

    def respond(self, command: str) -> bool:
        """Verarbeitet einen Befehl. Gibt False zurück, wenn Jarvis beendet werden soll."""
        low = command.lower().strip(" .!?")
        if any(low == w or low.startswith(w) for w in EXIT_WORDS):
            self.speaker.say(f"Sehr wohl, {settings.user_title}. Ich fahre herunter.")
            return False
        if any(w in low for w in RESET_WORDS):
            if self.brain:
                self.brain.reset()
            self.speaker.say("Erledigt. Wir beginnen von vorn.")
            return True

        if self.brain:
            print("  ...denke nach...")
            answer = self.brain.ask(command)
        else:
            answer = offline.handle(command) or (
                "Das verstehe ich im Offline-Modus leider nicht. "
                "Mit einem API-Schlüssel kann ich mich richtig mit Ihnen unterhalten."
            )
        self.speaker.say(answer)
        return True

    def run(self) -> None:
        self.speaker.say(_greeting())
        if not self.always_listen:
            print(f"(Sag „{settings.wake_word.capitalize()}“, gefolgt von deinem Wunsch. Strg+C beendet.)")

        follow_up = False
        while True:
            heard = self.listener.listen(timeout=FOLLOW_UP_SECONDS if follow_up else None)
            if not heard:
                follow_up = False
                continue

            if self.always_listen or follow_up:
                command = self._strip_wake_word(heard)
                command = heard if command is None else command
            else:
                command = self._strip_wake_word(heard)
                if command is None:
                    continue  # nicht angesprochen

            if not command:  # nur "Jarvis" gerufen
                self.speaker.say(f"Ja, {settings.user_title}?")
                command = self.listener.listen(timeout=8)
                if not command:
                    continue

            if not self.respond(command):
                break
            follow_up = self.listener.use_microphone


def main() -> None:
    parser = argparse.ArgumentParser(description=f"{settings.name} – dein persönlicher KI-Assistent")
    parser.add_argument("--text", action="store_true", help="Tastatur statt Mikrofon verwenden")
    parser.add_argument("--stumm", action="store_true", help="Antworten nicht vorlesen")
    parser.add_argument("--immer", action="store_true", help="ohne Aktivierungswort auf alles reagieren")
    args = parser.parse_args()

    assistant = Assistant(use_microphone=not args.text, use_voice=not args.stumm, always_listen=args.immer)
    try:
        assistant.run()
    except KeyboardInterrupt:
        print("\nBis bald!")
