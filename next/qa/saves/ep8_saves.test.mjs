// E8-pack (EPISODE8_PLAN 10): no Episode 8 path ever writes a save slot that holds another run. Pure node tests over a fake
// storage; the real FieldScene.autosave is called unbound, as qa/saves/ep7_saves.test.mjs does for Episode 7. Plan 10.9's cases
// that need the real story (ep8_morning, last_choice, Talk's steps), the maps and the pop-up books are listed at the end as
// pending, each with the agent and wave that brings what it needs; E8-integrate turns them on.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSave } from '../../src/core/save.js';
import { pickRunSlot, SLOTS_FULL_NOTICE, EP8_LIVE } from '../../src/game/episodes.js';
import { FieldScene } from '../../src/scenes/field.js';
import { createGame, deserialize, serialize, saveMeta, setPosition, EP1_DONE_FLAGS, EP2_DONE_FLAGS } from '../../src/game/state.js';
import { CREDITS_HANDOFF, creditsPending, markCreditsRolled } from '../../src/game/story.js';
import { packsToAwait } from '../../src/game/packs.js';
import { KEY_ITEMS } from '../../src/data/items.js';
import { END_CARD_EP7 } from '../../src/data/ep7/text.js';
import { EP7_FLAGS } from '../../src/data/ep7/flags.js';
import { EP3_DONE_FLAGS } from '../../src/data/ep4/start.js';
import { EP4_DONE_FLAGS } from '../../src/data/ep5/start.js';
import { EP5_DONE_FLAGS } from '../../src/data/ep6/start.js';
import { newGameEp7, EP6_DONE_FLAGS } from '../../src/data/ep7/start.js';
import { register as registerEp8 } from '../../src/data/ep8/index.js';
import { newGameEp8, EP8_START, EP7_DONE_FLAGS } from '../../src/data/ep8/start.js';
import { handoff8, register as registerHooks, unregister, WAKE8, END_CARD_EP8 } from '../../src/data/ep8/hooks.js';
import { carryRecord, tierRecords } from '../../src/data/tier/tier.js';
import heroHome from '../../src/data/maps/hero_home.js';

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; }, _m: m };
}
const fresh = () => { const storage = memoryStorage(); return { storage, save: createSave({ storage, log: () => {} }) }; };
function autosave(save, game, extra = {}) { FieldScene.prototype.autosave.call({ engine: { save }, game, warnOnce() {}, ...extra }); }
/** A save that just finished Episode 7 (ep7_complete, credits not rolled yet): the run Continue carries into Episode 8. */
function ep7CreditsGame(name = 'Sol', slot = 0) {
  const g = newGameEp7(name, { slot });
  for (const f of EP7_DONE_FLAGS) g.flags[f] = true;
  g.counters.credits6_rolled = 1;
  setPosition(g, 'ep7_stillheart', 20, 9, 'up');
  return g;
}
/** A save that has seen the whole game end (ep8_complete, credits8 not rolled yet), standing in the bell tower copy. */
function endedGame(name = 'Wren', slot = 1) {
  const g = newGameEp8(name, { slot });
  for (const f of ['ep8_started', 'ep8_morning_done', 'eraser_defeated', 'lexicon_restored', 'ending_return', 'scriptorium_open',
    'home_reached', 'ep8_complete']) g.flags[f] = true;
  setPosition(g, 'ep8_bell_night', 6, 6, 'up');
  return g;
}

test('EP8_START: Lv 31 at 22,200 EXP, Episodes 1 to 7 done, seven credits counters, key items, 4,300 gold, in the Keeper\'s Watch', async () => {
  await registerEp8();   // the ep7 pack's items (the Shard, the Open Gate, name_fragment_7) are registered first, as the quick start does
  const g = newGameEp8('Quill', { slot: 2 });
  assert.equal(g.map, 'ep7_ph_watch');
  assert.deepEqual([g.pos.x, g.pos.y], [14, 5]);
  assert.equal(EP8_START.mark, 'watch_cot');
  assert.equal(g.autosaveSlot, 2);
  assert.equal(g.gold, 4300);
  assert.equal(g.chapter, 8);
  assert.deepEqual(g.party.map((m) => m.id), ['hero', 'mira', 'bram']);
  for (const m of g.party) { assert.equal(m.level, 31); assert.equal(m.exp, 22200); assert.ok(m.hp > 0 && m.mp >= 0); }
  for (const f of [...EP1_DONE_FLAGS, ...EP2_DONE_FLAGS, ...EP3_DONE_FLAGS, ...EP4_DONE_FLAGS, ...EP5_DONE_FLAGS, ...EP6_DONE_FLAGS, ...EP7_DONE_FLAGS,
    'ep7_complete', 'nox_named', 'doors_reopened', 'vex_name_whole', 'page_whole']) assert.equal(g.flags[f], true, f);
  for (const f of EP7_DONE_FLAGS) assert.ok(f in EP7_FLAGS, `${f} is a declared Episode 7 flag`);
  assert.ok(g.flags.told_vex && !g.flags.spared_vex && g.flags.told_nox && !g.flags.spared_nox, 'the truth side of each Episode 7 pair');
  for (const f of ['ep8_started', 'ep8_morning_done', 'read_learned', 'tier_1', 'hearth_lit', 'ep8_complete']) assert.ok(!g.flags[f], `${f} not set`);
  assert.equal(EP8_START.counters.length, 7);
  for (const c of EP8_START.counters) assert.equal(g.counters[c], 1, c);
  assert.ok(!g.counters.credits8_rolled);
  for (const id of ['name_fragment_1', 'name_fragment_2', 'name_fragment_3', 'name_fragment_4', 'name_fragment_5', 'name_fragment_6',
    'name_fragment_7', 'lantern_of_recall', 'mirror_sigil', 'sky_compass']) {
    assert.ok(KEY_ITEMS[id], `${id} is a key item`);
    assert.equal(g.items[id], 1, id);
  }
  assert.deepEqual({ potion: g.items.potion, hi_potion: g.items.hi_potion, hi_ether: g.items.hi_ether, phoenix_feather: g.items.phoenix_feather,
    silver_salve: g.items.silver_salve, fresh_ink: g.items.fresh_ink },
  { potion: 6, hi_potion: 8, hi_ether: 6, phoenix_feather: 3, silver_salve: 3, fresh_ink: 2 });
  assert.deepEqual(deserialize(serialize(g)).flags, g.flags, 'round-trips');
  assert.equal(creditsPending(g, (f) => !!g.flags[f]), 0, 'no credits are due on the quick start (credits7_rolled is set)');
});

test('slot 0 occupied, slot 2 empty: the quick start writes only slot 2, through a full simulated map change', () => {
  const { save, storage } = fresh();
  const other = ep7CreditsGame('Other');
  save.save(0, serialize(other), saveMeta(other));
  save.save(1, serialize(other), saveMeta(other));
  const before = [0, 1].map((n) => save.exportSlot(n));
  const pick = pickRunSlot(save);
  assert.deepEqual(pick, { ok: true, slot: 2, notice: 'This party will save to Record 2.' });
  const g = newGameEp8('Quill', { slot: pick.slot });
  assert.equal(storage._m.size, 2, 'newGameEp8 writes nothing by itself');
  for (const [map, x, y] of [['ep7_ph_watch', 14, 5], ['ep7_palehaven', 20, 20], ['ep7_stillheart', 20, 9], ['ep8_stair', 15, 55], ['ep8_library_f2', 20, 28]]) {
    setPosition(g, map, x, y, 'down'); autosave(save, g);
  }
  assert.deepEqual([0, 1].map((n) => save.exportSlot(n)), before, 'slots 0 and 1 untouched');
  assert.equal(save.exportSlot(3), null);
  assert.equal(save.load(2).heroName, 'Quill');
  assert.equal(save.load(2).autosaveSlot, 2);
  assert.equal(save.load(2).map, 'ep8_library_f2');
});

test('every slot full: no quick start, the refusal only, and nothing written', () => {
  const { save, storage } = fresh();
  const other = ep7CreditsGame('Other');
  for (let n = 0; n <= 3; n++) save.save(n, serialize(other), saveMeta(other));
  const snap = JSON.stringify([...storage._m.entries()].sort());
  assert.deepEqual(pickRunSlot(save), { ok: false, slot: null, notice: SLOTS_FULL_NOTICE });
  assert.equal(JSON.stringify([...storage._m.entries()].sort()), snap);
});

test('an Episode 7 credits save loads, rolls the Episode 7 credits with the unchanged end card, wakes in the Watch, own slot only', async () => {
  await registerEp8();   // the ep8 pack registered (as ?pack=ep8 would): with EP8_LIVE false it leaves entry 7's end card alone
  const { save, storage } = fresh();
  const g0 = ep7CreditsGame('Sol', 1);
  save.save(1, serialize(g0), saveMeta(g0));
  const g = deserialize(save.load(1));
  assert.equal(g.autosaveSlot, 1);
  const has = (f) => !!g.flags[f];
  assert.equal(creditsPending(g, has), 7, 'the Episode 7 credits are due');
  const h = CREDITS_HANDOFF[7];
  assert.deepEqual([h.map, h.mark], ['ep7_ph_watch', 'watch_cot'], 'the Episode 7 wake is unchanged (plan 3: the Watch fires the morning)');
  assert.equal(EP8_LIVE, false);
  assert.deepEqual(h.endCard, END_CARD_EP7, 'the Episode 7 end card is unchanged while EP8_LIVE is false');
  assert.equal(h.endCard.sub, 'Episode 8 is not playable yet.');
  markCreditsRolled(g, 7);
  assert.equal(g.counters.credits7_rolled, 1);
  setPosition(g, h.map, 14, 5, 'down');
  assert.equal(creditsPending(g, has), 0, 'no Episode 8 credits entry is due');
  assert.equal(packsToAwait(g.flags).includes('ep8'), false, 'the wake does not wait for the ep8 pack while it is off');
  assert.equal(packsToAwait(g.flags, { enabled: true }).includes('ep8'), true, 'and does once it is live');
  autosave(save, g);
  assert.deepEqual([...storage._m.keys()], ['lq-next-slot-1']);
  assert.equal(save.load(1).map, 'ep7_ph_watch');
  assert.equal(save.load(1).counters.credits7_rolled, 1);
  assert.ok(!save.load(1).flags.ep8_started, 'nothing here runs ep8_morning (the field does, on the Watch wake trigger)');
});

test('an Episode 6 save (no ep7_complete) never wants the pack, even with the switch on', () => {
  const g = newGameEp7('Sol', { slot: 0 });   // stands where Episode 7 begins: Episode 6 done, Episode 7 not
  assert.ok(!g.flags.ep7_complete);
  assert.ok(!packsToAwait(g.flags, { enabled: true }).includes('ep8'));
  g.flags.ep7_started = true;
  assert.ok(!packsToAwait(g.flags, { enabled: true }).includes('ep8'), 'nor a run in the middle of Episode 7');
});

test('an old save without any Episode 8 field (any slot) loads and autosaves to its own slot only; a fresh game to slot 0', () => {
  for (const slot of [0, 1, 3]) {
    const { save, storage } = fresh();
    const g = deserialize(serialize(ep7CreditsGame('Sol', slot)));
    assert.equal(g.autosaveSlot, slot);
    setPosition(g, 'ep7_palehaven', 20, 20, 'down');
    autosave(save, g);
    assert.deepEqual([...storage._m.keys()], [`lq-next-slot-${slot}`]);
    assert.deepEqual(deserialize(save.load(slot)).flags, g.flags);
  }
  const { save, storage } = fresh();
  autosave(save, createGame('Arden'));
  assert.deepEqual([...storage._m.keys()], ['lq-next-slot-0']);
});

test('the ended save (plan 10.8): an ep8_complete fixture rolls credits 8, wakes at hero_home bed, writes only its own slot', async () => {
  await registerEp8();
  const cards = [{ heading: 'LEXICON QUEST', lines: ['Episode 8: The Last Word'] }];
  const had8 = CREDITS_HANDOFF[8];
  // until E8-story's credits.js exists, entry 8 is installed from a stand-in list; the wake, counter and card are the hooks' own
  if (!had8) registerHooks(null, { credits: { CREDITS_EP8: cards } });
  try {
    const h = CREDITS_HANDOFF[8];
    assert.ok(h, 'CREDITS_HANDOFF[8]');
    assert.deepEqual([h.map, h.mark, h.counter, h.flag, h.music], ['hero_home', 'bed', 'credits8_rolled', 'ep8_complete', 'the_last_word']);
    assert.deepEqual(WAKE8, { map: 'hero_home', mark: 'bed' });
    if (!had8) assert.equal(h.endCard, END_CARD_EP8);
    assert.deepEqual(END_CARD_EP8, { text: 'The End', sub: 'Every road is open. The Deep Stacks wait under the library.', frames: 300 });
    assert.ok(heroHome.marks.bed, 'hero_home has the bed mark');
    const { save, storage } = fresh();
    const other = ep7CreditsGame('Other', 0);
    save.save(0, serialize(other), saveMeta(other));
    save.save(3, serialize(other), saveMeta(other));
    const keep = [0, 3].map((n) => save.exportSlot(n));
    const g0 = endedGame('Wren', 1);
    save.save(1, serialize(g0), saveMeta(g0));
    const g = deserialize(save.load(1));
    const has = (f) => !!g.flags[f];
    assert.equal(creditsPending(g, has), 8, 'the last credits are due');
    markCreditsRolled(g, 8);
    const [bx, by] = heroHome.marks[h.mark];
    setPosition(g, h.map, bx, by, 'down');   // the next morning, at home
    assert.equal(creditsPending(g, has), 0, 'nothing is due after them: the post-game is an ordinary save');
    autosave(save, g);
    assert.deepEqual([0, 3].map((n) => save.exportSlot(n)), keep, 'the other run is byte for byte untouched');
    assert.equal(save.exportSlot(2), null, 'no new slot');
    const back = deserialize(save.load(1));
    assert.deepEqual([back.map, back.pos.x, back.pos.y], ['hero_home', bx, by]);
    assert.equal(back.counters.credits8_rolled, 1);
    assert.ok(back.flags.ep8_complete && back.flags.ending_return && !back.flags.ending_choose, 'the chosen ending stays the only one');
    // a hand save in slot 2 later: the run then writes slot 2 only (the house rule: the slot it was last saved to)
    save.save(2, serialize(back), saveMeta(back));
    const again = deserialize(save.load(2));
    assert.equal(again.autosaveSlot, 1, 'a hand save keeps the run\'s own autosave slot');
    setPosition(again, 'willowmere', 20, 20, 'down');
    autosave(save, again);
    assert.deepEqual([...storage._m.keys()].sort(), ['lq-next-slot-0', 'lq-next-slot-1', 'lq-next-slot-2', 'lq-next-slot-3']);
    assert.deepEqual([0, 3].map((n) => save.exportSlot(n)), keep);
  } finally { if (!had8) { delete CREDITS_HANDOFF[8]; unregister(); } }
});

test('a finished Episode 8 record is listed by Fine Print\'s carry picker, and carrying it leaves its slot byte-identical', () => {
  const { save } = fresh();
  const g = endedGame('Wren', 2);
  g.counters.credits8_rolled = 1;
  setPosition(g, 'hero_home', 4, 3, 'down');
  save.save(2, serialize(g), saveMeta(g));
  const before = save.exportSlot(2);
  const list = tierRecords(save);
  assert.ok(list.some((r) => r.slot === 2), 'the record is offered');
  const run = carryRecord(save.loadEnvelope(2).data, { slot: 0 });
  assert.ok(run && run.flags.tier_1 && !run.flags.ep8_complete, 'a Fine Print run, story flags reset');
  assert.equal(run.autosaveSlot, 0);
  assert.equal(save.exportSlot(2), before, 'the finished record is untouched');
});

test('handoff8: null without credits, the plan 5.3 shape with them, text.js END_CARD_EP8 wins over the stand-in', () => {
  assert.equal(handoff8(null, null), null);
  assert.equal(handoff8({}, {}), null);
  const cards = [{ heading: 'X', lines: [] }];
  assert.deepEqual(handoff8({ CREDITS_EP8: cards }, null),
    { cards, music: 'the_last_word', map: 'hero_home', mark: 'bed', counter: 'credits8_rolled', endCard: END_CARD_EP8, flag: 'ep8_complete' });
  const own = { text: 'The End', sub: 'x' };
  assert.equal(handoff8(null, { CREDITS_EP8: cards, END_CARD_EP8: own }).endCard, own);
});

// Plan 10.9's cases that need what later waves write. Each names the agent and wave; E8-integrate turns them on.
const PENDING = [
  ['an Episode 7 credits fixture reaches ep8_morning with EP8_LIVE on, and not with it off', 'src/data/ep8/story.js (E8-story, 8a) and the ep7_ph_watch patch (E8-maps-a, 8c)'],
  ['a Fine Print save (tier_1) never reaches ep8_morning', 'src/data/ep8/story.js (E8-story, 8a)'],
  ['a save on a pop-up book bridge cell reloads on ground, able to walk', 'src/data/ep8/field/popbooks.js (E8-world, 8b) and the Library maps (E8-maps-b, 8c)'],
  ['an ep8_complete fixture never runs last_choice again', 'src/data/ep8/story.js last_choice and its guard (E8-story, 8a)'],
  ['a fixture saved after eraser_defeated and before ep8_complete reaches ep8_complete by Talk\'s steps', 'the story, the Talk table and ep8_bell_night (E8-story 8a, E8-maps-a 8c)'],
];
for (const [name, needs] of PENDING) test(name, { skip: `needs ${needs}; E8-integrate turns it on` }, () => {});
