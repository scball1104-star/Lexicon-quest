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
