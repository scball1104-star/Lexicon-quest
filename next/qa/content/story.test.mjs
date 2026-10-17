// Episode 1 story script: every scene, every branch. Uses only the cutscene API, every referenced id
// exists, every flag is declared, every box fits, and a full playthrough sets every main story flag.
import test from 'node:test';
import assert from 'node:assert/strict';
import { scenes, lines, SCENE_CONDITIONS, PROLOGUE } from '../../src/data/story/ep1.js';
import { NPCS } from '../../src/data/npcs.js';
import { FLAGS } from '../../src/data/quests.js';
import { ITEMS } from '../../src/data/items.js';
import { fits, boxLines, CHOICE_COLS } from '../../src/data/story/dialogue.js';
import { explore, playthrough, MUSIC, SFX, EMOTES, DIRS, TINTS, PORTRAITS, NPC_SPRITES, EXTRA_SPRITES,
  ENCOUNTER_IDS_FALLBACK } from './_harness.mjs';

let ENCOUNTERS = null;
try { ({ ENCOUNTERS } = await import('../../src/data/encounters.js')); } catch { ENCOUNTERS = null; }
const encounterExists = (id) => (ENCOUNTERS ? !!ENCOUNTERS[id] : ENCOUNTER_IDS_FALLBACK.includes(id));

const MAIN_FLAGS = ['intro_done', 'met_mael', 'mira_joined', 'bram_joined', 'left_town', 'archive_entered',
  'archive_f1_done', 'echo_warden_defeated', 'lantern_get', 'archive_f2_done', 'boss_door_open',
  'archivore_defeated', 'ep1_complete'];
const MAP_ACTORS = ['echo_warden', 'archivore']; // placed on maps as scene actors, not NPC records
const PARTY = ['hero', 'mira', 'bram'];

// Explore every scene once and keep the runs for the checks below.
const RUNS = {};
for (const [id, fn] of Object.entries(scenes)) RUNS[id] = await explore(fn);
const allOps = (id) => RUNS[id].flatMap((r) => r.log);

test('every scene runs on every path using only the cutscene API', () => {
  for (const [id, runs] of Object.entries(RUNS)) assert.ok(runs.length >= 1, id);
  // A few scenes really do branch.
  assert.ok(RUNS.mael_intro.length >= 4, 'mael_intro has two choices');
  assert.ok(RUNS.tess_letters.length > 20, 'tess_letters handles every letter combination');
});

test('every scene locks input and always releases it', () => {
  for (const [id, runs] of Object.entries(RUNS)) {
    for (const r of runs) {
      const locks = r.log.filter((e) => e.op === 'lockInput').length;
      const unlocks = r.log.filter((e) => e.op === 'unlockInput').length;
      assert.equal(locks, unlocks, `${id}: lock/unlock mismatch`);
    }
  }
});

test('scene conditions exist for every scene and use declared flags', () => {
  for (const id of Object.keys(scenes)) assert.ok(id in SCENE_CONDITIONS, `no SCENE_CONDITIONS for ${id}`);
  for (const [id, c] of Object.entries(SCENE_CONDITIONS)) {
    assert.ok(id in scenes, `condition for unknown scene ${id}`);
    for (const f of [c?.if, c?.ifNot].flat().filter(Boolean)) assert.ok(f in FLAGS, `${id}: undeclared flag ${f}`);
  }
});

test('every flag a scene sets or checks is declared in FLAGS', () => {
  for (const id of Object.keys(RUNS)) {
    for (const e of allOps(id)) {
      if (e.op === 'setFlag' || e.op === 'hasFlag') assert.ok(e.args[0] in FLAGS, `${id}: undeclared flag ${e.args[0]}`);
    }
  }
});

test('every main story flag (COMMON.md) is set by some scene', () => {
  const set = new Set();
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) if (e.op === 'setFlag') set.add(e.args[0]);
  for (const f of MAIN_FLAGS) assert.ok(set.has(f), `no scene sets ${f}`);
});

test('every id a scene references exists', () => {
  const npcIds = new Set(Object.keys(NPCS));
  const sprites = new Set([...NPC_SPRITES, ...EXTRA_SPRITES]);
  // Spawned actors may be cleaned up by a later scene (ending_hook despawns the return scene's crowd).
  const spawned = new Set();
  for (const id of Object.keys(RUNS)) {
    for (const e of allOps(id)) {
      if (e.op === 'spawn') {
        spawned.add(e.args[0]);
        const o = e.args[1] || {};
        assert.ok(sprites.has(o.sprite), `${id}: spawn sprite ${o.sprite}`);
        assert.ok(typeof o.at === 'string' || (Number.isInteger(o.x) && Number.isInteger(o.y)), `${id}: spawn needs at or x,y`);
        assert.ok(typeof o.name === 'string' && o.name, `${id}: spawned speaker needs a name`);
      }
    }
  }
  for (const id of Object.keys(RUNS)) {
    const known = (who) => who == null || PARTY.includes(who) || npcIds.has(who) || spawned.has(who) || MAP_ACTORS.includes(who);
    for (const e of allOps(id)) {
      const [a, b, c] = e.args;
      switch (e.op) {
        case 'say':
          assert.ok(known(a), `${id}: unknown speaker ${a}`);
          if (c && c.portrait) assert.ok(PORTRAITS.includes(c.portrait), `${id}: portrait ${c.portrait}`);
          break;
        case 'walk':
          assert.ok(known(a) && a != null, `${id}: walk unknown actor ${a}`);
          assert.ok(typeof b === 'string' || (Array.isArray(b) && b.length && b.every((d) => DIRS.includes(d))), `${id}: walk path`);
          break;
        case 'face':
          assert.ok(known(a) && a != null, `${id}: face unknown actor ${a}`);
          assert.ok(DIRS.includes(b) || known(b), `${id}: face target ${b}`);
          break;
        case 'emote': assert.ok(known(a) && EMOTES.includes(b), `${id}: emote ${a} ${b}`); break;
        case 'jump': case 'despawn': assert.ok(known(a), `${id}: ${e.op} unknown actor ${a}`); break;
        case 'music': assert.ok(a === null || MUSIC.includes(a), `${id}: music ${a}`); break;
        case 'sfx': assert.ok(SFX.includes(a), `${id}: sfx ${a}`); break;
        case 'tint': assert.ok(TINTS.includes(a) || /^#[0-9a-f]{6}$/i.test(a), `${id}: tint ${a}`); break;
        case 'fade': assert.ok(a === 'in' || a === 'out', `${id}: fade ${a}`); break;
        case 'give': case 'take':
          assert.ok(ITEMS[a], `${id}: ${e.op} unknown item ${a}`);
          assert.ok(b === undefined || (Number.isInteger(b) && b > 0), `${id}: qty`);
          break;
        case 'battle': assert.ok(encounterExists(a), `${id}: unknown encounter ${a}`); break;
        case 'addMember': assert.ok(a === 'mira' || a === 'bram', `${id}: addMember ${a}`); break;
        case 'camera.panTo':
          assert.ok(typeof a === 'string' || (Number.isInteger(a) && Number.isInteger(b)), `${id}: panTo target`);
          break;
        case 'camera.follow': assert.ok(known(a) && a != null, `${id}: follow ${a}`); break;
        default: break;
      }
    }
  }
});

test('every box fits: 3 lines of 42 characters with an 8-letter hero name', () => {
  const bad = [];
  for (const id of Object.keys(RUNS)) {
    for (const e of allOps(id)) {
      if (e.op === 'say' || e.op === 'title') if (!fits(e.args[e.op === 'say' ? 1 : 0])) bad.push(`${id}: ${boxLines(e.args[e.op === 'say' ? 1 : 0]).join(' / ')}`);
      if (e.op === 'choice') for (const o of e.args[0]) if (o.length > CHOICE_COLS) bad.push(`${id} choice: ${o}`);
    }
  }
  for (const card of PROLOGUE) if (!fits(card)) bad.push(`prologue: ${card}`);
  assert.deepEqual(bad, []);
});

test('inspect lines resolve, fit, and use declared flags', () => {
  const walk = (where, v) => {
    if (typeof v === 'string') { assert.ok(fits(v), `${where}: ${boxLines(v).join(' / ')}`); return; }
    assert.ok(Array.isArray(v) && v.length, `${where}: empty`);
    for (const x of v) {
      if (typeof x === 'string') walk(where, x);
      else if (x && 'text' in x) walk(where, x.text);
      else {
        for (const f of [x.if, x.ifNot].flat().filter(Boolean)) assert.ok(f in FLAGS, `${where}: undeclared flag ${f}`);
        walk(where, x.lines);
      }
    }
    // A conditional list must end with an unconditional fallback.
    if (v.length && typeof v[0] === 'object' && 'lines' in v[0]) {
      const last = v[v.length - 1];
      assert.ok(!last.if && !last.ifNot, `${where}: conditional list needs a fallback last`);
    }
  };
  for (const [id, v] of Object.entries(lines)) walk(`lines.${id}`, v);
});

test('STAGING.md documents every scene and every mark the script refers to', async () => {
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { NEXT } = await import('./_harness.mjs');
  const staging = readFileSync(join(NEXT, 'docs', 'story', 'STAGING.md'), 'utf8');
  const missing = [];
  for (const id of Object.keys(scenes)) if (!staging.includes(id)) missing.push(`scene ${id}`);
  const actors = new Set(['hero', 'mira', 'bram', ...Object.keys(NPCS), ...MAP_ACTORS]);
  for (const id of Object.keys(RUNS)) {
    for (const e of allOps(id)) {
      let mark = null;
      if ((e.op === 'walk' || e.op === 'camera.panTo') && typeof e.args[e.op === 'walk' ? 1 : 0] === 'string') mark = e.args[e.op === 'walk' ? 1 : 0];
      if (e.op === 'spawn' && e.args[1]?.at) mark = e.args[1].at;
      if (mark && !actors.has(mark) && !staging.includes('`' + mark + '`')) missing.push(`${id}: mark ${mark}`);
    }
  }
  assert.deepEqual([...new Set(missing)], []);
});

// ------------------------------------------------------------------------------------------------
// A full playthrough in story order.
// ------------------------------------------------------------------------------------------------
const giveKey = (flag) => (set) => set.add(flag); // what a map chest/event would do

test('a full playthrough reaches ep1_complete with every main flag set, in order', async () => {
  const { set, logs } = await playthrough(scenes, [
    'prologue', 'wake_up', 'fading_sign', 'mael_intro',
    'south_gate',                       // blocked: Mira has not joined yet
    (s) => assert.ok(!s.has('bram_joined'), 'Bram must not join before Mira'),
    'mira_joins', 'south_gate', 'garrick_farewell', 'hazel_farewell', 'leave_town',
    'valley_arrival', 'milestone', 'archive_door',
    'archive_f1_arrival', 'find_letter_1', 'archive_f1_bell',
    'archive_f2_arrival', 'find_letter_2', 'echo_warden', 'lantern_get', 'archive_f2_exit',
    'archive_f3_arrival', 'find_letter_3', 'thirteenth_bell',
    'boss_door',                        // no key yet: stays shut
    (s) => assert.ok(!s.has('boss_door_open'), 'boss door needs the key'),
    giveKey('stacks_key_found'),
    ['boss_door', [1]],                 // "Not yet."
    (s) => assert.ok(!s.has('boss_door_open'), 'Not yet leaves the door shut'),
    'boss_door', 'archivore', 'return_to_willowmere',
  ]);
  for (const f of MAIN_FLAGS) assert.ok(set.has(f), `missing ${f}`);
  // The hero leaves with the fragment; Tess's letters are in the bag.
  const given = Object.values(logs).flat(2).filter((e) => e.op === 'give').map((e) => e.args[0]);
  for (const it of ['lantern_of_recall', 'name_fragment_1', 'tess_letter_1', 'tess_letter_2', 'tess_letter_3'])
    assert.ok(given.includes(it), `never given: ${it}`);
});

test('guards stop scenes from replaying or firing early', async () => {
  // Fresh game: the Archive door, the Archivore and the return scene must not run.
  const { set, logs } = await playthrough(scenes, ['archive_door', 'archivore', 'return_to_willowmere', 'lantern_get']);
  assert.equal(set.size, 0);
  for (const log of Object.values(logs).flat()) assert.equal(log.length > 0 && log.some((e) => e.op === 'say'), false);
  // After waking up, wake_up does nothing a second time.
  const again = await playthrough(scenes, ['wake_up', 'wake_up']);
  assert.equal(again.logs.wake_up[1].filter((e) => e.op === 'say').length, 0);
});

test('side quests run start to finish and pay out once', async () => {
  const base = ['wake_up', 'fading_sign', 'mael_intro', 'mira_joins', 'south_gate'];
  const { set, logs } = await playthrough(scenes, [
    ...base,
    'tess_letters', 'oren_starter', 'wick_tag', 'nella_bell',
    'starter_found', 'oren_starter',
    'duck_nest', 'wick_tag',
    'ferry_bell_found', 'nella_bell',
    (s) => { s.add('left_town'); s.add('archive_entered'); },
    'find_letter_1', 'tess_letters',                 // deliver one
    (s) => assert.ok(s.has('tess_letter_1_delivered') && !s.has('tess_quest_done')),
    (s) => { s.add('archive_f1_done'); s.add('archive_f2_done'); },
    'find_letter_2', 'find_letter_3', 'tess_letters', // deliver the rest, get the boots
    'tess_letters',                                   // done: nothing more
    (s) => s.add('archivore_defeated'),
    'hal_returns', 'hal_returns',
  ]);
  for (const f of ['tess_quest_done', 'starter_done', 'wick_tag_done', 'nella_bell_done', 'hal_returned'])
    assert.ok(set.has(f), `missing ${f}`);
  const gives = Object.values(logs).flat(2).filter((e) => e.op === 'give').map((e) => e.args[0]);
  assert.equal(gives.filter((g) => g === 'wayfarer_boots').length, 1, 'boots exactly once');
  assert.equal(logs.hal_returns[1].filter((e) => e.op === 'say').length, 0, 'Hal reunion plays once');
});
