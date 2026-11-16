// Episode 8 story script (E8-story, the lazy ep8 pack): every scene and branch, the cutscene API, ids unique across eight
// episodes and the X1, X2, cave and tier packs, flags declared, boxes (with the longest hero name the name entry allows)
// and budgets, staging, the close-up payoffs (each step on its own box), music cues, the three-record speaker swap, the
// three truth choices, the permanent final choice, the switch, Mira's boss tips against E8-battle's data, the first five
// minutes, the bell night, and a playthrough to ep8_complete. Ids owned by other wave-8 agents (maps, sprites, pages,
// audio, helpers) are accepted by their planned ids (docs/EPISODE8_PLAN.md section 2); battle ids are read from E8-battle's
// modules when they exist.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { scenes, SCENE_CONDITIONS, GATE, MAIN_PATH, CHAINED, BOX_BUDGET, PAYOFFS, TIPS, SIDE, SILENT, STORY_IDS, TOLL_IDS, WITNESS_FLAGS,
  WITNESS_LINES, ENDINGS, BELL_FOOT, STAIR_FOOT, HOME_DOOR, register as registerScenes } from '../../src/data/ep8/story.js';
import { EP8_FLAGS, EP8_TOLL_NAMES, register as registerFlags } from '../../src/data/ep8/flags.js';
import { register as registerEp4Flags } from '../../src/data/ep4/flags.js';
import { register as registerEp5Flags } from '../../src/data/ep5/flags.js';
import { register as registerEp6Flags } from '../../src/data/ep6/flags.js';
import { register as registerEp7Flags } from '../../src/data/ep7/flags.js';
import { register as registerEp7Npcs } from '../../src/data/ep7/npcs.js';
import { EP8_LINES, EP8_REALMS, EP8_BOSS_CARDS, EP8_ARC_LINES } from '../../src/data/ep8/text.js';
import { EPISODE8_CARD, END_TITLE_EP8, END_CARD_EP8, COLD_OPEN_CARD } from '../../src/data/ep8/credits.js';
import { EP8_NPCS, EP8_SPEAKERS, register as registerNpcs } from '../../src/data/ep8/npcs.js';
import { REWARDS_EP8 } from '../../src/data/ep8/quests.js';
import { scenes as EP7_SCENES } from '../../src/data/ep7/story.js';
import { EP7_LINES } from '../../src/data/ep7/text.js';
import { scenes as EP6_SCENES } from '../../src/data/ep6/story.js';
import { EP6_LINES } from '../../src/data/ep6/text.js';
import { scenes as EP5_SCENES } from '../../src/data/ep5/story.js';
import { EP5_LINES } from '../../src/data/ep5/text.js';
import { scenes as EP4_SCENES } from '../../src/data/ep4/story.js';
import { EP4_LINES } from '../../src/data/ep4/text.js';
import { scenes as EP1_SCENES, lines as EP1_LINES, TOLL_NAMES, PROLOGUE } from '../../src/data/story/ep1.js';
import { scenes as EP2_SCENES, lines as EP2_LINES } from '../../src/data/story/ep2.js';
import { scenes as EP3_SCENES, lines as EP3_LINES } from '../../src/data/story/ep3.js';
import { FLAGS } from '../../src/data/quests.js';
import { NPCS, SPEAKER_NAMES } from '../../src/data/npcs.js';
import { PAGE_KINDS } from '../../src/world/closeup.js';
import { fits, boxLines } from '../../src/data/story/dialogue.js';
import BELL_TOWER from '../../src/data/maps/bell_tower.js';
import HERO_HOME from '../../src/data/maps/hero_home.js';
import { explore, playthrough, runOnce, NEXT, read, EMOTES, DIRS, EP2_SFX } from './_harness.mjs';

const EM = String.fromCharCode(0x2014);
const BANNED = new RegExp(['cross', 'word|ana', 'gram|word ', 'puzzle|letter ', 'puzzle|un', 'scramble|word ', 'search'].join(''), 'i');
export const EP7_DONE = ['intro_done', 'met_mael', 'mira_joined', 'bram_joined', 'archivore_defeated', 'ep1_complete', 'ep2_started',
  'ep2_complete', 'nh_restored', 'ep3_started', 'pk_restored', 'ep3_complete', 'ep4_started', 'vw_restored', 'ep4_complete',
  'ep5_started', 'haven_restored', 'ep5_complete', 'ep6_started', 'zephyr_arrived', 'compass_restored', 'isles_restored', 'ep6_complete',
  'ep7_started', 'nox_named', 'marten_named', 'doors_reopened', 'page_whole', 'vex_name_whole', 'ep7_complete'];
export const MAIN_FLAGS = ['ep8_started', 'ep8_roofed', 'stair_arrived', 'first_rub_done', 'eraser_seen', 'saw_scriptorium',
  'scriptorium_arrived', 'read_learned', 'librarian_met', 'card_read', 'elowen_met', 'library_open', 'library_entered',
  'library_f1_done', 'sentry_defeated', 'library_f2_done', 'beginning_seen', 'name_told', 'vex_arrived', 'eraser_defeated',
  'lexicon_restored', 'fragment8_get', 'keeper_named', 'page_shelved', 'night_read', 'eighth_star', 'hero_kept', 'scriptorium_open',
  'home_reached', 'ep8_complete'];
const PARTY = ['hero', 'mira', 'bram'];
const EP8_MUSIC = ['scriptorium_town', 'first_library', 'boss_eraser', 'the_last_word', 'palehaven', 'orrery'];   // plan 2.7
const EP8_SFX = ['page_open', 'page_fold', 'rub_out', 'ink_slide', 'read_cast', 'unwrite_read', 'unwrite_break', 'silence_gather'];
const EP8_SPRITES = ['npc_keeper', 'npc_vex', 'npc_vex_kneel', 'npc_aeris', 'npc_parent', 'npc_scholar', 'mira', 'bram', 'index_hound',
  'eraser_avatar', 'npc_librarian', 'npc_first_keeper', 'npc_first_keeper_m', 'npc_elowen_m', 'npc_nurse_m', 'npc_rootbound_keeper_m',
  'prop_baby_bundle', 'prop_empty_blanket'];
const PAGE_IDS = ['ep8_note', 'ep8_card', 'ep8_seal', 'ep8_first_word', 'ep8_could_not', 'ep8_shelf', 'ep8_last_page'];
const TINTS = ['none', 'dawn', 'dusk', 'night', 'rubout', 'violet'];   // rubout, violet: the pack tints (E8-world, plan 5.2)
const KNOWN = (f) => f in FLAGS || f === 'tier_1';   // tier_1: the Fine Print pack's flag (src/data/tier)
const STORY_COUNT = 37;

// E8-battle's modules, when they exist (the encounter and item ids then come from them; otherwise the plan's).
const battleMod = async (name) => (existsSync(join(NEXT, 'src', 'data', 'ep8', `${name}.js`)) ? import(`../../src/data/ep8/${name}.js`) : null);
const ENC8 = await battleMod('encounters');
const ITEMS8 = await battleMod('items');
const ENEMIES8 = await battleMod('enemies');
const SKILLS8 = await battleMod('skills');
const ENCOUNTER_IDS = ['e8s_first', 'unnamed_sentry', 'eraser', ...((ENC8 && ENC8.EP8_GROUP_IDS) || []), ...((ENC8 && ENC8.EP8_BOSS_IDS) || [])];
const ITEM_IDS = ['vex_note', 'reader_card', 'ink_key', 'name_fragment_8', 'evidence_page', 'drift_page', 'fresh_ink', 'binders_awl',
  'riverwater_thread', 'bookcloth_coat', 'runners_ribbon', 'last_word_pen', 'blank_faceplate', 'quill_of_return', 'margin_boots_set',
  ...(ITEMS8 ? Object.keys({ ...(ITEMS8.EP8_CONSUMABLES || {}), ...(ITEMS8.EP8_KEY_ITEMS || {}), ...(ITEMS8.EP8_UNIQUES || {}) }) : [])];
const CORE_ITEMS = ['hi_ether', 'hi_potion'];

registerEp4Flags();
registerEp5Flags();
registerEp6Flags();
registerEp7Flags();
registerFlags();
registerEp7Npcs();
registerNpcs({ x1Live: false });
GATE.live = true;
const RUNS = {};
for (const [id, fn] of Object.entries(scenes)) RUNS[id] = await explore(fn, { flags: ['mira_joined', 'bram_joined'] });
const allOps = (id) => RUNS[id].flatMap((r) => r.log);
const ops = (log, op) => log.filter((e) => e.op === op);
const musics = (log) => ops(log, 'music').map((e) => e.args[0]);
const says = (log) => ops(log, 'say');
const one = async (id, flags, o = {}) => (await runOnce(scenes[id], { flags: [...EP7_DONE, ...flags], branchFlags: false, ...o })).log;
/** Run a scene with the pack cutscene helpers present (E8-scene-ui): inkBlot, hudNameFlash, tollName, goto. */
const HELPERS = ['inkBlot', 'hudNameFlash', 'tollName', 'goto'];
const withHelpers = (fn) => (s) => fn(new Proxy(s, {
  has: (t, k) => HELPERS.includes(k) || k in t,
  get: (t, k) => (HELPERS.includes(k) ? async (...a) => { await t.sfx(`helper:${k}`); return a; } : t[k]),
}));
const withPages = async (fn) => {
  const kinds = Object.keys(PAGE_KINDS);
  for (const k of PAGE_IDS) PAGE_KINDS[k] = () => ({});
  try { return await fn(); } finally { for (const k of Object.keys(PAGE_KINDS)) if (!kinds.includes(k)) delete PAGE_KINDS[k]; }
};

test('scene and line ids are new across Episodes 1 to 7 and the X1, X2, cave and tier packs; 37 story scenes and 12 toll steps; twice is clean', async () => {
  const STORY = await import('../../src/game/story.js');
  for (const mod of ['../../src/data/x1/index.js', '../../src/data/x2/index.js', '../../src/data/cave/story.js', '../../src/data/tier/index.js']) {
    try { const m = await import(mod); await (m.register || m.default)(); } catch (e) { /* a pack that cannot load in node registers nothing */ }
  }
  for (const id of Object.keys(scenes)) {
    for (const t of [EP1_SCENES, EP2_SCENES, EP3_SCENES, EP4_SCENES, EP5_SCENES, EP6_SCENES, EP7_SCENES]) assert.ok(!(id in t), `scene ${id} exists in Episodes 1 to 7`);
    assert.ok(!(id in STORY.SCENES), `scene ${id} is already registered`);
    assert.ok(!/^(ep[1-7]_|e7|toll_|keeper_memory_[1-3]$|hearth_|streets_|testimony_(mirael|sol|eira))/.test(id), `prefix ${id}`);
  }
  for (const id of Object.keys(EP8_LINES)) {
    for (const t of [EP1_LINES, EP2_LINES, EP3_LINES, EP4_LINES, EP5_LINES, EP6_LINES, EP7_LINES]) assert.ok(!(id in t), `line ${id} exists in Episodes 1 to 7`);
    assert.ok(!(id in STORY.LINES), `line ${id} is already registered`);
  }
  for (const id of Object.keys(EP8_NPCS)) assert.ok(!(id in NPCS) || NPCS[id] === EP8_NPCS[id], `npc ${id} exists already`);
  const out = registerScenes();
  assert.deepEqual(out, { scenes: [], lines: [], conditions: [] });
  assert.deepEqual(registerScenes(), { scenes: [], lines: [], conditions: [] }, 'registering twice collides with nothing');
  for (const id of Object.keys(scenes)) assert.equal(STORY.SCENES[id], scenes[id]);
  assert.equal(STORY_IDS.length, STORY_COUNT, `story scenes: ${STORY_IDS.length} (plan 2.5: 27 main and chained, 8 side, 2 silent)`);
  assert.equal(SIDE.length, 8);
  assert.equal(SILENT.length, 2);
  assert.equal(STORY_IDS.length - SIDE.length - SILENT.length, 27);
  assert.equal(MAIN_PATH.length + CHAINED.length - SILENT.length, 27);
  for (const id of [...SIDE, ...SILENT, ...MAIN_PATH, ...CHAINED]) assert.ok(STORY_IDS.includes(id), id);
  assert.deepEqual(TOLL_IDS, EP8_TOLL_NAMES.map((_, i) => `ep8_toll_${i + 1}`));
  assert.equal(Object.keys(scenes).length, STORY_COUNT + 12);
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

test('scene conditions exist for every scene, use declared flags, and only ep8_morning needs the switch', () => {
  for (const id of Object.keys(scenes)) assert.ok(SCENE_CONDITIONS[id], `condition for ${id}`);
  for (const [id, c] of Object.entries(SCENE_CONDITIONS)) {
    for (const f of [c.if, c.ifNot].flat().filter(Boolean)) assert.ok(KNOWN(f), `${id}: undeclared ${f}`);
    assert.equal(!!c.live, id === 'ep8_morning', `${id}: live`);
  }
  assert.ok([SCENE_CONDITIONS.ep8_morning.ifNot].flat().includes('tier_1'));
  assert.ok([SCENE_CONDITIONS.ep8_morning.ifNot].flat().includes('ep8_morning_done'));
  assert.ok([SCENE_CONDITIONS.ep8_morning.if].flat().includes('ep7_complete'));
  for (const [id, c] of Object.entries(SCENE_CONDITIONS)) {
    if (id === 'ep8_morning') continue;
    assert.ok([c.if].flat().filter(Boolean).some((f) => f in EP8_FLAGS), `${id}: guarded by an Episode 8 flag`);
  }
});

test('every flag a scene sets or checks is declared; every main flag is set by a scene', () => {
  const set = new Set();
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) {
    if (e.op === 'setFlag') { set.add(e.args[0]); assert.ok(e.args[0] in EP8_FLAGS, `${id}: setFlag ${e.args[0]} is not an Episode 8 flag`); }
    if (e.op === 'hasFlag') assert.ok(KNOWN(e.args[0]), `${id}: hasFlag ${e.args[0]}`);
  }
  for (const f of MAIN_FLAGS) assert.ok(set.has(f), `no scene sets ${f}`);
  for (const f of ['afraid_yes', 'afraid_no', 'told_elowen', 'spared_elowen', 'answered_yes', 'answered_page', 'told_hazel', 'spared_hazel',
    'ending_return', 'ending_choose', 'concordance_lit', 'archive_open', 'drift_done']) assert.ok(set.has(f), `no scene sets ${f}`);
});

test('every id a scene references exists or is a planned Episode 8 id', () => {
  const manifest = JSON.parse(read(join(NEXT, 'assets', 'audio', 'manifest.json')));
  const speakers = new Set([...PARTY, ...Object.keys(NPCS), ...Object.keys(EP8_NPCS), ...Object.keys(SPEAKER_NAMES), ...Object.keys(EP8_SPEAKERS)]);
  for (const id of Object.keys(RUNS)) {
    const spawned = new Set();
    for (const e of allOps(id)) {
      const a = e.args;
      switch (e.op) {
        case 'spawn': spawned.add(a[0]); assert.ok(a[1] && a[1].sprite && a[1].name && a[1].at, `${id}: spawn ${a[0]} needs sprite, name, at`);
          assert.ok(EP8_SPRITES.includes(a[1].sprite), `${id}: sprite ${a[1].sprite}`);
          assert.notEqual(a[0], 'vex', `${id}: Vex is vex_k, never the in-glass id`); break;
        case 'say': if (a[0] != null) assert.ok(speakers.has(a[0]) || spawned.has(a[0]), `${id}: speaker ${a[0]}`); break;
        case 'emote': assert.ok(EMOTES.includes(a[1]), `${id}: emote ${a[1]}`); break;
        case 'face': assert.ok(DIRS.includes(a[1]) || speakers.has(a[1]) || spawned.has(a[1]), `${id}: face ${a[1]}`); break;
        case 'walk': if (typeof a[1] === 'string' && speakers.has(a[1])) assert.ok(PARTY.includes(a[1]), `${id}: walk to ${a[1]}`); break;
        case 'music': assert.ok(a[0] === null || a[0] in manifest.music || EP8_MUSIC.includes(a[0]), `${id}: music ${a[0]}`); break;
        case 'sfx': assert.ok(a[0] in manifest.sfx || EP8_SFX.includes(a[0]) || EP2_SFX.includes(a[0]), `${id}: sfx ${a[0]}`); break;
        case 'tint': assert.ok(TINTS.includes(a[0]), `${id}: tint ${a[0]}`); break;
        case 'battle': assert.ok(ENCOUNTER_IDS.includes(a[0]), `${id}: battle ${a[0]}`); break;
        case 'give': case 'take': assert.ok(a[0] === 'gold' || ITEM_IDS.includes(a[0]) || CORE_ITEMS.includes(a[0]), `${id}: item ${a[0]}`); break;
        case 'closeup': assert.ok(a[0] === null || PAGE_IDS.includes(a[0]), `${id}: closeup ${a[0]}`); break;
        case 'warp': assert.ok([['ep8_stair', ...STAIR_FOOT], ['ep8_bell_night', ...BELL_FOOT]].some((w) => w.every((v, i) => a[i] === v)), `${id}: warp ${a}`); break;
        default:
      }
    }
  }
  for (const [k, r] of Object.entries(REWARDS_EP8)) assert.ok(ITEM_IDS.includes(r.item) || CORE_ITEMS.includes(r.item), `reward ${k}: ${r.item}`);
  // the warps land where the maps say: the bell night is bell_tower's copy (its stair_foot), the home door is inside hero_home
  assert.deepEqual(BELL_TOWER.marks.stair_foot, BELL_FOOT);
  assert.ok(HOME_DOOR[1] > HERO_HOME.marks.hazel_start[1] && HOME_DOOR[1] < 11, 'the home door lands inside, below Hazel');
  assert.ok(HERO_HOME.marks.hazel_start, 'hazel_start on hero_home');
});

test('every box fits: 3 lines of 42 characters with the longest hero name (8); choices fit; ASCII; titles and cards fit', () => {
  const bad = [];
  const ascii = (s) => /^[\x20-\x7e]*$/.test(s);
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) {
    const text = e.op === 'say' ? e.args[1] : e.op === 'title' ? e.args[0] : null;
    if (text != null && !fits(text, { heroName: 'W'.repeat(8) })) bad.push(`${id}: ${boxLines(text).join(' / ')}`);
    if (text != null && !ascii(text)) bad.push(`${id}: non-ASCII ${text}`);
    if (text != null && text.includes(EM)) bad.push(`${id}: em dash`);
    if (e.op === 'title' && (text.length > 42 || (e.args[1]?.sub && e.args[1].sub.length > 42))) bad.push(`${id}: title over 42`);
    if (e.op === 'choice') for (const o of e.args[0]) if (o.length > 28 || !ascii(o)) bad.push(`${id} choice: ${o}`);
  }
  assert.deepEqual(bad, []);
  for (const c of [EPISODE8_CARD, END_TITLE_EP8, END_CARD_EP8, COLD_OPEN_CARD, ...Object.values(EP8_BOSS_CARDS).map((x) => ({ text: x.name, sub: x.sub }))]) {
    assert.ok(c.text.length <= 42 && c.sub.length <= 42, c.text);
  }
});

// The novel rules (EPISODE8 section 8): the fire is never plain, the birth line says a child, Elowen is never a bookbinder,
// the First Keeper's own name is never written, the hero is never named a son.
test('the novel rules: the vault fire, a child, Keeper of the Scriptorium, no name for the First Keeper', () => {
  for (const id of Object.keys(RUNS)) for (const e of says(allOps(id))) {
    const t = e.args[1];
    assert.ok(!/\bthe fire\b/i.test(t.replace(/the fire in the east wing/gi, '')), `${id}: plain "the fire": ${t}`);
    assert.ok(!/\b(son|his son|her son|bookbinder|Sable)\b/i.test(t), `${id}: ${t}`);
  }
  for (const t of Object.values(EP8_LINES).flatMap((v) => JSON.stringify(v))) assert.ok(!/\bthe fire\b(?! in the east wing)/i.test(t.replace(/vault fire/g, '')), t);
  const lp = says(allOps('last_page')).map((e) => e.args[1]);
  assert.ok(lp.includes('A child, to Elowen, Keeper of the Scriptorium.'), 'the birth line reads A child');
  assert.ok(lp.some((t) => /in the cold hand, a name\./.test(t)), 'his own name is a name, never written');
});

// The speaker swap across three records: the Librarian at the Index and at the lectern, the Eraser from the hood, the First
// Keeper from the face; all on the same mark. Before keeper_named, no Scriptorium scene line calls the Librarian the First
// Keeper (the one canon witness line names the First Keeper as a past office, never as the Librarian).
const SCRIPTORIUM = ['scriptorium_arrival', 'first_word', 'meet_librarian', 'elowen_scriptorium', 'library_door', 'concordance_start', 'testimony_ione',
  'testimony_fen', 'concordance_light', 'drift_start', 'drift_done'];
const CANON_FK = 'The oldest pages were amended by the First Keeper, not written by fate. Even he was afraid.';
test('one man, three records: the Librarian, the Eraser, the First Keeper, swapped on one mark; no early First Keeper in the Scriptorium', async () => {
  for (const id of SCRIPTORIUM) for (const e of says(allOps(id))) {
    assert.ok(!/First Keeper/.test(e.args[1]), `${id}: "${e.args[1]}" before keeper_named`);
  }
  assert.ok(says(allOps('testimony_elowen')).every((e) => !/First Keeper/.test(e.args[1]) || e.args[1] === CANON_FK), 'Elowen: canon only');
  for (const id of Object.keys(RUNS)) for (const e of says(allOps(id))) {
    if (e.args[0] === 'ep8_librarian') assert.ok(!/First Keeper|Eraser/.test(e.args[1]), `${id}: the Librarian names himself`);
    if (e.args[0] === 'eraser_v') assert.equal(e.args[1], e.args[1].toUpperCase(), `${id}: the Eraser in capitals`);
  }
  const log = await one('eraser', ['name_told']);
  const lib = log.findIndex((e) => e.op === 'say' && e.args[0] === 'ep8_librarian');
  const desp = log.findIndex((e) => e.op === 'despawn' && e.args[0] === 'ep8_librarian');
  const swap = log.findIndex((e) => e.op === 'spawn' && e.args[0] === 'eraser_v');
  const er = log.findIndex((e) => e.op === 'say' && e.args[0] === 'eraser_v');
  assert.ok(lib > 0 && desp > lib && swap === desp + 1 && er > swap, 'the Librarian becomes the Eraser on one beat');
  assert.equal(log[swap].args[1].at, ops(log, 'spawn').find((e) => e.args[0] === 'ep8_librarian').args[1].at);
  assert.equal(log[swap].args[1].name, 'The Eraser');
  const after = await one('eraser_after', ['eraser_defeated']);
  const d2 = after.findIndex((e) => e.op === 'despawn' && e.args[0] === 'eraser_v');
  const s2 = after.findIndex((e) => e.op === 'spawn' && e.args[0] === 'first_keeper');
  assert.ok(d2 > 0 && s2 === d2 + 1, 'the Eraser becomes the First Keeper on one beat');
  assert.equal(after[s2].args[1].at, 'lectern');
  assert.ok(!says(after.slice(0, s2)).some((e) => e.args[0] === 'first_keeper'), 'no First Keeper line before his face');
  assert.equal(SPEAKER_NAMES.eraser_v, 'The Eraser');
  assert.equal(SPEAKER_NAMES.first_keeper_m, 'The First Keeper');
  assert.equal(EP8_NPCS.ep8_librarian.name, 'The Librarian');
  assert.equal(EP8_NPCS.first_keeper.name, 'The First Keeper');
  assert.deepEqual(EP8_NPCS.first_keeper.show, { if: 'keeper_named' });
});

test('the hero never speaks in a box; Read Aloud is learned on its flag; the hero turns at the name', async () => {
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) if (e.op === 'say') assert.notEqual(e.args[0], 'hero', `${id}: the hero speaks`);
  const fw = await one('first_word', ['scriptorium_arrived']);
  const learnAt = fw.findIndex((e) => e.op === 'say' && /learned Read Aloud/.test(e.args[1]));
  const flagAt = fw.findIndex((e) => e.op === 'setFlag' && e.args[0] === 'read_learned');
  assert.ok(flagAt >= 0 && learnAt > flagAt, 'read_learned is set before the learn line');
  assert.match(fw[learnAt].args[1], /Read an ally's lines back: what was rubbed out returns, and an unwriting breaks\./);
  assert.ok(fw.some((e) => e.op === 'tint' && e.args[0] === 'rubout' && e.args[1] >= 120), 'the rubout tint fades in over 2 s or more');
  const after = await one('eraser_after', ['eraser_defeated']);
  const said = after.findIndex((e) => e.op === 'say' && e.args[0] === 'mira' && e.args[1] === '{hero}.');
  assert.ok(said > 0 && after[said + 1].op === 'face' && after[said + 1].args[0] === 'hero', 'the hero turns at the name');
  const open = await one('scriptorium_open', ['page_shelved', 'told_elowen']);
  const el = open.findIndex((e) => e.op === 'say' && e.args[0] === 'elowen' && e.args[1] === '{hero}.');
  assert.ok(el > 0 && open[el + 1].op === 'face' && open[el + 1].args[0] === 'hero', 'the hero turns at it in the square');
});

// The staging rule (CRITIQUE_6 item 11): the party is on its marks before the first line of anyone outside it. home's
// Hazel walks up to the party at the door (its goto lands the party; on black there is nobody to walk to).
const STAGED = ['ep8_morning', 'ep8_roof', 'stair_arrival', 'first_book', 'rubbed_steps', 'scriptorium_arrival', 'first_word', 'meet_librarian',
  'elowen_scriptorium', 'library_door', 'keeper_memory_a', 'keeper_memory_b', 'keeper_memory_c', 'the_name', 'eraser', 'last_page',
  'scriptorium_open', 'concordance_light'];
const REVISIT = ['sentry_tried', 'eraser_tried', 'concordance_lit'];
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
  // home with the door helper: Hazel walks up to the hero after the goto
  const h = (await runOnce(withHelpers(scenes.home), { flags: [...EP7_DONE, 'scriptorium_open'], branchFlags: false })).log;
  const go = h.findIndex((e) => e.op === 'sfx' && e.args[0] === 'helper:goto');
  const walk = h.findIndex((e) => e.op === 'walk' && e.args[0] === 'hazel' && e.args[1] === 'hero');
  const first = h.findIndex((e) => e.op === 'say' && e.args[0] === 'hazel');
  assert.ok(go > 0 && walk > go && first > walk, 'the goto, then Hazel walks up, then she speaks');
  const plain = await one('home', ['scriptorium_open']);
  assert.equal(says(plain).length, says(h).length + 1, 'on black: one narration box for the door');
});

test('STAGING_EP8.md documents every scene, every mark, every inspect line and realm book, the focus marks and the witness flags', () => {
  const staging = read(join(NEXT, 'docs', 'story', 'STAGING_EP8.md'));
  const missing = [];
  for (const id of Object.keys(scenes)) if (!staging.includes('`' + id + '`')) missing.push(`scene ${id}`);
  const actors = new Set([...PARTY, ...Object.keys(NPCS), ...Object.keys(EP8_NPCS)]);
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) if (e.op === 'spawn') actors.add(e.args[0]);
  for (const id of Object.keys(RUNS)) for (const e of allOps(id)) {
    let mark = null;
    if (e.op === 'walk' && typeof e.args[1] === 'string') mark = e.args[1];
    if (e.op === 'camera.panTo') mark = e.args[0];
    if (e.op === 'spawn') mark = e.args[1]?.at;
    if (mark && !actors.has(mark) && !staging.includes('`' + mark + '`')) missing.push(`${id}: mark ${mark}`);
  }
  for (const id of Object.keys(EP8_LINES)) if (!staging.includes('`' + id + '`')) missing.push(`line ${id}`);
  for (const ev of Object.keys(EP8_REALMS)) if (!staging.includes('`' + ev + '`')) missing.push(`realm book ${ev}`);
  for (const f of WITNESS_FLAGS) if (!staging.includes('`' + f + '`')) missing.push(`witness ${f}`);
  for (const f of ['EP8_LIVE', 'credits7_rolled', 'credits8_rolled', 'PAGE_KINDS', 'END_CARD_EP8', 'END_CARD_EP7_LIVE', 's.inkBlot', 's.hudNameFlash',
    's.tollName', 's.goto', 'Focus marks', 'keeper_chair', 'watch_stage', 'vex_k', 'nox_t', 'Stephen']) if (!staging.includes(f)) missing.push(f);
  assert.deepEqual([...new Set(missing)], []);
  // every staged map lists its focus marks (camera rule: 12 tiles from the sides, 7 from the top and bottom)
  for (const map of ['ep8_stair', 'ep8_scriptorium', 'ep8_library_f1', 'ep8_library_f2', 'ep8_library_f3', 'ep8_last_word', 'ep7_stillheart']) {
    assert.match(staging, new RegExp(`Focus marks, \`${map}\``), `${map}: focus marks`);
  }
});

// A chained scene's own boxes: count until the chain point.
const ownBoxes = (log, stop) => {
  const i = stop ? log.findIndex(stop) : -1;
  return says(i < 0 ? log : log.slice(0, i)).length;
};
const STOPS = {
  eraser: (e) => e.op === 'battle',
  eraser_after: (e) => e.op === 'say' && e.args[1] === 'The names are theirs again. How do they go back?',
  last_choice: (e) => e.op === 'say' && e.args[1] === "That's your place. It's been empty a long time.",
};
test('box budgets: 12 per main scene (6 morning; 14 Elowen and home; 16 memory, name, Eraser, last page, square; 18 after), about 215 in all', () => {
  const over = [];
  let total = 0;
  for (const id of [...MAIN_PATH, ...CHAINED]) {
    const cap = BOX_BUDGET[id] ?? BOX_BUDGET.default;
    const most = Math.max(...RUNS[id].map((r) => ownBoxes(r.log, STOPS[id])));
    if (most > cap) over.push(`${id}: ${most} > ${cap}`);
    total += most;
  }
  assert.deepEqual(over, []);
  assert.deepEqual(BOX_BUDGET, { default: 12, ep8_morning: 6, elowen_scriptorium: 14, keeper_memory_c: 16, the_name: 16, eraser: 16,
    eraser_after: 18, last_page: 16, scriptorium_open: 16, home: 14 });
  assert.ok(total >= 195 && total <= 230, `main path boxes: ${total}`);
  console.log(`# Episode 8 main path: ${total} boxes over ${MAIN_PATH.length + CHAINED.length} scenes`);
});

// The first five minutes (EPISODE8 section 1's table): the note by about 0:30 (box 3), control by about 0:45 (6 boxes),
// Nox's choice by 2:20 (the roof's third box), the fight by 4:00 (two boxes into first_rub; under 20 boxes before it).
test('the first five minutes: the note on the third box, six boxes, the choice on the roof, the fight fast', async () => {
  await withPages(async () => {
    const log = await one('ep8_morning', []);
    const opened = log.findIndex((e) => e.op === 'closeup' && e.args[0] === 'ep8_note');
    assert.ok(opened >= 0 && says(log.slice(0, opened)).length === 2, 'the note opens on the third box');
    assert.equal(log.slice(0, log.findIndex((e, i) => i > opened && e.op === 'say')).filter((e) => e.op === 'music').at(-1).args[0], null,
      'silence on the note');
    assert.equal(says(log).length, 6);
    assert.deepEqual(says(log).slice(0, 2).map((e) => e.args[1]), ['I kept every door closed because I could not endure another farewell.',
      'Palehaven has opened the gates. The last truth lies in the First Library.']);
    assert.ok(ops(log, 'give').some((e) => e.args[0] === 'vex_note'));
  });
  const roof = await one('ep8_roof', ['ep8_started']);
  const ch = roof.findIndex((e) => e.op === 'choice');
  assert.deepEqual(roof[ch].args[0], ['Yes.', 'No.']);
  assert.equal(says(roof.slice(0, ch)).at(-1).args[1], 'Are you frightened?');
  assert.ok(says(roof.slice(0, ch)).length <= 3, 'the choice by the third box');
  const fight = await one('first_rub', ['stair_arrived']);
  assert.ok(says(fight.slice(0, fight.findIndex((e) => e.op === 'battle'))).length <= 2, 'the fight comes fast');
  assert.deepEqual(ops(fight, 'battle')[0].args.slice(0, 2), ['e8s_first', { canFlee: false }]);
  assert.equal(says(fight)[1].args[1], 'If it rubs something out, use something else.', 'the line names the answer');
  assert.ok(!says(fight).some((e) => /tutorial|press|button/i.test(e.args[1])), 'no tutorial box');
  const before = says(await one('ep8_morning', [])).length + says(roof).length + says(await one('stair_arrival', ['ep8_roofed'])).length + 2;
  assert.ok(before <= 20, `boxes before the first fight: ${before}`);
  assert.ok(says(fight).some((e) => e.args[1] === 'Why never yours?'));
});

test('the payoffs open their close-up pages when the kinds exist, each mode on its box, closed before the field moves', async () => {
  for (const id of Object.keys(PAYOFFS)) for (const e of allOps(id)) assert.notEqual(e.op, 'closeup', `${id}: closeup with no page kind`);
  await withPages(async () => {
    const STATE = { ep8_morning: [], first_word: ['scriptorium_arrived'], meet_librarian: ['read_learned'], elowen_scriptorium: ['read_learned'],
      keeper_memory_b: ['lib_f2_arrived'], keeper_memory_c: ['lib_f3_arrived'], last_page: ['keeper_named', 'ending_return'] };
    for (const [id, want] of Object.entries(PAYOFFS)) {
      const log = await one(id, STATE[id]);
      const opens = ops(log, 'closeup').filter((e) => e.args[0]);
      assert.deepEqual(opens.map((e) => [e.args[0], e.args[1]?.mode, e.args[1]?.step]), want, id);
      let open = false;
      for (const e of log) {
        if (e.op === 'closeup') open = !!e.args[0];
        if (open && (e.op === 'walk' || e.op === 'spawn' || e.op === 'despawn')) assert.fail(`${id}: ${e.op} while a page is open`);
      }
      assert.ok(!open, `${id}: page left open`);
    }
    // the run in three steps (CRITIQUE_8 item 5): each step's box is said while its own step is up; the star last
    const log = await one('last_page', ['keeper_named', 'ending_choose']);
    let mode = null;
    const said = [];
    for (const e of log) {
      if (e.op === 'closeup') mode = e.args[0] ? `${e.args[0]}:${e.args[1]?.mode || ''}:${e.args[1]?.step || ''}` : null;
      if (e.op === 'say' && mode) said.push([mode, e.args[1]]);
    }
    const at = (re) => said.find(([, t]) => re.test(t))?.[0];
    assert.equal(at(/^A child, to Elowen/), 'ep8_shelf:run:1');
    assert.equal(at(/^Then eleven names/), 'ep8_shelf:run:2');
    assert.equal(at(/nobody's doing lifts off/), 'ep8_shelf:run:3');
    assert.equal(at(/the eighth star lights/), 'ep8_shelf:star:');
    assert.equal(at(/turns the final page/), 'ep8_last_page::');
    const mc = await one('keeper_memory_c', ['lib_f3_arrived']);
    let m2 = null;
    const s2 = [];
    for (const e of mc) { if (e.op === 'closeup') m2 = e.args[0] ? e.args[1]?.mode : null; if (e.op === 'say' && m2) s2.push([m2, e.args[1]]); }
    assert.ok(s2.some(([md, t]) => md === 'run' && /nobody's doing/.test(t)));
    assert.ok(s2.some(([md, t]) => md === 'note' && /I could not\.$/.test(t)));
  });
  const plain = says(await one('last_page', ['keeper_named', 'ending_return'])).length;
  await withPages(async () => assert.equal(says(await one('last_page', ['keeper_named', 'ending_return'])).length, plain));
});

test('a full playthrough from a finished Episode 7 reaches ep8_complete with every main flag, in order', async () => {
  const give = (...f) => (set) => f.forEach((x) => set.add(x));
  const order = ['ep8_morning', 'ep8_roof', 'stair_arrival', 'first_book', (s) => assert.ok(!s.has('first_book_read'), 'the book waits for the fight'),
    'first_rub', 'first_book', 'rubbed_steps', 'south_margin', 'scriptorium_arrival', 'meet_librarian',
    (s) => assert.ok(!s.has('librarian_met'), 'the Index waits for the word'), 'first_word', 'meet_librarian', 'library_door',
    (s) => assert.ok(!s.has('library_open'), 'the door waits for Elowen'), 'elowen_scriptorium', 'library_door', 'catalog_arrival', 'keeper_memory_a',
    give('ink_key_found'), 'library_f1_lift', 'palimpsest_arrival', 'keeper_memory_b', 'library_f2_lift',
    (s) => assert.ok(!s.has('library_f2_done'), 'the lift waits for the Sentry'), 'unnamed_sentry', 'library_f2_lift', 'unwritten_arrival',
    'keeper_memory_c', 'the_name', 'eraser', 'scriptorium_open', 'home', 'thirteenth_name',
    ...TOLL_IDS, 'thirteenth_name'];
  const { set, logs } = await playthrough(scenes, order, { flags: EP7_DONE });
  for (const f of MAIN_FLAGS) assert.ok(set.has(f), `missing ${f}`);
  assert.ok(set.has('afraid_yes') && !set.has('afraid_no'));
  assert.ok(set.has('told_elowen') && !set.has('spared_elowen'));
  assert.ok(set.has('ending_return') && !set.has('ending_choose'));
  assert.ok(set.has('told_hazel') && !set.has('spared_hazel'));
  assert.ok(!says(logs.thirteenth_name[0]).length, 'the bell night opens with no box');
  // nothing replays
  const again = await playthrough(scenes, [...MAIN_PATH, ...CHAINED, ...TOLL_IDS], { flags: [...set] });
  for (const lg of Object.values(again.logs)) for (const log of lg) assert.ok(!ops(log, 'say').length, 'a main scene replayed');
});

test('the switch: with EP8_LIVE false nothing in Episode 8 is reachable; Fine Print never starts it; Episode 7 unfinished does not', async () => {
  GATE.live = false;
  try {
    const { set } = await playthrough(scenes, Object.keys(scenes), { flags: EP7_DONE });
    for (const f of Object.keys(EP8_FLAGS)) assert.ok(!set.has(f), `${f} set with the switch off`);
  } finally { GATE.live = true; }
  const fp = await playthrough(scenes, Object.keys(scenes), { flags: [...EP7_DONE, 'tier_1'] });
  for (const f of Object.keys(EP8_FLAGS)) assert.ok(!fp.set.has(f), `${f} set on a Fine Print run`);
  const early = await playthrough(scenes, Object.keys(scenes), { flags: EP7_DONE.filter((f) => f !== 'ep7_complete') });
  for (const f of Object.keys(EP8_FLAGS)) assert.ok(!early.set.has(f), `${f} set before ep7_complete`);
  const ok = await playthrough(scenes, ['ep8_morning'], { flags: EP7_DONE });
  assert.ok(ok.set.has('ep8_started'));
  // the module switch itself is the core one, read through a namespace (EP8_LIVE may not exist yet: then false)
  const EPISODES = await import('../../src/game/episodes.js');
  const fresh = await import(`../../src/data/ep8/story.js?gate=${Date.now()}`);
  assert.equal(fresh.GATE.live, EPISODES.EP8_LIVE === true);
  assert.notEqual(EPISODES.EP8_LIVE, true, 'EP8_LIVE stays false until E8-integrate');
});

// Each map's track (plan 8.2). A scene that changes the music puts its map's track back before it ends.
const SCENE_TRACK = {
  ep8_morning: 'palehaven', ep8_roof: 'orrery', rubbed_steps: 'orrery', south_margin: 'orrery', scriptorium_arrival: 'scriptorium_town',
  first_word: 'scriptorium_town', meet_librarian: 'mystery', elowen_scriptorium: 'scriptorium_town', keeper_memory_a: 'first_library',
  keeper_memory_b: 'first_library', unnamed_sentry: 'first_library', keeper_memory_c: 'mystery', the_name: 'mystery', last_page: 'scriptorium_town',
  scriptorium_open: 'scriptorium_town', home: 'willowmere',
};
test('music cues follow the cue sheet and return to the map track (plan 8.3)', async () => {
  for (const [id, track] of Object.entries(SCENE_TRACK)) for (const r of RUNS[id]) {
    const m = musics(r.log);
    const lost = ops(r.log, 'battle').some((e) => e.args[2] === 'lose');
    if (m.length && !lost) assert.equal(m.at(-1), track, `${id} ends on ${m.at(-1)}`);
  }
  const mus = async (id, flags) => musics(await one(id, flags));
  assert.deepEqual(await mus('ep8_morning', []), ['palehaven', null, 'palehaven']);
  assert.deepEqual(await mus('ep8_roof', ['ep8_started']), ['palehaven', null, 'orrery']);
  assert.deepEqual(await mus('rubbed_steps', ['first_book_read']), [null, 'orrery']);
  assert.deepEqual(await mus('south_margin', ['stair_arrived']), ['mystery', 'orrery']);
  assert.deepEqual(await mus('first_word', ['scriptorium_arrived']), [null, 'scriptorium_town']);
  assert.deepEqual(await mus('meet_librarian', ['read_learned']), ['mystery', null, 'mystery']);
  assert.deepEqual(await mus('elowen_scriptorium', ['read_learned']), ['scriptorium_town', null, 'scriptorium_town']);
  assert.deepEqual(await mus('keeper_memory_a', ['lib_f1_arrived']), ['sorrow', 'first_library']);
  assert.deepEqual(await mus('keeper_memory_c', ['lib_f3_arrived']), ['sorrow', 'mystery']);
  assert.deepEqual(await mus('the_name', ['keeper_memory_c', 'ink_key_found']), [null, 'mystery']);
  assert.deepEqual(await mus('unnamed_sentry', ['lib_f2_arrived']), [null, 'battle', 'first_library']);
  assert.deepEqual(await mus('eraser', ['name_told']).then((m) => m.slice(0, 7)), [null, 'boss_eraser', 'sorrow', 'triumph', 'mystery', 'mystery', null]);
  assert.deepEqual(await mus('home', ['scriptorium_open']), [null, 'triumph', 'willowmere']);
  for (const id of ['keeper_memory_a', 'keeper_memory_b', 'keeper_memory_c']) assert.ok(allOps(id).some((e) => e.op === 'sfx' && e.args[0] === 'bell_toll'), id);
  const name = await one('the_name', ['keeper_memory_c', 'ink_key_found']);
  assert.equal(ops(name, 'sfx').filter((e) => e.args[0] === 'bell_thirteenth').length, 1, 'one bell on the name');
  const bt = name.findIndex((e) => e.op === 'sfx' && e.args[0] === 'bell_thirteenth');
  assert.equal(name.slice(bt).find((e) => e.op === 'say').args[1], '{hero}.');
});

test('boss intros: silence, the card, the theme, then the battle; a retry is short; a loss sets nothing after', async () => {
  for (const [id, flags, theme] of [['unnamed_sentry', ['lib_f2_arrived'], 'battle'], ['eraser', ['name_told'], 'boss_eraser']]) {
    const log = await one(id, flags);
    const at = (op) => log.findIndex((e) => e.op === op);
    assert.equal(log[at('music')].args[0], null);
    assert.equal(log[at('title')].args[0], EP8_BOSS_CARDS[id].name);
    assert.equal(log[at('title')].args[1].sub, EP8_BOSS_CARDS[id].sub);
    assert.ok(at('title') < at('battle'));
    assert.equal(log.slice(at('title'), at('battle')).find((e) => e.op === 'music').args[0], theme);
    assert.ok(says(log).some((e) => e.args[1] === EP8_ARC_LINES[id]), `${id}: the arc line`);
    const tried = id === 'eraser' ? 'eraser_tried' : 'sentry_tried';
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

test('the three truth choices: Nox one line in the_name; Elowen her gift; Hazel one line at the door (and her post-game line)', async () => {
  const lines = async (id, base, f) => says(await one(id, [...base, ...f])).map((e) => e.args[1]);
  const diff = (x, y) => x.filter((t, i) => t !== y[i]).length;
  const nb = ['keeper_memory_c', 'ink_key_found'];
  const ny = await lines('the_name', nb, ['afraid_yes']), nn = await lines('the_name', nb, ['afraid_no']);
  assert.equal(ny.length, nn.length);
  assert.equal(diff(ny, nn), 1, 'one Nox line differs in the_name');
  const gift = (log) => ops(log, 'give').map((e) => e.args[0]).filter((x) => x === 'binders_awl' || x === 'riverwater_thread');
  assert.deepEqual(gift(await one('scriptorium_open', ['page_shelved', 'told_elowen'])), ['binders_awl']);
  assert.deepEqual(gift(await one('scriptorium_open', ['page_shelved', 'spared_elowen'])), ['riverwater_thread']);
  for (const [id, a, b, base] of [['ep8_roof', 'afraid_yes', 'afraid_no'], ['elowen_scriptorium', 'told_elowen', 'spared_elowen'], ['home', 'told_hazel', 'spared_hazel'],
    ['eraser', 'answered_yes', 'answered_page']]) {
    const sets = RUNS[id].filter((r) => ops(r.log, 'choice').length).map((r) => ops(r.log, 'setFlag').map((e) => e.args[0]));
    assert.ok(sets.some((s) => s.includes(a)) && sets.some((s) => s.includes(b)), id);
    assert.ok(sets.every((s) => !(s.includes(a) && s.includes(b))), `${id}: both`);
  }
  const el = await one('elowen_scriptorium', ['read_learned']);
  assert.deepEqual(ops(el, 'choice')[0].args[0], ['Not really.', 'Every day.']);
  assert.equal(says(el.slice(0, el.findIndex((e) => e.op === 'choice'))).at(-1).args[1], 'Did you ever wonder who left you?');
  const hm = await one('home', ['scriptorium_open']);
  assert.deepEqual(ops(hm, 'choice')[0].args[0], ['I did.', 'No.']);
  // the canon and held lines, word for word
  const all = Object.keys(RUNS).flatMap((id) => says(allOps(id)).map((e) => e.args[1]));
  for (const t of ['I kept every door closed because I could not endure another farewell.',
    'Palehaven has opened the gates. The last truth lies in the First Library.',
    'The Eraser was once the First Keeper. He believes forgetting is mercy.', 'Names are windows. Not chains.',
    'I kept one thing from the Eraser: your beginning. You keep the ending.', 'AN EMPTY PAGE IS A PEACEFUL PAGE.',
    'The First Lexicon opens. Each rescued word takes its rightful place.', '{hero} turns the final page. It is empty, ready for the next story.',
    'I cannot repair what I erased, but I can help return the keys to those whose names were stolen.', 'The Library belongs to them now.',
    'Pages drift out of the stacks when nobody is looking.', 'I found a book with only the first word written. The rest was waiting for me.',
    'A new flame appears whenever someone tells the truth.', 'Memories can hurt and still be worth keeping.', 'We have brought the names this far.',
    'Whatever waits, it does not face you alone.', 'An honest archive must record both joy and loss.',
    'The Eraser destroyed it because he could not bear the people he had lost.', CANON_FK,
    'The original record was deliberately left unfinished so its ending could be chosen.',
    ...ENDINGS.return.lines, ...ENDINGS.choose.lines, ...WITNESS_LINES.many, ...WITNESS_LINES.few]) assert.ok(all.includes(t), t);
  assert.equal(ENDINGS.return.label, 'Return every stolen name');
  assert.equal(ENDINGS.choose.label, 'Let each person choose');
  assert.equal(ENDINGS.return.title, 'Ending: Every Name Returned');
  assert.equal(ENDINGS.choose.title, 'Ending: The Right to Choose');
});

test('the final choice: asked once more before it commits, No goes back, and it never runs twice or offers the other', async () => {
  const log = await one('last_choice', ['keeper_named'], { decisions: [] });
  const chs = ops(log, 'choice');
  assert.deepEqual(chs[0].args[0], ['Return every stolen name', 'Let each person choose']);
  assert.deepEqual(chs[1].args[0], ['Yes.', 'No.'], 'the confirm');
  assert.equal(says(log.slice(0, log.indexOf(chs[1]))).at(-1).args[1], ENDINGS.return.confirm);
  // No, then the other, then Yes: the choose ending, and the first question asked again in between
  const r = await runOnce(scenes.last_choice, { flags: [...EP7_DONE, 'keeper_named'], branchFlags: false, decisions: [0, 1, 1, 0] });
  assert.ok(r.log.some((e) => e.op === 'setFlag' && e.args[0] === 'ending_choose'));
  assert.ok(!r.log.some((e) => e.op === 'setFlag' && e.args[0] === 'ending_return'));
  assert.equal(says(r.log).filter((e) => e.args[1] === 'The names are theirs again. How do they go back?').length, 2);
  // the cancel answer of every choice is its last option: the confirm's No, never a commit
  assert.equal(chs[1].args[0].at(-1), 'No.');
  // No twice: nothing is set, and the scene can run again
  const no = await runOnce(scenes.last_choice, { flags: [...EP7_DONE, 'keeper_named'], branchFlags: false, decisions: [0, 1, 0, 1] });
  assert.ok(!ops(no.log, 'setFlag').length, 'No, twice: nothing set');
  for (const f of ['ending_return', 'ending_choose']) {
    const again = await one('last_choice', ['keeper_named', f]);
    assert.ok(!ops(again, 'say').length && !ops(again, 'choice').length, `last_choice never runs again after ${f}`);
    for (const id of Object.keys(scenes)) {
      if (id === 'last_choice') continue;
      const lg = await one(id, [...MAIN_FLAGS, 'keeper_named', f]);
      assert.ok(!ops(lg, 'choice').some((e) => e.args[0].includes(ENDINGS.return.label) || e.args[0].includes(ENDINGS.choose.label)), `${id} offers the other ending`);
    }
  }
  assert.deepEqual([SCENE_CONDITIONS.last_choice.ifNot].flat().sort(), ['ending_choose', 'ending_return']);
});

test('the witness line counts the eight witness quests: five or more, the council; fewer, the seven councils', async () => {
  const lines = async (f) => says(await one('last_page', ['keeper_named', 'ending_return', ...f])).map((e) => e.args[1]);
  const five = await lines(WITNESS_FLAGS.slice(0, 5));
  const four = await lines(WITNESS_FLAGS.slice(0, 4));
  assert.ok(WITNESS_LINES.many.every((t) => five.includes(t)) && !WITNESS_LINES.few.some((t) => five.includes(t)));
  assert.ok(WITNESS_LINES.few.every((t) => four.includes(t)) && !WITNESS_LINES.many.some((t) => four.includes(t)));
  for (const f of WITNESS_FLAGS) assert.ok(KNOWN(f), `witness flag ${f} declared`);
  assert.equal(WITNESS_FLAGS.length, 8);
});

// PLAYTEST_REVIEW_6 item 8 must not recur: each tip names a lever E8-battle's data has.
test("Mira's two boss tips each name a lever the boss's data has (plan 6.6)", async (t) => {
  assert.equal(TIPS.unnamed_sentry, "When it starts to unwrite one of us, I'll read them back. Keep me standing.");
  assert.equal(TIPS.eraser, 'When it unwrites one of us, I read them back. When it goes quiet, {hero}, answer it.');
  assert.ok(allOps('unnamed_sentry').some((e) => e.op === 'say' && e.args[0] === 'mira' && e.args[1] === TIPS.unnamed_sentry));
  assert.ok(allOps('eraser').some((e) => e.op === 'say' && e.args[0] === 'mira' && e.args[1] === TIPS.eraser));
  if (!ENEMIES8 || !SKILLS8 || !ENEMIES8.EP8_ENEMIES || !SKILLS8.EP8_SKILLS) { t.skip('E8-battle data not written yet (pending: unwrite, last_silence, read_aloud)'); return; }
  const E = ENEMIES8.EP8_ENEMIES, S = SKILLS8.EP8_SKILLS;
  const flagged = (sk, f) => !!sk && (sk[f] === true || sk.flag === f || [sk.flags].flat().includes(f));
  assert.ok(flagged(S.unwrite, 'unwrite'), 'unwrite carries the unwrite flag');
  assert.ok(flagged(S.last_silence, 'last_silence'), 'last_silence carries the last_silence flag');
  assert.ok(E.unnamed_sentry && E.eraser, 'the Sentry and the Eraser exist');
  const read = S.read_aloud;
  assert.ok(read && read.user === 'mira' && read.name === 'Read Aloud', "read_aloud is Mira's Read Aloud");
  assert.equal(read.learn && read.learn.flag, 'read_learned');
});

test('side stories: the folio lights once after three witnesses; the Archive wants its pages; Quinn takes three pages', async () => {
  const play = (order, flags) => playthrough(scenes, order, { flags: [...EP7_DONE, 'ep8_started', 'scriptorium_arrived', ...flags] });
  const r = await play(['concordance_light', 'concordance_start', 'concordance_light', 'testimony_fen', 'testimony_elowen', 'concordance_light',
    (s) => s.add('elowen_met'), 'testimony_elowen', 'concordance_light', 'concordance_light'], []);
  assert.ok(r.set.has('concordance_started') && r.set.has('testimony_ione') && r.set.has('concordance_lit') && r.set.has('concordance_done'));
  const gives = Object.values(r.logs).flat(2).filter((e) => e.op === 'give');
  assert.equal(gives.filter((e) => e.args[0] === 'bookcloth_coat').length, 1);
  assert.deepEqual(gives.filter((e) => e.args[0] === 'gold').map((e) => e.args[1]), [500]);
  assert.deepEqual(gives.filter((e) => e.args[0] === 'hi_potion' || e.args[0] === 'hi_ether').map((e) => e.args), [['hi_potion', 3], ['hi_ether', 2]]);
  const early = await play(['concordance_start', 'testimony_elowen', 'concordance_light'], []);
  assert.ok(!early.set.has('testimony_elowen'), "Elowen's witness waits for elowen_met");
  assert.ok(!early.set.has('concordance_lit'), 'the folio waits for all three witnesses');
  const ar = await play(['uncensored_archive', (s) => ['page_names_found', 'page_order_found', 'page_correction_found'].forEach((f) => s.add(f)),
    'uncensored_archive', 'uncensored_archive'], ['lib_f2_arrived']);
  assert.ok(ar.set.has('archive_open'));
  assert.deepEqual(Object.values(ar.logs).flat(2).filter((e) => e.op === 'take').map((e) => e.args), [['evidence_page', 3]]);
  const shut = await play(['uncensored_archive'], ['lib_f2_arrived', 'page_names_found']);
  assert.ok(!shut.set.has('archive_open'), 'one page does not open it');
  const q = await play(['drift_start', 'drift_done', (s) => ['drift_1_found', 'drift_2_found', 'drift_3_found'].forEach((f) => s.add(f)),
    'drift_done', 'drift_done'], []);
  assert.ok(q.set.has('drift_started') && q.set.has('drift_done'));
  const all3 = Object.values(q.logs).flat(2);
  assert.deepEqual(all3.filter((e) => e.op === 'take').map((e) => e.args), [['drift_page', 3]]);
  assert.deepEqual(all3.filter((e) => e.op === 'give').map((e) => e.args[0]), ['runners_ribbon']);
});

test('the bell night: twelve tolls in the cold open\'s order with no box, the thirteenth shows {hero}, KEEP ONE, the card, the end', async () => {
  assert.deepEqual(EP8_TOLL_NAMES, TOLL_NAMES, "the cold open's twelve, in its order");
  for (const id of TOLL_IDS) for (const e of allOps(id)) assert.notEqual(e.op, 'say', `${id}: a toll speaks`);
  // step n only after step n-1
  const skip = await playthrough(scenes, [TOLL_IDS[3]], { flags: [...EP7_DONE, 'home_reached'] });
  assert.ok(!skip.set.has(TOLL_IDS[3]), 'a toll waits for the one below it');
  const h = (await runOnce(withHelpers(scenes[TOLL_IDS[0]]), { flags: [...EP7_DONE, 'home_reached'], branchFlags: false })).log;
  assert.ok(ops(h, 'sfx').some((e) => e.args[0] === 'helper:tollName'));
  assert.ok(ops(h, 'sfx').some((e) => e.args[0] === 'bell_toll'));
  const arrive = await one('thirteenth_name', ['home_reached']);
  assert.ok(!says(arrive).length && !ops(arrive, 'setFlag').length, 'the arrival: no box, nothing set');
  assert.ok(ops(arrive, 'spawn').some((e) => e.args[0] === 'mira_beam') && ops(arrive, 'spawn').some((e) => e.args[0] === 'bram_beam'));
  const top = await one('thirteenth_name', ['home_reached', ...TOLL_IDS]);
  assert.ok(ops(top, 'sfx').some((e) => e.args[0] === 'bell_thirteenth'));
  assert.deepEqual(says(top).map((e) => e.args[1]), ['{c:gold}{hero}{/c}'], 'without the helper, the name is one gold narration box');
  assert.equal(says(top)[0].args[0], null, 'never the hero speaking');
  const ht = (await runOnce(withHelpers(scenes.thirteenth_name), { flags: [...EP7_DONE, 'home_reached', ...TOLL_IDS], branchFlags: false })).log;
  assert.ok(!says(ht).length, 'with the helper: no box at all');
  const titles = ops(top, 'title').map((e) => [e.args[0], e.args[1].sub]);
  assert.deepEqual(titles, [[PROLOGUE[0], 'This one was kept.'], ['Lexicon Quest', 'The End']]);
  assert.ok(ops(top, 'setFlag').some((e) => e.args[0] === 'ep8_complete'));
  assert.ok(EP8_LINES.ep8_keep_one.includes('KEEP ONE'));
});

test('grief is shown small: no death described, no tears, no humor in the memories, at Elowen\'s desk, or before the Eraser falls', () => {
  const dark = /\b(died|dead|corpse|killed|burned alive|tears|wept|weeping|crying)\b/i;
  for (const id of Object.keys(RUNS)) for (const e of says(allOps(id))) {
    if (id === 'keeper_memory_c' && /a baby is crying in the smoke/.test(e.args[1])) continue;   // the bible's picture: a baby, not a death
    assert.ok(!dark.test(e.args[1]), `${id}: ${e.args[1]}`);
  }
  for (const id of ['keeper_memory_a', 'keeper_memory_b', 'keeper_memory_c', 'elowen_scriptorium', 'eraser', 'the_name']) {
    for (const e of says(allOps(id))) assert.ok(!/breakfast|nice old man|mountain that reads|Somebody should make a rule/.test(e.args[1]), `${id}: a joke`);
  }
});

test('the ban list: no banned word, no em dash, ASCII, LF in every Episode 8 file E8-story writes; no older text key on an Episode 8 map', async () => {
  for (const f of ['src/data/ep8/story.js', 'src/data/ep8/flags.js', 'src/data/ep8/npcs.js', 'src/data/ep8/quests.js', 'src/data/ep8/text.js',
    'src/data/ep8/ledger.js', 'src/data/ep8/credits.js', 'docs/story/STAGING_EP8.md', 'qa/content/ep8_story.test.mjs', 'qa/content/ep8_data.test.mjs',
    'qa/content/ep8_boxes.mjs', 'qa/content/ep8_preview.py']) {
    const txt = readFileSync(join(NEXT, ...f.split('/')), 'utf8');
    assert.ok(!txt.includes(EM), `${f}: em dash`);
    assert.ok(!BANNED.test(txt.replace(/BANNED = new RegExp\(\[.*\]\.join\(''\), 'i'\);/, '')), `${f}: banned word`);
    assert.ok(/^[\x09\x0a\x20-\x7e]*$/.test(txt), `${f}: non-ASCII or CR`);
  }
  const bible = readFileSync(join(NEXT, 'docs', 'story', 'EPISODE8.md'), 'utf8');
  assert.ok(!bible.includes(EM), 'EPISODE8.md: em dash');
  // every text key an Episode 8 map event names is Episode 8's own (PLAYTEST_REVIEW_8 item 7), once the maps exist (wave 8c)
  const dir = join(NEXT, 'src', 'data', 'maps');
  const OLDER = [EP1_LINES, EP2_LINES, EP3_LINES, EP4_LINES, EP5_LINES, EP6_LINES, EP7_LINES];
  for (const f of readdirSync(dir).filter((x) => /^ep8_.*\.js$/.test(x) && x !== 'ep8_patches.js')) {
    const mod = (await import(`../../src/data/maps/${f}`)).default;
    if (!mod || !Array.isArray(mod.events)) continue;
    for (const ev of mod.events) for (const k of [ev.text, ev.name, ev.line].filter((x) => typeof x === 'string')) {
      assert.ok(!OLDER.some((t) => k in t), `${f} ${ev.id}: an older episode's text key ${k}`);
    }
  }
});
