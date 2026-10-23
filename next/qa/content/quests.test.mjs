// Quests: declared flags, journal text, and a party-chat hint for every step on every map, so the
// player is never lost without a quest marker.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FLAGS, MAIN_QUEST, SIDE_QUESTS, REWARDS, BANTER, partyChat, currentStep, journal, pickChat }
  from '../../src/data/quests.js';
import { NPCS } from '../../src/data/npcs.js';
import { ITEMS } from '../../src/data/items.js';
import { fits, boxLines } from '../../src/data/story/dialogue.js';
import { MAP_IDS, EP2_MAP_IDS } from './_harness.mjs';

const MAIN_FLAGS = ['intro_done', 'met_mael', 'mira_joined', 'bram_joined', 'left_town', 'archive_entered',
  'archive_f1_done', 'echo_warden_defeated', 'lantern_get', 'archive_f2_done', 'boss_door_open',
  'archivore_defeated', 'ep1_complete'];
const list = (v) => [v].flat().filter(Boolean);

test('FLAGS declares every COMMON.md main flag, with a description', () => {
  for (const f of MAIN_FLAGS) assert.ok(f in FLAGS, f);
  for (const [f, d] of Object.entries(FLAGS)) {
    assert.match(f, /^[a-z][a-z0-9_]*$/, `flag id ${f}`);
    assert.ok(typeof d === 'string' && d.length > 5, `${f}: description`);
  }
});

test('main quest steps are in story order and use declared flags', () => {
  const order = MAIN_QUEST.steps.map((s) => s.done).filter(Boolean);
  for (const f of order) assert.ok(f in FLAGS, f);
  // The COMMON.md main flags appear as step gates in their story order (left_town is a sub-beat).
  const gates = MAIN_FLAGS.filter((f) => order.includes(f));
  assert.deepEqual(gates, order.filter((f) => MAIN_FLAGS.includes(f)));
  assert.equal(MAIN_QUEST.steps[MAIN_QUEST.steps.length - 1].done, null, 'last step is the open epilogue');
});

test('party chat has a hint for every main step on every map, in the right voices', () => {
  const done = new Set();
  for (const step of MAIN_QUEST.steps) {
    const has = (f) => done.has(f);
    assert.equal(currentStep(has).id, step.id);
    const party = ['hero'];
    if (done.has('mira_joined')) party.push('mira');
    if (done.has('bram_joined')) party.push('bram');
    for (const map of MAP_IDS) {
      const chat = partyChat(has, map);
      assert.ok(chat.lines.length >= 1, `${step.id} on ${map}: no hint`);
      for (const l of chat.lines) {
        assert.ok(party.includes(l.who), `${step.id} on ${map}: ${l.who} is not in the party yet`);
        assert.ok(fits(l.text), `${step.id}: ${boxLines(l.text).join(' / ')}`);
      }
    }
    // Before Mira joins the hero thinks to themself; afterwards a companion always answers.
    if (done.has('mira_joined')) assert.ok(partyChat(has, 'valley').lines.some((l) => l.who !== 'hero'));
    assert.ok(fits(step.journal), `${step.id} journal: ${boxLines(step.journal).join(' / ')}`);
    for (const e of step.chat) for (const f of list(e.if).concat(list(e.ifNot))) assert.ok(f in FLAGS, `${step.id}: ${f}`);
    for (const e of step.chat) for (const m of list(e.map)) assert.ok(MAP_IDS.includes(m), `${step.id}: map ${m}`);
    if (step.done) done.add(step.done);
    // Sub-beats the story sets on the way (so hints see a realistic state).
    if (step.done === 'bram_joined') done.add('left_town');
    if (step.done === 'archive_entered') done.add('saw_milestone');
  }
});

test('side quests: givers exist, rewards exist, every step has a fallback hint', () => {
  for (const q of SIDE_QUESTS) {
    assert.ok(NPCS[q.giver], `${q.id}: giver ${q.giver}`);
    assert.ok(ITEMS[q.reward], `${q.id}: reward ${q.reward}`);
    for (const f of [q.start, q.done]) assert.ok(f in FLAGS, `${q.id}: ${f}`);
    for (const st of q.steps) {
      for (const f of list(st.done)) assert.ok(f in FLAGS, `${q.id}.${st.id}: ${f}`);
      assert.ok(fits(st.journal), `${q.id}.${st.id} journal`);
      const last = st.chat[st.chat.length - 1];
      assert.ok(!last.if && !last.ifNot && !last.map, `${q.id}.${st.id}: chat needs a fallback`);
      for (const e of st.chat) for (const l of e.lines) assert.ok(fits(l.text), `${q.id}: ${l.text}`);
      // Hints fall back to the hero's own thoughts, so a solo hero still gets one.
      assert.ok(pickChat(st.chat, () => false, 'willowmere'), `${q.id}.${st.id}: no solo hint`);
    }
  }
});

test('rewards point at real items', () => {
  for (const [k, r] of Object.entries(REWARDS)) {
    assert.ok(ITEMS[r.item], `${k}: ${r.item}`);
    assert.ok(Number.isInteger(r.qty) && r.qty > 0, `${k}: qty`);
  }
});

test('journal lists the main step and started side quests with counters', () => {
  const flags = new Set(['intro_done', 'met_mael', 'tess_quest_started', 'tess_letter_1_found', 'starter_quest_started',
    'starter_found', 'starter_done']);
  const j = journal((f) => flags.has(f));
  assert.equal(j.main.title, 'The Missing Name');
  assert.ok(j.main.text.includes('Mira'));
  const letters = j.side.find((s) => s.id === 'letters');
  assert.deepEqual(letters.counter, { label: 'Letters found', value: 1, max: 3 });
  assert.equal(j.side.find((s) => s.id === 'starter').done, true);
  assert.equal(j.side.some((s) => s.id === 'wick'), false, 'unstarted quests stay hidden');
});

test('W5 clarity hints: F1 key west / door east, F2 names the button, F3 crystals', () => {
  const f1 = (extra) => partyChat((f) => ['intro_done', 'met_mael', 'mira_joined', 'bram_joined', 'left_town', 'archive_entered', ...extra].includes(f), 'archive_f1');
  const before = f1([]).lines.map((l) => l.text).join(' ');
  assert.match(before, /west/i); assert.match(before, /east/i); assert.match(before, /key/i);
  const after = f1(['archive_key_found']).lines.map((l) => l.text).join(' ');
  assert.match(after, /east/i); assert.match(after, /key/i);
  assert.notEqual(before, after);
  const f2 = partyChat((f) => ['intro_done', 'met_mael', 'mira_joined', 'bram_joined', 'left_town', 'archive_entered', 'archive_f1_done', 'echo_warden_defeated', 'lantern_get'].includes(f), 'archive_f2');
  assert.ok(f2.lines.some((l) => /raise the Lantern with \{i:btn_pageR_lantern\}/.test(l.text)), 'the F2 hint names the button');
  const f3 = partyChat((f) => ['intro_done', 'met_mael', 'mira_joined', 'bram_joined', 'left_town', 'archive_entered', 'archive_f1_done', 'echo_warden_defeated', 'lantern_get', 'archive_f2_done'].includes(f), 'archive_f3');
  assert.ok(f3.lines.some((l) => /Three lights, one door/.test(l.text)), 'the F3 hint says three lights, one door');
  for (const f of ['first_fight_done', 'campfire_rested', 'archive_key_found']) assert.ok(f in FLAGS, f);
});

test('party chat adds a side-quest reminder after the main hint', () => {
  const flags = new Set(['intro_done', 'met_mael', 'mira_joined', 'bram_joined', 'wick_quest_started']);
  const chat = partyChat((f) => flags.has(f), 'willowmere');
  assert.ok(chat.lines.length >= 1);
  assert.equal(chat.side.length, 1);
  assert.equal(chat.side[0].who, 'bram');
});

test('banter: real maps, declared flags, only joined companions speak, every line fits', () => {
  for (const [map, list] of Object.entries(BANTER)) {
    assert.ok(MAP_IDS.includes(map) || EP2_MAP_IDS.includes(map), `banter for unknown map ${map}`);
    for (const e of list) {
      const conds = list.length ? [e.if].flat().filter(Boolean) : [];
      for (const f of conds) assert.ok(f in FLAGS, `${map}: ${f}`);
      const impliesBram = conds.some((f) => ['bram_joined', 'archivore_defeated', 'found_thirteenth_bell', 'lantern_get'].includes(f));
      const impliesMira = impliesBram || conds.includes('mira_joined');
      for (const l of e.lines) {
        assert.ok(fits(l.text), `${map}: ${l.text}`);
        if (l.who === 'mira') assert.ok(impliesMira, `${map}: Mira may not have joined`);
        if (l.who === 'bram') assert.ok(impliesBram, `${map}: Bram may not have joined`);
        assert.ok(['mira', 'bram'].includes(l.who), `${map}: speaker ${l.who}`);
      }
    }
  }
  const flags = new Set(['intro_done', 'met_mael', 'mira_joined', 'bram_joined']);
  assert.ok(partyChat((f) => flags.has(f), 'valley').banter.length >= 1);
  assert.deepEqual(partyChat(() => false, 'valley').banter, [], 'nobody to banter with yet');
});
