// Fine Print (tier_1): six legendaries made for the tier. They exist only on Fine Print, where the random tables roll
// legendaries (src/data/tier/tier.js LEGENDARY_POOL, with the twelve placed ones). Fixed stats, no rolled affixes, like
// every unique. Peers in the comments are the bases a drop at the same item level competes with (src/data/items.js).
// The tier's register() adds them to UNIQUES and ITEMS; a save that holds one reads it once the pack has loaded.

const SRC = 'Fine Print (a rolled drop)';

export const TIER_LEGENDARIES = {
  // Winged Lance T3 ATK 22 DEF 2 (ilvl 8); Pilgrim's Reach ATK 17 SPD 1 crit 5.
  codicil: { id: 'codicil', name: 'Codicil', rarity: 'legendary', slot: 'weapon', type: 'spear', ilvl: 8, price: 1900, icon: 'spear',
    stats: { atk: 25, spd: 1, crit: 5, furyGain: 10 }, source: SRC,
    desc: 'The line added after the will was sealed. It always has the last word.' },
  // Archivist's Staff T3 MAG 18 (ilvl 8); Mirror Rod T4 MAG 25 SPR 4 MP 8 (ilvl 11).
  marginalia: { id: 'marginalia', name: 'Marginalia', rarity: 'legendary', slot: 'weapon', type: 'staff', ilvl: 10, price: 2100, icon: 'staff',
    stats: { atk: 8, mag: 24, spr: 6, mp: 14, healPow: 15 }, source: SRC,
    desc: 'Every margin is full of small, careful notes. Someone read all of it.' },
  // Glasswing Bow T4 ATK 26 SPD 1 crit 3 (ilvl 11).
  errata: { id: 'errata', name: 'Errata', rarity: 'legendary', slot: 'weapon', type: 'bow', ilvl: 11, price: 2200, icon: 'bow',
    stats: { atk: 28, spd: 1, crit: 9, luk: 4 }, source: SRC,
    desc: 'A list of corrections, strung as a bow. It seldom misses twice.' },
  // Silverglass Blade T4 ATK 29 crit 6 (ilvl 11); Lanternheart ATK 24 (ilvl 9).
  countersign: { id: 'countersign', name: 'Countersign', rarity: 'legendary', slot: 'weapon', type: 'sword', ilvl: 12, price: 2400, icon: 'sword',
    stats: { atk: 33, def: 3, crit: 6, lifesteal: 6 }, source: SRC,
    desc: 'Signed twice, once by the smith and once by you. It keeps both.' },
  // Moonsteel Axe T4 ATK 34 SPD -1 (ilvl 11); Hollowcrown ATK 33 SPD -1 crit 5 Fury 15 (ilvl 12).
  strikethrough: { id: 'strikethrough', name: 'Strikethrough', rarity: 'legendary', slot: 'weapon', type: 'axe', ilvl: 13, price: 2600, icon: 'axe',
    stats: { atk: 38, spd: -1, crit: 8, furyGain: 15 }, source: SRC,
    desc: 'One line through a word, and it is gone. Use it on foes, never on names.' },
  // Twinfold Charm ATK 4 MAG 4 SPD 1 Fury 20 (ilvl 11); Mirror Charm MAG 3 Silence 50.
  witness_seal: { id: 'witness_seal', name: 'Witness Seal', rarity: 'legendary', slot: 'charm', ilvl: 14, price: 2400, icon: 'charm',
    stats: { def: 4, spr: 6, hp: 30, inkRes: 20, resSilence: 50 }, source: SRC,
    desc: 'Pressed into the wax beside your name. It swears you were there.' },
};
