// Episode 7 data (E7-story, the lazy ep7 pack): flags, the Palehaven cast and the returning lines, the main and side quests
// with their Talk, the banners, inspect lines, stone names, books, barks, bestiary, battle text, cards and credits, the
// Ledger rows, and the two late names (no line says "Nox" before nox_named or "Marten" before marten_named). Ids owned by
// other wave-7 agents are accepted by their planned ids (docs/EPISODE7_PLAN.md section 2); battle ids are read from
// E7-battle's modules when they exist.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import * as NPCMOD from '../../src/data/npcs.js';
import * as Q from '../../src/data/quests.js';
import { BANNERS, BOOKS, BARKS, BESTIARY } from '../../src/data/text.js';
import { LEDGER, PLACES, REACHED, EXCLUDED, ALIASES, ledgerRows } from '../../src/data/ledger.js';
import * as STORY from '../../src/game/story.js';
import { fits, boxLines, resolve } from '../../src/data/story/dialogue.js';
import { register as regEp4Flags } from '../../src/data/ep4/flags.js';
import { register as regEp4Npcs } from '../../src/data/ep4/npcs.js';
import { register as regEp4Quests } from '../../src/data/ep4/quests.js';
import { register as regEp5Flags } from '../../src/data/ep5/flags.js';
import { register as regEp5Npcs } from '../../src/data/ep5/npcs.js';
import { register as regEp5Quests } from '../../src/data/ep5/quests.js';
import { register as regEp6Flags } from '../../src/data/ep6/flags.js';
import { register as regEp6Npcs } from '../../src/data/ep6/npcs.js';
import { register as regEp6Quests, MAIN_QUEST_EP6 } from '../../src/data/ep6/quests.js';
import { compoundTerms, withCompound } from '../../src/data/ep4/field/seams.js';
import { EP7_FLAGS, EP7_MAPS, register as regFlags } from '../../src/data/ep7/flags.js';
import { EP7_NPCS, EP7_TALK_PREPEND, EP7_SPEAKERS, EP7_IMPLIED, register as regNpcs } from '../../src/data/ep7/npcs.js';
import { MAIN_QUEST_EP7, SIDE_QUESTS_EP7, BANTER_EP7, TALK_OPENER_EP7, TALK_OPENER_EP7_FAR, MORNING_HOLD_EP7, QUEST_EXT_ENTRY, REWARDS_EP7,
  EPILOGUE6_LIVE, register as regQuests } from '../../src/data/ep7/quests.js';
import { EP7_BANNERS, EP7_LINES, EP7_STONES, EP7_BOOKS, EP7_BARKS, EP7_BESTIARY, EP7_BATTLE_TEXT, EP7_BOSS_CARDS, EP7_ARC_LINES, CREDITS_EP7,
  END_CARD_EP7, END_CARD_EP6_LIVE, END_TITLE_EP7, EPISODE8_CARD, register as regText } from '../../src/data/ep7/text.js';
import { EP7_LEDGER, register as regLedger } from '../../src/data/ep7/ledger.js';
import { scenes } from '../../src/data/ep7/story.js';
import { NEXT } from './_harness.mjs';

const { NPCS, SPEAKER_NAMES, talkTo, prependTalk } = NPCMOD;
const { FLAGS, FLAG_IDS, ALL_SIDE_QUESTS, BANTER, TALK_PREPEND, pickChat, currentStep } = Q;
const PARTY = ['hero', 'mira', 'bram'];
const ascii = (s) => /^[\x20-\x7e]*$/.test(s);
const flagsOf = (e) => [e?.if, e?.ifNot].flat().filter(Boolean);
const termsOf = (f) => (compoundTerms(f) || [[f, true]]).map(([x]) => x);
const KNOWN = (f) => termsOf(f).every((x) => x in FLAGS || x === 'tier_1');
const PH = ['ep7_palehaven', 'ep7_ph_inn', 'ep7_ph_shop', 'ep7_ph_armory', 'ep7_ph_watch'];
const ZL = ['ep6_zephyr', 'ep6_zl_inn', 'ep6_zl_shop', 'ep6_zl_workshop', 'ep6_zl_charts'];
// A line may say a late name only behind a flag that is set on or after the beat that reads it (whole_page).
const NOX_OK = ['nox_named', 'page_whole', 'doors_reopened', 'letter_sent', 'vex_name_whole', 'ep7_complete'];
const MARTEN_OK = ['marten_named', ...NOX_OK];
const late = (text, guards) => {
  const g = guards.flat().filter(Boolean);
  const out = [];
  if (/\bNox\b/.test(text) && !g.some((f) => NOX_OK.includes(f))) out.push(`Nox early: ${text}`);
  if (/\bMarten\b/.test(text) && !g.some((f) => MARTEN_OK.includes(f))) out.push(`Marten early: ${text}`);
  return out;
};
// Scott, 2026-11-11: "Ledger" has one meaning (the player's Ledger). No Episode 7 line uses the word.
const NOT_SAID = /\bledger\b|First Keeper|Concordance|Elowen|cracked-key|I could not endure another farewell/i;

// The ep4, ep5 and ep6 packs register first in the game (index.js: ensureEp6), so their NPCs and their prepends are already in.
regEp4Flags(); regEp4Npcs(); regEp4Quests({ ep4Live: true });
regEp5Flags(); regEp5Npcs(); regEp5Quests({ ep5Live: true });
regEp6Flags(); regEp6Npcs(); regEp6Quests({ ep6Live: true });

// Every talk result for a bounded set of flag states, BEFORE the ep7 pack prepends anything.
const RETURNING = Object.keys(EP7_TALK_PREPEND);
const statesFor = (id) => {
  const pool = new Set(['ep6_started', 'ep6_complete', 'isles_restored', 'ep7_started', 'ep7_complete', 'ep7_boarded', 'ep5_complete']);
  for (const e of NPCS[id]?.talk || []) for (const f of flagsOf(e)) for (const x of termsOf(f)) pool.add(x);
  const list = [...pool];
  const out = [];
  let seed = 17;
  for (let k = 0; k < 160; k++) {
    const st = new Set();
    for (const f of list) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; if (seed % 3 === 0) st.add(f); }
    // a save that has started Episode 7 holds every flag before it (npcs.js EP7_IMPLIED): only such states are real
    if (['ep7_started', 'ep7_boarded', 'ep7_complete'].some((f) => st.has(f))) for (const f of EP7_IMPLIED) st.add(f);
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
for (let i = 0; i < 2; i++) { regFlags(); regNpcs(); regQuests({ ep7Live: true }); regText(); regLedger({ ep7Live: true }); }

test('flags: every plan 2.2 flag declared with a meaning, pushed once onto FLAG_IDS, none from an earlier episode', async () => {
  const plan = ['ep7_started', 'ep7_boarded', 'road_arrived', 'vex_carved', 'road_fight_done', 'call_learned', 'saw_sevens', 'saw_palehaven',
    'palehaven_arrived', 'met_keeper', 'keeper_told', 'vault_open', 'vault_entered', 'stillheart_key_found', 'vault_f1_done', 'bell_found',
    'lantern_defeated', 'vault_f2_done', 'keeper_came', 'stillheart_open', 'phantom_defeated', 'stillheart_restored', 'fragment7_get',
    'seventh_list_get', 'page_whole', 'nox_named', 'marten_named', 'doors_reopened', 'letter_sent', 'vex_name_whole', 'ep7_complete',
    'ep7_morning_done', 'told_vex', 'spared_vex', 'valewyn_list_get', 'first_stone_read', 'vault_f1_arrived', 'vault_f2_arrived',
    'vault_f3_arrived', 'keeper_memory_1', 'keeper_memory_2', 'keeper_memory_3', 'told_nox', 'spared_nox', 'hearth_started',
    'testimony_mirael', 'testimony_sol', 'testimony_eira', 'hearth_lit', 'hearth_done', 'page_door_found', 'page_flame_found',
    'page_lost_found', 'reliquary_open', 'streets_started', 'street_1_found', 'street_2_found', 'street_3_found', 'streets_done'];
  for (const f of plan) assert.ok(EP7_FLAGS[f] && EP7_FLAGS[f].length > 10, `flag ${f}`);
  assert.deepEqual(Object.keys(EP7_FLAGS).filter((f) => !plan.includes(f)), ['lantern_tried', 'phantom_tried'], 'the only additions');
  const { EP6_FLAGS } = await import('../../src/data/ep6/flags.js');
  const { EP5_FLAGS } = await import('../../src/data/ep5/flags.js');
  const { EP4_FLAGS } = await import('../../src/data/ep4/flags.js');
  const earlier = new Set([...Object.keys(Q.EP2_FLAGS), ...Object.keys(Q.EP3_FLAGS), ...Object.keys(EP4_FLAGS || {}), ...Object.keys(EP5_FLAGS),
    ...Object.keys(EP6_FLAGS)]);
  for (const f of Object.keys(EP7_FLAGS)) {
    assert.equal(FLAG_IDS.filter((x) => x === f).length, 1, `${f} once in FLAG_IDS`);
    assert.ok(!earlier.has(f), `${f} is an earlier episode's flag`);
    assert.ok(ascii(EP7_FLAGS[f]), `${f}: ASCII`);
    assert.ok(!/^(ep[1-6]_|oath_|landing_|sel_memory_|aeris_memory_|pledge_|sky_|orrery|star_|updraft|vow_|mara_)/.test(f), `${f}: a taken prefix`);
  }
  assert.ok(!('credits7_rolled' in EP7_FLAGS), 'credits7_rolled is a counter, not a flag');
  assert.deepEqual(EP7_MAPS, ['ep7_white_road', 'ep7_waystation', 'ep7_palehaven', 'ep7_ph_inn', 'ep7_ph_shop', 'ep7_ph_armory',
    'ep7_ph_watch', 'ep7_vault_f1', 'ep7_vault_f2', 'ep7_vault_f3', 'ep7_stillheart']);
});

test('the Palehaven cast: records, maps, stages, the Keeper and Nox by nox_named, two posts, no portrait aliases', () => {
  assert.deepEqual(Object.keys(EP7_NPCS), ['keeper', 'nox_t', 'bryn', 'eira', 'eira_forge', 'sol', 'sol_waystation', 'maera', 'torr', 'mirael',
    'ep7_innkeeper']);
  for (const [id, rec] of Object.entries(EP7_NPCS)) {
    assert.equal(NPCS[id], rec, id);
    assert.ok(EP7_MAPS.includes(rec.map), `${id}: map ${rec.map}`);
    assert.ok(!rec.portrait, `${id}: no portrait (plan 9.5)`);
    const last = rec.talk.at(-1);
    assert.ok(!last.if && !last.ifNot && last.lines, `${id}: ends on a fallback`);
    for (const e of rec.talk) {
      for (const f of flagsOf(e)) assert.ok(KNOWN(f), `${id}: flag ${f}`);
      if (e.scene) assert.ok(scenes[e.scene], `${id}: scene ${e.scene}`);
    }
    for (const f of flagsOf(rec.show)) assert.ok(KNOWN(f), `${id}: show ${f}`);
  }
  const stages = new Set(Object.values(EP7_NPCS).flatMap((r) => r.talk.flatMap(flagsOf)));
  for (const f of ['palehaven_arrived', 'met_keeper', 'vault_f2_done', 'nox_named', 'doors_reopened', 'ep7_complete']) assert.ok(stages.has(f), `stage ${f}`);
  for (const [id, n] of Object.entries(EP7_SPEAKERS)) assert.equal(SPEAKER_NAMES[id], n);
  assert.equal(SPEAKER_NAMES.keeper_t, 'The Keeper');
  assert.equal(SPEAKER_NAMES.courier_m, 'A Courier');
  assert.equal(SPEAKER_NAMES.marten_m, 'Marten');
  assert.equal(SPEAKER_NAMES.white_phantom, 'The Phantom');
  assert.equal(NPCS.keeper.name, 'The Keeper');
  assert.equal(NPCS.nox_t.name, 'Nox');
  assert.equal(NPCS.ep7_innkeeper.service.price, 140);
  assert.deepEqual([NPCS.eira_forge.service.id, NPCS.sol_waystation.service.id, NPCS.maera.service.id], ['glassice_armory', 'waystation_pack', 'northwind']);
  const shown = (id, ...f) => NPCMOD.isPresent(id, (x) => f.includes(x));
  assert.ok(shown('keeper', 'palehaven_arrived') && !shown('keeper', 'palehaven_arrived', 'keeper_came'), 'the square record stands down from keeper_came');
  assert.ok(!shown('nox_t', 'keeper_came') && shown('nox_t', 'nox_named'));
  const has = (...f) => (x) => f.includes(x);
  assert.deepEqual(talkTo('keeper', has('palehaven_arrived')), { scene: 'meet_keeper' });
  assert.deepEqual(talkTo('eira', has('palehaven_arrived', 'met_keeper')), { scene: 'hearth_start' });
  assert.deepEqual(talkTo('mirael', has('palehaven_arrived', 'hearth_started')), { scene: 'testimony_mirael' });
  assert.deepEqual(talkTo('sol', has('hearth_started')), { scene: 'testimony_sol' });
  assert.deepEqual(talkTo('sol_waystation', has('hearth_started')), { scene: 'testimony_sol' });
  assert.deepEqual(talkTo('torr', has('palehaven_arrived')), { scene: 'streets_start' });
  assert.deepEqual(talkTo('torr', has('palehaven_arrived', 'streets_started', 'street_1_found', 'street_2_found', 'street_3_found')), { scene: 'streets_done' });
});

test("Bryn, Eira, Torr and Mirael: 'the Keeper' before nox_named, canon's words with her name after", () => {
  const has = (...f) => (x) => f.includes(x);
  const said = (id, ...f) => talkTo(id, has(...f)).lines.map((l) => l.text).join(' ');
  const before = ['palehaven_arrived'], after = ['palehaven_arrived', 'nox_named'];
  assert.match(said('bryn', ...before), /The Keeper can explain why the snow hides gaps in the world\./);
  assert.match(said('bryn', ...after), /^Keeper Nox can explain why the snow hides gaps in the world\.$/);
  assert.match(said('torr', ...before, 'streets_started', 'streets_done'), /Three streets back/);
  assert.match(said('torr', 'palehaven_arrived', 'streets_started', 'streets_done', 'nox_named'), /^Keeper Nox taught me to press names into iceglass\.$/);
  assert.match(said('mirael', ...before), /The Keeper tried to spare us grief by hiding every loss\./);
  assert.match(said('mirael', ...after), /Keeper Nox tried to spare us grief by hiding every loss/);
  assert.match(said('eira', ...after, 'met_keeper', 'hearth_started'), /Keeper Nox promised to keep my sister safe/);
  // canon lines kept word for word
  assert.match(said('eira', 'palehaven_arrived'), /My iceglass never breaks in cold, only when the story inside is forgotten\./);
  assert.match(said('maera', 'palehaven_arrived'), /Even the winter moss can tell whether a traveler will return\./);
  assert.match(said('sol', 'road_arrived'), /Some paths disappear while I am walking them\. I leave twine markers now\./);
});

test('every NPC, returning-cast, Talk, banter, bark and inspect line fits a box, is ASCII, and says no late name before its flag', () => {
  const bad = [];
  const check = (where, e, guards = []) => {
    for (const l of [e.lines].flat().filter(Boolean)) {
      const t = typeof l === 'string' ? l : l.text;
      if (!fits(t)) bad.push(`${where}: ${boxLines(t).join(' / ')}`);
      if (!ascii(t)) bad.push(`${where}: non-ASCII`);
      if (NOT_SAID.test(t)) bad.push(`${where}: says ${t.match(NOT_SAID)[0]}`);
      bad.push(...late(t, [e.if, ...guards]).map((x) => `${where}: ${x}`));
      if (typeof l === 'object') assert.ok(l.who === null || PARTY.includes(l.who) || l.who === where.split(' ')[0], `${where}: who ${l.who}`);
    }
  };
  for (const [id, rec] of Object.entries(EP7_NPCS)) for (const e of rec.talk) check(id, e, [rec.show?.if]);
  for (const [id, list] of Object.entries(EP7_TALK_PREPEND)) for (const e of list) check(id, e);
  const prior = [];
  for (const st of MAIN_QUEST_EP7.steps) {
    for (const e of st.chat) check(`main ${st.id}`, e, prior);
    if (st.done) prior.push(st.done);
  }
  for (const q of SIDE_QUESTS_EP7) for (const st of q.steps) for (const e of st.chat) check(`side ${q.id}`, e);
  for (const [map, list] of Object.entries(BANTER_EP7)) for (const e of list) check(`banter ${map}`, e);
  for (const [id, list] of Object.entries(EP7_BARKS)) for (const e of list) check(`bark ${id}`, e);
  for (const e of [TALK_OPENER_EP7, TALK_OPENER_EP7_FAR]) check('opener', e);
  for (const [id, v] of Object.entries(EP7_LINES)) {
    if (typeof v === 'string') check(`line ${id}`, { lines: v });
    else if (v.every((x) => typeof x === 'string')) check(`line ${id}`, { lines: v });
    else for (const e of v) check(`line ${id}`, e);
  }
  for (const [id, bk] of Object.entries(EP7_BOOKS)) check(`book ${id}`, { lines: bk.pages });
  for (const [id, be] of Object.entries(EP7_BESTIARY)) check(`bestiary ${id}`, { lines: be.lore });
  assert.deepEqual(bad, []);
  for (const id of ['aeris', 'pippa', 'liora', 'bennet', 'sel', 'laleh', 'kamal', 'yara', 'lyra_n', 'hale', 'joss', 'garrick_n', 'ilya', 'wren',
    'anwen', 'holt', 'hazel', 'tess', 'pip']) assert.ok(EP7_TALK_PREPEND[id], `returning ${id}`);
  for (const [id, list] of Object.entries(EP7_TALK_PREPEND)) {
    assert.ok(NPCS[id], `${id} is a real NPC`);
    assert.ok(list.some((e) => [e.if].flat().includes('ep7_started')), `${id}: an Episode 7 start line`);
    assert.ok(list.some((e) => [e.if].flat().includes('ep7_complete')), `${id}: an after line`);
  }
  // the bible's lines, word for word (EPISODE7 sections 1 and 3)
  const first = (id, f) => EP7_TALK_PREPEND[id].find((e) => [e.if].flat().includes(f)).lines;
  assert.deepEqual(first('pippa', 'ep7_started'), ['Every ship answers the lights now. Even yours.']);
  assert.deepEqual(first('liora', 'ep7_started'), ["Dock four. If you come back, I'll be at the right one."]);
  assert.deepEqual(first('bennet', 'ep7_started'), ['Wrap your hands. Rope freezes. So do fingers.']);
  assert.deepEqual(first('tess', 'ep7_started'), ["Bram's letter says they're going up the White Road. Dad's road. Tell them to mind the holes."]);
  assert.equal(first('tess', 'ep7_complete').join(' '), "A letter came on an airship. In his hand. It says Marten at the bottom. Marten. I'm going to say it at every door on my route.");
  assert.equal(first('hazel', 'ep7_complete').join(' '), "A courier left you on my step with a blanket and a laugh. I knew him. I couldn't say who, until today. Marten. Thank you, Marten.");
});

test('returning-cast lines answer in Episode 7 and never hide an older scene; nothing changes before Episode 7', () => {
  for (const id of Object.keys(BEFORE)) {
    for (const { st, r } of BEFORE[id]) {
      const now = talkTo(id, withCompound((f) => st.has(f)));
      if (r && r.scene) assert.deepEqual(now, r, `${id}: a scene was hidden for ${[...st].join(',')}`);
      if (!st.has('ep7_started') && !st.has('ep7_complete') && !st.has('ep7_boarded')) assert.deepEqual(now, r, `${id}: changed before Episode 7`);
    }
  }
  const has = (...f) => (x) => [...f, ...EP7_IMPLIED].includes(x);
  const done = ['tess_quest_started', 'last_route_started', 'tess_letter_1_delivered', 'tess_letter_2_delivered', 'tess_letter_3_delivered'];
  assert.match(talkTo('tess', has('ep7_started', ...done)).lines[0].text, /Dad's road/);
  assert.match(talkTo('hazel', has('ep7_started', 'ep7_complete', 'hazel_farewell_done')).lines.map((l) => l.text).join(' '), /Thank you, Marten\./);
  const joss = talkTo('joss', has('ep7_started')).lines;
  assert.deepEqual(joss.map((l) => l.who), ['joss', 'bram', 'joss']);
  const before = NPCS.tess.talk.length;
  regNpcs();
  assert.equal(NPCS.tess.talk.length, before);
  assert.equal(prependTalk('tess', []), 0);
});

test('Episode 7 main quest: steps in order, journal and aims fit, Talk names the next step on every map, ahead of Episode 6', () => {
  assert.deepEqual(MAIN_QUEST_EP7.steps.map((s) => s.id), ['north', 'road', 'palehaven', 'vault_f1', 'vault_f2', 'vault_f3', 'phantom', 'page', 'epilogue7']);
  assert.deepEqual(QUEST_EXT_ENTRY, ['ep7_started', MAIN_QUEST_EP7]);
  assert.equal(Q.QUEST_EXT.filter((e) => e[0] === 'ep7_started').length, 1);
  assert.ok(Q.QUEST_EXT.findIndex((e) => e[0] === 'ep7_started') < Q.QUEST_EXT.findIndex((e) => e[0] === 'ep6_started'), 'ahead of Episode 6');
  const voices = new Set();
  for (const st of MAIN_QUEST_EP7.steps) {
    assert.ok(fits(st.journal) && ascii(st.journal), `${st.id}: journal`);
    assert.ok(st.aim.length <= 32 && (!st.aimIf || st.aimIf.aim.length <= 32), `${st.id}: aim`);
    for (const f of [st.done, st.aimIf?.if].flat().filter(Boolean)) assert.ok(KNOWN(f), `${st.id}: ${f}`);
    const last = st.chat.at(-1);
    assert.ok(!last.map && !last.if && !last.ifNot, `${st.id}: Talk ends on a fallback`);
    for (const e of st.chat) {
      for (const f of flagsOf(e)) assert.ok(KNOWN(f), `${st.id}: chat flag ${f}`);
      for (const l of e.lines) { assert.ok(fits(l.text) && ascii(l.text), `${st.id}: ${l.text}`); voices.add(l.who); }
    }
    for (const map of [...EP7_MAPS, ...ZL]) assert.ok(pickChat(st.chat, () => false, map), `${st.id}: no Talk on ${map}`);
  }
  assert.ok(voices.has('mira') && voices.has('bram'));
  const f7 = new Set(['ep5_complete', 'ep6_started', 'ep6_complete', 'ep7_started']);
  assert.equal(Q.mainQuestFor((f) => f7.has(f)).id, 'main_ep7');
  assert.equal(Q.mainQuestFor((f) => ['ep6_started', 'ep6_complete'].includes(f)), MAIN_QUEST_EP6, 'Episode 6 unchanged');
  const flags = new Set(['ep7_started', 'ep7_boarded', 'road_arrived', 'vex_carved', 'road_fight_done', 'first_stone_read']);
  assert.equal(currentStep((f) => flags.has(f), MAIN_QUEST_EP7).id, 'road');
  flags.add('call_learned');
  assert.equal(Q.aimFor(currentStep((f) => flags.has(f), MAIN_QUEST_EP7), (f) => flags.has(f)), 'Climb to the Icegate');
  // the hints name the action
  const st = (id) => MAIN_QUEST_EP7.steps.find((x) => x.id === id);
  const hint = (id, map, ...f) => pickChat(st(id).chat, (x) => f.includes(x), map).lines.map((l) => l.text).join(' ');
  assert.match(hint('road', 'ep7_white_road', 'vex_carved', 'road_fight_done', 'first_stone_read'), /Read Asta's stone and cross\. Then Bo's stone, and Nyx's/);
  assert.match(hint('road', 'ep7_white_road', 'vex_carved', 'road_fight_done', 'first_stone_read'), /Asta goes when we take a third/);
  assert.match(hint('road', 'ep7_white_road', 'vex_carved', 'road_fight_done'), /first white gap/);
  assert.match(hint('road', 'ep7_white_road', 'vex_carved'), /Defend/);
  assert.match(hint('vault_f1', 'ep7_vault_f1', 'vault_f1_arrived'), /Read Arvo's stone and cross/);
  assert.match(hint('vault_f1', 'ep7_vault_f1', 'vault_f1_arrived', 'keeper_memory_1'), /again first, so the other is oldest/);
  assert.match(hint('vault_f2', 'ep7_vault_f2'), /Dagny lets go/);
  assert.match(hint('vault_f2', 'ep7_vault_f2', 'bell_found'), /When it borrows one of us, call them back, \{hero\}\. Before its turn\./);
  assert.match(hint('phantom', 'ep7_stillheart'), /When it says goodbye to one of us, call them, \{hero\}\. Before it lands\./);
  assert.match(hint('vault_f3', 'ep7_vault_f3', 'vault_f3_arrived'), /Read Ylva's stone/);
  // the epilogue names something doable after ep7_complete on every town map, and in the Vault
  const ep = st('epilogue7');
  for (const map of PH) assert.ok(/hearth|Eira|Torr|Reliquary|Snowrest|Armory/.test(pickChat(ep.chat, (f) => f === 'ep7_complete', map).lines[0].text), map);
  assert.ok(/Reliquary/.test(pickChat(ep.chat, (f) => f === 'ep7_complete', 'ep7_vault_f2').lines[0].text));
  const done = ['ep7_complete', 'hearth_lit', 'hearth_started', 'streets_started', 'streets_done', 'reliquary_open'];
  assert.match(pickChat(ep.chat, (f) => done.includes(f), 'ep7_palehaven').lines[0].text, /Snowrest is back on Aeris's chart/);
});

test("while EP7_LIVE, Talk points an Episode 6 finisher at the inn and the north dock, holds the rest until boarding; epilogue6 says so; never Fine Print", () => {
  for (const e of [TALK_OPENER_EP7, TALK_OPENER_EP7_FAR]) assert.equal(TALK_PREPEND.filter((x) => x === e).length, 1);
  assert.ok(TALK_PREPEND.indexOf(TALK_OPENER_EP7) < TALK_PREPEND.indexOf(TALK_OPENER_EP7_FAR));
  assert.ok(TALK_PREPEND.indexOf(TALK_OPENER_EP7_FAR) === 1 || TALK_PREPEND.indexOf(TALK_OPENER_EP7) === 0, 'in front of older openers');
  const has = (...f) => (x) => f.includes(x);
  const both = [TALK_OPENER_EP7, TALK_OPENER_EP7_FAR];
  assert.match(pickChat(both, has('ep6_complete'), 'ep6_zephyr').lines[0].text, /inn's door/);
  assert.match(pickChat(both, has('ep6_complete'), 'ep6_zephyr').lines[1].text, /north dock/);
  assert.match(pickChat(both, has('ep6_complete'), 'willowmere').lines[0].text, /Cloudhouse Inn/);
  assert.equal(pickChat(both, has('ep6_complete', 'ep7_started'), 'ep6_zephyr'), null);
  assert.equal(pickChat(both, has('ep6_complete', 'tier_1'), 'ep6_zephyr'), null);
  assert.equal(pickChat(both, has('ep6_started'), 'ep6_zephyr'), null, 'Episode 6 in progress is untouched');
  const ep6last = MAIN_QUEST_EP6.steps.find((x) => x.id === 'epilogue6');
  assert.equal(ep6last.journal, EPILOGUE6_LIVE.journal);
  assert.ok(fits(EPILOGUE6_LIVE.journal) && EPILOGUE6_LIVE.aim.length <= 32);
  // the Zephyr morning: only the Episode 7 step on Zephyr's maps, with Episode 6's side quests open and its banter on file
  const flags = new Set(['intro_done', 'mira_joined', 'bram_joined', 'ep1_complete', 'ep5_complete', 'ep6_started', 'zephyr_arrived', 'charts_seen',
    'beacon_started', 'letters_started', 'isles_restored', 'ep6_complete']);
  const f = (x) => flags.has(x);
  const talk = (map) => { const c = Q.partyChat(f, map); return [...c.lines, ...c.side, ...c.banter]; };
  for (const map of ['ep6_zephyr', 'ep6_zl_inn']) {
    const boxes = talk(map);
    assert.deepEqual(boxes.map((l) => l.who), ['mira', 'bram'], `${map}: ${boxes.map((l) => l.text).join(' | ')}`);
    assert.match(boxes.map((l) => l.text).join(' '), /north dock/);
  }
  flags.add('ep7_started');
  for (const map of ['ep6_zephyr', 'ep6_zl_charts']) {
    const boxes = talk(map);
    assert.ok(boxes.length >= 1 && boxes.every((l) => !/beacon|Piri|witness|locker/i.test(l.text)), `${map}: ${boxes.map((l) => l.text).join(' | ')}`);
    assert.match(boxes[0].text, /north dock|tower stair/);
  }
  flags.add('ep7_boarded');
  assert.ok(MORNING_HOLD_EP7.ifNot.includes('ep7_boarded'));
  assert.ok(Q.partyChat(f, 'ep6_zephyr').side.length >= 1, 'after boarding the hold lets go');
});

test('side quests: givers, rewards, counters, journal and Talk fallbacks; pushed once; the wall choice changes one Talk line', () => {
  assert.deepEqual(SIDE_QUESTS_EP7.map((q) => q.id), ['returning_hearth', 'keeper_reliquary', 'missing_streets']);
  for (const q of SIDE_QUESTS_EP7) {
    assert.equal(ALL_SIDE_QUESTS.filter((x) => x === q).length, 1, `${q.id} once`);
    assert.ok(q.giver === null || NPCS[q.giver], `${q.id}: giver ${q.giver}`);
    for (const f of [q.start, q.done, ...(q.counter ? q.counter.flags : [])]) assert.ok(KNOWN(f), `${q.id}: ${f}`);
    for (const st of q.steps) {
      assert.ok(fits(st.journal), `${q.id}.${st.id}: journal`);
      const last = st.chat.at(-1);
      assert.ok(!last.map && !last.if && !last.ifNot, `${q.id}.${st.id}: fallback`);
      for (const e of st.chat) for (const l of e.lines) assert.ok(fits(l.text) && ascii(l.text), l.text);
    }
  }
  // plan 7 and EPISODE7 section 2: the canon rewards, scaled
  assert.deepEqual([REWARDS_EP7.hearth.item, REWARDS_EP7.hearth.qty, REWARDS_EP7.hearth.gold], ['hi_potion', 2, 400]);
  assert.deepEqual([REWARDS_EP7.hearth_ether.item, REWARDS_EP7.hearth_ether.qty], ['hi_ether', 2]);
  assert.equal(REWARDS_EP7.hearth_coat.item, 'winterwatch_coat');
  assert.deepEqual([REWARDS_EP7.reliquary.gold, REWARDS_EP7.reliquary.qty], [450, 2]);
  assert.equal(REWARDS_EP7.streets.item, 'snowrest_scarf');
  assert.deepEqual([REWARDS_EP7.gift_truth.item, REWARDS_EP7.gift_kind.item], ['open_gate', 'kept_lamp']);
  for (const [map, list] of Object.entries(BANTER_EP7)) {
    assert.equal(BANTER[map], list, `banter ${map}`);
    for (const e of list) assert.ok(e.lines.length <= 2, `${map}: at most two boxes`);
  }
  const fl = (x) => (f) => ['mira_joined', 'bram_joined', x].includes(f);
  const told = pickChat(BANTER.ep7_white_road, fl('told_vex'), 'ep7_white_road').lines;
  const spared = pickChat(BANTER.ep7_white_road, fl('spared_vex'), 'ep7_white_road').lines;
  assert.equal(told.length, spared.length);
  assert.notEqual(told[0].text, spared[0].text, 'one Talk line by the wall choice (plan 7.3)');
});

test("rewards and battle ids agree with E7-battle's data when it exists", async (t) => {
  if (!existsSync(join(NEXT, 'src', 'data', 'ep7', 'items.js')) || !existsSync(join(NEXT, 'src', 'data', 'ep7', 'enemies.js'))) {
    t.skip('E7-battle items.js / enemies.js not written yet'); return;
  }
  const I = await import('../../src/data/ep7/items.js');
  const all = { ...(I.EP7_CONSUMABLES || {}), ...(I.EP7_KEY_ITEMS || {}), ...(I.EP7_UNIQUES || {}), ...(I.EP7_ITEMS || {}) };
  const ep6 = await import('../../src/data/ep6/items.js');
  const ids = new Set([...Object.keys(all), ...Object.keys(ep6.EP6_KEY_ITEMS || {})]);
  for (const [k, r] of Object.entries(REWARDS_EP7)) if (!['hi_ether', 'hi_potion'].includes(r.item)) assert.ok(ids.has(r.item), `${k}: ${r.item}`);
  const E = await import('../../src/data/ep7/enemies.js');
  const foes = E.EP7_ENEMIES || {};
  for (const id of Object.keys(EP7_BESTIARY)) assert.ok(foes[id], `bestiary ${id} is an enemy`);
  for (const id of Object.keys(foes)) assert.ok(EP7_BESTIARY[id], `enemy ${id} has a bestiary entry`);
  for (const id of Object.keys(EP7_BOSS_CARDS)) assert.ok(foes[id] && foes[id].boss, `card ${id} is a boss`);
});

test('text: 10 banners (Palehaven conditional), 3 books, the barks, 11 bestiary entries naming their cold, cards and credits fit', () => {
  assert.equal(Object.keys(EP7_BANNERS).length, 10);
  for (const m of Object.keys(EP7_BANNERS)) { assert.ok(EP7_MAPS.includes(m), m); assert.equal(BANNERS[m], EP7_BANNERS[m], m); }
  assert.equal(STORY.bannerFor('ep7_palehaven', null, (f) => f === 'doors_reopened').sub, 'The Returned Names');
  assert.equal(STORY.bannerFor('ep7_palehaven', null, () => false).sub, 'The Unlit Hearth');
  assert.deepEqual([EP7_BANNERS.ep7_vault_f1.sub, EP7_BANNERS.ep7_vault_f2.sub, EP7_BANNERS.ep7_vault_f3.sub],
    ['I. The Vanishing Steps', 'II. The Hall of Borrowed Light', 'III. The Stillheart Sanctum']);
  for (const bn of Object.values(EP7_BANNERS)) assert.ok(bn.title.length <= 32 && (!bn.sub || bn.sub.length <= 32), bn.title);
  for (const id of ['keeper_book', 'missing_streets', 'keeper_charter']) {
    assert.equal(BOOKS[id], EP7_BOOKS[id]);
    for (const p of EP7_BOOKS[id].pages) assert.ok(fits(p) && ascii(p), p);
  }
  assert.equal(EP7_BOOKS.keeper_charter.pages.join(' '), 'The true keeper must SHELTER the living, REMEMBER the absent, and RETURN when a lost voice calls.');
  const want = { first_held: "ASTA. And there's the road she walked.", first_letgo: "Two at a time. The road can't remember more than we can.",
    first_reread: "Say it again and it's the newest. The old one goes first.", first_grip: "That door's holding on to somebody.",
    would_fade: "Not while we're standing on it.", call_low_mp: 'Keep something back to call us.' };
  for (const [id, text] of Object.entries(want)) {
    assert.equal(BARKS[id], EP7_BARKS[id]);
    const g = { counters: {} };
    const boxes = STORY.takeBark(g, id, (f) => ['ep7_started', 'mira_joined', 'bram_joined', 'call_learned'].includes(f));
    assert.deepEqual(boxes.map((x) => x.text), [text], id);
    assert.equal(STORY.takeBark(g, id, () => true).length, 0, `${id} once`);
    assert.equal(STORY.takeBark({ counters: {} }, id, (f) => ['mira_joined', 'bram_joined'].includes(f)).length, 0, `${id}: not before Episode 7`);
  }
  assert.equal(EP7_BATTLE_TEXT.low_mp, 'Keep something back to call us.');
  const foes = ['rime_wolf', 'snow_wisp', 'hush_owl', 'crystal_crawler', 'frostbound_revenant', 'ice_knight', 'rimed_page', 'pale_lantern',
    'white_phantom', 'closed_gate', 'lost_letter'];
  assert.deepEqual(Object.keys(EP7_BESTIARY), foes);
  for (const id of foes) {
    assert.equal(BESTIARY[id], EP7_BESTIARY[id]);
    assert.equal(EP7_BESTIARY[id].lore.length, 3);
    assert.match(EP7_BESTIARY[id].lore.join(' '), /frost|cold|Farewell|Borrow/i, `${id}: names its cold`);
  }
  for (const c of CREDITS_EP7) for (const l of [c.heading, ...c.lines]) assert.ok(l.length <= 42 && ascii(l), `credit ${l}`);
  assert.deepEqual([END_CARD_EP7.text, END_CARD_EP7.sub], ['To be continued', 'Episode 8 is not playable yet.']);
  assert.deepEqual([END_TITLE_EP7.text, END_TITLE_EP7.sub], ['End of Episode 7', 'The Vanishing World']);
  assert.deepEqual([EPISODE8_CARD.text, EPISODE8_CARD.sub], ['Episode 8: The Last Word', 'The lists were written here.']);
  assert.equal(END_CARD_EP6_LIVE.sub, 'Episode 7 begins in the morning.');
  for (const s of [END_CARD_EP7.text, END_CARD_EP7.sub, END_CARD_EP6_LIVE.sub, EPISODE8_CARD.text, EPISODE8_CARD.sub, END_TITLE_EP7.text,
    END_TITLE_EP7.sub]) assert.ok(s.length <= 42 && ascii(s), s);
  const flat = (v) => (typeof v === 'string' ? [v] : Object.values(v).flatMap(flat));
  for (const t of flat(EP7_BATTLE_TEXT)) assert.ok(t.length <= 100 && fits(t) && ascii(t), t);
  // Rime and Call wording of plan 6.3 to 6.5, word for word
  assert.equal(EP7_BATTLE_TEXT.defend_help, 'Shake off the cold.');
  assert.equal(EP7_BATTLE_TEXT.call_help, "Say an ally's name. Breaks a farewell.");
  assert.ok(EP7_BATTLE_TEXT.call_help.length <= 40);
  assert.equal(EP7_BATTLE_TEXT.call_learn, "{hero} learned Call. Say an ally's name: the cold lets go of them, and they come back sooner.");
  assert.equal(EP7_BATTLE_TEXT.frozen_by.bram, "Bram's name frosts over. He misses his turn.");
  assert.equal(EP7_BATTLE_TEXT.farewell_broken_by.mira, 'Mira hears her name. The farewell does not hold.');
  assert.equal(EP7_BATTLE_TEXT.farewell_read, 'The Phantom turns to {name}. It is saying goodbye.');
  assert.equal(EP7_BATTLE_TEXT.can_call_by.mira, '{hero} can call her.');
  assert.equal(EP7_BATTLE_TEXT.borrow_read, "The Lantern borrows {name}'s light.");
  assert.equal(EP7_BATTLE_TEXT.no_borrow_hero, 'It cannot hold a kept light.');
  assert.equal(EP7_BATTLE_TEXT.no_cold, 'No cold to call through.');
  assert.equal(EP7_BATTLE_TEXT.answer_fails, 'A farewell is not a decree.');
  assert.equal(EP7_BATTLE_TEXT.shut, 'The gate shuts. {hero} cannot call.');
  assert.equal(EP7_BATTLE_TEXT.ward_thaws, "The ward thaws. Fire cracks the Phantom's frost.");
  assert.equal(EP7_BATTLE_TEXT.blizzard, "The cold gathers in the Phantom's cloak...");
  for (const [id, c] of Object.entries(EP7_BOSS_CARDS)) {
    assert.ok(c.name.length <= 24 && c.sub.length <= 28, id);
    assert.ok(EP7_ARC_LINES[id] && fits(EP7_ARC_LINES[id]), `${id}: arc line`);
  }
  assert.deepEqual(EP7_BOSS_CARDS, { pale_lantern: { name: 'THE PALE LANTERN', sub: 'Keeper of Borrowed Light' },
    white_phantom: { name: 'THE WHITE PHANTOM', sub: 'Keeper of the Stillheart' } });
});

test('inspect lines and stone names: registered, fit, declared flags, a fallback last, the plan objects present, own save-bell keys', async () => {
  const { lines: EP1_LINES } = await import('../../src/data/story/ep1.js');
  for (const [id, v] of Object.entries(EP7_LINES)) {
    assert.equal(STORY.LINES[id], v, `${id} registered`);
    assert.ok(!(id in EP1_LINES), `${id} is an Episode 1 text key`);
    const walk = (x) => {
      if (typeof x === 'string') { assert.ok(fits(x) && ascii(x), `${id}: ${boxLines(x).join(' / ')}`); return; }
      assert.ok(Array.isArray(x) && x.length, `${id}: empty`);
      if (x.every((e) => typeof e === 'string')) { x.forEach(walk); return; }
      const last = x.at(-1);
      assert.ok(!last.if && !last.ifNot, `${id}: ends on a fallback`);
      for (const e of x) { for (const f of flagsOf(e)) assert.ok(KNOWN(f), `${id}: ${f}`); walk(e.lines); }
    };
    walk(v);
    assert.ok(resolve(v, () => false, null).length >= 1);
  }
  assert.ok(Object.keys(EP7_LINES).length - Object.keys(EP7_STONES).length >= 34, `inspect lines: ${Object.keys(EP7_LINES).length}`);
  for (const id of ['ep7_travelers_wall', 'ep7_fade', 'ep7_ghost_trail', 'ep7_stone_dim', 'ep7_stone_lit', 'ep7_sol_twine', 'ep7_tally', 'ep7_post_box',
    'ep7_icegate', 'ep7_vanishing_mark', 'ep7_iced_door', 'ep7_hearth_cold', 'ep7_keeper_notice', 'ep7_letters_face', 'ep7_beacon_north',
    'ep7_vault_gate', 'ep7_frost_brick', 'ep7_ice_glass', 'ep7_frost_door', 'ep7_borrowed_lamp', 'ep7_letter_wall', 'ep7_listening_bell',
    'ep7_mara_tag', 'ep7_charter_shelter', 'ep7_charter_remember', 'ep7_charter_return', 'ep7_round_door', 'ep7_stillheart_heart',
    'ep7_seventh_floor', 'ep7_broken_roof', 'ep7_star_stair', 'ep7_watch_oath', 'ep7_watch_bell', 'ep7_stove', 'ep7_empty_frame',
    'ep7_court_portrait']) assert.ok(EP7_LINES[id], id);
  for (const [id, flag] of [['ep7_vanishing_mark', 'doors_reopened'], ['ep7_iced_door', 'doors_reopened'], ['ep7_hearth_cold', 'hearth_lit'],
    ['ep7_listening_bell', 'stillheart_restored'], ['ep7_travelers_wall', 'vex_name_whole'], ['ep7_letters_face', 'doors_reopened']]) {
    assert.notDeepEqual(resolve(EP7_LINES[id], (f) => f === flag), resolve(EP7_LINES[id], () => false), id);
  }
  assert.equal(EP7_LINES.ep7_watch_oath, 'Cut over the inner door: A NAME IS A PROMISE. A KEEPER ERASES NO SOUL.');
  assert.match(EP7_LINES.ep7_beacon_north, /This beacon stood before snow had a name\. Each returning traveler adds one shard of glass\./);
  assert.match(resolve(EP7_LINES.ep7_vanishing_mark, () => false).map((x) => x.text).join(' '),
    /A hollow space between them grows whenever a person's name is forgotten\./);
  // the stones: one key each, flavor only (a name and the road or Vault remembering), no Episode 1 to 6 person's name
  assert.equal(Object.keys(EP7_STONES).length, 21);
  const taken = new Set(Object.values(NPCS).map((n) => String(n.name).toLowerCase()));
  for (const [ev, st] of Object.entries(EP7_STONES)) {
    assert.match(ev, /^ns_[a-z]+$/);
    assert.equal(st.key, `stone_${ev.slice(3)}`);
    assert.match(st.text, /^[A-Z]+\. The (road|Vault) remembers (her|him)\.$/);
    assert.ok(!taken.has(ev.slice(3)), `${ev}: a name an NPC already has`);
  }
  for (const ev of ['ns_asta', 'ns_bo', 'ns_nyx', 'ns_ilka', 'ns_senna', 'ns_arvo', 'ns_liesl', 'ns_oskar', 'ns_dagny', 'ns_runa', 'ns_tuva',
    'ns_kell']) assert.ok(EP7_STONES[ev], `plan stone ${ev}`);
  assert.ok(!EP7_STONES.ns_hob && !EP7_STONES.ns_ansel, 'Hob and Ansel are Episode 1 people');
});

test('the Ledger: Palehaven rows counted only when live, reached at palehaven_arrived, the hero unkept, Nox and Marten hidden until read', async () => {
  assert.equal(PLACES.palehaven, 'Palehaven');
  assert.equal(REACHED.palehaven, 'palehaven_arrived');
  assert.equal(PLACES.the_road, 'The Road');
  assert.equal(EXCLUDED.ep7_innkeeper, 'a shop counter');
  for (const [a, to] of [['keeper', 'nox'], ['nox_t', 'nox'], ['eira_forge', 'eira'], ['sol_waystation', 'sol']]) assert.equal(ALIASES[a], to);
  for (const r of EP7_LEDGER) { assert.equal(LEDGER.filter((x) => x.id === r.id).length, 1, r.id); assert.ok(KNOWN(r.flag), r.flag); }
  const rows = (flags) => { const s = new Set(flags); return ledgerRows((f) => s.has(f), { all: false }).filter((x) => x.place === 'palehaven'); };
  assert.equal(rows(['ep6_complete']).length, 0, 'not reached');
  const met = rows(['palehaven_arrived', 'met_keeper']);
  assert.equal(met.find((x) => x.id === 'nox').name, '???');
  assert.ok(met.find((x) => x.id === 'bryn').kept && !met.find((x) => x.id === 'eira').kept);
  const after = rows(['palehaven_arrived', 'nox_named', 'doors_reopened']);
  assert.equal(after.find((x) => x.id === 'nox').name, 'Nox');
  assert.ok(after.find((x) => x.id === 'nox').kept && after.find((x) => x.id === 'eira').kept);
  for (const r of EP7_LEDGER) {
    for (const w of typeof r.why === 'function' ? [r.why(() => true), r.why(() => false)] : [r.why]) assert.ok(w.length <= 80 && ascii(w), w);
  }
  for (const id of Object.keys(EP7_NPCS)) assert.ok(LEDGER.some((x) => x.id === id) || ALIASES[id] || EXCLUDED[id], `${id}: a row, an alias or excluded`);
  const heroRow = LEDGER.find((x) => x.id === 'hero');
  if (heroRow) {
    const by = (f) => ledgerRows(f, { all: true }).find((x) => x.id === 'hero').kept;
    assert.equal(by((f) => f in EP7_FLAGS || f === 'ep6_complete'), by((f) => f === 'ep6_complete'), 'Episode 7 keeps nothing on the hero row');
  }
  const vex = LEDGER.find((x) => x.id === 'vex');
  assert.deepEqual([vex.name, vex.place, vex.flag, vex.why], ['Vex Quill', 'the_road', 'vex_name_whole', 'His own name, whole in the ice.']);
  const fresh = await import(`../../src/data/ep7/ledger.js?off=${Date.now()}`);
  const n = LEDGER.length;
  fresh.register({ ep7Live: false });
  assert.equal(LEDGER.length, n);
});

test('the pack modules export register(), and Episode 7 is not reachable from core alone', async () => {
  for (const name of ['flags', 'npcs', 'quests', 'text', 'story', 'ledger']) {
    const mod = await import(`../../src/data/ep7/${name}.js`);
    assert.equal(typeof mod.register, 'function', name);
    assert.equal(mod.default, mod.register, `${name} default export`);
  }
  assert.equal(Q.mainQuestFor((f) => ['ep6_started', 'ep6_complete'].includes(f)).id, 'main_ep6');
  // With the switch off, the opener, the hold and the epilogue6 journal are not pushed (a fresh copy of the module).
  const fresh = await import(`../../src/data/ep7/quests.js?off=${Date.now()}`);
  const before = TALK_PREPEND.length;
  fresh.register({ ep7Live: false });
  assert.equal(TALK_PREPEND.length, before);
  for (const q of ALL_SIDE_QUESTS) for (const st of q.steps || []) assert.ok(!(st.chat || []).includes(fresh.MORNING_HOLD_EP7), `${q.id}: hold pushed while off`);
  for (const q of fresh.SIDE_QUESTS_EP7) { const i = ALL_SIDE_QUESTS.indexOf(q); if (i >= 0) ALL_SIDE_QUESTS.splice(i, 1); }
  const qi = Q.QUEST_EXT.findIndex((e) => e[1] === fresh.MAIN_QUEST_EP7);
  if (qi >= 0) Q.QUEST_EXT.splice(qi, 1);
});
