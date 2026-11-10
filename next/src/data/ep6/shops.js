// Episode 6 ("The Skybound Isles") shops (E6-battle; docs/EPISODE6_PLAN.md 7.6). The pack's register() adds the three shops to SHOPS.
// Map ids and keepers follow plan 2.1 and 2.6 (E6-maps-a places the counters; E6-story's npcs.js names the keepers). Idempotent.
// The Cloudhouse Inn (120 gold) is an inn event, not a shop (E6-maps-a).
// Hourglass Sand is Episode 5's (src/data/ep5/items.js): Nova stocks it only while the ep5 pack has registered it (it always has
// when ep6 is up, since the ep6 pack loads after the ep5 pack; the guard keeps a bare test registry from listing a missing item).

import { SHOPS } from '../shops.js';
import { ITEMS } from '../items.js';

const P = (item, price) => ({ item, price });
const CORE = ['potion', 'hi_potion', 'ether', 'hi_ether', 'antidote', 'eye_drops', 'echo_herb', 'phoenix_feather', 'tent', 'silver_salve'];
export const EP6_SHOPS = {
  // Bennet's winch at the Airstair's top: peddler prices (about 8% over list, as Omar's in Episode 5).
  winch: {
    id: 'winch', name: "Bennet's Winch", map: 'ep6_airstair', keeper: 'bennet', kind: 'items',
    stock: [
      P('potion', 24), P('hi_potion', 100), P('ether', 70), P('hi_ether', 230), P('antidote', 12), P('eye_drops', 14),
      P('echo_herb', 30), P('phoenix_feather', 170), P('tent', 90), P('silver_salve', 135), P('ballast_stone', 160),
      P('cloudstep_boots', 2800),
    ],
  },
  // Aeris Flight Provisions (ep6_zl_shop; Nova): list prices, the Ballast Stone, Hourglass Sand, and three of the tier 11 accessories.
  aeris_provisions: {
    id: 'aeris_provisions', name: 'Aeris Flight Provisions', map: 'ep6_zl_shop', keeper: 'nova', kind: 'items',
    stock: [
      ...CORE.map((item) => ({ item })), { item: 'ballast_stone' }, { item: 'hourglass_sand' },
      { item: 'ballast_charm' }, { item: 'signal_charm' }, { item: 'sailcloth_mantle' },
    ],
  },
  // The Galewing Workshop (ep6_zl_workshop; Ilex): tier 11 from arrival, the tier 10 weapons for a party that never bought them,
  // and tier 12 once the Hall of Broken Signals is crossed.
  galewing: {
    id: 'galewing', name: 'The Galewing Workshop', map: 'ep6_zl_workshop', keeper: 'ilex', kind: 'equipment',
    stock: [
      { item: 'skysteel_mail' }, { item: 'windweave_robe' }, { item: 'aviator_helm' }, { item: 'gale_hood' }, { item: 'cloudstep_boots' },
      { item: 'copperwind_sword' }, { item: 'dune_axe' }, { item: 'starpike' }, { item: 'armillary_rod' }, { item: 'horizon_bow' },
      { item: 'galewing_sword', ifFlag: 'obs_f2_done' }, { item: 'stormsplit_axe', ifFlag: 'obs_f2_done' },
      { item: 'skyhook_spear', ifFlag: 'obs_f2_done' }, { item: 'compass_rod', ifFlag: 'obs_f2_done' },
      { item: 'gullwing_bow', ifFlag: 'obs_f2_done' }, { item: 'stormplate_mail', ifFlag: 'obs_f2_done' },
      { item: 'cloudglass_robe', ifFlag: 'obs_f2_done' }, { item: 'stormplate_helm', ifFlag: 'obs_f2_done' },
    ],
  },
};

let done = false;
/** Add the shops (stock entries whose item is not registered are left out). Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, s] of Object.entries(EP6_SHOPS)) {
    if (SHOPS[id]) continue;
    SHOPS[id] = { ...s, stock: s.stock.filter((e) => ITEMS[e.item]) };
  }
  done = true;
}
export default register;
