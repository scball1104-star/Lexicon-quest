// Episode 5 (E5-battle): every ordinary fight, the Mirage Knight, the Sand Oracle, Well F3 as the tightest floor, Turn the Sky against
// the Last Prophecy, the sky in every Episode 5 battle and the EXP curve from the quick start meet their targets (a smaller, still
// deterministic sample than the full report: node tools/sim/simulate.mjs --episode 5 --check).
import test from 'node:test';
import assert from 'node:assert/strict';
import { runSuite, checkTargets, runBattle, EPISODES } from '../../tools/sim/simulate.mjs';
import { progression, check, EP5_ZONE_ORDER, registerData } from '../../tools/sim/ep5.mjs';

registerData();   // the ep4 and ep5 battle data, as the packs add them (simulate.mjs leaves them out unless run as the CLI)

test('Episode 5: ordinary fights, both bosses, the tightest floor, Turn the Sky and the EXP curve meet the targets', () => {
  assert.deepEqual(EPISODES[5], EP5_ZONE_ORDER);
  const rows = runSuite({ n: 100, zones: EPISODES[5], elites: false });
  const fails = [...checkTargets(rows, [...progression(1), ...progression(0.8)]), ...check(rows, { runBattle, n: 60 })];
  assert.deepEqual(fails, []);
  for (const id of ['mirage_knight', 'oracle']) assert.ok(rows.some((r) => r.encounter === id && r.policy === 'reckless'), `${id}: ignoring telegraphs is measured`);
});

test('Episode 5 progression: road 21 -> 22, F1 -> 23, F2 23 to 24, F3 -> 24, the Oracle met at 24 (also at 80% of the fights)', () => {
  assert.deepEqual(progression(1).map((r) => [r.zone, r.startLevel, r.endLevel]), [
    ['ep5_ship', 21, 21], ['ep5_caravan_road', 21, 22], ['ep5_lab_f1', 22, 23], ['ep5_lab_f2', 23, 24], ['ep5_lab_f3', 24, 24],
    ['ep5_lab_oracle', 24, 25]]);
  assert.equal(progression(0.8).find((r) => r.zone === 'ep5_lab_oracle').startLevel, 24);
});
