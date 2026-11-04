// Episode 4 ("The Sunken Keep") drop tables (E4-battle; docs/EPISODE4_PLAN.md 7.5, 6.4, 6.5). The pack's register() adds them to
// ZONE_LOOT and BOSS_LOOT (plain exported objects). Random tables still never roll legendaries. Idempotent.
// The road's ilvl is 18, not the plan's 17, so its drops can roll the tier 7 bases (now ilvl 18: items.js says why).

import { ZONE_LOOT, BOSS_LOOT } from '../loot-tables.js';

export const EP4_ZONE_LOOT = {
  ep4_flood_road: { ilvl: 18, equipChance: 0.16 },
  ep4_keep_f1: { ilvl: 18, equipChance: 0.17 },
  ep4_keep_f2: { ilvl: 19, equipChance: 0.17 },
  ep4_keep_f3: { ilvl: 20, equipChance: 0.18 },
  ep4_keep_crown: { ilvl: 20, equipChance: 0 },
};

// Keyed by enemy id (each boss is alone in its encounter). The unique is guaranteed; the rolled rares use the boss table.
export const EP4_BOSS_LOOT = {
  barrister: { unique: 'barristers_quill', rolls: 1, table: 'boss', ilvl: 18,
    consumables: [{ item: 'hi_potion', qty: 2 }] },
  paper_regent: { unique: 'regents_seal', rolls: 2, table: 'boss', ilvl: 20,
    consumables: [{ item: 'phoenix_feather', qty: 1 }, { item: 'hi_ether', qty: 2 }] },
};

let done = false;
/** Add the tables. Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, z] of Object.entries(EP4_ZONE_LOOT)) if (!ZONE_LOOT[id]) ZONE_LOOT[id] = z;
  for (const [id, b] of Object.entries(EP4_BOSS_LOOT)) if (!BOSS_LOOT[id]) BOSS_LOOT[id] = b;
  done = true;
}
export default register;
