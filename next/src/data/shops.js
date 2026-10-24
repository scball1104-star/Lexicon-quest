// Shops: Willowmere item shop, the smithy, a valley peddler, Rook's salvage in the Rootbound Stacks, and Episode 2's
// Waystation peddler, Hollow Provisioner and Silverglass Smithy. Pure data.
//
// stock entries: { item, price?, ifFlag?, ifNotFlag? }  (ifFlag may be a list: all must be set; price defaults to the item's price; flags are
// story flags from COMMON.md / data/quests.js). Selling pays battle/loot.js itemValue() for gear and
// half price for consumables. Key items cannot be sold.

export const SHOPS = {
  willowmere_items: {
    id: 'willowmere_items', name: 'Willowmere Goods', map: 'item_shop', keeper: 'npc_shopkeeper', kind: 'items',
    stock: [
      { item: 'potion' },
      { item: 'ether' },
      { item: 'antidote' },
      { item: 'eye_drops' },
      { item: 'echo_herb' },
      { item: 'tent' },
      { item: 'phoenix_feather', ifFlag: 'archive_entered' },
      { item: 'hi_potion', ifFlag: 'archive_f1_done' },
      { item: 'bronze_charm' },
      { item: 'owl_charm', ifFlag: 'archive_entered' },
      { item: 'river_charm', ifFlag: 'archive_entered' },
    ],
  },
  willowmere_smithy: {
    id: 'willowmere_smithy', name: 'The Willowmere Forge', map: 'smithy', keeper: 'npc_smith', kind: 'equipment',
    stock: [
      // Tier 1 from the start. The Leather Hood carries Garrick's neighbour price (60, list 90) so one real
      // upgrade (+3 def on an empty head slot) fits the 80 starting gold and the valley's loot before the
      // Archive (PLAYTEST 7.7). Sell value stays the list-based 45, so there is no buy-sell loop.
      { item: 'short_sword' }, { item: 'hatchet' }, { item: 'ash_spear' }, { item: 'oak_staff' }, { item: 'short_bow' },
      { item: 'leather_vest' }, { item: 'leather_hood', price: 60 }, { item: 'cloth_cap' }, { item: 'leather_boots' },
      { item: 'wool_mantle' },
      // Tier 2 once the Archive has been opened (the smith hears the news and fires the forge).
      { item: 'longsword', ifFlag: 'archive_entered' }, { item: 'battle_axe', ifFlag: 'archive_entered' },
      { item: 'iron_pike', ifFlag: 'archive_entered' }, { item: 'crystal_rod', ifFlag: 'archive_entered' },
      { item: 'hunters_bow', ifFlag: 'archive_entered' }, { item: 'chain_shirt', ifFlag: 'archive_entered' },
      { item: 'scholar_robe', ifFlag: 'archive_entered' },
      { item: 'iron_helm', ifFlag: 'archive_f1_done' }, { item: 'silver_circlet', ifFlag: 'archive_f1_done' },
      { item: 'traveler_boots', ifFlag: 'archive_f1_done' }, { item: 'scout_mantle', ifFlag: 'archive_f1_done' },
      // Heavy plate after the Echo Warden falls.
      { item: 'bronze_plate', ifFlag: 'echo_warden_defeated' },
      // W10 (PLAYTEST_REVIEW_2 fix 7): tier 3 once the Galleries are crossed, the same blades Rook sells by the
      // great door, so gold has a use from the Lantern on (1,377 at the Lantern, 2,906 at the end in the bot run).
      { item: 'runed_saber', ifFlag: 'archive_f2_done' }, { item: 'bearded_axe', ifFlag: 'archive_f2_done' },
      { item: 'winged_lance', ifFlag: 'archive_f2_done' }, { item: 'archivist_staff', ifFlag: 'archive_f2_done' },
      { item: 'yew_longbow', ifFlag: 'archive_f2_done' },
      // Episode 2 restock (Garrick, EPISODE2_PLAN.md 7.6): the tier 3 weapons for a save that starts at ep1_complete
      // (newGameEp2 may not carry archive_f2_done); ifNotFlag keeps an Episode 1 save from listing them twice.
      { item: 'runed_saber', ifFlag: 'ep1_complete', ifNotFlag: 'archive_f2_done' },
      { item: 'bearded_axe', ifFlag: 'ep1_complete', ifNotFlag: 'archive_f2_done' },
      { item: 'winged_lance', ifFlag: 'ep1_complete', ifNotFlag: 'archive_f2_done' },
      { item: 'archivist_staff', ifFlag: 'ep1_complete', ifNotFlag: 'archive_f2_done' },
      { item: 'yew_longbow', ifFlag: 'ep1_complete', ifNotFlag: 'archive_f2_done' },
    ],
  },
  // W10: the gold sink inside the Archive. Rook camps by the Keeper's font in the great door hall (F3), so the
  // first chance to spend comes right where the party has the gold and the reason (the Archivore behind the door).
  // Tier 3 weapons at list price, the Echo Warden's plate tier, and a dungeon markup on the consumables.
  archive_salvage: {
    id: 'archive_salvage', name: "Rook's Salvage", map: 'archive_f3', keeper: 'rook', kind: 'equipment',
    stock: [
      { item: 'runed_saber' }, { item: 'bearded_axe' }, { item: 'winged_lance' }, { item: 'archivist_staff' },
      { item: 'yew_longbow' }, { item: 'bronze_plate' },
      { item: 'hi_potion', price: 110 }, { item: 'ether', price: 80 }, { item: 'phoenix_feather', price: 180 },
      { item: 'echo_herb', price: 30 }, { item: 'eye_drops', price: 15 },
    ],
  },
  valley_peddler: {
    id: 'valley_peddler', name: 'Wandering Peddler', map: 'valley', keeper: 'npc_peddler',
    keeperSprite: 'npc_farmer', kind: 'items',
    stock: [
      { item: 'potion', price: 24 },
      { item: 'ether', price: 70 },
      { item: 'antidote', price: 12 },
      { item: 'eye_drops', price: 14 },
      { item: 'echo_herb', price: 30 },
      { item: 'phoenix_feather', price: 170 },
      { item: 'leather_boots', price: 110 },
      { item: 'hatchet', price: 100 },
    ],
  },

  // ---------------------------------------------------------------- Episode 2 (EPISODE2_PLAN.md 7.6)
  // Penny at the Waystation on the Fading Road: road prices, and the first look at tier 3 boots.
  east_peddler: {
    id: 'east_peddler', name: "Penny's Cart", map: 'east_road', keeper: 'penny_e', kind: 'items',
    stock: [
      { item: 'potion', price: 24 }, { item: 'hi_potion', price: 100 }, { item: 'ether', price: 70 },
      { item: 'hi_ether', price: 230 }, { item: 'antidote', price: 12 }, { item: 'eye_drops', price: 14 },
      { item: 'echo_herb', price: 30 }, { item: 'phoenix_feather', price: 170 }, { item: 'tent', price: 90 },
      { item: 'strider_boots', price: 520 },
    ],
  },
  // Fitch's Hollow Provisioner (nh_shop). The Silver Salve appears once the Court is open (the King's Keeping).
  hollow_items: {
    id: 'hollow_items', name: 'Hollow Provisioner', map: 'nh_shop', keeper: 'fitch', kind: 'items',
    stock: [
      { item: 'potion' }, { item: 'hi_potion' }, { item: 'ether' }, { item: 'hi_ether' }, { item: 'antidote' },
      { item: 'eye_drops' }, { item: 'echo_herb' }, { item: 'phoenix_feather' }, { item: 'tent' },
      { item: 'silver_salve', ifFlag: 'court_entered' },
      { item: 'lantern_charm' }, { item: 'mirror_charm' }, { item: 'clock_charm' },
    ],
  },
  // Vessa's Silverglass Smithy (nh_smithy): tier 3 from arrival, tier 4 once the Hall of Other Selves is crossed.
  hollow_smithy: {
    id: 'hollow_smithy', name: 'Silverglass Smithy', map: 'nh_smithy', keeper: 'vessa', kind: 'equipment',
    stock: [
      { item: 'runed_saber' }, { item: 'bearded_axe' }, { item: 'winged_lance' }, { item: 'archivist_staff' },
      { item: 'yew_longbow' }, { item: 'steel_cuirass' }, { item: 'sage_robe' }, { item: 'steel_helm' },
      { item: 'moon_circlet' }, { item: 'ranger_mantle' }, { item: 'strider_boots' }, { item: 'bronze_plate' },
      { item: 'silverglass_blade', ifFlag: 'court_f2_done' }, { item: 'moonsteel_axe', ifFlag: 'court_f2_done' },
      { item: 'mere_pike', ifFlag: 'court_f2_done' }, { item: 'mirror_rod', ifFlag: 'court_f2_done' },
      { item: 'glasswing_bow', ifFlag: 'court_f2_done' }, { item: 'silver_mail', ifFlag: 'court_f2_done' },
      { item: 'mirrorweave_robe', ifFlag: 'court_f2_done' }, { item: 'glass_helm', ifFlag: 'court_f2_done' },
      { item: 'mirror_circlet', ifFlag: 'court_f2_done' }, { item: 'mere_boots', ifFlag: 'court_f2_done' },
      { item: 'veil_mantle', ifFlag: 'court_f2_done' },
      // Episode 3 restock (Vessa, EPISODE3_PLAN.md 7.6): tier 5 for Mira once the sand is delivered (the charm is not sold)
      { item: 'founders_robe', ifFlag: 'sand_done' }, { item: 'soot_hood', ifFlag: 'sand_done' },
    ],
  },

  // ---------------------------------------------------------------- Episode 3 (EPISODE3_PLAN.md 7.6)
  // Penny on the Old Sand Road: road prices (about 8% over list), a flask for the first slag, and the first look at tier 5 boots.
  sand_peddler: {
    id: 'sand_peddler', name: "Penny's Cart", map: 'sand_road', keeper: 'penny_s', kind: 'items',
    stock: [
      { item: 'potion', price: 24 }, { item: 'hi_potion', price: 100 }, { item: 'ether', price: 70 },
      { item: 'hi_ether', price: 230 }, { item: 'antidote', price: 12 }, { item: 'eye_drops', price: 14 },
      { item: 'echo_herb', price: 30 }, { item: 'phoenix_feather', price: 170 }, { item: 'tent', price: 90 },
      { item: 'silver_salve', price: 135 }, { item: 'quench_flask', price: 100 }, { item: 'cinder_boots', price: 970 },
    ],
  },
  // Taro's Ventworks Supplies (pk_shop): list prices, the flask, and the three tier 5 accessories.
  ventworks: {
    id: 'ventworks', name: 'Ventworks Supplies', map: 'pk_shop', keeper: 'taro', kind: 'items',
    stock: [
      { item: 'potion' }, { item: 'hi_potion' }, { item: 'ether' }, { item: 'hi_ether' }, { item: 'antidote' },
      { item: 'eye_drops' }, { item: 'echo_herb' }, { item: 'phoenix_feather' }, { item: 'tent' }, { item: 'silver_salve' },
      { item: 'quench_flask' }, { item: 'coalheart_charm' }, { item: 'bellchime_charm' }, { item: 'carter_mantle' },
    ],
  },
  // Sella's forge in Emberpeak (pk_smithy; Garrick takes the anvil after forge_relit): tier 5 from arrival, the tier 4 weapons
  // for a party that skipped Vessa's, and tier 6 once the Galleries are crossed and the forge is lit again.
  pk_smithy: {
    id: 'pk_smithy', name: 'Emberpeak Weaponsmith', map: 'pk_smithy', keeper: 'sella', kind: 'equipment',
    stock: [
      { item: 'ashsteel_cuirass' }, { item: 'founders_robe' }, { item: 'ashsteel_helm' }, { item: 'soot_hood' }, { item: 'cinder_boots' },
      { item: 'silverglass_blade' }, { item: 'moonsteel_axe' }, { item: 'mere_pike' }, { item: 'mirror_rod' }, { item: 'glasswing_bow' },
      { item: 'tempered_sword', ifFlag: ['foundry_f2_done', 'forge_relit'] }, { item: 'forge_axe', ifFlag: ['foundry_f2_done', 'forge_relit'] },
      { item: 'heartforge_pike', ifFlag: ['foundry_f2_done', 'forge_relit'] }, { item: 'founders_rod', ifFlag: ['foundry_f2_done', 'forge_relit'] },
      { item: 'bellwire_bow', ifFlag: ['foundry_f2_done', 'forge_relit'] }, { item: 'tempered_mail', ifFlag: ['foundry_f2_done', 'forge_relit'] },
      { item: 'ashweave_robe', ifFlag: ['foundry_f2_done', 'forge_relit'] }, { item: 'forge_helm', ifFlag: ['foundry_f2_done', 'forge_relit'] },
    ],
  },
};

/** Stock visible for a set of story flags (array or Set or {flag:true}, or a hasFlag function as the shop scene passes). */
export function shopStock(shopId, flags = {}) {
  const has = (f) => (typeof flags === 'function' ? !!flags(f) : flags instanceof Set ? flags.has(f) : Array.isArray(flags) ? flags.includes(f) : !!flags[f]);
  const shop = SHOPS[shopId];
  if (!shop) return [];
  // ifFlag: a flag, or a list of flags that must all be set (Episode 3: the tier 6 gear needs two)
  const all = (f) => (Array.isArray(f) ? f.every(has) : has(f));
  return shop.stock.filter((s) => (!s.ifFlag || all(s.ifFlag)) && (!s.ifNotFlag || !has(s.ifNotFlag)));
}
