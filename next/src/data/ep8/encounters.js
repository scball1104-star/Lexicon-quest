// Episode 8 ("The Last Word") encounters and zones (E8-battle; docs/EPISODE8_PLAN.md 2.4, 6.1 to 6.3). The pack's register() adds
// the groups through enc() (src/data/encounters.js) and defines the five zones on ZONES non-enumerable until EP8_MAPS_LISTED is true
// (the Episode 2 to 7 pattern: qa/maps iterates ZONES and wants a map per listed zone). EP8_ZONE_ORDER continues the simulator's
// progression from the Episode 8 quick start (Lv 31, 22,200 EXP). Episodes 1 to 7 orders, zones and targets are untouched.
// Idempotent.
//
// Erasure adds NO encounter field (the encounters.js rollEncounter and rules.js double-entry trap): a battle has Erasure when one of
// its foes has `erasing: true` (src/data/ep8/enemies.js). `power`, `speed`, `hp` and `expMul` below are existing fields both files
// already read.

import { enc, ENCOUNTERS, ZONES } from '../encounters.js';

/** E8-maps-b (wave 8c): set to true once the Library maps exist (lists the five zones in ZONES for qa/maps). */
export const EP8_MAPS_LISTED = false;

export const EP8_ZONE_ORDER = ['ep8_stair', 'ep8_library_f1', 'ep8_library_f2', 'ep8_library_f3', 'ep8_last_word'];

// The Unwritten Page (F3) is the episode's tightest ordinary floor (the Foundry F3 to Stillheart Sanctum lesson): `power` and `speed`
// raise its foes' ATK, MAG and SPD there only (rules.js makeEnemyUnit) and `hp` trims their HP, so the same foes stay gentler on F2.
export const L3_POWER = { e8l3_pages: 3.3, e8l3_librarian: 3.5, e8l3_mixed: 3.0 };
export const L3_SPEED = { e8l3_pages: 1.1, e8l3_librarian: 1.1, e8l3_mixed: 1.1 };
// The Librarian pair carries 0.6 HP: the Librarian resists the hero's sword, so attack-only fights it twice as long as careful play.
export const L3_HP = { e8l3_pages: 1.05, e8l3_librarian: 0.6, e8l3_mixed: 0.58 };
// F2's three-foe group and its Librarian pair carry less HP, so they end inside the ordinary 3 to 5 rounds.
export const GROUP_HP = { e8l1_mixed: 1.0, e8l2_cranes: 0.8, e8l2_mixed: 0.85, e8l3_mixed: 1.0 };

// The three-foe groups pay less a head (plan 6.1: about 180 EXP an ordinary fight): the encounter's `expMul` (data/expcurve.js).
export const EXP_MUL = { e8l1_mixed: 0.65, e8l2_cranes: 0.65, e8l3_mixed: 0.6 };

const l3 = (id) => ({ power: L3_POWER[id], speed: L3_SPEED[id], hp: L3_HP[id], ...(EXP_MUL[id] ? { expMul: EXP_MUL[id] } : {}) });

// [id, zone, leader (field sprite), enemies, extra]
const GROUPS = [
  // The Stair of Written Light. e8s_first is the scripted first fight (first_rub: the Erasure lesson): no flee, no elite.
  ['e8s_first', 'ep8_stair', 'index_hound', ['index_hound', 'index_hound'], { noFlee: true, noElite: true }],
  ['e8s_hounds', 'ep8_stair', 'index_hound', ['index_hound', 'margin_imp']],
  ['e8s_cranes', 'ep8_stair', 'paper_crane', ['paper_crane', 'paper_crane']],
  // F1: The Catalog of Lost Lives
  ['e8l1_wraiths', 'ep8_library_f1', 'catalog_wraith', ['catalog_wraith', 'catalog_wraith']],
  ['e8l1_worms', 'ep8_library_f1', 'gnawing_bookworm', ['gnawing_bookworm', 'gnawing_bookworm']],
  ['e8l1_mixed', 'ep8_library_f1', 'index_hound', ['index_hound', 'catalog_wraith', 'margin_imp'], { expMul: EXP_MUL.e8l1_mixed, hp: GROUP_HP.e8l1_mixed }],
  // F2: The Palimpsest Galleries
  ['e8l2_librarian', 'ep8_library_f2', 'inkbound_librarian', ['inkbound_librarian', 'margin_imp']],
  ['e8l2_cranes', 'ep8_library_f2', 'paper_crane', ['paper_crane', 'paper_crane', 'catalog_wraith'], { expMul: EXP_MUL.e8l2_cranes, hp: GROUP_HP.e8l2_cranes }],
  ['e8l2_mixed', 'ep8_library_f2', 'inkbound_librarian', ['inkbound_librarian', 'gnawing_bookworm'], { hp: GROUP_HP.e8l2_mixed }],
  // F3: The Unwritten Page (the tightest floor)
  ['e8l3_pages', 'ep8_library_f3', 'struck_page', ['struck_page', 'struck_page'], l3('e8l3_pages')],
  ['e8l3_librarian', 'ep8_library_f3', 'inkbound_librarian', ['inkbound_librarian', 'struck_page'], l3('e8l3_librarian')],
  ['e8l3_mixed', 'ep8_library_f3', 'catalog_wraith', ['catalog_wraith', 'struck_page', 'paper_crane'], { ...l3('e8l3_mixed'), hp: (L3_HP.e8l3_mixed || 1) * GROUP_HP.e8l3_mixed }],
];

/** Ids of the twelve ordinary groups, in plan order. */
export const EP8_GROUP_IDS = GROUPS.map((g) => g[0]);
/** The two boss encounters (each keyed like its enemy, so BOSS_LOOT and the encounter flag line up). */
export const EP8_BOSS_IDS = ['unnamed_sentry', 'eraser'];

const BOSSES = {
  // F2's arena: no flee, the Sentry's flag, the palimpsest backdrop (plan 6.4). Its Struck-Out Pages join mid-fight.
  unnamed_sentry: { zone: 'ep8_library_f2', leader: 'unnamed_sentry', enemies: ['unnamed_sentry'], boss: true, noFlee: true, music: 'battle',
    noElite: true, flag: 'sentry_defeated', backdrop: 'ep8_battle_palimpsest' },
  // The Last Word. startFury: with the Living Concordance lit (the Concordance side story) the party starts with +25 Fury.
  // Grief and Change join mid-fight (ai 'eraser'), so the encounter lists only the Eraser.
  eraser: { zone: 'ep8_last_word', leader: 'eraser', enemies: ['eraser'], boss: true, noFlee: true, music: 'boss_eraser',
    noElite: true, flag: 'eraser_defeated', backdrop: 'ep8_battle_lastword',
    startFury: { flag: 'concordance_lit', amount: 25, text: 'The Living Concordance reads every name it holds. Fury rises! (+25)' } },
};

// level: the party level the zone is tuned for. plan: [encounterId, count] visible enemies the map agents place (E8-maps-a/b).
// backdrop: a key of scenes/battle.js BACKDROPS (E8-tiles builds the ep8_battle_* art; E8-scene-ui registers the keys).
export const EP8_ZONES = {
  ep8_stair: { id: 'ep8_stair', name: 'The Stair of Written Light', level: [31, 31], backdrop: 'ep8_battle_stair', music: 'battle', episode: 8,
    plan: [['e8s_first', 1], ['e8s_hounds', 1], ['e8s_cranes', 1]] },
  ep8_library_f1: { id: 'ep8_library_f1', name: 'The Catalog of Lost Lives', level: [31, 32], backdrop: 'ep8_battle_library', music: 'battle', episode: 8,
    plan: [['e8l1_wraiths', 2], ['e8l1_worms', 1], ['e8l1_mixed', 2]] },
  ep8_library_f2: { id: 'ep8_library_f2', name: 'The Palimpsest Galleries', level: [32, 33], backdrop: 'ep8_battle_palimpsest', music: 'battle', episode: 8,
    plan: [['e8l2_librarian', 1], ['e8l2_cranes', 1], ['e8l2_mixed', 2], ['unnamed_sentry', 1]] },
  ep8_library_f3: { id: 'ep8_library_f3', name: 'The Unwritten Page', level: [33, 33], backdrop: 'ep8_battle_unwritten', music: 'battle', episode: 8,
    plan: [['e8l3_pages', 2], ['e8l3_librarian', 2], ['e8l3_mixed', 1]] },
  ep8_last_word: { id: 'ep8_last_word', name: 'The Last Word', level: [33, 34], backdrop: 'ep8_battle_lastword', music: 'boss_eraser', episode: 8,
    plan: [['eraser', 1]] },
};

let done = false;
/** Add the groups, the bosses and the zones. Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, zone, leader, enemies, extra] of GROUPS) if (!ENCOUNTERS[id]) enc(id, { zone, leader, enemies, ...(extra || {}) });
  for (const [id, o] of Object.entries(BOSSES)) if (!ENCOUNTERS[id]) enc(id, o);
  for (const [id, z] of Object.entries(EP8_ZONES)) {
    if (Object.prototype.hasOwnProperty.call(ZONES, id)) continue;
    Object.defineProperty(ZONES, id, { value: z, enumerable: EP8_MAPS_LISTED, configurable: true, writable: true });
  }
  done = true;
}
export default register;
