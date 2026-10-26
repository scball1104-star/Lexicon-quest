// Robustness: random legal actions across every encounter (elites forced on) must never throw, must end,
// and must keep every unit inside its bounds.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createEncounterBattle, makeRng, FURY_MAX } from '../../src/battle/rules.js';
import { ENCOUNTERS } from '../../src/data/encounters.js';
import { makeParty } from '../../tools/sim/simulate.mjs';

function randomAction(b, rng) {
  const u = b.current();
  const cmds = b.commands(u).filter((c) => c.enabled);
  for (let tries = 0; tries < 8; tries++) {
    const c = cmds[Math.floor(rng.next() * cmds.length)];
    let action;
    if (c.list) {
      const entries = c.list.filter((x) => x.enabled);
      if (!entries.length) continue;
      const e = entries[Math.floor(rng.next() * entries.length)];
      action = c.id === 'item' ? { type: 'item', item: e.item } : { type: c.id === 'combo' ? 'combo' : 'skill', skill: e.skill };
    } else action = { type: c.id };
    const t = b.targets(u, action);
    if (t.mode === 'single') {
      if (!t.ids.length) continue;
      action.target = t.ids[Math.floor(rng.next() * t.ids.length)];
    }
    return action;
  }
  return { type: 'defend' };
}

test('random play never breaks the rules engine', () => {
  const zoneOf = { valley: 'valley', archive_f1: 'archive_f1', archive_f2: 'archive_f2', archive_f3: 'archive_f3', archive_boss: 'archive_boss',
    whisperwood_hollow: 'whisperwood_hollow', east_road: 'east_road', court_f1: 'court_f1', court_f2: 'court_f2', court_f3: 'court_f3',
    court_throne: 'court_throne', sand_road: 'sand_road', foundry_f1: 'foundry_f1', foundry_f2: 'foundry_f2', foundry_f3: 'foundry_f3',
    foundry_heart: 'foundry_heart',
    // Episode 1 expansion (tools/sim/x1.mjs registers the loadouts)
    x1_downs: 'x1_downs', x1_highmoor: 'x1_highmoor', x1_barrow: 'x1_barrow', x1_larchhill: 'x1_larchhill', x1_millrace: 'x1_millrace',
    x1_terrace: 'x1_terrace', x1_cellar: 'x1_cellar', x1_culvert: 'x1_culvert' };
  const levels = { valley: 3, archive_f1: 4, archive_f2: 6, archive_f3: 7, archive_boss: 8, whisperwood_hollow: 7,
    east_road: 9, court_f1: 10, court_f2: 11, court_f3: 12, court_throne: 13,
    sand_road: 13, foundry_f1: 14, foundry_f2: 15, foundry_f3: 16, foundry_heart: 16,
    x1_downs: 4, x1_highmoor: 5, x1_barrow: 6, x1_larchhill: 6, x1_millrace: 6, x1_terrace: 7, x1_cellar: 7, x1_culvert: 7 };
  let battles = 0;
  for (const enc of Object.values(ENCOUNTERS)) {
    for (let seed = 1; seed <= 14; seed++) {
      const rng = makeRng(seed * 31 + enc.id.length);
      const zone = zoneOf[enc.zone];
      const { battle: b } = createEncounterBattle(enc.id, {
        party: makeParty(zone, levels[zone]), rng, eliteRate: 1,
        inventory: { potion: 3, hi_potion: 1, ether: 2, phoenix_feather: 2, echo_herb: 1, antidote: 1, eye_drops: 1, silver_salve: 1, hi_ether: 1, quench_flask: 3 },
        flags: ['bram_memory_3'],   // Tempered Oath is in Bram's list, so random play casts it too
      });
      const pick = makeRng(seed + 1000);
      let steps = 0;
      while (!b.isOver() && steps++ < 2000) {
        const u = b.current();
        assert.ok(u && u.alive, `${enc.id}: current unit must be alive`);
        const evs = u.side === 'party' ? b.perform(randomAction(b, pick)) : b.runEnemyTurn();
        for (const e of evs) assert.ok(e && typeof e.type === 'string');
        assert.ok(!(evs.length === 1 && evs[0].type === 'invalid' && u.side === 'enemy'), `${enc.id}: enemy turn invalid`);
        for (const x of b.units()) {
          assert.ok(x.hp >= 0 && x.hp <= x.maxHp, `${enc.id} ${x.uid} hp ${x.hp}/${x.maxHp}`);
          assert.ok(x.mp >= 0 && x.mp <= x.maxMp, `${enc.id} ${x.uid} mp ${x.mp}/${x.maxMp}`);
          assert.ok(x.fury >= 0 && x.fury <= FURY_MAX);
          if (x.side === 'enemy') assert.ok(x.shields >= 0 && x.shields <= x.maxShields);
          assert.equal(x.alive, x.hp > 0, `${enc.id} ${x.uid} alive flag`);
          assert.ok(Number.isFinite(x.next));
        }
      }
      assert.ok(b.isOver(), `${enc.id} seed ${seed} did not end in 2000 steps`);
      const r = b.result();
      assert.ok(['victory', 'defeat', 'escape'].includes(r.outcome));
      battles++;
    }
  }
  assert.ok(battles > 200);
});
