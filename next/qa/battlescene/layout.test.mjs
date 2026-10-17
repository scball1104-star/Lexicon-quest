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
