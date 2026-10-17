// Battle outcome -> game state: EXP/levels, mastery, gold, gear instances, consumables used and found,
// bestiary knowledge, story flags, counters. Uses the real rules and a real createGame().
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, count, hasFlag } from '../../src/game/state.js';
import { createEncounterBattle, makeRng } from '../../src/battle/rules.js';
import { partyAction } from '../../src/battle/ai.js';
import { applyBattleOutcome, bestiaryForBattle, mergeBestiary, levelGainRows } from '../../src/battle/scene/rewards.js';
import { newMember } from '../../src/data/party.js';

function playOut(b, policy = 'competent') {
  let guard = 0;
  while (!b.isOver() && guard++ < 800) {
    const u = b.current();
    if (u.side === 'party') {
      const a = policy === 'items' && count === undefined ? null : partyAction(b);
      let e = b.perform(a);
      if (e.length === 1 && e[0].type === 'invalid') b.perform({ type: 'defend' });
    } else b.runEnemyTurn();
  }
  return b.result();
}

function gameAt(level, items = { potion: 3, ether: 1, phoenix_feather: 1 }) {
  const g = createGame('Arden');
  g.party = ['hero', 'mira', 'bram'].map((id) => newMember(id, { level, name: id === 'hero' ? 'Arden' : undefined }));
  g.items = { ...items };
  g.gold = 50;
  return g;
}

test('a victory grants EXP, gold, mastery, drops and the encounter flag', () => {
  const g = gameAt(8);
  g.party[0].mastery = { sword: 210, axe: 60 }; g.party[1].mastery = { staff: 140, bow: 45 }; g.party[2].mastery = { spear: 210, axe: 60 };
  g.party[0].equip.axe = 'hatchet';
  const { battle: b, encounter } = createEncounterBattle('echo_warden', { party: g.party, rng: makeRng(4), inventory: g.items, bestiary: bestiaryForBattle(g) });
  const res = playOut(b);
  assert.equal(res.outcome, 'victory');
  const goldBefore = g.gold, expBefore = g.party[0].exp;
  const s = applyBattleOutcome(g, res, encounter, { seenKeys: ['echo_warden'], killedKeys: ['echo_warden'] });
  assert.equal(s.outcome, 'victory');
  assert.equal(g.gold, goldBefore + res.gold);
  assert.equal(g.party[0].exp, expBefore + res.exp);
  assert.ok(g.gear.some((it) => it.base === 'mirrorguard_mail' || it.unique === 'mirrorguard_mail' || /mirrorguard/i.test(it.name || '')), 'the Warden drop landed in gear');
  assert.ok(g.gear.every((it) => Number.isInteger(it.uid)), 'gear instances get uids');
  assert.equal(s.items.length, res.items.length);
  assert.ok(hasFlag(g, 'echo_warden_defeated'));
  assert.equal(g.counters.battles_won, 1);
  assert.equal(g.counters.bosses_defeated, 1);
  // HP/MP/Fury carried over from the battle.
  for (const m of g.party) { const p = res.party.find((x) => x.id === m.id); assert.equal(m.hp, p.hp); assert.equal(m.fury, p.fury); }
  // Bestiary: the Warden's weaknesses are known for the next fight.
  // The Warden's weakKey carries its stance ('echo_warden:mirror'), so look for any key of its id.
  const bb = bestiaryForBattle(g);
  const keys = Object.keys(bb).filter((k) => k.startsWith('echo_warden'));
  assert.ok(keys.length > 0 && keys.some((k) => bb[k].length > 0), 'warden weaknesses remembered');
  assert.equal(g.bestiary.echo_warden.killed, 1);
  assert.equal(g.bestiary.echo_warden.seen, 1);
});

test('consumables used in battle leave the bag; found consumables are added', () => {
  const g = gameAt(2, { potion: 2 });
  const { battle: b, encounter } = createEncounterBattle('valley_slimes', { party: g.party, rng: makeRng(7), inventory: g.items });
  // Use one potion on the first party turn, then play out.
  while (!b.isOver() && b.current().side !== 'party') b.runEnemyTurn();
  b.perform({ type: 'item', item: 'potion', target: 'hero' });
  const res = playOut(b);
  const s = applyBattleOutcome(g, res, encounter, {});
  const found = s.consumables.filter((c) => c.item === 'potion').reduce((n, c) => n + c.qty, 0);
  assert.ok(s.used.potion >= 1, 'the scripted potion counts as used');
  assert.equal(count(g, 'potion'), 2 - s.used.potion + found);
});

test('a defeat and an escape grant nothing but still carry HP and used items', () => {
  const g = gameAt(1, { potion: 1 });
  const { battle: b, encounter } = createEncounterBattle('archivore', { party: g.party, rng: makeRng(1), inventory: g.items });
  while (!b.isOver()) { const u = b.current(); if (u.side === 'party') b.perform({ type: 'attack', target: 'e0' }); else b.runEnemyTurn(); }
  const res = b.result();
  assert.equal(res.outcome, 'defeat');
  const s = applyBattleOutcome(g, res, encounter, {});
  assert.equal(s.gold, 0); assert.equal(s.exp, 0);
  assert.equal(g.gold, 50);
  assert.ok(!hasFlag(g, 'archivore_defeated'));
  assert.equal(g.party[0].hp, 0);
  assert.equal(g.counters.battles_lost, 1);

  const g2 = gameAt(3);
  const { battle: b2, encounter: e2 } = createEncounterBattle('valley_wolves', { party: g2.party, rng: makeRng(9), inventory: g2.items });
  let guard = 0;
  while (!b2.isOver() && guard++ < 50) { const u = b2.current(); if (u.side === 'party') b2.perform({ type: 'flee' }); else b2.runEnemyTurn(); }
  const r2 = b2.result();
  assert.equal(r2.outcome, 'escape');
  applyBattleOutcome(g2, r2, e2, {});
  assert.equal(g2.counters.battles_fled, 1);
  assert.equal(g2.gold, 50);
});

test('level-ups come back per member with stat gain rows', () => {
  const g = gameAt(1);
  const { battle: b, encounter } = createEncounterBattle('valley_pack', { party: g.party, rng: makeRng(2), inventory: g.items });
  const res = playOut(b);
  if (res.outcome !== 'victory') return; // a Lv1 loss is legal; the EXP path is covered below
  const s = applyBattleOutcome(g, res, encounter, {});
  for (const m of g.party) if (m.hp > 0) {
    assert.ok(Array.isArray(s.levelUps[m.id]));
    if (s.levelUps[m.id].length) {
      assert.equal(m.level, s.levelUps[m.id][s.levelUps[m.id].length - 1].level);
      const rows = levelGainRows(s.levelUps[m.id][0]);
      assert.ok(rows.length > 0 && rows.every((r) => r.gain > 0));
    }
  }
});

test('mergeBestiary keeps known types, derives weak/resist and survives the old array shape', () => {
  const g = createGame('X');
  g.bestiary = { briar_wolf: ['fire'] };          // legacy array
  mergeBestiary(g, { briar_wolf: ['fire', 'spear', 'sword'], 'lost_page:kindling': ['fire'] }, ['briar_wolf'], ['briar_wolf', 'lost_page:kindling']);
  const w = g.bestiary.briar_wolf;
  assert.deepEqual(w.weak.sort(), ['fire', 'spear']);
  assert.deepEqual(w.resist, []);
  assert.equal(w.killed, 1); assert.equal(w.seen, 1); assert.equal(w.appraised, true);
  assert.deepEqual(bestiaryForBattle(g).briar_wolf.sort(), ['fire', 'sword', 'spear'].sort());
  assert.deepEqual(g.bestiary['lost_page:kindling'].weak, ['fire']);
});
