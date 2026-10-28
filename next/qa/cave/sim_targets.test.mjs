// C3-sim-bot: the --cave check reads the plan's targets (docs/DEEP_STACKS_PLAN.md 11, the brief), the tuned curve is monotone
// where the plan says the Stacks get harder, and the Bookmark table is the plan's.
import test from 'node:test';
import assert from 'node:assert/strict';

const S = await import('../../tools/sim/cave.mjs');
const F = await import('../../src/data/cave/foes.js');
const L = await import('../../src/data/cave/loot.js');
const { ENEMIES } = await import('../../src/data/enemies.js');
const { createRng } = await import('../../src/core/rng.js');
const { EQUIPMENT } = await import('../../src/data/items.js');

test('the targets are the plan\'s: death rates per band, arrival levels with a drift of 4, the Binder', () => {
  const T = S.CAVE_TARGETS;
  assert.deepEqual(T.deaths.map((b) => [b.from, b.to, b.max]), [[1, 9, 0.05], [10, 29, 0.15], [30, 59, 0.30], [60, 99, 0.45]]);
  assert.deepEqual(T.arrival, [[10, 12], [30, 25], [60, 40], [90, 55]]);
  assert.equal(T.arrivalDrift, 4);
  assert.deepEqual(T.binder, { winMin: 0.8, roundsMax: 20 });
});

test('checkCave fails a band over its death rate, a drifted arrival and a slow Binder; passes a clean summary', () => {
  const band = (id, from, to, max, deathRate, entered = 50) => ({ id, from, to, max, deathRate, entered, died: Math.round(deathRate * entered) });
  const clean = {
    policy: 'competent', floors: 99,
    bands: [band('B1-B9', 1, 9, 0.05, 0.02), band('B10-B29', 10, 29, 0.15, 0.06), band('B30-B59', 30, 59, 0.3, 0.1), band('B60-B99', 60, 99, 0.45, 0.2)],
    arrival: [{ floor: 10, n: 50, mean: 11.4 }, { floor: 30, n: 40, mean: 24.8 }, { floor: 60, n: 40, mean: 40.6 }, { floor: 90, n: 30, mean: 56 }],
    binder: { within: 0.9 },
  };
  assert.deepEqual(S.checkCave(clean), []);
  const bad = JSON.parse(JSON.stringify(clean));
  bad.bands[0].deathRate = 0.06;
  bad.arrival[1].mean = 30;
  bad.binder.within = 0.7;
  const fails = S.checkCave(bad);
  assert.equal(fails.length, 3, fails.join('; '));
  assert.ok(fails[0].startsWith('B1-B9') && fails[1].startsWith('B30') && fails[2].startsWith('the Binder'));
  assert.deepEqual(S.checkCave({ ...bad, policy: 'naive' }), [], 'attack-only and reckless descents are printed, never checked');
  assert.ok(S.checkCave({ ...clean, binder: null }).some((f) => f.includes('no seed reached B100')));
});

test('the tuned curve: the Stacks get harder floor by floor in effective strength, the level curve climbs, the ease runs out', () => {
  const ttk = (id, elite) => ENEMIES[id].hp * (elite ? 2 : 1) * (24 + ENEMIES[id].def) / 24;
  const meanHp = (b) => b.pool.reduce((s, t) => s + t.weight * t.enemies.reduce((a, id, i) => a + ttk(id, t.elite && i === 0), 0) / t.enemies.length, 0) / b.pool.reduce((s, t) => s + t.weight, 0);
  let prevLv = 0;
  for (let f = 1; f <= 99; f++) {
    const lv = F.targetLevel(f);
    assert.ok(lv >= prevLv, `the level curve climbs at B${f}`);
    prevLv = lv;
  }
  // effective HP (multiplier x the band's mean time-to-kill) and effective power (multiplier x the band's mean ATK/MAG) by decade
  // a fallback band's group carries its own scale (scale(f, { template }), C4-fixes): the band's strength is the groups' weighted mean
  const eff = (f) => {
    const b = F.bandAt(f), W = b.pool.reduce((a, t) => a + t.weight, 0);
    const one = (t) => { const s = F.scale(f, t.own ? { template: t } : {}); return { hp: s.hp * meanHp({ pool: [t] }), power: s.power * t.enemies.reduce((x, id) => x + Math.max(ENEMIES[id].atk, ENEMIES[id].mag), 0) / t.enemies.length }; };
    return b.pool.reduce((a, t) => { const o = one(t); return { hp: a.hp + o.hp * t.weight / W, power: a.power + o.power * t.weight / W }; }, { hp: 0, power: 0 });
  };
  const decades = [5, 15, 25, 35, 45, 55, 65, 75, 85, 95].map(eff);
  for (let i = 1; i < decades.length; i++) {
    assert.ok(decades[i].power > decades[i - 1].power, `effective power rises decade ${i}`);
    assert.ok(decades[i].hp >= decades[i - 1].hp * 0.85, `effective HP holds decade ${i}`);
  }
  // the early ease rises to nothing by B`until`, every band ramp rises (never falls inside a band)
  for (const k of ['hp', 'power']) {
    assert.ok(F.earlyEase(1, k) <= 1 && F.earlyEase(F.EARLY_EASE.until, k) === 1 && F.earlyEase(99, k) === 1, k);
    for (let f = 2; f <= F.EARLY_EASE.until; f++) assert.ok(F.earlyEase(f, k) >= F.earlyEase(f - 1, k), `${k} ease at B${f}`);
  }
  for (const [k, row] of Object.entries(F.BAND_ADJUST)) for (const [key, v] of Object.entries(row)) {
    if (Array.isArray(v)) assert.ok(v.length === 2 && v[1] >= v[0], `band ${k} ${key} ramps up`);
    else assert.ok(v > 0 && v <= 2, `band ${k} ${key} ${v}`);
  }
  assert.ok(F.scale(99).speed <= F.SPEED_CAP && F.scale(1).hp >= 0.3);
});

test('the Bookmark table is the plan\'s, doubled by the prop, guaranteed on a landing, and turns up at those odds', () => {
  assert.deepEqual(L.BOOKMARK_CHANCE, [[1, 0.04], [10, 0.08], [30, 0.12]]);
  assert.deepEqual([1, 9, 10, 29, 30, 99].map((f) => L.bookmarkChance(f)), [0.04, 0.04, 0.08, 0.08, 0.12, 0.12]);
  assert.equal(L.bookmarkChance(12, { props: ['bookmark_twice'] }), 0.16);
  const rng = createRng(4);
  for (const [floor, p] of [[5, 0.04], [20, 0.08], [50, 0.12]]) {
    let n = 0;
    for (let i = 0; i < 4000; i++) if (L.rollRedChest(rng, floor, [], {}).bookmark) n++;
    assert.ok(Math.abs(n / 4000 - p) < 0.02, `B${floor}: ${n / 4000} vs ${p}`);
  }
  for (let i = 0; i < 40; i++) assert.ok(L.rollRedChest(createRng(i), 30, [], { landing: true, holdsBookmark: false }).bookmark);
});

test('the larder: early weapons lean to the start kinds, a landing adds its supply, no chest row holds more than four', () => {
  const rng = createRng(9);
  const kinds = {};
  for (let i = 0; i < 3000; i++) for (const it of L.rollRedChest(rng, 3, [], {}).items) {
    const b = EQUIPMENT[it.base];
    if (b.slot === 'weapon') kinds[b.type] = (kinds[b.type] || 0) + 1;
  }
  for (const k of ['sword', 'staff', 'spear', 'axe', 'bow']) assert.ok(kinds[k] > 0, `B3 lends a ${k}`);
  assert.ok(kinds.staff > kinds.bow * 2 && kinds.spear > kinds.axe * 2, JSON.stringify(kinds));
  const land = L.rollRedChest(createRng(1), 20, [], { landing: true, holdsBookmark: true });
  for (const c of L.landingSupply(20)) assert.ok((land.consumables.find((x) => x.item === c.item) || { qty: 0 }).qty >= c.qty, `the landing's ${c.item}`);
  for (let i = 0; i < 2000; i++) for (const c of L.rollRedChest(rng, 1 + (i % 99), [], {}).consumables) assert.ok(c.qty >= 1 && c.qty <= 4, `${c.item} x${c.qty}`);
});
