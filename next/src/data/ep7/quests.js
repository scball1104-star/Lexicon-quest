// Episode 7, "The Vanishing World": the main quest MAIN_QUEST_EP7 (plan 5.3; the journal and Talk follow it from ep7_started
// through the core seam QUEST_EXT), the three side quests, their rewards (REWARDS_EP7) and the banter for the pack's maps.
// register() pushes the side quests onto ALL_SIDE_QUESTS, assigns the banter, puts ['ep7_started', MAIN_QUEST_EP7] at the
// FRONT of QUEST_EXT when it is not there yet (an Episode 7 save also has ep6_started, and the first match wins; E7-pack's
// hooks.js does the same and skips when it sees the entry), and, while EP7_LIVE, puts the Talk opener in front that points
// an Episode 6 finisher at the Cloudhouse Inn's door and the north dock, holds every older hint on Zephyr Landing's maps
// until the party has boarded, and gives Episode 6's last step (epilogue6) that one step in its journal (PLAYTEST_REVIEW_7
// item 10, the Episode 5 and 6 mornings' fix). Idempotent.
//
// Talk entries, first match wins: map-aware ones first (Mira's and Bram's voices), a fallback with no map last. Every
// step names the next thing to do ("Read Bo's stone, then Nyx's"), including after ep7_complete (the Hearth, the Reliquary,
// Torr's streets, Snowrest on Aeris's chart). The stone names here are the text keys' names (text.js EP7_STONES).

import * as Q from '../quests.js';
import * as EPISODES from '../../game/episodes.js';
import { MAIN_QUEST_EP6 } from '../ep6/quests.js';

const { ALL_SIDE_QUESTS, BANTER, TALK_PREPEND } = Q;

export const REWARDS_EP7 = {
  white_road: { item: 'white_road_letter', qty: 1, why: "Episode 6's letter for Willowmere: given in ep7_morning without it; taken in doors_reopen" },
  valewyn_list: { item: 'valewyn_list', qty: 1, why: 'The Valewyn list with his own name at the top, from Vex (name_under_ice)' },
  fragment: { item: 'name_fragment_7', qty: 1, why: 'The Stillheart (phantom_after)' },
  seventh_list: { item: 'seventh_list', qty: 1, why: 'The seventh list, frozen into the floor where the Phantom knelt (phantom_after)' },
  gift_truth: { item: 'open_gate', qty: 1, why: "Nox's gift, truth path (doors_reopen, told_nox)" },
  gift_kind: { item: 'kept_lamp', qty: 1, why: "Nox's gift, kind path (doors_reopen, no told_nox)" },
  hearth: { item: 'hi_potion', qty: 2, gold: 400, why: 'The Hearth of Returning Names (hearth_light): 400 gold and 2 Hi-Potions' },
  hearth_ether: { item: 'hi_ether', qty: 2, why: 'The Hearth of Returning Names (hearth_light): 2 Hi-Ethers' },
  hearth_coat: { item: 'winterwatch_coat', qty: 1, why: 'The Hearth of Returning Names, the set piece (hearth_light)' },
  witness_page: { item: 'witness_page', qty: 3, why: 'The three witness pages, set into the Reliquary lid (ep7_reliquary)' },
  reliquary: { item: 'hi_ether', qty: 2, gold: 450, why: 'The Keeper Emergency Reliquary (its F2 gold chest: 450 gold, 2 Hi-Ethers, book keeper_book)' },
  street_plaque: { item: 'street_plaque', qty: 3, why: "Torr's three street plaques, handed back (streets_done)" },
  streets: { item: 'snowrest_scarf', qty: 1, why: "Torr's Missing Streets (streets_done)" },
};

const m = (text) => ({ who: 'mira', text });
const b = (text) => ({ who: 'bram', text });

const ZL_MAPS = ['ep6_zephyr', 'ep6_zl_inn', 'ep6_zl_shop', 'ep6_zl_workshop', 'ep6_zl_charts'];
const ROAD = ['ep7_white_road', 'ep7_waystation'];
const PH_MAPS = ['ep7_palehaven', 'ep7_ph_inn', 'ep7_ph_shop', 'ep7_ph_armory', 'ep7_ph_watch'];
const VAULT = ['ep7_vault_f1', 'ep7_vault_f2', 'ep7_vault_f3', 'ep7_stillheart'];
const TESTIMONIES = ['testimony_mirael', 'testimony_sol', 'testimony_eira'];
const PAGES = ['page_door_found', 'page_flame_found', 'page_lost_found'];
const STREETS = ['street_1_found', 'street_2_found', 'street_3_found'];

export const MAIN_QUEST_EP7 = {
  id: 'main_ep7',
  title: 'The Vanishing World',
  steps: [
    {
      id: 'north', title: 'The Fading Chart', aim: 'Board the Kestrel, north dock', done: 'road_arrived',
      aimIf: { if: 'ep7_boarded', aim: 'Fly north' },
      journal: "The north of Aeris's chart is going pale while we watch. The Kestrel waits at the north dock, Vex aboard.",
      chat: [
        { map: 'ep6_zl_charts', ifNot: 'ep7_boarded', lines: [
          m('Down the tower stair and out. The Kestrel is at the north dock.'),
        ] },
        { map: ZL_MAPS, ifNot: 'ep7_boarded', lines: [
          b('The north dock, past the board. Aeris has the Kestrel ready.'),
          m('Step onto the gangway. Vex is already in the fourth seat.'),
        ] },
        { map: ZL_MAPS, lines: [m('Step onto the gangway again. Aeris will take us north.')] },
        { lines: [m('The Kestrel is moored at the north dock of Zephyr Landing.')] },
      ],
    },
    {
      id: 'road', title: 'The White Road', aim: 'Climb the White Road', done: 'palehaven_arrived',
      aimIf: { if: 'call_learned', aim: 'Climb to the Icegate' },
      journal: 'A pale road up into the mountains, with stretches the North has forgotten. Palehaven is at the top.',
      chat: [
        { map: 'ep7_white_road', ifNot: 'vex_carved', lines: [
          m('Up the road. Vex stopped at that wall of ice with the names in it. Let\'s catch him up.'),
        ] },
        { map: 'ep7_white_road', ifNot: 'road_fight_done', lines: [
          m('Something is moving in the snow above the wall. If your name starts to frost, Defend.'),
        ] },
        { map: 'ep7_white_road', ifNot: 'first_stone_read', lines: [
          b("Up to the first white gap. There's a man tying twine to a stake by it."),
        ] },
        { map: 'ep7_white_road', ifNot: 'call_learned', lines: [
          m("Read Asta's stone and cross. Then Bo's stone, and Nyx's on the ledge."),
          b('We can only hold two. Asta goes when we take a third, and she is behind us.'),
        ] },
        { map: 'ep7_waystation', lines: [m('Rest by the stove if we need it. Sol sells things at the counter. Then on up.')] },
        { map: 'ep7_white_road', ifNot: 'saw_sevens', lines: [
          m("Read Senna's stone, past where the snow came sideways. Bo's path lets go behind us. That's fine."),
          b("Then the hut by the road. It's warmer than out here. Anything is."),
        ] },
        { map: 'ep7_white_road', lines: [
          b('North to the Icegate at the top of the road. Palehaven is through it.'),
          m('And there is a strongbox behind the Waystation, if nobody has taken it.'),
        ] },
        { lines: [m('The White Road, up from the frozen lake. Palehaven is at the top.')] },
      ],
    },
    {
      id: 'palehaven', title: 'Palehaven', aim: 'Find the Keeper', done: 'vault_entered',
      aimIf: { if: 'vault_open', aim: 'Go through the north gate' },
      journal: 'A town that will not say who left. The Keeper lights the lamps by hand. The compass points past her.',
      chat: [
        { map: ROAD, lines: [b('North, through the Icegate. Palehaven is right there.')] },
        { map: 'ep7_palehaven', ifNot: 'met_keeper', lines: [
          m('The old woman lighting the lamp, at the north end of the square. Ask her.'),
          b('And Eira at the Armory has coats. Warm ones. I am just saying.'),
        ] },
        { map: 'ep7_ph_watch', ifNot: 'keeper_told', lines: [m('Walk in a few steps. She is in her chair.')] },
        { map: PH_MAPS, ifNot: 'keeper_told', lines: [m('She went into the Keeper\'s Watch, at the north end. Let\'s go in after her.')] },
        { map: PH_MAPS, ifNot: 'vault_open', lines: [b('The north gate, past the square. She said she would open it.')] },
        { map: 'ep7_palehaven', lines: [
          b('Through the north gate and the pines. The Vault door is at the end. Vex has the step.'),
          m('Rimeplate for you two, a Snowveil Robe for me. The Armory has both.'),
        ] },
        { map: PH_MAPS, lines: [m('The north gate is open. The Vault is past the pines.')] },
        { lines: [m('Palehaven. The Keeper, the Watch, then the north gate.')] },
      ],
    },
    {
      id: 'vault_f1', title: 'The Vanishing Steps', aim: 'Find the way up', done: 'vault_f1_done',
      aimIf: { if: 'stillheart_key_found', aim: 'Ride the lift up' },
      journal: 'Galleries of frost brick over the white. A name stone on every landing. Somebody kept the list.',
      chat: [
        { map: PH_MAPS, lines: [b('The north gate, then the pines. The Vault door is at the end of the walk.')] },
        { map: 'ep7_vault_f1', if: 'stillheart_key_found', lines: [
          m('We have the Stillheart Key. The lift up is on the balcony. Ride it.'),
        ] },
        { map: 'ep7_vault_f1', if: 'keeper_memory_1', lines: [
          m("Two paths meet up on the landing. Read the one we need next again first, so the other is oldest."),
          b('Then the third stone. The old one goes. The balcony is north, past it.'),
        ] },
        { map: 'ep7_vault_f1', if: 'vault_f1_arrived', lines: [
          m("Read Arvo's stone and cross. Then Liesl's on the landing. Arvo's lets go behind us."),
          b('Read, cross, read, cross. I can do that.'),
        ] },
        { map: 'ep7_vault_f1', lines: [m('Rest at the basin first. Then the stones.')] },
        { lines: [m('The Vanishing Steps, the first floor. Every landing has a stone.')] },
      ],
    },
    {
      id: 'vault_f2', title: 'The Hall of Borrowed Light', aim: 'Cross the Hall', done: 'vault_f2_done',
      aimIf: { if: 'lantern_defeated', aim: 'Ride the lift up' },
      journal: 'A dark hall where a lamp burns over every name we hold. One name is holding a door shut.',
      chat: [
        { map: 'ep7_vault_f1', lines: [b('The lift on the balcony goes up to the Hall.')] },
        { map: 'ep7_vault_f2', if: 'lantern_defeated', lines: [
          m('The Lantern is out. Take the lift up from the lamp gallery. There is one down to the basin too.'),
        ] },
        { map: 'ep7_vault_f2', if: 'bell_found', lines: [
          m('The lamp gallery, south of the bay. Rest at the font by the arena door first.'),
          m('When it borrows one of us, call them back, {hero}. Before its turn.'),
        ] },
        { map: 'ep7_vault_f2', if: 'keeper_memory_2', lines: [
          b("The bell bay's north. It's dark. Read the stone on the near side; its lamp lights the way."),
        ] },
        { map: 'ep7_vault_f2', lines: [
          b("Dagny's door is holding on. Read Hakon's stone, then Runa's, and Dagny lets go."),
          m('Here the way on is to let a name go. Carefully.'),
        ] },
        { lines: [m('The Hall of Borrowed Light, the second floor. The dark shows what we hold.')] },
      ],
    },
    {
      id: 'vault_f3', title: 'The Stillheart Sanctum', aim: 'Climb the Sanctum', done: 'stillheart_open',
      aimIf: { if: 'keeper_came', aim: 'Reach the round door' },
      journal: 'The nave, from below: three landings, the aurora, and a white light at the top that does not move.',
      chat: [
        { map: 'ep7_vault_f2', lines: [b('The lift up from the lamp gallery. The Sanctum is above us.')] },
        { map: 'ep7_vault_f3', if: 'keeper_memory_3', lines: [
          m('Cross first, then read the second stone. It freezes a door behind us, and we are already over.'),
        ] },
        { map: 'ep7_vault_f3', if: 'vault_f3_arrived', lines: [
          m("Read Ylva's stone and go over. One stone, one crossing."),
          b('The font is on this landing. The lift down to the Hall still runs.'),
        ] },
        { map: 'ep7_vault_f3', lines: [m('Rest at the font on this landing first. Then up.')] },
        { lines: [m('The Stillheart Sanctum, the third floor. Three landings to the round door.')] },
      ],
    },
    {
      id: 'phantom', title: 'The White Phantom', aim: 'Face the White Phantom', done: 'phantom_defeated',
      journal: 'The round door is open. The Stillheart is through the grate, and something keeps it still.',
      chat: [
        { map: 'ep7_vault_f3', ifNot: 'stillheart_key_found', lines: [
          m("The grate wants the Stillheart Key. It's on the first floor's north balcony."),
          b('The lifts go down. We will be back.'),
        ] },
        { map: 'ep7_vault_f3', lines: [
          b("Hold Anders, cross, then read Ida's stone so he lets go and the door melts."),
          m('Then the round door. The Keeper is waiting by it.'),
        ] },
        { map: 'ep7_stillheart', if: 'hearth_lit', lines: [
          m('When it says goodbye to one of us, call them, {hero}. Before it lands.'),
          b("And the hearth in town is lit. We go in warm."),
        ] },
        { map: 'ep7_stillheart', lines: [
          m('When it says goodbye to one of us, call them, {hero}. Before it lands.'),
          b('Keep something back to call us. And Ember Tea, if the cold piles up.'),
        ] },
        { lines: [m('Through the round door and the grate, at the top of the Sanctum.')] },
      ],
    },
    {
      id: 'page', title: 'The Doors Reopen', aim: 'Go down to Palehaven', done: 'ep7_complete',
      aimIf: { if: 'doors_reopened', aim: 'Go up through the nave door' },
      journal: 'The Stillheart runs clear. The other half of the page waits in Palehaven, with Vex, on the gate step.',
      chat: [
        { map: 'ep7_stillheart', ifNot: 'page_whole', lines: [b('The door by the heart goes straight down to the square. Vex is waiting.')] },
        { map: VAULT, ifNot: 'page_whole', lines: [m('Up to the Stillheart. The door there goes straight down to town.')] },
        { map: 'ep7_palehaven', if: 'doors_reopened', lines: [
          m('The nave door, at the north end of the square. Nox said she would meet us at the top.'),
        ] },
        { map: PH_MAPS, if: 'doors_reopened', lines: [b('The nave door in the square. Up to the roof.')] },
        { lines: [m('Palehaven, the square. Then the nave door, up to the roof.')] },
      ],
    },
    {
      id: 'epilogue7', title: 'Up the Stair of Light', aim: 'Rest in the Keeper\'s Watch', done: null,
      journal: 'The North remembers. A stair of written light goes up from the roof. Episode 8 is not open yet.',
      chat: [
        { map: PH_MAPS, if: TESTIMONIES, ifNot: 'hearth_lit', lines: [
          m("We've heard all three witnesses. Light the hearth in the square."),
        ] },
        { map: PH_MAPS, if: 'hearth_started', ifNot: 'hearth_lit', lines: [
          b('The hearth wants three witnesses: Eira at the Armory, Mirael at her house, Sol on the road.'),
        ] },
        { map: PH_MAPS, ifNot: 'hearth_started', lines: [b('Eira, at the Armory. She wanted the hearth in the square lit.')] },
        { map: PH_MAPS, if: 'streets_started', ifNot: 'streets_done', lines: [
          b("Torr's plaques: one on the White Road by the second gap, two on the Vault's first floor."),
        ] },
        { map: PH_MAPS, ifNot: 'streets_started', lines: [m('Torr, on the steps of the Watch. The wind took his street plaques.')] },
        { map: PH_MAPS, ifNot: 'reliquary_open', lines: [
          m("The Reliquary, in the Hall's side galleries. Three pages, and two names held at once."),
          b('The lifts from the basin still run. Nox says so.'),
        ] },
        { map: PH_MAPS, lines: [
          b("Snowrest is back on Aeris's chart. Down at the lake she'll tell you all about it."),
          m('And the Armory has new steel. Nox says the cots by her stove are ours.'),
        ] },
        { map: VAULT, ifNot: 'reliquary_open', lines: [m("The Reliquary, in the Hall's side galleries. Hold their two names together.")] },
        { map: VAULT, lines: [b('The Vault is quiet now. The lifts still run down to the basin.')] },
        { lines: [
          m('The stair of light goes up from the roof. Nobody can take us there yet.'),
          b("The Keeper's Watch, then. Cots by a stove. I have dreamed of less."),
        ] },
      ],
    },
  ],
};

/** The QUEST_EXT entry (plan 5.3): mainQuestFor answers MAIN_QUEST_EP7 once ep7_started is set. */
export const QUEST_EXT_ENTRY = ['ep7_started', MAIN_QUEST_EP7];

export const SIDE_QUESTS_EP7 = [
  {
    id: 'returning_hearth', title: 'The Hearth of Returning Names', giver: 'eira', start: 'hearth_started', done: 'hearth_done',
    reward: REWARDS_EP7.hearth_coat.item,
    counter: { label: 'Witnesses heard', flags: TESTIMONIES },
    steps: [
      {
        id: 'witnesses', done: TESTIMONIES,
        journal: 'Eira wants three witnesses heard: Mirael the physician, Sol the trail scout, and Eira. Lv 29.',
        chat: [
          { ifNot: 'testimony_mirael', map: 'ep7_palehaven', lines: [m("Mirael, at her house in the south-west. Ask her about the Vault.")] },
          { ifNot: 'testimony_sol', map: ROAD, lines: [b('Sol is here somewhere. Ask him about the beacons.')] },
          { ifNot: 'testimony_sol', map: 'ep7_palehaven', lines: [b('Sol, down the White Road. The stake by the first gap, or the Waystation counter.')] },
          { lines: [m('Three witnesses: Mirael in Palehaven, Sol on the White Road, and Eira at the Armory.')] },
        ],
      },
      {
        id: 'light', done: 'hearth_done',
        journal: 'All three have spoken. Light the Hearth of Returning Names in the square.',
        chat: [
          { map: 'ep7_palehaven', lines: [m('The hearth in the square. Lay the first log and light it.')] },
          { lines: [m('Back to the hearth in Palehaven. The witnesses have spoken.')] },
        ],
      },
    ],
  },
  {
    id: 'keeper_reliquary', title: 'The Keeper Emergency Reliquary', giver: null, start: 'vault_f2_arrived', done: 'reliquary_open',
    reward: REWARDS_EP7.reliquary.item,
    counter: { label: 'Witness pages found', flags: PAGES },
    steps: [
      {
        id: 'pages', done: PAGES,
        journal: "Three witness pages lie in the Hall's side galleries: Open the Door, Share the Flame, Call the Lost.",
        chat: [
          { map: 'ep7_vault_f2', lines: [m('The side galleries, east. Three pages, any order.')] },
          { lines: [m("The witness pages are in the Hall's side galleries, on the second floor.")] },
        ],
      },
      {
        id: 'open', done: 'reliquary_open',
        journal: 'Behind a door of ice sits the Reliquary. Hold the side galleries\' two names at once and it melts.',
        chat: [
          { map: 'ep7_vault_f2', lines: [
            m("Hold Tuva and Kell together. The main road's names go, and the Reliquary's door melts."),
          ] },
          { lines: [m("The Reliquary is in the Hall's side galleries. Bring the three pages.")] },
        ],
      },
    ],
  },
  {
    id: 'missing_streets', title: "Torr's Missing Streets", giver: 'torr', start: 'streets_started', done: 'streets_done',
    reward: REWARDS_EP7.streets.item,
    counter: { label: 'Plaques found', flags: STREETS },
    steps: [
      {
        id: 'find', done: STREETS,
        journal: 'Three street plaques blew off Palehaven\'s walls: one on the White Road, two in the Vault\'s first floor.',
        chat: [
          { ifNot: 'street_1_found', map: 'ep7_white_road', lines: [b('The ledge west of the second gap. Hold two stones and walk out to it.')] },
          { ifNot: 'street_2_found', map: 'ep7_vault_f1', lines: [m('The side gallery, west. Hold Oskar and Liesl together, and it reaches.')] },
          { ifNot: 'street_3_found', map: 'ep7_vault_f1', lines: [b('A cracked ice crate on the balcony. I can fix cracked. With a run at it.')] },
          { lines: [m('One plaque on the White Road, two on the first floor of the Vault.')] },
        ],
      },
      {
        id: 'return', done: 'streets_done',
        journal: 'You have all three plaques. Take them back to Torr on the steps of the Keeper\'s Watch.',
        chat: [
          { map: 'ep7_palehaven', lines: [b('Torr, on the steps of the Watch. He has his book open already.')] },
          { lines: [m('Torr is on the steps of the Keeper\'s Watch in Palehaven.')] },
        ],
      },
    ],
  },
];

// One exchange per map, at most two boxes (plan 7: party chat banter). Never during a memory beat, never at Marten's or Mara's
// expense. The wall choice changes one line on the road above the wall (plan 7.3: the one Talk line).
const BOTH = ['mira_joined', 'bram_joined'];
export const BANTER_EP7 = {
  ep7_white_road: [
    { if: [...BOTH, 'told_vex'], lines: [m('You told him straight. He walked faster after.'), b('Lighter, maybe.')] },
    { if: [...BOTH, 'spared_vex'], lines: [m('All of it, you said. He knew.'), b('Still. Kind is kind.')] },
    { if: BOTH, lines: [b('Snow. Up. More snow. More up.'), m('And bits of road that are not there. Mind them.')] },
  ],
  ep7_waystation: [{ if: BOTH, lines: [b('A stove. A bench. I could live here.'), m('You said that about the inn on the sky island.')] }],
  ep7_palehaven: [
    { if: [...BOTH, 'doors_reopened'], lines: [m('Listen. Everyone is saying names. All morning.'), b('Loud town now. Good.')] },
    { if: BOTH, lines: [m('Half the doors have no name on them. Nobody looks at those doors.'), b('I keep looking.')] },
  ],
  ep7_ph_inn: [{ if: BOTH, lines: [b('Fur bedrolls. A stove. Frost on the inside of the window. Perfect.')] }],
  ep7_ph_shop: [{ if: BOTH, lines: [m('Ember Tea. It smells like a summer someone kept in a jar.')] }],
  ep7_ph_armory: [{ if: BOTH, lines: [b('Glass armor. In the cold. And it does not crack.'), m('Only when the story inside is forgotten.')] }],
  ep7_ph_watch: [
    { if: [...BOTH, 'doors_reopened'], lines: [m('Every letter in here is face up now.')] },
    { if: BOTH, lines: [m('Every letter in here is face down. She knows what they say.')] },
  ],
  ep7_vault_f1: [{ if: BOTH, lines: [b('Stairs that stop in the air. Who builds that?'), m('Somebody who forgot the rest.')] }],
  ep7_vault_f2: [{ if: BOTH, lines: [m('The lamps are ours. Whatever we hold, it lights.')] }],
  ep7_vault_f3: [{ if: BOTH, lines: [b('It is very quiet.'), m('So are we, then.')] }],
  ep7_stillheart: [{ if: [...BOTH, 'stillheart_restored'], lines: [m('Every name of the realm, running. You can almost hear them.')] }],
};

// While EP7_LIVE, an Episode 6 finisher who has not started Episode 7 hears about the inn and the north dock (ep7_morning
// runs on the next enter of ep6_zl_inn, and on the Chart Room's own enter). Fine Print runs never enter Episode 7.
export const TALK_OPENER_EP7 = {
  map: ZL_MAPS, if: 'ep6_complete', ifNot: ['ep7_started', 'tier_1'], lines: [
    m("Aeris was up in the Chart Room before dawn. Through the inn's door, and up the tower."),
    b('Then the north dock. The Kestrel has a fourth seat, and somebody in it.'),
  ],
};
export const TALK_OPENER_EP7_FAR = {
  if: 'ep6_complete', ifNot: ['ep7_started', 'tier_1'], lines: [
    m('Back to Zephyr Landing and the Cloudhouse Inn. Aeris was looking north when we left.'),
  ],
};

// The Zephyr morning (PLAYTEST_REVIEW_7 item 10): from ep6_complete until the party boards, Talk on Zephyr Landing's maps says
// the Episode 7 step and holds the rest: an empty entry put first in every other side quest's chat and in the Zephyr banter
// matches there and then, and says nothing.
export const MORNING_HOLD_EP7 = { map: ZL_MAPS, if: 'ep6_complete', ifNot: ['ep7_boarded', 'tier_1'], lines: [] };
function holdMorning() {
  for (const q of ALL_SIDE_QUESTS) {
    if (SIDE_QUESTS_EP7.includes(q)) continue;
    for (const st of q.steps || []) if (Array.isArray(st.chat) && !st.chat.includes(MORNING_HOLD_EP7)) st.chat.unshift(MORNING_HOLD_EP7);
  }
  for (const map of ZL_MAPS) if (Array.isArray(BANTER[map]) && !BANTER[map].includes(MORNING_HOLD_EP7)) BANTER[map].unshift(MORNING_HOLD_EP7);
}

// Episode 6's last step while Episode 7 is live: the journal names the one thing to do (the inn, then the north dock),
// instead of "Episode 7 is not open yet". The step object is Episode 6's (src/data/ep6/quests.js); only its journal and aim
// strings are swapped, and only while live. EPILOGUE6_OFF keeps the shipped words for a test to put back.
export const EPILOGUE6_LIVE = {
  aim: 'Rest at the Cloudhouse Inn',
  journal: 'The compass points north. Rest at the Cloudhouse Inn; at dawn, Aeris and the Kestrel at the north dock.',
};
export const EPILOGUE6_OFF = {};
function liveEpilogue6() {
  const st = MAIN_QUEST_EP6 && MAIN_QUEST_EP6.steps.find((x) => x.id === 'epilogue6');
  if (!st || st.journal === EPILOGUE6_LIVE.journal) return;
  if (!('journal' in EPILOGUE6_OFF)) Object.assign(EPILOGUE6_OFF, { aim: st.aim, journal: st.journal });
  Object.assign(st, EPILOGUE6_LIVE);
}

export function register(opts) {
  const on = opts && typeof opts.ep7Live === 'boolean' ? opts.ep7Live : EPISODES.EP7_LIVE === true;
  for (const q of SIDE_QUESTS_EP7) if (!ALL_SIDE_QUESTS.includes(q)) ALL_SIDE_QUESTS.push(q);
  for (const [map, entries] of Object.entries(BANTER_EP7)) if (!(map in BANTER)) BANTER[map] = entries;
  if (Array.isArray(Q.QUEST_EXT) && !Q.QUEST_EXT.some((e) => e && e[0] === 'ep7_started')) Q.QUEST_EXT.unshift(QUEST_EXT_ENTRY);
  if (on) {
    // in front of any older opener (first match wins), the map-aware one first
    TALK_PREPEND.unshift(...[TALK_OPENER_EP7, TALK_OPENER_EP7_FAR].filter((e) => !TALK_PREPEND.includes(e)));
    holdMorning();
    liveEpilogue6();
  }
}

export default register;
