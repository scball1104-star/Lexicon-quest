// The balance simulator meets the brief's targets (smaller sample than the full report; still
// deterministic, so it never flakes). Full report: node tools/sim/simulate.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { runSuite, checkTargets, progression, runSet } from '../../tools/sim/simulate.mjs';

test('simulator: ordinary fights, Echo Warden, Archivore and the EXP curve meet the targets', () => {
  const rows = runSuite({ n: 60, elites: false });
  const fails = checkTargets(rows, [...progression(1), ...progression(0.8)]);
  assert.deepEqual(fails, []);
});

test('elite fights are tougher but still won by careful play', () => {
  for (const [zone, level, enc] of [['valley', 3, 'valley_pack'], ['archive_f2', 6, 'f2_mixed'], ['archive_f3', 7, 'f3_wraiths']]) {
    const plain = runSet({ zone, level, encounter: enc, n: 40, policy: 'competent' });
    const elite = runSet({ zone, level, encounter: enc, n: 40, policy: 'competent', elite: true });
    assert.ok(elite.win >= 0.95, `${enc} elite win ${elite.win}`);
    assert.ok(elite.rounds > plain.rounds, `${enc}: elite ${elite.rounds} vs ${plain.rounds}`);
  }
});

// W10 (PLAYTEST_REVIEW_2): the Briar Alpha stays a fight for a late party, the route with HP and MP carried between
// fights keeps ordinary fights in the 3 to 5 round band, and gold has somewhere to go.
test('the Elder Briar Alpha tiers hold the Alpha target for a party that comes late', async () => {
  const rows = runSuite({ n: 60, zones: ['whisperwood_hollow'], elites: false }).filter((r) => r.encounter.startsWith('whisperwood_alpha_t'));
  assert.equal(rows.length, 6, 'tier 1 at Lv 8, tier 2 at Lv 9 and 10, competent and naive');
  assert.deepEqual(checkTargets(rows, []), []);
  const { alphaEncounter } = await import('../../src/data/encounters.js');
  const has = (...f) => (x) => f.includes(x);
  assert.equal(alphaEncounter(has('lantern_get')), 'whisperwood_alpha');
  assert.equal(alphaEncounter(has('lantern_get', 'boss_door_open')), 'whisperwood_alpha_t1');
  assert.equal(alphaEncounter(has('boss_door_open', 'archivore_defeated')), 'whisperwood_alpha_t2');
});

test('route: HP and MP carried between fights, elites at the live rate, fights stay in the target band', async () => {
  const { routeSummary, checkRoute, REST_PLANS } = await import('../../tools/sim/route.mjs');
  const careful = routeSummary({ n: 40, rests: REST_PLANS.current });
  assert.deepEqual(checkRoute(careful, 'careful'), []);
  const bot = routeSummary({ n: 40, rests: REST_PLANS.current, bot: true });
  assert.ok(bot.overall <= 5, `autoplay-like route averages ${bot.overall.toFixed(2)} rounds`);
});

test('economy: Rook\'s salvage is affordable when the party reaches it and can absorb the route\'s gold', async () => {
  const { economy, checkEconomy } = await import('../../tools/sim/simulate.mjs');
  const e = economy();
  assert.deepEqual(checkEconomy(e), []);
  assert.ok(e.atRook >= e.cheapestT3 && e.sinkTotal >= e.earned);
});

// Episode 2 (E2-battle): every ordinary fight, the Other Selves, the Nameless King, the EXP curve continued from Episode 1
// and the Hollow's gold all hold their targets (smaller sample than the full report).
test('Episode 2: ordinary fights, the Other Selves, the Nameless King, the EXP curve and the gold meet the targets', async () => {
  const { EP2_ZONE_ORDER } = await import('../../src/data/encounters.js');
  const { economy2, checkEconomy2 } = await import('../../tools/sim/simulate.mjs');
  const rows = runSuite({ n: 60, zones: EP2_ZONE_ORDER, elites: false });
  assert.deepEqual(checkTargets(rows, [...progression(1, 2), ...progression(0.8, 2)]), []);
  assert.deepEqual(checkEconomy2(economy2()), []);
  const kingRows = rows.filter((r) => r.encounter === 'nameless_king');
  assert.ok(kingRows.some((r) => r.policy === 'reckless'), 'ignoring telegraphs is measured');
});

// Episode 3 (E3-battle): every ordinary fight, the Bellows Specter, the Cinder Warden (Tempered Oath turns at least half the Last
// Hammers), Foundry F3 as the tightest floor, the EXP curve from the quick start and the Emberpeak gold meet their targets
// (smaller sample than the full report).
test('Episode 3: ordinary fights, the Specter, the Warden, Foundry F3, the EXP curve and the gold meet the targets', async () => {
  const { EP3_ZONE_ORDER } = await import('../../src/data/encounters.js');
  const { economy3, checkEconomy3 } = await import('../../tools/sim/simulate.mjs');
  const rows = runSuite({ n: 60, zones: EP3_ZONE_ORDER, elites: false });
  assert.deepEqual(checkTargets(rows, [...progression(1, 3), ...progression(0.8, 3)]), []);
  assert.deepEqual(checkEconomy3(economy3()), []);
  for (const id of ['bellows_specter', 'cinder_warden']) assert.ok(rows.some((r) => r.encounter === id && r.policy === 'reckless'), `${id}: ignoring telegraphs is measured`);
  const w = rows.find((r) => r.encounter === 'cinder_warden' && r.policy === 'competent');
  assert.ok(w.hammers > 0 && w.oathShare >= 0.5, `Oath share ${w.oathShare}`);
  assert.ok(rows.filter((r) => r.zone === 'foundry_f3' && r.policy === 'competent').every((r) => r.quenched >= 0));
});
