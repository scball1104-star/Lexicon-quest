// Episode 1 expansion, "The Wider Valley": banners, signs and inspect text, books, font texts, Appraise texts, the bark
// for the first Appraise on an object and the bestiary entries of the three new foes. register() assigns them into BANNERS,
// BOOKS, BARKS, BESTIARY and (through registerStory) the shared LINES table. Idempotent. Pure data.
//
// X1_NAMES_TO_CONFIRM is the one place every placeholder name of the expansion lives (docs/EXPANSION_RECONCILIATION.md
// section 8). Every scene, sign and book reads it, so Scott's real names are a one-place edit. Rules for a replacement:
// ASCII, no collision with a named person of Episodes 1 to 3 or docs/EXPANSION2_PLAN.md, no alphabetical pattern, and no
// word game of any kind (the names are story, never a puzzle).
//
// Box rules (checked by qa/content/x1_*.test.mjs): at most 3 lines of 42 characters per box, ASCII, no em dashes, {hero}.

import { BANNERS, BOOKS, BARKS, BESTIARY } from '../text.js';
import * as STORY from '../../game/story.js';

// ------------------------------------------------------------------------------------------------
// The names Scott has not approved yet. Placeholders chosen by the designer; none is a puzzle.
// ------------------------------------------------------------------------------------------------
export const X1_NAMES_TO_CONFIRM = {
  // The Barrow Reeve: said by Mira at the end of the fight (reeve_after) and at the stones (rollcall_stones).
  reeve: { name: 'Wystan', title: 'Reeve of the Fold' },
  // The twelve standing stones, in the order they stand clockwise from the north. The first nine are on Iris's torn roll,
  // the last three only in Quill's copy. Said in rollcall_stones, stitched on the sampler, carved in the Barrow's niches.
  stones: [
    'Edric Sallow', 'Maud Tarrant', 'Gil Penhallow', 'Ysolde Fenn', 'Aubrey Lunt', 'Joss Harrow',
    'Perrin Dale', 'Netta Scarth', 'Lowen Locke', 'Agnes Brack', 'Ralf Underhill', 'Dorrit Hallam',
  ],
  // The three Keepers whose stations the Dark Stars quest reads in hidden ink (valley milestone, Archive door, Watchtower).
  keepers: [
    { station: 'milestone', name: 'Calder Wynn', trade: 'WAY-SETTER', built: 'SET THIS STONE AND CUT ITS WORDS' },
    { station: 'archive_door', name: 'Isaura Pike', trade: 'DOOR-WRIGHT', built: 'CARVED THIS DOOR TO ASK FOR A NAME' },
    { station: 'watchtower', name: 'Brannoch Teal', trade: 'WATCHER', built: 'RAISED THIS TOWER AND HUNG ITS NINE CHIMES' },
  ],
  // Odo's chime song (list_song, Things Not To Forget).
  song: { title: 'The Nine Posts', firstLine: 'Fifty paces, wind and stone,', secondLine: 'nine good words to bring you home.' },
  // The nine chime-post words on the High Moor, in road order. The ninth is fixed: KEPT.
  chimePosts: ['STONE', 'WIND', 'WATER', 'ROAD', 'HEATH', 'FIRE', 'BREAD', 'NAME', 'KEPT'],
};

const N = X1_NAMES_TO_CONFIRM;
export const REEVE_FULL = `${N.reeve.name}, ${N.reeve.title}`;
const names = (a, b) => N.stones.slice(a, b).join('. ') + '.';

// ------------------------------------------------------------------------------------------------
// Banners: the eleven maps of plan 2.1 (title at most 28 characters, sub at most 32).
// ------------------------------------------------------------------------------------------------
export const X1_BANNERS = {
  x1_downs: { title: "Shepherd's Downs", sub: 'West of the Valley' },
  x1_loomhouse: { title: 'The Loom House', sub: 'Thornfold' },
  x1_barrow: { title: "The Wethers' Barrow", sub: 'Under the Standing Stones' },
  x1_terrace: { title: "The Keepers' Terrace", sub: 'Above the Valley' },
  x1_orrery: { title: 'The Orrery', sub: "A Keeper's Observatory" },
  x1_cellar: { title: "The Keepers' Cellar", sub: 'Below the Orrery' },
  x1_millrace: { title: 'The Lower Millrace', sub: 'Downriver' },
  x1_mill: { title: "Hal's Mill", sub: 'The Lower Millrace' },
  x1_culvert: { title: 'The Weir Culvert', sub: 'Under the Millpond' },
  x1_highmoor: { title: 'The High Moor', sub: 'North of the Downs' },
  x1_larchhill: { title: 'Larchhill', sub: 'The Terraced Orchards' },
};

// ------------------------------------------------------------------------------------------------
// Books (event { type: 'book', book: id }). `where` is the map the book lives on.
// ------------------------------------------------------------------------------------------------
export const CELLAR_NOTE_PAGES = [
  'To whoever came down by starlight. An order reached us. We did not obey it.',
  'We did not take the names out. We put them where a person must look up to find them.',
  'A milestone. A door. A tower. A star. Look up. That is all the Keeping there is.',
];

export const X1_BOOKS = {
  burial_roll: {
    title: 'A Torn Roll of the Dead', where: 'library',
    pages: [
      'THORNFOLD. THE FOUNDING TWELVE. The paper is torn across, and the bottom third is simply gone.',
      names(0, 5),
      names(5, 9),
      'The roll ends there. The rest was not lost to the tear. It was lost before.',
    ],
  },
  keeper_star_ledger: {
    title: "The Orrery's Ledger", where: 'x1_orrery',
    pages: [
      'Nine brass stars to the ring. One star for each Keeper who built on the ridge, the road and the tower.',
      'Three of the nine wrote their names where they worked, in ink that hides: a milestone, a door, a tower.',
      'A star that goes dark has not been lost. It is waiting to be read.',
    ],
  },
  mill_ledger: {
    title: "Hal's Mill Ledger", where: 'x1_mill',
    pages: [
      'Thirty years of customers, in a blunt square hand. Barley, oats, a sack at a time.',
      'The first page holds one name: Ebba Corley. One sack of barley. Paid in eggs.',
      'Further on, a long column of names. PAID stands beside every one. Not a single line is crossed out.',
    ],
  },
  x1_keeper_note_f2: {
    title: "A Keeper's Note", where: 'archive_f2',
    pages: ['WE BUILT A STAIR ABOVE THE WEST ROAD, WHERE THE CLIFF REMEMBERS. THE GAP IS INK. THE INK IS PATIENT.'],
  },
  barrow_names: {
    title: 'The Thirteen Niches', where: 'x1_barrow',
    pages: [
      'Hidden ink wakes in the niches of the north wall, thirteen of them. Twelve hold names.',
      names(0, 3),
      names(3, 9),
      names(9, 12),
      `The thirteenth niche stands a little apart. ${REEVE_FULL}. He counted.`,
    ],
  },
  cellar_note: {
    title: "A Keeper's Last Page", where: 'x1_cellar',
    pages: CELLAR_NOTE_PAGES,
  },
};

// ------------------------------------------------------------------------------------------------
// Barks: the first-time remark when Appraise meets an object instead of a foe (plan 6.2).
// ------------------------------------------------------------------------------------------------
export const X1_BARKS = {
  // W7 (PLAYTEST_REVIEW_X1 M2): once, when the party first walks near either west gate after the first fight (map triggers carrying `bark`)
  first_west_gate: [
    { if: ['mira_joined', 'first_fight_done'], lines: [{ who: 'mira', text: 'The west fence has a gate in it now.' }] },
  ],
  first_appraise_object: [
    { if: 'mira_joined', lines: [
      { who: 'mira', text: "There is something wrong with that scarecrow's pockets." },
      { who: 'mira', text: 'Let me have a proper look.' },     // W7: names the act; the pill already shows the button
    ] },
  ],
};

// ------------------------------------------------------------------------------------------------
// Bestiary. lore[0] is the enemies.js `flavor` (X1-battle writes the foe rows; the test holds them equal when both exist).
// ------------------------------------------------------------------------------------------------
export const X1_BESTIARY = {
  barrow_shade: {
    name: 'Barrow Shade', where: "The Wethers' Barrow",
    lore: [
      'Somebody\'s grandmother, grown thin. She is not angry. She is lost.',
      'It drifts the passages, touching walls where names were carved.',
      'The touch is cold. It is a question, not an attack. Fire and light send it back to rest. Ice only reminds it of the ground.',
    ],
  },
  barrow_reeve: {
    name: 'The Barrow Reeve', where: "The Wethers' Barrow",
    lore: [
      'He counts the flock every night, and every night he comes up one short.',
      'The Reeve of the Fold still walks the passage under the stones, saying the number aloud. He is not cruel.',
      'When the count fails he calls a shade to be counted. He sets his crook for whoever stands nearest.',
      `Bows and light trouble him. Say all twelve names at the stones, then say his: ${REEVE_FULL}.`,
    ],
  },
  millstone_golem: {
    name: 'The Millstone Golem', where: 'The Weir Culvert',
    lore: [
      'A grindstone given legs. It was told to keep turning, and nobody told it when to stop.',
      'It leans on the old wheel and rolls. Hurt it, and weevils spill out of the grain.',
      'Hurt it more, and the wheel runs away with it. Thunder shakes it. Axes find the crack. Swords and arrows skid off.',
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// Inspect text, signs, font texts and Appraise texts (shared LINES table). A value is a string, a list of boxes, or a
// first-match conditional list [{ if, ifNot, lines }] whose last entry has no conditions.
// ------------------------------------------------------------------------------------------------
const chime = (i) => [
  `A chime post. A bent iron arm, a hanging chime, and a cairn of grey stones. Carved in the cairn: ${N.chimePosts[i]}.`,
];

export const X1_LINES = {
  // ---- valley and Willowmere (edits by X1-maps-hub)
  x1_drovers_gate: "A drovers' gate, tied shut with a shepherd's knot. Not yet.",
  x1_downs_post: "A new-painted arrow. THE DOWNS. DROVERS' ROAD. The gate beside it stands open.",
  x1_west_post: 'A fresh arrow nailed to the orchard post. THE DOWNS, it says, and the gate behind it is open.',
  x1_cleft_sign: 'A black cleft before an old stair. No bridge.',
  x1_fallen_oak: 'A fallen oak across the track. Somebody has been meaning to move it for a month.',
  x1_orchard_gate: 'ORCHARD GATE SHUT TILL THE LAMBING. USE THE SOUTH GATE. - HOLT',
  x1_wall_crack: 'Wick says nobody knows about this hole. Everybody knows.',

  // ---- x1_downs
  downs_signpost: [
    'A signpost with five arms, painted by someone who loved paint.',
    "THORNFOLD. THE STONES. THE HIGH MOOR. DROVERS' ROAD. LARCHHILL ROAD.",
  ],
  thornfold_well: 'A stone well with a bucket on a chain. Twelve notches in the lip, one for each family, worn smooth by thumbs.',
  thornfold_sign: [
    { if: 'archivore_defeated', lines: 'THORNFOLD. The letters are back, crisp as new paint, and a little smug about it.' },
    { lines: 'A signpost with a board scrubbed to bare wood. Whatever it said, it is not saying it now.' },
  ],
  x1_drovers_chain: [
    { if: 'archive_f1_done', lines: 'The chain lies in the road, coiled like a sleeping dog. Somebody took it down in a hurry.' },
    { lines: 'ROAD CLOSED. THE WEIR BROKE AND NOBODY CAME. - F.' },
  ],
  x1_menhir: [
    { if: 'reeve_named', lines: 'A tall grey stone with a name carved in its face, deep and clean. Thirteen stones now, and every one is somebody\'s.' },
    { if: 'stones_lettered', lines: 'A tall grey stone with a name carved fresh in its face. The edges of the letters are still pale as frost.' },
    { lines: 'A tall grey stone, worn smooth. Whatever was carved here has gone. The stone is waiting, the way a page waits.' },
  ],
  blank_slab: [
    { if: 'reeve_named', lines: 'The thirteenth slab, apart from the ring. One name, carved last and deepest. The wind has stopped worrying at it.' },
    { lines: 'A thirteenth slab, apart from the ring, face to the sky. Nothing on it at all. It looks like it is listening.' },
  ],
  x1_old_scarecrow: 'A scarecrow in a patchwork coat, so many pockets it looks like a coat made of coats. A tag on the strap says PATCH.',
  appraise_scarecrow: [
    'PATCH. A scarecrow in a coat of eleven pockets.',
    'Ten are sewn shut. The eleventh has a loose stitch, and behind it something that is not straw.',
  ],

  // ---- x1_loomhouse
  x1_sampler: [
    { if: 'stones_lettered', lines: 'A framed sampler. Twelve names in dark thread, every stitch as sharp as the day it was sewn.' },
    { lines: 'A framed sampler. Twelve names in thread gone pale as ash. You can feel the letters better than you can see them.' },
  ],
  thornfold_hearth: [
    'A hearth under a low arch. Wool smell, woodsmoke, a kettle that has been about to boil for an hour.',
    'Warmth settles on you like a hand on the shoulder.',
  ],

  // ---- x1_barrow
  barrow_slab_a: 'A NAME FOR EACH STONE. A STONE FOR EACH NAME.',
  barrow_hearth: [
    'A ring of old stones round a fire that nobody lit. Beyond the arch, far off, a dry voice is still counting.',
    'The fire does not ask who you are. It only asks you to sit.',
  ],

  // ---- x1_terrace
  terrace_sign: "THE KEEPERS' TERRACE. MIND THE EDGE. THE EDGE DOES NOT MIND YOU.",
  edge_sign: 'THE QUICK WAY DOWN.',

  // ---- x1_orrery
  x1_armillary: [
    { if: 'orrery_aligned', lines: 'The Orrery turns, all nine stars lit. The brass rings glide without a sound, like something that has remembered how.' },
    { if: ['star_1_read', 'star_2_read', 'star_3_read'], lines: 'Nine brass stars on bronze rings. Three hang dark, but you know their names now. Hesper will want to hear them.' },
    { lines: 'Nine brass stars on bronze rings. Six burn. Three hang dark and still, like lamps nobody lit.' },
  ],
  x1_star_plate: 'A plate of dark brass among the star charts. Under its lower edge there is a shadow the size of a keyhole.',
  appraise_star_plate: [
    'A star plate, set into the wall by a Keeper\'s hand.',
    'It sits proud of the stone by the width of a coin. Behind it: a drawer. Not locked. Only forgotten.',
  ],
  x1_hatch: [
    { if: 'orrery_aligned', lines: 'The trapdoor stands open. A stair of pale tile goes down into cool, dry air.' },
    { lines: 'A trapdoor in the floor, sealed with a plate of brass stars. It does not open for pulling.' },
  ],

  // ---- x1_cellar
  cellar_font: 'A font of pale tile with a star set in its floor. The water tastes faintly of ink and mint.',

  // ---- x1_millrace and x1_mill
  millrace_signpost: "HAL'S MILL. THE WEIR. THE DROVERS' ROAD, NORTH-WEST.",
  x1_mill_barred: 'The door is barred from inside. Very softly, somebody on the other side is setting out bowls.',
  x1_mill_wheel: [
    { if: 'mill_turning', lines: 'The great wheel turns, slow and dripping. The pin holds. It sounds like a house breathing.' },
    { if: ['mill_started', 'pin_found'], lines: 'The wheel\'s hub has an empty socket the width of a forearm. The pin from the culvert would fit.' },
    { lines: 'A great wheel, still, green with a month of damp. Something small is missing from its hub.' },
  ],
  x1_weir: 'A stone wall across the river. The sluice gate hangs by one hinge, and the pond behind it is a field of cracked mud.',
  x1_flour_table: [
    { if: 'mill_done', lines: 'Four bowls and four sacks, set with care. This morning someone ate from one of them, and complained.' },
    { lines: 'A table laid for four. Four bowls, four sacks of flour, set out with great care for people who are not here.' },
  ],
  culvert_font: 'A Keeper\'s font in a dry alcove. The water is fresh and cold, which makes no sense this far under a drained pond.',

  // ---- x1_highmoor
  moor_sign: 'THE HIGH MOOR. CHIME POSTS EVERY FIFTY PACES. FOLLOW THEM OR DO NOT.',
  chime_1: chime(0), chime_2: chime(1), chime_3: chime(2), chime_4: chime(3), chime_5: chime(4),
  chime_6: chime(5), chime_7: chime(6), chime_8: chime(7),
  chime_9: [
    `A chime post, the last. The chime is still. Carved in the cairn: ${N.chimePosts[8]}.`,
  ],
  moor_bench: 'A bench at the tarn\'s edge, facing the black water. Carved in the seat: SIT AWHILE. IT HAS NOT GONE ANYWHERE.',
  x1_watchtower: 'A Keepers\' tower, broken at the top like a tooth. Thin wires run down from its ruined floor to a hundred little chimes.',

  // ---- x1_larchhill
  hill_sign: 'LARCHHILL. MIND THE BEES. THE BEES MIND YOU.',
  x1_windmill: 'A whitewashed windmill, its sails turning slowly. Behind it, honey-colored stone arches march along the ridge.',
  x1_cider_barrel: 'A cider barrel, heavy as a cow, wedged in the aqueduct stair. It smells of last autumn.',
  x1_hay_chute: [
    { if: 'yarrow_met', lines: 'A hay chute, polished by years of small trousers. It runs steeply down to the river. One way only.' },
    { lines: 'A hay chute behind a gate. Someone has chalked a boat on the gate and a small, firm NO.' },
  ],
};

// ------------------------------------------------------------------------------------------------
export function register() {
  Object.assign(BANNERS, X1_BANNERS);
  Object.assign(BOOKS, X1_BOOKS);
  Object.assign(BARKS, X1_BARKS);
  Object.assign(BESTIARY, X1_BESTIARY);
  if (typeof STORY.registerStory === 'function') STORY.registerStory({ scenes: {}, lines: X1_LINES, conditions: {} });
  else Object.assign(STORY.LINES, X1_LINES);
}

export default register;
