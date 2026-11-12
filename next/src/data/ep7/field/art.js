// Code-drawn art for name stones (E7-world, docs/EPISODE7_PLAN.md 4, 5.1 and 9.1). Never in the first download (ep7 pack).
//
// 1. Stand-ins. E7-tiles owns the real pieces (assets/tiles/ep7.png, ep7_tiles.json: the terrains `fade`, `snowfield` and
//    `icepath`, the objects `namestone` and `name_plate`). ensureArt(db, engine, map) adds a code-drawn stand-in for every one
//    of the ids below that the tile database does NOT have yet (after the pack's fragment merged; never replaces an id), on
//    the small sheet `ep7_names_fallback`, registered as an image. So props, collision and frames always exist.
//      fade        terrain, collision `void`, the lowest in terrainOrder: flat paper white with at most a faint grain. It
//                  must never read as walkable snow (plan 4, the phone rule): no footprints, no shading, no drifts.
//      snowfield   terrain, walkable: textured snow ground with drifts and pocks, its edge a snowbank lip over the fade
//      namestone   16x32, anchor [0, 1], 3 frames: 0 dim (a cold lamp), 1 lit, 2 lit and guttering (the oldest held
//                  flickers 1 <-> 2; under reduceMotion it rests on 2). A cairn with a lamp on a post above it.
//      name_plate  the same frames: an iceglass plate on a dark plinth with a bracket lamp (indoors)
// 2. Code textures for the system (./system.js): the held path (`icepath` when E7-tiles ships it, else packed blue-white ice
//    with an edge where it meets the fade), footprints on it, the ghost trail of footprints on an unheld path, the frost door
//    (clear ice with a frozen letter in it, and the melted floor after). PAL below is the recipe the contrast check measures.

import { TILE } from '../../../world/tilemap.js';

export const SHEET = 'ep7_names_fallback';
export const SHEET_W = 128, SHEET_H = 80;

export const PAL = {
  fade: { base: '#f0eee7', grain: '#e8e6df', grain2: '#f6f4ee' },
  snow: { base: '#c5cfdf', lt: '#d8e0ec', hi: '#e6ecf4', dk: '#a8b5cb', drift: '#b4c0d4', ol: '#8a98b2', lip: '#dfe6f0' },
  ice: { base: '#9cb3d4', lt: '#b4c7e2', hi: '#d2e0f2', dk: '#8099c0', edge: '#64799f', print: '#6a83aa', printLt: '#8ca2c6' },
  ghost: { print: '#a9b3c4', heel: '#b9c1cd' },
  frost: { ol: '#2b4a74', dk: '#5f93c4', md: '#8fc0e2', lt: '#bfe2f4', hi: '#f2fbff', paper: '#ece2c6', ink: '#6c5a3e' },
  melt: { wet: '#8db8d8', wetLt: '#b2d2ea', rim: '#4e6c90' },
  stone: { ol: '#232838', dk: '#3e4558', md: '#5b6478', lt: '#7d879b', hi: '#a3acbe', cut: '#2c3244', cutLit: '#9eeaff' },
  plate: { ol: '#1c2a40', dk: '#3b5a80', md: '#6e9cc6', lt: '#a6d0ec', hi: '#e2f6ff', plinth: '#2a2e3c', plinthLt: '#454b5e' },
  lamp: { iron: '#1e2230', ironLt: '#4a5064', cold: '#3a4258', coldLt: '#566078', lit: '#ffe48a', litHi: '#fffbe6', litDk: '#f0b448',
    gut: '#d88a36', gutHi: '#ffd27a', halo: '#fff2c0' },
};

const L = {
  namestone: [0, 1, 2].map((k) => [k * 16, 48, 16, 32]),
  name_plate: [0, 1, 2].map((k) => [48 + k * 16, 48, 16, 32]),
};
export const FALLBACK_OBJECTS = Object.keys(L);
export const FALLBACK_TERRAINS = ['fade', 'snowfield'];
/** Frames of a stone prop by its lamp: dim, lit, guttering (the oldest held). */
export const STONE_FRAMES = { dim: 0, lit: 1, gutter: 2 };

function objectDef(id) {
  const fr = L[id];
  return { sheet: SHEET, rect: fr[0], anchor: [0, 1], frames: fr, footprint: [[0, 0]], overheadRows: 1, doorAt: null,
    collision: 'solid', kind: 'prop', fallback: true, note: 'E7-world stand-in until E7-tiles ships this id' };
}
function terrainDef(id) {
  const x = id === 'fade' ? 0 : 64;
  return { sheet: SHEET, x, y: 0, kind: 'fill', collision: id === 'fade' ? 'void' : 'none',
    variants: [[x + 32, 0], [x + 48, 0], [x + 32, 16], [x + 48, 16]], variantWeights: id === 'fade' ? [6, 1, 1, 1] : [4, 2, 2, 2],
    fallback: true, note: `E7-world stand-in until E7-tiles ships ${id}` };
}

let sheetCanvas = null;
/**
 * Add stand-ins for the ids the tile database `db` lacks (objects; `fade` at the bottom of terrainOrder, `snowfield` above
 * it), build the sheet once (engine.renderer) and register it as an image, and put it in `map`'s sheet cache when given.
 * Idempotent. Without an engine (node, mapcheck) only the definitions are added. Returns the ids added.
 */
export function ensureArt(db, engine = null, map = null) {
  if (!db) return [];
  db.objects = db.objects || {};
  db.terrains = db.terrains || {};
  db.terrainOrder = db.terrainOrder || [];
  const added = [];
  for (const id of FALLBACK_OBJECTS) if (!db.objects[id]) { db.objects[id] = objectDef(id); added.push(id); }
  for (const id of FALLBACK_TERRAINS) if (!db.terrains[id]) { db.terrains[id] = terrainDef(id); added.push(id); }
  if (!db.terrainOrder.includes('fade')) db.terrainOrder.unshift('fade');
  if (!db.terrainOrder.includes('snowfield')) db.terrainOrder.splice(db.terrainOrder.indexOf('fade') + 1, 0, 'snowfield');
  const uses = FALLBACK_OBJECTS.some((id) => db.objects[id] && db.objects[id].sheet === SHEET)
    || FALLBACK_TERRAINS.some((id) => db.terrains[id] && db.terrains[id].sheet === SHEET);
  if (!uses) return added;
  const r = engine && engine.renderer;
  if (!sheetCanvas && r && typeof r.createLayer === 'function') {
    const layer = r.createLayer(SHEET_W, SHEET_H);
    if (layer.ctx && typeof layer.ctx.fillRect === 'function' && layer.canvas) paintSheet(layer.ctx);
    sheetCanvas = layer.canvas || null;
  }
  if (sheetCanvas && engine.assets && typeof engine.assets.setImage === 'function' && !(engine.assets.has && engine.assets.has(SHEET))) engine.assets.setImage(SHEET, sheetCanvas);
  if (sheetCanvas && map && map.sheetCache) map.sheetCache.set(SHEET, sheetCanvas);
  return added;
}

// ------------------------------------------------------------------ pixel helpers
const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer = (x, y) => (B4[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
/** A tiling 16 x 16 hash in 0..1 (wraps at 16 both ways). */
const hash = (x, y, s) => { const v = Math.sin(((x & 15) * 12.9898 + (y & 15) * 78.233 + s * 37.719)) * 43758.5453; return v - Math.floor(v); };

/**
 * Paint an A2 block (32 x 48 at ox, oy: the inner corners on top, the 32 x 32 island below) for a terrain whose pixel colour
 * is px(x, y, d): d is the distance in px from the nearest open edge (99 inside). Variants are painted by the caller.
 */
function paintA2(g, ox, oy, px) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const d = Math.min(x, y, 31 - x, 31 - y);
    R(g, ox + x, oy + 16 + y, 1, 1, px(x, y, d));
  }
  // inner corners: (2,0) TL, (3,0) TR, (2,1) BL, (3,1) BR in 8 px units; the open corner of each quarter is its own corner
  const corners = [[16, 0, 16, 0], [24, 0, 32, 0], [16, 8, 16, 16], [24, 8, 32, 16]];
  for (const [qx, qy, cx, cy] of corners) for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const d = Math.hypot(qx + x + 0.5 - cx, qy + y + 0.5 - cy) - 0.5;
    R(g, ox + qx + x, oy + qy + y, 1, 1, px(qx + x, qy + y, d < 3 ? d : 99));
  }
  // the preview quarter block (0..1, 0..1): a full fill
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) R(g, ox + x, oy + y, 1, 1, px(x, y, 99));
}

/** The fade: flat paper, a very faint grain (never shading, never prints). */
export function fadePixel(x, y, v = 0) {
  const h = hash(x, y, 3 + v);
  if (h > 0.94) return PAL.fade.grain;
  if (h < 0.03) return PAL.fade.grain2;
  return PAL.fade.base;
}
/** Snow ground: drifts (soft diagonal bands), pocks and sparkles; the edge a pale lip with a blue shadow under it. */
export function snowPixel(x, y, d = 99, v = 0) {
  if (d < 1) return PAL.snow.ol;
  if (d < 2) return PAL.snow.lip;
  if (d < 3) return PAL.snow.dk;
  const band = Math.sin((x * 0.55 + y * 0.9) + v * 1.7) + Math.sin((x * 0.21 - y * 0.37) * 1.3 + v);
  const h = hash(x, y, 11 + v);
  if (h > 0.965) return PAL.snow.hi;
  if (h < 0.04) return PAL.snow.dk;
  if (band > 1.15) return bayer(x, y) < 0.5 ? PAL.snow.drift : PAL.snow.base;
  if (band < -1.0) return bayer(x, y) < 0.4 ? PAL.snow.lt : PAL.snow.base;
  return PAL.snow.base;
}

function paintSheet(g) {
  g.clearRect(0, 0, SHEET_W, SHEET_H);
  paintA2(g, 0, 0, (x, y) => fadePixel(x, y, 0));
  [[32, 0], [48, 0], [32, 16], [48, 16]].forEach(([vx, vy], v) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) R(g, vx + x, vy + y, 1, 1, fadePixel(x, y, v)); });
  paintA2(g, 64, 0, (x, y, d) => snowPixel(x, y, d, 0));
  [[96, 0], [112, 0], [96, 16], [112, 16]].forEach(([vx, vy], v) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) R(g, vx + x, vy + y, 1, 1, snowPixel(x, y, 99, v)); });
  L.namestone.forEach(([x, y], k) => paintCairn(g, x, y, k));
  L.name_plate.forEach(([x, y], k) => paintPlate(g, x, y, k));
}

/** The lamp head (a small iron lantern) centred at (cx, top): 0 cold, 1 lit, 2 guttering. */
function paintLamp(g, cx, top, k) {
  const P = PAL.lamp;
  R(g, cx - 3, top, 6, 1, P.iron);                // the cap
  R(g, cx - 2, top - 1, 4, 1, P.ironLt);
  R(g, cx - 3, top + 1, 1, 5, P.iron); R(g, cx + 2, top + 1, 1, 5, P.iron);
  R(g, cx - 3, top + 6, 6, 1, P.iron);
  const glass = k === 0 ? P.cold : k === 1 ? P.lit : P.gut;
  R(g, cx - 2, top + 1, 4, 5, glass);
  if (k === 0) { R(g, cx - 1, top + 2, 1, 2, P.coldLt); }
  else if (k === 1) { R(g, cx - 1, top + 2, 2, 3, P.litHi); R(g, cx - 2, top + 5, 4, 1, P.litDk); }
  else { R(g, cx - 1, top + 3, 2, 2, P.gutHi); R(g, cx - 2, top + 1, 4, 1, P.litDk); }
  if (k > 0) { R(g, cx - 4, top + 3, 1, 1, P.halo); R(g, cx + 3, top + 3, 1, 1, P.halo); R(g, cx, top - 2, 1, 1, P.halo); }
}

/** A cairn of stacked stones with a cut face, the lamp set on its top stone. 16 x 32 (the cairn fills the lower cell and more). */
function paintCairn(g, ox, oy, k) {
  const S = PAL.stone;
  // a rounded stone: outline, body, a lit top edge, a shaded foot
  const stone = (x0, y0, w, h) => {
    R(g, ox + x0 + 1, oy + y0, w - 2, 1, S.ol); R(g, ox + x0 + 1, oy + y0 + h - 1, w - 2, 1, S.ol);
    R(g, ox + x0, oy + y0 + 1, 1, h - 2, S.ol); R(g, ox + x0 + w - 1, oy + y0 + 1, 1, h - 2, S.ol);
    R(g, ox + x0 + 1, oy + y0 + 1, w - 2, h - 2, S.md);
    R(g, ox + x0 + 2, oy + y0 + 1, w - 4, 1, S.hi); R(g, ox + x0 + 1, oy + y0 + 2, 1, h - 4, S.lt);
    R(g, ox + x0 + 1, oy + y0 + h - 2, w - 2, 1, S.dk); R(g, ox + x0 + w - 2, oy + y0 + 2, 1, h - 4, S.dk);
  };
  stone(1, 23, 14, 8);      // the foot stone (its face carries the cut marks)
  stone(3, 17, 10, 7);
  stone(5, 12, 7, 6);
  // the lamp on the top stone
  R(g, ox + 7, oy + 10, 2, 3, PAL.lamp.iron);
  paintLamp(g, ox + 8, oy + 3, k);
  // the cut face: a few marks, texture only (never letters)
  const cut = k === 0 ? S.cut : S.cutLit;
  for (const [x, y, w] of [[4, 25, 3], [8, 25, 2], [11, 25, 1], [4, 27, 2], [7, 27, 4], [5, 20, 2], [8, 20, 2]]) R(g, ox + x, oy + y, w, 1, cut);
  if (k > 0) { R(g, ox + 13, oy + 24, 1, 1, PAL.lamp.halo); R(g, ox + 2, oy + 18, 1, 1, PAL.lamp.halo); }
}

/** An iceglass plate on a dark plinth, a bracket lamp above it. 16 x 32. */
function paintPlate(g, ox, oy, k) {
  const P = PAL.plate;
  R(g, ox + 7, oy + 8, 2, 4, PAL.lamp.iron);
  paintLamp(g, ox + 8, oy + 2, k);
  // the plate: 12 x 13, clear ice with a darker rim
  R(g, ox + 2, oy + 12, 12, 13, P.ol);
  R(g, ox + 3, oy + 13, 10, 11, P.dk);
  R(g, ox + 4, oy + 14, 8, 9, P.md);
  for (let y = 0; y < 9; y++) for (let x = 0; x < 8; x++) if (bayer(x, y) < 0.18) R(g, ox + 4 + x, oy + 14 + y, 1, 1, P.lt);
  R(g, ox + 4, oy + 14, 1, 6, P.hi); R(g, ox + 5, oy + 14, 3, 1, P.hi);
  const cut = k === 0 ? P.dk : PAL.stone.cutLit;
  for (const [x, y, w] of [[6, 16, 4], [5, 18, 5], [6, 20, 3]]) R(g, ox + x, oy + y, w, 1, cut);
  // plinth
  R(g, ox + 1, oy + 25, 14, 6, P.plinth);
  R(g, ox + 1, oy + 25, 14, 1, P.plinthLt);
  R(g, ox, oy + 26, 1, 5, PAL.stone.ol); R(g, ox + 15, oy + 26, 1, 5, PAL.stone.ol);
  R(g, ox + 1, oy + 31, 14, 1, PAL.stone.ol);
}

// ------------------------------------------------------------------ the system's tiles
/** Neighbour bits for a path cell's edges: N 1, S 2, W 4, E 8 (set = connected, no rim). */
export const NB = { N: 1, S: 2, W: 4, E: 8 };

/** Footprints across a cell: orient 'h' (walked left-right) or 'v' (up-down). Two prints, offset like strides. */
function prints(orient) {
  return orient === 'h' ? [[3, 5], [9, 9]] : [[5, 3], [9, 9]];
}

/** A held path cell (code art): packed blue-white ice, an edge on sides that meet the fade, footprints along it. */
export function paintHeldCell(g, px, py, nb, orient, wx = 0, wy = 0) {
  const I = PAL.ice;
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    const h = hash(wx + x, wy + y, 21);
    let c = I.base;
    if (h > 0.9) c = I.lt;
    else if (h < 0.08) c = I.dk;
    else if (bayer(wx + x, wy + y) < 0.12) c = I.lt;
    R(g, px + x, py + y, 1, 1, c);
  }
  // a few long cracks in the packed ice
  const hx = Math.floor(hash(wx, wy, 5) * 10) + 3;
  R(g, px + hx, py + 2, 1, 3, I.dk); R(g, px + hx + 1, py + 5, 1, 2, I.dk); R(g, px + 2, py + 12, 3, 1, I.hi);
  // edges against the fade: a dark line and a lighter lip inside it
  if (!(nb & NB.N)) { R(g, px, py, TILE, 1, I.edge); R(g, px, py + 1, TILE, 1, I.hi); }
  if (!(nb & NB.S)) { R(g, px, py + TILE - 1, TILE, 1, I.edge); R(g, px, py + TILE - 2, TILE, 1, I.dk); }
  if (!(nb & NB.W)) { R(g, px, py, 1, TILE, I.edge); R(g, px + 1, py, 1, TILE, I.hi); }
  if (!(nb & NB.E)) { R(g, px + TILE - 1, py, 1, TILE, I.edge); R(g, px + TILE - 2, py, 1, TILE, I.dk); }
  paintPrints(g, px, py, orient, I.print, I.printLt, 3);
}

/** Footprints (held: 3 px prints with a lighter heel; ghost: 2 px). */
export function paintPrints(g, px, py, orient, c, heel, size = 3) {
  for (const [x, y] of prints(orient)) {
    if (orient === 'h') { R(g, px + x, py + y, size - 1, 2, c); if (heel) R(g, px + x + size - 1, py + y, 1, 2, heel); }
    else { R(g, px + x, py + y, 2, size - 1, c); if (heel) R(g, px + x, py + y + size - 1, 2, 1, heel); }
  }
}

/** An unheld path cell: the fade stays (drawn by the map), only a faint trail of prints over it. */
export function paintGhostCell(g, px, py, orient) {
  paintPrints(g, px, py, orient, PAL.ghost.print, PAL.ghost.heel, 2);
}

/**
 * A frost door while its stone is held: clear solid ice with a folded letter frozen in it, a 5 px cap on the cell above
 * (so it reads as a block, not a floor tile). Painted into a 16 x 21 box (the cap is rows 0..4).
 */
export function paintFrostBlock(g, ox, oy) {
  const F = PAL.frost;
  R(g, ox, oy + 1, 16, 20, F.ol);
  R(g, ox + 1, oy, 14, 1, F.ol);
  R(g, ox + 1, oy + 1, 14, 5, F.lt);             // the top face
  R(g, ox + 2, oy + 1, 10, 1, F.hi);
  R(g, ox + 1, oy + 6, 14, 14, F.md);             // the front face
  for (let y = 0; y < 14; y++) for (let x = 0; x < 14; x++) if (bayer(x, y) < 0.2) R(g, ox + 1 + x, oy + 6 + y, 1, 1, F.lt);
  R(g, ox + 1, oy + 18, 14, 2, F.dk);
  R(g, ox + 1, oy + 6, 14, 1, F.dk);
  // the frozen letter: folded paper, tilted, with two ink lines (a shape, never words)
  R(g, ox + 4, oy + 9, 8, 6, F.ink);
  R(g, ox + 5, oy + 10, 6, 4, F.paper);
  R(g, ox + 5, oy + 11, 5, 1, F.ink); R(g, ox + 6, oy + 13, 3, 1, F.ink);
  R(g, ox + 10, oy + 8, 2, 1, F.paper);
  // glints
  R(g, ox + 2, oy + 7, 1, 4, F.hi); R(g, ox + 3, oy + 7, 1, 1, F.hi); R(g, ox + 13, oy + 15, 1, 2, F.hi);
}
/** A frost door melted: the floor shows (drawn by the map); a thin wet patch where the ice stood. 16 x 16. */
export function paintMelt(g, px, py) {
  const M = PAL.melt;
  for (let y = 4; y < 14; y++) for (let x = 2; x < 14; x++) {
    const d = Math.hypot((x + 0.5 - 8) / 6, (y + 0.5 - 9) / 4.5);
    if (d > 1) continue;
    if (d > 0.82) { if (bayer(x, y) < 0.5) R(g, px + x, py + y, 1, 1, M.rim); }
    else if (bayer(x, y) < 0.35) R(g, px + x, py + y, 1, 1, d < 0.4 ? M.wetLt : M.wet);
  }
}

/** For tests and previews: paint the whole stand-in sheet onto a context. */
export function paintFallbackSheet(g) { paintSheet(g); }
