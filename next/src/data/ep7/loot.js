// Episode 7 ("The Vanishing World") drop tables (E7-battle; docs/EPISODE7_PLAN.md 7.4, 7.5, 6.4, 6.5). The pack's register() adds
// them to ZONE_LOOT and BOSS_LOOT (plain exported objects) and the Episode 7 rare-name words to battle/loot.js RARE_NAME_EXT (rolled
// at ilvl 29 and up). Random tables still never roll legendaries. Idempotent.

import { ZONE_LOOT, BOSS_LOOT } from '../loot-tables.js';
import { RARE_NAME_EXT } from '../../battle/loot.js';
import { RARE_NAME_A_EP7, AFFIX_T9_ILVL } from './items.js';

export const EP7_ZONE_LOOT = {
  ep7_white_road: { ilvl: 28, equipChance: 0.18 },
  ep7_vault_f1: { ilvl: 29, equipChance: 0.18 },
  ep7_vault_f2: { ilvl: 29, equipChance: 0.19 },
  ep7_vault_f3: { ilvl: 30, equipChance: 0.19 },
  ep7_stillheart: { ilvl: 30, equipChance: 0 },
};

// Keyed by enemy id (each boss is alone in its encounter). The unique is guaranteed; the rolled rares use the boss table.
// Nox's two gifts (open_gate, kept_lamp) are staged in doors_reopen by the story, not dropped.
export const EP7_BOSS_LOOT = {
  pale_lantern: { unique: 'borrowed_flame', rolls: 1, table: 'boss', ilvl: 29,
    consumables: [{ item: 'hi_potion', qty: 2 }] },
  white_phantom: { unique: 'stillheart_shard', rolls: 2, table: 'boss', ilvl: 30,
    consumables: [{ item: 'phoenix_feather', qty: 1 }, { item: 'hi_ether', qty: 2 }] },
};

let done = false;
/** Add the tables and the rare names. Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, z] of Object.entries(EP7_ZONE_LOOT)) if (!ZONE_LOOT[id]) ZONE_LOOT[id] = z;
  for (const [id, b] of Object.entries(EP7_BOSS_LOOT)) if (!BOSS_LOOT[id]) BOSS_LOOT[id] = b;
  if (!RARE_NAME_EXT.some(([, w]) => w === RARE_NAME_A_EP7)) RARE_NAME_EXT.push([AFFIX_T9_ILVL, RARE_NAME_A_EP7]);
  done = true;
}
export default register;
