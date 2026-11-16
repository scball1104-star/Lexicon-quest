// Episode 8 pop-up books for the map tools (E8-world, docs/EPISODE8_PLAN.md 4.4, 4.10 and 5.1). Pure node, no DOM.
//
// mapcheck.mjs installs this with ONE line (after the Episode 7 line):
//   ({ walk, loadDb, buildGrid } = (await import('./ep8_check.mjs')).install({ walk, loadDb, buildGrid, ... }));
// which swaps in:
//   - walk(map, db, opts)   bookWalk below, for every map with a `popbooks` block or a popbook event: a search over (book
//                           state, cell); a state is one character per book (shut, or the way its pages stand: at most 3^6 =
//                           729 states), a read is a move, with an outer fixpoint for keys, locked doors, Dash walls, the
//                           Lantern and flag gates (the Episode 6 and 7 pattern);
//   - buildGrid(map, db)    the plain grid plus the book authoring and softlock errors (so `mapcheck check` and every qa/maps
//                           validate() report them as errors), and for every ep8_ map the camera rule on the focus marks
//                           docs/story/STAGING_EP8.md lists for it (when that file exists);
//   - loadDb()              merges assets/tiles/ep8_tiles.json as the pack loader does, and the stand-ins of
//                           src/data/ep8/field/art.js for ids that fragment does not have yet (void_violet, marble_page, books);
// and registers the event type (popbook). Maps without books are untouched (but for the camera rule). The rule is
// src/data/ep8/field/popbooks.js.
//
//   node tools/maps/ep8_check.mjs <mapId> [flags]     one map's book report (ep8_testbooks too)
//
// The grid and the search are built from ONLY the events present under the flag set searched; no flags given means no flags
// set (an `if` event is absent, an `ifNot` one stands). The CLI runs the bare map and then each main-path flag set.
//
// The search models the party, not only the leader: a read that takes ground away (a new wall, a bridge that shuts) is
// allowed only when the leader's cell has a walkable neighbour that stays walkable (the two followers trail the leader;
// walking out and back puts them both on ground). A book in Keeper ink (`lantern: true`) is readable once the party has the
// Lantern (every Episode 8 map: the party carries it).
//
// Errors: the block parses (popbooks.js compile: axes, lengths, one owner a cell, pairs, a popbook event per book at its
// cell, at most 6 books, `start`); every book cell is ground; every book has ground on at least one long side to read it
// from, and no reading cell is another book's page cell; every page cell lies over void or plain floor (never a wall, water,
// a door or an off-map cell); no event (an NPC, a foe, a trigger, a chest, a door: anything but a light) and no arrival (the
// start, an in-map door landing) stands on a page cell; from every reachable state the entrance (the start or any way off
// the map) is reachable again; every chest is reachable in some state; the critical path (popbooks.goal: marks visited in
// order) is reachable, its shortest solution never re-reads a book the party has left more than 6 cells behind and walks
// at most 1.3 times the straight route (every page over void a bridge, no walls: no loop home, PLAYTEST_REVIEW_8 item 3);
// its decision count (reads: an open, a close, a pair swap each count one) is within plan 4.10's figure for the map (or
// popbooks.budget, a traded figure); the camera rule (focus marks 12 tiles from the sides and 7 from the top and bottom,
// exempt on an axis the map fits in one screen: 24 x 13).
// Reported, not errors: `panned` (page cells more than half a phone screen from every reading cell of their book: the read
// pans to them), `decisions`, `steps`, `straight`, `solution` (the reads in order, for autoplay), `margins` (each focus mark).

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { compile, hasPopbooks, read, states, initial, covered, describe, POPBOOK_TYPES, AXES, SHUT } from '../../src/data/ep8/field/popbooks.js';
import { ensureArt } from '../../src/data/ep8/field/art.js';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const LEDGE_OK = { ledge_s: 'down', ledge_e: 'right', ledge_w: 'left' };
const PASS_THROUGH = new Set(['actor', 'enemy', 'block', 'pot']);
const toList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const MAX_NODES = 3_000_000;
const HALF_PHONE = [12, 6];
/** The camera rule (EPISODE8 bible section 1, plan 4): focus marks this far from the sides / the top and bottom. */
export const CAMERA = { sides: 12, ends: 7, screenW: 24, screenH: 13 };
/** Plan 4.10: main-path book decisions per map (16 in all). */
export const PLAN_BUDGET = { ep8_stair: 4, ep8_library_f1: 4, ep8_library_f2: 4, ep8_library_f3: 4 };
export const TOTAL_BUDGET = 16;
/** Plan 4.10: the optional decisions per map (5 in all), reported beside the main path. */
export const PLAN_OPTIONAL = { ep8_stair: 1, ep8_library_f1: 1, ep8_library_f2: 2, ep8_library_f3: 1 };
/**
 * The main-path story flags each book map is played under (plan 2.2; the map agents' qa/maps tests may use the same sets).
 * The CLI runs every set when no flags are given.
 */
const EP7_DONE = ['ep7_complete', 'doors_reopened', 'ep6_complete', 'ep5_complete', 'ep4_complete', 'ep3_complete', 'ep2_complete',
  'ep1_complete', 'mira_joined', 'bram_joined', 'lantern_get'];
const STAIR = [...EP7_DONE, 'ep8_morning_done', 'ep8_started', 'ep8_roofed', 'stair_arrived'];
const STAIR_ON = [...STAIR, 'first_rub_done', 'first_book_read', 'eraser_seen'];
const F1 = [...STAIR_ON, 'saw_scriptorium', 'scriptorium_arrived', 'read_learned', 'librarian_met', 'card_read', 'elowen_met',
  'library_open', 'library_entered', 'lib_f1_arrived'];
const F2 = [...F1, 'keeper_memory_a', 'ink_key_found', 'library_f1_done', 'lib_f2_arrived'];
const F2_WON = [...F2, 'keeper_memory_b', 'sentry_defeated'];
const F3 = [...F2_WON, 'library_f2_done', 'lib_f3_arrived'];
export const MAIN_FLAGS = {
  ep8_stair: { stair: STAIR, 'stair on': STAIR_ON },
  ep8_library_f1: { F1, 'F1 back': [...F1, 'keeper_memory_a', 'ink_key_found'] },
  ep8_library_f2: { F2, 'F2 won': F2_WON, 'F2 done': [...F2_WON, 'library_f2_done'] },
  ep8_library_f3: { F3, 'F3 named': [...F3, 'keeper_memory_c', 'beginning_seen', 'name_told'] },
};
const READ_COST = 1000;      // a read outweighs any walk: the solution is the fewest decisions, then the shortest walk
const BEHIND = 6;
const LOOP_RATIO = 1.3;

let H = null;                 // mapcheck's own helpers (install)
const analysed = new WeakMap();

export { hasPopbooks };

/** Wire into mapcheck (see the header). Returns the wrapped { walk, loadDb, buildGrid }. */
export function install(h) {
  H = h;
  for (const t of POPBOOK_TYPES) h.EVENT_TYPES.add(t);
  const walk = (map, db, opts = {}) => (hasPopbooks(map) ? analyse(map, db, opts).report : h.walk(map, db, opts));
  const buildGrid = (map, db) => {
    const g = h.buildGrid(map, db);
    if (map && /^ep8_/.test(map.id || '') && map.marks) g.errors.push(...cameraRule(map).errors);
    if (!hasPopbooks(map) || !(map.events || []).length) return g;
    g.errors.push(...analyse(map, db, {}).errors);
    return g;
  };
  const loadDb = async () => mergeEp8(await h.loadDb());
  return { walk, buildGrid, loadDb };
}

// ------------------------------------------------------------------------------------------------ db
function mergeEp8(db) {
  if (!db || db.ep8Merged) return db;
  const readJ = (p) => { try { return JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', p), 'utf8')); } catch (e) { return null; } };
  const frag = readJ('tiles/ep8_tiles.json');
  if (frag) {
    for (const k of ['terrains', 'walls', 'tiles', 'objects', 'overlays']) {
      db.tiles[k] = db.tiles[k] || {};
      for (const [id, v] of Object.entries(frag[k] || {})) if (!(id in db.tiles[k])) db.tiles[k][id] = v;
    }
    for (const id of frag.terrainOrder || []) if (!db.tiles.terrainOrder.includes(id)) db.tiles.terrainOrder.push(id);
  }
  ensureArt(db.tiles);
  for (const [base, atlas] of [['npcs', db.npcAtlas], ['enemies_field', db.enemiesField]]) {
    const f = readJ(`sprites/ep8_${base}.json`);
    if (f && atlas) for (const k of ['frames', 'anims', 'sprites']) if (f[k]) atlas[k] = { ...f[k], ...(atlas[k] || {}) };
  }
  db.ep8Merged = true;
  return db;
}

// ------------------------------------------------------------------------------------------------ the camera rule
let stagingText;
function staging() {
  if (stagingText === undefined) {
    try { stagingText = fs.readFileSync(path.join(NEXT, 'docs', 'story', 'STAGING_EP8.md'), 'utf8'); } catch (e) { stagingText = null; }
  }
  return stagingText;
}
/**
 * The focus marks STAGING_EP8.md lists for a map, or [] (no file, no line). The line reads
 * "Focus marks, `<map>` (W x H: band): `a` (x, y: left, right, top, bottom), `b` (x, y: ...)." and runs to the next bullet,
 * heading or blank line. A mark is a backticked name followed by " (" (its cell); a name in a note ("(`margin` at y 5 is a
 * trigger ...)") is not one.
 */
export function focusMarks(mapId, text = staging()) {
  if (!text) return [];
  const at = text.indexOf('Focus marks, `' + mapId + '`');
  if (at < 0) return [];
  const rest = text.slice(at);
  const end = rest.search(/\n\s*(?:- |#)|\n\s*\n/);
  const seg = (end < 0 ? rest : rest.slice(0, end)).replace(/\s+/g, ' ');
  return [...new Set([...seg.matchAll(/`(\w+)` \(/g)].map((x) => x[1]).filter((n) => n !== mapId))];
}
/** The camera margin of every focus mark of a map: { errors, margins: [{ mark, x, y, sides, ends, ok }] }. */
export function cameraRule(map, text = staging()) {
  const errors = [], margins = [];
  const W = Math.max(...(map.ground || ['']).map((r) => String(r).length)), Hh = (map.ground || []).length;
  for (const name of focusMarks(map.id, text)) {
    const xy = (map.marks || {})[name];
    if (!xy) { errors.push(`camera: STAGING_EP8 focus mark ${name} is not a mark of ${map.id}`); continue; }
    const [x, y] = xy;
    const sides = Math.min(x, W - 1 - x), ends = Math.min(y, Hh - 1 - y);
    const okX = W <= CAMERA.screenW || sides >= CAMERA.sides, okY = Hh <= CAMERA.screenH || ends >= CAMERA.ends;
    margins.push({ mark: name, x, y, sides, ends, ok: okX && okY });
    if (!okX) errors.push(`camera: focus mark ${name} (${x},${y}) is ${sides} tiles from a side of ${map.id} (the rule: ${CAMERA.sides})`);
    if (!okY) errors.push(`camera: focus mark ${name} (${x},${y}) is ${ends} tiles from the top or bottom of ${map.id} (the rule: ${CAMERA.ends})`);
  }
  return { errors, margins };
}

// ------------------------------------------------------------------------------------------------ analysis
/** Rules plus the state search, once per map object (and option set). Returns { errors, report }. */
export function analyse(map, db, opts = {}) {
  const key = JSON.stringify({ f: opts.flags || null, s: opts.start || null, k: opts.keys || null, l: opts.lantern ?? null, a: opts.arrivals || null });
  let per = analysed.get(map);
  if (!per) { per = new Map(); analysed.set(map, per); }
  if (per.has(key)) return per.get(key);
  const out = run(map, db, opts);
  per.set(key, out);
  return out;
}

function run(map, db, opts) {
  if (!H) throw new Error('ep8_check: install() first (mapcheck.mjs does it)');
  const errors = [];
  const m = compile(map) || compile({ ...map, popbooks: { books: {} } });
  errors.push(...m.errors);
  const { W, N } = m, HH = m.H;
  const bare = H.buildGrid({ ...map, events: [] }, db);
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < HH;
  const idx = (x, y) => y * W + x;
  const xyOf = (i) => `${i % W},${(i / W) | 0}`;
  const isPage = (i) => m.owner[i] >= 0;
  const events = map.events || [];
  // the story flags of the save searched: none given means none set (an `if` event is absent, an `ifNot` one stands), so the
  // grid, the cells and the search are those of a save with exactly these flags (an absent closed door never blocks)
  const flags = new Set(opts.flags || []);
  const storyOk = (e) => {
    for (const f of toList(e.if)) if (!flags.has(f)) return false;
    for (const f of toList(e.ifNot)) if (flags.has(f)) return false;
    return true;
  };
  const evs = events.filter(storyOk);
  const grid = H.buildGrid({ ...map, events: evs }, db);
  const byCell = new Map();
  for (const e of evs) for (const [x, y] of cellsOf(e)) { const k = `${x},${y}`; if (!byCell.has(k)) byCell.set(k, []); byCell.get(k).push(e); }
  const evAt = (x, y) => byCell.get(`${x},${y}`) || [];
  const under = new Array(N);
  for (let i = 0; i < N; i++) under[i] = bare.code[(i / W) | 0] ? bare.code[(i / W) | 0][i % W] : 'void';
  const overVoid = (i) => under[i] === 'void';

  // ---------------------------------------------------------------- authoring rules
  const doorCells = new Set();
  for (const e of events) if (e.type === 'door' || e.type === 'locked_door' || e.type === 'gate') for (const [x, y] of cellsOf(e)) if (inb(x, y)) doorCells.add(idx(x, y));
  for (let i = 0; i < N; i++) {
    if (!isPage(i)) continue;
    const c = under[i];
    if (c !== 'void' && c !== 'none') errors.push(`books: page cell ${xyOf(i)} (book ${m.books[m.owner[i]]}) is over ${c}, not void or plain floor`);
  }
  for (const d of m.def) {
    const ev = m.events.find((e) => e.book === d.id);
    for (const [x, y] of d.cells) if (inb(x, y) && bare.code[y][x] !== 'none') errors.push(`popbook ${ev ? ev.id : d.id}: its cell ${x},${y} is ${bare.code[y][x]}, not ground`);
    let readable = 0;
    for (const side of AXES[d.axis]) for (const [x, y] of d.reads[side]) {
      if (!inb(x, y)) continue;
      const i = idx(x, y);
      if (isPage(i) && m.owner[i] !== d.k) errors.push(`popbook ${ev ? ev.id : d.id}: its reading cell ${x},${y} is a page cell of book ${m.books[m.owner[i]]}`);
      if (bare.code[y][x] === 'none') readable++;
    }
    if (!readable) errors.push(`popbook ${ev ? ev.id : d.id}: no ground on either long side to read it from`);
  }
  for (const e of events) {
    if (e.type === 'light' || e.type === 'popbook') continue;
    for (const [x, y] of cellsOf(e)) if (inb(x, y) && isPage(idx(x, y))) errors.push(`${e.type} ${e.id} stands on a page cell at ${x},${y} (book ${m.books[m.owner[idx(x, y)]]})`);
  }
  const arrivals = [];
  if (map.start) arrivals.push(['start', map.start.x, map.start.y]);
  for (const e of events) if (Array.isArray(e.to) && e.to[0] === map.id) arrivals.push([`${e.id} landing`, e.to[1], e.to[2]]);
  for (const [k, [x, y]] of (opts.arrivals || []).entries()) arrivals.push([`arrival ${k}`, x, y]);
  for (const [name, x, y] of arrivals) if (inb(x, y) && isPage(idx(x, y))) errors.push(`books: arrival ${name} at ${x},${y} is on a page cell`);
  const panned = [];
  for (const d of m.def) {
    const rc = AXES[d.axis].flatMap((s) => d.reads[s]);
    for (const dir of Object.keys(d.pagesOf)) for (const i of d.pagesOf[dir]) {
      const x = i % W, y = (i / W) | 0;
      if (!rc.some(([rx, ry]) => Math.abs(rx - x) <= HALF_PHONE[0] && Math.abs(ry - y) <= HALF_PHONE[1])) panned.push(`${xyOf(i)}(${d.id})`);
    }
  }

  // ---------------------------------------------------------------- the state search
  const ST = states(m), S_COUNT = ST.length;
  const stIndex = new Map(ST.map((s, k) => [s, k]));
  const lantern0 = opts.lantern != null ? !!opts.lantern : /^ep8_/.test(map.id || '');
  const mono = { opened: new Set(), keys: new Set(opts.keys || []), broken: new Set(), openCells: new Set(), lantern: lantern0, flags: new Set(opts.flags || []), log: [] };
  const codes = new Map();
  const gateIsOpen = (e) => mono.opened.has(e.id);
  /** The code of every cell in state k (free: every page over void a bridge, no walls: the straight route). */
  function codesFor(k, free = false) {
    const ck = free ? -1 : k;
    if (codes.has(ck)) return codes.get(ck);
    const code = new Array(N), st = free ? null : ST[k];
    for (let y = 0; y < HH; y++) for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      let c = grid.code[y][x];
      if (grid.faint && grid.faint[y][x] && mono.lantern) c = H.tileCode(db, grid.faint[y][x].replace('_faint', '_revealed')) ?? c;
      if (mono.openCells.has(`${x},${y}`)) c = 'none';
      for (const e of evAt(x, y)) {
        if (e.type === 'object' && e.breakable && mono.broken.has(e.id)) c = 'none';
        else if ((e.type === 'gate' || e.type === 'locked_door') && gateIsOpen(e)) c = 'none';
        else if (PASS_THROUGH.has(e.type)) c = 'none';
        else if (e.type === 'popbook') c = 'solid';
      }
      if (m.bookAt[i] >= 0) c = 'solid';
      if (isPage(i)) {
        if (free) c = overVoid(i) ? 'none' : c;
        else if (covered(m, st, i)) c = overVoid(i) ? 'none' : 'solid';
      }
      code[i] = c;
    }
    codes.set(ck, code);
    return code;
  }
  const booksAt = new Map();   // cell -> [{ k, side, ev }] books read from it
  for (const e of m.events) {
    if (!storyOk(e.ev)) continue;
    const d = m.def[m.index.get(e.book)];
    for (const side of AXES[d.axis]) for (const [x, y] of d.reads[side]) {
      if (!inb(x, y)) continue;
      const i = idx(x, y);
      if (!booksAt.has(i)) booksAt.set(i, []);
      booksAt.get(i).push({ k: d.k, side, ev: e.ev, id: e.id });
    }
  }
  const blockerCells = [];
  for (const e of evs) if (e.type === 'npc' || e.type === 'enemy' || e.type === 'trigger') for (const c of cellsOf(e)) blockerCells.push(c);
  const readable = (b) => !b.ev.lantern || mono.lantern;
  /** The read of book k from cell i in state s (index): the next state index, or -1 when refused (the party modelled). */
  function readFrom(s, i, b) {
    const r = read(m, ST[s], b.k, b.side, [i], blockerCells);
    if (!r.ok) return -1;
    const ns = stIndex.get(r.state);
    if (ns == null) return -1;
    // the ground the read takes away: new walls, and every bridge that shuts
    const lose = new Set();
    for (let k = 0; k < m.books.length; k++) {
      const a = ST[s][k], c = r.state[k];
      if (a === c) continue;
      if (a !== SHUT) for (const j of m.def[k].pagesOf[a]) if (overVoid(j)) lose.add(j);
      if (c !== SHUT) for (const j of m.def[k].pagesOf[c]) if (!overVoid(j)) lose.add(j);
    }
    if (lose.size) {
      const code = codesFor(s), x = i % W, y = (i / W) | 0;
      const room = Object.values(DIRS).some(([dx, dy]) => { const nx = x + dx, ny = y + dy; if (!inb(nx, ny)) return false; const j = idx(nx, ny); return code[j] === 'none' && !lose.has(j); });
      if (!room) return -1;
    }
    return ns;
  }

  /** Moves from node (s, i): steps, door landings, reads. push(s, j, read?) and exit(). */
  function moves(s, i, push, exit, reads = true, free = false) {
    const code = codesFor(s, free);
    const x = i % W, y = (i / W) | 0;
    for (const e of evAt(x, y)) if (Array.isArray(e.to) && e.to[0] !== map.id && (e.type === 'door' || ((e.type === 'gate' || e.type === 'locked_door') && gateIsOpen(e)))) exit();
    for (const x2 of map.exits || []) if (x >= x2.x && x < x2.x + (x2.w || 1) && y >= x2.y && y < x2.y + (x2.h || 1)) exit();
    for (const [dir, [dx, dy]] of Object.entries(DIRS)) {
      const nx = x + dx, ny = y + dy;
      if (!inb(nx, ny)) continue;
      const j = idx(nx, ny), c = code[j];
      let ok = c === 'none' || c === 'pit';
      if (LEDGE_OK[c]) ok = LEDGE_OK[c] === dir;
      if (!ok) continue;
      if (c === 'pit') {
        const t = pitTarget(map, evAt(nx, ny));
        if (t && t[0] === map.id && inb(t[1], t[2])) push(s, idx(t[1], t[2])); else { push(s, j); exit(s, j); }
        continue;
      }
      let landed = false;
      for (const e of evAt(nx, ny)) {
        const to = e.to, open = e.type === 'door' || ((e.type === 'gate' || e.type === 'locked_door') && gateIsOpen(e));
        if (open && to && to[0] === map.id && inb(to[1], to[2])) { push(s, j); push(s, idx(to[1], to[2])); landed = true; }
      }
      if (!landed) push(s, j);
    }
    if (!reads) return;
    for (const b of booksAt.get(i) || []) {
      if (!readable(b)) continue;
      const ns = readFrom(s, i, b);
      if (ns >= 0 && ns !== s) push(ns, i, b);
    }
  }

  /** Breadth first from start nodes; returns { seen, exits, rev }. */
  function explore(starts) {
    const seen = new Map(), exits = new Set(), rev = new Map(), q = [];
    for (const n of starts) if (!seen.has(n)) { seen.set(n, -1); q.push(n); }
    let qi = 0;
    while (qi < q.length) {
      if (seen.size > MAX_NODES) { errors.push(`books: state search passed ${MAX_NODES} nodes`); break; }
      const node = q[qi++];
      const s = Math.floor(node / N), i = node - s * N;
      moves(s, i, (ns, j) => {
        const nn = ns * N + j;
        let l = rev.get(nn); if (!l) rev.set(nn, (l = [])); l.push(node);
        if (!seen.has(nn)) { seen.set(nn, node); q.push(nn); }
      }, (ns = s, j = i) => exits.add(ns * N + j));
    }
    return { seen, exits, rev };
  }

  const startXY = opts.start || (map.start ? [map.start.x, map.start.y] : null);
  if (!startXY) return { errors: [...errors, 'map has no start'], report: { id: map.id, errors: ['map has no start'], unreached: [], log: [], events: [], marks: [] } };
  const startI = idx(startXY[0], startXY[1]);
  const s0 = stIndex.has(initial(m)) ? stIndex.get(initial(m)) : 0;
  const touch = (e, cellSet) => cellsOf(e).some(([x, y]) => cellSet.has(idx(x, y)) || Object.values(DIRS).some(([dx, dy]) => inb(x + dx, y + dy) && cellSet.has(idx(x + dx, y + dy))));
  let S = null;
  function search() {
    codes.clear();
    const r = explore([s0 * N + startI]);
    const cells = new Set(), byState = new Map();
    for (const node of r.seen.keys()) {
      const s = Math.floor(node / N), i = node - s * N;
      cells.add(i);
      if (!byState.has(s)) byState.set(s, new Set());
      byState.get(s).add(i);
    }
    S = { ...r, cells, byState };
    return S;
  }
  const touchedIn = (e) => { for (const set of S.byState.values()) if (touch(e, set)) return true; return false; };
  const gateFlags = new Set();
  for (const e of evs) if (e.type === 'gate') for (const f of toList(e.flags)) gateFlags.add(f);
  for (let iter = 0; iter < 24; iter++) {
    search();
    let changedAny = false;
    for (const e of evs) {
      if ((e.type === 'chest' || e.type === 'pot') && e.item && /_key$/.test(e.item) && !mono.keys.has(e.item) && touchedIn(e)) { mono.keys.add(e.item); mono.log.push(`${e.item} from ${e.id}`); changedAny = true; }
      if (e.type === 'object' && e.script === 'lantern_get' && !mono.lantern && touchedIn(e)) { mono.lantern = true; mono.log.push(`lantern from ${e.id}`); changedAny = true; }
      if (e.type === 'object' && e.breakable && !mono.broken.has(e.id) && touchedIn(e)) { mono.broken.add(e.id); for (const [x, y] of e.opens || []) mono.openCells.add(`${x},${y}`); mono.log.push(`broke ${e.id}`); changedAny = true; }
      if (e.type === 'locked_door' && !mono.opened.has(e.id) && mono.keys.has(e.key) && touchedIn(e)) { mono.opened.add(e.id); mono.log.push(`unlocked ${e.id}`); changedAny = true; }
      if (e.type === 'object' && e.script && gateFlags.has(e.script) && !mono.flags.has(e.script) && touchedIn(e)) { mono.flags.add(e.script); mono.log.push(`${e.script} from ${e.id}`); changedAny = true; }
      if (e.type === 'gate' && !mono.opened.has(e.id)) {
        const src = evs.filter((s) => toList(s.target).includes(e.id));
        const fl = toList(e.flags);
        if (!src.length && !fl.length) continue;
        const ready = src.every((s) => touchedIn(s) && !(s.hidden && !mono.lantern)) && fl.every((f) => mono.flags.has(f));
        if (ready) { mono.opened.add(e.id); mono.log.push(`opened ${e.id}${src.length ? ` via ${src.map((s) => s.id).join('+')}` : ''}${fl.length ? ` by ${fl.join('+')}` : ''}`); changedAny = true; }
      }
    }
    if (!changedAny) break;
  }

  // ---------------------------------------------------------------- softlocks
  const safe = new Set(), q2 = [];
  for (const node of S.seen.keys()) { const i = node % N; if (i === startI || S.exits.has(node)) { safe.add(node); q2.push(node); } }
  while (q2.length) { const n = q2.pop(); for (const p of S.rev.get(n) || []) if (!safe.has(p)) { safe.add(p); q2.push(p); } }
  const stranded = [];
  for (const node of S.seen.keys()) if (!safe.has(node)) stranded.push(node);
  const nameOf = (s) => describe(m, ST[s]);
  const describeNode = (node) => { const s = Math.floor(node / N), i = node - s * N; return `${xyOf(i)} with ${nameOf(s)}`; };
  if (stranded.length) errors.push(`books softlock: ${stranded.length} reachable states never get back to the entrance, e.g. ${stranded.slice(0, 3).map(describeNode).join('; ')}`);
  for (const e of evs) if (e.type === 'chest' && !touchedIn(e)) errors.push(`books: chest ${e.id} is not reachable in any state`);

  // ---------------------------------------------------------------- the critical path: decisions, loops home, the straight route
  const goalCells = (g) => {
    if (g === 'exit') return null;
    const xy = Array.isArray(g) ? g : (map.marks || {})[g];
    if (!xy || !inb(xy[0], xy[1])) { errors.push(`books: popbooks.goal "${g}" is not a mark of this map`); return new Set(); }
    const out = new Set([idx(xy[0], xy[1])]);
    if (bare.code[xy[1]][xy[0]] !== 'none' || evAt(xy[0], xy[1]).some((e) => e.type === 'chest' || e.type === 'object')) for (const [dx, dy] of Object.values(DIRS)) if (inb(xy[0] + dx, xy[1] + dy)) out.add(idx(xy[0] + dx, xy[1] + dy));
    return out;
  };
  const goals = toList(map.popbooks && map.popbooks.goal);
  const budget = map.popbooks && Number.isInteger(map.popbooks.budget) ? map.popbooks.budget : PLAN_BUDGET[map.id] ?? null;
  let solution = null, decisions = null, steps = null, straight = null;
  if (goals.length) {
    let node = s0 * N + startI;
    const total = { reads: 0, steps: 0, trail: [{ i: startI, read: null }] };
    let freeAt = startI, straightSum = 0, failed = false;
    for (const g of goals) {
      const want = goalCells(g);
      const hit = (nd) => { const i = nd % N; return want ? want.has(i) : S.exits.has(nd); };
      const seg = dijkstra(node, hit);
      if (!seg) { errors.push(`books: the critical path never reaches "${g}"`); failed = true; break; }
      total.reads += seg.reads; total.steps += seg.steps; total.trail.push(...seg.trail);
      node = seg.end;
      const fs2 = freeWalk(freeAt, (i) => (want ? want.has(i) : false));
      if (fs2) { straightSum += fs2.steps; freeAt = fs2.end; }
    }
    if (!failed) {
      decisions = total.reads; steps = total.steps; straight = straightSum;
      solution = total.trail.filter((t) => t.read).map((t) => `${t.read.id}@${xyOf(t.i)}`);
      // no loop home: a re-read of a book the party had already left more than BEHIND cells behind (progress = the straight
      // route's distance from the start)
      const prog = new Map(), pq = [startI];
      prog.set(startI, 0);
      for (let qi = 0; qi < pq.length; qi++) { const i = pq[qi]; moves(0, i, (s, j) => { if (!prog.has(j)) { prog.set(j, prog.get(i) + 1); pq.push(j); } }, () => {}, false, true); }
      for (const v of loopHome(total.trail, (i) => prog.get(i) ?? 0, BEHIND)) errors.push(`books: the critical path re-reads ${v.id} ${v.behind} cells behind the party's furthest point (more than ${BEHIND}: a loop home)`);
      if (straight > 0 && steps > LOOP_RATIO * straight) errors.push(`books: the critical path walks ${steps} cells, over ${LOOP_RATIO} times the straight route (${straight})`);
      if (budget != null && decisions > budget) errors.push(`books: ${decisions} decisions on the critical path, plan 4.10 allows ${budget}${map.popbooks.budget != null ? ' (traded)' : ''}`);
    }
  }

  /** Fewest reads, then fewest steps, from node to a node where hit(); { reads, steps, end, trail } or null. */
  function dijkstra(from, hit) {
    const dist = new Map([[from, 0]]), prev = new Map(), via = new Map();
    const heap = [[0, from]];
    const pushH = (d, n) => { heap.push([d, n]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
    const popH = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = 2 * c + 1, r = l + 1; let s = c; if (l < heap.length && heap[l][0] < heap[s][0]) s = l; if (r < heap.length && heap[r][0] < heap[s][0]) s = r; if (s === c) break; [heap[s], heap[c]] = [heap[c], heap[s]]; c = s; } } return top; };
    while (heap.length) {
      const [d, n] = popH();
      if (d > dist.get(n)) continue;
      if (hit(n)) {
        const trail = [];
        let reads = 0, stepsN = 0;
        for (let c = n; c !== from; c = prev.get(c)) { const r = via.get(c); trail.push({ i: c % N, read: r || null }); if (r) reads++; else stepsN++; }
        trail.reverse();
        return { reads, steps: stepsN, end: n, trail };
      }
      const s = Math.floor(n / N), i = n - s * N;
      moves(s, i, (ns, j, b) => {
        const nn = ns * N + j, nd = d + (b ? READ_COST : 1);
        if (nd < (dist.get(nn) ?? Infinity)) { dist.set(nn, nd); prev.set(nn, n); if (b) via.set(nn, b); else via.delete(nn); pushH(nd, nn); }
      }, () => {});
    }
    return null;
  }
  /** The straight route: every page over void a bridge, no walls, no reads. */
  function freeWalk(from, hit) {
    const seen = new Map([[from, 0]]), q = [from];
    for (let qi = 0; qi < q.length; qi++) {
      const i = q[qi];
      if (hit(i)) return { steps: seen.get(i), end: i };
      moves(0, i, (s, j) => { if (!seen.has(j)) { seen.set(j, seen.get(i) + 1); q.push(j); } }, () => {}, false, true);
    }
    return null;
  }

  // ---------------------------------------------------------------- report (the shape of mapcheck.walk)
  const cam = /^ep8_/.test(map.id || '') ? cameraRule(map) : { errors: [], margins: [] };
  const report = {
    id: map.id, W, H: HH, start: startXY, errors: [...grid.errors], opened: [...mono.opened], keys: [...mono.keys], lantern: mono.lantern,
    log: mono.log, appraised: [], reachable: [...S.cells].map(xyOf), events: [], marks: [], unreached: [],
    books: { books: m.books, events: m.events.map((e) => e.id), start: initial(m), states: S.byState.size, legal: S_COUNT, nodes: S.seen.size,
      stranded: stranded.length, panned, decisions, budget, optional: PLAN_OPTIONAL[map.id] ?? null, steps, straight, solution,
      margins: cam.margins, firstAt: {} },
  };
  const first = new Map(), touchCells = new Map();
  for (const e of events) for (const [x, y] of cellsOf(e)) for (const [dx, dy] of [[0, 0], ...Object.values(DIRS)]) {
    if (!inb(x + dx, y + dy)) continue;
    const k = idx(x + dx, y + dy);
    if (!touchCells.has(k)) touchCells.set(k, []);
    touchCells.get(k).push(e);
  }
  for (const node of S.seen.keys()) {
    const s = Math.floor(node / N), i = node - s * N;
    for (const e of touchCells.get(i) || []) if (!first.has(e.id)) first.set(e.id, s);
  }
  // an event absent under these flags is not on this save's map at all (mapcheck.walk drops it the same way): not unreached
  for (const e of evs) {
    const s = e.on === 'enter' ? s0 : first.has(e.id) ? first.get(e.id) : null;
    report.events.push({ id: e.id, type: e.type, reached: s != null, at: s != null ? nameOf(s) : null });
    if (s == null) report.unreached.push(e.id);
    else report.books.firstAt[e.id] = nameOf(s);
  }
  for (const [name, [x, y]] of Object.entries(map.marks || {})) {
    const i = inb(x, y) ? idx(x, y) : -1;
    report.marks.push({ name, x, y, walkable: i >= 0 && bare.code[y][x] === 'none', reached: i >= 0 && S.cells.has(i) });
  }
  const code0 = codesFor(s0);
  report.grid = [];
  report.floorCells = 0;
  for (let y = 0; y < HH; y++) { const row = []; for (let x = 0; x < W; x++) { const c = code0[idx(x, y)]; row.push(c); if (c === 'none') report.floorCells++; } report.grid.push(row); }
  return { errors, report };
}

function cellsOf(e) {
  if (H && H.eventCells) return H.eventCells(e);
  const out = [];
  for (let j = 0; j < (e.h || 1); j++) for (let i = 0; i < (e.w || 1); i++) out.push([e.x + i, e.y + j]);
  return out;
}
function pitTarget(map, here) { for (const e of here) if (e.type === 'pit' && e.to) return e.to; return map.pitTo || null; }

/**
 * The re-reads of a solution trail ([{ i, read }] in order) made more than `behind` cells (of progress) behind the furthest
 * point the party had reached: [{ id, behind }]. A first read of a book never counts.
 */
export function loopHome(trail, progress, behind = BEHIND) {
  const out = [], seen = new Set();
  let furthest = 0;
  for (const t of trail) {
    const p = progress(t.i);
    if (t.read) {
      const key = t.read.k != null ? t.read.k : t.read.id;
      if (seen.has(key) && furthest - p > behind) out.push({ id: t.read.id, behind: furthest - p });
      seen.add(key);
    }
    furthest = Math.max(furthest, p);
  }
  return out;
}

/** The decisions of the maps given ({ id: report.books }) against plan 4.10's total. */
export function budgetTotal(reports) {
  let sum = 0;
  for (const r of Object.values(reports)) if (r && r.decisions != null) sum += r.decisions;
  return { sum, total: TOTAL_BUDGET, ok: sum <= TOTAL_BUDGET };
}

// ------------------------------------------------------------------------------------------------ CLI
async function main() {
  const [id, fl] = process.argv.slice(2);
  if (!id) { console.log('usage: node tools/maps/ep8_check.mjs <mapId> [flags]'); return; }
  const mc = await import(pathToFileURL(path.join(NEXT, 'tools', 'maps', 'mapcheck.mjs')).href);
  const db = await mc.loadDb();
  let map;
  const tests = await import(pathToFileURL(path.join(NEXT, 'src', 'data', 'ep8', 'field', '_testbooks.js')).href);
  if (id === tests.TEST_BOOKS.id) map = tests.TEST_BOOKS;
  else map = await mc.loadMap(id);
  if (!hasPopbooks(map)) {
    const cam = cameraRule(map);
    console.log(`${id}: no pop-up books; camera rule: ${cam.errors.length} errors over ${cam.margins.length} focus marks`);
    for (const e of cam.errors) console.log('  ERROR ' + e);
    process.exit(cam.errors.length ? 1 : 0);
  }
  // no flags given: the bare map (no flags set), then every main-path flag set of this map (MAIN_FLAGS)
  const runs = fl ? [[fl, fl.split(',').filter(Boolean)]] : [['no flags', []], ...Object.entries(MAIN_FLAGS[id] || {})];
  let bad = 0;
  for (const [name, flags] of runs) {
    const a = analyse(map, db, { flags });
    const r = a.report, gerr = mc.buildGrid(map, db).errors.filter((e) => !a.errors.includes(e));
    const all = [...new Set([...gerr, ...a.errors])];
    const st = r.books;
    bad += all.length;
    console.log(`${id} [${name}]: ${all.length} errors, ${st.states} of ${st.legal} states, ${st.nodes} nodes, unreached: ${r.unreached.join(' ') || 'none'}`);
    for (const e of all) console.log('  ERROR ' + e);
    if (r.log.length) console.log('  walk: ' + r.log.join('; '));
    if (st.decisions != null) console.log(`  decisions: ${st.decisions}${st.budget != null ? ` of ${st.budget} (plan 4.10)` : ' (no plan figure)'}; walk ${st.steps} cells, straight route ${st.straight}; reads: ${st.solution.join(' ') || 'none'}`);
    else console.log('  decisions: not counted (no popbooks.goal)');
    if (st.panned.length) console.log(`  the read pans to ${st.panned.length} cells: ${st.panned.slice(0, 12).join(' ')}${st.panned.length > 12 ? ' ...' : ''}`);
    if (st.margins.length) console.log(`  camera: ${st.margins.map((g) => `${g.mark} ${g.sides}/${g.ends}${g.ok ? '' : ' (under)'}`).join(', ')}`);
  }
  process.exit(bad ? 1 : 0);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1); });
