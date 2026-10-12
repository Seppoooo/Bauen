/*
 * Hogwarts – Minecraft: Blockmodell und Generatoren
 * Läuft im Browser (global "HogwartsModell") und in Node (module.exports).
 * Koordinaten: x = Osten, y = oben, z = Süden. Index wie bei Litematica: (y * sz + z) * sx + x
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HogwartsModell = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------------------------------------------------------------- Blöcke */
  const BLOECKE = {};

  function def(key, id, mat, farbe, opt) {
    opt = opt || {};
    const form = opt.form || 'voll';
    BLOECKE[key] = {
      key, id, mat, farbe,
      props: opt.props || {},
      form,
      deckend: opt.deckend !== undefined ? opt.deckend : form === 'voll'
    };
  }

  const WL = { waterlogged: 'false' };
  def('air', 'minecraft:air', 'Luft', '#000000', { form: 'keine', deckend: false });
  def('stone_bricks', 'minecraft:stone_bricks', 'Steinziegel', '#7e7e7e');
  def('mossy_stone_bricks', 'minecraft:mossy_stone_bricks', 'Bemooste Steinziegel', '#6d7859');
  def('cracked_stone_bricks', 'minecraft:cracked_stone_bricks', 'Rissige Steinziegel', '#747371');
  def('cobblestone', 'minecraft:cobblestone', 'Bruchstein', '#6b6b6b');
  def('mossy_cobblestone', 'minecraft:mossy_cobblestone', 'Bemooster Bruchstein', '#5f6b4b');
  def('polished_andesite', 'minecraft:polished_andesite', 'Polierter Andesit', '#8f9393');
  def('deepslate_tiles', 'minecraft:deepslate_tiles', 'Tiefenschieferfliesen', '#38383e');
  def('deepslate_tile_slab', 'minecraft:deepslate_tile_slab', 'Tiefenschieferfliesenstufe', '#38383e',
    { form: 'stufe', props: { type: 'bottom', ...WL } });
  def('dark_oak_planks', 'minecraft:dark_oak_planks', 'Schwarzeichenholzbretter', '#4a3220');
  def('spruce_planks', 'minecraft:spruce_planks', 'Fichtenholzbretter', '#6e5131');
  def('spruce_slab', 'minecraft:spruce_slab', 'Fichtenholzstufe', '#6e5131',
    { form: 'stufe', props: { type: 'bottom', ...WL } });
  def('spruce_log', 'minecraft:spruce_log', 'Fichtenstamm', '#3d2b1a', { props: { axis: 'y' } });
  def('oak_log', 'minecraft:oak_log', 'Eichenstamm', '#6b5434', { props: { axis: 'y' } });
  def('oak_leaves', 'minecraft:oak_leaves', 'Eichenlaub', '#3f6b2a',
    { props: { distance: '1', persistent: 'true', ...WL } });
  def('bookshelf', 'minecraft:bookshelf', 'Bücherregal', '#7a5530');
  def('glass', 'minecraft:glass', 'Glas', '#bfe6f0', { form: 'glas', deckend: false });
  def('pane_ew', 'minecraft:glass_pane', 'Glasscheibe', '#9fd0e6',
    { form: 'scheibe_ew', deckend: false, props: { east: 'true', north: 'false', south: 'false', west: 'true', ...WL } });
  def('pane_ns', 'minecraft:glass_pane', 'Glasscheibe', '#9fd0e6',
    { form: 'scheibe_ns', deckend: false, props: { east: 'false', north: 'true', south: 'true', west: 'false', ...WL } });
  def('lantern', 'minecraft:lantern', 'Laterne', '#f0a83c', { form: 'klein', deckend: false, props: { hanging: 'false', ...WL } });
  def('lantern_h', 'minecraft:lantern', 'Laterne', '#f0a83c', { form: 'klein_h', deckend: false, props: { hanging: 'true', ...WL } });
  def('chain', 'minecraft:chain', 'Kette', '#3b3f4a', { form: 'pfosten', deckend: false, props: { axis: 'y', ...WL } });
  def('ladder_s', 'minecraft:ladder', 'Leiter', '#a0773f', { form: 'leiter', deckend: false, props: { facing: 'south', ...WL } });
  def('lightning_rod', 'minecraft:lightning_rod', 'Blitzableiter (Kupfer)', '#c8734a',
    { form: 'pfosten', deckend: false, props: { facing: 'up', powered: 'false', ...WL } });
  def('water', 'minecraft:water', 'Wasser (Eimer)', '#3a6fd8', { form: 'wasser', deckend: false, props: { level: '0' } });
  def('grass_block', 'minecraft:grass_block', 'Grasblock', '#5d9a3b', { props: { snowy: 'false' } });
  def('red_wool', 'minecraft:red_wool', 'Rote Wolle', '#a12722');
  def('yellow_wool', 'minecraft:yellow_wool', 'Gelbe Wolle', '#e8b42e');
  def('blue_wool', 'minecraft:blue_wool', 'Blaue Wolle', '#35399d');
  def('green_wool', 'minecraft:green_wool', 'Grüne Wolle', '#546d1b');
  def('stone_brick_slab', 'minecraft:stone_brick_slab', 'Steinziegelstufe', '#7e7e7e',
    { form: 'stufe', props: { type: 'bottom', ...WL } });
  def('moss_block', 'minecraft:moss_block', 'Moosblock', '#596e2d');
  def('flowering_azalea', 'minecraft:flowering_azalea', 'Blühende Azalee', '#7f9a45', { form: 'klein', deckend: false });
  def('coarse_dirt', 'minecraft:coarse_dirt', 'Grobe Erde', '#77553b');
  def('pumpkin', 'minecraft:pumpkin', 'Kürbis', '#c57618');
  def('campfire', 'minecraft:campfire', 'Lagerfeuer', '#d86a1e',
    { form: 'stufe', deckend: false, props: { facing: 'north', lit: 'true', signal_fire: 'false', ...WL } });
  def('yellow_concrete', 'minecraft:yellow_concrete', 'Gelber Beton', '#f0af15');
  def('white_concrete', 'minecraft:white_concrete', 'Weißer Beton', '#cfd5d6');
  // Gelände
  def('stone', 'minecraft:stone', 'Stein', '#7a7a7a');
  def('andesite', 'minecraft:andesite', 'Andesit', '#88898a');
  def('dirt', 'minecraft:dirt', 'Erde', '#866043');
  def('sand', 'minecraft:sand', 'Sand', '#dbcf9c');
  def('gravel', 'minecraft:gravel', 'Kies', '#857f7c');
  def('dirt_path', 'minecraft:dirt_path', 'Trampelpfad', '#94793f', { form: 'voll' });
  def('spruce_leaves', 'minecraft:spruce_leaves', 'Fichtenlaub', '#2f4c30',
    { props: { distance: '1', persistent: 'true', ...WL } });
  def('poppy', 'minecraft:poppy', 'Mohn', '#c8221b', { form: 'klein', deckend: false });
  def('dandelion', 'minecraft:dandelion', 'Löwenzahn', '#e8d23a', { form: 'klein', deckend: false });
  def('cornflower', 'minecraft:cornflower', 'Kornblume', '#4a6fd8', { form: 'klein', deckend: false });
  def('fern', 'minecraft:fern', 'Farn', '#4e7a35', { form: 'klein', deckend: false });

  // Treppen: Schlüssel <präfix>_<n|s|e|w>, "facing" = Richtung der hohen Seite
  const RICHTUNG = { n: 'north', s: 'south', e: 'east', w: 'west' };
  function treppen(praefix, id, mat, farbe) {
    for (const r of Object.keys(RICHTUNG)) {
      def(praefix + '_' + r, id, mat, farbe, {
        form: 'treppe', deckend: false,
        props: { facing: RICHTUNG[r], half: 'bottom', shape: 'straight', ...WL }
      });
    }
  }
  treppen('dts', 'minecraft:deepslate_tile_stairs', 'Tiefenschieferfliesentreppe', '#38383e');
  treppen('sps', 'minecraft:spruce_stairs', 'Fichtenholztreppe', '#6e5131');

  // Zäune werden nach dem Bauen verbunden: "spruce_fence" oder "spruce_fence:nesw"
  function block(key) {
    let b = BLOECKE[key];
    if (b) return b;
    if (key.startsWith('spruce_fence')) {
      const seiten = key.split(':')[1] || '';
      def(key, 'minecraft:spruce_fence', 'Fichtenzaun', '#6e5131', {
        form: 'pfosten', deckend: false,
        props: {
          east: String(seiten.includes('e')), north: String(seiten.includes('n')),
          south: String(seiten.includes('s')), west: String(seiten.includes('w')), ...WL
        }
      });
      return BLOECKE[key];
    }
    throw new Error('Unbekannter Block: ' + key);
  }

  /* ---------------------------------------------------------------- Modell */
  class Modell {
    constructor(sx, sy, sz) {
      this.sx = sx; this.sy = sy; this.sz = sz;
      this.daten = new Uint8Array(sx * sy * sz);
      this.keys = ['air'];
      this.index = { air: 0 };
    }
    id(key) {
      let i = this.index[key];
      if (i === undefined) {
        block(key);
        i = this.keys.length;
        if (i > 255) throw new Error('Zu viele Blocktypen');
        this.keys.push(key);
        this.index[key] = i;
      }
      return i;
    }
    drin(x, y, z) {
      return x >= 0 && y >= 0 && z >= 0 && x < this.sx && y < this.sy && z < this.sz;
    }
    set(x, y, z, key) {
      if (key == null || !this.drin(x, y, z)) return;
      if (typeof key === 'function') key = key(x, y, z);
      this.daten[(y * this.sz + z) * this.sx + x] = this.id(key);
    }
    get(x, y, z) {
      if (!this.drin(x, y, z)) return 'air';
      return this.keys[this.daten[(y * this.sz + z) * this.sx + x]];
    }
    // Materialzählung nach Materialname
    material(yNur) {
      const anzahl = new Uint32Array(this.keys.length);
      const d = this.daten;
      if (yNur === undefined) {
        for (let i = 0; i < d.length; i++) anzahl[d[i]]++;
      } else {
        const ebene = this.sx * this.sz, s = yNur * ebene;
        for (let i = s; i < s + ebene; i++) anzahl[d[i]]++;
      }
      const mats = {};
      for (let i = 1; i < this.keys.length; i++) {
        if (!anzahl[i]) continue;
        const b = block(this.keys[i]);
        mats[b.mat] = mats[b.mat] || { mat: b.mat, farbe: b.farbe, anzahl: 0 };
        mats[b.mat].anzahl += anzahl[i];
      }
      return Object.values(mats).sort((a, b) => b.anzahl - a.anzahl);
    }
    bloeckeGesamt() {
      let n = 0;
      for (let i = 0; i < this.daten.length; i++) if (this.daten[i]) n++;
      return n;
    }
    // Zäune mit Nachbarn verbinden (Zaun oder voller Block)
    verbindeZaeune() {
      for (let y = 0; y < this.sy; y++) for (let z = 0; z < this.sz; z++) for (let x = 0; x < this.sx; x++) {
        const k = this.get(x, y, z);
        if (!k.startsWith('spruce_fence')) continue;
        const ok = (kk) => kk.startsWith('spruce_fence') || block(kk).deckend;
        let s = '';
        if (ok(this.get(x, y, z - 1))) s += 'n';
        if (ok(this.get(x + 1, y, z))) s += 'e';
        if (ok(this.get(x, y, z + 1))) s += 's';
        if (ok(this.get(x - 1, y, z))) s += 'w';
        this.set(x, y, z, s ? 'spruce_fence:' + s : 'spruce_fence');
      }
    }
  }

  /* ---------------------------------------------------------------- Hilfen */
  function hash(x, y, z) {
    let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  // Steinziegel-Mix für Mauern (unten mehr Moos)
  function mauer(x, y, z) {
    const r = hash(x, y, z);
    if (r < (y < 10 ? 0.14 : 0.05)) return 'mossy_stone_bricks';
    if (r < 0.2 && r > 0.13) return 'cracked_stone_bricks';
    return 'stone_bricks';
  }
  function sockel(x, y, z) {
    return hash(x, y, z) < 0.3 ? 'mossy_cobblestone' : 'cobblestone';
  }
  function box(m, x0, y0, z0, x1, y1, z1, key) {
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) m.set(x, y, z, key);
  }
  const imKreis = (dx, dz, r) => dx * dx + dz * dz <= r * r + r;

  /* Kegeldach (rund), hohl, außen mit Treppen */
  function kegel(m, cx, cz, R, y0, H, voll, treppe) {
    const rad = (k) => R * (1 - k / H);
    for (let k = 0; k < H; k++) {
      const rk = rad(k), rn = rad(k + 1), y = y0 + k;
      if (rk < 0.75) { m.set(cx, y, cz, voll); continue; }
      const g = Math.ceil(rk) + 1;
      for (let dz = -g; dz <= g; dz++) for (let dx = -g; dx <= g; dx++) {
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d > rk + 0.35 || d <= rk - 1.25) continue;
        let key = voll;
        if (d > rn + 0.35 && (dx || dz)) {
          const r = Math.abs(dx) >= Math.abs(dz) ? (dx > 0 ? 'w' : 'e') : (dz > 0 ? 'n' : 's');
          key = treppe + '_' + r;
        }
        m.set(cx + dx, y, cz + dz, key);
      }
    }
    return y0 + H;
  }

  /* Satteldach über Rechteck; Achse = Firstrichtung ('x' oder 'z') */
  function satteldach(m, x0, z0, x1, z1, yt, achse) {
    const lx = achse === 'x';
    const a0 = lx ? x0 : z0, a1 = lx ? x1 : z1;
    const b0 = lx ? z0 : x0, b1 = lx ? z1 : x1;
    const S = (a, y, b, k) => (lx ? m.set(a, y, b, k) : m.set(b, y, a, k));
    const hoch = lx ? 'dts_s' : 'dts_e', runter = lx ? 'dts_n' : 'dts_w';
    for (let k = 0; ; k++) {
      const y = yt + 1 + k, bn = b0 - 1 + k, bs = b1 + 1 - k;
      if (bn > bs) break;
      if (bn === bs) { for (let a = a0 - 1; a <= a1 + 1; a++) S(a, y, bn, 'deepslate_tiles'); break; }
      for (let a = a0 - 1; a <= a1 + 1; a++) { S(a, y, bn, hoch); S(a, y, bs, runter); }
      for (let b = bn + 1; b < bs; b++) { S(a0, y, b, mauer); S(a1, y, b, mauer); }
    }
  }

  /* Flügel / Gebäudetrakt */
  function fluegel(m, o) {
    const { x0, z0, x1, z1 } = o;
    const y0 = 4, etagen = o.etagen || 1, halle = !!o.halle;
    const yt = halle ? y0 + o.hoehe : y0 + 6 * etagen;
    const langX = (x1 - x0) >= (z1 - z0);
    const achse = o.achse || (langX ? 'x' : 'z');

    box(m, x0 + 1, y0 + 1, z0 + 1, x1 - 1, yt - 1, z1 - 1, 'air');
    for (let y = y0; y <= yt; y++) {
      for (let x = x0; x <= x1; x++) { m.set(x, y, z0, mauer); m.set(x, y, z1, mauer); }
      for (let z = z0; z <= z1; z++) { m.set(x0, y, z, mauer); m.set(x1, y, z, mauer); }
    }
    const boeden = [];
    if (halle) boeden.push(y0); else for (let k = 0; k < etagen; k++) boeden.push(y0 + 6 * k);
    for (const fy of boeden) {
      box(m, x0 + 1, fy, z0 + 1, x1 - 1, fy, z1 - 1,
        fy === y0 ? (x, y, z) => ((x + z) % 2 ? 'polished_andesite' : 'stone_bricks') : 'dark_oak_planks');
    }
    box(m, x0 + 1, yt, z0 + 1, x1 - 1, yt, z1 - 1, 'dark_oak_planks');
    // Gesimsbänder
    for (const y of boeden.slice(1).concat([yt])) {
      for (let x = x0; x <= x1; x++) { m.set(x, y, z0, 'polished_andesite'); m.set(x, y, z1, 'polished_andesite'); }
      for (let z = z0; z <= z1; z++) { m.set(x0, y, z, 'polished_andesite'); m.set(x1, y, z, 'polished_andesite'); }
    }
    // Fenster
    if (halle) {
      for (let x = x0 + 2; x <= x1 - 2; x++) {
        const p = (x - x0) % 8;
        if (p !== 3 && p !== 4) continue;
        for (let y = y0 + 4; y <= yt - 7; y++) { m.set(x, y, z0, 'pane_ew'); m.set(x, y, z1, 'pane_ew'); }
      }
      // Rosettenfenster in den Giebelseiten
      const zc = Math.round((z0 + z1) / 2), yc = yt - 9;
      for (let dz = -5; dz <= 5; dz++) for (let dy = -5; dy <= 5; dy++) {
        if (!imKreis(dz, dy, 4)) continue;
        m.set(x0, yc + dy, zc + dz, 'pane_ns'); m.set(x1, yc + dy, zc + dz, 'pane_ns');
      }
    } else {
      for (const fy of boeden) for (let y = fy + 2; y <= fy + 4; y++) {
        for (let x = x0 + 2; x <= x1 - 2; x++) if ((x - x0) % 4 === 2) { m.set(x, y, z0, 'pane_ew'); m.set(x, y, z1, 'pane_ew'); }
        for (let z = z0 + 2; z <= z1 - 2; z++) if ((z - z0) % 4 === 2) { m.set(x0, y, z, 'pane_ns'); m.set(x1, y, z, 'pane_ns'); }
      }
    }
    // Trennwände quer zur Längsachse alle 12 Blöcke, mit Durchgang
    const lStart = langX ? x0 : z0, lEnde = langX ? x1 : z1;
    const qStart = langX ? z0 : x0, qEnde = langX ? z1 : x1, qMitte = Math.round((qStart + qEnde) / 2);
    const L = (l, y, q, k) => (langX ? m.set(l, y, q, k) : m.set(q, y, l, k));
    if (!halle && o.trennAb !== undefined) {
      boeden.forEach((fy, i) => {
        if (i < o.trennAb) return;
        for (let l = lStart + 12; l < lEnde - 6; l += 12) {
          for (let y = fy + 1; y < fy + 6; y++) for (let q = qStart + 1; q < qEnde; q++) {
            const tuer = Math.abs(q - qMitte) <= 1 && y <= fy + 3;
            L(l, y, q, tuer ? 'air' : mauer);
          }
        }
      });
    }
    // Treppen zwischen den Etagen (abwechselnd zwei Spuren)
    const tr = langX ? 'sps_e' : 'sps_s';
    for (let k = 0; k < boeden.length - 1 && !halle; k++) {
      const fy = boeden[k], off = k % 2 === 0 ? 2 : 5;
      for (let s = 0; s < 2; s++) {
        const q = qStart + off + s;
        for (let i = 0; i <= 4; i++) L(lStart + 2 + i, fy + 6, q, 'air');
        for (let i = 0; i <= 5; i++) L(lStart + 2 + i, fy + 1 + i, q, tr);
      }
    }
    // Hängelaternen
    if (!halle) {
      boeden.forEach((fy, i) => {
        const decke = i + 1 < boeden.length ? boeden[i + 1] : yt;
        for (let l = lStart + 4; l <= lEnde - 3; l += 6) {
          if (langX ? m.get(l, decke - 1, qMitte) === 'air' && m.get(l, decke, qMitte) !== 'air'
                    : m.get(qMitte, decke - 1, l) === 'air' && m.get(qMitte, decke, l) !== 'air') {
            L(l, decke - 1, qMitte, 'lantern_h');
          }
        }
      });
    }
    satteldach(m, x0, z0, x1, z1, yt, achse);
    return yt;
  }

  /* Runder Turm mit Etagen, Leiter und Kegeldach */
  function turm(m, o) {
    const { cx, cz, r, top } = o;
    const y0 = 4;
    for (let dz = -r - 2; dz <= r + 2; dz++) for (let dx = -r - 2; dx <= r + 2; dx++) {
      if (!imKreis(dx, dz, r + 2)) continue;
      for (let y = 0; y < y0; y++) m.set(cx + dx, y, cz + dz, sockel);
    }
    const boeden = [];
    for (let fy = y0; fy < top - 3; fy += 6) boeden.push(fy);
    boeden.push(top);
    for (let dz = -r - 1; dz <= r + 1; dz++) for (let dx = -r - 1; dx <= r + 1; dx++) {
      const innen = imKreis(dx, dz, r - 1), ring = imKreis(dx, dz, r) && !innen;
      for (let y = y0; y < top; y++) {
        if (innen && y > y0) m.set(cx + dx, y, cz + dz, 'air');
        if (ring) m.set(cx + dx, y, cz + dz, mauer);
      }
      if (innen) for (const fy of boeden) m.set(cx + dx, fy, cz + dz, 'spruce_planks');
      if (imKreis(dx, dz, r + 1) && !innen) m.set(cx + dx, top, cz + dz, 'polished_andesite');
      if (ring) for (const fy of boeden.slice(1, -1)) m.set(cx + dx, fy, cz + dz, 'polished_andesite');
    }
    // Leiter an der Nordwand
    for (let y = y0 + 1; y <= top; y++) m.set(cx, y, cz - r + 1, 'ladder_s');
    // Türen (wo außen ein begehbarer Boden ist) oder Fenster
    const seiten = [[1, 0, 'pane_ns'], [-1, 0, 'pane_ns'], [0, 1, 'pane_ew'], [0, -1, 'pane_ew']];
    for (const fy of boeden.slice(0, -1)) {
      for (const [ux, uz, scheibe] of seiten) {
        const wx = cx + ux * r, wz = cz + uz * r, ax = wx + ux, az = wz + uz;
        const frei = m.get(ax, fy + 1, az) === 'air' && m.get(ax, fy + 2, az) === 'air';
        const boden = m.get(ax, fy, az) !== 'air' || m.get(ax, fy - 1, az) !== 'air';
        if (frei && boden && !(uz === -1)) {
          for (let y = fy + 1; y <= fy + 3; y++) m.set(wx, y, wz, 'air');
        } else {
          for (let y = fy + 2; y <= fy + 4; y++) m.set(wx, y, wz, scheibe);
        }
      }
      const decke = boeden[boeden.indexOf(fy) + 1];
      m.set(cx, decke - 1, cz, 'lantern_h');
    }
    const R = r + 1, H = Math.round(R * 2.6) + 2;
    const spitze = kegel(m, cx, cz, R, top + 1, H, 'deepslate_tiles', 'dts');
    m.set(cx, spitze, cz, 'lightning_rod');
  }

  /* ================================================== Hauptschloss 181×151 */
  function erzeugeHauptschloss() {
    const m = new Modell(181, 100, 151);

    // Sockel (Felsplateau-Abschluss)
    const flaechen = [
      [58, 120, 122, 136], [86, 28, 94, 38], [58, 38, 122, 70], [40, 70, 68, 128], [112, 70, 140, 128],
      [10, 56, 40, 100], [140, 46, 170, 96], [69, 71, 111, 119], [82, 136, 98, 150]
    ];
    for (const [x0, z0, x1, z1] of flaechen) box(m, x0 - 2, 0, z0 - 2, x1 + 2, 3, z1 + 2, sockel);

    // Trakte (Reihenfolge wichtig: spätere räumen Überschneidungen frei)
    fluegel(m, { x0: 58, z0: 120, x1: 122, z1: 136, etagen: 2, trennAb: 0 });          // Südflügel / Eingang
    fluegel(m, { x0: 86, z0: 28, x1: 94, z1: 38, etagen: 2, achse: 'z' });             // Verbindung Hauptturm
    fluegel(m, { x0: 58, z0: 38, x1: 122, z1: 70, halle: true, hoehe: 25 });           // Große Halle
    fluegel(m, { x0: 40, z0: 70, x1: 68, z1: 128, etagen: 3, trennAb: 1 });            // Westflügel (Bibliothek)
    fluegel(m, { x0: 112, z0: 70, x1: 140, z1: 128, etagen: 3, trennAb: 0 });          // Ostflügel
    fluegel(m, { x0: 10, z0: 56, x1: 40, z1: 100, etagen: 2, trennAb: 0 });            // Westanbau
    fluegel(m, { x0: 140, z0: 46, x1: 170, z1: 96, etagen: 2, trennAb: 0 });           // Ostanbau

    // Große Halle: Tische, Bänke, Banner, schwebende Laternen
    for (const z of [45, 51, 57, 63]) {
      for (let x = 66; x <= 108; x++) {
        m.set(x, 5, z, 'dark_oak_planks');
        m.set(x, 5, z - 1, 'spruce_slab'); m.set(x, 5, z + 1, 'spruce_slab');
      }
    }
    for (let z = 44; z <= 64; z++) { m.set(115, 5, z, 'dark_oak_planks'); m.set(116, 5, z, 'spruce_slab'); }
    box(m, 113, 4, 42, 120, 4, 66, 'dark_oak_planks'); // Lehrerpodest
    const hausFarben = ['red_wool', 'yellow_wool', 'blue_wool', 'green_wool'];
    let fi = 0;
    for (let x = 64; x <= 116; x += 8) {
      const f = hausFarben[fi++ % 4];
      box(m, x, 12, 39, x + 1, 19, 39, f);
      box(m, x, 12, 69, x + 1, 19, 69, hausFarben[(fi + 1) % 4]);
    }
    for (let x = 64; x <= 116; x += 6) for (let z = 42; z <= 66; z += 6) {
      for (let y = 22; y <= 28; y++) m.set(x, y, z, 'chain');
      m.set(x, 21, z, 'lantern_h');
    }

    // Bibliothek im Erdgeschoss des Westflügels
    for (let z = 80; z <= 124; z += 4) for (let y = 5; y <= 7; y++) {
      for (let x = 47; x <= 54; x++) m.set(x, y, z, 'bookshelf');
      for (let x = 57; x <= 65; x++) m.set(x, y, z, 'bookshelf');
    }

    // Innenhof mit Kreuzgang, Brunnen und Bäumen
    const hx0 = 69, hx1 = 111, hz0 = 71, hz1 = 119;
    for (let z = hz0; z <= hz1; z++) for (let x = hx0; x <= hx1; x++) {
      const d = Math.min(x - hx0, hx1 - x, z - hz0, hz1 - z);
      const weg = Math.abs(x - 90) <= 2 || Math.abs(z - 95) <= 2 || d <= 3;
      m.set(x, 3, z, weg ? ((x + z) % 2 ? 'polished_andesite' : 'stone_bricks') : 'grass_block');
      if (d <= 3) m.set(x, 8, z, 'stone_brick_slab');
      if (d === 3) {
        const entlang = (x - hx0 === 3 || hx1 - x === 3) ? z - hz0 : x - hx0;
        if ((entlang - 3) % 4 === 0) for (let y = 4; y <= 7; y++) m.set(x, y, z, 'polished_andesite');
      }
      if (d === 1) {
        const entlang = (x - hx0 === 1 || hx1 - x === 1) ? z - hz0 : x - hx0;
        if (entlang % 8 === 5) m.set(x, 7, z, 'lantern_h');
      }
    }
    for (let dz = -5; dz <= 5; dz++) for (let dx = -5; dx <= 5; dx++) {
      if (!imKreis(dx, dz, 5)) continue;
      const innen = imKreis(dx, dz, 4);
      m.set(90 + dx, 3, 95 + dz, 'stone_bricks');
      m.set(90 + dx, 4, 95 + dz, innen ? 'water' : 'stone_bricks');
    }
    for (let y = 4; y <= 6; y++) m.set(90, y, 95, 'polished_andesite');
    m.set(90, 7, 95, 'lantern');
    for (const [tx, tz] of [[78, 83], [102, 83], [78, 107], [102, 107]]) {
      for (let dy = -2; dy <= 3; dy++) for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
        if (dx * dx + dy * dy * 1.4 + dz * dz <= 7.5 && m.get(tx + dx, 9 + dy, tz + dz) === 'air') m.set(tx + dx, 9 + dy, tz + dz, 'oak_leaves');
      }
      for (let y = 4; y <= 9; y++) m.set(tx, y, tz, 'oak_log');
    }

    // Durchgänge zwischen den Trakten
    const tuer = (x0, z0, x1, z1, ys) => { for (const fy of ys) box(m, x0, fy + 1, z0, x1, fy + 3, z1, 'air'); };
    tuer(89, 70, 91, 70, [4]);          // Halle -> Innenhof
    tuer(68, 94, 68, 96, [4]);          // Westflügel -> Innenhof
    tuer(112, 94, 112, 96, [4]);        // Ostflügel -> Innenhof
    tuer(62, 70, 63, 70, [4]);          // Halle -> Westflügel
    tuer(116, 70, 117, 70, [4]);        // Halle -> Ostflügel
    tuer(58, 124, 58, 125, [4, 10]);    // Westflügel <-> Südflügel
    tuer(62, 128, 63, 128, [4, 10]);
    tuer(122, 124, 122, 125, [4, 10]);  // Ostflügel <-> Südflügel
    tuer(117, 128, 118, 128, [4, 10]);
    tuer(40, 85, 40, 86, [4, 10]);      // Westanbau
    tuer(140, 85, 140, 86, [4, 10]);    // Ostanbau
    tuer(89, 38, 91, 38, [4]);          // Halle -> Verbindung Hauptturm

    // Torhalle durch den Südflügel
    box(m, 87, 5, 120, 93, 8, 136, 'air');
    box(m, 88, 9, 120, 92, 9, 136, 'air');
    for (let z = 121; z <= 135; z++) for (let y = 5; y <= 9; y++) { m.set(86, y, z, mauer); m.set(94, y, z, mauer); }
    for (let z = 122; z <= 134; z += 4) { m.set(87, 8, z, 'lantern_h'); m.set(93, 8, z, 'lantern_h'); }

    // Türme
    turm(m, { cx: 90, cz: 22, r: 7, top: 74 });   // Hauptturm (Astronomieturm)
    turm(m, { cx: 58, cz: 38, r: 5, top: 46 });
    turm(m, { cx: 122, cz: 38, r: 5, top: 46 });
    turm(m, { cx: 40, cz: 70, r: 5, top: 42 });
    turm(m, { cx: 140, cz: 70, r: 5, top: 42 });
    turm(m, { cx: 40, cz: 128, r: 5, top: 36 });
    turm(m, { cx: 140, cz: 128, r: 5, top: 36 });
    turm(m, { cx: 58, cz: 136, r: 4, top: 28 });
    turm(m, { cx: 122, cz: 136, r: 4, top: 28 });
    turm(m, { cx: 10, cz: 56, r: 4, top: 34 });
    turm(m, { cx: 10, cz: 100, r: 5, top: 56 });  // Westturm
    turm(m, { cx: 170, cz: 46, r: 4, top: 34 });
    turm(m, { cx: 170, cz: 96, r: 5, top: 52 });  // Ostturm
    // Hauptturm: Zugang von der Verbindung
    for (const fy of [4, 10]) box(m, 89, fy + 1, 28, 91, fy + 3, 30, 'air');

    // Torbau mit Vorplatz zur Brücke
    for (let z = 137; z <= 150; z++) {
      for (let x = 87; x <= 93; x++) m.set(x, 3, z, (x + z) % 2 ? 'polished_andesite' : 'stone_bricks');
      m.set(86, 4, z, mauer); m.set(94, 4, z, mauer);
      if (z % 5 === 0) { m.set(86, 5, z, 'lantern'); m.set(94, 5, z, 'lantern'); }
    }
    turm(m, { cx: 82, cz: 142, r: 3, top: 22 });
    turm(m, { cx: 98, cz: 142, r: 3, top: 22 });
    for (let y = 4; y <= 14; y++) {
      m.set(85, y, 142, mauer); m.set(86, y, 142, mauer); m.set(94, y, 142, mauer); m.set(95, y, 142, mauer);
      if (y >= 11) for (let x = 87; x <= 93; x++) m.set(x, y, 142, y === 14 && x % 2 ? 'air' : mauer);
    }
    m.set(90, 10, 142, 'lantern_h');

    m.verbindeZaeune();
    return m;
  }

  /* ================================================== Viadukt / Brücke */
  function erzeugeBruecke() {
    // Zweistöckiges Viadukt: oben kleine Bögen unter dem Deck, unten hohe Bögen über der Schlucht
    const m = new Modell(11, 76, 123);
    const deck = 72;
    for (let z = 0; z < 123; z++) {
      for (let x = 0; x <= 10; x++) {
        for (let y = deck - 3; y <= deck; y++) m.set(x, y, z, y === deck && x > 0 && x < 10 ? ((x + z) % 2 ? 'polished_andesite' : 'stone_bricks') : mauer);
      }
      m.set(0, deck + 1, z, mauer); m.set(10, deck + 1, z, mauer);
      if (z % 6 === 1) { m.set(0, deck + 2, z, 'lantern'); m.set(10, deck + 2, z, 'lantern'); }
      if (z % 6 === 4) { m.set(0, deck + 1, z, 'stone_brick_slab'); m.set(10, deck + 1, z, 'stone_brick_slab'); }
    }
    for (let k = 0; k <= 10; k++) {
      const pz = 12 * k + 1;
      for (let z = pz - 1; z <= pz + 1; z++) for (let x = 1; x <= 9; x++) for (let y = 0; y < deck - 3; y++) m.set(x, y, z, mauer);
      for (let z = pz - 2; z <= pz + 2; z++) for (let x = 0; x <= 10; x++) for (let y = 0; y <= 8; y++) m.set(x, y, z, y === 8 ? 'polished_andesite' : sockel);
      // Pfeilervorlagen
      for (let y = 9; y < deck - 3; y++) { m.set(0, y, pz, mauer); m.set(10, y, pz, mauer); }
      if (k === 10) break;
      const zc = pz + 6;
      for (let z = pz + 2; z <= pz + 10; z++) {
        const d = Math.abs(z - zc);
        const oben = Math.ceil(deck - 12 + Math.sqrt(Math.max(0, 22 - d * d)));
        const unten = Math.ceil(26 + Math.sqrt(Math.max(0, 22 - d * d)) * 1.6);
        for (let x = 1; x <= 9; x++) {
          for (let y = oben; y < deck - 3; y++) m.set(x, y, z, y === oben ? 'polished_andesite' : mauer);
          for (let y = unten; y <= 40; y++) m.set(x, y, z, y === unten ? 'polished_andesite' : y >= 38 ? 'polished_andesite' : mauer);
        }
      }
    }
    return m;
  }

  /* ================================================== Hagrids Hütte */
  function erzeugeHagrid() {
    const m = new Modell(23, 22, 17);
    const cx = 7, cz = 8, r = 5;
    for (let z = 0; z < 17; z++) for (let x = 0; x < 23; x++) m.set(x, 0, z, 'grass_block');
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (!imKreis(dx, dz, r)) continue;
      const ring = !imKreis(dx, dz, r - 1);
      m.set(cx + dx, 0, cz + dz, ring ? 'cobblestone' : 'spruce_planks');
      if (ring) for (let y = 1; y <= 5; y++) m.set(cx + dx, y, cz + dz, sockel);
    }
    for (let y = 1; y <= 3; y++) m.set(cx, y, cz + r, 'air');       // Tür
    for (const [x, z, s] of [[cx + r, cz, 'pane_ns'], [cx - r, cz, 'pane_ns'], [cx, cz - r, 'pane_ew']]) {
      m.set(x, 2, z, s); m.set(x, 3, z, s);
    }
    kegel(m, cx, cz, r + 1, 6, 8, 'spruce_planks', 'sps');
    for (let y = 1; y <= 12; y++) m.set(cx + 2, y, cz - 2, 'cobblestone');  // Kamin
    m.set(cx + 2, 13, cz - 2, 'campfire');
    m.set(cx, 4, cz, 'lantern_h');
    // Kürbisbeet mit Zaun
    for (let z = 2; z <= 13; z++) for (let x = 14; x <= 21; x++) {
      const rand = x === 14 || x === 21 || z === 2 || z === 13;
      if (rand) { if (!(x === 14 && z === 8)) m.set(x, 1, z, 'spruce_fence'); continue; }
      m.set(x, 0, z, 'coarse_dirt');
      if (hash(x, 0, z) < 0.35) m.set(x, 1, z, 'pumpkin');
    }
    m.set(14, 2, 2, 'lantern'); m.set(21, 2, 2, 'lantern'); m.set(14, 2, 13, 'lantern'); m.set(21, 2, 13, 'lantern');
    m.verbindeZaeune();
    return m;
  }

  /* ================================================== Gewächshäuser */
  function erzeugeGewaechshaeuser() {
    const m = new Modell(31, 10, 15);
    for (let h = 0; h < 3; h++) {
      const ox = h * 11;
      for (let z = 0; z < 15; z++) for (let x = 0; x <= 8; x++) {
        m.set(ox + x, 0, z, 'stone_bricks');
        const rand = x === 0 || x === 8 || z === 0 || z === 14;
        if (rand) {
          const pfosten = (x === 0 || x === 8) && z % 3 === 1 || (z === 0 || z === 14) && (x === 0 || x === 8);
          for (let y = 1; y <= 4; y++) m.set(ox + x, y, z, pfosten ? 'spruce_log' : 'glass');
        } else if (x <= 2 || x >= 6) {
          m.set(ox + x, 1, z, 'moss_block');
          if ((x + z) % 2 === 0) m.set(ox + x, 2, z, hash(ox + x, 2, z) < 0.5 ? 'flowering_azalea' : 'oak_leaves');
        } else m.set(ox + x, 0, z, 'coarse_dirt');
      }
      for (let k = 0; k <= 4; k++) for (let z = 0; z < 15; z++) {
        const y = 5 + k;
        if (k === 4) { m.set(ox + 4, y, z, 'spruce_planks'); continue; }
        m.set(ox + k, y, z, z % 3 === 1 ? 'spruce_planks' : 'glass');
        m.set(ox + 8 - k, y, z, z % 3 === 1 ? 'spruce_planks' : 'glass');
        if (z === 0 || z === 14) for (let x = k + 1; x < 8 - k; x++) m.set(ox + x, y, z, 'glass');
      }
      for (let y = 1; y <= 2; y++) m.set(ox + 4, y, 0, 'air');
      for (let z = 2; z < 14; z += 4) m.set(ox + 4, 8, z, 'lantern_h');
    }
    return m;
  }

  /* ================================================== Quidditch-Feld */
  function erzeugeQuidditch() {
    const m = new Modell(71, 20, 39);
    const cx = 35, cz = 19, a = 33, b = 14;
    for (let z = 0; z < 39; z++) for (let x = 0; x < 71; x++) {
      const e = ((x - cx) / a) ** 2 + ((z - cz) / b) ** 2;
      if (e <= 1) m.set(x, 0, z, e > 0.93 ? 'white_concrete' : 'grass_block');
    }
    for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) {
      if (imKreis(dx, dz, 4) && !imKreis(dx, dz, 3)) m.set(cx + dx, 0, cz + dz, 'white_concrete');
    }
    for (const x of [5, 65]) {
      [[15, 10], [19, 13], [23, 10]].forEach(([z, h]) => {
        for (let y = 1; y <= h; y++) m.set(x, y, z, 'spruce_fence');
        for (let dy = -2; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++) {
          if (imKreis(dz, dy, 2) && !imKreis(dz, dy, 1)) m.set(x, h + 3 + dy, z + dz, 'yellow_concrete');
        }
      });
    }
    const tribuenen = [[20, 0, 'red_wool'], [42, 0, 'yellow_wool'], [20, 35, 'blue_wool'], [42, 35, 'green_wool']];
    for (const [x0, z0, f] of tribuenen) {
      box(m, x0, 0, z0, x0 + 8, 6, z0 + 3, f);
      box(m, x0, 7, z0, x0 + 8, 7, z0 + 3, 'spruce_planks');
      const innen = z0 === 0 ? z0 + 3 : z0;
      for (let x = x0; x <= x0 + 8; x++) for (let z = z0; z <= z0 + 3; z++) {
        if (z !== innen && (x === x0 || x === x0 + 8 || z === (z0 === 0 ? z0 : z0 + 3))) m.set(x, 8, z, 'spruce_fence');
      }
      m.set(x0, 9, z0 === 0 ? z0 : z0 + 3, 'lantern');
      m.set(x0 + 8, 9, z0 === 0 ? z0 : z0 + 3, 'lantern');
    }
    m.verbindeZaeune();
    return m;
  }


  /* ================================================== Berg & Gelände 500×500 */
  // Weiches 2D-Rauschen (Value-Noise, mehrere Oktaven) im Bereich ca. -1..1
  function rauschen(x, z) {
    const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi;
    const w = (t) => t * t * (3 - 2 * t);
    const v = (a, b) => hash(a, 7, b) * 2 - 1;
    const a = v(xi, zi), b = v(xi + 1, zi), c = v(xi, zi + 1), d = v(xi + 1, zi + 1);
    const u = w(fx), t = w(fz);
    return (a + (b - a) * u) * (1 - t) + (c + (d - c) * u) * t;
  }
  function fbm(x, z) {
    return rauschen(x, z) * 0.55 + rauschen(x * 2.1 + 17, z * 2.1 + 3) * 0.3 + rauschen(x * 4.3 + 5, z * 4.3 + 41) * 0.15;
  }
  function abstandRechteck(x, z, x0, z0, x1, z1, r) {
    const hx = (x1 - x0) / 2 - r, hz = (z1 - z0) / 2 - r;
    const qx = Math.abs(x - (x0 + x1) / 2) - hx, qz = Math.abs(z - (z0 + z1) / 2) - hz;
    return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - r;
  }

  // Lage der Bauwerke im Areal (Ursprung = Nordwest-Ecke unten), Y relativ zum Seespiegel-Grund
  const PLATEAU_Y = 110, SEE_Y = 3, TAL_Y = 5, HUEGEL_Y = PLATEAU_Y + 4, SATTEL_Y = PLATEAU_Y + 4 - 72 - 1;
  const LAGE = {
    berg: [0, 0, 0],
    hauptschloss: [160, PLATEAU_Y + 1, 110],
    bruecke: [245, SATTEL_Y + 1, 261],
    hagrid: [330, TAL_Y + 1, 438],
    gewaechshaeuser: [70, TAL_Y + 1, 230],
    quidditch: [390, TAL_Y + 1, 360]
  };
  const EBENEN = [ // geebnete Bauplätze [x0, z0, x1, z1]
    [330, 438, 352, 454], [70, 230, 100, 244], [390, 360, 460, 398]
  ];
  const WEGE = [
    [[250, 412], [290, 432], [322, 446], [337, 457]],
    [[262, 405], [320, 395], [370, 385], [392, 380]],
    [[238, 405], [205, 360], [160, 300], [110, 252], [86, 246]]
  ];
  const QUELLEN = [[226, 'z'], [274, 'z'], [190, 'x']]; // Wasserfall-Quellen am Plateaurand

  function seeWert(x, z) { return ((x - 125) / 115) ** 2 + ((z - 438) / 66) ** 2; }

  function gelaendeHoehe(x, z) {
    let h;
    const d = abstandRechteck(x, z, 155, 115, 345, 260, 20);
    if (d <= 0) h = PLATEAU_Y;
    else {
      const dn = d * (1 + 0.35 * fbm(x / 40, z / 40));
      const t = Math.max(0, Math.min(1, dn / 130));
      h = PLATEAU_Y - (PLATEAU_Y - 6) * (1 - Math.pow(1 - t, 2.2));
      h += fbm(x / 16, z / 16) * 8 * Math.sin(Math.PI * t);
      if (d < 12) h = Math.min(h, PLATEAU_Y - d * (2.5 + fbm(x / 9, z / 9)));
    }
    h = Math.max(h, TAL_Y + 1 + fbm(x / 60, z / 60) * 3);
    const r = Math.hypot(x - 250, z - 400);
    const huegel = r < 16 ? HUEGEL_Y : HUEGEL_Y - (HUEGEL_Y - 6) * Math.pow(Math.min(1, (r - 16) / 80), 0.7) + fbm(x / 14, z / 14) * 5 * (r < 96 ? 1 : 0);
    h = Math.max(h, huegel);
    const see = seeWert(x, z);
    if (see < 1) h = Math.min(h, SEE_Y - Math.round((1 - see) * 5));
    if (z >= 261 && z <= 383) {
      const dx = Math.abs(x - 250);
      h = Math.min(h, SATTEL_Y + Math.max(0, dx - 6) * 2.5);
      if (dx <= 6) h = SATTEL_Y;
    }
    for (const [x0, z0, x1, z1] of EBENEN) {
      const e = Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1));
      if (e === 0) h = TAL_Y;
      else if (e < 14) h = TAL_Y + (h - TAL_Y) * (e / 14);
    }
    return Math.max(0, Math.round(h));
  }

  function erzeugeBerg() {
    const N = 500, m = new Modell(N, HUEGEL_Y + 16, N);
    const H = new Int16Array(N * N);
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) H[z * N + x] = gelaendeHoehe(x, z);
    const hAt = (x, z) => H[Math.max(0, Math.min(N - 1, z)) * N + Math.max(0, Math.min(N - 1, x))];
    const fels = (x, y, z) => {
      const r = hash(x, y, z);
      return r < 0.5 ? 'stone' : r < 0.7 ? 'andesite' : r < 0.85 ? 'cobblestone' : 'mossy_cobblestone';
    };
    const oben = new Array(N * N);
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
      const h = H[z * N + x];
      const tief = Math.min(h, hAt(x + 1, z), hAt(x - 1, z), hAt(x, z + 1), hAt(x, z - 1));
      const steil = h - tief;
      const see = seeWert(x, z);
      let top;
      if (see < 1 && h < SEE_Y) top = hash(x, 1, z) < 0.6 ? 'sand' : 'gravel';
      else if (see < 1.2 && h <= SEE_Y + 1) top = 'sand';
      else if (steil >= 2) top = fels(x, h, z);
      else if (steil === 1 && hash(x, 4, z) < 0.25) { const r = hash(x, 2, z); top = r < 0.55 ? 'grass_block' : r < 0.8 ? 'coarse_dirt' : 'moss_block'; }
      else top = hash(x, 3, z) < 0.04 ? 'coarse_dirt' : 'grass_block';
      oben[z * N + x] = top;
      const boden = h <= 12 ? 0 : Math.max(0, tief - 3);
      for (let y = boden; y < h; y++) {
        const erdig = top === 'grass_block' || top === 'coarse_dirt' || top === 'moss_block';
        m.set(x, y, z, erdig && y >= h - 2 ? 'dirt' : top === 'sand' && y >= h - 2 ? 'sand' : fels(x, y, z));
      }
      m.set(x, h, z, top);
      if (see < 1) for (let y = h + 1; y <= SEE_Y; y++) m.set(x, y, z, 'water');
    }
    // Wege
    const wegZelle = new Uint8Array(N * N);
    for (const weg of WEGE) for (let i = 0; i < weg.length - 1; i++) {
      const [ax, az] = weg[i], [bx, bz] = weg[i + 1];
      const n = Math.ceil(Math.hypot(bx - ax, bz - az));
      for (let k = 0; k <= n; k++) {
        const px = Math.round(ax + (bx - ax) * k / n), pz = Math.round(az + (bz - az) * k / n);
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
          const x = px + dx, z = pz + dz;
          if (x < 0 || z < 0 || x >= N || z >= N) continue;
          wegZelle[z * N + x] = 1;
          const t = oben[z * N + x];
          if (t === 'grass_block' || t === 'coarse_dirt' || t === 'moss_block') { m.set(x, H[z * N + x], z, 'dirt_path'); oben[z * N + x] = 'dirt_path'; }
        }
      }
    }
    // Wasserfall-Quellen am Plateaurand (fließen im Spiel die Klippe hinab)
    for (const [k, achse] of QUELLEN) {
      if (achse === 'z') {
        for (let z = 250; z < 300; z++) if (hAt(k, z) < PLATEAU_Y) { m.set(k, PLATEAU_Y, z - 1, 'water'); m.set(k, PLATEAU_Y - 1, z - 1, 'stone'); break; }
      } else {
        for (let x = 165; x > 100; x--) if (hAt(x, k) < PLATEAU_Y) { m.set(x + 1, PLATEAU_Y, k, 'water'); m.set(x + 1, PLATEAU_Y - 1, k, 'stone'); break; }
      }
    }
    // Wälder
    const gesperrt = (x, z) => {
      if (abstandRechteck(x, z, 155, 115, 345, 260, 20) < 5) return true;
      if (Math.abs(x - 250) < 16 && z > 255 && z < 392) return true;
      if (Math.hypot(x - 250, z - 400) < 22) return true;
      if (seeWert(x, z) < 1.25) return true;
      for (const [x0, z0, x1, z1] of EBENEN) if (x > x0 - 6 && x < x1 + 6 && z > z0 - 6 && z < z1 + 6) return true;
      return false;
    };
    const blatt = (x, y, z, k) => { if (m.get(x, y, z) === 'air') m.set(x, y, z, k); };
    for (let gz = 0; gz < N / 6; gz++) for (let gx = 0; gx < N / 6; gx++) {
      const x = gx * 6 + Math.floor(hash(gx, 11, gz) * 5), z = gz * 6 + Math.floor(hash(gx, 12, gz) * 5);
      if (x < 3 || z < 3 || x > N - 4 || z > N - 4) continue;
      if (fbm(x / 70 + 9, z / 70) < -0.15 && hash(gx, 13, gz) < 0.75) continue;
      if (hash(gx, 14, gz) < 0.25 || gesperrt(x, z) || wegZelle[z * N + x]) continue;
      const t = oben[z * N + x];
      if (t !== 'grass_block' && t !== 'coarse_dirt' && t !== 'moss_block') continue;
      const h = H[z * N + x];
      if (hash(gx, 15, gz) < 0.65) {
        const hoch = 7 + Math.floor(hash(gx, 16, gz) * 5), spitze = h + hoch;
        for (let y = h + 1; y <= spitze; y++) m.set(x, y, z, 'spruce_log');
        blatt(x, spitze + 1, z, 'spruce_leaves');
        for (let y = h + 3; y <= spitze; y++) {
          const ab = spitze - y;
          let r = Math.min(3, 1 + Math.floor(ab / 2.5));
          if (ab % 2 === 1 && r > 1) r--;
          for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
            if ((dx || dz) && dx * dx + dz * dz <= r * r + 1) blatt(x + dx, y, z + dz, 'spruce_leaves');
          }
        }
      } else {
        const hoch = 4 + Math.floor(hash(gx, 17, gz) * 3), k = h + hoch;
        for (let dy = -2; dy <= 2; dy++) for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
          if (dx * dx + dy * dy * 1.6 + dz * dz <= 8 + hash(x + dx, k + dy, z + dz) * 3) blatt(x + dx, k + dy, z + dz, 'oak_leaves');
        }
        for (let y = h + 1; y <= k; y++) m.set(x, y, z, 'oak_log');
      }
    }
    // Blumen und Farne
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
      if (oben[z * N + x] !== 'grass_block' || gesperrt(x, z)) continue;
      const h = H[z * N + x], r = hash(x, 21, z);
      if (r > 0.045 || m.get(x, h + 1, z) !== 'air') continue;
      m.set(x, h + 1, z, r < 0.012 ? 'poppy' : r < 0.022 ? 'dandelion' : r < 0.03 ? 'cornflower' : 'fern');
    }
    return m;
  }

  const BAUWERKE = [
    { id: 'hauptschloss', titel: 'Hauptschloss', datei: 'hogwarts-hauptschloss.litematic', erstelle: erzeugeHauptschloss,
      text: 'Große Halle, Innenhof mit Kreuzgang, West- und Ostflügel, Bibliothek, 15 Türme und Torbau.' },
    { id: 'bruecke', titel: 'Viadukt (Brücke)', datei: 'hogwarts-bruecke.litematic', erstelle: erzeugeBruecke,
      text: 'Zweistöckiges Viadukt mit 10 Bogenfeldern, 123 Blöcke lang und 76 hoch. Verbindet den Torbau mit dem Südhügel.' },
    { id: 'hagrid', titel: 'Hagrids Hütte', datei: 'hogwarts-hagrids-huette.litematic', erstelle: erzeugeHagrid,
      text: 'Runde Steinhütte mit Kegeldach, rauchendem Kamin und Kürbisbeet.' },
    { id: 'gewaechshaeuser', titel: 'Gewächshäuser', datei: 'hogwarts-gewaechshaeuser.litematic', erstelle: erzeugeGewaechshaeuser,
      text: 'Drei Glashäuser mit Fichtenholzrahmen, Pflanzbeeten und Laternen.' },
    { id: 'quidditch', titel: 'Quidditch-Feld', datei: 'hogwarts-quidditch.litematic', erstelle: erzeugeQuidditch,
      text: 'Ovales Spielfeld mit je drei Torringen und vier Tribünen in den Hausfarben.' },
    { id: 'berg', titel: 'Berg & Gelände', datei: 'hogwarts-berg.litematic', erstelle: erzeugeBerg,
      text: '500 × 500 Blöcke: Gipfelplateau, Klippen, Schlucht, Südhügel, See mit Strand, Wälder, Wege und Wasserfall-Quellen.' }
  ];
  for (const b of BAUWERKE) b.lage = LAGE[b.id];

  // Berg in zwei deckungsgleiche Teile zerlegen: erst Gelände formen, dann Wald setzen
  const VEGETATION = new Set(['spruce_log', 'oak_log', 'spruce_leaves', 'oak_leaves', 'poppy', 'dandelion', 'cornflower', 'fern']);
  function bergTeil(wald, berg) {
    const quelle = berg || erzeugeBerg();
    const m = new Modell(quelle.sx, quelle.sy, quelle.sz);
    const abb = quelle.keys.map((k) => (k !== 'air' && VEGETATION.has(k) === wald ? m.id(k) : 0));
    for (let i = 0; i < quelle.daten.length; i++) m.daten[i] = abb[quelle.daten[i]];
    return m;
  }
  const TEILE = [
    { id: 'gelaende', titel: 'Berg – nur Gelände', datei: 'hogwarts-berg-gelaende.litematic', lage: [0, 0, 0],
      erstelle: (berg) => bergTeil(false, berg),
      text: 'Berg ohne Bäume und Blumen: Fels, Erde, Gras, See, Strand, Wege und Wasserfall-Quellen. Zuerst bauen.' },
    { id: 'wald', titel: 'Berg – nur Wald', datei: 'hogwarts-berg-wald.litematic', lage: [0, 0, 0],
      erstelle: (berg) => bergTeil(true, berg),
      text: '1.427 Fichten, 700 Eichen, Blumen und Farne – gleicher Ursprung wie das Gelände, passt exakt darauf.' }
  ];

  // Alle Bauwerke an ihrer Lage zu einem Gesamtmodell zusammensetzen (für Vorschau)
  function erzeugeGesamt(bereich) {
    const [bx0, bz0, bx1, bz1] = bereich || [0, 0, 499, 499];
    const g = new Modell(bx1 - bx0 + 1, PLATEAU_Y + 1 + 100, bz1 - bz0 + 1);
    g.teile = [];
    for (const b of ['berg', 'hauptschloss', 'bruecke', 'hagrid', 'gewaechshaeuser', 'quidditch'].map((id) => BAUWERKE.find((e) => e.id === id))) {
      const m = b.erstelle(), [ox, oy, oz] = b.lage;
      g.teile.push({ id: b.id, titel: b.titel, lage: [ox - bx0, oy, oz - bz0], groesse: [m.sx, m.sy, m.sz] });
      const abb = m.keys.map((k) => g.id(k));
      for (let y = 0; y < m.sy; y++) for (let z = 0; z < m.sz; z++) {
        const gz = z + oz - bz0, gy = y + oy;
        if (gz < 0 || gz >= g.sz || gy >= g.sy) continue;
        for (let x = 0; x < m.sx; x++) {
          const v = m.daten[(y * m.sz + z) * m.sx + x];
          const gx = x + ox - bx0;
          if (!v || gx < 0 || gx >= g.sx) continue;
          g.daten[(gy * g.sz + gz) * g.sx + gx] = abb[v];
        }
      }
    }
    return g;
  }

  return { BLOECKE, block, Modell, BAUWERKE, TEILE, erzeugeGesamt, gelaendeHoehe, PLATEAU_Y };
});
