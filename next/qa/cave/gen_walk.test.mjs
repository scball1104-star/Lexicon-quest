// Walkability of generated floors (DEEP_STACKS_PLAN 4): on 200 seeds across B1, B9, B10, B19, B20, B35 and B99 the
// generator never throws, and by its own walk model the stair, every chest and every foe are reachable from the arrival.
// Twenty of them are cross-checked with tools/maps/mapcheck.mjs (the real tiles.json collision, the hand maps' walker),
// and the stairs target lands on walkable ground of the next floor.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateFloor, walkModel, CaveGenError } from '../../src/data/cave/gen.js';
import { loadDb, walk, buildGrid } from '../../tools/maps/mapcheck.mjs';
import { SEEDS, FLOORS, pairFor } from './gen_helpers.mjs';

test('200 seeds x 7 floors: zero throws, stair, chests and foes reachable in the generator walk model', () => {
  let floors = 0, chests = 0, foes = 0;
  for (const seed of SEEDS) {
    for (const floor of FLOORS) {
      let m;
      try { m = generateFloor(seed, floor); } catch (e) { assert.fail(`seed ${seed} B${floor} threw ${e instanceof CaveGenError ? 'CaveGenError' : e.name}: ${e.message}`); }
      const w = walkModel(m);
      const st = m.events.find((e) => e.id === 'stairs_down');
      assert.ok(w.reached(st.x, st.y), `seed ${seed} B${floor}: stair at ${st.x},${st.y} unreachable`);
      for (const e of m.events) {
        if (e.type === 'chest') { chests++; assert.ok(w.touchable(e.x, e.y), `seed ${seed} B${floor}: chest ${e.id} unreachable`); }
        if (e.type === 'enemy') { foes++; assert.ok(w.reached(e.x, e.y), `seed ${seed} B${floor}: foe ${e.id} unreachable`); }
      }
      for (const [name, [x, y]] of Object.entries(m.marks)) assert.ok(w.reached(x, y) || w.touchable(x, y), `seed ${seed} B${floor}: mark ${name} unreachable`);
      floors++;
    }
  }
  assert.equal(floors, SEEDS.length * FLOORS.length);
  assert.ok(chests >= floors * 2 && foes >= floors * 3, `chests ${chests} foes ${foes}`);
});

test('mapcheck cross-check on 20 floors: the hand-map walker agrees and no floor cell the generator opens is solid for it', async () => {
  const db = await loadDb();
  let n = 0;
  for (let i = 0; i < 20; i++) {
    const seed = SEEDS[i * 7 % SEEDS.length], floor = FLOORS[i % FLOORS.length];
    const { a, maps } = pairFor(seed, floor, db);
    const m = maps[a.id];
    const r = walk(m, db);
    assert.ok(!r.error, `seed ${seed} B${floor}: ${r.error}`);
    assert.deepEqual(r.errors, [], `seed ${seed} B${floor}: grid errors`);
    const reached = Object.fromEntries(r.events.map((e) => [e.id, e.reached]));
    for (const e of m.events) if (['door', 'chest', 'enemy', 'sign'].includes(e.type)) assert.ok(reached[e.id], `seed ${seed} B${floor}: mapcheck cannot reach ${e.id}`);
    for (const mk of r.marks) assert.ok(mk.reached, `seed ${seed} B${floor}: mapcheck cannot reach mark ${mk.name}`);
    // the two walk models agree cell by cell on what is floor (the generator's model never opens a cell tiles.json makes solid)
    const g = buildGrid(m, db);
    const w = walkModel(a);
    for (let y = 0; y < g.H; y++) for (let x = 0; x < g.W; x++) {
      if (w.open[y][x]) assert.equal(g.code[y][x], 'none', `seed ${seed} B${floor}: generator opens ${x},${y} but tiles.json says ${g.code[y][x]} (${g.why[y][x]})`);
    }
    n++;
  }
  assert.equal(n, 20);
});

test('the stairs target of every floor is walkable floor on the next floor (mapcheck grid), 30 pairs', async () => {
  const db = await loadDb();
  for (let i = 0; i < 30; i++) {
    const seed = SEEDS[(i * 13) % SEEDS.length], floor = [1, 5, 9, 10, 19, 20, 29, 35, 50, 98][i % 10];
    const { a, b, maps } = pairFor(seed, floor, db);
    const st = a.events.find((e) => e.id === 'stairs_down');
    const g = buildGrid(maps[b.id], db);
    assert.equal(g.code[st.to[2]][st.to[1]], 'none', `seed ${seed} B${floor} -> B${floor + 1} lands on ${g.code[st.to[2]][st.to[1]]}`);
  }
});
