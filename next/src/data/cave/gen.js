// The Deep Stacks floor generator (docs/DEEP_STACKS_PLAN.md section 4). Pure and seeded: generateFloor(seed, floor, opts)
// returns a map module object the engine accepts through registerMap() (src/world/maps.js), shaped exactly like a
// hand-made dungeon map (DESIGN 5.1, docs/MAPS.md). It never touches the DOM, never calls Math.random and never imports
// the cave data files: foe pools, chest counts and plaque text are injected through `opts` by the integrator.
//
//   import { generateFloor, arrivalOf, bandOf, BANDS, registerBand, walkModel, CaveGenError } from './gen.js';
//   const mod = generateFloor(seed, 7);                     // 'cave_b7', The Catalogue
//   const mod = generateFloor(seed, 20, { foes, chests });  // B20, a landing (landing: true, no foes)
//
// opts (every field optional; the defaults are stubs so the tests and previews run alone):
//   foes(floor, band) -> [pool entries]   a pool entry is 'encounterId' or { enc, sprite, move }. The generator draws
//                                         4 + floor/10 foes (max 12) from it; a string entry takes its sprite from
//                                         opts.sprites[enc] or the band's default pool.
//   sprites: { encounterId: fieldSprite } sprites for string pool entries.
//   chests: { red: n | 'auto', blue: bool | 'auto' }   red 2..4 ('auto' rolls it), blue = one blue chest this floor
//                                         (the pity rule lives with the integrator; 'auto' = every floor ending in 5).
//   plaque(floor, band) -> linesId        when given, a landing gets a `sign` event on the plaque cell with that text id.
//   nextArrival(floor) -> [x, y] | null   where the stairs of `floor` land on floor + 1 (default: this generator's own
//                                         arrival cell for floor + 1; B99 needs the integrator's B100 cell).
//   band                                  force a band id (default bandOf(floor)).
//
// Layout: 8 to 12 rooms from the band's prefab list (prefabs.js), placed on a jittered slot grid with a two-cell lane
// between every pair of protected boxes (floor + two face rows + one band ring), joined by two-wide corridors on a
// minimum spanning tree plus one or two loops, each corridor carved by a turn-penalised shortest path that never cuts
// another room. The stair goes in the room farthest (by walk distance) from the arrival room, never a graph neighbour
// of it when another room exists. Dead-end rooms hold the chests. Walkability is proven here (arrival to the stair, to
// every chest and every foe) before the module is returned; a failed attempt re-rolls from a derived sub-seed, so the
// same (seed, floor) always yields the same floor.

import { createRng, hashSeed } from '../../core/rng.js';
import { wallDepth, stairs as stairsEv, chest as chestEv, enemy as enemyEv, light as lightEv, sign as signEv } from '../maps/_kit.js';
import { PREFAB_SETS, LEGENDS, parsePrefab, PROPS, OVERLAY_SIZE, OVERLAY_OPEN } from './prefabs.js';
import { LANDINGS, parseLanding } from './landing.js';

export class CaveGenError extends Error {
  constructor(msg, info = {}) { super(msg); this.name = 'CaveGenError'; Object.assign(this, info); }
}

// ------------------------------------------------------------------------------------------------ bands
// Default foe stubs per band (COMMON.md canonical ids): the integrator replaces them through opts.foes.
const STUB_FOES = {
  catalogue: [{ enc: 'cave_cat_slimes', sprite: 'ink_slime' }, { enc: 'cave_cat_wraiths', sprite: 'page_wraith' },
    { enc: 'cave_cat_mites', sprite: 'bookmite' }, { enc: 'cave_cat_wolves', sprite: 'briar_wolf' }, { enc: 'cave_cat_scarabs', sprite: 'moss_scarab' }],
  cellars: [{ enc: 'cave_cel_wraiths', sprite: 'page_wraith' }, { enc: 'cave_cel_golems', sprite: 'tome_golem' },
    { enc: 'cave_cel_mites', sprite: 'bookmite' }, { enc: 'cave_cel_ink', sprite: 'ink_wraith' }, { enc: 'cave_cel_wolves', sprite: 'thornback_wolf' }],
};

export const BANDS = {
  catalogue: { id: 'catalogue', name: 'The Catalogue', from: 1, to: 19, prefabs: 'catalogue', legend: LEGENDS.catalogue, under: 'catalog_wood',
    music: 'archive', ambience: 'archive_hush', tileset: 'archive', backdrop: 'archive', lighting: { tint: 'none', dark: 0.2 }, foes: STUB_FOES.catalogue, landing: 'catalogue' },
  cellars: { id: 'cellars', name: 'The Root Cellars', from: 20, to: 39, prefabs: 'cellars', legend: LEGENDS.cellars, under: 'dirt',
    music: 'mystery', ambience: 'mere_still', tileset: 'archive', backdrop: 'archive', lighting: { tint: 'none', dark: 0.45 }, foes: STUB_FOES.cellars, landing: 'cellars' },
  // bands three to five: C2-sprites-boss registers their prefabs (prefabs_b3..5.js); until then they borrow the cellars kit
  court: { id: 'court', name: 'The Court Below', from: 40, to: 59, prefabs: 'cellars', legend: LEGENDS.cellars, under: 'dirt',
    music: 'court', ambience: 'court_hush', tileset: 'court', backdrop: 'court', lighting: { tint: 'none', dark: 0.35 }, foes: STUB_FOES.cellars, landing: 'cellars', borrowed: true },
  ember: { id: 'ember', name: 'The Ember Shelves', from: 60, to: 79, prefabs: 'cellars', legend: LEGENDS.cellars, under: 'dirt',
    music: 'emberpeak', ambience: 'ash_wind', tileset: 'ember', backdrop: 'ember', lighting: { tint: 'none', dark: 0.4 }, foes: STUB_FOES.cellars, landing: 'cellars', borrowed: true },
  forge: { id: 'forge', name: 'The Forge of Names', from: 80, to: 99, prefabs: 'cellars', legend: LEGENDS.cellars, under: 'dirt',
    music: 'foundry', ambience: 'forge_rumble', tileset: 'forge', backdrop: 'forge', lighting: { tint: 'none', dark: 0.4 }, foes: STUB_FOES.cellars, landing: 'cellars', borrowed: true },
};
export const BAND_ORDER = ['catalogue', 'cellars', 'court', 'ember', 'forge'];

/** Register or extend a band: { prefabs: [defs], legend, under, landing: template, music, lighting, ... }. */
export function registerBand(id, def = {}) {
  const base = BANDS[id] || { id, name: id, from: 1, to: 99 };
  const out = { ...base, ...def, id };
  if (Array.isArray(def.prefabs)) { PREFAB_SETS[id] = def.prefabs; out.prefabs = id; out.borrowed = false; }
  if (def.landing && typeof def.landing === 'object') { LANDINGS[id] = def.landing; out.landing = id; }
  BANDS[id] = out;
  if (!BAND_ORDER.includes(id)) BAND_ORDER.push(id);
  layoutCache.clear();   // layouts made with the old prefab list must not outlive it
  return out;
}

export function bandOf(floor) {
  for (const id of BAND_ORDER) { const b = BANDS[id]; if (floor >= b.from && floor <= b.to) return b; }
  throw new CaveGenError(`no band for floor ${floor}`);
}

/** Grid size: 40x30 at B1 growing to 56x40 at B99 (plan 4). */
export function gridSize(floor) {
  const t = Math.max(0, Math.min(1, (floor - 1) / 98));
  return [40 + Math.round(16 * t), 30 + Math.round(10 * t)];
}
export const foeCount = (floor) => Math.min(12, 4 + Math.floor(floor / 10));

// ------------------------------------------------------------------------------------------------ walk model
const OPEN_TERRAIN = new Set(['catalog_wood', 'dirt', 'carpet_red', 'carpet_blue', 'moss', 'gallery_stone', 'stone_floor', 'stacks_wood',
  'archive_floor', 'wood_floor', 'grass', 'plaza', 'sand', 'glass_floor', 'gallery_floor', 'throne_floor', 'foundry_floor', 'ash_floor', 'crucible_floor', 'ash_ground', 'cinder_path']);

/**
 * The generator's own walk model, derived from the module alone (legend ids, decor footprints from prefabs.PROPS, open
 * overlays, chests): a grid of open cells and a BFS from `start`. Tests and tools use it too; qa/cave cross-checks it
 * against tools/maps/mapcheck.mjs (the real tiles.json).
 */
export function walkModel(mod, start = null) {
  const H = mod.ground.length, W = mod.ground[0].length;
  const open = Array.from({ length: H }, () => new Uint8Array(W));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const id = mod.legend[mod.ground[y][x]];
    open[y][x] = OPEN_TERRAIN.has(id) ? 1 : 0;
  }
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  for (const o of mod.overlays || []) {
    if (!OVERLAY_OPEN.has(o.t)) continue;
    const [ow, oh] = OVERLAY_SIZE[o.t] || [1, 1];
    for (let j = 0; j < oh; j++) for (let i = 0; i < ow; i++) if (inb(o.x + i, o.y + j)) open[o.y + j][o.x + i] = 1;
  }
  for (const d of mod.decor || []) {
    const fp = PROPS[d.t];
    if (!fp) continue;
    if (fp[0] === 0) { if (inb(d.x, d.y)) open[d.y][d.x] = 1; continue; }   // a stairs object: its anchor cell is the doorway
    for (let j = 0; j < fp[1]; j++) for (let i = 0; i < fp[0]; i++) if (inb(d.x + i, d.y - j)) open[d.y - j][d.x + i] = 0;
  }
  const solidEvents = new Set(['chest', 'brazier', 'object', 'sign', 'book', 'npc', 'font', 'pot', 'block']);
  for (const e of mod.events || []) {
    if (e.type === 'door') { if (inb(e.x, e.y)) open[e.y][e.x] = 1; continue; }
    if (solidEvents.has(e.type) && e.solid !== false && inb(e.x, e.y)) open[e.y][e.x] = 0;
  }
  const s = start || (mod.start ? [mod.start.x, mod.start.y] : null);
  const dist = Array.from({ length: H }, () => new Int32Array(W).fill(-1));
  if (s && inb(s[0], s[1]) && open[s[1]][s[0]]) {
    const q = [s];
    dist[s[1]][s[0]] = 0;
    for (let qi = 0; qi < q.length; qi++) {
      const [x, y] = q[qi];
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (!inb(nx, ny) || !open[ny][nx] || dist[ny][nx] >= 0) continue;
        dist[ny][nx] = dist[y][x] + 1;
        q.push([nx, ny]);
      }
    }
  }
  const reached = (x, y) => inb(x, y) && dist[y][x] >= 0;
  const touchable = (x, y) => reached(x, y) || DIRS.some(([dx, dy]) => reached(x + dx, y + dy));
  return { W, H, open, dist, reached, touchable };
}

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// ------------------------------------------------------------------------------------------------ layout
const layoutCache = new Map();
function cacheGet(k) { return layoutCache.get(k); }
function cacheSet(k, v) { layoutCache.set(k, v); if (layoutCache.size > 16) layoutCache.delete(layoutCache.keys().next().value); }

/** Protected area of a prefab once placed: floor + two face rows + the band ring. */
const parea = (p) => (p.w + 2) * (p.h + 4);

function pickPrefabs(rng, band, floor, count, pool, budget) {
  const avail = pool.map(parsePrefab).filter((p) => p.minFloor <= floor);
  const byTag = (t) => avail.filter((p) => p.tags.includes(t));
  const out = [];
  const used = new Set();
  let spent = 0;
  const take = (list, forceUnique = true, cap = budget) => {
    let c = list.filter((p) => (!used.has(p.id) || !forceUnique) && spent + parea(p) <= cap);
    if (!c.length && out.length < 8) c = list.filter((p) => !used.has(p.id) || !forceUnique).sort((a, b) => parea(a) - parea(b) || a.id.localeCompare(b.id)).slice(0, 2);
    if (!c.length) return null;
    const p = rng.weighted(c, (x) => x.weight);
    used.add(p.id); out.push(p); spent += parea(p);
    return p;
  };
  if (rng.chance(0.65)) take(byTag('set'), true, budget * 0.3);   // at most one set piece per floor, never a third of the map
  const deadWanted = 2 + (count >= 10 ? 1 : 0);
  for (let i = 0; i < deadWanted; i++) take(byTag('dead').filter((p) => !p.tags.includes('set')));
  const hallWanted = count >= 11 ? 3 : 2;
  for (let i = 0; i < hallWanted; i++) take(byTag('hall').filter((p) => !p.tags.includes('set')), true, budget * 0.55);
  const rest = avail.filter((p) => !p.tags.includes('set'));
  while (out.length < count) if (!take(rest) && !take(rest, false)) break;
  return out;
}

/** The protected box of a room placed at (x, y): floor + two face rows + a one-cell band ring. */
const pbox = (r) => ({ x0: r.x - 1, y0: r.y - 3, x1: r.x + r.w, y1: r.y + r.h });
/** The core: floor + the two face rows. Cores of two rooms keep at least one wall cell between them (a band two rooms may share, as the hand maps do). */
const core = (r) => ({ x0: r.x, y0: r.y - 2, x1: r.x + r.w - 1, y1: r.y + r.h - 1 });
const boxesClear = (a, b, gap) => a.x1 + gap < b.x0 || b.x1 + gap < a.x0 || a.y1 + gap < b.y0 || b.y1 + gap < a.y0;

function placeRooms(rng, prefabs, W, H) {
  // Accretion, the way the hand maps are built: the first room sits near the middle, every next room is placed one to
  // five wall cells off a room already placed (sharing a band when the gap is one), overlapping it by at least three
  // cells along the shared side so a straight doorway is possible. Biggest rooms first.
  const order = prefabs.map((p, i) => ({ p, i, area: p.w * p.h })).sort((a, b) => b.area - a.area || a.i - b.i);
  const placed = [];
  const fits = (r) => r.x >= 2 && r.y >= 4 && r.x + r.w <= W - 2 && r.y + r.h <= H - 2 && placed.every((q) => boxesClear(core(r), core(q), 1));
  const GAPS = [1, 1, 1, 2, 4, 4, 5];
  for (let k = 0; k < order.length; k++) {
    const p = order[k].p;
    let got = null;
    if (!placed.length) {
      for (let t = 0; t < 40 && !got; t++) {
        const r = { x: Math.round((W - p.w) / 2) + rng.int(-6, 6), y: Math.round((H - p.h) / 2) + rng.int(-5, 5), w: p.w, h: p.h };
        if (fits(r)) got = r;
      }
    }
    let anchor = null;
    for (let t = 0; t < 120 && !got; t++) {
      const R = placed[rng.int(0, placed.length - 1)];
      const side = rng.int(0, 3);          // 0 n, 1 s, 2 w, 3 e : where the new room goes, seen from R
      const gap = rng.pick(GAPS);
      // the two facing sides share a door position: R's door and the new room's door sit on the same column (or row),
      // so the pair always has a straight doorway whatever the gap
      const [sideR, sideN] = side === 0 ? ['n', 's'] : side === 1 ? ['s', 'n'] : side === 2 ? ['w', 'e'] : ['e', 'w'];
      const la = R.p.doors[sideR], lb = p.doors[sideN];
      if (!la.length || !lb.length) continue;
      const a = la[rng.int(0, la.length - 1)], b = lb[rng.int(0, lb.length - 1)];
      let r, g;
      if (side <= 1) {
        g = R.x + a;
        // below: new.top - 2 (faces) - gap = R.bottom + 1 -> y = R.y + R.h + gap + 2; above: new.bottom + gap + 1 = R.y - 2
        r = { x: g - b, y: side === 1 ? R.y + R.h + gap + 2 : R.y - 2 - gap - p.h, w: p.w, h: p.h };
      } else {
        g = R.y + a;
        r = { x: side === 3 ? R.x + R.w + gap : R.x - gap - p.w, y: g - b, w: p.w, h: p.h };
      }
      if (fits(r)) { got = r; anchor = { to: R.id, sideR, sideN, g }; }
    }
    for (let t = 0; t < 120 && !got; t++) {
      const r = { x: rng.int(2, W - 2 - p.w), y: rng.int(4, H - 2 - p.h), w: p.w, h: p.h };
      if (fits(r)) got = r;
    }
    if (!got) return null;
    placed.push({ ...got, p, id: placed.length, anchor });
  }
  return placed;
}

/** Every room pair as an edge, shortest centre distance first (Kruskal order; the carve loop accepts an edge only when it carves). */
function roomEdges(rooms) {
  const cx = (r) => r.x + r.w / 2, cy = (r) => r.y + r.h / 2;
  const edges = [];
  for (let i = 0; i < rooms.length; i++) for (let j = i + 1; j < rooms.length; j++) {
    edges.push({ a: i, b: j, d: Math.abs(cx(rooms[i]) - cx(rooms[j])) + Math.abs(cy(rooms[i]) - cy(rooms[j])) });
  }
  edges.sort((e, f) => e.d - f.d || e.a - f.a || e.b - f.b);
  return edges;
}
const touching = (cellsA, cellsB) => cellsA.some(([x, y]) => cellsB.some(([u, v]) => Math.abs(u - x) + Math.abs(v - y) <= 1));

/** Door opening for room `r` on `side`, nearest to `target` (a global x for n/s, a global y for e/w). Returns a global coordinate or null. */
function doorOn(r, side, target) {
  const list = r.p.doors[side];
  if (!list.length) return null;
  const glob = (v) => (side === 'n' || side === 's' ? r.x + v : r.y + v);
  let best = null, bd = Infinity;
  for (const v of list) {
    const g = glob(v);
    const d = Math.abs(g + 0.5 - target);
    if (d < bd) { bd = d; best = g; }
  }
  return best;
}

/** Entry cells (to carve) and the outer cell a corridor path starts from, for room r, side, opening at global coordinate g. */
function entryOf(r, side, g) {
  const cells = [];
  const top = r.y, bottom = r.y + r.h - 1, left = r.x, right = r.x + r.w - 1;
  if (side === 'n') { for (let y = top - 3; y <= top - 1; y++) cells.push([g, y], [g + 1, y]); return { cells, out: [g, top - 4], dir: 3 }; }
  if (side === 's') { cells.push([g, bottom + 1], [g + 1, bottom + 1]); return { cells, out: [g, bottom + 2], dir: 2 }; }
  if (side === 'w') { cells.push([left - 1, g], [left - 1, g + 1]); return { cells, out: [left - 3, g], dir: 1 }; }
  cells.push([right + 1, g], [right + 1, g + 1]);
  return { cells, out: [right + 2, g], dir: 0 };
}

/**
 * Turn-penalised shortest path for a 2x2-block corridor from `from` to `to` over cells that are free (not inside a
 * protected box) or belong to the two entries. Returns the list of block anchors or null.
 */
function corridorPath(from, to, masks, W, H) {
  // masks: { prot, entry, carved } as Uint8Array(W * H). A cell is usable when it is outside every protected box or
  // belongs to one of the two entries. Costs per 2x2 block: fully on an existing corridor 0.25 (corridors merge
  // end-on), partly on one 7 (no widening into three- and four-wide floor), beside one 6 (no parallel lanes), along a
  // room's wall 2.2 (corridors cross the deep rather than hug a hall), fresh 1; a turn adds 4.
  const { prot, entry, carved } = masks;
  const N = W * H;
  const usable = (x, y) => !prot[y * W + x] || entry[y * W + x];
  const ok = (x, y) => x >= 1 && y >= 1 && x + 1 <= W - 2 && y + 1 <= H - 2 && usable(x, y) && usable(x + 1, y) && usable(x, y + 1) && usable(x + 1, y + 1);
  if (!ok(from[0], from[1]) || !ok(to[0], to[1])) return null;
  const isCarved = (x, y) => (x >= 0 && y >= 0 && x < W && y < H && carved[y * W + x] && !entry[y * W + x] ? 1 : 0);
  const ring = (x, y, f) => {
    for (let j = -1; j <= 2; j++) for (let i = -1; i <= 2; i++) {
      if (i >= 0 && i <= 1 && j >= 0 && j <= 1) continue;
      if (f(x + i, y + j)) return true;
    }
    return false;
  };
  const hugging = (cx, cy) => cx >= 0 && cy >= 0 && cx < W && cy < H && prot[cy * W + cx] && !entry[cy * W + cx];
  const costCache = new Float32Array(N).fill(-1);
  const blockCost = (x, y) => {
    const k = y * W + x;
    if (costCache[k] >= 0) return costCache[k];
    const c = isCarved(x, y) + isCarved(x + 1, y) + isCarved(x, y + 1) + isCarved(x + 1, y + 1);
    let v;
    if (c === 4) v = 0.25;
    else if (c > 0) v = 7;
    else if (ring(x, y, isCarved)) v = 6;
    else v = ring(x, y, hugging) ? 2.2 : 1;
    costCache[k] = v;
    return v;
  };
  const okCache = new Int8Array(N).fill(-1);
  const okAt = (x, y) => {
    const k = y * W + x;
    if (okCache[k] < 0) okCache[k] = ok(x, y) ? 1 : 0;
    return okCache[k] === 1;
  };
  const best = new Float64Array(N * 4).fill(Infinity);
  const prev = new Int32Array(N * 4).fill(-1);
  const key = (x, y, d) => (y * W + x) * 4 + d;
  // a tiny binary heap on (cost, state)
  const heap = [];
  const push = (c, st) => { heap.push([c, st]); let i = heap.length - 1; while (i > 0) { const q = (i - 1) >> 1; if (heap[q][0] <= heap[i][0]) break; [heap[q], heap[i]] = [heap[i], heap[q]]; i = q; } };
  const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  for (let d = 0; d < 4; d++) { const k = key(from[0], from[1], d); best[k] = 0; push(0, k); }
  let endKey = -1;
  while (heap.length) {
    const [c, st] = pop();
    if (c > best[st]) continue;
    const d = st % 4, cell = (st - d) / 4, x = cell % W, y = (cell - x) / W;
    if (x === to[0] && y === to[1]) { endKey = st; break; }
    for (let nd = 0; nd < 4; nd++) {
      const nx = x + DIRS[nd][0], ny = y + DIRS[nd][1];
      if (nx < 1 || ny < 1 || nx + 1 > W - 2 || ny + 1 > H - 2 || !okAt(nx, ny)) continue;
      const nc = c + blockCost(nx, ny) + (nd === d ? 0 : 4);
      const nk = key(nx, ny, nd);
      if (nc < best[nk]) { best[nk] = nc; prev[nk] = st; push(nc, nk); }
    }
  }
  if (endKey < 0) return null;
  const path = [];
  for (let st = endKey; st >= 0; st = prev[st]) { const d = st % 4, cell = (st - d) / 4; path.push([cell % W, Math.floor(cell / W)]); if (best[st] === 0) break; }
  return path.reverse();
}

function layout(seed, floor, bandId) {
  const key = `${seed}:${floor}:${bandId}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  const band = BANDS[bandId];
  const pool = PREFAB_SETS[band.prefabs];
  if (!pool || !pool.length) throw new CaveGenError(`band ${bandId} has no prefabs`);
  const [W, H] = gridSize(floor);
  let lastErr = null;
  for (let attempt = 0; attempt < 16; attempt++) {
    const rng = createRng(hashSeed(`${seed}:${floor}:${attempt}`));
    try {
      const L = layoutAttempt(rng, band, floor, pool, W, H, attempt);
      L.attempt = attempt;
      arrivalCell(seed, floor, L);          // the arrival room and column (its own seeded stream)
      checkDressable(L, band, floor);       // a stair room, enough chest and foe spots: else the next attempt
      cacheSet(key, L);
      return L;
    } catch (e) {
      if (!(e instanceof CaveGenError)) throw e;
      lastErr = e;
    }
  }
  throw new CaveGenError(`floor ${floor} seed ${seed}: no attempt produced a walkable floor (${lastErr && lastErr.message})`);
}

function layoutAttempt(rng, band, floor, pool, W, H, attempt) {
  const wantRooms = Math.max(8, Math.min(12, 8 + Math.floor(floor / 25) + rng.int(-1, 1) - Math.min(2, Math.floor(attempt / 4))));
  const budget = (W - 2) * (H - 2) * (0.62 - 0.03 * Math.min(3, Math.floor(attempt / 3)));
  const prefabs = pickPrefabs(rng, band, floor, wantRooms, pool, budget);
  if (prefabs.length < 8) throw new CaveGenError('too few prefabs for the floor');
  const rooms = placeRooms(rng, prefabs, W, H);
  if (!rooms) throw new CaveGenError('placement failed');
  // protection mask: 1 = inside some room's protected box; carved: corridor floor; entry: the current edge's doorway cells
  const prot = new Uint8Array(W * H), carvedM = new Uint8Array(W * H), entryM = new Uint8Array(W * H);
  for (const r of rooms) { const b = pbox(r); for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) prot[y * W + x] = 1; }
  const masks = { prot, entry: entryM, carved: carvedM };
  const edges = roomEdges(rooms);
  const carved = new Set();   // "x,y" cells that become corridor floor (the mask's enumerable twin)
  const links = [];           // [a, b]
  const openings = [];        // { room, side, g } for the dressing pass (face overlays over a carved opening are dropped)
  const cx = (r) => r.x + r.w / 2, cy = (r) => r.y + r.h / 2;
  const carveEdge = (e, forced = null, maxLen = Infinity) => {
    const A = rooms[e.a], B = rooms[e.b];
    const dx = cx(B) - cx(A), dy = cy(B) - cy(A);
    const horiz = Math.abs(dx) >= Math.abs(dy);
    const plans = horiz
      ? [[dx > 0 ? 'e' : 'w', dx > 0 ? 'w' : 'e'], [dy > 0 ? 's' : 'n', dy > 0 ? 'n' : 's']]
      : [[dy > 0 ? 's' : 'n', dy > 0 ? 'n' : 's'], [dx > 0 ? 'e' : 'w', dx > 0 ? 'w' : 'e']];
    // the accretion anchor (a shared door column or row) goes first; then the axis plans; then the mixed pairs
    const mixed = [[plans[0][0], plans[1][1]], [plans[1][0], plans[0][1]]];
    if (forced) plans.unshift([forced.sa, forced.sb]);
    plans.push(...mixed);
    for (const [sa, sb] of plans) {
      const vert = sa === 'n' || sa === 's';
      // aligned openings first: a column (or row) both rooms can open on gives a straight corridor
      const la = A.p.doors[sa].map((v) => (vert ? A.x + v : A.y + v));
      const lb = B.p.doors[sb].map((v) => (vert ? B.x + v : B.y + v));
      if (!la.length || !lb.length) continue;
      const common = la.filter((v) => lb.includes(v));
      const cands = [];
      if (forced && sa === forced.sa && sb === forced.sb && la.includes(forced.g) && lb.includes(forced.g)) cands.push([forced.g, forced.g]);
      const prevA = openings.find((o) => o.room === e.a && o.side === sa), prevB = openings.find((o) => o.room === e.b && o.side === sb);
      if (prevA && prevB) cands.push([prevA.g, prevB.g]);
      if (prevA) cands.push([prevA.g, lb.includes(prevA.g) ? prevA.g : doorOn(B, sb, vert ? cx(A) : cy(A))]);
      if (prevB) cands.push([la.includes(prevB.g) ? prevB.g : doorOn(A, sa, vert ? cx(B) : cy(B)), prevB.g]);
      if (common.length) {
        const mid = vert ? (cx(A) + cx(B)) / 2 : (cy(A) + cy(B)) / 2;
        common.sort((u, v) => Math.abs(u + 0.5 - mid) - Math.abs(v + 0.5 - mid) || u - v);
        cands.push([common[0], common[0]]);
      }
      const ga = doorOn(A, sa, vert ? cx(B) : cy(B)), gb = doorOn(B, sb, vert ? cx(A) : cy(A));
      cands.push([ga, gb]);
      for (const [oa, ob] of cands) {
        if (oa == null || ob == null) continue;
        const ea = entryOf(A, sa, oa), eb = entryOf(B, sb, ob);
        const entryCells = [...ea.cells, ...eb.cells];
        // an entry must never open into a third room's core (a shared band belongs to two rooms only)
        const inOtherCore = ([x, y]) => rooms.some((q) => q !== A && q !== B && x >= core(q).x0 && x <= core(q).x1 && y >= core(q).y0 && y <= core(q).y1);
        if (entryCells.some(inOtherCore)) continue;
        for (const [x, y] of entryCells) entryM[y * W + x] = 1;
        // the two entries meet through a shared band (or touch): the doorway is the corridor
        const direct = touching(ea.cells, eb.cells);
        const path = direct ? [] : corridorPath(ea.out, eb.out, masks, W, H);
        for (const [x, y] of entryCells) entryM[y * W + x] = 0;
        if (!path || path.length > maxLen) continue;
        const carve = (x, y) => { carved.add(`${x},${y}`); carvedM[y * W + x] = 1; };
        for (const [x, y] of entryCells) carve(x, y);
        for (const [x, y] of path) for (const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1]]) carve(x + i, y + j);
        links.push([e.a, e.b]);
        openings.push({ room: e.a, side: sa, g: oa }, { room: e.b, side: sb, g: ob });
        return true;
      }
    }
    return false;
  };
  // the accretion tree first (every anchor has a straight doorway by construction), then Kruskal with carving as the
  // acceptance test: an edge that will not carve is skipped and a later edge may join the same two components through
  // another room; then one or two short loops
  const parent = rooms.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  let comps = rooms.length;
  const leftover = [];
  for (const r of rooms) {
    if (!r.anchor) continue;
    const e = { a: r.anchor.to, b: r.id, d: 0 };
    const ra = find(e.a), rb = find(e.b);
    if (ra === rb) continue;
    if (carveEdge(e, { sa: r.anchor.sideR, sb: r.anchor.sideN, g: r.anchor.g })) { parent[ra] = rb; comps--; }
  }
  for (const e of edges) {
    const ra = find(e.a), rb = find(e.b);
    if (ra === rb) { leftover.push(e); continue; }
    if (carveEdge(e, null, 22)) { parent[ra] = rb; comps--; } else leftover.push(e);
    if (comps === 1) break;
  }
  if (comps > 1) throw new CaveGenError(`rooms could not all be joined (${comps} components)`);
  const loopsWanted = rng.int(1, 2);
  let loops = 0;
  const shortLeft = leftover.filter((e) => e.d <= 20 && !links.some(([a, b]) => a === e.a && b === e.b)).slice(0, 5);
  rng.shuffle(shortLeft);
  for (const e of shortLeft) { if (loops >= loopsWanted) break; if (carveEdge(e, null, 12)) loops++; }
  // the char grid: walls, then each room's faces and floor, then the corridors
  const g = [];
  for (let y = 0; y < H; y++) g.push(new Array(W).fill('#'));
  for (const r of rooms) {
    for (let x = r.x; x < r.x + r.w; x++) { g[r.y - 2][x] = '|'; g[r.y - 1][x] = '|'; }
    for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) g[r.y + y][r.x + x] = r.p.cells[y][x];
  }
  for (const k of carved) { const [x, y] = k.split(',').map(Number); g[y][x] = '.'; }
  const degree = rooms.map(() => 0);
  for (const [a, b] of links) { degree[a]++; degree[b]++; }
  return { W, H, rooms, links, degree, openings, grid: g, carved: [...carved].sort() };
}

// ------------------------------------------------------------------------------------------------ dressing
const key2 = (x, y) => `${x},${y}`;

const faceFreeAt = (L, r, x) => L.grid[r.y - 1][x] === '|' && L.grid[r.y - 1][x + 1] === '|' && L.grid[r.y - 2][x] === '|' && L.grid[r.y - 2][x + 1] === '|';
/** Global columns of room r where a 32 px stair object fits in the north face after the corridors were cut. */
const stairColumns = (L, r) => r.p.cols.filter((c) => c + 1 < r.w && faceFreeAt(L, r, r.x + c)).map((c) => r.x + c);

/** The undressed floor with the prefabs' props and decals in place: what the walk sees before chests and foes. */
function bareModule(L, band) {
  const decor = [], overlays = [];
  for (const r of L.rooms) {
    for (const [t, x, y] of r.p.decor) decor.push({ t, x: r.x + x, y: r.y + y });
    for (const [t, x, y] of r.p.decals) overlays.push({ t, x: r.x + x, y: r.y + y });
  }
  return { ground: wallDepth(L.grid.map((row) => row.join(''))), legend: band.legend, decor, overlays, events: [], start: { x: L.arrival[0], y: L.arrival[1] } };
}

/**
 * Can this layout be dressed? A room other than the arrival's (and not its graph neighbour when any other exists) can
 * hold the stair; at least five chest spots and foeCount(floor) foe spots are reachable outside the arrival room.
 * Throws CaveGenError so layout() rolls the next attempt.
 */
function checkDressable(L, band, floor) {
  const w = walkModel(bareModule(L, band));
  const [ax, ay] = L.arrival;
  if (!w.reached(ax, ay)) throw new CaveGenError('arrival cell is not open');
  const stairRooms = L.rooms.filter((r, i) => i !== L.arrivalRoom && stairColumns(L, r).some((x) => w.reached(x, r.y)));
  if (!stairRooms.length) throw new CaveGenError('no room can hold the stair');
  let chestSpots = 0, foeSpots = 0;
  L.rooms.forEach((r, i) => {
    if (i === L.arrivalRoom) return;
    for (const [x, y] of r.p.marks.chest) if (w.touchable(r.x + x, r.y + y)) chestSpots++;
    for (const [x, y] of r.p.marks.foe) if (w.reached(r.x + x, r.y + y) && Math.abs(r.x + x - ax) + Math.abs(r.y + y - ay) >= 4) foeSpots++;
  });
  if (chestSpots < 5) throw new CaveGenError(`only ${chestSpots} chest spots reachable`);
  if (foeSpots < foeCount(floor)) throw new CaveGenError(`only ${foeSpots} foe spots reachable`);
}

function faceOverlayCells(t, x, y) {
  const [w, h] = OVERLAY_SIZE[t] || [1, 1];
  const out = [];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out.push(key2(x + i, y + j));
  return out;
}

/** Normalise an opts.foes pool entry to { enc, sprite, move }. */
function foeEntry(entry, opts, band) {
  if (typeof entry === 'string') {
    const sprite = (opts.sprites && opts.sprites[entry]) || (band.foes.find((f) => f.enc === entry) || {}).sprite || band.foes[0].sprite;
    return { enc: entry, sprite, move: null };
  }
  return { enc: entry.enc, sprite: entry.sprite, move: entry.move || null };
}

function nextArrival(seed, floor, opts) {
  if (opts.nextArrival) { const a = opts.nextArrival(floor); if (a) return a; }
  if (floor >= 99) return B100_ARRIVAL;
  return arrivalOf(seed, floor + 1, opts);
}
/** Where B99's stairs land on the hand-made B100 (cave_b100.js, C2-sprites-boss): its author passes the real cell via opts.nextArrival. */
export const B100_ARRIVAL = [12, 18];

/** The arrival cell of (seed, floor): the previous floor's stairs target. Cheap: the layout stage only. */
export function arrivalOf(seed, floor, opts = {}) {
  const band = opts.band ? BANDS[opts.band] : bandOf(floor);
  if (floor % 10 === 0) return parseLanding(LANDINGS[band.landing]).marks.arrival.slice();
  const L = layout(seed, floor, band.id);
  return arrivalCell(seed, floor, L).slice();
}

/** The arrival room and column for a layout: the dressing rng stream decides it, so generateFloor and arrivalOf agree. */
function arrivalCell(seed, floor, L) {
  if (L.arrival) return L.arrival;
  const rng = createRng(hashSeed(`${seed}:${floor}:arrival`));
  const cands = L.rooms.map((r, i) => ({ i, cols: stairColumns(L, r), set: r.p.tags.includes('set') })).filter((c) => c.cols.length);
  if (!cands.length) throw new CaveGenError('no room can hold the arrival stair');
  const plain = cands.filter((c) => !c.set && L.degree[c.i] <= 2);
  const pick = rng.pick(plain.length ? plain : cands);
  const r = L.rooms[pick.i];
  const mid = r.x + (r.w - 1) / 2;
  pick.cols.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid) || a - b);
  const ax = pick.cols[Math.min(pick.cols.length - 1, rng.int(0, 1))];
  L.arrival = [ax, r.y];
  L.arrivalRoom = pick.i;
  return L.arrival;
}

/**
 * generateFloor(seed, floor, opts) -> map module. See the header for opts. Throws CaveGenError only when no layout attempt
 * and no dressing re-roll produced a floor whose stair, chests and foes are reachable (the tests prove 200 seeds; the sim
 * scanned 48,600 floors).
 */
export function generateFloor(seed, floor, opts = {}) {
  if (!Number.isInteger(floor) || floor < 1 || floor > 99) throw new CaveGenError(`floor ${floor} is not 1..99 (B100 is a hand-made map)`);
  const band = opts.band ? BANDS[opts.band] : bandOf(floor);
  if (!band) throw new CaveGenError(`unknown band ${opts.band}`);
  const id = `cave_b${floor}`;
  const name = `${band.name}, B${floor}`;
  const next = nextArrival(seed, floor, opts);
  if (floor % 10 === 0) return buildLanding(seed, floor, band, id, name, next, opts);
  const L = layout(seed, floor, band.id);
  // The dressing (stair, chests, foes, decals) is proved at the end; a dressing whose proof fails re-rolls from a derived
  // sub-seed (C3-sim-bot found 2 refusals in 48,600 floors: seed 318 B18, seed 503 B3). The first dressing's seed is unchanged,
  // so every floor that built before builds the same; the arrival cell is the layout's and never moves.
  let lastErr = null;
  for (let k = 0; k < DRESS_ATTEMPTS; k++) {
    const rng = createRng(hashSeed(k === 0 ? `${seed}:${floor}:dress` : `${seed}:${floor}:dress:${k}`));
    try { return dressFloor(seed, floor, band, id, name, next, opts, L, rng); }
    catch (e) { if (!(e instanceof CaveGenError)) throw e; lastErr = e; }
  }
  throw new CaveGenError(`floor ${floor} seed ${seed}: no dressing left the stair, chests and foes reachable (${lastErr && lastErr.message})`);
}
const DRESS_ATTEMPTS = 8;

/** One dressing of a laid-out floor on `rng`: rooms' props, the stair, chests, foes, lights, then the proof. Throws CaveGenError. */
function dressFloor(seed, floor, band, id, name, next, opts, L, rng) {
  const [ax, ay] = arrivalCell(seed, floor, L);
  const arrivalRoom = L.arrivalRoom;
  const ground = wallDepth(L.grid.map((r) => r.join('')));
  const legend = { ...band.legend };
  const overlays = [], decor = [], overhead = [], events = [], marks = {};
  const lights = [];
  // cells opened by corridors in a room's face rows: face overlays that cover them are dropped
  const opened = new Set();
  for (const o of L.openings) {
    const r = L.rooms[o.room];
    if (o.side !== 'n') continue;
    for (let y = r.y - 3; y <= r.y - 1; y++) opened.add(key2(o.g, y)), opened.add(key2(o.g + 1, y));
  }
  const stairCells = new Set();   // the stairs objects are 2 cells wide in the face: overlays there are dropped too
  // the stair room: farthest by walk distance from the arrival over the undressed grid, never a graph neighbour when avoidable
  const preMod = { ground, legend, overlays: [], decor: [], events: [], start: { x: ax, y: ay } };
  const roomCols = (r) => stairColumns(L, r);
  // dress every room first (decor decides the walk), then choose the stair
  for (const r of L.rooms) {
    const top = r.y;
    for (const [t, x, y] of r.p.decor) decor.push({ t, x: r.x + x, y: top + y });
    for (const [t, x, y] of r.p.decals) overlays.push({ t, x: r.x + x, y: top + y });
    for (const [t, x, y] of r.p.overhead) overhead.push({ t, x: r.x + x, y: top + y });
    for (const [x, y, rad, color] of r.p.lights) lights.push({ x: r.x + x, y: top + y, r: rad, color });
  }
  const walk0 = walkModel({ ...preMod, decor, overlays }, [ax, ay]);
  const neighbours = new Set(L.links.filter(([a, b]) => a === arrivalRoom || b === arrivalRoom).map(([a, b]) => (a === arrivalRoom ? b : a)));
  const roomDist = (r) => {
    let best = Infinity;
    for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) { const d = walk0.dist[r.y + y][r.x + x]; if (d >= 0 && d < best) best = d; }
    return best;
  };
  const stairInfo = L.rooms.map((r, i) => ({ i, d: roomDist(r), cols: roomCols(r).filter((x) => walk0.reached(x, r.y)) }));
  const stairCands = stairInfo.filter((c) => c.i !== arrivalRoom && c.cols.length && c.d < Infinity);
  if (!stairCands.length) throw new CaveGenError('no room can hold the stair');
  const farCands = stairCands.filter((c) => !neighbours.has(c.i));
  const useCands = farCands.length ? farCands : stairCands;
  useCands.sort((a, b) => b.d - a.d || a.i - b.i);
  const stairRoom = L.rooms[useCands[0].i];
  const sMid = stairRoom.x + (stairRoom.w - 1) / 2;
  useCands[0].cols.sort((a, b) => Math.abs(a - sMid) - Math.abs(b - sMid) || a - b);
  const sx = useCands[0].cols[0], sy = stairRoom.y;
  stairCells.add(key2(sx, sy - 1)).add(key2(sx + 1, sy - 1)).add(key2(sx, sy - 2)).add(key2(sx + 1, sy - 2));
  stairCells.add(key2(ax, ay - 1)).add(key2(ax + 1, ay - 1)).add(key2(ax, ay - 2)).add(key2(ax + 1, ay - 2));
  // face overlays, minus the ones over an opening or a stair
  for (const r of L.rooms) {
    for (const [t, x, dy] of r.p.face) {
      const gx = r.x + x, gy = r.y + dy;
      const cells = faceOverlayCells(t, gx, gy);
      if (cells.some((k) => opened.has(k) || stairCells.has(k))) continue;
      if (cells.some((k) => { const [cx, cy] = k.split(',').map(Number); return L.grid[cy][cx] !== '|'; })) continue;
      overlays.push({ t, x: gx, y: gy });
    }
  }
  // corridors get a few of the band's floor decals (the hand maps strew roots and puddles down theirs)
  {
    const pool = band.id === 'catalogue' ? ['index_cards', 'roots_1', 'ink_puddle_0', 'roots_0', 'index_cards', 'roots_2', 'ink_puddle_1']
      : ['roots_0', 'pebbles_1', 'roots_2', 'tuft_0', 'ink_puddle_0', 'roots_1', 'pebbles_2', 'leaves'];
    const doorCells = new Set(L.openings.flatMap((o) => { const r = L.rooms[o.room]; const top = r.y, bottom = r.y + r.h - 1, left = r.x, right = r.x + r.w - 1;
      if (o.side === 'n') return [key2(o.g, top - 1), key2(o.g + 1, top - 1), key2(o.g, top - 2), key2(o.g + 1, top - 2), key2(o.g, top - 3), key2(o.g + 1, top - 3)];
      if (o.side === 's') return [key2(o.g, bottom + 1), key2(o.g + 1, bottom + 1)];
      if (o.side === 'w') return [key2(left - 1, o.g), key2(left - 1, o.g + 1)];
      return [key2(right + 1, o.g), key2(right + 1, o.g + 1)]; }));
    let i = 0;
    for (const k of L.carved) {
      i++;
      if (doorCells.has(k)) continue;
      if (rng.next() < 0.07) { const [x, y] = k.split(',').map(Number); overlays.push({ t: pool[i % pool.length], x, y }); }
    }
  }
  decor.push({ t: 'stairs_up', x: ax, y: ay - 1 });
  decor.push({ t: 'stairs_down', x: sx, y: sy - 1 });
  marks.arrival = [ax, ay];
  marks.stairs = [sx, sy];
  events.push(stairsEv('stairs_down', sx, sy - 1, [`cave_b${floor + 1}`, next[0], next[1], 'down']));
  lights.push({ x: ax, y: ay, r: 3, color: '#ffe6b0' }, { x: sx, y: sy, r: 3, color: '#ffe6b0' });
  // the walk with the dressing in place
  const walk = walkModel({ ...preMod, decor, overlays, events }, [ax, ay]);
  if (!walk.reached(sx, sy - 1)) throw new CaveGenError('the stair is not reachable from the arrival', { floor, seed });
  // chests: dead ends farthest first, then any room with a chest spot; never the arrival room
  const chestOpts = opts.chests || {};
  const redWanted = chestOpts.red === undefined || chestOpts.red === 'auto' ? rng.int(2, 4) : chestOpts.red;
  const blueWanted = chestOpts.blue === undefined || chestOpts.blue === 'auto' ? floor % 10 === 5 : !!chestOpts.blue;
  const roomsByPref = L.rooms.map((r, i) => ({ r, i, d: roomDist(r), dead: L.degree[i] === 1 }))
    .filter((c) => c.i !== arrivalRoom && c.r.p.marks.chest.length)
    .sort((a, b) => (b.dead - a.dead) || (b.d - a.d) || (a.i - b.i));
  const chestCells = new Set();
  const spotFree = (r, [x, y]) => !chestCells.has(key2(r.x + x, r.y + y)) && walk.touchable(r.x + x, r.y + y) && !(r.x + x === sx && r.y + y === sy);
  const takeSpot = (c, preferBlue) => {
    const spots = preferBlue && c.r.p.marks.blue.length ? [...c.r.p.marks.blue, ...c.r.p.marks.chest] : c.r.p.marks.chest;
    const s = spots.find((sp) => spotFree(c.r, sp));
    if (!s) return null;
    chestCells.add(key2(c.r.x + s[0], c.r.y + s[1]));
    return [c.r.x + s[0], c.r.y + s[1]];
  };
  let placedRed = 0;
  if (blueWanted) {
    // the farthest dead end with a blue spot, then any dead end, then any room: the first with a free spot
    const stairRoom = useCands[0].i;
    const order = [
      ...roomsByPref.filter((x) => x.i !== stairRoom && x.dead && x.r.p.marks.blue.length),
      ...roomsByPref.filter((x) => x.i !== stairRoom && x.dead),
      ...roomsByPref,
    ];
    let cell = null;
    for (const c of order) { cell = takeSpot(c, true); if (cell) break; }
    if (!cell) throw new CaveGenError('no spot for the blue chest');
    events.push(chestEv('blue_chest', cell[0], cell[1], 'blue', { floor }));
    marks.blue_chest = cell;
  }
  for (let round = 0; round < 3 && placedRed < redWanted; round++) {
    for (const c of roomsByPref) {
      if (placedRed >= redWanted) break;
      if (round === 0 && !c.dead) continue;
      const cell = takeSpot(c, false);
      if (!cell) continue;
      placedRed++;
      events.push(chestEv(`chest_${placedRed}`, cell[0], cell[1], 'red', { floor }));
      marks[`chest_${placedRed}`] = cell;
    }
  }
  if (placedRed < Math.min(redWanted, 2)) throw new CaveGenError(`only ${placedRed} red chests fit`);
  // a chest mark is the cell the party stands on to open it (south first, as whisperwood_hollow's gold_chest mark)
  {
    const w2 = walkModel({ ...preMod, decor, overlays, events }, [ax, ay]);
    for (const e of events) {
      if (e.type !== 'chest') continue;
      const front = [[e.x, e.y + 1], [e.x - 1, e.y], [e.x + 1, e.y], [e.x, e.y - 1]].find(([x, y]) => w2.reached(x, y));
      marks[e.id] = front || [e.x, e.y];
    }
  }
  // foes: from the pool, on prefab spots outside the arrival room, reachable, off the stair and the chests
  const poolRaw = (opts.foes ? opts.foes(floor, band.id) : null) || band.foes;
  const pool = poolRaw.map((e) => foeEntry(e, opts, band));
  const want = foeCount(floor);
  const spots = [];
  L.rooms.forEach((r, i) => { if (i !== arrivalRoom) for (const [x, y] of r.p.marks.foe) spots.push({ x: r.x + x, y: r.y + y, i }); });
  rng.shuffle(spots);
  // round-robin over the rooms (in a shuffled order): every room gets one foe before any room gets a second
  const byRoom = new Map();
  for (const s of spots) { if (!byRoom.has(s.i)) byRoom.set(s.i, []); byRoom.get(s.i).push(s); }
  const roomOrder = rng.shuffle([...byRoom.keys()]);
  const ordered = [];
  for (let pass = 0; pass < 4; pass++) for (const i of roomOrder) { const l = byRoom.get(i); if (l[pass]) ordered.push(l[pass]); }
  let placedFoes = 0;
  const foeCells = new Set();
  for (const s of ordered) {
    if (placedFoes >= want) break;
    if (!walk.reached(s.x, s.y) || chestCells.has(key2(s.x, s.y)) || foeCells.has(key2(s.x, s.y))) continue;
    if (Math.abs(s.x - ax) + Math.abs(s.y - ay) < 4) continue;
    if (s.x === sx && s.y === sy) continue;
    const f = rng.pick(pool);
    const nearChest = [...chestCells].some((k) => { const [cx, cy] = k.split(',').map(Number); return Math.abs(cx - s.x) + Math.abs(cy - s.y) <= 2; });
    const roll = rng.next();
    const move = f.move || (nearChest && roll < 0.5 ? 'guard' : roll < 0.6 ? 'chase' : 'wander');
    placedFoes++;
    foeCells.add(key2(s.x, s.y));
    events.push(enemyEv(`foe_${placedFoes}`, s.x, s.y, f.sprite, f.enc, move, move === 'wander' ? { radius: 2 } : {}));
    marks[`foe_${placedFoes}`] = [s.x, s.y];
  }
  if (placedFoes < Math.min(want, 4)) throw new CaveGenError(`only ${placedFoes} foes fit`);
  for (const l of lights) events.push(lightEv(`light_${events.length}`, l.x, l.y, l.r, l.color));
  // deterministic event order: stairs, chests, foes, lights (already), ids unique by construction
  const mod = {
    id, name, area: 'dungeon', floor, band: band.id, landing: false, seed,
    music: band.music, ambience: band.ambience, tileset: band.tileset, backdrop: band.backdrop,
    lighting: { ...band.lighting },
    under: band.under,
    legend, ground, overlays, decor, overhead, events, exits: [], marks,
    start: { x: ax, y: ay, dir: 'down' },
    // rooms: for tools and tests (stairCols = free north-face columns a stair could use after the corridors were cut)
    rooms: L.rooms.map((r, i) => ({ id: i, prefab: r.p.id, x: r.x, y: r.y, w: r.w, h: r.h, degree: L.degree[i], stairCols: stairInfo[i].cols.length,
      chestSpots: r.p.marks.chest.filter(([x, y]) => walk.touchable(r.x + x, r.y + y)).length,
      role: i === arrivalRoom ? 'arrival' : i === useCands[0].i ? 'stairs' : L.degree[i] === 1 ? 'dead_end' : 'room' })),
    links: L.links.map(([a, b]) => [a, b]),
  };
  // final proof: every chest touchable, every foe reachable, the stair reachable, the arrival open
  const proof = walkModel(mod);
  if (!proof.reached(ax, ay)) throw new CaveGenError('arrival cell is not open');
  if (!proof.reached(sx, sy - 1)) throw new CaveGenError('stair unreachable after dressing');
  for (const e of mod.events) {
    if (e.type === 'chest' && !proof.touchable(e.x, e.y)) throw new CaveGenError(`chest ${e.id} unreachable`);
    if (e.type === 'enemy' && !proof.reached(e.x, e.y)) throw new CaveGenError(`foe ${e.id} unreachable`);
  }
  return mod;
}

function buildLanding(seed, floor, band, id, name, next, opts) {
  const t = parseLanding(LANDINGS[band.landing]);
  const ground = wallDepth(t.rows);
  const [ax, ay] = t.marks.arrival, [sx, sy] = t.marks.stairs, [px, py] = t.marks.plaque, [cx, cy] = t.marks.chest;
  const overlays = t.decals.map(([tt, x, y]) => ({ t: tt, x, y }));
  for (const [tt, x, y] of t.face) overlays.push({ t: tt, x, y });
  const decor = t.decor.map(([tt, x, y]) => ({ t: tt, x, y }));
  decor.push({ t: 'stairs_up', x: ax, y: ay - 1 }, { t: 'stairs_down', x: sx, y: sy - 1 });
  const overhead = t.overhead.map(([tt, x, y]) => ({ t: tt, x, y }));
  const events = [
    stairsEv('stairs_down', sx, sy - 1, [`cave_b${floor + 1}`, next[0], next[1], 'down']),
    chestEv('chest_1', cx, cy, 'red', { floor }),
  ];
  const plaqueText = opts.plaque ? opts.plaque(floor, band.id) : null;
  if (plaqueText) events.push(signEv('plaque', px, py - 1, plaqueText, { solid: false }));
  let n = 0;
  for (const [x, y, r, color] of t.lights) events.push(lightEv(`light_${n++}`, x, y, r, color));
  events.push(lightEv(`light_${n++}`, ax, ay, 3, '#ffe6b0'), lightEv(`light_${n++}`, sx, sy, 3, '#ffe6b0'));
  const mod = {
    id, name, area: 'dungeon', floor, band: band.id, landing: true, seed,
    music: band.music, ambience: band.ambience, tileset: band.tileset, backdrop: band.backdrop,
    lighting: { ...band.lighting, dark: Math.max(0, band.lighting.dark - 0.1) },
    under: band.under,
    legend: { ...band.legend }, ground, overlays, decor, overhead, events, exits: [],
    marks: { arrival: [ax, ay], stairs: [sx, sy], plaque: [px, py], chest_1: [cx, cy] },
    start: { x: ax, y: ay, dir: 'down' },
    rooms: [], links: [],
  };
  const proof = walkModel(mod);
  if (!proof.reached(sx, sy - 1) || !proof.touchable(cx, cy) || !proof.reached(px, py)) throw new CaveGenError(`landing ${t.id} is not walkable`);
  mod.marks.chest_1 = [[cx, cy + 1], [cx - 1, cy], [cx + 1, cy], [cx, cy - 1]].find(([x, y]) => proof.reached(x, y)) || [cx, cy];
  return mod;
}
