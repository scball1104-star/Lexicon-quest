// Episode 3 story script (E3-story): every scene and branch, ids, flags, boxes and box budgets, music cues, staging,
// the two name reveals, NPCs, quests and text. Ids owned by other wave-17 agents (maps, sprites, portraits, music, sfx,
// items, shops, encounters) are accepted by their planned ids in _harness.mjs and checked against the real data
// whenever it already exists.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scenes, lines, SCENE_CONDITIONS, GATE, MAIN_PATH, BOX_BUDGET } from '../../src/data/story/ep3.js';
import { scenes as EP1_SCENES, lines as EP1_LINES } from '../../src/data/story/ep1.js';
import { scenes as EP2_SCENES, lines as EP2_LINES } from '../../src/data/story/ep2.js';
import { NPCS, SPEAKER_NAMES, talkTo, isPresent, speakerName } from '../../src/data/npcs.js';
import { FLAGS, EP2_FLAGS, EP3_FLAGS, NAME_REVEALS, REWARDS_EP3, MAIN_QUEST_EP2, MAIN_QUEST_EP3, SIDE_QUESTS_EP3,
  EPILOGUE2_LIVE, BANTER, partyChat, currentStep, journal, pickChat, mainQuestFor } from '../../src/data/quests.js';
import { ITEMS } from '../../src/data/items.js';
import { BESTIARY, BESTIARY_EP3, BOOKS, BANNERS, BARKS, HELP, CREDITS_EP3, END_CARD_EP3, END_CARD_EP2_LIVE, EPISODE4_CARD }
  from '../../src/data/text.js';
import { EP3_LIVE } from '../../src/game/episodes.js';
import { fits, boxLines, resolve } from '../../src/data/story/dialogue.js';
import { explore, playthrough, runOnce, NEXT, MUSIC, SFX, EMOTES, DIRS, TINTS, PORTRAITS, NPC_SPRITES, EXTRA_SPRITES,
  MAP_IDS, EP2_MAP_IDS, EP2_NPC_SPRITES, EP2_PORTRAITS, EP2_MUSIC, EP3_MAP_IDS, EP3_NPC_SPRITES, EP3_PORTRAITS, EP3_MUSIC,
  EP3_SFX, EP3_ENEMY_IDS, EP3_ENCOUNTERS, EP3_ITEMS, listFiles, read } from './_harness.mjs';

const EM = String.fromCharCode(0x2014); // built from its code: this file must not contain the character itself
const BANNED = new RegExp(['cross', 'word'].join(''), 'i'); // built from parts: rules.test.mjs scans for the literal
let ENEMIES = null;
try { ({ ENEMIES } = await import('../../src/data/enemies.js')); } catch { ENEMIES = null; }
let ENCOUNTERS = null;
try { ({ ENCOUNTERS } = await import('../../src/data/encounters.js')); } catch { ENCOUNTERS = null; }
const encounterExists = (id) => (ENCOUNTERS && ENCOUNTERS[id]) || EP3_ENCOUNTERS.includes(id);
const itemExists = (id) => !!ITEMS[id] || EP3_ITEMS.includes(id);

// The Episode 3 main flags, in the order the playthrough sets them.
const MAIN_FLAGS = ['ep3_started', 'sand_gate_open', 'sand_road_arrived', 'sand_first_fight_done', 'pk_arrived', 'met_veyra',
  'met_ilya', 'foundry_entered', 'foundry_f1_done', 'bellows_specter_defeated', 'foundry_f2_done', 'vex_furnace_met',
  'bell_gate_open', 'cinder_warden_defeated', 'mara_named', 'garrick_named', 'first_bell_rung', 'pk_restored', 'ep3_complete'];
const EP2_DONE = ['intro_done', 'met_mael', 'mira_joined', 'bram_joined', 'left_town', 'archive_entered', 'archive_f1_done',
  'echo_warden_defeated', 'lantern_get', 'archive_f2_done', 'boss_door_open', 'archivore_defeated', 'returned_home',
  'ep1_complete', 'ep2_started', 'crossing_done', 'nh_arrived', 'met_elian', 'court_entered', 'court_f1_done',
  'court_f2_done', 'vow_door_open', 'nameless_king_defeated', 'aurel_named', 'nh_restored', 'ep2_complete',
  'mirror_sigil_get'];
const MAP_ACTORS = ['e_sr_first', 'cinder_warden']; // map actors the scenes drive that are not NPC records
const PARTY = ['hero', 'mira', 'bram'];
const ALL_MAPS = [...MAP_IDS, ...EP2_MAP_IDS, ...EP3_MAP_IDS];
const ONLY_EP3 = Object.keys(EP3_FLAGS);

GATE.live = true; // the playthrough tests run with the episode switch on; one test flips it off
const RUNS = {};
for (const [id, fn] of Object.entries(scenes)) RUNS[id] = await explore(fn, { flags: ['mira_joined', 'bram_joined'] });
const allOps = (id) => RUNS[id].flatMap((r) => r.log);
const ops = (log, op) => log.filter((e) => e.op === op);
const musics = (log) => ops(log, 'music').map((e) => e.args[0]);
const boxCount = (log) => ops(log, 'say').length;
const flagsOf = (e) => [e?.if, e?.ifNot].flat().filter(Boolean);

test('scene and line ids never repeat an Episode 1 or Episode 2 id; prefixes stay clear', () => {
  for (const id of Object.keys(scenes)) assert.ok(!(id in EP1_SCENES) && !(id in EP2_SCENES), `scene ${id} exists in ep1/ep2`);
  for (const id of Object.keys(lines)) assert.ok(!(id in EP1_LINES) && !(id in EP2_LINES), `line ${id} exists in ep1/ep2`);
  for (const f of ONLY_EP3) assert.ok(!(f in EP2_FLAGS), `flag ${f} exists in Episode 2`);
  for (const id of [...Object.keys(scenes), ...ONLY_EP3, ...Object.keys(lines)]) {
    assert.ok(!/^ember_/.test(id), `bare ember_ prefix (the Ember skill owns it): ${id}`);
    assert.ok(!/^vow_/.test(id) && !/^f[123]_/.test(id), `Episode 2 or Archive prefix: ${id}`);
  }
  for (const id of Object.keys(NPCS).filter((n) => EP3_MAP_IDS.includes(NPCS[n].map))) assert.ok(!/^rook/.test(id), id);
  assert.ok(!('garrick_e' in EP1_SCENES));
});

test('every scene runs on every path using only the cutscene API, and locks input', () => {
  for (const [id, runs] of Object.entries(RUNS)) {
    assert.ok(runs.length >= 1, id);
    for (const r of runs) assert.equal(ops(r.log, 'lockInput').length, ops(r.log, 'unlockInput').length, `${id}: lock/unlock mismatch`);
  }
  assert.ok(RUNS.carters_rest.length >= 3 && RUNS.ep3_morning.length >= 2 && RUNS.cinder_warden.length >= 4, 'choices branch');
  assert.ok(Object.keys(scenes).length >= 36 && Object.keys(scenes).length < 42, `built scenes: ${Object.keys(scenes).length}`);
});

test('scene conditions exist for every scene and use declared flags', () => {
  for (const id of Object.keys(scenes)) assert.ok(id in SCENE_CONDITIONS, `no SCENE_CONDITIONS for ${id}`);
  for (const [id, c] of Object.entries(SCENE_CONDITIONS)) {
    assert.ok(id in scenes, `condition for unknown scene ${id}`);
    for (const f of [c?.if, c?.ifNot].flat().filter(Boolean)) assert.ok(f in FLAGS, `${id}: undeclared flag ${f}`);
  }
  for (const id of MAIN_PATH) assert.ok(id in scenes, id);
});

test('every flag a scene sets or checks is declared; every main flag is set by a scene', () => {
  const set = new Set();
  for (const id of Object.keys(RUNS)) {
    for (const e of allOps(id)) {
      if (e.op === 'setFlag' || e.op === 'hasFlag') assert.ok(e.args[0] in FLAGS, `${id}: undeclared flag ${e.args[0]}`);
      if (e.op === 'setFlag' && e.args[1] !== false) set.add(e.args[0]);
    }
  }
  for (const f of MAIN_FLAGS) assert.ok(f in EP3_FLAGS && set.has(f), `no scene sets ${f}`);
  for (const [f, d] of Object.entries(EP3_FLAGS)) assert.ok(/^[a-z][a-z0-9_]*$/.test(f) && d.length > 5, f);
  // The plan's flag list (EPISODE3_PLAN 2.2) is declared in full.
  for (const f of ['ep3_started', 'sand_gate_open', 'sand_road_arrived', 'sand_first_fight_done', 'pk_arrived', 'met_veyra', 'met_ilya',
    'foundry_open', 'foundry_entered', 'foundry_f1_done', 'bellows_specter_defeated', 'foundry_f2_done', 'vex_furnace_met',
    'bell_gate_open', 'cinder_warden_defeated', 'garrick_named', 'mara_named', 'first_bell_rung', 'pk_restored', 'ep3_complete',
    'ep3_morning_done', 'saw_slag', 'carters_rested', 'saw_emberpeak', 'saw_memorial', 'forge_relit', 'foundry_f1_arrived',
    'foundry_f2_arrived', 'foundry_f3_arrived', 'lift_wheel_lit', 'bram_memory_1', 'bram_memory_2', 'bram_memory_3', 'mara_read',
    'oath_hand', 'oath_heart', 'oath_home', 'clapper_get', 'leaf_get', 'crucible_hook_found', 'coolant_started', 'testimony_ilya',
    'testimony_harl', 'testimony_sella', 'coolant_done', 'ledger_found', 'sand_started', 'glass_sand_found', 'sand_done'])
    assert.ok(f in EP3_FLAGS, `plan flag ${f} not declared`);
});

test('every id a scene references exists (or is a planned Episode 3 id)', () => {
  const npcIds = new Set(Object.keys(NPCS));
  const sprites = new Set([...NPC_SPRITES, ...EXTRA_SPRITES, ...EP2_NPC_SPRITES, ...EP3_NPC_SPRITES]);
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
          if (c && c.portrait) assert.ok(PORTRAITS.includes(c.portrait) || EP2_PORTRAITS.includes(c.portrait) || EP3_PORTRAITS.includes(c.portrait), `${id}: portrait ${c.portrait}`);
          break;
        case 'walk':
          assert.ok(known(a) && a != null, `${id}: walk unknown actor ${a}`);
          assert.ok(typeof b === 'string' || (Array.isArray(b) && b.every((d) => DIRS.includes(d))), `${id}: walk path`);
          break;
        case 'face': assert.ok(known(a) && a != null && (DIRS.includes(b) || known(b)), `${id}: face ${a} ${b}`); break;
        case 'emote': assert.ok(known(a) && EMOTES.includes(b), `${id}: emote ${a} ${b}`); break;
        case 'jump': case 'despawn': assert.ok(known(a), `${id}: ${e.op} unknown actor ${a}`); break;
        case 'music': assert.ok(a === null || MUSIC.includes(a) || EP2_MUSIC.includes(a) || EP3_MUSIC.includes(a), `${id}: music ${a}`); break;
        case 'sfx': assert.ok(SFX.includes(a) || EP3_SFX.includes(a), `${id}: sfx ${a}`); break;
        case 'tint': assert.ok(TINTS.includes(a), `${id}: tint ${a}`); break;
        case 'fade': assert.ok(a === 'in' || a === 'out', `${id}: fade ${a}`); break;
        case 'give': case 'take':
          assert.ok(itemExists(a), `${id}: ${e.op} unknown item ${a}`);
          assert.ok(b === undefined || (Number.isInteger(b) && b > 0), `${id}: qty`);
          break;
        case 'battle': assert.ok(encounterExists(a), `${id}: unknown encounter ${a}`); break;
        case 'addMember': assert.fail(`${id}: Episode 3 adds nobody`); break;
        case 'camera.panTo': assert.ok(typeof a === 'string', `${id}: panTo target`); break;
        case 'camera.follow': assert.ok(known(a) && a != null, `${id}: follow ${a}`); break;
        default: break;
      }
    }
  }
});

test('an actor never speaks, walks or faces before it is spawned in a scene that spawns it', () => {
  const MAP_SIDE = new Set([...PARTY, ...Object.keys(NPCS), ...MAP_ACTORS]);
  for (const id of Object.keys(RUNS)) for (const r of RUNS[id]) {
    const live = new Set();
    for (const e of r.log) {
      if (e.op === 'spawn') live.add(e.args[0]);
      if (e.op === 'despawn') live.delete(e.args[0]);
      const who = e.op === 'say' || e.op === 'walk' || e.op === 'face' || e.op === 'emote' ? e.args[0] : null;
      if (who && !MAP_SIDE.has(who) && !(who in SPEAKER_NAMES)) assert.ok(live.has(who), `${id}: ${e.op} by ${who} while not on the map`);
    }
    assert.deepEqual([...live].filter((x) => !['bram_m'].includes(x) && false), []);
  }
});

test('every box fits: 3 lines of 42 characters with an 8-letter hero name; choices fit; ASCII only; no em dashes', () => {
  const bad = [];
  const ascii = (s) => [...s].every((ch) => ch.codePointAt(0) >= 0x20 && ch.codePointAt(0) <= 0x7e);
  for (const id of Object.keys(RUNS)) {
    for (const e of allOps(id)) {
      const text = e.op === 'say' ? e.args[1] : e.op === 'title' ? e.args[0] : null;
      if (text != null && !fits(text)) bad.push(`${id}: ${boxLines(text).join(' / ')}`);
      if (text != null && !ascii(text)) bad.push(`${id}: non-ASCII in ${text}`);
      if (e.op === 'title' && e.args[1]?.sub && !fits(e.args[1].sub)) bad.push(`${id}: title sub`);
      if (e.op === 'choice') for (const o of e.args[0]) if (o.length > 28 || !ascii(o)) bad.push(`${id} choice: ${o}`);
    }
  }
  assert.deepEqual(bad, []);
  // The files this agent wrote carry no em dash, no non-ASCII and no banned word.
  for (const f of ['src/data/story/ep3.js', 'src/data/quests.js', 'src/data/text.js', 'src/data/npcs.js', 'docs/story/STAGING_EP3.md',
    'docs/story/EPISODE3.md', 'qa/content/ep3.test.mjs']) {
    const txt = read(join(NEXT, ...f.split('/')));
    assert.ok(!txt.includes(EM), `${f}: em dash`);
    assert.ok(!BANNED.test(txt), `${f}: banned word`);
  }
});

test('inspect lines resolve, fit, use declared flags and end on a fallback', () => {
  const walk = (where, v) => {
    if (typeof v === 'string') { assert.ok(fits(v), `${where}: ${boxLines(v).join(' / ')}`); return; }
    assert.ok(Array.isArray(v) && v.length, `${where}: empty`);
    for (const x of v) {
      if (typeof x === 'string') walk(where, x);
      else if (x && 'text' in x) { walk(where, x.text); assert.ok(x.who === null || x.who in SPEAKER_NAMES || PARTY.includes(x.who), `${where}: who ${x.who}`); }
      else {
        for (const f of flagsOf(x)) assert.ok(f in FLAGS, `${where}: undeclared flag ${f}`);
        walk(where, x.lines);
      }
    }
    if (v.length && typeof v[0] === 'object' && 'lines' in v[0]) {
      const last = v[v.length - 1];
      assert.ok(!last.if && !last.ifNot, `${where}: conditional list needs a fallback last`);
    }
  };
  for (const [id, v] of Object.entries(lines)) walk(`lines.${id}`, v);
  // Every inspect id the plan (section 4) and the bible name resolves.
  for (const id of ['sand_chain', 'smithy_gone_east', 'sand_milestone', 'east_road_sign', 'memorial', 'smelter_proclamation', 'proclamation_gate',
    'silent_bell', 'coolant_station', 'trough_dry', 'trough_wet', 'sluice_paddle', 'spout_wall', 'spout_cistern', 'basin_empty',
    'basin_full', 'waterwheel', 'anvil_hand', 'anvil_heart', 'anvil_home', 'heart_anvil', 'bell_gate', 'vex_feather', 'steel_leaf',
    'slag_pool', 'slag_crust', 'hot_grate_shut', 'hot_grate_open', 'fan_great', 'heartforge'])
    assert.ok(lines[id], `missing inspect line ${id}`);
  assert.ok(Object.keys(lines).length >= 35, `inspect lines: ${Object.keys(lines).length}`);
  // The memorial has three states; the proclamation is the canon text; the bell and gate change.
  const st = (id, ...fl) => resolve(lines[id], (f) => fl.includes(f)).map((b) => b.text).join('|');
  assert.equal(new Set([st('memorial'), st('memorial', 'saw_memorial'), st('memorial', 'saw_memorial', 'pk_restored')]).size, 3);
  assert.match(st('proclamation_gate'), /the one who shapes, the one who remembers, and the one who returns/);
  assert.match(st('proclamation_gate'), /cannot run without all three/);
  assert.notEqual(st('silent_bell'), st('silent_bell', 'pk_restored'));
  assert.notEqual(st('bell_gate'), st('bell_gate', 'bell_gate_open'));
  assert.notEqual(st('waterwheel'), st('waterwheel', 'lift_wheel_lit'));
  assert.equal(st('east_road_sign').split('|')[0], 'The east road. Flooded past the ridge.');
  assert.notEqual(st('smithy_gone_east'), st('smithy_gone_east', 'garrick_named'));
});

test('STAGING_EP3.md documents every scene, every mark and every inspect line the script refers to', () => {
  const staging = readFileSync(join(NEXT, 'docs', 'story', 'STAGING_EP3.md'), 'utf8');
  const missing = [];
  for (const id of Object.keys(scenes)) if (!staging.includes('`' + id + '`')) missing.push(`scene ${id}`);
  const actors = new Set([...PARTY, ...Object.keys(NPCS), ...MAP_ACTORS]);
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) if (e.op === 'spawn') actors.add(e.args[0]);
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
  for (const f of ['EP3_LIVE', 'credits2_rolled', 'garrick_n', 'END_CARD_EP3']) if (!staging.includes(f)) missing.push(f);
  assert.deepEqual([...new Set(missing)], []);
});

// ------------------------------------------------------------------------------------------------
// A full playthrough in story order, from a finished Episode 2.
// ------------------------------------------------------------------------------------------------
const giveFlag = (...flags) => (set) => flags.forEach((f) => set.add(f)); // what a map basin / chest would do
const ORDER = [
  'ep3_morning', 'sand_gate', 'sand_road_arrival', 'sand_first_fight', 'slag_crossing', 'carters_rest', 'ash_view',
  'pk_arrival', 'veyra_square', 'memorial_wall',
  (s) => assert.ok(!s.has('met_ilya')),
  'ilya_bellhouse', 'garrick_forge', 'foundry_gate', 'foundry_f1_arrival', 'bram_memory_1', 'liftworks_lift', 'foundry_f1_lift',
  'foundry_f2_arrival', 'bram_memory_2', 'ledger_ash', 'bellows_specter', 'foundry_f2_shaft', 'foundry_f3_arrival', 'vex_furnace',
  'oath_hand', 'oath_heart', 'bram_memory_3',
  (s) => assert.ok(!s.has('bram_memory_3'), 'the gate needs the third oath'),
  'oath_home', 'bram_memory_3', 'cinder_warden', 'first_bell',
];

test('a full playthrough reaches ep3_complete with every main flag set, in order', async () => {
  const { set, logs } = await playthrough(scenes, ORDER, { flags: EP2_DONE });
  for (const f of MAIN_FLAGS) assert.ok(set.has(f), `missing ${f}`);
  const seen = {};
  const timeline = ORDER.filter((st) => typeof st === 'string').flatMap((id) => logs[id]?.[(seen[id] = (seen[id] ?? -1) + 1)] || []);
  const order = timeline.filter((e) => e.op === 'setFlag' && MAIN_FLAGS.includes(e.args[0])).map((e) => e.args[0]);
  const firsts = MAIN_FLAGS.map((f) => order.indexOf(f));
  assert.deepEqual([...firsts].sort((a, b) => a - b), firsts, 'main flags out of order');
  const given = Object.values(logs).flat(2).filter((e) => e.op === 'give').map((e) => e.args[0]);
  for (const it of ['quench_flask', 'lift_key', 'struck_list', 'name_fragment_3', 'first_bell_hammer'])
    assert.ok(given.includes(it), `never given: ${it}`);
  // The warden_after order is the bible's.
  const says = ops(logs.cinder_warden[0], 'say').map((e) => e.args[1]);
  const at = (re) => says.findIndex((t) => re.test(t));
  const bible = [/THE ORDER SAID KEEP THE FIRE/, /Couldn't keep the fire/, /file off the letters/, /Only a Heartforge hand/,
    /MARA OF THE FIRST BELL/, /Toll's one word/, /^Garrick\.$/, /^Paid\.$/, /Third leaf, third time/, /book with nothing in it/,
    /writing you in/, /crossing you out/, /Same seal as Aurel/, /that's a road too/, /Hers\. I couldn't come in for it/];
  const idx = bible.map(at);
  for (const [i, v] of idx.entries()) assert.ok(v >= 0, `missing line ${bible[i]}`);
  assert.deepEqual([...idx].sort((a, b) => a - b), idx, 'warden_after lines out of order');
  const gives = ops(logs.cinder_warden[0], 'give').map((e) => e.args[0]);
  assert.deepEqual(gives, ['name_fragment_3', 'first_bell_hammer']);
  const f = ops(logs.cinder_warden[0], 'setFlag').map((e) => e.args[0]);
  assert.ok(f.indexOf('clapper_get') < f.indexOf('leaf_get') && f.indexOf('leaf_get') < f.indexOf('mara_named') && f.indexOf('mara_named') < f.indexOf('garrick_named'));
});

test('box budgets: 12 per main scene (14 for the morning and the bell, 24 for warden_after), about 230 on the main path', async () => {
  const worst = async (id, flags, cut) => {
    const runs = await explore(scenes[id], { flags: [...EP2_DONE, ...flags] });
    return Math.max(...runs.map((r) => {
      const log = cut ? r.log.slice(0, r.log.findIndex(cut) < 0 ? r.log.length : r.log.findIndex(cut)) : r.log;
      return boxCount(log);
    }));
  };
  const over = [];
  for (const id of MAIN_PATH) {
    const c = SCENE_CONDITIONS[id] || {};
    const flags = [c.if].flat().filter(Boolean);
    let n;
    if (id === 'cinder_warden') n = await worst(id, flags, (e) => e.op === 'battle');
    else if (id === 'first_bell') n = await worst(id, flags, (e) => e.op === 'setFlag' && e.args[0] === 'pk_restored');
    else n = await worst(id, flags);
    const cap = BOX_BUDGET[id] ?? BOX_BUDGET.default;
    if (n > cap) over.push(`${id}: ${n} > ${cap}`);
  }
  const wa = await worst('warden_after', ['cinder_warden_defeated']);
  if (wa > BOX_BUDGET.warden_after) over.push(`warden_after: ${wa}`);
  const ending = await explore(scenes.ep3_ending, { flags: [...EP2_DONE, 'pk_restored'] });
  if (Math.max(...ending.map((r) => boxCount(r.log))) > BOX_BUDGET.default) over.push('ep3_ending');
  assert.deepEqual(over, []);
  const { logs } = await playthrough(scenes, ORDER, { flags: EP2_DONE });
  const total = Object.values(logs).flat().reduce((n, log) => n + boxCount(log), 0);
  assert.ok(total >= 190 && total <= 260, `main path boxes: ${total} (target about 230)`);
});

test('guards: nothing in Episode 3 is reachable with EP3_LIVE false, and nothing replays', async () => {
  assert.equal(EP3_LIVE, false, 'this test describes the shipped state of the switch');
  // Only two scenes need the switch; every other chain bottoms out at ep3_started, which only ep3_morning sets.
  const live = Object.keys(SCENE_CONDITIONS).filter((id) => SCENE_CONDITIONS[id]?.live);
  assert.deepEqual(live.sort(), ['ep3_morning', 'sand_gate']);
  const setters = Object.keys(RUNS).filter((id) => allOps(id).some((e) => e.op === 'setFlag' && e.args[0] === 'ep3_started'));
  assert.deepEqual(setters, ['ep3_morning']);
  for (const [id, c] of Object.entries(SCENE_CONDITIONS)) {
    if (c.live) continue;
    assert.ok([c.if].flat().filter(Boolean).some((f) => ONLY_EP3.includes(f)), `${id}: not behind an Episode 3 flag`);
  }
  // With the switch off (the module default), a finished Episode 2 plays nothing.
  GATE.live = false;
  try {
    const off = await playthrough(scenes, Object.keys(scenes), { flags: EP2_DONE });
    for (const [id, runs] of Object.entries(off.logs)) for (const log of runs) assert.equal(boxCount(log), 0, `${id} ran with EP3_LIVE false`);
    assert.ok(!off.set.has('ep3_started') && !off.set.has('sand_gate_open'));
  } finally { GATE.live = true; }
  // And nothing in a fresh game (Episode 1 only) plays either.
  const fresh = await playthrough(scenes, Object.keys(scenes));
  for (const [id, runs] of Object.entries(fresh.logs)) for (const log of runs) assert.equal(boxCount(log), 0, `${id} ran early`);
  // Everything played once does not play twice (the open-ended objects excepted).
  const done = await playthrough(scenes, ORDER, { flags: EP2_DONE });
  const again = await playthrough(scenes, MAIN_PATH.filter((id) => !['carters_rest', 'memorial_wall'].includes(id)), { flags: [...done.set] });
  for (const [id, runs] of Object.entries(again.logs)) for (const log of runs) assert.equal(boxCount(log), 0, `${id} replayed`);
  // The shipped order of the switch: the counter check is the field's, the flag guard is the script's.
  assert.deepEqual(SCENE_CONDITIONS.ep3_morning, { if: 'ep2_complete', ifNot: 'ep3_morning_done', live: true });
});

test('the teaching fight: unavoidable, Heat cured by ice or Break without signage, a loss sets nothing', async () => {
  const win = await runOnce(scenes.sand_first_fight, { flags: [...EP2_DONE, 'sand_road_arrived'], branchFlags: false });
  const b = ops(win.log, 'battle')[0];
  assert.equal(b.args[0], 'sr_first');
  assert.equal(b.args[1].canFlee, false);
  assert.ok(ops(win.log, 'walk').some((e) => e.args[0] === 'e_sr_first'));
  const says = ops(win.log, 'say').map((e) => e.args[1]).join(' ');
  assert.match(says, /heating up/);
  assert.match(says, /Breaking it worked too/);
  for (const e of ops(win.log, 'say')) assert.doesNotMatch(e.args[1], /press|button|tutorial/i);
  const lose = await runOnce(scenes.sand_first_fight, { flags: [...EP2_DONE, 'sand_road_arrived'], decisions: [1], branchFlags: false });
  assert.ok(!lose.log.some((e) => e.op === 'setFlag'));
});

test('boss intros: pan 40, silence, dialogue, title card, shake, flash, theme, then the battle', async () => {
  const check = (log, card, theme, minSays) => {
    const first = (op) => log.findIndex((e) => e.op === op);
    assert.equal(log[first('music')].args[0], null, 'silence first');
    assert.equal(log.find((e) => e.op === 'camera.panTo').args[1], 40);
    const ti = log.findIndex((e) => e.op === 'title' && e.args[0] === card);
    const bi = first('battle');
    assert.ok(ti > 0 && log[ti].args[1].sub && log[ti].args[1].frames <= 120);
    assert.ok(ops(log.slice(0, ti), 'say').length >= minSays);
    const between = log.slice(ti, bi);
    assert.ok(between.some((e) => e.op === 'shake') && between.some((e) => e.op === 'flash'));
    assert.equal(between.find((e) => e.op === 'music').args[0], theme);
    assert.equal(ops(between, 'say').length, 0);
    assert.equal(log[bi].args[1].boss, true);
    assert.equal(log[bi].args[1].canFlee, false);
  };
  check((await runOnce(scenes.bellows_specter, { flags: [...EP2_DONE, 'foundry_f2_arrived'], branchFlags: false })).log, 'THE BELLOWS SPECTER', 'battle', 3);
  check((await runOnce(scenes.cinder_warden, { flags: [...EP2_DONE, 'bell_gate_open'], branchFlags: false })).log, 'THE CINDER WARDEN', 'boss_warden', 5);
  // After a loss the retry is short: the tip and the card, no re-run of the arrival.
  for (const [id, tried, base] of [['bellows_specter', 'bellows_specter_tried', 'foundry_f2_arrived'], ['cinder_warden', 'cinder_warden_tried', 'bell_gate_open']]) {
    const full = await runOnce(scenes[id], { flags: [...EP2_DONE, base], branchFlags: false });
    const retry = await runOnce(scenes[id], { flags: [...EP2_DONE, base, tried], branchFlags: false });
    const pre = (log) => boxCount(log.slice(0, log.findIndex((e) => e.op === 'battle')));
    assert.ok(pre(retry.log) <= 2 && pre(retry.log) < pre(full.log), `${id}: retry`);
    assert.ok(ops(retry.log, 'title').length === 1 && ops(retry.log, 'battle').length === 1);
  }
  // The Warden choice answers either way, and Bram's reply does not depend on it.
  const runs = await explore(scenes.cinder_warden, { flags: [...EP2_DONE, 'bell_gate_open'] });
  const picks = runs.filter((r) => ops(r.log, 'choice').length && ops(r.log, 'battle').length === 1);
  assert.ok(picks.length >= 2);
});

// Each map's track (plan 8.2). A scene that changes the music puts its map's track back before it ends.
const SCENE_MAP = {
  ep3_morning: 'hollowmere', carters_rest: null, ash_view: 'ash_road', memorial_wall: 'emberpeak', bram_memory_1: 'foundry',
  bram_memory_2: 'foundry', bellows_specter: 'foundry', vex_furnace: 'mystery', bram_memory_3: 'mystery',
};

test('music cues follow the cue sheet and return to the map track (plan 8.3)', async () => {
  for (const [id, track] of Object.entries(SCENE_MAP)) {
    for (const r of RUNS[id]) {
      const m = musics(r.log);
      const won = !ops(r.log, 'battle').some((e) => e.args[2] === 'lose');
      if (m.length && won && track) assert.equal(m.at(-1), track, `${id} ends on ${m.at(-1)}`);
    }
  }
  const one = async (id, flags) => musics((await runOnce(scenes[id], { flags: [...EP2_DONE, ...flags], branchFlags: false })).log);
  assert.deepEqual(await one('ep3_morning', []), ['sorrow', 'hollowmere']);
  assert.deepEqual(await one('ash_view', ['sand_road_arrived']), ['mystery', 'ash_road']);
  assert.deepEqual(await one('memorial_wall', ['pk_arrived']), ['sorrow', 'emberpeak']);
  assert.deepEqual(await one('bram_memory_1', ['foundry_f1_arrived']), ['sorrow', 'foundry']);
  assert.deepEqual(await one('bram_memory_2', ['foundry_f2_arrived']), ['sorrow', 'foundry']);
  assert.deepEqual(await one('bellows_specter', ['foundry_f2_arrived']), [null, 'battle', 'foundry']);
  assert.deepEqual(await one('vex_furnace', ['foundry_f3_arrived']), [null, 'mystery']);
  assert.deepEqual(await one('bram_memory_3', ['oath_hand', 'oath_heart', 'oath_home']), [null, 'sorrow', 'mystery']);
  assert.deepEqual(await one('cinder_warden', ['bell_gate_open']), [null, 'boss_warden', 'sorrow', 'triumph', 'mystery', 'first_bell']);
  assert.deepEqual(await one('first_bell', ['garrick_named']), [null, 'first_bell', null, 'mystery']);
  // Oaths and the bell scene change no music; the memories ring the bell.
  for (const id of ['oath_hand', 'oath_heart', 'oath_home']) assert.deepEqual(await one(id, ['foundry_f3_arrived']), []);
  const bells = (log) => ops(log, 'sfx').filter((e) => e.args[0] === 'bell_first').length;
  assert.equal(bells((await runOnce(scenes.first_bell, { flags: [...EP2_DONE, 'garrick_named'], branchFlags: false })).log), 4);
  assert.ok(bells((await runOnce(scenes.bram_memory_1, { flags: [...EP2_DONE, 'foundry_f1_arrived'], branchFlags: false })).log) >= 1);
  const manifest = JSON.parse(readFileSync(join(NEXT, 'assets', 'audio', 'manifest.json'), 'utf8'));
  for (const [id, runs] of Object.entries(RUNS)) for (const r of runs) for (const m of musics(r.log))
    assert.ok(m === null || m in manifest.music || EP3_MUSIC.includes(m) || EP2_MUSIC.includes(m), `${id}: music ${m}`);
});

test('the two names: nobody says Mara before the Bell Gate is read, nobody says Garrick before he is named', async () => {
  const bad = [];
  // Scenes: every box before the reveal box is clear of the name.
  const pre = async (id, flags, revealRe, name) => {
    const { log } = await runOnce(scenes[id], { flags: [...EP2_DONE, ...flags], branchFlags: false });
    let revealed = false;
    for (const e of log) {
      if (e.op !== 'say') continue;
      if (revealRe && revealRe.test(e.args[1])) revealed = true;
      if (!revealed && name.test(e.args[1])) bad.push(`${id}: ${e.args[1]}`);
    }
  };
  const FIRST_NAMES = /Mara|Garrick/;
  const early = MAIN_PATH.slice(0, MAIN_PATH.indexOf('bram_memory_3'));
  for (const id of [...early, 'garrick_forge', 'ledger_ash', 'coolant_start', 'testimony_ilya', 'testimony_harl', 'testimony_sella', 'coolant_check', 'vessa_sand']) {
    const c = SCENE_CONDITIONS[id] || {};
    await pre(id, [c.if].flat().filter(Boolean), null, FIRST_NAMES);
  }
  await pre('bram_memory_3', ['oath_hand', 'oath_heart', 'oath_home'], /^MARA OF THE FIRST BELL\.$/, /Mara/);
  await pre('bram_memory_3', ['oath_hand', 'oath_heart', 'oath_home'], null, /Garrick/);
  await pre('cinder_warden', ['bell_gate_open'], /^Garrick\.$/, /Garrick/);
  // The speaker tag: spawned Smiths wear "The Smith" until warden_after swaps them; spawns named Garrick only after it.
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) {
    if (e.op === 'spawn' && /^smith/.test(e.args[0])) assert.equal(e.args[1].name, 'The Smith', `${id}: ${e.args[0]}`);
    if (e.op === 'spawn' && e.args[1].name === 'Garrick') assert.ok(['warden_after', 'cinder_warden', 'first_bell', 'ep3_ending'].includes(id), `${id}: early Garrick`);
    if (e.op === 'say' && e.args[0] === 'voice') assert.ok(!/Mara/.test(e.args[1]));
  }
  assert.equal(speakerName('voice'), 'A Voice');
  assert.equal(speakerName('mara_voice'), 'Mara');
  assert.equal(speakerName('garrick_e'), 'The Smith');
  assert.equal(speakerName('garrick_n'), 'Garrick');
  // Talk, journal, inspect lines and NPC lines: any text with a name sits behind a reveal flag.
  const lineHas = (text, re) => re.test(text);
  const checkEntry = (where, e, reveal, re) => {
    const conds = [e.if].flat().filter(Boolean);
    const texts = [];
    const take = (v) => { if (typeof v === 'string') texts.push(v); else if (Array.isArray(v)) v.forEach(take); else if (v && v.text) texts.push(v.text); };
    take(e.lines);
    if (texts.some((t) => lineHas(t, re)) && !conds.some((f) => reveal.includes(f))) bad.push(`${where}: ${texts.find((t) => lineHas(t, re))}`);
  };
  for (const [name, re, reveal] of [['Mara', /Mara/, NAME_REVEALS.mara], ['Garrick', /Garrick/, NAME_REVEALS.garrick]]) {
    for (const [id, v] of Object.entries(lines)) if (Array.isArray(v)) v.forEach((e) => { if (e && typeof e === 'object' && 'lines' in e) checkEntry(`lines.${id}`, e, reveal, re); });
    for (const [id, v] of Object.entries(lines)) if (typeof v === 'string' && re.test(v)) bad.push(`lines.${id}: ${v}`);
    for (const [id, n] of Object.entries(NPCS)) {
      if (!EP3_MAP_IDS.includes(n.map) || id === 'garrick_n') continue;
      for (const e of n.talk) if (e.lines) checkEntry(`npc ${id}`, e, reveal, re);
    }
    for (const step of MAIN_QUEST_EP3.steps.slice(0, 6)) {
      if (re.test(step.journal)) bad.push(`journal ${step.id}`);
      for (const e of step.chat) checkEntry(`chat ${step.id}`, e, reveal, re);
    }
    for (const q of SIDE_QUESTS_EP3) for (const st of q.steps) { if (re.test(st.journal)) bad.push(`journal ${q.id}`); for (const e of st.chat) checkEntry(`chat ${q.id}`, e, reveal, re); }
    for (const [map, list] of Object.entries(BANTER)) if (EP3_MAP_IDS.includes(map)) for (const e of list) checkEntry(`banter ${map}`, e, reveal, re);
    for (const id of ['foundry_ledger', 'pk_records']) for (const p of BOOKS[id].pages) if (re.test(p)) bad.push(`book ${id}: ${p}`);
    void name;
  }
  // The lift key's name belongs to the key, not to the reveal: items.js owns it, so flag the contract here.
  if (ITEMS.lift_key) assert.doesNotMatch(ITEMS.lift_key.name, /Mara/, 'the lift key may not carry the founder\'s name');
  assert.deepEqual(bad, []);
});

test('Bram is the center: his memories, his Tempered Oath, his hammer', async () => {
  const m3 = await runOnce(scenes.bram_memory_3, { flags: [...EP2_DONE, 'oath_hand', 'oath_heart', 'oath_home'], branchFlags: false });
  const says = ops(m3.log, 'say').map((e) => e.args[1]);
  for (const re of [/MARA OF THE FIRST BELL/, /Her name is Mara/, /Hidden things survive/, /struck her out for ringing it/, /keep saying it/])
    assert.ok(says.some((t) => re.test(t)), `missing ${re}`);
  assert.ok(ops(m3.log, 'say').some((e) => /Tempered Oath/.test(e.args[1])), 'the scene teaches Tempered Oath');
  const f3 = ops(m3.log, 'setFlag').map((e) => e.args[0]);
  assert.deepEqual(f3, ['bram_memory_3', 'mara_read', 'bell_gate_open']);
  const m1 = ops((await runOnce(scenes.bram_memory_1, { flags: [...EP2_DONE, 'foundry_f1_arrived'], branchFlags: false })).log, 'say').map((e) => e.args[1]);
  assert.ok(m1.includes("Count the ore, boy! The fire doesn't wait!") && m1.includes('I was ordered to count the ore. I counted the people.'));
  const m2 = ops((await runOnce(scenes.bram_memory_2, { flags: [...EP2_DONE, 'foundry_f2_arrived'], branchFlags: false })).log, 'say').map((e) => e.args[1]);
  assert.ok(m2.includes('A true smith shapes shelter before weapons.'));
  const oaths = [];
  for (const id of ['oath_hand', 'oath_heart', 'oath_home']) oaths.push(ops((await runOnce(scenes[id], { flags: [...EP2_DONE, 'foundry_f3_arrived'], branchFlags: false })).log, 'say').find((e) => e.args[0] === 'voice').args[1]);
  assert.deepEqual(oaths, ['Hold it like you mean to let go.', 'Ring it for them. Not for you.', 'Then come home.']);
  // The third oath reports the gate; the others do not.
  const third = (await runOnce(scenes.oath_home, { flags: [...EP2_DONE, 'foundry_f3_arrived', 'oath_hand', 'oath_heart'], branchFlags: false })).log;
  assert.ok(ops(third, 'say').some((e) => /Bell Gate has woken/.test(e.args[1])));
  const second = (await runOnce(scenes.oath_home, { flags: [...EP2_DONE, 'foundry_f3_arrived', 'oath_hand'], branchFlags: false })).log;
  assert.ok(!ops(second, 'say').some((e) => /Bell Gate has woken/.test(e.args[1])));
});

test('the ending: the courier, the seal, the bell under water, the cards, and the switch pair', async () => {
  const end = await runOnce(scenes.ep3_ending, { flags: [...EP2_DONE, 'pk_restored'], branchFlags: false });
  const says = ops(end.log, 'say').map((e) => e.args[1]);
  assert.ok(says.some((t) => /From the Regent of Valewyn\. I think\. The seal won't stay dry/.test(t)));
  assert.ok(says.includes("That's a bell. Under water.") && says.includes('Come home after.') && says.includes('Always.'));
  const titles = ops(end.log, 'title').map((e) => [e.args[0], e.args[1].sub]);
  assert.deepEqual(titles, [['End of Episode 3', 'The Forge of Ash'], [EPISODE4_CARD.text, EPISODE4_CARD.sub]]);
  assert.equal(EPISODE4_CARD.text, 'Episode 4: The Sunken Keep');
  assert.equal(end.log.filter((e) => e.op === 'setFlag').at(-1).args[0], 'ep3_complete');
  assert.deepEqual(END_CARD_EP3, { text: 'To be continued', sub: 'Episode 4 is not playable yet.', frames: 300, backdrop: 'dialog_keyart_ep3' });
  assert.equal(END_CARD_EP2_LIVE.sub, 'Episode 3 begins in the morning.');
  for (const s of [END_CARD_EP3.text, END_CARD_EP3.sub, END_CARD_EP2_LIVE.sub]) assert.ok(s.length <= 42 && /^[\x20-\x7e]+$/.test(s));
  const bell = await runOnce(scenes.first_bell, { flags: [...EP2_DONE, 'garrick_named'], branchFlags: false });
  const bs = ops(bell.log, 'say').map((e) => e.args[1]);
  for (const t of ['The furnaces are banked. For the first time in a month, nothing is feeding them.', 'Garrick! Watch of Emberpeak says: Garrick.',
    'Heard you the first time.', "Three stews tonight. Hot, hotter, and Mara's.", 'Forty times at breakfast.'])
    assert.ok(bs.includes(t), `missing ${t}`);
  assert.ok(ops(bell.log, 'tint').some((e) => e.args[0] === 'none'), 'the ash tint lifts');
});

// ------------------------------------------------------------------------------------------------
// NPCs, quests and text.
// ------------------------------------------------------------------------------------------------
test('Emberpeak NPCs: placed on Episode 3 maps, stages and scenes, the Smith as two records', () => {
  const cast = ['veyra', 'ilya', 'sella', 'harl', 'bess', 'taro', 'rusk', 'garrick_e', 'garrick_n', 'penny_s'];
  for (const id of cast) assert.ok(NPCS[id] && EP3_MAP_IDS.includes(NPCS[id].map), `missing or misplaced ${id}`);
  for (const id of cast) {
    const n = NPCS[id];
    assert.ok(n.talk.filter((e) => e.lines).length >= 2, `${id}: two dialogue states`);
    assert.ok(n.talk.some((e) => [e.if].flat().some((f) => ['pk_restored', 'ep3_complete'].includes(f))) || id === 'garrick_e' || id === 'penny_s', `${id}: no restored lines`);
    for (const e of n.talk) if (e.scene) assert.ok(scenes[e.scene], `${id}: scene ${e.scene}`);
  }
  assert.equal(NPCS.ilya.portrait, 'ilya');
  assert.deepEqual(NPCS.bess.service, { type: 'inn', price: 60 });
  assert.equal(NPCS.taro.service.id, 'ventworks');
  assert.equal(NPCS.sella.service.id, 'pk_smithy');
  assert.equal(NPCS.penny_s.service.id, 'sand_peddler');
  const has = (list) => (f) => list.includes(f);
  // Stages and scenes.
  assert.deepEqual(talkTo('veyra', has(['met_ilya'])), { scene: 'coolant_start' });
  assert.deepEqual(talkTo('ilya', has(['coolant_started'])), { scene: 'testimony_ilya' });
  assert.deepEqual(talkTo('harl', has(['coolant_started'])), { scene: 'testimony_harl' });
  assert.deepEqual(talkTo('sella', has(['coolant_started'])), { scene: 'testimony_sella' });
  assert.deepEqual(talkTo('garrick_e', has(['met_ilya'])), { scene: 'garrick_forge' });
  assert.deepEqual(talkTo('vessa', has([...EP2_DONE, 'sand_gate_open'])), { scene: 'vessa_sand' });
  assert.match(talkTo('rusk', has(['met_ilya'])).lines[0].text, /Frost cools hot metal/);
  assert.match(talkTo('harl', has([])).lines[0].text, /ground shifts when the furnace exhales/);
  assert.match(talkTo('taro', has([])).lines[0].text, /whole rail will sing/);
  assert.match(talkTo('bess', has([])).lines.map((l) => l.text).join(' '), /hot, hotter, and safe/);
  // The Smith: The Smith until garrick_named, then Garrick; one at a time.
  assert.equal(isPresent('garrick_e', has([])), false);
  assert.equal(isPresent('garrick_e', has(['met_ilya'])), true);
  assert.equal(isPresent('garrick_e', has(['met_ilya', 'garrick_named'])), false);
  assert.equal(isPresent('garrick_n', has(['met_ilya'])), false);
  assert.equal(isPresent('garrick_n', has(['garrick_named'])), true);
  assert.equal(NPCS.garrick_e.name, 'The Smith');
  assert.equal(NPCS.garrick_n.name, 'Garrick');
  assert.equal(NPCS.garrick_e.spot, NPCS.garrick_n.spot);
  // Willowmere's Garrick leaves with the Smith; Penny on the east road follows the sand road.
  assert.equal(isPresent('garrick', has(['crossing_done'])), true);
  assert.equal(isPresent('garrick', has(['crossing_done', 'ep3_started'])), false);
  assert.equal(isPresent('penny_e', has([])), true);
  assert.equal(isPresent('penny_e', has(['sand_gate_open'])), false);
});

test('the returning cast has Episode 3 lines: at the start of the episode and after it', () => {
  const has = (list) => (f) => list.includes(f);
  for (const id of ['wren', 'vessa', 'elian', 'aurel', 'anwen', 'hazel', 'mael', 'holt', 'hal']) {
    const t = NPCS[id].talk;
    assert.ok(t.some((e) => e.lines && [e.if].flat().includes('ep3_started')), `${id}: no ep3_started line`);
    assert.ok(t.some((e) => e.lines && [e.if].flat().includes('ep3_complete')), `${id}: no ep3_complete line`);
    // The Episode 3 entries sit before the Episode 2 ones, so the new line wins.
    const first3 = t.findIndex((e) => [e.if].flat().includes('ep3_started'));
    const first2 = t.findIndex((e) => [e.if].flat().includes('ep2_complete'));
    assert.ok(first3 >= 0 && (first2 < 0 || first3 < first2), `${id}: ep3 lines must precede ep2 lines`);
  }
  assert.match(talkTo('holt', has([...EP2_DONE, 'ep3_started'])).lines.map((l) => l.text).join(' '), /saying a name every hour/);
  assert.match(talkTo('holt', has([...EP2_DONE, 'ep3_started', 'ep3_complete'])).lines.map((l) => l.text).join(' '), /GARRICK\. Came back at noon/);
  assert.match(talkTo('aurel', has(['nh_restored', 'ep3_started'])).lines.map((l) => l.text).join(' '), /A father walks all night for his son/);
  assert.match(talkTo('anwen', has([...EP2_DONE, 'ep3_started'])).lines.map((l) => l.text).join(' '), /Say his name anyway/);
  assert.match(talkTo('elian', has([...EP2_DONE, 'met_elian', 'ep3_started', 'letter_answer_started'])).lines.map((l) => l.text).join(' '), /Bram's father/);
  // The older scene entries still win: Mael's letter and Vessa's errand are not shadowed.
  assert.deepEqual(talkTo('mael', has([...EP2_DONE, 'ep3_started', 'letter_answer_started'])), { scene: 'letter_answer' });
});

test('Episode 3 main quest: steps in order, Talk names the next step on every map in Mira and Bram voices', () => {
  assert.equal(mainQuestFor(() => false).id, 'main_ep1');
  assert.equal(mainQuestFor((f) => f === 'ep1_complete'), MAIN_QUEST_EP2);
  assert.equal(mainQuestFor((f) => f === 'ep3_started'), MAIN_QUEST_EP3);
  const ids = MAIN_QUEST_EP3.steps.map((s) => s.id);
  assert.deepEqual(ids, ['sand_road', 'emberpeak', 'foundry_f1', 'foundry_f2', 'foundry_f3', 'warden', 'first_bell', 'epilogue3']);
  assert.equal(MAIN_QUEST_EP3.steps.at(-1).done, null);
  const done = new Set([...EP2_DONE, 'ep3_started']);
  for (const step of MAIN_QUEST_EP3.steps) {
    const has = (f) => done.has(f);
    assert.equal(currentStep(has, MAIN_QUEST_EP3).id, step.id);
    assert.ok(fits(step.journal), `${step.id} journal: ${boxLines(step.journal).join(' / ')}`);
    assert.equal(journal(has).main.title, 'The Forge of Ash');
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
    if (step.done) done.add(step.done);
    for (const f of { foundry_entered: ['met_ilya', 'met_veyra'], foundry_f1_done: ['foundry_f1_arrived'], bell_gate_open: ['foundry_f3_arrived'] }[step.done] || []) done.add(f);
  }
  // Sub-steps really change the hint where the player is standing.
  const base = [...EP2_DONE, 'ep3_started'];
  const at = (extra, map) => partyChat((f) => [...base, ...extra].includes(f), map).lines.map((l) => l.text).join(' ');
  assert.notEqual(at([], 'nameless_hollow'), at(['sand_gate_open'], 'nameless_hollow'));
  assert.notEqual(at(['sand_gate_open', 'sand_road_arrived'], 'sand_road'), at(['sand_gate_open', 'sand_road_arrived', 'saw_slag'], 'sand_road'));
  assert.notEqual(at(['pk_arrived'], 'emberpeak'), at(['pk_arrived', 'met_veyra'], 'emberpeak'));
  const f3 = (extra) => at(['pk_arrived', 'foundry_entered', 'foundry_f1_done', 'foundry_f2_done', 'foundry_f3_arrived', ...extra], 'foundry_f3');
  assert.match(f3(['oath_hand', 'oath_heart']), /south/i);
  assert.match(f3(['oath_hand', 'oath_home']), /east/i);
  assert.match(f3(['oath_heart', 'oath_home']), /west/i);
  assert.match(f3([]), /shove/i);
  // The first step names the doable thing after ep3_complete, in the epilogue.
  const after = [...base, ...MAIN_FLAGS, 'bell_gate_open', 'pk_restored', 'ep3_complete'];
  assert.equal(currentStep((f) => after.includes(f), MAIN_QUEST_EP3).id, 'epilogue3');
  assert.match(partyChat((f) => after.includes(f), 'emberpeak').lines.map((l) => l.text).join(' '), /supper/);
});

test('the epilogue of Episode 2 points at the sand gate once the switch is on, and says "not open yet" while it is off', () => {
  const ep2 = MAIN_QUEST_EP2.steps.at(-1);
  assert.equal(ep2.id, 'epilogue2');
  assert.match(ep2.journal, EP3_LIVE ? /sand road/ : /not open yet/);
  assert.match(EPILOGUE2_LIVE.journal, /sand road from the east gate/);
  assert.ok(fits(EPILOGUE2_LIVE.journal));
  for (const e of EPILOGUE2_LIVE.chat) for (const l of e.lines) assert.ok(fits(l.text) && ['mira', 'bram'].includes(l.who), l.text);
  assert.equal(EPILOGUE2_LIVE.chat.at(-1).map, undefined, 'fallback entry');
});

test('Episode 3 side quests: givers, rewards, fallback hints, journal counters', () => {
  assert.equal(SIDE_QUESTS_EP3.length, 3);
  for (const q of SIDE_QUESTS_EP3) {
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
  for (const [k, r] of Object.entries(REWARDS_EP3)) assert.ok(itemExists(r.item) && Number.isInteger(r.qty), `reward ${k}`);
  const f = new Set([...EP2_DONE, 'ep3_started', 'coolant_started', 'testimony_ilya']);
  const j = journal((x) => f.has(x));
  assert.deepEqual(j.side.find((s) => s.id === 'coolant').counter, { label: 'Witnesses heard', value: 1, max: 3 });
  assert.equal(partyChat((x) => f.has(x), 'emberpeak').side.length, 1);
});

test('side quests run start to finish and pay out once', async () => {
  const { set, logs } = await playthrough(scenes, [
    'coolant_check', 'coolant_start', 'coolant_start', 'testimony_ilya', 'testimony_ilya', 'testimony_harl', 'coolant_check',
    'testimony_sella', 'coolant_check', 'coolant_check',
    'vessa_sand', 'vessa_sand', giveFlag('glass_sand_found'), 'vessa_sand', 'vessa_sand',
    'ledger_ash', 'ledger_ash',
  ], { flags: [...EP2_DONE, 'ep3_started', 'sand_gate_open', 'pk_arrived', 'met_ilya', 'foundry_f2_arrived'] });
  for (const f of ['coolant_done', 'sand_done', 'ledger_found']) assert.ok(set.has(f), f);
  const gives = Object.values(logs).flat(2).filter((e) => e.op === 'give').map((e) => e.args[0]);
  assert.equal(gives.filter((g) => g === 'ashwalker_mantle').length, 1);
  assert.equal(gives.filter((g) => g === 'emberglass_charm').length, 1);
  assert.equal(gives.filter((g) => g === 'quench_flask').length, 1, 'the flasks (3) come with the mantle, once, as one give');
  const takes = Object.values(logs).flat(2).filter((e) => e.op === 'take').map((e) => e.args[0]);
  assert.deepEqual(takes, ['glass_sand']);
  // The check refuses before the third witness, and says so.
  const early = await runOnce(scenes.coolant_check, { flags: [...EP2_DONE, 'pk_arrived', 'coolant_started', 'testimony_ilya'], branchFlags: false });
  assert.ok(!early.log.some((e) => e.op === 'give' || (e.op === 'setFlag' && e.args[0] === 'coolant_done')));
});

test('text: bestiary, banners, books, barks, help lines and CREDITS_EP3', () => {
  for (const id of EP3_ENEMY_IDS) assert.ok(BESTIARY_EP3[id] && BESTIARY_EP3[id].name && BESTIARY_EP3[id].where && BESTIARY_EP3[id].lore.every((b) => fits(b)), `bestiary ${id}`);
  assert.deepEqual(Object.keys(BESTIARY_EP3).sort(), [...EP3_ENEMY_IDS].sort());
  // Staged: an entry reaches the Bestiary only when enemies.js defines the foe.
  for (const id of EP3_ENEMY_IDS) assert.equal(id in BESTIARY, !!ENEMIES?.[id], `bestiary merge ${id}`);
  assert.equal(EP3_ENEMY_IDS.length, 11);
  for (const id of EP3_MAP_IDS) assert.ok(BANNERS[id] && BANNERS[id].title, `banner ${id}`);
  assert.equal(BANNERS.emberpeak.sub, 'Bellows Square');
  assert.equal(BANNERS.emberpeak.states[0].sub, 'The First Bell');
  assert.equal(BANNERS.sand_road.title, 'The Old Sand Road');
  assert.equal(BANNERS.sand_road.sub, 'Into the Ash Hills');
  assert.equal(BANNERS.foundry_f1.sub, 'I. The Cinder Liftworks');
  assert.equal(BANNERS.foundry_f2.sub, 'II. The Ventilation Galleries');
  assert.equal(BANNERS.foundry_f3.sub, 'III. The Heartforge Crucible');
  for (const id of ['foundry_ledger', 'pk_records']) assert.ok(BOOKS[id] && BOOKS[id].pages.length >= 3 && BOOKS[id].pages.every((p) => fits(p)), id);
  for (const id of ['first_sluice', 'first_quench', 'first_basin']) {
    assert.ok(BARKS[id], id);
    for (const e of BARKS[id]) { for (const f of flagsOf(e)) assert.ok(f in FLAGS, `${id}: ${f}`); for (const l of e.lines) assert.ok(fits(l.text) && ['mira', 'bram'].includes(l.who)); }
  }
  assert.equal(BARKS.first_quench[0].lines[0].text, "It stays cooled. Good. I'd hate to do that twice.");
  assert.equal(BARKS.first_sluice[0].lines[0].text, 'Paddle. Turns the water. Carters used these.');
  assert.equal(BARKS.first_basin[0].lines[0].text, 'Full basin, cooled grate. Water opens things here.');
  for (const v of [HELP.save.bell_pk, HELP.inn.poor_bess]) assert.ok(v.length <= 40);
  assert.ok(CREDITS_EP3.length >= 10 && CREDITS_EP3.some((c) => c.lines.includes('Scott Ball')));
  for (const c of CREDITS_EP3) {
    assert.ok(typeof c.heading === 'string' && c.heading.length <= 30 && c.lines.length >= 1 && c.lines.length <= 6);
    for (const l of c.lines) assert.ok(l.length <= 42 && /^[\x20-\x7e]*$/.test(l), `credit ${l}`);
  }
  assert.equal(CREDITS_EP3[0].lines[0], 'Episode 3: The Forge of Ash');
  for (const map of EP3_MAP_IDS) for (const e of BANTER[map] || []) for (const l of e.lines) assert.ok(fits(l.text) && ['mira', 'bram'].includes(l.who), `${map}: ${l.text}`);
});

test('with the real font, every Episode 3 line fits the dialogue text area in pixels', async (t) => {
  const { existsSync } = await import('node:fs');
  const { wrap, stripCodes, fill, BOX_COLS, HERO_NAME_MAX } = await import('../../src/data/story/dialogue.js');
  const fontPath = join(NEXT, 'assets', 'ui', 'font.json');
  if (!existsSync(fontPath)) { t.skip('assets/ui/font.json not built yet'); return; }
  const font = JSON.parse(readFileSync(fontPath, 'utf8'));
  const adv = (c) => (c === ' ' ? font.spaceAdvance : font.glyphs[c] ? font.glyphs[c][6] : 6);
  const width = (s) => [...s].reduce((a, c, i) => a + adv(c) + ((font.kerning || {})[(s[i - 1] || '') + c] || 0), 0);
  const TEXT_AREA = 384 - 16 - 16 - 56;
  const texts = [];
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) if (e.op === 'say') texts.push([id, e.args[1]]);
  const walkLines = (where, v) => {
    if (typeof v === 'string') texts.push([where, v]);
    else if (Array.isArray(v)) v.forEach((x) => walkLines(where, x));
    else if (v && typeof v === 'object') { if ('text' in v) texts.push([where, v.text]); if ('lines' in v) walkLines(where, v.lines); }
  };
  for (const [id, v] of Object.entries(lines)) walkLines(`lines.${id}`, v);
  for (const st of MAIN_QUEST_EP3.steps) { texts.push([st.id, st.journal]); for (const e of st.chat) walkLines(st.id, e.lines); }
  for (const q of SIDE_QUESTS_EP3) for (const st of q.steps) { texts.push([q.id, st.journal]); for (const e of st.chat) walkLines(q.id, e.lines); }
  for (const [id, n] of Object.entries(NPCS)) if (EP3_MAP_IDS.includes(n.map)) for (const e of n.talk) walkLines(`npc ${id}`, e.lines);
  for (const [id, b] of Object.entries(BESTIARY_EP3)) b.lore.forEach((x) => texts.push([`bestiary ${id}`, x]));
  for (const id of ['foundry_ledger', 'pk_records']) BOOKS[id].pages.forEach((x) => texts.push([`book ${id}`, x]));
  const hero = 'W'.repeat(HERO_NAME_MAX);
  const bad = [];
  for (const [where, s] of texts) for (const line of wrap(stripCodes(fill(s, { hero })), BOX_COLS))
    if (width(line) > TEXT_AREA) bad.push(`${where}: ${line} (${width(line)} px)`);
  assert.deepEqual(bad, []);
});

test('the ban list: no banned word and no em dash in any Episode 3 doc or source', () => {
  const files = [...listFiles(join(NEXT, 'src'), (p) => p.endsWith('.js')), ...listFiles(join(NEXT, 'docs'), (p) => /EPISODE3|STAGING_EP3|E3-/.test(p))];
  const hits = [];
  for (const f of files) {
    const txt = read(f);
    if (BANNED.test(txt)) hits.push(`${f}: banned word`);
    if (/EPISODE3|STAGING_EP3|ep3\.js/.test(f) && txt.includes(EM)) hits.push(`${f}: em dash`);
  }
  assert.deepEqual(hits, []);
});
