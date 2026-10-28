// H7-hard-road: Fine Print on the title. The row "Fine Print" sits under Continue once any slot holds the latest live episode's
// complete flag (ep2_complete today); it asks which finished record to carry, says where the run saves (never over a save),
// and Begin hands the carried game to the prologue (the cold open). scenes/title.js has one guarded line that loads the pack.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createSave } from '../../src/core/save.js';
import { newGameEp3, newGameEp2, createGame, serialize, saveMeta } from '../../src/game/state.js';
import { episodeOffers } from '../../src/game/episodes.js';
import { TIER } from '../../src/data/tier/text.js';
import { tierRecords } from '../../src/data/tier/tier.js';
import { offerRow, layoutRows, recordLine, FinePrintScene } from '../../src/data/tier/title.js';
import { TOUCH_ROW_H } from '../../src/ui/list.js';

const TITLE = fs.readFileSync(new URL('../../src/scenes/title.js', import.meta.url), 'utf8');

function memorySave() {
  const m = new Map();
  const storage = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; } };
  let t = 0;
  return createSave({ storage, now: () => new Date(Date.UTC(2026, 9, 28, 10, 0, t++)).toISOString(), log: () => {} });
}
const put = (save, n, g) => save.save(n, serialize(g), saveMeta(g));

function fakeEngine(save, touch = false) {
  const pops = [];
  const e = {
    save, game: null, touch: touch ? { visible: true } : null, settings: {}, stack: [],
    renderer: { measure: (s) => String(s).length * 5, W: 384, H: 216 },
    input: { pressed: () => false, held: () => false, repeat: () => false, consume() {}, consumeAll() {}, taps: () => [], pointer: null, lastDevice: 'keyboard' },
    audio: { sfx() {} },
    pop: (r) => pops.push(r),
  };
  return { e, pops };
}
function fakeTitle(e, ids = ['new', 'continue', 'ep2', 'config'], rowH = 11) {
  const labels = { new: 'New Game', continue: 'Continue', ep2: 'Episode 2: new party', config: 'Config', stacks: 'Resume the Deep Stacks (B4)' };
  const items = ids.map((id) => ({ id, label: labels[id] }));
  return { name: 'title', engine: e, menu: { items, rowH, index: 1, update: () => null }, win: null, guard: null, draw() {} };
}

test('the title seam: one guarded line, after the menu is built, only when a record holds ep2_complete', () => {
  const lines = TITLE.split('\n').filter((l) => /LQ_TIER/.test(l));
  assert.equal(lines.length, 1, 'one line in scenes/title.js');
  assert.match(lines[0], /if \(this\.ep3\.slot != null\) ensurePack\('tier'\)\.then\(\(\) => globalThis\.LQ_TIER && LQ_TIER\.title\(this\)\)/);
  assert.ok(TITLE.indexOf(lines[0]) > TITLE.indexOf('this.menu = new List('), 'the row is added to the menu the title just built');
  // ep3.slot is the newest ep2_complete record whatever EP3_LIVE says: the guard the line uses
  const save = memorySave();
  assert.equal(episodeOffers(save).ep3.slot, null);
  put(save, 1, newGameEp2('Arden'));
  assert.equal(episodeOffers(save).ep3.slot, null, 'an Episode 1 finish does not unlock the tier');
  put(save, 2, newGameEp3('Arden'));
  assert.equal(episodeOffers(save).ep3.slot, 2);
});

test('the records the ask lists: every slot holding ep2_complete, newest first, with name, level and place', () => {
  const save = memorySave();
  assert.deepEqual(tierRecords(save), []);
  put(save, 0, createGame('Wren'));
  put(save, 1, newGameEp3('Arden'));
  put(save, 3, newGameEp2('Holt'));
  const later = newGameEp3('Tess');
  later.party[0].level = 15;
  put(save, 2, later);
  const recs = tierRecords(save);
  assert.deepEqual(recs.map((r) => r.slot), [2, 1], 'only the Episode 2 finishes, newest first');
  assert.equal(recs[0].name, 'Tess'); assert.equal(recs[0].level, 15);
  assert.match(recordLine(recs[1]), /^Arden, Lv 13, .+/);
  assert.ok(!/\u2014/.test(recordLine(recs[1])));
  assert.equal(tierRecords(save, 'ep3_complete').length, 0, 'once Episode 3 ships the unlock moves to its finish');
});

test('offerRow: "Fine Print" under Continue, once; nothing without a record', () => {
  const save = memorySave();
  const { e } = fakeEngine(save);
  const empty = fakeTitle(e);
  assert.equal(offerRow(empty), false);
  assert.deepEqual(empty.menu.items.map((i) => i.id), ['new', 'continue', 'ep2', 'config']);
  put(save, 1, newGameEp3('Arden'));
  const s = fakeTitle(e);
  assert.equal(offerRow(s), true);
  assert.deepEqual(s.menu.items.map((i) => i.id), ['new', 'continue', 'tier', 'ep2', 'config']);
  assert.equal(s.menu.items[2].label, 'Fine Print');
  assert.equal(TIER.row, 'Fine Print');
  assert.equal(s.menu.index, 1, 'the cursor stays on Continue');
  assert.equal(offerRow(s), true);
  assert.equal(s.menu.items.filter((i) => i.id === 'tier').length, 1, 'idempotent');
  assert.ok(s.win.y + s.win.h <= 216 && s.win.x >= 0 && s.win.x + s.win.w <= 384, 'the window stays on screen');
  assert.equal(offerRow({ name: 'field', engine: e, menu: s.menu }), false, 'only a title scene');
});

test('layout: the menu never climbs over the logo\'s subtitle; with touch rows it folds into two columns', () => {
  const m = (t) => t.length * 5;
  const items = (n) => Array.from({ length: n }, (_, i) => ({ label: ['New Game', 'Continue', 'Fine Print', 'Episode 2: new party', 'Config', 'Resume the Deep Stacks (B4)'][i] }));
  const desk = layoutRows(items(5), 11, m);
  assert.equal(desk.columns, 1, 'five keyboard rows fit in one column');
  assert.ok(desk.win.y >= 112);
  const touch = layoutRows(items(5), TOUCH_ROW_H, m);
  assert.equal(touch.columns, 2, 'five touch rows fold');
  assert.ok(touch.win.y >= 112, `top ${touch.win.y}`);
  assert.ok(touch.win.x >= 0 && touch.win.x + touch.win.w <= 384, 'and fit across');
  const six = layoutRows(items(6), TOUCH_ROW_H, m);
  assert.ok(six.win.y >= 112 && six.rows === 3);
});

test('the ask: pick a record, read the terms and where the run saves, Back is the default; Begin pops the choice', () => {
  const save = memorySave();
  put(save, 0, createGame('Wren'));
  put(save, 2, newGameEp3('Arden'));
  const { e, pops } = fakeEngine(save);
  const sc = new FinePrintScene(e);
  sc.enter({});
  let st = sc.debugState();
  assert.equal(st.step, 'pick');
  assert.deepEqual(st.ids, [2, 'back']);
  assert.match(st.options[0], /^Arden, Lv 13/);
  assert.equal(st.options[1], 'Back');
  sc.termsStep(sc.records[0]);
  st = sc.debugState();
  assert.equal(st.step, 'terms');
  assert.deepEqual(st.ids, ['back', 'begin'], 'Back first: the default and the cancel answer');
  assert.equal(st.index, 0);
  assert.equal(st.slot, 1, 'slot 0 holds a game, so the run takes the first free record');
  assert.ok(sc.lines.some((l) => l.text === 'The run saves to record 1.'));
  assert.ok(sc.lines.every((l) => !/\u2014/.test(l.text)));
  // Begin
  sc.box = { update: () => 1, items: [], index: 1 };
  sc.update();
  assert.deepEqual(pops.pop(), { begin: true, record: 2, slot: 1 });
});

test('the ask refuses when every slot holds a game (the run never replaces a save)', () => {
  const save = memorySave();
  for (const n of [0, 1, 3]) put(save, n, createGame('Wren'));
  put(save, 2, newGameEp3('Arden'));
  const { e, pops } = fakeEngine(save);
  const sc = new FinePrintScene(e);
  sc.enter({});
  sc.termsStep(sc.records[0]);
  assert.deepEqual(sc.debugState().ids, ['back']);
  assert.equal(sc.debugState().slot, null);
  sc.box = { update: () => 0, items: [], index: 0 };
  sc.update();
  assert.equal(pops.pop(), null, 'Back with a single record closes the ask');
});
