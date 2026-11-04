// Tide-lock planner for the Episode 4 autoplay (E4-integrate; qa/autoplay.py Episode4.tide_go). Not a test.
// Given a keep map, the live tide state, where the leader stands and the cells it wants to reach, it searches the level states
// (every wheel the party can stand at, one turn at a time, washes and floodgate latches as one-way unlocks; the pure rule of
// src/data/ep4/field/tide.js) and prints the fewest-turn plan: [{ wheel, stand: [x, y], face }], then the walk.
//
//   echo '{"map":"ep4_keep_f2","levels":{"a":1,"b":0,"c":0},"washed":[],"latched":[],"dams":[],"pos":[6,24],
//          "goals":[[36,4]],"solid":[[x,y]...],"open":[[x,y]...],"avoid":[[x,y]...],"flags":[...]}' | node qa/integrate/ep4_tideplan.mjs
//
// solid / open / avoid come from the bot's live model of everything that is not tide-driven (NPCs, chests, wheels, posts,
// locked doors, blocks; doorways and broken cracks; doors that change map), so the plan walks what the bot will walk.
import { loadDb, loadMap, buildGrid, withFlags } from '../../tools/maps/mapcheck.mjs';
import { compile, classify, washes, gateOpen, levelsOf } from '../../src/data/ep4/field/tide.js';

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const LEDGE = { ledge_s: 'down', ledge_e: 'right', ledge_w: 'left' };

const input = JSON.parse(await new Promise((res) => { let s = ''; process.stdin.on('data', (d) => { s += d; }); process.stdin.on('end', () => res(s)); }));
const db = await loadDb();
let map = await loadMap(input.map);
map = withFlags(map, new Set(input.flags || []));
const g = buildGrid({ ...map, events: [] }, db);
const m = compile(map);
if (!m) { process.stdout.write(JSON.stringify({ ok: false, why: 'no tide' })); process.exit(0); }
const W = g.W, H = g.H;
const key = (x, y) => y * W + x;
const solid = new Set((input.solid || []).map(([x, y]) => key(x, y)));
const open = new Set((input.open || []).map(([x, y]) => key(x, y)));
const avoid = new Set((input.avoid || []).map(([x, y]) => key(x, y)));
const goals = new Set((input.goals || []).map(([x, y]) => key(x, y)));
const dams = new Set((input.dams || []).map(([x, y]) => key(x, y)));
// gates a forgery opens (its `target`), floodgate cells
const gateCells = new Map();      // cell -> { kind: 'seal' | 'flood', id }
for (const f of m.forgeries) {
  const tg = f.ev.target == null ? [] : [].concat(f.ev.target);
  for (const e of map.events) if (tg.includes(e.id)) for (let i = 0; i < (e.w || 1); i++) gateCells.set(key(e.x + i, e.y), { kind: 'seal', id: f.id });
}
for (const fg of m.floodgates) for (let i = 0; i < fg.w; i++) gateCells.set(key(fg.x + i, fg.y), { kind: 'flood', fg });
const wheels = m.wheels.map((w) => ({ id: w.id, b: w.b, x: w.x, y: w.y, levels: m.basins[w.b].levels }));

function floor(st) {
  const c = classify(map, { levels: st.levels, washed: st.washed, latched: st.latched, dams });
  return (x, y, d) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    const i = key(x, y);
    if (avoid.has(i) && !goals.has(i)) return false;
    const gc = gateCells.get(i);
    if (gc) return gc.kind === 'seal' ? st.washed.has(gc.id) : gateOpen(map, st, gc.fg);
    if (c.floats.has(i)) return true;
    if (c.flooded.has(i) || c.solid.has(i)) return false;
    if (solid.has(i)) return false;
    if (open.has(i)) return true;
    const code = g.code[y][x];
    if (code === 'none') return true;
    if (LEDGE[code]) return LEDGE[code] === d;
    return false;
  };
}

function region(st, start) {
  const pass = floor(st);
  const seen = new Map([[start, null]]);
  const q = [start];
  while (q.length) {
    const i = q.shift();
    const x = i % W, y = (i / W) | 0;
    if (goals.has(i)) return { seen, hit: i };
    for (const [d, [dx, dy]] of Object.entries(DIRS)) {
      const nx = x + dx, ny = y + dy, j = key(nx, ny);
      if (seen.has(j) || !pass(nx, ny, d)) continue;
      seen.set(j, i);
      q.push(j);
    }
  }
  return { seen, hit: -1 };
}

const sKey = (st, cell) => `${Object.entries(st.levels).map(([k, v]) => k + v).join('')}|${[...st.washed].sort()}|${[...st.latched].sort()}|${cell}`;
const start = { levels: levelsOf(map, { levels: input.levels }), washed: new Set(input.washed || []), latched: new Set(input.latched || []) };
const pos = key(input.pos[0], input.pos[1]);
const seenStates = new Set();
let frontier = [{ st: start, cell: pos, plan: [] }];
let result = null;
for (let turns = 0; turns <= (input.maxTurns || 8) && frontier.length && !result; turns++) {
  const next = [];
  for (const node of frontier) {
    const r = region(node.st, node.cell);
    // one key per region: the smallest cell index in it
    const rk = sKey(node.st, Math.min(...r.seen.keys()));
    if (seenStates.has(rk)) continue;
    seenStates.add(rk);
    if (r.hit >= 0) { result = { plan: node.plan, goal: [r.hit % W, (r.hit / W) | 0] }; break; }
    for (const w of wheels) {
      for (const [d, [dx, dy]] of Object.entries(DIRS)) {
        const sx = w.x - dx, sy = w.y - dy, si = key(sx, sy);     // stand here, face d toward the wheel
        if (!r.seen.has(si)) continue;
        const lv = { ...node.st.levels, [w.b]: (node.st.levels[w.b] + 1) % (w.levels === 2 ? 2 : 3) };
        const st = { levels: lv, washed: new Set(node.st.washed), latched: new Set(node.st.latched) };
        for (const id of washes(map, { levels: lv, washed: st.washed, dams })) st.washed.add(id);
        for (const fg of m.floodgates) if (fg.latch && gateOpen(map, { levels: lv }, fg)) st.latched.add(fg.id);
        next.push({ st, cell: si, plan: [...node.plan, { wheel: w.id, stand: [sx, sy], face: d, basin: w.b, level: lv[w.b] }] });
        break;                                                       // one stand per wheel and region is enough
      }
    }
  }
  frontier = next;
}
process.stdout.write(JSON.stringify(result ? { ok: true, ...result } : { ok: false, why: 'no plan', states: seenStates.size }));
