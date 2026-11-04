// Episode 4 ("The Sunken Keep") foes (E4-battle; docs/EPISODE4_PLAN.md 6.2 to 6.5). Plain rows added through enemy()
// (src/data/enemies.js) by the pack's register(); nothing here changes an existing row. Idempotent.
//
// Decrees (plan 6.3): a foe with `heat: { max, step, flare, quench: 'fire', word: 'Voided!', sfx: 'decree_void' }` gains a Seal
// per Stamp (+15% ATK and MAG each, the Heat rule), announces its decree at 3 and fires it next turn. Fire damage, Lamp Oil,
// a Break or Answer void it (rules.js reads quench/word/sfx: seam 6). The Seal pips draw where Heat's flames draw.
// Scripts (src/data/ep4/ai.js, registered onto ai.js SCRIPTS):
//   ai 'decree'        basic + the Answer hook (the Ink Bloom, the Blank Decree and every other ordinary Episode 4 foe)
//   ai 'barrister'     stamps every turn, Objection at 3 Seals, calls its witness at 50%
//   ai 'counsel'       the witness: stamps the Barrister every turn
//   ai 'paper_regent'  three phases, the writs and the Royal Ward, HP locks at 70% and 31%, Strike from the Roll in phase 3
//   ai 'writ'          writ_silence mends the Regent (and hushes every second turn); writ_oblivion stamps the Regent
// Flavors are first-pass lines (E4-story owns the bestiary text); sprites are pack atlas frames named by id (E4-sprites).

import { enemy, ENEMIES } from '../enemies.js';

/** The Decree counter on the Heat unit (plan 6.3). */
export const decree = (flare, max = 3) => ({ max, step: 0.15, flare, quench: 'fire', word: 'Voided!', sfx: 'decree_void' });

const sprite = (id) => ({ atlas: 'enemies_battle', field: 'enemies_field', frame: id });

// Final numbers after tuning (docs/BATTLE.md section 12 has the table and what moved from the plan).
export const EP4_ENEMIES = {
  // ---------------------------------------------------------------- the Flood Road (Lv 17)
  flood_hound: {
    name: 'Floodhound', family: 'beast', level: 17,
    hp: 620, atk: 110, def: 24, mag: 16, spr: 16, spd: 18, luk: 6,
    shields: 2, weak: ['thunder', 'spear'], resist: ['ice'], evade: 0.1, ai: 'decree',
    exp: 65, gold: 110, masteryPts: 10,
    moves: [{ skill: 'bite', weight: 60, target: 'lowestHpPct' }, { skill: 'undertow', weight: 40 }],
    drops: [{ item: 'potion', chance: 0.12 }, { item: 'hi_potion', chance: 0.05 }], lootZone: 'ep4_flood_road',
    flavor: 'A river dog with a mane of weed. It hunts where the road used to be.',
  },
  lockjaw_crab: {
    name: 'Lockjaw Crab', family: 'beast', level: 17,
    hp: 360, atk: 105, def: 40, mag: 12, spr: 18, spd: 9, luk: 4,
    shields: 4, weak: ['thunder', 'axe'], resist: ['ice', 'sword', 'bow'], ai: 'decree',
    exp: 55, gold: 120, masteryPts: 10,
    moves: [{ skill: 'crab_claw', weight: 55 }, { skill: 'clamp', weight: 30 }, { skill: 'shell_up', weight: 15, if: 'notProtected' }],
    drops: [{ item: 'potion', chance: 0.15 }, { item: 'hi_potion', chance: 0.05 }], lootZone: 'ep4_flood_road',
    flavor: 'A barnacled crab the size of a cart wheel, rusted shut on whatever it last caught.',
  },
  ink_bloom: {
    name: 'Ink Bloom', family: 'ooze', level: 17, size: 'small',
    hp: 520, atk: 60, def: 14, mag: 100, spr: 24, spd: 11, luk: 4,
    shields: 2, weak: ['fire', 'light'], resist: ['ice'], statusImmune: ['poison'], ai: 'decree',
    heat: decree('runoff'), opener: 'stamp',
    exp: 55, gold: 110, masteryPts: 10,
    moves: [{ skill: 'blot', weight: 55 }, { skill: 'stamp', weight: 45 }],
    drops: [{ item: 'eye_drops', chance: 0.12 }, { item: 'lamp_oil', chance: 0.08 }], lootZone: 'ep4_flood_road',
    flavor: 'Runny blue-black ink with a red seal floating in it. It stamps itself official.',
  },
  // ---------------------------------------------------------------- the Sunken Keep (Lv 18 to 19)
  drowned_watch: {
    name: 'Drowned Watch', family: 'undead', level: 18,
    hp: 700, atk: 100, def: 30, mag: 30, spr: 22, spd: 12, luk: 5,
    shields: 4, weak: ['light', 'thunder'], resist: ['ice'], statusImmune: ['poison'], ai: 'decree',
    exp: 62, gold: 140, masteryPts: 11,
    moves: [{ skill: 'halberd', weight: 60 }, { skill: 'watch_cover', weight: 25, if: 'hasAlly' }, { skill: 'shield_wall', weight: 15, if: 'notProtected' }],
    drops: [{ item: 'hi_potion', chance: 0.1 }, { item: 'potion', chance: 0.15 }], lootZone: 'ep4_keep_f1',
    flavor: 'A gate guard in waterlogged plate, still turning people back from a gate that is under the river.',
  },
  gutter_phantom: {
    name: 'Gutter Phantom', family: 'spirit', level: 18, flying: true,
    hp: 560, atk: 60, def: 16, mag: 104, spr: 30, spd: 15, luk: 8,
    shields: 3, weak: ['light', 'fire'], resist: ['ice'], evade: 0.2, ai: 'decree',
    exp: 50, gold: 130, masteryPts: 11,
    moves: [{ skill: 'murk', weight: 30 }, { skill: 'drag_under', weight: 30 }, { skill: 'cold_touch', weight: 40 }],
    drops: [{ item: 'eye_drops', chance: 0.1 }, { item: 'echo_herb', chance: 0.1 }], lootZone: 'ep4_keep_f2',
    flavor: 'Murky green, with the eyes of a drowned lantern. It drifts where the drains still pull.',
  },
  blank_decree: {
    name: 'Blank Decree', family: 'paper', level: 19, flying: true,
    hp: 520, atk: 70, def: 18, mag: 110, spr: 34, spd: 16, luk: 6,
    shields: 3, weak: ['fire', 'bow'], resist: ['thunder'], statusImmune: ['poison'], ai: 'decree',
    heat: decree('edict'),
    exp: 55, gold: 150, masteryPts: 12,
    moves: [{ skill: 'paper_cut', weight: 55 }, { skill: 'stamp', weight: 45 }],
    drops: [{ item: 'lamp_oil', chance: 0.12 }, { item: 'echo_herb', chance: 0.1 }], lootZone: 'ep4_keep_f2',
    flavor: 'A royal order with nothing written on it, flying on cream paper wings. A red seal for an eye.',
  },
  waterlogged_sentinel: {
    name: 'Waterlogged Sentinel', family: 'construct', level: 19, size: 'large',
    hp: 620, atk: 120, def: 32, mag: 30, spr: 22, spd: 8, luk: 3,
    shields: 5, weak: ['thunder', 'axe'], resist: ['sword', 'spear', 'ice'], statusImmune: ['poison'], ai: 'decree',
    charge: { skill: 'breach', first: 2, cooldown: 3 },
    exp: 65, gold: 170, masteryPts: 13,
    moves: [{ skill: 'sentinel_slam', weight: 55 }, { skill: 'floodfist', weight: 45 }],
    drops: [{ item: 'hi_potion', chance: 0.12 }, { item: 'phoenix_feather', chance: 0.03 }], lootZone: 'ep4_keep_f2',
    flavor: 'Swollen stone and paper, kelp in the joints. It was set to hold a wall, and the wall is still here.',
  },

  // ---------------------------------------------------------------- the Inkbound Barrister (F2 mini-boss, Lv 19)
  // Stamps every turn (its sleeves are full of paper); Objection at 3 Seals; at 50% it calls a witness that stamps it too.
  barrister: {
    name: 'The Inkbound Barrister', family: 'spirit', level: 19, size: 'large', boss: true, ai: 'barrister',
    hp: 2500, atk: 300, def: 26, mag: 320, spr: 28, spd: 13, luk: 8,
    shields: 8, weak: ['light', 'spear', 'bow'], resist: ['fire', 'ice', 'thunder'], statusImmune: ['silence'],
    heat: decree('objection'),
    exp: 220, gold: 800, masteryPts: 18,
    moves: [{ skill: 'rebuttal', weight: 55 }, { skill: 'cross_examine', weight: 45 }],
    witnessAt: 0.5, stampsPerTurn: 2, haste: true,
    drops: [], lootZone: 'ep4_keep_f2',
    flavor: 'The Keep\'s clerk of decrees given a body: a drowned advocate in a black gown, its sleeves full of paper.',
  },
  barrister_witness: {
    name: 'Paper Witness', family: 'paper', level: 19, size: 'small', flying: true, ai: 'counsel',
    hp: 300, atk: 50, def: 14, mag: 60, spr: 20, spd: 12, luk: 4,
    shields: 2, weak: ['fire'], resist: ['thunder'], statusImmune: ['poison'],
    exp: 0, gold: 0, masteryPts: 3,
    moves: [{ skill: 'counsel_stamp', weight: 100 }, { skill: 'e_strike', weight: 0 }],
    drops: [], lootZone: null,
    flavor: 'A small blank decree called to the stand. It agrees with everything.',
  },

  // ---------------------------------------------------------------- the Paper Regent (Lv 20) and the Forged Writs
  paper_regent: {
    name: 'The Paper Regent', family: 'construct', level: 20, size: 'boss', boss: true, ai: 'paper_regent',
    hp: 2950, atk: 330, def: 26, mag: 300, spr: 24, spd: 13, luk: 10,
    shields: 7, weak: ['fire', 'spear'], resist: ['ice', 'thunder'], statusImmune: ['stun', 'poison', 'blind'],
    heat: decree('flood_decree'),
    exp: 800, gold: 1100, masteryPts: 28,
    moves: [{ skill: 'trident_sweep', weight: 30 }, { skill: 'wet_seal', weight: 30 }, { skill: 'stamp', weight: 40 }],
    phases: [
      { id: 'forged_edicts', name: 'Forged Edicts', at: 1.0, weak: ['fire', 'spear'], resist: ['ice', 'thunder'], shields: 7, armor: 1.4,
        text: 'The Regent rises from the throne. Every seal on its robes is wet and red.' },
      { id: 'royal_ward', name: 'Royal Ward', at: 0.7, floor: 0.31, weak: ['fire', 'spear'], resist: ['ice', 'thunder'], shields: 7, armor: 1.4, haste: true,
        summon: ['writ_silence', 'writ_oblivion'],
        text: 'Two writs unroll from its sleeves and stand beside it. While they stand, little reaches it.' },
      { id: 'true_charter', name: 'The True Charter', at: 0.31, weak: ['fire', 'spear', 'light'], resist: [], shields: 8, haste: true,
        moves: [{ skill: 'trident_sweep', weight: 60 }, { skill: 'stamp', weight: 40 }],
        text: 'The crown is paper. The trident is a pen.' },
    ],
    strikeEvery: 3,
    drops: [], lootZone: 'ep4_keep_crown',
    flavor: "The Keepers' Clerk of the Charter: a tool made to keep the seal, given a bad order, and still keeping it.",
  },
  writ_silence: {
    name: 'Forged Writ of Silence', family: 'paper', level: 20, size: 'small', ai: 'writ',
    hp: 600, atk: 60, def: 16, mag: 90, spr: 22, spd: 12, luk: 4,
    shields: 3, weak: ['fire'], resist: ['ice'], statusImmune: ['poison', 'stun'],
    exp: 0, gold: 0, masteryPts: 3,
    moves: [{ skill: 'mend_seal', weight: 100 }, { skill: 'seal_hush', weight: 0 }],
    drops: [], lootZone: null,
    flavor: 'A scroll on a brass stand, its wax seal still soft. It mends the Regent, and hushes whoever argues.',
  },
  writ_oblivion: {
    name: 'Forged Writ of Oblivion', family: 'paper', level: 20, size: 'small', ai: 'writ',
    hp: 650, atk: 60, def: 18, mag: 80, spr: 20, spd: 11, luk: 4,
    shields: 4, weak: ['spear', 'fire'], resist: ['ice'], statusImmune: ['poison', 'stun'],
    exp: 0, gold: 0, masteryPts: 3,
    moves: [{ skill: 'stamp_regent', weight: 100 }, { skill: 'e_strike', weight: 0 }],
    drops: [], lootZone: null,
    flavor: 'A scroll on a brass stand. It stamps the Regent\'s case again and again.',
  },
};

/** Ordinary foes, bosses and adds, in plan order (tests and the sim's bestiary read these). */
export const EP4_FOES = ['flood_hound', 'lockjaw_crab', 'ink_bloom', 'drowned_watch', 'gutter_phantom', 'blank_decree', 'waterlogged_sentinel'];
export const EP4_BOSSES = ['barrister', 'paper_regent'];
export const EP4_ADDS = ['barrister_witness', 'writ_silence', 'writ_oblivion'];

let done = false;
/** Add the rows (never overwriting an id). Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, o] of Object.entries(EP4_ENEMIES)) if (!ENEMIES[id]) enemy(id, { sprite: sprite(id), ...o });
  done = true;
}
export default register;
