// X1-world: give('exp', n), the one quest-EXP primitive of both expansions (EXPANSION1_PLAN 11.3). The pure helper, the
// message boxes and the cutscene API branch; give('gold', n) and give(itemId, qty) are unchanged.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { grantPartyExp, levelUpBoxes, expToastText, Cutscene } from '../../src/world/cutscene.js';
import { createGame, addMember } from '../../src/game/state.js';
import { expForLevel } from '../../src/data/party.js';

const plain = (t) => t.replace(/\{[^}]*\}/g, '');
function trio() {
  const g = createGame('Arden');
  addMember(g, 'mira'); addMember(g, 'bram');
  return g;
}

test('grantPartyExp: n EXP to every living member, exactly n, never scaled', () => {
  const g = trio();
  const before = g.party.map((m) => m.exp);
  const res = grantPartyExp(g, 8);
  assert.equal(res.amount, 8);
  assert.deepEqual(res.members.map((m) => m.id), ['hero', 'mira', 'bram']);
  g.party.forEach((m, i) => assert.equal(m.exp, before[i] + 8, m.id));
  assert.equal(grantPartyExp(g, 12.9).amount, 12, 'floored');
  for (const bad of [0, -5, NaN, undefined, 'x']) assert.equal(grantPartyExp(g, bad).amount, 0, String(bad));
  assert.deepEqual(grantPartyExp(g, 0).members, []);
});

test('a downed member gets nothing, as in a battle; the rest do', () => {
  const g = trio();
  g.party[1].hp = 0;
  const e1 = g.party[1].exp, e0 = g.party[0].exp;
  const res = grantPartyExp(g, 20);
  assert.equal(g.party[1].exp, e1);
  assert.equal(g.party[0].exp, e0 + 20);
  assert.deepEqual(res.members.map((m) => m.id), ['hero', 'bram']);
});

test('a member who crosses a threshold levels up through grantExp(); the boxes name the member and the new level', () => {
  const g = trio();
  const hero = g.party[0];
  hero.exp = expForLevel(hero.level + 1) - 3;           // three short of the next level
  const lv = hero.level;
  const res = grantPartyExp(g, 8);
  assert.equal(hero.level, lv + 1);
  assert.equal(res.members[0].ups.length, 1);
  assert.equal(res.members[1].ups.length, 0, 'the others did not level');
  const boxes = levelUpBoxes(res);
  assert.equal(boxes.length, 1);
  assert.equal(plain(boxes[0].text), `${hero.name} reaches Lv ${lv + 1}.`);
  assert.ok(!boxes[0].text.includes(String.fromCharCode(0x2014)), 'no em dash');
  assert.deepEqual(levelUpBoxes(grantPartyExp(g, 1)), [], 'no level, no box');
  // a big grant that crosses two levels at once is one box with the last level
  const r2 = grantPartyExp(g, 3000);
  assert.ok(r2.members[0].ups.length >= 2);
  assert.ok(plain(levelUpBoxes(r2)[0].text).startsWith(`${hero.name} reaches Lv ${hero.level}.`), 'the last level, not the first');
});

test('the toast line is "The party gains n EXP."', () => {
  assert.equal(plain(expToastText(8)), 'The party gains 8 EXP.');
});

// ------------------------------------------------------------------------------------------------ the cutscene branch
function stage(g) {
  const log = [];
  const F = {
    game: g, dead: false,
    engine: null,
    giveGold: async (n) => { log.push(['gold', n]); },
    giveItem: async (id, q) => { log.push(['item', id, q]); },
    takeItem: async () => {},
    showBoxes: async (b) => { log.push(['boxes', b.map((x) => x.text)]); },
    dialog: async (o) => { log.push(['dialog', o.text]); },
  };
  F.engine = { toasts: { show: async (o) => { log.push(['toast', o.text]); }, flash: async () => {} },
    audio: { sfx: (id) => log.push(['sfx', id]), jingle: (id) => { log.push(['jingle', id]); return Promise.resolve(); } }, waitFrames: async () => {} };
  const cs = new Cutscene(F);
  return { cs, log, F };
}

test("s.give('exp', n): the toast, then (on a level) the level_up jingle and one box per member; nothing for n = 0", async () => {
  const g = trio();
  const { cs, log } = stage(g);
  const e0 = g.party[0].exp;
  await cs.api.give('exp', 8);
  assert.equal(g.party[0].exp, e0 + 8);
  assert.deepEqual(log, [['toast', expToastText(8)]], 'no level-up: just the toast');
  log.length = 0;
  g.party[1].exp = expForLevel(g.party[1].level + 1) - 1;
  await cs.api.give('exp', 5);
  assert.equal(log[0][0], 'toast');
  assert.ok(log.some((e) => e[0] === 'jingle' && e[1] === 'level_up'));
  const boxes = log.find((e) => e[0] === 'boxes');
  assert.equal(boxes[1].length, 1);
  assert.match(boxes[1][0], /Mira/);
  log.length = 0;
  await cs.api.give('exp', 0);
  assert.deepEqual(log, []);
});

test("give('gold', n) and give(itemId, qty) are unchanged (field.giveGold and field.giveItem, nothing else)", async () => {
  const g = trio();
  const { cs, log } = stage(g);
  const exp0 = g.party.map((m) => m.exp);
  await cs.api.give('gold', 120);
  await cs.api.give('potion', 3);
  await cs.api.give('potion');
  assert.deepEqual(log, [['gold', 120], ['item', 'potion', 3], ['item', 'potion', 1]]);
  assert.deepEqual(g.party.map((m) => m.exp), exp0, 'neither touches EXP');
  // a name that merely starts with exp is an item id, not the primitive
  log.length = 0;
  await cs.api.give('expedition_map', 1);
  assert.deepEqual(log, [['item', 'expedition_map', 1]]);
});

test("give('exp') after the scene is cancelled does nothing (a cancelled scene never grants)", async () => {
  const g = trio();
  const { cs, log } = stage(g);
  const e0 = g.party[0].exp;
  cs.cancel();
  await cs.api.give('exp', 50);
  assert.equal(g.party[0].exp, e0);
  assert.deepEqual(log, []);
});
