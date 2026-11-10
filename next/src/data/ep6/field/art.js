// Code-drawn art for gust lanes (E6-world, docs/EPISODE6_PLAN.md 4.4, 5.1 and 9.1). Never in the first download (ep6 pack).
//
// 1. Stand-ins. E6-tiles owns the real pieces (assets/tiles/ep6.png, ep6_tiles.json: the A1 terrains `cloudbank` and
//    `gust_lane`, the objects `vane`, `fan_vane`, `gust_mooring`). ensureArt(db, engine, map) adds a code-drawn stand-in for
//    every one of those ids the tile database does NOT have yet (after the pack's fragment merged; never replaces an id), on
//    the small sheet `ep6_wind_fallback`, registered as an image. So the props, their collision and their frames always exist.
//      cloudbank      terrain, collision `void`, the lowest in terrainOrder: soft periwinkle cloud, three fill variants
//      vane           16x32, 8 frames: (state * 4 + arrow), arrow 0 up 1 right 2 down 3 left, state 0 authored (white
//                     arrow) or 1 turned (gold arrow). The arrow is on the tile above the pole; the pole stands on its cell.
//      fan_vane       16x32, 8 frames as `vane`: a brass fan housing with a lever, the arrow plate on the tile above
//      gust_mooring   16x32, 12 frames: (downwind arrow * 3 + pennant frame); walkable (a ride stops on it)
// 2. Textures for the lane layer (./system.js): the lane body, directional streaks (4 arrows x 3 frames) and the chevrons
//    (4 arrows x 2 colours). The chevron is 7 x 7 px, white (authored) or gold (a turned group), with a dark trailing edge so
//    it reads on light cloud and on a dark duct alike: CHEVRON below is the recipe E6-tiles measures against.

import { TILE } from '../../../world/tilemap.js';

export const SHEET = 'ep6_wind_fallback';
export const SHEET_W = 192, SHEET_H = 144;

// sky palette (DESIGN 6.1 ramps; outlines in the ramp's own dark)
export const CLOUD = { ol: '#4a5a92', dk: '#6a7cb6', md: '#8192c8', lt: '#a2b2dc', hi: '#c6d1ee' };
export const LANE = { edge: '#8fa2d6', body: '#b8c7ee', dith: '#ccd8f5', streak: '#f6f9ff', streak2: '#e2eaff' };
/** Indoors (F2's ducts, `wind.kind: 'duct'`): the stream over a dark shaft, brass grille bars across it. */
export const DUCT = { edge: '#141824', body: '#2c3446', dith: '#363f54', bar: '#8a7448', barHi: '#c8a860' };
export const CHEVRON = { size: 7, white: '#ffffff', gold: '#ffd650', back: '#33427e', backGold: '#7a4c12' };
const BRASS = { hi: '#fff0b0', lt: '#f0c860', md: '#c89238', dk: '#8a5a1e', ol: '#3e2810' };
const WOOD = { hi: '#a87a50', lt: '#8a5e3a', md: '#6a4428', dk: '#48301c', ol: '#24160c' };
const IRON = { hi: '#c8ccd8', lt: '#9aa0b4', md: '#6c7288', dk: '#454a5e', ol: '#1e2030' };
const PENNANT = { lt: '#ff8a6a', md: '#e0503c', dk: '#8e2a26' };

const L = {
  vane: [0, 1, 2, 3, 4, 5, 6, 7].map((k) => [k * 16, 48, 16, 32]),
  fan_vane: [0, 1, 2, 3, 4, 5, 6, 7].map((k) => [k * 16, 80, 16, 32]),
  gust_mooring: Array.from({ length: 12 }, (_, k) => [k * 16, 112, 16, 32]),
};
export const FALLBACK_OBJECTS = Object.keys(L);
export const FALLBACK_TERRAINS = ['cloudbank'];

function objectDef(id) {
  const fr = L[id];
  const post = id === 'gust_mooring';
  return {
    sheet: SHEET, rect: fr[0], anchor: [0, 1], frames: fr, footprint: post ? [] : [[0, 0]], overheadRows: 1, doorAt: null,
    collision: post ? 'none' : 'solid', kind: 'prop', fallback: true, note: 'E6-world stand-in until E6-tiles ships this id',
  };
}
function terrainDef() {
  return { sheet: SHEET, x: 0, y: 0, kind: 'fill', collision: 'void', variants: [[32, 0], [48, 0], [32, 16], [48, 16]],
    variantWeights: [4, 2, 2, 1], fallback: true, note: 'E6-world stand-in until E6-tiles ships cloudbank' };
}

let sheetCanvas = null;
/**
 * Add stand-ins for the ids the tile database `db` lacks (objects, and `cloudbank` at the bottom of terrainOrder), build the
 * sheet once (engine.renderer) and register it as an image (engine.assets.setImage), and put it in `map`'s sheet cache when
 * given. Idempotent. Without an engine (node, mapcheck) only the definitions are added. Returns the ids added.
 */
export function ensureArt(db, engine = null, map = null) {
  if (!db) return [];
  db.objects = db.objects || {};
  db.terrains = db.terrains || {};
  db.terrainOrder = db.terrainOrder || [];
  const added = [];
  for (const id of FALLBACK_OBJECTS) if (!db.objects[id]) { db.objects[id] = objectDef(id); added.push(id); }
  if (!db.terrains.cloudbank) { db.terrains.cloudbank = terrainDef(); added.push('cloudbank'); }
  if (!db.terrainOrder.includes('cloudbank')) db.terrainOrder.unshift('cloudbank');
  const uses = FALLBACK_OBJECTS.some((id) => db.objects[id] && db.objects[id].sheet === SHEET) || (db.terrains.cloudbank && db.terrains.cloudbank.sheet === SHEET);
  if (!uses) return added;
  const r = engine && engine.renderer;
  if (!sheetCanvas && r && typeof r.createLayer === 'function') {
    const layer = r.createLayer(SHEET_W, SHEET_H);
    if (layer.ctx && typeof layer.ctx.fillRect === 'function') paintSheet(layer.ctx);
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

/** Soft cloud: puffs (torus distance in a 16 x 16 tile) over a periwinkle base, dithered steps (no smooth gradient). */
export function paintCloud(g, ox, oy, variant = 0) {
  const puffs = [[[4, 5, 5.2], [12, 11, 5.6], [13, 2, 3.4], [3, 14, 3.2]], [[8, 4, 5.4], [2, 11, 4.6], [13, 13, 4.2]],
    [[5, 9, 6.0], [13, 4, 4.0], [11, 14, 3.0]], [[10, 8, 5.8], [2, 2, 3.6], [4, 13, 3.4], [15, 15, 2.6]]][variant % 4];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    let k = 0;
    for (const [px, py, pr] of puffs) {
      const dx = Math.min(Math.abs(x - px), 16 - Math.abs(x - px)), dy = Math.min(Math.abs(y - py), 16 - Math.abs(y - py));
      k = Math.max(k, 1 - Math.sqrt(dx * dx + dy * dy) / pr);
    }
    // light from the top: the upper half of a puff is brighter
    const t = k + (hash(x, y, variant) - 0.5) * 0.18;
    const th = bayer(x, y);
    let c = CLOUD.md;
    if (t > 0.72) c = th < (t - 0.72) * 4 ? CLOUD.hi : CLOUD.lt;
    else if (t > 0.38) c = th < (t - 0.38) * 3 ? CLOUD.lt : CLOUD.md;
    else if (t < 0.08) c = th < 0.35 ? CLOUD.dk : CLOUD.md;
    R(g, ox + x, oy + y, 1, 1, c);
  }
}

/** The lane body for one cell: the brighter stream with a soft rim on the sides that have no lane neighbour. */
export function paintLaneBody(g, px, py, nb) {
  R(g, px, py, TILE, TILE, LANE.body);
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) if (bayer(px + x, py + y) < 0.28) R(g, px + x, py + y, 1, 1, LANE.dith);
  if (!nb.N) { R(g, px, py, TILE, 1, LANE.edge); for (let x = 0; x < TILE; x += 2) R(g, px + x + ((py >> 4) & 1), py + 1, 1, 1, LANE.edge); }
  if (!nb.S) { R(g, px, py + TILE - 1, TILE, 1, LANE.edge); for (let x = 0; x < TILE; x += 2) R(g, px + x, py + TILE - 2, 1, 1, LANE.edge); }
  if (!nb.W) { R(g, px, py, 1, TILE, LANE.edge); for (let y = 0; y < TILE; y += 2) R(g, px + 1, py + y, 1, 1, LANE.edge); }
  if (!nb.E) { R(g, px + TILE - 1, py, 1, TILE, LANE.edge); for (let y = 0; y < TILE; y += 2) R(g, px + TILE - 2, py + y + 1, 1, 1, LANE.edge); }
}

/** The duct body for one cell: a dark channel, grille bars every 4 px across both axes' rims, a hard rim on open sides. */
export function paintDuctBody(g, px, py, nb) {
  R(g, px, py, TILE, TILE, DUCT.body);
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) if (bayer(px + x, py + y) < 0.22) R(g, px + x, py + y, 1, 1, DUCT.dith);
  for (let k = 1; k < TILE; k += 4) { R(g, px + k, py, 1, TILE, DUCT.bar); R(g, px, py + k, TILE, 1, DUCT.bar); }
  for (let k = 1; k < TILE; k += 4) for (let j = 1; j < TILE; j += 4) R(g, px + k, py + j, 1, 1, DUCT.barHi);
  if (!nb.N) R(g, px, py, TILE, 2, DUCT.edge);
  if (!nb.S) R(g, px, py + TILE - 2, TILE, 2, DUCT.edge);
  if (!nb.W) R(g, px, py, 2, TILE, DUCT.edge);
  if (!nb.E) R(g, px + TILE - 2, py, 2, TILE, DUCT.edge);
}

/**
 * Streaks moving along the arrow: three dashes across the stream at fixed offsets, period 16 along it, shifted 5 px per frame
 * in the arrow's direction, in world coordinates (wx, wy: the cell's pixel origin) so a lane's streaks run on unbroken.
 */
export function paintStreaks(g, px, py, arrow, frame, wx = px, wy = py) {
  const along = arrow === 1 || arrow === 3 ? 'x' : 'y';
  const sign = arrow === 1 || arrow === 2 ? 1 : -1;
  const lanes = [[3, 0, 6, LANE.streak], [8, 7, 4, LANE.streak2], [12, 12, 5, LANE.streak]];
  for (const [across, phase, len, col] of lanes) {
    for (let s = 0; s < TILE; s++) {
      const w = along === 'x' ? wx + s : wy + s;
      const p = (((w - sign * frame * 5 - phase) % 16) + 16) % 16;
      if (p >= len) continue;
      if (along === 'x') R(g, px + s, py + across, 1, 1, col);
      else R(g, px + across, py + s, 1, 1, col);
    }
  }
}

// a chevron pointing right in a 7 x 7 box: '#' fill, '+' the trailing dark edge
const CHEV = [
  '##+....',
  '.##+...',
  '..##+..',
  '...##+.',
  '..##+..',
  '.##+...',
  '##+....',
];
/** Rotate a right-pointing (x, y) in a 7 x 7 box to arrow a (0 up, 1 right, 2 down, 3 left). */
const rot = (x, y, a) => (a === 1 ? [x, y] : a === 3 ? [6 - x, y] : a === 2 ? [y, x] : [y, 6 - x]);
/** One chevron, centered on (cx, cy) (its 7 x 7 box from cx - 3), colour by state: 'white' | 'gold'. */
export function paintChevron(g, cx, cy, arrow, tone = 'white') {
  const fill = tone === 'gold' ? CHEVRON.gold : CHEVRON.white, back = tone === 'gold' ? CHEVRON.backGold : CHEVRON.back;
  for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
    const c = CHEV[y][x];
    if (c === '.') continue;
    const [rx, ry] = rot(x, y, arrow);
    R(g, cx - 3 + rx, cy - 3 + ry, 1, 1, c === '#' ? fill : back);
  }
}

/** A small arrow (vane heads, the arrow plate over fans): a 9-px arrow with an outline, tip toward the arrow. */
function paintArrow(g, cx, cy, a, fill, dark, ol) {
  // pointing right: shaft x -4..1, head at 2..4
  const px = [];
  for (let x = -4; x <= 1; x++) px.push([x, 0, 'f']);
  px.push([-4, -1, 'd'], [-5, -1, 'd'], [-4, 1, 'd'], [-5, 1, 'd'], [-5, 0, 'd']);   // the tail feathers
  for (let k = 0; k <= 3; k++) for (let y = -(3 - k); y <= 3 - k; y++) px.push([1 + k, y, k === 3 || Math.abs(y) === 3 - k ? 'd' : 'f']);
  const at = (x, y) => (a === 1 ? [x, y] : a === 3 ? [-x, y] : a === 2 ? [-y, x] : [y, -x]);
  // outline pass, then fill
  for (const [x, y] of px) { const [rx, ry] = at(x, y); for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) R(g, cx + rx + ox, cy + ry + oy, 1, 1, ol); }
  for (const [x, y, k] of px) { const [rx, ry] = at(x, y); R(g, cx + rx, cy + ry, 1, 1, k === 'f' ? fill : dark); }
}

function paintVane(g, ox, oy, frame) {
  const a = frame % 4, turned = frame >= 4;
  // the pole: iron, from the stand up into the upper tile
  R(g, ox + 7, oy + 9, 3, 21, IRON.ol); R(g, ox + 8, oy + 9, 1, 21, IRON.lt); R(g, ox + 9, oy + 10, 1, 19, IRON.dk);
  // the stand: a stone foot with a brass collar
  R(g, ox + 3, oy + 27, 10, 5, IRON.ol); R(g, ox + 4, oy + 27, 8, 4, IRON.md); R(g, ox + 4, oy + 27, 8, 1, IRON.hi);
  R(g, ox + 6, oy + 22, 5, 3, BRASS.ol); R(g, ox + 7, oy + 22, 3, 2, BRASS.lt);
  // the cardinal cross, small, under the arrow
  R(g, ox + 4, oy + 12, 9, 1, IRON.dk); R(g, ox + 8, oy + 12, 1, 1, BRASS.lt);
  // the head: the arrow, white with a blue outline (authored) or gold (turned)
  if (turned) paintArrow(g, ox + 8, oy + 6, a, BRASS.hi, BRASS.md, BRASS.ol);
  else paintArrow(g, ox + 8, oy + 6, a, '#ffffff', '#9fb0e0', '#1c2650');
  R(g, ox + 8, oy + 6, 1, 1, turned ? BRASS.dk : '#5a6aa8');
}

function paintFan(g, ox, oy, frame) {
  const a = frame % 4, turned = frame >= 4;
  // the housing (bottom tile): brass box, a round grille, blades
  R(g, ox + 1, oy + 17, 14, 15, BRASS.ol); R(g, ox + 2, oy + 18, 12, 13, BRASS.md); R(g, ox + 2, oy + 18, 12, 2, BRASS.lt);
  R(g, ox + 13, oy + 18, 1, 13, BRASS.dk);
  R(g, ox + 4, oy + 21, 8, 8, IRON.ol); R(g, ox + 5, oy + 22, 6, 6, IRON.dk);
  const bl = turned ? [[5, 22], [9, 26], [6, 27], [10, 22]] : [[7, 22], [7, 27], [5, 24], [10, 24]];
  for (const [x, y] of bl) R(g, ox + x, oy + y, 2, 2, IRON.lt);
  R(g, ox + 7, oy + 24, 2, 2, BRASS.hi);
  // the lever on the right side
  R(g, ox + 13, oy + (turned ? 13 : 20), 2, 6, IRON.ol); R(g, ox + 13, oy + (turned ? 12 : 19), 3, 2, '#d03a2e');
  // the arrow plate (top tile): dark plate, the arrow
  R(g, ox + 1, oy + 0, 14, 13, IRON.ol); R(g, ox + 2, oy + 1, 12, 11, '#2a3048');
  if (turned) paintArrow(g, ox + 8, oy + 6, a, BRASS.hi, BRASS.md, BRASS.ol);
  else paintArrow(g, ox + 8, oy + 6, a, '#ffffff', '#9fb0e0', '#1c2650');
  R(g, ox + 7, oy + 13, 2, 4, IRON.dk);
}

function paintPost(g, ox, oy, frame) {
  const a = Math.floor(frame / 3), k = frame % 3;
  // the post: dark wood, a brass cap, a rope band; foot in the stream (bottom tile), top in the tile above
  R(g, ox + 6, oy + 6, 5, 25, WOOD.ol); R(g, ox + 7, oy + 7, 3, 24, WOOD.md); R(g, ox + 7, oy + 7, 1, 24, WOOD.lt); R(g, ox + 9, oy + 8, 1, 22, WOOD.dk);
  R(g, ox + 5, oy + 4, 7, 3, BRASS.ol); R(g, ox + 6, oy + 4, 5, 2, BRASS.lt); R(g, ox + 6, oy + 4, 2, 1, BRASS.hi);
  for (let y = 18; y <= 22; y += 2) { R(g, ox + 6, oy + y, 5, 1, '#d8c08a'); R(g, ox + 6, oy + y + 1, 5, 1, '#9a7c48'); }
  R(g, ox + 4, oy + 29, 9, 2, '#e9f0ff');   // the foam where the stream breaks on it
  R(g, ox + 3, oy + 30, 2, 1, '#f6f9ff'); R(g, ox + 12, oy + 30, 2, 1, '#f6f9ff');
  // the pennant, streaming downwind from the top (3 frames of ripple)
  const wave = [[0, 0, 1, 1, 0], [0, 1, 1, 0, 0], [1, 1, 0, 0, 1]][k];
  if (a === 1 || a === 3) {
    const s = a === 1 ? 1 : -1, x0 = a === 1 ? 11 : 5;
    for (let j = 0; j < 5; j++) {
      const len = 5 - j, x = x0 + s * j, y = 6 + wave[j];
      R(g, ox + x, oy + y - 1, 1, 1, PENNANT.dk);
      for (let q = 0; q < Math.max(1, len - 2); q++) R(g, ox + x, oy + y + q, 1, 1, q === 0 ? PENNANT.lt : PENNANT.md);
      R(g, ox + x, oy + y + Math.max(1, len - 2), 1, 1, PENNANT.dk);
    }
  } else {
    // up: the pennant flies straight up off the cap; down: it streams down along the post's front
    const up = a === 0;
    for (let j = 0; j < 4; j++) {
      const y = up ? 3 - j : 8 + j, x = 11 + wave[j];
      if (y < 0) continue;
      R(g, ox + x, oy + y, 2, 1, j === 0 ? PENNANT.lt : PENNANT.md);
      R(g, ox + x + 2, oy + y, 1, 1, PENNANT.dk);
    }
  }
}

function paintSheet(g) {
  g.clearRect(0, 0, SHEET_W, SHEET_H);
  // cloudbank: the A2 block (one texture throughout: cloudbank is the lowest terrain, always a full fill) and four variants
  for (let ty = 0; ty < 3; ty++) for (let tx = 0; tx < 2; tx++) paintCloud(g, tx * 16, ty * 16, 0);
  paintCloud(g, 32, 0, 0); paintCloud(g, 48, 0, 1); paintCloud(g, 32, 16, 2); paintCloud(g, 48, 16, 3);
  L.vane.forEach(([x, y], k) => paintVane(g, x, y, k));
  L.fan_vane.forEach(([x, y], k) => paintFan(g, x, y, k));
  L.gust_mooring.forEach(([x, y], k) => paintPost(g, x, y, k));
}

/** A code-drawn arrow plate over a vane whose art has no arrow frames (fewer than 4 frames): a world-pixel overlay. */
export function paintVaneHead(g, cx, cy, arrow, turned) {
  if (arrow < 0) { R(g, cx - 3, cy - 1, 7, 3, '#1c2650'); R(g, cx - 2, cy, 5, 1, '#9fb0e0'); return; }
  if (turned) paintArrow(g, cx, cy, arrow, BRASS.hi, BRASS.md, BRASS.ol);
  else paintArrow(g, cx, cy, arrow, '#ffffff', '#9fb0e0', '#1c2650');
}
/** For tests and previews: paint the whole stand-in sheet onto a context. */
export function paintFallbackSheet(g) { paintSheet(g); }
