// E8-scene-ui: the Episode 8 title row (src/data/ep8/title.js). Pure node tests over a title-shaped scene with a real List: the row goes
// after the Episode 7 row (and stays the last episode row when an earlier one lands late), the seven episode rows stay together when the
// menu folds into two columns, with the quick start fold in (scene.tidyMenu) the row joins the fold and Episode 8 is the last row of both
// the folded and the open list, everything fits the screen with the keyboard's and the phone's row heights, offerRow is idempotent and
// refuses anything that is not the title. The drawing at 375x812 and 844x390 is checked headless by ep8_scene_title.py.
import test from 'node:test';
import assert from 'node:assert/strict';
import { List } from '../../src/ui/list.js';
import { offerRow, ROW_ID, NameEntryEp8Scene, Ep8AskScene } from '../../src/data/ep8/title.js';
import { offerRow as offerRow7 } from '../../src/data/ep7/title.js';
import { EP8_ROW_LABEL, EP8_ROW_HELP } from '../../src/data/ep8/hooks.js';
import { install as installQuick, QUICK_ROW_ID } from '../../src/ui/firstuse/titleQuick.js';

function titleScene(ids = ['new', 'continue', 'tier', 'config', 'ep2', 'ep3', 'ep4', 'ep5', 'ep6', 'ep7'], rowH = 11) {
  const items = ids.map((id) => ({ id, label: id.startsWith('ep') ? `Episode ${id.slice(2)}: new party` : id }));
  const menu = new List({ x: 26, y: 120, w: 220, rowH, rows: items.length, items });
  const engine = { renderer: { measure: (s) => String(s).length * 5 }, hasScene: () => true, registerScene() {} };
  return { name: 'title', engine, menu, win: {}, update() {}, draw() {} };
}
const epRows = (ids) => ids.map((id, i) => (/^ep\d$/.test(id) ? i : -1)).filter((i) => i >= 0);
const onScreen = (s) => {
  assert.ok(s.win.y >= 0 && s.win.y + s.win.h <= 216, `the window fits the screen (${JSON.stringify(s.win)})`);
  for (let i = 0; i < s.menu.items.length; i++) {
    if (!s.menu.isVisible(i)) continue;
    const r = s.menu.rowRect(i);
    assert.ok(r.y >= 0 && r.y + r.h <= 216 && r.x >= 0 && r.x + r.w <= 384, `row ${i} on screen (${JSON.stringify(r)})`);
  }
};

test('the Episode 8 row: after Episode 7, the seven episode rows together, once; the text of plan 5.3', () => {
  for (const rowH of [11, 18]) {
    const s = titleScene(undefined, rowH);
    assert.equal(offerRow(s, { show: true, name: 'Wren', slot: 0 }, {}), true);
    const ids = s.menu.items.map((it) => it.id);
    assert.equal(ids.indexOf(ROW_ID), ids.indexOf('ep7') + 1, ids.join(','));
    assert.equal(s.menu.items.find((it) => it.id === ROW_ID).label, EP8_ROW_LABEL);
    const eps = epRows(ids);
    assert.deepEqual(eps, eps.map((_, k) => eps[0] + k), `the seven episode rows stay together (${ids.join(',')})`);
    assert.equal(eps.length, 7);
    offerRow(s, { show: true }, {});
    assert.equal(s.menu.items.filter((it) => it.id === ROW_ID).length, 1, 'idempotent');
    onScreen(s);
  }
  assert.equal(EP8_ROW_LABEL, 'Episode 8: new party');
  assert.equal(EP8_ROW_HELP, 'A ready party at Lv 31. Your own save stays under Continue.');
});

test('an Episode 7 row that lands after the Episode 8 row: Episode 8 moves back to the end of the episode rows', () => {
  const s = titleScene(['new', 'continue', 'tier', 'config', 'ep2', 'ep3', 'ep4', 'ep5', 'ep6']);
  offerRow(s, { show: true }, {});
  offerRow7(s, { show: true }, {});
  s.update(0);
  const ids = s.menu.items.map((it) => it.id);
  assert.ok(ids.indexOf('ep8') > ids.indexOf('ep7'), ids.join(','));
  const eps = epRows(ids);
  assert.deepEqual(eps, eps.map((_, k) => eps[0] + k), `together (${ids.join(',')})`);
});

test('with the quick start fold in (scene.tidyMenu): the row joins the fold, Episode 8 the last row folded and open, the fold keeps the layout', () => {
  class Quick {}
  installQuick(Quick);
  for (const rowH of [11, 18]) {
    const make = (ids) => Object.assign(new Quick(), titleScene(ids, rowH), { quick: [], mainMenu: null, quickList: null });
    const s = make(['new', 'continue', 'tier', 'config', 'ep2', 'ep3', 'ep4', 'ep5', 'ep6']);
    s.tidyMenu();
    const win = JSON.stringify(s.win);
    assert.equal(offerRow(s, { show: true }, {}), true);
    assert.equal(JSON.stringify(s.win), win, 'the fold keeps its own layout (the row folds in)');
    assert.deepEqual(s.menu.items.map((it) => it.id), ['new', 'continue', 'tier', QUICK_ROW_ID, 'config'], 'one New party row');
    assert.deepEqual(s.quick.map((it) => it.id), ['ep2', 'ep3', 'ep4', 'ep5', 'ep6', 'ep8']);
    // an Episode 7 row landing late, with the list open: Episode 8 is still the last, the open list holds all seven and fits
    s.openQuick('ep2');
    offerRow7(s, { show: true }, {});
    s.update(0);
    s.tidyMenu();
    assert.deepEqual(s.menu.items.map((it) => it.id), ['ep2', 'ep3', 'ep4', 'ep5', 'ep6', 'ep7', 'ep8'], 'the open list in episode order, seven rows');
    onScreen(s);
    s.closeQuick();
    assert.deepEqual(s.quick.map((it) => it.id).slice(-1), ['ep8']);
    assert.equal(s.menu.items.filter((it) => it.id === ROW_ID).length, 0, 'never loose beside the fold');
    onScreen(s);
  }
});

test('offerRow refuses a scene that is not the title; the name entry and the ask are the pack\'s own scenes', () => {
  assert.equal(offerRow({ name: 'field', menu: { items: [] } }), false);
  assert.equal(offerRow(null), false);
  assert.equal(new NameEntryEp8Scene({ input: {}, audio: {} }).name, 'nameEntryEp8');
  const ask = new Ep8AskScene({}, null, { ok: false, slot: null, notice: 'Every record is full.' });
  assert.equal(ask.name, 'ep8Ask');
});
