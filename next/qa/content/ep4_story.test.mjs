// Episode 4 story script (E4-story, the lazy ep4 pack): every scene and branch, the cutscene API, ids unique across four
// episodes and the X1, cave and tier packs, flags declared, boxes and budgets, music cues, staging, the struck name, the
// switch, and a playthrough to ep4_complete. Ids owned by other wave-4 agents (maps, sprites, encounters, items) are
// accepted by their planned ids (docs/EPISODE4_PLAN.md section 2).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scenes, SCENE_CONDITIONS, GATE, MAIN_PATH, BOX_BUDGET, register as registerScenes } from '../../src/data/ep4/story.js';
import { EP4_FLAGS, register as registerFlags } from '../../src/data/ep4/flags.js';
import { EP4_LINES, EPISODE5_CARD } from '../../src/data/ep4/text.js';
import { EP4_NPCS, EP4_SPEAKERS } from '../../src/data/ep4/npcs.js';
import { scenes as EP1_SCENES, lines as EP1_LINES } from '../../src/data/story/ep1.js';
import { scenes as EP2_SCENES, lines as EP2_LINES } from '../../src/data/story/ep2.js';
import { scenes as EP3_SCENES, lines as EP3_LINES } from '../../src/data/story/ep3.js';
import { FLAGS } from '../../src/data/quests.js';
import { NPCS, SPEAKER_NAMES } from '../../src/data/npcs.js';
import { fits, boxLines } from '../../src/data/story/dialogue.js';
import { explore, playthrough, runOnce, NEXT, read, EMOTES, DIRS } from './_harness.mjs';

const EM = String.fromCharCode(0x2014);
const BANNED = new RegExp(['cross', 'word'].join(''), 'i');
const EP3_DONE = ['intro_done', 'met_mael', 'mira_joined', 'bram_joined', 'archivore_defeated', 'ep1_complete', 'ep2_started',
  'ep2_complete', 'nh_restored', 'ep3_started', 'pk_restored', 'garrick_named', 'mara_named', 'ep3_complete', 'mirror_sigil_get'];
const MAIN_FLAGS = ['ep4_started', 'east_road_open', 'flood_road_arrived', 'flood_first_fight_done', 'vw_arrived', 'met_regent',
  'met_joss', 'keep_ferry_open', 'keep_entered', 'keep_f1_done', 'barrister_defeated', 'keep_f2_done', 'vex_archive_met',
  'petition_gate_open', 'hero_signed', 'paper_regent_defeated', 'lyra_named', 'charter_restored', 'tide_bell_rung', 'vw_restored',
  'ep4_complete'];
const PARTY = ['hero', 'mira', 'bram'];
const MAP_ACTORS = ['e_e4r_first', 'paper_regent'];
const EP4_MUSIC = ['valewyn', 'sunken_keep', 'boss_regent'];
const EP4_SFX = ['tide_wheel', 'water_rise', 'water_drain', 'seal_wash', 'seal_stamp', 'decree_void', 'decree_unroll', 'bell_drowned'];
const EP4_ENCOUNTERS = ['e4r_first', 'barrister', 'paper_regent'];
const EP4_ITEMS = ['running_decree', 'lock_crank', 'name_fragment_4', 'nilo_bell', 'tidewarden_trident', 'regents_pardon',
  'tidewalker_mantle', 'ferrymans_charm', 'hi_potion', 'hi_ether'];
const TINTS = ['none', 'dawn', 'night', 'flood_grey'];
const KNOWN = (f) => f in FLAGS || f === 'tier_1';   // tier_1: the Fine Print pack's flag (src/data/tier)

registerFlags();
GATE.live = true;
const RUNS = {};
for (const [id, fn] of Object.entries(scenes)) RUNS[id] = await explore(fn, { flags: ['mira_joined', 'bram_joined'] });
const allOps = (id) => RUNS[id].flatMap((r) => r.log);
const ops = (log, op) => log.filter((e) => e.op === op);
const musics = (log) => ops(log, 'music').map((e) => e.args[0]);
const says = (log) => ops(log, 'say');

test('scene ids are new across Episodes 1 to 3 and the X1, cave and tier packs; prefixes stay clear', async () => {
  const STORY = await import('../../src/game/story.js');
  for (const mod of ['../../src/data/x1/index.js', '../../src/data/cave/story.js']) {
    try { const m = await import(mod); await (m.register || m.default)(); } catch (e) { /* a pack that cannot load in node registers nothing */ }
  }
  for (const id of Object.keys(scenes)) {
    for (const t of [EP1_SCENES, EP2_SCENES, EP3_SCENES]) assert.ok(!(id in t), `scene ${id} exists in Episodes 1 to 3`);
    assert.ok(!(id in STORY.SCENES), `scene ${id} is already registered`);
    assert.ok(!/^(f[1-3]_|fo[1-3]_|sr_|pk_|oath_|vow_|foundry_|sand_)/.test(id), `prefix ${id}`);
  }
  for (const id of Object.keys(EP4_LINES)) {
    for (const t of [EP1_LINES, EP2_LINES, EP3_LINES]) assert.ok(!(id in t), `line ${id} exists in Episodes 1 to 3`);
    assert.ok(!(id in STORY.LINES), `line ${id} is already registered`);
  }
  const out = registerScenes();
  assert.deepEqual(out, { scenes: [], lines: [], conditions: [] });
  assert.deepEqual(registerScenes(), { scenes: [], lines: [], conditions: [] }, 'registering twice collides with nothing');
  for (const id of Object.keys(scenes)) assert.equal(STORY.SCENES[id], scenes[id]);
  assert.ok(Object.keys(scenes).length >= 30 && Object.keys(scenes).length < 40, `built scenes: ${Object.keys(scenes).length}`);
});

test('every scene runs on every path using only the cutscene API, and locks input', () => {
  for (const [id, runs] of Object.entries(RUNS)) {
    assert.ok(runs.length >= 1, id);
    for (const r of runs) {
      const active = r.log.filter((e) => e.op !== 'hasFlag');
      if (!active.length) continue;   // guard said no
      assert.equal(active[0].op, 'lockInput', `${id} locks first`);
      assert.equal(active.at(-1).op, 'unlockInput', `${id} unlocks last`);
    }
  }
});

test('scene conditions exist for every scene, use declared flags, and only ep4_morning needs the switch', () => {
  for (const id of Object.keys(scenes)) assert.ok(SCENE_CONDITIONS[id], `condition for ${id}`);
  for (const [id, c] of Object.entries(SCENE_CONDITIONS)) {
    for (const f of [c.if, c.ifNot].flat().filter(Boolean)) assert.ok(KNOWN(f), `${id}: undeclared ${f}`);
    assert.equal(!!c.live, id === 'ep4_morning', `${id}: live`);
  }
  assert.ok([SCENE_CONDITIONS.ep4_morning.ifNot].flat().includes('tier_1'));
});

test('every flag a scene sets or checks is declared; every main flag is set by a scene', () => {
  const set = new Set();
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) {
    if (e.op === 'setFlag') { set.add(e.args[0]); assert.ok(e.args[0] in FLAGS, `${id}: setFlag ${e.args[0]}`); }
    if (e.op === 'hasFlag') assert.ok(KNOWN(e.args[0]), `${id}: hasFlag ${e.args[0]}`);
  }
  for (const f of MAIN_FLAGS) assert.ok(set.has(f), `no scene sets ${f}`);
});

test('every id a scene references exists or is a planned Episode 4 id', () => {
  const manifest = JSON.parse(read(join(NEXT, 'assets', 'audio', 'manifest.json')));
  const speakers = new Set([...PARTY, ...Object.keys(NPCS), ...Object.keys(EP4_NPCS), ...Object.keys(SPEAKER_NAMES), ...Object.keys(EP4_SPEAKERS), ...MAP_ACTORS]);
  for (const [id] of Object.entries(RUNS)) {
    const spawned = new Set();
    for (const e of allOps(id)) {
      const a = e.args;
      switch (e.op) {
        case 'spawn': spawned.add(a[0]); assert.ok(a[1] && a[1].sprite && a[1].name && a[1].at, `${id}: spawn ${a[0]} needs sprite, name, at`); break;
        case 'say': if (a[0] != null) assert.ok(speakers.has(a[0]) || spawned.has(a[0]), `${id}: speaker ${a[0]}`); break;
        case 'emote': assert.ok(EMOTES.includes(a[1]), `${id}: emote ${a[1]}`); break;
        case 'face': assert.ok(DIRS.includes(a[1]) || speakers.has(a[1]) || spawned.has(a[1]), `${id}: face ${a[1]}`); break;
        case 'music': assert.ok(a[0] === null || a[0] in manifest.music || EP4_MUSIC.includes(a[0]), `${id}: music ${a[0]}`); break;
        case 'sfx': assert.ok(a[0] in manifest.sfx || EP4_SFX.includes(a[0]), `${id}: sfx ${a[0]}`); break;
        case 'tint': assert.ok(TINTS.includes(a[0]), `${id}: tint ${a[0]}`); break;
        case 'battle': assert.ok(EP4_ENCOUNTERS.includes(a[0]), `${id}: battle ${a[0]}`); break;
        case 'give': case 'take': assert.ok(a[0] === 'gold' || a[0] === 'exp' || EP4_ITEMS.includes(a[0]), `${id}: item ${a[0]}`); break;
        default:
      }
    }
  }
});

test('every box fits: 3 lines of 42 characters with an 8-letter hero name; choices fit; ASCII; titles fit', () => {
  const bad = [];
  const ascii = (s) => /^[\x20-\x7e]*$/.test(s);
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) {
    const text = e.op === 'say' ? e.args[1] : e.op === 'title' ? e.args[0] : null;
    if (text != null && !fits(text)) bad.push(`${id}: ${boxLines(text).join(' / ')}`);
    if (text != null && !ascii(text)) bad.push(`${id}: non-ASCII ${text}`);
    if (e.op === 'title' && e.args[1]?.sub && !(fits(e.args[1].sub) && e.args[1].sub.length <= 42)) bad.push(`${id}: title sub`);
    if (e.op === 'choice') for (const o of e.args[0]) if (o.length > 28 || !ascii(o)) bad.push(`${id} choice: ${o}`);
  }
  assert.deepEqual(bad, []);
  assert.ok(EPISODE5_CARD.text.length <= 42 && EPISODE5_CARD.sub.length <= 46);
});

// The struck name: only regent_after (from its flag), crown_remembers and ep4_ending may say it.
test('nobody says the Regent\'s name before regent_after sets lyra_named', () => {
  const free = new Set(['crown_remembers', 'ep4_ending']);
  for (const id of Object.keys(RUNS)) {
    if (free.has(id)) continue;
    for (const r of RUNS[id]) {
      let named = false;
      for (const e of r.log) {
        if (e.op === 'setFlag' && e.args[0] === 'lyra_named') named = true;
        if (e.op === 'spawn') assert.ok(named || !/lyra/i.test(e.args[1].name), `${id}: spawn named ${e.args[1].name} early`);
        if (e.op === 'say' && /\bLyra\b/.test(e.args[1])) assert.ok(named, `${id}: "${e.args[1]}" before lyra_named`);
      }
    }
  }
  // The swap: regent_t speaks before the flag, lyra_t after; the reveal is Mira's.
  const log = RUNS.regent_after.find((r) => ops(r.log, 'setFlag').some((e) => e.args[0] === 'lyra_named')).log;
  const flagAt = log.findIndex((e) => e.op === 'setFlag' && e.args[0] === 'lyra_named');
  const firstLyra = log.findIndex((e) => e.op === 'say' && /\bLyra\b/.test(e.args[1]));
  assert.ok(flagAt >= 0 && firstLyra > flagAt && log[firstLyra].args[0] === 'mira');
  const despawn = log.findIndex((e) => e.op === 'despawn' && e.args[0] === 'regent_t');
  const spawn = log.findIndex((e) => e.op === 'spawn' && e.args[0] === 'lyra_t');
  assert.ok(despawn > flagAt && spawn === despawn + 1, 'regent_t becomes lyra_t on the same beat');
  assert.equal(log[spawn].args[1].at, 'lyra_sign');
});

test('the hero never speaks; the hero signs, rings the stones and the bell', () => {
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) if (e.op === 'say') assert.notEqual(e.args[0], 'hero', `${id}: the hero speaks`);
  const wb = RUNS.witness_book.find((r) => ops(r.log, 'choice').length === 1).log;
  assert.ok(ops(wb, 'setFlag').some((e) => e.args[0] === 'hero_signed'));
  assert.ok(says(wb).some((e) => /learned Answer/.test(e.args[1])));
  // "Not yet." twice leaves the book open and sets nothing
  const twice = RUNS.witness_book.find((r) => ops(r.log, 'choice').length === 2 && ops(r.log, 'choice').every((c) => c.args[1] === 1));
  assert.ok(twice && !ops(twice.log, 'setFlag').length);
  for (const id of ['principle_voice', 'principle_truth', 'principle_mercy']) assert.ok(allOps(id).some((e) => e.op === 'sfx' && e.args[0] === 'bell_drowned'));
  assert.ok(RUNS.crown_remembers.some((r) => ops(r.log, 'sfx').filter((e) => e.args[0] === 'bell_drowned').length >= 3));
});

test('STAGING_EP4.md documents every scene, every mark and every inspect line', () => {
  const staging = read(join(NEXT, 'docs', 'story', 'STAGING_EP4.md'));
  const missing = [];
  for (const id of Object.keys(scenes)) if (!staging.includes('`' + id + '`')) missing.push(`scene ${id}`);
  const actors = new Set([...PARTY, ...Object.keys(NPCS), ...Object.keys(EP4_NPCS), ...MAP_ACTORS]);
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) if (e.op === 'spawn') actors.add(e.args[0]);
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) {
    let mark = null;
    if (e.op === 'walk' && typeof e.args[1] === 'string') mark = e.args[1];
    if (e.op === 'camera.panTo') mark = e.args[0];
    if (e.op === 'spawn') mark = e.args[1]?.at;
    if (mark && !actors.has(mark) && !staging.includes('`' + mark + '`')) missing.push(`${id}: mark ${mark}`);
  }
  for (const id of Object.keys(EP4_LINES)) if (!staging.includes('`' + id + '`')) missing.push(`line ${id}`);
  for (const f of ['EP4_LIVE', 'credits3_rolled', 'lyra_n', 'END_CARD_EP4', 'END_CARD_EP3_LIVE', 'noble_lady']) if (!staging.includes(f)) missing.push(f);
  assert.deepEqual([...new Set(missing)], []);
});

// A chained scene's own boxes: count until the chain point.
const ownBoxes = (log, stop) => {
  const i = stop ? log.findIndex(stop) : -1;
  return says(i < 0 ? log : log.slice(0, i)).length;
};
const STOPS = {
  paper_regent: (e) => e.op === 'battle',
  lyra_memory_3: (e) => e.op === 'setFlag' && e.args[0] === 'petition_gate_open',
  crown_remembers: (e) => e.op === 'setFlag' && e.args[0] === 'vw_restored',
};

test('box budgets: 12 per main scene (13 morning, 24 regent_after, 14 crown_remembers), about 220 on the main path', async () => {
  const over = [];
  let total = 0;
  for (const id of [...MAIN_PATH, 'witness_book', 'regent_after', 'ep4_ending']) {
    const cap = BOX_BUDGET[id] ?? BOX_BUDGET.default;
    const most = Math.max(...RUNS[id].map((r) => ownBoxes(r.log, STOPS[id])));
    if (most > cap) over.push(`${id}: ${most} > ${cap}`);
    total += most;
  }
  assert.deepEqual(over, []);
  assert.ok(total >= 150 && total <= 240, `main path boxes: ${total}`);
});

test('a full playthrough from a finished Episode 3 reaches ep4_complete with every main flag, in order', async () => {
  const give = (...f) => (set) => f.forEach((x) => set.add(x));
  const order = ['ep4_morning', 'east_road_gate', 'flood_road_arrival', 'flood_first_fight', 'flood_lane', 'ferry_rest', 'vw_view',
    'vw_arrival', 'vw_statue', (s) => assert.ok(!s.has('met_joss')), 'joss_locks', (s) => assert.ok(!s.has('met_joss'), 'Joss waits for the Regent'),
    'regent_hall', 'joss_locks', 'keep_ferry', 'keep_f1_arrival', 'lyra_memory_1', give('seal_key_found', 'tidegate_open'), 'keep_f1_lift',
    'keep_f2_arrival', 'lyra_memory_2', 'vex_archive', 'barrister', 'keep_f2_stair', 'keep_f3_arrival', 'principle_voice',
    'principle_truth', 'lyra_memory_3', (s) => assert.ok(!s.has('lyra_memory_3'), 'the gate needs the third stone'),
    'principle_mercy', 'lyra_memory_3', 'paper_regent', 'crown_remembers'];
  const { set } = await playthrough(scenes, order, { flags: EP3_DONE });
  for (const f of MAIN_FLAGS) assert.ok(set.has(f), `missing ${f}`);
  assert.ok(set.has('lyra_truth') && !set.has('lyra_kind'));
  // nothing replays
  const again = await playthrough(scenes, MAIN_PATH.filter((id) => !['ferry_rest', 'vw_statue'].includes(id)), { flags: [...set] });
  for (const logs of Object.values(again.logs)) for (const log of logs) assert.ok(!ops(log, 'say').length, 'a main scene replayed');
});

test('the switch: with EP4_LIVE false nothing in Episode 4 is reachable; Fine Print never starts it', async () => {
  GATE.live = false;
  try {
    const { set } = await playthrough(scenes, MAIN_PATH, { flags: EP3_DONE });
    for (const f of Object.keys(EP4_FLAGS)) assert.ok(!set.has(f), `${f} set with the switch off`);
  } finally { GATE.live = true; }
  const fp = await playthrough(scenes, ['ep4_morning', 'east_road_gate'], { flags: [...EP3_DONE, 'tier_1'] });
  assert.ok(!fp.set.has('ep4_started'));
  const ok = await playthrough(scenes, ['ep4_morning'], { flags: EP3_DONE });
  assert.ok(ok.set.has('ep4_started'));
});

// Issue #99 (2026-11-11): the morning plays at the east-road washout at first light; the inn (an old save's wake room) only
// moves the party there. It used to stage at the inn hearth or by the inn wall.
test('ep4_morning plays at the washout; from the inn it only moves the party there', async () => {
  const inn = (await runOnce(scenes.ep4_morning, { flags: EP3_DONE, branchFlags: false, mapId: 'pk_inn' })).log;
  const st = (await runOnce(scenes.ep4_morning, { flags: EP3_DONE, branchFlags: false, mapId: 'emberpeak' })).log;
  assert.deepEqual(inn.filter((e) => !['lockInput', 'unlockInput', 'hasFlag'].includes(e.op)).map((e) => e.op), ['fade', 'warp']);
  assert.deepEqual(ops(inn, 'warp')[0].args, ['emberpeak', 35, 15, 'right'], 'to dawn_stage');
  assert.equal(ops(st, 'spawn')[0].args[1].at, 'ada_rope');
  assert.ok(ops(st, 'walk').some((e) => e.args[0] === 'ada_t' && e.args[1] === 'ada_brink'), 'Ada comes up over the edge');
  assert.ok(ops(st, 'give').some((e) => e.args[0] === 'running_decree'));
  assert.ok(!ops(inn, 'give').length, 'nothing given before the move');
});

// Each map's track (plan 8.2). A scene that changes the music puts its map's track back before it ends.
const SCENE_TRACK = {
  ep4_morning: 'first_bell', vw_view: 'millrace', regent_hall: 'valewyn', lyra_memory_1: 'sunken_keep', lyra_memory_2: 'sunken_keep',
  vex_archive: 'sunken_keep', barrister: 'sunken_keep', witness_book: 'mystery', lyra_memory_3: 'mystery', crown_remembers: 'mystery',
};
test('music cues follow the cue sheet and return to the map track (plan 8.3)', async () => {
  for (const [id, track] of Object.entries(SCENE_TRACK)) for (const r of RUNS[id]) {
    const m = musics(r.log);
    const lost = ops(r.log, 'battle').some((e) => e.args[2] === 'lose');
    if (m.length && !lost) assert.equal(m.at(-1), track, `${id} ends on ${m.at(-1)}`);
  }
  const one = async (id, flags, mapId = null) => musics((await runOnce(scenes[id], { flags: [...EP3_DONE, ...flags], branchFlags: false, mapId })).log);
  assert.deepEqual(await one('ep4_morning', [], 'emberpeak'), ['mystery', 'first_bell']);
  assert.deepEqual(await one('vw_view', ['flood_road_arrived']), ['mystery', 'millrace']);
  assert.deepEqual(await one('regent_hall', ['vw_arrived']), ['sorrow', 'valewyn']);
  assert.deepEqual(await one('lyra_memory_1', ['keep_f1_arrived']), ['sorrow', 'sunken_keep']);
  assert.deepEqual(await one('vex_archive', ['keep_f2_arrived']), [null, 'mystery', 'sunken_keep']);
  assert.deepEqual(await one('barrister', ['keep_f2_arrived']), [null, 'battle', 'sunken_keep']);
  assert.deepEqual(await one('lyra_memory_3', ['principle_voice', 'principle_truth', 'principle_mercy']), [null, 'sorrow', null, 'triumph', 'mystery']);
  assert.deepEqual(await one('paper_regent', ['hero_signed']), [null, 'boss_regent', 'sorrow', 'triumph', 'mystery', 'valewyn']);
  assert.deepEqual(await one('crown_remembers', ['charter_restored']), [null, 'valewyn', null, 'mystery']);
  for (const id of ['principle_voice', 'principle_truth', 'principle_mercy', 'ferry_rest']) assert.deepEqual(await one(id, ['keep_f3_arrived', 'flood_road_arrived']), []);
});

test('boss intros: silence, the card, the theme, then the battle; a retry is short; a loss sets nothing after', async () => {
  for (const [id, flags, theme, card] of [['barrister', ['keep_f2_arrived'], 'battle', 'THE INKBOUND BARRISTER'],
    ['paper_regent', ['hero_signed'], 'boss_regent', 'THE PAPER REGENT']]) {
    const log = (await runOnce(scenes[id], { flags: [...EP3_DONE, ...flags], branchFlags: false })).log;
    const at = (op) => log.findIndex((e) => e.op === op);
    assert.equal(log[at('music')].args[0], null);
    assert.equal(log[at('title')].args[0], card);
    assert.ok(at('title') < at('battle'));
    assert.equal(log.slice(at('title'), at('battle')).find((e) => e.op === 'music').args[0], theme);
    const retry = (await runOnce(scenes[id], { flags: [...EP3_DONE, ...flags, `${id}_tried`], branchFlags: false })).log;
    const before = (l) => says(l.slice(0, l.findIndex((e) => e.op === 'battle'))).length;
    assert.ok(before(retry) < before(log) && before(retry) <= 2, `${id}: retry is short`);
    const lost = RUNS[id].find((r) => ops(r.log, 'battle').some((e) => e.args[2] === 'lose'));
    assert.ok(lost);
    const after = lost.log.slice(lost.log.findIndex((e) => e.op === 'battle'));
    assert.ok(!ops(after, 'setFlag').length && !ops(after, 'say').length, `${id}: a loss sets nothing`);
  }
});

test('the truth choice changes exactly one line in crown_remembers, and the gift', async () => {
  const run = async (id, flags) => (await runOnce(scenes[id], { flags: [...EP3_DONE, ...flags], branchFlags: false })).log;
  const t = says(await run('crown_remembers', ['charter_restored', 'lyra_truth'])).map((e) => e.args[1]);
  const k = says(await run('crown_remembers', ['charter_restored', 'lyra_kind'])).map((e) => e.args[1]);
  assert.equal(t.length, k.length);
  assert.equal(t.filter((x, i) => x !== k[i]).length, 1);
  const gift = (log) => ops(log, 'give').map((e) => e.args[0]).filter((x) => x === 'tidewarden_trident' || x === 'regents_pardon');
  assert.deepEqual(gift(await run('regent_after', ['paper_regent_defeated', 'lyra_truth'])), ['tidewarden_trident']);
  assert.deepEqual(gift(await run('regent_after', ['paper_regent_defeated', 'lyra_kind'])), ['regents_pardon']);
  const hall = RUNS.regent_hall.filter((r) => ops(r.log, 'choice').length);
  const sets = hall.map((r) => ops(r.log, 'setFlag').map((e) => e.args[0]).filter((f) => f.startsWith('lyra_')));
  assert.ok(sets.some((s) => s.includes('lyra_truth')) && sets.some((s) => s.includes('lyra_kind')));
});

test('side stories: the council choice exactly once, the other district only after ep4_complete; Nilo; the coffer', async () => {
  const W = ['witnesses_started', 'testimony_hale', 'testimony_dorian', 'testimony_joss'];
  const play = (order, flags) => playthrough(scenes, order, { flags: [...EP3_DONE, ...flags] });
  const a = await play([['council_choice', [0]], ['council_choice', [1]]], W);
  assert.ok(a.set.has('council_shelter') && !a.set.has('council_records') && a.set.has('witnesses_done'));
  const gives = Object.values(a.logs).flat(2).filter((e) => e.op === 'give' && e.args[0] === 'tidewalker_mantle');
  assert.equal(gives.length, 1);
  const b = await play([['council_choice', [1]]], [...W, 'council_shelter', 'witnesses_done', 'ep4_complete']);
  assert.ok(b.set.has('council_records'));
  const none = await play(['council_choice'], ['witnesses_started']);
  assert.ok(!none.set.has('council_shelter') && !none.set.has('council_records'));
  const n = await play(['nilo_bell', 'nilo_bell', (s) => s.add('nilo_bell_found'), 'nilo_bell', 'nilo_bell'], ['ferry_rested']);
  assert.ok(n.set.has('nilo_done'));
  assert.equal(Object.values(n.logs).flat(2).filter((e) => e.op === 'give' && e.args[0] === 'ferrymans_charm').length, 1);
  const c = await play(['coffer_records', 'coffer_records'], ['keep_f2_arrived']);
  assert.ok(c.set.has('coffer_found'));
});

test('the ban list: no banned word, no em dash, ASCII in every Episode 4 file E4-story writes', () => {
  for (const f of ['src/data/ep4/story.js', 'src/data/ep4/flags.js', 'src/data/ep4/npcs.js', 'src/data/ep4/quests.js',
    'src/data/ep4/text.js', 'src/data/ep4/ledger.js', 'docs/story/STAGING_EP4.md', 'qa/content/ep4_story.test.mjs',
    'qa/content/ep4_data.test.mjs', 'qa/content/ep4_boxes.mjs']) {
    const txt = readFileSync(join(NEXT, ...f.split('/')), 'utf8');
    assert.ok(!txt.includes(EM), `${f}: em dash`);
    assert.ok(!BANNED.test(txt), `${f}: banned word`);
    assert.ok(/^[\x09\x0a\x0d\x20-\x7e]*$/.test(txt), `${f}: non-ASCII`);
  }
});
