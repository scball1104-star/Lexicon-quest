// Episode 6 pack data (E6-story): flags, the Zephyr Landing cast and the returning-cast lines, the main quest and its Talk,
// the side quests, banners, inspect lines, books, barks, bestiary, battle lines, credits and end cards, the Ledger rows.
// Each module registers twice without duplicates (the pack entry may retry), an old scene is never hidden behind an
// Episode 6 line, nothing new answers before Episode 6 starts, and the late name stays unsaid before its flag.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import * as NPCMOD from '../../src/data/npcs.js';
import * as Q from '../../src/data/quests.js';
import { BANNERS, BOOKS, BARKS, BESTIARY } from '../../src/data/text.js';
import { LEDGER, PLACES, REACHED, EXCLUDED, ledgerRows } from '../../src/data/ledger.js';
import * as STORY from '../../src/game/story.js';
import { fits, boxLines, resolve } from '../../src/data/story/dialogue.js';
import { register as regEp4Flags } from '../../src/data/ep4/flags.js';
import { register as regEp4Npcs } from '../../src/data/ep4/npcs.js';
import { register as regEp4Quests } from '../../src/data/ep4/quests.js';
import { register as regEp5Flags } from '../../src/data/ep5/flags.js';
import { register as regEp5Npcs } from '../../src/data/ep5/npcs.js';
import { register as regEp5Quests, MAIN_QUEST_EP5 } from '../../src/data/ep5/quests.js';
import { compoundTerms, withCompound } from '../../src/data/ep4/field/seams.js';
import { EP6_FLAGS, EP6_MAPS, register as regFlags } from '../../src/data/ep6/flags.js';
import { EP6_NPCS, EP6_TALK_PREPEND, EP6_SPEAKERS, AERIS_AWAY, register as regNpcs } from '../../src/data/ep6/npcs.js';
import { MAIN_QUEST_EP6, SIDE_QUESTS_EP6, BANTER_EP6, TALK_OPENER_EP6, TALK_OPENER_EP6_FAR, MORNING_HOLD, QUEST_EXT_ENTRY, REWARDS_EP6,
  register as regQuests } from '../../src/data/ep6/quests.js';
import { EP6_BANNERS, EP6_LINES, EP6_BOOKS, EP6_BARKS, EP6_BESTIARY, EP6_BATTLE_TEXT, EP6_BOSS_CARDS, EP6_ARC_LINES, CREDITS_EP6,
  END_CARD_EP6, END_CARD_EP5_LIVE, EPISODE7_CARD, END_TITLE_EP6, register as regText } from '../../src/data/ep6/text.js';
import { EP6_LEDGER, register as regLedger } from '../../src/data/ep6/ledger.js';
import { scenes } from '../../src/data/ep6/story.js';
import { NEXT } from './_harness.mjs';

const { NPCS, SPEAKER_NAMES, talkTo, prependTalk } = NPCMOD;
const { FLAGS, FLAG_IDS, ALL_SIDE_QUESTS, BANTER, TALK_PREPEND, pickChat, currentStep } = Q;
const PARTY = ['hero', 'mira', 'bram'];
const ascii = (s) => /^[\x20-\x7e]*$/.test(s);
const flagsOf = (e) => [e?.if, e?.ifNot].flat().filter(Boolean);
const termsOf = (f) => (compoundTerms(f) || [[f, true]]).map(([x]) => x);
const KNOWN = (f) => termsOf(f).every((x) => x in FLAGS || x === 'tier_1');
const HAVEN = ['ep5_saffron', 'ep5_sh_inn', 'ep5_sh_shop', 'ep5_sh_smithy', 'ep5_sh_observatory'];
const ZL = ['ep6_zephyr', 'ep6_zl_inn', 'ep6_zl_shop', 'ep6_zl_workshop', 'ep6_zl_charts'];
const PIPPA_OK = ['pippa_found', 'pippa_home', 'isles_restored', 'ep6_complete', 'wind_script_restored', 'library_reached'];

// The ep4 and ep5 packs register first in the game (index.js: ensureEp5), so their NPCs and their prepends are already in.
regEp4Flags(); regEp4Npcs(); regEp4Quests({ ep4Live: true });
regEp5Flags(); regEp5Npcs(); regEp5Quests({ ep5Live: true });

// Every talk result that is a scene, for a bounded set of flag states, BEFORE the ep6 pack prepends anything.
const RETURNING = Object.keys(EP6_TALK_PREPEND);
const statesFor = (id) => {
  const pool = new Set(['ep5_started', 'ep5_complete', 'haven_arrived', 'haven_restored', 'roads_started', 'ep6_started', 'ep6_complete',
    'ep6_boarded']);
  for (const e of NPCS[id]?.talk || []) for (const f of flagsOf(e)) for (const x of termsOf(f)) pool.add(x);
  const list = [...pool];
  const out = [];
  let seed = 13;
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
  BEFORE[id] = statesFor(id).map((st) => ({ st, r: talkTo(id, withCompound((f) => st.has(f))) }));
}

// Register everything twice (idempotence), as the pack entry may retry.
for (let i = 0; i < 2; i++) { regFlags(); regNpcs(); regQuests({ ep6Live: true }); regText(); regLedger({ ep6Live: true }); }

test('flags: every plan 2.2 flag declared with a meaning, pushed once onto FLAG_IDS, none from an earlier episode', async () => {
  const plan = ['ep6_started', 'ep6_boarded', 'airstair_arrived', 'airstair_fight_done', 'zephyr_arrived', 'met_aeris', 'charts_seen',
    'anchor_learned', 'windward_pass', 'obs_entered', 'obs_f1_done', 'vex_relay_met', 'engine_defeated', 'obs_f2_done', 'aeris_came',
    'vex_held', 'asker_known', 'pippa_found', 'scribe_door_open', 'scribe_defeated', 'wind_script_restored', 'fragment6_get',
    'compass_restored', 'library_reached', 'first_page_read', 'isles_restored', 'pippa_home', 'ep6_complete', 'ep6_morning_done',
    'mira_asked', 'mira_told', 'mira_spared', 'saw_gust', 'saw_isles', 'liora_met', 'obs_f1_arrived', 'obs_f2_arrived', 'obs_f3_arrived',
    'aeris_memory_1', 'aeris_memory_2', 'pledge_anchor', 'pledge_listen', 'pledge_return', 'compass_key_found', 'sixth_list_get',
    'told_aeris', 'kept_from_aeris', 'beacon_started', 'testimony_liora', 'testimony_bennet', 'testimony_suri', 'beacon_lit',
    'beacon_done', 'log_1_found', 'log_2_found', 'log_3_found', 'locker_found', 'letters_started', 'letter_1_found', 'letter_2_found',
    'letter_3_found', 'letters_done', 'white_road_letter_get'];
  for (const f of plan) assert.ok(EP6_FLAGS[f] && EP6_FLAGS[f].length > 10, `flag ${f}`);
  const { EP5_FLAGS } = await import('../../src/data/ep5/flags.js');
  const { EP4_FLAGS } = await import('../../src/data/ep4/flags.js');
  const earlier = new Set([...Object.keys(Q.EP2_FLAGS), ...Object.keys(Q.EP3_FLAGS), ...Object.keys(EP5_FLAGS), ...Object.keys(EP4_FLAGS || {})]);
  for (const f of Object.keys(EP6_FLAGS)) {
    assert.equal(FLAG_IDS.filter((x) => x === f).length, 1, `${f} once in FLAG_IDS`);
    assert.ok(!earlier.has(f), `${f} is an earlier episode's flag`);
    assert.ok(ascii(EP6_FLAGS[f]), `${f}: ASCII`);
    assert.ok(!/^(oath_|landing_|sel_memory_|sky_|orrery|star_\w+_read|updraft)/.test(f), `${f}: a taken prefix`);
  }
  assert.ok(!('credits6_rolled' in EP6_FLAGS), 'credits6_rolled is a counter, not a flag');
  assert.deepEqual(EP6_MAPS, ['ep6_airstair', 'ep6_zephyr', 'ep6_zl_inn', 'ep6_zl_shop', 'ep6_zl_workshop', 'ep6_zl_charts',
    'ep6_obs_f1', 'ep6_obs_f2', 'ep6_obs_f3', 'ep6_obs_eyrie', 'ep6_library']);
});

test('the Zephyr Landing cast: records, maps, stages, Aeris away on the spire, scenes exist, no portrait aliases', () => {
  for (const id of ['aeris', 'liora', 'bennet', 'suri', 'ilex', 'nova', 'piri', 'thea', 'ep6_innkeeper', 'pippa']) assert.equal(NPCS[id], EP6_NPCS[id], id);
  for (const [id, rec] of Object.entries(EP6_NPCS)) {
    assert.ok(EP6_MAPS.includes(rec.map), `${id}: map ${rec.map}`);
    assert.ok(!rec.portrait, `${id}: no portrait (plan 9.5)`);
    const last = rec.talk.at(-1);
    assert.ok(!last.if && !last.ifNot && last.lines, `${id}: ends on a fallback`);
    for (const e of rec.talk) {
      for (const f of flagsOf(e)) assert.ok(KNOWN(f), `${id}: flag ${f}`);
      if (e.scene) assert.ok(scenes[e.scene], `${id}: scene ${e.scene}`);
    }
    for (const f of flagsOf(rec.show)) assert.ok(KNOWN(f), `${id}: show ${f}`);
  }
  const stages = new Set(Object.values(EP6_NPCS).flatMap((r) => r.talk.flatMap(flagsOf)));
  for (const f of ['zephyr_arrived', 'charts_seen', 'obs_f2_done', 'isles_restored', 'ep6_complete']) assert.ok(stages.has(f), `stage ${f}`);
  for (const [id, n] of Object.entries(EP6_SPEAKERS)) assert.equal(SPEAKER_NAMES[id], n);
  assert.equal(NPCS.ep6_innkeeper.service.price, 120);
  assert.deepEqual([NPCS.bennet_winch.service.id, NPCS.nova.service.id, NPCS.ilex.service.id], ['winch', 'aeris_provisions', 'galewing']);
  const shown = (id, ...f) => NPCMOD.isPresent(id, withCompound((x) => f.includes(x)));
  assert.equal(AERIS_AWAY, 'all:aeris_came,!library_reached');
  assert.ok(shown('aeris', 'zephyr_arrived') && !shown('aeris', 'aeris_came') && shown('aeris', 'aeris_came', 'library_reached'));
  assert.ok(!shown('pippa', 'pippa_found') && shown('pippa', 'pippa_home'));
  const has = (...f) => (x) => f.includes(x);
  assert.deepEqual(talkTo('liora', has('zephyr_arrived')), { scene: 'liora_dock' });
  assert.deepEqual(talkTo('aeris', has('zephyr_arrived')), { scene: 'meet_aeris' });
  assert.deepEqual(talkTo('suri', has('zephyr_arrived', 'charts_seen')), { scene: 'beacon_start' });
  assert.deepEqual(talkTo('liora', has('zephyr_arrived', 'liora_met', 'beacon_started')), { scene: 'testimony_liora' });
  assert.deepEqual(talkTo('bennet', has('zephyr_arrived', 'beacon_started')), { scene: 'testimony_bennet' });
  assert.deepEqual(talkTo('piri', has('zephyr_arrived')), { scene: 'letters_start' });
  assert.deepEqual(talkTo('piri', has('zephyr_arrived', 'letters_started', 'letter_1_found', 'letter_2_found', 'letter_3_found')), { scene: 'letters_done' });
});

test('every NPC and returning-cast line fits a box, is ASCII, and says Pippa only after her flags', () => {
  const bad = [];
  const check = (where, e) => {
    for (const l of [e.lines].flat().filter(Boolean)) {
      const t = typeof l === 'string' ? l : l.text;
      if (!fits(t)) bad.push(`${where}: ${boxLines(t).join(' / ')}`);
      if (!ascii(t)) bad.push(`${where}: non-ASCII`);
      if (/\bPippa\b/.test(t) && !(where === 'pippa' || [e.if].flat().some((f) => PIPPA_OK.includes(f)))) bad.push(`${where}: Pippa early`);
      if (typeof l === 'object') assert.ok(l.who === null || PARTY.includes(l.who), `${where}: who ${l.who}`);
    }
  };
  for (const [id, rec] of Object.entries(EP6_NPCS)) for (const e of rec.talk) check(id, e);
  for (const [id, list] of Object.entries(EP6_TALK_PREPEND)) for (const e of list) check(id, e);
  assert.deepEqual(bad, []);
  for (const id of ['sel', 'laleh', 'kamal', 'yara', 'lyra_n', 'hale', 'ada', 'joss', 'garrick_n', 'rusk', 'bess', 'ilya', 'wren', 'elian', 'holt', 'hazel']) {
    assert.ok(EP6_TALK_PREPEND[id], `returning ${id}`);
  }
  for (const [id, list] of Object.entries(EP6_TALK_PREPEND)) {
    assert.ok(NPCS[id], `${id} is a real NPC`);
    assert.ok(list.some((e) => [e.if].flat().includes('ep6_started')), `${id}: an Episode 6 start line`);
    assert.ok(list.some((e) => [e.if].flat().includes('ep6_complete')), `${id}: an after line`);
  }
  // the bible's lines, word for word
  const first = (id, f) => EP6_TALK_PREPEND[id].find((e) => [e.if].flat().includes(f)).lines[0];
  assert.equal(first('holt', 'ep6_started'), "Bram's letter says he's going up a chain to an island in the sky. I've read it four times. It still says that.");
  assert.equal(first('holt', 'ep6_complete'), "Letter from Bram. Says he held on to somebody. Says he didn't think. That's my boy.");
  assert.equal(first('sel', 'ep6_started'), "I'm staying. Twenty years of walking to catch up on, and all of it's down here.");
  assert.equal(first('laleh', 'ep6_started'), 'The reading still says a road. I check every night.');
  assert.equal(first('kamal', 'ep6_started'), "The water's still. That's the best thing water can be.");
  assert.equal(first('yara', 'ep6_started'), "Water stairs. I'll have her ready.");
});

test('returning-cast lines answer in Episode 6 and never hide an Episode 1 to 5 scene; nothing changes before Episode 6', () => {
  for (const id of Object.keys(BEFORE)) {
    for (const { st, r } of BEFORE[id]) {
      const now = talkTo(id, withCompound((f) => st.has(f)));
      if (r && r.scene) assert.deepEqual(now, r, `${id}: a scene was hidden for ${[...st].join(',')}`);
      if (!st.has('ep6_started') && !st.has('ep6_complete') && !st.has('ep6_boarded')) assert.deepEqual(now, r, `${id}: changed before Episode 6`);
    }
  }
  const has = (...f) => (x) => f.includes(x);
  assert.match(talkTo('holt', has('ep6_started')).lines[0].text, /up a chain/);
  assert.match(talkTo('holt', has('ep6_started', 'ep6_complete')).lines[0].text, /held on to somebody/);
  assert.match(talkTo('sel', has('ep5_complete', 'ep6_started')).lines[0].text, /I'm staying/);
  assert.match(talkTo('yara', withCompound(has('haven_arrived', 'ep5_complete', 'ep6_started'))).lines[0].text, /Water stairs/);
  const joss = talkTo('joss', has('ep4_complete', 'ep6_started')).lines;
  assert.deepEqual(joss.map((l) => l.who), ['joss', 'bram', 'joss']);
  const before = NPCS.holt.talk.length;
  regNpcs();
  assert.equal(NPCS.holt.talk.length, before);
  assert.equal(prependTalk('holt', []), 0);
});

test('Episode 6 main quest: steps in order, journal and aims fit, Talk names the next step on every map, ahead of Episode 5', () => {
  assert.deepEqual(MAIN_QUEST_EP6.steps.map((s) => s.id), ['crossing', 'airstair', 'zephyr', 'obs_f1', 'obs_f2', 'obs_f3', 'scribe', 'library', 'epilogue6']);
  assert.deepEqual(QUEST_EXT_ENTRY, ['ep6_started', MAIN_QUEST_EP6]);
  assert.equal(Q.QUEST_EXT.filter((e) => e[0] === 'ep6_started').length, 1);
  assert.ok(Q.QUEST_EXT.findIndex((e) => e[0] === 'ep6_started') < Q.QUEST_EXT.findIndex((e) => e[0] === 'ep5_started'), 'ahead of Episode 5');
  const voices = new Set();
  for (const st of MAIN_QUEST_EP6.steps) {
    assert.ok(fits(st.journal) && ascii(st.journal), `${st.id}: journal`);
    assert.ok(st.aim.length <= 32 && (!st.aimIf || st.aimIf.aim.length <= 32), `${st.id}: aim`);
    for (const f of [st.done, st.aimIf?.if].flat().filter(Boolean)) assert.ok(KNOWN(f), `${st.id}: ${f}`);
    const last = st.chat.at(-1);
    assert.ok(!last.map && !last.if && !last.ifNot, `${st.id}: Talk ends on a fallback`);
    for (const e of st.chat) {
      for (const f of flagsOf(e)) assert.ok(KNOWN(f), `${st.id}: chat flag ${f}`);
      for (const l of e.lines) {
        assert.ok(fits(l.text) && ascii(l.text), `${st.id}: ${l.text}`);
        voices.add(l.who);
        if (/\bPippa\b/.test(l.text)) assert.equal(st.id, 'epilogue6', `${st.id}: the late name in Talk`);
      }
    }
    for (const map of [...EP6_MAPS, ...HAVEN]) assert.ok(pickChat(st.chat, () => false, map), `${st.id}: no Talk on ${map}`);
  }
  assert.ok(voices.has('mira') && voices.has('bram'));
  const f6 = new Set(['ep4_started', 'ep4_complete', 'ep5_started', 'ep5_complete', 'ep6_started']);
  assert.equal(Q.mainQuestFor((f) => f6.has(f)).id, 'main_ep6');
  assert.equal(Q.mainQuestFor((f) => ['ep5_started', 'ep5_complete'].includes(f)), MAIN_QUEST_EP5, 'Episode 5 unchanged');
  const flags = new Set(['ep6_started', 'airstair_arrived', 'zephyr_arrived', 'met_aeris', 'charts_seen', 'anchor_learned']);
  assert.equal(currentStep((f) => flags.has(f), MAIN_QUEST_EP6).id, 'zephyr');
  flags.add('windward_pass');
  assert.equal(Q.aimFor(currentStep((f) => flags.has(f), MAIN_QUEST_EP6), (f) => flags.has(f)), 'Take the east airstair');
  // the hints name the action
  const st = (id) => MAIN_QUEST_EP6.steps.find((x) => x.id === id);
  const hint = (id, map, ...f) => pickChat(st(id).chat, (x) => f.includes(x), map).lines[0].text;
  assert.match(hint('obs_f1', 'ep6_obs_f1', 'obs_f1_arrived'), /west ledge/);
  assert.match(pickChat(st('obs_f1').chat, (x) => x === 'obs_f1_arrived', 'ep6_obs_f1').lines[1].text, /Turn the vane, then ride the lane/);
  assert.match(hint('airstair', 'ep6_airstair', 'mira_asked', 'airstair_fight_done', 'saw_gust'), /Step into the white lane/);
  assert.match(hint('obs_f2', 'ep6_obs_f2'), /Turn the first fan/);
  assert.match(hint('obs_f3', 'ep6_obs_f3', 'aeris_came', 'pledge_anchor'), /Turn the vane/);
  assert.match(hint('scribe', 'ep6_obs_eyrie'), /When it rewrites the course, I anchor us\. Keep me standing\./);
  // the epilogue names something doable after ep6_complete on every town map, and in the Observatory
  const ep = st('epilogue6');
  for (const map of ZL) assert.ok(/beacon|Suri|Piri|locker|Locker|Pippa|Galewing/.test(pickChat(ep.chat, (f) => f === 'ep6_complete', map).lines[0].text), map);
  assert.ok(/locker/.test(pickChat(ep.chat, (f) => f === 'ep6_complete', 'ep6_obs_f2').lines[0].text));
  assert.ok(/Pippa/.test(pickChat(ep.chat, (f) => ['ep6_complete', 'beacon_lit', 'letters_done', 'letters_started', 'locker_found', 'charts_seen', 'beacon_started'].includes(f), 'ep6_zephyr').lines[0].text));
});

test('while EP6_LIVE, Talk points an Episode 5 finisher at the inn and the water stairs, holds the rest until boarding; never Fine Print', () => {
  for (const e of [TALK_OPENER_EP6, TALK_OPENER_EP6_FAR]) assert.equal(TALK_PREPEND.filter((x) => x === e).length, 1);
  assert.ok(TALK_PREPEND.indexOf(TALK_OPENER_EP6) < TALK_PREPEND.indexOf(TALK_OPENER_EP6_FAR));
  const has = (...f) => (x) => f.includes(x);
  const both = [TALK_OPENER_EP6, TALK_OPENER_EP6_FAR];
  assert.match(pickChat(both, has('ep5_complete'), 'ep5_saffron').lines[0].text, /Dune Lantern/);
  assert.match(pickChat(both, has('ep5_complete'), 'ep5_saffron').lines[1].text, /water stairs/);
  assert.match(pickChat(both, has('ep5_complete'), 'willowmere').lines[0].text, /water stairs/);
  assert.equal(pickChat(both, has('ep5_complete', 'ep6_started'), 'ep5_saffron'), null);
  assert.equal(pickChat(both, has('ep5_complete', 'tier_1'), 'ep5_saffron'), null);
  assert.equal(pickChat(both, has('ep5_started'), 'ep5_saffron'), null, 'Episode 5 in progress is untouched');
  for (const e of both) for (const l of e.lines) assert.ok(fits(l.text) && ascii(l.text), l.text);
  // the Haven morning: only the Episode 6 step on the Haven's maps, with Episode 5's side quests open and its banter on file
  const flags = new Set(['intro_done', 'mira_joined', 'bram_joined', 'ep1_complete', 'ep4_complete', 'ep5_started', 'haven_arrived',
    'bells_started', 'roads_started', 'haven_restored', 'ep5_complete']);
  const f = (x) => flags.has(x);
  const talk = (map) => { const c = Q.partyChat(f, map); return [...c.lines, ...c.side, ...c.banter]; };
  for (const map of ['ep5_saffron', 'ep5_sh_inn']) {
    const boxes = talk(map);
    assert.deepEqual(boxes.map((l) => l.who), ['mira', 'bram'], `${map}: ${boxes.map((l) => l.text).join(' | ')}`);
    assert.match(boxes.map((l) => l.text).join(' '), /water stairs/);
  }
  flags.add('ep6_started');
  for (const map of ['ep5_saffron', 'ep5_sh_inn']) {
    const boxes = talk(map);
    assert.ok(boxes.length >= 1 && boxes.every((l) => !/bells|Hassan|Omar|witness|Reliquary/.test(l.text)), `${map}: ${boxes.map((l) => l.text).join(' | ')}`);
    assert.match(boxes[0].text, /water stairs/);
  }
  flags.add('ep6_boarded');
  assert.ok(MORNING_HOLD.ifNot.includes('ep6_boarded'));
  assert.ok(Q.partyChat(f, 'ep5_saffron').side.length >= 1, 'after boarding the hold lets go');
});

test('side quests: givers, rewards, counters, journal and Talk fallbacks; pushed once', () => {
  assert.deepEqual(SIDE_QUESTS_EP6.map((q) => q.id), ['signal_beacon', 'emergency_locker', 'dead_letters']);
  for (const q of SIDE_QUESTS_EP6) {
    assert.equal(ALL_SIDE_QUESTS.filter((x) => x === q).length, 1, `${q.id} once`);
    assert.ok(NPCS[q.giver], `${q.id}: giver ${q.giver}`);
    for (const f of [q.start, q.done, ...(q.counter ? q.counter.flags : [])]) assert.ok(KNOWN(f), `${q.id}: ${f}`);
    for (const st of q.steps) {
      assert.ok(fits(st.journal), `${q.id}.${st.id}: journal`);
      const last = st.chat.at(-1);
      assert.ok(!last.map && !last.if && !last.ifNot, `${q.id}.${st.id}: fallback`);
      for (const e of st.chat) for (const l of e.lines) assert.ok(fits(l.text) && ascii(l.text), l.text);
    }
  }
  assert.equal(REWARDS_EP6.beacon.gold, 350);
  assert.equal(REWARDS_EP6.beacon_coat.item, 'skyhand_coat');
  assert.equal(REWARDS_EP6.locker.gold, 400);
  assert.equal(REWARDS_EP6.letters.item, 'silver_ribbon');
  assert.deepEqual([REWARDS_EP6.gift_truth.item, REWARDS_EP6.gift_hidden.item], ['kestrel_wings', 'quiet_chime']);
  for (const [map, list] of Object.entries(BANTER_EP6)) {
    assert.equal(BANTER[map], list, `banter ${map}`);
    for (const e of list) for (const l of e.lines) assert.ok(fits(l.text) && ascii(l.text), l.text);
  }
  // the Airstair choice changes one Talk line on the Observatory (plan 7.3)
  const fl = (x) => (f) => ['mira_joined', 'bram_joined', x].includes(f);
  const told = pickChat(BANTER.ep6_obs_f1, fl('mira_told'), 'ep6_obs_f1').lines, spared = pickChat(BANTER.ep6_obs_f1, fl('mira_spared'), 'ep6_obs_f1').lines;
  assert.equal(told.length, spared.length);
  assert.equal(told.filter((l, i) => l.text !== spared[i].text && l.who === 'mira').length, 1);
});

test("rewards and battle ids agree with E6-battle's data when it exists", async (t) => {
  if (!existsSync(join(NEXT, 'src', 'data', 'ep6', 'items.js')) || !existsSync(join(NEXT, 'src', 'data', 'ep6', 'enemies.js'))) {
    t.skip('E6-battle items.js / enemies.js not written yet'); return;
  }
  const I = await import('../../src/data/ep6/items.js');
  const ids = new Set(Object.keys({ ...I.EP6_CONSUMABLES, ...I.EP6_KEY_ITEMS, ...I.EP6_UNIQUES }));
  for (const [k, r] of Object.entries(REWARDS_EP6)) if (!['hi_ether', 'hi_potion'].includes(r.item)) assert.ok(ids.has(r.item), `${k}: ${r.item}`);
  const E = await import('../../src/data/ep6/enemies.js');
  for (const id of Object.keys(EP6_BESTIARY)) assert.ok(E.EP6_ENEMIES[id], `bestiary ${id} is an enemy`);
  for (const id of Object.keys(E.EP6_ENEMIES)) assert.ok(EP6_BESTIARY[id], `enemy ${id} has a bestiary entry`);
  for (const id of Object.keys(EP6_BOSS_CARDS)) assert.ok(E.EP6_ENEMIES[id] && E.EP6_ENEMIES[id].boss, `card ${id} is a boss`);
  // the bestiary names the wind side the data has
  for (const [id, b] of Object.entries(EP6_BESTIARY)) {
    const w = E.EP6_ENEMIES[id].wind;
    if (w === 'aloft') assert.match(b.lore.join(' '), /Aloft/, `${id}: aloft`);
    if (w === 'ground') assert.match(b.lore.join(' '), /Grounded/, `${id}: grounded`);
  }
});

test('text: 11 banners (Zephyr conditional), 3 books, the barks, 11 bestiary entries naming Aloft or grounded, credits and cards fit', () => {
  assert.equal(Object.keys(EP6_BANNERS).length, 11);
  for (const m of EP6_MAPS) assert.equal(BANNERS[m], EP6_BANNERS[m], m);
  assert.equal(STORY.bannerFor('ep6_zephyr', null, (f) => f === 'isles_restored').sub, 'The Sky Remembers');
  assert.equal(STORY.bannerFor('ep6_zephyr', null, () => false).sub, 'The Windward Docks');
  for (const b of Object.values(EP6_BANNERS)) assert.ok(b.title.length <= 32 && (!b.sub || b.sub.length <= 32), b.title);
  for (const id of ['flight_manifests', 'flight_logs', 'pilot_charter']) {
    assert.equal(BOOKS[id], EP6_BOOKS[id]);
    for (const p of EP6_BOOKS[id].pages) assert.ok(fits(p) && ascii(p), p);
  }
  assert.deepEqual(EP6_BOOKS.pilot_charter.pages, ['Before chasing the horizon, ANCHOR your people.', 'LISTEN for those the charts omit.',
    'Finally RETURN for anyone the sky has abandoned.']);
  const want = { first_ride: 'I am never doing that again.', first_post: 'Grab the post. The wind lets go.',
    first_vane: 'Turn the vane, turn the wind. Then ride it.', first_duct: 'Wind in the floor now. Lovely.',
    first_ring: 'It goes round. Pick a way and hold on.', vane_would_drop: "Not while we're standing on it.",
    anchor_low_mp: 'Keep something back to anchor us.' };
  for (const [id, text] of Object.entries(want)) {
    assert.equal(BARKS[id], EP6_BARKS[id]);
    const g = { counters: {} };
    const boxes = STORY.takeBark(g, id, (f) => ['ep6_started', 'mira_joined', 'bram_joined', 'anchor_learned'].includes(f));
    assert.deepEqual(boxes.map((x) => x.text), [text], id);
    assert.equal(STORY.takeBark(g, id, () => true).length, 0, `${id} once`);
    assert.equal(STORY.takeBark({ counters: {} }, id, (f) => ['mira_joined', 'bram_joined'].includes(f)).length, 0, `${id}: not before Episode 6`);
  }
  assert.equal(EP6_BATTLE_TEXT.low_mp, 'Keep something back to anchor us.');
  const foes = ['squall_wolf', 'gale_sprite', 'rigger_beetle', 'signal_wraith', 'storm_harrier', 'lightning_manta', 'storm_page',
    'gale_engine', 'scribe', 'false_beacon', 'broken_compass'];
  assert.deepEqual(Object.keys(EP6_BESTIARY), foes);
  for (const id of foes) {
    assert.equal(BESTIARY[id], EP6_BESTIARY[id]);
    assert.equal(EP6_BESTIARY[id].lore.length, 3);
    for (const l of EP6_BESTIARY[id].lore) assert.ok(fits(l) && ascii(l), `${id}: ${l}`);
    assert.match(EP6_BESTIARY[id].lore.join(' '), /Aloft|Grounded/, `${id}: names its wind side`);
  }
  for (const c of CREDITS_EP6) for (const l of [c.heading, ...c.lines]) assert.ok(l.length <= 42 && ascii(l), `credit ${l}`);
  for (const s of [END_CARD_EP6.text, END_CARD_EP6.sub, END_CARD_EP5_LIVE.sub, EPISODE7_CARD.text, EPISODE7_CARD.sub, END_TITLE_EP6.text,
    END_TITLE_EP6.sub]) assert.ok(s.length <= 42 && ascii(s), s);
  assert.equal(END_CARD_EP6.sub, 'Episode 7 is not playable yet.');
  assert.equal(END_CARD_EP5_LIVE.sub, 'Episode 6 begins in the morning.');
  for (const t of Object.values(EP6_BATTLE_TEXT)) assert.ok(t.length <= 100 && fits(t) && ascii(t), t);
  assert.ok(EP6_BATTLE_TEXT.anchor_help.length <= 40);
  assert.equal(EP6_BATTLE_TEXT.anchor_learn, 'Bram learned Anchor. The party holds through the next gust, and the wind carries them on.');
  for (const [id, c] of Object.entries(EP6_BOSS_CARDS)) {
    assert.ok(c.name.length <= 24 && c.sub.length <= 28, id);
    assert.ok(EP6_ARC_LINES[id] && fits(EP6_ARC_LINES[id]), `${id}: arc line`);
  }
});

test('inspect lines: registered, fit, declared flags, a fallback last, the plan objects present, and no late name before its flag', () => {
  for (const [id, v] of Object.entries(EP6_LINES)) {
    assert.equal(STORY.LINES[id], v, `${id} registered`);
    const walk = (x, guard) => {
      if (typeof x === 'string') {
        assert.ok(fits(x) && ascii(x), `${id}: ${boxLines(x).join(' / ')}`);
        assert.ok(!/\bPippa\b/.test(x) || PIPPA_OK.includes(guard), `${id}: the late name`);
        return;
      }
      assert.ok(Array.isArray(x) && x.length, `${id}: empty`);
      if (x.every((e) => typeof e === 'string')) { x.forEach((e) => walk(e, guard)); return; }
      const last = x.at(-1);
      assert.ok(!last.if && !last.ifNot, `${id}: ends on a fallback`);
      for (const e of x) { for (const f of flagsOf(e)) assert.ok(KNOWN(f), `${id}: ${f}`); walk(e.lines, [e.if].flat()[0]); }
    };
    walk(v, null);
    assert.ok(resolve(v, () => false, null).length >= 1);
  }
  assert.ok(Object.keys(EP6_LINES).length >= 35, `inspect lines: ${Object.keys(EP6_LINES).length}`);
  // the plan 4 list: the board and the chimes in two states, the post rack, the beacon, the chain, lanes, posts, vanes,
  // relays, tubes, grilles, the charter's three lines, the lamps, the desk, the quills, the Wind Script, the shelves, the feather
  for (const id of ['ep6_board', 'ep6_chimes', 'ep6_post_rack', 'ep6_beacon', 'ep6_great_chain', 'ep6_gust_lane', 'ep6_mooring_post',
    'ep6_vane', 'ep6_relay', 'ep6_speaking_tube', 'ep6_grille', 'ep6_lamp_anchor', 'ep6_lamp_listen', 'ep6_lamp_return', 'ep6_scribe_desk',
    'ep6_quills', 'ep6_wind_script', 'ep6_library_shelves', 'ep6_first_shelf', 'ep6_feather_grille', 'ep6_feather_desk', 'ep6_kestrel',
    'ep6_crates']) assert.ok(EP6_LINES[id], id);
  for (const id of ['ep6_board', 'ep6_chimes', 'ep6_beacon']) {
    const flag = id === 'ep6_beacon' ? 'beacon_lit' : 'isles_restored';
    assert.notDeepEqual(resolve(EP6_LINES[id], (f) => f === flag), resolve(EP6_LINES[id], () => false), id);
  }
  const charter = ['ep6_lamp_anchor', 'ep6_lamp_listen', 'ep6_lamp_return'].map((id, i) =>
    resolve(EP6_LINES[id], (f) => f === ['pledge_anchor', 'pledge_listen', 'pledge_return'][i]).map((x) => x.text).join(' '));
  assert.match(charter[0], /ANCHOR your people/);
  assert.match(charter[1], /LISTEN for those the charts omit/);
  assert.match(charter[2], /RETURN for anyone the sky has abandoned/);
});

test('the Ledger: Zephyr rows counted only when live, reached at zephyr_arrived, the hero unkept, Pippa hidden until found', async () => {
  assert.equal(PLACES.zephyr, 'Zephyr Landing');
  assert.equal(REACHED.zephyr, 'zephyr_arrived');
  assert.equal(EXCLUDED.ep6_innkeeper, 'a shop counter');
  assert.equal(EXCLUDED.bennet_winch, 'see bennet');
  for (const r of EP6_LEDGER) { assert.equal(LEDGER.filter((x) => x.id === r.id).length, 1, r.id); assert.ok(KNOWN(r.flag), r.flag); }
  const rows = (flags) => ledgerRows(new Set(flags).has.bind(new Set(flags)), { all: false }).filter((x) => x.place === 'zephyr');
  assert.equal(rows(['ep5_complete']).length, 0, 'not reached');
  const met = rows(['zephyr_arrived', 'met_aeris']);
  assert.equal(met.find((x) => x.id === 'pippa').name, '???');
  assert.ok(met.find((x) => x.id === 'aeris').kept && !met.find((x) => x.id === 'liora').kept);
  const after = rows(['zephyr_arrived', 'pippa_found', 'pippa_home', 'isles_restored']);
  assert.equal(after.find((x) => x.id === 'pippa').name, 'Pippa Voss');
  assert.ok(after.find((x) => x.id === 'pippa').kept && after.find((x) => x.id === 'liora').kept);
  for (const r of EP6_LEDGER) {
    for (const w of typeof r.why === 'function' ? [r.why(() => true), r.why(() => false)] : [r.why]) assert.ok(w.length <= 80 && ascii(w), w);
  }
  for (const id of Object.keys(EP6_NPCS)) assert.ok(LEDGER.some((x) => x.id === id) || EXCLUDED[id], `${id}: a row or excluded`);
  // the hero's row stays unkept by everything Episode 6 sets
  const heroRow = LEDGER.find((x) => x.id === 'hero');
  if (heroRow) {
    const by = (f) => ledgerRows(f, { all: true }).find((x) => x.id === 'hero').kept;
    assert.equal(by((f) => f in EP6_FLAGS || f === 'ep5_complete'), by((f) => f === 'ep5_complete'), 'Episode 6 keeps nothing on the hero row');
  }
  const fresh = await import(`../../src/data/ep6/ledger.js?off=${Date.now()}`);
  const n = LEDGER.length;
  fresh.register({ ep6Live: false });
  assert.equal(LEDGER.length, n);
});

test('the pack modules export register(), and Episode 6 is not reachable from core alone', async () => {
  for (const name of ['flags', 'npcs', 'quests', 'text', 'story', 'ledger']) {
    const mod = await import(`../../src/data/ep6/${name}.js`);
    assert.equal(typeof mod.register, 'function', name);
    assert.equal(mod.default, mod.register, `${name} default export`);
  }
  assert.equal(Q.mainQuestFor((f) => ['ep5_started', 'ep5_complete'].includes(f)).id, 'main_ep5');
  // With the switch off, the opener and the hold are not pushed (a fresh copy of the module, its own objects).
  const fresh = await import(`../../src/data/ep6/quests.js?off=${Date.now()}`);
  const before = TALK_PREPEND.length;
  fresh.register({ ep6Live: false });
  assert.equal(TALK_PREPEND.length, before);
  for (const q of ALL_SIDE_QUESTS) for (const st of q.steps || []) assert.ok(!(st.chat || []).includes(fresh.MORNING_HOLD), `${q.id}: hold pushed while off`);
  for (const q of fresh.SIDE_QUESTS_EP6) { const i = ALL_SIDE_QUESTS.indexOf(q); if (i >= 0) ALL_SIDE_QUESTS.splice(i, 1); }
  const qi = Q.QUEST_EXT.findIndex((e) => e[1] === fresh.MAIN_QUEST_EP6);
  if (qi >= 0) Q.QUEST_EXT.splice(qi, 1);
});
