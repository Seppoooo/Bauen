"""Einstellungen für Jarvis – werden aus Umgebungsvariablen bzw. einer .env-Datei gelesen."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

try:  # .env ist optional
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:  # pragma: no cover
    pass


def _env(name: str, default: str) -> str:
    value = os.getenv(name, "").strip()
    return value or default


@dataclass
class Settings:
    name: str = field(default_factory=lambda: _env("JARVIS_NAME", "Jarvis"))
    wake_word: str = field(default_factory=lambda: _env("JARVIS_WAKE_WORD", "jarvis").lower())
    user_title: str = field(default_factory=lambda: _env("JARVIS_ANREDE", "Sir"))
    language: str = field(default_factory=lambda: _env("JARVIS_SPRACHE", "de-DE"))
    model: str = field(default_factory=lambda: _env("JARVIS_MODEL", "claude-opus-5-5"))
    # low = schnelle Antworten (gut für Sprache); medium/high = gründlicher, aber langsamer
    effort: str = field(default_factory=lambda: _env("JARVIS_EFFORT", "low"))
    voice_rate: int = field(default_factory=lambda: int(_env("JARVIS_SPRECHTEMPO", "185")))
    data_dir: Path = field(
        default_factory=lambda: Path(_env("JARVIS_DATEN", str(Path.home() / ".jarvis"))).expanduser()
    )

    @property
    def has_api_key(self) -> bool:
        return bool(os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_AUTH_TOKEN"))


settings = Settings()
settings.data_dir.mkdir(parents=True, exist_ok=True)
