// E8-scene-ui (EPISODE8_PLAN 0.1 and 12, the menu paths): Mira's Read Aloud (target 'ally', the caster included, never rubbed out)
// and the hero's Answer at the Last Silence must cast from the battle MENU, with keys and with touch taps. Episode 5's blocker
// (PLAYTEST_REVIEW_7 item 1) was a Tech the menu refused that every bot passed, because LQ_DEBUG.battleAct and Auto skip the menu.
// Read Aloud is the first signature skill that may target its own caster, and it must open from a rubbed-out Magic row. These tests
// drive the real CommandMenu through BattleScene.updatePlay with key presses and touch taps, then perform the action the menu hands
// back on the real battle and read back the rules' own events (`unwrite_broken` reason 'read', `read`, `silence_broken` reason
// 'answer'). The five cases of plan 12: the pin's target; Mira herself; a rubbed Magic row (every other spell greyed); the cursor opens
// on the pin's target (not the core's lowest-HP default); the hero's Tech list with the Last Silence charging (Answer first, in gold).
// Also: a rubbed Attack row buzzes and says "Rubbed out. Try something else."; nothing floats without a telegraph.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleScene } from '../../src/scenes/battle.js';
import { CommandMenu, SIGNATURE_TECHS } from '../../src/battle/scene/menu.js';
import { SKILLS } from '../../src/data/skills.js';
import { makeRng } from '../../src/battle/rules.js';
import { partyAction } from '../../src/battle/ai.js';
import { battle } from '../battle/_helpers.mjs';

const { makeParty } = await import('../../tools/sim/simulate.mjs');
const { registerData } = await import('../../tools/sim/ep8.mjs');
registerData();
for (const ep of ['ep4', 'ep5', 'ep6', 'ep7']) (await import(`../../src/data/${ep}/scene.js`)).register();
const scene8 = await import('../../src/data/ep8/scene.js');
scene8.register();
const er = await import('../../src/data/ep8/erasure.js');
const T = (await import('../../src/data/ep8/text.js')).EP8_BATTLE_TEXT;

const READ = 'read_aloud';
const FLAGS = { read_learned: true, hero_signed: true, call_learned: true, sky_learned: true, anchor_learned: true, bram_memory_3: true };

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
  // the stage's telegraphs as the planner leaves them: an Unwrite under its owner's uid (er8 'pin'), the Last Silence likewise
  const S = er.erasureState(b);
  const telegraphs = new Map();
  if (S && S.pin) telegraphs.set(S.pin.source, { skill: 'unwrite', target: S.pin.target, er8: 'pin' });
  for (const f of b.living('enemy')) if (f.charging) telegraphs.set(f.uid, { skill: f.charging.skill, er8: f.charging.skill === 'last_silence' ? 'silence' : undefined });
  const xs = { hero: 290, mira: 318, bram: 346 };
  const actors = new Map(b.units().filter((u) => u.side === 'party').map((u) => [u.uid, { uid: u.uid, id: u.id, name: u.name, side: 'party', x: xs[u.id], y: 146, w: 32, h: 40, cx: xs[u.id], cy: 126, top: 106, setPose() {} }]));
  for (const f of b.living('enemy')) actors.set(f.uid, { uid: f.uid, id: f.id, name: f.name, side: 'enemy', x: 98, y: 146, w: 120, h: 120, cx: 98, cy: 86, top: 26, setPose() {} });
  const scene = {
    engine, b, b6view: null, phase: 'play', below: null, auto: false, actors, speed: 1, telegraphs, er8: { rub: {}, unw: {}, pop: {} },
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

/** The Eraser at Lv 33 (the Last Word loadout), the party acting by `act`, until `stop(b)` holds on `who`'s turn. */
function walk(stop, { who = 'mira', seed = 3, act = () => ({ type: 'defend' }), max = 600 } = {}) {
  const b = battle([{ id: 'eraser' }], { party: makeParty('ep8_last_word', 33), rng: makeRng(seed),
    options: { zone: 'ep8_last_word', encounter: 'eraser', boss: true, canFlee: false, flags: FLAGS, inventory: { hi_potion: 4, fresh_ink: 2 } } });
  if (!b.state.erasure) b.begin();
  for (const u of b.living('party')) { u.hp = u.maxHp = 99999; u.mp = u.maxMp = 999; }   // the walk must not lose a member
  for (let i = 0; i < max && !b.isOver(); i++) {
    const u = b.current();
    if (u.id === who && stop(b)) return b;
    if (u.side === 'party') b.perform(act(u, b)); else b.runEnemyTurn();
  }
  throw new Error('the walk never reached its stop');
}
const pinOn = (id) => (b) => { const p = er.pinOf(b); return !!p && b.unit(p.target).id === id && !er.isUnwritten(b, b.current().uid); };
/** Who gets rubbed: `id` attacks every turn (its Attack is its last command), everyone else Defends (the ink slides off). */
const onlyAttacks = (id) => (u, b) => {
  if (u.id !== id) return { type: 'defend' };
  const foe = b.living('enemy')[0];
  return er.isRubbed(b, u.uid, 'attack') ? { type: 'defend' } : { type: 'attack', target: foe.uid };
};
/** Mira casts a Magic spell (never Read Aloud) every turn she can, so her Magic is what the ink takes. */
const miraCasts = (u, b) => {
  if (u.id !== 'mira') return { type: 'defend' };
  const magic = er.commandsOf(b, u).find((c) => c.id === 'magic');
  const e = magic && (magic.list || []).find((x) => x.enabled && x.skill !== READ && ['ally', 'allies', 'self'].includes(SKILLS[x.skill].target));
  return e ? { type: 'skill', skill: e.skill, target: SKILLS[e.skill].target === 'ally' ? u.uid : undefined } : { type: 'defend' };
};
function castOk(b, evs, skill) {
  assert.ok(!evs.some((e) => e.type === 'invalid'), JSON.stringify(evs.find((e) => e.type === 'invalid')));
  assert.ok(evs.some((e) => e.type === 'action_start' && e.action && e.action.skill === skill), `${skill} was cast`);
}

test('Read Aloud is a target "ally" Magic spell the menu knows (the caster included), and both Episode 8 signature rows are in', () => {
  assert.equal(SKILLS[READ].target, 'ally');
  assert.ok(!SKILLS[READ].excludeSelf, 'Read Aloud may target its own caster');
  assert.equal(SKILLS[READ].kind, 'magic');
  const KNOWN = new Set(['enemy', 'enemies', 'random', 'ally', 'allies', 'ko_ally', 'self', 'none']);
  for (const id of [READ, 'answer']) assert.ok(KNOWN.has(SKILLS[id].target), `${id}: target ${SKILLS[id].target} is a kind startTarget knows`);
  assert.deepEqual(SIGNATURE_TECHS.filter((t) => t.skill === READ), [{ unit: 'mira', flag: 'unwrite', skill: READ }]);
  assert.deepEqual(SIGNATURE_TECHS.filter((t) => t.flag === 'last_silence'), [{ unit: 'hero', flag: 'last_silence', skill: 'answer', usable: true }]);
  assert.ok(SKILLS.unwrite.unwrite && SKILLS.last_silence.last_silence);
  assert.ok(!SKILLS.last_silence.answerable && !SKILLS.last_silence.decree, 'Episode 4\'s Answer rows never match the Last Silence');
});

test('case 1, keys: an Unwrite pinned on Bram: the root opens on Magic, Read Aloud first in gold with its icon, the cursor on Bram, one confirm casts; the unwriting breaks', () => {
  const b = walk(pinOn('bram'), { act: onlyAttacks('bram') });
  const pin = er.pinOf(b);
  const r = rig(b);
  r.frame();
  const M = r.scene.menu;
  assert.equal(M.state, 'root', 'the menu opened on Mira\'s turn');
  assert.equal(M.root.item.id, 'magic', 'the root cursor opens on Magic');
  r.frame(['confirm']);
  assert.equal(M.state, 'sub');
  assert.equal(M.sub.items[0].id, READ, `Read Aloud first (${M.sub.items.slice(0, 3).map((x) => x.id)})`);
  assert.equal(M.sub.items[0].color, 'gold', 'in gold');
  assert.equal(typeof M.sub.items[0].draw, 'function', 'with its 12 x 12 icon');
  assert.equal(M.sub.index, 0, 'under the cursor');
  r.frame(['confirm']);
  assert.equal(M.state, 'target', 'Read Aloud asks for its ally');
  assert.equal(M.currentTarget(), pin.target, 'the cursor opens on the pin\'s target');
  r.frame(['confirm']);
  assert.ok(!r.sfx.includes('buzzer'), `no buzzer (${r.sfx.join(',')})`);
  assert.deepEqual(r.performed.map((x) => x.a), [{ type: 'skill', skill: READ, target: pin.target }]);
  assert.equal(r.performed[0].menuState, 'closed', 'the menu is closed when the action plays');
  const mp0 = b.unit(r.performed[0].a.target) && b.living('party').find((u) => u.id === 'mira').mp;
  const evs = b.perform(r.performed[0].a);
  castOk(b, evs, READ);
  const brk = evs.find((e) => e.type === 'unwrite_broken');
  assert.ok(brk && brk.reason === 'read' && brk.target === pin.target, `unwrite_broken read back, reason read (${JSON.stringify(brk)})`);
  assert.equal(b.living('party').find((u) => u.id === 'mira').mp, mp0 - SKILLS[READ].mp, 'Mira paid 12 MP');
  assert.equal(er.pinOf(b), null);
});

test('case 2, keys and touch: an Unwrite pinned on Mira herself: the cursor opens on Mira, and she reads her own name back', () => {
  for (const touch of [false, true]) {
    const b = walk(pinOn('mira'), { act: onlyAttacks('mira'), seed: touch ? 5 : 3 });
    const mira = b.current();
    assert.equal(er.pinOf(b).target, mira.uid, 'the pin is on Mira');
    const r = rig(b, { touch });
    r.frame();
    const M = r.scene.menu;
    if (touch) {
      tapRow(r, M.root, M.root.items.findIndex((x) => x.id === 'magic'));
      assert.equal(M.state, 'sub', 'one tap on Magic opens the list');
      if (M.sub.index !== 0) tapRow(r, M.sub, 0);
      tapRow(r, M.sub, 0);
    } else {
      assert.equal(M.root.item.id, 'magic');
      r.frame(['confirm']);
      assert.equal(M.sub.items[0].id, READ);
      r.frame(['confirm']);
    }
    assert.equal(M.state, 'target', `${touch ? 'touch' : 'keys'}: Read Aloud asks for its ally`);
    assert.ok(M.tInfo.ids.includes(mira.uid), 'Mira is in the cursor\'s list');
    assert.equal(M.currentTarget(), mira.uid, 'the cursor opens on Mira');
    if (touch) { const a = r.scene.actor(mira.uid); tapPoint(r, a.x, a.y - 20); } else r.frame(['confirm']);
    assert.ok(!r.sfx.includes('buzzer'), `no buzzer (${r.sfx.join(',')})`);
    assert.deepEqual(r.performed.map((x) => x.a), [{ type: 'skill', skill: READ, target: mira.uid }]);
    const evs = b.perform(r.performed[0].a);
    castOk(b, evs, READ);
    const brk = evs.find((e) => e.type === 'unwrite_broken');
    assert.ok(brk && brk.reason === 'read' && brk.target === mira.uid, `unwrite_broken on Mira, reason read (${JSON.stringify(brk)})`);
  }
});

test('case 3, keys and touch: a rubbed-out Magic row still opens, Read Aloud lit and every other spell greyed, and it casts', () => {
  for (const touch of [false, true]) {
    const b = walk((x) => er.isRubbed(x, x.current().uid, 'magic') && !er.isUnwritten(x, x.current().uid), { act: miraCasts, seed: touch ? 4 : 2 });
    const mira = b.current();
    const r = rig(b, { touch });
    r.frame();
    const M = r.scene.menu;
    const row = M.root.items.find((x) => x.id === 'magic');
    assert.ok(row && !row.disabled, 'the rubbed Magic row can be chosen');
    assert.ok(row.rub8 && row.rub8.left > 0, `it carries the rub for the smudged drawing (${JSON.stringify(row.rub8)})`);
    assert.equal(row.help, T.rubbed_help, 'its help: Rubbed out. Try something else.');
    if (touch) {
      const i = M.root.items.indexOf(row);
      if (M.root.index !== i) tapRow(r, M.root, i);
      if (M.state === 'root') tapRow(r, M.root, i);
    } else keyTo(r, () => M.root, (it) => it.id === 'magic');
    assert.equal(M.state, 'sub', 'the Magic list opens');
    const lit = M.sub.items.filter((x) => !x.disabled).map((x) => x.id);
    assert.deepEqual(lit, [READ], `only Read Aloud is lit (${lit})`);
    assert.ok(M.sub.items.length > 1 && M.sub.items.filter((x) => x.id !== READ).every((x) => x.disabled), 'every other spell greyed');
    assert.equal(M.sub.items[0].id, READ, 'Read Aloud first (on the phone a list folds at four rows)');
    assert.equal(M.sub.index, 0, 'under the cursor');
    const i = M.sub.items.findIndex((x) => x.id === READ);
    if (touch) { if (M.sub.index !== i) tapRow(r, M.sub, i); tapRow(r, M.sub, i); } else keyTo(r, () => M.sub, (it) => it.id === READ);
    assert.equal(M.state, 'target', 'Read Aloud asks for its ally');
    if (M.currentTarget() !== mira.uid) {
      if (touch) { const a = r.scene.actor(mira.uid); tapPoint(r, a.x, a.y - 20); } else for (let k = 0; k < 4 && M.currentTarget() !== mira.uid; k++) r.frame(['right']);
    }
    assert.equal(M.currentTarget(), mira.uid, 'Mira picked');
    if (touch) { const a = r.scene.actor(mira.uid); tapPoint(r, a.x, a.y - 20); } else r.frame(['confirm']);
    assert.ok(!r.sfx.includes('buzzer'), `no buzzer (${r.sfx.join(',')})`);
    assert.deepEqual(r.performed.map((x) => x.a), [{ type: 'skill', skill: READ, target: mira.uid }]);
    const evs = b.perform(r.performed[0].a);
    castOk(b, evs, READ);
    const rd = evs.find((e) => e.type === 'read');
    assert.ok(rd && rd.target === mira.uid, `read back (${JSON.stringify(rd)})`);
    assert.ok(evs.some((e) => e.type === 'rub_end' && e.command === 'magic' && e.reason === 'read'), 'her Magic comes back');
    assert.ok(!er.isRubbed(b, mira.uid, 'magic'));
  }
});

test('case 4: the cursor opens on the pin\'s target even when the core would open on the lowest HP ally', () => {
  const b = walk(pinOn('bram'), { act: onlyAttacks('bram'), seed: 6 });
  const pin = er.pinOf(b);
  const hero = b.living('party').find((u) => u.id === 'hero');
  hero.hp = Math.round(hero.maxHp * 0.2);
  assert.equal(b.targets(b.current(), { type: 'skill', skill: READ }).default, hero.uid, 'the core default is the hurt hero');
  const r = rig(b);
  r.frame();
  const M = r.scene.menu;
  r.frame(['confirm']);
  r.frame(['confirm']);
  assert.equal(M.state, 'target');
  assert.equal(M.currentTarget(), pin.target, `the cursor opens on the pin's target (${pin.target}), not ${hero.uid}`);
  r.frame(['left']);
  assert.notEqual(M.currentTarget(), pin.target, 'left moves the cursor');
  r.frame(['right']);
  assert.equal(M.currentTarget(), pin.target, 'right brings it back');
});

test('case 5, keys and touch: the Last Silence charging: the hero\'s root opens on Tech, Answer first in gold, cast at the Eraser; the silence breaks', () => {
  const charging = (b) => b.living('enemy').some((f) => f.charging && f.charging.skill === 'last_silence');
  const careful = (u, b) => partyAction(b, 'competent') || { type: 'defend' };
  for (const touch of [false, true]) {
    const b = walk(charging, { who: 'hero', act: careful, seed: touch ? 8 : 7, max: 1500 });
    const eraser = b.living('enemy').find((f) => f.id === 'eraser');
    const r = rig(b, { touch });
    r.frame();
    const M = r.scene.menu;
    assert.equal(M.state, 'root');
    assert.equal(M.root.item.id, 'tech', 'the root cursor opens on Tech');
    if (touch) tapRow(r, M.root, M.root.items.findIndex((x) => x.id === 'tech')); else r.frame(['confirm']);
    assert.equal(M.state, 'sub');
    assert.equal(M.sub.items[0].id, 'answer', `Answer first (${M.sub.items.slice(0, 3).map((x) => x.id)})`);
    assert.equal(M.sub.items[0].color, 'gold', 'in gold');
    if (touch) { if (M.sub.index !== 0) tapRow(r, M.sub, 0); tapRow(r, M.sub, 0); } else r.frame(['confirm']);
    if (M.state === 'target') {
      for (let k = 0; k < 4 && M.currentTarget() !== eraser.uid; k++) r.frame(['left']);
      assert.equal(M.currentTarget(), eraser.uid, 'the Eraser picked');
      if (touch) { const a = r.scene.actor(eraser.uid); tapPoint(r, a.x, a.y - 40); } else r.frame(['confirm']);
    }
    assert.ok(!r.sfx.includes('buzzer'), `no buzzer (${r.sfx.join(',')})`);
    assert.equal(r.performed.length, 1, 'one action');
    assert.equal(r.performed[0].a.skill, 'answer');
    const evs = b.perform(r.performed[0].a);
    castOk(b, evs, 'answer');
    const sb = evs.find((e) => e.type === 'silence_broken');
    assert.ok(sb && sb.reason === 'answer', `silence_broken read back, reason answer (${JSON.stringify(sb)})`);
  }
});

test('a rubbed Attack row: smudged, "Rubbed out. Try something else.", the buzzer on confirm and the menu stays', () => {
  const b = walk((x) => er.isRubbed(x, x.current().uid, 'attack'), { who: 'bram', act: onlyAttacks('bram'), seed: 9 });
  const r = rig(b);
  r.frame();
  const M = r.scene.menu;
  const i = M.root.items.findIndex((x) => x.id === 'attack');
  M.root.moveTo(i);
  M.syncHelp();
  const row = M.root.items[i];
  assert.ok(row.disabled && row.rub8, 'disabled, carrying its rub');
  assert.equal(M.helpText, T.rubbed_help);
  r.frame(['confirm']);
  assert.ok(r.sfx.includes('buzzer'), `the buzzer (${r.sfx.join(',')})`);
  assert.equal(M.state, 'root', 'the menu stays on the root');
  assert.equal(r.performed.length, 0);
});

test('nothing floats without a telegraph: Mira opens where she always does and Read Aloud keeps its place', () => {
  const b = walk((x) => !er.pinOf(x), { seed: 2 });
  const r = rig(b);
  r.scene.telegraphs.clear();
  r.frame();
  const M = r.scene.menu;
  assert.equal(M.sig(b.current()), null, 'no pin: no signature');
  assert.equal(M.root.item.id, 'attack', 'the root opens where it always does');
});
