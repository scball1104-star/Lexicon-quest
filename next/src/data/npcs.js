// Episode 1 NPCs. Pure data + tiny pure helpers.
//
// Record shape:
//   id: {
//     name, sprite (COMMON.md id), portrait? (optional, used if the asset exists), map (COMMON map id),
//     spot (where the map author should place them), move, radius?, path?, partner?,
//     show?: { if, ifNot }   (when the NPC exists on the map; omitted = always),
//     solid? (default true), service?: { type: 'shop'|'inn', id?, price? } (opened after the talk lines),
//     about (one line for authors), talk: [ { if, ifNot, lines | scene }, ..., { lines } ]
//   }
// Movement: 'stand' (never moves), 'turn' (stands, looks around now and then), 'wander' (within
// `radius` tiles of the spot), 'patrol' (walks `path`, a list of directions, then reverses),
// 'tag' (runs about quickly, chasing `partner`; falls back to a fast wander), 'sleep' (lies still,
// shows the zzz emote now and then). `move` may also be a conditional list
// [{ if, ifNot, move, radius?, partner?, path? }, ..., { move }]: first match wins (see moveFor).
// Talk: first entry whose conditions match wins (see story/dialogue.js). A `scene` entry runs a scene
// from story/ep1.js instead of plain lines. Plain strings are said by the NPC; { who, text } lines are
// party interjections (who: 'mira' | 'bram' | 'hero') or narration (who: null).

import { pick, matches, resolve } from './story/dialogue.js';

const M = 'mira_joined';
const B = 'bram_joined';
const DONE = 'archivore_defeated';
const END = 'ep1_complete';

export const NPCS = {
  // ----------------------------------------------------------------------------------------------
  // Willowmere (outdoors)
  // ----------------------------------------------------------------------------------------------
  mael: {
    name: 'Elder Mael', sprite: 'npc_elder', portrait: 'mael', map: 'willowmere',
    spot: 'Lantern Square, beside the well, facing south', move: 'turn',
    about: 'Town elder and keeper of the Town Register. Gentle, wry, hiding a fear about the hero\'s name.',
    talk: [
      { if: END, lines: [
        'Every name is back in the Register but one. I check it every morning now, before my tea.',
        'I will find out why, {hero}. You have my word, and an old man\'s word is all he has left to spend.',
      ] },
      { if: B, lines: [
        'Three of you. Good. Names are harder to lose when there are people around to say them.',
        'The Archive is at the north end of the valley. Follow the pilgrim road, and go gently.',
      ] },
      { if: M, lines: [
        'Ah, Mira. Good. Now the south gate, and whatever mood Bram is in.',
        { who: 'mira', text: "He's always in a mood. Usually a good one." },
      ] },
      { if: 'met_mael', lines: [
        'Mira, at the library, east of the square. Then the south gate.',
        'Go gently, {hero}. Old places do not like to be hurried.',
      ] },
      { if: 'intro_done', scene: 'mael_intro' },
      { lines: ['Good morning, {hero}.'] },
    ],
  },

  tess: {
    name: 'Tess', sprite: 'npc_tess', portrait: 'tess', map: 'willowmere',
    spot: 'South square, by the notice board near the gate', move: 'wander', radius: 2,
    about: 'Willowmere\'s courier, quick and proud of her job. Her father, the old courier, vanished north years ago.',
    talk: [
      { if: ['tess_quest_done', DONE], lines: [
        "I still can't remember my father's name. Whatever took it, it wasn't your Archivore. That was older.",
        'But I have his letter, and his crossed sevens. That is a thread. Couriers follow threads.',
      ] },
      { if: 'tess_quest_done', lines: [
        'Three letters home. My satchel feels lighter and heavier at the same time.',
        'Mind the boots. They know the roads better than you do. Let them lead.',
      ] },
      { if: 'intro_done', ifNot: 'tess_quest_started', scene: 'tess_letters' },
      { if: 'tess_letter_1_found', ifNot: 'tess_letter_1_delivered', scene: 'tess_letters' },
      { if: 'tess_letter_2_found', ifNot: 'tess_letter_2_delivered', scene: 'tess_letters' },
      { if: 'tess_letter_3_found', ifNot: 'tess_letter_3_delivered', scene: 'tess_letters' },
      { if: DONE, lines: [
        "You came back! Did you see my letters down there? They'll be in the quiet places. Letters like quiet.",
      ] },
      { lines: [
        'One letter per floor of the Archive, if I know letters. And I know letters.',
        'A courier never loses a letter. A courier sometimes needs a little help finding one.',
      ] },
    ],
  },

  nella: {
    name: 'Nella', sprite: 'npc_ferry', portrait: 'nella', map: 'willowmere',
    spot: 'Ferry landing on the river, beside the inn', move: 'turn',
    about: 'The Ferrymender. Salty, practical, names boats by the sound of their ropes. Lark\'s mother, Edda\'s daughter.',
    talk: [
      { if: 'ferry_bell_found', ifNot: 'nella_bell_done', scene: 'nella_bell' },
      { if: 'intro_done', ifNot: 'nella_quest_started', scene: 'nella_bell' },
      { if: [DONE, 'tess_letter_2_delivered'], lines: [
        'Mother and I mended the little skiff this morning. She talks to the boards. I talk to the rope. We get on.',
        'Lark has a grandmother now. She keeps saying it, like a new word she is trying out.',
      ] },
      { if: DONE, lines: [
        'Every boat on the landing has its name back. Tomorrow I repaint them all, with Lark.',
        'And old Edda by the flowerbeds is my mother. How do you forget your own mother?',
        "You don't. Something takes her from you. I'd like a word with whatever it was.",
      ] },
      { if: 'tess_letter_2_delivered', lines: [
        'Tess put a letter in old Edda\'s hands, and Edda looked straight at me and said my name.',
        "She's my mother. I walked past her every morning for a month like she was a stranger.",
      ] },
      { if: B, lines: [
        'Hear the river under the bridge? I used to name each boat by the sound of its rope.',
        "The ropes still sing. I just can't hear what they're called anymore.",
      ] },
      { lines: [
        "Ferry's tied up until I get my bell back. The river's laughing at me. I can hear it.",
      ] },
    ],
  },

  edda: {
    name: 'Edda', sprite: 'npc_old_woman', portrait: 'edda', map: 'willowmere',
    spot: 'The twelve flowerbeds along the river road, near the thirteenth bed', move: 'wander', radius: 2,
    about: 'Old gardener who keeps a flowerbed for every founding family. Nella\'s mother; the fading has taken that from both.',
    talk: [
      { if: DONE, lines: [
        'My Nella. My daughter. I said it to the lantern blossoms all morning so they would know too.',
        'My mother told me the thirteenth bed was for a bell that went away. I always kept it, in case it came back.',
      ] },
      { if: 'tess_letter_2_delivered', lines: [
        'A letter came. "Mother," it says. From the ferry girl. From Nella.',
        'She is my daughter. I knew her face every day. I only lost the word for her.',
      ] },
      { if: B, lines: [
        'Off to the Archive? Bring me back a name, dear. Any name. I seem to have misplaced one.',
        'There is a woman at the ferry who always waves at me. I wish I knew why it makes me want to cry.',
      ] },
      { lines: [
        'Twelve beds, one for each founding family. Lantern blossoms keep names alive, my mother used to say.',
        'And a thirteenth bed, for nobody I can think of. I plant it every spring all the same.',
      ] },
    ],
  },

  holt: {
    name: 'Sergeant Holt', sprite: 'npc_guard', portrait: 'holt', map: 'willowmere',
    spot: 'South gate, right-hand post (Bram stands at the left post until he joins)', move: 'stand',
    about: 'The old gate sergeant. Steady, kind, keeps his promises. Holds Garrick\'s name for Bram.',
    talk: [
      { if: DONE, lines: [
        "Garrick, Garrick, Garrick. Said it every hour. My wife thinks I've taken up a hobby.",
        'Good to have you home, all three of you. Names and all.',
      ] },
      { if: B, lines: [
        'Seven o\'clock, Garrick. Eight o\'clock, Garrick. I keep my promises, son. Go on with you.',
        { who: 'bram', text: 'Thanks, Sergeant. I mean it.' },
      ] },
      { if: 'met_mael', lines: [
        "Bram's stubborn, but he's soft in the middle. Like good bread. Don't tell him I said so.",
      ] },
      { lines: [
        'Morning. Nobody goes out alone today. The Elder\'s orders, since the signs started fading.',
        "Strange days. My own wife called me Hector this morning. I'm Holt. Have been for fifty years.",
      ] },
    ],
  },

  bram: {
    name: 'Bram', sprite: 'bram', portrait: 'bram', map: 'willowmere',
    spot: 'South gate, left-hand post, facing north into town', move: 'stand', show: { ifNot: B },
    about: 'Town guard and the smith\'s son. Joins at the gate (scene south_gate). Party member after that.',
    talk: [{ scene: 'south_gate' }],
  },

  cobb: {
    name: 'Cobb', sprite: 'npc_farmer', portrait: 'cobb', map: 'willowmere',
    spot: 'The chicken run behind the library, east side of town', move: 'wander', radius: 2,
    about: 'Farmer. Named every one of his hens, and now cannot tell them apart.',
    talk: [
      { if: DONE, lines: [
        'Henrietta answers to Henrietta again! And Bertha to Bertha! Order is restored to the coop!',
      ] },
      { if: B, lines: [
        "Mind the wolves in the valley. They've been bolder since spring. Something's got them nervous.",
      ] },
      { lines: [
        'I named every one of my hens. Now they all look at me like I owe them money.',
        "This one's Henrietta. Or Bertha. She doesn't know either, and frankly, neither do I.",
      ] },
    ],
  },

  henrietta: {
    name: 'Henrietta', sprite: 'animal_chicken', map: 'willowmere', spot: 'Chicken run', move: 'wander', radius: 3, solid: false,
    about: 'A hen. Possibly Bertha.',
    talk: [
      { if: DONE, lines: [{ who: null, text: 'Henrietta clucks with great dignity. She knows exactly who she is.' }] },
      { lines: [{ who: null, text: 'Bawk. The hen looks at you as if you might know her name.' }] },
    ],
  },

  bertha: {
    name: 'Bertha', sprite: 'animal_chicken', map: 'willowmere', spot: 'Chicken run', move: 'wander', radius: 3, solid: false,
    about: 'A hen. Possibly Henrietta.',
    talk: [
      { if: DONE, lines: [{ who: null, text: 'Bertha pecks your boot, firmly, the way only Bertha would.' }] },
      { lines: [{ who: null, text: 'Bawk? The hen pecks at a pebble, then at your boot, then at the pebble again.' }] },
    ],
  },

  wick: {
    name: 'Wick', sprite: 'npc_child_a', map: 'willowmere',
    spot: 'Lantern Square, near the well', move: [{ if: 'wick_tag_done', move: 'tag', partner: 'lark' }, { move: 'turn' }],
    about: 'A small, brave, worried boy. The Duke stole the name-tag his mother sewed so he would not be forgotten.',
    talk: [
      { if: 'wick_tag_found', ifNot: 'wick_tag_done', scene: 'wick_tag' },
      { if: 'intro_done', ifNot: 'wick_quest_started', scene: 'wick_tag' },
      { if: ['wick_tag_done', DONE], lines: [
        "My tag still says me! And the gate says Willowmere again, so I'm double safe!",
      ] },
      { if: 'wick_tag_done', lines: [
        "I wear my tag on a string now. The Duke can't reach a string. Probably.",
      ] },
      { lines: [
        "I can't play tag without my tag. Lark made that rule.",
        "If you find the Duke's nest, look out. He bites. He bit me. He bit Lark. He bit a horse.",
      ] },
    ],
  },

  lark: {
    name: 'Lark', sprite: 'npc_child_b', map: 'willowmere',
    spot: 'Lantern Square, near Wick', move: [{ if: 'wick_tag_done', move: 'tag', partner: 'wick' }, { move: 'wander', radius: 3 }],
    about: 'Nella\'s daughter. Bossy, fast, self-declared tag champion of Willowmere.',
    talk: [
      { if: DONE, lines: [
        'I have a grandma! Well, I always had one. But now I KNOW it. Her name is Edda and she knows every flower.',
      ] },
      { if: 'wick_quest_started', ifNot: 'wick_tag_done', lines: [
        "Wick can't play tag without his tag. That's the rule. I made it. It's a good rule.",
      ] },
      { lines: [
        "You're it! ...You have to chase me. That's how it works.",
        "I'm the best at tag in all of Willowmere. Wick says that's because nobody else plays. Wick is wrong.",
      ] },
    ],
  },

  the_duke: {
    name: 'The Duke', sprite: 'animal_duck', map: 'willowmere',
    spot: 'River bank, next to his nest in the reeds (the duck_nest event)', move: 'wander', radius: 2, solid: false,
    about: 'A duck of low character. Steals shiny things.',
    talk: [
      { if: DONE, lines: [{ who: null, text: "Someone has tied a tiny tag around the Duke's neck. It says DUKE. Nobody will admit to making it." }] },
      { if: 'wick_tag_done', lines: [{ who: null, text: 'The Duke has found a new shiny button. He seems content, for a criminal.' }] },
      { lines: [{ who: null, text: 'The Duke regards you with the flat eyes of a duck who has done terrible things, and would do them again.' }] },
    ],
  },

  loaf: {
    name: 'Loaf', sprite: 'animal_cat', map: 'willowmere',
    spot: 'Bakery side alley, in the middle of the narrow path (never on a required route)', move: 'stand',
    about: 'The bakery cat. The cat that will not move.',
    talk: [
      { if: END, lines: [{ who: null, text: 'Loaf has not moved. Some things, thankfully, never change.' }] },
      { if: M, lines: [
        { who: null, text: 'Loaf, the bakery cat, is sitting exactly where you want to walk. Loaf will not be moving.' },
        { who: 'mira', text: 'I have read that cats hold towns together. Mostly by sitting on them.' },
      ] },
      { lines: [
        { who: null, text: 'Loaf, the bakery cat, is sitting exactly where you want to walk.' },
        { who: null, text: 'Loaf will not be moving. Loaf has never moved. Loaf is a fixed point in an uncertain world.' },
      ] },
    ],
  },

  // ----------------------------------------------------------------------------------------------
  // hero_home
  // ----------------------------------------------------------------------------------------------
  hazel: {
    name: 'Hazel', sprite: 'npc_parent', portrait: 'hazel', map: 'hero_home',
    spot: 'By the hearth (mark hazel_start), two or more open tiles from the bed', move: 'turn',
    about: 'The hero\'s guardian. Brisk, loving, teasing; hides worry inside chores. Took the hero in as a baby.',
    talk: [
      { if: END, lines: [
        'When you came to me, your name was already stitched on your blanket. Someone loved you enough to choose it.',
        'Remember that, whatever happens to the ink. Now eat.',
      ] },
      { if: DONE, lines: [
        "You're home. Sit. Eat. Then tell me everything, in order, with nothing left out.",
      ] },
      { if: 'met_mael', ifNot: 'hazel_farewell_done', scene: 'hazel_farewell' },
      { if: B, lines: [
        "Back already? Forget something? Not your head, I hope. That's attached.",
        { who: 'bram', text: 'Morning, Hazel.' },
        "Morning, Bram. You're too thin. You're all too thin. Take an apple each.",
      ] },
      { if: 'met_mael', lines: [
        'Mira first, Mael said? Good. That girl has more sense than the rest of this town put together.',
      ] },
      { lines: [
        'Mael. Lantern Square. By the well. Go on.',
        "And if you see Pip, tell him I believe him about the bells. He'll want somebody to.",
      ] },
    ],
  },

  // ----------------------------------------------------------------------------------------------
  // bakery
  // ----------------------------------------------------------------------------------------------
  oren: {
    name: 'Oren', sprite: 'npc_baker', portrait: 'oren', map: 'bakery',
    spot: 'Behind the bakery counter, by the oven', move: 'turn',
    about: 'The baker. Big laugh, floury hands, talks to his dough. Forgot his own brother.',
    talk: [
      { if: 'starter_found', ifNot: 'starter_done', scene: 'oren_starter' },
      { if: 'intro_done', ifNot: 'starter_quest_started', scene: 'oren_starter' },
      { if: 'hal_returned', lines: [
        'Hal says my rolls are too sweet. Hal has been saying that for forty years. I missed it terribly.',
        'Habit is a stubborn kind of love. Write that down somewhere. Somewhere it will stay.',
      ] },
      { if: DONE, lines: [
        "Hal's here! My brother! Say hello. He's scowling at my oven, and it's wonderful.",
      ] },
      { if: 'tess_letter_1_delivered', lines: [
        'Tess brought me a letter. From Hal. My brother. I have a brother.',
        "I'm not crying. It's the onions. There are no onions. Give me a moment.",
      ] },
      { if: B, lines: [
        "Taking the long road, are you? Here, smell that. That's what home smells like. Come back to it.",
      ] },
      { lines: [
        'Every morning I set out four rolls on the sill. Two for me, two for the miller.',
        "I couldn't tell you the miller's name. Nobody can. But I set them out. Habit is a stubborn kind of love.",
      ] },
    ],
  },

  hal: {
    name: 'Hal', sprite: 'npc_farmer', map: 'bakery', show: { if: DONE },
    spot: 'Bakery, beside the flour bin', move: 'turn',
    about: 'Oren\'s brother, the miller. Lived at the mill for a month, forgotten by everyone, including himself.',
    talk: [
      { ifNot: 'hal_returned', scene: 'hal_returns' },
      { lines: [
        "I lived up at the mill for a month, setting out flour for a brother I couldn't name.",
        'Oren set out rolls for me. I set out flour for him. Neither of us knew why. We know now.',
      ] },
    ],
  },

  // ----------------------------------------------------------------------------------------------
  // smithy
  // ----------------------------------------------------------------------------------------------
  garrick: {
    name: 'Garrick', sprite: 'npc_smith', portrait: 'garrick', map: 'smithy',
    spot: 'At the anvil, beside the forge', move: 'turn', service: { type: 'shop', id: 'willowmere_smithy' },
    about: 'Bram\'s father, the smith. Few words, all of them load-bearing. "Do not rush a forge."',
    talk: [
      { if: B, ifNot: ['garrick_farewell_done', DONE], scene: 'garrick_farewell' },
      { if: 'starter_quest_started', ifNot: 'starter_found', lines: [
        "Something's living by my forge. It's warm, and it's rising. I've decided not to ask.",
      ] },
      { if: DONE, lines: [
        'Bram says my name every time he walks in here. Every time.',
        "...I haven't told him to stop.",
      ] },
      { if: B, lines: [
        'Keep your guard up and your edges clean. All of you.',
      ] },
      { lines: [
        "Bram's at the gate. Would rather hold a spear than a hammer. Can't think where he gets the stubborn.",
        'You need steel, I have steel. You need advice, I have less of that.',
      ] },
    ],
  },

  anvil: {
    name: 'Anvil', sprite: 'animal_dog', map: 'smithy', spot: 'Smithy, lying by the door', move: 'wander', radius: 1,
    about: 'Garrick\'s old dog. Loves everyone, every time.',
    talk: [
      { if: DONE, lines: [{ who: null, text: 'Anvil has a new collar. It says ANVIL in very large letters. Garrick is taking no chances.' }] },
      { if: B, lines: [
        { who: null, text: 'Anvil thumps his tail at Bram so hard his whole back end wags.' },
        { who: 'bram', text: 'Good boy. Look after the old man for me.' },
      ] },
      { lines: [{ who: null, text: 'Anvil, the smithy dog, thumps his tail. He has met you a thousand times and is delighted every time.' }] },
    ],
  },

  starter_dough: {
    name: 'Starter', sprite: 'npc_dough', map: 'smithy', show: { if: 'starter_quest_started', ifNot: 'starter_found' },
    spot: 'On the warm bricks right beside the forge', move: 'stand', solid: true,
    about: 'Oren\'s runaway sourdough starter. Alive, mostly.',
    talk: [{ scene: 'starter_found' }],
  },

  // ----------------------------------------------------------------------------------------------
  // library
  // ----------------------------------------------------------------------------------------------
  iris: {
    name: 'Iris', sprite: 'npc_scholar', portrait: 'iris', map: 'library',
    spot: 'Head librarian\'s desk, facing the door', move: 'turn',
    about: 'Head of the Willowmere library and Mira\'s teacher. Dry, dignified, and frightened of forgetting.',
    talk: [
      { if: DONE, lines: [
        'Mira. Mira. Mira. I say it every time I pass her desk. She pretends it annoys her.',
        'I crossed every line off my list of things not to forget. Then I wrote them all down again. Habit.',
      ] },
      { if: M, lines: [
        'Bring her back to me. And whatever is eating our books, bring it back in a jar if you can.',
        { who: 'mira', text: "She means that literally. She's got a jar ready." },
      ] },
      { lines: [
        'Every book about the Rootbound Archive has lost the same page. The one about the door.',
        'Forty years a librarian, and I have never seen ink simply leave.',
      ] },
    ],
  },

  mira: {
    name: 'Mira', sprite: 'mira', portrait: 'mira', map: 'library', show: { ifNot: M },
    spot: 'Reading table piled with books (mark mira_meet is the open tile between her and the door)', move: 'stand',
    about: 'Archivist apprentice. Joins in the library (scene mira_joins). Party member after that.',
    talk: [
      { if: 'met_mael', scene: 'mira_joins' },
      { lines: [
        'Forty-one books about the Rootbound Archive, and every one has lost the page about the door.',
        'If you need a book, find one that still has all its words. They are getting rare.',
      ] },
    ],
  },

  // ----------------------------------------------------------------------------------------------
  // chapel
  // ----------------------------------------------------------------------------------------------
  pip: {
    name: 'Pip', sprite: 'npc_bellkeeper', portrait: 'pip', map: 'chapel',
    spot: 'Under the bell ropes at the foot of the tower stair', move: 'turn',
    about: 'The bellkeeper. Counts everything. Deaf in one ear from fifty years of bells. Right about the thirteenth.',
    talk: [
      { if: END, lines: [
        'Twelve bells, and then thirteen. I counted. I ALWAYS count.',
        'Nobody laughed at me this time. I think I would have preferred the laughing.',
      ] },
      { if: 'found_thirteenth_bell', lines: [
        'Down in the Archive? THE thirteenth bell? Cracked, you say, and wrapped in roots?',
        "I knew it. I KNEW it! Fifty years of everyone telling me I can't count!",
      ] },
      { if: B, lines: [
        'Off to the Archive? If you find a bell down there, tell it Pip says hello. And to keep it down at night.',
      ] },
      { if: 'met_mael', lines: [
        "Mael believes me. Hazel believes me. That's two. I'm counting.",
        'Twelve ropes, twelve bells, and one empty hook that has been empty since my grandfather\'s day.',
      ] },
      { lines: [
        'THIRTEEN. I counted thirteen. Twelve bells, thirteen rings. I have rung those bells for fifty years.',
        "Eh? Speak into the left ear. The right one's been bell-deaf since I was nine.",
        'My grandmother said the thirteenth bell only rings when the town remembers who it rings for.',
      ] },
    ],
  },

  // ----------------------------------------------------------------------------------------------
  // inn
  // ----------------------------------------------------------------------------------------------
  hob: {
    name: 'Hob', sprite: 'npc_innkeeper', portrait: 'hob', map: 'inn',
    spot: 'Behind the inn counter', move: 'stand', service: { type: 'inn', price: 10 },
    about: 'Innkeeper of the Lantern Inn. Jolly, generous, collects stories. Writes every guest\'s name twice.',
    talk: [
      { if: DONE, lines: [
        'Heroes! Back from the Archive! The first honey milk is on the house. So is the second.',
        "The guest book has every name in it, once. I nearly wept. I did weep. Don't tell anyone.",
      ] },
      { if: B, lines: [
        'Off on an adventure? Sleep first. Nobody ever saved the world on no sleep.',
      ] },
      { lines: [
        'Welcome to the Lantern Inn! A bed, a meal, a story. The story is free.',
        'I write every guest\'s name in the book twice now. Once for them, once in case the first one wanders off.',
      ] },
    ],
  },

  barnaby: {
    name: 'Barnaby', sprite: 'npc_farmer', map: 'inn', spot: 'Upstairs guest bed, asleep', move: 'sleep', solid: true,
    about: 'A pilgrim who arrived on Tuesday, asked for a room, and has been asleep ever since.',
    talk: [
      { if: END, lines: [
        '...Hm? Oh! Good morning! Did I miss anything?',
        { who: 'bram', text: '...No.' },
      ] },
      { lines: [
        { who: null, text: "A pilgrim sleeps with his boots on. Hob says he's been asleep since Tuesday." },
        'Zzz... five more minutes... my name is... Barnaby... remember that... zzz...',
      ] },
    ],
  },

  // ----------------------------------------------------------------------------------------------
  // item_shop
  // ----------------------------------------------------------------------------------------------
  pell: {
    name: 'Pell', sprite: 'npc_shopkeeper', portrait: 'pell', map: 'item_shop',
    spot: 'Behind the shop counter', move: 'stand', service: { type: 'shop', id: 'willowmere_items' },
    about: 'Shopkeeper of Willowmere Goods. Anxious, honest, labels everything twice.',
    talk: [
      { if: DONE, lines: [
        'The labels stay put now! I took down all my spare labels. Well. Most of them. Some. Two.',
      ] },
      { if: B, lines: [
        'The Archive? Take Potions. Take Antidotes. Take Eye Drops. Take everything. Please. I worry.',
      ] },
      { lines: [
        'Welcome to Willowmere Goods! That is a Potion. I think. The label said POTION this morning.',
        "I've started labeling the labels. It helps. It doesn't help.",
      ] },
    ],
  },

  // ----------------------------------------------------------------------------------------------
  // valley
  // ----------------------------------------------------------------------------------------------
  quill: {
    name: 'Quill', sprite: 'npc_scholar', portrait: 'quill', map: 'valley',
    spot: 'The Pilgrim\'s Rest campfire, near the milestone fork', move: 'stand',
    about: 'A traveling scribe who walks the pilgrim road each year to copy the milestone.',
    talk: [
      { if: DONE, lines: [
        'The milestone\'s words are sharp again. I copied them twice anyway. Old habits.',
        'Somewhere, a great many people are remembering things right now, and they will never know who to thank.',
      ] },
      { if: 'lantern_get', lines: [
        'Is that a Keeper\'s lantern? May I... no. No, you keep it. Some things should stay with the people using them.',
      ] },
      { lines: [
        "I'm Quill, a scribe. I walk the pilgrim road every year to copy the milestone.",
        'This year I copy every name twice. One for me, and one for the village, in case one of us forgets.',
      ] },
    ],
  },

  penny: {
    name: 'Penny', sprite: 'npc_shopkeeper', portrait: 'penny', map: 'valley',
    spot: 'Peddler\'s cart at the valley end of the bridge', move: 'stand', service: { type: 'shop', id: 'valley_peddler' },
    about: 'The valley peddler, Pell\'s sister. Cheerful where he worries.',
    talk: [
      { if: DONE, lines: [
        'Business is booming! Turns out remembering things makes people want to buy them.',
      ] },
      { lines: [
        'Supplies for the road! Potions, remedies, and directions. The directions are free.',
        "People say I look just like my brother Pell, in town. I don't see it. He worries. I sell.",
      ] },
    ],
  },
};

// Display names for scene speakers that are not NPC records (map-placed actors and party members).
export const SPEAKER_NAMES = {
  hero: '{hero}', mira: 'Mira', bram: 'Bram',
  echo_warden: 'Echo Warden', archivore: 'The Archivore',
};

/** Display name for any speaker id used in scenes or talk. */
export function speakerName(id) {
  if (id == null) return '';
  if (SPEAKER_NAMES[id]) return SPEAKER_NAMES[id];
  if (NPCS[id]) return NPCS[id].name;
  return '';
}

/** Current movement for an NPC: { move, radius?, partner?, path? }. */
export function moveFor(id, hasFlag) {
  const n = NPCS[id];
  if (!n) return null;
  if (!Array.isArray(n.move)) return { move: n.move || 'stand', radius: n.radius, partner: n.partner, path: n.path };
  const e = pick(n.move, hasFlag) || { move: 'stand' };
  return { move: e.move, radius: e.radius, partner: e.partner, path: e.path };
}

/** NPC records placed on a map. */
export function npcsOnMap(mapId) {
  return Object.entries(NPCS).filter(([, n]) => n.map === mapId).map(([id, n]) => ({ id, ...n }));
}

/** True when the NPC should exist on its map for this flag state. */
export function isPresent(id, hasFlag) {
  const n = NPCS[id];
  return !!n && (!n.show || matches(n.show, hasFlag));
}

/**
 * What talking to an NPC does now: { scene } or { lines: [{who,text}], service }.
 * Lines without a speaker default to the NPC itself.
 */
export function talkTo(id, hasFlag) {
  const n = NPCS[id];
  if (!n) return null;
  const e = pick(n.talk, hasFlag);
  if (!e) return null;
  if (e.scene) return { scene: e.scene };
  return { lines: resolve(e.lines, hasFlag, id), service: n.service || null };
}

export default NPCS;
