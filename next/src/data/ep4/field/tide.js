// Tide locks, the rule (E4-world, docs/EPISODE4_PLAN.md 4.4 and 5.1). Pure: no DOM, no canvas, no audio, no timers, no
// randomness. The field (./system.js) and the map tools (tools/maps/ep4_check.mjs) both read water through this file.
//
// A map with tide locks carries a `tide` block (docs/WORLD_EP4.md has the full contract):
//   tide: {
//     basins: { a: { start: 1, levels: 3, wheel: 'wh_a', inlet?: [[x, y], ...] }, ... },   // at most 3 basins
//     basin:  [ '....aaaa..', ... ],   // which basin a cell belongs to ('.' = none), same size as ground
//     height: [ '....0012..', ... ],   // floor height inside its basin: 0 channel floor, 1 walkway, 2 gallery
//   }
// At level L a basin cell of height h is WATER when h < L (and, when the basin lists an `inlet`, the water can reach it
// from an inlet cell through water, never through a dam: a block standing on a basin cell). Level 0 is all dry.
//   pontoon (rides, default [1, 2]): on a water cell at a level in `rides` it FLOATS (walkable); on a water cell at any
//     other level it is SUNK (water); on a dry cell it is GROUNDED (solid).
//   forgery (h, default its cell's height): SOLID until washed; washed for good the first time its basin's level is above
//     h while its wet cell (its own cell, or for a seal set in a wall face the basin cell beside it) is water.
//   floodgate (basin, at, latch): open while its basin's level is at least `at`; latched ones stay open once opened.
//
//   compile(map)                       the parsed model (cached per map object)
//   levelsOf(map, state)               { basinId: level } (state.levels over each basin's start)
//   water(map, state)                  Set of cell indices that hold water (drawn as water; pontoons float on top)
//   classify(map, state)               { water, flooded, floats, grounded, sunk, solid } (sets of cell indices)
//   flooded(map, state) / solid(map, state)   collision `water` cells / collision `solid` cells (plan 5.1 names)
//   washes(map, state)                 forgery ids newly washed in this state (state.washed: the ones already washed)
//   gateOpen(map, state, fg)           is floodgate record `fg` open in this state (state.latched: latched ids)
//   nextLevel(level, levels)           low, mid, high, low (or low, mid, low)
//   tideFlag(key, levelsOf)            the virtual flags `tide:<basin><op><n>` (op one of >= <= = < >), else undefined

export const MAX_BASINS = 3;
export const TIDE_TYPES = new Set(['tidewheel', 'tidepost', 'pontoon', 'forgery', 'floodgate']);
const ORTHO = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const cache = new WeakMap();

const list = (v) => (v == null ? [] : Array.isArray(v) && Array.isArray(v[0]) ? v : Array.isArray(v) && typeof v[0] === 'number' ? [v] : []);

/** Parse a map's tide block once. Returns null for a map without one. errors: authoring problems found while parsing. */
export function compile(map) {
  if (!map || !map.tide) return null;
  const hit = cache.get(map);
  if (hit && hit.src === map.tide && hit.nev === (map.events || []).length) return hit;
  const T = map.tide, errors = [];
  const H = (map.ground || []).length, W = H ? map.ground[0].length : 0;
  const N = W * H;
  const ids = Object.keys(T.basins || {});
  if (!ids.length) errors.push('tide: no basins');
  if (ids.length > MAX_BASINS) errors.push(`tide: ${ids.length} basins (at most ${MAX_BASINS})`);
  const basins = {};
  for (const id of ids) {
    const b = T.basins[id] || {};
    const levels = b.levels === 2 ? 2 : 3;
    if (b.levels != null && b.levels !== 2 && b.levels !== 3) errors.push(`tide basin ${id}: levels ${b.levels} (2 or 3)`);
    if (id.length !== 1) errors.push(`tide basin ${id}: ids are one character (the basin rows use them)`);
    const start = Math.max(0, Math.min(levels - 1, b.start | 0));
    if ((b.start | 0) !== start) errors.push(`tide basin ${id}: start ${b.start} is not a level`);
    basins[id] = { id, k: ids.indexOf(id), levels, top: levels - 1, start, wheel: b.wheel || null, inletXY: list(b.inlet), inlet: null, cells: [] };
  }
  const basinAt = new Int8Array(N).fill(-1);
  const height = new Int8Array(N).fill(-1);
  const rowsB = T.basin || [], rowsH = T.height || [];
  if (rowsB.length !== H || rowsH.length !== H) errors.push(`tide: basin/height rows ${rowsB.length}/${rowsH.length}, ground has ${H}`);
  for (let y = 0; y < H; y++) {
    const rb = rowsB[y] || '', rh = rowsH[y] || '';
    if (rb.length && rb.length !== W) errors.push(`tide: basin row ${y} has ${rb.length} columns, expected ${W}`);
    if (rh.length && rh.length !== W) errors.push(`tide: height row ${y} has ${rh.length} columns, expected ${W}`);
    for (let x = 0; x < W; x++) {
      const ch = rb[x] || '.';
      if (ch === '.' || ch === ' ') continue;
      const b = basins[ch];
      if (!b) { errors.push(`tide: basin '${ch}' at ${x},${y} is not declared`); continue; }
      const hc = rh[x];
      const h = hc >= '0' && hc <= '9' ? +hc : -1;
      if (h < 0) { errors.push(`tide: basin cell ${x},${y} has no height digit`); continue; }
      if (h > 2) errors.push(`tide: height ${h} at ${x},${y} (0, 1 or 2)`);
      const i = y * W + x;
      basinAt[i] = b.k; height[i] = Math.min(2, h);
      b.cells.push(i);
    }
  }
  for (const b of Object.values(basins)) {
    if (!b.inletXY.length) continue;
    b.inlet = [];
    for (const [x, y] of b.inletXY) {
      const i = y * W + x;
      if (x < 0 || y < 0 || x >= W || y >= H || basinAt[i] !== b.k) errors.push(`tide basin ${b.id}: inlet ${x},${y} is not one of its cells`);
      else b.inlet.push(i);
    }
  }
  const model = { src: T, nev: (map.events || []).length, W, H, N, ids, basins, basinAt, height, errors,
    wheels: [], posts: [], pontoons: [], forgeries: [], floodgates: [] };
  const basinOfCell = (i) => (i >= 0 && i < N && basinAt[i] >= 0 ? ids[basinAt[i]] : null);
  model.basinOfCell = basinOfCell;
  for (const e of map.events || []) {
    if (!e || !TIDE_TYPES.has(e.type)) continue;
    const i = e.y * W + e.x;
    const inb = e.x >= 0 && e.y >= 0 && e.x < W && e.y < H;
    const b = e.basin || basinOfCell(i);
    if (!b || !basins[b]) { errors.push(`${e.type} ${e.id}: no basin (stand it on a basin cell or give it basin:)`); continue; }
    const rec = { id: e.id, ev: e, x: e.x, y: e.y, i: inb ? i : -1, b };
    if (e.type === 'tidewheel') { rec.crank = e.crank !== false; model.wheels.push(rec); }
    else if (e.type === 'tidepost') model.posts.push(rec);
    else if (e.type === 'pontoon') {
      if (basinOfCell(i) !== b) errors.push(`pontoon ${e.id}: stands off basin ${b}`);
      rec.h = height[i]; rec.rides = new Set(Array.isArray(e.rides) ? e.rides : [1, 2]);
      model.pontoons.push(rec);
    } else if (e.type === 'forgery') {
      const own = basinOfCell(i) === b;
      rec.h = e.h != null ? e.h | 0 : own ? height[i] : 0;
      rec.wet = own ? i : -1;
      if (!own) for (const [dx, dy] of [[0, 1], [0, -1], [-1, 0], [1, 0]]) {
        const x = e.x + dx, y = e.y + dy, j = y * W + x;
        if (x >= 0 && y >= 0 && x < W && y < H && basinOfCell(j) === b) { rec.wet = j; break; }
      }
      if (rec.wet < 0) errors.push(`forgery ${e.id}: no cell of basin ${b} on or beside it`);
      model.forgeries.push(rec);
    } else if (e.type === 'floodgate') {
      rec.at = e.at == null ? basins[b].top : e.at | 0;
      rec.latch = !!(e.latch || e.flag);
      rec.w = e.w || 2;
      if (rec.at < 1 || rec.at > basins[b].top) errors.push(`floodgate ${e.id}: at ${e.at} is not a raised level of basin ${b}`);
      model.floodgates.push(rec);
    }
  }
  for (const b of Object.values(basins)) {
    const w = model.wheels.filter((r) => r.b === b.id);
    if (b.wheel && !w.some((r) => r.id === b.wheel)) errors.push(`tide basin ${b.id}: wheel ${b.wheel} is not a tidewheel of this basin`);
    if (!w.length) errors.push(`tide basin ${b.id}: no tidewheel turns it`);
  }
  cache.set(map, model);
  return model;
}

/** { basinId: level } for a state (missing levels are the basin's start). */
export function levelsOf(map, state = {}) {
  const m = compile(map);
  const out = {};
  if (!m) return out;
  const L = state.levels || {};
  for (const id of m.ids) {
    const b = m.basins[id];
    const v = L[id];
    out[id] = v == null ? b.start : Math.max(0, Math.min(b.top, v | 0));
  }
  return out;
}

/** The next mark of a wheel: low, mid, high, low (3 levels) or low, mid, low (2). */
export function nextLevel(level, levels) { return ((level | 0) + 1) % (levels === 2 ? 2 : 3); }

/** Cells holding water now (Set of indices). state: { levels?, dams?: Iterable<index> (block cells) }. */
export function water(map, state = {}) {
  const m = compile(map);
  const out = new Set();
  if (!m) return out;
  const lv = levelsOf(map, state);
  const dams = state.dams instanceof Set ? state.dams : new Set(state.dams || []);
  for (const id of m.ids) {
    const b = m.basins[id], L = lv[id];
    if (L <= 0) continue;
    if (!b.inlet) { for (const i of b.cells) if (m.height[i] < L) out.add(i); continue; }
    // an inlet basin: the water spreads from its inlets through water cells, never through a dam
    const q = [];
    for (const i of b.inlet) if (m.height[i] < L && !dams.has(i) && !out.has(i)) { out.add(i); q.push(i); }
    while (q.length) {
      const i = q.pop(), x = i % m.W, y = (i / m.W) | 0;
      for (const [dx, dy] of ORTHO) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= m.W || ny >= m.H) continue;
        const j = ny * m.W + nx;
        if (out.has(j) || m.basinAt[j] !== b.k || m.height[j] >= L || dams.has(j)) continue;
        out.add(j); q.push(j);
      }
    }
  }
  return out;
}

/** Everything a state means for the floor: { levels, water, flooded, floats, grounded, sunk, solid, washedSolid }. */
export function classify(map, state = {}) {
  const m = compile(map);
  const lv = levelsOf(map, state);
  const wat = water(map, state);
  const floats = new Set(), grounded = new Set(), sunk = new Set(), solidSet = new Set();
  const skip = state.absent instanceof Set ? state.absent : new Set(state.absent || []);
  if (m) {
    for (const p of m.pontoons) {
      if (skip.has(p.id) || p.i < 0) continue;
      if (!wat.has(p.i)) { grounded.add(p.i); solidSet.add(p.i); }
      else if (p.rides.has(lv[p.b])) floats.add(p.i);
      else sunk.add(p.i);
    }
    const washed = state.washed instanceof Set ? state.washed : new Set(state.washed || []);
    for (const f of m.forgeries) if (!skip.has(f.id) && f.i >= 0 && !washed.has(f.id)) solidSet.add(f.i);
  }
  const flood = new Set();
  for (const i of wat) if (!floats.has(i) && !solidSet.has(i)) flood.add(i);
  return { levels: lv, water: wat, flooded: flood, floats, grounded, sunk, solid: solidSet };
}

/** Plan 5.1: the cells that are collision `water` now (water minus floating pontoons and solid things). */
export function flooded(map, state = {}) { return classify(map, state).flooded; }
/** Plan 5.1: the cells that are collision `solid` now (grounded pontoons, unwashed forgeries). */
export function solid(map, state = {}) { return classify(map, state).solid; }

/** Forgery ids washed by this state that are not in state.washed yet (monotone: a washed seal never comes back). */
export function washes(map, state = {}, wat = null) {
  const m = compile(map);
  if (!m) return [];
  const lv = levelsOf(map, state);
  const w = wat || water(map, state);
  const washed = state.washed instanceof Set ? state.washed : new Set(state.washed || []);
  const skip = state.absent instanceof Set ? state.absent : new Set(state.absent || []);
  const out = [];
  for (const f of m.forgeries) {
    if (washed.has(f.id) || skip.has(f.id)) continue;
    if (lv[f.b] > f.h && (f.wet < 0 || w.has(f.wet))) out.push(f.id);
  }
  return out;
}

/** Is a floodgate record open in this state (its level reached, or latched: state.latched holds its id)? */
export function gateOpen(map, state, fg) {
  const lv = levelsOf(map, state);
  const latched = state && state.latched instanceof Set ? state.latched : new Set((state && state.latched) || []);
  return latched.has(fg.id) || lv[fg.b] >= fg.at;
}

/** A compact key for a level state ("a1b0"). */
export function levelKey(map, state = {}) {
  const lv = levelsOf(map, state);
  return Object.keys(lv).map((k) => k + lv[k]).join('');
}

const FLAG_RE = /^tide:([A-Za-z0-9_])(>=|<=|=|<|>)(\d)$/;
/** Is `key` a virtual tide flag? */
export function isTideFlag(key) { return typeof key === 'string' && FLAG_RE.test(key); }
/**
 * The virtual flag `tide:<basin><op><n>` (e.g. `tide:c>=2`: basin c is high) against `levels` ({ id: level }). Lets an
 * event's `if` / `ifNot` follow the water (the F2 coffer is present only while basin c is high). undefined for any
 * other key, and for a basin this map does not have.
 */
export function tideFlag(key, levels) {
  const m = FLAG_RE.exec(key || '');
  if (!m || !levels || levels[m[1]] == null) return undefined;
  const L = levels[m[1]], n = +m[3];
  switch (m[2]) {
    case '>=': return L >= n;
    case '<=': return L <= n;
    case '<': return L < n;
    case '>': return L > n;
    default: return L === n;
  }
}

/**
 * Band order of a level change (presentation, still pure): the cells that change, each with the frame (0 .. frames-1) on
 * which its water appears (rise) or leaves (fall). Rising water spreads out from the wheel; falling water leaves the far
 * end first and drains toward the wheel. Returns [[index, frame], ...] sorted by frame.
 */
export function bands(map, before, after, origin, frames = 24) {
  const m = compile(map);
  if (!m) return [];
  const rise = [], fall = [];
  for (const i of after) if (!before.has(i)) rise.push(i);
  for (const i of before) if (!after.has(i)) fall.push(i);
  const [ox, oy] = origin || [0, 0];
  const d = (i) => Math.abs((i % m.W) - ox) + Math.abs(((i / m.W) | 0) - oy);
  const out = [];
  const place = (cells, far) => {
    if (!cells.length) return;
    let lo = Infinity, hi = -Infinity;
    for (const i of cells) { const v = d(i); if (v < lo) lo = v; if (v > hi) hi = v; }
    const span = Math.max(1, hi - lo);
    for (const i of cells) {
      const k = (d(i) - lo) / span;
      out.push([i, Math.min(frames - 1, Math.floor((far ? 1 - k : k) * (frames - 1)))]);
    }
  };
  place(rise, false);
  place(fall, true);
  return out.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}
