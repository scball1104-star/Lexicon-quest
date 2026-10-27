// C1-data: the sixteen cave uniques, the Binder's Quill and the Keeper's Bookmark (src/data/cave/items.js) against
// docs/DEEP_STACKS_PLAN.md 2.6 and 6.2 and the C1-data brief (deliverable 4).
import test from 'node:test';
import assert from 'node:assert/strict';
import register from '../../src/data/cave/index.js';
import { CAVE_UNIQUES, CAVE_UNIQUE_IDS, CAVE_PROPS, BINDER_QUILL_ID, KEEPERS_BOOKMARK, KEEPERS_BOOKMARK_ID, uniquesOfBand, wornProps, isCaveUnique } from '../../src/data/cave/items.js';
import { UNIQUES, KEY_ITEMS, ITEMS, EQUIPMENT, AFFIXES, EQUIP_SLOTS, RARITIES } from '../../src/data/items.js';
import { PARTY, PARTY_IDS, newMember } from '../../src/data/party.js';
import { makeUnique, itemStats, affixAllowed, tierFor } from '../../src/battle/loot.js';
import { memberStats } from '../../src/battle/rules.js';

await register();
const EM = String.fromCharCode(0x2014);
const ALL = Object.values(CAVE_UNIQUES);

test('seventeen uniques: cave_ ids, legendary, unique, cave, valid slots and owners, no two share a name', () => {
  assert.equal(ALL.length, 17);
  assert.equal(CAVE_UNIQUE_IDS.length, 16);
  assert.ok(!CAVE_UNIQUE_IDS.includes(BINDER_QUILL_ID) && CAVE_UNIQUES[BINDER_QUILL_ID]);
  const names = new Set();
  for (const u of ALL) {
    assert.ok(u.id.startsWith('cave_'), u.id);
    assert.equal(u.rarity, 'legendary'); assert.ok(u.unique && u.cave, u.id);
    assert.ok(RARITIES[u.rarity]);
    assert.ok(EQUIP_SLOTS.includes(u.slot), `${u.id} slot ${u.slot}`);
    if (u.slot === 'weapon') assert.ok(['sword', 'staff', 'spear', 'axe'].includes(u.type), `${u.id} type`);
    else { assert.ok(Array.isArray(u.who) && u.who.length && u.who.every((id) => PARTY_IDS.includes(id)), `${u.id} who`); assert.ok(!u.type); }
    assert.ok(!names.has(u.name), `name ${u.name} twice`); names.add(u.name);
    assert.ok(u.ilvl >= 4 && u.ilvl <= 16 && u.price === 0 && u.noSell, u.id);
    assert.ok(u.icon, u.id);
    assert.ok(Array.isArray(u.lore) && u.lore.length === 2 && u.lore.every((l) => l.length > 10 && l.length <= 60), `${u.id} lore`);
    assert.ok(u.desc && !u.desc.includes(EM) && !u.name.includes(EM) && u.source);
    assert.ok(UNIQUES[u.id] === u && ITEMS[u.id] && ITEMS[u.id].kind === 'equipment' && ITEMS[u.id].unique, `${u.id} registered`);
    assert.ok(!EQUIPMENT[u.id], `${u.id} never in the random pools`);
    assert.ok(!Object.values(u.stats).some((v) => !v), `${u.id} has a zero stat`);
  }
  // four weapons, one per type the party uses; four body; two of each other slot
  const bySlot = (s) => ALL.filter((u) => u.slot === s);
  assert.deepEqual(bySlot('weapon').map((u) => u.type).sort(), ['axe', 'spear', 'staff', 'sword']);
  assert.equal(bySlot('body').length, 4); assert.equal(bySlot('head').length, 2); assert.equal(bySlot('boots').length, 2); assert.equal(bySlot('mantle').length, 2);
  assert.equal(bySlot('charm').length, 3, 'two charms and the Quill');
  // bands: three for 1 to 4, four for 5, the Quill at 0 (B100 only)
  assert.deepEqual([1, 2, 3, 4, 5].map((k) => uniquesOfBand(k).length), [3, 3, 3, 3, 4]);
  assert.equal(CAVE_UNIQUES[BINDER_QUILL_ID].band, 0);
});

test('fixed affixes: existing ids, allowed for the slot, a real tier, folded into stats at the tier\'s top roll', () => {
  for (const u of ALL) {
    assert.ok(u.fixedAffixes.length >= 1 && u.fixedAffixes.length <= 2, u.id);
    for (const a of u.fixedAffixes) {
      const def = AFFIXES[a.id];
      assert.ok(def, `${u.id}: affix ${a.id}`);
      assert.ok(affixAllowed(a.id, u), `${u.id}: ${a.id} cannot sit on a ${u.slot}${u.type ? ' ' + u.type : ''}`);
      assert.ok(def.tiers[a.tier - 1], `${u.id}: ${a.id} tier ${a.tier}`);
      assert.equal(a.value, def.tiers[a.tier - 1][2]);
      assert.ok(tierFor(def, u.ilvl) >= a.tier - 1, `${u.id}: ${a.id} tier ${a.tier} needs more than ilvl ${u.ilvl}`);
      assert.ok((u.stats[def.stat] || 0) >= a.value, `${u.id}: ${def.stat} does not carry the ${a.id} value`);
    }
    // the engine's instance sees the folded stats
    const inst = makeUnique(u.id);
    assert.deepEqual(itemStats(inst), u.stats);
    assert.equal(inst.name, u.name); assert.ok(inst.unique);
  }
});

test('props: one each, every one in CAVE_PROPS, at least eight that work with stats alone and already carried by the piece', () => {
  const used = ALL.map((u) => u.prop);
  assert.equal(new Set(used).size, 17, 'no prop twice');
  for (const p of used) assert.ok(CAVE_PROPS[p], p);
  assert.deepEqual(Object.keys(CAVE_PROPS).sort(), used.slice().sort(), 'the table lists exactly the props in use');
  const statsOnly = ALL.filter((u) => CAVE_PROPS[u.prop].kind === 'stats');
  assert.ok(statsOnly.length >= 8, `${statsOnly.length} stats-only props`);
  for (const u of statsOnly) {
    const p = CAVE_PROPS[u.prop];
    for (const [k, v] of Object.entries(p.stats || {})) assert.ok(u.stats[k] >= v, `${u.id}: ${k}`);
    if (p.extraTypes) { assert.equal(u.slot, 'weapon', `${u.id}: extraTypes is a weapon thing`); assert.deepEqual(u.extraTypes, p.extraTypes); }
  }
  for (const p of Object.values(CAVE_PROPS)) {
    assert.ok(['stats', 'loot', 'field', 'battle', 'state'].includes(p.kind), p.id);
    assert.ok(p.name && p.text && !p.text.includes(EM));
  }
  assert.deepEqual(Object.values(CAVE_PROPS).filter((p) => p.kind === 'loot').map((p) => p.id).sort(), ['bookmark_twice', 'gold_double', 'red_rarity_up']);
  // the resist props are complete immunities, which no affix rolls (the of_* resist suffixes cap at 100 only at ilvl 7 and up)
  assert.equal(CAVE_UNIQUES.cave_shelf_mail.stats.resPoison, 100);
  assert.equal(CAVE_UNIQUES.cave_glass_coat.stats.startHaste, 2);
  assert.equal(CAVE_UNIQUES.cave_court_word.stats.mpCostDown, 2);
});

test('the pieces work on a member: the engine reads the folded stats, the extra type and the haste', () => {
  const mira = newMember('mira', { level: 30 });
  mira.equip = { ...mira.equip, staff: makeUnique('cave_court_word'), body: makeUnique('cave_glass_coat'), charm: makeUnique('cave_twice_read') };
  const s = memberStats(mira);
  assert.equal(s.mpCostDown, 2); assert.equal(s.healPow, 25); assert.equal(s.startHaste, 2); assert.equal(s.resSilence, 100);
  assert.ok(s.mag >= 30 + 24);
  const hero = newMember('hero', { level: 40 });
  hero.weapon = 'axe';
  hero.equip = { ...hero.equip, axe: makeUnique('cave_ember_reader') };
  assert.deepEqual(memberStats(hero).extraTypes, ['fire']);
  assert.deepEqual(wornProps([mira, hero]).sort(), ['haste_at_start', 'silence_proof', 'strikes_as_fire', 'thrift']);
  assert.deepEqual(wornProps([newMember('bram')]), []);
  assert.ok(isCaveUnique('cave_root_boots') && isCaveUnique(makeUnique('cave_root_boots')) && !isCaveUnique('short_sword') && !isCaveUnique(null));
});

test('budget: a cave unique is strong at its depth and never above the main game\'s tier 6 bases outside', () => {
  const main = (s) => (s.atk || 0) + (s.mag || 0);
  const bestOf = (slot, type) => Math.max(...Object.values(EQUIPMENT).filter((b) => b.slot === slot && (!type || b.type === type)).map((b) => slot === 'weapon' ? main(b.stats) : (b.stats.def || 0)));
  for (const u of ALL) {
    if (u.slot === 'weapon') assert.ok(main(u.stats) <= bestOf('weapon', u.type), `${u.id}: ${main(u.stats)} beats the tier 6 ${u.type}`);
    else if (['body', 'head'].includes(u.slot)) assert.ok((u.stats.def || 0) <= bestOf(u.slot) * 1.6, `${u.id}: DEF ${u.stats.def}`);
  }
  // the first-band pieces stay around Episode 1's legendary numbers
  assert.ok(CAVE_UNIQUES.cave_catalogue_pen.stats.atk <= UNIQUES.lanternheart.stats.atk);
  assert.ok(CAVE_UNIQUES.cave_shelf_mail.stats.def <= UNIQUES.mirrorguard_mail.stats.def);
  // who can wear what matches the party's weapon types
  for (const u of ALL.filter((x) => x.slot === 'weapon')) assert.ok(PARTY_IDS.some((id) => PARTY[id].weapons.includes(u.type)), u.id);
});

test('the Keeper\'s Bookmark: a counted, consumable key item with the plan\'s line', () => {
  const b = KEY_ITEMS[KEEPERS_BOOKMARK_ID];
  assert.equal(b, KEEPERS_BOOKMARK);
  assert.equal(b.id, 'keepers_bookmark'); assert.ok(b.key && b.counted && b.consumable && b.cave);
  assert.equal(b.desc, 'Closes the book where you stand.');
  assert.equal(b.use, 'cave_bank');
  assert.equal(ITEMS.keepers_bookmark.kind, 'key');
  assert.ok(!b.name.includes(EM) && b.icon);
});
