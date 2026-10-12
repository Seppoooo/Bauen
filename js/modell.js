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
  // Stämme: Schlüssel "<holz>_log" (senkrecht) sowie "<holz>_log_x" / "<holz>_log_z" (liegend, für Äste und Wurzeln)
  for (const [holz, name, farbe] of [['spruce', 'Fichtenstamm', '#3d2b1a'], ['oak', 'Eichenstamm', '#6b5434'],
    ['birch', 'Birkenstamm', '#d8d4c8'], ['dark_oak', 'Schwarzeichenstamm', '#3b2a17']]) {
    def(holz + '_log', 'minecraft:' + holz + '_log', name, farbe, { props: { axis: 'y' } });
    def(holz + '_log_x', 'minecraft:' + holz + '_log', name, farbe, { props: { axis: 'x' } });
    def(holz + '_log_z', 'minecraft:' + holz + '_log', name, farbe, { props: { axis: 'z' } });
  }
  for (const [id, name, farbe] of [['birch_leaves', 'Birkenlaub', '#6f9a42'], ['dark_oak_leaves', 'Schwarzeichenlaub', '#2f5a1f'],
    ['azalea_leaves', 'Azaleenlaub', '#5b7f2c']]) {
    def(id, 'minecraft:' + id, name, farbe, { props: { distance: '1', persistent: 'true', waterlogged: 'false' } });
  }
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
  // Innenausstattung und Garten
  def('dark_oak_slab_top', 'minecraft:dark_oak_slab', 'Schwarzeichenholzstufe', '#4a3220', { form: 'stufe', deckend: false, props: { type: 'top', ...WL } });
  def('spruce_slab_top', 'minecraft:spruce_slab', 'Fichtenholzstufe', '#6e5131', { form: 'stufe', deckend: false, props: { type: 'top', ...WL } });
  def('candle3', 'minecraft:candle', 'Kerze', '#efe3c2', { form: 'klein', deckend: false, props: { candles: '3', lit: 'true', ...WL } });
  for (const r of ['n', 's', 'e', 'w']) {
    def('lectern_' + r, 'minecraft:lectern', 'Lesepult', '#8a6a3e', { form: 'pult', deckend: false,
      props: { facing: { n: 'north', s: 'south', e: 'east', w: 'west' }[r], has_book: 'false', powered: 'false' } });
  }
  for (const [f, name, farbe] of [['red', 'Rot', '#a12722'], ['blue', 'Blau', '#35399d'], ['green', 'Grün', '#546d1b'], ['yellow', 'Gelb', '#e8b42e']]) {
    def(f + '_carpet', 'minecraft:' + f + '_carpet', 'Teppich ' + name, farbe, { form: 'teppich', deckend: false });
  }
  for (const [f, name, farbe] of [['red', 'Rote', '#b02e26'], ['yellow', 'Gelbe', '#f9d849'], ['blue', 'Blaue', '#3c44aa'],
    ['green', 'Grüne', '#5e7c16'], ['white', 'Weiße', '#e8eef0'], ['orange', 'Orange', '#f08a1d']]) {
    def('sg_' + f + '_ns', 'minecraft:' + f + '_stained_glass_pane', name + ' Buntglasscheibe', farbe,
      { form: 'scheibe_ns', deckend: false, props: { east: 'false', north: 'true', south: 'true', west: 'false', ...WL } });
    def('sg_' + f + '_ew', 'minecraft:' + f + '_stained_glass_pane', name + ' Buntglasscheibe', farbe,
      { form: 'scheibe_ew', deckend: false, props: { east: 'true', north: 'false', south: 'false', west: 'true', ...WL } });
  }
  def('chiseled_stone_bricks', 'minecraft:chiseled_stone_bricks', 'Gemeißelte Steinziegel', '#7a7a7a');
  def('deepslate_bricks', 'minecraft:deepslate_bricks', 'Tiefenschieferziegel', '#46464c');
  def('stone_brick_wall', 'minecraft:stone_brick_wall', 'Steinziegelmauer', '#7e7e7e',
    { form: 'pfosten', deckend: false, props: { east: 'none', north: 'none', south: 'none', up: 'true', west: 'none', ...WL } });
  def('allium', 'minecraft:allium', 'Sternlauch', '#b46ad6', { form: 'klein', deckend: false });
  def('azure_bluet', 'minecraft:azure_bluet', 'Porzellansternchen', '#d6e4f0', { form: 'klein', deckend: false });
  def('oxeye_daisy', 'minecraft:oxeye_daisy', 'Margerite', '#f2f2e6', { form: 'klein', deckend: false });
  def('lily_pad', 'minecraft:lily_pad', 'Seerosenblatt', '#2f7a2a', { form: 'teppich', deckend: false });
  def('sugar_cane', 'minecraft:sugar_cane', 'Zuckerrohr', '#8cc068', { form: 'klein', deckend: false, props: { age: '0' } });
  def('birch_planks', 'minecraft:birch_planks', 'Birkenholzbretter', '#c5b37b');
  def('barrel', 'minecraft:barrel', 'Fass', '#7d5a33', { props: { facing: 'up', open: 'false' } });
  def('red_concrete', 'minecraft:red_concrete', 'Roter Beton', '#8e2121');
  def('glowstone', 'minecraft:glowstone', 'Leuchtstein', '#f9d49c');
  def('hay_block', 'minecraft:hay_block', 'Heuballen', '#c8a833', { props: { axis: 'y' } });
  for (const r of ['n', 's', 'e', 'w']) for (const [h, hk] of [['l', 'lower'], ['u', 'upper']]) {
    def('door_' + r + '_' + h, 'minecraft:spruce_door', 'Fichtenholztür', '#6e5131', { form: 'scheibe_' + (r === 'n' || r === 's' ? 'ew' : 'ns'), deckend: false,
      props: { facing: { n: 'north', s: 'south', e: 'east', w: 'west' }[r], half: hk, hinge: 'left', open: 'false', powered: 'false' } });
  }
  // Gelände
  def('stone', 'minecraft:stone', 'Stein', '#7a7a7a');
  def('andesite', 'minecraft:andesite', 'Andesit', '#88898a');
  def('dirt', 'minecraft:dirt', 'Erde', '#866043');
  def('sand', 'minecraft:sand', 'Sand', '#dbcf9c');
  def('gravel', 'minecraft:gravel', 'Kies', '#857f7c');
  def('clay', 'minecraft:clay', 'Ton', '#a1a6b3');
  def('dirt_path', 'minecraft:dirt_path', 'Trampelpfad', '#94793f', { form: 'voll' });
  def('spruce_leaves', 'minecraft:spruce_leaves', 'Fichtenlaub', '#2f4c30',
    { props: { distance: '1', persistent: 'true', ...WL } });
  def('poppy', 'minecraft:poppy', 'Mohn', '#c8221b', { form: 'klein', deckend: false });
  def('dandelion', 'minecraft:dandelion', 'Löwenzahn', '#e8d23a', { form: 'klein', deckend: false });
  def('cornflower', 'minecraft:cornflower', 'Kornblume', '#4a6fd8', { form: 'klein', deckend: false });
  def('fern', 'minecraft:fern', 'Farn', '#4e7a35', { form: 'klein', deckend: false });

  // Treppen: Schlüssel <präfix>_<n|s|e|w>, "facing" = Richtung der hohen Seite
  const RICHTUNG = { n: 'north', s: 'south', e: 'east', w: 'west' };
  function treppen(praefix, id, mat, farbe, half) {
    for (const r of Object.keys(RICHTUNG)) {
      def(praefix + '_' + r, id, mat, farbe, {
        form: 'treppe', deckend: false,
        props: { facing: RICHTUNG[r], half: half || 'bottom', shape: 'straight', ...WL }
      });
    }
  }
  treppen('dts', 'minecraft:deepslate_tile_stairs', 'Tiefenschieferfliesentreppe', '#38383e');
  treppen('sps', 'minecraft:spruce_stairs', 'Fichtenholztreppe', '#6e5131');
  // Steinziegeltreppen für Fassadendetails: sbs = normal, sbt = kopfüber (half=top)
  treppen('sbs', 'minecraft:stone_brick_stairs', 'Steinziegeltreppe', '#7e7e7e');
  treppen('sbt', 'minecraft:stone_brick_stairs', 'Steinziegeltreppe', '#7e7e7e', 'top');
  treppen('dbs', 'minecraft:deepslate_brick_stairs', 'Tiefenschieferziegeltreppe', '#46464c');
  def('stone_brick_slab_top', 'minecraft:stone_brick_slab', 'Steinziegelstufe', '#7e7e7e',
    { form: 'stufe', deckend: false, props: { type: 'top', ...WL } });
  def('cobblestone_wall', 'minecraft:cobblestone_wall', 'Bruchsteinmauer', '#6b6b6b',
    { form: 'pfosten', deckend: false, props: { east: 'none', north: 'none', south: 'none', up: 'true', west: 'none', ...WL } });

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
      if (bn === bs) {
        for (let a = a0 - 1; a <= a1 + 1; a++) { S(a, y, bn, 'deepslate_tiles'); S(a, y + 1, bn, 'deepslate_tile_slab'); }
        break;
      }
      for (let a = a0 - 1; a <= a1 + 1; a++) {
        const v = (k2) => (hash(a, y, bn) < 0.14 ? 'dbs' + k2.slice(3) : k2);
        S(a, y, bn, v(hoch)); S(a, y, bs, hash(a, y + 7, bs) < 0.14 ? 'dbs' + runter.slice(3) : runter);
      }
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
    // Klassenzimmer: Pulte mit Stühlen, Teppich im Mittelgang, Lesepult, Bücherregale
    if (!halle && o.trennAb !== undefined) {
      const G = (l, y, q) => (langX ? m.get(l, y, q) : m.get(q, y, l));
      const frei = (l, y, q, k) => { if (G(l, y, q) === 'air') L(l, y, q, k); };
      const grenzen = [lStart];
      for (let l = lStart + 12; l < lEnde - 6; l += 12) grenzen.push(l);
      grenzen.push(lEnde);
      const stuhl = langX ? 'sps_e' : 'sps_s', pult = langX ? 'lectern_e' : 'lectern_s';
      const teppiche = ['red_carpet', 'blue_carpet', 'green_carpet', 'yellow_carpet'];
      boeden.forEach((fy, i) => {
        if (i < o.trennAb) return;
        for (let j = 1; j < grenzen.length - 1; j++) {
          const p0 = grenzen[j], p1 = grenzen[j + 1];
          if (p1 - p0 < 8) continue;
          for (let l = p0 + 1; l < p1; l++) for (let q = qMitte - 1; q <= qMitte + 1; q++) frei(l, fy + 1, q, teppiche[(j + i) % 4]);
          for (let l = p0 + 4; l <= p1 - 3; l += 3) {
            for (let q = qStart + 2; q < qEnde - 1; q += 2) {
              if (Math.abs(q - qMitte) < 3) continue;
              frei(l, fy + 1, q, 'spruce_slab_top'); frei(l + 1, fy + 1, q, stuhl);
              if (hash(l, fy, q) < 0.25 && G(l, fy + 2, q) === 'air') L(l, fy + 2, q, 'candle3');
            }
          }
          frei(p0 + 2, fy + 1, qMitte + 2, pult);
          for (let q = qStart + 1; q < qEnde; q++) {
            if (Math.abs(q - qMitte) <= 1) continue;
            for (let y = fy + 1; y <= fy + 3; y++) frei(p1 - 1, y, q, 'bookshelf');
          }
        }
      });
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
    if (!halle && etagen >= 2 && Math.min(x1 - x0, z1 - z0) >= 14) gauben(m, x0, z0, x1, z1, yt, achse);
    // Schornsteine mit Rauch
    if (!halle && Math.min(x1 - x0, z1 - z0) >= 14) {
      const spitze = yt + Math.ceil((qEnde - qStart) / 2) + 3;
      for (let l = lStart + 13; l <= lEnde - 6; l += 24) {
        for (let y = yt + 1; y <= spitze; y++) for (const dq of [0, 1]) L(l, y, qStart + 4 + dq, y === spitze ? 'chiseled_stone_bricks' : mauer);
        L(l, spitze + 1, qStart + 4, 'campfire');
        L(l, spitze + 1, qStart + 5, 'stone_brick_slab');
      }
    }
    return yt;
  }

  /* Dachgauben: kleine Giebel mit Fenster auf beiden Dachseiten, alle 12 Blöcke */
  function gauben(m, x0, z0, x1, z1, yt, achse) {
    const lx = achse === 'x';
    const a0 = lx ? x0 : z0, a1 = lx ? x1 : z1, b0 = lx ? z0 : x0, b1 = lx ? z1 : x1;
    const S = (a, y, b, k) => (lx ? m.set(a, y, b, k) : m.set(b, y, a, k));
    const plus = lx ? 'e' : 's', minus = lx ? 'w' : 'n';
    const scheibe = lx ? 'pane_ew' : 'pane_ns';
    for (let l = a0 + 7; l <= a1 - 6; l += 12) {
      for (const [bw, sb] of [[b0, 1], [b1, -1]]) {
        for (let t = 0; t <= 3; t++) {
          const b = bw + sb * t;
          for (let y = yt + 1; y <= yt + 3; y++) {
            S(l - 1, y, b, mauer); S(l + 1, y, b, mauer);
            S(l, y, b, t === 0 ? (y <= yt + 2 ? scheibe : mauer) : 'air');
          }
          S(l - 2, yt + 4, b, 'dts_' + plus); S(l + 2, yt + 4, b, 'dts_' + minus);
          S(l - 1, yt + 4, b, 'dts_' + plus); S(l + 1, yt + 4, b, 'dts_' + minus);
          S(l, yt + 4, b, 'deepslate_tiles'); S(l, yt + 5, b, 'deepslate_tile_slab');
        }
        S(l, yt, bw - sb, 'stone_brick_slab_top');
      }
    }
  }

  /* Fassadenrelief: Sockel, Pilaster, Fensterbänke und -bögen, Traufgesims – eine Blockschicht vor der Mauer */
  function fassade(m, o, alle) {
    const { x0, z0, x1, z1 } = o;
    const y0 = 4, halle = !!o.halle, etagen = o.etagen || 1;
    const yt = halle ? y0 + o.hoehe : y0 + 6 * etagen;
    const inRechteck = (x, z) => alle.some((r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1);
    const seiten = [
      { feste: z0, achse: 'x', von: x0, bis: x1, d: [0, -1], zurWand: 's' },
      { feste: z1, achse: 'x', von: x0, bis: x1, d: [0, 1], zurWand: 'n' },
      { feste: x0, achse: 'z', von: z0, bis: z1, d: [-1, 0], zurWand: 'e' },
      { feste: x1, achse: 'z', von: z0, bis: z1, d: [1, 0], zurWand: 'w' }
    ];
    for (const sd of seiten) {
      const entlangPlus = sd.achse === 'x' ? 'e' : 's', entlangMinus = sd.achse === 'x' ? 'w' : 'n';
      const zelle = (a, tiefe) => sd.achse === 'x' ? [a, sd.feste + sd.d[1] * tiefe] : [sd.feste + sd.d[0] * tiefe, a];
      const setze = (a, y, tiefe, k) => {
        const [x, z] = zelle(a, tiefe);
        if (inRechteck(x, z) || m.get(x, y, z) !== 'air') return;
        m.set(x, y, z, k);
      };
      const wand = (a, y) => { const [x, z] = zelle(a, 0); return m.get(x, y, z); };
      for (let a = sd.von; a <= sd.bis; a++) {
        const p = a - sd.von;
        const ecke = a === sd.von || a === sd.bis;
        // Vor Türen und Toren im Erdgeschoss bleibt der Weg frei
        if ([a - 1, a, a + 1].some((b) => wand(b, y0 + 1) === 'air' && wand(b, y0 + 2) === 'air')) {
          setze(a, yt, 1, 'sbt_' + sd.zurWand);
          continue;
        }
        // Schräger Sockel
        setze(a, y0, 1, mauer);
        // Pilaster bzw. Strebepfeiler
        const pilaster = halle ? p % 8 === 0 : p % 4 === 0;
        if (pilaster || ecke) {
          const hoch = halle ? yt - 9 : yt - 1;
          for (let y = y0 + 1; y <= hoch; y++) setze(a, y, 1, mauer);
          if (halle && !ecke) {
            // gestufter Strebepfeiler mit Fiale
            for (let y = y0; y <= yt - 9; y++) setze(a, y, 2, mauer);
            setze(a, yt - 8, 2, 'sbs_' + sd.zurWand);
            for (let y = yt - 8; y <= yt - 1; y++) setze(a, y, 1, mauer);
            for (let y = yt - 7; y <= yt + 2; y++) setze(a, y, 2, y <= yt ? mauer : 'cobblestone_wall');
            setze(a, yt + 3, 2, 'lightning_rod');
          }
        } else {
          setze(a, y0 + 1, 1, 'sbs_' + sd.zurWand);
        }
        // Fenster: Bank darunter, Spitzbogen darüber
        if (halle) {
          const q = p % 8;
          if (q === 3 || q === 4) setze(a, y0 + 3, 1, 'stone_brick_slab_top');
          if (q === 2) { setze(a, yt - 6, 1, 'sbt_' + entlangPlus); }
          if (q === 5) { setze(a, yt - 6, 1, 'sbt_' + entlangMinus); }
          if (q === 3) { setze(a, yt - 6, 1, mauer); setze(a, yt - 5, 1, 'sbt_' + entlangPlus); }
          if (q === 4) { setze(a, yt - 6, 1, mauer); setze(a, yt - 5, 1, 'sbt_' + entlangMinus); }
        } else if (!ecke) {
          for (let k = 0; k < etagen; k++) {
            const fy = y0 + 6 * k;
            if (p % 4 === 2) { setze(a, fy + 1, 1, 'stone_brick_slab_top'); setze(a, fy + 5, 1, 'stone_brick_slab_top'); }
            if (p % 4 === 1) setze(a, fy + 5, 1, 'sbt_' + entlangPlus);
            if (p % 4 === 3) setze(a, fy + 5, 1, 'sbt_' + entlangMinus);
          }
        }
        // Traufgesims unter dem Dach
        setze(a, yt, 1, 'sbt_' + sd.zurWand);
      }
    }
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
    // Lisenen an den vier Diagonalen und Kragsteine unter dem Dachrand
    const dg = Math.round((r + 1) / Math.SQRT2);
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      for (let y = y0 + 1; y < top - 1; y++) if (m.get(cx + sx * dg, y, cz + sz * dg) === 'air') m.set(cx + sx * dg, y, cz + sz * dg, mauer);
    }
    for (let dz = -r - 1; dz <= r + 1; dz++) for (let dx = -r - 1; dx <= r + 1; dx++) {
      if (!imKreis(dx, dz, r + 1) || imKreis(dx, dz, r)) continue;
      const rr = Math.abs(dx) >= Math.abs(dz) ? (dx > 0 ? 'w' : 'e') : (dz > 0 ? 'n' : 's');
      if (m.get(cx + dx, top - 1, cz + dz) === 'air') m.set(cx + dx, top - 1, cz + dz, 'sbt_' + rr);
    }
    // Fensterbänke und -stürze vor den Turmfenstern
    for (const fy of boeden.slice(0, -1)) for (const [ux, uz] of [[1, 0], [-1, 0], [0, 1]]) {
      const ax = cx + ux * (r + 1), az = cz + uz * (r + 1);
      if (!m.get(cx + ux * r, fy + 2, cz + uz * r).startsWith('pane')) continue;
      if (m.get(ax, fy + 1, az) === 'air') m.set(ax, fy + 1, az, 'stone_brick_slab_top');
      if (m.get(ax, fy + 5, az) === 'air') m.set(ax, fy + 5, az, 'stone_brick_slab_top');
    }
    // Wehrgang mit Zinnen an großen Türmen
    if (r >= 7) {
      const wy = top - 14;
      for (let dz = -r - 3; dz <= r + 3; dz++) for (let dx = -r - 3; dx <= r + 3; dx++) {
        const aussen = imKreis(dx, dz, r + 2), turm = imKreis(dx, dz, r);
        if (!aussen || turm) continue;
        const rr = Math.abs(dx) >= Math.abs(dz) ? (dx > 0 ? 'w' : 'e') : (dz > 0 ? 'n' : 's');
        m.set(cx + dx, wy - 1, cz + dz, 'sbt_' + rr);
        m.set(cx + dx, wy, cz + dz, 'stone_bricks');
        if (!imKreis(dx, dz, r + 1)) {
          m.set(cx + dx, wy + 1, cz + dz, mauer);
          if ((dx + dz) % 2 === 0) m.set(cx + dx, wy + 2, cz + dz, mauer);
        }
      }
      for (const [ux, uz] of [[1, 0], [-1, 0], [0, 1]]) for (let y = wy + 1; y <= wy + 3; y++) m.set(cx + ux * r, y, cz + uz * r, 'air');
      for (const [ux, uz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) m.set(cx + ux * (r - 1), wy + 3, cz + uz * (r - 1), 'lantern_h');
    }
    const R = r + 1, H = Math.round(R * 2.6) + 2;
    const spitze = kegel(m, cx, cz, R, top + 1, H, 'deepslate_tiles', 'dts');
    m.set(cx, spitze, cz, 'lightning_rod');
  }


  /* Schlossterrasse: Stützmauer mit Zinnen, Rundweg, Ziergärten mit Hecken, Statuen, Brunnen und Bäumen */
  function schlossgarten(m) {
    const rand = (x, z) => abstandRechteck(x, z, 2, 8, 178, 148, 12);
    const blumen = ['poppy', 'allium', 'azure_bluet', 'oxeye_daisy', 'cornflower', 'dandelion'];
    for (let z = 0; z < m.sz; z++) for (let x = 0; x < m.sx; x++) {
      const d = rand(x, z);
      if (d > 0) continue;
      if (d > -1.5) {
        for (let y = 0; y <= 3; y++) if (m.get(x, y, z) === 'air') m.set(x, y, z, mauer);
        if (m.get(x, 4, z) === 'air') {
          m.set(x, 4, z, (x + z) % 2 ? 'stone_bricks' : 'stone_brick_slab');
          if ((x + z) % 2 && hash(x, 9, z) < 0.07) m.set(x, 5, z, 'lantern');
        }
        continue;
      }
      if (m.get(x, 3, z) !== 'air') continue;
      m.set(x, 2, z, 'dirt');
      m.set(x, 3, z, d > -6.5 && d <= -3.5 ? 'gravel' : 'grass_block');
      if (d > -7.5 && d <= -6.5 && (x + z) % 14 === 0) {
        m.set(x, 4, z, 'stone_brick_wall'); m.set(x, 5, z, 'stone_brick_wall'); m.set(x, 6, z, 'lantern');
      } else if (d > -3.5 && d <= -2.5 && hash(x, 4, z) < 0.35) {
        m.set(x, 4, z, blumen[Math.floor(hash(x, 5, z) * blumen.length)]);
      }
    }
    // Ziergärten auf freien Flächen (13×13-Raster)
    const frei = (x0, z0, x1, z1) => {
      for (let z = z0 - 2; z <= z1 + 2; z++) for (let x = x0 - 2; x <= x1 + 2; x++) {
        if (rand(x, z) > -8) return false;
        if (m.get(x, 3, z) !== 'grass_block') return false;
        for (let y = 4; y <= 9; y++) if (m.get(x, y, z) !== 'air') return false;
      }
      return true;
    };
    for (let tz = 10; tz + 10 < m.sz; tz += 13) for (let tx = 4; tx + 10 < m.sx; tx += 13) {
      if (!frei(tx, tz, tx + 10, tz + 10)) continue;
      const cx = tx + 5, cz = tz + 5, typ = hash(tx, 1, tz);
      if (typ < 0.5) {
        // Parterre: Hecke mit Durchgängen, Kiesweg-Kreuz, vier Blumenbeete, Statue
        for (let z = tz; z <= tz + 10; z++) for (let x = tx; x <= tx + 10; x++) {
          const randZ = x === tx || x === tx + 10 || z === tz || z === tz + 10;
          const kreuz = Math.abs(x - cx) <= 1 || Math.abs(z - cz) <= 1;
          if (kreuz) { m.set(x, 3, z, 'gravel'); continue; }
          if (randZ) m.set(x, 4, z, 'oak_leaves');
          else if (hash(x, 6, z) < 0.75) m.set(x, 4, z, blumen[Math.floor(hash(x, 7, z) * blumen.length)]);
        }
        m.set(cx, 4, cz, 'chiseled_stone_bricks'); m.set(cx, 5, cz, 'stone_bricks'); m.set(cx, 6, cz, 'stone_brick_wall');
        m.set(cx, 7, cz, hash(tx, 2, tz) < 0.5 ? 'lantern' : 'chiseled_stone_bricks');
      } else if (typ < 0.8) {
        // Baum mit Blumenkranz und vier Bänken
        const b = baumBauer(m, 5000 + tx * 7 + tz);
        hash(tx, 3, tz) < 0.6 ? b.eiche(cx, 3, cz) : b.birke(cx, 3, cz);
        for (let z = tz; z <= tz + 10; z++) for (let x = tx; x <= tx + 10; x++) {
          const d = Math.hypot(x - cx, z - cz);
          if (d > 2.5 && d < 3.6 && m.get(x, 4, z) === 'air') m.set(x, 4, z, blumen[Math.floor(hash(x, 8, z) * blumen.length)]);
          if (d >= 3.6 && d < 4.6) m.set(x, 3, z, 'gravel');
        }
        for (const [x, z, f] of [[cx + 5, cz, 'sps_e'], [cx - 5, cz, 'sps_w'], [cx, cz + 5, 'sps_s'], [cx, cz - 5, 'sps_n']]) if (m.get(x, 4, z) === 'air') m.set(x, 4, z, f);
      } else {
        // Brunnen
        for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) {
          if (!imKreis(dx, dz, 4)) continue;
          const innen = imKreis(dx, dz, 3);
          m.set(cx + dx, 3, cz + dz, 'stone_bricks');
          m.set(cx + dx, 4, cz + dz, innen ? 'water' : 'stone_bricks');
        }
        for (let y = 4; y <= 5; y++) m.set(cx, y, cz, 'polished_andesite');
        m.set(cx, 6, cz, 'chiseled_stone_bricks'); m.set(cx, 7, cz, 'lantern');
        for (let z = tz; z <= tz + 10; z++) for (let x = tx; x <= tx + 10; x++) {
          const d = Math.hypot(x - cx, z - cz);
          if (d > 4.6 && d < 5.8) m.set(x, 3, z, 'gravel');
        }
      }
    }
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
    const TRAKTE = [
      { x0: 58, z0: 120, x1: 122, z1: 136, etagen: 2, trennAb: 0 },          // Südflügel / Eingang
      { x0: 86, z0: 28, x1: 94, z1: 38, etagen: 2, achse: 'z' },             // Verbindung Hauptturm
      { x0: 58, z0: 38, x1: 122, z1: 70, halle: true, hoehe: 25 },           // Große Halle
      { x0: 40, z0: 70, x1: 68, z1: 128, etagen: 3, trennAb: 1 },            // Westflügel (Bibliothek)
      { x0: 112, z0: 70, x1: 140, z1: 128, etagen: 3, trennAb: 0 },          // Ostflügel
      { x0: 10, z0: 56, x1: 40, z1: 100, etagen: 2, trennAb: 0 },            // Westanbau
      { x0: 140, z0: 46, x1: 170, z1: 96, etagen: 2, trennAb: 0 }            // Ostanbau
    ];
    for (const t of TRAKTE) fluegel(m, t);

    // Große Halle: Haustische mit Bänken und Kerzen, Teppich, Lehrertribüne, Pfeiler, Balkendecke, Kamin, Buntglas
    for (let x = 60; x <= 111; x++) for (let z = 53; z <= 55; z++) m.set(x, 5, z, 'red_carpet');
    for (const z of [45, 51, 57, 63]) {
      for (let x = 66; x <= 108; x++) {
        m.set(x, 5, z, 'dark_oak_slab_top');
        m.set(x, 5, z - 1, 'sps_n'); m.set(x, 5, z + 1, 'sps_s');
        if (x % 4 === 0) m.set(x, 6, z, 'candle3');
      }
    }
    box(m, 112, 5, 41, 120, 5, 67, 'dark_oak_planks');                 // Tribüne
    for (let z = 41; z <= 67; z++) m.set(111, 5, z, 'sps_e');           // Stufe
    for (let z = 44; z <= 64; z++) { m.set(115, 6, z, 'dark_oak_slab_top'); m.set(116, 6, z, 'sps_e'); if (z % 3 === 0) m.set(115, 7, z, 'candle3'); }
    m.set(117, 6, 54, 'sps_e'); m.set(117, 7, 54, 'spruce_planks'); m.set(118, 6, 54, 'dark_oak_planks');
    m.set(110, 5, 54, 'lectern_w');
    const hausFarben = ['red_wool', 'yellow_wool', 'blue_wool', 'green_wool'];
    let fi = 0;
    for (let x = 64; x <= 116; x += 8) {
      const f = hausFarben[fi++ % 4];
      box(m, x, 12, 39, x + 1, 19, 39, f);
      box(m, x, 12, 69, x + 1, 19, 69, hausFarben[(fi + 1) % 4]);
    }
    // Wandpfeiler mit Kapitell und Gesims, Holzbalken unter der Decke
    for (let x = 66; x <= 114; x += 8) {
      for (const [z, wand] of [[40, 'n'], [68, 's']]) {
        for (let y = 5; y <= 24; y++) m.set(x, y, z, y === 5 ? 'polished_andesite' : mauer);
        m.set(x, 25, z, 'chiseled_stone_bricks');
      }
      for (let z = 39; z <= 69; z++) m.set(x, 28, z, 'dark_oak_log_z');
    }
    for (let x = 59; x <= 121; x++) { m.set(x, 26, 40, 'sbt_n'); m.set(x, 26, 68, 'sbt_s'); m.set(x, 28, 39, 'dark_oak_log_x'); m.set(x, 28, 69, 'dark_oak_log_x'); }
    // schwebende Lichter in unterschiedlicher Höhe
    for (let x = 64; x <= 116; x += 6) for (let z = 42; z <= 66; z += 6) {
      const unten = 18 + Math.floor(hash(x, 3, z) * 6);
      for (let y = 27; y > unten; y--) if (m.get(x, y, z) === 'air') m.set(x, y, z, 'chain');
      m.set(x, unten, z, 'lantern_h');
    }
    // Kamin an der Westwand
    for (let y = 5; y <= 7; y++) { m.set(59, y, 52, mauer); m.set(59, y, 56, mauer); }
    m.set(59, 5, 54, 'campfire'); m.set(59, 4, 53, 'cobblestone'); m.set(59, 4, 55, 'cobblestone');
    for (let z = 52; z <= 56; z++) { m.set(59, 8, z, 'chiseled_stone_bricks'); m.set(60, 8, z, 'sbt_w'); }
    for (let y = 9; y <= 14; y++) for (let z = 53; z <= 55; z++) m.set(59, y, z, mauer);
    // Buntglas: Rosetten an beiden Giebeln, farbige Oberlichter in den Seitenfenstern
    for (const gx of [58, 122]) for (let dz = -5; dz <= 5; dz++) for (let dy = -5; dy <= 5; dy++) {
      if (!imKreis(dz, dy, 4)) continue;
      const d = Math.hypot(dz, dy), speiche = dz === 0 || dy === 0 || Math.abs(dz) === Math.abs(dy);
      const f = d < 1.2 ? 'yellow' : speiche ? 'white' : d < 2.6 ? 'red' : d < 3.6 ? 'blue' : 'orange';
      m.set(gx, 20 + dy, 54 + dz, 'sg_' + f + '_ns');
    }
    for (let x = 60; x <= 120; x++) for (const z of [38, 70]) for (let y = 17; y <= 21; y++) {
      if (m.get(x, y, z).startsWith('pane')) m.set(x, y, z, 'sg_' + (y >= 20 ? 'blue' : (x + y) % 2 ? 'yellow' : 'red') + '_ew');
    }

    // Bibliothek im Erdgeschoss des Westflügels
    for (let z = 80; z <= 124; z += 4) for (let y = 5; y <= 7; y++) {
      for (let x = 47; x <= 54; x++) m.set(x, y, z, 'bookshelf');
      for (let x = 57; x <= 65; x++) m.set(x, y, z, 'bookshelf');
    }

    // Innenhof: Kreuzgang mit Bögen, Heckenbeete, Blumen, Stufenbrunnen, Bänke, Bäume
    const hx0 = 69, hx1 = 111, hz0 = 71, hz1 = 119;
    const istWeg = (x, z) => {
      const d = Math.min(x - hx0, hx1 - x, z - hz0, hz1 - z);
      return Math.abs(x - 90) <= 2 || Math.abs(z - 95) <= 2 || d <= 3 || Math.hypot(x - 90, z - 95) <= 6.5;
    };
    const blumen = ['poppy', 'allium', 'azure_bluet', 'oxeye_daisy', 'cornflower', 'dandelion'];
    for (let z = hz0; z <= hz1; z++) for (let x = hx0; x <= hx1; x++) {
      const d = Math.min(x - hx0, hx1 - x, z - hz0, hz1 - z);
      const weg = istWeg(x, z);
      m.set(x, 3, z, weg ? ((x + z) % 2 ? 'polished_andesite' : 'stone_bricks') : 'grass_block');
      if (!weg) {
        const amRand = istWeg(x + 1, z) || istWeg(x - 1, z) || istWeg(x, z + 1) || istWeg(x, z - 1);
        const zweite = istWeg(x + 2, z) || istWeg(x - 2, z) || istWeg(x, z + 2) || istWeg(x, z - 2);
        const luecke = Math.abs(x - 90) === 4 || Math.abs(z - 95) === 4 ? false : (x % 9 === 0 || z % 9 === 0);
        if (amRand && !luecke) m.set(x, 4, z, 'oak_leaves');
        else if (zweite && hash(x, 4, z) < 0.7) m.set(x, 4, z, blumen[Math.floor(hash(x, 5, z) * blumen.length)]);
      }
      if (d <= 3) m.set(x, 8, z, 'stone_brick_slab');
      if (d === 3) {
        const xSeite = x - hx0 === 3 || hx1 - x === 3;
        const entlang = xSeite ? z - hz0 : x - hx0, p = (entlang - 3) % 4;
        const plus = xSeite ? 's' : 'e', minus = xSeite ? 'n' : 'w';
        if (p === 0) for (let y = 4; y <= 7; y++) m.set(x, y, z, y === 4 ? 'chiseled_stone_bricks' : 'polished_andesite');
        else if (p === 1) m.set(x, 7, z, 'sbt_' + minus);
        else if (p === 3) m.set(x, 7, z, 'sbt_' + plus);
        else m.set(x, 7, z, 'stone_brick_slab_top');
      }
      if (d === 1) {
        const entlang = (x - hx0 === 1 || hx1 - x === 1) ? z - hz0 : x - hx0;
        if (entlang % 8 === 5) m.set(x, 7, z, 'lantern_h');
      }
    }
    // Stufenbrunnen
    for (let dz = -5; dz <= 5; dz++) for (let dx = -5; dx <= 5; dx++) {
      if (!imKreis(dx, dz, 5)) continue;
      const innen = imKreis(dx, dz, 4);
      m.set(90 + dx, 3, 95 + dz, 'stone_bricks');
      m.set(90 + dx, 4, 95 + dz, innen ? 'water' : (dx + dz) % 2 ? 'stone_bricks' : 'chiseled_stone_bricks');
      if (!innen) m.set(90 + dx, 5, 95 + dz, 'stone_brick_slab');
    }
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      if (!imKreis(dx, dz, 2)) continue;
      const innen = imKreis(dx, dz, 1);
      m.set(90 + dx, 5, 95 + dz, 'polished_andesite');
      m.set(90 + dx, 6, 95 + dz, innen ? 'water' : 'stone_bricks');
    }
    for (let y = 7; y <= 8; y++) m.set(90, y, 95, 'chiseled_stone_bricks');
    m.set(90, 9, 95, 'lantern');
    // Bänke zum Brunnen und Laternenpfosten
    for (const [x, z, f] of [[97, 95, 'sps_e'], [83, 95, 'sps_w'], [90, 102, 'sps_s'], [90, 88, 'sps_n']]) m.set(x, 4, z, f);
    for (const [x, z] of [[85, 90], [95, 90], [85, 100], [95, 100]]) {
      m.set(x, 4, z, 'stone_brick_wall'); m.set(x, 5, z, 'stone_brick_wall'); m.set(x, 6, z, 'lantern');
    }
    // Bäume in den vier Beeten
    [[79, 84], [101, 84], [79, 106], [101, 106]].forEach(([tx, tz], i) => baumBauer(m, 9100 + i).eiche(tx, 3, tz));

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

    // Fassadenrelief vor allen Außenwänden (nicht in Nachbartrakte hinein)
    for (const t of TRAKTE) fassade(m, t, TRAKTE.filter((u) => u !== t));

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

    schlossgarten(m);
    m.verbindeZaeune();
    return m;
  }

  /* ================================================== Viadukt / Brücke */
  function erzeugeBruecke() {
    // Zweistöckiges Viadukt mit Tiefe: vorspringende Pfeiler, zurückgesetzte Bogenfelder, Kragsteine, Zinnenbrüstung
    const m = new Modell(13, 76, 123);
    const deck = 72, X0 = 1, X1 = 11; // Brückenkörper x 1..11, Pfeiler springen bis x 0 / 12 vor
    for (let z = 0; z < 123; z++) {
      for (let x = X0; x <= X1; x++) {
        for (let y = deck - 3; y <= deck; y++) m.set(x, y, z, y === deck && x > X0 && x < X1 ? ((x + z) % 2 ? 'polished_andesite' : 'stone_bricks') : mauer);
      }
      // Kragsteine unter dem Deckgesims
      m.set(X0 - 1, deck - 3, z, 'sbt_e'); m.set(X1 + 1, deck - 3, z, 'sbt_w');
      m.set(X0 - 1, deck - 2, z, 'stone_bricks'); m.set(X1 + 1, deck - 2, z, 'stone_bricks');
      // Brüstung mit Zinnen
      m.set(X0, deck + 1, z, mauer); m.set(X1, deck + 1, z, mauer);
      m.set(X0 - 1, deck - 1, z, 'stone_brick_slab_top'); m.set(X1 + 1, deck - 1, z, 'stone_brick_slab_top');
      if (z % 2 === 0) { m.set(X0, deck + 2, z, 'stone_brick_slab'); m.set(X1, deck + 2, z, 'stone_brick_slab'); }
    }
    for (let k = 0; k <= 10; k++) {
      const pz = 12 * k + 1;
      // Pfeiler: Kern, vorspringende Vorlagen, gestufter Fuß, Wellenbrecher
      for (let z = pz - 1; z <= pz + 1; z++) for (let x = X0; x <= X1; x++) for (let y = 0; y < deck - 3; y++) m.set(x, y, z, mauer);
      for (let z = pz - 1; z <= pz + 1; z++) for (let y = 9; y < deck - 4; y++) { m.set(X0 - 1, y, z, mauer); m.set(X1 + 1, y, z, mauer); }
      for (let y = 9; y < deck - 4; y += 9) for (let z = pz - 1; z <= pz + 1; z++) { m.set(X0 - 1, y, z, 'polished_andesite'); m.set(X1 + 1, y, z, 'polished_andesite'); }
      for (let z = pz - 2; z <= pz + 2; z++) for (let x = X0 - 1; x <= X1 + 1; x++) for (let y = 0; y <= 8; y++) m.set(x, y, z, y === 8 ? 'polished_andesite' : sockel);
      for (let y = 0; y <= 7; y++) for (let x = X0 + 2; x <= X1 - 2; x++) {
        const breite = Math.max(0, 3 - Math.floor(y / 3));
        if (Math.abs(x - 6) <= breite) { m.set(x, y, pz - 3, sockel); m.set(x, y, pz + 3, sockel); }
      }
      m.set(X0 - 1, deck - 4, pz, 'sbt_e'); m.set(X1 + 1, deck - 4, pz, 'sbt_w');
      // Laternen auf den Pfeilern
      m.set(X0, deck + 2, pz, 'stone_bricks'); m.set(X1, deck + 2, pz, 'stone_bricks');
      m.set(X0, deck + 3, pz, 'lantern'); m.set(X1, deck + 3, pz, 'lantern');
      if (k === 10) break;
      const zc = pz + 6;
      for (let z = pz + 2; z <= pz + 10; z++) {
        const d = Math.abs(z - zc);
        const oben = Math.ceil(deck - 12 + Math.sqrt(Math.max(0, 22 - d * d)));
        const unten = Math.ceil(26 + Math.sqrt(Math.max(0, 22 - d * d)) * 1.6);
        for (let x = X0; x <= X1; x++) {
          const aussen = x === X0 || x === X1;
          // Bogenring außen, Bogenfeld (Zwickel) einen Block zurückgesetzt
          for (let y = oben; y < deck - 3; y++) {
            const ring = y <= oben + 1;
            if (aussen && !ring) continue;
            m.set(x, y, z, y === oben ? 'polished_andesite' : ring && aussen ? 'stone_bricks' : mauer);
          }
          for (let y = unten; y <= 40; y++) {
            const ring = y <= unten + 1, band = y >= 38;
            if (aussen && !ring && !band) continue;
            m.set(x, y, z, y === unten || band ? 'polished_andesite' : mauer);
          }
          if (aussen) { m.set(x, oben - 1, z, 'air'); }
        }
        // Gesimsband zwischen den Stockwerken springt vor
        m.set(X0 - 1, 40, z, 'stone_brick_slab_top'); m.set(X1 + 1, 40, z, 'stone_brick_slab_top');
      }
    }
    return m;
  }


  /* ================================================== Hogsmeade (Dorf, 81 × 81) */
  function erzeugeHogsmeade() {
    const m = new Modell(81, 34, 81);
    const MX = 40, MZ = 40;
    const strasse = (x, z) => Math.abs(z - MZ) <= 2 || Math.abs(x - MX) <= 2;
    const platz = (x, z) => Math.hypot(x - MX, z - MZ) <= 9;
    // Boden: Gras, gepflasterte Straßen und Marktplatz
    for (let z = 0; z < 81; z++) for (let x = 0; x < 81; x++) {
      const r = hash(x, 0, z);
      if (platz(x, z)) m.set(x, 0, z, (x + z) % 2 ? 'stone_bricks' : 'polished_andesite');
      else if (strasse(x, z)) m.set(x, 0, z, r < 0.5 ? 'cobblestone' : r < 0.8 ? 'gravel' : 'mossy_cobblestone');
      else m.set(x, 0, z, r < 0.05 ? 'coarse_dirt' : 'grass_block');
    }
    // Brunnen mit Baum auf dem Marktplatz
    for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
      if (!imKreis(dx, dz, 3)) continue;
      m.set(MX + dx, 1, MZ + dz, imKreis(dx, dz, 2) ? 'water' : 'stone_bricks');
      if (!imKreis(dx, dz, 2)) m.set(MX + dx, 2, MZ + dz, 'stone_brick_slab');
    }
    for (let y = 1; y <= 3; y++) m.set(MX, y, MZ, 'chiseled_stone_bricks');
    m.set(MX, 4, MZ, 'lantern');
    // Häuser beidseits der Straßen
    const haeuser = [];
    for (const seite of [-1, 1]) {
      for (let a = 2; a <= 72; a += 12) {
        if (Math.abs(a + 4 - MX) < 13) continue;
        haeuser.push({ x0: a, z0: seite < 0 ? MZ - 14 : MZ + 4, achse: 'x', tuer: seite < 0 ? 's' : 'n' });
        haeuser.push({ x0: seite < 0 ? MX - 14 : MX + 4, z0: a, achse: 'z', tuer: seite < 0 ? 'e' : 'w' });
      }
    }
    haeuser.forEach((h, i) => haus(m, h.x0, h.z0, h.tuer, i));
    // Laternen entlang der Straßen
    for (let a = 4; a < 78; a += 8) {
      for (const [x, z] of [[a, MZ - 3], [a, MZ + 3], [MX - 3, a], [MX + 3, a]]) {
        if (platz(x, z) || m.get(x, 1, z) !== 'air') continue;
        m.set(x, 1, z, 'spruce_fence'); m.set(x, 2, z, 'spruce_fence'); m.set(x, 3, z, 'lantern');
      }
    }
    // Marktstände am Platz
    for (const [x, z, f] of [[MX - 7, MZ - 6, 'red_wool'], [MX + 7, MZ + 6, 'blue_wool'], [MX + 6, MZ - 7, 'yellow_wool'], [MX - 6, MZ + 7, 'green_wool']]) {
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { m.set(x + dx, 1, z + dz, 'spruce_fence'); m.set(x + dx, 2, z + dz, 'spruce_fence'); }
      box(m, x - 1, 3, z - 1, x + 1, 3, z + 1, f);
      m.set(x, 1, z, 'barrel'); m.set(x - 1, 1, z, 'pumpkin'); m.set(x + 1, 1, z, 'hay_block');
    }
    m.verbindeZaeune();
    return m;
  }

  /* Ein Fachwerkhaus 9 × 9: Steinsockel, Fachwerk-Obergeschoss, steiles Dach, Schornstein */
  function haus(m, x0, z0, tuer, nr) {
    const w = 9, r = (k) => hash(x0, nr * 7 + k, z0);
    const hoch = 4 + Math.floor(r(1) * 2), oben = 4;
    const dachArt = r(2) < 0.5 ? 'dts' : 'sps';
    const x1 = x0 + w - 1, z1 = z0 + w - 1;
    for (let y = 1; y <= hoch + oben; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      const rand = x === x0 || x === x1 || z === z0 || z === z1;
      const ecke = (x === x0 || x === x1) && (z === z0 || z === z1);
      if (!rand) { m.set(x, y, z, y === hoch + 1 ? 'spruce_planks' : 'air'); continue; }
      if (y <= hoch) m.set(x, y, z, hash(x, y, z) < 0.25 ? 'mossy_cobblestone' : 'cobblestone');
      else if (ecke || y === hoch + 1 || y === hoch + oben || (x + z) % 4 === 0) m.set(x, y, z, 'spruce_log');
      else m.set(x, y, z, 'birch_planks');
    }
    box(m, x0 + 1, 0, z0 + 1, x1 - 1, 0, z1 - 1, 'spruce_planks');
    // Fenster
    for (const y of [2, 3, hoch + 2, hoch + 3]) {
      for (const x of [x0 + 2, x1 - 2]) { m.set(x, y, z0, 'pane_ew'); m.set(x, y, z1, 'pane_ew'); }
      for (const z of [z0 + 2, z1 - 2]) { m.set(x0, y, z, 'pane_ns'); m.set(x1, y, z, 'pane_ns'); }
    }
    // Tür zur Straße, Vordach in Ladenfarbe
    const tx = tuer === 'e' ? x1 : tuer === 'w' ? x0 : x0 + 4, tz = tuer === 's' ? z1 : tuer === 'n' ? z0 : z0 + 4;
    m.set(tx, 1, tz, 'door_' + tuer + '_l'); m.set(tx, 2, tz, 'door_' + tuer + '_u'); m.set(tx, 3, tz, 'cobblestone');
    const vx = tuer === 'e' ? 1 : tuer === 'w' ? -1 : 0, vz = tuer === 's' ? 1 : tuer === 'n' ? -1 : 0;
    const farbe = ['red_wool', 'blue_wool', 'green_wool', 'yellow_wool'][nr % 4];
    for (let k = -2; k <= 2; k++) m.set(tx + vx + (vz ? k : 0), 4, tz + vz + (vx ? k : 0), farbe);
    m.set(tx + vx * 2 + (vz ? 2 : 0), 1, tz + vz * 2 + (vx ? 2 : 0), 'barrel');
    // Einrichtung
    m.set(x0 + 4, hoch, z0 + 4, 'lantern_h'); m.set(x0 + 4, hoch + oben - 1, z0 + 4, 'lantern_h');
    m.set(x0 + 2, 1, z0 + 2, 'spruce_slab_top'); m.set(x0 + 3, 1, z0 + 2, 'sps_' + 'e'); m.set(x1 - 1, 1, z1 - 1, 'barrel');
    m.set(x1 - 1, hoch + 2, z0 + 1, 'bookshelf'); m.set(x0 + 1, 1, z1 - 1, 'hay_block');
    for (let y = 2; y <= hoch + 1; y++) m.set(x1 - 1, y, z0 + 1, 'ladder_s'); // Leiter nach oben
    m.set(x1 - 1, hoch + 1, z0 + 1, 'ladder_s');
    // Steiles Satteldach, First quer zur Straße
    const yt = hoch + oben;
    const lx = tuer === 'n' || tuer === 's';
    for (let k = 0; k <= 5; k++) {
      const y = yt + 1 + k;
      for (let a = -1; a <= w; a++) {
        const b0 = -1 + k, b1 = w - k;
        if (b0 > b1) break;
        const S = (b, key) => lx ? m.set(x0 + b, y, z0 + a, key) : m.set(x0 + a, y, z0 + b, key);
        if (b0 >= b1 - 1) { S(b0, dachArt === 'dts' ? 'deepslate_tiles' : 'spruce_planks'); S(b1, dachArt === 'dts' ? 'deepslate_tiles' : 'spruce_planks'); continue; }
        S(b0, dachArt + '_' + (lx ? 'e' : 's')); S(b1, dachArt + '_' + (lx ? 'w' : 'n'));
        if ((a === 0 || a === w - 1)) for (let b = b0 + 1; b < b1; b++) S(b, 'birch_planks');
      }
    }
    // Schornstein mit Rauch
    for (let y = 1; y <= yt + 6; y++) m.set(x1 - 1, y, z1 - 1, y <= hoch + oben ? m.get(x1 - 1, y, z1 - 1) === 'air' ? 'cobblestone' : m.get(x1 - 1, y, z1 - 1) : 'cobblestone');
    m.set(x1 - 1, yt + 7, z1 - 1, 'campfire');
  }

  /* ================================================== Eulerei (runder Turm auf dem Hang) */
  function erzeugeEulerei() {
    const m = new Modell(17, 46, 17);
    const c = 8, r = 5, top = 30;
    for (let dz = -8; dz <= 8; dz++) for (let dx = -8; dx <= 8; dx++) {
      if (!imKreis(dx, dz, 7)) continue;
      m.set(c + dx, 0, c + dz, imKreis(dx, dz, 6) ? (hash(dx, 0, dz) < 0.3 ? 'mossy_cobblestone' : 'cobblestone') : 'stone_brick_slab');
    }
    for (let y = 1; y <= top; y++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (!imKreis(dx, dz, r)) continue;
      const ring = !imKreis(dx, dz, r - 1);
      if (ring) {
        // viele kleine Einfluglöcher für die Eulen
        const loch = y > 4 && y % 4 === 2 && (Math.abs(dx) + Math.abs(dz)) % 3 === 0;
        m.set(c + dx, y, c + dz, loch ? 'air' : y % 8 === 0 ? 'polished_andesite' : mauer(c + dx, y, c + dz));
      } else if (y % 8 === 0) m.set(c + dx, y, c + dz, 'spruce_planks');
    }
    for (let y = 1; y <= top; y++) m.set(c, y, c - r + 1, 'ladder_s');
    for (let y = 1; y <= 3; y++) m.set(c, y, c + r, 'air');
    for (const y of [8, 16, 24]) { m.set(c + 2, y + 1, c + 2, 'hay_block'); m.set(c - 2, y + 1, c + 1, 'hay_block'); m.set(c, y + 3, c, 'lantern_h'); }
    // Zinnenkranz und Kegeldach
    for (let dz = -r - 1; dz <= r + 1; dz++) for (let dx = -r - 1; dx <= r + 1; dx++) {
      if (!imKreis(dx, dz, r + 1) || imKreis(dx, dz, r)) continue;
      m.set(c + dx, top, c + dz, 'polished_andesite');
      const rr = Math.abs(dx) >= Math.abs(dz) ? (dx > 0 ? 'w' : 'e') : (dz > 0 ? 'n' : 's');
      m.set(c + dx, top - 1, c + dz, 'sbt_' + rr);
    }
    const spitze = kegel(m, c, c, r + 1, top + 1, 14, 'deepslate_tiles', 'dts');
    m.set(c, spitze, c, 'lightning_rod');
    return m;
  }

  /* Leuchtturm auf einer Felsinsel mit Steg ins Meer (direkt ins Gelände gebaut) */
  function leuchtturm(m, H, N, cx, cz, stegVonX) {
    const r = 4, top = SEE_Y + 28;
    for (let dz = -9; dz <= 9; dz++) for (let dx = -9; dx <= 9; dx++) {
      const d = Math.hypot(dx, dz) + fbm((cx + dx) / 4, (cz + dz) / 4) * 1.5;
      if (d > 8) continue;
      const h = SEE_Y + 1 + Math.round(Math.max(0, (6 - d)) * 0.8);
      for (let y = 0; y <= h; y++) m.set(cx + dx, y, cz + dz, hash(cx + dx, y, cz + dz) < 0.3 ? 'mossy_cobblestone' : hash(cx + dx, y + 1, cz + dz) < 0.5 ? 'andesite' : 'stone');
      H[(cz + dz) * N + cx + dx] = h;
    }
    const fuss = H[cz * N + cx] + 1;
    for (let y = fuss; y <= top; y++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (!imKreis(dx, dz, r)) continue;
      const ring = !imKreis(dx, dz, r - 1);
      m.set(cx + dx, y, cz + dz, ring ? (Math.floor((y - fuss) / 4) % 2 ? 'red_concrete' : 'white_concrete') : 'air');
    }
    for (let y = fuss; y <= top; y++) m.set(cx, y, cz - r + 1, 'ladder_s');
    for (let y = fuss; y <= fuss + 1; y++) m.set(cx - r, y, cz, 'air');
    for (let dz = -r - 1; dz <= r + 1; dz++) for (let dx = -r - 1; dx <= r + 1; dx++) {
      if (!imKreis(dx, dz, r + 1)) continue;
      m.set(cx + dx, top + 1, cz + dz, 'stone_brick_slab');
      if (!imKreis(dx, dz, r)) m.set(cx + dx, top + 2, cz + dz, 'spruce_fence');
    }
    for (let y = top + 2; y <= top + 5; y++) for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      if (!imKreis(dx, dz, 2)) continue;
      const ring = !imKreis(dx, dz, 1);
      m.set(cx + dx, y, cz + dz, ring ? (y === top + 5 ? 'polished_andesite' : 'glass') : y === top + 3 ? 'glowstone' : 'air');
    }
    const spitze = kegel(m, cx, cz, 3, top + 6, 5, 'deepslate_tiles', 'dts');
    m.set(cx, spitze, cz, 'lightning_rod');
    // Steg vom Ufer zur Insel
    for (let x = stegVonX; x < cx - 6; x++) {
      for (let dz = -1; dz <= 1; dz++) {
        const z = cz + dz;
        if (H[z * N + x] > SEE_Y) continue;
        m.set(x, SEE_Y + 1, z, dz === 0 ? 'stone_bricks' : 'polished_andesite');
        if (x % 5 === 0 && dz !== 0) for (let y = Math.max(0, H[z * N + x] + 1); y <= SEE_Y; y++) m.set(x, y, z, 'stone_bricks');
      }
      if (H[cz * N + x] <= SEE_Y) {
        m.set(x, SEE_Y + 2, cz - 2, 'stone_brick_wall'); m.set(x, SEE_Y + 2, cz + 2, 'stone_brick_wall');
        if (x % 8 === 0) { m.set(x, SEE_Y + 3, cz - 2, 'lantern'); m.set(x, SEE_Y + 3, cz + 2, 'lantern'); }
      }
    }
  }

  /* ================================================== Brückenkopf mit Steinkreis (auf dem Südhügel) */
  function erzeugeBrueckenkopf() {
    const m = new Modell(33, 24, 33);
    const c = 16;
    for (let z = 0; z < 33; z++) for (let x = 0; x < 33; x++) {
      const d = Math.hypot(x - c, z - c);
      if (d > 15.5) continue;
      const r = hash(x, 0, z);
      m.set(x, 0, z, d > 14.5 ? 'stone_bricks' : r < 0.45 ? 'stone_bricks' : r < 0.7 ? 'andesite' : r < 0.85 ? 'cobblestone' : 'mossy_cobblestone');
      if (d > 14.5) m.set(x, 1, z, (x + z) % 2 ? 'stone_brick_slab' : 'cobblestone_wall');
    }
    // Torhaus: zwei Türme mit Pyramidendach und Bogen über dem Brückenweg (Brücke kommt von Norden, x 12..20)
    for (const tx of [7, 21]) {
      for (let y = 0; y <= 14; y++) for (let z = 0; z <= 4; z++) for (let x = tx; x <= tx + 4; x++) {
        const rand = x === tx || x === tx + 4 || z === 0 || z === 4;
        if (rand) m.set(x, y, z, y === 5 || y === 10 ? 'polished_andesite' : mauer);
        else if (y === 0 || y === 6 || y === 11) m.set(x, y, z, 'spruce_planks');
        else m.set(x, y, z, 'air');
      }
      for (const y of [3, 4, 8, 9, 12, 13]) { m.set(tx + 2, y, 0, 'pane_ew'); m.set(tx + 2, y, 4, 'pane_ew'); }
      for (let y = 1; y <= 3; y++) m.set(tx + 2, y, 4, 'air');
      for (let k = 0; k <= 3; k++) {
        const y = 15 + k;
        for (let z = -1 + k; z <= 5 - k; z++) for (let x = tx - 1 + k; x <= tx + 5 - k; x++) {
          const rand = x === tx - 1 + k || x === tx + 5 - k || z === -1 + k || z === 5 - k;
          if (!rand && k < 3) continue;
          const dx = x - (tx + 2), dz = z - 2;
          const r = Math.abs(dx) >= Math.abs(dz) ? (dx > 0 ? 'w' : 'e') : (dz > 0 ? 'n' : 's');
          m.set(x, y, z, k === 3 ? 'deepslate_tiles' : 'dts_' + r);
        }
      }
      m.set(tx + 2, 19, 2, 'lightning_rod');
      for (let x = tx - 1; x <= tx + 5; x++) for (const z of [-1, 5]) if (m.drin(x, 14, z)) m.set(x, 14, z, 'sbt_' + (z < 0 ? 's' : 'n'));
    }
    for (let x = 12; x <= 20; x++) for (let z = 0; z <= 4; z++) {
      for (let y = 7; y <= 10; y++) {
        const bogen = y === 7 && (x === 12 || x === 20) || y > 7;
        if (bogen) m.set(x, y, z, y === 10 ? 'stone_bricks' : mauer);
      }
      if (z === 0 || z === 4) m.set(x, 11, z, x % 2 ? 'stone_bricks' : 'air');
    }
    for (let x = 13; x <= 19; x++) { m.set(x, 7, 0, 'sbt_' + (x < 16 ? 'w' : x > 16 ? 'e' : 's')); }
    for (let z = 0; z <= 1; z++) for (let x = 12; x <= 20; x++) m.set(x, 0, z, 'stone_brick_slab');
    m.set(16, 6, 2, 'lantern_h');
    // Steinkreis
    const steine = 11;
    for (let i = 0; i < steine; i++) {
      const w = i / steine * Math.PI * 2 + 0.3, sx = Math.round(c + Math.cos(w) * 9.5), sz = Math.round(c + 2 + Math.sin(w) * 8.5);
      const hoch = 3 + Math.floor(hash(i, 1, 9) * 4), quer = Math.abs(Math.cos(w)) > Math.abs(Math.sin(w));
      for (let y = 1; y <= hoch; y++) {
        const k = hash(i, y, 3) < 0.3 ? 'mossy_cobblestone' : hash(i, y, 4) < 0.5 ? 'stone' : 'andesite';
        m.set(sx, y, sz, k);
        if (y < hoch - 1) quer ? m.set(sx, y, sz + 1, k) : m.set(sx + 1, y, sz, k);
      }
      if (hash(i, 2, 5) < 0.5) m.set(sx, hoch + 1, sz, quer ? 'stone_brick_slab' : 'cobblestone_wall');
    }
    // Mitte: Sonnenuhr mit Laterne, Bänke, Laternenpfosten
    for (let y = 1; y <= 2; y++) m.set(c, y, c + 2, 'polished_andesite');
    m.set(c, 3, c + 2, 'lantern');
    for (const [x, z, f] of [[c - 3, c + 2, 'sps_w'], [c + 3, c + 2, 'sps_e'], [c, c + 5, 'sps_s']]) m.set(x, 1, z, f);
    for (const [x, z] of [[9, 8], [23, 8], [5, 18], [27, 18], [10, 27], [22, 27]]) {
      for (let y = 1; y <= 3; y++) m.set(x, y, z, 'cobblestone_wall');
      m.set(x, 4, z, 'lantern');
    }
    for (let z = 28; z <= 32; z++) for (let x = 14; x <= 18; x++) if (m.get(x, 1, z) !== 'air' && Math.hypot(x - c, z - c) > 14.5) m.set(x, 1, z, 'air');
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



  /* ================================================== Selbstgebaute Bäume (jeder anders) */
  function baumBauer(m, h0) {
    const r = (a) => hash(h0, a, 77);
    const blatt = (x, y, z, k) => { if (m.get(x, y, z) === 'air') m.set(x, y, z, k); };
    const holz = (x, y, z, k) => { const t = m.get(x, y, z); if (t === 'air' || t.endsWith('leaves')) m.set(x, y, z, k); };
    // unregelmäßige Laubwolke, Rand ausgefranst, zwei Laubarten gemischt
    function wolke(cx, cy, cz, rad, k, k2, anteil2, flach) {
      const g = Math.ceil(rad) + 1;
      for (let dy = -g; dy <= g; dy++) for (let dz = -g; dz <= g; dz++) for (let dx = -g; dx <= g; dx++) {
        const d = Math.sqrt(dx * dx + dy * dy * (flach || 1.3) + dz * dz);
        const n = hash(cx + dx, cy + dy, cz + dz);
        if (d > rad + (n - 0.5) * 1.4) continue;
        if (d > rad - 1 && n < 0.18) continue;
        blatt(cx + dx, cy + dy, cz + dz, n < anteil2 ? k2 : k);
      }
    }
    // Ast als Linie aus liegenden Stämmen
    function ast(x, y, z, dx, dy, dz, laenge, art) {
      let px = x, py = y, pz = z;
      for (let i = 1; i <= laenge; i++) {
        const nx = Math.round(x + dx * i), ny = Math.round(y + dy * i), nz = Math.round(z + dz * i);
        const ax = nx !== px ? '_log_x' : nz !== pz ? '_log_z' : '_log';
        holz(nx, ny, nz, art + (ny !== py && nx === px && nz === pz ? '_log' : ax));
        px = nx; py = ny; pz = nz;
      }
      return [px, py, pz];
    }
    function wurzeln(x, y, z, art, breit) {
      const n = 2 + Math.floor(r(1) * 3);
      for (let i = 0; i < n; i++) {
        const w = r(10 + i) * Math.PI * 2, dx = Math.round(Math.cos(w)), dz = Math.round(Math.sin(w));
        if (!dx && !dz) continue;
        const l = 1 + Math.floor(r(20 + i) * (breit ? 3 : 2));
        for (let j = 1; j <= l; j++) holz(x + dx * j + (breit && dx > 0 ? 1 : 0), y - (j > 1 ? 1 : 0), z + dz * j + (breit && dz > 0 ? 1 : 0), art + (Math.abs(dx) >= Math.abs(dz) ? '_log_x' : '_log_z'));
      }
    }
    function eiche(x, h, z) {
      const breit = r(2) < 0.35, hoch = 5 + Math.floor(r(3) * 4) + (breit ? 2 : 0);
      for (let y = h + 1; y <= h + hoch; y++) for (let i = 0; i < (breit ? 4 : 1); i++) holz(x + (i & 1), y, z + (i >> 1), 'oak_log');
      wurzeln(x, h + 1, z, 'oak', breit);
      const aeste = 3 + Math.floor(r(4) * 3);
      for (let i = 0; i < aeste; i++) {
        const w = r(30 + i) * Math.PI * 2, start = h + Math.floor(hoch * (0.55 + r(40 + i) * 0.45));
        const l = 3 + Math.floor(r(50 + i) * (breit ? 4 : 3));
        const [ex, ey, ez] = ast(x, start, z, Math.cos(w), 0.55, Math.sin(w), l, 'oak');
        wolke(ex, ey + 1, ez, 2.2 + r(60 + i) * 1.4, 'oak_leaves', 'azalea_leaves', 0.22);
      }
      wolke(x, h + hoch + 1, z, 2.8 + r(5) * 1.2, 'oak_leaves', 'azalea_leaves', 0.22);
    }
    function fichte(x, h, z) {
      const hoch = 10 + Math.floor(r(3) * 8), maxR = 2.6 + r(4) * 2, top = h + hoch;
      for (let y = h + 1; y <= top - 1; y++) holz(x, y, z, 'spruce_log');
      wurzeln(x, h + 1, z, 'spruce', false);
      const neig = r(6) * Math.PI * 2;
      for (let y = h + 3 + Math.floor(r(5) * 3); y <= top; y++) {
        const t = (top - y) / hoch;
        const stufe = (top - y) % 3;
        const rad = Math.max(0.6, maxR * t * (stufe === 0 ? 1 : stufe === 1 ? 0.75 : 0.5) + 0.6);
        const g = Math.ceil(rad) + 1;
        for (let dz = -g; dz <= g; dz++) for (let dx = -g; dx <= g; dx++) {
          const winkel = Math.atan2(dz, dx);
          const rr = rad * (0.85 + 0.3 * Math.sin(winkel * 3 + neig + y));
          if (dx * dx + dz * dz <= rr * rr && hash(x + dx, y, z + dz) > 0.08) blatt(x + dx, y, z + dz, 'spruce_leaves');
        }
      }
      blatt(x, top + 1, z, 'spruce_leaves'); blatt(x, top + 2, z, 'spruce_leaves');
    }
    function birke(x, h, z) {
      const hoch = 6 + Math.floor(r(3) * 4);
      const lx = r(7) < 0.5 ? 0 : (r(8) < 0.5 ? 1 : -1);
      for (let y = h + 1; y <= h + hoch; y++) holz(x + (y > h + hoch - 2 ? lx : 0), y, z, 'birch_log');
      wolke(x + lx, h + hoch, z, 2 + r(4), 'birch_leaves', 'oak_leaves', 0.1, 1.8);
      if (r(9) < 0.6) { const [ex, ey, ez] = ast(x, h + hoch - 2, z, r(10) - 0.5, 0.6, r(11) - 0.5, 2, 'birch'); wolke(ex, ey + 1, ez, 1.7, 'birch_leaves', 'birch_leaves', 0); }
    }
    function schwarzeiche(x, h, z) {
      const hoch = 4 + Math.floor(r(3) * 3);
      for (let y = h + 1; y <= h + hoch; y++) for (let i = 0; i < 4; i++) holz(x + (i & 1), y, z + (i >> 1), 'dark_oak_log');
      wurzeln(x, h + 1, z, 'dark_oak', true);
      for (let i = 0; i < 4; i++) {
        const w = (i + r(30 + i)) * Math.PI / 2, [ex, ey, ez] = ast(x, h + hoch - 1, z, Math.cos(w), 0.35, Math.sin(w), 3 + Math.floor(r(40 + i) * 2), 'dark_oak');
        wolke(ex, ey + 1, ez, 3 + r(50 + i), 'dark_oak_leaves', 'oak_leaves', 0.15, 2.4);
      }
      wolke(x, h + hoch + 2, z, 3.5 + r(5) * 1.5, 'dark_oak_leaves', 'azalea_leaves', 0.12, 2.6);
    }
    return { eiche, fichte, birke, schwarzeiche };
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
  const KUESTE = 48; // Breite des Übergangs vom Land ins Meer am Rand
  const DORF_Y = 7, EULE_Y = 33; // Höhe der geebneten Plätze für Hogsmeade und die Eulerei
  const PLATEAU_Y = 110, SEE_Y = 3, TAL_Y = 5, HUEGEL_Y = PLATEAU_Y + 4, SATTEL_Y = PLATEAU_Y + 4 - 72 - 1;
  const LAGE = {
    berg: [0, 0, 0],
    hauptschloss: [160, PLATEAU_Y + 1, 110],
    bruecke: [244, SATTEL_Y + 1, 261],
    hagrid: [330, TAL_Y + 1, 438],
    hogsmeade: [380, DORF_Y + 1, 30],
    eulerei: [92, EULE_Y + 1, 88],
    gewaechshaeuser: [70, TAL_Y + 1, 230],
    quidditch: [390, TAL_Y + 1, 360],
    brueckenkopf: [234, HUEGEL_Y + 1, 384]
  };
  const EBENEN = [ // geebnete Bauplätze [x0, z0, x1, z1, Höhe]
    [330, 438, 352, 454, TAL_Y], [70, 230, 100, 244, TAL_Y], [390, 360, 460, 398, TAL_Y],
    [380, 30, 460, 110, DORF_Y],   // Hogsmeade
    [92, 88, 108, 104, EULE_Y]     // Eulerei
  ];
  const WEGE = [
    [[250, 412], [290, 432], [322, 446], [337, 457]],
    [[262, 405], [320, 395], [370, 385], [392, 380]],
    [[238, 405], [205, 360], [160, 300], [110, 252], [86, 246]],
    [[420, 112], [432, 160], [445, 220], [438, 290], [428, 356]],   // Hogsmeade → Quidditch
    [[392, 380], [410, 420], [436, 470], [440, 478]]                 // Quidditch → Leuchtturm-Steg
  ];
  const QUELLEN = [[226, 'z'], [274, 'z'], [190, 'x']]; // Wasserfall-Quellen am Plateaurand

  // See komplett innerhalb des Areals, Ufer durch Rauschen natürlich geformt
  function seeWert(x, z) { return ((x - 135) / 100) ** 2 + ((z - 425) / 58) ** 2 + fbm(x / 26 + 3, z / 26) * 0.2; }
  const INSEL = [108, 430, 8];
  // Fluss vom Wasserfall am Westhang durchs Tal in den See
  const FLUSS = [[140, 197], [130, 208], [121, 228], [115, 252], [113, 280], [117, 306], [124, 330], [130, 350], [133, 372]];

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
    if (see < 1) h = Math.min(h, SEE_Y - Math.round(Math.min(1, (1 - see) * 1.6) * 5));
    const di = Math.hypot(x - INSEL[0], z - INSEL[1]);
    if (di < INSEL[2]) h = Math.max(h, SEE_Y + 2 - Math.floor(di / 3.5));
    if (z >= 261 && z <= 383) {
      const dx = Math.abs(x - 250);
      h = Math.min(h, SATTEL_Y + Math.max(0, dx - 6) * 2.5);
      if (dx <= 6) h = SATTEL_Y;
    }
    // Küste: zu allen Rändern hin sanft ins Meer abfallen (Wasserspiegel = SEE_Y), keine Kante zum Ozean
    const randAbstand = Math.min(x, z, 499 - x, 499 - z) + fbm(x / 35 + 11, z / 35 - 4) * 14;
    if (randAbstand < KUESTE) {
      const t = Math.max(0, randAbstand) / KUESTE, w = t * t * (3 - 2 * t);
      h = 0.4 + (h - 0.4) * w;
    }
    for (const [x0, z0, x1, z1, ey] of EBENEN) {
      const e = Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1));
      if (e === 0) h = ey;
      else if (e < 16) h = ey + (h - ey) * (e / 16);
    }
    return Math.max(0, Math.round(h));
  }

  function erzeugeBerg() {
    const N = 500, m = new Modell(N, HUEGEL_Y + 24, N);
    const H = new Int16Array(N * N);
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) H[z * N + x] = gelaendeHoehe(x, z);
    const hAt = (x, z) => H[Math.max(0, Math.min(N - 1, z)) * N + Math.max(0, Math.min(N - 1, x))];
    const fels = (x, y, z) => {
      const r = hash(x, y, z);
      return r < 0.5 ? 'stone' : r < 0.7 ? 'andesite' : r < 0.85 ? 'cobblestone' : 'mossy_cobblestone';
    };
    // Flussbett: stufenweise fallender Wasserspiegel (Kaskaden), mündet auf Seehöhe
    const wasserY = new Int16Array(N * N).fill(-1);
    const nass = new Uint8Array(N * N);
    {
      let xs = 165; while (xs > 100 && hAt(xs, 190) >= PLATEAU_Y) xs--;
      const punkte = [[xs, 190]].concat(FLUSS);
      let pegel = PLATEAU_Y - 1;
      for (let i = 0; i < punkte.length - 1; i++) {
        const [ax, az] = punkte[i], [bx, bz] = punkte[i + 1];
        const n = Math.ceil(Math.hypot(bx - ax, bz - az) * 2);
        for (let k = 0; k <= n; k++) {
          const px = ax + (bx - ax) * k / n, pz = az + (bz - az) * k / n;
          const breite = 1.2 + 1.6 * (i + k / n) / (punkte.length - 1) + rauschen(px / 9, pz / 9) * 0.4;
          pegel = Math.max(SEE_Y, Math.min(pegel, hAt(Math.round(px), Math.round(pz)) - 1));
          const g = Math.ceil(breite) + 4;
          for (let dz = -g; dz <= g; dz++) for (let dx = -g; dx <= g; dx++) {
            const x = Math.round(px) + dx, z = Math.round(pz) + dz;
            if (x < 0 || z < 0 || x >= N || z >= N) continue;
            const d = Math.hypot(x - px, z - pz), c = z * N + x;
            if (d <= breite + 4) nass[c] = 1;
            if (d > breite) continue;
            const tiefe = d < breite - 1 ? 2 : 1;
            if (wasserY[c] < 0 || pegel < wasserY[c]) wasserY[c] = pegel;
            H[c] = Math.min(H[c], pegel - tiefe);
          }
        }
      }
    }
    const oben = new Array(N * N);
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
      const h = H[z * N + x];
      const tief = Math.min(h, hAt(x + 1, z), hAt(x - 1, z), hAt(x, z + 1), hAt(x, z - 1));
      const steil = h - tief;
      const see = seeWert(x, z);
      let top;
      const imFluss = wasserY[z * N + x] > h;
      if (imFluss) top = hash(x, 1, z) < 0.5 ? 'gravel' : 'sand';
      else if (h < SEE_Y) top = hash(x, 1, z) < 0.6 ? 'sand' : hash(x, 5, z) < 0.6 ? 'gravel' : 'clay';
      else if ((see < 1.2 || Math.min(x, z, N - 1 - x, N - 1 - z) < KUESTE + 16) && h <= SEE_Y + 1) top = 'sand';
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
      const pegel = h < SEE_Y ? Math.max(SEE_Y, wasserY[z * N + x]) : wasserY[z * N + x];
      for (let y = h + 1; y <= pegel; y++) m.set(x, y, z, 'water');
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
          if (wasserY[z * N + x] > H[z * N + x]) { m.set(x, wasserY[z * N + x] + 1, z, 'spruce_planks'); continue; } // Holzbrücke
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
      if (seeWert(x, z) < 1.25 || nass[z * N + x]) return true;
      for (const [x0, z0, x1, z1] of EBENEN) if (x > x0 - 6 && x < x1 + 6 && z > z0 - 6 && z < z1 + 6) return true;
      return false;
    };
    for (let gz = 0; gz < N / 7; gz++) for (let gx = 0; gx < N / 7; gx++) {
      const x = gx * 7 + Math.floor(hash(gx, 11, gz) * 6), z = gz * 7 + Math.floor(hash(gx, 12, gz) * 6);
      if (x < 6 || z < 6 || x > N - 7 || z > N - 7) continue;
      if (fbm(x / 70 + 9, z / 70) < -0.15 && hash(gx, 13, gz) < 0.75) continue;
      if (hash(gx, 14, gz) < 0.2 || gesperrt(x, z) || wegZelle[z * N + x]) continue;
      const t = oben[z * N + x];
      if (t !== 'grass_block' && t !== 'coarse_dirt' && t !== 'moss_block') continue;
      const h = H[z * N + x];
      const baum = baumBauer(m, gx * 1000 + gz);
      const w = hash(gx, 15, gz), hoehe = h / PLATEAU_Y;
      // oben am Berg mehr Fichten, im Tal mehr Laubbäume
      if (w < 0.25 + hoehe * 0.5) baum.fichte(x, h, z);
      else if (w < 0.62 + hoehe * 0.3) baum.eiche(x, h, z);
      else if (w < 0.82 + hoehe * 0.15) baum.birke(x, h, z);
      else baum.schwarzeiche(x, h, z);
    }
    // Bootssteg und Bootshaus am Nordufer des Sees
    {
      let zu = 330; while (zu < 420 && seeWert(120, zu) >= 1) zu++;
      for (let z = zu - 2; z <= zu + 14; z++) for (let x = 119; x <= 121; x++) {
        m.set(x, SEE_Y + 1, z, 'spruce_planks');
        if ((x === 119 || x === 121) && (z - zu) % 4 === 0) {
          for (let y = SEE_Y; y >= Math.max(0, H[z * N + x] + 1); y--) m.set(x, y, z, 'spruce_log');
          m.set(x, SEE_Y + 2, z, 'spruce_fence');
        }
      }
      m.set(119, SEE_Y + 3, zu + 12, 'lantern'); m.set(121, SEE_Y + 3, zu + 12, 'lantern');
      const bx0 = 108, bx1 = 116, bz0 = zu - 5, bz1 = zu + 4;
      for (let z = bz0; z <= bz1; z++) for (let x = bx0; x <= bx1; x++) {
        const hz = H[z * N + x];
        for (let y = Math.min(hz + 1, SEE_Y); y <= SEE_Y; y++) if (m.get(x, y, z) !== 'air') { /* Wasser bleibt */ }
        m.set(x, SEE_Y + 1, z, 'spruce_planks');
        const randB = x === bx0 || x === bx1 || z === bz0 || z === bz1;
        const ecke = (x === bx0 || x === bx1) && (z === bz0 || z === bz1);
        for (let y = SEE_Y + 2; y <= SEE_Y + 5; y++) {
          if (ecke) m.set(x, y, z, 'spruce_log');
          else if (randB) m.set(x, y, z, (z === bz1 && x > bx0 + 1 && x < bx1 - 1 && y <= SEE_Y + 4) ? 'air' : (y === SEE_Y + 4 && z !== bz1 && (x + z) % 3 === 0) ? 'pane_ns' : 'dark_oak_planks');
          else m.set(x, y, z, 'air');
        }
        if (ecke) for (let y = SEE_Y + 1; y >= Math.max(0, hz); y--) m.set(x, y, z, 'spruce_log');
      }
      for (let k = 0; k <= 5; k++) for (let z = bz0 - 1; z <= bz1 + 1; z++) {
        const y = SEE_Y + 6 + k;
        if (bx0 - 1 + k > bx1 + 1 - k) break;
        if (bx0 - 1 + k === bx1 + 1 - k) { m.set(bx0 - 1 + k, y, z, 'spruce_planks'); continue; }
        m.set(bx0 - 1 + k, y, z, 'sps_e'); m.set(bx1 + 1 - k, y, z, 'sps_w');
        if (z === bz0 || z === bz1) for (let x = bx0 + k; x < bx1 + 1 - k; x++) m.set(x, y, z, 'dark_oak_planks');
      }
      m.set(112, SEE_Y + 5, zu, 'lantern_h');
    }
    leuchtturm(m, H, N, 482, 478, 425);
    // Seerosen, Zuckerrohr am Ufer, Baum auf der Insel
    for (let z = 1; z < N - 1; z++) for (let x = 1; x < N - 1; x++) {
      const c = z * N + x, h = H[c], see = seeWert(x, z);
      if (see < 1 && see > 0.55 && h < SEE_Y && hash(x, 31, z) < 0.03 && m.get(x, SEE_Y + 1, z) === 'air') m.set(x, SEE_Y + 1, z, 'lily_pad');
      if (oben[c] === 'sand' && h === SEE_Y && hash(x, 32, z) < 0.22) {
        const amWasser = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => m.get(x + dx, h, z + dz) === 'water');
        if (amWasser && m.get(x, h + 1, z) === 'air') { const n = 1 + Math.floor(hash(x, 33, z) * 3); for (let y = 1; y <= n; y++) m.set(x, h + y, z, 'sugar_cane'); }
      }
    }
    baumBauer(m, 4242).eiche(INSEL[0], H[INSEL[1] * N + INSEL[0]], INSEL[1]);
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
      text: 'Zweistöckiges Viadukt mit 10 Bogenfeldern, vorspringenden Pfeilern, Wellenbrechern und Zinnenbrüstung. 123 Blöcke lang, 76 hoch.' },
    { id: 'hagrid', titel: 'Hagrids Hütte', datei: 'hogwarts-hagrids-huette.litematic', erstelle: erzeugeHagrid,
      text: 'Runde Steinhütte mit Kegeldach, rauchendem Kamin und Kürbisbeet.' },
    { id: 'gewaechshaeuser', titel: 'Gewächshäuser', datei: 'hogwarts-gewaechshaeuser.litematic', erstelle: erzeugeGewaechshaeuser,
      text: 'Drei Glashäuser mit Fichtenholzrahmen, Pflanzbeeten und Laternen.' },
    { id: 'quidditch', titel: 'Quidditch-Feld', datei: 'hogwarts-quidditch.litematic', erstelle: erzeugeQuidditch,
      text: 'Ovales Spielfeld mit je drei Torringen und vier Tribünen in den Hausfarben.' },
    { id: 'brueckenkopf', titel: 'Brückenkopf & Steinkreis', datei: 'hogwarts-brueckenkopf.litematic', erstelle: erzeugeBrueckenkopf,
      text: 'Torhaus mit zwei Türmen, wo das Viadukt auf dem Südhügel ankommt, gepflasterter Platz mit Steinkreis, Sonnenuhr und Laternen.' },
    { id: 'hogsmeade', titel: 'Hogsmeade', datei: 'hogwarts-hogsmeade.litematic', erstelle: erzeugeHogsmeade,
      text: 'Dorf mit 20 Fachwerkhäusern, gepflasterten Straßen, Marktplatz mit Brunnen, Marktständen und Laternen.' },
    { id: 'eulerei', titel: 'Eulerei', datei: 'hogwarts-eulerei.litematic', erstelle: erzeugeEulerei,
      text: 'Runder Eulenturm mit Einfluglöchern, Zinnenkranz und Spitzhelm auf einer Terrasse am Hang.' },
    { id: 'berg', titel: 'Berg & Gelände', datei: 'hogwarts-berg.litematic', erstelle: erzeugeBerg,
      text: '500 × 500 Blöcke: Gipfelplateau, Klippen, Schlucht, Südhügel, See mit Insel, Steg und Bootshaus, Fluss mit Kaskaden, Wälder, Wege, Leuchtturm mit Steg im Meer und eine sanfte Küste an allen Rändern.' }
  ];
  for (const b of BAUWERKE) b.lage = LAGE[b.id];

  // Berg in zwei deckungsgleiche Teile zerlegen: erst Gelände formen, dann Wald setzen
  const VEGETATION = new Set(['poppy', 'dandelion', 'cornflower', 'fern', 'lily_pad', 'sugar_cane', 'allium', 'azure_bluet', 'oxeye_daisy']);
  const istVegetation = (k) => VEGETATION.has(k) || k.includes('_log') || k.endsWith('_leaves');
  function bergTeil(wald, berg) {
    const quelle = berg || erzeugeBerg();
    const m = new Modell(quelle.sx, quelle.sy, quelle.sz);
    const abb = quelle.keys.map((k) => (k !== 'air' && istVegetation(k) === wald ? m.id(k) : 0));
    for (let i = 0; i < quelle.daten.length; i++) m.daten[i] = abb[quelle.daten[i]];
    return m;
  }
  const TEILE = [
    { id: 'gelaende', titel: 'Berg – nur Gelände', datei: 'hogwarts-berg-gelaende.litematic', lage: [0, 0, 0],
      erstelle: (berg) => bergTeil(false, berg),
      text: 'Berg ohne Bäume und Blumen: Fels, Erde, Gras, See, Strand, Wege und Wasserfall-Quellen. Zuerst bauen.' },
    { id: 'wald', titel: 'Berg – nur Wald', datei: 'hogwarts-berg-wald.litematic', lage: [0, 0, 0],
      erstelle: (berg) => bergTeil(true, berg),
      text: 'Selbstgebaute Bäume (Eichen, Fichten, Birken, Schwarzeichen – jeder anders), Blumen und Farne. Gleicher Ursprung wie das Gelände.' }
  ];

  // Alle Bauwerke an ihrer Lage zu einem Gesamtmodell zusammensetzen (für Vorschau)
  function erzeugeGesamt(bereich) {
    const [bx0, bz0, bx1, bz1] = bereich || [0, 0, 499, 499];
    const g = new Modell(bx1 - bx0 + 1, PLATEAU_Y + 1 + 100, bz1 - bz0 + 1);
    g.teile = [];
    for (const b of ['berg', 'hauptschloss', 'bruecke', 'brueckenkopf', 'hagrid', 'gewaechshaeuser', 'quidditch', 'hogsmeade', 'eulerei'].map((id) => BAUWERKE.find((e) => e.id === id))) {
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
