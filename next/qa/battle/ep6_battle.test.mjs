// Episode 6 combat (E6-battle; docs/EPISODE6_PLAN.md 6 and 7): the pack's battle data registers without touching Episodes 1 to 5,
// the Gale on rules.js RULE_EXT (the Gust every 5 actions, Aloft foes riding it, everyone else blown back unless Braced, Anchor
// catching it), the negative-push check, pinned moves (the Rewrite, Full Blast) and holdForBram, Anchor, the Ballast Stone, Turn
// the Sky with no sky, the Gale Engine and the Storm Scribe, Auto, items, loot and shops. Balance targets: ep6_sim.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { battle, untilTurn, midRng, ofType, playOut } from './_helpers.mjs';
import { makeRng, RULE_EXT } from '../../src/battle/rules.js';
import { SCRIPTS, POLICY_EXT } from '../../src/battle/ai.js';
import { baseDelay } from '../../src/battle/ctb.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { SKILLS, CHARACTER_SKILLS, STATUSES } from '../../src/data/skills.js';
import { ITEMS, EQUIPMENT, UNIQUES, SETS, AFFIXES, KEY_ITEMS, CONSUMABLES } from '../../src/data/items.js';
import { ZONES, ENCOUNTERS, ZONE_ORDER, EP2_ZONE_ORDER, EP3_ZONE_ORDER } from '../../src/data/encounters.js';
import { SHOPS } from '../../src/data/shops.js';
import { ZONE_LOOT, BOSS_LOOT } from '../../src/data/loot-tables.js';
import { RARE_NAME_EXT } from '../../src/battle/loot.js';

const { makeParty, runBattle } = await import('../../tools/sim/simulate.mjs');
const ep5 = await import('../../tools/sim/ep5.mjs');
// Snapshots after the ep4 and ep5 packs and before ep6 (ep6's register() calls must only add).
ep5.registerData();
const before = {
  enemies: new Set(Object.keys(ENEMIES)), skills: new Set(Object.keys(SKILLS)), items: new Set(Object.keys(ITEMS)),
  zones: Object.keys(ZONES).slice(), orders: JSON.stringify([ZONE_ORDER, EP2_ZONE_ORDER, EP3_ZONE_ORDER]),
  oracle: JSON.stringify(ENEMIES.oracle), turnSky: JSON.stringify(SKILLS.turn_sky), shops: Object.keys(SHOPS).length,
  affixT7: Object.values(AFFIXES).filter((a) => a.tiers.length === 7).length, bram: CHARACTER_SKILLS.bram.slice(),
};
// Battles traced before Episode 6 registers: they must replay identically after (no wind foe, no Gale).
const ep5Trace = JSON.stringify(runBattle({ zone: 'ep5_lab_oracle', level: 24, encounter: 'oracle', seed: 3, trace: true }));
const ep4Trace = JSON.stringify(runBattle({ zone: 'ep4_keep_crown', level: 20, encounter: 'paper_regent', seed: 3, trace: true }));

const { registerData, LV28_EXP } = await import('../../tools/sim/ep6.mjs');
registerData();
const gale = await import('../../src/data/ep6/gale.js');
const E6 = { enemies: await import('../../src/data/ep6/enemies.js'), enc: await import('../../src/data/ep6/encounters.js'),
  skills: await import('../../src/data/ep6/skills.js'), items: await import('../../src/data/ep6/items.js'),
  loot: await import('../../src/data/ep6/loot.js'), shops: await import('../../src/data/ep6/shops.js'), ai: await import('../../src/data/ep6/ai.js') };

const FLAGS = ['bram_memory_3', 'hero_signed', 'sky_learned', 'anchor_learned'];
const foes = (b) => b.units().filter((u) => u.side === 'enemy');
let captured = null;
const CAPTURE = { id: 'ep6_test_capture', start(ctx) { captured = ctx; } };
/** A battle as the game builds it, and its rule context (for pushes and damage the test sets up). */
function fight(enemies, { zone = 'ep6_obs_f1', encounter = null, level = 26, loadout = 'ep6_obs_f2', rng = midRng, flags = FLAGS, inv = {}, boss = false } = {}) {
  RULE_EXT.push(CAPTURE);
  try {
    const b = battle(enemies, { rng, party: makeParty(loadout, level),
      options: { zone, encounter, boss, flags, inventory: { hi_potion: 4, ballast_stone: 3, ...inv } } });
    b.begin();
    b.ctx = captured;
    return b;
  } finally { RULE_EXT.splice(RULE_EXT.indexOf(CAPTURE), 1); }
}
const sturdy = (b) => { for (const u of b.living('party')) u.hp = u.maxHp = 99999; for (const u of foes(b)) { u.hp = u.maxHp = Math.max(u.maxHp, 60000); } return b; };
/** Party swaps weapons (an action that neither braces nor hurts), enemies act, until `pred(events, b)` holds. */
function until(b, pred, max = 400, act = () => ({ type: 'swap' })) {
  const seen = [];
  for (let i = 0; i < max && !b.isOver(); i++) {
    const u = b.current();
    const evs = u.side === 'party' ? b.perform(act(u, b)) : b.runEnemyTurn();
    seen.push(...evs);
    if (pred(evs, b)) return seen;
  }
  throw new Error('condition never met');
}
const base = (b, u) => baseDelay(b.ctx.eff(u, 'spd'));
const pushOf = (evs, uid) => (ofType(evs, 'gust')[0] || { pushed: [] }).pushed.find((p) => p.target === uid) || null;

test('Episode 6 ids are registered, unlisted until the maps exist, and Episodes 1 to 5 are untouched', () => {
  for (const id of [...E6.enemies.EP6_FOES, ...E6.enemies.EP6_BOSSES, ...E6.enemies.EP6_ADDS]) {
    assert.ok(ENEMIES[id], id);
    assert.ok(['aloft', 'ground'].includes(ENEMIES[id].wind), `${id} has a wind`);
  }
  assert.equal(E6.enemies.EP6_FOES.length, 7);
  for (const id of [...E6.enc.EP6_GROUP_IDS, ...E6.enc.EP6_BOSS_IDS]) assert.ok(ENCOUNTERS[id], id);
  assert.equal(E6.enc.EP6_GROUP_IDS.length, 13);
  assert.equal(E6.enc.EP6_MAPS_LISTED, true, 'the Observatory maps exist: the zones are listed (E6-integrate)');
  for (const z of E6.enc.EP6_ZONE_ORDER) {
    assert.ok(ZONES[z], z); assert.equal(ZONES[z].episode, 6);
    assert.ok(Object.keys(ZONES).includes(z), `${z} is listed in Object.keys(ZONES) once EP6_MAPS_LISTED`);
  }
  assert.deepEqual(E6.enc.GALE_START, { e6a_first: { gustIn: 3 } });
  for (const z of before.zones) assert.ok(Object.keys(ZONES).includes(z), z);
  assert.equal(JSON.stringify([ZONE_ORDER, EP2_ZONE_ORDER, EP3_ZONE_ORDER]), before.orders);
  assert.equal(JSON.stringify(ENEMIES.oracle), before.oracle);
  assert.equal(JSON.stringify(SKILLS.turn_sky), before.turnSky);
  for (const id of before.enemies) assert.ok(ENEMIES[id]);
  for (const id of before.skills) assert.ok(SKILLS[id]);
  for (const id of before.items) assert.ok(ITEMS[id]);
  assert.deepEqual(CHARACTER_SKILLS.bram.slice(0, before.bram.length), before.bram);
  assert.ok(CHARACTER_SKILLS.bram.includes('anchor_line'));
  // idempotent: a second registration adds nothing
  const n = [Object.keys(ENEMIES).length, Object.keys(SKILLS).length, Object.keys(ITEMS).length, RULE_EXT.length, POLICY_EXT.length];
  registerData();
  for (const m of Object.values(E6)) if (typeof m.register === 'function') m.register();
  gale.register();
  assert.deepEqual([Object.keys(ENEMIES).length, Object.keys(SKILLS).length, Object.keys(ITEMS).length, RULE_EXT.length, POLICY_EXT.length], n);
  assert.equal(RULE_EXT.filter((h) => h === gale.GALE_RULE).length, 1);
  assert.equal(RULE_EXT.filter((h) => h === gale.SKILL_GATE).length, 1);
  for (const id of Object.keys(E6.ai.EP6_SCRIPTS)) assert.equal(SCRIPTS[id], E6.ai.EP6_SCRIPTS[id], id);
});

test('battles with no wind foe have no Gale: an Episode 5 and an Episode 4 boss replay bit for bit', () => {
  assert.equal(JSON.stringify(runBattle({ zone: 'ep5_lab_oracle', level: 24, encounter: 'oracle', seed: 3, trace: true })), ep5Trace);
  assert.equal(JSON.stringify(runBattle({ zone: 'ep4_keep_crown', level: 20, encounter: 'paper_regent', seed: 3, trace: true })), ep4Trace);
  const b = battle(['briar_wolf', 'ink_slime'], { seed: 2, level: 5 });
  const evs = playOut(b);
  assert.equal(b.state.gale, undefined);
  assert.equal(b.state.gated, undefined, 'nothing to gate: no new state');
  assert.equal(evs.filter((e) => /^gale|^gust|^aloft|^anchored|^braced|^rewrite/.test(e.type)).length, 0);
});

test('the negative-push check: delayUnit(u, -f) can put a turn before now; the Gale clamps every ride and catch', () => {
  const b = fight(['gale_sprite', 'squall_wolf']);
  sturdy(b);
  untilTurn(b, 'hero');
  const now = b.state.now;
  const tight = b.units().filter((u) => u.alive && u.next - now < 0.35 * base(b, u));
  assert.ok(tight.length, 'some unit is less than 0.35 of a turn from acting');
  // the raw call: the unit's next turn lands in the past (CTB's invariant broken), so the Gale never makes it unclamped
  const u = tight[0], keep = u.next;
  b.ctx.delayUnit(u, -0.35, 'probe');
  assert.ok(u.next < now, `raw delayUnit: ${u.uid} next ${u.next} < now ${now}`);
  u.next = keep;
  // gale.js push(): clamped to the room the unit has
  for (const x of b.units().filter((y) => y.alive)) {
    const was = x.next;
    const f = gale.push(b.ctx, x, -0.35, 'probe');
    assert.ok(x.next >= now, `${x.uid} stays at or after now`);
    assert.ok(f >= -0.35 && f <= 0);
    assert.ok(x.next <= was);
  }
  // and the order of the rest is kept: a unit with room moves the whole 0.35
  assert.equal(gale.RIDE, true, 'the plan fallback (no rides) is not in use');
});

test('the Gale starts in every wind battle (Gust in 5; e6a_first in 3) and a Gust pushes the right units by the right amounts', () => {
  const b = fight(['gale_sprite', 'squall_wolf']);
  sturdy(b);
  const S = b.state.gale;
  assert.ok(S);
  assert.equal(S.every, gale.GUST_EVERY);
  assert.ok(b.startEvents.some((e) => e.type === 'gale' && e.reason === 'start' && e.gustIn === 5));
  assert.equal(ofType(b.startEvents, 'aloft').length, 1, 'one Aloft badge (the sprite)');
  const first = fight(['storm_harrier', 'storm_harrier'], { zone: 'ep6_airstair', encounter: 'e6a_first', loadout: 'ep6_airstair', level: 25, flags: [] });
  assert.equal(first.state.gale.gustIn, 3);
  // five actions, then the Gust
  let actions = 0;
  const evs = until(b, (e) => { actions++; return e.some((x) => x.type === 'gust'); });
  assert.equal(actions, 5);
  assert.ok(evs.some((e) => e.type === 'message' && e.text === 'The wind gusts.' && e.sfx === 'gale_gust'));
  const g = ofType(evs, 'gust').pop();
  const [sprite, wolf] = foes(b);
  for (const m of b.living('party')) {
    const p = g.pushed.find((x) => x.target === m.uid);
    assert.ok(p, `${m.id} blown back`);
    assert.equal(p.amount, gale.GUST_PUSH);
    assert.equal(p.ticks, Math.round(base(b, m) * gale.GUST_PUSH));
  }
  assert.equal(g.pushed.find((x) => x.target === wolf.uid).amount, gale.GUST_PUSH, 'the grounded wolf is blown back');
  const sp = g.pushed.find((x) => x.target === sprite.uid);
  assert.ok(!sp || (sp.amount < 0 && sp.amount >= -gale.GUST_PUSH), 'the Aloft sprite rides it (sooner, clamped)');
  assert.equal(b.state.gale.gustIn, 5);
  // a Broken Aloft foe is Grounded: blown back like anyone
  sprite.broken = true;
  b.state.gale.gustIn = 1;
  const e2 = until(b, (e) => e.some((x) => x.type === 'gust'));
  assert.ok(e2.some((e) => e.type === 'aloft' && e.target === sprite.uid && e.on === false) || b.state.gale.aloft[sprite.uid] === false);
});

test('Defend and a Ballast Stone brace (not moved); the stone braces the member who uses it', () => {
  const b = fight(['gale_sprite', 'squall_wolf']);
  sturdy(b);
  untilTurn(b, 'mira');
  b.state.gale.gustIn = 1;
  let evs = b.perform({ type: 'defend' });
  assert.ok(ofType(evs, 'gust').length);
  assert.equal(pushOf(evs, 'mira'), null, 'Mira defended: not blown back');
  assert.ok(pushOf(evs, 'hero'));
  untilTurn(b, 'hero');
  b.state.gale.gustIn = 2;
  evs = b.perform({ type: 'item', item: 'ballast_stone', target: 'mira' });
  assert.ok(evs.some((e) => e.type === 'braced' && e.target === 'hero' && e.on && e.by === 'ballast'));
  assert.ok(evs.some((e) => e.type === 'message' && e.kind === 'ballast'));
  assert.equal(b.state.inventory.ballast_stone, 2);
  evs = until(b, (e) => e.some((x) => x.type === 'gust'));
  assert.equal(pushOf(evs, 'hero'), null, 'the hero holds the stone: not blown back');
  assert.deepEqual(b.state.gale.ballast, {}, 'the brace is spent by the Gust');
});

test('Anchor: target none, the party catches the Gust (each comes round sooner), then it ends', () => {
  assert.equal(SKILLS.anchor_line.target, 'none');
  assert.equal(SKILLS.anchor_line.mp, 14);
  assert.equal(SKILLS.anchor_line.rank, 80);
  assert.equal(SKILLS.anchor_line.name, 'Anchor');
  assert.deepEqual(SKILLS.anchor_line.learn, { flag: 'anchor_learned' });
  assert.ok(SKILLS.anchor_line.help.length <= 40);
  const b = fight(['gale_sprite', 'squall_wolf']);
  sturdy(b);
  untilTurn(b, 'bram');
  assert.ok(b.unit('bram').skills.includes('anchor_line'));
  b.state.gale.gustIn = 1;
  const mp = b.unit('bram').mp;
  const evs = b.perform({ type: 'skill', skill: 'anchor_line' });
  assert.equal(b.unit('bram').mp, mp - 14);
  assert.ok(evs.some((e) => e.type === 'anchored' && e.on && e.targets.length === 3));
  for (const m of ['hero', 'mira', 'bram']) {
    const p = pushOf(evs, m);
    assert.ok(!p || p.amount < 0, `${m} catches the wind`);
  }
  assert.ok(evs.some((e) => e.type === 'anchored' && !e.on), 'Anchored through one Gust only');
  assert.equal(b.state.gale.anchored, false);
  // learned by flag only
  const nb = fight(['gale_sprite'], { flags: ['sky_learned'] });
  assert.ok(!nb.unit('bram').skills.includes('anchor_line'));
});

/** A Scribe fight walked to its first pinned Rewrite. */
function pinned(seed = 3) {
  const b = fight(['scribe'], { zone: 'ep6_obs_eyrie', encounter: 'scribe', boss: true, loadout: 'ep6_obs_eyrie', level: 27, rng: makeRng(seed) });
  sturdy(b);
  for (const f of foes(b)) f.shields = 99;
  until(b, (evs) => evs.some((e) => e.type === 'rewrite' && !e.moved));
  return b;
}

test('Rewrite the Course: pinned exactly 2 actions out with a telegraph; without Anchor it lands (a full turn back, the Scribe first)', () => {
  const b = pinned();
  const S = b.state.gale;
  assert.equal(S.pinned.skill, 'rewrite_course');
  assert.ok(S.gustIn >= 2, 'never less than 2 actions out');
  assert.ok(gale.bramNext(b.ctx) <= S.gustIn, 'Bram acts before it lands (holdForBram)');
  const sc = foes(b)[0];
  const evs = until(b, (e) => e.some((x) => x.type === 'rewrite_land' || x.type === 'rewrite_broken'));
  assert.ok(evs.some((e) => e.type === 'rewrite_land' && e.source === sc.uid));
  const land = evs.findIndex((e) => e.type === 'rewrite_land');
  const after = evs.slice(land);
  for (const m of ['hero', 'mira', 'bram']) {
    const d = after.find((e) => e.type === 'delay' && e.target === m && e.reason === 'rewrite_course');
    assert.ok(d, `${m} goes back`);
    assert.equal(d.amount, Math.round(base(b, b.unit(m)) * gale.PIN_PUSH));
  }
  assert.ok(after.some((e) => e.type === 'message' && e.kind === 'rewrite_land'));
  assert.equal(b.current().uid, sc.uid, 'the Scribe takes the next turn at once');
});

test('Rewrite the Course fails with Anchor ("The course holds."): the Scribe is blown back a full turn', () => {
  const b = pinned();
  const sc = foes(b)[0];
  untilTurn(b, 'bram');
  assert.ok(b.state.gale.pinned, "still pinned on Bram's turn");
  const evs = [...b.perform({ type: 'skill', skill: 'anchor_line' })];
  if (!evs.some((e) => e.type === 'rewrite_broken')) evs.push(...until(b, (e) => e.some((x) => x.type === 'rewrite_broken' || x.type === 'rewrite_land')));
  assert.ok(evs.some((e) => e.type === 'rewrite_broken' && e.reason === 'anchor' && e.source === sc.uid));
  assert.ok(evs.some((e) => e.type === 'message' && e.text === 'The course holds.' && e.sfx === 'rewrite_break'));
  assert.ok(!evs.some((e) => e.type === 'rewrite_land'));
  const d = evs.find((e) => e.type === 'delay' && e.target === sc.uid && e.reason === 'anchor');
  assert.equal(d.amount, Math.round(base(b, sc) * gale.PIN_PUSH));
  assert.equal(b.state.gale.held, 1);
});

test('holdForBram: a Rewrite never lands before Bram has had a turn after the pin', () => {
  let b = null;
  for (let seed = 1; seed < 30 && !b; seed++) { const x = pinned(seed); if (x.current().id !== 'bram') b = x; }
  assert.ok(b, 'a pin with someone else on turn');
  const S = b.state.gale;
  const bram = b.unit('bram');
  b.ctx.delayUnit(bram, 3, 'test');   // Bram far down the timeline
  const n = gale.bramNext(b.ctx);
  assert.ok(n > S.gustIn);
  const evs = until(b, () => true);   // one action
  assert.ok(evs.some((e) => e.type === 'rewrite' && e.moved), 'the marker moves with Bram');
  assert.ok(S.gustIn >= gale.bramNext(b.ctx));
  untilTurn(b, 'bram');
  assert.ok(S.pinned, 'still pinned when Bram finally acts');
  assert.ok(E6.ai.bramAnswers(b), 'the scene may say "Bram can anchor."');
});

test('Answer and Turn the Sky do nothing to a Rewrite and say why; a Break cancels it', () => {
  let b = pinned();
  const sc = foes(b)[0];
  untilTurn(b, 'hero');
  assert.ok(b.state.gale.pinned);
  const e1 = b.perform({ type: 'skill', skill: 'answer', target: sc.uid });
  assert.ok(e1.some((e) => e.type === 'message' && e.text === 'A course is not a decree.'));
  assert.ok(b.state.gale.pinned || e1.some((e) => e.type === 'rewrite_land'), 'the rewrite stands');
  // Turn the Sky is gated out of the list in a battle with no sky; were it cast anyway, it says why and changes nothing
  b = pinned();
  untilTurn(b, 'mira');
  assert.ok(!b.unit('mira').skills.includes('turn_sky'));
  assert.equal(b.perform({ type: 'skill', skill: 'turn_sky' })[0].type, 'invalid');
  b.unit('mira').skills.push('turn_sky');
  const e2 = b.perform({ type: 'skill', skill: 'turn_sky' });
  assert.ok(e2.some((e) => e.type === 'message' && e.text === 'The wind is not the sky.'));
  assert.ok(!e2.some((e) => e.type === 'rewrite_broken'));
  // a Break cancels it (the charge rule)
  b = pinned();
  const s3 = foes(b)[0];
  s3.shields = 1;
  b.ctx.chipShields(s3, 1, b.unit('bram'));   // the last shield goes: Broken
  assert.ok(s3.broken);
  assert.equal(b.state.gale.pinned, null);
  assert.equal(b.state.gale.pinned, null);
});

test('Turn the Sky with no sky: disabled in that battle ("No sky to turn."); under a sky it is untouched', () => {
  // an Episode 1 to 4 revisit: Mira knows it (sky_learned), the battle has no sky
  const b = fight(['briar_wolf'], { flags: ['sky_learned'] });
  assert.equal(b.state.sky, undefined);
  assert.ok(!b.unit('mira').skills.includes('turn_sky'));
  assert.deepEqual(b.state.gated, [{ unit: 'mira', skill: 'turn_sky', reason: 'No sky to turn.' }]);
  const cmds = gale.gateCommands(b, b.unit('mira'), b.commands('mira'));
  const row = cmds.find((c) => c.id === 'tech').list.find((e) => e.skill === 'turn_sky');
  assert.deepEqual([row.enabled, row.reason], [false, 'No sky to turn.']);
  const heroCmds = b.commands('hero');
  assert.equal(gale.gateCommands(b, b.unit('hero'), heroCmds), heroCmds, 'nothing gated for the hero: the same list');
  // Anchor with no wind is gated the same way
  assert.ok(b.state.gated.every((g) => g.skill !== 'anchor_line') && !b.unit('bram').skills.includes('anchor_line'));
  assert.ok(fight(['briar_wolf']).state.gated.some((g) => g.skill === 'anchor_line' && g.reason === 'No wind to hold.'));
  // an Episode 5 battle: the sky is up, Turn the Sky stays
  const e5 = fight(['dune_stalker'], { zone: 'ep5_lab_f1', loadout: 'ep5_lab_f1', level: 23, flags: ['sky_learned'] });
  assert.ok(e5.state.sky);
  assert.ok(e5.unit('mira').skills.includes('turn_sky'));
  assert.equal(e5.state.gated, undefined);
});

test('the Gale Engine: Bellows (the Gust every 3), a Break stalls them, Full Blast pinned to the Gust, two Gale Sprites at 50%', () => {
  const b = fight(['gale_engine'], { zone: 'ep6_obs_f2', encounter: 'gale_engine', boss: true, level: 26, rng: makeRng(4) });
  sturdy(b);
  const eng = foes(b)[0];
  eng.hp = eng.maxHp = 2000;
  assert.equal(b.state.gale.every, 3);
  assert.ok(b.state.gale.gustIn <= 3);
  // Full Blast is pinned (Bram's tip: "When it winds the bellows, I anchor us.")
  const e1 = until(b, (evs) => evs.some((e) => e.type === 'rewrite' && !e.moved));
  assert.ok(e1.some((e) => e.type === 'telegraph' && e.skill === 'full_blast' && e.rewrite));
  assert.equal(b.state.gale.pinned.skill, 'full_blast');
  // a Break cancels it and stalls the bellows for 2 of its turns
  b.ctx.breakUnit(eng);
  assert.equal(b.state.gale.pinned, null);
  assert.equal(b.state.gale.every, 5);
  assert.ok(eng.ai.bellowsOff);
  until(b, () => !eng.ai.bellowsOff);
  assert.equal(b.state.gale.every, 3);
  // at 50% the vents open: two Aloft sprites that pay nothing
  b.ctx.damage(eng, eng.hp - 990, null, {});
  const sprites = foes(b).filter((f) => f.id === 'gale_sprite');
  assert.equal(sprites.length, 2);
  for (const s of sprites) { assert.equal(s.rewards.exp, 0); assert.ok(gale.isAloft(s)); }
});

test('the Storm Scribe: HP locks at 68% and 33%, the ward (20% damage, the Beacon covers), the tear (+25 Fury), the three looks', () => {
  const b = fight(['scribe'], { zone: 'ep6_obs_eyrie', encounter: 'scribe', boss: true, loadout: 'ep6_obs_eyrie', level: 27, rng: makeRng(2) });
  const sc = foes(b)[0];
  const looks = [];
  const phase = (evs) => { for (const e of evs) if (e.type === 'phase') looks.push(e.sprite); };
  phase(b.startEvents);
  assert.ok(sc.mods.some((m) => m.source === 'armor' && m.mult === 1.4), 'armored');
  const big = sc.maxHp;
  b.ctx.damage(sc, big, null, {});   // one huge hit never skips a phase
  assert.equal(sc.hp, Math.floor(big * 0.68));
  b.ctx.damage(sc, 1, null, {});
  const adds = foes(b).filter((f) => ['false_beacon', 'broken_compass'].includes(f.id));
  assert.equal(adds.length, 2);
  assert.ok(sc.ai.ward);
  b.ctx.damage(sc, big, null, {});
  assert.equal(sc.hp, Math.floor(big * 0.33), 'the ward floor');
  // the Beacon covers the Scribe on its turn
  const evs = until(b, (e) => e.some((x) => x.type === 'guard'), 400, () => ({ type: 'defend' }));
  const beacon = adds.find((a) => a.id === 'false_beacon');
  assert.ok(evs.some((e) => e.type === 'guard' && e.actor === beacon.uid && e.target === sc.uid));
  const fury = b.living('party').map((m) => m.fury);
  for (const a of adds) if (a.alive) b.ctx.damage(a, a.hp, null, {});
  assert.ok(!sc.ai.ward);
  assert.ok(sc.broken, 'the tear Breaks it');
  b.living('party').forEach((m, i) => assert.equal(m.fury, Math.min(100, fury[i] + 25)));
  assert.ok(sc.statuses.haste);
  assert.ok(!sc.mods.some((m) => m.source === 'armor'), 'the armor falls');
  assert.deepEqual(sc.weak, ['fire', 'spear', 'light']);
  for (const e of [...b.startEvents, ...evs]) if (e.type === 'phase') looks.push(e.sprite);
  assert.ok(looks.includes('scribe'));
  assert.equal(ENEMIES.scribe.phases.map((p) => p.sprite).join(','), 'scribe,scribe_ward,scribe_chart');
  assert.equal(ENCOUNTERS.scribe.startFury.flag, 'beacon_lit');
  assert.equal(ENCOUNTERS.scribe.startFury.amount, 20);
});

test('Bram\'s two tips name levers that exist: both pinned moves carry the rewrite flag', () => {
  for (const id of ['full_blast', 'rewrite_course']) assert.equal(SKILLS[id].rewrite, true, id);
  assert.ok(!SKILLS.rewrite_course.answerable && !SKILLS.full_blast.answerable);
  assert.equal(ENEMIES.gale_engine.ai, 'gale_engine');
  assert.equal(ENEMIES.scribe.ai, 'scribe');
  assert.equal(ENEMIES.gale_engine.wind, 'ground');
  assert.equal(ENEMIES.scribe.wind, 'aloft');
});

test('Auto: careful play Anchors a pinned Rewrite; reckless and naive never Anchor, brace or use a Ballast Stone; quiet outside Episode 6', () => {
  const opts = (seed) => ({ zone: 'ep6_obs_eyrie', encounter: 'scribe', boss: true, loadout: 'ep6_obs_eyrie', level: 27, rng: makeRng(seed) });
  let held = 0;
  for (let seed = 1; seed <= 4; seed++) held += playOut(fight(['scribe'], opts(seed))).filter((e) => e.type === 'rewrite_broken' && e.reason === 'anchor').length;
  assert.ok(held >= 2, `careful play held ${held} Rewrites with Anchor in four fights`);
  for (const pol of ['reckless', 'naive']) {
    const ev2 = playOut(fight(['scribe'], opts(2)), pol);
    assert.ok(!ev2.some((e) => e.type === 'anchored' && e.on), `${pol} never Anchors`);
    assert.ok(!ev2.some((e) => e.type === 'braced'), `${pol} never uses a Ballast Stone`);
  }
  const b = battle(['briar_wolf'], { seed: 1, level: 5 });
  b.begin();
  assert.equal(E6.ai.ep6Policy(b, b.living('party')[0]), null);
  assert.ok(POLICY_EXT.includes(E6.ai.ep6Policy));
});

test('items, uniques, set, affix tier 8, rare names, loot tables and shops', () => {
  assert.equal(CONSUMABLES.ballast_stone.price, 150);
  for (const id of Object.keys(E6.items.EP6_KEY_ITEMS)) assert.ok(KEY_ITEMS[id] && ITEMS[id].kind === 'key', id);
  assert.equal(Object.keys(E6.items.EP6_KEY_ITEMS).length, 9);
  for (const [id, it] of Object.entries(E6.items.EP6_EQUIPMENT)) {
    assert.ok(EQUIPMENT[id], id);
    assert.ok(it.tier === 11 ? it.ilvl === 25 : it.tier === 12 && it.ilvl === 27, `${id} tier/ilvl`);
  }
  assert.equal(Object.keys(E6.items.EP6_EQUIPMENT).length, 16);
  assert.equal(Object.keys(E6.items.EP6_UNIQUES).length, 8);
  for (const id of Object.keys(E6.items.EP6_UNIQUES)) assert.ok(UNIQUES[id] && !EQUIPMENT[id], `${id} placed, never random`);
  // every stat a unique, a set or a base names is a party stat rules.js reads (Episode 5's "evade" was not)
  const PARTY = new Set(['hp', 'mp', 'atk', 'def', 'mag', 'spr', 'spd', 'luk', 'crit', 'fireDmg', 'iceDmg', 'thunderDmg', 'lightDmg',
    'furyGain', 'lifesteal', 'healPow', 'mpCostDown']);
  const ok = (k) => PARTY.has(k) || (/^res[A-Z]/.test(k) && STATUSES[k[3].toLowerCase() + k.slice(4)]);
  for (const it of [...Object.values(E6.items.EP6_UNIQUES), ...Object.values(E6.items.EP6_EQUIPMENT)]) for (const k of Object.keys(it.stats)) assert.ok(ok(k), `${it.id}: ${k}`);
  for (const k of Object.keys(SETS.skyhands.bonus[2])) assert.ok(ok(k), k);
  assert.deepEqual(SETS.skyhands.pieces, ['skyhand_boots', 'skyhand_coat']);
  assert.equal(Object.values(AFFIXES).filter((a) => a.tiers.length === 8).length, before.affixT7);
  for (const a of Object.values(AFFIXES).filter((x) => x.tiers.length === 8)) {
    const [l, lo, hi] = a.tiers[7];
    assert.equal(l, 26); assert.ok(lo >= a.tiers[6][1] && hi >= lo);
    if (/^res[A-Z]/.test(a.stat)) assert.ok(hi <= 100);
  }
  assert.ok(RARE_NAME_EXT.some(([l, w]) => l === 26 && w.includes('Stormwrit')));
  for (const z of E6.enc.EP6_ZONE_ORDER) assert.ok(ZONE_LOOT[z], z);
  assert.equal(BOSS_LOOT.gale_engine.unique, 'bellows_heart');
  assert.equal(BOSS_LOOT.scribe.unique, 'scribe_quill');
  assert.equal(SHOPS.galewing.stock.filter((s) => s.ifFlag === 'obs_f2_done').length, 8);
  for (const s of Object.values(E6.shops.EP6_SHOPS)) for (const x of SHOPS[s.id].stock) assert.ok(ITEMS[x.item], `${s.id}: ${x.item}`);
  for (const id of ['winch', 'aeris_provisions']) assert.ok(SHOPS[id].stock.some((x) => x.item === 'ballast_stone'), id);
  assert.ok(SHOPS.aeris_provisions.stock.some((x) => x.item === 'hourglass_sand'));
  for (const id of Object.keys(E6.skills.EP6_SKILLS)) assert.ok(SKILLS[id].help.length <= 40, id);
  for (const d of Object.values(E6.enemies.EP6_ENEMIES)) for (const m of d.moves) assert.ok(SKILLS[m.skill], m.skill);
  for (const d of Object.values(E6.enemies.EP6_ENEMIES)) for (const dr of d.drops) assert.ok(ITEMS[dr.item], dr.item);
});

test('pure modules: gale.js never draws from ctx.R; LF endings and no em dashes in the Episode 6 battle files', () => {
  const src = fs.readFileSync(new URL('../../src/data/ep6/gale.js', import.meta.url), 'utf8');
  assert.ok(!/\bR\(\)|ctx\.R\b|Math\.random/.test(src.replace(/^\s*\/\/.*$/gm, '')), 'no randomness in gale.js');
  for (const f of ['enemies', 'encounters', 'items', 'loot', 'shops', 'skills', 'ai', 'gale']) {
    const s = fs.readFileSync(new URL(`../../src/data/ep6/${f}.js`, import.meta.url), 'utf8');
    assert.ok(!s.includes(String.fromCharCode(0x2014)), `${f}: em dash`);
    assert.ok(!s.includes('\r'), `${f}: CR`);
  }
  for (const f of ['../../tools/sim/ep6.mjs', './ep6_battle.test.mjs', './ep6_sim.test.mjs']) {
    const s = fs.readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.ok(!s.includes(String.fromCharCode(0x2014)) && !s.includes('\r'), f);
  }
  assert.ok(LV28_EXP === 16887);
});
