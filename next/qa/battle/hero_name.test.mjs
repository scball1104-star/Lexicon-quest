// PLAN C13 (CRITIQUE_1): the battle once showed "Hero" while the menus showed the chosen name. The hero's battle unit
// takes the save's party member name, and a telegraph aimed at the hero names it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/game/state.js';
import { createEncounterBattle, makeRng } from '../../src/battle/rules.js';

test('C13: the battle carries the chosen hero name into the unit and its telegraphs', () => {
  const g = createGame('Wren');
  assert.equal(g.party[0].name, 'Wren');
  const { battle } = createEncounterBattle('archivore', { party: g.party, rng: makeRng(2) });
  const hero = battle.units().find((u) => u.side === 'party' && u.id === 'hero');
  assert.equal(hero.name, 'Wren');
  assert.ok(!battle.units().some((u) => u.side === 'party' && u.name === 'Hero'), 'no unit falls back to "Hero"');
});
