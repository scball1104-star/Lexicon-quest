// Episode 7 ("The Vanishing World") shops and the gold line (E7-battle; docs/EPISODE7_PLAN.md 7.6). The pack's register() adds the
// three shops to SHOPS. Map ids and keepers follow plan 2.1 and 2.6 (E7-maps-a places the counters; E7-story's npcs.js names the
// keepers). Idempotent. The Thawlight Lodge (140 gold) is an inn event, not a shop (E7-maps-a).
//
// EP7_GOLD_LINE is the contract the simulator's binding `economy7` check reads (tools/sim/ep7.mjs) and the map agents place: the
// main-path gold chests (the Courier's Strongbox on the White Road, the Winterwatch Provision Cache on F1, the Lamp Gallery chest by
// the Lantern's door on F2), the optional gold, and the two pieces at each buy-point. E7-maps-a/b: a chest that pays a different
// amount must change this table in the same change, or the gold line the check proves is not the one the player walks.

import { SHOPS } from '../shops.js';
import { ITEMS } from '../items.js';

export const EP7_GOLD_LINE = {
  // [where, chest, gold] on the main path, in route order
  mainChests: [['ep7_white_road', "the Courier's Strongbox", 1800], ['ep7_vault_f1', 'the Winterwatch Provision Cache', 1500],
    ['ep7_vault_f2', 'the Lamp Gallery chest', 1200]],
  // optional gold: the Reliquary (F2, 450) and the Hearth of Returning Names (Palehaven side story, 400)
  optionalChests: [['ep7_vault_f2', 'the Keeper Emergency Reliquary', 450], ['ep7_palehaven', 'the Hearth of Returning Names', 400]],
  townPieces: ['rimeplate_mail', 'snowveil_robe'],     // bought on arrival at Palehaven (after the White Road)
  preF3Pieces: ['iceglass_sword', 'aurora_staff'],     // bought after vault_f2_done, before F3
  spare: 300,                                          // each buy-point keeps this much for consumables
  inn: 140,
};

const P = (item, price) => ({ item, price });
const CORE = ['potion', 'hi_potion', 'ether', 'hi_ether', 'antidote', 'eye_drops', 'echo_herb', 'phoenix_feather', 'tent', 'silver_salve'];
export const EP7_SHOPS = {
  // Sol's pack at the Courier's Waystation: peddler prices (about 8% over list, as Bennet's in Episode 6).
  waystation_pack: {
    id: 'waystation_pack', name: "Sol's Pack", map: 'ep7_waystation', keeper: 'sol_waystation', kind: 'items',
    stock: [
      P('potion', 24), P('hi_potion', 100), P('ether', 70), P('hi_ether', 230), P('antidote', 12), P('eye_drops', 14),
      P('echo_herb', 30), P('phoenix_feather', 170), P('tent', 90), P('silver_salve', 135), P('ember_tea', 175),
      P('drift_boots', 1650),
    ],
  },
  // Northwind Provisions (ep7_ph_shop; Maera): list prices, Ember Tea, the two tier 13 charms and the mantle.
  northwind: {
    id: 'northwind', name: 'Northwind Provisions', map: 'ep7_ph_shop', keeper: 'maera', kind: 'items',
    stock: [...CORE.map((item) => ({ item })), { item: 'ember_tea' }, { item: 'thaw_charm' }, { item: 'glasswick_charm' }, { item: 'hearthwool_mantle' }],
  },
  // The Glass-Ice Armory (ep7_ph_armory; Eira): tier 13 from arrival, the tier 12 weapons for a party that never bought them, and
  // tier 14 once the Hall of Borrowed Light is crossed.
  glassice_armory: {
    id: 'glassice_armory', name: 'The Glass-Ice Armory', map: 'ep7_ph_armory', keeper: 'eira_forge', kind: 'equipment',
    stock: [
      { item: 'rimeplate_mail' }, { item: 'snowveil_robe' }, { item: 'glassice_helm' }, { item: 'aurora_hood' }, { item: 'drift_boots' },
      { item: 'galewing_sword' }, { item: 'stormsplit_axe' }, { item: 'skyhook_spear' }, { item: 'compass_rod' }, { item: 'gullwing_bow' },
      ...['iceglass_sword', 'glacier_axe', 'frostline_spear', 'aurora_staff', 'snowowl_bow', 'wintersteel_mail', 'glassweave_robe',
        'wintersteel_helm'].map((item) => ({ item, ifFlag: 'vault_f2_done' })),
    ],
  },
};

let done = false;
/** Add the shops (stock entries whose item is not registered are left out). Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, s] of Object.entries(EP7_SHOPS)) {
    if (SHOPS[id]) continue;
    SHOPS[id] = { ...s, stock: s.stock.filter((e) => ITEMS[e.item]) };
  }
  done = true;
}
export default register;
