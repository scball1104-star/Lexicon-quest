// Episode 5 ("The Last Prophecy") encounters and zones (E5-battle; docs/EPISODE5_PLAN.md 2.4, 6.1 to 6.3). The pack's register()
// adds the groups through enc() (src/data/encounters.js) and defines the six zones on ZONES non-enumerable until EP5_MAPS_LISTED is
// true (the Episode 2 to 4 pattern: qa/maps iterates ZONES and wants a map per listed zone). EP5_ZONE_ORDER continues the
// simulator's progression from the Episode 5 quick start (Lv 21, 8,900 EXP: src/data/ep5/start.js EP5_START). Episodes 1 to 4
// orders, zones and targets are untouched. Idempotent.
//
// The Turning Sky adds NO encounter field (the encounters.js and rules.js double-entry trap): a battle's sky starts from the
// field hour (src/data/ep5/sky.js setFieldHour), except where SKY_START below names it for an encounter.

import { enc, ENCOUNTERS, ZONES } from '../encounters.js';

/** E5-maps-b (wave 5c): set to true once the Labyrinth maps exist (lists the six zones in ZONES for qa/maps). Mirrored by index.js. */
export const EP5_MAPS_LISTED = true;

export const EP5_ZONE_ORDER = ['ep5_ship', 'ep5_caravan_road', 'ep5_lab_f1', 'ep5_lab_f2', 'ep5_lab_f3', 'ep5_lab_oracle'];

/**
 * The sky a battle opens under, by encounter id, when the field hour must not decide it: `sky` 'day' | 'night', `turnIn` the
 * actions to the first Turn (default sky.js TURN_EVERY). e5s_first: the deck at night, both foes sun-things (Exposed), the Turn
 * 4 actions away (EPISODE5 scene 6). The two bosses open by Day whatever hour their floors were left at, so their fights are
 * the same for every player (the Knight is a sun foe that mirrors; the Oracle's first phase is a sun foe).
 */
export const SKY_START = {
  e5s_first: { sky: 'night', turnIn: 4 },
  mirage_knight: { sky: 'day' },
  oracle: { sky: 'day' },
};

/** The hour each zone's map is entered at (plan 2.1 and 4.5): the simulator sets it before each battle (sky.js setFieldHour). */
export const ZONE_HOURS = {
  ep5_ship: 'night', ep5_caravan_road: 'noon', ep5_lab_f1: 'noon', ep5_lab_f2: 'dawn', ep5_lab_f3: 'night', ep5_lab_oracle: 'night',
};

// Well F3 is the episode's tightest ordinary floor (the Foundry F3 and Keep F3 lesson): `power` and `speed` raise its foes' ATK,
// MAG and SPD there only (rules.js makeEnemyUnit), and `hp` trims their HP, so the same foes stay gentler on F2.
export const L3_POWER = { e5l3_husks: 1.6, e5l3_shades: 1.75, e5l3_mixed: 1.6 };
export const L3_SPEED = { e5l3_husks: 1.4, e5l3_shades: 1.2, e5l3_mixed: 1.25 };
export const L3_HP = { e5l3_husks: 1.0, e5l3_shades: 0.8, e5l3_mixed: 0.9 };

// The three-foe groups pay less a head (plan 6.1: about 180 EXP an ordinary fight, the Oracle met at Lv 24 at 80% of the fights):
// the encounter's `expMul` (data/expcurve.js), so the same foes pay in full in their two-foe groups.
export const EXP_MUL = { e5l1_stalkers: 0.7, e5l2_mixed: 0.65, e5l3_shades: 0.6 };

// [id, zone, leader (field sprite), enemies, extra]
const GROUPS = [
  // The Saffron Wind. e5s_first is the scripted first fight (ship_fight): no flee, Night with the Turn 4 actions away (SKY_START).
  ['e5s_first', 'ep5_ship', 'dust_harrier', ['dust_harrier', 'dune_scarab'], { noFlee: true, noElite: true }],
  // The Caravan Road
  ['e5r_stalkers', 'ep5_caravan_road', 'dune_stalker', ['dune_stalker', 'dune_stalker']],
  ['e5r_scarabs', 'ep5_caravan_road', 'dune_scarab', ['dune_scarab', 'dune_scarab']],
  ['e5r_mixed', 'ep5_caravan_road', 'dune_stalker', ['dune_stalker', 'starsilt']],
  // F1: The Shifting Dunes
  ['e5l1_stalkers', 'ep5_lab_f1', 'dune_stalker', ['dune_stalker', 'dune_stalker', 'dust_harrier'], { expMul: EXP_MUL.e5l1_stalkers }],
  ['e5l1_reavers', 'ep5_lab_f1', 'silt_reaver', ['silt_reaver', 'silt_reaver']],
  ['e5l1_mixed', 'ep5_lab_f1', 'dune_scarab', ['dune_scarab', 'silt_reaver']],
  ['e5l1_harriers', 'ep5_lab_f1', 'dust_harrier', ['dust_harrier', 'dust_harrier']],
  // F2: Gallery of False Horizons
  ['e5l2_shades', 'ep5_lab_f2', 'horizon_shade', ['horizon_shade', 'horizon_shade']],
  ['e5l2_husk', 'ep5_lab_f2', 'tomorrow_husk', ['tomorrow_husk', 'starsilt']],
  ['e5l2_mixed', 'ep5_lab_f2', 'silt_reaver', ['silt_reaver', 'dune_scarab', 'starsilt'], { expMul: EXP_MUL.e5l2_mixed }],
  // F3: The Well of Tomorrow (the tightest floor)
  ['e5l3_husks', 'ep5_lab_f3', 'tomorrow_husk', ['tomorrow_husk', 'tomorrow_husk'], { power: L3_POWER.e5l3_husks, speed: L3_SPEED.e5l3_husks, hp: L3_HP.e5l3_husks }],
  ['e5l3_shades', 'ep5_lab_f3', 'horizon_shade', ['horizon_shade', 'horizon_shade', 'starsilt'], { power: L3_POWER.e5l3_shades, speed: L3_SPEED.e5l3_shades, hp: L3_HP.e5l3_shades, expMul: EXP_MUL.e5l3_shades }],
  ['e5l3_mixed', 'ep5_lab_f3', 'tomorrow_husk', ['tomorrow_husk', 'horizon_shade'], { power: L3_POWER.e5l3_mixed, speed: L3_SPEED.e5l3_mixed, hp: L3_HP.e5l3_mixed }],
];

/** Ids of the fourteen ordinary groups, in plan order. */
export const EP5_GROUP_IDS = GROUPS.map((g) => g[0]);
/** The two boss encounters (each keyed like its enemy, so BOSS_LOOT and the encounter flag line up). */
export const EP5_BOSS_IDS = ['mirage_knight', 'oracle'];

const BOSSES = {
  // F2's Mirror Hall: no flee, the Knight's flag, the gallery backdrop (plan 6.4).
  mirage_knight: { zone: 'ep5_lab_f2', leader: 'mirage_knight', enemies: ['mirage_knight'], boss: true, noFlee: true, music: 'battle',
    noElite: true, flag: 'knight_defeated', backdrop: 'ep5_gallery' },
  // The Eye of the Oracle. startFury: with the Moonwell woken (Three Roads Home) the party starts with +20 Fury.
  // The Futures join mid-fight (ai 'oracle'), so the encounter lists only the Oracle.
  oracle: { zone: 'ep5_lab_oracle', leader: 'oracle', enemies: ['oracle'], boss: true, noFlee: true, music: 'boss_oracle',
    noElite: true, flag: 'oracle_defeated', backdrop: 'ep5_oracle',
    startFury: { flag: 'moonwell_woken', amount: 20, text: 'The Moonwell remembers every road home. Fury rises! (+20)' } },
};

// level: the party level the zone is tuned for. plan: [encounterId, count] visible enemies the map agents place (E5-maps-a/b).
// backdrop: a key of scenes/battle.js BACKDROPS (E5-tiles builds the ep5_battle_* art; E5-scene-ui registers the keys).
export const EP5_ZONES = {
  ep5_ship: { id: 'ep5_ship', name: 'The Saffron Wind', level: [21, 21], backdrop: 'ep5_sea', music: 'battle', episode: 5,
    plan: [['e5s_first', 1]] },
  ep5_caravan_road: { id: 'ep5_caravan_road', name: 'The Caravan Road', level: [21, 22], backdrop: 'ep5_dunes', music: 'battle', episode: 5,
    plan: [['e5r_stalkers', 1], ['e5r_scarabs', 1], ['e5r_mixed', 1]] },
  ep5_lab_f1: { id: 'ep5_lab_f1', name: 'The Shifting Dunes', level: [22, 23], backdrop: 'ep5_dunes', music: 'battle', episode: 5,
    plan: [['e5l1_stalkers', 2], ['e5l1_reavers', 1], ['e5l1_mixed', 2], ['e5l1_harriers', 1]] },
  ep5_lab_f2: { id: 'ep5_lab_f2', name: 'Gallery of False Horizons', level: [23, 23], backdrop: 'ep5_gallery', music: 'battle', episode: 5,
    plan: [['e5l2_shades', 1], ['e5l2_husk', 1], ['e5l2_mixed', 2], ['mirage_knight', 1]] },
  ep5_lab_f3: { id: 'ep5_lab_f3', name: 'The Well of Tomorrow', level: [23, 24], backdrop: 'ep5_well', music: 'battle', episode: 5,
    plan: [['e5l3_husks', 1], ['e5l3_shades', 2], ['e5l3_mixed', 1]] },
  ep5_lab_oracle: { id: 'ep5_lab_oracle', name: 'The Eye of the Oracle', level: [24, 25], backdrop: 'ep5_oracle', music: 'boss_oracle', episode: 5,
    plan: [['oracle', 1]] },
};

let done = false;
/** Add the groups, the bosses and the zones. Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, zone, leader, enemies, extra] of GROUPS) if (!ENCOUNTERS[id]) enc(id, { zone, leader, enemies, ...(extra || {}) });
  for (const [id, o] of Object.entries(BOSSES)) if (!ENCOUNTERS[id]) enc(id, o);
  for (const [id, z] of Object.entries(EP5_ZONES)) {
    if (Object.prototype.hasOwnProperty.call(ZONES, id)) continue;
    Object.defineProperty(ZONES, id, { value: z, enumerable: EP5_MAPS_LISTED, configurable: true, writable: true });
  }
  done = true;
}
export default register;
