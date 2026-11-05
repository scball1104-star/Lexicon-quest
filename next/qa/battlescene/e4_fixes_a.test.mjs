// E4-fixes-A (PLAYTEST_REVIEW_6 fixes 2 and 4): during the Strike from the Roll the hero's menu opens on Tech with Answer
// first in gold (the Tempered Oath rule, generalised so a pack names its own signature Tech); and on a keyboard, Enter in a
// battle is Auto only (the help bar's "Enter Auto"), never Auto and a menu confirm on the same press.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleScene } from '../../src/scenes/battle.js';
import { CommandMenu, SIGNATURE_TECHS } from '../../src/battle/scene/menu.js';
import { DEFAULT_KEYS } from '../../src/core/input.js';
import { battle } from '../battle/_helpers.mjs';

(await import('../../tools/sim/ep4.mjs')).registerData();
(await import('../../src/data/ep4/scene.js')).register();

function rig(who, telegraph, level = 20, flags = { hero_signed: true }) {
  const b = battle([{ id: 'ink_slime' }], { level, options: { flags } });
  while (b.current().uid !== who) b.current().side === 'party' ? b.perform({ type: 'defend' }) : b.runEnemyTurn();
  const pressed = new Set(), consumed = new Set(), settings = {};
  const base = { pressed: (k) => pressed.has(k) && !consumed.has(k), consume: (k) => consumed.add(k), tapIn: () => false, repeatDir: () => null, pointer: null };
  const input = new Proxy(base, { get: (t, k) => (k in t ? t[k] : () => null) });
  const engine = { input, audio: { sfx() {}, pushMusic() {} }, touch: { visible: false }, settings, setSetting(k, v) { settings[k] = v; } };
  const performed = [];
  const scene = {
    engine, b, phase: 'play', below: null, get auto() { return !!settings.autoBattle; }, actors: new Map(), speed: 1,
    telegraphs: new Map(telegraph ? [['e0', { skill: telegraph, text: 'x' }]] : []),
    scaled: (n) => n, touchButtons() { return null; }, runOps() { return false; }, performParty(a) { performed.push(a); },
  };
  scene.menu = new CommandMenu(scene);
  scene.menu.open(b.current());
  const frame = (...keys) => { pressed.clear(); consumed.clear(); for (const k of keys) pressed.add(k); BattleScene.prototype.updatePlay.call(scene); };
  return { scene, frame, performed, settings };
}

test('the signature table: Bram\'s Oath is core, the ep4 pack adds the hero\'s Answer once', () => {
  assert.deepEqual(SIGNATURE_TECHS[0], { unit: 'bram', flag: 'turnable', skill: 'tempered_oath' });
  assert.deepEqual(SIGNATURE_TECHS.filter((t) => t.skill === 'answer'), [
    { unit: 'hero', flag: 'answerable', skill: 'answer' },
    { unit: 'hero', flag: 'decree', skill: 'answer', usable: true },
  ]);
});

test('Strike from the Roll pending: the hero opens on Tech and Answer is the first row, in gold', () => {
  const { scene } = rig('hero', 'strike_roll');
  const m = scene.menu;
  assert.equal(m.root.item.id, 'tech', 'the root cursor starts on Tech');
  const tech = m.root.items.find((i) => i.id === 'tech').cmd;
  assert.ok(tech.list.length >= 5 && tech.list.at(-1).skill === 'answer', 'Answer is last in the data (the 7th of 7 at Lv 20)');
  m.openSub(tech);
  assert.equal(m.sub.items[0].id, 'answer');
  assert.equal(m.sub.items[0].color, 'gold');
  assert.equal(m.sub.index, 0, 'the cursor is on Answer');
});

test('an ordinary decree pending: the hero opens on Tech with Answer first, in gold, and Mira is not pulled', () => {
  for (const skill of ['runoff', 'edict', 'objection', 'flood_decree']) {
    const m = rig('hero', skill).scene.menu;
    assert.equal(m.root.item.id, 'tech', skill);
    m.openSub(m.root.items.find((i) => i.id === 'tech').cmd);
    assert.equal(m.sub.items[0].id, 'answer', skill);
    assert.equal(m.sub.items[0].color, 'gold', skill);
  }
  assert.equal(rig('mira', 'runoff').scene.menu.root.item.id, 'attack');
});

test('a decree before the hero has signed: no hint, the menu opens as usual', () => {
  const m = rig('hero', 'runoff', 15, {}).scene.menu;
  assert.equal(m.root.item.id, 'attack');
  m.openSub(m.root.items.find((i) => i.id === 'tech').cmd);
  assert.ok(!m.sub.items.some((i) => i.id === 'answer'), 'Answer is not learned yet');
  assert.ok(!m.sub.items.some((i) => i.color === 'gold'));
});

test('out of MP: an ordinary decree does not pull the hero to Tech, Strike from the Roll still shows why', () => {
  const low = (skill) => {
    const r = rig('hero', skill);
    r.scene.b.current().mp = 0;
    r.scene.menu.open(r.scene.b.current());
    return r.scene.menu;
  };
  assert.equal(low('runoff').root.item.id, 'attack');
  const m = low('strike_roll');
  m.root.moveTo(m.root.items.findIndex((i) => i.id === 'tech'));
  m.openSub(m.root.item.cmd);
  assert.equal(m.sub.items[0].id, 'answer');
  assert.equal(m.sub.items[0].color, 'gold');
  assert.ok(m.sub.items[0].disabled, 'greyed: not enough MP');
});

test('no Strike pending: the hero opens where the setting says and Answer stays last; Mira is never pulled to Tech', () => {
  const { scene } = rig('hero', null);
  assert.equal(scene.menu.root.item.id, 'attack');
  scene.menu.openSub(scene.menu.root.items.find((i) => i.id === 'tech').cmd);
  assert.equal(scene.menu.sub.items.at(-1).id, 'answer');
  assert.notEqual(scene.menu.sub.items[0].color, 'gold');
  const mira = rig('mira', 'strike_roll');
  assert.equal(mira.scene.menu.root.item.id, 'attack');
});

test('Enter is both confirm and start on the keyboard (DESIGN 3), so the battle reads it as Auto alone', () => {
  assert.ok(DEFAULT_KEYS.confirm.includes('Enter') && DEFAULT_KEYS.start.includes('Enter'), 'the documented keys are unchanged');
  const { scene, frame, performed, settings } = rig('hero', null);
  const m = scene.menu;
  m.root.moveTo(m.root.items.findIndex((i) => i.id === 'tech'));
  frame('confirm', 'start');                 // one Enter press
  assert.equal(settings.autoBattle, true, 'Enter turned Auto on');
  assert.notEqual(m.state, 'sub', 'the same press did not also open the Tech list');
  assert.equal(performed.length, 0, 'and took no action from the menu');
  const z = rig('hero', null);
  z.scene.menu.root.moveTo(z.scene.menu.root.items.findIndex((i) => i.id === 'tech'));
  z.frame('confirm');                        // Z
  assert.equal(z.scene.menu.state, 'sub', 'Z still opens the Tech list');
  assert.ok(!z.settings.autoBattle);
});

// CRITIQUE_6 item 2: on the phone the Barrister's weakness row sat across its chest when the help window grew (the telegraph
// runs two or three lines): every spot clear of the body hit a window, and "above, clamped under the band" won. The beside-
// the-body spots under the band (W13, once only for tall foes) now stand for every foe.
test('phone: the Barrister\'s row never lands inside its body, whatever the help window\'s height', async () => {
  const L = await import('../../src/battle/scene/layout.js');
  L.STAGE.tall.clear();
  const u = { uid: 'e0', side: 'enemy', x: 98, y: 134, homeX: 98, homeY: 134, w: 87, h: 92 };   // measured in the phone shot
  const own = L.spriteBox(u, true);
  const cw = { x: 4, y: 132, w: 126, h: 80 };
  const party = [[300, 150], [324, 146], [348, 150]].map(([x, y]) => ({ x: x - 12, y: y - 36, w: 24, h: 36, party: true }));
  const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  for (const helpBottom of [23, 34, 46, 59]) {
    const s = L.touchRowSpot(u, 82, { cw, blocks: L.topBlocks(helpBottom), boxes: party });
    const box = { x: s.x, y: s.y, w: 82, h: L.ENEMY_ROW_H };
    assert.ok(!hit(box, own), `help bottom ${helpBottom}: row ${JSON.stringify(box)} (${s.place}) is inside the body ${JSON.stringify(own)}`);
    assert.ok(!hit(box, cw), `help bottom ${helpBottom}: row clear of the command window`);
    for (const b of L.topBlocks(helpBottom)) assert.ok(!hit(box, b), `help bottom ${helpBottom}: row clear of the help window and timeline`);
  }
});

// PLAYTEST_REVIEW_6 fix 10: "The Paper Regent: is broken: ..." lost its stray colon; Answer's cancel adds no second line
// (its own message already says the plan's "{hero} answers to their name. The decree will not stand.").
test('the decree void lines read as sentences', async () => {
  const { Planner } = await import('../../src/battle/scene/animator.js');
  const said = (reason) => {
    const out = [];
    const ctx = { units: { e0: { id: 'paper_regent' } }, push() {}, wait() {}, help: (t) => out.push(t), name: () => 'The Paper Regent' };
    Planner.prototype.ev_telegraph_cancel.call(ctx, { type: 'telegraph_cancel', actor: 'e0', reason });
    return out;
  };
  assert.deepEqual(said('break'), ['{c:cyan}The Paper Regent is broken: the decree falls apart!{/c}']);
  assert.deepEqual(said('quench'), ['{c:cyan}The Paper Regent: its decree is voided!{/c}']);
  assert.deepEqual(said('answer'), []);
});

// CRITIQUE_6 item 13: on the phone beside a tall boss (the docked help window) the action line printed twice, in the help
// window and in the log window under it. It shows once, in the log; anywhere else the help window is unchanged.
test('phone, docked help: an action line is not repeated over the log', async () => {
  const L = await import('../../src/battle/scene/layout.js');
  const view = (dock, menu = 'closed') => {
    L.STAGE.tall.clear(); L.STAGE.actors = null;
    if (dock) L.STAGE.tall.add('e0');
    const fake = { help: { text: 'Arden: {c:gold}Answer{/c}', color: null }, telegraphs: new Map(), menu: { state: menu }, phase: 'play',
      auto: false, speed: 1, log: ['Arden: {c:gold}Answer{/c}'], touchButtons: () => ({}) };
    try { return BattleScene.prototype.helpView.call(fake, { measure: () => 40 }).text; } finally { L.STAGE.tall.clear(); }
  };
  assert.equal(view(true), '', 'docked: the log holds the line');
  assert.equal(view(false), 'Arden: {c:gold}Answer{/c}', 'not docked: unchanged');
});
