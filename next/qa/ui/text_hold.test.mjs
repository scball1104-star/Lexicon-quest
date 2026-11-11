// Issue #74 fix 4 (docs/ACCESSIBILITY.md item 7): Text speed reaches the text on a clock. Slow doubles how long a
// toast, a cold-open toll caption and a title card stay up; Normal, Fast and Instant keep the shipped times.
import test from 'node:test';
import assert from 'node:assert/strict';
import { textHold } from '../../src/ui/text.js';
import { Toasts } from '../../src/ui/toast.js';
import { TitleCardScene } from '../../src/scenes/titleCard.js';
import { ColdOpenOverlay } from '../../src/scenes/prologue.js';
import { TOLL_HOLD } from '../../src/data/story/ep1.js';
import { COLD_OPEN_START } from '../../src/game/state.js';

const SLOW = 1, NORMAL = 2;

test('textHold: Slow doubles, every other speed keeps the frames', () => {
  assert.equal(textHold(90, { textSpeed: SLOW }), 180);
  for (const s of [2, 3, 4]) assert.equal(textHold(90, { textSpeed: s }), 90, `speed ${s}`);
  assert.equal(textHold(90, null), 90, 'no settings: unchanged');
});

/** Frames a toast stays on screen (its slide in, hold and slide out), driven by Toasts._advance. */
function toastLife(textSpeed, show) {
  const engine = { frame: 0, settings: { textSpeed }, audio: { sfx() {}, jingle() {} }, renderer: { flash() {} } };
  const t = new Toasts(engine);
  let done = false;
  show(t).then(() => { done = true; });
  t._advance();
  const start = engine.frame;
  while (t.current && engine.frame < 2000) { engine.frame++; t._advance(); }
  return { frames: engine.frame - start, done };
}

test('toasts: 1.5 s holds at Normal, 3 s at Slow (an item toast and a short notice)', () => {
  const normal = toastLife(NORMAL, (t) => t.show({ text: 'Received Potion' }));
  const slow = toastLife(SLOW, (t) => t.show({ text: 'Received Potion' }));
  assert.equal(normal.frames, 8 + 90 + 8, 'Normal is unchanged: slide 8, hold 90, slide 8');
  assert.equal(slow.frames, 8 + 180 + 8, 'Slow holds twice as long');
  assert.equal(toastLife(SLOW, (t) => t.flash('Saved.')).frames, 8 + 120 + 8, 'a 60-frame notice holds 120 at Slow');
  assert.equal(toastLife(NORMAL, (t) => t.flash('Saved.')).frames, 8 + 60 + 8);
});

test('title cards: the hold doubles at Slow, Normal unchanged, a press still cuts it', () => {
  const card = (textSpeed, frames) => { const s = new TitleCardScene({ settings: { textSpeed }, input: {} }); s.enter({ text: 'Episode 2', frames }); return s.hold; };
  assert.equal(card(NORMAL, 180), 180);
  assert.equal(card(SLOW, 180), 360);
  assert.equal(card(NORMAL), 240, 'the default 240');
  assert.equal(card(SLOW), 480);
  // confirm still skips at Slow
  let pressed = false;
  const input = { pressed: (a) => pressed && a === 'confirm', consume() {}, pointer: { pressed: false } };
  const s = new TitleCardScene({ settings: { textSpeed: SLOW }, input, pop() {} });
  s.enter({ text: 'x', frames: 100 });
  for (let i = 0; i < 25; i++) s.update();
  assert.equal(s.phase, 'hold');
  pressed = true; s.update();
  assert.equal(s.phase, 'out', 'a press ends the hold');
});

/** How many frames toll 1's caption is drawn on the cold-open tower. */
function captionFrames(textSpeed) {
  const drawn = [];
  const r = { W: 384, measure: () => 80, withAlpha: (a, fn) => fn(), rect() {}, text: (t) => drawn.push(t) };
  const game = { flags: { toll_1: true } };
  const field = { name: 'field', map: { id: COLD_OPEN_START.map }, dead: false, fadeAlpha: 0, frame: 0 };
  const engine = { frame: 0, game, stack: [field], settings: { textSpeed }, after() {} };
  const ov = new ColdOpenOverlay(engine);
  ov.handedOff = true;   // only the toll caption, not the opening line
  let frames = 0;
  for (let i = 0; i < 1000; i++) {
    drawn.length = 0; ov.draw(r);
    if (drawn.length) frames++;
    engine.frame++;
  }
  return frames;
}

test('cold open: a toll caption lives TOLL_HOLD frames at Normal and twice that at Slow', () => {
  const normal = captionFrames(NORMAL), slow = captionFrames(SLOW);
  assert.ok(Math.abs(normal - TOLL_HOLD) <= 1, `Normal ~${TOLL_HOLD} (got ${normal})`);
  assert.ok(Math.abs(slow - 2 * TOLL_HOLD) <= 1, `Slow ~${2 * TOLL_HOLD} (got ${slow})`);
});
