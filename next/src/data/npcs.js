// NPCs for Episodes 1, 2 and 3 (Episode 2 records follow Episode 1's; Episode 3's Emberpeak cast is at the end of NPCS).
// Pure data + tiny pure helpers.
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
// from story/ep1.js or story/ep2.js instead of plain lines. Plain strings are said by the NPC; { who, text } lines are
// party interjections (who: 'mira' | 'bram' | 'hero') or narration (who: null).

import { pick, matches, resolve } from './story/dialogue.js';

const M = 'mira_joined';
const B = 'bram_joined';
const DONE = 'archivore_defeated';
const END = 'ep1_complete';
// Episode 2 stages: arrival (nh_arrived), the Court (court_entered), the restoration (nh_restored), the end.
const E2 = 'ep2_started';
const NHR = 'nh_restored';
const E2END = 'ep2_complete';
// Episode 3 stages: ep3_started (the Smith has lost his name), the restoration (pk_restored), the end.
const E3 = 'ep3_started';
const E3END = 'ep3_complete';

export const NPCS = {
  // ----------------------------------------------------------------------------------------------
  // Willowmere (outdoors)
  // ----------------------------------------------------------------------------------------------
  mael: {
    name: 'Elder Mael', sprite: 'npc_elder', portrait: 'mael', map: 'willowmere',
    spot: 'Lantern Square, beside the well, facing south', move: 'turn',
    about: 'Town elder and keeper of the Town Register. Gentle, wry, hiding a fear about the hero\'s name.',
    talk: [
      // Episode 2
      { if: 'letter_answer_started', ifNot: 'letter_answer_done', scene: 'letter_answer' },
      { if: E3END, lines: [
        'GARRICK. It came back to the page at noon, in ink, and it stayed. I have checked it eleven times since.',
        'Emberpeak has its bell again. I have written that down too, in my best hand. The best I have.',
      ] },
      { if: E3, lines: [
        "A smith's line in the Register went blank in the night. I know the forge. I know the trade. I cannot find the man.",
        'Go gently, {hero}. Whatever is taking names has started on the old ones.',
      ] },
      { if: 'letter_answer_done', lines: [
        'HOLLOWMERE, in my best hand. I keep turning back to that page. Two towns remember it now.',
        'Yours is still faint, {hero}. But I have learned that faint is not the same as gone.',
      ] },
      { if: E2END, lines: [
        'Hollowmere. So that is the name my books kept forgetting. Say it again for me. Slowly.',
        'Your name, written twice. I do not know what that means, {hero}. I intend to find out.',
      ] },
      { if: E2, lines: [
        'The fork, then the east branch to the ford. Garrick will have it planked by now, or be furious.',
        'Go gently, {hero}. And keep the letter dry. It is the only one I could write.',
      ] },
      { if: END, ifNot: E2, scene: 'ep2_mael' },
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
      // Episode 2: The Last Route (start, and the satchel delivery)
      { if: 'satchel_found', ifNot: 'last_route_done', scene: 'tess_last_route' },
      { if: END, ifNot: 'last_route_started', scene: 'tess_last_route' },
      // The letters quest opens once the party is whole (bram_joined). Before that Tess only hints.
      { if: B, ifNot: 'tess_quest_started', scene: 'tess_letters' },
      { if: 'tess_letter_1_found', ifNot: 'tess_letter_1_delivered', scene: 'tess_letters' },
      { if: 'tess_letter_2_found', ifNot: 'tess_letter_2_delivered', scene: 'tess_letters' },
      { if: 'tess_letter_3_found', ifNot: 'tess_letter_3_delivered', scene: 'tess_letters' },
      // Episode 2 lines sit below the letter scenes, so a letter still in the bag can always be delivered.
      { if: 'last_route_done', lines: [
        'North, by the White Road. When the snow is off it, I am going. Do not tell Mael. No. Tell Mael.',
      ] },
      { if: E2END, lines: [
        'Hollowmere. My father slept there once, on his way north. I can say where now. That is a place to start.',
      ] },
      { if: 'last_route_started', lines: [
        "A satchel with red post marks. If the Hollow has a lost-property shelf, it's on it. I'd bet my boots.",
      ] },
      { if: ['tess_quest_done', DONE], lines: [
        "I still can't remember my father's name. Whatever took it, it wasn't your Archivore. That was older.",
        'But I have his letter, and his crossed sevens. That is a thread. Couriers follow threads.',
      ] },
      { if: 'tess_quest_done', lines: [
        'Three letters home. My satchel feels lighter and heavier at the same time.',
        'Mind the boots. They know the roads better than you do. Let them lead.',
      ] },
      { if: DONE, lines: [
        "You came back! Did you see my letters down there? They'll be in the quiet places. Letters like quiet.",
      ] },
      { ifNot: B, lines: [
        "Three short. I've counted this satchel four times, and it's three short.",
        "If you're ever walking north, {hero}, come and find me first. A courier may have an errand for you.",
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
      // The ferry bell quest opens once the party is whole (bram_joined). Before that Nella only hints.
      { if: 'ferry_bell_found', ifNot: 'nella_bell_done', scene: 'nella_bell' },
      { if: B, ifNot: 'nella_quest_started', scene: 'nella_bell' },
      { if: E2END, lines: [
        'A ferryman on a lake with no current at all? Tell this Tovin that is cheating. Tell him I am jealous.',
      ] },
      { if: E2, lines: [
        'East, past the ford? The tributary runs out of a still lake, they say. Still water. Imagine.',
      ] },
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
        "Ferry's tied up till further notice. Something's gone off the north post, and I'm not saying what. Yet.",
        "The river's laughing at me. I can hear it. Come back when you've got somewhere to be.",
      ] },
    ],
  },

  edda: {
    name: 'Edda', sprite: 'npc_old_woman', map: 'willowmere',
    spot: 'The twelve flowerbeds along the river road, near the thirteenth bed', move: 'wander', radius: 2,
    about: 'Old gardener who keeps a flowerbed for every founding family. Nella\'s mother; the fading has taken that from both.',
    talk: [
      { if: E2END, lines: [
        'Hollowmere. A town with a lake. My Nella would like a lake. Nothing in it tries to sink her.',
      ] },
      { if: E2, lines: [
        'Going east, dear? Bring me back a flower from the far side. Any flower. I keep a bed for strangers.',
      ] },
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
    name: 'Sergeant Holt', sprite: 'npc_guard', map: 'willowmere',
    spot: 'South gate, right-hand post (Bram stands at the left post until he joins)', move: 'stand',
    about: 'The old gate sergeant. Steady, kind, keeps his promises. Holds Garrick\'s name for Bram.',
    talk: [
      { if: E3END, lines: [
        'GARRICK. Came back at noon. Said it fifty times since. My wife says I have a problem. My wife is right.',
      ] },
      { if: E3, lines: [
        "I've been saying a name every hour. I can't remember whose.",
        'It was a good name. It had weight. Keep an eye out for it, will you?',
      ] },
      { if: E2END, lines: [
        'Hollowmere, is it? I walked the east road once, years back. Never could say where it went. Now I can.',
      ] },
      { if: E2, lines: [
        "East, is it? Mind the mist past the ford. My old sergeant called it the road that doesn't want you.",
      ] },
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
    name: 'Cobb', sprite: 'npc_farmer', map: 'willowmere',
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
      // The name-tag quest opens once the party is whole (bram_joined). Before that Wick only hints.
      { if: ['wick_tag_found', B], ifNot: 'wick_tag_done', scene: 'wick_tag' },
      { if: B, ifNot: 'wick_quest_started', scene: 'wick_tag' },
      { if: ['wick_tag_done', DONE], lines: [
        "My tag still says me! And the gate says Willowmere again, so I'm double safe!",
      ] },
      { if: 'wick_tag_done', lines: [
        "I wear my tag on a string now. The Duke can't reach a string. Probably.",
      ] },
      { ifNot: B, lines: [
        "The Duke keeps looking at my collar. Ma sewed something on it. I'm not telling you what. It's private.",
        "He's the meanest duck in the whole world. Lark says I'm scared of him. I'm not. I'm careful.",
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
      { if: E3END, lines: [
        'Garrick! It came to me at noon while I was kneading. I said it to the dough. The dough took it well.',
        'Eat. Then tell me about the bell. In order. With nothing left out.',
      ] },
      { if: E3, lines: [
        'A man came to the door at dawn asking after Bram. I fed him bread. He could not say who he was, and neither could I.',
        'I keep thinking about his hands. Bring him back, {hero}. Bring all of them back.',
      ] },
      { if: E2END, lines: [
        "Hollowmere. Mira's from Hollowmere. I said it to the kettle until it boiled.",
        "Your name. Is it any brighter? No, don't answer. Eat first. Then answer.",
      ] },
      { if: E2, lines: [
        'Still here? The ford will not cross itself. Well. Garrick might make it.',
        'Write, {hero}. Letters. Tess will carry them, and I will read every one twice.',
      ] },
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
    name: 'Oren', sprite: 'npc_baker', map: 'bakery',
    spot: 'Behind the bakery counter, by the oven', move: 'turn',
    about: 'The baker. Big laugh, floury hands, talks to his dough. Forgot his own brother.',
    talk: [
      { if: 'starter_found', ifNot: 'starter_done', scene: 'oren_starter' },
      { if: 'intro_done', ifNot: 'starter_quest_started', scene: 'oren_starter' },
      { if: E2END, lines: [
        'Hollowmere! Hal says they have no baker there. No baker! I am sending them a starter. A cousin of the old one.',
      ] },
      { if: E2, lines: [
        'Hal went to the ford with Garrick at dawn. I sent rolls. Two for Hal, two for whoever is with him.',
      ] },
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
    name: 'Hal', sprite: 'npc_farmer', map: 'bakery', show: { if: DONE, ifNot: 'garrick_at_ford' },
    spot: 'Bakery, beside the flour bin', move: 'turn',
    about: 'Oren\'s brother, the miller. Lived at the mill for a month, forgotten by everyone, including himself.',
    talk: [
      { ifNot: 'hal_returned', scene: 'hal_returns' },
      { if: E3END, lines: [
        'Garrick! There. I said it before Oren did. Do not tell Oren.',
      ] },
      { if: E3, lines: [
        'The forge is cold. I keep walking past to check on it. I do not know who I am checking on.',
      ] },
      { if: E2END, lines: [
        "Garrick's Crossing. I carried the light end, and I am telling everyone it was the heavy end.",
      ] },
      { if: 'crossing_done', lines: [
        'My back has opinions about that bridge. Did you eat the rolls? Oren will ask. Oren always asks.',
      ] },
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
    name: 'Garrick', sprite: 'npc_smith', portrait: 'garrick', map: 'smithy', show: { ifNot: ['garrick_at_ford', E3] },
    spot: 'At the anvil, beside the forge', move: 'turn', service: { type: 'shop', id: 'willowmere_smithy' },
    about: 'Bram\'s father, the smith. Few words, all of them load-bearing. "Do not rush a forge."',
    talk: [
      { if: E2END, lines: [
        'They say the Hollow has a glass smith. Glass. Hm.',
        '...Ask her how she tempers it. For no reason.',
      ] },
      { if: 'crossing_done', lines: [
        'Back already? Toll still applies. One word.',
        { who: 'bram', text: 'Garrick.' },
        'Paid.',
      ] },
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
      { if: 'garrick_at_ford', lines: [{ who: null, text: 'Anvil lies across the smithy doorway, nose on his paws, facing the road.' }] },
      { if: E2END, lines: [{ who: null, text: 'Anvil sniffs your boots for a long time. They smell of a lake he has never met.' }] },
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
      { if: E2END, lines: [
        'Hollowmere. I have added it to the list, right under "Mira. Come home." She did.',
        { who: 'mira', text: 'I did.' },
      ] },
      { if: END, ifNot: 'iris_farewell_done', scene: 'iris_farewell' },
      { if: 'iris_farewell_done', lines: [
        'Go on, before I start a second list. It would be all you.',
        { who: 'mira', text: 'It would be alphabetical, at least.' },
      ] },
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
      { if: E2END, lines: [
        'Your Sister Anwen says the same words my grandmother did? Then our grandmothers knew each other.',
        'Or the bells did. Bells talk. I have always said so. Nobody listens. Except bells.',
      ] },
      { if: E2, lines: [
        'Thirteen, the other night. Again! Nobody laughs anymore. They just bring me tea. I miss the laughing.',
      ] },
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
    name: 'Quill', sprite: 'npc_scholar', map: 'valley',
    spot: 'The Pilgrim\'s Rest campfire, near the milestone fork', move: 'stand',
    about: 'A traveling scribe who walks the pilgrim road each year to copy the milestone.',
    talk: [
      { if: 'hollow_cleared', lines: [
        'You found the pilgrims\' stone? Sorrel, Ansel, Wren. I have written them in my book twice, in case one of us forgets.',
        'Lost, not broken. I always said so. It only wanted a light, and someone stubborn enough to carry it.',
      ] },
      { ifNot: 'lost_bridge_started', scene: 'quill_hint' },
      { if: DONE, lines: [
        'The milestone\'s words are sharp again. I copied them twice anyway. Old habits.',
        'Somewhere, a great many people are remembering things right now, and they will never know who to thank.',
      ] },
      { if: 'lantern_get', lines: [
        'Is that a Keeper\'s lantern? May I... no. No, you keep it. Some things should stay with the people using them.',
        'Take it past the pines, east of the fork, to the pool where the pilgrims lost their bridge. Ink remembers, they say.',
      ] },
      { lines: [
        'This year I copy every name twice. One for me, and one for the village, in case one of us forgets.',
        "The pilgrims' bridge, at the black pool past the pines east of the fork. Lost, mind. Not broken.",
      ] },
    ],
  },

  // ----------------------------------------------------------------------------------------------
  // archive_f3 (W10: the Archive's gold sink, by the Keeper's font in the great door hall)
  // ----------------------------------------------------------------------------------------------
  rook: {
    name: 'Rook', sprite: 'npc_farmer', map: 'archive_f3',
    spot: 'Great door hall, by the Keeper\'s font and the shortcut stairs', move: 'turn',
    service: { type: 'shop', id: 'archive_salvage' },
    about: 'A salvager who works the old Keeper ruins. Came down the shortcut stairs. Polite, unbothered, expensive.',
    talk: [
      { if: DONE, lines: [
        'Quiet down here now. Good for business, bad for prices. Mine stay where they are.',
      ] },
      { lines: [
        "Don't mind me. Salvage. The Keepers left good steel on the deep shelves, and nobody to sell it.",
        "Cleaned and edged. Not cheap. Neither is whatever's chewing behind that big door.",
      ] },
    ],
  },

  penny: {
    name: 'Penny', sprite: 'npc_shopkeeper', map: 'valley',
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

  // ==============================================================================================
  // Episode 2. Every Hollow NPC has noReflection until nh_restored (plan 5.2): the world agent reads the
  // `noReflection` field below. Stages: arrival (nh_arrived), the Court (court_entered), restored (nh_restored /
  // ep2_complete, set together by the restoration chain).
  // ==============================================================================================

  // The Fading Road
  penny_e: {
    name: 'Penny', sprite: 'npc_shopkeeper', map: 'east_road', spot: 'The Waystation, beside her cart (mark penny_cart)',
    move: 'stand', show: { ifNot: 'sand_gate_open' }, service: { type: 'shop', id: 'east_peddler' },
    about: 'Penny the valley peddler, on the road now. Same person as `penny` (valley); a second record for the east road.',
    talk: [
      { if: E2END, lines: [
        'Hollowmere! I have sold to that town for years and never once known where I was. Now I can send a bill.',
      ] },
      { if: 'nh_arrived', lines: [
        'Back from the town with no name? Stock up. The road forgets. I do not. I keep a list.',
      ] },
      { lines: [
        'Supplies for the road! Potions, ethers, and a very good tent. The directions are still free.',
        'My brother Pell worries. I sell. And I go where the roads still go.',
      ] },
    ],
  },

  // The Nameless Hollow (outdoors)
  corin: {
    name: 'Corin', sprite: 'npc_corin', map: 'nameless_hollow', spot: 'West gate, at the post (mark gate_in side)',
    move: 'stand', noReflection: true,
    about: 'The gate watch. Greets everyone with "Welcome home" because the town has no other greeting. First to shout Hollowmere.',
    talk: [
      { if: E2END, lines: [
        'Welcome to Hollowmere! I say it to everyone now. Twice to the ducks.',
        'A year I can name. This one. I am going to stand this watch until it is a very old year.',
      ] },
      { if: 'court_entered', lines: [
        'I have stood this watch for a year I cannot name. Today I watched a boat go to the Court. First time.',
      ] },
      { if: 'met_elian', lines: [
        'Welcome home. Still the only greeting we have. It is a good one, I think. I am keeping it either way.',
      ] },
      { if: 'nh_arrived', lines: [
        'The mayor is at the fountain most evenings. It is always evening here. So: the fountain.',
      ] },
      { lines: ['Welcome... home. Welcome home.'] },
    ],
  },

  nico: {
    name: 'Nico', sprite: 'npc_nico', map: 'nameless_hollow', spot: 'Inside the west gate, by the gate sign (mark nico_spot)',
    move: 'wander', radius: 3, noReflection: true,
    about: 'Errand boy, eight or so, chalk on his hands. Draws a crown on every blank sign. Nico\'s Crowns.',
    talk: [
      { if: 'paper_crown_found', ifNot: 'nico_crowns_done', scene: 'nico_crowns' },
      { if: 'court_entered', ifNot: 'nico_crowns_started', scene: 'nico_crowns' },
      { if: E2END, lines: [
        'My crowns are on real signs now! HOLLOWMERE, with a crown on the O. That one is mine.',
        'Ma says festival day comes back this year. I am making two hundred crowns. I have made four.',
      ] },
      { if: 'nico_crowns_done', lines: [
        'I am drawing a better crown than the king\'s. Mine has eleven points. His only had five.',
      ] },
      { if: 'nico_crowns_started', lines: [
        'A paper crown. Gold paint. If you see one, it is the most important thing in the world. Probably.',
      ] },
      { lines: [
        'I drew a crown on every blank sign. The grownups hated it.',
        'Then they stopped hating it. Now they just sigh. Sighing is better.',
      ] },
    ],
  },

  sava: {
    name: 'Sava', sprite: 'npc_sava', map: 'nameless_hollow', spot: 'Loom bench on the porch of the Signless Inn',
    move: 'turn', noReflection: true,
    about: 'The weaver. Embroiders coats with an empty space where the name should go. First to see the party\'s faces.',
    talk: [
      { if: E2END, lines: [
        'I am stitching names into every coat in town. Fifteen years of empty name-spaces. My fingers are sore and happy.',
      ] },
      { if: 'court_entered', lines: [
        'You went to the Court and came back with your faces. I keep checking the fountain to make sure.',
      ] },
      { if: 'met_elian', lines: [
        'Your faces in the water! I had forgotten what a nose looks like upside down.',
        'We leave the name-space empty in every embroidered coat. It feels rude to guess.',
      ] },
      { lines: ['We leave the name-space empty in every embroidered coat. It feels rude to guess.'] },
    ],
  },

  lena: {
    name: 'Lena', sprite: 'npc_lena', portrait: 'lena', map: 'nameless_hollow',
    spot: 'At the clocktower door, north-east of the square (mark clocktower)', move: 'turn', noReflection: true,
    about: 'The watchmaker. Spectacles, an apron of tiny tools. Precise and wry. Fountain witness.',
    talk: [
      { if: 'fountain_started', ifNot: 'testimony_lena', scene: 'lena_testimony' },
      { if: E2END, lines: [
        'The tower runs four minutes fast. I have decided to leave it. We are owed some time.',
        'Ten past four, it said, the moment the hands came back. I wrote it down. I am framing it.',
      ] },
      { if: 'court_entered', lines: [
        'Every clock in my shop struck midnight when your boat reached the Court. At teatime. I took it as a good sign.',
      ] },
      { if: 'nh_arrived', lines: [
        'Our clocks strike at midnight, but the tower has no hands. Fifteen years of midnights. You get used to it.',
        'No. You do not. I lied. Mind the step.',
      ] },
      { lines: ['Our clocks strike at midnight, but the tower has no hands.'] },
    ],
  },

  tovin: {
    name: 'Tovin', sprite: 'npc_tovin', portrait: 'tovin', map: 'nameless_hollow',
    spot: 'Mending a net on his pier, north shore (mark tovin_spot)', move: 'stand', noReflection: true,
    about: 'The ferryman, the only boat on the mere. Gruff, softer than he sounds. Rowed child Mira to the Court. Fountain witness.',
    talk: [
      { if: 'met_anwen', ifNot: 'court_ferry_open', scene: 'tovin_ferry' },
      { if: E2END, lines: [
        'I row people to the Court now. For visits. Visits. Fifteen years I would not go near it.',
        'Elian asks me to tell the day I pulled him out of the mere. I tell it shorter every time. He tells it longer.',
      ] },
      { if: 'court_ferry_open', lines: [
        'Boat is ready. Ring the post at the end of the pier, and I am at the oars.',
        'The Court keeps what it takes. So you go and take it back. That is the plan? Good plan.',
      ] },
      { if: 'heard_crisis', lines: ['No. Not to the Court. I do not care who sent you.'] },
      { lines: [
        'Nobody rows to the Court. The Court keeps what it takes.',
        'Mending a net. Nets I can fix. Go on.',
      ] },
    ],
  },

  orla: {
    name: 'Orla', sprite: 'npc_orla', map: 'nameless_hollow', spot: 'At the rune shrine beside the pier',
    move: 'stand', noReflection: true,
    about: 'Old, Keeper-born, tends the shrine at the ferry landing. Starts the Fountain quest; hints at the portraits.',
    talk: [
      { if: 'court_ferry_open', ifNot: 'fountain_started', scene: 'orla_fountain' },
      { if: E2END, lines: [
        'The Keepers built that Court to keep faces, not people. Somebody forgot the difference. Now we remember it.',
      ] },
      { if: 'court_entered', lines: [
        'There are three portraits in the Court, but the middle frame is empty. Look at all three. They like to be looked at.',
        'And the fountain listens when all three witnesses have spoken. Old Orla says so. Old Orla is usually right.',
      ] },
      { if: 'fountain_started', lines: [
        'The fountain listens when all three witnesses have spoken. The Watchmaker. The Ferryman. The Sister.',
      ] },
      { lines: [
        'Keeper-born, me. My grandmother tended this shrine, and hers before her. None of us could ever say for whom.',
      ] },
    ],
  },

  aurel: {
    name: 'Aurel', sprite: 'npc_aurel', portrait: 'aurel', map: 'nameless_hollow', show: { if: NHR },
    spot: 'Beside the Fountain of Faces, on a bench (mark restored_aurel)', move: 'turn',
    about: 'The Nameless King, unmasked: a tired, grey-bearded man who looks like Elian grown old. Has a reflection.',
    talk: [
      { if: E3END, lines: [
        'A bell rang across the water at noon. Not a toll. A real bell. Elian dropped his pen.',
        'Emberpeak. I knew a Keeper from there once. She tuned everything she touched. Sorry, {hero}. That is all I have.',
      ] },
      { if: E3, lines: [
        'A father walks all night for his son. I know that road.',
        'Tell him it is shorter on the way back. It is a lie, but it is a useful one.',
      ] },
      { if: 'letter_answer_done', lines: [
        'Mael wrote HOLLOWMERE in his Register? Then it is in two books. Three, with the page you carry.',
        'There was a list, {hero}. Someone in the First Library writes them. When you go looking, go carefully.',
      ] },
      { lines: [
        'Aurel. Elian says it to me every morning, the way you would wind a clock. I let him. I like the sound.',
        'There was a list, {hero}. Someone in the First Library writes them. When you go looking, go carefully.',
      ] },
    ],
  },

  // The Nameless Hollow (interiors)
  elian: {
    name: 'Elian', sprite: 'npc_elian', portrait: 'elian', map: 'nh_hall', show: { if: 'met_elian' },
    spot: "Behind the mayor's desk with the ledger (mark elian_desk)", move: 'turn', noReflection: true,
    about: 'Mayor, about twenty, coat far too big, ledger under his arm. Raised by Anwen. Hidden: Aurel\'s son, the boy Mira promised to come back for.',
    talk: [
      { if: NHR, ifNot: 'letter_answer_started', scene: 'elian_letter' },
      { if: E3END, lines: [
        'Garrick, at last. Back in the ledger, in ink, third line down. I wrote it four times to be sure.',
        'Father says the bell sounded like a man clearing his throat before a long speech. He approves.',
      ] },
      { if: E3, lines: [
        "I wrote him in my ledger as Bram's father. It's a start.",
        'A name that will not come is still a person. I find that if I keep the page open, it comes back quicker.',
      ] },
      { if: E2END, lines: [
        'Father sits in the hall every morning and lets me read him the ledger. He says he likes the names.',
        'I think he likes being in it. I wrote him in first. Aurel, at the top, in my best hand.',
      ] },
      { if: 'court_entered', lines: [
        'Tovin rowed you over. Tovin. He has not taken that boat to the Court in fifteen years.',
        'Whatever is over there, be careful. And come back. People here are very good at waiting.',
      ] },
      { if: 'heard_crisis', lines: [
        'Sister Anwen is at the chapel, south-east of the square. Tell her the mayor sent you. She will pretend to be impressed.',
      ] },
      { lines: ['Visitors. Sit, please. I will be with you once I have written down that you are here.'] },
    ],
  },

  anwen: {
    name: 'Sister Anwen', sprite: 'npc_anwen', portrait: 'anwen', map: 'nh_chapel',
    spot: 'At the register lectern among the candles (mark anwen_spot)', move: 'turn', noReflection: true,
    about: 'Keeper of the chapel register and forty-one candles. Raised the town\'s foundlings, Elian among them. Fountain witness.',
    talk: [
      { if: 'fountain_started', ifNot: 'testimony_anwen', scene: 'anwen_testimony' },
      { if: E3END, lines: [
        'I lit a candle at noon when the bell rang. Forty-five now. Mira will want to count them.',
        'A town that can ring its bell is a town that can be forgiven anything. Remember that, {hero}.',
      ] },
      { if: E3, lines: [
        'Say his name anyway. Even without it. The shape helps.',
        'Names are held in more than the mouth. Hold it in the hands. A man like that will let you.',
      ] },
      { if: E2END, lines: [
        'AUREL. I read it every morning now, before the candles. Forty-one candles, and one name.',
        'Elian brings his father to evensong. Aurel sings badly and with great conviction. I adore him for it.',
      ] },
      { if: 'court_entered', lines: [
        'You crossed the mere. I lit a candle for each of you. That makes forty-four. Mira will want to count them.',
      ] },
      { if: 'met_anwen', lines: [
        'A name is a promise, not a title. Whoever was written on that white line, someone promised them.',
        'Tovin is at the pier. He will say no. Ask again.',
      ] },
      { lines: ['Welcome, travelers. The mayor will want to see you before I do. He likes to be first. It is the coat.'] },
    ],
  },

  wren: {
    name: 'Wren', sprite: 'npc_wren', map: 'nh_inn', spot: 'Behind the inn counter', move: 'stand',
    service: { type: 'inn', price: 40 }, noReflection: true,
    about: 'Innkeeper of the Signless Inn. Cheerful. Keeps the lost-property shelf (The Last Route).',
    talk: [
      { if: E3END, lines: [
        'Back from the mountain! A man called Garrick sent me a coin, signed with a G and a small bell. It is on the wall.',
      ] },
      { if: E3, lines: [
        "Old fellow didn't touch his eggs. I put one in his coat pocket. If it hatches on the sand road, that's on the road.",
      ] },
      { if: E2END, lines: [
        'Signless Inn. I am keeping the name. It has grown on me, and the sign painter is booked for a year.',
      ] },
      { if: 'court_entered', lines: [
        'Back from the Court in one piece? Three pieces. Your pieces. You know what I mean. Bed?',
      ] },
      { lines: [
        'Welcome! We have no sign, so I call it the Signless Inn. Forty gold a night. Beds that remember you.',
        'Lost something? Everyone has. The shelf in the corner is full of it.',
      ] },
    ],
  },

  fitch: {
    name: 'Fitch', sprite: 'npc_fitch', map: 'nh_shop', spot: 'Behind the counter of the Hollow Provisioner',
    move: 'turn', service: { type: 'shop', id: 'hollow_items' }, noReflection: true,
    about: 'Runs the Hollow Provisioner. Talks to his stock so it remembers what it is. Pell\'s eastern cousin in spirit.',
    talk: [
      { if: E2END, lines: [
        'I still talk to my stock. Habit. But now it answers to its names. You are salve. Yes you are.',
      ] },
      { if: 'court_entered', lines: [
        'You are salve. You are rope. You are... Silver Salve, new in. For glass, they say. Cures being kept.',
      ] },
      { lines: [
        'You are salve. You are rope. You are a lamp. Sorry. I talk to the stock so it remembers what it is.',
        'Buying? Please buy. Then I only have to remember the rest.',
      ] },
    ],
  },

  vessa: {
    name: 'Vessa', sprite: 'npc_vessa', map: 'nh_smithy', spot: 'At the glass furnace', move: 'turn',
    service: { type: 'shop', id: 'hollow_smithy' }, noReflection: true,
    about: 'Glassblower and smith of the Silverglass Smithy. Blunt, burn scars, goggles up. Seeds Emberpeak.',
    talk: [
      { if: 'sand_gate_open', ifNot: 'sand_done', scene: 'vessa_sand' },
      { if: 'sand_done', lines: [
        'Glass that remembers fire. Finally. I am making a cup nobody is allowed to drink from.',
        'The carts come down on Tuesday. I have ordered a ton. I have also ordered a quiet week to enjoy it in.',
      ] },
      { if: E3END, lines: [
        'The sand road is open, and the carts will come. I am going to be insufferable about glass for a year.',
      ] },
      { if: E3, lines: [
        'The east arch is past the mere. I will meet you there with the key. Tell the old man the road is waiting.',
      ] },
      { if: E2END, lines: [
        'Emberpeak sand made the best silverglass. Made. Nobody has had a cart down from the mountain since summer.',
        'Mind how you go up there. Glass remembers heat. So do mountains.',
      ] },
      { if: 'court_f2_done', lines: [
        'Glass that remembers. Finally I can work it again. Look at this edge. It holds like a grudge.',
      ] },
      { if: 'court_entered', lines: [
        'Sometimes the glass reflects a place before I enter it. Today it showed me the Court. So. You went.',
      ] },
      { lines: [
        'Sometimes the glass reflects a place before I enter it. Glass and steel here. Mostly steel. The glass sulks.',
        'Buying or staring? Both are fine. Staring is free.',
      ] },
    ],
  },

  // ==============================================================================================
  // Episode 3: the Old Sand Road and Emberpeak. Stages: ep3_started, the sand gate (sand_gate_open), arrival
  // (pk_arrived), the Bell House (met_ilya), the foundry (foundry_entered, foundry_f2_done), the restoration
  // (pk_restored) and the end (ep3_complete). Nobody here says Mara or Garrick before garrick_named / pk_restored.
  // The Smith is two records: garrick_e (tag "The Smith") until garrick_named, then garrick_n (tag "Garrick"),
  // both at the forge in pk_smithy.
  // ==============================================================================================

  penny_s: {
    name: 'Penny', sprite: 'npc_shopkeeper', map: 'sand_road', spot: "The carters' shelter, beside her cart (mark penny_cart)",
    move: 'stand', service: { type: 'shop', id: 'sand_peddler' },
    about: 'Penny the peddler, on the sand road now. Same person as penny and penny_e.',
    talk: [
      { if: E3END, lines: [
        'Emberpeak buys sand again! Well. Sells it. I have never been so confused about which way the cart goes.',
      ] },
      { if: 'pk_arrived', lines: [
        "Emberpeak's gate is open, ash or no ash. Business! I could kiss the sand.",
      ] },
      { lines: [
        'Supplies for the road! Potions, ethers, Quench Flasks and a very good tent. The directions are still free.',
        "I go where the roads still go. This one's coming back.",
      ] },
    ],
  },

  rusk: {
    name: 'Rusk', sprite: 'npc_rusk', map: 'emberpeak', spot: 'The south gate (mark gate_in), at the Watch post', move: 'turn',
    about: 'The gate Watch. Dry, loyal, the first to shout the Smith\'s name.',
    talk: [
      { if: E3END, lines: [
        'Garrick comes through the gate every morning. I say his name. He says he heard me the first time. I say it again.',
      ] },
      { if: 'pk_restored', lines: [
        'The ash stopped. I checked my hands, my hat, the sky. Nothing falling. I am not sure what a Watch does in clean air.',
      ] },
      { if: 'met_ilya', lines: [
        'The foundry gate is up the ramp, north. Frost cools hot metal. It can cool a guardian too. Just saying.',
      ] },
      { lines: [
        'Watch of Emberpeak. The gate is open, the ash is falling, and nobody is in a hurry. State your business.',
      ] },
    ],
  },

  veyra: {
    name: 'Foreman Veyra', sprite: 'npc_veyra', map: 'emberpeak', spot: 'Beside the coolant station in Bellows Square (mark coolant)',
    move: 'turn',
    about: 'Foreman of what is left of the shifts. Soot-streaked, whistle on a cord, orders given as questions. Coolant Station.',
    talk: [
      { if: 'met_ilya', ifNot: 'coolant_started', scene: 'coolant_start' },
      { if: E3END, lines: [
        'Quiet week. Furnaces banked, shifts three hours shorter, nothing left to be angry at.',
        "I don't know what to do with my hands. Can you carry a crate? Please say yes.",
      ] },
      { if: 'pk_restored', lines: [
        'The ash stopped at the first stroke. I stood in the square with my mouth open.',
        'First time in a month nobody called me Foreman. They called me Veyra. I may cry later.',
      ] },
      { if: 'foundry_f2_done', lines: [
        'The fans stopped. I felt it in my teeth. Whatever you did down there, do the next floor too.',
      ] },
      { if: 'coolant_done', lines: [
        'The gauge is steady. Steady! I have waited twenty-five years to say that word.',
      ] },
      { if: 'coolant_started', ifNot: 'coolant_done', lines: [
        'Ilya, Harl and Sella. Then the station. Can you manage that before supper?',
      ] },
      { if: 'met_veyra', lines: [
        'The foundry gate answers to one key. Ilya, in the Bell House, west side of the square.',
      ] },
      { lines: ['Pressure is up again. Who let you in? Can you carry a crate?'] },
    ],
  },

  harl: {
    name: 'Harl', sprite: 'npc_harl', map: 'emberpeak', spot: 'By the memorial wall with a slate and a pencil (mark memorial)', move: 'turn',
    about: 'The Surveyor. Writes pressure readings before the soot erases them. Coolant Station witness.',
    talk: [
      { if: 'coolant_started', ifNot: 'testimony_harl', scene: 'testimony_harl' },
      { if: E3END, lines: [
        'The ground has stopped breathing. I keep taking readings anyway. All zeros. I have never been so happy with a zero.',
      ] },
      { if: 'pk_restored', lines: [
        'Pressure is down to nothing. I wrote it before the soot could erase it. The first reading in a month the soot did not touch.',
      ] },
      { if: 'foundry_f2_done', lines: [
        "The pipes went quiet at noon. Don't trust it. Quiet pipes are just pipes holding their breath.",
      ] },
      { lines: [
        'The ground shifts when the furnace exhales. I write the readings down before the soot erases them.',
      ] },
    ],
  },

  ilya: {
    name: 'Ilya', sprite: 'npc_ilya', portrait: 'ilya', map: 'pk_bellhouse', spot: "At the founder's workbench (mark ilya_spot)", move: 'turn',
    about: "The Bell Founder, the founder's apprentice. Copper beard, brass goggles, ear always cocked for a tone. Keeps the lift key oiled.",
    talk: [
      { if: 'coolant_started', ifNot: 'testimony_ilya', scene: 'testimony_ilya' },
      { if: E3END, lines: [
        'The tone is flat by a hair. I will never tune it. It sounds like her.',
        'It sounds like somebody getting home late, and not minding who hears.',
      ] },
      { if: 'pk_restored', lines: ['I hung the clapper with my own hands. I kept waiting for it to be heavier.'] },
      { if: 'foundry_entered', lines: [
        'You went down. Come back up. Whatever you find, come back with yourselves in it.',
      ] },
      { if: 'met_ilya', lines: [
        "The key is yours. Mind the troughs. She drew them to carry water, not to be stepped around.",
      ] },
      { lines: [
        'The Bell House. Knock twice. The bells do not mind.',
        'Veyra sent you? She sends everyone she cannot use herself.',
      ] },
    ],
  },

  sella: {
    name: 'Sella', sprite: 'npc_sella', map: 'pk_smithy', spot: 'At the anvil (mark anvil)', move: 'turn',
    service: { type: 'shop', id: 'pk_smithy' },
    about: 'Runs the Emberpeak Weaponsmith, the old family forge. Mid-thirties; Bram carried her out of the collapse. Coolant witness.',
    talk: [
      { if: 'coolant_started', ifNot: 'testimony_sella', scene: 'testimony_sella' },
      { if: E3END, lines: [
        'Garrick says my grip is a disgrace. He is right. He is teaching me the old one.',
        'Hot work, and a stubborn old man. I am going to be very good at this.',
      ] },
      { if: 'pk_restored', lines: [
        'The bell rang while I was mid-strike. I dropped the hammer and nothing broke. That never happens.',
      ] },
      { if: 'forge_relit', lines: [
        'He sits by the fire and hardly speaks. But he corrected my quench. Once. Without looking.',
      ] },
      { if: 'met_ilya', lines: [
        'A smithy with a customer in the corner who will not buy anything. I have decided to let him.',
      ] },
      { lines: [
        "Emberpeak Weaponsmith. I run it. My master's master ran it. Do not touch the anvil. It is moody.",
      ] },
    ],
  },

  bess: {
    name: 'Bess', sprite: 'npc_bess', map: 'pk_inn', spot: 'Behind the counter of the Coal Lantern', move: 'stand',
    service: { type: 'inn', price: 60 },
    about: 'The Cook and innkeeper of the Coal Lantern Inn. Cheerful, practical, humor like a ladle.',
    talk: [
      { if: E3END, lines: [
        "Three stews tonight. Hot, hotter, and Mara's.",
        'The third is the oldest recipe on the mountain. I never had a name for it.',
      ] },
      { if: 'pk_restored', lines: [
        "I put the bell on a tray when it rang. Don't ask. The soup was fine.",
      ] },
      { lines: [
        'Ash gets into everything, except a pot with a good lid.',
        'The Coal Lantern serves three stews: hot, hotter, and safe. Sixty gold a bed.',
      ] },
    ],
  },

  taro: {
    name: 'Taro', sprite: 'npc_taro', map: 'pk_shop', spot: 'Behind the counter of Ventworks Supplies', move: 'turn',
    service: { type: 'shop', id: 'ventworks' },
    about: 'The Riveter. Keeps Ventworks Supplies. Talks pressure, keeps a gauge on every shelf.',
    talk: [
      { if: E3END, lines: [
        'The rail is quiet. First time in a month I could hear my own tools. Buy something. They have missed the attention.',
      ] },
      { lines: [
        'If the pressure runs high, the whole rail will sing.',
        'Gauges, pipes, flasks. Everything I sell has a number on it. The number is the point.',
      ] },
    ],
  },

  garrick_e: {
    name: 'The Smith', sprite: 'npc_smith', portrait: 'garrick', map: 'pk_smithy', spot: 'In the corner by the old forge (mark forge)',
    show: { if: 'met_ilya', ifNot: 'garrick_named' }, move: 'turn',
    about: "Bram's father with his name gone, speaker tag \"The Smith\" until garrick_named; then the garrick_n record. Asks Sella for the forge.",
    talk: [
      { if: 'met_ilya', ifNot: 'forge_relit', scene: 'garrick_forge' },
      { if: 'foundry_f2_done', lines: ['The fans stopped. I felt it through the floor. Go on down.'] },
      { if: 'forge_relit', lines: ['The fire is lit. The right kind. Low and patient. Go on. It will keep.'] },
      { lines: ['...'] },
    ],
  },

  garrick_n: {
    name: 'Garrick', sprite: 'npc_smith', portrait: 'garrick', map: 'pk_smithy', spot: 'In the corner by the old forge (mark forge)',
    show: { if: 'garrick_named' }, move: 'turn',
    about: 'Garrick, named. Same spot as garrick_e; takes over when garrick_named is set. Teaches Sella the old grip.',
    talk: [
      { if: E3END, lines: [
        'Come home after, I said. Then I was home. Do not read into it.',
        'Sella has a grip like a vise. The wrong vise. I am fixing it.',
      ] },
      { if: 'pk_restored', lines: [
        'Heard the bell from the forge. Stopped working. Stood there like a post.',
        'Flat by a hair. She would have said so.',
      ] },
      { lines: ['Garrick. Say it again. I like the weight of it.'] },
    ],
  },
};

// Display names for scene speakers that are not NPC records (map-placed actors and party members).
export const SPEAKER_NAMES = {
  hero: '{hero}', mira: 'Mira', bram: 'Bram',
  echo_warden: 'Echo Warden', archivore: 'The Archivore', whisperwood_alpha: 'Briar Alpha',
  // Episode 2: map actors and the vow-mirror memory voices (speakers with no actor)
  nameless_king: 'The Nameless King', tovin_c: 'Tovin', elian_t: 'Elian', aurel_t: 'Aurel',
  king_memory: 'The King', boy_memory: 'Small Boy', tovin_memory: 'Tovin',
  // Episode 3: a voice in the bells (tagged "A Voice" until mara_read) and the Warden, a map actor in the Heartforge
  voice: 'A Voice', mara_voice: 'Mara', cinder_warden: 'The Cinder Warden', bellows_specter: 'The Bellows Specter',
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
