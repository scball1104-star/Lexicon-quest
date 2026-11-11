// E6-pack (EPISODE6_PLAN 10): no Episode 6 path ever writes a save slot that holds another run. Pure node tests over a fake
// storage; the real FieldScene.autosave is called unbound, as qa/saves/ep5_saves.test.mjs does for Episode 5. Plan 10.8's
// cases that need the real story, patches and maps are at the end, pending with the reason E6-integrate turns them on.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSave } from '../../src/core/save.js';
import { pickRunSlot, SLOTS_FULL_NOTICE, EP6_LIVE } from '../../src/game/episodes.js';
import { FieldScene } from '../../src/scenes/field.js';
import { createGame, deserialize, serialize, saveMeta, setPosition, EP1_DONE_FLAGS, EP2_DONE_FLAGS } from '../../src/game/state.js';
import { CREDITS_HANDOFF, creditsPending, markCreditsRolled } from '../../src/game/story.js';
import { packsToAwait } from '../../src/game/packs.js';
import { KEY_ITEMS } from '../../src/data/items.js';
import { END_CARD_EP5 } from '../../src/data/ep5/text.js';
import { EP5_FLAGS } from '../../src/data/ep5/flags.js';
import { EP3_DONE_FLAGS, newGameEp4 } from '../../src/data/ep4/start.js';
import { newGameEp5, EP4_DONE_FLAGS } from '../../src/data/ep5/start.js';
import { register as registerEp6 } from '../../src/data/ep6/index.js';
import { newGameEp6, EP6_START, EP5_DONE_FLAGS } from '../../src/data/ep6/start.js';

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; }, _m: m };
}
const fresh = () => { const storage = memoryStorage(); return { storage, save: createSave({ storage, log: () => {} }) }; };
function autosave(save, game) { FieldScene.prototype.autosave.call({ engine: { save }, game, warnOnce() {} }); }
/** A save that just finished Episode 5 (ep5_complete, credits not rolled yet): the run Continue carries into Episode 6. */
function ep5CreditsGame(name = 'Sol', slot = 0) {
  const g = newGameEp5(name, { slot });
  for (const f of EP5_DONE_FLAGS) g.flags[f] = true;
  g.counters.credits4_rolled = 1;
  setPosition(g, 'ep5_saffron', 20, 30, 'down');
  return g;
}

// Issue #99 (2026-11-11): Episode 6 opens in the Armillary Tower at night; the quick start and the Episode 5 credits land there.
test('EP6_START: Lv 25 at 13,300 EXP, Episodes 1 to 5 done, five credits counters, key items, 3,600 gold, in the Armillary Tower', async () => {
  await registerEp6();   // the ep5 pack's items (the Mask, the Compass, name_fragment_5) are registered first, as the quick start does
  const g = newGameEp6('Quill', { slot: 2 });
  assert.equal(g.map, 'ep5_sh_observatory');
  assert.deepEqual([g.pos.x, g.pos.y], [7, 8]);
  assert.equal(EP6_START.mark, 'obs_stage6');
  assert.equal(g.autosaveSlot, 2);
  assert.equal(g.gold, 3600);
  assert.equal(g.chapter, 6);
  assert.deepEqual(g.party.map((m) => m.id), ['hero', 'mira', 'bram']);
  for (const m of g.party) { assert.equal(m.level, 25); assert.equal(m.exp, 13300); assert.ok(m.hp > 0 && m.mp >= 0); }
  for (const f of [...EP1_DONE_FLAGS, ...EP2_DONE_FLAGS, ...EP3_DONE_FLAGS, ...EP4_DONE_FLAGS, ...EP5_DONE_FLAGS, 'ep5_complete', 'star_restored', 'sel_walked_in']) assert.equal(g.flags[f], true, f);
  for (const f of EP5_DONE_FLAGS) assert.ok(f in EP5_FLAGS, `${f} is a declared Episode 5 flag`);
  for (const f of ['ep6_started', 'ep6_morning_done', 'tier_1', 'star_hidden', 'roads_done', 'bells_done']) assert.ok(!g.flags[f], `${f} not set`);
  for (const c of ['credits_rolled', 'credits2_rolled', 'credits3_rolled', 'credits4_rolled', 'credits5_rolled']) assert.equal(g.counters[c], 1, c);
  assert.ok(!g.counters.credits6_rolled);
  for (const id of ['name_fragment_1', 'name_fragment_2', 'name_fragment_3', 'name_fragment_4', 'name_fragment_5', 'lantern_of_recall', 'mirror_sigil']) {
    assert.ok(KEY_ITEMS[id], `${id} is a key item`);
    assert.equal(g.items[id], 1, id);
  }
  assert.deepEqual({ potion: g.items.potion, hi_potion: g.items.hi_potion, hi_ether: g.items.hi_ether, phoenix_feather: g.items.phoenix_feather,
    silver_salve: g.items.silver_salve, hourglass_sand: g.items.hourglass_sand },
  { potion: 6, hi_potion: 8, hi_ether: 6, phoenix_feather: 3, silver_salve: 3, hourglass_sand: 2 });
  const worn = g.party.flatMap((m) => Object.values(m.equip));
  assert.ok(worn.includes('oracle_mask') && worn.includes('caravan_compass'), 'the Oracle\'s Mask and the Caravan Compass are worn');
  assert.deepEqual(deserialize(serialize(g)).flags, g.flags, 'round-trips');
});

test('slot 0 occupied, slot 2 empty: the quick start writes only slot 2, through a full simulated map change', () => {
  const { save, storage } = fresh();
  const other = ep5CreditsGame('Other');
  save.save(0, serialize(other), saveMeta(other));
  save.save(1, serialize(other), saveMeta(other));
  const before = [0, 1].map((n) => save.exportSlot(n));
  const pick = pickRunSlot(save);
  assert.deepEqual(pick, { ok: true, slot: 2, notice: 'This party will save to Record 2.' });
  const g = newGameEp6('Quill', { slot: pick.slot });
  assert.equal(storage._m.size, 2, 'newGameEp6 writes nothing by itself');
  for (const [map, x, y] of [['ep5_sh_inn', 17, 7], ['ep5_saffron', 20, 30], ['ep6_airstair', 12, 44], ['ep6_zephyr', 22, 30], ['ep6_obs_f1', 20, 28]]) {
    setPosition(g, map, x, y, 'down'); autosave(save, g);
  }
  assert.deepEqual([0, 1].map((n) => save.exportSlot(n)), before, 'slots 0 and 1 untouched');
  assert.equal(save.exportSlot(3), null);
  assert.equal(save.load(2).heroName, 'Quill');
  assert.equal(save.load(2).autosaveSlot, 2);
  assert.equal(save.load(2).map, 'ep6_obs_f1');
});

test('every slot full: no quick start, the refusal only, and nothing written', () => {
  const { save, storage } = fresh();
  const other = ep5CreditsGame('Other');
  for (let n = 0; n <= 3; n++) save.save(n, serialize(other), saveMeta(other));
  const snap = JSON.stringify([...storage._m.entries()].sort());
  const pick = pickRunSlot(save);
  assert.deepEqual(pick, { ok: false, slot: null, notice: SLOTS_FULL_NOTICE });
  assert.equal(JSON.stringify([...storage._m.entries()].sort()), snap);
});

test('an Episode 5 credits save loads, rolls the Episode 5 credits with the live end card, wakes in the Armillary Tower, own slot only', async () => {
  await registerEp6();   // the ep6 pack registered (as ?pack=ep6 would): with EP6_LIVE false it leaves entry 5's end card alone
  const { save, storage } = fresh();
  const g0 = ep5CreditsGame('Sol', 1);
  save.save(1, serialize(g0), saveMeta(g0));
  const g = deserialize(save.load(1));
  assert.equal(g.autosaveSlot, 1);
  const has = (f) => !!g.flags[f];
  assert.equal(creditsPending(g, has), 5, 'the Episode 5 credits are due');
  const h = CREDITS_HANDOFF[5];
  assert.equal(h.map, EP6_LIVE ? 'ep5_sh_observatory' : 'ep5_sh_inn');
  assert.equal(h.mark, EP6_LIVE ? 'obs_stage6' : 'inn_bed');
  if (!EP6_LIVE) assert.deepEqual(h.endCard, END_CARD_EP5, 'the Episode 5 end card is unchanged while EP6_LIVE is false');
  assert.equal(h.endCard.sub, EP6_LIVE ? 'Episode 6 begins that night.' : 'Episode 6 is not playable yet.', 'the Episode 5 end card follows the switch (E6-integrate flipped it on the branch)');
  markCreditsRolled(g, 5);
  setPosition(g, h.map, ...(EP6_LIVE ? [7, 8] : [17, 7]), 'down');
  assert.equal(creditsPending(g, has), 0, 'no Episode 6 credits entry is due');
  assert.equal(packsToAwait(g.flags).includes('ep6'), EP6_LIVE, 'the wake waits for the ep6 pack only while it is live');
  autosave(save, g);
  assert.deepEqual([...storage._m.keys()], ['lq-next-slot-1']);
  assert.equal(save.load(1).map, h.map);
  assert.equal(save.load(1).counters.credits5_rolled, 1);
  assert.ok(!save.load(1).flags.ep6_started, 'nothing here runs ep6_morning (the field does, on the tower wake trigger)');
});

test('an Episode 4 save (no ep5_complete) never wants the pack, even with the switch on', () => {
  const g = newGameEp4('Sol', { slot: 0 });
  for (const f of EP4_DONE_FLAGS) g.flags[f] = true;
  assert.ok(!packsToAwait(g.flags, { enabled: true }).includes('ep6'));
  g.flags.ep5_started = true;
  assert.ok(!packsToAwait(g.flags, { enabled: true }).includes('ep6'), 'nor a run in the middle of Episode 5');
});

test('an old save without any Episode 6 field (any slot) loads and autosaves to its own slot only; a fresh game to slot 0', () => {
  for (const slot of [0, 1, 3]) {
    const { save, storage } = fresh();
    const g = deserialize(serialize(ep5CreditsGame('Sol', slot)));
    assert.equal(g.autosaveSlot, slot);
    setPosition(g, 'ep5_saffron', 21, 30, 'down');
    autosave(save, g);
    assert.deepEqual([...storage._m.keys()], [`lq-next-slot-${slot}`]);
    assert.deepEqual(deserialize(save.load(slot)).flags, g.flags);
  }
  const { save, storage } = fresh();
  autosave(save, createGame('Arden'));
  assert.deepEqual([...storage._m.keys()], ['lq-next-slot-0']);
});

// Plan 10.8's cases that need the real story (ep6_morning and its guard), the patches, the maps and the field system are in
// qa/integrate/ep6_integrate.test.mjs (E6-integrate).
