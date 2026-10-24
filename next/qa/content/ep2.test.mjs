// Episode 2 story script (E2-story): every scene and branch, ids, flags, boxes, music cues, staging, NPCs, quests
// and text. Ids owned by other wave-10 agents (maps, sprites, portraits, music, sfx, items, shops, encounters) are
// accepted by their planned ids in _harness.mjs and checked against the real data whenever it already exists.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scenes, lines, SCENE_CONDITIONS } from '../../src/data/story/ep2.js';
import { scenes as EP1_SCENES, lines as EP1_LINES } from '../../src/data/story/ep1.js';
import { scenes as EP3_SCENES } from '../../src/data/story/ep3.js';
import { NPCS, SPEAKER_NAMES, talkTo, isPresent } from '../../src/data/npcs.js';
import { FLAGS, EP2_FLAGS, REWARDS_EP2, MAIN_QUEST_EP2, SIDE_QUESTS_EP2, BANTER, partyChat, currentStep, journal,
  pickChat, mainQuestFor, MAIN_QUEST } from '../../src/data/quests.js';
import { ITEMS } from '../../src/data/items.js';
import { BESTIARY, BOOKS, BANNERS, BARKS, CREDITS_EP2 } from '../../src/data/text.js';
import { fits, boxLines, CHOICE_COLS, resolve } from '../../src/data/story/dialogue.js';
import { explore, playthrough, runOnce, NEXT, MUSIC, SFX, EMOTES, DIRS, TINTS, PORTRAITS, NPC_SPRITES, EXTRA_SPRITES,
  MAP_IDS, EP2_MAP_IDS, EP2_NPC_SPRITES, EP2_FIELD_SPRITES, EP2_PORTRAITS, EP2_MUSIC, EP2_SFX, EP2_ENEMY_IDS,
  EP2_ENCOUNTERS, EP2_ITEMS } from './_harness.mjs';

let ENCOUNTERS = null;
try { ({ ENCOUNTERS } = await import('../../src/data/encounters.js')); } catch { ENCOUNTERS = null; }
const encounterExists = (id) => (ENCOUNTERS && ENCOUNTERS[id]) || EP2_ENCOUNTERS.includes(id);
const itemExists = (id) => !!ITEMS[id] || EP2_ITEMS.includes(id);

// The Episode 2 main flags (plan 2.2), in story order.
const MAIN_FLAGS = ['ep2_started', 'crossing_done', 'east_road_arrived', 'east_first_fight_done', 'nh_arrived', 'met_elian',
  'heard_crisis', 'met_anwen', 'court_ferry_open', 'court_entered', 'court_f1_done', 'vex_met', 'other_selves_defeated',
  'court_f2_done', 'vow_door_open', 'nameless_king_defeated', 'aurel_named', 'nh_restored', 'ep2_complete'];
const EP1_DONE = ['intro_done', 'met_mael', 'mira_joined', 'bram_joined', 'left_town', 'archive_entered', 'archive_f1_done',
  'echo_warden_defeated', 'lantern_get', 'archive_f2_done', 'boss_door_open', 'archivore_defeated', 'returned_home',
  'ep1_complete'];
const MAP_ACTORS = ['e_road_mixed', 'tovin_c', 'nameless_king']; // map actors the scenes drive
const PARTY = ['hero', 'mira', 'bram'];
const ALL_MAPS = [...MAP_IDS, ...EP2_MAP_IDS];

const RUNS = {};
for (const [id, fn] of Object.entries(scenes)) RUNS[id] = await explore(fn, { flags: ['mira_joined', 'bram_joined'] });
const allOps = (id) => RUNS[id].flatMap((r) => r.log);
const ops = (log, op) => log.filter((e) => e.op === op);
const musics = (log) => ops(log, 'music').map((e) => e.args[0]);

test('scene and line ids never repeat an Episode 1 id', () => {
  for (const id of Object.keys(scenes)) assert.ok(!(id in EP1_SCENES), `scene ${id} exists in ep1.js`);
  for (const id of Object.keys(lines)) assert.ok(!(id in EP1_LINES), `line ${id} exists in ep1.js`);
  for (const id of [...Object.keys(scenes), ...Object.keys(EP2_FLAGS)]) assert.ok(!/^hollow_/.test(id), `bare hollow_ prefix: ${id}`);
});

test('every scene runs on every path using only the cutscene API, and locks input', () => {
  for (const [id, runs] of Object.entries(RUNS)) {
    assert.ok(runs.length >= 1, id);
    for (const r of runs) {
      assert.equal(ops(r.log, 'lockInput').length, ops(r.log, 'unlockInput').length, `${id}: lock/unlock mismatch`);
    }
  }
  assert.ok(RUNS.waystation_rest.length >= 3 && RUNS.nameless_king.length >= 4, 'choices branch');
});

test('scene conditions exist for every scene and use declared flags', () => {
  for (const id of Object.keys(scenes)) assert.ok(id in SCENE_CONDITIONS, `no SCENE_CONDITIONS for ${id}`);
  for (const [id, c] of Object.entries(SCENE_CONDITIONS)) {
    assert.ok(id in scenes, `condition for unknown scene ${id}`);
    for (const f of [c?.if, c?.ifNot].flat().filter(Boolean)) assert.ok(f in FLAGS, `${id}: undeclared flag ${f}`);
  }
});

test('every flag a scene sets or checks is declared; every main flag is set by a scene', () => {
  const set = new Set();
  for (const id of Object.keys(RUNS)) {
    for (const e of allOps(id)) {
      if (e.op === 'setFlag' || e.op === 'hasFlag') assert.ok(e.args[0] in FLAGS, `${id}: undeclared flag ${e.args[0]}`);
      if (e.op === 'setFlag' && e.args[1] !== false) set.add(e.args[0]);
    }
  }
  for (const f of MAIN_FLAGS) assert.ok(f in EP2_FLAGS && set.has(f), `no scene sets ${f}`);
  for (const [f, d] of Object.entries(EP2_FLAGS)) assert.ok(/^[a-z][a-z0-9_]*$/.test(f) && d.length > 5, f);
});

test('every id a scene references exists (or is a planned Episode 2 id)', () => {
  const npcIds = new Set(Object.keys(NPCS));
  const sprites = new Set([...NPC_SPRITES, ...EXTRA_SPRITES, ...EP2_NPC_SPRITES, ...EP2_FIELD_SPRITES]);
  const spawned = new Set();
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) {
    if (e.op !== 'spawn') continue;
    spawned.add(e.args[0]);
    const o = e.args[1] || {};
    assert.ok(sprites.has(o.sprite), `${id}: spawn sprite ${o.sprite}`);
    assert.ok(typeof o.at === 'string', `${id}: spawn needs a mark`);
    assert.ok(typeof o.name === 'string' && o.name, `${id}: spawned speaker needs a name`);
  }
  const known = (who) => who == null || PARTY.includes(who) || npcIds.has(who) || spawned.has(who) || MAP_ACTORS.includes(who);
  const speaker = (who) => known(who) || who in SPEAKER_NAMES;
  for (const id of Object.keys(RUNS)) {
    for (const e of allOps(id)) {
      const [a, b, c] = e.args;
      switch (e.op) {
        case 'say':
          assert.ok(speaker(a), `${id}: unknown speaker ${a}`);
          if (c && c.portrait) assert.ok(PORTRAITS.includes(c.portrait) || EP2_PORTRAITS.includes(c.portrait), `${id}: portrait ${c.portrait}`);
          break;
        case 'walk':
          assert.ok(known(a) && a != null, `${id}: walk unknown actor ${a}`);
          assert.ok(typeof b === 'string' || (Array.isArray(b) && b.every((d) => DIRS.includes(d))), `${id}: walk path`);
          break;
        case 'face': assert.ok(known(a) && a != null && (DIRS.includes(b) || known(b)), `${id}: face ${a} ${b}`); break;
        case 'emote': assert.ok(known(a) && EMOTES.includes(b), `${id}: emote ${a} ${b}`); break;
        case 'jump': case 'despawn': assert.ok(known(a), `${id}: ${e.op} unknown actor ${a}`); break;
        case 'music': assert.ok(a === null || MUSIC.includes(a) || EP2_MUSIC.includes(a), `${id}: music ${a}`); break;
        case 'sfx': assert.ok(SFX.includes(a) || EP2_SFX.includes(a), `${id}: sfx ${a}`); break;
        case 'tint': assert.ok(TINTS.includes(a), `${id}: tint ${a}`); break;
        case 'fade': assert.ok(a === 'in' || a === 'out', `${id}: fade ${a}`); break;
        case 'give': case 'take':
          assert.ok(itemExists(a), `${id}: ${e.op} unknown item ${a}`);
          assert.ok(b === undefined || (Number.isInteger(b) && b > 0), `${id}: qty`);
          break;
        case 'battle': assert.ok(encounterExists(a), `${id}: unknown encounter ${a}`); break;
        case 'addMember': assert.fail(`${id}: Episode 2 adds nobody`); break;
        case 'camera.panTo': assert.ok(typeof a === 'string', `${id}: panTo target`); break;
        case 'camera.follow': assert.ok(known(a) && a != null, `${id}: follow ${a}`); break;
        default: break;
      }
    }
  }
});

test('every box fits: 3 lines of 42 characters with an 8-letter hero name; choices fit; ASCII only', () => {
  const bad = [];
  const ascii = (s) => [...s].every((ch) => ch.codePointAt(0) >= 0x20 && ch.codePointAt(0) <= 0x7e);
  for (const id of Object.keys(RUNS)) {
    for (const e of allOps(id)) {
      const text = e.op === 'say' ? e.args[1] : e.op === 'title' ? e.args[0] : null;
      if (text != null && !fits(text)) bad.push(`${id}: ${boxLines(text).join(' / ')}`);
      if (text != null && !ascii(text)) bad.push(`${id}: non-ASCII in ${text}`);
      if (e.op === 'title' && e.args[1]?.sub && !fits(e.args[1].sub)) bad.push(`${id}: title sub`);
      if (e.op === 'choice') for (const o of e.args[0]) if (o.length > CHOICE_COLS || !ascii(o)) bad.push(`${id} choice: ${o}`);
    }
  }
  assert.deepEqual(bad, []);
});

test('inspect lines resolve, fit, use declared flags and end on a fallback', () => {
  const walk = (where, v) => {
    if (typeof v === 'string') { assert.ok(fits(v), `${where}: ${boxLines(v).join(' / ')}`); return; }
    assert.ok(Array.isArray(v) && v.length, `${where}: empty`);
    for (const x of v) {
      if (typeof x === 'string') walk(where, x);
      else if (x && 'text' in x) { walk(where, x.text); assert.ok(x.who === null || x.who in SPEAKER_NAMES || PARTY.includes(x.who), `${where}: who ${x.who}`); }
      else {
        for (const f of [x.if, x.ifNot].flat().filter(Boolean)) assert.ok(f in FLAGS, `${where}: undeclared flag ${f}`);
        walk(where, x.lines);
      }
    }
    if (v.length && typeof v[0] === 'object' && 'lines' in v[0]) {
      const last = v[v.length - 1];
      assert.ok(!last.if && !last.ifNot, `${where}: conditional list needs a fallback last`);
    }
  };
  for (const [id, v] of Object.entries(lines)) walk(`lines.${id}`, v);
  // Every inspect id the bible and the plan name resolves.
  for (const id of ['ford_wrack', 'garrick_rail', 'smithy_ford_note', 'east_signpost', 'cairn', 'toll_board', 'gate_sign',
    'proclamation', 'plinth', 'fountain', 'register', 'lost_property', 'court_lens', 'portrait_blank', 'throne_glass',
    'court_note', 'nh_candles', 'tovin_landing', 'wm_chapel_mirror', 'elian_desk_note'])
    assert.ok(lines[id], `missing inspect line ${id}`);
  // The restoration changes what the town's signs say.
  assert.notDeepEqual(resolve(lines.gate_sign, () => false), resolve(lines.gate_sign, (f) => f === 'nh_restored'));
});

test('STAGING_EP2.md documents every scene and every mark the script refers to', () => {
  const staging = readFileSync(join(NEXT, 'docs', 'story', 'STAGING_EP2.md'), 'utf8');
  const missing = [];
  for (const id of Object.keys(scenes)) if (!staging.includes('`' + id + '`')) missing.push(`scene ${id}`);
  const actors = new Set([...PARTY, ...Object.keys(NPCS), ...MAP_ACTORS]);
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) {
    if (e.op === 'spawn') actors.add(e.args[0]);
  }
  for (const id of Object.keys(RUNS)) {
    for (const e of allOps(id)) {
      let mark = null;
      if (e.op === 'walk' && typeof e.args[1] === 'string') mark = e.args[1];
      if (e.op === 'camera.panTo') mark = e.args[0];
      if (e.op === 'spawn') mark = e.args[1]?.at;
      if (mark && !actors.has(mark) && !staging.includes('`' + mark + '`')) missing.push(`${id}: mark ${mark}`);
    }
  }
  for (const id of Object.keys(lines)) if (!staging.includes('`' + id + '`')) missing.push(`line ${id}`);
  assert.deepEqual([...new Set(missing)], []);
});

// ------------------------------------------------------------------------------------------------
// A full playthrough in story order, from a finished Episode 1.
// ------------------------------------------------------------------------------------------------
const giveFlag = (...flags) => (set) => flags.forEach((f) => set.add(f)); // what a map receptor / chest would do
const ORDER = [
  'ep2_morning', 'garrick_crossing',
  (s) => assert.ok(!s.has('crossing_done'), 'the crossing needs Mael first'),
  'ep2_mael', 'iris_farewell', 'tess_last_route', 'garrick_crossing',
  'east_road_arrival', 'east_first_fight', 'old_milestone', 'fading_stretch', 'fog_loop', 'waystation_rest', 'mere_view',
  'nh_arrival', 'elian_hall',
  (s) => assert.ok(!s.has('heard_crisis'), 'the hall needs the fountain first'),
  'fountain_faces', 'elian_hall', 'anwen_register', 'satchel_found', 'tovin_ferry',
  'orla_fountain', 'lena_testimony', 'anwen_testimony', 'fountain_check',
  'court_crossing', 'nico_crowns', 'court_f1_arrival', 'mira_memory_1', giveFlag('glass_key_f1'),
  'silverglass_lock', 'court_f1_stairs',
  'court_f2_arrival', 'portrait_child', 'portrait_keeper', 'portrait_king', 'mira_memory_2', 'vex_mirror', 'other_selves',
  'court_f2_stairs', 'court_f3_arrival',
  'vow_door',
  (s) => assert.ok(!s.has('vow_door_open'), 'the vow door needs three vows'),
  'vow_belonging', giveFlag('paper_crown_found'), 'vow_mercy', 'vow_courage', 'vow_door', 'black_feather',
  'nameless_king', 'hollowmere_restored',
];

test('a full playthrough reaches ep2_complete with every main flag set, in order', async () => {
  const { set, logs } = await playthrough(scenes, ORDER, { flags: EP1_DONE });
  for (const f of MAIN_FLAGS) assert.ok(set.has(f), `missing ${f}`);
  const given = Object.values(logs).flat(2).filter((e) => e.op === 'give').map((e) => e.args[0]);
  for (const it of ['mael_letter', 'name_fragment_2', 'mirror_sigil', 'kept_promise', 'courier_satchel', 'merewarden_mantle',
    'black_feather', 'hi_potion'])
    assert.ok(given.includes(it), `never given: ${it}`);
  // Garrick is away exactly between Mael's errand and the crossing.
  assert.ok(!set.has('garrick_at_ford'));
  // The king_after order: the fragment before the Sigil before the bow.
  const ka = logs.nameless_king[0].filter((e) => e.op === 'give').map((e) => e.args[0]);
  assert.deepEqual(ka, ['name_fragment_2', 'mirror_sigil', 'kept_promise']);
  // Each main flag is set after the previous one.
  const seen = {};
  const timeline = ORDER.filter((st) => typeof st === 'string').flatMap((id) => logs[id][(seen[id] = (seen[id] ?? -1) + 1)]);
  const order = timeline.filter((e) => e.op === 'setFlag' && MAIN_FLAGS.includes(e.args[0])).map((e) => e.args[0]);
  const firsts = MAIN_FLAGS.map((f) => order.indexOf(f));
  assert.deepEqual([...firsts].sort((a, b) => a - b), firsts, 'main flags out of order');
});

test('guards: nothing in Episode 2 fires before Episode 1 is complete, and nothing replays', async () => {
  const fresh = await playthrough(scenes, Object.keys(scenes).filter((id) => !['old_milestone'].includes(id)));
  for (const [id, runs] of Object.entries(fresh.logs)) for (const log of runs) assert.equal(ops(log, 'say').length, 0, `${id} ran early`);
  const done = await playthrough(scenes, ORDER, { flags: EP1_DONE });
  const again = await playthrough(scenes, ['ep2_morning', 'ep2_mael', 'garrick_crossing', 'nh_arrival', 'tovin_ferry',
    'other_selves', 'nameless_king', 'hollowmere_restored', 'vow_belonging'], { flags: [...done.set] });
  for (const [id, runs] of Object.entries(again.logs)) for (const log of runs) assert.equal(ops(log, 'say').length, 0, `${id} replayed`);
});

test('the teaching fight: unavoidable, Reflect named without signage, a loss sets nothing', async () => {
  const win = await runOnce(scenes.east_first_fight, { flags: [...EP1_DONE, 'crossing_done'], branchFlags: false });
  const b = ops(win.log, 'battle')[0];
  assert.equal(b.args[0], 'road_mixed');
  assert.equal(b.args[1].canFlee, false);
  assert.ok(ops(win.log, 'walk').some((e) => e.args[0] === 'e_road_mixed'));
  assert.ok(ops(win.log, 'say').some((e) => /glittering/.test(e.args[1])));
  for (const e of ops(win.log, 'say')) assert.doesNotMatch(e.args[1], /press|button|tutorial/i);
  const lose = await runOnce(scenes.east_first_fight, { flags: [...EP1_DONE, 'crossing_done'], decisions: [1], branchFlags: false });
  assert.ok(!lose.log.some((e) => e.op === 'setFlag'));
});

test('boss intros: pan 40, silence, dialogue, title card, shake, flash, theme, then the battle', async () => {
  const check = (log, card, theme) => {
    const first = (op) => log.findIndex((e) => e.op === op);
    assert.equal(log[first('music')].args[0], null, 'silence first');
    assert.equal(log.find((e) => e.op === 'camera.panTo').args[1], 40);
    const ti = log.findIndex((e) => e.op === 'title' && e.args[0] === card);
    const bi = first('battle');
    assert.ok(ti > 0 && log[ti].args[1].sub && log[ti].args[1].frames <= 120);
    assert.ok(ops(log.slice(0, ti), 'say').length >= 5);
    const between = log.slice(ti, bi);
    assert.ok(between.some((e) => e.op === 'shake') && between.some((e) => e.op === 'flash'));
    assert.equal(between.find((e) => e.op === 'music').args[0], theme);
    assert.equal(ops(between, 'say').length, 0);
    assert.equal(log[bi].args[1].boss, true);
    assert.equal(log[bi].args[1].canFlee, false);
  };
  const base = [...EP1_DONE, 'court_entered', 'court_f1_done', 'court_f2_arrived'];
  check((await runOnce(scenes.other_selves, { flags: base, branchFlags: false })).log, 'THE OTHER SELVES', 'battle');
  check((await runOnce(scenes.nameless_king, { flags: [...base, 'vow_door_open'], branchFlags: false })).log, 'THE NAMELESS KING', 'boss_king');
});

// Each map's track (plan 8.2). A scene that changes the music puts its map's track back before it ends.
const SCENE_MAP = {
  waystation_rest: 'fading_road', mere_view: 'fading_road', nh_arrival: 'hollow', fountain_faces: 'hollow',
  anwen_register: 'hollow', tovin_ferry: 'hollow', fountain_check: 'hollow', court_crossing: 'court',
  mira_memory_1: 'court', mira_memory_2: 'court', vex_mirror: 'court', other_selves: 'court', court_f3_arrival: 'mystery',
  vow_belonging: 'mystery', vow_mercy: 'mystery', vow_courage: 'mystery', vow_door: 'mystery',
};

test('music cues follow the cue sheet and return to the map track (plan 8.3)', async () => {
  const P = [...EP1_DONE, 'crossing_done', 'nh_arrived', 'met_elian', 'heard_crisis', 'met_anwen', 'court_ferry_open',
    'court_entered', 'court_f1_arrived', 'court_f1_done', 'court_f2_arrived', 'court_f2_done', 'fountain_started',
    'testimony_lena', 'testimony_tovin', 'testimony_anwen'];
  for (const [id, track] of Object.entries(SCENE_MAP)) {
    for (const r of RUNS[id]) {
      const m = musics(r.log);
      const won = !ops(r.log, 'battle').some((e) => e.args[2] === 'lose');
      if (m.length && won) assert.equal(m.at(-1), track, `${id} ends on ${m.at(-1)}`);
    }
  }
  const one = async (id, extra = []) => musics((await runOnce(scenes[id], { flags: [...P, ...extra], branchFlags: false })).log);
  assert.deepEqual(await one('mere_view'), ['mystery', 'fading_road']);
  assert.deepEqual(musics((await runOnce(scenes.fountain_faces, { flags: [...EP1_DONE, 'nh_arrived'], branchFlags: false })).log), ['mystery', 'hollow']);
  assert.deepEqual(await one('fountain_check'), ['mystery', 'hollow']);
  assert.deepEqual(musics((await runOnce(scenes.anwen_register, { flags: [...EP1_DONE, 'heard_crisis'], branchFlags: false })).log), ['sorrow', 'hollow']);
  assert.deepEqual(musics((await runOnce(scenes.vex_mirror, { flags: [...EP1_DONE, 'court_f2_arrived'], branchFlags: false })).log), [null, 'mystery', 'court']);
  assert.deepEqual(musics((await runOnce(scenes.nameless_king, { flags: [...EP1_DONE, 'vow_door_open'], branchFlags: false })).log),
    [null, 'boss_king', 'sorrow', 'triumph', 'mystery', 'hollowmere']);
  assert.deepEqual(musics((await runOnce(scenes.hollowmere_restored, { flags: [...EP1_DONE, 'aurel_named'], branchFlags: false })).log),
    ['hollowmere', null, 'mystery']);
  const manifest = JSON.parse(readFileSync(join(NEXT, 'assets', 'audio', 'manifest.json'), 'utf8'));
  for (const [id, runs] of Object.entries(RUNS)) for (const r of runs) for (const m of musics(r.log))
    assert.ok(m === null || m in manifest.music || EP2_MUSIC.includes(m), `${id}: music ${m}`);
});

test('the King: Mira gives the one battle tip; the unmasking keeps the bible order', async () => {
  const { log } = await runOnce(scenes.nameless_king, { flags: [...EP1_DONE, 'vow_door_open'], branchFlags: false });
  const says = ops(log, 'say').map((e) => e.args[1]);
  const at = (re) => says.findIndex((t) => re.test(t));
  const order = [/I traded my name for theirs/, /I remember your son, and I remember you/, /waiting fifteen years/,
    /always too big for you/, /^\.\.\.Father\.$/, /Your name is Aurel/, /^Hollowmere\.$/, /on this page too/,
    /First Library/, /silver hair/, /Any mirror the Keepers made/, /whole promise/, /Go through/];
  const idx = order.map(at);
  for (const [i, v] of idx.entries()) assert.ok(v >= 0, `missing line ${order[i]}`);
  assert.deepEqual([...idx].sort((a, b) => a - b), idx, 'king_after lines out of order');
  assert.ok(says.some((t) => /When his mirror turns to one of us, defend/.test(t)));
});

test('the portraits open the cache only on the third, in any order', async () => {
  const base = [...EP1_DONE, 'court_f1_done', 'court_f2_arrived'];
  for (const order of [['portrait_king', 'portrait_child', 'portrait_keeper'], ['portrait_keeper', 'portrait_king', 'portrait_child']]) {
    const { set } = await playthrough(scenes, [order[0], order[1], (s) => assert.ok(!s.has('remembrance_open')), order[2]], { flags: base });
    assert.ok(set.has('remembrance_open') && set.has('portraits_started'));
  }
});

test('side quests run start to finish and pay out once', async () => {
  const { set, logs } = await playthrough(scenes, [
    'tess_last_route', 'tess_last_route', 'satchel_found', 'satchel_found', 'tess_last_route', 'tess_last_route',
    'tovin_ferry', 'fountain_check', 'orla_fountain', 'fountain_check', 'lena_testimony', 'anwen_testimony',
    'fountain_check', 'fountain_check',
    'nico_crowns', 'nico_crowns', giveFlag('paper_crown_found'), 'nico_crowns', 'nico_crowns',
    giveFlag('nh_restored'), 'elian_letter', 'elian_letter', 'letter_answer', 'letter_answer',
  ], { flags: [...EP1_DONE, 'ep2_started', 'crossing_done', 'nh_arrived', 'met_elian', 'heard_crisis', 'met_anwen', 'court_entered'] });
  for (const f of ['last_route_done', 'fountain_done', 'nico_crowns_done', 'letter_answer_done']) assert.ok(set.has(f), f);
  const gives = Object.values(logs).flat(2).filter((e) => e.op === 'give').map((e) => e.args[0]);
  for (const it of ['courier_knot', 'merewarden_mantle', 'phoenix_feather', 'courier_satchel', 'elian_reply'])
    assert.equal(gives.filter((g) => g === it).length, 1, `${it} exactly once`);
  for (const [k, r] of Object.entries(REWARDS_EP2)) assert.ok(itemExists(r.item) && Number.isInteger(r.qty), `reward ${k}`);
});

// ------------------------------------------------------------------------------------------------
// NPCs, quests and text.
// ------------------------------------------------------------------------------------------------
const flagsOf = (e) => [e?.if, e?.ifNot].flat().filter(Boolean);

test('Episode 2 NPCs: placed on Episode 2 maps, change at the restoration, no reflection until it', () => {
  const ep2 = Object.entries(NPCS).filter(([, n]) => EP2_MAP_IDS.includes(n.map));
  assert.ok(ep2.length >= 13);
  for (const id of ['elian', 'anwen', 'tovin', 'lena', 'vessa', 'nico', 'sava', 'corin', 'orla', 'wren', 'fitch', 'penny_e', 'aurel'])
    assert.ok(NPCS[id], `missing NPC ${id}`);
  for (const [id, n] of ep2) {
    assert.ok(n.talk.filter((e) => e.lines).length >= 2 || flagsOf(n.show).includes('nh_restored'), `${id}: two dialogue states`);
    if (!flagsOf(n.show).includes('nh_restored'))
      assert.ok(n.talk.some((e) => e.lines && [e.if].flat().some((f) => ['nh_restored', 'ep2_complete'].includes(f))), `${id}: no restored lines`);
    if (n.map !== 'east_road' && id !== 'aurel') assert.equal(n.noReflection, true, `${id}: noReflection`);
    for (const e of n.talk) if (e.scene) assert.ok(scenes[e.scene] || EP1_SCENES[e.scene] || EP3_SCENES[e.scene], `${id}: scene ${e.scene}`);
  }
});

test('the returning Willowmere cast has Episode 2 lines, and the right talk entries run the Episode 2 scenes', () => {
  const ep2Only = Object.keys(EP2_FLAGS);
  for (const id of ['hazel', 'mael', 'iris', 'tess', 'garrick', 'hal', 'holt', 'pip', 'oren', 'nella', 'edda']) {
    const t = NPCS[id].talk;
    assert.ok(t.some((e) => e.lines && [e.if].flat().includes('ep2_complete')), `${id}: no post-ep2_complete line`);
    assert.ok(t.some((e) => [e.if].flat().some((f) => ep2Only.includes(f) && f !== 'ep2_complete') || (e.scene && scenes[e.scene])),
      `${id}: no Episode 2 morning line`);
  }
  const has = (list) => (f) => list.includes(f);
  assert.deepEqual(talkTo('mael', has(EP1_DONE)), { scene: 'ep2_mael' });
  assert.deepEqual(talkTo('tess', has(EP1_DONE)), { scene: 'tess_last_route' });
  assert.deepEqual(talkTo('iris', has(EP1_DONE)), { scene: 'iris_farewell' });
  assert.deepEqual(talkTo('tovin', has([...EP1_DONE, 'met_anwen'])), { scene: 'tovin_ferry' });
  assert.equal(isPresent('garrick', has([...EP1_DONE, 'ep2_started', 'garrick_at_ford'])), false);
  assert.equal(isPresent('garrick', has([...EP1_DONE, 'ep2_started', 'crossing_done'])), true);
  assert.equal(isPresent('hal', has([...EP1_DONE, 'garrick_at_ford'])), false);
  assert.equal(isPresent('elian', has([...EP1_DONE, 'nh_arrived'])), false);
  assert.equal(isPresent('elian', has([...EP1_DONE, 'nh_arrived', 'met_elian'])), true);
  // An Episode 1 letter still undelivered in Episode 2 can still be delivered.
  assert.deepEqual(talkTo('tess', has([...EP1_DONE, 'last_route_started', 'tess_quest_started', 'tess_letter_2_found'])), { scene: 'tess_letters' });
});

test('Episode 2 main quest: steps in order, Talk names the next step on every map in Mira and Bram voices', () => {
  assert.equal(mainQuestFor(() => false), MAIN_QUEST);
  assert.equal(mainQuestFor((f) => f === 'ep1_complete'), MAIN_QUEST_EP2);
  const ids = MAIN_QUEST_EP2.steps.map((s) => s.id);
  assert.deepEqual(ids, ['road_east', 'fading_road', 'nameless_hollow', 'court_f1', 'court_f2', 'court_f3', 'king', 'hollowmere', 'epilogue2']);
  assert.equal(MAIN_QUEST_EP2.steps.at(-1).done, null);
  const done = new Set(EP1_DONE);
  const SUB = { crossing_done: ['ep2_started'], nh_arrived: ['east_road_arrived', 'saw_cairns', 'saw_court'],
    court_ferry_open: ['met_elian', 'heard_crisis', 'met_anwen'], court_f1_done: ['court_entered', 'silverglass_lock_lit'],
    court_f2_done: ['other_selves_defeated'], nameless_king_defeated: [], nh_restored: ['aurel_named'] };
  for (const step of MAIN_QUEST_EP2.steps) {
    const has = (f) => done.has(f);
    assert.equal(currentStep(has, MAIN_QUEST_EP2).id, step.id);
    assert.ok(fits(step.journal), `${step.id} journal: ${boxLines(step.journal).join(' / ')}`);
    assert.equal(journal(has).main.title, 'The Town Without a Name');
    for (const map of ALL_MAPS) {
      const chat = partyChat(has, map);
      assert.equal(chat.step.id, step.id);
      assert.ok(chat.lines.length >= 1, `${step.id} on ${map}: no hint`);
      for (const l of chat.lines) {
        assert.ok(['mira', 'bram'].includes(l.who), `${step.id}: ${l.who}`);
        assert.ok(fits(l.text), `${step.id}: ${boxLines(l.text).join(' / ')}`);
      }
    }
    for (const e of step.chat) {
      for (const f of flagsOf(e)) assert.ok(f in FLAGS, `${step.id}: ${f}`);
      for (const m of [e.map].flat().filter(Boolean)) assert.ok(ALL_MAPS.includes(m), `${step.id}: map ${m}`);
    }
    for (const f of SUB[step.done] || []) done.add(f);
    if (step.done) done.add(step.done);
  }
  // Sub-steps really change the hint where the player is standing.
  const hall = (extra) => partyChat((f) => [...EP1_DONE, ...MAIN_FLAGS.slice(0, 5), ...extra].includes(f), 'nameless_hollow').lines[0].text;
  assert.notEqual(hall(['met_elian']), hall(['met_elian', 'heard_crisis']));
  const f3 = (extra) => partyChat((f) => [...EP1_DONE, ...MAIN_FLAGS.slice(0, 14), ...extra].includes(f), 'court_f3').lines.map((l) => l.text).join(' ');
  assert.match(f3(['vow_belonging', 'vow_mercy']), /south/i);
  assert.match(f3(['vow_belonging', 'vow_courage']), /east/i);
  assert.match(f3(['vow_mercy', 'vow_courage']), /west/i);
  assert.match(f3([]), /shove/i);
});

test('Episode 2 side quests: givers, rewards, fallback hints, journal counters', () => {
  for (const q of SIDE_QUESTS_EP2) {
    assert.ok(NPCS[q.giver], `${q.id}: giver ${q.giver}`);
    assert.ok(itemExists(q.reward), `${q.id}: reward ${q.reward}`);
    for (const f of [q.start, q.done]) assert.ok(f in FLAGS, `${q.id}: ${f}`);
    for (const st of q.steps) {
      for (const f of [st.done].flat()) assert.ok(f in FLAGS, `${q.id}.${st.id}: ${f}`);
      assert.ok(fits(st.journal), `${q.id}.${st.id} journal: ${boxLines(st.journal).join(' / ')}`);
      const last = st.chat[st.chat.length - 1];
      assert.ok(!last.if && !last.ifNot && !last.map, `${q.id}.${st.id}: chat needs a fallback`);
      for (const e of st.chat) for (const l of e.lines) assert.ok(fits(l.text) && ['mira', 'bram'].includes(l.who), `${q.id}: ${l.text}`);
      assert.ok(pickChat(st.chat, () => false, 'willowmere'));
    }
  }
  const f = new Set([...EP1_DONE, 'fountain_started', 'testimony_tovin', 'last_route_started']);
  const j = journal((x) => f.has(x));
  assert.deepEqual(j.side.find((s) => s.id === 'fountain').counter, { label: 'Witnesses heard', value: 1, max: 3 });
  assert.ok(j.side.some((s) => s.id === 'last_route') && j.side.some((s) => s.id === 'letters') === false);
  // Talk adds the side reminder after the main hint.
  assert.equal(partyChat((x) => f.has(x), 'nameless_hollow').side.length, 1);
});

test('text: bestiary, banners, books, barks and CREDITS_EP2', () => {
  for (const id of EP2_ENEMY_IDS) assert.ok(BESTIARY[id] && BESTIARY[id].lore.every((b) => fits(b)), `bestiary ${id}`);
  for (const id of EP2_MAP_IDS) assert.ok(BANNERS[id] && BANNERS[id].title, `banner ${id}`);
  assert.equal(BANNERS.nameless_hollow.states[0].title, 'Hollowmere');
  for (const id of ['nh_ledger', 'court_ledger', 'nh_register_page']) assert.ok(BOOKS[id] && BOOKS[id].pages.every((p) => fits(p)), id);
  for (const id of ['first_mirror', 'first_glass_bridge', 'first_receptor', 'fog_loop']) assert.ok(BARKS[id], id);
  assert.ok(CREDITS_EP2.length >= 8 && CREDITS_EP2.some((c) => c.lines.includes('Scott Ball')));
  for (const c of CREDITS_EP2) {
    assert.ok(typeof c.heading === 'string' && c.heading.length <= 30 && c.lines.length >= 1 && c.lines.length <= 6);
    for (const l of c.lines) assert.ok(l.length <= 42 && /^[\x20-\x7e]*$/.test(l), `credit ${l}`);
  }
  // Banter on the new maps fits and only the party speaks.
  for (const map of EP2_MAP_IDS) for (const e of BANTER[map] || []) for (const l of e.lines) assert.ok(fits(l.text) && ['mira', 'bram'].includes(l.who), `${map}: ${l.text}`);
});

test('with the real font, every Episode 2 line fits the dialogue text area in pixels', async (t) => {
  const { existsSync } = await import('node:fs');
  const { wrap, stripCodes, fill, BOX_COLS, HERO_NAME_MAX } = await import('../../src/data/story/dialogue.js');
  const fontPath = join(NEXT, 'assets', 'ui', 'font.json');
  if (!existsSync(fontPath)) { t.skip('assets/ui/font.json not built yet'); return; }
  const font = JSON.parse(readFileSync(fontPath, 'utf8'));
  const adv = (c) => (c === ' ' ? font.spaceAdvance : font.glyphs[c] ? font.glyphs[c][6] : 6);
  const width = (s) => [...s].reduce((a, c, i) => a + adv(c) + ((font.kerning || {})[(s[i - 1] || '') + c] || 0), 0);
  const TEXT_AREA = 384 - 16 - 16 - 56; // same as rules.test.mjs: portrait-width text area
  const texts = [];
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) if (e.op === 'say') texts.push([id, e.args[1]]);
  const walkLines = (where, v) => {
    if (typeof v === 'string') texts.push([where, v]);
    else if (Array.isArray(v)) v.forEach((x) => walkLines(where, x));
    else if (v && typeof v === 'object') { if ('text' in v) texts.push([where, v.text]); if ('lines' in v) walkLines(where, v.lines); }
  };
  for (const [id, v] of Object.entries(lines)) walkLines(`lines.${id}`, v);
  for (const st of MAIN_QUEST_EP2.steps) { texts.push([st.id, st.journal]); for (const e of st.chat) walkLines(st.id, e.lines); }
  for (const q of SIDE_QUESTS_EP2) for (const st of q.steps) { texts.push([q.id, st.journal]); for (const e of st.chat) walkLines(q.id, e.lines); }
  const hero = 'W'.repeat(HERO_NAME_MAX);
  const bad = [];
  for (const [where, s] of texts) for (const line of wrap(stripCodes(fill(s, { hero })), BOX_COLS))
    if (width(line) > TEXT_AREA) bad.push(`${where}: ${line} (${width(line)} px)`);
  assert.deepEqual(bad, []);
});
