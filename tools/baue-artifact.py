#!/usr/bin/env python3
"""Baut Einzeldatei-Versionen der Seiten (CSS/JS eingebettet) für die Online-Veröffentlichung.
Aufruf: python3 tools/baue-artifact.py <zielordner> [url-hauptseite] [url-3d]"""
import re, sys, shutil, pathlib
wurzel = pathlib.Path(__file__).resolve().parent.parent
ziel = pathlib.Path(sys.argv[1]); (ziel / 'assets').mkdir(parents=True, exist_ok=True)
url_haupt = sys.argv[2] if len(sys.argv) > 2 else 'index.html'
url_3d = sys.argv[3] if len(sys.argv) > 3 else '3d.html'

def baue(seite, css_datei, aus, vorspann=''):
    html = (wurzel / seite).read_text()
    kopf = html.split('<head>')[1].split('</head>')[0]
    koerper = html.split('<body>')[1].split('</body>')[0]
    titel = re.search(r'<title>.*?</title>', kopf).group(0)
    links = '\n'.join(re.findall(r'<link [^>]*fonts\.g[^>]*>', kopf))
    css = (wurzel / css_datei).read_text()
    if 'color-scheme: dark' not in css.split('}')[0]:
        css = css.replace(':root {', ':root {\n  color-scheme: dark;', 1)
    koerper = re.sub(r'<script src="(js/[^"]+)"></script>',
                     lambda m: '<script>\n' + (wurzel / m.group(1)).read_text() + '\n</script>', koerper)
    koerper = koerper.replace('href="3d.html"', f'href="{url_3d}"').replace('href="index.html"', f'href="{url_haupt}"')
    if vorspann:
        koerper = koerper.replace('<script', vorspann + '<script', 1)
    (ziel / aus).write_text(f'{titel}\n{links}\n<style>\n{css}\n</style>\n{koerper}')
    print('geschrieben:', ziel / aus)

basis = 'https://github.com/seppoooo/bauen/raw/claude/minecraft-website-bauanleitung-2s2or9/schematics/'
konfig = f'<script>window.HOGWARTS_DOWNLOAD = {{ basis: "{basis}", attr: \'target="_blank" rel="noopener"\' }};</script>\n'
baue('index.html', 'css/style.css', 'hogwarts.html', konfig)
haupt = (ziel / 'hogwarts.html').read_text().replace('Die Dateien sind für Minecraft 1.20.1 erstellt;',
  'Die Links öffnen die Dateien in deinem GitHub-Repo (dort auf „Download“ tippen). Die Dateien sind für Minecraft 1.20.1 erstellt;')
(ziel / 'hogwarts.html').write_text(haupt)
baue('3d.html', 'css/welt3d.css', 'hogwarts-3d.html')
shutil.copy(wurzel / 'assets/gesamtansicht.webp', ziel / 'assets/gesamtansicht.webp')
