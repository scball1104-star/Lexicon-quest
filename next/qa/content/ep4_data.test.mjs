// Episode 4 pack data (E4-story): flags, the Valewyn cast and the returning-cast lines, the main quest and its Talk, the
// side quests, banners, inspect lines, books, barks, bestiary, credits and end cards, the Ledger rows. Each module
// registers twice without duplicates, an old scene is never hidden behind an Episode 4 line, and the struck name stays
// struck in every line before lyra_named.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as NPCMOD from '../../src/data/npcs.js';
import * as Q from '../../src/data/quests.js';
import { BANNERS, BOOKS, BARKS, BESTIARY } from '../../src/data/text.js';
import { LEDGER, PLACES, REACHED, ledgerRows } from '../../src/data/ledger.js';
import * as STORY from '../../src/game/story.js';
import { fits, boxLines, resolve } from '../../src/data/story/dialogue.js';
import { EP4_FLAGS, EP4_MAPS, register as regFlags } from '../../src/data/ep4/flags.js';
import { EP4_NPCS, EP4_TALK_PREPEND, EP4_SPEAKERS, register as regNpcs } from '../../src/data/ep4/npcs.js';
import { MAIN_QUEST_EP4, SIDE_QUESTS_EP4, BANTER_EP4, TALK_OPENER_EP4, QUEST_EXT_ENTRY, REWARDS_EP4, register as regQuests } from '../../src/data/ep4/quests.js';
import { EP4_BANNERS, EP4_LINES, EP4_BOOKS, EP4_BARKS, EP4_BESTIARY, CREDITS_EP4, END_CARD_EP4, END_CARD_EP3_LIVE, EPISODE5_CARD,
  EP4_BATTLE_TEXT, register as regText } from '../../src/data/ep4/text.js';
import { EP4_LEDGER, register as regLedger } from '../../src/data/ep4/ledger.js';
import { scenes } from '../../src/data/ep4/story.js';

const { NPCS, SPEAKER_NAMES, talkTo, prependTalk } = NPCMOD;
const { FLAGS, FLAG_IDS, ALL_SIDE_QUESTS, BANTER, TALK_PREPEND, pickChat, currentStep } = Q;
const PARTY = ['hero', 'mira', 'bram'];
const ascii = (s) => /^[\x20-\x7e]*$/.test(s);
const flagsOf = (e) => [e?.if, e?.ifNot].flat().filter(Boolean);
const KNOWN = (f) => f in FLAGS || f === 'tier_1';

// Every talk result that is a scene, for a bounded set of flag states, BEFORE the pack prepends anything.
const RETURNING = Object.keys(EP4_TALK_PREPEND);
const statesFor = (id) => {
  const pool = new Set(['ep4_started', 'ep4_complete', 'vw_restored', 'east_road_open']);
  for (const e of NPCS[id]?.talk || []) for (const f of flagsOf(e)) pool.add(f);
  const list = [...pool];
  const out = [];
  let seed = 7;
  for (let k = 0; k < 160; k++) {
    const st = new Set();
    for (const f of list) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; if (seed % 3 === 0) st.add(f); }
    out.push(st);
  }
  return out;
};
const BEFORE = {};
for (const id of RETURNING) {
  if (!NPCS[id]) continue;
  BEFORE[id] = statesFor(id).map((st) => ({ st, r: talkTo(id, (f) => st.has(f)) }));
}

// Register everything twice (idempotence), as the pack entry may retry.
for (let i = 0; i < 2; i++) { regFlags(); regNpcs(); regQuests({ ep4Live: true }); regText(); regLedger({ ep4Live: true }); }

test('flags: every plan 2.2 flag declared with a meaning, pushed once onto FLAG_IDS', () => {
  const plan = ['ep4_started', 'east_road_open', 'flood_road_arrived', 'flood_first_fight_done', 'vw_arrived', 'met_regent', 'met_joss',
    'keep_ferry_open', 'keep_entered', 'keep_f1_done', 'barrister_defeated', 'keep_f2_done', 'vex_archive_met', 'petition_gate_open',
    'hero_signed', 'paper_regent_defeated', 'lyra_named', 'charter_restored', 'tide_bell_rung', 'vw_restored', 'ep4_complete',
    'ep4_morning_done', 'saw_flood_lane', 'ferry_rested', 'saw_valewyn', 'saw_statue', 'keep_f1_arrived', 'keep_f2_arrived',
    'keep_f3_arrived', 'lyra_memory_1', 'lyra_memory_2', 'lyra_memory_3', 'principle_voice', 'principle_truth', 'principle_mercy',
    'seal_key_found', 'fragment4_get', 'lyra_truth', 'lyra_kind', 'tidegate_open', 'witnesses_started', 'testimony_hale',
    'testimony_dorian', 'testimony_joss', 'council_shelter', 'council_records', 'witnesses_done', 'coffer_found', 'nilo_started',
    'nilo_bell_found', 'nilo_done'];
  for (const f of plan) assert.ok(EP4_FLAGS[f] && EP4_FLAGS[f].length > 10, `flag ${f}`);
  for (const f of Object.keys(EP4_FLAGS)) {
    assert.equal(FLAG_IDS.filter((x) => x === f).length, 1, `${f} once in FLAG_IDS`);
    assert.ok(!Object.keys(Q.EP3_FLAGS).includes(f) && !Object.keys(Q.EP2_FLAGS).includes(f), `${f} is an Episode 2 or 3 flag`);
  }
});

test('the Valewyn cast: records, sprites, stages, the Regent as two records, scenes exist', () => {
  for (const id of ['regent_e', 'lyra_n', 'hale', 'nilo', 'dorian', 'joss', 'ada', 'vance', 'linn', 'sori']) assert.equal(NPCS[id], EP4_NPCS[id], id);
  assert.equal(NPCS.ada.sprite, 'npc_courier_v');
  assert.equal(NPCS.regent_e.name, 'The Regent');
  assert.equal(NPCS.lyra_n.name, 'Lyra');
  for (const id of ['regent_e', 'lyra_n']) assert.equal(NPCS[id].portrait, 'lyra');   // E4-fixes-B's aged portrait (ep4_portraits.json)
  assert.deepEqual(NPCS.regent_e.show, { if: 'vw_arrived', ifNot: 'lyra_named' });
  assert.deepEqual(NPCS.lyra_n.show, { if: 'lyra_named' });
  for (const [id, rec] of Object.entries(EP4_NPCS)) {
    assert.ok(EP4_MAPS.includes(rec.map), `${id}: map ${rec.map}`);
    const last = rec.talk.at(-1);
    assert.ok(!last.if && !last.ifNot && last.lines, `${id}: ends on a fallback`);
    for (const e of rec.talk) {
      for (const f of flagsOf(e)) assert.ok(KNOWN(f), `${id}: flag ${f}`);
      if (e.scene) assert.ok(scenes[e.scene], `${id}: scene ${e.scene}`);
    }
  }
  const stages = new Set(Object.values(EP4_NPCS).flatMap((r) => r.talk.flatMap(flagsOf)));
  for (const f of ['vw_arrived', 'keep_f2_done', 'vw_restored', 'ep4_complete']) assert.ok(stages.has(f), `stage ${f}`);
  for (const [id, n] of Object.entries(EP4_SPEAKERS)) assert.equal(SPEAKER_NAMES[id], n);
});

test('every NPC and returning-cast line fits a box, is ASCII, and says Lyra only from lyra_named on', () => {
  const NAMED = ['lyra_named', 'vw_restored', 'ep4_complete'];
  const bad = [];
  const check = (where, e) => {
    for (const l of [e.lines].flat().filter(Boolean)) {
      const t = typeof l === 'string' ? l : l.text;
      if (!fits(t)) bad.push(`${where}: ${boxLines(t).join(' / ')}`);
      if (!ascii(t)) bad.push(`${where}: non-ASCII`);
      if (/\bLyra\b/.test(t) && !NAMED.some((f) => [e.if].flat().includes(f)) && where !== 'lyra_n') bad.push(`${where}: Lyra before the name`);
      if (typeof l === 'object') assert.ok(l.who === null || PARTY.includes(l.who), `${where}: who ${l.who}`);
    }
  };
  for (const [id, rec] of Object.entries(EP4_NPCS)) for (const e of rec.talk) check(id, e);
  for (const [id, list] of Object.entries(EP4_TALK_PREPEND)) for (const e of list) check(id, e);
  assert.deepEqual(bad, []);
  for (const id of ['garrick_n', 'ilya', 'sella', 'veyra', 'rusk', 'bess', 'holt']) assert.ok(EP4_TALK_PREPEND[id], `returning ${id}`);
  for (const [id, list] of Object.entries(EP4_TALK_PREPEND)) {
    assert.ok(list.some((e) => [e.if].flat().includes('ep4_started')), `${id}: an Episode 4 start line`);
    assert.ok(list.some((e) => [e.if].flat().includes('ep4_complete')), `${id}: an after line`);
  }
});

test('returning-cast lines answer in Episode 4 and never hide an Episode 1 to 3 scene', () => {
  for (const id of Object.keys(BEFORE)) {
    for (const { st, r } of BEFORE[id]) {
      const now = talkTo(id, (f) => st.has(f));
      if (r && r.scene) assert.deepEqual(now, r, `${id}: a scene was hidden for ${[...st].join(',')}`);
      if (!st.has('ep4_started') && !st.has('ep4_complete')) assert.deepEqual(now, r, `${id}: changed before Episode 4`);
    }
  }
  const has = (...f) => (x) => f.includes(x);
  assert.match(talkTo('holt', has('ep4_started')).lines[0].text, /letter from Bram/);
  assert.match(talkTo('holt', has('ep4_started', 'ep4_complete')).lines[0].text, /Lyra/);
  assert.match(talkTo('rusk', has('ep4_started')).lines[0].text, /washout/);
  // registered twice: still one copy of each prepended entry
  const before = NPCS.holt.talk.length;
  regNpcs();
  assert.equal(NPCS.holt.talk.length, before);
  assert.equal(prependTalk('holt', []), 0);
});

test('Episode 4 main quest: steps in order, journal and aims fit, Talk names the next step on every map', () => {
  assert.deepEqual(MAIN_QUEST_EP4.steps.map((s) => s.id), ['flood_road', 'valewyn', 'keep_f1', 'keep_f2', 'keep_f3', 'regent', 'crown', 'epilogue4']);
  assert.deepEqual(QUEST_EXT_ENTRY, ['ep4_started', MAIN_QUEST_EP4]);
  if (Array.isArray(Q.QUEST_EXT)) assert.equal(Q.QUEST_EXT.filter((e) => e[1] === MAIN_QUEST_EP4).length, 1);
  const voices = new Set();
  for (const st of MAIN_QUEST_EP4.steps) {
    assert.ok(fits(st.journal) && ascii(st.journal), `${st.id}: journal`);
    assert.ok(st.aim.length <= 32, `${st.id}: aim`);
    for (const f of [st.done, st.aimIf?.if].flat().filter(Boolean)) assert.ok(KNOWN(f), `${st.id}: ${f}`);
    const last = st.chat.at(-1);
    assert.ok(!last.map && !last.if && !last.ifNot, `${st.id}: Talk ends on a fallback`);
    for (const e of st.chat) {
      for (const f of flagsOf(e)) assert.ok(KNOWN(f), `${st.id}: chat flag ${f}`);
      for (const l of e.lines) { assert.ok(fits(l.text) && ascii(l.text), `${st.id}: ${l.text}`); voices.add(l.who); assert.ok(!/\bLyra\b/.test(l.text) || ['crown', 'epilogue4'].includes(st.id), `${st.id}: Lyra`); }
    }
    for (const map of EP4_MAPS) assert.ok(pickChat(st.chat, () => false, map), `${st.id}: no Talk on ${map}`);
  }
  assert.ok(voices.has('mira') && voices.has('bram'));
  // the epilogue names something doable after ep4_complete on every Valewyn map
  const done = new Set(['ep4_complete', 'council_shelter']);
  const ep = MAIN_QUEST_EP4.steps.at(-1);
  assert.match(pickChat(ep.chat, (f) => done.has(f), 'ep4_valewyn').lines[0].text, /switch/);
  // the step follows the flags
  const flags = new Set(['ep4_started', 'vw_arrived']);
  assert.equal(currentStep((f) => flags.has(f), MAIN_QUEST_EP4).id, 'valewyn');
  flags.add('met_regent');
  const vs = currentStep((f) => flags.has(f), MAIN_QUEST_EP4);
  assert.equal(Q.aimFor(vs, (f) => flags.has(f)), 'Find Joss the Lockwright');
});

test('while EP4_LIVE, Talk points an Episode 3 finisher at the east road; never a Fine Print run, never once started', () => {
  assert.equal(TALK_PREPEND.filter((e) => e === TALK_OPENER_EP4).length, 1);
  const has = (...f) => (x) => f.includes(x);
  assert.ok(pickChat([TALK_OPENER_EP4], has('ep3_complete'), 'emberpeak'));
  assert.equal(pickChat([TALK_OPENER_EP4], has('ep3_complete', 'ep4_started'), 'emberpeak'), null);
  assert.equal(pickChat([TALK_OPENER_EP4], has('ep3_complete', 'tier_1'), 'emberpeak'), null);
  assert.match(TALK_OPENER_EP4.lines[1].text, /east road/);
});

test('side quests: givers, rewards, counters, journal and Talk fallbacks; pushed once', () => {
  assert.deepEqual(SIDE_QUESTS_EP4.map((q) => q.id), ['three_witnesses', 'public_coffer', 'nilo_bell']);
  for (const q of SIDE_QUESTS_EP4) {
    assert.equal(ALL_SIDE_QUESTS.filter((x) => x === q).length, 1, `${q.id} once`);
    assert.ok(NPCS[q.giver], `${q.id}: giver ${q.giver}`);
    for (const f of [q.start, q.done]) assert.ok(KNOWN(f), `${q.id}: ${f}`);
    for (const st of q.steps) {
      assert.ok(fits(st.journal), `${q.id}.${st.id}: journal`);
      const last = st.chat.at(-1);
      assert.ok(!last.map && !last.if && !last.ifNot, `${q.id}.${st.id}: fallback`);
      for (const e of st.chat) for (const l of e.lines) assert.ok(fits(l.text) && ascii(l.text), l.text);
    }
  }
  assert.equal(REWARDS_EP4.witnesses.item, 'tidewalker_mantle');
  assert.equal(REWARDS_EP4.nilo.item, 'ferrymans_charm');
  assert.equal(REWARDS_EP4.coffer.gold, 190);
  for (const [map, list] of Object.entries(BANTER_EP4)) {
    assert.equal(BANTER[map], list, `banter ${map}`);
    for (const e of list) for (const l of e.lines) assert.ok(fits(l.text) && ascii(l.text), l.text);
  }
});

test('text: 10 banners (Valewyn conditional), 3 books, 4 barks, 12 bestiary entries, credits and cards fit', () => {
  assert.equal(Object.keys(EP4_BANNERS).length, 10);
  for (const m of EP4_MAPS) assert.equal(BANNERS[m], EP4_BANNERS[m], m);
  assert.equal(STORY.bannerFor('ep4_valewyn', null, (f) => f === 'vw_restored').sub, 'The Crown Remembers');
  assert.equal(STORY.bannerFor('ep4_valewyn', null, () => false).sub, 'The Drowned Crown Plaza');
  for (const id of ['vw_records', 'keep_ledger', 'tide_log']) {
    assert.equal(BOOKS[id], EP4_BOOKS[id]);
    for (const p of EP4_BOOKS[id].pages) assert.ok(fits(p) && ascii(p), p);
  }
  for (const id of ['first_tide', 'first_wash', 'first_float', 'first_true_ink']) {
    assert.equal(BARKS[id], EP4_BARKS[id]);
    const g = { counters: {} };
    const boxes = STORY.takeBark(g, id, (f) => ['ep4_started', 'mira_joined', 'bram_joined'].includes(f));
    assert.equal(boxes.length, 1, id);
    assert.equal(STORY.takeBark(g, id, () => true).length, 0, `${id} once`);
  }
  const foes = ['flood_hound', 'lockjaw_crab', 'ink_bloom', 'drowned_watch', 'gutter_phantom', 'blank_decree', 'waterlogged_sentinel',
    'barrister', 'barrister_witness', 'paper_regent', 'writ_silence', 'writ_oblivion'];
  assert.deepEqual(Object.keys(EP4_BESTIARY), foes);
  for (const id of foes) {
    assert.equal(BESTIARY[id], EP4_BESTIARY[id]);
    assert.equal(EP4_BESTIARY[id].lore.length, 3);
    for (const l of EP4_BESTIARY[id].lore) assert.ok(fits(l) && ascii(l), `${id}: ${l}`);
  }
  for (const c of CREDITS_EP4) for (const l of [c.heading, ...c.lines]) assert.ok(l.length <= 42 && ascii(l), `credit ${l}`);
  for (const s of [END_CARD_EP4.text, END_CARD_EP4.sub, END_CARD_EP3_LIVE.sub, EPISODE5_CARD.text, EPISODE5_CARD.sub]) assert.ok(s.length <= 42 && ascii(s), s);
  assert.equal(END_CARD_EP4.sub, 'Episode 5 is not playable yet.');
  assert.equal(END_CARD_EP3_LIVE.sub, 'Episode 4 begins in the morning.');
  for (const t of Object.values(EP4_BATTLE_TEXT)) assert.ok(t.length <= 60 && ascii(t));
  assert.ok(EP4_BATTLE_TEXT.answer_help.length <= 40);
});

test('inspect lines: registered, fit, declared flags, a fallback last, and no struck name before lyra_named', () => {
  for (const [id, v] of Object.entries(EP4_LINES)) {
    assert.equal(STORY.LINES[id], v, `${id} registered`);
    const walk = (x, cond) => {
      if (typeof x === 'string') {
        assert.ok(fits(x) && ascii(x), `${id}: ${boxLines(x).join(' / ')}`);
        assert.ok(!/\bLyra\b/.test(x) || [cond].flat().some((f) => ['lyra_named', 'vw_restored'].includes(f)), `${id}: Lyra`);
        return;
      }
      assert.ok(Array.isArray(x) && x.length, `${id}: empty`);
      if (x.every((e) => typeof e === 'string')) { x.forEach((e) => walk(e, cond)); return; }
      const last = x.at(-1);
      assert.ok(!last.if && !last.ifNot, `${id}: ends on a fallback`);
      for (const e of x) { for (const f of flagsOf(e)) assert.ok(KNOWN(f), `${id}: ${f}`); walk(e.lines, e.if); }
    };
    walk(v, null);
    assert.ok(resolve(v, () => false, null).length >= 1);
  }
  assert.ok(Object.keys(EP4_LINES).length >= 35, `inspect lines: ${Object.keys(EP4_LINES).length}`);
});

test('the Ledger: Valewyn rows counted only when live, reached at vw_arrived, the Regent hidden until named', () => {
  assert.equal(PLACES.valewyn, 'Valewyn');
  assert.equal(REACHED.valewyn, 'vw_arrived');
  for (const r of EP4_LEDGER) { assert.equal(LEDGER.filter((x) => x.id === r.id).length, 1, r.id); assert.ok(KNOWN(r.flag), r.flag); }
  const rows = (flags) => ledgerRows(new Set(flags).has.bind(new Set(flags)), { all: false }).filter((x) => x.place === 'valewyn');
  assert.equal(rows(['ep3_complete']).length, 0, 'not reached');
  const met = rows(['vw_arrived', 'ep4_morning_done']);
  assert.equal(met.find((x) => x.id === 'lyra').name, '???');
  assert.ok(met.find((x) => x.id === 'ada').kept);
  assert.equal(rows(['vw_arrived', 'lyra_named']).find((x) => x.id === 'lyra').name, 'Lyra');
  for (const r of EP4_LEDGER) assert.ok(r.why.length <= 80 && ascii(r.why), r.why);
});

test('the pack modules export register(), stay inside src/data/ep4, and the main quest is not reachable from core alone', async () => {
  for (const name of ['flags', 'npcs', 'quests', 'text', 'story', 'ledger']) {
    const mod = await import(`../../src/data/ep4/${name}.js`);
    assert.equal(typeof mod.register, 'function', name);
    assert.equal(mod.default, mod.register, `${name} default export`);
  }
  // A save that never started Episode 4 still follows Episode 3's quest.
  assert.equal(Q.mainQuestFor((f) => ['ep3_started', 'ep3_complete'].includes(f)).id, 'main_ep3');
});
