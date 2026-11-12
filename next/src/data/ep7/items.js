// Episode 7 ("The Vanishing World") items (E7-battle; docs/EPISODE7_PLAN.md 2.3 and 7). The pack's register() adds them to
// CONSUMABLES, KEY_ITEMS, EQUIPMENT, UNIQUES, SETS and ITEMS (never overwriting an id), gives every eight-tier affix a ninth tier at
// ilvl 29, and gives Episode 6's `white_road_letter` its second desc by flag. Idempotent. Every id was grepped against src/, every
// assets/tiles/*.json and every assets/*manifest.json on 2026-11-12. One plan id was taken: `lantern_charm` is an Episode 1 charm
// (src/data/items.js), so the tier 13 Silence charm is `glasswick_charm` ("Glasswick Charm"). `witness_page` is also the id of a
// sign on ep4_keep_crown (an event id on that map, not an item): no clash in ITEMS.
//
// Ember Tea has no effect of its own in rules.js: src/data/ep7/rime.js reads the battle's itemsUsed after the action and every ally
// sheds 1 Rime (party-wide by design, so it needs no item-target seam: BATTLE 14.8). It targets an ally only because every
// non-thrown item does (rules.js targetInfo); the help says "Everyone".
// Every stat a unique names is a party stat rules.js reads (spd, spr, furyGain, resSilence, mag, def, resStun, atk, resBlind, crit,
// fireDmg, luk): none is foe-only like Episode 5's "evade". "fire +15%" follows Episode 6's Windborne Spear (thunderDmg 15).

import { CONSUMABLES, KEY_ITEMS, EQUIPMENT, UNIQUES, SETS, ITEMS, AFFIXES } from '../items.js';

const ALL = ['hero', 'mira', 'bram'];
const HB = ['hero', 'bram'];

export const EP7_CONSUMABLES = {
  ember_tea: { id: 'ember_tea', name: 'Ember Tea', icon: 'potion', price: 160, battle: true, field: false,
    target: 'ally', effect: {}, desc: 'Everyone drinks: each sheds one frost from their name.' },
};

export const EP7_KEY_ITEMS = {
  valewyn_list: { id: 'valewyn_list', name: 'The Valewyn List', icon: 'letter', key: true,
    desc: "Cheap paper, the cold hand. At the top, Vex's own name, half gone." },
  stillheart_key: { id: 'stillheart_key', name: 'Stillheart Crystal Key', icon: 'key', key: true,
    desc: "A key of clear ice that does not melt in the hand. Opens the Stillheart's inner grate." },
  seventh_list: { id: 'seventh_list', name: 'The Seventh List', icon: 'letter', key: true,
    desc: 'Sixteen years old. THE NORTH. LET IT FORGET EVERY SOUL WHO CAN STILL READ THE FIRST ERASED PAGE.' },
  name_fragment_7: { id: 'name_fragment_7', name: 'Seventh Name Fragment', icon: 'book', key: true,
    desc: 'The Stillheart: every name of the realm, pressed into ice.' },
  witness_page: { id: 'witness_page', name: 'Witness Page', icon: 'letter', key: true, counted: true, desc: 'A page from the Keeper Book.' },
  street_plaque: { id: 'street_plaque', name: 'Street Plaque', icon: 'key', key: true, counted: true,
    desc: 'A street name, half frosted. Torr wants it back.' },
};
/** Episode 6's letter (src/data/ep6/items.js) gains its second desc from this pack, by flag (the Sky Compass precedent, BATTLE 14.5). */
export const WHITE_ROAD_LETTER_AFTER = { flag: 'stillheart_restored', desc: 'TESS, AT WILLOWMERE. From Marten, with a crossed seven in the date.' };

const weapon = (id, type, tier, ilvl, name, price, stats, desc) =>
  [id, { id, name, slot: 'weapon', type, tier, ilvl, price, stats, icon: type, desc }];
const armor = (id, slot, tier, ilvl, name, price, who, stats, desc) =>
  [id, { id, name, slot, tier, ilvl, price, who, icon: { body: 'armor', head: 'helm' }[slot] || slot, stats, desc }];

export const EP7_EQUIPMENT = Object.fromEntries([
  // Tier 13 (ilvl 29): the Glass-Ice Armory from arrival. Prices follow the gold line (plan 7.6: two pieces at each buy-point).
  armor('rimeplate_mail', 'body', 13, 29, 'Rimeplate Mail', 3300, HB, { def: 55, spr: 9 }, 'Plate with a skin of clear ice that never thaws.'),
  armor('snowveil_robe', 'body', 13, 29, 'Snowveil Robe', 3200, ['mira'], { def: 34, spr: 28, mag: 11 }, 'White wool that keeps the snow off the words you say.'),
  armor('glassice_helm', 'head', 13, 29, 'Glass-Ice Helm', 1700, HB, { def: 23, spr: 6 }, 'Blown from lantern glass and banded in steel.'),
  armor('aurora_hood', 'head', 13, 29, 'Aurora Hood', 1700, ['mira'], { def: 12, spr: 18, mag: 8 }, 'A hood lined with the colors of a northern night.'),
  armor('drift_boots', 'boots', 13, 29, 'Drift Boots', 1500, ALL, { spd: 5, def: 7 }, 'Wide soles that keep you on top of the snow.'),
  armor('hearthwool_mantle', 'mantle', 13, 29, 'Hearthwool Mantle', 1450, ALL, { def: 11, spr: 7, luk: 3 }, 'Spun by a hearth fire. It still smells of smoke.'),
  armor('thaw_charm', 'charm', 13, 29, 'Thaw Charm', 1300, ALL, { resStun: 50, def: 5 }, 'A warm stone on a cord. Shock does not hold.'),
  armor('glasswick_charm', 'charm', 13, 29, 'Glasswick Charm', 1300, ALL, { resSilence: 50, mag: 5 }, 'A lamp wick sealed in glass. It keeps its own voice.'),
  // Tier 14 (ilvl 31): the Glass-Ice Armory after vault_f2_done.
  weapon('iceglass_sword', 'sword', 14, 31, 'Iceglass Sword', 4600, { atk: 84, crit: 6 }, 'Clear as a window, and it cuts like one broken.'),
  weapon('glacier_axe', 'axe', 14, 31, 'Glacier Axe', 4700, { atk: 92, spd: -1 }, 'Heavy as the ice it was cut from.'),
  weapon('frostline_spear', 'spear', 14, 31, 'Frostline Spear', 4650, { atk: 87, def: 5 }, 'A line of frost runs from the point to the hand.'),
  weapon('aurora_staff', 'staff', 14, 31, 'Aurora Staff', 4500, { atk: 22, mag: 72, spr: 9, mp: 20 }, 'Its head holds a slow green and violet light.'),
  weapon('snowowl_bow', 'bow', 14, 31, 'Snow-Owl Bow', 4500, { atk: 77, spd: 1, crit: 4 }, 'White ash, fletched with owl feathers. It makes no sound.'),
  armor('wintersteel_mail', 'body', 14, 31, 'Wintersteel Mail', 4200, HB, { def: 60, spr: 10 }, 'Steel tempered in snowmelt. It does not go cold.'),
  armor('glassweave_robe', 'body', 14, 31, 'Glassweave Robe', 4100, ['mira'], { def: 37, spr: 30, mag: 12 }, 'Threads of spun glass catch every light in the room.'),
  armor('wintersteel_helm', 'head', 14, 31, 'Wintersteel Helm', 1900, HB, { def: 25, spr: 7 }, 'A plain helm with a fur rim for the long watch.'),
]);

// Placed, never random (UNIQUES; the random pools read EQUIPMENT only). The two Nox gifts are a pair: the truth path's gate against
// the kind path's lamp is a choice of shape, not of power (RESPONSIBILITY_ARC decision D).
export const EP7_UNIQUES = {
  open_gate: { id: 'open_gate', name: 'The Open Gate', rarity: 'legendary', slot: 'charm',
    ilvl: 31, price: 5600, icon: 'charm', who: ALL, stats: { spd: 4, spr: 6, furyGain: 12, resSilence: 30 },
    source: 'Nox, in doors_reopen (truth path, told_nox)', desc: 'A little iron gate on a chain, propped open. It will not close.' },
  kept_lamp: { id: 'kept_lamp', name: 'The Kept Lamp', rarity: 'legendary', slot: 'charm',
    ilvl: 31, price: 5600, icon: 'charm', who: ALL, stats: { mag: 8, def: 5, resStun: 50 },
    source: 'Nox, in doors_reopen (kind path, spared_nox)', desc: 'A Keeper\'s pocket lamp, still lit. Nobody has to know it is.' },
  stillheart_shard: { id: 'stillheart_shard', name: 'Stillheart Shard', rarity: 'legendary', slot: 'charm',
    ilvl: 30, price: 5800, icon: 'charm', who: ALL, stats: { mag: 10, spr: 6, furyGain: 12 },
    source: 'The White Phantom (guaranteed)', desc: 'A splinter of the heart of ice. It is warm now.' },
  borrowed_flame: { id: 'borrowed_flame', name: 'Borrowed Flame', rarity: 'legendary', slot: 'charm',
    ilvl: 29, price: 5200, icon: 'charm', who: ALL, stats: { atk: 8, def: 6, resBlind: 50 },
    source: 'The Pale Lantern (guaranteed)', desc: 'The Lantern\'s last flame, given back. It burns a little brighter for it.' },
  road_home: { id: 'road_home', name: 'The Road Home', rarity: 'legendary', slot: 'weapon', type: 'sword',
    ilvl: 31, price: 7600, icon: 'sword', stats: { atk: 88, crit: 8, fireDmg: 15 },
    source: 'Vault F3, Remember landing (Lantern secret)', desc: 'A courier\'s sword. Its edge is warm, and it points south.' },
  snowrest_scarf: { id: 'snowrest_scarf', name: 'Snowrest Scarf', rarity: 'rare', slot: 'charm',
    ilvl: 29, price: 2500, icon: 'charm', who: ALL, stats: { spr: 4, resSilence: 50, luk: 5 },
    source: "Torr's Missing Streets (side story)", desc: 'Warm wool with every lost street of Palehaven stitched in.' },
  winterwatch_boots: { id: 'winterwatch_boots', name: 'Winterwatch Boots', rarity: 'set', set: 'winterwatch', slot: 'boots',
    ilvl: 29, price: 2900, icon: 'boots', who: ALL, stats: { spd: 5, def: 7, resStun: 10 },
    source: 'Vault F1 side gallery (Dash Strike)', desc: 'A watchkeeper\'s boots, nailed for ice.' },
  winterwatch_coat: { id: 'winterwatch_coat', name: 'Winterwatch Coat', rarity: 'set', set: 'winterwatch', slot: 'mantle',
    ilvl: 29, price: 2800, icon: 'mantle', who: ALL, stats: { def: 10, spr: 7, resSilence: 30 },
    source: 'The Hearth of Returning Names (side story)', desc: 'A long fur coat with a lantern hook at the hip.' },
};

export const EP7_SETS = {
  winterwatch: { id: 'winterwatch', name: 'Winterwatch', pieces: ['winterwatch_boots', 'winterwatch_coat'],
    bonus: { 2: { mag: 4, spd: 1 } }, desc: 'Both pieces: +4 MAG and +1 SPD.' },
};

/** Episode 7 rare-name words (plan 7.4; each grepped, none in use as a name), rolled at ilvl 29+ through battle/loot.js RARE_NAME_EXT. */
export const RARE_NAME_A_EP7 = ['Rimebound', 'Wintered', 'Hearthlit', 'Northbright', 'Thawborn'];
/** The ninth affix tier's item level (about +15% over tier 8; resist suffixes cap at 100). */
export const AFFIX_T9_ILVL = 29;

/** Tier 9 of every affix that has eight tiers: [29, lo x1.15, hi x1.15], resists capped at 100, a flat range grows by 1. */
export function affixTier9(a) {
  const [, lo, hi] = a.tiers[7];
  const res = /^res[A-Z]/.test(a.stat);
  let lo2 = Math.round(lo * 1.15), hi2 = Math.round(hi * 1.15);
  if (res) { lo2 = Math.min(100, lo2); hi2 = Math.min(100, hi2); } else if (hi2 <= hi) hi2 = hi + 1;
  return [AFFIX_T9_ILVL, Math.max(lo, lo2), Math.max(Math.max(lo, lo2), hi2)];
}

/** Give Episode 6's letter its second desc (once Episode 6's items are registered). True when it is set. */
export function letterAfter() {
  const k = KEY_ITEMS.white_road_letter, it = ITEMS.white_road_letter;
  if (!k || !it) return false;
  if (!k.descAfter) k.descAfter = { ...WHITE_ROAD_LETTER_AFTER };
  if (!it.descAfter) it.descAfter = { ...WHITE_ROAD_LETTER_AFTER };
  return true;
}

let done = false;
/** Add everything. Safe to call twice. Run after the ep6 pack's items (its eighth affix tier and the letter come first). */
export function register() {
  letterAfter();   // outside the guard: a registry without the ep6 items gets it on a later call
  if (done) return;
  for (const [id, it] of Object.entries(EP7_CONSUMABLES)) if (!ITEMS[id]) { CONSUMABLES[id] = it; ITEMS[id] = { ...it, kind: 'consumable' }; }
  for (const [id, it] of Object.entries(EP7_KEY_ITEMS)) if (!ITEMS[id]) { KEY_ITEMS[id] = it; ITEMS[id] = { ...it, kind: 'key' }; }
  for (const [id, it] of Object.entries(EP7_EQUIPMENT)) if (!ITEMS[id]) { EQUIPMENT[id] = it; ITEMS[id] = { ...it, kind: 'equipment', rarity: 'common' }; }
  for (const [id, it] of Object.entries(EP7_UNIQUES)) if (!ITEMS[id]) { UNIQUES[id] = it; ITEMS[id] = { ...it, kind: 'equipment', unique: true }; }
  for (const [id, s] of Object.entries(EP7_SETS)) if (!SETS[id]) SETS[id] = s;
  for (const a of Object.values(AFFIXES)) if (a.tiers.length === 8) a.tiers.push(affixTier9(a));
  done = true;
}
export default register;
