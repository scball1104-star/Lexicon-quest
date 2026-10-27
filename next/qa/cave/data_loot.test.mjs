// C1-data: the Deep Stacks' loot (src/data/cave/loot.js): item level and rarity by depth, consumables by band, loot zones, the
// Bookmark odds, red and blue chests, the pity rule and the Binder's drop (docs/DEEP_STACKS_PLAN.md 2.5, 2.6, 4, 6).
import test from 'node:test';
import assert from 'node:assert/strict';
import register from '../../src/data/cave/index.js';
import * as L from '../../src/data/cave/loot.js';
import { CAVE_UNIQUE_IDS, CAVE_UNIQUES, BINDER_QUILL_ID, uniquesOfBand } from '../../src/data/cave/items.js';
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
  assert.equal(L.bookmarkChance(5, { props: ['gold_double'] }), 0.04);
  assert.ok(L.bookmarkChance(99, { props: ['bookmark_twice'] }) <= 0.5);
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

test('red chests: gear or consumables every time, gold in range, the Bookmark at its odds, weapons first on B1 to B5', () => {
  const rng = createRng(11);
  let gear = 0, weapons = 0, marks = 0, cons = 0;
  const N = 600;
  for (let i = 0; i < N; i++) {
    const r = L.rollRedChest(rng, 1, [], {});
    assert.ok(r.items.length + r.consumables.length > 0, 'never empty');
    assert.ok(r.items.length <= 1);
    const [g0, g1] = L.goldAt(1);
    assert.ok(r.gold >= g0 && r.gold <= g1, `gold ${r.gold}`);
    for (const it of r.items) { assert.ok(EQUIPMENT[it.base], it.base); assert.equal(it.ilvl, 1); if (EQUIPMENT[it.base].slot === 'weapon') weapons++; }
    for (const c of r.consumables) { assert.ok(CONSUMABLES[c.item]); assert.ok(c.qty >= 1 && c.qty <= 4); }
    gear += r.items.length; cons += r.consumables.length ? 1 : 0;
    if (r.bookmark) marks++;
  }
  assert.ok(gear / N > 0.5 && gear / N < 0.7, `gear share ${gear / N}`);
  assert.ok(weapons / gear > 0.45, `weapons ${weapons} of ${gear} gear on B1`);
  assert.ok(marks / N > 0.01 && marks / N < 0.08, `bookmarks ${marks / N}`);
  assert.equal(gear + cons, N, 'gear or consumables, never both');
  // deeper: ilvl follows the floor, slots are the engine's own weights, more consumables of the band
  const deep = L.rollRedChest(createRng(3), 70, [], {});
  if (deep.items.length) assert.equal(deep.items[0].ilvl, L.itemLevel(70));
  let deepMarks = 0;
  for (let i = 0; i < N; i++) if (L.rollRedChest(rng, 70, [], {}).bookmark) deepMarks++;
  assert.ok(deepMarks / N > 0.07 && deepMarks / N < 0.18, `deep bookmarks ${deepMarks / N}`);
});

test('red chests honour the props and the landing rule', () => {
  const a = L.rollRedChest(createRng(5), 40, []), b = L.rollRedChest(createRng(5), 40, [], { props: ['gold_double'] });
  assert.equal(b.gold, a.gold * 2);
  assert.deepEqual(b.items, a.items);
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

test('blue chests: one unique not held, never the Quill, weighted to the band, null when the vault is full; exclude this run\'s finds', () => {
  const rng = createRng(21);
  const N = 3000;
  const tally = (floor, held = []) => { const c = {}; for (let i = 0; i < N; i++) { const id = L.rollBlueChest(rng, floor, held); c[id] = (c[id] || 0) + 1; } return c; };
  const b5 = tally(5);
  for (const id of Object.keys(b5)) { assert.ok(CAVE_UNIQUE_IDS.includes(id), id); assert.notEqual(id, BINDER_QUILL_ID); }
  const share = (c, k) => uniquesOfBand(k).reduce((s, id) => s + (c[id] || 0), 0) / N;
  assert.ok(share(b5, 1) > 0.5, `band 1 share on B5: ${share(b5, 1)}`);
  assert.ok(share(b5, 5) < 0.12, `band 5 share on B5: ${share(b5, 5)}`);
  const b85 = tally(85);
  assert.ok(share(b85, 5) > 0.45, `band 5 share on B85: ${share(b85, 5)}`);
  assert.equal(L.rollBlueChest(rng, 10, CAVE_UNIQUE_IDS), null);
  const held = CAVE_UNIQUE_IDS.slice(0, 15);
  for (let i = 0; i < 20; i++) assert.equal(L.rollBlueChest(rng, 50, held), CAVE_UNIQUE_IDS[15]);
  assert.equal(L.rollBlueChest(rng, 50, held, { exclude: [CAVE_UNIQUE_IDS[15]] }), null);
  assert.equal(L.rollBlueChest(createRng(4), 30, []), L.rollBlueChest(createRng(4), 30, []), 'deterministic for the same stream');
  assert.ok(L.vaultIncomplete([]) && !L.vaultIncomplete(CAVE_UNIQUE_IDS) && L.vaultIncomplete(held));
  for (const id of CAVE_UNIQUE_IDS) assert.ok(L.blueWeight(id, 1) > 0);
  assert.equal(L.blueWeight(BINDER_QUILL_ID, 90), 0);
});

test('the pity rule: a blue chest within ten floors, never two in a row, never on a landing or B100, only while the vault is short', () => {
  const never = () => 0.99, always = () => 0;
  assert.equal(L.blueChestDue(never, 11, 1), true, 'ten floors since the last');
  assert.equal(L.blueChestDue(never, 10, 0), false, 'a landing');
  assert.equal(L.blueChestDue(never, 10, 0, []), false);
  assert.equal(L.blueChestDue(always, 100, 80), false, 'B100');
  assert.equal(L.blueChestDue(always, 6, 5), false, 'two in a row');
  assert.equal(L.blueChestDue(always, 7, 5), true);
  assert.equal(L.blueChestDue(never, 9, 5), false);
  assert.equal(L.blueChestDue(always, 9, 5, CAVE_UNIQUE_IDS), false, 'the vault is full');
  let n = 0;
  const rng = createRng(2);
  for (let i = 0; i < 2000; i++) if (L.blueChestDue(rng, 25, 20)) n++;
  assert.ok(n / 2000 > 0.04 && n / 2000 < 0.1, `7% roll: ${n / 2000}`);
});

test('the Binder\'s drop is registered: the Quill, two boss rolls, feathers and ethers', () => {
  const b = BOSS_LOOT.binder;
  assert.ok(b && b.unique === BINDER_QUILL_ID && b.rolls === 2 && b.table === 'boss' && b.ilvl === 16);
  for (const c of b.consumables) assert.ok(CONSUMABLES[c.item] && c.qty > 0, c.item);
  assert.ok(ITEMS[BINDER_QUILL_ID] && CAVE_UNIQUES[BINDER_QUILL_ID].band === 0);
});
