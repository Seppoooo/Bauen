/* Hogwarts 3D: frei durch die 500×500-Welt fliegen, Bauzustand Ebene für Ebene ansehen */
(function () {
  'use strict';
  const { block, erzeugeGesamt } = window.HogwartsModell;
  const $ = (s) => document.querySelector(s);

  /* ================================================== Texturen (16×16 Pixel, prozedural) */
  const K = 16, SPALTEN = 16;
  const atlas = document.createElement('canvas');
  atlas.width = atlas.height = K * SPALTEN;
  const ag = atlas.getContext('2d');
  const kacheln = new Map();

  function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function zufall(seed) {
    let s = 0; for (const c of seed) s = (Math.imul(s, 31) + c.charCodeAt(0)) | 0;
    return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  // Legt eine Kachel an; malen(px, r) setzt Pixel über px(x, y, [r,g,b], faktor, alpha)
  function kachel(name, malen) {
    if (kacheln.has(name)) return kacheln.get(name);
    const i = kacheln.size;
    const img = ag.createImageData(K, K), d = img.data, r = zufall(name);
    const px = (x, y, c, f = 1, a = 255) => {
      const o = (y * K + x) * 4;
      d[o] = Math.min(255, c[0] * f); d[o + 1] = Math.min(255, c[1] * f); d[o + 2] = Math.min(255, c[2] * f); d[o + 3] = a;
    };
    malen(px, r);
    ag.putImageData(img, (i % SPALTEN) * K, Math.floor(i / SPALTEN) * K);
    kacheln.set(name, i);
    return i;
  }
  const flaeche = (c, staerke) => (px, r) => { for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) px(x, y, c, 1 - staerke + r() * staerke * 2); };

  // Relief für Ziegel/Fliesen: oben/links heller, unten/rechts dunkler – wie bei den echten Blocktexturen
  function relief(feld) {
    return (x, y) => {
      const id = feld(x, y);
      if (id < 0) return 0.6;
      if (feld(x, y - 1) !== id || feld(x - 1, y) !== id) return 1.18;
      if (feld(x, y + 1) !== id || feld(x + 1, y) !== id) return 0.78;
      return 1;
    };
  }
  const MUSTER = {
    rauschen: (c) => flaeche(c, 0.1),
    fein: (c) => flaeche(c, 0.04),
    ziegel: (c, art) => (px, r) => {
      // echte Steinziegel: zwei Reihen, Fugen bei y 3/7/11/15, versetzte Stoßfugen
      const feld = (x, y) => {
        if (x < 0 || y < 0 || x > 15 || y > 15) return -2;
        if (y % 8 === 7 || (y < 8 ? x === 15 : x === 7)) return -1;
        return (y < 8 ? 0 : 10) + (y < 8 ? 0 : (x < 7 ? 1 : 2));
      };
      const rf = relief(feld);
      for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) {
        let farbe = c, f = rf(x, y) * (0.93 + r() * 0.12);
        if (art === 'moos' && r() < 0.22 + (y > 10 ? 0.15 : 0)) farbe = [86, 116, 58];
        if (art === 'riss' && ((x + y * 2) % 13 === 0 || (x * 3 + y) % 17 === 0) && feld(x, y) >= 0) f = 0.5;
        px(x, y, farbe, f);
      }
    },
    bruch: (c, moos) => (px, r) => {
      const p = Array.from({ length: 7 }, () => [r() * K, r() * K]);
      for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) {
        const d = p.map(([a, b]) => Math.hypot(a - x, b - y)).sort((a, b) => a - b);
        const rand = d[1] - d[0] < 1.3;
        px(x, y, moos && r() < 0.3 ? [85, 112, 60] : c, rand ? 0.6 : 0.9 + r() * 0.22);
      }
    },
    fliesen: (c) => (px, r) => {
      // Tiefenschieferfliesen: 4×4 kleine Fliesen mit Relief
      const feld = (x, y) => (x < 0 || y < 0 || x > 15 || y > 15) ? -2 : (x % 8 === 7 || y % 8 === 7) ? -1 : Math.floor(x / 8) + 2 * Math.floor(y / 8);
      const klein = (x, y) => (x < 0 || y < 0 || x > 15 || y > 15) ? -2 : (x % 4 === 3 || y % 4 === 3) ? -1 : Math.floor(x / 4) + 4 * Math.floor(y / 4);
      const rf = relief(klein);
      for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) px(x, y, c, rf(x, y) * (0.9 + r() * 0.16) * (feld(x, y) < 0 ? 0.9 : 1));
    },
    bretter: (c) => (px, r) => {
      // vier Bretter à 4 Pixel, dunkle Fugen, Maserung und versetzte Brettenden
      const enden = [3, 11, 7, 14];
      for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) {
        const reihe = Math.floor(y / 4), fuge = y % 4 === 3 || x === enden[reihe];
        const maser = ((x * 7 + reihe * 5) % 9 === 0) ? 0.88 : 1;
        px(x, y, c, fuge ? 0.62 : (y % 4 === 0 ? 1.08 : 1) * maser * (0.94 + r() * 0.1));
      }
    },
    birke: () => (px, r) => {
      for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) {
        const fleck = (y * 5 + Math.floor(x / 3) * 7) % 11 < 2 && r() < 0.8;
        px(x, y, fleck ? [40, 40, 36] : [216, 212, 200], 0.9 + r() * 0.12);
      }
    },
    rinde: (c) => (px, r) => {
      const streifen = Array.from({ length: K }, () => 0.75 + r() * 0.35);
      for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) px(x, y, c, streifen[x] * (0.92 + r() * 0.12));
    },
    ringe: (c, innen) => (px, r) => {
      for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) {
        const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
        px(x, y, d > 6.5 ? c : innen, d > 6.5 ? 0.9 : (Math.floor(d) % 2 ? 0.85 : 1) + r() * 0.08);
      }
    },
    laub: (c) => (px, r) => {
      // Laub in Büscheln: hellere Spitzen, dunkle Tiefe, einzelne Lücken
      for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) {
        const buschel = Math.sin(x * 1.7 + y * 0.9) + Math.cos(y * 1.3 - x * 0.7);
        const loch = r() < 0.16;
        px(x, y, c, (buschel > 0.6 ? 1.25 : buschel < -0.6 ? 0.7 : 0.95) * (0.88 + r() * 0.24), loch ? 0 : 255);
      }
    },
    glas: (farbe) => (px) => {
      const f = farbe || [190, 225, 240];
      for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) {
        const rand = x === 0 || y === 0 || x === 15 || y === 15;
        const glanz = (x - y === 3 || x - y === 4) && x > 4 && x < 13;
        px(x, y, rand ? f.map((v) => v * 0.8 + 40) : glanz ? [255, 255, 255] : f, 1, rand ? 235 : glanz ? 170 : farbe ? 150 : 70);
      }
    },
    regal: () => (px, r) => {
      const farben = [[150, 40, 35], [60, 80, 150], [70, 120, 60], [170, 140, 60], [110, 60, 120], [140, 90, 50]];
      for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) {
        if (y === 0 || y === 7 || y === 8 || y === 15) { px(x, y, [160, 126, 78], 0.85 + r() * 0.15); continue; }
        const f = farben[(x * 3 + (y < 8 ? 1 : 4)) % farben.length];
        px(x, y, x % 3 === 2 ? [60, 40, 25] : f, 0.85 + r() * 0.2);
      }
    },
    gras: (c) => flaeche(c, 0.14),
    grasseite: (gras, erde) => (px, r) => {
      for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) {
        const g = y < 3 || (y === 3 && r() < 0.5);
        px(x, y, g ? gras : erde, 0.85 + r() * 0.25);
      }
    },
    wasser: (c) => (px, r) => { for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) px(x, y, c, 0.85 + r() * 0.2 + (Math.sin((x + y * 2) / 2) * 0.05), 190); },
    laterne: () => (px) => {
      for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) {
        const rahmen = x < 3 || x > 12 || y < 3 || y > 12;
        px(x, y, rahmen ? [55, 58, 70] : [255, 205, 110], rahmen ? 1 : 1.1);
      }
    },
    leiter: (c) => (px) => {
      for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) {
        const holz = x === 2 || x === 3 || x === 12 || x === 13 || (y % 4 === 1 && x > 1 && x < 14);
        px(x, y, c, 0.9, holz ? 255 : 0);
      }
    },
    blume: (blute) => (px) => {
      for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) {
        const stiel = x === 7 && y > 6;
        const blatt = (y === 11 && (x === 6 || x === 8)) || (y === 12 && (x === 5 || x === 9));
        const kopf = Math.hypot(x - 7, y - 4.5) < 2.6;
        if (kopf) px(x, y, blute, 1); else if (stiel || blatt) px(x, y, [60, 120, 40], 1); else px(x, y, [0, 0, 0], 1, 0);
      }
    },
    farn: (c) => (px, r) => {
      for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) {
        const an = Math.abs(x - 7.5) < (16 - y) * 0.45 && (x + y) % 3 !== 0 && y > 3;
        px(x, y, c, 0.8 + r() * 0.4, an ? 255 : 0);
      }
    },
    kuerbis: (c) => (px, r) => { for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) px(x, y, c, (x % 4 === 0 ? 0.75 : 1) * (0.9 + r() * 0.12)); },
    feuer: () => (px, r) => {
      for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) {
        const holz = y > 11;
        const flamme = !holz && Math.abs(x - 7.5) < (y - 2) * 0.5 && r() < 0.85;
        px(x, y, holz ? [90, 62, 38] : [255, 150 + r() * 80, 40], 1, holz || flamme ? 255 : 0);
      }
    }
  };

  // Für jeden Block: Kacheln für oben / Seite / unten
  function texturen(key) {
    const b = block(key), id = b.id.replace('minecraft:', ''), c = rgb(b.farbe);
    const eine = (name, m) => { const i = kachel(name, m); return { o: i, s: i, u: i }; };
    const PLANKS = { spruce: '#6e5131', dark_oak: '#4a3220', oak: '#a0814f', birch: '#c5b37b' };
    if (id === 'grass_block') return { o: kachel('gras', MUSTER.gras([93, 154, 59])), s: kachel('grasseite', MUSTER.grasseite([93, 154, 59], [134, 96, 67])), u: kachel('erde', MUSTER.rauschen([134, 96, 67])) };
    if (id === 'dirt_path') return { o: kachel('pfad', MUSTER.rauschen([148, 121, 63])), s: kachel('erde', MUSTER.rauschen([134, 96, 67])), u: kachel('erde', MUSTER.rauschen([134, 96, 67])) };
    if (id.endsWith('_log')) {
      const holz = { oak: [176, 143, 88], birch: [215, 200, 150], dark_oak: [70, 50, 30] }[id.replace('_log', '')] || [118, 88, 55];
      const rinde = id === 'birch_log' ? kachel('birke', MUSTER.birke()) : kachel(id, MUSTER.rinde(c));
      if (b.props.axis !== 'y') return { o: rinde, s: rinde, u: rinde };
      const t = kachel(id + '_oben', MUSTER.ringe(c, holz)); return { o: t, s: rinde, u: t };
    }
    if (id === 'bookshelf') { const t = kachel('oak_planks', MUSTER.bretter(rgb(PLANKS.oak))); return { o: t, s: kachel('regal', MUSTER.regal()), u: t }; }
    if (id === 'pumpkin') return { o: kachel('kuerbis_oben', MUSTER.rauschen([200, 120, 30])), s: kachel('kuerbis', MUSTER.kuerbis(c)), u: kachel('kuerbis_oben', MUSTER.rauschen([200, 120, 30])) };
    if (id.includes('stone_brick')) {
      const art = id.includes('mossy') ? 'moos' : id.includes('cracked') ? 'riss' : '';
      return eine('steinziegel_' + art, MUSTER.ziegel(rgb('#7e7e7e'), art));
    }
    if (id === 'bricks' || id.startsWith('brick_')) return eine('ziegel', MUSTER.ziegel(rgb('#96503f'), ''));
    if (id === 'cobbled_deepslate') return eine(id, MUSTER.bruch(rgb('#4d4d52'), false));
    if (id === 'stone' || id === 'andesite') return eine(id, flaeche(c, id === 'andesite' ? 0.18 : 0.08));
    if (id.includes('cobblestone')) return eine(id, MUSTER.bruch(rgb('#7a7a7a'), id.includes('mossy')));
    if (id.includes('deepslate_tile')) return eine('tiefenschiefer', MUSTER.fliesen(rgb('#3e3e45')));
    if (id.includes('planks') || id.includes('_slab') && id.includes('spruce') || id.includes('spruce_stairs') || id.includes('fence')) {
      const art = id.startsWith('dark_oak') ? 'dark_oak' : id.startsWith('birch') ? 'birch' : 'spruce';
      return eine(art + '_planks', MUSTER.bretter(rgb(PLANKS[art])));
    }
    if (id.endsWith('leaves')) return eine(id, MUSTER.laub(c));
    if (id.includes('stained_glass')) return eine(id, MUSTER.glas(c));
    if (id.includes('glass')) return eine('glas', MUSTER.glas());
    if (id.endsWith('_carpet')) return eine(id, (px, r) => { for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) px(x, y, c, (x % 4 === 0 || y % 4 === 0 ? 0.88 : 1) * (0.94 + r() * 0.1)); });
    if (id === 'lily_pad') return eine(id, (px, r) => { for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) { const d = Math.hypot(x - 7.5, y - 7.5); px(x, y, c, 0.85 + r() * 0.3, d < 7.5 && !(x > 7 && Math.abs(y - 7.5) < 1.2) ? 255 : 0); } });
    if (id === 'sugar_cane') return eine(id, (px, r) => { for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) { const halm = [3, 4, 8, 9, 12].includes(x); px(x, y, c, (y % 5 === 0 ? 0.75 : 1) * (0.9 + r() * 0.15), halm ? 255 : 0); } });
    if (id === 'candle') return eine(id, (px) => { for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) px(x, y, y < 4 ? [255, 190, 80] : [236, 226, 196], 1); });
    if (id === 'lectern') return eine(id, MUSTER.bretter(rgb('#8a6a3e')));
    if (id === 'chiseled_stone_bricks') return eine(id, (px, r) => {
      for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) {
        const rahmen = x === 0 || y === 0 || x === 15 || y === 15 || x === 1 || y === 1;
        const ring = Math.abs(Math.hypot(x - 7.5, y - 7.5) - 4.5) < 1;
        px(x, y, c, rahmen ? 1.12 : ring ? 0.7 : 0.95 + r() * 0.1);
      }
    });
    if (id.startsWith('deepslate_brick')) return eine('tiefenschieferziegel', MUSTER.ziegel(rgb('#4a4a50'), ''));
    if (id === 'iron_bars') return eine(id, (px, r) => {
      for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) { const stab = x % 4 === 1 || x % 4 === 2 || y === 0 || y === 15; px(x, y, [130, 134, 138], (x % 4 === 1 ? 1.1 : 0.85) * (0.95 + r() * 0.08), stab ? 255 : 0); }
    });
    if (id === 'water') return eine('wasser', MUSTER.wasser([58, 111, 216]));
    if (id === 'lantern') return eine('laterne', MUSTER.laterne());
    if (id === 'ladder') return eine('leiter', MUSTER.leiter(rgb('#a0773f')));
    if (id === 'campfire') return eine('feuer', MUSTER.feuer());
    if (['poppy', 'dandelion', 'cornflower', 'flowering_azalea', 'allium', 'azure_bluet', 'oxeye_daisy'].includes(id)) return eine(id, MUSTER.blume(c));
    if (id === 'fern') return eine('farn', MUSTER.farn(c));
    if (id.includes('concrete')) return eine(id, MUSTER.fein(c));
    if (id === 'polished_andesite') return eine(id, (px, r) => {
      for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) px(x, y, c, (x === 0 || y === 0 ? 1.12 : x === 15 || y === 15 ? 0.8 : 1) * (0.95 + r() * 0.08));
    });
    if (id.endsWith('_wool')) return eine(id, (px, r) => {
      for (let y = 0; y < K; y++) for (let x = 0; x < K; x++) px(x, y, c, (Math.sin((x + y) * 1.2) * 0.06 + 0.96) * (0.95 + r() * 0.08));
    });
    if (id === 'gravel') return eine(id, flaeche(c, 0.28));
    return eine(id, MUSTER.rauschen(c));
  }

  /* ================================================== Formen (Teilblöcke) */
  // Liefert Boxen [x0,y0,z0,x1,y1,z1] für Nicht-Vollblöcke
  function boxen(b) {
    const p = b.props;
    switch (b.form) {
      case 'teppich': return [[0, 0, 0, 1, 0.0625, 1]];
      case 'pult': return [[0, 0, 0, 1, 0.12, 1], [0.3, 0.12, 0.3, 0.7, 0.75, 0.7], [0.05, 0.75, 0.05, 0.95, 0.95, 0.95]];
      case 'stufe': return p.type === 'top' ? [[0, 0.5, 0, 1, 1, 1]] : [[0, 0, 0, 1, 0.5, 1]];
      case 'treppe': {
        const oben = p.half === 'top', y0 = oben ? 0 : 0.5, y1 = oben ? 0.5 : 1;
        const teil = { north: [0, y0, 0, 1, y1, 0.5], south: [0, y0, 0.5, 1, y1, 1], east: [0.5, y0, 0, 1, y1, 1], west: [0, y0, 0, 0.5, y1, 1] }[p.facing];
        return [oben ? [0, 0.5, 0, 1, 1, 1] : [0, 0, 0, 1, 0.5, 1], teil];
      }
      case 'scheibe_ew': return [[0, 0, 0.44, 1, 1, 0.56]];
      case 'scheibe_ns': return [[0.44, 0, 0, 0.56, 1, 1]];
      case 'leiter': return [[0.05, 0, 0, 0.95, 1, 0.08]];
      case 'klein': return [[0.31, 0, 0.31, 0.69, 0.5, 0.69]];
      case 'klein_h': return [[0.31, 0.15, 0.31, 0.69, 0.65, 0.69]];
      case 'pfosten': {
        if (b.id.includes('_wall')) return [[0.25, 0, 0.25, 0.75, 1, 0.75]];
        if (!b.id.includes('fence')) return [[0.44, 0, 0.44, 0.56, 1, 0.56]];
        const l = [[0.375, 0, 0.375, 0.625, 1, 0.625]];
        for (const y of [[0.38, 0.56], [0.75, 0.93]]) {
          if (p.north === 'true') l.push([0.44, y[0], 0, 0.56, y[1], 0.375]);
          if (p.south === 'true') l.push([0.44, y[0], 0.625, 0.56, y[1], 1]);
          if (p.west === 'true') l.push([0, y[0], 0.44, 0.375, y[1], 0.56]);
          if (p.east === 'true') l.push([0.625, y[0], 0.44, 1, y[1], 0.56]);
        }
        return l;
      }
      default: return [[0, 0, 0, 1, 1, 1]];
    }
  }

  /* ================================================== Welt & Meshing */
  let welt, info, SX, SY, SZ, ebene;
  const SXZ = 32, SYH = 16; // Abschnittsgröße
  const SCHATTEN = { py: 1, ny: 0.5, px: 0.8, nx: 0.7, pz: 0.75, nz: 0.62 };

  function bereiteInfo() {
    info = welt.keys.map((key) => {
      if (key === 'air') return null;
      const b = block(key);
      const id = b.id.replace('minecraft:', '');
      return {
        key, b, tex: texturen(key),
        voll: b.form === 'voll' || b.form === 'glas' || b.form === 'wasser',
        deckend: b.deckend && !id.endsWith('leaves'),
        laub: id.endsWith('leaves'), glas: b.form === 'glas', wasser: b.form === 'wasser',
        transparent: b.form === 'glas' || b.form === 'wasser' || (b.form.startsWith('scheibe') && !id.includes('stained')),
        kreuz: ['poppy', 'dandelion', 'cornflower', 'fern', 'flowering_azalea', 'allium', 'azure_bluet', 'oxeye_daisy', 'sugar_cane'].includes(id),
        boxen: boxen(b)
      };
    });
  }

  function verdeckt(a, n) {
    if (!n) return false;
    if (n.deckend) return true;
    if (a.laub && n.laub) return true;
    if (a.glas && n.glas) return true;
    if (a.wasser && n.wasser) return true;
    return false;
  }

  function puffer() { return { pos: [], uv: [], col: [], idx: [] }; }
  const kU = (i) => (i % SPALTEN) / SPALTEN, kV = (i) => Math.floor(i / SPALTEN) / SPALTEN;
  const E = 1 / (K * SPALTEN) * 0.02;
  // Viereck: Ursprung p, Kanten a und b (a × b = Normale), uv-Bereich in Kachelanteilen
  function quad(P, p, a, b, kach, u0, u1, v0, v1, s) {
    const n = P.pos.length / 3;
    P.pos.push(p[0], p[1], p[2], p[0] + a[0], p[1] + a[1], p[2] + a[2],
      p[0] + a[0] + b[0], p[1] + a[1] + b[1], p[2] + a[2] + b[2], p[0] + b[0], p[1] + b[1], p[2] + b[2]);
    const tu = kU(kach), tv = kV(kach), sk = 1 / SPALTEN;
    const U = (f) => tu + E + f * (sk - 2 * E), V = (f) => tv + E + (1 - f) * (sk - 2 * E);
    P.uv.push(U(u0), V(v0), U(u1), V(v0), U(u1), V(v1), U(u0), V(v1));
    for (let i = 0; i < 4; i++) P.col.push(s, s, s);
    P.idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
  }
  function boxFlaechen(P, x, y, z, bx, inf, maske) {
    const [a0, b0, c0, a1, b1, c1] = bx;
    const x0 = x + a0, y0 = y + b0, z0 = z + c0, x1 = x + a1, y1 = y + b1, z1 = z + c1;
    const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, t = inf.tex;
    if (maske & 1) quad(P, [x0, y1, z1], [dx, 0, 0], [0, 0, -dz], t.o, a0, a1, 1 - c1, 1 - c0, SCHATTEN.py);
    if (maske & 2) quad(P, [x0, y0, z0], [dx, 0, 0], [0, 0, dz], t.u, a0, a1, c0, c1, SCHATTEN.ny);
    if (maske & 4) quad(P, [x1, y0, z1], [0, 0, -dz], [0, dy, 0], t.s, 1 - c1, 1 - c0, b0, b1, SCHATTEN.px);
    if (maske & 8) quad(P, [x0, y0, z0], [0, 0, dz], [0, dy, 0], t.s, c0, c1, b0, b1, SCHATTEN.nx);
    if (maske & 16) quad(P, [x0, y0, z1], [dx, 0, 0], [0, dy, 0], t.s, a0, a1, b0, b1, SCHATTEN.pz);
    if (maske & 32) quad(P, [x1, y0, z0], [-dx, 0, 0], [0, dy, 0], t.s, 1 - a1, 1 - a0, b0, b1, SCHATTEN.nz);
  }

  // Würfel mit weichem Licht (Ambient Occlusion), Flächenreihenfolge wie die Bits der Maske
  const FLAECHEN = [
    { bit: 1, n: [0, 1, 0], p: [0, 1, 1], a: [1, 0, 0], b: [0, 0, -1], t: 'o', s: SCHATTEN.py },
    { bit: 2, n: [0, -1, 0], p: [0, 0, 0], a: [1, 0, 0], b: [0, 0, 1], t: 'u', s: SCHATTEN.ny },
    { bit: 4, n: [1, 0, 0], p: [1, 0, 1], a: [0, 0, -1], b: [0, 1, 0], t: 's', s: SCHATTEN.px },
    { bit: 8, n: [-1, 0, 0], p: [0, 0, 0], a: [0, 0, 1], b: [0, 1, 0], t: 's', s: SCHATTEN.nx },
    { bit: 16, n: [0, 0, 1], p: [0, 0, 1], a: [1, 0, 0], b: [0, 1, 0], t: 's', s: SCHATTEN.pz },
    { bit: 32, n: [0, 0, -1], p: [1, 0, 0], a: [-1, 0, 0], b: [0, 1, 0], t: 's', s: SCHATTEN.nz }
  ];
  const AO = [1, 0.8, 0.64, 0.5];
  const ECKEN = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  function wuerfelAO(P, x, y, z, inf, maske, schnitt) {
    const fest = (cx, cy, cz) => { const n = zelle(cx, cy, cz, schnitt); return n && (n.deckend || n.laub) ? 1 : 0; };
    for (const F of FLAECHEN) {
      if (!(maske & F.bit)) continue;
      const fx = x + F.n[0], fy = y + F.n[1], fz = z + F.n[2];
      const ao = ECKEN.map(([sa, sb]) => {
        const s1 = fest(fx + sa * F.a[0], fy + sa * F.a[1], fz + sa * F.a[2]);
        const s2 = fest(fx + sb * F.b[0], fy + sb * F.b[1], fz + sb * F.b[2]);
        const c = fest(fx + sa * F.a[0] + sb * F.b[0], fy + sa * F.a[1] + sb * F.b[1], fz + sa * F.a[2] + sb * F.b[2]);
        return s1 && s2 ? 3 : s1 + s2 + c;
      });
      const n = P.pos.length / 3, p = [x + F.p[0], y + F.p[1], z + F.p[2]], a = F.a, b = F.b;
      P.pos.push(p[0], p[1], p[2], p[0] + a[0], p[1] + a[1], p[2] + a[2],
        p[0] + a[0] + b[0], p[1] + a[1] + b[1], p[2] + a[2] + b[2], p[0] + b[0], p[1] + b[1], p[2] + b[2]);
      const kach = inf.tex[F.t], tu = kU(kach), tv = kV(kach), sk = 1 / SPALTEN;
      const U = (f) => tu + E + f * (sk - 2 * E), V = (f) => tv + E + (1 - f) * (sk - 2 * E);
      P.uv.push(U(0), V(0), U(1), V(0), U(1), V(1), U(0), V(1));
      for (let i = 0; i < 4; i++) { const h = F.s * AO[ao[i]]; P.col.push(h, h, h); }
      if (ao[0] + ao[2] > ao[1] + ao[3]) P.idx.push(n, n + 1, n + 3, n + 1, n + 2, n + 3);
      else P.idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
    }
  }

  function zelle(x, y, z, schnitt) {
    if (x < 0 || y < 0 || z < 0 || x >= SX || y >= SY || z >= SZ || y > schnitt) return null;
    return info[welt.daten[(y * SZ + z) * SX + x]];
  }

  function meshAbschnitt(ax, ay, az, schnitt) {
    const O = puffer(), T = puffer();
    let bloecke = 0;
    const yEnde = Math.min(SY, (ay + 1) * SYH, schnitt + 1);
    for (let y = ay * SYH; y < yEnde; y++) {
      for (let z = az * SXZ; z < Math.min(SZ, (az + 1) * SXZ); z++) {
        for (let x = ax * SXZ; x < Math.min(SX, (ax + 1) * SXZ); x++) {
          const v = welt.daten[(y * SZ + z) * SX + x];
          if (!v) continue;
          const inf = info[v];
          bloecke++;
          const P = inf.transparent ? T : O;
          if (inf.kreuz) {
            const s = 0.9, t = inf.tex.s;
            quad(P, [x + 0.15, y, z + 0.15], [0.7, 0, 0.7], [0, 0.9, 0], t, 0, 1, 0, 1, s);
            quad(P, [x + 0.85, y, z + 0.85], [-0.7, 0, -0.7], [0, 0.9, 0], t, 0, 1, 0, 1, s);
            quad(P, [x + 0.15, y, z + 0.85], [0.7, 0, -0.7], [0, 0.9, 0], t, 0, 1, 0, 1, s);
            quad(P, [x + 0.85, y, z + 0.15], [-0.7, 0, 0.7], [0, 0.9, 0], t, 0, 1, 0, 1, s);
            continue;
          }
          if (inf.voll) {
            let m = 0;
            const oben = zelle(x, y + 1, z, schnitt);
            if (!verdeckt(inf, oben)) m |= 1;
            if (!verdeckt(inf, zelle(x, y - 1, z, schnitt))) m |= 2;
            if (!verdeckt(inf, zelle(x + 1, y, z, schnitt))) m |= 4;
            if (!verdeckt(inf, zelle(x - 1, y, z, schnitt))) m |= 8;
            if (!verdeckt(inf, zelle(x, y, z + 1, schnitt))) m |= 16;
            if (!verdeckt(inf, zelle(x, y, z - 1, schnitt))) m |= 32;
            if (!m) continue;
            if (inf.transparent) {
              const hoehe = inf.wasser && !(oben && oben.wasser) ? 0.875 : 1;
              boxFlaechen(P, x, y, z, [0, 0, 0, 1, hoehe, 1], inf, m);
            } else wuerfelAO(P, x, y, z, inf, m, schnitt);
            continue;
          }
          for (const bx of inf.boxen) boxFlaechen(P, x, y, z, bx, inf, 63);
        }
      }
    }
    return { O, T, bloecke };
  }

  /* ================================================== three.js */
  const canvas = $('#welt');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  const HIMMEL = new THREE.Color('#9cc3ea');
  const szene = new THREE.Scene();
  szene.background = HIMMEL;
  szene.fog = new THREE.Fog(HIMMEL, 220, 760);
  const kamera = new THREE.PerspectiveCamera(70, 1, 0.1, 1600);
  const textur = new THREE.CanvasTexture(atlas);
  textur.magFilter = THREE.NearestFilter; textur.minFilter = THREE.NearestFilter;
  textur.flipY = false; textur.generateMipmaps = false;
  const matOpak = new THREE.MeshBasicMaterial({ map: textur, vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide });
  const matTrans = new THREE.MeshBasicMaterial({ map: textur, vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide });

  function geometrie(P) {
    if (!P.idx.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(P.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(P.col, 3));
    g.setIndex(P.pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(P.idx, 1) : new THREE.Uint16BufferAttribute(P.idx, 1));
    g.computeBoundingSphere();
    return g;
  }
  function gruppe(res) {
    const grp = new THREE.Group();
    const go = geometrie(res.O), gt = geometrie(res.T);
    if (go) grp.add(new THREE.Mesh(go, matOpak));
    if (gt) { const m = new THREE.Mesh(gt, matTrans); m.renderOrder = 1; grp.add(m); }
    return grp;
  }
  function entsorge(grp) { if (!grp) return; grp.children.forEach((m) => m.geometry.dispose()); szene.remove(grp); }

  // Abschnitte: voll gebaut (Cache) und angeschnitten (für die aktuelle Bauebene)
  const abschnitte = [];
  let schnitt = Infinity;

  function aktualisiereAbschnitt(a) {
    const y0 = a.ay * SYH, y1 = y0 + SYH - 1;
    if (a.leer) return;
    if (y0 > schnitt) { a.voll && (a.voll.visible = false); entsorge(a.teil); a.teil = null; return; }
    if (y1 <= schnitt) {
      if (!a.voll) {
        const res = meshAbschnitt(a.ax, a.ay, a.az, Infinity);
        if (!res.bloecke) { a.leer = true; return; }
        a.voll = gruppe(res); szene.add(a.voll);
      }
      a.voll.visible = true; entsorge(a.teil); a.teil = null; return;
    }
    if (a.voll) a.voll.visible = false;
    entsorge(a.teil);
    a.teil = gruppe(meshAbschnitt(a.ax, a.ay, a.az, schnitt));
    szene.add(a.teil);
  }

  function setzeSchnitt(y) {
    schnitt = y >= SY - 1 ? Infinity : y;
    $('#bauWert').textContent = schnitt === Infinity ? 'alles' : 'Y ' + y;
    $('#bauRegler').value = Math.min(y, SY - 1);
    for (const a of abschnitte) aktualisiereAbschnitt(a);
  }

  /* ================================================== Laden */
  function zeigeLaden(text, anteil) { $('#ladeText').textContent = text; $('#ladeBalken').style.width = Math.round(anteil * 100) + '%'; }
  const pause = () => new Promise((ok) => requestAnimationFrame(() => ok()));

  async function lade() {
    zeigeLaden('Blockmodell wird berechnet (Berg, Schloss, Brücke …)', 0.05);
    await pause(); await pause();
    welt = erzeugeGesamt();
    SX = welt.sx; SY = welt.sy; SZ = welt.sz; ebene = SX * SZ;
    zeigeLaden('Texturen werden gemalt', 0.2);
    await pause();
    bereiteInfo();
    textur.needsUpdate = true;
    $('#bauRegler').max = SY - 1; $('#bauRegler').value = SY - 1;
    for (let ay = 0; ay < Math.ceil(SY / SYH); ay++) for (let az = 0; az < Math.ceil(SZ / SXZ); az++) for (let ax = 0; ax < Math.ceil(SX / SXZ); ax++) {
      abschnitte.push({ ax, ay, az, voll: null, teil: null, leer: false });
    }
    // Abschnitte nahe der Kamera zuerst bauen
    const start = ORTE[0];
    setzeKamera(start);
    const mitte = (a) => Math.hypot(a.ax * SXZ + 16 - start.pos[0], a.az * SXZ + 16 - start.pos[2]);
    const reihe = abschnitte.slice().sort((a, b) => mitte(a) - mitte(b));
    let fertig = 0, t = performance.now();
    $('#laden').hidden = true;
    for (const a of reihe) {
      aktualisiereAbschnitt(a);
      fertig++;
      if (performance.now() - t > 14) {
        $('#posAnzeige').textContent = `Welt wird aufgebaut … ${Math.round(100 * fertig / reihe.length)} %`;
        await pause(); t = performance.now();
      }
    }
    bereit = true;
  }

  /* ================================================== Kamera & Steuerung */
  const ORTE = [
    { name: 'Überblick', pos: [480, 250, 520], ziel: [250, 130, 200] },
    { name: 'Torbau & Brücke', pos: [250, 118, 345], ziel: [250, 135, 250] },
    { name: 'Innenhof', pos: [250, 122, 225], ziel: [250, 126, 185] },
    { name: 'Große Halle', pos: [226, 121, 164], ziel: [300, 118, 164] },
    { name: 'Bibliothek', pos: [220, 118, 186], ziel: [220, 116, 236] },
    { name: 'Hauptturm', pos: [285, 205, 160], ziel: [250, 190, 132] },
    { name: 'Hogsmeade', pos: [420, 30, 140], ziel: [420, 10, 70] },
    { name: 'Eulerei', pos: [130, 50, 130], ziel: [100, 45, 96] },
    { name: 'Großer Burgturm', pos: [64, 30, 372], ziel: [64, 40, 336] },
    { name: 'Leuchtturm', pos: [445, 20, 470], ziel: [482, 20, 478] },
    { name: 'Steinkreis', pos: [262, 124, 432], ziel: [250, 116, 400] },
    { name: 'Hagrids Hütte', pos: [341, 14, 460], ziel: [339, 8, 446] },
    { name: 'Quidditch-Feld', pos: [425, 30, 425], ziel: [425, 6, 379] },
    { name: 'Gewächshäuser', pos: [85, 13, 253], ziel: [85, 7, 237] },
    { name: 'See & Bootshaus', pos: [140, 16, 395], ziel: [112, 6, 368] },
    { name: 'Fluss', pos: [100, 40, 300], ziel: [118, 20, 260] }
  ];
  let gier = 0, nick = 0; // Blickrichtung
  function setzeKamera(o) {
    kamera.position.set(...o.pos);
    const d = new THREE.Vector3(o.ziel[0] - o.pos[0], o.ziel[1] - o.pos[1], o.ziel[2] - o.pos[2]).normalize();
    gier = Math.atan2(-d.x, -d.z); nick = Math.asin(d.y);
    rundflug = false; $('#rundflug').setAttribute('aria-pressed', 'false');
  }
  function richteKameraAus() { kamera.rotation.set(nick, gier, 0, 'YXZ'); }

  const tasten = new Set();
  let tempo = 20, rundflug = false, rundWinkel = 0, bereit = false;
  const touchBewegung = { x: 0, z: 0, y: 0 };

  addEventListener('keydown', (e) => {
    if (e.target.matches('input, button, select')) { if (!['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(e.code)) return; }
    tasten.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  });
  addEventListener('keyup', (e) => tasten.delete(e.code));
  addEventListener('blur', () => tasten.clear());

  // Umsehen: Maus ziehen oder eingefangene Maus
  let ziehen = null, gezogen = false;
  canvas.addEventListener('pointerdown', (e) => {
    canvas.focus();
    if (e.pointerType === 'touch') return;
    ziehen = { x: e.clientX, y: e.clientY }; gezogen = false;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (document.pointerLockElement === canvas) { dreh(e.movementX, e.movementY); return; }
    if (!ziehen || e.pointerType === 'touch') return;
    const dx = e.clientX - ziehen.x, dy = e.clientY - ziehen.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) gezogen = true;
    dreh(dx, dy); ziehen = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'touch') return;
    if (!gezogen) waehleBlock(document.pointerLockElement === canvas ? null : e);
    ziehen = null;
  });
  canvas.addEventListener('dblclick', () => { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (err) { /* nicht verfügbar */ } });
  
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); setzeTempo(tempo * (e.deltaY < 0 ? 1.15 : 0.87)); }, { passive: false });
  function dreh(dx, dy) {
    gier -= dx * 0.0032; nick -= dy * 0.0032;
    nick = Math.max(-1.55, Math.min(1.55, nick));
    if (rundflug) { rundflug = false; $('#rundflug').setAttribute('aria-pressed', 'false'); }
  }
  function setzeTempo(t) {
    tempo = Math.max(4, Math.min(120, t));
    $('#tempo').value = tempo; $('#tempoWert').textContent = Math.round(tempo);
  }

  // Touch: Joystick links, Wischen rechts, Knöpfe hoch/runter
  const istTouch = matchMedia('(pointer: coarse)').matches;
  if (istTouch) $('#touch').hidden = false;
  const joy = $('#joystick'), knauf = $('#knauf');
  let joyId = null;
  joy.addEventListener('pointerdown', (e) => { joyId = e.pointerId; joy.setPointerCapture(e.pointerId); joyBewegen(e); });
  joy.addEventListener('pointermove', (e) => { if (e.pointerId === joyId) joyBewegen(e); });
  const joyEnde = () => { joyId = null; touchBewegung.x = touchBewegung.z = 0; knauf.style.transform = ''; };
  joy.addEventListener('pointerup', joyEnde); joy.addEventListener('pointercancel', joyEnde);
  function joyBewegen(e) {
    const r = joy.getBoundingClientRect();
    let dx = (e.clientX - r.left - r.width / 2) / (r.width / 2), dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
    const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    touchBewegung.x = dx; touchBewegung.z = dy;
    knauf.style.transform = `translate(${dx * 35}px, ${dy * 35}px)`;
  }
  for (const [id, wert] of [['#tHoch', 1], ['#tRunter', -1]]) {
    const k = $(id);
    k.addEventListener('pointerdown', (e) => { e.preventDefault(); touchBewegung.y = wert; });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) k.addEventListener(ev, () => { touchBewegung.y = 0; });
  }
  const finger = new Map();
  canvas.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') finger.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY }); });
  canvas.addEventListener('pointermove', (e) => {
    const f = finger.get(e.pointerId); if (!f) return;
    dreh((e.clientX - f.x) * 1.4, (e.clientY - f.y) * 1.4); f.x = e.clientX; f.y = e.clientY;
  });
  const fingerEnde = (e) => {
    const f = finger.get(e.pointerId); if (!f) return;
    if (Math.hypot(e.clientX - f.sx, e.clientY - f.sy) < 8) waehleBlock(e);
    finger.delete(e.pointerId);
  };
  canvas.addEventListener('pointerup', fingerEnde); canvas.addEventListener('pointercancel', (e) => finger.delete(e.pointerId));

  /* ================================================== Block auswählen (Strahl durchs Raster) */
  const markierung = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 1.02, 1.02)),
    new THREE.LineBasicMaterial({ color: 0xffe08a }));
  markierung.visible = false; szene.add(markierung);
  const strahlNdc = new THREE.Raycaster();

  function waehleBlock(e) {
    if (!welt) return;
    let richtung;
    if (e) {
      const r = canvas.getBoundingClientRect();
      strahlNdc.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), kamera);
      richtung = strahlNdc.ray.direction.clone();
    } else richtung = new THREE.Vector3(0, 0, -1).applyQuaternion(kamera.quaternion);
    const treffer = strahl(kamera.position, richtung, 400);
    if (!treffer) { markierung.visible = false; $('#blockInfo').textContent = 'Kein Block in dieser Richtung.'; return; }
    const [x, y, z] = treffer;
    markierung.position.set(x + 0.5, y + 0.5, z + 0.5); markierung.visible = true;
    const inf = info[welt.daten[(y * SZ + z) * SX + x]];
    const teil = welt.teile.slice().reverse().find((t) => x >= t.lage[0] && y >= t.lage[1] && z >= t.lage[2] &&
      x < t.lage[0] + t.groesse[0] && y < t.lage[1] + t.groesse[1] && z < t.lage[2] + t.groesse[2] && t.id !== 'berg') || welt.teile[0];
    const lx = x - teil.lage[0], ly = y - teil.lage[1], lz = z - teil.lage[2];
    const props = Object.entries(inf.b.props).filter(([k]) => k !== 'waterlogged').map(([k, v]) => `${k}=${v}`).join(', ');
    $('#blockInfo').innerHTML = `<strong>${inf.b.mat}</strong><br><code>${inf.b.id}${props ? '[' + props + ']' : ''}</code><br>` +
      `Welt: ${x} / ${y} / ${z}<br>${teil.titel}: ${lx} / ${ly} / ${lz} (Ebene ${ly} in Litematica)`;
  }
  function strahl(o, d, maxD) {
    let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
    const sx = Math.sign(d.x), sy = Math.sign(d.y), sz = Math.sign(d.z);
    const tdx = Math.abs(1 / d.x), tdy = Math.abs(1 / d.y), tdz = Math.abs(1 / d.z);
    let tx = (sx > 0 ? x + 1 - o.x : o.x - x) * tdx, ty = (sy > 0 ? y + 1 - o.y : o.y - y) * tdy, tz = (sz > 0 ? z + 1 - o.z : o.z - z) * tdz;
    for (let t = 0; t < maxD;) {
      if (x >= 0 && z >= 0 && y >= 0 && x < SX && z < SZ && y < SY && y <= schnitt && welt.daten[(y * SZ + z) * SX + x]) return [x, y, z];
      if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; } else if (ty < tz) { y += sy; t = ty; ty += tdy; } else { z += sz; t = tz; tz += tdz; }
    }
    return null;
  }

  /* ================================================== Bedienleiste */
  const orteBox = $('#orte');
  ORTE.forEach((o) => {
    const k = document.createElement('button'); k.type = 'button'; k.textContent = o.name;
    k.addEventListener('click', () => setzeKamera(o));
    orteBox.appendChild(k);
  });
  $('#rundflug').addEventListener('click', () => {
    rundflug = !rundflug; $('#rundflug').setAttribute('aria-pressed', String(rundflug));
    rundWinkel = Math.atan2(kamera.position.z - 185, kamera.position.x - 250);
  });
  let bauTimer = null;
  const reglerWert = () => +$('#bauRegler').value;
  $('#bauRegler').addEventListener('input', () => { stoppeZeitraffer(); setzeSchnitt(reglerWert()); });
  $('#ebeneHoch').addEventListener('click', () => { stoppeZeitraffer(); setzeSchnitt(Math.min(SY - 1, (schnitt === Infinity ? SY - 1 : schnitt) + 1)); });
  $('#ebeneRunter').addEventListener('click', () => { stoppeZeitraffer(); setzeSchnitt(Math.max(0, (schnitt === Infinity ? SY - 1 : schnitt) - 1)); });
  $('#allesZeigen').addEventListener('click', () => { stoppeZeitraffer(); setzeSchnitt(SY - 1); });
  function stoppeZeitraffer() { clearInterval(bauTimer); bauTimer = null; $('#zeitraffer').textContent = '▶ Zeitraffer'; $('#zeitraffer').setAttribute('aria-pressed', 'false'); }
  $('#zeitraffer').addEventListener('click', () => {
    if (bauTimer) { stoppeZeitraffer(); return; }
    let y = schnitt === Infinity || schnitt >= SY - 2 ? 0 : schnitt;
    $('#zeitraffer').textContent = '❚❚ Pause'; $('#zeitraffer').setAttribute('aria-pressed', 'true');
    setzeSchnitt(y);
    bauTimer = setInterval(() => { y++; if (y >= SY - 1) { stoppeZeitraffer(); setzeSchnitt(SY - 1); return; } setzeSchnitt(y); }, 260);
  });
  $('#tempo').addEventListener('input', (e) => setzeTempo(+e.target.value));
  $('#leisteKnopf').addEventListener('click', () => {
    const offen = $('#leisteInhalt').hidden;
    $('#leisteInhalt').hidden = !offen; $('#leisteKnopf').setAttribute('aria-expanded', String(offen));
  });
  if (innerWidth < 700) { $('#leisteInhalt').hidden = true; $('#leisteKnopf').setAttribute('aria-expanded', 'false'); }

  /* ================================================== Schleife */
  function groesse() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); kamera.aspect = w / h; kamera.updateProjectionMatrix();
  }
  addEventListener('resize', groesse); groesse();

  let letzte = performance.now(), posTakt = 0;
  const vor = new THREE.Vector3(), rechts = new THREE.Vector3();
  function schleife(jetzt) {
    const dt = Math.min(0.1, (jetzt - letzte) / 1000); letzte = jetzt;
    if (rundflug) {
      rundWinkel += dt * 0.12;
      kamera.position.set(250 + Math.cos(rundWinkel) * 270, 215, 185 + Math.sin(rundWinkel) * 270);
      const d = new THREE.Vector3(250 - kamera.position.x, 140 - kamera.position.y, 185 - kamera.position.z).normalize();
      gier = Math.atan2(-d.x, -d.z); nick = Math.asin(d.y);
    } else {
      let fx = 0, fz = 0, fy = 0;
      if (tasten.has('KeyW') || tasten.has('ArrowUp')) fz -= 1;
      if (tasten.has('KeyS') || tasten.has('ArrowDown')) fz += 1;
      if (tasten.has('KeyA') || tasten.has('ArrowLeft')) fx -= 1;
      if (tasten.has('KeyD') || tasten.has('ArrowRight')) fx += 1;
      if (tasten.has('Space') || tasten.has('KeyE')) fy += 1;
      if (tasten.has('ShiftLeft') || tasten.has('ShiftRight') || tasten.has('KeyQ')) fy -= 1;
      fx += touchBewegung.x; fz += touchBewegung.z; fy += touchBewegung.y;
      const schnell = tasten.has('ControlLeft') ? 3 : 1;
      vor.set(-Math.sin(gier), 0, -Math.cos(gier)); rechts.set(Math.cos(gier), 0, -Math.sin(gier));
      kamera.position.addScaledVector(vor, -fz * tempo * schnell * dt);
      kamera.position.addScaledVector(rechts, fx * tempo * schnell * dt);
      kamera.position.y += fy * tempo * schnell * dt;
      kamera.position.x = Math.max(-200, Math.min(700, kamera.position.x));
      kamera.position.z = Math.max(-200, Math.min(700, kamera.position.z));
      kamera.position.y = Math.max(1, Math.min(400, kamera.position.y));
    }
    richteKameraAus();
    renderer.render(szene, kamera);
    if (bereit && (posTakt += dt) > 0.2) {
      posTakt = 0;
      const p = kamera.position;
      $('#posAnzeige').textContent = `X ${Math.floor(p.x)} · Y ${Math.floor(p.y)} · Z ${Math.floor(p.z)}`;
      const t = strahl(p, new THREE.Vector3(0, 0, -1).applyQuaternion(kamera.quaternion), 250);
      const ziel = $('#zielBlock');
      if (t) {
        const inf = info[welt.daten[(t[1] * SZ + t[2]) * SX + t[0]]];
        ziel.textContent = inf.b.mat; ziel.hidden = false;
      } else ziel.hidden = true;
    }
    requestAnimationFrame(schleife);
  }
  requestAnimationFrame(schleife);
  window.__welt3d = { setzeKamera, setzeSchnitt, ORTE, bereit: () => bereit };
  lade().catch((err) => { $('#ladeText').textContent = 'Fehler beim Laden: ' + err.message; $('#laden').hidden = false; });
})();
