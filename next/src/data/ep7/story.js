// Lexicon Quest NEXT, Episode 7: "The Vanishing World". Every scene of docs/story/EPISODE7.md section 1 and the side scenes
// of docs/EPISODE7_PLAN.md section 2.5. Cutscene API only (DESIGN 5.4); staging in docs/story/STAGING_EP7.md. Writing
// rules as ep6: one idea per box, at most 3 lines of 42 characters, ASCII, no em dashes, {hero} = the player's name. The
// hero never speaks: choices, emotes, and what the others say. Call is a narration, a sound and a picture, never a box.
//
// STAGING (CRITIQUE_6 item 11). Before the first line of anyone outside the party, stage(s, spot) walks the hero to `spot`
// (two tiles below the speaker), Mira to `spot_m` (one tile left of it) and Bram to `spot_b` (one tile right). Vex stands
// two rows above the party at the Traveler's Wall, and he is spawned as `vex_k`, never `vex` (Episode 2's in-glass id,
// world/reflections.js), as Episodes 5 and 6 do.
//
// SHOWING (CRITIQUE_6 item 3, CRITIQUE_7 item 7). The payoffs open a close-up page through page(s, kind, mode): `ep7_chart`
// (fading), `ep7_carving` (fading, whole), `ep7_tally`, `ep7_tag`, `ep7_seventh`, `ep7_page` (half, joined, mark, signed:
// the signature last, each mode called on the box that says it) and `ep7_letter` (restored), only when PAGE_KINDS has the
// kind (E7-tiles, wave 7b). The lines said over a page work without it, so until the pages land the scene reads as
// narration over the field.
//
// THE NAMES. The Keeper is "The Keeper" (the Palehaven record `keeper`, the scene spawn `keeper_t`, the memory spawn
// `keeper_mid_m`) until Mira reads the signature in whole_page; on that beat keeper_t is despawned and nox_t ("Nox") spawned
// on the same mark, the Episode 4 to 6 swap. Her brother is "A Courier" (`courier_m`) in memory and "Marten" from the same
// page (`marten_named`). qa/content/ep7_story.test.mjs scans every box before them.
//
// PACK HELPERS (E7-scene-ui, wave 7d; each used only when the cutscene has it, `name in s`, so the boxes are the same
// without): s.frostBlot(who) (a "..." box under a frost texture with a soft `ice`: a name the ice took out of a memory; the
// fallback is a plain "..." box and the `ice` sfx), s.frostNames(ids, level) (the battle's Rime drawer on the field's party
// row: level 0 to 3), s.actorAlpha(id, alpha, frames) (a sprite's alpha, for the whiteout's fade).
//
// THE SWITCH. `ep7_morning` also needs EP7_LIVE (GATE.live, read at call time; the pack's ?ep=7 developer entry may set it)
// and not tier_1; the pack patch's enter trigger checks counter credits6_rolled. Every other scene needs a flag only an
// Episode 7 scene sets. Registration: part of the lazy `ep7` pack. register() hands scenes and guards to registerStory.

import * as EPISODES from '../../game/episodes.js';
import * as STORY from '../../game/story.js';
import { PAGE_KINDS } from '../../world/closeup.js';
import { standsOn } from '../maps/ep3/_opening.js';
import { REWARDS_EP7 } from './quests.js';
import { EPISODE8_CARD, END_TITLE_EP7, EP7_ARC_LINES, EP7_BOSS_CARDS } from './text.js';

/**
 * Where Episode 7 opens: the Chart Room (ep6_zl_charts), mark charts_dawn, two tiles below Aeris at the skychart table
 * (EPISODE7 beat 1, revision 2). E7-maps-a's withEp7Charts puts charts_dawn on exactly this cell (STAGING_EP7 section 3).
 */
export const CHARTS_STAGE = [6, 6];

// Speakers with portraits (a missing one draws none). Nox, Aeris, the town and the memories have none (plan 9.5).
const PORTRAIT = { hero: 'hero', mira: 'mira', bram: 'bram', vex_k: 'silver_rogue', white_phantom: 'phantom' };

const say = (s, who, text) => s.say(who, text, PORTRAIT[who] ? { portrait: PORTRAIT[who] } : {});
const narrate = (s, text) => s.say(null, text);
const all = (...promises) => Promise.all(promises);

/** The party to its marks: the hero on `spot`, Mira on `spot_m`, Bram on `spot_b` (STAGING_EP7.md section 1). */
async function stage(s, spot) {
  await s.walk('hero', spot);
  await all(s.walk('mira', `${spot}_m`), s.walk('bram', `${spot}_b`));
}
/** Open a close-up page when its kind is registered (E7-tiles); true when it opened. */
async function page(s, kind, mode) {
  if (!PAGE_KINDS[kind]) return false;
  await s.closeup(kind, mode ? { mode } : {});
  return true;
}
async function unpage(s, open) { if (open) await s.closeup(null); }
/** A name the ice took out of a memory: the pack's frost-blot box, or a plain "..." box and the `ice` sfx. */
async function blot(s, who) {
  if ('frostBlot' in s) { await s.frostBlot(who); return; }
  await s.sfx('ice');
  await s.say(who, '...');
}
/** The whiteout's fade on the field (sprite alpha and the HUD frost), when the pack helpers exist. */
async function fadeFriends(s, alpha, frames, frost) {
  if ('actorAlpha' in s) await all(s.actorAlpha('mira', alpha, frames), s.actorAlpha('bram', alpha, frames));
  if ('frostNames' in s) await s.frostNames(['mira', 'bram'], frost);
}

const spawnAeris = (s, at, dir = 'down') => s.spawn('aeris_t', { sprite: 'npc_aeris', name: 'Aeris', at, dir });
const spawnVex = (s, at, dir = 'down', sprite = 'npc_vex') => s.spawn('vex_k', { sprite, name: 'Vex Quill', at, dir });
const spawnKeeper = (s, at, dir = 'down') => s.spawn('keeper_t', { sprite: 'npc_keeper', name: 'The Keeper', at, dir });
const spawnNox = (s, at, dir = 'down') => s.spawn('nox_t', { sprite: 'npc_keeper', name: 'Nox', at, dir });
/** Move the Zephyr Landing record `aeris` to a mark for one scene (spawn replaces the map actor; a reload puts her back). */
const placeAeris = (s, at, dir = 'down') => s.spawn('aeris', { sprite: 'npc_aeris', name: 'Aeris', at, dir });

export const GATE = { live: EPISODES.EP7_LIVE === true };
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

/** Mira's two boss tips (plan 6.6: each names a lever the boss's data has; a contract with E7-battle). */
export const TIPS = {
  pale_lantern: 'When it borrows one of us, call them back, {hero}. Before its turn.',
  white_phantom: 'When it says goodbye to one of us, call them, {hero}. Before it lands.',
};

// ================================================================================================
// Act I: Zephyr Landing, the chart that forgets
// ================================================================================================

// 1. Triggered on enter of ep6_zl_inn (where the Episode 6 credits wake the save; the pack patch's ep7_wake), staged in
// ep6_zl_charts (Scott 2026-11-11: not the inn room). Anywhere but charts_dawn the first step, on black, moves the party to
// the Chart Room; the room's own enter trigger ep7_wake_charts (E7-maps-a's withEp7Charts) then runs the scene there. Five
// boxes, six without the White Road letter; the chart close-up on the second. Gives white_road_letter only when Piri's
// Dead Letters did not. Sets ep7_morning_done, ep7_started.
async function ep7_morning(s) {
  if ((typeof s.mapId === 'string' && s.mapId !== 'ep6_zl_charts') || !standsOn(s, CHARTS_STAGE, true)) {
    await s.fade('out', 30);
    s.warp('ep6_zl_charts', CHARTS_STAGE[0], CHARTS_STAGE[1], 'up');
    return;
  }
  if ('openingTint' in s) await s.openingTint('dawn');
  else await s.tint('dawn', 0);
  await spawnAeris(s, 'aeris_table7', 'down');
  await stage(s, 'charts_dawn');
  await s.camera.panTo('north_window', 0);
  await s.fade('in', 40);
  await narrate(s, 'Dawn. The compass hums on the skychart table, needle north. Frost on the north window, on the inside.');
  await s.camera.panTo('compass_table', 20);
  await say(s, 'aeris_t', "Couldn't sleep. Look at this. Look fast.");
  const open = await page(s, 'ep7_chart', 'fading');
  await s.music(null);
  if (open) await s.wait(44);   // one valley's name lifts off the paper over 40 frames (plan 9.4)
  await say(s, 'aeris_t', "That was a valley last night. A road, two farms, a mill. Now it's paper.");
  await unpage(s, open);
  await s.music('zephyr');
  await say(s, 'mira', 'Then we go now.');
  await say(s, 'bram', 'Before breakfast. Of course before breakfast.');
  if (!(await s.hasFlag('white_road_letter_get'))) {
    await say(s, 'aeris_t', "And Piri sent this up. Said it's going the right way at last.");
    await s.give(REWARDS_EP7.white_road.item, REWARDS_EP7.white_road.qty);
  }
  await s.camera.follow('hero');
  await s.setFlag('ep7_morning_done');
  await s.setFlag('ep7_started');
}

// 3. ep6_zephyr, the gangway object north_gangway at the north dock (if: ep7_started). Aeris is the map's own record,
// moved for the scene; Vex is already in the fourth seat. Two boxes; the berth's boat door (if: ep7_boarded) does the
// flight, and ep7_landing opens on it. Sets ep7_boarded.
async function ep7_board(s) {
  await placeAeris(s, 'aeris_gangway7', 'down');
  await spawnVex(s, 'vex_seat', 'down');
  await stage(s, 'gangway7');
  await say(s, 'vex_k', 'I booked four seats. I meant to use mine twice.');
  await s.face('aeris', 'hero');
  await say(s, 'aeris', 'North. Hold on to something. Bram knows how.');
  await s.setFlag('ep7_boarded');
}

// ================================================================================================
// Act II: The White Road (ep7_white_road, ep7_waystation)
// ================================================================================================

// 4. ep7_white_road, on enter by the berth door at lake_landing. The flight is the first box. Aeris is a scene spawn at
// the Kestrel (she waits here); Vex walks on ahead up the road. Sets road_arrived.
async function ep7_landing(s) {
  await spawnAeris(s, 'aeris_landing', 'up');
  await spawnVex(s, 'vex_landing', 'up');
  await stage(s, 'landing_stage');
  await narrate(s, 'Cloud, then white mountains. A valley flickers out under the hull. The Kestrel sets down on a frozen lake.');
  await s.walk('vex_k', 'vex_ahead_l');
  await s.despawn('vex_k');
  await s.camera.panTo('gap_a', 40);
  await s.face('aeris_t', 'hero');
  await say(s, 'aeris_t', "I don't land where the chart says nothing. This is the last place it says something. I'll wait.");
  await say(s, 'bram', 'The road has holes in it.');
  await say(s, 'mira', 'Not holes. Gaps. Somebody forgot those parts.');
  await s.camera.follow('hero');
  await s.setFlag('road_arrived');
}

// 5. ep7_white_road, step trigger wall_trig at the Traveler's Wall (LEGACY "The Name Under Ice", kept and staged). Vex
// kneels at vex_wall with his back to the party, which stops on wall_stop two rows below. The first truth choice (the H4
// pattern: small and honest, never a locked route). 9 boxes (12 until E7-fixes trimmed it: the first fight comes sooner).
// Gives valewyn_list. Sets vex_carved, valewyn_list_get, and told_vex or spared_vex.
async function name_under_ice(s) {
  await spawnVex(s, 'vex_wall', 'up', 'npc_vex_kneel');
  await stage(s, 'wall_stop');
  await s.camera.panTo('vex_wall', 30);
  await say(s, 'vex_k', 'Travelers carve their names here going up. So the road knows to bring them back down.');
  await s.music(null);
  await s.sfx('ice');   // the first cut of the knife
  const open = await page(s, 'ep7_carving', 'fading');
  await narrate(s, 'He cuts VEX QUILL into the ice, fresh and deep. Then the letters start to go white, one by one.');
  await unpage(s, open);
  await say(s, 'vex_k', 'Now you understand why I keep moving.');
  await say(s, 'vex_k', "Read it to me. What's left?");
  await s.music('mystery');
  const c = await s.choice(['Half of it.', 'All of it.']);
  if (c === 0) {
    await s.setFlag('told_vex');
    await say(s, 'vex_k', "...Thanks. Nobody's ever said it straight.");
  } else {
    await s.setFlag('spared_vex');
    await say(s, 'vex_k', 'Liar. Kind one.');
  }
  await spawnVex(s, 'vex_wall', 'down');   // he gets up off the ice
  await narrate(s, "He takes Valewyn's list from his coat, the seal of the empty book on it. At the top, his own name, half gone.");
  await say(s, 'vex_k', "That's the name I wasn't ready to hand anyone. Mine. Take it. I'm tired of carrying it.");
  await s.give(REWARDS_EP7.valewyn_list.item, REWARDS_EP7.valewyn_list.qty);
  await s.setFlag('valewyn_list_get');
  await say(s, 'mira', 'When did they write you down?');
  await say(s, 'vex_k', 'Twelve years ago. A while after I said yes to a letter.');
  await s.walk('vex_k', 'vex_ahead');
  await s.despawn('vex_k');
  await s.music('high_moor');
  await s.camera.follow('hero');
  await s.setFlag('vex_carved');
}

// 6. ep7_white_road, step row fight_row (if: vex_carved). The teaching fight for Rime: e7w_first, no flee. Mira's line names
// the button (the E6-fixes A3 lesson); the Frozen message is the battle's (EP7_BATTLE_TEXT.frozen). No tutorial box. A
// loss sets nothing. Sets road_fight_done.
async function road_fight(s) {
  await s.camera.panTo('foes_drop', 30);
  await s.sfx('rime_bite');
  await narrate(s, 'Wolves out of the snow: two of them, white as the drifts, frost on their jaws.');
  await s.spawn('foe_wolf', { sprite: 'rime_wolf', name: 'Rime Wolf', at: 'foes_drop', dir: 'down' });
  await s.spawn('foe_wolf_b', { sprite: 'rime_wolf', name: 'Rime Wolf', at: 'foes_drop_b', dir: 'down' });
  await all(s.emote('mira', '!'), s.emote('bram', '!'));
  await s.camera.follow('hero');
  await say(s, 'mira', 'Cold bites. If your name starts to frost, Defend and shake it off.');
  const result = await s.battle('e7w_first', { canFlee: false });
  if (result !== 'win') return;
  await all(s.despawn('foe_wolf'), s.despawn('foe_wolf_b'));
  await say(s, 'bram', 'My name was cold. My NAME. Is that a thing now?');
  await s.setFlag('road_fight_done');
}

// 7. ep7_white_road, step trigger first_trig as the party nears the first gap. Sol (the record, at sol_twine) ties twine to a
// stake. One line points at the stone; the read does the rest (bark first_held after the first read, E7-world). Sets
// first_stone_read.
async function first_stone(s) {
  await stage(s, 'stone_stage');
  await s.camera.panTo('gap_a', 30);
  await narrate(s, 'The road goes white for eight paces: not snow, nothing. At the near edge, a low cairn with a name cut in it.');
  await s.camera.follow('hero');
  await s.face('sol', 'hero');
  await say(s, 'sol', 'Some paths disappear while I am walking them. I leave twine markers now.');
  await say(s, 'sol', 'Read the name on the stone. The road remembers who walked it.');
  await s.setFlag('first_stone_read');
}

// 8. ep7_white_road, step trigger whiteout_trig on the high stretch (after first_stone_read). The set piece of Act II and the
// hero's first beat, staged as actors, the pack tint `whiteout` (in over 2 s, out over 1 s), the sprites' alpha and the HUD
// frost; the scene owns every move. The hero is heard, never in a box. Teaches Call (the skill's learn: { flag:
// 'call_learned' }). 8 boxes. Sets call_learned.
async function whiteout(s) {
  await s.walk('hero', 'whiteout_mid');
  await all(s.walk('mira', 'mira_fade'), s.walk('bram', 'bram_fade'));
  await s.music(null);
  await s.tint('whiteout', 120);
  await fadeFriends(s, 0.3, 120, 3);
  await narrate(s, 'The snow comes sideways, and the world goes white. A step away, Mira and Bram fade into it.');
  await say(s, 'mira', "{hero}? I can't see you. I can't... what's my...");
  await say(s, 'bram', "There's someone I'm walking with. I had their name a second ago.");
  await s.emote('hero', '!');
  await s.sfx('call_cast');
  await narrate(s, '{hero} calls their names into the white. Loud enough to carry.');
  await fadeFriends(s, 1, 30, 0);
  await s.tint('none', 60);
  await s.music('high_moor');
  await say(s, 'mira', 'You said my name.');
  await s.wait(30);
  await say(s, 'mira', 'Out loud. I heard it.');
  await say(s, 'bram', "Do that again sometime. When it's not snowing.");
  await s.setFlag('call_learned');
  await s.sfx('level_up_sparkle');
  await narrate(s, "{c:gold}{hero} learned Call. Say an ally's name: the cold lets go of them, and they come back sooner.{/c}");
  await s.camera.follow('hero');
}

// 9. ep7_waystation, on first enter (tally_trig two tiles in). Sol keeps the counter as sol_waystation (no line here). The
// tally is the close-up; Bram lights the stove (a rest and save from saw_sevens). Sets saw_sevens.
async function waystation(s) {
  await stage(s, 'party_stop');
  await s.camera.panTo('tally', 20);
  await narrate(s, "A cold stove, a bench, a post box with a slot. On the doorframe, a courier's tally cut with a knife.");
  await say(s, 'mira', 'Tess said her father crossed his sevens.');
  await s.music(null);
  const open = await page(s, 'ep7_tally');
  await narrate(s, 'Rows of strokes. Every seventh one is crossed. At the top, where a name would go, a smooth white patch.');
  await unpage(s, open);
  await s.music('high_moor');
  await say(s, 'bram', "Tess's dad carried the post north. Up here?");
  await say(s, 'mira', 'Up here. A lot of times.');
  await s.camera.panTo('stove', 20);
  await s.sfx('brazier_light');
  await narrate(s, 'Bram gets the stove going. It is the first warm thing in miles.');
  await s.camera.follow('hero');
  await s.setFlag('saw_sevens');
}

// 10. ep7_white_road, step trigger icegate_trig at the South Icegate. No speaker outside the party. Sets saw_palehaven.
async function palehaven_view(s) {
  await s.music('mystery');
  await s.camera.panTo('palehaven_far', 60);
  await narrate(s, 'Blue-ice ramparts round a little town. Aurora crystals glow on poles. Beyond it, a cathedral in the pines.');
  await s.wait(40);
  await narrate(s, 'The cathedral is there. Then, for a breath, it is not. Then it is.');
  await say(s, 'bram', "That building's blinking.");
  await say(s, 'mira', "That's where the compass points.");
  await s.emote('hero', '...');   // the hero looks longest at the cathedral
  await s.camera.follow('hero');
  await s.music('high_moor');
  await s.setFlag('saw_palehaven');
}

// ================================================================================================
// Act III: Palehaven (ep7_palehaven, ep7_ph_watch)
// ================================================================================================

// 11. ep7_palehaven, on first enter by the south gate. Bryn (the record, at bryn_gate) tends the gate. The iced doors are
// drawn (two-state objects); nobody explains them. Sets palehaven_arrived.
async function palehaven_arrival(s) {
  await s.music(null);
  await stage(s, 'gate_stage');
  await s.camera.panTo('hearth', 30);
  await narrate(s, 'Snow on an old watch road. A cold hearth in the square. Half the doors are iced shut, with no name over them.');
  await s.camera.follow('hero');
  await s.face('bryn', 'hero');
  await say(s, 'bryn', "Travelers. Up the White Road. We don't get those.");
  await s.music('palehaven');
  await s.camera.panTo('iced_a', 20);
  await say(s, 'mira', 'Who lived in that one?');
  await say(s, 'bryn', "...Someone. They left. We don't talk about who left. It's kinder.");
  await say(s, 'bram', 'Is it?');
  await s.wait(50);   // Bryn has nothing to say to that
  await s.camera.follow('hero');
  await s.setFlag('palehaven_arrived');
}

// 12. ep7_palehaven, the Keeper's talk entry at keeper_lamp, the first time. Her name is gone: she has no other answer. She
// goes into the Watch (a reload puts the record back by her lamp). The notice is canon (the Keeper's Watch Notice). Sets
// met_keeper.
async function meet_keeper(s) {
  await stage(s, 'keeper_stage');
  await narrate(s, 'An old woman in a long blue coat is lighting a lamp by hand. She turns, and the match burns down to her fingers.');
  await s.face('keeper', 'hero');
  await say(s, 'keeper', '...You came up the road. Nobody comes up the road.');
  await say(s, 'mira', "We're looking for something the compass says is here.");
  await say(s, 'keeper', 'Then the compass is wrong. Go home.');
  await say(s, 'bram', 'Who are you?');
  await say(s, 'keeper', "The Keeper. That's what there is.");
  await s.walk('keeper', 'watch_door');
  await s.despawn('keeper');
  await s.camera.panTo('watch_door', 20);
  await narrate(s, 'On the door of the Watch, a notice in a warm, careful hand: THE VAULT IS SHUT. IT STAYS SHUT.');
  await s.wait(40);   // Mira looks at it a long moment
  await say(s, 'mira', 'Look at the k.');
  await s.camera.follow('hero');
  await s.setFlag('met_keeper');
}

// 13. ep7_ph_watch, step trigger watch_trig two tiles inside the door (after met_keeper). The Keeper is a scene spawn in her
// chair; Vex comes in behind the party. The room shows the face-down letters (no narration box). 12 boxes. Sets keeper_told.
async function keeper_and_vex(s) {
  await spawnKeeper(s, 'keeper_chair', 'down');
  await stage(s, 'watch_stage');
  await spawnVex(s, 'vex_door', 'up');
  await s.face('keeper_t', 'vex_k');
  await say(s, 'vex_k', 'You wrote me a letter. I was fourteen, and a Keeper wrote to me.');
  await say(s, 'keeper_t', "I asked a boy who mended bindings, in a house I won't name here. You grew.");
  await say(s, 'vex_k', 'You signed it. The name came off.');
  await say(s, 'keeper_t', "I signed it. The ink would not stay. It hasn't stayed in sixteen years.");
  await s.camera.panTo('frame', 20);
  await say(s, 'mira', 'Whose was this?');
  await say(s, 'keeper_t', 'Mine. I kept a house of mirrors once. I left my face there.');
  await s.camera.follow('hero');
  await narrate(s, 'You hold out the compass. The needle points past her, north, at the cathedral.');
  await say(s, 'keeper_t', "Half a page. It's in the Vault, with everything else I couldn't bear. I shut it in.");
  await say(s, 'mira', 'Then open it.');
  await say(s, 'keeper_t', 'I can open the door. I cannot walk through it.');
  await narrate(s, 'She sees the White Road letter in your bag, the crossed seven on its seal, and puts her hand flat on the table.');
  await say(s, 'keeper_t', 'Not yet. Please. Not that one yet.');
  await s.walk('vex_k', 'vex_door_out');
  await s.despawn('vex_k');
  await s.setFlag('keeper_told');
}

// 14. ep7_palehaven, step trigger vault_trig at the north gate (after keeper_told). The Keeper (a spawn) unlocks the gate and
// steps back; Vex sits on the step (vex_step) and stays out of the Vault. Sets vault_open.
async function vault_gate(s) {
  await spawnKeeper(s, 'gate_keeper', 'up');
  await stage(s, 'north_gate_stage');
  await s.camera.panTo('vault_gate', 20);
  await narrate(s, 'The Keeper takes a key from round her neck, unlocks the cathedral gate, and steps back from it.');
  await s.sfx('gate_open');
  await s.setFlag('vault_open');
  await s.face('keeper_t', 'hero');
  await say(s, 'keeper_t', 'The Vault is past the pines. Mind the floors. They forget too.');
  await spawnVex(s, 'vex_step', 'down', 'npc_vex_kneel');
  await say(s, 'vex_k', "I don't go where names are kept in ice. Mine's had enough of it.");
  await say(s, 'bram', 'Then keep the step warm.');
  await say(s, 'vex_k', "...I'll be here.");
  await s.walk('keeper_t', 'gate_keeper_back');
  await s.despawn('keeper_t');
  await s.camera.follow('hero');
}

// ================================================================================================
// Act IV: The Frostbound Vault (ep7_vault_f1, ep7_vault_f2)
// ================================================================================================

// 15. ep7_vault_f1, on enter. The floor's question: whose names are cut into the stones? Sets vault_entered, vault_f1_arrived.
async function vault_f1_arrival(s) {
  await s.camera.panTo('by_reach', 40);
  await narrate(s, 'Galleries of frost brick and ice glass. Stairs that stop in white. A name stone on every landing.');
  await say(s, 'mira', 'Every stone has a name. Every one of them went somewhere.');
  await say(s, 'bram', 'And somebody kept the list.');
  await s.camera.follow('hero');
  await s.setFlag('vault_entered');
  await s.setFlag('vault_f1_arrived');
}

// The Vault keeps what it holds: the Keeper's memories replay in the ice, staged as a vignette (scene spawns, a cold flash in
// and out, sorrow with a distant bell_toll). No tint change. The frost-blot plays `ice`.
async function memoryIn(s, at) {
  await s.camera.panTo(at, 40);
  await s.music('sorrow');
  await s.sfx('bell_toll');
  await s.flash('#dcecff', 20);
}
async function memoryOut(s, ids, track) {
  await s.flash('#dcecff', 20);
  for (const id of ids) await s.despawn(id);
  await s.music(track);
  await s.camera.follow('hero');
}

// 16. ep7_vault_f1, step trigger memory1_trig at the frozen gate. A Gate Kept Open (canon memory, title kept). The mother's
// canon line is kept word for word. The girl's name is a frost blot. Sets keeper_memory_1.
async function keeper_memory_1(s) {
  await stage(s, 'memory1_stage');
  await memoryIn(s, 'frozen_gate');
  await s.spawn('keeper_mother_m', { sprite: 'npc_keeper_mother', name: "The Keeper's Mother", at: 'mother_gate', dir: 'down' });
  await s.spawn('keeper_young_m', { sprite: 'npc_keeper_young', name: 'A Girl', at: 'girl_gate', dir: 'up' });
  await narrate(s, 'The ice replays a blizzard over a little town gate, long ago. A woman with a lamp holds the gate open.');
  await say(s, 'keeper_mother_m', "We don't shut the gate. Not while anyone's out there.");
  await say(s, 'keeper_mother_m', 'The light exists so others can return.');
  await s.face('keeper_mother_m', 'keeper_young_m');
  await blot(s, 'keeper_mother_m');   // she says the girl's name, and the ice takes it out
  await memoryOut(s, ['keeper_mother_m', 'keeper_young_m'], 'frostbound_vault');
  await say(s, 'mira', 'Her mother said her name. The ice took it out of the memory too.');
  await s.setFlag('keeper_memory_1');
}

// 17. The Stillheart Crystal Key is the gold chest on the northern balcony (flag stillheart_key_found). The lift up runs this
// silent step trigger. Sets vault_f1_done.
async function vault_f1_lift(s) {
  await s.setFlag('vault_f1_done');
}

// 18. ep7_vault_f2, on enter. Sets vault_f2_arrived.
async function vault_f2_arrival(s) {
  await narrate(s, 'A long dark hall. The only light is borrowed: a lamp burns over each stone whose name you hold.');
  await say(s, 'bram', "It's dark until we remember something.");
  await say(s, 'mira', "Then let's remember carefully.");
  await s.setFlag('vault_f2_arrived');
}

// 19. ep7_vault_f2, step trigger memory2_trig at the letter wall. The Name Left Outside (canon title, re-aimed: the ice
// replays the courier coming home up the road he carried the hero down). Sets keeper_memory_2.
async function keeper_memory_2(s) {
  await stage(s, 'memory2_stage');
  await memoryIn(s, 'letter_wall');
  await s.spawn('keeper_mid_m', { sprite: 'npc_keeper_mid', name: 'The Keeper', at: 'keeper_gate_m2', dir: 'down' });
  await s.spawn('courier_m', { sprite: 'npc_courier_m', name: 'A Courier', at: 'courier_snow', dir: 'up' });
  await narrate(s, "The same gate, another winter. The girl is grown, in the Keeper's coat. A courier comes up out of the snow.");
  await s.walk('courier_m', 'courier_stop');
  await say(s, 'courier_m', "Told you I'd come back up. The little one's with Hazel. Safe as bread.");
  await say(s, 'keeper_mid_m', 'You carried them all that way.');
  await say(s, 'courier_m', 'Down the White Road. Every step.');
  await memoryOut(s, ['keeper_mid_m', 'courier_m'], 'frostbound_vault');
  await say(s, 'bram', "That badge on his coat. That's a Willowmere post badge. Bell and letter.");
  await say(s, 'mira', "Tess's father.");
  await s.emote('hero', '...');   // the hero does not yet know the rest; the player does
  await s.setFlag('keeper_memory_2');
}

// 20. ep7_vault_f2, step trigger bell_trig in the bell bay, placed so the party stops on bell_stop two rows below the tag.
// The set piece of Act IV and Bram's beat. The tag is the close-up, read in plain short lines. Nobody says anything else
// about the fire. 11 boxes (budget 14). Sets bell_found.
async function listening_bell(s) {
  await s.music(null);
  await stage(s, 'bell_stop');
  await s.camera.panTo('bell_bay', 40);
  await narrate(s, 'A bronze bell the size of a cart, frozen solid in a block of clear ice. Its clapper hangs mid-swing.');
  await narrate(s, "On the waist of the bell, a maker's stamp: an anvil and a bell.");
  await s.emote('bram', '...');   // Bram stops walking
  await say(s, 'bram', "...That's her mark.");
  await s.wait(40);
  await say(s, 'bram', "That's my mother's bell.");
  await s.music('mystery');
  const open = await page(s, 'ep7_tag');
  await narrate(s, 'A tag on a cord, frozen to the bronze, in a strong square hand:');
  await narrate(s, 'Tuned to the one down in the valley, as you asked. When it rings there, this rings here.');
  await narrate(s, 'Good hands. Mara of the First Bell.');
  await unpage(s, open);
  await say(s, 'mira', 'The thirteenth bell. In Willowmere. She tuned it to this one.');
  await say(s, 'bram', 'So somebody up here would hear when a name went missing down there.');
  await s.wait(40);
  await say(s, 'bram', 'She tuned it the year before the fire.');
  await s.wait(60);   // nobody says anything about the fire
  await say(s, 'bram', "Somebody stopped it. You don't freeze a bell by accident.");
  await s.music('frostbound_vault');
  await s.camera.follow('hero');
  await s.setFlag('bell_found');
}

// 21. ep7_vault_f2, arena trigger lantern_trig in the lamp gallery. Mini-boss intro in the Episode 6 style; a retry plays
// only Mira's tip and the card. The encounter flag sets lantern_defeated.
async function pale_lantern(s) {
  if (await s.hasFlag('lantern_defeated')) return;
  const retry = await s.hasFlag('lantern_tried');
  await s.music(null);
  await s.camera.panTo('lantern_spot', 40);
  await s.wait(retry ? 10 : 30);
  if (!retry) {
    await stage(s, 'arena_stage');
    await narrate(s, 'A tall pale shape like a hooded keeper, a great lantern for a head. Its light is cold and blue.');
    await narrate(s, EP7_ARC_LINES.pale_lantern);
  } else {
    await s.shake(2, 30);
  }
  await say(s, 'mira', TIPS.pale_lantern);
  await s.setFlag('lantern_tried');
  await s.title(EP7_BOSS_CARDS.pale_lantern.name, { sub: EP7_BOSS_CARDS.pale_lantern.sub, frames: 100 });
  await s.shake(4, 30);
  await s.music('battle');
  const result = await s.battle('pale_lantern', { boss: true, canFlee: false });
  if (result !== 'win') return;
  await s.setFlag('lantern_defeated');
  await s.music('frostbound_vault');
  await say(s, 'bram', 'It was holding the light for somebody.');
  await say(s, 'mira', 'It forgot who.');
  await s.camera.follow('hero');
}

// The lift up from the lamp gallery runs this silent step trigger. Sets vault_f2_done.
async function vault_f2_lift(s) {
  await s.setFlag('vault_f2_done');
}

// 22. ep7_vault_f2, the object reliquary_obj behind frost door R (side story 2). The three witness pages open it; the gold
// chest beside it (present if reliquary_open) holds the reward. Sets reliquary_open.
const PAGES = ['page_door_found', 'page_flame_found', 'page_lost_found'];
async function ep7_reliquary(s) {
  if (await s.hasFlag('reliquary_open')) {
    await narrate(s, 'The Keeper Emergency Reliquary stands open. Three pages sit in its lid: Open the Door, Share the Flame, Call the Lost.');
    return;
  }
  await narrate(s, 'A box of iceglass with three page-shaped slots in its lid: THE KEEPER EMERGENCY RELIQUARY.');
  for (const f of PAGES) {
    if (!(await s.hasFlag(f))) {
      await say(s, 'bram', 'Three pages and a locked box. Keepers plan for bad winters.');
      return;
    }
  }
  await narrate(s, 'The three witness pages slide into their slots. The lid unlocks with a sound like ice settling.');
  await s.take(REWARDS_EP7.witness_page.item, REWARDS_EP7.witness_page.qty);
  await s.sfx('chest_open');
  await s.setFlag('reliquary_open');
}

// ================================================================================================
// Act IV continued: the Stillheart Sanctum (ep7_vault_f3)
// ================================================================================================

// 23. ep7_vault_f3, on enter. The quietest map of the episode. Sets vault_f3_arrived.
async function vault_f3_arrival(s) {
  await s.camera.panTo('round_door', 60);
  await narrate(s, 'The nave, from below: pillars of ice, three landings, the aurora through a broken roof. At the top, a still light.');
  await s.camera.follow('hero');
  await say(s, 'bram', "It's quiet.");
  await say(s, 'mira', "It's still. That's not the same.");
  await s.setFlag('vault_f3_arrived');
}

// 24. ep7_vault_f3, step trigger memory3_trig on the first landing. The Winter She Could Not End (canon "The Winter Nox Could
// Not End", retitled so her name is not said before its payoff). The memory keeps the bell and drops the name. Marten's
// death is never shown or described. Sets keeper_memory_3.
async function keeper_memory_3(s) {
  await stage(s, 'memory3_stage');
  await memoryIn(s, 'memory3_spot');
  await s.spawn('keeper_mid_m', { sprite: 'npc_keeper_mid', name: 'The Keeper', at: 'memory3_run', dir: 'up' });
  await narrate(s, 'The bell bay, years ago. The bell rings by itself, one long note, and a younger Keeper comes running.');
  await s.walk('keeper_mid_m', 'memory3_bell');
  await s.sfx('bell_thirteenth');
  await blot(s, null);   // the bell rings a name, and the memory drops it
  await say(s, 'keeper_mid_m', 'No. Not him. Not on the road. He was nearly home.');
  await narrate(s, 'She puts both hands on the bronze and holds it until it stops. Frost spreads from her hands over the bell.');
  await say(s, 'keeper_mid_m', 'If no one hears it, no one has to say goodbye.');
  await s.camera.panTo('nave_dark', 30);
  await narrate(s, 'Behind her, in the dark of the nave, something tall and white lifts its head.');
  await memoryOut(s, ['keeper_mid_m'], 'mystery');
  await say(s, 'mira', 'She stopped the bell. And then everything up here stopped with it.');
  await s.setFlag('keeper_memory_3');
}

// 25. ep7_vault_f3, step trigger keeper_trig at the top of the Remember landing (after keeper_memory_3). The Keeper comes up
// the stair (a spawn from keeper_stair) and walks with the party as an actor from here; she does not fight. The main truth
// choice. She goes on ahead and opens the round door with her bare hand (no keyhole; the key opens the inner grate behind
// it), then waits by it (keeper_wait_3). 10 boxes. Sets keeper_came, stillheart_open, and told_nox or spared_nox.
async function keeper_comes(s) {
  await s.sfx('footstep_stone');
  await spawnKeeper(s, 'keeper_stair', 'up');
  await stage(s, 'remember_stage');
  await s.walk('keeper_t', 'keeper_wait_1');
  await narrate(s, 'Footsteps on the stair. The Keeper comes up with her lamp lit, out of breath, and stops.');
  await s.face('keeper_t', 'hero');
  await say(s, 'keeper_t', "I closed every door in this place. I'll open the last one.");
  await say(s, 'keeper_t', 'You were this big. Wrapped in a blanket with your name on it.');
  await say(s, 'keeper_t', 'I wrote it on the blanket too, in case the page got lost.');
  await say(s, 'keeper_t', 'Do you remember any of it? The road. The cold. Me.');
  const c = await s.choice(['No.', 'I remember.']);
  if (c === 0) {
    await s.setFlag('told_nox');
    await say(s, 'keeper_t', 'Good. You were meant to forget the cold. That was the point of the road.');
  } else {
    await s.setFlag('spared_nox');
    await narrate(s, 'She smiles, and does not believe it, and is glad anyway.');
    await say(s, 'keeper_t', '...You were too small to. But thank you.');
  }
  await s.setFlag('keeper_came');
  await spawnKeeper(s, 'keeper_wait_3', 'up');   // she goes on up ahead, lamp first
  await s.camera.panTo('round_door', 40);
  await s.sfx('frost_melt');   // the door thaws open (frost_seal backwards)
  await narrate(s, 'At the round door she puts her bare hand on the ice. It has no keyhole. It knows her hand, and it opens.');
  await s.setFlag('stillheart_open');
  await s.camera.follow('hero');
}

// ================================================================================================
// Act V: The White Phantom (ep7_stillheart)
// ================================================================================================

// 26. ep7_stillheart, step trigger row phantom_trig. Boss intro; the Phantom is the map actor `white_phantom` (sprite
// phantom_avatar) over the heart. The Keeper follows up the stair as a spawn. After a loss: the pan, Mira's tip, the card.
// A win chains phantom_after.
async function phantom(s) {
  if (await s.hasFlag('phantom_defeated')) return;
  await s.music(null);
  await spawnKeeper(s, 'nox_enter', 'up');
  await s.camera.panTo('heart', 40);
  if (await s.hasFlag('phantom_tried')) {
    await s.shake(2, 30);
    await say(s, 'mira', TIPS.white_phantom);
    await phantom_fight(s);
    return;
  }
  await stage(s, 'party_stop');
  await s.wait(40);
  await narrate(s, 'A round floor under a broken roof. In the middle, a heart of clear ice as tall as a door. Names move in it.');
  await narrate(s, 'Over it stands a tall shape of ice with an antler crown and a ragged, frozen cloak.');
  await narrate(s, EP7_ARC_LINES.white_phantom);
  await say(s, 'white_phantom', 'NO ONE LEAVES. NO ONE IS LOST. I KEEP THEM STILL.');
  await s.face('white_phantom', 'keeper_t');
  await say(s, 'white_phantom', 'YOU ASKED FOR QUIET. I HAVE KEPT IT FIFTEEN YEARS.');
  await s.face('white_phantom', 'hero');
  await say(s, 'white_phantom', 'YOU I CANNOT SAY GOODBYE TO. YOU WERE KEPT.');
  await say(s, 'keeper_t', 'I asked for quiet. I never asked for this.');
  await say(s, 'bram', "Then we'll un-ask it.");
  const c = await s.choice(['Let them go.', 'Bring them back.']);
  if (c === 0) await say(s, 'white_phantom', 'WHAT IS LET GO IS LOST. I LOSE NO ONE.');
  else await say(s, 'white_phantom', 'NOTHING COMES BACK. THAT IS WHY I KEEP IT.');
  await say(s, 'mira', TIPS.white_phantom);
  await phantom_fight(s);
}
async function phantom_fight(s) {
  await s.setFlag('phantom_tried');
  await s.title(EP7_BOSS_CARDS.white_phantom.name, { sub: EP7_BOSS_CARDS.white_phantom.sub, frames: 100 });
  await s.shake(4, 30);
  await s.flash('#ffffff', 10);
  await s.music('boss_phantom');
  const result = await s.battle('white_phantom', { boss: true, canFlee: false });
  if (result !== 'win') return;
  await phantom_after(s);
}

// 27. ep7_stillheart, after the win (also runnable on its own, from an enter trigger after a reload). The bible's order: the
// crown cracks, the heart thaws, the counter-seal and the seventh fragment, the seventh list, the half page, the bell. 16
// boxes (budget 18). Gives name_fragment_7, seventh_list. Sets phantom_defeated, fragment7_get, seventh_list_get,
// stillheart_restored.
async function phantom_after(s) {
  await s.setFlag('phantom_defeated');
  await spawnKeeper(s, 'nox_enter', 'up');
  await s.camera.panTo('heart', 20);
  await s.shake(3, 40);
  await s.sfx('boss_die');
  await s.flash('#ffffff', 16);
  await s.music('sorrow');
  await narrate(s, 'The Phantom goes down on one knee over the heart. Its crown cracks.');
  await say(s, 'white_phantom', 'I KEPT THEM SAFE. I NEVER LET THEM GO.');
  await s.wait(30);
  await say(s, 'white_phantom', 'I WAS TOLD TO KEEP THE NORTH FROM READING A PAGE.');
  await s.music('triumph');
  await s.sfx('name_restore');
  await s.flash('#fff2d0', 16);
  await narrate(s, 'The heart thaws from the inside. Every name in it runs clear and bright, out through the roof and down the mountain.');
  await narrate(s, 'Under your line, the counter-seal, and in the warm hand: Keep this one.');
  await s.give(REWARDS_EP7.fragment.item, REWARDS_EP7.fragment.qty);
  await s.setFlag('fragment7_get');
  await say(s, 'bram', 'Seven.');
  await say(s, 'mira', 'Seven. And this time we know whose hand.');
  await s.music('mystery');
  await s.camera.panTo('list_spot', 30);
  await narrate(s, 'Where the Phantom knelt, a list is frozen into the floor: cheap paper, the cold hand, the seal of the empty book.');
  let open = await page(s, 'ep7_seventh');
  await narrate(s, 'THE NORTH. LET IT FORGET EVERY SOUL WHO CAN STILL READ THE FIRST ERASED PAGE.');
  await unpage(s, open);
  await s.give(REWARDS_EP7.seventh_list.item, REWARDS_EP7.seventh_list.qty);
  await s.setFlag('seventh_list_get');
  await say(s, 'mira', 'Every other list names people. This one names a page.');
  await say(s, 'keeper_t', 'Sixteen years. It came up the road the spring you did. I could read that page. So they took my name.');
  await say(s, 'bram', 'Read it, then.');
  await say(s, 'keeper_t', 'Not here. A page like that is a door. We open it where it was written.');
  await s.camera.panTo('page_block', 30);
  open = await page(s, 'ep7_page', 'half');
  await narrate(s, 'Beside the heart, half a page frozen into a block of ice by her own hands. A few lines, frosted white.');
  await unpage(s, open);
  await s.music(null);
  for (let i = 0; i < 3; i++) { await s.sfx('bell_thirteenth'); await s.wait(40); }
  await s.wait(60);
  await s.sfx('bell_thirteenth');
  await narrate(s, 'Far below, the bell rings: a long note for every name it was stopped from ringing. Then once more, alone.');
  await narrate(s, 'The Keeper closes her eyes on the last one.');
  await s.setFlag('stillheart_restored');
  await s.camera.follow('hero');
}

// ================================================================================================
// Act VI: The Doors Reopen (ep7_palehaven, ep7_stillheart)
// ================================================================================================

// 28. ep7_palehaven, on arrival in the square by square_return from the Stillheart (after phantom_after). Dusk. The Keeper,
// Vex and the party at the hearth. The page opens in three steps (joined, mark, signed), the signature last; "The Keeper"
// becomes "Nox" on the beat Mira reads it, "A Courier" becomes "Marten" on the mark. One line by the Sanctum choice. 16
// boxes (budget 18). Sets marten_named, nox_named, page_whole; chains doors_reopen.
async function whole_page(s) {
  await s.music(null);
  await s.tint('dusk', 0);
  await spawnKeeper(s, 'hearth_n', 'down');
  await spawnVex(s, 'hearth_e', 'left');
  await stage(s, 'hearth_s');
  await s.camera.panTo('hearth', 30);
  await narrate(s, 'Dusk in the square, by the cold hearth. Vex comes off the gate step with something in oilcloth.');
  await say(s, 'vex_k', "Sixteen years. Here's your half back.");
  await s.music('mystery');
  await narrate(s, 'The two halves meet over the hearth. In the warmth, the frost comes off the bottom one.');
  let open = (await page(s, 'ep7_page', 'joined'));
  await narrate(s, "The torn line runs on at last: Carried down the White Road by Marten, courier of Willowmere, at his sister's asking.");
  open = (await page(s, 'ep7_page', 'mark')) || open;
  await narrate(s, "Under it, in a rougher hand, a carrier's mark and a date. The seven in the date is crossed.");
  await say(s, 'mira', 'He crossed his sevens.');
  await say(s, 'bram', "Marten. Tess's dad is Marten.");
  await s.setFlag('marten_named');
  open = (await page(s, 'ep7_page', 'signed')) || open;
  await s.music('sorrow');
  // the signature reaches full alpha over its stage (pages.js): hold until it is at full before it is read
  if (open) await s.wait(56);
  await narrate(s, 'And at the foot of the page, in the warm hand, there for the first time since it was written: a name.');
  await say(s, 'mira', 'Nox.');
  await unpage(s, open);
  // the swap: same mark, same sprite, her name on the speaker tag
  await s.despawn('keeper_t');
  await spawnNox(s, 'hearth_n', 'down');
  await s.sfx('name_restore');
  await s.flash('#fff2d0', 12);
  await s.setFlag('nox_named');
  await s.music('palehaven');
  await say(s, 'nox_t', "...Nox. It's been a long time since it stayed on the paper.");
  await say(s, 'nox_t', 'I wrote your name the night you came to me.');
  await say(s, 'nox_t', "Where you came from is not mine to tell. It's written somewhere I can't go.");
  if (await s.hasFlag('told_nox')) await say(s, 'nox_t', "You said you didn't remember. I'm glad. You remember us now.");
  else await say(s, 'nox_t', 'You said you remembered. You were being kind. So was he, always.');
  await s.face('nox_t', 'vex_k');
  await say(s, 'nox_t', "You kept the top for sixteen years. Keep it whole. I'll know where it is.");
  await say(s, 'vex_k', "...I'm used to being followed.");
  await s.setFlag('page_whole');
  await doors_reopen(s);
}

// 29. ep7_palehaven, the next dawn, straight after (also runnable on its own after a reload). The iced doors run; names come
// back onto the lintels. Nox reads her brother's letter (canon words). The restored address and Vex's whole name are the
// close-ups; one line by the wall choice; the gift by the Sanctum choice. 14 boxes (budget 16). Takes white_road_letter.
// Sets letter_sent, vex_name_whole, doors_reopened.
async function doors_reopen(s) {
  await s.fade('out', 60);
  await s.despawn('vex_k');
  await s.tint('dawn', 0);
  await spawnNox(s, 'hearth_n', 'down');
  await spawnAeris(s, 'aeris_square', 'up');
  await stage(s, 'hearth_s');
  await s.camera.panTo('iced_a', 0);
  await s.music(null);
  await s.fade('in', 60);
  await s.sfx('frost_melt');   // the iced doors run at dawn
  await narrate(s, 'Dawn. The iced doors are wet and running. One by one, names come back onto the lintels.');
  await s.music('palehaven');
  await narrate(s, 'People come out into the square and say names to each other, out loud, like a greeting.');
  await s.camera.panTo('hearth', 30);
  await narrate(s, "Nox stands at the hearth with a letter from the Vault, her brother's, and reads it to the town.");
  await say(s, 'nox_t', 'Do not freeze my life into a single farewell. Open the door for those who follow.');
  await s.sfx('brazier_light');
  await s.flash('#ffe2b0', 12);
  if (await s.hasFlag('hearth_lit')) await narrate(s, 'The hearth flares up, bright to the top of the square.');
  else await narrate(s, 'The hearth catches by itself.');
  await narrate(s, 'You hold out the White Road letter. Its address has come back.');
  let open = await page(s, 'ep7_letter', 'restored');
  await narrate(s, 'TESS, AT WILLOWMERE. In the corner, MARTEN, and a crossed seven in the date.');
  await unpage(s, open);
  await say(s, 'nox_t', 'He wrote to her the winter he came back up. It went south on the wrong ship.');
  await s.face('aeris_t', 'hero');
  await say(s, 'aeris_t', "I'll carry it. And yours.");
  await say(s, 'nox_t', 'To my niece. Fifteen years late.');
  await s.take(REWARDS_EP7.white_road.item, REWARDS_EP7.white_road.qty);
  await s.setFlag('letter_sent');
  await spawnVex(s, 'vex_run', 'up');
  await s.walk('vex_k', 'vex_square', { speed: 'run' });
  await say(s, 'vex_k', 'Went down to the wall.');
  open = await page(s, 'ep7_carving', 'whole');
  await narrate(s, 'VEX QUILL, every letter there, cut deep.');
  await unpage(s, open);
  await s.setFlag('vex_name_whole');
  if (await s.hasFlag('told_vex')) await say(s, 'vex_k', 'You said half. Read it again.');
  else await say(s, 'vex_k', "You said all of it, back then. Now you're not lying.");
  await s.face('nox_t', 'hero');
  const gift = (await s.hasFlag('told_nox')) ? REWARDS_EP7.gift_truth : REWARDS_EP7.gift_kind;
  await s.give(gift.item, gift.qty);
  await say(s, 'nox_t', "Keep the door open behind you. Someone's always following.");
  await s.tint('none', 60);
  await s.camera.follow('hero');
  await s.setFlag('doors_reopened');
}

// 30. ep7_stillheart, the broken roof at night, on enter by the square's nave_door (after doors_reopened; Talk names it).
// Nox, Vex and Aeris at the rail. The staircase of written light rises (the star_stair prop). End cards. Sets ep7_complete;
// the hooks then roll CREDITS_EP7 (counter credits7_rolled), show END_CARD_EP7 and wake the party at ep7_ph_watch watch_cot.
// 10 boxes.
async function ep7_ending(s) {
  await s.fade('out', 30);
  await s.tint('night', 0);
  await s.music(null);
  await spawnNox(s, 'nox_roof', 'up');
  await spawnVex(s, 'vex_rail', 'up');
  await spawnAeris(s, 'aeris_rail', 'up');
  await stage(s, 'roof');
  await s.camera.panTo('heart', 0);
  await s.fade('in', 90);
  await narrate(s, 'Night, at the top of the nave. Behind you the thawed heart runs bright. Over the broken roof, the aurora.');
  await say(s, 'mira', 'Where do the lists come from?');
  await narrate(s, 'The compass needle swings straight up.');
  await s.music('mystery');
  await s.camera.panTo('stair_foot', 60);
  await narrate(s, 'Out of the broken roof a stair of written light unrolls into the sky. Every step is a line of handwriting.');
  await say(s, 'vex_k', 'I know where that goes. I mended bindings there.');
  await say(s, 'mira', 'The First Library.');
  await say(s, 'vex_k', "Don't say it loud. It listens.");
  await say(s, 'nox_t', "I'll say the name you'll need up there. Up there.");
  await say(s, 'bram', "Then you're coming.");
  await say(s, 'nox_t', '...Ask me at the top.');
  await s.fade('out', 120);
  for (const id of ['nox_t', 'vex_k', 'aeris_t']) await s.despawn(id);
  await s.title(END_TITLE_EP7.text, { sub: END_TITLE_EP7.sub, frames: 240 });
  await s.title(EPISODE8_CARD.text, { sub: EPISODE8_CARD.sub, frames: 240 });
  await s.setFlag('ep7_complete');
}

// ------------------------------------------------------------------------------------------------
// Side stories (EPISODE7.md section 2)
// ------------------------------------------------------------------------------------------------

/** "The Keeper" until her name is back on the page, then canon's "Keeper Nox" (one word changed: EPISODE7 section 8). */
const keeperIs = async (s) => ((await s.hasFlag('nox_named')) ? 'Keeper Nox' : 'The Keeper');

// The Hearth of Returning Names. Eira's talk entry once met_keeper starts it, and she is her own witness at once
// (testimony_eira is part of hearth_start, not a scene of its own); then Mirael's and Sol's talk entries (Sol's on either of
// his records: the road or the Waystation counter); then the hearth object in the square (hearth_light).
async function hearth_start(s) {
  await s.face('eira', 'hero');
  await say(s, 'eira', 'The hearth in the square is the Hearth of Returning Names. Nobody has lit it since the Vault was shut.');
  await say(s, 'eira', 'It wants three witnesses before it will burn. Mirael the physician. Sol, on the road. And me.');
  await say(s, 'bram', 'Witnesses again. Mira still loves witnesses.');
  await s.setFlag('hearth_started');
  await testimony_eira(s);
}
async function testimony_eira(s) {
  await say(s, 'eira', `${await keeperIs(s)} promised to keep my sister safe.`);
  await say(s, 'eira', 'The White Phantom froze her last letter rather than let me read that she had come home.');
  await s.setFlag('testimony_eira');
}
async function testimony_mirael(s) {
  await s.face('mirael', 'hero');
  await say(s, 'mirael', 'The vault held our names in ice, but the dead never asked us to lock the doors.');
  await say(s, 'mirael', `${await keeperIs(s)} tried to spare us grief by hiding every loss.`);
  await s.setFlag('testimony_mirael');
}
async function testimony_sol(s) {
  await say(s, 'sol', 'The northern beacons were built for returning travelers, not as locks.');
  await say(s, 'mira', 'Then somebody used them as locks.');
  await s.setFlag('testimony_sol');
}
// The hearth object (returning_hearth) in the square (if: hearth_started). Before the three witnesses: one box. Lit: one box
// (it is a rest and save point from hearth_lit, E7-maps-a). +20 Fury at the White Phantom from hearth_lit.
async function hearth_light(s) {
  if (await s.hasFlag('hearth_lit')) {
    await narrate(s, 'The Hearth of Returning Names burns in the square. People sit by it and say names.');
    return;
  }
  if (!((await s.hasFlag('testimony_mirael')) && (await s.hasFlag('testimony_sol')) && (await s.hasFlag('testimony_eira')))) {
    await narrate(s, 'The Hearth of Returning Names: a ring of black stone round cold ash. Three witnesses light it, Eira says.');
    return;
  }
  await stage(s, 'hearth_s');
  await narrate(s, 'You lay the first log. The hearth catches, and warm light runs out over the snow of the square.');
  await s.sfx('brazier_light');
  await s.flash('#ffe2b0', 12);
  await s.give(REWARDS_EP7.hearth.item, REWARDS_EP7.hearth.qty);
  await s.give(REWARDS_EP7.hearth_ether.item, REWARDS_EP7.hearth_ether.qty);
  await s.give('gold', REWARDS_EP7.hearth.gold);
  await s.give(REWARDS_EP7.hearth_coat.item, REWARDS_EP7.hearth_coat.qty);
  await say(s, 'mira', 'Three witnesses, one fire. Somebody out there is walking toward it.');
  await s.setFlag('hearth_lit');
  await s.setFlag('hearth_done');
}

// Torr's Missing Streets. Torr's talk entry from palehaven_arrived starts it; the three plaques are chests (street_1_found
// to street_3_found, present once streets_started); his talk entry with all three found ends it. Cut line 1 drops it
// (EPISODE7 section 2): Torr keeps his canon lines and the book becomes an inspect.
async function streets_start(s) {
  await s.face('torr', 'hero');
  await say(s, 'torr', 'I write the missing streets in a book so they remain in memory.');
  await say(s, 'torr', 'The wind took three street plaques off our walls. One is on the White Road. Two blew into the Vault.');
  await say(s, 'bram', 'Street names. In the Vault. Of course they did.');
  await s.setFlag('streets_started');
}
async function streets_done(s) {
  await s.face('torr', 'hero');
  await narrate(s, 'You hand Torr three plaques, the names on them half frosted. He reads each one aloud and writes it in his book.');
  await s.take(REWARDS_EP7.street_plaque.item, REWARDS_EP7.street_plaque.qty);
  await say(s, 'torr', 'Three streets back. The town is three names longer this morning.');
  await s.give(REWARDS_EP7.streets.item, REWARDS_EP7.streets.qty);
  await narrate(s, 'He turns to the last page of his book, the oldest, and shows you one line.');
  await say(s, 'torr', 'Our oldest page names the White Phantom, then stops mid-sentence.');
  await s.setFlag('streets_done');
}

// ------------------------------------------------------------------------------------------------
// Scene registry. Every flag is declared in flags.js. `ep7_morning` needs the switch (live) and not Fine Print; every other
// chain bottoms out at ep7_started, which only ep7_morning sets.
// ------------------------------------------------------------------------------------------------
const TESTIMONIES = ['testimony_mirael', 'testimony_sol', 'testimony_eira'];
const STREETS = ['street_1_found', 'street_2_found', 'street_3_found'];
export const SCENE_CONDITIONS = {
  ep7_morning: { if: 'ep6_complete', ifNot: ['ep7_morning_done', 'tier_1'], live: true },
  ep7_board: { if: 'ep7_started', ifNot: 'ep7_boarded' },
  ep7_landing: { if: 'ep7_boarded', ifNot: 'road_arrived' },
  name_under_ice: { if: 'road_arrived', ifNot: 'vex_carved' },
  road_fight: { if: 'vex_carved', ifNot: 'road_fight_done' },
  first_stone: { if: 'road_arrived', ifNot: 'first_stone_read' },
  whiteout: { if: 'first_stone_read', ifNot: 'call_learned' },
  waystation: { if: 'road_arrived', ifNot: 'saw_sevens' },
  palehaven_view: { if: 'road_arrived', ifNot: 'saw_palehaven' },
  palehaven_arrival: { if: 'road_arrived', ifNot: 'palehaven_arrived' },
  meet_keeper: { if: 'palehaven_arrived', ifNot: 'met_keeper' },
  keeper_and_vex: { if: 'met_keeper', ifNot: 'keeper_told' },
  vault_gate: { if: 'keeper_told', ifNot: 'vault_open' },
  vault_f1_arrival: { if: 'vault_open', ifNot: 'vault_f1_arrived' },
  keeper_memory_1: { if: 'vault_f1_arrived', ifNot: 'keeper_memory_1' },
  vault_f1_lift: { if: 'vault_f1_arrived', ifNot: 'vault_f1_done' },
  vault_f2_arrival: { if: 'vault_f1_done', ifNot: 'vault_f2_arrived' },
  keeper_memory_2: { if: 'vault_f2_arrived', ifNot: 'keeper_memory_2' },
  listening_bell: { if: 'vault_f2_arrived', ifNot: 'bell_found' },
  pale_lantern: { if: 'vault_f2_arrived', ifNot: 'lantern_defeated' },
  vault_f2_lift: { if: 'lantern_defeated', ifNot: 'vault_f2_done' },
  ep7_reliquary: { if: 'vault_f2_arrived' },
  vault_f3_arrival: { if: 'vault_f2_done', ifNot: 'vault_f3_arrived' },
  keeper_memory_3: { if: 'vault_f3_arrived', ifNot: 'keeper_memory_3' },
  keeper_comes: { if: 'keeper_memory_3', ifNot: 'keeper_came' },
  phantom: { if: 'stillheart_open', ifNot: 'phantom_defeated' },
  phantom_after: { if: 'phantom_defeated', ifNot: 'stillheart_restored' },
  whole_page: { if: 'stillheart_restored', ifNot: 'page_whole' },
  doors_reopen: { if: 'page_whole', ifNot: 'doors_reopened' },
  ep7_ending: { if: 'doors_reopened', ifNot: 'ep7_complete' },
  hearth_start: { if: 'met_keeper', ifNot: 'hearth_started' },
  testimony_mirael: { if: 'hearth_started', ifNot: 'testimony_mirael' },
  testimony_sol: { if: 'hearth_started', ifNot: 'testimony_sol' },
  hearth_light: { if: 'hearth_started' },
  streets_start: { if: 'palehaven_arrived', ifNot: 'streets_started' },
  streets_done: { if: STREETS, ifNot: 'streets_done' },
};

const RAW = {
  ep7_morning, ep7_board,
  ep7_landing, name_under_ice, road_fight, first_stone, whiteout, waystation, palehaven_view,
  palehaven_arrival, meet_keeper, keeper_and_vex, vault_gate,
  vault_f1_arrival, keeper_memory_1, vault_f1_lift, vault_f2_arrival, keeper_memory_2, listening_bell, pale_lantern,
  vault_f2_lift, ep7_reliquary, vault_f3_arrival, keeper_memory_3, keeper_comes,
  phantom, phantom_after, whole_page, doors_reopen, ep7_ending,
  hearth_start, testimony_mirael, testimony_sol, hearth_light, streets_start, streets_done,
};

export const scenes = Object.fromEntries(Object.entries(RAW).map(([id, fn]) => [id, cut(fn, SCENE_CONDITIONS[id])]));

/** The side scenes (plan 2.5) and the silent lift steps; everything else in `scenes` is main or chained. */
export const SIDE = ['hearth_start', 'testimony_mirael', 'testimony_sol', 'hearth_light', 'ep7_reliquary', 'streets_start', 'streets_done'];
export const SILENT = ['vault_f1_lift', 'vault_f2_lift'];
// The main-path scenes in story order, for the box-budget and playthrough tests (the chained phantom_after and doors_reopen
// are counted on their own, and stopped at the chain point inside the scene that chains them).
export const MAIN_PATH = ['ep7_morning', 'ep7_board', 'ep7_landing', 'name_under_ice', 'road_fight', 'first_stone', 'whiteout',
  'waystation', 'palehaven_view', 'palehaven_arrival', 'meet_keeper', 'keeper_and_vex', 'vault_gate', 'vault_f1_arrival',
  'keeper_memory_1', 'vault_f1_lift', 'vault_f2_arrival', 'keeper_memory_2', 'listening_bell', 'pale_lantern', 'vault_f2_lift',
  'vault_f3_arrival', 'keeper_memory_3', 'keeper_comes', 'phantom', 'whole_page', 'ep7_ending'];
/** Box budgets (EPISODE7.md section 1, E7-story brief item 5): 12 per main scene, except these. */
export const BOX_BUDGET = { default: 12, ep7_morning: 6, name_under_ice: 14, whiteout: 14, listening_bell: 14, phantom_after: 18,
  whole_page: 18, doors_reopen: 16 };
/** The close-up payoffs (plan 9.4): scene -> [kind, mode], in order (whole_page's own, before it chains doors_reopen). */
export const PAYOFFS = {
  ep7_morning: [['ep7_chart', 'fading']],
  name_under_ice: [['ep7_carving', 'fading']],
  waystation: [['ep7_tally', undefined]],
  listening_bell: [['ep7_tag', undefined]],
  phantom_after: [['ep7_seventh', undefined], ['ep7_page', 'half']],
  whole_page: [['ep7_page', 'joined'], ['ep7_page', 'mark'], ['ep7_page', 'signed']],
  doors_reopen: [['ep7_letter', 'restored'], ['ep7_carving', 'whole']],
};

export function register() {
  return STORY.registerStory({ scenes, lines: {}, conditions: SCENE_CONDITIONS });
}

export default register;
