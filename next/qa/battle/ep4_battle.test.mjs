// Episode 4 combat (E4-battle; docs/EPISODE4_PLAN.md 6 and 7): the pack's battle data registers without touching Episodes 1 to 3,
// Decrees on the Heat counter (Stamp, the void by fire, Lamp Oil and a Break), Answer, the Inkbound Barrister and its witness,
// the Paper Regent's three phases, the writs and the Royal Ward, Strike from the Roll, Auto, items, loot and shops.
// Balance targets: ep4_sim.test.mjs (and `node tools/sim/simulate.mjs --check`).
import test from 'node:test';
import assert from 'node:assert/strict';
import { battle, untilTurn, midRng, ofType, playOut } from './_helpers.mjs';
import { createEncounterBattle, makeRng } from '../../src/battle/rules.js';
import { partyAction, SCRIPTS, POLICY_EXT } from '../../src/battle/ai.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { SKILLS, DAMAGE_TYPES, ENEMY_TYPES } from '../../src/data/skills.js';
import { ITEMS, EQUIPMENT, UNIQUES, SETS, AFFIXES, KEY_ITEMS, CONSUMABLES } from '../../src/data/items.js';
import { ZONES, ENCOUNTERS, ZONE_ORDER, EP2_ZONE_ORDER, EP3_ZONE_ORDER } from '../../src/data/encounters.js';
import { SHOPS, shopStock } from '../../src/data/shops.js';
import { ZONE_LOOT, BOSS_LOOT } from '../../src/data/loot-tables.js';
import { knownSkills, newMember } from '../../src/data/party.js';

// Snapshots of core data before the pack registers (the register() calls below must only add).
const before = {
  enemies: new Set(Object.keys(ENEMIES)), skills: new Set(Object.keys(SKILLS)), items: new Set(Object.keys(ITEMS)),
  zones: Object.keys(ZONES).slice(), orders: JSON.stringify([ZONE_ORDER, EP2_ZONE_ORDER, EP3_ZONE_ORDER]),
  beetle: JSON.stringify(ENEMIES.cinder_beetle), stoke: JSON.stringify(SKILLS.stoke), pk: SHOPS.pk_smithy.stock.length,
  affixT5: Object.values(AFFIXES).filter((a) => a.tiers.length === 5).length,
};

const { makeParty } = await import('../../tools/sim/simulate.mjs');
(await import('../../tools/sim/ep4.mjs')).registerData();   // the ep4 battle data, as the pack adds it
const { LOADOUTS } = await import('../../tools/sim/loadouts.mjs');
const { EP4_ZONE_ORDER, EP4_MAPS_LISTED, EP4_ZONES } = await import('../../src/data/ep4/encounters.js');
const { ep4Policy, answerablePending } = await import('../../src/data/ep4/ai.js');
const E4 = { enemies: await import('../../src/data/ep4/enemies.js'), skills: await import('../../src/data/ep4/skills.js'),
  items: await import('../../src/data/ep4/items.js'), loot: await import('../../src/data/ep4/loot.js'), shops: await import('../../src/data/ep4/shops.js') };

const FLAGS = ['bram_memory_3', 'hero_signed'];
const sturdy = (b) => { for (const u of b.living('party')) u.hp = u.maxHp = 99999; return b; };
const regent = (opts = {}) => battle(['paper_regent'], { rng: midRng, party: makeParty('ep4_keep_crown', 20),
  options: { boss: true, flags: FLAGS, inventory: { hi_potion: 4, lamp_oil: 2 }, ...opts } });
const barrister = () => battle(['barrister'], { rng: midRng, party: makeParty('ep4_keep_f2', 19), options: { boss: true, flags: ['bram_memory_3'] } });
const bloom = (opts = {}) => battle(['ink_bloom'], { rng: makeRng(opts.seed || 7), party: makeParty('ep4_flood_road', 17),
  options: { flags: ['bram_memory_3'], inventory: { lamp_oil: 2, potion: 3 }, ...opts } });
/** Party defends, enemies act, until `pred(events)` holds. Returns every event seen. */
function until(b, pred, max = 200) {
  const seen = [];
  for (let i = 0; i < max && !b.isOver(); i++) {
    const u = b.current();
    const evs = u.side === 'party' ? b.perform({ type: 'defend' }) : b.runEnemyTurn();
    seen.push(...evs);
    if (pred(evs, b)) return seen;
  }
  throw new Error('condition never met');
}

test('Episode 4 ids are registered and Episodes 1 to 3 are untouched', () => {
  for (const id of [...E4.enemies.EP4_FOES, ...E4.enemies.EP4_BOSSES, ...E4.enemies.EP4_ADDS]) assert.ok(ENEMIES[id], id);
  for (const id of ['e4r_first', 'e4r_hounds', 'e4r_crabs', 'e4r_mixed', 'e4k1_watch', 'e4k1_blooms', 'e4k1_crabs', 'e4k1_mixed',
    'e4k2_phantoms', 'e4k2_sentinel', 'e4k2_mixed', 'barrister', 'e4k3_decrees', 'e4k3_watch', 'e4k3_sentinels', 'paper_regent']) assert.ok(ENCOUNTERS[id], id);
  for (const z of EP4_ZONE_ORDER) { assert.ok(ZONES[z], z); assert.equal(ZONES[z].episode, 4); }
  assert.equal(EP4_MAPS_LISTED, false);
  assert.ok(!Object.keys(ZONES).some((z) => z.startsWith('ep4_')), 'the Episode 4 zones stay out of Object.keys(ZONES) until E4-maps-b lists them');
  for (const z of before.zones) assert.ok(ZONES[z], z);
  assert.equal(JSON.stringify([ZONE_ORDER, EP2_ZONE_ORDER, EP3_ZONE_ORDER]), before.orders);
  assert.equal(JSON.stringify(ENEMIES.cinder_beetle), before.beetle);
  assert.equal(JSON.stringify(SKILLS.stoke), before.stoke);
  for (const id of before.enemies) assert.ok(ENEMIES[id]);
  for (const id of ['answer', 'stamp', 'runoff', 'edict', 'objection', 'flood_decree', 'strike_roll', 'trident_sweep', 'wet_seal', 'breach']) {
    assert.ok(SKILLS[id], id); assert.ok(!before.skills.has(id), `${id} was free`);
  }
  for (const id of ['lamp_oil', 'running_decree', 'lock_crank', 'tide_key', 'seal_key', 'name_fragment_4', 'nilo_bell', 'regents_seal',
    'barristers_quill', 'tidewarden_trident', 'regents_pardon', 'tidewarden_spear', 'ferrymans_charm', 'tidewalker_boots', 'tidewalker_mantle']) {
    assert.ok(ITEMS[id], id); assert.ok(!before.items.has(id), `${id} was free`);
  }
  for (const id of ['countersign', 'witness_seal', 'last_decree']) assert.ok(!Object.keys(E4.items.EP4_UNIQUES).includes(id));
  // registering twice changes nothing
  const n = [Object.keys(ENEMIES).length, Object.keys(SKILLS).length, Object.keys(ITEMS).length, POLICY_EXT.length, SHOPS.pk_smithy.stock.length];
  E4.enemies.register(); E4.skills.register(); E4.items.register(); E4.loot.register(); E4.shops.register();
  assert.deepEqual([Object.keys(ENEMIES).length, Object.keys(SKILLS).length, Object.keys(ITEMS).length, POLICY_EXT.length, SHOPS.pk_smithy.stock.length], n);
  assert.equal(SHOPS.pk_smithy.stock.length, before.pk + 2);
});

test('Episode 4 data passes the core data rules (types, help length, scripts)', () => {
  for (const id of Object.keys(E4.skills.EP4_SKILLS)) {
    const s = SKILLS[id];
    assert.ok(s.help && s.help.length <= 40, `${id} help "${s.help}"`);
    for (const t of s.types) assert.ok(DAMAGE_TYPES.includes(t) || ENEMY_TYPES.includes(t), `${id} type ${t}`);
    for (const ch of JSON.stringify(s)) assert.ok(ch.charCodeAt(0) < 128, `${id} ASCII`);
  }
  for (const id of Object.keys(E4.enemies.EP4_ENEMIES)) {
    const e = ENEMIES[id];
    for (const t of [...e.weak, ...e.resist, ...e.immune]) assert.ok(DAMAGE_TYPES.includes(t), `${id} ${t}`);
    for (const m of e.moves) assert.ok(SKILLS[m.skill], `${id} move ${m.skill}`);
    assert.ok(SCRIPTS[e.ai], `${id} ai ${e.ai}`);
    if (e.heat) { assert.equal(e.heat.quench, 'fire'); assert.equal(e.heat.word, 'Voided!'); assert.equal(e.heat.sfx, 'decree_void'); assert.ok(SKILLS[e.heat.flare].decree); }
    if (e.phases) for (const p of e.phases) for (const t of [...p.weak, ...p.resist]) assert.ok(DAMAGE_TYPES.includes(t));
  }
  for (const id of EP4_ZONE_ORDER) for (const [enc] of EP4_ZONES[id].plan) assert.ok(ENCOUNTERS[enc], enc);
});

test('Decrees: Stamp adds a Seal (+15% ATK and MAG), 3 Seals announce the decree, fire voids it', () => {
  const b = bloom();
  const bl = b.living('enemy')[0];
  const seen = until(b, (evs) => evs.some((e) => e.type === 'heat' && e.target === bl.uid && e.heat === 1));
  assert.ok(seen.some((e) => e.type === 'action_start' && e.action.skill === 'stamp'), 'the Bloom opens with Stamp');
  assert.equal(bl.heat, 1);
  until(b, (evs) => evs.some((e) => e.type === 'telegraph' && e.actor === bl.uid));
  assert.equal(bl.heat, 3);
  assert.equal(bl.charging.skill, 'runoff');
  assert.equal(answerablePending(bl), 'runoff');
  // Mira's Ember voids it
  untilTurn(b, 'mira');
  const evs = b.perform({ type: 'skill', skill: 'ember', target: bl.uid });
  const q = ofType(evs, 'quench')[0];
  assert.ok(q, 'fire voided the decree');
  assert.equal(q.sfx, 'decree_void'); assert.equal(q.cancelled, 'runoff');
  assert.ok(evs.some((e) => e.type === 'message' && e.text === 'Voided!'));
  assert.equal(bl.heat, 0); assert.equal(bl.charging, null);
});

test('Lamp Oil: a fixed fire hit that always voids the Seals', () => {
  const b = bloom();
  const bl = b.living('enemy')[0];
  until(b, (evs) => evs.some((e) => e.type === 'heat' && e.heat >= 1));
  untilTurn(b, 'hero');
  const evs = b.perform({ type: 'item', item: 'lamp_oil', target: bl.uid });
  assert.ok(ofType(evs, 'damage').some((e) => e.target === bl.uid && e.types.includes('fire')));
  assert.ok(ofType(evs, 'quench').length === 1);
  assert.equal(bl.heat, 0);
  assert.equal(CONSUMABLES.lamp_oil.price, 110);
});

test('Answer: learned with hero_signed, voids a pending decree and Breaks; with nothing pending it is a light hit', () => {
  const m = newMember('hero', { level: 20 });
  assert.ok(!knownSkills(m, []).includes('answer'));
  assert.ok(knownSkills(m, ['hero_signed']).includes('answer'));
  const b = bloom({ flags: ['hero_signed'] });
  const bl = b.living('enemy')[0];
  until(b, (evs) => evs.some((e) => e.type === 'telegraph' && e.actor === bl.uid));
  untilTurn(b, 'hero');
  const evs = b.perform({ type: 'skill', skill: 'answer', target: bl.uid });
  const a = ofType(evs, 'answer')[0];
  assert.ok(a && a.voided === 'runoff' && a.broke && a.seals === 3);
  assert.ok(ofType(evs, 'break').length >= 1 || bl.broken === false, 'Broken (or already recovered)');
  assert.ok(evs.some((e) => e.type === 'message' && /answers to their name/.test(e.text)));
  assert.equal(bl.charging, null);
  // nothing pending: still a light hit, the Seals (if any) go
  const b2 = bloom({ flags: ['hero_signed'] });
  untilTurn(b2, 'hero');
  const f = b2.living('enemy')[0];
  const e2 = b2.perform({ type: 'skill', skill: 'answer', target: f.uid });
  assert.ok(ofType(e2, 'damage').some((e) => e.target === f.uid && e.types.includes('light')));
  assert.equal(ofType(e2, 'answer')[0].broke, false);
});

test('the Barrister stamps every turn, objects at 3 Seals and calls one witness at 50%', () => {
  const b = barrister();
  sturdy(b);
  const br = b.living('enemy')[0];
  const seen = until(b, (evs) => evs.some((e) => e.type === 'telegraph' && e.skill === 'objection'));
  assert.ok(ofType(seen, 'heat').some((e) => e.reason === 'stamp'), 'its end-of-turn stamp');
  assert.ok(br.statuses.haste, 'it argues fast');
  br.hp = Math.floor(br.maxHp * 0.5) + 5;
  untilTurn(b, 'hero');
  const evs = b.perform({ type: 'attack', target: br.uid });
  const w = ofType(evs, 'summon').find((e) => e.id === 'barrister_witness');
  assert.ok(w, 'a witness is called');
  assert.ok(evs.some((e) => e.kind === 'witness'));
  br.hp = Math.floor(br.maxHp * 0.3);
  untilTurn(b, 'hero');
  const again = b.perform({ type: 'attack', target: br.uid });
  assert.ok(!ofType(again, 'summon').length, 'only once');
});

test('the Paper Regent: HP lock at 70%, the writs and the Royal Ward, the ward breaks into phase 3', () => {
  const b = regent();
  sturdy(b);
  const r = b.living('enemy')[0];
  assert.equal(r.ai.phase, 0);
  assert.ok(r.mods.some((m) => m.source === 'regent_armor' && m.stat === 'def'), 'DEF x1.4 in Forged Edicts');
  untilTurn(b, 'bram');
  r.hp = Math.floor(r.maxHp * 0.7) + 10;
  let evs = b.perform({ type: 'attack', target: r.uid });
  assert.equal(r.hp, Math.floor(r.maxHp * 0.7), 'one hit never skips a phase');
  assert.equal(r.ai.phase, 1); assert.ok(r.ai.ward);
  const writs = b.living('enemy').filter((e) => e.id.startsWith('writ_'));
  assert.deepEqual(writs.map((w) => w.id).sort(), ['writ_oblivion', 'writ_silence']);
  // under the ward: 25% damage, shields locked, HP stops at 31%
  untilTurn(b, 'bram');
  r.hp = Math.floor(r.maxHp * 0.31) + 5;
  const sh = r.shields;
  evs = b.perform({ type: 'attack', target: r.uid });
  assert.equal(r.shields, sh, 'shields cannot be chipped under the ward');
  assert.equal(r.hp, Math.floor(r.maxHp * 0.31));
  // fell both writs: the ward breaks, the Regent is Broken, the party gains 25 Fury, phase 3
  for (const p of b.living('party')) p.fury = 0;
  writs[0].hp = 1;
  untilTurn(b, 'bram');
  b.perform({ type: 'attack', target: writs[0].uid });
  assert.ok(r.ai.ward, 'one writ still stands');
  writs[1].hp = 1;
  untilTurn(b, 'bram');
  evs = b.perform({ type: 'attack', target: writs[1].uid });
  assert.ok(!r.ai.ward); assert.equal(r.ai.phase, 2);
  assert.ok(evs.some((e) => e.kind === 'ward_break'));
  assert.ok(ofType(evs, 'break').some((e) => e.target === r.uid));
  for (const p of b.living('party')) assert.ok(p.fury >= 25, `${p.uid} fury ${p.fury}`);
  assert.ok(r.statuses.haste);
  assert.ok(!r.mods.some((m) => m.source === 'regent_armor'), 'DEF back to normal');
  assert.ok(r.weak.includes('light'));
});

test('Strike from the Roll: announced on the hero every 3rd turn; it lands as Nameless unless Answered', () => {
  const b = regent();
  sturdy(b);
  const r = b.living('enemy')[0];
  r.ai.phase = 2; r.ai.strikeAt = r.ai.turns + 1;   // straight to the True Charter's beat
  const seen = until(b, (evs) => evs.some((e) => e.type === 'telegraph' && e.skill === 'strike_roll'));
  const t = ofType(seen, 'telegraph').find((e) => e.skill === 'strike_roll');
  assert.equal(t.target, 'hero');
  assert.match(t.text, /name on it/);
  // nobody answers: the hero is struck from the roll
  const after = until(b, (evs) => evs.some((e) => e.type === 'action_start' && e.charged && e.action.skill === 'strike_roll'));
  assert.ok(ofType(after, 'status_add').some((e) => e.target === 'hero' && e.status === 'nameless'));
  assert.ok(r.mods.some((m) => m.source === 'roll1'), 'the Regent grows stronger');
  // a second fight: the hero Answers the announced Strike (Auto does it too)
  const b2 = regent();
  sturdy(b2);
  const r2 = b2.living('enemy')[0];
  r2.ai.phase = 2; r2.ai.strikeAt = r2.ai.turns + 1;
  until(b2, (evs) => evs.some((e) => e.type === 'telegraph' && e.skill === 'strike_roll'));
  untilTurn(b2, 'hero');
  const act = partyAction(b2, 'competent');
  assert.deepEqual(act, { type: 'skill', skill: 'answer', target: r2.uid });
  const evs = b2.perform(act);
  const a = ofType(evs, 'answer')[0];
  assert.ok(a && a.voided === 'strike_roll' && a.broke);
  assert.equal(r2.charging, null);
});

test('Answer guards the hero from Nameless until the hero next acts', () => {
  const b = regent();
  sturdy(b);
  const r = b.living('enemy')[0];
  r.ai.phase = 2;
  untilTurn(b, 'hero');
  b.perform({ type: 'skill', skill: 'answer', target: r.uid });
  r.charging = { skill: 'strike_roll', target: 'hero' };   // a Strike announced right after the Answer
  const evs = [];
  for (let i = 0; i < 20; i++) {
    const u = b.current();
    assert.notEqual(u.uid, 'hero', 'the Strike fires before the hero acts again');
    const e = u.side === 'party' ? b.perform({ type: 'defend' }) : b.runEnemyTurn();
    evs.push(...e);
    if (e.some((x) => x.type === 'action_start' && x.charged && x.action.skill === 'strike_roll')) break;
  }
  assert.ok(evs.some((e) => e.kind === 'name_hold'), 'the name holds');
  assert.ok(!ofType(evs, 'status_add').some((e) => e.status === 'nameless' && e.target === 'hero'));
});

test('Auto voids a foe at 2 Seals and stays silent outside Episode 4', () => {
  const b = bloom();
  const bl = b.living('enemy')[0];
  until(b, () => bl.heat >= 2 && b.current().uid === 'mira', 120);
  assert.deepEqual(partyAction(b, 'competent'), { type: 'skill', skill: 'ember', target: bl.uid });
  assert.equal(ep4Policy(b, b.current(), { ignoreTelegraphs: true }), null, 'reckless play does not read Seals');
  const e3 = battle(['cinder_beetle'], { rng: midRng, party: makeParty('sand_road', 13) });
  for (let i = 0; i < 20 && !e3.isOver(); i++) {
    const u = e3.current();
    if (u.side === 'party') assert.equal(ep4Policy(e3, u, {}), null);
    u.side === 'party' ? e3.perform({ type: 'defend' }) : e3.runEnemyTurn();
  }
});

test('the boss encounters: no flee, flags, the records Fury, boss loot', () => {
  const r = createEncounterBattle('paper_regent', { party: makeParty('ep4_keep_crown', 20), rng: makeRng(3), flags: ['council_records'] });
  assert.equal(r.encounter.flag, 'paper_regent_defeated');
  assert.equal(r.encounter.startFury, 25);
  assert.ok(r.battle.living('party').every((p) => p.fury >= 25));
  assert.equal(ENCOUNTERS.barrister.flag, 'barrister_defeated');
  assert.ok(ENCOUNTERS.barrister.noFlee && ENCOUNTERS.paper_regent.noFlee);
  assert.equal(BOSS_LOOT.barrister.unique, 'barristers_quill');
  assert.equal(BOSS_LOOT.paper_regent.unique, 'regents_seal');
  assert.equal(BOSS_LOOT.paper_regent.rolls, 2);
  // a careful party beats the Regent on Auto at Lv 20 with the throne loadout's bag
  const fight = battle(['paper_regent'], { rng: makeRng(5), party: makeParty('ep4_keep_crown', 20),
    options: { boss: true, flags: FLAGS, inventory: { ...LOADOUTS.ep4_keep_crown.inventory } } });
  const evs = playOut(fight);
  assert.equal(fight.result().outcome, 'victory');
  assert.ok(evs.some((e) => e.type === 'phase' && e.phase === 3));
});

test('items, loot and shops', () => {
  for (const [id, it] of Object.entries(E4.items.EP4_EQUIPMENT)) {
    assert.ok(EQUIPMENT[id]); assert.ok(it.ilvl >= 18, `${id}: no Episode 4 base enters an Episode 3 pool (ilvl <= 17)`);
    assert.ok([7, 8].includes(it.tier));
  }
  for (const id of Object.keys(E4.items.EP4_UNIQUES)) assert.ok(UNIQUES[id] && !EQUIPMENT[id], `${id} is placed, never random`);
  assert.deepEqual(SETS.tidewalkers_way.pieces, ['tidewalker_boots', 'tidewalker_mantle']);
  assert.ok(KEY_ITEMS.tide_key.counted);
  assert.equal(Object.values(AFFIXES).filter((a) => a.tiers.length === 6).length, before.affixT5, 'every five-tier affix gained a sixth');
  for (const a of Object.values(AFFIXES)) if (a.tiers.length === 6) { assert.equal(a.tiers[5][0], 18); if (/^res/.test(a.stat)) assert.ok(a.tiers[5][2] <= 100); }
  for (const z of EP4_ZONE_ORDER) assert.ok(ZONE_LOOT[z], z);
  for (const id of ['ferry_peddler', 'riverbank', 'vw_forge']) for (const s of SHOPS[id].stock) assert.ok(ITEMS[s.item], `${id} ${s.item}`);
  assert.ok(!shopStock('vw_forge', []).some((s) => s.item === 'crownguard_sword'));
  assert.ok(shopStock('vw_forge', ['keep_f2_done']).some((s) => s.item === 'crownguard_sword'));
  assert.ok(shopStock('pk_smithy', ['foundry_f2_done', 'forge_relit', 'ep4_complete']).some((s) => s.item === 'riverguard_halberd'));
  assert.ok(!shopStock('pk_smithy', ['foundry_f2_done', 'forge_relit']).some((s) => s.item === 'riverguard_halberd'));
});

test('a full-HP party at the expected level survives any single non-telegraphed Episode 4 action (DESIGN 7)', async () => {
  const { memberStats, DEF_K, VARIANCE, CRIT_MULT, ENEMY_CRIT } = await import('../../src/battle/rules.js');
  const { ELITE_BASE } = await import('../../src/data/enemies.js');
  const { progression } = await import('../../tools/sim/ep4.mjs');
  const entry = Object.fromEntries(progression(1).map((p) => [p.zone, p.startLevel]));
  const cases = [];
  for (const z of EP4_ZONE_ORDER) for (const [enc] of EP4_ZONES[z].plan) for (const id of ENCOUNTERS[enc].enemies) cases.push([id, z, ENCOUNTERS[enc].power || 1]);
  cases.push(['barrister_witness', 'ep4_keep_f2', 1], ['writ_silence', 'ep4_keep_crown', 1], ['writ_oblivion', 'ep4_keep_crown', 1]);
  for (const [id, zone, power] of cases) {
    const e = ENEMIES[id];
    const boost = (e.boss || ENEMIES[id].exp === 0 ? 1 : ELITE_BASE.atk) * power;
    const moves = [...e.moves, ...((e.phases || []).flatMap((p) => p.moves || []))];
    for (const level of [entry[zone], entry[zone] - 1]) {
      for (const m of makeParty(zone, level)) {
        const s = memberStats(m);
        for (const mv of moves) {
          const sk = SKILLS[mv.skill];
          if (!sk.power) continue;
          const phys = sk.formula === 'phys';
          let max = (phys ? e.atk : e.mag) * boost * sk.power / 100 * DEF_K / (DEF_K + (phys ? s.def : s.spr)) * (1 + VARIANCE) * (sk.hits || 1);
          if (phys && ENEMY_CRIT > 0) max *= CRIT_MULT;
          assert.ok(Math.ceil(max) < s.maxHp, `${id} ${sk.id} can deal ${Math.ceil(max)} to ${m.id} (${s.maxHp} HP) at Lv ${level}`);
        }
      }
    }
  }
});
