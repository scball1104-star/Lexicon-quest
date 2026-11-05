// Lexicon Quest NEXT, Episode 4: "The Sunken Keep". Every scene of docs/story/EPISODE4.md section 1 and the side scenes
// of docs/EPISODE4_PLAN.md section 2.5. Cutscene API only (DESIGN 5.4); staging in docs/story/STAGING_EP4.md. Writing
// rules as ep3.js: one idea per box, at most 3 lines of 42 characters, ASCII, no em dashes, {hero} = the player's name.
// The hero never speaks: choices, emotes, and what the others say.
//
// THE NAME. Until `lyra_named` nobody says the Regent's name: her tag is "The Regent" (regent_e in the Hall, regent_m
// in her memories, regent_t at the throne), and in regent_after the actor is swapped under the name flash (regent_t ->
// lyra_t), the Garrick pattern. qa/content/ep4_story.test.mjs scans every box before the reveal.
//
// THE SWITCH. `ep4_morning` also needs EP4_LIVE (GATE.live, read at call time; the pack's ?ep=4 developer entry may set
// it); every other scene needs a flag only an Episode 4 scene sets. Fine Print runs (tier_1) never start Episode 4.
// Registration: part of the lazy `ep4` pack. register() hands scenes and guards to registerStory (lines: text.js).

import { EP4_LIVE } from '../../game/episodes.js';
import * as STORY from '../../game/story.js';
import { REWARDS_EP4 } from './quests.js';
import { EPISODE5_CARD } from './text.js';

// Speakers with portraits (a missing one draws none). Every tag of the Regent speaks with Lyra's own portrait (`lyra`, ep4_portraits.json: noble_lady aged, E4-fixes-B).
const PORTRAIT = {
  hero: 'hero', mira: 'mira', bram: 'bram', vex: 'silver_rogue', paper_regent: 'paper_regent',
  regent_e: 'lyra', regent_m: 'lyra', regent_t: 'lyra', lyra_t: 'lyra', lyra_n: 'lyra',
  garrick_t: 'garrick',
};

const say = (s, who, text) => s.say(who, text, PORTRAIT[who] ? { portrait: PORTRAIT[who] } : {});
const narrate = (s, text) => s.say(null, text);
const all = (...promises) => Promise.all(promises);

export const GATE = { live: EP4_LIVE };
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

// ================================================================================================
// Act I: Emberpeak, the morning after
// ================================================================================================

// 1. pk_inn, on enter after the Episode 3 credits (the pack's ep4_wake trigger; also on enter of emberpeak for saves
// made outside). 12 boxes. Ada and Garrick are scene spawns. Gives running_decree. Sets ep4_morning_done, ep4_started.
async function ep4_morning(s) {
  const street = s.mapId === 'emberpeak';
  await s.spawn('ada_t', { sprite: 'npc_courier_v', name: 'Ada', at: street ? 'inn_door' : 'ada_hearth', dir: 'left' });
  await s.fade('in', 60);
  if (!street) await s.emote('hero', 'zzz');
  await s.camera.panTo(street ? 'inn_door' : 'ada_hearth', 40);
  await narrate(s, street
    ? 'Morning in Emberpeak. A soaked courier stands by the inn wall, holding a paper out to the warm air.'
    : 'Morning at the Coal Lantern. Bess has the stove roaring. The courier sits at the hearth with a paper on the rail.');
  await say(s, 'ada_t', "Three days on the road and it's still wet. Everything the palace sends is wet now. Except the orders.");
  await narrate(s, 'The print runs down the page in grey streaks. One line, in another ink, stays put: "The gates. Please."');
  await say(s, 'mira', "The printed part is running. This line isn't. Different ink. Different hand.");
  await say(s, 'bram', 'Who sent you?');
  await say(s, 'ada_t', "The Regent. The Regent of... I carry her letters every day, and I can't say her name. Nobody can.");
  await s.music('mystery');
  await say(s, 'mira', 'A month, you said?');
  await say(s, 'ada_t', 'About a month. Ada, by the way. The orders kept coming. Stamped. Dry.');
  const c = await s.choice(["We'll come.", "Who's ruling, then?"]);
  if (c === 0) await say(s, 'ada_t', "Thank you. You should know who's ruling, then. The seal is. That's what scares me.");
  else await say(s, 'ada_t', "The seal is. That's what scares me.");
  await s.give(REWARDS_EP4.decree.item, REWARDS_EP4.decree.qty);
  await s.music('first_bell');
  await s.spawn('garrick_t', { sprite: 'npc_smith', name: 'Garrick', at: street ? 'gather_garrick' : 'garrick_door', dir: 'up' });
  await s.camera.follow('hero');
  await say(s, 'garrick_t', "East road's washed out past the ridge. Rusk has rope.");
  await say(s, 'bram', 'Come home after?');
  await say(s, 'garrick_t', "That's my line.");
  await all(s.despawn('garrick_t'), s.despawn('ada_t'));
  await s.setFlag('ep4_morning_done');
  await s.setFlag('ep4_started');
}

// 2. emberpeak, step trigger east_road_trig two tiles west of the washout. Rusk is a scene spawn. Sets east_road_open
// (the rope ladder prop and the door to ep4_flood_road appear).
async function east_road_gate(s) {
  await s.spawn('rusk_t', { sprite: 'npc_rusk', name: 'Rusk', at: 'east_road', dir: 'left' });
  await s.camera.panTo('east_road', 30);
  await s.sfx('door_unlock');
  await narrate(s, 'Rusk has lashed a rope ladder to an iron stake at the lip of the washout. Below it, rain, and a road going down.');
  await say(s, 'rusk_t', "Frost cools hot metal. Water's a different problem. Mind your boots.");
  await s.camera.follow('hero');
  await s.despawn('rusk_t');
  await s.setFlag('east_road_open');
}

// ================================================================================================
// Act II: The Flood Road (ep4_flood_road)
// ================================================================================================

// 4. ep4_flood_road, on enter. Sets flood_road_arrived.
async function flood_road_arrival(s) {
  await narrate(s, 'The mountain road drops into a wide green valley gone to water. Drowned hedges. A farm roof. Rain.');
  await say(s, 'bram', "Didn't rain on the mountain in a month. Looks like it all came here.");
  await say(s, 'mira', "The river's not in its bed. Someone closed something.");
  await s.setFlag('flood_road_arrived');
}

// 5. ep4_flood_road, step column first_fight_trig. The teaching fight for Decrees: the Ink Bloom always opens with
// Stamp (the encounter's forced opener). No tutorial box. A loss sets nothing.
async function flood_first_fight(s) {
  await s.camera.panTo('e_e4r_first', 40);
  await all(s.emote('bram', '!'), s.emote('mira', '!'));
  await narrate(s, 'A puddle of runny ink slides across the road, a red wax seal floating in it. A grey hound shakes off the rain behind it.');
  await s.walk('e_e4r_first', 'hero', { speed: 'run' });
  await s.camera.follow('hero');
  await say(s, 'mira', 'That blot is stamping itself. Burn it before it reads that out.');
  const result = await s.battle('e4r_first', { canFlee: false });
  if (result !== 'win') return;
  await s.despawn('e_e4r_first');
  await say(s, 'mira', 'Paper and wax. Fire ends the argument.');
  await say(s, 'bram', 'So does hitting it. Louder.');
  await s.setFlag('flood_first_fight_done');
}

// 6. ep4_flood_road, step trigger lane_trig. The tide lock's first lesson: one line points at the wheel, the water does
// the rest (bark first_tide after the first turn). Sets saw_flood_lane.
async function flood_lane(s) {
  await s.camera.panTo('lane', 40);
  await narrate(s, 'The road runs into a lane under a hand of water. By a farm sluice: an iron wheel, a striped post, a moored punt.');
  await say(s, 'bram', "Farm lock. Turn the wheel, the water goes where it's told.");
  await s.camera.follow('hero');
  await s.setFlag('saw_flood_lane');
}

// 7. Campfire object ferry_fire (safe, rest): the field runs the rest flow afterwards. First visit: one choice of three.
// Later visits: one box. Hale and Nilo are the map's NPCs. Sets ferry_rested.
async function ferry_rest(s) {
  if (await s.hasFlag('ferry_rested')) {
    await say(s, 'hale', "Fire's still going. Sit. The river isn't going anywhere. That's the problem.");
    return;
  }
  await s.camera.panTo('fire', 30);
  await narrate(s, 'A tarp on poles, a fire under it, a ferry tied to a post. A big man in oilskin feeds the fire. A young one whittles.');
  await s.face('hale', 'hero');
  await say(s, 'hale', 'Captain Hale. That is Nilo. Sit down before the rain sits on you.');
  const c = await s.choice(['What happened here?', 'Who is the Regent?', 'Just rest.']);
  if (c === 0) {
    await say(s, 'hale', 'Twelve years ago the gates shut on the river quarter in a flood.');
    await say(s, 'hale', 'Twelve years later they shut again. Same seal both times.');
  } else if (c === 1) {
    await say(s, 'hale', "Good woman. I've known her thirty years. Ask me her name.");
    await narrate(s, 'He opens his mouth. Nothing comes. He shuts it and pokes the fire, hard.');
    await say(s, 'hale', "That's what happened.");
  } else {
    await narrate(s, 'Nilo whittles a new pin for a bell he no longer has. Nobody asks him about it.');
  }
  await s.camera.follow('hero');
  await s.setFlag('ferry_rested');
}

// 8. ep4_flood_road, step trigger on the bluff. Sets saw_valewyn (the ferry door appears at the landing).
async function vw_view(s) {
  await s.music('mystery');
  await s.camera.panTo('valewyn_far', 60);
  await narrate(s, 'Below the bluff lies Valewyn: canals, marble walks, a crowned statue with no face. Beyond it, the Keep.');
  await narrate(s, 'The Keep stands half under water. Its bell tower is drowned to the belfry.');
  await say(s, 'mira', 'There. Your bell under water, Bram.');
  await say(s, 'bram', "Not mine. It's ringing for somebody, though.");
  await s.emote('hero', '...');
  await s.wait(30);
  await s.camera.follow('hero');
  await s.music('millrace');
  await s.setFlag('saw_valewyn');
}

// ================================================================================================
// Act III: Valewyn
// ================================================================================================

// 9. ep4_valewyn, on first enter by the ferry. Vance is the map's NPC at the flood board. Sets vw_arrived.
async function vw_arrival(s) {
  await s.camera.panTo('board', 40);
  await narrate(s, 'Sandbags, rain, and a flood board of notices whose ink runs in streaks. One notice is crisp and dry, with a red seal.');
  await s.face('vance', 'hero');
  await say(s, 'vance', "New order from the palace. Gates stay shut. Seal's good.");
  await narrate(s, 'He looks at the seal a moment too long.');
  await say(s, 'vance', "Seal's always good.");
  await say(s, 'mira', 'Everything on this board is running except the orders.');
  await say(s, 'vance', "It's hard to enforce a law that changes in the rain.");
  await say(s, 'bram', 'Where do we find the Regent?');
  await say(s, 'vance', "The Hall, north, past the statue. She's in. She's always in.");
  await s.camera.follow('hero');
  await s.setFlag('vw_arrived');
}

// 10. ep4_valewyn, the statue object. First look: the inscription read aloud (sets saw_statue); later: one box.
async function vw_statue(s) {
  if (await s.hasFlag('saw_statue')) {
    await narrate(s, (await s.hasFlag('vw_restored'))
      ? 'The coronation statue. Still no face. Someone has left a wreath of reeds at its feet.'
      : 'The coronation statue: a crown, robes, and no face. The inscription is green with rain.');
    return;
  }
  await narrate(s, 'A crowned statue in robes, with no face carved yet. Words run round the plinth, green with rain.');
  await say(s, 'mira', '"A crown without a name is a shadow. The law is meant to shelter the people, not to drown them in ink."');
  await say(s, 'bram', 'Who carved that?');
  await say(s, 'mira', 'Someone who saw this coming.');
  await s.setFlag('saw_statue');
}

// 11. ep4_vw_palace, step trigger regent_trig two tiles in. The Regent is the map's NPC regent_e. The truth choice
// sets lyra_truth or lyra_kind (one line in crown_remembers, and her gift in regent_after). Sets met_regent.
async function regent_hall(s) {
  await s.camera.panTo('regent_spot', 30);
  await narrate(s, 'A long table under tall windows, deep in decrees. A woman in dull sapphire robes is trying to sign one.');
  await narrate(s, 'The pen writes. The ink slides off the page and pools on the table.');
  await s.face('regent_e', 'hero');
  await say(s, 'regent_e', 'I write OPEN. It runs. Something writes CLOSE in my hand, and that stays.');
  await say(s, 'regent_e', 'My seal went into the Keep with the old charter, twelve years ago. I thought it was safe there.');
  await say(s, 'regent_e', 'A month ago I started asking who sealed the first order. The next morning nobody could say my name.');
  await say(s, 'mira', 'The list takes the people who can undo it. It took a smith. Now a regent.');
  await say(s, 'regent_e', 'Twelve years ago I enforced that order. Did I do this?');
  const c = await s.choice(['Yes. You did.', 'The seal did.']);
  await s.music('sorrow');
  if (c === 0) {
    await s.setFlag('lyra_truth');
    await narrate(s, 'She is quiet for a long moment. Then she puts the pen down, carefully, as if it might spill.');
    await say(s, 'regent_e', 'Thank you. Nobody here will say it.');
  } else {
    await s.setFlag('lyra_kind');
    await say(s, 'regent_e', "...That is what I've been telling myself.");
  }
  await say(s, 'regent_e', "The Keep's locks answer to a crank only the lockwright keeps. Find Joss, at the canal works.");
  await s.music('valewyn');
  await s.camera.follow('hero');
  await s.setFlag('met_regent');
}

// 12. ep4_valewyn, Joss's talk entry once met_regent. Gives lock_crank. Sets met_joss.
async function joss_locks(s) {
  await s.face('joss', 'hero');
  await narrate(s, 'A big man with forearms like mooring posts sits by a lock wheel, a ring of keys at his belt. He has not turned it.');
  await say(s, 'joss', "The Regent sent you. The order said shut. I'm a lockwright, not a judge.");
  await say(s, 'joss', 'Every lock in the Keep has three marks. Low, middle, high. Water goes where the wheel says.');
  await say(s, 'joss', "I kept the crank. I didn't use it. I've been telling myself that's different.");
  await s.give(REWARDS_EP4.crank.item, REWARDS_EP4.crank.qty);
  await say(s, 'bram', "It's not. But you're handing it over. That's different.");
  await say(s, 'joss', "Hale will take you across, north landing. He's been waiting twelve years for somebody to ask.");
  await s.setFlag('met_joss');
}

// 13. ep4_valewyn, the ferry object keep_ferry_obj at the north landing (needs lock_crank). Hale is a scene spawn.
// Sets keep_ferry_open (the boat door to ep4_keep_f1 appears).
async function keep_ferry(s) {
  await s.spawn('hale_t', { sprite: 'npc_hale', name: 'Captain Hale', at: 'keep_landing', dir: 'up' });
  await s.face('hale_t', 'hero');
  await say(s, 'hale_t', "Joss gave you the crank? Then he's done telling himself things. Climb in.");
  await say(s, 'hale_t', "My mother's house is under us on the way. Don't look down. It's rude.");
  await s.sfx('water_rise');
  await s.setFlag('keep_ferry_open');
  await s.despawn('hale_t');
}

// ================================================================================================
// Act IV: The Sunken Keep
// ================================================================================================

// 14. ep4_keep_f1, on enter. Sets keep_entered and keep_f1_arrived.
async function keep_f1_arrival(s) {
  await s.camera.panTo('papered', 40);
  await narrate(s, 'Canals run inside the walls: lock wheels, striped posts, and a door on the canal floor with a paper nailed across it.');
  await narrate(s, 'CLOSED BY DECREE, the paper says. The seal is bright red, and bone dry.');
  await say(s, 'mira', 'Locks, posts, marks on every wall. Somebody built this to be read.');
  await say(s, 'bram', "Then let's read it.");
  await s.camera.follow('hero');
  await s.setFlag('keep_entered');
  await s.setFlag('keep_f1_arrived');
}

// 16. ep4_keep_f1, step trigger memory1_trig in the Audience Hall. The Flooded Audience (canon). A warm vignette, the
// young Regent and the boatmen as scene spawns. Sets lyra_memory_1.
async function lyra_memory_1(s) {
  await s.camera.panTo('audience', 40);
  await s.music('sorrow');
  await s.sfx('bell_drowned');
  await s.tint('dawn', 30);
  await s.spawn('regent_m', { sprite: 'npc_lyra', name: 'The Regent', at: 'audience_regent', dir: 'down' });
  await s.spawn('boatman_m', { sprite: 'npc_boatman', name: 'Boatman', at: 'audience_boatman', dir: 'up' });
  await s.spawn('guard_m', { sprite: 'npc_guard', name: 'Guard', at: 'audience_guard', dir: 'down' });
  await narrate(s, 'The water goes still. The hall fills with light and people: the same hall, twelve years ago, above the flood.');
  await say(s, 'boatman_m', "The river quarter's going under! Open the gate!");
  await say(s, 'regent_m', "The order is sealed. I can't overrule the seal.");
  await s.walk('guard_m', 'audience_boatman');
  await narrate(s, 'The guard turns the boatmen back. The young Regent holds the dry order to her chest and watches them go.');
  await say(s, 'regent_m', 'I believed the seal more than my neighbors.');
  await all(s.despawn('regent_m'), s.despawn('boatman_m'), s.despawn('guard_m'));
  await s.tint('none', 30);
  await s.music('sunken_keep');
  await s.camera.follow('hero');
  await say(s, 'bram', "She was following an order that didn't make sense.");
  await say(s, 'bram', 'I know what that sounds like from the inside. Count the ore. I counted the people. She counted the paper.');
  await s.setFlag('lyra_memory_1');
}

// Step trigger on the lift behind the Eastern Tidegate. Silent: the lift speaks for itself. Sets keep_f1_done.
async function keep_f1_lift(s) {
  await s.setFlag('keep_f1_done');
}

// 18. ep4_keep_f2, on enter. Sets keep_f2_arrived.
async function keep_f2_arrival(s) {
  await narrate(s, 'Stacks rise out of black water. Book crates are moored to the shelves like boats. The only light hangs on chains.');
  await say(s, 'mira', 'Books. Under water. I am going to be very calm about this.');
  await say(s, 'bram', "You're holding my arm.");
  await s.setFlag('keep_f2_arrived');
}

// 19. ep4_keep_f2, step trigger memory2_trig at the drowned scriptorium. The Altered Charter (canon). No reading game:
// the party sees the word and Mira says it. Sets lyra_memory_2.
async function lyra_memory_2(s) {
  await s.camera.panTo('scriptorium', 30);
  await s.music('sorrow');
  await s.sfx('bell_drowned');
  await s.tint('dawn', 30);
  await s.spawn('regent_m', { sprite: 'npc_lyra', name: 'The Regent', at: 'scriptorium_regent', dir: 'right' });
  await s.spawn('scribe_m', { sprite: 'npc_scholar', name: 'Scribe', at: 'scriptorium_scribe', dir: 'left' });
  await narrate(s, 'For a breath the scriptorium is dry again, and lit, and a scribe is laying two charters side by side.');
  await say(s, 'scribe_m', 'The king ordered the river gates opened.');
  await narrate(s, "The king's copy reads OPEN THE RIVER GATES IN FLOOD. The sealed copy reads CLOSE. One word, changed.");
  await say(s, 'regent_m', 'The sealed one says close. The seal is the law.');
  await all(s.despawn('regent_m'), s.despawn('scribe_m'));
  await s.tint('none', 30);
  await s.music('sunken_keep');
  await s.camera.follow('hero');
  await say(s, 'mira', 'One word. It only ever takes one word.');
  await say(s, 'bram', 'And twelve years of nobody reading it twice.');
  await s.setFlag('lyra_memory_2');
}

// 20. ep4_keep_f2, step trigger vex_trig at the glass dome. Vex is a scene spawn in the dry chair; he never fights.
// The feather is the map prop feather_dry. Sets vex_archive_met.
async function vex_archive(s) {
  await s.music(null);
  await s.camera.panTo('dry_room', 40);
  await narrate(s, 'Under an old glass dome the water stops, as if it had been told to. A dry room. A dry chair. Someone reading in it.');
  await s.spawn('vex', { sprite: 'npc_vex', name: 'Vex Quill', at: 'vex_chair', dir: 'down' });
  await s.music('mystery');
  await say(s, 'vex', "Four lists. One hand. Twenty-five years ago, then fifteen, then twelve. Then a month. It's getting faster.");
  await s.face('vex', 'bram');
  await say(s, 'vex', "Her name's at the top. I could tear it off, like your father's, Bram. It won't help. The seal is the problem here.");
  await say(s, 'mira', 'Then give us the list.');
  await say(s, 'vex', "Not this one. There's a name on it I'm not ready to hand anyone.");
  await say(s, 'mira', 'Yours?');
  await s.face('vex', 'hero');
  await narrate(s, 'Vex smiles, and does not answer.');
  await say(s, 'vex', "Read the charter, {hero}. You'll want to sign something. Do.");
  await s.flash('#d8f4ff', 10);
  await s.despawn('vex');
  await s.music('sunken_keep');
  await s.camera.follow('hero');
  await s.setFlag('vex_archive_met');
}

// 21. ep4_keep_f2, arena trigger barrister_trig. Mini-boss intro in the Episode 3 style; a retry plays only Mira's tip
// and the card. The encounter flag sets barrister_defeated.
async function barrister(s) {
  if (await s.hasFlag('barrister_defeated')) return;
  const retry = await s.hasFlag('barrister_tried');
  await s.music(null);
  await s.camera.panTo('barrister_spot', 40);
  await s.wait(retry ? 10 : 30);
  if (!retry) {
    await narrate(s, 'A drowned advocate rises out of the court room floor: black gown, white collar, sleeves stuffed with wet paper.');
    await narrate(s, 'It argued the seal for twelve years. Nobody argued back.');
  }
  await say(s, 'mira', 'Every stamp makes its case stronger. Burn the paper before it objects.');
  await s.setFlag('barrister_tried');
  await s.title('THE INKBOUND BARRISTER', { sub: 'Counsel for the Forgery', frames: 100 });
  await s.shake(3, 24);
  await s.flash('#ffffff', 8);
  await s.music('battle');
  const result = await s.battle('barrister', { boss: true, canFlee: false });
  if (result !== 'win') return;
  await s.camera.panTo('barrister_spot', 20);
  await narrate(s, 'The gown empties. Paper drifts down like wet snow, and a stair opens in the court room floor.');
  await say(s, 'bram', 'Case dismissed.');
  await say(s, 'mira', '...Did you practice that?');
  await say(s, 'bram', 'All the way down the stairs.');
  await s.camera.follow('hero');
  await s.music('sunken_keep');
  await s.setFlag('barrister_defeated');
}

// Step trigger on the stair under the court room. Silent. Sets keep_f2_done.
async function keep_f2_stair(s) {
  await s.setFlag('keep_f2_done');
}

// 22. ep4_keep_f2, object coffer_obj (lantern: true; present only while basin c is high). The Public Coffer. Opens the
// hidden door to the cache (the map's gold chest, present if coffer_found). Sets coffer_found.
async function coffer_records(s) {
  await s.sfx('lantern_reveal');
  await narrate(s, 'Mira lifts the Lantern over the drowned alcove. Under the water, marks glow on the wall: Keeper tide lines, in green.');
  await narrate(s, 'They have not run. They point along the wall to a seam in the stone.');
  await say(s, 'mira', "True ink doesn't mind the water. The Keepers knew.");
  await s.sfx('door_unlock');
  await narrate(s, 'Somewhere in the alcove, a hidden door lets go.');
  await s.setFlag('coffer_found');
}

// 23. ep4_keep_f3, on enter. Sets keep_f3_arrived.
async function keep_f3_arrival(s) {
  await narrate(s, 'White marble going green at every tide mark. A round court, three wings, three small domes, and one tall gate.');
  await s.camera.panTo('hub', 40);
  await say(s, 'mira', 'Three stones. Three principles. The Keepers and their sets of three.');
  await say(s, 'bram', 'Dad would say the same about anvils.');
  await s.camera.follow('hero');
  await s.setFlag('keep_f3_arrived');
}

// 24. The three principles. Each runs when the party strikes its wing's stone: the hero rings it, a deep note answers
// from the gate, and one line from the old king's memory (tagged "The King"). The third also says the gate has woken.
async function principleClose(s, flag) {
  await s.setFlag(flag);
  let n = 0;
  for (const f of ['principle_voice', 'principle_truth', 'principle_mercy']) if (f !== flag && (await s.hasFlag(f))) n++;
  if (n === 2) {
    await s.sfx('bell_drowned');
    await narrate(s, 'Three notes, answering as one. Across the court, the Petition Gate shudders in its frame. It has woken.');
  }
}
async function principle_voice(s) {
  await s.sfx('bell_drowned');
  await narrate(s, 'You ring the small bell under the dome. A deep note answers from the gate, and under it, a tired old voice.');
  await say(s, 'king_v', 'Listen to the ones at the gate first.');
  await principleClose(s, 'principle_voice');
}
async function principle_truth(s) {
  await s.sfx('bell_drowned');
  await narrate(s, 'The bell rings clear. The water round the stone shivers, and the gate answers it.');
  await say(s, 'king_v', 'Write it down. Then let them read it.');
  await principleClose(s, 'principle_truth');
}
async function principle_mercy(s) {
  await s.sfx('bell_drowned');
  await narrate(s, 'The last bell in the dark wing rings, and the note goes out over the black water like a lamp.');
  await say(s, 'king_v', 'If the law drowns someone, the law is wrong.');
  await say(s, 'mira', 'He wrote it down. Somebody changed it anyway.');
  await principleClose(s, 'principle_mercy');
}

// 25a. ep4_keep_f3, step trigger at gate_spot once all three stones have rung. The Oath Remembered (canon), then the
// Witness Book. Sets lyra_memory_3 and petition_gate_open; chains witness_book.
async function lyra_memory_3(s) {
  await s.music(null);
  await s.camera.panTo('gate_spot', 40);
  await s.sfx('bell_drowned');
  await s.shake(2, 30);
  await s.music('sorrow');
  await s.tint('dawn', 30);
  await s.spawn('regent_m', { sprite: 'npc_lyra', name: 'The Regent', at: 'memory3_regent', dir: 'up' });
  await narrate(s, 'The Petition Gate swings open. For a breath the room beyond is dry, and a young woman kneels by a royal seal.');
  await say(s, 'regent_m', 'I was appointed to guard the people, not the paper.');
  await s.wait(30);
  await say(s, 'regent_m', 'And I guarded the paper.');
  await s.despawn('regent_m');
  await s.tint('none', 30);
  await s.setFlag('lyra_memory_3');
  await s.setFlag('petition_gate_open');
  await witness_book(s);
}

// 25b. ep4_keep_f3, chained from lyra_memory_3, and the lectern object witness_lectern afterwards. The hero's beat:
// "Not yet." twice leaves the book open (nothing is lost; the lectern asks again). Teaches Answer through the skill's
// learn: { flag: 'hero_signed' }. Sets hero_signed.
async function witness_book(s) {
  await s.music(null);
  await s.camera.panTo('lectern', 40);
  await narrate(s, 'On a lectern of white stone lies a great book. Its pages are drowned vellum. Every name on them is crisp.');
  await say(s, 'mira', 'The Witness Book of Valewyn. A decree stands until a named witness signs against it.');
  await say(s, 'mira', "Her name's gone. She can't.");
  await say(s, 'bram', 'Then somebody else signs.');
  await s.face('mira', 'hero');
  await say(s, 'mira', 'Somebody whose name the lists keep coming for.');
  let c = await s.choice(['Sign.', 'Not yet.']);
  if (c === 1) {
    await say(s, 'bram', "Take your time. The water won't.");
    c = await s.choice(['Sign.', 'Not yet.']);
    if (c === 1) {
      await narrate(s, 'The pen waits in its well. The book stays open.');
      await s.music('mystery');
      await s.camera.follow('hero');
      return;
    }
  }
  await s.walk('hero', 'lectern');
  await narrate(s, 'You take the pen and write your name. On three fragments it was faint. Here the ink goes on dark, and stays.');
  await s.sfx('name_restore');
  await s.flash('#ffffff', 12);
  await s.music('triumph');
  await say(s, 'mira', 'It held. Down here. Yours held.');
  await say(s, 'bram', 'Now they know where you are.');
  await say(s, 'mira', "They always did. Now it's on the record.");
  await s.sfx('level_up_sparkle');
  await s.setFlag('hero_signed');
  await narrate(s, '{c:gold}{hero} learned Answer.{/c}');
  await s.music('mystery');
  await s.camera.follow('hero');
}

// ================================================================================================
// Act V: The Paper Regent (ep4_keep_crown)
// ================================================================================================

// 26. ep4_keep_crown, step trigger row regent_trig. Boss intro; the Paper Regent is the map actor paper_regent. After a
// loss it only stirs, Mira repeats her tip, and the card shows. A win chains regent_after.
async function paper_regent(s) {
  if (await s.hasFlag('paper_regent_defeated')) return;
  await s.music(null);
  await s.camera.panTo('throne', 40);
  if (await s.hasFlag('paper_regent_tried')) {
    await s.shake(2, 30);
    await say(s, 'mira', 'When it stamps, burn it. When it unrolls your name, answer it. You. Not us.');
    await regent_fight(s);
    return;
  }
  await s.wait(40);
  await narrate(s, 'On the drowned throne sits a tall figure folded out of decrees, in turquoise robes, a gold crown, a trident.');
  await narrate(s, 'Everyone obeyed the seal. Nobody read it.');
  await say(s, 'paper_regent', 'THE SEAL IS THE LAW. THE LAW IS DRY.');
  await s.shake(2, 30);
  await say(s, 'paper_regent', 'A NEW NAME IN THE WITNESS BOOK. IT WILL BE STRUCK FROM THE ROLL.');
  const c = await s.choice(['Read it the charter.', 'Give the seal back.']);
  if (c === 0) await say(s, 'paper_regent', 'THE CHARTER IS SEALED. WHAT IS SEALED IS READ.');
  else await say(s, 'paper_regent', 'THE SEAL KEEPS ITSELF. THAT IS WHAT A SEAL IS FOR.');
  await say(s, 'bram', "It's wearing her crown.");
  await say(s, 'mira', 'When it stamps, burn it. When it unrolls your name, answer it. You. Not us.');
  await regent_fight(s);
}
async function regent_fight(s) {
  await s.setFlag('paper_regent_tried');
  await s.title('THE PAPER REGENT', { sub: 'Keeper of the Seal', frames: 100 });
  await s.shake(4, 30);
  await s.flash('#ffffff', 10);
  await s.music('boss_regent');
  const result = await s.battle('paper_regent', { boss: true, canFlee: false });
  if (result !== 'win') return;
  await regent_after(s);
}

// 27. ep4_keep_crown, after the win (also runnable on its own, from an enter trigger after a reload). The order is the
// bible's: the Regent unfolds, the charter, the three come running, the signature and the name (regent_t becomes
// lyra_t under the flash), the line under the seal, the feather and the V., the gift. 23 boxes (budget 24).
// Gives name_fragment_4 and Lyra's gift. Sets paper_regent_defeated, charter_restored, lyra_named, fragment4_get.
async function regent_after(s) {
  await s.setFlag('paper_regent_defeated');
  await s.camera.panTo('throne', 20);
  await s.shake(3, 40);
  await s.sfx('boss_die');
  await s.flash('#ffffff', 16);
  await s.music('sorrow');
  await narrate(s, 'The Paper Regent unfolds, page by page, until it is a heap of wet decrees around an empty chair.');
  await say(s, 'paper_regent', 'I KEPT EVERY WORD. I NEVER READ ONE.');
  await narrate(s, 'The crown rolls off the heap and rings on the dais. Inside it, folded small and bone dry, is a roll of vellum.');
  await s.camera.panTo('charter_spot', 30);
  await s.walk('hero', 'charter_spot');
  await s.closeup('charter');
  await narrate(s, "You unfold it. Keeper ink, every name of Valewyn in rows. At the top, the king's relief charter.");
  await s.closeup('charter', { run: true });
  await narrate(s, 'One word has been scraped and written over. The water laps the vellum. CLOSE runs, and is gone. OPEN holds.');
  await s.sfx('name_restore');
  await s.closeup(null);
  await s.flash('#e8fff4', 12);
  await s.setFlag('charter_restored');
  await s.spawn('regent_t', { sprite: 'npc_lyra', name: 'The Regent', at: 'lyra_enter', dir: 'up' });
  await s.spawn('hale_t', { sprite: 'npc_hale', name: 'Captain Hale', at: 'lyra_enter', dir: 'up' });
  await s.spawn('joss_t', { sprite: 'npc_joss', name: 'Joss', at: 'lyra_enter', dir: 'up' });
  await all(s.walk('regent_t', 'party_stop', { speed: 'run' }), s.walk('hale_t', 'party_stop'), s.walk('joss_t', 'party_stop'));
  await say(s, 'hale_t', "Water dropped a full mark. We followed it down. Couldn't not.");
  await narrate(s, 'The Regent sees the charter in your hands. Her eyes go to the seal on the arm of the throne. She reaches for it.');
  await narrate(s, 'You hold out the Witness Book page instead. She looks at your name on it for a long time.');
  await s.walk('regent_t', 'lyra_sign');
  await s.closeup('witness', { stage: 'sign' });
  await narrate(s, 'Then she takes the pen and signs under you. Her ink goes on dark, and holds.');
  await s.sfx('name_restore');
  await s.closeup(null);
  await s.flash('#ffffff', 20);
  await s.music('triumph');
  await s.setFlag('lyra_named');
  await say(s, 'mira', 'Lyra.');
  // Under the flash the Regent becomes Lyra: same tile, same sprite, her name on the speaker tag.
  await s.flash('#fff2b0', 16);
  await s.despawn('regent_t');
  await s.spawn('lyra_t', { sprite: 'npc_lyra', name: 'Lyra', at: 'lyra_sign', dir: 'down' });
  await say(s, 'lyra_t', '...Lyra.');
  await say(s, 'lyra_t', 'Lyra. Regent of Valewyn. I closed the gates.');
  await s.emote('hale_t', 'heart');
  await s.music('mystery');
  await s.camera.panTo('charter_spot', 30);
  await say(s, 'mira', "{hero}. Fourth fragment, fourth time. And the line under the seal. It reads.");
  await s.wait(30);
  await s.closeup('keep');
  await say(s, 'mira', '"Keep this one."');
  await say(s, 'bram', 'Keep who?');
  await say(s, 'mira', 'You, I think. Somebody wrote you down and asked the Book to keep you.');
  await say(s, 'mira', "Not the list's hand. That one's cold. This one was in a hurry.");
  await s.closeup(null);
  await s.give(REWARDS_EP4.fragment.item, REWARDS_EP4.fragment.qty);
  await s.setFlag('fragment4_get');
  await s.camera.panTo('table', 30);
  await s.closeup('witness', { stage: 'v' });
  await narrate(s, 'On the side table a black feather lies on the Witness Book page, dry. Under the two signatures, a third mark: V.');
  await say(s, 'bram', 'He signed it.');
  await say(s, 'mira', "He witnessed it. That's new.");
  await s.closeup(null);
  await s.music('valewyn');
  await s.camera.follow('hero');
  await s.face('lyra_t', 'hero');
  await say(s, 'lyra_t', "Take it. I've held the wrong thing long enough.");
  const gift = (await s.hasFlag('lyra_truth')) ? REWARDS_EP4.gift_truth : REWARDS_EP4.gift_kind;
  await s.give(gift.item, gift.qty);
  await say(s, 'joss_t', "Boat's at the steps. Let's go open some gates.");
  await all(s.despawn('lyra_t'), s.despawn('hale_t'), s.despawn('joss_t'));
}

// ================================================================================================
// Act VI: The Crown Remembers (ep4_valewyn)
// ================================================================================================

// 28. ep4_valewyn, on enter by the boat boat_crown_out after regent_after. Joss turns the great lock; the hero rings the
// Keep's drowned bell from the ferry; the plaza fills. 14 boxes at most. Sets tide_bell_rung, vw_restored; chains
// ep4_ending. lyra_truth or lyra_kind picks one line; the council choice picks one line.
async function crown_remembers(s) {
  await s.music(null);
  await s.spawn('lyra_t', { sprite: 'npc_lyra', name: 'Lyra', at: 'gather_lyra', dir: 'down' });
  await s.spawn('joss_t', { sprite: 'npc_joss', name: 'Joss', at: 'gather_joss', dir: 'up' });
  await s.spawn('hale_t', { sprite: 'npc_hale', name: 'Captain Hale', at: 'gather_hale', dir: 'up' });
  await s.spawn('vw_crowd_a', { sprite: 'npc_old_woman', name: 'Old Woman', at: 'crowd_a', dir: 'up' });
  await s.spawn('vw_crowd_b', { sprite: 'npc_farmer', name: 'Boatman', at: 'crowd_b', dir: 'up' });
  await s.spawn('vw_crowd_c', { sprite: 'npc_child_a', name: 'Child', at: 'crowd_c', dir: 'up' });
  await s.spawn('vw_crowd_d', { sprite: 'npc_child_b', name: 'Child', at: 'crowd_d', dir: 'up' });
  await s.camera.panTo('canal_works', 40);
  await s.walk('joss_t', 'canal_works');
  await narrate(s, 'Joss sets the crank on the great lock and leans on it. It turns a little. Then a lot. The pointer swings to OPEN.');
  await s.sfx('tide_wheel');
  await s.sfx('water_drain');
  await s.shake(1, 30);
  await narrate(s, 'The water draws back off the river quarter, street by street. Roofs, then doors, then cobbles.');
  await s.camera.panTo('keep_landing', 40);
  await s.walk('hero', 'keep_landing');
  await narrate(s, "From the ferry you reach up for the rope of the Keep's drowned bell, and pull.");
  await s.sfx('bell_drowned');
  await s.wait(30);
  await s.sfx('bell_drowned');
  await s.wait(30);
  await s.sfx('bell_drowned');
  await s.music('valewyn');
  await s.tint('none', 120);
  await narrate(s, 'The note rolls out over the canals, and every door in Valewyn opens. On the flood board, the notices dry.');
  await s.camera.panTo('statue', 40);
  await say(s, 'lyra_t', 'I am Lyra, Regent of Valewyn. Twelve years ago I closed the river gates. They are open. They stay open.');
  if (await s.hasFlag('lyra_truth')) await say(s, 'lyra_t', 'Somebody told me plainly what I did. It made this easier to say.');
  else await say(s, 'lyra_t', "I've been telling myself the seal did it. I'm done telling myself that.");
  await say(s, 'hale_t', 'Lyra! Ferry captain Hale says: Lyra.');
  await say(s, 'lyra_t', 'You can stop shouting.');
  await say(s, 'hale_t', "Thirty years. I'll shout.");
  if (await s.hasFlag('council_shelter')) await say(s, 'lyra_t', 'The river quarter was sheltered first. The records are next. That is on the record.');
  else if (await s.hasFlag('council_records')) await say(s, 'lyra_t', 'The records were kept first. The river quarter is next. That is on the record.');
  await say(s, 'bram', 'Dad would like this town. Nobody here wastes water.');
  await say(s, 'mira', 'Bram.');
  await s.setFlag('tide_bell_rung');
  await s.setFlag('vw_restored');
  await ep4_ending(s);
}

// 29. ep4_valewyn at night, straight after. Ada runs in with a letter dry with sand, addressed in stars; she says the
// hero's name out loud, easily. The Keep's bell hums; something answers. End cards. Sets ep4_complete; the hooks then
// roll CREDITS_EP4 (counter credits4_rolled), show END_CARD_EP4 and wake the party at ep4_vw_inn inn_bed.
async function ep4_ending(s) {
  await s.fade('out', 60);
  for (const id of ['hale_t', 'vw_crowd_a', 'vw_crowd_b', 'vw_crowd_c', 'vw_crowd_d', 'lyra_t', 'joss_t']) await s.despawn(id);
  await s.tint('night', 0);
  await s.music(null);
  await s.camera.panTo('night_view', 0);
  await s.spawn('lyra_t', { sprite: 'npc_lyra', name: 'Lyra', at: 'canal_works', dir: 'left' });
  await s.spawn('joss_t', { sprite: 'npc_joss', name: 'Joss', at: 'gather_joss', dir: 'up' });
  await s.spawn('ada_t', { sprite: 'npc_courier_v', name: 'Ada', at: 'ferry_in', dir: 'up' });
  await s.fade('in', 90);
  await narrate(s, 'That night the lamps along the canals burn the right way round: on the water, not under it.');
  await narrate(s, 'Lyra and Joss stand at the great lock. You, Mira and Bram sit on the statue steps.');
  await s.camera.follow('hero');
  await s.walk('ada_t', 'statue', { speed: 'run' });
  await narrate(s, 'A courier comes running up from the landing, dry for once, with a letter gritty with sand.');
  await say(s, 'ada_t', "Came on a ship from the south. It's addressed to all three of you. By name.");
  await say(s, 'mira', 'By name?');
  await say(s, 'ada_t', "Including yours, {hero}. There. That wasn't hard at all.");
  await say(s, 'mira', 'Sand. And the ink is stars.');
  await say(s, 'bram', 'South, then.');
  await say(s, 'lyra_t', 'Come back through Valewyn. The gates are open.');
  await s.sfx('bell_drowned');
  await narrate(s, "Out on the water, the Keep's bell hums once, by itself. Far off, something answers that is not a bell.");
  await s.music('mystery');
  await say(s, 'mira', "That's not a bell. That's a voice.");
  await s.fade('out', 120);
  for (const id of ['ada_t', 'lyra_t', 'joss_t']) await s.despawn(id);
  await s.title('End of Episode 4', { sub: 'The Sunken Keep', frames: 240 });
  await s.title(EPISODE5_CARD.text, { sub: EPISODE5_CARD.sub, frames: 240 });
  await s.setFlag('ep4_complete');
}

// ------------------------------------------------------------------------------------------------
// Side stories (EPISODE4.md section 2)
// ------------------------------------------------------------------------------------------------

// Three Witnesses. Dorian's talk entry once met_joss; then each witness's talk entry; then the plaza switches.
async function witnesses_start(s) {
  await s.face('dorian', 'hero');
  await say(s, 'dorian', 'You have seen the Regent. Then hear me. I was the king\'s scribe, and I know his hand.');
  await say(s, 'dorian', 'There is lock power for one district first. The council switches in the plaza will choose which.');
  await say(s, 'dorian', 'Before anyone throws one, hear three witnesses. Hale, at the landing. Joss. And me, first.');
  await say(s, 'mira', 'Three witnesses, then the switch. We know how this goes.');
  await s.setFlag('witnesses_started');
  await testimony_dorian(s);
}
async function testimony_dorian(s) {
  await say(s, 'dorian', 'The last true king signed a relief charter for the river quarter.');
  await say(s, 'dorian', 'It was copied, altered, and hidden below the Keep. The sealed copy is not his hand. I would know.');
  await s.setFlag('testimony_dorian');
}
async function testimony_hale(s) {
  await s.face('hale', 'hero');
  await say(s, 'hale', 'Witness, is it? Good. I have been waiting twelve years to be asked.');
  await say(s, 'hale', 'The tide gates were closed while families waited on the banks. I poled them back and forth all night.');
  await say(s, 'hale', "The decree bears the seal, not her hand. I'd swear to that on my mother's roof.");
  await s.setFlag('testimony_hale');
}
async function testimony_joss(s) {
  await s.face('joss', 'hero');
  await say(s, 'joss', 'There is power for one district first. One. The great lock cannot lift both at once.');
  await say(s, 'joss', 'Shelter for the river quarter, or the records hall dry. Choose like you mean to answer for it.');
  await s.setFlag('testimony_joss');
}

// The council switches switch_shelter and switch_records (objects, present from witnesses_started; both run this one
// scene, which asks). Exactly one before ep4_complete; the other district opens after it (canon).
async function council_choice(s) {
  const shelter = await s.hasFlag('council_shelter');
  const records = await s.hasFlag('council_records');
  if (shelter && records) {
    await narrate(s, 'Both council switches are thrown. Under the plaza the canals run the way they were built to.');
    return;
  }
  if (shelter || records) {
    if (!(await s.hasFlag('ep4_complete'))) {
      await narrate(s, 'The other switch is chained down. One district first. The second waits for the great lock to open.');
      return;
    }
    await narrate(s, 'The chain is off the second switch. Joss has oiled it. It goes over with one hand.');
    await s.sfx('switch_on');
    if (!shelter) {
      await s.give(REWARDS_EP4.shelter.item, REWARDS_EP4.shelter.qty);
      await s.setFlag('council_shelter');
      await say(s, 'mira', 'The river quarter, sheltered. Both districts. It only took a lock, a book and a bell.');
    } else {
      await s.give(REWARDS_EP4.records.item, REWARDS_EP4.records.qty);
      await s.setFlag('council_records');
      await say(s, 'mira', 'The records hall, dry. Dorian will want to show us every shelf. Every one.');
    }
    return;
  }
  const heard = (await s.hasFlag('testimony_hale')) && (await s.hasFlag('testimony_dorian')) && (await s.hasFlag('testimony_joss'));
  if (!heard) {
    await narrate(s, 'Two iron switches by the plaza canal, painted SHELTER and RECORDS. Both rusted down.');
    await say(s, 'mira', 'Dorian wanted three witnesses first. Hale, Joss and Dorian. Then we choose.');
    return;
  }
  await narrate(s, 'Two council switches: SHELTER THE RIVER QUARTER, and PROTECT THE PUBLIC RECORDS. Power for one, first.');
  const c = await s.choice(['Shelter the River Quarter', 'Protect the Public Records', 'Not yet.']);
  if (c === 2) return;
  await s.sfx('switch_on');
  if (c === 0) {
    await narrate(s, 'Under the plaza a sluice opens. Somewhere in the river quarter a dry room lights up, and people go into it.');
    await s.give(REWARDS_EP4.shelter.item, REWARDS_EP4.shelter.qty);
    await s.setFlag('council_shelter');
    await say(s, 'bram', 'People first. Dad would have thrown it before Dorian finished talking.');
  } else {
    await narrate(s, 'Under the plaza a sluice opens. Across the square the records hall drains, and lamps come on along its shelves.');
    await s.give(REWARDS_EP4.records.item, REWARDS_EP4.records.qty);
    await s.setFlag('council_records');
    await say(s, 'mira', 'Every name in that hall stays dry. It will matter at the throne. I can feel it.');
  }
  await s.give(REWARDS_EP4.witnesses.item, REWARDS_EP4.witnesses.qty);
  await s.setFlag('witnesses_done');
}

// Nilo's Bell. Nilo's talk entry from ferry_rested: start, a reminder, and the return. The bell is a chest on F1's
// pontoon channel floor (flag nilo_bell_found, present only once nilo_started).
async function nilo_bell(s) {
  const started = await s.hasFlag('nilo_started');
  const found = await s.hasFlag('nilo_bell_found');
  if (!started) {
    await say(s, 'nilo', 'My boat bell went down with my landing when the gates shut. The Keep has it now. The Keep has everything.');
    await say(s, 'nilo', 'If you see a little brass bell on a canal floor, at low water, I would like it back.');
    await say(s, 'bram', "We'll look down. Hale says it's rude, but we'll look.");
    await s.setFlag('nilo_started');
    return;
  }
  if (!found) {
    await say(s, 'nilo', 'Low water, on a canal floor. It will be green by now. Like me, Hale says.');
    return;
  }
  await narrate(s, 'You hand Nilo the bell. He wipes the green off with his thumb and rings it once, over the water.');
  await s.take('nilo_bell');
  await say(s, 'nilo', "Now the boats know I'm here.");
  await s.give(REWARDS_EP4.nilo.item, REWARDS_EP4.nilo.qty);
  await s.setFlag('nilo_done');
}

// ------------------------------------------------------------------------------------------------
// Scene registry. Every flag is declared in flags.js. `ep4_morning` needs the switch (live) and not Fine Print; every
// other chain bottoms out at ep4_started, which only ep4_morning sets.
// ------------------------------------------------------------------------------------------------
const PRINCIPLES = ['principle_voice', 'principle_truth', 'principle_mercy'];
export const SCENE_CONDITIONS = {
  ep4_morning: { if: 'ep3_complete', ifNot: ['ep4_morning_done', 'tier_1'], live: true },
  east_road_gate: { if: 'ep4_started', ifNot: 'east_road_open' },
  flood_road_arrival: { if: 'east_road_open', ifNot: 'flood_road_arrived' },
  flood_first_fight: { if: 'flood_road_arrived', ifNot: 'flood_first_fight_done' },
  flood_lane: { if: 'flood_road_arrived', ifNot: 'saw_flood_lane' },
  ferry_rest: { if: 'flood_road_arrived' },
  vw_view: { if: 'flood_road_arrived', ifNot: 'saw_valewyn' },
  vw_arrival: { if: 'saw_valewyn', ifNot: 'vw_arrived' },
  vw_statue: { if: 'vw_arrived' },
  regent_hall: { if: 'vw_arrived', ifNot: 'met_regent' },
  joss_locks: { if: 'met_regent', ifNot: 'met_joss' },
  keep_ferry: { if: 'met_joss', ifNot: 'keep_ferry_open' },
  keep_f1_arrival: { if: 'keep_ferry_open', ifNot: 'keep_f1_arrived' },
  lyra_memory_1: { if: 'keep_f1_arrived', ifNot: 'lyra_memory_1' },
  keep_f1_lift: { if: 'keep_f1_arrived', ifNot: 'keep_f1_done' },
  keep_f2_arrival: { if: 'keep_f1_done', ifNot: 'keep_f2_arrived' },
  lyra_memory_2: { if: 'keep_f2_arrived', ifNot: 'lyra_memory_2' },
  vex_archive: { if: 'keep_f2_arrived', ifNot: 'vex_archive_met' },
  barrister: { if: 'keep_f2_arrived', ifNot: 'barrister_defeated' },
  keep_f2_stair: { if: 'barrister_defeated', ifNot: 'keep_f2_done' },
  coffer_records: { if: 'keep_f2_arrived', ifNot: 'coffer_found' },
  keep_f3_arrival: { if: 'keep_f2_done', ifNot: 'keep_f3_arrived' },
  principle_voice: { if: 'keep_f3_arrived', ifNot: 'principle_voice' },
  principle_truth: { if: 'keep_f3_arrived', ifNot: 'principle_truth' },
  principle_mercy: { if: 'keep_f3_arrived', ifNot: 'principle_mercy' },
  lyra_memory_3: { if: PRINCIPLES, ifNot: 'lyra_memory_3' },
  witness_book: { if: 'lyra_memory_3', ifNot: 'hero_signed' },
  paper_regent: { if: 'hero_signed', ifNot: 'paper_regent_defeated' },
  regent_after: { if: 'paper_regent_defeated', ifNot: 'lyra_named' },
  crown_remembers: { if: 'charter_restored', ifNot: 'vw_restored' },
  ep4_ending: { if: 'vw_restored', ifNot: 'ep4_complete' },
  witnesses_start: { if: 'met_joss', ifNot: 'witnesses_started' },
  testimony_hale: { if: 'witnesses_started', ifNot: 'testimony_hale' },
  testimony_dorian: { if: 'witnesses_started', ifNot: 'testimony_dorian' },
  testimony_joss: { if: 'witnesses_started', ifNot: 'testimony_joss' },
  council_choice: { if: 'witnesses_started' },
  nilo_bell: { if: 'ferry_rested', ifNot: 'nilo_done' },
};

const RAW = {
  ep4_morning, east_road_gate, flood_road_arrival, flood_first_fight, flood_lane, ferry_rest, vw_view,
  vw_arrival, vw_statue, regent_hall, joss_locks, keep_ferry,
  keep_f1_arrival, lyra_memory_1, keep_f1_lift, keep_f2_arrival, lyra_memory_2, vex_archive, barrister, keep_f2_stair,
  coffer_records, keep_f3_arrival, principle_voice, principle_truth, principle_mercy, lyra_memory_3, witness_book,
  paper_regent, regent_after, crown_remembers, ep4_ending,
  witnesses_start, testimony_hale, testimony_dorian, testimony_joss, council_choice, nilo_bell,
};

export const scenes = Object.fromEntries(Object.entries(RAW).map(([id, fn]) => [id, cut(fn, SCENE_CONDITIONS[id])]));

// The main-path scenes in story order, for the box-budget and playthrough tests (side scenes are not on it; the chained
// regent_after, ep4_ending and witness_book are counted inside the scene that chains them, and on their own).
export const MAIN_PATH = ['ep4_morning', 'east_road_gate', 'flood_road_arrival', 'flood_first_fight', 'flood_lane', 'ferry_rest',
  'vw_view', 'vw_arrival', 'vw_statue', 'regent_hall', 'joss_locks', 'keep_ferry', 'keep_f1_arrival', 'lyra_memory_1',
  'keep_f1_lift', 'keep_f2_arrival', 'lyra_memory_2', 'vex_archive', 'barrister', 'keep_f2_stair', 'keep_f3_arrival',
  'principle_voice', 'principle_truth', 'principle_mercy', 'lyra_memory_3', 'paper_regent', 'crown_remembers'];
/** Box budgets (EPISODE4.md section 1): 12 per main scene, except these. */
export const BOX_BUDGET = { default: 12, ep4_morning: 13, regent_after: 24, crown_remembers: 14 };

export function register() {
  return STORY.registerStory({ scenes, lines: {}, conditions: SCENE_CONDITIONS });
}

export default register;
