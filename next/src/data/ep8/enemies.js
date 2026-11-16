// Episode 8 ("The Last Word") foes (E8-battle; docs/EPISODE8_PLAN.md 6.2 to 6.5). Plain rows added through enemy()
// (src/data/enemies.js) by the pack's register(); nothing here changes an existing row. Idempotent.
//
// Erasure (plan 6.3, src/data/ep8/erasure.js): every foe here has `erasing: true`, so every battle it is in has Erasure. Its erasing
// moves ([E]) carry `{ keep: 'erasure', erasure: 'rub' }` in src/data/ep8/skills.js (each member hit loses its last command for two
// turns); plain moves rub nothing. No foe is ever rubbed out, and nothing a foe does to the party slows that foe.
// Scripts (src/data/ep8/ai.js, registered onto ai.js SCRIPTS):
//   ai 'erasing'         basic + the charge rule + the Erasure bridge; every ordinary Episode 8 foe and the Sentry's Struck-Out Pages
//   ai 'unnamed_sentry'  Strike Out, Cancel, Unwrite pinned (holdForMira), two Struck-Out Pages at 50%
//   ai 'eraser'          four phases, HP locks at 70% and 26%, the Erasure Ward (Grief and Change; 12% damage, shields locked, HP
//                        floor 32%), the Keeper Remembers (+30 Fury, Broken a turn), the Last Silence every 2nd turn (one telegraph at
//                        a time), Unwrite in phases 1 to 3
//   ai 'rejected_truth'  Grief (Weep Ink: the Eraser +5% a turn, never above the 70% lock; Rub Out) and Change (Stand In: rules.js cover
//                        over the Eraser; Turn the Page)
// Flavors are first-pass lines (E8-story owns the bestiary text); sprites are pack atlas frames named by id (E8-sprites), the
// Eraser's four looks `eraser`, `eraser_truths`, `eraser_remembers`, `eraser_silence` (each `phase` event carries its `sprite`).

import { enemy, ENEMIES } from '../enemies.js';

const sprite = (id) => ({ atlas: 'enemies_battle', field: 'enemies_field', frame: id });

// Final numbers after tuning (docs/BATTLE.md section 17 has the table and what moved from the plan).
export const EP8_ENEMIES = {
  // ---------------------------------------------------------------- the Stair (Lv 31)
  index_hound: {
    name: 'Index Hound', family: 'beast', level: 31, erasing: true,
    hp: 880, atk: 205, def: 34, mag: 20, spr: 24, spd: 21, luk: 6,
    shields: 2, weak: ['fire', 'spear'], resist: ['ice'], evade: 0.1, ai: 'erasing',
    exp: 90, gold: 250, masteryPts: 16,
    moves: [{ skill: 'hound_bite', weight: 50, target: 'lowestHpPct' }, { skill: 'hound_fetch', weight: 50 }],
    drops: [{ item: 'hi_potion', chance: 0.08 }, { item: 'fresh_ink', chance: 0.08 }], lootZone: 'ep8_stair',
    flavor: 'An ink-black hound with card drawers for ribs. It brings back whatever you did last, and keeps it.',
  },
  margin_imp: {
    name: 'Margin Imp', family: 'spirit', level: 32, size: 'small', erasing: true,
    hp: 700, atk: 100, def: 22, mag: 200, spr: 40, spd: 19, luk: 6,
    shields: 2, weak: ['fire', 'light'], resist: ['thunder'], ai: 'erasing',
    exp: 90, gold: 260, masteryPts: 15,
    moves: [{ skill: 'scribble', weight: 60 }, { skill: 'imp_smear', weight: 40 }],
    drops: [{ item: 'ether', chance: 0.08 }, { item: 'eye_drops', chance: 0.06 }], lootZone: 'ep8_stair',
    flavor: 'A jelly of ink with gold flecks, living in the margins. It doodles over whatever is written there.',
  },
  paper_crane: {
    name: 'Folded Crane', family: 'beast', level: 31, flying: true, erasing: true,
    hp: 720, atk: 190, def: 26, mag: 120, spr: 30, spd: 23, luk: 8,
    shields: 3, weak: ['fire', 'bow'], resist: ['ice'], evade: 0.15, ai: 'erasing',
    exp: 90, gold: 250, masteryPts: 15,
    moves: [{ skill: 'fold_dive', weight: 55 }, { skill: 'crease', weight: 45 }],
    drops: [{ item: 'fresh_ink', chance: 0.08 }, { item: 'hi_potion', chance: 0.06 }], lootZone: 'ep8_stair',
    flavor: 'A white crane folded from a single page. The words on it run the wrong way.',
  },
  // ---------------------------------------------------------------- the First Library (Lv 31 to 33)
  gnawing_bookworm: {
    name: 'Bookworm', family: 'beast', level: 31, erasing: true,
    hp: 760, atk: 195, def: 50, mag: 20, spr: 28, spd: 9, luk: 4,
    shields: 4, weak: ['fire', 'axe'], resist: ['sword', 'bow'], ai: 'erasing',
    exp: 95, gold: 260, masteryPts: 16,
    moves: [{ skill: 'worm_gnaw', weight: 50 }, { skill: 'worm_curl', weight: 20, if: 'notProtected' }, { skill: 'paper_spray', weight: 30 }],
    drops: [{ item: 'hi_potion', chance: 0.1 }, { item: 'fresh_ink', chance: 0.08 }], lootZone: 'ep8_library_f1',
    flavor: 'A parchment grub with a gold head. It has eaten whole shelves and remembers none of them.',
  },
  catalog_wraith: {
    name: 'Catalog Wraith', family: 'spirit', level: 32, erasing: true,
    hp: 900, atk: 100, def: 26, mag: 210, spr: 42, spd: 16, luk: 6,
    shields: 3, weak: ['fire', 'light'], resist: ['ice', 'thunder'], ai: 'erasing',
    exp: 95, gold: 270, masteryPts: 16,
    moves: [{ skill: 'file_away', weight: 55 }, { skill: 'chill_index', weight: 45 }],
    drops: [{ item: 'eye_drops', chance: 0.1 }, { item: 'hi_ether', chance: 0.05 }], lootZone: 'ep8_library_f1',
    flavor: 'A violet wraith trailing index cards. Every card has a name on it, and every name is crossed out.',
  },
  inkbound_librarian: {
    name: 'Inkbound Librarian', family: 'construct', level: 33, erasing: true,
    hp: 980, atk: 215, def: 48, mag: 60, spr: 30, spd: 12, luk: 4,
    shields: 4, weak: ['fire', 'axe'], resist: ['sword', 'ice'], statusImmune: ['poison'], ai: 'erasing',
    charge: { skill: 'return_stamp', first: 2, cooldown: 3 },
    exp: 100, gold: 280, masteryPts: 17,
    moves: [{ skill: 'shush', weight: 30 }, { skill: 'overdue', weight: 70 }],
    drops: [{ item: 'hi_potion', chance: 0.1 }, { item: 'fresh_ink', chance: 0.08 }], lootZone: 'ep8_library_f2',
    flavor: 'Ink and gilt armor with a stamp for a hand. It still checks every name that leaves.',
  },
  struck_page: {
    name: 'Struck-Out Page', family: 'construct', level: 33, size: 'small', erasing: true,
    hp: 760, atk: 110, def: 22, mag: 215, spr: 44, spd: 17, luk: 6,
    shields: 3, weak: ['fire', 'light'], resist: ['thunder', 'ice'], statusImmune: ['poison'], ai: 'erasing',
    charge: { skill: 'struck_line', first: 2, cooldown: 3 },
    exp: 95, gold: 280, masteryPts: 16,
    moves: [{ skill: 'margin_line', weight: 100 }],
    drops: [{ item: 'hi_ether', chance: 0.06 }, { item: 'phoenix_feather', chance: 0.03 }], lootZone: 'ep8_library_f3',
    flavor: 'A loose page in violet ink with one bar drawn hard through it. It wants to draw yours.',
  },

  // ---------------------------------------------------------------- the Unnamed Sentry (F2 mini-boss, Lv 32)
  unnamed_sentry: {
    name: 'The Unnamed Sentry', family: 'construct', level: 32, size: 'large', boss: true, ai: 'unnamed_sentry', erasing: true,
    hp: 1650, atk: 330, def: 34, mag: 1300, spr: 40, spd: 38, luk: 6,
    shields: 7, weak: ['fire', 'spear'], resist: ['ice', 'thunder'], statusImmune: ['silence'],
    exp: 320, gold: 1700, masteryPts: 26,
    moves: [{ skill: 'strike_out', weight: 55, target: 'lowestHpPct' }, { skill: 'cancel_line', weight: 45 }],
    // Unwrite: pinned at the end of a turn with nothing pinned (`pinGap` clear turns after its landing turn; `readGap` after Read Aloud
    // broke one); landed, its target is Unwritten and pushed back `unwritePush` of a turn, the Sentry heals `unwriteHeal` of its HP, and
    // its single-target moves go to the Unwritten member `unwrittenFocus` of the time (the cost of a missed Read Aloud). Two
    // Struck-Out Pages at `pagesAt` (2 shields each, no reward).
    pinGap: 0, readGap: 0, unwritePush: 1.0, unwriteHeal: 0.15, unwrittenFocus: 0.9, pagesAt: 0.5, pageShields: 2,
    drops: [], lootZone: 'ep8_library_f2',
    flavor: 'An ink-and-gilt sentry with a blank faceplate. It was built to guard a name, and it has forgotten whose.',
  },

  // ---------------------------------------------------------------- the Eraser (Lv 33), Grief and Change
  eraser: {
    name: 'The Eraser', family: 'construct', level: 33, size: 'boss', boss: true, ai: 'eraser', erasing: true,
    hp: 2700, atk: 640, def: 36, mag: 1790, spr: 34, spd: 38, luk: 10,
    shields: 8, weak: ['spear', 'bow'], resist: ['ice'], statusImmune: ['stun', 'poison', 'blind', 'silence'],
    exp: 2000, gold: 2500, masteryPts: 40,
    moves: [{ skill: 'rub_out', weight: 55 }, { skill: 'margin_sweep', weight: 45 }],
    // armor: DEF x in phases 1 and 2; ward: damage taken while Grief or Change stands, HP floor `phases[1].floor`; silenceEvery: the
    // Last Silence every Nth Eraser turn in phase 4 (the first as the phase opens; `silenceOnRecover`: again as soon as a Break ends);
    // finalBreaths / breathFloor: in phase 4 HP stops at 4% until it has drawn two Last Silences; restAfterBreak: no new telegraph on the
    // turn after one breaks; sweepEvery: Margin Sweep no more than every Nth turn in phase 3; keeperFury: the party's Fury when the ward
    // breaks; the Unwrite knobs as the Sentry's.
    armor: 1.4, ward: 0.12, silenceEvery: 2, silenceOnRecover: true, finalBreaths: 2, breathFloor: 0.04, restAfterBreak: true,
    sweepEvery: 3, keeperFury: 30, pinGap: 0, readGap: 0, unwritePush: 1.0, unwriteHeal: 0.06, unwrittenFocus: 0.9,
    phases: [
      { id: 'closed_book', name: 'The Closed Book', at: 1.0, weak: ['spear', 'bow'], resist: ['ice'], shields: 8, sprite: 'eraser',
        text: 'The Eraser opens nothing. Pierce the cover.' },
      { id: 'rejected_truths', name: 'The Rejected Truths', at: 0.70, floor: 0.32, weak: ['spear', 'bow'], resist: ['ice'], shields: 8,
        summon: ['truth_grief', 'truth_change'], sprite: 'eraser_truths',
        text: 'The robes spread like two covers. Grief and Change step out of the folds.' },
      { id: 'keeper_remembers', name: 'The Keeper Remembers', at: 0.32, weak: ['fire'], resist: ['ice'], shields: 8, sprite: 'eraser_remembers',
        text: 'Gold lines draw half a face through the white. Something in it remembers.' },
      { id: 'last_silence', name: 'The Last Silence', at: 0.26, weak: ['fire'], resist: ['ice'], shields: 8, haste: true, sprite: 'eraser_silence',
        moves: [{ skill: 'margin_sweep', weight: 60 }, { skill: 'rub_out', weight: 40 }],
        text: 'The Eraser reveals its final form: a space where no name can survive.' },
    ],
    drops: [], lootZone: 'ep8_last_word',
    flavor: 'Black robes, a white face with nothing written on it, and pages that orbit him like moths. He was a Keeper once.',
  },
  truth_grief: {
    name: 'Grief', family: 'spirit', level: 33, size: 'small', ai: 'rejected_truth', erasing: true,
    hp: 440, atk: 200, def: 26, mag: 240, spr: 30, spd: 14, luk: 4,
    shields: 3, weak: ['fire'], resist: ['ice'], statusImmune: ['poison', 'stun'],
    exp: 0, gold: 0, masteryPts: 4,
    moves: [{ skill: 'rub_out', weight: 100, target: 'lowestHpPct' }],
    weepPct: 0.05,
    drops: [], lootZone: null,
    flavor: 'A hooded figure of wet pages. Every page is a thing the Keeper could not bear to read again.',
  },
  truth_change: {
    name: 'Change', family: 'construct', level: 33, size: 'small', ai: 'rejected_truth', erasing: true,
    hp: 400, atk: 220, def: 30, mag: 230, spr: 26, spd: 13, luk: 4,
    shields: 3, weak: ['spear'], resist: ['fire'], statusImmune: ['poison', 'stun'],
    exp: 0, gold: 0, masteryPts: 4,
    moves: [{ skill: 'turn_page', weight: 100 }],
    drops: [], lootZone: null,
    flavor: 'A standing page with a door cut in it. Whatever walks through comes out someone else.',
  },
};

/** Ordinary foes, bosses and adds, in plan order (tests and the sim's bestiary read these). */
export const EP8_FOES = ['index_hound', 'margin_imp', 'paper_crane', 'gnawing_bookworm', 'catalog_wraith', 'inkbound_librarian', 'struck_page'];
export const EP8_BOSSES = ['unnamed_sentry', 'eraser'];
export const EP8_ADDS = ['truth_grief', 'truth_change'];
/** The Eraser's four looks, in phase order (E8-sprites' frame ids; the row-placement test reads them). */
export const ERASER_LOOKS = EP8_ENEMIES.eraser.phases.map((p) => p.sprite);

/**
 * HUD row anchors (CRITIQUE_8 item 1; E8-scene-ui's row-placement test reads this): the Eraser's row keeps one anchor, over its hood at
 * the top-left of its body, in all four looks; the Sentry's and the adds' rows sit under their own feet, the adds in front-row slots at
 * least `clearPx` internal px from any party sprite.
 */
export const HUD_ROWS = {
  eraser: { anchor: 'hood', looks: ERASER_LOOKS },
  unnamed_sentry: { anchor: 'feet', looks: ['unnamed_sentry'] },
  truth_grief: { anchor: 'feet', slot: 'front', clearPx: 12, looks: ['truth_grief'] },
  truth_change: { anchor: 'feet', slot: 'front', clearPx: 12, looks: ['truth_change'] },
};

let done = false;
/** Add the rows (never overwriting an id). Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, o] of Object.entries(EP8_ENEMIES)) if (!ENEMIES[id]) enemy(id, { sprite: sprite(id), ...o });
  done = true;
}
export default register;
