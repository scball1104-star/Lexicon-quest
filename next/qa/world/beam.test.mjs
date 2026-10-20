// Silverglass beam tracing (E2-world, EPISODE2_PLAN 5.1): the pure rules of src/world/beam.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { traceBeams, traceFromEvents, mirrorTurn, MIRROR_TURN, MAX_LEN, BRIDGE_IDS, BRIDGE_DIM } from '../../src/world/beam.js';

/** A grid from strings: '#' solid, 'p' pit, '~' water, 'S' a glass slot (solid, beam passes), '.' floor. */
function grid(rows) {
  const h = rows.length, w = rows[0].length;
  const C = { '#': 'solid', 'p': 'pit', '~': 'water', 'S': 'solid', '.': 'none', 'c': 'counter', 'l': 'ledge_s' };
  return {
    w, h,
    code: (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 'void' : C[rows[y][x]] || 'none'),
    pass: (x, y) => rows[y] && rows[y][x] === 'S',
  };
}
const cellsOf = (b) => b.cells.map((c) => `${c.x},${c.y}`);

test('mirror turns: every orientation and direction, as the plan states', () => {
  assert.deepEqual(MIRROR_TURN[0], { right: 'up', up: 'right', left: 'down', down: 'left' });
  assert.deepEqual(MIRROR_TURN[1], { right: 'down', down: 'right', left: 'up', up: 'left' });
  for (const s of [0, 1]) for (const d of ['up', 'down', 'left', 'right']) {
    // turning twice through the same mirror from the reverse side returns the reverse direction
    const out = mirrorTurn(d, s);
    const back = mirrorTurn({ up: 'down', down: 'up', left: 'right', right: 'left' }[out], s);
    assert.equal(back, { up: 'down', down: 'up', left: 'right', right: 'left' }[d]);
  }
});

test('a straight beam runs to the wall and splashes on the last open cell', () => {
  const g = grid(['#####', '#...#', '#...#', '#####']);
  const r = traceBeams({ ...g, sources: [{ id: 's', x: 1, y: 0, dir: 'down' }] });
  assert.deepEqual(cellsOf(r.beams[0]), ['1,0', '1,1', '1,2']);
  assert.deepEqual(r.beams[0].end, { kind: 'splash', x: 1, y: 2, dir: 'down' });
  assert.deepEqual(r.splashes, [{ x: 1, y: 2, dir: 'down' }]);
  assert.ok(!r.lit.has('1,0'), 'the source cell is not lit');
  assert.ok(r.lit.has('1,1') && r.lit.has('1,2'));
});

test('each mirror orientation bends the beam the right way', () => {
  const g = grid(['#######', '#.....#', '#.....#', '#.....#', '#######']);
  const cases = [
    // [state, incoming source dir] -> expected outgoing dir at the mirror (3,2)
    [0, 'down', 'left'], [1, 'down', 'right'], [0, 'right', 'up'], [1, 'right', 'down'],
    [0, 'up', 'right'], [1, 'up', 'left'], [0, 'left', 'down'], [1, 'left', 'up'],
  ];
  const src = { down: [3, 0], up: [3, 4], right: [0, 2], left: [6, 2] };
  for (const [state, dir, want] of cases) {
    const [sx, sy] = src[dir];
    const r = traceBeams({ ...g, sources: [{ id: 's', x: sx, y: sy, dir }], mirrors: [{ id: 'm', x: 3, y: 2, state }] });
    const at = r.beams[0].cells.find((c) => c.x === 3 && c.y === 2);
    assert.equal(at.to, want, `state ${state}, travelling ${dir}`);
    assert.deepEqual(r.bounces, [{ x: 3, y: 2, id: 'm' }]);
  }
});

test('glass slots pass the beam through walls; plain walls stop it', () => {
  const g = grid(['#####', '#.S.#', '#####']);
  const r = traceBeams({ ...g, sources: [{ id: 's', x: 0, y: 1, dir: 'right' }] });
  assert.deepEqual(cellsOf(r.beams[0]), ['0,1', '1,1', '2,1', '3,1']);
  assert.equal(r.beams[0].end.kind, 'splash');
  const g2 = grid(['#####', '#.#.#', '#####']);
  const r2 = traceBeams({ ...g2, sources: [{ id: 's', x: 0, y: 1, dir: 'right' }] });
  assert.deepEqual(cellsOf(r2.beams[0]), ['0,1', '1,1']);
});

test('pits, water, counters, ledges and bridges are open to the light', () => {
  const g = grid(['########', '#.p~cl.#', '########']);
  const r = traceBeams({ ...g, sources: [{ id: 's', x: 0, y: 1, dir: 'right' }] });
  assert.equal(r.beams[0].cells.length, 7);
  for (let x = 1; x <= 6; x++) assert.ok(r.lit.has(`${x},1`));
});

test('receptors light only through their face; the back stops the beam unlit', () => {
  const g = grid(['#######', '#.....#', '#######']);
  const lit = traceBeams({ ...g, sources: [{ id: 's', x: 0, y: 1, dir: 'right' }], receptors: [{ id: 'r', x: 5, y: 1, face: 'left' }] });
  assert.ok(lit.litReceptors.has('r'));
  assert.deepEqual(lit.beams[0].end, { kind: 'receptor', x: 5, y: 1, dir: 'right', id: 'r' });
  const back = traceBeams({ ...g, sources: [{ id: 's', x: 0, y: 1, dir: 'right' }], receptors: [{ id: 'r', x: 5, y: 1, face: 'right' }] });
  assert.ok(!back.litReceptors.has('r'));
  assert.equal(back.beams[0].end.kind, 'splash');
  assert.ok(!back.lit.has('5,1'), 'the crystal is not lit from behind');
  const any = traceBeams({ ...g, sources: [{ id: 's', x: 0, y: 1, dir: 'right' }], receptors: [{ id: 'r', x: 3, y: 1 }] });
  assert.ok(any.litReceptors.has('r'), 'no face: any side lights it');
  assert.ok(!any.lit.has('4,1'), 'a receptor stops the beam');
});

test('the length is capped at MAX_LEN cells', () => {
  const open = { w: 1000, h: 3, code: (x, y) => (y === 1 ? 'none' : 'solid'), pass: () => false };
  const long = traceBeams({ ...open, sources: [{ id: 's', x: 0, y: 1, dir: 'right' }] });
  assert.equal(long.beams[0].end.kind, 'max');
  assert.equal(long.beams[0].cells.length, MAX_LEN + 1);
});

test('a beam that comes back around to its own path stops (loop guard)', () => {
  // mirrors are two-sided, so only a source inside a ring can loop: (2,1) -> B (state 1) -> C (0) -> D (1) -> A (0)
  // -> back over the source cell into (3,1), heading right again
  const g = grid(['######', '#....#', '#....#', '#....#', '######']);
  const r = traceBeams({ ...g, sources: [{ id: 's', x: 2, y: 1, dir: 'right' }],
    mirrors: [{ id: 'A', x: 1, y: 1, state: 0 }, { id: 'B', x: 4, y: 1, state: 1 }, { id: 'C', x: 4, y: 3, state: 0 }, { id: 'D', x: 1, y: 3, state: 1 }] });
  assert.equal(r.beams[0].end.kind, 'loop');
  assert.equal(r.bounces.length, 4);
});

test('several sources trace independently and lit cells are their union', () => {
  const g = grid(['#####', '#...#', '#...#', '#####']);
  const r = traceBeams({ ...g, sources: [{ id: 'a', x: 1, y: 0, dir: 'down' }, { id: 'b', x: 0, y: 1, dir: 'right' }] });
  assert.equal(r.beams.length, 2);
  for (const k of ['1,1', '1,2', '2,1', '3,1']) assert.ok(r.lit.has(k), k);
});

test('traceFromEvents reads a map\'s events and accepts mirror states and positions', () => {
  const g = grid(['#######', '#.....#', '#.....#', '#######']);
  const events = [
    { id: 'src', type: 'beam', x: 2, y: 0, dir: 'down' },
    { id: 'm', type: 'mirror', x: 2, y: 2, state: 0 },
    { id: 'r', type: 'receptor', x: 5, y: 2, face: 'left' },
    { id: 'ghost', type: 'mirror', x: 2, y: 1, state: 0, if: 'never' },
  ];
  const present = (ev) => ev.if !== 'never';
  assert.ok(!traceFromEvents(events, { ...g, isPresent: present }).litReceptors.has('r'));
  assert.ok(traceFromEvents(events, { ...g, isPresent: present, states: { m: 1 } }).litReceptors.has('r'));
  // move the mirror off the line: the beam splashes on the floor's south wall
  const moved = traceFromEvents(events, { ...g, isPresent: present, states: { m: 1 }, positions: { m: [4, 1] } });
  assert.equal(moved.beams[0].end.kind, 'splash');
  // the gated-out mirror on the line would have turned it: isPresent keeps it out
  assert.equal(traceFromEvents(events, { ...g, isPresent: () => true, states: { m: 1 } }).bounces[0].id, 'ghost');
});

test('bridge id pairs are complete both ways', () => {
  for (const [dim, lit] of Object.entries(BRIDGE_IDS)) assert.equal(BRIDGE_DIM[lit], dim);
  assert.equal(Object.keys(BRIDGE_IDS).length, 2);
});
