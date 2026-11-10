// Episode 6 ("The Skybound Isles") foes (E6-battle; docs/EPISODE6_PLAN.md 6.2 to 6.5). Plain rows added through enemy()
// (src/data/enemies.js) by the pack's register(); nothing here changes an existing row. Idempotent.
//
// The Gale (plan 6.3, src/data/ep6/gale.js): every foe here has a `wind` field, 'aloft' or 'ground'. An Aloft foe that is not
// Broken rides every Gust (it comes round sooner); a grounded foe is blown back like the party unless it braces. A Broken Aloft
// foe is Grounded until it recovers. `gustEvery` (the Gale Engine's bellows) shortens the Gust while that foe stands and runs them.
// Scripts (src/data/ep6/ai.js, registered onto ai.js SCRIPTS):
//   ai 'gale'          basic + the charge rule; every ordinary Episode 6 foe (the Gale does the rest)
//   ai 'gale_engine'   Bellows (the Gust every 3), Full Blast pinned to the Gust, two Gale Sprites at 50%
//   ai 'scribe'        three phases, HP locks at 68% and 33%, Rewrite the Course pinned to the Gust, the Storm Script Ward,
//                      the tear (+25 Fury), the True Sky Chart's Haste and Thunderhead
//   ai 'scribe_ward'   the False Beacon (False Light: Covers the Scribe) and the Broken Compass (Spin, Misdirect on Bram)
// Flavors are first-pass lines (E6-story owns the bestiary text); sprites are pack atlas frames named by id (E6-sprites).

import { enemy, ENEMIES } from '../enemies.js';

const sprite = (id) => ({ atlas: 'enemies_battle', field: 'enemies_field', frame: id });

// Final numbers after tuning (docs/BATTLE.md section 14 has the table and what moved from the plan).
export const EP6_ENEMIES = {
  // ---------------------------------------------------------------- the Airstair and the Windward Causeways (Lv 25)
  squall_wolf: {
    name: 'Squall Wolf', family: 'beast', level: 25, wind: 'ground',
    hp: 760, atk: 175, def: 30, mag: 20, spr: 22, spd: 20, luk: 6,
    shields: 2, weak: ['fire', 'spear'], resist: ['ice'], evade: 0.1, ai: 'gale',
    exp: 95, gold: 160, masteryPts: 14,
    moves: [{ skill: 'squall_bite', weight: 70, target: 'lowestHpPct' }, { skill: 'squall_howl', weight: 30, if: 'notFocused' }],
    drops: [{ item: 'hi_potion', chance: 0.08 }, { item: 'ballast_stone', chance: 0.06 }], lootZone: 'ep6_airstair',
    flavor: 'Storm-grey fur with white streaks the wind left on it. It runs into a gust, never with it.',
  },
  gale_sprite: {
    name: 'Gale Sprite', family: 'spirit', level: 25, size: 'small', wind: 'aloft',
    hp: 640, atk: 90, def: 18, mag: 165, spr: 32, spd: 18, luk: 6,
    shields: 2, weak: ['thunder', 'spear'], resist: ['ice', 'bow'], ai: 'gale',
    exp: 90, gold: 160, masteryPts: 13,
    moves: [{ skill: 'gale_slap', weight: 55 }, { skill: 'gale_whirl', weight: 45 }],
    drops: [{ item: 'ether', chance: 0.08 }, { item: 'ballast_stone', chance: 0.06 }], lootZone: 'ep6_obs_f1',
    flavor: 'A cloud-white jelly with two blue eyes of wind. It goes where the gust goes, and gets there first.',
  },
  rigger_beetle: {
    name: 'Rigger Beetle', family: 'beast', level: 25, wind: 'ground',
    hp: 600, atk: 165, def: 44, mag: 18, spr: 24, spd: 9, luk: 4,
    shields: 4, weak: ['thunder', 'axe'], resist: ['sword', 'bow'], ai: 'gale',
    exp: 100, gold: 170, masteryPts: 14,
    moves: [{ skill: 'rigger_mandible', weight: 55 }, { skill: 'rigger_clamp', weight: 25, if: 'notProtected' }, { skill: 'rigger_rivet', weight: 20 }],
    drops: [{ item: 'hi_potion', chance: 0.1 }, { item: 'ballast_stone', chance: 0.08 }], lootZone: 'ep6_obs_f1',
    flavor: 'A brass shell with rows of rivets and rope-coloured legs. It holds on to the deck in any wind.',
  },
  // ---------------------------------------------------------------- the Storm Observatory (Lv 26 to 27)
  signal_wraith: {
    name: 'Signal Wraith', family: 'spirit', level: 26, wind: 'aloft',
    hp: 640, atk: 78, def: 22, mag: 175, spr: 36, spd: 15, luk: 6,
    shields: 3, weak: ['light', 'fire'], resist: ['ice', 'thunder'], ai: 'gale',
    exp: 100, gold: 180, masteryPts: 15,
    moves: [{ skill: 'signal_static', weight: 50 }, { skill: 'false_signal', weight: 25 }, { skill: 'signal_drain', weight: 25 }],
    drops: [{ item: 'echo_herb', chance: 0.1 }, { item: 'hi_ether', chance: 0.05 }], lootZone: 'ep6_obs_f2',
    flavor: 'Slate robes and a signal lamp burning in the hood. It answers every light with the wrong one.',
  },
  storm_harrier: {
    name: 'Storm Harrier', family: 'beast', level: 26, wind: 'aloft', flying: true,
    hp: 600, atk: 175, def: 26, mag: 30, spr: 26, spd: 22, luk: 8,
    shields: 3, weak: ['bow', 'ice'], resist: ['thunder'], evade: 0.15, ai: 'gale',
    exp: 100, gold: 180, masteryPts: 15,
    moves: [{ skill: 'harrier_talon', weight: 65 }, { skill: 'harrier_dive', weight: 35 }],
    drops: [{ item: 'eye_drops', chance: 0.1 }, { item: 'hi_potion', chance: 0.06 }], lootZone: 'ep6_airstair',
    flavor: 'Cobalt wings and pale gold talons. It waits for the gust and comes down inside it.',
  },
  lightning_manta: {
    name: 'Lightning Manta', family: 'spirit', level: 26, size: 'large', wind: 'aloft', flying: true,
    hp: 680, atk: 82, def: 22, mag: 180, spr: 38, spd: 16, luk: 6,
    shields: 3, weak: ['ice', 'bow'], resist: ['thunder', 'fire'], ai: 'gale',
    charge: { skill: 'thunder_glide', first: 2, cooldown: 3 },
    exp: 105, gold: 190, masteryPts: 16,
    moves: [{ skill: 'manta_shock', weight: 100 }],
    drops: [{ item: 'hi_ether', chance: 0.06 }, { item: 'ballast_stone', chance: 0.08 }], lootZone: 'ep6_obs_f2',
    flavor: 'A ragged violet cloak that flies like a ray, yellow sparks running along its wings.',
  },
  storm_page: {
    name: 'Storm-Marked Page', family: 'construct', level: 27, size: 'small', wind: 'aloft',
    hp: 640, atk: 100, def: 20, mag: 185, spr: 40, spd: 17, luk: 6,
    shields: 3, weak: ['fire', 'light'], resist: ['thunder', 'ice'], statusImmune: ['poison'], ai: 'gale',
    charge: { skill: 'overwrite', first: 2, cooldown: 3 },
    exp: 100, gold: 200, masteryPts: 16,
    moves: [{ skill: 'margin_cut', weight: 60 }, { skill: 'smudge', weight: 40 }],
    drops: [{ item: 'hi_ether', chance: 0.06 }, { item: 'phoenix_feather', chance: 0.03 }], lootZone: 'ep6_obs_f3',
    flavor: 'A loose page with storm-blue runes written over its own words. It reads like weather.',
  },

  // ---------------------------------------------------------------- the Gale Engine (F2 mini-boss, Lv 26)
  gale_engine: {
    name: 'The Gale Engine', family: 'construct', level: 26, size: 'large', boss: true, ai: 'gale_engine', wind: 'ground',
    hp: 1750, atk: 750, def: 42, mag: 200, spr: 24, spd: 14, luk: 6,
    shields: 7, weak: ['thunder', 'axe'], resist: ['ice', 'bow'], statusImmune: ['silence'],
    exp: 240, gold: 1000, masteryPts: 22,
    moves: [{ skill: 'engine_fan', weight: 60 }, { skill: 'engine_piston', weight: 40 }],
    gustEvery: 3, bellowsOff: 2, blastCooldown: 0, spritesAt: 0.5,
    drops: [], lootZone: 'ep6_obs_f2',
    flavor: 'A brass bellows-and-fan machine bolted to the floor of the Hall. It drives the wind, and it drives it at you.',
  },

  // ---------------------------------------------------------------- the Storm Scribe (Lv 27), the False Beacon, the Broken Compass
  scribe: {
    name: 'The Storm Scribe', family: 'construct', level: 27, size: 'boss', boss: true, ai: 'scribe', wind: 'aloft',
    hp: 3900, atk: 520, def: 32, mag: 520, spr: 30, spd: 15, luk: 10,
    shields: 8, weak: ['spear', 'bow'], resist: ['ice', 'thunder'], statusImmune: ['stun', 'poison', 'blind'],
    exp: 1300, gold: 1600, masteryPts: 34,
    moves: [{ skill: 'quillstorm', weight: 50 }, { skill: 'ink_squall', weight: 50, target: 'lowestHpPct' }],
    armor: 1.4, thunderheadEvery: 4, rewriteCooldown: 0,
    phases: [
      { id: 'wind_script', name: 'The Wind Script', at: 1.0, weak: ['spear', 'bow'], resist: ['ice', 'thunder'], shields: 8, sprite: 'scribe',
        text: 'The Scribe opens its wings. Every feather is a line of the wind.' },
      { id: 'storm_ward', name: 'The Storm Script Ward', at: 0.68, floor: 0.33, weak: ['spear', 'bow'], resist: ['ice', 'thunder'], shields: 8,
        summon: ['false_beacon', 'broken_compass'], sprite: 'scribe_ward',
        text: 'A false light and a broken compass rise beside it. While they stand, the ward holds.' },
      { id: 'true_sky_chart', name: 'The True Sky Chart', at: 0.33, weak: ['fire', 'spear', 'light'], resist: [], shields: 9, haste: true,
        sprite: 'scribe_chart', text: 'The wings open like sails. The whole sky is written on them.' },
    ],
    drops: [], lootZone: 'ep6_obs_eyrie',
    flavor: 'The Keepers\' Writer of Winds: made to write the courses home, told to write them so no one comes back.',
  },
  false_beacon: {
    name: 'The False Beacon', family: 'construct', level: 27, size: 'small', ai: 'scribe_ward', wind: 'aloft',
    hp: 560, atk: 200, def: 22, mag: 200, spr: 28, spd: 14, luk: 4,
    shields: 2, weak: ['fire', 'light'], resist: ['thunder'], statusImmune: ['poison', 'stun'],
    exp: 0, gold: 0, masteryPts: 4,
    moves: [{ skill: 'false_light', weight: 100 }],
    drops: [], lootZone: null,
    flavor: 'A lamp on a broken mast. Its light says home, and it is lying.',
  },
  broken_compass: {
    name: 'The Broken Compass', family: 'construct', level: 27, size: 'small', ai: 'scribe_ward', wind: 'ground',
    hp: 520, atk: 200, def: 26, mag: 200, spr: 26, spd: 13, luk: 4,
    shields: 3, weak: ['axe', 'thunder'], resist: ['ice'], statusImmune: ['poison', 'stun'],
    exp: 0, gold: 0, masteryPts: 4,
    moves: [{ skill: 'compass_spin', weight: 100 }, { skill: 'misdirect', weight: 0 }],
    misdirectEvery: 3,
    drops: [], lootZone: null,
    flavor: 'A brass compass rose with a cracked needle. It turns you round, and it turns on the one who holds.',
  },
};

/** Ordinary foes, bosses and adds, in plan order (tests and the sim's bestiary read these). */
export const EP6_FOES = ['squall_wolf', 'gale_sprite', 'rigger_beetle', 'signal_wraith', 'storm_harrier', 'lightning_manta', 'storm_page'];
export const EP6_BOSSES = ['gale_engine', 'scribe'];
export const EP6_ADDS = ['false_beacon', 'broken_compass'];

let done = false;
/** Add the rows (never overwriting an id). Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, o] of Object.entries(EP6_ENEMIES)) if (!ENEMIES[id]) enemy(id, { sprite: sprite(id), ...o });
  done = true;
}
export default register;
