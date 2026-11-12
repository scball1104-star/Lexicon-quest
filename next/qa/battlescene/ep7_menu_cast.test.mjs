// E7-scene-ui (EPISODE7_PLAN 0.1 and 12, the menu path): the hero's Call (target 'ally', excludeSelf, canTargetKept) must cast from
// the battle MENU at a Farewell's target and at a Stilled ally, with keys and with touch taps. Episode 5's blocker (PLAYTEST_REVIEW_7
// item 1) was a Tech the menu refused that every bot passed, because LQ_DEBUG.battleAct and Auto skip the menu; Call is the first
// signature skill aimed at one ally and at a unit whose turns are skipped. These tests drive the real CommandMenu through
// BattleScene.updatePlay with key presses and touch taps, then perform the action the menu hands back on the real battle and read
// back the rules' own events (`farewell_broken` reason 'call', `stilled_end` reason 'call'). Also: the cursor opens on the pin's
// target (not the core's lowest-HP default), Call floats ahead of Episode 4's Answer row, and the Defend row says "Shake off the cold."
import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleScene } from '../../src/scenes/battle.js';
import { CommandMenu, SIGNATURE_TECHS } from '../../src/battle/scene/menu.js';
import { SKILLS } from '../../src/data/skills.js';
import { makeRng } from '../../src/battle/rules.js';
import { battle } from '../battle/_helpers.mjs';

const { makeParty } = await import('../../tools/sim/simulate.mjs');
const { registerData } = await import('../../tools/sim/ep7.mjs');
registerData();
(await import('../../src/data/ep4/scene.js')).register();
(await import('../../src/data/ep5/scene.js')).register();
(await import('../../src/data/ep6/scene.js')).register();
const scene7 = await import('../../src/data/ep7/scene.js');
scene7.register();
const { EP7_SKILLS } = await import('../../src/data/ep7/skills.js');
const T = (await import('../../src/data/ep7/text.js')).EP7_BATTLE_TEXT;

const FLAGS = { call_learned: true, bram_memory_3: true, hero_signed: true, sky_learned: true, anchor_learned: true };
const CALL = 'call_name';

/** A scene shell round the real menu and the real updatePlay; `frame(keys, pointer)` runs one frame of input. */
function rig(b, { touch = false } = {}) {
  let keys = new Set(), pointer = null;
  const sfx = [];
  const input = new Proxy({
    pressed: (k) => keys.has(k), consume: (k) => keys.delete(k), tapIn: () => false,
    repeatDir: () => ['up', 'down', 'left', 'right'].find((d) => keys.has(d)) || null,
    get pointer() { return pointer; },
  }, { get: (t, k) => (k in t ? t[k] : () => null) });
  const audio = { sfx(id) { sfx.push(id); }, pushMusic() {} };
  const engine = { input, audio, touch: { visible: touch }, settings: {}, setSetting() {} };
  const performed = [];
  const S = b.state.rime || {};
  const telegraphs = new Map(S.pin ? [[`${S.pin.source}${scene7.PIN_KEY}`, { skill: S.pin.skill, farewell: true }]] : []);
  // actors at the party slots, so the touch hit test (menu.unitAt) finds a real box for every member
  const xs = { hero: 290, mira: 318, bram: 346 };
  const actors = new Map(b.units().filter((u) => u.side === 'party').map((u) => [u.uid, { uid: u.uid, id: u.id, name: u.name, side: 'party', x: xs[u.id], y: 146, w: 32, h: 40, cx: xs[u.id], cy: 126, top: 106, setPose() {} }]));
  const scene = {
    engine, b, b6view: null, phase: 'play', below: null, auto: false, actors, speed: 1, telegraphs, rime7: { r: {}, frozen: {}, warm: {}, stilled: {}, pin: null, pop: {} },
    touchButtons() { return null; }, runOps() { return false; }, actor(uid) { return actors.get(uid) || null; },
    performParty(a) { performed.push({ a, menuState: this.menu.state }); },
  };
  scene.menu = new CommandMenu(scene);
  const frame = (k = [], p = null) => { keys = new Set(k); pointer = p; BattleScene.prototype.updatePlay.call(scene); keys = new Set(); pointer = null; };
  return { scene, frame, performed, sfx };
}
function keyTo(r, list, pick, dir = 'down') {
  for (let i = 0; i < 14 && !pick(list().item); i++) r.frame([dir]);
  assert.ok(pick(list().item), `the cursor reached ${list().item && list().item.id}`);
  r.frame(['confirm']);
}
const touchAt = (x, y) => ({ type: 'touch', x, y });
function tapPoint(r, x, y) {
  r.frame([], { ...touchAt(x, y), pressed: true, down: true, released: false });
  r.frame([], { ...touchAt(x, y), pressed: false, down: false, released: true });
}
function tapRow(r, list, idx) { const rr = list.rowRect(idx); tapPoint(r, rr.x + Math.floor(rr.w / 2), rr.y + Math.floor(rr.h / 2)); }

/** The White Phantom at Lv 30 (the Stillheart loadout), the party Defending, until `stop(b)` holds on the hero's turn. */
function walk(stop, { enc = 'white_phantom', seed = 3, act = () => ({ type: 'defend' }) } = {}) {
  const zone = enc === 'white_phantom' ? 'ep7_stillheart' : 'ep7_vault_f2';
  const b = battle([{ id: enc }], { party: makeParty(zone, 30), rng: makeRng(seed),
    options: { zone, encounter: enc, boss: true, canFlee: false, flags: FLAGS, inventory: { hi_potion: 4 } } });
  for (const u of b.living('party')) u.hp = u.maxHp = 99999;   // the walk must not lose a member
  const seen = [];
  for (let i = 0; i < 400 && !b.isOver(); i++) {
    const u = b.current();
    if (u.id === 'hero' && stop(b)) return { b, seen };
    seen.push(...(u.side === 'party' ? b.perform(act(u, b)) : b.runEnemyTurn()));
  }
  throw new Error('the walk never reached its stop');
}
const pinUp = (b) => !!b.state.rime.pin;
const stilledUp = (b) => Object.keys(b.state.rime.stilled).length > 0 && !b.state.rime.pin;
/** Defend, but never Call: the hero Defends too, so a Farewell lands and Stills its target. */
const lands = (u, b) => (u.id === 'hero' && b.state.rime.pin ? { type: 'defend' } : { type: 'defend' });

function castOk(b, evs) {
  assert.ok(!evs.some((e) => e.type === 'invalid'), JSON.stringify(evs.find((e) => e.type === 'invalid')));
  assert.ok(evs.some((e) => e.type === 'action_start' && e.action && e.action.skill === CALL), 'Call was cast');
}

test('Call is a target "ally" Tech the menu knows, and Call is the hero\'s signature on the farewell flag', () => {
  assert.equal(SKILLS[CALL].target, 'ally');
  assert.equal(SKILLS[CALL].excludeSelf, true);
  assert.equal(SKILLS[CALL].canTargetKept, true);
  const KNOWN = new Set(['enemy', 'enemies', 'random', 'ally', 'allies', 'ko_ally', 'self', 'none']);
  for (const s of Object.values(EP7_SKILLS)) if (s.kind !== 'enemy') assert.ok(KNOWN.has(s.target), `${s.id}: target ${s.target} is a kind startTarget knows`);
  assert.deepEqual(SIGNATURE_TECHS.filter((t) => t.skill === CALL), [{ unit: 'hero', flag: 'farewell', skill: CALL }]);
  assert.ok(SKILLS.farewell.farewell && SKILLS.borrowed_light.farewell, 'both pins carry the flag');
});

test('keys, a Farewell pinned: the root opens on Tech, Call first in gold with its icon, the cursor on the pin\'s target, one confirm casts; the farewell breaks', () => {
  const { b } = walk(pinUp);
  const pin = b.state.rime.pin;
  const r = rig(b);
  r.frame();
  const M = r.scene.menu;
  assert.equal(M.state, 'root', 'the menu opened on the hero\'s turn');
  assert.equal(M.root.item.id, 'tech', 'the root cursor opens on Tech');
  r.frame(['confirm']);
  assert.equal(M.state, 'sub');
  assert.equal(M.sub.items[0].id, CALL, `Call first (${M.sub.items.slice(0, 3).map((x) => x.id)})`);
  assert.equal(M.sub.items[0].color, 'gold', 'in gold');
  assert.equal(typeof M.sub.items[0].draw, 'function', 'with its 12 x 12 icon');
  assert.equal(M.sub.index, 0, 'under the cursor');
  r.frame(['confirm']);
  assert.equal(M.state, 'target', 'Call asks for its ally');
  assert.equal(M.currentTarget(), pin.target, 'the cursor opens on the pin\'s target');
  r.frame(['confirm']);
  assert.ok(!r.sfx.includes('buzzer'), `no buzzer (${r.sfx.join(',')})`);
  assert.deepEqual(r.performed.map((x) => x.a), [{ type: 'skill', skill: CALL, target: pin.target }]);
  assert.equal(r.performed[0].menuState, 'closed', 'the menu is closed when the action plays');
  const mp0 = b.unit('hero').mp;
  const evs = b.perform(r.performed[0].a);
  castOk(b, evs);
  const brk = evs.find((e) => e.type === 'farewell_broken');
  assert.ok(brk && brk.reason === 'call' && brk.target === pin.target, `farewell_broken read back, reason call (${JSON.stringify(brk)})`);
  assert.equal(b.unit('hero').mp, mp0 - SKILLS[CALL].mp, 'the hero paid 12 MP');
  assert.equal(b.state.rime.pin, null);
});

test('the cursor opens on the pin\'s target even when the core would open on the lowest HP ally', () => {
  for (const enc of ['white_phantom', 'pale_lantern']) {
    const { b } = walk(pinUp, { enc, seed: 2 });
    const pin = b.state.rime.pin;
    const other = b.living('party').find((u) => u.id !== 'hero' && u.uid !== pin.target);
    other.hp = Math.round(other.maxHp * 0.2);   // the core default (lowestPct) is now the other ally
    assert.equal(b.targets(b.current(), { type: 'skill', skill: CALL }).default, other.uid, 'the core default is the hurt ally');
    const r = rig(b);
    r.frame();
    const M = r.scene.menu;
    r.frame(['confirm']);
    r.frame(['confirm']);
    assert.equal(M.state, 'target');
    assert.equal(M.currentTarget(), pin.target, `${enc}: the cursor opens on the pin's target (${pin.target}), not ${other.uid}`);
    // and the player can still move it to the other ally and back
    r.frame(['right']);
    assert.notEqual(M.currentTarget(), pin.target, 'right moves the cursor');
    r.frame(['left']);
    assert.equal(M.currentTarget(), pin.target, 'left brings it back');
  }
});

test('keys, a Stilled ally (turns skipped, kept off the foes\' targeting): Call reaches them through the cursor and they come back', () => {
  const { b } = walk(stilledUp, { act: lands });
  const still = Object.keys(b.state.rime.stilled)[0];
  assert.ok(b.unit(still).statuses.kept, 'the Stilled ally carries the Kept seal (rules.js skips their turns)');
  assert.ok(b.timeline(8).filter((t) => t.uid === still).every((t) => t.skip === 'kept'), 'every one of their timeline slots is skipped');
  const r = rig(b);
  r.frame();
  const M = r.scene.menu;
  assert.equal(M.state, 'root');
  keyTo(r, () => M.root, (it) => it.id === 'tech');
  assert.equal(M.state, 'sub');
  keyTo(r, () => M.sub, (it) => it.id === CALL);
  assert.equal(M.state, 'target', 'Call asks for its ally');
  assert.ok(M.tInfo.ids.includes(still), 'the Stilled ally is in the cursor\'s list');
  assert.equal(M.currentTarget(), still, 'the cursor opens on the Stilled ally');
  r.frame(['confirm']);
  assert.ok(!r.sfx.includes('buzzer'), `no buzzer (${r.sfx.join(',')})`);
  assert.deepEqual(r.performed.map((x) => x.a), [{ type: 'skill', skill: CALL, target: still }]);
  const evs = b.perform(r.performed[0].a);
  castOk(b, evs);
  const end = evs.find((e) => e.type === 'stilled_end');
  assert.ok(end && end.reason === 'call' && end.target === still, `stilled_end read back, reason call (${JSON.stringify(end)})`);
  assert.ok(!b.unit(still).statuses.kept, 'the seal is off');
});

test('touch: tap Tech, tap Call (already selected), tap the pin\'s target (already selected): it casts; and a tap on a Stilled ally', () => {
  // the pin
  {
    const { b } = walk(pinUp, { seed: 4 });
    const pin = b.state.rime.pin;
    const r = rig(b, { touch: true });
    r.frame();
    const M = r.scene.menu;
    tapRow(r, M.root, M.root.items.findIndex((x) => x.id === 'tech'));
    assert.equal(M.state, 'sub', 'one tap on Tech opens the list');
    assert.equal(M.sub.items[0].id, CALL, 'Call first');
    if (M.sub.index !== 0) { tapRow(r, M.sub, 0); assert.equal(M.state, 'sub', 'the first tap selects'); }
    tapRow(r, M.sub, 0);
    assert.equal(M.state, 'target', 'the tap on the selected row picks Call');
    assert.equal(M.currentTarget(), pin.target, 'the cursor is on the pin\'s target');
    const a = r.scene.actor(pin.target);
    tapPoint(r, a.x, a.y - 20);
    assert.ok(!r.sfx.includes('buzzer'), `no buzzer (${r.sfx.join(',')})`);
    assert.deepEqual(r.performed.map((x) => x.a), [{ type: 'skill', skill: CALL, target: pin.target }], 'a tap on the selected ally casts');
    const evs = b.perform(r.performed[0].a);
    castOk(b, evs);
    assert.equal((evs.find((e) => e.type === 'farewell_broken') || {}).reason, 'call', 'the farewell breaks');
  }
  // a Stilled ally: the cursor opens on them; tap the other ally (selects), then the Stilled one twice
  {
    const { b } = walk(stilledUp, { act: lands, seed: 5 });
    const still = Object.keys(b.state.rime.stilled)[0];
    const other = b.living('party').find((u) => u.id !== 'hero' && u.uid !== still);
    const r = rig(b, { touch: true });
    r.frame();
    const M = r.scene.menu;
    tapRow(r, M.root, M.root.items.findIndex((x) => x.id === 'tech'));
    const i = M.sub.items.findIndex((x) => x.id === CALL);
    assert.ok(i >= 0 && M.sub.isVisible(i), 'Call is listed and on screen');
    if (M.sub.index !== i) tapRow(r, M.sub, i);
    tapRow(r, M.sub, i);
    assert.equal(M.state, 'target');
    assert.equal(M.currentTarget(), still, 'the cursor opens on the Stilled ally');
    const o = r.scene.actor(other.uid), s = r.scene.actor(still);
    tapPoint(r, o.x, o.y - 20);
    assert.equal(M.currentTarget(), other.uid, 'a tap on the other ally only selects it');
    assert.equal(r.performed.length, 0);
    tapPoint(r, s.x, s.y - 20);
    assert.equal(M.currentTarget(), still, 'a tap on the Stilled ally selects them');
    assert.equal(r.performed.length, 0);
    tapPoint(r, s.x, s.y - 20);
    assert.deepEqual(r.performed.map((x) => x.a), [{ type: 'skill', skill: CALL, target: still }], 'the second tap casts');
    const evs = b.perform(r.performed[0].a);
    castOk(b, evs);
    assert.equal((evs.find((e) => e.type === 'stilled_end') || {}).reason, 'call', 'they come back');
  }
});

test('the right signature floats: with a decree and a farewell both up the hero opens on Call; with neither, Tech keeps its order', () => {
  const { b } = walk(pinUp);
  const hero = b.unit('hero');
  if (!hero.skills.includes('answer')) hero.skills.push('answer');
  const r = rig(b);
  r.scene.telegraphs.set('e9', { skill: Object.keys(SKILLS).find((k) => SKILLS[k].decree) || 'answer' });
  r.frame();
  r.frame(['confirm']);
  assert.equal(r.scene.menu.sub.items[0].id, CALL, `Call first (${r.scene.menu.sub.items.slice(0, 3).map((x) => x.id)})`);
  const r2 = rig(b);
  r2.scene.telegraphs.clear();
  r2.frame();
  assert.equal(r2.scene.menu.sig(hero), null, 'no pin and nobody Stilled: no signature');
  assert.equal(r2.scene.menu.root.item.id, 'attack', 'and the root opens where it always does');
});

test('in a Rime battle the Defend row says "Shake off the cold." (through menu.js, keys); without Rime it keeps its help', () => {
  for (const rime of [true, false]) {
    const b = rime ? walk(() => true).b : battle([{ id: 'ink_slime' }], { seed: 2, level: 6 });
    for (let i = 0; i < 20 && b.current().side !== 'party'; i++) b.runEnemyTurn();
    const r = rig(b);
    if (!rime) r.scene.rime7 = null;
    r.frame();
    const M = r.scene.menu;
    assert.equal(M.state, 'root');
    r.frame(['cancel']);   // cancel on the root jumps to Defend
    assert.equal(M.root.item.id, 'defend', 'the cursor is on Defend');
    assert.equal(M.helpText, rime ? T.defend_help : 'Halve damage this turn.');
  }
});
