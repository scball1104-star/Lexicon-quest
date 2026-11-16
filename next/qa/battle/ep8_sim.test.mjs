// Episode 8 (E8-battle): every ordinary fight, the Unnamed Sentry, the Eraser, the Unwritten Page as the tightest floor, toughNotLong,
// economy8, Erasure in every Episode 8 battle and in no Episode 1 to 7 one, no foe ever rubbed out, Read Aloud and Answer against the
// telegraphs and the EXP curve from the quick start (the Eraser met under Lv 34 with every fight, elites counted) meet their targets.
// The ordinary fights run at 100 a row; the two bosses at the full report's 400 (their floors sit close to the toughNotLong lines, so a
// smaller sample reads them wrong; the same seeds as node tools/sim/simulate.mjs --episode 8 --check).
import test from 'node:test';
import assert from 'node:assert/strict';
import { runSuite, runSet, checkTargets, runBattle, EPISODES, BOSS_LEVELS } from '../../tools/sim/simulate.mjs';
import { progression, check, EP8_ZONE_ORDER, registerData, eraserMargin } from '../../tools/sim/ep8.mjs';
import { ENCOUNTERS } from '../../src/data/encounters.js';

registerData();   // the ep4 to ep8 battle data, as the packs add them (simulate.mjs leaves them out unless run as the CLI)

test('Episode 8: ordinary fights, both bosses, the tightest floor, toughNotLong, economy8, Erasure, Read Aloud, Answer and the EXP curve meet the targets', () => {
  assert.deepEqual(EPISODES[8], EP8_ZONE_ORDER);
  const rows = runSuite({ n: 100, zones: EPISODES[8], elites: false }).filter((r) => !ENCOUNTERS[r.encounter].boss);
  for (const id of ['unnamed_sentry', 'eraser']) {
    const z = ENCOUNTERS[id].zone;
    BOSS_LEVELS[id].forEach((level, i) => {
      for (const policy of i === 0 ? ['competent', 'naive', 'reckless'] : ['competent', 'naive']) rows.push(runSet({ zone: z, level, encounter: id, n: 400, policy }));
    });
  }
  const fails = [...checkTargets(rows, [...progression(1), ...progression(0.8)]), ...check(rows, { runBattle, n: 100, EPISODES })];
  assert.deepEqual(fails, []);
});

test('Episode 8 progression: the Stair 31, F1 31 -> 32, F2 32 -> 33, F3 33, the Eraser met at 33 under Lv 34 (elites counted; also at 80%)', () => {
  assert.deepEqual(progression(1).map((r) => [r.zone, r.startLevel, r.endLevel]), [
    ['ep8_stair', 31, 31], ['ep8_library_f1', 31, 32], ['ep8_library_f2', 32, 33], ['ep8_library_f3', 33, 33], ['ep8_last_word', 33, 34]]);
  const m = eraserMargin(1, { elites: true });
  assert.ok(m.margin > 0, `every fight, elites counted, reaches the Eraser ${m.margin} EXP under Lv 34`);
  assert.equal(eraserMargin(0.8).level, 33);
});
