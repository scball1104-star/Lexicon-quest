// Issue #74 fix 3 (docs/ACCESSIBILITY.md item 6): a double tap must not turn a dialogue page nobody read. For
// READ_GUARD frames after a page is complete (typed out, skipped, or shown at once at Instant) presses are swallowed.
// Before the fix, at Instant text the page was complete on its first frame and the second tap turned it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DialogScene, READ_GUARD } from '../../src/ui/dialog.js';

/** Node rig: a fake engine whose input reports a confirm press on the frames we ask for. */
function rig({ textSpeed = 2, text, data = {} } = {}) {
  let press = false;
  const consumed = [];
  const input = {
    pressed: (a) => press && a === 'confirm',
    consume: (a) => consumed.push(a),
    tapIn: () => false,
    pointer: { x: 0, y: 0 },
  };
  const renderer = {
    W: 384, H: 216, measure: (s) => String(s).length * 6,
    font: () => ({ length: (s) => s.replace(/\n/g, '').length }),
    // 30 characters a line, so the text below makes several 3-line pages
    wrap: (s) => s.match(/.{1,30}(\s|$)/g).map((l) => l.trim()),
  };
  const engine = {
    frame: 1000, settings: { textSpeed, reduceMotion: true }, input, renderer, audio: { sfx() {} }, game: null,
    stack: [], scenes: [], scene: null, emit() {},
    pop(result) { this.popped = { result }; this.scene = null; },
  };
  const d = new DialogScene(engine);
  engine.stack.push(d); engine.scenes.push(d); engine.scene = d;
  d.enter({ who: null, text: text || 'word '.repeat(60), ...data });
  const step = (pressNow = false) => { press = pressNow; engine.frame++; d.update(); press = false; };
  return { d, engine, step, consumed };
}

test('Instant text: a double tap on a fresh page turns nothing; a press after the guard turns one page', () => {
  const { d, step } = rig({ textSpeed: 4 });
  assert.ok(d.pages.length >= 3, 'the rig text runs to several pages');
  step(false);                                     // the page appears complete
  assert.equal(d.typing, false);
  step(true); step(false); step(true);             // a double tap, two frames apart
  assert.equal(d.page, 0, 'the double tap turned no page');
  for (let i = 0; i < READ_GUARD; i++) step(false);
  step(true);
  assert.equal(d.page, 1, 'a press after the guard turns exactly one page');
  step(true);
  assert.equal(d.page, 1, 'and the next page is guarded again');
});

test('Normal speed: the skip press is instant, a second tap right after it is swallowed', () => {
  const { d, step } = rig({ textSpeed: 2 });
  step(false); step(false);
  assert.equal(d.typing, true);
  step(true);                                      // skip the typewriter
  assert.equal(d.typing, false, 'the skip still completes the page at once');
  step(true);                                      // the double tap's second press
  assert.equal(d.page, 0, 'the page the skip revealed was not turned');
  for (let i = 0; i < READ_GUARD; i++) step(false);
  step(true);
  assert.equal(d.page, 1);
});

test('the guard costs a reader nothing: a page that typed out takes a press READ_GUARD frames later', () => {
  const { d, step } = rig({ textSpeed: 2 });
  let n = 0;
  while (d.typing && n++ < 600) step(false);
  assert.equal(d.typing, false, 'the page typed out');
  for (let i = 0; i < READ_GUARD; i++) step(false);
  step(true);
  assert.equal(d.page, 1, `a press ${READ_GUARD} frames (${(READ_GUARD / 60).toFixed(2)} s) after the last character turns the page`);
});

test('a re-shown box (instant) and a last page with choices are guarded too', () => {
  const { d, step } = rig({ text: 'Short line.', data: { instant: true, choices: ['Yes', 'No'] } });
  step(true);
  assert.equal(d.choiceBox, null, 'a press on the first frame neither closes nor opens the choices early');
  for (let i = 0; i < READ_GUARD; i++) step(false);
  assert.ok(d.choiceBox, 'the choices open once the guard ends');
});
