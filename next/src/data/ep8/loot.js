// Episode 8 ("The Last Word") drop tables (E8-battle; docs/EPISODE8_PLAN.md 7.4, 7.5, 6.4, 6.5). The pack's register() adds them to
// ZONE_LOOT and BOSS_LOOT (plain exported objects) and the Episode 8 rare-name words to battle/loot.js RARE_NAME_EXT (rolled at ilvl 32
// and up). Random tables still never roll legendaries. Idempotent.

import { ZONE_LOOT, BOSS_LOOT } from '../loot-tables.js';
import { RARE_NAME_EXT } from '../../battle/loot.js';
import { RARE_NAME_A_EP8, AFFIX_T10_ILVL } from './items.js';

export const EP8_ZONE_LOOT = {
  ep8_stair: { ilvl: 31, equipChance: 0.18 },
  ep8_library_f1: { ilvl: 32, equipChance: 0.18 },
  ep8_library_f2: { ilvl: 32, equipChance: 0.19 },
  ep8_library_f3: { ilvl: 33, equipChance: 0.19 },
  ep8_last_word: { ilvl: 33, equipChance: 0 },
};

// Keyed by enemy id (each boss is alone in its encounter). The unique is guaranteed; the rolled rares use the boss table.
// Elowen's two gifts (binders_awl, riverwater_thread) are staged in scriptorium_open by the story, not dropped.
export const EP8_BOSS_LOOT = {
  unnamed_sentry: { unique: 'blank_faceplate', rolls: 1, table: 'boss', ilvl: 32,
    consumables: [{ item: 'hi_potion', qty: 2 }] },
  eraser: { unique: 'last_word_pen', rolls: 2, table: 'boss', ilvl: 33,
    consumables: [{ item: 'phoenix_feather', qty: 1 }, { item: 'hi_ether', qty: 2 }] },
};

let done = false;
/** Add the tables and the rare names. Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, z] of Object.entries(EP8_ZONE_LOOT)) if (!ZONE_LOOT[id]) ZONE_LOOT[id] = z;
  for (const [id, b] of Object.entries(EP8_BOSS_LOOT)) if (!BOSS_LOOT[id]) BOSS_LOOT[id] = b;
  if (!RARE_NAME_EXT.some(([, w]) => w === RARE_NAME_A_EP8)) RARE_NAME_EXT.push([AFFIX_T10_ILVL, RARE_NAME_A_EP8]);
  done = true;
}
export default register;
