// Real-input bugs found by qa/realplay (issue #40). Each input here is one a player has and the bots never send:
// a button pressed while the pad is held against a blocker, MENU tapped mid-step, the tab strip by finger, and a
// finger on the glass with the touch buttons switched off.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FieldScene } from '../../src/scenes/field.js';
import { ItemsScreen } from '../../src/ui/screens/items.js';

function fieldRig({ blocked = true, moving = false, dir = 'up' } = {}) {
  const pressed = new Set();
  const log = [];
  const input = { pressed: (k) => pressed.has(k), held: () => false, heldDir: () => dir, lastDevice: 'keyboard' };
  const scene = Object.create(FieldScene.prototype);
  Object.assign(scene, {
    engine: { input, settings: {} }, leader: { moving }, pendingWarp: null, inputLocked: false, actors: [],
    abilities: { usePressed() { log.push('ability'); }, cycle() { log.push('cycle'); }, handleTouch() {} },
    tryLeaderStep() { log.push('step'); return !blocked; },
    interact() { log.push('interact'); }, openMenu() { log.push('menu'); },
  });
  return { scene, pressed, log };
}

test('A against a blocker with the pad held talks: a blocked step does not eat the button', () => {
  const { scene, pressed, log } = fieldRig();
  pressed.add('confirm');
  scene.playerInput(true, false);
  assert.deepEqual(log, ['step', 'interact']);
});

test('A with the pad held on open ground walks, it does not interact', () => {
  const { scene, pressed, log } = fieldRig({ blocked: false });
  pressed.add('confirm');
  scene.playerInput(true, false);
  assert.deepEqual(log, ['step']);
});

test('MENU against a blocker opens the menu', () => {
  const { scene, pressed, log } = fieldRig();
  pressed.add('menu');
  scene.playerInput(true, false);
  assert.deepEqual(log, ['menu']);
});

test('MENU tapped mid-step opens the menu when the step ends, and the walk does not go on first', () => {
  const { scene, pressed, log } = fieldRig({ blocked: false, moving: true });
  pressed.add('menu');
  scene.playerInput(true, false);
  pressed.clear();
  assert.deepEqual(log, [], 'nothing while the step runs');
  scene.playerInput(true, false);
  assert.deepEqual(log, [], 'the press is kept');
  scene.leader.moving = false;
  scene.playerInput(true, false);
  assert.deepEqual(log, ['menu']);
  scene.playerInput(true, false);
  assert.deepEqual(log, ['menu', 'step'], 'one press, one menu');
});

test('a kept MENU press dies when control is lost (a scene, a battle)', () => {
  const { scene, pressed, log } = fieldRig({ moving: true });
  pressed.add('menu');
  scene.playerInput(true, false);
  pressed.clear();
  scene.playerInput(false, false);
  scene.leader.moving = false;
  scene.playerInput(true, false);
  assert.ok(!log.includes('menu'));
});

function itemsRig() {
  const pointer = { pressed: false, released: false, down: false, x: 0, y: 0, type: 'touch' };
  const input = { pointer, repeatDir: () => null, pressed: () => false, consume() {}, tapIn: (x, y, w, h) => pointer.pressed && pointer.x >= x && pointer.y >= y && pointer.x < x + w && pointer.y < y + h };
  const engine = { input, audio: { sfx() {} }, touch: { visible: true }, settings: {} };
  const screen = new ItemsScreen({ engine, g: { items: { potion: 2, lantern_of_recall: 1 }, party: [] } });
  screen.enter();
  return { screen, pointer };
}

test('Key Items is reachable by finger: the tab strip turns, both ways, and the tap does not reach the list', () => {
  const { screen, pointer } = itemsRig();
  Object.assign(pointer, { pressed: true, x: 340, y: 24 });
  screen.update();
  assert.equal(screen.tab, 1);
  assert.equal(screen.list._drag, null, 'a strip tap inside the list slop must not arm a row');
  Object.assign(pointer, { x: 30, y: 14 });
  screen.update();
  assert.equal(screen.tab, 0);
});

test('Touch controls Off: a finger on the glass brings them back, the setting stays', async () => {
  const listeners = {};
  globalThis.window = { matchMedia: () => ({ matches: true }), addEventListener: (k, f) => { listeners[k] = f; } };
  const { TouchControls } = await import('../../src/core/touch.js');
  const settings = { touchControls: 'off' };
  const t = Object.assign(Object.create(TouchControls.prototype), { settings, visible: true, root: { style: {} }, input: { _setDevice() {} }, renderer: { setTouchLayout() {} }, layout() {}, _releaseAll() {} });
  t._detect();
  assert.equal(t.visible, false, 'Off hides them');
  listeners.touchstart();
  assert.equal(t.visible, true, 'a phone has no other way back');
  assert.equal(settings.touchControls, 'off');
});
