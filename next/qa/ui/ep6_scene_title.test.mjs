// E6-scene-ui: the Episode 6 title row (src/data/ep6/title.js). Pure node tests over a title-shaped scene with a real List: the row
// goes after the Episode 5 row, the episode rows stay together when the menu folds into two columns, offerRow is idempotent and
// refuses anything that is not the title. The drawing, the picker and name entry are checked headless by ep6_scene_title.py.
import test from 'node:test';
import assert from 'node:assert/strict';
import { List } from '../../src/ui/list.js';
import { offerRow, ROW_ID } from '../../src/data/ep6/title.js';
import { EP6_ROW_LABEL } from '../../src/data/ep6/hooks.js';

function titleScene() {
  const ids = ['new', 'continue', 'tier', 'config', 'ep2', 'ep3', 'ep4', 'ep5'];
  const items = ids.map((id) => ({ id, label: id.startsWith('ep') ? `Episode ${id.slice(2)}: new party` : id }));
  const menu = new List({ x: 26, y: 120, w: 220, rowH: 11, rows: items.length, items });
  const engine = { renderer: { measure: (s) => String(s).length * 5 }, hasScene: () => true, registerScene() {} };
  return { name: 'title', engine, menu, win: {}, update() {}, draw() {} };
}

test('the Episode 6 row: after Episode 5, the episode rows together, once', () => {
  const s = titleScene();
  assert.equal(offerRow(s, { show: true, name: 'Wren', slot: 0 }, {}), true);
  const ids = s.menu.items.map((it) => it.id);
  assert.equal(ids.indexOf(ROW_ID), ids.indexOf('ep5') + 1, ids.join(','));
  assert.equal(s.menu.items.find((it) => it.id === ROW_ID).label, EP6_ROW_LABEL);
  const eps = ids.map((id, i) => (/^ep\d$/.test(id) ? i : -1)).filter((i) => i >= 0);
  assert.deepEqual(eps, eps.map((_, k) => eps[0] + k), `the five episode rows stay together (${ids.join(',')})`);
  assert.equal(eps.length, 5);
  offerRow(s, { show: true }, {});
  assert.equal(s.menu.items.filter((it) => it.id === ROW_ID).length, 1, 'idempotent');
  assert.ok(s.win.y >= 0 && s.win.y + s.win.h <= 216, `the window fits the screen (${JSON.stringify(s.win)})`);
});

test('offerRow refuses a scene that is not the title', () => {
  assert.equal(offerRow({ name: 'field', menu: { items: [] } }), false);
  assert.equal(offerRow(null), false);
});
