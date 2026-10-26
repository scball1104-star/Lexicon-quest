// Episode 1 expansion ("The Wider Valley"): the three new foes and their two skills (EXPANSION1_PLAN.md 7.4, 6.3). Plain rows;
// the pack's register() adds them through enemy() (src/data/enemies.js) and the skills into SKILLS in skills.js shape.
// Idempotent. Nothing here changes an existing row.
//
//   barrow_shade     the one new ordinary foe (a recolor of enemies.webp cell 1): somebody's grandmother, grown thin.
//   barrow_reeve     optional boss, the Wethers' Barrow (cell 5 recolor). ai 'phased': a telegraphed hook, a shade at 50%, Haste at 25%.
//   millstone_golem  optional boss, the Weir Culvert (cell 4 recolor). ai 'phased': a telegraphed charge, a scarab at 50%, Haste at 25%.
//
// Rewards are the RAW numbers; the encounters in x1/encounters.js carry expMul = EXPANSION_FOE_EXP_MUL (expcurve.js) and the
// engine scales them (rules.js makeEnemyUnit), so a bestiary or a sim reading ENEMIES[id].exp sees the raw figure.
// Two new skills only (the brief's cap): Chilling Touch and Stone Slam. Everything else is reused:
//   Reeve's crook sweep = Strike (e_strike); his hook = Shield Bash (pushes a member back in the line); his telegraph =
//   Burrowing Charge ("{name} digs in, eyes fixed on {target}.", the Briar Alpha's, interrupted by Lunge, Defend or a Break).
//   The Golem's grinding turn (the plan's DEF debuff) is folded into Stone Slam; its shove is Shield Bash; its telegraph is
//   Burrowing Charge (the plan's own "Millstone Roll" text needs a third skill and is left to a later pass).

import { enemy, ENEMIES } from '../enemies.js';
import { SKILLS } from '../skills.js';

/** Skills in skills.js shape (the pack adds them to SKILLS; `def()` there fills the same defaults). */
export const X1_SKILLS = {
  chilling_touch: { id: 'chilling_touch', kind: 'enemy', name: 'Chilling Touch', target: 'enemy', formula: 'mag', power: 95, types: ['ice'],
    effects: [{ status: 'chill', chance: 0.2 }], help: 'A cold hand on the neck. May Chill.', fx: 'ice' },
  stone_slam: { id: 'stone_slam', kind: 'enemy', name: 'Stone Slam', target: 'enemy', formula: 'phys', power: 120,
    effects: [{ statMod: { def: -0.2 }, turns: 3 }], help: 'A grindstone fall. DEF -20% for 3 turns.', fx: 'slam' },
};

const SKILL_DEFAULTS = { effects: [], hits: 1, pierce: 0, rank: 100, mp: 0, types: [], power: 0, formula: 'none' };

// The three rows. Stats are first-pass numbers tuned by tools/sim (docs/BATTLE_X1.md has the final table).
export const X1_ENEMY_ROWS = {
  barrow_shade: {
    name: 'Barrow Shade', family: 'spirit', level: 5, size: 'small',
    hp: 175, atk: 14, def: 6, mag: 24, spr: 14, spd: 14, luk: 6,
    shields: 2, weak: ['fire', 'light'], resist: ['ice'], evade: 0.1,
    exp: 16, gold: 22, masteryPts: 3,
    moves: [{ skill: 'chilling_touch', weight: 60 }, { skill: 'hush', weight: 25, target: 'healer' }, { skill: 'e_strike', weight: 15 }],
    drops: [{ item: 'echo_herb', chance: 0.1 }, { item: 'eye_drops', chance: 0.06 }], lootZone: 'x1_barrow',
    flavor: 'Somebody\'s grandmother, grown thin. She is not angry. She is lost.',
  },
  barrow_reeve: {
    name: 'The Barrow Reeve', family: 'spirit', level: 6, size: 'large', boss: true, ai: 'phased',
    hp: 430, atk: 38, def: 13, mag: 14, spr: 12, spd: 12, luk: 7,
    shields: 3, weak: ['bow', 'light'], statusImmune: ['silence', 'poison', 'blind'],
    exp: 60, gold: 110, masteryPts: 12,
    moves: [{ skill: 'e_strike', weight: 55 }, { skill: 'shield_bash', weight: 45 }],
    charge: { skill: 'burrow_charge', first: 2, cooldown: 3 },
    phases: [
      { id: 'the_count', name: 'The Count', at: 1.0, weak: ['bow', 'light'], resist: [], shields: 3,
        text: 'The Reeve rises from the stones with his crook. He is counting the flock.' },
      { id: 'muster', name: 'Muster', at: 0.5, weak: ['bow', 'light'], resist: [], shields: 3, summon: 'barrow_shade',
        text: "'Where is the thirteenth?' A shade rises to be counted." },
      { id: 'short_by_one', name: 'Short by One', at: 0.25, weak: ['bow', 'light'], resist: [], shields: 4, haste: true,
        text: 'He counts faster now. The number never comes out right.' },
    ],
    drops: [], lootZone: 'x1_barrow', uniqueDrop: 'reeves_crook',
    flavor: 'He counts the flock every night, and every night he comes up one short.',
  },
  millstone_golem: {
    name: 'The Millstone Golem', family: 'construct', level: 7, size: 'large', boss: true, ai: 'phased',
    hp: 545, atk: 44, def: 22, mag: 8, spr: 10, spd: 8, luk: 5,
    shields: 4, weak: ['thunder', 'axe'], resist: ['sword', 'bow'], statusImmune: ['poison', 'stun', 'blind'],
    exp: 80, gold: 150, masteryPts: 14,
    moves: [{ skill: 'stone_slam', weight: 65 }, { skill: 'shield_bash', weight: 35 }],
    charge: { skill: 'burrow_charge', first: 2, cooldown: 3 },
    phases: [
      { id: 'turning_stone', name: 'Turning Stone', at: 1.0, weak: ['thunder', 'axe'], resist: ['sword', 'bow'], shields: 4,
        text: 'The old grindstone stands up on stone legs. Flour sifts from its cracks.' },
      { id: 'weevils_in_the_grain', name: 'Weevils in the Grain', at: 0.5, weak: ['thunder', 'axe'], resist: ['sword', 'bow'], shields: 4,
        summon: 'moss_scarab', text: 'The grain spills open. Something that lived in it crawls out, hungry.' },
      { id: 'runaway_wheel', name: 'Runaway Wheel', at: 0.25, weak: ['thunder', 'axe'], resist: ['sword', 'bow'], shields: 5, haste: true,
        text: 'The wheel runs away from its own axle, faster and faster.' },
    ],
    drops: [], lootZone: 'x1_culvert', uniqueDrop: 'millwright_apron',
    flavor: 'A grindstone given legs. It was told to keep turning, and nobody told it when to stop.',
  },
};

let done = false;
/** Add the skills and the three foes. Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, s] of Object.entries(X1_SKILLS)) if (!SKILLS[id]) SKILLS[id] = { ...SKILL_DEFAULTS, ...s };
  for (const [id, row] of Object.entries(X1_ENEMY_ROWS)) {
    if (ENEMIES[id]) continue;
    // Art: new frames in the x1 atlases (X1-sprites); XP-packs' atlas lookup finds a frame in any loaded atlas.
    enemy(id, { sprite: { atlas: 'x1_enemies_battle', field: 'x1_enemies_field', frame: id }, ...row });
  }
  done = true;
}
export default register;
