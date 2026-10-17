// CTB timeline math, turn order, preview correctness, timeline pushes.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as CTB from '../../src/battle/ctb.js';
import { battle, untilTurn, midRng } from './_helpers.mjs';

test('speed lowers delay; a ROUND is a SPD 10 normal action', () => {
  assert.equal(CTB.baseDelay(10), CTB.ROUND_TICKS);
  for (let s = 1; s < 40; s++) assert.ok(CTB.baseDelay(s + 1) < CTB.baseDelay(s));
  assert.ok(CTB.actionDelay(12, 50) < CTB.actionDelay(12, 100));
  assert.ok(CTB.actionDelay(12, 100, { haste: { turns: 2 } }) < CTB.actionDelay(12, 100));
  assert.ok(CTB.actionDelay(12, 100, { chill: { turns: 2 } }) > CTB.actionDelay(12, 100));
  assert.equal(CTB.actionDelay(12, 100, { haste: { turns: 1 }, chill: { turns: 1 } }), CTB.actionDelay(12, 100));
});

test('a faster unit gets proportionally more turns', () => {
  const order = CTB.peek([
    { uid: 'fast', next: 0, tie: 0, spd: 20, statuses: {} },
    { uid: 'slow', next: 0, tie: 1, spd: 10, statuses: {} },
  ], 50);
  const fast = order.filter((r) => r.uid === 'fast').length;
  const slow = order.filter((r) => r.uid === 'slow').length;
  assert.ok(Math.abs(fast / slow - 1.5) < 0.12, `${fast}:${slow}`);
  // ties go to the lower tie key (party before enemies)
  assert.equal(order[0].uid, 'fast');
});

test('peek marks stunned and broken units as skipped turns', () => {
  const order = CTB.peek([
    { uid: 'a', next: 0, tie: 0, spd: 10, statuses: {}, stunned: true },
    { uid: 'b', next: 1, tie: 1, spd: 10, statuses: {}, broken: true },
    { uid: 'c', next: 2, tie: 2, spd: 10, statuses: {}, charging: 'ink_storm' },
  ], 6);
  assert.equal(order[0].skip, 'stun');
  assert.equal(order[1].skip, 'break');
  assert.equal(order[2].charging, 'ink_storm');
  assert.ok(!order[3].skip && !order[3].charging);
});

function actualSequence(b, n, partyAction) {
  const seq = [];
  while (seq.length < n && !b.isOver()) {
    const u = b.current();
    seq.push(u.uid);
    if (u.side === 'party') b.perform(partyAction); else b.runEnemyTurn();
  }
  return seq;
}

test('the displayed timeline predicts the real turn order (normal actions, no deaths)', () => {
  for (let seed = 1; seed <= 25; seed++) {
    const b = battle(['ink_slime', 'ink_slime'], { seed, level: 4 });
    for (const e of b.living('enemy')) { e.hp = e.maxHp = 99999; e.weak = []; e.shields = 99; e.maxShields = 99; }
    const predicted = b.timeline(8).map((r) => r.uid);
    const real = actualSequence(b, 8, { type: 'attack', target: 'e0' });
    assert.deepEqual(real, predicted, `seed ${seed}`);
  }
});

test('previewTimeline shows where the actor lands, and it is where it really lands', () => {
  const actions = [{ type: 'defend' }, { type: 'attack', target: 'e0' }, { type: 'item', item: 'potion', target: 'hero' },
    { type: 'skill', skill: 'rising_slash', target: 'e0' }];
  for (const action of actions) {
    for (let seed = 1; seed <= 12; seed++) {
      const b = battle(['ink_slime', 'ink_slime'], { seed, level: 4, options: { inventory: { potion: 5 } } });
      for (const e of b.living('enemy')) { e.hp = e.maxHp = 99999; e.weak = []; e.shields = 99; e.maxShields = 99; }
      untilTurn(b, 'hero');
      const p = b.previewTimeline('hero', action);
      assert.ok(p.landing >= 0, 'actor appears in the projected order');
      assert.equal(p.order[p.landing].uid, 'hero');
      b.perform(action);
      const real = actualSequence(b, 8, { type: 'attack', target: 'e0' });
      assert.deepEqual(real, p.order.map((r) => r.uid), `${action.type}/${action.skill || ''} seed ${seed}`);
    }
  }
});

test('Defend comes back sooner than Attack; Heavy Chop later', () => {
  const b = battle(['ink_slime'], { rng: midRng, edit: { hero: { weapon: 'axe', equip: { sword: 'short_sword', axe: 'hatchet', body: 'cloth_tunic' } } } });
  untilTurn(b, 'hero');
  const d = b.previewTimeline('hero', { type: 'defend' }).delay;
  const a = b.previewTimeline('hero', { type: 'attack', target: 'e0' }).delay;
  const h = b.previewTimeline('hero', { type: 'skill', skill: 'heavy_chop', target: 'e0' }).delay;
  assert.ok(d < a && a < h, `${d} ${a} ${h}`);
});

test('Pin Shot and Break push the target back on the timeline', () => {
  const b = battle(['moss_scarab'], { rng: midRng, edit: { mira: { weapon: 'bow' } } });
  untilTurn(b, 'mira');
  const s = b.unit('e0');
  s.hp = s.maxHp = 9999;
  const before = s.next;
  const preview = b.previewTimeline('mira', { type: 'skill', skill: 'pin_shot', target: 'e0' });
  const evs = b.perform({ type: 'skill', skill: 'pin_shot', target: 'e0' });
  const push = evs.find((e) => e.type === 'delay' && e.target === 'e0');
  assert.equal(push.amount, Math.round(CTB.baseDelay(s.stats.spd) * 0.4));
  assert.equal(s.next, before + push.amount);
  assert.ok(preview.order.findIndex((r) => r.uid === 'e0') >= 1);
});
