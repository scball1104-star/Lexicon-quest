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
//   fireRes                            -% damage taken from fire attacks (Episode 3)
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
  inkRes: '% Ink resist', fireRes: '% Fire resist', furyGain: '% Fury gain', lifesteal: '% Life steal', healPow: '% Healing',
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
  // Episode 2 (EPISODE2_PLAN.md 7.1). A Silver Salve is the item answer to the Nameless King's Keeping: it can be
  // used on a Kept ally (`canTargetKept`), which no other item can.
  hi_ether:        { id: 'hi_ether', name: 'Hi-Ether', icon: 'ether', price: 200, battle: true, field: true,
                     target: 'ally', effect: { mp: 40 }, desc: 'Restores 40 MP.' },
  silver_salve:    { id: 'silver_salve', name: 'Silver Salve', icon: 'potion', price: 120, battle: true, field: true,
                     target: 'ally', canTargetKept: true, effect: { cure: ['kept', 'nameless', 'silence'] },
                     desc: 'Cures Kept, Nameless and Silence.' },
  // Episode 3 (EPISODE3_PLAN.md 7.1): thrown at a foe (`target: 'enemy'`). `throw` is a fixed-strength ice hit (it does not
  // depend on who throws it) and it always quenches the foe's Heat, even when the foe resists ice.
  quench_flask:    { id: 'quench_flask', name: 'Quench Flask', icon: 'potion', price: 90, battle: true, field: false,
                     target: 'enemy', effect: { throw: { fixed: 60, power: 120, types: ['ice'] } },
                     desc: 'Ice blast on one foe. Quenches Heat.' },
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
  // Episode 2 (EPISODE2_PLAN.md 2.3). Icons `sigil` and `feather` are new (E2-sprites); the UI falls back without them.
  mael_letter:       { id: 'mael_letter', name: 'Letter to the Hollow', icon: 'letter', key: true,
    desc: "A letter of introduction. The town's name is a blank line." },
  glass_key:         { id: 'glass_key', name: 'Glass Key', icon: 'key', key: true, counted: true,
    desc: 'A key of cold glass. Opens one door in the Court.' },
  name_fragment_2:   { id: 'name_fragment_2', name: 'Second Name Fragment', icon: 'book', key: true,
    desc: 'The second fragment of the Book of Names.' },
  mirror_sigil:      { id: 'mirror_sigil', name: 'Mirror Sigil', icon: 'sigil', key: true,
    desc: "Aurel's sigil. Keeper mirrors open for whoever carries it." },
  courier_satchel:   { id: 'courier_satchel', name: "Courier's Satchel", icon: 'letter', key: true,
    desc: 'Willowmere post marks. A route book inside.' },
  elian_reply:       { id: 'elian_reply', name: "Elian's Reply", icon: 'letter', key: true,
    desc: 'Signed: Elian, Mayor of Hollowmere. For Mael.' },
  black_feather:     { id: 'black_feather', name: 'Black Feather', icon: 'feather', key: true,
    desc: 'Left where a list used to be.' },
  // Episode 3 (EPISODE3_PLAN.md 2.3). The lift key's name carries no name: the founder's name is withheld until
  // bram_memory_3 (qa/content/ep3.test.mjs checks it), so the plan's "Mara's Lift Key" reads "The Founder's Lift Key".
  lift_key:          { id: 'lift_key', name: "The Founder's Lift Key", icon: 'key', key: true,
    desc: 'An old brass key, kept oiled for twenty-five years. Opens the foundry lift.' },
  ash_key:           { id: 'ash_key', name: 'Ash Key', icon: 'key', key: true, counted: true,
    desc: 'A soot-black key. Opens one door in the foundry.' },
  crucible_hook:     { id: 'crucible_hook', name: 'Crucible Hook', icon: 'key', key: true,
    desc: "A smith's hook of black iron. Opens the Heartforge." },
  struck_list:       { id: 'struck_list', name: 'Corner of a List', icon: 'letter', key: true,
    desc: 'Cheap paper the fire would not take. The seal of an empty book.' },
  name_fragment_3:   { id: 'name_fragment_3', name: 'Third Name Fragment', icon: 'book', key: true,
    desc: "The Steel Leaf: the Book's names stamped in steel." },
  glass_sand:        { id: 'glass_sand', name: 'Sack of Glass Sand', icon: 'letter', key: true,
    desc: 'Emberpeak sand, for Vessa.' },
};

// ---------------------------------------------------------------------------------------------
// Equipment bases. tier 1..6, ilvl = item level used by affix tiers and drop pools.
// who: character ids that can equip it (weapons: derived from weapon type).
// ---------------------------------------------------------------------------------------------
const ALL = ['hero', 'mira', 'bram'];
export const EQUIPMENT = {};
function eq(id, o) { EQUIPMENT[id] = { id, ...o, stats: o.stats || {} }; }
function weapon(id, type, tier, name, price, stats, desc) {
  eq(id, { name, slot: 'weapon', type, tier, ilvl: [0, 2, 5, 8, 11, 14, 16][tier], price, stats, icon: type, desc });
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

// --- Episode 2 (EPISODE2_PLAN.md 7.2) ------------------------------------------------------------
// Tier 3 armor and charms, sold in the Hollow from arrival. ilvl 9 (the plan said 8): Episode 1 rolls loot at item
// level 8 at most, so at 9 none of these enter an Episode 1 drop or chest pool and its loot stays exactly as tuned.
const HB = ['hero', 'bram'];
eq('steel_cuirass', { name: 'Steel Cuirass', slot: 'body', tier: 3, ilvl: 9, price: 700, who: HB, icon: 'armor',
  stats: { def: 13 }, desc: 'Plate over mail, forged in the Hollow.' });
eq('sage_robe', { name: "Sage's Robe", slot: 'body', tier: 3, ilvl: 9, price: 680, who: ['mira'], icon: 'armor',
  stats: { def: 8, spr: 7, mag: 3 }, desc: 'Grey wool stitched with silver thread.' });
eq('steel_helm', { name: 'Steel Helm', slot: 'head', tier: 3, ilvl: 9, price: 420, who: HB, icon: 'helm',
  stats: { def: 6, spr: 1 }, desc: 'A round helm with a long nasal.' });
eq('moon_circlet', { name: 'Moon Circlet', slot: 'head', tier: 3, ilvl: 9, price: 450, who: ['mira'], icon: 'helm',
  stats: { def: 3, spr: 5, mag: 3 }, desc: 'A crescent of pale silver.' });
eq('strider_boots', { name: 'Strider Boots', slot: 'boots', tier: 3, ilvl: 9, price: 480, who: ALL, icon: 'boots',
  stats: { spd: 2, def: 1 }, desc: 'Long-laced boots for a long road.' });
eq('ranger_mantle', { name: "Ranger's Mantle", slot: 'mantle', tier: 3, ilvl: 9, price: 420, who: ALL, icon: 'mantle',
  stats: { def: 3, spr: 2, luk: 3 }, desc: 'Oiled canvas the color of fog.' });
eq('lantern_charm', { name: 'Lantern Charm', slot: 'charm', tier: 3, ilvl: 9, price: 380, who: ALL, icon: 'charm',
  stats: { spr: 3, inkRes: 15 }, desc: 'A tiny brass lantern. It stays lit.' });
eq('mirror_charm', { name: 'Mirror Charm', slot: 'charm', tier: 3, ilvl: 9, price: 400, who: ALL, icon: 'charm',
  stats: { mag: 3, resSilence: 50 }, desc: 'A hand mirror the size of a coin.' });
eq('clock_charm', { name: 'Clock Charm', slot: 'charm', tier: 3, ilvl: 9, price: 360, who: ALL, icon: 'charm',
  stats: { spd: 1, luk: 4 }, desc: 'A watch that ticks a little fast.' });
// Tier 4 (ilvl 11), the Silverglass Smithy after court_f2_done. The Silverglass Blade (ATK +29, crit) against
// Lanternheart (ATK +24, strikes as light) is a real choice: light still matters to the Borrowed Shadow and the
// King's last phase.
weapon('silverglass_blade', 'sword', 4, 'Silverglass Blade', 1500, { atk: 29, crit: 6 }, 'A blade of silverglass. It never dulls.');
weapon('moonsteel_axe', 'axe', 4, 'Moonsteel Axe', 1550, { atk: 34, spd: -1 }, 'Pale steel, folded under a full moon.');
weapon('mere_pike', 'spear', 4, 'Mere Pike', 1520, { atk: 30, def: 3 }, 'A pike as straight as still water.');
weapon('mirror_rod', 'staff', 4, 'Mirror Rod', 1500, { atk: 9, mag: 25, spr: 4, mp: 8 }, 'A rod capped with a disc of glass.');
weapon('glasswing_bow', 'bow', 4, 'Glasswing Bow', 1500, { atk: 26, spd: 1, crit: 3 }, 'Limbs of clear glass. Lighter than it looks.');
eq('silver_mail', { name: 'Silver Mail', slot: 'body', tier: 4, ilvl: 11, price: 1300, who: HB, icon: 'armor',
  stats: { def: 18, spr: 3 }, desc: 'Fine silver rings over quilted silk.' });
eq('mirrorweave_robe', { name: 'Mirrorweave Robe', slot: 'body', tier: 4, ilvl: 11, price: 1250, who: ['mira'], icon: 'armor',
  stats: { def: 11, spr: 10, mag: 4 }, desc: 'Cloth that shows the room behind you.' });
eq('glass_helm', { name: 'Glass Helm', slot: 'head', tier: 4, ilvl: 11, price: 650, who: HB, icon: 'helm',
  stats: { def: 8, spr: 2 }, desc: 'Silverglass over a steel cap.' });
eq('mirror_circlet', { name: 'Mirror Circlet', slot: 'head', tier: 4, ilvl: 11, price: 700, who: ['mira'], icon: 'helm',
  stats: { def: 4, spr: 7, mag: 4 }, desc: 'A band of tiny mirrors.' });
eq('mere_boots', { name: 'Mere Boots', slot: 'boots', tier: 4, ilvl: 11, price: 700, who: ALL, icon: 'boots',
  stats: { spd: 2, def: 2, hp: 15 }, desc: 'They leave no print on wet stone.' });
eq('veil_mantle', { name: 'Veil Mantle', slot: 'mantle', tier: 4, ilvl: 11, price: 650, who: ALL, icon: 'mantle',
  stats: { def: 4, spr: 4, inkRes: 10 }, desc: 'A mantle like a fold of mist.' });

// --- Episode 3 (EPISODE3_PLAN.md 7.2) ------------------------------------------------------------
// Tier 5 (ilvl 14): Emberpeak's shops from arrival. Fire resistance is the Episode 3 stat (`fireRes`, -% damage from fire).
eq('ashsteel_cuirass', { name: 'Ashsteel Cuirass', slot: 'body', tier: 5, ilvl: 14, price: 1900, who: HB, icon: 'armor',
  stats: { def: 17 }, desc: 'Steel quenched in ash water. Dull, and very hard.' });
eq('founders_robe', { name: "Founder's Robe", slot: 'body', tier: 5, ilvl: 14, price: 1850, who: ['mira'], icon: 'armor',
  stats: { def: 11, spr: 9, mag: 4 }, desc: 'Cut from an old bellfounder\'s pattern.' });
eq('ashsteel_helm', { name: 'Ashsteel Helm', slot: 'head', tier: 5, ilvl: 14, price: 900, who: HB, icon: 'helm',
  stats: { def: 8, spr: 2 }, desc: 'A close helm with a grey bloom on the steel.' });
eq('soot_hood', { name: 'Soot Hood', slot: 'head', tier: 5, ilvl: 14, price: 950, who: ['mira'], icon: 'helm',
  stats: { def: 4, spr: 7, mag: 4 }, desc: 'A hood of fireproofed felt, black as a flue.' });
eq('cinder_boots', { name: 'Cinder Boots', slot: 'boots', tier: 5, ilvl: 14, price: 900, who: ALL, icon: 'boots',
  stats: { spd: 2, def: 2, fireRes: 10 }, desc: 'Soles that shrug off hot ground.' });
eq('carter_mantle', { name: "Carter's Mantle", slot: 'mantle', tier: 5, ilvl: 14, price: 850, who: ALL, icon: 'mantle',
  stats: { def: 4, spr: 3, luk: 3 }, desc: 'A sand carter\'s coat, waxed against ash.' });
eq('coalheart_charm', { name: 'Coalheart Charm', slot: 'charm', tier: 5, ilvl: 14, price: 800, who: ALL, icon: 'charm',
  stats: { fireRes: 25, def: 2 }, desc: 'A lump of coal that never warms.' });
eq('bellchime_charm', { name: 'Bellchime Charm', slot: 'charm', tier: 5, ilvl: 14, price: 850, who: ALL, icon: 'charm',
  stats: { spr: 4, resSilence: 50 }, desc: 'A small bell. Its note keeps a voice steady.' });
// Tier 6 (ilvl 16): the family forge, after foundry_f2_done and forge_relit.
weapon('tempered_sword', 'sword', 6, 'Tempered Sword', 3200, { atk: 36, crit: 6 }, 'Forged cold, tempered twice. It rings.');
weapon('forge_axe', 'axe', 6, 'Forge Axe', 3300, { atk: 42, spd: -1 }, 'A smith\'s axe from the heart of the forge.');
weapon('heartforge_pike', 'spear', 6, 'Heartforge Pike', 3250, { atk: 38, def: 3 }, 'A pike drawn out in one long heat.');
weapon('founders_rod', 'staff', 6, "Founder's Rod", 3200, { atk: 11, mag: 31, spr: 5, mp: 10 }, 'A bellfounder\'s stir-rod, tipped with bronze.');
weapon('bellwire_bow', 'bow', 6, 'Bellwire Bow', 3200, { atk: 33, spd: 1, crit: 3 }, 'Strung with bell wire. It hums when drawn.');
eq('tempered_mail', { name: 'Tempered Mail', slot: 'body', tier: 6, ilvl: 16, price: 2800, who: HB, icon: 'armor',
  stats: { def: 23, spr: 4 }, desc: 'Rings of steel, each one tempered by hand.' });
eq('ashweave_robe', { name: 'Ashweave Robe', slot: 'body', tier: 6, ilvl: 16, price: 2700, who: ['mira'], icon: 'armor',
  stats: { def: 14, spr: 12, mag: 5 }, desc: 'Woven with ash-grey thread that does not burn.' });
eq('forge_helm', { name: 'Forge Helm', slot: 'head', tier: 6, ilvl: 16, price: 1400, who: HB, icon: 'helm',
  stats: { def: 10, spr: 3 }, desc: 'A heavy helm, still warm from the anvil.' });

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
  // The Whisperwood pool's secret (renamed from the first Thornwake so the Hollow's axe is the only one).
  pilgrim_reach: { id: 'pilgrim_reach', name: "Pilgrim's Reach", rarity: 'legendary', slot: 'weapon', type: 'spear',
    ilvl: 6, price: 1800, icon: 'spear',
    stats: { atk: 17, spd: 1, crit: 5 },
    source: 'Valley secret (Whisperwood pool, needs the Lantern)', desc: "A pilgrim's walking pike. It always finds the gap." },
  // Whisperwood Hollow: the Briar Alpha's drop. Rare-tier numbers (a tier 2 axe and a half) so Lanternheart stays
  // the prize of the episode; its identity is the poison, "bleed" style, on every hit.
  thornwake: { id: 'thornwake', name: 'Thornwake', rarity: 'legendary', slot: 'weapon', type: 'axe',
    ilvl: 6, price: 1500, icon: 'axe',
    stats: { atk: 18, crit: 4, spd: -1, poisonOnHit: 30 },
    source: 'Briar Alpha (Whisperwood Hollow, guaranteed)', desc: "The alpha's briar, bound to an axe. Its cuts keep bleeding." },
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
  // ---- Episode 2 (EPISODE2_PLAN.md 7.3): placed, never random.
  twinfold_charm: { id: 'twinfold_charm', name: 'Twinfold Charm', rarity: 'legendary', slot: 'charm',
    ilvl: 11, price: 1800, icon: 'charm', who: ALL,
    stats: { atk: 4, mag: 4, spd: 1, furyGain: 20 },
    source: 'The Other Selves (guaranteed)', desc: 'Two charms grown into one. It hums when you are near a mirror.' },
  kept_promise: { id: 'kept_promise', name: 'Kept Promise', rarity: 'legendary', slot: 'weapon', type: 'bow',
    ilvl: 13, price: 2400, icon: 'bow',
    stats: { atk: 28, spd: 1, crit: 6, lightDmg: 15 },
    source: 'Elian, after the King (king_after scene)', desc: 'A bow made for a promise. It was kept.' },
  hollowcrown: { id: 'hollowcrown', name: 'Hollowcrown', rarity: 'legendary', slot: 'weapon', type: 'axe',
    ilvl: 12, price: 2200, icon: 'axe',
    stats: { atk: 33, spd: -1, crit: 5, furyGain: 15 },
    source: 'Court F3 Courage wing (Lantern secret)', desc: 'A crown beaten into an axe. It still remembers a king.' },
  merewarden_helm: { id: 'merewarden_helm', name: 'Merewarden Helm', rarity: 'set', set: 'merewardens_watch',
    slot: 'head', ilvl: 10, price: 900, icon: 'helm', who: ALL,
    stats: { def: 7, spr: 4, hp: 15 },
    source: 'Court F1 secret (Dash Strike)', desc: 'The helm of the old mere watch.' },
  merewarden_mantle: { id: 'merewarden_mantle', name: 'Merewarden Mantle', rarity: 'set', set: 'merewardens_watch',
    slot: 'mantle', ilvl: 10, price: 800, icon: 'mantle', who: ALL,
    stats: { def: 4, spr: 4, inkRes: 10 },
    source: 'The Fountain of Faces (side story)', desc: 'A watchman\'s mantle, grey as the mere.' },
  paper_crown: { id: 'paper_crown', name: 'Paper Crown', rarity: 'rare', slot: 'head',
    ilvl: 10, price: 600, icon: 'helm', who: ALL,
    stats: { spr: 5, luk: 8 },
    source: "Court F3 Belonging alcove (Nico's Crowns)", desc: 'Folded from a proclamation. It fits anyone.' },
  courier_knot: { id: 'courier_knot', name: "Courier's Knot", rarity: 'rare', slot: 'charm',
    ilvl: 10, price: 500, icon: 'charm', who: ALL,
    stats: { spd: 1, luk: 4, resBlind: 30 },
    source: 'The Last Route (Tess)', desc: 'A cord tied in a courier\'s knot. It never slips.' },
};

// ---- Episode 3 (EPISODE3_PLAN.md 7.3): placed, never random. The Tempered Lexicon Blade strikes as ice (it quenches), the
// Silverglass Blade has the best raw edge and Lanternheart strikes as light: a choice, not an upgrade.
Object.assign(UNIQUES, {
  first_bell_hammer: { id: 'first_bell_hammer', name: 'First Bell Hammer', rarity: 'legendary', slot: 'weapon', type: 'axe',
    ilvl: 16, price: 3600, icon: 'axe',
    stats: { atk: 46, crit: 6, furyGain: 15, lightDmg: 10 },
    source: 'Garrick, in warden_after', desc: "The founder's hammer. It was kept in the Heartforge's tool rack." },
  tempered_blade: { id: 'tempered_blade', name: 'Tempered Lexicon Blade', rarity: 'legendary', slot: 'weapon', type: 'sword',
    ilvl: 16, price: 3400, icon: 'sword', extraTypes: ['ice'],
    stats: { atk: 40, crit: 8, iceDmg: 15 },
    source: 'Foundry F3 secret chest (Lantern)', desc: 'A blade tempered in the Book\'s own ink-water. Strikes as ice.' },
  warden_heart: { id: 'warden_heart', name: 'Ember Heart', rarity: 'legendary', slot: 'charm',
    ilvl: 16, price: 3000, icon: 'charm', who: ALL,
    stats: { atk: 5, mag: 5, fireRes: 30, furyGain: 10 },
    source: 'The Cinder Warden (guaranteed)', desc: 'The Warden\'s heart, banked. It is warm, and it is yours.' },
  updraft_charm: { id: 'updraft_charm', name: 'Updraft Charm', rarity: 'legendary', slot: 'charm',
    ilvl: 15, price: 2600, icon: 'charm', who: ALL,
    stats: { spd: 2, furyGain: 15 },
    source: 'The Bellows Specter (guaranteed)', desc: 'A feather of soot that always rises.' },
  emberglass_charm: { id: 'emberglass_charm', name: 'Emberglass Charm', rarity: 'rare', slot: 'charm',
    ilvl: 14, price: 900, icon: 'charm', who: ALL,
    stats: { mag: 4, fireRes: 15, resBurn: 50 },
    source: "Vessa's Sand (side story)", desc: 'Glass from Emberpeak sand, melted once and kept.' },
  ashwalker_boots: { id: 'ashwalker_boots', name: 'Ashwalker Boots', rarity: 'set', set: 'ashwalkers_road', slot: 'boots',
    ilvl: 14, price: 1000, icon: 'boots', who: ALL,
    stats: { spd: 2, def: 3, fireRes: 10 },
    source: 'Foundry F1 secret (Dash Strike)', desc: 'Resoled with slag crust. They do not mind heat.' },
  ashwalker_mantle: { id: 'ashwalker_mantle', name: 'Ashwalker Mantle', rarity: 'set', set: 'ashwalkers_road', slot: 'mantle',
    ilvl: 14, price: 900, icon: 'mantle', who: ALL,
    stats: { def: 5, spr: 4, resBurn: 30 },
    source: 'The Coolant Station (side story)', desc: 'A coat of the station\'s cooled plates.' },
});

export const SETS = {
  wayfarers_promise: { id: 'wayfarers_promise', name: 'Wayfarer\'s Promise',
    pieces: ['wayfarer_boots', 'wayfarer_mantle'],
    bonus: { 2: { spd: 1, startHaste: 2 } },
    desc: 'Both pieces: +1 SPD and start battles with Haste.' },
  merewardens_watch: { id: 'merewardens_watch', name: "Merewarden's Watch",
    pieces: ['merewarden_helm', 'merewarden_mantle'],
    bonus: { 2: { spr: 3, def: 2, healPow: 10 } },
    desc: 'Both pieces: +3 SPR, +2 DEF and +10% healing.' },
  ashwalkers_road: { id: 'ashwalkers_road', name: "Ashwalker's Road",
    pieces: ['ashwalker_boots', 'ashwalker_mantle'],
    bonus: { 2: { fireRes: 20, spd: 1 } },
    desc: 'Both pieces: +20% fire resist and +1 SPD.' },
};

// ---------------------------------------------------------------------------------------------
// Affixes (Diablo). tiers: [minIlvl, min, max]. groups: where it can roll:
//   'weapon' (any weapon), a weapon type ('staff'), 'body', 'head', 'charm', 'boots', 'mantle'.
// A magic item has 1 to 2 affixes (max one prefix, one suffix); rare has 3 to 4 (max two each).
// Episode 2 added a top tier at ilvl 10 to every affix (Episode 1 never rolls above ilvl 8 or 9).
// ---------------------------------------------------------------------------------------------
export const AFFIXES = {};
function affix(id, kind, name, stat, groups, tiers, weight = 10) {
  AFFIXES[id] = { id, kind, name, stat, groups, tiers, weight };
}
// Prefixes
affix('gleaming', 'prefix', 'Gleaming', 'atk', ['weapon'], [[1, 2, 3], [4, 4, 6], [7, 7, 9], [10, 10, 12]], 14);
affix('keen', 'prefix', 'Keen', 'crit', ['sword', 'axe', 'spear', 'bow'], [[1, 3, 5], [4, 6, 8], [7, 9, 12], [10, 13, 16]], 8);
affix('runed', 'prefix', 'Runed', 'mag', ['staff', 'head', 'charm'], [[1, 2, 3], [4, 4, 6], [7, 7, 9], [10, 10, 12]], 10);
affix('sturdy', 'prefix', 'Sturdy', 'def', ['body', 'head', 'mantle'], [[1, 1, 2], [4, 3, 4], [7, 5, 7], [10, 8, 10]], 14);
affix('vital', 'prefix', 'Vital', 'hp', ['body', 'head', 'charm', 'mantle'], [[1, 8, 12], [4, 15, 22], [7, 25, 35], [10, 40, 52]], 12);
affix('fleet', 'prefix', 'Fleet', 'spd', ['boots', 'mantle', 'bow'], [[1, 1, 1], [4, 1, 2], [7, 2, 3], [10, 3, 3]], 8);
affix('furious', 'prefix', 'Furious', 'furyGain', ['weapon', 'charm'], [[1, 10, 15], [4, 16, 22], [7, 23, 30], [10, 31, 38]], 7);
affix('lucky', 'prefix', 'Lucky', 'luk', ['charm', 'boots'], [[1, 2, 3], [4, 4, 5], [7, 6, 8], [10, 9, 11]], 6);
// Suffixes
affix('of_embers', 'suffix', 'of Embers', 'fireDmg', ['weapon', 'charm'], [[1, 8, 12], [4, 13, 18], [7, 19, 25], [10, 26, 32]], 9);
affix('of_frost', 'suffix', 'of Frost', 'iceDmg', ['weapon', 'charm'], [[1, 8, 12], [4, 13, 18], [7, 19, 25], [10, 26, 32]], 9);
affix('of_storms', 'suffix', 'of Storms', 'thunderDmg', ['weapon', 'charm'], [[1, 8, 12], [4, 13, 18], [7, 19, 25], [10, 26, 32]], 9);
affix('of_dawn', 'suffix', 'of Dawn', 'lightDmg', ['weapon', 'charm'], [[4, 10, 15], [7, 16, 22], [10, 23, 28]], 5);
affix('of_the_bear', 'suffix', 'of the Bear', 'hp', ['body', 'mantle', 'boots'], [[1, 8, 12], [4, 15, 22], [7, 25, 35], [10, 40, 52]], 10);
affix('of_warding', 'suffix', 'of Warding', 'spr', ['body', 'head', 'mantle', 'charm'], [[1, 1, 2], [4, 3, 4], [7, 5, 7], [10, 8, 10]], 10);
affix('of_echoes', 'suffix', 'of Echoes', 'mp', ['staff', 'head', 'charm'], [[1, 3, 5], [4, 6, 9], [7, 10, 14], [10, 15, 19]], 9);
affix('of_leeching', 'suffix', 'of Leeching', 'lifesteal', ['sword', 'axe', 'spear'], [[1, 3, 4], [4, 5, 6], [7, 7, 9], [10, 10, 12]], 6);
affix('of_mending', 'suffix', 'of Mending', 'healPow', ['staff', 'charm'], [[1, 8, 12], [4, 13, 18], [7, 19, 25], [10, 26, 32]], 7);
affix('of_the_lantern', 'suffix', 'of the Lantern', 'inkRes', ['head', 'mantle', 'charm', 'body'], [[1, 5, 8], [4, 9, 12], [7, 13, 18], [10, 19, 24]], 8);
affix('of_clarity', 'suffix', 'of Clarity', 'resSilence', ['head', 'charm'], [[1, 30, 50], [4, 50, 70], [7, 70, 100], [10, 90, 100]], 6);
affix('of_the_root', 'suffix', 'of the Root', 'resPoison', ['boots', 'charm', 'body'], [[1, 30, 50], [4, 50, 70], [7, 70, 100], [10, 90, 100]], 6);
affix('of_sight', 'suffix', 'of Sight', 'resBlind', ['head', 'charm'], [[1, 30, 50], [4, 50, 70], [7, 70, 100], [10, 90, 100]], 6);
affix('of_haste', 'suffix', 'of Haste', 'spd', ['boots', 'mantle'], [[1, 1, 1], [4, 1, 2], [7, 2, 3], [10, 3, 3]], 6);

// Episode 3: a fifth tier at ilvl 14 for every affix that has four (about +15% over tier 4; resist suffixes cap at 100;
// a range that would not grow, such as Fleet's 3 to 3, gains 1 at the top).
for (const a of Object.values(AFFIXES)) {
  if (a.tiers.length !== 4) continue;
  const [, lo, hi] = a.tiers[3];
  const res = /^res[A-Z]/.test(a.stat);
  let lo2 = Math.round(lo * 1.15), hi2 = Math.round(hi * 1.15);
  if (res) { lo2 = Math.min(100, lo2); hi2 = Math.min(100, hi2); } else if (hi2 <= hi) hi2 = hi + 1;
  a.tiers.push([14, Math.max(lo, lo2), Math.max(Math.max(lo, lo2), hi2)]);
}

// Rare item names (Diablo style two-word names), themed on names, books and the valley.
export const RARE_NAME_A = ['Ember', 'Hollow', 'Quill', 'Thorn', 'Dusk', 'Willow', 'Bell', 'Root', 'Ash', 'Lantern',
  'Ink', 'River', 'Vellum', 'Echo', 'Dawn', 'Moss', 'Iron', 'Silent', 'Gilded', 'Bramble'];
// Episode 2 words, added to the pool for items of ilvl 9 and up only (battle/loot.js), so Episode 1 names roll as before.
export const RARE_NAME_A_EP2 = ['Silver', 'Glass', 'Mere', 'Mirror', 'Veiled', 'Still'];
// Episode 3 words, added for items of ilvl 14 and up only (battle/loot.js).
export const RARE_NAME_A_EP3 = ['Ashen', 'Tempered', 'Forged', 'Banked', 'Cinder'];
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
