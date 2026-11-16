// Episode 8 ("The Last Word") items (E8-battle; docs/EPISODE8_PLAN.md 2.3 and 7). The pack's register() adds them to CONSUMABLES,
// KEY_ITEMS, EQUIPMENT, UNIQUES, SETS and ITEMS (never overwriting an id) and gives every nine-tier affix a tenth tier at ilvl 32.
// Idempotent. Every id was grepped against src/, assets/ and tools/sim/ on 2026-11-15: none in use. `margin_boots` (the tier 15 base)
// and `margin_boots_set` (the Margin-Walker set piece) are two items on purpose (plan 7.2 and 7.3).
//
// Fresh Ink has no effect of its own in rules.js: src/data/ep8/erasure.js reads the battle's itemsUsed after the action and every ally's
// rub-outs (an unwriting too) lose one turn (party-wide by design, so it needs no item-target seam: BATTLE 14.8). It targets an ally only
// because every non-thrown item does (rules.js targetInfo); the help says "Everyone".
// Every stat a unique names is a party stat rules.js reads (spd, spr, furyGain, resBlind, mag, def, resSilence, atk, crit, lightDmg,
// luk, resStun): none is foe-only. "light +15%" follows Episode 6's Windborne Spear (thunderDmg 15) and Episode 7's Road Home (fireDmg).

import { CONSUMABLES, KEY_ITEMS, EQUIPMENT, UNIQUES, SETS, ITEMS, AFFIXES } from '../items.js';

const ALL = ['hero', 'mira', 'bram'];
const HB = ['hero', 'bram'];

export const EP8_CONSUMABLES = {
  fresh_ink: { id: 'fresh_ink', name: 'Fresh Ink', icon: 'potion', price: 180, battle: true, field: false,
    target: 'ally', effect: {}, desc: 'Everyone: each rubbed-out line comes back a turn sooner.' },
};

export const EP8_KEY_ITEMS = {
  vex_note: { id: 'vex_note', name: "Vex's Note", icon: 'letter', key: true, desc: 'Gone up first. Somebody has to knock. - V' },
  reader_card: { id: 'reader_card', name: "A Reader's Card", icon: 'letter', key: true,
    desc: 'Welcome, readers. Please return what you borrow. A cold, careful hand.' },
  ink_key: { id: 'ink_key', name: 'Original Ink Key', icon: 'key', key: true, desc: 'A key of hard black ink. Fits the oldest keyhole in the Library.' },
  name_fragment_8: { id: 'name_fragment_8', name: 'The First Lexicon', icon: 'book', key: true,
    desc: "The Book's own first copy. With the seven, the Living Lexicon." },
  evidence_page: { id: 'evidence_page', name: 'Evidence Page', icon: 'letter', key: true, counted: true, desc: 'A page the Library labelled and hid.' },
  drift_page: { id: 'drift_page', name: 'Drifting Page', icon: 'letter', key: true, counted: true,
    desc: 'A page that wandered out of the stacks. Quinn wants it back.' },
};

const weapon = (id, type, tier, ilvl, name, price, stats, desc) =>
  [id, { id, name, slot: 'weapon', type, tier, ilvl, price, stats, icon: type, desc }];
const armor = (id, slot, tier, ilvl, name, price, who, stats, desc) =>
  [id, { id, name, slot, tier, ilvl, price, who, icon: { body: 'armor', head: 'helm' }[slot] || slot, stats, desc }];

export const EP8_EQUIPMENT = Object.fromEntries([
  // Tier 15 (ilvl 32): the Glyphsmith Atelier from arrival. Prices follow the gold line (plan 7.6: two pieces at each buy-point).
  armor('vellum_plate', 'body', 15, 32, 'Vellum Plate', 3600, HB, { def: 60, spr: 10 }, 'Plate under a skin of scraped vellum. Nothing writes on it twice.'),
  armor('glyphweave_robe', 'body', 15, 32, 'Glyphweave Robe', 3500, ['mira'], { def: 37, spr: 31, mag: 12 }, 'Every thread is a letter. Together they say "kept".'),
  armor('folio_helm', 'head', 15, 32, 'Folio Helm', 1850, HB, { def: 25, spr: 7 }, 'Bound like a folio, brass at the corners.'),
  armor('reading_hood', 'head', 15, 32, 'Reading Hood', 1850, ['mira'], { def: 13, spr: 20, mag: 9 }, 'A deep hood that keeps the lamp out of your eyes.'),
  armor('margin_boots', 'boots', 15, 32, 'Margin Boots', 1650, ALL, { spd: 5, def: 8 }, 'Soft soles for walking the edges of a page.'),
  armor('bookcloth_mantle', 'mantle', 15, 32, 'Bookcloth Mantle', 1600, ALL, { def: 12, spr: 8, luk: 3 }, 'Green bookcloth, gold-tooled at the hem.'),
  armor('fixative_charm', 'charm', 15, 32, 'Fixative Charm', 1400, ALL, { resSilence: 50, mag: 5 }, 'A drop of fixative in glass. What you say stays said.'),
  armor('bookmark_charm', 'charm', 15, 32, 'Bookmark Charm', 1400, ALL, { resBlind: 50, def: 5 }, 'A silk bookmark. You never lose your place.'),
  // Tier 16 (ilvl 33): the Atelier after library_f2_done.
  weapon('quillsteel_sword', 'sword', 16, 33, 'Quillsteel Sword', 5000, { atk: 92, crit: 6 }, 'Its edge is cut like a pen nib. It writes a line through things.'),
  weapon('folio_axe', 'axe', 16, 33, 'Folio Axe', 5100, { atk: 100, spd: -1 }, 'A binder\'s axe, heavy as a closed book.'),
  weapon('index_spear', 'spear', 16, 33, 'Index Spear', 5050, { atk: 95, def: 5 }, 'Long and straight as a finger down a list.'),
  weapon('lexicon_staff', 'staff', 16, 33, 'Lexicon Staff', 4900, { atk: 24, mag: 79, spr: 10, mp: 22 }, 'A staff with a whole dictionary bound in its head.'),
  weapon('crane_bow', 'bow', 16, 33, 'Crane Bow', 4900, { atk: 84, spd: 1, crit: 4 }, 'Folded laminated paper, stronger than yew.'),
  armor('gilt_mail', 'body', 16, 33, 'Gilt Mail', 4600, HB, { def: 66, spr: 11 }, 'Mail with gilt edges, like a good book.'),
  armor('gilt_robe', 'body', 16, 33, 'Gilt Robe', 4500, ['mira'], { def: 40, spr: 33, mag: 13 }, 'A reading robe with a gold-leaf border.'),
  armor('gilt_helm', 'head', 16, 33, 'Gilt Helm', 2050, HB, { def: 27, spr: 8 }, 'A plain helm with a gilt brow.'),
]);

// Placed, never random (UNIQUES; the random pools read EQUIPMENT only). Elowen's two gifts are a pair of shape, not power (decision D).
export const EP8_UNIQUES = {
  binders_awl: { id: 'binders_awl', name: "The Binder's Awl", rarity: 'legendary', slot: 'charm',
    ilvl: 33, price: 6000, icon: 'charm', who: ALL, stats: { spd: 4, spr: 6, furyGain: 12, resBlind: 30 },
    source: 'Elowen, in scriptorium_open (truth path, told_elowen)', desc: 'A bookbinder\'s awl worn smooth. It makes holes so things can be bound.' },
  riverwater_thread: { id: 'riverwater_thread', name: 'Riverwater Thread', rarity: 'legendary', slot: 'charm',
    ilvl: 33, price: 6000, icon: 'charm', who: ALL, stats: { mag: 8, def: 5, resSilence: 50 },
    source: 'Elowen, in scriptorium_open (kind path, spared_elowen)', desc: 'A spool of thread that smells of the river. It holds.' },
  last_word_pen: { id: 'last_word_pen', name: 'The Last Word', rarity: 'legendary', slot: 'charm',
    ilvl: 33, price: 6200, icon: 'charm', who: ALL, stats: { mag: 11, spr: 7, furyGain: 12 },
    source: 'The Eraser (guaranteed)', desc: 'A plain pen, the ink still wet. It never wrote a name out.' },
  blank_faceplate: { id: 'blank_faceplate', name: 'The Blank Faceplate', rarity: 'legendary', slot: 'charm',
    ilvl: 32, price: 5600, icon: 'charm', who: ALL, stats: { atk: 8, def: 7, resSilence: 50 },
    source: 'The Unnamed Sentry (guaranteed)', desc: 'A gilt faceplate with nothing on it yet. Room for a name.' },
  quill_of_return: { id: 'quill_of_return', name: 'Quill of Return', rarity: 'legendary', slot: 'weapon', type: 'sword',
    ilvl: 33, price: 8000, icon: 'sword', stats: { atk: 96, crit: 8, lightDmg: 15 },
    source: 'Library F3, the SEE landing (Lantern secret)', desc: 'A sword with a quill\'s vane. It always finds its way back to the hand.' },
  runners_ribbon: { id: 'runners_ribbon', name: "The Runner's Ribbon", rarity: 'rare', slot: 'charm',
    ilvl: 32, price: 2700, icon: 'charm', who: ALL, stats: { spd: 3, resBlind: 50, luk: 5 },
    source: "Quinn's Drifting Pages (side story)", desc: 'A runner\'s ribbon, the colors of every stack Quinn ever ran.' },
  margin_boots_set: { id: 'margin_boots_set', name: 'Margin-Walker Boots', rarity: 'set', set: 'margin_walker', slot: 'boots',
    ilvl: 32, price: 3000, icon: 'boots', who: ALL, stats: { spd: 5, def: 8, resStun: 10 },
    source: 'Library F1, the D landing (Dash secret)', desc: 'Boots for a walker of margins. They leave no mark on the page.' },
  bookcloth_coat: { id: 'bookcloth_coat', name: 'Bookcloth Coat', rarity: 'set', set: 'margin_walker', slot: 'mantle',
    ilvl: 32, price: 2900, icon: 'mantle', who: ALL, stats: { def: 11, spr: 8, resSilence: 30 },
    source: 'The Living Concordance (side story)', desc: 'A long coat of bookcloth with a pocket for every testimony.' },
};

export const EP8_SETS = {
  margin_walker: { id: 'margin_walker', name: 'Margin-Walker', pieces: ['margin_boots_set', 'bookcloth_coat'],
    bonus: { 2: { mag: 4, spd: 1 } }, desc: 'Both pieces: +4 MAG and +1 SPD.' },
};

/** Episode 8 rare-name words (plan 7.4; each grepped, none in use as a rare name), rolled at ilvl 32+ through battle/loot.js RARE_NAME_EXT. */
export const RARE_NAME_A_EP8 = ['Inkbound', 'Gilt', 'Margined', 'Lettered', 'Firstwritten'];
/** The tenth affix tier's item level (about +15% over tier 9; resist suffixes cap at 100). */
export const AFFIX_T10_ILVL = 32;

/** Tier 10 of every affix that has nine tiers: [32, lo x1.15, hi x1.15], resists capped at 100, a flat range grows by 1. */
export function affixTier10(a) {
  const [, lo, hi] = a.tiers[8];
  const res = /^res[A-Z]/.test(a.stat);
  let lo2 = Math.round(lo * 1.15), hi2 = Math.round(hi * 1.15);
  if (res) { lo2 = Math.min(100, lo2); hi2 = Math.min(100, hi2); } else if (hi2 <= hi) hi2 = hi + 1;
  return [AFFIX_T10_ILVL, Math.max(lo, lo2), Math.max(Math.max(lo, lo2), hi2)];
}

let done = false;
/** Add everything. Safe to call twice. Run after the ep7 pack's items (its ninth affix tier comes first). */
export function register() {
  if (done) return;
  for (const [id, it] of Object.entries(EP8_CONSUMABLES)) if (!ITEMS[id]) { CONSUMABLES[id] = it; ITEMS[id] = { ...it, kind: 'consumable' }; }
  for (const [id, it] of Object.entries(EP8_KEY_ITEMS)) if (!ITEMS[id]) { KEY_ITEMS[id] = it; ITEMS[id] = { ...it, kind: 'key' }; }
  for (const [id, it] of Object.entries(EP8_EQUIPMENT)) if (!ITEMS[id]) { EQUIPMENT[id] = it; ITEMS[id] = { ...it, kind: 'equipment', rarity: 'common' }; }
  for (const [id, it] of Object.entries(EP8_UNIQUES)) if (!ITEMS[id]) { UNIQUES[id] = it; ITEMS[id] = { ...it, kind: 'equipment', unique: true }; }
  for (const [id, s] of Object.entries(EP8_SETS)) if (!SETS[id]) SETS[id] = s;
  for (const a of Object.values(AFFIXES)) if (a.tiers.length === 9) a.tiers.push(affixTier10(a));
  done = true;
}
export default register;
