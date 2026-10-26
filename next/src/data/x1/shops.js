// Episode 1 expansion ("The Wider Valley"): two shops and the Willowmere price card (EXPANSION1_PLAN.md 8.3). The pack's register()
// adds the shops to SHOPS (shops.js exports it as a plain object, so no seam was needed there) and replaces willowmere_items'
// stock with the same list plus a tenth-off twin of every entry. The shops add choice, not power: nothing here is not already sold in
// Willowmere or the Archive. A larger gold sink is Episode 2's job (tier 3 and 4 gear). Idempotent.

import { SHOPS } from '../shops.js';
import { ITEMS } from '../items.js';

export const X1_SHOPS = {
  // Tamsin's loom house in Thornfold: the wool trade, and the Willowmere basics at list price.
  thornfold_loom: {
    id: 'thornfold_loom', name: "Tamsin's Loom", map: 'x1_loomhouse', keeper: 'tamsin', keeperSprite: 'npc_tamsin', kind: 'items',
    stock: [
      { item: 'potion' }, { item: 'antidote' }, { item: 'eye_drops' }, { item: 'echo_herb' }, { item: 'honey_roll' }, { item: 'tent' },
      { item: 'wool_mantle' }, { item: 'leather_hood' },
      { item: 'river_charm', ifFlag: 'archive_entered' }, { item: 'scholar_robe', ifFlag: 'archive_entered' },
      { item: 'phoenix_feather', ifFlag: 'archive_entered' },
      { item: 'hi_potion', ifFlag: 'archive_f1_done' }, { item: 'traveler_boots', ifFlag: 'archive_f1_done' },
      { item: 'scout_mantle', ifFlag: 'archive_f1_done' },
    ],
  },
  // Ferrick's stall at the weir: potions and the Episode 1 tier 2 and 3 armor the Willowmere smithy already sells, at list price.
  millrace_stall: {
    id: 'millrace_stall', name: "Ferrick's Stall", map: 'x1_millrace', keeper: 'ferrick', keeperSprite: 'npc_ferrick', kind: 'items',
    stock: [
      { item: 'potion' }, { item: 'hi_potion' }, { item: 'ether' }, { item: 'antidote' }, { item: 'eye_drops' }, { item: 'echo_herb' },
      { item: 'phoenix_feather' }, { item: 'honey_roll' }, { item: 'tent' },
      { item: 'chain_shirt' }, { item: 'iron_helm' }, { item: 'bronze_plate', ifFlag: 'echo_warden_defeated' },
    ],
  },
};

/** The price card: the shop's existing stock, each entry once at list price (until pell_stamp) and once a tenth cheaper (after). */
export function pellCardStock(stock) {
  const out = [];
  for (const s of stock) {
    if (s.ifNotFlag === 'pell_stamp' || (Array.isArray(s.ifFlag) ? s.ifFlag : [s.ifFlag]).includes('pell_stamp')) { out.push(s); continue; }   // already a card entry
    const list = s.price ?? (ITEMS[s.item] ? ITEMS[s.item].price : 0);
    const flags = s.ifFlag ? (Array.isArray(s.ifFlag) ? s.ifFlag : [s.ifFlag]) : [];
    out.push({ ...s, ifNotFlag: 'pell_stamp' });
    out.push({ ...s, price: Math.round(list * 0.9), ifFlag: [...flags, 'pell_stamp'] });
  }
  return out;
}

let done = false;
/** Add the shops and the price card. Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, s] of Object.entries(X1_SHOPS)) if (!SHOPS[id]) SHOPS[id] = s;
  const w = SHOPS.willowmere_items;
  if (w && !w.stock.some((s) => s.ifNotFlag === 'pell_stamp')) w.stock = pellCardStock(w.stock);
  done = true;
}
export default register;
