/**
 * Blocktypen: deutscher Name, Grundfarbe, Texturen je Seite und Form.
 * Unbekannte Blöcke funktionieren trotzdem (Farbe aus dem Namen, Würfelform).
 */

export type Shape = 'cube' | 'slab' | 'stairs' | 'pane' | 'post' | 'wall' | 'cross' | 'carpet' | 'small' | 'thin' | 'door';

export interface BlockTypeInfo {
  id: string;
  name: string;
  color: string;
  /** voller, undurchsichtiger Würfel – verdeckt Nachbarflächen */
  opaque: boolean;
  /** halbtransparent (Glas, Wasser) */
  translucent: boolean;
  /** Texturnamen für oben, Seite, unten */
  tex: { top: string; side: string; bottom: string };
}

const NAMEN: Record<string, string> = {
  tuff_bricks: 'Tuffziegel', polished_tuff: 'Polierter Tuff', chiseled_tuff_bricks: 'Gemeißelte Tuffziegel', tuff_brick_stairs: 'Tuffziegeltreppe',
  tuff_brick_wall: 'Tuffziegelmauer', resin_bricks: 'Harzziegel', chiseled_resin_bricks: 'Gemeißelte Harzziegel', calcite: 'Kalzit',
  cobbled_deepslate: 'Bruchtiefenschiefer', brick_stairs: 'Ziegeltreppe', brick_slab: 'Ziegelstufe',
  dripstone_block: 'Tropfsteinblock', pointed_dripstone: 'Spitzer Tropfstein', amethyst_block: 'Amethystblock', amethyst_cluster: 'Amethysthaufen',
  smooth_basalt: 'Glatter Basalt', moss_carpet: 'Moosteppich', leaf_litter: 'Laubstreu', wildflowers: 'Wildblumen', bush: 'Busch',
  firefly_bush: 'Glühwürmchenbusch', short_dry_grass: 'Kurzes Trockengras', magenta_wool: 'Platzhalter (Magenta Wolle)',
  stone: 'Stein', cobblestone: 'Bruchstein', mossy_cobblestone: 'Bemooster Bruchstein', stone_bricks: 'Steinziegel',
  mossy_stone_bricks: 'Bemooste Steinziegel', cracked_stone_bricks: 'Rissige Steinziegel', chiseled_stone_bricks: 'Gemeißelte Steinziegel',
  polished_andesite: 'Polierter Andesit', andesite: 'Andesit', deepslate_tiles: 'Tiefenschieferfliesen', deepslate_bricks: 'Tiefenschieferziegel',
  oak_planks: 'Eichenholzbretter', spruce_planks: 'Fichtenholzbretter', dark_oak_planks: 'Schwarzeichenholzbretter', birch_planks: 'Birkenholzbretter',
  oak_log: 'Eichenstamm', spruce_log: 'Fichtenstamm', dark_oak_log: 'Schwarzeichenstamm', birch_log: 'Birkenstamm',
  oak_leaves: 'Eichenlaub', spruce_leaves: 'Fichtenlaub', birch_leaves: 'Birkenlaub', dark_oak_leaves: 'Schwarzeichenlaub', azalea_leaves: 'Azaleenlaub',
  glass: 'Glas', glass_pane: 'Glasscheibe', grass_block: 'Grasblock', dirt: 'Erde', sand: 'Sand', gravel: 'Kies', dirt_path: 'Trampelpfad',
  water: 'Wasser', bookshelf: 'Bücherregal', crafting_table: 'Werkbank', chest: 'Truhe', barrel: 'Fass', hay_block: 'Heuballen',
  lantern: 'Laterne', torch: 'Fackel', chain: 'Kette', candle: 'Kerze', lectern: 'Lesepult', ladder: 'Leiter',
  oak_door: 'Eichenholztür', spruce_door: 'Fichtenholztür', dark_oak_door: 'Schwarzeichenholztür',
  oak_stairs: 'Eichenholztreppe', spruce_stairs: 'Fichtenholztreppe', dark_oak_stairs: 'Schwarzeichenholztreppe',
  stone_brick_stairs: 'Steinziegeltreppe', deepslate_tile_stairs: 'Tiefenschieferfliesentreppe', deepslate_brick_stairs: 'Tiefenschieferziegeltreppe',
  cobblestone_stairs: 'Bruchsteintreppe', oak_slab: 'Eichenholzstufe', spruce_slab: 'Fichtenholzstufe', dark_oak_slab: 'Schwarzeichenholzstufe',
  stone_brick_slab: 'Steinziegelstufe', deepslate_tile_slab: 'Tiefenschieferfliesenstufe', cobblestone_slab: 'Bruchsteinstufe',
  oak_fence: 'Eichenzaun', spruce_fence: 'Fichtenzaun', dark_oak_fence: 'Schwarzeichenzaun', cobblestone_wall: 'Bruchsteinmauer',
  stone_brick_wall: 'Steinziegelmauer', red_wool: 'Rote Wolle', blue_wool: 'Blaue Wolle', yellow_wool: 'Gelbe Wolle', green_wool: 'Grüne Wolle',
  white_wool: 'Weiße Wolle', red_carpet: 'Roter Teppich', blue_carpet: 'Blauer Teppich', green_carpet: 'Grüner Teppich', yellow_carpet: 'Gelber Teppich',
  poppy: 'Mohn', dandelion: 'Löwenzahn', cornflower: 'Kornblume', allium: 'Sternlauch', azure_bluet: 'Porzellansternchen', oxeye_daisy: 'Margerite',
  fern: 'Farn', sugar_cane: 'Zuckerrohr', lily_pad: 'Seerosenblatt', campfire: 'Lagerfeuer', lightning_rod: 'Blitzableiter',
  white_concrete: 'Weißer Beton', yellow_concrete: 'Gelber Beton', moss_block: 'Moosblock', coarse_dirt: 'Grobe Erde', pumpkin: 'Kürbis',
  flower_pot: 'Blumentopf', iron_bars: 'Eisengitter', spruce_trapdoor: 'Fichtenfalltür', oak_trapdoor: 'Eichenfalltür', smooth_stone: 'Glatter Stein',
  bricks: 'Ziegelsteine', blackstone: 'Schwarzstein', furnace: 'Ofen', cauldron: 'Kessel', red_bed: 'Rotes Bett'
};

const FARBEN: Record<string, string> = {
  tuff_bricks: '#62655e', polished_tuff: '#5f635c', chiseled_tuff_bricks: '#5d605a', tuff_brick_stairs: '#62655e', tuff_brick_wall: '#62655e',
  resin_bricks: '#c45a1d', chiseled_resin_bricks: '#b9531a', calcite: '#dfe0dc', cobbled_deepslate: '#4d4d52', dripstone_block: '#866b5c',
  pointed_dripstone: '#866b5c', amethyst_block: '#8a64c4', amethyst_cluster: '#a77fe0', smooth_basalt: '#48484e', moss_carpet: '#596e2d',
  leaf_litter: '#8a6a35', wildflowers: '#e8d35a', bush: '#4f7a2e', firefly_bush: '#4b6a2a', short_dry_grass: '#b8a46a', tuff: '#6c6d66',
  stone: '#7a7a7a', cobblestone: '#6f6f6f', mossy_cobblestone: '#61704c', stone_bricks: '#7e7e7e', mossy_stone_bricks: '#6d7859',
  cracked_stone_bricks: '#747371', chiseled_stone_bricks: '#7a7a7a', polished_andesite: '#8f9393', andesite: '#88898a',
  deepslate_tiles: '#3a3a40', deepslate_bricks: '#47474d', oak_planks: '#a2834f', spruce_planks: '#6e5131', dark_oak_planks: '#4a3220',
  birch_planks: '#c5b37b', oak_log: '#6b5434', spruce_log: '#3d2b1a', dark_oak_log: '#3b2a17', birch_log: '#d8d4c8',
  oak_leaves: '#3f6b2a', spruce_leaves: '#2f4c30', birch_leaves: '#6f9a42', dark_oak_leaves: '#2f5a1f', azalea_leaves: '#5b7f2c',
  glass: '#c4e6f2', glass_pane: '#c4e6f2', grass_block: '#5d9a3b', dirt: '#866043', sand: '#dbcf9c', gravel: '#857f7c', dirt_path: '#94793f',
  water: '#3a6fd8', bookshelf: '#7a5530', crafting_table: '#8f6a3c', chest: '#9c6f2c', barrel: '#7d5a33', hay_block: '#c8a833',
  lantern: '#f0a83c', torch: '#ffcc55', chain: '#3b3f4a', candle: '#efe3c2', lectern: '#8a6a3e', ladder: '#a0773f',
  red_wool: '#a12722', blue_wool: '#35399d', yellow_wool: '#e8b42e', green_wool: '#546d1b', white_wool: '#e9ecec',
  poppy: '#c8221b', dandelion: '#e8d23a', cornflower: '#4a6fd8', allium: '#b46ad6', azure_bluet: '#d6e4f0', oxeye_daisy: '#f2f2e6',
  fern: '#4e7a35', sugar_cane: '#8cc068', lily_pad: '#2f7a2a', campfire: '#d86a1e', lightning_rod: '#c8734a',
  white_concrete: '#cfd5d6', yellow_concrete: '#f0af15', moss_block: '#596e2d', coarse_dirt: '#77553b', pumpkin: '#c57618',
  iron_bars: '#8a8d90', smooth_stone: '#9e9e9e', bricks: '#96503f', blackstone: '#2a2428', furnace: '#6e6e6e', cauldron: '#3d3d40',
  red_bed: '#a12722'
};

function hexAusName(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  const r = 90 + (h & 0x5f), g = 90 + ((h >> 8) & 0x5f), b = 90 + ((h >> 16) & 0x5f);
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** Basismaterial einer Variante, z. B. "stone_brick_stairs" → "stone_bricks" (für Farbe und Textur). */
export function baseMaterial(id: string): string {
  const ersetzungen: [RegExp, string][] = [
    [/^(oak|spruce|dark_oak|birch|jungle|acacia|mangrove|cherry)_(stairs|slab|fence|fence_gate|door|trapdoor)$/, '$1_planks'],
    [/^stone_brick_(stairs|slab|wall)$/, 'stone_bricks'],
    [/^mossy_stone_brick_(stairs|slab|wall)$/, 'mossy_stone_bricks'],
    [/^deepslate_tile_(stairs|slab|wall)$/, 'deepslate_tiles'],
    [/^deepslate_brick_(stairs|slab|wall)$/, 'deepslate_bricks'],
    [/^cobblestone_(stairs|slab|wall)$/, 'cobblestone'],
    [/^mossy_cobblestone_(stairs|slab|wall)$/, 'mossy_cobblestone'],
    [/^(.*)_stained_glass_pane$/, '$1_stained_glass'],
    [/^glass_pane$/, 'glass'],
    [/^smooth_stone_slab$/, 'smooth_stone'],
    [/^(.*)_carpet$/, '$1_wool']
  ];
  for (const [re, ziel] of ersetzungen) if (re.test(id)) return id.replace(re, ziel);
  return id;
}

const cache = new Map<string, BlockTypeInfo>();

/** Alle bisher benutzten Blocktypen (z. B. um Farben aus Originaltexturen zu übernehmen) */
export const allBlockInfos = () => cache.values();

export function blockInfo(id: string): BlockTypeInfo {
  const vorhanden = cache.get(id);
  if (vorhanden) return vorhanden;
  const basis = baseMaterial(id);
  const name = NAMEN[id] ?? NAMEN[basis] ?? id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const color = FARBEN[id] ?? FARBEN[basis] ?? (id.includes('stained_glass') ? farbeAusFarbwort(id) : hexAusName(basis));
  const shape = shapeOf(id);
  const translucent = /glass|water|ice/.test(id) && !id.includes('stained') || id === 'water';
  const opaque = shape === 'cube' && !translucent && !/leaves|glass|water|ice|spawner/.test(id);
  let tex = { top: basis, side: basis, bottom: basis };
  if (id === 'grass_block') tex = { top: 'grass_block_top', side: 'grass_block_side', bottom: 'dirt' };
  else if (id === 'dirt_path') tex = { top: 'dirt_path_top', side: 'dirt', bottom: 'dirt' };
  else if (/_log$|_wood$/.test(id)) tex = { top: id + '_top', side: id, bottom: id + '_top' };
  else if (id === 'bookshelf') tex = { top: 'oak_planks', side: 'bookshelf', bottom: 'oak_planks' };
  else if (id === 'crafting_table') tex = { top: 'crafting_table_top', side: 'crafting_table', bottom: 'oak_planks' };
  else if (id === 'hay_block') tex = { top: 'hay_block_top', side: 'hay_block', bottom: 'hay_block_top' };
  else if (id === 'pumpkin') tex = { top: 'pumpkin_top', side: 'pumpkin', bottom: 'pumpkin_top' };
  const info: BlockTypeInfo = { id, name, color, opaque, translucent, tex };
  cache.set(id, info);
  return info;
}

function farbeAusFarbwort(id: string): string {
  const f: Record<string, string> = { red: '#b02e26', yellow: '#f9d849', blue: '#3c44aa', green: '#5e7c16', white: '#e8eef0', orange: '#f08a1d', purple: '#8932b8', black: '#1d1d21', light_blue: '#3ab3da' };
  const wort = Object.keys(f).find((k) => id.startsWith(k));
  return wort ? f[wort] : '#c4e6f2';
}

const PFLANZEN = /^(poppy|dandelion|cornflower|allium|azure_bluet|oxeye_daisy|fern|sugar_cane|short_grass|grass|tall_grass|rose_bush|lilac|peony|sweet_berry_bush|.*_sapling|.*_tulip|lily_of_the_valley|dead_bush|wheat|bush|firefly_bush|short_dry_grass|pointed_dripstone|amethyst_cluster)$/;

export function shapeOf(id: string): Shape {
  if (id.endsWith('_stairs')) return 'stairs';
  if (id.endsWith('_slab')) return 'slab';
  if (id.endsWith('_pane') || id === 'iron_bars') return 'pane';
  if (id.endsWith('_wall')) return 'wall';
  if (id.endsWith('_fence') || id === 'chain' || id === 'lightning_rod' || id === 'end_rod' || id === 'torch') return 'post';
  if (PFLANZEN.test(id)) return 'cross';
  if (id.endsWith('_carpet') || id === 'lily_pad' || id === 'leaf_litter' || id === 'wildflowers' || id.endsWith('_pressure_plate')) return 'carpet';
  if (id === 'lantern' || id === 'candle' || id === 'flower_pot' || id === 'campfire') return 'small';
  if (id === 'ladder' || id.endsWith('_trapdoor')) return 'thin';
  if (id.endsWith('_door')) return 'door';
  if (id.endsWith('_bed')) return 'slab';
  return 'cube';
}
