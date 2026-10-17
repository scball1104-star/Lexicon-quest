import test from 'node:test';
import assert from 'node:assert/strict';
import { createTweens, ease, frames, clamp, lerp, approach } from '../../src/core/tween.js';

test('every easing maps 0 -> 0 and 1 -> 1', () => {
  for (const [name, fn] of Object.entries(ease)) {
    if (name === 'steps') continue;
    assert.ok(Math.abs(fn(0)) < 1e-9, `${name}(0)`);
    assert.ok(Math.abs(fn(1) - 1) < 1e-9, `${name}(1)`);
  }
  assert.equal(ease.steps(4)(0.99), 1);
});

test('tween reaches its target in game time and resolves', async () => {
  const tw = createTweens();
  const o = { x: 0, y: 10 };
  let done = false;
  const p = tw.to(o, { x: 100 }, 0.5, { ease: 'linear' }).then((v) => { done = v; });
  for (let i = 0; i < 15; i++) tw.update(1 / 60);
  assert.ok(Math.abs(o.x - 50) < 1e-6, `halfway x=${o.x}`);
  for (let i = 0; i < 15; i++) tw.update(1 / 60);
  await p;
  assert.equal(o.x, 100); assert.equal(o.y, 10); assert.equal(done, true);
  assert.equal(tw.active, 0);
});

test('wait, delay, cancel and finishAll', async () => {
  const tw = createTweens();
  let fired = false;
  tw.after(frames(10), () => { fired = true; });
  for (let i = 0; i < 9; i++) tw.update(1 / 60);
  assert.equal(fired, false);
  tw.update(1 / 60);
  assert.equal(fired, true);

  const o = { a: 0 };
  const p = tw.to(o, { a: 1 }, 1, { delay: 0.5 });
  tw.update(0.4); assert.equal(o.a, 0);
  p.cancel();
  assert.equal(await p, false);

  const q = { b: 0 };
  const pq = tw.to(q, { b: 7 }, 3);
  tw.finishAll();
  assert.equal(q.b, 7);
  assert.equal(await pq, true);
});

test('math helpers', () => {
  assert.equal(clamp(5, 0, 3), 3);
  assert.equal(lerp(0, 10, 0.25), 2.5);
  assert.equal(approach(0, 10, 3), 3);
  assert.equal(approach(9, 10, 3), 10);
  assert.equal(approach(5, 0, 2), 3);
  assert.equal(frames(30), 0.5);
});
