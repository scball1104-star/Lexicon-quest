// Episode 7, "The Vanishing World": banners, inspect lines, the stone names, books, barks, bestiary, the battle and boss
// lines, the credits and the end cards. register() assigns them into BANNERS, BOOKS, BARKS, BESTIARY and (through
// registerStory) the shared LINES table. Idempotent. Pure data. Part of the lazy `ep7` pack.
//
// Box rules (qa/content/ep7_*.test.mjs): at most 3 lines of 42 characters per box with an 8-letter hero name, ASCII, no
// em dashes, {hero} for the player's name. Until `nox_named` nothing here says "Nox" and until `marten_named` nothing says
// "Marten". The chart, the carving, the tally, the tag, the list, the page and the letter are pictures and plain lines,
// never something to work out; the stones' names are flavor (EPISODE7 choice 13), never an answer to anything.
//
// Not registered here (E7-scene-ui wires them into the battle scene's BOSS_CARD and the help window, as Episode 6's
// scene.js did): EP7_BOSS_CARDS, EP7_ARC_LINES and EP7_BATTLE_TEXT. E7-battle's messages may read EP7_BATTLE_TEXT too.

import { BANNERS, BOOKS, BARKS, BESTIARY } from '../text.js';
import * as STORY from '../../game/story.js';
import { END_CARD_EP6 } from '../ep6/text.js';

const m = (text) => ({ who: 'mira', text });
const b = (text) => ({ who: 'bram', text });

// ------------------------------------------------------------------------------------------------
// Banners (plan 2.1): 10, Palehaven's with a second state. The Stillheart has none: its scenes open on the boss card and
// the night roof, and a banner over either would talk over the picture.
// ------------------------------------------------------------------------------------------------
export const EP7_BANNERS = {
  ep7_white_road: { title: 'The White Road', sub: 'Up to Palehaven' },
  ep7_waystation: { title: "The Courier's Waystation" },
  ep7_palehaven: { title: 'Palehaven', sub: 'The Unlit Hearth',
    states: [{ if: 'doors_reopened', title: 'Palehaven', sub: 'The Returned Names' }] },
  ep7_ph_inn: { title: 'The Thawlight Lodge' },
  ep7_ph_shop: { title: 'Northwind Provisions' },
  ep7_ph_armory: { title: 'The Glass-Ice Armory' },
  ep7_ph_watch: { title: "The Keeper's Watch" },
  ep7_vault_f1: { title: 'The Frostbound Vault', sub: 'I. The Vanishing Steps' },
  ep7_vault_f2: { title: 'The Frostbound Vault', sub: 'II. The Hall of Borrowed Light' },
  ep7_vault_f3: { title: 'The Frostbound Vault', sub: 'III. The Stillheart Sanctum' },
};

// ------------------------------------------------------------------------------------------------
// The name stones (plan 4.11): one text key per stone, read once in the read's float line. Map event ids are `ns_<name>`
// (the `namestone` event's `name` field is the text key). LEGACY Snowrest names on the road (Asta the Scout, Bo the
// Lampmaker, Grandmother Nyx), new northern names elsewhere. Plan 4.7's `ns_hob` and 4.8's `ns_ansel` are `ns_hakon` and
// `ns_anders` here: Hob is Willowmere's innkeeper and Ansel one of Episode 1's lost pilgrims (EPISODE7 section 9).
// ------------------------------------------------------------------------------------------------
const her = (name, where = 'road') => `${name}. The ${where} remembers her.`;
const him = (name, where = 'road') => `${name}. The ${where} remembers him.`;
export const EP7_STONES = {
  // ep7_white_road (Gap A, Gap B, Ilka's ledge, Gap C)
  ns_asta: { key: 'stone_asta', text: her('ASTA') },
  ns_bo: { key: 'stone_bo', text: him('BO') },
  ns_nyx: { key: 'stone_nyx', text: her('NYX') },
  ns_ilka: { key: 'stone_ilka', text: her('ILKA') },
  ns_senna: { key: 'stone_senna', text: her('SENNA') },
  // ep7_vault_f1 (By Reach, Keep the Near One, the side gallery)
  ns_arvo: { key: 'stone_arvo', text: him('ARVO', 'Vault') },
  ns_liesl: { key: 'stone_liesl', text: her('LIESL', 'Vault') },
  ns_sigrid: { key: 'stone_sigrid', text: her('SIGRID', 'Vault') },
  ns_vidar: { key: 'stone_vidar', text: him('VIDAR', 'Vault') },
  ns_oskar: { key: 'stone_oskar', text: him('OSKAR', 'Vault') },
  // ep7_vault_f2 (the Grip, the Bell Bay, the side galleries)
  ns_dagny: { key: 'stone_dagny', text: her('DAGNY', 'Vault') },
  ns_hakon: { key: 'stone_hakon', text: him('HAKON', 'Vault') },
  ns_runa: { key: 'stone_runa', text: her('RUNA', 'Vault') },
  ns_tuva: { key: 'stone_tuva', text: her('TUVA', 'Vault') },
  ns_kell: { key: 'stone_kell', text: him('KELL', 'Vault') },
  // ep7_vault_f3 (Shelter, Remember, Return, the hidden stone in Keeper ink)
  ns_ylva: { key: 'stone_ylva', text: her('YLVA', 'Vault') },
  ns_greta: { key: 'stone_greta', text: her('GRETA', 'Vault') },
  ns_lars: { key: 'stone_lars', text: him('LARS', 'Vault') },
  ns_anders: { key: 'stone_anders', text: him('ANDERS', 'Vault') },
  ns_ida: { key: 'stone_ida', text: her('IDA', 'Vault') },
  ns_solveig: { key: 'stone_solveig', text: her('SOLVEIG', 'Vault') },
};

// ------------------------------------------------------------------------------------------------
// Inspect lines (plan 4 and EPISODE7 section 7; signs and objects point at these ids). A string, a list of boxes, or a
// conditional list [{ if, ifNot, lines }] whose last entry is the fallback.
// ------------------------------------------------------------------------------------------------
export const EP7_LINES = {
  ...Object.fromEntries(Object.values(EP7_STONES).map((st) => [st.key, st.text])),

  // ep6_zl_charts (the ep7 patch): the north window and the table
  ep7_north_window: [
    { if: 'ep7_started', lines: 'The north window. The frost has gone from the glass, as if it had only come to say one thing.' },
    { lines: 'The north window, frosted on the inside. None of the others are.' },
  ],

  // ep7_white_road
  ep7_frozen_lake: 'A frozen lake in a ring of black pines. The ice is clear enough to see stones on the bottom.',
  ep7_kestrel_lake: "The Kestrel, sitting on the ice with her engines ticking as they cool. Aeris keeps one eye on the chart.",
  ep7_snowpine: 'A black pine, heavy with snow. Something small has left tracks round the trunk and gone.',
  ep7_travelers_wall: [
    { if: 'vex_name_whole', lines: ["The Traveler's Wall. Hundreds of names, and more of them whole than pale.",
      'Near the bottom, fresh and deep: VEX QUILL.'] },
    { if: 'vex_carved', lines: ["The Traveler's Wall. Near the bottom, newly cut: VEX QUILL. Half of the letters are white."] },
    { lines: "A wall of clear ice by the road, cut with hundreds of names. Most are pale. Some are hardly there." },
  ],
  ep7_fade: 'The road just stops. Past the edge there is no snow, no ground, nothing: white, like paper with nothing on it.',
  ep7_ghost_trail: 'Faint footprints on the white, going across. Somebody walked here once. The road almost remembers.',
  ep7_stone_dim: 'A name stone with a cold lamp on top. A name is cut in its face.',
  ep7_stone_lit: 'A name stone, its lamp lit. The road it holds runs out across the white.',
  ep7_sol_twine: "Sol's twine, tied stake to stake across the snow. Where the road went white, the twine still goes on.",
  ep7_icegate: [
    { if: 'saw_palehaven', lines: 'The South Icegate, an arch of blue ice at the top of the White Road. Palehaven is through it.' },
    { lines: 'An arch of blue ice across the road, the South Icegate. Something beyond it glows.' },
  ],
  ep7_palehaven_far: 'Palehaven, from the Icegate: ramparts, a square, crystals glowing on poles. And the cathedral, flickering.',
  ep7_strongbox: "A courier's strongbox, chained to the back of the hut. The lock has rusted open.",

  // ep7_waystation
  ep7_tally: [
    { if: 'saw_sevens', lines: "The courier's tally on the doorframe. Every seventh stroke crossed. At the top, a white patch." },
    { lines: 'Knife marks on the doorframe, in rows.' },
  ],
  ep7_post_box: 'A post box with a brass slot, nailed by the door. Empty. Somebody checks it anyway: the dust is wiped off.',
  ep7_stove: [
    { if: 'saw_sevens', lines: "The Waystation stove, lit. Sit a while, and the road will remember you stopped here." },
    { lines: 'A cold iron stove, with dry wood stacked by it.' },
  ],
  ep7_bench: 'A plank bench, worn pale where people have sat on it to take off their boots.',
  ep7_woodpile: 'A woodpile against the wall, split and stacked. It would move, with a good shove.',

  // ep7_palehaven
  ep7_vanishing_mark: [
    { if: 'doors_reopened', lines: 'The Vanishing Mark: a band of carved runes round the square stone. The hollow in it has filled.' },
    { lines: ['The Vanishing Mark: a band of carved runes.', "A hollow space between them grows whenever a person's name is forgotten."] },
  ],
  ep7_iced_door: [
    { if: 'doors_reopened', lines: 'An open door, wet from the thaw. Over it, a name on the lintel, freshly clear.' },
    { lines: 'A door iced shut from the outside. No name over it.' },
  ],
  ep7_hearth_cold: [
    { if: 'hearth_lit', lines: 'The Hearth of Returning Names, burning. The snow round it has gone to water.' },
    { if: 'doors_reopened', lines: 'The Hearth of Returning Names, alight. It caught by itself the morning the doors opened.' },
    { lines: 'A wide hearth of black stone in the middle of the square. Cold ash. Nobody has lit it in years.' },
  ],
  ep7_beacon_north: 'The Northward Beacon. This beacon stood before snow had a name. Each returning traveler adds one shard of glass.',
  ep7_keeper_notice: [
    { if: 'doors_reopened', lines: 'The notice is gone from the door of the Watch. There is a nail hole, and the door is open.' },
    { lines: 'A notice on the door of the Watch, in a warm, careful hand: THE VAULT IS SHUT. IT STAYS SHUT.' },
  ],
  ep7_vault_gate: [
    { if: 'vault_open', lines: 'The north gate, unlocked. Beyond it a walk through the pines, and the cathedral.' },
    { lines: 'The north gate, locked with a heavy lock. Through the bars, pines, and a cathedral of ice.' },
  ],
  ep7_cathedral_far: 'The cathedral, through the pines. For a breath it is not there. Then it is.',
  ep7_aurora_crystal: 'An aurora crystal on a pole. It glows green and violet, and it is warm to the hand.',
  sign_ep7_inn: 'THE THAWLIGHT LODGE. BEDROLLS. A STOVE THAT STAYS LIT.',
  sign_ep7_shop: 'NORTHWIND PROVISIONS. TEAS, SALVES, WARM THINGS.',
  sign_ep7_armory: 'THE GLASS-ICE ARMORY. GLASS THAT HOLDS.',
  sign_ep7_watch: [
    { if: 'nox_named', lines: "THE KEEPER'S WATCH. Under it, newly painted: NOX." },
    { lines: "THE KEEPER'S WATCH. Under it, a name board, scraped bare." },
  ],

  // ep7_ph_watch
  ep7_letters_face: [
    { if: 'doors_reopened', lines: 'Letters on every surface, all face up now. Some are very old. All of them are answered.' },
    { lines: 'Letters on every surface of the room, every one turned face down.' },
  ],
  ep7_empty_frame: [
    { if: 'nox_named', lines: 'A frame on the wall, still empty. Under it, on a card in the warm hand: back soon.' },
    { lines: 'An empty frame on the wall. Not blank: empty, right through to the wall behind.' },
  ],
  ep7_cold_lamp: [
    { if: 'doors_reopened', lines: 'The Watch lamp, lit. The shutter beside it is open on the morning.' },
    { lines: 'A cold lamp on the table, by a shuttered window.' },
  ],
  ep7_watch_oath: 'Cut over the inner door: A NAME IS A PROMISE. A KEEPER ERASES NO SOUL.',
  ep7_watch_bell: "A small iron bell by the stove of the Watch. Ring it, and Palehaven will keep a place for you by the fire.",
  ep7_watch_cots: 'Three cots by the stove, blankets folded at the foot. Somebody put them there for you.',

  // ep7_vault_f1
  ep7_frost_brick: 'Frost brick, laid very straight. Every brick has a name pressed into it, too faint to read.',
  ep7_ice_glass: 'A landing of ice glass. Far below it, white, and nothing else.',
  ep7_thawlight_basin: 'The Thawlight Recovery Basin: warm water in a ring of stone, steaming in the cold.',
  ep7_frozen_gate: [
    { if: 'keeper_memory_1', lines: 'A little town gate, frozen open. A lamp hook on the post, empty.' },
    { lines: 'A little town gate, frozen solid in the ice, standing open.' },
  ],
  ep7_dash_ice: 'A crate frozen into a block of ice, cracked down one side. A hard enough run at it would split it.',
  ep7_winterwatch_cache: 'The Winterwatch Provision Cache: an iron chest with a Keeper\'s seal, packed for a long winter.',

  // ep7_vault_f2
  ep7_borrowed_lamp: 'A lamp bracket over a name stone. It burns only while you hold the name.',
  ep7_frost_door: 'A door of solid ice. Something is frozen in it, a shape you almost know. It holds while a name is held.',
  ep7_letter_wall: [
    { if: 'keeper_memory_2', lines: "A wall of letter niches. One niche holds a courier's badge, frozen in: a bell and a letter." },
    { lines: 'A wall of letter niches, every one frozen shut.' },
  ],
  ep7_listening_bell: [
    { if: 'stillheart_restored', lines: 'The Listening Bell, swinging free in its bay, the ice on the floor round it.' },
    { if: 'bell_found', lines: "A bronze bell frozen in clear ice, its clapper mid-swing. Mara's stamp on the waist." },
    { lines: 'A bronze bell the size of a cart, frozen solid in a block of clear ice.' },
  ],
  ep7_mara_tag: 'A tag on a cord, in a strong square hand: Good hands. Mara of the First Bell.',
  ep7_reliquary_door: [
    { if: 'reliquary_open', lines: 'The Reliquary stands open. Keepers plan for bad winters.' },
    { lines: 'A door of clear ice in the side gallery. Behind it, a box with three slots in its lid.' },
  ],

  // ep7_vault_f3
  ep7_charter_shelter: 'Cut over the stair: SHELTER the living.',
  ep7_charter_remember: 'Cut over the stair: REMEMBER the absent.',
  ep7_charter_return: 'Cut over the stair: RETURN when a lost voice calls.',
  ep7_ice_pillar: 'A pillar of ice as tall as the nave. Names move inside it, slowly, like fish under a frozen pond.',
  ep7_keeper_ink: 'A stone cut in the Keepers\' hidden ink, there only in the lantern\'s light.',
  ep7_round_door: [
    { if: 'stillheart_open', lines: 'The round door, open. There is the print of a bare hand on the ice beside it.' },
    { lines: 'A high round door of ice. No keyhole. No handle. It does not move.' },
  ],
  ep7_inner_grate: [
    { if: 'phantom_defeated', lines: 'The Stillheart Crystal Keyhole, the key still in it. The grate stands open.' },
    { lines: 'An inner grate of iron and ice: the Stillheart Crystal Keyhole. The Stillheart Crystal Key fits it.' },
  ],

  // ep7_stillheart
  ep7_stillheart_heart: [
    { if: 'stillheart_restored', lines: 'The Stillheart, thawed: every name of the realm, running clear and bright.' },
    { lines: 'A heart of clear ice as tall as a door. Names move inside it, and do not get anywhere.' },
  ],
  ep7_seventh_floor: 'Where the Phantom knelt, the outline of a list in the ice: cheap paper, the cold hand, the empty-book seal.',
  ep7_page_block: [
    { if: 'page_whole', lines: 'A block of ice, opened. Whatever was frozen in it has gone home.' },
    { lines: 'A block of clear ice beside the heart, with something flat frozen inside.' },
  ],
  ep7_broken_roof: 'The broken roof of the nave, and the aurora through it, moving slowly.',
  ep7_star_stair: 'A stair of written light going up into the sky. Every step is a line of handwriting, too bright to read.',

  // Hollowmere (court_f2, the Court of Mirrors): the empty portrait after nox_named (EPISODE7 open choice 5; the pack patch that
  // points the frame at this line is listed in STAGING_EP7 section 6)
  ep7_court_portrait: [
    { if: 'nox_named', lines: 'A KEEPER IN THE COURT. The frame has a face in it again: an old woman with a lamp, looking north.' },
    { lines: 'A KEEPER IN THE COURT. The frame is empty. Not blank: empty, right through to the wall behind it.' },
  ],
};

// ------------------------------------------------------------------------------------------------
// Books (plan 4 and 7): keeper_book (the Keeper Emergency Reliquary, F2), missing_streets (Torr's, the square),
// keeper_charter (F3, by the round door, and the Watch).
// ------------------------------------------------------------------------------------------------
export const EP7_BOOKS = {
  keeper_book: {
    title: 'The Keeper Book', where: 'ep7_vault_f2',
    pages: [
      'Open the Door. When the snow comes, the gate stays open and the lamp stays lit. Somebody is always on the road.',
      'Share the Flame. A hearth is not yours. Whoever comes in from the cold sits nearest it.',
      'Call the Lost. If a name goes quiet, say it. Say it again. Names come back to the ones who call them.',
    ],
  },
  missing_streets: {
    title: 'The Missing Streets', where: 'ep7_palehaven',
    pages: [
      "Torr's book: every street of Palehaven in his small blue hand, the doors on each, the names over the doors.",
      'Half the names are crossed out, then written in again over the top, as if he would not let them go.',
      'Our oldest page names the White Phantom, then stops mid-sentence.',
    ],
  },
  keeper_charter: {
    title: 'The Keeper Charter', where: 'ep7_vault_f3',
    pages: [
      'The true keeper must SHELTER the living,',
      'REMEMBER the absent,',
      'and RETURN when a lost voice calls.',
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// First-time barks (plan 5.1, once per save). first_held: the first stone read. first_letgo: the first path that lets go
// (the third stone on the road). first_reread: the first re-read (F1 C). first_grip: the first frost door held by a name
// (F2 B). would_fade: a read refused because the party stands on what would fade. call_low_mp: the hero under 12 MP in a
// fight with a Farewell or a Borrowed Light (the one-time hint, EP7_BATTLE_TEXT.low_mp).
// ------------------------------------------------------------------------------------------------
export const EP7_BARKS = {
  first_held: [{ if: ['ep7_started', 'mira_joined'], lines: [m('ASTA. And there\'s the road she walked.')] }],
  first_letgo: [{ if: ['ep7_started', 'mira_joined'], lines: [m("Two at a time. The road can't remember more than we can.")] }],
  first_reread: [{ if: ['ep7_started', 'mira_joined'], lines: [m("Say it again and it's the newest. The old one goes first.")] }],
  first_grip: [{ if: ['ep7_started', 'bram_joined'], lines: [b("That door's holding on to somebody.")] }],
  would_fade: [{ if: ['ep7_started', 'mira_joined'], lines: [m("Not while we're standing on it.")] }],
  call_low_mp: [{ if: ['call_learned', 'mira_joined'], lines: [m('Keep something back to call us.')] }],
};

// ------------------------------------------------------------------------------------------------
// Bestiary (plan 6.2, 6.4, 6.5): the 11 new foes. Three lore lines each: what it is, what it does, what hurts it; every
// entry names its cold moves (each adds Rime: at three a member is Frozen; Defend shakes it off).
// ------------------------------------------------------------------------------------------------
export const EP7_BESTIARY = {
  rime_wolf: {
    name: 'Rime Wolf', where: 'The White Road and the Vanishing Steps',
    lore: [
      'A white wolf with blue frost round its jaws. It runs the drifts by the road and does not leave tracks.',
      'It bites, and its Frost Fang frosts the name of whoever it catches. Quick: slow blows miss it now and then.',
      'Fire and spears. Ice is what it is made of.',
    ],
  },
  snow_wisp: {
    name: 'Snow Wisp', where: 'The White Road and the Vault',
    lore: [
      'A white jelly with snow swirling inside it. It drifts on the wind and hums to itself.',
      'It slaps, and its Flurry frosts every name in the party at once. Defend, or warm up with Ember Tea.',
      'Fire and light. Ice and arrows only ruffle it.',
    ],
  },
  hush_owl: {
    name: 'Hush Owl', where: 'The White Road and the Vault',
    lore: [
      'A white and grey snow owl with gold eyes. It flies without a sound.',
      'Talons, a Hush that steals a voice, and a Dive that hits hard. Hard to hit. It carries no cold of its own.',
      'Arrows and fire bring it down. Ice is its home weather.',
    ],
  },
  crystal_crawler: {
    name: 'Crystal Crawler', where: 'The Vanishing Steps and the Hall',
    lore: [
      'A beetle with a clear crystal shell and aurora-green legs. It nests in the cracks of the frost brick.',
      'It bites, glazes its own shell, and its Shard Spray frosts the whole party. Slow.',
      'Fire and axes crack it. Swords and arrows slide off.',
    ],
  },
  frostbound_revenant: {
    name: 'Frostbound Revenant', where: 'The Vault',
    lore: [
      'An icy, skeletal shape in a ragged hood. It walks the Vault looking for someone it cannot name.',
      'Its Chill Touch frosts a name, its Grave Cold blinds, and it drains warmth to mend itself.',
      'Fire and light. Ice and thunder are its own weather.',
    ],
  },
  ice_knight: {
    name: 'Hollow Ice Knight', where: 'The Hall and the Sanctum',
    lore: [
      'A suit of armor of clear ice and old steel, empty inside. It still stands its watch.',
      'It cuts, and it winds a Glacier Cleave that frosts a name twice over. Defend, or Break it first.',
      'Fire and axes. Ice and swords do little.',
    ],
  },
  rimed_page: {
    name: 'Rime-Written Page', where: 'The Stillheart Sanctum',
    lore: [
      'A lost page frozen stiff, its writing gone blue and cold. It flaps on a wind nobody else feels.',
      'It cuts, its Cold Ink frosts every name in the party, and it gathers a Final Line on one of you. Break it.',
      'Fire and light. Thunder and ice only write more on it.',
    ],
  },
  pale_lantern: {
    name: 'The Pale Lantern', where: 'The Hall of Borrowed Light',
    lore: [
      'A tall hooded shape with a great lantern for a head: made to light the Vault for readers, it keeps the light now.',
      'Pale Flame and Lamplight Chill frost names. It Borrows the light of one of you: Call them back before its turn.',
      'Fire and light. Never the one who was kept. At half it opens its hood and Snow Wisps drift out.',
    ],
  },
  white_phantom: {
    name: 'The White Phantom', where: 'The Stillheart',
    lore: [
      "The Keepers' Warden of the Stillheart: a construct of ice with an antler crown, made to keep the North's names safe.",
      'Whiteout Breath and Icicle Lance frost names; it says Farewell to one of you. Call them before it lands.',
      'Fire cracks its outer frost. Behind its ward it thaws: then fire, spears and light, and a Stillheart Blizzard.',
    ],
  },
  closed_gate: {
    name: 'The Closed Gate', where: 'The Stillheart',
    lore: [
      'An iron gate on a post, frozen shut. The Phantom raises it out of an old grief: the gate that was never opened.',
      'Every third turn it Shuts, and the one who calls cannot call. It carries no cold of its own.',
      'Axes and fire. While it stands, the Frozen Ward holds.',
    ],
  },
  lost_letter: {
    name: 'The Lost Letter', where: 'The Stillheart',
    lore: [
      'A folded letter in a shell of ice, its seal broken. The other half of the ward.',
      'It Mends the Phantom with cold ink, and its Cold Ink frosts a name.',
      'Spears and fire. Ice only seals it. While it stands, the Frozen Ward holds.',
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// Battle lines (for E7-battle's messages and E7-scene-ui's help window) and the boss cards with their arc lines
// (RESPONSIBILITY_ARC 3.6: each boss card names what the town avoided). {name} is the named party member; the `_by`
// tables hold the bible's per-member wording (the hero is player-named and has no pronoun on screen).
// ------------------------------------------------------------------------------------------------
export const EP7_BOSS_CARDS = {
  pale_lantern: { name: 'THE PALE LANTERN', sub: 'Keeper of Borrowed Light' },
  white_phantom: { name: 'THE WHITE PHANTOM', sub: 'Keeper of the Stillheart' },
};
export const EP7_ARC_LINES = {
  pale_lantern: 'It lit the hall with names it would not give back.',
  white_phantom: 'It kept them safe the only way it knew. It kept them still.',
};
export const EP7_BATTLE_TEXT = {
  // Rime (plan 6.3)
  rime: "Frost creeps over {name}'s name.",
  frozen: "{name}'s name frosts over. {name} misses a turn.",
  frozen_by: {
    hero: "{hero}'s name frosts over. A turn is lost.",
    mira: "Mira's name frosts over. She misses her turn.",
    bram: "Bram's name frosts over. He misses his turn.",
  },
  shake_off: '{name} shakes off the cold.',
  warm: '{name} is warm.',
  tea: 'Ember Tea. Everyone sheds a little of the cold.',
  // the Defend row's help in a Rime battle (from day one: PLAYTEST_REVIEW_8 item 5)
  defend_help: 'Shake off the cold.',
  // Call (plan 6.3)
  call_help: "Say an ally's name. Breaks a farewell.",
  call_learn: "{hero} learned Call. Say an ally's name: the cold lets go of them, and they come back sooner.",
  call_cast: '{hero} calls {name}.',
  no_cold: 'No cold to call through.',
  answer_fails: 'A farewell is not a decree.',
  low_mp: 'Keep something back to call us.',
  // the Farewell (plan 6.5) and Borrowed Light (plan 6.4)
  farewell_read: 'The Phantom turns to {name}. It is saying goodbye.',
  can_call: '{hero} can call {name}.',
  can_call_by: { mira: '{hero} can call her.', bram: '{hero} can call him.' },
  farewell_broken: '{name} hears a name. The farewell does not hold.',
  farewell_broken_by: { mira: 'Mira hears her name. The farewell does not hold.', bram: 'Bram hears his name. The farewell does not hold.' },
  farewell_land: 'The farewell lands. {name} goes still.',
  stilled: '{name} is Stilled.',
  stilled_end: '{name} comes back.',
  stilled_call: '{name} hears {hero} and comes back.',
  no_farewell_hero: 'YOU I CANNOT SAY GOODBYE TO. YOU WERE KEPT.',
  borrow_read: "The Lantern borrows {name}'s light.",
  borrow_broken: 'The light comes back to {name}. The Lantern is thrown back.',
  borrow_land: "The Lantern keeps {name}'s light. {name} freezes.",
  borrow_heal: 'The Lantern burns brighter.',
  no_borrow_hero: 'It cannot hold a kept light.',
  thrown_back: 'The {foe} is thrown back.',
  // the Lantern's phase (plan 6.4)
  lantern_hood: 'The Lantern opens its hood. Snow Wisps drift out.',
  // the Phantom's phases (plan 6.5)
  ward_rises: 'The cloak spreads like a door. The Frozen Ward rises.',
  ward_holds: 'The Frozen Ward holds.',
  shut: 'The gate shuts. {hero} cannot call.',
  mend: 'The Lost Letter mends the Phantom with cold ink.',
  ward_thaws: "The ward thaws. Fire cracks the Phantom's frost.",
  blizzard: "The cold gathers in the Phantom's cloak...",
  blizzard_land: 'The Stillheart Blizzard.',
};

// ------------------------------------------------------------------------------------------------
// Credits and cards. CREDITS_EP7 plays over `palehaven` after ep7_complete (hooks.js CREDITS_HANDOFF[7]); END_CARD_EP7
// follows it. END_CARD_EP6_LIVE replaces the Episode 6 end card while EP7_LIVE. END_TITLE_EP7 and EPISODE8_CARD close
// ep7_ending (EPISODE7 choice 16; the Episode 8 title is EPISODE8 ask 1, pending Stephen).
// ------------------------------------------------------------------------------------------------
export const END_CARD_EP7 = { text: 'To be continued', sub: 'Episode 8 is not playable yet.', frames: 300, backdrop: 'ep7_dialog_keyart' };
export const END_CARD_EP6_LIVE = { ...END_CARD_EP6, sub: 'Episode 7 begins in the morning.' };
export const END_TITLE_EP7 = { text: 'End of Episode 7', sub: 'The Vanishing World' };
export const EPISODE8_CARD = { text: 'Episode 8: The Last Word', sub: 'The lists were written here.' };

export const CREDITS_EP7 = [
  { heading: 'LEXICON QUEST', lines: ['Episode 7: The Vanishing World'] },
  { heading: 'Created by', lines: ['Scott Ball'] },
  { heading: 'Story, World and Direction', lines: ['Scott Ball'] },
  { heading: 'Music', lines: ['Composed for Lexicon Quest', 'with Suno, and in code'] },
  { heading: 'The Party', lines: ['{hero}, who called them back', 'Mira, who read the name aloud', 'Bram, who read the date'] },
  { heading: 'Palehaven', lines: ['Nox, the Keeper of the Hollow North', 'Bryn the Frost Keeper', 'Eira the Glassblower'] },
  { heading: 'Palehaven', lines: ['Mirael the Winter Physician', 'Torr the Northern Scribe', 'Maera the Herbalist'] },
  { heading: 'The White Road', lines: ['Sol the Trail Scout', 'Captain Aeris of the Kestrel'] },
  { heading: 'The Frostbound Vault', lines: ['The Pale Lantern', 'The Closed Gate and the Lost Letter', 'The White Phantom, who kept them still'] },
  { heading: 'In Memory', lines: ['Marten, courier of Willowmere', 'Mara of the First Bell'] },
  { heading: 'And', lines: ['Vex Quill, whose name came back whole'] },
  { heading: 'The Valley and Beyond', lines: ['Tess, who will say it at every door', 'Hazel, who knew him', 'Holt, who read the letter twice'] },
  { heading: '', lines: ['A frozen name is not a lost one.', 'Call, then open the door.'] },
  { heading: 'Thank you for playing', lines: ['Up the stair, the lists were written.'] },
];

export function register() {
  for (const [id, v] of Object.entries(EP7_BANNERS)) if (!(id in BANNERS)) BANNERS[id] = v;
  for (const [id, v] of Object.entries(EP7_BOOKS)) if (!(id in BOOKS)) BOOKS[id] = v;
  for (const [id, v] of Object.entries(EP7_BARKS)) if (!(id in BARKS)) BARKS[id] = v;
  for (const [id, v] of Object.entries(EP7_BESTIARY)) if (!(id in BESTIARY)) BESTIARY[id] = v;
  STORY.registerStory({ scenes: {}, lines: EP7_LINES, conditions: {} });
}

export default register;
