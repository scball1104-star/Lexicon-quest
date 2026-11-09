// Episode 5, "The Last Prophecy": the Saffron Haven cast (plan 2.6) and the Episode 5 lines for the Valewyn, Emberpeak,
// Hollowmere and Willowmere residents. register() adds the records to NPCS, the scene speakers to SPEAKER_NAMES, and
// prepends the returning-cast lines through prependTalk (the npcs.js seam). Idempotent. Part of the lazy `ep5` pack.
//
// Record shape is src/data/npcs.js's. Stages: haven_arrived, star_reading_done, lab_f2_done, haven_restored, ep5_complete.
// No portrait aliases: Sel and the Haven speak without portraits (plan 9.5).
//
// THE NAMES. Sel's mother is two speaker records, student_m ("The First Student") until sel_memory_3 and ishra_m ("Ishra")
// after; Yara's father is tamir_m / tamir_t ("A Traveler") until Yara knows him in every_road, then tamir_n and the
// record `tamir` ("Tamir", shown from ep5_complete).
//
// SCENE TWINS. Where a scene spawns a twin of a map NPC on the same map, the record stands down for that window with the
// ep4 pack's compound flag (`all:a,!b`, src/data/ep4/field/seams.js; the ep4 pack is always up before this one): Sel
// from sel_walked_in (she is sel_t in the Well, the Eye and the Haven's last scenes) until ep5_complete; Yara and Nasrin
// from chart_restored (every_road and ep5_ending spawn yara_t and nasrin_t) until ep5_complete.
//
// Never hide an old scene. A returning-cast entry is put in front of the NPC's list, so for every scene entry already in
// that list it is split into variants that cannot match while the scene entry would (guardAgainst, the Episode 4 helper).

import * as NPCMOD from '../npcs.js';
import { guardAgainst } from '../ep4/npcs.js';

const { NPCS, SPEAKER_NAMES } = NPCMOD;

const ARR = 'haven_arrived';
const READ = 'star_reading_done';
const F2 = 'lab_f2_done';
const RES = 'haven_restored';
const END = 'ep5_complete';
const E5 = 'ep5_started';
const TESTIMONIES = ['testimony_yara', 'testimony_kamal', 'testimony_nasrin'];
const BELLS = ['bell_1_found', 'bell_2_found', 'bell_3_found'];
/** The scene-twin windows (see the header). */
export const SEL_TWIN = 'all:sel_walked_in,!ep5_complete';
export const HAVEN_TWIN = 'all:chart_restored,!ep5_complete';

const b = (text) => ({ who: 'bram', text });

export const EP5_NPCS = {
  sel: {
    name: 'Sel', sprite: 'npc_sel', map: 'ep5_saffron', spot: 'Under a copper awning in the northern market court (mark sel_spot)',
    move: 'stand', show: { ifNot: SEL_TWIN },
    about: 'Nomad Sel, thirty, wind-dark, a saffron headscarf and a brass sun staff. Reads the sky. The guest; never fights.',
    talk: [
      { if: ARR, ifNot: 'met_sel', scene: 'meet_sel' },
      { if: END, lines: [
        'I walk the deep desert in the mornings now. Then I come back. I like the coming back best.',
        "Ishra's star is easy to find. It's the late one.",
      ] },
      { if: 'gnomon_get', lines: ["Go on, then. I stayed out of there twenty years. I'm very good at it."] },
      { if: READ, lines: ['The north gate. I said I had something for the dials. I keep my word. Slowly.'] },
      { if: 'met_sel', lines: ['The tower, north-east. Tonight. Laleh is better at this than I am. She enjoys it.'] },
      { lines: ['The sky said three, then two.'] },
    ],
  },
  yara: {
    name: 'Yara', sprite: 'npc_yara', map: 'ep5_saffron', spot: 'At the water stairs by her ship (mark water_stairs)', move: 'turn',
    show: { if: ARR, ifNot: HAVEN_TWIN },
    about: 'Yara the Caravan Keeper, captain of the Saffron Wind. Forties, a rope on her shoulder. Her father did not come back.',
    talk: [
      { if: 'roads_started', ifNot: 'testimony_yara', scene: 'testimony_yara' },
      { if: END, lines: [
        'My father sleeps till noon now. Twenty years of walking. I let him.',
        'The boat by the stairs runs to Valewyn whenever you like. The sea is the easy part.',
      ] },
      { if: F2, lines: ["You've been down there a while. Sand on your boots. Good. It means you came back up."] },
      { if: READ, lines: ['So now you know what the letter said. Sel told me to carry it. She never told me to read it.'] },
      { lines: [
        'The Saffron Wind runs back to Valewyn from these stairs, whenever you like.',
        'Caravan Keeper, they called me, back when there were caravans to keep. Now I keep a ship.',
      ] },
    ],
  },
  tamir: {
    name: 'Tamir', sprite: 'npc_tamir', map: 'ep5_saffron', spot: "Beside Yara's ship at the water stairs (mark tamir_spot)", move: 'turn',
    show: { if: END },
    about: "Yara's father, the caravan master who turned back for one stranger. \"A Traveler\" until every_road.",
    talk: [
      { lines: [
        'Twenty years we walked outward. Every road we tried only went away from here.',
        'Then a star came back. Hers. I knew it at once.',
      ] },
    ],
  },
  kamal: {
    name: 'Kamal', sprite: 'npc_kamal', map: 'ep5_saffron', spot: 'At the Moonwell in the caravanserai (mark moonwell)', move: 'stand',
    about: 'Kamal the Water Bearer, keeps the Moonwell. Slow, gentle. Witness. Starts Three Roads Home after met_sel.',
    talk: [
      { if: 'met_sel', ifNot: 'roads_started', scene: 'roads_start' },
      { if: END, lines: ['Moonwell water tastes different every dusk. Tonight it tastes of a great many roads at once.'] },
      { if: 'moonwell_woken', lines: [
        'Three roads. I draw the water twice a night now, only to see them.',
        'Rest here, if you like. The water keeps a tired body honest.',
      ] },
      { if: TESTIMONIES, lines: ['All three have spoken. Draw the water now. The bucket is heavy, but it is honest.'] },
      { if: 'roads_started', lines: ['Yara at the water stairs. Nasrin in the market. Then the water.'] },
      { if: RES, lines: ['The wind is still this morning. The water says the same as the stone. That is new.'] },
      { lines: [
        'The oasis water tells the truth when the wind grows still.',
        'Today the wind is not still. So I wait.',
      ] },
    ],
  },
  nasrin: {
    name: 'Nasrin', sprite: 'npc_nasrin', map: 'ep5_saffron', spot: 'On a bench in the northern market court (mark nasrin_bench)', move: 'stand',
    show: { ifNot: HAVEN_TWIN },
    about: 'Nasrin the Star Reader, sixties, keeper of the old caravan law. Reads the nightly prophecy aloud. Witness.',
    talk: [
      { if: 'roads_started', ifNot: 'testimony_nasrin', scene: 'testimony_nasrin' },
      { if: END, lines: ["I read tonight's reading aloud in the square. It was a road. People clapped. Nobody claps for a prophecy."] },
      { if: 'lab_f2_arrived', ifNot: 'reliquary_found', lines: [
        'The travelers who went into the Gallery scratched their names under the sand, the old tellers say.',
        'Where the dusk light comes through a west window. Look with a lamp.',
      ] },
      { if: READ, lines: ['I read it aloud because someone must. I never said I liked it.'] },
      { lines: ['Every night the Oracle sends a reading to the tower. Every night I read it to the town. Every one ends.'] },
    ],
  },
  laleh: {
    name: 'Laleh', sprite: 'npc_laleh', map: 'ep5_sh_observatory', spot: 'At the great rings (mark laleh_spot)', move: 'turn',
    about: 'Laleh the Stargazer, twenties, ink to the elbows, runs the armillary. Teaches Mira to turn the rings.',
    talk: [
      { if: END, lines: ['The chart writes roads now. I measure the changes in the night inscriptions. They change toward home.'] },
      { if: 'chart_restored', lines: ['The empty space in my charts is full. I keep looking at it. I had got used to it.'] },
      { if: READ, lines: ['Turn the rings when the sky reads wrong. Mira has good hands for it. Steady ones.'] },
      { if: 'met_sel', lines: ['Sel said you would come up tonight. Walk in. The rings are ready.'] },
      { lines: ['The constellation has one star too few. Sel will tell you. Or she will send you back up here.'] },
    ],
  },
  omar: {
    name: 'Omar', sprite: 'npc_omar', map: 'ep5_caravan_road', spot: "In the obelisk's noon shade by the Glass Flat (mark omar_spot)",
    move: 'stand', service: { type: 'shop', id: 'pathkeeper' },
    about: 'Omar the Pathkeeper, sixties, sun-creased. Keeps the shade tent and marks safe stones for caravans that never leave.',
    talk: [
      { if: RES, lines: ['Caravans on my road! I mark safe stones before every caravan leaves at dawn. Every dawn, now.'] },
      { if: 'tent_rested', lines: ['Supplies, if you need them. Pathkeeper prices. The shade is free.'] },
      { lines: [
        'I mark safe stones before every caravan leaves at dawn.',
        'No caravan has left at dawn in twenty years. I mark them anyway.',
      ] },
    ],
  },
  yasmin: {
    name: 'Yasmin', sprite: 'npc_yasmin', map: 'ep5_sh_shop', spot: 'Behind the counter of Saffron Caravan Supplies (mark counter)',
    move: 'turn', service: { type: 'shop', id: 'saffron_supplies' },
    about: 'Yasmin the Cloth Merchant. Her copper awnings shade the market. Keeps the shop. Met at the gate in haven_arrival.',
    talk: [
      { if: END, lines: ['Every awning in the market is down and packed. They are going out with the caravans. I am delighted.'] },
      { if: RES, lines: ['Three caravans asked for saffron cloth today. Three! I had to find my scissors.'] },
      { lines: [
        'My copper awnings keep the sun off travelers and their stories.',
        'Saffron cloth holds its color after a hundred storms. Hourglass Sand, too, if you need it.',
      ] },
    ],
  },
  hassan: {
    name: 'Hassan', sprite: 'npc_hassan', map: 'ep5_sh_smithy', spot: 'At the copper forge (mark anvil)', move: 'turn',
    service: { type: 'shop', id: 'copperwind' },
    about: "Hassan the Copperwright, keeps the Copperwind Smithy and tunes caravan bells. Hassan's Bells. Tier 10 after lab_f2_done.",
    talk: [
      { if: ARR, ifNot: 'bells_started', scene: 'bells_start' },
      { if: BELLS, ifNot: 'bells_done', scene: 'bells_done' },
      { if: END, lines: ['The bells on the gate ring every time a caravan comes in. I have not slept. I do not mind.'] },
      { if: 'bells_done', lines: ['They hang on the gate now. When the wind turns, listen for them.'] },
      { if: F2, lines: ['New steel, copper-forged, for whatever is under the Gallery. The smiths heard it through the anvils.'] },
      { if: 'bells_started', lines: ['One bell on the Caravan Road, on a sand island. Two in the Labyrinth, on the first floor.'] },
      { lines: [
        'The smiths can hear a sandstorm coming through their anvils.',
        'I tune little bells so caravans can find the way home.',
      ] },
    ],
  },
  ep5_innkeeper: {
    name: 'The Dune Host', sprite: 'npc_innkeeper', map: 'ep5_sh_inn', spot: 'Behind the Dune Lantern counter (mark counter)', move: 'stand',
    service: { type: 'inn', price: 100 },
    about: 'Keeps the Dune Lantern Rest (canon title). Not a Ledger name (a shop counter).',
    talk: [
      { if: RES, lines: ['Every lamp lit, every bed full, and caravans asking for more. One hundred gold, and a lamp of your own.'] },
      { lines: ['The Dune Lantern Rest. A lamp for every bed. One hundred gold, and the lamp is yours till morning.'] },
    ],
  },
};

/** Scene speakers that are not NPC records (map actors, memory voices, scene twins). */
export const EP5_SPEAKERS = {
  oracle: 'The Oracle', oracle_v: 'The Oracle', student_m: 'The First Student', ishra_m: 'Ishra', tamir_m: 'A Traveler',
  sel_t: 'Sel', yara_t: 'Yara',
};

// ------------------------------------------------------------------------------------------------
// The returning cast: one Episode 5 line at the start (ep5_started) and one after (ep5_complete); the Valewyn farewells
// (EPISODE5 scene 2) are the start lines of Lyra, Hale, Ada and Joss.
// ------------------------------------------------------------------------------------------------
export const EP5_TALK_PREPEND = {
  // Valewyn
  lyra_n: [
    { if: END, lines: ['A letter came for me on the desert ship. From a Sel. It says you put a star back. I signed for it.'] },
    { if: E5, lines: ['The gates are open. Keep them that way, wherever you go.'] },
  ],
  hale: [
    { if: END, lines: ['That desert ship came back up the river with sand in her rigging. I shouted at her. Felt right.'] },
    { if: E5, lines: ['Ships. Big ferries with opinions.'] },
  ],
  ada: [
    { if: END, lines: ['A letter for you from the south. Dry, sandy, and your name on it in plain ink. I read the name twice.'] },
    { if: E5, lines: ["If anything comes back addressed to you, I'll carry it."] },
  ],
  joss: [
    { if: END, lines: ['Sand in the great lock this morning. Off your boots, I expect. I oiled it out. Open, shut, open.'] },
    { if: E5, lines: ['Sand gets in locks. Mind your crank.', b('We gave it back.'), 'Mind it anyway.'] },
  ],
  // Emberpeak
  garrick_n: [
    { if: END, lines: ["Bram heard his mother's tuning in a desert bell, he writes. Three lines on it. That is a lot, for Bram."] },
    { if: E5, lines: ['A ship, Bram writes. Tell him the sea is a big quench tank. He will hate that.'] },
  ],
  rusk: [
    { if: END, lines: ['A copper bell came in the post, from a Hassan. For the watch post. I hung it. Taro rings it at me.'] },
    { if: E5, lines: ['Sand on the wind from the south this week. Grit in the rope. Mind your eyes.'] },
  ],
  bess: [
    { if: END, lines: ['Bram sent me a desert spice in a letter. I put it in everything. Everything.'] },
    { if: E5, lines: ["A fifth stew, for the road south. Spiced. I don't know what's in it. It knows."] },
  ],
  taro: [
    { if: END, lines: ['Mira wrote me about sundials that move sand. I have not slept. I drew eleven.'] },
    { if: E5, lines: ['A desert that reads the sky? Star angles are only numbers, tell Mira. Big cold numbers.'] },
  ],
  ilya: [
    { if: END, lines: ["A small copper bell came in the post. The tuning is Mara's. I rang it once and sat down."] },
    { if: E5, lines: ['Bells in the desert, they say, tuned so caravans can find home. I would like to hear one.'] },
  ],
  sella: [
    { if: END, lines: ['Copper from the south. Soft as butter, bright as a lamp. I am making a bell. Badly.'] },
    { if: E5, lines: ['Bring me desert copper. I want to see how it takes an edge.'] },
  ],
  veyra: [
    { if: END, lines: ["The Haven ordered iron lamp rails. In a hand I could read. I framed it beside Valewyn's."] },
    { if: E5, lines: ['A desert across the sea? Bring back an order for iron. Please. In a hand.'] },
  ],
  harl: [
    { if: END, lines: ['The wind from the south smells of rain and camels this week. I wrote down both.'] },
    { if: E5, lines: ['Hot wind from the south, the carters say. My readings agree. Take water.'] },
  ],
  // Hollowmere
  wren: [
    { if: END, lines: ["A courier's satchel from the south, full of sand and thank-you notes. On the shelf. In front."] },
    { if: E5, lines: ['A letter came through for you with sand in the fold. I dusted it. The sand came back.'] },
  ],
  elian: [
    { if: END, lines: ['The Haven has its road back, the letters say. My father reads them aloud at supper. Badly. Proudly.'] },
    { if: E5, lines: ['A desert town that has been told how it ends. We know a little about being told things.'] },
  ],
  anwen: [
    { if: END, lines: ['A star put back where it could be read. I will light a candle for that. It is braver than it sounds.'] },
    { if: E5, lines: ['The fountain shows stars this week. Thousands. As if it is thinking of a sky somewhere else.'] },
  ],
  tovin: [
    { if: END, lines: ['A whole caravan walked home across a desert by one star, they say. I rowed out tonight to look up.'] },
    { if: E5, lines: ['A ship to the south. Boats are only ferries that do not know when to stop.'] },
  ],
  vessa: [
    { if: END, lines: ['Mira sent me desert sand. I made a lens. Through it the stars look close enough to argue with.'] },
    { if: E5, lines: ['Desert sand makes glass hard as an answer, they say. Bring me a handful. A big hand.'] },
  ],
  // Willowmere
  holt: [
    { if: END, lines: ['Letter from Bram. Sandy. Says the sky in the south has a star for everyone. Even me.'] },
    { if: E5, lines: ["Bram's letter says he's on a ship. Bram. On a ship. I've seen him in a bathtub."] },
  ],
  pip: [
    { if: END, lines: ['The desert sent me a star chart. I counted. One star was late. Then it came. Good.'] },
    { if: E5, lines: ['A town that counts stars! I count bells. We should write. Tell them I said so.'] },
  ],
  hob: [
    { if: END, lines: ['Caravans on the south roads again, the carters say. Hot ones. Mind the spice.'] },
    { if: E5, lines: ['A traveler from the south paid me in coins with suns on them. They are warm. Always warm.'] },
  ],
  hazel: [
    { if: END, lines: ['A letter in your hand came from the desert, {hero}. Your name at the bottom, and a small star by it.'] },
    { if: E5, lines: ['A ship, Bram writes. South. Keep your head covered, {hero}. Keep writing.'] },
  ],
};

// ------------------------------------------------------------------------------------------------
const MAX_VARIANTS = 16;
const built = new Map();   // npc id -> the entry objects prepended (built once, so register() twice adds nothing)
/** The guarded entries for one NPC as its talk list stands now (null when it would need too many variants). */
export function guardedFor(npcId, entries) {
  if (built.has(npcId)) return built.get(npcId);
  const n = NPCS[npcId];
  let list = entries;
  for (const e of (n && Array.isArray(n.talk) ? n.talk : [])) {
    if (!e || !e.scene) continue;
    list = guardAgainst(list, e);
    if (list.length > MAX_VARIANTS) { list = null; break; }
  }
  built.set(npcId, list);
  return list;
}

export function register() {
  for (const [id, rec] of Object.entries(EP5_NPCS)) if (!NPCS[id]) NPCS[id] = rec;
  for (const [id, name] of Object.entries(EP5_SPEAKERS)) if (!SPEAKER_NAMES[id]) SPEAKER_NAMES[id] = name;
  for (const [id, entries] of Object.entries(EP5_TALK_PREPEND)) {
    if (!NPCS[id]) continue;
    const list = guardedFor(id, entries);
    if (list && list.length) NPCMOD.prependTalk(id, list);
  }
}

export default register;
