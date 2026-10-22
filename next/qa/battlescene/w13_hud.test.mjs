// W13 (the King fight's HUD): a tall boss's crown and face stay clear of the help window, the telegraph "!", its
// weakness row and its name tag, on the desktop and the touch layout. The Nameless King's real frame (142 x 138,
// feet at y 164) docks the help window under the timeline; Sorrow and Pride standing in phase 2 send it back to its
// corner; the Episode 1 bosses keep the corner.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../../src/battle/scene/layout.js';
import { helpHeight, drawTelegraphMarker, drawNameTag } from '../../src/battle/scene/hud.js';

const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const unit = (uid, id, x, y, w, h, extra = {}) => ({ uid, id, side: 'enemy', x, y, homeX: x, homeY: y, w, h, cx: x, top: y - h, ...extra });
const king = () => unit('e0', 'nameless_king', L.BOSS_SLOT.x, 164, 142, 138, { boss: true, name: 'The Nameless King' });
const reset = () => L.planStage([], null);
const HELP2 = { x: L.HELP_WIN.x, y: L.HELP_WIN.y, w: L.HELP_WIN.w, h: L.HELP_WIN.h + L.HELP_LINE };

// A renderer stand-in: records sprites and text, measures 5 px a glyph, draws nothing.
function fakeR() {
  const calls = { sprites: [], text: [] };
  const ui = { frames: { emote_exclaim_0: { x: 0, y: 0, w: 16, h: 16, ox: 4, oy: 15, name: 'emote_exclaim_0' } }, anims: { emote_exclaim: { frames: ['emote_exclaim_0'], fps: 8 } } };
  const base = {
    assets: { has: (id) => id === 'ui', atlas: () => ui }, settings: {}, ctx: { fillRect() {}, globalAlpha: 1 },
    sprite: (a, f, x, y) => calls.sprites.push({ name: f.name, x: x - f.ox, y: y - f.oy, w: f.w, h: f.h }),
    text: (s, x, y) => calls.text.push({ s, x, y }), measure: (s) => String(s).length * 5,
  };
  return { r: new Proxy(base, { get: (t, k) => (k in t ? t[k] : () => {}) }), calls };
}

test('the Nameless King docks the help window under the timeline; the Episode 1 bosses keep the corner', () => {
  const k = king();
  assert.ok(overlap(L.headBox(k), HELP2) > 0, 'his crown is under a two-line help window');
  assert.deepEqual(L.planStage([k], new Map([[k.uid, k]])), L.HELP_DOCK);
  assert.deepEqual(L.helpOrigin(), { x: L.HELP_DOCK.x, y: L.HELP_DOCK.y });
  // the dock: on screen, right-aligned with the rail, below the timeline and the landing slot it hangs while targeting
  const dock = L.HELP_DOCK_MAX;
  assert.ok(dock.x >= 0 && dock.x + dock.w <= L.W && dock.y + dock.h < L.STATUS_WIN.y, 'on screen, above the status window');
  assert.equal(L.HELP_DOCK.x + L.HELP_WIN.w, L.TL.x + L.TL.railW, 'right-aligned with the timeline rail');
  assert.ok(L.HELP_DOCK.y - 2 >= L.TL.y + 10 + 20 + 6, 'below the landing slot (at TL.y + 10, 18 px) and its bobbing arrow (6 px)');
  assert.equal(overlap(L.headBox(k), dock), 0, 'the dock at its tallest leaves his head clear');
  // the corner is the boss's own now: no top-left block, the dock blocks rows instead
  const blocks = L.topBlocks(40);
  assert.ok(!blocks.some((b) => b.x === L.HELP_WIN.x && b.y === 0), 'no help block in the corner');
  assert.ok(blocks.some((b) => overlap(b, L.HELP_DOCK_MAX) > 0), 'the dock is blocked');
  // Episode 1 and the other Episode 2 bosses (home spots, desktop and touch) never dock
  const others = [
    unit('a', 'archivore', 98, 146, 148, 139), unit('w', 'echo_warden', 98, 146, 96, 98), unit('w', 'echo_warden', 98, 140, 96, 98),
    unit('b', 'briar_alpha', 98, 146, 84, 81), unit('r1', 'refl_hero', 52, 146, 24, 31),
  ];
  for (const u of others) assert.equal(L.planStage([u], new Map([[u.uid, u]])), null, `${u.id} keeps the corner`);
  reset();
});

test('the touch buttons travel with the docked help window and come home after', () => {
  const k = king();
  L.planStage([k], new Map([[k.uid, k]]));
  const o = L.helpOrigin();
  const win = { x: o.x, y: o.y, w: L.HELP_WIN.w, h: L.HELP_WIN.h };
  for (const b of Object.values(L.HELP_TOUCH_BTNS)) assert.ok(overlap(b, win) === b.w * b.h, 'inside the docked help window');
  assert.equal(L.HELP_TOUCH_BTNS.flee.x, 124 + L.HELP_DOCK.x - L.HELP_WIN.x);
  assert.equal(JSON.parse(JSON.stringify(L.HELP_TOUCH_BTNS)).auto.y, 6 + L.HELP_DOCK.y - L.HELP_WIN.y, 'the debug state serializes where they are');
  reset();
  assert.deepEqual({ x: L.HELP_TOUCH_BTNS.flee.x, y: L.HELP_TOUCH_BTNS.flee.y }, { x: 124, y: 6 }, 'plain layout again');
});

test('phase 2: Sorrow and Pride under the dock send the help window back to its corner until they fall', () => {
  const k = king();
  const pride = unit('e1', 'false_pride', 214, 146, 95, 96), sorrow = unit('e2', 'false_sorrow', 200, 146, 83, 83);
  const actors = new Map([[k.uid, k]]);
  L.planStage([k], actors);
  assert.ok(L.helpDock(), 'phase 1: docked');
  actors.set(pride.uid, pride); actors.set(sorrow.uid, sorrow);
  assert.equal(L.helpDock(), null, 'their heads would sit under the dock');
  pride.dead = true;
  assert.equal(L.helpDock(), null, 'one still stands');
  sorrow.dead = true;
  assert.ok(L.helpDock(), 'phase 3: docked again');
  k.dead = true;
  assert.ok(L.helpDock(), 'the King falling does not move the window during his death');
  reset();
});

test('the King\'s weakness row keeps off his crown and face, docked or not', () => {
  const k = king();
  for (const docked of [true, false]) {
    if (docked) L.planStage([k], new Map([[k.uid, k]]));
    else { const pride = unit('e1', 'false_pride', 214, 146, 95, 96); L.planStage([k], new Map([[k.uid, k], [pride.uid, pride]])); }
    for (const helpBottom of [23, 34, 45]) {
      for (const touch of [false, true]) {
        const s = L.touchRowSpot(k, 75, { cw: L.cmdWin(touch), blocks: L.topBlocks(helpBottom), boxes: [] });
        const row = { x: s.x, y: s.y, w: 75, h: L.ENEMY_ROW_H };
        assert.equal(overlap(row, L.headBox(k)), 0, `docked ${docked}, help to y ${helpBottom}, touch ${touch}: ${s.place} at ${s.x},${s.y}`);
        for (const b of [L.cmdWin(touch), L.STATUS_WIN, ...L.topBlocks(helpBottom)]) assert.equal(overlap(row, b), 0, 'off the windows');
        if (docked) assert.equal(s.place, 'band', 'docked: in the free top band beside the crown');
      }
    }
  }
  reset();
});

test('the "!" stands beside a head it would cover, and the name tag never sits on the face', () => {
  const k = king();
  L.planStage([k], new Map([[k.uid, k]]));
  assert.equal(helpHeight({ measure: () => 999, wrap: (s) => [s, s] }, 'long', null, {}), 0, 'docked: the corner holds no window');
  const head = L.headBox(k, false);
  for (const minY of [28, 40, 51]) {
    const { r, calls } = fakeR();
    drawTelegraphMarker(r, k, 0, 1, minY, null);
    const b = calls.sprites[0];
    assert.equal(overlap(b, head), 0, `"!" off the head (minY ${minY})`);
    assert.ok(b.x + b.w <= L.HELP_DOCK.x, '"!" clear of the docked help window');
  }
  // a small foe keeps its "!" over its head, the tail just touching it
  const wolf = unit('e9', 'briar_wolf', 160, 146, 66, 62);
  { const { r, calls } = fakeR(); drawTelegraphMarker(r, wolf, 0, 1, 28, null); const b = calls.sprites[0]; assert.ok(b.y + b.h <= wolf.top + 3 && b.x < wolf.x + 20, 'a wolf keeps the classic spot'); }
  // name tag: docked, beside the row in the top band; undocked under a grown help window, under the head
  const row = (() => { const s = L.touchRowSpot(k, 45, { cw: L.CMD_WIN, blocks: L.topBlocks(23), boxes: [] }); return { x: s.x, y: s.y, w: 45, h: L.ENEMY_ROW_H }; })();
  for (const [docked, minY, rowArg] of [[true, 6, row], [false, 36, null]]) {
    if (!docked) { const pride = unit('e1', 'false_pride', 214, 146, 95, 96); L.planStage([k], new Map([[k.uid, k], [pride.uid, pride]])); }
    const { r, calls } = fakeR();
    drawNameTag(r, k, null, null, { row: rowArg, minY });
    const t = calls.text.find((c) => c.s === k.name);
    const tag = { x: t.x - 7, y: t.y - 3, w: k.name.length * 5 + 14, h: 17 };
    assert.equal(overlap(tag, L.headBox(k, false)), 0, `docked ${docked}: tag at ${tag.x},${tag.y} is off the face`);
    if (rowArg) assert.equal(overlap(tag, rowArg), 0, 'and off the row');
  }
  reset();
});
