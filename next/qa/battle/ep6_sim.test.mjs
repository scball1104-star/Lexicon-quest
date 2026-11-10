// Episode 6 (E6-battle): every ordinary fight, the Gale Engine, the Storm Scribe, the Eye of the Storm as the tightest floor, Anchor
// against the Rewrite, the Gale in every Episode 6 battle and the EXP curve from the quick start (the Scribe met under Lv 28 with every
// fight) meet their targets (a smaller, still deterministic sample than the full report: node tools/sim/simulate.mjs --episode 6 --check).
import test from 'node:test';
import assert from 'node:assert/strict';
import { runSuite, checkTargets, runBattle, EPISODES } from '../../tools/sim/simulate.mjs';
import { progression, check, EP6_ZONE_ORDER, registerData, scribeMargin } from '../../tools/sim/ep6.mjs';

registerData();   // the ep4, ep5 and ep6 battle data, as the packs add them (simulate.mjs leaves them out unless run as the CLI)

test('Episode 6: ordinary fights, both bosses, the tightest floor, Anchor and the EXP curve meet the targets', () => {
  assert.deepEqual(EPISODES[6], EP6_ZONE_ORDER);
  const rows = runSuite({ n: 100, zones: EPISODES[6], elites: false });
  const fails = [...checkTargets(rows, [...progression(1), ...progression(0.8)]), ...check(rows, { runBattle, n: 60 })];
  assert.deepEqual(fails, []);
  for (const id of ['gale_engine', 'scribe']) assert.ok(rows.some((r) => r.encounter === id && r.policy === 'reckless'), `${id}: ignoring telegraphs is measured`);
});

test('Episode 6 progression: the Airstair 25, F1 -> 26, F2 -> 27, F3 27, the Scribe met at 27 under Lv 28 (also at 80%)', () => {
  assert.deepEqual(progression(1).map((r) => [r.zone, r.startLevel, r.endLevel]), [
    ['ep6_airstair', 25, 25], ['ep6_obs_f1', 25, 26], ['ep6_obs_f2', 26, 27], ['ep6_obs_f3', 27, 27], ['ep6_obs_eyrie', 27, 28]]);
  const m = scribeMargin(1);
  assert.ok(m.margin > 0, `every fight reaches the Scribe ${m.margin} EXP under Lv 28`);
  assert.equal(scribeMargin(0.8).level, 27);
});
