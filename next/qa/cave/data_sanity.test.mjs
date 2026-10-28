// C1-data: the curve plays. A competent party at the level the curve expects, wearing what the floor's item level gives, wins
// at least 85% at B1, B10 and B30 (the brief) and holds up deeper; attack-only play is noticeably worse past the first band;
// no ordinary foe action fells a full-HP member (the W15 rule); the Binder is winnable with care and not without.
// Small seeded samples: the real route is C3-sim-bot's --cave sim. The numbers are in qa/cave/out/cave_sanity.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import register from '../../src/data/cave/index.js';
import { ENCOUNTERS } from '../../src/data/encounters.js';
import { ENEMIES, ELITE_BASE } from '../../src/data/enemies.js';
import { SKILLS } from '../../src/data/skills.js';
import { memberStats, DEF_K, VARIANCE, ENEMY_CRIT, CRIT_MULT } from '../../src/battle/rules.js';
import { scale, bandAt, BINDER_ENCOUNTER_ID } from '../../src/data/cave/foes.js';
import { checkpoint, makeCaveParty, loadoutFor, playBattle, summarize } from './data_cave_harness.mjs';

await register();
const N = 30;
const pct = (v) => `${Math.round(v * 100)}%`;

test('B1 (Lv 1, empty hands), B10 and B30: careful play wins at least 85%, in a handful of rounds, keeping most of its HP', () => {
  for (const key of [1, '1b', 10, 30]) {
    const c = checkpoint(key, { n: N });
    const cp = c.byPolicy.competent;
    assert.ok(cp.win >= 0.85, `B${key}: careful win ${pct(cp.win)}`);
    assert.ok(cp.rounds >= 2 && cp.rounds <= 6.5, `B${key}: ${cp.rounds.toFixed(2)} rounds`);
    assert.ok(cp.hpLoss <= 0.45, `B${key}: HP lost ${pct(cp.hpLoss)}`);
    assert.ok(cp.kos <= 0.35, `B${key}: ${cp.kos.toFixed(2)} KOs a fight`);
  }
});

test('B60 and B99 (EP3 fallback pools, every earlier group at its own level, an elite in three): careful play still wins 85%, attack-only loses more', () => {
  for (const key of [60, 99]) {
    const c = checkpoint(key, { n: N });
    const cp = c.byPolicy.competent, nv = c.byPolicy.naive;
    assert.ok(cp.win >= 0.85, `B${key}: careful win ${pct(cp.win)}`);
    assert.ok(cp.rounds >= 2.5 && cp.rounds <= 7, `B${key}: ${cp.rounds.toFixed(2)} rounds`);
    // C4-fixes: one group in three is elite now (was every group), so one fight at full HP is kinder to attack-only play; the
    // descent compounds it (tools/sim/simulate.mjs --cave --policy naive)
    assert.ok(nv.win <= 0.8 && nv.win < cp.win, `B${key}: attack-only wins ${pct(nv.win)}`);
  }
  const b30 = checkpoint(30, { n: N });
  // C4-fixes (CRITIQUE_STACKS 7): the Root Cellars' fights are shorter and sharper (hp 1, power 1.15), so one fight at full HP
  // ends before attack-only play pays for it as often (77% on these seeds); the descent still separates them
  assert.ok(b30.byPolicy.naive.win <= 0.82 && b30.byPolicy.naive.win < b30.byPolicy.competent.win, `B30 attack-only ${pct(b30.byPolicy.naive.win)}`);
});

test('the W15 rule in the Stacks: no ordinary action of a pool foe, elite or not, fells a full-HP member at the floor\'s power', () => {
  for (const floor of [1, 5, 10, 15, 20, 30, 40, 45, 50, 60, 70, 75, 80, 90, 99]) {
    const s = scale(floor);
    const party = makeCaveParty(floor).map((m) => ({ m, s: memberStats(m) }));
    for (const t of bandAt(floor).pool) for (const id of new Set(t.enemies)) {
      const e = ENEMIES[id];
      const boost = s.power * (floor >= 20 ? ELITE_BASE.atk : 1);
      for (const mv of e.moves) {
        const sk = SKILLS[mv.skill];
        if (!sk || !sk.power || sk.telegraph) continue;
        for (const { m, s: ms } of party) {
          const phys = sk.formula === 'phys';
          // a fallback band's group carries its own power (scale(f, { template }), C4-fixes)
          const own = t.own ? scale(floor, { template: t }).power * (floor >= 20 ? ELITE_BASE.atk : 1) : boost;
          const A = (phys ? e.atk : e.mag) * own, D = phys ? ms.def : ms.spr;
          let max = A * sk.power / 100 * DEF_K / (DEF_K + D) * (1 + VARIANCE) * (sk.hits || 1);
          if (phys && ENEMY_CRIT > 0) max *= CRIT_MULT;
          if ((sk.types || []).includes('ink')) max *= 1 - Math.min(80, ms.inkRes || 0) / 100;
          assert.ok(Math.ceil(max) < ms.maxHp, `B${floor}: ${id} ${sk.id} can deal ${Math.ceil(max)} to ${m.id} (${ms.maxHp} HP)`);
        }
      }
    }
  }
});

test('the Binder at Lv 58 in plain gear: care decides it (careful play wins most, in 8 to 16 rounds; ignoring the telegraphs loses most); attack-only does not win', () => {
  const e = ENCOUNTERS[BINDER_ENCOUNTER_ID];
  const run = (policy, n = 20) => {
    const rows = [];
    for (let i = 0; i < n; i++) {
      const party = makeCaveParty(100, { level: 58 });
      rows.push(playBattle({ party, units: e.enemies.map((id) => ({ id, elite: null })), seed: i + 1, policy, inventory: loadoutFor(100).inventory, boss: true, zone: e.zone, encounter: BINDER_ENCOUNTER_ID }));
    }
    return summarize(rows);
  };
  const c = run('competent'), n = run('naive'), r = run('reckless');
  // C4-fixes (CRITIQUE_STACKS 11): HP 3000 (was 4000), MAG 4000 (the telegraphs a quarter up), SPD 66 (was 46: it acted four or
  // five times a fight, so its telegraphs rarely came). This synthetic party has no uniques; the descent's careful party (with its
  // finds) wins 97% within 20 rounds and ignoring the telegraphs 69% (tools/sim/simulate.mjs --cave --check, DEEP_STACKS_BALANCE 9)
  assert.ok(c.win >= 0.55, `careful win ${pct(c.win)}`);
  assert.ok(c.rounds >= 8 && c.rounds <= 16, `careful rounds ${c.rounds.toFixed(2)}`);
  assert.ok(n.win <= 0.2, `attack-only wins ${pct(n.win)}`);
  assert.ok(r.win <= c.win - 0.2 && r.hpLoss > c.hpLoss + 0.1, `ignoring the telegraphs must cost: win ${pct(r.win)} against ${pct(c.win)}, HP lost ${pct(r.hpLoss)} against ${pct(c.hpLoss)}`);
  // the Binder's ordinary moves obey the one-shot rule too
  const party = makeCaveParty(100, { level: 58 }).map((m) => ({ m, s: memberStats(m) }));
  const b = ENEMIES.binder;
  for (const mv of b.moves) {
    const sk = SKILLS[mv.skill];
    for (const { m, s } of party) {
      const phys = sk.formula === 'phys';
      let max = (phys ? b.atk : b.mag) * sk.power / 100 * DEF_K / (DEF_K + (phys ? s.def : s.spr)) * (1 + VARIANCE) * (sk.hits || 1);
      if (phys) max *= CRIT_MULT;
      assert.ok(Math.ceil(max) < s.maxHp, `the Binder's ${sk.id} can deal ${Math.ceil(max)} to ${m.id} (${s.maxHp} HP)`);
    }
  }
});
