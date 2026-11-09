// E5-pack (EPISODE5_PLAN 10): no Episode 5 path ever writes a save slot that holds another run. Pure node tests over a fake
// storage; the real FieldScene.autosave is called unbound, as qa/saves/ep4_saves.test.mjs does for Episode 4.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSave } from '../../src/core/save.js';
import { pickRunSlot, SLOTS_FULL_NOTICE, EP5_LIVE } from '../../src/game/episodes.js';
import { FieldScene } from '../../src/scenes/field.js';
import { createGame, deserialize, serialize, saveMeta, setPosition, EP1_DONE_FLAGS, EP2_DONE_FLAGS } from '../../src/game/state.js';
import { CREDITS_HANDOFF, creditsPending, markCreditsRolled } from '../../src/game/story.js';
import { packsToAwait } from '../../src/game/packs.js';
import { KEY_ITEMS } from '../../src/data/items.js';
import { newGameEp4, EP3_DONE_FLAGS } from '../../src/data/ep4/start.js';
import { EP4_FLAGS } from '../../src/data/ep4/flags.js';
import { register as registerEp5 } from '../../src/data/ep5/index.js';
import { newGameEp5, EP5_START, EP4_DONE_FLAGS } from '../../src/data/ep5/start.js';

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; }, _m: m };
}
const fresh = () => { const storage = memoryStorage(); return { storage, save: createSave({ storage, log: () => {} }) }; };
function autosave(save, game) { FieldScene.prototype.autosave.call({ engine: { save }, game, warnOnce() {} }); }
/** A save that just finished Episode 4 (ep4_complete, credits not rolled yet): the run Continue carries into Episode 5. */
function ep4CreditsGame(name = 'Sol', slot = 0) {
  const g = newGameEp4(name, { slot });
  for (const f of EP4_DONE_FLAGS) g.flags[f] = true;
  setPosition(g, 'ep4_valewyn', 20, 20, 'down');
  return g;
}

test('EP5_START: Lv 21 at 8,900 EXP, Episodes 1 to 4 done, four credits counters, key items, 3,200 gold, awake at ep4_vw_inn', async () => {
  await registerEp5();   // the ep4 pack's items (the Seal, the Trident, name_fragment_4) are registered first, as the quick start does
  const g = newGameEp5('Quill', { slot: 2 });
  assert.equal(g.map, 'ep4_vw_inn');
  assert.deepEqual([g.pos.x, g.pos.y], [17, 7]);
  assert.equal(EP5_START.mark, 'inn_bed');
  assert.equal(g.autosaveSlot, 2);
  assert.equal(g.gold, 3200);
  assert.equal(g.chapter, 5);
  assert.deepEqual(g.party.map((m) => m.id), ['hero', 'mira', 'bram']);
  for (const m of g.party) { assert.equal(m.level, 21); assert.equal(m.exp, 8900); assert.ok(m.hp > 0 && m.mp >= 0); }
  for (const f of [...EP1_DONE_FLAGS, ...EP2_DONE_FLAGS, ...EP3_DONE_FLAGS, ...EP4_DONE_FLAGS, 'ep4_complete', 'lyra_named']) assert.equal(g.flags[f], true, f);
  for (const f of EP4_DONE_FLAGS) assert.ok(f in EP4_FLAGS, `${f} is a declared Episode 4 flag`);
  for (const f of ['ep5_started', 'ep5_morning_done', 'tier_1', 'lyra_kind', 'witnesses_done', 'nilo_done']) assert.ok(!g.flags[f], `${f} not set`);
  for (const c of ['credits_rolled', 'credits2_rolled', 'credits3_rolled', 'credits4_rolled']) assert.equal(g.counters[c], 1, c);
  assert.ok(!g.counters.credits5_rolled);
  for (const id of ['name_fragment_1', 'name_fragment_2', 'name_fragment_3', 'name_fragment_4', 'lantern_of_recall', 'mirror_sigil']) {
    assert.ok(KEY_ITEMS[id], `${id} is a key item`);
    assert.equal(g.items[id], 1, id);
  }
  assert.deepEqual({ potion: g.items.potion, hi_potion: g.items.hi_potion, hi_ether: g.items.hi_ether, phoenix_feather: g.items.phoenix_feather, silver_salve: g.items.silver_salve },
    { potion: 6, hi_potion: 8, hi_ether: 5, phoenix_feather: 3, silver_salve: 3 });
  const bram = g.party.find((m) => m.id === 'bram');
  assert.equal(bram.equip.axe, 'first_bell_hammer');
  assert.equal(bram.equip.spear, 'tidewarden_trident');
  assert.equal(bram.equip.charm, 'regents_seal');
  assert.deepEqual(deserialize(serialize(g)).flags, g.flags, 'round-trips');
});

test('slot 0 occupied, slot 2 empty: the quick start writes only slot 2, through a full simulated map change', () => {
  const { save, storage } = fresh();
  const other = ep4CreditsGame('Other');
  save.save(0, serialize(other), saveMeta(other));
  save.save(1, serialize(other), saveMeta(other));
  const before = [0, 1].map((n) => save.exportSlot(n));
  const pick = pickRunSlot(save);
  assert.deepEqual(pick, { ok: true, slot: 2, notice: 'This party will save to Record 2.' });
  const g = newGameEp5('Quill', { slot: pick.slot });
  assert.equal(storage._m.size, 2, 'newGameEp5 writes nothing by itself');
  for (const [map, x, y] of [['ep4_vw_inn', 17, 7], ['ep4_valewyn', 20, 30], ['ep5_ship', 3, 7], ['ep5_caravan_road', 2, 14], ['ep5_saffron', 20, 30]]) {
    setPosition(g, map, x, y, 'down'); autosave(save, g);
  }
  assert.deepEqual([0, 1].map((n) => save.exportSlot(n)), before, 'slots 0 and 1 untouched');
  assert.equal(save.exportSlot(3), null);
  assert.equal(save.load(2).heroName, 'Quill');
  assert.equal(save.load(2).autosaveSlot, 2);
  assert.equal(save.load(2).map, 'ep5_saffron');
});

test('every slot full: no quick start, the refusal only, and nothing written', () => {
  const { save, storage } = fresh();
  const other = ep4CreditsGame('Other');
  for (let n = 0; n <= 3; n++) save.save(n, serialize(other), saveMeta(other));
  const snap = JSON.stringify([...storage._m.entries()].sort());
  const pick = pickRunSlot(save);
  assert.deepEqual(pick, { ok: false, slot: null, notice: SLOTS_FULL_NOTICE });
  assert.equal(JSON.stringify([...storage._m.entries()].sort()), snap);
});

test('an Episode 4 credits save loads, rolls the Episode 4 credits with the unchanged end card, wakes at ep4_vw_inn, own slot only', async () => {
  await registerEp5();
  const { save, storage } = fresh();
  const g0 = ep4CreditsGame('Sol', 1);
  save.save(1, serialize(g0), saveMeta(g0));
  const g = deserialize(save.load(1));
  assert.equal(g.autosaveSlot, 1);
  const has = (f) => !!g.flags[f];
  assert.equal(creditsPending(g, has), 4, 'the Episode 4 credits are due');
  const h = CREDITS_HANDOFF[4];
  assert.equal(h.map, 'ep4_vw_inn');
  assert.equal(h.mark, 'inn_bed');
  assert.equal(h.endCard.sub, EP5_LIVE ? 'Episode 5 begins in the morning.' : 'Episode 5 is not playable yet.',
    'the Episode 4 end card follows the switch (E5-integrate flipped it on the branch)');
  markCreditsRolled(g, 4);
  setPosition(g, h.map, 17, 7, 'down');
  assert.equal(creditsPending(g, has), 0, 'no Episode 5 credits entry is due');
  assert.equal(packsToAwait(g.flags).includes('ep5'), EP5_LIVE, 'the wake waits for the ep5 pack only while it is live');
  autosave(save, g);
  assert.deepEqual([...storage._m.keys()], ['lq-next-slot-1']);
  assert.equal(save.load(1).map, 'ep4_vw_inn');
  assert.equal(save.load(1).counters.credits4_rolled, 1);
  assert.ok(!save.load(1).flags.ep5_started, 'nothing here runs ep5_morning (the field does, on the next enter of the inn)');
});

test('an old save without any Episode 5 field (any slot) loads and autosaves to its own slot only', () => {
  for (const slot of [0, 1, 3]) {
    const { save, storage } = fresh();
    const g0 = ep4CreditsGame('Sol', slot);
    const raw = serialize(g0);
    const g = deserialize(raw);
    assert.equal(g.autosaveSlot, slot);
    setPosition(g, 'ep4_valewyn', 21, 20, 'down');
    autosave(save, g);
    assert.deepEqual([...storage._m.keys()], [`lq-next-slot-${slot}`]);
    assert.deepEqual(deserialize(save.load(slot)).flags, g.flags);
  }
});

test('an Episode 1 save and a fresh game still autosave to slot 0 (the schema is additive)', () => {
  const { save, storage } = fresh();
  const g = createGame('Arden');
  autosave(save, g);
  assert.deepEqual([...storage._m.keys()], ['lq-next-slot-0']);
});

// Plan 10.8's cases that need the real story, patches and maps (the Episode 4 credits fixture reaches ep5_morning once with
// EP5_LIVE on; a Fine Print save never does; a mid-Labyrinth save reloads with latched plates and every floor at its start hour)
// are in qa/integrate/ep5_integrate.test.mjs (E5-integrate).
