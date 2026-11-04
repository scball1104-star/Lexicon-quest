// Episode 4 (E4-battle): every ordinary fight, the Inkbound Barrister, the Paper Regent, Keep F3 as the tightest floor, Answer on
// the Strikes and the EXP curve from the quick start meet their targets (a smaller, still deterministic sample than the full
// report: node tools/sim/simulate.mjs --episode 4 --check).
import test from 'node:test';
import assert from 'node:assert/strict';
import { runSuite, checkTargets, runBattle, EPISODES } from '../../tools/sim/simulate.mjs';
import { progression, check, EP4_ZONE_ORDER, registerData } from '../../tools/sim/ep4.mjs';

registerData();   // the ep4 battle data, as the pack adds it (simulate.mjs leaves it out unless run as the CLI)

test('Episode 4: ordinary fights, both bosses, the tightest floor, Answer and the EXP curve meet the targets', () => {
  assert.deepEqual(EPISODES[4], EP4_ZONE_ORDER);
  const rows = runSuite({ n: 100, zones: EPISODES[4], elites: false });
  const fails = [...checkTargets(rows, [...progression(1), ...progression(0.8)]), ...check(rows, { runBattle, n: 60 })];
  assert.deepEqual(fails, []);
  for (const id of ['barrister', 'paper_regent']) assert.ok(rows.some((r) => r.encounter === id && r.policy === 'reckless'), `${id}: ignoring telegraphs is measured`);
});

test('Episode 4 progression: road 17 -> 18, F1 -> 19, F2 at 19, F3 -> 20, the Regent met at 20', () => {
  const p = progression(1);
  assert.deepEqual(p.map((r) => [r.zone, r.startLevel, r.endLevel]), [
    ['ep4_flood_road', 17, 18], ['ep4_keep_f1', 18, 19], ['ep4_keep_f2', 19, 19], ['ep4_keep_f3', 19, 20], ['ep4_keep_crown', 20, 21]]);
});
