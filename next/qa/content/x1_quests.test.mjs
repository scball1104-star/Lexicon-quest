// X1 content: the six side quests of plan 5 (journal, Talk, counters, rewards, EXP) and the banter for the valley, Willowmere and
// the new maps.
import test from 'node:test';
import assert from 'node:assert/strict';
import { X1, registerAll, X1_MAPS, X1_ITEMS } from './x1_helpers.mjs';
import { MAP_IDS, EP2_MAP_IDS, EP3_MAP_IDS } from './_harness.mjs';
import { fits, boxLines } from '../../src/data/story/dialogue.js';
import { FLAGS, ALL_SIDE_QUESTS, BANTER, partyChat, journal, pickChat } from '../../src/data/quests.js';
import { NPCS } from '../../src/data/npcs.js';
import { ITEMS } from '../../src/data/items.js';

registerAll();
const { X1_SIDE_QUESTS, REWARDS_X1, BANTER_X1, X1_QUEST_EXP_TOTAL } = X1.quests;
const list = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const KNOWN_MAPS = [...MAP_IDS, ...EP2_MAP_IDS, ...EP3_MAP_IDS, ...X1_MAPS, 'whisperwood_hollow'];
const BASE_FLAGS = ['intro_done', 'met_mael', 'mira_joined', 'bram_joined', 'left_town', 'first_fight_done', 'archive_entered', 'archive_f1_done',
  'echo_warden_defeated', 'lantern_get', 'archive_f2_done', 'boss_door_open', 'archivore_defeated', 'hal_returned'];

test('six quests in the SIDE_QUESTS shape, registered once, with the right givers, flags and rewards', () => {
  assert.equal(X1_SIDE_QUESTS.length, 6);
  const GIVER = { strays: 'brindle', rollcall: 'brindle', pell_crates: 'pell', four_rolls: 'hal', dark_stars: 'hesper', not_to_forget: 'iris' };
  const START = { strays: 'strays_started', rollcall: 'rollcall_started', pell_crates: 'crates_started', four_rolls: 'mill_started', dark_stars: 'stars_started', not_to_forget: 'list_started' };
  const DONE = { strays: 'strays_done', rollcall: 'rollcall_done', pell_crates: 'crates_done', four_rolls: 'mill_done', dark_stars: 'stars_done', not_to_forget: 'list_done' };
  const REWARD = { strays: 'fold_mantle', rollcall: 'rollcall_charm', pell_crates: 'drover_boots', four_rolls: 'honey_roll', dark_stars: 'star_chart', not_to_forget: 'ether' };
  for (const q of X1_SIDE_QUESTS) {
    assert.ok(ALL_SIDE_QUESTS.includes(q), `${q.id} not registered`);
    assert.equal(q.giver, GIVER[q.id]);
    assert.ok(NPCS[q.giver], `${q.id}: giver ${q.giver}`);
    assert.equal(q.start, START[q.id]);
    assert.equal(q.done, DONE[q.id]);
    for (const f of [q.start, q.done]) assert.ok(f in FLAGS, `${q.id}: ${f}`);
    assert.equal(q.reward, REWARD[q.id]);
    assert.ok(ITEMS[q.reward] || X1_ITEMS.includes(q.reward) || ['ether'].includes(q.reward), `${q.id}: reward ${q.reward}`);
    assert.ok(q.title && q.title.length <= 28, `${q.id}: title`);
    assert.equal(q.steps[q.steps.length - 1].done, q.done, `${q.id}: the last step closes on the done flag`);
  }
  assert.equal(new Set(ALL_SIDE_QUESTS.map((q) => q.id)).size, ALL_SIDE_QUESTS.length, 'quest ids unique across all episodes');
});

test('quest EXP is a small bonus: 8, 12, 8, 6, 12, 8 (54 in all) on the quest, the rewards and the finished journal entry', () => {
  const expected = { strays: 8, rollcall: 12, dark_stars: 8, pell_crates: 6, four_rolls: 12, not_to_forget: 8 };
  for (const q of X1_SIDE_QUESTS) {
    assert.equal(q.exp, expected[q.id], `${q.id}: exp`);
    assert.equal(REWARDS_X1[q.id].exp, expected[q.id]);
    assert.equal(q.doneText, `Complete. +${expected[q.id]} EXP.`);
  }
  assert.equal(X1_QUEST_EXP_TOTAL, 54);
  assert.equal(Object.keys(REWARDS_X1).length, 6);
  // Plan 5.8: 28 before the Archivore (Strays, Thirteenth Stone, Dark Stars) and 26 after (Crates, Four Rolls, Things Not To Forget).
  assert.equal(8 + 12 + 8, 28); assert.equal(6 + 12 + 8, 26);
  // Gold: Strays 100, Four Rolls 200, Things Not To Forget 200 (plan 8.5).
  assert.deepEqual([REWARDS_X1.strays.gold, REWARDS_X1.four_rolls.gold, REWARDS_X1.not_to_forget.gold], [100, 200, 200]);
  assert.equal(REWARDS_X1.four_rolls.qty, 8);
  assert.equal(REWARDS_X1.not_to_forget.qty, 3);
});

test('every step: one-box journal that names its recommended level where it sends you out, at least two Talk entries, a hero fallback, declared flags and maps', () => {
  for (const q of X1_SIDE_QUESTS) {
    for (const st of q.steps) {
      const where = `${q.id}.${st.id}`;
      assert.ok(fits(st.journal), `${where} journal: ${boxLines(st.journal).join(' / ')}`);
      for (const f of list(st.done)) assert.ok(f in FLAGS, `${where}: ${f}`);
      assert.ok(st.chat.length >= 2, `${where}: needs two or more chat entries`);
      const last = st.chat[st.chat.length - 1];
      assert.ok(!last.if && !last.ifNot && !last.map, `${where}: the last chat entry must be the unconditional fallback`);
      assert.ok(last.lines.every((l) => l.who === 'hero'), `${where}: the fallback is the hero's own thought`);
      assert.ok(st.chat.some((e) => e.map), `${where}: no map-aware entry`) ;
      assert.ok(pickChat(st.chat, () => false, 'willowmere'), `${where}: no solo hint`);
      for (const e of st.chat) {
        for (const f of [...list(e.if), ...list(e.ifNot)]) assert.ok(f in FLAGS, `${where}: ${f}`);
        for (const m of list(e.map)) assert.ok(KNOWN_MAPS.includes(m), `${where}: map ${m}`);
        for (const l of e.lines) {
          assert.ok(fits(l.text), `${where}: ${boxLines(l.text).join(' / ')}`);
          assert.ok(['mira', 'bram', 'hero'].includes(l.who));
          if (l.who === 'mira') assert.ok(list(e.if).some((f) => ['mira_joined'].includes(f)) || ['mira_joined', 'bram_joined'].every((f) => list(e.if).includes(f)), `${where}: Mira may not have joined`);
          if (l.who === 'bram') assert.ok(list(e.if).includes('bram_joined'), `${where}: Bram may not have joined`);
        }
      }
    }
    // Recommended levels: every journal that sends the party somewhere dangerous names one.
    const sentOut = q.steps.filter((st) => /Lv/.test(st.journal));
    assert.ok(sentOut.length >= 1, `${q.id}: no journal names a recommended level`);
  }
  for (const [id, step] of [['strays', 'find'], ['rollcall', 'reeve'], ['four_rolls', 'pin'], ['dark_stars', 'cellar']]) {
    const q = X1_SIDE_QUESTS.find((x) => x.id === id);
    assert.match(q.steps.find((s) => s.id === step).journal, /Lv|Recommended/, `${id}.${step}`);
  }
});

test('every step\'s Talk names the next step (a person, a place or a thing to do)', () => {
  const NEXT = {
    'strays.find': /Brindle|sheep|stray|Fold|stones|ridge|pasture|wall/i, 'strays.return': /Brindle/,
    'rollcall.papers': /Iris|Quill|roll|copy/i, 'rollcall.stones': /Stones|ring|names/i, 'rollcall.reeve': /barrow|Reeve|mound/i, 'rollcall.report': /Brindle/,
    'pell_crates.deliver': /Tamsin|Yarrow|Ferrick|crate/i, 'pell_crates.report': /Pell/,
    'four_rolls.ferrick': /Ferrick/, 'four_rolls.pin': /pin|culvert|Culvert/i, 'four_rolls.wheel': /wheel|Hal/i,
    'dark_stars.marks': /milestone|door|Watchtower|Lantern/i, 'dark_stars.align': /Hesper|Orrery/, 'dark_stars.cellar': /Cellar|hatch|Lantern|route/i,
    'not_to_forget.gather': /Brindle|ledger|Odo|rhyme|song/i, 'not_to_forget.report': /Iris|library/i,
  };
  for (const q of X1_SIDE_QUESTS) for (const st of q.steps) {
    const key = `${q.id}.${st.id}`;
    assert.ok(NEXT[key], `no keyword set for ${key}`);
    const all = [st.journal, ...st.chat.flatMap((e) => e.lines.map((l) => l.text))].join(' ');
    assert.match(all, NEXT[key], `${key} does not name its next step`);
    for (const e of st.chat) assert.match(e.lines.map((l) => l.text).join(' ') + st.journal, NEXT[key], `${key}: a Talk entry loses the thread`);
  }
});

test('the journal walks each quest step by step, counters count, and a finished quest shows Complete', () => {
  const base = new Set(BASE_FLAGS);
  const at = (...extra) => journal((f) => base.has(f) || extra.includes(f));
  const entry = (j, id) => j.side.find((s) => s.id === id);
  assert.equal(entry(at(), 'strays'), undefined, 'an unstarted quest stays hidden');
  let e = entry(at('strays_started', 'stray_1_found', 'stray_4_found'), 'strays');
  assert.deepEqual(e.counter, { label: 'Strays found', value: 2, max: 5 });
  assert.match(e.text, /five sheep short/);
  e = entry(at('strays_started', 'stray_1_found', 'stray_2_found', 'stray_3_found', 'stray_4_found', 'stray_5_found'), 'strays');
  assert.match(e.text, /Tell Brindle/);
  e = entry(at('strays_started', 'strays_done'), 'strays');
  assert.equal(e.done, true); assert.match(e.text, /^Complete\.( \+\d+ EXP\.)?$/);
  // Rollcall's four steps in order; the Reeve before the stones leaves the stones step showing.
  const R = ['rollcall_started'];
  assert.match(entry(at(...R), 'rollcall').text, /roll and Quill|Iris/);
  assert.deepEqual(entry(at(...R, 'roll_found'), 'rollcall').counter, { label: 'Papers found', value: 1, max: 2 });
  assert.match(entry(at(...R, 'roll_found', 'copy_found'), 'rollcall').text, /Standing Stones/);
  assert.match(entry(at(...R, 'roll_found', 'copy_found', 'stones_lettered'), 'rollcall').text, /Barrow Reeve/);
  assert.match(entry(at(...R, 'roll_found', 'copy_found', 'barrow_reeve_defeated'), 'rollcall').text, /Standing Stones/, 'the Reeve first: the stones are still owed');
  assert.match(entry(at(...R, 'roll_found', 'copy_found', 'stones_lettered', 'barrow_reeve_defeated'), 'rollcall').text, /Tell Brindle/);
  // Dark Stars
  assert.deepEqual(entry(at('stars_started', 'star_2_read'), 'dark_stars').counter, { label: 'Marks read', value: 1, max: 3 });
  assert.match(entry(at('stars_started', 'star_1_read', 'star_2_read', 'star_3_read'), 'dark_stars').text, /Hesper/);
  assert.match(entry(at('stars_started', 'star_1_read', 'star_2_read', 'star_3_read', 'orrery_aligned'), 'dark_stars').text, /Cellar/);
  // Pell, Four Rolls, Things Not To Forget
  assert.deepEqual(entry(at('crates_started', 'crate_3_done'), 'pell_crates').counter, { label: 'Crates handed over', value: 1, max: 3 });
  assert.match(entry(at('mill_started'), 'four_rolls').text, /Ferrick/);
  assert.match(entry(at('mill_started', 'ferrick_met'), 'four_rolls').text, /Culvert/);
  assert.match(entry(at('mill_started', 'ferrick_met', 'pin_found'), 'four_rolls').text, /wheel/);
  assert.deepEqual(entry(at('list_started', 'list_song'), 'not_to_forget').counter, { label: 'Remembrances', value: 1, max: 3 });
});

test('Talk: a started quest adds its reminder after the main hint, and the order within a quest is free where the plan says so', () => {
  const has = (set) => (f) => set.has(f);
  const s = new Set([...BASE_FLAGS, 'strays_started']);
  const chat = partyChat(has(s), 'x1_downs');
  assert.ok(chat.lines.length >= 1, 'a main hint');
  assert.ok(chat.side.length >= 1 && chat.side.length <= 3, 'one side reminder');
  assert.ok(chat.side.some((l) => /Old Fold|ring|ridge|crack/.test(l.text)), 'the map-aware strays hint');
  // Four Rolls out of order: the pin and the Golem long before Hal asks (the quest steps still resolve)
  const o = new Set([...BASE_FLAGS, 'pin_found', 'millstone_golem_defeated', 'mill_started']);
  assert.match(journal(has(o)).side.find((q) => q.id === 'four_rolls').text, /Ferrick/, 'ferrick_met still owed');
  // Every step of every quest speaks on a map from its own list
  for (const q of X1_SIDE_QUESTS) for (const st of q.steps) for (const e of st.chat.filter((c) => c.map)) {
    const flags = new Set([...BASE_FLAGS, q.start, ...list(e.if)]);
    const picked = pickChat(st.chat, has(flags), list(e.map)[0]);
    assert.ok(picked, `${q.id}.${st.id} on ${list(e.map)[0]}`);
  }
});

test('banter: real maps, declared flags, only joined companions speak, every line fits; the valley and Willowmere hints end when seen', () => {
  const maps = Object.keys(BANTER_X1);
  for (const m of X1_MAPS) assert.ok(maps.includes(m), `no banter for ${m}`);
  assert.ok(maps.includes('valley') && maps.includes('willowmere'));
  for (const [map, entries] of Object.entries(BANTER_X1)) {
    assert.ok(KNOWN_MAPS.includes(map), `banter for unknown map ${map}`);
    for (const e of entries) {
      const conds = list(e.if);
      for (const f of [...conds, ...list(e.ifNot)]) assert.ok(f in FLAGS, `${map}: ${f}`);
      assert.ok(['mira_joined', 'bram_joined'].every((f) => conds.includes(f)), `${map}: banter needs both companions`);
      for (const l of e.lines) { assert.ok(fits(l.text), `${map}: ${boxLines(l.text).join(' / ')}`); assert.ok(['mira', 'bram'].includes(l.who)); }
    }
  }
  // Registered: new maps assigned, valley and Willowmere entries in FRONT of the old ones.
  for (const m of X1_MAPS) assert.equal(BANTER[m].length, BANTER_X1[m].length);
  const valleyFront = BANTER.valley.slice(0, BANTER_X1.valley.length);
  assert.deepEqual(valleyFront, BANTER_X1.valley);
  assert.ok(BANTER.valley.length > BANTER_X1.valley.length, 'the old valley banter is still there');
  const has = (set) => (f) => set.has(f);
  const base = new Set(['mira_joined', 'bram_joined', 'first_fight_done', 'lantern_get']);
  assert.match(partyChat(has(base), 'valley').banter.map((l) => l.text).join(' '), /cleft/, 'the cleft hint once lantern_get');
  const seen = new Set([...base, 'terrace_arrived', 'downs_arrived']);
  assert.doesNotMatch(partyChat(has(seen), 'valley').banter.map((l) => l.text).join(' '), /cleft/, 'the hint ends at terrace_arrived');
  const south = new Set([...base, 'terrace_arrived', 'downs_arrived', 'archive_f1_done']);
  assert.match(partyChat(has(south), 'valley').banter.map((l) => l.text).join(' '), /south track|oak/, 'the south track hint once archive_f1_done');
  const west = new Set(['mira_joined', 'bram_joined', 'first_fight_done']);
  assert.match(partyChat(has(west), 'willowmere').banter.map((l) => l.text).join(' '), /orchard gate|Holt/i, 'the west gate once first_fight_done');
  assert.match(partyChat(has(new Set(['mira_joined', 'bram_joined'])), 'x1_downs').banter.map((l) => l.text).join(' '), /tower/, 'the far tower');
  // With every old state, the old banter still wins once the hints are over.
  const old = new Set(['mira_joined', 'bram_joined', 'archivore_defeated', 'terrace_arrived', 'millrace_arrived', 'downs_arrived']);
  assert.match(partyChat(has(old), 'valley').banter.map((l) => l.text).join(' '), /milestone/);
});

test('a region switched off removes its quests-banter entries and NPCs', () => {
  const west = X1.quests.activeBanter((r) => r !== 'west');
  assert.equal(west.valley.length, BANTER_X1.valley.length - 1);
  assert.equal(west.willowmere.length, 0);
  const north = X1.quests.activeBanter((r) => r !== 'north');
  assert.equal(north.valley.length, BANTER_X1.valley.length - 1);
  assert.equal(X1.quests.activeBanter(() => true).valley.length, BANTER_X1.valley.length);
});
