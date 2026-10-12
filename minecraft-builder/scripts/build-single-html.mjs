#!/usr/bin/env node
/** Baut aus dist/ eine einzelne HTML-Datei (CSS und JS eingebettet), z. B. zum Weitergeben oder Hochladen. */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const wurzel = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(wurzel, 'dist', 'assets');
const js = readdirSync(assets).filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(assets, f), 'utf8')).join('\n');
const css = readdirSync(assets).filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(assets, f), 'utf8')).join('\n');
const ziel = process.argv[2] ?? join(wurzel, 'dist', 'minecraft-builder.html');
// Optional --base64: Baupläne liegen als projekte/*.mcbp.gz.b64.txt daneben (für Hoster ohne Binärdateien)
const base64 = process.argv.includes('--base64');
const sicher = js.replace(/<\/script/gi, '<\\/script');
writeFileSync(ziel, `<meta charset="utf-8">\n<title>Minecraft 3D Builder</title>\n<style>\n${css}\nbody{background:#0f1622}\n</style>\n<div id="root"></div>\n${base64 ? '<script>window.MCB_BASE64_PLAENE = true;</script>\n' : ''}<script type="module">\n${sicher}\n</script>\n`);
console.log('geschrieben:', ziel);
