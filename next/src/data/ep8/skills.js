// Episode 8 ("The Last Word") skills (E8-battle; docs/EPISODE8_PLAN.md 6.2 to 6.5). Pure data in skills.js shape; the pack's
// register() adds them to SKILLS (never overwriting an id) and Read Aloud to CHARACTER_SKILLS.mira. Idempotent. Every id was grepped
// against src/, assets/ and tools/sim/ on 2026-11-15: `gnaw` is Episode 1's Bookmite move, so the Bookworm's is `worm_gnaw`; `fetch`
// is a JS global, so the Hound's is `hound_fetch`; the Hound's Bite is `hound_bite`, the Imp's Smear `imp_smear`, the Bookworm's Curl
// `worm_curl` (plain words kept off the shared list). `scribble` and `overdue` appear only in text (no id); kept.
//
// Read Aloud (Mira, plan 6.3): any party member, Mira herself included, standing or Unwritten: every rubbed command returns,
// Unwritten ends, the member acts sooner; a pinned Unwrite on them breaks and its owner is thrown back a full turn. Its rules live in
// src/data/ep8/erasure.js; the skill reaches them through `{ keep: 'erasure', erasure: 'read' }` (Episode 5's bridge, BATTLE 13.8).
// `target: 'ally'` with no `excludeSelf`: rules.js targetInfo lists the caster too (the first signature skill that may target its own
// caster). Never rubbed out: a rubbed Magic row stays open with only Read Aloud lit (erasure.js erasureCommands).
//
// An erasing move ([E]) carries `{ keep: 'erasure', erasure: 'rub' }`: applyEffect() hands it to the FOE's script special() with the
// members it actually hit (misses are left out), and every Episode 8 script answers it through erasure.js rub(). Unwrite is not a
// charge: it is pinned on one member (erasure.js pin()) and lands on its owner's next turn. The Last Silence is a charge (the charge
// rule: a Break cancels it); landed, it rubs every non-hero member's last command (`erasure: 'silence'`).
//
// EPISODE 4'S WRAPS (read 2026-11-15: src/data/ep4/ai.js and src/data/ep4/scene.js). ai.js answerHook runs only from Episode 4 scripts'
// `reflect` and keys on `answerable` charges and Heat flares; scene.js keys its planner wraps on `telegraphSfx` (the decree scroll and
// its sound), `answerable` (the "named" mark), a decree foe as actor, and a `telegraph_cancel` reason of 'answer'. So `unwrite` and
// `last_silence` carry neither `answerable` nor `decree` nor `telegraphSfx` (the sound rides the message's `sfx`), and the Eraser's own
// script cancels the Last Silence with reason 'answered', never 'answer'. Nothing of Episode 4 fires on them.
//
// SIGNATURE_TECHS (src/battle/scene/menu.js; pushed from the scene, as Episodes 4 to 7 do: registerSignatures() below is idempotent and
// E8-scene-ui calls it with menu.js's array): Mira's Read Aloud while an Unwrite (`unwrite: true`) is pinned; the hero's Answer while
// the Last Silence (`last_silence: true`) charges, `usable` (needs the MP to float).

import { SKILLS, CHARACTER_SKILLS } from '../skills.js';

const DEFAULTS = { effects: [], hits: 1, pierce: 0, rank: 100, mp: 0, types: [], power: 0, formula: 'none' };
const foe = (o) => ({ ...DEFAULTS, kind: 'enemy', ...o });
const E = { keep: 'erasure', erasure: 'rub' };

export const READ = 'read_aloud';

export const EP8_SKILLS = {
  // ------------------------------------------------------------------ Mira
  read_aloud: { ...DEFAULTS, id: READ, name: 'Read Aloud', kind: 'magic', user: 'mira', mp: 12, rank: 80,
    // learned in `first_word` (read_learned); the plan's fallback level, for a save that ever lacks flags (knownSkills reads the flag)
    learn: { flag: 'read_learned' }, fallbackLevel: 31,
    target: 'ally', effects: [{ keep: 'erasure', erasure: 'read' }],
    help: 'Read an ally back. Breaks an unwriting.', fx: 'buff', sfx: 'read_cast', icon: 'read_aloud' },

  // ------------------------------------------------------------------ the Stair and the Library ([E]: the move rubs out)
  // Index Hound
  hound_bite: foe({ id: 'hound_bite', name: 'Bite', target: 'enemy', formula: 'phys', power: 105, help: 'Card-drawer jaws.', fx: 'bite' }),
  hound_fetch: foe({ id: 'hound_fetch', name: 'Fetch', target: 'enemy', formula: 'phys', power: 120, effects: [E], erasing: true,
    help: 'It fetches the last thing you did. Rubs it out.', fx: 'bite', sfx: 'rub_out' }),
  // Margin Imp
  scribble: foe({ id: 'scribble', name: 'Scribble', target: 'enemy', formula: 'mag', power: 120, effects: [E], erasing: true,
    help: 'Ink scrawled over a line. Rubs it out.', fx: 'ink_lance', sfx: 'rub_out' }),
  imp_smear: foe({ id: 'imp_smear', name: 'Smear', target: 'enemy', formula: 'mag', power: 60, effects: [{ status: 'blind', chance: 0.2 }],
    help: 'Ink in the eyes. May Blind.', fx: 'hush' }),
  // Folded Crane
  fold_dive: foe({ id: 'fold_dive', name: 'Fold Dive', target: 'enemy', formula: 'phys', power: 160, effects: [E], erasing: true,
    help: 'A paper beak, edge first. Rubs out.', fx: 'slash', sfx: 'rub_out' }),
  crease: foe({ id: 'crease', name: 'Crease', target: 'enemies', formula: 'mag', power: 70, effects: [E], erasing: true,
    help: 'It folds the page you stand on. Rubs out.', fx: 'ink_wave', sfx: 'rub_out' }),
  // Bookworm
  worm_gnaw: foe({ id: 'worm_gnaw', name: 'Gnaw', target: 'enemy', formula: 'phys', power: 110, effects: [E], erasing: true,
    help: 'It eats a line out of you. Rubs out.', fx: 'bite', sfx: 'rub_out' }),
  worm_curl: foe({ id: 'worm_curl', name: 'Curl', target: 'self', rank: 80, effects: [{ status: 'protect', turns: 3 }],
    help: 'It curls inside its parchment.', fx: 'buff' }),
  paper_spray: foe({ id: 'paper_spray', name: 'Paper Spray', target: 'enemies', formula: 'phys', power: 60,
    help: 'Chewed paper over the party.', fx: 'quake' }),
  // Catalog Wraith
  file_away: foe({ id: 'file_away', name: 'File Away', target: 'enemy', formula: 'mag', power: 140, effects: [E], erasing: true,
    help: 'It files you under nothing. Rubs out.', fx: 'ink_lance', sfx: 'rub_out' }),
  chill_index: foe({ id: 'chill_index', name: 'Chill Index', target: 'enemies', formula: 'mag', power: 60, types: ['ice'],
    help: 'Cold cards over the party.', fx: 'ink_wave' }),
  // Inkbound Librarian (charge: Return Stamp)
  shush: foe({ id: 'shush', name: 'Shush', target: 'enemy', formula: 'mag', power: 40, effects: [{ status: 'silence', chance: 0.25 }],
    help: 'A finger to the lips. May Silence.', fx: 'hush' }),
  overdue: foe({ id: 'overdue', name: 'Overdue', target: 'enemy', formula: 'phys', power: 150, effects: [E], erasing: true,
    help: 'A heavy hand on a late name. Rubs out.', fx: 'slash', sfx: 'rub_out' }),
  return_stamp: foe({ id: 'return_stamp', name: 'Return Stamp', target: 'enemy', formula: 'phys', power: 210, effects: [E], erasing: true,
    telegraph: '{name} raises its stamp over {target}...', help: 'One great stamp. Defend.', fx: 'slash', sfx: 'rub_out' }),
  // Struck-Out Page (charge: Struck Line). Margin Line is party-wide at 75% (plan: single 120%): the spread careful play cannot heal
  // away, so the Unwritten Page is the tightest floor without a faster foe (BATTLE.md 17.1)
  margin_line: foe({ id: 'margin_line', name: 'Margin Line', target: 'enemies', formula: 'mag', power: 75, effects: [E], erasing: true,
    help: 'Lines drawn through the party. Rubs out.', fx: 'ink_lance', sfx: 'rub_out' }),
  struck_line: foe({ id: 'struck_line', name: 'Struck Line', target: 'enemy', formula: 'mag', power: 210,
    telegraph: '{name} draws a bar through {target}\'s name...', help: 'One name struck out.', fx: 'ink_lance' }),

  // ------------------------------------------------------------------ the Unnamed Sentry (ai 'unnamed_sentry')
  strike_out: foe({ id: 'strike_out', name: 'Strike Out', target: 'enemy', formula: 'mag', power: 150, effects: [E], erasing: true,
    help: 'A clean bar through a line. Rubs out.', fx: 'ink_lance', sfx: 'rub_out' }),
  cancel_line: foe({ id: 'cancel_line', name: 'Cancel', target: 'enemies', formula: 'mag', power: 125, effects: [E], erasing: true,
    help: 'Lines struck through the party. Rubs out.', fx: 'ink_wave', sfx: 'rub_out' }),
  // Pinned on one non-hero member (erasure.js pin()), never before Mira's next turn: lands on its owner's next turn (Unwritten).
  // `unwrite: true` names it for the scene's SIGNATURE_TECHS row ({ unit: 'mira', flag: 'unwrite', skill: 'read_aloud' }).
  unwrite: foe({ id: 'unwrite', name: 'Unwrite', target: 'none', rank: 80, unwrite: true,
    telegraph: '{name} begins to unwrite {target}.', help: 'Pinned on one of us. Mira can read them back.', fx: 'devour', sfx: 'unwrite_read' }),

  // ------------------------------------------------------------------ the Eraser (ai 'eraser'), Grief and Change
  rub_out: foe({ id: 'rub_out', name: 'Rub Out', target: 'enemy', formula: 'mag', power: 100, effects: [E], erasing: true,
    help: 'The empty face turns to you. Rubs out.', fx: 'ink_lance', sfx: 'rub_out' }),
  margin_sweep: foe({ id: 'margin_sweep', name: 'Margin Sweep', target: 'enemies', formula: 'mag', power: 75, effects: [E], erasing: true,
    help: 'The margins sweep the party. Rubs out.', fx: 'ink_wave', sfx: 'rub_out' }),
  // A charge every 3rd Eraser turn in the last phase. Answer (the hero) breaks it; a Break cancels it; Defend halves it and the ink
  // slides off. Landed: party mag 180%, and every non-hero member's last command rubbed out. `last_silence: true` names it for the
  // hero's SIGNATURE_TECHS row (Answer, usable). Neither `answerable` nor `decree` nor `telegraphSfx` (Episode 4's wraps: header).
  last_silence: foe({ id: 'last_silence', name: 'The Last Silence', target: 'enemies', formula: 'mag', power: 180, last_silence: true, holdForHero: true,
    effects: [{ keep: 'erasure', erasure: 'silence' }], erasing: true,
    telegraph: 'The Eraser draws a breath. The page goes quiet.', help: 'The whole page at once. Answer it.', fx: 'ink_wave_big', sfx: 'silence_gather' }),
  // Grief: Weep Ink heals the Eraser 5% at the end of each of its turns (never above the 70% lock); Rub Out [E]
  weep_ink: foe({ id: 'weep_ink', name: 'Weep Ink', target: 'none', rank: 80, help: 'Grief weeps ink into the Eraser.', fx: 'buff' }),
  // Change: Stand In (while it stands, single-target hits aimed at the Eraser strike Change instead: rules.js cover); Turn the Page [E]
  stand_in: foe({ id: 'stand_in', name: 'Stand In', target: 'none', rank: 80, help: 'Change stands in the way.', fx: 'guard' }),
  turn_page: foe({ id: 'turn_page', name: 'Turn the Page', target: 'enemies', formula: 'mag', power: 80, effects: [E], erasing: true,
    help: 'The page turns under the party. Rubs out.', fx: 'ink_wave', sfx: 'rub_out' }),
};

/** The ids of every erasing move ([E]), from the data (tests read this). */
export const ERASING_MOVES = Object.values(EP8_SKILLS).filter((s) => s.erasing).map((s) => s.id);

/** The scene's signature rows (src/battle/scene/menu.js SIGNATURE_TECHS). */
export const EP8_SIGNATURE_TECHS = [
  { unit: 'mira', flag: 'unwrite', skill: READ },
  { unit: 'hero', flag: 'last_silence', skill: 'answer', usable: true },
];
/** Push the two rows onto `list` (menu.js SIGNATURE_TECHS), each once. Returns the list. */
export function registerSignatures(list) {
  if (!Array.isArray(list)) return list;
  for (const row of EP8_SIGNATURE_TECHS) {
    if (!list.some((t) => t.unit === row.unit && t.flag === row.flag && t.skill === row.skill)) list.push({ ...row });
  }
  return list;
}

let done = false;
/** Add the skills (never overwriting an id) and Read Aloud to Mira's list. Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, s] of Object.entries(EP8_SKILLS)) if (!SKILLS[id]) SKILLS[id] = s;
  if (CHARACTER_SKILLS.mira && !CHARACTER_SKILLS.mira.includes(READ)) CHARACTER_SKILLS.mira.push(READ);
  done = true;
}
export default register;
