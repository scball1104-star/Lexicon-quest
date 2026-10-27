// Episode 1, 2 and 3 text (later episodes at the end): bestiary lore, books (library and Archive), location banners, menu help lines,
// field remarks (party "barks"), game over lines and the credits. Pure data.
//
// Box rules (checked by qa/content): at most 3 lines of 42 characters per box, no em dashes.
// Book pages and lore entries are lists of boxes. {hero} = the player's chosen name.

import { ENEMIES } from './enemies.js';

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
  // Whisperwood Hollow (optional, W6-content)
  thornback_wolf: {
    name: 'Thornback Wolf', where: 'Whisperwood Hollow',
    lore: [
      'A briar wolf grown old under the pines. The thorns go all the way through.',
      'The hollow\'s wolves are bigger than the valley\'s, and they answer to something bigger still.',
      'Spear and fire both find the gaps in its thorns. Its bite leaves poison, like its smaller cousins.',
    ],
  },
  ink_blot: {
    name: 'Ink Blot', where: 'Whisperwood Hollow',
    lore: [
      'Ink from the black pool, thick as tar and twice as patient.',
      'It has soaked in the hollow so long that it will not take poison, and the cold barely bothers it.',
      'Fire and a heavy axe break it apart. The one in the chest bay wears an elite\'s gold.',
    ],
  },
  briar_alpha: {
    name: 'Briar Alpha', where: 'Whisperwood Hollow',
    lore: [
      'The pack\'s first and oldest. It kept the lost bridge for years, and nobody told it to stop.',
      'Hurt it badly and it calls the pack. Hurt it worse and the thorns along its spine make it fast.',
      'Fire and axes. It lay across the pilgrims\' stone so long that the names under it were never scratched out.',
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
  bell_tower: { title: 'The Bell Tower', sub: 'Willowmere' },   // H1: the cold open
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
  whisperwood_hollow: { title: 'Whisperwood Hollow', sub: 'The Lost Bridge' },
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
    ledger: 'Read a name. {i:btn_pageR}: next page.',
    ledgerTouch: 'Tap a name to read. Arrows: next page.',
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
  // W9: the field ability wheel ({i:btn_pageL} switches, {i:btn_pageR} uses) and its four abilities
  field: {
    wheel: '{i:btn_pageL} switch  {i:btn_pageR} use',
    dash: 'Dash ahead: breaks cracks, roots, pots.',
    appraise: 'Read a foe ahead. Fills the Bestiary.',
    lantern: 'Raise the Lantern: hidden ink shows.',
    shove: 'Bram shoves a heavy block one tile.',
    nothing: 'Nothing here to read.',
    recorded: 'Recorded in the Bestiary.',
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
  // W9-abilities: the one hint line per field ability, spoken the first time the party meets its target.
  first_heavy_block: [
    { if: 'bram_joined', lines: [{ who: 'bram', text: "That one won't budge for you. Stand aside and let me shove it: {i:btn_pageR_shove}." }] },
  ],
  first_dash_target: [
    { if: 'mira_joined', lines: [{ who: 'mira', text: 'Hear how hollow that sounds? Hit it at a run, {hero}: {i:btn_pageR_dash}.' }] },
  ],
  first_appraise_target: [
    { if: 'mira_joined', lines: [{ who: 'mira', text: 'Want its weak spots before we fight? {i:btn_pageL} to my lens, then {i:btn_pageR_appraise}.' }] },
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

// ------------------------------------------------------------------------------------------------
// W9: field abilities (the ability wheel, the Status screen row). Help text lives in HELP.field.
// ------------------------------------------------------------------------------------------------
export const FIELD_ABILITIES = {
  dash: { name: 'Dash Strike', owner: 'hero' },
  appraise: { name: 'Appraise', owner: 'mira' },
  lantern: { name: 'Lantern', owner: 'mira' },
  shove: { name: 'Shove', owner: 'bram' },
};

// ================================================================================================
// Episode 2 (E2-story). Merged into the Episode 1 tables above, so every existing reader sees them.
// ================================================================================================

// Bestiary for the 15 new foes. lore[0] is the enemies.js `flavor` (agreed with E2-battle).
Object.assign(BESTIARY, {
  mist_wolf: {
    name: 'Mist Wolf', where: 'The Fading Road',
    lore: [
      'A wolf made mostly of morning fog. The bite is real.',
      'Mist wolves hunt where the road thins. Travelers who lose the cairns tend to meet them twice.',
      'Fire burns the mist off them, and a spear finds what is left. Their bite can blur your sight.',
    ],
  },
  glassback: {
    name: 'Glassback Beetle', where: 'The Fading Road',
    lore: [
      'Its shell is old silverglass. While it glitters, spells bounce.',
      'It opens every fight by hardening its shell. Anything cast at it then comes straight back.',
      'An axe cracks the glass, and so does thunder. Once the shine is gone, magic lands as it should.',
    ],
  },
  quicksilver: {
    name: 'Quicksilver', where: 'The Fading Road',
    lore: [
      'A bead of mercury that rolled off a mirror and kept rolling.',
      'Hit it hard enough and it splits in two, and both halves are still annoyed.',
      'Thunder and ice set it solid. Fire only makes it run.',
    ],
  },
  quicksilver_bead: {
    name: 'Quicksilver Bead', where: 'The Fading Road',
    lore: [
      'A drop of Quicksilver that broke away. It wants to roll back.',
      'Small, quick, and very nearly harmless. Very nearly.',
    ],
  },
  glint_wisp: {
    name: 'Glint Wisp', where: 'The Silverglass Antechamber',
    lore: [
      'A glint of light that came loose from the glass and lost its way.',
      'It throws dazzling dust. When it gathers itself into a prism, everyone should brace.',
      'Arrows and thunder bring it down. Fire and light only feed it.',
    ],
  },
  glass_sentinel: {
    name: 'Glass Sentinel', where: 'The Silverglass Antechamber',
    lore: [
      'A sentry of the Court, built of silverglass and very old orders.',
      'It raises a glass guard and waits. When it stamps, the floor shakes and shards fly at everyone.',
      'Thunder and an axe. Swords and spears skid off its sides.',
    ],
  },
  borrowed_shadow: {
    name: 'Borrowed Shadow', where: 'The Hall of Other Selves',
    lore: [
      'A shadow with nobody to belong to. It borrows whatever hits it.',
      'Strike it with one thing and it learns that thing, and gives it back. Change what you strike with.',
      'Light and arrows find it before it has learned to hide from them.',
    ],
  },
  faceless_knight: {
    name: 'Faceless Knight', where: 'The Hall of Other Selves',
    lore: [
      'A knight of the Court with a blank visor. It guards the weakest.',
      'It steps in front of whichever ally is closest to falling. Hit them all at once, or hit the knight.',
      'Axes, thunder and light. When it raises its blade for judgement, defend.',
    ],
  },
  shard_swarm: {
    name: 'Shard Swarm', where: 'The Unnamed Throne',
    lore: [
      'Pieces of a broken mirror that still fly in formation.',
      'Hard to hit with a blade. A storm of them can cut the whole party at once.',
      'Thunder, axes and light scatter them. Spears and arrows mostly pass between.',
    ],
  },
  refl_hero: {
    name: 'Nameless Reflection', where: 'The Hall of Other Selves',
    lore: [
      'Your reflection, stepped out of the glass. It has no face.',
      'It fights the way you fight, backwards: strong where you are, open to everything you do not carry.',
      'Spear, staff and bow. It shrugs off swords and axes.',
    ],
  },
  refl_mira: {
    name: "Mira's Reflection", where: 'The Hall of Other Selves',
    lore: [
      'Mira, backwards. It says what she is afraid of.',
      'It casts fire and frost, and mends the other reflections.',
      'Sword, axe and spear. Staves and bows are her own, and it knows them.',
    ],
  },
  refl_bram: {
    name: "Bram's Reflection", where: 'The Hall of Other Selves',
    lore: [
      'Bram, backwards. It stands still, the way guards are taught.',
      'It guards the others and dares you to hit it. It is very good at being hit.',
      'Sword, staff and bow. Spears and axes are his own, and it knows them.',
    ],
  },
  nameless_king: {
    name: 'The Nameless King', where: "The King's Mirror",
    lore: [
      'The lord of the Court of Mirrors. He keeps everything.',
      'When his mirror turns toward someone, he means to keep them. Defend, or they are sealed in glass.',
      "His name was Aurel. He gave it to the glass so it would take his name and not his son's.",
    ],
  },
  false_sorrow: {
    name: 'Sorrow', where: "The King's Mirror",
    lore: [
      'A reflection of grief. While it weeps, the King mends.',
      'Its lament heals the King and washes him clean. Fire and arrows end it.',
    ],
  },
  false_pride: {
    name: 'Pride', where: "The King's Mirror",
    lore: [
      'A reflection of pride. It stands in front of what it guards.',
      'While it stands proud, nothing gets past it to Sorrow. Strike them all at once, or strike Pride first.',
      'Spears and thunder. Fire and swords only flatter it.',
    ],
  },
});

// Books. Map events: { type: 'book', book: '<id>' }.
Object.assign(BOOKS, {
  nh_ledger: {
    title: "Elian's Ledger", where: 'nh_hall',
    pages: [
      'Every name in town, written fresh each morning in the same young hand. Every page, the same list.',
      'Some mornings a name is written, crossed out, and written again, harder.',
      'Near the back, smaller: "Today I felt I was waiting for someone. I wrote my own name twice, to be safe."',
    ],
  },
  court_ledger: {
    title: 'The Ledger of the Court', where: 'court_f2',
    pages: [
      "The Keepers kept names in the Book and faces in the glass. A reflection is a name's shadow.",
      'While someone keeps your reflection, your name has somewhere to rest. That is what this Court is for.',
      'In a later hand: "The list came today. A child\'s name at the top. I have offered the glass a trade."',
      'The last line, pressed hard into the page: "Keep them. Keep them all. Do not let it read them."',
    ],
  },
  nh_register_page: {
    title: 'A Page of the Register', where: 'nh_chapel',
    pages: [
      "Births, marriages and namings, in Sister Anwen's round hand. Every line full.",
      '"Found on the chapel step, about four years old, wrapped in a man\'s coat. He knew his own name: Elian."',
      'Halfway down the page, one line is white. Not erased. White, as if nothing had ever been written there.',
    ],
  },
});

// Banners for the 11 new maps. `states` (Episode 2 shape): a first-match conditional list of { if, ifNot, title,
// sub } that bannerFor checks before the base title. Readers that only know `title` still get the base banner.
Object.assign(BANNERS, {
  east_road: { title: 'The Fading Road', sub: 'East of the Fork' },
  nameless_hollow: { title: 'Nameless Hollow', sub: 'The Unwritten Square',
    states: [{ if: 'nh_restored', title: 'Hollowmere', sub: 'The Remembered Square' }] },
  nh_hall: { title: "Mayor's Hall" },
  nh_chapel: { title: 'Chapel of the Candles' },
  nh_inn: { title: 'The Signless Inn' },
  nh_shop: { title: 'Hollow Provisioner' },
  nh_smithy: { title: 'Silverglass Smithy' },
  court_f1: { title: 'Court of Mirrors', sub: 'I. The Silverglass Antechamber' },
  court_f2: { title: 'Court of Mirrors', sub: 'II. The Hall of Other Selves' },
  court_f3: { title: 'Court of Mirrors', sub: 'III. The Unnamed Throne' },
  court_throne: { title: "The King's Mirror" },
});

// Field remarks for the Episode 2 field mechanics (one each per save). fog_loop is also a scene (the step
// trigger at fog_return runs scene fog_loop); the bark is the same exchange for a world system that prefers it.
Object.assign(BARKS, {
  first_mirror: [
    { if: ['court_entered', 'bram_joined'], lines: [{ who: 'mira', text: 'It turns on its stand. Wherever the light lands, that is where it wants to go.' }] },
  ],
  first_glass_bridge: [
    { if: ['court_entered', 'bram_joined'], lines: [{ who: 'bram', text: 'The light is holding the glass up. Or the glass is holding the light. Either way, it holds me.' }] },
  ],
  first_receptor: [
    { if: ['court_entered', 'bram_joined'], lines: [{ who: 'mira', text: 'A crystal that keeps the light. Something, somewhere, just unlocked.' }] },
  ],
  fog_loop: [
    { if: ['saw_cairns', 'bram_joined'], lines: [
      { who: 'mira', text: "We've passed this one. Eleven pebbles. I counted." },
      { who: 'bram', text: 'Stay on the stones.' },
    ] },
  ],
});

// Help lines for the Hollow's save bell and inn (one line each, max 40 characters).
Object.assign(HELP.save, { bell_hollow: 'The silver bell rings. Someone listens.' });
Object.assign(HELP.inn, { poor_wren: 'Not enough gold. Wren looks sorry.' });

// W15 (PLAYTEST_REVIEW_4 fix 3): the card after the Episode 2 credits, before the party wakes in Hollowmere's inn, so
// nobody goes looking for a road that is not in the game yet. Placeholder wording: Scott chooses the final words.
export const END_CARD_EP2 = { text: 'To be continued', sub: 'Episode 3 is not playable yet.', frames: 300, backdrop: 'dialog_keyart_ep2' };

// Credits for Episode 2. Played after ep2_complete over the "hollowmere" theme (same card shape as CREDITS).
export const CREDITS_EP2 = [
  { heading: 'LEXICON QUEST', lines: ['Episode 2: The Town Without a Name'] },
  { heading: 'Created by', lines: ['Scott Ball'] },
  { heading: 'Story, World and Direction', lines: ['Scott Ball'] },
  { heading: 'Music', lines: ['Composed for Lexicon Quest with Suno'] },
  { heading: 'The Party', lines: ['{hero}', 'Mira of Hollowmere', 'Bram, son of Garrick'] },
  { heading: 'Hollowmere', lines: ['Mayor Elian', 'Sister Anwen', 'Tovin the ferryman', 'Lena the watchmaker'] },
  { heading: 'Hollowmere', lines: ['Vessa of the Silverglass Smithy', 'Nico and his crowns', 'Sava the weaver', 'Corin of the watch'] },
  { heading: 'Hollowmere', lines: ['Orla of the shrine', 'Wren of the Signless Inn', 'Fitch, and his stock'] },
  { heading: 'The Road East', lines: ["Garrick and Hal, of Garrick's Crossing", 'Penny, who goes where roads go'] },
  { heading: 'The Court of Mirrors', lines: ['The Other Selves', 'Sorrow and Pride', 'Aurel, the Nameless King'] },
  { heading: 'And', lines: ['Vex Quill, who was never in the room'] },
  { heading: 'Willowmere', lines: ['Hazel, who waited up', 'Elder Mael and his Register', 'Iris and her list', 'Tess, and the White Road'] },
  { heading: '', lines: ['A name is a promise, not a title.', 'Thank you for keeping ours.'] },
  { heading: 'Thank you for playing', lines: ['Far away, the mountains begin to smolder.'] },
];

// ================================================================================================
// Episode 3 (E3-story): bestiary for the 11 new foes, two books, banners for the 10 new maps, the three quench barks,
// help lines for the Bell House and the inn, the end card and the credits.
// ================================================================================================

// Bestiary. lore[0] is the enemies.js `flavor` (E3-battle aligns names and flavor when it writes enemies.js). Staged in
// BESTIARY_EP3 and merged into BESTIARY entry by entry as enemies.js defines each id, so the Bestiary never lists a foe
// the game does not have (qa/ui/ep2.test.mjs and qa/content/text.test.mjs hold every merged entry to enemies.js).
export const BESTIARY_EP3 = {
  cinder_hound: {
    name: 'Cinder Hound', where: 'The Old Sand Road',
    lore: [
      'A hound that slept too near the furnace road, and woke with an ember for a mane.',
      'It bites, and the bite sometimes smoulders. Its snap is quick, and it dodges the slow.',
      'Ice and spears find it. Fire only keeps it warm.',
    ],
  },
  cinder_beetle: {
    name: 'Cinder Beetle', where: 'The Old Sand Road',
    lore: [
      'A beetle in a black carapace with glowing seams. It stokes itself.',
      'Each stoke burns it hotter. At white heat it rams. Cool it with ice or a Quench Flask, or break its shell first.',
      'Ice and axes. Swords and arrows skid off, and fire is its favorite meal.',
    ],
  },
  slag_slime: {
    name: 'Slag Slime', where: 'The Ashen Foundry',
    lore: [
      'A slime of molten orange with a dark crust, still learning how to cool.',
      'It splashes burns, and when it has stoked enough it bursts over the whole party. Cool it first.',
      'Ice sets it and thunder shakes it loose. Fire only makes it brighter.',
    ],
  },
  ashbound_miner: {
    name: 'Ashbound Miner', where: 'The Ashen Foundry',
    lore: [
      'A soot-black shade in a miner\'s coat, still carrying its lamp into a shift that ended long ago.',
      'Its lamp flash blinds. Its pick does not care.',
      'Light and arrows. Ice passes through the coat as if it were not there.',
    ],
  },
  furnace_construct: {
    name: 'Furnace Construct', where: 'The Ventilation Galleries',
    lore: [
      'A bronze golem with a furnace for a core. It was built to carry heat. It was not built to stop.',
      'It stokes until it vents its whole core at the party. Quench it before the glow turns white.',
      'Ice and thunder. Swords and spears ring off the bronze.',
    ],
  },
  soot_phantom: {
    name: 'Soot Phantom', where: 'The Ventilation Galleries',
    lore: [
      'A cloud of soot with ember eyes, drifting where the fans left it.',
      'It blinds the party with a cloud, then chokes the voices out of them. It is hard to hit twice.',
      'Light and arrows. Fire passes through it and only makes it glow.',
    ],
  },
  forge_defender: {
    name: 'Forge Defender', where: 'The Heartforge Crucible',
    lore: [
      'A bronze knight with a molten visor, set to guard the lower forge and never relieved.',
      'It steps in for its allies, and brands one foe when it glows white. Cool it first.',
      'Ice, axes and light. Swords and spears ring off its plate.',
    ],
  },
  bellows_specter: {
    name: 'The Bellows Specter', where: 'The Fan Hall',
    lore: [
      "The foundry's breath given a body: a bird of smoke and soot in the fan hall's updraft.",
      'It stokes itself every turn. When it draws the whole draft into its chest, the party burns. Quench it, or defend.',
      'When the fans reverse it stokes twice. Ice every round, or a spear to break its shield.',
    ],
  },
  cinder_warden: {
    name: 'The Cinder Warden', where: 'The Heartforge',
    lore: [
      'The Keeper of the Heartforge: a tool of bronze that was given a bad order, and carried it out for twenty-five years.',
      'It raises its hammer over one of you and means to strike the name out. Defend, or let Bram stand in front.',
      'Its last hammer shakes the whole forge. Everyone defends, or Bram takes it, and then the Warden breaks.',
    ],
  },
  bellows_coil: {
    name: 'Bellows Coil', where: 'The Heartforge',
    lore: [
      "A coil of glowing pipe on a bronze stand. It feeds the Warden's fire.",
      'Every turn it stokes the Warden. Break it first, and the Warden slows down.',
    ],
  },
  smelter_coil: {
    name: 'Smelter Coil', where: 'The Heartforge',
    lore: [
      'A coil of pipe that never stopped sending slag where the old order said to.',
      'Every second turn it sprays the whole party. Break it first, and the burning stops.',
      'Ice and axes. Spears find the seam.',
    ],
  },
};
for (const [id, entry] of Object.entries(BESTIARY_EP3)) if (ENEMIES[id]) BESTIARY[id] = entry;

// Books. Map events: { type: 'book', book: '<id>' }. Nothing here names the founder or the Smith (read before the reveal).
Object.assign(BOOKS, {
  foundry_ledger: {
    title: 'The Foundry Ledger', where: 'foundry_f2',
    pages: [
      'A burned ledger, read by the Lantern. Every row is a name and a shift, in the same careful hand.',
      "The last shift's list runs for three pages. At the end the hand changes, pressing harder: ALL OUT.",
      'In one row, where a name should be, there is only a stamp: a small bell, pressed so hard it cut the page.',
    ],
  },
  pk_records: {
    title: "The Bell House Records", where: 'pk_bellhouse',
    pages: [
      'Emberpeak kept three kinds of record: the foundry ledger, the memorial plates, and the Bell House book.',
      'The Bell House book lists every bell on the mountain: when it was cast, who tuned it, and what it was tuned to say.',
      'The newest entry stops mid-line. The ink runs out, and below it someone has pressed a thumb into the paper, once.',
    ],
  },
});

// Banners for the 10 new maps. Emberpeak has two states (the bell).
Object.assign(BANNERS, {
  sand_road: { title: 'The Old Sand Road', sub: 'Into the Ash Hills' },
  emberpeak: { title: 'Emberpeak', sub: 'Bellows Square',
    states: [{ if: 'pk_restored', title: 'Emberpeak', sub: 'The First Bell' }] },
  pk_inn: { title: 'The Coal Lantern Inn' },
  pk_shop: { title: 'Ventworks Supplies' },
  pk_smithy: { title: 'Emberpeak Weaponsmith' },
  pk_bellhouse: { title: 'The Bell House' },
  foundry_f1: { title: 'The Ashen Foundry', sub: 'I. The Cinder Liftworks' },
  foundry_f2: { title: 'The Ashen Foundry', sub: 'II. The Ventilation Galleries' },
  foundry_f3: { title: 'The Ashen Foundry', sub: 'III. The Heartforge Crucible' },
  foundry_heart: { title: 'The Heartforge' },
});

// Field remarks for the quench mechanic (one each per save). first_quench is also the end of scene slag_crossing's
// lesson; first_sluice fires the first time the party faces a sluice paddle, first_basin when a basin first fills.
Object.assign(BARKS, {
  first_sluice: [
    { if: ['sand_gate_open', 'bram_joined'], lines: [{ who: 'bram', text: 'Paddle. Turns the water. Carters used these.' }] },
  ],
  first_quench: [
    { if: ['sand_gate_open', 'mira_joined'], lines: [{ who: 'mira', text: "It stays cooled. Good. I'd hate to do that twice." }] },
  ],
  first_basin: [
    { if: ['sand_gate_open', 'mira_joined'], lines: [{ who: 'mira', text: 'Full basin, cooled grate. Water opens things here.' }] },
  ],
});

// Help lines for the Bell House's save bell and the Coal Lantern's innkeeper (one line each, max 40 characters).
Object.assign(HELP.save, { bell_pk: 'The old bell rings. Someone hears.' });
Object.assign(HELP.inn, { poor_bess: 'Not enough gold. Bess looks sorry.' });

// The card after the Episode 3 credits, before the party wakes at the Coal Lantern. Episode 4 is not in the game.
export const END_CARD_EP3 = { text: 'To be continued', sub: 'Episode 4 is not playable yet.', frames: 300, backdrop: 'dialog_keyart_ep3' };
// The same card for Episode 2 once Episode 3 is live: story.js CREDITS_HANDOFF[2].endCard becomes this when EP3_LIVE.
export const END_CARD_EP2_LIVE = { text: 'To be continued', sub: 'Episode 3 begins in the morning.', frames: 300, backdrop: 'dialog_keyart_ep2' };
// The Episode 4 title card text (placeholder wording, Scott chooses the final words): used by ep3_ending.
export const EPISODE4_CARD = { text: 'Episode 4: The Sunken Keep', sub: 'Downriver, a kingdom forgets who rules it.' };

// Credits for Episode 3. Played after ep3_complete over the "first_bell" theme (same card shape as CREDITS).
export const CREDITS_EP3 = [
  { heading: 'LEXICON QUEST', lines: ['Episode 3: The Forge of Ash'] },
  { heading: 'Created by', lines: ['Scott Ball'] },
  { heading: 'Story, World and Direction', lines: ['Scott Ball'] },
  { heading: 'Music', lines: ['Composed for Lexicon Quest with Suno'] },
  { heading: 'The Party', lines: ['{hero}', 'Mira, who counted the steps', 'Bram, son of Garrick and Mara'] },
  { heading: 'Emberpeak', lines: ['Foreman Veyra', 'Ilya the Bell Founder', 'Sella of the Weaponsmith', 'Harl the Surveyor'] },
  { heading: 'Emberpeak', lines: ['Bess of the Coal Lantern', 'Taro of Ventworks', 'Rusk the Watch'] },
  { heading: 'The Old Sand Road', lines: ['Garrick, who walked all night', 'Penny, who goes where roads go', 'Vessa, and her key'] },
  { heading: 'The Ashen Foundry', lines: ['The Bellows Specter', 'The Bellows and Smelter Coils', 'The Cinder Warden, who kept the fire'] },
  { heading: 'Mara of the First Bell', lines: ['She counted the people.'] },
  { heading: 'And', lines: ['Vex Quill, who tore a name off a list'] },
  { heading: 'Hollowmere and Willowmere', lines: ['Wren, who put an egg in his pocket', 'Elian, Aurel and Sister Anwen', 'Hazel, Mael, Holt and Hal'] },
  { heading: '', lines: ['You can file off the letters.', "You can't file off the press."] },
  { heading: 'Thank you for playing', lines: ['Far away, a bell rings under water.'] },
];


// ------------------------------------------------------------------------------------------------
// Vows (H3, docs/VOWS.md): the rest-flow window, the toast at a break, the kept-vow box, the menu and Journal line.
// The vow table itself (names, offer lines, party lines) is src/data/vows.js. {name} = the vow, {member} = who is paid.
// ------------------------------------------------------------------------------------------------
export const VOW_TEXT = {
  offer: 'Take a vow?',
  none: 'No vow',
  take: 'Take the vow',
  back: 'Not this one',
  taken: 'Vow taken: {name}.',
  ended: 'Vow ended: {name}.',
  endedShort: 'Vow ended',
  active: 'Vow: {name}',
  kept: 'Vow kept: {name}.',
  paid: '{member}: {weapon} mastery +{n}.',
  learned: '{skill} learned!',
  capped: 'Five vows have paid this chapter. This one is its own reward.',
};

export default { BESTIARY, BOOKS, BANNERS, HELP, BARKS, GAMEOVER, CREDITS, FIELD_ABILITIES, CREDITS_EP2, CREDITS_EP3, VOW_TEXT };
