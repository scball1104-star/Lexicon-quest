// Episode 1 text: bestiary lore, books (library and Archive), location banners, menu help lines,
// field remarks (party "barks"), game over lines and the credits. Pure data.
//
// Box rules (checked by qa/content): at most 3 lines of 42 characters per box, no em dashes.
// Book pages and lore entries are lists of boxes. {hero} = the player's chosen name.

// ------------------------------------------------------------------------------------------------
// Bestiary. Every enemy id in COMMON.md. `flavor` matches data/enemies.js; `lore` is the full entry,
// unlocked when the enemy is first defeated. `where` is shown under the name.
// ------------------------------------------------------------------------------------------------
export const BESTIARY = {
  ink_slime: {
    name: 'Ink Slime', where: 'Willowmere Valley',
    lore: [
      'A puddle of spilled ink that learned to crawl.',
      'Where names fade, the ink they were written in runs off and pools in low places. Some of it gets ideas.',
      'They creep toward warm things and written things. Shepherds keep their tally sticks indoors now.',
    ],
  },
  briar_wolf: {
    name: 'Briar Wolf', where: 'Willowmere Valley',
    lore: [
      'Thorns have grown through its fur like a second coat.',
      'Valley shepherds say the wolves were never this bold. Something in the Whisperwood is making them restless.',
      'A wolf that howls is about to get faster. A wolf that bites with thorns leaves poison behind.',
    ],
  },
  moss_scarab: {
    name: 'Moss Scarab', where: 'Willowmere Valley',
    lore: [
      'A beetle wearing a hill of moss. It does not like to be hurried.',
      'When a scarab digs in and stares at you, brace yourself. It charges in a straight line and regrets nothing.',
    ],
  },
  page_wraith: {
    name: 'Page Wraith', where: 'Rootbound Archive',
    lore: [
      'Torn pages that remember being a story, and resent the ending.',
      'They whisper as they fly. Listen too long and you will find you have nothing left to say.',
      'When loose pages begin to spin around one, a storm of paper edges is coming.',
    ],
  },
  bookmite: {
    name: 'Bookmite', where: 'Rootbound Archive',
    lore: [
      'It eats words. Some readers swear it eats the meaning first.',
      'Archivists keep cedar shavings in their pockets against them. It does not work, but it smells nice.',
    ],
  },
  tome_golem: {
    name: 'Tome Golem', where: 'Rootbound Archive',
    lore: [
      'A shelf of encyclopedias that stood up and kept standing.',
      'The Keepers built them to carry books between floors. Nobody ever told them to stop.',
      'When one rears back and the shelves start shaking, the whole room is about to find out.',
    ],
  },
  ink_wraith: {
    name: 'Ink Wraith', where: 'The Rootbound Stacks',
    lore: [
      'Where a name was scraped away, this is what seeped out.',
      'It is cold, and it is hungry, and it does not remember being anyone. That is the worst of it.',
    ],
  },
  echo_warden: {
    name: 'Echo Warden', where: 'The Reading Galleries',
    lore: [
      'A knight of mirrors that repeats whatever you bring against it.',
      'It guarded the Reading Galleries for a century on a single order, repeated every night.',
      'One stance turns back magic. The other turns back steel. Under the order, it remembered what it was for.',
    ],
  },
  lost_page: {
    name: 'Lost Page', where: 'Heart of the Archive',
    lore: [
      'A page torn from the Book of Names. A name is still written on it.',
      'The color of its ink gives it away: every page is undone by something different.',
      'It reads itself aloud to the Archivore. The Archivore listens, and grows stronger.',
    ],
  },
  archivore: {
    name: 'The Archivore', where: 'Heart of the Archive',
    lore: [
      'It was commanded to forget. It has been eating names ever since.',
      'Once it was a keeper-beast, one of the gentle creatures the Keepers raised to eat mildew and rot.',
      'Someone handed it a list.',
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// Books. Read from bookshelves and lecterns. Map events: { type: 'book', book: '<id>' }.
// ------------------------------------------------------------------------------------------------
export const BOOKS = {
  // Willowmere library
  tales_of_the_keepers: {
    title: 'Tales of the Keepers', where: 'library',
    pages: [
      'Chapter One. Every name is a promise that something will not be forgotten.',
      'The Keepers wrote the Book of Names in an age before roads: every person, every river, every town.',
      'When they fell silent, they divided the Book among their archives, so that no single fire could take it all.',
    ],
  },
  archive_visitors_guide: {
    title: 'The Rootbound Archive: A Visitor\'s Guide', where: 'library',
    pages: [
      'The Rootbound Archive stands at the head of Willowmere Valley, grown into the roots of the Mother Willow.',
      'To enter, the visitor must',
      'The rest of the page is blank. Not faded. Blank, as if it was never written at all.',
    ],
  },
  keeper_beasts: {
    title: 'Keeper-Beasts and Their Keeping', where: 'library',
    pages: [
      'The Keepers raised gentle page-eating beasts to guard their archives against rot, mildew and mites.',
      'Well fed and well loved, a keeper-beast eats only what is spoiled. Starved, or given bad orders,',
      'The sentence stops there. Some long-dead reader has underlined it three times.',
    ],
  },
  on_bells: {
    title: 'On Bells, and Why We Ring Them', where: 'library',
    pages: [
      'Willowmere\'s tower once held thirteen bells. Twelve were cast for the founding families.',
      'The thirteenth was a gift from the Keepers. When the Keepers sealed their doors, they took it home.',
      'Bellkeepers since have left its hook empty and its rope coiled. Out of respect. Or habit. Or hope.',
    ],
  },
  riverwise: {
    title: 'Riverwise: Sayings of the Ferry Folk', where: 'library',
    pages: [
      'Make room for the river instead of fighting it.',
      'Name your boat by the sound of its rope, and it will always come home.',
      'A ferry is a promise kept twice a day.',
    ],
  },
  childs_map: {
    title: 'A Child\'s Map of Aethelgard', where: 'library',
    pages: [
      'Willowmere sits in the west, in a valley of willows. East, beyond the river, lie the Hollow lands.',
      'Here the mapmaker drew a town with a little church and a bridge. Its name has faded to a pale smudge.',
    ],
  },
  willowmere_history: {
    title: 'A Short History of Willowmere', where: 'library',
    pages: [
      'Twelve families came up the river with seeds, rope, and one stubborn goat.',
      'They planted willows to hold the banks, dug the well, and raised a tower with a bell for every family.',
      'The goat\'s name is recorded in full. The historian was apparently very fond of it.',
    ],
  },

  // Rootbound Archive
  catalog_ledger: {
    title: 'Catalog Ledger, Hall Three', where: 'archive_f1',
    pages: [
      'Names indexed this day: four hundred and twelve.',
      'Names removed this day: none. Names are never removed. See the Oath.',
    ],
  },
  keeper_journal_1: {
    title: 'A Keeper\'s Journal (I)', where: 'archive_f1',
    pages: [
      'We seal the Archive tomorrow. The others leave at dawn. I have asked to stay a little longer.',
      'The bell stays, and the Lantern, and old Moth, our keeper-beast, to eat the damp. They will keep the place.',
    ],
  },
  readers_oath: {
    title: 'The Reader\'s Oath', where: 'archive_f2',
    pages: [
      'I will read what was written for me, and keep what was written for others.',
      'I will not write over a name. I will not let a name be written over.',
      'I will remember for those who cannot.',
    ],
  },
  keeper_journal_2: {
    title: 'A Keeper\'s Journal (II)', where: 'archive_f2',
    pages: [
      'An order came down from the high Keepers today. Certain names are to be taken out of the Book.',
      'I will not do it. I have hidden the Lantern behind the Warden, where only the stubborn will find it.',
    ],
  },
  keeper_journal_3: {
    title: 'A Keeper\'s Journal (III)', where: 'archive_f3',
    pages: [
      'They have given the order to Moth instead. She does not understand it. She only knows she is hungry.',
      'I rang the bell for every name she took, so that someone would notice. Did anyone notice?',
      'If you are reading this, I could not stop her. I am sorry. My name was',
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// Location banners (slide in for 2 s on map entry). Every map id in COMMON.md.
// ------------------------------------------------------------------------------------------------
export const BANNERS = {
  hero_home: { title: 'Home', sub: 'Willowmere' },
  willowmere: { title: 'Willowmere', sub: 'Lantern Square' },
  inn: { title: 'The Lantern Inn' },
  item_shop: { title: 'Willowmere Goods' },
  smithy: { title: 'Mossforge Smithy' },
  library: { title: 'Willowmere Library' },
  chapel: { title: 'Chapel of the Twelve Bells' },
  bakery: { title: 'Oren\'s Ovens' },
  valley: { title: 'Willowmere Valley' },
  archive_f1: { title: 'Rootbound Archive', sub: 'I. The Catalog Halls' },
  archive_f2: { title: 'Rootbound Archive', sub: 'II. The Reading Galleries' },
  archive_f3: { title: 'Rootbound Archive', sub: 'III. The Rootbound Stacks' },
  archive_boss: { title: 'Heart of the Archive' },
};

// ------------------------------------------------------------------------------------------------
// Help lines for menus and options (one line each, max 40 characters). No tutorials: just a nudge.
// ------------------------------------------------------------------------------------------------
export const HELP = {
  menu: {
    items: 'Use or look at what you carry.',
    equip: 'Change weapons, armor and charms.',
    tech: 'Weapon techs, magic and Fury arts.',
    status: 'Stats, mastery and equipment.',
    talk: 'Ask your companions what comes next.',
    journal: 'Your story so far, and errands open.',
    bestiary: 'Creatures you have met and beaten.',
    config: 'Sound, speed, text and window color.',
    save: 'Write your journey into the record.',
    quit: 'Return to the title screen.',
  },
  config: {
    battleSpeed: 'How fast battle animations play.',
    autoBattle: 'Let the party fight on its own.',
    textSpeed: 'How quickly dialogue appears.',
    windowColor: 'Choose the color of every window.',
    musicVolume: 'Volume of the music.',
    sfxVolume: 'Volume of sound effects.',
    reduceMotion: 'Turn off screen shake and flashes.',
    touchControls: 'Show or hide the touch buttons.',
  },
  equip: {
    weapon: 'Main weapon. Swap types in battle.',
    body: 'Body armor.',
    head: 'Helm, hood or circlet.',
    charm: 'A charm worn for luck or power.',
    boots: 'Footwear. Speed lives here.',
    mantle: 'A cloak or mantle.',
  },
  save: {
    prompt: 'Record your journey here?',
    done: 'Your journey has been recorded.',
    bell: 'The bell rings. Willowmere remembers.',
  },
  inn: {
    offer: 'A room for the night is {price} gold.',
    rest: 'You sleep soundly, and wake restored.',
    poor: 'Not enough gold. Hob looks sorry.',
  },
};

// ------------------------------------------------------------------------------------------------
// Field remarks: one short line from a companion when something happens for the first time.
// Shape: event -> conditional list [{ if, lines: [{ who, text }] }]; first match wins.
// The field shows each event's remark once per save (flag it however the world system likes).
// ------------------------------------------------------------------------------------------------
export const BARKS = {
  first_chest: [
    { if: 'mira_joined', lines: [{ who: 'mira', text: 'Someone hid this for a traveler who would need it.' }] },
  ],
  // Dungeon rule only (DESIGN 5.2): keyed to archive_entered so a valley touch never consumes the one-shot key.
  // The valley's first wolves are scripted (scene first_fight), and Bram's line lives there.
  first_visible_enemy: [
    { if: ['archive_entered', 'bram_joined'], lines: [{ who: 'bram', text: 'It moves when we move. Watch it, pick your moment, then hit it first.' }] },
  ],
  first_archive_key: [
    { if: 'mira_joined', lines: [{ who: 'mira', text: 'A Keeper\'s key. One key, one door. They were very tidy people.' }] },
  ],
  first_locked_door: [
    { if: 'bram_joined', lines: [{ who: 'bram', text: 'Locked. I could hit it, but Mira would give me a look.' }] },
  ],
  first_block_push: [
    { if: 'bram_joined', lines: [{ who: 'bram', text: 'There. Some problems just want pushing.' }] },
  ],
  first_switch: [
    { if: 'bram_joined', lines: [{ who: 'bram', text: 'Hear that click? Something moved, somewhere.' }] },
  ],
  first_dark_room: [
    { if: 'mira_joined', lines: [{ who: 'mira', text: 'Too dark to read. The braziers will still light, if we find them.' }] },
  ],
  first_hidden_ink: [
    { if: 'mira_joined', lines: [{ who: 'mira', text: 'Ink remembers. Look at it. A whole bridge, waiting for someone to see it.' }] },
  ],
  first_font: [
    { if: 'mira_joined', lines: [{ who: 'mira', text: 'A Keeper\'s font. Drink. The Keepers left it for exactly this.' }] },
  ],
  first_elite: [
    { if: 'bram_joined', lines: [{ who: 'bram', text: 'That one has a gold shine to it. Tougher, but it will drop something good.' }] },
  ],
  first_rare_drop: [
    { if: 'mira_joined', lines: [{ who: 'mira', text: 'Look at that. Old work. Someone made this to last.' }] },
  ],
  first_legendary_drop: [
    { if: 'bram_joined', lines: [{ who: 'bram', text: 'That is... that is a lot of shine. I am going to need a minute.' }] },
  ],
  flee: [
    { if: 'mira_joined', lines: [{ who: 'mira', text: 'We can come back better prepared. A retreat is not forgetting.' }] },
  ],
};

// ------------------------------------------------------------------------------------------------
// Game over (shown over the gameover music before Continue / Title).
// ------------------------------------------------------------------------------------------------
export const GAMEOVER = {
  title: 'The light goes out.',
  line: 'But somewhere, someone is still saying your name.',
  continue: 'Try again from your last record?',
};

// ------------------------------------------------------------------------------------------------
// Credits. Played after ep1_complete over the "triumph" theme. Each card is shown in turn:
// { heading?, lines: [...] }. Character cast is listed Chrono Trigger style.
// ------------------------------------------------------------------------------------------------
export const CREDITS = [
  { heading: 'LEXICON QUEST', lines: ['Episode 1: The Missing Name'] },
  { heading: 'Created by', lines: ['Scott Ball'] },
  { heading: 'Story, World and Direction', lines: ['Scott Ball'] },
  { heading: 'Music', lines: ['Composed for Lexicon Quest with Suno'] },
  { heading: 'With gratitude', lines: ['To the sixteen-bit classics', 'that taught us how to dream in pixels'] },
  { heading: 'The Party', lines: ['{hero}', 'Mira, archivist apprentice', 'Bram, son of Garrick'] },
  { heading: 'Willowmere', lines: ['Elder Mael', 'Hazel', 'Tess the courier', 'Oren and Hal', 'Nella, Edda and Lark'] },
  { heading: 'Willowmere', lines: ['Iris of the library', 'Garrick and Anvil', 'Pip the bellkeeper', 'Sergeant Holt', 'Hob and Pell'] },
  { heading: 'Willowmere', lines: ['Wick and his tag', 'Cobb, Henrietta and Bertha', 'Loaf, who did not move', 'The Duke, who did'] },
  { heading: 'Rootbound Archive', lines: ['The Echo Warden', 'Moth, the keeper-beast', 'The thirteenth bell'] },
  { heading: 'And', lines: ['Barnaby, who slept through all of it'] },
  { heading: '', lines: ['Every name is a promise.', 'Thank you for keeping ours.'] },
  { heading: 'Thank you for playing', lines: ['The road east is waiting.'] },
];

export default { BESTIARY, BOOKS, BANNERS, HELP, BARKS, GAMEOVER, CREDITS };
