// Episode 6 ("The Skybound Isles") items (E6-battle; docs/EPISODE6_PLAN.md 2.3 and 7). The pack's register() adds them to
// CONSUMABLES, KEY_ITEMS, EQUIPMENT, UNIQUES, SETS and ITEMS (never overwriting an id) and gives every seven-tier affix an eighth
// tier at ilvl 26. Idempotent. Every id was grepped against src/ and assets/ on 2026-11-09 (plan 2; none in use).
//
// The Ballast Stone has no effect of its own in rules.js: src/data/ep6/gale.js reads the battle's itemsUsed after the action and
// braces the member who used it through the next Gust (not blown back; half the push of a pinned Rewrite). rules.js tells a rule
// which unit acted but not whom its item was used on, so the stone braces its user: it targets an ally only because every
// non-thrown item does (rules.js targetInfo), and the help says "Hold it". docs/BATTLE.md 14.8 names the seam that would let it
// brace the ally it is used on.
// Every stat a unique names is a party stat rules.js reads (spd, luk, furyGain, resStun, spr, def, resSilence, mag, atk, crit,
// thunderDmg, resBlind): none is foe-only like Episode 5's "evade".

import { CONSUMABLES, KEY_ITEMS, EQUIPMENT, UNIQUES, SETS, ITEMS, AFFIXES } from '../items.js';

const ALL = ['hero', 'mira', 'bram'];
const HB = ['hero', 'bram'];

export const EP6_CONSUMABLES = {
  ballast_stone: { id: 'ballast_stone', name: 'Ballast Stone', icon: 'potion', price: 150, battle: true, field: false,
    target: 'ally', effect: {}, desc: 'Hold it and brace: the next gust does not move you.' },
};

export const EP6_KEY_ITEMS = {
  boarding_slip: { id: 'boarding_slip', name: 'The Boarding Slip', icon: 'letter', key: true,
    desc: 'Zephyr Landing to the Storm Observatory. Four seats. The fourth name is a burn.' },
  windward_pass: { id: 'windward_pass', name: 'Windward Pass', icon: 'key', key: true, desc: "A brass token. Opens the Storm Observatory's gate." },
  sky_compass: { id: 'sky_compass', name: 'The Sky Compass', icon: 'key', key: true,
    desc: 'Name a thing and it points to it. It is spinning.', descAfter: { flag: 'compass_restored', desc: 'Name a thing and it points to it. It is steady now.' } },
  compass_key: { id: 'compass_key', name: 'Sky Compass Key', icon: 'key', key: true, desc: 'A brass key cut like a compass rose. Opens the Sky Compass Keyhole.' },
  sixth_list: { id: 'sixth_list', name: 'The Sixth List', icon: 'letter', key: true,
    desc: 'Cheap paper, the cold hand, the empty-book seal. No names. THE FIRST PAGE.' },
  liora_letter: { id: 'liora_letter', name: "Liora's Letter", icon: 'letter', key: true, desc: 'A letter to her sister. The name on it barely stays.' },
  dead_letter: { id: 'dead_letter', name: 'Dead Letter', icon: 'letter', key: true, counted: true, desc: "A letter blown out of Piri's sack." },
  white_road_letter: { id: 'white_road_letter', name: 'A Letter for Willowmere', icon: 'letter', key: true,
    desc: 'Old, northbound, never delivered. Addressed to Willowmere from the White Road.' },
  name_fragment_6: { id: 'name_fragment_6', name: 'Sixth Name Fragment', icon: 'book', key: true,
    desc: 'The Wind Script: every name of the realm, a line on the wind.' },
};

const weapon = (id, type, tier, ilvl, name, price, stats, desc) =>
  [id, { id, name, slot: 'weapon', type, tier, ilvl, price, stats, icon: type, desc }];
const armor = (id, slot, tier, ilvl, name, price, who, stats, desc) =>
  [id, { id, name, slot, tier, ilvl, price, who, icon: { body: 'armor', head: 'helm' }[slot] || slot, stats, desc }];

export const EP6_EQUIPMENT = Object.fromEntries([
  // Tier 11 (ilvl 25): Zephyr Landing from arrival. E6-fixes A4 (PLAYTEST_REVIEW_8 item 4): about 30% off the first prices, so the
  // arrival gold (about 3,800 to 4,800) buys two pieces (a helm and boots, 3,900; a hood and a charm, 3,650), as plan 7.6 asks.
  armor('skysteel_mail', 'body', 11, 25, 'Skysteel Mail', 4300, HB, { def: 44, spr: 8 }, 'Light plate hammered from a ship\'s keel. It does not catch the wind.'),
  armor('windweave_robe', 'body', 11, 25, 'Windweave Robe', 4200, ['mira'], { def: 28, spr: 22, mag: 10 }, 'Cloud-white cloth that moves a moment before the wind does.'),
  armor('aviator_helm', 'head', 11, 25, 'Aviator Helm', 2100, HB, { def: 19, spr: 5 }, 'Leather and brass, with glass for the eyes.'),
  armor('gale_hood', 'head', 11, 25, 'Gale Hood', 2100, ['mira'], { def: 10, spr: 15, mag: 7 }, 'A chart reader\'s hood, tied tight under the chin.'),
  armor('cloudstep_boots', 'boots', 11, 25, 'Cloudstep Boots', 1800, ALL, { spd: 5, def: 5 }, 'Soft soles for a deck that rolls.'),
  armor('sailcloth_mantle', 'mantle', 11, 25, 'Sailcloth Mantle', 1750, ALL, { def: 9, spr: 6, luk: 3 }, 'Cut from an old sail. It still smells of rain.'),
  armor('ballast_charm', 'charm', 11, 25, 'Ballast Charm', 1550, ALL, { resStun: 50, def: 4 }, 'A lead weight on a cord. Lightning finds you heavy.'),
  armor('signal_charm', 'charm', 11, 25, 'Signal Charm', 1550, ALL, { resSilence: 50, mag: 4 }, 'A little lamp lens that keeps its own light.'),
  // Tier 12 (ilvl 27): the Galewing Workshop after obs_f2_done.
  weapon('galewing_sword', 'sword', 12, 27, 'Galewing Sword', 8000, { atk: 72, crit: 6 }, 'A blade as thin as a wing, and as quick.'),
  weapon('stormsplit_axe', 'axe', 12, 27, 'Stormsplit Axe', 8100, { atk: 80, spd: -1 }, 'It splits a squall down the middle.'),
  weapon('skyhook_spear', 'spear', 12, 27, 'Skyhook Spear', 8050, { atk: 75, def: 5 }, 'A docking hook on a spear shaft. It holds.'),
  weapon('compass_rod', 'staff', 12, 27, 'Compass Rod', 8000, { atk: 20, mag: 62, spr: 8, mp: 18 }, 'A compass rose turns at its head and always finds north.'),
  weapon('gullwing_bow', 'bow', 12, 27, 'Gullwing Bow', 8000, { atk: 66, spd: 1, crit: 4 }, 'Bent like a gull in a headwind.'),
  armor('stormplate_mail', 'body', 12, 27, 'Stormplate Mail', 7000, HB, { def: 50, spr: 8 }, 'Grey plate with lightning rods worked into the shoulders.'),
  armor('cloudglass_robe', 'body', 12, 27, 'Cloudglass Robe', 6900, ['mira'], { def: 31, spr: 25, mag: 10 }, 'Silk with flecks of cloud-glass that hold the last light.'),
  armor('stormplate_helm', 'head', 12, 27, 'Stormplate Helm', 3500, HB, { def: 21, spr: 6 }, 'A grey helm with a vane on the crest.'),
]);

// Placed, never random (UNIQUES; the random pools read EQUIPMENT only).
export const EP6_UNIQUES = {
  kestrel_wings: { id: 'kestrel_wings', name: "The Kestrel's Wings", rarity: 'legendary', slot: 'charm',
    ilvl: 27, price: 5200, icon: 'charm', who: ALL, stats: { spd: 4, luk: 4, furyGain: 12, resStun: 30 },
    source: 'Aeris, in isles_return (truth path, told_aeris)', desc: 'Two brass feathers from the Kestrel\'s prow. They remember flying home.' },
  quiet_chime: { id: 'quiet_chime', name: 'The Quiet Chime', rarity: 'legendary', slot: 'charm',
    ilvl: 27, price: 5200, icon: 'charm', who: ALL, stats: { spr: 8, def: 5, resSilence: 50 },
    source: 'Aeris, in isles_return (hidden path, kept_from_aeris)', desc: 'A dock chime tied silent. It rings only for you.' },
  scribe_quill: { id: 'scribe_quill', name: "The Scribe's Quill", rarity: 'legendary', slot: 'charm',
    ilvl: 27, price: 5400, icon: 'charm', who: ALL, stats: { mag: 9, spr: 6, furyGain: 12 },
    source: 'The Storm Scribe (guaranteed)', desc: 'An electric-blue feather. It writes only true courses now.' },
  bellows_heart: { id: 'bellows_heart', name: 'Bellows Heart', rarity: 'legendary', slot: 'charm',
    ilvl: 26, price: 4800, icon: 'charm', who: ALL, stats: { atk: 7, def: 6, resStun: 50 },
    source: 'The Gale Engine (guaranteed)', desc: 'The brass heart of the Engine. It still breathes slowly.' },
  windborne_spear: { id: 'windborne_spear', name: 'The Windborne Spear', rarity: 'legendary', slot: 'weapon', type: 'spear',
    ilvl: 27, price: 7000, icon: 'spear', stats: { atk: 80, crit: 8, thunderDmg: 15 },
    source: 'Observatory F3, Listen landing (Lantern secret)', desc: 'It hums in a storm and points into the wind.' },
  silver_ribbon: { id: 'silver_ribbon', name: 'Silver Ribbon', rarity: 'rare', slot: 'charm',
    ilvl: 26, price: 2300, icon: 'charm', who: ALL, stats: { spd: 2, resBlind: 50, luk: 5 },
    source: "Piri's Dead Letters (side story)", desc: 'Tied round a bundle of letters that finally went home.' },
  skyhand_boots: { id: 'skyhand_boots', name: 'Skyhand Boots', rarity: 'set', set: 'skyhands', slot: 'boots',
    ilvl: 26, price: 2700, icon: 'boots', who: ALL, stats: { spd: 5, def: 6, resStun: 10 },
    source: 'Observatory F1 secret (Dash Strike)', desc: 'A deckhand\'s boots, the soles roped for a wet deck.' },
  skyhand_coat: { id: 'skyhand_coat', name: 'Skyhand Coat', rarity: 'set', set: 'skyhands', slot: 'mantle',
    ilvl: 26, price: 2600, icon: 'mantle', who: ALL, stats: { def: 9, spr: 7, resSilence: 30 },
    source: 'The Signal Beacon (side story)', desc: 'An oilskin coat with a signal whistle on the collar.' },
};

export const EP6_SETS = {
  skyhands: { id: 'skyhands', name: 'Skyhands', pieces: ['skyhand_boots', 'skyhand_coat'],
    bonus: { 2: { resStun: 30, spd: 1 } }, desc: 'Both pieces: +30% Stun resist and +1 SPD.' },
};

/** Episode 6 rare-name words (plan 7.4; each grepped, none in use as a name), rolled at ilvl 26+ through battle/loot.js RARE_NAME_EXT. */
export const RARE_NAME_A_EP6 = ['Windborne', 'Stormwrit', 'Anchored', 'Highflown', 'Ballasted'];
/** The eighth affix tier's item level (about +15% over tier 7; resist suffixes cap at 100). */
export const AFFIX_T8_ILVL = 26;

/** Tier 8 of every affix that has seven tiers: [26, lo x1.15, hi x1.15], resists capped at 100, a flat range grows by 1. */
export function affixTier8(a) {
  const [, lo, hi] = a.tiers[6];
  const res = /^res[A-Z]/.test(a.stat);
  let lo2 = Math.round(lo * 1.15), hi2 = Math.round(hi * 1.15);
  if (res) { lo2 = Math.min(100, lo2); hi2 = Math.min(100, hi2); } else if (hi2 <= hi) hi2 = hi + 1;
  return [AFFIX_T8_ILVL, Math.max(lo, lo2), Math.max(Math.max(lo, lo2), hi2)];
}

let done = false;
/** Add everything. Safe to call twice. Run after the ep5 pack's items (its seventh affix tier comes first). */
export function register() {
  if (done) return;
  for (const [id, it] of Object.entries(EP6_CONSUMABLES)) if (!ITEMS[id]) { CONSUMABLES[id] = it; ITEMS[id] = { ...it, kind: 'consumable' }; }
  for (const [id, it] of Object.entries(EP6_KEY_ITEMS)) if (!ITEMS[id]) { KEY_ITEMS[id] = it; ITEMS[id] = { ...it, kind: 'key' }; }
  for (const [id, it] of Object.entries(EP6_EQUIPMENT)) if (!ITEMS[id]) { EQUIPMENT[id] = it; ITEMS[id] = { ...it, kind: 'equipment', rarity: 'common' }; }
  for (const [id, it] of Object.entries(EP6_UNIQUES)) if (!ITEMS[id]) { UNIQUES[id] = it; ITEMS[id] = { ...it, kind: 'equipment', unique: true }; }
  for (const [id, s] of Object.entries(EP6_SETS)) if (!SETS[id]) SETS[id] = s;
  for (const a of Object.values(AFFIXES)) if (a.tiers.length === 7) a.tiers.push(affixTier8(a));
  done = true;
}
export default register;
