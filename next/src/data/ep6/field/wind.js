// Gust lanes: the pure carry rule of Episode 6 (E6-world, docs/EPISODE6_PLAN.md 4.4 and 5.1). No DOM, no randomness, no
// timers. The field system (./system.js) and the map tool (tools/maps/ep6_check.mjs) both call it, so the game and mapcheck
// agree on every ride. docs/WORLD_EP6.md has the contract.
//
//   compile(mod)                                 the lane model of a map's `wind` block (cached per mod), or null
//   live(model, state)                           Int8Array of arrows per cell for a state (-1: not a lane / calm)
//   ride(model, state, from, dir, blocked)       { path, stop, bends } for a party stepping from `from` along `dir`
//   follow(model, state, cell, blocked)          the same ride, starting ON a lane cell (a reload, a resumed ride)
//   canTurn(model, state, group, partyCells)     { ok, why, cells }: refused when a party member's cell would go calm
//   toggled(model, state, group)                 the state after a vane of `group` turns
//   vaneArrow(model, state, group)               the arrow a group's vanes show (its cells' most common arrow), or -1
//   changed(model, a, b)                         cell indices whose arrow differs between two states
//
// A state is { turned: Set | array of group ids, absent?: Set of mooring ids not present } (or a bit mask number).
// Arrows: 0 up, 1 right, 2 down, 3 left.

export const ARROWS = { '^': 0, '>': 1, 'v': 2, '<': 3 };
export const ARROW_CHARS = ['^', '>', 'v', '<'];
export const DIR_NAMES = ['up', 'right', 'down', 'left'];
export const DIR_INDEX = { up: 0, right: 1, down: 2, left: 3 };
export const DXY = [[0, -1], [1, 0], [0, 1], [-1, 0]];
export const MAX_RIDE = 64;
export const MAX_GROUPS = 3;
export const WIND_TYPES = new Set(['vane', 'mooring']);
const NOT_IN = -2;   // a `turned` grid cell that is not in the group ('.')
const CALM = -1;     // 'x': calm when the group is turned

const cache = new WeakMap();

/** Does this map module use gust lanes? */
export function hasWind(mod) { return !!(mod && (mod.wind || (mod.events || []).some((e) => e && WIND_TYPES.has(e.type)))); }

/**
 * Parse the `wind` block and the vane and mooring events. Returns the model (cached on the mod object):
 *   { W, H, N, base: Int8Array, groups: ['a', ...], over: [Int8Array per group], groupOf: Int8Array, anyLane: Uint8Array,
 *     posts: Map(cell -> id), vanes: [{ id, group, x, y, i, ev }], errors: [] }
 * or null when the map has no wind at all.
 */
export function compile(mod) {
  if (!hasWind(mod)) return null;
  if (cache.has(mod)) return cache.get(mod);
  const errors = [];
  const w = mod.wind || {};
  const rows = Array.isArray(w.lanes) ? w.lanes : [];
  const ground = mod.ground || [];
  const H = ground.length || rows.length;
  const W = ground.length ? Math.max(...ground.map((r) => r.length)) : Math.max(0, ...rows.map((r) => r.length));
  const N = W * H;
  const base = new Int8Array(N).fill(-1);
  if (mod.wind && !Array.isArray(w.lanes)) errors.push('wind: `lanes` must be an array of rows');
  if (rows.length && rows.length !== H) errors.push(`wind: lanes has ${rows.length} rows, the map has ${H}`);
  rows.forEach((r, y) => {
    if (y >= H) return;
    if (r.length > W) errors.push(`wind: lanes row ${y} is wider than the map`);
    for (let x = 0; x < Math.min(W, r.length); x++) {
      const c = r[x];
      if (c === '.' || c === ' ') continue;
      if (c in ARROWS) base[y * W + x] = ARROWS[c];
      else errors.push(`wind: lanes row ${y} col ${x}: "${c}" is not one of > < ^ v .`);
    }
  });
  const turned = w.turned || {};
  const groups = Object.keys(turned).sort();
  if (groups.length > MAX_GROUPS) errors.push(`wind: ${groups.length} vane groups (at most ${MAX_GROUPS}: plan 4.4)`);
  const over = [], groupOf = new Int8Array(N).fill(-1);
  groups.forEach((g, k) => {
    const grid = turned[g];
    const o = new Int8Array(N).fill(NOT_IN);
    if (!Array.isArray(grid)) { errors.push(`wind: turned.${g} must be an array of rows`); over.push(o); return; }
    if (grid.length !== H) errors.push(`wind: turned.${g} has ${grid.length} rows, the map has ${H}`);
    let n = 0;
    grid.forEach((r, y) => {
      if (y >= H) return;
      for (let x = 0; x < Math.min(W, r.length); x++) {
        const c = r[x], i = y * W + x;
        if (c === '.' || c === ' ') continue;
        if (c === 'x') o[i] = CALM;
        else if (c in ARROWS) o[i] = ARROWS[c];
        else { errors.push(`wind: turned.${g} row ${y} col ${x}: "${c}" is not one of > < ^ v x .`); continue; }
        if (groupOf[i] >= 0) errors.push(`wind: cell ${x},${y} is in groups ${groups[groupOf[i]]} and ${g} (one group per cell)`);
        groupOf[i] = k;
        n++;
      }
    });
    if (!n) errors.push(`wind: turned.${g} changes no cell`);
    over.push(o);
  });
  const anyLane = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (base[i] >= 0 || (groupOf[i] >= 0 && over[groupOf[i]][i] >= 0)) anyLane[i] = 1;
  const posts = new Map(), vanes = [];
  for (const e of mod.events || []) {
    if (!e || !WIND_TYPES.has(e.type)) continue;
    const x = e.x | 0, y = e.y | 0, i = y * W + x;
    if (x < 0 || y < 0 || x >= W || y >= H) { errors.push(`${e.type} ${e.id}: outside the map`); continue; }
    if (e.type === 'mooring') {
      if (!anyLane[i]) errors.push(`mooring ${e.id}: ${x},${y} is not a lane cell in any state`);
      posts.set(i, e.id);
    } else {
      const g = e.group == null ? null : String(e.group);
      if (g == null || !groups.includes(g)) errors.push(`vane ${e.id}: group ${g} has no turned grid in the wind block`);
      vanes.push({ id: e.id, group: g, k: groups.indexOf(g), x, y, i, ev: e });
    }
  }
  const model = { W, H, N, base, groups, over, groupOf, anyLane, posts, vanes, errors, lives: new Map() };
  cache.set(mod, model);
  return model;
}

/** A state's bit mask: bit k set when group k is turned. Accepts { turned }, a Set, an array or a number. */
export function maskOf(model, state) {
  if (state == null) return 0;
  if (typeof state === 'number') return state;
  const t = state.turned != null ? state.turned : state;
  if (typeof t === 'number') return t;
  let m = 0;
  for (const g of t) { const k = model.groups.indexOf(String(g)); if (k >= 0) m |= 1 << k; }
  return m;
}
/** The state object for a mask. */
export function stateOf(model, mask) { return { turned: new Set(model.groups.filter((_, k) => mask & (1 << k))) }; }

/** Arrows per cell for a state (cached per mask): -1 for not a lane or calm. */
export function live(model, state) {
  const mask = maskOf(model, state);
  let a = model.lives.get(mask);
  if (a) return a;
  a = new Int8Array(model.base);
  model.groups.forEach((g, k) => {
    if (!(mask & (1 << k))) return;
    const o = model.over[k];
    for (let i = 0; i < model.N; i++) if (o[i] !== NOT_IN) a[i] = o[i] === CALM ? -1 : o[i];
  });
  model.lives.set(mask, a);
  return a;
}

/**
 * The ride from a lane cell. blocked(x, y) is true for any cell the party cannot stand on (solid, void that is not a live
 * lane, water, a solid prop, an actor). The rule (plan 4.4):
 *   on a mooring post: stop there ('post');
 *   the next cell along the arrow is a live lane: go on (unless blocked: 'blocked');
 *   the next cell is ground (not a lane, not blocked): land on it ('land');
 *   anything else: stop on the current lane cell ('blocked');
 *   after MAX_RIDE cells, or on revisiting a cell: stop ('guard').
 * Returns { path: [[x, y], ...] (the start cell first), stop, bends }.
 */
export function follow(model, state, cell, blocked = () => false) {
  const L = live(model, state), { W, H } = model;
  const off = state && state.absent instanceof Set ? state.absent : null;   // mooring ids not present (if / ifNot)
  let [x, y] = cell;
  const path = [[x, y]];
  const seen = new Set();
  let bends = 0, last = -1;
  for (;;) {
    const i = y * W + x, a = L[i];
    if (a < 0) return { path, stop: 'land', bends };          // not a lane (a landing, or a calm cell)
    if (model.posts.has(i) && !(off && off.has(model.posts.get(i)))) return { path, stop: 'post', bends };
    if (seen.has(i) || path.length > MAX_RIDE) return { path, stop: 'guard', bends };
    seen.add(i);
    if (last >= 0 && a !== last) bends++;
    last = a;
    const nx = x + DXY[a][0], ny = y + DXY[a][1];
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) return { path, stop: 'blocked', bends };
    const j = ny * W + nx;
    if (blocked(nx, ny, L[j] >= 0)) return { path, stop: 'blocked', bends };
    path.push([nx, ny]);
    if (L[j] < 0) return { path, stop: 'land', bends };
    x = nx; y = ny;
  }
}

/** A party stepping from `from` in `dir` ('up' | 'right' | 'down' | 'left' or 0..3) onto a live lane cell: the ride. */
export function ride(model, state, from, dir, blocked = () => false) {
  const d = typeof dir === 'number' ? dir : DIR_INDEX[dir];
  const x = from[0] + DXY[d][0], y = from[1] + DXY[d][1];
  if (x < 0 || y < 0 || x >= model.W || y >= model.H || live(model, state)[y * model.W + x] < 0) return { path: [], stop: 'none', bends: 0 };
  return follow(model, state, [x, y], blocked);
}

/** Is the cell a live lane cell in this state? */
export function isLive(model, state, x, y) {
  if (!model || x < 0 || y < 0 || x >= model.W || y >= model.H) return false;
  return live(model, state)[y * model.W + x] >= 0;
}

/** The state after group `group` turns (toggles). */
export function toggled(model, state, group) {
  const k = model.groups.indexOf(String(group));
  return stateOf(model, maskOf(model, state) ^ (k >= 0 ? 1 << k : 0));
}

/**
 * May group `group` turn? Refused ({ ok: false, why: 'drop', cells }) when any party cell ([x, y] list) is a live lane cell
 * now and would be calm after (a vane never changes a cell the party stands on: plan 4.4); 'group' when the group is unknown.
 */
export function canTurn(model, state, group, partyCells = []) {
  if (!model || !model.groups.includes(String(group))) return { ok: false, why: 'group', cells: [] };
  const a = live(model, state), b = live(model, toggled(model, state, group));
  const cells = [];
  for (const [x, y] of partyCells) {
    if (x < 0 || y < 0 || x >= model.W || y >= model.H) continue;
    const i = y * model.W + x;
    if (a[i] >= 0 && b[i] < 0) cells.push([x, y]);
  }
  return cells.length ? { ok: false, why: 'drop', cells } : { ok: true, why: null, cells };
}

/** The arrow a group's vanes show in a state: the most common arrow among its live cells (ties: the lowest arrow), or -1. */
export function vaneArrow(model, state, group) {
  const k = model.groups.indexOf(String(group));
  if (k < 0) return -1;
  const a = live(model, state), n = [0, 0, 0, 0];
  for (let i = 0; i < model.N; i++) if (model.groupOf[i] === k && a[i] >= 0) n[a[i]]++;
  let best = -1, bn = 0;
  for (let d = 0; d < 4; d++) if (n[d] > bn) { bn = n[d]; best = d; }
  return best;
}

/** Cells whose arrow differs between states a and b. */
export function changed(model, a, b) {
  const A = live(model, a), B = live(model, b), out = [];
  for (let i = 0; i < model.N; i++) if (A[i] !== B[i]) out.push(i);
  return out;
}
