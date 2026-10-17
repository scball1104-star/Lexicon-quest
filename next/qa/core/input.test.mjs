import test from 'node:test';
import assert from 'node:assert/strict';
import { ActionState, ACTIONS, REPEAT_DELAY, REPEAT_RATE, DEFAULT_KEYS } from '../../src/core/input.js';

test('action list and default keys match DESIGN 3', () => {
  assert.deepEqual(ACTIONS, ['up', 'down', 'left', 'right', 'confirm', 'cancel', 'menu', 'run', 'pageL', 'pageR', 'start']);
  assert.ok(DEFAULT_KEYS.confirm.includes('KeyZ') && DEFAULT_KEYS.confirm.includes('Enter') && DEFAULT_KEYS.confirm.includes('Space'));
  assert.ok(DEFAULT_KEYS.cancel.includes('KeyX') && DEFAULT_KEYS.cancel.includes('Escape') && DEFAULT_KEYS.cancel.includes('Backspace'));
  assert.ok(DEFAULT_KEYS.menu.includes('KeyC') && DEFAULT_KEYS.menu.includes('Tab'));
  assert.ok(DEFAULT_KEYS.run.includes('ShiftLeft'));
  assert.deepEqual([DEFAULT_KEYS.pageL[0], DEFAULT_KEYS.pageR[0]], ['KeyQ', 'KeyE']);
  for (const [d, k] of [['up', 'KeyW'], ['left', 'KeyA'], ['down', 'KeyS'], ['right', 'KeyD']]) assert.ok(DEFAULT_KEYS[d].includes(k));
});

test('pressed is an edge, held is a level, released is an edge', () => {
  const s = new ActionState();
  s.set('confirm', 'kb:KeyZ', true);
  s.update();
  assert.equal(s.pressed('confirm'), true);
  assert.equal(s.held('confirm'), true);
  s.update();
  assert.equal(s.pressed('confirm'), false);
  assert.equal(s.held('confirm'), true);
  s.set('confirm', 'kb:KeyZ', false);
  s.update();
  assert.equal(s.held('confirm'), false);
  assert.equal(s.released('confirm'), true);
  s.update();
  assert.equal(s.released('confirm'), false);
});

test('a tap shorter than one frame still registers once', () => {
  const s = new ActionState();
  s.set('cancel', 'kb:KeyX', true);
  s.set('cancel', 'kb:KeyX', false);
  s.update();
  assert.equal(s.pressed('cancel'), true);
  s.update();
  assert.equal(s.pressed('cancel'), false);
  assert.equal(s.held('cancel'), false);
});

test('two sources holding one action: release only when both let go', () => {
  const s = new ActionState();
  s.set('up', 'kb:ArrowUp', true); s.update();
  s.set('up', 'kb:KeyW', true); s.update();
  assert.equal(s.pressed('up'), false, 'second key does not re-press');
  s.set('up', 'kb:ArrowUp', false); s.update();
  assert.equal(s.held('up'), true);
  s.set('up', 'kb:KeyW', false); s.update();
  assert.equal(s.held('up'), false);
});

test('repeat: on press, then at 18 frames, then every 5', () => {
  const s = new ActionState();
  s.set('down', 'pad', true);
  const fired = [];
  for (let f = 1; f <= 40; f++) { s.update(); if (s.repeat('down')) fired.push(f); }
  assert.equal(REPEAT_DELAY, 18); assert.equal(REPEAT_RATE, 5);
  assert.deepEqual(fired, [1, 18, 23, 28, 33, 38]);
});

test('heldDir returns the most recently pressed held direction', () => {
  const s = new ActionState();
  s.set('right', 'a', true); s.update();
  assert.equal(s.heldDir(), 'right');
  s.set('up', 'b', true); s.update();
  assert.equal(s.heldDir(), 'up');
  s.set('up', 'b', false); s.update();
  assert.equal(s.heldDir(), 'right', 'falls back to the still-held direction');
  s.set('right', 'a', false); s.update();
  assert.equal(s.heldDir(), null);
});

test('consume clears an edge for the rest of the frame; disabled state reads nothing', () => {
  const s = new ActionState();
  s.set('confirm', 'x', true); s.update();
  s.consume('confirm');
  assert.equal(s.pressed('confirm'), false);
  assert.equal(s.held('confirm'), true);
  s.enabled = false;
  assert.equal(s.held('confirm'), false);
  assert.equal(s.heldDir(), null);
});

test('releaseSource drops one device (pad disconnect / window blur)', () => {
  const s = new ActionState();
  s.set('left', 'pad', true); s.set('confirm', 'kb:KeyZ', true); s.update();
  s.releaseSource('pad'); s.update();
  assert.equal(s.held('left'), false);
  assert.equal(s.held('confirm'), true);
});
