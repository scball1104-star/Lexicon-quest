import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng, mulberry32, hashSeed, hash2d } from '../../src/core/rng.js';

test('same seed gives the same sequence', () => {
  const a = createRng(1234), b = createRng(1234);
  for (let i = 0; i < 1000; i++) assert.equal(a.next(), b.next());
  const c = createRng(1235);
  assert.notEqual(createRng(1234).next(), c.next());
});

test('matches the raw mulberry32 reference', () => {
  const r = createRng(42), m = mulberry32(42);
  for (let i = 0; i < 50; i++) assert.equal(r.next(), m());
});

test('known first values are stable across releases', () => {
  // Pinned so an accidental algorithm change (which would change every seeded save/test) is caught.
  const r = createRng(1);
  assert.equal(Math.round(r.next() * 1e9), 627073941);
  assert.equal(Math.round(r.next() * 1e9), 2735721);
});

test('int is inclusive on both ends and in range', () => {
  const r = createRng(7);
  const seen = new Set();
  for (let i = 0; i < 5000; i++) {
    const v = r.int(1, 6);
    assert.ok(Number.isInteger(v) && v >= 1 && v <= 6);
    seen.add(v);
  }
  assert.equal(seen.size, 6);
  assert.ok(createRng(3).int(5) >= 0 && createRng(3).int(5) <= 4, 'int(n) is [0, n-1]');
  assert.equal(createRng(9).int(4, 4), 4);
});

test('pick, chance, weighted, shuffle, range', () => {
  const r = createRng(99);
  assert.equal(r.pick([]), undefined);
  const arr = ['a', 'b', 'c'];
  for (let i = 0; i < 100; i++) assert.ok(arr.includes(r.pick(arr)));
  let hits = 0;
  for (let i = 0; i < 20000; i++) if (r.chance(0.25)) hits++;
  assert.ok(hits > 4500 && hits < 5500, `chance(0.25) hit ${hits}/20000`);
  const counts = { x: 0, y: 0 };
  for (let i = 0; i < 10000; i++) counts[r.weighted(['x', 'y'], [9, 1])]++;
  assert.ok(counts.x > 8500 && counts.y > 600, JSON.stringify(counts));
  assert.equal(r.weighted([{ id: 1, weight: 0 }, { id: 2, weight: 5 }]).id, 2);
  const s = r.shuffle([1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual([...s].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8]);
  for (let i = 0; i < 100; i++) { const v = r.range(2, 3); assert.ok(v >= 2 && v < 3); }
});

test('state save/restore resumes the exact sequence', () => {
  const r = createRng(555);
  r.next(); r.next();
  const saved = r.state;
  const expect = [r.next(), r.next(), r.next()];
  r.state = saved;
  assert.deepEqual([r.next(), r.next(), r.next()], expect);
});

test('fork is deterministic and independent of parent position', () => {
  const a = createRng(10), b = createRng(10);
  a.next(); a.next();
  assert.equal(a.fork('loot').next(), b.fork('loot').next());
  assert.notEqual(b.fork('loot').next(), b.fork('ai').next());
});

test('string seeds and hashes', () => {
  assert.equal(createRng('willowmere').next(), createRng('willowmere').next());
  assert.equal(hashSeed('abc'), hashSeed('abc'));
  assert.notEqual(hashSeed('abc'), hashSeed('abd'));
  for (let i = 0; i < 200; i++) {
    const v = hash2d(i, i * 3, 1);
    assert.ok(v >= 0 && v < 1);
    assert.equal(v, hash2d(i, i * 3, 1));
  }
  assert.notEqual(hash2d(1, 2, 0), hash2d(2, 1, 0));
});
