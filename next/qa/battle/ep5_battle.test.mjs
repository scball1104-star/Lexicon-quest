// Episode 5 combat (E5-battle; docs/EPISODE5_PLAN.md 6 and 7): the pack's battle data registers without touching Episodes 1 to 4,
// the Turning Sky on rules.js RULE_EXT (start from the field hour or SKY_START, the Turn every 6 actions, Exposed and Ascendant,
// the natural Turn and Mirror Turn), Turn the Sky, Hourglass Sand, the Mirage Knight and its Double, the Sand Oracle's phases,
// the Last Prophecy and the Veil, Auto, items, loot and shops. Balance targets: ep5_sim.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { battle, untilTurn, midRng, ofType, playOut } from './_helpers.mjs';
import { makeRng, RULE_EXT, WEAK_MULT } from '../../src/battle/rules.js';
import { SCRIPTS, POLICY_EXT } from '../../src/battle/ai.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { SKILLS, CHARACTER_SKILLS } from '../../src/data/skills.js';
import { ITEMS, EQUIPMENT, UNIQUES, SETS, AFFIXES, KEY_ITEMS, CONSUMABLES } from '../../src/data/items.js';
import { ZONES, ENCOUNTERS, ZONE_ORDER, EP2_ZONE_ORDER, EP3_ZONE_ORDER } from '../../src/data/encounters.js';
import { SHOPS } from '../../src/data/shops.js';
import { ZONE_LOOT, BOSS_LOOT } from '../../src/data/loot-tables.js';
import { RARE_NAME_EXT } from '../../src/battle/loot.js';
import { knownSkills, newMember } from '../../src/data/party.js';

const { makeParty, runBattle } = await import('../../tools/sim/simulate.mjs');
const ep4 = await import('../../tools/sim/ep4.mjs');
// Snapshots after the ep4 pack and before ep5 (ep5's register() calls must only add).
ep4.registerData();
const before = {
  enemies: new Set(Object.keys(ENEMIES)), skills: new Set(Object.keys(SKILLS)), items: new Set(Object.keys(ITEMS)),
  zones: Object.keys(ZONES).slice(), orders: JSON.stringify([ZONE_ORDER, EP2_ZONE_ORDER, EP3_ZONE_ORDER]),
  regent: JSON.stringify(ENEMIES.paper_regent), answer: JSON.stringify(SKILLS.answer), shops: Object.keys(SHOPS).length,
  affixT6: Object.values(AFFIXES).filter((a) => a.tiers.length === 6).length, mira: CHARACTER_SKILLS.mira.slice(),
};
// An Episode 4 battle traced before Episode 5 registers: it must replay identically after (no sided foe, no sky).
const ep4Trace = JSON.stringify(runBattle({ zone: 'ep4_keep_crown', level: 20, encounter: 'paper_regent', seed: 3, trace: true }));

const { registerData, SIM_HOUR } = await import('../../tools/sim/ep5.mjs');
registerData();
const sky = await import('../../src/data/ep5/sky.js');
const E5 = { enemies: await import('../../src/data/ep5/enemies.js'), enc: await import('../../src/data/ep5/encounters.js'),
  skills: await import('../../src/data/ep5/skills.js'), items: await import('../../src/data/ep5/items.js'),
  loot: await import('../../src/data/ep5/loot.js'), shops: await import('../../src/data/ep5/shops.js'), ai: await import('../../src/data/ep5/ai.js') };

const SKY = ['bram_memory_3', 'hero_signed', 'sky_learned'];
const foes = (b) => b.units().filter((u) => u.side === 'enemy');
/** A battle as the game builds it: zone and encounter in the options (SIM_HOUR reads the zone; SKY_START the encounter). */
function fight(enemies, { zone = 'ep5_lab_f1', encounter = null, level = 23, loadout = 'ep5_lab_f1', rng = midRng, flags = SKY, inv = {}, boss = false } = {}) {
  return battle(enemies, { rng, party: makeParty(loadout, level),
    options: { zone, encounter, boss, flags, inventory: { hi_potion: 4, ...inv } } });
}
/** Party defends, enemies act, until `pred(events, b)` holds. Returns every event seen. */
function until(b, pred, max = 300) {
  const seen = [];
  for (let i = 0; i < max && !b.isOver(); i++) {
    const u = b.current();
    const evs = u.side === 'party' ? b.perform({ type: 'defend' }) : b.runEnemyTurn();
    seen.push(...evs);
    if (pred(evs, b)) return seen;
  }
  throw new Error('condition never met');
}
const sturdy = (b) => { for (const u of b.living('party')) u.hp = u.maxHp = 99999; return b; };

test('Episode 5 ids are registered, kept unlisted, and Episodes 1 to 4 are untouched', () => {
  for (const id of [...E5.enemies.EP5_FOES, ...E5.enemies.EP5_BOSSES, ...E5.enemies.EP5_ADDS]) {
    assert.ok(ENEMIES[id], id);
    assert.ok(['sun', 'star'].includes(ENEMIES[id].sky), `${id} has a sky side`);
  }
  assert.equal(E5.enemies.EP5_FOES.length, 7);
  for (const id of [...E5.enc.EP5_GROUP_IDS, ...E5.enc.EP5_BOSS_IDS]) assert.ok(ENCOUNTERS[id], id);
  assert.equal(E5.enc.EP5_GROUP_IDS.length, 14);
  for (const z of E5.enc.EP5_ZONE_ORDER) { assert.ok(ZONES[z], z); assert.equal(ZONES[z].episode, 5); }
  assert.equal(E5.enc.EP5_MAPS_LISTED, false);
  for (const z of E5.enc.EP5_ZONE_ORDER) assert.ok(!Object.keys(ZONES).includes(z), `${z} stays out of Object.keys(ZONES)`);
  for (const z of before.zones) assert.ok(Object.keys(ZONES).includes(z), z);
  assert.equal(JSON.stringify([ZONE_ORDER, EP2_ZONE_ORDER, EP3_ZONE_ORDER]), before.orders);
  assert.equal(JSON.stringify(ENEMIES.paper_regent), before.regent);
  assert.equal(JSON.stringify(SKILLS.answer), before.answer);
  for (const id of before.enemies) assert.ok(ENEMIES[id]);
  for (const id of before.skills) assert.ok(SKILLS[id]);
  for (const id of before.items) assert.ok(ITEMS[id]);
  assert.deepEqual(CHARACTER_SKILLS.mira.slice(0, before.mira.length), before.mira);
  assert.ok(CHARACTER_SKILLS.mira.includes('turn_sky'));
  // idempotent: a second registration adds nothing
  const n = [Object.keys(ENEMIES).length, Object.keys(SKILLS).length, Object.keys(ITEMS).length, RULE_EXT.length, POLICY_EXT.length];
  registerData();
  for (const m of Object.values(E5)) if (typeof m.register === 'function') m.register();
  sky.register();
  assert.deepEqual([Object.keys(ENEMIES).length, Object.keys(SKILLS).length, Object.keys(ITEMS).length, RULE_EXT.length, POLICY_EXT.length], n);
  assert.equal(RULE_EXT.filter((h) => h === sky.SKY_RULE).length, 1);
});

test('battles with no sided foe have no sky: an Episode 4 boss replays bit for bit', () => {
  assert.equal(JSON.stringify(runBattle({ zone: 'ep4_keep_crown', level: 20, encounter: 'paper_regent', seed: 3, trace: true })), ep4Trace);
  const b = battle(['briar_wolf', 'ink_slime'], { seed: 2, level: 5 });
  const evs = playOut(b);
  assert.equal(b.state.sky, undefined);
  assert.equal(evs.filter((e) => /^sky|^foretell|^exposed|^ascendant/.test(e.type)).length, 0);
});

test('the sky starts from the field hour (Day if unset), or SKY_START; the first fight opens at Night, Turn in 4', () => {
  const at = (hour) => {
    const i = RULE_EXT.indexOf(SIM_HOUR); RULE_EXT.splice(i, 1);   // the field, not the simulator, sets the hour here
    try { sky.setFieldHour(hour); return fight(['dune_stalker']).state.sky; } finally { RULE_EXT.unshift(SIM_HOUR); }
  };
  assert.equal(at(null).sky, 'day');
  assert.equal(at('dawn').sky, 'day');
  assert.equal(at('noon').sky, 'day');
  assert.equal(at('dusk').sky, 'night');
  assert.equal(at('night').sky, 'night');
  assert.equal(at('noon').turnIn, sky.TURN_EVERY);
  assert.equal(sky.setFieldHour('teatime'), null);
  const b = fight(['dust_harrier', 'dune_scarab'], { zone: 'ep5_ship', encounter: 'e5s_first', loadout: 'ep5_ship', level: 21, flags: [] });
  assert.equal(b.state.sky.sky, 'night');
  assert.equal(b.state.sky.turnIn, 4);
  for (const f of foes(b)) { assert.equal(f.exposed, true, `${f.id} (sun) is Exposed at night`); assert.ok(!sky.isAscendant(f)); }
  const start = b.startEvents;
  assert.ok(start.some((e) => e.type === 'sky' && e.reason === 'start' && e.sky === 'night' && e.turnIn === 4));
  assert.equal(ofType(start, 'exposed').length, 2);
  // knights and oracles open by Day whatever the hour
  assert.equal(fight(['mirage_knight'], { zone: 'ep5_lab_f2', encounter: 'mirage_knight', boss: true }).state.sky.sky, 'day');
  assert.equal(fight(['oracle'], { zone: 'ep5_lab_oracle', encounter: 'oracle', boss: true }).state.sky.sky, 'day');
});

test('the sky turns after every 6 actions; the Exposed become Ascendant (+20% ATK and MAG) and back', () => {
  const b = fight(['dust_harrier', 'dune_scarab'], { zone: 'ep5_ship', encounter: 'e5s_first', loadout: 'ep5_ship', level: 21, flags: [] });
  sturdy(b);
  const harrier = foes(b)[0];
  const atk0 = b.state.units[harrier.uid].stats.atk;
  const seen = until(b, (evs) => evs.some((e) => e.type === 'sky_turn'));
  const actions = b.state.turn;
  assert.equal(actions, 4, 'the first Turn after 4 actions (SKY_START)');
  const t = ofType(seen, 'sky_turn')[0];
  assert.deepEqual([t.sky, t.natural], ['day', true]);
  assert.ok(seen.some((e) => e.type === 'message' && e.text === 'The sky turns. Day.'));
  for (const f of foes(b).filter((x) => x.alive)) {
    assert.equal(f.exposed, false);
    assert.ok(sky.isAscendant(f));
    assert.equal(f.mods.filter((m) => m.source === 'sky').map((m) => [m.stat, m.mult]).join(), 'atk,1.2,mag,1.2');
  }
  assert.equal(b.state.sky.turnIn, 6);
  const seen2 = until(b, (evs) => evs.some((e) => e.type === 'sky_turn'));
  assert.equal(b.state.turn - actions, 6, 'then every 6 actions');
  assert.ok(ofType(seen2, 'exposed').some((e) => e.on));
  for (const f of foes(b).filter((x) => x.alive)) { assert.equal(f.exposed, true); assert.ok(!sky.isAscendant(f)); }
  assert.equal(atk0, harrier.stats.atk, 'the base stats never change');
});

test('Exposed: a plain hit cracks a shield at WEAK_MULT and the bestiary does not learn it; Ascendant hits harder', () => {
  // the Dune Scarab resists sword: by Night (Exposed) the hero's sword still cracks a shield
  const hit = (hour) => {
    const i = RULE_EXT.indexOf(SIM_HOUR); RULE_EXT.splice(i, 1);
    try {
      sky.setFieldHour(hour);
      const b = battle(['dune_scarab'], { rng: midRng, party: makeParty('ep5_lab_f1', 23), options: { zone: 'ep5_lab_f1', flags: SKY, bestiary: {} } });
      untilTurn(b, 'hero');
      const f = foes(b)[0];
      const sh = f.shields;
      const evs = b.perform({ type: 'attack', target: f.uid });
      return { dmg: evs.find((e) => e.type === 'damage' && e.target === f.uid), lost: sh - f.shields, revealed: (b.state.revealed[f.weakKey] || []).slice(),
        told: ofType(evs, 'reveal').flatMap((e) => e.weak || []) };
    } finally { RULE_EXT.unshift(SIM_HOUR); }
  };
  const day = hit('noon'), night = hit('night');
  assert.equal(day.dmg.weak, false); assert.equal(day.lost, 0); assert.ok(day.dmg.resist);
  assert.equal(night.dmg.weak, true); assert.equal(night.lost, 1);
  assert.ok(night.dmg.amount > day.dmg.amount * 2, `resisted ${day.dmg.amount} -> exposed ${night.dmg.amount}`);
  assert.ok(!night.told.includes('sword'), 'the reveal never names the Exposed type');
  assert.deepEqual(night.revealed, day.revealed);
  assert.ok(!ENEMIES.dune_scarab.weak.includes('sword'));
  // Ascendant: the same foe's eff ATK is 1.2x by Day
  const b = fight(['dune_scarab'], { zone: 'ep5_caravan_road', loadout: 'ep5_caravan_road', level: 21 });
  const f = foes(b)[0];
  assert.ok(sky.isAscendant(f));
});

test('Turn the Sky: learned by flag, turns the sky now, resets the Turn, the Knight is caught Exposed until a natural Turn', () => {
  assert.equal(SKILLS.turn_sky.mp, 12);
  assert.ok(SKILLS.turn_sky.help.length <= 40);
  assert.ok(knownSkills(newMember('mira', { level: 30 }), ['sky_learned']).includes('turn_sky'));
  assert.ok(!knownSkills(newMember('mira', { level: 30 }), []).includes('turn_sky'));
  const b = fight(['mirage_knight'], { zone: 'ep5_lab_f2', encounter: 'mirage_knight', boss: true, loadout: 'ep5_lab_f2' });
  sturdy(b);
  const k = foes(b)[0];
  assert.equal(k.exposed, false); assert.ok(sky.isAscendant(k));
  untilTurn(b, 'mira');
  const turns = b.state.turn;
  const evs = b.perform({ type: 'skill', skill: 'turn_sky' });
  assert.ok(evs.some((e) => e.type === 'sky_turn' && e.natural === false && e.by === 'mira' && e.sky === 'night'));
  assert.equal(b.state.sky.turnIn, sky.TURN_EVERY, 'the Turn resets to 6 (this action does not count)');
  assert.equal(b.state.turn, turns + 1);
  assert.equal(k.exposed, true, 'caught on the wrong side');
  assert.ok(!evs.some((e) => e.kind === 'mirror_turn'), 'no mirror on a party Turn');
  // the natural Turn back to Day: it is at home again; the one after that (to Night) it mirrors
  const seen = until(b, (e2) => e2.some((e) => e.type === 'sky_turn'));
  assert.equal(k.exposed, false);
  const seen2 = until(b, (e2) => e2.some((e) => e.type === 'sky_turn'));
  assert.ok(seen2.some((e) => e.type === 'message' && e.kind === 'mirror_turn' && e.target === k.uid), 'Mirror Turn on a natural Turn');
  assert.equal(k.skySide, 'star'); assert.equal(k.exposed, false); assert.ok(sky.isAscendant(k));
  void seen;
});

test('a battle with no sky: Turn the Sky only says so', () => {
  const b = battle(['briar_wolf'], { rng: midRng, party: makeParty('ep5_lab_f1', 23), options: { flags: SKY } });
  untilTurn(b, 'mira');
  const evs = b.perform({ type: 'skill', skill: 'turn_sky' });
  assert.ok(evs.some((e) => e.type === 'message' && e.text === 'There is no sky to turn here.'));
  assert.equal(b.state.sky, undefined);
});

test('Hourglass Sand holds the sky: +3 actions to the Turn (a pinned foretelling moves with it)', () => {
  const b = fight(['dune_stalker'], { inv: { hourglass_sand: 2 } });
  sturdy(b);
  untilTurn(b, 'hero');
  const t0 = b.state.sky.turnIn;
  const evs = b.perform({ type: 'item', item: 'hourglass_sand', target: 'hero' });
  assert.equal(b.state.sky.turnIn, t0 - 1 + sky.HOLD);
  assert.ok(evs.some((e) => e.type === 'message' && e.kind === 'sky_hold'));
  assert.equal(b.state.inventory.hourglass_sand, 1);
  assert.equal(CONSUMABLES.hourglass_sand.price, 140);
});

test('the Mirage Knight: Horizon Cleave every 4th turn (a charge), the Double at 50% on the other side, copying at half power', () => {
  const b = fight(['mirage_knight'], { zone: 'ep5_lab_f2', encounter: 'mirage_knight', boss: true, loadout: 'ep5_lab_f2' });
  sturdy(b);
  const k = foes(b)[0];
  const seen = until(b, (evs) => evs.some((e) => e.type === 'telegraph' && e.skill === 'horizon_cleave'));
  assert.equal(k.ai.turns, ENEMIES.mirage_knight.cleaveEvery - 1, 'announced at the end of the turn before');
  assert.ok(seen.find((e) => e.type === 'telegraph').text.includes('raises its blade to the horizon'));
  // half HP: the Double steps out on the side opposite the Knight's
  k.hp = Math.floor(k.maxHp * 0.5) + 1;
  untilTurn(b, 'bram');
  const evs = b.perform({ type: 'attack', target: k.uid });
  assert.ok(evs.some((e) => e.type === 'summon' && e.id === 'mirage_double'));
  const d = foes(b).find((u) => u.id === 'mirage_double');
  assert.equal(d.mirrorOf, k.uid);
  assert.notEqual(d.skySide, k.skySide);
  assert.notEqual(d.exposed, k.exposed, 'one of the two is Exposed under each sky');
  const copy = until(b, (e2) => e2.some((e) => e.type === 'action_start' && e.actor === d.uid));
  assert.ok(copy.some((e) => e.type === 'damage' && e.source === d.uid), 'the Double copies a blow');
  assert.ok(SKILLS.mirror_turn && ENEMIES.mirage_knight.mirrorTurn === 'mirror_turn', "Mira's tip: it turns its shield to the sky");
});

test('the Sand Oracle: HP locks at 72% and 34%, the Futures and the Veil, the tear, phase 3 Mirror and Sandstorm', () => {
  const b = fight(['oracle'], { zone: 'ep5_lab_oracle', encounter: 'oracle', boss: true, loadout: 'ep5_lab_oracle', level: 24 });
  sturdy(b);
  const o = foes(b)[0];
  untilTurn(b, 'hero');
  o.hp = Math.floor(o.maxHp * 0.72) + 5;
  b.perform({ type: 'attack', target: o.uid });
  assert.equal(o.hp, Math.floor(o.maxHp * 0.72), 'the lock at 72%: one hit never skips a phase');
  assert.equal(o.ai.phase, 1);
  assert.equal(o.ai.veil, true);
  const futures = foes(b).filter((u) => ['future_hunger', 'future_fear'].includes(u.id));
  assert.equal(futures.length, 2);
  assert.deepEqual(futures.map((f) => f.skySide).sort(), ['star', 'sun']);
  assert.equal(SCRIPTS.oracle.damageTakenMult(null, o), E5.ai.VEIL_MULT);
  assert.equal(SCRIPTS.oracle.shieldLocked(null, o), true);
  o.hp = Math.floor(o.maxHp * 0.36);
  untilTurn(b, 'bram');
  b.perform({ type: 'attack', target: o.uid });
  assert.ok(o.hp >= Math.floor(o.maxHp * 0.34), 'the Veil floor holds at 34%');
  // both futures down: the Veil tears, the Oracle is Broken, +25 Fury, phase 3
  futures[0].hp = 1; futures[1].hp = 1;
  const fury0 = b.unit('hero').fury;
  const seen = [];
  for (const f of futures) {
    untilTurn(b, 'mira');
    seen.push(...b.perform({ type: 'attack', target: f.uid }));
  }
  assert.ok(seen.some((e) => e.kind === 'veil_break'));
  assert.equal(o.ai.phase, 2); assert.equal(o.ai.veil, false); assert.ok(o.mirror);
  assert.ok(seen.some((e) => e.type === 'phase' && e.phase === 3 && e.sprite === 'oracle_true'));
  assert.ok(seen.some((e) => e.type === 'break' && e.target === o.uid));
  assert.ok(b.unit('hero').fury >= Math.min(100, fury0 + 25) - 1);
  assert.deepEqual(o.weak.slice().sort(), ['ice', 'light', 'spear']);
  assert.equal(o.resist.length, 0);
  const storm = until(b, (evs) => evs.some((e) => e.type === 'telegraph' && e.skill === 'sandstorm'));
  assert.ok(storm.length > 0);
});

test('the Last Prophecy: read when the Turn is 3 actions away, pinned to the Turn; it falls on a natural Turn (Starless)', () => {
  const b = fight(['oracle'], { zone: 'ep5_lab_oracle', encounter: 'oracle', boss: true, loadout: 'ep5_lab_oracle', level: 24, rng: makeRng(5) });
  sturdy(b);
  const seen = until(b, (evs) => evs.some((e) => e.type === 'foretell'));
  const f = ofType(seen, 'foretell')[0];
  assert.ok(f.turnIn <= E5.ai.READ_AT);
  assert.equal(f.target, 'hero', 'the hero first');
  const tel = seen.find((e) => e.type === 'telegraph' && e.foretell);
  assert.equal(tel.text, "The Oracle reads Hero's star. It falls when the sky turns.");
  assert.ok(SKILLS.last_prophecy.foretold && !SKILLS.last_prophecy.answerable, "Mira's tip: a foretelling, not a decree");
  assert.deepEqual(b.state.sky.pinned.target, 'hero');
  const fall = until(b, (evs) => evs.some((e) => e.type === 'sky_turn'));
  assert.ok(fall.some((e) => e.type === 'foretell_fall' && e.target === 'hero'));
  const o = foes(b).find((u) => u.id === 'oracle');
  assert.ok(fall.some((e) => e.type === 'damage' && e.target === 'hero' && e.source === o.uid));
  assert.ok(fall.some((e) => e.type === 'status_add' && e.target === 'hero' && e.status === 'nameless'));
  assert.ok(fall.some((e) => e.type === 'message' && e.text === 'Hero falls from the chart.'));
  assert.equal(b.state.sky.pinned, null);
});

test('the Last Prophecy: Turn the Sky breaks it (the Oracle is Broken), a Break cancels it, Answer says why it cannot', () => {
  const pin = (seed) => {
    const b = fight(['oracle'], { zone: 'ep5_lab_oracle', encounter: 'oracle', boss: true, loadout: 'ep5_lab_oracle', level: 24, rng: makeRng(seed) });
    sturdy(b);
    until(b, (evs) => evs.some((e) => e.type === 'foretell'));
    b.state.sky.turnIn = 12;   // keep it pinned while the test walks to the member it needs
    return b;
  };
  let b = pin(5);
  const o = foes(b)[0];
  untilTurn(b, 'mira');
  assert.ok(b.state.sky.pinned, "still pinned on Mira's turn");
  const evs = b.perform({ type: 'skill', skill: 'turn_sky' });
  assert.ok(evs.some((e) => e.type === 'foretell_broken' && e.reason === 'turned'));
  assert.ok(evs.some((e) => e.type === 'message' && e.text === 'The words change.'));
  assert.ok(evs.some((e) => e.type === 'break' && e.target === o.uid));
  assert.equal(b.state.sky.pinned, null);
  // a Break by damage cancels it too
  b = pin(5);
  const o2 = foes(b)[0];
  const ctxBreak = b.state.sky.pinned;
  assert.ok(ctxBreak);
  o2.shields = 1;
  untilTurn(b, 'bram');
  assert.ok(b.state.sky.pinned, "still pinned on Bram's turn");
  const e2 = b.perform({ type: 'attack', target: o2.uid });   // Bram's spear: a weakness
  assert.ok(e2.some((e) => e.type === 'break' && e.target === o2.uid));
  assert.ok(e2.some((e) => e.type === 'foretell_broken' && e.reason === 'break'));
  // Answer: a plain light hit, and the message names the difference
  b = pin(5);
  const o3 = foes(b)[0];
  untilTurn(b, 'hero');
  assert.ok(b.state.sky.pinned, "still pinned on the hero's turn");
  const e3 = b.perform({ type: 'skill', skill: 'answer', target: o3.uid });
  assert.ok(e3.some((e) => e.type === 'message' && e.text === 'A foretelling is not a decree. Nothing is written yet.'));
  assert.ok(b.state.sky.pinned, 'the reading stands');
});

test('Auto: careful play turns the sky to break a pinned reading; reckless and naive never turn it; quiet outside Episode 5', () => {
  const evs = playOut(fight(['oracle'], { zone: 'ep5_lab_oracle', encounter: 'oracle', boss: true, loadout: 'ep5_lab_oracle', level: 24, rng: makeRng(2),
    inv: { hourglass_sand: 4, hi_ether: 5 } }));
  assert.ok(evs.some((e) => e.type === 'foretell_broken' && e.reason === 'turned'));
  for (const pol of ['reckless', 'naive']) {
    const ev2 = playOut(fight(['oracle'], { zone: 'ep5_lab_oracle', encounter: 'oracle', boss: true, loadout: 'ep5_lab_oracle', level: 24, rng: makeRng(2),
      inv: { hourglass_sand: 4 } }), pol);
    assert.ok(!ev2.some((e) => e.type === 'sky_turn' && !e.natural), `${pol} never turns the sky`);
    assert.ok(!ev2.some((e) => e.type === 'message' && e.kind === 'sky_hold'), `${pol} never holds it`);
  }
  // outside Episode 5 the rule returns null at once
  const b = battle(['briar_wolf'], { seed: 1, level: 5 });
  b.begin();
  assert.equal(E5.ai.ep5Policy(b, b.living('party')[0]), null);
  assert.ok(POLICY_EXT.includes(E5.ai.ep5Policy));
});

test('items, uniques, set, affix tier 7, rare names, loot tables and shops', () => {
  for (const id of Object.keys(E5.items.EP5_KEY_ITEMS)) assert.ok(KEY_ITEMS[id] && ITEMS[id].kind === 'key', id);
  assert.equal(Object.keys(E5.items.EP5_KEY_ITEMS).length, 8);
  for (const [id, it] of Object.entries(E5.items.EP5_EQUIPMENT)) {
    assert.ok(EQUIPMENT[id], id);
    assert.ok(it.tier === 9 ? it.ilvl === 21 : it.tier === 10 && it.ilvl === 23, `${id} tier/ilvl`);
  }
  assert.equal(Object.keys(E5.items.EP5_EQUIPMENT).length, 16);
  for (const id of Object.keys(E5.items.EP5_UNIQUES)) assert.ok(UNIQUES[id] && !EQUIPMENT[id], `${id} placed, never random`);
  assert.deepEqual(SETS.nomads_way.pieces, ['nomad_wraps', 'nomad_mantle']);
  assert.equal(Object.values(AFFIXES).filter((a) => a.tiers.length === 7).length, before.affixT6);
  for (const a of Object.values(AFFIXES).filter((x) => x.tiers.length === 7)) {
    const [l, lo, hi] = a.tiers[6];
    assert.equal(l, 22); assert.ok(lo >= a.tiers[5][1] && hi >= lo);
    if (/^res[A-Z]/.test(a.stat)) assert.ok(hi <= 100);
  }
  assert.ok(RARE_NAME_EXT.some(([l, w]) => l === 22 && w.includes('Foretold')));
  for (const z of E5.enc.EP5_ZONE_ORDER) assert.ok(ZONE_LOOT[z], z);
  assert.equal(BOSS_LOOT.mirage_knight.unique, 'horizon_glass');
  assert.equal(BOSS_LOOT.oracle.unique, 'oracle_mask');
  assert.equal(SHOPS.copperwind.stock.filter((s) => s.ifFlag === 'lab_f2_done').length, 8);
  for (const s of Object.values(E5.shops.EP5_SHOPS)) for (const x of s.stock) assert.ok(ITEMS[x.item], `${s.id}: ${x.item}`);
  assert.ok(SHOPS.pathkeeper.stock.some((x) => x.item === 'hourglass_sand'));
  assert.deepEqual(ENCOUNTERS.oracle.startFury.flag, 'moonwell_woken');
  assert.equal(ENCOUNTERS.oracle.startFury.amount, 20);
  for (const id of Object.keys(E5.skills.EP5_SKILLS)) assert.ok(SKILLS[id].help.length <= 40, id);
});

test('no em dashes in the Episode 5 battle data', async () => {
  const fs = await import('node:fs');
  for (const f of ['enemies', 'encounters', 'items', 'loot', 'shops', 'skills', 'ai', 'sky']) {
    const s = fs.readFileSync(new URL(`../../src/data/ep5/${f}.js`, import.meta.url), 'utf8');
    assert.ok(!s.includes(String.fromCharCode(0x2014)), f);
  }
  void WEAK_MULT;
});
