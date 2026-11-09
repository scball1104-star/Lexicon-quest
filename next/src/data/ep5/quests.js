// Episode 5, "The Last Prophecy": the main quest MAIN_QUEST_EP5 (plan 5.3; the journal and Talk follow it from ep5_started
// through the core seam QUEST_EXT), the three side quests, their rewards (REWARDS_EP5) and the banter for the pack's maps.
// register() pushes the side quests onto ALL_SIDE_QUESTS, assigns the banter, puts ['ep5_started', MAIN_QUEST_EP5] at the
// FRONT of QUEST_EXT when it is not there yet (an Episode 5 save also has ep4_started, and the first match wins; E5-pack's
// hooks.js does the same and skips when it sees the entry), and, while EP5_LIVE, puts the Talk opener in front that
// points an Episode 4 finisher at the ship at the south landing. Idempotent.
//
// Talk entries, first match wins: map-aware ones first (Mira's and Bram's voices), a fallback with no map last. Every
// step names the next thing to do, including after ep5_complete (the Moonwell, the bells, the reliquary, Omar's road).

import * as Q from '../quests.js';
import { EP5_LIVE } from '../../game/episodes.js';

const { ALL_SIDE_QUESTS, BANTER, TALK_PREPEND } = Q;

export const REWARDS_EP5 = {
  letter: { item: 'star_letter', qty: 1, why: "Sel's star letter, carried north by Yara (ep5_morning)" },
  gnomon: { item: 'gnomon', qty: 1, why: "Sel's brass pin for the Labyrinth's sundials (sel_gate)" },
  fifth_list: { item: 'fifth_list', qty: 1, why: 'The desert list, from Vex (vex_gallery)' },
  ishra_page: { item: 'ishra_page', qty: 1, why: "Ishra's page, from under the last spring (sel_memory_3)" },
  fragment: { item: 'name_fragment_5', qty: 1, why: 'The Star Chart (oracle_after)' },
  gift_truth: { item: 'caravan_compass', qty: 1, why: "Sel's gift, truth path (every_road, star_restored)" },
  gift_hidden: { item: 'veiled_star', qty: 1, why: "Sel's gift, hidden path (every_road, no star_restored)" },
  roads: { item: 'hi_ether', qty: 2, gold: 300, why: 'Three Roads Home (moonwell_wake): 300 gold and 2 Hi-Ethers' },
  roads_mantle: { item: 'nomad_mantle', qty: 1, why: 'Three Roads Home, the set piece (moonwell_wake)' },
  reliquary: { item: 'hi_ether', qty: 2, gold: 300, why: 'The Lost Traveler Reliquary (the F2 cache chest: 300 gold, 2 Hi-Ethers, book travelers_log)' },
  bell: { item: 'caravan_bell', qty: 3, why: "Hassan's three caravan bells, taken back (bells_done)" },
  bells: { item: 'copperwind_bell', qty: 1, why: "Hassan's Bells (bells_done)" },
};

const m = (text) => ({ who: 'mira', text });
const b = (text) => ({ who: 'bram', text });

const VW_MAPS = ['ep4_valewyn', 'ep4_vw_inn', 'ep4_vw_shop', 'ep4_vw_forge', 'ep4_vw_palace'];
const HAVEN_MAPS = ['ep5_saffron', 'ep5_sh_inn', 'ep5_sh_shop', 'ep5_sh_smithy', 'ep5_sh_observatory'];
const LAB_MAPS = ['ep5_lab_f1', 'ep5_lab_f2', 'ep5_lab_f3', 'ep5_lab_oracle'];
const TESTIMONIES = ['testimony_yara', 'testimony_kamal', 'testimony_nasrin'];
const BELLS = ['bell_1_found', 'bell_2_found', 'bell_3_found'];

export const MAIN_QUEST_EP5 = {
  id: 'main_ep5',
  title: 'The Last Prophecy',
  steps: [
    {
      id: 'crossing', title: 'The Saffron Wind', aim: "Board Yara's ship, south landing", done: 'road_landed',
      aimIf: { if: 'ship_boarded', aim: 'Cross the sea' },
      journal: "Sel's star letter lost a name in the night. Yara sails at dusk from Valewyn's south landing. Go aboard.",
      chat: [
        { map: VW_MAPS, ifNot: 'ship_boarded', lines: [
          b("Yara's ship is at the south landing. She said dusk. She looked like she meant it."),
          m('Through the plaza and south, past the canal works. Talk to her at the berth.'),
        ] },
        { map: 'ep5_ship', ifNot: 'bram_asked', lines: [
          m("Bram went up to the bow. He wants to ask you something. Go on. I'll stay at the rail."),
        ] },
        { map: 'ep5_ship', ifNot: 'ship_first_fight_done', lines: [
          m('Sand on the wind. Walk back amidships, past the mast. Hit them before the sky turns.'),
        ] },
        { map: 'ep5_ship', lines: [b('The gangway is at the bow. Land. Solid ground. Please.')] },
        { lines: [m("South across the sea, on Yara's ship. The berth is at Valewyn's south landing.")] },
      ],
    },
    {
      id: 'road', title: 'The Caravan Road', aim: 'Follow the road to the Haven', done: 'haven_arrived',
      journal: 'An empty caravan road runs east over the dunes to Saffron Haven. On the Glass Flat, the sand runs in the sun.',
      chat: [
        { map: 'ep5_caravan_road', ifNot: 'saw_glass_flat', lines: [
          b('The road runs east to a white flat. Somebody is sitting in the shade of that tall stone.'),
        ] },
        { map: 'ep5_caravan_road', ifNot: 'tent_rested', lines: [
          m('Set the dial to dawn and walk the long shadow across the flat. The sun does the rest.'),
          b("There's a tent past the flat. A fire, in a desert. I want to see that."),
        ] },
        { map: 'ep5_caravan_road', ifNot: 'saw_haven', lines: [m('East, over the last dune. The road ends at the Haven.')] },
        { map: 'ep5_caravan_road', lines: [b('The Haven is just east, down the dune. Walk in.')] },
        { lines: [m('The Caravan Road runs east from the jetty to Saffron Haven.')] },
      ],
    },
    {
      id: 'haven', title: 'Saffron Haven', aim: 'Find Sel in the market court', done: 'lab_entered',
      aimIf: { if: 'met_sel', aim: 'Climb the Armillary Tower' },
      journal: 'A town that reads the sky, and has stopped walking. Find Sel, go up to the rings at night, then the north gate.',
      chat: [
        { map: 'ep5_saffron', ifNot: 'met_sel', lines: [
          m('Sel is in the northern market court, under a copper awning. North-west of the Moonwell.'),
          b('Ask her why the waystone keeps changing its mind.'),
        ] },
        { map: 'ep5_saffron', ifNot: 'star_reading_done', lines: [
          m("The Armillary Tower, north-east. Sel said tonight. It's always tonight here."),
          b("Laleh will show us. Sel's tired of being the one who says."),
        ] },
        { map: 'ep5_sh_observatory', ifNot: 'star_reading_done', lines: [m('Walk in a few steps. Laleh is at the rings.')] },
        { map: HAVEN_MAPS, ifNot: 'star_reading_done', lines: [b('The tower is north-east of the Moonwell. The big rings on the roof.')] },
        { map: 'ep5_saffron', ifNot: 'gnomon_get', lines: [
          b('The north gate. Sel will be there. She said she has something for the dials.'),
          m("Stock up first. Hourglass Sand, at Yasmin's. It holds the sky."),
        ] },
        { map: HAVEN_MAPS, ifNot: 'gnomon_get', lines: [m('The north gate, at the top of the town. Sel is waiting.')] },
        { map: 'ep5_saffron', lines: [b('Through the north gate. The nomad path goes straight up to the Labyrinth.')] },
        { map: HAVEN_MAPS, lines: [m('The north gate. The Labyrinth is up the nomad path.')] },
        { lines: [m('Saffron Haven. Sel in the market court, then the Armillary Tower, then the north gate.')] },
      ],
    },
    {
      id: 'lab_f1', title: 'The Shifting Dunes', aim: 'Find the stair down', done: 'lab_f1_done',
      aimIf: { if: 'sun_key_found', aim: 'Take the stair down' },
      journal: 'Roofless courts over running sand. Any sundial sets the hour for the whole floor. Sand holds in the shade.',
      chat: [
        { map: HAVEN_MAPS, lines: [b('North gate, then the nomad path. The Labyrinth is up there.')] },
        { map: 'ep5_lab_f1', if: 'sun_key_found', lines: [m('We have the Nomad Sun Key. The stair down is in the far court, north.')] },
        { map: 'ep5_lab_f1', if: 'plate_f1_open', lines: [
          m('The sun gate latched open at dawn. Set noon now: the obelisk lays its shade over the sand in front of it.'),
          b('Dawn opens it, noon walks it. I can hold two things in my head.'),
        ] },
        { map: 'ep5_lab_f1', if: 'dune_key_f1', lines: [
          b("A Dune Key. The locked door is west. Whatever's behind it wants the sun on it."),
        ] },
        { map: 'ep5_lab_f1', if: 'sel_memory_1', lines: [
          m('That standing stone sits on a groove. Shove it north to the channel, then set the dial to dawn.'),
          b('Move the stone, move the shade.'),
        ] },
        { map: 'ep5_lab_f1', lines: [
          m('Two obelisks, two hours. Dawn throws the east one west. Dusk throws the west one east.'),
          b('Pick the hour at a dial. Then walk the shadow.'),
        ] },
        { lines: [m('The Shifting Dunes. Every dial sets the same hour. Sand holds in the shade.')] },
      ],
    },
    {
      id: 'lab_f2', title: 'Gallery of False Horizons', aim: 'Cross the Gallery', done: 'lab_f2_done',
      aimIf: { if: 'knight_defeated', aim: 'Take the stair down' },
      journal: 'A roofed gallery of painted horizons, every one wrong. Indoors the dark holds the sand, and the light runs it.',
      chat: [
        { map: 'ep5_lab_f1', lines: [b('The stair in the far court goes down to the Gallery.')] },
        { map: 'ep5_lab_f2', if: 'knight_defeated', lines: [
          m("The Knight is down. The stair is past its hall. There's a lift back up, too, if we want the Haven."),
        ] },
        { map: 'ep5_lab_f2', if: 'dune_key_f2', lines: [
          m('A Dune Key. The locked door is on the way to the mirror hall, in the middle.'),
          b('She says mirror hall like it is a nice place.'),
        ] },
        { map: 'ep5_lab_f2', if: 'vex_gallery_met', lines: [
          b('East, the two windows. One at dawn, one at dusk. That pillar can only shade one at a time.'),
          m('So choose the hour by what we can reach first.'),
        ] },
        { map: 'ep5_lab_f2', lines: [
          m('Indoors the dark holds. The windows run the sand. At dawn the shafts come in from the east.'),
          b('Shove that pillar into the shaft and walk in its shade.'),
        ] },
        { lines: [m('The Gallery of False Horizons. The windows are the danger here.')] },
      ],
    },
    {
      id: 'lab_f3', title: 'The Well of Tomorrow', aim: 'Go down the Well', done: 'oracle_door_open',
      aimIf: { if: 'sel_walked_in', aim: 'Fill the three springs' },
      journal: 'A shaft of night going down in landings. No sun at all: only the old sun-lamps on their rails.',
      chat: [
        { map: 'ep5_lab_f2', lines: [b('Down the stair past the mirror hall. The Well.')] },
        { map: 'ep5_lab_f3', if: 'landing_truth', lines: [
          m('The last landing. Both lamps reach the plate. Roll one out of range, then shade the other row with the stone.'),
          b("So now we're the sun. Still fine."),
        ] },
        { map: 'ep5_lab_f3', if: 'landing_shelter', lines: [
          b('A lamp by the stair, and a stone on a groove. Shove the stone between the lamp and the stair.'),
          m('Its shadow falls along the row. The sand holds.'),
        ] },
        { map: 'ep5_lab_f3', if: 'sel_walked_in', lines: [
          m('That lamp on the rail lights the sand by the stair. Roll it away, and the dark holds the sand.'),
          b("Sel waits at each spring. Let's not keep her."),
        ] },
        { map: 'ep5_lab_f3', lines: [m('Down the landings. The lamps are the only sun down here.')] },
        { lines: [m('The Well of Tomorrow, the third floor. Three landings, three springs.')] },
      ],
    },
    {
      id: 'oracle', title: 'The Sand Oracle', aim: 'Face the Sand Oracle', done: 'oracle_defeated',
      journal: "Ishra's page says the future is not a single answer. The Sun Keyhole at the bottom of the Well is open to you.",
      chat: [
        { map: 'ep5_lab_f3', ifNot: 'sun_key_found', lines: [
          m("The Sun Keyhole wants the Nomad Sun Key. It's on the first floor, in the far court, at dawn."),
          b('The lift on the second floor goes up. We will be back.'),
        ] },
        { map: ['ep5_lab_f3', 'ep5_lab_oracle'], if: 'moonwell_woken', lines: [
          m('When it reads a star, I turn the sky before it does. Keep me standing.'),
          b('And the Moonwell is awake. We start angry. Good.'),
        ] },
        { map: ['ep5_lab_f3', 'ep5_lab_oracle'], lines: [
          m('When it reads a star, I turn the sky before it does. Keep me standing.'),
          b("If Mira gets hushed, Hourglass Sand buys her the time. Bring some."),
        ] },
        { lines: [m('Through the Sun Keyhole at the bottom of the Well. The Oracle.')] },
      ],
    },
    {
      id: 'roads', title: 'Every Road Remembers', aim: 'Take the lift up to the Haven', done: 'haven_restored',
      journal: "The chart is open and every struck star is lit. Take the lift from the Eye back up to Saffron Haven.",
      chat: [
        { map: LAB_MAPS, lines: [
          b("The lift by the chart goes straight up to the north gate. Sel's already on it."),
          m("Something is walking toward the Haven. The chart's reading it right now."),
        ] },
        { lines: [m('Back to Saffron Haven, by the lift from the Eye.')] },
      ],
    },
    {
      id: 'epilogue5', title: 'Toward the Sky', aim: 'Rest at the Dune Lantern', done: null,
      journal: 'The Haven has its road. The stars point to a library above the clouds. Episode 6 is not open yet.',
      chat: [
        { map: HAVEN_MAPS, if: TESTIMONIES, ifNot: 'moonwell_woken', lines: [
          m("We've heard all three witnesses. Draw water at the Moonwell and see what it shows."),
        ] },
        { map: HAVEN_MAPS, if: 'bells_started', ifNot: 'bells_done', lines: [
          b("Hassan's bells. One on the road, two on the Labyrinth's first floor. He wants them on the gate."),
        ] },
        { map: HAVEN_MAPS, ifNot: 'reliquary_found', lines: [
          m('The west window alcove on the second floor. At dusk the Lantern would read the sand there.'),
          b('The lift from the Gallery still runs. Sel says so. Sel says a lot of things now.'),
        ] },
        { map: HAVEN_MAPS, ifNot: 'bells_started', lines: [b('Hassan, at the Copperwind. He lost three bells on the roads. Ask him.')] },
        { map: HAVEN_MAPS, lines: [
          m("Omar's road is busy now. He'll want us to see it. And the Copperwind has new steel."),
          b('Zephyr Landing, Yara said. A skyport. Not yet. Supper first.'),
        ] },
        { map: 'ep5_caravan_road', lines: [b("Omar's tent. He finally has caravans to mark stones for.")] },
        { lines: [
          m('A road over the Haven, and a skyport at Zephyr Landing. Nobody can take us up there yet.'),
          b('The Dune Lantern, then. A bed, and a roof over all those stars.'),
        ] },
      ],
    },
  ],
};

/** The QUEST_EXT entry (plan 5.3): mainQuestFor answers MAIN_QUEST_EP5 once ep5_started is set. */
export const QUEST_EXT_ENTRY = ['ep5_started', MAIN_QUEST_EP5];

export const SIDE_QUESTS_EP5 = [
  {
    id: 'three_roads_home', title: 'Three Roads Home', giver: 'kamal', start: 'roads_started', done: 'roads_done',
    reward: REWARDS_EP5.roads_mantle.item,
    counter: { label: 'Witnesses heard', flags: TESTIMONIES },
    steps: [
      {
        id: 'witnesses', done: TESTIMONIES,
        journal: 'Kamal wants the old witnesses heard: Yara at the water stairs, Nasrin in the market, and Kamal. Lv 22.',
        chat: [
          { ifNot: 'testimony_kamal', map: 'ep5_saffron', lines: [m('Kamal is at the Moonwell. He asked to go first. Slowly.')] },
          { ifNot: 'testimony_yara', map: 'ep5_saffron', lines: [b("Yara, at the water stairs by her ship. Ask her about her father.")] },
          { ifNot: 'testimony_nasrin', map: 'ep5_saffron', lines: [m('Nasrin, on her bench in the market court. She keeps the old law.')] },
          { lines: [m('Three witnesses: Kamal at the Moonwell, Yara at the water stairs, Nasrin in the market.')] },
        ],
      },
      {
        id: 'moonwell', done: 'roads_done',
        journal: 'All three have spoken. Draw water at the Moonwell, and see how many roads it shows.',
        chat: [
          { map: 'ep5_saffron', lines: [m('The Moonwell, in the caravanserai. Draw the water. It used to show three roads.')] },
          { lines: [m('Back to the Moonwell in Saffron Haven. The witnesses have spoken.')] },
        ],
      },
    ],
  },
  {
    id: 'lost_reliquary', title: 'The Lost Traveler Reliquary', giver: 'nasrin', start: 'lab_f2_arrived', done: 'reliquary_found',
    reward: REWARDS_EP5.reliquary.item,
    steps: [
      {
        id: 'names', done: 'reliquary_found',
        journal: 'Somewhere in the Gallery, travelers scratched their names under the sand. Dusk light and the Lantern.',
        chat: [
          { map: 'ep5_lab_f2', lines: [m('A west window alcove, past the two windows. Set dusk, then I lift the Lantern.')] },
          { lines: [m('The Reliquary is on the second floor, by a west window. Dusk light, then the Lantern.')] },
        ],
      },
    ],
  },
  {
    id: 'hassans_bells', title: "Hassan's Bells", giver: 'hassan', start: 'bells_started', done: 'bells_done',
    reward: REWARDS_EP5.bells.item,
    counter: { label: 'Bells found', flags: BELLS },
    steps: [
      {
        id: 'find', done: BELLS,
        journal: 'Three caravan bells were lost when the last caravans turned back. One on the road, two on floor I.',
        chat: [
          { ifNot: 'bell_1_found', map: 'ep5_caravan_road', lines: [b('A sand island, north of the flat. Noon, and the short shadows reach it.')] },
          { ifNot: 'bell_2_found', map: 'ep5_lab_f1', lines: [m('A dead-end court in the north. At dusk a shadow reaches the chest.')] },
          { ifNot: 'bell_3_found', map: 'ep5_lab_f1', lines: [b('That obelisk base in the west room is cracked. I can fix cracked. With my spear.')] },
          { lines: [m('One bell on the Caravan Road, on a sand island. Two on the first floor of the Labyrinth.')] },
        ],
      },
      {
        id: 'return', done: 'bells_done',
        journal: 'You have all three bells. Take them back to Hassan at the Copperwind Smithy.',
        chat: [
          { map: HAVEN_MAPS, lines: [b("Hassan, at the Copperwind. He'll want to tune them before he hangs them.")] },
          { lines: [m('Hassan is at the Copperwind Smithy in Saffron Haven.')] },
        ],
      },
    ],
  },
];

// One exchange per map, at most two boxes (plan 7: party chat banter). Never at Ishra's expense.
const BOTH = ['mira_joined', 'bram_joined'];
export const BANTER_EP5 = {
  ep5_ship: [{ if: BOTH, lines: [
    b("The deck keeps moving. I keep not moving with it."),
    m("You'll get your sea legs by the time we land."),
  ] }],
  ep5_caravan_road: [
    // the field link, said once the first fight has taught the sky (PLAYTEST_REVIEW_7 item 9): until the Haven
    { if: [...BOTH, 'ship_first_fight_done'], ifNot: 'haven_arrived', lines: [
      m('Sun-things glow by day. Fight them at dusk, or wait for the turn.'),
    ] },
    { if: [...BOTH, 'haven_restored'], lines: [
      m('Listen. Bells on the dunes. Somebody is walking this road again.'),
      b('Omar is going to need more stones.'),
    ] },
    { if: BOTH, lines: [
      b('Sand in my boots. Sand in my collar. Sand in places sand has no business.'),
      m("It's a desert, Bram. It's all its business."),
    ] },
  ],
  ep5_saffron: [
    { if: [...BOTH, 'haven_restored'], lines: [
      m('Every load on every camel is lifted. The whole town is leaving and coming back at once.'),
      b('Dad would call that a good market day.'),
    ] },
    { if: BOTH, lines: [
      m('Everything here is packed, and nothing has moved. Look at the knots. Years old.'),
      b("Nobody leaves. I'd hate that. I'd go mad by Tuesday."),
    ] },
  ],
  ep5_sh_inn: [{ if: BOTH, lines: [b('The Dune Lantern. A lantern on every bed. I want to know who does the oil.')] }],
  ep5_sh_shop: [{ if: BOTH, lines: [m('Hourglass Sand. It holds the sky for a moment. I like a thing that does exactly one job.')] }],
  ep5_sh_smithy: [{ if: BOTH, lines: [b('Copper and bells. He tunes them by ear. So did my mother.')] }],
  ep5_sh_observatory: [{ if: BOTH, lines: [m('Charts on every wall, in four hands. I could stay in here a year.')] }],
  ep5_lab_f1: [{ if: BOTH, lines: [
    b('Every one of these stones had names on it once.'),
    m('Somebody took a chisel to them. Somebody very patient.'),
  ] }],
  ep5_lab_f2: [{ if: BOTH, lines: [
    m("A sea, painted in a desert. A city that isn't there. Every horizon in here is lying."),
    b('The floor is honest. I am walking on the floor.'),
  ] }],
  ep5_lab_f3: [{ if: BOTH, lines: [b("It's quiet. Even the sand is quiet.")] }],
  ep5_lab_oracle: [{ if: BOTH, lines: [m('Real sky, all the way up the shaft. Real stars. I am counting them anyway.')] }],
};

// While EP5_LIVE, an Episode 4 finisher who has not started Episode 5 hears about the ship from the south and the inn
// where its captain eats (ep5_morning runs on the next enter of ep4_vw_inn). Fine Print runs never enter Episode 5.
export const TALK_OPENER_EP5 = {
  map: VW_MAPS, if: 'ep4_complete', ifNot: ['ep5_started', 'tier_1'], lines: [
    m("The letter's ship is moored at the south landing. Its captain eats at the Floodwatch Inn."),
    b('Breakfast first, then. Then whatever a desert wants with us.'),
  ],
};
export const TALK_OPENER_EP5_FAR = {
  if: 'ep4_complete', ifNot: ['ep5_started', 'tier_1'], lines: [
    m('A ship from the south is moored at the south landing in Valewyn. The letter came on it.'),
  ],
};

// The Valewyn morning (PLAYTEST_REVIEW_7 item 10): from ep5_started until the ship, Talk in Valewyn says the Episode 5 step
// (Bram and Mira on the ship at the south landing) and holds the rest: an empty entry put first in every other side quest's
// chat and in the Valewyn banter matches there and then, and says nothing.
export const MORNING_HOLD = { map: VW_MAPS, if: 'ep5_started', ifNot: 'ship_boarded', lines: [] };
function holdMorning() {
  for (const q of ALL_SIDE_QUESTS) {
    if (SIDE_QUESTS_EP5.includes(q)) continue;
    for (const st of q.steps || []) if (Array.isArray(st.chat) && !st.chat.includes(MORNING_HOLD)) st.chat.unshift(MORNING_HOLD);
  }
  for (const map of VW_MAPS) if (Array.isArray(BANTER[map]) && !BANTER[map].includes(MORNING_HOLD)) BANTER[map].unshift(MORNING_HOLD);
}

export function register(opts) {
  const on = opts && typeof opts.ep5Live === 'boolean' ? opts.ep5Live : EP5_LIVE;   // the pack entry passes the engine here
  for (const q of SIDE_QUESTS_EP5) if (!ALL_SIDE_QUESTS.includes(q)) ALL_SIDE_QUESTS.push(q);
  for (const [map, entries] of Object.entries(BANTER_EP5)) if (!(map in BANTER)) BANTER[map] = entries;
  if (Array.isArray(Q.QUEST_EXT) && !Q.QUEST_EXT.some((e) => e && e[0] === 'ep5_started')) Q.QUEST_EXT.unshift(QUEST_EXT_ENTRY);
  if (on) for (const e of [TALK_OPENER_EP5, TALK_OPENER_EP5_FAR]) if (!TALK_PREPEND.includes(e)) TALK_PREPEND.push(e);
  holdMorning();
}

export default register;
