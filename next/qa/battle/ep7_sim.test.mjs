// Episode 7 (E7-battle): every ordinary fight, the Pale Lantern, the White Phantom, the Stillheart Sanctum as the tightest floor,
// toughNotLong, economy7, Rime in every Episode 7 battle and in no Episode 1 to 6 one, no foe ever holding Rime, Call against the pins
// and the EXP curve from the quick start (the Phantom met under Lv 31 with every fight, elites counted) meet their targets (a smaller,
// still deterministic sample than the full report: node tools/sim/simulate.mjs --episode 7 --check).
import test from 'node:test';
import assert from 'node:assert/strict';
import { runSuite, checkTargets, runBattle, EPISODES } from '../../tools/sim/simulate.mjs';
import { progression, check, EP7_ZONE_ORDER, registerData, phantomMargin } from '../../tools/sim/ep7.mjs';

registerData();   // the ep4 to ep7 battle data, as the packs add them (simulate.mjs leaves them out unless run as the CLI)

test('Episode 7: ordinary fights, both bosses, the tightest floor, toughNotLong, economy7, Rime, Call and the EXP curve meet the targets', () => {
  assert.deepEqual(EPISODES[7], EP7_ZONE_ORDER);
  const rows = runSuite({ n: 100, zones: EPISODES[7], elites: false });
  const fails = [...checkTargets(rows, [...progression(1), ...progression(0.8)]), ...check(rows, { runBattle, n: 60, EPISODES })];
  assert.deepEqual(fails, []);
  for (const id of ['pale_lantern', 'white_phantom']) assert.ok(rows.some((r) => r.encounter === id && r.policy === 'reckless'), `${id}: ignoring telegraphs is measured`);
});

test('Episode 7 progression: the White Road 28 -> 29, F1 29, F2 -> 30, F3 30, the Phantom met at 30 under Lv 31 (elites counted; also at 80%)', () => {
  assert.deepEqual(progression(1).map((r) => [r.zone, r.startLevel, r.endLevel]), [
    ['ep7_white_road', 28, 29], ['ep7_vault_f1', 29, 29], ['ep7_vault_f2', 29, 30], ['ep7_vault_f3', 30, 30], ['ep7_stillheart', 30, 31]]);
  const m = phantomMargin(1, { elites: true });
  assert.ok(m.margin > 0, `every fight, elites counted, reaches the Phantom ${m.margin} EXP under Lv 31`);
  assert.equal(phantomMargin(0.8).level, 30);
});
