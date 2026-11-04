// Episode 4 ("The Sunken Keep") shops (E4-battle; docs/EPISODE4_PLAN.md 7.6). The pack's register() adds the three shops to
// SHOPS and gives Garrick's forge in Emberpeak (pk_smithy) its after-the-credits restock: one tier 8 weapon each for Bram and
// the hero, after ep4_complete. Map ids and keepers follow plan 2.1 and 2.6 (E4-maps-a places the counters). Idempotent.

import { SHOPS } from '../shops.js';

// Hale's ferry landing on the Flood Road: road prices (about 8% over list, as Penny's in Episodes 2 and 3).
const P = (item, price) => ({ item, price });
export const EP4_SHOPS = {
  ferry_peddler: {
    id: 'ferry_peddler', name: "Hale's Landing", map: 'ep4_flood_road', keeper: 'hale', kind: 'items',
    stock: [
      P('potion', 24), P('hi_potion', 100), P('ether', 70), P('hi_ether', 230), P('antidote', 12), P('eye_drops', 14),
      P('echo_herb', 30), P('phoenix_feather', 170), P('tent', 90), P('silver_salve', 135), P('lamp_oil', 120), P('wader_boots', 1620),
    ],
  },
  // The Riverbank Provisioner (ep4_vw_shop; Linn helps): list prices, Lamp Oil, and three of the tier 7 accessories.
  riverbank: {
    id: 'riverbank', name: 'Riverbank Provisioner', map: 'ep4_vw_shop', keeper: 'linn', kind: 'items',
    stock: [
      { item: 'potion' }, { item: 'hi_potion' }, { item: 'ether' }, { item: 'hi_ether' }, { item: 'antidote' },
      { item: 'eye_drops' }, { item: 'echo_herb' }, { item: 'phoenix_feather' }, { item: 'tent' }, { item: 'silver_salve' },
      { item: 'lamp_oil' }, { item: 'waxseal_charm' }, { item: 'tidemark_charm' }, { item: 'ferry_mantle' },
    ],
  },
  // The Crown Guard Forge (ep4_vw_forge): tier 7 from arrival, the tier 6 weapons for a party that never bought them, and
  // tier 8 once the Archives Below Water are crossed.
  vw_forge: {
    id: 'vw_forge', name: 'Crown Guard Forge', map: 'ep4_vw_forge', keeper: 'ep4_smith', kind: 'equipment',
    stock: [
      { item: 'riverguard_plate' }, { item: 'scribes_robe' }, { item: 'riverguard_helm' }, { item: 'oilskin_hood' }, { item: 'wader_boots' },
      { item: 'tempered_sword' }, { item: 'forge_axe' }, { item: 'heartforge_pike' }, { item: 'founders_rod' }, { item: 'bellwire_bow' },
      { item: 'crownguard_sword', ifFlag: 'keep_f2_done' }, { item: 'lockwright_axe', ifFlag: 'keep_f2_done' },
      { item: 'riverguard_halberd', ifFlag: 'keep_f2_done' }, { item: 'charter_rod', ifFlag: 'keep_f2_done' },
      { item: 'reedline_bow', ifFlag: 'keep_f2_done' }, { item: 'crownguard_mail', ifFlag: 'keep_f2_done' },
      { item: 'archivist_robe', ifFlag: 'keep_f2_done' }, { item: 'crownguard_helm', ifFlag: 'keep_f2_done' },
    ],
  },
};

/** Garrick's restock in Emberpeak after the Episode 4 credits (plan 7.6). */
export const PK_SMITHY_RESTOCK = [
  { item: 'riverguard_halberd', ifFlag: 'ep4_complete' },
  { item: 'crownguard_sword', ifFlag: 'ep4_complete' },
];

let done = false;
/** Add the shops and the restock. Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, s] of Object.entries(EP4_SHOPS)) if (!SHOPS[id]) SHOPS[id] = s;
  const pk = SHOPS.pk_smithy;
  if (pk) for (const s of PK_SMITHY_RESTOCK) if (!pk.stock.some((x) => x.item === s.item && x.ifFlag === s.ifFlag)) pk.stock.push(s);
  done = true;
}
export default register;
