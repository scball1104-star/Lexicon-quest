// Episode 7 ("The Vanishing World") foes (E7-battle; docs/EPISODE7_PLAN.md 6.2 to 6.5). Plain rows added through enemy()
// (src/data/enemies.js) by the pack's register(); nothing here changes an existing row. Idempotent.
//
// Rime (plan 6.3, src/data/ep7/rime.js): every foe here has `cold: true`, so every battle it is in has Rime. Its cold moves carry
// `{ keep: 'rime', rime: n }` in src/data/ep7/skills.js (the Rime each member hit gains); plain moves add none. No foe ever holds
// Rime, and nothing a foe does to the party slows that foe (the Gale Engine lesson, PLAYTEST_REVIEW_8 item 1).
// Scripts (src/data/ep7/ai.js, registered onto ai.js SCRIPTS):
//   ai 'cold'           basic + the charge rule + the Rime bridge; every ordinary Episode 7 foe, and the Snow Wisps the Lantern calls
//   ai 'pale_lantern'   Pale Flame, Lamplight Chill, Borrowed Light pinned, the 8% heal when it lands, two Snow Wisps at 50%
//   ai 'white_phantom'  three phases, HP locks at 68% and 33%, Farewell pinned in every phase (never on the hero), the Frozen Ward
//                       (the Closed Gate and the Lost Letter), the thaw (Broken, +25 Fury), Thawlight's Haste and Stillheart Blizzard
//   ai 'phantom_ward'   the Closed Gate (Shut on the hero every 3rd turn, Bar between) and the Lost Letter (Cold Ink, then Mend)
// Flavors are first-pass lines (E7-story owns the bestiary text); sprites are pack atlas frames named by id (E7-sprites).
// Names follow the canon list (EPISODE7 section 8): Frostbound Revenant, Hollow Ice Knight; the rest are new.

import { enemy, ENEMIES } from '../enemies.js';

const sprite = (id) => ({ atlas: 'enemies_battle', field: 'enemies_field', frame: id });

// Final numbers after tuning (docs/BATTLE.md section 16 has the table and what moved from the plan).
export const EP7_ENEMIES = {
  // ---------------------------------------------------------------- the White Road (Lv 28)
  rime_wolf: {
    name: 'Rime Wolf', family: 'beast', level: 28, cold: true,
    hp: 820, atk: 190, def: 32, mag: 20, spr: 24, spd: 20, luk: 6,
    shields: 2, weak: ['fire', 'spear'], resist: ['ice'], evade: 0.1, ai: 'cold',
    exp: 85, gold: 230, masteryPts: 15,
    moves: [{ skill: 'rime_bite', weight: 55, target: 'lowestHpPct' }, { skill: 'frost_fang', weight: 45 }],
    drops: [{ item: 'hi_potion', chance: 0.08 }, { item: 'ember_tea', chance: 0.08 }], lootZone: 'ep7_white_road',
    flavor: 'White fur with blue frost at the jaw. Where it bites, a name goes cold.',
  },
  snow_wisp: {
    name: 'Snow Wisp', family: 'spirit', level: 28, size: 'small', cold: true,
    hp: 690, atk: 90, def: 20, mag: 180, spr: 34, spd: 18, luk: 6,
    shields: 2, weak: ['fire', 'light'], resist: ['ice', 'bow'], ai: 'cold',
    exp: 80, gold: 220, masteryPts: 14,
    moves: [{ skill: 'wisp_slap', weight: 55 }, { skill: 'flurry', weight: 45 }],
    drops: [{ item: 'ether', chance: 0.08 }, { item: 'ember_tea', chance: 0.06 }], lootZone: 'ep7_vault_f1',
    flavor: 'A white jelly with snow falling inside it. It drifts toward anything warm.',
  },
  hush_owl: {
    name: 'Hush Owl', family: 'beast', level: 28, flying: true, cold: true,
    hp: 700, atk: 185, def: 26, mag: 60, spr: 28, spd: 22, luk: 8,
    shields: 3, weak: ['bow', 'fire'], resist: ['ice'], evade: 0.15, ai: 'cold',
    exp: 85, gold: 230, masteryPts: 15,
    moves: [{ skill: 'owl_talon', weight: 50 }, { skill: 'owl_hush', weight: 20 }, { skill: 'owl_dive', weight: 30 }],
    drops: [{ item: 'echo_herb', chance: 0.1 }, { item: 'hi_potion', chance: 0.06 }], lootZone: 'ep7_white_road',
    flavor: 'A white-and-grey snow owl with gold eyes. Nothing you hear is ever it.',
  },
  // ---------------------------------------------------------------- the Frostbound Vault (Lv 29 to 30)
  crystal_crawler: {
    name: 'Crystal Crawler', family: 'beast', level: 29, cold: true,
    hp: 680, atk: 180, def: 48, mag: 20, spr: 26, spd: 9, luk: 4,
    shields: 4, weak: ['fire', 'axe'], resist: ['sword', 'bow'], ai: 'cold',
    exp: 90, gold: 240, masteryPts: 15,
    moves: [{ skill: 'crawler_mandible', weight: 50 }, { skill: 'crawler_glaze', weight: 20, if: 'notProtected' }, { skill: 'shard_spray', weight: 30 }],
    drops: [{ item: 'hi_potion', chance: 0.1 }, { item: 'ember_tea', chance: 0.08 }], lootZone: 'ep7_vault_f1',
    flavor: 'A clear crystal shell on aurora-green legs. You can see the cold moving in it.',
  },
  frostbound_revenant: {
    name: 'Frostbound Revenant', family: 'spirit', level: 29, cold: true,
    hp: 720, atk: 90, def: 24, mag: 195, spr: 40, spd: 15, luk: 6,
    shields: 3, weak: ['fire', 'light'], resist: ['ice', 'thunder'], ai: 'cold',
    exp: 90, gold: 250, masteryPts: 16,
    moves: [{ skill: 'chill_touch', weight: 50 }, { skill: 'grave_cold', weight: 25 }, { skill: 'revenant_drain', weight: 25 }],
    drops: [{ item: 'eye_drops', chance: 0.1 }, { item: 'hi_ether', chance: 0.05 }], lootZone: 'ep7_vault_f2',
    flavor: 'An icy skeletal shape in a frozen shroud. It holds out its hand as if to take yours.',
  },
  ice_knight: {
    name: 'Hollow Ice Knight', family: 'construct', level: 30, cold: true,
    hp: 860, atk: 200, def: 46, mag: 40, spr: 30, spd: 12, luk: 4,
    shields: 4, weak: ['fire', 'axe'], resist: ['ice', 'sword'], statusImmune: ['poison'], ai: 'cold',
    charge: { skill: 'glacier_cleave', first: 2, cooldown: 3 },
    exp: 95, gold: 260, masteryPts: 17,
    moves: [{ skill: 'ice_blade', weight: 100 }],
    drops: [{ item: 'hi_potion', chance: 0.1 }, { item: 'ember_tea', chance: 0.08 }], lootZone: 'ep7_vault_f2',
    flavor: 'Armor of clear ice and old steel, and nothing inside it. It still stands its watch.',
  },
  rimed_page: {
    name: 'Rime-Written Page', family: 'construct', level: 30, size: 'small', cold: true,
    hp: 700, atk: 110, def: 22, mag: 200, spr: 42, spd: 17, luk: 6,
    shields: 3, weak: ['fire', 'light'], resist: ['thunder', 'ice'], statusImmune: ['poison'], ai: 'cold',
    charge: { skill: 'final_line', first: 2, cooldown: 3 },
    exp: 90, gold: 260, masteryPts: 16,
    moves: [{ skill: 'rime_margin', weight: 55 }, { skill: 'page_cold_ink', weight: 45 }],
    drops: [{ item: 'hi_ether', chance: 0.06 }, { item: 'phoenix_feather', chance: 0.03 }], lootZone: 'ep7_vault_f3',
    flavor: 'A loose page frosted white, with blue lines written over its own words.',
  },

  // ---------------------------------------------------------------- the Pale Lantern (F2 mini-boss, Lv 29)
  pale_lantern: {
    name: 'The Pale Lantern', family: 'spirit', level: 29, size: 'large', boss: true, ai: 'pale_lantern', cold: true,
    hp: 1300, atk: 300, def: 30, mag: 850, spr: 40, spd: 28, luk: 6,
    shields: 7, weak: ['fire', 'light'], resist: ['ice', 'thunder'], statusImmune: ['silence'],
    exp: 280, gold: 1600, masteryPts: 24,
    moves: [{ skill: 'pale_flame', weight: 55, target: 'lowestHpPct' }, { skill: 'lamplight_chill', weight: 45 }],
    // Borrowed Light: pinned at the end of a turn with nothing pinned, then `pinGap` clear turns after the turn it lands on; heals
    // `borrowHeal` of its max HP when it lands, and its target is Frozen at `borrowMult` damage taken (the cost of a missed Call;
    // a Rime freeze is rime.js FROZEN_MULT). Two Snow Wisps at `wispsAt`.
    pinGap: 0, borrowHeal: 0.08, borrowMult: 1.7, wispsAt: 0.5,
    drops: [], lootZone: 'ep7_vault_f2',
    flavor: 'A tall hooded keeper with a great lantern for a head. It lights the hall with names it will not give back.',
  },

  // ---------------------------------------------------------------- the White Phantom (Lv 30), the Closed Gate, the Lost Letter
  white_phantom: {
    name: 'The White Phantom', family: 'construct', level: 30, size: 'boss', boss: true, ai: 'white_phantom', cold: true,
    hp: 3300, atk: 600, def: 34, mag: 1450, spr: 32, spd: 22, luk: 10,
    shields: 8, weak: ['fire', 'axe'], resist: ['ice', 'thunder'], statusImmune: ['stun', 'poison', 'blind'],
    exp: 1500, gold: 1800, masteryPts: 36,
    moves: [{ skill: 'whiteout_breath', weight: 50 }, { skill: 'icicle_lance', weight: 50, target: 'lowestHpPct' }],
    // Farewell: pinned like Borrowed Light (`pinGap` clear turns after its landing turn); a landed one Stills for `stillTurns` party
    // turns (rime.js STILL_TURNS is the default).
    armor: 1.4, blizzardEvery: 4, pinGap: 0, stillTurns: 3,
    phases: [
      { id: 'outer_frost', name: 'Outer Frost', at: 1.0, weak: ['fire', 'axe'], resist: ['ice', 'thunder'], shields: 8, sprite: 'white_phantom',
        text: 'Fire cracks its outer frost.' },
      { id: 'frozen_ward', name: 'The Frozen Ward', at: 0.68, floor: 0.33, weak: ['fire', 'axe'], resist: ['ice', 'thunder'], shields: 8,
        summon: ['closed_gate', 'lost_letter'], sprite: 'white_phantom_ward',
        text: 'The cloak spreads like a door. A gate and a letter freeze out of it.' },
      { id: 'thawlight', name: 'Thawlight', at: 0.33, weak: ['fire', 'spear', 'light'], resist: [], shields: 9, haste: true,
        sprite: 'white_phantom_thaw', text: 'The ward thaws. Fire cracks the Phantom\'s frost.' },
    ],
    drops: [], lootZone: 'ep7_stillheart',
    flavor: 'The Warden of the Stillheart: made to keep the North\'s names safe, and keeping them still.',
  },
  closed_gate: {
    name: 'The Closed Gate', family: 'construct', level: 30, size: 'small', ai: 'phantom_ward', cold: true,
    hp: 600, atk: 220, def: 30, mag: 220, spr: 26, spd: 14, luk: 4,
    shields: 3, weak: ['axe', 'fire'], resist: ['ice'], statusImmune: ['poison', 'stun'],
    exp: 0, gold: 0, masteryPts: 4,
    moves: [{ skill: 'gate_bar', weight: 100 }, { skill: 'shut', weight: 0 }],
    shutEvery: 3,
    drops: [], lootZone: null,
    flavor: 'An iron-and-ice gate on a post, its lock frozen. It shuts on the one who would call.',
  },
  lost_letter: {
    name: 'The Lost Letter', family: 'construct', level: 30, size: 'small', ai: 'phantom_ward', cold: true,
    hp: 540, atk: 200, def: 22, mag: 220, spr: 28, spd: 13, luk: 4,
    shields: 2, weak: ['spear', 'fire'], resist: ['ice'], statusImmune: ['poison', 'stun'],
    exp: 0, gold: 0, masteryPts: 4,
    moves: [{ skill: 'cold_ink', weight: 100, target: 'lowestHpPct' }],
    mendPct: 0.04,
    drops: [], lootZone: null,
    flavor: 'A folded letter in a shell of ice, the seal broken. Someone came home in it, and no one read it.',
  },
};

/** Ordinary foes, bosses and adds, in plan order (tests and the sim's bestiary read these). */
export const EP7_FOES = ['rime_wolf', 'snow_wisp', 'hush_owl', 'crystal_crawler', 'frostbound_revenant', 'ice_knight', 'rimed_page'];
export const EP7_BOSSES = ['pale_lantern', 'white_phantom'];
export const EP7_ADDS = ['closed_gate', 'lost_letter'];

let done = false;
/** Add the rows (never overwriting an id). Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, o] of Object.entries(EP7_ENEMIES)) if (!ENEMIES[id]) enemy(id, { sprite: sprite(id), ...o });
  done = true;
}
export default register;
