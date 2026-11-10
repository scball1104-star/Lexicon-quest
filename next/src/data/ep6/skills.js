// Episode 6 ("The Skybound Isles") skills (E6-battle; docs/EPISODE6_PLAN.md 6.2 to 6.5). Pure data in skills.js shape; the pack's
// register() adds them to SKILLS (never overwriting an id) and Anchor to CHARACTER_SKILLS.bram. Idempotent.
//
// Anchor (Bram, plan 6.3): the whole party is Anchored through the next Gust (no one is blown back; the wind carries them on), and a
// Rewrite or Full Blast pinned to that Gust fails ("The course holds.") with its owner blown back a full turn. Its rules live in
// src/data/ep6/gale.js. rules.js has no hook for a party skill's own effect, so the skill carries `{ keep: 'gale', gale: 'anchor' }`
// (Episode 5's bridge, docs/BATTLE.md 13.8): rules.js applyEffect() hands any effect with `keep` to ai.js special() for the user's
// script (a party member's is `basic`), and gale.js register() gives `basic` a `special` that answers only `e.gale` and passes
// everything else on (to Episode 5's sky bridge, which passes everything but `e.sky` on).
// `target: 'none'`: the menu confirms it straight from the Tech list (E5-fixes A1 made menu.js do that for 'none').
//
// The Rewrite and Full Blast are not charges: they are pinned to the Gust marker (gale.js pin()), resolved when the Gust falls, and
// `rewrite: true` names them for the scene's SIGNATURE_TECHS row ({ unit: 'bram', flag: 'rewrite', skill: 'anchor_line' },
// E6-scene-ui). Neither is `answerable`: the hero's Answer and Mira's Turn the Sky do nothing to them (src/data/ep6/ai.js says why).

import { SKILLS, CHARACTER_SKILLS } from '../skills.js';

const DEFAULTS = { effects: [], hits: 1, pierce: 0, rank: 100, mp: 0, types: [], power: 0, formula: 'none' };
const foe = (o) => ({ ...DEFAULTS, kind: 'enemy', ...o });

export const EP6_SKILLS = {
  // ------------------------------------------------------------------ Bram
  anchor_line: { ...DEFAULTS, id: 'anchor_line', name: 'Anchor', kind: 'tech', user: 'bram', mp: 14, rank: 80,
    // learned in anchor_lesson (anchor_learned); the plan's fallback level, for a save that ever lacks flags (knownSkills reads the flag)
    learn: { flag: 'anchor_learned' }, fallbackLevel: 26,
    target: 'none', effects: [{ keep: 'gale', gale: 'anchor' }],
    help: 'Hold through the gust. Breaks a rewrite.', fx: 'buff', sfx: 'anchor_set' },

  // ------------------------------------------------------------------ the Airstair and the Observatory
  // Squall Wolf
  squall_bite: foe({ id: 'squall_bite', name: 'Bite', target: 'enemy', formula: 'phys', power: 105, help: 'Teeth out of the wind.', fx: 'bite' }),
  squall_howl: foe({ id: 'squall_howl', name: 'Howl', target: 'allies', rank: 80, effects: [{ statMod: { atk: 0.2 }, turns: 3 }],
    help: 'The pack howls into the wind. ATK up.', fx: 'howl' }),
  // Gale Sprite
  gale_slap: foe({ id: 'gale_slap', name: 'Slap', target: 'enemy', formula: 'mag', power: 100, help: 'A cold slap of air.', fx: 'hit' }),
  gale_whirl: foe({ id: 'gale_whirl', name: 'Whirl', target: 'enemies', formula: 'mag', power: 70, help: 'A small storm round the party.', fx: 'ink_wave' }),
  // Rigger Beetle
  rigger_mandible: foe({ id: 'rigger_mandible', name: 'Mandible', target: 'enemy', formula: 'phys', power: 105, help: 'Brass jaws close.', fx: 'bite' }),
  rigger_clamp: foe({ id: 'rigger_clamp', name: 'Clamp', target: 'self', rank: 80, effects: [{ status: 'protect', turns: 3 }],
    help: 'It clamps itself to the deck.', fx: 'buff' }),
  rigger_rivet: foe({ id: 'rigger_rivet', name: 'Rivet', target: 'self', rank: 80, effects: [{ statMod: { def: 0.3 }, turns: 3 }],
    help: 'It rivets its shell shut. DEF up.', fx: 'buff' }),
  // Signal Wraith
  signal_static: foe({ id: 'signal_static', name: 'Static', target: 'enemy', formula: 'mag', power: 150, types: ['thunder'],
    help: 'A crackle off the lamp.', fx: 'ink_lance' }),
  false_signal: foe({ id: 'false_signal', name: 'False Signal', target: 'enemy', formula: 'mag', power: 60,
    effects: [{ status: 'silence', chance: 0.25 }], help: 'The wrong light. May Silence.', fx: 'hush' }),
  signal_drain: foe({ id: 'signal_drain', name: 'Drain', target: 'enemy', formula: 'mag', power: 90, effects: [{ drain: 0.5 }],
    help: 'It drinks the light it shows.', fx: 'drain' }),
  // Storm Harrier
  harrier_talon: foe({ id: 'harrier_talon', name: 'Talon', target: 'enemy', formula: 'phys', power: 105, help: 'Out of the gust.', fx: 'slash' }),
  harrier_dive: foe({ id: 'harrier_dive', name: 'Dive', target: 'enemy', formula: 'phys', power: 160, help: 'It folds its wings and falls.', fx: 'slash' }),
  // Lightning Manta (charge: Thunder Glide)
  manta_shock: foe({ id: 'manta_shock', name: 'Shock', target: 'enemy', formula: 'mag', power: 110, types: ['thunder'],
    effects: [{ status: 'stun', chance: 0.15 }], help: 'A spark off a wingtip. May Stun.', fx: 'ink_lance' }),
  thunder_glide: foe({ id: 'thunder_glide', name: 'Thunder Glide', target: 'enemies', formula: 'mag', power: 130, types: ['thunder'],
    telegraph: '{name} spreads its wings. Sparks run along them...', help: 'A sheet of lightning over the party.', fx: 'ink_wave' }),
  // Storm-Marked Page (charge: Overwrite)
  margin_cut: foe({ id: 'margin_cut', name: 'Margin Cut', target: 'enemy', formula: 'phys', power: 110, help: 'A paper edge.', fx: 'slash' }),
  smudge: foe({ id: 'smudge', name: 'Smudge', target: 'enemies', formula: 'mag', power: 95, effects: [{ status: 'blind', chance: 0.15 }],
    help: 'Storm ink over the party. May Blind.', fx: 'ink_wave' }),
  overwrite: foe({ id: 'overwrite', name: 'Overwrite', target: 'enemy', formula: 'mag', power: 200,
    telegraph: '{name} writes {target} over in storm ink...', help: 'One name written over.', fx: 'ink_lance' }),

  // ------------------------------------------------------------------ the Gale Engine (ai 'gale_engine')
  engine_fan: foe({ id: 'engine_fan', name: 'Fan Blade', target: 'enemy', formula: 'phys', power: 110, help: 'A brass blade comes round.', fx: 'slash' }),
  engine_piston: foe({ id: 'engine_piston', name: 'Piston', target: 'enemies', formula: 'phys', power: 70, help: 'The floor jumps.', fx: 'quake' }),
  // Named for the gauge and the tip test (the Engine runs them from the start; never chosen as a move).
  bellows: foe({ id: 'bellows', name: 'Bellows', target: 'none', rank: 80, help: 'The wind comes every 3 actions.', fx: 'buff' }),
  // Pinned to the Gust (gale.js): resolved when the wind gusts. Anchor makes it fail; a Break cancels it; Defend halves it.
  full_blast: foe({ id: 'full_blast', name: 'Full Blast', target: 'enemies', formula: 'phys', power: 180, rewrite: true,
    telegraph: 'The Engine winds the bellows... It blasts when the wind gusts.', telegraphSfx: 'rewrite_read',
    help: 'Pinned to the gust. Bram can anchor.', fx: 'quake', sfx: 'gale_gust' }),

  // ------------------------------------------------------------------ the Storm Scribe (ai 'scribe'), the Beacon and the Compass
  quillstorm: foe({ id: 'quillstorm', name: 'Quillstorm', target: 'enemies', formula: 'phys', power: 130, help: 'Every quill at once.', fx: 'pages' }),
  ink_squall: foe({ id: 'ink_squall', name: 'Ink Squall', target: 'enemy', formula: 'mag', power: 150, effects: [{ status: 'blind', chance: 0.2 }],
    help: 'A squall of storm ink. May Blind.', fx: 'ink_lance' }),
  // Pinned to the Gust (gale.js): when it falls, every member not Anchored goes back a full turn (Braced half) and the Scribe acts.
  rewrite_course: foe({ id: 'rewrite_course', name: 'Rewrite the Course', target: 'none', rank: 80, rewrite: true,
    telegraph: 'The Scribe rewrites the course. When the wind gusts, you go last.', telegraphSfx: 'rewrite_read',
    help: 'Pinned to the gust. Bram can anchor.', fx: 'devour', sfx: 'rewrite_read' }),
  thunderhead: foe({ id: 'thunderhead', name: 'Thunderhead', target: 'enemies', formula: 'mag', power: 170, types: ['thunder'],
    effects: [{ status: 'stun', chance: 0.2 }],
    telegraph: "Lightning gathers in the Scribe's wings...", help: 'The storm breaks. Defend or Break.', fx: 'ink_wave_big' }),
  // The False Beacon: it Covers the Scribe (rules.js `cover`: single-target hits aimed at the Scribe land on the Beacon)
  false_light: foe({ id: 'false_light', name: 'False Light', target: 'ally', rank: 90, effects: [{ cover: true }],
    help: 'It stands in front of the Scribe.', fx: 'buff' }),
  // The Broken Compass: Spin (the soonest member half a turn back) every turn; Misdirect on Bram every 3rd turn
  compass_spin: foe({ id: 'compass_spin', name: 'Spin', target: 'enemy', rank: 90, effects: [{ delay: 0.5 }],
    help: 'It turns you round. Half a turn back.', fx: 'hush' }),
  misdirect: foe({ id: 'misdirect', name: 'Misdirect', target: 'enemy', formula: 'mag', power: 40,
    effects: [{ status: 'silence', chance: 0.4 }], help: 'It turns on the one who holds. Silence.', fx: 'hush' }),
};

let done = false;
/** Add the skills (never overwriting an id) and Anchor to Bram's list. Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, s] of Object.entries(EP6_SKILLS)) if (!SKILLS[id]) SKILLS[id] = s;
  if (CHARACTER_SKILLS.bram && !CHARACTER_SKILLS.bram.includes('anchor_line')) CHARACTER_SKILLS.bram.push('anchor_line');
  done = true;
}
export default register;
