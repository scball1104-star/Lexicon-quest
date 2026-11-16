// Lexicon Quest NEXT, Episode 8: "The Last Word". Every scene of docs/story/EPISODE8.md section 1 and the side scenes of
// docs/EPISODE8_PLAN.md section 2.5, plus the bell night's twelve toll steps (the cold open's shape). Cutscene API only
// (DESIGN 5.4); staging in docs/story/STAGING_EP8.md. Writing rules as ep7: one idea per box, at most 3 lines of 42
// characters with the longest hero name the name entry allows (8), ASCII, no em dashes, {hero} = the player's name. The
// hero never speaks: choices, emotes, and what the others say.
//
// STAGING (CRITIQUE_6 item 11). Before the first line of anyone outside the party, stage(s, spot) walks the hero to `spot`
// (two tiles below the speaker), Mira to `spot_m` (one tile left of it) and Bram to `spot_b` (one tile right). Nox is the
// Episode 7 record `nox_t`, spawned at a mark by each scene that needs her (no follower code, plan 5.2); Vex is spawned as
// `vex_k` (Episodes 5 to 7: `vex` is Episode 2's in-glass id), Aeris as `aeris_t`.
//
// SHOWING (CRITIQUE_6 item 3, CRITIQUE_8 item 5). The seven payoffs open a close-up page through page(s, kind, mode, step):
// ep8_note, ep8_card (card, beside), ep8_seal (tag, match, run), ep8_first_word (rubbed, read), ep8_could_not (run, note),
// ep8_shelf (shelved, run in steps 1 to 3, star) and ep8_last_page, each mode called on the box that says it, and only when
// PAGE_KINDS has the kind (E8-tiles, wave 8b). The lines said over a page work without it.
//
// THE NAMES. One man, three records (the Episodes 4 to 7 swap): "The Librarian" (`ep8_librarian`, the Index record and the
// Last Word spawn, hood up, no portrait) until the boss intro; "The Eraser" (`eraser_v`) until he falls; "The First Keeper"
// (`first_keeper`, portrait first_keeper) from eraser_after. In memories he is "The First Keeper" (`first_keeper_m`).
// Elowen in memory is "A Young Keeper" (`elowen_m`). The First Keeper's own name is never written (EPISODE8 choice 26).
//
// PACK HELPERS (E8-scene-ui, wave 8d; each used only when the cutscene has it, `name in s`, so the boxes are the same
// without): s.inkBlot(who) (a "..." box under an ink blot: a name the run took out of a memory; fallback a plain "..." box
// and `ink_gurgle`), s.hudNameFlash(id) (the name_restore flash on a party member's HUD name), s.tollName(text) (the bell
// night's caption: a toll's name, or {hero} at the thirteenth; fallback for the thirteenth only: one gold narration box),
// s.goto(map, x, y, dir) (an awaited map change that keeps the scene running: home's door; fallback: the door on black).
//
// THE SWITCH. `ep8_morning` also needs EP8_LIVE (GATE.live, read at call time; the pack's ?ep=8 developer entry may set it)
// and not tier_1; the pack patch's enter trigger checks counter credits7_rolled. Every other scene needs a flag only an
// Episode 8 scene sets. Registration: part of the lazy `ep8` pack. register() hands scenes and guards to registerStory.

import * as EPISODES from '../../game/episodes.js';
import * as STORY from '../../game/story.js';
import { PAGE_KINDS } from '../../world/closeup.js';
import { REWARDS_EP8 } from './quests.js';
import { EP8_ARC_LINES, EP8_BOSS_CARDS } from './text.js';
import { END_TITLE_EP8, COLD_OPEN_CARD } from './credits.js';
import { EP8_TOLL_NAMES, EP8_TOLL_FLAGS } from './flags.js';

/** The bell night's foot (ep8_bell_night copies bell_tower: mark stair_foot (12, 36)); home warps there. */
export const BELL_FOOT = [12, 36];
/** The Stair's foot (plan 4.1: stair_bottom (15, 57), facing up); ep8_roof warps there. */
export const STAIR_FOOT = [15, 57];
/** hero_home, just inside the front door (the door is (12, 11)): home's goto lands here. */
export const HOME_DOOR = [12, 9];

// Speakers with portraits (a missing one draws none). Nox, the Librarian, the town and the memories have none (plan 9.2).
const PORTRAIT = { mira: 'mira', bram: 'bram', vex_k: 'silver_rogue', eraser_v: 'eraser', first_keeper: 'first_keeper', hazel: 'hazel' };

const say = (s, who, text) => s.say(who, text, PORTRAIT[who] ? { portrait: PORTRAIT[who] } : {});
const narrate = (s, text) => s.say(null, text);
const all = (...promises) => Promise.all(promises);

/** The party to its marks: the hero on `spot`, Mira on `spot_m`, Bram on `spot_b` (STAGING_EP8.md section 1). */
async function stage(s, spot) {
  await s.walk('hero', spot);
  await all(s.walk('mira', `${spot}_m`), s.walk('bram', `${spot}_b`));
}
/** Open a close-up page when its kind is registered (E8-tiles); true when it opened. */
async function page(s, kind, mode, step) {
  if (!PAGE_KINDS[kind]) return false;
  const o = {};
  if (mode) o.mode = mode;
  if (step) o.step = step;
  await s.closeup(kind, o);
  return true;
}
async function unpage(s, open) { if (open) await s.closeup(null); }
/** A name the run took out of a memory: the pack's ink-blot box, or a plain "..." box and `ink_gurgle`. */
async function blot(s, who) {
  if ('inkBlot' in s) { await s.inkBlot(who); return; }
  await s.sfx('ink_gurgle');
  await s.say(who, '...');
}

const spawnNox = (s, at, dir = 'down') => s.spawn('nox_t', { sprite: 'npc_keeper', name: 'Nox', at, dir });
const spawnVex = (s, at, dir = 'down', sprite = 'npc_vex') => s.spawn('vex_k', { sprite, name: 'Vex Quill', at, dir });
const spawnAeris = (s, at, dir = 'down') => s.spawn('aeris_t', { sprite: 'npc_aeris', name: 'Aeris', at, dir });
const spawnFk = (s, at, dir = 'down') => s.spawn('first_keeper', { sprite: 'npc_first_keeper', name: 'The First Keeper', at, dir });
const spawnFkMemory = (s, at, dir = 'down') => s.spawn('first_keeper_m', { sprite: 'npc_first_keeper_m', name: 'The First Keeper', at, dir });

export const GATE = { live: EPISODES.EP8_LIVE === true };
const toList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
async function allowed(s, cond) {
  if (!cond) return true;
  if (cond.live && !GATE.live) return false;
  for (const f of toList(cond.if)) if (!(await s.hasFlag(f))) return false;
  for (const f of toList(cond.ifNot)) if (await s.hasFlag(f)) return false;
  return true;
}
const cut = (fn, cond) => async (s) => {
  if (!(await allowed(s, cond))) return;
  await s.lockInput();
  try { await fn(s); } finally { await s.unlockInput(); }
};

/** Mira's two boss tips (plan 6.6: each names a lever the boss's data has; a contract with E8-battle). */
export const TIPS = {
  unnamed_sentry: "When it starts to unwrite one of us, I'll read them back. Keep me standing.",
  eraser: 'When it unwrites one of us, I read them back. When it goes quiet, {hero}, answer it.',
};

/**
 * The eight witness quests the last page counts (plan 5.3; EPISODE8 choice 15). Root canon counts lq:bell:done to
 * lq:first:concordance; these are NEXT's equivalents, one per episode (STAGING_EP8 section 5 lists why each).
 */
export const WITNESS_FLAGS = ['nella_bell_done', 'fountain_done', 'coolant_done', 'witnesses_done', 'roads_done', 'beacon_lit',
  'hearth_lit', 'concordance_lit'];
export const WITNESS_LINES = {
  many: ['Across the realms, the people you helped bring their own records and memories to an open council.',
    'They refuse to let any future Keeper decide their fate alone.'],
  few: ['The recovered fragments are entrusted to seven independent town councils,',
    'so the Library can never command forgetting again.'],
};
/** The two endings (canon labels, conclusions and titles; the middle dot of the titles is a colon). */
export const ENDINGS = {
  return: {
    flag: 'ending_return', label: 'Return every stolen name', title: 'Ending: Every Name Returned',
    confirm: 'Return every stolen name? This cannot be changed.',
    lines: ['You restore every lost name to the public pages, with a new rule that anyone may amend their story or withdraw their name.',
      'The world remembers; the Library can no longer imprison a life in a single version.'],
  },
  choose: {
    flag: 'ending_choose', label: 'Let each person choose', title: 'Ending: The Right to Choose',
    confirm: 'Let each person choose? This cannot be changed.',
    lines: ['You give the last word to the living.',
      'The Library offers each person their recovered past privately, but no one is forced to bear or publish a name.',
      'Blank pages become a right, not an erasure imposed by a Keeper.'],
  },
};

// ================================================================================================
// Act I: Palehaven, the stair in daylight (ep7_ph_watch, ep7_stillheart)
// ================================================================================================

// 1. ep7_ph_watch, on enter (the pack patch's ep8_wake; Episode 7's credits wake the save here, mark watch_cot). Not an inn
// room (Scott, 2026-11-11). Nox at her table (Episode 7's mark keeper_chair), the party staged below her. Six boxes, the
// note on the third. Gives vex_note. Sets ep8_morning_done, ep8_started.
async function ep8_morning(s) {
  await s.tint('dawn', 0);
  await spawnNox(s, 'keeper_chair', 'down');
  await stage(s, 'watch_stage');
  await s.camera.panTo('keeper_chair', 0);
  await s.music('palehaven');
  await s.fade('in', 40);
  await say(s, 'nox_t', 'I kept every door closed because I could not endure another farewell.');
  await s.wait(30);
  await say(s, 'nox_t', 'Palehaven has opened the gates. The last truth lies in the First Library.');
  await s.music(null);
  const open = await page(s, 'ep8_note');
  await narrate(s, "A folded scrap, in Vex's slanting hand: Gone up first. Somebody has to knock. - V");
  await unpage(s, open);
  await s.give(REWARDS_EP8.vex_note.item, REWARDS_EP8.vex_note.qty);
  await s.music('palehaven');
  await say(s, 'bram', "He left without breakfast. That's how you know it's serious.");
  await say(s, 'mira', "Then we're second.");
  await say(s, 'nox_t', "You asked me at the top. I'm coming to the top.");
  await s.camera.follow('hero');
  await s.setFlag('ep8_morning_done');
  await s.setFlag('ep8_started');
}

// 3. ep7_stillheart, on enter by the square's nave door (if: ep8_started). The broken roof by day; Aeris by the Kestrel
// (aeris_roof, the pack patch); Nox at the first step (stair_foot). The first truth choice (Hazel's Episode 1 question, on
// purpose; nobody remarks on it). The scene owns the map change to ep8_stair stair_bottom. Sets ep8_roofed, afraid_*.
async function ep8_roof(s) {
  await s.tint('none', 0);
  await spawnAeris(s, 'aeris_roof', 'left');
  await spawnNox(s, 'stair_foot', 'down');
  await stage(s, 'stair_stage');
  await s.music('palehaven');
  await s.camera.panTo('stair_foot', 40);
  await narrate(s, 'The broken roof by day. Out of it, the stair of written light climbs into a violet sky.');
  await s.face('aeris_t', 'hero');
  await say(s, 'aeris_t', "That stair doesn't need a ship. I'll be here when you come down.");
  await s.face('nox_t', 'up');   // she does not look at the stair
  await s.music(null);
  await say(s, 'nox_t', 'Are you frightened?');
  const c = await s.choice(['Yes.', 'No.']);
  if (c === 0) {
    await s.setFlag('afraid_yes');
    await say(s, 'nox_t', "Good. So am I. We'll both look where we're going.");
  } else {
    await s.setFlag('afraid_no');
    await say(s, 'nox_t', 'Then hold my lamp. My hands shake.');
  }
  await s.music('orrery');
  await s.camera.follow('hero');
  await s.setFlag('ep8_roofed');
  await s.fade('out', 30);
  s.warp('ep8_stair', STAIR_FOOT[0], STAIR_FOOT[1], 'up');
}

// ================================================================================================
// Act II: The Stair of Written Light (ep8_stair)
// ================================================================================================

// 4. ep8_stair, on enter (from ep8_roof). Nox comes up behind the party (nox_foot). Three boxes. Sets stair_arrived.
async function stair_arrival(s) {
  await spawnNox(s, 'nox_foot', 'up');
  await stage(s, 'foot_stage');
  await s.camera.panTo('gap_a', 40);
  await say(s, 'bram', "We're walking on somebody's handwriting.");
  await say(s, 'nox_t', 'On everybody\'s. Every first line the Library ever wrote.');
  await say(s, 'mira', "And somebody's been rubbing them out.");
  await s.camera.follow('hero');
  await s.setFlag('stair_arrived');
}

// 5. ep8_stair, step row rub_row above the landing (if: stair_arrived). The teaching fight for Erasure: e8s_first, no flee.
// Mira's line names the answer (the E6-fixes A3 lesson); the rub-out messages are the battle's (EP8_BATTLE_TEXT). No
// tutorial box. A loss sets nothing. Sets first_rub_done.
async function first_rub(s) {
  await s.camera.panTo('foes_drop', 30);
  await s.sfx('rub_out');
  await narrate(s, 'Two hounds of ink come bounding down the steps, scraps of rubbed-out paper in their jaws.');
  await s.spawn('foe_hound', { sprite: 'index_hound', name: 'Index Hound', at: 'foes_drop', dir: 'down' });
  await s.spawn('foe_hound_b', { sprite: 'index_hound', name: 'Index Hound', at: 'foes_drop_b', dir: 'down' });
  await all(s.emote('mira', '!'), s.emote('bram', '!'));
  await s.camera.follow('hero');
  await say(s, 'mira', 'If it rubs something out, use something else.');
  const result = await s.battle('e8s_first', { canFlee: false });
  if (result !== 'win') return;
  await all(s.despawn('foe_hound'), s.despawn('foe_hound_b'));
  await say(s, 'bram', 'It rubbed out my swing. Not yours.');
  await s.wait(30);
  await say(s, 'bram', 'Why never yours?');
  await s.emote('hero', '...');   // the twist's first seed; nobody answers
  await s.setFlag('first_rub_done');
}

// 6. ep8_stair, step trigger first_trig at the first gap (if: first_rub_done). A great closed book lies at the edge, the
// Willowmere realm book. One line names the action; the read does the rest (barks first_open, first_wall, first_side and
// would_fold, E8-world). Sets first_book_read.
async function first_book(s) {
  await spawnNox(s, 'nox_gap_a', 'up');
  await stage(s, 'gap_a_stage');
  await s.camera.panTo('gap_a', 30);
  await narrate(s, 'At the edge of the gap lies a great shut book, as long as a cart, with a ribbon on each long side.');
  await s.camera.follow('hero');
  await say(s, 'nox_t', 'Open it from this side. A book opens away from its reader.');
  await s.setFlag('first_book_read');
}

// 7. ep8_stair, step trigger rubbed_trig by the reading desk (if: first_book_read). The set piece of Act II: the faceless
// figure (the avatar, `eraser_v` with no speaker line) walks down from eraser_far, the steps it passes going blank (the
// steps' frames), stops, and climbs back. The pack tint `rubout` in over 2 s, out over 1 s. 8 boxes. Sets eraser_seen.
async function rubbed_steps(s) {
  await spawnNox(s, 'nox_desk', 'up');
  await stage(s, 'desk_stage');
  await s.music(null);
  await s.tint('rubout', 120);
  await s.spawn('eraser_v', { sprite: 'eraser_avatar', name: 'A Tall Figure', at: 'eraser_far', dir: 'down' });
  await s.camera.panTo('eraser_far', 60);
  await s.walk('eraser_v', 'eraser_low');
  await narrate(s, 'Far up the stair, a tall shape in black robes walks down. Every line it passes goes blank behind its sleeve.');
  await narrate(s, 'Its face is smooth and white, with nothing on it. It stops, as if it heard something.');
  await s.wait(40);
  await s.face('eraser_v', 'up');
  await s.walk('eraser_v', 'eraser_far');
  await s.despawn('eraser_v');
  await s.tint('none', 60);
  await s.music('orrery');
  await s.camera.follow('hero');
  await say(s, 'nox_t', "That's what he does now.");
  await say(s, 'mira', 'Who?');
  await say(s, 'nox_t', "Up there. I said I'd say it up there.");
  await say(s, 'bram', "It didn't have a face.");
  await say(s, 'mira', 'It had a face. Somebody rubbed it out.');
  await s.setFlag('eraser_seen');
}

// 8. ep8_stair, step trigger margin_trig at the top gate (the South Margin). The Scriptorium and the Library are the
// decal (environments cell 7), shown, never read out. Sets saw_scriptorium.
async function south_margin(s) {
  await s.music('mystery');
  await s.camera.panTo('library_far', 60);
  await narrate(s, 'Below the gate, a street of book towers. Above it, filling the sky: the First Library.');
  await say(s, 'bram', "That's not a library. That's a mountain that reads.");
  await say(s, 'mira', "That's where the lists come from.");
  await s.emote('hero', '...');
  await s.camera.follow('hero');
  await s.music('orrery');
  await s.setFlag('saw_scriptorium');
}

// ================================================================================================
// Act III: The Scriptorium (ep8_scriptorium, ep8_sc_index)
// ================================================================================================

// 9. ep8_scriptorium, on first enter by the South Margin gate. Quinn (the record, at quinn_gate) with an armful of pages.
// Every sign stops halfway (two-state objects); one is read. Nox stops at the gate, in a street that reads. Sets
// scriptorium_arrived.
async function scriptorium_arrival(s) {
  await s.music(null);
  await spawnNox(s, 'nox_gate_s', 'up');
  await stage(s, 'gate_stage');
  await s.camera.panTo('sign_a', 30);
  await narrate(s, 'A sign over a door: BOOKB. That is all of it. Every sign in the street stops halfway.');
  await s.camera.follow('hero');
  await s.music('scriptorium_town');
  await s.face('quinn', 'hero');
  await say(s, 'quinn', 'Pages drift out of the stacks when nobody is looking.');
  await say(s, 'mira', 'Every sign stops halfway.');
  await say(s, 'quinn', 'Nothing new gets finished here. Not since the Index shut.');
  await say(s, 'bram', 'Shut by who?');
  await say(s, 'quinn', '...By the Index.');
  await say(s, 'nox_t', "I haven't stood in a street that reads in twenty-six years.");
  await s.walk('nox_t', 'nox_codex');
  await s.setFlag('scriptorium_arrived');
}

// 10. ep8_scriptorium, step trigger word_trig in the square (if: scriptorium_arrived). The set piece of Act III and Mira's
// first beat: Meya's one word rubbed out with the signs, and read back. Teaches Read Aloud (the skill's learn: { flag:
// 'read_learned' }). 10 boxes. Sets read_learned.
async function first_word(s) {
  await stage(s, 'steps_stage');
  await s.camera.panTo('meya_steps', 20);
  await s.face('meya', 'hero');
  await say(s, 'meya', 'I found a book with only the first word written. The rest was waiting for me.');
  await s.music(null);
  await s.tint('rubout', 120);
  await s.sfx('rub_out');
  let open = await page(s, 'ep8_first_word', 'rubbed');
  await narrate(s, "The light dims. The half-words on every sign lift off, letter by letter. Meya's one word goes with them.");
  await unpage(s, open);
  await say(s, 'meya', "...It's gone. My word's gone.");
  await say(s, 'mira', 'Ink remembers, even when paper forgets.');
  await s.sfx('read_cast');
  await narrate(s, 'Mira kneels with the Lantern over the page and reads it aloud, slowly, the way you read to someone small.');
  open = await page(s, 'ep8_first_word', 'read');
  await narrate(s, 'The word comes back. Then the half-words on the signs, from the square outward.');
  await unpage(s, open);
  await s.tint('none', 60);
  await s.music('scriptorium_town');
  await say(s, 'meya', 'You read it back.');
  await say(s, 'mira', 'Out loud. Words like being said.');
  await say(s, 'bram', 'Do that in a fight.');
  await s.setFlag('read_learned');
  await s.sfx('level_up_sparkle');
  await narrate(s, "{c:gold}Mira learned Read Aloud. Read an ally's lines back: what was rubbed out returns, and an unwriting breaks.{/c}");
  await s.camera.follow('hero');
}

// 11. ep8_sc_index, step trigger index_trig two tiles in (if: read_learned). The Librarian (the record, at librarian_desk)
// writes; his pen stops at the hero's name. He gives three reader's cards and goes up through the door behind the desk
// (the record shows until librarian_met). The card is the close-up: the cold hand, and the desk's stamp in the corner
// (nobody remarks on it yet). 11 boxes. Gives reader_card. Sets librarian_met, card_read.
async function meet_librarian(s) {
  await stage(s, 'party_stop');
  await s.music('mystery');
  await s.camera.panTo('librarian_desk', 20);
  await s.face('ep8_librarian', 'hero');
  await say(s, 'ep8_librarian', "Readers. You'll want cards.");
  await s.wait(30);   // his pen stops
  await say(s, 'ep8_librarian', '{hero}. A good name. Look after it.');
  await say(s, 'mira', 'How do you know it?');
  await say(s, 'ep8_librarian', "A librarian knows every name. It's the job.");
  await say(s, 'bram', 'And yours?');
  await say(s, 'ep8_librarian', 'I gave mine up. A librarian should be a shelf, not a book.');
  await s.face('ep8_librarian', 'up');   // he writes three cards with his back to them
  await s.wait(40);
  await s.face('ep8_librarian', 'hero');
  await s.give(REWARDS_EP8.reader_card.item, REWARDS_EP8.reader_card.qty);
  await say(s, 'ep8_librarian', 'The Library is closed to new names. I have a last page to see to.');
  await s.setFlag('librarian_met');
  await s.walk('ep8_librarian', 'back_door');
  await s.despawn('ep8_librarian');
  await s.music(null);
  const open = await page(s, 'ep8_card', 'card');
  await narrate(s, 'Mira reads her card: Welcome, readers. Please return what you borrow. A stamp in the corner.');
  await unpage(s, open);
  await s.music('mystery');
  await say(s, 'mira', "...That's the hand. Every list.");
  await say(s, 'bram', 'The nice old man?');
  await say(s, 'mira', 'Seven lists. I know that hand.');
  await s.emote('hero', '!');
  await s.camera.follow('hero');
  await s.setFlag('card_read');
}

// 12. ep8_scriptorium, Elowen's talk entry the first time (if: read_learned). The register house on the square: her desk
// under the awning, the infirmary door, a line of grey blankets with linen tags. The tag, the match and the run are the
// close-ups. Nox comes over from the Codex. The second truth choice. She does not know the hero; nobody says it. 14 boxes.
// Sets elowen_met, and told_elowen or spared_elowen.
async function elowen_scriptorium(s) {
  await stage(s, 'stall_stage');
  await s.music('scriptorium_town');
  await s.camera.panTo('stall', 20);
  let open = await page(s, 'ep8_seal', 'tag');
  await narrate(s, 'Grey infirmary blankets air by the door, each with a small linen tag: a key laid across an open book.');
  open = (await page(s, 'ep8_seal', 'match')) || open;
  await say(s, 'bram', "{hero}. That's your blanket. The grey one, the little tag. Hazel's chest. I've seen it a hundred times.");
  await unpage(s, open);
  await say(s, 'mira', 'Same stamp as his desk.');
  await s.face('elowen', 'hero');
  await say(s, 'elowen', 'Infirmary wool. The office of the Concordance key marks every blanket.');
  await s.wait(30);
  await say(s, 'elowen', "Nobody's been born in that infirmary in sixteen years. I'd know. Every name in the street passes my desk.");
  open = await page(s, 'ep8_seal', 'run');
  await narrate(s, 'She turns the register round. One line, sixteen springs back, is a brown blot that has run through the paper.');
  await say(s, 'elowen', "Except this one. I've never been able to read it. Nobody has.");
  await narrate(s, 'Mira holds the Lantern over it and reads it aloud. Nothing comes back.');
  await unpage(s, open);
  await say(s, 'mira', "It isn't rubbed out. It ran.");
  await spawnNox(s, 'nox_codex', 'down');
  await s.walk('nox_t', 'nox_stall');
  await say(s, 'nox_t', 'Not here.');
  await s.music(null);
  await say(s, 'elowen', 'Did you ever wonder who left you?');
  const c = await s.choice(['Not really.', 'Every day.']);
  if (c === 0) {
    await s.setFlag('told_elowen');
    await say(s, 'elowen', '...Good. Then somebody loved you enough not to.');
  } else {
    await s.setFlag('spared_elowen');
    await say(s, 'elowen', "You're kind. Somebody down there taught you that.");
  }
  await s.music('scriptorium_town');
  await say(s, 'elowen', "Every spring I miss something. Sixteen years. I don't know what.");
  await s.wait(30);
  await say(s, 'elowen', "You'd think a Keeper would know.");
  await s.emote('hero', '...');
  await s.camera.follow('hero');
  await s.setFlag('elowen_met');
}

// 13. ep8_scriptorium, step trigger gate_trig at the Library's great door (if: card_read and elowen_met; E8-story: the
// register is the clue the_name pays, so the door waits for Elowen, and Talk names her). The empty seal is the door. Nox
// opens it. Sets library_open.
async function library_door(s) {
  await spawnNox(s, 'nox_gate', 'up');
  await stage(s, 'library_stage');
  await s.camera.panTo('library_gate', 30);
  await narrate(s, "The Library's great door: a seal as tall as a house. An open book, with nothing written in it.");
  await say(s, 'mira', 'The empty book. On every list.');
  await say(s, 'bram', 'On his door.');
  await say(s, 'mira', "It's the stamp off his desk. With the key taken out.");
  await s.face('nox_t', 'hero');
  await say(s, 'nox_t', "I couldn't go in, before. A Keeper with no name can't. I have mine back.");
  await s.face('nox_t', 'up');
  await s.sfx('gate_open');
  await s.setFlag('library_open');
  await s.camera.follow('hero');
}

// ================================================================================================
// Act IV: The First Library (ep8_library_f1, ep8_library_f2, ep8_library_f3)
// ================================================================================================

// 14. ep8_library_f1, on enter. The floor's question: who filed all these away? Sets library_entered, lib_f1_arrived.
async function catalog_arrival(s) {
  await s.camera.panTo('crossing', 40);
  await narrate(s, 'Walls of card drawers rise into the dark. Galleries hang over the violet. A great shut book lies on every landing.');
  await say(s, 'bram', 'Drawers. Thousands.');
  await say(s, 'mira', "Every one a name somebody put away so it wouldn't hurt.");
  await s.camera.follow('hero');
  await s.setFlag('library_entered');
  await s.setFlag('lib_f1_arrived');
}

// The Library replays what it holds: the memories as vignettes (scene spawns, a warm flash in and out, sorrow with a distant
// bell_toll). No tint change, Episode 7's mechanism.
async function memoryIn(s, at) {
  await s.camera.panTo(at, 40);
  await s.music('sorrow');
  await s.sfx('bell_toll');
  await s.flash('#f3e6c4', 20);
}
async function memoryOut(s, ids, track) {
  await s.flash('#f3e6c4', 20);
  for (const id of ids) await s.despawn(id);
  await s.music(track);
  await s.camera.follow('hero');
}

// 15. ep8_library_f1, step trigger memory_a_trig at the doorway alcove. The First Duty (canon title and words). Nox names
// the First Keeper, and says the root's region talk word for word. Sets keeper_memory_a.
async function keeper_memory_a(s) {
  await spawnNox(s, 'nox_alcove', 'up');
  await stage(s, 'alcove_stage');
  await memoryIn(s, 'doorway_alcove');
  await spawnFkMemory(s, 'fk_door_m', 'down');
  await s.spawn('traveler_m', { sprite: 'npc_scholar', name: 'A Traveler', at: 'traveler_in_m', dir: 'up' });
  await narrate(s, 'The Library replays a doorway, long ago, standing open. Travelers come in out of the violet with their books.');
  await s.walk('traveler_m', 'traveler_past_m');
  await narrate(s, 'A Keeper in a violet robe holds the door, hood back: a kind, lined face, and gold eyes.');
  await say(s, 'first_keeper_m', 'Names are windows. Not chains.');
  await narrate(s, "The doorway darkens. A long line of travelers with no faces: the war of the nameless. The Keeper's hand shakes.");
  await memoryOut(s, ['first_keeper_m', 'traveler_m'], 'first_library');
  await say(s, 'mira', "That's the Librarian. Younger.");
  await say(s, 'nox_t', "That's the First Keeper.");
  await say(s, 'nox_t', 'The Eraser was once the First Keeper. He believes forgetting is mercy.');
  await say(s, 'bram', 'The faceless thing on the stair. And the old man at the desk.');
  await say(s, 'nox_t', 'And him. One man.');
  await s.setFlag('keeper_memory_a');
}

// 16. The Original Ink Key is the gold chest on the northern shelf (flag ink_key_found). The lift up runs this silent step
// trigger. Sets library_f1_done.
async function library_f1_lift(s) {
  await s.setFlag('library_f1_done');
}

// 17. ep8_library_f2, on enter. Two boxes. Sets lib_f2_arrived.
async function palimpsest_arrival(s) {
  await s.camera.panTo('pair', 40);
  await say(s, 'mira', 'He writes over things. You can still see what was there.');
  await say(s, 'bram', "Then it isn't gone. It's just underneath.");
  await s.camera.follow('hero');
  await s.setFlag('lib_f2_arrived');
}

// 18. ep8_library_f2, step trigger memory_b_trig in the printing room. The Order That Changed Everything (canon title). The
// Rootbound Archive's last Keeper stands up from the row (nameless by design, EPISODE1). The card beside the order is the
// close-up. Sets keeper_memory_b.
async function keeper_memory_b(s) {
  await spawnNox(s, 'nox_printing', 'up');
  await stage(s, 'printing_stage');
  await memoryIn(s, 'printing_room');
  await spawnFkMemory(s, 'fk_desk_m', 'down');
  await s.spawn('scribe_m', { sprite: 'npc_scholar', name: 'A Scribe', at: 'scribe_row_m', dir: 'up' });
  await s.spawn('rootbound_keeper_m', { sprite: 'npc_rootbound_keeper_m', name: 'The Keeper with the Lantern', at: 'lantern_keeper_m', dir: 'up' });
  await narrate(s, 'The printing room, a century back. The First Keeper at a great desk, his Scribes in a row, writing in a cold hand.');
  await say(s, 'first_keeper_m', 'No more losses. Take every name that hurts to hear.');
  await narrate(s, 'A Keeper with a green-bronze lantern stands up from the row.');
  await say(s, 'rootbound_keeper_m', 'No. Not without a living witness.');
  await s.walk('rootbound_keeper_m', 'lantern_exit_m');
  await s.despawn('rootbound_keeper_m');
  await s.wait(40);   // she walks out; he keeps writing
  await memoryOut(s, ['first_keeper_m', 'scribe_m'], 'first_library');
  const open = await page(s, 'ep8_card', 'beside');
  await narrate(s, 'Mira holds her reader\'s card beside the order left on the desk.');
  await unpage(s, open);
  await say(s, 'mira', 'Same hand. He wrote the order. And every list after it.');
  await say(s, 'bram', 'Was the North one of these?');
  await say(s, 'nox_t', "No. The North was later, and it wasn't mercy. Further up.");
  await s.setFlag('keeper_memory_b');
}

// 19. ep8_library_f2, arena trigger sentry_trig in the Seal Gallery. Mini-boss intro in the Episode 7 style; a retry plays
// only Mira's tip and the card. The encounter flag sets sentry_defeated.
async function unnamed_sentry(s) {
  if (await s.hasFlag('sentry_defeated')) return;
  const retry = await s.hasFlag('sentry_tried');
  await s.music(null);
  await s.camera.panTo('sentry_spot', 40);
  await s.wait(retry ? 10 : 30);
  if (!retry) {
    await stage(s, 'arena_stage');
    await narrate(s, 'A tall armored shape of ink and gilt. Where its face should be, a smooth blank plate.');
    await narrate(s, EP8_ARC_LINES.unnamed_sentry);
  } else {
    await s.shake(2, 30);
  }
  await say(s, 'mira', TIPS.unnamed_sentry);
  await s.setFlag('sentry_tried');
  await s.title(EP8_BOSS_CARDS.unnamed_sentry.name, { sub: EP8_BOSS_CARDS.unnamed_sentry.sub, frames: 100 });
  await s.shake(4, 30);
  await s.music('battle');
  const result = await s.battle('unnamed_sentry', { boss: true, canFlee: false });
  if (result !== 'win') return;
  await s.setFlag('sentry_defeated');
  await s.music('first_library');
  await say(s, 'bram', 'It had no name either.');
  await say(s, 'mira', 'Nobody up here does. That was the point of up here.');
  await s.camera.follow('hero');
}

// The lift up from the Seal Gallery runs this silent step trigger. Sets library_f2_done.
async function library_f2_lift(s) {
  await s.setFlag('library_f2_done');
}

// 20. ep8_library_f2, the object archive_obj behind the side galleries' pair (side story 2). The three evidence pages open
// it; the gold chest beside it (present if archive_open) holds the reward. Sets archive_open.
const EVIDENCE = ['page_names_found', 'page_order_found', 'page_correction_found'];
async function uncensored_archive(s) {
  if (await s.hasFlag('archive_open')) {
    await narrate(s, 'The Archive of Uncensored Lives stands open. Three pages on its shelf: The Names, The Order, The Correction.');
    return;
  }
  await narrate(s, 'A locked shelf with three page-shaped slots, labelled in a cold hand: THE ARCHIVE OF UNCENSORED LIVES.');
  for (const f of EVIDENCE) {
    if (!(await s.hasFlag(f))) {
      await say(s, 'bram', 'Three pages and a locked shelf. Somebody hid the truth and labelled it.');
      return;
    }
  }
  await narrate(s, 'The three evidence pages slide into their slots, in any order. The shelf unlocks with a soft click.');
  await s.take(REWARDS_EP8.evidence_page.item, REWARDS_EP8.evidence_page.qty);
  await s.sfx('chest_open');
  await s.setFlag('archive_open');
}

// 21. ep8_library_f3, on enter. The quietest map of the episode. Two boxes. Sets lib_f3_arrived.
async function unwritten_arrival(s) {
  await s.camera.panTo('shelter', 60);
  await say(s, 'bram', 'Blank.');
  await say(s, 'mira', 'Not blank. Waiting.');
  await s.camera.follow('hero');
  await s.setFlag('lib_f3_arrived');
}

// 22. ep8_library_f3, step trigger memory_c_trig on the first landing. The Last Unwritten Name (canon title, re-aimed to the
// novel's night: EPISODE8 section 8). Four pictures: the desk, the vault, the infirmary, the stair. The fire is always the
// vault's or the east wing's, never plain; it is smoke under a door, never people; its dead are never counted or named.
// Facts and motifs only: no line of the novel is quoted (its few allowed terms: After the Jubilee, nobody's doing). The
// run and the note are the close-ups. 16 boxes. Sets keeper_memory_c, beginning_seen.
async function keeper_memory_c(s) {
  await spawnNox(s, 'nox_landing', 'up');
  await stage(s, 'memory_c_stage');
  await memoryIn(s, 'memory_c_spot');
  // 1. The desk
  await spawnFkMemory(s, 'mc_desk', 'down');
  await narrate(s, 'Sixteen springs ago: three warnings about the lantern-oil vaults. On each, the First Keeper writes: After the Jubilee.');
  // 2. The vault
  await s.camera.panTo('mc_vault', 30);
  await narrate(s, "Smoke under a door: the east wing's vaults are burning. Later he goes down alone, with the key and the Library's ink.");
  await s.walk('first_keeper_m', 'mc_stand');
  let open = await page(s, 'ep8_could_not', 'run');
  await narrate(s, "On the Concordance's sworn page, over the cause, he writes: nobody's doing. The ink will not lie still.");
  await narrate(s, 'It runs. The warnings go, and the account, and eleven sworn names. It runs on, off the bottom of the page.');
  await unpage(s, open);
  // 3. The infirmary
  await s.camera.panTo('mc_bed', 30);
  await s.spawn('elowen_m', { sprite: 'npc_elowen_m', name: 'A Young Keeper', at: 'mc_bed', dir: 'down' });
  await s.spawn('bundle_m', { sprite: 'prop_ep8_bundle', name: 'A Baby', at: 'mc_bed_bundle', dir: 'down' });
  await narrate(s, 'The eleventh hour, in the infirmary. A young Keeper in a bed by the window holds a baby, and says its name.');
  await blot(s, 'elowen_m');   // the memory's sound drops out on the name
  await s.despawn('bundle_m');
  await s.spawn('nurse_m', { sprite: 'npc_nurse_m', name: 'A Nurse', at: 'mc_nurse', dir: 'down' });
  await s.spawn('blanket_m', { sprite: 'prop_ep8_blanket', name: 'A Blanket', at: 'mc_nurse_blanket', dir: 'down' });
  await narrate(s, 'Then the ink reaches her line. A nurse stands holding an empty grey blanket. Nobody in the room remembers why.');
  // 4. The stair
  await s.camera.panTo('mc_stand', 30);
  await s.spawn('bundle_m', { sprite: 'prop_ep8_bundle', name: 'A Baby', at: 'mc_stand_bundle', dir: 'down' });
  await narrate(s, 'In the vault, at the foot of the Concordance, a baby is crying in the smoke. He carries it up to his desk.');
  await say(s, 'first_keeper_m', "I can't write you back. I can't rub you out.");
  open = await page(s, 'ep8_could_not', 'note');
  await narrate(s, 'He wraps the baby in infirmary wool and tucks in a note, two words in the cold hand: I could not.');
  await unpage(s, open);
  await s.camera.panTo('mc_oldest', 30);
  await s.wait(60);   // the camera holds on the oldest page
  await narrate(s, 'On the desk behind him lies the oldest page in the Library. One sentence: No life can be stored without letting it change.');
  await memoryOut(s, ['first_keeper_m', 'elowen_m', 'nurse_m', 'blanket_m', 'bundle_m'], 'mystery');
  await say(s, 'mira', 'He carried you out. Before Nox. Before Marten.');
  await say(s, 'nox_t', 'I found you on my step with that note and that tag. I knew the hand. Every Keeper knew the hand.');
  await say(s, 'bram', "After the Jubilee. He let it burn, and then he made it nobody's.");
  await say(s, 'mira', 'Memories can hurt and still be worth keeping.');
  await say(s, 'bram', 'The forge shelters the living. Not a silence.');
  await s.setFlag('keeper_memory_c');
  await s.setFlag('beginning_seen');
}

// 23. ep8_library_f3, step trigger name_trig at the top landing by the keyhole (if: keeper_memory_c and ink_key_found). The
// set piece of Act IV's end and Nox's beat: she says the name. One line by the roof choice. 16 boxes. Sets name_told.
async function the_name(s) {
  await spawnNox(s, 'nox_key', 'down');
  await stage(s, 'party_stop_door');
  await s.music(null);
  await s.camera.panTo('keyhole', 30);
  await say(s, 'nox_t', "I said I'd give you the name you'll need up here. It's a door. This is where it was written.");
  if (await s.hasFlag('afraid_yes')) await say(s, 'nox_t', "I'm frightened. You said you were. Good.");
  else await say(s, 'nox_t', "Give me back my lamp. I'll need both hands for this.");
  await say(s, 'nox_t', 'The line the ink ran into. The one in her register.');
  await s.wait(40);
  await s.sfx('bell_thirteenth');
  await say(s, 'nox_t', '{hero}.');
  await all(s.face('mira', 'hero'), s.face('bram', 'hero'));
  await s.emote('hero', '!');
  await s.music('mystery');
  await say(s, 'bram', "That's just their name.");
  await say(s, 'nox_t', "It's their first name, given that night. The ink ran over it, and on into the North, into our ice.");
  await say(s, 'nox_t', 'Ice holds still what ink hides. I read it there, the spring you came. I wrote it again, on your page and your blanket.');
  await say(s, 'nox_t', "I didn't choose it. Somebody loved you enough to choose it. Hazel was right about that.");
  await say(s, 'mira', 'Every list. Your name at the bottom. Never crossed out.');
  await say(s, 'bram', "He couldn't cross it out. It's a person.");
  await say(s, 'mira', 'And the first page. If it reaches his shelf...');
  await say(s, 'nox_t', '...the line is written back where it began, and the ink runs back up the page. The vault fire. Eleven names. His.');
  await say(s, 'nox_t', "That's why my name went the spring you came. I could read his lie. He didn't want anyone who could.");
  await say(s, 'mira', 'We have brought the names this far.');
  await say(s, 'bram', 'Whatever waits, it does not face you alone.');
  await s.camera.panTo('ink_door', 20);
  await s.sfx('door_unlock');
  await narrate(s, 'The Original Ink Key turns in the Original Ink Keyhole. Its bow is cracked. The door opens on gold light.');
  await s.camera.follow('hero');
  await s.setFlag('name_told');
}

// ================================================================================================
// Act V: The Last Word (ep8_last_word)
// ================================================================================================

// 24. ep8_last_word, trigger row eraser_trig at the entry (if: name_told). The Librarian at the lectern (a spawn of the
// record, hood up); Vex up the gallery stair with the whole page (LEGACY "The Last Margin", its line word for word, "stole"
// dropped). The speaker swap Librarian to Eraser on one beat. The boss intro; after a loss: the pan, Mira's tip, the card.
// A win chains eraser_after. 14 boxes. Sets vex_arrived, and answered_yes or answered_page.
async function eraser(s) {
  if (await s.hasFlag('eraser_defeated')) return;
  await s.music(null);
  await spawnNox(s, 'nox_spot', 'up');
  if (await s.hasFlag('eraser_tried')) {
    await s.spawn('eraser_v', { sprite: 'eraser_avatar', name: 'The Eraser', at: 'lectern', dir: 'down' });
    if (await s.hasFlag('vex_arrived')) await spawnVex(s, 'vex_stop', 'up');
    await s.camera.panTo('lectern', 40);
    await s.shake(2, 30);
    await say(s, 'mira', TIPS.eraser);
    await eraser_fight(s);
    return;
  }
  await s.spawn('ep8_librarian', { sprite: 'npc_librarian', name: 'The Librarian', at: 'lectern', dir: 'down' });
  await stage(s, 'party_stop');
  await s.camera.panTo('dais', 40);
  await narrate(s, 'The heart of the Library. On a dais, one vast open book glows like a lamp: the Concordance.');
  await s.camera.panTo('dome', 40);
  await narrate(s, 'Overhead, a dome of seven stars turns slowly back toward an eighth, with no sign.');
  await s.camera.panTo('lectern', 30);
  await say(s, 'ep8_librarian', 'You read the card.');
  await s.wait(30);
  await say(s, 'ep8_librarian', 'Mira. You always read everything.');
  await say(s, 'ep8_librarian', 'Give me the page, {hero}. Then it can be quiet.');
  await s.sfx('footstep_stone');
  await spawnVex(s, 'vex_gallery', 'down');
  await s.walk('vex_k', 'vex_stop', { speed: 'run' });
  await say(s, 'vex_k', 'Mended your bindings for two years. You never said your name. Now I know what it was hiding.');
  await s.face('vex_k', 'hero');
  await narrate(s, 'Vex takes the first page out of his coat, whole, and puts it in your hands.');
  await s.setFlag('vex_arrived');
  await say(s, 'vex_k', 'I kept one thing from the Eraser: your beginning. You keep the ending.');
  await narrate(s, 'The Librarian draws his hood forward. Under it, his face goes smooth and white, every line rubbed out.');
  // the swap: same mark, the avatar, the Eraser's name on the speaker tag
  await s.despawn('ep8_librarian');
  await s.spawn('eraser_v', { sprite: 'eraser_avatar', name: 'The Eraser', at: 'lectern', dir: 'down' });
  await s.sfx('rub_out');
  await say(s, 'eraser_v', 'AN EMPTY PAGE IS A PEACEFUL PAGE.');
  await say(s, 'eraser_v', 'THE LIBRARY FORGOT ITS GRIEF. I GAVE IT THAT. ONE LINE IS LEFT.');
  const c = await s.choice(["It's my name.", 'Then come and take it.']);
  if (c === 0) {
    await s.setFlag('answered_yes');
    await say(s, 'eraser_v', 'THEN I WILL TAKE IT, AND THE NIGHT WITH IT.');
  } else {
    await s.setFlag('answered_page');
    await say(s, 'eraser_v', 'I HAVE BEEN TAKING IT FOR SIXTEEN YEARS.');
  }
  await say(s, 'mira', TIPS.eraser);
  await narrate(s, EP8_ARC_LINES.eraser);
  await eraser_fight(s);
}
async function eraser_fight(s) {
  await s.setFlag('eraser_tried');
  await s.title(EP8_BOSS_CARDS.eraser.name, { sub: EP8_BOSS_CARDS.eraser.sub, frames: 100 });
  await s.shake(4, 30);
  await s.flash('#ffffff', 10);
  await s.music('boss_eraser');
  const result = await s.battle('eraser', { boss: true, canFlee: false });
  if (result !== 'win') return;
  await eraser_after(s);
}

// 25. ep8_last_word, after the win (also runnable on its own, from an enter trigger after a reload). The bible's order: the
// face, "Say it again", the pen, the Lexicon, the counter-seal, the mother, Nox's name. 17 boxes (budget 18). Gives
// name_fragment_8. Sets eraser_defeated, fragment8_get, lexicon_restored, keeper_named; chains last_choice.
async function eraser_after(s) {
  await s.setFlag('eraser_defeated');
  await spawnNox(s, 'nox_spot', 'up');
  await spawnVex(s, 'vex_stop', 'up');
  await s.spawn('eraser_v', { sprite: 'eraser_avatar', name: 'The Eraser', at: 'lectern', dir: 'down' });
  await s.camera.panTo('lectern', 20);
  await s.shake(3, 40);
  await s.sfx('boss_die');
  await s.flash('#ffffff', 16);
  await s.music('sorrow');
  await narrate(s, 'The Eraser goes down on one knee before the great book. The white face cracks, like old paint.');
  // the swap: same mark, the old man's face, his title on the speaker tag and the held portrait
  await s.despawn('eraser_v');
  await spawnFk(s, 'lectern', 'down');
  await narrate(s, "Under it is an old man's face: lined, gold-eyed, very tired.");
  await say(s, 'first_keeper', '...Say it again.');
  await say(s, 'mira', '{hero}.');
  await s.face('hero', 'mira');   // the hero turns at their name
  await s.wait(30);
  await narrate(s, 'He lays down his pen.');
  await say(s, 'first_keeper', 'I wanted it quiet. I only made it empty.');
  await s.camera.panTo('book_front', 20);
  await s.music('triumph');
  await s.sfx('name_restore');
  await s.flash('#fff2d0', 16);
  await narrate(s, 'The First Lexicon opens. Each rescued word takes its rightful place.');
  await narrate(s, 'The names of seven realms fly home onto its pages, out through the shelves and down the stair.');
  await s.give(REWARDS_EP8.fragment.item, REWARDS_EP8.fragment.qty);
  await s.setFlag('fragment8_get');
  await s.setFlag('lexicon_restored');
  await say(s, 'bram', 'Eight.');
  await say(s, 'mira', 'Eight. And the first.');
  await s.music('mystery');
  await narrate(s, 'Under your line in the First Lexicon, the counter-seal, and in the warm hand, an eighth time: Keep this one.');
  await s.face('nox_t', 'hero');
  await say(s, 'nox_t', 'I wrote that one before I ever wrote yours. I just never knew I would.');
  await s.camera.panTo('lectern', 20);
  await say(s, 'first_keeper', 'Your mother said it once. I took it out of the world. It stayed on you anyway.');
  await s.face('nox_t', 'first_keeper');
  await say(s, 'nox_t', 'You took mine for sixteen years.');
  await say(s, 'first_keeper', "...I know. I'm sorry.");
  await s.wait(30);
  await say(s, 'first_keeper', 'Nox.');
  await say(s, 'nox_t', 'Again tomorrow. And the day after.');
  await s.setFlag('keeper_named');
  await s.camera.follow('hero');
  await last_choice(s);
}

// 26. Chained from eraser_after (also runnable on its own after a reload, until an ending is set). The canon final choice,
// its labels and conclusions word for word, asked once more before it commits (plan 14: Yes, No; cancel answers No). Once
// an ending flag is set this scene never runs again and nothing offers the other. Sets ending_return or ending_choose;
// chains last_page.
const LAST_ASKS = 2;   // asked at most twice in one run (each with its confirm); the lectern trigger asks again after
async function last_choice(s) {
  if ((await s.hasFlag('ending_return')) || (await s.hasFlag('ending_choose'))) return;
  await s.music('mystery');
  let end = null;
  for (let ask = 0; ask < LAST_ASKS && !end; ask++) {
    await say(s, 'first_keeper', 'The names are theirs again. How do they go back?');
    const c = await s.choice([ENDINGS.return.label, ENDINGS.choose.label]);
    const pick = c === 0 ? ENDINGS.return : ENDINGS.choose;
    await narrate(s, pick.confirm);
    if ((await s.choice(['Yes.', 'No.'])) === 0) end = pick;
  }
  if (!end) return;   // No, twice over: nothing is set; the lectern's trigger (or a reload) asks again
  await s.setFlag(end.flag);
  for (const line of end.lines) await narrate(s, line);
  await s.title(end.title, { frames: 180 });
  await say(s, 'first_keeper', 'I cannot repair what I erased, but I can help return the keys to those whose names were stolen.');
  await say(s, 'first_keeper', 'The Library belongs to them now.');
  await last_page(s);
}

// 27. Chained from last_choice (also runnable on its own after a reload, once an ending is set). The first shelf, the page
// on it, the Concordance's run read back in three steps (the birth line, the eleven names, his own name as a smudge only he
// reads), the eighth star, the Ledger's last row, the last page, the witness line. 15 boxes. Sets page_shelved, night_read,
// eighth_star, hero_kept.
async function last_page(s) {
  if (!(await s.hasFlag('ending_return')) && !(await s.hasFlag('ending_choose'))) return;
  await s.music(null);
  await spawnNox(s, 'nox_shelf', 'up');
  await stage(s, 'shelf_stage');
  await s.camera.panTo('shelf', 30);
  await say(s, 'nox_t', "That's your place. It's been empty a long time.");
  let open = await page(s, 'ep8_shelf', 'shelved');
  await narrate(s, 'You put the first page on the shelf. It fits.');
  await narrate(s, "The warm hand, the counter-seal, Marten's mark, and at the foot: Nox.");
  await s.setFlag('page_shelved');
  await s.camera.panTo('book_front', 20);
  open = (await page(s, 'ep8_shelf', 'run', 1)) || open;
  await narrate(s, 'In the Concordance the ink runs back up its page. First a birth line, whole, in a plain hand.');
  await s.sfx('read_cast');
  await say(s, 'mira', 'A child, to Elowen, Keeper of the Scriptorium.');
  open = (await page(s, 'ep8_shelf', 'run', 2)) || open;
  await narrate(s, 'Then eleven names, back where they were sworn.');
  open = (await page(s, 'ep8_shelf', 'run', 3)) || open;
  await narrate(s, "Then the warnings and the account. Over the cause, nobody's doing lifts off. Under it, in the cold hand, a name.");
  await s.camera.panTo('lectern', 20);
  await say(s, 'first_keeper', '...My doing.');
  await s.setFlag('night_read');
  await unpage(s, open);
  await s.camera.panTo('shelf', 20);
  await s.face('mira', 'hero');
  await say(s, 'mira', 'Elowen. The Keeper with the register.');
  await s.emote('hero', '!');
  await s.camera.panTo('dome', 30);
  open = await page(s, 'ep8_shelf', 'star');
  await s.sfx('kept');
  await narrate(s, 'Overhead, the eighth star lights, and takes a sign: an open book with one line written in it.');
  await s.setFlag('eighth_star');
  await unpage(s, open);
  await say(s, 'mira', 'The eighth star. It has a sign.');
  await say(s, 'bram', 'Yours.');
  await s.sfx('name_restore');
  if ('hudNameFlash' in s) await s.hudNameFlash('hero');
  else await s.flash('#fff2d0', 12);
  await s.setFlag('hero_kept');
  await s.camera.panTo('book_front', 30);
  open = await page(s, 'ep8_last_page');
  await narrate(s, '{hero} turns the final page. It is empty, ready for the next story.');
  await unpage(s, open);
  let n = 0;
  for (let i = 0; i < WITNESS_FLAGS.length && n < 5 && n + WITNESS_FLAGS.length - i >= 5; i++) if (await s.hasFlag(WITNESS_FLAGS[i])) n++;
  for (const line of n >= 5 ? WITNESS_LINES.many : WITNESS_LINES.few) await narrate(s, line);
  await s.music('scriptorium_town');
  await s.camera.follow('hero');
}

// ================================================================================================
// Act VI: Home (ep8_scriptorium, hero_home, ep8_bell_night)
// ================================================================================================

// 28. ep8_scriptorium, on arrival through the Library door (square_return) after page_shelved. Dusk. Every half-word
// finishes; Arun's candles light; Meya writes her name; Elowen remembers and says it; her gift by her truth choice; Vex on
// the bindery step; Nox stays with the First Keeper at the Index door. 13 boxes. Sets scriptorium_open.
async function scriptorium_open(s) {
  await s.music(null);
  await s.tint('dusk', 0);
  await spawnVex(s, 'vex_step', 'down', 'npc_vex_kneel');
  await spawnFk(s, 'index_door', 'down');
  await spawnNox(s, 'nox_index', 'down');
  await stage(s, 'library_stage');
  await s.camera.panTo('codex', 40);
  await narrate(s, 'Every half-word on every sign finishes itself. The pens in the canal railings drip ink.');
  await s.music('scriptorium_town');
  await s.camera.panTo('arun_post', 20);
  await s.face('arun', 'hero');
  await say(s, 'arun', 'A new flame appears whenever someone tells the truth.');
  await stage(s, 'steps_stage');
  await s.camera.panTo('meya_steps', 20);
  await narrate(s, 'Meya writes her own name on the second page of her book, and holds it up.');
  await say(s, 'mira', 'Questions first. Then spells.');
  await say(s, 'mira', "I'll come back. Somebody should teach up here.");
  await stage(s, 'stall_stage');
  await s.camera.panTo('stall', 20);
  await s.face('elowen', 'hero');
  await say(s, 'elowen', "...You're tall.");
  await say(s, 'elowen', "I said your name at the eleventh hour. Then it was gone, and I've missed it every spring since.");
  await s.wait(30);
  await say(s, 'elowen', '{hero}.');
  await s.face('hero', 'elowen');   // the hero turns at it
  await say(s, 'elowen', "I'm not going to ask for you back. You've a home.");
  await s.wait(30);
  await say(s, 'elowen', 'I wanted you to have your name. You did. That\'s all.');
  const gift = (await s.hasFlag('told_elowen')) ? REWARDS_EP8.gift_truth : REWARDS_EP8.gift_kind;
  await s.give(gift.item, gift.qty);
  await say(s, 'elowen', "For the road home. Write to me. I'll put it in the register.");
  await s.camera.panTo('vex_step', 30);
  await say(s, 'vex_k', "Somebody has to mend all this. I'm done moving.");
  await s.camera.panTo('index_door', 30);
  await say(s, 'nox_t', "I'll stay a while. Somebody should keep him honest.");
  await s.title('The Scriptorium', { sub: 'An Open Library', frames: 160 });
  await s.camera.follow('hero');
  await s.setFlag('scriptorium_open');
}

// 29. ep8_scriptorium, step trigger home_trig at the South Margin gate (if: scriptorium_open; Talk names it). The scene owns
// the time and place: the stair down and the roof on black, the flight, Hazel at the door of hero_home (s.goto when E8-scene-ui
// has it; without it the door is on black too), the third truth choice. Ends on the bell night (warp to ep8_bell_night's
// foot). 9 boxes (10 on black). Sets home_reached, and told_hazel or spared_hazel.
async function home(s) {
  await s.music(null);
  await s.fade('out', 60);
  await narrate(s, 'Down the stair of light, every line of it written again. On the Stillheart roof, the Kestrel is waiting.');
  await say(s, 'aeris_t', "Told you I'd be here.");
  await s.music('triumph');
  await narrate(s, 'The Kestrel flies south at sunset, over the realms. Every one of them is on the map again.');
  await narrate(s, 'She sets down in Willowmere Valley in the dusk.');
  const door = 'goto' in s;
  if (door) {
    await s.goto('hero_home', HOME_DOOR[0], HOME_DOOR[1], 'up');
    await s.tint('dusk', 0);
    await s.spawn('hazel', { sprite: 'npc_parent', name: 'Hazel', at: 'hazel_start', dir: 'down' });
    await s.fade('in', 40);
    await s.walk('hazel', 'hero');
  } else {
    await narrate(s, 'Hazel is at the door of the house, a dish towel over her shoulder.');
  }
  await s.music('willowmere');
  await say(s, 'hazel', 'There you are.');
  await say(s, 'hazel', 'Did you find them? Where you came from?');
  const c = await s.choice(['I did.', 'No.']);
  if (c === 0) {
    await s.setFlag('told_hazel');
    await say(s, 'hazel', '...Good. Then you know you came home on purpose.');
  } else {
    await s.setFlag('spared_hazel');
    await say(s, 'hazel', 'You never could lie to me. Come in anyway.');
  }
  await say(s, 'hazel', 'The bells have been ringing all day. Every one of them. Go and listen.');
  await s.setFlag('home_reached');
  await s.fade('out', 60);
  s.warp('ep8_bell_night', BELL_FOOT[0], BELL_FOOT[1], 'up');
}

// 30. ep8_bell_night, on enter (the arrival: night, Mira and Bram on the bell beam, no box) and again on the top step
// trig_thirteenth (after the twelfth toll: the thirteenth). The bookend of the whole game, EPISODE1 scene 1 played again:
// the twelve tolls are ep8_toll_1 to _12 (below), the thirteenth shows {hero}. KEEP ONE on the beam is the map's decal and
// inspect (ep8_keep_one). The party followers do not climb (map contract: ep8_bell_night hides them, the cold open's
// solo climb). Sets ep8_complete; the hooks then roll CREDITS_EP8 (counter credits8_rolled) and wake at hero_home bed.
async function thirteenth_name(s) {
  if (!(await s.hasFlag(EP8_TOLL_FLAGS[EP8_TOLL_FLAGS.length - 1]))) {
    await s.music(null);
    await s.tint('night', 0);
    await s.spawn('mira_beam', { sprite: 'mira', name: 'Mira', at: 'mira_beam', dir: 'down' });
    await s.spawn('bram_beam', { sprite: 'bram', name: 'Bram', at: 'bram_beam', dir: 'down' });
    await s.fade('in', 60);
    return;
  }
  await s.wait(24);
  await s.music(null);
  await s.sfx('bell_thirteenth');
  await s.shake(3, 30);
  await all(s.emote('hero', '!'), s.camera.panTo('bells', 60));
  if ('tollName' in s) await s.tollName('{hero}');
  else await narrate(s, '{c:gold}{hero}{/c}');
  await s.wait(90);   // the bells hang still: a held quiet
  await s.fade('out', 60);
  await s.title(COLD_OPEN_CARD.text, { sub: COLD_OPEN_CARD.sub, frames: 240, card: 'paint_card_bell_tower' });
  await s.music('the_last_word');
  await s.title(END_TITLE_EP8.text, { sub: END_TITLE_EP8.sub, frames: 240 });
  await s.setFlag('ep8_complete');
}

// The twelve toll steps of the bell night (the cold open's tollScene shape: step n tolls once, only after step n-1; a
// player who stops leaves the bells waiting). No box: the name is the toll's caption (s.tollName, E8-scene-ui).
function tollStep(n) {
  return async (s) => {
    await s.sfx('bell_toll');
    await s.setFlag(EP8_TOLL_FLAGS[n - 1]);
    if ('tollName' in s) await s.tollName(EP8_TOLL_NAMES[n - 1]);
    await s.wait(84);
  };
}
/** The toll step ids (ep8_bell_night's trig_toll_1 to _12 point at them); outside the 37 story scenes, as ep1's are. */
export const TOLL_IDS = EP8_TOLL_FLAGS;

// ------------------------------------------------------------------------------------------------
// Side stories (EPISODE8.md section 2)
// ------------------------------------------------------------------------------------------------

// The Living Concordance. Ione's talk entry once the party has arrived starts it, and she is her own witness at once
// (testimony_ione chained, registered for its Talk replay); then Fen's and Elowen's talk entries (Elowen's after
// elowen_met); then the folio object in the square (concordance_light).
async function concordance_start(s) {
  await s.face('ione', 'hero');
  await say(s, 'ione', "The folio in the square is the street's own leaf of the Concordance. It has been dark for years.");
  await say(s, 'ione', 'It wants three witnesses before it will light. Fen, by the Index steps. Elowen, at the register. And me.');
  await say(s, 'bram', 'Witnesses again. Mira loves witnesses.');
  await s.setFlag('concordance_started');
  await testimony_ione(s);
}
async function testimony_ione(s) {
  await say(s, 'ione', 'We were ordered to file grief as a mistake. I witnessed seven regions change despite the Library.');
  await say(s, 'ione', 'An honest archive must record both joy and loss.');
  await s.setFlag('testimony_ione');
}
async function testimony_fen(s) {
  await s.face('fen', 'hero');
  await say(s, 'fen', "There was once a list of names no one was allowed to forget.");
  await say(s, 'fen', 'The Eraser destroyed it because he could not bear the people he had lost.');
  await s.setFlag('testimony_fen');
}
async function testimony_elowen(s) {
  await s.face('elowen', 'hero');
  await say(s, 'elowen', 'Each binding hides one witness page.');
  await say(s, 'elowen', 'The oldest pages were amended by the First Keeper, not written by fate. Even he was afraid.');
  await s.setFlag('testimony_elowen');
}
// The folio object (concordance) in the square (if: concordance_started). Before the three witnesses: one box. Lit: one
// box (a rest and save point from concordance_lit, key ep8_folio). +25 Fury at the Eraser from concordance_lit.
const TESTIMONIES = ['testimony_ione', 'testimony_fen', 'testimony_elowen'];
async function concordance_light(s) {
  if (await s.hasFlag('concordance_lit')) {
    await narrate(s, 'The Concordance folio glows under its glass. People stop to read it, and add a line.');
    return;
  }
  for (const f of TESTIMONIES) {
    if (!(await s.hasFlag(f))) {
      await narrate(s, 'The Concordance folio: one great leaf under glass, dark. Three witnesses light it, Ione says.');
      return;
    }
  }
  await stage(s, 'folio_stage');
  await narrate(s, "The three witnesses' words go into the folio. It lights from inside, one line at a time.");
  await s.sfx('name_restore');
  await s.flash('#fff2d0', 12);
  await s.give(REWARDS_EP8.concordance.item, REWARDS_EP8.concordance.qty);
  await s.give(REWARDS_EP8.concordance_ether.item, REWARDS_EP8.concordance_ether.qty);
  await s.give('gold', REWARDS_EP8.concordance.gold);
  await s.give(REWARDS_EP8.concordance_coat.item, REWARDS_EP8.concordance_coat.qty);
  await say(s, 'mira', 'Three witnesses, one page lit. Whoever is up there will feel it.');
  await s.setFlag('concordance_lit');
  await s.setFlag('concordance_done');
}

// Quinn's Drifting Pages. Quinn's talk entry from scriptorium_arrived starts it; the three pages are chests (drift_1_found to
// drift_3_found, present once drift_started); his talk entry with all three found ends it. Cut line 1 drops it (EPISODE8
// section 2): Quinn keeps his canon lines and his LEGACY line becomes the inspect ep8_first_drawer.
async function drift_start(s) {
  await s.face('quinn', 'hero');
  await say(s, 'quinn', 'I carry fresh ink and binding cord between the library wings.');
  await say(s, 'quinn', "Three of my pages drifted off. One's on a ledge of the Stair. Two blew into the Library's first floor.");
  await say(s, 'bram', 'Loose pages. In a library. Somebody should make a rule.');
  await s.setFlag('drift_started');
}
async function drift_done(s) {
  await s.face('quinn', 'hero');
  await narrate(s, 'You hand Quinn three loose pages. He smooths each one flat and binds it back into his satchel book.');
  await s.take(REWARDS_EP8.drift_page.item, REWARDS_EP8.drift_page.qty);
  await say(s, 'quinn', 'Three back. Here. For all the running about.');
  await s.give(REWARDS_EP8.drift.item, REWARDS_EP8.drift.qty);
  await narrate(s, 'On the last page he stops, and reads out the oldest line he has found.');
  await say(s, 'quinn', 'The original record was deliberately left unfinished so its ending could be chosen.');
  await s.setFlag('drift_done');
}

// ------------------------------------------------------------------------------------------------
// Scene registry. Every flag is declared in flags.js. `ep8_morning` needs the switch (live) and not Fine Print; every other
// chain bottoms out at ep8_started, which only ep8_morning sets.
// ------------------------------------------------------------------------------------------------
const DRIFT = ['drift_1_found', 'drift_2_found', 'drift_3_found'];
const ENDED = ['ending_return', 'ending_choose'];
export const SCENE_CONDITIONS = {
  ep8_morning: { if: 'ep7_complete', ifNot: ['ep8_morning_done', 'tier_1'], live: true },
  ep8_roof: { if: 'ep8_started', ifNot: 'ep8_roofed' },
  stair_arrival: { if: 'ep8_roofed', ifNot: 'stair_arrived' },
  first_rub: { if: 'stair_arrived', ifNot: 'first_rub_done' },
  first_book: { if: 'first_rub_done', ifNot: 'first_book_read' },
  rubbed_steps: { if: 'first_book_read', ifNot: 'eraser_seen' },
  south_margin: { if: 'stair_arrived', ifNot: 'saw_scriptorium' },
  scriptorium_arrival: { if: 'stair_arrived', ifNot: 'scriptorium_arrived' },
  first_word: { if: 'scriptorium_arrived', ifNot: 'read_learned' },
  meet_librarian: { if: 'read_learned', ifNot: 'librarian_met' },
  elowen_scriptorium: { if: 'read_learned', ifNot: 'elowen_met' },
  library_door: { if: ['card_read', 'elowen_met'], ifNot: 'library_open' },
  catalog_arrival: { if: 'library_open', ifNot: 'lib_f1_arrived' },
  keeper_memory_a: { if: 'lib_f1_arrived', ifNot: 'keeper_memory_a' },
  library_f1_lift: { if: 'lib_f1_arrived', ifNot: 'library_f1_done' },
  palimpsest_arrival: { if: 'library_f1_done', ifNot: 'lib_f2_arrived' },
  keeper_memory_b: { if: 'lib_f2_arrived', ifNot: 'keeper_memory_b' },
  unnamed_sentry: { if: 'lib_f2_arrived', ifNot: 'sentry_defeated' },
  library_f2_lift: { if: 'sentry_defeated', ifNot: 'library_f2_done' },
  uncensored_archive: { if: 'lib_f2_arrived' },
  unwritten_arrival: { if: 'library_f2_done', ifNot: 'lib_f3_arrived' },
  keeper_memory_c: { if: 'lib_f3_arrived', ifNot: 'keeper_memory_c' },
  the_name: { if: ['keeper_memory_c', 'ink_key_found'], ifNot: 'name_told' },
  eraser: { if: 'name_told', ifNot: 'eraser_defeated' },
  eraser_after: { if: 'eraser_defeated', ifNot: 'keeper_named' },
  last_choice: { if: 'keeper_named', ifNot: ENDED },
  last_page: { if: 'keeper_named', ifNot: 'page_shelved' },
  scriptorium_open: { if: 'page_shelved', ifNot: 'scriptorium_open' },
  home: { if: 'scriptorium_open', ifNot: 'home_reached' },
  thirteenth_name: { if: 'home_reached', ifNot: 'ep8_complete' },
  concordance_start: { if: 'scriptorium_arrived', ifNot: 'concordance_started' },
  testimony_ione: { if: 'concordance_started', ifNot: 'testimony_ione' },
  testimony_fen: { if: 'concordance_started', ifNot: 'testimony_fen' },
  testimony_elowen: { if: ['concordance_started', 'elowen_met'], ifNot: 'testimony_elowen' },
  concordance_light: { if: 'concordance_started' },
  drift_start: { if: 'scriptorium_arrived', ifNot: 'drift_started' },
  drift_done: { if: DRIFT, ifNot: 'drift_done' },
};
EP8_TOLL_FLAGS.forEach((f, i) => {
  SCENE_CONDITIONS[f] = { if: i === 0 ? 'home_reached' : EP8_TOLL_FLAGS[i - 1], ifNot: [f, 'ep8_complete'] };
});

const RAW = {
  ep8_morning, ep8_roof,
  stair_arrival, first_rub, first_book, rubbed_steps, south_margin,
  scriptorium_arrival, first_word, meet_librarian, elowen_scriptorium, library_door,
  catalog_arrival, keeper_memory_a, library_f1_lift, palimpsest_arrival, keeper_memory_b, unnamed_sentry, library_f2_lift,
  uncensored_archive, unwritten_arrival, keeper_memory_c, the_name,
  eraser, eraser_after, last_choice, last_page,
  scriptorium_open, home, thirteenth_name,
  concordance_start, testimony_ione, testimony_fen, testimony_elowen, concordance_light, drift_start, drift_done,
};
EP8_TOLL_FLAGS.forEach((f, i) => { RAW[f] = tollStep(i + 1); });

export const scenes = Object.fromEntries(Object.entries(RAW).map(([id, fn]) => [id, cut(fn, SCENE_CONDITIONS[id])]));

/** The side scenes (plan 2.5) and the silent lift steps; everything else of the 37 is main or chained. */
export const SIDE = ['concordance_start', 'testimony_ione', 'testimony_fen', 'testimony_elowen', 'concordance_light', 'uncensored_archive',
  'drift_start', 'drift_done'];
export const SILENT = ['library_f1_lift', 'library_f2_lift'];
/** The story scenes (37): everything but the twelve toll steps. */
export const STORY_IDS = Object.keys(RAW).filter((id) => !EP8_TOLL_FLAGS.includes(id));
// The main-path scenes in story order, for the box-budget and playthrough tests (the chained eraser_after, last_choice and
// last_page are counted on their own, and stopped at the chain point inside the scene that chains them).
export const MAIN_PATH = ['ep8_morning', 'ep8_roof', 'stair_arrival', 'first_rub', 'first_book', 'rubbed_steps', 'south_margin',
  'scriptorium_arrival', 'first_word', 'meet_librarian', 'elowen_scriptorium', 'library_door', 'catalog_arrival', 'keeper_memory_a',
  'library_f1_lift', 'palimpsest_arrival', 'keeper_memory_b', 'unnamed_sentry', 'library_f2_lift', 'unwritten_arrival',
  'keeper_memory_c', 'the_name', 'eraser', 'scriptorium_open', 'home', 'thirteenth_name'];
export const CHAINED = ['eraser_after', 'last_choice', 'last_page'];
/** Box budgets (EPISODE8.md section 1, E8-story brief item 5): 12 per main scene, except these. */
export const BOX_BUDGET = { default: 12, ep8_morning: 6, elowen_scriptorium: 14, keeper_memory_c: 16, the_name: 16, eraser: 16,
  eraser_after: 18, last_page: 16, scriptorium_open: 16, home: 14 };
/** The close-up payoffs (plan 9.4): scene -> [kind, mode, step], in order (each scene's own, before it chains). */
export const PAYOFFS = {
  ep8_morning: [['ep8_note', undefined, undefined]],
  first_word: [['ep8_first_word', 'rubbed', undefined], ['ep8_first_word', 'read', undefined]],
  meet_librarian: [['ep8_card', 'card', undefined]],
  elowen_scriptorium: [['ep8_seal', 'tag', undefined], ['ep8_seal', 'match', undefined], ['ep8_seal', 'run', undefined]],
  keeper_memory_b: [['ep8_card', 'beside', undefined]],
  keeper_memory_c: [['ep8_could_not', 'run', undefined], ['ep8_could_not', 'note', undefined]],
  last_page: [['ep8_shelf', 'shelved', undefined], ['ep8_shelf', 'run', 1], ['ep8_shelf', 'run', 2], ['ep8_shelf', 'run', 3],
    ['ep8_shelf', 'star', undefined], ['ep8_last_page', undefined, undefined]],
};

export function register() {
  return STORY.registerStory({ scenes, lines: {}, conditions: SCENE_CONDITIONS });
}

export default register;
