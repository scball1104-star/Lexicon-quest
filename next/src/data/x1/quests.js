// Episode 1 expansion, "The Wider Valley": the six side quests of plan 5 in the SIDE_QUESTS shape, their rewards (REWARDS_X1)
// and the banter for the valley, Willowmere and the new maps (BANTER_X1). register() appends the quests to ALL_SIDE_QUESTS,
// merges the banter (new maps assigned, valley and Willowmere entries put in FRONT of the old ones) and is idempotent.
//
// A quest: { id, title, giver, start, done, reward, exp, doneText, counter?, steps: [{ id, done, journal, chat }] }.
//   journal   one box (3 lines of 42), names the recommended level and, where it helps, the place.
//   chat      Talk entries, first match wins: one map-aware, one that names a companion, one hero fallback with no conditions.
//   exp       the small EXP bonus the quest's closing scene gives with `await s.give('exp', n)`; 54 in all (plan 5.8). X1-battle
//             may lower an amount if its ledger breaks the cap of plan 7.2; nobody raises one.
//   doneText  what the journal shows for the finished entry ("Complete. +8 EXP."); journal() in quests.js falls back to
//             'Complete.' when it does not read this field.
// Every step's Talk names the next step. Order is free wherever the plan says so; the journal shows the first step whose flags
// are not all set.

import { ALL_SIDE_QUESTS, BANTER, TALK_PREPEND } from '../quests.js';
import { X1_MAP_REGION } from './flags.js';
import { X1_REGIONS } from './live.js';

export const REWARDS_X1 = {
  strays: { item: 'fold_mantle', qty: 1, gold: 100, exp: 8, why: 'Strays of Thornfold (Brindle, strays_done)' },
  rollcall: { item: 'rollcall_charm', qty: 1, exp: 12, why: 'The Thirteenth Stone (Brindle, rollcall_done); the Reeve also drops reeves_crook' },
  pell_crates: { item: 'drover_boots', qty: 1, exp: 6, why: "Pell's Crates (Pell, crates_done); also sets pell_stamp" },
  four_rolls: { item: 'honey_roll', qty: 8, gold: 200, exp: 12, why: 'Four Rolls for the Miller (mill_done); the Golem also drops millwright_apron' },
  dark_stars: { item: 'star_chart', qty: 1, exp: 8, fromChest: true, why: 'The Dark Stars (cellar_note gives only the EXP; star_chart is the Cellar dais chest)' },
  not_to_forget: { item: 'ether', qty: 3, gold: 200, exp: 8, why: 'Things Not To Forget (Iris, list_done)' },
};
export const X1_QUEST_EXP_TOTAL = Object.values(REWARDS_X1).reduce((a, r) => a + r.exp, 0);   // 54

const m = (text) => ({ who: 'mira', text });
const b = (text) => ({ who: 'bram', text });
const h = (text) => ({ who: 'hero', text });
const BOTH = ['mira_joined', 'bram_joined'];

export const X1_SIDE_QUESTS = [
  {
    id: 'strays', title: 'Strays of Thornfold', giver: 'brindle', start: 'strays_started', done: 'strays_done',
    reward: REWARDS_X1.strays.item, exp: REWARDS_X1.strays.exp, doneText: 'Complete. +8 EXP.',
    counter: { label: 'Strays found', flags: ['stray_1_found', 'stray_2_found', 'stray_3_found', 'stray_4_found', 'stray_5_found'] },
    steps: [
      {
        id: 'find', done: ['stray_1_found', 'stray_2_found', 'stray_3_found', 'stray_4_found', 'stray_5_found'],
        journal: "Brindle is five sheep short. They hide in the Downs and in the valley pasture. Recommended Lv 3.",
        chat: [
          { map: 'x1_downs', if: BOTH, lines: [
            m('The Old Fold, the ring of stones, the ridge. Three places a sheep would hide.'),
            b('And a wall with a crack in it. I can do cracked walls.'),
          ] },
          { map: 'valley', if: BOTH, lines: [b('One wandered back into the valley, Brindle said. The fenced pasture, west side. Sheep go where there is grass.')] },
          { if: 'mira_joined', lines: [m('Five strays. Brindle in Thornfold, west of the valley, wants every one home. I will count them off.')] },
          { lines: [h("(Brindle's five strays: the Old Fold, the stones, the ridge, the valley pasture, a cracked wall.)")] },
        ],
      },
      {
        id: 'return', done: 'strays_done',
        journal: 'All five strays are home. Tell Brindle at the fold in Thornfold. Recommended Lv 3.',
        chat: [
          { map: 'x1_downs', if: 'bram_joined', lines: [b('Brindle is at the fold gate. He will whistle. Stand back, it is loud.')] },
          { if: 'mira_joined', lines: [m('Five of five. Brindle, at the fold gate in Thornfold. He will say twelve and mean it.')] },
          { lines: [h('(Back to Brindle, at the fold in Thornfold.)')] },
        ],
      },
    ],
  },

  {
    id: 'rollcall', title: 'The Thirteenth Stone', giver: 'brindle', start: 'rollcall_started', done: 'rollcall_done',
    reward: REWARDS_X1.rollcall.item, exp: REWARDS_X1.rollcall.exp, doneText: 'Complete. +12 EXP.',
    counter: { label: 'Papers found', flags: ['roll_found', 'copy_found'] },
    steps: [
      {
        id: 'papers', done: ['roll_found', 'copy_found'],
        journal: "Thornfold's twelve stones are blank. Fetch Iris's torn roll and Quill's copy. Recommended Lv 3.",
        chat: [
          { map: 'library', if: 'mira_joined', ifNot: 'roll_found', lines: [m("Iris has the roll. Do not mention how long it took her to find. She will tell us.")] },
          { map: 'valley', if: 'bram_joined', ifNot: 'copy_found', lines: [b("Quill's at the Pilgrim's Rest, by the fork. He copies everything. Twice. We can use that.")] },
          { if: 'mira_joined', lines: [m("Iris's roll, at the library. Quill's copy, at the Pilgrim's Rest. Between them, twelve names.")] },
          { lines: [h("(The old roll is with Iris at the library. Quill, at the Pilgrim's Rest, copied the stones.)")] },
        ],
      },
      {
        id: 'stones', done: 'stones_lettered',
        journal: 'You hold both papers. Say the twelve names at the Standing Stones, west of Thornfold. Recommended Lv 3.',
        chat: [
          { map: 'x1_downs', if: BOTH, lines: [m('The ring is up on the rise, north-west of Thornfold. Brindle says a stone wants to be told.'), b('Then we tell it.')] },
          { if: 'bram_joined', lines: [b('The Standing Stones, on the rise west of Thornfold. We have the papers. Now the voices.')] },
          { lines: [h('(The Standing Stones, on the rise west of Thornfold. Say the names aloud.)')] },
        ],
      },
      {
        id: 'reeve', done: 'barrow_reeve_defeated',
        journal: 'Something counts in the Wethers\' Barrow under the stones. Face the Barrow Reeve. Recommended Lv 5.',
        chat: [
          { map: 'x1_barrow', if: BOTH, lines: [m('He counts, and comes up short. There is a font past the counting room. Rest there first.'), b('Right.')] },
          { map: 'x1_downs', if: 'mira_joined', lines: [m('The barrow door is in the turf mound north of the ring. The Reeve is at the far end. Bows and light, Bram.')] },
          { lines: [h('(The barrow door is in the mound north of the stones. Something counts inside.)')] },
        ],
      },
      {
        id: 'report', done: 'rollcall_done',
        journal: 'The count is done. Tell Brindle at the fold in Thornfold. Recommended Lv 3.',
        chat: [
          { map: 'x1_downs', if: BOTH, lines: [b('Brindle is at the fold gate. I want to see his face when somebody says thirteen.'), m('He will not show it. He will whistle.')] },
          { if: 'bram_joined', lines: [b('Back to Brindle, then. I want to see his face when somebody says thirteen.')] },
          { lines: [h('(Back to Brindle, at the fold in Thornfold.)')] },
        ],
      },
    ],
  },

  {
    id: 'pell_crates', title: "Pell's Crates", giver: 'pell', start: 'crates_started', done: 'crates_done',
    reward: REWARDS_X1.pell_crates.item, exp: REWARDS_X1.pell_crates.exp, doneText: 'Complete. +6 EXP.',
    counter: { label: 'Crates handed over', flags: ['crate_1_done', 'crate_2_done', 'crate_3_done'] },
    steps: [
      {
        id: 'deliver', done: ['crate_1_done', 'crate_2_done', 'crate_3_done'],
        journal: "Three of Pell's crates: Tamsin in Thornfold, Yarrow on Larchhill, Ferrick at the weir. Lv 3 to 5.",
        chat: [
          { map: 'x1_downs', ifNot: 'crate_1_done', if: 'mira_joined', lines: [m('Tamsin, the loom house in Thornfold. Spools. At least Pell thinks spools.')] },
          { ifNot: 'crate_2_done', if: 'bram_joined', lines: [b('One for Yarrow on Larchhill, up past the Downs. Beeswax moulds. Mind the bees.')] },
          { ifNot: 'crate_3_done', if: 'mira_joined', lines: [m("A bearing for Ferrick, at the weir below the valley's south track.")] },
          { lines: [h("(Pell's crates: Thornfold, Larchhill and the weir.)")] },
        ],
      },
      {
        id: 'report', done: 'crates_done',
        journal: "All three crates are delivered. Tell Pell at Willowmere Goods. He's lying down.",
        chat: [
          { map: 'willowmere', if: 'bram_joined', lines: [b('Pell is next door in the shop. Let me talk. He will want to hug someone and it should not be Mira.')] },
          { if: 'mira_joined', lines: [m('Three receipts. Pell, at Willowmere Goods. He will want every one read back to him.')] },
          { lines: [h('(Back to Pell at Willowmere Goods.)')] },
        ],
      },
    ],
  },

  {
    id: 'four_rolls', title: 'Four Rolls for the Miller', giver: 'hal', start: 'mill_started', done: 'mill_done',
    reward: REWARDS_X1.four_rolls.item, exp: REWARDS_X1.four_rolls.exp, doneText: 'Complete. +12 EXP.',
    steps: [
      {
        id: 'ferrick', done: 'ferrick_met',
        journal: "Hal's mill wheel is jammed. Ask Ferrick at the weir why. The Millrace road is south of the valley. Lv 5.",
        chat: [
          { map: 'valley', if: 'bram_joined', lines: [b('The south track is clear since the bell. Ferrick keeps the weir at the bottom.')] },
          { if: 'mira_joined', lines: [m('Ferrick, at the weir on the Lower Millrace. South track from the valley, or the Drovers\' Road.')] },
          { lines: [h("(Ferrick keeps the weir on the Lower Millrace, south of the valley.)")] },
        ],
      },
      {
        id: 'pin', done: 'pin_found',
        journal: "The wheel's pin fell into the Weir Culvert, east of the weir. Fetch it. Recommended Lv 5 to 7.",
        chat: [
          { map: 'x1_culvert', if: BOTH, lines: [m('Pump room is north, past the plates. The pin is in a chest behind the old pipes.'), b('And whatever grinds is further on. Rest first.')] },
          { map: 'x1_millrace', if: 'bram_joined', lines: [b('Culvert arch is east of the weir, past the dry pond. Go quiet.')] },
          { if: 'mira_joined', lines: [m('The pin went through the grating into the culvert. Ferrick said the arch, east of the weir.')] },
          { lines: [h('(The pin is in the Weir Culvert, under the dry millpond.)')] },
        ],
      },
      {
        id: 'wheel', done: 'mill_done',
        journal: 'You have the pin. Set it in the wheel at Hal\'s mill, on the Lower Millrace.',
        chat: [
          { map: 'x1_millrace', if: 'bram_joined', lines: [b('Wheel is on the east side of the mill. Push when I say push.')] },
          { if: 'mira_joined', lines: [m("The mill wheel, on the Lower Millrace. Hal won't come alone. We'll hold the door.")] },
          { lines: [h("(The pin goes in Hal's mill wheel, on the Lower Millrace.)")] },
        ],
      },
    ],
  },

  {
    id: 'dark_stars', title: 'The Dark Stars', giver: 'hesper', start: 'stars_started', done: 'stars_done',
    reward: REWARDS_X1.dark_stars.item, exp: REWARDS_X1.dark_stars.exp, doneText: 'Complete. +8 EXP.',
    counter: { label: 'Marks read', flags: ['star_1_read', 'star_2_read', 'star_3_read'] },
    steps: [
      {
        id: 'marks', done: ['star_1_read', 'star_2_read', 'star_3_read'],
        journal: "Read three Keepers' names in hidden ink: the milestone, the Archive door, the Watchtower. Lv 4 to 6.",
        chat: [
          { map: 'valley', ifNot: 'star_1_read', if: 'mira_joined', lines: [m('The milestone has a back. We have never once looked at the back. Lantern, {hero}.')] },
          { map: 'valley', ifNot: 'star_2_read', if: 'bram_joined', lines: [b('The Archive door. Hesper says there is a name carved in it that only the lamp can see.')] },
          { map: 'x1_highmoor', ifNot: 'star_3_read', if: 'mira_joined', lines: [m('The Watchtower, up the spur from the Chime Road. The third name is on the tower base.')] },
          { if: 'mira_joined', lines: [m('Three names in hidden ink: the milestone, the Archive door, the Watchtower on the High Moor.')] },
          { lines: [h('(Three marks to read with the Lantern: the milestone, the Archive door, the moor tower.)')] },
        ],
      },
      {
        id: 'align', done: 'orrery_aligned',
        journal: 'You know all three names. Say them to Hesper in the Orrery on the Keepers\' Terrace. Recommended Lv 6.',
        chat: [
          { map: 'x1_terrace', if: 'bram_joined', lines: [b('Orrery is the dome in the middle. Hesper will be talking to something. Do not interrupt it.')] },
          { if: 'mira_joined', lines: [m('Back to Hesper in the Orrery. The Terrace is up the cleft stair, or over the moor.')] },
          { lines: [h('(Hesper waits in the Orrery on the Keepers\' Terrace.)')] },
        ],
      },
      {
        id: 'cellar', done: 'stars_done',
        journal: "The hatch in the Orrery floor is open. Find the Keeper's last page in the Cellar. Recommended Lv 6.",
        chat: [
          { map: 'x1_cellar', if: BOTH, lines: [m('The ink bridge only shows under the Lantern. Raise it and the route lights.'), b('And if we fall, we land at the font. Fine.')] },
          { if: 'mira_joined', lines: [m('The Cellar hatch is open. Under the Lantern, the floor shows a route to the dais.')] },
          { lines: [h('(The Cellar is under the Orrery. A route of hidden ink crosses its floor.)')] },
        ],
      },
    ],
  },

  {
    id: 'not_to_forget', title: 'Things Not To Forget', giver: 'iris', start: 'list_started', done: 'list_done',
    reward: REWARDS_X1.not_to_forget.item, exp: REWARDS_X1.not_to_forget.exp, doneText: 'Complete. +8 EXP.',
    counter: { label: 'Remembrances', flags: ['list_rhyme', 'list_ledger', 'list_song'] },
    steps: [
      {
        id: 'gather', done: ['list_rhyme', 'list_ledger', 'list_song'],
        journal: "Bring Iris a rhyme (Brindle), a name (Hal's ledger) and a song (Odo, on the moor). Lv 3 to 5.",
        chat: [
          { map: 'x1_downs', ifNot: 'list_rhyme', if: 'mira_joined', lines: [m('Brindle first. A counting rhyme. He will pretend he does not have one.')] },
          { map: 'x1_mill', ifNot: 'list_ledger', if: 'bram_joined', lines: [b('Hal keeps a ledger on the shelf by the stones. The oldest name, Iris said. Page one.')] },
          { map: 'x1_highmoor', ifNot: 'list_song', if: 'mira_joined', lines: [m('Odo, in the hut under the Watchtower. A song he sings to the posts.')] },
          { if: 'mira_joined', lines: [m("A rhyme from Brindle, a name from Hal's ledger, a song from Odo. Iris will want them in their own words.")] },
          { lines: [h("(Three things for Iris: Brindle's rhyme, a name in Hal's ledger, Odo's song.)")] },
        ],
      },
      {
        id: 'report', done: 'list_done',
        journal: 'You have all three. Bring them to Iris at the library in Willowmere.',
        chat: [
          { map: 'library', if: 'mira_joined', lines: [m('Iris is at her desk. I will hold the pen, if she lets me. She will not let me.')] },
          { if: 'bram_joined', lines: [b('Library, then. Iris and her list. She writes slow and I stand there. Fine by me.')] },
          { lines: [h('(Take the three remembrances to Iris at the library.)')] },
        ],
      },
    ],
  },
];

// ------------------------------------------------------------------------------------------------
// Banter. Valley and Willowmere entries are put in FRONT of the old ones (first match wins), each ends when the thing it
// points at has been seen, so the old banter returns. New maps are assigned whole.
// ------------------------------------------------------------------------------------------------
export const BANTER_X1 = {
  valley: [
    { if: [...BOTH, 'lantern_get'], ifNot: ['terrace_arrived', 'cleft_seen'], lines: [
      m('That black cleft under the north cliff has a stair on its far side, and not one board across.'),
      b('Ink bridge, I bet. You have the lamp. Try the lamp.'),
    ], region: 'north' },
    { if: [...BOTH, 'archive_f1_done'], ifNot: 'millrace_arrived', lines: [
      b('The oak is gone from the south track. The bell shook it loose. Or scared it.'),
      m('The track runs to a weir and a mill. On my map it says "etc."'),
    ], region: 'south' },
    { if: [...BOTH, 'first_fight_done'], ifNot: 'downs_arrived', lines: [
      m('The west fence has a gate in it now. I have lived here my whole life and never noticed the fence.'),
      b('Sheep country. Smell that? Wool and wind. Come on.'),
    ], region: 'west' },
  ],
  willowmere: [
    { if: [...BOTH, 'first_fight_done'], ifNot: 'downs_arrived', lines: [
      b('The orchard gate on the west wall is open. Holt must have forgotten to nail it shut.'),
      m('Holt forgets nothing. He is giving us rope.'),
    ], region: 'west' },
  ],
  x1_downs: [
    { if: BOTH, ifNot: 'moor_arrived', lines: [
      m('That tower on the skyline. It was never on any map I read.'),
      b('It is on one now. Mine. I will draw it badly.'),
    ] },
    { if: BOTH, lines: [
      b('No wolves in the way, no wall, no one telling us to hurry. I could get used to this.'),
      m('It has been exactly four minutes. You will not.'),
    ] },
  ],
  x1_loomhouse: [{ if: BOTH, lines: [
    m('Every cloth in here has a name in the hem. All in the same small hand.'),
    b('Tamsin could sew me a name in a week and I would still lose the sock.'),
  ] }],
  x1_barrow: [{ if: BOTH, lines: [
    b('Somebody counts in here. I would rather it was rats.'),
    m('Rats do not stop at twelve.'),
  ] }],
  x1_terrace: [{ if: BOTH, lines: [
    b('A road on the roof of the valley. I have walked under this cliff my whole life.'),
    m('The Keepers built where you would have to look up. Look up, Bram.'),
  ] }],
  x1_orrery: [{ if: BOTH, lines: [
    m('Brass. A great deal of brass. Somebody polishes it by hand, and has for years.'),
    b('Somebody who talks to it. I heard.'),
  ] }],
  x1_cellar: [{ if: BOTH, lines: [
    m('Every star on this floor is a place to fall. Walk where the ink is.'),
    b('And if I fall, I land at the font. Good. I like the font.'),
  ] }],
  x1_millrace: [{ if: BOTH, lines: [
    b('Smell that? Barley, bread and cat. In that order.'),
    m('The weir is dry and the mill is quiet. I do not like a quiet mill.'),
  ] }],
  x1_mill: [{ if: BOTH, lines: [
    m('Thirty years of flour in the rafters.'),
    b('I could sleep in this flour. I would be a bun by morning.'),
  ] }],
  x1_culvert: [
    // W7 (PLAYTEST_REVIEW_X1 m1): the plates and the gate are named until the gate has opened once (its flag, set by events.js)
    { if: BOTH, ifNot: 'x1_gate_drain_open', lines: [
      m('Two plates in the floor, and a gate that wants both.'),
      b('One block is light. The other is heavy, and that is a Shove. I like a Shove.'),
    ] },
    { if: BOTH, lines: [
      b('Drains. It is always drains.'),
      m('You asked to come.'),
    ] },
  ],
  x1_highmoor: [{ if: BOTH, lines: [
    m('Fifty paces between the posts. I am counting.'),
    b('Of course you are.'),
  ] }],
  x1_larchhill: [{ if: BOTH, lines: [
    b('Forty hives and not one bee on me. I feel special.'),
    m('You are being tolerated.'),
  ] }],
};

// ------------------------------------------------------------------------------------------------
/** The banter register() would add when `regionOn(region)` says a region is on: { map: [entries] }. */
export function activeBanter(regionOn = (r) => X1_REGIONS[r] !== false) {
  return Object.fromEntries(Object.entries(BANTER_X1).map(([map, list]) => [map, list.filter((e) => !e.region || regionOn(e.region) !== false)]));
}

/** W7: on the Wider Valley's maps Talk does not send a finished-Episode-1 party back to Mael's well (the opener of the Episode 2 road). */
export const TALK_OPENER_X1 = { map: Object.keys(X1_MAP_REGION), if: 'ep1_complete', ifNot: 'ep2_started', lines: [m('Willowmere has the next errand. The Downs will still be here.')] };

export function register({ regionOn = (r) => X1_REGIONS[r] !== false } = {}) {
  if (Object.values(X1_MAP_REGION).some((r) => regionOn(r) !== false) && !TALK_PREPEND.includes(TALK_OPENER_X1)) TALK_PREPEND.push(TALK_OPENER_X1);
  for (const q of X1_SIDE_QUESTS) { q.pinFirst = true; if (!ALL_SIDE_QUESTS.includes(q)) ALL_SIDE_QUESTS.push(q); }   // W7: partyChat lets a map-pinned line of these speak first
  for (const [map, entries] of Object.entries(activeBanter(regionOn))) {
    if (map === 'valley' || map === 'willowmere') {
      const cur = BANTER[map] || (BANTER[map] = []);
      const fresh = entries.filter((e) => !cur.includes(e));
      cur.unshift(...fresh);
    } else {
      BANTER[map] = entries;
    }
  }
}

export default register;
