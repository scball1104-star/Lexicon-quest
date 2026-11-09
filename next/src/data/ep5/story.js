// Lexicon Quest NEXT, Episode 5: "The Last Prophecy". Every scene of docs/story/EPISODE5.md section 1 and the side scenes
// of docs/EPISODE5_PLAN.md section 2.5. Cutscene API only (DESIGN 5.4); staging in docs/story/STAGING_EP5.md. Writing
// rules as ep4: one idea per box, at most 3 lines of 42 characters, ASCII, no em dashes, {hero} = the player's name. The
// hero never speaks: choices, emotes, and what the others say.
//
// STAGING (CRITIQUE_6 item 11). Before the first line of a scene with a speaker, stage(s, spot) walks the hero to `spot`
// (two tiles below the speaker), Mira to `spot_m` (one tile left of it) and Bram to `spot_b` (one tile right): nobody on
// one column, nobody on top of a seated speaker. The marks are listed in STAGING_EP5.md for the map agents.
//
// SHOWING (CRITIQUE_6 item 3). The four payoffs open a close-up page through page(s, kind, mode): `ep5_letter` (blank),
// `ep5_chart` (prophecy, restored, road) and `ep5_page`, only when PAGE_KINDS has the kind (E5-tiles, wave 5b). The lines
// said over a page work without it too, so until the pages land the scene reads as narration over the field.
//
// THE NAMES. Sel's mother is "The First Student" (speaker student_m, the memory spawn) until sel_memory_3, then "Ishra"
// (ishra_m). Yara's father is "A Traveler" (tamir_m in memory, tamir_t in every_road) until Yara knows him, then "Tamir"
// (tamir_n, and the NPC record tamir). qa/content/ep5_story.test.mjs scans every box before the reveals.
//
// THE SWITCH. `ep5_morning` also needs EP5_LIVE (GATE.live, read at call time; the pack's ?ep=5 developer entry may set
// it); every other scene needs a flag only an Episode 5 scene sets. Fine Print runs (tier_1) never start Episode 5.
// Registration: part of the lazy `ep5` pack. register() hands scenes and guards to registerStory (lines: text.js).

import { EP5_LIVE } from '../../game/episodes.js';
import * as STORY from '../../game/story.js';
import { PAGE_KINDS } from '../../world/closeup.js';
import * as PAGES from './pages.js';
import { REWARDS_EP5 } from './quests.js';
import { EPISODE6_CARD, END_TITLE_EP5 } from './text.js';

// Speakers with portraits (a missing one draws none). Sel, Yara and the Haven have none (plan 9.5); the Oracle has its crop.
const PORTRAIT = { hero: 'hero', mira: 'mira', bram: 'bram', vex: 'silver_rogue', vex_k: 'silver_rogue', oracle: 'oracle', oracle_v: 'oracle' };

const say = (s, who, text) => s.say(who, text, PORTRAIT[who] ? { portrait: PORTRAIT[who] } : {});
const narrate = (s, text) => s.say(null, text);
const all = (...promises) => Promise.all(promises);

/** The party to its marks: the hero on `spot`, Mira on `spot_m`, Bram on `spot_b` (STAGING_EP5.md section 2). */
async function stage(s, spot) {
  await s.walk('hero', spot);
  await all(s.walk('mira', `${spot}_m`), s.walk('bram', `${spot}_b`));
}
/** Open a close-up page when its kind is registered (E5-tiles); true when it opened. */
async function page(s, kind, mode) {
  if (!PAGE_KINDS[kind]) return false;
  await s.closeup(kind, mode ? { mode } : {});
  return true;
}
async function unpage(s, open) { if (open) await s.closeup(null); }
/** The restored chart in three beats (CRITIQUE_7 item 7): pages.js's restored_1..3 when it has them, else `restored` once. */
const CHART_BEATS = PAGES.RESTORED_STAGES && PAGES.RESTORED_STAGES.length === 3 ? PAGES.RESTORED_STAGES : null;
async function chartBeat(s, i, open) {
  if (CHART_BEATS) return (await page(s, 'ep5_chart', CHART_BEATS[i])) || open;
  return i === 0 ? page(s, 'ep5_chart', 'restored') : open;
}

const spawnSel = (s, at, dir = 'down') => s.spawn('sel_t', { sprite: 'npc_sel', name: 'Sel', at, dir });
const spawnYara = (s, at, dir = 'down') => s.spawn('yara_t', { sprite: 'npc_yara', name: 'Yara', at, dir });

export const GATE = { live: EP5_LIVE };
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

/** Mira's two boss tips (plan 6.6: each names a lever the boss's data has). */
export const TIPS = {
  mirage_knight: 'It turns its shield to the sky. Turn the sky on it.',
  oracle: 'When it reads a star, I turn the sky before it does. Keep me standing.',
};

// ================================================================================================
// Act I: Valewyn, the letter that lost a name
// ================================================================================================

// 1. ep4_vw_inn, on enter after the Episode 4 credits (the pack patch's ep5_wake trigger checks credits4_rolled). Six
// boxes, the letter's close-up by about 0:20, control by about 0:35. Yara is a scene spawn at the long table. Gives
// star_letter. Sets ep5_morning_done, ep5_started.
// A save made in the street comes in by the front door: the scene then plays in the taproom on its own marks (the stair up is
// a door, so the guest-room marks have no path). s.leaderAt is the pack's (field/events.js attach); without it, the guest room.
async function ep5_morning(s) {
  const at = 'leaderAt' in s ? s.leaderAt() : null;
  const m = at && at[0] < 13 ? (k) => `${k}_tap` : (k) => k;
  await spawnYara(s, m('yara_table'), 'down');
  await s.fade('in', 40);
  await s.walk('hero', m('inn_stage'));
  await all(s.walk('mira', m('mira_window')), s.walk('bram', m('inn_stage_b')));
  await s.camera.panTo(m('mira_window'), 20);
  const open = await page(s, 'ep5_letter', 'blank');
  await say(s, 'mira', 'Star ink. It only reads in the dark.');
  await say(s, 'mira', 'Last night it had three names. This morning, two.');
  await unpage(s, open);
  await s.music(null);
  await say(s, 'bram', 'Whose is gone?');
  await s.face('mira', 'hero');
  await s.wait(20);
  await s.emote('hero', '...');
  await s.wait(30);
  await s.give(REWARDS_EP5.letter.item, REWARDS_EP5.letter.qty);   // Mira folds the letter away
  await s.music('valewyn');
  await s.face('yara_t', 'mira');
  await say(s, 'yara_t', 'Sel wrote it. She reads names in the sky. She said come before the last night. We sail at dusk.');
  await say(s, 'bram', 'Before the last night of what?');
  await say(s, 'yara_t', "She didn't say. Sel never says the end of things.");
  await s.camera.follow('hero');
  await s.setFlag('ep5_morning_done');
  await s.setFlag('ep5_started');
}

// 3. ep4_valewyn, the berth object ship_berth at the south landing (if: ep5_started). Two boxes, then the dusk the scene
// skips to. Yara is a scene spawn; she goes aboard. Sets ship_boarded (the boat door berth_sail sails to ep5_ship).
async function ep5_board(s) {
  await spawnYara(s, 'berth_yara', 'down');
  await stage(s, 'berth_stage');
  await s.face('yara_t', 'hero');
  await say(s, 'yara_t', 'Evening tide waits for nobody. Up you come.');
  await say(s, 'bram', 'Bigger than a ferry. Right. I can do bigger than a ferry.');
  await s.walk('yara_t', 'ship_berth');
  await s.despawn('yara_t');
  await s.tint('dusk', 90);
  await s.setFlag('ship_boarded');
}

// ================================================================================================
// Act II: The Saffron Wind (ep5_ship)
// ================================================================================================

// 4. ep5_ship, on enter. Two boxes. Yara at the wheel (scene spawn, she stays on deck). Sets ship_arrived.
async function ship_night(s) {
  await spawnYara(s, 'yara_wheel', 'right');
  await s.walk('hero', 'deck_stage');
  await all(s.walk('mira', 'mira_rail'), s.walk('bram', 'deck_stage_b'));
  await s.camera.panTo('mira_rail', 30);
  await s.face('mira', 'up');
  await say(s, 'mira', 'More stars than at home.');
  await s.face('yara_t', 'mira');
  await say(s, 'yara_t', 'Same stars. Fewer roofs.');
  await s.walk('bram', 'bram_bow');
  await s.camera.follow('hero');
  await s.setFlag('ship_arrived');
}

// 5. ep5_ship, step trigger bow_trig. The first truth choice (the H4 pattern: small and honest, never a locked route).
// Mira stays at the rail, out of earshot. Sets bram_asked and bram_told or bram_spared.
async function ship_bram(s) {
  await s.walk('mira', 'mira_rail');
  await s.walk('bram', 'bram_bow');
  await s.walk('hero', 'bow_stage');
  await s.face('bram', 'hero');
  await say(s, 'bram', "Mira won't tell me whose name went. You saw it.");
  const c = await s.choice(['Mine.', "Nobody's. Go to sleep."]);
  await s.setFlag('bram_asked');
  if (c === 0) {
    await s.setFlag('bram_told');
    await s.wait(40);
    await say(s, 'bram', "...Okay. Then I'm awake.");
    await say(s, 'bram', "Thanks for telling me. I'd rather be scared on purpose.");
  } else {
    await s.setFlag('bram_spared');
    await say(s, 'bram', '...Okay.');
    await narrate(s, 'He turns back to the sea. He does not go to sleep.');
  }
}

// 6. ep5_ship, step row fight_row (if: bram_asked). The teaching fight for the Turning Sky: e5s_first opens under Night
// with the Turn 4 actions away (E5-battle's SKY_START). No tutorial box. A loss sets nothing.
async function ship_fight(s) {
  await s.camera.panTo('foes_drop', 30);
  await s.sfx('sand_run');
  await narrate(s, 'Sand comes across the water out of the dark, like rain blowing sideways. Two shapes drop onto the deck.');
  await s.spawn('foe_harrier', { sprite: 'dust_harrier', name: 'Dust Harrier', at: 'foes_drop', dir: 'left' });
  await s.spawn('foe_scarab', { sprite: 'dune_scarab', name: 'Dune Scarab', at: 'foes_drop_b', dir: 'left' });
  await all(s.emote('mira', '!'), s.emote('bram', '!'));
  await s.camera.follow('hero');
  await say(s, 'mira', 'Sun-things, at night. Hit them now, before the sky turns.');
  const result = await s.battle('e5s_first', { canFlee: false });
  if (result !== 'win') return;
  await all(s.despawn('foe_harrier'), s.despawn('foe_scarab'));
  await s.tint('dawn', 60);
  await say(s, 'bram', 'Sand. On a ship. In the middle of the sea.');
  await say(s, 'mira', "We're close.");
  await narrate(s, 'Out of the morning a coast of gold dunes rises from the sea.');
  await s.setFlag('ship_first_fight_done');
}

// ================================================================================================
// Act III: The Caravan Road (ep5_caravan_road)
// ================================================================================================

// 7. ep5_caravan_road, on enter by the gangway. Yara is a scene spawn on the jetty; she goes back to her ship. Sets
// road_landed.
async function road_landing(s) {
  await spawnYara(s, 'yara_jetty', 'right');
  await stage(s, 'jetty_stage');
  await s.face('yara_t', 'hero');
  await say(s, 'bram', "It's so quiet.");
  await say(s, 'yara_t', "Caravans used to sing on this road. Nobody's left on it to sing.");
  await say(s, 'yara_t', "I'll bring her round to the Haven's water stairs. Follow the road east.");
  await s.walk('yara_t', 'jetty_end');
  await s.despawn('yara_t');
  await s.setFlag('road_landed');
}

// 8. ep5_caravan_road, step trigger road_trig as the road meets the Glass Flat. The mechanic's first lesson: one line
// points at the dial; the shadow does the rest (bark first_shade after the first hour change). Omar (the NPC record)
// sits in the obelisk's noon shade across the flat and calls over it: the one scene staged across a gap. Sets
// saw_glass_flat.
async function road_shade(s) {
  await s.camera.panTo('flat', 30);
  await narrate(s, 'A white flat of sand runs like water in the sun. A tall obelisk stands at its edge, and an old man sits in its shade.');
  await s.face('omar', 'hero');
  await say(s, 'omar', 'Sand runs in the sun and holds in the shade. Pick your hour, then walk the shadow.');
  await s.camera.panTo('dial', 30);
  await narrate(s, 'By the road stands an old caravan sundial on a stand, its three notches worn smooth.');
  await s.camera.follow('hero');
  await s.setFlag('saw_glass_flat');
}

// 9. The campfire object tent_fire at Omar's shade tent (safe, rest): the field runs the rest flow afterwards. First visit:
// one choice of three. Later visits: one box. Sets tent_rested.
async function tent_rest(s) {
  if (await s.hasFlag('tent_rested')) {
    await say(s, 'omar', (await s.hasFlag('haven_restored'))
      ? "Sit. I've three caravans of stones to set out tonight. A good tired."
      : 'Sit. The fire is for whoever comes. Today that is you.');
    return;
  }
  await s.camera.panTo('fire', 30);
  await s.walk('omar', 'fire_omar');
  await stage(s, 'fire_stage');
  await s.face('omar', 'hero');
  await say(s, 'omar', 'Omar. I keep the safe stones on this road. Sit. The water is cool, and so is the shade.');
  const c = await s.choice(['Why is the road empty?', 'Who is Sel?', 'Just rest.']);
  if (c === 0) await say(s, 'omar', "Twenty years ago the Oracle started telling caravans how they'd end. Not one wanted to hear it twice.");
  else if (c === 1) await say(s, 'omar', "Walks the deep desert. Reads the sky. Hasn't gone near the Labyrinth in twenty years. Ask her why. I never dared.");
  else await narrate(s, 'Omar sets out safe stones for a caravan that has not left in twenty years. Nobody asks him why.');
  await s.camera.follow('hero');
  await s.setFlag('tent_rested');
}

// 10. ep5_caravan_road, step trigger on the last dune. Sets saw_haven.
async function haven_view(s) {
  await s.music('mystery');
  await s.camera.panTo('haven_far', 60);
  await narrate(s, 'Below the last dune lies Saffron Haven: copper domes, an oasis, the arches of an aqueduct.');
  await narrate(s, 'Over it all a great golden armillary turns slowly, ring inside ring, against a purple sky.');
  await say(s, 'mira', 'An observatory. A whole town that reads the sky.');
  await say(s, 'bram', "And nobody's leaving it.");
  await s.emote('hero', '...');   // the hero looks longest at the empty space beside the brightest ring
  await s.wait(40);
  await s.camera.follow('hero');
  await s.music('ash_road');
  await s.setFlag('saw_haven');
}

// ================================================================================================
// Act IV: Saffron Haven (ep5_saffron, ep5_sh_observatory)
// ================================================================================================

// 11. ep5_saffron, on first enter by the south gate. Yasmin is a scene spawn at the gate (her record keeps the shop).
// No reading game: the waystone is a picture that changes; Mira says what it means. Sets haven_arrived.
async function haven_arrival(s) {
  await s.music(null);
  await s.spawn('yasmin_t', { sprite: 'npc_yasmin', name: 'Yasmin', at: 'yasmin_gate', dir: 'left' });
  await stage(s, 'waystone_stage');
  await s.camera.panTo('armillary_view', 30);   // the armillary over the Haven first (CRITIQUE_7 item 5; mark armillary_view)
  await s.wait(40);
  await s.camera.panTo('bulletin', 30);
  await narrate(s, 'Camels in their stalls. Loads packed, corded, and never lifted. A bulletin of caravan routes, every one struck out.');
  await s.camera.panTo('waystone', 30);
  await narrate(s, 'At the gate a waystone is carved with names. As the dusk deepens, the names blur, and settle into other names.');
  await s.music('saffron');
  await say(s, 'mira', 'The names changed. While I watched.');
  await s.face('yasmin_t', 'mira');
  await say(s, 'yasmin_t', "Every night. The stone writes who the Oracle says won't come home.");
  await say(s, 'bram', 'And you believe it?');
  await say(s, 'yasmin_t', "It hasn't been wrong. Nobody's gone out to make it wrong.");
  await s.camera.follow('hero');
  await s.walk('yasmin_t', 'shop_door');
  await s.despawn('yasmin_t');
  await s.setFlag('haven_arrived');
}

// 12. ep5_saffron, Sel's talk entry in the northern market court. Sets met_sel.
async function meet_sel(s) {
  await stage(s, 'sel_stage');
  await s.face('sel', 'hero');
  await say(s, 'sel', 'You came. Good. The sky said three, then two. I hoped the sky was wrong about the walking.');
  await say(s, 'sel', 'The Oracle reads every road to its end. For twenty years it has read only the bad ends.');
  await say(s, 'sel', 'A week ago it started a new one. One star. It reads it every night.');
  await s.wait(40);   // she looks at the hero
  await say(s, 'mira', 'Whose star?');
  await say(s, 'sel', "Come up to the rings tonight. Laleh will show you. I'm tired of being the one who says.");
  await s.setFlag('met_sel');
}

// 13. ep5_saffron, the Moonwell object. First look: Kamal shows the one road (sets moonwell_seen). Once the three
// witnesses are heard: moonwell_wake. Otherwise one box.
async function moonwell(s) {
  if (!(await s.hasFlag('moonwell_seen'))) {
    await stage(s, 'moonwell_stage');
    await s.face('kamal', 'hero');
    await say(s, 'kamal', 'The water tells the truth when the wind is still.');
    await say(s, 'mira', "It's showing a road.");
    await say(s, 'kamal', 'It used to show three.');
    await s.setFlag('moonwell_seen');
    return;
  }
  if (await s.hasFlag('moonwell_woken')) {
    await narrate(s, 'Three roads lie on the water, side by side. Kamal hums while he draws.');
    return;
  }
  if ((await s.hasFlag('testimony_yara')) && (await s.hasFlag('testimony_kamal')) && (await s.hasFlag('testimony_nasrin'))) {
    await moonwell_wake(s);
    return;
  }
  await narrate(s, 'The Moonwell holds the night sky, even now. On the water, one road.');
}

// 14. ep5_sh_observatory, step trigger reading_trig two tiles in (after met_sel). The set piece of Act IV. Laleh is the
// map's NPC at the rings; Nasrin and Sel are scene spawns (Sel at the door, not coming in). 13 boxes (budget 16).
// Teaches Turn the Sky (the skill's learn: { flag: 'sky_learned' }). Sets star_reading_done, sky_learned.
async function star_reading(s) {
  await s.spawn('nasrin_t', { sprite: 'npc_nasrin', name: 'Nasrin', at: 'nasrin_spot', dir: 'down' });
  await spawnSel(s, 'door_sel', 'up');
  await stage(s, 'reading_stage');
  await s.camera.panTo('rings', 30);
  await s.face('laleh', 'hero');
  await say(s, 'laleh', "The constellation has one star too few. I've kept an empty space in my charts for months.");
  await s.music(null);
  await s.sfx('prophecy_read');
  const open = await page(s, 'ep5_chart', 'prophecy');
  await narrate(s, 'The rings turn, and the stars of the chart rise in the dome: one faint star, beside an empty space.');
  await say(s, 'nasrin_t', "WHEN THE LAST NIGHT TURNS, THE KEPT ONE'S STAR GOES OUT.");
  await unpage(s, open);
  await say(s, 'bram', 'The Kept One.');
  await s.wait(30);
  await say(s, 'bram', "'Keep this one.'");
  await say(s, 'mira', '...Yes.');
  await s.face('mira', 'hero');
  await say(s, 'mira', "I read it on the letter. On the ship. I didn't say it.");
  await s.wait(20);
  await say(s, 'mira', "That's the first time I've read something and not said it.");
  if (await s.hasFlag('bram_told')) await say(s, 'bram', 'You did say it. You just took the long way.');
  else await say(s, 'bram', 'So we both knew, and neither of us said. Great team.');
  await s.walk('mira', 'rings');
  await s.face('laleh', 'mira');
  await say(s, 'laleh', "Readers don't only read. When the sky reads wrong, we turn the rings.");
  await s.sfx('sky_turn');
  await s.shake(1, 20);
  await narrate(s, 'Mira leans on the rings. The armillary swings, the stars wheel, and the faint star brightens for a breath.');
  await s.music('orrery');
  await s.sfx('level_up_sparkle');
  await s.setFlag('sky_learned');
  await narrate(s, '{c:gold}Mira learned Turn the Sky. It turns the sky now, and breaks a foretelling.{/c}');
  await say(s, 'sel_t', "My mother turned rings like that. Then she went into the Labyrinth and didn't come out.");
  await s.camera.follow('hero');
  await s.setFlag('star_reading_done');
}

// 15. ep5_saffron, step trigger gate_trig at the north gate (after star_reading_done). Sel (the NPC record) walks up from
// the market court. Gives gnomon. Sets gnomon_get (the door to ep5_lab_f1 appears).
async function sel_gate(s) {
  await s.camera.panTo('north_gate', 30);
  await s.walk('sel', 'gate_sel', { speed: 'run' });
  await stage(s, 'gate_stage');
  await s.face('sel', 'hero');
  await say(s, 'sel', "The Oracle told me my road ends in its Well. I was nine. I've stayed out of the Labyrinth ever since.");
  await say(s, 'bram', 'Who told it?');
  await s.wait(30);
  await say(s, 'sel', '...Nobody ever asked me that.');
  await s.give(REWARDS_EP5.gnomon.item, REWARDS_EP5.gnomon.qty);
  await say(s, 'sel', "The dials inside want this. Set the hour, walk the shade. And don't argue with the Oracle. My mother did.");
  await s.camera.follow('hero');
  await s.setFlag('gnomon_get');
}

// ================================================================================================
// Act V: The Oracle Labyrinth (ep5_lab_f1, ep5_lab_f2, ep5_lab_f3)
// ================================================================================================

// 16. ep5_lab_f1, on enter. The floor's question: who carved names on these obelisks and scraped them flat? Sets
// lab_entered, lab_f1_arrived.
async function lab_f1_arrival(s) {
  await s.camera.panTo('scraped', 40);
  await narrate(s, 'Roofless courts of ochre stone, half drowned in running sand. Obelisks stand in rows. Every face is chiselled flat.');
  await say(s, 'mira', 'Every obelisk had names on it. Somebody took them off with a chisel.');
  await say(s, 'bram', "Then let's find out who.");
  await s.camera.follow('hero');
  await s.setFlag('lab_entered');
  await s.setFlag('lab_f1_arrived');
}

// The sand keeps the impressions of the people who crossed it: Sel's memories are staged as a vignette (scene spawns,
// a warm flash in and out, sorrow with a distant caravan bell). No tint change: the floor's hour owns the tint (E5-world).
async function memoryIn(s, at) {
  await s.camera.panTo(at, 40);
  await s.music('sorrow');
  await s.sfx('caravan_bell');
  await s.flash('#fff2d0', 20);
}
async function memoryOut(s, ids) {
  await s.flash('#fff2d0', 20);
  for (const id of ids) await s.despawn(id);
  await s.music('labyrinth');
  await s.camera.follow('hero');
}

// 17. ep5_lab_f1, step trigger memory1_trig in the camp court. The Unfinished Caravan (canon). Sets sel_memory_1.
async function sel_memory_1(s) {
  await stage(s, 'camp_stage');
  await memoryIn(s, 'camp');
  await s.spawn('tamir_m', { sprite: 'npc_tamir', name: 'A Traveler', at: 'camp_tamir', dir: 'down' });
  await s.spawn('student_m', { sprite: 'npc_ishra', name: 'The First Student', at: 'camp_student', dir: 'down' });
  await s.spawn('young_sel_m', { sprite: 'npc_young_sel', name: 'Small Girl', at: 'camp_child', dir: 'up' });
  await s.spawn('traveler_m', { sprite: 'npc_traveler', name: 'Traveler', at: 'camp_traveler', dir: 'left' });
  await narrate(s, 'The sand goes still. For a breath the court is full: a caravan under an old sail, twenty years ago.');
  await say(s, 'tamir_m', "We're one short. We go back.");
  await say(s, 'oracle_v', 'AN INEFFICIENT JOURNEY.');
  await s.face('student_m', 'up');
  await say(s, 'student_m', 'Every journey home is inefficient. That is what home is for.');
  await s.walk('tamir_m', 'camp_out');
  await narrate(s, 'The caravan turns back the way it came. A small girl on a camel looks over her shoulder, and they are gone.');
  await memoryOut(s, ['tamir_m', 'student_m', 'young_sel_m', 'traveler_m']);
  await say(s, 'bram', 'I like her.');
  await s.setFlag('sel_memory_1');
}

// 18. Step trigger on the stair down from the far court. Silent. Sets lab_f1_done.
async function lab_f1_stair(s) {
  await s.setFlag('lab_f1_done');
}

// 19. ep5_lab_f2, on enter. Two boxes. Sets lab_f2_arrived.
async function lab_f2_arrival(s) {
  await narrate(s, 'A long roofed gallery of lapis and gold. Light comes only through tall windows. Every wall is a painted horizon.');
  await say(s, 'mira', "A sea, in the desert. A city that isn't there. Every horizon in here is wrong.");
  await s.setFlag('lab_f2_arrived');
}

// 20. ep5_lab_f2, step trigger memory2_trig at the map table. The Map That Lied (canon). Sets sel_memory_2.
async function sel_memory_2(s) {
  await stage(s, 'table_stage');
  await memoryIn(s, 'map_table');
  await s.spawn('student_m', { sprite: 'npc_ishra', name: 'The First Student', at: 'table_student', dir: 'down' });
  await s.spawn('tamir_m', { sprite: 'npc_tamir', name: 'A Traveler', at: 'table_tamir', dir: 'left' });
  await s.spawn('traveler_m', { sprite: 'npc_traveler', name: 'Traveler', at: 'table_traveler', dir: 'right' });
  await narrate(s, 'For a breath the map table is lit, and caravan masters stand round a map that shines like water.');
  await say(s, 'oracle_v', 'EVERY ROAD, AND ITS END. YOU NEED NOTHING ELSE.');
  await s.walk('student_m', 'table_window');
  await narrate(s, 'The First Student holds the map to the window. The light comes through it in small holes, where names should be.');
  await say(s, 'student_m', 'A map without those names could never guide anyone home.');
  await memoryOut(s, ['student_m', 'tamir_m', 'traveler_m']);
  await say(s, 'mira', "You steer by the star of whoever's waiting for you. Take the star off the map...");
  await say(s, 'bram', '...and nobody gets home.');
  await s.setFlag('sel_memory_2');
}

// 21. ep5_lab_f2, step trigger vex_trig at the star floor, placed so the party stops two rows below Vex. The episode's
// main truth choice. Vex is a scene spawn; he never fights; the feather prop feather_glass stays. 10 boxes on each path, with the
// choice and the list's toast 12 on screen (PLAYTEST_REVIEW_7 item 8: cut, not rewritten). He is spawned as vex_k, not vex:
// `vex` is Episode 2's mirror-glass id (world/reflections.js IN_GLASS), drawn as a pale image in the glass (CRITIQUE_7 item 8).
// He kneels at the star floor with his back to the party (vex_spot, facing up) and turns to the hero to speak; the party
// stands on party_stop, two clear rows below him.
// Gives fifth_list. Sets fifth_list_get, vex_gallery_met, and star_restored or star_hidden.
async function vex_gallery(s) {
  await s.music(null);
  await s.camera.panTo('star_floor', 40);
  await s.spawn('vex_k', { sprite: 'npc_vex', name: 'Vex Quill', at: 'vex_spot', dir: 'up' });
  await stage(s, 'party_stop');
  await narrate(s, 'A floor of dark star-glass. Vex Quill kneels on it, lifts one small star from its socket, and sets it in a painted sky.');
  await s.music('mystery');
  await s.face('vex_k', 'hero');
  await say(s, 'vex_k', 'Every night it looks for you. Every night I move you. Months now. My knees hate this floor.');
  await say(s, 'vex_k', 'A lie that saves lives is still a lie. Decide whether that matters.');
  await narrate(s, 'He holds out a list: cheap paper, a cold hand, the seal of an empty book. At the bottom, one line in fresh ink.');
  await say(s, 'vex_k', "Five lists. This one's old. Somebody added a line last week. I don't keep lists with your name on them.");
  await s.give(REWARDS_EP5.fifth_list.item, REWARDS_EP5.fifth_list.qty);
  await s.setFlag('fifth_list_get');
  await say(s, 'mira', 'Why do you care?');
  await say(s, 'vex_k', 'Somebody asked me to keep you. In writing.');
  const c = await s.choice(['Put it back.', 'Leave it hidden.']);
  if (c === 0) {
    await s.setFlag('star_restored');
    await s.walk('hero', 'star_socket');
    await s.sfx('name_restore');
    await s.flash('#fff2d0', 10);
    await narrate(s, 'You set the star back in its socket. It lights.');
    await say(s, 'vex_k', "...On the record again. You're very consistent.");
  } else {
    await s.setFlag('star_hidden');
    await say(s, 'vex_k', 'For now, then.');
    await narrate(s, 'The small star stays in the painted sky, where nothing reads.');
  }
  await s.flash('#d8e4ff', 10);
  await s.despawn('vex_k');
  await narrate(s, 'Then he is gone. The black feather lies on the glass, and does not reflect.');
  await s.music('labyrinth');
  await s.camera.follow('hero');
  await s.setFlag('vex_gallery_met');
}

// 22. ep5_lab_f2, arena trigger knight_trig. Mini-boss intro in the Episode 4 style; a retry plays only Mira's tip and
// the card. The encounter flag sets knight_defeated.
async function mirage_knight(s) {
  if (await s.hasFlag('knight_defeated')) return;
  const retry = await s.hasFlag('knight_tried');
  await s.music(null);
  await s.camera.panTo('knight_spot', 40);
  await s.wait(retry ? 10 : 30);
  if (!retry) {
    await narrate(s, 'At the end of the hall stands a tall knight of sun-bronze. Its mirror shield shows a sky that is not here.');
    await narrate(s, 'It showed every caravan a better horizon. They walked toward it.');
  }
  await say(s, 'mira', TIPS.mirage_knight);
  await s.setFlag('knight_tried');
  await s.title('THE MIRAGE KNIGHT', { sub: 'Warden of False Horizons', frames: 100 });
  await s.shake(3, 24);
  await s.flash('#ffffff', 8);
  await s.music('battle');
  const result = await s.battle('mirage_knight', { boss: true, canFlee: false });
  if (result !== 'win') return;
  await s.camera.panTo('knight_spot', 20);
  await narrate(s, 'The mirror cracks across. For a moment it shows the right sky. Then it shows nothing at all.');
  await say(s, 'bram', 'I saw myself in that shield. I looked taller.');
  await say(s, 'mira', 'It lies, Bram.');
  await s.camera.follow('hero');
  await s.music('labyrinth');
  await s.setFlag('knight_defeated');
}

// Step trigger on the stair past the mirror hall. Silent. Sets lab_f2_done.
async function lab_f2_stair(s) {
  await s.setFlag('lab_f2_done');
}

// 23. ep5_lab_f2, object reliquary_obj (lantern: true; lit only at dusk). The Lost Traveler Reliquary. Opens the hidden
// door to the cache (the map's gold chest, present if reliquary_found). Sets reliquary_found.
async function reliquary(s) {
  await s.sfx('lantern_reveal');
  await narrate(s, 'Mira lifts the Lantern over the sunlit floor. Under the sand, scratches glow: names, dozens of them, and arrows.');
  await say(s, 'mira', 'Names, scratched under the sand. Somebody wanted them found.');
  await s.sfx('door_unlock');
  await narrate(s, 'Every arrow points the same way. In the alcove wall, a hidden door lets go.');
  await s.setFlag('reliquary_found');
}

// 24. ep5_lab_f3, on enter. The darkest map of the episode. Sets lab_f3_arrived; chains sel_walks_in.
async function lab_f3_arrival(s) {
  await narrate(s, 'Night inside the earth: a great round shaft going down in landings. Far below, still water holds a circle of sky.');
  await say(s, 'bram', "It's night down here.");
  await say(s, 'mira', "It's always night in a well.");
  await s.setFlag('lab_f3_arrived');
  await sel_walks_in(s);
}

// 25. ep5_lab_f3, chained after lab_f3_arrival on the first landing. Sel is a scene actor from here (sel_t): she does not
// fight; at each landing's spring she waits. Sets sel_walked_in.
async function sel_walks_in(s) {
  await s.sfx('footstep_stone');
  await all(s.emote('mira', '!'), s.emote('bram', '!'));
  await spawnSel(s, 'stair_above', 'down');
  await s.camera.panTo('sel_top', 30);
  await s.walk('sel_t', 'sel_top', { speed: 'run' });
  await stage(s, 'top_stage');
  await narrate(s, 'Footsteps on the stair above. Sel comes down with her sun staff, out of breath.');
  await say(s, 'sel_t', 'Twenty years I believed it. Then three people walked in here off a list that says one of them is ending.');
  await s.wait(30);
  await say(s, 'sel_t', 'So.');
  await say(s, 'bram', 'So?');
  await say(s, 'sel_t', "So I'm a fool, or the Oracle is. I came to find out which.");
  await s.camera.follow('hero');
  await s.setFlag('sel_walked_in');
}

// 26. The three landings, in the order of the descent. Each runs from its spring object (spring_shelter, spring_truth,
// spring_return) after the landing's lamp puzzle. Sel waits at sel_wait_1..3 (re-spawned there: she went ahead). One line
// from the First Student's memory (a voice, student_m), then one from Sel.
const LANDINGS = {
  landing_shelter: { n: 1, vow: 'SHELTER', at: 'shelter',
    student: 'Nobody crosses alone. Make room under the sail.', sel: 'She used to say that to the camels.' },
  landing_truth: { n: 2, vow: 'TRUTH', at: 'truth',
    student: "Tell the caravan where the water is, even when it's far.", sel: 'She never lied about distance. It made her very unpopular.' },
  landing_return: { n: 3, vow: 'RETURN', at: 'return',
    student: 'Without a return, a journey is only exile.', sel: "...She didn't come back." },
};
async function landing(s, flag) {
  const L = LANDINGS[flag];
  await spawnSel(s, `sel_wait_${L.n}`, 'down');
  await stage(s, `${L.at}_stage`);
  await s.camera.panTo(L.at, 30);
  await s.sfx('sand_hold');
  await narrate(s, `The dry spring fills from below, with a sound like a bell under sand. Carved on its lip: ${L.vow}.`);
  await s.sfx('caravan_bell');
  await say(s, 'student_m', L.student);
  await say(s, 'sel_t', L.sel);
  await s.camera.follow('hero');
  await s.setFlag(flag);
}
const landing_shelter = (s) => landing(s, 'landing_shelter');
const landing_truth = (s) => landing(s, 'landing_truth');
async function landing_return(s) {
  await landing(s, 'landing_return');
  await sel_memory_3(s);
}

// 27. ep5_lab_f3, chained from landing_return. The Name Under the Sand (canon), then Sel's beat. The page is the close-up
// ep5_page. "The First Student" becomes "Ishra" here (SPEAKER_NAMES student_m / ishra_m; the Ledger row is hidden until
// this flag). Gives ishra_page. Sets sel_memory_3, oracle_door_open (the Sun Keyhole turns with the Nomad Sun Key).
async function sel_memory_3(s) {
  await s.music(null);
  await s.camera.panTo('page_spot', 30);
  await s.walk('sel_t', 'page_sel');
  await stage(s, 'page_stage');
  await narrate(s, 'Under the last spring, in the wet sand, lies a page sealed in glass. Sel kneels. She knows the hand.');
  const open = await page(s, 'ep5_page');
  await say(s, 'sel_t', 'The future is not a single answer. Carry the names of people who might still choose another road.');
  await unpage(s, open);
  await s.wait(30);
  await s.music('sorrow');
  await s.sfx('name_restore');
  await s.flash('#fff2d0', 12);
  await say(s, 'sel_t', 'Ishra. Her name was Ishra.');
  await say(s, 'mira', "Not the same hand as 'Keep this one.' But she learned her letters from whoever wrote it. Look at the k.");
  await say(s, 'sel_t', "She went in to argue with it. She never came out. I believed that meant I shouldn't either.");
  await s.give(REWARDS_EP5.ishra_page.item, REWARDS_EP5.ishra_page.qty);
  await say(s, 'sel_t', 'Keep it with the others, Mira. She would want it read.');
  await s.music('mystery');
  await s.camera.panTo('keyhole', 30);
  await narrate(s, 'Below the last landing, the Sun Keyhole waits in the dark.');
  await s.camera.follow('hero');
  await s.setFlag('sel_memory_3');
  await s.setFlag('oracle_door_open');
}

// ================================================================================================
// Act VI: The Sand Oracle (ep5_lab_oracle)
// ================================================================================================

// 28. ep5_lab_oracle, step trigger row oracle_trig. Boss intro; the Oracle is the map actor `oracle` (sprite
// oracle_avatar) coiled on the ring. After a loss it only stirs, Mira repeats her tip, and the card shows. A win chains
// oracle_after.
async function oracle(s) {
  if (await s.hasFlag('oracle_defeated')) return;
  await s.music(null);
  await spawnSel(s, 'sel_enter', 'up');
  await s.camera.panTo('ring', 40);
  if (await s.hasFlag('oracle_tried')) {
    await s.shake(2, 30);
    await say(s, 'mira', TIPS.oracle);
    await oracle_fight(s);
    return;
  }
  await stage(s, 'party_stop');
  await s.wait(40);
  await narrate(s, 'A round floor of star-glass under the open shaft. Coiled about a golden ring, something vast, gold, and masked.');
  await narrate(s, 'It told them how it ended. They stopped walking.');
  await say(s, 'oracle', 'THE KEPT ONE. I HAVE READ YOUR END EVERY NIGHT FOR A WEEK.');
  await s.shake(2, 30);
  await say(s, 'oracle', 'SEVERAL FUTURES. ONLY ONE IS TRUE.');
  await say(s, 'sel_t', 'Who told you to read only the ends?');
  await say(s, 'oracle', 'A LIST. IT IS WRITTEN.');
  await say(s, 'bram', "Written's not the same as true. Ask a Regent.");
  const c = await s.choice(['Read us a road.', 'Turn the sky.']);
  if (c === 0) await say(s, 'oracle', 'EVERY ROAD I READ ENDS. THAT IS WHAT A ROAD IS.');
  else await say(s, 'oracle', 'THE SKY IS READ. WHAT IS READ IS DONE.');
  await say(s, 'mira', TIPS.oracle);
  await oracle_fight(s);
}
async function oracle_fight(s) {
  await s.setFlag('oracle_tried');
  await s.title('THE SAND ORACLE', { sub: 'Reader of Every Road', frames: 100 });
  await s.shake(4, 30);
  await s.flash('#ffffff', 10);
  await s.music('boss_oracle');
  const result = await s.battle('oracle', { boss: true, canFlee: false });
  if (result !== 'win') return;
  await oracle_after(s);
}

// 29. ep5_lab_oracle, after the win (also runnable on its own, from an enter trigger after a reload). The order is the
// bible's: the mask cracks, the chart opens, the hero's star (one line by the Gallery choice), the counter-seal and the
// fifth fragment, the road, Ishra's star, the feather. 18 boxes (budget 22). Gives name_fragment_5. Sets oracle_defeated,
// chart_restored, fragment5_get.
async function oracle_after(s) {
  await s.setFlag('oracle_defeated');
  await spawnSel(s, 'sel_enter', 'up');
  await s.camera.panTo('ring', 20);
  await s.shake(3, 40);
  await s.sfx('boss_die');
  await s.flash('#ffffff', 16);
  await s.music('sorrow');
  await narrate(s, 'The Oracle sinks onto the glass, coil by coil. Its mask cracks down the middle.');
  await say(s, 'oracle', 'I SAW HOW EVERY ROAD ENDS. I NEVER SAW ANYONE CHOOSE ONE.');
  await s.wait(30);
  await say(s, 'oracle', 'I WAS TOLD NOT TO LOOK.');
  await narrate(s, 'Its starry body opens like the sky opening. Inside lies a chart: every name of the realm, a star.');
  await s.camera.panTo('chart_spot', 30);
  await stage(s, 'chart_spot');
  await s.sfx('name_restore');
  await s.flash('#fff2d0', 16);
  await s.music('triumph');
  let open = await chartBeat(s, 0, false);
  await narrate(s, 'Twenty years of struck stars light again, one by one, like lamps coming on along a road.');
  open = await chartBeat(s, 1, open);
  await narrate(s, 'Beside the empty space Laleh kept in her charts, a star. Yours. The space is not empty now.');
  if (await s.hasFlag('star_restored')) await say(s, 'mira', "You put it back yourself. It's brighter than the ones around it.");
  else await say(s, 'mira', 'Vex hid it. The chart found it anyway. You were standing in it.');
  await s.music('mystery');
  open = await chartBeat(s, 2, open);
  await narrate(s, 'Under your star, a tiny constellation: an open book with one line. Under it, in starlight: Keep this one.');
  await s.give(REWARDS_EP5.fragment.item, REWARDS_EP5.fragment.qty);
  await s.setFlag('fragment5_get');
  await say(s, 'bram', 'Five times.');
  await say(s, 'mira', 'Five places. Fire, water, glass, steel, sky. Somebody really wants you kept.');
  await unpage(s, open);
  await s.setFlag('chart_restored');
  await s.music('saffron');
  await say(s, 'oracle', 'A ROAD.');
  await narrate(s, 'The chart turns. A line of caravan stars runs north and west across it, pointing home to Saffron Haven.');
  await say(s, 'oracle', 'SEVERAL. THEY ARE WALKING.');
  await s.walk('sel_t', 'chart_sel');
  await narrate(s, 'Sel bends over the chart and touches one small star near its edge. It brightens under her hand.');
  await say(s, 'sel_t', 'There you are. Late, as usual.');
  await s.camera.panTo('feather_spot', 30);
  await narrate(s, 'By the chart, the black feather lies on the glass. It does not reflect the stars.');
  await say(s, 'bram', 'He was here.');
  await say(s, 'mira', "He's always here. He just doesn't stand where the light is.");
  await s.camera.follow('hero');
}

// ================================================================================================
// Act VII: Every Road Remembers (ep5_saffron)
// ================================================================================================

// 30. ep5_saffron, on arrival at the north gate by the shaft's lift (after oracle_after). Dawn. Yara and Nasrin are
// scene spawns (their records stand down from chart_restored until ep5_complete); Tamir walks in as "A Traveler" and
// is "Tamir" once Yara knows him. 11 boxes (budget 14). Sel's gift by the Gallery choice. Sets roads_returned,
// haven_restored; chains ep5_ending.
async function every_road(s) {
  await s.music(null);
  await s.tint('dawn', 60);
  await spawnSel(s, 'gather_sel', 'down');
  await spawnYara(s, 'gather_yara', 'up');
  await s.spawn('nasrin_t', { sprite: 'npc_nasrin', name: 'Nasrin', at: 'gather_nasrin', dir: 'up' });
  await stage(s, 'gate_stage');
  await s.camera.panTo('waystone', 40);
  await narrate(s, 'Dawn. At the gate the waystone holds its names. They do not change. Across the court the Moonwell is full.');
  for (let i = 0; i < 3; i++) { await s.sfx('caravan_bell'); await s.wait(30); }
  await s.camera.panTo('caravan_in', 40);
  await s.spawn('tamir_t', { sprite: 'npc_tamir', name: 'A Traveler', at: 'caravan_in', dir: 'up' });
  await s.spawn('traveler_a', { sprite: 'npc_traveler', name: 'Traveler', at: 'caravan_in_b', dir: 'up' });
  await s.spawn('traveler_b', { sprite: 'npc_traveler_b', name: 'Traveler', at: 'caravan_in_c', dir: 'up' });
  await narrate(s, "Out of the deep desert a caravan walks in: thin camels, sun-blacked faces, and at the front a man with Yara's nose.");
  await all(s.walk('tamir_t', 'gather_tamir'), s.walk('traveler_a', 'gather_trav_a'), s.walk('traveler_b', 'gather_trav_b'));
  await narrate(s, 'Yara lets the coil of rope slide off her shoulder, and does not pick it up.');
  await say(s, 'yara_t', '...Father?');
  // Yara knows him: same tile, same sprite, his name on the speaker tag (the Episode 4 swap).
  await s.despawn('tamir_t');
  await s.spawn('tamir_n', { sprite: 'npc_tamir', name: 'Tamir', at: 'gather_tamir', dir: 'up' });
  await say(s, 'tamir_n', 'We followed a star that came back last night. Mine was yours.');
  await s.emote('yara_t', 'heart');
  await s.music('saffron');
  await s.camera.panTo('moonwell', 40);
  await s.walk('sel_t', 'moonwell_sel');
  await narrate(s, 'At the Moonwell, Sel reads out the names of the caravans the Oracle had written off, one by one, aloud.');
  await say(s, 'nasrin_t', 'Shelter. Truth. Return. The old law. It works.');
  await s.camera.follow('hero');
  await s.walk('sel_t', 'gate_sel');
  await s.face('sel_t', 'hero');
  const truth = await s.hasFlag('star_restored');
  if (truth) await say(s, 'sel_t', 'You put your own star back where it could be read. My mother would have liked you.');
  else await say(s, 'sel_t', "You'd have stayed hidden. I understand that. I did it twenty years.");
  const gift = truth ? REWARDS_EP5.gift_truth : REWARDS_EP5.gift_hidden;
  await s.give(gift.item, gift.qty);
  await say(s, 'sel_t', 'Steer by it. Someone is waiting somewhere for each of you.');
  await say(s, 'bram', "Ask who told them. That's my whole idea and I'm keeping it.");
  await say(s, 'mira', 'Write it down.');
  await s.setFlag('roads_returned');
  await s.tint('none', 60);
  await s.setFlag('haven_restored');
  await ep5_ending(s);
}

// 31. ep5_saffron at night, straight after. The town on its roofs; the freed Oracle's first reading is a road. End cards.
// Sets ep5_complete; the hooks then roll CREDITS_EP5 (counter credits5_rolled), show END_CARD_EP5 and wake the party at
// ep5_sh_inn inn_bed. 11 boxes (budget 13).
async function ep5_ending(s) {
  await s.fade('out', 60);
  for (const id of ['tamir_n', 'traveler_a', 'traveler_b', 'nasrin_t']) await s.despawn(id);
  await s.tint('night', 0);
  await s.music(null);
  await s.spawn('laleh_t', { sprite: 'npc_laleh', name: 'Laleh', at: 'roof_laleh', dir: 'up' });
  await spawnSel(s, 'roof_sel', 'up');
  await spawnYara(s, 'roof_yara', 'up');
  await stage(s, 'roof_stage');
  await s.camera.panTo('roof_view', 0);
  await s.fade('in', 90);
  await narrate(s, 'That night the whole Haven is up on its roofs, watching the sky.');
  await narrate(s, 'The great armillary turns by itself. Over the town the stars write a new reading, and it is a road.');
  await s.music('orrery');
  const open = await page(s, 'ep5_chart', 'road');
  await say(s, 'laleh_t', 'A LIBRARY ABOVE THE CLOUDS KEEPS THE FIRST PAGE. A SKY COMPASS FINDS IT.');
  await unpage(s, open);
  await say(s, 'mira', 'The first page.');
  await say(s, 'bram', "Vex's first page.");
  await say(s, 'mira', "{hero}'s first page.");
  await say(s, 'yara_t', "There's a skyport at Zephyr Landing. The old caravan charts point there.");
  await say(s, 'sel_t', "I'll walk you to the coast. I've got twenty years of walking to catch up on.");
  await s.face('hero', 'up');
  await narrate(s, 'You look up. Your star is bright, and beside it, faint, a little open book of stars with one line.');
  await narrate(s, 'Far off, the wind turns over the dunes with a sound like pages.');
  await s.music('mystery');
  await say(s, 'mira', 'Something up there just turned a page.');
  await s.fade('out', 120);
  for (const id of ['laleh_t', 'sel_t', 'yara_t']) await s.despawn(id);
  await s.title(END_TITLE_EP5.text, { sub: END_TITLE_EP5.sub, frames: 240 });
  await s.title(EPISODE6_CARD.text, { sub: EPISODE6_CARD.sub, frames: 240 });
  await s.setFlag('ep5_complete');
}

// ------------------------------------------------------------------------------------------------
// Side stories (EPISODE5.md section 2)
// ------------------------------------------------------------------------------------------------

// Three Roads Home. Kamal's talk entry once met_sel starts it, and he is his own witness at once (testimony_kamal is
// part of roads_start, not a scene of its own); then Yara's and Nasrin's talk entries; then the Moonwell object (moonwell,
// which calls moonwell_wake).
async function roads_start(s) {
  await s.face('kamal', 'hero');
  await say(s, 'kamal', 'The Moonwell used to show three roads home. Shelter, Truth, Return, the old law says. Now it shows one.');
  await say(s, 'kamal', 'Hear the old witnesses first. Yara, at the water stairs. Nasrin, in the market. And me. I am slow.');
  await say(s, 'bram', 'Witnesses again. Mira loves witnesses.');
  await s.setFlag('roads_started');
  await testimony_kamal(s);
}
async function testimony_kamal(s) {
  await say(s, 'kamal', 'The oasis water tells the truth when the wind grows still.');
  await say(s, 'kamal', 'Moonwell water tastes different every dusk. Tonight it tastes of a road nobody takes.');
  await s.setFlag('testimony_kamal');
}
async function testimony_yara(s) {
  await s.face('yara', 'hero');
  await say(s, 'yara', 'The Sand Oracle once promised to see all journeys. Now it only sees the end of them.');
  await say(s, 'yara', 'My father left his route to protect the missing. He was a caravan master. He did not come back.');
  await s.setFlag('testimony_yara');
}
async function testimony_nasrin(s) {
  await s.face('nasrin', 'hero');
  await say(s, 'nasrin', 'There are three vows in the old caravan law: Shelter, Truth, Return.');
  await say(s, 'nasrin', 'Without a return, a journey is only exile. I read the prophecy aloud every night, because someone must.');
  await s.setFlag('testimony_nasrin');
}
// The Moonwell wakes (canon), from the Moonwell object once all three have spoken. Night for the drawing, then the
// Haven's own tint again. +20 Fury at the Oracle from moonwell_woken (E5-battle's encounter startFury).
async function moonwell_wake(s) {
  const back = (await s.hasFlag('haven_restored')) ? 'none' : 'dusk';
  await stage(s, 'moonwell_stage');
  await s.tint('night', 40);
  await narrate(s, 'Night falls on the caravanserai. Kamal lowers the bucket, and the wind goes still.');
  await s.sfx('name_restore');
  await narrate(s, 'On the water the stars draw three roads home, side by side. Safe ones.');
  await say(s, 'kamal', "Three. I'd forgotten what three looked like.");
  await s.give(REWARDS_EP5.roads.item, REWARDS_EP5.roads.qty);
  await s.give('gold', REWARDS_EP5.roads.gold);
  await s.give(REWARDS_EP5.roads_mantle.item, REWARDS_EP5.roads_mantle.qty);
  await say(s, 'mira', 'Three witnesses, three roads. The old law keeps its own shape.');
  await s.setFlag('moonwell_woken');
  await s.setFlag('roads_done');
  await s.tint(back, 40);
}

// Hassan's Bells. Hassan's talk entry from haven_arrived starts it; the three bells are chests (bell_1_found..3, present
// once bells_started); his talk entry with all three found ends it. Cut line 1 drops it (EPISODE5 section 2).
async function bells_start(s) {
  await s.face('hassan', 'hero');
  await say(s, 'hassan', 'The smiths here can hear a sandstorm coming through their anvils. I hear bells. Three are missing.');
  await say(s, 'hassan', 'I tune little bells so caravans can find the way home. When the last ones turned back, three fell off.');
  await say(s, 'hassan', 'One on the Caravan Road. Two in the Labyrinth, the first floor. Bring them, and they go on the gate.');
  await s.setFlag('bells_started');
}
async function bells_done(s) {
  await s.face('hassan', 'hero');
  await narrate(s, 'You set the three bells on the anvil. Hassan rings the first with a fingernail.');
  await s.sfx('caravan_bell');
  await say(s, 'bram', "That's my mother's tuning.");
  await say(s, 'hassan', 'My master learned it from a bell-founder from the mountains. She tuned bells for half the world, once.');
  await s.take(REWARDS_EP5.bell.item, REWARDS_EP5.bell.qty);
  await s.give(REWARDS_EP5.bells.item, REWARDS_EP5.bells.qty);
  await say(s, 'hassan', 'They go on the gate tonight. When a caravan comes home, it will hear them first.');
  await s.setFlag('bells_done');
}

// ------------------------------------------------------------------------------------------------
// Scene registry. Every flag is declared in flags.js. `ep5_morning` needs the switch (live) and not Fine Print; every
// other chain bottoms out at ep5_started, which only ep5_morning sets.
// ------------------------------------------------------------------------------------------------
const TESTIMONIES = ['testimony_yara', 'testimony_kamal', 'testimony_nasrin'];
const BELLS = ['bell_1_found', 'bell_2_found', 'bell_3_found'];
export const SCENE_CONDITIONS = {
  ep5_morning: { if: 'ep4_complete', ifNot: ['ep5_morning_done', 'tier_1'], live: true },
  ep5_board: { if: 'ep5_started', ifNot: 'ship_boarded' },
  ship_night: { if: 'ship_boarded', ifNot: 'ship_arrived' },
  ship_bram: { if: 'ship_arrived', ifNot: 'bram_asked' },
  ship_fight: { if: 'bram_asked', ifNot: 'ship_first_fight_done' },
  road_landing: { if: 'ship_first_fight_done', ifNot: 'road_landed' },
  road_shade: { if: 'road_landed', ifNot: 'saw_glass_flat' },
  tent_rest: { if: 'road_landed' },
  haven_view: { if: 'road_landed', ifNot: 'saw_haven' },
  haven_arrival: { if: 'road_landed', ifNot: 'haven_arrived' },
  meet_sel: { if: 'haven_arrived', ifNot: 'met_sel' },
  moonwell: { if: 'haven_arrived' },
  star_reading: { if: 'met_sel', ifNot: 'star_reading_done' },
  sel_gate: { if: 'star_reading_done', ifNot: 'gnomon_get' },
  lab_f1_arrival: { if: 'gnomon_get', ifNot: 'lab_f1_arrived' },
  sel_memory_1: { if: 'lab_f1_arrived', ifNot: 'sel_memory_1' },
  lab_f1_stair: { if: 'lab_f1_arrived', ifNot: 'lab_f1_done' },
  lab_f2_arrival: { if: 'lab_f1_done', ifNot: 'lab_f2_arrived' },
  sel_memory_2: { if: 'lab_f2_arrived', ifNot: 'sel_memory_2' },
  vex_gallery: { if: 'lab_f2_arrived', ifNot: 'vex_gallery_met' },
  mirage_knight: { if: 'lab_f2_arrived', ifNot: 'knight_defeated' },
  lab_f2_stair: { if: 'knight_defeated', ifNot: 'lab_f2_done' },
  reliquary: { if: 'lab_f2_arrived', ifNot: 'reliquary_found' },
  lab_f3_arrival: { if: 'lab_f2_done', ifNot: 'lab_f3_arrived' },
  sel_walks_in: { if: 'lab_f3_arrived', ifNot: 'sel_walked_in' },
  landing_shelter: { if: 'sel_walked_in', ifNot: 'landing_shelter' },
  landing_truth: { if: 'landing_shelter', ifNot: 'landing_truth' },
  landing_return: { if: 'landing_truth', ifNot: 'landing_return' },
  sel_memory_3: { if: 'landing_return', ifNot: 'sel_memory_3' },
  oracle: { if: 'oracle_door_open', ifNot: 'oracle_defeated' },
  oracle_after: { if: 'oracle_defeated', ifNot: 'chart_restored' },
  every_road: { if: 'chart_restored', ifNot: 'haven_restored' },
  ep5_ending: { if: 'haven_restored', ifNot: 'ep5_complete' },
  roads_start: { if: 'met_sel', ifNot: 'roads_started' },
  testimony_yara: { if: 'roads_started', ifNot: 'testimony_yara' },
  testimony_nasrin: { if: 'roads_started', ifNot: 'testimony_nasrin' },
  moonwell_wake: { if: TESTIMONIES, ifNot: 'moonwell_woken' },
  bells_start: { if: 'haven_arrived', ifNot: 'bells_started' },
  bells_done: { if: BELLS, ifNot: 'bells_done' },
};

const RAW = {
  ep5_morning, ep5_board, ship_night, ship_bram, ship_fight,
  road_landing, road_shade, tent_rest, haven_view,
  haven_arrival, meet_sel, moonwell, star_reading, sel_gate,
  lab_f1_arrival, sel_memory_1, lab_f1_stair, lab_f2_arrival, sel_memory_2, vex_gallery, mirage_knight, lab_f2_stair,
  reliquary, lab_f3_arrival, sel_walks_in, landing_shelter, landing_truth, landing_return, sel_memory_3,
  oracle, oracle_after, every_road, ep5_ending,
  roads_start, testimony_yara, testimony_nasrin, moonwell_wake, bells_start, bells_done,
};

export const scenes = Object.fromEntries(Object.entries(RAW).map(([id, fn]) => [id, cut(fn, SCENE_CONDITIONS[id])]));

// The main-path scenes in story order, for the box-budget and playthrough tests (side scenes are not on it; the chained
// sel_walks_in, sel_memory_3, oracle_after and ep5_ending are counted inside the scene that chains them, and on their own).
export const MAIN_PATH = ['ep5_morning', 'ep5_board', 'ship_night', 'ship_bram', 'ship_fight', 'road_landing', 'road_shade',
  'tent_rest', 'haven_view', 'haven_arrival', 'meet_sel', 'moonwell', 'star_reading', 'sel_gate', 'lab_f1_arrival',
  'sel_memory_1', 'lab_f1_stair', 'lab_f2_arrival', 'sel_memory_2', 'vex_gallery', 'mirage_knight', 'lab_f2_stair',
  'lab_f3_arrival', 'landing_shelter', 'landing_truth', 'landing_return', 'oracle', 'every_road'];
/** Box budgets (EPISODE5.md section 1, E5-story brief item 3): 12 per main scene, except these. */
export const BOX_BUDGET = { default: 12, ep5_morning: 6, star_reading: 16, oracle_after: 22, every_road: 14, ep5_ending: 13 };
/** The close-up payoffs (plan 9.4): scene -> [kind, mode]. */
export const PAYOFFS = {
  ep5_morning: [['ep5_letter', 'blank']],
  star_reading: [['ep5_chart', 'prophecy']],
  sel_memory_3: [['ep5_page', undefined]],
  oracle_after: CHART_BEATS ? CHART_BEATS.map((m) => ['ep5_chart', m]) : [['ep5_chart', 'restored']],
  ep5_ending: [['ep5_chart', 'road']],
};

export function register() {
  return STORY.registerStory({ scenes, lines: {}, conditions: SCENE_CONDITIONS });
}

export default register;
