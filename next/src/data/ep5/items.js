// Episode 5 ("The Last Prophecy") items (E5-battle; docs/EPISODE5_PLAN.md 2.3 and 7). The pack's register() adds them to CONSUMABLES,
// KEY_ITEMS, EQUIPMENT, UNIQUES, SETS and ITEMS (never overwriting an id) and gives every six-tier affix a seventh tier at ilvl 22.
// Idempotent. Every id was grepped against src/ and assets/ on 2026-11-08 (plan 2; none in use).
//
// Hourglass Sand has no effect of its own in rules.js: src/data/ep5/sky.js reads the battle's itemsUsed after the action and holds
// the sky (+3 actions before the next Turn). It targets an ally only because every non-thrown item does (rules.js targetInfo);
// whom it is used on does not matter.
// "Evade" on The Veiled Star has no party rule (rules.js reads `evade` on foes only), so it carries DEF instead (docs/BATTLE.md 13.6).

import { CONSUMABLES, KEY_ITEMS, EQUIPMENT, UNIQUES, SETS, ITEMS, AFFIXES } from '../items.js';

const ALL = ['hero', 'mira', 'bram'];
const HB = ['hero', 'bram'];

export const EP5_CONSUMABLES = {
  hourglass_sand: { id: 'hourglass_sand', name: 'Hourglass Sand', icon: 'potion', price: 140, battle: true, field: false,
    target: 'ally', effect: {}, desc: 'Holds the sky: +3 actions to the Turn.' },
};

export const EP5_KEY_ITEMS = {
  star_letter: { id: 'star_letter', name: 'The Star Letter', icon: 'letter', key: true,
    desc: "Sel's letter in star ink. It reads only in the dark, and it had three names once." },
  gnomon: { id: 'gnomon', name: "Nomad's Gnomon", icon: 'key', key: true, desc: "A brass pin. Sets the Labyrinth's sundials." },
  dune_key: { id: 'dune_key', name: 'Dune Key', icon: 'key', key: true, counted: true,
    desc: 'A sandstone key. Opens one door in the Labyrinth.' },
  sun_key: { id: 'sun_key', name: 'Nomad Sun Key', icon: 'key', key: true, desc: 'A key with a sun for a bow. Opens the Sun Keyhole.' },
  fifth_list: { id: 'fifth_list', name: 'The Fifth List', icon: 'letter', key: true,
    desc: "Twenty years of star readers' names, in the cold hand. One line at the bottom is new." },
  ishra_page: { id: 'ishra_page', name: "Ishra's Page", icon: 'letter', key: true, desc: '"The future is not a single answer."' },
  caravan_bell: { id: 'caravan_bell', name: 'Caravan Bell', icon: 'letter', key: true, counted: true,
    desc: 'A small copper bell, tuned to find the way home.' },
  name_fragment_5: { id: 'name_fragment_5', name: 'Fifth Name Fragment', icon: 'book', key: true,
    desc: 'The Star Chart: every name of the realm as a star.' },
};

const weapon = (id, type, tier, ilvl, name, price, stats, desc) =>
  [id, { id, name, slot: 'weapon', type, tier, ilvl, price, stats, icon: type, desc }];
const armor = (id, slot, tier, ilvl, name, price, who, stats, desc) =>
  [id, { id, name, slot, tier, ilvl, price, who, icon: { body: 'armor', head: 'helm' }[slot] || slot, stats, desc }];

export const EP5_EQUIPMENT = Object.fromEntries([
  // Tier 9 (ilvl 21): Saffron Haven from arrival.
  armor('dunewalker_mail', 'body', 9, 21, 'Dunewalker Mail', 4600, HB, { def: 34, spr: 6 }, 'Scale mail with a sand-coloured cloak over it.'),
  armor('starweave_robe', 'body', 9, 21, 'Starweave Robe', 4500, ['mira'], { def: 22, spr: 18, mag: 8 }, 'Indigo cloth with silver thread laid in the shapes of stars.'),
  armor('copper_helm', 'head', 9, 21, 'Copper Helm', 2300, HB, { def: 15, spr: 4 }, 'A caravan guard\'s helm. It rings when the wind turns.'),
  armor('saffron_hood', 'head', 9, 21, 'Saffron Hood', 2300, ['mira'], { def: 8, spr: 12, mag: 6 }, 'A star reader\'s hood, dyed the colour of the town.'),
  armor('sandstrider_boots', 'boots', 9, 21, 'Sandstrider Boots', 2000, ALL, { spd: 4, def: 4, resBlind: 20 }, 'Wide soles for soft dunes, and a veil at the ankle.'),
  armor('dune_mantle', 'mantle', 9, 21, 'Dune Mantle', 1900, ALL, { def: 7, spr: 5, luk: 3 }, 'A long dust-coloured wrap, good against sun and stars.'),
  armor('shade_charm', 'charm', 9, 21, 'Shade Charm', 1700, ALL, { spr: 4, resBlind: 50 }, 'A smoked glass disc. The noon sun is only a coin through it.'),
  armor('lodestar_charm', 'charm', 9, 21, 'Lodestar Charm', 1700, ALL, { mag: 3, resSilence: 50 }, 'A needle that points at one star, whatever the hour.'),
  // Tier 10 (ilvl 23): the Copperwind Smithy after lab_f2_done.
  weapon('copperwind_sword', 'sword', 10, 23, 'Copperwind Sword', 6200, { atk: 58, crit: 6 }, 'Its blade hums in a desert wind.'),
  weapon('dune_axe', 'axe', 10, 23, 'Dune Axe', 6300, { atk: 65, spd: -1 }, 'A broad axe for clearing sand from a buried door.'),
  weapon('starpike', 'spear', 10, 23, 'Starpike', 6250, { atk: 60, def: 4 }, 'A pike tipped with star-glass. It shows the way north.'),
  weapon('armillary_rod', 'staff', 10, 23, 'Armillary Rod', 6200, { atk: 16, mag: 50, spr: 7, mp: 15 }, 'Three brass rings turn at its head, one for each hour.'),
  weapon('horizon_bow', 'bow', 10, 23, 'Horizon Bow', 6200, { atk: 53, spd: 1, crit: 4 }, 'Drawn, it bends like the edge of the world.'),
  armor('sunplate_mail', 'body', 10, 23, 'Sunplate Mail', 5400, HB, { def: 40, spr: 6 }, 'Bronze plate that keeps cool in the noon sun.'),
  armor('nightglass_robe', 'body', 10, 23, 'Nightglass Robe', 5300, ['mira'], { def: 25, spr: 20, mag: 8 }, 'Black silk sewn with flecks of star-glass.'),
  armor('sunplate_helm', 'head', 10, 23, 'Sunplate Helm', 2700, HB, { def: 17, spr: 5 }, 'A bronze helm with a sun on the brow.'),
]);

// Placed, never random (UNIQUES; the random pools read EQUIPMENT only).
export const EP5_UNIQUES = {
  caravan_compass: { id: 'caravan_compass', name: "Sel's Caravan Compass", rarity: 'legendary', slot: 'charm',
    ilvl: 24, price: 4600, icon: 'charm', who: ALL, stats: { spd: 3, luk: 4, resBlind: 50, furyGain: 12 },
    source: 'Sel, in every_road (truth path, star_restored)', desc: 'It points home. It always did.' },
  veiled_star: { id: 'veiled_star', name: 'The Veiled Star', rarity: 'legendary', slot: 'charm',
    ilvl: 24, price: 4600, icon: 'charm', who: ALL, stats: { spr: 8, def: 5, resNameless: 50 },
    source: 'Sel, in every_road (hidden path, star_hidden)', desc: 'A small glass star under a fold of cloth. Nothing reads it.' },
  oracle_mask: { id: 'oracle_mask', name: "The Oracle's Mask", rarity: 'legendary', slot: 'charm',
    ilvl: 24, price: 4800, icon: 'charm', who: ALL, stats: { mag: 8, spr: 6, furyGain: 12 },
    source: 'The Sand Oracle (guaranteed)', desc: 'Cracked through. Behind it there is nothing but sky.' },
  horizon_glass: { id: 'horizon_glass', name: 'Horizon Glass', rarity: 'legendary', slot: 'charm',
    ilvl: 23, price: 4200, icon: 'charm', who: ALL, stats: { atk: 6, mag: 6, resBlind: 50 },
    source: 'The Mirage Knight (guaranteed)', desc: 'A shard of the mirror shield. It shows the true horizon.' },
  starwright_bow: { id: 'starwright_bow', name: "The Starwright's Bow", rarity: 'legendary', slot: 'weapon', type: 'bow',
    ilvl: 24, price: 6000, icon: 'bow', stats: { atk: 60, crit: 8, lightDmg: 15 },
    source: 'Labyrinth F3, Truth landing (Lantern secret)', desc: 'Its string is a line of starlight. It never misses the north.' },
  copperwind_bell: { id: 'copperwind_bell', name: 'Copperwind Bell', rarity: 'rare', slot: 'charm',
    ilvl: 22, price: 1900, icon: 'charm', who: ALL, stats: { spd: 2, resSilence: 50, luk: 4 },
    source: "Hassan's Bells (side story)", desc: 'Tuned by Hassan. It rings the way home.' },
  nomad_wraps: { id: 'nomad_wraps', name: 'Nomad Wraps', rarity: 'set', set: 'nomads_way', slot: 'boots',
    ilvl: 22, price: 2100, icon: 'boots', who: ALL, stats: { spd: 4, def: 5, resBlind: 10 },
    source: 'Labyrinth F1 secret (Dash Strike)', desc: 'Cloth wraps that never fill with sand.' },
  nomad_mantle: { id: 'nomad_mantle', name: 'Nomad Mantle', rarity: 'set', set: 'nomads_way', slot: 'mantle',
    ilvl: 22, price: 1900, icon: 'mantle', who: ALL, stats: { def: 7, spr: 6, resSilence: 30 },
    source: 'Three Roads Home (side story)', desc: 'A caravan master\'s mantle, every road stitched on the hem.' },
};

export const EP5_SETS = {
  nomads_way: { id: 'nomads_way', name: "Nomad's Way", pieces: ['nomad_wraps', 'nomad_mantle'],
    bonus: { 2: { resBlind: 30, spd: 1 } }, desc: 'Both pieces: +30% Blind resist and +1 SPD.' },
};

/** Episode 5 rare-name words (plan 7.4; each grepped, none in use), rolled at ilvl 22+ through battle/loot.js RARE_NAME_EXT (loot.js). */
export const RARE_NAME_A_EP5 = ['Sunlit', 'Starborn', 'Shaded', 'Wayfaring', 'Foretold'];
/** The seventh affix tier's item level (about +15% over tier 6; resist suffixes cap at 100). */
export const AFFIX_T7_ILVL = 22;

/** Tier 7 of every affix that has six tiers: [22, lo x1.15, hi x1.15], resists capped at 100, a flat range grows by 1. */
export function affixTier7(a) {
  const [, lo, hi] = a.tiers[5];
  const res = /^res[A-Z]/.test(a.stat);
  let lo2 = Math.round(lo * 1.15), hi2 = Math.round(hi * 1.15);
  if (res) { lo2 = Math.min(100, lo2); hi2 = Math.min(100, hi2); } else if (hi2 <= hi) hi2 = hi + 1;
  return [AFFIX_T7_ILVL, Math.max(lo, lo2), Math.max(Math.max(lo, lo2), hi2)];
}

let done = false;
/** Add everything. Safe to call twice. Run after the ep4 pack's items (its sixth affix tier comes first). */
export function register() {
  if (done) return;
  for (const [id, it] of Object.entries(EP5_CONSUMABLES)) if (!ITEMS[id]) { CONSUMABLES[id] = it; ITEMS[id] = { ...it, kind: 'consumable' }; }
  for (const [id, it] of Object.entries(EP5_KEY_ITEMS)) if (!ITEMS[id]) { KEY_ITEMS[id] = it; ITEMS[id] = { ...it, kind: 'key' }; }
  for (const [id, it] of Object.entries(EP5_EQUIPMENT)) if (!ITEMS[id]) { EQUIPMENT[id] = it; ITEMS[id] = { ...it, kind: 'equipment', rarity: 'common' }; }
  for (const [id, it] of Object.entries(EP5_UNIQUES)) if (!ITEMS[id]) { UNIQUES[id] = it; ITEMS[id] = { ...it, kind: 'equipment', unique: true }; }
  for (const [id, s] of Object.entries(EP5_SETS)) if (!SETS[id]) SETS[id] = s;
  for (const a of Object.values(AFFIXES)) if (a.tiers.length === 6) a.tiers.push(affixTier7(a));
  done = true;
}
export default register;
