// Episode 3 quench channels for the map tools (E3-maps, EPISODE3_PLAN 5.1). Pure node, no DOM.
//
//   traceWater({ w, h, flow(x, y), solid(x, y), sources, sluices, basins })   -> { streams, wet, crust, filled, splashes }
//   quenchWalk(map, db, opts, helpers)                                          the gate-aware walk of a map with water
//
// The tracer follows the plan's rules, written independently of E3-world's field code (src/world, in flight while this was
// written) so the map tools can check the puzzles now; when the field tracer lands, qa/maps compares the two on every map.
// - A spout emits from its own cell in `dir`; the stream starts in the next cell.
// - Water moves cell by cell, only over cells whose tile has `flow` (troughs, slag, crust). At any other cell it stops and
//   leaves a splash on that cell (a puddle decal, no collision).
// - Sluices are looked up before the cell's tile and turn the water exactly as mirrors turn beams: state 0 = '/',
//   right -> up, up -> right, left -> down, down -> left; state 1 = '\', right -> down, down -> right, left -> up, up -> left.
// - A basin fills when the water arrives through its `face` (the side its mouth looks toward; none = any side) and stops it.
// - A solid thing on a flow cell (a heavy or push block, a closed gate) stops it: a dam. Actors never block it.
// - Slag the water crosses becomes crust for good (`crust`, the cells it crossed: a line the width of the stream, the most
//   conservative reading; a field that crusts more only adds walkable floor). Water keeps flowing along crust.
// - 256 cells per stream, loop guard on (cell, direction).
//
// The walk (quenchWalk). Everything water does is monotone: crust is permanent, every Episode 3 basin latches (a basin
// without `latch` is reported as an error by mapcheck), troughs are walkable, so the reachable floor only ever grows. The
// walk is the plain flood of mapcheck.walk() plus an outer fixpoint: per spout system it enumerates every assignment of
// the sluices the party can touch (the others keep their authored state) and every cell each reachable block can be
// pushed to; every slag cell any of them crosses becomes floor, every basin any of them fills latches and opens its
// gate. Flag gates (`flags: [...]`) open when every flag is in opts.flags or is set by an object script the party can
// touch (SCRIPT_FLAGS). The report adds `water`: the start-state trace, one solved configuration per basin and per crust
// run, and the configuration counts.

import { traceFlow, quenchCells, cellFlow } from '../../src/world/ep3/flow.js';

export const MAX_LEN = 256;
export const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
export const TURN = [
  { right: 'up', up: 'right', left: 'down', down: 'left' },     // 0 = '/'
  { right: 'down', down: 'right', left: 'up', up: 'left' },     // 1 = '\'
];
const DIRS = Object.entries(DIRV);

/** Object scripts that set a story flag the map's own gates read (the oath anvils, the wheel). */
export const SCRIPT_FLAGS = { oath_hand: ['oath_hand'], oath_heart: ['oath_heart'], oath_home: ['oath_home'], ledger_ash: ['ledger_found'] };

export function hasWater(map) {
  return (map.events || []).some((e) => e.type === 'spout' || e.type === 'sluice' || e.type === 'basin');
}

/** The `flow` kind of a tile or terrain id ('channel' | 'slag' | null). */
export function flowOf(db, id) {
  if (!id) return null;
  const t = db.tiles.terrains[id] || db.tiles.tiles[id] || (db.tiles.overlays && db.tiles.overlays[id]);
  return (t && t.flow) || null;
}

/** W x H grids of flow kinds and trough arms (flow.js cellFlow over the legend id and the overlays on each cell). */
export function flowGrid(map, db) {
  const H = map.ground.length, W = map.ground[0].length;
  const ids = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => [map.legend[map.ground[y][x]]]));
  for (const o of map.overlays || []) if (o.y >= 0 && o.y < H && o.x >= 0 && o.x < W) ids[o.y][o.x].push(o.t);
  const out = Array.from({ length: H }, () => new Array(W).fill(null));
  const arms = Array.from({ length: H }, () => new Array(W).fill(null));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const id = ids[y][x][0];
    const c = cellFlow(db.tiles, db.tiles.terrains[id] ? id : null, ids[y][x]);
    out[y][x] = c.flow; arms[y][x] = c.arms;
  }
  out.arms = arms;
  return out;
}

const key = (x, y) => `${x},${y}`;

/**
 * Trace every spout with E3-world's field tracer (src/world/ep3/flow.js traceFlow) and cool whole slag bodies the way
 * the field does (quenchCells: each reached body, 4-connected, at most MAX_BODY cells). Input: w, h, flow(x, y),
 * arms(x, y), solid(x, y) (a dam: block, closed gate, solid prop), sources, sluices, basins. Output sets hold 'x,y'.
 */
export function traceWater(input) {
  const { w, h } = input;
  const flow = input.flow || (() => null);
  const solid = input.solid || (() => false);
  const t = traceFlow({ w, h, flow, arms: input.arms || (() => null), code: (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 'void' : solid(x, y) ? 'solid' : 'none'),
    sources: input.sources, sluices: input.sluices, basins: input.basins });
  const crust = new Set(quenchCells(t, { w, h, flow }).map((c) => key(c.x, c.y)));
  const streams = t.streams.map((st) => ({ ...st, end: st.end }));
  return { streams, wet: t.wet, crust, filled: t.fullBasins, splashes: t.splashes.map((sp) => ({ ...sp, dam: !sp.floor })), dams: t.dams, turns: [] };
}

const toList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

/**
 * The walk of a map with water. `helpers` = { buildGrid, eventCells, appraiseReach, tileCode } from mapcheck (passed in so
 * this module has no import cycle). Returns the same report shape as mapcheck.walk() plus `water`.
 */
export function quenchWalk(map, db, opts, H_) {
  const { buildGrid, eventCells, tileCode } = H_;
  const events = map.events || [];
  const grid = buildGrid(map, db);
  const { W, H, code, faint } = grid;
  const N = W * H;
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const idx = (x, y) => y * W + x;
  const fg = flowGrid(map, db);
  const byCell = new Map();
  for (const e of events) for (const [x, y] of eventCells(e)) { const k = key(x, y); if (!byCell.has(k)) byCell.set(k, []); byCell.get(k).push(e); }
  const evAt = (x, y) => byCell.get(key(x, y)) || [];
  const start = opts.start || (map.start ? [map.start.x, map.start.y] : null);
  if (!start) return { ...grid, error: 'map has no start' };
  const spouts = events.filter((e) => e.type === 'spout');
  const sluices = events.filter((e) => e.type === 'sluice');
  const basins = events.filter((e) => e.type === 'basin');
  const blocks = events.filter((e) => e.type === 'block');
  const gates = events.filter((e) => e.type === 'gate' || e.type === 'locked_door');
  const st = {
    opened: new Set(), keys: new Set(opts.keys || []), lantern: !!opts.lantern, broken: new Set(), openCells: new Set(), appraised: new Set(),
    crust: new Set(), latched: new Set(), flags: new Set(opts.flags || []), log: [],
  };
  const PASS = new Set(['actor', 'enemy', 'block', 'pot']);
  const effective = (x, y) => {
    let c = code[y][x];
    if (faint[y][x] && st.lantern) c = tileCode(db, faint[y][x].replace('_faint', '_revealed')) ?? c;
    if (st.openCells.has(key(x, y))) return 'none';
    if (st.crust.has(key(x, y))) return 'none';
    for (const e of evAt(x, y)) {
      if (e.type === 'object' && e.breakable && st.broken.has(e.id)) return 'none';
      if ((e.type === 'gate' || e.type === 'locked_door') && st.opened.has(e.id)) return 'none';
      if (PASS.has(e.type)) return 'none';
    }
    return c;
  };
  const LEDGE_OK = { ledge_s: 'down', ledge_e: 'right', ledge_w: 'left' };
  const pitTarget = (x, y) => { for (const e of evAt(x, y)) if (e.type === 'pit' && e.to) return e.to; return map.pitTo || null; };
  const bfs = () => {
    const seen = new Set([key(start[0], start[1])]);
    const q = [start];
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dir, [dx, dy]] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (!inb(nx, ny)) continue;
        const k = key(nx, ny);
        if (seen.has(k)) continue;
        const c = effective(nx, ny);
        let ok = c === 'none' || c === 'pit';
        if (LEDGE_OK[c]) ok = LEDGE_OK[c] === dir;
        if (!ok) continue;
        seen.add(k);
        if (c === 'pit') {
          const t = pitTarget(nx, ny);
          if (t && t[0] === map.id && inb(t[1], t[2]) && !seen.has(key(t[1], t[2]))) { seen.add(key(t[1], t[2])); q.push([t[1], t[2]]); }
          continue;
        }
        q.push([nx, ny]);
        for (const e of evAt(nx, ny)) {
          const to = e.to;
          if ((e.type === 'door' || ((e.type === 'gate' || e.type === 'locked_door') && st.opened.has(e.id))) && to && to[0] === map.id && inb(to[1], to[2])) {
            const tk = key(to[1], to[2]);
            if (!seen.has(tk)) { seen.add(tk); q.push([to[1], to[2]]); }
          }
        }
      }
    }
    return seen;
  };
  const touchable = (seen, e) => {
    for (const [x, y] of eventCells(e)) {
      if (seen.has(key(x, y))) return true;
      for (const [dx, dy] of Object.values(DIRV)) if (seen.has(key(x + dx, y + dy))) return true;
    }
    return false;
  };

  // ---- spout systems: every sluice and basin a spout's water can ever reach (both states of each sluice)
  const sluiceAt = new Map(sluices.map((s) => [idx(s.x, s.y), s]));
  const basinAt = new Map(basins.map((b) => [idx(b.x, b.y), b]));
  const reachOf = (src) => {
    const cells = new Set(), mir = new Set(), bas = new Set();
    const seenB = new Set();
    const stack = [[src.x, src.y, src.dir]];
    while (stack.length) {
      const [x, y, d] = stack.pop();
      const nx = x + DIRV[d][0], ny = y + DIRV[d][1];
      if (!inb(nx, ny)) continue;
      const k = idx(nx, ny), sk = `${k},${d}`;
      if (seenB.has(sk)) continue;
      seenB.add(sk); cells.add(k);
      if (basinAt.has(k)) { bas.add(basinAt.get(k)); continue; }
      const s = sluiceAt.get(k);
      if (s) { mir.add(s); for (const sv of s.fixed ? [s.state ? 1 : 0] : [0, 1]) stack.push([nx, ny, TURN[sv][d]]); continue; }
      if (!fg[ny][nx]) continue;
      const am = fg.arms[ny][nx];
      if (!am) { stack.push([nx, ny, d]); continue; }
      const AD = { N: 'up', E: 'right', S: 'down', W: 'left' };
      for (const ch of am) if (AD[ch] !== OPP[d]) stack.push([nx, ny, AD[ch]]);
    }
    return { cells, mir, bas };
  };
  const systems = spouts.map((s) => ({ spouts: [s], ...reachOf(s) }));
  for (let i = 0; i < systems.length; i++) for (let j = i + 1; j < systems.length; j++) {
    if (!systems[i] || !systems[j]) continue;
    if ([...systems[j].mir].some((m) => systems[i].mir.has(m)) || [...systems[j].bas].some((b) => systems[i].bas.has(b))) {
      systems[i].spouts.push(...systems[j].spouts);
      for (const m of systems[j].mir) systems[i].mir.add(m);
      for (const b of systems[j].bas) systems[i].bas.add(b);
      for (const c of systems[j].cells) systems[i].cells.add(c);
      systems[j] = null;
    }
  }
  const sysList = systems.filter(Boolean);
  for (const s of sysList) s.blocks = blocks.filter((b) => s.cells.has(idx(b.x, b.y)) || true);   // narrowed per pass below

  // the cells a block can be pushed to (both sides free, never a door or a gate cell), from the current floor
  const blockRegion = (b) => {
    const isDoor = (x, y) => evAt(x, y).some((e) => e.type === 'door' || e.type === 'gate' || e.type === 'locked_door' || e.type === 'trigger');
    const solidEv = (x, y) => evAt(x, y).some((e) => !PASS.has(e.type) && !['trigger', 'light', 'door', 'pit', 'gate', 'locked_door'].includes(e.type) && e.solid !== false && e !== b);
    const free = (x, y) => inb(x, y) && effective(x, y) === 'none' && !isDoor(x, y) && !solidEv(x, y);
    const seen = new Set([idx(b.x, b.y)]);
    const q = [[b.x, b.y]];
    while (q.length) {
      const [x, y] = q.pop();
      for (const [dx, dy] of Object.values(DIRV)) {
        if (!free(x + dx, y + dy) || !(free(x - dx, y - dy) || (x - dx === b.x && y - dy === b.y))) continue;
        const k = idx(x + dx, y + dy);
        if (!seen.has(k)) { seen.add(k); q.push([x + dx, y + dy]); }
      }
    }
    return [...seen];
  };

  const solidFor = (blockCells) => (x, y) => {
    if (blockCells.has(idx(x, y))) return true;
    for (const e of evAt(x, y)) {
      if ((e.type === 'gate' || e.type === 'locked_door') && !st.opened.has(e.id)) return true;
      if (['chest', 'pot', 'object', 'npc', 'font', 'save', 'spout'].includes(e.type) && e.solid !== false && !(e.type === 'object' && e.breakable && st.broken.has(e.id))) return true;
    }
    return false;
  };
  const flowFn = (x, y) => (st.crust.has(key(x, y)) ? 'channel' : fg[y][x]);
  const armsFn = (x, y) => (st.crust.has(key(x, y)) ? null : fg.arms[y][x]);
  const traceCfg = (sys, states, blockPos) => traceWater({
    w: W, h: H, flow: flowFn, arms: armsFn, solid: solidFor(new Set(blockPos)),
    sources: sys.spouts.map((s) => ({ id: s.id, x: s.x, y: s.y, dir: s.dir })),
    sluices: sluices.map((s) => ({ id: s.id, x: s.x, y: s.y, state: states.has(s.id) ? states.get(s.id) : (s.state ? 1 : 0) })),
    basins: basins.map((b) => ({ id: b.id, x: b.x, y: b.y, face: b.face || null })),
  });

  const firstFill = {}, firstCrust = [], configsTried = { total: 0 };
  let startTrace = null;
  const water = () => {
    const seen = bfs();
    let changed = false;
    for (const sys of sysList) {
      const free = [...sys.mir].filter((s) => !s.fixed && touchable(seen, s));
      const movers = blocks.filter((b) => touchable(seen, b)).map((b) => ({ b, cells: blockRegion(b).filter((c) => sys.cells.has(c) || c === idx(b.x, b.y)) }))
        .filter((m) => m.cells.some((c) => sys.cells.has(c)));
      // a block that can leave the system's cells has an "out of the way" position too
      for (const m of movers) { const all = blockRegion(m.b); const out = all.find((c) => !sys.cells.has(c)); if (out != null && !m.cells.includes(out)) m.cells.push(out); }
      const fixedBlocks = blocks.filter((b) => !movers.some((m) => m.b === b)).map((b) => idx(b.x, b.y));
      let count = 1 << free.length;
      for (const m of movers) count *= m.cells.length;
      if (count > 50000) throw new Error(`${map.id}: water system of ${sys.spouts.map((s) => s.id).join('+')} has ${count} configurations (keep it under 50000)`);
      const choice = new Array(movers.length).fill(0);
      for (let mask = 0; mask < (1 << free.length); mask++) {
        for (;;) {
          const states = new Map(free.map((s, i) => [s.id, (mask >> i) & 1]));
          const pos = [...fixedBlocks, ...movers.map((m, i) => m.cells[choice[i]])];
          const tr = traceCfg(sys, states, pos);
          configsTried.total++;
          const desc = () => ({ states: Object.fromEntries(states), blocks: Object.fromEntries(movers.map((m, i) => [m.b.id, [m.cells[choice[i]] % W, Math.floor(m.cells[choice[i]] / W)]])) });
          for (const c of tr.crust) if (!st.crust.has(c)) { st.crust.add(c); firstCrust.push({ cell: c, ...desc() }); changed = true; }
          for (const bid of tr.filled) {
            const b = basins.find((x) => x.id === bid);
            if (!firstFill[bid]) firstFill[bid] = desc();
            if (b && !st.latched.has(bid)) {
              st.latched.add(bid); st.log.push(`filled ${bid}`); changed = true;
              if (b.flag) st.flags.add(b.flag);
            }
          }
          // next block choice (odometer)
          let i = 0;
          while (i < movers.length) { choice[i]++; if (choice[i] < movers[i].cells.length) break; choice[i] = 0; i++; }
          if (i >= movers.length) break;
        }
      }
    }
    return changed;
  };

  // the start state: authored sluices, blocks where they stand, nothing crusted (what the party sees from the door)
  {
    const all = { spouts };
    startTrace = traceWater({
      w: W, h: H, flow: (x, y) => fg[y][x], arms: armsFn, solid: solidFor(new Set(blocks.map((b) => idx(b.x, b.y)))),
      sources: spouts.map((s) => ({ id: s.id, x: s.x, y: s.y, dir: s.dir })),
      sluices: sluices.map((s) => ({ id: s.id, x: s.x, y: s.y, state: s.state ? 1 : 0 })),
      basins: basins.map((b) => ({ id: b.id, x: b.x, y: b.y, face: b.face || null })),
    });
    void all;
  }

  let seen = bfs();
  for (let iter = 0; iter < 30; iter++) {
    let changed = false;
    for (const e of events) {
      if (e.type === 'chest' || e.type === 'pot') {
        if (e.item && /_key$/.test(e.item) && !st.keys.has(e.item) && touchable(seen, e)) { st.keys.add(e.item); st.log.push(`${e.item} from ${e.id}`); changed = true; }
      }
      if (e.type === 'object' && e.breakable && !st.broken.has(e.id) && touchable(seen, e)) {
        st.broken.add(e.id); for (const [x, y] of e.opens || []) st.openCells.add(key(x, y));
        st.log.push(`broke ${e.id}`); changed = true;
      }
      if (e.type === 'object' && e.script && SCRIPT_FLAGS[e.script] && touchable(seen, e) && !(e.lantern && !st.lantern)) {
        for (const f of SCRIPT_FLAGS[e.script]) if (!st.flags.has(f)) { st.flags.add(f); st.log.push(`${f} from ${e.id}`); changed = true; }
      }
      if (e.type === 'locked_door' && !st.opened.has(e.id) && st.keys.has(e.key) && touchable(seen, e)) { st.opened.add(e.id); st.log.push(`unlocked ${e.id}`); changed = true; }
      if (e.type === 'gate' && !st.opened.has(e.id)) {
        const sw = events.filter((s) => (s.type === 'switch' || s.type === 'plate') && toList(s.target).includes(e.id));
        const bs = basins.filter((b) => toList(b.target).includes(e.id));
        const fl = toList(e.flags);
        if (!sw.length && !bs.length && !fl.length) continue;
        const ready = sw.every((s) => touchable(seen, s)) && bs.every((b) => st.latched.has(b.id)) && fl.every((f) => st.flags.has(f));
        if (ready) { st.opened.add(e.id); st.log.push(`opened ${e.id} via ${[...sw.map((s) => s.id), ...bs.map((b) => b.id), ...fl].join('+')}`); changed = true; }
      }
    }
    if (water()) changed = true;
    if (!changed) break;
    seen = bfs();
  }
  seen = bfs();

  const report = {
    id: map.id, W, H, start, errors: grid.errors, opened: [...st.opened], keys: [...st.keys], lantern: st.lantern, log: st.log,
    appraised: [], reachable: [...seen], events: [], marks: [], unreached: [], flagsSet: [...st.flags],
  };
  for (const e of events) {
    let reached = e.on === 'enter' ? true : touchable(seen, e);
    if (reached && e.lantern && e.type === 'object' && !st.lantern) reached = false;
    report.events.push({ id: e.id, type: e.type, reached });
    if (!reached) report.unreached.push(e.id);
  }
  for (const [name, [x, y]] of Object.entries(map.marks || {})) {
    report.marks.push({ name, x, y, walkable: inb(x, y) && effective(x, y) === 'none', reached: seen.has(key(x, y)) });
  }
  report.floorCells = 0;
  report.grid = [];
  for (let y = 0; y < H; y++) {
    const row = [];
    for (let x = 0; x < W; x++) { const c = effective(x, y); row.push(c); if (c === 'none') report.floorCells++; }
    report.grid.push(row);
  }
  const js = (t) => ({ streams: t.streams, wet: [...t.wet], crust: [...t.crust], filled: [...t.filled], splashes: t.splashes });
  report.water = {
    systems: sysList.map((s) => ({ spouts: s.spouts.map((x) => x.id), sluices: [...s.mir].map((m) => m.id), basins: [...s.bas].map((b) => b.id) })),
    start: js(startTrace),
    startCrust: [...startTrace.crust], startFilled: [...startTrace.filled],
    crust: [...st.crust], latched: [...st.latched], configs: configsTried.total,
    basinConfigs: firstFill,
    crustConfigs: firstCrust.map((c) => ({ cell: c.cell, states: c.states, blocks: c.blocks })),
  };
  /** The trace of a described configuration { states, blocks } with the walk's final crust (tools and tests). */
  Object.defineProperty(report, 'traceOf', { enumerable: false, value: (desc = {}, { crusted = true } = {}) => {
    const states = new Map(Object.entries(desc.states || {}));
    const pos = blocks.map((b) => (desc.blocks && desc.blocks[b.id] ? idx(desc.blocks[b.id][0], desc.blocks[b.id][1]) : idx(b.x, b.y)));
    const saved = new Set(st.crust);
    if (!crusted) st.crust.clear();
    const t = traceWater({
      w: W, h: H, flow: flowFn, arms: armsFn, solid: solidFor(new Set(pos)), sources: spouts.map((s) => ({ id: s.id, x: s.x, y: s.y, dir: s.dir })),
      sluices: sluices.map((s) => ({ id: s.id, x: s.x, y: s.y, state: states.has(s.id) ? states.get(s.id) : (s.state ? 1 : 0) })),
      basins: basins.map((b) => ({ id: b.id, x: b.x, y: b.y, face: b.face || null })),
    });
    for (const c of saved) st.crust.add(c);
    return t;
  } });
  void N;
  return report;
}
