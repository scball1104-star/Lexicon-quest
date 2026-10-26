// Episode 1 expansion ("The Wider Valley"): eighteen groups, two boss encounters and eight optional zones (EXPANSION1_PLAN.md 7.3, 7.4).
// The pack's register() adds them through enc() (src/data/encounters.js), pushes the zones into OPTIONAL_ZONES (never ZONE_ORDER, so
// progression() never counts them) and defines them on ZONES non-enumerable until X1_MAPS_LISTED is true (the Episode 2 and 3 pattern:
// qa/maps iterates ZONES and wants a map per listed zone). X1-maps-hub flips X1_MAPS_LISTED below once the eleven maps exist.
//
// Every group and both bosses pay EXPANSION_FOE_EXP_MUL of their foes' EXP (data/expcurve.js; 7.2 shows why they cannot pay full).
// A ground rule for the ledger: tools/sim/optional_exp.mjs reads these through encounterExp(), so a change here moves the caps.

import { enc, ENCOUNTERS, ZONES, OPTIONAL_ZONES } from '../encounters.js';
import { EXPANSION_FOE_EXP_MUL } from '../expcurve.js';

/** X1-maps-hub: set to true once the maps exist (lists the eight zones in ZONES for qa/maps). Mirrored by x1/index.js X1_MAPS_LISTED. */
export const X1_MAPS_LISTED = true;

const M = EXPANSION_FOE_EXP_MUL;

// [id, zone, leader (the field sprite), enemies]
const GROUPS = [
  ['dn_wolves', 'x1_downs', 'briar_wolf', ['briar_wolf', 'briar_wolf', 'briar_wolf']],
  ['dn_scarab', 'x1_downs', 'moss_scarab', ['moss_scarab', 'ink_slime']],
  ['dn_pack', 'x1_downs', 'briar_wolf', ['briar_wolf', 'briar_wolf', 'ink_slime']],
  ['mo_wolves', 'x1_highmoor', 'thornback_wolf', ['thornback_wolf', 'briar_wolf']],
  ['mo_scarabs', 'x1_highmoor', 'moss_scarab', ['moss_scarab', 'moss_scarab', 'ink_slime']],
  ['mo_wraiths', 'x1_highmoor', 'page_wraith', ['page_wraith', 'page_wraith']],
  ['bw_shades', 'x1_barrow', 'barrow_shade', ['barrow_shade', 'barrow_shade']],
  ['bw_mixed', 'x1_barrow', 'barrow_shade', ['barrow_shade', 'page_wraith']],
  ['lh_beetles', 'x1_larchhill', 'moss_scarab', ['moss_scarab', 'moss_scarab', 'ink_slime']],
  ['lh_wolves', 'x1_larchhill', 'briar_wolf', ['briar_wolf', 'briar_wolf', 'moss_scarab']],
  ['lh_mixed', 'x1_larchhill', 'ink_blot', ['ink_blot', 'ink_slime', 'ink_slime']],
  ['mr_weevils', 'x1_millrace', 'moss_scarab', ['moss_scarab', 'moss_scarab', 'bookmite']],
  ['mr_wolves', 'x1_millrace', 'thornback_wolf', ['thornback_wolf', 'thornback_wolf']],
  ['tr_wolves', 'x1_terrace', 'thornback_wolf', ['thornback_wolf', 'thornback_wolf', 'briar_wolf']],
  ['tr_golem', 'x1_terrace', 'tome_golem', ['tome_golem', 'bookmite', 'bookmite']],
  ['cl_wraiths', 'x1_cellar', 'ink_wraith', ['ink_wraith', 'page_wraith']],
  ['cv_blots', 'x1_culvert', 'ink_blot', ['ink_blot', 'ink_blot']],
  ['cv_wraith', 'x1_culvert', 'ink_wraith', ['ink_wraith', 'ink_blot']],
];

/** Ids of the eighteen ordinary groups, in plan order. */
export const X1_GROUP_IDS = GROUPS.map((g) => g[0]);
/** The two boss encounters. */
export const X1_BOSS_IDS = ['barrow_reeve', 'millstone_golem'];

// The plan's battle backdrops. Each zone's `backdrop` is a key of scenes/battle.js BACKDROPS: the five x1_* keys draw the pack art
// (assets/backdrops/x1_battle_*, atlas ids x1_battle_*) and fall back to the old valley / archive look if the art is missing.
// X1_BACKDROP_ART: zone -> the plan's art key (documentation; wired by X1-integrate).
export const X1_BACKDROP_ART = { x1_downs: 'battle_downs', x1_highmoor: 'battle_moor', x1_barrow: 'battle_barrow',
  x1_larchhill: 'battle_larchhill', x1_culvert: 'battle_culvert' };

export const X1_ZONES = {
  x1_downs: { id: 'x1_downs', name: "Shepherd's Downs", level: [3, 4], backdrop: 'x1_downs', music: 'battle', optional: true,
    plan: [['dn_wolves', 1], ['dn_scarab', 1], ['dn_pack', 1]] },
  x1_highmoor: { id: 'x1_highmoor', name: 'The High Moor', level: [4, 5], backdrop: 'x1_moor', music: 'battle', optional: true,
    plan: [['mo_wolves', 1], ['mo_scarabs', 1], ['mo_wraiths', 1]] },
  x1_barrow: { id: 'x1_barrow', name: "The Wethers' Barrow", level: [5, 6], backdrop: 'x1_barrow', music: 'battle', optional: true,
    plan: [['bw_shades', 1], ['bw_mixed', 1], ['barrow_reeve', 1]] },
  x1_larchhill: { id: 'x1_larchhill', name: 'Larchhill', level: [5, 6], backdrop: 'x1_larchhill', music: 'battle', optional: true,
    plan: [['lh_beetles', 1], ['lh_wolves', 1], ['lh_mixed', 1]] },
  x1_millrace: { id: 'x1_millrace', name: 'The Lower Millrace', level: [5, 6], backdrop: 'valley', music: 'battle', optional: true,
    plan: [['mr_weevils', 1], ['mr_wolves', 1]] },
  x1_terrace: { id: 'x1_terrace', name: "The Keepers' Terrace", level: [6, 7], backdrop: 'valley', music: 'battle', optional: true,
    plan: [['tr_wolves', 1], ['tr_golem', 1]] },
  x1_cellar: { id: 'x1_cellar', name: "The Keepers' Cellar", level: [6, 7], backdrop: 'archive', music: 'battle', optional: true,
    plan: [['cl_wraiths', 1]] },
  x1_culvert: { id: 'x1_culvert', name: 'The Weir Culvert', level: [6, 7], backdrop: 'x1_culvert', music: 'battle', optional: true,
    plan: [['cv_blots', 1], ['cv_wraith', 1], ['millstone_golem', 1]] },
};

let done = false;
/** Add the groups, the bosses and the zones. Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, zone, leader, enemies] of GROUPS) {
    if (!ENCOUNTERS[id]) enc(id, { zone, leader, enemies, expMul: M });
  }
  if (!ENCOUNTERS.barrow_reeve) {
    enc('barrow_reeve', { zone: 'x1_barrow', leader: 'barrow_reeve', enemies: ['barrow_reeve'], boss: true, noFlee: true,
      music: 'boss_reeve', noElite: true, flag: 'barrow_reeve_defeated', bossLoot: 'barrow_reeve', expMul: M });
  }
  if (!ENCOUNTERS.millstone_golem) {
    enc('millstone_golem', { zone: 'x1_culvert', leader: 'millstone_golem', enemies: ['millstone_golem'], boss: true, noFlee: true,
      music: 'boss_millstone', noElite: true, flag: 'millstone_golem_defeated', bossLoot: 'millstone_golem', expMul: M });
  }
  for (const [id, z] of Object.entries(X1_ZONES)) {
    Object.defineProperty(ZONES, id, { value: z, enumerable: X1_MAPS_LISTED, configurable: true, writable: true });
    if (!OPTIONAL_ZONES.includes(id)) OPTIONAL_ZONES.push(id);
  }
  done = true;
}
export default register;
