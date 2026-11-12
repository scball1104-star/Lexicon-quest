// E7-pack (EPISODE7_PLAN 10): no Episode 7 path ever writes a save slot that holds another run. Pure node tests over a fake
// storage; the real FieldScene.autosave is called unbound, as qa/saves/ep6_saves.test.mjs does for Episode 6. Plan 10.8's
// cases that need the real story, patches, maps and field system are at the end, pending with the reason E7-integrate turns
// them on.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSave } from '../../src/core/save.js';
import { pickRunSlot, SLOTS_FULL_NOTICE, EP7_LIVE } from '../../src/game/episodes.js';
import { FieldScene } from '../../src/scenes/field.js';
import { createGame, deserialize, serialize, saveMeta, setPosition, EP1_DONE_FLAGS, EP2_DONE_FLAGS } from '../../src/game/state.js';
import { CREDITS_HANDOFF, creditsPending, markCreditsRolled } from '../../src/game/story.js';
import { packsToAwait } from '../../src/game/packs.js';
import { KEY_ITEMS, ITEMS } from '../../src/data/items.js';
import { END_CARD_EP6 } from '../../src/data/ep6/text.js';
import { EP6_FLAGS } from '../../src/data/ep6/flags.js';
import { EP3_DONE_FLAGS } from '../../src/data/ep4/start.js';
import { EP4_DONE_FLAGS } from '../../src/data/ep5/start.js';
import { newGameEp6, EP5_DONE_FLAGS } from '../../src/data/ep6/start.js';
import { register as registerEp7 } from '../../src/data/ep7/index.js';
import { newGameEp7, EP7_START, EP6_DONE_FLAGS } from '../../src/data/ep7/start.js';

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; }, _m: m };
}
const fresh = () => { const storage = memoryStorage(); return { storage, save: createSave({ storage, log: () => {} }) }; };
function autosave(save, game) { FieldScene.prototype.autosave.call({ engine: { save }, game, warnOnce() {} }); }
/** A save that just finished Episode 6 (ep6_complete, credits not rolled yet): the run Continue carries into Episode 7. */
function ep6CreditsGame(name = 'Sol', slot = 0) {
  const g = newGameEp6(name, { slot });
  for (const f of EP6_DONE_FLAGS) g.flags[f] = true;
  g.counters.credits5_rolled = 1;
  setPosition(g, 'ep6_zephyr', 22, 30, 'down');
  return g;
}

test('EP7_START: Lv 28 at 17,900 EXP, Episodes 1 to 6 done, six credits counters, key items, 4,000 gold, in the Cloudhouse Inn', async () => {
  await registerEp7();   // the ep6 pack's items (the Quill, the Wings, sky_compass, the letter) are registered first, as the quick start does
  const g = newGameEp7('Quill', { slot: 2 });
  assert.equal(g.map, 'ep6_zl_inn');
  assert.deepEqual([g.pos.x, g.pos.y], [17, 7]);
  assert.equal(EP7_START.mark, 'inn_bed');
  assert.equal(g.autosaveSlot, 2);
  assert.equal(g.gold, 4000);
  assert.equal(g.chapter, 7);
  assert.deepEqual(g.party.map((m) => m.id), ['hero', 'mira', 'bram']);
  for (const m of g.party) { assert.equal(m.level, 28); assert.equal(m.exp, 17900); assert.ok(m.hp > 0 && m.mp >= 0); }
  for (const f of [...EP1_DONE_FLAGS, ...EP2_DONE_FLAGS, ...EP3_DONE_FLAGS, ...EP4_DONE_FLAGS, ...EP5_DONE_FLAGS, ...EP6_DONE_FLAGS,
    'ep6_complete', 'compass_restored', 'isles_restored', 'white_road_letter_get']) assert.equal(g.flags[f], true, f);
  for (const f of EP6_DONE_FLAGS) assert.ok(f in EP6_FLAGS, `${f} is a declared Episode 6 flag`);
  for (const f of ['ep7_started', 'ep7_morning_done', 'tier_1', 'kept_from_aeris', 'beacon_done', 'locker_found']) assert.ok(!g.flags[f], `${f} not set`);
  for (const c of EP7_START.counters) assert.equal(g.counters[c], 1, c);
  assert.equal(EP7_START.counters.length, 6);
  assert.ok(!g.counters.credits7_rolled);
  for (const id of ['name_fragment_1', 'name_fragment_2', 'name_fragment_3', 'name_fragment_4', 'name_fragment_5', 'name_fragment_6',
    'lantern_of_recall', 'mirror_sigil', 'sky_compass', 'white_road_letter']) {
    assert.ok(KEY_ITEMS[id], `${id} is a key item`);
    assert.equal(g.items[id], 1, id);
  }
  assert.deepEqual({ potion: g.items.potion, hi_potion: g.items.hi_potion, hi_ether: g.items.hi_ether, phoenix_feather: g.items.phoenix_feather,
    silver_salve: g.items.silver_salve, ember_tea: g.items.ember_tea },
  { potion: 6, hi_potion: 8, hi_ether: 6, phoenix_feather: 3, silver_salve: 3, ember_tea: 2 });
  if (!ITEMS.ember_tea) console.log('# ember_tea is not an item yet (E7-battle items.js, wave 7a): the bag holds the id the plan names');
  const worn = g.party.flatMap((m) => Object.values(m.equip));
  assert.ok(worn.includes('scribe_quill') && worn.includes('kestrel_wings'), "the Scribe's Quill and the Kestrel's Wings are worn");
  assert.deepEqual(deserialize(serialize(g)).flags, g.flags, 'round-trips');
  creditsPending(g, (f) => !!g.flags[f]);
  assert.equal(creditsPending(g, (f) => !!g.flags[f]), 0, 'no credits are due on the quick start (credits6_rolled is set)');
});

test('slot 0 occupied, slot 2 empty: the quick start writes only slot 2, through a full simulated map change', () => {
  const { save, storage } = fresh();
  const other = ep6CreditsGame('Other');
  save.save(0, serialize(other), saveMeta(other));
  save.save(1, serialize(other), saveMeta(other));
  const before = [0, 1].map((n) => save.exportSlot(n));
  const pick = pickRunSlot(save);
  assert.deepEqual(pick, { ok: true, slot: 2, notice: 'This party will save to Record 2.' });
  const g = newGameEp7('Quill', { slot: pick.slot });
  assert.equal(storage._m.size, 2, 'newGameEp7 writes nothing by itself');
  for (const [map, x, y] of [['ep6_zl_inn', 17, 7], ['ep6_zl_charts', 8, 8], ['ep6_zephyr', 22, 30], ['ep7_white_road', 14, 50], ['ep7_vault_f2', 20, 28]]) {
    setPosition(g, map, x, y, 'down'); autosave(save, g);
  }
  assert.deepEqual([0, 1].map((n) => save.exportSlot(n)), before, 'slots 0 and 1 untouched');
  assert.equal(save.exportSlot(3), null);
  assert.equal(save.load(2).heroName, 'Quill');
  assert.equal(save.load(2).autosaveSlot, 2);
  assert.equal(save.load(2).map, 'ep7_vault_f2');
});

test('every slot full: no quick start, the refusal only, and nothing written', () => {
  const { save, storage } = fresh();
  const other = ep6CreditsGame('Other');
  for (let n = 0; n <= 3; n++) save.save(n, serialize(other), saveMeta(other));
  const snap = JSON.stringify([...storage._m.entries()].sort());
  const pick = pickRunSlot(save);
  assert.deepEqual(pick, { ok: false, slot: null, notice: SLOTS_FULL_NOTICE });
  assert.equal(JSON.stringify([...storage._m.entries()].sort()), snap);
});

test('an Episode 6 credits save loads, rolls the Episode 6 credits with the unchanged end card, wakes in the inn, own slot only', async () => {
  await registerEp7();   // the ep7 pack registered (as ?pack=ep7 would): with EP7_LIVE false it leaves entry 6's end card alone
  const { save, storage } = fresh();
  const g0 = ep6CreditsGame('Sol', 1);
  save.save(1, serialize(g0), saveMeta(g0));
  const g = deserialize(save.load(1));
  assert.equal(g.autosaveSlot, 1);
  const has = (f) => !!g.flags[f];
  assert.equal(creditsPending(g, has), 6, 'the Episode 6 credits are due');
  const h = CREDITS_HANDOFF[6];
  assert.deepEqual([h.map, h.mark], ['ep6_zl_inn', 'inn_bed'], 'the Episode 6 wake is unchanged (plan 3: the inn fires the morning)');
  if (!EP7_LIVE) assert.deepEqual(h.endCard, END_CARD_EP6, 'the Episode 6 end card is unchanged while EP7_LIVE is false');
  assert.equal(h.endCard.sub, EP7_LIVE ? 'Episode 7 begins in the morning.' : 'Episode 7 is not playable yet.', 'the Episode 6 end card follows the switch');
  markCreditsRolled(g, 6);
  assert.equal(g.counters.credits6_rolled, 1);
  setPosition(g, h.map, 17, 7, 'down');
  assert.equal(creditsPending(g, has), 0, 'no Episode 7 credits entry is due');
  assert.equal(packsToAwait(g.flags).includes('ep7'), EP7_LIVE, 'the wake waits for the ep7 pack only while it is live');
  autosave(save, g);
  assert.deepEqual([...storage._m.keys()], ['lq-next-slot-1']);
  assert.equal(save.load(1).map, 'ep6_zl_inn');
  assert.equal(save.load(1).counters.credits6_rolled, 1);
  assert.ok(!save.load(1).flags.ep7_started, 'nothing here runs ep7_morning (the field does, on the inn wake trigger)');
});

test('an Episode 5 save (no ep6_complete) never wants the pack, even with the switch on', () => {
  const g = newGameEp6('Sol', { slot: 0 });   // stands where Episode 6 begins: Episode 5 done, Episode 6 not
  assert.ok(!g.flags.ep6_complete);
  assert.ok(!packsToAwait(g.flags, { enabled: true }).includes('ep7'));
  g.flags.ep6_started = true;
  assert.ok(!packsToAwait(g.flags, { enabled: true }).includes('ep7'), 'nor a run in the middle of Episode 6');
});

test('an old save without any Episode 7 field (any slot) loads and autosaves to its own slot only; a fresh game to slot 0', () => {
  for (const slot of [0, 1, 3]) {
    const { save, storage } = fresh();
    const g = deserialize(serialize(ep6CreditsGame('Sol', slot)));
    assert.equal(g.autosaveSlot, slot);
    setPosition(g, 'ep6_zephyr', 23, 30, 'down');
    autosave(save, g);
    assert.deepEqual([...storage._m.keys()], [`lq-next-slot-${slot}`]);
    assert.deepEqual(deserialize(save.load(slot)).flags, g.flags);
  }
  const { save, storage } = fresh();
  autosave(save, createGame('Arden'));
  assert.deepEqual([...storage._m.keys()], ['lq-next-slot-0']);
});

// Plan 10.8's cases that need the real story (ep7_morning and its guard: E7-story, wave 7a, in its own checkout), the patches
// and maps (E7-maps-a/b, wave 7c) and the field system (E7-world, wave 7b). E7-integrate turns each one on.
const PENDING = 'pending: needs ep7_morning (E7-story story.js), ep7_patches.js (E7-maps-a) and the field system (E7-world); E7-integrate turns this on';
test('an Episode 6 credits fixture reaches ep7_morning with EP7_LIVE on, and does not with it off', { skip: PENDING }, () => {});
test('a Fine Print save (tier_1) never reaches ep7_morning', { skip: PENDING }, () => {});
test('an Episode 5 save (no ep6_complete) never reaches ep7_morning', { skip: PENDING }, () => {});
test('a save made on a held path cell reloads with the authored holds and the party on ground, able to walk', { skip: PENDING }, () => {});
test("an Episode 6 save that skipped Piri's Dead Letters gets white_road_letter in ep7_morning; one that did not is not given a second", { skip: PENDING }, () => {});
