// X1 content: ids. Every scene, flag, quest, NPC and text id of the Wider Valley is unique across Episodes 1 to 3, this
// expansion and the Episode 2 expansion registry; every flag a module uses is declared; the expansion registers by
// register() into the shared tables and is idempotent; nothing of it exists until it registers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BASE, X1, registerAll, X2, X1_MAPS } from './x1_helpers.mjs';
import { FLAGS, FLAG_IDS, ALL_SIDE_QUESTS, BANTER } from '../../src/data/quests.js';
import { NPCS } from '../../src/data/npcs.js';
import { BANNERS, BOOKS, BARKS, BESTIARY } from '../../src/data/text.js';
import { SCENES, LINES } from '../../src/game/story.js';

const { X1_FLAGS } = X1.flags;

// Before the expansion registers, none of it exists (the pack is not loaded).
const before = {
  flags: Object.keys(FLAGS).filter((f) => f in X1_FLAGS),
  scenes: Object.keys(SCENES).filter((id) => id in X1.story.scenes),
  lines: Object.keys(LINES).filter((id) => id in X1.text.X1_LINES),
  npcs: Object.keys(NPCS).filter((id) => id in X1.npcs.X1_NPCS),
  quests: ALL_SIDE_QUESTS.filter((q) => X1.quests.X1_SIDE_QUESTS.includes(q)).length,
  banners: Object.keys(BANNERS).filter((id) => X1_MAPS.includes(id)),
  books: Object.keys(BOOKS).filter((id) => id in X1.text.X1_BOOKS),
  bestiary: Object.keys(BESTIARY).filter((id) => id in X1.text.X1_BESTIARY),
  barks: Object.keys(BARKS).filter((id) => id in X1.text.X1_BARKS),
};

test('nothing of the expansion exists until register() runs', () => {
  assert.deepEqual(before, { flags: [], scenes: [], lines: [], npcs: [], quests: 0, banners: [], books: [], bestiary: [], barks: [] });
  for (const m of X1_MAPS) assert.ok(!(m in BANTER), `banter for ${m} exists before register()`);
});

test('ids are new: no flag, scene, line, NPC, quest or text id repeats Episodes 1 to 3 or the Episode 2 registry', () => {
  for (const f of Object.keys(X1_FLAGS)) assert.ok(!(f in BASE.flags), `flag ${f} already exists`);
  for (const id of Object.keys(X1.story.scenes)) assert.ok(!BASE.scenes.includes(id), `scene ${id} already exists`);
  for (const id of Object.keys(X1.text.X1_LINES)) assert.ok(!BASE.lines.includes(id), `line ${id} already exists`);
  for (const id of Object.keys(X1.npcs.X1_NPCS)) assert.ok(!BASE.npcs.includes(id) && !X2.npcs.includes(id), `NPC ${id} already exists`);
  for (const q of X1.quests.X1_SIDE_QUESTS) assert.ok(!BASE.quests.includes(q.id) && !X2.quests.includes(q.id), `quest ${q.id} already exists`);
  for (const id of Object.keys(X1.text.X1_BOOKS)) assert.ok(!BASE.books.includes(id), `book ${id}`);
  for (const id of Object.keys(X1.text.X1_BESTIARY)) assert.ok(!BASE.bestiary.includes(id), `bestiary ${id}`);
  for (const id of Object.keys(X1.text.X1_BARKS)) assert.ok(!BASE.barks.includes(id), `bark ${id}`);
  for (const id of Object.keys(X1.text.X1_BANNERS)) assert.ok(!BASE.banners.includes(id), `banner ${id}`);
  // Each table is unique inside itself (object keys cannot repeat; this guards the lists).
  const ids = X1.quests.X1_SIDE_QUESTS.map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids, ['strays', 'rollcall', 'pell_crates', 'four_rolls', 'dark_stars', 'not_to_forget']);
});

test('prefix discipline: nothing borrows another episode\'s namespace', () => {
  const all = [...Object.keys(X1_FLAGS), ...Object.keys(X1.story.scenes), ...Object.keys(X1.text.X1_LINES), ...Object.keys(X1.npcs.X1_NPCS),
    ...X1.quests.X1_SIDE_QUESTS.map((q) => q.id)];
  for (const id of all) {
    assert.ok(!X2.prefix.test(id), `${id} wears the x2_ prefix`);
    assert.ok(!/^(vow_|oath_|pk_|sand_|foundry_|ember_|nh_|court_)/.test(id), `${id} wears another episode's prefix`);
    assert.ok(/^[a-z][a-z0-9_]*$/.test(id), `${id} is not snake_case ASCII`);
  }
});

test('the flags of plan 2.2 are all declared, each with a one-line meaning', () => {
  const PLAN = ['downs_arrived', 'thornfold_arrived', 'stones_seen', 'moor_arrived', 'larchhill_arrived', 'terrace_arrived', 'millrace_arrived',
    'barrow_entered', 'cellar_entered', 'culvert_entered', 'cleft_seen', 'odo_met', 'yarrow_met', 'windmill_seen',
    'strays_started', 'stray_1_found', 'stray_2_found', 'stray_3_found', 'stray_4_found', 'stray_5_found', 'strays_done',
    'rollcall_started', 'roll_found', 'copy_found', 'stones_lettered', 'reeve_named', 'barrow_reeve_defeated', 'rollcall_done',
    'crates_started', 'crate_1_done', 'crate_2_done', 'crate_3_done', 'crates_done', 'pell_stamp',
    'mill_started', 'ferrick_met', 'pin_found', 'mill_turning', 'millstone_golem_defeated', 'mill_done',
    'stars_started', 'star_1_read', 'star_2_read', 'star_3_read', 'orrery_aligned', 'stars_done',
    'list_started', 'list_rhyme', 'list_ledger', 'list_song', 'list_done'];
  for (const f of PLAN) assert.ok(f in X1_FLAGS, `plan flag ${f} not declared`);
  const extra = Object.keys(X1_FLAGS).filter((f) => !PLAN.includes(f));
  assert.deepEqual(extra.sort(), ['golem_after_done', 'golem_met', 'reeve_after_done', 'reeve_met', 'x1_gate_drain_open'], 'the only additions are the four one-shot guards and the Culvert gate flag (W7)');
  for (const [f, d] of Object.entries(X1_FLAGS)) assert.ok(typeof d === 'string' && d.length > 10 && d.length < 140 && !d.includes('\n'), `${f}: meaning`);
});

test('register() puts the flags into FLAGS and onto FLAG_IDS, and is idempotent', () => {
  registerAll();
  const ids = [...FLAG_IDS];
  for (const f of Object.keys(X1_FLAGS)) { assert.equal(FLAGS[f], X1_FLAGS[f]); assert.ok(FLAG_IDS.includes(f), `${f} not in FLAG_IDS`); }
  assert.deepEqual(BASE.flagIds, ids.slice(0, BASE.flagIds.length), 'FLAG_IDS before is a prefix of FLAG_IDS after');
  registerAll();
  assert.deepEqual(FLAG_IDS, ids, 'a second register() changes nothing');
  assert.equal(new Set(FLAG_IDS).size, FLAG_IDS.length, 'no duplicate flag id');
  const quests = ALL_SIDE_QUESTS.filter((q) => X1.quests.X1_SIDE_QUESTS.includes(q));
  assert.equal(quests.length, 6, 'six quests, once each');
  for (const id of Object.keys(X1.story.scenes)) assert.equal(SCENES[id], X1.story.scenes[id], `scene ${id} registered`);
  for (const id of Object.keys(X1.text.X1_LINES)) assert.equal(LINES[id], X1.text.X1_LINES[id], `line ${id} registered`);
  assert.deepEqual(BASE.scenes.filter((id) => !(id in SCENES)), [], 'no old scene vanished');
  assert.deepEqual(BASE.lines.filter((id) => !(id in LINES)), [], 'no old line vanished');
});

test('every flag a module names is declared', () => {
  registerAll();
  const used = new Set();
  const addAll = (v) => { for (const f of [v].flat().filter(Boolean)) used.add(f); };
  for (const c of Object.values(X1.story.SCENE_CONDITIONS)) { addAll(c.if); addAll(c.ifNot); }
  for (const n of Object.values(X1.npcs.X1_NPCS)) { if (n.show) { addAll(n.show.if); addAll(n.show.ifNot); } for (const e of n.talk) { addAll(e.if); addAll(e.ifNot); } }
  for (const list of Object.values(X1.npcs.X1_TALK_PREPEND)) for (const e of list) { addAll(e.if); addAll(e.ifNot); }
  for (const q of X1.quests.X1_SIDE_QUESTS) {
    addAll(q.start); addAll(q.done); if (q.counter) addAll(q.counter.flags);
    for (const st of q.steps) { addAll(st.done); for (const e of st.chat) { addAll(e.if); addAll(e.ifNot); } }
  }
  for (const list of Object.values(X1.quests.BANTER_X1)) for (const e of list) { addAll(e.if); addAll(e.ifNot); }
  for (const list of Object.values(X1.text.X1_BARKS)) for (const e of list) { addAll(e.if); addAll(e.ifNot); }
  for (const list of Object.values(X1.text.X1_LINES)) if (Array.isArray(list)) for (const e of list) if (e && typeof e === 'object' && !Array.isArray(e)) { addAll(e.if); addAll(e.ifNot); }
  for (const f of used) assert.ok(f in FLAGS, `undeclared flag ${f}`);
  assert.ok(used.size > 40, `only ${used.size} flags checked`);
});
