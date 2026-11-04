// Episode 4, "The Sunken Keep": the main quest MAIN_QUEST_EP4 (plan 5.3; the journal and Talk follow it from ep4_started
// through the core seam QUEST_EXT), the three side quests, their rewards (REWARDS_EP4) and the banter for the pack's maps.
// register() pushes the side quests onto ALL_SIDE_QUESTS, assigns the banter, adds ['ep4_started', MAIN_QUEST_EP4] to
// QUEST_EXT when that seam exists (E4-pack's hooks.js pushes the same entry; whoever runs second sees it and skips), and,
// while EP4_LIVE, puts one Talk entry in front that points an Episode 3 finisher at the east road. Idempotent.
//
// Talk entries, first match wins: map-aware ones first (Mira's and Bram's voices), a fallback with no map last. Every
// step names the next thing to do, including after ep4_complete (the epilogue names the other district, the coffer,
// Nilo's bell and Garrick's new steel). Nothing says the Regent's name before lyra_named.

import * as Q from '../quests.js';
import { EP4_LIVE } from '../../game/episodes.js';

const { ALL_SIDE_QUESTS, BANTER, TALK_PREPEND } = Q;

export const REWARDS_EP4 = {
  decree: { item: 'running_decree', qty: 1, why: "Ada's running decree (ep4_morning)" },
  crank: { item: 'lock_crank', qty: 1, why: "Joss's crank (joss_locks)" },
  fragment: { item: 'name_fragment_4', qty: 1, why: 'The Drowned Charter (regent_after)' },
  gift_truth: { item: 'tidewarden_trident', qty: 1, why: "Lyra's gift, truth path (regent_after, lyra_truth)" },
  gift_kind: { item: 'regents_pardon', qty: 1, why: "Lyra's gift, kind path (regent_after, lyra_kind)" },
  shelter: { item: 'hi_potion', qty: 3, why: 'Three Witnesses, Shelter the River Quarter (council_choice)' },
  records: { item: 'hi_ether', qty: 2, why: 'Three Witnesses, Protect the Public Records (council_choice); also book vw_records and +25 Fury' },
  witnesses: { item: 'tidewalker_mantle', qty: 1, why: 'Three Witnesses, either choice, once (council_choice)' },
  nilo: { item: 'ferrymans_charm', qty: 1, why: "Nilo's Bell (nilo_bell)" },
  coffer: { item: 'hi_ether', qty: 2, gold: 190, why: 'The Public Coffer (the F2 cache chest: 190 gold, 2 Hi-Ethers, book keep_ledger)' },
};

const m = (text) => ({ who: 'mira', text });
const b = (text) => ({ who: 'bram', text });

const EMBER_MAPS = ['emberpeak', 'pk_inn', 'pk_shop', 'pk_smithy', 'pk_bellhouse'];
const VW_MAPS = ['ep4_valewyn', 'ep4_vw_inn', 'ep4_vw_shop', 'ep4_vw_forge', 'ep4_vw_palace'];
const KEEP_MAPS = ['ep4_keep_f1', 'ep4_keep_f2', 'ep4_keep_f3', 'ep4_keep_crown'];
const PRINCIPLES = ['principle_voice', 'principle_truth', 'principle_mercy'];
const TESTIMONIES = ['testimony_hale', 'testimony_dorian', 'testimony_joss'];

export const MAIN_QUEST_EP4 = {
  id: 'main_ep4',
  title: 'The Sunken Keep',
  steps: [
    {
      id: 'flood_road', title: 'The Flood Road', aim: 'Take the east road to Valewyn', done: 'vw_arrived',
      journal: 'A decree from Valewyn will not dry, and someone wrote "The gates. Please." under it. Take the east road down.',
      chat: [
        { map: EMBER_MAPS, ifNot: 'east_road_open', lines: [
          b('East road, past the inn. Rusk said he has rope. Rusk always has rope.'),
          m('The washout is at the east edge of town. Then down, into the rain.'),
        ] },
        { map: EMBER_MAPS, lines: [b('The ladder is down the washout, east side. My father will pretend not to watch us go.')] },
        { map: 'ep4_flood_road', ifNot: 'flood_first_fight_done', lines: [
          m('Something is stamping itself at the bend. If it has a seal, burn it.'),
          b('Or hit it. I keep saying.'),
        ] },
        { map: 'ep4_flood_road', ifNot: 'saw_flood_lane', lines: [b('The road goes east, into that drowned lane. There is a farm lock there. I saw a wheel.')] },
        { map: 'ep4_flood_road', ifNot: 'ferry_rested', lines: [
          m('Turn the wheel down and the lane drains. The road goes on east, to the landing.'),
          b('Somebody has a fire going at the landing. Under a tarp. Smart somebody.'),
        ] },
        { map: 'ep4_flood_road', ifNot: 'saw_valewyn', lines: [m('The bluff past the landing, north-east. From up there we should see the city.')] },
        { map: 'ep4_flood_road', lines: [b("Hale's ferry, at the landing. It's the only way across.")] },
        { lines: [m('Valewyn is east, down the Flood Road from the washout in Emberpeak.')] },
      ],
    },
    {
      id: 'valewyn', title: 'Valewyn', aim: 'Hear the Regent, then Joss', done: 'keep_entered',
      aimIf: { if: 'met_regent', aim: 'Find Joss the Lockwright' },
      journal: 'Valewyn is drowning under its own orders. The Regent is in her Hall, north of the plaza. Then the lockwright, Joss.',
      chat: [
        { map: 'ep4_valewyn', ifNot: 'met_regent', lines: [
          m("The Regent's Hall is north, across the plaza. Vance said she is always in."),
          b('Past the statue with no face. I keep looking at it. It keeps not looking back.'),
        ] },
        { map: 'ep4_vw_palace', ifNot: 'met_regent', lines: [m('She is at the long table. Walk in a few steps. She will speak first.')] },
        { map: 'ep4_valewyn', ifNot: 'met_joss', lines: [
          b('Joss, the lockwright. The canal works are north-east, by the big wheel.'),
          m('He has the crank for the Keep. And, I think, a reason he has not used it.'),
        ] },
        { map: VW_MAPS, ifNot: 'met_joss', lines: [m('Joss is out at the canal works, north-east of the plaza. The Regent sent us.')] },
        { map: 'ep4_valewyn', lines: [
          b('The north landing. Hale will pole us across to the Keep. He has been waiting twelve years to be asked.'),
          m('Stock up first. Lamp Oil, at the Provisioner. Paper burns.'),
        ] },
        { map: VW_MAPS, lines: [b('North landing. The Keep. Joss gave us the crank.')] },
        { map: 'ep4_flood_road', lines: [m('Across the river by the ferry, then the Regent, in the Hall north of the plaza.')] },
        { lines: [m('Valewyn. The Regent first, in her Hall. Then Joss, at the canal works.')] },
      ],
    },
    {
      id: 'keep_f1', title: 'The Tidegate Causeway', aim: 'Find the way down', done: 'keep_f1_done',
      journal: 'The Keep is a lock built to be read. Wheels raise and lower the water. High water washes forged seals off doors.',
      chat: [
        { map: VW_MAPS, lines: [b('Back to the north landing. Hale knows the way. He keeps not looking down.')] },
        { map: 'ep4_keep_f1', if: 'tidegate_open', lines: [m('The Eastern Tidegate is open. The lift down is behind it, south-east.')] },
        { map: 'ep4_keep_f1', if: 'seal_key_found', lines: [
          m('We have the Sunken Seal Key. It opens the throne, far below. Now the Tidegate.'),
          b('The float on that gate wants high water in the pontoon basin. Raise it.'),
        ] },
        { map: 'ep4_keep_f1', if: 'lyra_memory_1', lines: [
          m('The north gallery is high up. One pontoon only rises that far at high water.'),
          b('And the Tidegate, south-east. Its float wants the same high water.'),
        ] },
        { map: 'ep4_keep_f1', lines: [
          m('That papered door. High water closes over it. Forged ink runs. Then drain it and walk through.'),
          b('Low for walking, middle for boats, high for washing. Joss said three marks. He meant it.'),
        ] },
        { lines: [m('The Sunken Keep, the first floor. The wheels move the water. The water moves everything else.')] },
      ],
    },
    {
      id: 'keep_f2', title: 'Archives Below Water', aim: 'Reach the court room', done: 'keep_f2_done',
      journal: 'Stacks rise out of black water. Book crates float. Somewhere below the archives, a court is still in session.',
      chat: [
        { map: 'ep4_keep_f1', lines: [b('The lift behind the Tidegate goes down to the archives.')] },
        { map: 'ep4_keep_f2', if: 'barrister_defeated', lines: [m('The court is adjourned. The stair under the court room goes down.')] },
        { map: 'ep4_keep_f2', if: 'tide_key_f2', lines: [
          m('We have a Tide Key. The locked door is on the court room approach, in the middle.'),
          b('Whatever argues in there has been arguing a long time.'),
        ] },
        { map: 'ep4_keep_f2', lines: [
          m('Two locks in the east, joined. One wheel only stands dry while the other basin is low.'),
          b('So: drain one, turn the other. Washed doors stay washed. Nothing is lost by trying.'),
        ] },
        { lines: [m('The second floor, the Archives Below Water. Down the lift behind the Tidegate.')] },
      ],
    },
    {
      id: 'keep_f3', title: 'The Court of Witnesses', aim: 'Ring the three stones', done: 'hero_signed',
      aimIf: { if: 'petition_gate_open', aim: 'Sign the Witness Book' },
      journal: 'Three wings, three principles: Voice, Truth and Mercy. Ring each stone and the Petition Gate will open.',
      chat: [
        { map: ['ep4_keep_f1', 'ep4_keep_f2'], lines: [b('The stair under the court room goes down to the Court of Witnesses.')] },
        { map: 'ep4_keep_f3', if: 'petition_gate_open', lines: [
          m('The Witness Book is on the lectern, through the gate. A decree stands until a named witness signs.'),
          b('{hero}. It is your call. It always was.'),
        ] },
        { map: 'ep4_keep_f3', if: PRINCIPLES, lines: [m('All three stones have rung. The Petition Gate is north of the hub. Stand at it.')] },
        { map: 'ep4_keep_f3', if: ['principle_voice', 'principle_truth'], lines: [
          m('Two rung. The south wing is left, the Mercy. It is dark, but high water carries the lantern light.'),
          b('Raise it, then look under the water. True ink shows.'),
        ] },
        { map: 'ep4_keep_f3', if: ['principle_voice', 'principle_mercy'], lines: [
          b('Two rung. The east wing is left, the Truth. Two papered doors, one wheel.'),
          m('There is a block damming the low door. Bram, shove it, then raise the water.'),
        ] },
        { map: 'ep4_keep_f3', if: ['principle_truth', 'principle_mercy'], lines: [
          m('Two rung. The west wing is left, the Voice. Low water for the causeway, then middle for the pontoon.'),
        ] },
        { map: 'ep4_keep_f3', lines: [
          m('West, east and south. Each wing has a stone under a dome. Ring all three, any order.'),
          b('The east wing has a block in the wrong place. That one is mine.'),
        ] },
        { lines: [m('The Court of Witnesses, the third floor. Three stones, one gate.')] },
      ],
    },
    {
      id: 'regent', title: 'The Paper Regent', aim: 'Face the Paper Regent', done: 'paper_regent_defeated',
      journal: 'Your name is on the record now, under water, holding. The Sunken Seal Key opens the Drowned Throne.',
      chat: [
        { map: 'ep4_keep_f3', ifNot: 'seal_key_found', lines: [
          m('The throne door needs the Sunken Seal Key. It is on the first floor, in the north gallery, at high water.'),
          b('The boat in the south-east of the hub goes straight back up. We will be back.'),
        ] },
        { map: ['ep4_keep_f3', 'ep4_keep_crown'], if: 'council_records', lines: [
          m('When it stamps, burn it. When it unrolls your name, answer it. You. Not us.'),
          b('And the records are dry. I feel lighter. I am going to hit it harder.'),
        ] },
        { map: ['ep4_keep_f3', 'ep4_keep_crown'], lines: [
          m('When it stamps, burn it. When it unrolls your name, answer it. You. Not us.'),
          b('Keep your turn for it, {hero}. We will keep everything else off you.'),
        ] },
        { lines: [m('Through the Seal Key door, past the lectern. The throne.')] },
      ],
    },
    {
      id: 'crown', title: 'The Crown Remembers', aim: 'Take the boat back to Valewyn', done: 'vw_restored',
      journal: 'The charter is true again, and the Regent has her name. Take the boat from the throne back to the city.',
      chat: [
        { map: KEEP_MAPS, lines: [
          b('The boat by the throne goes straight to the north landing. Lyra and Joss are already on it.'),
          m('There is a lock to open. And a bell.'),
        ] },
        { lines: [m('Back to Valewyn. The great lock is waiting for Joss, and the bell for you.')] },
      ],
    },
    {
      id: 'epilogue4', title: 'Toward the Desert', aim: 'Rest in Valewyn', done: null,
      journal: 'Valewyn has its gates and its Regent. A letter dry with sand came addressed in stars. Episode 5 is not open yet.',
      chat: [
        { map: VW_MAPS, ifNot: ['council_shelter', 'council_records'], lines: [
          m('The council switches in the plaza. Dorian wanted three witnesses heard first. We can still do that.'),
          b('And Nilo is ringing a bell at the landing. Or wanting to.'),
        ] },
        { map: VW_MAPS, if: 'council_shelter', ifNot: 'council_records', lines: [
          m('The great lock is open. The records district is next. Throw the other switch in the plaza.'),
          b('Then Lamp Oil, a hot meal at the Floodwatch, and a dry bed. In that order.'),
        ] },
        { map: VW_MAPS, if: 'council_records', ifNot: 'council_shelter', lines: [
          m('The great lock is open. The river quarter is next. Throw the other switch in the plaza.'),
          b('Then a hot meal at the Floodwatch. The beds are dry now. Mostly.'),
        ] },
        { map: VW_MAPS, ifNot: 'coffer_found', lines: [
          m('There was a drowned records alcove on the second floor. Keeper marks under the water. The Lantern would read them.'),
          b('The boat at the north landing still runs. Hale says so loudly.'),
        ] },
        { map: VW_MAPS, if: 'nilo_started', ifNot: 'nilo_done', lines: [b("Nilo's bell is on the first floor of the Keep, on the canal floor. Low water.")] },
        { map: VW_MAPS, lines: [
          m('Garrick has new steel at the forge in Emberpeak, Bram. And the Keep is still full of chests.'),
          b('South is a sea and a desert. Not yet. Supper first.'),
        ] },
        { map: EMBER_MAPS, lines: [
          b('My father has a new blade for each of us at the forge. He will not say he made it for us.'),
          m('Then we will not say thank you. We will just use them.'),
        ] },
        { lines: [
          m('A letter in stars, from a desert across the sea. Nobody has a ship for us yet.'),
          b('Valewyn, then. The Floodwatch. The other council district, if it is still waiting.'),
        ] },
      ],
    },
  ],
};

/** The QUEST_EXT entry (plan 13.2 seam 5): mainQuestFor answers MAIN_QUEST_EP4 once ep4_started is set. */
export const QUEST_EXT_ENTRY = ['ep4_started', MAIN_QUEST_EP4];

export const SIDE_QUESTS_EP4 = [
  {
    id: 'three_witnesses', title: 'Three Witnesses', giver: 'dorian', start: 'witnesses_started', done: 'witnesses_done',
    reward: REWARDS_EP4.witnesses.item,
    counter: { label: 'Witnesses heard', flags: TESTIMONIES },
    steps: [
      {
        id: 'witnesses', done: TESTIMONIES,
        journal: 'Dorian wants three witnesses heard before a council switch is thrown: Hale, Joss and Dorian himself. Lv 18.',
        chat: [
          { ifNot: 'testimony_dorian', map: VW_MAPS, lines: [m("Dorian is at the archive shelf in the Regent's Hall. He wanted to go first.")] },
          { ifNot: 'testimony_joss', map: VW_MAPS, lines: [b('Joss, at the canal works. He will say it plain. He does not know another way.')] },
          { ifNot: 'testimony_hale', map: 'ep4_flood_road', lines: [m('Hale is right here at the landing. Ask him what he saw.')] },
          { ifNot: 'testimony_hale', lines: [b("Hale, at the ferry landing on the Flood Road. He'll shout his testimony.")] },
          { lines: [m('Three witnesses before the switches: Hale at the landing, Joss at the works, Dorian at the Hall.')] },
        ],
      },
      {
        id: 'switch', done: 'witnesses_done',
        journal: 'All three have spoken. In the plaza, throw one council switch: Shelter the River Quarter, or Protect the Records.',
        chat: [
          { map: 'ep4_valewyn', lines: [
            m('The two switches by the plaza canal. One district first. The other waits for the great lock.'),
            b('Shelter keeps people dry. Records keep names dry. I do not envy whoever picks. That is us.'),
          ] },
          { lines: [m('The council switches are in the plaza in Valewyn. All three witnesses have spoken.')] },
        ],
      },
    ],
  },
  {
    id: 'public_coffer', title: 'The Public Coffer', giver: 'linn', start: 'keep_f2_arrived', done: 'coffer_found',
    reward: REWARDS_EP4.coffer.item,
    steps: [
      {
        id: 'marks', done: 'coffer_found',
        journal: 'Somewhere in the drowned archives the Keepers kept a coffer. True ink holds under water. Raise it, then the Lantern.',
        chat: [
          { map: 'ep4_keep_f2', lines: [m('A records alcove, east, in the second lock. Raise the water over the wall, then I lift the Lantern.')] },
          { lines: [m('The Public Coffer is somewhere on the second floor. Keeper ink holds under water. The Lantern will show it.')] },
        ],
      },
    ],
  },
  {
    id: 'nilo_bell', title: "Nilo's Bell", giver: 'nilo', start: 'nilo_started', done: 'nilo_done',
    reward: REWARDS_EP4.nilo.item,
    steps: [
      {
        id: 'find', done: 'nilo_bell_found',
        journal: "Nilo's boat bell went down with his landing. It lies on the Keep's first floor, in a dead end at low water.",
        chat: [
          { map: 'ep4_keep_f1', lines: [b('The pontoon channel, east. Drain it to the floor. There is a dead end down there with a glint in it.')] },
          { lines: [m("Nilo's bell is in the Keep, first floor, on the canal floor of the pontoon channel. Low water.")] },
        ],
      },
      {
        id: 'return', done: 'nilo_done',
        journal: "You have Nilo's boat bell, green with river. Take it back to him at the ferry landing.",
        chat: [
          { map: 'ep4_flood_road', lines: [b('Nilo is by the fire. He is whittling a pin for this exact bell.')] },
          { lines: [m("Nilo is at Hale's landing on the Flood Road. The ferry runs both ways.")] },
        ],
      },
    ],
  },
];

// One exchange per map, at most two boxes (plan 7: party chat banter). Never at the Regent's expense.
const BOTH = ['mira_joined', 'bram_joined'];
export const BANTER_EP4 = {
  ep4_flood_road: [
    { if: [...BOTH, 'vw_restored'], lines: [
      m('The lane is dry. The farm cat is still on the roof. It has decided it lives there now.'),
      b('Respect.'),
    ] },
    { if: BOTH, lines: [
      b('It rained on the mountain once. A whole month of it came down here instead.'),
      m("That's not how weather works." ),
    ] },
  ],
  ep4_valewyn: [
    { if: [...BOTH, 'vw_restored'], lines: [
      m('Listen. Doors. Everybody in Valewyn is opening a door at once.'),
      b('Dad would say that is a waste of heat. Then he would open his.'),
    ] },
    { if: BOTH, lines: [
      m('Everything here is wet except the orders. I keep wanting to put one in a canal.'),
      b('Do it. I will hold your coat.'),
    ] },
  ],
  ep4_vw_inn: [{ if: BOTH, lines: [b('Floodwatch Inn. The sign says dry beds, mostly. I want to know which bed is the mostly.')] }],
  ep4_vw_shop: [{ if: BOTH, lines: [m('Lamp Oil. Paper burns. I never thought I would say that as a good thing.')] }],
  ep4_vw_forge: [{ if: BOTH, lines: [b('Crown Guard steel. Good work, but the quench is lazy. Do not tell them I said so.')] }],
  ep4_vw_palace: [{ if: BOTH, lines: [m('Every decree on that table was dry until today. I keep looking at the pens.')] }],
  ep4_keep_f1: [{ if: BOTH, lines: [
    b('Low, middle, high. I like a place with three answers.'),
    m('You like a place where you can hit the wheel.'),
  ] }],
  ep4_keep_f2: [{ if: BOTH, lines: [
    m('Books under water. Every librarian has had this dream.'),
    b('How does it end?'),
    m('Usually with me awake.'),
  ] }],
  ep4_keep_f3: [{ if: BOTH, lines: [b('Marble, gold, and an echo. My voice sounds like somebody important down here.')] }],
  ep4_keep_crown: [{ if: BOTH, lines: [m('Ankle water. Cold. I am not going to complain. I am just telling you.')] }],
};

// While EP4_LIVE, an Episode 3 finisher who has not started Episode 4 hears about the east road (the plan's
// "epilogue3 Talk points at the east road"). Fine Print runs never enter Episode 4 tonight.
export const TALK_OPENER_EP4 = {
  if: 'ep3_complete', ifNot: ['ep4_started', 'tier_1'], lines: [
    m('The courier is sleeping at the Coal Lantern. Whatever she brought, it is still wet.'),
    b('The east road is flooded past the ridge. Rusk was saying something about rope.'),
  ],
};

export function register(opts) {
  const on = opts && typeof opts.ep4Live === 'boolean' ? opts.ep4Live : EP4_LIVE;   // the pack entry passes the engine here
  for (const q of SIDE_QUESTS_EP4) if (!ALL_SIDE_QUESTS.includes(q)) ALL_SIDE_QUESTS.push(q);
  for (const [map, entries] of Object.entries(BANTER_EP4)) if (!(map in BANTER)) BANTER[map] = entries;
  if (Array.isArray(Q.QUEST_EXT) && !Q.QUEST_EXT.some((e) => e && e[1] === MAIN_QUEST_EP4)) Q.QUEST_EXT.push(QUEST_EXT_ENTRY);
  if (on && !TALK_PREPEND.includes(TALK_OPENER_EP4)) TALK_PREPEND.push(TALK_OPENER_EP4);
}

export default register;
