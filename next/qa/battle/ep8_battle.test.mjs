// Episode 8 combat (E8-battle; docs/EPISODE8_PLAN.md 6 and 7): the pack's battle data registers without touching Episodes 1 to 7,
// Erasure on rules.js RULE_EXT (party only, the last command rubbed out for two turns, Defend slides, the hero never, at most two),
// the commands hook (with a fake seam until E8-pack's lands: erasureCommands is idempotent), Read Aloud (from a rubbed Magic row, on
// Mira herself), the pinned Unwrite and holdForMira, Unwritten and its three ends, the Sentry, the Eraser's four phases and looks, the
// Last Silence and Answer (one telegraph at a time), Episode 4's wraps, the gates, Auto, the one-hit rule, items, loot, shops and
// purity. Balance targets: ep8_sim.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { battle, midRng } from './_helpers.mjs';
import { makeRng, RULE_EXT, memberStats, DEF_K, VARIANCE, CRIT_MULT } from '../../src/battle/rules.js';
import { SCRIPTS, POLICY_EXT, PARTY_POLICIES, partyAction } from '../../src/battle/ai.js';
import { ENEMIES, ELITE_BASE } from '../../src/data/enemies.js';
import { SKILLS, CHARACTER_SKILLS } from '../../src/data/skills.js';
import { ITEMS, EQUIPMENT, UNIQUES, SETS, AFFIXES, KEY_ITEMS, CONSUMABLES } from '../../src/data/items.js';
import { ZONES, ENCOUNTERS } from '../../src/data/encounters.js';
import { SHOPS } from '../../src/data/shops.js';
import { ZONE_LOOT, BOSS_LOOT } from '../../src/data/loot-tables.js';
import { RARE_NAME_EXT } from '../../src/battle/loot.js';

const { makeParty, runBattle } = await import('../../tools/sim/simulate.mjs');
const ep7 = await import('../../tools/sim/ep7.mjs');
// Snapshots after the ep4 to ep7 packs and before ep8 (ep8's register() calls must only add, and change nothing they read).
ep7.registerData();
const before = {
  enemies: new Set(Object.keys(ENEMIES)), skills: new Set(Object.keys(SKILLS)), items: new Set(Object.keys(ITEMS)),
  zones: Object.keys(ZONES).slice(), phantom: JSON.stringify(ENEMIES.white_phantom), answer: JSON.stringify(SKILLS.answer),
  shops: Object.keys(SHOPS).length, mira: CHARACTER_SKILLS.mira.slice(),
};
// Battles traced before Episode 8 registers: they must replay identically after (no erasing foe, no Erasure).
const ep7Trace = JSON.stringify(runBattle({ zone: 'ep7_stillheart', level: 30, encounter: 'white_phantom', seed: 3, trace: true }));
const ep4Trace = JSON.stringify(runBattle({ zone: 'ep4_keep_f2', level: 19, encounter: 'barrister', seed: 3, trace: true }));
const ep7Cmds = (() => { const b = fight0(); return JSON.stringify(b.living('party').map((u) => b.commands(u))); })();
function fight0() {
  const b = battle(['rime_wolf'], { rng: midRng, party: makeParty('ep7_vault_f1', 29), options: { zone: 'ep7_white_road', flags: ep7FLAGS() } });
  b.begin();
  return b;
}
function ep7FLAGS() { return ['bram_memory_3', 'hero_signed', 'sky_learned', 'anchor_learned', 'call_learned', 'read_learned']; }

const { registerData, LOADOUTS, economy8, checkEconomy8, progression, eraserMargin, arrival } = await import('../../tools/sim/ep8.mjs');
registerData();
const er = await import('../../src/data/ep8/erasure.js');
const E8 = { enemies: await import('../../src/data/ep8/enemies.js'), enc: await import('../../src/data/ep8/encounters.js'),
  skills: await import('../../src/data/ep8/skills.js'), items: await import('../../src/data/ep8/items.js'),
  loot: await import('../../src/data/ep8/loot.js'), shops: await import('../../src/data/ep8/shops.js'), ai: await import('../../src/data/ep8/ai.js') };

const FLAGS = ep7FLAGS();
const foes = (b) => b.units().filter((u) => u.side === 'enemy');
let captured = null;
const CAPTURE = { id: 'ep8_test_capture', start(ctx) { captured = ctx; } };
/** A battle as the game builds it, and its rule context. */
function fight(enemies, { zone = 'ep8_library_f1', encounter = null, level = 32, loadout = 'ep8_library_f2', rng = midRng, flags = FLAGS, inv = {}, boss = false } = {}) {
  RULE_EXT.push(CAPTURE);
  try {
    const b = battle(enemies, { rng, party: makeParty(loadout, level),
      options: { zone, encounter, boss, flags, inventory: { hi_potion: 4, fresh_ink: 3, ether: 2, ...inv } } });
    b.begin();
    b.ctx = captured;
    return b;
  } finally { RULE_EXT.splice(RULE_EXT.indexOf(CAPTURE), 1); }
}
const sturdy = (b) => { for (const u of b.living('party')) u.hp = u.maxHp = 99999; for (const u of foes(b)) { u.hp = u.maxHp = Math.max(u.maxHp, 60000); } return b; };
const cmdsOf = (b, id) => er.commandsOf(b, b.unit(id));
const row = (b, id, cmd) => cmdsOf(b, id).find((c) => c.id === cmd);
/** Walk the battle (party acts by `act`, foes by their scripts) until `pred(events, b)` holds. */
function until(b, pred, max = 400, act = () => ({ type: 'defend' })) {
  const seen = [];
  for (let i = 0; i < max && !b.isOver(); i++) {
    const u = b.current();
    const evs = u.side === 'party' ? b.perform(act(u, b)) : b.runEnemyTurn();
    seen.push(...evs);
    if (pred(evs, b)) return seen;
  }
  throw new Error('condition never met');
}
/** Give `uid` the next turn (the test sets the timeline, as Episode 7's tests do). */
function turnTo(b, uid) {
  const st = b.state;
  for (const u of b.units()) if (u.alive) u.next = Math.max(u.next, st.now + 500);
  b.unit(uid).next = st.now;
  st.current = null;
  // advance through the public API: a harmless perform/run does it, so set current directly the way rules.js advance() does
  st.current = uid;
}
/** Mira (or anyone) performs `a` on her own turn (after turnTo). */
function act(b, uid, a) { turnTo(b, uid); return b.perform(a); }

test('Episode 8 ids are registered, listed now that the maps exist, and Episodes 1 to 7 are untouched', () => {
  for (const id of [...E8.enemies.EP8_FOES, ...E8.enemies.EP8_BOSSES, ...E8.enemies.EP8_ADDS]) {
    assert.ok(ENEMIES[id] && !before.enemies.has(id), id);
    assert.equal(ENEMIES[id].erasing, true, `${id} is erasing`);
  }
  for (const id of Object.keys(E8.skills.EP8_SKILLS)) assert.ok(SKILLS[id] && !before.skills.has(id), id);
  for (const id of [...E8.enc.EP8_GROUP_IDS, ...E8.enc.EP8_BOSS_IDS]) assert.ok(ENCOUNTERS[id], id);
  assert.equal(E8.enc.EP8_GROUP_IDS.length, 12);
  assert.equal(E8.enc.EP8_MAPS_LISTED, true, 'E8-maps-b built the five zones (wave 8c)');
  for (const z of E8.enc.EP8_ZONE_ORDER) {
    assert.ok(ZONES[z], z);
    assert.ok(Object.keys(ZONES).includes(z), `${z} is listed now that its map exists`);
  }
  assert.deepEqual(Object.keys(ZONES), [...before.zones, ...E8.enc.EP8_ZONE_ORDER.filter((z) => !before.zones.includes(z))], 'only the Episode 8 zones join the list');
  assert.equal(JSON.stringify(ENEMIES.white_phantom), before.phantom);
  assert.equal(JSON.stringify(SKILLS.answer), before.answer, "Answer's data is unchanged (Episode 8 gives it a job, not a new row)");
  assert.equal(Object.keys(SHOPS).length, before.shops + 3);
  assert.deepEqual(CHARACTER_SKILLS.mira, [...before.mira, 'read_aloud']);
  // idempotent
  const n = [Object.keys(ENEMIES).length, Object.keys(SKILLS).length, Object.keys(ITEMS).length, RULE_EXT.length, POLICY_EXT.length];
  registerData();
  assert.deepEqual([Object.keys(ENEMIES).length, Object.keys(SKILLS).length, Object.keys(ITEMS).length, RULE_EXT.length, POLICY_EXT.length], n);
  // no foe uses a skill it does not have, and every plan foe is in a plan group
  for (const id of [...E8.enemies.EP8_FOES, ...E8.enemies.EP8_BOSSES, ...E8.enemies.EP8_ADDS]) {
    const e = ENEMIES[id];
    for (const m of [...e.moves, ...((e.phases || []).flatMap((p) => p.moves || []))]) assert.ok(SKILLS[m.skill], `${id} ${m.skill}`);
    if (e.charge) assert.ok(SKILLS[e.charge.skill], `${id} charge`);
    assert.ok(SCRIPTS[e.ai], `${id} ai ${e.ai}`);
  }
});

test('battles with no erasing foe have no Erasure: an Episode 7 and an Episode 4 boss replay bit for bit; their commands deep-equal with the hook', () => {
  assert.equal(JSON.stringify(runBattle({ zone: 'ep7_stillheart', level: 30, encounter: 'white_phantom', seed: 3, trace: true })), ep7Trace);
  assert.equal(JSON.stringify(runBattle({ zone: 'ep4_keep_f2', level: 19, encounter: 'barrister', seed: 3, trace: true })), ep4Trace);
  const b = fight0();
  assert.equal(b.state.erasure, undefined);
  // the hook, run on an Episode 1 to 7 battle's lists (the fake seam), changes nothing
  const lists = b.living('party').map((u) => b.commands(u));
  const hooked = b.living('party').map((u, i) => RULE_EXT.commands(b.state, u, JSON.parse(JSON.stringify(lists[i])), b.ctx));
  assert.equal(JSON.stringify(hooked), JSON.stringify(lists));
  assert.equal(JSON.stringify(lists), ep7Cmds, 'the same commands as before Episode 8 registered');
  assert.equal(typeof RULE_EXT.commands, 'function');
  assert.ok(RULE_EXT.commands.ep8Erasure);
  // rules.js calls RULE_EXT.commands and then each entry's own: Erasure is on the first only, so it marks a build once (E8-fixes)
  assert.deepEqual(RULE_EXT.filter((h) => h && h.commands).map((h) => h.id), [], 'no RULE_EXT entry has a commands hook of its own');
  // Read Aloud is gated with no erasing foe
  const m = b.unit('mira');
  assert.ok(!m.skills.includes('read_aloud'));
  assert.ok(b.state.gated.some((g) => g.unit === 'mira' && g.skill === 'read_aloud' && g.reason === 'Nothing to read back.'));
});

test('Erasure starts in every Episode 8 battle; Turn the Sky, Anchor and Call stay gated there; Read Aloud is listed', () => {
  for (const id of [...E8.enc.EP8_GROUP_IDS, ...E8.enc.EP8_BOSS_IDS]) {
    const e = ENCOUNTERS[id];
    const b = fight(e.enemies, { zone: e.zone, encounter: id, boss: e.boss });
    assert.ok(b.state.erasure, `${id}: Erasure`);
    assert.ok(b.startEvents.some((ev) => ev.type === 'erasure' && ev.reason === 'start'));
    assert.ok(!b.state.sky && !b.state.gale && !b.state.rime, `${id}: no earlier rule`);
    const skills = b.living('party').flatMap((u) => u.skills);
    for (const s of ['turn_sky', 'anchor_line', 'call_name']) assert.ok(!skills.includes(s), `${id}: ${s} gated`);
    assert.ok(b.unit('mira').skills.includes('read_aloud'), `${id}: Read Aloud`);
  }
});

test('rubbing out: the last command goes for two turns; a second rub resets it; Defend slides; the hero never; at most two; no foe ever', () => {
  const b = fight(['index_hound', 'index_hound']);
  sturdy(b);
  const hound = foes(b)[0];
  const bram = b.unit('bram'), hero = b.unit('hero');
  // nothing used yet: nothing to rub
  assert.equal(er.rub(b.ctx, bram, hound), null);
  act(b, 'bram', { type: 'attack', target: hound.uid });
  assert.equal(er.lastOf(b, 'bram'), 'attack');
  assert.equal(er.rub(b.ctx, bram, hound), 'attack');
  let r = row(b, 'bram', 'attack');
  assert.equal(r.enabled, false);
  assert.equal(r.reason, 'Rubbed out');
  assert.equal(r.help, 'Rubbed out. Try something else.');
  assert.deepEqual(r.rubbed, { left: 2, max: 2 });
  // a second rub resets to two; Bram's next turn (a Tech) counts one down
  act(b, 'bram', { type: 'skill', skill: 'taunt' });
  assert.equal(er.lastOf(b, 'bram'), 'tech');
  assert.equal(er.rubsOf(b, 'bram')[0].left, 1);
  assert.equal(er.rub(b.ctx, bram, hound), 'tech');
  assert.deepEqual(er.rubsOf(b, 'bram').map((x) => [x.cmd, x.left]), [['attack', 1], ['tech', 2]]);
  act(b, 'bram', { type: 'defend' });
  assert.deepEqual(er.rubsOf(b, 'bram').map((x) => [x.cmd, x.left]), [['tech', 1]], 'Attack back after its two turns');
  // Defend: the ink slides off (a Defend holds until the member's next turn starts)
  bram.defending = true; bram.cover = null;
  const slides = b.state.erasure.stats.slides;
  assert.equal(er.rub(b.ctx, bram, hound), null);
  assert.equal(b.state.erasure.stats.slides, slides + 1);
  assert.deepEqual(er.rubsOf(b, 'bram').map((x) => [x.cmd, x.left]), [['tech', 1]], 'nothing rubbed');
  // the hero is never rubbed
  act(b, 'hero', { type: 'attack', target: hound.uid });
  assert.equal(er.rub(b.ctx, hero, hound), null);
  assert.equal(er.rubsOf(b, 'hero').length, 0);
  assert.ok(b.state.erasure.heroNoted);
  // at most two: a third replaces the oldest
  const m = b.unit('mira');
  act(b, 'mira', { type: 'attack', target: hound.uid });
  er.rub(b.ctx, m, hound);
  act(b, 'mira', { type: 'skill', skill: 'ember', target: hound.uid });
  er.rub(b.ctx, m, hound);
  act(b, 'mira', { type: 'item', item: 'hi_potion', target: 'mira' });
  er.rub(b.ctx, m, hound);
  assert.deepEqual(er.rubsOf(b, 'mira').map((x) => x.cmd), ['magic', 'item']);
  // no foe is ever rubbed
  assert.equal(er.rub(b.ctx, hound, hound), null);
  assert.equal(er.unwrite(b.ctx, hound, hound), false);
  assert.equal(er.unwrite(b.ctx, hero, hound), false, 'never Unwritten');
});

test('an erasing move rubs through the bridge; a plain move does not; the act rate holds (nothing slows the foe)', () => {
  const b = fight(['index_hound'], { rng: makeRng(5) });
  sturdy(b);
  const seen = until(b, (evs) => evs.some((e) => e.type === 'rub'), 400, (u, bb) => ({ type: 'attack', target: foes(bb)[0].uid }));
  const rubEv = seen.find((e) => e.type === 'rub');
  const src = [...seen].reverse().find((e) => e.type === 'action_start' && e.actor.startsWith('e'));
  assert.equal(src.action.skill, 'hound_fetch');
  assert.ok(['mira', 'bram'].includes(rubEv.target));
  assert.equal(rubEv.command, 'attack');
  assert.ok(!seen.some((e) => e.type === 'delay' && e.target.startsWith('e')), 'no foe is pushed by its own rule');
});

test('Read Aloud: opens from a rubbed Magic row (only it lit), targets Mira herself, every rub returns, the member comes sooner', () => {
  const b = fight(['margin_imp', 'margin_imp']);
  sturdy(b);
  const imp = foes(b)[0], m = b.unit('mira'), bram = b.unit('bram');
  act(b, 'mira', { type: 'skill', skill: 'ember', target: imp.uid });
  er.rub(b.ctx, m, imp);
  const magic = row(b, 'mira', 'magic');
  assert.equal(magic.enabled, true, 'the rubbed Magic row still opens');
  assert.ok(magic.rubbed);
  for (const e of magic.list) assert.equal(e.enabled, e.skill === 'read_aloud', `${e.skill}`);
  const t = b.targets(m, { type: 'skill', skill: 'read_aloud' });
  assert.ok(t.ids.includes('mira') && t.ids.includes('hero') && t.ids.includes('bram'), 'any member, Mira herself included');
  // with the seam in rules.js the rubbed Ember is refused; the policies keep to commandsOf() either way
  turnTo(b, 'mira');
  const evs = b.perform({ type: 'skill', skill: 'read_aloud', target: 'mira' });
  assert.ok(evs.some((e) => e.type === 'read' && e.target === 'mira'));
  assert.ok(evs.some((e) => e.type === 'rub_end' && e.target === 'mira' && e.reason === 'read'));
  assert.equal(er.rubsOf(b, 'mira').length, 0);
  assert.equal(er.lastOf(b, 'mira'), 'magic');
  // on an ally: rubs return and the ally acts sooner (the clamped push)
  act(b, 'bram', { type: 'attack', target: imp.uid });
  er.rub(b.ctx, bram, imp);
  turnTo(b, 'mira');
  bram.next = b.state.now + 200;
  const was = bram.next;
  b.perform({ type: 'skill', skill: 'read_aloud', target: 'bram' });
  assert.equal(er.rubsOf(b, 'bram').length, 0);
  assert.ok(bram.next < was && bram.next >= b.state.now, 'sooner, never before now');
  // Read Aloud is never rubbed out by name: Mira's magic rub keeps it
  assert.ok(!er.RUBBABLE.includes('read_aloud'));
});

test('Unwrite: pinned (never the hero), held for Mira, Read Aloud breaks it (owner a full turn back); landed, Unwritten and its three ends', () => {
  const b = fight(['unnamed_sentry'], { zone: 'ep8_library_f2', encounter: 'unnamed_sentry', boss: true, loadout: 'ep8_library_f2' });
  sturdy(b);
  const s = foes(b)[0];
  s.shields = 99;
  const m = b.unit('mira'), bram = b.unit('bram'), hero = b.unit('hero');
  assert.equal(er.pin(b.ctx, s, hero), false, 'never the hero');
  // the pin is held behind Mira's next turn
  m.next = b.state.now + 300; s.next = b.state.now + 100;
  assert.ok(er.pin(b.ctx, s, bram));
  assert.ok(s.next > m.next, 'holdForMira');
  const p = er.pinOf(b);
  assert.equal(p.target, 'bram');
  assert.ok(b.state.erasure.pin);
  const sNext = s.next;
  const evs = act(b, 'mira', { type: 'skill', skill: 'read_aloud', target: 'bram' });
  assert.ok(evs.some((e) => e.type === 'unwrite_broken' && e.reason === 'read'));
  assert.ok(evs.some((e) => e.type === 'message' && /reads Bram's name aloud\. It stays\./.test(e.text)));
  assert.ok(s.next > sNext, 'thrown back');
  assert.equal(er.pinOf(b), null);
  // landed: Unwritten (every row but Defend), x1.8 damage, pushed; ends by Read, by turns, by a Break
  assert.ok(er.pin(b.ctx, s, bram));
  const defBefore = b.ctx.eff(bram, 'def');
  assert.ok(er.land(b.ctx, s));
  assert.ok(er.isUnwritten(b, 'bram'));
  for (const c of cmdsOf(b, 'bram')) assert.equal(c.enabled, c.id === 'defend', `${c.id}`);
  const k = DEF_K / (DEF_K + b.ctx.eff(bram, 'def')) / (DEF_K / (DEF_K + defBefore));
  assert.ok(Math.abs(k - er.ERASURE_TUNE.unwrittenMult) < 0.02, `damage taken x${k.toFixed(2)}`);
  act(b, 'mira', { type: 'skill', skill: 'read_aloud', target: 'bram' });
  assert.ok(!er.isUnwritten(b, 'bram'));
  assert.ok(b.state.erasure.stats.back.read >= 1);
  er.unwrite(b.ctx, bram, s);
  act(b, 'bram', { type: 'defend' });
  act(b, 'bram', { type: 'defend' });
  assert.ok(!er.isUnwritten(b, 'bram'), 'two turns');
  assert.ok(b.state.erasure.stats.back.turns >= 1);
  er.unwrite(b.ctx, bram, s);
  er.onSourceBroken(b.ctx, s);
  assert.ok(!er.isUnwritten(b, 'bram') && b.state.erasure.stats.back.break >= 1, 'a Break of its owner');
  // Mira Unwritten: Read Aloud too is out
  er.unwrite(b.ctx, m, s);
  assert.equal(row(b, 'mira', 'magic').enabled, false);
});

test('Fresh Ink: every ally\'s counts fall by one, an unwriting too', () => {
  const b = fight(['index_hound']);
  sturdy(b);
  const h = foes(b)[0], bram = b.unit('bram'), m = b.unit('mira');
  act(b, 'bram', { type: 'attack', target: h.uid });
  er.rub(b.ctx, bram, h);
  er.unwrite(b.ctx, m, h);
  act(b, 'hero', { type: 'item', item: 'fresh_ink', target: 'hero' });
  assert.equal(er.rubsOf(b, 'bram')[0].left, 1);
  assert.equal(b.state.erasure.unwritten.mira.left, 1);
  assert.ok(CONSUMABLES.fresh_ink.battle);
});

test('the Eraser: locks at 70% and 26%, the ward (12%, floor 32%, Grief capped at 70%, Change stands in), the Keeper (+30 Fury, Broken), four looks', () => {
  const b = fight(['eraser'], { zone: 'ep8_last_word', encounter: 'eraser', boss: true, loadout: 'ep8_last_word', level: 33 });
  const e = foes(b)[0];
  const looks = b.startEvents.filter((x) => x.type === 'phase').map((x) => x.sprite);
  assert.deepEqual(looks, ['eraser']);
  for (const u of b.living('party')) u.hp = u.maxHp = 99999;
  const hit = (n) => b.ctx.damage(e, n, b.unit('hero'), {});
  hit(e.maxHp);
  assert.equal(e.hp, Math.floor(e.maxHp * 0.7), 'the 70% lock');
  assert.equal(e.ai.phase, 1);
  assert.ok(e.ai.ward);
  const grief = foes(b).find((u) => u.id === 'truth_grief'), change = foes(b).find((u) => u.id === 'truth_change');
  assert.ok(grief && change);
  assert.equal(e.coveredBy, change.uid, 'Change stands in');
  assert.equal(SCRIPTS.eraser.damageTakenMult(b.ctx, e), 0.12);
  hit(e.maxHp);
  assert.equal(e.hp, Math.floor(e.maxHp * 0.32), 'the ward floor');
  // Grief weeps the Eraser back up, never above the 70% lock
  e.hp = Math.floor(e.maxHp * 0.69);
  SCRIPTS.rejected_truth.afterTurn(b.ctx, grief, ENEMIES.truth_grief);
  assert.equal(e.hp, Math.floor(e.maxHp * 0.7));
  const fury = b.unit('hero').fury;
  b.ctx.kill(grief, 'damage');
  assert.ok(e.ai.ward);
  b.ctx.kill(change, 'damage');
  assert.ok(!e.ai.ward);
  assert.equal(e.ai.phase, 2);
  assert.ok(e.broken, 'Broken one turn');
  assert.equal(b.unit('hero').fury, Math.min(100, fury + 30));
  e.broken = false;
  hit(e.maxHp);
  assert.equal(e.hp, Math.floor(e.maxHp * 0.26), 'the 26% lock');
  assert.equal(e.ai.phase, 3);
  assert.equal(e.charging && e.charging.skill, 'last_silence', 'the first Last Silence gathers as the phase opens');
  // every phase forwards its look (enterPhase trap)
  assert.deepEqual(E8.enemies.ERASER_LOOKS, ['eraser', 'eraser_truths', 'eraser_remembers', 'eraser_silence']);
  for (const k of Object.keys(E8.enemies.HUD_ROWS)) assert.ok(ENEMIES[k] && E8.enemies.HUD_ROWS[k].looks.length, k);
  assert.equal(E8.enemies.HUD_ROWS.eraser.anchor, 'hood');
  assert.deepEqual(E8.enemies.HUD_ROWS.eraser.looks, E8.enemies.ERASER_LOOKS);
});

test('the Last Silence: held for the hero; Answer breaks it (a full turn back, Broken); a Break cancels it; one telegraph at a time; no Episode 4 flag', () => {
  for (const k of ['answerable', 'decree', 'telegraphSfx']) {
    assert.ok(!SKILLS.last_silence[k], `last_silence has no ${k}`);
    assert.ok(!SKILLS.unwrite[k], `unwrite has no ${k}`);
  }
  const b = fight(['eraser'], { zone: 'ep8_last_word', encounter: 'eraser', boss: true, loadout: 'ep8_last_word', level: 33, rng: makeRng(4) });
  sturdy(b);
  const e = foes(b)[0];
  e.ai.phase = 3; e.ai.ward = false;
  const hero = b.unit('hero');
  hero.next = b.state.now + 400; e.next = b.state.now + 10;
  b.ctx.planCharge(e, 'last_silence', null);
  er.holdCharges(b.ctx);
  assert.ok(e.next > hero.next, 'it waits for the hero');
  // nothing is pinned while it charges
  e.ai.pinAt = 0;
  SCRIPTS.eraser.afterTurn(b.ctx, e, ENEMIES.eraser);
  assert.equal(er.pinOf(b), null, 'one telegraph at a time');
  const was = e.next;
  const evs = act(b, 'hero', { type: 'skill', skill: 'answer', target: e.uid });
  assert.ok(evs.some((x) => x.type === 'silence_broken' && x.reason === 'answer'));
  assert.ok(evs.some((x) => x.type === 'telegraph_cancel' && x.reason === 'answered'), "never Episode 4's 'answer' reason");
  assert.ok(!evs.some((x) => x.type === 'answer'), "Episode 4's answerHook never runs on the Eraser");
  assert.ok(e.broken && e.next > was, 'Broken and thrown back');
  assert.equal(e.charging, null);
  // a Break cancels it (the charge rule)
  e.broken = false;
  b.ctx.planCharge(e, 'last_silence', null);
  const ev2 = [];
  b.ctx.breakUnit(e);
  assert.equal(e.charging, null);
  void ev2;
  // the signature rows and Mira's tips: each lever exists in the data
  const list = [];
  E8.skills.registerSignatures(list); E8.skills.registerSignatures(list);
  assert.deepEqual(list, E8.skills.EP8_SIGNATURE_TECHS);
  assert.ok(SKILLS.unwrite.unwrite && SKILLS.last_silence.last_silence);
  assert.ok(SKILLS.read_aloud.effects.some((x) => x.erasure === 'read'));
  assert.ok(list.some((t) => t.unit === 'mira' && t.flag === 'unwrite' && t.skill === 'read_aloud'));
  assert.ok(list.some((t) => t.unit === 'hero' && t.flag === 'last_silence' && t.skill === 'answer' && t.usable));
});

test('Auto: careful play reads a pin back and answers the Silence; reckless and attack-only never do; attack-only Defends when Attack is rubbed', () => {
  const b = fight(['unnamed_sentry'], { zone: 'ep8_library_f2', encounter: 'unnamed_sentry', boss: true, loadout: 'ep8_library_f2' });
  sturdy(b);
  const s = foes(b)[0];
  s.shields = 99;
  er.pin(b.ctx, s, b.unit('bram'));
  turnTo(b, 'mira');
  assert.deepEqual(partyAction(b, 'competent'), { type: 'skill', skill: 'read_aloud', target: 'bram' });
  const rk = partyAction(b, 'reckless');
  assert.ok(!(rk.type === 'skill' && rk.skill === 'read_aloud'), 'reckless never reads');
  assert.equal(partyAction(b, 'naive').type, 'attack');
  turnTo(b, 'bram');
  b.perform({ type: 'attack', target: s.uid });
  er.rub(b.ctx, b.unit('bram'), s);
  turnTo(b, 'bram');
  assert.deepEqual(partyAction(b, 'naive'), { type: 'defend' }, 'attack-only: Defend when Attack is rubbed out');
  assert.ok(PARTY_POLICIES.naive.ep8Erasure);
  const c = partyAction(b, 'competent');
  assert.ok(E8.ai.legal(b, b.unit('bram'), c), 'careful play keeps to the legal rows');
  // quiet outside Episode 8
  const o = fight0();
  turnTo(o, 'mira');
  assert.equal(E8.ai.ep8Policy(o, o.unit('mira')), null);
});

test('a full-HP party at the expected level survives any single non-telegraphed Episode 8 action (DESIGN 7)', () => {
  const entry = Object.fromEntries(progression(1).map((p) => [p.zone, p.startLevel]));
  const cases = [];
  for (const z of E8.enc.EP8_ZONE_ORDER) for (const [enc] of ZONES[z].plan) for (const id of ENCOUNTERS[enc].enemies) cases.push([id, z, ENCOUNTERS[enc].power || 1]);
  cases.push(['struck_page', 'ep8_library_f2', 1], ['truth_grief', 'ep8_last_word', 1], ['truth_change', 'ep8_last_word', 1]);
  for (const [id, zone, power] of cases) {
    const e = ENEMIES[id];
    const boost = (e.boss || e.exp === 0 ? 1 : ELITE_BASE.atk) * power;
    const moves = [...e.moves, ...((e.phases || []).flatMap((p) => p.moves || []))];
    for (const level of [entry[zone], entry[zone] - 1]) {
      for (const m of makeParty(zone, level)) {
        const s = memberStats(m);
        for (const mv of moves) {
          const sk = SKILLS[mv.skill];
          if (!sk.power || sk.telegraph) continue;
          const phys = sk.formula === 'phys';
          let max = (phys ? e.atk : e.mag) * boost * sk.power / 100 * DEF_K / (DEF_K + (phys ? s.def : s.spr)) * (1 + VARIANCE) * (sk.hits || 1);
          if (phys) max *= CRIT_MULT;
          assert.ok(Math.ceil(max) < s.maxHp, `${id} ${sk.id} can deal ${Math.ceil(max)} to ${m.id} (${s.maxHp} HP) at Lv ${level}`);
        }
      }
    }
  }
});

test('items, uniques, set, affix tier 10, rare names, loot tables, shops and the gold line', () => {
  for (const id of Object.keys(E8.items.EP8_EQUIPMENT)) assert.ok(EQUIPMENT[id] && ITEMS[id], id);
  assert.equal(Object.keys(E8.items.EP8_EQUIPMENT).length, 16);
  for (const [id, u] of Object.entries(E8.items.EP8_UNIQUES)) {
    assert.ok(UNIQUES[id], id);
    for (const k of Object.keys(u.stats)) assert.ok(['atk', 'def', 'mag', 'spr', 'spd', 'luk', 'crit', 'furyGain', 'resBlind', 'resSilence', 'resStun', 'lightDmg'].includes(k), `${id} ${k}`);
  }
  assert.ok(SETS.margin_walker);
  for (const id of Object.keys(E8.items.EP8_KEY_ITEMS)) assert.ok(KEY_ITEMS[id], id);
  for (const a of Object.values(AFFIXES)) assert.ok(a.tiers.length !== 9, 'every nine-tier affix has a tenth');
  assert.ok(Object.values(AFFIXES).some((a) => a.tiers.length === 10 && a.tiers[9][0] === 32));
  assert.ok(RARE_NAME_EXT.some(([l, w]) => l === 32 && w.includes('Firstwritten')));
  for (const z of E8.enc.EP8_ZONE_ORDER) assert.ok(ZONE_LOOT[z], z);
  assert.equal(BOSS_LOOT.eraser.unique, 'last_word_pen');
  assert.equal(BOSS_LOOT.unnamed_sentry.unique, 'blank_faceplate');
  for (const id of ['bibliotheca', 'glyphsmith', 'quinn_satchel']) {
    assert.ok(SHOPS[id], id);
    assert.equal(SHOPS[id].stock.length, E8.shops.EP8_SHOPS[id].stock.length, `${id}: every stocked item exists`);
  }
  assert.deepEqual(checkEconomy8(), []);
  const e = economy8({ share: 1 });
  assert.ok(e.afterTown >= 300 && e.afterF3buy >= 300);
  const a = arrival();
  assert.ok(a.realBare > a.quickStart, 'a real save is richer than the quick start');
  assert.ok(eraserMargin(1, { elites: true }).margin > 0);
  assert.ok(LOADOUTS.ep8_stair && LOADOUTS.ep8_stair.mira.equip.charm === 'stillheart_shard' && LOADOUTS.ep8_stair.hero.equip.charm === 'open_gate');
});

test('pure modules: erasure.js never draws from ctx.R; LF endings and no em dashes in the Episode 8 battle files', () => {
  const src = fs.readFileSync(new URL('../../src/data/ep8/erasure.js', import.meta.url), 'utf8');
  assert.ok(!/\bR\(\)|ctx\.R\b|Math\.random/.test(src.replace(/^\s*\/\/.*$/gm, '')), 'no randomness in erasure.js');
  for (const f of ['enemies', 'encounters', 'items', 'loot', 'shops', 'skills', 'ai', 'erasure']) {
    const s = fs.readFileSync(new URL(`../../src/data/ep8/${f}.js`, import.meta.url), 'utf8');
    assert.ok(!s.includes(String.fromCharCode(0x2014)), `${f}: em dash`);
    assert.ok(!s.includes('\r'), `${f}: CR`);
  }
  for (const f of ['../../tools/sim/ep8.mjs', './ep8_battle.test.mjs', './ep8_sim.test.mjs']) {
    const s = fs.readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.ok(!s.includes(String.fromCharCode(0x2014)) && !s.includes('\r'), f);
  }
});
