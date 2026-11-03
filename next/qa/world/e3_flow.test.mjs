// Quench channels, the pure tracer (E3-world, EPISODE3_PLAN 5.1): src/world/ep3/flow.js. Grids are drawn as strings:
//   '.' floor  '#' wall  'S' slag  '-' '|' troughs  'L' 'J' '7' 'r' corners (NE NW SW SE)  'T' tee (E S W)  '+' cross
//   'Y' tee (N E W)  'e' trough end (open north)  'B' a block standing on a trough cell ('-' under it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { traceFlow, traceFlowFromEvents, quenchCells, exitsOf, cellFlow, MAX_LEN, MAX_BODY } from '../../src/world/ep3/flow.js';

const ARMS = { '-': 'EW', '|': 'NS', L: 'NE', J: 'NW', 7: 'SW', r: 'SE', T: 'ESW', Y: 'NEW', '+': 'NESW', e: 'N', B: 'EW' };
function grid(rows, extra = {}) {
  const h = rows.length, w = rows[0].length;
  const at = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? rows[y][x] : '#');
  return {
    w, h,
    flow: (x, y) => { const c = at(x, y); return c === 'S' ? 'slag' : ARMS[c] ? 'channel' : extra.crust && extra.crust.has(`${x},${y}`) ? 'channel' : null; },
    arms: (x, y) => ARMS[at(x, y)] || null,
    code: (x, y) => { const c = at(x, y); return c === '#' ? 'solid' : c === 'B' ? 'solid' : c === 'S' ? 'water' : 'none'; },
  };
}
const run = (rows, parts, extra) => traceFlow({ ...grid(rows, extra), ...parts });

test('a straight trough carries the water to a basin facing it; the spout cell is not wet', () => {
  const r = run(['..#..', '..|..', '..|..', '.....'], { sources: [{ id: 's', x: 2, y: 0, dir: 'down' }], basins: [{ id: 'b', x: 2, y: 3, face: 'up' }] });
  assert.ok(r.fullBasins.has('b'));
  assert.deepEqual([...r.wet].sort(), ['2,1', '2,2', '2,3']);
  assert.equal(r.streams[0].end.kind, 'basin');
});

test('a basin filled from its back stays empty and the water splashes', () => {
  const r = run(['..#..', '..|..', '..|..', '.....'], { sources: [{ id: 's', x: 2, y: 0, dir: 'down' }], basins: [{ id: 'b', x: 2, y: 3, face: 'down' }] });
  assert.equal(r.fullBasins.size, 0);
  assert.equal(r.streams[0].end.kind, 'splash');
});

test('each sluice orientation turns the water as a mirror turns a beam (four ways in, two states)', () => {
  const rows = ['.......', '...|...', '...|...', '-------', '...|...', '...|...', '.......'];
  const cases = [
    [3, 0, 'down', 0, 'left'], [3, 0, 'down', 1, 'right'],
    [3, 6, 'up', 0, 'right'], [3, 6, 'up', 1, 'left'],
    [0, 3, 'right', 0, 'up'], [0, 3, 'right', 1, 'down'],
    [6, 3, 'left', 0, 'down'], [6, 3, 'left', 1, 'up'],
  ];
  for (const [x, y, dir, state, out] of cases) {
    const r = run(rows, { sources: [{ id: 's', x, y, dir }], sluices: [{ id: 'k', x: 3, y: 3, state }] });
    const cell = r.streams[0].cells.find((c) => c.x === 3 && c.y === 3);
    assert.equal(cell.to, out, `${dir} into state ${state} leaves ${out}`);
  }
});

test('water leaving the troughs onto floor stops ON that cell (a puddle); into a wall it splashes on the last cell', () => {
  const a = run(['#.#', '.|.', '...'], { sources: [{ id: 's', x: 1, y: 0, dir: 'down' }] });
  assert.deepEqual(a.splashes, [{ x: 1, y: 2, dir: 'down', floor: true }]);
  assert.ok(!a.wet.has('1,2'), 'the puddle cell is not wet trough');
  const b = run(['#.#', '.|.', '###'], { sources: [{ id: 's', x: 1, y: 0, dir: 'down' }] });
  assert.deepEqual(b.splashes, [{ x: 1, y: 1, dir: 'down', floor: false }]);
});

test('corners turn the water; a trough end rests it (pool); a tee from its stem splits both ways, right hand first', () => {
  const corner = run(['#.....', '.r--..', '.|....', '.|....'], { sources: [{ id: 's', x: 4, y: 1, dir: 'left' }] });
  assert.ok(corner.wet.has('1,3'), 'down the corner');
  const pool = run(['#.#', '.|.', '.e.'], { sources: [{ id: 's', x: 1, y: 0, dir: 'down' }] });
  assert.equal(pool.streams[0].end.kind, 'pool');
  assert.equal(pool.splashes.length, 0);
  const tee = run(['..#..', '..|..', '--Y--', '.....'], { sources: [{ id: 's', x: 2, y: 0, dir: 'down' }] });
  assert.equal(tee.streams.length, 2, 'split');
  assert.ok(tee.wet.has('0,2') && tee.wet.has('4,2'));
  assert.equal(tee.streams[0].cells[tee.streams[0].cells.length - 1].x, 0, 'the right hand of a downward stream is west: first');
});

test('a block on a trough dams it; at a tee the dammed way is skipped and the water takes the other', () => {
  const dam = run(['..#..', '..|..', '..B..', '..|..'].map((s, j) => (j === 2 ? '..B..' : s)), { sources: [{ id: 's', x: 2, y: 0, dir: 'down' }] });
  assert.equal(dam.streams[0].end.kind, 'dam');
  assert.deepEqual(dam.dams, [{ x: 2, y: 2, dir: 'down' }]);
  assert.ok(!dam.wet.has('2,3'));
  const src = [{ id: 's', x: 0, y: 1, dir: 'right' }];
  const open = run(['.....', '#T---', '.|...', '.|...'], { sources: src });
  assert.ok(open.wet.has('4,1') && !open.wet.has('1,3'), 'straight on while the bar is open');
  const shut = run(['.....', '#TB--', '.|...', '.|...'], { sources: src });
  assert.ok(shut.wet.has('1,3') && !shut.wet.has('3,1'), 'dammed bar: down the stem');
});

test('slag passes water straight and is listed for quenching; the whole body cools nearest first, capped', () => {
  const rows = ['......', '#SSS-.', '.SSS..', '......'];
  const r = run(rows, { sources: [{ id: 's', x: 0, y: 1, dir: 'right' }] });
  assert.deepEqual(r.quench, ['1,1', '2,1', '3,1']);
  const g = grid(rows);
  const cells = quenchCells(r, { w: g.w, h: g.h, flow: g.flow });
  assert.equal(cells.length, 6, 'the whole 3 x 2 body');
  assert.deepEqual(cells[0], { x: 1, y: 1, d: 0, entry: '1,1' });
  assert.ok(cells.every((c, i) => i === 0 || c.d >= cells[i - 1].d), 'a front: ring by ring');
  const big = { w: 20, h: 10, flow: () => 'slag' };
  assert.equal(quenchCells({ quench: ['0,0'] }, big).length, MAX_BODY);
  assert.equal(quenchCells(r, { ...g, skip: (x, y) => y === 2 }).length, 3, 'skip leaves cooled cells out');
});

test('crust is channel: water keeps flowing over it, and nothing new is quenched', () => {
  const crust = new Set(['1,1', '2,1', '3,1']);
  const r = run(['......', '#...-.', '......'], { sources: [{ id: 's', x: 0, y: 1, dir: 'right' }] }, { crust });
  assert.ok(r.wet.has('4,1'));
  assert.deepEqual(r.quench, []);
});

test('loop guard and the 256-cell cap; several spouts union their wet cells', () => {
  const ring = run(['.#....', '.r--7.', '.|..|.', '.L--J.'], { sources: [{ id: 's', x: 1, y: 0, dir: 'down' }] });
  assert.equal(ring.streams[0].end.kind, 'loop');
  assert.equal(ring.wet.size, 10);
  const long = { w: 400, h: 1, flow: () => 'channel', arms: () => null, code: () => 'none' };
  const m = traceFlow({ ...long, sources: [{ id: 'm', x: 0, y: 0, dir: 'right' }] });
  assert.equal(m.streams[0].end.kind, 'max');
  assert.equal(m.wet.size, MAX_LEN);
  const two = run(['#...#', '|...|', '|...|'], { sources: [{ id: 'a', x: 0, y: 0, dir: 'down' }, { id: 'b', x: 4, y: 0, dir: 'down' }] });
  assert.ok(two.wet.has('0,2') && two.wet.has('4,2'));
});

test('actors never block water (the caller leaves them out of code); fixed results: deterministic', () => {
  const rows = ['..#..', '..|..', '..|..', '.....'];
  const p = { sources: [{ id: 's', x: 2, y: 0, dir: 'down' }], basins: [{ id: 'b', x: 2, y: 3, face: 'up' }] };
  assert.deepEqual(JSON.stringify(run(rows, p).streams), JSON.stringify(run(rows, p).streams));
});

test('exitsOf, cellFlow and traceFlowFromEvents with sluice state overrides', () => {
  assert.deepEqual(exitsOf('NS', 'down'), ['down']);
  assert.deepEqual(exitsOf('SW', 'right'), ['down']);
  assert.deepEqual(exitsOf('NEW', 'down'), ['left', 'right']);
  const db = { terrains: { slag: { flow: 'slag' } }, tiles: { trough_h: { flow: 'channel', arms: 'EW' }, slag_crust: { flow: 'channel' } } };
  assert.deepEqual(cellFlow(db, 'slag', []), { flow: 'slag', arms: null });
  assert.deepEqual(cellFlow(db, 'slag', ['slag_crust']), { flow: 'channel', arms: null }, 'crust over slag is channel');
  assert.deepEqual(cellFlow(db, 'stone', ['trough_h']), { flow: 'channel', arms: 'EW' });
  const g = grid(['.......', '...|...', '...|...', '-------', '.......']);
  const events = [{ id: 's', type: 'spout', x: 3, y: 0, dir: 'down' }, { id: 'k', type: 'sluice', x: 3, y: 3, state: 0 }, { id: 'n', type: 'npc', x: 1, y: 1 }];
  const a = traceFlowFromEvents(events, g);
  const b = traceFlowFromEvents(events, { ...g, states: { k: 1 } });
  assert.ok(a.wet.has('0,3') && !a.wet.has('6,3'));
  assert.ok(b.wet.has('6,3') && !b.wet.has('0,3'));
});
