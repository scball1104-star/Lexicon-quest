// Episode 5 ("The Last Prophecy") skills (E5-battle; docs/EPISODE5_PLAN.md 6.2 to 6.5). Pure data in skills.js shape; the pack's
// register() adds them to SKILLS (never overwriting an id) and Turn the Sky to CHARACTER_SKILLS.mira. Idempotent.
//
// Turn the Sky (Mira, plan 6.3): turns the battle's sky now and resets the Turn to 6 actions; a foretelling pinned to the Turn
// (the Oracle's Last Prophecy) fails and its owner is Broken. Its rules live in src/data/ep5/sky.js. rules.js has no hook for a
// party skill's own effect, so the skill carries `{ keep: 'sky', sky: 'turn' }`: rules.js applyEffect() hands any effect with
// `keep` to ai.js special() for the user's script (a party member's is `basic`), and sky.js register() gives `basic` a
// `special` that answers only `e.sky` and passes everything else on (it had none, so nothing else changes). docs/BATTLE.md 13.7
// names the one-line core hook that would replace the bridge.
//
// The Last Prophecy is not a charge and not a Decree: it is pinned to the Turn marker (sky.js), resolved when the sky turns
// naturally, and `foretold: true` names it for the scene's SIGNATURE_TECHS row ({ unit: 'mira', flag: 'foretold', skill:
// 'turn_sky' }, E5-scene-ui). It is never `answerable`: the hero's Answer does nothing to it (src/data/ep5/ai.js says why).

import { SKILLS, CHARACTER_SKILLS } from '../skills.js';

const DEFAULTS = { effects: [], hits: 1, pierce: 0, rank: 100, mp: 0, types: [], power: 0, formula: 'none' };
const foe = (o) => ({ ...DEFAULTS, kind: 'enemy', ...o });

export const EP5_SKILLS = {
  // ------------------------------------------------------------------ Mira
  turn_sky: { ...DEFAULTS, id: 'turn_sky', name: 'Turn the Sky', kind: 'tech', user: 'mira', mp: 12, rank: 80,
    // learned in star_reading (sky_learned); the plan's fallback level, for a save that ever lacks flags (knownSkills reads the flag)
    learn: { flag: 'sky_learned' }, fallbackLevel: 22,
    target: 'none', effects: [{ keep: 'sky', sky: 'turn' }],
    help: 'Turn the sky now. Breaks a foretelling.', fx: 'buff', sfx: 'sky_turn' },

  // ------------------------------------------------------------------ the ship, the road and the Labyrinth
  // Dune Stalker
  dune_bite: foe({ id: 'dune_bite', name: 'Bite', target: 'enemy', formula: 'phys', power: 100, help: 'Sand-dry jaws.', fx: 'bite' }),
  sandkick: foe({ id: 'sandkick', name: 'Sandkick', target: 'enemy', formula: 'phys', power: 80,
    effects: [{ status: 'blind', chance: 0.2 }], help: 'Sand in the eyes. May Blind.', fx: 'hit' }),
  // Dune Scarab
  mandible: foe({ id: 'mandible', name: 'Mandible', target: 'enemy', formula: 'phys', power: 105, help: 'Gold jaws close.', fx: 'bite' }),
  sunshell: foe({ id: 'sunshell', name: 'Sunshell', target: 'enemy', formula: 'phys', power: 90, types: ['fire'],
    help: 'A shell hot from the sun.', fx: 'bash' }),
  burrow: foe({ id: 'burrow', name: 'Burrow', target: 'self', rank: 80, effects: [{ status: 'protect', turns: 3 }],
    help: 'It digs in under the sand.', fx: 'buff' }),
  // Dust Harrier
  talon: foe({ id: 'talon', name: 'Talon', target: 'enemy', formula: 'phys', power: 105, help: 'Out of the sun.', fx: 'slash' }),
  dust_devil: foe({ id: 'dust_devil', name: 'Dust Devil', target: 'enemies', formula: 'phys', power: 70,
    effects: [{ status: 'blind', chance: 0.15 }], help: 'A whirl of sand. May Blind.', fx: 'quake' }),
  // Silt Reaver
  silt_lash: foe({ id: 'silt_lash', name: 'Silt Lash', target: 'enemy', formula: 'mag', power: 100, help: 'A rope of wet sand.', fx: 'lash' }),
  bury: foe({ id: 'bury', name: 'Bury', target: 'enemy', formula: 'mag', power: 70,
    effects: [{ status: 'silence', chance: 0.25 }], help: 'Sand in the mouth. May Silence.', fx: 'hush' }),
  silt_drain: foe({ id: 'silt_drain', name: 'Drain', target: 'enemy', formula: 'mag', power: 85, effects: [{ drain: 0.5 }],
    help: 'It drinks what it buries.', fx: 'drain' }),
  // Starsilt
  glimmer: foe({ id: 'glimmer', name: 'Glimmer', target: 'enemy', formula: 'mag', power: 80,
    effects: [{ status: 'blind', chance: 0.25 }], help: 'A cold star-flash. May Blind.', fx: 'ink_spit' }),
  starfall: foe({ id: 'starfall', name: 'Starfall', target: 'enemy', formula: 'mag', power: 160, types: ['ice'],
    help: 'A star falls on one.', fx: 'ink_lance' }),
  // Horizon Shade (charge: Eclipse)
  cold_horizon: foe({ id: 'cold_horizon', name: 'Cold Horizon', target: 'enemies', formula: 'mag', power: 60, types: ['ice'],
    effects: [{ status: 'chill', chance: 0.25 }], help: 'The far edge of night. May Chill.', fx: 'ink_wave' }),
  shade_mirage: foe({ id: 'shade_mirage', name: 'Mirage', target: 'self', rank: 80, effects: [{ status: 'protect', turns: 3 }],
    help: 'It stands a little farther off.', fx: 'buff' }),
  eclipse: foe({ id: 'eclipse', name: 'Eclipse', target: 'enemies', formula: 'mag', power: 100,
    telegraph: '{name} spreads across the light. The sky goes dark...', help: 'Darkness over the party.', fx: 'ink_wave' }),
  // Tomorrow Husk (charge: Hour Crush)
  husk_slam: foe({ id: 'husk_slam', name: 'Ground Slam', target: 'enemies', formula: 'phys', power: 65, help: 'Sandstone hits the floor. All shake.', fx: 'quake' }),
  sandglass: foe({ id: 'sandglass', name: 'Sandglass', target: 'self', rank: 80, effects: [{ status: 'haste', turns: 3 }],
    help: 'It turns itself over.', fx: 'buff' }),
  hour_crush: foe({ id: 'hour_crush', name: 'Hour Crush', target: 'enemies', formula: 'phys', power: 110,
    telegraph: "{name}'s hourglass heart runs empty. It rears up...", help: 'The hour falls on the party.', fx: 'quake' }),

  // ------------------------------------------------------------------ the Mirage Knight (ai 'mirage_knight') and its Double
  mirage_slash: foe({ id: 'mirage_slash', name: 'Mirage Slash', target: 'enemy', formula: 'phys', power: 110,
    help: 'A blade from the wrong side.', fx: 'slash' }),
  glare: foe({ id: 'glare', name: 'Glare', target: 'enemies', formula: 'mag', power: 70, types: ['light'],
    effects: [{ status: 'blind', chance: 0.2 }], help: 'The mirror flashes. May Blind.', fx: 'ink_wave' }),
  horizon_cleave: foe({ id: 'horizon_cleave', name: 'Horizon Cleave', target: 'enemies', formula: 'phys', power: 400,
    telegraph: '{name} raises its blade to the horizon...', help: 'The horizon falls on the party.', fx: 'quake' }),
  // Named for the tip test and the scene (sky.js runs it on every natural Turn; it is never chosen as a move).
  mirror_turn: foe({ id: 'mirror_turn', name: 'Mirror Turn', target: 'self', rank: 80, help: 'It turns its shield to the sky.',
    fx: 'buff', sfx: 'mirror_turn' }),
  // The Double: the Knight's last attack, at half power (src/data/ep5/ai.js copies it; the key routes it to the script).
  mirror_copy: foe({ id: 'mirror_copy', name: 'Mirror Copy', target: 'enemy', effects: [{ keep: 'copy', copy: 0.5 }],
    help: 'The same blow, a moment late.', fx: 'slash' }),

  // ------------------------------------------------------------------ the Sand Oracle (ai 'oracle') and the False Futures
  stinger: foe({ id: 'stinger', name: 'Stinger', target: 'enemy', formula: 'phys', power: 140, help: 'A golden sting.', fx: 'bite' }),
  sandfall: foe({ id: 'sandfall', name: 'Sandfall', target: 'enemies', formula: 'mag', power: 100,
    effects: [{ status: 'blind', chance: 0.25 }], help: 'Sand pours from the stars. May Blind.', fx: 'ink_wave' }),
  // Pinned to the Turn (sky.js): a reading, resolved when the sky turns naturally. Taunt and Guard do not move it.
  last_prophecy: foe({ id: 'last_prophecy', name: 'The Last Prophecy', target: 'enemy', formula: 'mag', power: 280, foretold: true,
    telegraph: "The Oracle reads {target}'s star. It falls when the sky turns.", telegraphSfx: 'prophecy_read',
    help: 'A star read. Turn the sky first.', fx: 'devour', sfx: 'prophecy_read' }),
  sandstorm: foe({ id: 'sandstorm', name: 'Unbound Sandstorm', target: 'enemies', formula: 'mag', power: 180,
    effects: [{ status: 'blind', chance: 0.3 }],
    telegraph: 'The sand rises into a storm around the Oracle...', help: 'A storm of every road at once.', fx: 'ink_wave_big' }),
  // Hunger: takes Fury from the member with most and feeds the Oracle (src/data/ep5/ai.js)
  devour_road: foe({ id: 'devour_road', name: 'Devour the Road', target: 'none', rank: 90, effects: [{ keep: 'road', fury: 15, bossHeal: 0.05 }],
    help: 'It eats your Fury. Fell it first.', fx: 'devour' }),
  // Fear: half a turn back on the timeline; every 3rd turn it hushes the one who can turn the sky
  dread: foe({ id: 'dread', name: 'Dread', target: 'enemy', rank: 90, effects: [{ delay: 0.5 }],
    help: 'It holds you back. Half a turn.', fx: 'hush' }),
  hush_reader: foe({ id: 'hush_reader', name: 'Hush the Reader', target: 'enemy', formula: 'mag', power: 40,
    effects: [{ status: 'silence', chance: 0.4 }], help: 'It hushes the reader. May Silence.', fx: 'hush' }),
};

let done = false;
/** Add the skills (never overwriting an id) and Turn the Sky to Mira's list. Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, s] of Object.entries(EP5_SKILLS)) if (!SKILLS[id]) SKILLS[id] = s;
  if (CHARACTER_SKILLS.mira && !CHARACTER_SKILLS.mira.includes('turn_sky')) CHARACTER_SKILLS.mira.push('turn_sky');
  done = true;
}
export default register;
