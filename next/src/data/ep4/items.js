// Episode 4 ("The Sunken Keep") items (E4-battle; docs/EPISODE4_PLAN.md 2.3 and 7). The pack's register() adds them to CONSUMABLES,
// KEY_ITEMS, EQUIPMENT, UNIQUES, SETS and ITEMS (never overwriting an id), gives every five-tier affix a sixth tier at ilvl 18, and
// labels the one new stat key. Idempotent. Every id was grepped against src/ on 2026-11-03 (plan 2: countersign, witness_seal and
// last_decree are taken; none is used here).
//
// Item levels moved from the plan (docs/BATTLE.md 12): tier 7 is ilvl 18 (plan 17) and tier 8 ilvl 20 (plan 19). Episode 3 rolls
// loot up to ilvl 17 (Foundry F3 elites and gold chests), so at 18 no Episode 4 base enters an Episode 3 pool once the pack has
// loaded (the Episode 2 precedent: its tier 3 sat at ilvl 9 for the same reason). The shops sell them from the plan's flags anyway.
// "Ice resist" in the plan has no rule behind it (rules.js resists ink and fire damage only), so the boots carry Chill resist.

import { CONSUMABLES, KEY_ITEMS, EQUIPMENT, UNIQUES, SETS, ITEMS, AFFIXES, STAT_LABELS } from '../items.js';

const ALL = ['hero', 'mira', 'bram'];
const HB = ['hero', 'bram'];

export const EP4_CONSUMABLES = {
  // Thrown at a foe like the Quench Flask: a fixed-strength fire hit, and it always voids the foe's Seals and pending decree.
  lamp_oil: { id: 'lamp_oil', name: 'Lamp Oil', icon: 'potion', price: 110, battle: true, field: false,
    target: 'enemy', effect: { throw: { fixed: 90, power: 130, types: ['fire'] } },
    desc: 'Fire on one foe. Voids its Seals.' },
};

export const EP4_KEY_ITEMS = {
  running_decree: { id: 'running_decree', name: 'The Running Decree', icon: 'letter', key: true,
    desc: 'A royal order whose print runs. One line in another ink does not: "The gates. Please."' },
  lock_crank: { id: 'lock_crank', name: "Lockwright's Crank", icon: 'key', key: true,
    desc: "Joss's iron crank. Turns the Keep's lock wheels." },
  tide_key: { id: 'tide_key', name: 'Tide Key', icon: 'key', key: true, counted: true,
    desc: 'A green-bronze key. Opens one door in the Keep.' },
  seal_key: { id: 'seal_key', name: 'Sunken Seal Key', icon: 'key', key: true,
    desc: 'A key cast as a seal. Opens the Drowned Throne.' },
  name_fragment_4: { id: 'name_fragment_4', name: 'Fourth Name Fragment', icon: 'book', key: true,
    desc: "The Drowned Charter: Valewyn's names in Keeper ink." },
  nilo_bell: { id: 'nilo_bell', name: "Nilo's Boat Bell", icon: 'letter', key: true,
    desc: 'A small brass bell, green with river.' },
};

const weapon = (id, type, tier, ilvl, name, price, stats, desc) =>
  [id, { id, name, slot: 'weapon', type, tier, ilvl, price, stats, icon: type, desc }];
const armor = (id, slot, tier, ilvl, name, price, who, stats, desc) =>
  [id, { id, name, slot, tier, ilvl, price, who, icon: { body: 'armor', head: 'helm' }[slot] || slot, stats, desc }];

export const EP4_EQUIPMENT = Object.fromEntries([
  // Tier 7 (ilvl 18): Valewyn from arrival.
  armor('riverguard_plate', 'body', 7, 18, 'Riverguard Plate', 3600, HB, { def: 27, spr: 4 }, 'Plate of the old river watch, green at the rivets.'),
  armor('scribes_robe', 'body', 7, 18, "Scribe's Robe", 3500, ['mira'], { def: 16, spr: 14, mag: 6 }, 'A royal scribe\'s robe. The cuffs are inky.'),
  armor('riverguard_helm', 'head', 7, 18, 'Riverguard Helm', 1700, HB, { def: 12, spr: 3 }, 'A helm with a crest like a heron.'),
  armor('oilskin_hood', 'head', 7, 18, 'Oilskin Hood', 1700, ['mira'], { def: 6, spr: 10, mag: 5 }, 'Waxed against the rain. It smells of lamps.'),
  armor('wader_boots', 'boots', 7, 18, 'Wader Boots', 1500, ALL, { spd: 3, def: 3, resChill: 25 }, 'Tall boots for knee-deep streets.'),
  armor('ferry_mantle', 'mantle', 7, 18, 'Ferry Mantle', 1400, ALL, { def: 6, spr: 4, luk: 3 }, 'A ferry hand\'s coat, rain-dark.'),
  armor('waxseal_charm', 'charm', 7, 18, 'Waxseal Charm', 1300, ALL, { spr: 4, resSilence: 50 }, 'A blank seal. Nothing can be pressed into it.'),
  armor('tidemark_charm', 'charm', 7, 18, 'Tidemark Charm', 1300, ALL, { def: 3, resChill: 50 }, 'A striped stone from a tide post.'),
  // Tier 8 (ilvl 20): the Crown Guard Forge after keep_f2_done.
  weapon('crownguard_sword', 'sword', 8, 20, 'Crownguard Sword', 4800, { atk: 46, crit: 6 }, 'The Crown Guard\'s blade. It was never drawn in the flood.'),
  weapon('lockwright_axe', 'axe', 8, 20, "Lockwright's Axe", 4900, { atk: 52, spd: -1 }, 'A lockwright\'s axe, for cutting gates free.'),
  weapon('riverguard_halberd', 'spear', 8, 20, 'Riverguard Halberd', 4850, { atk: 48, def: 4 }, 'A halberd of the river watch. Long enough to reach a boat.'),
  weapon('charter_rod', 'staff', 8, 20, 'Charter Rod', 4800, { atk: 14, mag: 40, spr: 6, mp: 12 }, 'A rod that once held a royal charter rolled tight.'),
  weapon('reedline_bow', 'bow', 8, 20, 'Reedline Bow', 4800, { atk: 42, spd: 1, crit: 4 }, 'Strung with waxed reed line. It never goes slack in the wet.'),
  armor('crownguard_mail', 'body', 8, 20, 'Crownguard Mail', 4200, HB, { def: 32, spr: 5 }, 'Mail of the Crown Guard, turquoise at the hem.'),
  armor('archivist_robe', 'body', 8, 20, "Archivist's Robe", 4100, ['mira'], { def: 20, spr: 16, mag: 7 }, 'Valewyn\'s archivists climb high shelves in these.'),
  armor('crownguard_helm', 'head', 8, 20, 'Crownguard Helm', 2100, HB, { def: 14, spr: 4 }, 'A gold-trimmed helm with a crown worked into the brow.'),
]);

// Placed, never random (UNIQUES; the random pools read EQUIPMENT only).
export const EP4_UNIQUES = {
  tidewarden_trident: { id: 'tidewarden_trident', name: "Tidewarden's Trident", rarity: 'legendary', slot: 'weapon', type: 'spear',
    ilvl: 20, price: 5200, icon: 'spear', stats: { atk: 54, crit: 6, fireDmg: 10, furyGain: 10 },
    source: 'Lyra, in regent_after (truth path)', desc: 'The Regent\'s trident. It points the way the water should go.' },
  regents_pardon: { id: 'regents_pardon', name: "The Regent's Pardon", rarity: 'legendary', slot: 'charm',
    ilvl: 20, price: 4200, icon: 'charm', who: ALL, stats: { spr: 8, mag: 6, resSilence: 50, resNameless: 50 },
    source: 'Lyra, in regent_after (kind path)', desc: 'A pardon with her own name on it, in ink that holds.' },
  tidewarden_spear: { id: 'tidewarden_spear', name: 'Tidewarden Spear', rarity: 'legendary', slot: 'weapon', type: 'spear',
    ilvl: 20, price: 5000, icon: 'spear', stats: { atk: 50, def: 4, lightDmg: 15 },
    source: 'Keep F3, the Mercy wing (Lantern secret)', desc: 'A spear of the old tide watch. Its point shines under water.' },
  regents_seal: { id: 'regents_seal', name: 'The Broken Seal', rarity: 'legendary', slot: 'charm',
    ilvl: 20, price: 4500, icon: 'charm', who: ALL, stats: { atk: 6, mag: 6, furyGain: 12 },
    source: 'The Paper Regent (guaranteed)', desc: 'The royal seal, cracked through. It cannot close anything now.' },
  barristers_quill: { id: 'barristers_quill', name: "Barrister's Quill", rarity: 'legendary', slot: 'charm',
    ilvl: 19, price: 3800, icon: 'charm', who: ALL, stats: { mag: 6, resSilence: 50, furyGain: 10 },
    source: 'The Inkbound Barrister (guaranteed)', desc: 'It argued for twelve years. Now it writes what you tell it.' },
  ferrymans_charm: { id: 'ferrymans_charm', name: "Ferryman's Charm", rarity: 'rare', slot: 'charm',
    ilvl: 18, price: 1600, icon: 'charm', who: ALL, stats: { spd: 2, resChill: 50, luk: 4 },
    source: "Nilo's Bell (side story)", desc: 'A bell pin, whittled by Nilo. Boats know it.' },
  tidewalker_boots: { id: 'tidewalker_boots', name: 'Tidewalker Boots', rarity: 'set', set: 'tidewalkers_way', slot: 'boots',
    ilvl: 18, price: 1800, icon: 'boots', who: ALL, stats: { spd: 3, def: 4, resChill: 20 },
    source: 'Keep F1 secret (Dash Strike)', desc: 'They find the dry stones without looking.' },
  tidewalker_mantle: { id: 'tidewalker_mantle', name: 'Tidewalker Mantle', rarity: 'set', set: 'tidewalkers_way', slot: 'mantle',
    ilvl: 18, price: 1600, icon: 'mantle', who: ALL, stats: { def: 6, spr: 5, resChill: 30 },
    source: 'The Three Witnesses (either council choice)', desc: 'An oilskin mantle with the city\'s tide marks sewn in.' },
};

export const EP4_SETS = {
  tidewalkers_way: { id: 'tidewalkers_way', name: "Tidewalker's Way", pieces: ['tidewalker_boots', 'tidewalker_mantle'],
    bonus: { 2: { resChill: 30, spd: 1 } }, desc: 'Both pieces: +30% Chill resist and +1 SPD.' },
};

/** Episode 4 rare-name words (plan 7.4; each grepped, none in use). battle/loot.js rareName() reads the Episode 1 to 3 lists only,
 *  so these roll once loot.js concatenates this list at ilvl 18 (a one-line core seam, docs/BATTLE.md 12.7). */
export const RARE_NAME_A_EP4 = ['Drowned', 'Sealed', 'Riverborn', 'Witnessed', 'Tidal'];
/** The sixth affix tier's item level (about +15% over tier 5; resist suffixes cap at 100). */
export const AFFIX_T6_ILVL = 18;

/** Tier 6 of every affix that has five tiers: [18, lo x1.15, hi x1.15], resists capped at 100, a flat range grows by 1. */
export function affixTier6(a) {
  const [, lo, hi] = a.tiers[4];
  const res = /^res[A-Z]/.test(a.stat);
  let lo2 = Math.round(lo * 1.15), hi2 = Math.round(hi * 1.15);
  if (res) { lo2 = Math.min(100, lo2); hi2 = Math.min(100, hi2); } else if (hi2 <= hi) hi2 = hi + 1;
  return [AFFIX_T6_ILVL, Math.max(lo, lo2), Math.max(Math.max(lo, lo2), hi2)];
}

let done = false;
/** Add everything. Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, it] of Object.entries(EP4_CONSUMABLES)) if (!ITEMS[id]) { CONSUMABLES[id] = it; ITEMS[id] = { ...it, kind: 'consumable' }; }
  for (const [id, it] of Object.entries(EP4_KEY_ITEMS)) if (!ITEMS[id]) { KEY_ITEMS[id] = it; ITEMS[id] = { ...it, kind: 'key' }; }
  for (const [id, it] of Object.entries(EP4_EQUIPMENT)) if (!ITEMS[id]) { EQUIPMENT[id] = it; ITEMS[id] = { ...it, kind: 'equipment', rarity: 'common' }; }
  for (const [id, it] of Object.entries(EP4_UNIQUES)) if (!ITEMS[id]) { UNIQUES[id] = it; ITEMS[id] = { ...it, kind: 'equipment', unique: true }; }
  for (const [id, s] of Object.entries(EP4_SETS)) if (!SETS[id]) SETS[id] = s;
  for (const a of Object.values(AFFIXES)) if (a.tiers.length === 5) a.tiers.push(affixTier6(a));
  if (!STAT_LABELS.resNameless) STAT_LABELS.resNameless = '% Nameless resist';
  done = true;
}
export default register;
