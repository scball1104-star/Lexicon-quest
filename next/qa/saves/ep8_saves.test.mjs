// E8-pack (EPISODE8_PLAN 10): no Episode 8 path ever writes a save slot that holds another run. Pure node tests over a fake
// storage; the real FieldScene.autosave is called unbound, as qa/saves/ep7_saves.test.mjs does for Episode 7. Plan 10.9's cases
// on the real story (ep8_morning on and off, Fine Print, last_choice, Talk's steps), the patched Watch, the Library maps and
// the pop-up books are at the end.
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
  if (!EP8_LIVE) assert.deepEqual(h.endCard, END_CARD_EP7, 'the Episode 7 end card is unchanged while EP8_LIVE is false');
  assert.equal(h.endCard.sub, EP8_LIVE ? 'Episode 8 begins in the morning.' : 'Episode 8 is not playable yet.', 'the Episode 7 end card follows the switch');
  markCreditsRolled(g, 7);
  assert.equal(g.counters.credits7_rolled, 1);
  setPosition(g, h.map, 14, 5, 'down');
  assert.equal(creditsPending(g, has), 0, 'no Episode 8 credits entry is due');
  assert.equal(packsToAwait(g.flags, { enabled: false }).includes('ep8'), false, 'the wake does not wait for the ep8 pack while it is off');
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

// Plan 10.9's cases on the real story, patches, maps and book system (E8-seams turned them on). Each runs the shipped scene
// functions through the content harness's recording API (qa/content/_harness.mjs runOnce: flags only, no branching).
const P8 = await import('../../src/data/maps/ep8_patches.js');
const STORY8 = await import('../../src/data/ep8/story.js');
const { runOnce } = await import('../content/_harness.mjs');
const { MAIN_QUEST_EP8 } = await import('../../src/data/ep8/quests.js');
const { currentStep, pickChat, aimFor } = await import('../../src/data/quests.js');
const ep7WatchMod = (await import('../../src/data/maps/ep7_ph_watch.js')).default;

const toList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const live = (e, has) => toList(e.if).every(has) && !toList(e.ifNot).some(has);
const flagList = (g) => Object.keys(g.flags).filter((f) => g.flags[f]);
/** Run one shipped scene on a game's flags (the guards included); the game's flags take the scene's writes. */
async function play(id, g, mapId = g.map) {
  const set = new Set(flagList(g));
  const r = await runOnce(STORY8.scenes[id], { set, branchFlags: false, mapId });
  for (const f of Object.keys(g.flags)) if (!set.has(f)) delete g.flags[f];
  for (const f of set) g.flags[f] = true;
  const warp = r.log.filter((e) => e.op === 'warp').pop();
  return { log: r.log, ran: r.log.some((e) => e.op === 'lockInput'), warp: warp ? warp.args[0] : null };
}
async function withLive(on, fn) { const was = STORY8.GATE.live; STORY8.GATE.live = on; try { return await fn(); } finally { STORY8.GATE.live = was; } }
/** An Episode 7 credits save after the credits rolled, reloaded from a slot and woken at the Watch (CREDITS_HANDOFF[7]). */
function wokenAtWatch(extra = []) {
  const { save } = fresh();
  const g0 = ep7CreditsGame('Sol', 1);
  for (const f of extra) g0.flags[f] = true;
  save.save(1, serialize(g0), saveMeta(g0));
  const g = deserialize(save.load(1));
  markCreditsRolled(g, 7);
  setPosition(g, 'ep7_ph_watch', 14, 5, 'down');
  return g;
}

test('an Episode 7 credits fixture reaches ep8_morning with EP8_LIVE on, and not with it off', async () => {
  const watch = P8.withEp8Wake(ep7WatchMod);
  const trig = watch.events.find((e) => e.id === 'ep8_wake');
  assert.deepEqual([trig.type, trig.on, trig.script], ['trigger', 'enter', 'ep8_morning']);
  // off (the switch as it shipped until E8-integrate; withLive(false) after the flip): the trigger is there, its scene refuses
  const off = wokenAtWatch();
  assert.ok(live(trig, (f) => !!off.flags[f]), 'the wake trigger is live on an Episode 7 finisher');
  const r0 = await withLive(false, () => play('ep8_morning', off));
  assert.equal(r0.ran, false, 'EP8_LIVE off: ep8_morning does not run');
  assert.ok(!off.flags.ep8_started && !off.flags.ep8_morning_done);
  // on: the scene runs once, starts Episode 8 and gives Vex's note; the trigger is then spent
  const on = wokenAtWatch();
  const r1 = await withLive(true, () => play('ep8_morning', on));
  assert.equal(r1.ran, true, 'EP8_LIVE on: ep8_morning runs');
  assert.ok(on.flags.ep8_started && on.flags.ep8_morning_done);
  assert.ok(r1.log.some((e) => e.op === 'give' && e.args[0] === 'vex_note'));
  assert.equal(live(trig, (f) => !!on.flags[f]), false, 'the wake trigger is spent');
  const r2 = await withLive(true, () => play('ep8_morning', on));
  assert.equal(r2.ran, false, 'never twice');
  // and the save it then writes is its own slot only
  const { save, storage } = fresh();
  on.autosaveSlot = 1;
  autosave(save, on);
  assert.deepEqual([...storage._m.keys()], ['lq-next-slot-1']);
  assert.ok(save.load(1).flags.ep8_started);
});

test('a Fine Print save (tier_1) never reaches ep8_morning', async () => {
  const g = wokenAtWatch(['tier_1']);
  const trig = P8.withEp8Wake(ep7WatchMod).events.find((e) => e.id === 'ep8_wake');
  assert.ok(live(trig, (f) => !!g.flags[f]), 'the map trigger reads ep7_complete only');
  const r = await withLive(true, () => play('ep8_morning', g));
  assert.equal(r.ran, false, 'the scene guard refuses tier_1 even with the switch on');
  assert.ok(!g.flags.ep8_started);
  assert.ok(!packsToAwait(g.flags, { enabled: false }).includes('ep8'), 'off: no pack wait');
});

test('a save on a pop-up book bridge cell reloads on ground, able to walk', async () => {
  const { TileMap } = await import('../../src/world/tilemap.js');
  const EV = await import('../../src/world/events.js');
  const { Silverglass } = await import('../../src/world/silverglass.js');
  const { mergeTileFragment } = await import('../../src/game/packs.js');
  const { attach } = await import('../../src/data/ep8/field/events.js');
  const { ensureArt } = await import('../../src/data/ep8/field/art.js');
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const json = (p) => JSON.parse(fs.readFileSync(path.join(NEXT, p), 'utf8'));
  const db = json('assets/tiles/tiles.json');
  mergeTileFragment(db, json('assets/tiles/ep8_tiles.json'));
  const mod = (await import('../../src/data/maps/ep8_library_f1.js')).default;
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
  const warn = console.warn;
  console.warn = () => {};
  /** The field woken on this game (the real FieldScene methods; loadMap's order: party, entities, the books' reset). */
  function wake(game) {
    const engine = {
      assets: { json: () => db, has: () => false, atlas: () => null, img: () => ({ width: 1, height: 1 }), setImage() {} },
      renderer: { createLayer: (w, h) => ({ w, h, ctx, canvas: {} }), W: 384, H: 216, ctx },
      audio: { sfx() {} }, input: { pressed: () => false, held: () => false, heldDir: () => null }, settings: {}, stack: [],
      after: (n, fn) => fn(), waitFrames: async () => {},
    };
    const f = Object.create(FieldScene.prototype);
    Object.assign(f, { engine, name: 'field', game, actors: [], entities: new Map(), byTile: new Map(), enterTriggers: [], inputLocked: 0,
      frame: 0, sessionGone: new Set(), dungeonGone: new Map(), reentryGone: new Map(), warned: new Set(), mapId: mod.id, lantern: 0 });
    f.hasFlag = (k) => !!game.flags[k];
    f.warnOnce = () => {};
    ensureArt(db, engine);
    f.map = new TileMap(engine, mod, { hasFlag: f.hasFlag });
    f.particles = { sparkle() {} };
    f.camera = { snapTo() {}, visible: () => true };
    f.lighting = { dark: 0, tintName: 'none', draw() {} };
    f.glass = new Silverglass(f);
    attach(f);
    f.rebuildParty(game.pos.x, game.pos.y, game.pos.dir);
    EV.buildEntities(f);
    f.glass.reset();
    return f;
  }
  try {
    // a page cell over the void that the books' arrival state leaves uncovered: a bridge when it was saved, void on reload
    const g0 = newGameEp8('Wren', { slot: 2 });
    for (const fl of ['library_open', 'lib_f1_arrived']) g0.flags[fl] = true;
    setPosition(g0, mod.id, mod.start.x, mod.start.y, 'up');
    const probe = wake(g0);
    const B = probe.books, m = B.m;
    assert.ok(B.active, 'F1 has its books');
    const cell = [...B.origCode.keys()].find((i) => B.overVoid(i) && B.codeFor(i) === 'void');
    assert.ok(cell != null, 'a bridge cell that is void on arrival');
    const [bx, by] = [cell % m.W, (cell / m.W) | 0];
    // saved standing on it (the book was open then), to its own slot, and reloaded
    const { save, storage } = fresh();
    setPosition(g0, mod.id, bx, by, 'up');
    save.save(2, serialize(g0), saveMeta(g0));
    const g = deserialize(save.load(2));
    assert.deepEqual([g.map, g.pos.x, g.pos.y], [mod.id, bx, by]);
    const f = wake(g);
    const L = f.leader;
    assert.ok(f.books.rescued, 'the books rescued the party');
    assert.notDeepEqual([L.tx, L.ty], [bx, by], 'not left on the void');
    assert.equal(f.map.codeAt(L.tx, L.ty), 'none', 'on ground');
    assert.ok(Math.abs(L.tx - bx) + Math.abs(L.ty - by) <= 6, 'the nearest ground, near where it stood');
    assert.deepEqual([g.pos.x, g.pos.y], [L.tx, L.ty], 'the position the next save writes is the ground cell');
    const steps = ['up', 'down', 'left', 'right'].filter((d) => {
      const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[d];
      return f.canStep(L, L.tx, L.ty, L.tx + dx, L.ty + dy, d) === true;
    });
    assert.ok(steps.length > 0, 'able to walk');
    autosave(save, g);
    assert.deepEqual([...storage._m.keys()], ['lq-next-slot-2'], 'its own slot only');
    assert.deepEqual([save.load(2).pos.x, save.load(2).pos.y], [L.tx, L.ty]);
  } finally { console.warn = warn; }
});

test('an ep8_complete fixture never runs last_choice again', async () => {
  for (const ending of ['ending_return', 'ending_choose']) {
    const g = endedGame('Wren', 1);
    for (const f of ['keeper_named', 'page_shelved', 'scriptorium_open']) g.flags[f] = true;
    delete g.flags.ending_return;
    g.flags[ending] = true;
    const before = JSON.stringify(g.flags);
    const r = await withLive(true, () => play('last_choice', g));
    assert.equal(r.ran, false, `${ending}: last_choice is guarded off`);
    assert.ok(!r.log.some((e) => e.op === 'choice'), 'no choice offered');
    assert.equal(JSON.stringify(g.flags), before, 'no flag changes');
    // and no scene of the pack offers the endings to an ended save (every ending scene has its own done flag)
    const labels = new Set(Object.values(STORY8.ENDINGS).map((e) => e.label));
    for (const id of STORY8.STORY_IDS) {
      const h = JSON.parse(JSON.stringify(g));
      const rr = await withLive(true, () => play(id, h));
      assert.ok(!rr.log.some((e) => e.op === 'choice' && e.args[0].some((o) => labels.has(typeof o === 'string' ? o : o && o.label))), `${id} offers no ending`);
      assert.ok(!(ending === 'ending_return' ? h.flags.ending_choose : h.flags.ending_return), `${id}: the chosen ending stays the only one`);
    }
  }
});

test('a fixture saved after eraser_defeated and before ep8_complete reaches ep8_complete by Talk\'s steps', async () => {
  const LATE = ['ep8_started', 'ep8_morning_done', 'ep8_roofed', 'stair_arrived', 'scriptorium_arrived', 'read_learned', 'library_open',
    'library_f1_done', 'sentry_defeated', 'library_f2_done', 'name_told', 'eraser_defeated', 'lexicon_restored', 'keeper_named',
    'ending_return', 'page_shelved', 'scriptorium_open'];
  // the two places such a save can be written: the square after scriptorium_open, and the bell tower copy after home_reached
  for (const [mapId, x, y, extra] of [['ep8_scriptorium', 23, 26, []], ['ep8_bell_night', 12, 36, ['home_reached']]]) {
    const { save, storage } = fresh();
    const g0 = newGameEp8('Wren', { slot: 1 });
    // every main step before Home done (its own done flags), as a save written at that point has them
    const before = MAIN_QUEST_EP8.steps.slice(0, MAIN_QUEST_EP8.steps.findIndex((st) => st.id === 'home')).flatMap((st) => toList(st.done));
    for (const f of [...LATE, ...before, ...extra]) g0.flags[f] = true;
    setPosition(g0, mapId, x, y, 'up');
    save.save(1, serialize(g0), saveMeta(g0));
    const g = deserialize(save.load(1));
    assert.equal(g.map, mapId);
    const has = (f) => !!g.flags[f];
    const order = ['home', ...STORY8.TOLL_IDS, 'thirteenth_name'];
    let where = g.map, n = 0;
    while (!g.flags.ep8_complete && n++ < 20) {
      // Talk names the next step on this map: the home step, its aim and a line
      const step = currentStep(has, MAIN_QUEST_EP8);
      assert.equal(step.id, 'home', `${mapId}: Talk is on the home step`);
      assert.ok(aimFor(step, has), 'with an aim');
      const chat = pickChat(step.chat, has, where);
      assert.ok(chat && chat.lines.length, `${mapId}: Talk has a line on ${where}`);
      // the one scene its guards allow next (the field's trigger for it is on the map the step names)
      const next = order.find((id) => {
        const c = STORY8.SCENE_CONDITIONS[id];
        return toList(c.if).every(has) && !toList(c.ifNot).some(has);
      });
      assert.ok(next, `${mapId}: a scene is always next (${flagList(g).slice(-3).join(' ')})`);
      const r = await play(next, g, where);
      assert.equal(r.ran, true, `${next} ran`);
      if (r.warp) where = r.warp;
    }
    assert.ok(g.flags.ep8_complete, `${mapId}: the ending finishes`);
    assert.ok(g.flags.ending_return && !g.flags.ending_choose, 'the chosen ending is unchanged');
    assert.equal(currentStep(has, MAIN_QUEST_EP8).id, 'epilogue8', 'Talk moves on to the post-game');
    setPosition(g, where, 12, 36, 'up');
    autosave(save, g);
    assert.deepEqual([...storage._m.keys()], ['lq-next-slot-1'], 'its own slot only');
  }
});

test('a save written at hero_home by the goto in home (scriptorium_open, no home_reached) reloads into home at the door and reaches ep8_complete', async () => {
  await registerEp8();
  await (await import('../../src/data/ep8/maps.js')).register();
  const { peekMap } = await import('../../src/world/maps.js');
  const LATE = ['ep8_started', 'ep8_morning_done', 'ep8_roofed', 'stair_arrived', 'scriptorium_arrived', 'read_learned', 'library_open',
    'library_f1_done', 'sentry_defeated', 'library_f2_done', 'name_told', 'eraser_defeated', 'lexicon_restored', 'keeper_named',
    'ending_choose', 'page_shelved', 'scriptorium_open'];
  const { save, storage } = fresh();
  const g0 = newGameEp8('Wren', { slot: 1 });
  const before = MAIN_QUEST_EP8.steps.slice(0, MAIN_QUEST_EP8.steps.findIndex((st) => st.id === 'home')).flatMap((st) => toList(st.done));
  for (const f of [...LATE, ...before]) g0.flags[f] = true;
  // the field's autosave on the goto's map change: on hero_home, just inside the door, the scene not finished
  setPosition(g0, 'hero_home', STORY8.HOME_DOOR[0], STORY8.HOME_DOOR[1], 'up');
  autosave(save, g0);
  const g = deserialize(save.load(1));
  assert.deepEqual([g.map, g.pos.x, g.pos.y], ['hero_home', ...STORY8.HOME_DOOR]);
  const has = (f) => !!g.flags[f];
  // the patched hero_home (ep8_patches.js withHomeDoor) runs home on enter for exactly this save
  const enterHome = peekMap('hero_home').events.filter((e) => e.type === 'trigger' && e.on === 'enter' && e.script === 'home');
  assert.equal(enterHome.length, 1, 'one enter trigger runs home on hero_home');
  assert.ok(live(enterHome[0], has), 'and it is live for the reloaded save');
  // home, started on hero_home: no flight again, Hazel at the door, then the warp to the bell night
  let r = await play('home', g, 'hero_home');
  assert.equal(r.ran, true, 'home runs');
  assert.ok(!r.log.some((e) => e.op === 'say' && e.args[0] === 'aeris_t'), 'no second flight (no Aeris on the roof)');
  assert.ok(r.log.some((e) => e.op === 'spawn' && e.args[0] === 'hazel'), 'Hazel at the door');
  assert.ok(g.flags.home_reached && (g.flags.told_hazel || g.flags.spared_hazel), 'home_reached and the truth choice');
  assert.equal(r.warp, 'ep8_bell_night', 'on to the bell night');
  assert.ok(!live(enterHome[0], has), 'the trigger is gone once home is reached');
  // the bell night: twelve tolls, then the thirteenth
  for (const id of [...STORY8.TOLL_IDS, 'thirteenth_name']) {
    r = await play(id, g, 'ep8_bell_night');
    assert.equal(r.ran, true, `${id} ran`);
  }
  assert.ok(g.flags.ep8_complete, 'the ending finishes');
  assert.ok(g.flags.ending_choose && !g.flags.ending_return, 'the chosen ending is unchanged');
  setPosition(g, 'ep8_bell_night', 12, 36, 'up');
  autosave(save, g);
  assert.deepEqual([...storage._m.keys()], ['lq-next-slot-1'], 'its own slot only');
  // Episodes 1 to 7 never see it: no Episode 8 flag on an earlier save, and the core module (the pack off) has no such trigger
  for (const flags of [EP1_DONE_FLAGS, [...EP7_DONE_FLAGS]]) {
    const h = (f) => flags.includes(f);
    assert.ok(!live(enterHome[0], h), 'an Episodes 1 to 7 save: the trigger is not live');
  }
  assert.ok(!heroHome.events.some((e) => e.script === 'home'), 'the core hero_home (EP8_LIVE off: the pack never patches it) has none');
});
