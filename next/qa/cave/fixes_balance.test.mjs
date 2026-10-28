// C4-fixes: the balance pins of the critique's pass (docs/CRITIQUE_STACKS.md 5 to 9, 11; docs/DEEP_STACKS_BALANCE.md 7.5 and 9).
// The proof itself is the descent (node tools/sim/simulate.mjs --cave --check, sim_descent / sim_targets); these pin the choices.
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.LQ_CAVE_ON = true;
const { ensurePack } = await import('../../src/game/packs.js');
await ensurePack('cave', { quiet: true, warm: false });
const F = await import('../../src/data/cave/foes.js');
const L = await import('../../src/data/cave/loot.js');
const { foeCount } = await import('../../src/data/cave/gen.js');
const { ENEMIES } = await import('../../src/data/enemies.js');
const { newMember } = await import('../../src/data/party.js');
const { createEncounterBattle, makeRng } = await import('../../src/battle/rules.js');
const { competentPolicy } = await import('../../src/battle/ai.js');
const W = await import('../../src/data/cave/world.js');

test('issue 5: at most six foes a floor from B40, the generator and the data agree on every floor, the EXP pace refits itself', () => {
  for (let f = 1; f <= 99; f++) {
    if (F.isLanding(f)) continue;
    assert.equal(F.foesPerFloor(f), foeCount(f), `B${f}`);
    if (f >= 40) assert.ok(F.foesPerFloor(f) <= 6, `B${f}`);
  }
  // the fit still lands the plan's levels with fewer fights (fitCurve reads foesPerFloor)
  for (const [f, lv] of [[9, 12], [29, 25], [59, 40], [89, 55], [99, 59]]) assert.ok(Math.abs(F.targetLevel(f) - lv) < 0.6, `B${f}`);
  // a generated deep floor places six
  const mod = W.buildFloor(4, 77, []);
  assert.equal(mod.events.filter((e) => e.type === 'enemy').length, 6);
});

test('issue 7: the Root Cellars fight shorter and sharper (hp 1, power up a step), bands 4 and 5 carry their own correction', () => {
  assert.deepEqual(F.BAND_ADJUST[2], { hp: 1, power: 1.15, speed: 1 });
  for (const k of [4, 5]) assert.ok(F.BAND_ADJUST[k].speed === 1 && F.BAND_ADJUST[k].hp > 1 && F.BAND_ADJUST[k].power < 1, `band ${k}`);
});

test('issue 6: until EP3_LIVE the deep bands mix all three earlier pools and one group in three leads with an elite', () => {
  for (const k of [3, 4]) {
    const b = F.BANDS[k];
    if (!b.fallback) continue;
    const kinds = new Set(b.pool.map((t) => t.id.split('_')[0]));
    assert.deepEqual([...kinds].sort(), ['cat', 'cel', 'court']);
  }
  // on a run of B70 floors the groups come from every pool, not only the Court's six foes
  const seen = new Set();
  for (let seed = 1; seed <= 30; seed++) for (const s of F.floorEncounters(seed, 71)) seen.add(s.template.split('_')[0]);
  assert.deepEqual([...seen].sort(), ['cat', 'cel', 'court']);
});

test('issue 11: the Binder is shorter and its telegraphs bite: HP 3000, MAG 4000, SPD 66, on the Forge\'s stage', () => {
  const e = ENEMIES.binder;
  assert.deepEqual([e.hp, e.mag, e.spd, e.atk], [3000, 4000, 66, 2200]);
  assert.equal(F.BINDER_ENCOUNTER.stage, 'cave_forge');
});

test('issue 9: the first blue chest of a reading comes by B9, before the first landing\'s Bookmark', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const floors = [...W.blueFloors(seed, [])].sort((a, b) => a - b);
    assert.ok(floors[0] <= 9, `seed ${seed}: first blue on B${floors[0]}`);
  }
  assert.equal(L.BLUE_PITY_FIRST, 9);
});

test('issue 8: the hoard levers: Feathers rarer from band 2, cures a sliver of the deep larder, the landing supplies one Feather at most', () => {
  for (const k of [2, 3, 4, 5]) {
    const rows = L.CONSUMABLES_BY_BAND[k], total = rows.reduce((s, r) => s + r.weight, 0);
    const w = (id) => (rows.find((r) => r.item === id) || { weight: 0 }).weight;
    assert.ok(w('phoenix_feather') / total <= 0.05, `band ${k} feathers`);
    assert.ok(L.CURE_IDS.reduce((s, id) => s + w(id), 0) / total <= 0.06, `band ${k} cures`);
  }
  for (const k of [1, 2, 3, 4, 5]) assert.ok((L.LANDING_SUPPLY[k].find((c) => c.item === 'phoenix_feather') || { qty: 0 }).qty <= 1, `landing ${k}`);
});

test('Known 5: Auto Defends at low HP only while a heal or a Feather is coming; with neither it attacks (it used to Defend until it died)', () => {
  const party = ['hero', 'mira', 'bram'].map((id) => newMember(id, { level: 12 }));
  const enc = F.floorEncounters(3, 25)[0];
  F.registerFloorEncounters([enc]);
  const make = (inventory) => {
    const { battle: b } = createEncounterBattle(enc.id, { party, rng: makeRng(4), inventory });
    if (!b.startEvents.length) b.begin();
    const hero = b.unit('hero'), mira = b.unit('mira');
    hero.hp = Math.max(1, Math.floor(hero.maxHp * 0.2));
    mira.hp = 0; mira.alive = false;   // no healer coming
    return { b, hero };
  };
  const bare = make({});
  const a1 = competentPolicy(bare.b, bare.hero);
  assert.notEqual(a1.type, 'defend', `no heal, no Feather: ${JSON.stringify(a1)}`);
  const feather = make({ phoenix_feather: 1 });
  const a2 = competentPolicy(feather.b, feather.hero);
  assert.ok(a2.type === 'defend' || (a2.type === 'item' && a2.item === 'phoenix_feather'), `a Feather in the bag: ${JSON.stringify(a2)}`);
});
