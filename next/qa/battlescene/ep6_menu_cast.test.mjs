// E6-scene-ui (EPISODE6_PLAN 0.1 and 12, the menu path): Bram's Anchor (target 'none') must cast from the battle MENU, with keys
// and with touch taps. Episode 5's blocker (PLAYTEST_REVIEW_7 item 1) was a 'none' Tech the menu refused; every bot passed
// because LQ_DEBUG.battleAct and Auto skip the menu. These tests drive the real CommandMenu through BattleScene.updatePlay with key
// presses and touch taps, then perform the action the menu hands back on the real battle, and play on to the Gust to read the
// Rewrite break (`rewrite_broken`, reason 'anchor'). Also: the gated rows (Anchor with no wind, Turn the Sky with no sky) greyed
// with their reasons, and Anchor floating ahead of the Episode 3 Oath while a move is pinned.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleScene } from '../../src/scenes/battle.js';
import { CommandMenu, SIGNATURE_TECHS } from '../../src/battle/scene/menu.js';
import { SKILLS } from '../../src/data/skills.js';
import { battle } from '../battle/_helpers.mjs';

const { registerData } = await import('../../tools/sim/ep6.mjs');
registerData();
(await import('../../src/data/ep4/scene.js')).register();
(await import('../../src/data/ep5/scene.js')).register();
const scene6 = await import('../../src/data/ep6/scene.js');
scene6.register();
const { EP6_SKILLS } = await import('../../src/data/ep6/skills.js');
const { setFieldHour } = await import('../../src/data/ep5/sky.js');

/** A scene shell round the real menu and the real updatePlay; `frame(keys, pointer)` runs one frame of input. */
function rig(b, { touch = false, telegraphs = null, view = null } = {}) {
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
  const scene = {
    engine, b, b6view: view, phase: 'play', below: null, auto: false, actors: new Map(), speed: 1, telegraphs: telegraphs || new Map(),
    touchButtons() { return null; }, runOps() { return false; }, actor() { return null; },
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
function tap(r, list, idx) {
  const rr = list.rowRect(idx), p = { type: 'touch', x: rr.x + Math.floor(rr.w / 2), y: rr.y + Math.floor(rr.h / 2) };
  r.frame([], { ...p, pressed: true, down: true, released: false });
  r.frame([], { ...p, pressed: false, down: false, released: true });
}
const FLAGS = { anchor_learned: true };
/** The Storm Scribe at Lv 27, played (party Defends) until a Rewrite is pinned and it is Bram's turn. */
function pinnedOnBram(seed = 3) {
  const b = battle([{ id: 'scribe' }], { level: 27, seed, options: { encounter: 'scribe', boss: true, canFlee: false, flags: FLAGS, inventory: { hi_potion: 4 } } });
  for (let i = 0; i < 400 && !b.isOver(); i++) {
    const u = b.current();
    if (b.state.gale.pinned && u.id === 'bram') break;
    if (u.side === 'party') b.perform({ type: 'defend' }); else b.runEnemyTurn();
  }
  assert.ok(b.state.gale.pinned && b.current().id === 'bram', 'a Rewrite is pinned and it is Bram\'s turn');
  return b;
}
/** The scene's telegraph map as the planner leaves it while the Rewrite is pinned (its own key, never the Scribe's). */
const pinMap = (b) => new Map([[`${b.state.gale.pinned.source}${scene6.REWRITE}`, { skill: b.state.gale.pinned.skill, rewrite: true }]]);
/** Play the battle on (party Defends) until the Gust falls; the events seen. */
function toGust(b, gusts = b.state.gale.gusts) {
  const seen = [];
  for (let i = 0; i < 40 && !b.isOver() && b.state.gale.gusts === gusts; i++) {
    const u = b.current();
    seen.push(...(u.side === 'party' ? b.perform({ type: 'defend' }) : b.runEnemyTurn()));
  }
  return seen;
}
const anchorOk = (b, mp0, evs) => {
  assert.ok(!evs.some((e) => e.type === 'invalid'), JSON.stringify(evs.find((e) => e.type === 'invalid')));
  assert.ok(evs.some((e) => e.type === 'anchored' && e.on), 'the party is Anchored');
  assert.equal(b.unit('bram').mp, mp0 - SKILLS.anchor_line.mp, 'Bram paid the MP');
};

test('Anchor is a target "none" Tech, and Episode 6 adds no target kind startTarget would refuse', () => {
  assert.equal(SKILLS.anchor_line.target, 'none');
  const KNOWN = new Set(['enemy', 'enemies', 'random', 'ally', 'allies', 'ko_ally', 'self', 'none']);
  for (const s of Object.values(EP6_SKILLS)) if (s.kind !== 'enemy') assert.ok(KNOWN.has(s.target), `${s.id}: target ${s.target} is a kind the menu knows`);
  assert.deepEqual(SIGNATURE_TECHS.filter((t) => t.skill === 'anchor_line'), [{ unit: 'bram', flag: 'rewrite', skill: 'anchor_line' }]);
});

test('keys, a Rewrite pinned: the root opens on Tech, Anchor first in gold with its icon, one confirm casts it; the Gust breaks the Rewrite', () => {
  const b = pinnedOnBram();
  const r = rig(b, { telegraphs: pinMap(b) });
  r.frame();
  const M = r.scene.menu;
  assert.equal(M.state, 'root', 'the menu opened on Bram\'s turn');
  assert.equal(M.root.item.id, 'tech', 'the root cursor opens on Tech');
  r.frame(['confirm']);
  assert.equal(M.state, 'sub');
  assert.equal(M.sub.items[0].id, 'anchor_line', 'Anchor first');
  assert.equal(M.sub.items[0].color, 'gold', 'in gold');
  assert.equal(typeof M.sub.items[0].draw, 'function', 'with its anchor icon (CRITIQUE_7 item 10)');
  assert.equal(M.sub.index, 0, 'under the cursor');
  r.frame(['confirm']);
  assert.ok(!r.sfx.includes('buzzer'), `no buzzer (${r.sfx.join(',')})`);
  assert.deepEqual(r.performed.map((x) => x.a), [{ type: 'skill', skill: 'anchor_line' }], 'one confirm on the row casts it, no target picker');
  assert.equal(r.performed[0].menuState, 'closed', 'the menu is closed when the action plays');
  const mp0 = b.unit('bram').mp, g0 = b.state.gale.gusts;
  const cast = b.perform(r.performed[0].a);
  anchorOk(b, mp0, cast);
  const evs = [...cast, ...toGust(b, g0)];
  const brk = evs.find((e) => e.type === 'rewrite_broken');
  assert.ok(brk && brk.reason === 'anchor', `the Gust breaks the Rewrite on the anchor (${JSON.stringify(brk)})`);
  assert.equal(b.state.gale.pinned, null);
});

test('touch, a Rewrite pinned: tap Tech, tap Anchor (it is already selected) once more: it casts', () => {
  const b = pinnedOnBram(5);
  const r = rig(b, { touch: true, telegraphs: pinMap(b) });
  r.frame();
  const M = r.scene.menu;
  tap(r, M.root, M.root.items.findIndex((x) => x.id === 'tech'));
  assert.equal(M.state, 'sub', 'one tap on Tech opens the list');
  const i = M.sub.items.findIndex((x) => x.id === 'anchor_line');
  assert.equal(i, 0, 'Anchor first');
  if (M.sub.index !== i) { tap(r, M.sub, i); assert.equal(r.performed.length, 0, 'the first tap selects'); }
  tap(r, M.sub, i);
  assert.ok(!r.sfx.includes('buzzer'), `no buzzer (${r.sfx.join(',')})`);
  assert.deepEqual(r.performed.map((x) => x.a), [{ type: 'skill', skill: 'anchor_line' }]);
  const mp0 = b.unit('bram').mp, g0 = b.state.gale.gusts;
  const cast = b.perform(r.performed[0].a);
  anchorOk(b, mp0, cast);
  assert.equal(([...cast, ...toGust(b, g0)].find((e) => e.type === 'rewrite_broken') || {}).reason, 'anchor', 'the Rewrite breaks');
});

test('keys and touch, nothing pinned: Anchor is walked to and confirmed straight off the list', () => {
  for (const touch of [false, true]) {
    const b = battle([{ id: 'squall_wolf' }, { id: 'gale_sprite' }], { level: 25, seed: 2, options: { flags: FLAGS } });
    while (b.current().id !== 'bram') b.current().side === 'party' ? b.perform({ type: 'defend' }) : b.runEnemyTurn();
    const r = rig(b, { touch });
    r.frame();
    const M = r.scene.menu;
    if (touch) {
      tap(r, M.root, M.root.items.findIndex((x) => x.id === 'tech'));
      const i = M.sub.items.findIndex((x) => x.id === 'anchor_line');
      assert.ok(i >= 0, 'Anchor is listed');
      // below the fold of the phone's list: the on-screen d-pad walks to it (a real input), then the tap on the selected row
      for (let n = 0; n < 14 && !M.sub.isVisible(i); n++) r.frame(['down']);
      assert.ok(M.sub.isVisible(i), 'Anchor is on screen');
      if (M.sub.index !== i) tap(r, M.sub, i);
      assert.equal(r.performed.length, 0, 'the first tap only selects');
      tap(r, M.sub, i);
    } else {
      keyTo(r, () => M.root, (it) => it.id === 'tech');
      keyTo(r, () => M.sub, (it) => it.id === 'anchor_line');
    }
    assert.deepEqual(r.performed.map((x) => x.a), [{ type: 'skill', skill: 'anchor_line' }], `${touch ? 'touch' : 'keys'}: cast`);
    assert.ok(!r.sfx.includes('buzzer'));
    const mp0 = b.unit('bram').mp;
    anchorOk(b, mp0, b.perform(r.performed[0].a));
  }
});

test('gated: with no wind Anchor is listed greyed "No wind to hold."; with no sky Turn the Sky "No sky to turn."; confirm buzzes', () => {
  setFieldHour(null);
  const b = battle([{ id: 'ink_slime' }, { id: 'bookmite' }], { level: 27, seed: 4, options: { flags: { ...FLAGS, sky_learned: true } } });
  assert.ok(b.state.gated && b.state.gated.length >= 2, `both are gated (${JSON.stringify(b.state.gated)})`);
  for (const [who, skill, reason] of [['bram', 'anchor_line', 'No wind to hold.'], ['mira', 'turn_sky', 'No sky to turn.']]) {
    while (b.current().id !== who) b.current().side === 'party' ? b.perform({ type: 'defend' }) : b.runEnemyTurn();
    const r = rig(b, { view: scene6.gatedView(b) });
    r.frame();
    const M = r.scene.menu;
    keyTo(r, () => M.root, (it) => it.id === 'tech');
    const it = M.sub.items.find((x) => x.id === skill);
    assert.ok(it && it.disabled, `${skill} is listed, greyed`);
    assert.equal(it.help, reason);
    keyTo(r, () => M.sub, (x) => x.id === skill);
    assert.equal(r.performed.length, 0, `${skill} cannot be cast`);
    assert.ok(r.sfx.includes('buzzer'), 'confirm buzzes');
    assert.equal(r.scene.menu.state, 'sub', 'and the list stays open');
    // the rules never see the row: the battle's own list has no such skill
    const tech = b.commands(b.current()).find((c) => c.id === 'tech');
    assert.ok(!(tech && tech.list || []).some((e) => e.skill === skill), 'battle.commands itself is untouched (Auto never sees the row)');
    b.perform({ type: 'defend' });
  }
});

test('the right signature floats: a Rewrite and an Episode 3 Oath charge both up, Bram opens on Anchor, not the Oath', () => {
  const b = pinnedOnBram();
  const bram = b.unit('bram');
  if (!bram.skills.includes('tempered_oath')) bram.skills.push('tempered_oath');
  const t = new Map([['e9', { skill: 'last_hammer' }], ...pinMap(b)]);
  const r = rig(b, { telegraphs: t });
  r.frame();
  r.frame(['confirm']);
  assert.equal(r.scene.menu.sub.items[0].id, 'anchor_line', `Anchor first (${r.scene.menu.sub.items.slice(0, 3).map((x) => x.id)})`);
  const r2 = rig(b, { telegraphs: new Map([['e9', { skill: 'last_hammer' }]]) });
  r2.frame();
  r2.frame(['confirm']);
  assert.equal(r2.scene.menu.sub.items[0].id, 'tempered_oath', 'with no Rewrite the Oath keeps its place');
});
