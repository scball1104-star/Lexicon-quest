// Episode 5 ("The Last Prophecy") foes (E5-battle; docs/EPISODE5_PLAN.md 6.2 to 6.5). Plain rows added through enemy()
// (src/data/enemies.js) by the pack's register(); nothing here changes an existing row. Idempotent.
//
// The Turning Sky (plan 6.3, src/data/ep5/sky.js): every foe here has a `sky` side, 'sun' or 'star'. Under its own sky a foe
// is Ascendant (+20% ATK and MAG); under the other it is Exposed (every hit is a weakness hit for its shields and damage).
// `mirrorTurn: 'mirror_turn'` (the Mirage Knight, the Oracle's True Horizon): on every natural Turn it takes the side of the
// new sky, so only a Turn the party makes catches it Exposed. The Mirage Double takes the side opposite its Knight.
// Scripts (src/data/ep5/ai.js, registered onto ai.js SCRIPTS):
//   ai 'sky'           basic + the charge rule; every ordinary Episode 5 foe
//   ai 'mirage_knight' Horizon Cleave every 4th turn, its Double at 50%
//   ai 'mirage_double' copies the Knight's last attack at half power
//   ai 'oracle'        three phases, HP locks at 72% and 34%, the Last Prophecy, the Futures and the Veil, the Sandstorm
//   ai 'future'        Hunger (Devour the Road) and Fear (Dread, Hush the Reader)
// Flavors are first-pass lines (E5-story owns the bestiary text); sprites are pack atlas frames named by id (E5-sprites).

import { enemy, ENEMIES } from '../enemies.js';

const sprite = (id) => ({ atlas: 'enemies_battle', field: 'enemies_field', frame: id });

// Final numbers after tuning (docs/BATTLE.md section 13 has the table and what moved from the plan).
export const EP5_ENEMIES = {
  // ---------------------------------------------------------------- the ship and the Caravan Road (Lv 21)
  dune_stalker: {
    name: 'Dune Stalker', family: 'beast', level: 21, sky: 'sun',
    hp: 560, atk: 112, def: 30, mag: 20, spr: 20, spd: 19, luk: 6,
    shields: 2, weak: ['ice', 'spear'], resist: ['fire'], evade: 0.1, ai: 'sky',
    exp: 100, gold: 140, masteryPts: 12,
    moves: [{ skill: 'dune_bite', weight: 60, target: 'lowestHpPct' }, { skill: 'sandkick', weight: 40 }],
    drops: [{ item: 'hi_potion', chance: 0.08 }, { item: 'eye_drops', chance: 0.1 }], lootZone: 'ep5_caravan_road',
    flavor: 'A sand-gold hunter with dark stripes. It waits on the lee of a dune for the sun to blind you.',
  },
  dune_scarab: {
    name: 'Dune Scarab', family: 'beast', level: 21, sky: 'sun',
    hp: 540, atk: 108, def: 50, mag: 16, spr: 22, spd: 9, luk: 4,
    shields: 4, weak: ['ice', 'axe'], resist: ['fire', 'sword', 'bow'], ai: 'sky',
    exp: 105, gold: 150, masteryPts: 12,
    moves: [{ skill: 'mandible', weight: 50 }, { skill: 'sunshell', weight: 30 }, { skill: 'burrow', weight: 20, if: 'notProtected' }],
    drops: [{ item: 'hi_potion', chance: 0.1 }, { item: 'hourglass_sand', chance: 0.06 }], lootZone: 'ep5_caravan_road',
    flavor: 'A beetle with a gold shell inlaid with lapis, as if someone made it for a temple and it walked off.',
  },
  dust_harrier: {
    name: 'Dust Harrier', family: 'beast', level: 22, sky: 'sun', flying: true,
    hp: 520, atk: 118, def: 24, mag: 30, spr: 24, spd: 21, luk: 8,
    shields: 3, weak: ['bow', 'thunder'], resist: ['fire'], evade: 0.15, ai: 'sky',
    exp: 80, gold: 150, masteryPts: 12,
    moves: [{ skill: 'talon', weight: 60 }, { skill: 'dust_devil', weight: 40 }],
    drops: [{ item: 'eye_drops', chance: 0.12 }, { item: 'hi_potion', chance: 0.06 }], lootZone: 'ep5_lab_f1',
    flavor: 'Ochre and rust feathers. It rides the hot wind off the dunes and drops out of the sun.',
  },
  // ---------------------------------------------------------------- the Oracle Labyrinth (Lv 22 to 24)
  silt_reaver: {
    name: 'Silt Reaver', family: 'spirit', level: 22, sky: 'star',
    hp: 680, atk: 80, def: 22, mag: 120, spr: 34, spd: 14, luk: 6,
    shields: 3, weak: ['light', 'fire'], resist: ['ice'], ai: 'sky',
    exp: 95, gold: 160, masteryPts: 13,
    moves: [{ skill: 'silt_lash', weight: 50 }, { skill: 'bury', weight: 25 }, { skill: 'silt_drain', weight: 25 }],
    drops: [{ item: 'echo_herb', chance: 0.1 }, { item: 'hi_ether', chance: 0.04 }], lootZone: 'ep5_lab_f1',
    flavor: 'Dust-coloured robes with sand streaming from the sleeves, and star-blue eyes. It buries what it reads.',
  },
  starsilt: {
    name: 'Starsilt', family: 'ooze', level: 22, sky: 'star', size: 'small',
    hp: 580, atk: 70, def: 18, mag: 115, spr: 30, spd: 11, luk: 4,
    shields: 2, weak: ['fire', 'light'], resist: ['ice', 'thunder'], statusImmune: ['poison'], ai: 'sky',
    exp: 105, gold: 150, masteryPts: 12,
    moves: [{ skill: 'glimmer', weight: 55 }, { skill: 'starfall', weight: 45 }],
    drops: [{ item: 'eye_drops', chance: 0.12 }, { item: 'hourglass_sand', chance: 0.06 }], lootZone: 'ep5_caravan_road',
    flavor: 'Deep indigo jelly with star specks drifting in it. At noon it is only a puddle.',
  },
  horizon_shade: {
    name: 'Horizon Shade', family: 'spirit', level: 23, sky: 'star', flying: true,
    hp: 700, atk: 76, def: 20, mag: 130, spr: 38, spd: 16, luk: 8,
    shields: 3, weak: ['light', 'fire'], resist: ['ice'], ai: 'sky',
    charge: { skill: 'eclipse', first: 2, cooldown: 3 },
    exp: 100, gold: 170, masteryPts: 14,
    moves: [{ skill: 'cold_horizon', weight: 60 }, { skill: 'shade_mirage', weight: 40, if: 'notProtected' }],
    drops: [{ item: 'hi_ether', chance: 0.06 }, { item: 'echo_herb', chance: 0.1 }], lootZone: 'ep5_lab_f2',
    flavor: 'Indigo and pale gold, a horizon line drawn across its body. It is always farther than it looks.',
  },
  tomorrow_husk: {
    name: 'Tomorrow Husk', family: 'construct', level: 24, sky: 'sun', size: 'large',
    hp: 900, atk: 150, def: 48, mag: 40, spr: 26, spd: 8, luk: 3,
    shields: 5, weak: ['ice', 'axe'], resist: ['fire', 'sword', 'spear'], statusImmune: ['poison'], ai: 'sky',
    charge: { skill: 'hour_crush', first: 1, cooldown: 2 },
    exp: 125, gold: 200, masteryPts: 15,
    moves: [{ skill: 'husk_slam', weight: 70 }, { skill: 'sandglass', weight: 30, if: 'notHasted' }],
    drops: [{ item: 'hi_potion', chance: 0.12 }, { item: 'phoenix_feather', chance: 0.03 }], lootZone: 'ep5_lab_f3',
    flavor: 'A sandstone husk with an hourglass for a heart. When the sand runs out it turns itself over.',
  },

  // ---------------------------------------------------------------- the Mirage Knight (F2 mini-boss, Lv 23) and its Double
  mirage_knight: {
    name: 'The Mirage Knight', family: 'construct', level: 23, size: 'large', boss: true, ai: 'mirage_knight', sky: 'sun',
    mirrorTurn: 'mirror_turn',
    hp: 2450, atk: 420, def: 34, mag: 220, spr: 26, spd: 13, luk: 8,
    shields: 7, weak: ['ice', 'axe'], resist: ['fire', 'sword'], statusImmune: ['silence'],
    exp: 220, gold: 900, masteryPts: 20,
    moves: [{ skill: 'mirage_slash', weight: 60 }, { skill: 'glare', weight: 40 }],
    cleaveEvery: 3, doubleAt: 0.5,
    drops: [], lootZone: 'ep5_lab_f2',
    flavor: 'A knight of sun-bronze with a mirror for a shield. The mirror shows whichever sky it is not.',
  },
  mirage_double: {
    name: 'Mirage Double', family: 'construct', level: 23, size: 'large', ai: 'mirage_double', sky: 'star',
    hp: 600, atk: 150, def: 30, mag: 90, spr: 24, spd: 12, luk: 4,
    shields: 2, weak: ['ice'], resist: [], statusImmune: ['silence'],
    exp: 0, gold: 0, masteryPts: 4,
    moves: [{ skill: 'mirror_copy', weight: 100 }],
    drops: [], lootZone: null,
    flavor: 'The Knight as its mirror shows it: indigo, a little smaller, a moment late.',
  },

  // ---------------------------------------------------------------- the Sand Oracle (Lv 24) and the False Futures
  oracle: {
    name: 'The Sand Oracle', family: 'construct', level: 24, size: 'boss', boss: true, ai: 'oracle', sky: 'sun',
    hp: 4000, atk: 380, def: 30, mag: 420, spr: 28, spd: 14, luk: 10,
    shields: 8, weak: ['ice', 'spear'], resist: ['fire', 'thunder'], statusImmune: ['stun', 'poison', 'blind'],
    exp: 1000, gold: 1400, masteryPts: 32,
    moves: [{ skill: 'stinger', weight: 55 }, { skill: 'sandfall', weight: 45 }],
    phases: [
      { id: 'read_sky', name: 'The Read Sky', at: 1.0, weak: ['ice', 'spear'], resist: ['fire', 'thunder'], shields: 8, sprite: 'oracle',
        text: 'The Oracle uncoils around the golden ring. Its mask turns to the sky.' },
      { id: 'false_futures', name: 'False Futures', at: 0.72, floor: 0.34, weak: ['ice', 'spear'], resist: ['fire', 'thunder'], shields: 8,
        summon: ['future_hunger', 'future_fear'], sprite: 'oracle_futures',
        text: 'Two futures rise out of the sand beside it. While they stand, a veil of mirage holds.' },
      { id: 'true_horizon', name: 'The True Horizon', at: 0.34, weak: ['ice', 'spear', 'light'], resist: [], shields: 9, haste: true, mirror: true,
        sprite: 'oracle_true', text: 'The mask falls. Under it, a face made of stars.' },
    ],
    sandstormEvery: 4,
    drops: [], lootZone: 'ep5_lab_oracle',
    flavor: "The Keepers' Reader of Roads: a golden scorpion full of stars, made to read the roads home, told to read only the ends.",
  },
  future_hunger: {
    name: 'False Future: Hunger', family: 'spirit', level: 24, size: 'small', ai: 'future', sky: 'sun',
    hp: 520, atk: 90, def: 20, mag: 120, spr: 24, spd: 13, luk: 4,
    shields: 2, weak: ['ice'], resist: ['fire'], statusImmune: ['poison', 'stun'],
    exp: 0, gold: 0, masteryPts: 4,
    moves: [{ skill: 'devour_road', weight: 100 }],
    drops: [], lootZone: null,
    flavor: 'A cracked hourglass wearing an open-jawed mask. It eats the road ahead of you.',
  },
  future_fear: {
    name: 'False Future: Fear', family: 'spirit', level: 24, size: 'small', ai: 'future', sky: 'star',
    hp: 560, atk: 80, def: 20, mag: 120, spr: 26, spd: 13, luk: 4,
    shields: 3, weak: ['spear', 'light'], resist: ['ice'], statusImmune: ['poison', 'stun'],
    exp: 0, gold: 0, masteryPts: 4,
    moves: [{ skill: 'dread', weight: 100 }, { skill: 'hush_reader', weight: 0 }],
    hushEvery: 3,
    drops: [], lootZone: null,
    flavor: 'A cracked hourglass wearing a mask with hollow eyes. It holds you back, and hushes the reader.',
  },
};

/** Ordinary foes, bosses and adds, in plan order (tests and the sim's bestiary read these). */
export const EP5_FOES = ['dune_stalker', 'dune_scarab', 'dust_harrier', 'silt_reaver', 'starsilt', 'horizon_shade', 'tomorrow_husk'];
export const EP5_BOSSES = ['mirage_knight', 'oracle'];
export const EP5_ADDS = ['mirage_double', 'future_hunger', 'future_fear'];

let done = false;
/** Add the rows (never overwriting an id). Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, o] of Object.entries(EP5_ENEMIES)) if (!ENEMIES[id]) enemy(id, { sprite: sprite(id), ...o });
  done = true;
}
export default register;
