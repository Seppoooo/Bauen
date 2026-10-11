#!/usr/bin/env node
/* Rendert die Gesamtansicht (Berg + alle Bauwerke) als Bild für die Startseite.
 * Benötigt Playwright:  node tools/rendere-gesamtansicht.js
 * Ergebnis: assets/gesamtansicht.webp */
'use strict';
const path = require('path');
const fs = require('fs');
let playwright;
try { playwright = require('playwright'); } catch (e) { playwright = require('/opt/node22/lib/node_modules/playwright'); }

(async () => {
  const browser = await playwright.chromium.launch();
  const seite = await browser.newPage();
  const url = 'file://' + path.join(__dirname, 'gesamtansicht.html') + '?s=2';
  await seite.goto(url);
  await seite.waitForFunction(() => window.fertig, null, { timeout: 120000 });
  const daten = await seite.evaluate(() => window.fertig);
  const ziel = path.join(__dirname, '..', 'assets', 'gesamtansicht.webp');
  fs.writeFileSync(ziel, Buffer.from(daten.split(',')[1], 'base64'));
  console.log('gespeichert:', ziel, (fs.statSync(ziel).size / 1024).toFixed(0) + ' KB');
  await browser.close();
})();
