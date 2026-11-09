// Episode 5 ("The Last Prophecy") drop tables (E5-battle; docs/EPISODE5_PLAN.md 7.4, 7.5, 6.4, 6.5). The pack's register() adds them
// to ZONE_LOOT and BOSS_LOOT (plain exported objects) and the Episode 5 rare-name words to battle/loot.js RARE_NAME_EXT (rolled at
// ilvl 22 and up). Random tables still never roll legendaries. Idempotent.

import { ZONE_LOOT, BOSS_LOOT } from '../loot-tables.js';
import { RARE_NAME_EXT } from '../../battle/loot.js';
import { RARE_NAME_A_EP5, AFFIX_T7_ILVL } from './items.js';

export const EP5_ZONE_LOOT = {
  ep5_ship: { ilvl: 21, equipChance: 0.16 },
  ep5_caravan_road: { ilvl: 21, equipChance: 0.16 },
  ep5_lab_f1: { ilvl: 22, equipChance: 0.17 },
  ep5_lab_f2: { ilvl: 23, equipChance: 0.17 },
  ep5_lab_f3: { ilvl: 24, equipChance: 0.18 },
  ep5_lab_oracle: { ilvl: 24, equipChance: 0 },
};

// Keyed by enemy id (each boss is alone in its encounter). The unique is guaranteed; the rolled rares use the boss table.
export const EP5_BOSS_LOOT = {
  mirage_knight: { unique: 'horizon_glass', rolls: 1, table: 'boss', ilvl: 23,
    consumables: [{ item: 'hi_potion', qty: 2 }] },
  oracle: { unique: 'oracle_mask', rolls: 2, table: 'boss', ilvl: 24,
    consumables: [{ item: 'phoenix_feather', qty: 1 }, { item: 'hi_ether', qty: 2 }] },
};

let done = false;
/** Add the tables and the rare names. Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, z] of Object.entries(EP5_ZONE_LOOT)) if (!ZONE_LOOT[id]) ZONE_LOOT[id] = z;
  for (const [id, b] of Object.entries(EP5_BOSS_LOOT)) if (!BOSS_LOOT[id]) BOSS_LOOT[id] = b;
  if (!RARE_NAME_EXT.some(([, w]) => w === RARE_NAME_A_EP5)) RARE_NAME_EXT.push([AFFIX_T7_ILVL, RARE_NAME_A_EP5]);
  done = true;
}
export default register;
