// Combo techs (Chrono Trigger): availability rules and resolution.
import test from 'node:test';
import assert from 'node:assert/strict';
import { battle, untilTurn, midRng } from './_helpers.mjs';
import { SKILLS } from '../../src/data/skills.js';

/** Put the hero on turn with chosen partners queued right behind. */
function setup(level = 4, order = ['mira', 'bram', 'e0']) {
  const b = battle(['tome_golem'], { rng: midRng, level });
  untilTurn(b, 'hero');
  const g = b.unit('e0');
  g.hp = g.maxHp = 99999;
  const now = b.state.now;
  order.forEach((uid, i) => { b.unit(uid).next = now + 1 + i; });
  return b;
}
const combo = (b, id) => b.commands('hero').find((c) => c.id === 'combo').list.find((x) => x.skill === id);

test('a combo is offered only when the partners hold the next timeline slots', () => {
  let b = setup(4, ['mira', 'e0', 'bram']);
  assert.equal(combo(b, 'ember_edge').enabled, true);
  assert.equal(combo(b, 'cross_rend').enabled, false);
  assert.equal(combo(b, 'cross_rend').reason, 'Partners not next in line');
  assert.equal(b.commands('hero').find((c) => c.id === 'combo').visible, true);

  b = setup(4, ['e0', 'mira', 'bram']);
  assert.equal(combo(b, 'ember_edge').enabled, false);
  assert.equal(b.commands('hero').find((c) => c.id === 'combo').visible, false);
});

test('every member needs the MP, a voice and to be standing', () => {
  let b = setup();
  b.unit('mira').mp = 0;
  assert.equal(combo(b, 'ember_edge').reason, 'Mira lacks MP');
  b = setup();
  b.unit('mira').statuses.silence = { turns: 2 };
  assert.match(combo(b, 'ember_edge').reason, /silenced/);
  b = setup();
  b.unit('mira').alive = false; b.unit('mira').hp = 0;
  assert.equal(combo(b, 'ember_edge').enabled, false);
});

test('Dawnname needs all three at level 6 and all next in line', () => {
  let b = setup(4);
  assert.equal(combo(b, 'dawnname').reason, 'Needs level 6');
  b = setup(6, ['mira', 'bram', 'e0']);
  assert.equal(combo(b, 'dawnname').enabled, true);
  b = setup(6, ['mira', 'e0', 'bram']);
  assert.equal(combo(b, 'dawnname').enabled, false);
});

test('performing a combo spends every member\'s MP and turn, and both members strike', () => {
  const b = setup();
  const hero = b.unit('hero'), mira = b.unit('mira');
  const hmp = hero.mp, mmp = mira.mp, turns = b.state.partyTurns, now = b.state.now;
  const evs = b.perform({ type: 'combo', skill: 'ember_edge', target: 'e0' });
  assert.equal(hero.mp, hmp - SKILLS.ember_edge.cost.hero);
  assert.equal(mira.mp, mmp - SKILLS.ember_edge.cost.mira);
  assert.equal(b.state.partyTurns, turns + 2, 'two party turns consumed');
  assert.ok(mira.next > now + 1, 'Mira\'s queued turn was used by the combo');
  const hits = evs.filter((e) => e.type === 'damage' && e.target === 'e0').map((e) => e.source);
  assert.deepEqual(hits, ['hero', 'mira']);
  assert.ok(evs.find((e) => e.type === 'action_start').action.members.includes('mira'));
});

test('Cross Rend always chips two shields; Thorn Bulwark shields the party', () => {
  let b = setup(4, ['bram', 'mira', 'e0']);
  const g = b.unit('e0');
  g.weak = [];
  const shields = g.shields;
  b.perform({ type: 'combo', skill: 'cross_rend', target: 'e0' });
  assert.equal(g.shields, shields - 2);
  b = battle(['tome_golem'], { rng: midRng });
  untilTurn(b, 'mira');
  b.unit('e0').hp = 99999;
  b.unit('bram').next = b.state.now + 1;
  for (const u of b.living('enemy')) u.next = b.state.now + 900;
  for (const id of ['hero']) b.unit(id).next = b.state.now + 800;
  const c = b.commands('mira').find((x) => x.id === 'combo').list.find((x) => x.skill === 'thorn_bulwark');
  assert.equal(c.enabled, true);
  b.perform({ type: 'combo', skill: 'thorn_bulwark' });
  for (const id of ['hero', 'mira', 'bram']) {
    assert.ok(b.unit(id).statuses.protect && b.unit(id).statuses.regen, `${id} protected`);
  }
});
