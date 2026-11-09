// Episode 5 ("The Last Prophecy") shops (E5-battle; docs/EPISODE5_PLAN.md 7.6). The pack's register() adds the three shops to SHOPS.
// Map ids and keepers follow plan 2.1 and 2.6 (E5-maps-a places the counters; E5-story's npcs.js names the keepers). Idempotent.
// The Dune Lantern Rest (100 gold) is an inn event, not a shop (E5-maps-a).

import { SHOPS } from '../shops.js';

const P = (item, price) => ({ item, price });
export const EP5_SHOPS = {
  // Omar's shade tent on the Caravan Road: road prices (about 8% over list, as Hale's in Episode 4).
  pathkeeper: {
    id: 'pathkeeper', name: "Omar's Shade Tent", map: 'ep5_caravan_road', keeper: 'omar', kind: 'items',
    stock: [
      P('potion', 24), P('hi_potion', 100), P('ether', 70), P('hi_ether', 230), P('antidote', 12), P('eye_drops', 14),
      P('echo_herb', 30), P('phoenix_feather', 170), P('tent', 90), P('silver_salve', 135), P('hourglass_sand', 150),
      P('sandstrider_boots', 2160),
    ],
  },
  // Saffron Caravan Supplies (ep5_sh_shop; Yasmin): list prices, Hourglass Sand, and three of the tier 9 accessories.
  saffron_supplies: {
    id: 'saffron_supplies', name: 'Saffron Caravan Supplies', map: 'ep5_sh_shop', keeper: 'yasmin', kind: 'items',
    stock: [
      { item: 'potion' }, { item: 'hi_potion' }, { item: 'ether' }, { item: 'hi_ether' }, { item: 'antidote' },
      { item: 'eye_drops' }, { item: 'echo_herb' }, { item: 'phoenix_feather' }, { item: 'tent' }, { item: 'silver_salve' },
      { item: 'hourglass_sand' }, { item: 'shade_charm' }, { item: 'lodestar_charm' }, { item: 'dune_mantle' },
    ],
  },
  // The Copperwind Smithy (ep5_sh_smithy; Hassan): tier 9 from arrival, the tier 8 weapons for a party that never bought them,
  // and tier 10 once the Gallery of False Horizons is crossed.
  copperwind: {
    id: 'copperwind', name: 'Copperwind Smithy', map: 'ep5_sh_smithy', keeper: 'hassan', kind: 'equipment',
    stock: [
      { item: 'dunewalker_mail' }, { item: 'starweave_robe' }, { item: 'copper_helm' }, { item: 'saffron_hood' }, { item: 'sandstrider_boots' },
      { item: 'crownguard_sword' }, { item: 'lockwright_axe' }, { item: 'riverguard_halberd' }, { item: 'charter_rod' }, { item: 'reedline_bow' },
      { item: 'copperwind_sword', ifFlag: 'lab_f2_done' }, { item: 'dune_axe', ifFlag: 'lab_f2_done' },
      { item: 'starpike', ifFlag: 'lab_f2_done' }, { item: 'armillary_rod', ifFlag: 'lab_f2_done' },
      { item: 'horizon_bow', ifFlag: 'lab_f2_done' }, { item: 'sunplate_mail', ifFlag: 'lab_f2_done' },
      { item: 'nightglass_robe', ifFlag: 'lab_f2_done' }, { item: 'sunplate_helm', ifFlag: 'lab_f2_done' },
    ],
  },
};

let done = false;
/** Add the shops. Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, s] of Object.entries(EP5_SHOPS)) if (!SHOPS[id]) SHOPS[id] = s;
  done = true;
}
export default register;
