// Episode 7 story script (E7-story, the lazy ep7 pack): every scene and branch, the cutscene API, ids unique across seven
// episodes and the X1, X2, cave and tier packs, flags declared, boxes and budgets, staging, the close-up payoffs (the whole page
// in three steps, the signature last), music cues, the two names that arrive late, the two truth choices, the switch, Mira's
// boss tips against E7-battle's data, the first five minutes, and a playthrough to ep7_complete. Ids owned by other wave-7
// agents (maps, sprites, pages, audio, helpers) are accepted by their planned ids (docs/EPISODE7_PLAN.md section 2); battle
// ids are read from E7-battle's modules when they exist.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { scenes, SCENE_CONDITIONS, GATE, MAIN_PATH, BOX_BUDGET, PAYOFFS, TIPS, SIDE, SILENT, CHARTS_STAGE, register as registerScenes }
  from '../../src/data/ep7/story.js';
import { EP7_FLAGS, register as registerFlags } from '../../src/data/ep7/flags.js';
import { register as registerEp4Flags } from '../../src/data/ep4/flags.js';
import { register as registerEp5Flags } from '../../src/data/ep5/flags.js';
import { register as registerEp6Flags } from '../../src/data/ep6/flags.js';
import { register as registerEp4Npcs } from '../../src/data/ep4/npcs.js';
import { register as registerEp5Npcs } from '../../src/data/ep5/npcs.js';
import { register as registerEp6Npcs } from '../../src/data/ep6/npcs.js';
import { EP7_LINES, EP7_STONES, EPISODE8_CARD, END_TITLE_EP7, END_CARD_EP7, EP7_BOSS_CARDS, EP7_ARC_LINES } from '../../src/data/ep7/text.js';
import { EP7_NPCS, EP7_SPEAKERS, register as registerNpcs } from '../../src/data/ep7/npcs.js';
import { REWARDS_EP7 } from '../../src/data/ep7/quests.js';
import { scenes as EP6_SCENES } from '../../src/data/ep6/story.js';
import { EP6_LINES } from '../../src/data/ep6/text.js';
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
export const EP6_DONE = ['intro_done', 'met_mael', 'mira_joined', 'bram_joined', 'archivore_defeated', 'ep1_complete', 'ep2_started',
  'ep2_complete', 'nh_restored', 'ep3_started', 'pk_restored', 'ep3_complete', 'ep4_started', 'vw_restored', 'ep4_complete',
  'ep5_started', 'haven_restored', 'ep5_complete', 'ep6_started', 'zephyr_arrived', 'compass_restored', 'isles_restored', 'ep6_complete'];
export const MAIN_FLAGS = ['ep7_started', 'ep7_boarded', 'road_arrived', 'vex_carved', 'road_fight_done', 'call_learned', 'saw_sevens',
  'saw_palehaven', 'palehaven_arrived', 'met_keeper', 'keeper_told', 'vault_open', 'vault_entered', 'vault_f1_done', 'bell_found',
  'lantern_defeated', 'vault_f2_done', 'keeper_came', 'stillheart_open', 'phantom_defeated', 'stillheart_restored', 'fragment7_get',
  'seventh_list_get', 'page_whole', 'nox_named', 'marten_named', 'doors_reopened', 'letter_sent', 'vex_name_whole', 'ep7_complete'];
const PARTY = ['hero', 'mira', 'bram'];
const MAP_ACTORS = ['white_phantom'];   // the Phantom's map actor in ep7_stillheart (sprite phantom_avatar, E7-maps-b)
const EP7_MUSIC = ['palehaven', 'frostbound_vault', 'boss_phantom', 'zephyr'];   // plan 2.7 (zephyr rides the ep6 fragment)
const EP7_SFX = ['stone_hold', 'stone_letgo', 'frost_seal', 'rime_bite', 'rime_freeze', 'call_cast', 'farewell_read', 'farewell_break'];
const EP7_SPRITES = ['npc_aeris', 'npc_vex', 'npc_vex_kneel', 'npc_keeper', 'npc_keeper_young', 'npc_keeper_mid', 'npc_keeper_mother',
  'npc_courier_m', 'rime_wolf'];
const PAGE_IDS = ['ep7_chart', 'ep7_carving', 'ep7_tally', 'ep7_tag', 'ep7_seventh', 'ep7_page', 'ep7_letter'];
const TINTS = ['none', 'dawn', 'dusk', 'night', 'whiteout'];   // whiteout: the pack tint (E7-world, plan 5.2)
const KNOWN = (f) => f in FLAGS || f === 'tier_1';   // tier_1: the Fine Print pack's flag (src/data/tier)

// E7-battle's modules, when they exist (the encounter and item ids then come from them; otherwise the plan's).
const battleMod = async (name) => (existsSync(join(NEXT, 'src', 'data', 'ep7', `${name}.js`)) ? import(`../../src/data/ep7/${name}.js`) : null);
const ENC7 = await battleMod('encounters');
const ITEMS7 = await battleMod('items');
const ENEMIES7 = await battleMod('enemies');
const SKILLS7 = await battleMod('skills');
const ENCOUNTER_IDS = ENC7 && ENC7.EP7_GROUP_IDS ? [...ENC7.EP7_GROUP_IDS, ...(ENC7.EP7_BOSS_IDS || [])] : ['e7w_first', 'pale_lantern', 'white_phantom'];
const ITEM_IDS = ITEMS7 && ITEMS7.EP7_KEY_ITEMS ? Object.keys({ ...ITEMS7.EP7_CONSUMABLES, ...ITEMS7.EP7_KEY_ITEMS, ...ITEMS7.EP7_UNIQUES })
  : ['valewyn_list', 'stillheart_key', 'seventh_list', 'name_fragment_7', 'witness_page', 'street_plaque', 'ember_tea', 'open_gate', 'kept_lamp',
    'winterwatch_coat', 'snowrest_scarf'];
const CORE_ITEMS = ['hi_ether', 'hi_potion', 'white_road_letter'];   // white_road_letter: Episode 6's item (plan 2.3)

registerEp4Flags();
registerEp5Flags();
registerEp6Flags();
registerFlags();
registerEp4Npcs();
registerEp5Npcs();
registerEp6Npcs();
registerNpcs();
GATE.live = true;
const RUNS = {};
for (const [id, fn] of Object.entries(scenes)) RUNS[id] = await explore(fn, { flags: ['mira_joined', 'bram_joined'] });
const allOps = (id) => RUNS[id].flatMap((r) => r.log);
const ops = (log, op) => log.filter((e) => e.op === op);
const musics = (log) => ops(log, 'music').map((e) => e.args[0]);
const says = (log) => ops(log, 'say');
const one = async (id, flags, o = {}) => (await runOnce(scenes[id], { flags: [...EP6_DONE, ...flags], branchFlags: false, ...o })).log;
/** Run a scene with the pack cutscene helpers present (E7-scene-ui): frostBlot, frostNames, actorAlpha, openingTint. */
const HELPERS = ['frostBlot', 'frostNames', 'actorAlpha', 'openingTint'];
const withHelpers = (fn) => (s) => fn(new Proxy(s, {
  has: (t, k) => HELPERS.includes(k) || k in t,
  get: (t, k) => (HELPERS.includes(k) ? async (...a) => { await t.sfx(`helper:${k}`); return a; } : t[k]),
}));
const withPages = async (fn) => {
  const kinds = Object.keys(PAGE_KINDS);
  for (const k of PAGE_IDS) PAGE_KINDS[k] = () => ({});
  try { return await fn(); } finally { for (const k of Object.keys(PAGE_KINDS)) if (!kinds.includes(k)) delete PAGE_KINDS[k]; }
};

test('scene and line ids are new across Episodes 1 to 6 and the X1, X2, cave and tier packs; 36 registered, twice is clean', async () => {
  const STORY = await import('../../src/game/story.js');
  for (const mod of ['../../src/data/x1/index.js', '../../src/data/x2/index.js', '../../src/data/cave/story.js', '../../src/data/tier/index.js']) {
    try { const m = await import(mod); await (m.register || m.default)(); } catch (e) { /* a pack that cannot load in node registers nothing */ }
  }
  for (const id of Object.keys(scenes)) {
    for (const t of [EP1_SCENES, EP2_SCENES, EP3_SCENES, EP4_SCENES, EP5_SCENES, EP6_SCENES]) assert.ok(!(id in t), `scene ${id} exists in Episodes 1 to 6`);
    assert.ok(!(id in STORY.SCENES), `scene ${id} is already registered`);
    assert.ok(!/^(ep[1-6]_|f[1-3]_|fo[1-3]_|sr_|pk_|oath_|vow_|foundry_|sand_|principle_|regent_|lyra_|landing_|sel_memory_|sky_|aeris_memory_|pledge_|star_|orrery|updraft|testimony_(liora|bennet|suri|kamal))/.test(id), `prefix ${id}`);
  }
  for (const id of Object.keys(EP7_LINES)) {
    for (const t of [EP1_LINES, EP2_LINES, EP3_LINES, EP4_LINES, EP5_LINES, EP6_LINES]) assert.ok(!(id in t), `line ${id} exists in Episodes 1 to 6`);
    assert.ok(!(id in STORY.LINES), `line ${id} is already registered`);
  }
  const out = registerScenes();
  assert.deepEqual(out, { scenes: [], lines: [], conditions: [] });
  assert.deepEqual(registerScenes(), { scenes: [], lines: [], conditions: [] }, 'registering twice collides with nothing');
  for (const id of Object.keys(scenes)) assert.equal(STORY.SCENES[id], scenes[id]);
  const n = Object.keys(scenes).length;
  assert.equal(n, 36, `built scenes: ${n} (plan 2.5: 27 main and chained, 7 side, 2 silent)`);
  assert.equal(SIDE.length, 7);
  assert.equal(SILENT.length, 2);
  assert.equal(n - SIDE.length - SILENT.length, 27);
  for (const id of [...SIDE, ...SILENT]) assert.ok(scenes[id], id);
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

test('scene conditions exist for every scene, use declared flags, and only ep7_morning needs the switch', () => {
  for (const id of Object.keys(scenes)) assert.ok(SCENE_CONDITIONS[id], `condition for ${id}`);
  for (const [id, c] of Object.entries(SCENE_CONDITIONS)) {
    for (const f of [c.if, c.ifNot].flat().filter(Boolean)) assert.ok(KNOWN(f), `${id}: undeclared ${f}`);
    assert.equal(!!c.live, id === 'ep7_morning', `${id}: live`);
  }
  assert.ok([SCENE_CONDITIONS.ep7_morning.ifNot].flat().includes('tier_1'));
  assert.ok([SCENE_CONDITIONS.ep7_morning.ifNot].flat().includes('ep7_morning_done'));
  assert.ok([SCENE_CONDITIONS.ep7_morning.if].flat().includes('ep6_complete'));
  for (const [id, c] of Object.entries(SCENE_CONDITIONS)) {
    if (id === 'ep7_morning') continue;
    assert.ok([c.if].flat().filter(Boolean).some((f) => f in EP7_FLAGS), `${id}: guarded by an Episode 7 flag`);
  }
});

test('every flag a scene sets or checks is declared; every main flag is set by a scene', () => {
  const set = new Set();
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) {
    if (e.op === 'setFlag') { set.add(e.args[0]); assert.ok(e.args[0] in EP7_FLAGS, `${id}: setFlag ${e.args[0]} is not an Episode 7 flag`); }
    if (e.op === 'hasFlag') assert.ok(KNOWN(e.args[0]), `${id}: hasFlag ${e.args[0]}`);
  }
  for (const f of MAIN_FLAGS) assert.ok(set.has(f), `no scene sets ${f}`);
});

test('every id a scene references exists or is a planned Episode 7 id', () => {
  const manifest = JSON.parse(read(join(NEXT, 'assets', 'audio', 'manifest.json')));
  const speakers = new Set([...PARTY, ...Object.keys(NPCS), ...Object.keys(EP7_NPCS), ...Object.keys(SPEAKER_NAMES), ...Object.keys(EP7_SPEAKERS), ...MAP_ACTORS]);
  for (const id of Object.keys(RUNS)) {
    const spawned = new Set();
    for (const e of allOps(id)) {
      const a = e.args;
      switch (e.op) {
        case 'spawn': spawned.add(a[0]); assert.ok(a[1] && a[1].sprite && a[1].name && a[1].at, `${id}: spawn ${a[0]} needs sprite, name, at`);
          assert.ok(EP7_SPRITES.includes(a[1].sprite), `${id}: sprite ${a[1].sprite}`);
          assert.notEqual(a[0], 'vex', `${id}: Vex is vex_k, never the in-glass id`); break;
        case 'say': if (a[0] != null) assert.ok(speakers.has(a[0]) || spawned.has(a[0]), `${id}: speaker ${a[0]}`); break;
        case 'emote': assert.ok(EMOTES.includes(a[1]), `${id}: emote ${a[1]}`); break;
        case 'face': assert.ok(DIRS.includes(a[1]) || speakers.has(a[1]) || spawned.has(a[1]), `${id}: face ${a[1]}`); break;
        case 'music': assert.ok(a[0] === null || a[0] in manifest.music || EP7_MUSIC.includes(a[0]), `${id}: music ${a[0]}`); break;
        case 'sfx': assert.ok(a[0] in manifest.sfx || EP7_SFX.includes(a[0]), `${id}: sfx ${a[0]}`); break;
        case 'tint': assert.ok(TINTS.includes(a[0]), `${id}: tint ${a[0]}`); break;
        case 'battle': assert.ok(ENCOUNTER_IDS.includes(a[0]), `${id}: battle ${a[0]}`); break;
        case 'give': case 'take': assert.ok(a[0] === 'gold' || ITEM_IDS.includes(a[0]) || CORE_ITEMS.includes(a[0]), `${id}: item ${a[0]}`); break;
        case 'closeup': assert.ok(a[0] === null || PAGE_IDS.includes(a[0]), `${id}: closeup ${a[0]}`); break;
        case 'warp': assert.deepEqual(a.slice(0, 3), ['ep6_zl_charts', ...CHARTS_STAGE], `${id}: warp`); break;
        default:
      }
    }
  }
  for (const [k, r] of Object.entries(REWARDS_EP7)) assert.ok(ITEM_IDS.includes(r.item) || CORE_ITEMS.includes(r.item), `reward ${k}: ${r.item}`);
});

test('every box fits: 3 lines of 42 characters with an 8-letter hero name; choices fit; ASCII; titles and cards fit', () => {
  const bad = [];
  const ascii = (s) => /^[\x20-\x7e]*$/.test(s);
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) {
    const text = e.op === 'say' ? e.args[1] : e.op === 'title' ? e.args[0] : null;
    if (text != null && !fits(text)) bad.push(`${id}: ${boxLines(text).join(' / ')}`);
    if (text != null && !ascii(text)) bad.push(`${id}: non-ASCII ${text}`);
    if (text != null && text.includes(EM)) bad.push(`${id}: em dash`);
    if (text != null && /\bledger\b|First Keeper|Concordance|Elowen|cracked-key|could not endure another farewell/i.test(text)) bad.push(`${id}: ${text}`);
    if (e.op === 'title' && (text.length > 42 || (e.args[1]?.sub && e.args[1].sub.length > 42))) bad.push(`${id}: title over 42`);
    if (e.op === 'choice') for (const o of e.args[0]) if (o.length > 28 || !ascii(o)) bad.push(`${id} choice: ${o}`);
  }
  assert.deepEqual(bad, []);
  for (const c of [EPISODE8_CARD, END_TITLE_EP7, END_CARD_EP7]) assert.ok(c.text.length <= 42 && c.sub.length <= 42, c.text);
});

// The late names: "Nox" only from Mira's reading of the signature in whole_page, and "Marten" only from the torn line run on.
const NOX_AT = (e) => e.op === 'say' && e.args[0] === 'mira' && e.args[1] === 'Nox.';
const MARTEN_AT = (e) => e.op === 'say' && /Carried down the White Road by Marten/.test(e.args[1] || '');
const AFTER_PAGE = ['doors_reopen', 'ep7_ending'];
test('nobody says Nox or Marten before the page is read; keeper_t becomes nox_t on the same mark, on one beat', () => {
  for (const id of Object.keys(RUNS)) for (const r of RUNS[id]) {
    let nox = AFTER_PAGE.includes(id) || (SIDE.includes(id) && false);
    let marten = nox;
    for (const e of r.log) {
      if (NOX_AT(e)) nox = true;
      if (MARTEN_AT(e)) marten = true;
      if (e.op === 'hasFlag' && e.args[1] && e.args[0] === 'nox_named') nox = true;   // a side scene that branches on the name
      if (e.op === 'spawn') assert.ok(nox || !/Nox/.test(e.args[1].name), `${id}: spawn named ${e.args[1].name} early`);
      if (e.op === 'spawn') assert.ok(marten || !/Marten/.test(e.args[1].name), `${id}: spawn named ${e.args[1].name} early`);
      if (e.op === 'say' && /\bNox\b/.test(e.args[1]) && !NOX_AT(e)) assert.ok(nox, `${id}: "${e.args[1]}" before the signature`);
      if (e.op === 'say' && /\bMarten\b/.test(e.args[1]) && !MARTEN_AT(e)) assert.ok(marten, `${id}: "${e.args[1]}" before the page`);
      if (e.op === 'say' && e.args[0] === 'nox_t') assert.ok(nox, `${id}: nox_t speaks before the signature`);
    }
  }
  const log = RUNS.whole_page.find((r) => ops(r.log, 'say').length).log;
  const at = log.findIndex(NOX_AT);
  const mAt = log.findIndex(MARTEN_AT);
  assert.ok(mAt > 0 && mAt < at, 'Marten is read on the page before the signature');
  const despawn = log.findIndex((e, i) => i > at && e.op === 'despawn' && e.args[0] === 'keeper_t');
  const spawn = log.findIndex((e, i) => i > at && e.op === 'spawn' && e.args[0] === 'nox_t');
  assert.ok(despawn > at && spawn === despawn + 1, 'keeper_t becomes nox_t right after Mira reads the name');
  assert.ok(log.slice(at + 1, despawn).every((e) => e.op === 'closeup'), 'only the page closes between the reading and the swap');
  assert.equal(log[spawn].args[1].name, 'Nox');
  assert.equal(log[spawn].args[1].at, ops(log, 'spawn').find((e) => e.args[0] === 'keeper_t').args[1].at);
  const setNox = log.findIndex((e) => e.op === 'setFlag' && e.args[0] === 'nox_named');
  const setMarten = log.findIndex((e) => e.op === 'setFlag' && e.args[0] === 'marten_named');
  assert.ok(setMarten > mAt && setMarten < at && setNox > spawn, 'the flags follow the reading');
  // "The Keeper" everywhere before: the square record, the spawn, the memory
  for (const id of ['meet_keeper', 'keeper_and_vex', 'vault_gate', 'keeper_comes', 'phantom', 'phantom_after']) {
    assert.ok(allOps(id).some((e) => e.op === 'say' && ['keeper', 'keeper_t'].includes(e.args[0])), `${id}: the Keeper speaks`);
  }
  assert.equal(SPEAKER_NAMES.keeper_t, 'The Keeper');
  assert.ok(allOps('keeper_memory_2').some((e) => e.op === 'say' && e.args[0] === 'courier_m'), 'A Courier in memory');
});

test('the hero never speaks; Call is learned on its flag; the Phantom speaks in capitals; the hero is heard twice, never in a box', async () => {
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) if (e.op === 'say') assert.notEqual(e.args[0], 'hero', `${id}: the hero speaks`);
  const wo = await one('whiteout', ['first_stone_read']);
  const learnAt = wo.findIndex((e) => e.op === 'say' && /learned Call/.test(e.args[1]));
  const flagAt = wo.findIndex((e) => e.op === 'setFlag' && e.args[0] === 'call_learned');
  assert.ok(flagAt >= 0 && learnAt > flagAt, 'call_learned is set before the learn line');
  assert.match(wo[learnAt].args[1], /Say an ally's name: the cold lets go of them, and they come back sooner\./);
  const call = wo.findIndex((e) => e.op === 'sfx' && e.args[0] === 'call_cast');
  const heard = wo.findIndex((e) => e.op === 'say' && e.args[1] === 'You said my name.');
  assert.ok(call > 0 && call < heard, 'call_cast before "You said my name."');
  assert.ok(wo.slice(0, call).some((e) => e.op === 'emote' && e.args[0] === 'hero' && e.args[1] === '!'));
  assert.ok(wo.some((e) => e.op === 'tint' && e.args[0] === 'whiteout' && e.args[1] >= 120), 'the whiteout tint fades in over 2 s or more');
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) {
    if (e.op === 'say' && e.args[0] === 'white_phantom') assert.equal(e.args[1], e.args[1].toUpperCase(), `${id}: the Phantom in capitals`);
  }
  // the helpers, when E7-scene-ui adds them: the whiteout draws the fade, the memories blot the name
  const h = (await runOnce(withHelpers(scenes.whiteout), { flags: [...EP6_DONE, 'first_stone_read'], branchFlags: false })).log;
  assert.deepEqual(ops(h, 'sfx').map((e) => e.args[0]).filter((x) => x.startsWith('helper:')),
    ['helper:actorAlpha', 'helper:actorAlpha', 'helper:frostNames', 'helper:actorAlpha', 'helper:actorAlpha', 'helper:frostNames'], 'Mira and Bram fade, frost, and come back');
  assert.equal(says(h).length, says(wo).length, 'the same boxes with or without the helpers');
  const m1 = await one('keeper_memory_1', ['vault_f1_arrived']);
  const m1h = (await runOnce(withHelpers(scenes.keeper_memory_1), { flags: [...EP6_DONE, 'vault_f1_arrived'], branchFlags: false })).log;
  assert.ok(says(m1).some((e) => e.args[1] === '...'), 'the fallback blot is a "..." box');
  assert.ok(ops(m1h, 'sfx').some((e) => e.args[0] === 'helper:frostBlot'), 'the helper draws the blot');
  assert.equal(says(m1h).length, says(m1).length - 1, 'the helper is the box');
});

// The staging rule (CRITIQUE_6 item 11): the party is on its marks before the first line of anyone outside it.
const STAGED = ['ep7_morning', 'ep7_board', 'ep7_landing', 'name_under_ice', 'first_stone', 'palehaven_arrival', 'meet_keeper', 'keeper_and_vex',
  'vault_gate', 'keeper_memory_1', 'keeper_memory_2', 'keeper_memory_3', 'keeper_comes', 'phantom', 'whole_page', 'doors_reopen', 'ep7_ending',
  'hearth_light'];
const REVISIT = ['lantern_tried', 'phantom_tried', 'hearth_lit'];
test('staging: the party walks to its marks before the first line of a speaker outside it', async () => {
  for (const id of STAGED) {
    for (const r of RUNS[id]) {
      const first = r.log.findIndex((e) => e.op === 'say' && e.args[0] != null && !PARTY.includes(e.args[0]));
      if (first < 0) continue;
      const before = r.log.slice(0, first).filter((e) => e.op === 'walk').map((e) => e.args[0]);
      const revisit = ops(r.log, 'hasFlag').some((e) => REVISIT.includes(e.args[0]) && e.args[1]);
      if (revisit) continue;
      for (const who of PARTY) assert.ok(before.includes(who), `${id}: ${who} is not staged before the first line`);
    }
  }
  // the party never stands on a speaker's own mark
  for (const id of Object.keys(RUNS)) for (const r of RUNS[id]) {
    const spots = new Set(ops(r.log, 'spawn').map((e) => e.args[1].at));
    for (const w of ops(r.log, 'walk')) if (PARTY.includes(w.args[0])) assert.ok(!spots.has(w.args[1]), `${id}: ${w.args[0]} walks onto ${w.args[1]}`);
  }
  // Vex at the wall: kneeling with his back to the party, the party two rows below on wall_stop
  const log = await one('name_under_ice', ['road_arrived']);
  const vex = ops(log, 'spawn').filter((e) => e.args[0] === 'vex_k');
  assert.ok(vex.length && vex[0].args[1].dir === 'up' && vex[0].args[1].sprite === 'npc_vex_kneel', 'Vex kneels, facing the wall');
  const first = log.findIndex((e) => e.op === 'say');
  assert.ok(log.slice(0, first).some((e) => e.op === 'walk' && e.args[0] === 'hero' && e.args[1] === 'wall_stop'), 'the party stops on wall_stop');
});

test('STAGING_EP7.md documents every scene, every mark, every inspect line and stone key, and the focus marks with their edge rule', () => {
  const staging = read(join(NEXT, 'docs', 'story', 'STAGING_EP7.md'));
  const missing = [];
  for (const id of Object.keys(scenes)) if (!staging.includes('`' + id + '`')) missing.push(`scene ${id}`);
  const actors = new Set([...PARTY, ...Object.keys(NPCS), ...Object.keys(EP7_NPCS), ...MAP_ACTORS]);
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) if (e.op === 'spawn') actors.add(e.args[0]);
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) {
    let mark = null;
    if (e.op === 'walk' && typeof e.args[1] === 'string') mark = e.args[1];
    if (e.op === 'camera.panTo') mark = e.args[0];
    if (e.op === 'spawn') mark = e.args[1]?.at;
    if (mark && !actors.has(mark) && !staging.includes('`' + mark + '`')) missing.push(`${id}: mark ${mark}`);
  }
  for (const id of Object.keys(EP7_LINES)) if (!staging.includes('`' + id + '`')) missing.push(`line ${id}`);
  for (const ev of Object.keys(EP7_STONES)) if (!staging.includes('`' + ev + '`')) missing.push(`stone ${ev}`);
  for (const f of ['EP7_LIVE', 'credits6_rolled', 'credits7_rolled', 'PAGE_KINDS', 'END_CARD_EP7', 'END_CARD_EP6_LIVE', 's.frostBlot', 's.frostNames',
    's.actorAlpha', 'testimony_eira', 'ep7_wake_charts', 'CHARTS_STAGE', 'watch_cot', 'vex_k', 'Focus marks']) if (!staging.includes(f)) missing.push(f);
  assert.deepEqual([...new Set(missing)], []);
  // every staged map lists its focus marks (camera rule: 12 tiles from the sides, 7 from the top and bottom)
  for (const map of ['ep7_white_road', 'ep7_palehaven', 'ep7_vault_f1', 'ep7_vault_f2', 'ep7_vault_f3', 'ep7_stillheart']) {
    assert.match(staging, new RegExp(`Focus marks, \`${map}\``), `${map}: focus marks`);
  }
});

// A chained scene's own boxes: count until the chain point.
const ownBoxes = (log, stop) => {
  const i = stop ? log.findIndex(stop) : -1;
  return says(i < 0 ? log : log.slice(0, i)).length;
};
const STOPS = {
  phantom: (e) => e.op === 'battle',
  whole_page: (e) => e.op === 'setFlag' && e.args[0] === 'page_whole',
};
const CHAINED = ['phantom_after', 'doors_reopen'];
test('box budgets: 12 per main scene (6 morning, 14 wall, 14 whiteout, 14 bell, 18 after, 18 page, 16 doors), about 190 in all', () => {
  const over = [];
  let total = 0;
  for (const id of [...MAIN_PATH, ...CHAINED]) {
    const cap = BOX_BUDGET[id] ?? BOX_BUDGET.default;
    const most = Math.max(...RUNS[id].map((r) => ownBoxes(r.log, STOPS[id])));
    if (most > cap) over.push(`${id}: ${most} > ${cap}`);
    total += most;
  }
  assert.deepEqual(over, []);
  assert.deepEqual(BOX_BUDGET, { default: 12, ep7_morning: 6, name_under_ice: 14, whiteout: 14, listening_bell: 14, phantom_after: 18,
    whole_page: 18, doors_reopen: 16 });
  assert.ok(total >= 150 && total <= 210, `main path boxes: ${total}`);
  console.log(`# Episode 7 main path: ${total} boxes over ${MAIN_PATH.length + CHAINED.length} scenes`);
});

test('the first five minutes: the chart by the second box, six boxes at most, the choice by box five, the fight comes fast', async () => {
  await withPages(async () => {
    const log = await one('ep7_morning', [], { mapId: 'ep6_zl_charts' });
    const opened = log.findIndex((e) => e.op === 'closeup' && e.args[0] === 'ep7_chart');
    assert.ok(opened >= 0 && says(log.slice(0, opened)).length === 2, 'the chart opens on the second box (Look fast)');
    assert.deepEqual(log[opened].args[1], { mode: 'fading' });
    assert.ok(says(log).length <= 6);
    assert.equal(log.slice(0, log.findIndex((e, i) => i > opened && e.op === 'say')).filter((e) => e.op === 'music').at(-1).args[0], null,
      'silence on the chart');
    assert.ok(ops(log, 'give').some((e) => e.args[0] === 'white_road_letter'), 'the letter, without Piri');
    const has = await one('ep7_morning', ['white_road_letter_get'], { mapId: 'ep6_zl_charts' });
    assert.ok(!ops(has, 'give').length && says(has).length === 5, 'no second letter');
    // anywhere else, the first step moves the party to the Chart Room on black, and says nothing
    const inn = await one('ep7_morning', [], { mapId: 'ep6_zl_inn' });
    assert.deepEqual(inn.filter((e) => !['hasFlag', 'lockInput', 'unlockInput'].includes(e.op)).map((e) => e.op), ['fade', 'warp']);
    assert.ok(!ops(inn, 'setFlag').length, 'nothing set before the room');
  });
  const board = await one('ep7_board', ['ep7_started']);
  const landing = await one('ep7_landing', ['ep7_boarded']);
  assert.ok(says(board).length === 2 && says(board).length + says(landing).length <= 6, 'boarding and the landing are short');
  const wall = await one('name_under_ice', ['road_arrived']);
  const ch = wall.findIndex((e) => e.op === 'choice');
  assert.deepEqual(wall[ch].args[0], ['Half of it.', 'All of it.']);
  assert.ok(says(wall.slice(0, ch)).length <= 5, 'the choice by the fifth box');
  const fight = await one('road_fight', ['vex_carved']);
  assert.ok(says(fight.slice(0, fight.findIndex((e) => e.op === 'battle'))).length <= 2, 'the fight comes fast');
  assert.deepEqual(ops(fight, 'battle')[0].args.slice(0, 2), ['e7w_first', { canFlee: false }]);
  assert.match(says(fight)[1].args[1], /Defend and shake it off/, 'the line names the button');
  assert.ok(!says(fight).some((e) => /tutorial|press|button/i.test(e.args[1])), 'no tutorial box');
  // from the chart room to the first fight: under 30 boxes
  const before = says(await one('ep7_morning', [], { mapId: 'ep6_zl_charts' })).length + says(board).length + says(landing).length
    + says(wall).length + 1;
  assert.ok(before <= 30, `boxes before the first fight: ${before}`);
});

test('the payoffs open their close-up pages when the kinds exist, closed before the field moves; never a page that is missing', async () => {
  for (const id of Object.keys(PAYOFFS)) for (const e of allOps(id)) assert.notEqual(e.op, 'closeup', `${id}: closeup with no page kind`);
  await withPages(async () => {
    const STATE = { ep7_morning: [], name_under_ice: ['road_arrived'], waystation: ['road_arrived'], listening_bell: ['vault_f2_arrived'],
      phantom_after: ['phantom_defeated'], whole_page: ['stillheart_restored'], doors_reopen: ['page_whole'] };
    for (const [id, want] of Object.entries(PAYOFFS)) {
      const full = await one(id, STATE[id], { mapId: id === 'ep7_morning' ? 'ep6_zl_charts' : null });
      const log = STOPS[id] ? full.slice(0, full.findIndex(STOPS[id])) : full;
      const opens = ops(log, 'closeup').filter((e) => e.args[0]);
      assert.deepEqual(opens.map((e) => [e.args[0], e.args[1]?.mode]), want, id);
      let open = false;
      for (const e of full) {
        if (e.op === 'closeup') open = !!e.args[0];
        if (open && (e.op === 'walk' || e.op === 'spawn' || e.op === 'despawn' || e.op === 'camera.panTo')) assert.fail(`${id}: ${e.op} while a page is open`);
      }
      assert.ok(!open, `${id}: page left open`);
    }
    // the whole page in three steps (CRITIQUE_7 item 7): each step's line on its own mode, the signature last
    const log = await one('whole_page', ['stillheart_restored']);
    let mode = null;
    const said = [];
    for (const e of log) {
      if (e.op === 'closeup') mode = e.args[0] === 'ep7_page' ? e.args[1]?.mode : null;
      if (e.op === 'say' && mode) said.push([mode, e.args[1]]);
    }
    assert.ok(said.some(([md, t]) => md === 'joined' && /Carried down the White Road by Marten, courier of Willowmere, at his sister's asking\./.test(t)));
    assert.ok(said.some(([md, t]) => md === 'mark' && /seven in the date is crossed/.test(t)));
    assert.ok(said.findIndex(([md]) => md === 'joined') < said.findIndex(([md]) => md === 'mark'));
    assert.deepEqual(said.at(-1), ['signed', 'Nox.'], 'the signature is the last thing read over the page');
    assert.ok(said.filter(([md]) => md === 'signed').length <= 2, 'the signature stage says it, and little else');
  });
  // without the pages, the same boxes
  const plain = says(await one('whole_page', ['stillheart_restored'])).length;
  await withPages(async () => assert.equal(says(await one('whole_page', ['stillheart_restored'])).length, plain));
});

test('a full playthrough from a finished Episode 6 reaches ep7_complete with every main flag, in order', async () => {
  const give = (...f) => (set) => f.forEach((x) => set.add(x));
  const order = ['ep7_morning', 'ep7_board', 'ep7_landing', 'road_fight', (s) => assert.ok(!s.has('road_fight_done'), 'the fight waits for the wall'),
    'name_under_ice', 'road_fight', 'whiteout', (s) => assert.ok(!s.has('call_learned'), 'the whiteout waits for the stone lesson'),
    'first_stone', 'whiteout', 'waystation', 'palehaven_view', 'palehaven_arrival', 'keeper_and_vex',
    (s) => assert.ok(!s.has('keeper_told'), 'the Watch waits for the Keeper'),
    'meet_keeper', 'keeper_and_vex', 'vault_gate', 'vault_f1_arrival', 'keeper_memory_1', give('stillheart_key_found'), 'vault_f1_lift',
    'vault_f2_arrival', 'keeper_memory_2', 'listening_bell', 'vault_f2_lift', (s) => assert.ok(!s.has('vault_f2_done'), 'the lift waits for the Lantern'),
    'pale_lantern', 'vault_f2_lift', 'vault_f3_arrival', 'keeper_memory_3', 'keeper_comes', 'phantom', 'whole_page', 'ep7_ending'];
  const { set } = await playthrough(scenes, order, { flags: EP6_DONE });
  for (const f of MAIN_FLAGS) assert.ok(set.has(f), `missing ${f}`);
  assert.ok(set.has('told_vex') && !set.has('spared_vex'));
  assert.ok(set.has('told_nox') && !set.has('spared_nox'));
  // nothing replays
  const again = await playthrough(scenes, MAIN_PATH, { flags: [...set] });
  for (const logs of Object.values(again.logs)) for (const log of logs) assert.ok(!ops(log, 'say').length, 'a main scene replayed');
});

test('the switch: with EP7_LIVE false nothing in Episode 7 is reachable; Fine Print never starts it; Episode 6 unfinished does not', async () => {
  GATE.live = false;
  try {
    const { set } = await playthrough(scenes, Object.keys(scenes), { flags: EP6_DONE });
    for (const f of Object.keys(EP7_FLAGS)) assert.ok(!set.has(f), `${f} set with the switch off`);
  } finally { GATE.live = true; }
  const fp = await playthrough(scenes, Object.keys(scenes), { flags: [...EP6_DONE, 'tier_1'] });
  for (const f of Object.keys(EP7_FLAGS)) assert.ok(!fp.set.has(f), `${f} set on a Fine Print run`);
  const early = await playthrough(scenes, Object.keys(scenes), { flags: EP6_DONE.filter((f) => f !== 'ep6_complete') });
  for (const f of Object.keys(EP7_FLAGS)) assert.ok(!early.set.has(f), `${f} set before ep6_complete`);
  const ok = await playthrough(scenes, ['ep7_morning'], { flags: EP6_DONE });
  assert.ok(ok.set.has('ep7_started'));
  // the module switch itself is the core one, read through a namespace (EP7_LIVE may not exist yet: then false)
  const EPISODES = await import('../../src/game/episodes.js');
  const fresh = await import(`../../src/data/ep7/story.js?gate=${Date.now()}`);
  assert.equal(fresh.GATE.live, EPISODES.EP7_LIVE === true);
  // E7-integrate flipped EP7_LIVE on the branch after the full gate list (plan 12); the guard above holds either way
});

// Each map's track (plan 8.2). A scene that changes the music puts its map's track back before it ends.
const SCENE_TRACK = {
  ep7_morning: 'zephyr', name_under_ice: 'high_moor', whiteout: 'high_moor', waystation: 'high_moor', palehaven_view: 'high_moor',
  palehaven_arrival: 'palehaven', keeper_memory_1: 'frostbound_vault', keeper_memory_2: 'frostbound_vault', listening_bell: 'frostbound_vault',
  pale_lantern: 'frostbound_vault', keeper_memory_3: 'mystery', phantom_after: null, doors_reopen: 'palehaven', whole_page: 'palehaven',
};
test('music cues follow the cue sheet and return to the map track (plan 8.3)', async () => {
  for (const [id, track] of Object.entries(SCENE_TRACK)) for (const r of RUNS[id]) {
    const m = musics(r.log);
    const lost = ops(r.log, 'battle').some((e) => e.args[2] === 'lose');
    if (m.length && !lost) assert.equal(m.at(-1), track, `${id} ends on ${m.at(-1)}`);
  }
  const mus = async (id, flags, o) => musics(await one(id, flags, o));
  assert.deepEqual(await mus('ep7_morning', [], { mapId: 'ep6_zl_charts' }), [null, 'zephyr']);
  assert.deepEqual(await mus('name_under_ice', ['road_arrived']), [null, 'mystery', 'high_moor']);
  assert.deepEqual(await mus('whiteout', ['first_stone_read']), [null, 'high_moor']);
  assert.deepEqual(await mus('waystation', ['road_arrived']), [null, 'high_moor']);
  assert.deepEqual(await mus('palehaven_view', ['road_arrived']), ['mystery', 'high_moor']);
  assert.deepEqual(await mus('palehaven_arrival', ['road_arrived']), [null, 'palehaven']);
  assert.deepEqual(await mus('keeper_memory_1', ['vault_f1_arrived']), ['sorrow', 'frostbound_vault']);
  assert.deepEqual(await mus('listening_bell', ['vault_f2_arrived']), [null, 'mystery', 'frostbound_vault']);
  assert.deepEqual(await mus('pale_lantern', ['vault_f2_arrived']), [null, 'battle', 'frostbound_vault']);
  assert.deepEqual(await mus('keeper_memory_3', ['vault_f3_arrived']), ['sorrow', 'mystery']);
  assert.deepEqual(await mus('phantom', ['stillheart_open']), [null, 'boss_phantom', 'sorrow', 'triumph', 'mystery', null]);
  assert.deepEqual(await mus('whole_page', ['stillheart_restored']), [null, 'mystery', 'sorrow', 'palehaven', null, 'palehaven']);
  assert.deepEqual(await mus('ep7_ending', ['doors_reopened']), [null, 'mystery']);
  for (const id of ['meet_keeper', 'keeper_and_vex', 'keeper_comes', 'first_stone', 'road_fight']) {
    assert.deepEqual(await mus(id, ['palehaven_arrived', 'met_keeper', 'keeper_memory_3', 'road_arrived', 'vex_carved']), [], id);
  }
  // the memories toll; the Listening Bell rings the thirteenth bell, many times, then once alone
  for (const id of ['keeper_memory_1', 'keeper_memory_2', 'keeper_memory_3']) assert.ok(allOps(id).some((e) => e.op === 'sfx' && e.args[0] === 'bell_toll'), id);
  const after = await one('phantom_after', ['phantom_defeated']);
  assert.equal(ops(after, 'sfx').filter((e) => e.args[0] === 'bell_thirteenth').length, 4);
});

test('boss intros: silence, the card, the theme, then the battle; a retry is short; a loss sets nothing after', async () => {
  for (const [id, flags, theme] of [['pale_lantern', ['vault_f2_arrived'], 'battle'], ['phantom', ['stillheart_open'], 'boss_phantom']]) {
    const enc = id === 'phantom' ? 'white_phantom' : id;
    const log = await one(id, flags);
    const at = (op) => log.findIndex((e) => e.op === op);
    assert.equal(log[at('music')].args[0], null);
    assert.equal(log[at('title')].args[0], EP7_BOSS_CARDS[enc].name);
    assert.equal(log[at('title')].args[1].sub, EP7_BOSS_CARDS[enc].sub);
    assert.ok(at('title') < at('battle'));
    assert.equal(log.slice(at('title'), at('battle')).find((e) => e.op === 'music').args[0], theme);
    assert.ok(says(log).some((e) => e.args[1] === EP7_ARC_LINES[enc]), `${id}: the arc line`);
    const tried = id === 'phantom' ? 'phantom_tried' : 'lantern_tried';
    const retry = await one(id, [...flags, tried]);
    const before = (l) => says(l.slice(0, l.findIndex((e) => e.op === 'battle'))).length;
    assert.ok(before(retry) < before(log) && before(retry) <= 2, `${id}: retry is short`);
    const lost = RUNS[id].find((r) => ops(r.log, 'battle').some((e) => e.args[2] === 'lose'));
    assert.ok(lost);
    const after = lost.log.slice(lost.log.findIndex((e) => e.op === 'battle'));
    assert.ok(!ops(after, 'setFlag').length && !ops(after, 'say').length, `${id}: a loss sets nothing`);
    assert.deepEqual(ops(log, 'battle')[0].args.slice(0, 2), [enc, { boss: true, canFlee: false }]);
  }
});

test('the two truth choices: Vex changes one line in doors_reopen; the Keeper one line in whole_page and her gift', async () => {
  const lines = async (id, base, f) => says(await one(id, [...base, ...f])).map((e) => e.args[1]);
  const diff = (x, y) => x.filter((t, i) => t !== y[i]).length;
  const base = ['page_whole'];
  const tv = await lines('doors_reopen', base, ['told_vex']), sv = await lines('doors_reopen', base, ['spared_vex']);
  assert.equal(tv.length, sv.length);
  assert.equal(diff(tv, sv), 1, "one Vex line differs");
  const wb = ['stillheart_restored'];
  const tn = await lines('whole_page', wb, ['told_nox']), sn = await lines('whole_page', wb, ['spared_nox']);
  const cut = (l) => l.slice(0, l.indexOf("...I'm used to being followed.") + 1);
  assert.equal(diff(cut(tn), cut(sn)), 1, 'one Nox line differs in whole_page');
  const gift = (log) => ops(log, 'give').map((e) => e.args[0]).filter((x) => x === 'open_gate' || x === 'kept_lamp');
  assert.deepEqual(gift(await one('doors_reopen', ['page_whole', 'told_nox'])), ['open_gate']);
  assert.deepEqual(gift(await one('doors_reopen', ['page_whole', 'spared_nox'])), ['kept_lamp']);
  for (const [id, a, b] of [['name_under_ice', 'told_vex', 'spared_vex'], ['keeper_comes', 'told_nox', 'spared_nox']]) {
    const sets = RUNS[id].filter((r) => ops(r.log, 'choice').length).map((r) => ops(r.log, 'setFlag').map((e) => e.args[0]));
    assert.ok(sets.some((s) => s.includes(a)) && sets.some((s) => s.includes(b)), id);
    assert.ok(sets.every((s) => !(s.includes(a) && s.includes(b))), `${id}: both`);
  }
  for (const c of [0, 1]) {
    const { set } = await playthrough(scenes, [['keeper_comes', [c]]], { flags: [...EP6_DONE, 'keeper_memory_3'] });
    assert.ok(set.has('keeper_came') && set.has('stillheart_open'));
    const w = await playthrough(scenes, [['name_under_ice', [c]]], { flags: [...EP6_DONE, 'road_arrived'] });
    assert.ok(w.set.has('vex_carved') && w.set.has('valewyn_list_get'));
  }
  // the canon and held lines, word for word
  const all = Object.keys(RUNS).flatMap((id) => says(allOps(id)).map((e) => e.args[1]));
  for (const t of ['The light exists so others can return.', 'Do not freeze my life into a single farewell. Open the door for those who follow.',
    'Now you understand why I keep moving.', "Where you came from is not mine to tell. It's written somewhere I can't go.",
    "I'll say the name you'll need up there. Up there.", '...Ask me at the top.', "...Nox. It's been a long time since it stayed on the paper.",
    'I can open the door. I cannot walk through it.', "Keep the door open behind you. Someone's always following.",
    'THE NORTH. LET IT FORGET EVERY SOUL WHO CAN STILL READ THE FIRST ERASED PAGE.']) assert.ok(all.includes(t), t);
});

// PLAYTEST_REVIEW_6 item 8 must not recur: each tip names a lever E7-battle's data has.
test("Mira's two boss tips each name a lever the boss's data has (plan 6.6)", async (t) => {
  assert.equal(TIPS.pale_lantern, 'When it borrows one of us, call them back, {hero}. Before its turn.');
  assert.equal(TIPS.white_phantom, 'When it says goodbye to one of us, call them, {hero}. Before it lands.');
  assert.ok(allOps('pale_lantern').some((e) => e.op === 'say' && e.args[0] === 'mira' && e.args[1] === TIPS.pale_lantern));
  assert.ok(allOps('phantom').some((e) => e.op === 'say' && e.args[0] === 'mira' && e.args[1] === TIPS.white_phantom));
  if (!ENEMIES7 || !SKILLS7 || !ENEMIES7.EP7_ENEMIES || !SKILLS7.EP7_SKILLS) { t.skip('E7-battle data not written yet'); return; }
  const E = ENEMIES7.EP7_ENEMIES, S = SKILLS7.EP7_SKILLS;
  const AI7 = await battleMod('ai');
  const uses = (boss, skill) => JSON.stringify(boss).includes(skill)
    || !!(AI7 && AI7.EP7_SCRIPTS && boss.ai && Object.values(AI7.EP7_SCRIPTS[boss.ai] || {}).map(String).join(' ').includes(`'${skill}'`));
  const flagged = (sk) => !!sk && (sk.farewell === true || sk.flag === 'farewell' || [sk.flags].flat().includes('farewell'));
  // "When it borrows one of us, call them back": borrowed_light carries the farewell flag, and the Lantern has it
  assert.ok(flagged(S.borrowed_light), 'borrowed_light carries the farewell flag');
  assert.ok(E.pale_lantern && uses(E.pale_lantern, 'borrowed_light'), 'the Lantern uses borrowed_light');
  // "When it says goodbye to one of us, call them": farewell carries the flag, and the Phantom has it
  assert.ok(flagged(S.farewell), 'farewell carries the farewell flag');
  assert.ok(E.white_phantom && uses(E.white_phantom, 'farewell'), 'the Phantom uses farewell');
  // "call them": Call exists, is the hero's, aims at one ally and is learned in whiteout
  const call = S.call_name;
  assert.ok(call && call.user === 'hero' && call.name === 'Call', 'call_name is the hero\'s Call');
  assert.equal(call.learn && call.learn.flag, 'call_learned');
  assert.equal(call.target, 'ally', 'Call targets one ally (the menu path, plan 6.3)');
});

test('side stories: the hearth lights once after three witnesses; the Reliquary wants its pages; Torr takes three plaques', async () => {
  const play = (order, flags) => playthrough(scenes, order, { flags: [...EP6_DONE, 'ep7_started', 'palehaven_arrived', 'met_keeper', ...flags] });
  const r = await play(['hearth_light', 'hearth_start', 'hearth_light', 'testimony_mirael', 'testimony_sol', 'hearth_light', 'hearth_light'], []);
  assert.ok(r.set.has('hearth_started') && r.set.has('testimony_eira') && r.set.has('hearth_lit') && r.set.has('hearth_done'));
  const gives = Object.values(r.logs).flat(2).filter((e) => e.op === 'give');
  assert.equal(gives.filter((e) => e.args[0] === 'winterwatch_coat').length, 1);
  assert.deepEqual(gives.filter((e) => e.args[0] === 'gold').map((e) => e.args[1]), [400]);
  assert.deepEqual(gives.filter((e) => e.args[0] === 'hi_potion' || e.args[0] === 'hi_ether').map((e) => e.args), [['hi_potion', 2], ['hi_ether', 2]]);
  const early = await play(['hearth_start', 'hearth_light'], []);
  assert.ok(!early.set.has('hearth_lit'), 'the hearth waits for all three witnesses');
  // Eira's and Mirael's canon testimonies say "The Keeper" until her name is back, and "Keeper Nox" after
  const eira = (f) => one('hearth_start', ['met_keeper', ...f]).then((l) => says(l).map((e) => e.args[1]).join(' '));
  assert.match(await eira([]), /The Keeper promised to keep my sister safe\. The White Phantom froze her last letter/);
  assert.match(await eira(['nox_named']), /Keeper Nox promised to keep my sister safe\./);
  const rq = await play(['ep7_reliquary', (s) => ['page_door_found', 'page_flame_found', 'page_lost_found', 'vault_f2_arrived'].forEach((f) => s.add(f)),
    'ep7_reliquary', 'ep7_reliquary'], ['vault_f2_arrived']);
  assert.ok(rq.set.has('reliquary_open'));
  assert.deepEqual(Object.values(rq.logs).flat(2).filter((e) => e.op === 'take').map((e) => e.args), [['witness_page', 3]]);
  const shut = await play(['ep7_reliquary'], ['vault_f2_arrived', 'page_door_found']);
  assert.ok(!shut.set.has('reliquary_open'), 'two pages do not open it');
  const p = await play(['streets_start', 'streets_done', (s) => ['street_1_found', 'street_2_found', 'street_3_found'].forEach((f) => s.add(f)),
    'streets_done', 'streets_done'], []);
  assert.ok(p.set.has('streets_started') && p.set.has('streets_done'));
  const all3 = Object.values(p.logs).flat(2);
  assert.deepEqual(all3.filter((e) => e.op === 'take').map((e) => e.args), [['street_plaque', 3]]);
  assert.deepEqual(all3.filter((e) => e.op === 'give').map((e) => e.args[0]), ['snowrest_scarf']);
  assert.ok(all3.some((e) => e.op === 'say' && e.args[1] === 'Our oldest page names the White Phantom, then stops mid-sentence.'), 'canon Torr');
});

test('grief is shown small: no death described, no humor in the memories or the Sanctum before the Phantom falls', () => {
  const dark = /\b(died|dead body|corpse|froze to death|killed|burned alive)\b/i;
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) if (e.op === 'say') assert.ok(!dark.test(e.args[1]), `${id}: ${e.args[1]}`);
  for (const id of ['keeper_memory_1', 'keeper_memory_2', 'keeper_memory_3', 'listening_bell', 'vault_f3_arrival', 'keeper_comes']) {
    for (const e of allOps(id)) if (e.op === 'say') assert.ok(!/breakfast|Lovely|Of course they did|NAME\. Is that/.test(e.args[1]), `${id}: a joke`);
  }
});

test('the ban list: no banned word, no em dash, ASCII, LF in every Episode 7 file E7-story writes; no Episode 1 text key on an Episode 7 map', async () => {
  for (const f of ['src/data/ep7/story.js', 'src/data/ep7/flags.js', 'src/data/ep7/npcs.js', 'src/data/ep7/quests.js', 'src/data/ep7/text.js',
    'src/data/ep7/ledger.js', 'docs/story/STAGING_EP7.md', 'qa/content/ep7_story.test.mjs', 'qa/content/ep7_data.test.mjs',
    'qa/content/ep7_boxes.mjs', 'qa/content/ep7_preview.py']) {
    const txt = readFileSync(join(NEXT, ...f.split('/')), 'utf8');
    assert.ok(!txt.includes(EM), `${f}: em dash`);
    assert.ok(!BANNED.test(txt), `${f}: banned word`);
    assert.ok(/^[\x09\x0a\x20-\x7e]*$/.test(txt), `${f}: non-ASCII or CR`);
  }
  const bible = readFileSync(join(NEXT, 'docs', 'story', 'EPISODE7.md'), 'utf8');
  assert.ok(!bible.includes(EM), 'EPISODE7.md: em dash');
  assert.ok(!bible.includes('\r'), 'EPISODE7.md: LF only');
  // every text key an Episode 7 map event names is Episode 7's own (PLAYTEST_REVIEW_8 item 7), once the maps exist (wave 7c)
  const dir = join(NEXT, 'src', 'data', 'maps');
  for (const f of readdirSync(dir).filter((x) => /^ep7_.*\.js$/.test(x))) {
    const mod = (await import(`../../src/data/maps/${f}`)).default;
    if (!mod || !Array.isArray(mod.events)) continue;
    for (const ev of mod.events) for (const k of [ev.text, ev.name, ev.line].filter((x) => typeof x === 'string')) {
      assert.ok(!(k in EP1_LINES), `${f} ${ev.id}: Episode 1 text key ${k}`);
    }
  }
});
