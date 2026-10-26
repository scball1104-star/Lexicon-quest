// X1-battle: the sim additions. The new zones and bosses meet the sim targets, and the optional-EXP ledger (tools/sim/optional_exp.mjs)
// reports the completionist's level at every main boss and fails only when a main boss turns into a pushover.
// Scott (2026-10-25): full EXP, the extra levels are accepted, so there is no "one level over" cap any more.
import test from 'node:test';
import assert from 'node:assert/strict';
import { runSuite, checkTargets, runSet, TARGETS, BOSS_TARGETS, BOSS_LEVELS, SUITE_LEVELS, EPISODES, progression } from '../../tools/sim/simulate.mjs';
import { completionRows, bossRows, checkOptionalCaps, registerOptionalSources, OPTIONAL_SOURCES, INTENDED_ORDER, CHECKPOINTS, PUSHOVER } from '../../tools/sim/optional_exp.mjs';
import { levelForExp } from '../../src/data/party.js';

const X1_ZONES = ['x1_downs', 'x1_highmoor', 'x1_barrow', 'x1_larchhill', 'x1_millrace', 'x1_terrace', 'x1_cellar', 'x1_culvert'];

test('the registry: the new zones, bosses and targets are added and no existing target or level changed', () => {
  assert.deepEqual(SUITE_LEVELS.x1_downs, [3, 4]); assert.deepEqual(SUITE_LEVELS.x1_culvert, [6, 7]);
  assert.deepEqual(BOSS_LEVELS.barrow_reeve, [5, 6]); assert.deepEqual(BOSS_LEVELS.millstone_golem, [6, 7]);
  assert.deepEqual(BOSS_LEVELS.archivore, [8]); assert.deepEqual(BOSS_LEVELS.echo_warden, [5, 6]);
  assert.ok(BOSS_TARGETS.includes('barrow_reeve') && BOSS_TARGETS.includes('millstone_golem') && BOSS_TARGETS.includes('archivore'));
  assert.deepEqual(TARGETS.barrow_reeve, { roundsMin: 6, roundsMax: 9, winMin: 0.85, naiveWinMax: 0.6 });
  assert.deepEqual(TARGETS.archivore, { roundsMin: 8, roundsMax: 12, winMin: 0.85, naiveWinMax: 0.6, recklessWorse: 0.15 });
  assert.deepEqual(TARGETS.levels.archive_boss, { start: [8, 8], end: [8, 10] });
  assert.deepEqual(Object.keys(TARGETS.levels).slice(0, 5), ['valley', 'archive_f1', 'archive_f2', 'archive_f3', 'archive_boss']);
  for (const z of X1_ZONES) assert.ok(!(z in TARGETS.levels), `${z} is not on the route`);
  for (const z of X1_ZONES) assert.ok(EPISODES[1].includes(z));
});

test('the eight new zones and both bosses meet the sim targets (smaller sample than the full report)', () => {
  const rows = runSuite({ n: 60, zones: X1_ZONES, elites: false });
  assert.deepEqual(checkTargets(rows, []), []);
  for (const id of ['barrow_reeve', 'millstone_golem']) {
    const comp = rows.filter((r) => r.encounter === id && r.policy === 'competent');
    const naive = rows.filter((r) => r.encounter === id && r.policy === 'naive');
    assert.equal(comp.length, 2); assert.equal(naive.length, 2);
    for (const r of comp) assert.ok(r.win >= 0.85 && r.rounds >= 6 && r.rounds <= 9, `${id} Lv${r.level}: win ${r.win} rounds ${r.rounds}`);
    for (const r of naive) assert.ok(r.win <= 0.6, `${id} Lv${r.level}: attack-only wins ${r.win}`);
  }
});

test('the ledger: the main route\'s numbers are the sim\'s, and the completionist\'s level is reported at every main boss', () => {
  const p1 = progression(1), p2 = progression(1, 2);
  const cp = Object.fromEntries(CHECKPOINTS.map((c) => [c.id, c]));
  assert.equal(cp.archivore.regular, p1[3].exp); assert.equal(cp.ep1_end.regular, p1[4].exp);
  assert.equal(cp.nameless_king.regular, p2[3].exp);
  assert.equal(cp.echo_warden.regular, 448);
  const rows = completionRows(1, { n: 60 });
  assert.deepEqual(rows.map((r) => r.id), ['echo_warden', 'archivore', 'ep1_end']);
  for (const r of rows) {
    assert.ok(r.extraBase > 0 && r.expMean >= r.exp && r.expWorst >= r.expMean, r.id);
    assert.equal(r.level, levelForExp(Math.round(r.expMean)));
    assert.ok(r.level >= r.regularLevel, `${r.id}: the completionist is never below today's level`);
  }
  // earlier checkpoints see fewer sources, and every source is counted once by the end
  assert.ok(rows[0].extraBase < rows[1].extraBase && rows[1].extraBase < rows[2].extraBase);
  assert.equal(rows[2].sources.length, OPTIONAL_SOURCES[1].length);
  assert.deepEqual(INTENDED_ORDER[1], OPTIONAL_SOURCES[1].map((s) => s.id));
  // Episode 2 rows carry Episode 1's completionist
  const r2 = completionRows(2, { n: 60 });
  assert.deepEqual(r2.map((r) => r.id), ['other_selves', 'nameless_king']);
  assert.equal(r2[1].extraBase, rows[2].extraBase, 'until Episode 2 registers sources the carry is Episode 1\'s');
});

test('no main boss is a pushover at the completionist\'s level (the check fails only on something broken)', () => {
  const rows = completionRows(1, { n: 60 });
  const bosses = bossRows(rows, { runSet, n: 60 });
  assert.deepEqual(bosses.map((b) => b.id), ['echo_warden', 'archivore']);
  for (const b of bosses) assert.ok(!b.pushover && b.win >= 0.5, `${b.label} at Lv ${b.level}: win ${b.win} rounds ${b.rounds} hp lost ${b.hpLoss}`);
  assert.deepEqual(checkOptionalCaps({ n: 60, episodes: [1], runSet, bossN: 60 }), []);
  // the check does fire: a boss made trivial is reported
  const fake = [{ ...rows[0], level: 30 }];
  const bad = bossRows(fake, { runSet, n: 20 });
  assert.ok(bad[0].pushover, 'an Echo Warden met at Lv 30 is a pushover');
  assert.ok(PUSHOVER.roundsFrac > 0 && PUSHOVER.hpLoss > 0);
});

test('Episode 2 plugs in with data: registerOptionalSources adds a source its checkpoint counts', () => {
  const before = completionRows(2, { n: 20 });
  registerOptionalSources(2, [{ id: 't_x2_probe', kind: 'quest', exp: 100, gate: 'test', by: 'other_selves' }]);
  try {
    const after = completionRows(2, { n: 20 });
    assert.equal(after[0].extraBase, before[0].extraBase + 100);
    assert.equal(after[1].extraBase, before[1].extraBase + 100);
    assert.ok(INTENDED_ORDER[2].includes('t_x2_probe'));
  } finally {
    OPTIONAL_SOURCES[2].splice(OPTIONAL_SOURCES[2].findIndex((s) => s.id === 't_x2_probe'), 1);
    INTENDED_ORDER[2].splice(INTENDED_ORDER[2].indexOf('t_x2_probe'), 1);
  }
});
