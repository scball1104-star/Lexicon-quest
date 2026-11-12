// Episode 7 ("The Vanishing World") encounters and zones (E7-battle; docs/EPISODE7_PLAN.md 2.4, 6.1 to 6.3). The pack's register()
// adds the groups through enc() (src/data/encounters.js) and defines the five zones on ZONES non-enumerable until EP7_MAPS_LISTED is
// true (the Episode 2 to 6 pattern: qa/maps iterates ZONES and wants a map per listed zone). EP7_ZONE_ORDER continues the
// simulator's progression from the Episode 7 quick start (Lv 28, 17,900 EXP). Episodes 1 to 6 orders, zones and targets are
// untouched. Idempotent.
//
// Rime adds NO encounter field (the encounters.js rollEncounter and rules.js double-entry trap): a battle has Rime when one of its
// foes has `cold: true` (src/data/ep7/enemies.js). `power`, `speed` and `hp` below are existing fields both files already read.

import { enc, ENCOUNTERS, ZONES } from '../encounters.js';

/** E7-maps-b (wave 7c): set to true once the Vault maps exist (lists the five zones in ZONES for qa/maps). */
export const EP7_MAPS_LISTED = true;

export const EP7_ZONE_ORDER = ['ep7_white_road', 'ep7_vault_f1', 'ep7_vault_f2', 'ep7_vault_f3', 'ep7_stillheart'];

// The Stillheart Sanctum (F3) is the episode's tightest ordinary floor (the Foundry F3, Keep F3, Well F3 and Eye of the Storm
// lesson): `power` and `speed` raise its foes' ATK, MAG and SPD there only (rules.js makeEnemyUnit), and `hp` trims their HP, so the
// same foes stay gentler on F2.
// The power goes on ATK and MAG, not SPD (BATTLE.md 16.1): more turns means more Rime, and Rime is what sinks attack-only play,
// so a faster floor drops attack-only under 70% before careful play loses 18%. The knight pair carries less HP (the Knight resists
// the hero's sword, so attack-only fights it twice as long as careful play does).
export const V3_POWER = { e7v3_pages: 3.5, e7v3_knight: 3.0, e7v3_mixed: 3.8 };
export const V3_SPEED = { e7v3_pages: 1.1, e7v3_knight: 1.15, e7v3_mixed: 1.1 };
export const V3_HP = { e7v3_pages: 1.0, e7v3_knight: 0.7, e7v3_mixed: 1.0 };
// F2's three-foe group carries less HP, so it ends inside the ordinary 3 to 5 rounds (it took 6 at full HP).
export const V2_HP = { e7v2_mixed: 0.8 };

// The three-foe groups pay less a head (plan 6.1: about 160 EXP an ordinary fight): the encounter's `expMul` (data/expcurve.js).
// The Sanctum's pairs pay 0.85, so a run that fights every placed foe, elites at their real rate, meets the Phantom about 380 EXP
// under Lv 31 (PLAYTEST_REVIEW_8 item 6: Episode 6's 27 EXP margin was eaten by elites).
export const EXP_MUL = { e7v1_wisps: 0.65, e7v2_mixed: 0.6, e7v3_pages: 0.85, e7v3_knight: 0.85, e7v3_mixed: 0.85 };

const v3 = (id) => ({ power: V3_POWER[id], speed: V3_SPEED[id], hp: V3_HP[id], expMul: EXP_MUL[id] });

// [id, zone, leader (field sprite), enemies, extra]
const GROUPS = [
  // The White Road. e7w_first is the scripted first fight (road_fight: the Rime lesson): no flee, no elite.
  ['e7w_first', 'ep7_white_road', 'rime_wolf', ['rime_wolf', 'rime_wolf'], { noFlee: true, noElite: true }],
  ['e7w_wolves', 'ep7_white_road', 'rime_wolf', ['rime_wolf', 'snow_wisp']],
  ['e7w_owls', 'ep7_white_road', 'hush_owl', ['hush_owl', 'hush_owl']],
  // F1: The Vanishing Steps
  ['e7v1_wisps', 'ep7_vault_f1', 'snow_wisp', ['snow_wisp', 'snow_wisp', 'hush_owl'], { expMul: EXP_MUL.e7v1_wisps }],
  ['e7v1_crawlers', 'ep7_vault_f1', 'crystal_crawler', ['crystal_crawler', 'crystal_crawler']],
  ['e7v1_mixed', 'ep7_vault_f1', 'rime_wolf', ['rime_wolf', 'frostbound_revenant']],
  // F2: The Hall of Borrowed Light
  ['e7v2_knights', 'ep7_vault_f2', 'ice_knight', ['ice_knight', 'snow_wisp']],
  ['e7v2_revenants', 'ep7_vault_f2', 'frostbound_revenant', ['frostbound_revenant', 'frostbound_revenant']],
  ['e7v2_mixed', 'ep7_vault_f2', 'ice_knight', ['ice_knight', 'hush_owl', 'crystal_crawler'], { expMul: EXP_MUL.e7v2_mixed, hp: V2_HP.e7v2_mixed }],
  // F3: The Stillheart Sanctum (the tightest floor)
  ['e7v3_pages', 'ep7_vault_f3', 'rimed_page', ['rimed_page', 'rimed_page'], v3('e7v3_pages')],
  ['e7v3_knight', 'ep7_vault_f3', 'ice_knight', ['ice_knight', 'rimed_page'], v3('e7v3_knight')],
  ['e7v3_mixed', 'ep7_vault_f3', 'frostbound_revenant', ['frostbound_revenant', 'rimed_page'], v3('e7v3_mixed')],
];

/** Ids of the twelve ordinary groups, in plan order. */
export const EP7_GROUP_IDS = GROUPS.map((g) => g[0]);
/** The two boss encounters (each keyed like its enemy, so BOSS_LOOT and the encounter flag line up). */
export const EP7_BOSS_IDS = ['pale_lantern', 'white_phantom'];

const BOSSES = {
  // F2's Lamp Gallery: no flee, the Lantern's flag, the hall backdrop (plan 6.4). Its Snow Wisps join mid-fight (ai 'pale_lantern').
  pale_lantern: { zone: 'ep7_vault_f2', leader: 'pale_lantern', enemies: ['pale_lantern'], boss: true, noFlee: true, music: 'battle',
    noElite: true, flag: 'lantern_defeated', backdrop: 'ep7_battle_hall' },
  // The Stillheart. startFury: with the Hearth of Returning Names lit (the Hearth side story) the party starts with +20 Fury.
  // The Gate and the Letter join mid-fight (ai 'white_phantom'), so the encounter lists only the Phantom.
  white_phantom: { zone: 'ep7_stillheart', leader: 'white_phantom', enemies: ['white_phantom'], boss: true, noFlee: true, music: 'boss_phantom',
    noElite: true, flag: 'phantom_defeated', backdrop: 'ep7_battle_stillheart',
    startFury: { flag: 'hearth_lit', amount: 20, text: 'The Hearth of Returning Names burns for everyone still on the road. Fury rises! (+20)' } },
};

// level: the party level the zone is tuned for. plan: [encounterId, count] visible enemies the map agents place (E7-maps-a/b).
// backdrop: a key of scenes/battle.js BACKDROPS (E7-tiles builds the ep7_battle_* art; E7-scene-ui registers the keys).
export const EP7_ZONES = {
  ep7_white_road: { id: 'ep7_white_road', name: 'The White Road', level: [28, 28], backdrop: 'ep7_battle_road', music: 'battle', episode: 7,
    plan: [['e7w_first', 1], ['e7w_wolves', 1], ['e7w_owls', 1]] },
  ep7_vault_f1: { id: 'ep7_vault_f1', name: 'The Vanishing Steps', level: [29, 29], backdrop: 'ep7_battle_vault', music: 'battle', episode: 7,
    plan: [['e7v1_wisps', 2], ['e7v1_crawlers', 1], ['e7v1_mixed', 2]] },
  ep7_vault_f2: { id: 'ep7_vault_f2', name: 'The Hall of Borrowed Light', level: [29, 30], backdrop: 'ep7_battle_hall', music: 'battle', episode: 7,
    plan: [['e7v2_knights', 1], ['e7v2_revenants', 1], ['e7v2_mixed', 2], ['pale_lantern', 1]] },
  ep7_vault_f3: { id: 'ep7_vault_f3', name: 'The Stillheart Sanctum', level: [30, 30], backdrop: 'ep7_battle_sanctum', music: 'battle', episode: 7,
    plan: [['e7v3_pages', 1], ['e7v3_knight', 2], ['e7v3_mixed', 1]] },
  ep7_stillheart: { id: 'ep7_stillheart', name: 'The Stillheart', level: [30, 31], backdrop: 'ep7_battle_stillheart', music: 'boss_phantom', episode: 7,
    plan: [['white_phantom', 1]] },
};

let done = false;
/** Add the groups, the bosses and the zones. Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, zone, leader, enemies, extra] of GROUPS) if (!ENCOUNTERS[id]) enc(id, { zone, leader, enemies, ...(extra || {}) });
  for (const [id, o] of Object.entries(BOSSES)) if (!ENCOUNTERS[id]) enc(id, o);
  for (const [id, z] of Object.entries(EP7_ZONES)) {
    if (Object.prototype.hasOwnProperty.call(ZONES, id)) continue;
    Object.defineProperty(ZONES, id, { value: z, enumerable: EP7_MAPS_LISTED, configurable: true, writable: true });
  }
  done = true;
}
export default register;
