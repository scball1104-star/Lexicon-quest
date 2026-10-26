// X1 fix pass (B1): the touch FLEE button's second tap must CLOSE the command menu before the flee action is performed.
// Before the fix the menu stayed open over the queued flee ops, runOps never started, and the battle sat frozen.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleScene } from '../../src/scenes/battle.js';
import { CommandMenu } from '../../src/battle/scene/menu.js';
import { HELP_TOUCH_BTNS } from '../../src/battle/scene/layout.js';
import { battle } from '../battle/_helpers.mjs';

function rig({ canFlee = true } = {}) {
  const b = battle([{ id: 'ink_slime' }, { id: 'ink_slime' }]);
  b.state.options.canFlee = canFlee;
  let tapped = false;
  const base = {
    tapIn(x, y, w, h) {
      const f = HELP_TOUCH_BTNS.flee;
      return tapped && x === f.x && y === f.y && w === f.w && h === f.h;
    },
  };
  const input = new Proxy(base, { get: (t, k) => (k in t ? t[k] : () => null) });
  const audio = { sfx() {}, pushMusic() {} };
  const engine = { input, audio, touch: { visible: true }, settings: {}, setSetting() {} };
  const performed = [];
  const scene = {
    engine, b, phase: 'play', below: null, auto: false, actors: new Map(), speed: 1,
    touchButtons() { return BattleScene.prototype.touchButtons.call(this); },
    runOps() { return false; },
    performParty(a) { performed.push({ a, menuState: this.menu.state }); },
  };
  scene.menu = new CommandMenu(scene);
  scene.menu.open(b.current().side === 'party' ? b.current() : (() => { while (b.current().side !== 'party') b.runEnemyTurn(); return b.current(); })());
  const tick = () => { tapped = true; BattleScene.prototype.updatePlay.call(scene); tapped = false; };
  return { scene, tick, performed };
}

test('touch FLEE: first tap arms, second tap closes the menu then runs', () => {
  const { scene, tick, performed } = rig();
  assert.equal(scene.menu.state, 'root');
  tick();
  assert.equal(performed.length, 0, 'the first tap only arms');
  assert.ok(scene.menu.fleeArmed > 0);
  assert.equal(scene.menu.state, 'root');
  tick();
  assert.equal(performed.length, 1, 'the second tap flees');
  assert.equal(performed[0].a.type, 'flee');
  assert.equal(performed[0].menuState, 'closed', 'the menu must be closed when the flee is performed (else runOps never starts)');
  assert.equal(scene.menu.state, 'closed');
  assert.equal(scene.menu.fleeArmed, 0);
});

test('touch FLEE: an unfleeable fight never closes the menu or flees', () => {
  const { scene, tick, performed } = rig({ canFlee: false });
  tick(); tick();
  assert.equal(performed.length, 0);
  assert.equal(scene.menu.state, 'root');
});
