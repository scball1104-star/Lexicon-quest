// Lexicon Quest NEXT, Episode 6: "The Skybound Isles". Every scene of docs/story/EPISODE6.md section 1 and the side scenes
// of docs/EPISODE6_PLAN.md section 2.5. Cutscene API only (DESIGN 5.4); staging in docs/story/STAGING_EP6.md. Writing
// rules as ep5: one idea per box, at most 3 lines of 42 characters, ASCII, no em dashes, {hero} = the player's name. The
// hero never speaks: choices, emotes, and what the others say.
//
// STAGING (CRITIQUE_6 item 11). Before the first line of a scene with a speaker, stage(s, spot) walks the hero to `spot`
// (two tiles below the speaker), Mira to `spot_m` (one tile left of it) and Bram to `spot_b` (one tile right): nobody on
// one column, nobody on top of a seated or hanging speaker. Vex stands two rows above the party in vex_relay and vex_falls
// (CRITIQUE_7 item 8), and he is spawned as `vex_k`, never `vex` (Episode 2's in-glass id, world/reflections.js).
//
// SHOWING (CRITIQUE_6 item 3, CRITIQUE_7 item 7). The five payoffs open a close-up page through page(s, kind, mode):
// `ep6_slip` (burned), `ep6_manifest` (struck, restored), `ep6_letter` and `ep6_page` (name, seal, torn: "Keep this one."
// only in the last), only when PAGE_KINDS has the kind (E6-tiles, wave 6b). The lines said over a page work without it,
// so until the pages land the scene reads as narration over the field.
//
// THE NAME. The lost apprentice is "The Signal Apprentice" (speaker apprentice_v: a voice on the wind, the memory spawn,
// and the spire actor) until Mira reads her name in fifth_voice; on that beat apprentice_v is despawned and pippa_t
// ("Pippa") spawned on the same mark, the Episode 4 and 5 swap. qa/content/ep6_story.test.mjs scans every box before it.
//
// THE LINE (vex_falls). The rope from Bram to Vex is drawn by a cutscene helper E6-scene-ui adds (`s.rope(from, to)`, and
// `s.rope(null)` to clear it). Until it exists the narration says the line holds; the boxes are the same either way.
//
// THE SWITCH. `ep6_morning` also needs EP6_LIVE (GATE.live, read at call time; the pack's ?ep=6 developer entry may set
// it) and not tier_1; the pack patch's enter trigger checks counter credits5_rolled. Every other scene needs a flag only
// an Episode 6 scene sets. Registration: part of the lazy `ep6` pack. register() hands scenes and guards to registerStory.

import * as EPISODES from '../../game/episodes.js';
import * as STORY from '../../game/story.js';
import { PAGE_KINDS } from '../../world/closeup.js';
import { REWARDS_EP6 } from './quests.js';
import { EPISODE7_CARD, END_TITLE_EP6, EP6_ARC_LINES, EP6_BOSS_CARDS } from './text.js';

// Speakers with portraits (a missing one draws none). Aeris, Pippa and the town have none (plan 9.5); the Scribe has its crop.
const PORTRAIT = { hero: 'hero', mira: 'mira', bram: 'bram', vex_k: 'silver_rogue', scribe: 'scribe', scribe_v: 'scribe' };

const say = (s, who, text) => s.say(who, text, PORTRAIT[who] ? { portrait: PORTRAIT[who] } : {});
const narrate = (s, text) => s.say(null, text);
const all = (...promises) => Promise.all(promises);

/** The party to its marks: the hero on `spot`, Mira on `spot_m`, Bram on `spot_b` (STAGING_EP6.md section 1). */
async function stage(s, spot) {
  await s.walk('hero', spot);
  await all(s.walk('mira', `${spot}_m`), s.walk('bram', `${spot}_b`));
}
/** Open a close-up page when its kind is registered (E6-tiles); true when it opened. */
async function page(s, kind, mode) {
  if (!PAGE_KINDS[kind]) return false;
  await s.closeup(kind, mode ? { mode } : {});
  return true;
}
async function unpage(s, open) { if (open) await s.closeup(null); }
/** The rope helper of plan 5.2, when E6-scene-ui has added it to the cutscene (`'rope' in s`); true when drawn. */
async function rope(s, from, to) {
  if (!('rope' in s)) return false;
  await s.rope(from, to);
  return true;
}
async function unrope(s, drawn) { if (drawn) await s.rope(null); }

const spawnAeris = (s, at, dir = 'down') => s.spawn('aeris_t', { sprite: 'npc_aeris', name: 'Aeris', at, dir });
const spawnVex = (s, at, dir = 'down') => s.spawn('vex_k', { sprite: 'npc_vex', name: 'Vex Quill', at, dir });
const spawnYara = (s, at, dir = 'down') => s.spawn('yara_t', { sprite: 'npc_yara', name: 'Yara', at, dir });
/** Move the Zephyr Landing record `aeris` to a mark for one scene (spawn replaces the map actor; a reload puts her back). */
const placeAeris = (s, at, dir = 'down') => s.spawn('aeris', { sprite: 'npc_aeris', name: 'Aeris', at, dir });

export const GATE = { live: EPISODES.EP6_LIVE === true };
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

/** Bram's two boss tips (plan 6.6: each names a lever the boss's data has; a contract with E6-battle). */
export const TIPS = {
  gale_engine: 'When it winds the bellows, I anchor us. Keep me standing.',
  scribe: 'When it rewrites the course, I anchor us. Keep me standing.',
};

// ================================================================================================
// Act I: Saffron Haven, the slip with four seats
// ================================================================================================

// 1. ep5_sh_inn, on enter after the Episode 5 credits (the pack patch's ep6_wake trigger checks credits5_rolled). Five
// boxes, the slip's close-up by about 0:20, control after Bram's line and Mira's two. Gives boarding_slip. Sets
// ep6_morning_done, ep6_started. The bird is narration at the sill (no bird sprite exists).
async function ep6_morning(s) {
  await s.fade('in', 40);
  await s.walk('hero', 'inn_stage6');
  await all(s.walk('mira', 'mira_window6'), s.walk('bram', 'inn_stage6_b'));
  await s.camera.panTo('bird_sill', 20);
  await s.sfx('page_flutter');
  await narrate(s, 'A small grey bird taps at the shutter, a silver ribbon on its leg. Mira unties it.');
  const open = await page(s, 'ep6_slip', 'burned');
  await say(s, 'mira', 'Somebody booked us passage. A week ago.');
  await s.music(null);
  await say(s, 'bram', 'Four seats. There are three of us.');
  await unpage(s, open);
  await s.face('mira', 'bram');
  await say(s, 'mira', "Then somebody's coming, or somebody's expected.");
  await s.give(REWARDS_EP6.slip.item, REWARDS_EP6.slip.qty);   // Mira folds the slip away
  await s.music('saffron');
  await say(s, 'mira', 'The Oracle said a sky compass finds the page. This says where the compass is.');
  await s.camera.follow('hero');
  await s.setFlag('ep6_morning_done');
  await s.setFlag('ep6_started');
}

// 3. ep5_saffron, the berth object sky_berth at the water stairs (if: ep6_started). Yara is the map's own record at
// water_stairs (no twin: the record answers). Two boxes, then the dusk the scene skips to; the berth's boat door sails.
// Sets ep6_boarded.
async function ep6_board(s) {
  await stage(s, 'berth_stage6');
  await s.face('yara', 'hero');
  await say(s, 'yara', 'North-west to the sea stacks. The skyport hangs off the last one. Up you come.');
  await say(s, 'bram', 'A port. Hanging off a rock. In the sky. Right.');
  await s.tint('dusk', 90);
  await s.setFlag('ep6_boarded');
}

// ================================================================================================
// Act II: The Airstair (ep6_airstair)
// ================================================================================================

// 4. ep6_airstair, on enter by the berth door. The night at sea is the fade the door already made: dawn, then day.
// Yara is a scene spawn on her ship's deck (she stays with the ship). Sets airstair_arrived.
async function airstair_foot(s) {
  await s.tint('dawn', 0);
  await spawnYara(s, 'yara_boat', 'up');
  await stage(s, 'foot_stage');
  await s.camera.panTo('chain_foot', 40);
  await narrate(s, 'Dawn, after a night at sea. A black stack of rock, white water at its foot, and a chain running up into cloud.');
  await say(s, 'bram', "That's a chain.");
  await s.face('yara_t', 'bram');
  await say(s, 'yara_t', "That's the anchor. The town's on the other end of it.");
  await s.tint('none', 60);
  await s.camera.follow('hero');
  await s.setFlag('airstair_arrived');
}

// 5. ep6_airstair, step trigger mira_trig on the first rope landing. The first truth choice (the H4 pattern: small and
// honest, never a locked route). Bram is a landing below, out of earshot. Sets mira_asked and mira_told or mira_spared.
async function mira_asks(s) {
  await s.walk('bram', 'bram_rope');
  await s.walk('mira', 'mira_rope');
  await s.walk('hero', 'mira_stage');
  await s.face('mira', 'hero');
  await say(s, 'mira', 'The page is yours. Are you scared of what it says?');
  const c = await s.choice(['Yes.', 'No.']);
  await s.setFlag('mira_asked');
  if (c === 0) {
    await s.setFlag('mira_told');
    await say(s, 'mira', 'Good. So am I.');
    await s.wait(30);
    await say(s, 'mira', 'Now there are two of us not saying so.');
    await say(s, 'bram', "Three. I'm being brave about it down here.");
  } else {
    await s.setFlag('mira_spared');
    await say(s, 'mira', '...Okay.');
    await narrate(s, 'She looks at you a moment too long.');
  }
}

// 6. ep6_airstair, step row fight_row (if: mira_asked). The teaching fight for the Gale: e6a_first opens with the Gust
// three actions away (E6-battle's GALE_START). No tutorial box. A loss sets nothing.
async function airstair_fight(s) {
  await s.camera.panTo('foes_drop', 30);
  await s.sfx('gale_gust');
  await narrate(s, 'A shriek on the wind. Two Storm Harriers fold out of the cloud and drop onto the landing.');
  await s.spawn('foe_harrier', { sprite: 'storm_harrier', name: 'Storm Harrier', at: 'foes_drop', dir: 'down' });
  await s.spawn('foe_harrier_b', { sprite: 'storm_harrier', name: 'Storm Harrier', at: 'foes_drop_b', dir: 'down' });
  await all(s.emote('mira', '!'), s.emote('bram', '!'));
  await s.camera.follow('hero');
  await say(s, 'mira', 'Birds that ride the wind. When it gusts, brace, or it throws us back.');
  const result = await s.battle('e6a_first', { canFlee: false });
  if (result !== 'win') return;
  await all(s.despawn('foe_harrier'), s.despawn('foe_harrier_b'));
  await say(s, 'bram', 'Birds. Big birds. On a rope. Fine.');
  await s.setFlag('airstair_fight_done');
}

// 7. ep6_airstair, step trigger first_trig on the third landing, where the stair breaks. Ilex (a scene spawn: his record
// keeps the Galewing Workshop) hangs in a harness on the chain. One line points at the stream; the ride does the rest (bark
// first_ride after the first ride, E6-world). Sets saw_gust.
async function first_gust(s) {
  await s.spawn('ilex_t', { sprite: 'npc_ilex', name: 'Ilex', at: 'ilex_rope', dir: 'left' });
  await stage(s, 'gust_stage');
  await s.camera.panTo('lane_a', 30);
  await narrate(s, 'The stair breaks off. Across the gap a white stream of wind runs to the next ledge, steady as a river.');
  await s.camera.follow('hero');
  await s.face('ilex_t', 'hero');
  await say(s, 'ilex_t', 'Step in the white and the wind takes you. Mind where it puts you down.');
  await s.setFlag('saw_gust');
}

// 8. ep6_airstair, step trigger isles_trig at the top of the stack. Sets saw_isles.
async function isles_view(s) {
  await s.music('mystery');
  await s.camera.panTo('isles_far', 60);
  await narrate(s, 'Through the cloud, into sun. Green islands float in a peach and blue sky, strung together with rope bridges.');
  await say(s, 'mira', 'Islands. Floating.');
  await say(s, 'bram', 'Of course they are.');
  await s.camera.panTo('storm_far', 40);
  await narrate(s, 'Far to the north-east a dark knot of storm sits round a white spire.');
  await s.emote('hero', '...');   // the hero looks longest at the storm
  await s.wait(40);
  await s.camera.follow('hero');
  await s.music('high_moor');
  await s.setFlag('saw_isles');
}

// ================================================================================================
// Act III: Zephyr Landing (ep6_zephyr, ep6_zl_charts)
// ================================================================================================

// 9. ep6_zephyr, on first enter by the south stair. Bennet (the record, at bennet_spot by the board) coils line. The
// board is a picture that clacks (E6-maps-a, two drawn states); nobody explains it. Sets zephyr_arrived.
async function zephyr_arrival(s) {
  await s.music(null);
  await stage(s, 'board_stage');
  await narrate(s, 'Rope bridges, brass domes, cloud gardens. Every wind chime in the plaza is tied silent with black thread.');
  await s.camera.panTo('board', 30);
  await s.music('zephyr');
  await narrate(s, 'Over the plaza the departure board clacks round. Every flight: ARRIVED. The docks under it are empty.');
  await say(s, 'mira', "Arrived. All of them. And nobody's here.");
  await s.face('bennet', 'mira');
  await say(s, 'bennet', "The board's been saying that for a month. The Scribe writes the arrivals now.");
  await say(s, 'bram', "Who's the Scribe?");
  await say(s, 'bennet', 'Keeps the courses, up in the Observatory. Used to.');
  await s.camera.panTo('dock_four', 30);
  await narrate(s, 'At dock four a woman stands with a folded letter, watching an empty berth.');
  await s.camera.follow('hero');
  await s.setFlag('zephyr_arrived');
}

// 10. ep6_zephyr, Liora's talk entry at dock four, first time. Three boxes. Sets liora_met.
async function liora_dock(s) {
  await stage(s, 'dock_stage');
  await s.face('liora', 'hero');
  await say(s, 'liora', 'The board says my sister landed here a month ago. I meet every arrival in case the board is right.');
  await say(s, 'mira', "What's her name?");
  await s.wait(50);   // Liora opens her mouth, and nothing comes
  await say(s, 'liora', '...I had it this morning.');
  await s.setFlag('liora_met');
}

// 11. ep6_zephyr, Aeris's talk entry on the cargo net by the Kestrel at the north dock. Sets met_aeris.
async function meet_aeris(s) {
  await stage(s, 'net_stage');
  await s.face('aeris', 'hero');
  await narrate(s, 'Captain Aeris sits on a cargo net by her airship, the Kestrel. A brass compass lies in her lap. The needle spins.');
  await say(s, 'aeris', "Your slip says the Observatory. Nobody's flown there in a month. The charts say there's nothing there.");
  await say(s, 'aeris', 'This is the Sky Compass. Name a thing and it points to it. Since the storm, it points at everything.');
  await say(s, 'bram', 'Who booked our seats?');
  await say(s, 'aeris', 'Somebody who paid in Keeper silver and signed with a burn. My clerk took it.');
  await say(s, 'aeris', "Come to the chart room. If you're going up there, you should see what the Scribe did to my fleet.");
  await s.setFlag('met_aeris');
}

// 12. ep6_zl_charts, step trigger charts_trig two tiles inside the door (after met_aeris). Aeris and Liora are scene
// spawns here (their records live on ep6_zephyr). The struck manifest is the close-up. Gives liora_letter (kept for
// fifth_voice). Sets charts_seen.
async function chart_room(s) {
  await spawnAeris(s, 'aeris_table', 'down');
  await stage(s, 'charts_stage');
  await s.camera.panTo('aeris_table', 30);
  await narrate(s, 'Manifests are pinned to every wall of the chart room: the crew list of every flight of the fleet.');
  await s.music(null);
  const open = await page(s, 'ep6_manifest', 'struck');
  await narrate(s, 'The last one: eleven names, and one line scratched out so hard the paper is thin. Every copy has it gone.');
  await say(s, 'aeris_t', "My fleet. My last run home. Every manifest has a line struck, and I can't tell you whose. I flew it.");
  await unpage(s, open);
  await s.music('mystery');
  await s.spawn('liora_t', { sprite: 'npc_liora', name: 'Liora', at: 'liora_door', dir: 'up' });
  await s.face('liora_t', 'aeris_t');
  await say(s, 'liora_t', "It's her. I know it's her. I just can't hold the word.");
  await narrate(s, 'Liora gives Mira the letter she carries to every arrival. The name on it slides off the paper, then settles back, faint.');
  await s.give(REWARDS_EP6.liora_letter.item, REWARDS_EP6.liora_letter.qty);
  await say(s, 'mira', "It's still there. Just barely.");
  await say(s, 'bram', 'Somebody wrote her off the wind.');
  await say(s, 'aeris_t', 'Somebody wrote her off everything.');
  await s.despawn('liora_t');   // she goes back to dock four: liora_door (9,12) is the one cell in front of the exit
  await s.camera.follow('hero');
  await s.setFlag('charts_seen');
}

// 13. ep6_zephyr, step trigger anchor_trig on the east dock (after charts_seen). The set piece of Act III, staged as actors
// and a camera shake: the scene owns every move. Aeris (the record, moved for the scene) waits at aeris_east. Teaches
// Anchor (the skill's learn: { flag: 'anchor_learned' }). Sets anchor_learned.
async function anchor_lesson(s) {
  await placeAeris(s, 'aeris_east', 'left');
  await stage(s, 'anchor_stage');
  await s.music(null);
  await s.sfx('gale_gust');
  await s.shake(4, 40);
  await narrate(s, 'A gust comes off the storm and hits the dock like a door slamming. Mira is lifted off her feet toward the edge.');
  await s.walk('mira', 'mira_lift', { speed: 'run' });
  await s.walk('bram', 'bram_spear', { speed: 'run' });
  await s.sfx('anchor_set');
  await narrate(s, 'Bram drives his spear through the planks and catches her wrist, and holds, while the gust goes over.');
  await s.wait(40);
  await s.walk('mira', 'anchor_stage_m');
  await say(s, 'mira', '...Thank you.');
  await say(s, 'bram', "I didn't think. I just held.");
  await s.face('aeris', 'bram');
  await say(s, 'aeris', "That's the first line of the charter. 'Before chasing the horizon, anchor your people.'");
  await say(s, 'aeris', 'Then chase it.');
  await narrate(s, 'Aeris shows Bram how to set the spear so a gust carries you on, instead of off.');
  await s.music('zephyr');
  await s.sfx('level_up_sparkle');
  await s.setFlag('anchor_learned');
  await narrate(s, '{c:gold}Bram learned Anchor. The party holds through the next gust, and the wind carries them on.{/c}');
  await say(s, 'bram', "My dad said 'come home after.' Same idea. Fewer ropes.");
  await s.camera.follow('hero');
}

// 14. ep6_zephyr, step trigger east_trig at the east airstair (after anchor_learned). Gives windward_pass and the
// spinning sky_compass (the party carries it until scribe_after). Sets windward_pass.
async function east_gate(s) {
  await placeAeris(s, 'aeris_gate', 'down');
  await stage(s, 'gate_stage');
  await s.face('aeris', 'hero');
  await narrate(s, 'Aeris presses a brass token into your hand, and then the compass, still spinning.');
  await s.give(REWARDS_EP6.pass.item, REWARDS_EP6.pass.qty);
  await s.give(REWARDS_EP6.compass.item, REWARDS_EP6.compass.qty);
  await say(s, 'aeris', "I won't fly into that storm. I flew the shortest way home once and left somebody behind.");
  await say(s, 'aeris', "I'm not ready to fly the long way yet.");
  await say(s, 'bram', "When you are, we'll be up there.");
  await s.setFlag('windward_pass');
}

// ================================================================================================
// Act IV: The Storm Observatory (ep6_obs_f1, ep6_obs_f2, ep6_obs_f3)
// ================================================================================================

// 15. ep6_obs_f1, on enter. The floor's question: who tied every chime silent? Sets obs_entered, obs_f1_arrived.
async function obs_f1_arrival(s) {
  await s.camera.panTo('ways_in', 40);
  await narrate(s, 'Plank decks and stormglass float on the cloud. White wind streams between them. Every post has its chimes tied.');
  await say(s, 'mira', "Every chime is tied shut. Somebody didn't want the wind heard.");
  await say(s, 'bram', "Then let's listen anyway.");
  await s.camera.follow('hero');
  await s.setFlag('obs_entered');
  await s.setFlag('obs_f1_arrived');
}

// The isles keep sound: Aeris's memories are relay recordings the wind replays, staged as a vignette (scene spawns, a
// cold flash in and out, sorrow with a distant signal lamp). No tint change.
async function memoryIn(s, at) {
  await s.camera.panTo(at, 40);
  await s.music('sorrow');
  await s.sfx('signal_lamp');
  await s.flash('#d8e8ff', 20);
}
async function memoryOut(s, ids) {
  await s.flash('#d8e8ff', 20);
  for (const id of ids) await s.despawn(id);
  await s.music('storm_observatory');
  await s.camera.follow('hero');
}

// 16. ep6_obs_f1, step trigger memory1_trig at the old signal relay. The Shortest Way Home (canon memory, re-aimed).
// Sets aeris_memory_1.
async function aeris_memory_1(s) {
  await stage(s, 'relay_stage');
  await memoryIn(s, 'relay_old');
  await s.spawn('aeris_m', { sprite: 'npc_aeris_young', name: 'Aeris', at: 'relay_aeris', dir: 'up' });
  await s.spawn('apprentice_v', { sprite: 'npc_pippa', name: 'The Signal Apprentice', at: 'relay_lamp', dir: 'down' });
  await narrate(s, 'The relay crackles, and replays the wind of a month ago: a fleet in a rising storm, and a lamp on a beacon deck.');
  await say(s, 'scribe_v', 'THE SHORTEST COURSE IS WRITTEN. TAKE IT.');
  await say(s, 'aeris_m', 'Turn for home. Follow the chart.');
  await s.face('apprentice_v', 'aeris_m');
  await say(s, 'apprentice_v', "I've got the light. Go. I'll keep it lit till you come back.");
  await narrate(s, 'The fleet turns for home. On the beacon deck, a small lamp stays lit behind it.');
  await memoryOut(s, ['aeris_m', 'apprentice_v']);
  await say(s, 'bram', 'And nobody came back.');
  await s.setFlag('aeris_memory_1');
}

// 17. The Sky Compass Key is the gold chest on the upper deck (flag compass_key_found). The lift up runs this silent
// step trigger. Sets obs_f1_done.
async function obs_f1_lift(s) {
  await s.setFlag('obs_f1_done');
}

// 18. ep6_obs_f2, on enter. Two boxes. Sets obs_f2_arrived.
async function obs_f2_arrival(s) {
  await narrate(s, 'A roofed hall of brass relays and speaking tubes. Wind breathes up through grilles in the floor.');
  await say(s, 'mira', 'Every dial in here is spun to a wrong number. Every one.');
  await s.setFlag('obs_f2_arrived');
}

// 19. ep6_obs_f2, step trigger memory2_trig at the manifest relay. The Name Removed From the Crew (canon). Sets
// aeris_memory_2.
async function aeris_memory_2(s) {
  await stage(s, 'manifest_stage');
  await memoryIn(s, 'relay_manifest');
  await s.spawn('aeris_m', { sprite: 'npc_aeris_young', name: 'Aeris', at: 'manifest_aeris', dir: 'down' });
  await s.spawn('deckhand_m', { sprite: 'npc_deckhand', name: 'A Deckhand', at: 'manifest_deck', dir: 'left' });
  await narrate(s, 'The relay replays a night: a quill drawing one line through one name, on every manifest at once.');
  await say(s, 'scribe_v', 'AN EXTRA NAME. A BEACON POINTS AT THE EYE. A BEACON IS A ROAD. STRUCK.');
  await s.face('deckhand_m', 'aeris_m');
  await say(s, 'deckhand_m', "Captain, the apprentice's lamp is still lit back there.");
  await say(s, 'aeris_m', 'What apprentice?');
  await memoryOut(s, ['aeris_m', 'deckhand_m']);
  await say(s, 'mira', "She wasn't lost. She was edited.");
  await s.setFlag('aeris_memory_2');
}

// 20. ep6_obs_f2, step trigger vex_trig at the crown relay, placed so the party stops two rows below Vex (party_stop).
// Vex works with his back to the party, opaque, and never fights. 12 boxes. Gives sixth_list. Sets sixth_list_get,
// vex_relay_met.
async function vex_relay(s) {
  await s.music(null);
  await s.camera.panTo('crown', 40);
  await spawnVex(s, 'vex_spot', 'up');
  await stage(s, 'party_stop');
  await narrate(s, 'Vex Quill, coat torn, has both arms inside the crown relay, trying to splice one signal through the storm.');
  await s.music('mystery');
  await s.face('vex_k', 'hero');
  await say(s, 'vex_k', "You got the slip. Good. I booked four. I wasn't sure I'd make the flight.");
  await say(s, 'bram', "You're the fourth seat.");
  await say(s, 'vex_k', 'The sky routes are being rewritten. I prefer to choose where I vanish.');
  await narrate(s, 'He holds out a list: cheap paper, the cold hand, the seal of the empty book.');
  await say(s, 'vex_k', "Six lists. This one's a month old, and it hasn't got a single name on it.");
  await s.give(REWARDS_EP6.sixth_list.item, REWARDS_EP6.sixth_list.qty);
  await s.setFlag('sixth_list_get');
  await narrate(s, 'It reads, in capitals: THE FIRST PAGE. LET NOTHING REACH THE SHELF.');
  await say(s, 'mira', 'A list with no names.');
  await say(s, 'vex_k', "It's not hunting a person. It's hunting a page. Guess whose.");
  await say(s, 'bram', 'Who asked you to keep {hero}? In writing. You said.');
  await say(s, 'vex_k', 'Ask me at the top. If we get to the top.');
  await s.sfx('gust_carry');
  await s.despawn('vex_k');
  await narrate(s, 'He swings into a duct, and the wind takes him up.');
  await s.music('storm_observatory');
  await s.camera.follow('hero');
  await s.setFlag('vex_relay_met');
}

// 21. ep6_obs_f2, arena trigger engine_trig in the bellows hall. Mini-boss intro in the Episode 5 style; a retry plays
// only Bram's tip and the card. The encounter flag sets engine_defeated.
async function gale_engine(s) {
  if (await s.hasFlag('engine_defeated')) return;
  const retry = await s.hasFlag('engine_tried');
  await s.music(null);
  await s.camera.panTo('engine_spot', 40);
  await s.wait(retry ? 10 : 30);
  if (!retry) {
    await stage(s, 'arena_stage');
    await narrate(s, 'A brass engine the height of a house, fan blades in its chest, bellows on its back. It drives the wind of the Hall.');
    await narrate(s, EP6_ARC_LINES.gale_engine);
  } else {
    await s.shake(2, 30);
  }
  await say(s, 'bram', TIPS.gale_engine);
  await s.setFlag('engine_tried');
  await s.title(EP6_BOSS_CARDS.gale_engine.name, { sub: EP6_BOSS_CARDS.gale_engine.sub, frames: 100 });
  await s.shake(4, 30);
  await s.music('battle');
  const result = await s.battle('gale_engine', { boss: true, canFlee: false });
  if (result !== 'win') return;
  await s.setFlag('engine_defeated');
  await s.music('storm_observatory');
  await say(s, 'mira', 'It was only ever doing what the wind told it.');
  await say(s, 'bram', "So's half this town.");
  await s.camera.follow('hero');
}

// The lift up from the bellows hall runs this silent step trigger. Sets obs_f2_done.
async function obs_f2_lift(s) {
  await s.setFlag('obs_f2_done');
}

// 22. ep6_obs_f2, the locker object locker_obj on its ledge (side story 2). The gold chest beside it (present if
// locker_found) holds the reward. Sets locker_found.
async function locker(s) {
  if (await s.hasFlag('locker_found')) {
    await narrate(s, 'The Emergency Locker stands open. Somebody planned to be rescued, and very nearly was.');
    return;
  }
  await narrate(s, "A locker bolted to the ledge, painted with a rescue star: THE SKY SAILORS' EMERGENCY LOCKER. The latch gives.");
  await s.sfx('chest_open');
  await say(s, 'bram', 'Three logs and a locker. Somebody planned to be rescued.');
  await s.setFlag('locker_found');
}

// 23. ep6_obs_f3, on enter. Chains aeris_turns (24) at once, so a reload between the two replays only the Kestrel.
// Sets obs_f3_arrived.
async function obs_f3_arrival(s) {
  if (!(await s.hasFlag('obs_f3_arrived'))) {
    await s.camera.panTo('spire_top', 40);
    await narrate(s, 'The spire climbs through the inside of the storm. A ring of wind runs round it. At the very top, a steady light.');
    await say(s, 'bram', "There's a light up there.");
    await say(s, 'mira', "Lightning doesn't stay put.");
    await s.camera.follow('hero');
    await s.setFlag('obs_f3_arrived');
  }
  await aeris_turns(s);
}

// 24. Chained from obs_f3_arrival on the first landing (not a scene of its own: no map event starts it). The Kestrel
// noses in at kestrel_berth; Aeris (a scene spawn) jumps down with a lamp and walks with the party as an actor from here.
// She does not fight. Sets aeris_came.
async function aeris_turns(s) {
  await s.sfx('lift_rumble');
  await s.camera.panTo('kestrel_berth', 40);
  await narrate(s, 'Engines, in the storm. The Kestrel comes up through the cloud and noses against the landing.');
  await spawnAeris(s, 'aeris_top', 'down');
  await s.jump('aeris_t');
  await stage(s, 'kestrel_stage');
  await s.camera.follow('hero');
  await say(s, 'aeris_t', 'I followed the chart home once. Not twice.');
  await say(s, 'bram', 'Long way, then?');
  await say(s, 'aeris_t', 'Long way.');
  // the first landing and the Anchor deck are joined only by the ring (no walk path): she takes the Kestrel's rope up
  await spawnAeris(s, 'aeris_wait_1', 'down');
  await s.setFlag('aeris_came');
}

// 25. The three pledges: each landing's signal lamp object, after its lane puzzle, in climbing order. The lamp lights by
// itself; the charter line carved under it; then the voice on the wind from the top of the spire (live, not a memory)
// and one line from Aeris. Canon words (the Last Pilot Charter), lines new.
const PLEDGES = {
  pledge_anchor: { n: 1, at: 'anchor', carved: 'Before chasing the horizon, ANCHOR your people.',
    voice: 'Still here. Still lit.', aeris: 'She always answered the check-call first.' },
  pledge_listen: { n: 2, at: 'listen', carved: 'LISTEN for those the charts omit.',
    voice: "Somebody's on the stair. I can hear the lamps.", aeris: "Listen for those the charts omit. I didn't." },
  pledge_return: { n: 3, at: 'return', carved: 'Finally RETURN for anyone the sky has abandoned.',
    voice: "If that's you, Captain, you're late.", aeris: "...I'm late." },
};
async function pledge(s, flag) {
  const P = PLEDGES[flag];
  await spawnAeris(s, `aeris_wait_${P.n}`, 'up');
  await stage(s, `${P.at}_stage`);
  await s.camera.panTo(P.at, 30);
  await s.sfx('signal_lamp');
  await narrate(s, `The signal lamp lights by itself. Carved in the stone under it: ${P.carved}`);
  await say(s, 'apprentice_v', P.voice);   // far off, on the wind, from the top of the spire
  await say(s, 'aeris_t', P.aeris);
  await s.camera.follow('hero');
  await s.setFlag(flag);
}
const pledge_anchor = (s) => pledge(s, 'pledge_anchor');
const pledge_listen = (s) => pledge(s, 'pledge_listen');
const pledge_return = (s) => pledge(s, 'pledge_return');

// 26. ep6_obs_f3, step trigger fall_trig on the broken causeway between Listen and Return. The set piece of Act IV and
// Bram's beat: actors, a shake, and the line drawn by the scene (rope helper). The party stops on party_stop_fall, two
// rows below Vex's edge mark; nobody ever stands off the edge. No humor while he hangs. 15 boxes (budget 16). Sets
// vex_held, asker_known.
async function vex_falls(s) {
  await spawnVex(s, 'vex_edge', 'up');
  await stage(s, 'party_stop_fall');
  await s.camera.panTo('vex_edge', 30);
  await narrate(s, 'Vex is ahead of you on the causeway. Then a gust lane snaps sideways, like a sheet in the wind.');
  await s.music(null);
  await s.sfx('gale_gust');
  await s.shake(4, 30);
  await spawnVex(s, 'vex_hang', 'up');   // torn off the planks: he hangs below the edge
  await s.walk('bram', 'bram_line', { speed: 'run' });
  await s.sfx('anchor_set');
  const drawn = await rope(s, 'bram_line', 'vex_hang');
  await narrate(s, 'Bram sets his spear and throws the line. Vex hangs over nothing on the end of it. The line holds.');
  await say(s, 'vex_k', 'You want to know who asked. Fine. Pull me up first.');
  await unrope(s, drawn);
  await spawnVex(s, 'vex_edge', 'down');
  await narrate(s, 'Bram pulls. Vex sits on the planks, breathing. He takes a letter from inside his coat.');
  await s.music('mystery');
  const open = await page(s, 'ep6_letter');
  await narrate(s, "A short letter in a warm, hurried hand: keep a child's first page where no list can read it.");
  await narrate(s, 'You will be asked for nothing else. Where the name should be, a clean blank. Under it, an open book.');
  await unpage(s, open);
  await say(s, 'vex_k', "A Keeper wrote that. Somebody took the name off the letter. They couldn't take the letter.");
  await say(s, 'mira', 'Look at the k.');
  await say(s, 'vex_k', "I know. I've looked at that k for a long time.");
  await say(s, 'vex_k', 'I was fourteen. I mended bindings for the people who write the lists.');
  await say(s, 'vex_k', 'Nobody had ever asked me for anything.');
  await say(s, 'bram', 'And you said yes.');
  await say(s, 'vex_k', 'I said yes. I put it above the clouds, where nothing reads.');
  await say(s, 'bram', 'You held on to it for years. Somebody should hold on to you.');
  await narrate(s, 'Vex has nothing to say to that, for once. He gets up, and goes on up the spire ahead of you.');
  await s.walk('vex_k', 'vex_ahead');
  await s.despawn('vex_k');
  await s.camera.follow('hero');
  await s.setFlag('vex_held');
  await s.setFlag('asker_known');
}

// 27. ep6_obs_f3, the beacon platform (trigger beacon_trig, after pledge_return). The fifth voice, made live. "The Signal
// Apprentice" becomes "Pippa" on the beat Mira reads the name off Liora's letter. Then the main truth choice. Sets
// pippa_found, scribe_door_open, and told_aeris or kept_from_aeris.
async function fifth_voice(s) {
  await s.music(null);
  await s.camera.panTo('pippa_spot', 40);
  await s.spawn('apprentice_v', { sprite: 'npc_pippa', name: 'The Signal Apprentice', at: 'pippa_spot', dir: 'down' });
  await spawnAeris(s, 'aeris_beacon', 'up');
  await stage(s, 'beacon_stage');
  await narrate(s, 'A small platform of stormglass, a ring of empty crates, and a young woman in a signal-jacket, keeping a lamp lit.');
  await s.face('apprentice_v', 'aeris_t');
  await say(s, 'apprentice_v', "I held the light. I kept saying my name to stay awake. Then I couldn't find it.");
  await narrate(s, "Mira takes out Liora's letter. Under the lamp, the name on it holds still.");
  await say(s, 'mira', 'Pippa. Pippa Voss.');
  // the swap: same mark, same sprite, her name on the speaker tag
  await s.despawn('apprentice_v');
  await s.spawn('pippa_t', { sprite: 'npc_pippa', name: 'Pippa', at: 'pippa_spot', dir: 'down' });
  await s.music('sorrow');
  await s.sfx('name_restore');
  await s.flash('#fff2d0', 12);
  await say(s, 'aeris_t', '...Pippa. I left you the light.');
  await say(s, 'pippa_t', "You came back. That's what the light was for.");
  await say(s, 'pippa_t', 'Please remember that we came back for each other.');
  await s.setFlag('pippa_found');
  await s.music('mystery');
  await s.face('aeris_t', 'hero');
  await say(s, 'aeris_t', "Vex says the storm's hunting a page. Whose?");
  const c = await s.choice(["Mine. It's hunting my page.", "Nobody's. Let's go."]);
  if (c === 0) {
    await s.setFlag('told_aeris');
    await s.wait(60);   // Aeris is quiet a long time
    await say(s, 'aeris_t', '...Then it picked the wrong captain to scare off.');
  } else {
    await s.setFlag('kept_from_aeris');
    await say(s, 'aeris_t', 'Fine. Later.');
  }
  await s.camera.panTo('keyhole', 30);
  await narrate(s, 'Behind the lamp stands a door with a compass rose for its lock: the Sky Compass Keyhole.');
  await s.camera.follow('hero');
  await s.setFlag('scribe_door_open');
}

// ================================================================================================
// Act V: The Storm Scribe (ep6_obs_eyrie)
// ================================================================================================

// 28. ep6_obs_eyrie, step trigger row scribe_trig. Boss intro; the Scribe is the map actor `scribe` (sprite scribe_avatar)
// coiled over the desk. Aeris follows up the stair as a scene spawn. After a loss: the pan, Bram's tip, the card. A win
// chains scribe_after.
async function scribe(s) {
  if (await s.hasFlag('scribe_defeated')) return;
  await s.music(null);
  await spawnAeris(s, 'aeris_enter', 'up');
  await s.camera.panTo('desk', 40);
  if (await s.hasFlag('scribe_tried')) {
    await s.shake(2, 30);
    await say(s, 'bram', TIPS.scribe);
    await scribe_fight(s);
    return;
  }
  await stage(s, 'party_stop');
  await s.wait(40);
  await narrate(s, 'A round deck open to the storm. Quills hang in the air over a desk of stormglass, writing by themselves.');
  await narrate(s, 'Coiled over the desk on wings of cloud and ink, a beast with electric-blue feathers.');
  await narrate(s, EP6_ARC_LINES.scribe);
  await say(s, 'scribe', 'PASSENGERS: THREE. COURSE: NONE. NOTHING REACHES THE SHELF.');
  await s.shake(2, 30);
  await say(s, 'scribe', 'EVERY COURSE IS WRITTEN. I HAVE WRITTEN YOURS.');
  await say(s, 'aeris_t', 'Who told you to write us out?');
  await say(s, 'scribe', 'A LIST. IT IS WRITTEN.');
  await say(s, 'bram', "Written's not the same as true. Ask a Regent. Ask an Oracle.");
  const c = await s.choice(['Write us a way up.', 'Hold on, everyone.']);
  if (c === 0) await say(s, 'scribe', 'EVERY WAY UP IS STRUCK. THAT IS THE COURSE.');
  else await say(s, 'scribe', 'NOTHING HOLDS. THE WIND TAKES THE SHORTEST WAY.');
  await say(s, 'bram', TIPS.scribe);
  await scribe_fight(s);
}
async function scribe_fight(s) {
  await s.setFlag('scribe_tried');
  await s.title(EP6_BOSS_CARDS.scribe.name, { sub: EP6_BOSS_CARDS.scribe.sub, frames: 100 });
  await s.shake(4, 30);
  await s.flash('#ffffff', 10);
  await s.music('boss_scribe');
  const result = await s.battle('scribe', { boss: true, canFlee: false });
  if (result !== 'win') return;
  await scribe_after(s);
}

// 29. ep6_obs_eyrie, after the win (also runnable on its own, from an enter trigger after a reload). The order is the
// bible's: the quills fall, the Wind Script, the restored manifest (Pippa's line), the counter-seal and the sixth
// fragment, the compass, the lid, the feather. 16 boxes (budget 18). Gives name_fragment_6. Sets scribe_defeated,
// wind_script_restored, fragment6_get, compass_restored.
async function scribe_after(s) {
  await s.setFlag('scribe_defeated');
  await spawnAeris(s, 'aeris_enter', 'up');
  await s.camera.panTo('desk', 20);
  await s.shake(3, 40);
  await s.sfx('boss_die');
  await s.flash('#ffffff', 16);
  await s.music('sorrow');
  await narrate(s, 'The Scribe settles onto its desk. The quills fall out of the air, one by one.');
  await say(s, 'scribe', 'I WROTE EVERY COURSE. I NEVER WROTE ONE BACK.');
  await s.wait(30);
  await say(s, 'scribe', 'I WAS TOLD TO KEEP THEM FROM THE SHELF.');
  await narrate(s, 'Its wings open like sails, and long banners of sail-cloth unroll in the wind: every name of the realm, a line.');
  await s.camera.panTo('chart_spot', 30);
  await stage(s, 'chart_spot');
  await s.sfx('name_restore');
  await s.flash('#fff2d0', 16);
  await s.music('triumph');
  await narrate(s, "The struck lines write themselves back across the cloth, one after another. The first is the apprentice's.");
  const open = await page(s, 'ep6_manifest', 'restored');
  await narrate(s, "The fleet's last crew list, with its twelfth line back: Pippa Voss.");
  await unpage(s, open);
  await s.music('mystery');
  await narrate(s, 'Under your line on the cloth, an open book with one line. Under it, in the wind: Keep this one.');
  await s.give(REWARDS_EP6.fragment.item, REWARDS_EP6.fragment.qty);
  await s.setFlag('fragment6_get');
  await say(s, 'bram', 'Six.');
  await say(s, 'mira', 'Six. And this time somebody told us why.');
  await s.setFlag('wind_script_restored');
  await narrate(s, 'In your bag the Sky Compass stops spinning. You hold it out to Aeris on your palm.');
  await say(s, 'aeris_t', 'Shelf.');
  await narrate(s, 'The needle swings straight up.');
  await s.setFlag('compass_restored');
  await s.music(null);
  await s.tint('none', 90);
  await narrate(s, 'The storm opens over the spire like a lid lifting. On the top of the cloud sits a small round building: a library.');
  await s.camera.panTo('feather_spot', 30);
  await narrate(s, 'On the desk lies the black feather. It does not move in the wind.');
  await say(s, 'bram', "He's already up there.");
  await say(s, 'mira', "Or he's waiting for a seat.");
  await s.camera.follow('hero');
}

// ================================================================================================
// Act VI: The Cloud Library (ep6_library)
// ================================================================================================

// 30. ep6_library, on enter by the Kestrel's door from the Eyrie. Vex and Aeris are scene spawns. The first page opens in
// three steps (name, seal, torn), "Keep this one." the last line under the last step. One line by each truth choice.
// 16 boxes (budget 18). Sets library_reached, first_page_read.
async function cloud_library(s) {
  await s.music(null);
  await spawnVex(s, 'vex_shelf', 'up');
  await spawnAeris(s, 'aeris_door', 'up');
  await stage(s, 'party_stop');
  await s.camera.panTo('shelf', 30);
  await narrate(s, 'A round reading room on the top of the cloud, open to the sun. Shelves of weather logs. One page lies under glass.');
  await s.face('vex_k', 'hero');
  await say(s, 'vex_k', 'There. Your beginning. Half of it.');
  await s.music('mystery');
  let open = await page(s, 'ep6_page', 'name');
  await narrate(s, 'Your name, in the warm hand. The first time it was ever written.');
  open = (await page(s, 'ep6_page', 'seal')) || open;
  await narrate(s, 'Under it, the counter-seal: an open book with one line.');
  open = (await page(s, 'ep6_page', 'torn')) || open;
  await s.music('sorrow');
  await narrate(s, 'At the bottom, the start of another line, torn straight across: Carried down the White Road by');
  await narrate(s, 'And above the tear, in full, the line you know: Keep this one.');
  await unpage(s, open);
  await say(s, 'mira', "That's the first one. Every other copy was made from this.");
  await say(s, 'vex_k', 'Half. I only ever had half. The other half went north with whoever wrote it.');
  if (await s.hasFlag('mira_told')) {
    await say(s, 'mira', 'You said you were scared. Still?');
    await s.emote('hero', '...');
    await say(s, 'mira', 'Me too. It helps, saying.');
  } else {
    await say(s, 'mira', "You said you weren't scared.");
    await s.wait(30);
    await say(s, 'mira', "I didn't believe you then either.");
  }
  if (await s.hasFlag('told_aeris')) await say(s, 'aeris_t', "So that's what the storm was for. Glad I didn't know, flying up.");
  else await say(s, 'aeris_t', "You knew, on the spire. Fine. I'd have kept it too.");
  await narrate(s, 'Vex sets the glass back over the page.');
  await say(s, 'vex_k', "Where it goes, a list follows. I'm used to being followed. I'll keep it a while longer.");
  await say(s, 'bram', "Then you're coming with us.");
  await say(s, 'vex_k', '...Ask me at the bottom.');
  await narrate(s, 'He does not leave. On the way down, he sits in the fourth seat.');
  await s.music(null);
  await s.camera.follow('hero');
  await s.setFlag('library_reached');
  await s.setFlag('first_page_read');
}

// ================================================================================================
// Act VII: The Sky Remembers (ep6_zephyr)
// ================================================================================================

// 31. ep6_zephyr, on arrival at the north dock by the Kestrel's door from the library (after cloud_library). Dawn. Liora
// is her own record at dock four; Pippa a scene spawn down the gangway; Aeris the record, moved to the Kestrel's rail.
// 8 boxes (budget 14). Aeris's gift by the spire choice. Sets isles_restored; chains ep6_ending (which sets pippa_home).
async function isles_return(s) {
  await s.music(null);
  await s.tint('dawn', 60);
  await placeAeris(s, 'kestrel_rail', 'down');
  await stage(s, 'home_stage');
  await s.camera.panTo('board', 40);
  for (let i = 0; i < 3; i++) { await s.sfx('signal_lamp'); await s.wait(30); }
  await narrate(s, 'Dawn. For the first time, the chimes of Zephyr Landing ring. The board clacks round to one line: LANDED, DOCK FOUR.');
  await s.camera.panTo('dock_four', 40);
  await s.spawn('pippa_t', { sprite: 'npc_pippa', name: 'Pippa', at: 'gangway', dir: 'down' });
  await s.walk('pippa_t', 'pippa_down');
  await narrate(s, 'Liora is at dock four. Pippa comes down the gangway. Liora drops the letter.');
  await say(s, 'liora', '...Pippa.');
  await s.face('pippa_t', 'liora');
  await say(s, 'pippa_t', "You're at the right dock this time.");
  await s.emote('liora', 'heart');
  await s.music('zephyr');
  await s.camera.panTo('kestrel_rail', 40);
  await narrate(s, 'From the rail of the Kestrel, Aeris reads out the names of every pilot and passenger the wind tried to forget.');
  await narrate(s, 'The last name she reads is Pippa Voss. Across the isles, the signal towers light in reply.');
  await s.camera.follow('hero');
  await s.walk('aeris', 'gift_aeris');
  await s.face('aeris', 'hero');
  const gift = (await s.hasFlag('told_aeris')) ? REWARDS_EP6.gift_truth : REWARDS_EP6.gift_hidden;
  await s.give(gift.item, gift.qty);
  await say(s, 'aeris', "Fly the long way. It's the only one that gets everybody home.");
  await say(s, 'bram', "Ask who told them. Then hold on to who's left. That's two ideas. I'm keeping both.");
  await s.setFlag('isles_restored');
  await s.tint('none', 60);
  await ep6_ending(s);
}

// 32. ep6_zephyr, the roof of the chart tower at night, straight after. Vex at the rail with the page under his coat. End
// cards. Sets pippa_home (once the spawn is gone) and ep6_complete; the hooks then roll CREDITS_EP6 (counter
// credits6_rolled), show END_CARD_EP6 and wake the party at ep6_zl_inn inn_bed. 10 boxes.
async function ep6_ending(s) {
  await s.fade('out', 60);
  await s.despawn('pippa_t');
  await s.setFlag('pippa_home');   // after the spawn is gone, so the record (shown from pippa_home) never doubles her
  await s.tint('night', 0);
  await s.music(null);
  await spawnVex(s, 'roof_vex', 'up');
  await placeAeris(s, 'roof_aeris', 'up');
  await stage(s, 'roof_stage');
  await s.camera.panTo('roof_view', 0);
  await s.fade('in', 90);
  await narrate(s, 'That night, on the roof of the chart tower. Vex leans on the rail, the page under his coat.');
  await say(s, 'mira', 'Can it find the other half?');
  await say(s, 'aeris', 'Name it.');
  await say(s, 'mira', 'The other half of the first page.');
  await s.music('mystery');
  await narrate(s, 'The needle swings north, and stays.');
  await s.camera.panTo('north_far', 60);
  await narrate(s, 'Far to the north, under the moon, a range of white mountains, and a pale road climbing into them.');
  await narrate(s, 'For a breath the road is not there. Then it is.');
  await say(s, 'mira', "The map's forgetting the north.");
  await say(s, 'bram', 'Then we remember it for the map.');
  await say(s, 'vex_k', "The White Road. I haven't been up it since...");
  await s.wait(60);   // he stops there (Episode 7)
  await s.fade('out', 120);
  await s.despawn('vex_k');
  await s.title(END_TITLE_EP6.text, { sub: END_TITLE_EP6.sub, frames: 240 });
  await s.title(EPISODE7_CARD.text, { sub: EPISODE7_CARD.sub, frames: 240 });
  await s.setFlag('ep6_complete');
}

// ------------------------------------------------------------------------------------------------
// Side stories (EPISODE6.md section 2)
// ------------------------------------------------------------------------------------------------

// The Signal Beacon of Lost Flights. Suri's talk entry in the chart room once charts_seen starts it, and she is her own
// witness at once (testimony_suri is part of beacon_start, not a scene of its own); then Liora's and Bennet's talk
// entries; then the beacon object at the tower (beacon_light).
async function beacon_start(s) {
  await s.face('suri', 'hero');
  await say(s, 'suri', 'The Signal Beacon of Lost Flights is on the roof of this tower. When it burned, the fleet could hear.');
  await say(s, 'suri', "It wants three witnesses before it will burn. Liora at dock four. Bennet on the docks. And me.");
  await say(s, 'bram', 'Witnesses again. Mira loves witnesses.');
  await s.setFlag('beacon_started');
  await testimony_suri(s);
}
async function testimony_suri(s) {
  await say(s, 'suri', 'I drew every chart in this room. Last month they redrew themselves overnight.');
  await say(s, 'suri', 'My own hand, pointing everyone wrong.');
  await s.setFlag('testimony_suri');
}
async function testimony_liora(s) {
  await s.face('liora', 'hero');
  await say(s, 'liora', 'The Storm Scribe replaced our rescue beacons with false arrival times.');
  await say(s, 'liora', 'My sister waited at the wrong dock until the clouds swallowed her signal. Now I wait at this one.');
  await s.setFlag('testimony_liora');
}
async function testimony_bennet(s) {
  await s.face('bennet', 'hero');
  await say(s, 'bennet', 'Our old rule: an honest captain turns back when a beacon calls.');
  await say(s, 'bennet', 'The Scribe erased the word RETURN from every flight plan. I watched the cloudbanks. Nobody turned.');
  await s.setFlag('testimony_bennet');
}
// The beacon object (beacon_ring) at the Signal Beacon tower (if: beacon_started). Before the three witnesses: one box.
// Lit: one box (it is a rest and save point from beacon_lit, E6-maps-a). +20 Fury at the Scribe from beacon_lit.
async function beacon_light(s) {
  if (await s.hasFlag('beacon_lit')) {
    await narrate(s, 'The Signal Beacon burns, steady and white, over the isles. Somebody out there is steering by it.');
    return;
  }
  if (!((await s.hasFlag('testimony_liora')) && (await s.hasFlag('testimony_bennet')) && (await s.hasFlag('testimony_suri')))) {
    await narrate(s, 'The Signal Beacon of Lost Flights: a great brass ring round a cold lamp. Three witnesses light it, Suri says.');
    return;
  }
  await stage(s, 'beacon_stage6');
  await narrate(s, 'You turn the brass ring. The lamp catches, and the beacon burns white over the Skybound Isles.');
  await s.sfx('signal_lamp');
  await s.flash('#fff8e0', 12);
  await narrate(s, 'Far off, a ship sounds its horn. Then another. The fleet can hear again.');
  await s.give(REWARDS_EP6.beacon.item, REWARDS_EP6.beacon.qty);
  await s.give(REWARDS_EP6.beacon_ether.item, REWARDS_EP6.beacon_ether.qty);
  await s.give('gold', REWARDS_EP6.beacon.gold);
  await s.give(REWARDS_EP6.beacon_coat.item, REWARDS_EP6.beacon_coat.qty);
  await say(s, 'mira', 'Three witnesses, one light. Somebody out there just turned toward it.');
  await s.setFlag('beacon_lit');
  await s.setFlag('beacon_done');
}

// Piri's Dead Letters. Piri's talk entry from zephyr_arrived starts it; the three letters are chests (letter_1_found..3,
// present once letters_started); his talk entry with all three found ends it. Cut line 1 drops it (EPISODE6 section 2).
async function letters_start(s) {
  await s.face('piri', 'hero');
  await say(s, 'piri', 'Letters arrive here tied to birds with silver ribbons. I sort them at the landing before the ships depart.');
  await say(s, 'piri', 'The storm blew three out of my sack. One on the Airstair, by a post. Two out on the Observatory causeways.');
  await say(s, 'bram', 'That was your bird at our shutter, then. We owe you a letter or three.');
  await s.setFlag('letters_started');
}
async function letters_done(s) {
  await s.face('piri', 'hero');
  await narrate(s, 'You hand over three letters, damp from the cloud. Piri ties each one to a bird with a silver ribbon.');
  await s.take(REWARDS_EP6.dead_letter.item, REWARDS_EP6.dead_letter.qty);
  await say(s, 'piri', 'True courses, all three. The wind reads them right again.');
  await s.give(REWARDS_EP6.letters.item, REWARDS_EP6.letters.qty);
  await narrate(s, 'In the bottom of the sack Piri finds one more, old and soft at the folds.');
  await say(s, 'piri', 'Came off a northbound ship years back. Addressed to Willowmere. Nobody flies to Willowmere.');
  await s.give(REWARDS_EP6.white_road.item, REWARDS_EP6.white_road.qty);
  await s.setFlag('white_road_letter_get');
  await say(s, 'piri', "You're going home sometime. Carry it.");
  await s.setFlag('letters_done');
}

// ------------------------------------------------------------------------------------------------
// Scene registry. Every flag is declared in flags.js. `ep6_morning` needs the switch (live) and not Fine Print; every
// other chain bottoms out at ep6_started, which only ep6_morning sets.
// ------------------------------------------------------------------------------------------------
const TESTIMONIES = ['testimony_liora', 'testimony_bennet', 'testimony_suri'];
const LETTERS = ['letter_1_found', 'letter_2_found', 'letter_3_found'];
export const SCENE_CONDITIONS = {
  ep6_morning: { if: 'ep5_complete', ifNot: ['ep6_morning_done', 'tier_1'], live: true },
  ep6_board: { if: 'ep6_started', ifNot: 'ep6_boarded' },
  airstair_foot: { if: 'ep6_boarded', ifNot: 'airstair_arrived' },
  mira_asks: { if: 'airstair_arrived', ifNot: 'mira_asked' },
  airstair_fight: { if: 'mira_asked', ifNot: 'airstair_fight_done' },
  first_gust: { if: 'airstair_arrived', ifNot: 'saw_gust' },
  isles_view: { if: 'airstair_arrived', ifNot: 'saw_isles' },
  zephyr_arrival: { if: 'airstair_arrived', ifNot: 'zephyr_arrived' },
  liora_dock: { if: 'zephyr_arrived', ifNot: 'liora_met' },
  meet_aeris: { if: 'zephyr_arrived', ifNot: 'met_aeris' },
  chart_room: { if: 'met_aeris', ifNot: 'charts_seen' },
  anchor_lesson: { if: 'charts_seen', ifNot: 'anchor_learned' },
  east_gate: { if: 'anchor_learned', ifNot: 'windward_pass' },
  obs_f1_arrival: { if: 'windward_pass', ifNot: 'obs_f1_arrived' },
  aeris_memory_1: { if: 'obs_f1_arrived', ifNot: 'aeris_memory_1' },
  obs_f1_lift: { if: 'obs_f1_arrived', ifNot: 'obs_f1_done' },
  obs_f2_arrival: { if: 'obs_f1_done', ifNot: 'obs_f2_arrived' },
  aeris_memory_2: { if: 'obs_f2_arrived', ifNot: 'aeris_memory_2' },
  vex_relay: { if: 'obs_f2_arrived', ifNot: 'vex_relay_met' },
  gale_engine: { if: 'obs_f2_arrived', ifNot: 'engine_defeated' },
  obs_f2_lift: { if: 'engine_defeated', ifNot: 'obs_f2_done' },
  locker: { if: 'obs_f2_arrived' },
  obs_f3_arrival: { if: 'obs_f2_done', ifNot: 'aeris_came' },
  pledge_anchor: { if: 'aeris_came', ifNot: 'pledge_anchor' },
  pledge_listen: { if: 'pledge_anchor', ifNot: 'pledge_listen' },
  vex_falls: { if: 'pledge_listen', ifNot: 'vex_held' },
  pledge_return: { if: 'pledge_listen', ifNot: 'pledge_return' },
  fifth_voice: { if: 'pledge_return', ifNot: 'pippa_found' },
  scribe: { if: 'scribe_door_open', ifNot: 'scribe_defeated' },
  scribe_after: { if: 'scribe_defeated', ifNot: 'compass_restored' },
  cloud_library: { if: 'compass_restored', ifNot: 'library_reached' },
  isles_return: { if: 'library_reached', ifNot: 'isles_restored' },
  ep6_ending: { if: 'isles_restored', ifNot: 'ep6_complete' },
  beacon_start: { if: 'charts_seen', ifNot: 'beacon_started' },
  testimony_liora: { if: ['beacon_started', 'liora_met'], ifNot: 'testimony_liora' },
  testimony_bennet: { if: 'beacon_started', ifNot: 'testimony_bennet' },
  beacon_light: { if: 'beacon_started' },
  letters_start: { if: 'zephyr_arrived', ifNot: 'letters_started' },
  letters_done: { if: LETTERS, ifNot: 'letters_done' },
};

const RAW = {
  ep6_morning, ep6_board,
  airstair_foot, mira_asks, airstair_fight, first_gust, isles_view,
  zephyr_arrival, liora_dock, meet_aeris, chart_room, anchor_lesson, east_gate,
  obs_f1_arrival, aeris_memory_1, obs_f1_lift, obs_f2_arrival, aeris_memory_2, vex_relay, gale_engine, obs_f2_lift, locker,
  obs_f3_arrival, pledge_anchor, pledge_listen, vex_falls, pledge_return, fifth_voice,
  scribe, scribe_after, cloud_library, isles_return, ep6_ending,
  beacon_start, testimony_liora, testimony_bennet, beacon_light, letters_start, letters_done,
};

export const scenes = Object.fromEntries(Object.entries(RAW).map(([id, fn]) => [id, cut(fn, SCENE_CONDITIONS[id])]));

// The main-path scenes in story order, for the box-budget and playthrough tests (side scenes are not on it; the chained
// aeris_turns, scribe_after and ep6_ending are counted inside the scene that chains them, and on their own).
export const MAIN_PATH = ['ep6_morning', 'ep6_board', 'airstair_foot', 'mira_asks', 'airstair_fight', 'first_gust', 'isles_view',
  'zephyr_arrival', 'liora_dock', 'meet_aeris', 'chart_room', 'anchor_lesson', 'east_gate', 'obs_f1_arrival', 'aeris_memory_1',
  'obs_f1_lift', 'obs_f2_arrival', 'aeris_memory_2', 'vex_relay', 'gale_engine', 'obs_f2_lift', 'obs_f3_arrival',
  'pledge_anchor', 'pledge_listen', 'vex_falls', 'pledge_return', 'fifth_voice', 'scribe', 'cloud_library', 'isles_return'];
/** Box budgets (EPISODE6.md section 1, E6-story brief item 5): 12 per main scene, except these. */
export const BOX_BUDGET = { default: 12, ep6_morning: 6, anchor_lesson: 14, vex_falls: 16, fifth_voice: 14, scribe_after: 18,
  cloud_library: 18, isles_return: 14 };
/** The close-up payoffs (plan 9.4): scene -> [kind, mode]. */
export const PAYOFFS = {
  ep6_morning: [['ep6_slip', 'burned']],
  chart_room: [['ep6_manifest', 'struck']],
  vex_falls: [['ep6_letter', undefined]],
  scribe_after: [['ep6_manifest', 'restored']],
  cloud_library: [['ep6_page', 'name'], ['ep6_page', 'seal'], ['ep6_page', 'torn']],
};

export function register() {
  return STORY.registerStory({ scenes, lines: {}, conditions: SCENE_CONDITIONS });
}

export default register;
