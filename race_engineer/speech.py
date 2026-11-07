"""Text-to-speech output. Uses the Windows voices (SAPI) - works offline.

Messages are queued by priority; outdated messages are dropped so the driver
never hears about a yellow flag that was cleared half a minute ago.
"""
from __future__ import annotations

import heapq
import itertools
import sys
import threading
import time

from .model import Callout

MAX_AGE = {0: 6.0, 1: 10.0, 2: 15.0, 3: 12.0}   # seconds per priority


class Speaker:
    def __init__(self, enabled: bool = True, voice: str | None = None,
                 rate: int = 1, volume: int = 100):
        self.enabled = enabled
        self.voice_hint = voice
        self.rate = rate            # SAPI: -10 .. 10
        self.volume = volume        # 0 .. 100
        self.backend = "aus"
        self.voice_name = ""
        self._queue: list = []
        self._counter = itertools.count()
        self._cv = threading.Condition()
        self._stop = False
        self._ready = threading.Event()
        if enabled:
            threading.Thread(target=self._run, name="speech", daemon=True).start()
            self._ready.wait(timeout=10)

    def say(self, callout: Callout):
        if not self.enabled:
            return
        with self._cv:
            heapq.heappush(self._queue, (callout.priority, next(self._counter), callout))
            self._cv.notify()

    def close(self):
        with self._cv:
            self._stop = True
            self._cv.notify()

    # ----------------------------------------------------------- backends
    def _init_sapi(self):
        import pythoncom  # noqa: F401  (pywin32)
        import win32com.client
        pythoncom.CoInitialize()
        voice = win32com.client.Dispatch("SAPI.SpVoice")
        voices = voice.GetVoices()
        chosen = None
        for i in range(voices.Count):
            v = voices.Item(i)
            desc = v.GetDescription()
            lang = ""
            try:
                lang = v.GetAttribute("Language")
            except Exception:
                pass
            if self.voice_hint and self.voice_hint.lower() in desc.lower():
                chosen = v
                break
            # 407 = German (Germany), c07 = Austria, 807 = Switzerland
            if chosen is None and (lang.lower() in ("407", "c07", "807") or "german" in desc.lower()
                                   or "deutsch" in desc.lower()):
                chosen = v
        if chosen is not None:
            voice.Voice = chosen
        voice.Rate = self.rate
        voice.Volume = self.volume
        self.voice_name = voice.Voice.GetDescription()
        return lambda text: voice.Speak(text, 0)

    def _init_pyttsx3(self):
        import pyttsx3
        engine = pyttsx3.init()
        for v in engine.getProperty("voices"):
            text = f"{v.name} {v.id} {getattr(v, 'languages', '')}".lower()
            if (self.voice_hint and self.voice_hint.lower() in text) or \
               (not self.voice_hint and ("german" in text or "deutsch" in text or "de_" in text or "de-" in text)):
                engine.setProperty("voice", v.id)
                break
        engine.setProperty("rate", 175 + self.rate * 10)
        self.voice_name = engine.getProperty("voice")

        def speak(text):
            engine.say(text)
            engine.runAndWait()
        return speak

    def _run(self):
        speak = None
        inits = [("Windows SAPI", self._init_sapi)] if sys.platform == "win32" else []
        inits.append(("pyttsx3", self._init_pyttsx3))
        for name, init in inits:
            try:
                speak = init()
                self.backend = name
                break
            except Exception as exc:  # backend missing -> try next one
                print(f"[Sprache] {name} nicht verfügbar: {exc}")
        if speak is None:
            print("[Sprache] Keine Sprachausgabe gefunden - Ansagen nur im Dashboard/Konsole.")
            self.enabled = False
            self._ready.set()
            return
        print(f"[Sprache] {self.backend} aktiv, Stimme: {self.voice_name}")
        self._ready.set()

        while True:
            with self._cv:
                while not self._queue and not self._stop:
                    self._cv.wait()
                if self._stop:
                    return
                _, _, callout = heapq.heappop(self._queue)
            if time.monotonic() - callout.created > MAX_AGE.get(callout.priority, 10):
                continue    # outdated
            try:
                speak(callout.text)
            except Exception as exc:
                print(f"[Sprache] Fehler: {exc}")
