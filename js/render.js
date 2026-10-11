/* Zeichnet Modelle: isometrische 3D-Ansicht, Bauplan-Grundriss, Draufsicht und Ebenen-Ansicht */
(function (global) {
  'use strict';
  const { block } = global.HogwartsModell;

  function hexRgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function ton(h, f) {
    const [r, g, b] = hexRgb(h);
    const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
    return `rgb(${c(r)},${c(g)},${c(b)})`;
  }

  // Box-Formen [x0,x1,y0,y1,z0,z1] in Blockanteilen
  const FORMEN = {
    voll: [0, 1, 0, 1, 0, 1], glas: [0, 1, 0, 1, 0, 1], wasser: [0, 1, 0, 0.88, 0, 1],
    stufe: [0, 1, 0, 0.5, 0, 1], treppe: [0, 1, 0, 0.75, 0, 1],
    scheibe_ew: [0, 1, 0, 1, 0.42, 0.58], scheibe_ns: [0.42, 0.58, 0, 1, 0, 1],
    pfosten: [0.38, 0.62, 0, 1, 0.38, 0.62], klein: [0.3, 0.7, 0, 0.55, 0.3, 0.7],
    klein_h: [0.3, 0.7, 0.2, 0.75, 0.3, 0.7], leiter: [0.1, 0.9, 0, 1, 0, 0.12]
  };

  const spriteCache = new Map();
  // Abendlicht: Fenster leuchten warm
  const NACHT_FARBE = '#ffc966';
  function sprite(key, s, nacht) {
    const id = key + '@' + s + (nacht ? 'n' : '');
    if (spriteCache.has(id)) return spriteCache.get(id);
    const b = block(key);
    const f = FORMEN[b.form] || FORMEN.voll;
    const c = document.createElement('canvas');
    c.width = Math.ceil(2 * s); c.height = Math.ceil(2 * s);
    const g = c.getContext('2d');
    const P = (x, y, z) => [(x - z) * s + s, (x + z) * s / 2 - y * s + s];
    const poly = (pts, farbe) => {
      g.fillStyle = farbe; g.beginPath();
      pts.forEach((p, i) => { const q = P(...p); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); });
      g.closePath(); g.fill();
      if (s >= 6) { g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 0.6; g.stroke(); }
    };
    const [x0, x1, y0, y1, z0, z1] = f;
    const leuchtet = nacht && b.form.startsWith('scheibe');
    const farbe = leuchtet ? NACHT_FARBE : b.farbe;
    g.globalAlpha = leuchtet ? 1 : b.form === 'glas' || b.form.startsWith('scheibe') ? 0.55 : b.form === 'wasser' ? 0.8 : 1;
    poly([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], ton(farbe, 0.78));
    poly([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], ton(farbe, leuchtet ? 0.85 : 0.6));
    poly([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], ton(farbe, 1.12));
    if (key.startsWith('lantern') || key === 'campfire') {
      g.globalAlpha = 0.35; g.fillStyle = '#ffd27a';
      g.beginPath(); g.arc(s, s * 1.3, s * 0.9, 0, Math.PI * 2); g.fill();
    }
    spriteCache.set(id, c);
    return c;
  }

  /*
   * Isometrische Ansicht.
   * opt: { s (Pixel je Block), maxY, bereich:[x0,z0,x1,z1], nacht }
   */
  function iso(canvas, m, opt) {
    opt = opt || {};
    const s = opt.s || 4;
    const maxY = Math.min(m.sy - 1, opt.maxY !== undefined ? opt.maxY : m.sy - 1);
    const [bx0, bz0, bx1, bz1] = opt.bereich || [0, 0, m.sx - 1, m.sz - 1];
    const w = (bx1 - bx0 + 1) + (bz1 - bz0 + 1);
    const breite = Math.ceil(w * s + 2 * s);
    const hoehe = Math.ceil(w * s / 2 + (maxY + 2) * s + 2 * s);
    canvas.width = breite; canvas.height = hoehe;
    const g = canvas.getContext('2d');
    g.clearRect(0, 0, breite, hoehe);
    const ox = (bz1 - bz0 + 1) * s, oy = (maxY + 1) * s + s;
    const deckend = m.keys.map((k) => block(k).deckend);
    const sprites = m.keys.map((k) => (k === 'air' ? null : sprite(k, s, opt.nacht)));
    const d = m.daten, sx = m.sx, sz = m.sz, ebene = sx * sz;
    const offen = (x, y, z) => {
      if (x > bx1 || z > bz1 || y > maxY) return true;
      return !deckend[d[(y * sz + z) * sx + x]];
    };
    for (let y = 0; y <= maxY; y++) {
      const yb = y * ebene;
      for (let z = bz0; z <= bz1; z++) {
        for (let x = bx0; x <= bx1; x++) {
          const v = d[yb + z * sx + x];
          if (!v) continue;
          if (deckend[v] && !offen(x + 1, y, z) && !offen(x, y + 1, z) && !offen(x, y, z + 1)) continue;
          const lx = x - bx0, lz = z - bz0;
          const px = (lx - lz) * s + ox, py = (lx + lz) * s / 2 - y * s + oy;
          g.drawImage(sprites[v], px - s, py - s);
        }
      }
    }
    return canvas;
  }

  /* Bauplan-Grundriss (Blaupausen-Stil) auf Höhe y */
  function grundriss(canvas, m, y, p) {
    p = p || 2;
    canvas.width = m.sx * p; canvas.height = m.sz * p;
    const g = canvas.getContext('2d');
    g.fillStyle = '#0c2142'; g.fillRect(0, 0, canvas.width, canvas.height);
    for (let z = 0; z < m.sz; z++) for (let x = 0; x < m.sx; x++) {
      const k = m.get(x, y, z);
      let farbe = null;
      if (k !== 'air') {
        const b = block(k);
        if (b.form.startsWith('scheibe') || b.form === 'glas') farbe = '#58c4ff';
        else if (b.deckend && k !== 'bookshelf' && k !== 'dark_oak_planks') farbe = '#d7e8ff';
        else if (k === 'water') farbe = '#2f6fd6';
        else farbe = '#7d9cc8';
      } else {
        let unten = 'air';
        for (let yy = y - 1; yy >= Math.max(0, y - 6) && unten === 'air'; yy--) unten = m.get(x, yy, z);
        if (unten !== 'air') farbe = '#163762';
      }
      if (farbe) { g.fillStyle = farbe; g.fillRect(x * p, z * p, p, p); }
    }
    g.strokeStyle = 'rgba(160,200,255,0.12)'; g.lineWidth = 1;
    for (let x = 0; x <= m.sx; x += 10) { g.beginPath(); g.moveTo(x * p + 0.5, 0); g.lineTo(x * p + 0.5, canvas.height); g.stroke(); }
    for (let z = 0; z <= m.sz; z += 10) { g.beginPath(); g.moveTo(0, z * p + 0.5); g.lineTo(canvas.width, z * p + 0.5); g.stroke(); }
    return canvas;
  }

  /* Draufsicht: jeweils oberster Block, nach Höhe (und optional Hangneigung) schattiert */
  function draufsicht(canvas, m, p, blaupause, relief) {
    p = p || 2;
    canvas.width = m.sx * p; canvas.height = m.sz * p;
    const g = canvas.getContext('2d');
    g.fillStyle = '#0c2142'; g.fillRect(0, 0, canvas.width, canvas.height);
    const hoch = new Int16Array(m.sx * m.sz).fill(-1), oben = new Array(m.sx * m.sz);
    for (let z = 0; z < m.sz; z++) for (let x = 0; x < m.sx; x++) {
      for (let y = m.sy - 1; y >= 0; y--) {
        const k = m.get(x, y, z);
        if (k !== 'air') { hoch[z * m.sx + x] = y; oben[z * m.sx + x] = k; break; }
      }
    }
    for (let z = 0; z < m.sz; z++) for (let x = 0; x < m.sx; x++) {
      const i = z * m.sx + x, y = hoch[i];
      if (y < 0) continue;
      let f = 0.55 + 0.6 * (y / m.sy);
      if (relief) {
        const nw = x > 0 && z > 0 ? hoch[i - m.sx - 1] : y;
        f = 0.8 + 0.25 * (y / m.sy) + Math.max(-0.35, Math.min(0.35, (y - nw) * 0.07));
      }
      g.fillStyle = blaupause ? `rgba(200,225,255,${0.12 + 0.85 * y / m.sy})` : ton(block(oben[i]).farbe, f);
      g.fillRect(x * p, z * p, p, p);
    }
    return canvas;
  }

  /* Ebenen-Ansicht wie Litematica: echte Farben, darunterliegende Ebene abgedunkelt */
  function ebene(canvas, m, y, p, raster) {
    canvas.width = m.sx * p; canvas.height = m.sz * p;
    const g = canvas.getContext('2d');
    g.fillStyle = '#10151f'; g.fillRect(0, 0, canvas.width, canvas.height);
    for (let z = 0; z < m.sz; z++) for (let x = 0; x < m.sx; x++) {
      const k = m.get(x, y, z);
      if (k !== 'air') {
        const b = block(k);
        g.fillStyle = b.farbe; g.fillRect(x * p, z * p, p, p);
        if (p >= 6 && !b.deckend) {
          g.fillStyle = 'rgba(255,255,255,0.35)';
          const e = Math.max(1, Math.round(p / 4)); g.fillRect(x * p + e, z * p + e, p - 2 * e, p - 2 * e);
        }
      } else if (y > 0) {
        const u = m.get(x, y - 1, z);
        if (u !== 'air') { g.fillStyle = ton(block(u).farbe, 0.35); g.fillRect(x * p, z * p, p, p); }
      }
    }
    if (raster && p >= 5) {
      g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 1;
      for (let x = 0; x <= m.sx; x++) { g.beginPath(); g.moveTo(x * p + 0.5, 0); g.lineTo(x * p + 0.5, canvas.height); g.stroke(); }
      for (let z = 0; z <= m.sz; z++) { g.beginPath(); g.moveTo(0, z * p + 0.5); g.lineTo(canvas.width, z * p + 0.5); g.stroke(); }
    }
    if (raster) {
      g.strokeStyle = 'rgba(255,215,120,0.35)'; g.lineWidth = 1;
      for (let x = 0; x <= m.sx; x += 10) { g.beginPath(); g.moveTo(x * p + 0.5, 0); g.lineTo(x * p + 0.5, canvas.height); g.stroke(); }
      for (let z = 0; z <= m.sz; z += 10) { g.beginPath(); g.moveTo(0, z * p + 0.5); g.lineTo(canvas.width, z * p + 0.5); g.stroke(); }
    }
    return canvas;
  }

  global.HogwartsRender = { iso, grundriss, draufsicht, ebene };
})(typeof self !== 'undefined' ? self : this);
