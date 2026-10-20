// Field ability art (W9-abilities): the heavy stone block Bram shoves, the thin root wall and the cracked cliff
// that Dash Strike breaks (and their broken states), and the three 12 px ability icons. Hand-placed pixels in
// the master palette (assets/palette.json ramps), kept here as strings so the art ships with the code that uses
// it. Pure data + `rasterize` (no DOM, node tests and the preview tool use it); `installFieldArt(engine)` builds
// one canvas sheet in the browser, registers it as the image `fieldart` and adds the ids below to the live
// tiles database so TileMap draws them like any other tile or object.
//
//   objects: heavy_block (16x32 prop, anchor [0,1], one footprint tile, like push_block)
//   tiles:   ab_root_wall (16x32, solid)        ab_root_wall_broken (16x32, walkable)
//            ab_cliff_crack (16x32, solid)      ab_cliff_grotto (16x32, walkable)
//   icons:   ab_dash, ab_appraise, ab_shove (12x12; the Lantern keeps the ui icon `lantern`)

/** Palette letters shared by every sprite ('.' is transparent). */
export const PAL = {
  // outlines and darks
  K: '#14101e', k: '#1a1334', O: '#251d34', o: '#2e2b4c', a: '#2e2b4c', j: '#292657',
  // cool stone (heavy block)
  b: '#4c445c', c: '#66637f', d: '#8e8997', e: '#b3b6c4', w: '#e2e0de', W: '#f6f4ee',
  // warm stone (cliff)
  s: '#584951', t: '#7e6d6e', u: '#a18f85', v: '#cfb89c', V: '#ebdfc8',
  // roots and wood
  r: '#482826', R: '#6a4532', p: '#896042', P: '#ae8458', q: '#c3a57c', Q: '#e4cb96',
  // moss / grass
  g: '#2a532f', G: '#427330', h: '#5a9032', H: '#84ad39',
  // gold, cyan, blue
  y: '#c38334', Y: '#eba14d', z: '#f9d77a', m: '#2ec4d0', M: '#8af0e8', n: '#4064b9', N: '#6891d9',
  // leather (fist)
  l: '#8f5533', L: '#b87942', f: '#d69c57',
};

// A granite block bound with two iron straps and a carved weight mark: wider, taller and darker than the
// Archive's light push block so the two read apart at a glance (the light one is a pale card drawer).
const HEAVY_BLOCK = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '..OOOOOOOOOOOO..',
  '.OewweeeeeeweeO.',
  'OeeeeedeeeeeeedO',
  'OedeeeeeeedeeedO',
  'OeeeeeeeeeeeeddO',
  'OdeeedeeeeeedddO',
  'OddeeeeedeeeddcO',
  'OcdddddddddddccO',
  'OOOOOOOOOOOOOOOO',
  'OdccccccccccccbO',
  'OcbbbbbbbbbbbboO',
  'ObbcbbbbbbbbbboO',
  'ObbbbbooooobbboO',
  'ObbbbobbbbbobboO',
  'ObbbobbcccbbobaO',
  'ObbbobcbbbcbobaO',
  'ObbbobcbobcbobaO',
  'ObbbobcbbbcbobaO',
  'ObbbobbcccbbobaO',
  'ObbbbobbbbbobboO',
  'ObbbbbooooobbboO',
  'ObcbbbbbbbbbbboO',
  'OGbbbbbbbbbbbgoO',
  'OhGgbbbGbbbbGhgO',
  '.OOOOOOOOOOOOOO.',
  '................',
];

// Thin, dry roots knitted across a dark doorway in a wall face: pale strands with gaps the dark shows through
// (the tell that a hard hit gets through), a knot at the crossing, frayed ends hanging off the lintel.
const ROOT_WALL = [
'...OOOOOOOOOO...',
  '..OkqkkPkkkqkO..',
  '.ORkqkkPkkkqkqO.',
  'OqRRqkPPkkkqkqRO',
  'OkqqqkPkkkkqqqRO',
  'OkqqRkPkkkkkqRkO',
  'OkkqRkPkkkkkqRkO',
  'OkkqRRPPkkkqqRkO',
  'OkkkqRkPKkkqRkkO',
  'OkkppRRPKKqqRkkO',
  'OkppkqRPKKqRkkkO',
  'OkkkkqPPKqqRkkkO',
  'OkkkkKPRKqRkkkkO',
  'OkkkkKPRqqRkkkkO',
  'OkkkKKPQQRKKkkpO',
  'OkkkKKPqRQKKppkO',
  'OkkkKKPPRRpppkkO',
  'OkpppKKPRRpKkkkO',
  'OppkpppPRppKkkkO',
  'OkkkKKpPKqRRkkkO',
  'OkkkKqqPPKqRkkkO',
  'OkkkKqRKPKqRkkkO',
  'OkkkKqRKPKqRRkkO',
  'OkkkqqRKPKKqRkkO',
  'OkkkqRKKPKKqRkkO',
  'OkkkqRKKPKKpppkO',
  'OkkkqRKKPKppRppO',
  'OkkqqRKKPKKkqRkO',
  'OkkqRKKKPKKkqRkO',
  'OkkqRkKKPKkkqRkO',
  'OkkqRkkkPkkkkkkO',
  'OOOOOOOOOOOOOOOO',
];

// The same doorway once Dash Strike has gone through: snapped stubs on the jambs and the lintel, splinters
// on the sill, the dark passage open.
const ROOT_WALL_BROKEN = [
'...OOOOOOOOOO...',
  '..OkkkqPkkkkkO..',
  '.OkkkkkpkkkkkkO.',
  'OqPkkkkkkkkkkPkO',
  'OPkkkkkkkkkkkRqO',
  'OkkkkkkkkkkkkkkO',
  'OkkkkkkkkkkkkkkO',
  'OkkkkkkkkkkkkkkO',
  'OkkkkkkKKkkkkkkO',
  'OqkkkkKKKKkkkkkO',
  'ORPkkKKKKKKkkkkO',
  'OkkkkKKKKKKkkkqO',
  'OkkkkKKKKKKkkPRO',
  'OkkkkKKKKKKkkkkO',
  'OkkkKKKKKKKKkkkO',
  'OkkkKKKKKKKKkkkO',
  'OkkkKKKKKKKKkkkO',
  'OPkkKKKKKKKKkkkO',
  'OkqkKKKKKKKKkkPO',
  'OkkkKKKKKKKKkqkO',
  'OkkkKKKKKKKKkkkO',
  'OkkkKKKKKKKKkkkO',
  'OkkkKKKKKKKKkkkO',
  'OkkkKKKKKKKKkkkO',
  'OqPkKKKKKKKKkkkO',
  'OkkkkKKKKKKkkkqO',
  'OkkkkKKKKKKkkPkO',
  'OkkkkKKKKKKkkkkO',
  'OkkkkRKKKKKkkkkO',
  'OkkqPkKKKqkRkkkO',
  'OkkkkkpkkkPkqkkO',
  'OOOOOOOOOOOOOOOO',
];

// A section of cliff face split by a spider of deep fissures, the rock around it shadowed and chipped, loose
// chunks at its foot: the one patch of the valley's cliffs that sounds hollow.
const CLIFF_CRACK = [
  '................',
  '.....s..........',
  '....sKv......s..',
  '....sKv......K..',
  '....sKv....sKv..',
  '....sKv....sKv..',
  '.....uK.s.sKv...',
  '......KsKKvKv...',
  '.......KKvsKv...',
  '.......K..sKK...',
  '......Ku..K.KK..',
  '......KKv.KK....',
  'sKK...KKvKK.....',
  'KKvKv.KKKKv.....',
  'uu.sKKKkkKvs....',
  '......kKkKvKK..s',
  '......KkKKKKvKvK',
  '......KKKKv...Ku',
  '.....KKsKKv.....',
  '....sKKsKKv.....',
  '....Ku..sKv.s...',
  '...sK...sKvKKv..',
  '..sKvKs...KKv...',
  '..Ku.sKv..Ku....',
  '..K...u...K.....',
  '..K.......K.....',
  '..K........K....',
  '..u........K....',
  '...........sKv..',
  '..tu......uvO...',
  '.OstO.uO.OtuO...',
  '.............tO.',
];

// The broken cliff: a dark cave mouth with a rough rim and rubble spilling from it.
const CLIFF_GROTTO = [
  '................',
  '................',
  '................',
  '.....ssss.......',
  '...sstuuts......',
  '..stKKKKKts.....',
  '..tKKkkkKKtss...',
  '.stKkkkkkkKts...',
  '.tKkkkkkkkkKts..',
  '.tKkkkkkkkkkKt..',
  'stKkkkkkkkkkKts.',
  'tKkkkkkkkkkkkKt.',
  'tKkkkkkkkkkkkKts',
  'tKkkkkkkkkkkkkKt',
  'tKkkkkkkkkkkkkKt',
  'sKkkkkkkkkkkkkKt',
  'tKkkkkkkkkkkkkKs',
  'tKkkkkkkkkkkkkKt',
  'tKkkkkkkkkkkkkKt',
  'sKkkkkkkkkkkkkKt',
  'tKkkkkkkkkkkkkKs',
  'tKkkkkkkkkkkkkKt',
  'tKKkkkkkkkkkkKKt',
  'stKkkkkkkkkkkKts',
  'tKkkkkkkkkkkkkKt',
  'tKkkkkkkkkkkkkKt',
  'tKKkkkkkkkkkkKKt',
  'stKKKKkkkkKKKKts',
  'tuvtsKKKKKKstuVt',
  'svVvt.....tuvVus',
  'tuuvs......suvt.',
  '.st..........ts.',
];

// 12 px icons for the ability wheel and the prompts.
const ICON_DASH = [   // a thrusting blade with speed lines (Dash Strike)
  '............',
  '.........OO.',
  '........OWwO',
  '.NN....OWwO.',
  '......OWwO..',
  'NNNN.OWwO...',
  '....OWwO....',
  '.NNOYwO.....',
  '..OyYO......',
  '.OyOyO......',
  'OyO.O.......',
  '.O..........',
];
const ICON_APPRAISE = [   // Mira's reading lens
  '..OOOO......',
  '.OYzzYO.....',
  'OYMMWMYO....',
  'OzMmMMzO....',
  'OzmMMMzO....',
  'OYMMmMYO....',
  '.OYzzYOO....',
  '..OOOOyYO...',
  '......OyYO..',
  '.......OyYO.',
  '........OyO.',
  '.........O..',
];
const ICON_SHOVE = [   // two gold chevrons driving a stone block (Shove)
  '............',
  '......OOOOOO',
  '......OewedO',
  '.Y..Y.OdcdcO',
  '.zY.zYOcbcbO',
  '..zY.zObbcbO',
  '..zY.zObcbbO',
  '.zY.zYOcbbbO',
  '.Y..Y.ObbbaO',
  '......OOOOOO',
  '............',
  '............',
];

/** Sprite table: id -> { rows, w, h, at: [x, y] on the sheet }. Sheet is 112 x 32. */
export const SPRITES = {
  heavy_block: { rows: HEAVY_BLOCK, at: [0, 0] },
  ab_root_wall: { rows: ROOT_WALL, at: [16, 0] },
  ab_root_wall_broken: { rows: ROOT_WALL_BROKEN, at: [32, 0] },
  ab_cliff_crack: { rows: CLIFF_CRACK, at: [48, 0] },
  ab_cliff_grotto: { rows: CLIFF_GROTTO, at: [64, 0] },
  ab_dash: { rows: ICON_DASH, at: [80, 0] },
  ab_appraise: { rows: ICON_APPRAISE, at: [92, 0] },
  ab_shove: { rows: ICON_SHOVE, at: [80, 12] },
};
export const SHEET_W = 112, SHEET_H = 32;
export const ICONS = { dash: 'ab_dash', appraise: 'ab_appraise', shove: 'ab_shove' };

/** tiles.json-shaped entries the installer adds (sheet `fieldart`). */
export function dbEntries() {
  const t = (id, collision) => { const s = SPRITES[id]; return { x: s.at[0], y: s.at[1], w: 16, h: 32, collision, sheet: 'fieldart' }; };
  return {
    objects: {
      heavy_block: { rect: [0, 0, 16, 32], anchor: [0, 1], footprint: [[0, 0]], overheadRows: 1, doorAt: null, collision: 'solid', kind: 'prop',
        note: 'W9: Bram shoves it (Shove); the hero alone cannot', sheet: 'fieldart' },
    },
    tiles: {
      ab_root_wall: t('ab_root_wall', 'solid'),
      ab_root_wall_broken: t('ab_root_wall_broken', 'none'),
      ab_cliff_crack: t('ab_cliff_crack', 'solid'),
      ab_cliff_grotto: t('ab_cliff_grotto', 'none'),
    },
  };
}

function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

/** RGBA pixels of one sprite (Uint8ClampedArray, w*h*4). Throws on a ragged row or an unknown letter. */
export function rasterize(rows) {
  const h = rows.length, w = rows[0].length;
  const out = new Uint8ClampedArray(w * h * 4);
  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`fieldart: row ${y} is ${row.length} wide, expected ${w}`);
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      const col = PAL[ch];
      if (!col) throw new Error(`fieldart: unknown palette letter "${ch}"`);
      const [r, g, b] = hex(col);
      const i = (y * w + x) * 4;
      out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = 255;
    }
  });
  return { w, h, data: out };
}

/** The whole sheet as RGBA (node: the preview tool writes it to a PNG). */
export function rasterizeSheet() {
  const data = new Uint8ClampedArray(SHEET_W * SHEET_H * 4);
  for (const s of Object.values(SPRITES)) {
    const img = rasterize(s.rows);
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
      const si = (y * img.w + x) * 4, di = ((s.at[1] + y) * SHEET_W + s.at[0] + x) * 4;
      if (img.data[si + 3]) { data[di] = img.data[si]; data[di + 1] = img.data[si + 1]; data[di + 2] = img.data[si + 2]; data[di + 3] = 255; }
    }
  }
  return { w: SHEET_W, h: SHEET_H, data };
}

/**
 * Browser: build the sheet once, register it as the image `fieldart` and add the ids to the live tiles
 * database (engine.assets.json('tiles')). Safe to call on every map load.
 */
export function installFieldArt(engine) {
  const assets = engine && engine.assets;
  if (!assets || typeof document === 'undefined') return false;
  const db = assets.json('tiles');
  if (assets.has('fieldart') && db && db.objects && db.objects.heavy_block) return true;
  const sheet = rasterizeSheet();
  const c = document.createElement('canvas');
  c.width = sheet.w; c.height = sheet.h;
  const g = c.getContext('2d');
  const id = g.createImageData(sheet.w, sheet.h);
  id.data.set(sheet.data);
  g.putImageData(id, 0, 0);
  if (assets.setImage) assets.setImage('fieldart', c);
  if (db) {
    const add = dbEntries();
    db.objects = db.objects || {}; db.tiles = db.tiles || {};
    for (const [k, v] of Object.entries(add.objects)) if (!db.objects[k]) db.objects[k] = v;
    for (const [k, v] of Object.entries(add.tiles)) if (!db.tiles[k]) db.tiles[k] = v;
  }
  return true;
}
