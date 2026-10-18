// Loot: affix validity, rarity distribution, names, uniques and sets, drop rules, chests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../../src/battle/rules.js';
import { rollItem, rollRarity, baseOf, affixAllowed, itemStats, makeUnique, setBonuses, rollBattleDrops, rollChest,
  itemName, describeItem, itemValue, toInstance } from '../../src/battle/loot.js';
import { AFFIXES, UNIQUES, RARITIES, EQUIPMENT } from '../../src/data/items.js';
import { RARITY_TABLES, AFFIX_COUNTS } from '../../src/data/loot-tables.js';

test('every rolled affix is legal for its base, tier and item level, with an in-range value', () => {
  const rng = makeRng(7);
  for (let i = 0; i < 3000; i++) {
    const ilvl = 1 + (i % 9);
    const it = rollItem(rng, { ilvl, table: i % 3 === 0 ? 'elite' : 'normal' });
    const base = baseOf(it);
    assert.ok(base, 'base exists');
    assert.ok(base.ilvl <= Math.max(1, ilvl) || EQUIPMENT[base.id], 'base within item level');
    const counts = AFFIX_COUNTS[it.rarity];
    assert.ok(it.affixes.length <= counts.max, `${it.rarity} has ${it.affixes.length} affixes`);
    const ids = new Set(), stats = new Set();
    let pre = 0, suf = 0;
    for (const a of it.affixes) {
      const def = AFFIXES[a.id];
      assert.ok(def, `affix ${a.id}`);
      assert.ok(affixAllowed(a.id, base), `${a.id} not allowed on ${base.id}`);
      const tier = def.tiers[a.tier - 1];
      assert.ok(tier && ilvl >= tier[0], `tier ${a.tier} needs ilvl ${tier && tier[0]}`);
      assert.ok(a.value >= tier[1] && a.value <= tier[2], `${a.id} value ${a.value}`);
      assert.ok(!ids.has(a.id) && !stats.has(def.stat), 'no duplicate affix or stat');
      ids.add(a.id); stats.add(def.stat);
      if (def.kind === 'prefix') pre++; else suf++;
    }
    assert.ok(pre <= counts.prefix && suf <= counts.suffix);
    if (it.rarity === 'magic') assert.ok(it.affixes.length >= 1);
  }
});

test('rarity rolls follow the table weights', () => {
  const rng = makeRng(11);
  const n = 20000;
  for (const [table, weights] of Object.entries(RARITY_TABLES)) {
    const counts = {};
    for (let i = 0; i < n; i++) { const r = rollRarity(rng, table); counts[r] = (counts[r] || 0) + 1; }
    const total = Object.values(weights).reduce((s, w) => s + w, 0);
    for (const [r, w] of Object.entries(weights)) {
      const got = (counts[r] || 0) / n, want = w / total;
      assert.ok(Math.abs(got - want) < 0.015, `${table}.${r}: ${got.toFixed(3)} vs ${want.toFixed(3)}`);
      assert.ok(RARITIES[r], `rarity ${r} defined`);
    }
  }
});

test('names: magic items read "Prefix Base Suffix", rares get two-word names', () => {
  const rng = makeRng(3);
  let magic = 0, rare = 0;
  for (let i = 0; i < 500; i++) {
    const it = rollItem(rng, { ilvl: 6, table: 'elite' });
    const base = baseOf(it);
    if (it.rarity === 'magic') {
      magic++;
      assert.ok(it.name.includes(base.name));
      for (const a of it.affixes) assert.ok(it.name.includes(AFFIXES[a.id].name), `${it.name} lacks ${AFFIXES[a.id].name}`);
    } else if (it.rarity === 'rare') {
      rare++;
      assert.equal(it.name.split(' ').length, 2, it.name);
    }
    assert.equal(itemName(it), it.name);
    assert.ok(describeItem(it).length >= 1);
    assert.ok(itemValue(it) > 0);
  }
  assert.ok(magic > 100 && rare > 50);
});

test('item stats sum base + affixes; uniques and the Wayfarer set work', () => {
  const it = { base: 'iron_pike', rarity: 'magic', ilvl: 5, affixes: [{ id: 'gleaming', tier: 2, value: 5 }, { id: 'of_embers', tier: 2, value: 14 }] };
  assert.deepEqual(itemStats(it), { atk: 19, def: 1, fireDmg: 14 });
  assert.deepEqual(itemStats('short_sword'), { atk: 6, crit: 2 });
  assert.equal(toInstance('short_sword').rarity, 'common');
  for (const id of Object.keys(UNIQUES)) {
    const u = makeUnique(id);
    assert.equal(u.rarity, UNIQUES[id].rarity);
    assert.ok(Object.keys(itemStats(u)).length >= 2);
  }
  assert.deepEqual(setBonuses([makeUnique('wayfarer_boots')]), {});
  assert.deepEqual(setBonuses([makeUnique('wayfarer_boots'), makeUnique('wayfarer_mantle')]), { spd: 1, startHaste: 2 });
});

test('drop rules: elites always drop magic or better, bosses drop their unique, deterministic', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const d = rollBattleDrops(makeRng(seed), [{ id: 'briar_wolf', elite: ['swift'], lootZone: 'valley', drops: [] }]);
    assert.ok(d.items.some((x) => x.rarity === 'magic' || x.rarity === 'rare'), 'elite drop');
  }
  const w = rollBattleDrops(makeRng(5), [{ id: 'echo_warden', elite: null, lootZone: 'archive_f2', drops: [] }]);
  assert.ok(w.items.some((x) => x.base === 'mirrorguard_mail'));
  const a = rollBattleDrops(makeRng(5), [{ id: 'archivore', elite: null, lootZone: 'archive_f3', drops: [] }]);
  // Lanternheart is granted by the post-boss scene, not rolled; the boss still drops boss-table loot.
  assert.ok(!a.items.some((x) => x.base === 'lanternheart'));
  assert.ok(a.items.length >= 1);
  assert.ok(a.items.filter((x) => x.rarity === 'rare').length === 2);
  assert.deepEqual(rollBattleDrops(makeRng(9), [{ id: 'ink_slime', lootZone: 'valley', drops: [{ item: 'potion', chance: 0.5 }] }]),
    rollBattleDrops(makeRng(9), [{ id: 'ink_slime', lootZone: 'valley', drops: [{ item: 'potion', chance: 0.5 }] }]));
  // ordinary equipment drop rate is about the zone's equipChance
  let drops = 0;
  const rng = makeRng(77);
  for (let i = 0; i < 4000; i++) drops += rollBattleDrops(rng, [{ id: 'ink_slime', lootZone: 'valley', drops: [] }]).items.length;
  assert.ok(Math.abs(drops / 4000 - 0.10) < 0.02, `valley equip drop rate ${drops / 4000}`);
});

test('chests: gold always, gold chests always hold rare gear', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const g = rollChest(makeRng(seed), 'gold', 7);
    assert.ok(g.gold >= 100 && g.items.length === 1 && g.items[0].rarity === 'rare');
    const w = rollChest(makeRng(seed), 'wood', 2);
    assert.ok(w.gold >= 15 && (w.items.length + w.consumables.length) === 1);
  }
});
