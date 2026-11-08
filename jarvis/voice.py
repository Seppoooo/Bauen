"""Sprachausgabe (pyttsx3, offline) und Spracherkennung (SpeechRecognition).

Fehlt ein Mikrofon oder eine Bibliothek, fällt Jarvis automatisch auf Tastatur bzw. Textausgabe zurück.
"""

from __future__ import annotations

import queue
import re
import threading

from .config import settings


def _clean_for_speech(text: str) -> str:
    """Entfernt Markdown-Reste, damit die Stimme keine Sternchen vorliest."""
    text = re.sub(r"[*_#`>]+", "", text)
    text = re.sub(r"\[(.*?)\]\((.*?)\)", r"\1", text)
    return text.strip()


class Speaker:
    """Spricht Text in einem eigenen Thread – so können auch Timer von außen sprechen."""

    def __init__(self, enabled: bool = True) -> None:
        self.enabled = enabled
        self._queue: queue.Queue[tuple[str, threading.Event]] = queue.Queue()
        self._voice_id: str | None = None
        if enabled:
            try:
                import pyttsx3  # noqa: F401
            except ImportError:
                print("[Hinweis] pyttsx3 fehlt – Jarvis antwortet nur als Text.")
                self.enabled = False
        threading.Thread(target=self._worker, daemon=True).start()

    def _pick_voice(self, engine) -> None:
        if self._voice_id is not None:
            engine.setProperty("voice", self._voice_id)
            return
        lang = settings.language.split("-")[0].lower()
        for voice in engine.getProperty("voices"):
            info = f"{voice.id} {voice.name} {getattr(voice, 'languages', '')}".lower()
            if lang in info or ("german" in info and lang == "de") or ("deutsch" in info and lang == "de"):
                self._voice_id = voice.id
                engine.setProperty("voice", voice.id)
                return
        self._voice_id = ""  # keine passende Stimme gefunden -> Standardstimme

    def _worker(self) -> None:
        while True:
            text, done = self._queue.get()
            try:
                if self.enabled:
                    import pyttsx3

                    # Pro Satz neu initialisieren: umgeht bekannte Hänger von runAndWait()
                    engine = pyttsx3.init()
                    engine.setProperty("rate", settings.voice_rate)
                    self._pick_voice(engine)
                    engine.say(text)
                    engine.runAndWait()
                    engine.stop()
            except Exception as exc:  # Sprachausgabe darf Jarvis nie abstürzen lassen
                print(f"[Sprachausgabe-Fehler] {exc}")
            finally:
                done.set()

    def say(self, text: str, wait: bool = True) -> None:
        text = _clean_for_speech(text)
        if not text:
            return
        print(f"\n{settings.name}: {text}")
        done = threading.Event()
        self._queue.put((text, done))
        if wait:
            done.wait()


class Listener:
    """Hört über das Mikrofon zu. Ohne Mikrofon wird stattdessen die Tastatur benutzt."""

    def __init__(self, use_microphone: bool = True) -> None:
        self.use_microphone = use_microphone
        self._sr = None
        self._recognizer = None
        self._mic = None
        if use_microphone:
            try:
                import speech_recognition as sr

                self._sr = sr
                self._recognizer = sr.Recognizer()
                self._recognizer.dynamic_energy_threshold = True
                self._recognizer.pause_threshold = 0.8
                self._mic = sr.Microphone()
                with self._mic as source:
                    print("Kalibriere Mikrofon – bitte kurz still sein ...")
                    self._recognizer.adjust_for_ambient_noise(source, duration=1)
            except Exception as exc:
                print(f"[Hinweis] Kein Mikrofon nutzbar ({exc}). Wechsle in den Textmodus.")
                self.use_microphone = False

    def listen(self, timeout: float | None = None, phrase_limit: float = 15) -> str | None:
        """Gibt den erkannten Text zurück, oder None, wenn nichts verstanden wurde."""
        if not self.use_microphone:
            try:
                text = input("\nDu: ").strip()
            except EOFError:
                return "beenden"
            return text or None

        sr = self._sr
        try:
            with self._mic as source:
                audio = self._recognizer.listen(source, timeout=timeout, phrase_time_limit=phrase_limit)
        except sr.WaitTimeoutError:
            return None
        try:
            text = self._recognizer.recognize_google(audio, language=settings.language)
        except sr.UnknownValueError:
            return None
        except sr.RequestError as exc:
            print(f"[Spracherkennung nicht erreichbar] {exc}")
            return None
        print(f"\nDu: {text}")
        return text
