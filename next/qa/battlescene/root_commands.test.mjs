// Defend, Swap and Flee are confirmed straight off the root command list (no sub-list, no target). The scene must CLOSE
// the command menu before it performs them: an open menu keeps runOps from starting, so before the fix the turn was
// taken in the model but never played, and the battle sat frozen with the command window up (Scott's report,
// 2026-10-28). The touch FLEE button had the same bug on its own path (flee_tap.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleScene } from '../../src/scenes/battle.js';
import { CommandMenu } from '../../src/battle/scene/menu.js';
import { battle } from '../battle/_helpers.mjs';

function rig(who) {
  const b = battle([{ id: 'ink_slime' }, { id: 'ink_slime' }], { options: { canFlee: true } });
  while (b.current().uid !== who) b.current().side === 'party' ? b.perform({ type: 'defend' }) : b.runEnemyTurn();
  let confirm = false;
  const base = { pressed: (k) => confirm && k === 'confirm', tapIn: () => false, repeatDir: () => null, pointer: null };
  const input = new Proxy(base, { get: (t, k) => (k in t ? t[k] : () => null) });
  const audio = { sfx() {}, pushMusic() {} };
  const engine = { input, audio, touch: { visible: false }, settings: {}, setSetting() {} };
  const performed = [];
  const scene = {
    engine, b, phase: 'play', below: null, auto: false, actors: new Map(), speed: 1,
    touchButtons() { return null; },
    runOps() { return false; },
    performParty(a) { performed.push({ a, menuState: this.menu.state }); },
  };
  scene.menu = new CommandMenu(scene);
  scene.menu.open(b.current());
  const press = (id) => {
    const i = scene.menu.root.items.findIndex((x) => x.id === id);
    assert.ok(i >= 0, `${id} is on the root list`);
    scene.menu.root.moveTo(i);
    confirm = true; BattleScene.prototype.updatePlay.call(scene); confirm = false;
  };
  return { scene, press, performed };
}

for (const [cmd, who] of [['defend', 'hero'], ['swap', 'mira'], ['flee', 'hero']]) {
  test(`${cmd} off the root list closes the menu, then performs`, () => {
    const { scene, press, performed } = rig(who);
    assert.equal(scene.menu.state, 'root');
    press(cmd);
    assert.equal(performed.length, 1, `${cmd} is performed once`);
    assert.equal(performed[0].a.type, cmd);
    assert.equal(performed[0].menuState, 'closed', 'the menu must be closed when the action is performed (else runOps never starts)');
    assert.equal(scene.menu.state, 'closed');
  });
}

test('attack still goes through targeting, and confirming the target closes the menu', () => {
  const { scene, press, performed } = rig('hero');
  press('attack');
  assert.equal(performed.length, 0, 'the first confirm opens targeting');
  assert.equal(scene.menu.state, 'target');
  const base = scene.engine.input;
  scene.engine.input = new Proxy({}, { get: (t, k) => (k === 'pressed' ? (x) => x === 'confirm' : k === 'consume' ? () => {} : k === 'tapIn' ? () => false : base[k]) });
  BattleScene.prototype.updatePlay.call(scene);
  assert.equal(performed.length, 1);
  assert.equal(performed[0].a.type, 'attack');
  assert.equal(performed[0].menuState, 'closed');
});
