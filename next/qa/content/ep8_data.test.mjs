// Episode 8 data (E8-story, the lazy ep8 pack): flags, the Scriptorium cast and its held lines, the returning cast in every
// earlier town, the main quest and its Talk on every map, the side quests, banners, books (the canon Charter word for
// word), barks, bestiary, battle text, inspect lines with their own save keys, the whole game's credits and the end cards,
// and the Ledger (the hero kept last). Every line within the box rule with the longest hero name the name entry allows.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as NPCMOD from '../../src/data/npcs.js';
import * as Q from '../../src/data/quests.js';
import { BANNERS, BOOKS, BARKS, BESTIARY } from '../../src/data/text.js';
import { LEDGER, PLACES, REACHED, EXCLUDED, ALIASES, ledgerRows, namesKept } from '../../src/data/ledger.js';
import * as STORY from '../../src/game/story.js';
import { fits, boxLines, resolve } from '../../src/data/story/dialogue.js';
import { register as regEp4Flags } from '../../src/data/ep4/flags.js';
import { register as regEp5Flags } from '../../src/data/ep5/flags.js';
import { register as regEp6Flags } from '../../src/data/ep6/flags.js';
import { register as regEp7Flags, EP7_FLAGS } from '../../src/data/ep7/flags.js';
import { register as regEp4Npcs } from '../../src/data/ep4/npcs.js';
import { register as regEp5Npcs } from '../../src/data/ep5/npcs.js';
import { register as regEp6Npcs } from '../../src/data/ep6/npcs.js';
import { register as regEp7Npcs } from '../../src/data/ep7/npcs.js';
import { register as regEp7Quests, MAIN_QUEST_EP7 } from '../../src/data/ep7/quests.js';
import { END_CARD_EP7, EPISODE8_CARD as EP7_EPISODE8_CARD } from '../../src/data/ep7/text.js';
import { EP8_FLAGS, EP8_MAPS, register as regFlags } from '../../src/data/ep8/flags.js';
import { EP8_NPCS, EP8_TALK_PREPEND, EP8_TALK_PREPEND_X1, EP8_SPEAKERS, EP8_IMPLIED, register as regNpcs } from '../../src/data/ep8/npcs.js';
import { MAIN_QUEST_EP8, SIDE_QUESTS_EP8, BANTER_EP8, TALK_OPENER_EP8, TALK_OPENER_EP8_FAR, MORNING_HOLD_EP8, QUEST_EXT_ENTRY, REWARDS_EP8,
  EPILOGUE7_LIVE, EPILOGUE7_OFF, BRAM_KITCHEN, CLOSING_LINE, register as regQuests } from '../../src/data/ep8/quests.js';
import { EP8_BANNERS, EP8_LINES, EP8_REALMS, EP8_BOOKS, EP8_BARKS, EP8_BESTIARY, EP8_BATTLE_TEXT, EP8_BOSS_CARDS, EP8_ARC_LINES, EP8_LINE_STATES,
  patchLines, unpatchLines, register as regText } from '../../src/data/ep8/text.js';
import { CREDITS_EP8, creditsEp8, END_TITLE_EP8, END_CARD_EP8, END_CARD_EP7_LIVE, EPISODE8_CARD, COLD_OPEN_CARD, ENDING_TITLES }
  from '../../src/data/ep8/credits.js';
import { EP8_LEDGER, HERO_KEEP, register as regLedger, unregister as unregLedger } from '../../src/data/ep8/ledger.js';
import { scenes, WITNESS_FLAGS } from '../../src/data/ep8/story.js';

const { NPCS, SPEAKER_NAMES } = NPCMOD;
const { FLAGS, FLAG_IDS, ALL_SIDE_QUESTS, BANTER, TALK_PREPEND, pickChat, currentStep } = Q;
const PARTY = ['hero', 'mira', 'bram'];
const ascii = (s) => /^[\x20-\x7e]*$/.test(s);
const flagsOf = (e) => [e?.if, e?.ifNot].flat().filter(Boolean);
const KNOWN = (f) => f in FLAGS || f === 'tier_1';
const SC = ['ep8_scriptorium', 'ep8_sc_inn', 'ep8_sc_shop', 'ep8_sc_atelier', 'ep8_sc_index'];
const PH = ['ep7_palehaven', 'ep7_ph_inn', 'ep7_ph_shop', 'ep7_ph_armory', 'ep7_ph_watch'];
const box = (t) => fits(t, { heroName: 'W'.repeat(8) });
const textOf = (l) => (typeof l === 'string' ? l : l.text);
const linesIn = (v) => (v == null ? [] : typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap((x) => (x && typeof x === 'object' && 'lines' in x ? linesIn(x.lines) : [textOf(x)])) : []);

regEp4Flags(); regEp5Flags(); regEp6Flags(); regEp7Flags();
regEp4Npcs(); regEp5Npcs(); regEp6Npcs(); regEp7Npcs();
regEp7Quests({ ep7Live: true });
const IDS_BEFORE = FLAG_IDS.length;
const FLAGS_BEFORE = new Set(Object.keys(FLAGS));   // every flag of Episodes 1 to 7 (core, ep4 to ep7) before ours
regFlags();
const TALK_BEFORE = Object.fromEntries(Object.entries(NPCS).map(([id, n]) => [id, [...(n.talk || [])]]));
regNpcs({ x1Live: false });
regQuests({ ep8Live: true });
regText();

test('flags: every plan 2.2 flag declared with a meaning, pushed once onto FLAG_IDS, none from an earlier episode', () => {
  const PLAN = ['ep8_started', 'ep8_roofed', 'stair_arrived', 'first_rub_done', 'eraser_seen', 'saw_scriptorium', 'scriptorium_arrived', 'read_learned',
    'librarian_met', 'card_read', 'elowen_met', 'library_open', 'library_entered', 'ink_key_found', 'library_f1_done', 'sentry_defeated', 'library_f2_done',
    'beginning_seen', 'name_told', 'vex_arrived', 'eraser_defeated', 'lexicon_restored', 'fragment8_get', 'keeper_named', 'ending_return', 'ending_choose',
    'page_shelved', 'night_read', 'eighth_star', 'hero_kept', 'scriptorium_open', 'home_reached', 'ep8_complete', 'ep8_morning_done', 'afraid_yes',
    'afraid_no', 'first_book_read', 'lib_f1_arrived', 'lib_f2_arrived', 'lib_f3_arrived', 'keeper_memory_a', 'keeper_memory_b', 'keeper_memory_c', 'told_elowen',
    'spared_elowen', 'answered_yes', 'answered_page', 'told_hazel', 'spared_hazel', 'concordance_started', 'testimony_ione', 'testimony_fen',
    'testimony_elowen', 'concordance_lit', 'concordance_done', 'page_names_found', 'page_order_found', 'page_correction_found', 'archive_open',
    'drift_started', 'drift_1_found', 'drift_2_found', 'drift_3_found', 'drift_done'];
  for (const f of PLAN) assert.ok(f in EP8_FLAGS, `plan flag ${f}`);
  for (const [f, why] of Object.entries(EP8_FLAGS)) {
    assert.ok(typeof why === 'string' && why.length > 10 && ascii(why), `${f}: meaning`);
    assert.equal(FLAG_IDS.filter((x) => x === f).length, 1, `${f} pushed once`);
    assert.ok(!(f in EP7_FLAGS), `${f} is an Episode 7 flag`);
    assert.ok(!FLAGS_BEFORE.has(f), `${f} is already a flag (Episode 1 owns f1_arrived to f3_arrived: ours are lib_f1_arrived to lib_f3_arrived)`);
  }
  regFlags();
  assert.equal(FLAG_IDS.length, IDS_BEFORE + Object.keys(EP8_FLAGS).length, 'twice adds nothing');
  assert.equal(EP8_MAPS.length, 11);
  assert.ok(!('credits8_rolled' in EP8_FLAGS), 'the counter is not a flag');
});

test('the Scriptorium cast: records, maps, stages, held canon lines on their flags, Quinn never reads backwards', () => {
  for (const id of ['elowen', 'ione', 'fen', 'quinn', 'sorel', 'arun', 'meya', 'ep8_innkeeper', 'ep8_shopkeeper', 'ep8_librarian', 'first_keeper']) {
    const n = NPCS[id];
    assert.ok(n && n === EP8_NPCS[id], `record ${id}`);
    assert.ok(EP8_MAPS.includes(n.map), `${id}: map ${n.map}`);
    assert.ok(n.name && n.sprite && n.spot && n.about, id);
    for (const e of n.talk) for (const f of flagsOf(e)) assert.ok(KNOWN(f), `${id}: ${f}`);
    if (n.talk.length) assert.ok(!flagsOf(n.talk.at(-1)).length || id === 'first_keeper', `${id}: a fallback last`);
  }
  assert.ok(!('tamsin' in EP8_NPCS), 'X1 owns tamsin');
  for (const id of ['hazel', 'tess', 'oren', 'mael', 'nox_t', 'vex', 'keeper']) assert.ok(!(id in EP8_NPCS), `${id} is not redefined`);
  const lineFlag = (id, text) => EP8_NPCS[id].talk.find((e) => linesIn(e.lines).includes(text));
  assert.deepEqual(flagsOf(lineFlag('ione', 'The First Keeper knows what the Eraser believed forgetting would accomplish.')), ['keeper_named']);
  assert.deepEqual(flagsOf(lineFlag('arun', 'A new flame appears whenever someone tells the truth.')), ['scriptorium_open']);
  assert.deepEqual(flagsOf(lineFlag('meya', 'The First Keeper sometimes leaves a blank page for visitors to fill.')), ['scriptorium_open']);
  const all = Object.values(EP8_NPCS).flatMap((n) => n.talk.flatMap((e) => linesIn(e.lines)));
  assert.ok(!all.some((t) => /backwards/i.test(t)), "Quinn's third line is never used");
  for (const t of ['Every new book creates another shelf. The final hall is growing again.', 'I keep the living catalogue by author, place and vow.',
    'I carry fresh ink and binding cord between the library wings.', 'A broken binding can be repaired. A lost name needs a friend.',
    'I restore torn volumes at the Glyphsmith Atelier.', 'The Eraser was not always the enemy; read the oldest histories.',
    'These candles burn with the light of remembered kindness.', 'I watch the lamps along the script-road as the sun sets.',
    'I practise reading the old glyphs before class.']) assert.ok(all.includes(t), t);
  assert.deepEqual(EP8_NPCS.ep8_librarian.show, { ifNot: 'librarian_met' });
  assert.equal(EP8_NPCS.ep8_innkeeper.service.price, 160);
  assert.equal(EP8_NPCS.ep8_shopkeeper.service.id, 'bibliotheca');
  assert.equal(EP8_NPCS.sorel.service.id, 'glyphsmith');
  assert.equal(EP8_NPCS.quinn.service.id, 'quinn_satchel');
  assert.match(EP8_NPCS.elowen.about, /Keeper of the Scriptorium/);
  assert.ok(!/bookbinder/i.test(JSON.stringify(EP8_NPCS.elowen)), 'Elowen is never a bookbinder');
  // the First Keeper's after-clear line (canon, its first two sentences) as his post-game Talk
  assert.deepEqual(EP8_NPCS.first_keeper.talk[0].lines, ['I cannot repair what I erased, but I can help return the keys to those whose names were stolen.',
    'The Library belongs to them now.']);
  for (const [id, name] of Object.entries(EP8_SPEAKERS)) assert.equal(SPEAKER_NAMES[id], name, id);
});

test('no Scriptorium line before keeper_named calls the Librarian the First Keeper or says they are one man', () => {
  const LATE = ['keeper_named', 'scriptorium_open', 'ep8_complete'];
  for (const [id, n] of Object.entries(EP8_NPCS)) {
    if (!SC.includes(n.map) || id === 'first_keeper') continue;
    for (const e of n.talk) {
      const late = flagsOf({ if: e.if }).some((f) => LATE.includes(f));
      for (const t of linesIn(e.lines)) if (/First Keeper/.test(t)) assert.ok(late, `${id}: "${t}" before keeper_named`);
    }
  }
  for (const e of EP8_NPCS.ep8_librarian.talk) for (const t of linesIn(e.lines)) assert.ok(!/First Keeper|Eraser/.test(t), t);
  // the inspect lines of the Scriptorium and the Index say nothing of the First Keeper before he is named
  for (const [id, v] of Object.entries(EP8_LINES)) {
    if (!Array.isArray(v) || !v.some((x) => x && typeof x === 'object' && 'lines' in x)) { assert.ok(!/First Keeper/.test(linesIn(v).join(' ')) || false, id); continue; }
    for (const e of v) for (const t of linesIn(e.lines)) if (/First Keeper/.test(t)) assert.ok(flagsOf({ if: e.if }).some((f) => LATE.includes(f)), `${id}: ${t}`);
  }
});

test('every NPC, returning-cast, Talk, banter, bark, book and inspect line fits a box with an 8-letter name and is ASCII', () => {
  const bad = [];
  const chk = (where, t) => { if (!box(t) || !ascii(t)) bad.push(`${where}: ${boxLines(t).join(' / ')}`); };
  for (const [id, n] of Object.entries(EP8_NPCS)) for (const e of n.talk) for (const t of linesIn(e.lines)) chk(id, t);
  for (const [id, list] of Object.entries({ ...EP8_TALK_PREPEND, ...EP8_TALK_PREPEND_X1 })) for (const e of list) for (const t of linesIn(e.lines)) chk(id, t);
  for (const step of MAIN_QUEST_EP8.steps) for (const e of step.chat) for (const t of linesIn(e.lines)) chk(step.id, t);
  for (const q of SIDE_QUESTS_EP8) for (const st of q.steps) for (const e of st.chat) for (const t of linesIn(e.lines)) chk(q.id, t);
  for (const [map, list] of Object.entries(BANTER_EP8)) for (const e of list) for (const t of linesIn(e.lines)) chk(map, t);
  for (const e of [TALK_OPENER_EP8, TALK_OPENER_EP8_FAR, ...EPILOGUE7_LIVE.chat]) for (const t of linesIn(e.lines)) chk('opener', t);
  for (const [id, list] of Object.entries(EP8_BARKS)) for (const e of list) for (const t of linesIn(e.lines)) chk(id, t);
  for (const [id, bk] of Object.entries(EP8_BOOKS)) for (const t of bk.pages) chk(id, t);
  for (const [id, v] of Object.entries(EP8_LINES)) for (const t of linesIn(v)) chk(id, t);
  for (const [id, st] of Object.entries(EP8_LINE_STATES)) for (const t of [st.add || st.replace].flat()) chk(id, t);
  for (const t of Object.values(EP8_BATTLE_TEXT).flatMap((v) => (typeof v === 'string' ? [v] : Object.values(v)))) {
    if (!ascii(t) || t.replace('{name}', 'Wolfgang').replace('{foe}', 'Eraser').replace('{command}', 'Attack').length > 126) bad.push(`battle: ${t}`);
  }
  assert.deepEqual(bad, []);
  for (const st of MAIN_QUEST_EP8.steps) { assert.ok(st.journal.length <= 126 && ascii(st.journal), st.id); assert.ok(st.title.length <= 34, st.title); }
  for (const q of SIDE_QUESTS_EP8) for (const st of q.steps) assert.ok(st.journal.length <= 130 && ascii(st.journal), `${q.id}.${st.id}`);
});

test('returning cast: lines answer only in Episode 8, never hide an older scene, and every earlier town has its post-game line', async () => {
  const flagOf = (e) => flagsOf({ if: e.if });
  for (const [id, list] of Object.entries(EP8_TALK_PREPEND)) {
    for (const e of list) assert.ok(flagOf(e).some((f) => f in EP8_FLAGS), `${id}: guarded by an Episode 8 flag`);
    if (!NPCS[id]) continue;
    // the entry objects are at the front, and every scene entry still answers when its own flags hold
    // every scene entry still answers when its own flags hold (the prepended variants are guarded against it)
    for (const sc of NPCS[id].talk.filter((x) => x && x.scene)) {
      const on = new Set([...flagsOf({ if: sc.if }), ...EP8_IMPLIED, 'ep8_started', 'ep8_complete']);
      for (const f of flagsOf({ ifNot: sc.ifNot })) on.delete(f);
      const has = (f) => on.has(f);
      const first = (list) => list.find((e) => e && flagsOf({ if: e.if }).every(has) && !flagsOf({ ifNot: e.ifNot }).some(has));
      if (first(TALK_BEFORE[id] || []) === sc) assert.equal(first(NPCS[id].talk), sc, `${id}: ${sc.scene} is hidden by an Episode 8 line`);
    }
  }
  // every town of the plan has at least one post-game line (Hollis and Hesper only where their packs are)
  const TOWNS = { Palehaven: ['bryn', 'eira', 'torr', 'maera', 'sol', 'mirael', 'nox_t'], Zephyr: ['aeris', 'pippa', 'liora', 'bennet'],
    Saffron: ['sel', 'laleh', 'kamal', 'yara'], Valewyn: ['lyra_n', 'hale', 'joss'], Emberpeak: ['garrick_n', 'ilya', 'bess', 'veyra'],
    Hollowmere: ['wren', 'anwen', 'vessa'], Willowmere: ['hazel', 'tess', 'mael', 'holt', 'pip', 'oren', 'garrick'] };
  for (const [town, ids] of Object.entries(TOWNS)) for (const id of ids) {
    assert.ok(EP8_TALK_PREPEND[id] && EP8_TALK_PREPEND[id].some((e) => flagOf(e).includes('ep8_complete')), `${town}: ${id} post-game`);
    assert.ok(NPCS[id], `${town}: ${id} is a record`);
    const want = JSON.stringify(EP8_TALK_PREPEND[id][0].lines);
    assert.ok(NPCS[id].talk.some((e) => e && JSON.stringify(e.lines) === want), `${id}: prepended`);
  }
  // the palehaven morning: Bryn, Eira and Torr, one box each, before the roof
  for (const id of ['bryn', 'eira', 'torr']) {
    const e = EP8_TALK_PREPEND[id].find((x) => flagOf(x).includes('ep8_started'));
    assert.ok(e && e.lines.length === 1 && [e.ifNot].flat().includes('ep8_roofed'), `${id}: one morning line`);
  }
  assert.equal(EP8_TALK_PREPEND.bryn.find((x) => flagOf(x).includes('ep8_started')).lines[0], 'The watchfires are gold this morning. Never seen gold.');
  for (const id of ['bryn', 'eira', 'torr', 'maera', 'sol', 'mirael']) {
    assert.match(EP8_TALK_PREPEND[id].find((x) => flagOf(x).includes('ep8_complete')).lines[0], /gold/i, `${id}: the gold watchfires`);
  }
  // the bible's lines word for word
  assert.deepEqual(EP8_TALK_PREPEND.tess[0].lines, ['Bram says the bells rang every name today. Even yours. Especially yours.']);
  assert.deepEqual(EP8_TALK_PREPEND.mael[0].lines, ["Sixty years I've counted thirteen. Tonight I heard who the thirteenth was for."]);
  assert.deepEqual(EP8_TALK_PREPEND.hollis[0].lines, ['Finished up there, are we. Down here it never is.']);
  assert.deepEqual(EP8_TALK_PREPEND_X1.hesper[0].lines, ["There's a light in the eighth ring that was never there before."]);
  // Hazel: two post-game lines by the home choice
  const hz = EP8_TALK_PREPEND.hazel;
  assert.ok(flagOf(hz[0]).includes('told_hazel') && !flagOf(hz[1]).includes('told_hazel') && hz[0].lines.join() !== hz[1].lines.join());
  // nothing answers before Episode 8: a finished Episode 7 save hears what it heard
  const before = ['intro_done', 'mira_joined', 'bram_joined', 'ep1_complete', 'ep6_complete', 'ep7_complete'];
  for (const id of Object.keys(EP8_TALK_PREPEND)) {
    if (!NPCS[id]) continue;
    const has = (f) => before.includes(f);
    const hit = NPCS[id].talk.find((e) => e && flagsOf({ if: e.if }).every(has) && !flagsOf({ ifNot: e.ifNot }).some(has));
    assert.ok(!hit || !Object.values(EP8_TALK_PREPEND).flat().includes(hit), `${id}: an Episode 8 line answers before Episode 8`);
  }
  // Hesper only with X1 live; Hollis only where the Stacks registered him
  assert.ok(!NPCS.hesper || !NPCS.hesper.talk.includes(EP8_TALK_PREPEND_X1.hesper[0]), 'Hesper waits for X1');
});

test("Episode 8 main quest: steps in order, Talk names the next action on every map, the finished journal's last entry", () => {
  const ids = MAIN_QUEST_EP8.steps.map((s) => s.id);
  assert.deepEqual(ids, ['up', 'stair', 'scriptorium', 'library_f1', 'library_f2', 'library_f3', 'eraser', 'ending', 'home', 'epilogue8', 'epilogue8c']);
  assert.ok(Q.QUEST_EXT[0] === QUEST_EXT_ENTRY && QUEST_EXT_ENTRY[0] === 'ep8_started', 'ahead of Episode 7');
  for (const st of MAIN_QUEST_EP8.steps) {
    for (const f of [st.done].flat().filter(Boolean)) assert.ok(KNOWN(f), `${st.id}: ${f}`);
    for (const e of st.chat) for (const f of flagsOf(e)) assert.ok(KNOWN(f), `${st.id}: ${f}`);
    assert.ok(!flagsOf(st.chat.at(-1)).length && !st.chat.at(-1).map, `${st.id}: a fallback last`);
  }
  // every Episode 8 map gets a hint at the step it belongs to
  const ARRIVE = { library_f2: ['lib_f2_arrived'], library_f3: ['lib_f3_arrived'], library_f1: ['lib_f1_arrived'] };
  const at = (stepId, map, flags = ARRIVE[stepId] || []) => {
    const st = MAIN_QUEST_EP8.steps.find((s) => s.id === stepId);
    return pickChat(st.chat, (f) => flags.includes(f), map);
  };
  for (const [step, map] of [['up', 'ep7_ph_watch'], ['up', 'ep7_stillheart'], ['stair', 'ep8_stair'], ['scriptorium', 'ep8_scriptorium'],
    ['scriptorium', 'ep8_sc_index'], ['library_f1', 'ep8_library_f1'], ['library_f2', 'ep8_library_f2'], ['library_f3', 'ep8_library_f3'],
    ['eraser', 'ep8_last_word'], ['ending', 'ep8_last_word'], ['home', 'ep8_scriptorium'], ['home', 'ep8_bell_night']]) {
    assert.ok(at(step, map)?.map, `${step} on ${map}: a map-aware hint`);
  }
  assert.match(at('stair', 'ep8_stair', ['first_rub_done', 'first_book_read']).lines[0].text, /Open the willow book from this side; its pages fall away from you/);
  assert.match(at('library_f3', 'ep8_library_f3', ['lib_f3_arrived']).lines[0].text, /not|key/i);
  // the finished journal: the chosen ending's title and the canon line, by the ending
  const done = ['ep8_started', 'stair_arrived', 'saw_scriptorium', 'library_open', 'library_f1_done', 'library_f2_done', 'name_told', 'eraser_defeated',
    'scriptorium_open', 'ep8_complete'];
  const ret = currentStep((f) => [...done, 'ending_return'].includes(f), MAIN_QUEST_EP8);
  const cho = currentStep((f) => [...done, 'ending_choose'].includes(f), MAIN_QUEST_EP8);
  assert.equal(ret.journal, `Ending: Every Name Returned. ${CLOSING_LINE}`);
  assert.equal(cho.journal, `Ending: The Right to Choose. ${CLOSING_LINE}`);
  assert.equal(CLOSING_LINE, 'Your closing chapter is written in the Journal.');
  // after the end, Talk names doable things: the Stacks, Fine Print, the missed side stories, the Ledger, Bram's kitchen
  const post = ret.chat.flatMap((e) => linesIn(e.lines)).join(' ');
  for (const w of ['Deep Stacks', 'Fine Print', 'Ledger', 'folio', 'Archive', 'Quinn']) assert.ok(post.includes(w), `post-game Talk names ${w}`);
  assert.equal(BRAM_KITCHEN, 'After the First Library, I am finding a kitchen with strong walls and weak soup. That is my retirement plan.');
  assert.ok(ret.chat.some((e) => e.lines.some((l) => l.who === 'bram' && l.text === BRAM_KITCHEN)), "Bram's kitchen line is his post-game Talk");
  assert.ok(!/Hard Road/.test(post), 'never Hard Road');
});

test('while EP8_LIVE, epilogue7 Talk points at the Watch and the nave door only; the morning hold; never Fine Print', () => {
  assert.equal(TALK_PREPEND[0], TALK_OPENER_EP8);
  assert.equal(TALK_PREPEND[1], TALK_OPENER_EP8_FAR);
  for (const e of [TALK_OPENER_EP8, TALK_OPENER_EP8_FAR, MORNING_HOLD_EP8]) assert.ok([e.ifNot].flat().includes('tier_1'), 'never Fine Print');
  const st = MAIN_QUEST_EP7.steps.find((x) => x.id === 'epilogue7');
  assert.equal(st.journal, EPILOGUE7_LIVE.journal);
  assert.ok('journal' in EPILOGUE7_OFF && EPILOGUE7_OFF.journal !== EPILOGUE7_LIVE.journal, 'the shipped words are kept');
  const words = st.chat.flatMap((e) => linesIn(e.lines)).join(' ');
  assert.ok(/Watch/.test(words) && /nave door/.test(words));
  assert.ok(!/hearth|Torr|Reliquary|Snowrest/.test(words), 'only the Watch and the nave door');
  for (const q of ALL_SIDE_QUESTS.filter((x) => !SIDE_QUESTS_EP8.includes(x))) for (const s of q.steps || []) if (Array.isArray(s.chat)) assert.equal(s.chat[0], MORNING_HOLD_EP8, q.id);
  regQuests({ ep8Live: true });
  assert.equal(TALK_PREPEND.filter((e) => e === TALK_OPENER_EP8).length, 1, 'twice adds nothing');
});

test('side quests: givers, rewards, counters, journal and Talk fallbacks; pushed once; the plan 7 rewards', () => {
  assert.deepEqual(SIDE_QUESTS_EP8.map((q) => q.id), ['living_concordance', 'uncensored_archive', 'drifting_pages']);
  for (const q of SIDE_QUESTS_EP8) {
    assert.equal(ALL_SIDE_QUESTS.filter((x) => x === q).length, 1, q.id);
    assert.ok(KNOWN(q.start) && KNOWN(q.done), q.id);
    if (q.giver) assert.ok(EP8_NPCS[q.giver], q.giver);
    for (const st of q.steps) assert.ok(!flagsOf(st.chat.at(-1)).length && !st.chat.at(-1).map, `${q.id}.${st.id}: fallback`);
    for (const f of q.counter.flags) assert.ok(KNOWN(f), f);
  }
  assert.deepEqual([REWARDS_EP8.concordance.qty, REWARDS_EP8.concordance.gold, REWARDS_EP8.concordance_ether.qty], [3, 500, 2]);
  assert.equal(REWARDS_EP8.concordance_coat.item, 'bookcloth_coat');
  assert.deepEqual([REWARDS_EP8.archive.gold, REWARDS_EP8.archive.qty, REWARDS_EP8.archive.item], [500, 3, 'hi_ether']);
  assert.equal(REWARDS_EP8.drift.item, 'runners_ribbon');
  assert.deepEqual([REWARDS_EP8.gift_truth.item, REWARDS_EP8.gift_kind.item], ['binders_awl', 'riverwater_thread']);
});

test('text: 10 banners (the Scriptorium conditional, the Last Word by its name alone), 3 books with the canon Charter, the barks, 11 bestiary entries naming their erasing', () => {
  assert.equal(Object.keys(EP8_BANNERS).length, 10);
  assert.deepEqual(EP8_BANNERS.ep8_last_word, { title: 'The Last Word' });
  for (const [id, bn] of Object.entries(EP8_BANNERS)) { assert.equal(BANNERS[id], bn); assert.ok(bn.title.length <= 34 && (!bn.sub || bn.sub.length <= 34), id); }
  assert.deepEqual(EP8_BANNERS.ep8_scriptorium.states, [{ if: 'scriptorium_open', title: 'The Scriptorium', sub: 'An Open Library' }]);
  assert.deepEqual(Object.keys(EP8_BOOKS).sort(), ['concordance_folio', 'keeper_hid', 'living_charter']);
  for (const id of Object.keys(EP8_BOOKS)) assert.equal(BOOKS[id], EP8_BOOKS[id]);
  assert.equal(EP8_BOOKS.living_charter.pages.join(' '), 'First SEE the truth of a person. Then SHELTER their right to exist. '
    + 'Finally let them CHOOSE the name and future that they carry. A name is never a chain.');
  assert.equal(EP8_BOOKS.keeper_hid.title, 'The Book the Keeper Hid');
  for (const k of ['first_open', 'first_wall', 'first_side', 'first_pair', 'would_fold']) assert.ok(BARKS[k] === EP8_BARKS[k], k);
  assert.equal(EP8_BARKS.first_open[0].lines[0].text, "It's a bridge. A paper Mother Willow.");
  assert.equal(EP8_BARKS.first_pair[0].lines[0].text, 'Two books, one page. Only one of them gets to stand.');
  const FOES = ['index_hound', 'margin_imp', 'paper_crane', 'gnawing_bookworm', 'catalog_wraith', 'inkbound_librarian', 'struck_page', 'unnamed_sentry',
    'eraser', 'truth_grief', 'truth_change'];
  assert.deepEqual(Object.keys(EP8_BESTIARY), FOES);
  for (const id of FOES) {
    const e = EP8_BESTIARY[id];
    assert.equal(e.lore.length, 3, id);
    assert.ok(e.lore.join(' ').match(/rub|Rub|Mends|mends|Stand In/), `${id}: names its erasing`);
    for (const l of e.lore) assert.ok(ascii(l) && l.length <= 160, `${id}: ${l}`);
  }
  for (const t of ["Bram's Attack is rubbed out.", 'The ink slides off.', 'The ink will not take on {hero}.', 'Rubbed out. Try something else.',
    'The Eraser reveals its final form: a space where no name can survive.', 'Read an ally back. Breaks an unwriting.']) {
    assert.ok(Object.values(EP8_BATTLE_TEXT).includes(t), t);
  }
  assert.ok(EP8_BATTLE_TEXT.read_help.length <= 40, 'Read Aloud help under 40');
  assert.deepEqual(EP8_BOSS_CARDS, { unnamed_sentry: { name: 'THE UNNAMED SENTRY', sub: 'Keeper of the Palimpsest' }, eraser: { name: 'THE ERASER', sub: 'Once the First Keeper' } });
  assert.equal(EP8_ARC_LINES.unnamed_sentry, 'It guarded every page. Nobody told it whose.');
  assert.equal(EP8_ARC_LINES.eraser, 'He filed away every loss. Nobody asked about his.');
});

test('inspect lines: registered, fit, declared flags, a fallback last, every save point its own key, the realm books, the older lines patched', () => {
  for (const [id, v] of Object.entries(EP8_LINES)) {
    assert.equal(STORY.LINES[id], v, `${id} registered`);
    if (Array.isArray(v) && v.length && v.every((x) => x && typeof x === 'object' && 'lines' in x)) {
      for (const e of v) for (const f of flagsOf(e)) assert.ok(KNOWN(f), `${id}: ${f}`);
      assert.ok(!flagsOf(v.at(-1)).length, `${id}: fallback last`);
    }
  }
  for (const k of ['ep8_desk', 'ep8_fountain', 'ep8_index_bell', 'ep8_folio']) assert.ok(k in EP8_LINES, `save key ${k}`);
  assert.equal(Object.keys(EP8_REALMS).length, 7);
  for (const r of Object.values(EP8_REALMS)) assert.equal(EP8_LINES[r.key], r.text);
  assert.equal(EP8_REALMS.pb_willow.text, 'WILLOWMERE. The willow stands up out of the page.');
  assert.ok(Object.keys(EP8_LINES).length >= 32, `about 32 inspect lines: ${Object.keys(EP8_LINES).length}`);
  // the blanket's third line after ep8_complete, the mural's eighth sign after eighth_star; the old words stay the fallback
  const blanket = STORY.LINES.home_blanket;
  assert.ok(Array.isArray(blanket) && blanket[0].if === 'ep8_complete' && blanket[0].lines.length === 3);
  assert.equal(blanket[0].lines[2], EP8_LINE_STATES.home_blanket.add);
  assert.deepEqual(resolve(blanket, () => false).map((x) => x.text), ['A baby blanket, worn soft, folded at the bottom of the chest.',
    'Someone stitched your name into one corner, in thread the color of river water.']);
  const mural = STORY.LINES.ep5_mural;
  if (mural) assert.ok(Array.isArray(mural) && mural[0].if === 'eighth_star');
  patchLines();
  assert.equal(STORY.LINES.home_blanket, blanket, 'patching twice changes nothing');
  unpatchLines();
  assert.ok(!Array.isArray(STORY.LINES.home_blanket) || typeof STORY.LINES.home_blanket[0] === 'string', 'unpatched');
  patchLines();
});

test("credits: the whole game's, by place in Ledger order, the six canon epilogue cards over existing key art, the ending, Names kept", () => {
  const cards = CREDITS_EP8;
  const heads = cards.map((c) => c.heading);
  const order = ['Willowmere', 'Willowmere Valley', 'The Wider Valley', 'Hollowmere', 'Emberpeak', 'Valewyn', 'Saffron Haven', 'Zephyr Landing', 'Palehaven',
    'The Scriptorium', 'The First Library', 'The Road', 'The Party'];
  let last = -1;
  for (const h of order) { const i = heads.indexOf(h); assert.ok(i > last, `${h} in order`); last = i; }
  const EPI = [["Mira opens the mirrors and shows the names she recovered.", 'dialog_keyart_ep2'], ["Bram rings Mara's forge bell one last time.", 'dialog_keyart_ep3'],
    ['Regent Lyra reads the amended charter to her city.', 'ep4_dialog_keyart'], ['Sel sends caravans home.', 'ep5_dialog_keyart'],
    ['Aeris signals the missing pilots.', 'ep6_dialog_keyart'], ['Nox opens the northward gates.', 'ep7_dialog_keyart']];
  assert.deepEqual(cards.filter((c) => c.epilogue).map((c) => [c.lines[0], c.art]), EPI);
  for (const c of cards) for (const l of c.lines) assert.ok(ascii(l) && l.length <= (c.epilogue ? 60 : 42), `credit line: ${l}`);   // the scene wraps an epilogue sentence
  for (const c of cards) assert.ok((c.heading || '').length <= 34, c.heading);
  // no real person beyond the makers card Episodes 1 to 7 carry; no playtester's name
  const play = cards.find((c) => c.heading === 'From the playtesters');
  assert.ok(play && play.lines.every((l) => !/[A-Z][a-z]+ [A-Z][a-z]+/.test(l)), 'no names under the playtesters');
  assert.deepEqual(cards.filter((c) => /Created by|Story, World/.test(c.heading)).map((c) => c.lines), [['Scott Ball'], ['Scott Ball']]);
  assert.ok(!/Stephen|Peterson|Dr\./.test(JSON.stringify(cards)));
  // the save's own cards
  const ret = creditsEp8((f) => f === 'ending_return', { kept: 120, total: 124 });
  assert.ok(ret.some((c) => c.lines[0] === ENDING_TITLES.ending_return));
  assert.equal(ret.at(-1).lines[0], 'Names kept: 120 of 124');
  assert.ok(!ret.some((c) => c.slot), 'no slot card left');
  const cho = creditsEp8((f) => f === 'ending_choose');
  assert.ok(cho.some((c) => c.lines[0] === 'Ending: The Right to Choose') && !cho.some((c) => /Names kept/.test(c.lines[0])));
  // the cards
  assert.deepEqual(EPISODE8_CARD, EP7_EPISODE8_CARD, "Episode 7's ending shows the same card");
  assert.deepEqual(END_TITLE_EP8, { text: 'Lexicon Quest', sub: 'The End' });
  assert.deepEqual(COLD_OPEN_CARD, { text: 'In Aethelgard, every name is a promise.', sub: 'This one was kept.' });
  assert.equal(END_CARD_EP7_LIVE.sub, 'Episode 8 begins in the morning.');
  assert.equal(END_CARD_EP7_LIVE.text, END_CARD_EP7.text);
  for (const c of [END_CARD_EP8, END_CARD_EP7_LIVE]) assert.ok(c.text.length <= 42 && c.sub.length <= 42);
  assert.ok(`${END_CARD_EP8.text} ${END_CARD_EP8.sub}` === 'Every road is open. The Deep Stacks wait under the library.', "the plan's words");
});

test('the Ledger: Episode 8 rows only when live, the hero kept on hero_kept, the First Keeper hidden until named, places and reach', () => {
  const before = LEDGER.length;
  regLedger({ ep8Live: false });
  assert.equal(LEDGER.length, before, 'nothing while the switch is off');
  regLedger({ ep8Live: true });
  regLedger({ ep8Live: true });
  assert.equal(LEDGER.length, before + EP8_LEDGER.length, 'once');
  assert.deepEqual(EP8_LEDGER.map((r) => r.id), ['first_keeper', 'elowen', 'ione', 'fen', 'quinn', 'sorel', 'arun', 'meya']);
  const hero = LEDGER.find((r) => r.id === 'hero');
  assert.equal(hero.kept, HERO_KEEP.kept);
  const rows = (flags) => ledgerRows((f) => flags.includes(f), { heroName: 'Wolfgang', all: true });
  assert.equal(rows([]).find((r) => r.id === 'hero').kept, false);
  const kept = rows(['hero_kept']).find((r) => r.id === 'hero');
  assert.ok(kept.kept && kept.why === 'Answered to their own name, and kept it.');
  const fk = rows([]).find((r) => r.id === 'first_keeper');
  assert.ok(fk && fk.hidden && fk.name === '???', 'the First Keeper hidden until named');
  const fk2 = rows(['keeper_named', 'night_read']).find((r) => r.id === 'first_keeper');
  assert.ok(fk2.kept && fk2.name === 'The First Keeper' && fk2.why === 'Read his own line, and said it was his.');
  assert.ok(rows(['scriptorium_open']).find((r) => r.id === 'elowen').kept);
  assert.equal(PLACES.scriptorium, 'The Scriptorium');
  assert.equal(PLACES.first_library, 'The First Library');
  assert.equal(REACHED.scriptorium, 'scriptorium_arrived');
  assert.equal(REACHED.first_library, 'library_entered');
  assert.ok(EXCLUDED.ep8_innkeeper && EXCLUDED.ep8_shopkeeper);
  assert.equal(ALIASES.ep8_librarian, 'first_keeper');
  const all = namesKept(() => true, { all: true });
  assert.equal(all.kept, all.total, 'a save that kept everyone reads N of N');
  unregLedger();
  assert.equal(LEDGER.find((r) => r.id === 'hero').kept(() => true), false, "the hero's row put back");
  assert.equal(LEDGER.length, before);
});

test('the pack modules export register(); the witness flags are each an episode\'s witness quest; scenes exist for every NPC scene entry', () => {
  for (const mod of [regFlags, regNpcs, regQuests, regText, regLedger]) assert.equal(typeof mod, 'function');
  for (const n of Object.values(EP8_NPCS)) for (const e of n.talk) if (e.scene) assert.ok(scenes[e.scene], `${n.name}: scene ${e.scene}`);
  assert.deepEqual(WITNESS_FLAGS, ['nella_bell_done', 'fountain_done', 'coolant_done', 'witnesses_done', 'roads_done', 'beacon_lit', 'hearth_lit', 'concordance_lit']);
});
