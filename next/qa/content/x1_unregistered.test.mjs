// X1 content: with the pack not registered (or the switch off) nothing of the expansion is reachable. This file never calls
// register(); it imports the modules only, so the shared tables must still be exactly Episodes 1 to 3.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BASE, X1, BASE_TALK, PREPENDED_NPCS, resolveAll, X1_MAPS } from './x1_helpers.mjs';
import { FLAGS, FLAG_IDS, ALL_SIDE_QUESTS, BANTER, journal, partyChat } from '../../src/data/quests.js';
import { NPCS, isPresent, talkTo } from '../../src/data/npcs.js';
import { BANNERS, BOOKS, BARKS, BESTIARY } from '../../src/data/text.js';
import { SCENES, LINES, sceneById, sceneAllowed } from '../../src/game/story.js';
import { runOnce } from './_harness.mjs';

test('not registered: no flag, scene, line, NPC, quest, banner, book, bark, bestiary entry or banter of the expansion exists', () => {
  assert.deepEqual(Object.keys(FLAGS), Object.keys(BASE.flags));
  assert.deepEqual(FLAG_IDS, BASE.flagIds);
  assert.deepEqual(Object.keys(SCENES), BASE.scenes);
  assert.deepEqual(Object.keys(LINES), BASE.lines);
  assert.deepEqual(Object.keys(NPCS), BASE.npcs);
  assert.deepEqual(ALL_SIDE_QUESTS.map((q) => q.id), BASE.quests);
  assert.deepEqual(Object.keys(BANNERS), BASE.banners);
  assert.deepEqual(Object.keys(BOOKS), BASE.books);
  assert.deepEqual(Object.keys(BARKS), BASE.barks);
  assert.deepEqual(Object.keys(BESTIARY), BASE.bestiary);
  for (const m of X1_MAPS) assert.ok(!(m in BANTER));
  for (const id of Object.keys(X1.story.scenes)) { assert.equal(sceneById(id), null); assert.equal(sceneAllowed(id, () => true), false); }
  for (const id of Object.keys(X1.npcs.X1_NPCS)) assert.equal(isPresent(id, () => true), false);
  for (const id of PREPENDED_NPCS) assert.equal(NPCS[id].talk.length, BASE.talkLen[id]);
  assert.deepEqual(resolveAll(PREPENDED_NPCS), BASE_TALK);
});

test('not registered: the journal, Talk and banter are the old game\'s, whatever new flags a save carries', () => {
  const all = (f) => f in X1.flags.X1_FLAGS || ['mira_joined', 'bram_joined', 'archivore_defeated', 'hal_returned', 'lantern_get', 'first_fight_done', 'archive_f1_done'].includes(f);
  const j = journal(all);
  assert.deepEqual(j.side.filter((s) => X1.quests.X1_SIDE_QUESTS.some((q) => q.id === s.id)), []);
  assert.deepEqual(partyChat(all, 'valley').banter.map((l) => l.text).join(' ').match(/cleft|south track/), null);
});

test('with the switch off (X1_LIVE false) the scenes are inert even when handed to the field', async () => {
  const { X1_LIVE, x1On } = X1.live;
  if (X1_LIVE) return;   // the integrate agent flipped the switch; the gate tests of x1_story.test.mjs carry the rest
  assert.equal(x1On('west'), false);
  assert.equal(x1On(), false);
  for (const [id, fn] of Object.entries(X1.story.scenes)) {
    const { log } = await runOnce(fn, { flags: ['mira_joined', 'bram_joined'], branchFlags: false });
    assert.equal(log.length, 0, `${id} ran with X1_LIVE false`);
  }
});
