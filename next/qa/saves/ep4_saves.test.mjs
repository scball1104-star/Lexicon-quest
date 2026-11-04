// E4-pack (EPISODE4_PLAN 10): no Episode 4 path ever writes a save slot that holds another run. Pure node tests over a fake
// storage; the real FieldScene.autosave is called unbound, as qa/core/e3_saves.test.mjs does for Episode 3.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSave } from '../../src/core/save.js';
import { pickRunSlot, SLOTS_FULL_NOTICE } from '../../src/game/episodes.js';
import { FieldScene } from '../../src/scenes/field.js';
import { createGame, deserialize, serialize, saveMeta, newGameEp3, setPosition, EP1_DONE_FLAGS, EP2_DONE_FLAGS } from '../../src/game/state.js';
import { KEY_ITEMS } from '../../src/data/items.js';
import { newGameEp4, EP4_START, EP3_DONE_FLAGS } from '../../src/data/ep4/start.js';
import { EP3_FLAGS } from '../../src/data/quests.js';

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; }, _m: m };
}
const fresh = () => { const storage = memoryStorage(); return { storage, save: createSave({ storage, log: () => {} }) }; };
function autosave(save, game) { FieldScene.prototype.autosave.call({ engine: { save }, game, warnOnce() {} }); }
/** A save that just saw the Episode 3 credits (the run Continue carries into Episode 4). */
function ep3CreditsGame(name = 'Sol') {
  const g = newGameEp3(name, { slot: 0 });
  for (const f of EP3_DONE_FLAGS) g.flags[f] = true;
  g.counters.credits3_rolled = 1;
  setPosition(g, 'pk_inn', 17, 7, 'down');
  return g;
}

test('EP4_START: Lv 17 at 5,600 EXP, Episodes 1 to 3 done, three credits counters, key items, 2,400 gold, awake at pk_inn', () => {
  const g = newGameEp4('Quill', { slot: 2 });
  assert.equal(g.map, 'pk_inn');
  assert.deepEqual([g.pos.x, g.pos.y], [17, 7]);
  assert.equal(EP4_START.mark, 'inn_bed');
  assert.equal(g.autosaveSlot, 2);
  assert.equal(g.gold, 2400);
  assert.equal(g.chapter, 4);
  assert.deepEqual(g.party.map((m) => m.id), ['hero', 'mira', 'bram']);
  for (const m of g.party) { assert.equal(m.level, 17); assert.equal(m.exp, 5600); assert.ok(m.hp > 0 && m.mp >= 0); }
  for (const f of [...EP1_DONE_FLAGS, ...EP2_DONE_FLAGS, ...EP3_DONE_FLAGS, 'ep3_complete']) assert.equal(g.flags[f], true, f);
  for (const f of EP3_DONE_FLAGS) assert.ok(f in EP3_FLAGS, `${f} is a declared Episode 3 flag`);
  for (const f of ['ep4_started', 'ep4_morning_done', 'tier_1', 'east_road_open']) assert.ok(!g.flags[f], `${f} not set`);
  for (const c of ['credits_rolled', 'credits2_rolled', 'credits3_rolled']) assert.equal(g.counters[c], 1, c);
  for (const id of ['name_fragment_1', 'name_fragment_2', 'name_fragment_3', 'lantern_of_recall', 'mirror_sigil']) {
    assert.ok(KEY_ITEMS[id], `${id} is a key item`);
    assert.equal(g.items[id], 1, id);
  }
  assert.deepEqual({ potion: g.items.potion, hi_potion: g.items.hi_potion, hi_ether: g.items.hi_ether, phoenix_feather: g.items.phoenix_feather, silver_salve: g.items.silver_salve },
    { potion: 6, hi_potion: 6, hi_ether: 4, phoenix_feather: 3, silver_salve: 2 });
  assert.equal(g.party.find((m) => m.id === 'bram').equip.axe, 'first_bell_hammer');
  assert.equal(g.party.find((m) => m.id === 'hero').equip.charm, 'warden_heart');
  assert.deepEqual(deserialize(serialize(g)).flags, g.flags, 'round-trips');
});

test('slot 0 occupied, slot 2 empty: the quick start writes only slot 2, through a full simulated map change', () => {
  const { save, storage } = fresh();
  const other = ep3CreditsGame('Other');
  save.save(0, serialize(other), saveMeta(other));
  save.save(1, serialize(other), saveMeta(other));
  const before = [0, 1].map((n) => save.exportSlot(n));
  const pick = pickRunSlot(save);
  assert.deepEqual(pick, { ok: true, slot: 2, notice: 'This party will save to Record 2.' });
  const g = newGameEp4('Quill', { slot: pick.slot });
  assert.equal(storage._m.size, 2, 'newGameEp4 writes nothing by itself');
  for (const [map, x, y] of [['pk_inn', 17, 7], ['emberpeak', 37, 15], ['ep4_flood_road', 1, 15], ['emberpeak', 36, 15]]) { setPosition(g, map, x, y, 'down'); autosave(save, g); }
  assert.deepEqual([0, 1].map((n) => save.exportSlot(n)), before, 'slots 0 and 1 untouched');
  assert.equal(save.exportSlot(3), null);
  assert.equal(save.load(2).heroName, 'Quill');
  assert.equal(save.load(2).autosaveSlot, 2);
});

test('every slot full: no quick start, the refusal only, and nothing written', () => {
  const { save, storage } = fresh();
  const other = ep3CreditsGame('Other');
  for (let n = 0; n <= 3; n++) save.save(n, serialize(other), saveMeta(other));
  const snap = JSON.stringify([...storage._m.entries()].sort());
  const pick = pickRunSlot(save);
  assert.deepEqual(pick, { ok: false, slot: null, notice: SLOTS_FULL_NOTICE });
  assert.equal(JSON.stringify([...storage._m.entries()].sort()), snap);
});

test('an old save without g.washed (any slot) loads and autosaves to its own slot only', () => {
  for (const slot of [0, 1, 3]) {
    const { save, storage } = fresh();
    const g0 = ep3CreditsGame();
    g0.autosaveSlot = slot;
    const raw = serialize(g0);
    delete raw.washed;
    const g = deserialize(raw);
    assert.equal(g.autosaveSlot, slot);
    setPosition(g, 'emberpeak', 20, 20, 'down');
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
