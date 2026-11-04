// Episode 4 tide locks for the map tools (E4-world, docs/EPISODE4_PLAN.md 4.4 and 5.1). Pure node, no DOM.
//
// mapcheck.mjs installs this with ONE line (after its constants):
//   ({ walk, loadDb, buildGrid } = (await import('./ep4_check.mjs')).install({ walk, loadDb, buildGrid, ... }));
// which, for every map that has a `tide` block, swaps in:
//   - walk(map, db, opts)   tideWalk below: a search over (level state, cell), every basin at every level (3^k, k <= 3)
//                           with washes and floodgate latches as one-way unlocks and Shove dams as one-way removals, an
//                           outer fixpoint for keys, locked doors, Dash walls, the Lantern and flag gates;
//   - buildGrid(map, db)    the plain grid plus the tide authoring and softlock errors (so `mapcheck check` and every
//                           qa/maps validate() reports them as errors);
//   - loadDb()              merges assets/tiles/ep4_tiles.json and the ep4 sprite fragments as the pack loader does, and
//                           accepts the virtual tide flags (`tide:c>=2`) in if / ifNot;
// and registers the event types (tidewheel tidepost pontoon forgery floodgate), the door kind `boat` and the ep4 gate
// sprites. Maps without `tide` are untouched. The field's rule is src/data/ep4/field/tide.js; this file calls it.
//
//   node tools/maps/ep4_check.mjs <mapId> [flags]     the tide report of one map (the map module under src/data/...)
//
// Rules checked (errors): the tide block parses (tide.js compile); two orthogonally adjacent walkable cells of different
// heights have a stair tile (or a pontoon) on one of them; a wheel's own cell and every walkable cell beside it in its own
// basin never flood; no enemy, NPC, actor or step trigger, and no arrival point (start, in-map door landing), stands on a
// floodable cell; every arrival point reaches a wheel at the start levels; from every reachable state the entrance (the
// start, or any way off the map) is reachable again; a chest on a floodable cell is reachable while its cell is dry.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { compile, classify, washes, gateOpen, nextLevel, levelKey, isTideFlag, tideFlag, TIDE_TYPES } from '../../src/data/ep4/field/tide.js';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const EP4_GATE_SPRITES = ['door_canal', 'floodgate', 'door_seal', 'petition_gate'];
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const LEDGE_OK = { ledge_s: 'down', ledge_e: 'right', ledge_w: 'left' };
const PASS_THROUGH = new Set(['actor', 'enemy', 'block', 'pot']);
const STANDERS = new Set(['enemy', 'npc', 'actor']);
const toList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const MAX_NODES = 2_000_000;

let H = null;                 // mapcheck's own helpers (install)
const analysed = new WeakMap();

/** Wire into mapcheck (see the header). Returns the wrapped { walk, loadDb, buildGrid }. */
export function install(h) {
  H = h;
  for (const t of TIDE_TYPES) h.EVENT_TYPES.add(t);
  for (const s of EP4_GATE_SPRITES) if (!h.GATE_SPRITE_IDS.includes(s)) h.GATE_SPRITE_IDS.push(s);
  h.DOOR_KINDS.add('boat');
  const walk = (map, db, opts = {}) => (map && map.tide ? analyse(map, db, opts).report : h.walk(map, db, opts));
  const buildGrid = (map, db) => {
    const g = h.buildGrid(map, db);
    if (!map || !map.tide || !(map.events || []).length) return g;
    const a = analyse(map, db, {});
    g.errors.push(...a.errors);
    return g;
  };
  const loadDb = async () => mergeEp4(await h.loadDb());
  return { walk, buildGrid, loadDb };
}

// ------------------------------------------------------------------------------------------------ db
function mergeEp4(db) {
  if (!db || db.ep4Merged) return db;
  const read = (p) => { try { return JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', p), 'utf8')); } catch (e) { return null; } };
  const frag = read('tiles/ep4_tiles.json');
  if (frag) for (const k of ['terrains', 'walls', 'tiles', 'objects', 'overlays']) {
    db.tiles[k] = db.tiles[k] || {};
    for (const [id, v] of Object.entries(frag[k] || {})) if (!(id in db.tiles[k])) db.tiles[k][id] = v;
  }
  for (const [base, atlas] of [['npcs', db.npcAtlas], ['enemies_field', db.enemiesField]]) {
    const f = read(`sprites/ep4_${base}.json`);
    if (f && atlas) for (const k of ['frames', 'anims', 'sprites']) if (f[k]) atlas[k] = { ...f[k], ...(atlas[k] || {}) };
  }
  const flags = db.FLAGS;
  db.FLAGS = new Proxy(flags, { get: (t, k) => (typeof k === 'string' && isTideFlag(k) ? 'a tide level (virtual, docs/WORLD_EP4.md)' : t[k]) });
  db.ep4Merged = true;
  return db;
}

// ------------------------------------------------------------------------------------------------ analysis
/** Rules plus the state search, once per map object (and flag set). Returns { errors, report }. */
export function analyse(map, db, opts = {}) {
  const key = JSON.stringify({ f: opts.flags || null, s: opts.start || null, k: opts.keys || null, l: !!opts.lantern });
  let per = analysed.get(map);
  if (!per) { per = new Map(); analysed.set(map, per); }
  if (per.has(key)) return per.get(key);
  const out = run(map, db, opts);
  per.set(key, out);
  return out;
}

function run(map, db, opts) {
  if (!H) throw new Error('ep4_check: install() first (mapcheck.mjs does it)');
  const errors = [];
  const m = compile(map);
  errors.push(...m.errors);
  const { W, H: HH, N } = m;
  const grid = H.buildGrid(map, db);
  const bare = H.buildGrid({ ...map, events: [] }, db);
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < HH;
  const idx = (x, y) => y * W + x;
  const events = map.events || [];
  const flags = opts.flags ? new Set(opts.flags) : null;
  const storyOk = (e) => {
    for (const f of toList(e.if)) if (!isTideFlag(f) && flags && !flags.has(f)) return false;
    for (const f of toList(e.ifNot)) if (!isTideFlag(f) && flags && flags.has(f)) return false;
    return true;
  };
  const evs = events.filter(storyOk);
  const tideOk = (e, lv) => {
    for (const f of toList(e.if)) if (isTideFlag(f) && !tideFlag(f, lv)) return false;
    for (const f of toList(e.ifNot)) if (isTideFlag(f) && tideFlag(f, lv)) return false;
    return true;
  };
  const byCell = new Map();
  for (const e of evs) for (const [x, y] of cellsOf(e)) { const k = `${x},${y}`; if (!byCell.has(k)) byCell.set(k, []); byCell.get(k).push(e); }
  const evAt = (x, y) => byCell.get(`${x},${y}`) || [];
  const top = (i) => m.basins[m.ids[m.basinAt[i]]].top;
  const floodable = (i) => i >= 0 && m.basinAt[i] >= 0 && m.height[i] < top(i);
  const isStair = (x, y) => {
    const ids = [map.legend[map.ground[y][x]], ...(map.overlays || []).filter((o) => o.x === x && o.y === y).map((o) => o.t), ...(map.decor || []).filter((d) => d.x === x && d.y === y).map((d) => d.t)];
    return ids.some((id) => id && /stair/.test(id));
  };
  const pontoonCells = new Set(m.pontoons.map((p) => p.i));

  // ---------------------------------------------------------------- authoring rules
  for (let y = 0; y < HH; y++) for (let x = 0; x < W; x++) {
    const i = idx(x, y);
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      const nx = x + dx, ny = y + dy;
      if (!inb(nx, ny)) continue;
      const j = idx(nx, ny);
      if (m.basinAt[i] < 0 && m.basinAt[j] < 0) continue;
      if (bare.code[y][x] !== 'none' || bare.code[ny][nx] !== 'none') continue;
      if (pontoonCells.has(i) || pontoonCells.has(j)) continue;
      const hi = m.basinAt[i] >= 0 ? m.height[i] : top(j), hj = m.basinAt[j] >= 0 ? m.height[j] : top(i);
      if (hi === hj) continue;
      if (isStair(x, y) || isStair(nx, ny)) continue;
      errors.push(`tide: ${x},${y} (height ${hi}) steps to ${nx},${ny} (height ${hj}) with no stair or ledge between`);
    }
  }
  for (const w of m.wheels) {
    if (w.i >= 0 && m.basinOfCell(w.i) === w.b && floodable(w.i)) errors.push(`tidewheel ${w.id}: its own cell ${w.x},${w.y} floods`);
    let faced = 0;
    for (const [dx, dy] of Object.values(DIRS)) {
      const x = w.x + dx, y = w.y + dy;
      if (!inb(x, y) || bare.code[y][x] !== 'none') continue;
      faced++;
      const j = idx(x, y);
      if (m.basinOfCell(j) === w.b && floodable(j)) errors.push(`tidewheel ${w.id}: the party would stand at ${x},${y}, which its own basin floods`);
    }
    if (!faced) errors.push(`tidewheel ${w.id}: no walkable cell faces it`);
  }
  for (const e of events) {
    const onEnter = e.type === 'trigger' && e.on === 'enter';
    if (!(STANDERS.has(e.type) || (e.type === 'trigger' && !onEnter && e.on !== 'interact'))) continue;
    for (const [x, y] of cellsOf(e)) if (inb(x, y) && floodable(idx(x, y))) errors.push(`${e.type} ${e.id} stands on ${x},${y}, which floods`);
  }
  const arrivals = [];
  if (map.start) arrivals.push(['start', map.start.x, map.start.y]);
  for (const e of events) if (Array.isArray(e.to) && e.to[0] === map.id) arrivals.push([`${e.id} landing`, e.to[1], e.to[2]]);
  for (const [name, x, y] of arrivals) if (inb(x, y) && floodable(idx(x, y))) errors.push(`tide: arrival ${name} at ${x},${y} floods`);
  for (const e of events) for (const f of [...toList(e.if), ...toList(e.ifNot)]) if (isTideFlag(f) && !m.basins[f[5]]) errors.push(`event ${e.id}: ${f} names no basin of this map`);

  // ---------------------------------------------------------------- the state search
  const pontoonById = new Map(m.pontoons.map((p) => [p.id, p]));
  const dams = [];   // blocks on cells of a basin with an inlet: the water stops at them until Shoved
  for (const e of evs) if (e.type === 'block' && inb(e.x, e.y)) { const i = idx(e.x, e.y); const b = m.basinOfCell(i); if (b && m.basins[b].inlet) dams.push({ id: e.id, i, x: e.x, y: e.y }); }
  const fIds = m.forgeries.map((f) => f.id), gIds = m.floodgates.map((g) => g.id);
  const mono = { opened: new Set(), keys: new Set(opts.keys || []), broken: new Set(), openCells: new Set(), lantern: !!opts.lantern, flags: new Set(opts.flags || []), log: [] };
  const crankOk = (w) => !w.crank || opts.crank !== false;

  const cfgs = [], cfgIndex = new Map();
  const bits = (set, list) => list.reduce((a, id, k) => a | (set.has(id) ? 1 << k : 0), 0);
  const unbits = (n, list) => new Set(list.filter((_, k) => n & (1 << k)));
  function config(lv, washed, latched, damsOff) {
    // settle: washes and latches this state causes (monotone), then one key
    const st = { levels: lv, washed: unbits(washed, fIds), latched: unbits(latched, gIds), dams: dams.filter((d, k) => !(damsOff & (1 << k))).map((d) => d.i) };
    const w = washes(map, st);
    for (const id of w) st.washed.add(id);
    for (const g of m.floodgates) if (g.latch && gateOpen(map, st, g)) st.latched.add(g.id);
    const wb = bits(st.washed, fIds), lb = bits(st.latched, gIds);
    const k = `${levelKey(map, { levels: lv })}|${wb}|${lb}|${damsOff}`;
    if (cfgIndex.has(k)) return cfgIndex.get(k);
    const c = { k, lv: { ...lv }, washed: wb, latched: lb, damsOff, st: { ...st, washed: st.washed, latched: st.latched }, cls: classify(map, st), code: null };
    cfgIndex.set(k, cfgs.length);
    cfgs.push(c);
    return cfgs.length - 1;
  }

  const gateSources = (g) => evs.filter((s) => toList(s.target).includes(g.id));
  function codesFor(c) {
    if (c.code) return c.code;
    const code = new Array(N);
    const { cls } = c;
    const fgOpen = new Map(m.floodgates.map((g) => [g.id, gateOpen(map, c.st, g)]));
    const srcOn = (s) => (s.type === 'forgery' ? c.st.washed.has(s.id) : s.type === 'floodgate' ? fgOpen.get(s.id) : mono.opened.has(`src:${s.id}`) || s.type === 'switch' || s.type === 'plate');
    const gateIsOpen = (e) => {
      if (mono.opened.has(e.id)) return true;
      const src = gateSources(e);
      if (src.some((s) => s.type === 'forgery' || s.type === 'floodgate')) return src.every(srcOn);
      return false;
    };
    for (let y = 0; y < HH; y++) for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      let k = grid.code[y][x];
      if (grid.faint && grid.faint[y][x] && mono.lantern) k = H.tileCode(db, grid.faint[y][x].replace('_faint', '_revealed')) ?? k;
      if (mono.openCells.has(`${x},${y}`)) k = 'none';
      for (const e of evAt(x, y)) {
        if (e.type === 'object' && e.breakable && mono.broken.has(e.id)) k = 'none';
        else if ((e.type === 'gate' || e.type === 'locked_door') && gateIsOpen(e)) k = 'none';
        else if (PASS_THROUGH.has(e.type)) k = 'none';
        else if (e.type === 'tidewheel' || e.type === 'tidepost') k = 'solid';
      }
      if (cls.flooded.has(i)) k = 'water';
      else if (cls.floats.has(i)) k = 'none';
      else if (cls.solid.has(i)) k = 'solid';
      for (const g of m.floodgates) if (y === g.y && x >= g.x && x < g.x + g.w) k = fgOpen.get(g.id) ? 'none' : 'solid';
      code[i] = k;
    }
    c.code = code;
    c.fgOpen = fgOpen;
    c.gateIsOpen = gateIsOpen;
    return code;
  }

  const startXY = opts.start || (map.start ? [map.start.x, map.start.y] : null);
  if (!startXY) return { errors: [...errors, 'map has no start'], report: { id: map.id, errors: ['map has no start'], unreached: [], log: [] } };
  const startLv = {};
  for (const id of m.ids) startLv[id] = m.basins[id].start;
  const startI = idx(startXY[0], startXY[1]);
  const wheelsAt = new Map();      // cell -> wheels faced from it
  const damsAt = new Map();
  for (const w of m.wheels) for (const [dx, dy] of Object.values(DIRS)) { const x = w.x + dx, y = w.y + dy; if (!inb(x, y)) continue; const k = idx(x, y); if (!wheelsAt.has(k)) wheelsAt.set(k, []); wheelsAt.get(k).push(w); }
  dams.forEach((d, n) => { for (const [dx, dy] of Object.values(DIRS)) { const x = d.x + dx, y = d.y + dy; if (!inb(x, y)) continue; const k = idx(x, y); if (!damsAt.has(k)) damsAt.set(k, []); damsAt.get(k).push(n); } });
  const wheelPresent = (w, c) => tideOk(w.ev, c.lv) && storyOk(w.ev);
  const touch = (e, cellSet) => cellsOf(e).some(([x, y]) => cellSet.has(idx(x, y)) || Object.values(DIRS).some(([dx, dy]) => inb(x + dx, y + dy) && cellSet.has(idx(x + dx, y + dy))));

  let S = null;
  function search() {
    for (const c of cfgs) c.code = null;
    const c0 = config(startLv, 0, 0, 0);
    const seen = new Map();        // node -> parent node (-1 for the start)
    const exits = new Set();       // nodes that stand on a way off the map
    const rev = new Map();         // node -> [predecessor nodes]
    const q = [c0 * N + startI];
    seen.set(q[0], -1);
    const edge = (a, b) => { let l = rev.get(b); if (!l) rev.set(b, (l = [])); l.push(a); };
    const push = (from, node) => { edge(from, node); if (seen.has(node)) return; seen.set(node, from); q.push(node); };
    let qi = 0;
    while (qi < q.length) {
      if (seen.size > MAX_NODES) { errors.push(`tide: state search passed ${MAX_NODES} nodes; the map has too many states`); break; }
      const node = q[qi++];
      const ci = Math.floor(node / N), i = node - ci * N;
      const c = cfgs[ci], code = codesFor(c);
      const x = i % W, y = (i / W) | 0;
      // a way off the map from here
      for (const e of evAt(x, y)) if (Array.isArray(e.to) && e.to[0] !== map.id && (e.type === 'door' || ((e.type === 'gate' || e.type === 'locked_door') && c.gateIsOpen(e)) || (e.type === 'floodgate' && c.fgOpen.get(e.id)))) exits.add(node);
      for (const x2 of map.exits || []) if (x >= x2.x && x < x2.x + (x2.w || 1) && y >= x2.y && y < x2.y + (x2.h || 1)) exits.add(node);
      for (const [dir, [dx, dy]] of Object.entries(DIRS)) {
        const nx = x + dx, ny = y + dy;
        if (!inb(nx, ny)) continue;
        const j = idx(nx, ny), k = code[j];
        let ok = k === 'none' || k === 'pit';
        if (LEDGE_OK[k]) ok = LEDGE_OK[k] === dir;
        if (!ok) continue;
        if (k === 'pit') {
          const t = pitTarget(map, evAt(nx, ny));
          if (t && t[0] === map.id && inb(t[1], t[2])) push(node, ci * N + idx(t[1], t[2])); else { push(node, ci * N + j); exits.add(ci * N + j); }
          continue;
        }
        let landed = false;
        for (const e of evAt(nx, ny)) {
          const to = e.to;
          const open = e.type === 'door' || ((e.type === 'gate' || e.type === 'locked_door') && c.gateIsOpen(e)) || (e.type === 'floodgate' && c.fgOpen.get(e.id));
          if (open && to && to[0] === map.id && inb(to[1], to[2])) { push(node, ci * N + j); push(ci * N + j, ci * N + idx(to[1], to[2])); landed = true; }
        }
        if (!landed) push(node, ci * N + j);
      }
      // turn a wheel faced from here
      for (const w of wheelsAt.get(i) || []) {
        if (!wheelPresent(w, c) || !crankOk(w)) continue;
        const lv = { ...c.lv, [w.b]: nextLevel(c.lv[w.b], m.basins[w.b].levels) };
        push(node, config(lv, c.washed, c.latched, c.damsOff) * N + i);
      }
      // Shove a dam out of the water's way (one way)
      for (const n of damsAt.get(i) || []) {
        if (c.damsOff & (1 << n)) continue;
        push(node, config(c.lv, c.washed, c.latched, c.damsOff | (1 << n)) * N + i);
      }
    }
    // every cell reached in any state, and per state
    const cells = new Set(), byCfg = new Map();
    for (const node of seen.keys()) {
      const ci = Math.floor(node / N), i = node - ci * N;
      cells.add(i);
      if (!byCfg.has(ci)) byCfg.set(ci, new Set());
      byCfg.get(ci).add(i);
    }
    S = { seen, exits, rev, cells, byCfg, c0 };
    return S;
  }

  /** Is event e touchable in some reached state where it is present? The first such state's levels. */
  function touchedIn(e, pred = null) {
    for (const [ci, set] of S.byCfg) {
      const c = cfgs[ci];
      if (!tideOk(e, c.lv)) continue;
      if (pred && !pred(c)) continue;
      if (touch(e, set)) return c;
    }
    return null;
  }

  const gateFlags = new Set();
  for (const e of evs) if (e.type === 'gate') for (const f of toList(e.flags)) gateFlags.add(f);
  for (let iter = 0; iter < 24; iter++) {
    search();
    let changed = false;
    for (const e of evs) {
      if ((e.type === 'chest' || e.type === 'pot') && e.item && /_key$/.test(e.item) && !mono.keys.has(e.item) && touchedIn(e)) { mono.keys.add(e.item); mono.log.push(`${e.item} from ${e.id}`); changed = true; }
      if (e.type === 'object' && e.script === 'lantern_get' && !mono.lantern && touchedIn(e)) { mono.lantern = true; mono.log.push(`lantern from ${e.id}`); changed = true; }
      if (e.type === 'object' && e.breakable && !mono.broken.has(e.id) && touchedIn(e)) { mono.broken.add(e.id); for (const [x, y] of e.opens || []) mono.openCells.add(`${x},${y}`); mono.log.push(`broke ${e.id}`); changed = true; }
      if (e.type === 'locked_door' && !mono.opened.has(e.id) && mono.keys.has(e.key) && touchedIn(e)) { mono.opened.add(e.id); mono.log.push(`unlocked ${e.id}`); changed = true; }
      // an object whose scene is named for a gate's flag (the principle stones) sets that flag
      if (e.type === 'object' && e.script && gateFlags.has(e.script) && !mono.flags.has(e.script) && touchedIn(e)) { mono.flags.add(e.script); mono.log.push(`${e.script} from ${e.id}`); changed = true; }
      if (e.type === 'gate' && !mono.opened.has(e.id)) {
        const src = evs.filter((s) => toList(s.target).includes(e.id));
        const fl = toList(e.flags);
        if (src.some((s) => s.type === 'forgery' || s.type === 'floodgate')) continue;   // per state (codesFor)
        if (!src.length && !fl.length) continue;
        const ready = src.every((s) => touchedIn(s) && !(s.hidden && !mono.lantern)) && fl.every((f) => mono.flags.has(f));
        if (ready) { mono.opened.add(e.id); mono.log.push(`opened ${e.id}${src.length ? ` via ${src.map((s) => s.id).join('+')}` : ''}${fl.length ? ` by ${fl.join('+')}` : ''}`); changed = true; }
      }
    }
    if (!changed) break;
  }

  // ---------------------------------------------------------------- softlocks and reach rules
  const safe = new Set();
  const q2 = [];
  for (const node of S.seen.keys()) {
    const i = node % N;
    if (i === startI || S.exits.has(node)) { safe.add(node); q2.push(node); }
  }
  while (q2.length) {
    const n = q2.pop();
    for (const p of S.rev.get(n) || []) if (!safe.has(p)) { safe.add(p); q2.push(p); }
  }
  const stranded = [];
  for (const node of S.seen.keys()) if (!safe.has(node)) stranded.push(node);
  const describe = (node) => { const ci = Math.floor(node / N), i = node - ci * N; return `${i % W},${(i / W) | 0} at ${cfgs[ci].k}`; };
  if (stranded.length) errors.push(`tide softlock: ${stranded.length} reachable states never get back to the entrance, e.g. ${stranded.slice(0, 3).map(describe).join('; ')}`);
  // every arrival point reaches a wheel at the start levels (no turns)
  if (m.wheels.length) {
    const c0 = S.c0, code = codesFor(cfgs[c0]);
    const entries = [['start', startXY[0], startXY[1]], ...(opts.arrivals || []).map(([x, y], k) => [`arrival ${k}`, x, y])];
    for (const [name, ax, ay] of entries) {
      if (!inb(ax, ay)) continue;
      const reach = flood(code, idx(ax, ay), W, HH);
      if (!m.wheels.some((w) => touch(w.ev, reach))) errors.push(`tide: arrival ${name} at ${ax},${ay} reaches no wheel at the start levels`);
    }
  }
  for (const e of evs) {
    if (e.type !== 'chest' || !inb(e.x, e.y) || !floodable(idx(e.x, e.y))) continue;
    if (!touchedIn(e, (c) => !c.cls.water.has(idx(e.x, e.y)))) errors.push(`chest ${e.id} on a floodable cell is not reachable while its cell is dry`);
  }

  // ---------------------------------------------------------------- report (the shape of mapcheck.walk)
  const report = {
    id: map.id, W, H: HH, start: startXY, errors: [...grid.errors], opened: [...mono.opened], keys: [...mono.keys], lantern: mono.lantern,
    log: mono.log, appraised: [], reachable: [...S.cells].map((i) => `${i % W},${(i / W) | 0}`), events: [], marks: [], unreached: [],
    tide: { basins: m.ids.map((id) => ({ id, levels: m.basins[id].levels, start: m.basins[id].start, wheel: m.basins[id].wheel })),
      states: cfgs.length, nodes: S.seen.size, stranded: stranded.length, firstAt: {}, washable: fIds, latchable: gIds },
  };
  for (const e of events) {
    const present = storyOk(e);
    // a tide post is read by sight (it often stands mid-channel): it counts as reached
    const c = present ? (e.on === 'enter' || e.type === 'tidepost' ? cfgs[S.c0] : touchedIn(e)) : null;
    report.events.push({ id: e.id, type: e.type, reached: !!c, at: c ? c.k : null });
    if (!c) report.unreached.push(e.id);
    else report.tide.firstAt[e.id] = c.k;
  }
  for (const [name, [x, y]] of Object.entries(map.marks || {})) {
    const i = inb(x, y) ? idx(x, y) : -1;
    const walkable = i >= 0 && (bare.code[y][x] === 'none');
    report.marks.push({ name, x, y, walkable, reached: i >= 0 && S.cells.has(i) });
  }
  const code0 = codesFor(cfgs[S.c0]);
  report.grid = [];
  report.floorCells = 0;
  for (let y = 0; y < HH; y++) { const row = []; for (let x = 0; x < W; x++) { const k = code0[idx(x, y)]; row.push(k); if (k === 'none') report.floorCells++; } report.grid.push(row); }
  /** The water of a level state (for previews): { water: ['x,y'], floats, grounded } at levels { a: 2, ... }. */
  report.waterAt = (levels) => {
    const cl = classify(map, { levels, washed: new Set(fIds) });
    const xy = (s) => [...s].map((i) => `${i % W},${(i / W) | 0}`);
    return { water: xy(cl.water), floats: xy(cl.floats), grounded: xy(cl.grounded) };
  };
  return { errors, report };
}

function cellsOf(e) {
  if (H && H.eventCells) {
    if (e.type === 'floodgate') { const out = []; for (let k = 0; k < (e.w || 2); k++) out.push([e.x + k, e.y]); return out; }
    return H.eventCells(e);
  }
  const out = [];
  for (let j = 0; j < (e.h || 1); j++) for (let i = 0; i < (e.w || 1); i++) out.push([e.x + i, e.y + j]);
  return out;
}
function pitTarget(map, here) { for (const e of here) if (e.type === 'pit' && e.to) return e.to; return map.pitTo || null; }
function flood(code, from, W, HH) {
  const seen = new Set([from]), q = [from];
  while (q.length) {
    const i = q.pop(), x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of Object.values(DIRS)) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= HH) continue;
      const j = ny * W + nx;
      if (seen.has(j) || code[j] !== 'none') continue;
      seen.add(j); q.push(j);
    }
  }
  return seen;
}

// ------------------------------------------------------------------------------------------------ CLI
async function main() {
  const [id, fl] = process.argv.slice(2);
  if (!id) { console.log('usage: node tools/maps/ep4_check.mjs <mapId> [flags]'); return; }
  const mc = await import(pathToFileURL(path.join(NEXT, 'tools', 'maps', 'mapcheck.mjs')).href);
  const db = await mc.loadDb();
  let map;
  if (id === 'ep4_testtide') map = (await import(pathToFileURL(path.join(NEXT, 'src', 'data', 'ep4', 'field', '_testtide.js')).href)).default;
  else map = await mc.loadMap(id);
  if (!map.tide) { console.log(`${id}: no tide block, nothing to check`); return; }
  const a = analyse(map, db, fl ? { flags: fl.split(',').filter(Boolean) } : {});
  const r = a.report;
  console.log(`${id}: ${a.errors.length} errors, ${r.tide.states} level states, ${r.tide.nodes} nodes, unreached: ${r.unreached.join(' ') || 'none'}`);
  for (const e of a.errors) console.log('  ERROR ' + e);
  if (r.log.length) console.log('  walk: ' + r.log.join('; '));
  for (const [ev, at] of Object.entries(r.tide.firstAt)) if (!/^(trigger|light)$/.test((map.events.find((e) => e.id === ev) || {}).type)) console.log(`  ${ev}: first reached at ${at}`);
  process.exit(a.errors.length ? 1 : 0);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1); });
