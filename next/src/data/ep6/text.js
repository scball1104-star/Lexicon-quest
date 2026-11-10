// Episode 6, "The Skybound Isles": banners, inspect lines, books, barks, bestiary, the battle and boss lines, the credits
// and the end cards. register() assigns them into BANNERS, BOOKS, BARKS, BESTIARY and (through registerStory) the shared
// LINES table. Idempotent. Pure data. Part of the lazy `ep6` pack.
//
// Box rules (qa/content/ep6_*.test.mjs): at most 3 lines of 42 characters per box with an 8-letter hero name, ASCII, no
// em dashes, {hero} for the player's name. Until `pippa_found` nothing here says Pippa's name. The board, the manifests,
// the letter and the page are pictures and plain lines, never something to work out.
//
// Not registered here (E6-scene-ui wires them into the battle scene's BOSS_CARD and the help window, as Episode 5's
// scene.js did): EP6_BOSS_CARDS, EP6_ARC_LINES and EP6_BATTLE_TEXT. E6-battle's messages may read EP6_BATTLE_TEXT too.

import { BANNERS, BOOKS, BARKS, BESTIARY } from '../text.js';
import * as STORY from '../../game/story.js';
import { END_CARD_EP5 } from '../ep5/text.js';

const m = (text) => ({ who: 'mira', text });
const b = (text) => ({ who: 'bram', text });

// ------------------------------------------------------------------------------------------------
// Banners (plan 2.1): 11 maps, Zephyr Landing's with a second state.
// ------------------------------------------------------------------------------------------------
export const EP6_BANNERS = {
  ep6_airstair: { title: 'The Airstair', sub: 'Up to Zephyr Landing' },
  ep6_zephyr: { title: 'Zephyr Landing', sub: 'The Windward Docks',
    states: [{ if: 'isles_restored', title: 'Zephyr Landing', sub: 'The Sky Remembers' }] },
  ep6_zl_inn: { title: 'The Cloudhouse Inn' },
  ep6_zl_shop: { title: 'Aeris Flight Provisions' },
  ep6_zl_workshop: { title: 'The Galewing Workshop' },
  ep6_zl_charts: { title: 'The Chart Room' },
  ep6_obs_f1: { title: 'The Storm Observatory', sub: 'I. The Windward Causeways' },
  ep6_obs_f2: { title: 'The Storm Observatory', sub: 'II. The Hall of Broken Signals' },
  ep6_obs_f3: { title: 'The Storm Observatory', sub: 'III. The Eye of the Storm' },
  ep6_obs_eyrie: { title: "The Scribe's Eyrie" },
  ep6_library: { title: 'The Cloud Library', sub: 'Above the Storm' },
};

// ------------------------------------------------------------------------------------------------
// Inspect lines (plan 4; signs and objects point at these ids). A string, a list of boxes, or a conditional list
// [{ if, ifNot, lines }] whose last entry is the fallback.
// ------------------------------------------------------------------------------------------------
export const EP6_LINES = {
  // ep5_saffron (the ep6 patch): Yara's ship at the water stairs
  ep6_ship_berth: [
    { if: 'airstair_arrived', lines: "Yara's ship, tied up and rocking. She runs between the Haven and the sea stacks now." },
    { lines: ["Yara's ship at the water stairs, her sails loose and ready. The bow points north-west."] },
  ],

  // ep6_airstair
  ep6_sea_stack: 'Black rock, wet to the height of a house. The sea breaks white on it and comes back for more.',
  ep6_great_chain: 'A chain with links as tall as a door, bolted into the rock. It runs up into the cloud, and hums.',
  ep6_rope_stair: 'Rope stairs, bolted to the stack. The planks are worn pale in the middle by a lot of boots.',
  ep6_isles_far: 'Green islands floating in the sky, strung together with bridges. A small airship is crossing between two.',
  ep6_winch: "Bennet's winch at the top of the stack: a drum of rope, a crank, and a sign that says GOODS UP, PEOPLE WALK.",

  // the gust lane kit (every Episode 6 map with wind)
  ep6_gust_lane: 'A stream of white wind running one way over the cloud. Step in, and it carries you.',
  ep6_cloudbank: 'Soft cloud, and nothing under it. Not something to walk on.',
  ep6_mooring_post: 'A mooring post in the stream, a pennant flying off it downwind. A ride stops here, if you grab it.',
  ep6_vane: 'A weathervane on a pole. Its arrow points the way the wind runs. Turn it, and the wind turns too.',
  ep6_fan_vane: 'A brass fan on a lever, set in the duct. Pull the lever and the fan turns the wind the other way.',
  ep6_breeze_font: 'A spring in a sheltered alcove, out of the wind. The water is cold and tastes of rain.',
  ep6_dash_crate: 'A cargo crate, cracked down one side. A hard enough blow would open it.',
  ep6_chimes_tied: [
    { if: 'isles_restored', lines: 'Wind chimes on a post. They ring every time the wind turns.' },
    { lines: 'Wind chimes on a post, tied shut with black thread. The knots are tight and very neat.' },
  ],

  // ep6_zephyr
  ep6_board: [
    { if: 'isles_restored', lines: ['The Skyport Departure Board. Most rows show DEPARTING, on true courses.',
      'One row, at the top: LANDED, DOCK FOUR.'] },
    { lines: ['The Skyport Departure Board. Every row says ARRIVED.', 'The docks under it are empty.'] },
  ],
  ep6_chimes: [
    { if: 'isles_restored', lines: 'The plaza chimes, ringing. The thread lies on the ground in short black pieces.' },
    { lines: 'Wind chimes on brass posts, every one tied silent with black thread. The wind pulls at them.' },
  ],
  ep6_post_rack: [
    { if: 'letters_done', lines: "Piri's post rack, sorted. Every slot has a letter in it, and every letter a course." },
    { if: 'letters_started', lines: 'The post rack, with three empty slots. Piri has labelled them anyway.' },
    { lines: "A post rack by the board, slots for every island. A grey bird with a silver ribbon dozes on top." },
  ],
  ep6_beacon: [
    { if: 'beacon_lit', lines: 'The Signal Beacon of Lost Flights, burning white on the tower roof. Ships are steering by it.' },
    { lines: 'The Signal Beacon of Lost Flights: a great brass ring round a lamp, on the tower roof. It is cold.' },
  ],
  ep6_kestrel: [
    { if: 'library_reached', lines: 'The Kestrel, moored at the north dock. There is a dent in her bow the shape of a landing.' },
    { lines: "Aeris's airship, the Kestrel. Brass engines, patched sails, and a name painted fresh on the bow." },
  ],
  ep6_dock_four: [
    { if: 'pippa_home', lines: 'Dock four. A dropped letter lies on the planks, and nobody has picked it up. Nobody needs to.' },
    { lines: 'Dock four. An empty berth, freshly swept, ready for a ship.' },
  ],
  ep6_cloud_garden: 'Flowers floating where the rain catches under the wind rails. They lean the way the wind goes.',
  ep6_storm_far: 'The storm in the north-east: a dark knot round a white spire. It has not moved in a month.',
  sign_ep6_inn: 'THE CLOUDHOUSE INN. HAMMOCKS. SOFT LANDINGS.',
  sign_ep6_shop: 'AERIS FLIGHT PROVISIONS. EVERYTHING FOR THE LONG WAY ROUND.',
  sign_ep6_workshop: 'THE GALEWING WORKSHOP. JOINTS MENDED. PINS CHECKED TWICE.',
  sign_ep6_tower: 'THE SIGNAL BEACON TOWER. CHART ROOM BELOW.',
  sign_ep6_east_airstair: [
    { if: 'obs_entered', lines: 'EAST AIRSTAIR. TO THE STORM OBSERVATORY. Somebody has scratched under it: CAME BACK.' },
    { lines: 'EAST AIRSTAIR. TO THE STORM OBSERVATORY. Under it, newer paint: CLOSED.' },
  ],

  // ep6_zl_charts
  ep6_skychart: [
    { if: 'isles_restored', lines: "The Captain's Brass Skychart. The courses on it run home again, by the long way." },
    { lines: "The Captain's Brass Skychart, a table of brass and glass. Every course on it runs the shortest way." },
  ],
  ep6_manifest_wall: [
    { if: 'wind_script_restored', lines: 'Manifests on every wall. The struck line on each one is back, in plain ink.' },
    { lines: 'Manifests pinned on every wall. On every copy of the last one, the same line is struck out.' },
  ],

  // ep6_obs_f2
  ep6_relay: 'A brass relay, its dial spun to a wrong number. It crackles, saying something nobody asked.',
  ep6_speaking_tube: 'A speaking tube in the wall. Put an ear to it and the wind says half a sentence, then the other half.',
  ep6_grille: 'A grille in the floor over a dark shaft. Wind breathes up through it, steady as a sleeper.',
  ep6_feather_grille: 'A black feather caught in a grille. The wind pulls at everything else. The feather does not move.',
  ep6_locker_ledge: [
    { if: 'locker_found', lines: "The Sky Sailors' Emergency Locker, open. Somebody planned to be rescued." },
    { lines: 'A locker on a far ledge, painted with a rescue star. The wind runs past it, the wrong way.' },
  ],

  // ep6_obs_f3
  ep6_spire: 'The white stone of the spire, cold and wet. The wind runs round it and does not let go.',
  ep6_lamp_anchor: [
    { if: 'pledge_anchor', lines: 'The first signal lamp, lit. Carved under it: Before chasing the horizon, ANCHOR your people.' },
    { lines: 'A dark signal lamp on the landing. There is a line of carving under it, too worn to read in the dark.' },
  ],
  ep6_lamp_listen: [
    { if: 'pledge_listen', lines: 'The second signal lamp, lit. Carved under it: LISTEN for those the charts omit.' },
    { lines: 'A dark signal lamp on the landing. A line of carving waits under it.' },
  ],
  ep6_lamp_return: [
    { if: 'pledge_return', lines: 'The last signal lamp, lit. Carved under it: Finally RETURN for anyone the sky has abandoned.' },
    { lines: 'A dark signal lamp on the landing. A line of carving waits under it.' },
  ],
  ep6_crates: [
    { if: 'pippa_found', lines: 'Empty supply crates in a ring, a month of them. She made them last.' },
    { lines: 'A ring of empty supply crates on the platform, stacked neat.' },
  ],
  ep6_sky_keyhole: [
    { if: 'scribe_door_open', lines: 'The Sky Compass Keyhole: a door with a compass rose for its lock. The Sky Compass Key fits it.' },
    { lines: 'A door with a compass rose for a lock. It does not move.' },
  ],
  ep6_broken_causeway: 'A causeway snapped off over nothing. The wind goes through the gap like water through a weir.',

  // ep6_obs_eyrie
  ep6_scribe_desk: [
    { if: 'scribe_defeated', lines: 'The desk of stormglass, quiet. A course lies on it, half written, going home.' },
    { lines: 'A desk of stormglass at the top of the spire. Something vast is coiled over it.' },
  ],
  ep6_quills: [
    { if: 'scribe_defeated', lines: 'Quills on the deck where they fell. None of them is writing.' },
    { lines: 'Quills hanging in the air, writing by themselves, very fast.' },
  ],
  ep6_wind_script: 'The Wind Script: long banners of sail-cloth in the wind, every name of the realm a line. The wind reads them aloud.',
  ep6_feather_desk: 'The black feather on the desk. Everything else up here moves in the wind. It does not.',

  // ep6_library
  ep6_library_shelves: 'Shelves of weather logs, one for every flight there ever was. The newest are in a hand you know.',
  ep6_first_shelf: [
    { if: 'first_page_read', lines: 'One shelf, one page, under glass. Half a page. Your name is at the top of it.' },
    { lines: 'One shelf with one page on it, under a glass dome.' },
  ],
  ep6_reading_desk: 'A reading desk in the sun. A cushion on the chair has the shape of somebody who sat here for years.',
};

// ------------------------------------------------------------------------------------------------
// Books (plan 4 and 7): flight_manifests (the chart room), flight_logs (the Emergency Locker, F2), pilot_charter (F3,
// by the first lamp, and the chart room).
// ------------------------------------------------------------------------------------------------
export const EP6_BOOKS = {
  flight_manifests: {
    title: 'The Flight Manifests', where: 'ep6_zl_charts',
    pages: [
      "Every crew list of Aeris's fleet, one flight to a page, in a clerk's tidy hand.",
      'The last flight home lists eleven names. A twelfth line is struck out so hard the pen went through.',
      'In the margin, in the Captain\'s hand: Who? Then, under it, crossed out: I should know this.',
    ],
  },
  flight_logs: {
    title: 'The Sky Sailors\' Logs', where: 'ep6_obs_f2',
    pages: [
      'Departure. Fleet out on the written course. Wind fair. A beacon lit behind us, steady.',
      'Distress. Storm rising. The course runs short and straight. Captain says follow it.',
      'Rescue. If you read this, the lamp is still lit. Somebody is at the end of it. Go back.',
    ],
  },
  pilot_charter: {
    title: 'The Last Pilot Charter', where: 'ep6_obs_f3',
    pages: [
      'Before chasing the horizon, ANCHOR your people.',
      'LISTEN for those the charts omit.',
      'Finally RETURN for anyone the sky has abandoned.',
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// First-time barks (plan 5.1, once per save). first_ride: the first ride on a lane. first_post: the first stop at a
// mooring. first_vane: the first vane turned. first_duct: the first ride in a duct (F2). first_ring: the first ring lane
// (F3). vane_would_drop: a vane refused because the party stands on it. anchor_low_mp: Bram under 14 MP in a fight with a
// Rewrite (plan 14, the one-time hint).
// ------------------------------------------------------------------------------------------------
export const EP6_BARKS = {
  first_ride: [{ if: ['ep6_started', 'bram_joined'], lines: [b('I am never doing that again.')] }],
  first_post: [{ if: ['ep6_started', 'mira_joined'], lines: [m('Grab the post. The wind lets go.')] }],
  first_vane: [{ if: ['ep6_started', 'mira_joined'], lines: [m('Turn the vane, turn the wind. Then ride it.')] }],
  first_duct: [{ if: ['ep6_started', 'bram_joined'], lines: [b('Wind in the floor now. Lovely.')] }],
  first_ring: [{ if: ['ep6_started', 'mira_joined'], lines: [m('It goes round. Pick a way and hold on.')] }],
  vane_would_drop: [{ if: ['ep6_started', 'mira_joined'], lines: [m("Not while we're standing on it.")] }],
  anchor_low_mp: [{ if: ['anchor_learned', 'bram_joined'], lines: [b('Keep something back to anchor us.')] }],
};

// ------------------------------------------------------------------------------------------------
// Bestiary (plan 6.2, 6.4, 6.5): the 11 new foes. Three lore lines each: what it is, what it does, what hurts it; every
// entry names its wind side (Aloft foes ride the Gust and come round sooner; grounded ones are blown back with the party).
// ------------------------------------------------------------------------------------------------
export const EP6_BESTIARY = {
  squall_wolf: {
    name: 'Squall Wolf', where: 'The Airstair and the Windward Causeways',
    lore: [
      'A storm-grey wolf with white streaks in its fur, as if the wind had combed it. It hunts the rope stairs.',
      'It bites, and howls to sharpen the pack. Quick: slow blows miss it now and then. Grounded: the Gust blows it back.',
      'Fire and spears. Ice is the weather it was born in.',
    ],
  },
  gale_sprite: {
    name: 'Gale Sprite', where: 'The Airstair and the Observatory',
    lore: [
      'A cloud-white jelly with blue wind for eyes. It drifts where the gusts go, and giggles.',
      'It slaps, and whirls a squall over the whole party. Aloft: it rides every Gust and comes round sooner.',
      'Thunder and spears. Ice and arrows only ruffle it.',
    ],
  },
  rigger_beetle: {
    name: 'Rigger Beetle', where: 'The Windward Causeways and the Hall',
    lore: [
      'A beetle with a brass shell in rivet rows and legs the colour of old rope. It nests in the rigging.',
      'It clamps on, shells up, and rivets its plates tighter. Slow. Grounded: the Gust blows it back.',
      'Thunder and axes crack it. Swords and arrows slide off the shell.',
    ],
  },
  signal_wraith: {
    name: 'Signal Wraith', where: 'The Windward Causeways and the Hall',
    lore: [
      'A slate-robed shape with a signal lamp glowing in its hood. It sends false lights over the cloud.',
      'Static, a False Signal that hushes a caster, and a drain. Aloft: it rides every Gust.',
      'Light and fire. Ice and thunder are its own weather.',
    ],
  },
  storm_harrier: {
    name: 'Storm Harrier', where: 'The Airstair and the Observatory',
    lore: [
      'A raptor with cobalt wings and pale gold talons. It folds out of the cloud without a sound.',
      'Talons, and a Dive that hits like a dropped anchor. Hard to hit. Aloft: it rides every Gust.',
      'Arrows and ice bring it down. Thunder only lifts it higher.',
    ],
  },
  lightning_manta: {
    name: 'Lightning Manta', where: 'The Hall and the Eye of the Storm',
    lore: [
      'A great violet ray that swims through the air, yellow sparks running down its wings.',
      'Its shock stuns, and its Thunder Glide charges over the whole party. Defend. Aloft: it rides every Gust.',
      'Ice and arrows. Thunder and fire feed it.',
    ],
  },
  storm_page: {
    name: 'Storm-Marked Page', where: 'The Eye of the Storm',
    lore: [
      'A lost page caught in the storm, its ink gone blue and running. Runes crawl across it.',
      'It cuts, smudges eyes, and gathers an Overwrite on one of you. Break it. Aloft: it rides every Gust.',
      'Fire and light. Thunder and ice only write more on it.',
    ],
  },
  gale_engine: {
    name: 'The Gale Engine', where: 'The Hall of Broken Signals',
    lore: [
      'A brass engine the height of a house, fan blades in its chest, bellows on its back. It drives the Hall\'s wind.',
      'While its bellows run the Gust comes faster. It winds a Full Blast to the next Gust: Anchor through it.',
      'Thunder and axes. Grounded: bolted to the floor, the Gust blows it back. At half it calls Gale Sprites.',
    ],
  },
  scribe: {
    name: 'The Storm Scribe', where: "The Scribe's Eyrie",
    lore: [
      "The Keepers' Scribe of Winds: a winged beast of cloud and ink, made to write the isles' courses from the Wind Script.",
      'It rewrites the course to the next Gust, so you go last. Anchor before the Gust, and the course holds. Aloft.',
      'Spears and arrows at first. Behind its ward it is weak to fire and light, and it hastes itself.',
    ],
  },
  false_beacon: {
    name: 'The False Beacon', where: "The Scribe's Eyrie",
    lore: [
      'A lamp on a broken mast, burning a light that points nowhere. The Scribe hangs it in its ward.',
      'It draws every single blow meant for the Scribe onto itself. Aloft: it rides every Gust.',
      'Fire and light. While it stands, the Storm Script Ward holds.',
    ],
  },
  broken_compass: {
    name: 'The Broken Compass', where: "The Scribe's Eyrie",
    lore: [
      'A brass compass rose with a cracked needle that never stops. The other half of the ward.',
      'It spins whoever acts next back down the timeline, and hushes the one who can anchor. Grounded.',
      'Axes and thunder. While it stands, the Storm Script Ward holds.',
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// Battle lines (for E6-battle's messages and E6-scene-ui's help window) and the boss cards with their arc lines
// (RESPONSIBILITY_ARC 3.6: each boss card names what the town avoided). {name} is the named party member.
// ------------------------------------------------------------------------------------------------
export const EP6_BOSS_CARDS = {
  gale_engine: { name: 'THE GALE ENGINE', sub: 'Keeper of the Broken Signals' },
  scribe: { name: 'THE STORM SCRIBE', sub: 'Writer of Every Course' },
};
export const EP6_ARC_LINES = {
  gale_engine: 'It kept the signals turning. Nobody asked what they said.',
  scribe: 'It wrote them the shortest way home. They took it.',
};
export const EP6_BATTLE_TEXT = {
  gust: 'The wind gusts.',
  gust_soon: 'The wind is rising.',
  aloft_ride: '{name} rides the gust.',
  blown_back: '{name} is blown back.',
  braced: '{name} braces.',
  anchored: 'The party holds. The wind carries them on.',
  rewrite_read: 'The Scribe rewrites the course. When the wind gusts, you go last.',
  can_anchor: 'Bram can anchor.',
  rewrite_broken: 'The course holds. The Scribe is thrown back.',
  rewrite_land: 'The course is written. You go last.',
  blast_wind: 'The Engine winds the bellows...',
  blast_broken: 'The line holds. The Engine is thrown back.',
  bellows_on: 'The bellows run. The wind comes faster.',
  bellows_off: 'The bellows stall.',
  answer_fails: 'A course is not a decree. Nothing to answer.',
  turn_sky_fails: 'The wind is not the sky.',
  no_sky: 'No sky to turn.',
  ward_holds: 'The Storm Script Ward holds.',
  ward_tears: 'The ward tears. Behind the Scribe, a chart in true ink.',
  thunderhead: "Lightning gathers in the Scribe's wings...",
  anchor_help: 'Hold through the gust. Breaks a rewrite.',
  anchor_learn: 'Bram learned Anchor. The party holds through the next gust, and the wind carries them on.',
  low_mp: 'Keep something back to anchor us.',
};

// ------------------------------------------------------------------------------------------------
// Credits and cards. CREDITS_EP6 plays over `zephyr` after ep6_complete (hooks.js CREDITS_HANDOFF[6]); END_CARD_EP6
// follows it. END_CARD_EP5_LIVE replaces the Episode 5 end card while EP6_LIVE. END_TITLE_EP6 and EPISODE7_CARD close
// ep6_ending (placeholder wording, Scott's or Stephen's to change: EPISODE6.md section 10.12).
// ------------------------------------------------------------------------------------------------
export const END_CARD_EP6 = { text: 'To be continued', sub: 'Episode 7 is not playable yet.', frames: 300, backdrop: 'ep6_dialog_keyart' };
export const END_CARD_EP5_LIVE = { ...END_CARD_EP5, sub: 'Episode 6 begins in the morning.' };
export const END_TITLE_EP6 = { text: 'End of Episode 6', sub: 'Words on the Wind' };
export const EPISODE7_CARD = { text: 'Episode 7: The Vanishing World', sub: 'The other half of the page lies north.' };

export const CREDITS_EP6 = [
  { heading: 'LEXICON QUEST', lines: ['Episode 6: The Skybound Isles'] },
  { heading: 'Created by', lines: ['Scott Ball'] },
  { heading: 'Story, World and Direction', lines: ['Scott Ball'] },
  { heading: 'Music', lines: ['Composed for Lexicon Quest', 'with Suno, and in code'] },
  { heading: 'The Party', lines: ['{hero}, who read the first page', 'Mira, who read the names that slipped', 'Bram, who held on'] },
  { heading: 'Zephyr Landing', lines: ['Captain Aeris of the Kestrel', 'Liora the Wind Navigator', 'Pippa Voss, who kept the light'] },
  { heading: 'Zephyr Landing', lines: ['Bennet the Rigging Master', 'Suri the Sky Cartographer', 'Ilex the Windwright'] },
  { heading: 'On the Docks', lines: ['Nova the Deckhand', 'Piri the Messenger', 'Thea the Cloud Gardener'] },
  { heading: 'The Storm Observatory', lines: ['The Gale Engine', 'The False Beacon and the Broken Compass', 'The Storm Scribe, who wrote every course'] },
  { heading: 'And', lines: ['Vex Quill, who booked the fourth seat'] },
  { heading: 'Saffron Haven and the Valley', lines: ['Sel, who stayed', 'Yara, who sails the stacks', 'Holt, who read the letter four times'] },
  { heading: '', lines: ['Courses can be rewritten.', 'A hand can hold.'] },
  { heading: 'Thank you for playing', lines: ['North, the White Road is waiting.'] },
];

export function register() {
  for (const [id, v] of Object.entries(EP6_BANNERS)) if (!(id in BANNERS)) BANNERS[id] = v;
  for (const [id, v] of Object.entries(EP6_BOOKS)) if (!(id in BOOKS)) BOOKS[id] = v;
  for (const [id, v] of Object.entries(EP6_BARKS)) if (!(id in BARKS)) BARKS[id] = v;
  for (const [id, v] of Object.entries(EP6_BESTIARY)) if (!(id in BESTIARY)) BESTIARY[id] = v;
  STORY.registerStory({ scenes: {}, lines: EP6_LINES, conditions: {} });
}

export default register;
