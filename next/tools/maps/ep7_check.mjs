// Episode 7 name stones for the map tools (E7-world, docs/EPISODE7_PLAN.md 4.5, 4.10 and 5.1). Pure node, no DOM.
//
// mapcheck.mjs installs this with ONE line (after the Episode 6 line):
//   ({ walk, loadDb, buildGrid } = (await import('./ep7_check.mjs')).install({ walk, loadDb, buildGrid, ... }));
// which, for every map that has a `remember` block or a namestone event, swaps in:
//   - walk(map, db, opts)   stoneWalk below: a search over (held order, cell); a held order is an ordered hold of up to
//                           `capacity` stones (at most 5 stones: 26 orders at capacity 2), a read is a move, with an outer
//                           fixpoint for keys, locked doors, Dash walls, the Lantern and flag gates (the Episode 6 pattern);
//   - buildGrid(map, db)    the plain grid plus the stone authoring and softlock errors (so `mapcheck check` and every
//                           qa/maps validate() report them as errors);
//   - loadDb()              merges assets/tiles/ep7_tiles.json as the pack loader does, and the stand-ins of
//                           src/data/ep7/field/art.js for ids that fragment does not have yet (fade, snowfield, the cairns);
// and registers the event type (namestone). Maps without stones are untouched. The rule is src/data/ep7/field/remember.js.
//
//   node tools/maps/ep7_check.mjs <mapId> [flags]     one map's stone report (ep7_testremember too)
//
// The search models the party, not only the leader: a read whose let-go would fade a cell, or whose hold would freeze one,
// is allowed only when the leader's cell has a walkable neighbour that stays walkable (the two followers trail the leader;
// walking out and back puts them both on ground). A cairn in Keeper ink (`lantern: true`) is readable once the party has the
// Lantern (every Episode 7 map: the party carries it).
//
// Errors: the block parses (remember.js compile: rows, letters, a cairn for every stone, at most 5 stones, one owner a
// cell); every path cell sits over the fade (void) and every frost cell over walkable floor; every cairn stands on ground
// that is never a path or frost cell and has such ground beside it to read from; no event (and no arrival: the start, an
// in-map door landing) stands on a path or frost cell; from every reachable state the entrance (the start or any way off the
// map) is reachable again; every chest is reachable in some state; the critical path (remember.goal: marks visited in order)
// is reachable, its shortest solution never re-reads a stone the party has left more than 6 cells behind and walks at most
// 1.3 times the straight route (the walk with every stone held at once: no loop home, PLAYTEST_REVIEW_8 item 3); its
// decision count (reads, a re-read counts) is within plan 4.10's figure for the map (or remember.budget, a traded figure).
// Reported, not errors: `panned` (path or frost cells more than half a phone screen from their nearest cairn: the read pans
// to them), `decisions`, `steps`, `straight`, `solution` (the reads in order, for autoplay).

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { compile, hasRemember, read, states, keyOf, held, REMEMBER_TYPES } from '../../src/data/ep7/field/remember.js';
import { ensureArt } from '../../src/data/ep7/field/art.js';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const LEDGE_OK = { ledge_s: 'down', ledge_e: 'right', ledge_w: 'left' };
const PASS_THROUGH = new Set(['actor', 'enemy', 'block', 'pot']);
const toList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const MAX_NODES = 2_000_000;
const HALF_PHONE = [12, 6];
/** Plan 4.10: main-path stone decisions per map (16 in all). */
export const PLAN_BUDGET = { ep7_white_road: 4, ep7_vault_f1: 4, ep7_vault_f2: 3, ep7_vault_f3: 5 };
export const TOTAL_BUDGET = 16;
const READ_COST = 1000;      // a read outweighs any walk: the solution is the fewest decisions, then the shortest walk
const BEHIND = 6;
const LOOP_RATIO = 1.3;

let H = null;                 // mapcheck's own helpers (install)
const analysed = new WeakMap();

export { hasRemember };

/** Wire into mapcheck (see the header). Returns the wrapped { walk, loadDb, buildGrid }. */
export function install(h) {
  H = h;
  for (const t of REMEMBER_TYPES) h.EVENT_TYPES.add(t);
  const walk = (map, db, opts = {}) => (hasRemember(map) ? analyse(map, db, opts).report : h.walk(map, db, opts));
  const buildGrid = (map, db) => {
    const g = h.buildGrid(map, db);
    if (!hasRemember(map) || !(map.events || []).length) return g;
    g.errors.push(...analyse(map, db, {}).errors);
    return g;
  };
  const loadDb = async () => mergeEp7(await h.loadDb());
  return { walk, buildGrid, loadDb };
}

// ------------------------------------------------------------------------------------------------ db
function mergeEp7(db) {
  if (!db || db.ep7Merged) return db;
  const read = (p) => { try { return JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', p), 'utf8')); } catch (e) { return null; } };
  const frag = read('tiles/ep7_tiles.json');
  if (frag) {
    for (const k of ['terrains', 'walls', 'tiles', 'objects', 'overlays']) {
      db.tiles[k] = db.tiles[k] || {};
      for (const [id, v] of Object.entries(frag[k] || {})) if (!(id in db.tiles[k])) db.tiles[k][id] = v;
    }
    for (const id of frag.terrainOrder || []) if (!db.tiles.terrainOrder.includes(id)) db.tiles.terrainOrder.push(id);
  }
  ensureArt(db.tiles);
  for (const [base, atlas] of [['npcs', db.npcAtlas], ['enemies_field', db.enemiesField]]) {
    const f = read(`sprites/ep7_${base}.json`);
    if (f && atlas) for (const k of ['frames', 'anims', 'sprites']) if (f[k]) atlas[k] = { ...f[k], ...(atlas[k] || {}) };
  }
  db.ep7Merged = true;
  return db;
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
  if (!H) throw new Error('ep7_check: install() first (mapcheck.mjs does it)');
  const errors = [];
  const m = compile(map) || compile({ ...map, remember: { capacity: 2, paths: null } });
  errors.push(...m.errors);
  const { W, N } = m, HH = m.H;
  const grid = H.buildGrid(map, db);
  const bare = H.buildGrid({ ...map, events: [] }, db);
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < HH;
  const idx = (x, y) => y * W + x;
  const xyOf = (i) => `${i % W},${(i / W) | 0}`;
  const rule = (i) => m.owner[i] >= 0 || m.frostOwner[i] >= 0;
  const events = map.events || [];
  const flags = opts.flags ? new Set(opts.flags) : null;
  const storyOk = (e) => {
    for (const f of toList(e.if)) if (flags && !flags.has(f)) return false;
    for (const f of toList(e.ifNot)) if (flags && flags.has(f)) return false;
    return true;
  };
  const evs = events.filter(storyOk);
  const byCell = new Map();
  for (const e of evs) for (const [x, y] of cellsOf(e)) { const k = `${x},${y}`; if (!byCell.has(k)) byCell.set(k, []); byCell.get(k).push(e); }
  const evAt = (x, y) => byCell.get(`${x},${y}`) || [];
  const ST = states(m), S_COUNT = ST.length;
  const stIndex = new Map(ST.map((s, k) => [keyOf(m, s), k]));
  const heldOf = ST.map((s) => new Set(held(m, s)));

  // ---------------------------------------------------------------- authoring rules
  for (let i = 0; i < N; i++) {
    const c = bare.code[(i / W) | 0][i % W];
    if (m.owner[i] >= 0 && c !== 'void') errors.push(`stones: path cell ${xyOf(i)} (stone ${m.stones[m.owner[i]]}) is over ${c}, not the fade (void)`);
    if (m.frostOwner[i] >= 0 && c !== 'none') errors.push(`stones: frost cell ${xyOf(i)} (stone ${m.stones[m.frostOwner[i]]}) is over ${c}, not walkable floor`);
  }
  for (const c of m.cairns) {
    if (!inb(c.x, c.y)) { errors.push(`namestone ${c.id}: off the map at ${c.x},${c.y}`); continue; }
    if (rule(c.i)) { errors.push(`namestone ${c.id}: stands on a path or frost cell at ${c.x},${c.y}`); continue; }
    if (bare.code[c.y][c.x] !== 'none') errors.push(`namestone ${c.id}: its cell ${c.x},${c.y} is ${bare.code[c.y][c.x]}, not ground`);
    const faced = Object.values(DIRS).some(([dx, dy]) => inb(c.x + dx, c.y + dy) && !rule(idx(c.x + dx, c.y + dy)) && bare.code[c.y + dy][c.x + dx] === 'none');
    if (!faced) errors.push(`namestone ${c.id}: no ground beside it to read it from (a stone approach is never a path or frost cell)`);
    if (!c.ev.name) errors.push(`namestone ${c.id}: no name (a text key for the float line)`);
  }
  for (const e of events) {
    if (e.type === 'light' || e.type === 'namestone' || (e.type === 'trigger' && e.on === 'interact')) continue;
    for (const [x, y] of cellsOf(e)) if (inb(x, y) && rule(idx(x, y))) errors.push(`${e.type} ${e.id} stands on a path or frost cell at ${x},${y}`);
  }
  const arrivals = [];
  if (map.start) arrivals.push(['start', map.start.x, map.start.y]);
  for (const e of events) if (Array.isArray(e.to) && e.to[0] === map.id) arrivals.push([`${e.id} landing`, e.to[1], e.to[2]]);
  for (const [k, [x, y]] of (opts.arrivals || []).entries()) arrivals.push([`arrival ${k}`, x, y]);
  for (const [name, x, y] of arrivals) if (inb(x, y) && rule(idx(x, y))) errors.push(`stones: arrival ${name} at ${x},${y} is on a path or frost cell`);
  const panned = [];
  for (const s of m.stones) {
    const cs = m.cairns.filter((c) => c.stone === s);
    for (const i of [...m.pathOf[s], ...m.frostOf[s]]) {
      const x = i % W, y = (i / W) | 0;
      if (!cs.some((c) => Math.abs(c.x - x) <= HALF_PHONE[0] && Math.abs(c.y - y) <= HALF_PHONE[1])) panned.push(`${xyOf(i)}(${s})`);
    }
  }

  // ---------------------------------------------------------------- the state search
  const lantern0 = opts.lantern != null ? !!opts.lantern : /^ep7_/.test(map.id || '');
  const mono = { opened: new Set(), keys: new Set(opts.keys || []), broken: new Set(), openCells: new Set(), lantern: lantern0, flags: new Set(opts.flags || []), log: [] };
  const codes = new Map();
  const gateIsOpen = (e) => mono.opened.has(e.id);
  /** The code of every cell in state k (free: every path open, no frost: the straight route). */
  function codesFor(k, free = false) {
    const ck = free ? -1 : k;
    if (codes.has(ck)) return codes.get(ck);
    const code = new Array(N), hs = free ? null : heldOf[k];
    for (let y = 0; y < HH; y++) for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      let c = grid.code[y][x];
      if (grid.faint && grid.faint[y][x] && mono.lantern) c = H.tileCode(db, grid.faint[y][x].replace('_faint', '_revealed')) ?? c;
      if (mono.openCells.has(`${x},${y}`)) c = 'none';
      for (const e of evAt(x, y)) {
        if (e.type === 'object' && e.breakable && mono.broken.has(e.id)) c = 'none';
        else if ((e.type === 'gate' || e.type === 'locked_door') && gateIsOpen(e)) c = 'none';
        else if (PASS_THROUGH.has(e.type)) c = 'none';
        else if (e.type === 'namestone') c = 'solid';
      }
      if (m.owner[i] >= 0) c = free || hs.has(m.stones[m.owner[i]]) ? 'none' : 'void';
      else if (m.frostOwner[i] >= 0 && !free && hs.has(m.stones[m.frostOwner[i]])) c = 'solid';
      code[i] = c;
    }
    codes.set(ck, code);
    return code;
  }
  const cairnsAt = new Map();   // cell -> cairns read from it
  for (const c of m.cairns) for (const [dx, dy] of Object.values(DIRS)) {
    const x = c.x + dx, y = c.y + dy;
    if (!inb(x, y)) continue;
    const k = idx(x, y);
    if (!cairnsAt.has(k)) cairnsAt.set(k, []);
    cairnsAt.get(k).push(c);
  }
  const readable = (c) => storyOk(c.ev) && (!c.ev.lantern || mono.lantern);
  /** The read of stone s from cell i in state k: the next state index, or -1 when refused (the party modelled). */
  function readFrom(k, i, s) {
    const r = read(m, ST[k], s, [i]);
    if (!r.ok) return -1;
    const nk = stIndex.get(keyOf(m, r.state));
    if (nk === k) return k;
    const lose = new Set();
    for (const g of r.letGo) for (const j of m.pathOf[g]) lose.add(j);
    if (!r.reread) for (const j of m.frostOf[s]) lose.add(j);
    if (lose.size) {
      const code = codesFor(k), x = i % W, y = (i / W) | 0;
      const room = Object.values(DIRS).some(([dx, dy]) => { const nx = x + dx, ny = y + dy; if (!inb(nx, ny)) return false; const j = idx(nx, ny); return code[j] === 'none' && !lose.has(j); });
      if (!room) return -1;
    }
    return nk;
  }

  /** Moves from node (k, i): steps, door landings, reads. push(k, j, read?) and exit(). */
  function moves(k, i, push, exit, reads = true, free = false) {
    const code = codesFor(k, free);
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
        if (t && t[0] === map.id && inb(t[1], t[2])) push(k, idx(t[1], t[2])); else { push(k, j); exit(k, j); }
        continue;
      }
      let landed = false;
      for (const e of evAt(nx, ny)) {
        const to = e.to, open = e.type === 'door' || ((e.type === 'gate' || e.type === 'locked_door') && gateIsOpen(e));
        if (open && to && to[0] === map.id && inb(to[1], to[2])) { push(k, j); push(k, idx(to[1], to[2])); landed = true; }
      }
      if (!landed) push(k, j);
    }
    if (!reads) return;
    for (const c of cairnsAt.get(i) || []) {
      if (!readable(c)) continue;
      const nk = readFrom(k, i, c.stone);
      if (nk >= 0 && nk !== k) push(nk, i, c);
    }
  }

  /** Breadth first from start nodes; returns { seen, exits, rev }. */
  function explore(starts, reads = true) {
    const seen = new Map(), exits = new Set(), rev = new Map(), q = [];
    for (const n of starts) if (!seen.has(n)) { seen.set(n, -1); q.push(n); }
    let qi = 0;
    while (qi < q.length) {
      if (seen.size > MAX_NODES) { errors.push(`stones: state search passed ${MAX_NODES} nodes`); break; }
      const node = q[qi++];
      const k = Math.floor(node / N), i = node - k * N;
      moves(k, i, (nk, j) => {
        const nn = nk * N + j;
        let l = rev.get(nn); if (!l) rev.set(nn, (l = [])); l.push(node);
        if (!seen.has(nn)) { seen.set(nn, node); q.push(nn); }
      }, (nk = k, j = i) => exits.add(nk * N + j), reads);
    }
    return { seen, exits, rev };
  }

  const startXY = opts.start || (map.start ? [map.start.x, map.start.y] : null);
  if (!startXY) return { errors: [...errors, 'map has no start'], report: { id: map.id, errors: ['map has no start'], unreached: [], log: [], events: [], marks: [] } };
  const startI = idx(startXY[0], startXY[1]);
  const k0 = stIndex.get(keyOf(m, { order: m.start }));
  const touch = (e, cellSet) => cellsOf(e).some(([x, y]) => cellSet.has(idx(x, y)) || Object.values(DIRS).some(([dx, dy]) => inb(x + dx, y + dy) && cellSet.has(idx(x + dx, y + dy))));
  let S = null;
  function search() {
    codes.clear();
    const r = explore([k0 * N + startI]);
    const cells = new Set(), byState = new Map();
    for (const node of r.seen.keys()) {
      const k = Math.floor(node / N), i = node - k * N;
      cells.add(i);
      if (!byState.has(k)) byState.set(k, new Set());
      byState.get(k).add(i);
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
  const nameOf = (k) => keyOf(m, ST[k]) || 'none';
  const describe = (node) => { const k = Math.floor(node / N), i = node - k * N; return `${xyOf(i)} holding ${nameOf(k)}`; };
  if (stranded.length) errors.push(`stones softlock: ${stranded.length} reachable states never get back to the entrance, e.g. ${stranded.slice(0, 3).map(describe).join('; ')}`);
  for (const e of evs) if (e.type === 'chest' && !touchedIn(e)) errors.push(`stones: chest ${e.id} is not reachable in any state`);

  // ---------------------------------------------------------------- the critical path: decisions, loops home, the straight route
  const goalCells = (g) => {
    if (g === 'exit') return null;
    const xy = Array.isArray(g) ? g : (map.marks || {})[g];
    if (!xy || !inb(xy[0], xy[1])) { errors.push(`stones: remember.goal "${g}" is not a mark of this map`); return new Set(); }
    const out = new Set([idx(xy[0], xy[1])]);
    if (bare.code[xy[1]][xy[0]] !== 'none' || evAt(xy[0], xy[1]).some((e) => e.type === 'chest' || e.type === 'object')) for (const [dx, dy] of Object.values(DIRS)) if (inb(xy[0] + dx, xy[1] + dy)) out.add(idx(xy[0] + dx, xy[1] + dy));
    return out;
  };
  const goals = toList(map.remember && map.remember.goal);
  let solution = null, decisions = null, steps = null, straight = null;
  if (goals.length) {
    let node = k0 * N + startI, total = { reads: 0, steps: 0, trail: [{ i: startI, read: null }] };
    let freeAt = startI, straightSum = 0, failed = false;
    for (const g of goals) {
      const want = goalCells(g);
      const hit = (nd) => { const i = nd % N; return want ? want.has(i) : S.exits.has(nd); };
      const seg = dijkstra(node, hit);
      if (!seg) { errors.push(`stones: the critical path never reaches "${g}"`); failed = true; break; }
      total.reads += seg.reads; total.steps += seg.steps; total.trail.push(...seg.trail);
      node = seg.end;
      const fs = freeWalk(freeAt, (i) => (want ? want.has(i) : false));
      if (fs) { straightSum += fs.steps; freeAt = fs.end; }
    }
    if (!failed) {
      decisions = total.reads; steps = total.steps; straight = straightSum;
      solution = total.trail.filter((t) => t.read).map((t) => `${t.read.id}@${xyOf(t.i)}`);
      // no loop home: a re-read of a stone the party had already left more than BEHIND cells behind (progress = the straight
      // route's distance from the start, so a second cairn of the same stone further on is not a loop)
      const prog = new Map(), pq = [startI];
      prog.set(startI, 0);
      for (let qi = 0; qi < pq.length; qi++) { const i = pq[qi]; moves(0, i, (k, j) => { if (!prog.has(j)) { prog.set(j, prog.get(i) + 1); pq.push(j); } }, () => {}, false, true); }
      for (const v of loopHome(total.trail, (i) => prog.get(i) ?? 0, BEHIND)) errors.push(`stones: the critical path re-reads ${v.id} ${v.behind} cells behind the party's furthest point (more than ${BEHIND}: a loop home)`);
      if (straight > 0 && steps > LOOP_RATIO * straight) errors.push(`stones: the critical path walks ${steps} cells, over ${LOOP_RATIO} times the straight route (${straight})`);
      const budget = map.remember && Number.isInteger(map.remember.budget) ? map.remember.budget : PLAN_BUDGET[map.id];
      if (budget != null && decisions > budget) errors.push(`stones: ${decisions} decisions on the critical path, plan 4.10 allows ${budget}${map.remember.budget != null ? ' (traded)' : ''}`);
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
      const k = Math.floor(n / N), i = n - k * N;
      moves(k, i, (nk, j, c) => {
        const nn = nk * N + j, nd = d + (c ? READ_COST : 1);
        if (nd < (dist.get(nn) ?? Infinity)) { dist.set(nn, nd); prev.set(nn, n); if (c) via.set(nn, c); else via.delete(nn); pushH(nd, nn); }
      }, () => {});
    }
    return null;
  }
  /** The straight route: every path open, no frost, no reads. */
  function freeWalk(from, hit) {
    const seen = new Map([[from, 0]]), q = [from];
    for (let qi = 0; qi < q.length; qi++) {
      const i = q[qi];
      if (hit(i)) return { steps: seen.get(i), end: i };
      moves(0, i, (k, j) => { if (!seen.has(j)) { seen.set(j, seen.get(i) + 1); q.push(j); } }, () => {}, false, true);
    }
    return null;
  }

  // ---------------------------------------------------------------- report (the shape of mapcheck.walk)
  const report = {
    id: map.id, W, H: HH, start: startXY, errors: [...grid.errors], opened: [...mono.opened], keys: [...mono.keys], lantern: mono.lantern,
    log: mono.log, appraised: [], reachable: [...S.cells].map(xyOf), events: [], marks: [], unreached: [],
    stones: { stones: m.stones, cairns: m.cairns.map((c) => c.id), capacity: m.capacity, start: m.start, states: S.byState.size, nodes: S.seen.size,
      stranded: stranded.length, panned, decisions, budget: map.remember && Number.isInteger(map.remember.budget) ? map.remember.budget : PLAN_BUDGET[map.id] ?? null,
      steps, straight, solution, firstAt: {} },
  };
  const first = new Map(), touchCells = new Map();
  for (const e of events) for (const [x, y] of cellsOf(e)) for (const [dx, dy] of [[0, 0], ...Object.values(DIRS)]) {
    if (!inb(x + dx, y + dy)) continue;
    const k = idx(x + dx, y + dy);
    if (!touchCells.has(k)) touchCells.set(k, []);
    touchCells.get(k).push(e);
  }
  for (const node of S.seen.keys()) {
    const k = Math.floor(node / N), i = node - k * N;
    for (const e of touchCells.get(i) || []) if (!first.has(e.id)) first.set(e.id, k);
  }
  for (const e of events) {
    const present = storyOk(e);
    const k = present ? (e.on === 'enter' ? k0 : first.has(e.id) ? first.get(e.id) : null) : null;
    report.events.push({ id: e.id, type: e.type, reached: k != null, at: k != null ? nameOf(k) : null });
    if (k == null) report.unreached.push(e.id);
    else report.stones.firstAt[e.id] = nameOf(k);
  }
  for (const [name, [x, y]] of Object.entries(map.marks || {})) {
    const i = inb(x, y) ? idx(x, y) : -1;
    report.marks.push({ name, x, y, walkable: i >= 0 && bare.code[y][x] === 'none', reached: i >= 0 && S.cells.has(i) });
  }
  const code0 = codesFor(k0);
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
 * The re-reads of a solution trail ([{ i, read }] in order) made at a cairn more than `behind` cells (of progress) behind the
 * furthest point the party had reached: [{ id, behind }]. A first read never counts; nor does a re-read further on.
 */
export function loopHome(trail, progress, behind = BEHIND) {
  const out = [], seen = new Set();
  let furthest = 0;
  for (const t of trail) {
    const p = progress(t.i);
    if (t.read) {
      if (seen.has(t.read.stone) && furthest - p > behind) out.push({ id: t.read.id, behind: furthest - p });
      seen.add(t.read.stone);
    }
    furthest = Math.max(furthest, p);
  }
  return out;
}

/** The decisions of the maps given ({ id: report.stones }) against plan 4.10's total. */
export function budgetTotal(reports) {
  let sum = 0;
  for (const r of Object.values(reports)) if (r && r.decisions != null) sum += r.decisions;
  return { sum, total: TOTAL_BUDGET, ok: sum <= TOTAL_BUDGET };
}

// ------------------------------------------------------------------------------------------------ CLI
async function main() {
  const [id, fl] = process.argv.slice(2);
  if (!id) { console.log('usage: node tools/maps/ep7_check.mjs <mapId> [flags]'); return; }
  const mc = await import(pathToFileURL(path.join(NEXT, 'tools', 'maps', 'mapcheck.mjs')).href);
  const db = await mc.loadDb();
  let map;
  const tests = await import(pathToFileURL(path.join(NEXT, 'src', 'data', 'ep7', 'field', '_testremember.js')).href);
  if (id === tests.TEST_REMEMBER.id) map = tests.TEST_REMEMBER;
  else map = await mc.loadMap(id);
  if (!hasRemember(map)) { console.log(`${id}: no name stones, nothing to check`); return; }
  const a = analyse(map, db, fl ? { flags: fl.split(',').filter(Boolean) } : {});
  const r = a.report, gerr = mc.buildGrid(map, db).errors.filter((e) => !a.errors.includes(e));
  const all = [...gerr, ...a.errors];
  const st = r.stones;
  console.log(`${id}: ${all.length} errors, ${st.states} states, ${st.nodes} nodes, unreached: ${r.unreached.join(' ') || 'none'}`);
  for (const e of all) console.log('  ERROR ' + e);
  if (r.log.length) console.log('  walk: ' + r.log.join('; '));
  if (st.decisions != null) console.log(`  decisions: ${st.decisions}${st.budget != null ? ` of ${st.budget} (plan 4.10)` : ' (no plan figure)'}; walk ${st.steps} cells, straight route ${st.straight}; reads: ${st.solution.join(' ') || 'none'}`);
  else console.log('  decisions: not counted (no remember.goal)');
  if (st.panned.length) console.log(`  the read pans to ${st.panned.length} cells: ${st.panned.slice(0, 12).join(' ')}${st.panned.length > 12 ? ' ...' : ''}`);
  process.exit(all.length ? 1 : 0);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1); });
