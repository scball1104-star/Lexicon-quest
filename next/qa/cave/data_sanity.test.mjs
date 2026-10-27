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

test('B60 and B99 (EP3 fallback pools, two-mod elites): careful play still wins 85%, attack-only mostly loses', () => {
  for (const key of [60, 99]) {
    const c = checkpoint(key, { n: N });
    const cp = c.byPolicy.competent, nv = c.byPolicy.naive;
    assert.ok(cp.win >= 0.85, `B${key}: careful win ${pct(cp.win)}`);
    assert.ok(cp.rounds >= 3 && cp.rounds <= 7, `B${key}: ${cp.rounds.toFixed(2)} rounds`);
    assert.ok(nv.win <= 0.6, `B${key}: attack-only wins ${pct(nv.win)}`);
  }
  const b30 = checkpoint(30, { n: N });
  assert.ok(b30.byPolicy.naive.win <= 0.75 && b30.byPolicy.naive.win < b30.byPolicy.competent.win, `B30 attack-only ${pct(b30.byPolicy.naive.win)}`);
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
          const A = (phys ? e.atk : e.mag) * boost, D = phys ? ms.def : ms.spr;
          let max = A * sk.power / 100 * DEF_K / (DEF_K + D) * (1 + VARIANCE) * (sk.hits || 1);
          if (phys && ENEMY_CRIT > 0) max *= CRIT_MULT;
          if ((sk.types || []).includes('ink')) max *= 1 - Math.min(80, ms.inkRes || 0) / 100;
          assert.ok(Math.ceil(max) < ms.maxHp, `B${floor}: ${id} ${sk.id} can deal ${Math.ceil(max)} to ${m.id} (${ms.maxHp} HP)`);
        }
      }
    }
  }
});

test('the Binder at Lv 58: careful play wins in 8 to 16 rounds, attack-only does not, ignoring the telegraphs costs win rate or health', () => {
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
  assert.ok(c.win >= 0.85, `careful win ${pct(c.win)}`);
  assert.ok(c.rounds >= 8 && c.rounds <= 16, `careful rounds ${c.rounds.toFixed(2)}`);
  assert.ok(n.win <= 0.6, `attack-only wins ${pct(n.win)}`);
  assert.ok(r.win < c.win || r.hpLoss > c.hpLoss + 0.05 || r.kos > c.kos + 0.2, `reckless play pays nothing: win ${pct(r.win)} HP lost ${pct(r.hpLoss)} KOs ${r.kos.toFixed(2)}`);
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
