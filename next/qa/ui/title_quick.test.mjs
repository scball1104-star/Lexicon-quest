// Issue #88 (CRITIQUE_9 item 7, Scott 2026-11-11): after Episode 5 the title listed nine rows, five of them quick starts.
// Two or more quick starts now fold into one "New party…" row that opens them as a small list in the menu's place. The
// packs still add their rows the way they always did (each pack's title.js puts its row straight into the title's List and
// wraps that List to catch confirm); the title folds whatever lands, in any order, and the packs' confirm still reaches
// their own ask from the open list. Node: a TitleScene on a fake engine, the real ep4 / ep5 / ep6 / Fine Print offerRow.
import test from 'node:test';
import assert from 'node:assert/strict';
import { List } from '../../src/ui/list.js';
import { TitleScene } from '../../src/scenes/title.js';
import { install, foldQuickRows, titleMenuLayout, isQuickRow, QUICK_ROW_ID, QUICK_ROW_LABEL } from '../../src/ui/firstuse/titleQuick.js';

install(TitleScene);   // what scenes/title.js foldQuick does on first use
import { offerRow as offerEp4 } from '../../src/data/ep4/title.js';
import { offerRow as offerEp5 } from '../../src/data/ep5/title.js';
import { offerRow as offerEp6 } from '../../src/data/ep6/title.js';
import { offerRow as offerTier } from '../../src/data/tier/title.js';

const ids = (a) => a.map((it) => it.id);
const rows = (...x) => x.map((id) => ({ id, label: /^ep\d$/.test(id) ? `Episode ${id.slice(2)}: new party` : id }));
const party = () => ({ id: QUICK_ROW_ID, label: QUICK_ROW_LABEL });

test('foldQuickRows: two or more quick starts become one row before Config, in episode order, in place', () => {
  const items = rows('new', 'continue', 'ep3', 'ep2', 'config'), quick = [], row = party();
  assert.equal(foldQuickRows(items, quick, row), true);
  assert.deepEqual(ids(items), ['new', 'continue', 'party', 'config']);
  assert.deepEqual(ids(quick), ['ep2', 'ep3']);
  assert.equal(foldQuickRows(items, quick, row), false, 'idempotent');
  // one quick start stays its own row (it is already one row; a list of one would be a wasted tap)
  const one = rows('new', 'continue', 'ep2', 'config'), q1 = [];
  assert.equal(foldQuickRows(one, q1, party()), false);
  assert.deepEqual(ids(one), ['new', 'continue', 'ep2', 'config']);
  // a later row joins the folded ones; a row that lands after Config (a pack's two-column fold) is taken too
  items.push(...rows('ep5'));
  assert.equal(foldQuickRows(items, quick, row), true);
  assert.deepEqual(ids(items), ['new', 'continue', 'party', 'config']);
  assert.deepEqual(ids(quick), ['ep2', 'ep3', 'ep5']);
  // the single row folds as soon as a second arrives
  one.push(...rows('ep4'));
  assert.equal(foldQuickRows(one, q1, party()), true);
  assert.deepEqual(ids(one), ['new', 'continue', 'party', 'config']);
  assert.deepEqual(ids(q1), ['ep2', 'ep4']);
  assert.ok(isQuickRow({ id: 'ep6' }) && !isQuickRow({ id: 'party' }) && !isQuickRow(null));
});

test('titleMenuLayout: one centred column while it clears the logo, else two', () => {
  const a = titleMenuLayout(5, 20, 80);
  assert.equal(a.columns, 1);
  assert.equal(a.win.y + a.win.h, 210);
  assert.ok(a.win.y >= 91, 'clear of the logo');
  assert.equal(a.win.x, Math.round(192 - a.win.w / 2));
  const b = titleMenuLayout(6, 20, 80);
  assert.equal(b.columns, 2);
  assert.equal(b.rows, 3);
  assert.ok(b.win.y >= 91 && b.win.y + b.win.h <= 216);
  const c = titleMenuLayout(6, 11, 80);
  assert.equal(c.columns, 1, 'keyboard rows are short enough for one column');
});

/** A TitleScene on a fake engine (no key art, no audio): the menu, the fold and the quick start list, nothing drawn. */
function titleScene(list, rowH = 20) {
  const s = Object.create(TitleScene.prototype);
  const faded = [];
  const e = {
    renderer: { measure: (t) => String(t).length * 5 }, audio: { sfx() {} },
    save: { slots: 3, exists: () => false, loadEnvelope: () => ({ data: { flags: { ep2_complete: true, ep3_complete: true } }, meta: { name: 'Wren' } }) },
    hasScene: () => true, registerScene() {}, fadeTo: (fn) => { faded.push(fn); return Promise.resolve(true); }, replace() {},
    get scene() { return s; },
  };
  const items = rows(...list);
  Object.assign(s, { engine: e, name: 'title', quick: [], quickRow: party(), mainMenu: null, menuSig: null, guard: null, busy: false, hasSaves: true });
  foldQuickRows(items, s.quick, s.quickRow);
  s.menu = new List({ x: 0, y: 0, w: 100, rowH, rows: items.length, items, textX: 18, index: 1 });
  s.update = () => {};   // the packs wrap update(); the real one draws key art (the browser checks run it: realplay title.py)
  s.draw = () => {};
  s.tidyMenu();
  return { s, faded };
}
const confirm = { repeatDir: () => null, pressed: (a) => a === 'confirm', consume() {}, pointer: null };
const onScreen = (s) => {
  assert.ok(s.win.x >= 0 && s.win.y >= 0 && s.win.x + s.win.w <= 384 && s.win.y + s.win.h <= 216, `window ${JSON.stringify(s.win)}`);
  s.menu.items.forEach((_, i) => { const r = s.menu.rowRect(i); assert.ok(r.y >= s.win.y && r.y + r.h <= s.win.y + s.win.h, `row ${i} inside`); });
};

test('after Episode 5: the pack rows fold as they land, in any order, and the menu is five rows in one column', () => {
  const { s } = titleScene(['new', 'continue', 'ep2', 'ep3', 'config']);
  assert.deepEqual(ids(s.menu.items), ['new', 'continue', 'party', 'config']);
  const o = { show: true, url: false, name: 'Wren', slot: 0 };
  offerEp6(s, o, {}); s.tidyMenu();
  offerTier(s); s.tidyMenu();
  offerEp4(s, o, {}); s.tidyMenu();
  offerEp5(s, o, {}); s.tidyMenu();
  assert.deepEqual(ids(s.menu.items), ['new', 'continue', 'tier', 'party', 'config']);
  assert.deepEqual(s.quickStarts(), ['ep2', 'ep3', 'ep4', 'ep5', 'ep6']);
  assert.equal(s.menu.columns, 1, 'one column: no right column for the glove to float in');
  assert.equal(s.menu.item.id, 'continue', 'the cursor stayed on Continue');
  onScreen(s);
});

test('the row opens the list in the menu\'s place; a pack row confirmed there reaches the pack\'s own start; back closes it', async () => {
  const { s, faded } = titleScene(['new', 'continue', 'ep2', 'ep3', 'config']);
  const o = { show: true, url: false, name: 'Wren', slot: 0 };
  offerEp4(s, o, {}); offerEp5(s, o, {}); offerEp6(s, o, {}); s.tidyMenu();
  const main = s.menu;
  assert.equal(s.openQuick(), true);
  assert.notEqual(s.menu, main);
  assert.equal(s.mainMenu, main);
  assert.deepEqual(ids(s.menu.items), ['ep2', 'ep3', 'ep4', 'ep5', 'ep6']);
  assert.equal(s.menu.columns, 1);
  onScreen(s);
  // the packs wrap whichever List the title holds on their next update: Episode 5's confirm opens its name entry
  s.update(0);
  s.menu.moveTo(s.menu.items.findIndex((it) => it.id === 'ep5'));
  const act = s.menu.update(confirm, null);
  assert.equal(act, null, 'the pack took the confirm');
  assert.equal(faded.length, 1, 'slot 0 free: straight to the Episode 5 name entry');
  assert.ok(s.busy);
  // back: the menu again, the cursor on the row
  s.busy = false;
  s.closeQuick();
  assert.equal(s.menu, main);
  assert.equal(s.menu.item.id, QUICK_ROW_ID);
  assert.equal(s.mainMenu, null);
  onScreen(s);
  // QA's way in: the cursor on one quick start, the list opened for it
  assert.equal(await s.showQuickStart('ep3'), true);
  assert.equal(s.menu.item.id, 'ep3');
  assert.equal(await s.showQuickStart('ep9'), false);
});

test('a pack row that lands while the list is open joins it in order', () => {
  const { s } = titleScene(['new', 'continue', 'ep2', 'ep3', 'config']);
  s.openQuick('ep3');
  assert.equal(s.menu.item.id, 'ep3');
  offerEp4(s, { show: true, name: 'Wren', slot: 0 }, {});
  s.tidyMenu();
  assert.deepEqual(ids(s.menu.items), ['ep2', 'ep3', 'ep4']);
  assert.equal(s.menu.item.id, 'ep3', 'the cursor stays on its row');
  s.closeQuick();
  assert.deepEqual(ids(s.menu.items), ['new', 'continue', 'party', 'config']);
  assert.deepEqual(s.quickStarts(), ['ep2', 'ep3', 'ep4']);
});

test('Fine Print rebuilding the menu while the list is open: its List becomes the title menu, the list stays open', () => {
  const { s } = titleScene(['new', 'continue', 'ep2', 'ep3', 'config']);
  s.openQuick('ep2');
  const list = s.menu;
  assert.equal(offerTier(s), true, 'the pack builds its List from the one the title holds');
  s.tidyMenu();
  assert.equal(s.menu, list, 'the quick start list is still the one showing');
  assert.deepEqual(ids(s.menu.items), ['ep2', 'ep3']);
  assert.notEqual(s.mainMenu, null);
  assert.deepEqual(ids(s.mainMenu.items), ['new', 'continue', 'tier', 'party', 'config']);
  s.closeQuick();
  assert.deepEqual(ids(s.menu.items), ['new', 'continue', 'tier', 'party', 'config']);
  assert.equal(s.menu.item.id, QUICK_ROW_ID);
  // the pack's confirm wrapper is on that List: Fine Print still opens its ask from the title
  s.menu.moveTo(2);
  let asked = false;
  s.engine.pushAwait = () => { asked = true; return new Promise(() => {}); };
  assert.equal(s.menu.update(confirm, null), null);
  assert.ok(asked, 'Fine Print took the confirm');
  onScreen(s);
});

test('one quick start keeps its own row; ?ep=N with no save shows only that row', () => {
  const { s } = titleScene(['new', 'continue', 'ep2', 'config']);
  assert.deepEqual(ids(s.menu.items), ['new', 'continue', 'ep2', 'config']);
  const { s: u } = titleScene(['new', 'continue', 'config']);
  offerEp6(u, { show: true, url: true, name: null, slot: null }, {}); u.tidyMenu();
  assert.deepEqual(ids(u.menu.items), ['new', 'continue', 'ep6', 'config']);
  assert.equal(u.openQuick(), false, 'nothing folded: no list');
});

test('a tap well clear of the open list closes it; one inside or within a row of it does not', () => {
  const { s } = titleScene(['new', 'continue', 'ep2', 'ep3', 'config']);
  s.openQuick();
  const w = s.win;
  assert.equal(s.outsideQuick({ x: w.x + 4, y: w.y + 4 }), false);
  assert.equal(s.outsideQuick({ x: w.x - 10, y: w.y + 4 }), false, 'within one row of slop');
  assert.equal(s.outsideQuick({ x: 4, y: 4 }), true);
  assert.equal(s.outsideQuick({ x: 4, y: 400 }), false, 'below the game (the portrait controls): not a tap on the title');
});

test('the fold and the portrait lens load on first use: out of the precache and the preload, runtime-cached by the pack pattern', async () => {
  const fs = await import('node:fs');
  const sw = fs.readFileSync(new URL('../../sw.js', import.meta.url), 'utf8');
  const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const pre = sw.slice(sw.indexOf('const PRECACHE = ['), sw.indexOf('];', sw.indexOf('const PRECACHE = [')));
  const pattern = new RegExp(JSON.parse(sw.match(/const PACK_PATTERN = (".*");/)[1]));
  for (const f of ['src/ui/firstuse/titleQuick.js', 'src/ui/firstuse/lens.js']) {
    assert.ok(!pre.includes(f) && !html.includes(f), `${f} is not in the first download`);
    assert.ok(pattern.test(f), `${f} is runtime-cached once fetched`);
  }
});
