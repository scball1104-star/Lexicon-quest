// Episode 1 and Episode 2 quests: every story flag, the main quest with journal text, Chrono Trigger style party chat
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
  first_fight_done: 'The wolf pack on the valley road was beaten; the teaching fight is over (first_fight).',
  campfire_rested: 'The party sat down at the Pilgrim\'s Rest campfire once (campfire_rest).',
  archive_key_found: 'Set by the F1 chest that holds the archive_key (map chest flag). Opens the back-stair hint.',
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

  // Side quest: The Lost Bridge (Quill; Whisperwood Hollow, optional, W6-content)
  lost_bridge_started: "Quill told the party about the pilgrims' lost bridge (quill_hint), or they walked into the hollow.",
  hollow_found: 'Entered Whisperwood Hollow with the Lantern and saw the ink bridge (hollow_entry).',
  quill_reminded: 'Mira pointed back at the lost bridge in the valley after the Lantern (quill_reminder, once).',
  briar_alpha_defeated: 'The Briar Alpha is beaten (encounter flag; hollow_after also sets it). Its map actor is gone.',
  hollow_cleared: "The pilgrims' stone gave back three names; the lost bridge story is resolved (hollow_after).",
};

// ------------------------------------------------------------------------------------------------
// Episode 2 flags (EPISODE2_PLAN 2.2, plus the scene-local ones the script needs). Merged into FLAGS below.
// Prefixes: town nh_, dungeon court_, never a bare hollow_ (Whisperwood Hollow owns those).
// ------------------------------------------------------------------------------------------------
export const EP2_FLAGS = {
  // Main story
  ep2_started: 'Mael gave the letter for the Hollow; Episode 2 is underway (ep2_mael).',
  crossing_done: "Garrick's Crossing played at the ford; the east road is open (garrick_crossing).",
  east_road_arrived: 'First arrival on the Fading Road (east_road_arrival).',
  east_first_fight_done: 'The Mist Wolf and Glassback teaching fight was won (east_first_fight).',
  nh_arrived: 'First arrival in the Nameless Hollow (nh_arrival).',
  met_elian: 'Met Mayor Elian at the Fountain of Faces (fountain_faces). Elian appears in his hall.',
  heard_crisis: "Elian told the Hollow's story and took Mael's letter (elian_hall).",
  met_anwen: 'Sister Anwen showed the white line in the register (anwen_register).',
  court_ferry_open: 'Tovin agreed to row to the Court (tovin_ferry). The ferry_court event is rideable.',
  court_entered: 'First arrival at the Court of Mirrors by ferry (court_crossing).',
  court_f1_done: 'Took the stairs down from the Silverglass Antechamber (court_f1_stairs).',
  vex_met: 'Vex Quill appeared in the great mirror on F2 (vex_mirror).',
  other_selves_defeated: 'The Other Selves are beaten (encounter flag; other_selves also sets it). The great mirror is a stair.',
  other_selves_tried: 'W11: the Other Selves fight has started once; a retry plays only the reflections, Mira\'s tips and the card.',
  court_f2_done: 'Took the mirror stair down from the Hall of Other Selves (court_f2_stairs).',
  vow_door_open: 'All three vows lit; the vow door opened; Mira remembered (vow_door).',
  nameless_king_defeated: 'The Nameless King is beaten (encounter flag; king_after also sets it).',
  nameless_king_tried: 'W11: the King fight has started once; a retry plays only his turn, Mira\'s tip and the card.',
  aurel_named: "Elian said his father's name; Aurel is himself again (king_after). The throne mirror leads home.",
  nh_restored: 'The town is Hollowmere again: signs lettered, faces in the water, dusk lifted (hollowmere_restored).',
  ep2_complete: 'The Episode 2 ending played (ep2_ending). Roll CREDITS_EP2, then wake at nh_inn inn_bed.',

  // Story beats and world state
  ep2_morning_done: "Hazel's Episode 2 morning scene played (ep2_morning).",
  garrick_at_ford: 'Garrick (and Hal) are at the ford: set by ep2_mael, cleared by garrick_crossing. Hides them in town.',
  iris_farewell_done: 'Iris showed Mira her list (iris_farewell).',
  saw_old_milestone: 'Mira raised the Lantern at the old milestone (old_milestone).',
  saw_cairns: 'The mist and the cairns were introduced (fading_stretch).',
  fog_looped: 'The party wandered off the cairns once and came back round (fog_loop).',
  waystation_rested: 'The party sat at the Waystation fire once (waystation_rest).',
  saw_court: 'Saw the mere and the Court from the rise (mere_view).',
  court_f1_arrived: 'Court F1 antechamber scene played (court_f1_arrival).',
  court_f2_arrived: 'Court F2 arrival scene played (court_f2_arrival).',
  court_f3_arrived: 'Court F3 arrival scene played (court_f3_arrival). Opens the F3 mirror shortcut.',
  silverglass_lock_lit: 'Latch flag of receptor rec_lock (map); silverglass_lock also sets it. Opens gate_lock.',
  silverglass_lock_seen: 'The beam pan for the Silverglass Lock played once (silverglass_lock).',
  mira_memory_1: "Mira's first memory, the child in the window (mira_memory_1).",
  mira_memory_2: "Mira's second memory, the forgotten promise (mira_memory_2).",
  mira_memory_3: "Mira's third memory, what she finally remembers (vow_door).",
  vow_belonging: 'Latch flag of receptor rec_belonging (map); vow_belonging also sets it.',
  vow_mercy: 'Latch flag of receptor rec_mercy (map); vow_mercy also sets it.',
  vow_courage: 'Latch flag of receptor rec_courage (map); vow_courage also sets it.',
  vow_belonging_seen: 'The Belonging vow memory played (vow_belonging).',
  vow_mercy_seen: 'The Mercy vow memory played (vow_mercy).',
  vow_courage_seen: 'The Courage vow memory played (vow_courage).',
  portraits_started: 'Looked at a first Court portrait; The Three Portraits enters the journal.',
  portrait_child_seen: 'Looked at A Child at the River (portrait_child).',
  portrait_keeper_seen: 'Looked at A Keeper in the Court (portrait_keeper).',
  portrait_king_seen: 'Looked at A King Without a Crown (portrait_king).',
  remembrance_open: 'All three portraits seen; the Remembrance Cache chest appears on F2.',
  mirror_sigil_get: 'Aurel gave the Mirror Sigil (king_after). Keeper mirror doors open.',
  black_feather_found: 'Picked up the black feather in the throne antechamber (black_feather).',
  glass_key_f1: 'Set by the F1 chest that holds a glass_key (map chest flag). Talk points at the glass door.',
  glass_key_f2: 'Set by the F2 chest that holds a glass_key (map chest flag). Talk points at the glass door.',

  // Side quest: The Fountain of Faces (Orla)
  fountain_started: 'Orla told the party about the three witnesses (orla_fountain).',
  testimony_lena: "Heard Lena's testimony (lena_testimony).",
  testimony_tovin: "Heard Tovin's testimony (set by tovin_ferry).",
  testimony_anwen: "Heard Anwen's testimony (anwen_testimony).",
  fountain_done: 'The fountain listened and gave its offerings (fountain_check). +25 Fury when the King fight starts.',

  // Side quest: The Last Route (Tess)
  last_route_started: "Tess asked after her father's satchel (tess_last_route), or the party found it first.",
  satchel_found: "Took the courier's satchel from the Signless Inn's lost-property shelf (satchel_found).",
  last_route_done: "Gave Tess the satchel; she gave the Courier's Knot (tess_last_route).",

  // Side quest: A Letter Answered (Elian, Mael)
  letter_answer_started: 'Elian wrote his reply to Mael (elian_letter).',
  letter_answer_done: 'Mael wrote HOLLOWMERE in the Willowmere Register (letter_answer).',

  // Side quest: Nico's Crowns
  nico_crowns_started: 'Nico told the party about his dream of a paper crown (nico_crowns).',
  paper_crown_found: 'Set by the F3 Belonging chest that holds the Paper Crown (map chest flag).',
  nico_crowns_done: 'Showed Nico the crown; he insisted the hero keep it (nico_crowns).',
};
Object.assign(FLAGS, EP2_FLAGS);

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
        { lines: [{ who: 'hero', text: '(Mira at the library, east of the square. Then the Archive, where the Keepers kept a piece of the Book of Names.)' }] },
      ],
    },
    {
      id: 'south_gate', title: 'The South Gate', done: 'bram_joined',
      journal: 'With Mira beside you, head for the south gate. Mael says Bram may be on watch.',
      chat: [
        { lines: [
          { who: 'mira', text: 'Mael said the south gate. Straight down the main road from the square.' },
          { who: 'mira', text: 'The Keepers kept the first fragment of the Book of Names in the Archive. If the names are going anywhere, they go there.' },
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
        { map: 'archive_f1', if: 'archive_key_found', lines: [
          { who: 'mira', text: 'We have the key. The door it fits is in the east wing: through the plate room, then north.' },
          { who: 'bram', text: "East, then. Back past the pots and through the blocks. If a block wants pushing, I'm pushing it." },
        ] },
        { map: 'archive_f1', lines: [
          { who: 'mira', text: 'The stairs are behind a locked door, east wing. The Keepers kept keys far from locks: the key will be in the west wing.' },
          { who: 'bram', text: "West for the key, east for the door. And if a block looks like it wants pushing, I'm pushing it." },
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
          { who: 'mira', text: 'Where a path stops, raise the Lantern with {i:btn_pageR}. The Keepers wrote their bridges in ink.' },
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
          { who: 'bram', text: 'Bars mean a switch. That side room has three crystals. Three lights, one door.' },
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
  {
    // W6-content: the optional Whisperwood Hollow. Quill's hint (or walking in) starts it; the reward is the
    // Briar Alpha's guaranteed drop, Thornwake (battle loot, not a scene give).
    id: 'lost_bridge', title: 'The Lost Bridge', giver: 'quill', start: 'lost_bridge_started', done: 'hollow_cleared',
    reward: 'thornwake',
    steps: [
      {
        id: 'find', done: 'hollow_found',
        journal: 'Quill says the pilgrims lost a bridge at a black pool past the pines, east of the fork. Lost, not broken.',
        chat: [
          { if: 'lantern_get', nudge: true, lines: [{ who: 'bram', text: "Quill's pool, east of the fork. A root arch beside black water. We have a lamp that finds things now." }] },
          { if: 'mira_joined', lines: [{ who: 'mira', text: 'A bridge that is lost, not broken. I would bet on hidden ink. We need a true light.' }] },
          { lines: [{ who: 'hero', text: '(The pilgrims lost a bridge at a black pool east of the fork.)' }] },
        ],
      },
      {
        id: 'alpha', done: 'briar_alpha_defeated',
        journal: 'Under the pines lies a hollow. The lost bridge is hidden ink, and something big keeps the far end.',
        chat: [
          { if: 'mira_joined', map: 'whisperwood_hollow', lines: [{ who: 'mira', text: 'The barred door in the north wall wants weight on its plate. That block, maybe.' }] },
          { if: 'bram_joined', lines: [{ who: 'bram', text: "Something big is guarding the pilgrims' stone. Bring fire. Bring an axe." }] },
          { lines: [{ who: 'hero', text: '(Something guards the far end of Whisperwood Hollow.)' }] },
        ],
      },
      {
        id: 'stone', done: 'hollow_cleared',
        journal: "The Briar Alpha is down. Read the pilgrims' stone by Lantern light.",
        chat: [
          { lines: [{ who: 'hero', text: "(The pilgrims' stone stands where the Alpha lay.)" }] },
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
  whisperwood_hollow: [
    { if: ['hollow_cleared', ...BOTH], lines: [
      { who: 'bram', text: 'Sorrel, Ansel, Wren. I keep saying them. Somebody should.' },
    ] },
    { if: BOTH, lines: [
      { who: 'mira', text: 'Roots overhead, ink underfoot. Like the Archive, only nobody built it.' },
      { who: 'bram', text: "Nobody built it, and something still guards it. I don't like that." },
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


// ================================================================================================
// Episode 2: rewards, the main quest, side quests and banter. The Episode 2 quest takes over the journal and
// Talk once ep1_complete is set (mainQuestFor). Talk always names the next step, in Mira's or Bram's voice.
// ================================================================================================
export const REWARDS_EP2 = {
  hazel: { item: 'hi_potion', qty: 2, why: "Hazel's two Hi-Potions (ep2_morning)" },
  fountain: { item: 'merewarden_mantle', qty: 1, gold: 90,
    why: 'The Fountain of Faces (set piece). The canon 90 gold needs a gold give in the cutscene API (not there yet).' },
  fountain_extra: { item: 'hi_ether', qty: 2, why: 'The Fountain of Faces' },
  last_route: { item: 'courier_knot', qty: 1, why: 'The Last Route (Tess)' },
  letter: { item: 'phoenix_feather', qty: 2, why: 'A Letter Answered (Mael)' },
  nico: { item: 'paper_crown', qty: 1, why: "Nico's Crowns (found in the F3 Belonging chest; Nico says keep it)" },
  portraits: { item: 'ether', qty: 2, why: 'The Three Portraits (the Remembrance Cache chest: 140 gold, 2 Ethers, book court_ledger)' },
  kept_promise: { item: 'kept_promise', qty: 1, why: 'Elian gives Mira his bow (king_after)' },
};

const NH_MAPS = ['nameless_hollow', 'nh_hall', 'nh_chapel', 'nh_inn', 'nh_shop', 'nh_smithy'];
const COURT_MAPS = ['court_f1', 'court_f2', 'court_f3', 'court_throne'];
const VOWS = ['vow_belonging', 'vow_mercy', 'vow_courage'];
const m = (text) => ({ who: 'mira', text });
const b = (text) => ({ who: 'bram', text });

export const MAIN_QUEST_EP2 = {
  id: 'main_ep2',
  title: 'The Town Without a Name',
  steps: [
    {
      id: 'road_east', title: 'The Road East', done: 'crossing_done',
      journal: 'Mael has written a letter to the town east of the river. Take it across the valley, by the east branch.',
      chat: [
        { map: 'hero_home', ifNot: 'ep2_started', lines: [
          m('Mael is at the well in Lantern Square. Out the door and down the lane.'),
          b("I'll carry your pack. I packed it, so I know what's in it."),
        ] },
        { map: TOWN_MAPS, ifNot: 'ep2_started', lines: [m('Mael wants us at the well in Lantern Square first. He has something for us.')] },
        { ifNot: 'ep2_started', lines: [m('Mael wanted us at the well in Willowmere before we go anywhere.')] },
        { map: TOWN_MAPS, lines: [
          b('South gate, then the valley. At the fork, the east branch, down to the ford. My father is there.'),
          m('Say goodbye to anyone you would miss. Iris made me a list.'),
        ] },
        { map: 'valley', lines: [
          b('The east branch at the fork, along the tributary. The ford is where the road washed out.'),
          m('Listen for hammering. Garrick does not do anything quietly.'),
        ] },
        { lines: [b('The ford on the tributary, east of the valley fork. My father went ahead.')] },
      ],
    },
    {
      id: 'fading_road', title: 'The Fading Road', done: 'nh_arrived',
      journal: 'Follow the Fading Road upstream along the river. Where the mist hides the road, keep to the cairns.',
      chat: [
        { map: 'valley', lines: [
          b("Over Garrick's Crossing, then east along the bank. Say his name when you cross."),
          m('It is a rule now. It is carved into a rail.'),
        ] },
        { map: 'east_road', ifNot: 'saw_cairns', lines: [m('Upstream, east. The road thins out, but the river does not. Follow the water.')] },
        { map: 'east_road', ifNot: 'saw_court', lines: [
          m('Keep to the cairns. Each stack is in sight of the last one. Lose them and the mist walks us back.'),
          b('And past the mist, somebody keeps a fire. I can smell the kettle.'),
        ] },
        { map: 'east_road', lines: [m('The town by the mere. East, along the shore. The road ends at its gate.')] },
        { lines: [m('East, along the river, to wherever this road still remembers.')] },
      ],
    },
    {
      id: 'nameless_hollow', title: 'The Nameless Hollow', done: 'court_ferry_open',
      journal: 'A town with no name and no reflections. Hear Mayor Elian, then Sister Anwen, then find a boat.',
      chat: [
        { ifNot: 'met_elian', map: NH_MAPS, lines: [m('Corin said the mayor would be at the fountain, in the middle of the square.')] },
        { ifNot: 'met_elian', lines: [m('The town by the mere. Its mayor is the one to find.')] },
        { ifNot: 'heard_crisis', map: 'nameless_hollow', lines: [
          m('Elian said the hall. The big blank door on the north side of the square.'),
          b("He said sitting down. I'm in favor of sitting down."),
        ] },
        { ifNot: 'heard_crisis', lines: [m('Elian is waiting at his hall, on the north side of the square.')] },
        { ifNot: 'met_anwen', lines: [
          m('Sister Anwen, at the chapel. South-east corner of the square, under the empty bell frame.'),
          b("She heard the bell. She'll want to talk about the bell."),
        ] },
        { lines: [
          m('Tovin, at the pier on the north shore. He rows the only boat on the mere.'),
          b("Anwen said he'd say no. So we ask twice."),
        ] },
      ],
    },
    {
      id: 'court_f1', title: 'The Silverglass Antechamber', done: 'court_f1_done',
      journal: 'Across the mere stands the Court of Mirrors. Follow the moonlight through the antechamber and find the way down.',
      chat: [
        { map: NH_MAPS, lines: [b("Tovin's boat is at the pier. Ring the post at the end, and he rows us across.")] },
        { map: 'court_f1', if: 'silverglass_lock_lit', lines: [m('The crystal by the stairs is lit and the gate is open. Down we go.')] },
        { map: 'court_f1', if: 'glass_key_f1', lines: [
          m('We have the glass key. The locked door is off the west side of the antechamber, where the light first pointed.'),
          m('Behind it is a moon window. Carry its light with the lenses, all the way to the crystal by the stairs.'),
          b('A block sits in the light in the north corridor. Shift it.'),
        ] },
        { map: 'court_f1', lines: [
          m('That mirror in the antechamber turns. Turn it until the light finds the crystal in the east wall.'),
          b("The glass door in the west wing is locked. Keys are never next to their locks. I'd look east."),
        ] },
        { lines: [m('The Court of Mirrors, across the mere. Tovin will row us whenever we ask.')] },
      ],
    },
    {
      id: 'court_f2', title: 'The Hall of Other Selves', done: 'court_f2_done',
      journal: 'On the second floor, light makes bridges. Cross the Well of Reflections and find what waits in the west wing.',
      chat: [
        { map: 'court_f1', lines: [b('We found the stairs already. North end of the stairs hall, then down.')] },
        { map: 'court_f2', if: 'other_selves_defeated', lines: [b('The great mirror in the arena is a stair now. Down.')] },
        { map: 'court_f2', if: 'vex_met', lines: [
          m('The arena is past the font. If two of them move as one, push one back: a Lunge, or a Pin Shot.'),
          b('Or break one. Hard to keep a rhythm with your shield in pieces.'),
        ] },
        { map: 'court_f2', if: 'glass_key_f2', lines: [
          m('We have the key. The locked glass door is at the west end of the south gallery.'),
          b('And past it, a font. Then whatever is making that big mirror hum.'),
        ] },
        { map: 'court_f2', if: 'mira_memory_2', lines: [
          m('The door at the end of the south gallery is glass. The key will be somewhere we already crossed.'),
          b("The east gallery's far corner. I'd look there."),
        ] },
        { map: 'court_f2', lines: [
          m('Turn the mirror in the north gallery. A lit glass rail holds our weight.'),
          m('One beam, two bridges. The island sits in the middle of the Well. The way on is south from there.'),
        ] },
        { lines: [m('The Hall of Other Selves, on the second floor of the Court. The bridges there are made of light.')] },
      ],
    },
    {
      id: 'court_f3', title: 'The Unnamed Throne', done: 'vow_door_open',
      journal: 'Three wings, three vows, one door. Light the vow mirror in each wing of the Unnamed Throne.',
      chat: [
        { map: 'court_f2', lines: [b('The mirror stair in the arena goes down to the third floor.')] },
        { map: 'court_f3', if: VOWS, lines: [m('All three vows are lit. The vow door is open, north of the hall.')] },
        { map: 'court_f3', if: ['vow_belonging', 'vow_mercy'], lines: [
          b("Two lit. The south wing is left. That heavy mirror sits off the line. I'll shove it onto its socket."),
        ] },
        { map: 'court_f3', if: ['vow_belonging', 'vow_courage'], lines: [
          m('Two lit. The east wing is left: light bridges over the drop. If we fall, the ledge climbs back.'),
        ] },
        { map: 'court_f3', if: ['vow_mercy', 'vow_courage'], lines: [
          m('Two lit. The west wing is left, the dark one. The beam is the only light there. Follow it.'),
        ] },
        { map: 'court_f3', lines: [
          m('Three wings: west, east and south. Each has a vow mirror. Light all three and the door opens.'),
          b("The south one has a mirror too heavy to turn where it stands. That one's mine to shove."),
        ] },
        { lines: [m('The Unnamed Throne, the Court\'s third floor. Three vows, three wings, one door.')] },
      ],
    },
    {
      id: 'king', title: "The King's Mirror", done: 'nameless_king_defeated',
      journal: 'Behind the vow door lies the throne room. Someone there is keeping the whole town in a mirror.',
      chat: [
        { map: ['court_f3', 'court_throne'], lines: [
          m('When his mirror turns to one of us, that one defends, or Bram guards them. Break him and the glass cracks.'),
          b('And if he seals one of us in glass: Recall, or a Silver Salve. Fitch sells them.'),
          m('When his court stands, the weeping one mends him. Hit past Pride: True Strike, or Dawnname on them all.'),
        ] },
        { lines: [m('The throne room, behind the vow door on the third floor. Drink at the font before we knock.')] },
      ],
    },
    {
      id: 'hollowmere', title: 'Hollowmere', done: 'nh_restored',
      journal: 'The King has his name back. Go through the great mirror. The town should see you come home.',
      chat: [
        { map: 'court_throne', lines: [m('Through the great mirror. Aurel said the town should see us come home.')] },
        { lines: [b('Back to the town. The great mirror in the throne room goes straight to the square.')] },
      ],
    },
    {
      id: 'epilogue2', title: 'Toward Emberpeak', done: null,
      journal: 'Hollowmere has its name. Yours is in the Book twice. Far to the north-east, Emberpeak is burning.',
      chat: [
        { map: NH_MAPS, lines: [
          b("Emberpeak is north-east, past the mountains. When you're ready, {hero}. Not before."),
          m('The mirror in the chapel opens onto Willowmere now. Mael will want to hear all of it.'),
        ] },
        { lines: [
          m('Hollowmere has its name. Yours is in the Book twice. I want to know why.'),
          b("And Emberpeak is burning. That's my mountain. When we're ready, we go."),
        ] },
      ],
    },
  ],
};

export const SIDE_QUESTS_EP2 = [
  {
    id: 'fountain', title: 'The Fountain of Faces', giver: 'orla', start: 'fountain_started', done: 'fountain_done',
    reward: REWARDS_EP2.fountain.item,
    counter: { label: 'Witnesses heard', flags: ['testimony_lena', 'testimony_tovin', 'testimony_anwen'] },
    steps: [
      {
        id: 'witnesses', done: ['testimony_lena', 'testimony_tovin', 'testimony_anwen'],
        journal: 'The fountain listens when three witnesses have spoken: Lena the watchmaker, Tovin, and Sister Anwen.',
        chat: [
          { ifNot: 'testimony_lena', lines: [m('Lena is a witness. Her door is under the clocktower, north-east of the square.')] },
          { lines: [m('Sister Anwen is the last witness. The chapel, south-east of the square.')] },
        ],
      },
      {
        id: 'fountain', done: 'fountain_done',
        journal: 'All three witnesses have spoken. Look into the Fountain of Faces.',
        chat: [{ lines: [m('All three witnesses have spoken. The fountain should listen to us now.')] }],
      },
    ],
  },
  {
    id: 'last_route', title: 'The Last Route', giver: 'tess', start: 'last_route_started', done: 'last_route_done',
    reward: REWARDS_EP2.last_route.item,
    steps: [
      {
        id: 'find', done: 'satchel_found',
        journal: "Tess's father carried the east post, and his route book never came home. Look for a lost-property shelf.",
        chat: [
          { map: NH_MAPS, lines: [b('An inn always has a lost-property shelf. The Signless Inn, west side of the square.')] },
          { lines: [m("Tess's father's satchel. If the Hollow has a lost-property shelf, it is there.")] },
        ],
      },
      {
        id: 'deliver', done: 'last_route_done',
        journal: "You found the courier's satchel. Take it home to Tess, at the south square in Willowmere.",
        chat: [
          { if: 'mirror_sigil_get', lines: [m('The chapel mirror goes straight to Willowmere now. Tess is at the south square.')] },
          { lines: [b("Tess's satchel. She is at the south square in Willowmere. A long walk. Worth it.")] },
        ],
      },
    ],
  },
  {
    id: 'letter_answer', title: 'A Letter Answered', giver: 'elian', start: 'letter_answer_started', done: 'letter_answer_done',
    reward: REWARDS_EP2.letter.item,
    steps: [
      {
        id: 'deliver', done: 'letter_answer_done',
        journal: "Elian has answered Mael's letter, signed with a town's name at last. Carry it to Mael in Willowmere.",
        chat: [
          { if: 'mirror_sigil_get', lines: [m("The mirror in Hollowmere's chapel opens onto Willowmere's. Mael is at the well.")] },
          { lines: [m("Elian's reply, for Mael. He will be at the well in Lantern Square.")] },
        ],
      },
    ],
  },
  {
    id: 'nico_crowns', title: "Nico's Crowns", giver: 'nico', start: 'nico_crowns_started', done: 'nico_crowns_done',
    reward: REWARDS_EP2.nico.item,
    steps: [
      {
        id: 'find', done: 'paper_crown_found',
        journal: 'Nico dreams of a paper crown that somebody gave somebody. If one still exists, the Court is keeping it.',
        chat: [
          { map: 'court_f3', lines: [m('If a crown is hidden anywhere, it is in the dark wing, where only the beam can see.')] },
          { lines: [m("Nico's paper crown. If it exists, the Court is keeping it.")] },
        ],
      },
      {
        id: 'show', done: 'nico_crowns_done',
        journal: 'You found a paper crown in the Court. Show it to Nico, by the town gate.',
        chat: [{ lines: [b('Nico is by the gate, chalking. Show him the crown.')] }],
      },
    ],
  },
  {
    id: 'three_portraits', title: 'The Three Portraits', giver: 'orla', start: 'portraits_started', done: 'remembrance_open',
    reward: REWARDS_EP2.portraits.item,
    counter: { label: 'Portraits seen', flags: ['portrait_child_seen', 'portrait_keeper_seen', 'portrait_king_seen'] },
    steps: [
      {
        id: 'look', done: 'remembrance_open',
        journal: 'Orla says there are three portraits in the Court, and the middle frame is empty. Find all three.',
        chat: [
          { map: 'court_f2', lines: [m('A child, a keeper, a king. One hangs by the stairs we came down. The others are off the galleries.')] },
          { lines: [m("The three portraits are on the Court's second floor.")] },
        ],
      },
    ],
  },
];

const EP2_BANTER = {
  east_road: [
    { if: [...BOTH, 'nh_restored'], lines: [
      m('The road remembers now. The ruts run all the way to the gate.'),
      b('We walked it enough times. It had no choice.'),
    ] },
    { if: BOTH, lines: [
      b('Is it me, or is the grass getting quieter?'),
      m("It's not you. It's the road."),
    ] },
  ],
  nameless_hollow: [
    { if: [...BOTH, 'nh_restored'], lines: [
      m('Hollowmere. I keep saying it under my breath. Bram, stop smiling.'),
      b("I'm not smiling. This is my face."),
    ] },
    { if: BOTH, lines: [
      b("Everyone here is so friendly. It's unsettling."),
      m('They have nothing else to hold on to. So they hold on to each other.'),
    ] },
  ],
  nh_hall: [{ if: BOTH, lines: [
    m("Elian's ledger has every name in town in it. Every day. In the same order."),
    b("He'd get on with Holt."),
  ] }],
  nh_chapel: [{ if: BOTH, lines: [m('Forty-one. I keep counting them. I keep getting forty-one.')] }],
  nh_inn: [{ if: BOTH, lines: [b('Beds that remember you. Wren says that as if it were a good thing.')] }],
  nh_shop: [{ if: BOTH, lines: [b('Fitch just told a rope it was a rope. The rope seemed to appreciate it.')] }],
  nh_smithy: [{ if: BOTH, lines: [b("Glass that holds an edge. My father would hate it. Then he'd ask how.")] }],
  court_f1: [{ if: BOTH, lines: [
    b('I keep seeing myself out of the corner of my eye. I look worried.'),
    m('You look like you always look.'),
    b('Exactly.'),
  ] }],
  court_f2: [
    { if: [...BOTH, 'other_selves_defeated'], lines: [
      m('My reflection said I would run. I keep thinking about how sure it sounded.'),
      b('Mine said I stand still. I move plenty. I am moving right now.'),
    ] },
    { if: BOTH, lines: [
      m('Those portraits. I know some of those ears.'),
      b("Holt's. I'm telling you."),
    ] },
  ],
  court_f3: [{ if: BOTH, lines: [
    b("Every step down here, something steps up to meet it. I don't like it."),
    m('It is only the floor, Bram.'),
    b("That's what I don't like."),
  ] }],
  court_throne: [{ if: [...BOTH, 'aurel_named'], lines: [b('A guard at a post nobody came to relieve. Well. We came.')] }],
};
Object.assign(BANTER, EP2_BANTER);
BANTER.willowmere.unshift({ if: [...BOTH, 'ep2_complete'], lines: [
  m('Willowmere looks smaller. No. It looks the same. I look bigger.'),
  b('You look the same, Mira.'),
] });

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------
const toList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const allSet = (flags, hasFlag) => toList(flags).every((f) => hasFlag(f));

/** Every side quest of both episodes, in journal order. */
export const ALL_SIDE_QUESTS = [...SIDE_QUESTS, ...SIDE_QUESTS_EP2];

/** The main quest the journal and Talk follow: Episode 2's once Episode 1 is complete. */
export function mainQuestFor(hasFlag) {
  return hasFlag('ep1_complete') ? MAIN_QUEST_EP2 : MAIN_QUEST;
}

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
  for (const q of ALL_SIDE_QUESTS) {
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
  const step = currentStep(hasFlag, mainQuestFor(hasFlag));
  const main = pickChat(step.chat, hasFlag, mapId);
  const side = [];
  // A side entry marked `nudge` (fresh news, e.g. the Lantern for the lost bridge) goes before older reminders.
  const picks = [];
  for (const { step: st } of activeSideQuests(hasFlag)) {
    const e = pickChat(st.chat, hasFlag, mapId);
    if (e) picks.push(e);
  }
  picks.sort((a, b) => (b.nudge ? 1 : 0) - (a.nudge ? 1 : 0));
  for (const e of picks) {
    if (side.length >= maxSide) break;
    side.push(...e.lines);
  }
  const b = mapId != null ? pickChat(BANTER[mapId], hasFlag, mapId) : null;
  return { step, lines: main ? main.lines : [], side, banter: b ? b.lines : [] };
}

/** Journal entries for the menu: main step plus each started side quest (done ones marked). */
export function journal(hasFlag) {
  const quest = mainQuestFor(hasFlag);
  const step = currentStep(hasFlag, quest);
  const side = ALL_SIDE_QUESTS.filter((q) => hasFlag(q.start)).map((q) => {
    const done = hasFlag(q.done);
    const st = done ? null : (q.steps.find((x) => !allSet(x.done, hasFlag)) || q.steps[q.steps.length - 1]);
    const count = q.counter ? q.counter.flags.filter((f) => hasFlag(f)).length : null;
    return { id: q.id, title: q.title, done, text: done ? 'Complete.' : st.journal,
      counter: q.counter ? { label: q.counter.label, value: count, max: q.counter.flags.length } : null };
  });
  return { main: { title: quest.title, step: step.title, text: step.journal }, side };
}

export default { FLAGS, FLAG_IDS, REWARDS, MAIN_QUEST, SIDE_QUESTS, BANTER, partyChat, currentStep, journal,
  EP2_FLAGS, REWARDS_EP2, MAIN_QUEST_EP2, SIDE_QUESTS_EP2, ALL_SIDE_QUESTS, mainQuestFor };
