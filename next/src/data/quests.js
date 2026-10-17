// Episode 1 quests: every story flag, the main quest with journal text, Chrono Trigger style party chat
// ("Talk" in the field menu: a companion says, in character, what to do next), side quests and rewards.
// Pure data + pure helpers. No DOM, no engine.
//
// Chat / hint entries use the shared conditional shape (see story/dialogue.js):
//   { if, ifNot, map, lines: [{ who, text }] }   first match wins; `map` limits an entry to map id(s).
// Before Mira joins, the hero "talks" to themself: who 'hero', text in parentheses.

import { matches } from './story/dialogue.js';

// ------------------------------------------------------------------------------------------------
// Every flag the story uses. COMMON.md main flags first. Value = what setting it means.
// Map-local flags for ordinary chests and switches are owned by the map files, not listed here.
// ------------------------------------------------------------------------------------------------
export const FLAGS = {
  // Main story (COMMON.md)
  intro_done: 'The hero woke up and Hazel sent them to Mael (wake_up).',
  met_mael: 'Mael asked the hero to investigate the Archive (mael_intro).',
  mira_joined: 'Mira joined at the library (mira_joins).',
  bram_joined: 'Bram joined at the south gate (south_gate).',
  left_town: 'The party left Willowmere for the first time (leave_town).',
  archive_entered: 'The Archive door accepted the party (archive_door). The door event opens.',
  archive_f1_done: 'Heard the bell below; reached the stairs to F2 (archive_f1_bell).',
  echo_warden_defeated: 'Echo Warden beaten (echo_warden).',
  lantern_get: 'Lantern of Recall obtained (lantern_get). Enables hidden-ink reveals.',
  archive_f2_done: 'Reached the stairs to F3 (archive_f2_exit).',
  boss_door_open: 'The Taproot door is open (boss_door).',
  archivore_defeated: 'The Archivore is beaten; names return, signs restored (archivore).',
  ep1_complete: 'Return scene and ending hook played (return_to_willowmere). Roll credits.',

  // Story beats and world state
  signs_fading: 'Town signs render blank/faded until archivore_defeated (fading_sign).',
  saw_fading_sign: 'The fading sign scene has played.',
  hazel_farewell_done: 'Hazel gave the hero her knitted mantle (hazel_farewell).',
  garrick_farewell_done: 'Garrick said goodbye to Bram and gave the hero an axe (garrick_farewell).',
  valley_arrived: 'First arrival in the valley (valley_arrival).',
  saw_milestone: 'Read the milestone with Mira (milestone).',
  f1_arrived: 'Archive F1 arrival scene played.',
  f2_arrived: 'Archive F2 arrival scene played.',
  f3_arrived: 'Archive F3 arrival scene played.',
  found_thirteenth_bell: 'Found the thirteenth bell in the Stacks (thirteenth_bell).',
  stacks_key_found: 'Set by the F3 chest that holds the stacks_key (map chest flag).',
  returned_home: 'The return-to-Willowmere scene played.',
  hal_returned: 'Hal and Oren reunion scene played in the bakery (hal_returns).',

  // Side quest: Letters for the Living (Tess)
  tess_quest_started: 'Tess asked for her three lost letters.',
  tess_letter_1_found: 'Found Hal\'s letter to Oren (Archive F1).',
  tess_letter_2_found: 'Found Nella\'s letter to Edda (Archive F2).',
  tess_letter_3_found: 'Found Tess\'s father\'s letter (Archive F3).',
  tess_letter_1_delivered: 'Gave letter 1 to Tess. Oren learns he has a brother.',
  tess_letter_2_delivered: 'Gave letter 2 to Tess. Edda and Nella remember each other.',
  tess_letter_3_delivered: 'Gave letter 3 to Tess.',
  tess_quest_done: 'All three delivered; Tess gave the Wayfarer Boots.',

  // Side quest: The Runaway Starter (Oren)
  starter_quest_started: 'Oren asked the party to find his sourdough starter.',
  starter_found: 'Picked up the starter beside Garrick\'s forge.',
  starter_done: 'Returned the starter to Oren.',

  // Side quest: Wick's Name-Tag
  wick_quest_started: 'Wick told the party the Duke stole his name-tag.',
  wick_tag_found: 'Took the tag from the Duke\'s nest.',
  wick_tag_done: 'Returned the tag to Wick.',

  // Side quest: Nella's Ferry Bell
  nella_quest_started: 'Nella asked the party to find her call-bell.',
  ferry_bell_found: 'Found Maudie the call-bell in the valley shallows.',
  nella_bell_done: 'Returned the bell. The valley north landing ferry now carries the party to town.',
};

export const FLAG_IDS = Object.keys(FLAGS);

// ------------------------------------------------------------------------------------------------
// Rewards (item ids from data/items.js). Scenes in story/ep1.js read these.
// ------------------------------------------------------------------------------------------------
export const REWARDS = {
  hazel: { item: 'wool_mantle', qty: 1, why: 'Hazel\'s knitted mantle (optional farewell)' },
  garrick: { item: 'hatchet', qty: 1, why: 'Garrick gives the hero an axe (optional farewell)' },
  tess: { item: 'wayfarer_boots', qty: 1, why: 'Letters for the Living (set piece with wayfarer_mantle)' },
  starter: { item: 'hi_potion', qty: 2, why: 'The Runaway Starter' },
  wick: { item: 'bronze_charm', qty: 1, why: 'Wick\'s Name-Tag ("a lucky coin on a cord")' },
  nella: { item: 'river_charm', qty: 1, why: 'Nella\'s Ferry Bell (plus the ferry shortcut)' },
};

// ------------------------------------------------------------------------------------------------
// Main quest. The current step is the first whose `done` flag is not set.
// ------------------------------------------------------------------------------------------------
const TOWN_MAPS = ['willowmere', 'hero_home', 'inn', 'item_shop', 'smithy', 'library', 'chapel', 'bakery'];
const ARCHIVE_MAPS = ['archive_f1', 'archive_f2', 'archive_f3', 'archive_boss'];

export const MAIN_QUEST = {
  id: 'main_ep1',
  title: 'The Missing Name',
  steps: [
    {
      id: 'wake', title: 'Morning', done: 'intro_done',
      journal: 'Morning in Willowmere. Someone is calling your name.',
      chat: [{ lines: [{ who: 'hero', text: '(Five more minutes...)' }] }],
    },
    {
      id: 'find_mael', title: 'The Elder\'s Errand', done: 'met_mael',
      journal: 'Hazel says Elder Mael has been asking for you. He is in Lantern Square, by the well.',
      chat: [
        { map: 'hero_home', lines: [{ who: 'hero', text: '(Mael is waiting in Lantern Square. Out the front door, then follow the lane to the well.)' }] },
        { lines: [{ who: 'hero', text: '(Elder Mael is by the well in Lantern Square, the middle of town.)' }] },
      ],
    },
    {
      id: 'find_mira', title: 'The Apprentice', done: 'mira_joined',
      journal: 'Mael wants you to go to the Rootbound Archive. First, find Mira at the library, east of the square.',
      chat: [
        { map: 'library', lines: [{ who: 'hero', text: '(Mira should be here somewhere, probably behind a stack of books.)' }] },
        { lines: [{ who: 'hero', text: '(Mira, at the library. That is the east side of Lantern Square.)' }] },
      ],
    },
    {
      id: 'south_gate', title: 'The South Gate', done: 'bram_joined',
      journal: 'With Mira beside you, head for the south gate. Mael says Bram may be on watch.',
      chat: [
        { lines: [
          { who: 'mira', text: 'Mael said the south gate. Straight down the main road from the square.' },
          { who: 'mira', text: 'If Bram is on watch, let me do the talking. He likes me. Mostly.' },
        ] },
      ],
    },
    {
      id: 'to_archive', title: 'The Pilgrim Road', done: 'archive_entered',
      journal: 'Cross Willowmere Valley and follow the pilgrim road north to the Rootbound Archive.',
      chat: [
        { map: TOWN_MAPS, lines: [
          { who: 'bram', text: 'Out the south gate, then round through the valley. The Archive sits at its north end.' },
          { who: 'mira', text: "And if you need supplies, now's the time. The Archive doesn't have a shop. I checked." },
        ] },
        { map: 'valley', ifNot: 'saw_milestone', lines: [
          { who: 'bram', text: 'Over the bridge, then follow the pilgrim road north. There is an old milestone at the fork.' },
          { who: 'mira', text: 'The Archive is the building at the top of the valley that appears to be eating a tree.' },
        ] },
        { map: 'valley', lines: [
          { who: 'bram', text: 'Keep on the pilgrim road north from the milestone. The Archive is at the very top.' },
          { who: 'mira', text: "Technically, the tree is eating the building. Either way, we can't miss it." },
        ] },
        { lines: [{ who: 'mira', text: 'The Archive. North end of the valley, up the pilgrim road.' }] },
      ],
    },
    {
      id: 'catalog_halls', title: 'The Catalog Halls', done: 'archive_f1_done',
      journal: 'Explore the Catalog Halls, the Archive\'s first floor, and find the way down.',
      chat: [
        { map: 'archive_f1', lines: [
          { who: 'mira', text: "The stairs down will be behind a locked gate. The Keepers loved a lock. There'll be keys on this floor." },
          { who: 'bram', text: "And if a block looks like it wants pushing, I'm pushing it." },
        ] },
        { lines: [{ who: 'mira', text: 'The Archive is waiting. North end of the valley, through the door that listens.' }] },
      ],
    },
    {
      id: 'warden', title: 'The Repeating Voice', done: 'echo_warden_defeated',
      journal: 'In the Reading Galleries, something repeats itself, guarding a treasure. Find it.',
      chat: [
        { map: 'archive_f2', lines: [
          { who: 'mira', text: "That voice is coming from deeper in the galleries. Whatever it is, it's guarding something." },
          { who: 'bram', text: "Then we find it, and we see what it's guarding. One room at a time." },
        ] },
        { map: 'archive_f1', lines: [{ who: 'bram', text: 'We already found the stairs down. Back to the second floor.' }] },
        { lines: [{ who: 'mira', text: 'The Reading Galleries, the Archive\'s second floor. That voice is still down there.' }] },
      ],
    },
    {
      id: 'lantern', title: 'What It Guarded', done: 'lantern_get',
      journal: 'The Echo Warden has fallen. Claim what it was guarding.',
      chat: [
        { lines: [{ who: 'mira', text: 'The pedestal behind where the Warden stood. Something on it is glowing, and I want to know what.' }] },
      ],
    },
    {
      id: 'galleries', title: 'Bridges of Ink', done: 'archive_f2_done',
      journal: 'Use the Lantern of Recall to reveal hidden ink and find the stairs down.',
      chat: [
        { map: 'archive_f2', lines: [
          { who: 'mira', text: 'Where a path stops and the room seems to go on, raise the Lantern. The Keepers wrote their bridges in ink.' },
          { who: 'bram', text: 'Lamp. Finds bridges. I remember.' },
        ] },
        { lines: [{ who: 'mira', text: 'Back to the Reading Galleries. The Lantern will show us the way across.' }] },
      ],
    },
    {
      id: 'stacks', title: 'The Rootbound Stacks', done: 'boss_door_open',
      journal: 'Search the Rootbound Stacks for the Stacks Key and open the great door at the bottom.',
      chat: [
        { map: 'archive_f3', if: 'stacks_key_found', lines: [
          { who: 'bram', text: "We've got the key. The big door's waiting, and so is whatever's chewing behind it." },
          { who: 'mira', text: "There's a Keeper's font on this floor. We should drink before we knock." },
        ] },
        { map: 'archive_f3', lines: [
          { who: 'bram', text: "The big door needs a key the size of my hand. It's somewhere in these stacks." },
          { who: 'mira', text: 'Watch where the shelves go when they move. And light the braziers. Dark rooms hide things.' },
        ] },
        { lines: [{ who: 'mira', text: 'The Rootbound Stacks, at the bottom of the Archive. The great door is there.' }] },
      ],
    },
    {
      id: 'archivore', title: 'Heart of the Archive', done: 'archivore_defeated',
      journal: 'Something is eating names behind the great door. Stop it.',
      chat: [
        { lines: [
          { who: 'mira', text: 'When its gaze settles on one of us, that one defends, or Bram guards them. It hungers for names.' },
          { who: 'bram', text: "And when it draws a big breath, everybody braces. We keep saying each other's names." },
        ] },
      ],
    },
    {
      id: 'go_home', title: 'Home', done: 'ep1_complete',
      journal: 'The Archivore is gone and the first fragment of the Book of Names is yours. Return to Willowmere.',
      chat: [
        { map: ARCHIVE_MAPS, lines: [
          { who: 'bram', text: 'The passage through the roots leads out to the valley. Then home.' },
          { who: 'mira', text: 'And I want Iris to say my name on the first try.' },
        ] },
        { lines: [
          { who: 'bram', text: 'Home. I want to hear my father\'s name in his own voice.' },
          { who: 'mira', text: 'Willowmere is south and west, back down the pilgrim road. I could walk it asleep now.' },
        ] },
      ],
    },
    {
      id: 'epilogue', title: 'The Road East', done: null,
      journal: 'Willowmere\'s names are home. Yours is still faint. East of the river lies the Nameless Hollow.',
      chat: [
        { lines: [
          { who: 'mira', text: 'There is a town east of here that no map remembers. I would like to change that.' },
          { who: 'bram', text: 'Say your goodbyes properly this time. Then east. All three of us.' },
        ] },
      ],
    },
  ],
};

// ------------------------------------------------------------------------------------------------
// Side quests. `start` flag makes it appear in the journal. Steps work like the main quest.
// `chat` here is a reminder a companion adds after the main hint (if the quest is active).
// ------------------------------------------------------------------------------------------------
export const SIDE_QUESTS = [
  {
    id: 'letters', title: 'Letters for the Living', giver: 'tess', start: 'tess_quest_started', done: 'tess_quest_done',
    reward: REWARDS.tess.item,
    counter: { label: 'Letters found', flags: ['tess_letter_1_found', 'tess_letter_2_found', 'tess_letter_3_found'] },
    steps: [
      {
        id: 'find', done: ['tess_letter_1_found', 'tess_letter_2_found', 'tess_letter_3_found'],
        journal: 'Three of Tess\'s letters flew north toward the Archive. Find them and bring them back to her at the south square.',
        chat: [
          { if: 'mira_joined', lines: [{ who: 'mira', text: 'Tess\'s letters flew toward the Archive. One per floor, if I were a letter.' }] },
          { lines: [{ who: 'hero', text: '(Tess\'s letters flew north, toward the Archive.)' }] },
        ],
      },
      {
        id: 'deliver', done: 'tess_quest_done',
        journal: 'Bring the letters home to Tess at the south square. A courier never loses a letter.',
        chat: [
          { if: 'bram_joined', lines: [{ who: 'bram', text: "We're carrying Tess's letters. She's at the south square. She'll cry. I'll pretend not to." }] },
          { lines: [{ who: 'mira', text: 'We have letters for Tess. She waits by the south square.' }] },
        ],
      },
    ],
  },
  {
    id: 'starter', title: 'The Runaway Starter', giver: 'oren', start: 'starter_quest_started', done: 'starter_done',
    reward: REWARDS.starter.item,
    steps: [
      {
        id: 'find', done: 'starter_found',
        journal: 'Oren\'s sourdough starter crawled out of its crock and headed for the warm side of town.',
        chat: [
          { if: 'mira_joined', lines: [{ who: 'mira', text: "Dough goes where it's warm. The warmest place in Willowmere is Garrick's forge." }] },
          { lines: [{ who: 'hero', text: '(Oren\'s starter went looking for warmth. Where is the warmest spot in town?)' }] },
        ],
      },
      {
        id: 'return', done: 'starter_done',
        journal: 'You found the starter rising by the forge. Bring it home to Oren at the bakery.',
        chat: [
          { if: 'bram_joined', lines: [{ who: 'bram', text: "The dough is getting heavier. I think it's eating my glove. Bakery, please." }] },
          { lines: [{ who: 'hero', text: '(The starter is wobbling. Better get it back to Oren\'s bakery.)' }] },
        ],
      },
    ],
  },
  {
    id: 'wick', title: 'Wick\'s Name-Tag', giver: 'wick', start: 'wick_quest_started', done: 'wick_tag_done',
    reward: REWARDS.wick.item,
    steps: [
      {
        id: 'find', done: 'wick_tag_found',
        journal: 'The Duke, a very bad duck, stole Wick\'s name-tag. His nest is in the reeds by the river.',
        chat: [
          { if: 'bram_joined', lines: [{ who: 'bram', text: "The Duke nests in the river reeds. I've lost to that duck before. Not today." }] },
          { lines: [{ who: 'hero', text: '(The Duke keeps a nest in the reeds by the river.)' }] },
        ],
      },
      {
        id: 'return', done: 'wick_tag_done',
        journal: 'You have Wick\'s tag. Give it back before he worries himself sick.',
        chat: [
          { if: 'mira_joined', lines: [{ who: 'mira', text: 'Wick is waiting for his tag. He belongs to Willowmere. It says so.' }] },
          { lines: [{ who: 'hero', text: '(Wick is waiting for his tag.)' }] },
        ],
      },
    ],
  },
  {
    id: 'ferry_bell', title: 'Nella\'s Ferry Bell', giver: 'nella', start: 'nella_quest_started', done: 'nella_bell_done',
    reward: REWARDS.nella.item,
    steps: [
      {
        id: 'find', done: 'ferry_bell_found',
        journal: 'The storm tore Nella\'s call-bell from the north landing post. Search the valley shallows below the landing.',
        chat: [
          { if: 'mira_joined', lines: [{ who: 'mira', text: 'Nella\'s bell should be in the shallows below the north landing, where the river slows down.' }] },
          { lines: [{ who: 'hero', text: '(Nella\'s bell is in the valley shallows, below the north landing.)' }] },
        ],
      },
      {
        id: 'return', done: 'nella_bell_done',
        journal: 'You found Maudie, the call-bell. Take her home to Nella at the ferry landing.',
        chat: [
          { if: 'bram_joined', lines: [{ who: 'bram', text: 'Nella will want her bell back. Ferry landing, by the inn.' }] },
          { lines: [{ who: 'hero', text: '(Nella is at the ferry landing, by the inn.)' }] },
        ],
      },
    ],
  },
];

// ------------------------------------------------------------------------------------------------
// Banter: after the hint, "Talk" may add one short exchange about where the party is standing.
// Map id -> conditional list (first match wins). Only companions who have joined ever speak.
// ------------------------------------------------------------------------------------------------
const BOTH = ['mira_joined', 'bram_joined'];
export const BANTER = {
  hero_home: [
    { if: BOTH, lines: [
      { who: 'bram', text: 'Your place always smells of onions.' },
      { who: 'mira', text: 'It is a good smell. It smells like someone expects you home.' },
    ] },
  ],
  willowmere: [
    { if: 'archivore_defeated', lines: [
      { who: 'mira', text: 'Every sign is back. I keep reading them out loud. It is becoming a problem.' },
      { who: 'bram', text: "It's not a problem." },
    ] },
    { if: BOTH, lines: [
      { who: 'bram', text: "Smell that? Oren's honey rolls." },
      { who: 'mira', text: 'You cannot smell honey from here.' },
      { who: 'bram', text: 'I can always smell honey.' },
    ] },
  ],
  library: [
    { if: 'mira_joined', lines: [{ who: 'mira', text: "Third shelf from the left is mine. Don't look at it. It's a mess. A precise mess." }] },
  ],
  smithy: [
    { if: 'bram_joined', lines: [{ who: 'bram', text: "I learned every bad word I know in this room. Don't tell Hazel." }] },
  ],
  chapel: [
    { if: 'mira_joined', lines: [{ who: 'mira', text: 'Pip has counted every pew in here. Twice. Ask him how many, if you have an hour.' }] },
  ],
  inn: [
    { if: 'bram_joined', lines: [{ who: 'bram', text: "Hob's honey milk could put a bear to sleep. Barnaby is the proof." }] },
  ],
  bakery: [
    { if: 'archivore_defeated', lines: [{ who: 'bram', text: 'Two bakers, one oven. This is going to be loud for years. Good.' }] },
    { if: 'bram_joined', lines: [{ who: 'bram', text: 'If Oren offers you a roll, take two. One for the road.' }] },
  ],
  valley: [
    { if: 'archivore_defeated', lines: [
      { who: 'mira', text: "The milestone's words look sharper. Or I'm reading it differently now." },
    ] },
    { if: BOTH, lines: [
      { who: 'mira', text: 'Did you know the pilgrim road is older than Willowmere?' },
      { who: 'bram', text: 'I did not.' },
      { who: 'mira', text: "Well, now you do. You're welcome." },
    ] },
  ],
  archive_f1: [
    { if: BOTH, lines: [
      { who: 'bram', text: 'Every one of these drawers is the size of my bed.' },
      { who: 'mira', text: 'Every one of these drawers used to hold a thousand people.' },
    ] },
  ],
  archive_f2: [
    { if: 'lantern_get', lines: [
      { who: 'bram', text: "How's the lamp?" },
      { who: 'mira', text: 'The Lantern of Recall is functioning perfectly.' },
      { who: 'bram', text: 'Good lamp.' },
    ] },
    { if: BOTH, lines: [
      { who: 'mira', text: 'Those readers have been on the same page for a hundred years. I would go mad.' },
      { who: 'bram', text: "You'd finish it in a night and complain about the ending." },
    ] },
  ],
  archive_f3: [
    { if: 'found_thirteenth_bell', lines: [
      { who: 'mira', text: 'Every time that bell rings, someone is forgotten. I want to know who. All of them.' },
    ] },
    { if: BOTH, lines: [
      { who: 'bram', text: "I don't like rooms where the furniture moves." },
      { who: 'mira', text: "You don't like rooms where the furniture is fragile, either." },
      { who: 'bram', text: "That's different." },
    ] },
  ],
  archive_boss: [
    { if: 'archivore_defeated', lines: [{ who: 'bram', text: "Moth. I'll remember that name for her. Somebody should." }] },
  ],
};

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------
const toList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const allSet = (flags, hasFlag) => toList(flags).every((f) => hasFlag(f));

/** First entry whose conditions and map filter match. */
export function pickChat(entries, hasFlag, mapId) {
  for (const e of entries || []) {
    if (e.map && mapId != null && !toList(e.map).includes(mapId)) continue;
    if (e.map && mapId == null) continue;
    if (matches(e, hasFlag)) return e;
  }
  return null;
}

/** The current main quest step (the last step if every flag is set). */
export function currentStep(hasFlag, quest = MAIN_QUEST) {
  for (const step of quest.steps) if (step.done == null || !allSet(step.done, hasFlag)) return step;
  return quest.steps[quest.steps.length - 1];
}

/** Active side quests with their current step: [{ quest, step }]. */
export function activeSideQuests(hasFlag) {
  const out = [];
  for (const q of SIDE_QUESTS) {
    if (!hasFlag(q.start) || hasFlag(q.done)) continue;
    const step = q.steps.find((st) => !allSet(st.done, hasFlag)) || q.steps[q.steps.length - 1];
    out.push({ quest: q, step });
  }
  return out;
}

/**
 * Party chat for the field menu "Talk" command.
 * Returns { step, lines: [{who,text}], side: [{who,text}], banter: [{who,text}] }: the main hint first,
 * then up to `maxSide` side quest reminders, then one optional exchange about the current map.
 * Speakers are 'hero' (thoughts), 'mira' or 'bram'.
 */
export function partyChat(hasFlag, mapId, { maxSide = 1 } = {}) {
  const step = currentStep(hasFlag);
  const main = pickChat(step.chat, hasFlag, mapId);
  const side = [];
  for (const { step: st } of activeSideQuests(hasFlag)) {
    if (side.length >= maxSide) break;
    const e = pickChat(st.chat, hasFlag, mapId);
    if (e) side.push(...e.lines);
  }
  const b = mapId != null ? pickChat(BANTER[mapId], hasFlag, mapId) : null;
  return { step, lines: main ? main.lines : [], side, banter: b ? b.lines : [] };
}

/** Journal entries for the menu: main step plus each started side quest (done ones marked). */
export function journal(hasFlag) {
  const step = currentStep(hasFlag);
  const side = SIDE_QUESTS.filter((q) => hasFlag(q.start)).map((q) => {
    const done = hasFlag(q.done);
    const st = done ? null : (q.steps.find((x) => !allSet(x.done, hasFlag)) || q.steps[q.steps.length - 1]);
    const count = q.counter ? q.counter.flags.filter((f) => hasFlag(f)).length : null;
    return { id: q.id, title: q.title, done, text: done ? 'Complete.' : st.journal,
      counter: q.counter ? { label: q.counter.label, value: count, max: q.counter.flags.length } : null };
  });
  return { main: { title: MAIN_QUEST.title, step: step.title, text: step.journal }, side };
}

export default { FLAGS, FLAG_IDS, REWARDS, MAIN_QUEST, SIDE_QUESTS, BANTER, partyChat, currentStep, journal };
