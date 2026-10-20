// Shops: Willowmere item shop, the smithy, a valley peddler and Rook's salvage in the Rootbound Stacks. Pure data.
//
// stock entries: { item, price?, ifFlag?, ifNotFlag? }  (price defaults to the item's price; flags are
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
};

/** Stock visible for a set of story flags (array or Set or {flag:true}). */
export function shopStock(shopId, flags = {}) {
  const has = (f) => (flags instanceof Set ? flags.has(f) : Array.isArray(flags) ? flags.includes(f) : !!flags[f]);
  const shop = SHOPS[shopId];
  if (!shop) return [];
  return shop.stock.filter((s) => (!s.ifFlag || has(s.ifFlag)) && (!s.ifNotFlag || !has(s.ifNotFlag)));
}
