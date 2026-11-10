// Episode 6, "The Skybound Isles": the main quest MAIN_QUEST_EP6 (plan 5.3; the journal and Talk follow it from ep6_started
// through the core seam QUEST_EXT), the three side quests, their rewards (REWARDS_EP6) and the banter for the pack's maps.
// register() pushes the side quests onto ALL_SIDE_QUESTS, assigns the banter, puts ['ep6_started', MAIN_QUEST_EP6] at the
// FRONT of QUEST_EXT when it is not there yet (an Episode 6 save also has ep5_started, and the first match wins; E6-pack's
// hooks.js does the same and skips when it sees the entry), and, while EP6_LIVE, puts the Talk opener in front that points
// an Episode 5 finisher at the Dune Lantern and the water stairs, and holds every older hint on the Haven's maps until the
// party has boarded (PLAYTEST_REVIEW_7 item 10, the Episode 5 morning's fix). Idempotent.
//
// Talk entries, first match wins: map-aware ones first (Mira's and Bram's voices), a fallback with no map last. Every
// step names the next thing to do ("Turn the vane, then ride the lane"), including after ep6_complete (the locker, the
// dead letters, the beacon, Pippa at the signal tower).

import * as Q from '../quests.js';
import * as EPISODES from '../../game/episodes.js';

const { ALL_SIDE_QUESTS, BANTER, TALK_PREPEND } = Q;

export const REWARDS_EP6 = {
  slip: { item: 'boarding_slip', qty: 1, why: 'The boarding slip with four seats, by a grey bird (ep6_morning)' },
  liora_letter: { item: 'liora_letter', qty: 1, why: "Liora's letter to her sister (chart_room), read under the lamp in fifth_voice" },
  pass: { item: 'windward_pass', qty: 1, why: "Aeris's brass token for the Observatory gate (east_gate)" },
  compass: { item: 'sky_compass', qty: 1, why: 'The Sky Compass, spinning, from Aeris (east_gate); steady from compass_restored' },
  sixth_list: { item: 'sixth_list', qty: 1, why: 'The sixth list, with no names, from Vex (vex_relay)' },
  fragment: { item: 'name_fragment_6', qty: 1, why: 'The Wind Script (scribe_after)' },
  gift_truth: { item: 'kestrel_wings', qty: 1, why: "Aeris's gift, truth path (isles_return, told_aeris)" },
  gift_hidden: { item: 'quiet_chime', qty: 1, why: "Aeris's gift, hidden path (isles_return, no told_aeris)" },
  beacon: { item: 'hi_potion', qty: 2, gold: 350, why: 'The Signal Beacon of Lost Flights (beacon_light): 350 gold and 2 Hi-Potions' },
  beacon_ether: { item: 'hi_ether', qty: 2, why: 'The Signal Beacon of Lost Flights (beacon_light): 2 Hi-Ethers' },
  beacon_coat: { item: 'skyhand_coat', qty: 1, why: 'The Signal Beacon of Lost Flights, the set piece (beacon_light)' },
  locker: { item: 'hi_ether', qty: 2, gold: 400, why: "The Sky Sailors' Emergency Locker (its F2 gold chest: 400 gold, 2 Hi-Ethers, book flight_logs)" },
  dead_letter: { item: 'dead_letter', qty: 3, why: "Piri's three dead letters, handed back (letters_done)" },
  letters: { item: 'silver_ribbon', qty: 1, why: "Piri's Dead Letters (letters_done)" },
  white_road: { item: 'white_road_letter', qty: 1, why: 'The old letter for Willowmere, never opened (letters_done)' },
};

const m = (text) => ({ who: 'mira', text });
const b = (text) => ({ who: 'bram', text });

const HAVEN_MAPS = ['ep5_saffron', 'ep5_sh_inn', 'ep5_sh_shop', 'ep5_sh_smithy', 'ep5_sh_observatory'];
const ZL_MAPS = ['ep6_zephyr', 'ep6_zl_inn', 'ep6_zl_shop', 'ep6_zl_workshop', 'ep6_zl_charts'];
const OBS_MAPS = ['ep6_obs_f1', 'ep6_obs_f2', 'ep6_obs_f3', 'ep6_obs_eyrie'];
const TESTIMONIES = ['testimony_liora', 'testimony_bennet', 'testimony_suri'];
const LOGS = ['log_1_found', 'log_2_found', 'log_3_found'];
const LETTERS = ['letter_1_found', 'letter_2_found', 'letter_3_found'];

export const MAIN_QUEST_EP6 = {
  id: 'main_ep6',
  title: 'The Skybound Isles',
  steps: [
    {
      id: 'crossing', title: 'The Boarding Slip', aim: "Board Yara's ship, water stairs", done: 'airstair_arrived',
      aimIf: { if: 'ep6_boarded', aim: 'Sail to the sea stacks' },
      journal: 'A grey bird brought a boarding slip with four seats, three of them ours. Yara sails from the water stairs.',
      chat: [
        { map: 'ep5_sh_inn', ifNot: 'ep6_boarded', lines: [
          m('Out the door, then down to the water stairs. Yara has her ship ready.'),
        ] },
        { map: HAVEN_MAPS, ifNot: 'ep6_boarded', lines: [
          b('Down to the water stairs, south of the Moonwell. Talk to Yara at the berth.'),
          m('Four seats. Somebody wants us up there.'),
        ] },
        { map: HAVEN_MAPS, lines: [m('Step onto the berth. Yara will cast off.')] },
        { lines: [m("Yara's ship waits at the water stairs in Saffron Haven.")] },
      ],
    },
    {
      id: 'airstair', title: 'The Airstair', aim: 'Climb the Airstair', done: 'zephyr_arrived',
      journal: 'A sea stack under the skyport, with rope stairs and a chain running up into the cloud. Climb it.',
      chat: [
        { map: 'ep6_airstair', ifNot: 'mira_asked', lines: [m("Up the rope stairs to the first landing. Wait for me there. I'd like a word.")] },
        { map: 'ep6_airstair', ifNot: 'airstair_fight_done', lines: [
          m('The second landing. Something is circling. When it gusts, Defend, or the wind throws us back.'),
        ] },
        { map: 'ep6_airstair', ifNot: 'saw_gust', lines: [b("The third landing. There's a man hanging off the chain up there. On purpose.")] },
        { map: 'ep6_airstair', ifNot: 'saw_isles', lines: [
          m('Step into the white lane and let it carry us. The post on the long lane stops us halfway.'),
          b('Then ride on from the post to the top. I am fine. Completely fine.'),
        ] },
        { map: 'ep6_airstair', lines: [b("North off the top of the stack. The town's at the end of the bridge.")] },
        { map: HAVEN_MAPS, lines: [b('The boat at the water stairs runs back to the stack. Yara said so.')] },
        { lines: [m('The Airstair, up from the sea stack. Zephyr Landing is on top.')] },
      ],
    },
    {
      id: 'zephyr', title: 'Zephyr Landing', aim: 'Find Captain Aeris, north dock', done: 'obs_entered',
      aimIf: { if: 'windward_pass', aim: 'Take the east airstair' },
      journal: 'A skyport whose board says every ship arrived. Find Aeris, see the chart room, then the east airstair.',
      chat: [
        { map: 'ep6_zephyr', ifNot: 'met_aeris', lines: [
          m('Captain Aeris, on the north dock by the airship. Ask her about the slip.'),
          b("And the woman at dock four. She hasn't looked away from that berth once."),
        ] },
        { map: 'ep6_zl_charts', ifNot: 'charts_seen', lines: [m('Walk in a few steps. Aeris is at the table.')] },
        { map: 'ep6_zephyr', ifNot: 'charts_seen', lines: [b("The chart room is in the beacon tower, north-west. Aeris said she'd meet us inside.")] },
        { map: ZL_MAPS, ifNot: 'charts_seen', lines: [m('The beacon tower, north-west. The chart room is inside.')] },
        { map: ZL_MAPS, ifNot: 'anchor_learned', lines: [m("Aeris went down to the east dock. Let's find her there. Mind the edge.")] },
        { map: ZL_MAPS, ifNot: 'windward_pass', lines: [b('The east airstair, past the east dock. Aeris is waiting at the gate.')] },
        { map: 'ep6_zephyr', lines: [
          b('Through the east gate with the Windward Pass. The causeway runs straight to the Observatory.'),
          m("Ballast Stones at Nova's first. One stone braces one of us through a gust."),
        ] },
        { map: ZL_MAPS, lines: [m('The east airstair, out of town. Nova sells Ballast Stones, if we want them.')] },
        { lines: [m('Zephyr Landing. Aeris, the chart room, the east dock, then the east airstair.')] },
      ],
    },
    {
      id: 'obs_f1', title: 'The Windward Causeways', aim: 'Find the way up', done: 'obs_f1_done',
      aimIf: { if: 'compass_key_found', aim: 'Ride the lift up' },
      journal: 'Decks on the cloud, and white wind between them. Where you step in decides where it puts you down.',
      chat: [
        { map: ZL_MAPS, lines: [b("The east airstair. The Observatory's at the end of the causeway.")] },
        { map: 'ep6_obs_f1', if: 'compass_key_found', lines: [
          m('We have the Sky Compass Key. The lift up is on the upper deck. Ride the lane north from the post.'),
        ] },
        { map: 'ep6_obs_f1', if: 'aeris_memory_1', lines: [
          m('Turn the vane back, then ride in from the west. The post by the key deck catches us.'),
          b('So the order is whatever we can reach. I can do reach.'),
        ] },
        { map: 'ep6_obs_f1', if: 'obs_f1_arrived', lines: [
          m('Step into the bent lane from the west ledge, not the south. It puts us down on the north deck.'),
          b('Then the vane on the far deck. Turn the vane, then ride the lane.'),
        ] },
        { map: 'ep6_obs_f1', lines: [m('Rest at the alcove spring first. Then the decks.')] },
        { lines: [m('The Windward Causeways, the first floor. Watch where the wind puts us down.')] },
      ],
    },
    {
      id: 'obs_f2', title: 'The Hall of Broken Signals', aim: 'Cross the Hall', done: 'obs_f2_done',
      aimIf: { if: 'engine_defeated', aim: 'Ride the lift up' },
      journal: 'A roofed hall of relays. The wind runs in the floor ducts now, and the fans decide which way.',
      chat: [
        { map: 'ep6_obs_f1', lines: [b('The lift on the upper deck goes up to the Hall.')] },
        { map: 'ep6_obs_f2', if: 'engine_defeated', lines: [
          m("The Engine's quiet. Take the lift up from the bellows hall. There's a lift down to the alcove too."),
        ] },
        { map: 'ep6_obs_f2', if: 'vex_relay_met', lines: [
          b('The bellows hall is south of the crown relay. Drink at the spring before we go in.'),
          m('When it winds the bellows, Bram anchors us. Keep him standing.'),
        ] },
        { map: 'ep6_obs_f2', if: 'aeris_memory_2', lines: [
          m("Somebody's working on the crown relay, north. Ride the second fan's duct up to it."),
        ] },
        { map: 'ep6_obs_f2', lines: [
          m('Turn the first fan: its duct reaches the second. Then turn that one, and ride.'),
          b('Wind in the floor now. Lovely.'),
        ] },
        { lines: [m('The Hall of Broken Signals, the second floor. The fans move the wind.')] },
      ],
    },
    {
      id: 'obs_f3', title: 'The Eye of the Storm', aim: 'Climb the Eye', done: 'scribe_door_open',
      aimIf: { if: 'aeris_came', aim: 'Light the three lamps' },
      journal: 'A white spire inside the storm, three landings ringed with wind. At the top, a light that stays put.',
      chat: [
        { map: 'ep6_obs_f2', lines: [b('The lift up from the bellows hall. The Eye is above us.')] },
        { map: 'ep6_obs_f3', if: 'pledge_return', lines: [
          m("Climb to the beacon platform at the top. That light is somebody's lamp."),
        ] },
        { map: 'ep6_obs_f3', if: 'vex_held', lines: [
          b('The last ring has two halves. Turn both vanes the same way round, then ride the full circle to the post.'),
        ] },
        { map: 'ep6_obs_f3', if: 'pledge_listen', lines: [
          m('Cross the broken causeway north of this lamp. Vex went that way.'),
        ] },
        { map: 'ep6_obs_f3', if: 'pledge_anchor', lines: [
          m("This ring's post faces the wrong way. Turn the vane, and the ring runs back round to the stair."),
          b('It goes round. Pick a way and hold on.'),
        ] },
        { map: 'ep6_obs_f3', if: 'aeris_came', lines: [
          b('Ride the ring round the spire. The post by the stair catches us. Then walk up to the lamp.'),
        ] },
        { map: 'ep6_obs_f3', lines: [m('Rest at the spring on this landing first. Then up.')] },
        { lines: [m('The Eye of the Storm, the third floor. Three landings, three lamps.')] },
      ],
    },
    {
      id: 'scribe', title: 'The Storm Scribe', aim: 'Face the Storm Scribe', done: 'scribe_defeated',
      journal: 'The Sky Compass Keyhole stands behind the beacon lamp. The Storm Scribe writes every course from up there.',
      chat: [
        { map: 'ep6_obs_f3', ifNot: 'compass_key_found', lines: [
          m("The Keyhole wants the Sky Compass Key. It's on the first floor, on the upper deck."),
          b('The lifts go down. We will be back.'),
        ] },
        { map: ['ep6_obs_f3', 'ep6_obs_eyrie'], if: 'beacon_lit', lines: [
          b('When it rewrites the course, I anchor us. Keep me standing.'),
          m("And the beacon in town is lit. We go in with Fury to spare."),
        ] },
        { map: ['ep6_obs_f3', 'ep6_obs_eyrie'], lines: [
          b('When it rewrites the course, I anchor us. Keep me standing.'),
          m('If Bram gets hushed, a Ballast Stone braces one of us. Bring some.'),
        ] },
        { lines: [m('Through the Sky Compass Keyhole, at the top of the Eye.')] },
      ],
    },
    {
      id: 'library', title: 'The Cloud Library', aim: 'Board the Kestrel', done: 'isles_restored',
      aimIf: { if: 'library_reached', aim: 'Fly down to Zephyr Landing' },
      journal: 'Above the storm, a small library sits on the cloud. The Kestrel waits at the rim of the Eyrie.',
      chat: [
        { map: 'ep6_library', lines: [b("The Kestrel's door. Back down to Zephyr Landing. Vex is already in his seat.")] },
        { map: 'ep6_obs_eyrie', lines: [b("The Kestrel's at the rim. Aeris says climb aboard.")] },
        { map: OBS_MAPS, lines: [m('Up to the Eyrie. The Kestrel is waiting at the rim.')] },
        { lines: [m('The Kestrel waits at the rim of the Eyrie, above the Eye.')] },
      ],
    },
    {
      id: 'epilogue6', title: 'Toward the North', aim: 'Rest at the Cloudhouse Inn', done: null,
      journal: 'The isles fly true again. The compass points north, at the White Road. Episode 7 is not open yet.',
      chat: [
        { map: ZL_MAPS, if: TESTIMONIES, ifNot: 'beacon_lit', lines: [
          m("We've heard all three witnesses. Turn the brass ring at the beacon tower."),
        ] },
        { map: ZL_MAPS, if: 'beacon_started', ifNot: 'beacon_lit', lines: [
          b('The beacon wants three witnesses: Liora at dock four, Bennet on the docks, Suri in the chart room.'),
        ] },
        { map: ZL_MAPS, if: 'charts_seen', ifNot: 'beacon_started', lines: [b('Suri, in the chart room. She wanted help with that old beacon.')] },
        { map: ZL_MAPS, if: 'letters_started', ifNot: 'letters_done', lines: [
          b("Piri's letters: one on the Airstair by a post, two out on the first floor's decks."),
        ] },
        { map: ZL_MAPS, ifNot: 'letters_started', lines: [m('Piri, at the post rack by the board. The storm blew his letters away.')] },
        { map: ZL_MAPS, ifNot: 'locker_found', lines: [
          m("The Emergency Locker, on the Hall's side decks. Turn the side fan the way we didn't need."),
          b('The lifts from the alcove still run. Aeris says so.'),
        ] },
        { map: ZL_MAPS, lines: [
          b("Pippa's at the signal tower. She keeps the lights now. Let's go and say hello."),
          m('And the Galewing Workshop has new steel.'),
        ] },
        { map: OBS_MAPS, ifNot: 'locker_found', lines: [m("The locker on the Hall's side decks. The side fan, turned the other way.")] },
        { map: OBS_MAPS, lines: [b('The Observatory is quiet now. The lifts still run down to the alcove.')] },
        { lines: [
          m('The compass points north, at the White Road. Nobody can take us there yet.'),
          b('The Cloudhouse Inn, then. A hammock, and a roof over all that sky.'),
        ] },
      ],
    },
  ],
};

/** The QUEST_EXT entry (plan 5.3): mainQuestFor answers MAIN_QUEST_EP6 once ep6_started is set. */
export const QUEST_EXT_ENTRY = ['ep6_started', MAIN_QUEST_EP6];

export const SIDE_QUESTS_EP6 = [
  {
    id: 'signal_beacon', title: 'The Signal Beacon of Lost Flights', giver: 'suri', start: 'beacon_started', done: 'beacon_done',
    reward: REWARDS_EP6.beacon_coat.item,
    counter: { label: 'Witnesses heard', flags: TESTIMONIES },
    steps: [
      {
        id: 'witnesses', done: TESTIMONIES,
        journal: 'Suri wants the old witnesses heard: Liora at dock four, Bennet on the docks, and Suri. Lv 25.',
        chat: [
          { ifNot: 'testimony_liora', map: 'ep6_zephyr', lines: [m('Liora, at dock four. Ask her about the board.')] },
          { ifNot: 'testimony_bennet', map: 'ep6_zephyr', lines: [b('Bennet, on the docks by the board. He knows the old rules.')] },
          { lines: [m('Three witnesses: Liora at dock four, Bennet on the docks, Suri in the chart room.')] },
        ],
      },
      {
        id: 'light', done: 'beacon_done',
        journal: 'All three have spoken. Turn the brass ring of the Signal Beacon at the tower, and light it.',
        chat: [
          { map: 'ep6_zephyr', lines: [m('The beacon tower, north-west. Turn the brass ring and light it.')] },
          { lines: [m('Back to the beacon tower in Zephyr Landing. The witnesses have spoken.')] },
        ],
      },
    ],
  },
  {
    id: 'emergency_locker', title: "The Sky Sailors' Emergency Locker", giver: 'bennet', start: 'obs_f2_arrived', done: 'locker_found',
    reward: REWARDS_EP6.locker.item,
    counter: { label: 'Flight logs found', flags: LOGS },
    steps: [
      {
        id: 'locker', done: 'locker_found',
        journal: "Three flight logs lie on the Hall's side decks. The locker sits on a ledge, reached by the side fan.",
        chat: [
          { map: 'ep6_obs_f2', lines: [
            m('The side decks, east. Three logs, any order. The locker ledge wants the side fan turned.'),
          ] },
          { lines: [m("The Emergency Locker is on the Hall's side decks, on the second floor.")] },
        ],
      },
    ],
  },
  {
    id: 'dead_letters', title: "Piri's Dead Letters", giver: 'piri', start: 'letters_started', done: 'letters_done',
    reward: REWARDS_EP6.letters.item,
    counter: { label: 'Letters found', flags: LETTERS },
    steps: [
      {
        id: 'find', done: LETTERS,
        journal: 'Three letters blew out of Piri\'s sack: one on the Airstair by a post, two on the Windward Causeways.',
        chat: [
          { ifNot: 'letter_1_found', map: 'ep6_airstair', lines: [b('The long lane with the post. Stop at the post and step off west.')] },
          { ifNot: 'letter_2_found', map: 'ep6_obs_f1', lines: [m('The dead-end deck behind the second vane, near the top. Turn it and ride.')] },
          { ifNot: 'letter_3_found', map: 'ep6_obs_f1', lines: [b("A cracked crate on a deck. I can fix cracked. With my spear.")] },
          { lines: [m('One letter on the Airstair, by a post. Two on the first floor of the Observatory.')] },
        ],
      },
      {
        id: 'return', done: 'letters_done',
        journal: 'You have all three letters. Take them back to Piri at the post rack in Zephyr Landing.',
        chat: [
          { map: 'ep6_zephyr', lines: [b('Piri, at the post rack by the board. He has birds waiting.')] },
          { lines: [m('Piri is at the post rack in Zephyr Landing.')] },
        ],
      },
    ],
  },
];

// One exchange per map, at most two boxes (plan 7: party chat banter). Never at Pippa's expense. The Airstair choice
// changes one line on the Observatory's first floor (plan 7.3: Mira's Talk line).
const BOTH = ['mira_joined', 'bram_joined'];
export const BANTER_EP6 = {
  ep6_airstair: [{ if: BOTH, lines: [
    b('A rope. Over the sea. In the wind. Who builds a town up a rope?'),
    m('People who like the view, Bram.'),
  ] }],
  ep6_zephyr: [
    { if: [...BOTH, 'isles_restored'], lines: [
      m('Listen. Every chime in the town. They were tied up a whole month.'),
      b('Loud town. I like it.'),
    ] },
    { if: BOTH, lines: [
      m('The board says ARRIVED, and the ships keep going out and coming back without landing.'),
      b('Whole town flying in circles. I know the feeling.'),
    ] },
  ],
  ep6_zl_inn: [{ if: BOTH, lines: [b('Hammocks. Over clouds. I am going to sleep standing up.')] }],
  ep6_zl_shop: [{ if: BOTH, lines: [m('Ballast Stones. A rock that holds you down. Bram, you would love these.')] }],
  ep6_zl_workshop: [{ if: BOTH, lines: [b('Propellers on the walls. A forge with a fan. My dad would never leave.')] }],
  ep6_zl_charts: [{ if: BOTH, lines: [m('Every chart in this room is drawn in the same hand. Every one points the wrong way.')] }],
  ep6_obs_f1: [
    { if: [...BOTH, 'mira_told'], lines: [m("Still scared. Still saying so. It's working."), b('Me too. Mostly about the wind.')] },
    { if: [...BOTH, 'mira_spared'], lines: [m("You're very calm for someone walking into a storm."), b('I am not. For the record.')] },
    { if: BOTH, lines: [b('Planks on cloud. Nothing under them but more cloud.')] },
  ],
  ep6_obs_f2: [{ if: BOTH, lines: [m('Every relay is still saying something. All of it wrong.'), b('Like a market. Loud and wrong.')] }],
  ep6_obs_f3: [{ if: BOTH, lines: [b('It is very dark, and very loud, and very far down.'), m('So look up.')] }],
  ep6_obs_eyrie: [{ if: BOTH, lines: [m('Quills, writing by themselves. Every line a course.')] }],
  ep6_library: [{ if: BOTH, lines: [m('Weather logs. Every flight there ever was. I could stay a year.'), b('You say that about every library.')] }],
};

// While EP6_LIVE, an Episode 5 finisher who has not started Episode 6 hears about the inn and the water stairs (ep6_morning
// runs on the next enter of ep5_sh_inn). Fine Print runs never enter Episode 6.
export const TALK_OPENER_EP6 = {
  map: HAVEN_MAPS, if: 'ep5_complete', ifNot: ['ep6_started', 'tier_1'], lines: [
    m("Something's tapping at the Dune Lantern's shutter. Let's go and see."),
    b("Then the water stairs. Yara's ship is still tied up there."),
  ],
};
export const TALK_OPENER_EP6_FAR = {
  if: 'ep5_complete', ifNot: ['ep6_started', 'tier_1'], lines: [
    m('Back to Saffron Haven, the Dune Lantern. Then the water stairs, where Yara keeps her ship.'),
  ],
};

// The Haven morning (PLAYTEST_REVIEW_7 item 10): from ep5_complete until the party boards, Talk on the Haven's maps says the
// Episode 6 step and holds the rest: an empty entry put first in every other side quest's chat and in the Haven banter
// matches there and then, and says nothing.
export const MORNING_HOLD = { map: HAVEN_MAPS, if: 'ep5_complete', ifNot: ['ep6_boarded', 'tier_1'], lines: [] };
function holdMorning() {
  for (const q of ALL_SIDE_QUESTS) {
    if (SIDE_QUESTS_EP6.includes(q)) continue;
    for (const st of q.steps || []) if (Array.isArray(st.chat) && !st.chat.includes(MORNING_HOLD)) st.chat.unshift(MORNING_HOLD);
  }
  for (const map of HAVEN_MAPS) if (Array.isArray(BANTER[map]) && !BANTER[map].includes(MORNING_HOLD)) BANTER[map].unshift(MORNING_HOLD);
}

export function register(opts) {
  const on = opts && typeof opts.ep6Live === 'boolean' ? opts.ep6Live : EPISODES.EP6_LIVE === true;
  for (const q of SIDE_QUESTS_EP6) if (!ALL_SIDE_QUESTS.includes(q)) ALL_SIDE_QUESTS.push(q);
  for (const [map, entries] of Object.entries(BANTER_EP6)) if (!(map in BANTER)) BANTER[map] = entries;
  if (Array.isArray(Q.QUEST_EXT) && !Q.QUEST_EXT.some((e) => e && e[0] === 'ep6_started')) Q.QUEST_EXT.unshift(QUEST_EXT_ENTRY);
  if (on) {
    // in front of any older opener (first match wins), the map-aware one first
    TALK_PREPEND.unshift(...[TALK_OPENER_EP6, TALK_OPENER_EP6_FAR].filter((e) => !TALK_PREPEND.includes(e)));
    holdMorning();
  }
}

export default register;
