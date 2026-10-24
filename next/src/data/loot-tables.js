// Loot tables: rarity weights per source, zone item levels and drop chances, chest tiers, boss
// rules. Pure data; battle/loot.js does the rolling.
//
// Episode 1 legendaries and set pieces are PLACED (boss drops, secret chests, Tess's reward), so
// random tables roll common/magic/rare only. Later episodes can add legendary weight here.

export const RARITY_TABLES = {
  normal:     { common: 70, magic: 25, rare: 5 },
  elite:      { magic: 70, rare: 30 },       // elites always drop magic or better
  boss:       { rare: 100 },
  chest_wood: { common: 70, magic: 30 },
  chest_iron: { magic: 70, rare: 30 },
  chest_gold: { rare: 100 },
};

// Equipment drops from ordinary enemies, by zone. ilvl caps which bases and affix tiers can roll.
// equipChance is per victory (not per enemy).
export const ZONE_LOOT = {
  valley:     { ilvl: 2, equipChance: 0.10 },
  archive_f1: { ilvl: 4, equipChance: 0.12 },
  archive_f2: { ilvl: 5, equipChance: 0.14 },
  archive_f3: { ilvl: 7, equipChance: 0.15 },
  whisperwood_hollow: { ilvl: 6, equipChance: 0.15 },   // optional side dungeon (Lv 6-7)
  // Episode 2 (EPISODE2_PLAN.md 7.5). Random tables still never roll legendaries.
  east_road:  { ilvl: 9, equipChance: 0.15 },
  court_f1:   { ilvl: 10, equipChance: 0.15 },
  court_f2:   { ilvl: 11, equipChance: 0.16 },
  court_f3:   { ilvl: 12, equipChance: 0.18 },
  // Episode 3 (EPISODE3_PLAN.md 7.5). Random tables never roll legendaries.
  sand_road:  { ilvl: 13, equipChance: 0.16 },
  foundry_f1: { ilvl: 14, equipChance: 0.16 },
  foundry_f2: { ilvl: 15, equipChance: 0.17 },
  foundry_f3: { ilvl: 16, equipChance: 0.18 },
};

// Which slot a random equipment drop fills.
export const SLOT_WEIGHTS = { weapon: 34, body: 14, head: 14, charm: 14, boots: 12, mantle: 12 };

// Bosses: guaranteed unique + rolled rares. Keyed by enemy id, or by encounter id for a group boss (`encounter: true`).
export const BOSS_LOOT = {
  echo_warden: { unique: 'mirrorguard_mail', rolls: 1, table: 'boss', ilvl: 6,
    consumables: [{ item: 'hi_potion', qty: 2 }, { item: 'ether', qty: 2 }] },
  // Lanternheart is granted by the post-boss scene (archivore_after) so the reveal is staged; no battle drop.
  archivore: { unique: null, rolls: 2, table: 'boss', ilvl: 8,
    consumables: [{ item: 'phoenix_feather', qty: 1 }] },
  // Whisperwood Hollow mini-boss: the axe is its guaranteed drop (the gold chest behind it rolls a rare).
  briar_alpha: { unique: 'thornwake', rolls: 1, table: 'boss', ilvl: 6,
    consumables: [{ item: 'hi_potion', qty: 1 }, { item: 'antidote', qty: 2 }] },
  // Episode 2. The Other Selves are three enemies, so their loot is keyed by the ENCOUNTER id and drops once per
  // victory (rollBattleDrops opts.encounter). The King's Kept Promise is staged in king_after (like Lanternheart).
  other_selves: { unique: 'twinfold_charm', rolls: 1, table: 'boss', ilvl: 11, encounter: true,
    consumables: [{ item: 'hi_potion', qty: 2 }, { item: 'hi_ether', qty: 1 }] },
  nameless_king: { unique: null, rolls: 2, table: 'boss', ilvl: 13,
    consumables: [{ item: 'phoenix_feather', qty: 1 }, { item: 'hi_ether', qty: 2 }] },
  // Episode 3. The First Bell Hammer is staged in warden_after (like Lanternheart and the Kept Promise), not dropped.
  bellows_specter: { unique: 'updraft_charm', rolls: 1, table: 'boss', ilvl: 15,
    consumables: [{ item: 'hi_potion', qty: 2 }] },
  cinder_warden: { unique: 'warden_heart', rolls: 2, table: 'boss', ilvl: 16,
    consumables: [{ item: 'phoenix_feather', qty: 1 }, { item: 'hi_ether', qty: 2 }] },
};

// Chest tiers for map authors: { type:'chest', tier:'wood'|'iron'|'gold', ... }. A chest may also
// name a fixed item (map data); these rules apply to "random" chests. Gold is [min, max].
export const CHEST_TIERS = {
  wood: { table: 'chest_wood', equipChance: 0.3, gold: [15, 40],
          consumables: [{ item: 'potion', weight: 50 }, { item: 'antidote', weight: 15 }, { item: 'eye_drops', weight: 15 },
                        { item: 'echo_herb', weight: 10 }, { item: 'ether', weight: 10 }] },
  iron: { table: 'chest_iron', equipChance: 0.6, gold: [40, 90],
          consumables: [{ item: 'ether', weight: 35 }, { item: 'hi_potion', weight: 35 }, { item: 'phoenix_feather', weight: 15 },
                        { item: 'echo_herb', weight: 15 }] },
  gold: { table: 'chest_gold', equipChance: 1, gold: [100, 200], consumables: [] },
};

// Sell value multipliers by rarity (on top of the base half price).
export const RARITY_SELL_MULT = { common: 1, magic: 1.6, rare: 2.5, legendary: 4, set: 4 };
// Affix counts per rarity: [min, max] total, and caps per kind.
export const AFFIX_COUNTS = {
  common: { min: 0, max: 0, prefix: 0, suffix: 0 },
  magic: { min: 1, max: 2, prefix: 1, suffix: 1 },
  rare: { min: 3, max: 4, prefix: 2, suffix: 2 },
};
