// Episode 5 pack data (E5-story): flags, the Saffron Haven cast and the returning-cast lines, the main quest and its Talk,
// the side quests, banners, inspect lines, books, barks, bestiary, battle lines, credits and end cards, the Ledger rows.
// Each module registers twice without duplicates (the pack entry may retry), an old scene is never hidden behind an
// Episode 5 line, nothing new answers before Episode 5 starts, and the late names stay unsaid before their flags.
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
import { register as regEp4Quests, MAIN_QUEST_EP4 } from '../../src/data/ep4/quests.js';
import { compoundTerms, withCompound } from '../../src/data/ep4/field/seams.js';
import { EP5_FLAGS, EP5_MAPS, register as regFlags } from '../../src/data/ep5/flags.js';
import { EP5_NPCS, EP5_TALK_PREPEND, EP5_SPEAKERS, SEL_TWIN, HAVEN_TWIN, register as regNpcs } from '../../src/data/ep5/npcs.js';
import { MAIN_QUEST_EP5, SIDE_QUESTS_EP5, BANTER_EP5, TALK_OPENER_EP5, TALK_OPENER_EP5_FAR, QUEST_EXT_ENTRY, REWARDS_EP5,
  register as regQuests } from '../../src/data/ep5/quests.js';
import { EP5_BANNERS, EP5_LINES, EP5_BOOKS, EP5_BARKS, EP5_BESTIARY, EP5_BATTLE_TEXT, EP5_BOSS_CARDS, EP5_ARC_LINES, CREDITS_EP5,
  END_CARD_EP5, END_CARD_EP4_LIVE, EPISODE6_CARD, register as regText } from '../../src/data/ep5/text.js';
import { EP5_LEDGER, register as regLedger } from '../../src/data/ep5/ledger.js';
import { scenes } from '../../src/data/ep5/story.js';
import { NEXT } from './_harness.mjs';

const { NPCS, SPEAKER_NAMES, talkTo, prependTalk } = NPCMOD;
const { FLAGS, FLAG_IDS, ALL_SIDE_QUESTS, BANTER, TALK_PREPEND, pickChat, currentStep } = Q;
const PARTY = ['hero', 'mira', 'bram'];
const ascii = (s) => /^[\x20-\x7e]*$/.test(s);
const flagsOf = (e) => [e?.if, e?.ifNot].flat().filter(Boolean);
const termsOf = (f) => (compoundTerms(f) || [[f, true]]).map(([x]) => x);
const KNOWN = (f) => termsOf(f).every((x) => x in FLAGS || x === 'tier_1');
const HAVEN = ['ep5_saffron', 'ep5_sh_inn', 'ep5_sh_shop', 'ep5_sh_smithy', 'ep5_sh_observatory'];

// The ep4 pack registers first in the game (index.js run(): ensureEp4), so its NPCs and their prepends are already in.
regEp4Flags(); regEp4Npcs(); regEp4Quests({ ep4Live: true });

// Every talk result that is a scene, for a bounded set of flag states, BEFORE the ep5 pack prepends anything.
const RETURNING = Object.keys(EP5_TALK_PREPEND);
const statesFor = (id) => {
  const pool = new Set(['ep4_started', 'ep4_complete', 'vw_restored', 'ep5_started', 'ep5_complete', 'haven_restored']);
  for (const e of NPCS[id]?.talk || []) for (const f of flagsOf(e)) pool.add(f);
  const list = [...pool];
  const out = [];
  let seed = 11;
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
for (let i = 0; i < 2; i++) { regFlags(); regNpcs(); regQuests({ ep5Live: true }); regText(); regLedger({ ep5Live: true }); }

test('flags: every plan 2.2 flag declared with a meaning, pushed once onto FLAG_IDS, none from an earlier episode', () => {
  const plan = ['ep5_started', 'ship_boarded', 'ship_first_fight_done', 'road_landed', 'haven_arrived', 'met_sel', 'star_reading_done',
    'sky_learned', 'gnomon_get', 'lab_entered', 'lab_f1_done', 'knight_defeated', 'lab_f2_done', 'vex_gallery_met', 'sel_walked_in',
    'oracle_door_open', 'oracle_defeated', 'chart_restored', 'fragment5_get', 'roads_returned', 'haven_restored', 'ep5_complete',
    'ep5_morning_done', 'ship_arrived', 'bram_told', 'bram_spared', 'saw_glass_flat', 'tent_rested', 'bram_asked', 'saw_haven',
    'moonwell_seen', 'lab_f1_arrived', 'lab_f2_arrived', 'lab_f3_arrived', 'sel_memory_1', 'sel_memory_2', 'sel_memory_3',
    'landing_shelter', 'landing_truth', 'landing_return', 'sun_key_found', 'fifth_list_get', 'star_restored', 'star_hidden',
    'plate_f1_open', 'roads_started', 'testimony_yara', 'testimony_kamal', 'testimony_nasrin', 'moonwell_woken', 'roads_done',
    'reliquary_found', 'bells_started', 'bell_1_found', 'bell_2_found', 'bell_3_found', 'bells_done', 'dune_key_f1', 'dune_key_f2'];
  for (const f of plan) assert.ok(EP5_FLAGS[f] && EP5_FLAGS[f].length > 10, `flag ${f}`);
  const earlier = new Set([...Object.keys(Q.EP2_FLAGS), ...Object.keys(Q.EP3_FLAGS)]);
  for (const f of Object.keys(EP5_FLAGS)) {
    assert.equal(FLAG_IDS.filter((x) => x === f).length, 1, `${f} once in FLAG_IDS`);
    assert.ok(!earlier.has(f), `${f} is an Episode 2 or 3 flag`);
    assert.ok(ascii(EP5_FLAGS[f]), `${f}: ASCII`);
  }
  assert.ok(!('credits5_rolled' in EP5_FLAGS), 'credits5_rolled is a counter, not a flag');
});

test('the Saffron Haven cast: records, maps, stages, the twins, scenes exist, no portrait aliases', () => {
  for (const id of ['sel', 'yara', 'kamal', 'nasrin', 'laleh', 'omar', 'yasmin', 'hassan', 'ep5_innkeeper', 'tamir']) assert.equal(NPCS[id], EP5_NPCS[id], id);
  for (const [id, rec] of Object.entries(EP5_NPCS)) {
    assert.ok(EP5_MAPS.includes(rec.map), `${id}: map ${rec.map}`);
    assert.ok(!rec.portrait, `${id}: no portrait (plan 9.5)`);
    const last = rec.talk.at(-1);
    assert.ok(!last.if && !last.ifNot && last.lines, `${id}: ends on a fallback`);
    for (const e of rec.talk) {
      for (const f of flagsOf(e)) assert.ok(KNOWN(f), `${id}: flag ${f}`);
      if (e.scene) assert.ok(scenes[e.scene], `${id}: scene ${e.scene}`);
    }
    for (const f of flagsOf(rec.show)) assert.ok(KNOWN(f), `${id}: show ${f}`);
  }
  const stages = new Set(Object.values(EP5_NPCS).flatMap((r) => r.talk.flatMap(flagsOf)));
  for (const f of ['haven_arrived', 'star_reading_done', 'lab_f2_done', 'haven_restored', 'ep5_complete']) assert.ok(stages.has(f), `stage ${f}`);
  for (const [id, n] of Object.entries(EP5_SPEAKERS)) assert.equal(SPEAKER_NAMES[id], n);
  assert.equal(NPCS.ep5_innkeeper.service.price, 100);
  assert.deepEqual([NPCS.yasmin.service.id, NPCS.hassan.service.id, NPCS.omar.service.id], ['saffron_supplies', 'copperwind', 'pathkeeper']);
  // the twins stand down while their scene spawns can be on screen, and come back after ep5_complete
  const shown = (id, ...f) => NPCMOD.isPresent(id, withCompound((x) => f.includes(x)));
  assert.ok(shown('sel', 'haven_arrived') && !shown('sel', 'sel_walked_in') && shown('sel', 'sel_walked_in', 'ep5_complete'));
  assert.ok(shown('yara', 'haven_arrived') && !shown('yara', 'haven_arrived', 'chart_restored') && shown('yara', 'haven_arrived', 'chart_restored', 'ep5_complete'));
  assert.ok(!shown('nasrin', 'chart_restored') && shown('nasrin', 'haven_arrived'));
  assert.ok(!shown('tamir', 'roads_returned') && shown('tamir', 'ep5_complete'));
  assert.equal(SEL_TWIN, 'all:sel_walked_in,!ep5_complete');
  assert.equal(HAVEN_TWIN, 'all:chart_restored,!ep5_complete');
  // talk walks the episode: Sel's scene first, Kamal starts Three Roads Home, Hassan the bells
  const has = (...f) => (x) => f.includes(x);
  assert.deepEqual(talkTo('sel', has('haven_arrived')), { scene: 'meet_sel' });
  assert.deepEqual(talkTo('kamal', has('haven_arrived', 'met_sel')), { scene: 'roads_start' });
  assert.deepEqual(talkTo('hassan', has('haven_arrived')), { scene: 'bells_start' });
  assert.deepEqual(talkTo('hassan', has('haven_arrived', 'bells_started', 'bell_1_found', 'bell_2_found', 'bell_3_found')), { scene: 'bells_done' });
  assert.deepEqual(talkTo('yara', has('haven_arrived', 'roads_started')), { scene: 'testimony_yara' });
  assert.deepEqual(talkTo('nasrin', has('haven_arrived', 'roads_started')), { scene: 'testimony_nasrin' });
});

test('every NPC and returning-cast line fits a box, is ASCII, and says Ishra or Tamir only after their flags', () => {
  const bad = [];
  const check = (where, e) => {
    for (const l of [e.lines].flat().filter(Boolean)) {
      const t = typeof l === 'string' ? l : l.text;
      if (!fits(t)) bad.push(`${where}: ${boxLines(t).join(' / ')}`);
      if (!ascii(t)) bad.push(`${where}: non-ASCII`);
      if (/\bIshra\b/.test(t) && ![e.if].flat().some((f) => ['sel_memory_3', 'chart_restored', 'haven_restored', 'ep5_complete'].includes(f))) bad.push(`${where}: Ishra early`);
      if (/\bTamir\b/.test(t) && ![e.if].flat().some((f) => ['roads_returned', 'haven_restored', 'ep5_complete'].includes(f))) bad.push(`${where}: Tamir early`);
      if (typeof l === 'object') assert.ok(l.who === null || PARTY.includes(l.who), `${where}: who ${l.who}`);
    }
  };
  for (const [id, rec] of Object.entries(EP5_NPCS)) for (const e of rec.talk) check(id, e);
  for (const [id, list] of Object.entries(EP5_TALK_PREPEND)) for (const e of list) check(id, e);
  assert.deepEqual(bad, []);
  for (const id of ['lyra_n', 'hale', 'ada', 'joss', 'garrick_n', 'rusk', 'bess', 'ilya', 'wren', 'elian', 'holt', 'hazel']) assert.ok(EP5_TALK_PREPEND[id], `returning ${id}`);
  for (const [id, list] of Object.entries(EP5_TALK_PREPEND)) {
    assert.ok(NPCS[id], `${id} is a real NPC`);
    assert.ok(list.some((e) => [e.if].flat().includes('ep5_started')), `${id}: an Episode 5 start line`);
    assert.ok(list.some((e) => [e.if].flat().includes('ep5_complete')), `${id}: an after line`);
  }
});

test('returning-cast lines answer in Episode 5 and never hide an Episode 1 to 4 scene; nothing changes before Episode 5', () => {
  for (const id of Object.keys(BEFORE)) {
    for (const { st, r } of BEFORE[id]) {
      const now = talkTo(id, (f) => st.has(f));
      if (r && r.scene) assert.deepEqual(now, r, `${id}: a scene was hidden for ${[...st].join(',')}`);
      if (!st.has('ep5_started') && !st.has('ep5_complete')) assert.deepEqual(now, r, `${id}: changed before Episode 5`);
    }
  }
  const has = (...f) => (x) => f.includes(x);
  assert.match(talkTo('holt', has('ep5_started')).lines[0].text, /on a ship/);
  assert.match(talkTo('holt', has('ep5_started', 'ep5_complete')).lines[0].text, /star for everyone/);
  assert.match(talkTo('lyra_n', has('lyra_named', 'ep4_complete', 'ep5_started')).lines[0].text, /gates are open/);
  const joss = talkTo('joss', has('ep4_complete', 'ep5_started')).lines;
  assert.deepEqual(joss.map((l) => l.who), ['joss', 'bram', 'joss']);
  // registered twice: still one copy of each prepended entry
  const before = NPCS.holt.talk.length;
  regNpcs();
  assert.equal(NPCS.holt.talk.length, before);
  assert.equal(prependTalk('holt', []), 0);
});

test('Episode 5 main quest: steps in order, journal and aims fit, Talk names the next step on every map, ahead of Episode 4', () => {
  assert.deepEqual(MAIN_QUEST_EP5.steps.map((s) => s.id), ['crossing', 'road', 'haven', 'lab_f1', 'lab_f2', 'lab_f3', 'oracle', 'roads', 'epilogue5']);
  assert.deepEqual(QUEST_EXT_ENTRY, ['ep5_started', MAIN_QUEST_EP5]);
  assert.equal(Q.QUEST_EXT.filter((e) => e[0] === 'ep5_started').length, 1);
  const voices = new Set();
  for (const st of MAIN_QUEST_EP5.steps) {
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
        assert.ok(!/\b(Ishra|Tamir)\b/.test(l.text), `${st.id}: a late name in Talk`);
      }
    }
    for (const map of EP5_MAPS) assert.ok(pickChat(st.chat, () => false, map), `${st.id}: no Talk on ${map}`);
  }
  assert.ok(voices.has('mira') && voices.has('bram'));
  // an Episode 5 save also has ep4_started: Episode 5's quest answers first
  const f5 = new Set(['ep4_started', 'ep4_complete', 'ep5_started']);
  assert.equal(Q.mainQuestFor((f) => f5.has(f)).id, 'main_ep5');
  assert.equal(Q.mainQuestFor((f) => ['ep4_started', 'ep4_complete'].includes(f)), MAIN_QUEST_EP4, 'Episode 4 unchanged');
  // the step follows the flags; the aims follow aimIf
  const flags = new Set(['ep5_started', 'road_landed', 'haven_arrived']);
  assert.equal(currentStep((f) => flags.has(f), MAIN_QUEST_EP5).id, 'haven');
  flags.add('met_sel');
  assert.equal(Q.aimFor(currentStep((f) => flags.has(f), MAIN_QUEST_EP5), (f) => flags.has(f)), 'Climb the Armillary Tower');
  // the first road hint names the action
  const road = MAIN_QUEST_EP5.steps[1];
  assert.match(pickChat(road.chat, (f) => f === 'saw_glass_flat', 'ep5_caravan_road').lines[0].text, /Set the dial to dawn and walk the long shadow/);
  // the epilogue names something doable after ep5_complete on every Haven map
  const ep = MAIN_QUEST_EP5.steps.at(-1);
  for (const map of HAVEN) assert.ok(/Lantern|bells|Hassan|Moonwell|Omar/.test(pickChat(ep.chat, (f) => f === 'ep5_complete', map).lines[0].text), map);
});

test('while EP5_LIVE, Talk points an Episode 4 finisher at the ship; never a Fine Print run, never once started', () => {
  for (const e of [TALK_OPENER_EP5, TALK_OPENER_EP5_FAR]) assert.equal(TALK_PREPEND.filter((x) => x === e).length, 1);
  assert.ok(TALK_PREPEND.indexOf(TALK_OPENER_EP5) < TALK_PREPEND.indexOf(TALK_OPENER_EP5_FAR));
  const has = (...f) => (x) => f.includes(x);
  const both = [TALK_OPENER_EP5, TALK_OPENER_EP5_FAR];
  assert.match(pickChat(both, has('ep4_complete'), 'ep4_valewyn').lines[0].text, /south landing/);
  assert.match(pickChat(both, has('ep4_complete'), 'emberpeak').lines[0].text, /south landing/);
  assert.equal(pickChat(both, has('ep4_complete', 'ep5_started'), 'ep4_valewyn'), null);
  assert.equal(pickChat(both, has('ep4_complete', 'tier_1'), 'ep4_valewyn'), null);
  assert.equal(pickChat(both, has('ep4_started'), 'ep4_valewyn'), null, 'Episode 4 in progress is untouched');
  for (const e of both) for (const l of e.lines) assert.ok(fits(l.text) && ascii(l.text), l.text);
});

test('side quests: givers, rewards, counters, journal and Talk fallbacks; pushed once', () => {
  assert.deepEqual(SIDE_QUESTS_EP5.map((q) => q.id), ['three_roads_home', 'lost_reliquary', 'hassans_bells']);
  for (const q of SIDE_QUESTS_EP5) {
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
  assert.equal(REWARDS_EP5.roads_mantle.item, 'nomad_mantle');
  assert.equal(REWARDS_EP5.roads.gold, 300);
  assert.equal(REWARDS_EP5.bells.item, 'copperwind_bell');
  assert.deepEqual([REWARDS_EP5.gift_truth.item, REWARDS_EP5.gift_hidden.item], ['caravan_compass', 'veiled_star']);
  for (const [map, list] of Object.entries(BANTER_EP5)) {
    assert.equal(BANTER[map], list, `banter ${map}`);
    for (const e of list) for (const l of e.lines) assert.ok(fits(l.text) && ascii(l.text), l.text);
  }
});

test('rewards and battle ids agree with E5-battle\'s data when it exists', async (t) => {
  const path = join(NEXT, 'src', 'data', 'ep5', 'items.js');
  if (!existsSync(path)) { t.skip('E5-battle items.js not written yet'); return; }
  const I = await import('../../src/data/ep5/items.js');
  const ids = new Set(Object.keys({ ...I.EP5_CONSUMABLES, ...I.EP5_KEY_ITEMS, ...I.EP5_UNIQUES }));
  for (const [k, r] of Object.entries(REWARDS_EP5)) if (!['hi_ether'].includes(r.item)) assert.ok(ids.has(r.item), `${k}: ${r.item}`);
  const E = await import('../../src/data/ep5/enemies.js');
  for (const id of Object.keys(EP5_BESTIARY)) assert.ok(E.EP5_ENEMIES[id], `bestiary ${id} is an enemy`);
  for (const id of Object.keys(E.EP5_ENEMIES)) assert.ok(EP5_BESTIARY[id], `enemy ${id} has a bestiary entry`);
  for (const id of Object.keys(EP5_BOSS_CARDS)) assert.ok(E.EP5_ENEMIES[id] && E.EP5_ENEMIES[id].boss, `card ${id} is a boss`);
});

test('text: 11 banners (the Haven conditional), 3 books, the barks, 12 bestiary entries naming their sky, credits and cards fit', () => {
  assert.equal(Object.keys(EP5_BANNERS).length, 11);
  for (const m of EP5_MAPS) assert.equal(BANNERS[m], EP5_BANNERS[m], m);
  assert.equal(STORY.bannerFor('ep5_saffron', null, (f) => f === 'haven_restored').sub, 'Every Road Remembers');
  assert.equal(STORY.bannerFor('ep5_saffron', null, () => false).sub, 'The Moonwell Caravanserai');
  for (const b of Object.values(EP5_BANNERS)) assert.ok(b.title.length <= 32 && (!b.sub || b.sub.length <= 32), b.title);
  for (const id of ['haven_charts', 'travelers_log', 'well_vows']) {
    assert.equal(BOOKS[id], EP5_BOOKS[id]);
    for (const p of EP5_BOOKS[id].pages) assert.ok(fits(p) && ascii(p), p);
  }
  for (const id of ['first_shade', 'first_shove_shade', 'first_window', 'first_lamp', 'sand_would_run', 'sky_low_mp']) {
    assert.equal(BARKS[id], EP5_BARKS[id]);
    const g = { counters: {} };
    const boxes = STORY.takeBark(g, id, (f) => ['ep5_started', 'mira_joined', 'bram_joined', 'sky_learned'].includes(f));
    assert.ok(boxes.length >= 1, id);
    for (const x of boxes) assert.ok(fits(x.text) && ascii(x.text), x.text);
    assert.equal(STORY.takeBark(g, id, () => true).length, 0, `${id} once`);
  }
  assert.equal(STORY.takeBark({ counters: {} }, 'sky_low_mp', (f) => ['sky_learned', 'mira_joined'].includes(f))[0].text, 'Keep something back to turn the sky.');
  assert.equal(EP5_BATTLE_TEXT.low_mp, 'Keep something back to turn the sky.');
  // the ship's choice changes Bram's half of the first shade bark, and only that
  const shade = (f) => STORY.takeBark({ counters: {} }, 'first_shade', (x) => ['ep5_started', 'mira_joined', 'bram_joined', f].includes(x)).map((x) => x.text);
  const told = shade('bram_told'), spared = shade('bram_spared');
  assert.equal(told.length, spared.length);
  assert.equal(told.filter((x, i) => x !== spared[i]).length, 1);
  const foes = ['dune_stalker', 'dune_scarab', 'dust_harrier', 'silt_reaver', 'starsilt', 'horizon_shade', 'tomorrow_husk',
    'mirage_knight', 'mirage_double', 'oracle', 'future_hunger', 'future_fear'];
  assert.deepEqual(Object.keys(EP5_BESTIARY), foes);
  for (const id of foes) {
    assert.equal(BESTIARY[id], EP5_BESTIARY[id]);
    assert.equal(EP5_BESTIARY[id].lore.length, 3);
    for (const l of EP5_BESTIARY[id].lore) assert.ok(fits(l) && ascii(l), `${id}: ${l}`);
    assert.match(EP5_BESTIARY[id].lore.join(' '), /sun-thing|star-thing|sky/, `${id}: names its sky side`);
  }
  for (const c of CREDITS_EP5) for (const l of [c.heading, ...c.lines]) assert.ok(l.length <= 42 && ascii(l), `credit ${l}`);
  for (const s of [END_CARD_EP5.text, END_CARD_EP5.sub, END_CARD_EP4_LIVE.sub, EPISODE6_CARD.text, EPISODE6_CARD.sub]) assert.ok(s.length <= 42 && ascii(s), s);
  assert.equal(END_CARD_EP5.sub, 'Episode 6 is not playable yet.');
  assert.equal(END_CARD_EP4_LIVE.sub, 'Episode 5 begins in the morning.');
  assert.equal(EPISODE6_CARD.text, 'Episode 6: The Skybound Isles');
  for (const t of Object.values(EP5_BATTLE_TEXT)) assert.ok(t.length <= 80 && fits(t) && ascii(t), t);
  assert.ok(EP5_BATTLE_TEXT.turn_sky_help.length <= 40);
  for (const [id, c] of Object.entries(EP5_BOSS_CARDS)) {
    assert.ok(c.name.length <= 24 && c.sub.length <= 28, id);
    assert.ok(EP5_ARC_LINES[id] && fits(EP5_ARC_LINES[id]), `${id}: arc line`);
  }
});

test('inspect lines: registered, fit, declared flags, a fallback last, and no late name before its flag', () => {
  for (const [id, v] of Object.entries(EP5_LINES)) {
    assert.equal(STORY.LINES[id], v, `${id} registered`);
    const walk = (x) => {
      if (typeof x === 'string') {
        assert.ok(fits(x) && ascii(x), `${id}: ${boxLines(x).join(' / ')}`);
        assert.ok(!/\b(Ishra|Tamir)\b/.test(x), `${id}: a late name`);
        return;
      }
      assert.ok(Array.isArray(x) && x.length, `${id}: empty`);
      if (x.every((e) => typeof e === 'string')) { x.forEach(walk); return; }
      const last = x.at(-1);
      assert.ok(!last.if && !last.ifNot, `${id}: ends on a fallback`);
      for (const e of x) { for (const f of flagsOf(e)) assert.ok(KNOWN(f), `${id}: ${f}`); walk(e.lines); }
    };
    walk(v);
    assert.ok(resolve(v, () => false, null).length >= 1);
  }
  assert.ok(Object.keys(EP5_LINES).length >= 35, `inspect lines: ${Object.keys(EP5_LINES).length}`);
  // the two-state objects of plan 4: the waystone and the bulletin change with haven_restored
  for (const id of ['ep5_waystone', 'ep5_bulletin']) assert.notDeepEqual(resolve(EP5_LINES[id], (f) => f === 'haven_restored'), resolve(EP5_LINES[id], () => false), id);
});

test('the Ledger: Saffron rows counted only when live, reached at haven_arrived, the late names hidden until named', async () => {
  assert.equal(PLACES.saffron, 'Saffron Haven');
  assert.equal(REACHED.saffron, 'haven_arrived');
  assert.equal(EXCLUDED.ep5_innkeeper, 'a shop counter');
  for (const r of EP5_LEDGER) { assert.equal(LEDGER.filter((x) => x.id === r.id).length, 1, r.id); assert.ok(KNOWN(r.flag), r.flag); }
  const rows = (flags) => ledgerRows(new Set(flags).has.bind(new Set(flags)), { all: false }).filter((x) => x.place === 'saffron');
  assert.equal(rows(['ep4_complete']).length, 0, 'not reached');
  const met = rows(['haven_arrived', 'ep5_morning_done', 'met_sel']);
  assert.equal(met.find((x) => x.id === 'ishra').name, '???');
  assert.equal(met.find((x) => x.id === 'tamir').name, '???');
  assert.ok(met.find((x) => x.id === 'yara').kept && met.find((x) => x.id === 'sel').kept);
  const after = rows(['haven_arrived', 'sel_memory_3', 'roads_returned']);
  assert.equal(after.find((x) => x.id === 'ishra').name, 'Ishra');
  assert.ok(after.find((x) => x.id === 'tamir').kept);
  for (const r of EP5_LEDGER) {
    for (const w of typeof r.why === 'function' ? [r.why(() => true), r.why(() => false)] : [r.why]) assert.ok(w.length <= 80 && ascii(w), w);
  }
  for (const id of Object.keys(EP5_NPCS)) assert.ok(LEDGER.some((x) => x.id === id) || EXCLUDED[id], `${id}: a row or excluded`);
  // with the switch off, a fresh ledger gets nothing (the counter on the title must not change for players)
  const fresh = await import(`../../src/data/ep5/ledger.js?off=${Date.now()}`);
  const n = LEDGER.length;
  fresh.register({ ep5Live: false });
  assert.equal(LEDGER.length, n);
});

test('the pack modules export register(), and Episode 5 is not reachable from core alone', async () => {
  for (const name of ['flags', 'npcs', 'quests', 'text', 'story', 'ledger']) {
    const mod = await import(`../../src/data/ep5/${name}.js`);
    assert.equal(typeof mod.register, 'function', name);
    assert.equal(mod.default, mod.register, `${name} default export`);
  }
  // A save that never started Episode 5 still follows Episode 4's quest.
  assert.equal(Q.mainQuestFor((f) => ['ep4_started', 'ep4_complete'].includes(f)).id, 'main_ep4');
  // With the switch off, the opener is not pushed (a fresh copy of the module, its own objects).
  const fresh = await import(`../../src/data/ep5/quests.js?off=${Date.now()}`);
  const before = TALK_PREPEND.length;
  fresh.register({ ep5Live: false });
  assert.equal(TALK_PREPEND.length, before);
  for (const q of fresh.SIDE_QUESTS_EP5) { const i = ALL_SIDE_QUESTS.indexOf(q); if (i >= 0) ALL_SIDE_QUESTS.splice(i, 1); }
});

// E5-fixes A7 (PLAYTEST_REVIEW_7 items 9 and 10): the Valewyn morning's Talk is the Episode 5 step alone (Bram and Mira on
// the ship), with an older side quest active and Valewyn's own banter on file; the road says how to meet sun-things.
test('Talk: the Valewyn morning names only the ship; the road tells the dusk trick after the first fight', () => {
  const flags = new Set(['intro_done', 'mira_joined', 'bram_joined', 'ep1_complete', 'lantern_get', 'lost_bridge_started',
    'ep4_started', 'ep4_complete', 'ep5_started']);
  const has = (f) => flags.has(f);
  const talk = (map) => { const c = Q.partyChat(has, map); return [...c.lines, ...c.side, ...c.banter]; };
  for (const map of ['ep4_valewyn', 'ep4_vw_inn']) {
    const boxes = talk(map);
    assert.deepEqual(boxes.map((l) => l.who), ['bram', 'mira'], `${map}: ${boxes.map((l) => l.text).join(' | ')}`);
    assert.match(boxes[0].text, /south landing/);
  }
  flags.add('ship_boarded');
  assert.ok(talk('ep4_valewyn').length >= 1, 'after the ship the hold lets go');
  for (const f of ['ship_arrived', 'bram_asked', 'ship_first_fight_done', 'road_landed']) flags.add(f);
  const road = Q.partyChat(has, 'ep5_caravan_road').banter.map((l) => l.text);
  assert.deepEqual(road, ['Sun-things glow by day. Fight them at dusk, or wait for the turn.']);
  flags.add('haven_arrived');
  assert.notDeepEqual(Q.partyChat(has, 'ep5_caravan_road').banter.map((l) => l.text), road, 'once at the Haven, the old banter');
});
