#!/usr/bin/env python3
"""Scannt site/media/ nach Videos und erzeugt site/js/library.js.

Unterordner werden zu Kategorien, z. B.:
    site/media/Paare/mein_video.mp4  -> Kategorie "Paare", Titel "mein video"

Mit ffmpeg/ffprobe (falls installiert) werden Länge und Vorschaubilder erzeugt.
"""
import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent / "site"
MEDIA = SITE / "media"
THUMBS = MEDIA / ".thumbs"
OUT = SITE / "js" / "library.js"
EXTS = {".mp4", ".webm", ".m4v", ".mov", ".ogv"}

HAS_FFPROBE = shutil.which("ffprobe") is not None
HAS_FFMPEG = shutil.which("ffmpeg") is not None


def duration(path: Path) -> int:
    if not HAS_FFPROBE:
        return 0
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=nw=1:nk=1", str(path)],
            capture_output=True, text=True, timeout=30, check=True,
        ).stdout.strip()
        return int(float(out))
    except (subprocess.SubprocessError, ValueError):
        return 0


def thumbnail(path: Path, idx: int, secs: int) -> str:
    if not HAS_FFMPEG:
        return ""
    THUMBS.mkdir(parents=True, exist_ok=True)
    target = THUMBS / f"{idx}.jpg"
    if not target.exists() or target.stat().st_mtime < path.stat().st_mtime:
        at = str(max(1, secs // 5)) if secs else "1"
        subprocess.run(
            ["ffmpeg", "-y", "-v", "error", "-ss", at, "-i", str(path),
             "-frames:v", "1", "-vf", "scale=480:-2", str(target)],
            timeout=60,
        )
    return target.relative_to(SITE).as_posix() if target.exists() else ""


def main() -> int:
    if not MEDIA.exists():
        print(f"Ordner fehlt: {MEDIA}")
        return 1
    files = sorted(
        p for p in MEDIA.rglob("*")
        if p.suffix.lower() in EXTS and ".thumbs" not in p.parts
    )
    videos, cats = [], []
    for i, p in enumerate(files, start=1):
        rel = p.relative_to(MEDIA)
        cat = rel.parts[0] if len(rel.parts) > 1 else "Sonstiges"
        if cat not in cats:
            cats.append(cat)
        secs = duration(p)
        title = p.stem.replace("_", " ").replace("-", " ").strip()
        videos.append({
            "id": i,
            "title": title,
            "category": cat,
            "tags": [w.lower() for w in title.split() if len(w) > 2][:5],
            "duration": secs,
            "views": 0,
            "rating": 100,
            "uploaded": datetime.fromtimestamp(p.stat().st_mtime, timezone.utc).isoformat(),
            "uploader": "ich",
            "thumb": thumbnail(p, i, secs),
            "src": p.relative_to(SITE).as_posix(),
        })
        print(f"  [{cat}] {title}")

    OUT.write_text(
        "// Automatisch erzeugt von tools/scan_media.py – nicht von Hand bearbeiten.\n"
        f"window.CATEGORIES = {json.dumps(cats, ensure_ascii=False)};\n"
        f"window.VIDEOS = {json.dumps(videos, ensure_ascii=False, indent=1)};\n",
        encoding="utf-8",
    )
    print(f"{len(videos)} Videos -> {OUT.relative_to(SITE.parent)}")
    if not HAS_FFMPEG:
        print("Hinweis: ffmpeg nicht gefunden – keine Vorschaubilder/Längen.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
