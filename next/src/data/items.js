// Items: consumables, key items, equipment bases, affix pools, uniques and sets. Pure data.
//
// Item instances (what inventories and equip slots hold for rolled gear) are created by
// battle/loot.js: { base, rarity, ilvl, affixes: [{ id, tier, value }], name, unique?, set? }.
// A plain base id string ('short_sword') is shorthand for a common copy of that base.
//
// Equipment stat keys (all numbers, summed across gear; UI labels in STAT_LABELS):
//   atk def mag spr spd luk hp mp      flat
//   crit                               +% critical chance
//   fireDmg iceDmg thunderDmg lightDmg +% damage of that element
//   inkRes                             -% damage taken from ink attacks
//   furyGain lifesteal healPow         +% Fury gain, % of damage healed, +% healing done
//   resPoison resBlind resSilence resBurn resChill   % chance to resist (100 = immune)
//   mpCostDown                         flat MP cost reduction (min cost 1)
//   poisonOnHit                        % chance a weapon hit poisons
//   startHaste                         turns of Haste at battle start

export const RARITIES = {
  common:    { id: 'common', name: 'Common', color: '#e8e8e8', order: 0, sfx: 'drop_common' },
  magic:     { id: 'magic', name: 'Magic', color: '#6f8cff', order: 1, sfx: 'drop_magic' },
  rare:      { id: 'rare', name: 'Rare', color: '#ffd34d', order: 2, sfx: 'drop_rare' },
  legendary: { id: 'legendary', name: 'Legendary', color: '#ff8a2a', order: 3, sfx: 'drop_legendary' },
  set:       { id: 'set', name: 'Set', color: '#3cdc6a', order: 3, sfx: 'drop_legendary' },
};

export const EQUIP_SLOTS = ['weapon', 'body', 'head', 'charm', 'boots', 'mantle'];
// Member equip keys: each weapon type the character uses has its own key, plus the armor slots.
export const ARMOR_SLOTS = ['body', 'head', 'charm', 'boots', 'mantle'];

export const STAT_LABELS = {
  atk: 'ATK', def: 'DEF', mag: 'MAG', spr: 'SPR', spd: 'SPD', luk: 'LUK', hp: 'Max HP', mp: 'Max MP',
  crit: '% Critical', fireDmg: '% Fire', iceDmg: '% Ice', thunderDmg: '% Thunder', lightDmg: '% Light',
  inkRes: '% Ink resist', furyGain: '% Fury gain', lifesteal: '% Life steal', healPow: '% Healing',
  resPoison: '% Poison resist', resBlind: '% Blind resist', resSilence: '% Silence resist',
  resBurn: '% Burn resist', resChill: '% Chill resist', mpCostDown: 'MP cost down',
  poisonOnHit: '% Poison on hit', startHaste: 'Haste at start (turns)',
};

// ---------------------------------------------------------------------------------------------
// Consumables. effect keys: heal (flat HP), healPct, mp, cure [statuses], revive (fraction).
// ---------------------------------------------------------------------------------------------
export const CONSUMABLES = {
  potion:          { id: 'potion', name: 'Potion', icon: 'potion', price: 20, battle: true, field: true,
                     target: 'ally', effect: { heal: 60 }, desc: 'Restores 60 HP.' },
  hi_potion:       { id: 'hi_potion', name: 'Hi-Potion', icon: 'potion', price: 90, battle: true, field: true,
                     target: 'ally', effect: { heal: 180 }, desc: 'Restores 180 HP.' },
  ether:           { id: 'ether', name: 'Ether', icon: 'ether', price: 60, battle: true, field: true,
                     target: 'ally', effect: { mp: 15 }, desc: 'Restores 15 MP.' },
  antidote:        { id: 'antidote', name: 'Antidote', icon: 'poison', price: 10, battle: true, field: true,
                     target: 'ally', effect: { cure: ['poison'] }, desc: 'Cures Poison.' },
  eye_drops:       { id: 'eye_drops', name: 'Eye Drops', icon: 'potion', price: 12, battle: true, field: true,
                     target: 'ally', effect: { cure: ['blind'] }, desc: 'Cures Blind.' },
  echo_herb:       { id: 'echo_herb', name: 'Echo Herb', icon: 'regen', price: 25, battle: true, field: true,
                     target: 'ally', effect: { cure: ['silence', 'burn', 'chill'] },
                     desc: 'Cures Silence, Burn and Chill.' },
  phoenix_feather: { id: 'phoenix_feather', name: 'Phoenix Feather', icon: 'phoenix', price: 150, battle: true,
                     field: true, target: 'ko_ally', effect: { revive: 0.3 }, desc: 'Revives a fallen ally (30% HP).' },
  tent:            { id: 'tent', name: 'Tent', icon: 'star', price: 80, battle: false, field: true, savePointOnly: true,
                     target: 'party', effect: { healPct: 1, mpPct: 1 }, desc: 'Rest at a save point. Full recovery.' },
};
// Battle item use costs this timeline rank (a bit quicker than an attack).
export const ITEM_RANK = 80;

// ---------------------------------------------------------------------------------------------
// Key items (COMMON.md ids). Never sold, never consumed by battle.
// ---------------------------------------------------------------------------------------------
export const KEY_ITEMS = {
  lantern_of_recall: { id: 'lantern_of_recall', name: 'Lantern of Recall', icon: 'lantern', key: true,
    desc: 'Its light reveals ink that wants to be forgotten.' },
  archive_key:       { id: 'archive_key', name: 'Archive Key', icon: 'key', key: true, counted: true,
    desc: 'A small brass key. Opens one Archive door.' },
  stacks_key:        { id: 'stacks_key', name: 'Stacks Key', icon: 'key', key: true,
    desc: 'A heavy iron key stamped with an open book.' },
  tess_letter_1:     { id: 'tess_letter_1', name: 'Letter: The Recipe', icon: 'letter', key: true,
    desc: 'An undelivered letter, addressed to Oren.' },
  tess_letter_2:     { id: 'tess_letter_2', name: 'Letter: The Crossing', icon: 'letter', key: true,
    desc: 'An undelivered letter, addressed to Nella.' },
  tess_letter_3:     { id: 'tess_letter_3', name: 'Letter: The Return', icon: 'letter', key: true,
    desc: 'An undelivered letter, addressed to Tess.' },
  name_fragment_1:   { id: 'name_fragment_1', name: 'Name Fragment', icon: 'book', key: true,
    desc: 'The first fragment of the Book of Names.' },
};

// ---------------------------------------------------------------------------------------------
// Equipment bases. tier 1..3, ilvl = item level used by affix tiers and drop pools.
// who: character ids that can equip it (weapons: derived from weapon type).
// ---------------------------------------------------------------------------------------------
const ALL = ['hero', 'mira', 'bram'];
export const EQUIPMENT = {};
function eq(id, o) { EQUIPMENT[id] = { id, ...o, stats: o.stats || {} }; }
function weapon(id, type, tier, name, price, stats, desc) {
  eq(id, { name, slot: 'weapon', type, tier, ilvl: [0, 2, 5, 8][tier], price, stats, icon: type, desc });
}

// Swords (hero): fast and reliable, small crit bonus.
weapon('short_sword', 'sword', 1, 'Short Sword', 80, { atk: 6, crit: 2 }, 'A plain, well-kept blade.');
weapon('longsword', 'sword', 2, 'Longsword', 360, { atk: 13, crit: 3 }, 'Balanced steel with a leather grip.');
weapon('runed_saber', 'sword', 3, 'Runed Saber', 900, { atk: 21, crit: 5 }, 'Old runes still glow along the edge.');
// Axes (hero, bram): heavy hitters, slightly slower.
weapon('hatchet', 'axe', 1, 'Hatchet', 90, { atk: 8, spd: -1 }, 'A woodcutter\'s axe, honest and heavy.');
weapon('battle_axe', 'axe', 2, 'Battle Axe', 400, { atk: 16, spd: -1 }, 'A broad head that splits shields.');
weapon('bearded_axe', 'axe', 3, 'Bearded Axe', 950, { atk: 25, spd: -1 }, 'Its hooked beard catches and tears.');
// Spears (bram): steady damage, techs pierce armor.
weapon('ash_spear', 'spear', 1, 'Ash Spear', 85, { atk: 7 }, 'A guard\'s spear of seasoned ash.');
weapon('iron_pike', 'spear', 2, 'Iron Pike', 380, { atk: 14, def: 1 }, 'Long reach, iron point.');
weapon('winged_lance', 'spear', 3, 'Winged Lance', 920, { atk: 22, def: 2 }, 'Crossguard wings stop a charge cold.');
// Staves (mira): magic first.
weapon('oak_staff', 'staff', 1, 'Oak Staff', 80, { atk: 3, mag: 5 }, 'A library walking staff, oiled smooth.');
weapon('crystal_rod', 'staff', 2, 'Crystal Rod', 380, { atk: 5, mag: 11, mp: 4 }, 'A blue crystal hums at its tip.');
weapon('archivist_staff', 'staff', 3, 'Archivist\'s Staff', 900, { atk: 7, mag: 18, spr: 4, mp: 6 },
  'Carved with the index of a lost library.');
// Bows (mira): ranged, never evaded by flying foes.
weapon('short_bow', 'bow', 1, 'Short Bow', 85, { atk: 6 }, 'Light and quick to draw.');
weapon('hunters_bow', 'bow', 2, 'Hunter\'s Bow', 370, { atk: 12, spd: 1 }, 'Recurved horn and sinew.');
weapon('yew_longbow', 'bow', 3, 'Yew Longbow', 900, { atk: 19, crit: 5 }, 'Tall as Mira, and twice as stubborn.');

// Body armor.
eq('cloth_tunic', { name: 'Cloth Tunic', slot: 'body', tier: 1, ilvl: 1, price: 40, who: ALL, icon: 'armor',
  stats: { def: 3 }, desc: 'Everyday clothes, double-stitched.' });
eq('leather_vest', { name: 'Leather Vest', slot: 'body', tier: 1, ilvl: 2, price: 120, who: ALL, icon: 'armor',
  stats: { def: 6 }, desc: 'Boiled leather over padding.' });
eq('scholar_robe', { name: 'Scholar\'s Robe', slot: 'body', tier: 2, ilvl: 4, price: 340, who: ['mira'], icon: 'armor',
  stats: { def: 6, spr: 5, mag: 2 }, desc: 'Ink-proofed wool with deep pockets.' });
eq('chain_shirt', { name: 'Chain Shirt', slot: 'body', tier: 2, ilvl: 4, price: 380, who: ['hero', 'bram'], icon: 'armor',
  stats: { def: 10 }, desc: 'Riveted rings that turn a blade.' });
eq('bronze_plate', { name: 'Bronze Plate', slot: 'body', tier: 3, ilvl: 7, price: 640, who: ['bram'], icon: 'armor',
  stats: { def: 15, spd: -1 }, desc: 'Heavy plate from the smithy\'s back room.' });
// Head.
eq('cloth_cap', { name: 'Cloth Cap', slot: 'head', tier: 1, ilvl: 1, price: 30, who: ALL, icon: 'helm',
  stats: { def: 1, spr: 1 }, desc: 'Keeps the drizzle off.' });
eq('leather_hood', { name: 'Leather Hood', slot: 'head', tier: 1, ilvl: 2, price: 90, who: ALL, icon: 'helm',
  stats: { def: 3 }, desc: 'A snug hood of oiled leather.' });
eq('iron_helm', { name: 'Iron Helm', slot: 'head', tier: 2, ilvl: 5, price: 260, who: ['hero', 'bram'], icon: 'helm',
  stats: { def: 5 }, desc: 'Plain, dented, dependable.' });
eq('silver_circlet', { name: 'Silver Circlet', slot: 'head', tier: 2, ilvl: 5, price: 300, who: ['mira'], icon: 'helm',
  stats: { def: 2, spr: 4, mag: 2 }, desc: 'A thin band that steadies the mind.' });
// Accessories.
eq('bronze_charm', { name: 'Bronze Charm', slot: 'charm', tier: 1, ilvl: 1, price: 60, who: ALL, icon: 'charm',
  stats: { hp: 12 }, desc: 'A lucky coin on a cord.' });
eq('owl_charm', { name: 'Owl Charm', slot: 'charm', tier: 1, ilvl: 3, price: 150, who: ALL, icon: 'charm',
  stats: { mag: 2, resBlind: 50 }, desc: 'Carved owl eyes that see through ink.' });
eq('river_charm', { name: 'River Charm', slot: 'charm', tier: 1, ilvl: 3, price: 150, who: ALL, icon: 'charm',
  stats: { spr: 3, resPoison: 50 }, desc: 'A smooth river stone, always cool.' });
eq('leather_boots', { name: 'Leather Boots', slot: 'boots', tier: 1, ilvl: 1, price: 100, who: ALL, icon: 'boots',
  stats: { spd: 1 }, desc: 'Broken in, light on the feet.' });
eq('traveler_boots', { name: 'Traveler\'s Boots', slot: 'boots', tier: 2, ilvl: 4, price: 260, who: ALL, icon: 'boots',
  stats: { spd: 1, def: 1, hp: 10 }, desc: 'Hobnailed soles for long roads.' });
eq('wool_mantle', { name: 'Wool Mantle', slot: 'mantle', tier: 1, ilvl: 1, price: 90, who: ALL, icon: 'mantle',
  stats: { def: 1, spr: 2 }, desc: 'A warm mantle against cellar chill.' });
eq('scout_mantle', { name: 'Scout\'s Mantle', slot: 'mantle', tier: 2, ilvl: 4, price: 220, who: ALL, icon: 'mantle',
  stats: { def: 2, luk: 3 }, desc: 'Hooded green wool, hard to spot.' });

// ---------------------------------------------------------------------------------------------
// Uniques (legendary) and sets for Episode 1. Fixed stats; placed, not randomly dropped.
// ---------------------------------------------------------------------------------------------
export const UNIQUES = {
  lanternheart: { id: 'lanternheart', name: 'Lanternheart', rarity: 'legendary', slot: 'weapon', type: 'sword',
    ilvl: 9, price: 2400, icon: 'sword', extraTypes: ['light'],
    stats: { atk: 24, crit: 6, lightDmg: 20, furyGain: 15 },
    source: 'Archivore (guaranteed)', desc: 'Its blade holds a flame no ink can drown. Strikes as light.' },
  first_quill: { id: 'first_quill', name: 'The First Quill', rarity: 'legendary', slot: 'weapon', type: 'staff',
    ilvl: 8, price: 2200, icon: 'staff',
    stats: { atk: 6, mag: 17, spr: 4, mp: 12, mpCostDown: 1 },
    source: 'Archive F3 secret chest (Lantern)', desc: 'A quill-staff that remembers every word it wrote.' },
  thornwake: { id: 'thornwake', name: 'Thornwake', rarity: 'legendary', slot: 'weapon', type: 'spear',
    ilvl: 6, price: 1800, icon: 'spear',
    stats: { atk: 17, spd: 1, poisonOnHit: 25 },
    source: 'Valley secret (Whisperwood edge, needs the Lantern)', desc: 'Briar-wound ash. Its wounds keep stinging.' },
  mirrorguard_mail: { id: 'mirrorguard_mail', name: 'Mirrorguard Mail', rarity: 'legendary', slot: 'body',
    ilvl: 6, price: 1600, icon: 'armor', who: ALL,
    stats: { def: 11, spr: 9, hp: 20, inkRes: 20 },
    source: 'Echo Warden (guaranteed)', desc: 'Polished scales that turn ink aside.' },
  wayfarer_boots: { id: 'wayfarer_boots', name: 'Wayfarer Boots', rarity: 'set', set: 'wayfarers_promise',
    slot: 'boots', ilvl: 6, price: 900, icon: 'boots', who: ALL,
    stats: { spd: 2, def: 1, hp: 10 },
    source: 'Tess (all three letters delivered)', desc: 'Worn soft by a lifetime of deliveries.' },
  wayfarer_mantle: { id: 'wayfarer_mantle', name: 'Wayfarer Mantle', rarity: 'set', set: 'wayfarers_promise',
    slot: 'mantle', ilvl: 4, price: 700, icon: 'mantle', who: ALL,
    stats: { def: 2, spr: 3, luk: 3 },
    source: 'Archive F1 secret chest', desc: 'A courier\'s mantle, salt-stained at the hem.' },
};

export const SETS = {
  wayfarers_promise: { id: 'wayfarers_promise', name: 'Wayfarer\'s Promise',
    pieces: ['wayfarer_boots', 'wayfarer_mantle'],
    bonus: { 2: { spd: 1, startHaste: 2 } },
    desc: 'Both pieces: +1 SPD and start battles with Haste.' },
};

// ---------------------------------------------------------------------------------------------
// Affixes (Diablo). tiers: [minIlvl, min, max]. groups: where it can roll:
//   'weapon' (any weapon), a weapon type ('staff'), 'body', 'head', 'charm', 'boots', 'mantle'.
// A magic item has 1 to 2 affixes (max one prefix, one suffix); rare has 3 to 4 (max two each).
// ---------------------------------------------------------------------------------------------
export const AFFIXES = {};
function affix(id, kind, name, stat, groups, tiers, weight = 10) {
  AFFIXES[id] = { id, kind, name, stat, groups, tiers, weight };
}
// Prefixes
affix('gleaming', 'prefix', 'Gleaming', 'atk', ['weapon'], [[1, 2, 3], [4, 4, 6], [7, 7, 9]], 14);
affix('keen', 'prefix', 'Keen', 'crit', ['sword', 'axe', 'spear', 'bow'], [[1, 3, 5], [4, 6, 8], [7, 9, 12]], 8);
affix('runed', 'prefix', 'Runed', 'mag', ['staff', 'head', 'charm'], [[1, 2, 3], [4, 4, 6], [7, 7, 9]], 10);
affix('sturdy', 'prefix', 'Sturdy', 'def', ['body', 'head', 'mantle'], [[1, 1, 2], [4, 3, 4], [7, 5, 7]], 14);
affix('vital', 'prefix', 'Vital', 'hp', ['body', 'head', 'charm', 'mantle'], [[1, 8, 12], [4, 15, 22], [7, 25, 35]], 12);
affix('fleet', 'prefix', 'Fleet', 'spd', ['boots', 'mantle', 'bow'], [[1, 1, 1], [4, 1, 2], [7, 2, 3]], 8);
affix('furious', 'prefix', 'Furious', 'furyGain', ['weapon', 'charm'], [[1, 10, 15], [4, 16, 22], [7, 23, 30]], 7);
affix('lucky', 'prefix', 'Lucky', 'luk', ['charm', 'boots'], [[1, 2, 3], [4, 4, 5], [7, 6, 8]], 6);
// Suffixes
affix('of_embers', 'suffix', 'of Embers', 'fireDmg', ['weapon', 'charm'], [[1, 8, 12], [4, 13, 18], [7, 19, 25]], 9);
affix('of_frost', 'suffix', 'of Frost', 'iceDmg', ['weapon', 'charm'], [[1, 8, 12], [4, 13, 18], [7, 19, 25]], 9);
affix('of_storms', 'suffix', 'of Storms', 'thunderDmg', ['weapon', 'charm'], [[1, 8, 12], [4, 13, 18], [7, 19, 25]], 9);
affix('of_dawn', 'suffix', 'of Dawn', 'lightDmg', ['weapon', 'charm'], [[4, 10, 15], [7, 16, 22]], 5);
affix('of_the_bear', 'suffix', 'of the Bear', 'hp', ['body', 'mantle', 'boots'], [[1, 8, 12], [4, 15, 22], [7, 25, 35]], 10);
affix('of_warding', 'suffix', 'of Warding', 'spr', ['body', 'head', 'mantle', 'charm'], [[1, 1, 2], [4, 3, 4], [7, 5, 7]], 10);
affix('of_echoes', 'suffix', 'of Echoes', 'mp', ['staff', 'head', 'charm'], [[1, 3, 5], [4, 6, 9], [7, 10, 14]], 9);
affix('of_leeching', 'suffix', 'of Leeching', 'lifesteal', ['sword', 'axe', 'spear'], [[1, 3, 4], [4, 5, 6], [7, 7, 9]], 6);
affix('of_mending', 'suffix', 'of Mending', 'healPow', ['staff', 'charm'], [[1, 8, 12], [4, 13, 18], [7, 19, 25]], 7);
affix('of_the_lantern', 'suffix', 'of the Lantern', 'inkRes', ['head', 'mantle', 'charm', 'body'], [[1, 5, 8], [4, 9, 12], [7, 13, 18]], 8);
affix('of_clarity', 'suffix', 'of Clarity', 'resSilence', ['head', 'charm'], [[1, 30, 50], [4, 50, 70], [7, 70, 100]], 6);
affix('of_the_root', 'suffix', 'of the Root', 'resPoison', ['boots', 'charm', 'body'], [[1, 30, 50], [4, 50, 70], [7, 70, 100]], 6);
affix('of_sight', 'suffix', 'of Sight', 'resBlind', ['head', 'charm'], [[1, 30, 50], [4, 50, 70], [7, 70, 100]], 6);
affix('of_haste', 'suffix', 'of Haste', 'spd', ['boots', 'mantle'], [[1, 1, 1], [4, 1, 2], [7, 2, 3]], 6);

// Rare item names (Diablo style two-word names), themed on names, books and the valley.
export const RARE_NAME_A = ['Ember', 'Hollow', 'Quill', 'Thorn', 'Dusk', 'Willow', 'Bell', 'Root', 'Ash', 'Lantern',
  'Ink', 'River', 'Vellum', 'Echo', 'Dawn', 'Moss', 'Iron', 'Silent', 'Gilded', 'Bramble'];
export const RARE_NAME_B = {
  weapon: ['Fang', 'Song', 'Bite', 'Edge', 'Verse', 'Mark', 'Thorn', 'Wake', 'Oath', 'Call'],
  body: ['Ward', 'Shroud', 'Coat', 'Hide', 'Shell', 'Mantle'],
  head: ['Crown', 'Brow', 'Cowl', 'Visage', 'Watch'],
  charm: ['Token', 'Seal', 'Locket', 'Promise', 'Knot'],
  boots: ['Stride', 'Path', 'Road', 'Step'],
  mantle: ['Cloak', 'Wing', 'Veil', 'Shroud'],
};

// ---------------------------------------------------------------------------------------------
// Lookup across every item kind.
// ---------------------------------------------------------------------------------------------
export const ITEMS = {};
for (const [id, it] of Object.entries(CONSUMABLES)) ITEMS[id] = { ...it, kind: 'consumable' };
for (const [id, it] of Object.entries(KEY_ITEMS)) ITEMS[id] = { ...it, kind: 'key' };
for (const [id, it] of Object.entries(EQUIPMENT)) ITEMS[id] = { ...it, kind: 'equipment', rarity: 'common' };
for (const [id, it] of Object.entries(UNIQUES)) ITEMS[id] = { ...it, kind: 'equipment', unique: true };

export function item(id) { return ITEMS[id] || null; }

/** Who can equip an equipment base or unique (weapons: anyone whose weapon types include it). */
export function canEquip(charId, weaponTypesOfChar, base) {
  if (!base) return false;
  if (base.slot === 'weapon') return weaponTypesOfChar.includes(base.type);
  return (base.who || ALL).includes(charId);
}

/** Sell price: half the buy price, rounded down; key items cannot be sold. */
export function sellPrice(itemOrBase, rarityMult = 1) {
  if (!itemOrBase || itemOrBase.key) return 0;
  return Math.floor((itemOrBase.price || 0) * 0.5 * rarityMult);
}
