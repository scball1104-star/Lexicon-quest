// Episode 8 ("The Last Word") shops and the gold line (E8-battle; docs/EPISODE8_PLAN.md 7.6). The pack's register() adds the three
// shops to SHOPS. Map ids and keepers follow plan 2.1 and 2.6 (E8-maps-a places the counters; E8-story's npcs.js names the keepers).
// Idempotent. The Keeper's Quiet Rooms (160 gold) is an inn event, not a shop (E8-maps-a).
//
// EP8_GOLD_LINE is the contract the simulator's binding `economy8` check reads (tools/sim/ep8.mjs) and the map agents place: the
// main-path gold chests (the Forgotten Traveler Satchel on the Stair, the shelf chest on F1, the Seal Gallery chest by the Sentry's
// arena on F2), the optional gold, and the two pieces at each buy-point. E8-maps-a/b: a chest that pays a different amount must change
// this table in the same change, or the gold line the check proves is not the one the player walks.

import { SHOPS } from '../shops.js';
import { ITEMS } from '../items.js';

export const EP8_GOLD_LINE = {
  // [where, chest, gold] on the main path, in route order
  mainChests: [['ep8_stair', 'the Forgotten Traveler Satchel', 2000], ['ep8_library_f1', 'the Catalog shelf chest', 1500],
    ['ep8_library_f2', 'the Seal Gallery chest', 1700]],
  // optional gold: the Palimpsest reading room (F2, 450) and the Uncensored Archive's strongbox (the Archive side story, 500)
  optionalChests: [['ep8_library_f2', 'the Palimpsest reading room', 450], ['ep8_scriptorium', 'the Uncensored Archive strongbox', 500]],
  townPieces: ['vellum_plate', 'glyphweave_robe'],        // bought on arrival at the Scriptorium (after the Stair)
  preF3Pieces: ['quillsteel_sword', 'lexicon_staff'],     // bought after library_f2_done, before F3
  spare: 300,                                             // each buy-point keeps this much for consumables
  inn: 160,
};

const P = (item, price) => ({ item, price });
const CORE = ['potion', 'hi_potion', 'ether', 'hi_ether', 'antidote', 'eye_drops', 'echo_herb', 'phoenix_feather', 'tent', 'silver_salve'];
export const EP8_SHOPS = {
  // Bibliotheca Supplies (ep8_sc_shop; the Archive Keeper): list prices, Fresh Ink, the two tier 15 charms and the mantle.
  bibliotheca: {
    id: 'bibliotheca', name: 'Bibliotheca Supplies', map: 'ep8_sc_shop', keeper: 'ep8_shopkeeper', kind: 'items',
    stock: [...CORE.map((item) => ({ item })), { item: 'fresh_ink' }, { item: 'fixative_charm' }, { item: 'bookmark_charm' }, { item: 'bookcloth_mantle' }],
  },
  // The Glyphsmith Atelier (ep8_sc_atelier; Sorel): tier 15 from arrival, the tier 14 weapons for a party that never bought them, and
  // tier 16 once the Palimpsest Galleries are crossed.
  glyphsmith: {
    id: 'glyphsmith', name: 'The Glyphsmith Atelier', map: 'ep8_sc_atelier', keeper: 'sorel', kind: 'equipment',
    stock: [
      { item: 'vellum_plate' }, { item: 'glyphweave_robe' }, { item: 'folio_helm' }, { item: 'reading_hood' }, { item: 'margin_boots' },
      { item: 'iceglass_sword' }, { item: 'glacier_axe' }, { item: 'frostline_spear' }, { item: 'aurora_staff' }, { item: 'snowowl_bow' },
      ...['quillsteel_sword', 'folio_axe', 'index_spear', 'lexicon_staff', 'crane_bow', 'gilt_mail', 'gilt_robe', 'gilt_helm']
        .map((item) => ({ item, ifFlag: 'library_f2_done' })),
    ],
  },
  // Quinn's satchel at the South Margin (the top of the Stair): peddler prices (about 8% over list, as Sol's in Episode 7).
  quinn_satchel: {
    id: 'quinn_satchel', name: "Quinn's Satchel", map: 'ep8_stair', keeper: 'quinn', kind: 'items',
    stock: [P('hi_potion', 100), P('hi_ether', 230), P('phoenix_feather', 170), P('fresh_ink', 195), P('margin_boots', 1780)],
  },
};

let done = false;
/** Add the shops (stock entries whose item is not registered are left out). Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, s] of Object.entries(EP8_SHOPS)) {
    if (SHOPS[id]) continue;
    SHOPS[id] = { ...s, stock: s.stock.filter((e) => ITEMS[e.item]) };
  }
  done = true;
}
export default register;
