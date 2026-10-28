// C1-data: the Deep Stacks' loot (src/data/cave/loot.js): item level and rarity by depth, consumables by band, loot zones, the
// Bookmark odds, red and blue chests, the pity rule and the Binder's drop (docs/DEEP_STACKS_PLAN.md 2.5, 2.6, 4, 6). C4-uniques:
// the grade odds by floor, the grade-first blue roll, the second blue roll, the first blue by B9 and the new loot props.
import test from 'node:test';
import assert from 'node:assert/strict';
import register from '../../src/data/cave/index.js';
import * as L from '../../src/data/cave/loot.js';
import { CAVE_UNIQUE_IDS, CAVE_UNIQUES, BINDER_QUILL_ID, uniquesOfBand, uniquesOfGrade } from '../../src/data/cave/items.js';
import { ZONE_LOOT, BOSS_LOOT, RARITY_TABLES } from '../../src/data/loot-tables.js';
import { CONSUMABLES, EQUIPMENT, ITEMS } from '../../src/data/items.js';
import { rollItem } from '../../src/battle/loot.js';
import { createRng } from '../../src/core/rng.js';

await register();

test('item level: min(16, 1 + floor/6), whole numbers, never under 1', () => {
  assert.deepEqual([1, 5, 6, 11, 12, 29, 30, 59, 60, 89, 90, 99, 100].map(L.itemLevel), [1, 1, 2, 2, 3, 5, 6, 10, 11, 15, 16, 16, 16]);
  for (let f = 1; f <= 100; f++) assert.ok(Number.isInteger(L.itemLevel(f)) && L.itemLevel(f) >= L.itemLevel(f - 1 || 1));
});

test('rarity by depth: B1 is the normal table, B60 and deeper 30/45/22/3, monotone between, sums near 100', () => {
  assert.deepEqual(L.rarityAt(1), { common: 70, magic: 25, rare: 5, legendary: 0 });
  assert.deepEqual({ ...RARITY_TABLES.normal, legendary: 0 }, L.rarityAt(1));
  assert.deepEqual(L.rarityAt(60), { common: 30, magic: 45, rare: 22, legendary: 3 });
  assert.deepEqual(L.rarityAt(99), L.rarityAt(60));
  let prev = L.rarityAt(1);
  for (let f = 2; f <= 99; f++) {
    const w = L.rarityAt(f);
    assert.ok(w.common <= prev.common && w.rare >= prev.rare && w.legendary >= prev.legendary && w.magic >= prev.magic, `B${f}`);
    const sum = w.common + w.magic + w.rare + w.legendary;
    assert.ok(sum >= 98 && sum <= 102, `B${f} sums to ${sum}`);
    prev = w;
  }
  const up = L.shiftRarityUp(L.rarityAt(1));
  assert.deepEqual(up, { common: 0, magic: 70, rare: 25, legendary: 5 });
  // the engine downgrades a legendary roll to rare today (battle/loot.js): the deep legendary weight reads as rare
  for (let i = 0; i < 20; i++) assert.equal(rollItem(createRng(i), { ilvl: 16, rarity: 'legendary' }).rarity, 'rare');
});

test('consumables by band exist, and the Bookmark odds are 4 / 8 / 12% by depth, doubled by the prop, capped', () => {
  for (const f of [1, 19, 20, 39, 40, 59, 60, 79, 80, 99]) {
    const t = L.consumablesAt(f);
    assert.ok(t.length >= 4);
    for (const c of t) { assert.ok(CONSUMABLES[c.item], `B${f} ${c.item}`); assert.ok(c.weight > 0); }
  }
  assert.deepEqual(Object.keys(L.CONSUMABLES_BY_BAND), ['1', '2', '3', '4', '5']);
  assert.deepEqual([1, 9, 10, 29, 30, 99].map((f) => L.bookmarkChance(f)), [0.04, 0.04, 0.08, 0.08, 0.12, 0.12]);
  assert.equal(L.bookmarkChance(30, { props: ['bookmark_twice'] }), 0.24);
  assert.equal(L.bookmarkChance(30, { props: ['bookmark_more'] }), 0.18, 'half again');
  assert.equal(L.bookmarkChance(30, { props: ['bookmark_more', 'bookmark_twice'] }), 0.36, 'both: three times');
  assert.equal(L.bookmarkChance(5, { props: ['larder', 'larder_1', 'lent_more', 'feather_find', 'red_rarity_up'] }), 0.04, 'the other loot props leave it alone');
  assert.ok(L.bookmarkChance(99, { props: ['bookmark_twice', 'bookmark_more'] }) <= 0.5);
});

test('loot zones: cave_band_1..5 on ZONE_LOOT at the band\'s first item level; setLootFloor follows the floor', () => {
  for (const [k, first] of [[1, 1], [2, 20], [3, 40], [4, 60], [5, 80]]) {
    const z = ZONE_LOOT[`cave_band_${k}`];
    assert.ok(z && z.cave && z.equipChance > 0.1 && z.equipChance <= 0.2, `cave_band_${k}`);
    assert.equal(z.ilvl, L.itemLevel(first));
  }
  assert.equal(L.setLootFloor(35), 'cave_band_2');
  assert.equal(ZONE_LOOT.cave_band_2.ilvl, L.itemLevel(35));
  L.setLootFloor(20);
  assert.equal(ZONE_LOOT.cave_band_2.ilvl, L.itemLevel(20));
  assert.equal(L.setLootFloor(100), 'cave_boss');
  assert.ok(!ZONE_LOOT.cave_boss, 'the boss floor has no drop zone of its own');
  assert.equal(ZONE_LOOT.valley.ilvl, 2, 'the main game\'s zones are untouched');
});

test('red chests: gear or consumables every time, no gold, the Bookmark at its odds, weapons first on B1 to B5', () => {
  const rng = createRng(11);
  let gear = 0, weapons = 0, marks = 0, cons = 0;
  const N = 600;
  for (let i = 0; i < N; i++) {
    const r = L.rollRedChest(rng, 1, [], {});
    assert.ok(r.items.length + r.consumables.length > 0, 'never empty');
    assert.ok(r.items.length <= 1);
    assert.equal(r.gold, 0, 'no gold in the Stacks (C4-fixes, CRITIQUE_STACKS 15): a gear chest may carry a supply instead');
    for (const it of r.items) { assert.ok(EQUIPMENT[it.base], it.base); assert.equal(it.ilvl, 1); if (EQUIPMENT[it.base].slot === 'weapon') weapons++; }
    for (const c of r.consumables) { assert.ok(CONSUMABLES[c.item]); assert.ok(c.qty >= 1 && c.qty <= 4); }
    gear += r.items.length; cons += r.consumables.length && !r.items.length ? 1 : 0;
    if (r.bookmark) marks++;
  }
  assert.ok(gear / N > 0.5 && gear / N < 0.7, `gear share ${gear / N}`);
  assert.ok(weapons / gear > 0.45, `weapons ${weapons} of ${gear} gear on B1`);
  assert.ok(marks / N > 0.01 && marks / N < 0.08, `bookmarks ${marks / N}`);
  assert.equal(gear + cons, N, 'gear (with a supply at GEAR_CHEST_SUPPLY) or consumables');
  // deeper: ilvl follows the floor, slots are the engine's own weights, more consumables of the band
  const deep = L.rollRedChest(createRng(3), 70, [], {});
  if (deep.items.length) assert.equal(deep.items[0].ilvl, L.itemLevel(70));
  let deepMarks = 0;
  for (let i = 0; i < N; i++) if (L.rollRedChest(rng, 70, [], {}).bookmark) deepMarks++;
  assert.ok(deepMarks / N > 0.07 && deepMarks / N < 0.18, `deep bookmarks ${deepMarks / N}`);
});

test('red chests honour the props and the landing rule', () => {
  // a prop that is not a loot prop changes nothing: the rng is drawn exactly as with none
  for (let i = 0; i < 40; i++) assert.deepEqual(L.rollRedChest(createRng(i), 40, [], { props: ['stairs_sense', 'first_blow_true'] }), L.rollRedChest(createRng(i), 40, []));
  // larder: a chest of supplies makes one more roll (same gold, same gear chance)
  let plain = 0, stocked = 0, supply = 0;
  for (let i = 0; i < 400; i++) {
    const a = L.rollRedChest(createRng(1000 + i), 40, []), b = L.rollRedChest(createRng(1000 + i), 40, [], { props: ['larder'] });
    assert.equal(b.gold, a.gold); assert.equal(b.items.length, a.items.length);
    if (a.consumables.length) { supply++; plain += a.consumables.reduce((s, c) => s + c.qty, 0); stocked += b.consumables.reduce((s, c) => s + c.qty, 0); }
  }
  assert.ok(supply > 100 && stocked > plain * 1.25, `larder: ${stocked} against ${plain} in ${supply} supply chests`);
  // larder_1 (Warm Larder): one more roll half the time, so between none and Kept Stores
  let warm = 0;
  for (let i = 0; i < 400; i++) { const c = L.rollRedChest(createRng(1000 + i), 40, [], { props: ['larder_1'] }); if (c.consumables.length) warm += c.consumables.reduce((s, x) => s + x.qty, 0); }
  assert.ok(warm > plain * 1.08 && warm < stocked, `larder_1: ${warm} between ${plain} and ${stocked}`);
  assert.equal(L.LARDER_1, 0.5);
  // feather_find (Carried Out): Phoenix Feathers three times as likely in a supply roll
  const feathers = (props) => { let n = 0; for (let i = 0; i < 1500; i++) for (const c of L.rollRedChest(createRng(9000 + i), 25, [], { props }).consumables) if (c.item === 'phoenix_feather') n += c.qty; return n; };
  const f0 = feathers([]), f1 = feathers(['feather_find']);
  assert.ok(f1 > f0 * 2, `feather_find: ${f1} Feathers against ${f0}`);
  // lent_more: gear more often
  assert.equal(L.redEquipChance(40, { props: ['lent_more'] }), L.redEquipChance(40) + L.LENT_MORE);
  assert.ok(L.redEquipChance(1, { props: ['lent_more'] }) <= 0.8);
  let g0 = 0, g1 = 0;
  for (let i = 0; i < 600; i++) { if (L.rollRedChest(createRng(5000 + i), 40, []).items.length) g0++; if (L.rollRedChest(createRng(5000 + i), 40, [], { props: ['lent_more'] }).items.length) g1++; }
  assert.ok(g1 > g0 + 50, `lent_more: ${g1} against ${g0} of 600`);
  let commons = 0, n = 0;
  const rng = createRng(9);
  for (let i = 0; i < 400; i++) { const r = L.rollRedChest(rng, 1, [], { props: ['red_rarity_up'] }); for (const it of r.items) { n++; if (it.rarity === 'common') commons++; } }
  assert.ok(n > 100 && commons === 0, `red_rarity_up: ${commons} commons of ${n}`);
  let always = true;
  for (let i = 0; i < 50; i++) if (!L.rollRedChest(createRng(i), 20, [], { landing: true, holdsBookmark: false }).bookmark) always = false;
  assert.ok(always, 'a landing lends a Bookmark to a party that has none');
  let some = 0;
  for (let i = 0; i < 200; i++) if (L.rollRedChest(createRng(i), 20, [], { landing: true, holdsBookmark: true }).bookmark) some++;
  assert.ok(some < 40, 'with one in hand the landing rolls the ordinary odds');
});

test('blue chests: a grade by floor, then one unique of it not held, never the Quill, weighted to the band; null when the vault is full; exclude this run\'s finds', () => {
  const rng = createRng(21);
  const N = 3000;
  const tally = (floor, held = []) => { const c = {}; for (let i = 0; i < N; i++) { const id = L.rollBlueChest(rng, floor, held); c[id] = (c[id] || 0) + 1; } return c; };
  const share = (c, k) => uniquesOfBand(k).reduce((s, id) => s + (c[id] || 0), 0) / N;
  const gshare = (c, g) => uniquesOfGrade(g).reduce((s, id) => s + (c[id] || 0), 0) / N;
  const b5 = tally(5);
  for (const id of Object.keys(b5)) { assert.ok(CAVE_UNIQUE_IDS.includes(id), id); assert.notEqual(id, BINDER_QUILL_ID); }
  assert.ok(share(b5, 1) > 0.65, `band 1 share on B5: ${share(b5, 1)}`);
  assert.ok(share(b5, 5) < 0.12, `band 5 share on B5: ${share(b5, 5)}`);
  const w5 = L.gradeOdds(5);
  for (const g of [1, 2, 3]) assert.ok(Math.abs(gshare(b5, g) - w5[g] / 100) < 0.03, `grade ${g} on B5: ${gshare(b5, g)} against ${w5[g]}%`);
  const b85 = tally(85);
  assert.ok(share(b85, 5) > 0.42, `band 5 share on B85: ${share(b85, 5)}`);
  const w85 = L.gradeOdds(85);
  for (const g of [1, 2, 3]) assert.ok(Math.abs(gshare(b85, g) - w85[g] / 100) < 0.03, `grade ${g} on B85: ${gshare(b85, g)} against ${w85[g]}%`);
  assert.ok(gshare(b5, 1) > 0.75 && gshare(b5, 3) < 0.03 && gshare(b85, 3) > 0.6 && gshare(b85, 1) < 0.1, 'the odds turn over with depth');
  assert.equal(L.rollBlueChest(rng, 10, CAVE_UNIQUE_IDS), null);
  const last = CAVE_UNIQUE_IDS[CAVE_UNIQUE_IDS.length - 1];
  const held = CAVE_UNIQUE_IDS.filter((id) => id !== last);
  for (const f of [1, 50, 99]) for (let i = 0; i < 20; i++) assert.equal(L.rollBlueChest(rng, f, held), last, `the one left, on B${f}`);
  assert.equal(L.rollBlueChest(rng, 50, held, { exclude: [last] }), null);
  // an emptied grade falls to the nearest grade with something left (a tie goes to the grade the floor favours)
  const noNamed = uniquesOfGrade(3);
  for (let i = 0; i < 200; i++) assert.notEqual(CAVE_UNIQUES[L.rollBlueChest(rng, 95, noNamed)].grade, 3);
  const deepNoNamed = tally(95, noNamed);
  assert.ok(gshare(deepNoNamed, 2) > 0.85, `B95 with every Named held: Greater ${gshare(deepNoNamed, 2)}`);
  const noGreater = uniquesOfGrade(2);
  const mid = tally(60, noGreater);
  assert.ok(gshare(mid, 3) > gshare(mid, 1), 'a Greater roll with every Greater held goes to the grade B60 favours (Named over Lesser)');
  assert.equal(L.rollBlueChest(createRng(4), 30, []), L.rollBlueChest(createRng(4), 30, []), 'deterministic for the same stream');
  assert.ok(L.vaultIncomplete([]) && !L.vaultIncomplete(CAVE_UNIQUE_IDS) && L.vaultIncomplete(held));
  for (const id of CAVE_UNIQUE_IDS) assert.ok(L.blueWeight(id, 1) > 0);
  assert.equal(L.blueWeight(BINDER_QUILL_ID, 90), 0);
});

test('the grade odds: the brief\'s knots, linear between, summing to 100, Lesser falling and Named rising with depth', () => {
  assert.deepEqual(L.GRADE_ODDS.map(([f]) => f), [1, 20, 40, 60, 80, 99]);
  assert.deepEqual(L.gradeOdds(1), { 1: 85, 2: 14, 3: 1 });
  assert.deepEqual(L.gradeOdds(99), { 1: 3, 2: 17, 3: 80 });
  assert.deepEqual(L.gradeOdds(100), L.gradeOdds(99));
  assert.deepEqual(L.gradeOdds(60), { 1: 18, 2: 42, 3: 40 });
  assert.deepEqual(L.gradeOdds(30), { 1: 47.5, 2: 39, 3: 13.5 });
  let prev = L.gradeOdds(1);
  for (let f = 2; f <= 99; f++) {
    const w = L.gradeOdds(f);
    assert.ok(Math.abs(w[1] + w[2] + w[3] - 100) < 0.2, `B${f}`);
    assert.ok(w[1] <= prev[1] && w[3] >= prev[3], `B${f}: Lesser never rises, Named never falls`);
    prev = w;
  }
  // the turn: Lesser leads to about B40, Named leads from about B60
  assert.ok(L.gradeOdds(35)[1] > L.gradeOdds(35)[3] && L.gradeOdds(65)[3] > L.gradeOdds(65)[1]);
  const rng = createRng(77);
  const c = { 1: 0, 2: 0, 3: 0 };
  for (let i = 0; i < 4000; i++) c[L.rollGrade(rng, 80)]++;
  assert.ok(Math.abs(c[3] / 4000 - 0.65) < 0.03 && Math.abs(c[1] / 4000 - 0.07) < 0.02, JSON.stringify(c));
});

test('the pity rule: the first blue by B9, then within ten floors, never two in a row, never on a landing or B100, only while the vault is short; the second roll rises with depth', () => {
  const never = () => 0.99, always = () => 0;
  assert.equal(L.blueChestDue(never, 9, 0), true, 'the first blue by B9 (the first landing always has one to bank)');
  assert.equal(L.blueChestDue(never, 8, 0), false);
  assert.equal(L.blueChestDue(never, 11, 1), true, 'ten floors since the last');
  assert.equal(L.blueChestDue(never, 10, 1), false);
  assert.equal(L.blueChestDue(never, 10, 0), false, 'a landing');
  assert.equal(L.blueChestDue(never, 10, 0, []), false);
  assert.equal(L.blueChestDue(always, 100, 80), false, 'B100');
  assert.equal(L.blueChestDue(always, 6, 5), false, 'two in a row');
  assert.equal(L.blueChestDue(always, 7, 5), true);
  assert.equal(L.blueChestDue(never, 9, 5), false);
  assert.equal(L.blueChestDue(always, 9, 5, CAVE_UNIQUE_IDS), false, 'the vault is full');
  const odds = (floor) => { let n = 0; const rng = createRng(2 + floor); for (let i = 0; i < 4000; i++) if (L.blueChestDue(rng, floor, floor - 5)) n++; return n / 4000; };
  const p = (f) => 1 - (1 - L.BLUE_CHANCE) * (1 - L.secondBlueChance(f));
  for (const f of [3, 25, 55, 95]) assert.ok(Math.abs(odds(f) - p(f)) < 0.02, `B${f}: ${odds(f)} against ${p(f)}`);
  assert.equal(L.secondBlueChance(1), 0); assert.equal(L.secondBlueChance(99), 0.1);
  assert.ok(L.secondBlueChance(50) > 0.04 && L.secondBlueChance(50) < 0.06);
  assert.ok(odds(95) > odds(25) + 0.04, 'deeper floors carry more blue chests');
});

test('the Binder\'s drop is registered: the Quill, two boss rolls, feathers and ethers', () => {
  const b = BOSS_LOOT.binder;
  assert.ok(b && b.unique === BINDER_QUILL_ID && b.rolls === 2 && b.table === 'boss' && b.ilvl === 16);
  for (const c of b.consumables) assert.ok(CONSUMABLES[c.item] && c.qty > 0, c.item);
  assert.ok(ITEMS[BINDER_QUILL_ID] && CAVE_UNIQUES[BINDER_QUILL_ID].band === 0);
});
