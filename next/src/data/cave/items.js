// The Deep Stacks (docs/DEEP_STACKS_PLAN.md 2.6, 6.2): sixteen cave uniques, the Binder's Quill and the Keeper's Bookmark. The
// pack's register() adds them to UNIQUES, KEY_ITEMS and ITEMS the way src/data/x1/items.js does; nothing edits items.js.
//
// A cave unique is a legendary with `unique: true, cave: true`, a FIXED affix set (existing affix ids at a fixed tier, folded into
// `stats` at module load so the engine counts them with no new code; `fixedAffixes` keeps the record) and one `prop`: a property
// no rolled item has. CAVE_PROPS says what each prop does and WHO implements it:
//   kind 'stats'   already works: the prop is a stat key the engine reads (extraTypes, startHaste, poisonOnHit, lifesteal,
//                  mpCostDown, resX 100, inkRes, fireRes) at a value no affix can roll
//   kind 'loot'    implemented in src/data/cave/loot.js when the caller passes the worn props (bookmarkChance, rollRedChest)
//   kind 'field'   needs a world hook (C2-world): +1 move in the Stacks, the stairs marked on arrival
//   kind 'battle'  needs a rules hook: the first blow each fight cannot miss
//   kind 'state'   needs a game/cave.js hook (C1-state): one free rise per run
// A party's active props: `wornProps(members)` below (reads every worn cave unique). `blue chest` weights: `band` on each unique
// (plan 6.3): three per band for bands 1 to 4, four for band 5; the Quill is B100 only (never in a chest).
// Vault uniques never sell (`noSell: true`, price 0) and never drop; they ride game.cave.vault (C1-state).

import { KEY_ITEMS, UNIQUES, ITEMS, AFFIXES, EQUIP_SLOTS } from '../items.js';

const ALL = ['hero', 'mira', 'bram'];
const HB = ['hero', 'bram'];

export const CAVE_PROPS = {
  // stats-only (ten): the stats under `stats` are added to the piece
  poison_proof:   { id: 'poison_proof', kind: 'stats', name: 'Poison-proof', text: 'Cannot be Poisoned.', stats: { resPoison: 100 } },
  blind_proof:    { id: 'blind_proof', kind: 'stats', name: 'Clear-eyed', text: 'Cannot be Blinded.', stats: { resBlind: 100 } },
  silence_proof:  { id: 'silence_proof', kind: 'stats', name: 'Unhushed', text: 'Cannot be Silenced.', stats: { resSilence: 100 } },
  venom_edge:     { id: 'venom_edge', kind: 'stats', name: 'Venom Edge', text: 'Hits Poison 40% of the time.', stats: { poisonOnHit: 40 } },
  ink_ward:       { id: 'ink_ward', kind: 'stats', name: 'Ink Ward', text: 'Ink attacks do 40% less.', stats: { inkRes: 40 } },
  fire_ward:      { id: 'fire_ward', kind: 'stats', name: 'Fire Ward', text: 'Fire attacks do 40% less.', stats: { fireRes: 40 } },
  thrift:         { id: 'thrift', kind: 'stats', name: 'Thrift', text: 'Every skill costs 2 MP less.', stats: { mpCostDown: 2 } },
  haste_at_start: { id: 'haste_at_start', kind: 'stats', name: 'Already Moving', text: 'Starts every fight Hasted (2 turns).', stats: { startHaste: 2 } },
  strikes_as_fire: { id: 'strikes_as_fire', kind: 'stats', name: 'Burning Edge', text: 'Its hits count as fire.', extraTypes: ['fire'] },
  leeching:       { id: 'leeching', kind: 'stats', name: 'Leeching', text: 'Heals 15% of the damage dealt.', stats: { lifesteal: 15 } },
  // loot (three): src/data/cave/loot.js reads them from opts.props
  bookmark_twice: { id: 'bookmark_twice', kind: 'loot', name: 'Marked Pages', text: 'Bookmarks turn up twice as often.' },
  red_rarity_up:  { id: 'red_rarity_up', kind: 'loot', name: 'Better Lent', text: 'Red chests lend one rarity better.' },
  gold_double:    { id: 'gold_double', kind: 'loot', name: 'Kept Accounts', text: 'Chests hold twice the gold.' },
  // hooks (four)
  cave_move_plus: { id: 'cave_move_plus', kind: 'field', name: 'Rootbound Step', text: 'Moves one step further in the Stacks.' },
  stairs_sense:   { id: 'stairs_sense', kind: 'field', name: 'Downward Sense', text: 'The way down is marked on arrival.' },
  first_blow_true: { id: 'first_blow_true', kind: 'battle', name: 'First Line', text: 'The first blow each fight cannot miss.' },
  second_life:    { id: 'second_life', kind: 'state', name: 'Rebound', text: 'Once a reading, the wearer rises from a fall at 30% HP.' },
};

// Rows: [id, name, band, slot, type|who, ilvl, baseStats, fixedAffixes [[affixId, tier]], prop, lore line 1, lore line 2]
const ROWS = [
  // Band 1, the Catalogue (B1 to B19)
  ['cave_catalogue_pen', "The Catalogue's Pen", 1, 'weapon', 'sword', 4, { atk: 16, crit: 4 }, [['keen', 1]], 'first_blow_true',
    "A keeper's pen, ground to an edge.", 'It never misses the first line.'],
  ['cave_shelf_mail', "Shelf-Keeper's Mail", 1, 'body', ALL, 4, { def: 9, spr: 2, hp: 20 }, [['vital', 1]], 'poison_proof',
    'Riveted from the brackets of the first shelves.', 'Bookworms find nothing in it to eat.'],
  ['cave_reading_hood', 'Reading Hood', 1, 'head', ALL, 4, { def: 3, spr: 3 }, [['runed', 1]], 'blind_proof',
    'A hood lined with lamp-black cloth.', 'The eyes beneath it never water.'],
  // Band 2, the Root Cellars (B20 to B39)
  ['cave_cellar_key', 'The Cellar Key', 2, 'weapon', 'spear', 7, { atk: 24, def: 2 }, [['gleaming', 2], ['of_frost', 2]], 'venom_edge',
    'An iron key as long as a spear, and sharper.', 'What it opens does not close again.'],
  ['cave_root_boots', 'Rootbound Boots', 2, 'boots', ALL, 7, { spd: 2, def: 2 }, [['of_the_bear', 2]], 'cave_move_plus',
    'Soles grown over with root.', 'Down here, the ground remembers your feet.'],
  ['cave_damp_mantle', 'Mantle of the Damp Stair', 2, 'mantle', ALL, 7, { def: 3, spr: 3 }, [['of_the_lantern', 2]], 'ink_ward',
    'Wool that never dries and never rots.', 'Ink beads on it and runs off.'],
  // Band 3, the Court Below (B40 to B59)
  ['cave_court_word', "The Court's Last Word", 3, 'weapon', 'staff', 10, { atk: 8, mag: 24, spr: 5, mp: 10 }, [['of_echoes', 3], ['of_mending', 3]], 'thrift',
    'The last ruling of a court that is gone.', 'Nobody has argued with it since.'],
  ['cave_glass_coat', 'Glass-Lined Coat', 3, 'body', ALL, 10, { def: 15, spr: 6 }, [['sturdy', 3]], 'haste_at_start',
    'Silverglass sewn between two layers of felt.', 'Whoever wears it is already moving.'],
  ['cave_twice_read', 'Twice-Read Charm', 3, 'charm', ALL, 10, { atk: 4, mag: 4, luk: 4 }, [['furious', 3]], 'silence_proof',
    'A charm read twice, in two voices.', 'Neither can be hushed.'],
  // Band 4, the Ember Shelves (B60 to B79)
  ['cave_ember_reader', 'The Ember Reader', 4, 'weapon', 'axe', 14, { atk: 36, spd: -1, crit: 5 }, [['of_embers', 4]], 'strikes_as_fire',
    'An axe that reads by its own light.', 'Every shelf it opens, it opens burning.'],
  ['cave_ash_helm', "Ash-Reader's Helm", 4, 'head', ALL, 14, { def: 8, spr: 4 }, [['vital', 4]], 'fire_ward',
    'A close helm, grey with old ash.', 'Heat passes it by like gossip.'],
  ['cave_cinder_stride', 'Cinder Stride', 4, 'boots', ALL, 14, { spd: 3, def: 3 }, [['lucky', 4]], 'stairs_sense',
    'Boots that always find the way down.', 'The way back up is not their business.'],
  // Band 5, the Forge of Names (B80 to B99)
  ['cave_vellum_robe', 'Vellum Robe', 5, 'body', ['mira'], 16, { def: 14, spr: 10, mag: 5 }, [['of_warding', 5], ['vital', 5]], 'red_rarity_up',
    'Cut from the pages the forge would not take.', 'The Stacks lend better to whoever wears it.'],
  ['cave_forge_binding', 'The Forge Binding', 5, 'body', HB, 16, { def: 24, spr: 5, hp: 40 }, [['sturdy', 5], ['of_the_bear', 5]], 'second_life',
    'Plate bound the way the forge bound names.', 'What it holds, it holds through one fall.'],
  ['cave_name_mantle', 'Mantle of Kept Names', 5, 'mantle', ALL, 16, { def: 6, spr: 6, luk: 4 }, [['fleet', 5]], 'gold_double',
    'Every name the forge kept, stitched in.', 'The Stacks pay their debts to it.'],
  ['cave_binders_mark', "The Binder's Mark", 5, 'charm', ALL, 16, { atk: 6, mag: 6, spd: 1 }, [['furious', 5]], 'bookmark_twice',
    'A pressed mark on a strip of leather.', 'Bookmarks turn up wherever it goes.'],
  // B100 only: the Binder's prize (plan 2.12, 6.2)
  ['cave_binders_quill', "The Binder's Quill", 0, 'charm', ALL, 16, { atk: 8, mag: 8, spr: 6, spd: 2 }, [['of_dawn', 3], ['furious', 5]], 'leeching',
    'The quill that wrote every name into the spine.', 'What it writes down, it takes back.'],
];

const ICON = { weapon: null, body: 'armor', head: 'helm', charm: 'charm', boots: 'boots', mantle: 'mantle' };

function buildUnique(row) {
  const [id, name, band, slot, typeOrWho, ilvl, base, fixed, propId, lore1, lore2] = row;
  const prop = CAVE_PROPS[propId];
  if (!prop) throw new Error(`${id}: unknown prop ${propId}`);
  const stats = { ...base };
  const fixedAffixes = fixed.map(([aid, tier]) => {
    const a = AFFIXES[aid];
    if (!a) throw new Error(`${id}: unknown affix ${aid}`);
    const t = a.tiers[tier - 1];
    if (!t) throw new Error(`${id}: ${aid} has no tier ${tier}`);
    const value = t[2];   // the tier's top roll: a unique is the best copy of its affix
    stats[a.stat] = (stats[a.stat] || 0) + value;
    return { id: aid, tier, value };
  });
  for (const [k, v] of Object.entries(prop.stats || {})) stats[k] = (stats[k] || 0) + v;
  for (const k of Object.keys(stats)) if (!stats[k]) delete stats[k];
  const u = { id, name, rarity: 'legendary', unique: true, cave: true, band, slot, ilvl, price: 0, noSell: true,
    icon: slot === 'weapon' ? typeOrWho : ICON[slot], stats, fixedAffixes, prop: propId, lore: [lore1, lore2],
    source: band ? `The Deep Stacks, a blue chest (band ${band})` : 'The Binder (B100)', desc: `${lore1} ${lore2}` };
  if (slot === 'weapon') u.type = typeOrWho; else u.who = typeOrWho;
  if (prop.extraTypes) u.extraTypes = prop.extraTypes.slice();
  return u;
}

export const CAVE_UNIQUES = Object.fromEntries(ROWS.map((r) => { const u = buildUnique(r); return [u.id, u]; }));
/** The sixteen blue-chest uniques, in band order (the Quill is not among them). */
export const CAVE_UNIQUE_IDS = ROWS.filter((r) => r[2] > 0).map((r) => r[0]);
export const BINDER_QUILL_ID = 'cave_binders_quill';
/** Blue-chest uniques of a band (plan 6.3: a blue chest leans toward the current band's own). */
export function uniquesOfBand(k) { return CAVE_UNIQUE_IDS.filter((id) => CAVE_UNIQUES[id].band === k); }

export const KEEPERS_BOOKMARK_ID = 'keepers_bookmark';
export const KEEPERS_BOOKMARK = { id: KEEPERS_BOOKMARK_ID, name: "Keeper's Bookmark", icon: 'book', key: true, counted: true,
  consumable: true, use: 'cave_bank', cave: true, desc: 'Closes the book where you stand.' };

/** The prop ids active on a party: every cave unique worn by any member (instances or base ids in `equip`). */
export function wornProps(members) {
  const out = new Set();
  for (const m of members || []) {
    for (const v of Object.values(m.equip || {})) {
      const id = v && (typeof v === 'string' ? v : v.base);
      const u = id && CAVE_UNIQUES[id];
      if (u) out.add(u.prop);
    }
  }
  return [...out];
}

/** True when the item table row (or an instance) is a cave unique. */
export function isCaveUnique(itemOrId) {
  const id = typeof itemOrId === 'string' ? itemOrId : itemOrId && itemOrId.base;
  return !!(id && CAVE_UNIQUES[id]);
}

let done = false;
/** Add the seventeen uniques and the Bookmark. Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, u] of Object.entries(CAVE_UNIQUES)) {
    if (!EQUIP_SLOTS.includes(u.slot)) throw new Error(`${id}: bad slot ${u.slot}`);
    if (!ITEMS[id]) { UNIQUES[id] = u; ITEMS[id] = { ...u, kind: 'equipment', unique: true }; }
  }
  if (!ITEMS[KEEPERS_BOOKMARK_ID]) { KEY_ITEMS[KEEPERS_BOOKMARK_ID] = KEEPERS_BOOKMARK; ITEMS[KEEPERS_BOOKMARK_ID] = { ...KEEPERS_BOOKMARK, kind: 'key' }; }
  done = true;
}
export default register;
