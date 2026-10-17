// The animator maps every rules event to presentation ops, never stalls on unknown events, and keeps the
// frame budget of a turn bounded. Runs real battles through the rules so the streams are authentic.
import test from 'node:test';
import assert from 'node:assert/strict';
import { planEvents, unitInfo, totalFrames, FRAMES, EVENT_TYPES } from '../../src/battle/scene/animator.js';
import { createEncounterBattle, createBattle, makeRng } from '../../src/battle/rules.js';
import { partyAction } from '../../src/battle/ai.js';
import { newMember } from '../../src/data/party.js';
import { ENCOUNTERS } from '../../src/data/encounters.js';

const party = (level = 8) => ['hero', 'mira', 'bram'].map((id) => {
  const m = newMember(id, { level });
  m.mastery = id === 'mira' ? { staff: 140, bow: 45 } : { sword: 210, axe: 60, spear: 210 };
  if (id === 'hero') m.equip.axe = 'hatchet';
  return m;
});

function info(b) { return { units: unitInfo(b.units()) }; }

/** Play a whole battle with the competent policy, planning every event batch. Returns { evs, ops, types }. */
function playPlanned(encId, seed, opts = {}) {
  const { battle: b } = createEncounterBattle(encId, { party: party(opts.level || 8), rng: makeRng(seed),
    inventory: { potion: 3, ether: 2, phoenix_feather: 1 }, forceElite: opts.forceElite });
  const evs = [...b.startEvents];
  const ops = [...planEvents(b.startEvents, info(b))];
  let guard = 0;
  while (!b.isOver() && guard++ < 800) {
    const u = b.current();
    let e = u.side === 'party' ? b.perform(partyAction(b)) : b.runEnemyTurn();
    if (e.length === 1 && e[0].type === 'invalid') e = b.perform({ type: 'defend' });
    evs.push(...e);
    const batch = planEvents(e, info(b));
    assert.ok(batch.length >= 1 && batch[batch.length - 1].op === 'end', `${encId}: every batch ends with an end op`);
    assert.ok(totalFrames(batch) <= 2400, `${encId}: one turn stays under 40 s at 1x (got ${totalFrames(batch)} frames)`);
    ops.push(...batch);
  }
  assert.ok(b.isOver(), `${encId} seed ${seed} finished`);
  return { evs, ops, types: new Set(evs.map((e) => e.type)), result: b.result() };
}

test('every documented event type produces at least one op when it appears alone', () => {
  const units = unitInfo([
    { uid: 'hero', id: 'hero', side: 'party', name: 'Hero', weapon: 'sword', maxHp: 50 },
    { uid: 'mira', id: 'mira', side: 'party', name: 'Mira', weapon: 'staff', maxHp: 40 },
    { uid: 'e0', id: 'briar_wolf', side: 'enemy', name: 'Briar Wolf', maxHp: 120 },
    { uid: 'e1', id: 'archivore', side: 'enemy', name: 'The Archivore', boss: true, maxHp: 820 },
  ]);
  const sample = {
    battle_start: { units: Object.values(units).map((u) => ({ ...u, hp: u.maxHp })), start: 'normal', boss: false },
    turn_start: { actor: 'hero', time: 0, round: 1 },
    timeline: { order: [{ uid: 'hero', at: 0 }] },
    telegraph: { actor: 'e1', skill: 'ink_storm', name: 'Ink Storm', text: 'The Archivore inhales a storm of ink...', target: null, targets: ['hero'], nextTurn: 2 },
    telegraph_cancel: { actor: 'e1', skill: 'ink_storm', reason: 'break' },
    action_start: { actor: 'hero', action: { type: 'attack', skill: 'attack', name: 'Attack' }, targets: ['e0'], fx: 'weapon', weapon: 'sword' },
    move_to: { actor: 'hero', target: 'e0' },
    damage: { source: 'hero', target: 'e0', amount: 20, hp: 100, maxHp: 120, kind: 'phys', crit: false, weak: true, types: ['sword'], shieldLost: 1, shields: 1 },
    shield: { target: 'e0', lost: 1, shields: 0 },
    break: { target: 'e0' },
    shield_restore: { target: 'e0', shields: 2 },
    reveal: { target: 'e0', enemy: 'briar_wolf', weak: ['fire'], resist: [] },
    heal: { target: 'hero', amount: 12, hp: 50, maxHp: 50 },
    mp: { target: 'hero', amount: -3, mp: 5, maxMp: 10, cost: true },
    miss: { source: 'hero', target: 'e0', reason: 'miss' },
    status_add: { target: 'e0', status: 'burn', turns: 3 },
    status_remove: { target: 'e0', status: 'burn', reason: 'cured' },
    status_tick: { target: 'e0', status: 'burn', amount: -12, hp: 88, maxHp: 120 },
    status_resist: { target: 'e1', status: 'stun', immune: true },
    stat_mod: { target: 'e0', stat: 'def', mult: 0.7, turns: 3 },
    fury_gain: { target: 'hero', amount: 8, fury: 8, reason: 'strike' },
    fury_ready: { target: 'hero' },
    defend: { actor: 'hero' },
    defend_end: { actor: 'hero' },
    guard: { actor: 'hero', target: 'mira' },
    cover: { actor: 'hero', target: 'mira' },
    swap: { actor: 'hero', weapon: 'axe' },
    delay: { target: 'e0', amount: 40, reason: 'pin_shot' },
    reflect: { actor: 'e1', source: 'mira', kind: 'magic', target: 'hero' },
    stance: { actor: 'e1', stance: 'mirror', name: 'Mirror Stance', text: 'The Warden turns its mirror outward.' },
    phase: { actor: 'e1', phase: 2, id: 'torn_book', name: 'The Torn Book', text: 'Pages spill into the air.' },
    summon: { enemy: 'e2', id: 'lost_page', name: 'Kindling Page', variant: 'kindling', tint: '#ff8a2a', hp: 70, by: 'e1' },
    split: { source: 'e0', into: ['e3', 'e4'] },
    devour: { actor: 'e1', target: 'mira', success: true },
    feast: { actor: 'e1', pages: ['e2'], healed: 50 },
    ko: { target: 'e0', reason: 'damage' },
    revive: { target: 'mira', hp: 12 },
    skip: { actor: 'e0', reason: 'break' },
    message: { text: 'Could not get away!' },
    escape: { success: true },
    victory: { exp: 10, gold: 5, mastery: {}, items: [], consumables: [] },
    defeat: {},
  };
  for (const type of EVENT_TYPES) {
    assert.ok(sample[type], `sample for ${type}`);
    const ops = planEvents([{ type, ...sample[type] }], { units });
    assert.ok(ops.length >= 2, `${type} produced ops (got ${ops.length})`);
    assert.equal(ops[ops.length - 1].op, 'end');
    for (const o of ops) assert.ok(typeof o.op === 'string', `${type}: op has a kind`);
    for (const o of ops) if (o.frames != null) assert.ok(Number.isFinite(o.frames) && o.frames >= 0, `${type}: finite frames`);
  }
});

test('unknown event types, nulls and junk never stall or throw', () => {
  const ops = planEvents([null, undefined, 42, { type: 'wat' }, { type: 'damage' }, { type: 'ko' }, { nope: 1 }, { type: 'action_start' }], { units: {} });
  assert.equal(ops[ops.length - 1].op, 'end');
  assert.ok(totalFrames(ops) < 200);
  assert.ok(ops.every((o) => o && typeof o.op === 'string'));
});

test('a party melee attack plans step-in, wind-up, strike, hit, and the return home', () => {
  const units = unitInfo([{ uid: 'hero', id: 'hero', side: 'party', name: 'Hero', weapon: 'sword', maxHp: 50 }, { uid: 'e0', id: 'ink_slime', side: 'enemy', name: 'Ink Slime', maxHp: 74 }]);
  const ops = planEvents([
    { type: 'action_start', actor: 'hero', action: { type: 'attack', skill: 'attack', name: 'Attack' }, targets: ['e0'], fx: 'weapon', weapon: 'sword' },
    { type: 'move_to', actor: 'hero', target: 'e0' },
    { type: 'damage', source: 'hero', target: 'e0', amount: 18, hp: 56, maxHp: 74, kind: 'phys', types: ['sword'] },
  ], { units });
  const kinds = ops.map((o) => o.op);
  const i = (k, from = 0) => kinds.indexOf(k, from);
  assert.ok(i('move') >= 0 && i('pose') >= 0 && i('fx') >= 0 && i('hitstop') >= 0 && i('number') >= 0 && i('hp') >= 0);
  const moveIn = ops.findIndex((o) => o.op === 'move' && o.to === 'target');
  const strike = ops.findIndex((o) => o.op === 'pose' && o.pose === 'strike');
  const hit = ops.findIndex((o) => o.op === 'hitstop');
  const home = ops.findIndex((o) => o.op === 'move' && o.to === 'home');
  assert.ok(moveIn < strike && strike < hit && hit < home, 'order: step in, strike, hit, home');
  assert.ok(ops.some((o) => o.op === 'sfx' && o.id === 'sword_slash'), 'sword swing sound');
  assert.ok(ops.some((o) => o.op === 'sfx' && /^hit_/.test(o.id)), 'impact sound');
  assert.ok(totalFrames(ops) >= 30 && totalFrames(ops) <= 120, `a plain attack takes 0.5 to 2 s (got ${totalFrames(ops)})`);
});

test('a break plans the burst, word art, sound, slow motion and a hold', () => {
  const units = unitInfo([{ uid: 'e0', id: 'bookmite', side: 'enemy', name: 'Bookmite', maxHp: 95 }]);
  const ops = planEvents([{ type: 'break', target: 'e0' }], { units });
  assert.ok(ops.some((o) => o.op === 'fx' && o.kind === 'break_burst'));
  assert.ok(ops.some((o) => o.op === 'word' && o.word === 'BREAK'));
  assert.ok(ops.some((o) => o.op === 'sfx' && o.id === 'break'));
  assert.ok(ops.some((o) => o.op === 'slow'));
  assert.ok(totalFrames(ops) >= FRAMES.breakHold);
});

test('enemy death dissolves; boss death shakes, whites out and dissolves longer', () => {
  const units = unitInfo([{ uid: 'e0', id: 'ink_slime', side: 'enemy', name: 'Ink Slime', maxHp: 74 }, { uid: 'e1', id: 'archivore', side: 'enemy', name: 'The Archivore', boss: true, maxHp: 820 }]);
  const a = planEvents([{ type: 'ko', target: 'e0', reason: 'damage' }], { units });
  const b = planEvents([{ type: 'ko', target: 'e1', reason: 'damage' }], { units });
  assert.ok(a.some((o) => o.op === 'dissolve' && o.frames === FRAMES.dissolve));
  assert.ok(b.some((o) => o.op === 'dissolve' && o.frames === FRAMES.bossDissolve));
  assert.ok(b.some((o) => o.op === 'sfx' && o.id === 'boss_die') && b.some((o) => o.op === 'shake'));
  assert.ok(totalFrames(b) > totalFrames(a));
});

test('party KO kneels then falls and never dissolves', () => {
  const units = unitInfo([{ uid: 'bram', id: 'bram', side: 'party', name: 'Bram', weapon: 'spear', maxHp: 60 }]);
  const ops = planEvents([{ type: 'ko', target: 'bram', reason: 'damage' }], { units });
  assert.ok(ops.some((o) => o.op === 'fall'));
  assert.ok(!ops.some((o) => o.op === 'dissolve'));
});

test('real battles: every encounter plans without throwing, covers the core event types, bounded per turn', () => {
  const seen = new Set();
  const opKinds = new Set();
  for (const id of Object.keys(ENCOUNTERS)) {
    const r = playPlanned(id, 3);
    for (const t of r.types) seen.add(t);
    for (const o of r.ops) opKinds.add(o.op);
  }
  const elite = playPlanned('valley_pack', 5, { forceElite: true });
  for (const t of elite.types) seen.add(t);
  for (const must of ['battle_start', 'turn_start', 'timeline', 'action_start', 'move_to', 'damage', 'break', 'shield_restore', 'reveal', 'heal', 'mp', 'status_add', 'fury_gain', 'telegraph', 'ko', 'victory', 'skip', 'phase', 'summon', 'stance']) {
    assert.ok(seen.has(must), `event type ${must} occurred in the sweep`);
  }
  for (const k of ['move', 'pose', 'fx', 'sfx', 'number', 'hp', 'dissolve', 'telegraph', 'banner', 'summon', 'victory', 'timeline']) assert.ok(opKinds.has(k), `op ${k} planned`);
});

test('the frame table is a frozen table of positive integers', () => {
  assert.ok(Object.isFrozen(FRAMES));
  for (const [k, v] of Object.entries(FRAMES)) assert.ok(Number.isInteger(v) && v > 0, k);
});

test('createBattle events with a scripted defeat still end in a defeat op', () => {
  const b = createBattle({ party: [newMember('hero', { level: 1 })], enemies: ['archivore'], rng: makeRng(1), options: { boss: true } });
  const evs = [...b.startEvents];
  let guard = 0;
  while (!b.isOver() && guard++ < 200) {
    const u = b.current();
    evs.push(...(u.side === 'party' ? b.perform({ type: 'attack', target: 'e0' }) : b.runEnemyTurn()));
  }
  assert.equal(b.result().outcome, 'defeat');
  const ops = planEvents(evs, info(b));
  assert.ok(ops.some((o) => o.op === 'defeat'));
  assert.ok(ops.some((o) => o.op === 'fall' && o.uid === 'hero'));
});
