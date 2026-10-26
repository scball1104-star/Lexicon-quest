// Episode 1 expansion ("The Wider Valley"): the Honey Roll, four key items, the nine placed pieces of gear and the set
// `drovers_road` (EXPANSION1_PLAN.md 2.3, 8.1, 8.2). The pack's register() adds them to CONSUMABLES, KEY_ITEMS, UNIQUES, SETS and ITEMS.
// Idempotent. Gear is PLACED, never rolled: it lives in UNIQUES, which the random loot pools (EQUIPMENT) never read.
//
// Budget rule (pinned by qa/battle/x1_items.test.mjs): no new piece beats the best Episode 1 item of its slot by more than one tier
// step, none reaches Episode 2's tier 3 and 4 pieces (ilvl 9 and up), and the set stays below Wayfarer's Promise.
// Together they are about a level's worth of stats for a player who does the quests: the optional content's main reward, since its
// EXP is capped (docs/BATTLE_X1.md).

import { CONSUMABLES, KEY_ITEMS, UNIQUES, SETS, ITEMS } from '../items.js';

const ALL = ['hero', 'mira', 'bram'];

export const X1_CONSUMABLES = {
  honey_roll: { id: 'honey_roll', name: 'Honey Roll', icon: 'potion', price: 40, battle: true, field: true,
    target: 'ally', effect: { heal: 100 }, desc: "Restores 100 HP. Hal's, and too sweet." },
};

export const X1_KEY_ITEMS = {
  burial_roll: { id: 'burial_roll', name: 'A Torn Roll of the Dead', icon: 'letter', key: true,
    desc: "Iris's copy of the Thornfold burial roll. Torn after the ninth name." },
  quill_copy: { id: 'quill_copy', name: "Quill's Copy", icon: 'letter', key: true,
    desc: 'The Standing Stones, as Quill copied them. Twice.' },
  pell_crate: { id: 'pell_crate', name: "Pell's Crate", icon: 'letter', key: true, counted: true,
    desc: 'A crate with a pale label. Pell has relabelled it four times.' },
  millstone_pin: { id: 'millstone_pin', name: 'A Millstone Pin', icon: 'key', key: true,
    desc: 'An iron pin as long as a forearm. It belongs in the wheel.' },
};

// Placed gear. `source` says where it is found (shown in the item window). Peers in the comment are what the budget test compares to.
export const X1_UNIQUES = {
  // Iron Pike T2 ATK 14 DEF 1; Winged Lance T3 ATK 22 DEF 2; Thornwake (the Alpha) ATK 18 crit 4.
  reeves_crook: { id: 'reeves_crook', name: "Reeve's Crook", rarity: 'legendary', slot: 'weapon', type: 'spear',
    ilvl: 6, price: 1500, icon: 'spear', stats: { atk: 17, def: 2, crit: 4, furyGain: 10 },
    source: 'Barrow Reeve (guaranteed)', desc: 'A shepherd\'s crook, iron-shod. It always counts one more.' },
  // Hunter's Bow T2 ATK 12 SPD 1; Yew Longbow T3 ATK 19 crit 5.
  drovers_bow: { id: 'drovers_bow', name: "Drover's Bow", rarity: 'rare', slot: 'weapon', type: 'bow',
    ilvl: 5, price: 600, icon: 'bow', stats: { atk: 14, spd: 1, crit: 3 },
    source: "Barrow, the Ewe Chamber's niche chest", desc: 'A drover\'s bow, strung for wolves on the road.' },
  // set drovers_road. Wayfarer Mantle DEF 2 SPR 3 LUK 3 (ilvl 4).
  fold_mantle: { id: 'fold_mantle', name: 'Fold Mantle', rarity: 'set', set: 'drovers_road', slot: 'mantle',
    ilvl: 3, price: 500, icon: 'mantle', who: ALL, stats: { def: 2, spr: 2, luk: 2 },
    source: 'Strays of Thornfold (Brindle)', desc: 'Undyed wool, warm from the fold.' },
  // Wayfarer Boots SPD 2 DEF 1 HP 10 (ilvl 6).
  drover_boots: { id: 'drover_boots', name: 'Drover Boots', rarity: 'set', set: 'drovers_road', slot: 'boots',
    ilvl: 5, price: 600, icon: 'boots', who: ALL, stats: { spd: 1, def: 2, hp: 12 },
    source: "Pell's Crates (Pell)", desc: 'Resoled for a long walk behind a flock.' },
  // Courier's Knot SPD 1 LUK 4 Blind resist 30.
  rollcall_charm: { id: 'rollcall_charm', name: 'Rollcall Charm', rarity: 'rare', slot: 'charm',
    ilvl: 5, price: 450, icon: 'charm', who: ALL, stats: { spr: 2, luk: 4, resSilence: 30 },
    source: 'The Thirteenth Stone (Brindle)', desc: 'Twelve notches and a blank. It keeps your own name close.' },
  // Lantern Charm T3 SPR 3 ink 15 (ilvl 9).
  star_chart: { id: 'star_chart', name: "Keeper's Star Chart", rarity: 'rare', slot: 'charm',
    ilvl: 7, price: 600, icon: 'charm', who: ALL, stats: { mag: 2, spr: 3, inkRes: 20 },
    source: 'Keepers\' Cellar, the dais chest (Lantern)', desc: 'Nine stars and the names that lit them.' },
  // Steel Cuirass T3 DEF 13; Mirrorguard Mail DEF 11 SPR 9 HP 20 ink 20 (ilvl 6).
  millwright_apron: { id: 'millwright_apron', name: "Millwright's Apron", rarity: 'legendary', slot: 'body',
    ilvl: 7, price: 1500, icon: 'armor', who: ALL, stats: { def: 11, spr: 3, hp: 30, resPoison: 50 },
    source: 'Millstone Golem (guaranteed)', desc: 'Leather and flour-dust. It has stood in front of a wheel.' },
  // Crystal Rod T2 ATK 5 MAG 11 MP 4; Archivist's Staff T3 ATK 7 MAG 18 SPR 4 MP 6.
  chime_staff: { id: 'chime_staff', name: 'Chime Staff', rarity: 'rare', slot: 'weapon', type: 'staff',
    ilvl: 6, price: 520, icon: 'staff', stats: { atk: 4, mag: 13, spr: 3, mp: 6 },
    source: "High Moor, the tarn islet's chest (Lantern)", desc: 'A moor-chime on a staff. It rings when something is near.' },
  // Battle Axe T2 ATK 16 SPD -1; Bearded Axe T3 ATK 25 SPD -1.
  orchard_axe: { id: 'orchard_axe', name: 'Orchard Axe', rarity: 'rare', slot: 'weapon', type: 'axe',
    ilvl: 5, price: 480, icon: 'axe', stats: { atk: 14, crit: 4 },
    source: "Larchhill, the aqueduct's far chest", desc: 'A pruning axe, long in the handle and quick in the swing.' },
};

export const X1_SETS = {
  drovers_road: { id: 'drovers_road', name: "Drover's Road", pieces: ['fold_mantle', 'drover_boots'],
    bonus: { 2: { hp: 25, def: 2 } }, desc: 'Both pieces: +25 HP and +2 DEF.' },
};

let done = false;
/** Add everything. Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, it] of Object.entries(X1_CONSUMABLES)) if (!ITEMS[id]) { CONSUMABLES[id] = it; ITEMS[id] = { ...it, kind: 'consumable' }; }
  for (const [id, it] of Object.entries(X1_KEY_ITEMS)) if (!ITEMS[id]) { KEY_ITEMS[id] = it; ITEMS[id] = { ...it, kind: 'key' }; }
  for (const [id, it] of Object.entries(X1_UNIQUES)) if (!ITEMS[id]) { UNIQUES[id] = it; ITEMS[id] = { ...it, kind: 'equipment', unique: true }; }
  for (const [id, s] of Object.entries(X1_SETS)) if (!SETS[id]) SETS[id] = s;
  done = true;
}
export default register;
