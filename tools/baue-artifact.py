#!/usr/bin/env python3
"""Baut eine Einzeldatei-Version der Seite (CSS/JS eingebettet) für die Online-Veröffentlichung.
Aufruf: python3 tools/baue-artifact.py <zielordner>"""
import re, sys, shutil, pathlib
wurzel = pathlib.Path(__file__).resolve().parent.parent
ziel = pathlib.Path(sys.argv[1]); (ziel / 'assets').mkdir(parents=True, exist_ok=True)
html = (wurzel / 'index.html').read_text()
kopf = html.split('<head>')[1].split('</head>')[0]
koerper = html.split('<body>')[1].split('</body>')[0]
titel = re.search(r'<title>.*?</title>', kopf).group(0)
links = '\n'.join(re.findall(r'<link [^>]*fonts\.g[^>]*>', kopf))
css = (wurzel / 'css/style.css').read_text().replace(':root {', ':root {\n  color-scheme: dark;', 1)
def skript(m):
    return '<script>\n' + (wurzel / m.group(1)).read_text() + '\n</script>'
koerper = re.sub(r'<script src="(js/[^"]+)"></script>', skript, koerper)
basis = 'https://github.com/seppoooo/bauen/raw/claude/minecraft-website-bauanleitung-2s2or9/schematics/'
konfig = f'<script>window.HOGWARTS_DOWNLOAD = {{ basis: "{basis}", attr: \'target="_blank" rel="noopener"\' }};</script>\n'
koerper = koerper.replace('<script>\n', konfig + '<script>\n', 1)
koerper = koerper.replace('Die Dateien sind für Minecraft 1.20.1 erstellt;',
  'Die Links öffnen die Dateien in deinem GitHub-Repo (dort auf „Download“ tippen). Die Dateien sind für Minecraft 1.20.1 erstellt;')
(ziel / 'hogwarts.html').write_text(f'{titel}\n{links}\n<style>\n{css}\n</style>\n{koerper}')
shutil.copy(wurzel / 'assets/gesamtansicht.webp', ziel / 'assets/gesamtansicht.webp')
print('geschrieben:', ziel / 'hogwarts.html')
