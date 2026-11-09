// E5-fixes A1 (PLAYTEST_REVIEW_7 item 1, the blocker): a party skill with no target (Turn the Sky, target 'none') must cast
// from the battle MENU. Before the fix the sub-list's confirm asked startTarget(), which refuses a 'none' target, and the menu
// buzzed; every bot and the older tests act through battleAct or Auto, which skip the menu, so none of them saw it. These
// tests drive the real CommandMenu through BattleScene.updatePlay with key presses and with touch taps, then perform the
// action the menu hands back on the real battle. Also E5-fixes A2: a reading always leaves Mira a turn to answer it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleScene } from '../../src/scenes/battle.js';
import { CommandMenu } from '../../src/battle/scene/menu.js';
import { SKILLS } from '../../src/data/skills.js';
import { battle } from '../battle/_helpers.mjs';

const { registerData } = await import('../../tools/sim/ep5.mjs');
registerData();
(await import('../../src/data/ep4/scene.js')).register();
const scene5 = await import('../../src/data/ep5/scene.js');
scene5.register();
const { setFieldHour } = await import('../../src/data/ep5/sky.js');

/** A scene shell round the real menu and the real updatePlay; `frame(keys, pointer)` runs one frame of input. */
function rig(b, { touch = false, telegraphs = null } = {}) {
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
    engine, b, phase: 'play', below: null, auto: false, actors: new Map(), speed: 1, telegraphs: telegraphs || new Map(),
    touchButtons() { return null; }, runOps() { return false; }, actor() { return null; },
    performParty(a) { performed.push({ a, menuState: this.menu.state }); },
  };
  scene.menu = new CommandMenu(scene);
  const frame = (k = [], p = null) => { keys = new Set(k); pointer = p; BattleScene.prototype.updatePlay.call(scene); keys = new Set(); pointer = null; };
  return { scene, frame, performed, sfx };
}
/** Real key presses: step the active list with `dir` until `pick(item)` is true (bounded), then confirm. */
function keyTo(r, list, pick, dir = 'down') {
  for (let i = 0; i < 12 && !pick(list().item); i++) r.frame([dir]);
  assert.ok(pick(list().item), `the cursor reached ${list().item && list().item.id}`);
  r.frame(['confirm']);
}
/** One touch tap (press, then release) at the centre of a list row. */
function tap(r, list, idx) {
  const rr = list.rowRect(idx), p = { type: 'touch', x: rr.x + Math.floor(rr.w / 2), y: rr.y + Math.floor(rr.h / 2) };
  r.frame([], { ...p, pressed: true, down: true, released: false });
  r.frame([], { ...p, pressed: false, down: false, released: true });
}
function mixedFight() {
  setFieldHour('noon');
  const b = battle([{ id: 'dune_stalker' }, { id: 'starsilt' }], { level: 23, seed: 2, options: { flags: { sky_learned: true }, inventory: { potion: 2 } } });
  while (b.current().uid !== 'mira') b.current().side === 'party' ? b.perform({ type: 'defend' }) : b.runEnemyTurn();
  return b;
}
const castOk = (b, mp0, sky0, evs) => {
  assert.ok(!evs.some((e) => e.type === 'invalid'), JSON.stringify(evs.find((e) => e.type === 'invalid')));
  assert.notEqual(b.state.sky.sky, sky0, 'the sky turned');
  assert.equal(b.unit('mira').mp, mp0 - SKILLS.turn_sky.mp, 'Mira paid the MP');
};

test('A1 keys: Tech, then Turn the Sky, then confirm casts it (no buzzer, no target picker)', () => {
  const b = mixedFight();
  const r = rig(b);
  r.frame();
  assert.equal(r.scene.menu.state, 'root', 'the menu opened on Mira\'s turn');
  keyTo(r, () => r.scene.menu.root, (it) => it.id === 'tech');
  assert.equal(r.scene.menu.state, 'sub');
  keyTo(r, () => r.scene.menu.sub, (it) => it.id === 'turn_sky');
  assert.ok(!r.sfx.includes('buzzer'), `no buzzer (${r.sfx.join(',')})`);
  assert.equal(r.performed.length, 1, 'one confirm on the row casts it');
  assert.deepEqual(r.performed[0].a, { type: 'skill', skill: 'turn_sky' });
  assert.equal(r.performed[0].menuState, 'closed', 'the menu is closed when the action plays');
  const mp0 = b.unit('mira').mp, sky0 = b.state.sky.sky;
  castOk(b, mp0, sky0, b.perform(r.performed[0].a));
});

test('A1 touch: tap Tech, tap Turn the Sky (select), tap it again (confirm) casts it', () => {
  const b = mixedFight();
  const r = rig(b, { touch: true });
  r.frame();
  const M = r.scene.menu;
  tap(r, M.root, M.root.items.findIndex((x) => x.id === 'tech'));
  assert.equal(M.state, 'sub', 'one tap on Tech opens the list');
  const i = M.sub.items.findIndex((x) => x.id === 'turn_sky');
  if (M.sub.index !== i) { tap(r, M.sub, i); assert.equal(r.performed.length, 0, 'the first tap selects'); }
  tap(r, M.sub, i);
  assert.ok(!r.sfx.includes('buzzer'), `no buzzer (${r.sfx.join(',')})`);
  assert.deepEqual(r.performed.map((x) => x.a), [{ type: 'skill', skill: 'turn_sky' }]);
  const mp0 = b.unit('mira').mp, sky0 = b.state.sky.sky;
  castOk(b, mp0, sky0, b.perform(r.performed[0].a));
});

test('A1 + A2: the Oracle reads a star; Mira gets her turn before it lands; Tech opens on Turn the Sky in gold; two presses break it', () => {
  setFieldHour(null);
  const b = battle([{ id: 'oracle' }], { level: 24, seed: 3, options: { encounter: 'oracle', boss: true, canFlee: false, flags: { sky_learned: true } } });
  let read = null;
  for (let i = 0; i < 400 && !b.isOver(); i++) {
    const u = b.current();
    if (b.state.sky.pinned && u.uid === 'mira') break;
    const evs = u.side === 'party' ? b.perform({ type: 'defend' }) : b.runEnemyTurn();
    for (const e of evs) {
      if (e.type === 'foretell' && !e.moved) read = e;
      assert.notEqual(e.type, 'foretell_fall', 'a reading fell before Mira had a turn');
    }
  }
  assert.ok(read && b.state.sky.pinned && b.current().uid === 'mira', 'a reading is pinned and it is Mira\'s turn');
  const r = rig(b, { telegraphs: new Map([[`e0${scene5.FORETELL}`, { skill: 'last_prophecy' }]]) });
  r.frame();
  const M = r.scene.menu;
  assert.equal(M.root.item.id, 'tech', 'the root cursor opens on Tech');
  r.frame(['confirm']);
  assert.equal(M.sub.items[0].id, 'turn_sky', 'Turn the Sky first');
  assert.equal(M.sub.items[0].color, 'gold', 'in gold');
  assert.equal(typeof M.sub.items[0].draw, 'function', 'with its sky icon (A5)');
  r.frame(['confirm']);
  assert.deepEqual(r.performed.map((x) => x.a), [{ type: 'skill', skill: 'turn_sky' }]);
  const evs = b.perform(r.performed[0].a);
  assert.ok(evs.some((e) => e.type === 'foretell_broken' && e.reason === 'turned'), 'the reading breaks');
  assert.equal(b.state.sky.pinned, null);
});

test('A1: every party skill with no target, in every episode, confirms straight off its list', () => {
  const none = Object.values(SKILLS).filter((s) => s.kind !== 'enemy' && !['enemy', 'enemies', 'random', 'ally', 'allies', 'ko_ally', 'self'].includes(s.target));
  assert.ok(none.some((s) => s.id === 'turn_sky'), 'Turn the Sky is one');
  for (const sk of none) {
    const b = mixedFight();
    const who = sk.user || (sk.members && sk.members[0]) || 'mira';
    while (b.current().id !== who) b.current().side === 'party' ? b.perform({ type: 'defend' }) : b.runEnemyTurn();
    const u = b.current();
    if (!u.skills.includes(sk.id)) u.skills.push(sk.id);
    u.mp = u.maxMp;
    const r = rig(b);
    r.frame();
    const group = sk.kind === 'magic' ? 'magic' : sk.kind === 'combo' ? 'combo' : 'tech';
    keyTo(r, () => r.scene.menu.root, (it) => it.id === group);
    keyTo(r, () => r.scene.menu.sub, (it) => it.id === sk.id);
    assert.equal(r.performed.length, 1, `${sk.id} casts from the menu`);
    assert.equal(r.performed[0].a.skill, sk.id);
    assert.ok(!b.perform(r.performed[0].a).some((e) => e.type === 'invalid'), `${sk.id} is a valid action`);
  }
});

test('A1: skills that do pick a target still open the target picker', () => {
  const b = mixedFight();
  const r = rig(b);
  r.frame();
  keyTo(r, () => r.scene.menu.root, (it) => it.id === 'tech');
  keyTo(r, () => r.scene.menu.sub, (it) => it.id !== 'turn_sky' && !it.disabled && SKILLS[it.id] && SKILLS[it.id].target === 'enemy');
  assert.equal(r.scene.menu.state, 'target');
  assert.equal(r.performed.length, 0);
});

test('A2: "Mira can turn the sky." only when her turn comes before the reading lands and she can cast', () => {
  setFieldHour(null);
  const b = battle([{ id: 'oracle' }], { level: 24, seed: 3, options: { encounter: 'oracle', boss: true, canFlee: false, flags: { sky_learned: true }, inventory: { hourglass_sand: 1 } } });
  for (let i = 0; i < 400 && !b.isOver() && !b.state.sky.pinned; i++) b.current().side === 'party' ? b.perform({ type: 'defend' }) : b.runEnemyTurn();
  assert.ok(b.state.sky.pinned, 'a star is read');
  const S = b.state.sky, m = b.unit('mira');
  const at = b.timeline(12).findIndex((r) => r.uid === 'mira' && !r.skip);
  assert.ok(at >= 0 && at + 1 <= S.turnIn, `the Turn waits for Mira (her turn is action ${at + 1}, the Turn lands after ${S.turnIn})`);
  const line = () => scene5.answerLine({ b });
  assert.match(line(), /Mira can turn the sky\./);
  m.statuses.silence = { turns: 2 };
  assert.match(line(), /Hourglass Sand holds the sky\./, 'silenced: the sand is the answer, not Mira');
  b.state.inventory.hourglass_sand = 0;
  assert.equal(line(), '', 'and with no sand, no promise');
  delete m.statuses.silence;
  const turnIn = S.turnIn;
  S.turnIn = at;   // as if her turn fell after the marker
  assert.doesNotMatch(line(), /Mira can turn the sky/);
  S.turnIn = turnIn;
});

test('A3: the Day sky takes down the stars and the moon and warms the sky; warm things keep their colour', () => {
  const w = 64, h = 40, px = new Uint8ClampedArray(w * h * 4);
  const set = (x, y, [r, g, b]) => { const i = (y * w + x) * 4; px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) set(x, y, [14 + y, 21 + y, 59 + y * 2]);       // a night gradient
  for (const [x, y] of [[5, 4], [20, 9], [40, 3], [33, 15], [50, 20]]) set(x, y, [246, 244, 238]);         // stars
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (Math.hypot(x - 48, y - 8) < 5) set(x, y, [246, 228, 185]);   // the moon
  for (let y = 22; y < 30; y++) for (let x = 4; x < 16; x++) set(x, y, [195, 131, 52]);                   // a gold dome
  const grade = { multiply: '#ffcf8a', multiplyAlpha: 0.5, screen: '#ffe2a6', screenAlpha: 0.56 };
  scene5.paintDay(px, w, h, h, grade, { hz: 34, moon: [48, 8, 7] });
  const at = (x, y) => { const i = (y * w + x) * 4; return [px[i], px[i + 1], px[i + 2]]; };
  const lum = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  for (const [x, y] of [[5, 4], [20, 9], [40, 3], [33, 15], [48, 8]]) {
    const near = at(x + 3 < w ? x + 3 : x - 3, y);
    assert.ok(Math.abs(lum(at(x, y)) - lum(near)) < 0.06, `the speck at ${x},${y} is gone (${at(x, y)} vs ${near})`);
  }
  const top = at(30, 2);
  assert.ok(top[2] > top[0] && lum(top) > 0.5, `overhead a light day blue, not the night brightened (${top})`);
  const dome = at(9, 25);
  assert.ok(dome[0] > dome[2] + 40, `the gold dome stays warm (${dome})`);
});
