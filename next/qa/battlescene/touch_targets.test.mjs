// Issue #82 (docs/ACCESSIBILITY.md item 8, CRITIQUE_9 item 8): the battle's touch FLEE, AUTO and x1 buttons were tapped on
// their art, about 50 x 25 css px each on the phone, 2 to 3 px apart. Their tap targets now reach above and below the art
// and split each gap at its middle. Pure node checks: sizes in css px on the phone profiles qa/shots.json uses, no overlap
// between the three or with the menus beside them, every tap goes to the nearest button, and the scene reads the targets.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeLayout } from '../../src/core/renderer.js';
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
  // Portrait draws one game px as one css px: 44 would need a taller help window (a layout change); the target still grows.
  const p = cssPerPx('portrait');
  for (const key of KEYS) assert.ok(L.HELP_TOUCH_HITS[key].h * p >= 27 && L.HELP_TOUCH_HITS[key].h > L.HELP_TOUCH_BTNS[key].h, `portrait ${key}`);
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
function rig() {
  const b = battle([{ id: 'ink_slime' }, { id: 'ink_slime' }]);
  const tap = { at: null };
  const input = {
    get pointer() { return tap.at ? { pressed: true, x: tap.at.x, y: tap.at.y } : { pressed: false }; },
    tapIn(x, y, w, h) { const p = tap.at; return !!p && p.x >= x && p.y >= y && p.x < x + w && p.y < y + h; },
    pressed: () => false, consume() {}, repeatDir: () => null,
  };
  const set = [];
  const audio = { sfx() {}, pushMusic() {} };
  const engine = { input, audio, touch: { visible: true }, settings: {}, setSetting(k, v) { set.push([k, v]); } };
  const scene = {
    engine, b, phase: 'play', below: null, auto: false, actors: new Map(), speed: 1,
    touchButtons() { return BattleScene.prototype.touchButtons.call(this); },
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
