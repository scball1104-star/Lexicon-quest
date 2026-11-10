// Episode 6 ("The Skybound Isles") drop tables (E6-battle; docs/EPISODE6_PLAN.md 7.4, 7.5, 6.4, 6.5). The pack's register() adds
// them to ZONE_LOOT and BOSS_LOOT (plain exported objects) and the Episode 6 rare-name words to battle/loot.js RARE_NAME_EXT (rolled
// at ilvl 26 and up). Random tables still never roll legendaries. Idempotent.

import { ZONE_LOOT, BOSS_LOOT } from '../loot-tables.js';
import { RARE_NAME_EXT } from '../../battle/loot.js';
import { RARE_NAME_A_EP6, AFFIX_T8_ILVL } from './items.js';

export const EP6_ZONE_LOOT = {
  ep6_airstair: { ilvl: 25, equipChance: 0.17 },
  ep6_obs_f1: { ilvl: 25, equipChance: 0.17 },
  ep6_obs_f2: { ilvl: 26, equipChance: 0.18 },
  ep6_obs_f3: { ilvl: 27, equipChance: 0.18 },
  ep6_obs_eyrie: { ilvl: 27, equipChance: 0 },
};

// Keyed by enemy id (each boss is alone in its encounter). The unique is guaranteed; the rolled rares use the boss table.
export const EP6_BOSS_LOOT = {
  gale_engine: { unique: 'bellows_heart', rolls: 1, table: 'boss', ilvl: 26,
    consumables: [{ item: 'hi_potion', qty: 2 }] },
  scribe: { unique: 'scribe_quill', rolls: 2, table: 'boss', ilvl: 27,
    consumables: [{ item: 'phoenix_feather', qty: 1 }, { item: 'hi_ether', qty: 2 }] },
};

let done = false;
/** Add the tables and the rare names. Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, z] of Object.entries(EP6_ZONE_LOOT)) if (!ZONE_LOOT[id]) ZONE_LOOT[id] = z;
  for (const [id, b] of Object.entries(EP6_BOSS_LOOT)) if (!BOSS_LOOT[id]) BOSS_LOOT[id] = b;
  if (!RARE_NAME_EXT.some(([, w]) => w === RARE_NAME_A_EP6)) RARE_NAME_EXT.push([AFFIX_T8_ILVL, RARE_NAME_A_EP6]);
  done = true;
}
export default register;
