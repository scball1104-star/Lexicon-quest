// X1 fix pass (m5): a chase foe boxed in by a prop between it and the leader side-steps round it instead of standing still.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EnemyBrain } from '../../src/world/actors.js';

function world(blocked, leader, start, serial = 0, rule = 'free') {
  const key = (x, y) => `${x},${y}`;
  const walls = new Set(blocked.map(([x, y]) => key(x, y)));
  const a = { tx: start[0], ty: start[1], serial, steps: 0, moving: false, startStep(nx, ny) { this.tx = nx; this.ty = ny; this.steps++; }, face() {}, faceToward() {} };
  const touched = [];
  const field = {
    leader: { tx: leader[0], ty: leader[1] }, rng: { chance: () => false, pick: (l) => l[0] }, inputLocked: 0,
    canStep: (_a, _x, _y, nx, ny) => nx >= 0 && ny >= 0 && nx < 30 && ny < 12 && !walls.has(key(nx, ny)),
    touchEnemy: (e) => touched.push(e),
  };
  const brain = new EnemyBrain(a, { move: 'chase', encounter: 'x' }, rule);
  return { a, brain, field, touched };
}
const run = (w, n = 40) => { for (let i = 0; i < n && !w.touched.length; i++) w.brain.act(w.field, 8); return w; };

test('a chaser behind one tree walks round it and reaches the leader', () => {
  const w = run(world([[11, 5]], [12, 5], [10, 5]));
  assert.equal(w.touched.length, 1, 'the foe reached the leader');
});

test('a chaser behind a three-cell wall does not oscillate: it goes round', () => {
  for (const serial of [0, 1]) {
    const w = run(world([[11, 4], [11, 5], [11, 6]], [13, 5], [10, 5], serial, 'player'));
    assert.equal(w.touched.length, 1, `serial ${serial}: reached the leader in ${w.a.steps} steps`);
    assert.ok(w.a.steps <= 12, `serial ${serial}: ${w.a.steps} steps`);
  }
});

test('an open field is unchanged: the foe walks straight at the leader', () => {
  const w = run(world([], [13, 5], [10, 5]));
  assert.equal(w.touched.length, 1);
  assert.equal(w.a.ty, 5, 'it stayed on its row');
  assert.equal(w.a.steps, 2);
});
