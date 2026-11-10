// Episode 6 ("The Skybound Isles") encounters and zones (E6-battle; docs/EPISODE6_PLAN.md 2.4, 6.1 to 6.3). The pack's register()
// adds the groups through enc() (src/data/encounters.js) and defines the five zones on ZONES non-enumerable until EP6_MAPS_LISTED is
// true (the Episode 2 to 5 pattern: qa/maps iterates ZONES and wants a map per listed zone). EP6_ZONE_ORDER continues the
// simulator's progression from the Episode 6 quick start (Lv 25, 13,300 EXP). Episodes 1 to 5 orders, zones and targets are
// untouched. Idempotent.
//
// The Gale adds NO encounter field (the encounters.js rollEncounter and rules.js double-entry trap): a battle has a Gale when one
// of its foes has a `wind` field (src/data/ep6/enemies.js), and only GALE_START below names a first Gust for an encounter.

import { enc, ENCOUNTERS, ZONES } from '../encounters.js';

/** E6-maps-b (wave 6c): set to true once the Observatory maps exist (lists the five zones in ZONES for qa/maps). */
export const EP6_MAPS_LISTED = false;

export const EP6_ZONE_ORDER = ['ep6_airstair', 'ep6_obs_f1', 'ep6_obs_f2', 'ep6_obs_f3', 'ep6_obs_eyrie'];

/**
 * The first Gust, by encounter id, when it must not be the rule's default (gale.js GUST_EVERY actions): `gustIn` the actions to
 * it. e6a_first: the Airstair's scripted fight opens with the Gust 3 actions away, both harriers Aloft (EPISODE6 scene
 * airstair_fight: they ride it, and the first lesson is watching them come round early).
 */
export const GALE_START = {
  e6a_first: { gustIn: 3 },
};

// The Eye of the Storm (F3) is the episode's tightest ordinary floor (the Foundry F3, Keep F3 and Well F3 lesson): `power` and
// `speed` raise its foes' ATK, MAG and SPD there only (rules.js makeEnemyUnit), and `hp` trims their HP, so the same foes stay
// gentler on F2.
export const O3_POWER = { e6o3_pages: 1.7, e6o3_manta: 1.8, e6o3_mixed: 2.8 };
export const O3_SPEED = { e6o3_pages: 1.45, e6o3_manta: 1.4, e6o3_mixed: 1.9 };
export const O3_HP = { e6o3_pages: 1.0, e6o3_manta: 1.0, e6o3_mixed: 1.05 };

// The three-foe groups pay less a head (plan 6.1: about 190 to 200 EXP an ordinary fight): the encounter's `expMul`
// (data/expcurve.js), so the same foes pay in full in their two-foe groups.
export const EXP_MUL = { e6o1_sprites: 0.65, e6o2_mixed: 0.6 };

// [id, zone, leader (field sprite), enemies, extra]
const GROUPS = [
  // The Airstair. e6a_first is the scripted first fight (airstair_fight): no flee, the Gust 3 actions away (GALE_START).
  ['e6a_first', 'ep6_airstair', 'storm_harrier', ['storm_harrier', 'storm_harrier'], { noFlee: true, noElite: true }],
  ['e6a_wolves', 'ep6_airstair', 'squall_wolf', ['squall_wolf', 'squall_wolf']],
  ['e6a_mixed', 'ep6_airstair', 'squall_wolf', ['squall_wolf', 'gale_sprite']],
  // F1: The Windward Causeways
  ['e6o1_sprites', 'ep6_obs_f1', 'gale_sprite', ['gale_sprite', 'gale_sprite', 'storm_harrier'], { expMul: EXP_MUL.e6o1_sprites }],
  ['e6o1_beetles', 'ep6_obs_f1', 'rigger_beetle', ['rigger_beetle', 'rigger_beetle']],
  ['e6o1_mixed', 'ep6_obs_f1', 'squall_wolf', ['squall_wolf', 'signal_wraith']],
  ['e6o1_harriers', 'ep6_obs_f1', 'storm_harrier', ['storm_harrier', 'storm_harrier']],
  // F2: The Hall of Broken Signals
  ['e6o2_wraiths', 'ep6_obs_f2', 'signal_wraith', ['signal_wraith', 'signal_wraith']],
  ['e6o2_manta', 'ep6_obs_f2', 'lightning_manta', ['lightning_manta', 'rigger_beetle']],
  ['e6o2_mixed', 'ep6_obs_f2', 'signal_wraith', ['signal_wraith', 'gale_sprite', 'rigger_beetle'], { expMul: EXP_MUL.e6o2_mixed }],
  // F3: The Eye of the Storm (the tightest floor)
  ['e6o3_pages', 'ep6_obs_f3', 'storm_page', ['storm_page', 'storm_page'], { power: O3_POWER.e6o3_pages, speed: O3_SPEED.e6o3_pages, hp: O3_HP.e6o3_pages }],
  ['e6o3_manta', 'ep6_obs_f3', 'lightning_manta', ['lightning_manta', 'storm_harrier'], { power: O3_POWER.e6o3_manta, speed: O3_SPEED.e6o3_manta, hp: O3_HP.e6o3_manta }],
  ['e6o3_mixed', 'ep6_obs_f3', 'storm_page', ['storm_page', 'rigger_beetle'], { power: O3_POWER.e6o3_mixed, speed: O3_SPEED.e6o3_mixed, hp: O3_HP.e6o3_mixed }],
];

/** Ids of the thirteen ordinary groups, in plan order. */
export const EP6_GROUP_IDS = GROUPS.map((g) => g[0]);
/** The two boss encounters (each keyed like its enemy, so BOSS_LOOT and the encounter flag line up). */
export const EP6_BOSS_IDS = ['gale_engine', 'scribe'];

const BOSSES = {
  // F2's bellows hall: no flee, the Engine's flag, the relays backdrop (plan 6.4). Its Gale Sprites join mid-fight (ai 'gale_engine').
  gale_engine: { zone: 'ep6_obs_f2', leader: 'gale_engine', enemies: ['gale_engine'], boss: true, noFlee: true, music: 'battle',
    noElite: true, flag: 'engine_defeated', backdrop: 'ep6_relays' },
  // The Scribe's Eyrie. startFury: with the Signal Beacon lit (the Beacon side story) the party starts with +20 Fury.
  // The Beacon and the Compass join mid-fight (ai 'scribe'), so the encounter lists only the Scribe.
  scribe: { zone: 'ep6_obs_eyrie', leader: 'scribe', enemies: ['scribe'], boss: true, noFlee: true, music: 'boss_scribe',
    noElite: true, flag: 'scribe_defeated', backdrop: 'ep6_eyrie',
    startFury: { flag: 'beacon_lit', amount: 20, text: 'The Signal Beacon burns for every ship still out. Fury rises! (+20)' } },
};

// level: the party level the zone is tuned for. plan: [encounterId, count] visible enemies the map agents place (E6-maps-a/b).
// backdrop: a key of scenes/battle.js BACKDROPS (E6-tiles builds the ep6_* art; E6-scene-ui registers the keys).
export const EP6_ZONES = {
  ep6_airstair: { id: 'ep6_airstair', name: 'The Airstair', level: [25, 25], backdrop: 'ep6_airstair', music: 'battle', episode: 6,
    plan: [['e6a_first', 1], ['e6a_wolves', 1], ['e6a_mixed', 1]] },
  ep6_obs_f1: { id: 'ep6_obs_f1', name: 'The Windward Causeways', level: [25, 26], backdrop: 'ep6_causeways', music: 'battle', episode: 6,
    plan: [['e6o1_sprites', 2], ['e6o1_beetles', 1], ['e6o1_mixed', 2], ['e6o1_harriers', 1]] },
  ep6_obs_f2: { id: 'ep6_obs_f2', name: 'The Hall of Broken Signals', level: [26, 26], backdrop: 'ep6_relays', music: 'battle', episode: 6,
    plan: [['e6o2_wraiths', 1], ['e6o2_manta', 1], ['e6o2_mixed', 2], ['gale_engine', 1]] },
  ep6_obs_f3: { id: 'ep6_obs_f3', name: 'The Eye of the Storm', level: [27, 27], backdrop: 'ep6_storm', music: 'battle', episode: 6,
    plan: [['e6o3_pages', 1], ['e6o3_manta', 2], ['e6o3_mixed', 1]] },
  ep6_obs_eyrie: { id: 'ep6_obs_eyrie', name: "The Scribe's Eyrie", level: [27, 28], backdrop: 'ep6_eyrie', music: 'boss_scribe', episode: 6,
    plan: [['scribe', 1]] },
};

let done = false;
/** Add the groups, the bosses and the zones. Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, zone, leader, enemies, extra] of GROUPS) if (!ENCOUNTERS[id]) enc(id, { zone, leader, enemies, ...(extra || {}) });
  for (const [id, o] of Object.entries(BOSSES)) if (!ENCOUNTERS[id]) enc(id, o);
  for (const [id, z] of Object.entries(EP6_ZONES)) {
    if (Object.prototype.hasOwnProperty.call(ZONES, id)) continue;
    Object.defineProperty(ZONES, id, { value: z, enumerable: EP6_MAPS_LISTED, configurable: true, writable: true });
  }
  done = true;
}
export default register;
