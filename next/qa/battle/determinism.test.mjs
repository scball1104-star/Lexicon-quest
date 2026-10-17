import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, makeRng } from '../../src/battle/rules.js';
import { partyAction } from '../../src/battle/ai.js';
import { battle, playOut, party } from './_helpers.mjs';

test('same seed and inputs give identical events and results', () => {
  for (const enc of [['briar_wolf', 'briar_wolf', 'ink_slime'], ['tome_golem', 'page_wraith'], ['archivore']]) {
    const lvl = enc[0] === 'archivore' ? 8 : 5;
    const a = battle(enc, { seed: 42, level: lvl, options: { boss: enc[0] === 'archivore' } });
    const b = battle(enc, { seed: 42, level: lvl, options: { boss: enc[0] === 'archivore' } });
    const ea = playOut(a);
    const eb = playOut(b);
    assert.equal(JSON.stringify(ea), JSON.stringify(eb));
    assert.deepEqual(a.result(), b.result());
  }
});

test('different seeds diverge', () => {
  const a = playOut(battle(['briar_wolf', 'briar_wolf'], { seed: 1 }));
  const b = playOut(battle(['briar_wolf', 'briar_wolf'], { seed: 2 }));
  assert.notEqual(JSON.stringify(a), JSON.stringify(b));
});

test('state is plain serializable data and a battle resumes from it exactly', () => {
  const rngA = makeRng(99);
  const a = createBattle({ party: party(5), enemies: ['page_wraith', 'bookmite', 'bookmite'], rng: rngA,
    options: { inventory: { potion: 2 } } });
  for (let i = 0; i < 6 && !a.isOver(); i++) {
    if (a.current().side === 'party') a.perform(partyAction(a)); else a.runEnemyTurn();
  }
  const snap = JSON.parse(JSON.stringify(a.state));
  assert.deepEqual(snap, a.state, 'state survives a JSON round trip');
  const rngB = makeRng(1);
  rngB.state = rngA.state;
  const b = createBattle({ state: snap, rng: rngB });
  const run = (x) => {
    const evs = [];
    for (let i = 0; i < 400 && !x.isOver(); i++) evs.push(...(x.current().side === 'party' ? x.perform(partyAction(x)) : x.runEnemyTurn()));
    return evs;
  };
  assert.equal(JSON.stringify(run(a)), JSON.stringify(run(b)));
  assert.deepEqual(a.result(), b.result());
});

test('rules never use Math.random', async () => {
  const fs = await import('node:fs');
  for (const f of ['rules.js', 'ctb.js', 'ai.js', 'loot.js', 'status.js']) {
    const src = fs.readFileSync(new URL(`../../src/battle/${f}`, import.meta.url), 'utf8');
    assert.ok(!src.includes('Math.random'), `${f} uses Math.random`);
    assert.ok(!/\b(document|window|setTimeout|setInterval|requestAnimationFrame)\b/.test(src), `${f} touches the DOM or timers`);
  }
});
