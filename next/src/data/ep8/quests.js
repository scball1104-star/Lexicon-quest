// Episode 8, "The Last Word": the main quest MAIN_QUEST_EP8 (plan 5.3; the journal and Talk follow it from ep8_started
// through the core seam QUEST_EXT), the three side quests, their rewards (REWARDS_EP8) and the banter for the pack's maps.
// register() pushes the side quests onto ALL_SIDE_QUESTS, assigns the banter, puts ['ep8_started', MAIN_QUEST_EP8] at the
// FRONT of QUEST_EXT when it is not there yet (an Episode 8 save also has ep7_started, and the first match wins; E8-pack's
// hooks.js does the same and skips when it sees the entry), and, while EP8_LIVE, puts the Talk opener in front that points
// an Episode 7 finisher at the Keeper's Watch and the nave door only, holds every older hint on Palehaven's maps until the
// party is on the roof, and gives Episode 7's last step (epilogue7) that one step in its journal (the Episode 6 and 7
// mornings' fix). Idempotent.
//
// Talk entries, first match wins: map-aware ones first (Mira's and Bram's voices), a fallback with no map last. Every step
// names the next action ("Open the willow book from this side; its pages fall away from you"), including after
// ep8_complete (the Deep Stacks, Fine Print, the missed side stories, the Ledger's faded names). The journal's last entry is
// the canon line with the chosen ending's title: two last steps, one per ending (epilogue8 is current until ending_choose
// is set, epilogue8c after it), because a step's journal is one string.

import * as Q from '../quests.js';
import * as EPISODES from '../../game/episodes.js';
import { MAIN_QUEST_EP7 } from '../ep7/quests.js';

const { ALL_SIDE_QUESTS, BANTER, TALK_PREPEND } = Q;

export const REWARDS_EP8 = {
  vex_note: { item: 'vex_note', qty: 1, why: "Vex's note, handed over by Nox in the Keeper's Watch (ep8_morning)" },
  reader_card: { item: 'reader_card', qty: 1, why: "The reader's card from the Librarian at the Index (meet_librarian)" },
  fragment: { item: 'name_fragment_8', qty: 1, why: 'The First Lexicon (eraser_after)' },
  gift_truth: { item: 'binders_awl', qty: 1, why: "Elowen's gift, truth path (scriptorium_open, told_elowen)" },
  gift_kind: { item: 'riverwater_thread', qty: 1, why: "Elowen's gift, kind path (scriptorium_open, no told_elowen)" },
  concordance: { item: 'hi_potion', qty: 3, gold: 500, why: 'The Living Concordance (concordance_light): 500 gold and 3 Hi-Potions' },
  concordance_ether: { item: 'hi_ether', qty: 2, why: 'The Living Concordance (concordance_light): 2 Hi-Ethers' },
  concordance_coat: { item: 'bookcloth_coat', qty: 1, why: 'The Living Concordance, the set piece (concordance_light)' },
  evidence_page: { item: 'evidence_page', qty: 3, why: 'The three evidence pages, set into the Archive shelf (uncensored_archive)' },
  archive: { item: 'hi_ether', qty: 3, gold: 500, why: 'The Archive of Uncensored Lives (its F2 gold chest: 500 gold, 3 Hi-Ethers, book keeper_hid)' },
  drift_page: { item: 'drift_page', qty: 3, why: "Quinn's three drifting pages, handed back (drift_done)" },
  drift: { item: 'runners_ribbon', qty: 1, why: "Quinn's Drifting Pages (drift_done)" },
};

const m = (text) => ({ who: 'mira', text });
const b = (text) => ({ who: 'bram', text });

const PH_MAPS = ['ep7_palehaven', 'ep7_ph_inn', 'ep7_ph_shop', 'ep7_ph_armory', 'ep7_ph_watch'];
const SC_MAPS = ['ep8_scriptorium', 'ep8_sc_inn', 'ep8_sc_shop', 'ep8_sc_atelier', 'ep8_sc_index'];
const LIBRARY = ['ep8_library_f1', 'ep8_library_f2', 'ep8_library_f3', 'ep8_last_word'];
const TESTIMONIES = ['testimony_ione', 'testimony_fen', 'testimony_elowen'];
const EVIDENCE = ['page_names_found', 'page_order_found', 'page_correction_found'];
const DRIFT = ['drift_1_found', 'drift_2_found', 'drift_3_found'];

/** Bram's LEGACY retirement plan, word for word: his post-game Talk. */
export const BRAM_KITCHEN = 'After the First Library, I am finding a kitchen with strong walls and weak soup. That is my retirement plan.';
/** The canon after-clear line's third sentence: the finished journal's last entry. */
export const CLOSING_LINE = 'Your closing chapter is written in the Journal.';

// The post-game Talk (both last steps share it): missed side stories first, then the Deep Stacks, Fine Print, the Ledger.
const POSTGAME_CHAT = [
  { map: SC_MAPS, if: TESTIMONIES, ifNot: 'concordance_lit', lines: [m("We've heard all three witnesses. Light the Concordance folio in the square.")] },
  { map: SC_MAPS, if: 'concordance_started', ifNot: 'concordance_lit', lines: [
    b('The folio wants three witnesses: Ione at the Codex, Fen by the Index steps, Elowen at the register.'),
  ] },
  { map: SC_MAPS, ifNot: 'concordance_started', lines: [m('Ione, at the Living Codex. She wanted the folio in the square lit.')] },
  { map: SC_MAPS, if: 'drift_started', ifNot: 'drift_done', lines: [b("Quinn's pages: one on a ledge of the Stair, two on the Library's first floor.")] },
  { map: SC_MAPS, ifNot: 'drift_started', lines: [m('Quinn, at the South Margin gate. Some of his pages drifted off.')] },
  { map: [...SC_MAPS, ...LIBRARY], ifNot: 'archive_open', lines: [
    m("The Archive, in the Galleries' side rooms. Three evidence pages, any order."),
    b('The great door in the square goes straight to the Last Word now. The lifts still run.'),
  ] },
  { map: 'willowmere', lines: [
    m("The trapdoor in the library still goes down. The Deep Stacks don't end where we stopped."),
    b(BRAM_KITCHEN),
  ] },
  { lines: [
    m('Fine Print is on the title, under Continue: the first valley again, harder, with us as we are now.'),
    m('And the Ledger. A few names in it are still faded. Somebody should go and say them.'),
    b(BRAM_KITCHEN),
  ] },
];

export const MAIN_QUEST_EP8 = {
  id: 'main_ep8',
  title: 'The Last Word',
  steps: [
    {
      id: 'up', title: 'The Last Truth', aim: 'Go up through the nave door', done: 'stair_arrived',
      aimIf: { if: 'ep8_roofed', aim: 'Climb the stair of light' },
      journal: 'Vex has gone up the stair of light ahead of us. Nox is coming to the top. The nave door in the square goes up to the roof.',
      chat: [
        { map: 'ep7_ph_watch', lines: [m('Out of the Watch, and across the square to the nave door. The stair starts on the roof.')] },
        { map: PH_MAPS, lines: [b('The nave door, at the north end of the square. Up to the roof.')] },
        { map: 'ep7_stillheart', lines: [m('The first step is by the broken roof. Nox is waiting at it.')] },
        { lines: [m('Palehaven, the nave door in the square. Then up to the roof, and the stair.')] },
      ],
    },
    {
      id: 'stair', title: 'The Stair of Written Light', aim: 'Climb the Stair', done: 'saw_scriptorium',
      aimIf: { if: 'eraser_seen', aim: 'Reach the South Margin' },
      journal: 'Steps of gold handwriting up into the violet, with gaps where lines were rubbed out. The Library is at the top.',
      chat: [
        { map: 'ep7_stillheart', lines: [b('The stair door, by the broken roof. Up we go.')] },
        { map: 'ep8_stair', ifNot: 'first_rub_done', lines: [
          m('Up the steps. Something is coming down them. If it rubs something out, use something else.'),
        ] },
        { map: 'ep8_stair', ifNot: 'first_book_read', lines: [b('Up to the first gap. There is a book lying at the edge of it.')] },
        { map: 'ep8_stair', ifNot: 'eraser_seen', lines: [
          m('Open the willow book from this side; its pages fall away from you. Then cross.'),
          b('The ledge book would open back over us. Go round by the narrow ledge, and read it from the far side.'),
        ] },
        { map: 'ep8_stair', lines: [
          m('The long gap: open its book, cross, then close it from the far side. Pages on the stair are walls.'),
          b('Then up to the gate at the top. The South Margin.'),
        ] },
        { lines: [m('The Stair of Written Light, up from the Stillheart roof.')] },
      ],
    },
    {
      id: 'scriptorium', title: 'The Scriptorium', aim: 'Find the Index', done: 'library_open',
      aimIf: { if: ['card_read', 'elowen_met'], aim: 'Go to the Library door' },
      journal: 'A street at the foot of the Library where nothing new is finished. The Index at the north end wrote the cards.',
      chat: [
        { map: 'ep8_stair', lines: [b('North, through the South Margin gate. The street is right below it.')] },
        { map: 'ep8_scriptorium', ifNot: 'read_learned', lines: [m('The girl on the school steps, by the square. She has a book open on her knees.')] },
        { map: 'ep8_sc_index', ifNot: 'librarian_met', lines: [m('Walk in a few steps. He is at the high desk.')] },
        { map: SC_MAPS, ifNot: 'librarian_met', lines: [
          b('The Index, at the north end. The door into the card drawers. The old man there gives out cards.'),
        ] },
        { map: SC_MAPS, ifNot: 'elowen_met', lines: [
          m('The register house in the square, under the awning. The Keeper there writes down every name in the street.'),
        ] },
        { map: SC_MAPS, lines: [
          b("The Library's great door, at the north end of the street. The empty seal. Nox will open it."),
          m('Vellum Plate for you two, a Glyphweave Robe for me. Sorel has both, at the Atelier.'),
        ] },
        { lines: [m('The Scriptorium. The school steps, the Index, the register, then the great door.')] },
      ],
    },
    {
      id: 'library_f1', title: 'I. The Catalog of Lost Lives', aim: 'Find the way up', done: 'library_f1_done',
      aimIf: { if: 'ink_key_found', aim: 'Ride the lift up' },
      journal: 'Walls of card drawers over the violet, and a great shut book on every landing. Who filed all these away?',
      chat: [
        { map: SC_MAPS, lines: [b('The great door at the north end. It is open now.')] },
        { map: 'ep8_library_f1', if: 'ink_key_found', lines: [m('We have the Original Ink Key. The lift up is on the northern shelf. Ride it.')] },
        { map: 'ep8_library_f1', if: 'keeper_memory_a', lines: [
          m('The forge book bridges the gap and walls the corridor behind. Cross, then close it from the far side.'),
          b('Then the mirror book, up to the northern shelf. The key is in the gold chest there.'),
        ] },
        { map: 'ep8_library_f1', if: 'lib_f1_arrived', lines: [
          m('Two books, one corridor. Open the first, cross, close it. Then open the second.'),
          b('One at a time. Like doors.'),
        ] },
        { map: 'ep8_library_f1', lines: [m('Rest at the fountain first. Then the books.')] },
        { lines: [m('The Catalog of Lost Lives, the first floor.')] },
      ],
    },
    {
      id: 'library_f2', title: 'II. The Palimpsest Galleries', aim: 'Cross the Galleries', done: 'library_f2_done',
      aimIf: { if: 'sentry_defeated', aim: 'Ride the lift up' },
      journal: 'Pages written over pages. Here the books come in pairs: open one, and the other one shuts.',
      chat: [
        { map: 'ep8_library_f1', lines: [b('The lift on the northern shelf goes up to the Galleries.')] },
        { map: 'ep8_library_f2', if: 'sentry_defeated', lines: [
          m('The Sentry is down. Take the lift up past the arena. The one down to the fountain runs too.'),
        ] },
        { map: 'ep8_library_f2', if: 'keeper_memory_b', lines: [
          b('The wrong book is open across the gallery door. Open its pair, the desert book, and it folds.'),
          m("When it starts to unwrite one of us, I'll read them back. Keep me standing."),
        ] },
        { map: 'ep8_library_f2', if: 'lib_f2_arrived', lines: [
          m('Open the keep book and cross. Then open its pair from the island. The first one folds behind us.'),
        ] },
        { lines: [m('The Palimpsest Galleries, the second floor.')] },
      ],
    },
    {
      id: 'library_f3', title: 'III. The Unwritten Page', aim: 'Climb to the keyhole', done: 'name_told',
      aimIf: { if: 'keeper_memory_c', aim: 'Reach the keyhole' },
      journal: 'White pages over the violet, three landings: SEE, SHELTER, CHOOSE. A door with a keyhole of old ink at the top.',
      chat: [
        { map: 'ep8_library_f2', lines: [b('The lift up from the Seal Gallery. The last floor is above us.')] },
        { map: 'ep8_library_f3', ifNot: 'ink_key_found', lines: [
          m("The keyhole wants the Original Ink Key. It's in the gold chest on the first floor's northern shelf."),
          b('The lifts go down. We will be back.'),
        ] },
        { map: 'ep8_library_f3', if: 'keeper_memory_c', lines: [
          m('SHELTER: the Kestrel book bridges and walls. Cross, then open its pair, the North book, and it folds.'),
          b('Then CHOOSE. Either book. Both go up.'),
        ] },
        { map: 'ep8_library_f3', if: 'lib_f3_arrived', lines: [
          m('SEE: the book behind the pillar. Walk round it until you face its long side.'),
        ] },
        { lines: [m('The Unwritten Page, the third floor. The keyhole is at the top.')] },
      ],
    },
    {
      id: 'eraser', title: 'The Last Word', aim: 'Go through the ink door', done: 'eraser_defeated',
      journal: 'Nox said the name at the keyhole: ours. The door is open on gold light. Somebody is waiting with a pen.',
      chat: [
        { map: 'ep8_library_f3', lines: [b('Through the door by the keyhole. Rest at the font first. I mean it.')] },
        { map: 'ep8_last_word', if: 'concordance_lit', lines: [
          m('When it unwrites one of us, I read them back. When it goes quiet, {hero}, answer it.'),
          b('And the folio is lit. We go in with our blood up.'),
        ] },
        { map: 'ep8_last_word', lines: [
          m('When it unwrites one of us, I read them back. When it goes quiet, {hero}, answer it.'),
          b('Fresh Ink if the rub-outs pile up. I will stand in front of Mira.'),
        ] },
        { lines: [m('The Last Word, through the ink door at the top of the third floor.')] },
      ],
    },
    {
      id: 'ending', title: 'The First Lexicon', aim: 'Go down to the square', done: 'scriptorium_open',
      journal: 'The First Lexicon is open, and the first page is on its shelf. The street below is waiting.',
      chat: [
        { map: 'ep8_last_word', lines: [m('The door by the shelf goes straight down to the square.')] },
        { map: LIBRARY, lines: [b('Up to the Last Word. Its door goes down to the square.')] },
        { lines: [m('The Scriptorium, through the Library door.')] },
      ],
    },
    {
      id: 'home', title: 'Home', aim: 'Go to the South Margin', done: 'ep8_complete',
      aimIf: { if: 'home_reached', aim: 'Climb the bell tower' },
      journal: 'Every sign in the street is finished. Aeris said she would be on the roof. Hazel will want to know.',
      chat: [
        { map: SC_MAPS, lines: [m('The South Margin gate, at the south end. Then the stair down, and Aeris on the roof.')] },
        { map: 'ep8_bell_night', lines: [m('Up the stair. Every step is a bell.')] },
        { lines: [b('Home. The South Margin first.')] },
      ],
    },
    {
      id: 'epilogue8', title: 'Ending: Every Name Returned', aim: null, done: 'ending_choose',
      journal: `Ending: Every Name Returned. ${CLOSING_LINE}`,
      chat: POSTGAME_CHAT,
    },
    {
      id: 'epilogue8c', title: 'Ending: The Right to Choose', aim: null, done: null,
      journal: `Ending: The Right to Choose. ${CLOSING_LINE}`,
      chat: POSTGAME_CHAT,
    },
  ],
};

/** The QUEST_EXT entry (plan 5.3): mainQuestFor answers MAIN_QUEST_EP8 once ep8_started is set. */
export const QUEST_EXT_ENTRY = ['ep8_started', MAIN_QUEST_EP8];

export const SIDE_QUESTS_EP8 = [
  {
    id: 'living_concordance', title: 'The Living Concordance', giver: 'ione', start: 'concordance_started', done: 'concordance_done',
    reward: REWARDS_EP8.concordance_coat.item,
    counter: { label: 'Witnesses heard', flags: TESTIMONIES },
    steps: [
      {
        id: 'witnesses', done: TESTIMONIES,
        journal: 'Ione wants three witnesses heard: Ione at the Living Codex, Fen by the Index steps, and Elowen at the register. Lv 31.',
        chat: [
          { ifNot: 'testimony_fen', map: 'ep8_scriptorium', lines: [b('Fen, by the Index steps. Ask him about the list.')] },
          { ifNot: 'testimony_elowen', map: 'ep8_scriptorium', lines: [m('Elowen, at the register house. Ask her about the bindings.')] },
          { lines: [m('Three witnesses: Ione at the Codex, Fen by the Index steps, Elowen at the register.')] },
        ],
      },
      {
        id: 'light', done: 'concordance_done',
        journal: 'All three have spoken. Open the Concordance folio in the square.',
        chat: [
          { map: 'ep8_scriptorium', lines: [m('The folio by the Living Codex. Open it.')] },
          { lines: [m('Back to the folio in the Scriptorium. The witnesses have spoken.')] },
        ],
      },
    ],
  },
  {
    id: 'uncensored_archive', title: 'The Archive of Uncensored Lives', giver: null, start: 'lib_f2_arrived', done: 'archive_open',
    reward: 'keeper_hid',
    counter: { label: 'Evidence pages found', flags: EVIDENCE },
    steps: [
      {
        id: 'pages', done: EVIDENCE,
        journal: "Three evidence pages lie in the Galleries' side rooms: The Names, The Order, The Correction. Any order.",
        chat: [
          { map: 'ep8_library_f2', lines: [m('The side galleries, east. Three pages, any order.')] },
          { lines: [m("The evidence pages are in the Galleries' side rooms, on the second floor.")] },
        ],
      },
      {
        id: 'open', done: 'archive_open',
        journal: 'Behind a wall of pages sits the Archive. Turn the side gallery pair the other way and the wall folds.',
        chat: [
          { map: 'ep8_library_f2', lines: [b("Open the side pair's other book. The wall in front of the Archive folds.")] },
          { lines: [m("The Archive is in the Galleries' side rooms. Bring the three pages.")] },
        ],
      },
    ],
  },
  {
    id: 'drifting_pages', title: "Quinn's Drifting Pages", giver: 'quinn', start: 'drift_started', done: 'drift_done',
    reward: REWARDS_EP8.drift.item,
    counter: { label: 'Pages found', flags: DRIFT },
    steps: [
      {
        id: 'find', done: DRIFT,
        journal: "Three of Quinn's pages drifted out of the stacks: one on a ledge of the Stair, two on the Library's first floor.",
        chat: [
          { ifNot: 'drift_1_found', map: 'ep8_stair', lines: [b('The side ledge by the second gap. The ledge book reaches it.')] },
          { ifNot: 'drift_2_found', map: 'ep8_library_f1', lines: [m('The side alcove, west. A wall of pages in front of it: close its book.')] },
          { ifNot: 'drift_3_found', map: 'ep8_library_f1', lines: [b('A cracked drawer stack on the northern shelf. I can fix cracked. With a run at it.')] },
          { lines: [m("One page on the Stair, two on the Library's first floor.")] },
        ],
      },
      {
        id: 'return', done: 'drift_done',
        journal: 'You have all three pages. Take them back to Quinn at the South Margin gate.',
        chat: [
          { map: 'ep8_scriptorium', lines: [b('Quinn, at the South Margin gate. He has his satchel open already.')] },
          { lines: [m('Quinn is at the South Margin gate in the Scriptorium.')] },
        ],
      },
    ],
  },
];

// One exchange per map, at most two boxes. Never during a memory beat, never at Elowen's expense, never in the Last Word
// before the Eraser falls, never about the vault fire.
const BOTH = ['mira_joined', 'bram_joined'];
export const BANTER_EP8 = {
  ep8_stair: [
    { if: [...BOTH, 'afraid_yes'], lines: [m('You said yes, up there. So did she.'), b('Brave people say yes.')] },
    { if: BOTH, lines: [b('Do not look down.'), m('There is no down. That is the trouble.')] },
  ],
  ep8_scriptorium: [
    { if: [...BOTH, 'scriptorium_open'], lines: [m('Every sign says its whole word now. Listen to it.'), b('BOOKBINDER. I knew it.')] },
    { if: BOTH, lines: [b('BOOKB. I want to know what the rest is.'), m('So does the sign.')] },
  ],
  ep8_sc_inn: [{ if: BOTH, lines: [b('Beds under shelves. I am going to dream in footnotes.')] }],
  ep8_sc_shop: [{ if: BOTH, lines: [m('Fresh Ink. It smells like a new page.')] }],
  ep8_sc_atelier: [{ if: BOTH, lines: [b('Gilt tools. I am not touching anything.'), m('Good.')] }],
  ep8_sc_index: [{ if: BOTH, lines: [m('Every drawer has a name on it. Nearly every one.')] }],
  ep8_library_f1: [{ if: BOTH, lines: [b('That many drawers. Who files all this?'), m('Somebody who could not stop.')] }],
  ep8_library_f2: [{ if: BOTH, lines: [m('Two books, one page. Only one gets to stand.')] }],
  ep8_library_f3: [{ if: BOTH, lines: [b('It is very white up here.'), m('Unwritten. Not empty.')] }],
  ep8_last_word: [{ if: [...BOTH, 'lexicon_restored'], lines: [m('Every name in it, back. You can hear the pages.')] }],
};

// While EP8_LIVE, an Episode 7 finisher who has not started Episode 8 hears about the Watch and the nave door (ep8_morning
// runs on the next enter of the Keeper's Watch). Fine Print runs never enter Episode 8.
export const TALK_OPENER_EP8 = {
  map: [...PH_MAPS, 'ep7_stillheart'], if: 'ep7_complete', ifNot: ['ep8_started', 'tier_1'], lines: [
    m('Nox was up before dawn in the Watch. Back inside first.'),
    b('Then the nave door in the square, up to the roof and the stair.'),
  ],
};
export const TALK_OPENER_EP8_FAR = {
  if: 'ep7_complete', ifNot: ['ep8_started', 'tier_1'], lines: [
    m("Back to Palehaven and the Keeper's Watch. Nox said to ask her at the top."),
  ],
};

// The Palehaven morning: from ep7_complete until the party is on the roof, Talk on Palehaven's maps says the Episode 8 step
// and holds the rest: an empty entry put first in every other side quest's chat and in Palehaven's banter matches there
// and then, and says nothing.
export const MORNING_HOLD_EP8 = { map: [...PH_MAPS, 'ep7_stillheart'], if: 'ep7_complete', ifNot: ['ep8_roofed', 'tier_1'], lines: [] };
function holdMorning() {
  for (const q of ALL_SIDE_QUESTS) {
    if (SIDE_QUESTS_EP8.includes(q)) continue;
    for (const st of q.steps || []) if (Array.isArray(st.chat) && !st.chat.includes(MORNING_HOLD_EP8)) st.chat.unshift(MORNING_HOLD_EP8);
  }
  for (const map of [...PH_MAPS, 'ep7_stillheart']) if (Array.isArray(BANTER[map]) && !BANTER[map].includes(MORNING_HOLD_EP8)) BANTER[map].unshift(MORNING_HOLD_EP8);
}

// Episode 7's last step while Episode 8 is live: the journal names the one thing to do (the Watch, then the nave door),
// instead of "Episode 8 is not open yet". The step object is Episode 7's (src/data/ep7/quests.js); only its journal, aim
// and chat are swapped (the chat to the Watch's door and the nave door only), and only while live. EPILOGUE7_OFF keeps the
// shipped values for a test to put back.
export const EPILOGUE7_LIVE = {
  aim: "Go back to the Keeper's Watch",
  journal: "The stair of written light goes up from the roof. Nox is in the Keeper's Watch; then the nave door, and up.",
  chat: [
    { map: 'ep7_ph_watch', lines: [m('Nox is up. Then out, and across the square to the nave door.')] },
    { map: PH_MAPS, lines: [b("The Keeper's Watch, at the north end. Then the nave door, up to the roof.")] },
    { lines: [m("Palehaven, the Keeper's Watch. Then the nave door.")] },
  ],
};
export const EPILOGUE7_OFF = {};
function liveEpilogue7() {
  const st = MAIN_QUEST_EP7 && MAIN_QUEST_EP7.steps.find((x) => x.id === 'epilogue7');
  if (!st || st.journal === EPILOGUE7_LIVE.journal) return;
  if (!('journal' in EPILOGUE7_OFF)) Object.assign(EPILOGUE7_OFF, { aim: st.aim, journal: st.journal, chat: st.chat });
  Object.assign(st, EPILOGUE7_LIVE);
}

export function register(opts) {
  const on = opts && typeof opts.ep8Live === 'boolean' ? opts.ep8Live : EPISODES.EP8_LIVE === true;
  for (const q of SIDE_QUESTS_EP8) if (!ALL_SIDE_QUESTS.includes(q)) ALL_SIDE_QUESTS.push(q);
  for (const [map, entries] of Object.entries(BANTER_EP8)) if (!(map in BANTER)) BANTER[map] = entries;
  if (Array.isArray(Q.QUEST_EXT) && !Q.QUEST_EXT.some((e) => e && e[0] === 'ep8_started')) Q.QUEST_EXT.unshift(QUEST_EXT_ENTRY);
  if (on) {
    // in front of any older opener (first match wins), the map-aware one first
    TALK_PREPEND.unshift(...[TALK_OPENER_EP8, TALK_OPENER_EP8_FAR].filter((e) => !TALK_PREPEND.includes(e)));
    holdMorning();
    liveEpilogue7();
  }
}

export default register;
