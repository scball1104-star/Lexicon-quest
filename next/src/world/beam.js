// Silverglass beams (E2-world, EPISODE2_PLAN 5.1): pure tracing, no engine, no DOM. Unit-tested in
// qa/world/beam.test.mjs; tools/maps/mapcheck.mjs imports it to model the puzzles.
//
//   traceBeams({ w, h, code(x, y), pass(x, y), sources, mirrors, receptors })
//     -> { beams, lit, litReceptors, splashes, bounces }
//   traceFromEvents(events, { w, h, code, pass })   the same, reading a map's events[] (present ones only)
//
// Rules (the plan's 5.1, decided):
// - A source emits from its own cell in `dir`; the trace starts in the next cell.
// - A beam moves cell by cell. It passes any cell whose code is not 'solid' / 'void' (floor, pits, water, ink,
//   ledges, counters, dim or lit bridges) and any cell where pass(x, y) is true (glass slots: walls the light
//   crosses). It stops at a solid cell and leaves a splash on the last open cell, facing the wall.
// - Mirrors and receptors are looked up before the cell code (their props are solid to walkers).
//   '/' (state 0): right -> up, up -> right, left -> down, down -> left.
//   '\' (state 1): right -> down, down -> right, left -> up, up -> left.
// - A receptor stops the beam. It lights when the beam arrives through its face: `face` is the side the crystal
//   looks toward, so face 'left' lights for a beam travelling right. No face: any side lights it.
// - Actors never block a beam (the caller leaves them out of `code`).
// - At most MAX_LEN cells per source; re-entering a cell in the same direction stops the beam (loop guard).
// - Several sources trace independently; `lit` is the union of their cells.

export const MAX_LEN = 256;
export const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
/** mirror state -> incoming direction -> outgoing direction */
export const MIRROR_TURN = [
  { right: 'up', up: 'right', left: 'down', down: 'left' },     // 0 = '/'
  { right: 'down', down: 'right', left: 'up', up: 'left' },     // 1 = '\'
];
/** Bridge tile ids: dim (collision pit) <-> lit (collision none). */
export const BRIDGE_IDS = { glass_bridge_h_dim: 'glass_bridge_h_lit', glass_bridge_v_dim: 'glass_bridge_v_lit' };
export const BRIDGE_DIM = { glass_bridge_h_lit: 'glass_bridge_h_dim', glass_bridge_v_lit: 'glass_bridge_v_dim' };

export function mirrorTurn(dir, state) { return MIRROR_TURN[state ? 1 : 0][dir]; }

const key = (x, y) => `${x},${y}`;

/**
 * Trace every source. Inputs: w, h (map size), code(x, y) (collision code with solid props, gates, blocks,
 * pots and chests included; out of bounds is 'void'), pass(x, y) (a beam: 'pass' tile there), sources
 * [{ id, x, y, dir }], mirrors [{ id, x, y, state }], receptors [{ id, x, y, face? }].
 * Output:
 *   beams: [{ id, cells: [{ x, y, from, to }], end: { kind, x, y, dir, id? } }]   from/to are the sides the beam
 *          enters and leaves a cell by (null at the source's start and at a receptor/splash end)
 *   lit: Set of 'x,y' every beam crosses (the source cell excluded, mirror and receptor cells included)
 *   litReceptors: Set of receptor ids lit through their face
 *   splashes: [{ x, y, dir }]     the last open cell and the direction of the wall it hit
 *   bounces: [{ x, y, id }]       mirror cells a beam turned on
 */
export function traceBeams(input) {
  const { w, h } = input;
  const code = input.code || (() => 'none');
  const pass = input.pass || (() => false);
  const mirrors = new Map();
  for (const m of input.mirrors || []) mirrors.set(key(m.x, m.y), m);
  const receptors = new Map();
  for (const r of input.receptors || []) receptors.set(key(r.x, r.y), r);
  const out = { beams: [], lit: new Set(), litReceptors: new Set(), splashes: [], bounces: [] };
  const inBounds = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
  for (const src of input.sources || []) {
    if (!DIRV[src.dir]) continue;
    const beam = { id: src.id || null, cells: [{ x: src.x, y: src.y, from: null, to: src.dir }], end: null };
    out.beams.push(beam);
    const seen = new Set();
    let x = src.x, y = src.y, dir = src.dir;
    for (let n = 0; ; n++) {
      if (n >= MAX_LEN) { beam.end = { kind: 'max', x, y, dir }; break; }
      const nx = x + DIRV[dir][0], ny = y + DIRV[dir][1];
      const k = key(nx, ny);
      if (!inBounds(nx, ny)) { beam.end = { kind: 'splash', x, y, dir }; out.splashes.push({ x, y, dir }); break; }
      const sk = `${k},${dir}`;
      if (seen.has(sk)) { beam.end = { kind: 'loop', x, y, dir }; break; }
      seen.add(sk);
      const rec = receptors.get(k);
      if (rec) {
        const face = rec.face || null;
        if (!face || face === OPP[dir]) {
          beam.cells.push({ x: nx, y: ny, from: OPP[dir], to: null });
          out.lit.add(k);
          out.litReceptors.add(rec.id);
          beam.end = { kind: 'receptor', x: nx, y: ny, dir, id: rec.id };
        } else {
          // the crystal's back: the beam stops against it like a wall
          beam.end = { kind: 'splash', x, y, dir, id: rec.id };
          out.splashes.push({ x, y, dir });
        }
        break;
      }
      const mir = mirrors.get(k);
      if (mir) {
        const nd = mirrorTurn(dir, mir.state);
        beam.cells.push({ x: nx, y: ny, from: OPP[dir], to: nd });
        out.lit.add(k);
        out.bounces.push({ x: nx, y: ny, id: mir.id || null });
        x = nx; y = ny; dir = nd;
        continue;
      }
      const c = code(nx, ny);
      if ((c === 'solid' || c === 'void' || c == null) && !pass(nx, ny)) {
        beam.end = { kind: 'splash', x, y, dir };
        out.splashes.push({ x, y, dir });
        break;
      }
      beam.cells.push({ x: nx, y: ny, from: OPP[dir], to: dir });
      out.lit.add(k);
      x = nx; y = ny;
    }
  }
  return out;
}

/** The beam parts of a map's events: sources, mirrors, receptors. `isPresent(ev)` filters (default: all). */
export function beamPartsOf(events, isPresent = () => true) {
  const sources = [], mirrors = [], receptors = [];
  for (const ev of events || []) {
    if (!ev || !isPresent(ev)) continue;
    if (ev.type === 'beam') sources.push({ id: ev.id, x: ev.x, y: ev.y, dir: ev.dir || 'down' });
    else if (ev.type === 'mirror') mirrors.push({ id: ev.id, x: ev.x, y: ev.y, state: ev.state ? 1 : 0 });
    else if (ev.type === 'receptor') receptors.push({ id: ev.id, x: ev.x, y: ev.y, face: ev.face || null });
  }
  return { sources, mirrors, receptors };
}

/**
 * Trace a map's events[] (tools and tests): `o` gives w, h, code(x, y), pass(x, y), and optionally isPresent(ev)
 * and `states` ({ mirrorId: 0 | 1 }) / `positions` ({ mirrorId: [x, y] }) overriding the authored mirrors.
 */
export function traceFromEvents(events, o = {}) {
  const parts = beamPartsOf(events, o.isPresent);
  if (o.states || o.positions) {
    for (const m of parts.mirrors) {
      if (o.states && o.states[m.id] != null) m.state = o.states[m.id] ? 1 : 0;
      if (o.positions && o.positions[m.id]) [m.x, m.y] = o.positions[m.id];
    }
  }
  return traceBeams({ w: o.w, h: o.h, code: o.code, pass: o.pass, ...parts });
}

/** Cells a set of beams lights that hold a bridge tile, as dim id -> the cells (helper for tools). */
export function bridgeCellsLit(result, bridgeAt) {
  const out = [];
  for (const k of result.lit) {
    const [x, y] = k.split(',').map(Number);
    if (bridgeAt(x, y)) out.push([x, y]);
  }
  return out;
}
