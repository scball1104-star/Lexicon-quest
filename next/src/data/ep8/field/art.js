// Code-drawn art for pop-up books (E8-world, docs/EPISODE8_PLAN.md 4, 5.1 and 9.1). Never in the first download (ep8 pack).
//
// The game draws E8-tiles' sheet (assets/tiles/ep8.png, ep8_tiles.json): the terrains, the books `popbook`, `popbook_ew`,
// `popbook_realm`, `popbook_realm_ew` (bookSprite), the 9-slices `page_bridge`, `page_wall`, `page_ghost` and the 7 frames of
// `realm_model` (./system.js realTiles, through paintSliceCell), and the Dash stacks' `drawer_stack_dash` (DRAWER_TILES). What
// follows is only the fallback for a tile database without that fragment (node tests, a tool):
//
// 1. Stand-ins. ensureArt(db, engine, map) adds a code-drawn stand-in
//    for every id below that the tile database does NOT have yet (after the pack's fragment merged; never replaces an id), on
//    the small sheet `ep8_books_fallback`, registered as an image. So props, collision and frames always exist.
//      void_violet   terrain, collision `void`, the lowest in terrainOrder: flat violet with at most a faint grain. It must
//                    never read as floor (plan 4, the phone rule): no texture, no edge highlight. The motes are a layer.
//      marble_page   terrain, walkable: veined marble page-stone, its edge a pale lip with a dark line over the void
//      ep8w_book_ns  32x16 (a 2 x 1 book), anchor [0, 0], 16 frames: ribbon colour c (0 ivory, 1 crimson, 2 teal, 3 azure) x
//                    phase p (0 shut, 1 and 2 opening, 3 open): frame 4c + p. Two ribbons on both long sides, a gilt edge.
//      ep8w_book_ew  16x32 (a 1 x 2 book), the same frames turned a quarter.
//    The book ids are E8-world's own (`ep8w_`), used only when E8-tiles has no `popbook` of that orientation (bookSprite()).
// 2. Code textures for the system (./system.js) when the sheet's pieces are missing: the page bridge (cream paper, 1 px ink edge, glyph bars, a 2 px shadow onto
//    the void), the standing page wall (a cap over the cell above), the dotted gold ghost, the seven realm models, the motes.
//    PAL below is the recipe the contrast check measures.

import { TILE } from '../../../world/tilemap.js';

export const SHEET = 'ep8_books_fallback';
export const SHEET_W = 256, SHEET_H = 112;

export const PAL = {
  void: { base: '#2a1d4e', grain: '#2c1f52', grain2: '#281b4a' },
  marble: { base: '#b9ad98', lt: '#c9bfaa', hi: '#d9d0bf', dk: '#a29581', vein: '#988a74', ol: '#4a3f52', lip: '#ddd4c2', lipDk: '#8c7f6c' },
  paper: { base: '#f4ebd4', shade: '#e2d6b8', face: '#ebdfc2', faceDk: '#d4c5a2', hi: '#fffaf0', glyph: '#b5a382', glyphDk: '#9a8766',
    ink: '#2b1d33', shadow: '#120a1e' },
  ghost: { gold: '#ffd54a', goldHi: '#fff0a8', dark: '#3a2208', fill: '#ffd54a' },
  book: { ol: '#1c1018', leather: '#5b2b2e', leatherLt: '#76403c', leatherDk: '#3f1c22', gilt: '#e3bd5a', giltDk: '#a8802c',
    page: '#efe3c4', pageDk: '#cbbb96', gutter: '#8c7a58', ghostInk: '#6e4448' },
  ribbons: [['#f2ead6', '#b8ab8c'], ['#e0404e', '#8e1c2a'], ['#3ac0b4', '#1c6c68'], ['#6a98f4', '#2c4ca0']],
  realm: { paper: '#fbf5e6', shade: '#d8c9a6', crease: '#b8a580', ink: '#3a2a40' },
};
/** The motes: added light ('lighter'), so a mote lifts whatever void is under it by the same small amount. */
export const MOTE_RGB = [9, 7, 3];
export const MOTES = { frames: 3, every: 30, pattern: 48, count: 9, limit: 0.03 };

export const BOOK_FRAMES = { shut: 0, open: 3 };
const L = {
  ep8w_book_ns: Array.from({ length: 16 }, (_, f) => [(f % 4) * 32, 48 + Math.floor(f / 4) * 16, 32, 16]),
  ep8w_book_ew: Array.from({ length: 16 }, (_, f) => [128 + (f % 8) * 16, Math.floor(f / 8) * 32, 16, 32]),
};
export const FALLBACK_OBJECTS = Object.keys(L);

/**
 * The Library's Dash stacks. A map's `object` with `breakable` and sprite `drawer_stack_dash` (E8-tiles' cracked drawer stack,
 * frames 0 cracked and 1 broken) would draw as the core breakable art of its kind (the cliff crack): core breakables are
 * 16 x 32 tiles, not objects. ensureArt adds the two frames as tiles of that shape (DRAWER_TILES), and ./events.js puts them
 * on the stacks' cells (drawerStacks). Collision as the core pair: cracked solid, broken open.
 */
export const DRAWER_OBJECT = 'drawer_stack_dash';
export const DRAWER_TILES = { whole: 'ep8_drawer_stack', broken: 'ep8_drawer_stack_broken' };
function drawerTiles(db) {
  const o = db.objects && db.objects[DRAWER_OBJECT];
  if (!o || !Array.isArray(o.frames) || o.frames.length < 2) return [];
  const added = [];
  [[DRAWER_TILES.whole, 0, 'solid'], [DRAWER_TILES.broken, 1, 'none']].forEach(([id, f, collision]) => {
    if (db.tiles[id]) return;
    const [x, y, w, h] = o.frames[f];
    db.tiles[id] = { x, y, w, h, collision, sheet: o.sheet, note: `E8-world: frame ${f} of ${DRAWER_OBJECT} as a breakable's tile` };
    added.push(id);
  });
  return added;
}
export const FALLBACK_TERRAINS = ['void_violet', 'marble_page'];

function objectDef(id) {
  const fr = L[id];
  const ns = id === 'ep8w_book_ns';
  return { sheet: SHEET, rect: fr[0], anchor: [0, 0], frames: fr, footprint: ns ? [[0, 0], [1, 0]] : [[0, 0], [0, 1]], overheadRows: 0,
    doorAt: null, collision: 'solid', kind: 'prop', fallback: true, note: 'E8-world stand-in until E8-tiles ships popbook' };
}
function terrainDef(id) {
  const x = id === 'void_violet' ? 0 : 64;
  return { sheet: SHEET, x, y: 0, kind: 'fill', collision: id === 'void_violet' ? 'void' : 'none',
    variants: [[x + 32, 0], [x + 48, 0], [x + 32, 16], [x + 48, 16]], variantWeights: id === 'void_violet' ? [6, 1, 1, 1] : [4, 2, 2, 2],
    fallback: true, note: `E8-world stand-in until E8-tiles ships ${id}` };
}

/**
 * The prop id for a book of this axis: the event's own `sprite`, else (a realm book) E8-tiles' `popbook_realm` /
 * `popbook_realm_ew`, else its `popbook_ns` / `popbook_ew`, else its `popbook` when that object's footprint has this
 * orientation, else the stand-in.
 */
export function bookSprite(db, axis, ev = null, realm = false) {
  const O = (db && db.objects) || {};
  if (ev && ev.sprite && O[ev.sprite]) return ev.sprite;
  if (realm && axis === 'ew' && O.popbook_realm_ew) return 'popbook_realm_ew';
  if (realm && axis === 'ns' && O.popbook_realm) return 'popbook_realm';
  if (O[`popbook_${axis}`]) return `popbook_${axis}`;
  const p = O.popbook;
  if (p && Array.isArray(p.footprint) && p.footprint.length === 2) {
    const wide = p.footprint.some(([dx]) => dx === 1);
    if ((axis === 'ns') === wide) return 'popbook';
  }
  return axis === 'ns' ? 'ep8w_book_ns' : 'ep8w_book_ew';
}

let sheetCanvas = null;
/**
 * Add stand-ins for the ids `db` lacks (the objects; `void_violet` at the bottom of terrainOrder, `marble_page` above it),
 * build the sheet once (engine.renderer) and register it as an image, and put it in `map`'s sheet cache when given.
 * Idempotent. Without an engine (node, mapcheck) only the definitions are added. Returns the ids added.
 */
export function ensureArt(db, engine = null, map = null) {
  if (!db) return [];
  db.objects = db.objects || {};
  db.terrains = db.terrains || {};
  db.tiles = db.tiles || {};
  db.terrainOrder = db.terrainOrder || [];
  const added = drawerTiles(db);
  for (const id of FALLBACK_OBJECTS) if (!db.objects[id]) { db.objects[id] = objectDef(id); added.push(id); }
  for (const id of FALLBACK_TERRAINS) if (!db.terrains[id]) { db.terrains[id] = terrainDef(id); added.push(id); }
  if (!db.terrainOrder.includes('void_violet')) db.terrainOrder.unshift('void_violet');
  if (!db.terrainOrder.includes('marble_page')) db.terrainOrder.splice(db.terrainOrder.indexOf('void_violet') + 1, 0, 'marble_page');
  const uses = FALLBACK_OBJECTS.some((id) => db.objects[id] && db.objects[id].sheet === SHEET)
    || FALLBACK_TERRAINS.some((id) => db.terrains[id] && db.terrains[id].sheet === SHEET);
  if (!uses) return added;
  const r = engine && engine.renderer;
  if (!sheetCanvas && r && typeof r.createLayer === 'function') {
    const layer = r.createLayer(SHEET_W, SHEET_H);
    if (layer.ctx && typeof layer.ctx.fillRect === 'function' && layer.canvas) paintSheet(layer.ctx);
    sheetCanvas = layer.canvas || null;
  }
  if (sheetCanvas && engine && engine.assets && typeof engine.assets.setImage === 'function' && !(engine.assets.has && engine.assets.has(SHEET))) engine.assets.setImage(SHEET, sheetCanvas);
  if (sheetCanvas && map && map.sheetCache) map.sheetCache.set(SHEET, sheetCanvas);
  return added;
}

// ------------------------------------------------------------------ pixel helpers
const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
/** A tiling 16 x 16 hash in 0..1 (wraps at 16 both ways). */
const hash = (x, y, s) => { const v = Math.sin(((x & 15) * 12.9898 + (y & 15) * 78.233 + s * 37.719)) * 43758.5453; return v - Math.floor(v); };

function paintA2(g, ox, oy, px) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) R(g, ox + x, oy + 16 + y, 1, 1, px(x, y, Math.min(x, y, 31 - x, 31 - y)));
  const corners = [[16, 0, 16, 0], [24, 0, 32, 0], [16, 8, 16, 16], [24, 8, 32, 16]];
  for (const [qx, qy, cx, cy] of corners) for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const d = Math.hypot(qx + x + 0.5 - cx, qy + y + 0.5 - cy) - 0.5;
    R(g, ox + qx + x, oy + qy + y, 1, 1, px(qx + x, qy + y, d < 3 ? d : 99));
  }
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) R(g, ox + x, oy + y, 1, 1, px(x, y, 99));
}

/** The void: flat violet, a grain so faint it never reads as texture (no edge highlight: the floor draws its own lip). */
export function voidPixel(x, y, v = 0) {
  const h = hash(x, y, 5 + v);
  if (h > 0.96) return PAL.void.grain;
  if (h < 0.03) return PAL.void.grain2;
  return PAL.void.base;
}
/** Marble page-stone: slow veins, pale flecks; its edge a lip with a dark line where it meets the void. */
export function marblePixel(x, y, d = 99, v = 0) {
  if (d < 1) return PAL.marble.ol;
  if (d < 2) return PAL.marble.lip;
  if (d < 3) return PAL.marble.lipDk;
  const vein = Math.sin(x * 0.42 + y * 0.18 + v * 1.9 + Math.sin(y * 0.6 + v) * 1.4);
  const h = hash(x, y, 13 + v);
  if (Math.abs(vein) < 0.08) return PAL.marble.vein;
  if (h > 0.96) return PAL.marble.hi;
  if (h < 0.05) return PAL.marble.dk;
  if (vein > 0.7) return PAL.marble.lt;
  // a faint seam every 16 px: page-stones, not one slab
  if (x % 16 === 15 || y % 16 === 15) return PAL.marble.dk;
  return PAL.marble.base;
}

/** One book frame at (ox, oy), drawn 32 x 16 (ns); ew books are the same picture turned (paintBookEw). */
function paintBookNs(g, ox, oy, colour, phase, paired) {
  const B = PAL.book, [rib, ribDk] = PAL.ribbons[colour];
  const P = (x, y, c) => R(g, ox + x, oy + y, 1, 1, c);
  // ground shadow
  R(g, ox + 2, oy + 14, 29, 2, 'rgba(16,8,24,0.55)');
  // ribbons out of both long sides: two at the top edge (north), two hanging from the page block (south), forked tails
  for (const rx of [8, 21]) {
    R(g, ox + rx, oy + 0, 3, 3, rib); g.clearRect(ox + rx + 1, oy, 1, 1); P(rx + 2, 1, ribDk); P(rx + 2, 2, ribDk);
  }
  for (const rx of [10, 23]) {
    R(g, ox + rx, oy + 12, 3, 4, rib); g.clearRect(ox + rx + 1, oy + 15, 1, 1); P(rx + 2, 12, ribDk); P(rx + 2, 13, ribDk); P(rx + 2, 14, ribDk);
  }
  // the page block under the cover: gilt-edged pages, a thin line between each
  R(g, ox + 1, oy + 9, 30, 5, B.ol);
  R(g, ox + 2, oy + 10, 28, 3, B.gilt);
  R(g, ox + 2, oy + 11, 28, 1, B.giltDk);
  for (let x = 4; x < 29; x += 3) P(x, 10, '#f6e7a8');
  // the cover (its top face), outline and a lit upper edge
  R(g, ox + 1, oy + 2, 30, 8, B.ol);
  R(g, ox + 2, oy + 3, 28, 6, B.leather);
  R(g, ox + 2, oy + 3, 28, 1, B.leatherLt);
  R(g, ox + 2, oy + 8, 28, 1, B.leatherDk);
  // the spine's raised bands at the left end
  R(g, ox + 3, oy + 3, 1, 6, B.leatherDk); R(g, ox + 5, oy + 3, 1, 6, B.leatherDk);
  if (phase === 0) {
    // tooling: an inset gold frame and a diamond
    R(g, ox + 8, oy + 4, 18, 1, B.giltDk); R(g, ox + 8, oy + 7, 18, 1, B.giltDk);
    R(g, ox + 8, oy + 4, 1, 4, B.giltDk); R(g, ox + 25, oy + 4, 1, 4, B.giltDk);
    P(16, 5, B.gilt); P(17, 5, B.gilt); P(15, 6, B.gilt); P(18, 6, B.gilt); P(16, 6, B.giltDk); P(17, 6, B.giltDk);
    // a palimpsest pair: the faint ghost of the other's writing on the cover
    if (paired) for (let x = 10; x < 25; x += 3) { if (x > 13 && x < 19) continue; R(g, ox + x, oy + 6, 2, 1, B.ghostInk); }
  } else {
    // opening: the cover parts in the middle and the pages show, wider each frame; open: flat, the gutter down the middle
    const half = phase === 1 ? 2 : phase === 2 ? 4 : 6;
    R(g, ox + 3, oy + 6 - Math.floor(half / 2), 26, half, B.page);
    R(g, ox + 3, oy + 6 - Math.floor(half / 2), 26, 1, B.pageDk);
    R(g, ox + 3, oy + 6, 26, 1, B.gutter);
    if (phase === 3) for (let x = 5; x < 27; x += 4) { R(g, ox + x, oy + 4, 3, 1, B.pageDk); R(g, ox + x + 1, oy + 7, 2, 1, B.pageDk); }
  }
}
function paintBookEw(g, ox, oy, colour, phase, paired) {
  // draw the ns picture on a scratch area of the same context through a transform: x' = y, y' = x (a transpose)
  g.save();
  g.setTransform(0, 1, 1, 0, ox, oy);
  paintBookNs(g, 0, 0, colour, phase, paired);
  g.restore();
}

function paintSheet(g) {
  g.clearRect(0, 0, SHEET_W, SHEET_H);
  paintA2(g, 0, 0, (x, y) => voidPixel(x, y, 0));
  [[32, 0], [48, 0], [32, 16], [48, 16]].forEach(([vx, vy], v) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) R(g, vx + x, vy + y, 1, 1, voidPixel(x, y, v)); });
  paintA2(g, 64, 0, (x, y, d) => marblePixel(x, y, d, 0));
  [[96, 0], [112, 0], [96, 16], [112, 16]].forEach(([vx, vy], v) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) R(g, vx + x, vy + y, 1, 1, marblePixel(x, y, 99, v)); });
  for (let f = 0; f < 16; f++) {
    const c = Math.floor(f / 4), p = f % 4;
    const [nx, ny] = L.ep8w_book_ns[f], [ex, ey] = L.ep8w_book_ew[f];
    paintBookNs(g, nx, ny, c, p, c > 0);
    paintBookEw(g, ex, ey, c, p, c > 0);
  }
}

// ------------------------------------------------------------------ system textures (16 x 16 cells, cached by the system)
export const NB = { N: 1, S: 2, W: 4, E: 8 };

/**
 * A bridge cell: a page lying over the void. mask: the 4 neighbours that are pages of the same book (no ink edge there).
 * lines: 'h' (glyph bars run across x) or 'v'. The 2 px shadow onto the void is the system's (paintShadow), outside the cell.
 */
export function paintBridgeCell(g, ox, oy, mask, lines, seed = 0) {
  const P = PAL.paper;
  R(g, ox, oy, 16, 16, P.base);
  // a page's lower half a touch shaded: it reads as paper with a fold, not as flat floor
  R(g, ox, oy + 12, 16, 4, P.shade);
  // glyph bars: never letters, short dashes in rows
  for (let r = 0; r < 4; r++) {
    for (let k = 0; k < 4; k++) {
      const h = hash(k * 5 + r, r * 3 + seed, 21);
      const len = 2 + Math.floor(h * 3);
      const a = 1 + k * 4, b = 2 + r * 4;
      if (lines === 'h') R(g, ox + a, oy + b, len, 1, h > 0.5 ? P.glyph : P.glyphDk);
      else R(g, ox + b, oy + a, 1, len, h > 0.5 ? P.glyph : P.glyphDk);
    }
  }
  // the gutter between the book's two page columns (an ns run) or rows (an ew run): a spread, not a plank
  if (lines === 'h' && (mask & NB.W)) { R(g, ox, oy, 1, 16, P.glyphDk); R(g, ox + 1, oy, 1, 16, P.shade); }
  if (lines === 'v' && (mask & NB.N)) { R(g, ox, oy, 16, 1, P.glyphDk); R(g, ox, oy + 1, 16, 1, P.shade); }
  if (!(mask & NB.N)) { R(g, ox, oy, 16, 1, P.ink); R(g, ox, oy + 1, 16, 1, P.hi); }
  if (!(mask & NB.S)) R(g, ox, oy + 15, 16, 1, P.ink);
  if (!(mask & NB.W)) R(g, ox, oy, 1, 16, P.ink);
  if (!(mask & NB.E)) R(g, ox + 15, oy, 1, 16, P.ink);
}
/** The 2 px drop shadow a bridge throws onto the void below it (16 x 2) or to its right (2 x 16). */
export function paintShadow(g, ox, oy, below) {
  if (below) R(g, ox + 1, oy, 15, 2, PAL.paper.shadow);
  else R(g, ox, oy + 1, 2, 15, PAL.paper.shadow);
}
/**
 * A wall cell: pages standing on edge on the floor, drawn as a raised block. 16 x 22, drawn 6 px above the cell: rows 0..15
 * the top (the pages' upper edges seen from above: thin lines across the run, bright paper), rows 16..21 the front face
 * (glyph bars, a darker foot). A neighbour wall cell to the south draws over this one's face, so a run reads as one block.
 * mask: the neighbours that are wall cells of the same book (no ink edge there). lines: 'h' (an ns run: edges run across
 * x) or 'v'.
 */
export function paintWallCell(g, ox, oy, mask, seed = 0, lines = 'h') {
  const P = PAL.paper;
  // the top: page edges seen from above
  R(g, ox, oy, 16, 16, P.hi);
  for (let k = 1; k < 16; k += 3) {
    if (lines === 'h') R(g, ox, oy + k, 16, 1, P.base);
    else R(g, ox + k, oy, 1, 16, P.base);
  }
  // the face
  R(g, ox, oy + 16, 16, 6, P.face);
  R(g, ox, oy + 20, 16, 2, P.faceDk);
  for (let k = 0; k < 3; k++) {
    const h = hash(k * 7, seed, 31);
    R(g, ox + 2 + k * 5, oy + 18, 2 + Math.floor(h * 2), 1, h > 0.5 ? P.glyph : P.glyphDk);
  }
  // ink: the open sides of the top, the edge between top and face, the foot
  if (!(mask & NB.N)) R(g, ox, oy, 16, 1, P.ink);
  R(g, ox, oy + 16, 16, 1, P.ink);
  R(g, ox, oy + 21, 16, 1, P.ink);
  if (!(mask & NB.W)) R(g, ox, oy, 1, 22, P.ink);
  if (!(mask & NB.E)) R(g, ox + 15, oy, 1, 22, P.ink);
}

/**
 * One 16 x 16 cell of an E8-tiles 9-slice (`page_bridge`, `page_wall`, `page_ghost`: 48 x 48, 16 px slices) for a neighbour
 * mask: four 8 x 8 quadrants, each from the edge slice where that side has no neighbour of the run, else from the middle. So a
 * run of any shape keeps its outline on its open sides only. t: the tile definition { x, y, nineSlice }; img: its sheet.
 */
export function paintSliceCell(g, img, t, mask, ox = 0, oy = 0) {
  const S = t.nineSlice || 16, h = S / 2;
  for (const [qx, qy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const col = qx === 0 ? (mask & NB.W ? 1 : 0) : (mask & NB.E ? 1 : 2);
    const row = qy === 0 ? (mask & NB.N ? 1 : 0) : (mask & NB.S ? 1 : 2);
    g.drawImage(img, t.x + col * S + qx * h, t.y + row * S + qy * h, h, h, ox + qx * h, oy + qy * h, h, h);
  }
}
/** The shipped sheet's piece ids the system draws from (E8-tiles, assets/tiles/ep8_tiles.json). */
export const SHEET_TILES = { bridge: 'page_bridge', wall: 'page_wall', ghost: 'page_ghost' };
export const REALM_OBJECT = 'realm_model';

/** The ghost's dots along one edge of a cell: 2 x 2 gold with a dark pixel under and right, every 4 px. */
export function paintGhostEdge(g, ox, oy, side) {
  const G = PAL.ghost;
  for (let t = 1; t < 16; t += 4) {
    let x, y;
    if (side === 'N') { x = ox + t; y = oy; } else if (side === 'S') { x = ox + t; y = oy + 13; } else if (side === 'W') { x = ox; y = oy + t; } else { x = ox + 13; y = oy + t; }
    R(g, x + 1, y + 1, 2, 2, G.dark);
    R(g, x, y, 2, 2, G.gold);
    R(g, x, y, 1, 1, G.goldHi);
  }
}

// ------------------------------------------------------------------ the realm models (a paper cut-out standing on the pages)
// 12 x 14 bitmaps: '#' paper, '.' nothing. Read as themselves at phone scale by outline, never by a word (DESIGN hard rule 2).
const MODELS = {
  willowmere: ['....####....', '..########..', '.##########.', '############', '##.######.##', '#..######..#', '#..##..##..#', '#...#..#...#', '....####....', '.....##.....', '.....##.....', '.....##.....', '....####....', '...######...'],
  hollow: ['....####....', '...#....#...', '..#......#..', '.#........#.', '.#........#.', '.#........#.', '.#........#.', '.#........#.', '..#......#..', '...#....#...', '....####....', '.....##.....', '....####....', '...######...'],
  emberpeak: ['.....##.....', '....####....', '...######...', '...######...', '..########..', '.....##.....', '............', '############', '.##########.', '....####....', '....####....', '...######...', '..########..', '..########..'],
  valewyn: ['.#..#..#..#.', '.##########.', '..########..', '..#.####.#..', '..########..', '..##.##.##..', '..########..', '..##.##.##..', '..########..', '..###..###..', '..###..###..', '.##########.', '############', '############'],
  desert: ['.....##.....', '...##..##...', '..#......#..', '.#...##...#.', '.#..#..#..#.', '#..#....#..#', '#..#....#..#', '.#..#..#..#.', '.#...##...#.', '..#......#..', '...##..##...', '.....##.....', '....####....', '..########..'],
  isles: ['......#.....', '......##....', '......###...', '......####..', '......#####.', '......#.....', '......#.....', '#..........#', '############', '.##########.', '..########..', '............', '............', '............'],
  north: ['.....##.....', '.....##.....', '....####....', '....####....', '...######...', '...##..##...', '...######...', '..########..', '..##.##.##..', '..########..', '.##########.', '.##.####.##.', '############', '############'],
};
export const REALM_MODELS = Object.keys(MODELS);
/** Paint a realm model (12 x 14 at ox, oy): paper with an ink outline and a right-hand shade. Unknown realm: nothing. */
export function paintRealm(g, ox, oy, realm) {
  const rows = MODELS[realm];
  if (!rows) return false;
  const P = PAL.realm;
  const on = (x, y) => y >= 0 && y < rows.length && x >= 0 && x < 12 && rows[y][x] === '#';
  for (let y = -1; y <= 14; y++) for (let x = -1; x <= 12; x++) {
    // folded paper: the left half lit, the right half in shade, a crease down the middle
    if (on(x, y)) R(g, ox + x, oy + y, 1, 1, x === 6 ? P.crease : x > 6 || !on(x + 1, y) ? P.shade : P.paper);
    else if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) R(g, ox + x, oy + y, 1, 1, P.ink);
  }
  return true;
}

// ------------------------------------------------------------------ the motes (3 frames of a 48 x 48 pattern, 'lighter')
/** The mote cells of frame k: [x, y] pixels of the pattern. Each mote rises 1 px a frame and wraps in the pattern. */
export function motePixels(k) {
  const S = MOTES.pattern, out = [];
  for (let n = 0; n < MOTES.count; n++) {
    const x = Math.floor(hash(n, 3, 41) * S), y0 = Math.floor(hash(n, 7, 43) * S);
    const y = (((y0 - k) % S) + S) % S;
    out.push([x, y]);
    if (n % 3 === 0) out.push([x, (y + 1) % S]);   // a few are two pixels tall: a streak, rising
  }
  return out;
}
export function paintMotes(g, k) {
  const [r, gg, b] = MOTE_RGB;
  g.clearRect(0, 0, MOTES.pattern, MOTES.pattern);
  for (const [x, y] of motePixels(k)) R(g, x, y, 1, 1, `rgb(${r},${gg},${b})`);
}
/** The worst luma one mote adds to a pixel (added light, Rec. 709), 0..1. */
export const moteLuma = () => (0.2126 * MOTE_RGB[0] + 0.7152 * MOTE_RGB[1] + 0.0722 * MOTE_RGB[2]) / 255;
export const TILE_PX = TILE;
