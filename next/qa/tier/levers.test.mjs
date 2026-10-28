// H7-hard-road: Fine Print (tier_1), the five levers with their numbers, on the tier and off it, and the Deep Stacks rule.
//   foes   rules.js makeEnemyUnit through LQ_TIER.foe: the lift, then HP x1.6, ATK and MAG x1.35, SPD +1 (bosses and adds too)
//   EXP    x1.5 on every foe's pay (gold x1.5 with it)
//   loot   loot.js rollBattleDrops through LQ_TIER.drops: item level +6 capped at 16, the tier rarity table, rollable legendaries
//   shops  the tier_1 rows (tier 4 to 6 bases at the tier price) in Willowmere and the Hollow
//   title  the row (qa/tier/title.test.mjs)
// A cave battle ignores all of it. Off the tier every number is the base game's, with the pack loaded or not.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, makeRng } from '../../src/battle/rules.js';
import { rollBattleDrops } from '../../src/battle/loot.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { ENCOUNTERS, rollEncounter } from '../../src/data/encounters.js';
import { ZONE_LOOT, BOSS_LOOT, RARITY_TABLES } from '../../src/data/loot-tables.js';
import { UNIQUES, ITEMS } from '../../src/data/items.js';
import { SHOPS, shopStock } from '../../src/data/shops.js';
import { newMember } from '../../src/data/party.js';
import { progression } from '../../tools/sim/simulate.mjs';
import { register, unregister } from '../../src/data/tier/index.js';
import { TIER_TABLE, TIER_FLAG, FOE_LINES, LEGENDARY_POOL, TIER_SHOP_ROWS, liftLevel, metLevel, tierFoe, tierDrops, tierItem,
  pickLegendary, tierPrice, caveBattle, unlockFlag, resetTierBattle } from '../../src/data/tier/tier.js';
import { TIER_LEGENDARIES } from '../../src/data/tier/legendaries.js';

const T = TIER_TABLE[1];
const party = (level = 13) => ['hero', 'mira', 'bram'].map((id) => newMember(id, { level }));
const line = (k, L) => FOE_LINES[k][0] * L + FOE_LINES[k][1];

/** The first enemy unit of a battle built from an encounter, with these story flags (the battle scene passes the save's flags). */
function foeOf(encounter, flags, o = {}) {
  const e = ENCOUNTERS[encounter];
  const spec = rollEncounter(encounter, makeRng(5), { noElite: true });
  const b = createBattle({ party: party(o.level), enemies: spec.enemies, rng: makeRng(7),
    options: { zone: o.zone || e.zone, encounter: o.encounter || encounter, boss: e.boss, flags } });
  return b.units().filter((u) => u.side === 'enemy');
}
const plain = (u) => ({ hp: u.maxHp, atk: u.stats.atk, mag: u.stats.mag, def: u.stats.def, spd: u.stats.spd, exp: u.rewards.exp, gold: u.rewards.gold });

test('the table is the brief\'s: HP x1.6, ATK and MAG x1.35, SPD +1, EXP x1.5, item level +6 capped at 16, the rarity rows', () => {
  assert.deepEqual(T.foe, { hp: 1.6, pow: 1.35, spd: 1 });
  assert.equal(T.exp, 1.5);
  assert.equal(T.ilvl, 6); assert.equal(T.ilvlCap, 16);
  assert.deepEqual(T.rarity.normal, { common: 50, magic: 35, rare: 15 });
  assert.deepEqual(T.rarity.elite, { magic: 35, rare: 60, legendary: 5 });
  assert.deepEqual(T.rarity.boss, { rare: 85, legendary: 15 });
  assert.equal(T.id, 'tier_1'); assert.equal(TIER_FLAG, 'tier_1');
  assert.equal(unlockFlag(false), 'ep2_complete', 'today the unlock is the Episode 2 finish');
  assert.equal(unlockFlag(true), 'ep3_complete', 'and the Episode 3 finish once Episode 3 ships');
  // the record the tier is written for is the simulator's Episode 2 finish
  assert.equal(T.lift.carryExp, progression(1, 2).slice(-1)[0].exp);
  for (const [enc, t] of Object.entries(T.terms)) {
    assert.ok(ENCOUNTERS[enc], `a term names a real encounter: ${enc}`);
    for (const [k, v] of Object.entries(t)) assert.ok(['hp', 'pow'].includes(k) && v > 0.5 && v < 2, `${enc}.${k} = ${v} is a correction, not a rewrite`);
  }
});

test('off the tier: every foe is the base game\'s, with the pack loaded and without it', () => {
  unregister();
  const base = {};
  for (const enc of ['valley_wolves', 'archivore', 'c1_mixed', 'nameless_king']) base[enc] = foeOf(enc, {}).map(plain);
  register();
  for (const [enc, units] of Object.entries(base)) {
    assert.deepEqual(foeOf(enc, {}).map(plain), units, `${enc}: no flag, no change`);
    assert.deepEqual(foeOf(enc, { ep2_complete: true, ep1_complete: true }).map(plain), units, `${enc}: a finished record is not the tier`);
  }
});

test('on the tier: each foe is lifted to the party, then HP x1.6, ATK and MAG x1.35, SPD +1; EXP and gold x1.5', () => {
  register();
  for (const enc of ['valley_wolves', 'f2_golem', 'echo_warden', 'archivore', 'road_beetles', 'nameless_king', 'hollow_wolves']) {
    unregister();
    const base = foeOf(enc, {});
    register();
    const on = foeOf(enc, { [TIER_FLAG]: true });
    const term = T.terms[enc] || {};
    base.forEach((b, i) => {
      const u = on[i];
      const L = ENEMIES[b.id].level;
      const up = (k) => line(k, liftLevel(L, k)) / line(k, L);
      assert.equal(u.maxHp, Math.round(b.maxHp * up('hp') * 1.6 * (term.hp || 1)), `${enc} ${b.id} HP`);
      assert.equal(u.stats.atk, Math.round(b.stats.atk * up('pow') * 1.35 * (term.pow || 1)), `${enc} ${b.id} ATK`);
      assert.equal(u.stats.mag, Math.round(b.stats.mag * up('pow') * 1.35 * (term.pow || 1)), `${enc} ${b.id} MAG`);
      assert.equal(u.stats.spd, Math.round(b.stats.spd * up('spd') + 1), `${enc} ${b.id} SPD`);
      assert.equal(u.stats.def, b.stats.def, `${enc} ${b.id} DEF is not lifted`);
      assert.equal(u.stats.spr, b.stats.spr, `${enc} ${b.id} SPR is not lifted`);
      assert.equal(u.shields, b.shields, `${enc} ${b.id} keeps its shields and weaknesses`);
      assert.deepEqual(u.weak, b.weak);
      assert.equal(u.rewards.exp, Math.round(b.rewards.exp * 1.5), `${enc} ${b.id} EXP x1.5`);
      assert.equal(u.rewards.gold, Math.round(b.rewards.gold * 1.5), `${enc} ${b.id} gold x1.5`);
      assert.ok(u.maxHp > b.maxHp && u.stats.atk >= b.stats.atk, `${enc} ${b.id} is stronger on the tier`);
    });
  }
});

test('the lift: a foe is met at the carried party\'s level on the tier, and lifted toward it (never below its own level)', () => {
  assert.equal(metLevel(1), 13, 'the record itself: Lv 13 (3,335 EXP, four short of 14)');
  assert.equal(metLevel(2), 14, 'the valley: the party is Lv 14 a few fights in');
  assert.ok(metLevel(8) >= 15 && metLevel(8) <= 16, 'the Archivore: Lv 15 or 16 on the tier');
  for (let L = 1; L <= 18; L++) {
    for (const k of ['hp', 'pow', 'spd']) {
      const t = liftLevel(L, k);
      assert.ok(t >= L, `Lv ${L} ${k} is never lowered`);
      assert.ok(t <= metLevel(L), `Lv ${L} ${k} never rises above the party`);
    }
  }
  assert.equal(liftLevel(3, 'pow'), metLevel(3), 'the hit is the party\'s own level');
  assert.equal(liftLevel(3, 'hp'), metLevel(3) - T.lift.lag.hp);
});

test('summoned adds and split children: lifted once (a child carrying its lifted parent\'s HP is not lifted again)', () => {
  register();
  const d = ENEMIES.quicksilver;
  const s = { hp: 50, atk: 10, mag: 10, def: 5, spd: 10, exp: 4, gold: 4 };
  const st = { options: { zone: 'east_road', encounter: 'road_quick' } };
  const full = tierFoe(d, s, [TIER_FLAG], st, {});
  const child = tierFoe(d, s, [TIER_FLAG], st, { hp: 50 });
  assert.ok(full.hp > 50);
  assert.equal(child.hp, 50, 'the absolute HP from the parent stands');
  assert.equal(child.atk, full.atk);
});

test('a cave battle ignores the tier: cave zones and cave encounter rows build base foes on a tier save', () => {
  register();
  assert.ok(caveBattle({ zone: 'cave_band_2' }) && caveBattle({ zone: 'cave_boss' }));
  assert.ok(!caveBattle({ zone: 'valley', encounter: 'valley_wolves' }));
  unregister();
  const base = foeOf('valley_wolves', {}, { zone: 'cave_band_2', encounter: 'cave_b2_e1' }).map(plain);
  register();
  const tierCave = foeOf('valley_wolves', { [TIER_FLAG]: true }, { zone: 'cave_band_2', encounter: 'cave_b2_e1' }).map(plain);
  assert.deepEqual(tierCave, base, 'a cave zone');
  ENCOUNTERS.__tier_test_cave = { ...ENCOUNTERS.valley_wolves, id: '__tier_test_cave', cave: true };
  try {
    const row = foeOf('valley_wolves', { [TIER_FLAG]: true }, { encounter: '__tier_test_cave' }).map(plain);
    assert.deepEqual(row, foeOf('valley_wolves', {}).map(plain), 'an encounter row marked cave: true (the Deep Stacks generator\'s rows)');
  } finally { delete ENCOUNTERS.__tier_test_cave; }
  // and its loot is the base roll: the cave battle left no tier battle behind
  assert.equal(tierDrops(makeRng(1), [], { zone: 'cave_band_2', encounter: 'cave_b2_e1' }), null);
});

test('loot on the tier: item level +6 capped at 16, the tier rarity table, legendaries from the pool', () => {
  register();
  const rng = makeRng(11);
  // a valley victory on the tier: the zone drop at ilvl 2 + 6
  tierFoe(ENEMIES.briar_wolf, { hp: 1, atk: 1, mag: 1, def: 1, spd: 1, exp: 1, gold: 1 }, [TIER_FLAG], { options: { zone: 'valley', encounter: 'valley_wolves' } });
  let sawZone = 0;
  for (let i = 0; i < 400; i++) {
    const r = rollBattleDrops(rng, [{ id: 'briar_wolf', elite: ['swift'], lootZone: 'valley', drops: [] }], { zone: 'valley', encounter: 'valley_wolves' });
    for (const it of r.items) {
      if (it.unique) { assert.ok(LEGENDARY_POOL.includes(it.base), it.base); assert.ok(UNIQUES[it.base].ilvl <= 9); continue; }
      assert.ok(it.ilvl === ZONE_LOOT.valley.ilvl + 6 || it.ilvl === ZONE_LOOT.valley.ilvl + 1 + 6, `ilvl ${it.ilvl}`);
      sawZone++;
    }
  }
  assert.ok(sawZone > 400, 'an elite item every fight, and the zone chance on top');
  // the cap: a Foundry boss roll (ilvl 16) stays at 16
  const capped = tierItem(makeRng(3), Math.min(16, BOSS_LOOT.cinder_warden.ilvl + 6), 'boss');
  assert.ok(capped.ilvl <= 16);
  // a battle the tier did not build gets the base roll (and the base never rolls a legendary)
  resetTierBattle();
  for (let i = 0; i < 200; i++) {
    const r = rollBattleDrops(rng, [{ id: 'briar_wolf', elite: ['swift'], lootZone: 'valley', drops: [] }], { zone: 'valley', encounter: 'valley_wolves' });
    for (const it of r.items) { assert.notEqual(it.rarity, 'legendary'); assert.ok(it.ilvl <= ZONE_LOOT.valley.ilvl + 1); }
  }
});

test('the tier rarity table rolls as written (normal 50/35/15, elite 35/60/5, boss 85/15)', () => {
  const rng = makeRng(99);
  const count = (table, ilvl, n = 6000) => {
    const c = {};
    for (let i = 0; i < n; i++) { const it = tierItem(rng, ilvl, table); c[it.rarity] = (c[it.rarity] || 0) + 1; }
    for (const k of Object.keys(c)) c[k] /= n;
    return c;
  };
  const near = (a, b, tag) => assert.ok(Math.abs((a || 0) - b) < 0.03, `${tag}: ${a} vs ${b}`);
  const n = count('normal', 10); near(n.common, 0.5, 'normal common'); near(n.magic, 0.35, 'normal magic'); near(n.rare, 0.15, 'normal rare');
  assert.equal(n.legendary || 0, 0, 'ordinary foes never roll a legendary');
  const e = count('elite', 10); near(e.magic, 0.35, 'elite magic'); near(e.rare, 0.6, 'elite rare'); near(e.legendary, 0.05, 'elite legendary');
  const b = count('boss', 14); near(b.rare, 0.85, 'boss rare'); near(b.legendary, 0.15, 'boss legendary');
  // the base tables are untouched
  assert.deepEqual(RARITY_TABLES.normal, { common: 70, magic: 25, rare: 5 });
  assert.deepEqual(RARITY_TABLES.boss, { rare: 100 });
});

test('legendaries: the twelve placed ones and six made for the tier, each rollable at its own item level', () => {
  register();
  assert.equal(LEGENDARY_POOL.length, 18);
  const placed = Object.values(UNIQUES).filter((u) => u.rarity === 'legendary' && !TIER_LEGENDARIES[u.id] && !u.source?.includes('Barrow') && !u.source?.includes('Millstone'));
  for (const u of placed) assert.ok(LEGENDARY_POOL.includes(u.id), `the placed legendary ${u.id} is rollable`);
  for (const [id, u] of Object.entries(TIER_LEGENDARIES)) {
    assert.ok(UNIQUES[id] && ITEMS[id] && ITEMS[id].unique, `${id} registered`);
    assert.equal(u.rarity, 'legendary');
    assert.ok(u.desc && !/\u2014/.test(u.desc + u.name), `${id}: lore, no em dash`);
    assert.ok(Object.keys(u.stats).length >= 3, `${id}: a fixed set of at least three stats`);
  }
  const seen = new Set();
  const rng = makeRng(5);
  for (let i = 0; i < 4000; i++) { const id = pickLegendary(rng, 16); seen.add(id); }
  assert.equal(seen.size, 18, 'every one of them drops at item level 16');
  for (let i = 0; i < 500; i++) { const id = pickLegendary(rng, 8); assert.ok(UNIQUES[id].ilvl <= 8, id); }
  assert.equal(pickLegendary(rng, 2), null, 'nothing fits an item level under every legendary: the roll is a rare');
});

test('shops: the tier_1 rows are tier 4 to 6 bases at the tier price, only on the tier', () => {
  register();
  for (const [shopId, ids] of Object.entries(TIER_SHOP_ROWS)) {
    const on = shopStock(shopId, { [TIER_FLAG]: true }).filter((s) => s.ifFlag === TIER_FLAG);
    assert.deepEqual(on.map((s) => s.item), ids, `${shopId} rows`);
    for (const s of on) {
      assert.ok([4, 5, 6].includes(ITEMS[s.item].tier), `${s.item} is tier ${ITEMS[s.item].tier}`);
      assert.equal(s.price, tierPrice(ITEMS[s.item].price));
      assert.ok(s.price > ITEMS[s.item].price, 'the tier price is over list');
    }
    assert.equal(shopStock(shopId, { ep2_complete: true, court_f2_done: true }).filter((s) => s.ifFlag === TIER_FLAG).length, 0, `${shopId}: none off the tier`);
  }
  const before = SHOPS.willowmere_smithy.stock.length;
  register();
  assert.equal(SHOPS.willowmere_smithy.stock.length, before, 'register() twice adds nothing');
  assert.ok(shopStock('willowmere_smithy', {}).some((s) => s.item === 'short_sword'), 'the base rows are still there');
});
