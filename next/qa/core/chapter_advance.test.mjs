// #71: the chapter follows the story. g.chapter used to stay 1 for a straight-through player (only the quick starts set
// it), so the save card and field menu said "Chapter I" for six episodes and vows paid the Episode 1 rate under one cap.
// Now state.js raises it from the flags: 1 + the highest N with epN_complete (at most 6), when such a flag is set (an
// episode's ending script) and when a save loads (deserialize). It never goes down; kept vows keep their own chapter.
// Fine Print (tier_1) is a fresh lap: its story flags start over, so its chapter starts at 1 and climbs with its own flags.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGame, addMember, setFlag, serialize, deserialize, saveMeta, newGameEp2, newGameEp3, chapterFromFlags,
  advanceChapter, LAST_CHAPTER } from '../../src/game/state.js';
import { newGameEp4 } from '../../src/data/ep4/start.js';
import { newGameEp5 } from '../../src/data/ep5/start.js';
import { newGameEp6 } from '../../src/data/ep6/start.js';
import { FieldScene } from '../../src/scenes/field.js';
import { takeVow, settleVow, vowsPaid, rewardPoints } from '../../src/game/vows.js';
import { VOW_REWARD, VOW_PAID_CAP } from '../../src/data/vows.js';
import { carryRecord, TIER_FLAG } from '../../src/data/tier/tier.js';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(NEXT, rel), 'utf8');
const ENDINGS = { 1: 'src/data/story/ep1.js', 2: 'src/data/story/ep2.js', 3: 'src/data/story/ep3.js',
  4: 'src/data/ep4/story.js', 5: 'src/data/ep5/story.js', 6: 'src/data/ep6/story.js' };

/** The field's own setFlag (the one an ending script's `s.setFlag` reaches through cutscene.js), on a bare field. */
function fieldSetFlag(g, flag, value = true) {
  const field = { game: g, entities: null, actors: [], map: null, glass: null, inputLocked: 0, gateCheck() {}, hasFlag: (f) => !!g.flags[f] };
  FieldScene.prototype.setFlag.call(field, flag, value);
}
/** A party of three with a few battles fought. */
function party() {
  const g = createGame('Arden');
  addMember(g, 'mira'); addMember(g, 'bram');
  g.counters.battles = 3;
  return g;
}
/** Take a vow, fight once, rest: returns the settle result. */
function keepOne(g, id = 'no_flee') {
  assert.ok(takeVow(g, id), `took ${id}`);
  g.counters.battles += 1;
  return settleVow(g);
}

test('every episode ending sets its epN_complete flag through the script setFlag (the seam this fix rides on)', () => {
  for (const [n, rel] of Object.entries(ENDINGS)) assert.ok(read(rel).includes(`await s.setFlag('ep${n}_complete');`), rel);
  assert.ok(/async setFlag\(flag, value = true\) \{ F\.setFlag\(flag, value\); \}/.test(read('src/world/cutscene.js')), 'cutscene setFlag goes to the field');
  assert.ok(/setFlag\(flag, value = true\) \{\s*stateSetFlag\(this\.game, flag, value\);/.test(read('src/scenes/field.js')), 'the field goes to state.js');
});

test('a new game is chapter 1, and so is every flag set short of an episode ending', () => {
  const g = createGame('Arden');
  assert.equal(g.chapter, 1);
  assert.equal(chapterFromFlags(g), 1);
  for (const f of ['intro_done', 'archivore_defeated', 'ep2_started', 'ep1_completed', 'xep1_complete']) setFlag(g, f);
  assert.equal(g.chapter, 1);
  assert.equal(deserialize(serialize(g)).chapter, 1);
});

test('a straight-through game: after each episode\'s ending flag the field, the save card and a reload show chapter N+1', () => {
  const g = createGame('Arden');
  for (let n = 1; n <= 6; n++) {
    fieldSetFlag(g, `ep${n}_complete`);
    const want = Math.min(LAST_CHAPTER, n + 1);
    assert.equal(g.chapter, want, `after ep${n}_complete`);
    assert.equal(saveMeta(g).chapter, want, 'the save card (saveMeta) reads it');
    assert.equal(deserialize(serialize(g)).chapter, want, 'it survives a save');
  }
  assert.equal(g.chapter, 6, 'Episode 6 finished stays chapter 6 (the last)');
});

test('every quick start is unchanged: Episode N starts in chapter N, before and after a save', () => {
  const quick = { 2: newGameEp2, 3: newGameEp3, 4: newGameEp4, 5: newGameEp5, 6: newGameEp6 };
  for (const [n, make] of Object.entries(quick)) {
    const g = make('Arden', { slot: 0 });
    assert.equal(g.chapter, Number(n), `newGameEp${n}`);
    assert.equal(chapterFromFlags(g), Number(n), `its flags agree (ep${n - 1}_complete)`);
    assert.equal(deserialize(serialize(g)).chapter, Number(n));
  }
});

test('an old save at chapter 1 with ep5_complete loads as chapter 6; one with ep1 to ep3 done loads as 4', () => {
  const old = serialize(createGame('Arden'));
  old.flags = { intro_done: true, ep1_complete: true, ep2_complete: true, ep3_complete: true, ep4_complete: true, ep5_complete: true };
  old.chapter = 1;
  assert.equal(deserialize(old).chapter, 6);
  const mid = serialize(createGame('Arden'));
  mid.flags = { ep1_complete: true, ep2_complete: true, ep3_complete: true };
  delete mid.chapter;   // a save from before the field existed
  assert.equal(deserialize(mid).chapter, 4);
  assert.equal(deserialize(old).flags.ep5_complete, true, 'flags untouched');
});

test('the chapter never goes down: a higher stored chapter stays, a cleared flag does not lower it', () => {
  const g = createGame('Arden');
  g.chapter = 5; g.flags.ep1_complete = true;
  assert.equal(advanceChapter(g), 5);
  assert.equal(deserialize(serialize(g)).chapter, 5);
  setFlag(g, 'ep1_complete');
  assert.equal(g.chapter, 5);
  const h = createGame('Arden');
  setFlag(h, 'ep3_complete'); assert.equal(h.chapter, 4);
  setFlag(h, 'ep3_complete', false); assert.equal(h.chapter, 4, 'clearing the flag keeps the chapter');
  setFlag(h, 'ep1_complete'); assert.equal(h.chapter, 4, 'an earlier ending does not lower it');
  assert.equal(deserialize(serialize(h)).chapter, 4);
});

test('vow pay follows the new chapter; vows already kept keep the chapter they were kept in', () => {
  const g = party();
  for (let i = 0; i < VOW_PAID_CAP; i++) assert.equal(keepOne(g).reward.points, VOW_REWARD[1]);
  assert.equal(keepOne(g).reward, null, 'chapter 1 is capped');
  fieldSetFlag(g, 'ep1_complete');
  assert.equal(g.chapter, 2);
  const k = keepOne(g);
  assert.equal(k.reward.points, VOW_REWARD[2], 'the Episode 2 rate, under a fresh cap');
  assert.deepEqual(g.vowsKept.map((v) => v.chapter), [1, 1, 1, 1, 1, 1, 2], 'history is not rewritten');
  assert.equal(vowsPaid(g, 1), VOW_PAID_CAP); assert.equal(vowsPaid(g), 1);
  // a vow taken in chapter 1 and kept after the ending pays at the chapter it was taken in
  const h = party();
  takeVow(h, 'no_flee'); fieldSetFlag(h, 'ep1_complete'); h.counters.battles += 1;
  const late = settleVow(h);
  assert.equal(late.reward.points, VOW_REWARD[1]); assert.deepEqual(h.vowsKept, [{ id: 'no_flee', chapter: 1, paid: true }]);
  // an old capped chapter-1 save past Episode 3 reloads in chapter 4 and pays again
  const old = party();
  old.vowsKept = Array.from({ length: VOW_PAID_CAP }, () => ({ id: 'no_flee', chapter: 1, paid: true }));
  old.flags = { ep1_complete: true, ep2_complete: true, ep3_complete: true }; old.chapter = 1;
  const back = deserialize(serialize(old));
  assert.equal(back.chapter, 4);
  assert.equal(keepOne(back).reward.points, rewardPoints(4));
  assert.equal(back.vowsKept.filter((v) => v.chapter === 1).length, VOW_PAID_CAP, 'the old entries keep chapter 1');
});

test('Fine Print: the carry starts the lap in chapter 1 (old vows at 0), and the lap climbs with its own endings', () => {
  const rec = newGameEp4('Arden', { slot: 1 });
  fieldSetFlag(rec, 'ep4_complete');
  assert.equal(rec.chapter, 5);
  rec.vowsKept = [{ id: 'no_flee', chapter: 3, paid: true }];
  const g = carryRecord(serialize(rec), { slot: 2, seed: 7 });
  assert.equal(g.chapter, 1, 'chapter 1, so the cold open plays');
  assert.deepEqual(g.flags, { [TIER_FLAG]: true });
  assert.ok(g.vowsKept.every((k) => k.chapter === 0));
  assert.equal(deserialize(serialize(g)).chapter, 1, 'a tier save with no ending yet stays chapter 1');
  fieldSetFlag(g, 'ep1_complete');
  assert.equal(g.chapter, 2, 'the lap finished Episode 1');
  assert.equal(deserialize(serialize(g)).chapter, 2);
});
