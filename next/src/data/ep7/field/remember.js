// Name stones, the rule (E7-world, docs/EPISODE7_PLAN.md 4.5 and 5.1). Pure: no DOM, no timers, no randomness. The field
// system (./system.js) and the map tool (tools/maps/ep7_check.mjs) both read it, so the game and mapcheck never disagree.
//
// A map declares the stones with a `remember` block:
//   remember: {
//     capacity: 2,                       // names the party can hold at once (2 on every Episode 7 map)
//     paths: [ '....aaaa....', ... ],    // a lowercase letter: a fade cell that is that stone's path; '.' = none. Map-sized.
//     frost: [ '......D.....', ... ],    // optional: an uppercase letter: an ice cell, SOLID while that stone is held
//     start: ['d'],                      // optional: stones held on arrival, oldest first (F2's grip)
//     goal: ['lift_up'],                 // optional (mapcheck only): the marks the critical path visits, in order
//     budget: 4,                         // optional (mapcheck only): a decision budget traded under plan 4.10 (say so in the map)
//   }
// and `namestone` events ({ stone: 'a', name: '<text key>' }). A stone is its letter: two cairns with one letter are one
// stone (read either; both light), so a path can carry a cairn at each end. Nothing here reads a stone's name (EPISODE7
// choice 13 and DESIGN hard rule 2: names are flavor, never an answer).
//
// The rule (one for the whole episode):
//   read    the stone becomes the newest held (a re-read moves a held stone to newest); over capacity, the oldest lets go.
//           Refused, and nothing changes, when the let-go would put fade under a party cell ('fade') or the new hold would
//           put ice under one ('frost').
//   held    a path cell of a held stone is walkable; a frost cell of a held stone is solid.
//   let go  its path cells are fade again (void), its frost cells melt (walkable).
//
//   compile(mod)                          the model, or null (no block). model.errors lists what did not parse.
//   initial(model)                        the state on arrival: { order: [...start] } (oldest first)
//   held(model, state)                    the ordered held list (oldest first)
//   read(model, state, stone, partyCells) { ok, state, letGo: [stone] | [], reread, refused?: 'fade' | 'frost' | 'unknown' }
//   walkable(model, state, x, y)          true | false | null (null: not a path or frost cell; the base map decides)
//   changed(model, a, b)                  cell indices whose walkability differs between two states
//   states(model)                         every ordered hold of up to capacity stones (26 for 5 stones at capacity 2)
//   oldest(model, state)                  the stone that goes next (the oldest, when the hold is full), or null

export const REMEMBER_TYPES = ['namestone'];
export const MAX_STONES = 5;

const isLower = (c) => c >= 'a' && c <= 'z';
const isUpper = (c) => c >= 'A' && c <= 'Z';

/** Does this map use name stones (a `remember` block or a namestone event)? */
export function hasRemember(mod) {
  return !!(mod && (mod.remember || (mod.events || []).some((e) => e && e.type === 'namestone')));
}

/**
 * Parse a map's `remember` block. Returns null without one. The model:
 *   { W, H, N, capacity, stones: ['a', ...], index: Map(stone -> k), pathOf: { a: Int32Array }, frostOf: { a: Int32Array },
 *     owner: Int16Array (path cell -> stone index, -1), frostOwner: Int16Array, start: [...],
 *     cairns: [{ id, stone, x, y, i, ev }], errors: [...] }
 */
export function compile(mod) {
  if (!mod || !mod.remember) return null;
  const R = mod.remember, errors = [];
  const ground = mod.ground || [];
  const H = ground.length, W = H ? Math.max(...ground.map((r) => r.length)) : 0, N = W * H;
  const capacity = Number.isInteger(R.capacity) && R.capacity >= 1 ? R.capacity : 2;
  if (R.capacity != null && capacity !== R.capacity) errors.push(`remember: capacity ${R.capacity} is not a whole number of at least 1`);
  const owner = new Int16Array(N).fill(-1), frostOwner = new Int16Array(N).fill(-1);
  const letters = new Set();
  const pathCells = {}, frostCells = {};
  const grid = (rows, name, ok) => {
    if (rows == null) return;
    if (!Array.isArray(rows) || rows.length !== H) { errors.push(`remember.${name}: ${Array.isArray(rows) ? rows.length : 'no'} rows (the map has ${H})`); return; }
    for (let y = 0; y < H; y++) {
      const row = String(rows[y]);
      if (row.length !== W) errors.push(`remember.${name}: row ${y} is ${row.length} wide (the map is ${W})`);
      for (let x = 0; x < Math.min(W, row.length); x++) {
        const c = row[x];
        if (c === '.' || c === ' ') continue;
        if (!ok(c)) { errors.push(`remember.${name}: "${c}" at ${x},${y} (${name === 'paths' ? 'a lowercase letter' : 'an uppercase letter'} or '.')`); continue; }
        const s = c.toLowerCase();
        letters.add(s);
        const bag = name === 'paths' ? pathCells : frostCells;
        (bag[s] = bag[s] || []).push(y * W + x);
      }
    }
  };
  grid(R.paths, 'paths', isLower);
  grid(R.frost, 'frost', isUpper);
  const cairns = [];
  for (const e of mod.events || []) {
    if (!e || e.type !== 'namestone') continue;
    const s = typeof e.stone === 'string' ? e.stone.toLowerCase() : '';
    if (s.length !== 1 || !isLower(s)) { errors.push(`namestone ${e.id}: stone "${e.stone}" is not one letter`); continue; }
    cairns.push({ id: e.id, stone: s, x: e.x, y: e.y, i: e.y * W + e.x, ev: e });
    letters.add(s);
  }
  const stones = [...letters].sort();
  const index = new Map(stones.map((s, k) => [s, k]));
  const pathOf = {}, frostOf = {};
  for (const s of stones) {
    pathOf[s] = Int32Array.from(pathCells[s] || []);
    frostOf[s] = Int32Array.from(frostCells[s] || []);
    for (const i of pathOf[s]) owner[i] = index.get(s);
  }
  for (const s of stones) {
    for (const i of frostOf[s]) {
      if (owner[i] >= 0) errors.push(`remember: ${i % W},${(i / W) | 0} is a path cell and a frost cell (a cell has one owner)`);
      frostOwner[i] = index.get(s);
    }
    if (!cairns.some((c) => c.stone === s)) errors.push(`remember: stone "${s}" has cells but no namestone event`);
    if (!pathOf[s].length && !frostOf[s].length) errors.push(`remember: stone "${s}" holds no path and no frost cell`);
  }
  if (stones.length > MAX_STONES) errors.push(`remember: ${stones.length} stones (at most ${MAX_STONES} a map: plan 4.5)`);
  const start = [];
  for (const raw of R.start || []) {
    const s = String(raw).toLowerCase();
    if (!index.has(s)) { errors.push(`remember.start: "${raw}" is not a stone of this map`); continue; }
    if (!start.includes(s)) start.push(s);
  }
  if (start.length > capacity) errors.push(`remember.start: ${start.length} stones held on arrival (capacity ${capacity})`);
  return { W, H, N, capacity, stones, index, pathOf, frostOf, owner, frostOwner, start: start.slice(-capacity), cairns, errors };
}

/** The authored state on arrival: the `start` holds, oldest first. */
export function initial(model) { return { order: model ? model.start.slice() : [] }; }

/** The held stones, oldest first. */
export function held(model, state) {
  const o = (state && state.order) || [];
  return model ? o.filter((s) => model.index.has(s)).slice(-model.capacity) : o.slice();
}

/** The stone that lets go on the next read of another stone (the oldest, when the hold is full), or null. */
export function oldest(model, state) {
  const h = held(model, state);
  return model && h.length >= model.capacity ? h[0] : null;
}

const cellOf = (model, c) => (Array.isArray(c) ? (c[0] >= 0 && c[1] >= 0 && c[0] < model.W && c[1] < model.H ? c[1] * model.W + c[0] : -1) : c);

/**
 * Read a stone. partyCells: [x, y] pairs (or cell indices) of every party member and every cell one is stepping from.
 * Returns { ok, state, letGo, reread, refused? }. A refused read returns the state unchanged (the same object).
 */
export function read(model, state, stone, partyCells = []) {
  const s = typeof stone === 'string' ? stone.toLowerCase() : '';
  if (!model || !model.index.has(s)) return { ok: false, state, letGo: [], reread: false, refused: 'unknown' };
  const before = held(model, state);
  const reread = before.includes(s);
  const order = before.filter((t) => t !== s);
  order.push(s);
  const letGo = order.length > model.capacity ? order.splice(0, order.length - model.capacity) : [];
  const party = new Set();
  for (const c of partyCells) { const i = cellOf(model, c); if (i >= 0) party.add(i); }
  for (const g of letGo) for (const i of model.pathOf[g]) if (party.has(i)) return { ok: false, state, letGo: [], reread, refused: 'fade' };
  if (!reread) for (const i of model.frostOf[s]) if (party.has(i)) return { ok: false, state, letGo: [], reread, refused: 'frost' };
  return { ok: true, state: { order }, letGo, reread };
}

/** Is (x, y) walkable under the stones? true | false | null (null: not one of the rule's cells). */
export function walkable(model, state, x, y) {
  if (!model || x < 0 || y < 0 || x >= model.W || y >= model.H) return null;
  const i = y * model.W + x;
  const p = model.owner[i], f = model.frostOwner[i];
  if (p < 0 && f < 0) return null;
  const h = held(model, state);
  if (p >= 0) return h.includes(model.stones[p]);
  return !h.includes(model.stones[f]);
}

/** Cell indices whose walkability differs between states a and b (the path and frost cells of the stones that changed). */
export function changed(model, a, b) {
  const ha = new Set(held(model, a)), hb = new Set(held(model, b)), out = [];
  for (const s of model.stones) {
    if (ha.has(s) === hb.has(s)) continue;
    for (const i of model.pathOf[s]) out.push(i);
    for (const i of model.frostOf[s]) out.push(i);
  }
  return out;
}

/** Every ordered hold of up to capacity stones, the empty hold first. Each is { order }. */
export function states(model) {
  const out = [{ order: [] }];
  const grow = (order) => {
    if (order.length >= model.capacity) return;
    for (const s of model.stones) if (!order.includes(s)) { const o = [...order, s]; out.push({ order: o }); grow(o); }
  };
  grow([]);
  return out;
}

/** A state's key: '' for none, 'ab' (oldest first). */
export const keyOf = (model, state) => held(model, state).join('');
