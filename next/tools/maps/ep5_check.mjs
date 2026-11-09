// Episode 5 sun and shade for the map tools (E5-world, docs/EPISODE5_PLAN.md 4.5 and 5.1). Pure node, no DOM.
//
// mapcheck.mjs installs this with ONE line (after the Episode 4 line):
//   ({ walk, loadDb, buildGrid } = (await import('./ep5_check.mjs')).install({ walk, loadDb, buildGrid, ... }));
// which, for every map that has a `shade` block or a shade event, swaps in:
//   - walk(map, db, opts)   shadeWalk below: a search over (state, cell) where a state is the hour, the groove cell of every
//                           movable stone or lamp (at most 3, grooves at most 6 cells) and the latched plates (one-way
//                           unlocks), with an outer fixpoint for keys, locked doors, Dash walls, the Lantern and flag gates;
//   - buildGrid(map, db)    the plain grid plus the shade authoring and softlock errors (so `mapcheck check` and every
//                           qa/maps validate() report them as errors);
//   - loadDb()              merges assets/tiles/ep5_tiles.json and the ep5 sprite fragments as the pack loader does, and
//                           accepts the virtual hour flags (`hour:dusk`) in if / ifNot;
// and registers the event types (sundial standstone window lampcart sunplate) and the gate sprites (sun_gate, moon_gate).
// Maps without shade are untouched. The field's rule is src/data/ep5/field/shade.js; this file calls it.
//
//   node tools/maps/ep5_check.mjs <mapId> [flags]     the shade report of one map (ep5_testshade, ep5_testshade_in too)
//
// Rules checked (errors): the shade block parses (shade.js compile: rows, hours, h, grooves, movers); a dial, a plate, a groove
// cell and every movable stone or lamp stand on pavement (never sand), and a dial is faced only from pavement; no enemy,
// NPC, actor or step trigger, and no arrival point (the start, an in-map door landing, opts.arrivals), stands on sand; a
// window (faces west / east / north / south) sits on a solid cell, an oculus (faces down) on floor; a plate's target is a
// gate of the map; every arrival point reaches a dial of its floor at the start state (or the floor has none); from every
// reachable state the entrance (the start, or any way off the map) is reachable again. Unreached events (a chest on a sand
// island no state reaches) are in the report's `unreached`, as for every map.
//
// The Shove model: the leader stands beside a movable stone or lamp and pushes it one groove cell away; refused when the
// leader's own cell would then run (the field also checks the followers; they trail on cells the leader walked, so the
// leader's cell decides). `push: true` movers move the same way.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { compile, light, runMask, plates, latches, grooveNext, isHourFlag, hourFlag, DIAL_HOURS, HOURS, SHADE_TYPES } from '../../src/data/ep5/field/shade.js';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const EP5_GATE_SPRITES = ['sun_gate', 'moon_gate'];
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const LEDGE_OK = { ledge_s: 'down', ledge_e: 'right', ledge_w: 'left' };
const PASS_THROUGH = new Set(['actor', 'enemy', 'block', 'pot']);
const STANDERS = new Set(['enemy', 'npc', 'actor']);
const toList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const MAX_NODES = 2_000_000;
const isWall = (c) => c === 'solid' || c === 'void';

let H = null;                 // mapcheck's own helpers (install)
const analysed = new WeakMap();

export function hasShade(map) { return !!(map && (map.shade || (map.events || []).some((e) => e && SHADE_TYPES.has(e.type)))); }

/** Wire into mapcheck (see the header). Returns the wrapped { walk, loadDb, buildGrid }. */
export function install(h) {
  H = h;
  for (const t of SHADE_TYPES) h.EVENT_TYPES.add(t);
  for (const s of EP5_GATE_SPRITES) if (!h.GATE_SPRITE_IDS.includes(s)) h.GATE_SPRITE_IDS.push(s);
  const walk = (map, db, opts = {}) => (hasShade(map) ? analyse(map, db, opts).report : h.walk(map, db, opts));
  const buildGrid = (map, db) => {
    const g = h.buildGrid(map, db);
    if (!hasShade(map) || !(map.events || []).length) return g;
    const a = analyse(map, db, {});
    g.errors.push(...a.errors);
    return g;
  };
  const loadDb = async () => mergeEp5(await h.loadDb());
  return { walk, buildGrid, loadDb };
}

// ------------------------------------------------------------------------------------------------ db
function mergeEp5(db) {
  if (!db || db.ep5Merged) return db;
  const read = (p) => { try { return JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', p), 'utf8')); } catch (e) { return null; } };
  const frag = read('tiles/ep5_tiles.json');
  if (frag) for (const k of ['terrains', 'walls', 'tiles', 'objects', 'overlays']) {
    db.tiles[k] = db.tiles[k] || {};
    for (const [id, v] of Object.entries(frag[k] || {})) if (!(id in db.tiles[k])) db.tiles[k][id] = v;
  }
  for (const [base, atlas] of [['npcs', db.npcAtlas], ['enemies_field', db.enemiesField]]) {
    const f = read(`sprites/ep5_${base}.json`);
    if (f && atlas) for (const k of ['frames', 'anims', 'sprites']) if (f[k]) atlas[k] = { ...f[k], ...(atlas[k] || {}) };
  }
  const flags = db.FLAGS;
  db.FLAGS = new Proxy(flags, { get: (t, k) => (typeof k === 'string' && isHourFlag(k) ? 'the floor\'s hour (virtual, docs/WORLD_EP5.md)' : t[k]) });
  db.ep5Merged = true;
  return db;
}

// ------------------------------------------------------------------------------------------------ analysis
/** Rules plus the state search, once per map object (and option set). Returns { errors, report }. */
export function analyse(map, db, opts = {}) {
  const key = JSON.stringify({ f: opts.flags || null, s: opts.start || null, k: opts.keys || null, l: !!opts.lantern, g: opts.gnomon !== false, a: opts.arrivals || null });
  let per = analysed.get(map);
  if (!per) { per = new Map(); analysed.set(map, per); }
  if (per.has(key)) return per.get(key);
  const out = run(map, db, opts);
  per.set(key, out);
  return out;
}

function run(map, db, opts) {
  if (!H) throw new Error('ep5_check: install() first (mapcheck.mjs does it)');
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
    for (const f of toList(e.if)) if (!isHourFlag(f) && flags && !flags.has(f)) return false;
    for (const f of toList(e.ifNot)) if (!isHourFlag(f) && flags && flags.has(f)) return false;
    return true;
  };
  const hourOk = (e, hour) => {
    for (const f of toList(e.if)) if (isHourFlag(f) && !hourFlag(f, hour)) return false;
    for (const f of toList(e.ifNot)) if (isHourFlag(f) && hourFlag(f, hour)) return false;
    return true;
  };
  const evs = events.filter(storyOk);
  const byCell = new Map();
  for (const e of evs) for (const [x, y] of cellsOf(e)) { const k = `${x},${y}`; if (!byCell.has(k)) byCell.set(k, []); byCell.get(k).push(e); }
  const evAt = (x, y) => byCell.get(`${x},${y}`) || [];
  const wall = new Uint8Array(N);
  for (let y = 0; y < HH; y++) for (let x = 0; x < W; x++) if (isWall(bare.code[y][x])) wall[idx(x, y)] = 1;
  const sandAt = (x, y) => inb(x, y) && m.sand[idx(x, y)] === 1;

  // ---------------------------------------------------------------- authoring rules
  for (const d of m.dials) {
    if (sandAt(d.x, d.y)) errors.push(`sundial ${d.id}: stands on sand at ${d.x},${d.y}`);
    let faced = 0;
    for (const [dx, dy] of Object.values(DIRS)) {
      const x = d.x + dx, y = d.y + dy;
      if (!inb(x, y) || bare.code[y][x] !== 'none') continue;
      if (sandAt(x, y)) errors.push(`sundial ${d.id}: faced from sand at ${x},${y} (dials are faced from pavement)`);
      else faced++;
    }
    if (!faced) errors.push(`sundial ${d.id}: no pavement cell faces it`);
  }
  for (const p of m.plates) {
    if (sandAt(p.x, p.y)) errors.push(`sunplate ${p.id}: stands on sand at ${p.x},${p.y}`);
    if (bare.code[p.y][p.x] !== 'none') errors.push(`sunplate ${p.id}: its cell ${p.x},${p.y} is not floor`);
    const ts = toList(p.ev.target);
    for (const t of ts) if (!events.some((e) => e.id === t && e.type === 'gate')) errors.push(`sunplate ${p.id}: target ${t} is not a gate of this map`);
    if (p.ev.flag && !/^_t_/.test(p.ev.flag) && db.FLAGS && !db.FLAGS[p.ev.flag]) errors.push(`sunplate ${p.id}: flag ${p.ev.flag} not declared`);
    if (p.ev.script && db.scenes && !db.scenes[p.ev.script]) errors.push(`sunplate ${p.id}: scene ${p.ev.script} missing`);
  }
  for (let i = 0; i < N; i++) if (m.groove[i] && m.sand[i]) errors.push(`shade: groove cell ${i % W},${(i / W) | 0} is sand (grooves are pavement)`);
  for (const r of [...m.casters, ...m.lamps]) {
    if (m.sand[r.i]) errors.push(`${r.type} ${r.id}: stands on sand at ${r.x},${r.y}`);
    if (r.ev.shove && r.ev.push) errors.push(`${r.type} ${r.id}: shove and push both set (pick one)`);
  }
  for (const w of m.windows) {
    if (w.down) { if (bare.code[w.y][w.x] !== 'none') errors.push(`window ${w.id}: an oculus (faces down) lights its own floor cell; ${w.x},${w.y} is not floor`); }
    else if (!wall[w.i]) errors.push(`window ${w.id}: sits on ${w.x},${w.y}, which is not a wall or solid cell`);
  }
  for (const e of events) {
    const onEnter = e.type === 'trigger' && e.on === 'enter';
    if (!(STANDERS.has(e.type) || (e.type === 'trigger' && !onEnter && e.on !== 'interact'))) continue;
    for (const [x, y] of cellsOf(e)) if (sandAt(x, y)) errors.push(`${e.type} ${e.id} stands on sand at ${x},${y}`);
  }
  const arrivals = [];
  if (map.start) arrivals.push(['start', map.start.x, map.start.y]);
  for (const e of events) if (Array.isArray(e.to) && e.to[0] === map.id) arrivals.push([`${e.id} landing`, e.to[1], e.to[2]]);
  for (const [k, [x, y]] of (opts.arrivals || []).entries()) arrivals.push([`arrival ${k}`, x, y]);
  for (const [name, x, y] of arrivals) if (sandAt(x, y)) errors.push(`shade: arrival ${name} at ${x},${y} is on sand`);
  if (m.dials.length && !DIAL_HOURS.includes(m.hour)) errors.push(`shade: the floor starts at ${m.hour} but has dials (a dial offers dawn, noon or dusk only)`);

  // ---------------------------------------------------------------- the state search
  const movers = m.movers;
  const mono = { opened: new Set(), keys: new Set(opts.keys || []), broken: new Set(), openCells: new Set(), lantern: !!opts.lantern, flags: new Set(opts.flags || []), log: [] };
  const gnomon = opts.gnomon !== false;
  const plateGates = new Map();   // gate id -> its sunplate sources
  for (const g of evs) if (g.type === 'gate') { const src = evs.filter((s) => s.type === 'sunplate' && toList(s.target).includes(g.id)); if (src.length) plateGates.set(g.id, src); }
  const plateIds = m.plates.map((p) => p.id);
  const bits = (set, list) => list.reduce((a, id, k) => a | (set.has(id) ? 1 << k : 0), 0);
  const unbits = (n, list) => new Set(list.filter((_, k) => n & (1 << k)));

  const cfgs = [], cfgIndex = new Map();
  /** The light of a state, with the gates its plates (or the outer fixpoint) open, settled in two passes. */
  function settle(hour, pos, latchedSet) {
    const posObj = {};
    movers.forEach((r, k) => { posObj[r.id] = pos[k]; });
    const absent = new Set(events.filter((e) => SHADE_TYPES.has(e.type) && (!storyOk(e) || !hourOk(e, hour))).map((e) => e.id));
    let openG = new Set([...mono.opened]);
    let st = null, L = null, pl = null;
    for (let pass = 0; pass < 2; pass++) {
      const solid = new Uint8Array(wall);
      for (const e of evs) if ((e.type === 'gate' || e.type === 'locked_door') && !openG.has(e.id) && hourOk(e, hour)) for (const [x, y] of cellsOf(e)) if (inb(x, y)) solid[idx(x, y)] = 1;
      st = { hour, pos: posObj, absent, solid, latched: latchedSet };
      L = light(map, st);
      pl = plates(map, st, L);
      const on = new Set(pl.filter((p) => p.on).map((p) => p.id));
      const next = new Set([...mono.opened]);
      for (const [gid, src] of plateGates) if (src.every((s) => on.has(s.id))) next.add(gid);
      if ([...next].every((g) => openG.has(g)) && next.size === openG.size) break;
      openG = next;
    }
    return { st, L, pl, openG };
  }
  function config(hour, pos, latchedBits) {
    const latchedSet = unbits(latchedBits, plateIds);
    let s = settle(hour, pos, latchedSet);
    const fresh = latches(map, s.st, s.L);
    if (fresh.length) { for (const id of fresh) latchedSet.add(id); s = settle(hour, pos, latchedSet); }
    const lb = bits(latchedSet, plateIds);
    const k = `${hour}|${pos.join(',')}|${lb}`;
    if (cfgIndex.has(k)) return cfgIndex.get(k);
    cfgs.push({ k, hour, pos: [...pos], latched: lb, s, code: null });
    cfgIndex.set(k, cfgs.length - 1);
    return cfgs.length - 1;
  }

  function codesFor(c) {
    if (c.code) return c.code;
    const code = new Array(N);
    const { st, L, openG } = c.s;
    const run = runMask(map, st, L);
    const occ = new Map();   // cell -> 'solid' for every present caster, lamp and dial in this state
    for (const r of [...m.casters, ...m.lamps]) if (!st.absent.has(r.id)) occ.set(r.mover ? c.pos[movers.indexOf(r)] : r.i, r.id);
    for (const d of m.dials) if (!st.absent.has(d.id)) occ.set(d.i, d.id);
    const gateIsOpen = (e) => openG.has(e.id) || mono.opened.has(e.id);
    for (let y = 0; y < HH; y++) for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      let k = grid.code[y][x];
      if (grid.faint && grid.faint[y][x] && mono.lantern) k = H.tileCode(db, grid.faint[y][x].replace('_faint', '_revealed')) ?? k;
      if (mono.openCells.has(`${x},${y}`)) k = 'none';
      for (const e of evAt(x, y)) {
        if (e.type === 'object' && e.breakable && mono.broken.has(e.id)) k = 'none';
        else if ((e.type === 'gate' || e.type === 'locked_door') && (gateIsOpen(e) || !hourOk(e, c.hour))) k = 'none';
        else if (PASS_THROUGH.has(e.type)) k = 'none';
      }
      if (occ.has(i)) k = 'solid';
      else if (run[i]) k = 'water';
      code[i] = k;
    }
    c.code = code;
    c.run = run;
    c.gateIsOpen = gateIsOpen;
    c.occ = occ;
    return code;
  }

  const startXY = opts.start || (map.start ? [map.start.x, map.start.y] : null);
  if (!startXY) return { errors: [...errors, 'map has no start'], report: { id: map.id, errors: ['map has no start'], unreached: [], log: [] } };
  const startI = idx(startXY[0], startXY[1]);
  const startPos = movers.map((r) => r.i);
  const dialsAt = new Map();      // cell -> dials faced from it
  for (const d of m.dials) for (const [dx, dy] of Object.values(DIRS)) { const x = d.x + dx, y = d.y + dy; if (!inb(x, y)) continue; const k = idx(x, y); if (!dialsAt.has(k)) dialsAt.set(k, []); dialsAt.get(k).push(d); }
  const dialUsable = (d, c) => !c.s.st.absent.has(d.id) && (d.ev.free || gnomon);
  const touch = (e, cellSet) => cellsOf(e).some(([x, y]) => cellSet.has(idx(x, y)) || Object.values(DIRS).some(([dx, dy]) => inb(x + dx, y + dy) && cellSet.has(idx(x + dx, y + dy))));

  let S = null;
  function search() {
    for (const c of cfgs) c.code = null;
    const c0 = config(m.hour, startPos, bits(new Set(), plateIds));
    const seen = new Map();
    const exits = new Set();
    const rev = new Map();
    const q = [c0 * N + startI];
    seen.set(q[0], -1);
    const edge = (a, b) => { let l = rev.get(b); if (!l) rev.set(b, (l = [])); l.push(a); };
    const push = (from, node) => { edge(from, node); if (seen.has(node)) return; seen.set(node, from); q.push(node); };
    let qi = 0;
    while (qi < q.length) {
      if (seen.size > MAX_NODES) { errors.push(`shade: state search passed ${MAX_NODES} nodes; the map has too many states`); break; }
      const node = q[qi++];
      const ci = Math.floor(node / N), i = node - ci * N;
      const c = cfgs[ci], code = codesFor(c);
      const x = i % W, y = (i / W) | 0;
      for (const e of evAt(x, y)) if (Array.isArray(e.to) && e.to[0] !== map.id && (e.type === 'door' || ((e.type === 'gate' || e.type === 'locked_door') && c.gateIsOpen(e)))) exits.add(node);
      for (const x2 of map.exits || []) if (x >= x2.x && x < x2.x + (x2.w || 1) && y >= x2.y && y < x2.y + (x2.h || 1)) exits.add(node);
      for (const [dir, [dx, dy]] of Object.entries(DIRS)) {
        const nx = x + dx, ny = y + dy;
        if (!inb(nx, ny)) continue;
        const j = idx(nx, ny), k = code[j];
        let ok = k === 'none' || k === 'pit';
        if (LEDGE_OK[k]) ok = LEDGE_OK[k] === dir;
        if (ok) {
          if (k === 'pit') {
            const t = pitTarget(map, evAt(nx, ny));
            if (t && t[0] === map.id && inb(t[1], t[2])) push(node, ci * N + idx(t[1], t[2])); else { push(node, ci * N + j); exits.add(ci * N + j); }
          } else {
            let landed = false;
            for (const e of evAt(nx, ny)) {
              const to = e.to;
              const open = e.type === 'door' || ((e.type === 'gate' || e.type === 'locked_door') && c.gateIsOpen(e));
              if (open && to && to[0] === map.id && inb(to[1], to[2])) { push(node, ci * N + j); push(ci * N + j, ci * N + idx(to[1], to[2])); landed = true; }
            }
            if (!landed) push(node, ci * N + j);
          }
        }
        // Shove (or push) a mover standing there one groove cell on, away from the party
        const mk = movers.findIndex((r, n) => c.pos[n] === j && !c.s.st.absent.has(r.id));
        if (mk >= 0) {
          const r = movers[mk];
          const t = grooveNext(m, r, j, dx, dy);
          if (t >= 0 && code[t] === 'none' && !c.occ.has(t)) {
            const pos = [...c.pos]; pos[mk] = t;
            const ni = config(c.hour, pos, c.latched);
            codesFor(cfgs[ni]);
            if (!cfgs[ni].run[i]) push(node, ni * N + i);
          }
        }
      }
      // set the hour at a dial faced from here
      for (const d of dialsAt.get(i) || []) {
        if (!dialUsable(d, c)) continue;
        for (const h of DIAL_HOURS) if (h !== c.hour) push(node, config(h, c.pos, c.latched) * N + i);
      }
    }
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

  /** The first reached state in which event e is present and touchable (its key), or null. */
  function touchedIn(e, pred = null) {
    for (const [ci, set] of S.byCfg) {
      const c = cfgs[ci];
      if (!hourOk(e, c.hour)) continue;
      if (pred && !pred(c)) continue;
      if (touch(e, set)) return c;
    }
    return null;
  }

  const gateFlags = new Set();
  for (const e of evs) if (e.type === 'gate') for (const f of toList(e.flags)) gateFlags.add(f);
  for (let iter = 0; iter < 24; iter++) {
    cfgs.length = 0; cfgIndex.clear();
    search();
    let changed = false;
    for (const e of evs) {
      if ((e.type === 'chest' || e.type === 'pot') && e.item && /_key$/.test(e.item) && !mono.keys.has(e.item) && touchedIn(e)) { mono.keys.add(e.item); mono.log.push(`${e.item} from ${e.id}`); changed = true; }
      if (e.type === 'object' && e.script === 'lantern_get' && !mono.lantern && touchedIn(e)) { mono.lantern = true; mono.log.push(`lantern from ${e.id}`); changed = true; }
      if (e.type === 'object' && e.breakable && !mono.broken.has(e.id) && touchedIn(e)) { mono.broken.add(e.id); for (const [x, y] of e.opens || []) mono.openCells.add(`${x},${y}`); mono.log.push(`broke ${e.id}`); changed = true; }
      if (e.type === 'locked_door' && !mono.opened.has(e.id) && mono.keys.has(e.key) && touchedIn(e)) { mono.opened.add(e.id); mono.log.push(`unlocked ${e.id}`); changed = true; }
      if (e.type === 'object' && e.script && gateFlags.has(e.script) && !mono.flags.has(e.script) && touchedIn(e)) { mono.flags.add(e.script); mono.log.push(`${e.script} from ${e.id}`); changed = true; }
      if (e.type === 'gate' && !mono.opened.has(e.id) && !plateGates.has(e.id)) {
        const src = evs.filter((s) => toList(s.target).includes(e.id));
        const fl = toList(e.flags);
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
  if (stranded.length) errors.push(`shade softlock: ${stranded.length} reachable states never get back to the entrance, e.g. ${stranded.slice(0, 3).map(describe).join('; ')}`);
  if (m.dials.length) {
    const c0 = cfgs[S.c0], code = codesFor(c0);
    const entries = [['start', startXY[0], startXY[1]], ...(opts.arrivals || []).map(([x, y], k) => [`arrival ${k}`, x, y])];
    for (const e of events) if (Array.isArray(e.to) && e.to[0] === map.id && inb(e.to[1], e.to[2])) entries.push([`${e.id} landing`, e.to[1], e.to[2]]);
    for (const [name, ax, ay] of entries) {
      if (!inb(ax, ay)) continue;
      const reach = flood(code, idx(ax, ay), W, HH);
      if (!m.dials.some((d) => touch(d.ev, reach))) errors.push(`shade: arrival ${name} at ${ax},${ay} reaches no dial at the start hour`);
    }
  }

  // ---------------------------------------------------------------- report (the shape of mapcheck.walk)
  const report = {
    id: map.id, W, H: HH, start: startXY, errors: [...grid.errors], opened: [...mono.opened], keys: [...mono.keys], lantern: mono.lantern,
    log: mono.log, appraised: [], reachable: [...S.cells].map((i) => `${i % W},${(i / W) | 0}`), events: [], marks: [], unreached: [],
    shade: { hour: m.hour, dials: m.dials.map((d) => d.id), movers: movers.map((r) => ({ id: r.id, track: r.track.map((i) => `${i % W},${(i / W) | 0}`) })),
      plates: plateIds, states: cfgs.length, nodes: S.seen.size, stranded: stranded.length, firstAt: {} },
  };
  const xyKey = (c) => `${c.hour}|${c.pos.map((i) => `${i % W},${(i / W) | 0}`).join(';')}|${c.latched}`;
  // the state of the first node (breadth first, so the fewest moves) that touches each event: the solution for autoplay
  const first = new Map(), touchCells = new Map();
  for (const e of events) for (const [x, y] of cellsOf(e)) for (const [dx, dy] of [[0, 0], ...Object.values(DIRS)]) {
    if (!inb(x + dx, y + dy)) continue;
    const k = idx(x + dx, y + dy);
    if (!touchCells.has(k)) touchCells.set(k, []);
    touchCells.get(k).push(e);
  }
  for (const node of S.seen.keys()) {
    const ci = Math.floor(node / N), i = node - ci * N;
    for (const e of touchCells.get(i) || []) if (!first.has(e.id) && hourOk(e, cfgs[ci].hour)) first.set(e.id, cfgs[ci]);
  }
  for (const e of events) {
    const present = storyOk(e);
    const c = present ? (e.on === 'enter' ? cfgs[S.c0] : first.get(e.id) || null) : null;
    report.events.push({ id: e.id, type: e.type, reached: !!c, at: c ? xyKey(c) : null });
    if (!c) report.unreached.push(e.id);
    else report.shade.firstAt[e.id] = xyKey(c);
  }
  for (const [name, [x, y]] of Object.entries(map.marks || {})) {
    const i = inb(x, y) ? idx(x, y) : -1;
    report.marks.push({ name, x, y, walkable: i >= 0 && bare.code[y][x] === 'none', reached: i >= 0 && S.cells.has(i) });
  }
  const code0 = codesFor(cfgs[S.c0]);
  report.grid = [];
  report.floorCells = 0;
  for (let y = 0; y < HH; y++) { const row = []; for (let x = 0; x < W; x++) { const k = code0[idx(x, y)]; row.push(k); if (k === 'none') report.floorCells++; } report.grid.push(row); }
  /** The sand of a state, for previews: { running: ['x,y'], firm, shade } at { hour, pos: { id: [x, y] } }. */
  report.sandAt = (hour = m.hour, pos = {}) => {
    const st = { hour, pos, solid: wall };
    const L = light(map, st), r = runMask(map, st, L);
    const xy = (i) => `${i % W},${(i / W) | 0}`;
    const running = [], firm = [], shade = [];
    for (let i = 0; i < N; i++) { if (m.sand[i]) (r[i] ? running : firm).push(xy(i)); if (L.shadow[i] && !L.lit[i] && !wall[i]) shade.push(xy(i)); }
    return { running, firm, shade };
  };
  return { errors, report };
}

function cellsOf(e) {
  if (H && H.eventCells) return H.eventCells(e);
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
  if (!id) { console.log('usage: node tools/maps/ep5_check.mjs <mapId> [flags]'); return; }
  const mc = await import(pathToFileURL(path.join(NEXT, 'tools', 'maps', 'mapcheck.mjs')).href);
  const db = await mc.loadDb();
  let map;
  if (id === 'ep5_testshade' || id === 'ep5_testshade_in') {
    const t = await import(pathToFileURL(path.join(NEXT, 'src', 'data', 'ep5', 'field', '_testshade.js')).href);
    map = id === 'ep5_testshade' ? t.TEST_SHADE : t.TEST_SHADE_IN;
  } else map = await mc.loadMap(id);
  if (!hasShade(map)) { console.log(`${id}: no shade, nothing to check`); return; }
  const a = analyse(map, db, fl ? { flags: fl.split(',').filter(Boolean) } : {});
  const r = a.report;
  console.log(`${id}: ${a.errors.length} errors, ${r.shade.states} states, ${r.shade.nodes} nodes, unreached: ${r.unreached.join(' ') || 'none'}`);
  for (const e of a.errors) console.log('  ERROR ' + e);
  if (r.log.length) console.log('  walk: ' + r.log.join('; '));
  for (const [ev, at] of Object.entries(r.shade.firstAt)) if (!/^(trigger|light)$/.test((map.events.find((e) => e.id === ev) || {}).type)) console.log(`  ${ev}: first reached at ${at}`);
  process.exit(a.errors.length ? 1 : 0);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1); });

export { HOURS };
