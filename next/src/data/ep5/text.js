// Episode 5, "The Last Prophecy": banners, inspect lines, books, barks, bestiary, the battle and boss lines, the credits
// and the end cards. register() assigns them into BANNERS, BOOKS, BARKS, BESTIARY and (through registerStory) the shared
// LINES table. Idempotent. Pure data. Part of the lazy `ep5` pack.
//
// Box rules (qa/content/ep5_*.test.mjs): at most 3 lines of 42 characters per box with an 8-letter hero name, ASCII, no
// em dashes, {hero} for the player's name. Until `sel_memory_3` nothing here says Ishra's name. The waystone, the chart and
// the pages are pictures and plain lines, never something to work out.
//
// Not registered here (E5-scene-ui wires them into src/scenes/battle.js BOSS_CARD and the help window, as Episode 4's
// scene.js did): EP5_BOSS_CARDS, EP5_ARC_LINES and EP5_BATTLE_TEXT. E5-battle's messages may read EP5_BATTLE_TEXT too.

import { BANNERS, BOOKS, BARKS, BESTIARY } from '../text.js';
import * as STORY from '../../game/story.js';
import { END_CARD_EP4 } from '../ep4/text.js';

const m = (text) => ({ who: 'mira', text });
const b = (text) => ({ who: 'bram', text });

// ------------------------------------------------------------------------------------------------
// Banners (plan 2.1): 11 maps, Saffron Haven's with a second state.
// ------------------------------------------------------------------------------------------------
export const EP5_BANNERS = {
  ep5_ship: { title: 'The Saffron Wind', sub: 'South across the Sea' },
  ep5_caravan_road: { title: 'The Caravan Road', sub: 'South to Saffron Haven' },
  ep5_saffron: { title: 'Saffron Haven', sub: 'The Moonwell Caravanserai',
    states: [{ if: 'haven_restored', title: 'Saffron Haven', sub: 'Every Road Remembers' }] },
  ep5_sh_inn: { title: 'The Dune Lantern Rest' },
  ep5_sh_shop: { title: 'Saffron Caravan Supplies' },
  ep5_sh_smithy: { title: 'The Copperwind Smithy' },
  ep5_sh_observatory: { title: 'The Armillary Tower' },
  ep5_lab_f1: { title: 'The Oracle Labyrinth', sub: 'I. The Shifting Dunes' },
  ep5_lab_f2: { title: 'The Oracle Labyrinth', sub: 'II. Gallery of False Horizons' },
  ep5_lab_f3: { title: 'The Oracle Labyrinth', sub: 'III. The Well of Tomorrow' },
  ep5_lab_oracle: { title: 'The Eye of the Oracle' },
};

// ------------------------------------------------------------------------------------------------
// Inspect lines (plan 4; signs and objects point at these ids). A string, a list of boxes, or a conditional list
// [{ if, ifNot, lines }] whose last entry is the fallback.
// ------------------------------------------------------------------------------------------------
export const EP5_LINES = {
  // ep4_valewyn (the ep5 patch) and the Haven's water stairs: the same moored ship
  ep5_ship_moored: [
    { if: 'road_landed', lines: "Yara's ship, the Saffron Wind, tied up and rocking. Her saffron sails are furled. She smells of hot sand." },
    { lines: ['A copper-trimmed ship at the landing, her saffron sails furled.', 'A name on her bow in brass letters: SAFFRON WIND.'] },
  ],

  // ep5_ship
  ep5_deck_crates: 'Bolts of cloth lashed under oilcloth: saffron, indigo, a red like sunset. Bound for a market that stopped buying.',
  ep5_mast: 'The mast, the sail furled to it. Small stars are carved up the wood, one for every crossing. There are a lot.',
  ep5_ship_lantern: 'A copper lantern on the rail. A compass rose is etched on its glass. It throws the rose onto the deck.',
  ep5_ship_wheel: "The ship's wheel, worn pale on two spokes where Yara holds it.",
  ep5_night_sea: 'Black water, and the stars in it. A moon path runs out to the edge of the world.',

  // ep5_caravan_road
  ep5_jetty: 'A stone jetty, sand drifted over its far end. Rope rings for twenty boats. One is in use.',
  ep5_dead_camp: 'A caravan camp, packed and never lifted. The fire pit is full of sand. The tent pegs are still in.',
  ep5_glass_flat: 'The Glass Flat. White sand that runs in the sun like water over stones. Where the shade lies, it holds still.',
  ep5_tent: [
    { if: 'haven_restored', lines: "Omar's shade tent. Two caravans are camped round it, and he is telling them which stones are safe." },
    { lines: 'A striped awning on poles, a water jar, a small fire. Somebody keeps it ready for travelers who never come.' },
  ],
  ep5_safe_stones: [
    { if: 'haven_restored', lines: 'A line of small white stones across the dune. Boot prints and camel prints go along it.' },
    { lines: 'A line of small white stones set out across the dune. Fresh this morning. Nobody has walked on them.' },
  ],
  ep5_haven_far: 'Saffron Haven, far below: copper domes, an oasis, and over it all a great golden armillary, turning.',

  // the sun and shade kit (the road and the Labyrinth share these)
  ep5_sundial: 'A caravan sundial on a stone stand. Three notches round its face: dawn, noon and dusk. The lit one is the hour.',
  ep5_obelisk: 'A tall waymark obelisk. Its shadow lies across the sand like a plank laid down.',
  ep5_obelisk_scraped: 'An obelisk with every face chiselled flat. Rows of shallow scars show where the names were.',
  ep5_standstone: 'A standing stone on a worn groove. It would slide, with a shove. Its shadow would slide with it.',
  ep5_low_block: 'A low block of sandstone. Its shadow is short, but it is a shadow.',
  ep5_running_sand: 'Sand that runs where the light touches it, and holds still where the shade lies.',
  ep5_groove: 'A paved track with a worn rut down the middle. Something heavy has slid along here, many times.',
  ep5_sun_plate: 'A plate in the paving with a sun carved on it. It wants light on it.',
  ep5_moon_plate: 'A plate in the paving with a crescent moon carved on it. It wants shade.',
  ep5_sun_gate: [
    { if: 'plate_f1_open', lines: 'The sun gate stands open, latched. The sun on its lock is still warm.' },
    { lines: 'A gate of sandstone bars with a sun carved on its lock. The plate with the same mark opens it.' },
  ],
  ep5_oasis_spring: 'An oasis spring in a ring of sandstone. The water is cold, and tastes of stone and rest.',
  ep5_cracked_base: 'The base of this obelisk is cracked right through. A hard enough blow would open it.',
  ep5_camp_court: "Tent rings worn into the stone, and a carved toy camel half under the sand. Someone left in a hurry.",

  // ep5_saffron
  ep5_waystone: [
    { if: 'haven_restored', lines: 'The waystone at the gate. The carved names sit still. They are the same names as this morning.' },
    { lines: ['A waystone carved with the names of the travelers out on the road.',
      'As you watch, the carved names blur, and settle into other names.'] },
  ],
  ep5_bulletin: [
    { if: 'haven_restored', lines: ['The Sandstone Bulletin. The red lines are scrubbed off. Every route is open.',
      'Someone has chalked across the top: BACK BY THE SPRING RAINS.'] },
    { lines: 'The Sandstone Bulletin: caravan routes in every direction. Every one is struck through with the same red line.' },
  ],
  ep5_moonwell: [
    { if: 'moonwell_woken', lines: 'The Moonwell of Unspoken Names. Three roads lie on the water, side by side, and the night sky under them.' },
    { lines: 'The Moonwell of Unspoken Names. The water holds the night sky, even by day. Today it holds one road.' },
  ],
  ep5_mural: 'A mural of seven wandering stars, each with its own sign, all turning back toward an eighth. The eighth has no sign.',
  ep5_camels: 'Camels in their stalls, their loads on the floor beside them. One camel looks at the gate, and sighs.',
  ep5_packed_loads: [
    { if: 'haven_restored', lines: 'The loads are gone from the arcade. Only rope marks in the dust, where they sat for years.' },
    { lines: 'Loads packed and corded for the road. The knots are years old. Nobody has lifted them.' },
  ],
  ep5_armillary: 'The great armillary on the tower roof: golden rings inside rings, turning slowly against the sky.',
  ep5_bell_rack: [
    { if: 'bells_done', lines: "Hassan's rack by the gate. Three copper bells hang on it, and ring whenever the wind turns." },
    { if: 'bells_started', lines: 'A rack by the gate with three empty hooks. Hassan has polished the hooks anyway.' },
    { lines: 'A rack of iron hooks by the smithy door. Empty.' },
  ],
  ep5_water_stairs: "Stone stairs down to the water. A rope coil on the bottom step, and Yara's ship rocking beside it.",
  sign_ep5_inn: 'THE DUNE LANTERN REST. A LAMP FOR EVERY BED.',
  sign_ep5_shop: 'SAFFRON CARAVAN SUPPLIES. CLOTH THAT HOLDS ITS COLOR AFTER A HUNDRED STORMS.',
  sign_ep5_smithy: 'THE COPPERWIND SMITHY. BELLS TUNED. ANVILS LISTENED TO.',
  sign_ep5_tower: 'THE ARMILLARY TOWER. READERS AFTER DARK.',
  sign_ep5_north_gate: [
    { if: 'lab_entered', lines: 'THE NOMAD PATH. NORTH TO THE ORACLE LABYRINTH. Under it, in fresh chalk: three small marks, and a fourth.' },
    { lines: 'THE NOMAD PATH. NORTH TO THE ORACLE LABYRINTH. The paint is twenty years old.' },
  ],

  // ep5_sh_observatory
  ep5_star_charts: [
    { if: 'chart_restored', lines: 'Star charts in four hands. In the newest, the empty space by the brightest ring is filled, in fresh ink.' },
    { lines: 'Star charts on every wall, in four hands. In every one, the same empty space by the brightest ring.' },
  ],
  ep5_rings: 'The great rings of the armillary, brass and gold, taller than Bram. A cloth for polishing hangs on one.',

  // ep5_lab_f2
  ep5_painted_horizon: 'A painted horizon: a sea with ships on it, in the middle of a desert. The paint is very good. It is very wrong.',
  ep5_painted_city: 'A painted horizon with a white city on it. There is no city there. There never was.',
  ep5_window: 'A tall horizon window. When the sun is on its side of the sky, the light comes in like a blade.',
  ep5_pillar: 'A gallery pillar on a groove. It would slide with a shove, and take its shadow with it.',
  ep5_map_table: [
    { if: 'sel_memory_2', lines: 'The map table. The map on it shines like water. Held to the light, it has holes where names should be.' },
    { lines: 'A long map table under a window. A map lies on it, perfect and bright, every road drawn to its end.' },
  ],
  ep5_star_floor: [
    { if: 'star_restored', lines: 'The star floor. One small star is back in its socket, lit, among the others.' },
    { if: 'star_hidden', lines: 'The star floor, with one dark socket. On the wall, a small glass star sits in a painted sky.' },
    { lines: "A floor of dark star-glass, every star of the sky set in it. The Oracle's copy." },
  ],
  ep5_feather_glass: 'A black feather on the star-glass. Every star shows in the floor around it. The feather shows nothing.',

  // ep5_lab_f3
  ep5_well_shaft: 'The shaft goes down in landings. Far below, still water holds a circle of real sky.',
  ep5_lamp_cart: 'A sun-lamp on an iron rail. It burns gold and steady. Where its light falls, the sand runs.',
  ep5_spring_shelter: [
    { if: 'landing_shelter', lines: 'The spring of the first landing, full to the lip. Carved on the stone: SHELTER.' },
    { lines: 'A dry spring, its basin full of sand. A vow is carved on the lip: SHELTER.' },
  ],
  ep5_spring_truth: [
    { if: 'landing_truth', lines: 'The spring of the second landing, full to the lip. Carved on the stone: TRUTH.' },
    { lines: 'A dry spring, its basin full of sand. A vow is carved on the lip: TRUTH.' },
  ],
  ep5_spring_return: [
    { if: 'landing_return', lines: 'The spring of the last landing, full to the lip. Carved on the stone: RETURN.' },
    { lines: 'A dry spring, its basin full of sand. A vow is carved on the lip: RETURN.' },
  ],
  ep5_page_glass: [
    { if: 'sel_memory_3', lines: 'Where the page lay, the sand is smooth, as if a hand had smoothed it.' },
    { lines: 'Under the last spring, something catches the lamp light. Glass.' },
  ],
  ep5_sun_keyhole: [
    { if: 'oracle_door_open', lines: 'The Sun Keyhole: a great door with a sun for its lock. The Nomad Sun Key fits it.' },
    { lines: 'A great door with a sun for a keyhole. It does not move.' },
  ],

  // ep5_lab_oracle
  ep5_oracle_ring: [
    { if: 'oracle_defeated', lines: 'The golden ring, empty. The star-glass inside it shows the chart, and every star is lit.' },
    { lines: 'A golden ring set in the floor, as wide as a house. Something is coiled around it.' },
  ],
  ep5_chart_glass: [
    { if: 'chart_restored', lines: 'The Star Chart in the glass: every name of the realm, a star. Beside yours, a small open book of stars.' },
    { lines: 'Dark star-glass, deep as water.' },
  ],
  ep5_feather_eye: 'A black feather on the glass by the chart. It does not reflect the stars.',
};

// ------------------------------------------------------------------------------------------------
// Books (plan 4 and 7): haven_charts (the Armillary Tower), travelers_log (the Reliquary cache on F2), well_vows (F3).
// ------------------------------------------------------------------------------------------------
export const EP5_BOOKS = {
  haven_charts: {
    title: 'The Haven Charts', where: 'ep5_sh_observatory',
    pages: [
      "Forty years of a star reader's charts, one night to a page. The Oracle's readings are in the margins.",
      'Twenty years ago the margins change. Every reading ends. The last chart is titled: The Prophecy Shard.',
      'Under it, in a younger hand: One star too few. I have kept an empty space for it.',
    ],
  },
  travelers_log: {
    title: "The Travelers' Log", where: 'ep5_lab_f2',
    pages: [
      'A caravan log in many hands: the names of travelers who passed this way, and where they were going.',
      'The last pages are all going home. None of the names are crossed out.',
      'At the bottom: We scratched our names under the sand, where the Oracle cannot read them. Find us.',
    ],
  },
  well_vows: {
    title: 'The Old Caravan Law', where: 'ep5_lab_f3',
    pages: [
      'Shelter. Nobody crosses alone. Make room under the sail for whoever the road gives you.',
      'Truth. Tell the caravan where the water is, even when it is far.',
      'Return. Without a return, a journey is only exile.',
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// First-time barks (plan 5.1, once per save). first_shade: the first hour change at a dial. first_shove_shade: the first
// Shove of a caster. first_window: the first window shaft (F2). first_lamp: the first lamp rolled (F3). sand_would_run:
// a Shove refused because the sand would run under the party. sky_low_mp: Mira under 12 MP in a fight with a foretelling
// (plan 14, the one-time hint). The truth choice on the ship changes Bram's half of first_shade (plan 7.3, one road bark).
// ------------------------------------------------------------------------------------------------
export const EP5_BARKS = {
  first_shade: [
    { if: ['ep5_started', 'mira_joined', 'bram_spared'], lines: [
      m('A bridge made of shade. Of course it is.'),
      b("I didn't sleep on the ship, by the way. In case anyone wondered."),
    ] },
    { if: ['ep5_started', 'mira_joined'], lines: [
      m('A bridge made of shade. Of course it is.'),
      b("Scared on purpose, and walking on shade. Fine. I'm fine."),
    ] },
  ],
  first_shove_shade: [
    { if: ['ep5_started', 'bram_joined'], lines: [b('Move the stone, move the shade. I can do that.')] },
  ],
  first_window: [
    { if: ['ep5_started', 'mira_joined'], lines: [m("Indoors the dark holds. The light's the trouble now.")] },
  ],
  first_lamp: [
    { if: ['ep5_started', 'bram_joined'], lines: [b("So now we're the sun. Fine.")] },
  ],
  sand_would_run: [
    { if: ['ep5_started', 'mira_joined'], lines: [m('Not there. The sand would run under us.')] },
  ],
  sky_low_mp: [
    { if: ['sky_learned', 'mira_joined'], lines: [m('Keep something back to turn the sky.')] },
  ],
};

// ------------------------------------------------------------------------------------------------
// Bestiary (plan 6.2, 6.4, 6.5): the 12 new foes. Three lore lines each: what it is, what it does, what hurts it; every
// entry names its sky side (a sun-thing is Exposed at night, a star-thing by day).
// ------------------------------------------------------------------------------------------------
export const EP5_BESTIARY = {
  dune_stalker: {
    name: 'Dune Stalker', where: 'The Caravan Road and the Shifting Dunes',
    lore: [
      'A lean hunter with sand-gold fur and dark stripes. It follows caravans for days, and never quite arrives.',
      'It bites, and kicks sand in the eyes. Quick: slow blows miss it now and then. A sun-thing: open at night.',
      'Ice and spears. Fire is the weather it was born in.',
    ],
  },
  dune_scarab: {
    name: 'Dune Scarab', where: 'The Caravan Road and the Labyrinth',
    lore: [
      'A beetle the size of a cart, gold shell with lapis lines. It rolls the sun across the dunes, it thinks.',
      'Its mandibles bite, and when pressed it burrows and shells up. A sun-thing: open at night.',
      'Ice and axes crack it. Swords, arrows and fire slide off the shell.',
    ],
  },
  dust_harrier: {
    name: 'Dust Harrier', where: 'The Saffron Wind and the Shifting Dunes',
    lore: [
      'A raptor in ochre and rust feathers that rides the hot wind off the dunes, far out over the sea.',
      'Talons, and a Dust Devil that batters the whole party and blinds. Hard to hit. A sun-thing: open at night.',
      'Arrows and thunder bring it down. Fire only lifts it higher.',
    ],
  },
  silt_reaver: {
    name: 'Silt Reaver', where: 'The Shifting Dunes and the Gallery',
    lore: [
      'A robed shape the color of dust, sand streaming from its sleeves, with eyes like cold blue stars.',
      'It lashes with silt, buries a caster in Silence, and drinks what it hits. A star-thing: open by day.',
      'Light and fire. Ice is its own night.',
    ],
  },
  starsilt: {
    name: 'Starsilt', where: 'The Caravan Road and the Labyrinth',
    lore: [
      'A deep indigo jelly with star specks drifting inside it. On a dark dune it looks like a hole in the sky.',
      'Its glimmer blinds, and its Starfall drops one heavy spell. A star-thing: open by day.',
      'Fire and light. Ice and thunder only rearrange the stars in it.',
    ],
  },
  horizon_shade: {
    name: 'Horizon Shade', where: 'The Gallery and the Well',
    lore: [
      'A flying shape in indigo and pale gold, a horizon line drawn across its body like a belt.',
      'It chills, turns to mirage, and gathers an Eclipse over the whole party. Defend. A star-thing: open by day.',
      'Light and fire. Ice passes through it.',
    ],
  },
  tomorrow_husk: {
    name: 'Tomorrow Husk', where: 'The Gallery and the Well',
    lore: [
      'A sandstone husk with an hourglass for a heart. The sand in it runs the wrong way.',
      'Slow, and it hastes itself. When the glass fills it brings down an Hour Crush. A sun-thing: open at night.',
      'Ice and axes. Swords, spears and fire only chip the stone.',
    ],
  },
  mirage_knight: {
    name: 'The Mirage Knight', where: 'The Gallery of False Horizons',
    lore: [
      'A knight of sun-bronze with a mirror for a shield. The mirror shows whichever sky is not here.',
      'At every natural turn of the sky it turns its mirror to match. Turn the sky yourself and it is caught.',
      'Ice and axes. At half strength it calls a Double of the other sky. Its Cleave is telegraphed: Defend.',
    ],
  },
  mirage_double: {
    name: 'Mirage Double', where: 'The Gallery of False Horizons',
    lore: [
      'The Knight, again, in indigo glass, a little smaller. Always the other sky from the Knight.',
      "It copies the Knight's last blow at half strength. One of the two is always open.",
      'Ice. Strike whichever the sky has opened.',
    ],
  },
  oracle: {
    name: 'The Sand Oracle', where: 'The Eye of the Oracle',
    lore: [
      "The Keepers' Reader of Roads: a golden scorpion with a sky for a body, made to keep the desert's chart.",
      'It reads a star when the sky is about to turn. Turn the sky before it does, and the reading is wrong.',
      'Ice and spears, and light at the last. A sun-thing at first. Later it takes whichever sky is up.',
    ],
  },
  future_hunger: {
    name: 'False Future: Hunger', where: 'The Eye of the Oracle',
    lore: [
      'A cracked hourglass in a gold mask with an open jaw. A future that eats the road ahead.',
      'It takes Fury from whoever has the most, and feeds the Oracle. A sun-thing: open at night.',
      'Ice. While it stands, the Mirage Veil holds.',
    ],
  },
  future_fear: {
    name: 'False Future: Fear', where: 'The Eye of the Oracle',
    lore: [
      'A cracked hourglass in an indigo mask with hollow eyes. A future that holds you back.',
      'It pushes one of you down the timeline every turn, and hushes the reader. A star-thing: open by day.',
      'Spears and light. While it stands, the Mirage Veil holds.',
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// Battle lines (for E5-battle's messages and E5-scene-ui's help window) and the boss cards with their arc lines
// (RESPONSIBILITY_ARC 3.6: each boss card names what the town avoided). {name} is the named party member.
// ------------------------------------------------------------------------------------------------
export const EP5_BOSS_CARDS = {
  mirage_knight: { name: 'THE MIRAGE KNIGHT', sub: 'Warden of False Horizons' },
  oracle: { name: 'THE SAND ORACLE', sub: 'Reader of Every Road' },
};
export const EP5_ARC_LINES = {
  mirage_knight: 'It showed every caravan a better horizon. They walked toward it.',
  oracle: 'It told them how it ended. They stopped walking.',
};
export const EP5_BATTLE_TEXT = {
  sky_day: 'The sky turns. Day.',
  sky_night: 'The sky turns. Night.',
  prophecy_read: "The Oracle reads {name}'s star. It falls when the sky turns.",
  starless: '{name} falls from the chart.',
  prophecy_broken: 'The words change. The Oracle is broken.',
  answer_fails: 'A foretelling is not a decree. Nothing is written yet.',
  turn_sky_help: 'Turn the sky now. Breaks a foretelling.',
  turn_sky_learn: 'Mira learned Turn the Sky. It turns the sky now, and breaks a foretelling.',
  oracle_phase3: 'The mask falls. Under it, a face made of stars.',
  veil_tears: 'The Mirage Veil tears. The Oracle reels.',
  knight_cleave: 'The Knight raises its blade to the horizon...',
  knight_mirror: 'The Knight turns its mirror to the new sky.',
  sandstorm: 'The sand rises into a storm around the Oracle...',
  low_mp: 'Keep something back to turn the sky.',
};

// ------------------------------------------------------------------------------------------------
// Credits and cards. CREDITS_EP5 plays over `saffron` after ep5_complete (hooks.js CREDITS_HANDOFF[5]); END_CARD_EP5
// follows it. END_CARD_EP4_LIVE replaces the Episode 4 end card while EP5_LIVE. EPISODE6_CARD closes ep5_ending
// (placeholder wording, Scott's or Stephen's to change: EPISODE5.md section 10.10).
// ------------------------------------------------------------------------------------------------
export const END_CARD_EP5 = { text: 'To be continued', sub: 'Episode 6 is not playable yet.', frames: 300, backdrop: 'ep5_dialog_keyart' };
export const END_CARD_EP4_LIVE = { ...END_CARD_EP4, sub: 'Episode 5 begins in the morning.' };
export const EPISODE6_CARD = { text: 'Episode 6: The Skybound Isles', sub: 'Above the clouds, the first page waits.' };
export const END_TITLE_EP5 = { text: 'End of Episode 5', sub: 'The Last Prophecy' };

export const CREDITS_EP5 = [
  { heading: 'LEXICON QUEST', lines: ['Episode 5: The Last Prophecy'] },
  { heading: 'Created by', lines: ['Scott Ball'] },
  { heading: 'Story, World and Direction', lines: ['Scott Ball'] },
  { heading: 'Music', lines: ['Composed for Lexicon Quest', 'with Suno, and in code'] },
  { heading: 'The Party', lines: ['{hero}, whose star came back', 'Mira, who turned the sky', 'Bram, who asked who told them'] },
  { heading: 'Saffron Haven', lines: ['Sel, who walked in', 'Yara of the Saffron Wind', 'Tamir, who came home'] },
  { heading: 'Saffron Haven', lines: ['Kamal the Water Bearer', 'Nasrin the Star Reader', 'Laleh the Stargazer'] },
  { heading: 'On the Roads', lines: ['Omar the Pathkeeper', 'Yasmin of the copper awnings', 'Hassan, who tunes the bells'] },
  { heading: 'The Oracle Labyrinth', lines: ['The Mirage Knight', 'The False Futures', 'The Sand Oracle, who read every end'] },
  { heading: 'The First Student', lines: ['Ishra', 'The future is not a single answer.'] },
  { heading: 'And', lines: ['Vex Quill, who moved a star every night'] },
  { heading: 'Valewyn, Emberpeak, Hollowmere, Willowmere', lines: ['Lyra, who keeps the gates open', 'Ada, who carries the letters', 'Holt, who reads sandy ones'] },
  { heading: '', lines: ['Records hold.', 'Readings turn.'] },
  { heading: 'Thank you for playing', lines: ['Above the clouds, a page is waiting.'] },
];

export function register() {
  for (const [id, v] of Object.entries(EP5_BANNERS)) if (!(id in BANNERS)) BANNERS[id] = v;
  for (const [id, v] of Object.entries(EP5_BOOKS)) if (!(id in BOOKS)) BOOKS[id] = v;
  for (const [id, v] of Object.entries(EP5_BARKS)) if (!(id in BARKS)) BARKS[id] = v;
  for (const [id, v] of Object.entries(EP5_BESTIARY)) if (!(id in BESTIARY)) BESTIARY[id] = v;
  STORY.registerStory({ scenes: {}, lines: EP5_LINES, conditions: {} });
}

export default register;
