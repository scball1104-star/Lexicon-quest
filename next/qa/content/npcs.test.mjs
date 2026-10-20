// NPC roster: valid ids, complete dialogue, every townsperson changes after the story moves on.
import test from 'node:test';
import assert from 'node:assert/strict';
import { NPCS, talkTo, isPresent, moveFor, npcsOnMap, speakerName } from '../../src/data/npcs.js';
import { scenes } from '../../src/data/story/ep1.js';
import { FLAGS } from '../../src/data/quests.js';
import { fits, boxLines, resolve } from '../../src/data/story/dialogue.js';
import { MAP_IDS, NPC_SPRITES, EXTRA_SPRITES } from './_harness.mjs';

let SHOPS = null;
try { ({ SHOPS } = await import('../../src/data/shops.js')); } catch { SHOPS = null; }

const MOVES = ['stand', 'turn', 'wander', 'patrol', 'tag', 'sleep'];
const SPRITES = new Set([...NPC_SPRITES, ...EXTRA_SPRITES]);
const flagsOf = (e) => [e?.if, e?.ifNot].flat().filter(Boolean);

// Flags that can only be set once Mira (or Bram) is in the party. Used to check interjections.
const AFTER_MIRA = ['mira_joined', 'bram_joined', 'left_town', 'valley_arrived', 'saw_milestone', 'archive_entered',
  'archive_f1_done', 'echo_warden_defeated', 'lantern_get', 'archive_f2_done', 'boss_door_open',
  'archivore_defeated', 'ep1_complete', 'returned_home', 'found_thirteenth_bell', 'garrick_farewell_done',
  'tess_letter_1_found', 'tess_letter_2_found', 'tess_letter_3_found',
  'tess_letter_1_delivered', 'tess_letter_2_delivered', 'tess_letter_3_delivered', 'tess_quest_done', 'hal_returned'];
const AFTER_BRAM = AFTER_MIRA.filter((f) => f !== 'mira_joined');

test('every NPC has a name, a valid sprite, a map, a movement style and dialogue', () => {
  for (const [id, n] of Object.entries(NPCS)) {
    assert.ok(n.name && typeof n.name === 'string', `${id}: name`);
    assert.ok(SPRITES.has(n.sprite), `${id}: sprite ${n.sprite}`);
    assert.ok(MAP_IDS.includes(n.map), `${id}: map ${n.map}`);
    assert.ok(n.spot && n.about, `${id}: spot and about`);
    const moves = Array.isArray(n.move) ? n.move : [{ move: n.move }];
    for (const m of moves) assert.ok(MOVES.includes(m.move), `${id}: move ${m.move}`);
    if (Array.isArray(n.move)) assert.ok(!flagsOf(n.move[n.move.length - 1]).length, `${id}: move list needs a fallback`);
    assert.ok(Array.isArray(n.talk) && n.talk.length, `${id}: talk`);
    const last = n.talk[n.talk.length - 1];
    assert.ok(!flagsOf(last).length, `${id}: last talk entry must be unconditional`);
  }
});

test('every COMMON.md NPC sprite id is used by someone', () => {
  const used = new Set(Object.values(NPCS).map((n) => n.sprite));
  for (const sp of NPC_SPRITES) assert.ok(used.has(sp), `unused sprite ${sp}`);
});

test('talk entries use declared flags and existing scenes, and every box fits', () => {
  for (const [id, n] of Object.entries(NPCS)) {
    for (const f of flagsOf(n.show)) assert.ok(f in FLAGS, `${id}: show flag ${f}`);
    if (Array.isArray(n.move)) for (const m of n.move) for (const f of flagsOf(m)) assert.ok(f in FLAGS, `${id}: move flag ${f}`);
    for (const e of n.talk) {
      for (const f of flagsOf(e)) assert.ok(f in FLAGS, `${id}: undeclared flag ${f}`);
      assert.ok(!!e.scene !== !!e.lines, `${id}: an entry has either scene or lines`);
      if (e.scene) { assert.ok(scenes[e.scene], `${id}: unknown scene ${e.scene}`); continue; }
      for (const l of resolve(e.lines, () => false, id)) {
        assert.ok(fits(l.text), `${id}: ${boxLines(l.text).join(' / ')}`);
        assert.ok(l.who === null || l.who === id || ['hero', 'mira', 'bram'].includes(l.who), `${id}: speaker ${l.who}`);
      }
    }
  }
});

test('party interjections only appear once that companion is in the party', () => {
  for (const [id, n] of Object.entries(NPCS)) {
    for (const e of n.talk) {
      if (!e.lines) continue;
      const conds = [e.if].flat().filter(Boolean);
      for (const l of resolve(e.lines, () => false, id)) {
        if (l.who === id) continue; // the companion as an NPC, before joining
        if (l.who === 'mira') assert.ok(conds.some((f) => AFTER_MIRA.includes(f)), `${id}: Mira speaks before joining`);
        if (l.who === 'bram') assert.ok(conds.some((f) => AFTER_BRAM.includes(f)), `${id}: Bram speaks before joining`);
      }
    }
  }
});

test('shops and inns hook to real shop ids', () => {
  for (const [id, n] of Object.entries(NPCS)) {
    if (!n.service) continue;
    assert.ok(['shop', 'inn'].includes(n.service.type), `${id}: service type`);
    if (n.service.type === 'shop' && SHOPS) assert.ok(SHOPS[n.service.id], `${id}: unknown shop ${n.service.id}`);
    if (n.service.type === 'inn') assert.ok(Number.isInteger(n.service.price), `${id}: inn price`);
  }
});

test('every townsperson says something new once the names come back', () => {
  const POST = ['archivore_defeated', 'ep1_complete'];
  for (const [id, n] of Object.entries(NPCS)) {
    if (n.talk.length === 1 && n.talk[0].scene) continue; // party members before joining, the dough
    if (flagsOf(n.show).includes('archivore_defeated')) continue; // Hal only exists afterwards
    if ([n.show?.ifNot].flat().some((f) => f === 'mira_joined' || f === 'bram_joined')) continue; // joins the party
    assert.ok(n.talk.some((e) => [e.if].flat().some((f) => POST.includes(f))), `${id}: no post-Archivore lines`);
    // And at least two different states over the story.
    assert.ok(n.talk.filter((e) => e.lines).length >= 2, `${id}: needs at least two dialogue states`);
  }
});

test('helpers: talkTo, isPresent, moveFor, npcsOnMap, speakerName', () => {
  const has = (set) => (f) => set.includes(f);
  assert.deepEqual(talkTo('mael', has(['intro_done'])), { scene: 'mael_intro' });
  const t = talkTo('mael', has(['intro_done', 'met_mael']));
  assert.ok(t.lines.length >= 1 && t.lines[0].who === 'mael');
  assert.equal(isPresent('mira', has([])), true);
  assert.equal(isPresent('mira', has(['mira_joined'])), false);
  assert.equal(isPresent('hal', has([])), false);
  assert.equal(isPresent('hal', has(['archivore_defeated'])), true);
  assert.equal(moveFor('wick', has([])).move, 'turn');
  assert.equal(moveFor('wick', has(['wick_tag_done'])).move, 'tag');
  assert.equal(moveFor('wick', has(['wick_tag_done'])).partner, 'lark');
  assert.ok(npcsOnMap('willowmere').some((n) => n.id === 'tess'));
  for (const m of MAP_IDS.filter((x) => !x.startsWith('archive') && x !== 'whisperwood_hollow')) assert.ok(npcsOnMap(m).length >= 1, `nobody on ${m}`);
  assert.equal(speakerName('archivore'), 'The Archivore');
  assert.equal(speakerName('pip'), 'Pip');
  // Every shop/inn NPC hands back its service after the lines.
  assert.ok(talkTo('hob', has([])).service.type === 'inn');
});

test('Tess, Wick and Nella open their quests only once Bram has joined; Oren opens early', () => {
  const has = (set) => (f) => set.includes(f);
  const town = ['intro_done', 'met_mael'];
  for (const [id, scene] of [['tess', 'tess_letters'], ['wick', 'wick_tag'], ['nella', 'nella_bell']]) {
    const before = talkTo(id, has(town));
    assert.ok(before.lines && !before.scene, `${id}: no quest before Bram joins`);
    assert.ok(before.lines.length >= 1 && before.lines.every((l) => l.who === id), `${id}: a plain line of their own`);
    const withMira = talkTo(id, has([...town, 'mira_joined']));
    assert.ok(withMira.lines && !withMira.scene, `${id}: still no quest with only Mira`);
    assert.deepEqual(talkTo(id, has([...town, 'mira_joined', 'bram_joined'])), { scene }, `${id}: the quest opens with Bram`);
  }
  // the pre-quest line is a hint: it differs from the fallback and from the post-quest lines
  const hint = talkTo('tess', has(town)).lines.map((l) => l.text).join(' ');
  assert.match(hint, /short|errand/i);
  assert.match(talkTo('wick', has(town)).lines.map((l) => l.text).join(' '), /Duke/);
  assert.match(talkTo('nella', has(town)).lines.map((l) => l.text).join(' '), /tied up/);
  // a tag taken from the nest early does not open Wick's quest before Bram
  assert.ok(!talkTo('wick', has([...town, 'wick_tag_found'])).scene);
  // Oren's starter can open as soon as the hero is up
  assert.deepEqual(talkTo('oren', has(['intro_done'])), { scene: 'oren_starter' });
  // Quill tells the Whisperwood secret: the first talk is the Lost Bridge hint scene (W6-content), then lines
  assert.deepEqual(talkTo('quill', has(['bram_joined'])), { scene: 'quill_hint' });
  assert.match(talkTo('quill', has(['bram_joined', 'lost_bridge_started', 'hollow_cleared'])).lines.map((l) => l.text).join(' '), /Sorrel/);
  for (const flags of [['lost_bridge_started'], ['lost_bridge_started', 'lantern_get']]) {
    const q = talkTo('quill', has(['bram_joined', ...flags])).lines.map((l) => l.text).join(' ');
    assert.match(q, /pool/);
    assert.match(q, /pines/);
    assert.match(q, /bridge/);
  }
});

test('NPC portraits exist in the W1-sprites portrait atlas', async () => {
  const { existsSync, readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { NEXT, PORTRAITS } = await import('./_harness.mjs');
  const atlasPath = join(NEXT, 'assets', 'sprites', 'portraits.json');
  const frames = existsSync(atlasPath) ? JSON.parse(readFileSync(atlasPath, 'utf8')).frames : null;
  for (const [id, n] of Object.entries(NPCS)) {
    if (!n.portrait) continue;
    assert.ok(PORTRAITS.includes(n.portrait), `${id}: portrait ${n.portrait} is not a known portrait id`);
    if (frames) assert.ok(frames[`${n.portrait}_48`], `${id}: ${n.portrait}_48 missing from portraits.json`);
  }
});
