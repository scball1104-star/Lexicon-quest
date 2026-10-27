// H3-vows (docs/VOWS.md): the Vow table, the state machine and the seams. Pure checks (node); the rest flow, the menu
// and Journal lines in the real game are qa/ui/h3_vows_headless.py and the ui_vow_* shots.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VOWS, VOW_BY_ID, VOW_REWARD, VOW_PAID_CAP } from '../../src/data/vows.js';
import { offerVows, takeVow, vowEvent, vowBattleEvents, settleVow, vowLine, vowStatus, activeVow, isHealingItem, rewardPoints, vowsPaid } from '../../src/game/vows.js';
import { VOW_TEXT } from '../../src/data/text.js';
import { createGame, addMember, serialize } from '../../src/game/state.js';
import { PARTY_IDS, MASTERY_XP, masteryLevel } from '../../src/data/party.js';
import { CONSUMABLES } from '../../src/data/items.js';
import { fits, boxLines, CHOICE_COLS } from '../../src/data/story/dialogue.js';
import { EP2_START, EP3_START } from '../../src/game/state.js';
import { battle, party, untilTurn, ofType } from './_helpers.mjs';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(NEXT, rel), 'utf8');
const EM_DASH = String.fromCharCode(0x2014);
const EVENT_TYPES = ['flee', 'item', 'run', 'fell', 'fury', 'buy'];
const ASCII = (s) => /^[\x20-\x7e]*$/.test(s);

/** A party of three at a level, with a few battles already fought (so a vow taken now is "tested" after one more). */
function game(o = {}) {
  const g = createGame('Arden');
  for (const id of o.party || ['mira', 'bram']) addMember(g, id);
  if (o.chapter) g.chapter = o.chapter;
  g.counters.battles = o.battles ?? 0;
  return g;
}
const fought = (g, n = 1) => { g.counters.battles = (g.counters.battles || 0) + n; };
/** Everything about a game except the vow fields, as JSON: the "no other change" witness. */
const rest = (g) => { const s = serialize(g); delete s.vow; delete s.vowsKept; return JSON.stringify(s); };

// ================================================================================================ 1. the table
test('five vows, unique ids, names that fit a choice row, lines that fit a box, ASCII only, no em dash', () => {
  assert.equal(VOWS.length, 5);
  assert.equal(new Set(VOWS.map((v) => v.id)).size, 5, 'ids are unique');
  for (const v of VOWS) {
    assert.ok(v.name.length >= 4 && v.name.length <= 16, `${v.id}: the name fits the menu row (${v.name.length})`);
    assert.ok(v.name.length <= CHOICE_COLS, `${v.id}: the name fits a choice option`);
    assert.ok(v.line.length < 42, `${v.id}: the offer line is under 42 chars (${v.line.length})`);
    assert.ok(fits(`${v.line}\n${v.rule}`), `${v.id}: offer + rule fit one box: ${boxLines(`${v.line}\n${v.rule}`).join(' / ')}`);
    assert.ok(Array.isArray(v.breaksOn) && v.breaksOn.length, `${v.id}: breaksOn`);
    for (const t of v.breaksOn) assert.ok(EVENT_TYPES.includes(t), `${v.id}: known event type ${t}`);
    for (const id of v.to) assert.ok(PARTY_IDS.includes(id), `${v.id}: reward recipient ${id}`);
    for (const key of ['keptLine', 'brokenLine']) {
      const list = v[key];
      assert.ok(list.length >= 2 && list.length <= 3, `${v.id}.${key}: two or three variants`);
      assert.ok(list.some((l) => l.who == null), `${v.id}.${key}: a narrator fallback`);
      for (const l of list) {
        assert.ok(l.who == null || PARTY_IDS.includes(l.who), `${v.id}.${key}: speaker ${l.who}`);
        assert.ok(fits(l.text), `${v.id}.${key}: ${boxLines(l.text).join(' / ')}`);
        assert.ok(ASCII(l.text), `${v.id}.${key}: ASCII`);
      }
    }
    for (const s of [v.id, v.name, v.line, v.rule]) assert.ok(ASCII(s) && !s.includes(EM_DASH), `${v.id}: ASCII, no em dash: ${s}`);
    assert.equal(typeof v.offerIf, 'function');
  }
  for (const [k, s] of Object.entries(VOW_TEXT)) { assert.ok(ASCII(s), `VOW_TEXT.${k} is ASCII`); assert.ok(!s.includes(EM_DASH), `VOW_TEXT.${k}: no em dash`); }
  assert.ok(VOW_TEXT.none.length <= CHOICE_COLS && VOW_TEXT.take.length <= CHOICE_COLS && VOW_TEXT.back.length <= CHOICE_COLS);
  assert.ok(fits(VOW_TEXT.capped));
  for (const rel of ['src/data/vows.js', 'src/game/vows.js', 'docs/VOWS.md', 'docs/HARD_ROAD.md']) {
    if (!fs.existsSync(path.join(NEXT, rel))) continue;
    assert.ok(!read(rel).includes(EM_DASH), `${rel}: no em dash`);
  }
});

test('every reward is in bounds: a chapter of kept vows is less than one mastery level however they stack', () => {
  // Chapter 1: five paid vows at 4 points = 20, under the first mastery level (25): no vow run alone earns a tech.
  assert.equal(VOW_PAID_CAP, 5);
  assert.ok(VOW_REWARD[1] * VOW_PAID_CAP < MASTERY_XP[1], `${VOW_REWARD[1]} x ${VOW_PAID_CAP} < ${MASTERY_XP[1]}`);
  // Chapters 2 and 3: less than the WIDTH of the lowest mastery level a main weapon holds at the chapter's start (the
  // quick starts' main-weapon values), so a chapter of kept vows alone never carries a weapon through a whole level.
  const width = (L) => MASTERY_XP[L] - MASTERY_XP[L - 1];
  const lowMain = (S) => Math.min(...Object.values(S.members).map((m) => m.mastery[m.weapon]));
  const lo2 = masteryLevel(lowMain(EP2_START)), lo3 = masteryLevel(lowMain(EP3_START));
  assert.ok(lo2 >= 4 && lo3 >= 5, `the quick starts hold mastery ${lo2} and ${lo3}`);
  assert.ok(VOW_REWARD[2] * VOW_PAID_CAP < width(lo2), `chapter 2: ${VOW_REWARD[2] * VOW_PAID_CAP} < level ${lo2} width ${width(lo2)}`);
  assert.ok(VOW_REWARD[3] * VOW_PAID_CAP < width(lo3), `chapter 3: ${VOW_REWARD[3] * VOW_PAID_CAP} < level ${lo3} width ${width(lo3)}`);
  for (const [c, n] of Object.entries(VOW_REWARD)) assert.ok(Number.isInteger(n) && n > 0 && n <= 12, `chapter ${c}: ${n}`);
  assert.equal(rewardPoints(1), 4); assert.equal(rewardPoints(3), 12); assert.equal(rewardPoints(9), 12); assert.equal(rewardPoints(0), 4);
});

test('healing items are the ones that restore HP or revive; ethers, cures and the flask are not', () => {
  const healing = Object.keys(CONSUMABLES).filter(isHealingItem);
  assert.ok(healing.includes('potion') && healing.includes('hi_potion') && healing.includes('phoenix_feather'));
  assert.ok(!isHealingItem('ether') && !isHealingItem('antidote') && !isHealingItem('eye_drops') && !isHealingItem('nope'));
  for (const id of healing) { const e = CONSUMABLES[id].effect; assert.ok(e.heal || e.healPct || e.revive, id); }
});

// ================================================================================================ 2. offer and take
test('offer: Mira\'s vow is not offered without Mira; Walk the road is not offered with Always Run on', () => {
  assert.deepEqual(offerVows(game({ party: [] })).map((v) => v.id), ['no_flee', 'no_heal', 'walk', 'no_fury']);
  assert.deepEqual(offerVows(game({ party: ['bram'] })).map((v) => v.id), ['no_flee', 'no_heal', 'walk', 'no_fury']);
  assert.deepEqual(offerVows(game()).map((v) => v.id), VOWS.map((v) => v.id));
  assert.deepEqual(offerVows(game(), { alwaysRun: true }).map((v) => v.id), ['no_flee', 'no_heal', 'mira_stands', 'no_fury']);
  assert.equal(takeVow(game({ party: [] }), 'mira_stands'), null, 'cannot take an unoffered vow');
  assert.equal(takeVow(game(), 'walk', { alwaysRun: true }), null);
  assert.deepEqual(offerVows(null), []);
});

test('take: one vow at a time, the save shape, the menu line', () => {
  const g = game({ battles: 3, chapter: 1 });
  assert.equal(g.vow, null); assert.deepEqual(g.vowsKept, []);
  assert.equal(vowLine(g), null); assert.equal(vowStatus(g), null);
  const v = takeVow(g, 'no_flee');
  assert.equal(v.id, 'no_flee');
  assert.deepEqual(g.vow, { id: 'no_flee', chapter: 1, battles: 3, state: 'active', brokenBy: null });
  assert.equal(takeVow(g, 'no_fury'), null, 'a second vow is refused while one is active');
  assert.equal(activeVow(g).id, 'no_flee');
  assert.equal(vowLine(g), 'Vow: No fleeing');
  assert.deepEqual(vowStatus(g), { name: 'No fleeing', active: true });
});

// ================================================================================================ 3. keep and pay
test('take and keep pays once, only at a rest, only after a battle: mastery points on the current weapon', () => {
  const g = game({ battles: 2 });
  const hero = g.party[0];
  takeVow(g, 'no_flee');
  const before = rest(g);
  // no battle yet: carried, unchanged, still active
  const c = settleVow(g);
  assert.equal(c.kind, 'carried'); assert.equal(c.reward, null);
  assert.equal(g.vow.state, 'active'); assert.equal(rest(g), before);
  fought(g);
  const k = settleVow(g);
  assert.equal(k.kind, 'kept'); assert.equal(k.vow.id, 'no_flee');
  assert.deepEqual(k.reward, { to: 'hero', name: 'Arden', weapon: 'sword', points: 4, level: { from: 1, to: 1 }, unlocked: [] });
  assert.equal(hero.mastery.sword, 4);
  assert.equal(k.text, 'Vow kept: No fleeing.\nArden: sword mastery +4.');
  assert.ok(fits(k.text), 'the kept box fits');
  assert.equal(k.line.who, 'bram');
  assert.equal(g.vow, null);
  assert.deepEqual(g.vowsKept, [{ id: 'no_flee', chapter: 1, paid: true }]);
  // nothing more to settle, and nothing else moved (the mastery line aside)
  assert.equal(settleVow(g), null);
  assert.equal(hero.mastery.sword, 4);
  assert.equal(hero.level, 1); assert.equal(hero.exp, 0);
  assert.equal(g.gold, 80);
});

test('the reward goes to the member the vow concerns, with a fallback when that member is not here', () => {
  const g = game({ battles: 1 });
  takeVow(g, 'no_heal'); fought(g);
  const k = settleVow(g);
  assert.equal(k.reward.to, 'bram'); assert.equal(k.reward.weapon, 'spear');
  assert.equal(g.party.find((m) => m.id === 'bram').mastery.spear, 4);
  const solo = game({ party: [], battles: 1 });
  takeVow(solo, 'no_heal'); fought(solo);
  assert.equal(settleVow(solo).reward.to, 'hero');
  const m = game({ battles: 1 });
  takeVow(m, 'mira_stands'); fought(m);
  const km = settleVow(m);
  assert.equal(km.reward.to, 'mira'); assert.equal(km.reward.weapon, 'staff'); assert.equal(km.line.who, 'mira');
});

test('the kept box names a tech the points unlock, and the chapter cap ends the points but not the line', () => {
  const g = game({ battles: 0 });
  g.party[0].mastery.sword = MASTERY_XP[1] - 2;   // two points short of mastery 2
  takeVow(g, 'no_fury'); fought(g);
  const k = settleVow(g);
  assert.equal(k.reward.level.from, 1); assert.equal(k.reward.level.to, 2);
  assert.ok(k.reward.unlocked.length >= 1, 'mastery 2 unlocks a sword tech');
  assert.ok(/learned!$/.test(k.text), k.text);
  assert.ok(fits(k.text), `the kept box with a learned line fits: ${boxLines(k.text).join(' / ')}`);
  // five paid, then the sixth keeps the line and pays nothing
  const h = game({ battles: 0 });
  for (let i = 0; i < 5; i++) { takeVow(h, 'no_flee'); fought(h); assert.equal(settleVow(h).reward.points, 4); }
  assert.equal(h.party[0].mastery.sword, 20);
  assert.equal(vowsPaid(h), 5);
  takeVow(h, 'no_flee'); fought(h);
  const sixth = settleVow(h);
  assert.equal(sixth.kind, 'kept'); assert.equal(sixth.reward, null);
  assert.equal(sixth.text, `Vow kept: No fleeing.\n${VOW_TEXT.capped}`);
  assert.ok(fits(sixth.text));
  assert.equal(h.party[0].mastery.sword, 20, 'no points past the cap');
  assert.equal(h.vowsKept.length, 6); assert.equal(h.vowsKept[5].paid, false);
  // a new chapter starts a new count
  h.chapter = 2; takeVow(h, 'no_flee'); fought(h);
  assert.equal(settleVow(h).reward.points, VOW_REWARD[2]);
});

// ================================================================================================ 4. break
test('break ends the vow with no payout and no other change to the game; one toast; then one line at the next rest', () => {
  const g = game({ battles: 1 });
  takeVow(g, 'no_flee');
  const before = rest(g);
  const calls = [];
  const engine = { toasts: { flash: (text, o) => { calls.push([text, o]); return Promise.resolve(true); } } };
  assert.equal(vowEvent(g, { type: 'flee' }, engine), true);
  assert.equal(g.vow.state, 'broken'); assert.equal(g.vow.brokenBy, 'flee');
  assert.equal(rest(g), before, 'nothing but the vow changed');
  assert.deepEqual(calls.map((c) => c[0]), ['Vow ended: No fleeing.']);
  assert.equal(vowLine(g), 'Vow ended'); assert.deepEqual(vowStatus(g), { name: 'No fleeing', active: false });
  assert.equal(activeVow(g), null);
  // a second break is a no-op (no second toast), and so is any event after
  assert.equal(vowEvent(g, { type: 'flee' }, engine), false);
  assert.equal(calls.length, 1);
  fought(g);
  const b = settleVow(g);
  assert.equal(b.kind, 'broken'); assert.equal(b.reward, null); assert.equal(b.text, null);
  assert.equal(b.line.who, 'bram'); assert.ok(fits(b.line.text));
  assert.equal(g.vow, null); assert.deepEqual(g.vowsKept, []);
  assert.equal(rest(g), rest(game({ battles: 2 })), 'the game is a plain game again');
  assert.equal(settleVow(g), null);
});

test('vowEvent with no active vow is a no-op, with or without an engine', () => {
  const g = game({ battles: 1 });
  const before = rest(g);
  let toasts = 0;
  const engine = { toasts: { flash: () => { toasts++; } } };
  for (const type of EVENT_TYPES) {
    assert.equal(vowEvent(g, { type, item: 'potion', member: 'mira' }, engine), false);
    assert.equal(vowEvent(g, { type, item: 'potion', member: 'mira' }), false);
  }
  assert.equal(vowEvent(g, null, engine), false);
  assert.equal(vowEvent(null, { type: 'flee' }, engine), false);
  assert.equal(toasts, 0);
  assert.equal(rest(g), before); assert.equal(g.vow, null);
  assert.equal(vowBattleEvents(g, [{ type: 'action_start', action: { type: 'item', item: 'potion' } }], engine), false);
});

test('each vow breaks on its own event only; the item and fell events are filtered by item and member', () => {
  const quiet = { type: 'buy', item: 'potion', qty: 1 };
  for (const v of VOWS) {
    const g = game({ battles: 1 });
    takeVow(g, v.id);
    for (const type of EVENT_TYPES) {
      if (v.breaksOn.includes(type)) continue;
      assert.equal(vowEvent(g, { type, item: 'potion', member: 'mira' }), false, `${v.id} ignores ${type}`);
    }
    assert.equal(vowEvent(g, quiet), false);
    assert.equal(g.vow.state, 'active');
  }
  const heal = game({ battles: 1 }); takeVow(heal, 'no_heal');
  assert.equal(vowEvent(heal, { type: 'item', item: 'ether' }), false, 'an ether is not a healing item');
  assert.equal(vowEvent(heal, { type: 'item', item: 'antidote' }), false);
  assert.equal(vowEvent(heal, { type: 'item', item: 'phoenix_feather' }), true, 'a feather is');
  const mira = game({ battles: 1 }); takeVow(mira, 'mira_stands');
  assert.equal(vowEvent(mira, { type: 'fell', member: 'bram' }), false, 'Bram falling is not her vow');
  assert.equal(vowEvent(mira, { type: 'fell', member: 'hero' }), false);
  assert.equal(vowEvent(mira, { type: 'fell', member: 'mira' }), true);
  const walk = game({ battles: 1 }); takeVow(walk, 'walk');
  assert.equal(vowEvent(walk, { type: 'run' }), true);
  const fury = game({ battles: 1 }); takeVow(fury, 'no_fury');
  assert.equal(vowEvent(fury, { type: 'fury' }), true);
  const flee = game({ battles: 1 }); takeVow(flee, 'no_flee');
  assert.equal(vowEvent(flee, { type: 'flee' }), true);
});

test('the battle seam reads the rules\' own events: action_start of an item, fury_gain spent; nothing else', () => {
  const g = game({ battles: 1 }); takeVow(g, 'no_heal');
  assert.equal(vowBattleEvents(g, [{ type: 'action_start', action: { type: 'attack' } }, { type: 'fury_gain', reason: 'strike' }]), false);
  assert.equal(vowBattleEvents(g, [{ type: 'action_start', action: { type: 'item', item: 'ether' } }]), false);
  assert.equal(vowBattleEvents(g, [null, { type: 'action_start', action: { type: 'item', item: 'potion' } }]), true);
  const f = game({ battles: 1 }); takeVow(f, 'no_fury');
  assert.equal(vowBattleEvents(f, [{ type: 'fury_gain', reason: 'strike', amount: 12 }]), false);
  assert.equal(vowBattleEvents(f, [{ type: 'fury_gain', reason: 'spent', amount: -100 }]), true);
  assert.equal(vowBattleEvents(f, 'not a list'), false);
});

// ================================================================================================ 5. the real rules' event shapes the seams rely on
test('rules.js emits the shapes the seams read: item action_start with the item id, a party ko with the uid, escape success', () => {
  // an item: the hero drinks a potion on turn one
  const b = battle(['ink_slime'], { level: 4, rng: () => 0.5 });
  untilTurn(b, 'hero');
  const evs = b.perform({ type: 'item', item: 'potion', target: 'hero' });
  const start = ofType(evs, 'action_start').find((e) => e.action && e.action.type === 'item');
  assert.ok(start && start.action.item === 'potion', 'action_start carries the item id');
  const g = game({ battles: 1 }); takeVow(g, 'no_heal');
  assert.equal(vowBattleEvents(g, evs), true, 'the seam breaks No healing items on those events');
  // a ko: Mira at 1 HP takes a hit
  const b2 = battle(['briar_wolf', 'briar_wolf'], { level: 1, edit: { mira: { hp: 1 } }, rng: () => 0.5 });
  let ko = null;
  for (let i = 0; i < 200 && !ko && !b2.isOver(); i++) {
    const u = b2.current();
    const out = u.side === 'party' ? b2.perform({ type: 'defend' }) : b2.runEnemyTurn();
    ko = ofType(out, 'ko').find((e) => e.target === 'mira') || null;
  }
  assert.ok(ko, 'a ko event names the fallen unit by uid (the battle scene maps it to the actor and its member id)');
  // escape: the flee roll succeeds at rng 0 (chance floor 0.2)
  const b3 = battle(['ink_slime'], { level: 4, rng: () => 0 });
  untilTurn(b3, 'hero');
  const fl = b3.perform({ type: 'flee' });
  const esc = ofType(fl, 'escape')[0];
  assert.ok(esc && esc.success === true, 'escape carries success');
});

// ================================================================================================ 6. the seams in the scenes, pinned
test('the seams: one vow call each in battle (three), field, items and shop; rules.js and the sim untouched', () => {
  const count = (rel, re) => (read(rel).match(re) || []).length;
  const b = read('src/scenes/battle.js');
  assert.equal(count('src/scenes/battle.js', /vowBattleEvents\(this\.engine\.game, evs, this\.engine\)/g), 1, 'performParty: items and Fury');
  assert.equal(count('src/scenes/battle.js', /vowEvent\(e\.game, \{ type: 'fell', member: a\.id \}, e\)/g), 1, 'ko op: a party member fell');
  assert.equal(count('src/scenes/battle.js', /vowEvent\(e\.game, \{ type: 'flee' \}, e\)/g), 1, 'escape op: the Flee command succeeded');
  assert.ok(/case 'escape': if \(op\.success\) \{ vowEvent\(/.test(b), 'the flee call sits inside the success branch');
  assert.equal(count('src/scenes/field.js', /vowEvent\(this\.game, \{ type: 'run' \}, this\.engine\)/g), 1, 'tryLeaderStep: a running step');
  assert.ok(/L\.startStep\(nx, ny, dur\);\r?\n\s*if \(dur === RUN_FRAMES\) vowEvent\(/.test(read('src/scenes/field.js')), 'the run call follows the accepted step');
  assert.equal(count('src/ui/screens/items.js', /vowEvent\(this\.g, \{ type: 'item', item: id \}, this\.engine\)/g), 1, 'items screen: an item used from the bag');
  assert.equal(count('src/scenes/shop.js', /vowEvent\(this\.g, \{ type: 'buy', item: it\.id, qty: n \}, this\.engine\)/g), 1, 'shop: a purchase');
  // (Episode 2's story flags are named vow_door_open, vow_courage and so on: the check is for the vow MODULE, not the word.)
  const touches = /vowEvent|vowBattleEvents|game\/vows\.js|data\/vows\.js|vowsKept/;
  assert.ok(!touches.test(read('src/battle/rules.js')), 'the pure rules module knows nothing of vows');
  assert.ok(!touches.test(read('tools/sim/simulate.mjs')) && !touches.test(read('tools/sim/route.mjs')), 'the simulator knows nothing of vows');
  assert.ok(!touches.test(read('qa/autoplay.py')), 'the autoplay bot was not changed');
  // the rest flow: the vow row sits after the heal toast and before the save prompt, "No vow" first with cancel on it
  const ev = read('src/world/events.js');
  const iHeal = ev.indexOf('HP{/c} and {c:blue}MP{/c} restored'), iRow = ev.indexOf('await vowRow(field);'), iSave = ev.indexOf('HELP.save.prompt');
  assert.ok(iHeal > 0 && iRow > iHeal && iSave > iRow, 'heal, then the vow row, then the save prompt');
  assert.ok(/choices: \[VOW_TEXT\.none, \.\.\.offered\.map\(\(v\) => v\.name\)\], cancel: 0/.test(ev), '"No vow" is first and is the cancel option');
  assert.ok(ev.includes("if (settled && settled.kind === 'carried') return;"), 'an untested vow rides on and nothing is offered');
});
