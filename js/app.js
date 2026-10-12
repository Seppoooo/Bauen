(function () {
  'use strict';
  const { BAUWERKE, TEILE, block } = window.HogwartsModell;
  const ALLE = BAUWERKE.concat(TEILE);
  const R = window.HogwartsRender;
  // Ablageort der .litematic-Dateien (für die Online-Version auf GitHub umgestellt)
  const DOWNLOAD = window.HOGWARTS_DOWNLOAD || { basis: 'schematics/', attr: 'download' };
  const $ = (s, el) => (el || document).querySelector(s);

  /* ---------- Modelle (werden einmal berechnet) ---------- */
  const cache = {};
  const modell = (id) => {
    if (!cache[id]) {
      const b = ALLE.find((e) => e.id === id);
      cache[id] = TEILE.includes(b) ? b.erstelle(modell('berg')) : b.erstelle();
    }
    return cache[id];
  };
  const bauwerk = (id) => ALLE.find((b) => b.id === id);

  const PLATZ = Object.fromEntries(ALLE.map((b) => [b.id, b.lage]));

  const zahl = (n) => n.toLocaleString('de-DE');
  function stapel(n) {
    const st = Math.floor(n / 64), rest = n % 64;
    let t = st ? `${zahl(st)} Stacks${rest ? ' + ' + rest : ''}` : `${rest} Stück`;
    if (n >= 1728) t += ` · ≈ ${(n / 1728).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Shulker`;
    return t;
  }
  function speicher(key, wert) {
    try {
      if (wert === undefined) return JSON.parse(localStorage.getItem(key));
      localStorage.setItem(key, JSON.stringify(wert));
    } catch (e) { return null; }
  }
  const spaeter = (fn) => new Promise((ok) => setTimeout(() => { fn(); ok(); }, 0));

  /* ---------- Hauptbild und Detailansichten ---------- */
  const ANSICHTEN = {
    innenhof: { bereich: [58, 60, 124, 130], maxY: 40, y: 4 },
    halle: { bereich: [56, 36, 124, 72], maxY: 21, y: 5 },
    bibliothek: { bereich: [40, 70, 68, 128], maxY: 8, y: 6 },
    hauptschloss: { bereich: [0, 0, 180, 150], maxY: 99, y: 4 }
  };

  function zeichneDetails() {
    const m = modell('hauptschloss');
    document.querySelectorAll('.detail').forEach((fig) => {
      const a = ANSICHTEN[fig.dataset.ansicht];
      R.iso($('canvas', fig), m, { s: fig.dataset.ansicht === 'hauptschloss' ? 2 : 4, bereich: a.bereich, maxY: a.maxY, nacht: fig.dataset.ansicht !== 'innenhof' });
      fig.addEventListener('click', () => oeffneViewer('hauptschloss', a.y));
    });
  }

  /* ---------- Grundrisse ---------- */
  function zeichneGrundrisse() {
    const m = modell('hauptschloss');
    document.querySelectorAll('.grundriss-raster figure').forEach((fig) => {
      const c = $('canvas', fig);
      if (fig.dataset.y === 'dach') {
        R.draufsicht(c, m, 2, false);
        fig.addEventListener('click', () => oeffneViewer('hauptschloss', 40));
      } else {
        const y = +fig.dataset.y;
        R.grundriss(c, m, y, 2);
        fig.addEventListener('click', () => oeffneViewer('hauptschloss', y));
      }
    });
  }

  /* ---------- Lageplan ---------- */
  const LEGENDE = [
    ['Hauptschloss', 250, 128], ['Innenhof', 250, 205], ['Große Halle', 250, 164], ['Bibliothek', 214, 214],
    ['Westflügel', 186, 188], ['Ostflügel', 315, 181], ['Eingang & Brücke', 250, 322],
    ['Gewächshäuser', 86, 220], ['Quidditch-Feld', 425, 350], ['Hagrids Hütte', 341, 428], ['Brückenkopf & Steinkreis', 272, 400]
  ];

  function zeichneLageplan() {
    const ns = 'http://www.w3.org/2000/svg';
    const bilder = ['berg', 'hauptschloss', 'bruecke', 'brueckenkopf', 'hagrid', 'gewaechshaeuser', 'quidditch'].map((id) => {
      const [x, , z] = PLATZ[id];
      const m = modell(id), c = document.createElement('canvas');
      R.draufsicht(c, m, 1, false, id === 'berg');
      // Hintergrund transparent machen
      const g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < d.data.length; i += 4) {
        if (d.data[i] === 12 && d.data[i + 1] === 33 && d.data[i + 2] === 66) d.data[i + 3] = 0;
      }
      g.putImageData(d, 0, 0);
      return `<image href="${c.toDataURL()}" x="${x}" y="${z}" width="${m.sx}" height="${m.sz}" style="image-rendering:pixelated"/>`;
    }).join('');

    const marker = LEGENDE.map(([, x, z], i) =>
      `<g transform="translate(${x},${z})"><circle r="9" fill="rgba(10,26,51,.85)" stroke="#fff" stroke-width="1.4"/>` +
      `<text y="3.6" text-anchor="middle" font-size="10" fill="#fff" font-family="Cinzel,serif">${i + 1}</text></g>`).join('');

    $('#lageplanSvg').innerHTML = `
<svg xmlns="${ns}" viewBox="0 0 500 500" role="img" aria-label="Lageplan des 500 mal 500 Blöcke großen Areals">
  <rect width="500" height="500" fill="#1f3a26"/>
  ${bilder}
  ${marker}
  <g transform="translate(36,36)" fill="#fff" font-family="Cinzel,serif" font-size="9" text-anchor="middle">
    <circle r="20" fill="none" stroke="#fff" stroke-width=".8"/>
    <path d="M0 -24 L5 0 L0 24 L-5 0Z" fill="#fff" opacity=".9"/><path d="M-24 0 L0 4 L24 0 L0 -4Z" fill="#fff" opacity=".5"/>
    <text y="-27">N</text><text y="34">S</text><text x="-30" y="3">W</text><text x="30" y="3">O</text>
  </g>
  <g font-family="EB Garamond,serif" font-size="9" fill="#cfe0ff">
    <line x1="380" y1="485" x2="480" y2="485" stroke="#cfe0ff"/><text x="430" y="479" text-anchor="middle">100 Blöcke</text>
  </g>
</svg>`;
    $('#legende').innerHTML = LEGENDE.map(([n]) => `<li>${n}</li>`).join('');
  }

  /* ---------- Materialliste ---------- */
  function materialVon(ids) {
    const summe = {};
    for (const id of ids) for (const e of modell(id).material()) {
      summe[e.mat] = summe[e.mat] || { ...e, anzahl: 0 };
      summe[e.mat].anzahl += e.anzahl;
    }
    return Object.values(summe).sort((a, b) => b.anzahl - a.anzahl);
  }
  function listeHtml(eintraege, mitStapeln) {
    return eintraege.map((e) => `<li><span class="muster" style="background:${e.farbe}"></span><span>${e.mat}</span>` +
      `<span class="zahl">${zahl(e.anzahl)}${mitStapeln ? `<small>${stapel(e.anzahl)}</small>` : ''}</span></li>`).join('');
  }
  function zeigeMaterial() {
    const wahl = $('#materialAuswahl').value;
    const ids = wahl === 'alle' ? BAUWERKE.map((b) => b.id) : [wahl];
    const liste = materialVon(ids);
    $('#materialListe').innerHTML = listeHtml(liste, true);
    $('#materialTitel').textContent = '(' + (wahl === 'alle' ? 'alle Bauwerke' : bauwerk(wahl).titel) + ')';
    const n = liste.reduce((a, e) => a + e.anzahl, 0);
    $('#materialSumme').textContent = `Summe: ${zahl(n)} Blöcke (${zahl(Math.ceil(n / 64))} Stacks)`;
  }

  /* ---------- Bauabschnitte ---------- */
  const ABSCHNITTE = [
    ['Berg formen', ['Grundform des Berges aus Erde und Stein (Talboden = Y 5, Gipfel-Plateau = Y 110) – Schematic „Berg & Gelände“',
      'Plateau 190 × 145 Blöcke für das Schloss, Schlucht unter der Brücke (Y 41), Südhügel (Y 114)', 'Felswände mit Stein, Andesit und Bruchstein; 3 Wasserquellen am Plateaurand bilden die Wasserfälle']],
    ['Fundament & Hauptschloss', ['Grundriss markieren – Schematic platzieren, Ebene 0–3 (Sockel) bauen',
      'Außenmauern und tragende Wände bauen', 'Etagenböden alle 6 Blöcke (Y 4, 10, 16)']],
    ['Türme & Dächer', ['15 Türme schrittweise hochziehen (Hauptturm 98 Blöcke hoch)',
      'Dächer aus Tiefenschieferfliesen und -treppen bauen', 'Blitzableiter aus Kupfer auf die Turmspitzen']],
    ['Innenausbau', ['Räume: Große Halle, Bibliothek, Klassenräume', 'Treppen, Leitern, Gänge',
      'Deko: Haustische, Banner in den Hausfarben, schwebende Laternen']],
    ['Brücke & Eingang', ['Zweistöckiges Viadukt vom Torbau zum Südhügel', 'Torhalle durch den Südflügel', 'Wege und Beleuchtung']],
    ['Außengelände', ['See mit Sandstrand, Fichten- und Eichenwälder, Wege', 'Gewächshäuser, Quidditch-Feld, Hagrids Hütte (auf geebneten Plätzen, Y 6)']],
    ['Feinschliff', ['Details, Banner, Gemälde, Blumen, Pflanzen', 'Nachtbeleuchtung & Atmosphäre']]
  ];
  function zeigeAbschnitte() {
    const erledigt = speicher('hogwarts-abschnitte') || [];
    const ol = $('#abschnitte');
    ol.innerHTML = ABSCHNITTE.map(([titel, punkte], i) =>
      `<li class="${erledigt[i] ? 'erledigt' : ''}"><label><input type="checkbox" data-i="${i}" ${erledigt[i] ? 'checked' : ''}>` +
      `<span><strong>${titel}</strong></span></label><ul>${punkte.map((p) => `<li>${p}</li>`).join('')}</ul></li>`).join('');
    const aktualisiere = () => {
      const n = erledigt.filter(Boolean).length;
      $('#fortschrittText').textContent = `${n} / ${ABSCHNITTE.length} erledigt`;
      $('#fortschrittBalken').style.width = (100 * n / ABSCHNITTE.length) + '%';
    };
    ol.addEventListener('change', (e) => {
      const i = +e.target.dataset.i;
      erledigt[i] = e.target.checked;
      e.target.closest('li').classList.toggle('erledigt', e.target.checked);
      speicher('hogwarts-abschnitte', erledigt);
      aktualisiere();
    });
    aktualisiere();
  }

  /* ---------- Ebenen-Viewer ---------- */
  const viewer = { id: 'hauptschloss', y: 4, p: 5, raster: true };
  let isoTimer = null;

  function zeichneEbene() {
    const m = modell(viewer.id);
    viewer.y = Math.max(0, Math.min(m.sy - 1, viewer.y));
    const regler = $('#ebeneRegler');
    regler.max = m.sy - 1; regler.value = viewer.y;
    $('#ebeneAnzeige').textContent = `Y ${viewer.y} / ${m.sy - 1}`;
    R.ebene($('#ebeneCanvas'), m, viewer.y, viewer.p, viewer.raster);
    $('#ebeneMaterial').innerHTML = listeHtml(m.material(viewer.y), false) || '<li><span></span><span>Leere Ebene</span><span></span></li>';
    clearTimeout(isoTimer);
    isoTimer = setTimeout(() => {
      const s = Math.max(1, Math.min(10, Math.floor(700 / (m.sx + m.sz))));
      R.iso($('#isoCanvas'), m, { s, maxY: viewer.y });
    }, 120);
  }

  function oeffneViewer(id, y) {
    viewer.id = id; viewer.y = y;
    $('#viewerAuswahl').value = id;
    zeichneEbene();
    $('#viewer').scrollIntoView({ behavior: 'smooth' });
  }

  function richteViewerEin() {
    const sel = $('#viewerAuswahl');
    sel.innerHTML = ALLE.map((b) => `<option value="${b.id}">${b.titel}</option>`).join('');
    sel.addEventListener('change', () => {
      viewer.id = sel.value;
      const m = modell(viewer.id);
      viewer.y = Math.min(viewer.y, m.sy - 1);
      viewer.p = Math.max(2, Math.min(18, Math.floor(900 / m.sx)));
      $('#zoomRegler').value = viewer.p;
      zeichneEbene();
    });
    $('#ebeneRegler').addEventListener('input', (e) => { viewer.y = +e.target.value; zeichneEbene(); });
    $('#ebeneHoch').addEventListener('click', () => { viewer.y++; zeichneEbene(); });
    $('#ebeneRunter').addEventListener('click', () => { viewer.y--; zeichneEbene(); });
    $('#zoomRegler').addEventListener('input', (e) => { viewer.p = +e.target.value; zeichneEbene(); });
    $('#rasterHaken').addEventListener('change', (e) => { viewer.raster = e.target.checked; zeichneEbene(); });
    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, select, textarea')) return;
      if (e.key === 'PageUp' || e.key === '+') { viewer.y++; zeichneEbene(); e.preventDefault(); }
      if (e.key === 'PageDown' || e.key === '-') { viewer.y--; zeichneEbene(); e.preventDefault(); }
    });
    const c = $('#ebeneCanvas');
    const zeige = (e) => {
      const r = c.getBoundingClientRect();
      const x = Math.floor((e.clientX - r.left) / viewer.p), z = Math.floor((e.clientY - r.top) / viewer.p);
      const m = modell(viewer.id);
      if (!m.drin(x, viewer.y, z)) return;
      const k = m.get(x, viewer.y, z);
      const [px, py, pz] = PLATZ[viewer.id];
      $('#ebeneInfo').textContent = `X ${x} · Y ${viewer.y} · Z ${z}  →  ${k === 'air' ? 'Luft' : block(k).mat}` +
        `   (im Areal: ${px + x} / ${py + viewer.y} / ${pz + z})`;
    };
    c.addEventListener('pointermove', zeige);
    c.addEventListener('pointerdown', zeige);
  }

  /* ---------- Downloads & Platzierung ---------- */
  function zeigeDownloads() {
    $('#downloads').innerHTML = `<a class="download gesamt" href="${DOWNLOAD.basis}hogwarts-gesamt.litematic" ${DOWNLOAD.attr}>` +
      `<strong>Gesamtprojekt</strong><span>Alle ${BAUWERKE.length} Bauwerke als Regionen in einer Datei – Berg, Schloss, Viadukt und Außengelände ` +
      `stehen schon an der richtigen Stelle. Einmal platzieren, fertig.</span><span>500 × 211 × 500</span>` +
      `<span class="datei">⬇ hogwarts-gesamt.litematic</span></a>` + ALLE.map((b) => {
      const m = modell(b.id);
      return `<a class="download" href="${DOWNLOAD.basis}${b.datei}" ${DOWNLOAD.attr}><strong>${b.titel}</strong>` +
        `<span>${b.text}</span><span>${m.sx} × ${m.sy} × ${m.sz} · ${zahl(m.bloeckeGesamt())} Blöcke</span>` +
        `<span class="datei">⬇ ${b.datei}</span></a>`;
    }).join('');
    $('#platzierung tbody').innerHTML = ALLE.map((b) => {
      const m = modell(b.id), [x, y, z] = PLATZ[b.id];
      return `<tr><td>${b.titel}</td><td>${x}</td><td>${y}</td><td>${z}</td><td>${m.sx}×${m.sy}×${m.sz}</td></tr>`;
    }).join('');
  }

  /* ---------- Start ---------- */
  async function start() {
    const msel = $('#materialAuswahl');
    msel.innerHTML = ALLE.map((b) => `<option value="${b.id}">${b.titel}</option>`).join('') +
      '<option value="alle">Alle Bauwerke</option>';
    msel.addEventListener('change', zeigeMaterial);
    zeigeAbschnitte();
    richteViewerEin();
    await spaeter(zeichneDetails);
    await spaeter(zeichneGrundrisse);
    await spaeter(zeigeMaterial);
    await spaeter(zeichneLageplan);
    await spaeter(zeigeDownloads);
    await spaeter(zeichneEbene);
  }
  start();
})();
