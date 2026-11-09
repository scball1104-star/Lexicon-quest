// Episode 5 story script (E5-story, the lazy ep5 pack): every scene and branch, the cutscene API, ids unique across five
// episodes and the X1, X2, cave and tier packs, flags declared, boxes and budgets, staging, the close-up payoffs, music
// cues, the two names that arrive late, the two truth choices, the switch, Mira's boss tips against E5-battle's data, and
// a playthrough to ep5_complete. Ids owned by other wave-5 agents (maps, sprites, pages, audio) are accepted by their
// planned ids (docs/EPISODE5_PLAN.md section 2); battle ids are read from E5-battle's modules when they exist.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { scenes, SCENE_CONDITIONS, GATE, MAIN_PATH, BOX_BUDGET, PAYOFFS, TIPS, register as registerScenes } from '../../src/data/ep5/story.js';
import { EP5_FLAGS, register as registerFlags } from '../../src/data/ep5/flags.js';
import { register as registerEp4Flags } from '../../src/data/ep4/flags.js';
import { EP5_LINES, EPISODE6_CARD, END_TITLE_EP5 } from '../../src/data/ep5/text.js';
import { EP5_NPCS, EP5_SPEAKERS, register as registerNpcs } from '../../src/data/ep5/npcs.js';
import { scenes as EP4_SCENES } from '../../src/data/ep4/story.js';
import { EP4_LINES } from '../../src/data/ep4/text.js';
import { scenes as EP1_SCENES, lines as EP1_LINES } from '../../src/data/story/ep1.js';
import { scenes as EP2_SCENES, lines as EP2_LINES } from '../../src/data/story/ep2.js';
import { scenes as EP3_SCENES, lines as EP3_LINES } from '../../src/data/story/ep3.js';
import { FLAGS } from '../../src/data/quests.js';
import { NPCS, SPEAKER_NAMES } from '../../src/data/npcs.js';
import { PAGE_KINDS } from '../../src/world/closeup.js';
import { fits, boxLines } from '../../src/data/story/dialogue.js';
import { explore, playthrough, runOnce, NEXT, read, EMOTES, DIRS } from './_harness.mjs';

const EM = String.fromCharCode(0x2014);
const BANNED = new RegExp(['cross', 'word'].join(''), 'i');
const EP4_DONE = ['intro_done', 'met_mael', 'mira_joined', 'bram_joined', 'archivore_defeated', 'ep1_complete', 'ep2_started',
  'ep2_complete', 'nh_restored', 'ep3_started', 'pk_restored', 'garrick_named', 'mara_named', 'ep3_complete', 'mirror_sigil_get',
  'ep4_started', 'vw_restored', 'lyra_named', 'ep4_complete'];
export const MAIN_FLAGS = ['ep5_started', 'ship_boarded', 'ship_first_fight_done', 'road_landed', 'haven_arrived', 'met_sel',
  'star_reading_done', 'sky_learned', 'gnomon_get', 'lab_entered', 'lab_f1_done', 'knight_defeated', 'lab_f2_done',
  'vex_gallery_met', 'sel_walked_in', 'oracle_door_open', 'oracle_defeated', 'chart_restored', 'fragment5_get', 'roads_returned',
  'haven_restored', 'ep5_complete'];
const PARTY = ['hero', 'mira', 'bram'];
const MAP_ACTORS = ['oracle'];   // the Oracle's map actor in ep5_lab_oracle (sprite oracle_avatar, E5-maps-b)
const EP5_MUSIC = ['saffron', 'labyrinth', 'boss_oracle', 'valewyn'];   // plan 2.7 (valewyn rides the ep4 fragment)
const EP5_SFX = ['sun_dial', 'sand_run', 'sand_hold', 'sky_turn', 'prophecy_read', 'prophecy_break', 'lamp_roll', 'caravan_bell'];
const EP5_SPRITES = ['npc_sel', 'npc_yara', 'npc_kamal', 'npc_nasrin', 'npc_laleh', 'npc_omar', 'npc_yasmin', 'npc_hassan',
  'npc_ishra', 'npc_tamir', 'npc_young_sel', 'npc_traveler', 'npc_vex', 'npc_innkeeper', 'dust_harrier', 'dune_scarab'];
const PAGE_IDS = ['ep5_letter', 'ep5_chart', 'ep5_page'];
const TINTS = ['none', 'dawn', 'dusk', 'night'];
const KNOWN = (f) => f in FLAGS || f === 'tier_1';   // tier_1: the Fine Print pack's flag (src/data/tier)

// E5-battle's modules, when they exist (the encounter and item ids then come from them; otherwise the plan's).
const battleMod = async (name) => (existsSync(join(NEXT, 'src', 'data', 'ep5', `${name}.js`)) ? import(`../../src/data/ep5/${name}.js`) : null);
const ENC5 = await battleMod('encounters');
const ITEMS5 = await battleMod('items');
const ENEMIES5 = await battleMod('enemies');
const SKILLS5 = await battleMod('skills');
const ENCOUNTER_IDS = ENC5 ? [...ENC5.EP5_GROUP_IDS, ...ENC5.EP5_BOSS_IDS] : ['e5s_first', 'mirage_knight', 'oracle'];
const ITEM_IDS = ITEMS5 ? Object.keys({ ...ITEMS5.EP5_CONSUMABLES, ...ITEMS5.EP5_KEY_ITEMS, ...ITEMS5.EP5_UNIQUES })
  : ['star_letter', 'gnomon', 'fifth_list', 'ishra_page', 'name_fragment_5', 'caravan_bell', 'caravan_compass', 'veiled_star',
    'nomad_mantle', 'copperwind_bell'];
const CORE_ITEMS = ['hi_ether', 'hi_potion'];

registerEp4Flags();
registerFlags();
registerNpcs();
GATE.live = true;
const RUNS = {};
for (const [id, fn] of Object.entries(scenes)) RUNS[id] = await explore(fn, { flags: ['mira_joined', 'bram_joined'] });
const allOps = (id) => RUNS[id].flatMap((r) => r.log);
const ops = (log, op) => log.filter((e) => e.op === op);
const musics = (log) => ops(log, 'music').map((e) => e.args[0]);
const says = (log) => ops(log, 'say');
const one = async (id, flags, o = {}) => (await runOnce(scenes[id], { flags: [...EP4_DONE, ...flags], branchFlags: false, ...o })).log;

test('scene and line ids are new across Episodes 1 to 4 and the X1, X2, cave and tier packs', async () => {
  const STORY = await import('../../src/game/story.js');
  for (const mod of ['../../src/data/x1/index.js', '../../src/data/x2/index.js', '../../src/data/cave/story.js', '../../src/data/tier/index.js']) {
    try { const m = await import(mod); await (m.register || m.default)(); } catch (e) { /* a pack that cannot load in node registers nothing */ }
  }
  for (const id of Object.keys(scenes)) {
    for (const t of [EP1_SCENES, EP2_SCENES, EP3_SCENES, EP4_SCENES]) assert.ok(!(id in t), `scene ${id} exists in Episodes 1 to 4`);
    assert.ok(!(id in STORY.SCENES), `scene ${id} is already registered`);
    assert.ok(!/^(ep4_|f[1-3]_|fo[1-3]_|sr_|pk_|oath_|vow_|foundry_|sand_|principle_|regent_|lyra_|star_[1-3]_read|orrery)/.test(id), `prefix ${id}`);
  }
  for (const id of Object.keys(EP5_LINES)) {
    for (const t of [EP1_LINES, EP2_LINES, EP3_LINES, EP4_LINES]) assert.ok(!(id in t), `line ${id} exists in Episodes 1 to 4`);
    assert.ok(!(id in STORY.LINES), `line ${id} is already registered`);
  }
  const out = registerScenes();
  assert.deepEqual(out, { scenes: [], lines: [], conditions: [] });
  assert.deepEqual(registerScenes(), { scenes: [], lines: [], conditions: [] }, 'registering twice collides with nothing');
  for (const id of Object.keys(scenes)) assert.equal(STORY.SCENES[id], scenes[id]);
  const n = Object.keys(scenes).length;
  assert.ok(n >= 30 && n < 40, `built scenes: ${n} (EPISODE5 section 7: under 40)`);
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

test('scene conditions exist for every scene, use declared flags, and only ep5_morning needs the switch', () => {
  for (const id of Object.keys(scenes)) assert.ok(SCENE_CONDITIONS[id], `condition for ${id}`);
  for (const [id, c] of Object.entries(SCENE_CONDITIONS)) {
    for (const f of [c.if, c.ifNot].flat().filter(Boolean)) assert.ok(KNOWN(f), `${id}: undeclared ${f}`);
    assert.equal(!!c.live, id === 'ep5_morning', `${id}: live`);
  }
  assert.ok([SCENE_CONDITIONS.ep5_morning.ifNot].flat().includes('tier_1'));
  assert.ok([SCENE_CONDITIONS.ep5_morning.if].flat().includes('ep4_complete'));
});

test('every flag a scene sets or checks is declared; every main flag is set by a scene', () => {
  const set = new Set();
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) {
    if (e.op === 'setFlag') { set.add(e.args[0]); assert.ok(e.args[0] in EP5_FLAGS, `${id}: setFlag ${e.args[0]} is not an Episode 5 flag`); }
    if (e.op === 'hasFlag') assert.ok(KNOWN(e.args[0]), `${id}: hasFlag ${e.args[0]}`);
  }
  for (const f of MAIN_FLAGS) assert.ok(set.has(f), `no scene sets ${f}`);
});

test('every id a scene references exists or is a planned Episode 5 id', () => {
  const manifest = JSON.parse(read(join(NEXT, 'assets', 'audio', 'manifest.json')));
  const speakers = new Set([...PARTY, ...Object.keys(NPCS), ...Object.keys(EP5_NPCS), ...Object.keys(SPEAKER_NAMES), ...Object.keys(EP5_SPEAKERS), ...MAP_ACTORS]);
  for (const id of Object.keys(RUNS)) {
    const spawned = new Set();
    for (const e of allOps(id)) {
      const a = e.args;
      switch (e.op) {
        case 'spawn': spawned.add(a[0]); assert.ok(a[1] && a[1].sprite && a[1].name && a[1].at, `${id}: spawn ${a[0]} needs sprite, name, at`);
          assert.ok(EP5_SPRITES.includes(a[1].sprite), `${id}: sprite ${a[1].sprite}`); break;
        case 'say': if (a[0] != null) assert.ok(speakers.has(a[0]) || spawned.has(a[0]), `${id}: speaker ${a[0]}`); break;
        case 'emote': assert.ok(EMOTES.includes(a[1]), `${id}: emote ${a[1]}`); break;
        case 'face': assert.ok(DIRS.includes(a[1]) || speakers.has(a[1]) || spawned.has(a[1]), `${id}: face ${a[1]}`); break;
        case 'music': assert.ok(a[0] === null || a[0] in manifest.music || EP5_MUSIC.includes(a[0]), `${id}: music ${a[0]}`); break;
        case 'sfx': assert.ok(a[0] in manifest.sfx || EP5_SFX.includes(a[0]), `${id}: sfx ${a[0]}`); break;
        case 'tint': assert.ok(TINTS.includes(a[0]), `${id}: tint ${a[0]}`); break;
        case 'battle': assert.ok(ENCOUNTER_IDS.includes(a[0]), `${id}: battle ${a[0]}`); break;
        case 'give': case 'take': assert.ok(a[0] === 'gold' || ITEM_IDS.includes(a[0]) || CORE_ITEMS.includes(a[0]), `${id}: item ${a[0]}`); break;
        case 'closeup': assert.ok(a[0] === null || PAGE_IDS.includes(a[0]), `${id}: closeup ${a[0]}`); break;
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
  for (const c of [EPISODE6_CARD, END_TITLE_EP5]) assert.ok(c.text.length <= 42 && c.sub.length <= 42, c.text);
});

// The late names: Ishra only from sel_memory_3 (Sel says it there), Tamir only once Yara knows him in every_road.
test('nobody says Ishra before sel_memory_3, nor Tamir before Yara knows him; the swaps are on one beat', () => {
  const late = (name, flagOrFn) => {
    for (const id of Object.keys(RUNS)) for (const r of RUNS[id]) {
      let named = false;
      for (const e of r.log) {
        if (flagOrFn(e)) named = true;
        if (e.op === 'spawn') assert.ok(named || !new RegExp(name).test(e.args[1].name), `${id}: spawn named ${e.args[1].name} early`);
        if (e.op === 'say' && new RegExp(`\\b${name}\\b`).test(e.args[1])) assert.ok(named, `${id}: "${e.args[1]}" before the reveal`);
      }
    }
  };
  late('Ishra', (e) => e.op === 'say' && e.args[1] === 'Ishra. Her name was Ishra.');
  late('Tamir', (e) => e.op === 'say' && e.args[1] === '...Father?');
  const log = RUNS.every_road.find((r) => ops(r.log, 'give').length).log;
  const father = log.findIndex((e) => e.op === 'say' && e.args[1] === '...Father?');
  const despawn = log.findIndex((e) => e.op === 'despawn' && e.args[0] === 'tamir_t');
  const spawn = log.findIndex((e) => e.op === 'spawn' && e.args[0] === 'tamir_n');
  assert.ok(father > 0 && despawn === father + 1 && spawn === despawn + 1, 'tamir_t becomes tamir_n on the beat Yara knows him');
  assert.equal(log[spawn].args[1].name, 'Tamir');
  assert.equal(log[spawn].args[1].at, ops(log, 'walk').find((e) => e.args[0] === 'tamir_t').args[1]);
  assert.equal(SPEAKER_NAMES.student_m, 'The First Student');
  assert.equal(SPEAKER_NAMES.ishra_m, 'Ishra');
  assert.equal(SPEAKER_NAMES.tamir_m, 'A Traveler');
  // the memories tag her "The First Student"
  for (const id of ['sel_memory_1', 'sel_memory_2', 'landing_shelter']) assert.ok(allOps(id).some((e) => e.op === 'say' && e.args[0] === 'student_m'), id);
});

test('the hero never speaks; Mira learns Turn the Sky; the hero sets the star back on the truth path', async () => {
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) if (e.op === 'say') assert.notEqual(e.args[0], 'hero', `${id}: the hero speaks`);
  const sr = await one('star_reading', ['met_sel']);
  const learnAt = sr.findIndex((e) => e.op === 'say' && /learned Turn the Sky/.test(e.args[1]));
  const flagAt = sr.findIndex((e) => e.op === 'setFlag' && e.args[0] === 'sky_learned');
  assert.ok(flagAt >= 0 && learnAt > flagAt, 'sky_learned is set before the learn line');
  assert.match(sr[learnAt].args[1], /turns the sky now, and breaks a foretelling/);
  const vg = RUNS.vex_gallery.find((r) => ops(r.log, 'setFlag').some((e) => e.args[0] === 'star_restored')).log;
  assert.ok(ops(vg, 'walk').some((e) => e.args[0] === 'hero' && e.args[1] === 'star_socket'));
});

// The staging rule (CRITIQUE_6 item 11): the party is on its marks before the first line of anyone outside it.
const STAGED = ['ep5_morning', 'ep5_board', 'ship_night', 'ship_bram', 'road_landing', 'tent_rest', 'haven_arrival', 'meet_sel',
  'moonwell', 'star_reading', 'sel_gate', 'sel_memory_1', 'sel_memory_2', 'vex_gallery', 'sel_walks_in', 'landing_shelter',
  'landing_truth', 'landing_return', 'oracle', 'every_road', 'ep5_ending'];
const REVISIT = ['knight_tried', 'oracle_tried', 'tent_rested', 'moonwell_seen'];
test('staging: the party walks to its marks before the first line of a speaker outside it', async () => {
  for (const id of STAGED) {
    for (const r of RUNS[id]) {
      const first = r.log.findIndex((e) => e.op === 'say' && e.args[0] != null && !PARTY.includes(e.args[0]));
      if (first < 0) continue;
      const before = r.log.slice(0, first).filter((e) => e.op === 'walk').map((e) => e.args[0]);
      const revisit = ops(r.log, 'hasFlag').some((e) => REVISIT.includes(e.args[0]) && e.args[1]);
      if (revisit) continue;   // a retry or a later visit: the party is already where it stood
      for (const who of PARTY) assert.ok(before.includes(who), `${id}: ${who} is not staged before the first line`);
    }
  }
  // the party never stands on the speaker's own mark
  for (const id of STAGED) for (const r of RUNS[id]) {
    const spots = new Set(ops(r.log, 'spawn').map((e) => e.args[1].at));
    for (const w of ops(r.log, 'walk')) if (PARTY.includes(w.args[0])) assert.ok(!spots.has(w.args[1]), `${id}: ${w.args[0]} walks onto ${w.args[1]}`);
  }
});

test('STAGING_EP5.md documents every scene, every mark and every inspect line', () => {
  const staging = read(join(NEXT, 'docs', 'story', 'STAGING_EP5.md'));
  const missing = [];
  for (const id of Object.keys(scenes)) if (!staging.includes('`' + id + '`')) missing.push(`scene ${id}`);
  const actors = new Set([...PARTY, ...Object.keys(NPCS), ...Object.keys(EP5_NPCS), ...MAP_ACTORS]);
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) if (e.op === 'spawn') actors.add(e.args[0]);
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) {
    let mark = null;
    if (e.op === 'walk' && typeof e.args[1] === 'string') mark = e.args[1];
    if (e.op === 'camera.panTo') mark = e.args[0];
    if (e.op === 'spawn') mark = e.args[1]?.at;
    if (mark && !actors.has(mark) && !staging.includes('`' + mark + '`')) missing.push(`${id}: mark ${mark}`);
  }
  for (const id of Object.keys(EP5_LINES)) if (!staging.includes('`' + id + '`')) missing.push(`line ${id}`);
  for (const f of ['EP5_LIVE', 'credits4_rolled', 'PAGE_KINDS', 'END_CARD_EP5', 'END_CARD_EP4_LIVE', 'SEL_TWIN', 'HAVEN_TWIN']) if (!staging.includes(f)) missing.push(f);
  assert.deepEqual([...new Set(missing)], []);
});

// A chained scene's own boxes: count until the chain point.
const ownBoxes = (log, stop) => {
  const i = stop ? log.findIndex(stop) : -1;
  return says(i < 0 ? log : log.slice(0, i)).length;
};
const STOPS = {
  lab_f3_arrival: (e) => e.op === 'setFlag' && e.args[0] === 'lab_f3_arrived',
  landing_return: (e) => e.op === 'setFlag' && e.args[0] === 'landing_return',
  oracle: (e) => e.op === 'battle',
  every_road: (e) => e.op === 'setFlag' && e.args[0] === 'haven_restored',
};
const CHAINED = ['sel_walks_in', 'sel_memory_3', 'oracle_after', 'ep5_ending'];
test('box budgets: 12 per main scene (6 morning, 16 star_reading, 22 oracle_after, 14 every_road, 13 ending), about 200 in all', () => {
  const over = [];
  let total = 0;
  const per = {};
  for (const id of [...MAIN_PATH, ...CHAINED]) {
    const cap = BOX_BUDGET[id] ?? BOX_BUDGET.default;
    const most = Math.max(...RUNS[id].map((r) => ownBoxes(r.log, STOPS[id])));
    if (most > cap) over.push(`${id}: ${most} > ${cap}`);
    per[id] = most;
    total += most;
  }
  assert.deepEqual(over, []);
  assert.ok(total >= 140 && total <= 210, `main path boxes: ${total}`);
  console.log(`# Episode 5 main path: ${total} boxes over ${MAIN_PATH.length + CHAINED.length} scenes`);
});

test('the first five minutes: ep5_morning shows the letter early, Bram asks on the ship, the fight follows', async () => {
  const kinds = Object.keys(PAGE_KINDS);
  PAGE_KINDS.ep5_letter = () => ({});
  try {
    const log = await one('ep5_morning', [], { mapId: 'ep4_vw_inn' });
    const opened = log.findIndex((e) => e.op === 'closeup' && e.args[0] === 'ep5_letter');
    assert.ok(opened >= 0 && says(log.slice(0, opened)).length === 0, 'the letter is the first thing shown');
    assert.deepEqual(log[opened].args[1], { mode: 'blank' });
    assert.ok(says(log).length <= 6);
    assert.ok(ops(log, 'give').some((e) => e.args[0] === 'star_letter'));
  } finally { for (const k of Object.keys(PAGE_KINDS)) if (!kinds.includes(k)) delete PAGE_KINDS[k]; }
  const bram = await one('ship_bram', ['ship_arrived']);
  assert.equal(says(bram).length, 3);
  const fight = await one('ship_fight', ['bram_asked']);
  assert.ok(says(fight.slice(0, fight.findIndex((e) => e.op === 'battle'))).length <= 2, 'the fight comes fast');
  assert.deepEqual(ops(fight, 'battle')[0].args.slice(0, 2), ['e5s_first', { canFlee: false }]);
});

test('the payoffs open their close-up pages when the kinds exist, closed before the field moves; never a page that is missing', async () => {
  const kinds = Object.keys(PAGE_KINDS);
  // without the pages (wave 5a): no closeup call at all
  for (const id of Object.keys(PAYOFFS)) for (const e of allOps(id)) assert.notEqual(e.op, 'closeup', `${id}: closeup with no page kind`);
  for (const k of PAGE_IDS) PAGE_KINDS[k] = () => ({});
  try {
    const STATE = { ep5_morning: [], star_reading: ['met_sel'], sel_memory_3: ['landing_return'], oracle_after: ['oracle_defeated'],
      ep5_ending: ['haven_restored'] };
    for (const [id, want] of Object.entries(PAYOFFS)) {
      const log = await one(id, STATE[id]);
      const opens = ops(log, 'closeup').filter((e) => e.args[0]);
      assert.deepEqual(opens.map((e) => [e.args[0], e.args[1]?.mode]), want, id);
      let open = false;
      for (const e of log) {
        if (e.op === 'closeup') open = !!e.args[0];
        if (open && (e.op === 'walk' || e.op === 'spawn' || e.op === 'despawn' || e.op === 'camera.panTo')) assert.fail(`${id}: ${e.op} while a page is open`);
      }
      assert.ok(!open, `${id}: page left open`);
    }
  } finally { for (const k of Object.keys(PAGE_KINDS)) if (!kinds.includes(k)) delete PAGE_KINDS[k]; }
});

test('a full playthrough from a finished Episode 4 reaches ep5_complete with every main flag, in order', async () => {
  const give = (...f) => (set) => f.forEach((x) => set.add(x));
  const order = ['ep5_morning', 'ep5_board', 'ship_night', 'ship_fight', (s) => assert.ok(!s.has('ship_first_fight_done'), 'the fight waits for Bram'),
    'ship_bram', 'ship_fight', 'road_landing', 'road_shade', 'tent_rest', 'haven_view', 'haven_arrival', 'star_reading',
    (s) => assert.ok(!s.has('star_reading_done'), 'the reading waits for Sel'), 'meet_sel', 'moonwell', 'star_reading', 'sel_gate',
    'lab_f1_arrival', 'sel_memory_1', give('sun_key_found'), 'lab_f1_stair', 'lab_f2_arrival', 'sel_memory_2', 'vex_gallery',
    'lab_f2_stair', (s) => assert.ok(!s.has('lab_f2_done'), 'the stair waits for the Knight'), 'mirage_knight', 'lab_f2_stair',
    'lab_f3_arrival', 'landing_truth', (s) => assert.ok(!s.has('landing_truth'), 'the landings go in order'), 'landing_shelter',
    'landing_truth', 'landing_return', 'oracle', 'every_road'];
  const { set } = await playthrough(scenes, order, { flags: EP4_DONE });
  for (const f of MAIN_FLAGS) assert.ok(set.has(f), `missing ${f}`);
  assert.ok(set.has('bram_told') && !set.has('bram_spared'));
  assert.ok(set.has('star_restored') && !set.has('star_hidden'));
  // nothing replays
  const again = await playthrough(scenes, MAIN_PATH.filter((id) => !['tent_rest', 'moonwell'].includes(id)), { flags: [...set] });
  for (const logs of Object.values(again.logs)) for (const log of logs) assert.ok(!ops(log, 'say').length, 'a main scene replayed');
});

test('the switch: with EP5_LIVE false nothing in Episode 5 is reachable; Fine Print never starts it; Episode 4 alone does not', async () => {
  GATE.live = false;
  try {
    const { set } = await playthrough(scenes, Object.keys(scenes), { flags: EP4_DONE });
    for (const f of Object.keys(EP5_FLAGS)) assert.ok(!set.has(f), `${f} set with the switch off`);
  } finally { GATE.live = true; }
  const fp = await playthrough(scenes, Object.keys(scenes), { flags: [...EP4_DONE, 'tier_1'] });
  for (const f of Object.keys(EP5_FLAGS)) assert.ok(!fp.set.has(f), `${f} set on a Fine Print run`);
  const early = await playthrough(scenes, Object.keys(scenes), { flags: EP4_DONE.filter((f) => f !== 'ep4_complete') });
  assert.ok(!early.set.has('ep5_started'), 'Episode 5 waits for ep4_complete');
  const ok = await playthrough(scenes, ['ep5_morning'], { flags: EP4_DONE });
  assert.ok(ok.set.has('ep5_started'));
});

// Each map's track (plan 8.2). A scene that changes the music puts its map's track back before it ends.
const SCENE_TRACK = {
  ep5_morning: 'valewyn', haven_view: 'ash_road', haven_arrival: 'saffron', star_reading: 'orrery', sel_memory_1: 'labyrinth',
  sel_memory_2: 'labyrinth', vex_gallery: 'labyrinth', mirage_knight: 'labyrinth', sel_memory_3: 'mystery', landing_return: 'mystery',
};
test('music cues follow the cue sheet and return to the map track (plan 8.3)', async () => {
  for (const [id, track] of Object.entries(SCENE_TRACK)) for (const r of RUNS[id]) {
    const m = musics(r.log);
    const lost = ops(r.log, 'battle').some((e) => e.args[2] === 'lose');
    if (m.length && !lost) assert.equal(m.at(-1), track, `${id} ends on ${m.at(-1)}`);
  }
  const mus = async (id, flags) => musics(await one(id, flags));
  assert.deepEqual(await mus('ep5_morning', []), [null, 'valewyn']);
  assert.deepEqual(await mus('haven_view', ['road_landed']), ['mystery', 'ash_road']);
  assert.deepEqual(await mus('haven_arrival', ['road_landed']), [null, 'saffron']);
  assert.deepEqual(await mus('star_reading', ['met_sel']), [null, 'orrery']);
  assert.deepEqual(await mus('sel_memory_1', ['lab_f1_arrived']), ['sorrow', 'labyrinth']);
  assert.deepEqual(await mus('vex_gallery', ['lab_f2_arrived']), [null, 'mystery', 'labyrinth']);
  assert.deepEqual(await mus('mirage_knight', ['lab_f2_arrived']), [null, 'battle', 'labyrinth']);
  assert.deepEqual(await mus('landing_return', ['landing_truth']), [null, 'sorrow', 'mystery']);
  assert.deepEqual(await mus('oracle', ['oracle_door_open']), [null, 'boss_oracle', 'sorrow', 'triumph', 'mystery', 'saffron']);
  assert.deepEqual(await mus('every_road', ['chart_restored']), [null, 'saffron', null, 'orrery', 'mystery']);
  for (const id of ['landing_shelter', 'landing_truth', 'tent_rest', 'ship_bram', 'sel_walks_in']) {
    assert.deepEqual(await mus(id, ['sel_walked_in', 'landing_shelter', 'road_landed', 'ship_arrived', 'lab_f3_arrived']), [], id);
  }
});

test('boss intros: silence, the card, the theme, then the battle; a retry is short; a loss sets nothing after', async () => {
  for (const [id, flags, theme, card] of [['mirage_knight', ['lab_f2_arrived'], 'battle', 'THE MIRAGE KNIGHT'],
    ['oracle', ['oracle_door_open'], 'boss_oracle', 'THE SAND ORACLE']]) {
    const log = await one(id, flags);
    const at = (op) => log.findIndex((e) => e.op === op);
    assert.equal(log[at('music')].args[0], null);
    assert.equal(log[at('title')].args[0], card);
    assert.ok(at('title') < at('battle'));
    assert.equal(log.slice(at('title'), at('battle')).find((e) => e.op === 'music').args[0], theme);
    const tried = id === 'oracle' ? 'oracle_tried' : 'knight_tried';
    const retry = await one(id, [...flags, tried]);
    const before = (l) => says(l.slice(0, l.findIndex((e) => e.op === 'battle'))).length;
    assert.ok(before(retry) < before(log) && before(retry) <= 2, `${id}: retry is short`);
    const lost = RUNS[id].find((r) => ops(r.log, 'battle').some((e) => e.args[2] === 'lose'));
    assert.ok(lost);
    const after = lost.log.slice(lost.log.findIndex((e) => e.op === 'battle'));
    assert.ok(!ops(after, 'setFlag').length && !ops(after, 'say').length, `${id}: a loss sets nothing`);
  }
});

test('the two truth choices: Bram changes one line in star_reading; the star changes one line in oracle_after, one in every_road, and the gift', async () => {
  const diff = async (id, base, a, b) => {
    const x = says(await one(id, [...base, a])).map((e) => e.args[1]);
    const y = says(await one(id, [...base, b])).map((e) => e.args[1]);
    assert.equal(x.length, y.length, id);
    return x.filter((t, i) => t !== y[i]).length;
  };
  assert.equal(await diff('star_reading', ['met_sel'], 'bram_told', 'bram_spared'), 1);
  assert.equal(await diff('oracle_after', ['oracle_defeated'], 'star_restored', 'star_hidden'), 1);
  // every_road chains the ending: one line differs in all of it
  assert.equal(await diff('every_road', ['chart_restored'], 'star_restored', 'star_hidden'), 1);
  const gift = (log) => ops(log, 'give').map((e) => e.args[0]).filter((x) => x === 'caravan_compass' || x === 'veiled_star');
  assert.deepEqual(gift(await one('every_road', ['chart_restored', 'star_restored'])), ['caravan_compass']);
  assert.deepEqual(gift(await one('every_road', ['chart_restored', 'star_hidden'])), ['veiled_star']);
  assert.deepEqual(gift(await one('every_road', ['chart_restored'])), ['veiled_star'], 'no choice made reads as the hidden path');
  for (const [id, flags, a, b] of [['ship_bram', ['ship_arrived'], 'bram_told', 'bram_spared'], ['vex_gallery', ['lab_f2_arrived'], 'star_restored', 'star_hidden']]) {
    const sets = RUNS[id].filter((r) => ops(r.log, 'choice').length).map((r) => ops(r.log, 'setFlag').map((e) => e.args[0]));
    assert.ok(sets.some((s) => s.includes(a)) && sets.some((s) => s.includes(b)), id);
    assert.ok(sets.every((s) => !(s.includes(a) && s.includes(b))), `${id}: both`);
    void flags;
  }
  // both answers keep the episode going: the next main flags are the same
  for (const c of [0, 1]) {
    const { set } = await playthrough(scenes, [['vex_gallery', [c]]], { flags: [...EP4_DONE, 'lab_f2_arrived'] });
    assert.ok(set.has('vex_gallery_met') && set.has('fifth_list_get'));
  }
});

test("Mira's two boss tips each name a lever the boss's data has (plan 6.6)", async (t) => {
  if (!ENEMIES5 || !SKILLS5) { t.skip('E5-battle data not written yet'); return; }
  const E = ENEMIES5.EP5_ENEMIES, S = SKILLS5.EP5_SKILLS;
  assert.match(TIPS.mirage_knight, /Turn the sky on it/);
  assert.ok(E.mirage_knight && (E.mirage_knight.mirrorTurn === 'mirror_turn' || JSON.stringify(E.mirage_knight).includes('mirror_turn')), 'the Knight turns its shield to the sky');
  assert.ok(S.mirror_turn, 'mirror_turn is a skill');
  assert.match(TIPS.oracle, /turn the sky before it does/);
  assert.equal(S.last_prophecy && S.last_prophecy.foretold, true, 'the Last Prophecy is a foretelling');
  assert.ok(S.turn_sky && S.turn_sky.id === 'turn_sky', 'Turn the Sky exists');
  assert.equal(S.turn_sky.learn && S.turn_sky.learn.flag, 'sky_learned', 'Turn the Sky is learned on sky_learned');
  // the tips are what the scenes say
  assert.ok(allOps('mirage_knight').some((e) => e.op === 'say' && e.args[1] === TIPS.mirage_knight));
  assert.ok(allOps('oracle').some((e) => e.op === 'say' && e.args[1] === TIPS.oracle));
});

test('side stories: Three Roads Home wakes the Moonwell once; the reliquary; Hassan takes three bells and gives one', async () => {
  const play = (order, flags) => playthrough(scenes, order, { flags: [...EP4_DONE, 'haven_arrived', 'moonwell_seen', ...flags] });
  const r = await play(['moonwell', 'roads_start', 'moonwell', 'testimony_yara', 'testimony_nasrin', 'moonwell', 'moonwell'], ['met_sel']);
  assert.ok(r.set.has('roads_started') && r.set.has('testimony_kamal') && r.set.has('moonwell_woken') && r.set.has('roads_done'));
  const gives = Object.values(r.logs).flat(2).filter((e) => e.op === 'give');
  assert.equal(gives.filter((e) => e.args[0] === 'nomad_mantle').length, 1);
  assert.deepEqual(gives.filter((e) => e.args[0] === 'gold').map((e) => e.args[1]), [300]);
  assert.equal(gives.filter((e) => e.args[0] === 'hi_ether').length, 1);
  const early = await play(['moonwell'], ['met_sel', 'roads_started']);
  assert.ok(!early.set.has('moonwell_woken'), 'the Moonwell waits for all three witnesses');
  const rel = await play(['reliquary', 'reliquary'], ['lab_f2_arrived']);
  assert.ok(rel.set.has('reliquary_found'));
  const b = await play(['bells_start', 'bells_done', (s) => ['bell_1_found', 'bell_2_found', 'bell_3_found'].forEach((f) => s.add(f)), 'bells_done', 'bells_done'], []);
  assert.ok(b.set.has('bells_started') && b.set.has('bells_done'));
  const all3 = Object.values(b.logs).flat(2);
  assert.deepEqual(all3.filter((e) => e.op === 'take').map((e) => e.args), [['caravan_bell', 3]]);
  assert.equal(all3.filter((e) => e.op === 'give' && e.args[0] === 'copperwind_bell').length, 1);
  assert.ok(all3.some((e) => e.op === 'say' && /mother's tuning/.test(e.args[1])), 'the Mara seed is said');
});

test('the ban list: no banned word, no em dash, ASCII, LF in every Episode 5 file E5-story writes', () => {
  for (const f of ['src/data/ep5/story.js', 'src/data/ep5/flags.js', 'src/data/ep5/npcs.js', 'src/data/ep5/quests.js',
    'src/data/ep5/text.js', 'src/data/ep5/ledger.js', 'docs/story/STAGING_EP5.md', 'qa/content/ep5_story.test.mjs',
    'qa/content/ep5_data.test.mjs', 'qa/content/ep5_boxes.mjs', 'qa/content/ep5_preview.py']) {
    const txt = readFileSync(join(NEXT, ...f.split('/')), 'utf8');
    assert.ok(!txt.includes(EM), `${f}: em dash`);
    assert.ok(!BANNED.test(txt), `${f}: banned word`);
    assert.ok(/^[\x09\x0a\x20-\x7e]*$/.test(txt), `${f}: non-ASCII or CR`);
  }
  const bible = readFileSync(join(NEXT, 'docs', 'story', 'EPISODE5.md'), 'utf8');
  assert.ok(!bible.includes(EM), 'EPISODE5.md: em dash');
});
