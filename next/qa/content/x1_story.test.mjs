// X1 content: the 42 scene designs (50 registered ids) of docs/EXPANSION1_PLAN.md section 2.6 and section 5. Every path of every
// scene, the cutscene API only, box budgets, music cues, the six quest-EXP calls, the guards and regions, and the staging doc.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { X1, registerAll, NEXT, X1_MAPS, ALL_MUSIC, ALL_SFX, X1_ITEMS, X1_ENCOUNTERS, MAP_TRACK, X1_NPC_SPRITES, EM } from './x1_helpers.mjs';
import { explore, runOnce, playthrough, DIRS, EMOTES, TINTS, PORTRAITS, NPC_SPRITES, EXTRA_SPRITES, MAP_IDS } from './_harness.mjs';
import { fits, boxLines } from '../../src/data/story/dialogue.js';
import { FLAGS } from '../../src/data/quests.js';
import { NPCS, SPEAKER_NAMES } from '../../src/data/npcs.js';
import { ITEMS } from '../../src/data/items.js';
import { SCENES } from '../../src/game/story.js';

registerAll();
const { rawScenes, scenes, SCENE_CONDITIONS, SCENE_MAP, SCENE_REGION, BOX_BUDGET, CHAINS, EXP_SCENES, GATE } = X1.story;
const { REWARDS_X1 } = X1.quests;
GATE.on = () => true;   // the playthrough tests run with the switch on; the guard tests flip it

// Plan 2.6: the boxes of each scene DESIGN (stray_found, star_read and crate_delivered are listed once and run per id).
const PLAN_BOXES = {
  downs_arrival: 3, thornfold_arrival: 4, brindle_strays: 5, stray_found_1: 1, stray_found_2: 1, stray_found_3: 1, stray_found_4: 1, stray_found_5: 1,
  strays_done: 5, stones_arrival: 3, rollcall_start: 5, iris_roll: 4, quill_copy: 3, rollcall_stones: 11, barrow_entry: 3, reeve_intro: 4, reeve_after: 5,
  rollcall_done: 3, cleft_hint: 2, terrace_arrival: 3, hesper_meet: 6, star_read_1: 2, star_read_2: 2, star_read_3: 2, orrery_align: 8,
  cellar_entry: 3, cellar_note: 6, crates_start: 4, crate_delivered_1: 2, crate_delivered_2: 2, crate_delivered_3: 2, crates_done: 4,
  mill_start: 6, millrace_arrival: 3, ferrick_meet: 6, culvert_entry: 2, golem_intro: 4, golem_after: 4, pin_place: 4, mill_done: 10,
  list_start: 4, list_rhyme: 2, list_ledger: 2, list_song: 2, list_done: 4, moor_arrival: 3, odo_meet: 5, larchhill_arrival: 3,
  yarrow_meet: 4, windmill_view: 3,
};
const FLAGS_JOINED = ['mira_joined', 'bram_joined'];
const ops = (log, op) => log.filter((e) => e.op === op);
const boxes = (log) => ops(log, 'say').length;

// Explore every path of every raw scene once (the chained children are neutralised with their own done flag for the "own boxes" count).
const NEUTRAL = { reeve_intro: ['reeve_after_done'], golem_intro: ['golem_after_done'], pin_place: ['mill_done'] };
const RUNS = {}, OWN = {};
for (const [id, fn] of Object.entries(rawScenes)) {
  RUNS[id] = await explore(fn, { flags: FLAGS_JOINED });
  OWN[id] = await explore(fn, { flags: [...FLAGS_JOINED, ...(NEUTRAL[id] || [])] });
}
const maxBoxes = (runs) => Math.max(...runs.map((r) => boxes(r.log)));
const allOps = (id) => RUNS[id].flatMap((r) => r.log);

test('42 scene designs, 50 registered ids; every scene has a guard, a map and a region', () => {
  assert.equal(Object.keys(scenes).length, 50);
  assert.equal(Object.keys(PLAN_BOXES).length, 50);
  const designs = new Set(Object.keys(scenes).map((id) => id.replace(/_[1-5]$/, '').replace(/^crate_delivered$/, 'crate_delivered')));
  assert.equal(designs.size, 42, `designs: ${[...designs].join(' ')}`);
  for (const id of Object.keys(scenes)) {
    assert.ok(id in SCENE_CONDITIONS, `no SCENE_CONDITIONS for ${id}`);
    assert.ok(id in SCENE_MAP && (X1_MAPS.includes(SCENE_MAP[id]) || MAP_IDS.includes(SCENE_MAP[id])), `${id}: map ${SCENE_MAP[id]}`);
    assert.ok(['west', 'north', 'south', 'wild'].includes(SCENE_REGION[id]), `${id}: region ${SCENE_REGION[id]}`);
  }
  for (const id of Object.keys(SCENE_CONDITIONS)) assert.ok(id in scenes, `condition for unknown scene ${id}`);
  // The wrapped scenes are what the shared table holds.
  for (const id of Object.keys(scenes)) assert.equal(SCENES[id], scenes[id]);
});

test('every scene runs on every path using only the cutscene API, and locks input in balance', async () => {
  for (const [id, fn] of Object.entries(scenes)) {
    const runs = await explore(fn, { flags: FLAGS_JOINED });
    for (const r of runs) assert.equal(ops(r.log, 'lockInput').length, ops(r.log, 'unlockInput').length, `${id}: lock/unlock mismatch`);
  }
  assert.ok(RUNS.rollcall_stones.length >= 4 && RUNS.reeve_intro.length >= 4, 'the variants branch');
});

test('scene text is ASCII, has no em dash, and never explains the forgetting', () => {
  let n = 0;
  for (const id of Object.keys(RUNS)) for (const r of RUNS[id]) for (const e of r.log) {
    const texts = e.op === 'say' ? [e.args[1]] : e.op === 'title' ? [e.args[0], e.args[1]?.sub] : e.op === 'choice' ? e.args[0] : [];
    for (const t of texts.filter(Boolean)) {
      n++;
      assert.ok(/^[ -~]*$/.test(t), `${id}: non-ASCII in ${t}`);
      assert.doesNotMatch(t, /erased|forgetting spell|magic|list-writer|Eraser|First Keeper|curse/i, `${id}: explains the forgetting: ${t}`);
    }
  }
  assert.ok(n > 300, `${n} strings checked`);
});

test('every box fits 3 lines of 42 characters with the longest hero name', () => {
  for (const id of Object.keys(RUNS)) for (const r of RUNS[id]) for (const e of r.log) {
    if (e.op === 'say') assert.ok(fits(e.args[1]), `${id}: ${boxLines(e.args[1]).join(' / ')}`);
    if (e.op === 'choice') for (const o of e.args[0]) assert.ok(o.length <= 28, `${id}: choice ${o}`);
  }
});

test('box budgets: each scene as the plan lists it, none over 12, the whole expansion at most 190', () => {
  let total = 0;
  for (const id of Object.keys(rawScenes)) {
    const own = maxBoxes(OWN[id]);
    assert.ok(own <= PLAN_BOXES[id], `${id}: ${own} boxes, plan says ${PLAN_BOXES[id]}`);
    assert.ok(own <= 12, `${id}: over 12`);
    assert.ok(maxBoxes(RUNS[id]) <= BOX_BUDGET[id], `${id}: chain ${maxBoxes(RUNS[id])} over its budget ${BOX_BUDGET[id]}`);
    total += own;
  }
  assert.ok(total <= 190, `total ${total} boxes`);
  assert.ok(total >= 150, `total ${total} boxes is suspiciously thin (the plan has about 180)`);
  // The chains are the plan's own figures: reeve 3 + 5, golem 3 + 4, pin 4 + 10 (14 together, the plan says so in 5.4).
  assert.equal(maxBoxes(RUNS.pin_place), 14);
  for (const [from, to] of Object.entries(CHAINS)) assert.ok(maxBoxes(RUNS[from]) >= maxBoxes(OWN[from]) + 1 && to in rawScenes, `${from} chains into ${to}`);
  assert.equal(total, 180 + 2, `total ${total}: the plan's 180 boxes plus the two W7 weakness lines (Reeve, Golem)`);
});

test('every id a scene references exists: speakers, spawns, portraits, music, sfx, items, encounters', () => {
  const npcIds = new Set([...Object.keys(NPCS), ...Object.keys(X1.npcs.X1_NPCS)]);
  const sprites = new Set([...NPC_SPRITES, ...EXTRA_SPRITES, ...X1_NPC_SPRITES]);
  const spawned = new Set();
  const BOSS_ACTORS = ['barrow_reeve', 'millstone_golem'];
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) {
    if (e.op !== 'spawn') continue;
    spawned.add(e.args[0]);
    const o = e.args[1] || {};
    assert.ok(sprites.has(o.sprite), `${id}: spawn sprite ${o.sprite}`);
    assert.ok(typeof o.at === 'string' && o.name, `${id}: spawn needs a mark and a name`);
  }
  const known = (who) => who == null || ['hero', 'mira', 'bram'].includes(who) || npcIds.has(who) || spawned.has(who) || BOSS_ACTORS.includes(who);
  const speakerNames = { ...SPEAKER_NAMES, ...X1.npcs.X1_SPEAKERS };
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) {
    const [a, b, c] = e.args;
    switch (e.op) {
      case 'say':
        assert.ok(known(a) || a in speakerNames, `${id}: unknown speaker ${a}`);
        if (c && c.portrait) assert.ok(PORTRAITS.includes(c.portrait), `${id}: portrait ${c.portrait}`);
        break;
      case 'walk': assert.ok(known(a) && a != null, `${id}: walk ${a}`); assert.ok(typeof b === 'string' || (Array.isArray(b) && b.every((d) => DIRS.includes(d))), `${id}: walk path`); break;
      case 'face': assert.ok(known(a) && a != null && (DIRS.includes(b) || known(b)), `${id}: face ${a} ${b}`); break;
      case 'emote': assert.ok(known(a) && EMOTES.includes(b), `${id}: emote`); break;
      case 'jump': case 'despawn': assert.ok(known(a), `${id}: ${e.op} ${a}`); break;
      case 'music': assert.ok(a === null || ALL_MUSIC.includes(a), `${id}: music ${a}`); break;
      case 'sfx': assert.ok(ALL_SFX.includes(a), `${id}: sfx ${a}`); break;
      case 'tint': assert.ok(TINTS.includes(a), `${id}: tint ${a}`); break;
      case 'fade': assert.ok(a === 'in' || a === 'out', `${id}: fade ${a}`); break;
      case 'give': case 'take':
        assert.ok(a === 'gold' || a === 'exp' || ITEMS[a] || X1_ITEMS.includes(a), `${id}: ${e.op} unknown item ${a}`);
        assert.ok(b === undefined || (Number.isInteger(b) && b > 0), `${id}: qty`);
        break;
      case 'battle': assert.ok(X1_ENCOUNTERS.includes(a), `${id}: encounter ${a}`); assert.equal(b.canFlee, false); assert.equal(b.boss, true); break;
      case 'addMember': assert.fail(`${id}: this expansion adds nobody`); break;
      case 'camera.panTo': assert.ok(typeof a === 'string', `${id}: panTo target`); break;
      case 'camera.follow': assert.ok(known(a) && a != null, `${id}: follow ${a}`); break;
      default: break;
    }
  }
  // Only Hal and Oren are spawned, only on the Millrace.
  assert.deepEqual([...spawned].sort(), ['hal_m', 'oren_m']);
});

test('music: a scene that changes the track puts the map\'s track back before it ends', () => {
  for (const id of Object.keys(RUNS)) {
    for (const r of RUNS[id]) {
      const lost = ops(r.log, 'battle').some((e) => e.args[2] === 'lose');
      if (lost) continue;
      const cues = ops(r.log, 'music').map((e) => e.args[0]);
      if (!cues.length) continue;
      const track = MAP_TRACK[SCENE_MAP[id]];
      assert.ok(track, `${id}: music on a map with no X1 track (${SCENE_MAP[id]})`);
      assert.equal(cues[cues.length - 1], track, `${id}: ends on ${cues[cues.length - 1]}, the map plays ${track}`);
    }
  }
  const stones = RUNS.rollcall_stones.flatMap((r) => ops(r.log, 'music').map((e) => e.args[0]));
  assert.ok(stones.includes('sorrow'), 'the Stones scene goes to sorrow');
  assert.ok(RUNS.orrery_align[0].log.some((e) => e.op === 'music' && e.args[0] === 'mystery'), 'the alignment goes to mystery');
});

test('quest EXP: the six closing scenes call give(exp, n) once, after the done flag, and nothing else does (54 in all)', async () => {
  assert.deepEqual(EXP_SCENES, { strays_done: 8, rollcall_done: 12, cellar_note: 8, crates_done: 6, mill_done: 12, list_done: 8 });
  assert.equal(Object.values(EXP_SCENES).reduce((a, b) => a + b, 0), 54);
  assert.equal(X1.quests.X1_QUEST_EXP_TOTAL, 54);
  const DONE_FLAG = { strays_done: 'strays_done', rollcall_done: 'rollcall_done', cellar_note: 'stars_done', crates_done: 'crates_done', mill_done: 'mill_done', list_done: 'list_done' };
  const reward = { strays_done: 'strays', rollcall_done: 'rollcall', cellar_note: 'dark_stars', crates_done: 'pell_crates', mill_done: 'four_rolls', list_done: 'not_to_forget' };
  for (const id of Object.keys(rawScenes)) {
    const full = RUNS[id].filter((r) => ops(r.log, 'give').some((e) => e.args[0] === 'exp'));
    if (!(id in EXP_SCENES) && id !== 'pin_place') { assert.equal(full.length, 0, `${id} gives EXP but is not a quest closing scene`); continue; }
    if (id === 'pin_place') continue;   // pin_place gives it through its chained mill_done
    assert.ok(full.length >= 1, `${id}: no path gives EXP`);
    for (const r of full) {
      const g = ops(r.log, 'give').filter((e) => e.args[0] === 'exp');
      assert.equal(g.length, 1, `${id}: EXP given ${g.length} times`);
      assert.equal(g[0].args[1], EXP_SCENES[id]);
      assert.equal(REWARDS_X1[reward[id]].exp, EXP_SCENES[id]);
      const iFlag = r.log.findIndex((e) => e.op === 'setFlag' && e.args[0] === DONE_FLAG[id]);
      const iExp = r.log.findIndex((e) => e.op === 'give' && e.args[0] === 'exp');
      assert.ok(iFlag >= 0 && iFlag < iExp, `${id}: the done flag is set before the EXP`);
    }
    // Behind the quest's done flag: the scene guard refuses it once the flag is set.
    const cond = SCENE_CONDITIONS[id];
    assert.ok([cond.ifNot].flat().includes(DONE_FLAG[id]) || id === 'cellar_note', `${id}: guard does not close on ${DONE_FLAG[id]}`);
  }
  assert.ok(RUNS.pin_place.some((r) => ops(r.log, 'give').some((e) => e.args[0] === 'exp' && e.args[1] === 12)), 'pin_place reaches the 12 EXP');
  // cellar_note re-read gives nothing (the fallback box).
  const reread = await runOnce(rawScenes.cellar_note, { flags: [...FLAGS_JOINED, 'stars_done'], branchFlags: false });
  assert.equal(ops(reread.log, 'give').length, 0);
});

test('rewards in the scenes are the rewards of REWARDS_X1', async () => {
  const gave = async (id, flags) => (await runOnce(rawScenes[id], { flags: [...FLAGS_JOINED, ...flags], branchFlags: false })).log.filter((e) => e.op === 'give').map((e) => [e.args[0], e.args[1] ?? 1]);
  assert.deepEqual(await gave('strays_done', []), [['fold_mantle', 1], ['gold', 100], ['exp', 8]]);
  assert.deepEqual(await gave('rollcall_done', []), [['rollcall_charm', 1], ['exp', 12]]);
  assert.deepEqual(await gave('crates_done', []), [['drover_boots', 1], ['exp', 6]]);
  assert.deepEqual(await gave('list_done', []), [['ether', 3], ['gold', 200], ['exp', 8]]);
  assert.deepEqual(await gave('mill_done', []), [['honey_roll', 8], ['gold', 200], ['exp', 12]]);
  assert.deepEqual(await gave('crates_start', []), [['pell_crate', 3]]);
  for (const k of Object.keys(REWARDS_X1)) assert.ok(REWARDS_X1[k].why.length > 5);
});

test('guards: a scene whose flags do not hold, or whose region is off, does nothing at all', async () => {
  try {
    GATE.on = () => true;
    // Flags not satisfied: the first-time scenes do nothing once done.
    for (const [id, done] of [['downs_arrival', 'downs_arrived'], ['barrow_entry', 'barrow_entered'], ['moor_arrival', 'moor_arrived'], ['hesper_meet', 'stars_started'],
      ['strays_done', 'strays_done'], ['rollcall_done', 'rollcall_done'], ['mill_done', 'mill_done'], ['list_done', 'list_done']]) {
      const { log } = await runOnce(scenes[id], { flags: [...FLAGS_JOINED, done, 'mill_turning', 'reeve_named', 'strays_started', 'stray_1_found', 'stray_2_found', 'stray_3_found', 'stray_4_found', 'stray_5_found'], branchFlags: false });
      assert.equal(log.filter((e) => e.op === 'say' || e.op === 'lockInput').length, 0, `${id} ran although ${done} is set`);
    }
    // Each scene runs under exactly its own `if` flags with the switch on, and each region switched off in turn removes exactly its scenes.
    const satisfy = (id) => [...FLAGS_JOINED, ...[SCENE_CONDITIONS[id].if].flat().filter(Boolean)];
    for (const id of Object.keys(scenes)) {
      GATE.on = () => true;
      const on = await runOnce(scenes[id], { flags: satisfy(id), branchFlags: false });
      assert.ok(on.log.some((e) => e.op === 'lockInput'), `${id} does not run under its own if flags`);
    }
    for (const region of ['west', 'north', 'south', 'wild']) {
      GATE.on = (r) => r !== region;
      for (const id of Object.keys(scenes)) {
        const { log } = await runOnce(scenes[id], { flags: satisfy(id), branchFlags: false });
        assert.equal(log.some((e) => e.op === 'lockInput'), SCENE_REGION[id] !== region, `${id}: region ${SCENE_REGION[id]} with ${region} off`);
      }
    }
    // Switch off entirely: nothing plays.
    GATE.on = () => false;
    for (const id of Object.keys(scenes)) assert.equal((await runOnce(scenes[id], { flags: satisfy(id), branchFlags: false })).log.length, 0, `${id} ran with the switch off`);
  } finally { GATE.on = () => true; }
});

test('with X1_LIVE false the default gate lets nothing in', async () => {
  const { X1_LIVE } = X1.live;
  if (X1_LIVE) return;   // the integrate agent flipped the switch: the guard tests above carry the rest
  const { log } = await runOnce(async (s) => { await scenes.downs_arrival(s); }, { flags: FLAGS_JOINED, branchFlags: false });
  void log;
  const gate = X1.story.GATE;
  const was = gate.on;
  gate.on = (r) => X1.live.x1On(r);
  assert.equal((await runOnce(scenes.downs_arrival, { flags: FLAGS_JOINED, branchFlags: false })).log.length, 0);
  gate.on = was;
});

test('stray sheep: five scenes, each despawns its own sheep and sets its own flag', async () => {
  for (let n = 1; n <= 5; n++) {
    const { log } = await runOnce(rawScenes[`stray_found_${n}`], { flags: FLAGS_JOINED, branchFlags: false });
    assert.deepEqual(ops(log, 'despawn').map((e) => e.args[0]), [`stray_${n}`]);
    assert.deepEqual(ops(log, 'setFlag').map((e) => e.args[0]), [`stray_${n}_found`]);
    assert.equal(boxes(log), 1);
  }
});

test('the quests can be played to the end: every quest\'s scenes in order set every done flag, in either order where the plan says so', async () => {
  const base = ['intro_done', 'met_mael', 'mira_joined', 'bram_joined', 'left_town', 'first_fight_done', 'archive_f1_done', 'lantern_get', 'archivore_defeated', 'hal_returned'];
  // Strays
  let r = await playthrough(scenes, ['downs_arrival', 'thornfold_arrival', 'brindle_strays', 'stray_found_1', 'stray_found_2', 'stray_found_3', 'stray_found_4', 'stray_found_5', 'strays_done'], { flags: base });
  assert.ok(r.set.has('strays_done'));
  // The Thirteenth Stone, stones first, then the Reeve
  r = await playthrough(scenes, ['stones_arrival', 'rollcall_start', 'iris_roll', 'quill_copy', 'rollcall_stones', 'barrow_entry', 'reeve_intro', 'rollcall_done'], { flags: base });
  assert.ok(['stones_lettered', 'reeve_named', 'rollcall_done'].every((f) => r.set.has(f)), 'stones first');
  // ... Quill first, then the Reeve before the stones (the encounter sets its own flag), then the stones with the missing beat
  r = await playthrough(scenes, ['stones_arrival', 'rollcall_start', 'quill_copy', 'iris_roll', 'barrow_entry', 'reeve_intro', (set) => set.add('barrow_reeve_defeated'), 'rollcall_stones', 'rollcall_done'], { flags: base });
  assert.ok(['stones_lettered', 'reeve_named', 'rollcall_done'].every((f) => r.set.has(f)), 'Reeve first');
  const variant = r.logs.rollcall_stones[0];
  assert.ok(variant.some((e) => e.op === 'say' && e.args[1].includes(X1.text.X1_NAMES_TO_CONFIRM.reeve.name)), 'the missing beat names the Reeve at the stones');
  // The Dark Stars
  r = await playthrough(scenes, ['terrace_arrival', 'hesper_meet', 'star_read_1', 'star_read_3', 'star_read_2', 'orrery_align', 'cellar_entry', 'cellar_note'], { flags: base });
  assert.ok(['stars_started', 'orrery_aligned', 'stars_done'].every((f) => r.set.has(f)));
  // Pell's Crates
  r = await playthrough(scenes, ['crates_start', 'crate_delivered_2', 'crate_delivered_1', 'crate_delivered_3', 'crates_done'], { flags: [...base, 'downs_arrived'] });
  assert.ok(['crates_done', 'pell_stamp'].every((f) => r.set.has(f)));
  // Four Rolls: the pin may already be in hand and the Golem down before Hal asks
  r = await playthrough(scenes, ['millrace_arrival', 'culvert_entry', 'golem_intro', (set) => set.add('pin_found'), 'mill_start', 'ferrick_meet', 'pin_place'], { flags: base });
  assert.ok(['mill_started', 'ferrick_met', 'mill_turning', 'mill_done'].every((f) => r.set.has(f)), 'four rolls');
  // Things Not To Forget
  r = await playthrough(scenes, ['list_start', 'list_rhyme', 'list_ledger', 'moor_arrival', 'odo_meet', 'list_song', 'list_done'], { flags: base });
  assert.ok(r.set.has('list_done'));
  // The rest of the arrivals
  r = await playthrough(scenes, ['larchhill_arrival', 'yarrow_meet', 'windmill_view', 'cleft_hint'], { flags: base });
  assert.ok(['larchhill_arrived', 'yarrow_met', 'windmill_seen', 'cleft_seen'].every((f) => r.set.has(f)));
});

test('object-run scenes never stay silent: early or repeated, they say one box', async () => {
  for (const [id, flags] of [['rollcall_stones', []], ['rollcall_stones', ['rollcall_started']], ['rollcall_stones', ['stones_lettered']], ['rollcall_stones', ['stones_lettered', 'reeve_named']],
    ['cellar_note', ['stars_done']], ['list_ledger', []], ['list_ledger', ['list_started', 'list_ledger']], ['star_read_1', ['stars_started', 'star_1_read']], ['pin_place', []]]) {
    const { log } = await runOnce(rawScenes[id], { flags: [...FLAGS_JOINED, ...flags], branchFlags: false });
    assert.equal(boxes(log), 1, `${id} [${flags}] should say exactly one box`);
    assert.equal(ops(log, 'setFlag').length, 0, `${id} [${flags}] must not set a flag`);
  }
});

test('the Reeve and the Golem: intro, name card, battle that cannot be fled, aftermath, and the encounter flags are not set by a scene', async () => {
  for (const [id, enc, bossMusic] of [['reeve_intro', 'barrow_reeve', 'boss_reeve'], ['golem_intro', 'millstone_golem', 'boss_millstone']]) {
    for (const r of RUNS[id]) {
      const b = ops(r.log, 'battle');
      if (!b.length) continue;
      assert.equal(b[0].args[0], enc);
      assert.deepEqual([b[0].args[1].boss, b[0].args[1].canFlee], [true, false]);
      assert.ok(ops(r.log, 'title').length >= 1, `${id}: name card`);
      assert.ok(ops(r.log, 'music').some((e) => e.args[0] === bossMusic));
    }
    for (const rid of Object.keys(rawScenes)) for (const r of RUNS[rid]) for (const e of ops(r.log, 'setFlag')) assert.ok(!['barrow_reeve_defeated', 'millstone_golem_defeated'].includes(e.args[0]), `${rid} sets an encounter flag`);
  }
  // A lost fight returns at once; a retry is short.
  const lost = RUNS.reeve_intro.find((r) => ops(r.log, 'battle').some((e) => e.args[2] === 'lose'));
  assert.ok(lost && !lost.log.some((e) => e.op === 'setFlag' && e.args[0] === 'reeve_after_done'));
  const retry = await runOnce(rawScenes.reeve_intro, { flags: [...FLAGS_JOINED, 'reeve_met'], branchFlags: false });
  assert.ok(boxes(retry.log) <= 1 + 1 + 5, 'a retry is the one-line intro, the weakness line, then the aftermath');
  // The two variants of the aftermath differ on stones_lettered; only the lettered one names the Reeve.
  const lettered = await runOnce(rawScenes.reeve_after, { flags: [...FLAGS_JOINED, 'stones_lettered'], branchFlags: false });
  const blank = await runOnce(rawScenes.reeve_after, { flags: FLAGS_JOINED, branchFlags: false });
  assert.ok(ops(lettered.log, 'setFlag').some((e) => e.args[0] === 'reeve_named'));
  assert.ok(!ops(blank.log, 'setFlag').some((e) => e.args[0] === 'reeve_named'));
  assert.ok(lettered.log.some((e) => e.op === 'say' && e.args[1].includes('Wystan') || e.args[1]?.includes?.(X1.text.X1_NAMES_TO_CONFIRM.reeve.name)));
});

test('Hal\'s request only after the Archivore; the mill door is a sound, never a scene', () => {
  assert.deepEqual([SCENE_CONDITIONS.mill_start.if].flat().sort(), ['archivore_defeated', 'hal_returned']);
  const prependHal = X1.npcs.X1_TALK_PREPEND.hal.find((e) => e.scene === 'mill_start');
  assert.ok([prependHal.if].flat().includes('archivore_defeated'));
  assert.ok(!('mill_barred' in scenes) && !('x1_mill_barred' in scenes));
  assert.match(X1.text.X1_LINES.x1_mill_barred, /bowls/);
});

test('names: one constant, read by the scenes (a changed name changes the scene)', async () => {
  const N = X1.text.X1_NAMES_TO_CONFIRM;
  const saved = JSON.stringify(N);
  try {
    N.stones[11] = 'Testa Stoneworth'; N.stones[0] = 'Zed Alpha'; N.reeve.name = 'Reevus'; N.keepers[1].name = 'Keeper Two'; N.song.title = 'The Test Song';
    const said = async (id, flags) => (await runOnce(rawScenes[id], { flags: [...FLAGS_JOINED, ...flags], branchFlags: false })).log.filter((e) => e.op === 'say').map((e) => e.args[1]).join(' | ');
    assert.match(await said('rollcall_stones', ['roll_found', 'copy_found']), /Testa Stoneworth/);
    assert.match(await said('iris_roll', []), /Zed Alpha/);
    assert.match(await said('reeve_after', ['stones_lettered']), /Reevus/);
    assert.match(await said('rollcall_done', []), /Reevus/);
    assert.match(await said('orrery_align', []), /Keeper Two/);
    assert.match(await said('list_done', []), /The Test Song/);
    assert.match(await said('list_song', []), new RegExp(N.song.firstLine.slice(0, 12)));
  } finally {
    Object.assign(N, JSON.parse(saved));
  }
});

test('the staging doc lists every scene, every mark a scene uses, and the names table', () => {
  const doc = readFileSync(join(NEXT, 'docs', 'story', 'STAGING_X1.md'), 'utf8');
  const sections = {};
  for (const part of doc.split('\n### ').slice(1)) {
    const head = part.split('\n')[0];
    if (!/^`[a-z0-9_`, ]+`$/.test(head.trim())) continue;
    for (const id of head.match(/[a-z0-9_]+/g)) sections[id] = (sections[id] || '') + part;
  }
  const sectionFor = (id) => sections[id] || sections[id.replace(/_\d$/, '_1')];
  for (const id of Object.keys(scenes)) assert.ok(sectionFor(id), `STAGING_X1.md has no section for ${id}`);
  const allowed = {
    x1_downs: 'valley_gate town_gate lane signpost thornfold loom_door fold_gate brindle well stones_center ring_n ring_e ring_s ring_w blank_stone barrow_door fold_ruin ridge moor_gate larch_gate drovers drovers_exit',
    x1_barrow: 'entrance hall_w switch niche ossuary counting plate hearth reeve_spot names reeve_chest',
    x1_terrace: 'stair_in stair_door cairn beacon court orrery_door walk_east roots edge moor_gate',
    x1_orrery: 'hesper orrery plate hatch door',
    x1_millrace: 'valley_gate drovers_gate signpost mill_door wheel pin_socket weir ferrick jetty larch_gate culvert bank_crack stone',
    x1_mill: 'door table ledger stones',
    x1_culvert: 'entrance plate_1 plate_2 gate pump pin_chest hearth golem_spot golem_chest',
    x1_highmoor: 'south_entry chime_1 chime_9 tarn islet tower odo bench view gorse stile terrace_west',
    x1_larchhill: 'north_gate windmill ladder apiary yarrow chute barrel aqueduct_end press east_gate hive_stand',
    valley: 'downs_gate cleft stair_foot south_track',
    x1_loomhouse: 'tamsin hearth sampler door',
  };
  for (const [id, fn] of Object.entries(rawScenes)) {
    const map = SCENE_MAP[id];
    const used = new Set();
    for (const r of OWN[id]) for (const e of r.log) {
      if (e.op === 'walk' && typeof e.args[1] === 'string' && !(e.args[1] in NPCS) && !['hero'].includes(e.args[1])) used.add(e.args[1]);
      if (e.op === 'camera.panTo') used.add(e.args[0]);
      if (e.op === 'spawn') used.add(e.args[1].at);
    }
    void fn;
    const text = sectionFor(id) || '';
    const marksLine = (text.match(/Marks: ([^.\n]*)/) || [])[1] || '';
    const listed = new Set([...marksLine.matchAll(/`([a-z0-9_]+)`/g)].map((m) => m[1]));
    for (const mark of used) {
      assert.ok(listed.has(mark), `${id}: STAGING_X1.md does not list the mark ${mark}`);
      if (allowed[map]) assert.ok(allowed[map].split(' ').includes(mark) || /^x1_/.test(mark), `${id}: ${mark} is not a plan 4.11 mark of ${map}`);
    }
    for (const mark of listed) if (allowed[map]) assert.ok(allowed[map].split(' ').includes(mark) || /^x1_/.test(mark), `${id}: STAGING lists ${mark}, not in plan 4.11 for ${map}`);
    // The boxes the doc states match the budget.
    const boxesLine = text.match(/Boxes: (\d+)/);
    assert.ok(boxesLine, `${id}: no Boxes line`);
    assert.ok(Number(boxesLine[1]) >= maxBoxes(OWN[id]) - 0, `${id}: STAGING says ${boxesLine[1]} boxes, the script has ${maxBoxes(OWN[id])}`);
  }
  // Names to confirm table.
  const N = X1.text.X1_NAMES_TO_CONFIRM;
  assert.ok(doc.includes('## 7. Names to confirm'));
  for (const n of [N.reeve.name, ...N.stones, ...N.keepers.map((k) => k.name), N.song.title, N.song.firstLine, ...N.chimePosts]) assert.ok(doc.includes(n), `Names to confirm: ${n} is missing from STAGING_X1.md`);
  // The EXP table.
  for (const [id, n] of Object.entries(EXP_SCENES)) assert.ok(new RegExp(`\`${id}\` \\| ${n} \\|`).test(doc), `EXP call site ${id} ${n}`);
  assert.ok(!doc.includes(EM));
});
