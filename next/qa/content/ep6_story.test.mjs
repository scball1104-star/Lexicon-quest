// Episode 6 story script (E6-story, the lazy ep6 pack): every scene and branch, the cutscene API, ids unique across six
// episodes and the X1, X2, cave and tier packs, flags declared, boxes and budgets, staging, the close-up payoffs (the first
// page in three steps), music cues, the name that arrives late, the two truth choices, the switch, Bram's boss tips against
// E6-battle's data, and a playthrough to ep6_complete. Ids owned by other wave-6 agents (maps, sprites, pages, audio) are
// accepted by their planned ids (docs/EPISODE6_PLAN.md section 2); battle ids are read from E6-battle's modules when they exist.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { scenes, SCENE_CONDITIONS, GATE, MAIN_PATH, BOX_BUDGET, PAYOFFS, TIPS, register as registerScenes } from '../../src/data/ep6/story.js';
import { EP6_FLAGS, register as registerFlags } from '../../src/data/ep6/flags.js';
import { register as registerEp4Flags } from '../../src/data/ep4/flags.js';
import { register as registerEp5Flags } from '../../src/data/ep5/flags.js';
import { register as registerEp4Npcs } from '../../src/data/ep4/npcs.js';
import { register as registerEp5Npcs } from '../../src/data/ep5/npcs.js';
import { EP6_LINES, EPISODE7_CARD, END_TITLE_EP6, END_CARD_EP6, EP6_BOSS_CARDS, EP6_ARC_LINES } from '../../src/data/ep6/text.js';
import { EP6_NPCS, EP6_SPEAKERS, register as registerNpcs } from '../../src/data/ep6/npcs.js';
import { REWARDS_EP6 } from '../../src/data/ep6/quests.js';
import { scenes as EP5_SCENES } from '../../src/data/ep5/story.js';
import { EP5_LINES } from '../../src/data/ep5/text.js';
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
export const EP5_DONE = ['intro_done', 'met_mael', 'mira_joined', 'bram_joined', 'archivore_defeated', 'ep1_complete', 'ep2_started',
  'ep2_complete', 'nh_restored', 'ep3_started', 'pk_restored', 'ep3_complete', 'ep4_started', 'vw_restored', 'ep4_complete',
  'ep5_started', 'haven_arrived', 'met_sel', 'sky_learned', 'chart_restored', 'haven_restored', 'sel_walked_in', 'ep5_complete'];
export const MAIN_FLAGS = ['ep6_started', 'ep6_boarded', 'airstair_arrived', 'airstair_fight_done', 'zephyr_arrived', 'met_aeris',
  'charts_seen', 'anchor_learned', 'windward_pass', 'obs_entered', 'obs_f1_done', 'vex_relay_met', 'engine_defeated', 'obs_f2_done',
  'aeris_came', 'vex_held', 'asker_known', 'pippa_found', 'scribe_door_open', 'scribe_defeated', 'wind_script_restored',
  'fragment6_get', 'compass_restored', 'library_reached', 'first_page_read', 'isles_restored', 'pippa_home', 'ep6_complete'];
const PARTY = ['hero', 'mira', 'bram'];
const MAP_ACTORS = ['scribe'];   // the Storm Scribe's map actor in ep6_obs_eyrie (sprite scribe_avatar, E6-maps-b)
const EP6_MUSIC = ['zephyr', 'storm_observatory', 'boss_scribe', 'saffron'];   // plan 2.7 (saffron rides the ep5 fragment)
const EP6_SFX = ['gust_carry', 'gust_land', 'vane_turn', 'mooring_catch', 'gale_gust', 'anchor_set', 'rewrite_read', 'rewrite_break', 'signal_lamp'];
const EP6_SPRITES = ['npc_aeris', 'npc_aeris_young', 'npc_liora', 'npc_bennet', 'npc_suri', 'npc_ilex', 'npc_nova', 'npc_piri', 'npc_thea', 'npc_pippa',
  'npc_deckhand', 'npc_vex', 'npc_yara', 'storm_harrier'];
const PAGE_IDS = ['ep6_slip', 'ep6_manifest', 'ep6_letter', 'ep6_page'];
const TINTS = ['none', 'dawn', 'dusk', 'night'];
const KNOWN = (f) => f in FLAGS || f === 'tier_1';   // tier_1: the Fine Print pack's flag (src/data/tier)

// E6-battle's modules, when they exist (the encounter and item ids then come from them; otherwise the plan's).
const battleMod = async (name) => (existsSync(join(NEXT, 'src', 'data', 'ep6', `${name}.js`)) ? import(`../../src/data/ep6/${name}.js`) : null);
const ENC6 = await battleMod('encounters');
const ITEMS6 = await battleMod('items');
const ENEMIES6 = await battleMod('enemies');
const SKILLS6 = await battleMod('skills');
const ENCOUNTER_IDS = ENC6 && ENC6.EP6_GROUP_IDS ? [...ENC6.EP6_GROUP_IDS, ...ENC6.EP6_BOSS_IDS] : ['e6a_first', 'gale_engine', 'scribe'];
const ITEM_IDS = ITEMS6 && ITEMS6.EP6_KEY_ITEMS ? Object.keys({ ...ITEMS6.EP6_CONSUMABLES, ...ITEMS6.EP6_KEY_ITEMS, ...ITEMS6.EP6_UNIQUES })
  : ['boarding_slip', 'liora_letter', 'windward_pass', 'sky_compass', 'sixth_list', 'name_fragment_6', 'kestrel_wings', 'quiet_chime',
    'skyhand_coat', 'dead_letter', 'silver_ribbon', 'white_road_letter'];
const CORE_ITEMS = ['hi_ether', 'hi_potion'];

registerEp4Flags();
registerEp5Flags();
registerFlags();
registerEp4Npcs();
registerEp5Npcs();
registerNpcs();
GATE.live = true;
const RUNS = {};
for (const [id, fn] of Object.entries(scenes)) RUNS[id] = await explore(fn, { flags: ['mira_joined', 'bram_joined'] });
const allOps = (id) => RUNS[id].flatMap((r) => r.log);
const ops = (log, op) => log.filter((e) => e.op === op);
const musics = (log) => ops(log, 'music').map((e) => e.args[0]);
const says = (log) => ops(log, 'say');
const one = async (id, flags, o = {}) => (await runOnce(scenes[id], { flags: [...EP5_DONE, ...flags], branchFlags: false, ...o })).log;

test('scene and line ids are new across Episodes 1 to 5 and the X1, X2, cave and tier packs', async () => {
  const STORY = await import('../../src/game/story.js');
  for (const mod of ['../../src/data/x1/index.js', '../../src/data/x2/index.js', '../../src/data/cave/story.js', '../../src/data/tier/index.js']) {
    try { const m = await import(mod); await (m.register || m.default)(); } catch (e) { /* a pack that cannot load in node registers nothing */ }
  }
  for (const id of Object.keys(scenes)) {
    for (const t of [EP1_SCENES, EP2_SCENES, EP3_SCENES, EP4_SCENES, EP5_SCENES]) assert.ok(!(id in t), `scene ${id} exists in Episodes 1 to 5`);
    assert.ok(!(id in STORY.SCENES), `scene ${id} is already registered`);
    assert.ok(!/^(ep[1-5]_|f[1-3]_|fo[1-3]_|sr_|pk_|oath_|vow_|foundry_|sand_|principle_|regent_|lyra_|landing_|sel_memory_|sky_|star_[1-3]_read|orrery|updraft)/.test(id), `prefix ${id}`);
  }
  for (const id of Object.keys(EP6_LINES)) {
    for (const t of [EP1_LINES, EP2_LINES, EP3_LINES, EP4_LINES, EP5_LINES]) assert.ok(!(id in t), `line ${id} exists in Episodes 1 to 5`);
    assert.ok(!(id in STORY.LINES), `line ${id} is already registered`);
  }
  const out = registerScenes();
  assert.deepEqual(out, { scenes: [], lines: [], conditions: [] });
  assert.deepEqual(registerScenes(), { scenes: [], lines: [], conditions: [] }, 'registering twice collides with nothing');
  for (const id of Object.keys(scenes)) assert.equal(STORY.SCENES[id], scenes[id]);
  const n = Object.keys(scenes).length;
  assert.ok(n >= 30 && n < 40, `built scenes: ${n} (EPISODE6 section 7: under 40)`);
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

test('scene conditions exist for every scene, use declared flags, and only ep6_morning needs the switch', () => {
  for (const id of Object.keys(scenes)) assert.ok(SCENE_CONDITIONS[id], `condition for ${id}`);
  for (const [id, c] of Object.entries(SCENE_CONDITIONS)) {
    for (const f of [c.if, c.ifNot].flat().filter(Boolean)) assert.ok(KNOWN(f), `${id}: undeclared ${f}`);
    assert.equal(!!c.live, id === 'ep6_morning', `${id}: live`);
  }
  assert.ok([SCENE_CONDITIONS.ep6_morning.ifNot].flat().includes('tier_1'));
  assert.ok([SCENE_CONDITIONS.ep6_morning.if].flat().includes('ep5_complete'));
  // every other scene needs a flag only an Episode 6 scene sets
  for (const [id, c] of Object.entries(SCENE_CONDITIONS)) {
    if (id === 'ep6_morning') continue;
    assert.ok([c.if].flat().filter(Boolean).some((f) => f in EP6_FLAGS), `${id}: guarded by an Episode 6 flag`);
  }
});

test('every flag a scene sets or checks is declared; every main flag is set by a scene', () => {
  const set = new Set();
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) {
    if (e.op === 'setFlag') { set.add(e.args[0]); assert.ok(e.args[0] in EP6_FLAGS, `${id}: setFlag ${e.args[0]} is not an Episode 6 flag`); }
    if (e.op === 'hasFlag') assert.ok(KNOWN(e.args[0]), `${id}: hasFlag ${e.args[0]}`);
  }
  for (const f of MAIN_FLAGS) assert.ok(set.has(f), `no scene sets ${f}`);
});

test('every id a scene references exists or is a planned Episode 6 id', () => {
  const manifest = JSON.parse(read(join(NEXT, 'assets', 'audio', 'manifest.json')));
  const speakers = new Set([...PARTY, ...Object.keys(NPCS), ...Object.keys(EP6_NPCS), ...Object.keys(SPEAKER_NAMES), ...Object.keys(EP6_SPEAKERS), ...MAP_ACTORS]);
  for (const id of Object.keys(RUNS)) {
    const spawned = new Set();
    for (const e of allOps(id)) {
      const a = e.args;
      switch (e.op) {
        case 'spawn': spawned.add(a[0]); assert.ok(a[1] && a[1].sprite && a[1].name && a[1].at, `${id}: spawn ${a[0]} needs sprite, name, at`);
          assert.ok(EP6_SPRITES.includes(a[1].sprite), `${id}: sprite ${a[1].sprite}`);
          assert.notEqual(a[0], 'vex', `${id}: Vex is vex_k, never the in-glass id`); break;
        case 'say': if (a[0] != null) assert.ok(speakers.has(a[0]) || spawned.has(a[0]), `${id}: speaker ${a[0]}`); break;
        case 'emote': assert.ok(EMOTES.includes(a[1]), `${id}: emote ${a[1]}`); break;
        case 'face': assert.ok(DIRS.includes(a[1]) || speakers.has(a[1]) || spawned.has(a[1]), `${id}: face ${a[1]}`); break;
        case 'music': assert.ok(a[0] === null || a[0] in manifest.music || EP6_MUSIC.includes(a[0]), `${id}: music ${a[0]}`); break;
        case 'sfx': assert.ok(a[0] in manifest.sfx || EP6_SFX.includes(a[0]), `${id}: sfx ${a[0]}`); break;
        case 'tint': assert.ok(TINTS.includes(a[0]), `${id}: tint ${a[0]}`); break;
        case 'battle': assert.ok(ENCOUNTER_IDS.includes(a[0]), `${id}: battle ${a[0]}`); break;
        case 'give': case 'take': assert.ok(a[0] === 'gold' || ITEM_IDS.includes(a[0]) || CORE_ITEMS.includes(a[0]), `${id}: item ${a[0]}`); break;
        case 'closeup': assert.ok(a[0] === null || PAGE_IDS.includes(a[0]), `${id}: closeup ${a[0]}`); break;
        default:
      }
    }
  }
  for (const [k, r] of Object.entries(REWARDS_EP6)) assert.ok(ITEM_IDS.includes(r.item) || CORE_ITEMS.includes(r.item), `reward ${k}: ${r.item}`);
});

test('every box fits: 3 lines of 42 characters with an 8-letter hero name; choices fit; ASCII; titles and cards fit', () => {
  const bad = [];
  const ascii = (s) => /^[\x20-\x7e]*$/.test(s);
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) {
    const text = e.op === 'say' ? e.args[1] : e.op === 'title' ? e.args[0] : null;
    if (text != null && !fits(text)) bad.push(`${id}: ${boxLines(text).join(' / ')}`);
    if (text != null && !ascii(text)) bad.push(`${id}: non-ASCII ${text}`);
    if (text != null && text.includes(EM)) bad.push(`${id}: em dash`);
    if (e.op === 'title' && (text.length > 42 || (e.args[1]?.sub && e.args[1].sub.length > 42))) bad.push(`${id}: title over 42`);
    if (e.op === 'choice') for (const o of e.args[0]) if (o.length > 28 || !ascii(o)) bad.push(`${id} choice: ${o}`);
  }
  assert.deepEqual(bad, []);
  for (const c of [EPISODE7_CARD, END_TITLE_EP6, END_CARD_EP6]) assert.ok(c.text.length <= 42 && c.sub.length <= 42, c.text);
  assert.deepEqual([END_TITLE_EP6.text, END_TITLE_EP6.sub], ['End of Episode 6', 'Words on the Wind']);
  assert.deepEqual([EPISODE7_CARD.text, EPISODE7_CARD.sub], ['Episode 7: The Vanishing World', 'The other half of the page lies north.']);
  assert.deepEqual([END_CARD_EP6.text, END_CARD_EP6.sub], ['To be continued', 'Episode 7 is not playable yet.']);
});

// The late name: Pippa only from fifth_voice, on Mira's reading of the letter; the swap is on that beat.
test('nobody says Pippa before Mira reads it in fifth_voice; apprentice_v becomes pippa_t on the same mark, on one beat', () => {
  const reveal = (e) => e.op === 'say' && e.args[1] === 'Pippa. Pippa Voss.';
  const late = ['fifth_voice', 'scribe', 'scribe_after', 'cloud_library', 'isles_return', 'ep6_ending'];
  for (const id of Object.keys(RUNS)) for (const r of RUNS[id]) {
    let named = late.indexOf(id) > 0;   // scenes after fifth_voice in the story may say it
    for (const e of r.log) {
      if (reveal(e)) named = true;
      if (e.op === 'spawn') assert.ok(named || !/Pippa/.test(e.args[1].name), `${id}: spawn named ${e.args[1].name} early`);
      if (e.op === 'say' && /\bPippa\b/.test(e.args[1])) assert.ok(named, `${id}: "${e.args[1]}" before the reveal`);
    }
  }
  const log = RUNS.fifth_voice.find((r) => ops(r.log, 'choice').length).log;
  const at = log.findIndex(reveal);
  const despawn = log.findIndex((e) => e.op === 'despawn' && e.args[0] === 'apprentice_v');
  const spawn = log.findIndex((e) => e.op === 'spawn' && e.args[0] === 'pippa_t');
  assert.ok(at > 0 && despawn === at + 1 && spawn === despawn + 1, 'apprentice_v becomes pippa_t on the beat Mira reads the name');
  assert.equal(log[spawn].args[1].name, 'Pippa');
  assert.equal(log[spawn].args[1].at, ops(log, 'spawn').find((e) => e.args[0] === 'apprentice_v').args[1].at);
  assert.equal(SPEAKER_NAMES.apprentice_v, 'The Signal Apprentice');
  assert.equal(SPEAKER_NAMES.pippa_t, 'Pippa');
  assert.equal(SPEAKER_NAMES.scribe, 'The Scribe');
  // the memories and the pledges tag her "The Signal Apprentice"
  for (const id of ['aeris_memory_1', 'pledge_anchor', 'pledge_listen', 'pledge_return']) {
    assert.ok(allOps(id).some((e) => e.op === 'say' && e.args[0] === 'apprentice_v'), id);
  }
});

test('the hero never speaks; Bram learns Anchor on its flag; the Scribe speaks in capitals', async () => {
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) if (e.op === 'say') assert.notEqual(e.args[0], 'hero', `${id}: the hero speaks`);
  const al = await one('anchor_lesson', ['charts_seen']);
  const learnAt = al.findIndex((e) => e.op === 'say' && /learned Anchor/.test(e.args[1]));
  const flagAt = al.findIndex((e) => e.op === 'setFlag' && e.args[0] === 'anchor_learned');
  assert.ok(flagAt >= 0 && learnAt > flagAt, 'anchor_learned is set before the learn line');
  assert.match(al[learnAt].args[1], /The party holds through the next gust, and the wind carries them on\./);
  // Bram catches Mira before anyone speaks of it (his hands, not his mouth)
  const caught = al.findIndex((e) => e.op === 'walk' && e.args[0] === 'bram' && e.args[1] === 'bram_spear');
  const firstBram = al.findIndex((e) => e.op === 'say' && e.args[0] === 'bram');
  assert.ok(caught > 0 && caught < firstBram, 'Bram holds first, speaks after');
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) {
    if (e.op === 'say' && (e.args[0] === 'scribe' || e.args[0] === 'scribe_v')) assert.equal(e.args[1], e.args[1].toUpperCase(), `${id}: the Scribe in capitals`);
  }
});

// The staging rule (CRITIQUE_6 item 11): the party is on its marks before the first line of anyone outside it.
const STAGED = ['ep6_board', 'airstair_foot', 'first_gust', 'zephyr_arrival', 'liora_dock', 'meet_aeris', 'chart_room', 'anchor_lesson',
  'east_gate', 'aeris_memory_1', 'aeris_memory_2', 'vex_relay', 'gale_engine', 'obs_f3_arrival', 'pledge_anchor', 'pledge_listen',
  'pledge_return', 'vex_falls', 'fifth_voice', 'scribe', 'cloud_library', 'isles_return', 'beacon_light'];   // scribe_after: staged by scribe
const REVISIT = ['engine_tried', 'scribe_tried', 'obs_f3_arrived', 'beacon_lit'];
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
  // the party never stands on a speaker's own mark
  for (const id of Object.keys(RUNS)) for (const r of RUNS[id]) {
    const spots = new Set(ops(r.log, 'spawn').map((e) => e.args[1].at));
    for (const w of ops(r.log, 'walk')) if (PARTY.includes(w.args[0])) assert.ok(!spots.has(w.args[1]), `${id}: ${w.args[0]} walks onto ${w.args[1]}`);
  }
  // Vex: opaque (vex_k), working with his back to the party at the relay, and the party two rows below on its own marks
  for (const [id, stop] of [['vex_relay', 'party_stop'], ['vex_falls', 'party_stop_fall']]) {
    const log = await one(id, id === 'vex_relay' ? ['obs_f2_arrived'] : ['pledge_listen']);
    const vex = ops(log, 'spawn').filter((e) => e.args[0] === 'vex_k');
    assert.ok(vex.length && vex[0].args[1].dir === 'up', `${id}: Vex faces away first`);
    const first = log.findIndex((e) => e.op === 'say');
    assert.ok(log.slice(0, first).some((e) => e.op === 'walk' && e.args[0] === 'hero' && e.args[1] === stop), `${id}: the party stops on ${stop}`);
  }
});

test('STAGING_EP6.md documents every scene, every mark and every inspect line', () => {
  const staging = read(join(NEXT, 'docs', 'story', 'STAGING_EP6.md'));
  const missing = [];
  for (const id of Object.keys(scenes)) if (!staging.includes('`' + id + '`')) missing.push(`scene ${id}`);
  const actors = new Set([...PARTY, ...Object.keys(NPCS), ...Object.keys(EP6_NPCS), ...MAP_ACTORS]);
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) if (e.op === 'spawn') actors.add(e.args[0]);
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) {
    let mark = null;
    if (e.op === 'walk' && typeof e.args[1] === 'string') mark = e.args[1];
    if (e.op === 'camera.panTo') mark = e.args[0];
    if (e.op === 'spawn') mark = e.args[1]?.at;
    if (mark && !actors.has(mark) && !staging.includes('`' + mark + '`')) missing.push(`${id}: mark ${mark}`);
  }
  for (const id of Object.keys(EP6_LINES)) if (!staging.includes('`' + id + '`')) missing.push(`line ${id}`);
  for (const f of ['EP6_LIVE', 'credits5_rolled', 'PAGE_KINDS', 'END_CARD_EP6', 'END_CARD_EP5_LIVE', 'AERIS_AWAY', 's.rope', 'aeris_turns',
    'testimony_suri']) if (!staging.includes(f)) missing.push(f);
  assert.deepEqual([...new Set(missing)], []);
});

// A chained scene's own boxes: count until the chain point.
const ownBoxes = (log, stop) => {
  const i = stop ? log.findIndex(stop) : -1;
  return says(i < 0 ? log : log.slice(0, i)).length;
};
const STOPS = {
  scribe: (e) => e.op === 'battle',
  isles_return: (e) => e.op === 'setFlag' && e.args[0] === 'isles_restored',
};
const CHAINED = ['scribe_after', 'ep6_ending'];
test('box budgets: 12 per main scene (6 morning, 14 anchor, 16 fall, 14 voice, 18 after, 18 library, 14 return), about 200 in all', () => {
  const over = [];
  let total = 0;
  for (const id of [...MAIN_PATH, ...CHAINED]) {
    const cap = BOX_BUDGET[id] ?? BOX_BUDGET.default;
    const most = Math.max(...RUNS[id].map((r) => ownBoxes(r.log, STOPS[id])));
    if (most > cap) over.push(`${id}: ${most} > ${cap}`);
    total += most;
  }
  assert.deepEqual(over, []);
  assert.deepEqual(BOX_BUDGET, { default: 12, ep6_morning: 6, anchor_lesson: 14, vex_falls: 16, fifth_voice: 14, scribe_after: 18,
    cloud_library: 18, isles_return: 14 });
  assert.ok(total >= 150 && total <= 210, `main path boxes: ${total}`);
  console.log(`# Episode 6 main path: ${total} boxes over ${MAIN_PATH.length + CHAINED.length} scenes`);
});

test('the first five minutes: the slip before any line, Bram on four seats, Mira asks, the fight comes fast', async () => {
  const kinds = Object.keys(PAGE_KINDS);
  PAGE_KINDS.ep6_slip = () => ({});
  try {
    const log = await one('ep6_morning', [], { mapId: 'ep5_sh_inn' });
    const opened = log.findIndex((e) => e.op === 'closeup' && e.args[0] === 'ep6_slip');
    assert.ok(opened >= 0 && says(log.slice(0, opened)).length === 1, 'the slip is the second box (one narration of the bird)');
    assert.deepEqual(log[opened].args[1], { mode: 'burned' });
    assert.ok(says(log).length <= 6);
    const fourAt = log.findIndex((e) => e.op === 'say' && e.args[1] === 'Four seats. There are three of us.');
    assert.ok(fourAt > opened && says(log.slice(0, fourAt)).length <= 2, 'Four seats by the third box');
    assert.equal(log.slice(0, fourAt).filter((e) => e.op === 'music').at(-1).args[0], null, 'silence on Four seats');
    assert.ok(ops(log, 'give').some((e) => e.args[0] === 'boarding_slip'));
  } finally { for (const k of Object.keys(PAGE_KINDS)) if (!kinds.includes(k)) delete PAGE_KINDS[k]; }
  const ask = await one('mira_asks', ['airstair_arrived']);
  assert.deepEqual(ops(ask, 'choice')[0].args[0], ['Yes.', 'No.']);
  assert.equal(says(ask.slice(0, ask.findIndex((e) => e.op === 'choice'))).length, 1, 'the question is the first box');
  const foot = await one('airstair_foot', ['ep6_boarded']);
  const board = await one('ep6_board', ['ep6_started']);
  assert.ok(says(foot).length + says(board).length <= 6, 'boarding and the foot of the stack are short');
  const fight = await one('airstair_fight', ['mira_asked']);
  assert.ok(says(fight.slice(0, fight.findIndex((e) => e.op === 'battle'))).length <= 2, 'the fight comes fast');
  assert.deepEqual(ops(fight, 'battle')[0].args.slice(0, 2), ['e6a_first', { canFlee: false }]);
  assert.ok(!says(fight).some((e) => /tutorial|press|button/i.test(e.args[1])), 'no tutorial box');
});

test('the payoffs open their close-up pages when the kinds exist, closed before the field moves; never a page that is missing', async () => {
  const kinds = Object.keys(PAGE_KINDS);
  for (const id of Object.keys(PAYOFFS)) for (const e of allOps(id)) assert.notEqual(e.op, 'closeup', `${id}: closeup with no page kind`);
  for (const k of PAGE_IDS) PAGE_KINDS[k] = () => ({});
  try {
    const STATE = { ep6_morning: [], chart_room: ['met_aeris'], vex_falls: ['pledge_listen'], scribe_after: ['scribe_defeated', 'pippa_found'],
      cloud_library: ['compass_restored'] };
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
    // the first page in three steps (CRITIQUE_7 item 7): "Keep this one." only under `torn`, and the last thing the page says
    const log = await one('cloud_library', ['compass_restored']);
    let mode = null;
    const said = [];
    for (const e of log) {
      if (e.op === 'closeup') mode = e.args[0] ? e.args[1]?.mode : null;
      if (e.op === 'say' && mode) said.push([mode, e.args[1]]);
    }
    const keepAt = said.findIndex(([, t]) => /Keep this one\./.test(t));
    assert.ok(keepAt >= 0 && said[keepAt][0] === 'torn', '"Keep this one." under the torn mode');
    assert.equal(keepAt, said.length - 1, '"Keep this one." is the last line over the page');
    assert.ok(said.some(([md, t]) => md === 'name' && /Your name/.test(t)) && said.some(([md, t]) => md === 'seal' && /counter-seal/.test(t)));
    assert.ok(said.some(([md, t]) => md === 'torn' && /Carried down the White Road by$/.test(t)), 'the torn line');
  } finally { for (const k of Object.keys(PAGE_KINDS)) if (!kinds.includes(k)) delete PAGE_KINDS[k]; }
  // without the pages, the same boxes
  const plain = says(await one('cloud_library', ['compass_restored'])).length;
  for (const k of PAGE_IDS) PAGE_KINDS[k] = () => ({});
  try { assert.equal(says(await one('cloud_library', ['compass_restored'])).length, plain); }
  finally { for (const k of Object.keys(PAGE_KINDS)) if (!kinds.includes(k)) delete PAGE_KINDS[k]; }
});

test('a full playthrough from a finished Episode 5 reaches ep6_complete with every main flag, in order', async () => {
  const give = (...f) => (set) => f.forEach((x) => set.add(x));
  const order = ['ep6_morning', 'ep6_board', 'airstair_foot', 'airstair_fight', (s) => assert.ok(!s.has('airstair_fight_done'), 'the fight waits for Mira'),
    'mira_asks', 'airstair_fight', 'first_gust', 'isles_view', 'zephyr_arrival', 'chart_room', (s) => assert.ok(!s.has('charts_seen'), 'the chart room waits for Aeris'),
    'liora_dock', 'meet_aeris', 'chart_room', 'anchor_lesson', 'east_gate', 'obs_f1_arrival', 'aeris_memory_1', give('compass_key_found'),
    'obs_f1_lift', 'obs_f2_arrival', 'aeris_memory_2', 'vex_relay', 'obs_f2_lift', (s) => assert.ok(!s.has('obs_f2_done'), 'the lift waits for the Engine'),
    'gale_engine', 'obs_f2_lift', 'obs_f3_arrival', 'pledge_listen', (s) => assert.ok(!s.has('pledge_listen'), 'the lamps go in climbing order'),
    'pledge_anchor', 'pledge_listen', 'vex_falls', 'pledge_return', 'fifth_voice', 'scribe', 'cloud_library', 'isles_return'];
  const { set } = await playthrough(scenes, order, { flags: EP5_DONE });
  for (const f of MAIN_FLAGS) assert.ok(set.has(f), `missing ${f}`);
  assert.ok(set.has('mira_told') && !set.has('mira_spared'));
  assert.ok(set.has('told_aeris') && !set.has('kept_from_aeris'));
  // nothing replays
  const again = await playthrough(scenes, MAIN_PATH, { flags: [...set] });
  for (const logs of Object.values(again.logs)) for (const log of logs) assert.ok(!ops(log, 'say').length, 'a main scene replayed');
});

test('the switch: with EP6_LIVE false nothing in Episode 6 is reachable; Fine Print never starts it; Episode 4 alone does not', async () => {
  GATE.live = false;
  try {
    const { set } = await playthrough(scenes, Object.keys(scenes), { flags: EP5_DONE });
    for (const f of Object.keys(EP6_FLAGS)) assert.ok(!set.has(f), `${f} set with the switch off`);
  } finally { GATE.live = true; }
  const fp = await playthrough(scenes, Object.keys(scenes), { flags: [...EP5_DONE, 'tier_1'] });
  for (const f of Object.keys(EP6_FLAGS)) assert.ok(!fp.set.has(f), `${f} set on a Fine Print run`);
  const early = await playthrough(scenes, Object.keys(scenes), { flags: EP5_DONE.filter((f) => f !== 'ep5_complete') });
  for (const f of Object.keys(EP6_FLAGS)) assert.ok(!early.set.has(f), `${f} set before ep5_complete`);
  const ok = await playthrough(scenes, ['ep6_morning'], { flags: EP5_DONE });
  assert.ok(ok.set.has('ep6_started'));
  // the module switch itself is the core one, read through a namespace (EP6_LIVE may not exist yet: then false)
  const EPISODES = await import('../../src/game/episodes.js');
  const fresh = await import(`../../src/data/ep6/story.js?gate=${Date.now()}`);
  assert.equal(fresh.GATE.live, EPISODES.EP6_LIVE === true);
});

// Each map's track (plan 8.2). A scene that changes the music puts its map's track back before it ends.
const SCENE_TRACK = {
  ep6_morning: 'saffron', isles_view: 'high_moor', zephyr_arrival: 'zephyr', chart_room: 'mystery', anchor_lesson: 'zephyr',
  aeris_memory_1: 'storm_observatory', aeris_memory_2: 'storm_observatory', vex_relay: 'storm_observatory',
  gale_engine: 'storm_observatory', vex_falls: 'mystery', fifth_voice: 'mystery', scribe: null, cloud_library: null,
};
test('music cues follow the cue sheet and return to the map track (plan 8.3)', async () => {
  for (const [id, track] of Object.entries(SCENE_TRACK)) for (const r of RUNS[id]) {
    const m = musics(r.log);
    const lost = ops(r.log, 'battle').some((e) => e.args[2] === 'lose');
    if (m.length && !lost) assert.equal(m.at(-1), track, `${id} ends on ${m.at(-1)}`);
  }
  const mus = async (id, flags) => musics(await one(id, flags));
  assert.deepEqual(await mus('ep6_morning', []), [null, 'saffron']);
  assert.deepEqual(await mus('isles_view', ['airstair_arrived']), ['mystery', 'high_moor']);
  assert.deepEqual(await mus('zephyr_arrival', ['airstair_arrived']), [null, 'zephyr']);
  assert.deepEqual(await mus('chart_room', ['met_aeris']), [null, 'mystery']);
  assert.deepEqual(await mus('anchor_lesson', ['charts_seen']), [null, 'zephyr']);
  assert.deepEqual(await mus('aeris_memory_1', ['obs_f1_arrived']), ['sorrow', 'storm_observatory']);
  assert.deepEqual(await mus('vex_relay', ['obs_f2_arrived']), [null, 'mystery', 'storm_observatory']);
  assert.deepEqual(await mus('gale_engine', ['obs_f2_arrived']), [null, 'battle', 'storm_observatory']);
  assert.deepEqual(await mus('vex_falls', ['pledge_listen']), [null, 'mystery']);
  assert.deepEqual(await mus('fifth_voice', ['pledge_return']), [null, 'sorrow', 'mystery']);
  assert.deepEqual(await mus('scribe', ['scribe_door_open']), [null, 'boss_scribe', 'sorrow', 'triumph', 'mystery', null]);
  assert.deepEqual(await mus('cloud_library', ['compass_restored']), [null, 'mystery', 'sorrow', null]);
  assert.deepEqual(await mus('isles_return', ['library_reached']), [null, 'zephyr', null, 'mystery']);
  for (const id of ['mira_asks', 'first_gust', 'pledge_anchor', 'pledge_listen', 'obs_f3_arrival']) {
    assert.deepEqual(await mus(id, ['airstair_arrived', 'aeris_came', 'pledge_anchor', 'obs_f2_done']), [], id);
  }
  // every pledge lamp lights with signal_lamp
  for (const id of ['pledge_anchor', 'pledge_listen', 'pledge_return']) assert.ok(allOps(id).some((e) => e.op === 'sfx' && e.args[0] === 'signal_lamp'), id);
});

test('boss intros: silence, the card, the theme, then the battle; a retry is short; a loss sets nothing after', async () => {
  for (const [id, flags, theme] of [['gale_engine', ['obs_f2_arrived'], 'battle'], ['scribe', ['scribe_door_open'], 'boss_scribe']]) {
    const log = await one(id, flags);
    const at = (op) => log.findIndex((e) => e.op === op);
    assert.equal(log[at('music')].args[0], null);
    assert.equal(log[at('title')].args[0], EP6_BOSS_CARDS[id].name);
    assert.equal(log[at('title')].args[1].sub, EP6_BOSS_CARDS[id].sub);
    assert.ok(at('title') < at('battle'));
    assert.equal(log.slice(at('title'), at('battle')).find((e) => e.op === 'music').args[0], theme);
    assert.ok(says(log).some((e) => e.args[1] === EP6_ARC_LINES[id]), `${id}: the arc line`);
    const tried = id === 'scribe' ? 'scribe_tried' : 'engine_tried';
    const retry = await one(id, [...flags, tried]);
    const before = (l) => says(l.slice(0, l.findIndex((e) => e.op === 'battle'))).length;
    assert.ok(before(retry) < before(log) && before(retry) <= 2, `${id}: retry is short`);
    const lost = RUNS[id].find((r) => ops(r.log, 'battle').some((e) => e.args[2] === 'lose'));
    assert.ok(lost);
    const after = lost.log.slice(lost.log.findIndex((e) => e.op === 'battle'));
    assert.ok(!ops(after, 'setFlag').length && !ops(after, 'say').length, `${id}: a loss sets nothing`);
    assert.deepEqual(ops(log, 'battle')[0].args.slice(0, 2), [id, { boss: true, canFlee: false }]);
  }
});

test('the two truth choices: Mira changes her lines in cloud_library; Aeris one line there, and her gift in isles_return', async () => {
  const lines = async (id, base, f) => says(await one(id, [...base, f])).map((e) => e.args[1]);
  const diff = (x, y) => x.filter((t, i) => t !== y[i]).length;
  const base = ['compass_restored'];
  const told = await lines('cloud_library', base, 'mira_told'), spared = await lines('cloud_library', base, 'mira_spared');
  assert.equal(told.length, spared.length);
  assert.equal(diff(told, spared), 2, "Mira's exchange (two boxes, the bible's) differs, nothing else");
  const ta = await lines('cloud_library', base, 'told_aeris'), ka = await lines('cloud_library', base, 'kept_from_aeris');
  assert.equal(diff(ta, ka), 1, "one Aeris line differs");
  const gift = (log) => ops(log, 'give').map((e) => e.args[0]).filter((x) => x === 'kestrel_wings' || x === 'quiet_chime');
  assert.deepEqual(gift(await one('isles_return', ['library_reached', 'told_aeris'])), ['kestrel_wings']);
  assert.deepEqual(gift(await one('isles_return', ['library_reached', 'kept_from_aeris'])), ['quiet_chime']);
  assert.deepEqual(gift(await one('isles_return', ['library_reached'])), ['quiet_chime'], 'no choice made reads as the hidden path');
  const r1 = says(await one('isles_return', ['library_reached', 'told_aeris'])).map((e) => e.args[1]);
  const r2 = says(await one('isles_return', ['library_reached', 'kept_from_aeris'])).map((e) => e.args[1]);
  assert.deepEqual(r1, r2, 'isles_return differs only by the gift');
  for (const [id, a, b] of [['mira_asks', 'mira_told', 'mira_spared'], ['fifth_voice', 'told_aeris', 'kept_from_aeris']]) {
    const sets = RUNS[id].filter((r) => ops(r.log, 'choice').length).map((r) => ops(r.log, 'setFlag').map((e) => e.args[0]));
    assert.ok(sets.some((s) => s.includes(a)) && sets.some((s) => s.includes(b)), id);
    assert.ok(sets.every((s) => !(s.includes(a) && s.includes(b))), `${id}: both`);
  }
  // both answers keep the episode going: the next main flags are the same
  for (const c of [0, 1]) {
    const { set } = await playthrough(scenes, [['fifth_voice', [c]]], { flags: [...EP5_DONE, 'pledge_return'] });
    assert.ok(set.has('pippa_found') && set.has('scribe_door_open'));
    const a = await playthrough(scenes, [['mira_asks', [c]]], { flags: [...EP5_DONE, 'airstair_arrived'] });
    assert.ok(a.set.has('mira_asked'));
  }
});

// PLAYTEST_REVIEW_6 item 8 must not recur: each tip names a lever E6-battle's data has.
test("Bram's two boss tips each name a lever the boss's data has (plan 6.6)", async (t) => {
  assert.equal(TIPS.gale_engine, 'When it winds the bellows, I anchor us. Keep me standing.');
  assert.equal(TIPS.scribe, 'When it rewrites the course, I anchor us. Keep me standing.');
  assert.ok(allOps('gale_engine').some((e) => e.op === 'say' && e.args[0] === 'bram' && e.args[1] === TIPS.gale_engine));
  assert.ok(allOps('scribe').some((e) => e.op === 'say' && e.args[0] === 'bram' && e.args[1] === TIPS.scribe));
  if (!ENEMIES6 || !SKILLS6 || !ENEMIES6.EP6_ENEMIES || !SKILLS6.EP6_SKILLS) { t.skip('E6-battle data not written yet'); return; }
  const E = ENEMIES6.EP6_ENEMIES, S = SKILLS6.EP6_SKILLS;
  const AI6 = await battleMod('ai');
  // a boss uses a move when its data lists it, or its ai script (EP6_SCRIPTS[boss.ai]) pins it
  const uses = (boss, skill) => JSON.stringify(boss).includes(skill)
    || !!(AI6 && AI6.EP6_SCRIPTS && boss.ai && Object.values(AI6.EP6_SCRIPTS[boss.ai] || {}).map(String).join(' ').includes(`'${skill}'`));
  // "When it winds the bellows, I anchor us": the Engine's full_blast is a rewrite, pinned to the Gust, and the Engine has it
  assert.ok(S.full_blast && S.full_blast.rewrite === true, 'full_blast carries the rewrite flag');
  assert.ok(E.gale_engine && uses(E.gale_engine, 'full_blast'), 'the Engine uses full_blast');
  // "When it rewrites the course, I anchor us": the Scribe's rewrite_course carries the flag
  assert.ok(S.rewrite_course && S.rewrite_course.rewrite === true, 'rewrite_course carries the rewrite flag');
  assert.ok(E.scribe && uses(E.scribe, 'rewrite_course'), 'the Scribe uses rewrite_course');
  // "I anchor us": Anchor exists, is Bram's, and is learned in anchor_lesson
  assert.ok(S.anchor_line && S.anchor_line.user === 'bram' && S.anchor_line.name === 'Anchor', 'anchor_line is Bram\'s Anchor');
  assert.equal(S.anchor_line.learn && S.anchor_line.learn.flag, 'anchor_learned');
  assert.equal(S.anchor_line.target || 'none', 'none', 'Anchor targets none (the menu path, plan 6.3)');
});

test('side stories: the beacon lights once after three witnesses; the locker; Piri takes three letters and gives two things', async () => {
  const play = (order, flags) => playthrough(scenes, order, { flags: [...EP5_DONE, 'zephyr_arrived', 'liora_met', ...flags] });
  const r = await play(['beacon_light', 'beacon_start', 'beacon_light', 'testimony_liora', 'testimony_bennet', 'beacon_light', 'beacon_light'], ['charts_seen']);
  assert.ok(r.set.has('beacon_started') && r.set.has('testimony_suri') && r.set.has('beacon_lit') && r.set.has('beacon_done'));
  const gives = Object.values(r.logs).flat(2).filter((e) => e.op === 'give');
  assert.equal(gives.filter((e) => e.args[0] === 'skyhand_coat').length, 1);
  assert.deepEqual(gives.filter((e) => e.args[0] === 'gold').map((e) => e.args[1]), [350]);
  assert.deepEqual(gives.filter((e) => e.args[0] === 'hi_potion' || e.args[0] === 'hi_ether').map((e) => e.args), [['hi_potion', 2], ['hi_ether', 2]]);
  const early = await play(['beacon_start', 'beacon_light'], ['charts_seen']);
  assert.ok(!early.set.has('beacon_lit'), 'the beacon waits for all three witnesses');
  const lk = await play(['locker', 'locker'], ['obs_f2_arrived']);
  assert.ok(lk.set.has('locker_found'));
  assert.equal(Object.values(lk.logs).flat(2).filter((e) => e.op === 'say').length, 3, 'the locker: two boxes, then one');
  const p = await play(['letters_start', 'letters_done', (s) => ['letter_1_found', 'letter_2_found', 'letter_3_found'].forEach((f) => s.add(f)),
    'letters_done', 'letters_done'], []);
  assert.ok(p.set.has('letters_started') && p.set.has('letters_done') && p.set.has('white_road_letter_get'));
  const all3 = Object.values(p.logs).flat(2);
  assert.deepEqual(all3.filter((e) => e.op === 'take').map((e) => e.args), [['dead_letter', 3]]);
  assert.deepEqual(all3.filter((e) => e.op === 'give').map((e) => e.args[0]), ['silver_ribbon', 'white_road_letter']);
  assert.ok(all3.some((e) => e.op === 'say' && /Nobody flies to Willowmere/.test(e.args[1])), 'the White Road seed is said');
  assert.ok(!all3.some((e) => e.op === 'say' && /Tess|father/i.test(e.args[1])), 'the letter is never opened');
});

test('the ban list: no banned word, no em dash, ASCII, LF in every Episode 6 file E6-story writes', () => {
  for (const f of ['src/data/ep6/story.js', 'src/data/ep6/flags.js', 'src/data/ep6/npcs.js', 'src/data/ep6/quests.js',
    'src/data/ep6/text.js', 'src/data/ep6/ledger.js', 'docs/story/STAGING_EP6.md', 'qa/content/ep6_story.test.mjs',
    'qa/content/ep6_data.test.mjs', 'qa/content/ep6_boxes.mjs', 'qa/content/ep6_preview.py']) {
    const txt = readFileSync(join(NEXT, ...f.split('/')), 'utf8');
    assert.ok(!txt.includes(EM), `${f}: em dash`);
    assert.ok(!BANNED.test(txt), `${f}: banned word`);
    assert.ok(/^[\x09\x0a\x20-\x7e]*$/.test(txt), `${f}: non-ASCII or CR`);
  }
  const bible = readFileSync(join(NEXT, 'docs', 'story', 'EPISODE6.md'), 'utf8');
  assert.ok(!bible.includes(EM), 'EPISODE6.md: em dash');
  assert.ok(!bible.includes('\r'), 'EPISODE6.md: LF only');
});

// vex_falls: the line over nothing. The party never leaves its stop, Vex is held before he answers, and no joke while he hangs.
test('vex_falls: Bram holds before Vex answers; the letter is the page; the asker and Vex\'s age are said once', async () => {
  const log = await one('vex_falls', ['pledge_listen']);
  const hang = log.findIndex((e) => e.op === 'spawn' && e.args[0] === 'vex_k' && e.args[1].at === 'vex_hang');
  const line = log.findIndex((e) => e.op === 'walk' && e.args[0] === 'bram' && e.args[1] === 'bram_line');
  const up = log.findIndex((e, i) => i > hang && e.op === 'spawn' && e.args[0] === 'vex_k' && e.args[1].at === 'vex_edge');
  assert.ok(hang > 0 && line > hang && up > line, 'torn off, held, pulled up');
  const hanging = says(log.slice(hang, up)).map((e) => e.args[1]);
  assert.ok(hanging.length <= 2 && !hanging.some((t) => /Fine\.$|Lovely|joke/i.test(t) && t !== 'You want to know who asked. Fine. Pull me up first.'));
  assert.ok(says(log).some((e) => e.args[0] === 'vex_k' && /A Keeper wrote that/.test(e.args[1])));
  assert.ok(says(log).some((e) => e.args[0] === 'vex_k' && /I was fourteen/.test(e.args[1])));
  assert.ok(ops(log, 'walk').filter((e) => PARTY.includes(e.args[0]) && e.args[0] !== 'bram').every((e) => /^party_stop_fall/.test(e.args[1])),
    'the hero and Mira stay on their stop');
});
