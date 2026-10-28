// C4-uniques: what a reading finds. The blue floors come from world.js blueFloors (the pity rule, the plan's 7% roll and the
// second roll, decided per reading up front, as the game does it) and each blue chest from loot.js rollBlueChest on the chest's
// own rng (world.js chestRng, the id the generator gives it), so these numbers are the game's, not a model. Scott (plan 13 E):
// weak uniques likely shallow and strong ones likely deep, and enough to equip the party several times over; the brief: twelve to
// fifteen uniques in a careful deep reading, all sixty seen in about five.
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.LQ_CAVE_ON = true;
const { ensurePack } = await import('../../src/game/packs.js');
await ensurePack('cave', { quiet: true, warm: false });
const W = await import('../../src/data/cave/world.js');
const L = await import('../../src/data/cave/loot.js');
const { CAVE_UNIQUES, CAVE_UNIQUE_IDS } = await import('../../src/data/cave/items.js');
const { isLanding } = await import('../../src/data/cave/foes.js');
const { hashSeed } = await import('../../src/core/rng.js');

const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
/** One reading to B99 (or `upTo`): its blue floors and what each blue chest gives, the vault fixed at the reading's start. */
function reading(seed, vault = [], upTo = 99) {
  const floors = [...W.blueFloors(seed, vault)].filter((f) => f <= upTo).sort((a, b) => a - b);
  const found = [];
  for (const f of floors) {
    const id = L.rollBlueChest(W.chestRng(seed, f, 'blue_chest'), f, vault, { exclude: found });
    if (id) found.push(id);
  }
  return { floors, found };
}

test('a deep reading finds twelve to fifteen uniques; the first blue by B9 and none more than ten floors after the last', () => {
  const N = 300;
  const runs = Array.from({ length: N }, (_, i) => reading(i + 1));
  const counts = runs.map((r) => r.found.length);
  const m = mean(counts);
  assert.ok(m >= 12 && m <= 15, `a deep reading finds ${m.toFixed(2)} on average`);
  const sorted = counts.slice().sort((a, b) => a - b);
  assert.ok(sorted[Math.floor(N * 0.1)] >= 11 && sorted[Math.floor(N * 0.9)] <= 17, `p10 ${sorted[Math.floor(N * 0.1)]}, p90 ${sorted[Math.floor(N * 0.9)]}`);
  for (const r of runs) {
    assert.ok(r.floors[0] <= 9, `the first blue on B${r.floors[0]}`);
    let last = 0;
    for (const f of r.floors) {
      assert.ok(!isLanding(f) && f < 100);
      if (last) assert.ok(f - last >= 2 && f - last <= 10, `B${last} then B${f}`);
      last = f;
    }
    assert.equal(r.found.length, r.floors.length, 'every blue chest of a first reading gives a unique');
    assert.equal(new Set(r.found).size, r.found.length, 'never the same unique twice in a reading');
  }
  // the deep floors carry more of them than the shallow ones (the second roll rises with depth)
  const per = (a, b) => mean(runs.map((r) => r.floors.filter((f) => f >= a && f <= b).length));
  assert.ok(per(70, 99) > per(1, 30) + 0.5, `B1-B30 ${per(1, 30).toFixed(2)}, B70-B99 ${per(70, 99).toFixed(2)}`);
});

test('the odds turn over with depth: shallow blue chests are mostly Lesser and rarely Named, deep ones mostly Named and rarely Lesser', () => {
  const tally = { shallow: { 1: 0, 2: 0, 3: 0 }, mid: { 1: 0, 2: 0, 3: 0 }, deep: { 1: 0, 2: 0, 3: 0 } };
  for (let s = 1; s <= 300; s++) {
    const r = reading(s);
    r.floors.forEach((f, i) => {
      const id = r.found[i];
      const band = f <= 29 ? 'shallow' : f <= 69 ? 'mid' : 'deep';
      tally[band][CAVE_UNIQUES[id].grade]++;
    });
  }
  const share = (b, g) => tally[b][g] / (tally[b][1] + tally[b][2] + tally[b][3]);
  assert.ok(share('shallow', 1) > 0.6 && share('shallow', 3) < 0.08, `B1-B29: Lesser ${share('shallow', 1).toFixed(2)}, Named ${share('shallow', 3).toFixed(2)}`);
  assert.ok(share('deep', 3) > 0.55 && share('deep', 1) < 0.1, `B70-B99: Named ${share('deep', 3).toFixed(2)}, Lesser ${share('deep', 1).toFixed(2)}`);
  assert.ok(share('mid', 2) > share('shallow', 2) - 0.05 && share('mid', 3) > share('shallow', 3) && share('mid', 1) < share('shallow', 1));
});

test('all sixty are seen in about five deep readings, each banked; a full vault places no more blue chests', () => {
  const needed = [];
  for (let g = 1; g <= 40; g++) {
    let vault = [];
    let n = 0;
    while (vault.length < CAVE_UNIQUE_IDS.length && n < 20) {
      n++;
      const r = reading(hashSeed(`c4:${g}:reading:${n}`), vault);
      vault = [...vault, ...r.found];
    }
    assert.equal(new Set(vault).size, vault.length, 'the vault never holds a unique twice');
    needed.push(n);
    assert.deepEqual([...W.blueFloors(hashSeed(`c4:${g}:reading:${n + 1}`), vault)], [], 'a complete vault: no blue chest');
  }
  needed.sort((a, b) => a - b);
  const median = needed[Math.floor(needed.length / 2)];
  assert.ok(median >= 4 && median <= 6, `deep readings to see all sixty: median ${median} (${needed.join(' ')})`);
  assert.ok(needed[needed.length - 1] <= 7, `the slowest ${needed[needed.length - 1]}`);
});

test('a first reading banked at B10 or B30 keeps something, and the shallow finds can dress a party (the Lesser set fills slots early)', () => {
  let none10 = 0;
  const slots30 = [];
  for (let s = 1; s <= 300; s++) {
    if (!reading(s, [], 9).found.length) none10++;
    slots30.push(new Set(reading(s, [], 29).found.map((id) => CAVE_UNIQUES[id].slot)).size);
  }
  assert.equal(none10, 0, 'every reading finds a blue before the first landing (CRITIQUE_STACKS 9)');
  assert.ok(mean(slots30) >= 2.5, `by B29 a reading has filled ${mean(slots30).toFixed(2)} different slots`);
});
