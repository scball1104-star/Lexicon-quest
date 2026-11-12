// Episode 7 ("The Vanishing World") skills (E7-battle; docs/EPISODE7_PLAN.md 6.2 to 6.5). Pure data in skills.js shape; the pack's
// register() adds them to SKILLS (never overwriting an id) and Call to CHARACTER_SKILLS.hero. Idempotent. Every id was grepped
// against src/ and assets/ on 2026-11-12 (`mend` is Mira's heal, so the Lost Letter's is `letter_mend`; `margin_cut` is Episode 6's,
// so the Rime-Written Page cuts with `rime_margin`).
//
// Call (the hero, plan 6.3): one party member other than the hero, standing or Stilled, sheds all Rime, is Warm until their next
// turn and comes round sooner (a quarter turn, clamped); a pinned Farewell or Borrowed Light on them breaks and its owner is thrown
// back a full turn; a Stilled ally returns at once. Its rules live in src/data/ep7/rime.js. rules.js has no hook for a party skill's
// own effect, so the skill carries `{ keep: 'rime', rime: 'call' }` (Episode 5's bridge, docs/BATTLE.md 13.8): rules.js
// applyEffect() hands any effect with `keep` to ai.js special() for the user's script (the hero's is `basic`), WITH the targets the
// skill resolved, and rime.js register() gives `basic` a `special` that answers only `e.rime` and passes everything else on.
// `target: 'ally'` with `excludeSelf` (never the hero) and `canTargetKept` (a Stilled ally is reachable: Stilled is built on the
// Kept seal, rime.js says why). The menu path: an ally-target signature skill whose target may be off the timeline (E7-scene-ui).
//
// A cold move carries `{ keep: 'rime', rime: n }`: applyEffect() hands it to the FOE's script special() with the members the move
// actually hit (rules.js effTargets: misses are left out), and every Episode 7 script answers it through rime.js addRime().
// Farewell and Borrowed Light are not charges: they are pinned on one member and land on their owner's next turn (rime.js pin()).
// `farewell: true` names them for the scene's SIGNATURE_TECHS row ({ unit: 'hero', flag: 'farewell', skill: 'call_name' },
// E7-scene-ui). Neither is `answerable`: the hero's Answer on their owner is a plain light hit ("A farewell is not a decree.").

import { SKILLS, CHARACTER_SKILLS } from '../skills.js';

const DEFAULTS = { effects: [], hits: 1, pierce: 0, rank: 100, mp: 0, types: [], power: 0, formula: 'none' };
const foe = (o) => ({ ...DEFAULTS, kind: 'enemy', ...o });
const rime = (n) => ({ keep: 'rime', rime: n });

export const CALL = 'call_name';

export const EP7_SKILLS = {
  // ------------------------------------------------------------------ the hero
  call_name: { ...DEFAULTS, id: CALL, name: 'Call', kind: 'tech', user: 'hero', mp: 12, rank: 80,
    // learned in `whiteout` (call_learned); the plan's fallback level, for a save that ever lacks flags (knownSkills reads the flag)
    learn: { flag: 'call_learned' }, fallbackLevel: 29,
    target: 'ally', excludeSelf: true, canTargetKept: true, effects: [rime('call')],
    help: "Say an ally's name. Breaks a farewell.", fx: 'buff', sfx: 'call_cast' },

  // ------------------------------------------------------------------ the White Road and the Vault (Rime in brackets: rime(n))
  // Rime Wolf
  rime_bite: foe({ id: 'rime_bite', name: 'Bite', target: 'enemy', formula: 'phys', power: 105, help: 'Teeth white with frost.', fx: 'bite' }),
  frost_fang: foe({ id: 'frost_fang', name: 'Frost Fang', target: 'enemy', formula: 'phys', power: 120, types: ['ice'], effects: [rime(1)],
    help: 'A cold bite. Frosts a name.', fx: 'bite', sfx: 'rime_bite' }),
  // Snow Wisp
  wisp_slap: foe({ id: 'wisp_slap', name: 'Slap', target: 'enemy', formula: 'mag', power: 100, help: 'A slap of snow.', fx: 'hit' }),
  flurry: foe({ id: 'flurry', name: 'Flurry', target: 'enemies', formula: 'mag', power: 70, types: ['ice'], effects: [rime(1)],
    help: 'Snow round the party. Frosts names.', fx: 'ink_wave', sfx: 'rime_bite' }),
  // Hush Owl (no cold move: its silence is the cold it brings)
  owl_talon: foe({ id: 'owl_talon', name: 'Talon', target: 'enemy', formula: 'phys', power: 105, help: 'Out of the white.', fx: 'slash' }),
  owl_hush: foe({ id: 'owl_hush', name: 'Hush', target: 'enemy', formula: 'mag', power: 60, effects: [{ status: 'silence', chance: 0.25 }],
    help: 'A soundless wingbeat. May Silence.', fx: 'hush' }),
  owl_dive: foe({ id: 'owl_dive', name: 'Dive', target: 'enemy', formula: 'phys', power: 160, help: 'It drops without a sound.', fx: 'slash' }),
  // Crystal Crawler
  crawler_mandible: foe({ id: 'crawler_mandible', name: 'Mandible', target: 'enemy', formula: 'phys', power: 105, help: 'Glass jaws close.', fx: 'bite' }),
  crawler_glaze: foe({ id: 'crawler_glaze', name: 'Glaze', target: 'self', rank: 80, effects: [{ status: 'protect', turns: 3 }],
    help: 'It glazes its shell with ice.', fx: 'buff' }),
  shard_spray: foe({ id: 'shard_spray', name: 'Shard Spray', target: 'enemies', formula: 'phys', power: 60, types: ['ice'], effects: [rime(1)],
    help: 'Ice shards over the party. Frosts names.', fx: 'quake', sfx: 'rime_bite' }),
  // Frostbound Revenant
  chill_touch: foe({ id: 'chill_touch', name: 'Chill Touch', target: 'enemy', formula: 'mag', power: 150, types: ['ice'], effects: [rime(1)],
    help: 'A cold hand on a name.', fx: 'ink_lance', sfx: 'rime_bite' }),
  grave_cold: foe({ id: 'grave_cold', name: 'Grave Cold', target: 'enemy', formula: 'mag', power: 60, effects: [{ status: 'blind', chance: 0.2 }],
    help: 'Frost over the eyes. May Blind.', fx: 'hush' }),
  revenant_drain: foe({ id: 'revenant_drain', name: 'Drain', target: 'enemy', formula: 'mag', power: 90, effects: [{ drain: 0.5 }],
    help: 'It drinks the warmth it touches.', fx: 'drain' }),
  // Hollow Ice Knight (charge: Glacier Cleave)
  ice_blade: foe({ id: 'ice_blade', name: 'Ice Blade', target: 'enemy', formula: 'phys', power: 110, help: 'A blade of clear ice.', fx: 'slash' }),
  glacier_cleave: foe({ id: 'glacier_cleave', name: 'Glacier Cleave', target: 'enemy', formula: 'phys', power: 200, types: ['ice'], effects: [rime(2)],
    telegraph: '{name} lifts its blade. Frost runs down it toward {target}...', help: 'One great cold blow. Defend.', fx: 'slash', sfx: 'rime_bite' }),
  // Rime-Written Page (charge: Final Line)
  rime_margin: foe({ id: 'rime_margin', name: 'Margin Cut', target: 'enemy', formula: 'phys', power: 110, help: 'A frozen paper edge.', fx: 'slash' }),
  page_cold_ink: foe({ id: 'page_cold_ink', name: 'Cold Ink', target: 'enemies', formula: 'mag', power: 130, types: ['ice'], effects: [rime(1)],
    help: 'Blue ink over the party. Frosts names.', fx: 'ink_wave', sfx: 'rime_bite' }),
  final_line: foe({ id: 'final_line', name: 'Final Line', target: 'enemy', formula: 'mag', power: 200,
    telegraph: '{name} writes the last line under {target}\'s name...', help: 'One name written out.', fx: 'ink_lance' }),

  // ------------------------------------------------------------------ the Pale Lantern (ai 'pale_lantern')
  pale_flame: foe({ id: 'pale_flame', name: 'Pale Flame', target: 'enemy', formula: 'mag', power: 100, types: ['ice'], effects: [rime(1)],
    help: 'A cold blue flame. Frosts a name.', fx: 'ink_lance', sfx: 'rime_bite' }),
  lamplight_chill: foe({ id: 'lamplight_chill', name: 'Lamplight Chill', target: 'enemies', formula: 'mag', power: 160, types: ['ice'], effects: [rime(1)],
    help: 'The lamp turns cold. Frosts names.', fx: 'ink_wave', sfx: 'rime_bite' }),
  // Pinned on one member (rime.js pin()): lands on the Lantern's next turn. Call breaks it; a Break cancels it.
  borrowed_light: foe({ id: 'borrowed_light', name: 'Borrowed Light', target: 'none', rank: 80, farewell: true,
    telegraph: 'The Lantern borrows {target}\'s light.', telegraphSfx: 'farewell_read',
    help: 'Pinned on one of us. Call them back.', fx: 'devour', sfx: 'rime_freeze' }),

  // ------------------------------------------------------------------ the White Phantom (ai 'white_phantom'), the Gate and the Letter
  whiteout_breath: foe({ id: 'whiteout_breath', name: 'Whiteout Breath', target: 'enemies', formula: 'mag', power: 120, types: ['ice'], effects: [rime(1)],
    help: 'A white breath over the party.', fx: 'ink_wave', sfx: 'rime_bite' }),
  icicle_lance: foe({ id: 'icicle_lance', name: 'Icicle Lance', target: 'enemy', formula: 'phys', power: 160, types: ['ice'], effects: [rime(1)],
    help: 'A spear of ice. Frosts a name.', fx: 'slash', sfx: 'rime_bite' }),
  // Pinned on one member, never the hero (rime.js pin()): lands on the Phantom's next turn and Stills them.
  farewell: foe({ id: 'farewell', name: 'Farewell', target: 'none', rank: 80, farewell: true,
    telegraph: 'The Phantom turns to {target}. It is saying goodbye.', telegraphSfx: 'farewell_read',
    help: 'Pinned on one of us. Call them.', fx: 'devour', sfx: 'farewell_read' }),
  // A charge every 4th Phantom turn in Thawlight: Defend halves it (and sheds as always); Break cancels; Call does not stop it.
  stillheart_blizzard: foe({ id: 'stillheart_blizzard', name: 'Stillheart Blizzard', target: 'enemies', formula: 'mag', power: 210, types: ['ice'],
    effects: [rime(2)], telegraph: "The cold gathers in the Phantom's cloak...", help: 'The whole cold at once. Defend or Break.',
    fx: 'ink_wave_big', sfx: 'rime_freeze' }),
  // The Closed Gate: Shut on the hero every 3rd turn (it closes the mouth that can call), Bar between
  gate_bar: foe({ id: 'gate_bar', name: 'Bar', target: 'enemy', formula: 'phys', power: 90, help: 'An iron bar swings shut.', fx: 'slash' }),
  shut: foe({ id: 'shut', name: 'Shut', target: 'enemy', formula: 'mag', power: 40, effects: [{ status: 'silence', chance: 0.5 }],
    help: 'The gate shuts. It stops a mouth.', fx: 'hush' }),
  // The Lost Letter: Cold Ink every turn, and it Mends the Phantom 4% after (never above the 68% lock)
  cold_ink: foe({ id: 'cold_ink', name: 'Cold Ink', target: 'enemy', formula: 'mag', power: 110, types: ['ice'], effects: [rime(1)],
    help: 'A line of cold ink. Frosts a name.', fx: 'ink_lance', sfx: 'rime_bite' }),
  letter_mend: foe({ id: 'letter_mend', name: 'Mend', target: 'none', rank: 80, help: 'The letter mends the Phantom.', fx: 'buff' }),
};

let done = false;
/** Add the skills (never overwriting an id) and Call to the hero's list. Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, s] of Object.entries(EP7_SKILLS)) if (!SKILLS[id]) SKILLS[id] = s;
  if (CHARACTER_SKILLS.hero && !CHARACTER_SKILLS.hero.includes(CALL)) CHARACTER_SKILLS.hero.push(CALL);
  done = true;
}
export default register;
