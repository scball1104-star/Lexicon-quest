// Episode 8, "The Last Word": banners, inspect lines (every save point with its own key), the realm books' float lines,
// books, barks, bestiary, the battle and boss lines. register() assigns them into BANNERS, BOOKS, BARKS, BESTIARY and
// (through registerStory) the shared LINES table, and gives two older inspect lines their Episode 8 state (the blanket's
// third line, the mural's eighth sign) behind their own flags. Idempotent. Pure data. Part of the lazy `ep8` pack.
//
// Box rules (qa/content/ep8_*.test.mjs): at most 3 lines of 42 characters with an 8-letter hero name, ASCII, no em dashes,
// {hero} for the player's name. No line before keeper_named calls the Librarian the First Keeper; Elowen is "Keeper of the
// Scriptorium", never a bookbinder; the vault fire is always the vault fire or the fire in the east wing. The realm books
// are pictures and a name, never something to work out.
//
// Not registered here (E8-scene-ui wires them into the battle scene's BOSS_CARD and the help window, as Episode 7's scene.js
// did): EP8_BOSS_CARDS, EP8_ARC_LINES and EP8_BATTLE_TEXT. E8-battle's messages may read EP8_BATTLE_TEXT too.

import { BANNERS, BOOKS, BARKS, BESTIARY } from '../text.js';
import * as STORY from '../../game/story.js';

const m = (text) => ({ who: 'mira', text });
const b = (text) => ({ who: 'bram', text });

// ------------------------------------------------------------------------------------------------
// Banners (plan 2.1): 10, the Scriptorium's with a second state. The Last Word's is its name alone (plan 2.1); the bell
// night has none: its scene opens on the dark stair, and a banner would talk over the picture.
// ------------------------------------------------------------------------------------------------
export const EP8_BANNERS = {
  ep8_stair: { title: 'The Stair of Written Light', sub: 'Up to the Library' },
  ep8_scriptorium: { title: 'The Scriptorium', sub: 'The Unfinished Street',
    states: [{ if: 'scriptorium_open', title: 'The Scriptorium', sub: 'An Open Library' }] },
  ep8_sc_inn: { title: "The Keeper's Quiet Rooms" },
  ep8_sc_shop: { title: 'Bibliotheca Supplies' },
  ep8_sc_atelier: { title: 'The Glyphsmith Atelier' },
  ep8_sc_index: { title: 'The First Library Index' },
  ep8_library_f1: { title: 'The First Library', sub: 'I. The Catalog of Lost Lives' },
  ep8_library_f2: { title: 'The First Library', sub: 'II. The Palimpsest Galleries' },
  ep8_library_f3: { title: 'The First Library', sub: 'III. The Unwritten Page' },
  ep8_last_word: { title: 'The Last Word' },
};

// ------------------------------------------------------------------------------------------------
// The seven realm books (plan 4.11): a float line names each once when it opens. Map event ids are pb_<realm>; each key
// is ep8_realm_<realm>, the realm id of the map's popbooks block (willowmere hollow emberpeak valewyn desert isles north),
// which is the key E8-world's field reads by default (an event's `name` or `text` may name another). Flavor only: nothing is solved by a name (DESIGN hard rule 2).
// ------------------------------------------------------------------------------------------------
export const EP8_REALMS = {
  pb_willow: { key: 'ep8_realm_willowmere', text: 'WILLOWMERE. The willow stands up out of the page.' },
  pb_hollow: { key: 'ep8_realm_hollow', text: 'HOLLOWMERE. A paper mirror stands up, and shows nobody.' },
  pb_ember: { key: 'ep8_realm_emberpeak', text: 'EMBERPEAK. A paper forge stands up, a little bell in its roof.' },
  pb_valewyn: { key: 'ep8_realm_valewyn', text: 'VALEWYN. A paper keep stands up out of paper water.' },
  pb_desert: { key: 'ep8_realm_desert', text: 'THE DESERT. A paper armillary stands up and turns, once.' },
  pb_isles: { key: 'ep8_realm_isles', text: 'THE ISLES. A paper Kestrel stands up, sails full.' },
  pb_north: { key: 'ep8_realm_north', text: 'THE NORTH. A paper Stillheart stands up, clear as ice.' },
};

// ------------------------------------------------------------------------------------------------
// Inspect lines (plan 4 and EPISODE8 section 10; signs and objects point at these ids). A string, a list of boxes, or a
// conditional list [{ if, ifNot, lines }] whose last entry is the fallback. The four save points each name their own key:
// ep8_desk (the Stair), ep8_fountain (F1, F2, F3 fonts), ep8_index_bell (the Index), ep8_folio (the square, once lit).
// ------------------------------------------------------------------------------------------------
export const EP8_LINES = {
  ...Object.fromEntries(Object.values(EP8_REALMS).map((r) => [r.key, r.text])),

  // the save points
  ep8_desk: 'A reading desk with a lamp, on a landing of the stair. Sit a while, and the stair will keep your place.',
  ep8_fountain: 'The Restoring Fountain of Names. The water says a name as it falls. Rest here, and the Library will keep your place.',
  ep8_index_bell: 'A small brass bell on the Index counter. Ring it, and the Index will keep your place.',
  ep8_folio: [
    { if: 'concordance_lit', lines: 'The Concordance folio, lit under its glass. Rest a while; the street will keep your place.' },
    { lines: 'The Concordance folio: one great leaf of the book under glass, dark. Three witnesses light it.' },
  ],

  // ep7_stillheart (the pack patch) and ep8_stair
  ep8_stair_door: 'The first step of the stair of written light, at the edge of the broken roof. It holds.',
  ep8_script_step: 'A step of gold handwriting. Too bright to read, and warm underfoot.',
  ep8_void: [
    { if: 'scriptorium_open', lines: 'Violet, with gold motes rising through it. Somewhere far down, a line is being written again.' },
    { lines: 'Nothing. Violet, with gold motes rising through it, like dust in a sunbeam. It is not a floor.' },
  ],
  ep8_book_shut: 'A great shut book as long as a cart, a ribbon on each long side. It opens away from whoever reads it.',
  ep8_book_open: 'A great book standing open. Over nothing, its pages are a bridge. On floor, they are a wall.',
  ep8_rubbed_line: 'A step with nothing on it. Somebody rubbed this line out, and the stair forgot it was there.',
  ep8_margin_arch: [
    { if: 'scriptorium_open', lines: 'The South Margin gate. Down the stair to the roof, or on into the street.' },
    { lines: 'An arch at the top of the stair. Cut into it, in a careful hand: SOUTH MARGIN, WORLD ROAD.' },
  ],
  ep8_library_far: 'The First Library, filling the sky. Shelves taller than mountains circle one vast open book.',

  // ep8_scriptorium
  ep8_sign_a: [{ if: 'scriptorium_open', lines: 'A sign over a door: BOOKBINDER.' }, { lines: 'A sign over a door: BOOKB.' }],
  ep8_sign_b: [{ if: 'scriptorium_open', lines: 'A sign by the canal: INK AND CORD.' }, { lines: 'A sign by the canal: INK AN.' }],
  ep8_sign_c: [{ if: 'scriptorium_open', lines: 'A sign on the school: READING ROOM.' }, { lines: 'A sign on the school: READI.' }],
  ep8_sign_d: [{ if: 'scriptorium_open', lines: 'A sign on a tower: LAMPS LIT AT DUSK.' }, { lines: 'A sign on a tower: LAMPS LI.' }],
  ep8_sign_e: [{ if: 'scriptorium_open', lines: 'A sign on a bridge: MIND THE STEP.' }, { lines: 'A sign on a bridge: MIND T.' }],
  ep8_sign_f: [{ if: 'scriptorium_open', lines: 'A sign by the register: ALL NAMES WELCOME.' }, { lines: 'A sign by the register: ALL NA.' }],
  ep8_book_window: [
    { if: 'scriptorium_open', lines: 'A book open in a high window. It goes on to the end of its page, and over.' },
    { lines: 'A book open in a high window. Its sentence stops in the middle of a word.' },
  ],
  ep8_dry_pens: [
    { if: 'scriptorium_open', lines: 'Pens in the canal railing, dripping ink into the water. Somebody has been writing.' },
    { lines: 'Pens stand in the canal railing, one in every post. Every one of them is dry.' },
  ],
  ep8_ink_canal: 'An ink-dark canal round the square. The little bridges have letters cut into their rails.',
  ep8_living_codex: [
    { if: 'scriptorium_open', lines: ['The Living Codex. Every written life makes the First Library larger.', 'Its newest page is still wet.'] },
    { lines: ['The Living Codex. Every written life makes the First Library larger.', 'The Eraser believes an empty page is a peaceful page.'] },
  ],
  ep8_candle_post: [
    { if: 'scriptorium_open', lines: "One of Arun's candles, lit along the script-road. Its flame leans toward the Library." },
    { lines: 'A candle post along the script-road, unlit. The wick is new.' },
  ],
  ep8_blankets: [
    { if: 'elowen_met', lines: 'Grey infirmary blankets, airing. Each linen tag: a key across an open book, its bow cracked.' },
    { lines: 'A line of grey blankets, airing by the infirmary door. Each has a small linen tag.' },
  ],
  ep8_register: [
    { if: 'scriptorium_open', lines: 'The register of the Scriptorium. The line that ran is plain writing now. Elowen has read it many times.' },
    { if: 'elowen_met', lines: 'The register of the Scriptorium. One line, sixteen springs back, is a brown blot that ran.' },
    { lines: 'A great register on the desk under the awning. Every name in the street, in many hands.' },
  ],
  ep8_bindery: 'Bolts of bookcloth in the bindery, and a needle left in a half-sewn spine.',
  ep8_infirmary_door: 'The infirmary door, shut. Through it, the smell of clean wool and lamp-oil.',
  ep8_library_gate: [
    { if: 'page_shelved', lines: "The Library's great door, open. The seal on it is an open book with one line written in it." },
    { if: 'library_open', lines: "The Library's great door, open. The seal is an open book with nothing written in it." },
    { lines: "The Library's great door: a seal as tall as a house, an open book with nothing written in it." },
  ],
  ep8_lexicon_door: [
    { if: 'page_shelved', lines: 'A door straight up to the Last Word. The Library leaves it open now.' },
    { lines: 'A door straight up to the Last Word. It is shut.' },
  ],
  sign_ep8_inn: "THE KEEPER'S QUIET ROOMS. BEDS UNDER BOOKS.",
  sign_ep8_shop: 'BIBLIOTHECA SUPPLIES. INK, CORD AND WHAT A READER NEEDS.',
  sign_ep8_atelier: 'THE GLYPHSMITH ATELIER. TORN VOLUMES RESTORED.',
  sign_ep8_index: [
    { if: 'keeper_named', lines: 'THE FIRST LIBRARY INDEX. Under it, in a cold hand, newly written: OPEN.' },
    { lines: 'THE FIRST LIBRARY INDEX. Under it: CLOSED TO NEW NAMES.' },
  ],

  // ep8_sc_index
  ep8_card_drawers: [
    { if: 'keeper_named', lines: 'Card drawers to the ceiling, every one pulled open. He is reading them, one at a time.' },
    { lines: 'Card drawers to the ceiling. Every drawer has a label. Nearly every label has a name.' },
  ],
  ep8_index_desk: [
    { if: 'keeper_named', lines: 'The high desk. On it, a cracked key and a pen, laid down side by side.' },
    { if: 'librarian_met', lines: 'The high desk. A stamp in the corner: a key laid across an open book. Its bow is cracked.' },
    { lines: 'A high desk with a lamp, a pen, and a stamp.' },
  ],
  ep8_back_door: [
    { if: 'keeper_named', lines: 'The door behind the desk, open. A stair goes up into the Library.' },
    { lines: 'A narrow door behind the desk. Locked from the other side.' },
  ],
  ep8_first_drawer: 'The first drawer of the Index. One card: The original record was deliberately left unfinished so its ending could be chosen.',

  // ep8_library_f1
  ep8_drawer_wall: 'A wall of card drawers. Every label is a name somebody filed away so it would not hurt.',
  ep8_alcove: 'An alcove of drawers labelled with no names. Every erased name is stored in a separate alcove.',
  ep8_dash_drawers: 'A stack of drawers, cracked down one side. A hard enough run at it would split it.',
  ep8_north_shelf: [
    { if: 'ink_key_found', lines: 'The northern shelf. A gap where a key lay, and dust in the shape of it.' },
    { lines: 'The northern shelf, high over the violet. A gold chest sits at the end of it.' },
  ],
  ep8_doorway: [
    { if: 'keeper_memory_a', lines: 'A doorway in the Catalog, open on nothing. Names are windows. Not chains.' },
    { lines: 'A doorway in the wall of drawers, standing open, with nothing on the other side.' },
  ],

  // ep8_library_f2
  ep8_overwritten: 'Pages written over pages. The old writing shows faintly through the new. The Library revises its own pages.',
  ep8_printing_room: [
    { if: 'keeper_memory_b', lines: 'A printing room. On the great desk, an old order in a cold hand: Take every name that hurts to hear.' },
    { lines: 'A printing room. A great desk, and a row of smaller ones, all empty.' },
  ],
  ep8_page_names: 'An evidence page, labelled THE NAMES. A list of people, every one of them filed as a mistake.',
  ep8_page_order: 'An evidence page, labelled THE ORDER. Take every name that hurts to hear. The cold hand.',
  ep8_page_correction: 'An evidence page, labelled THE CORRECTION. In a warm hand: Not without a living witness.',
  ep8_archive_shelf: [
    { if: 'archive_open', lines: 'The Archive of Uncensored Lives, open. Three evidence pages on its shelf.' },
    { lines: 'A locked shelf with three page-shaped slots: THE ARCHIVE OF UNCENSORED LIVES.' },
  ],
  ep8_seal_gallery: [
    { if: 'sentry_defeated', lines: 'The Seal Gallery. A blank faceplate lies where something stood its watch.' },
    { lines: 'The Seal Gallery. Something tall stands at the far end, very still.' },
  ],

  // ep8_library_f3
  ep8_blank_page: 'A floor of white page. Not blank: waiting.',
  ep8_see: 'Cut in gold over the stair: SEE.',
  ep8_shelter: 'Cut in gold over the stair: SHELTER.',
  ep8_choose: 'Cut in gold over the stair: CHOOSE.',
  ep8_charter: [
    'The Charter of the Living Lexicon, cut in the wall:',
    'First SEE the truth of a person. Then SHELTER their right to exist.',
    'Finally let them CHOOSE the name and future that they carry. A name is never a chain.',
  ],
  ep8_keyhole: [
    { if: 'name_told', lines: 'The Original Ink Keyhole, the key turned in it. Its bow is cracked.' },
    { if: 'ink_key_found', lines: 'The Original Ink Keyhole. The Original Ink Key fits it.' },
    { lines: 'A keyhole of old ink in a high door: the Original Ink Keyhole. It wants a key of the same ink.' },
  ],
  ep8_hidden_ink: "A book in the Keepers' hidden ink, there only in the lantern's light.",

  // ep8_last_word
  ep8_great_lexicon: [
    { if: 'page_shelved', lines: 'The First Lexicon, open at its last page. The page is empty, ready for the next story.' },
    { if: 'lexicon_restored', lines: 'The First Lexicon, open. Names move on its pages, going home.' },
    { lines: 'A vast open book on a dais, glowing like a lamp. Every entry in the Library passes through it.' },
  ],
  ep8_first_shelf: [
    { if: 'page_shelved', lines: 'The first shelf of the Library, every place full. Yours is the one in the middle.' },
    { lines: 'The first shelf of the Library, every place full but one, the width of a single page.' },
  ],
  ep8_star_dome: [
    { if: 'eighth_star', lines: 'Seven stars and their signs, and the eighth, lit at last: an open book with one line in it.' },
    { lines: 'A dome of seven stars, each with its sign, turning slowly back toward an eighth with no sign.' },
  ],
  ep8_lectern: [
    { if: 'keeper_named', lines: 'The lectern before the great book. A pen lies on it, put down.' },
    { lines: 'A lectern before the great book, worn smooth by one pair of hands.' },
  ],

  // ep8_bell_night
  ep8_keep_one: 'Cut into the old wood of the bell beam, worn almost smooth, two words: KEEP ONE.',
  ep8_bell_listen: 'The top step of the bell tower. Stand still, and listen: twelve, and then one more.',
};

/**
 * Two older inspect lines gain an Episode 8 state (the pack mutates the shared LINES entry; the old text stays the
 * fallback, so nothing changes before the flag): Hazel's blanket gains its third line after ep8_complete (EPISODE8 beat
 * 31), and Saffron Haven's mural its eighth sign after eighth_star.
 */
export const EP8_LINE_STATES = {
  home_blanket: { if: 'ep8_complete', add: 'A linen tag in the other corner: a key on an open book. You know whose office that was now, and who chose the name.' },
  ep5_mural: { if: 'eighth_star', replace: ['A mural of seven wandering stars, each with its own sign, all turning back toward an eighth.',
    'The eighth has a sign now: an open book with one line written in it.'] },
};

// ------------------------------------------------------------------------------------------------
// Books (plan 4 and 7): keeper_hid (the Archive, F2), living_charter (F3, by the keyhole: the canon Charter, word for
// word), concordance_folio (the square).
// ------------------------------------------------------------------------------------------------
export const EP8_BOOKS = {
  keeper_hid: {
    title: 'The Book the Keeper Hid', where: 'ep8_library_f2',
    pages: [
      'The Names. Everyone the Library was ordered to forget, in a cold hand, each one filed as a mistake.',
      'The Order. Take every name that hurts to hear. Signed with an open book with a key across it.',
      'The Correction. Under it, in a warm hand: Not without a living witness. Then nothing, for a hundred years.',
    ],
  },
  living_charter: {
    title: 'The Charter of the Living Lexicon', where: 'ep8_library_f3',
    pages: [
      'First SEE the truth of a person.',
      'Then SHELTER their right to exist.',
      'Finally let them CHOOSE the name and future that they carry. A name is never a chain.',
    ],
  },
  concordance_folio: {
    title: 'The Concordance Folio', where: 'ep8_scriptorium',
    pages: [
      "The Scriptorium's own leaf of the Concordance: every name in the street, entered here on its way up.",
      'An honest archive must record both joy and loss.',
      'Each binding hides one witness page. Somebody is always reading.',
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// First-time barks (plan 5.1, once per save). first_open: the first book opened (the Stair's willow). first_wall: the
// first page wall landed on floor. first_side: the first read that would pop pages back over the reader. first_pair: the
// first palimpsest pair (F2 B). would_fold: a read refused because the party stands on what would change. read_low_mp:
// Mira under 12 MP in a fight with an erasing foe (the one-time hint, EP8_BATTLE_TEXT.low_mp).
// ------------------------------------------------------------------------------------------------
export const EP8_BARKS = {
  first_open: [{ if: ['ep8_started', 'mira_joined'], lines: [m("It's a bridge. A paper Mother Willow.")] }],
  first_wall: [{ if: ['ep8_started', 'bram_joined'], lines: [b('Pages on the floor are walls. Pages over nothing are bridges.')] }],
  first_side: [{ if: ['ep8_started', 'mira_joined'], lines: [m('It opens away from whoever reads it. Go round.')] }],
  first_pair: [{ if: ['ep8_started', 'bram_joined'], lines: [b('Two books, one page. Only one of them gets to stand.')] }],
  would_fold: [{ if: ['ep8_started', 'mira_joined'], lines: [m("Not while we're standing on it.")] }],
  read_low_mp: [{ if: ['read_learned', 'mira_joined'], lines: [m('Keep something back to read us.')] }],
};

// ------------------------------------------------------------------------------------------------
// Bestiary (plan 6.2, 6.4, 6.5): the 11 new foes. Three lore lines each: what it is, what it does, what hurts it; every
// entry names its erasing moves (each rubs out the last command of whoever it hits; Defend slides the ink off).
// ------------------------------------------------------------------------------------------------
export const EP8_BESTIARY = {
  index_hound: {
    name: 'Index Hound', where: 'The Stair and the Catalog',
    lore: [
      'An ink-black hound with ribs like card drawers. It carries rubbed-out scraps in its jaws.',
      'Its Bite and its Fetch rub out whatever the one it bites did last. Quick on its feet.',
      'Fire and spears. Ice only stiffens it.',
    ],
  },
  margin_imp: {
    name: 'Margin Imp', where: 'The Stair and the Library',
    lore: [
      'An ink jelly with gold flecks, born in the margins of old books.',
      'Its Scribble rubs out the last thing you did. Its Smear blinds.',
      'Fire and light. Thunder only makes it giggle.',
    ],
  },
  paper_crane: {
    name: 'Folded Crane', where: 'The Stair and the Galleries',
    lore: [
      'A white folded-paper crane as big as a goose. It glides between the steps.',
      'Fold Dive and Crease both rub out what you did last, Crease on everyone at once. Hard to hit.',
      'Fire and arrows. Ice only crisps its folds.',
    ],
  },
  gnawing_bookworm: {
    name: 'Bookworm', where: 'The Catalog of Lost Lives',
    lore: [
      'A parchment grub with a gold head. It eats the ends of sentences.',
      'Its Gnaw rubs out your last command; it Curls up to guard, and sprays paper at everyone.',
      'Fire and axes. Swords and arrows slide off its shell.',
    ],
  },
  catalog_wraith: {
    name: 'Catalog Wraith', where: 'The Catalog and the Galleries',
    lore: [
      'A violet wraith trailing index cards. It files things away and does not say where.',
      'Its File Away rubs out the last thing you did. Chill Index cools the whole party.',
      'Fire and light. Ice and thunder are its own weather.',
    ],
  },
  inkbound_librarian: {
    name: 'Inkbound Librarian', where: 'The Galleries and the Unwritten Page',
    lore: [
      'Ink and gilt armor with a stamp for a hand. It keeps the stacks quiet.',
      'Shush silences. Overdue and its gathered Return Stamp both rub out your last command. Break the stamp.',
      'Fire and axes. Swords and ice do little.',
    ],
  },
  struck_page: {
    name: 'Struck-Out Page', where: 'The Unwritten Page',
    lore: [
      'A lost page of violet ink with a bar struck through it. It will not stay crossed out.',
      'Margin Line rubs out what you did last; it gathers a Struck Line on one of you. Break it.',
      'Fire and light. Thunder and ice only write more on it.',
    ],
  },
  unnamed_sentry: {
    name: 'The Unnamed Sentry', where: 'The Seal Gallery',
    lore: [
      'Gilt armor over ink, with a blank plate for a face: made to guard the seal, and given no name so it could not be talked off its post.',
      'Strike Out and Cancel rub out your last command. It Unwrites one of you: Mira can read them back before it lands.',
      'Fire and spears. Never the one it cannot find. At half its plate cracks and Struck-Out Pages flutter out.',
    ],
  },
  eraser: {
    name: 'The Eraser', where: 'The Last Word',
    lore: [
      'A tall shape in black robes, its face smooth and white, rubbed out. Once the First Keeper.',
      'Rub Out and Margin Sweep rub out your last commands. It Unwrites one of you; at the end, the Last Silence gathers.',
      'Spears and arrows at first. Behind its ward it remembers: then fire. Answer the silence; read the unwritten back.',
    ],
  },
  truth_grief: {
    name: 'Rejected Truth: Grief', where: 'The Last Word',
    lore: [
      'A small hooded figure made of wet pages. It weeps, and the Eraser mends while it does.',
      'Weep Ink mends the Eraser. Its Rub Out rubs out your last command.',
      'Fire. Ice only freezes the tears. While it stands, the Erasure Ward holds.',
    ],
  },
  truth_change: {
    name: 'Rejected Truth: Change', where: 'The Last Word',
    lore: [
      'A turning page with a door cut in it. It stands in front of the Eraser.',
      'Stand In takes the blows meant for him. Turn the Page rubs out every last command at once.',
      'Spears. Fire only turns it faster. While it stands, the Erasure Ward holds.',
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// Battle lines (for E8-battle's messages and E8-scene-ui's help window) and the boss cards with their arc lines
// (RESPONSIBILITY_ARC 3.6: each boss card names what the Library avoided). {name} is the named party member, {command} the
// command's menu word; the `_by` tables hold per-member wording (the hero is player-named and has no pronoun on screen).
// ------------------------------------------------------------------------------------------------
export const EP8_BOSS_CARDS = {
  unnamed_sentry: { name: 'THE UNNAMED SENTRY', sub: 'Keeper of the Palimpsest' },
  eraser: { name: 'THE ERASER', sub: 'Once the First Keeper' },
};
export const EP8_ARC_LINES = {
  unnamed_sentry: 'It guarded every page. Nobody told it whose.',
  eraser: 'He filed away every loss. Nobody asked about his.',
};
export const EP8_BATTLE_TEXT = {
  // Erasure (plan 6.3)
  rubbed: "{name}'s {command} is rubbed out.",
  rubbed_example: "Bram's Attack is rubbed out.",
  ink_slides: 'The ink slides off.',
  hero_kept: 'The ink will not take on {hero}.',
  rubbed_help: 'Rubbed out. Try something else.',
  rubbed_reason: 'Rubbed out',
  fresh_ink: 'Fresh Ink. Every rubbed-out line comes a turn closer back.',
  low_mp: 'Keep something back to read us.',
  // Read Aloud (plan 6.3)
  read_help: 'Read an ally back. Breaks an unwriting.',
  read_learn: "Mira learned Read Aloud. Read an ally's lines back: what was rubbed out returns, and an unwriting breaks.",
  read_cast: "Mira reads {name}'s lines back.",
  read_self: 'Mira reads her own lines back.',
  no_read: 'Nothing to read back.',
  // the Unwrite (plan 6.4, 6.5)
  unwrite_read: 'The {foe} begins to unwrite {name}.',
  can_read: 'Mira can read {name} back.',
  can_read_by: { mira: 'Mira can read herself back.', bram: 'Mira can read him back.' },
  unwrite_break: "Mira reads {name}'s name aloud. It stays.",
  unwrite_land: '{name} is Unwritten.',
  unwritten_end: "{name}'s lines come back.",
  no_unwrite_hero: 'It cannot find that name to unwrite.',
  thrown_back: 'The {foe} is thrown back.',
  // the Sentry's phase (plan 6.4)
  faceplate: "The Sentry's faceplate cracks. Struck-Out Pages flutter loose.",
  // the Eraser's phases (plan 6.5)
  ward_rises: 'The robes spread like two covers. Grief and Change step out. The Erasure Ward holds.',
  ward_holds: 'The Erasure Ward holds.',
  mend: 'Grief weeps ink. The Eraser mends.',
  stand_in: 'Change stands in the way.',
  ward_breaks: 'The ward breaks. The Keeper remembers.',
  remembers: 'The Keeper Remembers. Under the white, an old face, half drawn in gold.',
  phase4: 'The Eraser reveals its final form: a space where no name can survive.',
  silence_gather: 'The Eraser draws a breath. The page goes quiet.',
  can_answer: '{hero} can answer it.',
  silence_break: '{hero} answers to the name. The silence breaks.',
  silence_land: 'The Last Silence. The page goes white.',
};

const LINE_ORIG = {};   // the shipped value of each line EP8_LINE_STATES touches (for a test to put back)
/** Give the older lines their Episode 8 state, once (the shipped value stays the fallback). */
export function patchLines(LINES = STORY.LINES) {
  for (const [id, st] of Object.entries(EP8_LINE_STATES)) {
    const cur = LINES[id];
    if (cur == null || (Array.isArray(cur) && cur[0] && cur[0].ep8)) continue;
    LINE_ORIG[id] = cur;
    const base = Array.isArray(cur) ? cur : [cur];
    const lines = st.add ? [...base, st.add] : [st.replace].flat();
    LINES[id] = [{ if: st.if, lines, ep8: true }, { lines: cur }];
  }
  return LINE_ORIG;
}
export function unpatchLines(LINES = STORY.LINES) { for (const [id, v] of Object.entries(LINE_ORIG)) { LINES[id] = v; delete LINE_ORIG[id]; } }

export function register() {
  for (const [id, v] of Object.entries(EP8_BANNERS)) if (!(id in BANNERS)) BANNERS[id] = v;
  for (const [id, v] of Object.entries(EP8_BOOKS)) if (!(id in BOOKS)) BOOKS[id] = v;
  for (const [id, v] of Object.entries(EP8_BARKS)) if (!(id in BARKS)) BARKS[id] = v;
  for (const [id, v] of Object.entries(EP8_BESTIARY)) if (!(id in BESTIARY)) BESTIARY[id] = v;
  STORY.registerStory({ scenes: {}, lines: EP8_LINES, conditions: {} });
  patchLines();
}

export default register;
