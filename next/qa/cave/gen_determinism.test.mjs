// The Deep Stacks generator is deterministic: the same (seed, floor) gives byte-identical JSON on every run, whatever
// was generated before it, and the stairs of floor N land exactly on the arrival cell of floor N + 1 (DEEP_STACKS_PLAN 4).
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateFloor, arrivalOf, gridSize, bandOf } from '../../src/data/cave/gen.js';
import { SEEDS, FLOORS } from './gen_helpers.mjs';

const json = (m) => JSON.stringify(m);

test('200 (seed, floor) pairs: generating twice gives byte-identical JSON', () => {
  let n = 0;
  for (let i = 0; i < 200; i++) {
    const seed = SEEDS[i % SEEDS.length], floor = FLOORS[i % FLOORS.length];
    const a = json(generateFloor(seed, floor));
    const b = json(generateFloor(seed, floor));
    assert.equal(a, b, `seed ${seed} B${floor} differs between two runs`);
    n++;
  }
  assert.equal(n, 200);
});

test('order independence: a floor is the same whether its neighbours were generated first or not', () => {
  for (const seed of SEEDS.slice(0, 12)) {
    const fresh = json(generateFloor(seed, 7));
    generateFloor(seed, 8); generateFloor(seed, 6); generateFloor(seed + 1, 7);
    assert.equal(json(generateFloor(seed, 7)), fresh, `seed ${seed} B7 changed after generating neighbours`);
    // a different seed is a different floor
    assert.notEqual(json(generateFloor(seed + 1, 7)), fresh);
  }
});

test('the stairs of floor N land on floor N + 1 arrival cell, which is the start of that floor', () => {
  for (const seed of SEEDS.slice(0, 20)) {
    for (const floor of [1, 4, 9, 10, 19, 20, 34, 59, 98]) {
      const a = generateFloor(seed, floor);
      const st = a.events.find((e) => e.id === 'stairs_down');
      assert.ok(st && st.type === 'door' && st.kind === 'stairs', `seed ${seed} B${floor} has a stairs_down door`);
      assert.deepEqual(st.to[0], `cave_b${floor + 1}`);
      assert.deepEqual(st.to.slice(1, 3), arrivalOf(seed, floor + 1), `seed ${seed} B${floor} stairs target is B${floor + 1}'s arrival`);
      const b = generateFloor(seed, floor + 1);
      assert.deepEqual([b.start.x, b.start.y], st.to.slice(1, 3));
      assert.deepEqual(b.marks.arrival, st.to.slice(1, 3));
      assert.equal(st.to[3], 'down');
    }
  }
});

test('ids, names, bands and sizes follow the contract', () => {
  for (const seed of SEEDS.slice(0, 5)) {
    for (const floor of [1, 19, 20, 39, 40, 59, 60, 79, 80, 99]) {
      const m = generateFloor(seed, floor);
      assert.equal(m.id, `cave_b${floor}`);
      assert.equal(m.band, bandOf(floor).id);
      assert.equal(m.name, `${bandOf(floor).name}, B${floor}`);
      assert.equal(m.area, 'dungeon');
      assert.equal(m.floor, floor);
      if (!m.landing) {
        const [W, H] = gridSize(floor);
        assert.equal(m.ground[0].length, W); assert.equal(m.ground.length, H);
      }
    }
  }
  assert.deepEqual(gridSize(1), [40, 30]);
  assert.deepEqual(gridSize(99), [56, 40]);
  assert.throws(() => generateFloor(1, 100), /B100/);
  assert.throws(() => generateFloor(1, 0));
});
