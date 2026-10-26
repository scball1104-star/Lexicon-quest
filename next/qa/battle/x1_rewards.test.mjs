// X1-battle: the EXP mechanism (src/data/expcurve.js, encounters.js expScale/encounterExp, rules.js makeEnemyUnit) pays every existing
// encounter exactly what it paid before, and pays the new groups EXPANSION_FOE_EXP_MUL of their foes' EXP, rounded per unit.
// The baseline file qa/battle/x1_baseline_rewards.json was written from the code BEFORE the mechanism existed
// (tools/sim/out/x1_gen_baseline.mjs): per encounter, every unit's [id, exp, gold, mastery] plain / with two elite modifiers /
// with one, encounterExp(), and three seeded competent-play fights (outcome, rounds, EXP).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createBattle, makeRng } from '../../src/battle/rules.js';
import { enc, ENCOUNTERS, ZONES, OPTIONAL_ZONES, ZONE_ORDER, EP2_ZONE_ORDER, EP3_ZONE_ORDER, rollEncounter, encounterExp, expScale, encounterExpMul } from '../../src/data/encounters.js';
import { ENEMIES, ELITE_BASE } from '../../src/data/enemies.js';
import { EP1_EXP_SCALE, EP2_EXP_SCALE, EP3_EXP_SCALE, OPTIONAL_FOE_EXP_MUL, EXPANSION_FOE_EXP_MUL, scaleForEpisode, scaleExp } from '../../src/data/expcurve.js';
import { EXP_TABLE, newMember } from '../../src/data/party.js';
import { runBattle, progression } from '../../tools/sim/simulate.mjs';
import { X1_GROUP_IDS, X1_BOSS_IDS } from '../../src/data/x1/encounters.js';

const BASE = JSON.parse(fs.readFileSync(new URL('./x1_baseline_rewards.json', import.meta.url), 'utf8'));
const party = () => ['hero', 'mira', 'bram'].map((id) => newMember(id, { level: 5 }));
const MODES = [['plain', { noElite: true }], ['elite', { forceElite: ['swift', 'stoneskin'] }], ['elite1', { forceElite: ['cursed'] }]];
const NEW = new Set([...X1_GROUP_IDS, ...X1_BOSS_IDS]);

test('expcurve.js: every scale is 1, optional foes pay x1, expansion foes carry the tuned multiple', () => {
  assert.equal(EP1_EXP_SCALE, 1); assert.equal(EP2_EXP_SCALE, 1); assert.equal(EP3_EXP_SCALE, 1);
  assert.equal(OPTIONAL_FOE_EXP_MUL, 1);
  assert.equal(EXPANSION_FOE_EXP_MUL, 1, 'Scott 2026-10-25: new optional foes pay regular EXP (the mechanism stays for a per-fight override)');
  for (const ep of [1, 2, 3, undefined, 9]) assert.equal(scaleForEpisode(ep), 1);
  assert.equal(scaleExp(16, 1, 0.1), 2); assert.equal(scaleExp(9, 2), 9); assert.equal(scaleExp(0, 1, 0.5), 0);
  for (const z of [...ZONE_ORDER, ...EP2_ZONE_ORDER, ...EP3_ZONE_ORDER, 'whisperwood_hollow']) assert.equal(expScale(z), 1, z);
});

test('every encounter that existed before the expansion pays byte-identical rewards (units, elites, encounterExp, three fights)', () => {
  const ids = Object.keys(BASE);
  assert.ok(ids.length >= 59, `baseline covers ${ids.length} encounters`);
  for (const id of ids) {
    assert.ok(ENCOUNTERS[id], `${id} still exists`);
    assert.equal(ENCOUNTERS[id].expMul, undefined, `${id} sets no expMul`);
    assert.equal(encounterExpMul(id), 1, id);
    assert.equal(encounterExp(id), BASE[id].encounterExp, `${id} encounterExp`);
    const e = ENCOUNTERS[id];
    for (const [mode, opts] of MODES) {
      const rng = makeRng(11);
      const spec = rollEncounter(id, rng, opts);
      for (const s of spec.enemies) assert.equal(s.expMul, undefined, `${id} specs carry no expMul`);
      const b = createBattle({ party: party(), enemies: spec.enemies, rng, options: { boss: e.boss, zone: e.zone, encounter: id } });
      const got = b.units().filter((u) => u.side === 'enemy').map((u) => [u.id, u.rewards.exp, u.rewards.gold, u.rewards.masteryPts]);
      assert.deepEqual(got, BASE[id].modes[mode], `${id} (${mode}) unit rewards`);
      for (const u of b.units().filter((x) => x.side === 'enemy')) assert.ok(!('expMul' in u), `${id}: no expMul field on a unit that pays x1`);
    }
    const zone = ZONES[e.zone];
    const level = zone ? zone.level[1] : 5;
    const fights = [1, 2, 3].map((seed) => { const r = runBattle({ zone: e.zone, level, encounter: id, seed, policy: 'competent' }); return [seed, r.outcome, r.rounds, r.exp]; });
    assert.deepEqual(fights, BASE[id].fights, `${id} played out (outcome, rounds, EXP)`);
  }
});

test('stored EXP, levels, the EXP table and the main route are untouched', () => {
  assert.deepEqual(EXP_TABLE, [0, 20, 68, 148, 266, 424, 623, 867, 1156, 1493, 1878, 2314, 2800, 3339, 3931]);
  assert.deepEqual(progression(1).map((p) => p.exp), [141, 335, 621, 1033, 1433]);
  assert.deepEqual(progression(1, 2).map((p) => p.exp), [1595, 1901, 2327, 2835, 3335]);
  assert.deepEqual(progression(1, 3).map((p) => p.exp), [3345, 4070, 4760, 5440, 6060]);
  assert.deepEqual(progression(0.8).map((p) => p.exp), [113, 268, 509, 839, 1239]);
  // the new zones never join the route
  for (const z of OPTIONAL_ZONES) assert.ok(!ZONE_ORDER.includes(z) && !EP2_ZONE_ORDER.includes(z) && !EP3_ZONE_ORDER.includes(z), z);
});

test("a new group pays its foes' EXP x expMul x the elite multiplier, rounded per unit, and encounterExp agrees", () => {
  assert.equal(NEW.size, 20, 'eighteen groups and two bosses');
  for (const id of NEW) {
    const e = ENCOUNTERS[id];
    assert.equal(e.expMul, EXPANSION_FOE_EXP_MUL, `${id} carries EXPANSION_FOE_EXP_MUL`);
    assert.equal(expScale(e.zone), 1);
    // plain: each unit round(raw x mul); encounterExp is the sum
    const plain = e.enemies.map((eid) => Math.round(ENEMIES[eid].exp * EXPANSION_FOE_EXP_MUL));
    assert.equal(encounterExp(id), plain.reduce((a, b) => a + b, 0), `${id} encounterExp`);
    const rng = makeRng(5);
    const spec = rollEncounter(id, rng, { noElite: true });
    for (const s of spec.enemies) assert.equal(s.expMul, EXPANSION_FOE_EXP_MUL === 1 ? undefined : EXPANSION_FOE_EXP_MUL, `${id}: rollEncounter copies a non-1 expMul onto each spec`);
    const b = createBattle({ party: party(), enemies: spec.enemies, rng, options: { boss: e.boss, zone: e.zone, encounter: id } });
    const foes = b.units().filter((u) => u.side === 'enemy');
    assert.deepEqual(foes.map((u) => u.rewards.exp), plain, `${id} unit EXP`);
    // gold and mastery are not scaled
    for (const u of foes) { assert.equal(u.rewards.gold, ENEMIES[u.id].gold); assert.equal(u.rewards.masteryPts, ENEMIES[u.id].masteryPts); }
    // elites double the unit before the multiple, still rounded per unit
    if (!e.boss) {
      for (let idx = 0; idx < e.enemies.length; idx++) {
        const spec2 = rollEncounter(id, makeRng(5), { noElite: true });
        spec2.enemies[idx].elite = ['swift'];
        const b2 = createBattle({ party: party(), enemies: spec2.enemies, rng: makeRng(5), options: { zone: e.zone, encounter: id } });
        const want = e.enemies.map((eid, i) => Math.round(ENEMIES[eid].exp * (i === idx ? ELITE_BASE.exp : 1) * EXPANSION_FOE_EXP_MUL));
        assert.deepEqual(b2.units().filter((u) => u.side === 'enemy').map((u) => u.rewards.exp), want, `${id} elite at ${idx}`);
      }
    }
  }
});

test("a boss's calls pay like the boss: a summoned add inherits the summoner's expMul", () => {
  for (const [boss, add] of [['barrow_reeve', 'barrow_shade'], ['millstone_golem', 'moss_scarab']]) {
    const e = ENCOUNTERS[boss];
    let seen = 0;
    for (let seed = 1; seed <= 12 && !seen; seed++) {
      const r = runBattle({ zone: e.zone, level: ZONES[e.zone].level[1], encounter: boss, seed, policy: 'competent', trace: true });
      if (!r.win || !r.log.some((ev) => ev.type === 'summon' && ev.id === add)) continue;
      const v = r.log.find((ev) => ev.type === 'victory');
      const want = Math.round(ENEMIES[boss].exp * EXPANSION_FOE_EXP_MUL) + Math.round(ENEMIES[add].exp * EXPANSION_FOE_EXP_MUL);
      assert.equal(v.exp, want, `${boss}: boss + ${add}`);
      seen++;
    }
    assert.ok(seen, `${boss} won and called ${add} in one of 12 fights`);
  }
});

test("the Hollow keeps today's pay (OPTIONAL_FOE_EXP_MUL is 1): hollow groups carry no expMul", () => {
  for (const id of ['hollow_wolves', 'hollow_blot', 'whisperwood_alpha', 'whisperwood_alpha_t1', 'whisperwood_alpha_t2']) {
    assert.equal(ENCOUNTERS[id].expMul, undefined);
    assert.equal(encounterExpMul(id), OPTIONAL_FOE_EXP_MUL);
  }
  assert.equal(encounterExp('hollow_wolves'), 52);
  assert.equal(encounterExp('whisperwood_alpha'), 110);
});

test('the per-fight override still works: a group with its own expMul pays that multiple, a boss call inherits it', () => {
  enc('t_half', { zone: 'x1_downs', leader: 'briar_wolf', enemies: ['briar_wolf', 'thornback_wolf'], expMul: 0.5 });
  enc('t_half_boss', { zone: 'x1_barrow', leader: 'barrow_reeve', enemies: ['barrow_reeve'], boss: true, noFlee: true, noElite: true, expMul: 0.5 });
  try {
    assert.equal(encounterExp('t_half'), Math.round(9 * 0.5) + Math.round(26 * 0.5));
    const rng = makeRng(2);
    const spec = rollEncounter('t_half', rng, { noElite: true });
    assert.ok(spec.enemies.every((x) => x.expMul === 0.5));
    const b = createBattle({ party: party(), enemies: spec.enemies, rng, options: { zone: 'x1_downs', encounter: 't_half' } });
    assert.deepEqual(b.units().filter((u) => u.side === 'enemy').map((u) => u.rewards.exp), [5, 13]);
    let seen = 0;
    for (let seed = 1; seed <= 12 && !seen; seed++) {
      const r = runBattle({ zone: 'x1_barrow', level: 6, encounter: 't_half_boss', seed, policy: 'competent', trace: true });
      if (!r.win || !r.log.some((ev) => ev.type === 'summon' && ev.id === 'barrow_shade')) continue;
      assert.equal(r.log.find((ev) => ev.type === 'victory').exp, Math.round(60 * 0.5) + Math.round(16 * 0.5));
      seen++;
    }
    assert.ok(seen, 'the Reeve called a shade in one of 12 fights');
  } finally { delete ENCOUNTERS.t_half; delete ENCOUNTERS.t_half_boss; }
});
