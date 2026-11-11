// Issue #82 (docs/ACCESSIBILITY.md item 8, CRITIQUE_9 item 8): the battle's touch FLEE, AUTO and x1 buttons were tapped on
// their art, about 50 x 25 css px each on the phone, 2 to 3 px apart. Their tap targets now reach above and below the art
// and split each gap at its middle. Pure node checks: sizes in css px on the phone profiles qa/shots.json uses, no overlap
// between the three or with the menus beside them, every tap goes to the nearest button, and the scene reads the targets.
// Issue #88: portrait (one game px = one css px) gets the lens, a pad under the game that draws FLEE / AUTO / x1 and the
// command window or the open sub-list again, bigger, and maps taps there back into the game (core/renderer.js placeLens).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeLayout, placeLens, PAD, LENS_ROW_CSS, Renderer } from '../../src/core/renderer.js';
import { BattleScene } from '../../src/scenes/battle.js';
import { CommandMenu } from '../../src/battle/scene/menu.js';
import * as L from '../../src/battle/scene/layout.js';
import { battle } from '../battle/_helpers.mjs';
import { TOUCH_ROW_H } from '../../src/ui/list.js';

const SPEC = JSON.parse(readFileSync(new URL('../shots.json', import.meta.url), 'utf8'));
const KEYS = ['flee', 'auto', 'speed'];
const rect = (b) => ({ x: b.x, y: b.y, w: b.w, h: b.h });
const area = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const inside = (p, b) => p.x >= b.x && p.y >= b.y && p.x < b.x + b.w && p.y < b.y + b.h;
const dist = (p, b) => Math.hypot(Math.max(b.x - p.x, 0, p.x - (b.x + b.w - 1)), Math.max(b.y - p.y, 0, p.y - (b.y + b.h - 1)));
/** css px per game px on a shots.json device (the renderer's own layout, touch controls on). */
function cssPerPx(name) {
  const d = SPEC.devices[name];
  return computeLayout({ devW: d.width * d.dpr, devH: d.height * d.dpr, dpr: d.dpr, touch: { minBar: 84 } }).cssScale;
}
/** Both layouts the help window has: plain (top left) and docked under the timeline (W13). */
function eachLayout(fn) {
  fn('plain');
  L.STAGE.tall.add('_boss'); L.STAGE.actors = null;
  try { fn('docked'); } finally { L.STAGE.tall.clear(); }
}

test('the phone profiles: landscape is 5/3 css px per game px, portrait 1', () => {
  assert.equal(cssPerPx('phone'), 5 / 3);
  assert.equal(cssPerPx('portrait'), 1);
});

test('each tap target holds its art, and the three never overlap', () => {
  eachLayout((lay) => {
    for (const k of KEYS) {
      const art = rect(L.HELP_TOUCH_BTNS[k]), hit = rect(L.HELP_TOUCH_HITS[k]);
      assert.equal(area(art, hit), art.w * art.h, `${lay} ${k}: the art is inside its target`);
      assert.ok(hit.x >= 0 && hit.y >= 0 && hit.x + hit.w <= L.W && hit.y + hit.h <= L.H, `${lay} ${k}: on screen`);
    }
    for (let i = 0; i < KEYS.length; i++) for (let j = i + 1; j < KEYS.length; j++) {
      assert.equal(area(rect(L.HELP_TOUCH_HITS[KEYS[i]]), rect(L.HELP_TOUCH_HITS[KEYS[j]])), 0, `${lay}: ${KEYS[i]} and ${KEYS[j]} do not overlap`);
    }
  });
});

test('landscape phone: every target is at least 44 css px each way (the art was about 50 x 25)', () => {
  const k = cssPerPx('phone');
  for (const key of KEYS) {
    const art = L.HELP_TOUCH_BTNS[key], hit = L.HELP_TOUCH_HITS[key];
    assert.ok(art.h * k < 26, `${key}: the art alone is ${art.h * k} css px tall`);
    assert.ok(hit.w * k >= 44 && hit.h * k >= 44, `${key}: ${hit.w * k} x ${hit.h * k} css px`);
  }
  // Portrait draws one game px as one css px: in the game itself the target is 27 tall; the lens (below) takes it past 44.
  const p = cssPerPx('portrait');
  for (const key of KEYS) assert.ok(L.HELP_TOUCH_HITS[key].h * p >= 27 && L.HELP_TOUCH_HITS[key].h > L.HELP_TOUCH_BTNS[key].h, `portrait ${key}`);
});

/** The renderer's layout on a shots.json device with the touch controls on. */
function view(name) {
  const d = SPEC.devices[name];
  return computeLayout({ devW: d.width * d.dpr, devH: d.height * d.dpr, dpr: d.dpr, touch: { minBar: 84 } });
}
const clip = (a, b) => { const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y); return { x, y, w: Math.max(0, Math.min(a.x + a.w, b.x + b.w) - x), h: Math.max(0, Math.min(a.y + a.h, b.y + b.h) - y) }; };
const ROOT = () => [L.helpLensRect(), { ...L.CMD_WIN_TOUCH, rowH: L.TOUCH_CMD_ROW_H }];
const SUB = () => [L.helpLensRect(), { ...L.SUB_WIN_TOUCH, rowH: L.LENS_SUB_ROW_H }];

test('portrait: a pad under the game, the controls still fit under it; landscape has none', () => {
  const v = view('portrait'), d = SPEC.devices.portrait;
  assert.equal(v.touchMode, 'below');
  assert.ok(v.pad, 'portrait has the pad');
  assert.ok(v.pad.y >= v.cssY + v.cssH && v.pad.h === PAD.want, `the pad (${JSON.stringify(v.pad)}) is under the game and full height`);
  assert.ok(v.pad.y + v.pad.h + 2 * PAD.gap + PAD.controls <= d.height, 'RUN, MENU, the d-pad and A / B keep their room under it');
  assert.ok(v.pad.x >= 0 && v.pad.x + v.pad.w <= d.width);
  for (const name of ['phone', 'desktop', 'tablet']) {
    assert.equal(view(name).pad, null, `${name}: no pad`);
    assert.deepEqual(placeLens(ROOT(), view(name)), [], `${name}: no lens`);
  }
});

test('portrait lens: command rows, sub-list rows and FLEE / AUTO / x1 are 44 css px or more (in the game: 18, 22, 27)', () => {
  const v = view('portrait'), dpr = v.dpr;
  eachLayout((lay) => {
    const root = placeLens(ROOT(), v), sub = placeLens(SUB(), v);
    assert.equal(root.length, 2, `${lay}: both rects fit`);
    assert.equal(sub.length, 2, `${lay}: both rects fit`);
    const [strip, cmd] = root;
    for (const k of KEYS) {
      const c = clip(rect(L.HELP_TOUCH_HITS[k]), strip.src);
      assert.ok(c.w * strip.k / dpr >= LENS_ROW_CSS && c.h * strip.k / dpr >= LENS_ROW_CSS, `${lay} ${k}: ${c.w * strip.k / dpr} x ${c.h * strip.k / dpr} css px in the lens`);
      const art = L.HELP_TOUCH_BTNS[k];
      assert.equal(area(rect(art), strip.src), art.w * art.h, `${lay} ${k}: the whole button is in the lens`);
    }
    assert.ok(L.TOUCH_CMD_ROW_H * v.cssScale < 20, 'the command rows in the game are still 18 css px');
    assert.ok(L.TOUCH_CMD_ROW_H * cmd.k / dpr >= LENS_ROW_CSS, `command rows ${L.TOUCH_CMD_ROW_H * cmd.k / dpr} css px in the lens`);
    assert.ok(L.LENS_SUB_ROW_H * sub[1].k / dpr >= LENS_ROW_CSS, `sub-list rows ${L.LENS_SUB_ROW_H * sub[1].k / dpr} css px in the lens`);
    for (const set of [root, sub]) {
      for (const R of set) {
        assert.ok(R.x >= v.pad.x * dpr && R.x + R.w <= (v.pad.x + v.pad.w) * dpr + 1 && R.y >= v.pad.y * dpr && R.y + R.h <= (v.pad.y + v.pad.h) * dpr + 1, `${lay}: lens ${JSON.stringify(R.src)} inside the pad`);
        assert.equal(R.w, R.src.w * R.k); assert.equal(R.h, R.src.h * R.k);
        assert.ok(Number.isInteger(R.k) && Number.isInteger(R.x) && Number.isInteger(R.y), 'whole device px per game px, on whole device px');
      }
      assert.ok(set[0].y + set[0].h <= set[1].y, `${lay}: stacked, no overlap`);
    }
  });
});

test('portrait lens: a stack taller than the pad steps the biggest scale down, never past the pad', () => {
  const v = { ...view('portrait') };
  v.pad = { ...v.pad, h: 180 };
  const out = placeLens(ROOT(), v);
  const bottom = Math.max(...out.map((R) => R.y + R.h));
  assert.ok(bottom <= (v.pad.y + v.pad.h) * v.dpr, 'inside the short pad');
  assert.ok(out.length === 2 && out[1].k < placeLens(ROOT(), view('portrait'))[1].k, 'the command window gave way');
  assert.deepEqual(placeLens(null, v), []);
  assert.deepEqual(placeLens(ROOT(), { ...v, pad: null }), []);
});

test('portrait lens: a tap on the lens lands on the game px it shows (Renderer.toGame)', () => {
  const v = view('portrait');
  const lens = placeLens(ROOT(), v);
  const fake = { view: v, visible: { getBoundingClientRect: () => ({ left: 0, top: 0 }) }, _lens: lens };
  const toGame = (cx, cy) => Renderer.prototype.toGame.call(fake, cx, cy);
  for (const R of lens) {
    for (const [gx, gy] of [[R.src.x + 1, R.src.y + 1], [R.src.x + R.src.w - 1, R.src.y + R.src.h - 1], [R.src.x + R.src.w / 2, R.src.y + R.src.h / 2]]) {
      const p = toGame((R.x + (gx - R.src.x) * R.k + 1) / v.dpr, (R.y + (gy - R.src.y) * R.k + 1) / v.dpr);
      assert.ok(Math.abs(p.x - gx) < 1 && Math.abs(p.y - gy) < 1, `(${gx}, ${gy}) through the lens came back as (${p.x}, ${p.y})`);
    }
  }
  // the game itself still maps one to one, and a tap beside the lens is not taken by it
  const g = toGame(v.cssX + 100.5 * v.cssScale, v.cssY + 50.5 * v.cssScale);
  assert.ok(Math.abs(g.x - 100.5) < 1e-6 && Math.abs(g.y - 50.5) < 1e-6);
  const beside = toGame(1, lens[0].y / v.dpr + 2);
  assert.ok(beside.y > L.H, 'a tap left of the strip is below the game, nowhere near a button');
});

test('a tap in a target always lands on the nearest button', () => {
  eachLayout((lay) => {
    const hits = KEYS.map((k) => rect(L.HELP_TOUCH_HITS[k])), arts = KEYS.map((k) => rect(L.HELP_TOUCH_BTNS[k]));
    let n = 0;
    for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) {
      const i = hits.findIndex((h) => inside({ x, y }, h));
      if (i < 0) continue;
      n++;
      const d = arts.map((a) => dist({ x, y }, a));
      assert.ok(d[i] <= Math.min(...d), `${lay} (${x}, ${y}) is in ${KEYS[i]}'s target but nearer another button`);
    }
    assert.ok(n > 0);
  });
});

test('the targets stay off the menus and the rows beside them', () => {
  eachLayout((lay) => {
    for (const k of KEYS) {
      const hit = rect(L.HELP_TOUCH_HITS[k]);
      for (const [name, win] of [['command', L.CMD_WIN_TOUCH], ['sub-list', L.SUB_WIN_TOUCH], ['status', L.STATUS_WIN]]) assert.equal(area(hit, win), 0, `${lay} ${k} is clear of the ${name} window`);
      // a list takes a finger's tap one row outside its rows (ui/list.js slop): those zones stay clear too (menu.js lists)
      const cmd = L.CMD_WIN_TOUCH, sub = L.SUB_WIN_TOUCH, cr = L.TOUCH_CMD_ROW_H, sr = TOUCH_ROW_H;
      const zones = {
        command: { x: cmd.x + 18 - cr, y: cmd.y + 4 - cr, w: L.CMD_COLS * L.CMD_COL_W + 2 * cr, h: L.CMD_ROWS * cr + 2 * cr },
        'sub-list': { x: sub.x + 18 - sr, y: sub.y + 6 - sr, w: sub.w - 24 + 2 * sr, h: L.cmdRowsFor(sub, sr) * sr + 2 * sr },
      };
      for (const [name, z] of Object.entries(zones)) assert.equal(area(hit, z), 0, `${lay} ${k} is clear of the ${name} list's tap slop`);
      // No foe's head sits there: plain, within a two-line help window (a head under it docks the window, W13);
      // docked, within HELP_DOCK_MAX's columns and above its bottom (helpDock() keeps other heads out of it).
      if (lay === 'plain') assert.ok(hit.y + hit.h <= L.HELP_WIN.y + L.HELP_WIN.h + L.HELP_LINE, `plain ${k} ends inside the two-line window`);
      else {
        const m = L.HELP_DOCK_MAX;
        assert.ok(hit.x >= m.x && hit.x + hit.w <= m.x + m.w && hit.y + hit.h <= m.y + m.h, `docked ${k} inside the dock's reserved box`);
      }
    }
  });
});

// The scene: taps are read on the targets, so a tap above or below the art reaches the button.
function rig(device = 'phone') {
  const b = battle([{ id: 'ink_slime' }, { id: 'ink_slime' }]);
  const tap = { at: null };
  const input = {
    get pointer() { return tap.at ? { pressed: true, x: tap.at.x, y: tap.at.y } : { pressed: false }; },
    tapIn(x, y, w, h) { const p = tap.at; return !!p && p.x >= x && p.y >= y && p.x < x + w && p.y < y + h; },
    pressed: () => false, consume() {}, repeatDir: () => null,
  };
  const set = [];
  const audio = { sfx() {}, pushMusic() {} };
  const engine = { input, audio, touch: { visible: true }, settings: {}, setSetting(k, v) { set.push([k, v]); }, renderer: { view: view(device) } };
  const scene = {
    engine, b, phase: 'play', below: null, auto: false, actors: new Map(), speed: 1,
    touchButtons() { return BattleScene.prototype.touchButtons.call(this); },
    lensRects() { return BattleScene.prototype.lensRects.call(this); },
    runOps() { return false; }, performParty() {},
  };
  scene.menu = new CommandMenu(scene);
  while (b.current().side !== 'party') b.runEnemyTurn();
  scene.menu.open(b.current());
  const tapAt = (x, y) => { tap.at = { x, y }; BattleScene.prototype.updatePlay.call(scene); tap.at = null; };
  return { scene, set, tapAt };
}

test('a tap just above or below the art reaches AUTO, x1 and FLEE', () => {
  const { scene, set, tapAt } = rig();
  const { auto, speed, flee } = L.HELP_TOUCH_BTNS;
  tapAt(auto.x + 2, 1);                                   // in the top margin over AUTO
  assert.deepEqual(set.at(-1), ['autoBattle', true]);
  tapAt(speed.x + speed.w - 1, speed.y + speed.h + 3);    // under x1's bottom edge
  assert.deepEqual(set.at(-1), ['battleSpeed', 2]);
  assert.equal(set.length, 2, 'each tap reached one button');
  tapAt(flee.x - 2, flee.y + flee.h + 2);                 // below and left of FLEE
  assert.ok(scene.menu.fleeArmed > 0, 'FLEE armed');
  tapAt(flee.x + flee.w / 2, L.HELP_TOUCH_HITS.flee.y + L.HELP_TOUCH_HITS.flee.h + 1);   // past the target: nothing
  assert.equal(set.length, 2);
});

test('the scene asks for the lens in portrait only: FLEE / AUTO / x1, then the commands or the open sub-list', () => {
  const p = rig('portrait');
  const rects = p.scene.lensRects();
  assert.equal(rects.length, 2);
  assert.deepEqual(rects[0], L.helpLensRect());
  assert.deepEqual(rects[1], { ...p.scene.menu.cmdRect, rowH: L.TOUCH_CMD_ROW_H });
  const item = p.scene.b.commands(p.scene.menu.unit).find((c) => c.id === 'item');
  assert.ok(p.scene.menu.openSub(item), 'the Item list opens');
  assert.equal(p.scene.menu.sub.rowH, L.LENS_SUB_ROW_H, 'portrait sub-list rows are 22 px');
  assert.equal(p.scene.menu.sub.rows, 3);
  assert.deepEqual(p.scene.lensRects()[1], { ...p.scene.menu.subRect, rowH: L.LENS_SUB_ROW_H });
  const l = rig('phone');
  assert.equal(l.scene.lensRects(), null, 'landscape: no lens');
  assert.ok(l.scene.menu.openSub(l.scene.b.commands(l.scene.menu.unit).find((c) => c.id === 'item')));
  assert.equal(l.scene.menu.sub.rowH, L.TOUCH_CMD_ROW_H, 'landscape sub-list rows unchanged');
});
