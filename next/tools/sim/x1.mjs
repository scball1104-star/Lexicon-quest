// Episode 1 expansion ("The Wider Valley") for the balance simulator: loadouts, suite levels, boss levels and targets for the eight
// optional zones and the two optional bosses (EXPANSION1_PLAN.md 7.3, 7.4, 7.5). ADDITIONS ONLY: progression(), TARGETS (including
// TARGETS.levels), BOSS_LEVELS' existing keys, route.mjs and every main-route number keep their meaning.
//
// simulate.mjs imports this module through its EXTENSIONS list (the Episode 2 files join with one line: `import ... from './x2.mjs'`
// and one more entry in that list). Importing it registers the x1 content (enemies, items, loot, encounters, shops: the same
// register() functions the pack calls, all idempotent) and adds the loadouts. It never imports simulate.mjs (a cycle with the CLI's
// top-level await would deadlock; route.mjs avoids it the same way).
//
// The new zones are played at their listed levels with today's plain loadouts (no placed gear: docs/BATTLE_X1.md has one informational
// pass of the two bosses with their uniques equipped, tools/sim/out/x1_bosses_geared.mjs).

import { LOADOUTS } from './loadouts.mjs';
import registerEnemies from '../../src/data/x1/enemies.js';
import registerItems from '../../src/data/x1/items.js';
import registerLoot from '../../src/data/x1/loot.js';
import registerEncounters from '../../src/data/x1/encounters.js';
import registerShops from '../../src/data/x1/shops.js';

// Same order as the pack's ORDER (src/data/x1/index.js): enemies, items, loot, encounters, shops.
registerEnemies(); registerItems(); registerLoot(); registerEncounters(); registerShops();

// ------------------------------------------------------------------ loadouts
// Plan 7.3 "Loadout for the sim": the Downs at Lv 3 use `valley`, at Lv 4 `archive_f1`; the Moor `archive_f1`; the Barrow, Larchhill and
// the Millrace `archive_f2`; the Terrace, Cellar and Culvert `archive_f3`. LOADOUTS[zone] is the zone's main row (the CLI --trace and
// the suite default); LOADOUT_AT overrides it per level.
LOADOUTS.x1_downs = LOADOUTS.archive_f1;
LOADOUTS.x1_highmoor = LOADOUTS.archive_f1;
LOADOUTS.x1_barrow = LOADOUTS.archive_f2;
LOADOUTS.x1_larchhill = LOADOUTS.archive_f2;
LOADOUTS.x1_millrace = LOADOUTS.archive_f2;
LOADOUTS.x1_terrace = LOADOUTS.archive_f3;
LOADOUTS.x1_cellar = LOADOUTS.archive_f3;
LOADOUTS.x1_culvert = LOADOUTS.archive_f3;

export const SIM_EXTENSION = {
  id: 'x1',
  /** zone -> party levels the suite plays it at (the plan's `level` ranges). */
  suiteLevels: {
    x1_downs: [3, 4], x1_highmoor: [4, 5], x1_barrow: [5, 6], x1_larchhill: [5, 6], x1_millrace: [5, 6],
    x1_terrace: [6, 7], x1_cellar: [6, 7], x1_culvert: [6, 7],
  },
  /** boss encounter -> the levels it is played at (Lv 5 and 6 for the Reeve, Lv 6 and 7 for the Golem). */
  bossLevels: { barrow_reeve: [5, 6], millstone_golem: [6, 7] },
  /** zone -> { level: loadout row } where a level uses a different row than LOADOUTS[zone]. */
  loadoutAt: { x1_downs: { 3: 'valley', 4: 'archive_f1' } },
  /** The Alpha's targets (W6-content): careful play 6 to 9 rounds and wins 85%, attack-only wins at most 60%. */
  targets: {
    barrow_reeve: { roundsMin: 6, roundsMax: 9, winMin: 0.85, naiveWinMax: 0.6 },
    millstone_golem: { roundsMin: 6, roundsMax: 9, winMin: 0.85, naiveWinMax: 0.6 },
  },
  /** Bosses measured by the BOSS_TARGETS loop (careful vs attack-only; reckless is recorded, not required). */
  bossTargets: ['barrow_reeve', 'millstone_golem'],
  /** episode -> zones the default suite adds (after the main route and the Hollow). */
  zones: { 1: ['x1_downs', 'x1_highmoor', 'x1_barrow', 'x1_larchhill', 'x1_millrace', 'x1_terrace', 'x1_cellar', 'x1_culvert'] },
};
export default SIM_EXTENSION;
