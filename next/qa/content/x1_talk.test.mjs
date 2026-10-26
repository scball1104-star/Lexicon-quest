// X1 fix pass (CRITIQUE_X1 2, PLAYTEST_REVIEW_X1 M3): Talk's side line is map-aware, and Episode 2's "Mael wanted us at the well"
// opener stays off the Wider Valley's maps. Part A runs BEFORE the pack registers: every Talk result on the old maps equals the old
// algorithm's (sort by nudge only) for thousands of flag sets. Part B registers the expansion and tests the new behaviour.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FLAGS, BANTER, ALL_SIDE_QUESTS, partyChat, pickChat, currentStep, mainQuestFor, activeSideQuests, TALK_PREPEND } from '../../src/data/quests.js';
import { MAP_IDS, EP2_MAP_IDS, EP3_MAP_IDS } from './_harness.mjs';

/** The algorithm as it was before the fix (sort by nudge only). */
function oldChat(hasFlag, mapId, { maxSide = 1 } = {}) {
  const step = currentStep(hasFlag, mainQuestFor(hasFlag));
  const main = pickChat(step.chat, hasFlag, mapId);
  const picks = [];
  for (const { step: st } of activeSideQuests(hasFlag)) { const e = pickChat(st.chat, hasFlag, mapId); if (e) picks.push(e); }
  picks.sort((a, b) => (b.nudge ? 1 : 0) - (a.nudge ? 1 : 0));
  const side = [];
  for (const e of picks) { if (side.length >= maxSide) break; side.push(...e.lines); }
  const b = mapId != null ? pickChat(BANTER[mapId], hasFlag, mapId) : null;
  return { step, lines: main ? main.lines : [], side, banter: b ? b.lines : [] };
}

// a small deterministic generator
let seed = 12345;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

const OLD_MAPS = [...MAP_IDS, ...EP2_MAP_IDS, ...EP3_MAP_IDS];
const FLAG_LIST = Object.keys(FLAGS);

// Part A runs now, at module load, before the pack registers (the tests below only read its verdict).
const verdictA = (() => {
  if (ALL_SIDE_QUESTS.some((q) => q.id === 'strays')) return { error: 'the pack was registered before part A' };
  let mixed = 0, checked = 0;
  for (let i = 0; i < 3000; i++) {
    const p = 0.2 + rnd() * 0.6;
    const set = new Set(FLAG_LIST.filter(() => rnd() < p));
    if (rnd() < 0.8) { set.add('mira_joined'); set.add('bram_joined'); }
    const has = (f) => set.has(f);
    if (activeSideQuests(has).length > 1) mixed++;
    for (const m of [...OLD_MAPS.filter((_, k) => (k + i) % 7 === 0), null]) {
      for (const opts of [undefined, { maxSide: 3 }]) {
        const a = partyChat(has, m, opts), b = oldChat(has, m, opts);
        if (JSON.stringify(a) !== JSON.stringify(b)) return { error: `map ${m}, flags ${[...set].sort().join(',').slice(0, 300)}`, a, b };
        checked++;
      }
    }
  }
  return { mixed, checked };
})();

test('A: every Talk result on an old map equals the old algorithm for 3000 random flag sets (the pack is not registered)', () => {
  assert.ok(!verdictA.error, JSON.stringify(verdictA).slice(0, 600));
  assert.ok(verdictA.mixed > 500 && verdictA.checked > 3000, `meaningful sample (${verdictA.mixed} with several live quests, ${verdictA.checked} reads)`);
});

// ---- Part B
const { X1, registerAll } = await import('./x1_helpers.mjs');
registerAll();
const { X1_MAP_REGION } = X1.flags;
const X1_TALK_MAPS = Object.keys(X1_MAP_REGION);
const BOTH = ['mira_joined', 'bram_joined'];
const EP1_DONE = ['intro_done', 'met_mael', 'left_town', 'first_fight_done', 'archive_entered', 'archive_f1_done', 'echo_warden_defeated', 'lantern_get', 'archive_f2_done',
  'boss_door_open', 'archivore_defeated', 'ep1_complete', 'hal_returned'];
const flagSet = (...lists) => { const s = new Set(lists.flat()); return (f) => s.has(f); };
const said = (lines) => lines.map((l) => l.text).join(' | ');
const text = (c) => [said(c.lines), said(c.side), said(c.banter)].join(' | ');

test('B: the Talk opener swap covers the Wider Valley maps, all eleven, and is registered once', () => {
  assert.deepEqual([...X1.quests.TALK_OPENER_X1.map].sort(), Object.keys(X1_MAP_REGION).sort());
  assert.equal(X1_TALK_MAPS.length, 11);
  registerAll();
  assert.equal(TALK_PREPEND.filter((e) => e === X1.quests.TALK_OPENER_X1).length, 1);
  assert.ok(!partyChat(flagSet(BOTH, ['first_fight_done']), 'x1_downs').lines.some((l) => /errand/.test(l.text)), 'not during Episode 1');
});

test('B: "Mael wanted us at the well" never shows on a Wider Valley map (Episode 1 done, Episode 2 not started)', () => {
  const has = flagSet(BOTH, EP1_DONE);
  for (const m of X1_TALK_MAPS) {
    const c = partyChat(has, m);
    assert.ok(!/Mael/.test(text(c)), `${m}: ${text(c)}`);
  }
  // elsewhere it still does: the valley and the towns
  assert.ok(/Mael/.test(said(partyChat(has, 'valley').lines)));
  assert.ok(/Mael wants us at the well/.test(said(partyChat(has, 'willowmere').lines)));
  assert.ok(/Mael wanted us at the well/.test(said(partyChat(has, 'nope_map').lines)));
  // with Episode 2 started the opener is gone everywhere (unchanged)
  assert.ok(!/Mael wanted/.test(said(partyChat(flagSet(BOTH, EP1_DONE, ['ep2_started']), 'x1_downs').lines)));
});

test('B: the side line is the quest of THIS map first, then the first active (stable)', () => {
  const stones = ['rollcall_started', 'roll_found', 'copy_found', 'stones_lettered'];
  // Strays and the Thirteenth Stone (at the Reeve step) are both live, plus an older Episode 1 quest
  const has = flagSet(BOTH, EP1_DONE, ['strays_started', ...stones, 'tess_quest_started']);
  const live = activeSideQuests(has).map((a) => a.quest.id);
  assert.ok(live.includes('strays') && live.includes('rollcall'), live.join());
  const downs = partyChat(has, 'x1_downs');
  assert.ok(downs.side.length >= 1 && downs.side.length <= 2, "one quest entry (a pinned entry may be a pair of lines)");
  // on the Downs a quest pinned to the Downs speaks, never an older unpinned Episode 1 line
  assert.ok(/Old Fold|Brindle|stones|ridge|Thornfold|barrow door/.test(said(downs.side)), said(downs.side));
  // the Reeve line is gone from the moor, the Terrace, the Orrery and Larchhill
  for (const m of ['x1_highmoor', 'x1_terrace', 'x1_orrery', 'x1_larchhill']) {
    const c = partyChat(flagSet(BOTH, EP1_DONE, stones), m);
    assert.ok(!/Bows and light|turf mound|far end/.test(said(c.side)), `${m}: ${said(c.side)}`);   // Mira's wrong-place line; the hero's thought may remain
  }
  assert.ok(/barrow door/.test(said(partyChat(flagSet(BOTH, EP1_DONE, stones), 'x1_downs').side)), 'the Reeve line stays on the Downs');
});

test('B: a map-pinned entry beats an unpinned one even when the unpinned quest comes first in the list', () => {
  // Thirteenth Stone at its papers step (unpinned generic line on the moor) and Dark Stars (pinned to the moor tower)
  const has = flagSet(BOTH, EP1_DONE, ['rollcall_started', 'stars_started', 'star_1_read', 'star_2_read']);
  const order = activeSideQuests(has).map((a) => a.quest.id);
  assert.ok(order.indexOf('rollcall') < order.indexOf('dark_stars'), `rollcall is listed first: ${order.join()}`);
  const moor = partyChat(has, 'x1_highmoor');
  assert.ok(/Watchtower|third name/.test(said(moor.side)), said(moor.side));
  // off the moor the first active quest speaks as before
  const elsewhere = partyChat(has, 'x1_mill');
  assert.ok(elsewhere.side.length > 0);
});

test('B: one main hint first, then one side line (maxSide 1), then the banter', () => {
  const has = flagSet(BOTH, EP1_DONE, ['strays_started', 'rollcall_started', 'stars_started']);
  for (const m of [...X1_TALK_MAPS, 'valley', 'willowmere']) {
    const c = partyChat(has, m);
    assert.ok(Array.isArray(c.lines) && Array.isArray(c.banter), m);
    assert.ok(c.side.length >= 1 && c.side.length <= 2, `${m}: side ${c.side.length}`);
  }
  assert.equal(partyChat(has, 'x1_downs').step.id, currentStep(has, mainQuestFor(has)).id, 'the main hint is still first');
});
