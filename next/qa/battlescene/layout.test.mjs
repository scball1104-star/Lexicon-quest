// Layout invariants: every slot is on screen and the stage never collides with the bottom windows.
import test from 'node:test';
import assert from 'node:assert/strict';
import { W, H, partySlots, enemySlots, summonSlot, BOSS_SLOT, HELP_WIN, CMD_WIN, STATUS_WIN, SUB_WIN, TL, timelineSlotX,
  enemyRowAnchor, unitBox, statusRow, enemyFaceRect, REWARD_WIN, LEVEL_WIN } from '../../src/battle/scene/layout.js';

const inside = (x, y) => x >= 0 && x < W && y >= 0 && y < H;

test('party and enemy slots stand above the bottom windows and inside the screen', () => {
  for (let n = 1; n <= 3; n++) for (const s of partySlots(n)) { assert.ok(inside(s.x, s.y)); assert.ok(s.y <= STATUS_WIN.y, `party feet above the status window (${s.y})`); }
  for (let n = 1; n <= 5; n++) {
    const slots = enemySlots(n);
    assert.equal(slots.length, n);
    for (const s of slots) { assert.ok(inside(s.x, s.y)); assert.ok(s.y <= 156); assert.ok(s.x < 260, 'enemies stay left of the party'); }
  }
  assert.ok(inside(BOSS_SLOT.x, BOSS_SLOT.y));
  for (let i = 0; i < 6; i++) { const s = summonSlot(i); assert.ok(inside(s.x, s.y)); }
});

test('the command window holds two columns of four rows (W7)', async () => {
  const { CMD_COLS, CMD_ROWS, CMD_COL_W, CMD_ROW_H, TOUCH_CMD_ROW_H, CMD_WIN_TOUCH } = await import('../../src/battle/scene/layout.js');
  assert.equal(CMD_COLS, 2); assert.equal(CMD_ROWS, 4);
  assert.ok(18 + CMD_COLS * CMD_COL_W + 4 <= CMD_WIN.w, 'glove + two columns + air fit the window');
  assert.ok(6 + CMD_ROWS * CMD_ROW_H <= CMD_WIN.h, 'four desktop rows fit the window height');
  assert.ok(4 + CMD_ROWS * TOUCH_CMD_ROW_H + 4 <= CMD_WIN_TOUCH.h, 'four touch rows fit the touch window height');
  assert.ok(TOUCH_CMD_ROW_H * 5 / 3 >= 30, 'touch command rows are at least 30 css px on the phone profile');
});

test('windows tile the bottom band and the timeline fits the top right', () => {
  assert.equal(CMD_WIN.x + CMD_WIN.w + 2, STATUS_WIN.x);
  assert.equal(CMD_WIN.y + CMD_WIN.h, H - 4);
  assert.equal(STATUS_WIN.x + STATUS_WIN.w, W - 4);
  assert.ok(SUB_WIN.y + SUB_WIN.h <= CMD_WIN.y);
  assert.ok(HELP_WIN.x + HELP_WIN.w < TL.x);
  assert.ok(timelineSlotX(TL.slots - 1) + TL.slot <= W - 4);
  for (let i = 1; i < TL.slots; i++) assert.ok(timelineSlotX(i) > timelineSlotX(i - 1));
  for (const w of [REWARD_WIN, LEVEL_WIN]) assert.ok(w.x >= 0 && w.x + w.w <= W && w.y >= 0 && w.y + w.h <= STATUS_WIN.y);
});

test('status rows stay inside the status window', () => {
  for (let i = 0; i < 3; i++) {
    const L = statusRow(i);
    assert.ok(L.y >= STATUS_WIN.y && L.y + 17 <= STATUS_WIN.y + STATUS_WIN.h);
    assert.ok(L.status[0] + 45 <= STATUS_WIN.x + STATUS_WIN.w);
  }
});

test('enemy row and unit boxes are clamped on screen', () => {
  for (const u of [{ x: 2, y: 100 }, { x: 380, y: 150 }, { x: 118, y: 146 }]) {
    const a = enemyRowAnchor(u);
    assert.ok(a.x >= 4 && a.x + 72 <= W - 4 && a.y + 14 <= STATUS_WIN.y);
  }
  const box = unitBox({ x: 100, y: 146, w: 66, h: 62 });
  assert.deepEqual(box, { x: 67, y: 84, w: 66, h: 62 });
});

test('enemy face crops stay inside their frame', () => {
  for (const id of ['ink_slime', 'briar_wolf', 'archivore', 'unknown_thing']) {
    const f = { x: 10, y: 20, w: 51, h: 50 };
    const r = enemyFaceRect(f, id);
    assert.ok(r.x >= f.x && r.x + 14 <= f.x + f.w && r.y >= f.y && r.y + 14 <= f.y + f.h, id);
  }
});

test('touch layout (W5, W7): 18 px rows keep four command rows and the windows stay inside the bottom band', async () => {
  const { cmdWin, subWin, cmdRowsFor, CMD_WIN_TOUCH, SUB_WIN_TOUCH, HELP_TOUCH_BTNS, CMD_ROW_H, TOUCH_CMD_ROW_H } = await import('../../src/battle/scene/layout.js');
  const TOUCH_ROW_H = TOUCH_CMD_ROW_H;
  assert.deepEqual(cmdWin(false), CMD_WIN); assert.deepEqual(subWin(false), SUB_WIN);
  assert.deepEqual(cmdWin(true), CMD_WIN_TOUCH); assert.deepEqual(subWin(true), SUB_WIN_TOUCH);
  assert.equal(cmdRowsFor(CMD_WIN, CMD_ROW_H), 4);
  assert.equal(cmdRowsFor(CMD_WIN_TOUCH, TOUCH_ROW_H, 8), 4, 'four rows at the touch height (4 px padding)');
  assert.equal(cmdRowsFor(SUB_WIN_TOUCH, TOUCH_ROW_H), 4);
  assert.equal(CMD_WIN_TOUCH.x, CMD_WIN.x); assert.equal(CMD_WIN_TOUCH.w, CMD_WIN.w);
  assert.equal(CMD_WIN_TOUCH.y + CMD_WIN_TOUCH.h, H - 4, 'the touch command window keeps the bottom edge');
  assert.ok(SUB_WIN_TOUCH.y + SUB_WIN_TOUCH.h <= CMD_WIN_TOUCH.y, 'sub-list above the command window');
  assert.ok(CMD_WIN_TOUCH.y < CMD_WIN.y && CMD_WIN_TOUCH.y + CMD_WIN_TOUCH.h <= H);
  for (const b of Object.values(HELP_TOUCH_BTNS)) assert.ok(b.x >= HELP_WIN.x && b.x + b.w <= HELP_WIN.x + HELP_WIN.w && b.y >= HELP_WIN.y && b.y + b.h <= HELP_WIN.y + HELP_WIN.h, 'touch buttons sit inside the help window');
});

test('an enemy weakness row never sits under the command window (desktop and touch)', async () => {
  const L = await import('../../src/battle/scene/layout.js');
  for (const touch of [false, true]) {
    const cw = L.cmdWin(touch);
    for (let x = 10; x <= 200; x += 5) {
      const { x: rx, y: ry } = L.enemyRowAnchor({ x, y: 146 }, touch);
      const w = 12 + 15 * 4;
      const overlapX = rx < cw.x + cw.w && rx + w > cw.x;
      if (overlapX) assert.ok(ry + L.ENEMY_ROW_H <= cw.y, `row at x ${x} (touch ${touch}) overlaps the command window`);
    }
  }
});

test('touch stage (W11, CRITIQUE_4 item 1): no foe stands behind the touch command window, rows cover no sprite', async () => {
  const L = await import('../../src/battle/scene/layout.js');
  const cw = L.CMD_WIN_TOUCH;
  // Sizes of the real formations: the Other Selves (party-sized), slimes, wolves, a knight + sentinel + swarm.
  const groups = [
    [{ w: 24, h: 31 }, { w: 24, h: 30 }, { w: 23, h: 31 }],
    [{ w: 51, h: 50 }, { w: 51, h: 50 }, { w: 51, h: 50 }],
    [{ w: 66, h: 62 }, { w: 66, h: 62 }],
    [{ w: 95, h: 98 }, { w: 90, h: 90 }, { w: 34, h: 31 }],
    [{ w: 44, h: 40 }, { w: 44, h: 40 }, { w: 44, h: 40 }, { w: 70, h: 74 }],
  ];
  for (const sizes of groups) {
    const slots = L.enemySlots(sizes.length).map((s, i) => ({ ...L.touchEnemySlot(s, sizes[i]), ...sizes[i] }));
    const units = slots.map((s) => ({ x: s.x, y: s.y, homeX: s.x, homeY: s.y, w: s.w, h: s.h }));
    for (const u of units) {
      const box = L.spriteBox(u);
      const covered = Math.max(0, Math.min(box.x + box.w, cw.x + cw.w) - Math.max(box.x, cw.x)) * Math.max(0, box.y + box.h - cw.y);
      assert.ok(covered <= box.w * box.h * 0.1, `at most a tenth of a ${u.w}x${u.h} foe is behind the touch command window (${covered})`);
      assert.ok(box.y >= 26, 'its head stays under the help window');
    }
    // Every row at once (the worst case), placed left to right as the scene does.
    const placed = [];
    for (const u of units) {
      const boxes = units.filter((o) => o !== u).map((o) => L.spriteBox(o));
      const s = L.touchRowSpot(u, 75, { placed, boxes });
      const row = { x: s.x, y: s.y, w: 75, h: L.ENEMY_ROW_H };
      const own = L.spriteBox(u);
      const onOwn = Math.max(0, Math.min(row.x + row.w, own.x + own.w) - Math.max(row.x, own.x)) * Math.max(0, Math.min(row.y + row.h, own.y + own.h) - Math.max(row.y, own.y));
      if (u.h <= 74) assert.equal(onOwn, 0, `a ${u.w}x${u.h} foe's row is off its sprite (${s.place})`);
      assert.ok(onOwn <= own.w * 12, `a ${u.w}x${u.h} foe's row covers at most a sliver of its top`);
      for (const win of [cw, L.STATUS_WIN, ...L.topBlocks()]) {
        const hit = row.x < win.x + win.w && row.x + row.w > win.x && row.y < win.y + win.h && row.y + row.h > win.y;
        assert.ok(!hit, `row (${s.place} at ${row.x},${row.y}) stays off the windows`);
      }
      placed.push(row);
    }
  }
  // The desktop stage does not move.
  for (let n = 1; n <= 5; n++) assert.deepEqual(L.enemySlots(n).map((s) => s.y), Array(n).fill(L.BASELINE.enemy));
});
