// Code-drawn art for sun and shade (E5-world, docs/EPISODE5_PLAN.md 5.1 and 9.1). Never in the first download.
//
// 1. Stand-in objects. E5-tiles owns the real pieces (assets/tiles/ep5.png, ep5_tiles.json: `sundial`, `obelisk`,
//    `standing_stone`, `low_block`, `pillar_gallery`, `lamp_cart`, `sun_plate`, `window_horizon`, the sun and moon gates).
//    ensureArt(db, engine, map) adds a code-drawn stand-in for every one of those ids the tile database does NOT have yet
//    (it runs after the pack's tiles merged and never replaces an id), on a small sheet `ep5_shade_fallback` registered
//    as an image. So the props, their collision and their frames always exist.
//      sundial         16x32, frames 0 dawn, 1 noon, 2 dusk: the stand below, the face on the tile above with three
//                      notches (dawn rose left, noon white top, dusk violet right), the current one large and lit
//      obelisk (h3) 16x48, standing_stone (h2) 16x32, low_block (h1) 16x32, pillar_gallery (h2) 16x32, lamp_cart 16x32
//      sun_plate       16x16 floor glyph, frames 0 sun dark, 1 sun lit, 2 moon dark, 3 moon lit (walkable)
//      window_horizon  16x16 on a wall cell, frames 0 dark, 1 lit
//      sun_gate_closed / _open, moon_gate_closed / _open   16x32 one-cell doors (GATE_SPRITES sun_gate, moon_gate)
// 2. Textures: the running-sand tile (3 frames of flowing streaks, used when the A1 `running_sand` terrain is missing) and
//    the dithered violet shade tile.

import { TILE } from '../../../world/tilemap.js';

export const SHEET = 'ep5_shade_fallback';
export const STONE_SPRITE = { 1: 'low_block', 2: 'standing_stone', 3: 'obelisk' };

// ochre sandstone, outlines in the ramp's own dark (DESIGN 6.1)
const SS = { hi: '#f2d49a', lt: '#e0b878', md: '#c4935a', dk: '#8f6236', ol: '#4c2f1d' };
const LAPIS = { hi: '#6f8ee0', lt: '#4a68c4', md: '#334c9a', dk: '#22336c', ol: '#141a3c' };
const GOLD = { hi: '#fff3b8', lt: '#ffd96a', md: '#e8a83a', dk: '#a8661e', ol: '#5a3412' };
export const NOTCH = { dawn: ['#ff7fa3', '#8c4e60'], noon: ['#ffffff', '#8e8e98'], dusk: ['#b48cff', '#5e4c86'] };
const VIOLET = { hi: '#e2ccff', lt: '#b48cff', md: '#7e5ad0', dk: '#4a3486', ol: '#22163e' };

// sheet layout: [x, y, w, h] per frame
const L = {
  sundial: [[0, 0, 16, 32], [16, 0, 16, 32], [32, 0, 16, 32]],
  obelisk: [[48, 0, 16, 48]],
  standing_stone: [[64, 0, 16, 32]],
  low_block: [[80, 0, 16, 32]],
  pillar_gallery: [[96, 0, 16, 32]],
  lamp_cart: [[112, 0, 16, 32]],
  sun_plate: [[128, 0, 16, 16], [144, 0, 16, 16], [160, 0, 16, 16], [176, 0, 16, 16]],
  window_horizon: [[192, 0, 16, 16], [208, 0, 16, 16]],
  sun_gate_closed: [[224, 0, 16, 32]],
  sun_gate_open: [[240, 0, 16, 32]],
  moon_gate_closed: [[256, 0, 16, 32]],
  moon_gate_open: [[272, 0, 16, 32]],
};
const SHEET_W = 288, SHEET_H = 48;

function objectDef(id) {
  const fr = L[id], [x, y, w, h] = fr[0], rows = h / TILE;
  const floor = id === 'sun_plate' || id === 'window_horizon';
  const open = /_open$/.test(id);
  return {
    sheet: SHEET, rect: [x, y, w, h], anchor: [0, rows - 1], frames: fr.length > 1 ? fr : undefined,
    footprint: floor || open ? [] : [[0, 0]], overheadRows: floor ? 0 : rows - 1, doorAt: open ? [0, 0] : null,
    collision: floor ? 'none' : 'solid', kind: /gate/.test(id) ? 'door' : 'prop', fallback: true,
    note: 'E5-world stand-in until E5-tiles ships this id',
  };
}

/** The ids this module can stand in for. */
export const FALLBACK_IDS = Object.keys(L);

let sheetCanvas = null;
/**
 * Add stand-ins for the ids the tile database `db` lacks, build the sheet once (engine.renderer) and register it as an image
 * (engine.assets.setImage), and put it in `map`'s sheet cache when given. Idempotent. Call it only after the pack's tile
 * fragment merged (world.js: onPackReady; the shade event types: on create), so a real id is never shadowed.
 */
export function ensureArt(db, engine, map = null) {
  if (!db) return [];
  db.objects = db.objects || {};
  const added = [];
  for (const id of FALLBACK_IDS) if (!db.objects[id]) { db.objects[id] = objectDef(id); added.push(id); }
  const uses = FALLBACK_IDS.some((id) => db.objects[id] && db.objects[id].sheet === SHEET);
  if (!uses) return added;
  const r = engine && engine.renderer;
  if (!sheetCanvas && r && typeof r.createLayer === 'function') {
    const layer = r.createLayer(SHEET_W, SHEET_H);
    paintSheet(layer.ctx);
    sheetCanvas = layer.canvas || null;
  }
  if (sheetCanvas && engine.assets && typeof engine.assets.setImage === 'function' && !(engine.assets.has && engine.assets.has(SHEET))) engine.assets.setImage(SHEET, sheetCanvas);
  if (sheetCanvas && map && map.sheetCache) map.sheetCache.set(SHEET, sheetCanvas);
  return added;
}

// ------------------------------------------------------------------ pixel helpers
const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
function disc(g, cx, cy, r, c) {
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(Math.max(0, (r + 0.5) * (r + 0.5) - dy * dy)));
    R(g, cx - half, cy + dy, half * 2 + 1, 1, c);
  }
}
/** A vertical slab with a lit left side, a shaded right side and an outline (sandstone or lapis). */
function slab(g, ox, x0, x1, y0, y1, P) {
  R(g, ox + x0 - 1, y0 - 1, x1 - x0 + 3, y1 - y0 + 2, P.ol);
  R(g, ox + x0, y0, x1 - x0 + 1, y1 - y0, P.md);
  R(g, ox + x0, y0, 2, y1 - y0, P.lt);
  R(g, ox + x0, y0, 1, y1 - y0, P.hi);
  R(g, ox + x1 - 1, y0, 2, y1 - y0, P.dk);
}

function paintDial(g, ox, cur) {
  // the stand (bottom tile): a sandstone column with a cap and a foot
  R(g, ox + 2, 28, 12, 4, SS.ol); R(g, ox + 3, 28, 10, 3, SS.md); R(g, ox + 3, 28, 10, 1, SS.lt);
  slab(g, ox, 5, 10, 18, 28, SS);
  R(g, ox + 2, 15, 12, 4, SS.ol); R(g, ox + 3, 15, 10, 3, SS.lt); R(g, ox + 3, 15, 10, 1, SS.hi); R(g, ox + 3, 17, 10, 1, SS.dk);
  // the face (top tile): a pale disc with a bronze rim, the gnomon, three notches
  disc(g, ox + 8, 8, 7, SS.ol);
  disc(g, ox + 8, 8, 6, '#8a5a2e');
  disc(g, ox + 8, 8, 5, '#c89a5c');
  disc(g, ox + 8, 8, 4, '#d8b072');
  R(g, ox + 5, 11, 6, 1, '#b8884e');
  const at = { dawn: [2, 8], noon: [8, 2], dusk: [14, 8] };
  const names = ['dawn', 'noon', 'dusk'];
  names.forEach((h, k) => {
    const [x, y] = at[h], big = k === cur, [on, off] = NOTCH[h];
    if (big) { R(g, ox + x - 2, y - 2, 5, 5, '#1c1226'); R(g, ox + x - 1, y - 1, 3, 3, on); R(g, ox + x, y, 1, 1, '#ffffff'); }
    else { R(g, ox + x - 1, y - 1, 2, 2, '#3a2416'); R(g, ox + x - 1, y - 1, 1, 1, off); }
  });
  // the gnomon: a dark pin from the centre toward the lit notch
  const [tx, ty] = at[names[cur]];
  const steps = 4;
  for (let s = 0; s <= steps; s++) {
    const x = Math.round(8 + ((tx - 8) * s) / (steps + 2)), y = Math.round(8 + ((ty - 8) * s) / (steps + 2));
    R(g, ox + x, y, 1, 1, '#3a2418');
  }
  R(g, ox + 7, 7, 2, 2, '#5a3a22');
}

function paintObelisk(g, ox) {
  // the pyramidion (gold-capped), the shaft tapering, the plinth; chisel scars where the names were
  R(g, ox + 6, 1, 4, 1, SS.ol); R(g, ox + 5, 2, 6, 1, SS.ol); R(g, ox + 6, 2, 4, 1, GOLD.lt); R(g, ox + 5, 3, 6, 1, GOLD.md); R(g, ox + 5, 3, 2, 1, GOLD.hi);
  R(g, ox + 4, 4, 8, 1, SS.ol);
  slab(g, ox, 5, 10, 5, 44, SS);
  for (const [x, y] of [[7, 12], [8, 13], [7, 19], [9, 20], [8, 26], [7, 27], [8, 33], [9, 34]]) R(g, ox + x, y, 1, 1, SS.dk);
  R(g, ox + 2, 43, 12, 5, SS.ol); R(g, ox + 3, 43, 10, 4, SS.md); R(g, ox + 3, 43, 10, 1, SS.lt); R(g, ox + 11, 44, 2, 3, SS.dk);
}
function paintStanding(g, ox) {
  R(g, ox + 5, 4, 6, 1, SS.ol); R(g, ox + 4, 5, 8, 1, SS.ol);
  slab(g, ox, 4, 11, 6, 30, SS);
  R(g, ox + 5, 5, 6, 1, SS.lt);
  for (const [x, y] of [[7, 11], [8, 12], [6, 18], [9, 22], [7, 25]]) R(g, ox + x, y, 1, 1, SS.dk);
  R(g, ox + 3, 29, 10, 3, SS.ol); R(g, ox + 4, 29, 8, 2, SS.dk);
}
function paintLow(g, ox) {
  R(g, ox + 1, 17, 14, 15, SS.ol);
  R(g, ox + 2, 18, 12, 12, SS.md); R(g, ox + 2, 18, 12, 2, SS.hi); R(g, ox + 2, 20, 2, 10, SS.lt); R(g, ox + 12, 20, 2, 10, SS.dk);
  R(g, ox + 2, 29, 12, 2, SS.dk);
  R(g, ox + 7, 24, 2, 1, SS.dk);
}
function paintPillar(g, ox) {
  R(g, ox + 3, 2, 10, 4, GOLD.ol); R(g, ox + 4, 3, 8, 2, GOLD.md); R(g, ox + 4, 3, 8, 1, GOLD.hi);
  slab(g, ox, 5, 10, 6, 28, LAPIS);
  for (let y = 9; y < 27; y += 4) R(g, ox + 5, y, 6, 1, GOLD.dk);
  R(g, ox + 3, 28, 10, 4, GOLD.ol); R(g, ox + 4, 28, 8, 3, GOLD.md); R(g, ox + 4, 28, 8, 1, GOLD.lt);
}
function paintLamp(g, ox) {
  // wheels and cart
  R(g, ox + 2, 26, 12, 4, '#3a2416'); R(g, ox + 3, 26, 10, 2, '#7a4a28'); R(g, ox + 3, 26, 10, 1, '#a8703c');
  disc(g, ox + 4, 30, 1, '#241812'); disc(g, ox + 11, 30, 1, '#241812');
  // the post and the brass lamp, its glass bright
  R(g, ox + 7, 18, 2, 8, '#5a3412'); R(g, ox + 7, 18, 1, 8, GOLD.dk);
  R(g, ox + 4, 7, 8, 12, GOLD.ol); R(g, ox + 5, 8, 6, 10, GOLD.md); R(g, ox + 5, 9, 6, 8, '#ffe27a'); R(g, ox + 6, 10, 4, 6, '#fff6c8');
  R(g, ox + 5, 5, 6, 2, GOLD.ol); R(g, ox + 6, 4, 4, 2, GOLD.md); R(g, ox + 7, 3, 2, 1, GOLD.lt);
}
function paintPlate(g, ox, moon, glow) {
  disc(g, ox + 8, 8, 7, '#3a2a20');
  disc(g, ox + 8, 8, 6, moon ? (glow ? '#5c4a96' : '#3e3456') : (glow ? '#c89034' : '#7a6040'));
  disc(g, ox + 8, 8, 5, moon ? (glow ? '#43347a' : '#2e2840') : (glow ? '#a8701e' : '#5e4a32'));
  if (!moon) {
    const c = glow ? GOLD.hi : '#b8954e';
    disc(g, ox + 8, 8, 2, c);
    for (const [x, y] of [[8, 3], [8, 13], [3, 8], [13, 8], [5, 5], [11, 5], [5, 11], [11, 11]]) R(g, ox + x, y, 1, 1, c);
    if (glow) R(g, ox + 8, 8, 1, 1, '#ffffff');
  } else {
    const c = glow ? VIOLET.hi : '#7c6e9e';
    disc(g, ox + 8, 8, 3, c);
    disc(g, ox + 9, 7, 2, glow ? '#43347a' : '#2e2840');
    if (glow) { R(g, ox + 4, 4, 1, 1, VIOLET.hi); R(g, ox + 12, 11, 1, 1, VIOLET.hi); }
  }
}
function paintWindow(g, ox, isLit) {
  R(g, ox + 4, 1, 8, 14, SS.ol);
  R(g, ox + 5, 2, 6, 12, isLit ? '#ffd36a' : '#1c2238');
  R(g, ox + 6, 1, 4, 1, SS.ol);
  if (isLit) { R(g, ox + 6, 3, 4, 10, '#fff2c0'); R(g, ox + 7, 4, 2, 8, '#ffffff'); }
  else { R(g, ox + 6, 3, 1, 8, '#2c3452'); }
  R(g, ox + 3, 14, 10, 2, SS.lt); R(g, ox + 3, 15, 10, 1, SS.dk);
}
function paintGate(g, ox, moon, open) {
  R(g, ox + 1, 2, 14, 30, SS.ol);
  R(g, ox + 2, 3, 12, 29, SS.md); R(g, ox + 2, 3, 12, 1, SS.hi); R(g, ox + 2, 4, 1, 28, SS.lt); R(g, ox + 13, 4, 1, 28, SS.dk);
  if (open) { R(g, ox + 4, 8, 8, 24, '#120c18'); R(g, ox + 4, 8, 8, 1, '#2a1a24'); return; }
  R(g, ox + 4, 8, 8, 24, SS.dk); R(g, ox + 5, 9, 6, 23, SS.md); R(g, ox + 8, 9, 1, 23, SS.dk);
  const P = moon ? VIOLET : GOLD;
  disc(g, ox + 8, 15, 3, P.ol); disc(g, ox + 8, 15, 2, P.lt);
  if (moon) disc(g, ox + 9, 14, 1, P.ol); else R(g, ox + 8, 15, 1, 1, P.hi);
}

function paintSheet(g) {
  if (!g || typeof g.fillRect !== 'function') return;
  g.clearRect(0, 0, SHEET_W, SHEET_H);
  for (let k = 0; k < 3; k++) paintDial(g, k * 16, k);
  paintObelisk(g, 48);
  paintStanding(g, 64);
  paintLow(g, 80);
  paintPillar(g, 96);
  paintLamp(g, 112);
  paintPlate(g, 128, false, false); paintPlate(g, 144, false, true); paintPlate(g, 160, true, false); paintPlate(g, 176, true, true);
  paintWindow(g, 192, false); paintWindow(g, 208, true);
  paintGate(g, 224, false, false); paintGate(g, 240, false, true); paintGate(g, 256, true, false); paintGate(g, 272, true, true);
}

// ------------------------------------------------------------------ textures
// Running sand: deep gold with flowing highlight streaks that drift down-right, 3 frames (the A1 cadence). Period 16 px, so
// every cell carries the same texture and the streaks run on across cells.
export const SAND_RUN = { base: '#eaa53a', ripple: '#c27a22', streak: '#ffda6e', bright: '#fff4c0', edge: '#fff8d4', edge2: '#ffe48a' };
const SHIFT = [0, 5, 11];
/** Paint one 16x16 frame of running sand at (ox, oy) of ctx g (frame 0..2). */
export function paintRunTile(g, ox, oy, frame) {
  const s = SHIFT[frame % 3];
  R(g, ox, oy, TILE, TILE, SAND_RUN.base);
  for (let y = 0; y < TILE; y++) {
    const band = y % 8;
    for (let x = 0; x < TILE; x++) {
      const u = (((x - s - y) % 16) + 16) % 16;
      const v = (((x - s - y + 8) % 16) + 16) % 16;
      const w = (((x - s + 3) % 16) + 16) % 16;
      if (band === 1 && u < 6) R(g, ox + x, oy + y, 1, 1, u === 2 || u === 3 ? SAND_RUN.bright : SAND_RUN.streak);
      else if (band === 5 && v < 4) R(g, ox + x, oy + y, 1, 1, SAND_RUN.streak);
      else if (band === 3 && w < 6) R(g, ox + x, oy + y, 1, 1, SAND_RUN.ripple);
      else if (band === 7 && (w + 5) % 16 < 3) R(g, ox + x, oy + y, 1, 1, SAND_RUN.ripple);
    }
  }
}
/** The bright rim along the sides of a running cell that face a cell that does not run (the soft edge glow). */
export function paintRunEdges(g, px, py, nb, frame) {
  const tw = (frame & 1) ? 1 : 0;
  if (!nb.N) { R(g, px, py, TILE, 1, SAND_RUN.edge); for (let x = tw; x < TILE; x += 2) R(g, px + x, py + 1, 1, 1, SAND_RUN.edge2); }
  if (!nb.S) { R(g, px, py + TILE - 1, TILE, 1, SAND_RUN.edge2); for (let x = 1 - tw; x < TILE; x += 2) R(g, px + x, py + TILE - 2, 1, 1, SAND_RUN.edge2); }
  if (!nb.W) { R(g, px, py, 1, TILE, SAND_RUN.edge); for (let y = tw; y < TILE; y += 2) R(g, px + 1, py + y, 1, 1, SAND_RUN.edge2); }
  if (!nb.E) { R(g, px + TILE - 1, py, 1, TILE, SAND_RUN.edge2); for (let y = 1 - tw; y < TILE; y += 2) R(g, px + TILE - 2, py + y, 1, 1, SAND_RUN.edge2); }
}

// Shade: DESIGN 6.2's dithered indigo, pushed violet so it reads as shade on ochre. A flat wash plus a 50% checker.
// On sand the strong violet carries the rule (the sand under it holds); on paving and every other floor a cooler, paler
// indigo-grey at lower opacity, so a shadow on paving reads as a shadow, not a rug (CRITIQUE_7 item 3). The cell where a
// stone's shadow starts (its root) takes one more step of dark under either style.
export const SHADE = { wash: '#2e1a62', washAlpha: 0.54, dot: '#1a0c3a', dotAlpha: 0.32, rim: '#140a30', rimAlpha: 0.4 };
export const SHADE_PAVE = { wash: '#343a66', washAlpha: 0.34, dot: '#1c2040', dotAlpha: 0.24, rim: '#181a36', rimAlpha: 0.22 };
export const SHADE_ROOT = { wash: '#1a1636', washAlpha: 0.2 };
/** Paint the 16x16 shade tile (wash plus 50% checker, no rim) at (ox, oy) of ctx g: cached once, then blitted per cell. */
export function paintShadeTile(g, ox, oy, P = SHADE) {
  g.globalAlpha = P.washAlpha; R(g, ox, oy, TILE, TILE, P.wash);
  g.globalAlpha = P.dotAlpha;
  g.fillStyle = P.dot;
  for (let y = 0; y < TILE; y++) for (let x = y & 1; x < TILE; x += 2) g.fillRect(ox + x, oy + y, 1, 1);
  g.globalAlpha = 1;
}
/**
 * One shaded cell from the cached tile `tile` (a canvas), with a darker rim on the sides whose neighbour is not shaded.
 * P: the style the tile was painted in (its rim); root: the cell where a stone's shadow starts (one more step of dark).
 */
export function paintShadeCell(g, px, py, nb, tile, P = SHADE, root = false) {
  if (tile) g.drawImage(tile, 0, 0, TILE, TILE, px, py, TILE, TILE);
  else paintShadeTile(g, px, py, P);
  if (root) { g.globalAlpha = SHADE_ROOT.washAlpha; R(g, px, py, TILE, TILE, SHADE_ROOT.wash); }
  if (!nb) { g.globalAlpha = 1; return; }
  g.globalAlpha = P.rimAlpha;
  if (!nb.N) R(g, px, py, TILE, 1, P.rim);
  if (!nb.S) R(g, px, py + TILE - 1, TILE, 1, P.rim);
  if (!nb.W) R(g, px, py, 1, TILE, P.rim);
  if (!nb.E) R(g, px + TILE - 1, py, 1, TILE, P.rim);
  g.globalAlpha = 1;
}

/** The four edge pieces of running sand (N, S, W, E) for frame k, as 16x16 transparent tiles side by side at (ox, oy). */
export function paintRunEdgeSet(g, ox, oy, frame) {
  const all = { N: true, S: true, W: true, E: true };
  ['N', 'S', 'W', 'E'].forEach((side, k) => paintRunEdges(g, ox + k * TILE, oy, { ...all, [side]: false }, frame));
}

/** A groove's worn rut (drawn on groove cells whose ground art has none: the shade block's `groove` rows). */
export function paintRut(r, px, py, vertical) {
  const lip = '#f2e2c0', floor = '#bca07a', edge = '#8c6e4e';
  if (vertical) {
    r.withAlpha(0.7, () => r.rect(px + 5, py, 6, TILE, floor));
    r.withAlpha(0.8, () => { r.rect(px + 5, py, 1, TILE, edge); r.rect(px + 10, py, 1, TILE, edge); });
    r.withAlpha(0.6, () => r.rect(px + 11, py, 1, TILE, lip));
    for (let y = 2; y < TILE; y += 5) r.withAlpha(0.5, () => r.rect(px + 7, py + y, 2, 1, edge));
  } else {
    r.withAlpha(0.7, () => r.rect(px, py + 5, TILE, 6, floor));
    r.withAlpha(0.8, () => { r.rect(px, py + 5, TILE, 1, edge); r.rect(px, py + 10, TILE, 1, edge); });
    r.withAlpha(0.6, () => r.rect(px, py + 11, TILE, 1, lip));
    for (let x = 2; x < TILE; x += 5) r.withAlpha(0.5, () => r.rect(px + x, py + 7, 1, 2, edge));
  }
}
