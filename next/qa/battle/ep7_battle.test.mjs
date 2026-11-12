// Episode 7 combat (E7-battle; docs/EPISODE7_PLAN.md 6 and 7): the pack's battle data registers without touching Episodes 1 to 6,
// Rime on rules.js RULE_EXT (party only, cold moves, Frozen at 3, Defend, Ember Tea), Call (sheds, hastens, breaks a pin, returns a
// Stilled ally), the pinned Farewell and Borrowed Light and holdForHero, Stilled and its three ends, the gates, the Pale Lantern and
// the White Phantom, Auto, items, loot, shops and purity. Balance targets: ep7_sim.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { battle, untilTurn, midRng, ofType, playOut } from './_helpers.mjs';
import { makeRng, RULE_EXT, memberStats, DEF_K, VARIANCE, CRIT_MULT } from '../../src/battle/rules.js';
import { SCRIPTS, POLICY_EXT } from '../../src/battle/ai.js';
import { baseDelay } from '../../src/battle/ctb.js';
import { ENEMIES, ELITE_BASE } from '../../src/data/enemies.js';
import { SKILLS, CHARACTER_SKILLS, STATUSES } from '../../src/data/skills.js';
import { ITEMS, EQUIPMENT, UNIQUES, SETS, AFFIXES, KEY_ITEMS, CONSUMABLES } from '../../src/data/items.js';
import { ZONES, ENCOUNTERS, ZONE_ORDER, EP2_ZONE_ORDER, EP3_ZONE_ORDER } from '../../src/data/encounters.js';
import { SHOPS } from '../../src/data/shops.js';
import { ZONE_LOOT, BOSS_LOOT } from '../../src/data/loot-tables.js';
import { RARE_NAME_EXT } from '../../src/battle/loot.js';

const { makeParty, runBattle } = await import('../../tools/sim/simulate.mjs');
const ep6 = await import('../../tools/sim/ep6.mjs');
// Snapshots after the ep4, ep5 and ep6 packs and before ep7 (ep7's register() calls must only add, and change nothing they read).
ep6.registerData();
const before = {
  enemies: new Set(Object.keys(ENEMIES)), skills: new Set(Object.keys(SKILLS)), items: new Set(Object.keys(ITEMS)),
  zones: Object.keys(ZONES).slice(), orders: JSON.stringify([ZONE_ORDER, EP2_ZONE_ORDER, EP3_ZONE_ORDER]),
  scribe: JSON.stringify(ENEMIES.scribe), anchor: JSON.stringify(SKILLS.anchor_line), shops: Object.keys(SHOPS).length,
  affixT8: Object.values(AFFIXES).filter((a) => a.tiers.length === 8).length, hero: CHARACTER_SKILLS.hero.slice(),
};
// Battles traced before Episode 7 registers: they must replay identically after (no cold foe, no Rime).
const ep6Trace = JSON.stringify(runBattle({ zone: 'ep6_obs_eyrie', level: 27, encounter: 'scribe', seed: 3, trace: true }));
const ep5Trace = JSON.stringify(runBattle({ zone: 'ep5_lab_oracle', level: 24, encounter: 'oracle', seed: 3, trace: true }));

const { registerData, LV31_EXP, economy7, checkEconomy7, progression } = await import('../../tools/sim/ep7.mjs');
registerData();
const rime = await import('../../src/data/ep7/rime.js');
const E7 = { enemies: await import('../../src/data/ep7/enemies.js'), enc: await import('../../src/data/ep7/encounters.js'),
  skills: await import('../../src/data/ep7/skills.js'), items: await import('../../src/data/ep7/items.js'),
  loot: await import('../../src/data/ep7/loot.js'), shops: await import('../../src/data/ep7/shops.js'), ai: await import('../../src/data/ep7/ai.js') };
const gale = await import('../../src/data/ep6/gale.js');

const FLAGS = ['bram_memory_3', 'hero_signed', 'sky_learned', 'anchor_learned', 'call_learned'];
const foes = (b) => b.units().filter((u) => u.side === 'enemy');
let captured = null;
const CAPTURE = { id: 'ep7_test_capture', start(ctx) { captured = ctx; } };
/** A battle as the game builds it, and its rule context (for pushes and damage the test sets up). */
function fight(enemies, { zone = 'ep7_vault_f1', encounter = null, level = 29, loadout = 'ep7_vault_f2', rng = midRng, flags = FLAGS, inv = {}, boss = false } = {}) {
  RULE_EXT.push(CAPTURE);
  try {
    const b = battle(enemies, { rng, party: makeParty(loadout, level),
      options: { zone, encounter, boss, flags, inventory: { hi_potion: 4, ember_tea: 3, echo_herb: 2, silver_salve: 1, ...inv } } });
    b.begin();
    b.ctx = captured;
    return b;
  } finally { RULE_EXT.splice(RULE_EXT.indexOf(CAPTURE), 1); }
}
const sturdy = (b) => { for (const u of b.living('party')) u.hp = u.maxHp = 99999; for (const u of foes(b)) { u.hp = u.maxHp = Math.max(u.maxHp, 60000); } return b; };
/** Party swaps weapons (an action that neither Defends nor hurts), enemies act, until `pred(events, b)` holds. */
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
const S = (b) => b.state.rime;
/** A boss fight walked to its first pin (sturdy, shields high so nothing Breaks it). */
function pinned(enc = 'white_phantom', seed = 3, level = 30) {
  const b = fight([enc], { zone: ENCOUNTERS[enc].zone, encounter: enc, boss: true, loadout: ENCOUNTERS[enc].zone, level, rng: makeRng(seed) });
  sturdy(b);
  for (const f of foes(b)) f.shields = 99;
  until(b, (evs) => evs.some((e) => e.type === 'farewell' && !e.moved));
  return b;
}

test('Episode 7 ids are registered, unlisted until the maps exist, and Episodes 1 to 6 are untouched', () => {
  for (const id of [...E7.enemies.EP7_FOES, ...E7.enemies.EP7_BOSSES, ...E7.enemies.EP7_ADDS]) {
    assert.ok(ENEMIES[id], id);
    assert.equal(ENEMIES[id].cold, true, `${id} is cold`);
  }
  assert.equal(E7.enemies.EP7_FOES.length, 7);
  for (const id of [...E7.enc.EP7_GROUP_IDS, ...E7.enc.EP7_BOSS_IDS]) assert.ok(ENCOUNTERS[id], id);
  assert.equal(E7.enc.EP7_GROUP_IDS.length, 12);
  assert.equal(E7.enc.EP7_MAPS_LISTED, true, 'the White Road and Vault maps exist: the zones are listed (E7 wave 7c integration)');
  for (const z of E7.enc.EP7_ZONE_ORDER) {
    assert.ok(ZONES[z], z); assert.equal(ZONES[z].episode, 7);
    assert.ok(Object.keys(ZONES).includes(z), `${z} is listed in Object.keys(ZONES) once EP7_MAPS_LISTED`);
  }
  for (const z of before.zones) assert.ok(Object.keys(ZONES).includes(z), z);
  assert.equal(JSON.stringify([ZONE_ORDER, EP2_ZONE_ORDER, EP3_ZONE_ORDER]), before.orders);
  assert.equal(JSON.stringify(ENEMIES.scribe), before.scribe);
  assert.equal(JSON.stringify(SKILLS.anchor_line), before.anchor);
  for (const id of before.enemies) assert.ok(ENEMIES[id] && !ENEMIES[id].cold, `${id} is not cold`);
  for (const id of before.skills) assert.ok(SKILLS[id]);
  for (const id of before.items) assert.ok(ITEMS[id]);
  assert.deepEqual(CHARACTER_SKILLS.hero.slice(0, before.hero.length), before.hero);
  assert.ok(CHARACTER_SKILLS.hero.includes('call_name'));
  // idempotent: a second registration adds nothing
  const n = [Object.keys(ENEMIES).length, Object.keys(SKILLS).length, Object.keys(ITEMS).length, RULE_EXT.length, POLICY_EXT.length, RARE_NAME_EXT.length];
  registerData();
  for (const m of Object.values(E7)) if (typeof m.register === 'function') m.register();
  rime.register();
  assert.deepEqual([Object.keys(ENEMIES).length, Object.keys(SKILLS).length, Object.keys(ITEMS).length, RULE_EXT.length, POLICY_EXT.length, RARE_NAME_EXT.length], n);
  assert.equal(RULE_EXT.filter((h) => h === rime.RIME_RULE).length, 1);
  assert.equal(RULE_EXT.filter((h) => h === rime.CALL_GATE).length, 1);
  assert.ok(RULE_EXT.indexOf(rime.CALL_GATE) > RULE_EXT.indexOf(gale.SKILL_GATE), 'the Call gate runs after Episode 6 gate');
  for (const id of Object.keys(E7.ai.EP7_SCRIPTS)) assert.equal(SCRIPTS[id], E7.ai.EP7_SCRIPTS[id], id);
});

test('battles with no cold foe have no Rime: an Episode 6 and an Episode 5 boss replay bit for bit', () => {
  assert.equal(JSON.stringify(runBattle({ zone: 'ep6_obs_eyrie', level: 27, encounter: 'scribe', seed: 3, trace: true })), ep6Trace);
  assert.equal(JSON.stringify(runBattle({ zone: 'ep5_lab_oracle', level: 24, encounter: 'oracle', seed: 3, trace: true })), ep5Trace);
  const b = battle(['briar_wolf', 'ink_slime'], { seed: 2, level: 5 });
  const evs = playOut(b);
  assert.equal(b.state.rime, undefined);
  assert.equal(evs.filter((e) => /^rime|^frozen|^warm|^farewell|^stilled/.test(e.type)).length, 0);
  // an Episode 6 battle with a member who knows Call: gated ("No cold to call through."), the saved member keeps it
  const e6 = fight(['squall_wolf'], { zone: 'ep6_obs_f1', loadout: 'ep6_obs_f2', level: 26 });
  assert.equal(e6.state.rime, undefined);
  assert.ok(!e6.unit('hero').skills.includes('call_name'));
  assert.ok(e6.state.gated.some((g) => g.unit === 'hero' && g.skill === 'call_name' && g.reason === 'No cold to call through.'));
  const row = gale.gateCommands(e6, e6.unit('hero'), e6.commands('hero')).find((c) => c.id === 'tech').list.find((x) => x.skill === 'call_name');
  assert.deepEqual([row.enabled, row.reason], [false, 'No cold to call through.']);
});

test('Rime starts in every cold battle; Turn the Sky and Anchor stay gated there; Call is listed', () => {
  const b = fight(['rime_wolf', 'snow_wisp']);
  assert.ok(S(b));
  assert.ok(b.startEvents.some((e) => e.type === 'rime' && e.reason === 'start'));
  assert.deepEqual(S(b).r, { hero: 0, mira: 0, bram: 0 });
  assert.equal(b.state.sky, undefined); assert.equal(b.state.gale, undefined);
  assert.ok(!b.unit('mira').skills.includes('turn_sky') && !b.unit('bram').skills.includes('anchor_line'));
  assert.ok(b.state.gated.some((g) => g.skill === 'turn_sky' && g.reason === 'No sky to turn.'));
  assert.ok(b.state.gated.some((g) => g.skill === 'anchor_line' && g.reason === 'No wind to hold.'));
  assert.ok(!b.state.gated.some((g) => g.skill === 'call_name'));
  assert.ok(b.unit('hero').skills.includes('call_name'));
  // learned by flag only
  const nb = fight(['rime_wolf'], { flags: ['sky_learned'] });
  assert.ok(!nb.unit('hero').skills.includes('call_name'));
});

test('a cold move adds its Rime to each member it hits (Frost Fang 1, Flurry 1 each, Glacier Cleave 2); plain moves add none; no foe holds Rime', () => {
  const b = fight(['rime_wolf']);
  sturdy(b);
  const wolf = foes(b)[0];
  b.ctx.useSkill(wolf, SKILLS.rime_bite, 'mira');
  assert.equal(S(b).r.mira, 0, 'a plain bite adds none');
  b.ctx.useSkill(wolf, SKILLS.frost_fang, 'mira');
  assert.equal(S(b).r.mira, 1);
  b.ctx.useSkill(wolf, SKILLS.flurry, null);
  assert.deepEqual(S(b).r, { hero: 1, mira: 2, bram: 1 });
  b.ctx.useSkill(wolf, SKILLS.glacier_cleave, 'hero');
  assert.equal(S(b).r.hero, 0, 'the hero reached 3 and froze (Rime back to 0)');
  assert.ok(S(b).frozen.hero);
  // no foe ever holds Rime
  assert.equal(rime.addRime(b.ctx, wolf, 2, wolf), 0);
  assert.deepEqual(Object.keys(S(b).r).sort(), ['bram', 'hero', 'mira']);
  for (const f of E7.enemies.EP7_FOES) for (const m of ENEMIES[f].moves) {
    const e = (SKILLS[m.skill].effects || []).find((x) => x.keep === 'rime');
    if (e) assert.ok(typeof e.rime === 'number' && e.rime >= 1 && e.rime <= 2, m.skill);
  }
});

test('Frozen at 3: a full turn back, x1.4 damage taken until it acts, Rime 0; a missed hit adds nothing', () => {
  const b = fight(['rime_wolf']);
  sturdy(b);
  const mira = b.unit('mira');
  const wolf = foes(b)[0];
  const plain = b.ctx.eff(mira, 'def');
  const next = mira.next;
  S(b).r.mira = 2;
  rime.addRime(b.ctx, mira, 1, wolf);
  assert.equal(S(b).r.mira, 0);
  assert.ok(S(b).frozen.mira);
  assert.equal(mira.next - next, Math.round(base(b, mira) * rime.FROZEN_PUSH));
  const d = b.ctx.eff(mira, 'def');
  assert.ok(Math.abs((DEF_K / (DEF_K + d)) / (DEF_K / (DEF_K + plain)) - rime.FROZEN_MULT) < 0.02, 'x1.4 physical damage');
  // no Rime while Frozen
  assert.equal(rime.addRime(b.ctx, mira, 1, wolf), 0);
  // it thaws when it acts
  untilTurn(b, 'mira');
  b.perform({ type: 'swap' });
  assert.ok(!S(b).frozen.mira);
  assert.ok(!mira.mods.some((m) => m.source === 'frozen'));
  assert.equal(b.ctx.eff(mira, 'def'), plain);
});

test('Defend sheds all Rime and keeps the member Warm until its next turn; Ember Tea sheds 1 from every ally', () => {
  const b = fight(['rime_wolf', 'snow_wisp']);
  sturdy(b);
  const wisp = foes(b)[1];
  untilTurn(b, 'bram');
  S(b).r.bram = 2; S(b).r.hero = 2; S(b).r.mira = 1;
  const evs = b.perform({ type: 'defend' });
  assert.equal(S(b).r.bram, 0);
  assert.ok(evs.some((e) => e.type === 'rime_add' && e.target === 'bram' && e.reason === 'defend' && e.rime === 0));
  assert.ok(evs.some((e) => e.type === 'warm' && e.target === 'bram' && e.on));
  assert.ok(evs.some((e) => e.type === 'message' && e.text === 'Bram shakes off the cold.'));
  b.ctx.useSkill(wisp, SKILLS.flurry, null);
  assert.equal(S(b).r.bram, 0, 'Warm: no Rime added');
  untilTurn(b, 'hero');
  S(b).r.hero = 2; S(b).r.mira = 1; S(b).r.bram = 0;
  const e2 = b.perform({ type: 'item', item: 'ember_tea', target: 'hero' });
  assert.ok(e2.some((e) => e.type === 'message' && e.kind === 'rime_tea'));
  assert.equal(b.state.inventory.ember_tea, 2);
  const shed = Object.fromEntries(e2.filter((e) => e.type === 'rime_add' && e.reason === 'tea').map((e) => [e.target, e.rime]));
  assert.deepEqual(shed, { hero: 1, mira: 0 }, 'every ally sheds 1 (none below 0)');
  assert.equal(CONSUMABLES.ember_tea.price, 160);
});

test('Call: target an ally (never the hero), 12 MP; sheds all, Warm, a quarter turn sooner (clamped)', () => {
  const sk = SKILLS.call_name;
  assert.deepEqual([sk.name, sk.mp, sk.rank, sk.target, sk.excludeSelf, sk.canTargetKept], ['Call', 12, 80, 'ally', true, true]);
  assert.deepEqual(sk.learn, { flag: 'call_learned' });
  assert.equal(sk.fallbackLevel, 29);
  assert.ok(sk.help.length <= 40);
  const b = fight(['rime_wolf']);
  sturdy(b);
  untilTurn(b, 'hero');
  const t = b.targets('hero', { type: 'skill', skill: 'call_name' });
  assert.equal(t.mode, 'single');
  assert.ok(!t.ids.includes('hero') && t.ids.includes('mira') && t.ids.includes('bram'));
  assert.equal(b.perform({ type: 'skill', skill: 'call_name', target: 'hero' })[0].type, 'invalid');
  S(b).r.mira = 2;
  const mira = b.unit('mira');
  const room = mira.next - b.state.now;
  const mp = b.unit('hero').mp;
  const evs = b.perform({ type: 'skill', skill: 'call_name', target: 'mira' });
  assert.equal(b.unit('hero').mp, mp - 12);
  assert.equal(S(b).r.mira, 0);
  assert.ok(evs.some((e) => e.type === 'warm' && e.target === 'mira' && e.on));
  const d = evs.find((e) => e.type === 'delay' && e.target === 'mira' && e.reason === 'call');
  assert.ok(d && d.amount < 0 && -d.amount <= Math.max(room, Math.round(base(b, mira) * 0.25)));
  assert.ok(mira.next >= b.state.now, 'never before now');
});

test('a pin: Call breaks it (its owner a full turn back); without Call it lands (Stilled); never on the hero; holdForHero', () => {
  let b = pinned();
  const ph = foes(b)[0];
  const p = S(b).pin;
  assert.equal(p.skill, 'farewell');
  assert.notEqual(p.target, 'hero', 'never the hero');
  assert.ok(SKILLS.farewell.farewell && SKILLS.borrowed_light.farewell, "Mira's tips' lever: both carry the farewell flag");
  // holdForHero: the hero acts before the Phantom's next turn
  const order = b.timeline(14).map((r) => r.uid);
  assert.ok(order.indexOf('hero') < order.indexOf(ph.uid), 'the hero comes first');
  assert.ok(E7.ai.heroAnswers(b), 'the scene may say "{hero} can call her."');
  untilTurn(b, 'hero');
  const target = p.target;
  const evs = b.perform({ type: 'skill', skill: 'call_name', target });
  assert.ok(evs.some((e) => e.type === 'farewell_broken' && e.reason === 'call' && e.target === target));
  assert.ok(evs.some((e) => e.type === 'message' && /hears (her|his) name\. The farewell does not hold\./.test(e.text)));
  const dl = evs.find((e) => e.type === 'delay' && e.target === ph.uid && e.reason === 'call');
  assert.equal(dl.amount, Math.round(base(b, ph) * rime.PIN_PUSH));
  assert.equal(S(b).pin, null);
  // without Call it lands on the Phantom's next turn: its target is Stilled
  b = pinned();
  const t2 = S(b).pin.target;
  const e2 = until(b, (e) => e.some((x) => x.type === 'farewell_land' || x.type === 'farewell_broken'));
  assert.ok(e2.some((e) => e.type === 'farewell_land' && e.target === t2));
  assert.ok(rime.isStilled(b, t2));
  assert.ok(b.unit(t2).statuses.kept, 'built on the Kept seal');
  assert.ok(!e2.some((e) => e.type === 'status_add' && e.status === 'kept'), 'no mirror is drawn');
  // holdForHero when the hero is pushed far back
  b = null;
  for (let seed = 1; seed < 30 && !b; seed++) { const x = pinned('white_phantom', seed); if (x.current().id !== 'hero') b = x; }
  assert.ok(b, 'a pin with someone else on turn');
  const hero = b.unit('hero');
  b.ctx.delayUnit(hero, 3, 'test');   // the hero far down the timeline: the Phantom would act first
  const e3 = until(b, () => true);    // one action
  assert.ok(e3.some((e) => e.type === 'farewell' && e.moved), 'the owner is held behind the hero');
  assert.ok(foes(b)[0].next > hero.next);
  untilTurn(b, 'hero');
  assert.ok(S(b).pin, 'still pinned when the hero finally acts');
});

test('Stilled: no turn, untargetable by foes, Callable; back after its turns, on Call, or when its source is Broken; Recall does not free it', () => {
  // time
  let b = pinned();
  let t = S(b).pin.target;
  until(b, (e) => e.some((x) => x.type === 'farewell_land'));
  const e1 = until(b, (e) => e.some((x) => x.type === 'stilled_end'));
  assert.ok(e1.some((e) => e.type === 'stilled_end' && e.target === t && e.reason === 'time'));
  const held = e1.slice(0, e1.findIndex((e) => e.type === 'stilled_end'));
  assert.ok(!held.some((e) => e.type === 'damage' && e.target === t), 'foes never hit a Stilled member');
  assert.ok(!held.some((e) => e.type === 'action_start' && e.actor === t), 'no turn while Stilled');
  assert.ok(!b.unit(t).statuses.kept);
  // Call
  b = pinned();
  t = S(b).pin.target;
  until(b, (e) => e.some((x) => x.type === 'farewell_land'));
  untilTurn(b, 'hero');
  assert.ok(b.targets('hero', { type: 'skill', skill: 'call_name' }).ids.includes(t), 'a Stilled ally is a Call target');
  const e2 = b.perform({ type: 'skill', skill: 'call_name', target: t });
  assert.ok(e2.some((e) => e.type === 'stilled_end' && e.target === t && e.reason === 'call'));
  assert.ok(!rime.isStilled(b, t));
  // Break of its source
  b = pinned();
  t = S(b).pin.target;
  until(b, (e) => e.some((x) => x.type === 'farewell_land'));
  const ph = foes(b)[0];
  ph.shields = 1;
  b.ctx.chipShields(ph, 1, b.unit('bram'));
  assert.ok(ph.broken);
  assert.ok(!rime.isStilled(b, t), 'the Break returns the Stilled');
  // Recall (or a Silver Salve when Mira is the one held): the cure lands, the seal goes back on
  b = pinned();
  t = S(b).pin.target;
  until(b, (e) => e.some((x) => x.type === 'farewell_land'));
  const by = t === 'mira' ? 'hero' : 'mira';
  untilTurn(b, by);
  const e4 = b.perform(by === 'mira' ? { type: 'skill', skill: 'recall', target: t } : { type: 'item', item: 'silver_salve', target: t });
  assert.ok(e4.some((e) => e.type === 'status_remove' && e.target === t && e.status === 'kept'), 'the cure removed the seal');
  assert.ok(e4.some((e) => e.type === 'stilled_hold' && e.target === t && e.by === by));
  assert.ok(rime.isStilled(b, t) && b.unit(t).statuses.kept, 'and it is back on');
});

test('a Break cancels a pin; the Phantom never bids the hero farewell (not used when only the hero stands)', () => {
  let b = pinned();
  const ph = foes(b)[0];
  ph.shields = 1;
  b.ctx.chipShields(ph, 1, b.unit('bram'));
  assert.equal(S(b).pin, null);
  b = fight(['white_phantom'], { zone: 'ep7_stillheart', encounter: 'white_phantom', boss: true, loadout: 'ep7_stillheart', level: 30, rng: makeRng(2) });
  sturdy(b);
  for (const f of foes(b)) f.shields = 99;
  for (const id of ['mira', 'bram']) b.ctx.kill(b.unit(id));
  const evs = until(b, (e, x) => foes(x)[0].ai.turns >= 6, 400);
  assert.ok(!evs.some((e) => e.type === 'farewell'), 'no farewell with only the hero standing');
  assert.equal(E7.ai.pinTarget(b.ctx), null);
});

test('the Pale Lantern: Borrowed Light lands (Frozen whatever the Rime, the Lantern heals 8%), two Snow Wisps at 50%; Answer is a plain hit', () => {
  const b = pinned('pale_lantern', 3, 29);
  const ln = foes(b)[0];
  const t = S(b).pin.target;
  assert.equal(S(b).pin.skill, 'borrowed_light');
  assert.equal(S(b).r[t], Math.max(...['mira', 'bram'].map((id) => S(b).r[id])), 'the non-hero member with the most Rime');
  ln.hp = Math.floor(ln.maxHp * 0.9);
  const hp = ln.hp;
  const evs = until(b, (e) => e.some((x) => x.type === 'farewell_land'));
  assert.ok(evs.some((e) => e.type === 'frozen' && e.target === t && e.reason === 'borrowed'));
  assert.ok(evs.some((e) => e.type === 'heal' && e.target === ln.uid && e.amount === Math.round(ln.maxHp * ENEMIES.pale_lantern.borrowHeal)));
  assert.ok(ln.hp >= hp);
  // Answer on the owner of a pin: a plain light hit and a line
  const b2 = pinned('pale_lantern', 3, 29);
  untilTurn(b2, 'hero');
  b2.unit('hero').skills.push('answer');
  const e2 = b2.perform({ type: 'skill', skill: 'answer', target: foes(b2)[0].uid });
  assert.ok(e2.some((e) => e.type === 'message' && e.text === 'A farewell is not a decree.'));
  // the hood
  const b3 = fight(['pale_lantern'], { zone: 'ep7_vault_f2', encounter: 'pale_lantern', boss: true, loadout: 'ep7_vault_f2', level: 29 });
  const l3 = foes(b3)[0];
  b3.ctx.damage(l3, Math.ceil(l3.maxHp * 0.55), null, {});
  const wisps = foes(b3).filter((f) => f.id === 'snow_wisp');
  assert.equal(wisps.length, 2);
  for (const w of wisps) assert.equal(w.rewards.exp, 0);
  assert.equal(ENCOUNTERS.pale_lantern.flag, 'lantern_defeated');
});

test('the White Phantom: HP locks at 68% and 33%, the Frozen Ward (20%, the Gate and the Letter), the thaw (+25 Fury), three looks, Blizzard', () => {
  const b = fight(['white_phantom'], { zone: 'ep7_stillheart', encounter: 'white_phantom', boss: true, loadout: 'ep7_stillheart', level: 30, rng: makeRng(2) });
  const ph = foes(b)[0];
  const looks = [];
  const phase = (evs) => { for (const e of evs) if (e.type === 'phase') looks.push(e.sprite); };
  phase(b.startEvents);
  assert.ok(ph.mods.some((m) => m.source === 'armor' && m.mult === 1.4), 'armored');
  const big = ph.maxHp;
  b.ctx.damage(ph, big, null, {});
  assert.equal(ph.hp, Math.floor(big * 0.68), 'one hit never skips a phase');
  b.ctx.damage(ph, 1, null, {});
  const adds = foes(b).filter((f) => ['closed_gate', 'lost_letter'].includes(f.id));
  assert.equal(adds.length, 2);
  assert.ok(ph.ai.ward);
  b.ctx.damage(ph, big, null, {});
  assert.equal(ph.hp, Math.floor(big * 0.33), 'the ward floor');
  assert.equal(E7.ai.WARD_MULT, 0.2);
  const fury = b.living('party').map((m) => m.fury);
  for (const a of adds) if (a.alive) b.ctx.damage(a, a.hp, null, {});
  assert.ok(!ph.ai.ward);
  assert.ok(ph.broken, 'the thaw Breaks it');
  b.living('party').forEach((m, i) => assert.equal(m.fury, Math.min(100, fury[i] + 25)));
  assert.ok(ph.statuses.haste);
  assert.ok(!ph.mods.some((m) => m.source === 'armor'), 'the armor falls');
  assert.deepEqual(ph.weak, ['fire', 'spear', 'light']);
  assert.equal(ENEMIES.white_phantom.phases.map((p) => p.sprite).join(','), 'white_phantom,white_phantom_ward,white_phantom_thaw');
  // Stillheart Blizzard: a charge in Thawlight
  sturdy(b);
  const e2 = until(b, (e) => e.some((x) => x.type === 'telegraph' && x.skill === 'stillheart_blizzard'), 600, () => ({ type: 'defend' }));
  assert.ok(e2.some((e) => e.type === 'telegraph' && e.skill === 'stillheart_blizzard'));
  assert.equal(ENCOUNTERS.white_phantom.startFury.flag, 'hearth_lit');
  assert.equal(ENCOUNTERS.white_phantom.startFury.amount, 20);
  assert.equal(ENCOUNTERS.white_phantom.flag, 'phantom_defeated');
  // the Closed Gate Shuts the hero every 3rd turn; the Lost Letter Mends
  assert.equal(ENEMIES.closed_gate.shutEvery, 3);
  assert.equal(ENEMIES.lost_letter.mendPct, 0.04);
});

test('Auto: careful play Calls a pin; reckless and naive never Call, Defend for Rime or use Ember Tea; quiet outside Episode 7', () => {
  const opts = (seed) => ({ zone: 'ep7_stillheart', encounter: 'white_phantom', boss: true, loadout: 'ep7_stillheart', level: 30, rng: makeRng(seed) });
  let called = 0;
  for (let seed = 1; seed <= 4; seed++) called += playOut(fight(['white_phantom'], opts(seed))).filter((e) => e.type === 'farewell_broken' && e.reason === 'call').length;
  assert.ok(called >= 3, `careful play broke ${called} Farewells with Call in four fights`);
  for (const pol of ['reckless', 'naive']) {
    const ev2 = playOut(fight(['white_phantom'], opts(2)), pol);
    assert.ok(!ev2.some((e) => e.type === 'message' && e.kind === 'call'), `${pol} never Calls`);
    assert.ok(!ev2.some((e) => e.type === 'rime_add' && (e.reason === 'tea' || e.reason === 'defend')), `${pol} never sheds by Defend or Tea`);
  }
  const b = battle(['briar_wolf'], { seed: 1, level: 5 });
  b.begin();
  assert.equal(E7.ai.ep7Policy(b, b.living('party')[0]), null);
  assert.ok(POLICY_EXT.includes(E7.ai.ep7Policy));
});

test('a full-HP party at the expected level survives any single non-telegraphed Episode 7 action (DESIGN 7)', () => {
  const entry = Object.fromEntries(progression(1).map((p) => [p.zone, p.startLevel]));
  const cases = [];
  for (const z of E7.enc.EP7_ZONE_ORDER) for (const [enc] of ZONES[z].plan) for (const id of ENCOUNTERS[enc].enemies) cases.push([id, z, ENCOUNTERS[enc].power || 1]);
  cases.push(['snow_wisp', 'ep7_vault_f2', 1], ['closed_gate', 'ep7_stillheart', 1], ['lost_letter', 'ep7_stillheart', 1]);
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

test('items, uniques, set, affix tier 9, rare names, loot tables, shops and the gold line', () => {
  for (const id of Object.keys(E7.items.EP7_KEY_ITEMS)) assert.ok(KEY_ITEMS[id] && ITEMS[id].kind === 'key', id);
  assert.equal(Object.keys(E7.items.EP7_KEY_ITEMS).length, 6);
  assert.deepEqual(KEY_ITEMS.white_road_letter.descAfter, E7.items.WHITE_ROAD_LETTER_AFTER, "Episode 6's letter gains its second desc");
  assert.deepEqual(ITEMS.white_road_letter.descAfter, E7.items.WHITE_ROAD_LETTER_AFTER);
  for (const [id, it] of Object.entries(E7.items.EP7_EQUIPMENT)) {
    assert.ok(EQUIPMENT[id], id);
    assert.ok(it.tier === 13 ? it.ilvl === 29 : it.tier === 14 && it.ilvl === 31, `${id} tier/ilvl`);
  }
  assert.equal(Object.keys(E7.items.EP7_EQUIPMENT).length, 16);
  assert.equal(Object.keys(E7.items.EP7_UNIQUES).length, 8);
  for (const id of Object.keys(E7.items.EP7_UNIQUES)) assert.ok(UNIQUES[id] && !EQUIPMENT[id], `${id} placed, never random`);
  const PARTY = new Set(['hp', 'mp', 'atk', 'def', 'mag', 'spr', 'spd', 'luk', 'crit', 'fireDmg', 'iceDmg', 'thunderDmg', 'lightDmg',
    'furyGain', 'lifesteal', 'healPow', 'mpCostDown']);
  const ok = (k) => PARTY.has(k) || (/^res[A-Z]/.test(k) && STATUSES[k[3].toLowerCase() + k.slice(4)]);
  for (const it of [...Object.values(E7.items.EP7_UNIQUES), ...Object.values(E7.items.EP7_EQUIPMENT)]) for (const k of Object.keys(it.stats)) assert.ok(ok(k), `${it.id}: ${k}`);
  for (const k of Object.keys(SETS.winterwatch.bonus[2])) assert.ok(ok(k), k);
  assert.deepEqual(SETS.winterwatch.pieces, ['winterwatch_boots', 'winterwatch_coat']);
  assert.equal(Object.values(AFFIXES).filter((a) => a.tiers.length === 9).length, before.affixT8);
  for (const a of Object.values(AFFIXES).filter((x) => x.tiers.length === 9)) {
    const [l, lo, hi] = a.tiers[8];
    assert.equal(l, 29); assert.ok(lo >= a.tiers[7][1] && hi >= lo);
    if (/^res[A-Z]/.test(a.stat)) assert.ok(hi <= 100);
  }
  assert.ok(RARE_NAME_EXT.some(([l, w]) => l === 29 && w.includes('Thawborn')));
  for (const z of E7.enc.EP7_ZONE_ORDER) assert.ok(ZONE_LOOT[z], z);
  assert.equal(BOSS_LOOT.pale_lantern.unique, 'borrowed_flame');
  assert.equal(BOSS_LOOT.white_phantom.unique, 'stillheart_shard');
  assert.equal(SHOPS.glassice_armory.stock.filter((s) => s.ifFlag === 'vault_f2_done').length, 8);
  for (const s of Object.values(E7.shops.EP7_SHOPS)) for (const x of SHOPS[s.id].stock) assert.ok(ITEMS[x.item], `${s.id}: ${x.item}`);
  for (const id of ['waystation_pack', 'northwind']) assert.ok(SHOPS[id].stock.some((x) => x.item === 'ember_tea'), id);
  for (const id of Object.keys(E7.skills.EP7_SKILLS)) assert.ok(SKILLS[id].help.length <= 40, id);
  for (const d of Object.values(E7.enemies.EP7_ENEMIES)) for (const m of d.moves) assert.ok(SKILLS[m.skill], m.skill);
  for (const d of Object.values(E7.enemies.EP7_ENEMIES)) for (const dr of d.drops) assert.ok(ITEMS[dr.item], dr.item);
  // the gold line (plan 7.6, binding): two town pieces and two tier 14 pieces, each with 300 G to spare
  assert.deepEqual(checkEconomy7(), []);
  const e = economy7();
  assert.ok(e.afterTown >= 300 && e.afterF3buy >= 300);
  assert.ok(LV31_EXP === 21363);
});

test('pure modules: rime.js never draws from ctx.R; LF endings and no em dashes in the Episode 7 battle files', () => {
  const src = fs.readFileSync(new URL('../../src/data/ep7/rime.js', import.meta.url), 'utf8');
  assert.ok(!/\bR\(\)|ctx\.R\b|Math\.random/.test(src.replace(/^\s*\/\/.*$/gm, '')), 'no randomness in rime.js');
  for (const f of ['enemies', 'encounters', 'items', 'loot', 'shops', 'skills', 'ai', 'rime']) {
    const s = fs.readFileSync(new URL(`../../src/data/ep7/${f}.js`, import.meta.url), 'utf8');
    assert.ok(!s.includes(String.fromCharCode(0x2014)), `${f}: em dash`);
    assert.ok(!s.includes('\r'), `${f}: CR`);
  }
  for (const f of ['../../tools/sim/ep7.mjs', './ep7_battle.test.mjs', './ep7_sim.test.mjs']) {
    const s = fs.readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.ok(!s.includes(String.fromCharCode(0x2014)) && !s.includes('\r'), f);
  }
});
