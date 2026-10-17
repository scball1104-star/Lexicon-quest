// Map authoring helpers (pure, no DOM). Every helper returns plain data so a map module's default
// export is a JSON-serializable object: tools/maps/mapcheck.mjs dumps it, tools/maps/preview.py draws it.
//
// Conventions (see docs/MAPS.md):
//   overlays: decal/plain tiles drawn over the ground cell; the overlay's own collision code replaces
//             the cell's (bridge decks over water are walkable, *_faint ink bridges are pits until revealed).
//   decor:    tiles.json objects (anchor = bottom-left footprint tile) or props.json objects
//             (x,y = left footprint tile, bottom footprint row). `state` = frame index when the object has frames.
//   events:   see the vocabulary agreed with W2-world (docs/MAPS.md section 2).

/** Deterministic hash in [0, 1) for scatter helpers (same formula as tiles README variantHash). */
export function hash01(x, y, salt = 0) {
  let h = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(salt, 83492791)) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------- overlays
export const tile = (t, x, y) => ({ t, x, y });

/** A run of one tile id. */
export function line(t, x0, y0, x1, y1) {
  const out = [];
  const dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0);
  let x = x0, y = y0;
  for (;;) {
    out.push({ t, x, y });
    if (x === x1 && y === y1) break;
    x += dx; y += dy;
  }
  return out;
}

/** A filled rectangle of one tile id (inclusive corners). */
export function fill(t, x0, y0, x1, y1) {
  const out = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push({ t, x, y });
  return out;
}

/** Scatter decals over the cells where `ground[y][x]` is one of `chars`, with a seeded density. */
export function scatter(ground, chars, ids, density, salt = 1, bounds = null) {
  const out = [];
  const set = new Set(chars);
  for (let y = 0; y < ground.length; y++) {
    for (let x = 0; x < ground[y].length; x++) {
      if (!set.has(ground[y][x])) continue;
      if (bounds && (x < bounds[0] || y < bounds[1] || x > bounds[2] || y > bounds[3])) continue;
      const h = hash01(x, y, salt);
      if (h < density) out.push({ t: ids[Math.floor(hash01(x, y, salt + 7) * ids.length)], x, y });
    }
  }
  return out;
}

/** Horizontal bridge: deck rows y (north) and y+1 (south) from x0 to x1, piles/arch row at y+2. */
export function bridgeH(x0, x1, y, kind = 'stone', under = true) {
  const out = [];
  const end = (x) => (x === x0 ? 'l' : x === x1 ? 'r' : 'm');
  for (let x = x0; x <= x1; x++) {
    out.push({ t: `bridge_${kind}_h_n_${end(x)}`, x, y });
    out.push({ t: `bridge_${kind}_h_s_${end(x)}`, x, y: y + 1 });
    if (under) out.push({ t: `bridge_${kind}_h_${kind === 'stone' ? 'arch' : 'piles'}_${end(x)}`, x, y: y + 2 });
  }
  return out;
}

/** Vertical bridge from y0 (north) to y1 (south). Stone is 3 cells wide (w,m,e), wood 2 (w,e). */
export function bridgeV(x, y0, y1, kind = 'stone') {
  const out = [];
  const cols = kind === 'stone' ? ['w', 'm', 'e'] : ['w', 'e'];
  for (let y = y0; y <= y1; y++) {
    const r = y === y0 ? 'n' : y === y1 ? 's' : 'm';
    cols.forEach((c, i) => out.push({ t: `bridge_${kind}_v_${r}_${c}`, x: x + i, y }));
  }
  return out;
}

/** Wall shelf (16x32 overlay) run along a face row: l, m..., r. */
export function wallShelf(x0, x1, y) {
  const out = [];
  for (let x = x0; x <= x1; x++) out.push({ t: `wall_shelf_${x === x0 ? 'l' : x === x1 ? 'r' : 'm'}`, x, y });
  return out;
}

/** Stone stairs (l, m, r) across x0..x1 at row y. */
export function stoneStairs(x0, x1, y) {
  const out = [];
  for (let x = x0; x <= x1; x++) out.push({ t: `stairs_stone_${x === x0 ? 'l' : x === x1 ? 'r' : 'm'}`, x, y });
  return out;
}

/** One-way ledge run: dir 's' | 'e' | 'w'. For 's' the run is horizontal, for e/w vertical. */
export function ledge(dir, x0, y0, len) {
  const out = [];
  for (let i = 0; i < len; i++) {
    const part = i === 0 ? 'a' : i === len - 1 ? 'b' : 'm';
    out.push({ t: `ledge_${dir}_${part}`, x: dir === 's' ? x0 + i : x0, y: dir === 's' ? y0 : y0 + i });
  }
  return out;
}

// ---------------------------------------------------------------- decor
export const obj = (t, x, y, extra = {}) => ({ t, x, y, ...extra });

/** A row of n objects of width w tiles each. */
export function row(t, x0, y, n, w = 1, extra = {}) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ t, x: x0 + i * w, y, ...extra });
  return out;
}

// ---------------------------------------------------------------- events
export const npc = (id, x, y, dir = 'down', extra = {}) => ({ id, type: 'npc', x, y, dir, ...extra });
export const actor = (id, x, y, sprite, dir = 'down', extra = {}) => ({ id, type: 'actor', x, y, sprite, dir, ...extra });
export const door = (id, x, y, to, extra = {}) => ({ id, type: 'door', x, y, to, kind: 'door', ...extra });
export const stairs = (id, x, y, to, extra = {}) => ({ id, type: 'door', x, y, to, kind: 'stairs', ...extra });
export const chest = (id, x, y, tier, extra = {}) => ({ id, type: 'chest', x, y, tier, ...extra });
export const sign = (id, x, y, text, extra = {}) => ({ id, type: 'sign', x, y, text, ...extra });
export const book = (id, x, y, bookId, extra = {}) => ({ id, type: 'book', x, y, book: bookId, ...extra });
export const object = (id, x, y, sprite, extra = {}) => ({ id, type: 'object', x, y, sprite, ...extra });
export const trigger = (id, x, y, w, h, script, extra = {}) => ({ id, type: 'trigger', x, y, w, h, script, ...extra });
export const enter = (id, script) => ({ id, type: 'trigger', x: 0, y: 0, w: 1, h: 1, script, on: 'enter' });
export const enemy = (id, x, y, sprite, encounter, move = 'wander', extra = {}) =>
  ({ id, type: 'enemy', x, y, sprite, encounter, move, ...extra });
export const pot = (id, x, y, extra = {}) => ({ id, type: 'pot', x, y, ...extra });
export const block = (id, x, y) => ({ id, type: 'block', x, y, sprite: 'push_block' });
export const plate = (id, x, y, target) => ({ id, type: 'plate', x, y, target, sprite: 'plate_up' });
export const floorSwitch = (id, x, y, target, state = 'off') => ({ id, type: 'switch', x, y, target, kind: 'floor', state, sprite: 'switch_off' });
export const crystal = (id, x, y, target, color = 'blue', state = 'off') =>
  ({ id, type: 'switch', x, y, target, kind: 'crystal', color, state, sprite: `crystal_switch_${color}` });
export const inkSwitch = (id, x, y, target, state = 'off') => ({ id, type: 'switch', x, y, target, kind: 'floor', state, sprite: 'switch_ink_faint', hidden: true });
/** A 32 px wide door gate set in a wall face: cells (x,y) and (x+1,y) are the doorway. */
export const gate = (id, x, y, sprite, extra = {}) => ({ id, type: 'gate', x, y, w: 2, h: 1, sprite, state: 'closed', ...extra });
export const lockedDoor = (id, x, y, key, to, extra = {}) => ({ id, type: 'locked_door', x, y, w: 2, h: 1, key, sprite: 'door_key', to, ...extra });
export const shelf = (id, positions, extra = {}) =>
  ({ id, type: 'shelf', x: positions[0][0], y: positions[0][1], sprite: 'shelf_moving', positions, state: 0, ...extra });
export const brazier = (id, x, y, lit = false) => ({ id, type: 'brazier', x, y, lit, sprite: lit ? 'brazier_lit' : 'brazier_unlit' });
/** Keeper's font: the props.json fountain (4 x 2 footprint; x,y = left tile of the bottom row). */
export const font = (id, x, y, text = 'keeper_font') => ({ id, type: 'font', x, y, w: 4, h: 2, text, sprite: 'fountain' });
export const pit = (id, x, y, w, h, to) => ({ id, type: 'pit', x, y, w, h, to });
export const light = (id, x, y, r, color) => ({ id, type: 'light', x, y, r, ...(color ? { color } : {}) });

/** Patrol path helper: repeat a direction n times. */
export function steps(...pairs) {
  const out = [];
  for (let i = 0; i < pairs.length; i += 2) for (let k = 0; k < pairs[i + 1]; k++) out.push(pairs[i]);
  return out;
}

/** Make sure a list of rows is rectangular (throws early with a readable message). */
export function rows(list) {
  const w = list[0].length;
  list.forEach((r, i) => { if (r.length !== w) throw new Error(`row ${i} has ${r.length} columns, expected ${w}`); });
  return list;
}

/** Replace a run of characters in a mutable row list: put(g, x, y, 'abc'). */
export function put(g, x, y, s) {
  g[y] = g[y].slice(0, x) + s + g[y].slice(x + s.length);
}

/** Fill a rectangle of the row list with one char (inclusive). */
export function box(g, x0, y0, x1, y1, ch) {
  for (let y = y0; y <= y1; y++) put(g, x0, y, ch.repeat(x1 - x0 + 1));
}

/** A blank grid of w x h filled with ch. */
export function grid(w, h, ch) {
  const out = [];
  for (let y = 0; y < h; y++) out.push(ch.repeat(w));
  return out;
}

/** Hollow rectangle border (inclusive). */
export function frame(g, x0, y0, x1, y1, ch) {
  put(g, x0, y0, ch.repeat(x1 - x0 + 1));
  put(g, x0, y1, ch.repeat(x1 - x0 + 1));
  for (let y = y0 + 1; y < y1; y++) { put(g, x0, y, ch); put(g, x1, y, ch); }
}

/**
 * Dungeon room helper for the 3/4-view wall systems: carves a floor room into a grid that is all wall
 * top (`T`). Floor char F fills (x0..x1, y0..y1); the two rows above the floor become face cells (`A`)
 * so the room's north wall shows its face. Rooms carved next to each other merge naturally.
 */
export function room(g, x0, y0, x1, y1, F, A, faceRows = 2) {
  for (let y = y0 - faceRows; y < y0; y++) put(g, x0, y, A.repeat(x1 - x0 + 1));
  box(g, x0, y0, x1, y1, F);
}
