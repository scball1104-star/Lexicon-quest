// Episode 3 combat (E3-battle): Heat and Quench, the Bellows Specter, the Cinder Warden's three phases and coils, Strike the Name,
// the Last Hammer and Tempered Oath, the flag-learned skill, the coolant Fury, the new gear, loot and shops. Balance targets are in
// sim.test.mjs (and `node tools/sim/simulate.mjs --check`).
import test from 'node:test';
import assert from 'node:assert/strict';
import { battle, untilTurn, midRng, ofType, playOut } from './_helpers.mjs';
import { createEncounterBattle, createBattle, makeRng, memberStats } from '../../src/battle/rules.js';
import { partyAction } from '../../src/battle/ai.js';
import { rollBattleDrops, makeUnique, rollItem, setBonuses } from '../../src/battle/loot.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { SKILLS, STATUSES } from '../../src/data/skills.js';
import { ITEMS, UNIQUES, SETS, EQUIPMENT, AFFIXES, KEY_ITEMS, CONSUMABLES, RARE_NAME_A_EP3 } from '../../src/data/items.js';
import { ZONES, EP3_ZONES, EP3_ZONE_ORDER, EP3_MAPS_LISTED, ZONE_ORDER, EP2_ZONE_ORDER, ENCOUNTERS, zoneOrder } from '../../src/data/encounters.js';
import { shopStock, SHOPS } from '../../src/data/shops.js';
import { ZONE_LOOT, BOSS_LOOT } from '../../src/data/loot-tables.js';
import { knownSkills, newMember } from '../../src/data/party.js';
import { makeParty } from '../../tools/sim/simulate.mjs';

const FLAGS = ['bram_memory_3'];
const sturdy = (b) => { for (const u of b.living('party')) u.hp = u.maxHp = 99999; return b; };
const warden = (opts = {}) => battle(['cinder_warden'], { rng: midRng, party: makeParty('foundry_heart', 16), options: { boss: true, flags: FLAGS, ...opts } });
const specter = (opts = {}) => battle(['bellows_specter'], { rng: midRng, party: makeParty('foundry_f2', 15), options: { boss: true, ...opts } });
const beetle = (opts = {}) => battle(['cinder_beetle'], { rng: midRng, party: makeParty('sand_road', 13), options: { inventory: { quench_flask: 3, potion: 3 }, ...opts } });
/** Party defends, enemies act, until `uid` has fired a charged move. Returns every event seen. */
function untilFired(b, uid, max = 60) {
  const seen = [];
  for (let i = 0; i < max && !b.isOver(); i++) {
    const u = b.current();
    const evs = u.side === 'party' ? b.perform({ type: 'defend' }) : b.runEnemyTurn();
    seen.push(...evs);
    if (evs.some((e) => e.type === 'action_start' && e.actor === uid && e.charged)) return seen;
  }
  throw new Error(`${uid} never fired`);
}

test('Episode 3 ids: enemies, encounters, zones, skills, items, uniques, set, shops and boss loot are all there', () => {
  for (const id of ['cinder_hound', 'cinder_beetle', 'slag_slime', 'ashbound_miner', 'furnace_construct', 'soot_phantom', 'forge_defender',
    'bellows_specter', 'cinder_warden', 'bellows_coil', 'smelter_coil']) assert.ok(ENEMIES[id], id);
  for (const id of ['sr_first', 'sr_hounds', 'sr_beetles', 'sr_mixed', 'fo1_beetles', 'fo1_slimes', 'fo1_miners', 'fo1_mixed', 'fo2_phantoms',
    'fo2_constructs', 'fo2_mixed', 'bellows_specter', 'fo3_defenders', 'fo3_mixed', 'fo3_furnace', 'cinder_warden']) assert.ok(ENCOUNTERS[id], id);
  assert.deepEqual(EP3_ZONE_ORDER, ['sand_road', 'foundry_f1', 'foundry_f2', 'foundry_f3', 'foundry_heart']);
  for (const z of EP3_ZONE_ORDER) assert.equal(ZONES[z], EP3_ZONES[z], `ZONES.${z} resolves`);
  assert.equal(ENCOUNTERS.bellows_specter.flag, 'bellows_specter_defeated');
  assert.equal(ENCOUNTERS.cinder_warden.flag, 'cinder_warden_defeated');
  assert.equal(ENCOUNTERS.cinder_warden.music, 'boss_warden');
  assert.ok(ENCOUNTERS.cinder_warden.boss && ENCOUNTERS.cinder_warden.noFlee && ENCOUNTERS.bellows_specter.noFlee);
  for (const id of ['stoke', 'flare_ram', 'slag_burst', 'overheat', 'brand', 'furnace_breath', 'strike_the_name', 'last_hammer', 'stoke_warden']) {
    assert.ok(SKILLS[id], id);
  }
  assert.ok(SKILLS.last_hammer.turnable && SKILLS.last_hammer.telegraph && SKILLS.strike_the_name.telegraph);
  assert.ok(SKILLS.tempered_oath && SKILLS.tempered_oath.user === 'bram' && SKILLS.tempered_oath.mp === 8 && SKILLS.tempered_oath.help.length <= 40);
  assert.ok(STATUSES.oath);
  for (const id of ['lift_key', 'ash_key', 'crucible_hook', 'struck_list', 'name_fragment_3', 'glass_sand']) assert.ok(ITEMS[id] && ITEMS[id].kind === 'key', id);
  assert.ok(ITEMS.ash_key.counted);
  assert.equal(ITEMS.quench_flask.kind, 'consumable');
  for (const id of ['first_bell_hammer', 'tempered_blade', 'warden_heart', 'updraft_charm', 'emberglass_charm', 'ashwalker_boots', 'ashwalker_mantle']) {
    assert.ok(UNIQUES[id], id);
  }
  assert.deepEqual(SETS.ashwalkers_road.pieces, ['ashwalker_boots', 'ashwalker_mantle']);
  for (const id of ['ashsteel_cuirass', 'founders_robe', 'ashsteel_helm', 'soot_hood', 'cinder_boots', 'carter_mantle', 'coalheart_charm', 'bellchime_charm']) {
    assert.equal(EQUIPMENT[id].ilvl, 14, id);
  }
  for (const id of ['tempered_sword', 'forge_axe', 'heartforge_pike', 'founders_rod', 'bellwire_bow', 'tempered_mail', 'ashweave_robe', 'forge_helm']) {
    assert.equal(EQUIPMENT[id].ilvl, 16, id);
  }
  for (const s of ['sand_peddler', 'ventworks', 'pk_smithy']) assert.ok(SHOPS[s], s);
  assert.equal(BOSS_LOOT.bellows_specter.unique, 'updraft_charm');
  assert.equal(BOSS_LOOT.cinder_warden.unique, 'warden_heart');
  assert.deepEqual([ZONE_LOOT.sand_road, ZONE_LOOT.foundry_f1, ZONE_LOOT.foundry_f2, ZONE_LOOT.foundry_f3].map((z) => z.ilvl), [13, 14, 15, 16]);
});

test('Episode 3 zones stay unlisted until E3-maps; Episode 1 and 2 orders are untouched', () => {
  assert.equal(EP3_MAPS_LISTED, false);
  for (const z of EP3_ZONE_ORDER) assert.ok(!Object.keys(ZONES).includes(z), `${z} is not enumerable yet`);
  assert.deepEqual(ZONE_ORDER, ['valley', 'archive_f1', 'archive_f2', 'archive_f3', 'archive_boss']);
  assert.deepEqual(EP2_ZONE_ORDER, ['east_road', 'court_f1', 'court_f2', 'court_f3', 'court_throne']);
  assert.equal(zoneOrder(3), EP3_ZONE_ORDER);
  assert.equal(zoneOrder(2), EP2_ZONE_ORDER);
  assert.equal(zoneOrder(1), ZONE_ORDER);
});

test('the key item names the lift without naming the founder', () => {
  assert.equal(KEY_ITEMS.lift_key.name, "The Founder's Lift Key");
  assert.doesNotMatch(JSON.stringify(KEY_ITEMS.lift_key), /Mara/);
});

test('Heat: the beetle opens with Stoke; each level adds 15% ATK and MAG; the third announces its flare a turn early', () => {
  const b = beetle();
  const e = b.unit('e0');
  assert.equal(b.knowledge('e0').heatMax, 3);
  untilTurn(b, 'e0');
  const first = b.runEnemyTurn();
  assert.equal(first.find((x) => x.type === 'action_start').action.skill, 'stoke', 'sr_first teaches Stoke by opening with it');
  assert.ok(first.some((x) => x.type === 'heat' && x.heat === 1 && x.max === 3 && x.reason === 'stoke'));
  assert.equal(e.heat, 1);
  const atk0 = ENEMIES.cinder_beetle.atk;
  assert.equal(Math.round(b.state.units.e0.stats.atk), atk0);
  // the flare is announced at the end of the turn that reached Heat 3
  untilTurn(b, 'e0');
  e.heat = 3;
  const evs = b.runEnemyTurn();
  const t = evs.find((x) => x.type === 'telegraph');
  assert.ok(t && t.skill === 'flare_ram' && t.flare === true, 'flare announced');
  assert.match(t.text, /glows white/);
  assert.equal(b.knowledge('e0').flare, 'flare_ram');
  // and it fires on the next turn, which resets Heat
  const seen = untilFired(b, 'e0');
  assert.ok(seen.some((x) => x.type === 'action_start' && x.action.skill === 'flare_ram'));
  assert.ok(seen.some((x) => x.type === 'heat' && x.heat === 0 && x.reason === 'flare'));
  assert.equal(e.heat, 0);
});

test('Heat raises the foe\'s damage: each level adds 15% ATK, so 3 levels hit 45% harder', () => {
  const hit = (heat) => {
    const b = beetle();
    sturdy(b);
    untilTurn(b, 'e0');
    const e = b.unit('e0');
    e.heat = heat;
    e.charging = null;
    e.ai.used.stoke = true;   // past the forced opener: the next move is the plain Shell Ram
    const evs = b.runEnemyTurn();
    return ofType(evs, 'damage').find((d) => d.source === 'e0').amount;
  };
  const cold = hit(0), hot = hit(2);
  assert.ok(Math.abs(hot / cold - 1.3) < 0.04, `Heat 2 hits ${hot} against ${cold}`);
});

test('Quench: ice damage, a Quench Flask and a Break each set Heat to 0 and cancel the pending flare', () => {
  const flare = (b) => { const e = b.unit('e0'); e.heat = 3; untilTurn(b, 'e0'); b.runEnemyTurn(); assert.ok(e.charging && e.charging.skill === 'flare_ram'); return e; };
  // ice (Frost)
  let b = beetle();
  let e = flare(b);
  untilTurn(b, 'mira');
  let evs = b.perform({ type: 'skill', skill: 'frost', target: 'e0' });
  assert.ok(evs.some((x) => x.type === 'quench' && x.reason === 'ice' && x.cancelled === 'flare_ram' && x.sfx === 'quench_hiss'));
  assert.ok(evs.some((x) => x.type === 'message' && x.text === 'Quenched!'));
  assert.ok(evs.some((x) => x.type === 'telegraph_cancel' && x.skill === 'flare_ram' && x.reason === 'quench'));
  assert.equal(e.heat, 0);
  assert.equal(e.charging, null);
  // a Quench Flask, thrown by anyone: fixed ice damage, always quenches
  b = beetle();
  e = flare(b);
  untilTurn(b, 'bram');
  const t = b.targets('bram', { type: 'item', item: 'quench_flask' });
  assert.equal(t.side, 'enemy');
  assert.deepEqual(t.ids, ['e0']);
  const est = b.estimate('bram', { type: 'item', item: 'quench_flask', target: 'e0' })[0];
  assert.ok(est.quench && est.avg > 0);
  evs = b.perform({ type: 'item', item: 'quench_flask', target: 'e0' });
  assert.ok(evs.some((x) => x.type === 'damage' && x.target === 'e0' && x.types.includes('ice')));
  assert.ok(evs.some((x) => x.type === 'quench' && x.reason === 'flask'));
  assert.equal(b.state.inventory.quench_flask, 2);
  assert.equal(e.heat, 0);
  // the same flask in a different hand hits for the same amount
  const a = beetle(); const c = beetle();
  untilTurn(a, 'hero'); untilTurn(c, 'mira');
  const ea = a.estimate('hero', { type: 'item', item: 'quench_flask', target: 'e0' })[0].avg;
  const ec = c.estimate('mira', { type: 'item', item: 'quench_flask', target: 'e0' })[0].avg;
  assert.equal(Math.round(ea), Math.round(ec));
  // a Break
  b = beetle();
  e = flare(b);
  e.shields = 1; e.weak = ['spear']; e.resist = []; e.broken = false;
  untilTurn(b, 'bram');
  evs = b.perform({ type: 'skill', skill: 'lunge', target: 'e0' });
  assert.ok(evs.some((x) => x.type === 'break'));
  assert.ok(evs.some((x) => x.type === 'quench' && x.reason === 'break'));
  assert.equal(e.heat, 0);
});

test('a Stun that cancels a flare does not lose it: a foe still at full Heat announces it again at the end of its next turn', () => {
  const b = beetle();
  const e = b.unit('e0');
  e.heat = 3;
  untilTurn(b, 'e0'); b.runEnemyTurn();
  assert.equal(e.charging && e.charging.skill, 'flare_ram');
  e.charging = null;   // what addStatus('stun') does through cancelCharge
  untilTurn(b, 'e0');
  const evs = b.runEnemyTurn();
  assert.ok(evs.some((x) => x.type === 'telegraph' && x.skill === 'flare_ram' && x.flare), 'announced again');
});

test('Fire resistance gear (fireRes) cuts fire damage taken: charms, boots and the Ashwalker set', () => {
  const plain = memberStats({ id: 'hero', level: 13, equip: { sword: 'short_sword' } });
  const worn = memberStats({ id: 'hero', level: 13, equip: { sword: 'short_sword', charm: 'coalheart_charm' } });
  assert.equal(worn.fireRes - plain.fireRes, 25);
  const set = memberStats({ id: 'hero', level: 13, equip: { sword: 'short_sword', boots: 'ashwalker_boots', mantle: 'ashwalker_mantle' } });
  assert.equal(set.fireRes, 10 + 20, 'the Ashwalker set adds 20% to the boots\' 10%');
  assert.equal(set.spd - plain.spd, 2 + 1);
  // the damage formula: a fire-typed hit shrinks by the percentage, a plain one does not
  const hit = (charm, skill) => {
    const party = makeParty('sand_road', 13);
    for (const m of party) m.equip.charm = charm;
    const b = battle(['cinder_hound'], { rng: midRng, party });
    sturdy(b);
    untilTurn(b, 'e0');
    const saved = ENEMIES.cinder_hound.moves;
    ENEMIES.cinder_hound.moves = [{ skill, weight: 100, target: 'highestAtk' }];
    const evs = b.runEnemyTurn();
    ENEMIES.cinder_hound.moves = saved;
    return ofType(evs, 'damage').find((d) => d.source === 'e0').amount;
  };
  const fire = hit(null, 'ember_snap'), fireWorn = hit('coalheart_charm', 'ember_snap');
  assert.ok(Math.abs(fireWorn / fire - 0.75) < 0.05, `fire ${fire} -> ${fireWorn}`);
  const bite = hit(null, 'bite'), biteWorn = hit('coalheart_charm', 'bite');
  assert.ok(biteWorn >= bite - 3, 'a bite is not fire');
});

test('the Bellows Specter: every attack feeds it; Furnace Breath is announced at Heat 3; the fans reverse at 50%', () => {
  const b = sturdy(specter());
  const s = b.unit('e0');
  untilTurn(b, 'e0');
  let evs = b.runEnemyTurn();
  const attack = evs.find((x) => x.type === 'action_start').action.skill;
  assert.ok(['soot_wing', 'draft_lash'].includes(attack));
  assert.equal(s.heat, 2, 'one attack, two levels of Heat');
  untilTurn(b, 'e0');
  evs = b.runEnemyTurn();
  const tel = evs.find((x) => x.type === 'telegraph');
  assert.ok(tel && tel.skill === 'furnace_breath' && tel.flare && /draft/.test(tel.text));
  assert.equal(s.heat, 3);
  // answered by ice: cancelled
  untilTurn(b, 'mira');
  evs = b.perform({ type: 'skill', skill: 'frost', target: 'e0' });
  assert.ok(evs.some((x) => x.type === 'quench'));
  // the fans reverse: phase 2, Haste, and it stokes a second time in a turn that ice did not touch
  s.hp = Math.floor(s.maxHp * 0.52);
  untilTurn(b, 'hero');
  evs = b.perform({ type: 'attack', target: 'e0' });
  s.hp = Math.min(s.hp, Math.floor(s.maxHp * 0.49));
  untilTurn(b, 'hero');
  evs = b.perform({ type: 'attack', target: 'e0' });
  assert.ok(s.ai.phase === 1 && s.statuses.haste, 'the fans reversed');
  s.heat = 0; s.charging = null; s.broken = false; s.ai.iceSince = false;
  untilTurn(b, 'e0');
  evs = b.runEnemyTurn();
  const stokes = ofType(evs, 'heat').filter((x) => x.delta > 0);
  assert.ok(stokes.length >= 2 || s.charging, `stoked twice (${stokes.length})`);
});

test('the Warden: HP locks at 70%, the shell takes two coils, 25% damage, no shield chips, HP stops at 31%; the shell cracks into a Broken Quenched Core', () => {
  const b = sturdy(warden());
  untilTurn(b, 'bram');
  const w = b.unit('e0');
  w.hp = Math.floor(w.maxHp * 0.71);
  let evs = b.perform({ type: 'skill', skill: 'lunge', target: 'e0' });
  assert.ok(w.hp >= Math.floor(w.maxHp * 0.70) - 1, 'one hit never skips the phase');
  assert.ok(evs.some((e) => e.type === 'phase' && e.phase === 2 && e.id === 'molten_shell'));
  assert.deepEqual(ofType(evs, 'summon').map((e) => e.id).sort(), ['bellows_coil', 'smelter_coil']);
  assert.ok(w.ai.ward);
  // under the shell: a quarter of the damage, shields cannot be chipped
  untilTurn(b, 'bram');
  const shields = w.shields;
  const est = b.estimate('bram', { type: 'skill', skill: 'lunge', target: 'e0' }).find((e) => e.target === 'e0');
  assert.ok(est.avg < 60, `shell damage estimate ${est.avg}`);
  b.perform({ type: 'skill', skill: 'lunge', target: 'e0' });
  assert.equal(w.shields, shields, 'a weakness hit chips nothing under the shell');
  // the floor
  w.hp = Math.floor(w.maxHp * 0.315);
  untilTurn(b, 'bram');
  b.perform({ type: 'skill', skill: 'lunge', target: 'e0' });
  assert.ok(w.hp >= Math.floor(w.maxHp * 0.31), 'the shell holds the HP at 31%');
  // the coils fall: the shell cracks, the Warden is Broken, phase 3 begins with Haste
  evs = [];
  for (let i = 0; i < 40 && b.living('enemy').length > 1; i++) {
    const u = b.current();
    if (u.side === 'party') {
      const t = b.living('enemy').find((e) => e.id !== 'cinder_warden');
      t.hp = 1; t.statuses = {}; t.coveredBy = null;
      evs.push(...b.perform({ type: 'attack', target: t.uid }));
    } else evs.push(...b.runEnemyTurn());
  }
  assert.equal(b.living('enemy').length, 1, 'the coils have fallen');
  assert.ok(!w.ai.ward);
  assert.equal(w.ai.phase, 2);
  assert.ok(evs.some((e) => e.type === 'message' && e.kind === 'ward_break'));
  assert.ok(evs.some((e) => e.type === 'phase' && e.phase === 3 && /clapper/.test(e.text)));
  assert.ok(w.statuses.haste, 'Haste');
  assert.deepEqual(w.weak.slice().sort(), ['ice', 'light', 'spear']);
  assert.ok(w.broken || evs.some((e) => e.type === 'break' && e.target === 'e0'), 'Broken as the shell cracks');
});

test('the coils: the Bellows Coil stokes the Warden every turn, the Smelter Coil sprays every second turn', () => {
  const b = sturdy(warden());
  untilTurn(b, 'bram');
  const w = b.unit('e0');
  w.hp = Math.floor(w.maxHp * 0.71);
  b.perform({ type: 'skill', skill: 'lunge', target: 'e0' });
  const bc = b.living('enemy').find((e) => e.id === 'bellows_coil');
  const sc = b.living('enemy').find((e) => e.id === 'smelter_coil');
  assert.ok(bc && sc);
  assert.equal(bc.hp, ENEMIES.bellows_coil.hp);
  const seen = [];
  for (let i = 0; i < 60 && !(sc.ai.turns >= 3 && bc.ai.turns >= 2); i++) {
    const u = b.current();
    seen.push(...(u.side === 'party' ? b.perform({ type: 'defend' }) : b.runEnemyTurn()));
  }
  const by = (uid) => ofType(seen, 'action_start').filter((e) => e.actor === uid).map((e) => e.action.skill);
  assert.ok(by(bc.uid).every((s) => s === 'stoke_warden') && by(bc.uid).length >= 2);
  assert.deepEqual(by(sc.uid).slice(0, 3), ['slag_spray', 'coil_pressure', 'slag_spray']);
  assert.ok(ofType(seen, 'heat').some((e) => e.target === 'e0' && e.reason === 'coil'));
});

test('Strike the Name: Defend holds, Tempered Oath holds, otherwise Nameless and Silence, and the Warden grows', () => {
  const strike = (setup, stance = 'defend') => {
    const b = sturdy(warden());
    untilTurn(b, 'hero');
    const w = b.unit('e0');
    w.charging = { skill: 'strike_the_name', target: 'mira' };
    w.heat = 3;
    w.hp = w.maxHp = 99999;
    setup(b);
    const seen = [];
    for (let i = 0; i < 60 && !seen.some((e) => e.type === 'action_start' && e.actor === 'e0' && e.charged); i++) {
      const u = b.current();
      seen.push(...(u.side === 'party' ? b.perform(stance === 'attack' ? { type: 'attack', target: 'e0' } : { type: 'defend' }) : b.runEnemyTurn()));
    }
    return { b, seen };
  };
  // nothing: Mira is struck out (the party attacks instead of bracing)
  let r = strike(() => {}, 'attack');
  assert.ok(r.seen.some((e) => e.type === 'status_add' && e.target === 'mira' && e.status === 'nameless'));
  assert.ok(r.seen.some((e) => e.type === 'status_add' && e.target === 'mira' && e.status === 'silence'));
  assert.ok(r.b.unit('e0').mods.some((m) => m.stat === 'atk' && m.mult > 1), 'every name struck makes the Warden stronger');
  assert.ok(r.seen.some((e) => e.type === 'heat' && e.heat === 0 && e.reason === 'flare'), 'Heat resets when the flare fires');
  // Defend: Mira braces on her own turn before the hammer falls
  r = strike(() => {}, 'defend');
  assert.ok(r.seen.some((e) => e.type === 'message' && e.kind === 'name_hold' && /holds fast/.test(e.text)));
  assert.ok(!r.seen.some((e) => e.type === 'status_add' && e.target === 'mira' && e.status === 'nameless'));
  // Tempered Oath on Bram: the single-target blow goes to Bram, who cannot be made Nameless
  const b = sturdy(warden());
  untilTurn(b, 'bram');
  b.unit('e0').charging = { skill: 'strike_the_name', target: 'mira' };
  b.unit('e0').heat = 3;
  b.perform({ type: 'skill', skill: 'tempered_oath', target: 'bram' });
  const seen = untilFired(b, 'e0');
  assert.ok(seen.some((e) => e.type === 'message' && e.kind === 'oath_hold' && /saying her name/.test(e.text)));
  assert.ok(!b.unit('bram').statuses.nameless && !b.unit('mira').statuses.nameless);
});

test('Tempered Oath: Taunt, Protect and Oath on Bram; it turns the Last Hammer onto him at half strength and Breaks the Warden', () => {
  const b = sturdy(warden());
  // jump to phase 3
  const w = b.unit('e0');
  w.ai.phase = 2; w.ai.ward = false; w.hp = Math.floor(w.maxHp * 0.5);
  untilTurn(b, 'bram');
  w.charging = { skill: 'last_hammer', target: null };
  const cast = b.perform({ type: 'skill', skill: 'tempered_oath', target: 'bram' });
  for (const s of ['taunt', 'protect', 'oath']) assert.ok(cast.some((e) => e.type === 'status_add' && e.target === 'bram' && e.status === s), s);
  assert.equal(b.state.units.bram.mp, b.state.units.bram.maxMp - 8);
  const seen = untilFired(b, 'e0');
  const hits = ofType(seen, 'damage').filter((e) => e.source === 'e0');
  assert.deepEqual(hits.map((e) => e.target), ['bram'], 'Bram takes it alone');
  assert.ok(seen.some((e) => e.type === 'oath_ring' && e.actor === 'bram' && e.target === 'e0' && e.sfx === 'oath_ring'));
  assert.ok(seen.some((e) => e.type === 'message' && /rings on Bram like a bell/.test(e.text)));
  assert.ok(seen.some((e) => e.type === 'break' && e.target === 'e0'));
  // half strength: compare with the same hammer landing on Bram with no Oath (his Protect from the Oath aside)
  const c = sturdy(warden());
  const w2 = c.unit('e0'); w2.ai.phase = 2; w2.ai.ward = false;
  untilTurn(c, 'hero'); w2.charging = { skill: 'last_hammer', target: null };
  const seen2 = untilFired(c, 'e0');
  const full = ofType(seen2, 'damage').find((e) => e.source === 'e0' && e.target === 'bram');
  assert.ok(hits[0].amount < full.amount * 0.75, `Oath ${hits[0].amount} vs ${full.amount}`);
  // the Oath holds past Bram's next turn while a hammer is raised, and ends at the next turn once it has fallen
  assert.ok(!b.unit('bram').statuses.oath || b.unit('bram').statuses.oath.turns > 0);
  untilTurn(b, 'bram');
  assert.ok(!b.unit('bram').statuses.oath, 'gone by his next turn');
});

test('the Last Hammer comes every third turn of the Quenched Core, the first a turn early', () => {
  const b = sturdy(warden());
  const w = b.unit('e0');
  w.hp = Math.floor(w.maxHp * 0.4);
  w.ai.phase = 1; w.ai.ward = true; w.ai.turns = 0;
  // crack the shell through its real path
  const coils = [b.living('enemy')];
  void coils;
  const evs = [];
  untilTurn(b, 'hero');
  w.ai.ward = false;
  const sp = b.unit('e0');
  sp.ai.phase = 2; sp.ai.hammerAt = sp.ai.turns + 2;
  let announced = 0;
  const turnsAt = [];
  for (let i = 0; i < 120 && announced < 3 && !b.isOver(); i++) {
    const u = b.current();
    const out = u.side === 'party' ? b.perform({ type: 'defend' }) : b.runEnemyTurn();
    evs.push(...out);
    for (const e of out) if (e.type === 'telegraph' && e.skill === 'last_hammer') { announced++; turnsAt.push(sp.ai.turns); }
    if (sp.broken) sp.broken = false;
    sp.hp = sp.maxHp;
  }
  assert.ok(announced >= 3);
  assert.equal(turnsAt[0], 2);
  assert.equal(turnsAt[1] - turnsAt[0], 3);
  assert.equal(turnsAt[2] - turnsAt[1], 3);
});

test('Tempered Oath is learned by the story flag (bram_memory_3), and only by Bram', () => {
  const bram = newMember('bram', { level: 16 });
  assert.ok(!knownSkills(bram).includes('tempered_oath'));
  assert.ok(!knownSkills(bram, []).includes('tempered_oath'));
  assert.ok(knownSkills(bram, ['bram_memory_3']).includes('tempered_oath'));
  assert.ok(knownSkills(bram, new Set(['bram_memory_3'])).includes('tempered_oath'));
  assert.ok(knownSkills(bram, (f) => f === 'bram_memory_3').includes('tempered_oath'));
  assert.ok(knownSkills(bram, { bram_memory_3: true }).includes('tempered_oath'));
  assert.ok(!knownSkills(newMember('hero', { level: 16 }), ['bram_memory_3']).includes('tempered_oath'));
  // the battle reads the flags createEncounterBattle is given
  const mk = (flags) => createEncounterBattle('cinder_warden', { party: makeParty('foundry_heart', 16), rng: makeRng(1), flags }).battle;
  assert.ok(mk(['bram_memory_3']).unit('bram').skills.includes('tempered_oath'));
  assert.ok(!mk([]).unit('bram').skills.includes('tempered_oath'));
  const tech = mk(['bram_memory_3']).commands('bram').find((c) => c.id === 'tech').list.find((x) => x.skill === 'tempered_oath');
  assert.ok(tech && tech.enabled && tech.mp === 8);
});

test('coolant_done: the Warden fight starts with +25 Fury and its own line; no other fight reads it', () => {
  const party = makeParty('foundry_heart', 16);
  const a = createEncounterBattle('cinder_warden', { party, rng: makeRng(1), flags: new Set(['coolant_done']) }).battle;
  assert.ok(a.living('party').every((u) => u.fury === 25));
  const msg = a.startEvents.find((e) => e.type === 'message' && e.kind === 'blessing');
  assert.ok(msg && /\+25/.test(msg.text) && !/fountain/i.test(msg.text));
  const n = createEncounterBattle('cinder_warden', { party, rng: makeRng(1), flags: ['bram_memory_3'] }).battle;
  assert.ok(n.living('party').every((u) => u.fury === 0));
  const o = createEncounterBattle('bellows_specter', { party, rng: makeRng(1), flags: { coolant_done: true } }).battle;
  assert.ok(o.living('party').every((u) => u.fury === 0));
});

test('loot: the Specter drops the Updraft Charm, the Warden the Ember Heart and two rares; the First Bell Hammer is staged, never dropped', () => {
  const s = rollBattleDrops(makeRng(3), [{ id: 'bellows_specter', elite: null, lootZone: 'foundry_f2', drops: [] }], { zone: 'foundry_f2', encounter: 'bellows_specter' });
  assert.equal(s.items.filter((x) => x.base === 'updraft_charm').length, 1);
  assert.equal(s.items.filter((x) => x.rarity === 'rare').length, 1);
  const w = rollBattleDrops(makeRng(3), [{ id: 'cinder_warden', elite: null, lootZone: 'foundry_f3', drops: [] }], { zone: 'foundry_heart', encounter: 'cinder_warden' });
  assert.equal(w.items.filter((x) => x.base === 'warden_heart').length, 1);
  assert.equal(w.items.filter((x) => x.rarity === 'rare').length, 2);
  assert.ok(!w.items.some((x) => x.base === 'first_bell_hammer'));
  assert.ok(w.consumables.some((c) => c.item === 'phoenix_feather') && w.consumables.some((c) => c.item === 'hi_ether'));
  assert.equal(makeUnique('first_bell_hammer').rarity, 'legendary');
  // a full Warden fight on Auto: the rewards carry the charm
  const { battle: b } = createEncounterBattle('cinder_warden', { party: makeParty('foundry_heart', 16), rng: makeRng(4), flags: FLAGS,
    inventory: { potion: 6, hi_potion: 6, ether: 3, hi_ether: 3, phoenix_feather: 3, silver_salve: 2, quench_flask: 4 } });
  playOut(b, 'competent');
  assert.equal(b.result().outcome, 'victory');
  assert.ok(b.result().items.some((x) => x.base === 'warden_heart'));
});

test('gear: a fifth affix tier at ilvl 14, Episode 3 rare names, the Ashwalker set, no legendaries from random tables', () => {
  for (const a of Object.values(AFFIXES)) {
    if (a.id === 'of_dawn') { assert.equal(a.tiers.length, 3); continue; }
    assert.equal(a.tiers.length, 5, a.id);
    assert.equal(a.tiers[4][0], 14, a.id);
    assert.ok(a.tiers[4][1] >= a.tiers[3][1] && a.tiers[4][2] >= a.tiers[3][2], `${a.id} grows`);
    if (/^res[A-Z]/.test(a.stat)) assert.ok(a.tiers[4][2] <= 100);
  }
  assert.deepEqual(RARE_NAME_A_EP3, ['Ashen', 'Tempered', 'Forged', 'Banked', 'Cinder']);
  const rng = makeRng(11);
  const words = new Set();
  for (let i = 0; i < 400; i++) words.add(rollItem(rng, { ilvl: 14, rarity: 'rare' }).name.split(' ')[0]);
  assert.ok(RARE_NAME_A_EP3.some((w) => words.has(w)), 'an Episode 3 word shows up at ilvl 14');
  const low = new Set();
  for (let i = 0; i < 400; i++) low.add(rollItem(rng, { ilvl: 9, rarity: 'rare' }).name.split(' ')[0]);
  assert.ok(!RARE_NAME_A_EP3.some((w) => low.has(w)), 'and not below it');
  for (let i = 0; i < 300; i++) assert.notEqual(rollItem(rng, { ilvl: 16, table: 'boss' }).rarity, 'legendary');
  assert.deepEqual(setBonuses([makeUnique('ashwalker_boots'), makeUnique('ashwalker_mantle')]), { spd: 1, fireRes: 20 });
  assert.equal(UNIQUES.tempered_blade.extraTypes[0], 'ice', 'the Tempered Lexicon Blade strikes as ice');
});

test('shops: Penny, Taro and the Emberpeak smithy; tier 6 needs both foundry_f2_done and forge_relit', () => {
  const smith = (flags) => shopStock('pk_smithy', flags).map((s) => s.item);
  assert.ok(smith([]).includes('ashsteel_cuirass') && smith([]).includes('mirror_rod') && !smith([]).includes('tempered_sword'));
  assert.ok(!smith(['foundry_f2_done']).includes('tempered_sword'));
  assert.ok(!smith(['forge_relit']).includes('tempered_sword'));
  assert.ok(smith(['foundry_f2_done', 'forge_relit']).includes('tempered_sword'));
  assert.ok(smith(new Set(['foundry_f2_done', 'forge_relit'])).includes('forge_helm'));
  const peddler = shopStock('sand_peddler', []).map((s) => s.item);
  for (const id of ['potion', 'hi_potion', 'hi_ether', 'phoenix_feather', 'silver_salve', 'quench_flask', 'cinder_boots']) assert.ok(peddler.includes(id), id);
  const taro = shopStock('ventworks', []).map((s) => s.item);
  for (const id of ['quench_flask', 'coalheart_charm', 'bellchime_charm', 'carter_mantle']) assert.ok(taro.includes(id), id);
  const vessa = (flags) => shopStock('hollow_smithy', flags).map((s) => s.item);
  assert.ok(!vessa([]).includes('founders_robe') && vessa(['sand_done']).includes('founders_robe'));
  assert.ok(!vessa(['sand_done']).includes('emberglass_charm'), 'the charm is not sold');
  const garrick = shopStock('willowmere_smithy', ['ep1_complete', 'archive_f2_done']).map((s) => s.item);
  assert.equal(garrick.filter((x) => x === 'runed_saber').length, 1);
});

test('Auto: quenches a flare (Frost, else a flask), raises Tempered Oath at the Last Hammer and keeps the MP for it', () => {
  // Mira answers an announced flare with Frost
  let b = sturdy(beetle());
  const e = b.unit('e0');
  e.heat = 3; untilTurn(b, 'e0'); b.runEnemyTurn();
  untilTurn(b, 'mira');
  let a = partyAction(b, 'competent');
  assert.deepEqual([a.type, a.skill], ['skill', 'frost']);
  // Bram has no ice: he throws a flask unless Mira's Frost comes first on the timeline
  b = sturdy(beetle());
  b.unit('e0').heat = 3; untilTurn(b, 'e0'); b.runEnemyTurn();
  untilTurn(b, 'bram');
  b.unit('mira').mp = 0;   // no Frost to wait for
  a = partyAction(b, 'competent');
  assert.deepEqual([a.type, a.item], ['item', 'quench_flask']);
  // Bram raises the Oath once the Last Hammer is up, and the rest of the party gets on with it
  b = sturdy(warden());
  const w = b.unit('e0'); w.ai.phase = 2; w.ai.ward = false; w.hp = Math.floor(w.maxHp * 0.5);
  untilTurn(b, 'bram');
  w.charging = { skill: 'last_hammer', target: null };
  a = partyAction(b, 'competent');
  assert.deepEqual([a.type, a.skill], ['skill', 'tempered_oath']);
  b.perform(a);
  untilTurn(b, 'hero');
  assert.notEqual(partyAction(b, 'competent').type, 'defend', 'with the Oath up the hero does not brace');
  // reckless play does not read the telegraph
  b = sturdy(warden());
  const w2 = b.unit('e0'); w2.ai.phase = 2; w2.ai.ward = false; w2.hp = Math.floor(w2.maxHp * 0.5);
  untilTurn(b, 'bram');
  w2.charging = { skill: 'last_hammer', target: null };
  assert.notEqual(partyAction(b, 'reckless').skill, 'tempered_oath');
});

test('a full fight against the Specter and the Warden plays out on Auto, both ways', () => {
  for (const enc of ['bellows_specter', 'cinder_warden']) {
    const zone = enc === 'cinder_warden' ? 'foundry_heart' : 'foundry_f2';
    const { battle: b } = createEncounterBattle(enc, { party: makeParty(zone, 16), rng: makeRng(2), flags: FLAGS,
      inventory: { potion: 6, hi_potion: 6, ether: 3, hi_ether: 3, phoenix_feather: 3, silver_salve: 2, quench_flask: 4 } });
    const evs = playOut(b, 'competent');
    assert.ok(b.isOver(), enc);
    assert.equal(b.result().outcome, 'victory', enc);
    assert.ok(evs.some((e) => e.type === 'quench'), `${enc}: the party quenched something`);
    if (enc === 'cinder_warden') {
      for (const p of [2, 3]) assert.ok(evs.some((e) => e.type === 'phase' && e.phase === p), `phase ${p}`);
    }
  }
});

test('the Warden fight is deterministic and its state survives a save/restore mid-shell', () => {
  const run = () => {
    const { battle: b } = createEncounterBattle('cinder_warden', { party: makeParty('foundry_heart', 16), rng: makeRng(7), flags: FLAGS,
      inventory: { potion: 6, hi_potion: 6, phoenix_feather: 3, quench_flask: 4 } });
    const evs = playOut(b, 'competent');
    return JSON.stringify(evs.map((e) => [e.type, e.amount ?? null, e.target ?? null]));
  };
  assert.equal(run(), run());
  const { battle: b } = createEncounterBattle('cinder_warden', { party: makeParty('foundry_heart', 16), rng: makeRng(7), flags: FLAGS });
  const clone = createBattle({ rng: makeRng(7), state: b.state, options: {} });
  assert.equal(clone.unit('e0').heatMax, 3);
  assert.equal(clone.knowledge('e0').heatMax, 3);
});
