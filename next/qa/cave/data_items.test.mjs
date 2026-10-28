// The Deep Stacks' uniques (src/data/cave/items.js): sixty in three grades, the Binder's Quill and the Keeper's Bookmark, against
// docs/DEEP_STACKS_PLAN.md 2.6, 6.2 and 13 E and docs/briefs/C4-uniques.md (C1-data wrote the first version for sixteen; C4-uniques
// rewrote it for the grades). The strength rules (each grade over a rolled rare of its item level) are qa/cave/uniques_grades.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import register from '../../src/data/cave/index.js';
import { CAVE_UNIQUES, CAVE_UNIQUE_IDS, CAVE_PROPS, BINDER_QUILL_ID, KEEPERS_BOOKMARK, KEEPERS_BOOKMARK_ID, GRADES, GRADE_IDS,
  uniquesOfBand, uniquesOfGrade, gradeOf, wornProps, isCaveUnique } from '../../src/data/cave/items.js';
import { UNIQUES, KEY_ITEMS, ITEMS, EQUIPMENT, AFFIXES, EQUIP_SLOTS, RARITIES } from '../../src/data/items.js';
import { PARTY, PARTY_IDS, newMember } from '../../src/data/party.js';
import { makeUnique, itemStats, affixAllowed } from '../../src/battle/loot.js';
import { memberStats } from '../../src/battle/rules.js';

await register();
const EM = String.fromCharCode(0x2014);
const ALL = Object.values(CAVE_UNIQUES);
const BLUES = CAVE_UNIQUE_IDS.map((id) => CAVE_UNIQUES[id]);
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

test('sixty-one uniques: cave_ ids, legendary, unique, cave, a grade and its item level, valid slots and owners, no two share a name', () => {
  assert.equal(ALL.length, 61);
  assert.equal(CAVE_UNIQUE_IDS.length, 60);
  assert.ok(!CAVE_UNIQUE_IDS.includes(BINDER_QUILL_ID) && CAVE_UNIQUES[BINDER_QUILL_ID]);
  assert.deepEqual(GRADE_IDS, [1, 2, 3]);
  assert.deepEqual(GRADE_IDS.map((g) => [GRADES[g].name, GRADES[g].ilvl]), [['Lesser', 5], ['Greater', 10], ['Named', 16]]);
  const names = new Set();
  for (const u of ALL) {
    assert.ok(u.id.startsWith('cave_'), u.id);
    assert.equal(u.rarity, 'legendary'); assert.ok(u.unique && u.cave, u.id);
    assert.ok(RARITIES[u.rarity]);
    assert.ok(GRADES[u.grade], `${u.id} grade`); assert.equal(u.ilvl, GRADES[u.grade].ilvl, `${u.id} is built at its grade's item level`);
    assert.equal(gradeOf(u.id), u.grade); assert.equal(gradeOf(makeUnique(u.id)), u.grade);
    assert.ok(EQUIP_SLOTS.includes(u.slot), `${u.id} slot ${u.slot}`);
    if (u.slot === 'weapon') assert.ok(['sword', 'staff', 'spear', 'axe'].includes(u.type), `${u.id} type`);
    else { assert.ok(Array.isArray(u.who) && u.who.length && u.who.every((id) => PARTY_IDS.includes(id)), `${u.id} who`); assert.ok(!u.type); }
    assert.ok(!names.has(u.name), `name ${u.name} twice`); names.add(u.name);
    assert.ok(!/\d/.test(u.name) && !/\b(Lesser|Greater|Named)\b/.test(u.name), `${u.id}: the grade is never in the name`);
    assert.ok(u.price === 0 && u.noSell, u.id);
    assert.ok(u.icon, u.id);
    // three lore lines: the grade's (the Quill's own), then the two of the piece
    assert.ok(Array.isArray(u.lore) && u.lore.length === 3 && u.lore.every((l) => l.length > 10 && l.length <= 60), `${u.id} lore`);
    if (u.band) assert.equal(u.lore[0], GRADES[u.grade].line, `${u.id}: the first lore line names the grade`);
    assert.ok(u.desc && !u.desc.includes(EM) && !u.name.includes(EM) && !u.lore.some((l) => l.includes(EM)) && u.source);
    assert.ok(u.desc.startsWith(u.lore[0]));
    assert.ok(UNIQUES[u.id] === u && ITEMS[u.id] && ITEMS[u.id].kind === 'equipment' && ITEMS[u.id].unique, `${u.id} registered`);
    assert.ok(!EQUIPMENT[u.id], `${u.id} never in the random pools`);
    assert.ok(!Object.values(u.stats).some((v) => !v), `${u.id} has a zero stat`);
  }
  // the grade lines say the grade's name
  for (const g of GRADE_IDS) assert.ok(GRADES[g].line.includes(GRADES[g].name) && !GRADES[g].line.includes(EM));
});

test('each grade is a full party set with two to spare: four weapons, four bodies (Mira, hero or Bram, two for anyone), three of every other slot, four per band', () => {
  for (const g of GRADE_IDS) {
    const list = uniquesOfGrade(g).map((id) => CAVE_UNIQUES[id]);
    assert.equal(list.length, 20, `grade ${g}`);
    const bySlot = (s) => list.filter((u) => u.slot === s);
    assert.deepEqual(bySlot('weapon').map((u) => u.type).sort(), ['axe', 'spear', 'staff', 'sword'], `grade ${g} weapons`);
    const bodies = bySlot('body');
    assert.equal(bodies.length, 4, `grade ${g} bodies`);
    assert.equal(bodies.filter((u) => sameSet(u.who, ['mira'])).length, 1, `grade ${g}: one body for Mira only`);
    assert.equal(bodies.filter((u) => sameSet(u.who, ['hero', 'bram'])).length, 1, `grade ${g}: one for the hero or Bram`);
    assert.equal(bodies.filter((u) => u.who.length === 3).length, 2, `grade ${g}: two for anyone`);
    for (const s of ['head', 'boots', 'mantle', 'charm']) assert.equal(bySlot(s).length, 3, `grade ${g} ${s}`);
    // every reader can fill every slot from this grade alone (weapon: a type they use; armour: a piece they may wear)
    for (const m of PARTY_IDS) {
      assert.ok(bySlot('weapon').some((u) => PARTY[m].weapons.includes(u.type)), `grade ${g}: a weapon for ${m}`);
      for (const s of ['body', 'head', 'boots', 'mantle', 'charm']) assert.ok(bySlot(s).some((u) => u.who.includes(m)), `grade ${g}: a ${s} for ${m}`);
    }
    for (const k of [1, 2, 3, 4, 5]) assert.equal(list.filter((u) => u.band === k).length, 4, `grade ${g} band ${k}`);
  }
  assert.deepEqual([1, 2, 3, 4, 5].map((k) => uniquesOfBand(k).length), [12, 12, 12, 12, 12]);
  // the plaque lists them by grade, then band (CAVE_UNIQUE_IDS order); the Quill is band 0, B100 only
  const order = BLUES.map((u) => u.grade * 10 + u.band);
  assert.deepEqual(order, order.slice().sort((a, b) => a - b), 'grade order, then band order');
  const q = CAVE_UNIQUES[BINDER_QUILL_ID];
  assert.equal(q.band, 0); assert.equal(q.grade, 3); assert.equal(q.slot, 'charm');
});

test('the sixteen of C1-data keep their ids, slots and properties, folded into grades by band (1 Lesser, 2 and 3 Greater, 4 and 5 Named)', () => {
  const OLD = { cave_catalogue_pen: [1, 'first_blow_true'], cave_shelf_mail: [1, 'poison_proof'], cave_reading_hood: [1, 'blind_proof'],
    cave_cellar_key: [2, 'venom_edge_2'], cave_root_boots: [2, 'cave_move_plus'], cave_damp_mantle: [2, 'ink_ward_2'],
    cave_court_word: [3, 'thrift_2'], cave_glass_coat: [3, 'haste_at_start_2'], cave_twice_read: [3, 'silence_proof'],
    cave_ember_reader: [4, 'strikes_as_fire'], cave_ash_helm: [4, 'fire_ward_3'], cave_cinder_stride: [4, 'stairs_sense'],
    cave_vellum_robe: [5, 'red_rarity_up'], cave_forge_binding: [5, 'second_life'], cave_name_mantle: [5, 'larder'], cave_binders_mark: [5, 'bookmark_twice'] };
  for (const [id, [band, propId]] of Object.entries(OLD)) {
    const u = CAVE_UNIQUES[id];
    assert.ok(u, id); assert.equal(u.band, band, id); assert.equal(u.prop, propId, id);
    assert.equal(u.grade, band === 1 ? 1 : band <= 3 ? 2 : 3, `${id} grade`);
  }
  assert.equal(CAVE_UNIQUES.cave_forge_binding.prop, 'second_life', 'game/cave.js SECOND_LIFE_PROP rides on the Binding');
  assert.deepEqual(CAVE_UNIQUES.cave_vellum_robe.who, ['mira']); assert.deepEqual(CAVE_UNIQUES.cave_forge_binding.who, ['hero', 'bram']);
});

test('fixed affixes: existing ids, allowed for the slot, a tier the grade\'s item level reaches, folded into stats at the tier\'s top roll', () => {
  for (const u of ALL) {
    assert.ok(u.fixedAffixes.length >= 1 && u.fixedAffixes.length <= 2, u.id);
    for (const a of u.fixedAffixes) {
      const def = AFFIXES[a.id];
      assert.ok(def, `${u.id}: affix ${a.id}`);
      assert.ok(affixAllowed(a.id, u), `${u.id}: ${a.id} cannot sit on a ${u.slot}${u.type ? ' ' + u.type : ''}`);
      assert.ok(def.tiers[a.tier - 1], `${u.id}: ${a.id} tier ${a.tier}`);
      assert.equal(a.value, def.tiers[a.tier - 1][2]);
      assert.ok(def.tiers[a.tier - 1][0] <= u.ilvl, `${u.id}: ${a.id} tier ${a.tier} needs more than item level ${u.ilvl}`);
      assert.ok((u.stats[def.stat] || 0) >= a.value, `${u.id}: ${def.stat} does not carry the ${a.id} value`);
    }
    // the engine's instance sees the folded stats
    const inst = makeUnique(u.id);
    assert.deepEqual(itemStats(inst), u.stats);
    assert.equal(inst.name, u.name); assert.ok(inst.unique);
  }
});

test('properties: one each, never twice in a grade, every one in CAVE_PROPS and in use, numbered families bigger deeper, stats carried by the piece', () => {
  for (const u of ALL) assert.ok(CAVE_PROPS[u.prop], `${u.id}: ${u.prop}`);
  for (const g of GRADE_IDS) {
    const props = uniquesOfGrade(g).map((id) => CAVE_UNIQUES[id].prop);
    assert.equal(new Set(props).size, 20, `grade ${g}: twenty different properties`);
  }
  const used = new Set(ALL.map((u) => u.prop));
  assert.deepEqual(Object.keys(CAVE_PROPS).sort(), [...used].sort(), 'the table lists exactly the props in use');
  for (const p of Object.values(CAVE_PROPS)) {
    assert.ok(['stats', 'loot', 'field', 'battle', 'state'].includes(p.kind), p.id);
    assert.ok(p.name && p.text && !p.text.includes(EM) && !p.name.includes(EM), p.id);
    assert.ok(!/\{|\}/.test(p.text), `${p.id}: the plaque shows the text as written`);
    if (p.kind === 'stats') assert.ok(p.stats || p.extraTypes, `${p.id}: a stats prop carries stats`);
    if (p.grade) {
      // the piece that carries a numbered prop is of that grade
      for (const u of ALL.filter((x) => x.prop === p.id)) assert.equal(u.grade, p.grade, `${u.id} carries ${p.id}`);
    }
  }
  // a numbered family grows with the grade
  const families = {};
  for (const p of Object.values(CAVE_PROPS)) if (p.grade) (families[p.id.replace(/_\d$/, '')] ||= []).push(p);
  assert.ok(Object.keys(families).length >= 8);
  for (const [fam, list] of Object.entries(families)) {
    const vals = list.sort((a, b) => a.grade - b.grade).map((p) => Object.values(p.stats)[0]);
    assert.ok(vals.every((v, i) => i === 0 || v > vals[i - 1]), `${fam}: ${vals.join(' < ')}`);
  }
  // a prop may appear at two grades, never more; a numbered family too (the brief: "a prop may appear at two grades with a
  // bigger number at the higher grade"), so the grades feel different
  for (const id of used) assert.ok(new Set(ALL.filter((u) => u.prop === id).map((u) => u.grade)).size <= 2, id);
  for (const [fam, list] of Object.entries(families)) assert.ok(list.length <= 2, `${fam} spans ${list.length} grades`);
  for (const u of ALL.filter((x) => CAVE_PROPS[x.prop].kind === 'stats')) {
    const p = CAVE_PROPS[u.prop];
    for (const [k, v] of Object.entries(p.stats || {})) assert.ok(u.stats[k] >= v, `${u.id}: ${k}`);
    if (p.extraTypes) { assert.equal(u.slot, 'weapon', `${u.id}: extraTypes is a weapon thing`); assert.deepEqual(u.extraTypes, p.extraTypes); }
  }
  assert.deepEqual(Object.values(CAVE_PROPS).filter((p) => p.kind === 'loot').map((p) => p.id).sort(),
    ['bookmark_more', 'bookmark_twice', 'feather_find', 'larder', 'larder_1', 'lent_more', 'red_rarity_up']);
  assert.deepEqual(Object.values(CAVE_PROPS).filter((p) => p.kind === 'field').map((p) => p.id).sort(), ['cave_move_plus', 'stairs_sense']);
  assert.deepEqual(Object.values(CAVE_PROPS).filter((p) => p.kind === 'battle').map((p) => p.id).sort(), ['exp_lean', 'first_blow_true', 'fury_floor', 'ink_well']);
  assert.deepEqual(Object.values(CAVE_PROPS).filter((p) => p.kind === 'state').map((p) => p.id), ['second_life']);
  // the proofs are complete immunities, which no single affix rolls below item level 7
  assert.equal(CAVE_UNIQUES.cave_shelf_mail.stats.resPoison, 100);
  assert.deepEqual([CAVE_UNIQUES.cave_rootweave.stats.resPoison, CAVE_UNIQUES.cave_rootweave.stats.resBurn, CAVE_UNIQUES.cave_rootweave.stats.resChill], [100, 100, 100]);
  assert.equal(CAVE_UNIQUES.cave_glass_coat.stats.startHaste, 2);
  assert.equal(CAVE_UNIQUES.cave_court_word.stats.mpCostDown, 2);
  for (const k of ['fireDmg', 'iceDmg', 'thunderDmg', 'lightDmg']) assert.ok(CAVE_UNIQUES.cave_record_rod.stats[k] >= 25, `the Full Index: ${k}`);
  assert.deepEqual([CAVE_UNIQUES.cave_usher_helm.stats.inkRes, CAVE_UNIQUES.cave_usher_helm.stats.fireRes], [15, 15]);
});

test('the grades lean as Scott asked: Lesser to conveniences and proofs, Greater to battle edges, Named to run-changers', () => {
  const kinds = (g) => uniquesOfGrade(g).map((id) => CAVE_PROPS[CAVE_UNIQUES[id].prop]);
  const proof = (p) => p.stats && Object.keys(p.stats).every((k) => /^res[A-Z]/.test(k));
  const lesser = kinds(1);
  assert.ok(lesser.filter((p) => proof(p) || p.kind === 'field' || p.kind === 'loot' || p.id === 'ink_well').length >= 12, 'Lesser: most are proofs, field or chest conveniences');
  // the battle edges of Greater and Named never sit on a Lesser (their families are Greater and Named)
  for (const p of lesser) assert.ok(!/^(venom_edge|ink_ward|fire_ward|haste_at_start|crit_lean|fury_lean|mender|leeching)_/.test(p.id), `a Lesser carries ${p.id}`);
  const greater = kinds(2);
  assert.ok(greater.filter((p) => p.kind === 'battle' || (p.kind === 'stats' && !proof(p))).length >= 14, 'Greater: battle edges');
  const named = kinds(3).map((p) => p.id);
  for (const id of ['second_life', 'bookmark_twice', 'red_rarity_up', 'larder', 'exp_lean', 'leeching_3']) assert.ok(named.includes(id), `Named carries ${id}`);
});

test('the pieces work on a member: the engine reads the folded stats, the extra type, the haste and the proofs', () => {
  const mira = newMember('mira', { level: 30 });
  mira.equip = { ...mira.equip, staff: makeUnique('cave_court_word'), body: makeUnique('cave_glass_coat'), charm: makeUnique('cave_twice_read') };
  const s = memberStats(mira);
  assert.equal(s.mpCostDown, 2); assert.equal(s.healPow, 25); assert.equal(s.startHaste, 2); assert.equal(s.resSilence, 100);
  assert.ok(s.mag >= 30 + 30);
  const hero = newMember('hero', { level: 40 });
  hero.weapon = 'axe';
  hero.equip = { ...hero.equip, axe: makeUnique('cave_ember_reader'), body: makeUnique('cave_rootweave') };
  const hs = memberStats(hero);
  assert.deepEqual(hs.extraTypes, ['fire']);
  assert.ok(hs.resPoison === 100 && hs.resBurn === 100 && hs.resChill === 100);
  hero.weapon = 'sword'; hero.equip.sword = makeUnique('cave_lampwick');
  assert.deepEqual(memberStats(hero).extraTypes, ['light']);
  assert.deepEqual(wornProps([mira, hero]).sort(), ['haste_at_start_2', 'silence_proof', 'strikes_as_fire', 'strikes_as_light', 'thrift_2', 'unwritten']);
  assert.deepEqual(wornProps([newMember('bram')]), []);
  assert.ok(isCaveUnique('cave_root_boots') && isCaveUnique(makeUnique('cave_root_boots')) && !isCaveUnique('short_sword') && !isCaveUnique(null));
  // who can wear what matches the party's weapon types
  for (const u of ALL.filter((x) => x.slot === 'weapon')) assert.ok(PARTY_IDS.some((id) => PARTY[id].weapons.includes(u.type)), u.id);
});

test('the Keeper\'s Bookmark: a counted, consumable key item whose line says what it keeps (world.js writes text.js bookmark_desc over it)', () => {
  const b = KEY_ITEMS[KEEPERS_BOOKMARK_ID];
  assert.equal(b, KEEPERS_BOOKMARK);
  assert.equal(b.id, 'keepers_bookmark'); assert.ok(b.key && b.counted && b.consumable && b.cave);
  assert.equal(b.desc, "Closes the book where you stand. This reading's blue gifts come up with you.");   // C4-fixes, CRITIQUE_STACKS 4
  assert.equal(b.use, 'cave_bank');
  assert.equal(ITEMS.keepers_bookmark.kind, 'key');
  assert.ok(!b.name.includes(EM) && b.icon);
});
