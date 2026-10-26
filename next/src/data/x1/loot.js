// Episode 1 expansion ("The Wider Valley"): zone drop tables and the two optional bosses' loot (EXPANSION1_PLAN.md 7.3, 7.4).
// The pack's register() adds them to ZONE_LOOT and BOSS_LOOT (loot-tables.js exports both as plain objects, so no seam was
// needed there). Random tables still never roll legendaries; chest rules (CHEST_TIERS) are unchanged. Idempotent.

import { ZONE_LOOT, BOSS_LOOT } from '../loot-tables.js';

// ilvl caps which bases and affix tiers can roll; equipChance is per victory (not per enemy).
export const X1_ZONE_LOOT = {
  x1_downs:     { ilvl: 3, equipChance: 0.10 },
  x1_highmoor:  { ilvl: 4, equipChance: 0.11 },
  x1_barrow:    { ilvl: 5, equipChance: 0.12 },
  x1_larchhill: { ilvl: 5, equipChance: 0.12 },
  x1_millrace:  { ilvl: 5, equipChance: 0.12 },
  x1_terrace:   { ilvl: 6, equipChance: 0.12 },
  x1_cellar:    { ilvl: 6, equipChance: 0.12 },
  x1_culvert:   { ilvl: 6, equipChance: 0.12 },
};

// Keyed by enemy id (each boss is alone in its encounter). The unique is guaranteed; the rolled rare uses the boss table.
export const X1_BOSS_LOOT = {
  barrow_reeve: { unique: 'reeves_crook', rolls: 1, table: 'boss', ilvl: 6,
    consumables: [{ item: 'hi_potion', qty: 1 }, { item: 'antidote', qty: 2 }] },
  millstone_golem: { unique: 'millwright_apron', rolls: 1, table: 'boss', ilvl: 7,
    consumables: [{ item: 'hi_potion', qty: 2 }, { item: 'phoenix_feather', qty: 1 }] },
};

let done = false;
/** Add the tables. Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, z] of Object.entries(X1_ZONE_LOOT)) if (!ZONE_LOOT[id]) ZONE_LOOT[id] = z;
  for (const [id, b] of Object.entries(X1_BOSS_LOOT)) if (!BOSS_LOOT[id]) BOSS_LOOT[id] = b;
  done = true;
}
export default register;
