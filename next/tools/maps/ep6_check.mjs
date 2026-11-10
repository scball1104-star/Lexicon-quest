// Episode 6 gust lanes for the map tools (E6-world, docs/EPISODE6_PLAN.md 4.4 and 5.1). Pure node, no DOM.
//
// mapcheck.mjs installs this with ONE line (after the Episode 5 line):
//   ({ walk, loadDb, buildGrid } = (await import('./ep6_check.mjs')).install({ walk, loadDb, buildGrid, ... }));
// which, for every map that has a `wind` block or a vane or mooring event, swaps in:
//   - walk(map, db, opts)   windWalk below: a search over (state, cell) where a state is the set of turned vane groups (at
//                           most 3 groups: 8 states) and a step onto a live lane cell is the whole ride (wind.js follow),
//                           with an outer fixpoint for keys, locked doors, Dash walls, the Lantern and flag gates;
//   - buildGrid(map, db)    the plain grid plus the wind authoring and softlock errors (so `mapcheck check` and every
//                           qa/maps validate() report them as errors);
//   - loadDb()              merges assets/tiles/ep6_tiles.json and the ep6 sprite fragments as the pack loader does, and the
//                           stand-ins of src/data/ep6/field/art.js for ids that fragment does not have yet (cloudbank, vane,
//                           fan_vane, mooring_post);
// and registers the event types (vane, mooring). Maps without wind are untouched. The rule is src/data/ep6/field/wind.js.
//
//   node tools/maps/ep6_check.mjs <mapId> [flags]     the wind report of one map (ep6_testwind, ep6_testring too)
//
// Rules checked (errors): the wind block parses (wind.js compile: rows, chars, groups, one group per cell, at most 3 groups,
// a vane's group exists, a mooring on a lane cell); at most 3 vanes; every lane cell (any state) sits over void (cloudbank,
// a duct shaft), never walkable ground; a vane stands on ground that is never a lane, and is faced from ground or a mooring
// cell; no enemy, NPC, actor or step trigger, and no arrival point (the start, an in-map door landing, opts.arrivals), on a
// lane cell; every ride from every live cell in every state ends (no loop, at most 64 cells); from every reachable state the
// entrance (the start, or any way off the map) is reachable again; every cell a ride can stop on (a post, a blocked stop)
// can be left: by a step onto ground or a ride that ends elsewhere, in that state AND after a reload there (the authored
// lanes: a cell that is calm then wakes the party on the nearest ground, reported as `rescued`); every arrival reaches a
// vane of its floor in the authored state (or the floor has none). Reported, not errors: rides whose landing is more than
// one phone screen (24 x 13 tiles) from where they start (`longRides`: the camera follows the ride, so they pan).

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { compile, live, follow, canTurn, hasWind, stateOf, DXY, WIND_TYPES, MAX_RIDE } from '../../src/data/ep6/field/wind.js';
import { ensureArt } from '../../src/data/ep6/field/art.js';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const LEDGE_OK = { ledge_s: 'down', ledge_e: 'right', ledge_w: 'left' };
const PASS_THROUGH = new Set(['actor', 'enemy', 'block', 'pot']);
const STANDERS = new Set(['enemy', 'npc', 'actor']);
const toList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const MAX_NODES = 2_000_000;
const PHONE = [24, 13];

let H = null;                 // mapcheck's own helpers (install)
const analysed = new WeakMap();

export { hasWind };

/** Wire into mapcheck (see the header). Returns the wrapped { walk, loadDb, buildGrid }. */
export function install(h) {
  H = h;
  for (const t of WIND_TYPES) h.EVENT_TYPES.add(t);
  if (!h.GATE_SPRITE_IDS.includes('sky_keyhole')) h.GATE_SPRITE_IDS.push('sky_keyhole');   // the Sky Compass Keyhole (E6-integrate)
  const walk = (map, db, opts = {}) => (hasWind(map) ? analyse(map, db, opts).report : h.walk(map, db, opts));
  const buildGrid = (map, db) => {
    const g = h.buildGrid(map, db);
    if (!hasWind(map)) return g;
    g.errors.push(...analyse(map, db, {}).errors);
    return g;
  };
  const loadDb = async () => mergeEp6(await h.loadDb());
  return { walk, buildGrid, loadDb };
}

// ------------------------------------------------------------------------------------------------ db
function mergeEp6(db) {
  if (!db || db.ep6Merged) return db;
  const read = (p) => { try { return JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', p), 'utf8')); } catch (e) { return null; } };
  const frag = read('tiles/ep6_tiles.json');
  if (frag) {
    for (const k of ['terrains', 'walls', 'tiles', 'objects', 'overlays']) {
      db.tiles[k] = db.tiles[k] || {};
      for (const [id, v] of Object.entries(frag[k] || {})) if (!(id in db.tiles[k])) db.tiles[k][id] = v;
    }
    for (const id of frag.terrainOrder || []) if (!db.tiles.terrainOrder.includes(id)) db.tiles.terrainOrder.push(id);
  }
  ensureArt(db.tiles);
  for (const [base, atlas] of [['npcs', db.npcAtlas], ['enemies_field', db.enemiesField]]) {
    const f = read(`sprites/ep6_${base}.json`);
    if (f && atlas) for (const k of ['frames', 'anims', 'sprites']) if (f[k]) atlas[k] = { ...f[k], ...(atlas[k] || {}) };
  }
  db.ep6Merged = true;
  return db;
}

// ------------------------------------------------------------------------------------------------ analysis
/** Rules plus the state search, once per map object (and option set). Returns { errors, report }. */
export function analyse(map, db, opts = {}) {
  const key = JSON.stringify({ f: opts.flags || null, s: opts.start || null, k: opts.keys || null, l: !!opts.lantern, a: opts.arrivals || null });
  let per = analysed.get(map);
  if (!per) { per = new Map(); analysed.set(map, per); }
  if (per.has(key)) return per.get(key);
  const out = run(map, db, opts);
  per.set(key, out);
  return out;
}

function run(map, db, opts) {
  if (!H) throw new Error('ep6_check: install() first (mapcheck.mjs does it)');
  const errors = [];
  const m = compile(map);
  errors.push(...m.errors);
  const { W, H: HH, N } = m;
  const grid = H.buildGrid(map, db);
  const bare = H.buildGrid({ ...map, events: [] }, db);
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < HH;
  const idx = (x, y) => y * W + x;
  const xyOf = (i) => `${i % W},${(i / W) | 0}`;
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
  const absent = new Set(events.filter((e) => e.type === 'mooring' && !storyOk(e)).map((e) => e.id));
  const stateFor = (mask) => { const s = stateOf(m, mask); s.absent = absent; return s; };
  const S_COUNT = 1 << m.groups.length;

  // ---------------------------------------------------------------- authoring rules
  if (m.vanes.length > 3) errors.push(`wind: ${m.vanes.length} vanes (at most 3 per map: plan 4.4)`);
  for (let i = 0; i < N; i++) {
    if (!m.anyLane[i]) continue;
    const c = bare.code[(i / W) | 0][i % W];
    if (c === 'none' || c === 'pit' || LEDGE_OK[c]) errors.push(`wind: lane cell ${xyOf(i)} is over walkable ground (lanes sit over cloudbank or a duct shaft: void)`);
  }
  const posts = new Set(m.posts.keys());
  for (const v of m.vanes) {
    if (m.anyLane[v.i]) { errors.push(`vane ${v.id}: stands on a lane cell at ${v.x},${v.y}`); continue; }
    if (bare.code[v.y][v.x] !== 'none') errors.push(`vane ${v.id}: its cell ${v.x},${v.y} is not ground`);
    let faced = 0;
    for (const [dx, dy] of Object.values(DIRS)) {
      const x = v.x + dx, y = v.y + dy;
      if (!inb(x, y)) continue;
      const j = idx(x, y);
      if ((!m.anyLane[j] && bare.code[y][x] === 'none') || posts.has(j)) faced++;
    }
    if (!faced) errors.push(`vane ${v.id}: no ground or mooring cell faces it`);
  }
  for (const e of events) {
    const onEnter = e.type === 'trigger' && e.on === 'enter';
    if (!(STANDERS.has(e.type) || (e.type === 'trigger' && !onEnter && e.on !== 'interact'))) continue;
    for (const [x, y] of cellsOf(e)) if (inb(x, y) && m.anyLane[idx(x, y)]) errors.push(`${e.type} ${e.id} stands on a lane cell at ${x},${y}`);
  }
  const arrivals = [];
  if (map.start) arrivals.push(['start', map.start.x, map.start.y]);
  for (const e of events) if (Array.isArray(e.to) && e.to[0] === map.id) arrivals.push([`${e.id} landing`, e.to[1], e.to[2]]);
  for (const [k, [x, y]] of (opts.arrivals || []).entries()) arrivals.push([`arrival ${k}`, x, y]);
  for (const [name, x, y] of arrivals) if (inb(x, y) && m.anyLane[idx(x, y)]) errors.push(`wind: arrival ${name} at ${x},${y} is on a lane cell`);

  // ---------------------------------------------------------------- the state search
  const mono = { opened: new Set(), keys: new Set(opts.keys || []), broken: new Set(), openCells: new Set(), lantern: !!opts.lantern, flags: new Set(opts.flags || []), log: [] };
  const codes = new Map();      // mask -> code array (rebuilt per fixpoint round)
  const gateIsOpen = (e) => mono.opened.has(e.id);
  function codesFor(mask) {
    if (codes.has(mask)) return codes.get(mask);
    const code = new Array(N);
    for (let y = 0; y < HH; y++) for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      let k = grid.code[y][x];
      if (grid.faint && grid.faint[y][x] && mono.lantern) k = H.tileCode(db, grid.faint[y][x].replace('_faint', '_revealed')) ?? k;
      if (mono.openCells.has(`${x},${y}`)) k = 'none';
      for (const e of evAt(x, y)) {
        if (e.type === 'object' && e.breakable && mono.broken.has(e.id)) k = 'none';
        else if ((e.type === 'gate' || e.type === 'locked_door') && gateIsOpen(e)) k = 'none';
        else if (PASS_THROUGH.has(e.type)) k = 'none';
        else if (e.type === 'vane') k = 'solid';
      }
      if (m.anyLane[i]) k = 'void';
      code[i] = k;
    }
    codes.set(mask, code);
    return code;
  }
  /** blocked(x, y, lane) for follow(): a lane cell holds a solid event; a ground cell is not walkable (ledges and pits too). */
  const blockedIn = (code) => (x, y, lane) => {
    if (!inb(x, y)) return true;
    if (lane) return evAt(x, y).some((e) => e.type === 'npc' || e.type === 'vane' || e.type === 'chest' || e.type === 'object');
    return code[idx(x, y)] !== 'none';
  };
  const rides = new Map();      // `${mask}:${cell}` -> follow() result
  function rideFrom(mask, j) {
    const k = `${mask}:${j}`;
    if (rides.has(k)) return rides.get(k);
    const r = follow(m, stateFor(mask), [j % W, (j / W) | 0], blockedIn(codesFor(mask)));
    rides.set(k, r);
    return r;
  }
  const end = (r) => { const p = r.path[r.path.length - 1]; return idx(p[0], p[1]); };
  const vanesAt = new Map();    // cell -> vanes faced from it
  for (const v of m.vanes) for (const [dx, dy] of Object.values(DIRS)) { const x = v.x + dx, y = v.y + dy; if (!inb(x, y)) continue; const k = idx(x, y); if (!vanesAt.has(k)) vanesAt.set(k, []); vanesAt.get(k).push(v); }
  const vanePresent = (v) => storyOk(v.ev);

  /** Moves from node (mask, i): rides, steps, door landings, vane turns. Calls push(next) and exit(node). */
  function moves(mask, i, push, exit, toggles = true) {
    const code = codesFor(mask), A = live(m, mask);
    const x = i % W, y = (i / W) | 0;
    for (const e of evAt(x, y)) if (Array.isArray(e.to) && e.to[0] !== map.id && (e.type === 'door' || ((e.type === 'gate' || e.type === 'locked_door') && gateIsOpen(e)))) exit();
    for (const x2 of map.exits || []) if (x >= x2.x && x < x2.x + (x2.w || 1) && y >= x2.y && y < x2.y + (x2.h || 1)) exit();
    for (const [dir, [dx, dy]] of Object.entries(DIRS)) {
      const nx = x + dx, ny = y + dy;
      if (!inb(nx, ny)) continue;
      const j = idx(nx, ny);
      if (A[j] >= 0) {
        if (blockedIn(code)(nx, ny, true)) continue;
        push(mask, end(rideFrom(mask, j)));
        continue;
      }
      const k = code[j];
      let ok = k === 'none' || k === 'pit';
      if (LEDGE_OK[k]) ok = LEDGE_OK[k] === dir;
      if (!ok) continue;
      if (k === 'pit') {
        const t = pitTarget(map, evAt(nx, ny));
        if (t && t[0] === map.id && inb(t[1], t[2])) push(mask, idx(t[1], t[2])); else { push(mask, j); exit(mask, j); }
        continue;
      }
      let landed = false;
      for (const e of evAt(nx, ny)) {
        const to = e.to;
        const open = e.type === 'door' || ((e.type === 'gate' || e.type === 'locked_door') && gateIsOpen(e));
        if (open && to && to[0] === map.id && inb(to[1], to[2])) { push(mask, j); push(mask, idx(to[1], to[2])); landed = true; }
      }
      if (!landed) push(mask, j);
    }
    if (!toggles) return;
    for (const v of vanesAt.get(i) || []) {
      if (!vanePresent(v) || v.k < 0) continue;
      if (canTurn(m, mask, v.group, [[x, y]]).ok) push(mask ^ (1 << v.k), i);
    }
  }

  /** Breadth first from start nodes; returns { seen: Map(node -> from), exits: Set, rev: Map }. */
  function explore(starts, toggles = true) {
    const seen = new Map(), exits = new Set(), rev = new Map(), q = [];
    for (const n of starts) if (!seen.has(n)) { seen.set(n, -1); q.push(n); }
    let qi = 0;
    while (qi < q.length) {
      if (seen.size > MAX_NODES) { errors.push(`wind: state search passed ${MAX_NODES} nodes`); break; }
      const node = q[qi++];
      const mask = Math.floor(node / N), i = node - mask * N;
      moves(mask, i, (mk, j) => {
        const nn = mk * N + j;
        let l = rev.get(nn); if (!l) rev.set(nn, (l = [])); l.push(node);
        if (!seen.has(nn)) { seen.set(nn, node); q.push(nn); }
      }, (mk = mask, j = i) => exits.add(mk * N + j), toggles);
    }
    return { seen, exits, rev };
  }

  const startXY = opts.start || (map.start ? [map.start.x, map.start.y] : null);
  if (!startXY) return { errors: [...errors, 'map has no start'], report: { id: map.id, errors: ['map has no start'], unreached: [], log: [] } };
  const startI = idx(startXY[0], startXY[1]);
  const touch = (e, cellSet) => cellsOf(e).some(([x, y]) => cellSet.has(idx(x, y)) || Object.values(DIRS).some(([dx, dy]) => inb(x + dx, y + dy) && cellSet.has(idx(x + dx, y + dy))));
  let S = null;
  function search() {
    codes.clear(); rides.clear();
    const r = explore([startI]);
    const cells = new Set(), byMask = new Map();
    for (const node of r.seen.keys()) {
      const mask = Math.floor(node / N), i = node - mask * N;
      cells.add(i);
      if (!byMask.has(mask)) byMask.set(mask, new Set());
      byMask.get(mask).add(i);
    }
    S = { ...r, cells, byMask };
    return S;
  }
  const touchedIn = (e) => { for (const set of S.byMask.values()) if (touch(e, set)) return true; return false; };

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

  // ---------------------------------------------------------------- loops, softlocks, stop cells, reloads
  for (let mask = 0; mask < S_COUNT; mask++) {
    const A = live(m, mask);
    const bad = [];
    for (let i = 0; i < N; i++) if (A[i] >= 0 && rideFrom(mask, i).stop === 'guard') bad.push(i);
    if (bad.length) errors.push(`wind: a ride loops or runs past ${MAX_RIDE} cells in state ${maskName(m, mask)} from ${bad.slice(0, 3).map(xyOf).join(' ')}`);
  }
  const safe = new Set(), q2 = [];
  for (const node of S.seen.keys()) { const i = node % N; if (i === startI || S.exits.has(node)) { safe.add(node); q2.push(node); } }
  while (q2.length) { const n = q2.pop(); for (const p of S.rev.get(n) || []) if (!safe.has(p)) { safe.add(p); q2.push(p); } }
  const stranded = [];
  for (const node of S.seen.keys()) if (!safe.has(node)) stranded.push(node);
  const describe = (node) => { const mask = Math.floor(node / N), i = node - mask * N; return `${xyOf(i)} in state ${maskName(m, mask)}`; };
  if (stranded.length) errors.push(`wind softlock: ${stranded.length} reachable states never get back to the entrance, e.g. ${stranded.slice(0, 3).map(describe).join('; ')}`);
  // every reached stop cell on a lane: leavable now, and after a reload there (the authored lanes)
  const rescued = [];
  const stopCells = new Set();
  for (const node of S.seen.keys()) { const mask = Math.floor(node / N), i = node - mask * N; if (m.anyLane[i]) stopCells.add(node); }
  const reachesHome = (startNode) => {
    const r = explore([startNode]);
    for (const node of r.seen.keys()) if (node % N === startI || r.exits.has(node)) return true;
    return false;
  };
  const reloadSeen = new Set();
  for (const node of stopCells) {
    const mask = Math.floor(node / N), i = node - mask * N;
    let leaves = false;
    moves(mask, i, (mk, j) => { if (mk !== mask || j !== i) leaves = true; }, () => { leaves = true; }, true);
    if (!leaves) errors.push(`wind: the stop at ${xyOf(i)} in state ${maskName(m, mask)} cannot be left (no ground beside it, no ride away)`);
    if (reloadSeen.has(i)) continue;
    reloadSeen.add(i);
    const A0 = live(m, 0);
    if (A0[i] < 0) { rescued.push(xyOf(i)); continue; }            // calm on reload: the field wakes the party on the nearest ground
    const at = rideFrom(0, i).path.length > 1 ? end(rideFrom(0, i)) : i;   // mid-lane on reload: the wind carries the party on
    if (!reachesHome(at)) errors.push(`wind: a reload on the lane cell ${xyOf(i)} (the authored lanes) never gets back to the entrance`);
  }
  // every arrival reaches a vane of its floor in the authored state, without turning one
  if (m.vanes.length) {
    for (const [name, ax, ay] of arrivals) {
      if (!inb(ax, ay)) continue;
      const r = explore([idx(ax, ay)], false);
      const cells = new Set([...r.seen.keys()].map((n) => n % N));
      if (!m.vanes.some((v) => vanePresent(v) && touch(v.ev, cells))) errors.push(`wind: arrival ${name} at ${ax},${ay} reaches no vane in the authored state`);
    }
  }
  // long rides (the camera follows: reported only)
  const longRides = [];
  for (let mask = 0; mask < S_COUNT; mask++) {
    const A = live(m, mask);
    for (let i = 0; i < N; i++) {
      if (A[i] < 0) continue;
      const x = i % W, y = (i / W) | 0;
      const entered = Object.values(DIRS).some(([dx, dy]) => inb(x - dx, y - dy) && !m.anyLane[idx(x - dx, y - dy)] && bare.code[y - dy][x - dx] === 'none');
      if (!entered) continue;
      const j = end(rideFrom(mask, i)), ex = j % W, ey = (j / W) | 0;
      if (Math.abs(ex - x) > PHONE[0] / 2 || Math.abs(ey - y) > PHONE[1] / 2) longRides.push(`${xyOf(i)} -> ${xyOf(j)} (${maskName(m, mask)})`);
    }
  }

  // ---------------------------------------------------------------- report (the shape of mapcheck.walk)
  const report = {
    id: map.id, W, H: HH, start: startXY, errors: [...grid.errors], opened: [...mono.opened], keys: [...mono.keys], lantern: mono.lantern,
    log: mono.log, appraised: [], reachable: [...S.cells].map(xyOf), events: [], marks: [], unreached: [],
    wind: { groups: m.groups, vanes: m.vanes.map((v) => v.id), posts: [...m.posts.values()], states: S.byMask.size, nodes: S.seen.size,
      stranded: stranded.length, rescued, longRides, firstAt: {} },
  };
  const first = new Map(), touchCells = new Map();
  for (const e of events) for (const [x, y] of cellsOf(e)) for (const [dx, dy] of [[0, 0], ...Object.values(DIRS)]) {
    if (!inb(x + dx, y + dy)) continue;
    const k = idx(x + dx, y + dy);
    if (!touchCells.has(k)) touchCells.set(k, []);
    touchCells.get(k).push(e);
  }
  for (const node of S.seen.keys()) {
    const mask = Math.floor(node / N), i = node - mask * N;
    for (const e of touchCells.get(i) || []) if (!first.has(e.id)) first.set(e.id, mask);
  }
  for (const e of events) {
    const present = storyOk(e);
    const mask = present ? (e.on === 'enter' ? 0 : first.has(e.id) ? first.get(e.id) : null) : null;
    report.events.push({ id: e.id, type: e.type, reached: mask != null, at: mask != null ? maskName(m, mask) : null });
    if (mask == null) report.unreached.push(e.id);
    else report.wind.firstAt[e.id] = maskName(m, mask);
  }
  for (const [name, [x, y]] of Object.entries(map.marks || {})) {
    const i = inb(x, y) ? idx(x, y) : -1;
    report.marks.push({ name, x, y, walkable: i >= 0 && bare.code[y][x] === 'none', reached: i >= 0 && S.cells.has(i) });
  }
  const code0 = codesFor(0);
  report.grid = [];
  report.floorCells = 0;
  for (let y = 0; y < HH; y++) { const row = []; for (let x = 0; x < W; x++) { const k = code0[idx(x, y)]; row.push(k); if (k === 'none') report.floorCells++; } report.grid.push(row); }
  /** The live lanes of a state for previews: rows of '.' and arrows, at turned groups (array of ids). */
  report.lanesAt = (turned = []) => {
    const A = live(m, { turned: new Set(turned) }), out = [];
    for (let y = 0; y < HH; y++) { let s = ''; for (let x = 0; x < W; x++) s += A[idx(x, y)] < 0 ? '.' : '^>v<'[A[idx(x, y)]]; out.push(s); }
    return out;
  };
  return { errors, report };
}

/** A state's name: the turned groups ('a+b'), or 'authored'. */
function maskName(m, mask) { const g = m.groups.filter((_, k) => mask & (1 << k)); return g.length ? g.join('+') : 'authored'; }

function cellsOf(e) {
  if (H && H.eventCells) return H.eventCells(e);
  const out = [];
  for (let j = 0; j < (e.h || 1); j++) for (let i = 0; i < (e.w || 1); i++) out.push([e.x + i, e.y + j]);
  return out;
}
function pitTarget(map, here) { for (const e of here) if (e.type === 'pit' && e.to) return e.to; return map.pitTo || null; }

// ------------------------------------------------------------------------------------------------ CLI
async function main() {
  const [id, fl] = process.argv.slice(2);
  if (!id) { console.log('usage: node tools/maps/ep6_check.mjs <mapId> [flags]'); return; }
  const mc = await import(pathToFileURL(path.join(NEXT, 'tools', 'maps', 'mapcheck.mjs')).href);
  const db = await mc.loadDb();
  let map;
  const tests = await import(pathToFileURL(path.join(NEXT, 'src', 'data', 'ep6', 'field', '_testwind.js')).href);
  if (id === 'ep6_testwind') map = tests.TEST_WIND;
  else if (id === 'ep6_testring') map = tests.TEST_RING;
  else map = await mc.loadMap(id);
  if (!hasWind(map)) { console.log(`${id}: no wind, nothing to check`); return; }
  const a = analyse(map, db, fl ? { flags: fl.split(',').filter(Boolean) } : {});
  const r = a.report, gerr = mc.buildGrid(map, db).errors.filter((e) => !a.errors.includes(e));
  const all = [...gerr, ...a.errors];
  console.log(`${id}: ${all.length} errors, ${r.wind.states} states, ${r.wind.nodes} nodes, unreached: ${r.unreached.join(' ') || 'none'}`);
  for (const e of all) console.log('  ERROR ' + e);
  if (r.log.length) console.log('  walk: ' + r.log.join('; '));
  if (r.wind.rescued.length) console.log('  rescued on reload (calm in the authored lanes): ' + r.wind.rescued.join(' '));
  if (r.wind.longRides.length) console.log('  long rides (the camera follows): ' + r.wind.longRides.join('; '));
  for (const [ev, at] of Object.entries(r.wind.firstAt)) if (!/^(trigger|light)$/.test((map.events.find((e) => e.id === ev) || {}).type)) console.log(`  ${ev}: first reached ${at}`);
  process.exit(all.length ? 1 : 0);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1); });
