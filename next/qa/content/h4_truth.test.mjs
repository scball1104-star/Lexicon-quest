// H4-story (docs/briefs/H4-story.md; docs/RESPONSIBILITY_ARC.md 3.3 to 3.6, Scott's decision D): the Name Truth choices
// and their memories, the floor-ending questions, the boss lines, the Aim strings. Pure: node only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scenes as EP1 } from '../../src/data/story/ep1.js';
import { scenes as EP2 } from '../../src/data/story/ep2.js';
import { FLAGS, MAIN_QUEST, MAIN_QUEST_EP2, MAIN_QUEST_EP3 } from '../../src/data/quests.js';
import { talkTo } from '../../src/data/npcs.js';
import { LEDGER } from '../../src/data/ledger.js';
import { ITEMS } from '../../src/data/items.js';
import { fits, boxLines, CHOICE_COLS } from '../../src/data/story/dialogue.js';
import { EP1_DONE_FLAGS } from '../../src/game/state.js';
import { FieldScene } from '../../src/scenes/field.js';
import { explore, runOnce, playthrough, NEXT } from './_harness.mjs';

const EM_DASH = String.fromCharCode(0x2014);   // never written literally: rules.test.mjs scans this folder for it
const ops = (log, op) => log.filter((e) => e.op === op);
const says = (log) => ops(log, 'say').map((e) => e.args[1]);
const setsOf = (log) => ops(log, 'setFlag').filter((e) => e.args[1] !== false).map((e) => e.args[0]);
const has = (flags) => (f) => flags.includes(f);
const PARTY = ['mira_joined', 'bram_joined'];
const DONE = 'archivore_defeated';

const ALL = { ...EP1, ...EP2 };
const RUNS = {};
for (const [id, fn] of Object.entries(ALL)) RUNS[id] = await explore(fn);

// Every pair, the scene that asks, the index of the true answer (the autoplay bot picks 0 unless told otherwise, so
// every choice puts the truth first; H6 gave Mael a new ask about the night, truth first too).
const PAIRS = {
  oren: { scene: 'fading_sign', truth: 0, flags: ['intro_done'] },
  hazel: { scene: 'hazel_farewell', truth: 0, flags: ['met_mael'] },
  mael: { scene: 'mael_intro', truth: 0, flags: ['intro_done'] },
  garrick: { scene: 'garrick_farewell', truth: 0, flags: PARTY },
  tess: { scene: 'tess_letters', truth: 0, flags: ['tess_quest_started', 'tess_letter_3_found', ...PARTY] },
  quill: { scene: 'quill_hint', truth: 0, flags: ['saw_milestone', ...PARTY] },
  door: { scene: 'archive_door', truth: 0, flags: PARTY },
  corin: { scene: 'nh_arrival', truth: 0, flags: [...EP1_DONE_FLAGS, 'crossing_done'] },
  elian: { scene: 'elian_hall', truth: 0, flags: [...EP1_DONE_FLAGS, 'met_elian'] },
  lena: { scene: 'lena_testimony', truth: 0, flags: [...EP1_DONE_FLAGS, 'fountain_started'] },
  anwen: { scene: 'anwen_register', truth: 0, flags: [...EP1_DONE_FLAGS, 'heard_crisis'] },
  nico: { scene: 'nico_crowns', truth: 0, flags: [...EP1_DONE_FLAGS, 'court_entered'] },
};
const EP1_PAIRS = ['oren', 'hazel', 'mael', 'garrick', 'tess', 'quill', 'door'];
const EP2_PAIRS = ['corin', 'elian', 'lena', 'anwen', 'nico'];

// Where each pair is remembered: one later line in a scene (added to the base run) or in an NPC's talk (one line swapped).
const MEMORY = {
  oren: { scene: 'oren_starter', flags: ['starter_quest_started', 'starter_found'] },
  hazel: { npc: 'hazel', flags: [DONE] },
  mael: { scene: 'ep2_mael', flags: EP1_DONE_FLAGS },
  garrick: { npc: 'garrick', flags: [DONE] },
  tess: { npc: 'tess', flags: ['tess_quest_done', DONE] },
  quill: { npc: 'quill', flags: [DONE, 'lost_bridge_started'] },
  door: { scene: 'archivore', flags: ['boss_door_open', ...PARTY] },
  corin: { npc: 'corin', flags: ['ep2_complete'] },
  elian: { scene: 'elian_letter', flags: [...EP1_DONE_FLAGS, 'nh_restored'] },
  lena: { npc: 'lena', flags: ['ep2_complete'] },
  anwen: { scene: 'anwen_testimony', flags: [...EP1_DONE_FLAGS, 'fountain_started'] },
  nico: { scene: 'nico_crowns', flags: [...EP1_DONE_FLAGS, 'court_entered', 'nico_crowns_started', 'paper_crown_found'] },
};

// What changes hands (H6, CRITIQUE_ARC 6, decision D: never a quiz): a gift only where the fiction hands one over. `side` is
// the answer that carries it (truth, lie) or null (the line is all); the scene that gives it and the item.
const REWARD = {
  oren: { scene: 'oren_starter', flags: ['starter_quest_started', 'starter_found'], byFlag: true, side: null },
  hazel: { scene: 'hazel_farewell', flags: ['met_mael'], side: 'truth', item: 'tent' },
  mael: { scene: 'ep2_mael', flags: EP1_DONE_FLAGS, byFlag: true, side: null },
  garrick: { scene: 'garrick_farewell', flags: PARTY, side: 'truth', item: 'echo_herb' },
  tess: { scene: 'tess_letters', flags: ['tess_quest_started', 'tess_letter_3_found', ...PARTY], side: 'truth', item: 'hi_potion' },
  quill: { scene: 'quill_hint', flags: ['saw_milestone', ...PARTY], side: 'lie', item: 'eye_drops' },
  door: { scene: 'archive_door', flags: PARTY, side: 'truth', item: 'potion' },
  corin: { scene: 'nh_arrival', flags: [...EP1_DONE_FLAGS, 'crossing_done'], side: 'lie', item: 'potion' },
  elian: { scene: 'elian_letter', flags: [...EP1_DONE_FLAGS, 'nh_restored'], byFlag: true, side: null },
  lena: { scene: 'lena_testimony', flags: [...EP1_DONE_FLAGS, 'fountain_started'], side: 'truth', item: 'ether' },
  anwen: { scene: 'anwen_testimony', flags: [...EP1_DONE_FLAGS, 'fountain_started'], byFlag: true, side: 'truth', item: 'phoenix_feather' },
  nico: { scene: 'nico_crowns', flags: [...EP1_DONE_FLAGS, 'court_entered', 'nico_crowns_started', 'paper_crown_found'], byFlag: true, side: null },
};

// ------------------------------------------------------------------------------------------------ the pairs
test('twelve Name Truth pairs: seven in Episode 1 (Oren counts), five in Episode 2, each declared in FLAGS with its scene', () => {
  const truths = Object.keys(FLAGS).filter((f) => f.endsWith('_truth')).map((f) => f.slice(0, -6)).sort();
  const lies = Object.keys(FLAGS).filter((f) => f.endsWith('_lie')).map((f) => f.slice(0, -4)).sort();
  assert.deepEqual(truths, Object.keys(PAIRS).sort());
  assert.deepEqual(lies, truths, 'every _truth has its _lie and nothing else ends in _lie');
  assert.equal(EP1_PAIRS.length, 7); assert.equal(EP2_PAIRS.length, 5);
  for (const [p, d] of Object.entries(PAIRS)) {
    for (const f of [`${p}_truth`, `${p}_lie`]) {
      assert.ok(FLAGS[f].length > 20 && FLAGS[f].includes(`(${d.scene})`), `${f}: the meaning names its scene`);
      assert.ok(!FLAGS[f].includes(EM_DASH));
    }
  }
});

test('each pair is set by exactly one choice in one existing scene, never both on one path, both answers playable', () => {
  for (const [p, d] of Object.entries(PAIRS)) {
    const T = `${p}_truth`, L = `${p}_lie`;
    const where = Object.keys(RUNS).filter((id) => RUNS[id].some((r) => setsOf(r.log).some((f) => f === T || f === L)));
    assert.deepEqual(where, [d.scene], `${p} is set in ${d.scene} only`);
    let truth = 0, lie = 0;
    for (const r of RUNS[d.scene]) {
      const s = setsOf(r.log);
      assert.ok(!(s.includes(T) && s.includes(L)), `${p}: never both`);
      assert.ok(s.filter((f) => f === T || f === L).length <= 1, `${p}: set once on a path`);
      if (s.includes(T)) truth++;
      if (s.includes(L)) lie++;
      const i = r.log.findIndex((e) => e.op === 'setFlag' && (e.args[0] === T || e.args[0] === L));
      if (i >= 0) {
        const choice = r.log.slice(0, i).reverse().find((e) => e.op === 'choice');
        assert.ok(choice, `${p}: set by a choice`);
        assert.equal(choice.args[0].length, 2, `${p}: two options`);
        assert.equal(choice.args[1] === d.truth, s.includes(T), `${p}: option ${d.truth} is the truth`);
      }
    }
    assert.ok(truth > 0 && lie > 0, `${p}: both answers are playable (${truth} truth, ${lie} lie paths)`);
  }
});

test('every choice fits the choice window and reads as a plain answer, and the ask is one box', async () => {
  for (const [p, d] of Object.entries(PAIRS)) {
    const { log } = await runOnce(ALL[d.scene], { flags: d.flags, branchFlags: false });
    const choice = ops(log, 'choice').find((e) => true);
    assert.ok(choice, `${p}: the choice shows on the plain path`);
    const opts = ops(log, 'choice').map((e) => e.args[0]).find((o) => o.length === 2 && !/Rest|Ask|Give|Why|East|letter/.test(o.join(' '))) || choice.args[0];
    for (const o of opts) {
      assert.ok(o.length <= CHOICE_COLS && /^[\x20-\x7e]+$/.test(o), `${p}: option "${o}"`);
      assert.ok(!/should|correct|right answer/i.test(o), `${p}: no quiz wording`);
    }
  }
});

// ------------------------------------------------------------------------------------------------ the memory and the reward
async function sceneTexts(id, flags) { return says((await runOnce(ALL[id], { flags, branchFlags: false })).log); }
function talkTexts(npc, flags) { const t = talkTo(npc, has(flags)); assert.ok(t && t.lines, `${npc}: lines with ${flags.join(',')}`); return t.lines.map((l) => l.text); }

test('each pair is remembered by exactly one later line that differs by the flag, and by nothing else', async () => {
  for (const [p, m] of Object.entries(MEMORY)) {
    const T = `${p}_truth`, L = `${p}_lie`;
    const texts = m.scene ? (f) => sceneTexts(m.scene, [...m.flags, ...f]) : async (f) => talkTexts(m.npc, [...m.flags, ...f]);
    const none = await texts([]), truth = await texts([T]), lie = await texts([L]);
    assert.notDeepEqual(truth, lie, `${p}: the two memories differ`);
    if (m.scene) {
      assert.equal(truth.length, none.length + 1, `${p}: the truth adds one box`);
      assert.equal(lie.length, none.length + 1, `${p}: the lie adds one box`);
      assert.deepEqual(truth.filter((t) => none.includes(t)), none, `${p}: every other box unchanged (truth)`);
      assert.deepEqual(lie.filter((t) => none.includes(t)), none, `${p}: every other box unchanged (lie)`);
    } else {
      assert.equal(truth.length, none.length, `${p}: same number of lines`);
      assert.equal(lie.length, none.length);
      assert.equal(truth.filter((t, i) => t !== none[i]).length, 1, `${p}: one talk line swapped (truth)`);
      assert.equal(lie.filter((t, i) => t !== none[i]).length, 1, `${p}: one talk line swapped (lie)`);
    }
    for (const t of [...truth, ...lie]) {
      assert.ok(fits(t), `${p}: ${boxLines(t).join(' / ')}`);
      assert.ok(!/you should have/i.test(t), `${p}: nobody says "you should have"`);
    }
  }
});

test('a gift only where the fiction hands one over: about half the truths, two kind lies, never a key or a route flag', async () => {
  for (const [p, r] of Object.entries(REWARD)) {
    const T = `${p}_truth`, L = `${p}_lie`;
    const run = (extra, decisions) => runOnce(ALL[r.scene], { flags: [...r.flags, ...extra], decisions, branchFlags: false });
    const truth = r.byFlag ? await run([T], []) : await run([], [PAIRS[p].truth]);
    const lie = r.byFlag ? await run([L], []) : await run([], [1 - PAIRS[p].truth]);
    const gives = (log) => ops(log, 'give').map((e) => [e.args[0], e.args[1] ?? 1]);
    if (!r.side) assert.deepEqual(gives(truth.log), gives(lie.log), `${p}: the same things change hands either way`);
    else {
      const [win, other] = r.side === 'truth' ? [truth, lie] : [lie, truth];
      const g = gives(win.log).find(([id]) => id === r.item);
      assert.ok(g, `${p}: the ${r.side} gives ${r.item}`);
      assert.ok(!gives(other.log).some(([id]) => id === r.item), `${p}: the other answer gives no ${r.item}`);
      assert.equal(ITEMS[r.item].kind, 'consumable', `${p}: ${r.item} is a consumable`);
      assert.ok(!ITEMS[r.item].key, `${p}: never a key`);
      assert.ok(g[1] <= 2, `${p}: small (${g[1]})`);
    }
    // no route flag moves with the answer: the sets differ only by the pair
    const diff = (a, b) => a.filter((f) => !b.includes(f));
    const st = setsOf(truth.log), sl = setsOf(lie.log);
    if (r.byFlag) { assert.deepEqual(diff(st, sl), []); assert.deepEqual(diff(sl, st), []); }   // the memory scene sets nothing new
    else { assert.deepEqual(diff(st, sl), [T]); assert.deepEqual(diff(sl, st), [L]); }
  }
  const sides = Object.values(REWARD).map((r) => r.side);
  assert.equal(sides.filter((s) => s === 'truth').length, 6, 'half the twelve truths carry a gift');
  assert.ok(sides.filter((s) => s === 'lie').length >= 1 && sides.filter((s) => !s).length >= 3, 'some kind lies carry one, some answers none');
  assert.equal(REWARD.mael.side, null, "Mael pays in a line, never in ethers");
  for (const id of Object.keys(ALL)) for (const r of RUNS[id]) for (const t of says(r.log)) assert.ok(!/collect honest answers/i.test(t), `${id}: ${t}`);
});

test('Oren\'s pair is the H1 one, unchanged: the sign scene asks, the starter quest remembers', async () => {
  const none = await sceneTexts('oren_starter', ['starter_quest_started', 'starter_found']);
  const truth = await sceneTexts('oren_starter', ['starter_quest_started', 'starter_found', 'oren_truth']);
  assert.match(truth.filter((t) => !none.includes(t))[0], /my name/);
  assert.ok(LEDGER.filter((r) => !r.x1 && !r.region).every((r) => !r.flag || FLAGS[r.flag]), 'every core Ledger keep flag exists (the expansion registers its own)');
  assert.ok(!LEDGER.some((r) => /_truth$|_lie$/.test(r.flag || '')), 'no keep hangs on a Name Truth (no new scenes were allowed, so no new beats)');
});

// ------------------------------------------------------------------------------------------------ the route
const ROUTE1 = ['prologue', 'wake_up', 'fading_sign', 'mael_intro', 'mira_joins', 'south_gate', 'garrick_farewell', 'hazel_farewell',
  'leave_town', 'valley_arrival', 'first_fight', 'milestone', 'campfire_rest', 'quill_hint', 'archive_door', 'archive_f1_arrival',
  'find_letter_1', 'archive_f1_bell', 'archive_f2_arrival', 'find_letter_2', 'echo_warden', 'lantern_get', 'archive_f2_exit',
  'archive_f3_arrival', 'find_letter_3', 'thirteenth_bell', (s) => s.add('stacks_key_found'), 'boss_door', 'archivore',
  'return_to_willowmere', 'tess_letters', 'oren_starter'];
const MAIN1 = ['intro_done', 'met_mael', 'mira_joined', 'bram_joined', 'left_town', 'archive_entered', 'archive_f1_done',
  'echo_warden_defeated', 'lantern_get', 'archive_f2_done', 'boss_door_open', 'archivore_defeated', 'ep1_complete'];
const ROUTE2 = ['ep2_morning', 'ep2_mael', 'iris_farewell', 'tess_last_route', 'garrick_crossing', 'east_road_arrival', 'east_first_fight',
  'old_milestone', 'fading_stretch', 'fog_loop', 'waystation_rest', 'mere_view', 'nh_arrival', 'fountain_faces', 'elian_hall',
  'anwen_register', 'satchel_found', 'tovin_ferry', 'orla_fountain', 'lena_testimony', 'anwen_testimony', 'fountain_check',
  'court_crossing', 'nico_crowns', 'court_f1_arrival', 'mira_memory_1', (s) => s.add('glass_key_f1'), 'silverglass_lock',
  'court_f1_stairs', 'court_f2_arrival', 'portrait_child', 'portrait_keeper', 'portrait_king', 'mira_memory_2', 'vex_mirror',
  'other_selves', 'court_f2_stairs', 'court_f3_arrival', 'vow_belonging', (s) => s.add('paper_crown_found'), 'vow_mercy',
  'vow_courage', 'vow_door', 'black_feather', 'nameless_king', 'hollowmere_restored', 'nico_crowns', 'elian_letter'];
const MAIN2 = ['ep2_started', 'crossing_done', 'east_road_arrived', 'east_first_fight_done', 'nh_arrived', 'met_elian', 'heard_crisis',
  'met_anwen', 'court_ferry_open', 'court_entered', 'court_f1_done', 'vex_met', 'other_selves_defeated', 'court_f2_done',
  'vow_door_open', 'nameless_king_defeated', 'aurel_named', 'nh_restored', 'ep2_complete'];
// Decisions that answer every choice on the route with its SECOND option and still win every battle (a battle is a
// decision point too: 0 wins).
const TRUTHS1 = {};   // every truth is a first option (H6 put Mael's first with his new ask)
const LIES1 = { wake_up: [1], fading_sign: [1], mael_intro: [1, 1], hazel_farewell: [1], garrick_farewell: [1], campfire_rest: [1],
  quill_hint: [1], archive_door: [1], boss_door: [0], return_to_willowmere: [1], tess_letters: [1] };
const LIES2 = { ep2_morning: [1], ep2_mael: [1], waystation_rest: [1], nh_arrival: [1], elian_hall: [1, 1], anwen_register: [1],
  lena_testimony: [1], nico_crowns: [1], court_f1_arrival: [1], vex_mirror: [1], nameless_king: [1, 0] };

function flagOrder(order, logs, main) {
  const seen = {};
  const timeline = order.filter((st) => typeof st === 'string').flatMap((id) => logs[id][(seen[id] = (seen[id] ?? -1) + 1)]);
  return setsOf(timeline).filter((f) => main.includes(f));
}
const noPairs = (set) => [...set].filter((f) => !/_truth$|_lie$/.test(f)).sort();

test('the main route and its flag order are the same whichever answer is given (Episodes 1 and 2)', async () => {
  const t1 = await playthrough(EP1, ROUTE1, { choices: TRUTHS1 });
  const l1 = await playthrough(EP1, ROUTE1, { choices: LIES1 });
  assert.deepEqual(flagOrder(ROUTE1, t1.logs, MAIN1), MAIN1, 'Episode 1 main flags in order (truths)');
  assert.deepEqual(flagOrder(ROUTE1, l1.logs, MAIN1), MAIN1, 'Episode 1 main flags in order (lies)');
  assert.deepEqual(noPairs(t1.set), noPairs(l1.set), 'Episode 1: every other flag identical');
  assert.ok(EP1_PAIRS.every((p) => t1.set.has(`${p}_truth`)) && EP1_PAIRS.every((p) => l1.set.has(`${p}_lie`)), 'every Episode 1 pair was answered');
  const t2 = await playthrough(EP2, ROUTE2, { flags: EP1_DONE_FLAGS });
  const l2 = await playthrough(EP2, ROUTE2, { flags: EP1_DONE_FLAGS, choices: LIES2 });
  assert.deepEqual(flagOrder(ROUTE2, t2.logs, MAIN2), MAIN2, 'Episode 2 main flags in order (truths)');
  assert.deepEqual(flagOrder(ROUTE2, l2.logs, MAIN2), MAIN2, 'Episode 2 main flags in order (lies)');
  assert.deepEqual(noPairs(t2.set), noPairs(l2.set), 'Episode 2: every other flag identical');
  assert.ok(EP2_PAIRS.every((p) => t2.set.has(`${p}_truth`)) && EP2_PAIRS.every((p) => l2.set.has(`${p}_lie`)), 'every Episode 2 pair was answered');
});

// ------------------------------------------------------------------------------------------------ the floors (3.5)
test('every dungeon floor ends on exactly one new question: a line, a named sound, or a thing seen and not explained', async () => {
  const last = (log) => says(log).at(-1);
  const f1 = (await runOnce(EP1.archive_f1_bell, { flags: ['archive_entered', ...PARTY], branchFlags: false })).log;
  const bi = f1.findIndex((e) => e.op === 'setFlag' && e.args[0] === 'archive_f1_done');
  assert.ok(f1.slice(bi).some((e) => e.op === 'sfx' && e.args[0] === 'page_flutter'), 'F1: a page turns below');
  assert.match(last(f1), /Nobody is down there to turn them\.$/);
  assert.ok(!says(f1).some((t) => /short way/.test(t)), 'F1: no shortcut chore line before the question (H6, CRITIQUE_ARC 19)');
  assert.equal(ops(f1, 'say').at(-1).args[0], null, 'F1: seen, not explained (narration)');
  const f2 = (await runOnce(EP1.archive_f2_exit, { flags: ['lantern_get', ...PARTY], branchFlags: false })).log;
  assert.equal(last(f2), 'Or keep in.', 'F2 already ended on its question; left as it was');
  const f3 = (await runOnce(EP1.boss_door, { flags: ['archive_f2_done', 'stacks_key_found', ...PARTY], decisions: [0], branchFlags: false })).log;
  assert.match(last(f3), /Why would it stop\?$/);
  assert.ok(setsOf(f3).includes('boss_door_open'), 'F3: the door still opens on "Let\'s go"');
  const h = (await runOnce(EP1.hollow_after, { flags: ['briar_alpha_defeated', ...PARTY], branchFlags: false })).log;
  assert.match(last(h), /How did they know\?$/);
  const c1 = (await runOnce(EP2.court_f1_stairs, { flags: [...EP1_DONE_FLAGS, 'court_entered'], branchFlags: false })).log;
  assert.equal(ops(c1, 'say').length, 1, 'Court F1: one box');
  assert.ok(ops(c1, 'sfx').some((e) => e.args[0] === 'footstep_stone'));
  assert.match(last(c1), /going down ahead of you\.$/);
  const c2 = (await runOnce(EP2.court_f2_stairs, { flags: [...EP1_DONE_FLAGS, 'other_selves_defeated'], branchFlags: false })).log;
  assert.equal(ops(c2, 'say').length, 1, 'Court F2: one box');
  assert.match(last(c2), /What does yours know\?$/);
  const c3 = (await runOnce(EP2.vow_door, { flags: [...EP1_DONE_FLAGS, 'vow_belonging', 'vow_mercy', 'vow_courage'], branchFlags: false })).log;
  assert.ok(ops(c3, 'sfx').some((e) => e.args[0] === 'glass_break'), 'Court F3: glass cracks beyond the door');
  assert.match(last(c3), /Then another\.$/);
  for (const log of [f1, f3, h, c1, c2, c3]) for (const t of says(log)) assert.ok(fits(t) && !t.includes(EM_DASH), boxLines(t).join(' / '));
  // the one question never adds a second: exactly one new box per floor end, and the floor flag still lands
  assert.ok(setsOf(c1).includes('court_f1_done') && setsOf(c2).includes('court_f2_done') && setsOf(c3).includes('vow_door_open') && setsOf(h).includes('hollow_cleared'));
});

// ------------------------------------------------------------------------------------------------ the bosses (3.6)
test('every boss intro names what the town avoided: on the card where the card is ours, in the last box where it is pinned', async () => {
  const card = (log, name) => ops(log, 'title').find((e) => e.args[0] === name).args[1].sub;
  const w = (await runOnce(EP1.echo_warden, { flags: ['archive_f1_done', ...PARTY], branchFlags: false })).log;
  assert.equal(card(w, 'ECHO WARDEN'), 'Knight of the Last Order. Its relief never came.');
  const a = (await runOnce(EP1.archivore, { flags: ['boss_door_open', ...PARTY], branchFlags: false })).log;
  assert.equal(card(a, 'THE ARCHIVORE'), 'Eater of Names. It was fed for a hundred years.');
  const base = [...EP1_DONE_FLAGS, 'court_entered', 'court_f1_done', 'court_f2_arrived'];
  const o = (await runOnce(EP2.other_selves, { flags: base, branchFlags: false })).log;
  assert.equal(card(o, 'THE OTHER SELVES'), 'Hall of Reflections. The town turned from the water.');
  const k = (await runOnce(EP2.nameless_king, { flags: [...base, 'vow_door_open'], branchFlags: false })).log;
  const k2 = (await runOnce(EP2.nameless_king, { flags: [...base, 'vow_door_open', 'nameless_king_tried'], branchFlags: false })).log;
  assert.equal(card(k, 'THE NAMELESS KING'), 'Keeper of the Court. Nobody rowed across to ask him.');
  assert.equal(card(k2, 'THE NAMELESS KING'), card(k, 'THE NAMELESS KING'), 'the retry card says the same');
  const subs = [card(w, 'ECHO WARDEN'), card(a, 'THE ARCHIVORE'), card(o, 'THE OTHER SELVES'), card(k, 'THE NAMELESS KING')];
  for (const sub of subs) {
    assert.match(sub, /^[A-Z][^.]+\. [A-Z][^.]+\.$/, 'epithet, then one sentence about the avoidance');
    assert.ok(sub.length <= 56 && !sub.includes(EM_DASH), 'one line on the card (232 px of 384 in the body font)');
  }
  assert.ok(subs.filter((x) => /\. Nobody /.test(x)).length <= 1, 'the "Nobody" formula is not the moral (H6, CRITIQUE_ARC 18)');
  // The Briar Alpha's card is pinned by hollow.test.mjs, so its line is the last box before "The Alpha rises."
  const h = (await runOnce(EP1.hollow_alpha, { flags: ['lantern_get', 'hollow_found', ...PARTY], branchFlags: false })).log;
  assert.equal(card(h, 'BRIAR ALPHA'), 'Warden of the Lost Bridge');
  const s = says(h);
  const rise = s.findIndex((t) => /The Alpha rises/.test(t));
  assert.match(s[rise - 1], /Nobody came looking for the bridge, so nobody came looking for the names\.$/);
  assert.equal(ops(h, 'say')[rise - 1].args[0], 'mira');
});

// ------------------------------------------------------------------------------------------------ the Aim (3.3)
test('every main-quest step has a present-tense aim under 32 characters; the Aim line draws it and the title stays the title', () => {
  for (const q of [MAIN_QUEST, MAIN_QUEST_EP2, MAIN_QUEST_EP3]) {
    for (const st of q.steps) {
      assert.ok(typeof st.aim === 'string' && st.aim.length > 0 && st.aim.length < 32, `${q.id}.${st.id}: aim "${st.aim}"`);
      assert.ok(/^[\x20-\x7e]+$/.test(st.aim) && !st.aim.includes(EM_DASH), `${q.id}.${st.id}: plain ASCII`);
      assert.ok(/^[A-Z][a-z]+ /.test(st.aim) && !/^The |^A /.test(st.aim), `${q.id}.${st.id}: starts with a verb, not a title`);
      assert.ok(!/\bshould\b|\!$/.test(st.aim), `${q.id}.${st.id}: an aim, not advice`);
      assert.notEqual(st.aim, st.title, `${q.id}.${st.id}: the aim is not the title`);
    }
  }
  assert.equal(MAIN_QUEST.steps.find((s) => s.id === 'find_mira').aim, 'Find Mira at the library');
  // the field: a stand-in with the real prototype, a renderer that records what is drawn
  const field = Object.setPrototypeOf({ map: {}, cutscene: { running: false }, inputLocked: 0, pendingWarp: null, loading: false,
    banner: { active: false }, closeup: { isOpen: false }, fadeAlpha: 0, frame: 1, aim: { t: 0, step: null, title: '', still: 0 },
    game: { flags: {} }, hasFlag: (f) => !!field.flags[f], flags: { intro_done: true, met_mael: true } }, FieldScene.prototype);
  field.engine = { scene: field, cave: null };   // cave: the Deep Stacks hook (C2-world) the field reads for its floor tag
  for (let i = 0; i < 20; i++) { field.frame++; field.tickAim(false); }
  field.showAim();
  assert.equal(field.aim.title, 'The Apprentice', 'the step title is what the field keeps (H2 contract, LQ_DEBUG)');
  const drawn = [];
  const stub = new Proxy(function stub() {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : stub), apply: () => stub });
  const r = new Proxy({}, { get: (t, k) => (k === 'W' ? 384 : k === 'H' ? 216 : k === 'measure' ? (s) => s.length * 5 : k === 'text' ? (s) => drawn.push(s) : stub) });
  field.drawAim(r);
  assert.deepEqual(drawn, ['Find Mira at the library'], 'the Aim line draws the aim');
});

// ------------------------------------------------------------------------------------------------ the rules
test('every box of every touched scene fits, no em dash anywhere new, the docs list the choices', () => {
  const bad = [];
  for (const [id, runs] of Object.entries(RUNS)) {
    for (const r of runs) for (const e of r.log) {
      if (e.op === 'say' || e.op === 'title') { const t = e.args[e.op === 'say' ? 1 : 0]; if (!fits(t)) bad.push(`${id}: ${boxLines(t).join(' / ')}`); if (t.includes(EM_DASH)) bad.push(`${id}: em dash`); }
      if (e.op === 'title' && e.args[1] && e.args[1].sub && e.args[1].sub.includes(EM_DASH)) bad.push(`${id}: em dash on a card`);
      if (e.op === 'choice') for (const o of e.args[0]) { if (o.length > CHOICE_COLS) bad.push(`${id} choice: ${o}`); if (o.includes(EM_DASH)) bad.push(`${id}: em dash in choice`); }
    }
  }
  for (const rel of ['src/data/story/ep1.js', 'src/data/story/ep2.js', 'src/data/npcs.js', 'src/data/quests.js', 'src/scenes/field.js',
    'qa/content/h4_truth.test.mjs', 'docs/story/EPISODE1.md', 'docs/story/EPISODE2.md']) {
    if (readFileSync(join(NEXT, rel), 'utf8').includes(EM_DASH)) bad.push(`${rel}: em dash in source`);
  }
  assert.deepEqual(bad, []);
  const e1 = readFileSync(join(NEXT, 'docs/story/EPISODE1.md'), 'utf8'), e2 = readFileSync(join(NEXT, 'docs/story/EPISODE2.md'), 'utf8');
  assert.ok(/Name Truth/.test(e1) && /Name Truth/.test(e2), 'both bibles have the subsection');
  for (const n of ['Oren', 'Hazel', 'Mael', 'Garrick', 'Tess', 'Quill', 'Archive door']) assert.ok(e1.includes(n), `EPISODE1.md names ${n}`);
  for (const n of ['Corin', 'Elian', 'Lena', 'Anwen', 'Nico']) assert.ok(e2.includes(n), `EPISODE2.md names ${n}`);
});
