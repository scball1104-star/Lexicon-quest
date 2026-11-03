// Quench channels (E3-world, EPISODE3_PLAN 5.1): the water tracer. Pure (no engine, no DOM), node-tested in
// qa/world/e3_flow.test.mjs; tools/maps/mapcheck.mjs may import it to model the puzzles.
//
// Decision: a sibling of world/beam.js, not a `medium` option on it. It reuses beam.js's direction tables and mirror
// turn (a sluice turns water exactly as a mirror turns a beam) and its cap and loop guard, but water also follows the
// trough art (corners, junctions, ends) and dams, which beams never do. Kept apart so beam.js (in the first
// download) does not grow and Episode 2's tracing cannot change.
//
//   traceFlow({ w, h, flow(x, y), arms(x, y), code(x, y), sources, sluices, basins })
//     -> { streams, wet, quench, fullBasins, splashes, dams }
//   traceFlowFromEvents(events, { w, h, flow, arms, code, isPresent, states, positions })
//
// Rules:
// - A spout emits from its own cell in `dir`; water starts in the next cell.
// - Water moves only over flow cells: flow(x, y) is 'channel' (troughs, crust) or 'slag' (molten slag), else null.
// - Sluices and basins are looked up first (their props are solid to walkers). A sluice turns water like a mirror:
//   state 0 = '/', 1 = backslash. A basin stops the water and fills when it arrives through its `face` (the side
//   the basin's mouth looks toward; no face = any side); its back stops it like a wall.
// - A flow cell holding something solid (code 'solid': a block, a closed gate, a pot) is a dam: the water stops
//   before it (end 'dam'), no splash.
// - On a trough cell (arms(x, y) is a string of N E S W) water leaves by the arm straight ahead when it has one and
//   that way is not dammed; otherwise by the other arms (one: it turns the corner; two: it splits both ways, right
//   hand first); none: it rests (end 'pool', a trough end). Cells with no arms (slag, crust) pass water straight.
// - Leaving the flow cells: onto open floor the water stops ON that cell and leaves a puddle (splash, floor: true);
//   into a wall it stops on the last cell (splash, floor: false), as a beam does.
// - Every slag cell water reaches is listed in `quench` (in the order reached: the cooling front). The caller crusts
//   them for good; water keeps flowing over them.
// - At most MAX_LEN cells per spout; re-entering a cell in the same direction stops that branch (loop guard).
// - Several spouts trace independently; `wet` is the union. Actors never block water (leave them out of `code`).

import { MAX_LEN, DIRV, OPP, mirrorTurn } from '../beam.js';

export { MAX_LEN };
const ARM = { up: 'N', right: 'E', down: 'S', left: 'W' };
const RIGHT = { up: 'right', right: 'down', down: 'left', left: 'up' };
const LEFT = { up: 'left', left: 'down', down: 'right', right: 'up' };
const key = (x, y) => `${x},${y}`;

/** The directions water may leave a trough cell by, entered moving `dir` (straight first, then right, then left). */
export function exitsOf(arms, dir) {
  const back = ARM[OPP[dir]];
  const out = [];
  for (const d of [dir, RIGHT[dir], LEFT[dir]]) if (arms.includes(ARM[d]) && ARM[d] !== back) out.push(d);
  return out;
}

/**
 * Trace every spout. Inputs: w, h; flow(x, y) -> 'channel' | 'slag' | null; arms(x, y) -> 'NESW' subset | null;
 * code(x, y) collision with solid props included (out of bounds 'void'); sources [{ id, x, y, dir }];
 * sluices [{ id, x, y, state }]; basins [{ id, x, y, face? }].
 * Output:
 *   streams: [{ id, cells: [{ x, y, from, to }], end: { kind, x, y, dir, id?, floor? } }]   kind: splash | dam |
 *            pool | basin | loop | max. A split adds one stream per branch (same id).
 *   wet: Set of 'x,y' with water (sluice and basin cells included, the spout's own cell and puddles excluded)
 *   quench: ['x,y'] slag cells reached, first reached first
 *   fullBasins: Set of basin ids filled through their face
 *   splashes: [{ x, y, dir, floor }]    puddles (floor: true, on that cell) and wall splashes (on the last cell)
 *   dams: [{ x, y, dir }]               the dammed cell and the way the water was pushing
 */
export function traceFlow(input) {
  const { w, h } = input;
  const flow = input.flow || (() => null);
  const arms = input.arms || (() => null);
  const code = input.code || (() => 'none');
  const sluices = new Map(), basins = new Map();
  for (const s of input.sluices || []) sluices.set(key(s.x, s.y), s);
  for (const b of input.basins || []) basins.set(key(b.x, b.y), b);
  const out = { streams: [], wet: new Set(), quench: [], fullBasins: new Set(), splashes: [], dams: [] };
  const quenched = new Set();
  const inB = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
  const solid = (c) => c === 'solid' || c === 'void' || c == null;
  const dammed = (x, y) => inB(x, y) && !!flow(x, y) && !sluices.has(key(x, y)) && !basins.has(key(x, y)) && solid(code(x, y));
  for (const src of input.sources || []) {
    if (!DIRV[src.dir]) continue;
    const seen = new Set();
    let n = 0;
    const queue = [{ x: src.x, y: src.y, dir: src.dir, first: { x: src.x, y: src.y, from: null, to: src.dir } }];
    while (queue.length) {
      const b = queue.shift();
      const stream = { id: src.id || null, cells: [b.first], end: null };
      out.streams.push(stream);
      let { x, y, dir } = b;
      for (;;) {
        if (n >= MAX_LEN) { stream.end = { kind: 'max', x, y, dir }; break; }
        const nx = x + DIRV[dir][0], ny = y + DIRV[dir][1];
        const k = key(nx, ny);
        if (!inB(nx, ny)) { stream.end = { kind: 'splash', x, y, dir, floor: false }; out.splashes.push({ x, y, dir, floor: false }); break; }
        const sk = `${k},${dir}`;
        if (seen.has(sk)) { stream.end = { kind: 'loop', x, y, dir }; break; }
        seen.add(sk);
        n++;
        const bas = basins.get(k);
        if (bas) {
          if (!bas.face || bas.face === OPP[dir]) {
            stream.cells.push({ x: nx, y: ny, from: OPP[dir], to: null });
            out.wet.add(k);
            out.fullBasins.add(bas.id);
            stream.end = { kind: 'basin', x: nx, y: ny, dir, id: bas.id };
          } else {
            stream.end = { kind: 'splash', x, y, dir, floor: false, id: bas.id };
            out.splashes.push({ x, y, dir, floor: false });
          }
          break;
        }
        const sl = sluices.get(k);
        if (sl) {
          const nd = mirrorTurn(dir, sl.state);
          stream.cells.push({ x: nx, y: ny, from: OPP[dir], to: nd });
          out.wet.add(k);
          x = nx; y = ny; dir = nd;
          continue;
        }
        const f = flow(nx, ny);
        const c = code(nx, ny);
        if (!f) {
          const floor = !solid(c);
          const at = floor ? { x: nx, y: ny } : { x, y };
          stream.end = { kind: 'splash', ...at, dir, floor };
          out.splashes.push({ ...at, dir, floor });
          break;
        }
        if (solid(c)) { stream.end = { kind: 'dam', x: nx, y: ny, dir }; out.dams.push({ x: nx, y: ny, dir }); break; }
        out.wet.add(k);
        if (f === 'slag' && !quenched.has(k)) { quenched.add(k); out.quench.push(k); }
        const a = arms(nx, ny);
        if (!a) { stream.cells.push({ x: nx, y: ny, from: OPP[dir], to: dir }); x = nx; y = ny; continue; }
        const ways = exitsOf(a, dir);
        const open = ways.filter((d) => !dammed(nx + DIRV[d][0], ny + DIRV[d][1]));
        let go;
        if (open.includes(dir)) go = [dir];
        else go = open.filter((d) => d !== dir);
        if (!go.length) {
          const d0 = ways[0];
          stream.cells.push({ x: nx, y: ny, from: OPP[dir], to: null });
          if (d0) {
            const dm = { x: nx + DIRV[d0][0], y: ny + DIRV[d0][1], dir: d0 };
            stream.end = { kind: 'dam', ...dm };
            out.dams.push(dm);
          } else stream.end = { kind: 'pool', x: nx, y: ny, dir };
          break;
        }
        stream.cells.push({ x: nx, y: ny, from: OPP[dir], to: go[0] });
        for (const d of go.slice(1)) queue.push({ x: nx, y: ny, dir: d, first: { x: nx, y: ny, from: null, to: d } });
        x = nx; y = ny; dir = go[0];
      }
    }
  }
  return out;
}

/** Cells a slag body may hold before the rest stays molten (keep map pools at or under this). */
export const MAX_BODY = 96;

/**
 * Every slag cell a trace cools, body by body: each `quench` entry cell's 4-connected slag body (flow(x, y) ===
 * 'slag'), nearest the entry first, at most MAX_BODY cells a body. Returns [{ x, y, d, entry }] where d is the ring
 * distance from the body's entry cell (the cooling front). `skip(x, y)` leaves cells out (already crusted). Pure.
 */
export function quenchCells(result, { w, h, flow, skip } = {}) {
  const out = [];
  const taken = new Set();
  for (const k of result.quench || []) {
    if (taken.has(k)) continue;
    const [ex, ey] = k.split(',').map(Number);
    const q = [[ex, ey, 0]];
    taken.add(k);
    let n = 0;
    while (q.length && n < MAX_BODY) {
      const [x, y, d] = q.shift();
      n++;
      if (!(skip && skip(x, y))) out.push({ x, y, d, entry: k });
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        const nx = x + dx, ny = y + dy, nk = key(nx, ny);
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || taken.has(nk) || flow(nx, ny) !== 'slag') continue;
        taken.add(nk);
        q.push([nx, ny, d + 1]);
      }
    }
  }
  return out;
}

/** The water parts of a map's events: spouts, sluices, basins. `isPresent(ev)` filters (default: all). */
export function flowPartsOf(events, isPresent = () => true) {
  const sources = [], sluices = [], basins = [];
  for (const ev of events || []) {
    if (!ev || !isPresent(ev)) continue;
    if (ev.type === 'spout') sources.push({ id: ev.id, x: ev.x, y: ev.y, dir: ev.dir || 'down' });
    else if (ev.type === 'sluice') sluices.push({ id: ev.id, x: ev.x, y: ev.y, state: ev.state ? 1 : 0 });
    else if (ev.type === 'basin') basins.push({ id: ev.id, x: ev.x, y: ev.y, face: ev.face || null });
  }
  return { sources, sluices, basins };
}

/**
 * Trace a map's events[] (tools and tests): `o` gives w, h, flow, arms, code, and optionally isPresent(ev), `states`
 * ({ sluiceId: 0 | 1 }) overriding the authored sluices.
 */
export function traceFlowFromEvents(events, o = {}) {
  const parts = flowPartsOf(events, o.isPresent);
  if (o.states) for (const s of parts.sluices) if (o.states[s.id] != null) s.state = o.states[s.id] ? 1 : 0;
  return traceFlow({ w: o.w, h: o.h, flow: o.flow, arms: o.arms, code: o.code, ...parts });
}

/**
 * The flow kind and trough arms of a cell from tiles.json entries (shared by the field and the tools): `terrain` is the
 * cell's terrain id, `ids` the tile ids drawn on it (legend tile, decor, overlays). A tile with `flow` beats the
 * terrain (crust over slag is channel). Returns { flow: 'channel' | 'slag' | null, arms: string | null }.
 */
export function cellFlow(db, terrain, ids) {
  let flow = null, arms = null;
  const T = (db && db.terrains) || {}, TL = (db && db.tiles) || {};
  if (terrain && T[terrain] && T[terrain].flow) flow = T[terrain].flow;
  for (const id of ids || []) {
    const m = TL[id];
    if (!m || !m.flow) continue;
    flow = m.flow;
    if (m.arms) arms = m.arms;
  }
  return { flow, arms };
}
