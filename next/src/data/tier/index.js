// Entry module of the `tier` pack (Fine Print, tier_1; docs/TIER.md). ensurePack('tier') (src/game/packs.js) imports this
// file and calls register(); Node tools and tests import it and call register() themselves. Idempotent.
//
// register() MUTATES the shared tables, as every pack does: the six tier legendaries into UNIQUES and ITEMS, the tier_1 stock
// rows into SHOPS (willowmere_smithy, hollow_smithy), and it installs globalThis.LQ_TIER, the hooks the shell's guarded lines
// call (battle/rules.js makeEnemyUnit, battle/loot.js rollBattleDrops, scenes/title.js enter). Without the pack nothing in
// the base game changes: every seam checks for LQ_TIER first.

import { TIER_LIVE } from './live.js';
import { TIER_LEGENDARIES } from './legendaries.js';
import { TIER_FLAG, TIER_SHOP_ROWS, tierFoe, tierDrops, tierPrice } from './tier.js';
import { UNIQUES, ITEMS } from '../items.js';
import { SHOPS } from '../shops.js';

export const ID = 'tier';

/** The hooks, as installed on globalThis.LQ_TIER. title() loads the title code (./title.js) on first use. */
export const HOOKS = {
  foe: tierFoe,
  drops: tierDrops,
  title(scene) { return import('./title.js').then((m) => m.offerRow(scene)).catch((e) => { console.warn('[tier] title row', e); return false; }); },
};

let done = false;

/** Add the legendaries and the shop rows, and install the hooks. Returns { ok, skipped } (and off: true while TIER_LIVE is false). */
export function register() {
  if (!TIER_LIVE) return { ok: true, skipped: [], off: true };   // switched off: nothing registered, no hooks
  if (!done) {
    for (const [id, it] of Object.entries(TIER_LEGENDARIES)) if (!ITEMS[id]) { UNIQUES[id] = it; ITEMS[id] = { ...it, kind: 'equipment', unique: true }; }
    for (const [shopId, ids] of Object.entries(TIER_SHOP_ROWS)) {
      const shop = SHOPS[shopId];
      if (!shop) continue;
      for (const id of ids) {
        if (!ITEMS[id] || shop.stock.some((s) => s.item === id && s.ifFlag === TIER_FLAG)) continue;
        shop.stock.push({ item: id, price: tierPrice(ITEMS[id].price), ifFlag: TIER_FLAG });
      }
    }
    done = true;
  }
  globalThis.LQ_TIER = HOOKS;
  return { ok: true, skipped: [] };
}

/** Tests: take the hooks away again (the tables keep their additions, as a loaded pack's do). */
export function unregister() { if (globalThis.LQ_TIER === HOOKS) delete globalThis.LQ_TIER; }

export default register;
