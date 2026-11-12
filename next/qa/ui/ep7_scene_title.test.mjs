// E7-scene-ui: the Episode 7 title row (src/data/ep7/title.js). Pure node tests over a title-shaped scene with a real List: the row
// goes after the Episode 6 row (and stays the last episode row when an earlier one lands late), the six episode rows stay together
// when the menu folds into two columns, offerRow is idempotent and refuses anything that is not the title. The drawing, the picker
// and name entry are checked headless by ep7_scene_title.py.
import test from 'node:test';
import assert from 'node:assert/strict';
import { List } from '../../src/ui/list.js';
import { offerRow, ROW_ID, NameEntryEp7Scene, Ep7AskScene } from '../../src/data/ep7/title.js';
import { offerRow as offerRow6 } from '../../src/data/ep6/title.js';
import { EP7_ROW_LABEL, EP7_ROW_HELP } from '../../src/data/ep7/hooks.js';

function titleScene(ids = ['new', 'continue', 'tier', 'config', 'ep2', 'ep3', 'ep4', 'ep5', 'ep6']) {
  const items = ids.map((id) => ({ id, label: id.startsWith('ep') ? `Episode ${id.slice(2)}: new party` : id }));
  const menu = new List({ x: 26, y: 120, w: 220, rowH: 11, rows: items.length, items });
  const engine = { renderer: { measure: (s) => String(s).length * 5 }, hasScene: () => true, registerScene() {} };
  return { name: 'title', engine, menu, win: {}, update() {}, draw() {} };
}
const epRows = (ids) => ids.map((id, i) => (/^ep\d$/.test(id) ? i : -1)).filter((i) => i >= 0);

test('the Episode 7 row: after Episode 6, the six episode rows together, once', () => {
  const s = titleScene();
  assert.equal(offerRow(s, { show: true, name: 'Wren', slot: 0 }, {}), true);
  const ids = s.menu.items.map((it) => it.id);
  assert.equal(ids.indexOf(ROW_ID), ids.indexOf('ep6') + 1, ids.join(','));
  assert.equal(s.menu.items.find((it) => it.id === ROW_ID).label, EP7_ROW_LABEL);
  const eps = epRows(ids);
  assert.deepEqual(eps, eps.map((_, k) => eps[0] + k), `the six episode rows stay together (${ids.join(',')})`);
  assert.equal(eps.length, 6);
  offerRow(s, { show: true }, {});
  assert.equal(s.menu.items.filter((it) => it.id === ROW_ID).length, 1, 'idempotent');
  assert.ok(s.win.y >= 0 && s.win.y + s.win.h <= 216, `the window fits the screen (${JSON.stringify(s.win)})`);
  for (let i = 0; i < s.menu.items.length; i++) { const r = s.menu.rowRect(i); assert.ok(r.y >= 0 && r.y + r.h <= 216, `row ${i} on screen`); }
  assert.equal(EP7_ROW_HELP, 'A ready party at Lv 28. Your own save stays under Continue.');
});

test('an Episode 6 row that lands after the Episode 7 row: Episode 7 moves back to the end of the episode rows', () => {
  const s = titleScene(['new', 'continue', 'tier', 'config', 'ep2', 'ep3', 'ep4', 'ep5']);
  offerRow(s, { show: true }, {});
  offerRow6(s, { show: true }, {});
  s.update(0);
  const ids = s.menu.items.map((it) => it.id);
  assert.ok(ids.indexOf('ep7') > ids.indexOf('ep6'), ids.join(','));
  const eps = epRows(ids);
  assert.deepEqual(eps, eps.map((_, k) => eps[0] + k), `together (${ids.join(',')})`);
});

test('offerRow refuses a scene that is not the title; the name entry and the ask are the pack\'s own scenes', () => {
  assert.equal(offerRow({ name: 'field', menu: { items: [] } }), false);
  assert.equal(offerRow(null), false);
  assert.equal(new NameEntryEp7Scene({ input: {}, audio: {} }).name, 'nameEntryEp7');
  const ask = new Ep7AskScene({}, null, { ok: false, slot: null, notice: 'Every record is full.' });
  assert.equal(ask.name, 'ep7Ask');
});
