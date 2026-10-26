// Shared set-up for the X1 content tests (not a test file: run.mjs only runs *.test.mjs).
//
// It snapshots the shared tables BEFORE the expansion registers (so a test can prove nothing old changed), then registers the
// X1-story modules in the order the pack entry uses (flags, npcs, quests, text, story) and re-exports everything the tests need.
// The other X1 data modules (enemies, items, encounters, shops) belong to X1-battle and are accepted by their planned ids.
import { NEXT, read, listFiles, MUSIC, SFX } from './_harness.mjs';
import { FLAGS, FLAG_IDS, ALL_SIDE_QUESTS, BANTER } from '../../src/data/quests.js';
import { NPCS, talkTo } from '../../src/data/npcs.js';
import { BANNERS, BOOKS, BARKS, BESTIARY } from '../../src/data/text.js';
import { SCENES, LINES } from '../../src/game/story.js';
import { scenes as EP1_SCENES, lines as EP1_LINES } from '../../src/data/story/ep1.js';
import { scenes as EP2_SCENES, lines as EP2_LINES } from '../../src/data/story/ep2.js';
import { scenes as EP3_SCENES, lines as EP3_LINES } from '../../src/data/story/ep3.js';

export { NEXT, read, listFiles };

// ---- the state before the expansion registers
export const BASE = {
  flags: { ...FLAGS },
  flagIds: [...FLAG_IDS],
  scenes: Object.keys(SCENES),
  lines: Object.keys(LINES),
  npcs: Object.keys(NPCS),
  quests: ALL_SIDE_QUESTS.map((q) => q.id),
  banterMaps: Object.keys(BANTER),
  banterCounts: Object.fromEntries(Object.entries(BANTER).map(([k, v]) => [k, v.length])),
  banners: Object.keys(BANNERS),
  books: Object.keys(BOOKS),
  barks: Object.keys(BARKS),
  bestiary: Object.keys(BESTIARY),
  talkLen: Object.fromEntries(Object.entries(NPCS).map(([k, v]) => [k, v.talk.length])),
};

export const PREPENDED_NPCS = ['iris', 'quill', 'pell', 'hal', 'oren', 'holt'];

// The old flag states used to prove that talk is unchanged: growing prefixes of the old flag list plus the three episode ends.
const OLD = BASE.flagIds;
export const OLD_STATES = [];
for (let k = 0; k <= OLD.length; k += 3) OLD_STATES.push(new Set(OLD.slice(0, k)));
OLD_STATES.push(new Set(OLD));
const resolveAll = (ids) => {
  const out = {};
  for (const [i, set] of OLD_STATES.entries()) for (const id of ids) out[`${i}:${id}`] = JSON.stringify(talkTo(id, (f) => set.has(f)));
  return out;
};
export const BASE_TALK = resolveAll(PREPENDED_NPCS);
export { resolveAll };

// ---- register the X1-story modules
export const X1 = {
  flags: await import('../../src/data/x1/flags.js'),
  npcs: await import('../../src/data/x1/npcs.js'),
  quests: await import('../../src/data/x1/quests.js'),
  text: await import('../../src/data/x1/text.js'),
  story: await import('../../src/data/x1/story.js'),
  live: await import('../../src/data/x1/live.js'),
};
export function registerAll() {
  X1.flags.register();
  X1.npcs.register();
  X1.quests.register();
  X1.text.register();
  X1.story.register();
}

// ---- ids owned by other agents, accepted by their planned names (plan 2.3, 2.4, 2.7, 8)
export const X1_MAPS = ['x1_downs', 'x1_loomhouse', 'x1_barrow', 'x1_terrace', 'x1_orrery', 'x1_cellar', 'x1_millrace', 'x1_mill',
  'x1_culvert', 'x1_highmoor', 'x1_larchhill'];
export const X1_MUSIC = ['the_downs', 'high_moor', 'wethers_barrow', 'orrery', 'larchhill', 'millrace', 'boss_reeve', 'boss_millstone'];
export const X1_SFX = ['slab_slide', 'stone_name', 'sheep_baa', 'loom_clack', 'wheel_groan', 'star_chime', 'orrery_hum', 'hive_buzz',
  'windmill_creak', 'chime_post'];
export const X1_NPC_SPRITES = ['npc_brindle', 'npc_tamsin', 'npc_ferrick', 'npc_hesper', 'npc_odo', 'npc_yarrow', 'animal_sheep'];
export const X1_ITEMS = ['burial_roll', 'quill_copy', 'pell_crate', 'millstone_pin', 'honey_roll', 'reeves_crook', 'drovers_bow',
  'fold_mantle', 'drover_boots', 'rollcall_charm', 'star_chart', 'millwright_apron', 'chime_staff', 'orchard_axe'];
export const X1_ENCOUNTERS = ['barrow_reeve', 'millstone_golem'];
export const X1_SHOPS = ['thornfold_loom', 'millrace_stall'];
export const ALL_MUSIC = [...MUSIC, 'hollow', 'hollowmere', 'fading_road', 'court', 'boss_king', 'ash_road', 'emberpeak', 'foundry',
  'boss_warden', 'first_bell', ...X1_MUSIC];
export const ALL_SFX = [...SFX, ...X1_SFX, 'mirror_turn', 'beam_hit', 'glass_bridge', 'glass_break', 'mirror_step', 'ferry_oars',
  'clock_chime', 'reflection_out', 'kept', 'kept_break', 'quench_hiss', 'sluice_turn', 'water_flow', 'wheel_turn', 'anvil_strike',
  'bell_first', 'furnace_roar', 'hammer_charge', 'oath_ring', 'lift_rumble'];
export const MAP_TRACK = {
  x1_downs: 'the_downs', x1_loomhouse: 'the_downs', x1_barrow: 'wethers_barrow', x1_terrace: 'orrery', x1_orrery: 'orrery',
  x1_cellar: 'orrery', x1_millrace: 'millrace', x1_mill: 'millrace', x1_culvert: 'mystery', x1_highmoor: 'high_moor', x1_larchhill: 'larchhill',
};

// ---- the Episode 2 registry of docs/EXPANSION2_PLAN.md section 3 (ids this expansion must not collide with)
export const X2 = {
  npcs: ['maren', 'dunn', 'bett', 'marit', 'ines', 'harn'],
  quests: ['strangers_stores', 'provisioners_order', 'lamps_light', 'courier_parcels', 'chalk_road', 'keepers_water'],
  prefix: /^x2_/,
  names: ['Maren', 'Dunn', 'Bett', 'Marit', 'Ines', 'Harn', 'Tam', 'Fitch', 'Waymarker', 'Lamplighter'],
};

// ---- every named person of Episodes 1 to 3 (and the Episode 2 expansion): none may reappear as a placeholder name token
export const CANON_NAMES = new Set([
  'mira', 'bram', 'hero', 'garrick', 'hazel', 'mael', 'tess', 'oren', 'hal', 'nella', 'edda', 'lark', 'wick', 'iris', 'holt', 'pip',
  'hob', 'barnaby', 'pell', 'penny', 'cobb', 'henrietta', 'bertha', 'loaf', 'anvil', 'duke', 'quill', 'moth', 'rook', 'maudie',
  'sorrel', 'ansel', 'wren', 'elian', 'anwen', 'tovin', 'lena', 'aurel', 'nico', 'sava', 'corin', 'orla', 'fitch', 'vex', 'vessa',
  'veyra', 'ilya', 'sella', 'harl', 'bess', 'taro', 'rusk', 'mara', 'hector', 'tam',
  ...X2.names.map((n) => n.toLowerCase()),
  ...Object.values(NPCS).map((n) => String(n.name).toLowerCase()),
]);

export const EM = String.fromCharCode(0x2014);
export const BAR = String.fromCharCode(0x2015);
