// Episode 4 leftovers (issue #41, CRITIQUE_6 and PLAYTEST_REVIEW_6): the folded title menu, the docked help window with nothing
// to say, and a far seal washing on camera.
import test from 'node:test';
import assert from 'node:assert/strict';
import { foldTitleRows } from '../../src/game/episodes.js';
import { offerRow as offerEp4 } from '../../src/data/ep4/title.js';
import { offerRow as offerTier } from '../../src/data/tier/title.js';
import { drawHelp } from '../../src/battle/scene/hud.js';
import * as L from '../../src/battle/scene/layout.js';
import { Tide } from '../../src/data/ep4/field/system.js';

const ids = (a) => a.map((it) => it.id);
const rows = (...x) => x.map((id) => ({ id, label: id }));

test('foldTitleRows: Config steps in front of the episode rows, in place, idempotent', () => {
  const a = rows('new', 'continue', 'tier', 'ep2', 'ep3', 'ep4', 'config');
  assert.equal(foldTitleRows(a), a);
  assert.deepEqual(ids(a), ['new', 'continue', 'tier', 'config', 'ep2', 'ep3', 'ep4']);
  foldTitleRows(a);
  assert.deepEqual(ids(a), ['new', 'continue', 'tier', 'config', 'ep2', 'ep3', 'ep4']);
  assert.deepEqual(ids(foldTitleRows(rows('new', 'continue', 'ep2', 'config'))), ['new', 'continue', 'ep2', 'config'], 'one episode row: nothing to keep together');
  assert.deepEqual(ids(foldTitleRows(rows('new', 'config'))), ['new', 'config']);
});

test('every folded phone menu keeps the episode rows in one column', () => {
  const orders = [['new', 'continue', 'tier', 'ep2', 'ep3', 'ep4', 'config'], ['new', 'continue', 'ep2', 'ep3', 'ep4', 'config'],
    ['new', 'continue', 'stacks', 'tier', 'ep2', 'ep3', 'ep4', 'config'], ['new', 'continue', 'ep2', 'ep3', 'config']];
  for (const o of orders) {
    const a = foldTitleRows(rows(...o));
    const n = Math.ceil(a.length / 2);
    const cols = new Set(ids(a).map((id, i) => (/^ep\d$/.test(id) ? Math.floor(i / n) : null)).filter((c) => c != null));
    assert.equal(cols.size, 1, ids(a).join(' '));
  }
});

function titleScene(list, rowH) {
  const e = { renderer: { measure: (s) => String(s).length * 5 }, save: { slots: 3, exists: () => true, loadEnvelope: () => ({ data: { flags: { ep2_complete: true } }, meta: {} }) }, hasScene: () => true, registerScene() {} };
  const items = rows(...list);
  return { name: 'title', engine: e, menu: { items, rowH, index: 1, update: () => null, get item() { return items[this.index]; } }, win: null, guard: null, update() {}, draw() {} };
}

test('Episode 4 and Fine Print fold the same in either arrival order, and the cursor stays on its row', () => {
  const a = titleScene(['new', 'continue', 'ep2', 'ep3', 'config'], 20);
  offerEp4(a);
  assert.deepEqual(ids(a.menu.items), ['new', 'continue', 'config', 'ep2', 'ep3', 'ep4']);
  assert.equal(a.menu.items[a.menu.index].id, 'continue');
  assert.equal(a.menu.columns, 2);
  const b = titleScene(['new', 'continue', 'ep2', 'ep3', 'config'], 20);
  offerTier(b);
  if (b.menu.items.some((it) => it.id === 'tier')) {
    offerEp4(b);
    assert.deepEqual(ids(b.menu.items), ['new', 'continue', 'tier', 'config', 'ep2', 'ep3', 'ep4']);
    assert.equal(b.menu.items[b.menu.index].id, 'continue');
  }
});

test('the keyboard layout (one column) keeps its order: Episode 4 before Config', () => {
  const s = titleScene(['new', 'continue', 'ep2', 'ep3', 'config'], 11);
  offerEp4(s);
  assert.deepEqual(ids(s.menu.items), ['new', 'continue', 'ep2', 'ep3', 'ep4', 'config']);
  assert.equal(s.menu.columns, 1);
});

const nothing = new Proxy(function () {}, {   // any canvas call, any depth
  get: (t, k) => (k === Symbol.toPrimitive || k === 'valueOf' ? () => 0 : typeof k === 'symbol' ? undefined : nothing),
  apply: () => nothing,
});
const anyR = () => new Proxy({ measure: (x) => String(x).length * 5, wrap: (x) => [x], assets: { has: () => false }, settings: {}, frame: 1 }, {
  get: (t, k) => (k in t ? t[k] : nothing),
});

test('docked help with nothing to say shrinks to its buttons; with a line, or undocked, it keeps its width', async () => {
  const win = await import('../../src/ui/window.js');
  const measure = (text, rightW) => {
    win.uiAudit.on = true; win.uiAudit.windows = [];
    drawHelp(anyR(), text, null, { rightW });
    const w = win.uiAudit.windows.at(-1);
    win.uiAudit.on = false;
    return w;
  };
  L.STAGE.tall = new Set(['boss']); L.STAGE.actors = null;
  const empty = measure('', 94), line = measure('A line.', 94);
  L.STAGE.tall = new Set();
  const undocked = measure('', 94);
  assert.ok(empty && line && undocked, 'the audit saw the windows');
  assert.ok(empty.w < line.w, `${empty.w} < ${line.w}`);
  assert.equal(empty.x + empty.w, line.x + line.w, 'same right edge: the buttons do not move');
  assert.equal(empty.w, 94 + 12);
  assert.equal(undocked.w, line.w);
});

function revealRig({ press = null } = {}) {
  const log = [];
  let frames = 0, locks = 0, max = 0;
  const e = { input: { pressed: (k) => k === press && frames > 5 }, waitFrames: async () => { frames++; await new Promise((r) => setImmediate(r)); } };
  const field = { engine: e, leader: { id: 'hero' }, dead: false,
    camera: { panTo: async (x, y, n) => { log.push(['pan', x, y, n]); }, returnTo: async (a, n) => { log.push(['back', a.id, n]); } },
    lockInput() { locks++; max = Math.max(max, locks); log.push(['lock']); }, unlockInput() { locks--; log.push(['unlock']); } };
  const tide = new Tide(field);
  return { tide, log, frames: () => frames, locks: () => locks };
}

test('a far seal: the camera goes before the water lands and holds until the wash has run, then comes back and frees input', async () => {
  const R = revealRig();
  let settledAsked = false;
  R.tide.settled = () => { settledAsked = true; return new Promise(() => {}); };   // the bands are still running
  R.tide.washFx = [{ id: 's', x: 17, y: 9, t: -20 }];
  const done = R.tide.reveal({ id: 's', x: 17, y: 9 }, true);
  await new Promise((r) => setImmediate(r));
  assert.equal(settledAsked, false, 'a wash does not wait for the bands');
  R.tide.washFx = [];
  await done;
  assert.deepEqual(R.log.map((l) => l[0]), ['lock', 'pan', 'back', 'unlock']);
  assert.deepEqual(R.log[1], ['pan', 17 * 16 + 8, 9 * 16, 24]);
  assert.equal(R.locks(), 0);
  assert.equal(R.tide.revealing, false);
});

test('a far seal: confirm skips, and a wash that never ends cannot hold the camera', async () => {
  const R = revealRig({ press: 'confirm' });
  R.tide.washFx = [{ id: 's', x: 17, y: 9, t: 0 }];
  await R.tide.reveal({ id: 's', x: 17, y: 9 }, true);
  assert.ok(R.frames() < 10, `skipped after ${R.frames()} frames`);
  const S = revealRig();
  S.tide.washFx = [{ id: 's', x: 17, y: 9, t: 0 }];
  await S.tide.reveal({ id: 's', x: 17, y: 9 }, true);
  assert.equal(S.frames(), 150);
  assert.equal(S.locks(), 0);
});

test('the floodgate reveal is unchanged: settled first, the 40-frame pan, the 50-frame hold', async () => {
  const R = revealRig();
  let settled = 0;
  R.tide.settled = async () => { settled++; };
  await R.tide.reveal({ id: 'g', x: 10, y: 4 });
  assert.equal(settled, 1);
  assert.deepEqual(R.log[1], ['pan', 10 * 16 + 16, 4 * 16, 40]);
  assert.equal(R.frames(), 50);
});
