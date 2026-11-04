// Episode 4 ("The Sunken Keep") encounters and zones (E4-battle; docs/EPISODE4_PLAN.md 2.4, 6.1, 6.2). The pack's register() adds
// the groups through enc() (src/data/encounters.js) and defines the five zones on ZONES non-enumerable until EP4_MAPS_LISTED is
// true (the Episode 2 and 3 pattern: qa/maps iterates ZONES and wants a map per listed zone). EP4_ZONE_ORDER continues the
// simulator's progression from the Episode 4 quick start (Lv 17, 5,600 EXP: src/data/ep4/start.js EP4_START). Episodes 1 to 3
// orders, zones and targets are untouched. Idempotent.

import { enc, ENCOUNTERS, ZONES } from '../encounters.js';

/** E4-maps-b (wave 4c): set to true once the Keep maps exist (lists the five zones in ZONES for qa/maps). Mirrored by index.js. */
export const EP4_MAPS_LISTED = false;

export const EP4_ZONE_ORDER = ['ep4_flood_road', 'ep4_keep_f1', 'ep4_keep_f2', 'ep4_keep_f3', 'ep4_keep_crown'];

// Keep F3 is the episode's tightest ordinary floor (the Foundry F3 lesson): `power` and `speed` raise its foes' ATK, MAG and SPD
// there only (rules.js makeEnemyUnit), so the same foes stay gentler on F1 and F2.
export const K3_POWER = { e4k3_decrees: 2.25, e4k3_watch: 1.6, e4k3_sentinels: 1.2 };
export const K3_SPEED = 1.5;
/** Their HP there (rules.js reads an encounter's `hp`): the Watch and the Sentinels hit harder and faster but fall sooner. */
export const K3_HP = { e4k3_decrees: 0.85, e4k3_watch: 0.7, e4k3_sentinels: 0.68 };

// [id, zone, leader (field sprite), enemies, extra]
const GROUPS = [
  // The Flood Road. e4r_first is the scripted first fight (flood_first_fight): the Ink Bloom's opener is always Stamp.
  ['e4r_first', 'ep4_flood_road', 'ink_bloom', ['ink_bloom', 'flood_hound']],
  ['e4r_hounds', 'ep4_flood_road', 'flood_hound', ['flood_hound', 'flood_hound']],
  ['e4r_crabs', 'ep4_flood_road', 'lockjaw_crab', ['lockjaw_crab', 'lockjaw_crab']],
  ['e4r_mixed', 'ep4_flood_road', 'flood_hound', ['flood_hound', 'ink_bloom']],
  // F1: The Tidegate Causeway
  ['e4k1_watch', 'ep4_keep_f1', 'drowned_watch', ['drowned_watch', 'lockjaw_crab']],
  ['e4k1_blooms', 'ep4_keep_f1', 'ink_bloom', ['ink_bloom', 'ink_bloom', 'ink_bloom']],
  ['e4k1_crabs', 'ep4_keep_f1', 'lockjaw_crab', ['lockjaw_crab', 'lockjaw_crab', 'ink_bloom']],
  ['e4k1_mixed', 'ep4_keep_f1', 'drowned_watch', ['drowned_watch', 'ink_bloom']],
  // F2: Archives Below Water
  ['e4k2_phantoms', 'ep4_keep_f2', 'gutter_phantom', ['gutter_phantom', 'gutter_phantom']],
  ['e4k2_sentinel', 'ep4_keep_f2', 'waterlogged_sentinel', ['waterlogged_sentinel', 'gutter_phantom']],
  ['e4k2_mixed', 'ep4_keep_f2', 'drowned_watch', ['drowned_watch', 'blank_decree']],
  // F3: The Court of Witnesses (the tightest floor)
  ['e4k3_decrees', 'ep4_keep_f3', 'blank_decree', ['blank_decree', 'blank_decree', 'ink_bloom'], { power: K3_POWER.e4k3_decrees, speed: K3_SPEED, hp: K3_HP.e4k3_decrees }],
  ['e4k3_watch', 'ep4_keep_f3', 'drowned_watch', ['drowned_watch', 'drowned_watch', 'gutter_phantom'], { power: K3_POWER.e4k3_watch, speed: K3_SPEED, hp: K3_HP.e4k3_watch }],
  ['e4k3_sentinels', 'ep4_keep_f3', 'waterlogged_sentinel', ['waterlogged_sentinel', 'waterlogged_sentinel'], { power: K3_POWER.e4k3_sentinels, speed: K3_SPEED, hp: K3_HP.e4k3_sentinels }],
];

/** Ids of the fourteen ordinary groups, in plan order. */
export const EP4_GROUP_IDS = GROUPS.map((g) => g[0]);
/** The two boss encounters (each keyed like its enemy, so BOSS_LOOT and the encounter flag line up). */
export const EP4_BOSS_IDS = ['barrister', 'paper_regent'];

const BOSSES = {
  // F2's court room: no flee, the Barrister's flag, the archive_deep backdrop (plan 6.4).
  barrister: { zone: 'ep4_keep_f2', leader: 'barrister', enemies: ['barrister'], boss: true, noFlee: true, music: 'battle',
    noElite: true, flag: 'barrister_defeated', backdrop: 'ep4_archive_deep' },
  // The Drowned Throne. startFury: with the Three Witnesses' records choice the party starts with +25 Fury (canon's opening Focus).
  // The writs join mid-fight (ai 'paper_regent'), so the encounter lists only the Regent.
  paper_regent: { zone: 'ep4_keep_crown', leader: 'paper_regent', enemies: ['paper_regent'], boss: true, noFlee: true,
    music: 'boss_regent', noElite: true, flag: 'paper_regent_defeated', backdrop: 'ep4_throne',
    startFury: { flag: 'council_records', amount: 25, text: "Valewyn's records are safe behind you. Fury rises! (+25)" } },
};

// level: the party level the zone is tuned for. plan: [encounterId, count] visible enemies the map agents place (E4-maps-a/b).
// backdrop: a key of scenes/battle.js BACKDROPS (E4-tiles builds the ep4_* art; E4-scene-ui registers the keys).
export const EP4_ZONES = {
  ep4_flood_road: { id: 'ep4_flood_road', name: 'The Flood Road', level: [17, 18], backdrop: 'ep4_flood_road', music: 'battle', episode: 4,
    plan: [['e4r_first', 1], ['e4r_hounds', 1], ['e4r_crabs', 1], ['e4r_mixed', 1]] },
  ep4_keep_f1: { id: 'ep4_keep_f1', name: 'The Tidegate Causeway', level: [18, 18], backdrop: 'ep4_keep', music: 'battle', episode: 4,
    plan: [['e4k1_watch', 2], ['e4k1_blooms', 1], ['e4k1_crabs', 2], ['e4k1_mixed', 1]] },
  ep4_keep_f2: { id: 'ep4_keep_f2', name: 'Archives Below Water', level: [19, 19], backdrop: 'ep4_archive_deep', music: 'battle', episode: 4,
    plan: [['e4k2_phantoms', 2], ['e4k2_sentinel', 1], ['e4k2_mixed', 2], ['barrister', 1]] },
  ep4_keep_f3: { id: 'ep4_keep_f3', name: 'The Court of Witnesses', level: [19, 20], backdrop: 'ep4_keep', music: 'battle', episode: 4,
    plan: [['e4k3_decrees', 2], ['e4k3_watch', 2], ['e4k3_sentinels', 1]] },
  ep4_keep_crown: { id: 'ep4_keep_crown', name: 'The Drowned Throne', level: [20, 21], backdrop: 'ep4_throne', music: 'boss_regent', episode: 4,
    plan: [['paper_regent', 1]] },
};

let done = false;
/** Add the groups, the bosses and the zones. Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, zone, leader, enemies, extra] of GROUPS) if (!ENCOUNTERS[id]) enc(id, { zone, leader, enemies, ...(extra || {}) });
  for (const [id, o] of Object.entries(BOSSES)) if (!ENCOUNTERS[id]) enc(id, o);
  for (const [id, z] of Object.entries(EP4_ZONES)) {
    if (Object.prototype.hasOwnProperty.call(ZONES, id)) continue;
    Object.defineProperty(ZONES, id, { value: z, enumerable: EP4_MAPS_LISTED, configurable: true, writable: true });
  }
  done = true;
}
export default register;
