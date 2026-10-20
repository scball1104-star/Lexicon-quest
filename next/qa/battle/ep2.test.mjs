// Episode 2 combat (E2-battle): Kept and the Nameless King's phases, the Mirror Ward and its court, the Glassback's
// reflect, the Quicksilver's split, the Borrowed Shadow's mimicry, enemy Cover and Taunt against True Strike, Shatter,
// the Mirrored Combo, the Fountain's Fury, the Other Selves' loot. Balance targets live in sim.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { battle, untilTurn, midRng, ofType, playOut } from './_helpers.mjs';
import { createEncounterBattle, makeRng } from '../../src/battle/rules.js';
import { rollBattleDrops } from '../../src/battle/loot.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { SKILLS, STATUSES } from '../../src/data/skills.js';
import { ITEMS, UNIQUES, SETS, EQUIPMENT, AFFIXES } from '../../src/data/items.js';
import { ZONES, EP2_ZONES, EP2_ZONE_ORDER, ENCOUNTERS } from '../../src/data/encounters.js';
import { shopStock } from '../../src/data/shops.js';
import { makeParty } from '../../tools/sim/simulate.mjs';

const king = (opts = {}) => battle(['nameless_king'], { rng: midRng, party: makeParty('court_throne', 13), options: { boss: true }, ...opts });
/** Long scripted sequences: the party cannot fall while the test steers the fight. */
const sturdy = (b) => { for (const u of b.living('party')) u.hp = u.maxHp = 99999; return b; };
const keep = (u, turns = 2) => { u.statuses.kept = { turns }; };
/** Party defends, enemies act, until `uid` has fired its charged move. Returns every event seen. */
function untilFired(b, uid, max = 40) {
  const seen = [];
  for (let i = 0; i < max && !b.isOver(); i++) {
    const u = b.current();
    const evs = u.side === 'party' ? b.perform({ type: 'defend' }) : b.runEnemyTurn();
    seen.push(...evs);
    if (evs.some((e) => e.type === 'action_start' && e.actor === uid && e.charged)) return seen;
  }
  throw new Error(`${uid} never fired`);
}

test('Episode 2 ids: enemies, encounters, zones, items, uniques and the set are all there', () => {
  for (const id of ['mist_wolf', 'glassback', 'quicksilver', 'quicksilver_bead', 'glint_wisp', 'glass_sentinel', 'borrowed_shadow',
    'faceless_knight', 'shard_swarm', 'refl_hero', 'refl_mira', 'refl_bram', 'nameless_king', 'false_sorrow', 'false_pride']) assert.ok(ENEMIES[id], id);
  for (const id of ['road_wolves', 'road_beetles', 'road_quick', 'road_mixed', 'road_pack', 'c1_quick', 'c1_wisps', 'c1_sentinel', 'c1_mixed',
    'c2_shadows', 'c2_knight', 'c2_sentinel', 'c2_mixed', 'other_selves', 'c3_shards', 'c3_knights', 'c3_shadow', 'c3_mixed', 'nameless_king']) {
    assert.ok(ENCOUNTERS[id], id);
  }
  assert.deepEqual(EP2_ZONE_ORDER, ['east_road', 'court_f1', 'court_f2', 'court_f3', 'court_throne']);
  for (const z of EP2_ZONE_ORDER) assert.equal(ZONES[z], EP2_ZONES[z], `ZONES.${z} resolves`);
  assert.equal(ENCOUNTERS.other_selves.flag, 'other_selves_defeated');
  assert.equal(ENCOUNTERS.nameless_king.flag, 'nameless_king_defeated');
  assert.equal(ENCOUNTERS.nameless_king.music, 'boss_king');
  for (const id of ['mael_letter', 'glass_key', 'name_fragment_2', 'mirror_sigil', 'courier_satchel', 'elian_reply', 'black_feather']) {
    assert.ok(ITEMS[id] && ITEMS[id].kind === 'key', id);
  }
  assert.ok(ITEMS.glass_key.counted);
  for (const id of ['hi_ether', 'silver_salve']) assert.equal(ITEMS[id].kind, 'consumable');
  for (const id of ['twinfold_charm', 'kept_promise', 'hollowcrown', 'merewarden_helm', 'merewarden_mantle', 'paper_crown', 'courier_knot']) {
    assert.ok(UNIQUES[id], id);
  }
  assert.deepEqual(SETS.merewardens_watch.pieces, ['merewarden_helm', 'merewarden_mantle']);
  assert.equal(EQUIPMENT.silverglass_blade.ilvl, 11);
  for (const a of Object.values(AFFIXES)) assert.equal(a.tiers[a.tiers.length - 1][0], 10, `${a.id} has an ilvl 10 tier`);
  assert.ok(STATUSES.kept && STATUSES.kept.turns === 2);
  for (const id of ['recall', 'shatter', 'true_strike']) assert.ok(SKILLS[id], id);
});

test('shops: the Silver Salve once the Court is open, tier 4 after F2', () => {
  const items = (flags) => shopStock('hollow_items', flags).map((s) => s.item);
  assert.ok(!items([]).includes('silver_salve'));
  assert.ok(items(['court_entered']).includes('silver_salve'));
  const smith = (flags) => shopStock('hollow_smithy', flags).map((s) => s.item);
  assert.ok(smith([]).includes('steel_cuirass') && !smith([]).includes('silverglass_blade'));
  assert.ok(smith(['court_f2_done']).includes('silverglass_blade'));
  const garrick = shopStock('willowmere_smithy', ['ep1_complete', 'archive_f2_done']).map((s) => s.item);
  assert.equal(garrick.filter((x) => x === 'runed_saber').length, 1, 'no double listing');
});

test('Kept: skips its turns, cannot be targeted, Recall frees it', () => {
  const b = king();
  untilTurn(b, 'mira');
  const hero = b.unit('hero');
  keep(hero);
  assert.ok(!b.targets('mira', { type: 'skill', skill: 'mend' }).ids.includes('hero'), 'Mend cannot reach a Kept ally');
  const rt = b.targets('mira', { type: 'skill', skill: 'recall' });
  assert.ok(rt.ids.includes('hero'));
  assert.equal(rt.default, 'hero', 'Recall points at the Kept ally first');
  assert.ok(b.timeline(8).some((r) => r.uid === 'hero' && r.skip === 'kept'), 'the timeline greys its turn');
  const evs = b.perform({ type: 'skill', skill: 'recall', target: 'hero' });
  assert.ok(evs.some((e) => e.type === 'status_remove' && e.target === 'hero' && e.status === 'kept' && e.reason === 'freed'));
  assert.ok(!hero.statuses.kept);
});

test('Kept: two skipped turns, and enemy party-wide hits pass it by', () => {
  const b = king();
  untilTurn(b, 'mira');
  keep(b.unit('hero'));
  const evs = [];
  for (let i = 0; i < 40 && b.unit('hero').statuses.kept; i++) {
    const u = b.current();
    evs.push(...(u.side === 'party' ? b.perform({ type: 'defend' }) : b.runEnemyTurn()));
  }
  assert.equal(evs.filter((e) => e.type === 'skip' && e.actor === 'hero' && e.reason === 'kept').length, 2);
  assert.ok(evs.some((e) => e.type === 'status_remove' && e.target === 'hero' && e.status === 'kept' && e.reason === 'expired'));

  const w = battle(['glint_wisp'], { rng: midRng, level: 10 });
  untilTurn(w, 'mira');
  keep(w.unit('hero'), 9);
  w.unit('e0').charging = { skill: 'prism_burst', target: null };
  const seen = untilFired(w, 'e0');
  const hits = ofType(seen, 'damage').filter((e) => e.source === 'e0');
  assert.ok(hits.length >= 1 && hits.every((e) => e.target !== 'hero'), 'Prism Burst skips the Kept hero');
  assert.ok(!ofType(seen, 'telegraph').some((e) => (e.targets || []).includes('hero')));
});

test('a Silver Salve frees a Kept ally; every living member Kept loses the battle', () => {
  const b = king({ options: { boss: true, inventory: { silver_salve: 1 } } });
  untilTurn(b, 'bram');
  keep(b.unit('mira'));
  const t = b.targets('bram', { type: 'item', item: 'silver_salve' });
  assert.equal(t.default, 'mira');
  const evs = b.perform({ type: 'item', item: 'silver_salve', target: 'mira' });
  assert.ok(evs.some((e) => e.type === 'status_remove' && e.status === 'kept' && e.reason === 'freed'));

  const c = king();
  untilTurn(c, 'hero');
  for (const id of ['mira', 'bram']) keep(c.unit(id));
  c.unit('hero').statuses.kept = { turns: 2 };
  const end = c.perform({ type: 'defend' });
  assert.ok(end.some((e) => e.type === 'message' && /KEEPS YOU ALL/.test(e.text)));
  assert.equal(c.result().outcome, 'defeat');
});

test('Keeping: Defend holds; otherwise Kept for 2 turns and the King grows', () => {
  for (const defending of [true, false]) {
    const b = king();
    untilTurn(b, 'hero');
    b.unit('e0').charging = { skill: 'keeping', target: 'hero' };
    b.unit('e0').hp = b.unit('e0').maxHp = 99999;
    const evs = defending ? b.perform({ type: 'defend' }) : b.perform({ type: 'attack', target: 'e0' });
    if (defending) b.unit('hero').defending = true;   // still braced when the mirror turns (the hero would act again first)
    for (let i = 0; i < 20 && !evs.some((e) => e.type === 'action_start' && e.action.skill === 'keeping'); i++) {
      const u = b.current();
      if (u.uid === 'hero' && defending) evs.push(...b.perform({ type: 'defend' }));
      else evs.push(...(u.side === 'party' ? b.perform({ type: u.uid === 'hero' ? 'attack' : 'defend', target: 'e0' }) : b.runEnemyTurn()));
    }
    const fired = evs.find((e) => e.type === 'action_start' && e.action.skill === 'keeping');
    assert.ok(fired, 'Keeping fired');
    if (defending) {
      assert.ok(evs.some((e) => e.type === 'message' && /looks away/.test(e.text)));
      assert.ok(!b.unit('hero').statuses.kept);
    } else {
      assert.ok(evs.some((e) => e.type === 'status_add' && e.status === 'kept' && e.target === 'hero' && e.turns === 2));
      assert.ok(b.unit('e0').mods.some((m) => m.stat === 'atk' && m.mult > 1));
    }
  }
});

test('the King: HP locks at 66%, the court and the Mirror Ward, the ward shatters into a Broken, unmasked phase 3', () => {
  const b = sturdy(king());
  untilTurn(b, 'bram');
  const k = b.unit('e0');
  k.hp = Math.floor(k.maxHp * 0.67);
  let evs = b.perform({ type: 'skill', skill: 'lunge', target: 'e0' });
  assert.ok(k.hp >= Math.floor(k.maxHp * 0.66) - 1, 'no skipping past 66%');
  assert.ok(evs.some((e) => e.type === 'phase' && e.phase === 2));
  const adds = ofType(evs, 'summon').map((e) => e.id).sort();
  assert.deepEqual(adds, ['false_pride', 'false_sorrow']);
  assert.ok(k.ai.ward);
  // the ward: a quarter of the damage, no shield chips, HP stops at 34%
  const shields = k.shields;
  untilTurn(b, 'bram');
  const est = b.estimate('bram', { type: 'skill', skill: 'lunge', target: 'e0' }).find((e) => e.target === 'e0');
  b.unit('e0').statuses = {};
  for (const e of b.living('enemy')) e.statuses = {};
  evs = b.perform({ type: 'skill', skill: 'lunge', target: 'e0' });
  assert.equal(k.shields, shields, 'a weakness hit chips nothing under the ward');
  assert.ok(est.avg < 40, `ward damage estimate ${est.avg}`);
  k.hp = Math.floor(k.maxHp * 0.345);
  untilTurn(b, 'bram');
  b.perform({ type: 'skill', skill: 'lunge', target: 'e0' });
  assert.ok(k.hp >= Math.floor(k.maxHp * 0.34), 'the ward holds his HP at 34%');
  // both adds fall: the ward shatters, the King is Broken (the Kept hero is freed), phase 3 begins unmasked
  untilTurn(b, 'mira');
  keep(b.unit('hero'), 9);
  evs = [];
  for (let i = 0; i < 30 && b.living('enemy').length > 1; i++) {
    const u = b.current();
    if (u.side === 'party') {
      const t = b.living('enemy').find((e) => e.id !== 'nameless_king');
      t.hp = 1; t.statuses = {}; t.coveredBy = null;
      evs.push(...b.perform({ type: 'attack', target: t.uid }));
    } else evs.push(...b.runEnemyTurn());
  }
  assert.equal(b.living('enemy').length, 1, 'the court has fallen');
  assert.ok(!k.ai.ward);
  assert.equal(k.ai.phase, 2);
  assert.ok(k.statuses.haste, 'permanent Haste');
  assert.deepEqual(k.weak.slice().sort(), ['fire', 'light', 'spear']);
});

test('the ward breaking frees every Kept member ("The mirror cracks!")', () => {
  const b = king();
  untilTurn(b, 'bram');
  const k = b.unit('e0');
  keep(b.unit('mira'));
  k.shields = 1;
  k.hp = k.maxHp;
  const evs = b.perform({ type: 'skill', skill: 'lunge', target: 'e0' });
  assert.ok(evs.some((e) => e.type === 'break' && e.target === 'e0'));
  assert.ok(evs.some((e) => e.type === 'message' && e.text === 'The mirror cracks!'));
  assert.ok(evs.some((e) => e.type === 'status_remove' && e.target === 'mira' && e.status === 'kept' && e.reason === 'freed'));
});

test('the Glassback opens with Harden, then rebounds spells while Protected (the weakness row shows it)', () => {
  const b = battle(['glassback'], { rng: midRng, level: 9 });
  const evs = untilTurn(b, 'mira');
  const all = [...b.startEvents, ...evs];
  let first = all.find((e) => e.type === 'action_start' && e.actor === 'e0');
  if (!first) { untilTurn(b, 'e0'); first = b.runEnemyTurn().find((e) => e.type === 'action_start'); untilTurn(b, 'mira'); }
  assert.equal(first.action.skill, 'harden');
  const g = b.unit('e0');
  assert.ok(g.statuses.protect);
  assert.equal(b.knowledge('e0').reflect, 'magic', 'the weakness row shows the mirror marker');
  const hp = g.hp;
  const r = b.perform({ type: 'skill', skill: 'ember', target: 'e0' });
  assert.ok(r.some((e) => e.type === 'reflect' && e.kind === 'magic'));
  assert.equal(g.hp, hp);
});

test('the Quicksilver splits into two Quicksilver Beads at 35% of its HP', () => {
  const b = battle(['quicksilver'], { rng: midRng, level: 9 });
  untilTurn(b, 'hero');
  const q = b.unit('e0');
  q.hp = 1;
  const evs = b.perform({ type: 'attack', target: 'e0' });
  const sp = evs.find((e) => e.type === 'split');
  assert.ok(sp && sp.into.length === 2);
  for (const uid of sp.into) {
    const bead = b.unit(uid);
    assert.equal(bead.id, 'quicksilver_bead');
    assert.equal(bead.maxHp, Math.round(q.maxHp * 0.35));
  }
});

test('the Borrowed Shadow borrows the type that hit it (half damage), then throws it back', () => {
  const b = battle(['borrowed_shadow'], { rng: midRng, level: 11 });
  untilTurn(b, 'bram');
  const s = b.unit('e0');
  s.hp = s.maxHp = 9999;
  const before = b.estimate('bram', { type: 'attack', target: 'e0' })[0].avg;
  b.perform({ type: 'attack', target: 'e0' });
  assert.equal(b.knowledge('e0').adapted, 'spear');
  const after = b.estimate('bram', { type: 'attack', target: 'e0' })[0].avg;
  assert.ok(Math.abs(after - before / 2) < 1, `${after} vs ${before}`);
  untilTurn(b, 'e0');
  const ev = b.runEnemyTurn().find((e) => e.type === 'action_start' && e.actor === 'e0');
  assert.equal(ev.action.skill, 'shadow_strike');
  assert.deepEqual(ev.targets, ['bram']);
});

test('the Faceless Knight covers the weakest ally; True Strike goes where it is aimed', () => {
  const b = battle(['faceless_knight', 'glint_wisp'], { rng: midRng, level: 11 });
  untilTurn(b, 'hero');
  const k = b.unit('e0'), w = b.unit('e1');
  k.hp = k.maxHp = 9999; w.hp = w.maxHp = 9999;
  k.cover = 'e1'; w.coveredBy = 'e0';
  const est = b.estimate('hero', { type: 'attack', target: 'e1' })[0];
  assert.equal(est.redirect, 'e0', 'the preview names who really takes it');
  let evs = b.perform({ type: 'attack', target: 'e1' });
  assert.ok(evs.some((e) => e.type === 'cover' && e.actor === 'e0' && e.target === 'e1'));
  assert.ok(ofType(evs, 'damage').every((e) => e.target === 'e0'));
  untilTurn(b, 'hero');
  k.cover = 'e1'; w.coveredBy = 'e0';
  evs = b.perform({ type: 'skill', skill: 'true_strike', target: 'e1' });
  assert.ok(!evs.some((e) => e.type === 'cover'));
  assert.ok(ofType(evs, 'damage').some((e) => e.target === 'e1'));
});

test('Pride\'s Taunt pulls single attacks; party-wide hits and True Strike reach Sorrow', () => {
  const b = battle(['false_pride', 'false_sorrow'], { rng: midRng, level: 13 });
  untilTurn(b, 'hero');
  const pride = b.unit('e0');
  pride.statuses.taunt = { turns: 2 };
  let evs = b.perform({ type: 'attack', target: 'e1' });
  assert.ok(evs.some((e) => e.type === 'message' && e.kind === 'taunt'));
  assert.ok(ofType(evs, 'damage').every((e) => e.target === 'e0'));
  untilTurn(b, 'hero');
  pride.statuses.taunt = { turns: 2 };
  evs = b.perform({ type: 'skill', skill: 'true_strike', target: 'e1' });
  assert.ok(ofType(evs, 'damage').some((e) => e.target === 'e1'));
});

test('Shatter cracks two shields on a glass foe, counting its weakness hit', () => {
  for (const [weapon, expectChip] of [['spear', 2], ['axe', 2]]) {
    const b = battle(['glassback'], { rng: midRng, level: 10, edit: { bram: { weapon } } });
    untilTurn(b, 'bram');
    const g = b.unit('e0');
    g.hp = g.maxHp = 9999; g.statuses = {};
    const s0 = g.shields;
    const est = b.estimate('bram', { type: 'skill', skill: 'shatter', target: 'e0' })[0];
    b.perform({ type: 'skill', skill: 'shatter', target: 'e0' });
    assert.equal(s0 - g.shields, expectChip, `${weapon}`);
    assert.equal(est.shieldsAfter, g.shields, 'the preview agrees');
  }
});

test('the Mirrored Combo: announced with a partner, then it lands or falls out of step', () => {
  let landed = 0, split = 0, announced = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const { battle: b } = createEncounterBattle('other_selves', { party: makeParty('court_f2', 11), rng: makeRng(seed),
      inventory: { potion: 3, hi_potion: 2, phoenix_feather: 2 } });
    const evs = playOut(b, 'competent');
    for (const t of ofType(evs, 'telegraph').filter((e) => e.mirrorCombo)) {
      announced++;
      assert.ok(t.partner && t.partner !== t.actor && /move as one/.test(t.text));
    }
    landed += evs.filter((e) => e.type === 'action_start' && e.action.members && e.action.members.length === 2 && e.actor.startsWith('e')).length;
    split += evs.filter((e) => e.type === 'telegraph_cancel' && e.reason === 'split').length;
  }
  assert.ok(announced >= 6, `announced ${announced}`);
  assert.ok(landed >= 1 && split >= 1, `landed ${landed}, split ${split}`);
});

test('the Fountain\'s blessing: +25 Fury in the King fight with fountain_done', () => {
  const party = makeParty('court_throne', 13);
  const a = createEncounterBattle('nameless_king', { party, rng: makeRng(1), flags: new Set(['fountain_done']) }).battle;
  assert.ok(a.living('party').every((u) => u.fury === 25));
  assert.ok(a.startEvents.some((e) => e.type === 'message' && e.kind === 'blessing'));
  const b2 = createEncounterBattle('nameless_king', { party, rng: makeRng(1), flags: ['ep1_complete'] }).battle;
  assert.ok(b2.living('party').every((u) => u.fury === 0));
  const c = createEncounterBattle('road_mixed', { party, rng: makeRng(1), flags: { fountain_done: true } }).battle;
  assert.ok(c.living('party').every((u) => u.fury === 0), 'only the King fight reads it');
});

test('loot: the Other Selves drop the Twinfold Charm once; the King drops two rares and no battle unique', () => {
  const killed = ['refl_hero', 'refl_mira', 'refl_bram'].map((id) => ({ id, elite: null, lootZone: 'court_f2', drops: [] }));
  const d = rollBattleDrops(makeRng(3), killed, { zone: 'court_f2', encounter: 'other_selves' });
  assert.equal(d.items.filter((x) => x.base === 'twinfold_charm').length, 1);
  assert.ok(d.consumables.some((c) => c.item === 'hi_ether'));
  const k = rollBattleDrops(makeRng(3), [{ id: 'nameless_king', elite: null, lootZone: 'court_f3', drops: [] }], { zone: 'court_throne', encounter: 'nameless_king' });
  assert.equal(k.items.filter((x) => x.rarity === 'rare').length, 2);
  assert.ok(!k.items.some((x) => x.base === 'kept_promise'), 'the Kept Promise is staged in king_after');
  // Episode 1 boss loot by enemy id is unchanged
  const w = rollBattleDrops(makeRng(5), [{ id: 'echo_warden', elite: null, lootZone: 'archive_f2', drops: [] }], { encounter: 'echo_warden' });
  assert.equal(w.items.filter((x) => x.base === 'mirrorguard_mail').length, 1);
});

test('a full fight against the King plays out to the end on Auto', () => {
  const { battle: b } = createEncounterBattle('nameless_king', { party: makeParty('court_throne', 13), rng: makeRng(4),
    inventory: { potion: 5, hi_potion: 5, ether: 3, hi_ether: 3, phoenix_feather: 3, silver_salve: 2 } });
  const evs = playOut(b, 'competent');
  assert.ok(b.isOver());
  assert.ok(evs.some((e) => e.type === 'phase' && e.phase === 2));
  assert.equal(b.result().outcome, 'victory');
  assert.ok(evs.some((e) => e.type === 'phase' && e.phase === 3 && e.sprite === 'nameless_king_unmasked'));
});
