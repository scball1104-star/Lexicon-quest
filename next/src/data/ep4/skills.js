// Episode 4 ("The Sunken Keep") skills (E4-battle; docs/EPISODE4_PLAN.md 6.2 to 6.5). Pure data in skills.js shape; the pack's
// register() adds them to SKILLS (never overwriting an id) and Answer to CHARACTER_SKILLS.hero. Idempotent.
//
// Decrees ride Episode 3's Heat counter (rules.js seam 6): `stamp` is Stoke under a new name (+1 Seal, sfx seal_stamp), each
// foe's decree is its Heat `flare` (announced one turn early, `telegraphSfx: 'decree_unroll'` for the scene), and fire, Lamp Oil,
// a Break or the hero's Answer void it (`quench: 'fire'`, word 'Voided!', sfx decree_void on the foe's `heat`).
//
// Answer (the hero): a small light hit that voids the target's Seals and pending decree or Strike from the Roll; when something
// was pending the target is Broken, and until the hero's next turn the hero cannot be made Nameless. The rules side lives in
// src/data/ep4/ai.js (answerHook, run from each Episode 4 script's `reflect` hook, which rules.js strike() calls with the hit's
// part, id 'answer', before the damage). Outside Episode 4 foes it is a plain light hit.

import { SKILLS, CHARACTER_SKILLS } from '../skills.js';

const DEFAULTS = { effects: [], hits: 1, pierce: 0, rank: 100, mp: 0, types: [], power: 0, formula: 'none' };
const foe = (o) => ({ ...DEFAULTS, kind: 'enemy', ...o });

export const EP4_SKILLS = {
  // ------------------------------------------------------------------ the hero
  answer: { ...DEFAULTS, id: 'answer', name: 'Answer', kind: 'tech', user: 'hero', mp: 10,
    // learned in witness_book (hero_signed); the plan's fallback level, for a save that ever lacks flags (knownSkills reads the flag)
    learn: { flag: 'hero_signed' }, fallbackLevel: 19,
    target: 'enemy', formula: 'mag', power: 60, types: ['light'], answer: true,
    help: 'Answer to your name. Voids a decree.', fx: 'light', sfx: 'decree_void' },

  // ------------------------------------------------------------------ the Decree verb (Stoke renamed)
  stamp: foe({ id: 'stamp', name: 'Stamp', target: 'self', rank: 80, effects: [{ stokeSelf: 1 }],
    help: 'Another seal. Fire or a Break voids it.', fx: 'buff', sfx: 'seal_stamp' }),

  // ------------------------------------------------------------------ the Flood Road and the Keep
  // Floodhound
  undertow: foe({ id: 'undertow', name: 'Undertow', target: 'enemy', formula: 'phys', power: 95,
    effects: [{ status: 'chill', chance: 0.2 }], help: 'Drags under. May Chill.', fx: 'lash' }),
  // Lockjaw Crab
  crab_claw: foe({ id: 'crab_claw', name: 'Claw', target: 'enemy', formula: 'phys', power: 100, help: 'A rusted claw.', fx: 'hit' }),
  clamp: foe({ id: 'clamp', name: 'Clamp', target: 'enemy', formula: 'phys', power: 85,
    effects: [{ status: 'stun', chance: 0.15 }], help: 'It clamps on. May Stun.', fx: 'bite' }),
  shell_up: foe({ id: 'shell_up', name: 'Shell Up', target: 'self', rank: 80, effects: [{ status: 'protect', turns: 3 }],
    help: 'Barnacles close up.', fx: 'buff' }),
  // Ink Bloom (Decree: Runoff)
  blot: foe({ id: 'blot', name: 'Blot', target: 'enemy', formula: 'mag', power: 85, types: ['ink'],
    effects: [{ status: 'blind', chance: 0.25 }], help: 'A blot of ink. May Blind.', fx: 'ink_spit' }),
  runoff: foe({ id: 'runoff', name: 'Runoff', target: 'enemies', formula: 'mag', power: 110, types: ['ink'], decree: true,
    telegraph: '{name} reads out a decree. The ink begins to run...', telegraphSfx: 'decree_unroll',
    help: 'The decree runs over the party.', fx: 'ink_wave' }),
  // Drowned Watch
  halberd: foe({ id: 'halberd', name: 'Halberd', target: 'enemy', formula: 'phys', power: 105, help: 'A waterlogged halberd.', fx: 'slash' }),
  watch_cover: foe({ id: 'watch_cover', name: 'Cover', target: 'none', rank: 80, effects: [{ coverAlly: true }],
    help: 'Stands before the weakest ally.', fx: 'guard' }),
  shield_wall: foe({ id: 'shield_wall', name: 'Shield Wall', target: 'self', rank: 80, effects: [{ status: 'protect', turns: 3 }],
    help: 'A drowned shield goes up.', fx: 'buff' }),
  // Gutter Phantom
  murk: foe({ id: 'murk', name: 'Murk', target: 'enemies', formula: 'mag', power: 45, types: ['ink'],
    effects: [{ status: 'blind', chance: 0.15 }], help: 'Gutter murk. May Blind.', fx: 'ink_wave' }),
  drag_under: foe({ id: 'drag_under', name: 'Drag Under', target: 'enemy', formula: 'mag', power: 70,
    effects: [{ status: 'silence', chance: 0.25 }], help: 'A cold hand. May Silence.', fx: 'hush' }),
  cold_touch: foe({ id: 'cold_touch', name: 'Cold Touch', target: 'enemy', formula: 'mag', power: 100, types: ['ice'],
    help: 'A touch of canal water.', fx: 'drain' }),
  // Blank Decree (Decree: Edict)
  edict: foe({ id: 'edict', name: 'Edict', target: 'enemy', formula: 'mag', power: 220, types: ['ink'], decree: true,
    effects: [{ status: 'silence', chance: 0.3 }],
    telegraph: '{name} reads out an edict against {target}...', telegraphSfx: 'decree_unroll',
    help: 'An edict with a name on it.', fx: 'ink_lance' }),
  // Waterlogged Sentinel (charge: Breach)
  sentinel_slam: foe({ id: 'sentinel_slam', name: 'Slam', target: 'enemy', formula: 'phys', power: 100,
    help: 'Swollen stone comes down.', fx: 'slam' }),
  floodfist: foe({ id: 'floodfist', name: 'Floodfist', target: 'enemy', formula: 'phys', power: 120,
    effects: [{ status: 'chill', chance: 0.2 }], help: 'A fist of river. May Chill.', fx: 'bash' }),
  breach: foe({ id: 'breach', name: 'Breach', target: 'enemies', formula: 'phys', power: 150,
    telegraph: '{name} draws back. Water pours from its cracks...', help: 'The wall gives way.', fx: 'quake' }),

  // ------------------------------------------------------------------ the Inkbound Barrister (ai 'barrister') and its witness
  rebuttal: foe({ id: 'rebuttal', name: 'Rebuttal', target: 'enemy', formula: 'phys', power: 100,
    help: 'A sleeve full of paper.', fx: 'slash' }),
  cross_examine: foe({ id: 'cross_examine', name: 'Cross-Examine', target: 'enemy', formula: 'mag', power: 95, types: ['ink'],
    effects: [{ status: 'blind', chance: 0.2 }], help: 'Ink in the eyes. May Blind.', fx: 'ink_lance' }),
  objection: foe({ id: 'objection', name: 'Objection', target: 'enemies', formula: 'mag', power: 200, types: ['ink'], decree: true,
    effects: [{ status: 'silence', chance: 0.4 }],
    telegraph: "{name} rises. 'Objection!'...", telegraphSfx: 'decree_unroll',
    help: 'The whole case at once. May Silence.', fx: 'ink_wave_big' }),
  counsel_stamp: foe({ id: 'counsel_stamp', name: 'Stamp the Brief', target: 'boss', rank: 80, effects: [{ stoke: 1 }],
    help: 'Stamps the Barrister. Fell it first.', fx: 'buff', sfx: 'seal_stamp' }),

  // ------------------------------------------------------------------ the Paper Regent (ai 'paper_regent') and the Forged Writs
  trident_sweep: foe({ id: 'trident_sweep', name: 'Trident Sweep', target: 'enemies', formula: 'phys', power: 100,
    help: 'The trident sweeps the dais.', fx: 'slash' }),
  wet_seal: foe({ id: 'wet_seal', name: 'Wet Seal', target: 'enemy', formula: 'mag', power: 120, types: ['ink'],
    effects: [{ status: 'chill', chance: 0.3 }], help: 'A seal of cold wax. May Chill.', fx: 'ink_lance' }),
  flood_decree: foe({ id: 'flood_decree', name: 'Flood Decree', target: 'enemies', formula: 'mag', power: 220, types: ['ink'], decree: true,
    effects: [{ status: 'chill', chance: 0.3 }],
    telegraph: '{name} unrolls a decree. The water rises around it...', telegraphSfx: 'decree_unroll',
    help: 'The water rises. May Chill.', fx: 'ink_wave_big' }),
  // A charge, not a Decree: fire does not void it; Answer, a Break or Defend (half damage, Nameless still lands) do
  strike_roll: foe({ id: 'strike_roll', name: 'Strike from the Roll', target: 'enemy', formula: 'mag', power: 300, answerable: true,
    effects: [{ nameStrike: true }],
    telegraph: "{name} unrolls a decree with {target}'s name on it...", telegraphSfx: 'decree_unroll',
    help: 'A name struck. Answer it, or Break it.', fx: 'devour' }),
  mend_seal: foe({ id: 'mend_seal', name: 'Mend the Seal', target: 'boss', rank: 90, effects: [{ bossHeal: 0.06 }],
    help: 'Mends the Regent. Fell the writ first.', fx: 'recite' }),
  seal_hush: foe({ id: 'seal_hush', name: 'Hush', target: 'enemy', formula: 'mag', power: 40, types: ['ink'],
    effects: [{ status: 'silence', chance: 0.35 }, { bossHeal: 0.06 }], help: 'A hush, and a mend. May Silence.', fx: 'hush' }),
  stamp_regent: foe({ id: 'stamp_regent', name: 'Stamp the Regent', target: 'boss', rank: 80, effects: [{ stoke: 1 }],
    help: 'Stamps the Regent. Fell it first.', fx: 'buff', sfx: 'seal_stamp' }),
};

let done = false;
/** Add the skills (never overwriting an id) and Answer to the hero's list. Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, s] of Object.entries(EP4_SKILLS)) if (!SKILLS[id]) SKILLS[id] = s;
  if (CHARACTER_SKILLS.hero && !CHARACTER_SKILLS.hero.includes('answer')) CHARACTER_SKILLS.hero.push('answer');
  done = true;
}
export default register;
