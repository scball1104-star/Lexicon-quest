// Episode 4, "The Sunken Keep": the Valewyn cast (plan 2.6) and the Episode 4 lines for the Emberpeak, Hollowmere and
// Willowmere residents. register() adds the records to NPCS, the scene speakers to SPEAKER_NAMES, and prepends the
// returning-cast lines through prependTalk (the npcs.js seam). Idempotent. Part of the lazy `ep4` pack.
//
// Record shape is src/data/npcs.js's. Stages: vw_arrived, keep_f2_done, vw_restored, ep4_complete.
// THE NAME. The Regent is two records: regent_e (tag "The Regent") until lyra_named, then lyra_n (tag "Lyra"), both at
// regent_spot in the Hall, both with the `lyra` portrait (ep4_portraits.json, the noble_lady face aged). Nobody says Lyra before then.
//
// Never hide an old scene. A returning-cast entry is put in front of the NPC's list, so for every scene entry already in
// that list it is split into variants that cannot match while the scene entry would (guardAgainst below): a save with an
// unfinished Episode 1 to 3 side quest still gets its scene. qa/content/ep4_npcs.test.mjs checks it.

import * as NPCMOD from '../npcs.js';

const { NPCS, SPEAKER_NAMES } = NPCMOD;

const ARR = 'vw_arrived';
const F2 = 'keep_f2_done';
const RES = 'vw_restored';
const END = 'ep4_complete';
const E4 = 'ep4_started';
// The scene-twin window (E4-seamfix): from charter_restored, crown_remembers and ep4_ending spawn joss_t and ada_t on
// ep4_valewyn, so the map NPCs Joss and Ada stand down until ep4_complete brings them back. One conjunction of flags
// cannot say "from A until B", so this is a compound flag (`all:`, src/data/ep4/field/seams.js, read by the field).
export const SCENE_TWIN = 'all:charter_restored,!ep4_complete';

const m = (text) => ({ who: 'mira', text });
const b = (text) => ({ who: 'bram', text });

export const EP4_NPCS = {
  regent_e: {
    name: 'The Regent', sprite: 'npc_lyra', portrait: 'lyra', map: 'ep4_vw_palace',
    spot: 'At the long table of decrees (mark regent_spot)', move: 'stand', show: { if: ARR, ifNot: 'lyra_named' },
    about: 'Regent of Valewyn with her name struck: tag "The Regent" until lyra_named, then the lyra_n record. Fifties, exact, ashamed.',
    talk: [
      { if: F2, lines: [
        'Every morning a new order comes up out of the water, sealed in my name. This morning there was none.',
        'Whatever you are doing down there, I can feel it in the pen.',
      ] },
      { if: 'met_joss', lines: ["Joss gave you the crank. Good. I asked him once. He said the order said shut. So did I."] },
      { if: 'met_regent', lines: ['Joss, at the canal works. The crank turns the Keep. I cannot turn anything. Not even this pen.'] },
      { lines: ['...'] },
    ],
  },
  lyra_n: {
    name: 'Lyra', sprite: 'npc_lyra', portrait: 'lyra', map: 'ep4_vw_palace',
    spot: 'At the long table of decrees (mark regent_spot)', move: 'stand', show: { if: 'lyra_named' },
    about: 'Lyra, named. Same spot as regent_e; takes over when lyra_named is set. Signs OPEN and it stays.',
    talk: [
      { if: END, lines: [
        'I sign something every hour now, to watch it stay. Dorian says it is vanity. Dorian is right.',
        'The gates are open, {hero}. Come back through Valewyn. I mean it on the record.',
      ] },
      { if: RES, lines: ['Lyra. I keep saying it to the pen. It is a strange thing, to be glad of a word.'] },
      { lines: ['I signed it, and it held. Go on. I will be here. I have twelve years of letters to answer.'] },
    ],
  },
  hale: {
    name: 'Captain Hale', sprite: 'npc_hale', map: 'ep4_flood_road', spot: "Hale's landing, under the tarp by the fire (mark hale_spot)",
    move: 'turn', service: { type: 'shop', id: 'ferry_peddler' },
    about: 'Hale the Ferryman, sixties, oilskin, a voice for shouting across water. Has known the Regent thirty years. Witness.',
    talk: [
      { if: 'witnesses_started', ifNot: 'testimony_hale', scene: 'testimony_hale' },
      { if: END, lines: [
        'Lyra! Just checking it still works. It does. I am going to do that every morning till I die.',
        'Ferry runs both ways now. Supplies too. Peddler prices. I have a boat to feed.',
      ] },
      { if: RES, lines: ["My mother's street is dry. I walked down it. The door was open. I didn't go in. Not yet."] },
      { if: F2, lines: ["Water dropped a finger at the landing. Twelve years I've watched it. It has never dropped a finger."] },
      { if: ARR, lines: ['Back for supplies? I sell what floats and some of what does not. Peddler prices.'] },
      { lines: [
        'Ferry to Valewyn, when the city wants visitors. It wants them. It just cannot say so.',
        'Supplies under the tarp. Peddler prices. The rain is free.',
      ] },
    ],
  },
  nilo: {
    name: 'Nilo', sprite: 'npc_nilo', map: 'ep4_flood_road', spot: "Beside Hale's fire, whittling (mark nilo_spot)", move: 'stand',
    about: "Hale's ferryhand, about twenty. Whittles bell pins for a bell he lost. Nilo's Bell.",
    talk: [
      { if: 'ferry_rested', ifNot: 'nilo_done', scene: 'nilo_bell' },
      { if: END, lines: ['I ring it at dusk. The boats answer. One of them is always Hale, shouting.'] },
      { if: 'nilo_done', lines: ['Now the boats know I am here. I whittled a new pin. The old pin was fine. I just wanted to.'] },
      { lines: ['The water was lower yesterday. My landing is still under the tide.'] },
    ],
  },
  dorian: {
    name: 'Dorian', sprite: 'npc_dorian', map: 'ep4_vw_palace', spot: 'At the royal archive shelf (mark dorian_spot)', move: 'turn',
    about: "The Royal Scribe, seventies, ink-stained. Knows the old king's hand. Starts Three Witnesses after met_joss.",
    talk: [
      { if: 'met_joss', ifNot: 'witnesses_started', scene: 'witnesses_start' },
      { if: 'witnesses_started', ifNot: 'testimony_dorian', scene: 'testimony_dorian' },
      { if: END, lines: [
        'I have begun a new page of the records. The first line is in her hand. The second is mine. It is legible.',
      ] },
      { if: RES, lines: ['The charter is true again. I read it twice to be sure. Then a third time because I wanted to.'] },
      { if: 'witnesses_done', lines: ['One district first, and the other on the record as next. That is how a council keeps a promise.'] },
      { if: 'witnesses_started', lines: ['Hale at the landing. Joss at the works. Then the switch. I will not have it thrown on hearsay.'] },
      { lines: ['I was the king\'s scribe. I know his hand. Whatever is ruling Valewyn, it is not writing in it.'] },
    ],
  },
  joss: {
    name: 'Joss', sprite: 'npc_joss', map: 'ep4_valewyn', spot: 'At the canal works by the great lock wheel (mark canal_works)', move: 'turn',
    show: { ifNot: SCENE_TWIN },
    about: "Joss the Lockwright, forties, big forearms, keys and the Lockwright's Crank. Did not turn the locks for twelve years.",
    talk: [
      { if: 'met_regent', ifNot: 'met_joss', scene: 'joss_locks' },
      { if: 'witnesses_started', ifNot: 'testimony_joss', scene: 'testimony_joss' },
      { if: END, lines: [
        'I turn the great lock every morning now. Open, to check. Shut, to check. Open. Sori says I am showing off.',
      ] },
      { if: RES, lines: ['Open. I said it out loud when I turned it. Never said it out loud before. Felt like a promise.'] },
      { if: F2, lines: ['The Keep is answering the crank. I can feel it through the water. Like a big animal waking.'] },
      { if: 'met_joss', lines: ['Low, middle, high. Water goes where the wheel says. Wheels do not lie. People do.'] },
      { lines: ['Canal works. Mind the wheel. It has bitten better hands than yours.'] },
    ],
  },
  ada: {
    name: 'Ada', sprite: 'npc_courier_v', map: 'ep4_valewyn', spot: 'Under the flood board awning, wringing out her coat (mark board)',
    move: 'turn', show: { if: ARR, ifNot: SCENE_TWIN },
    about: 'Ada the Courier, the Episode 3 courier with her canon name. Soaked to the knees in every scene but the last.',
    talk: [
      { if: END, lines: [
        'The ship from the south is gone again. It left a smell of hot sand. I am dry for the first time in a month.',
      ] },
      { if: RES, lines: ['Royal notices arrive stamped and dry. The streets... the streets are dry too. Huh.'] },
      { lines: ['Royal notices arrive stamped and dry. The streets do not.', 'I am wet to the knees. Always to the knees. Never higher.'] },
    ],
  },
  vance: {
    name: 'Vance', sprite: 'npc_vance', map: 'ep4_valewyn', spot: 'At the flood board in the plaza (mark board)', move: 'turn',
    about: 'Vance the Guard. Pastes up the orders. Tears down the last forged one in crown_remembers: blank.',
    talk: [
      { if: END, lines: ['Nothing on the board but the weather and a lost cat. Best board I have ever kept.'] },
      { if: RES, lines: ['I pasted up orders for twelve years. Never read one past the seal. I am reading them all now. Slowly.'] },
      { if: F2, lines: ['No new order this morning. First time in a month. I stood here with the paste and nothing to put up.'] },
      { lines: ['It is hard to enforce a law that changes in the rain.', 'Gates stay shut. Seal is good. Seal is always good.'] },
    ],
  },
  linn: {
    name: 'Linn', sprite: 'npc_linn', map: 'ep4_vw_shop', spot: 'Behind the Provisioner counter, among waxed ledgers (mark counter)',
    move: 'turn', service: { type: 'shop', id: 'riverbank' },
    about: 'Linn the Archivist, helping at the Riverbank Provisioner. Carries records to high shelves when the canal rises.',
    talk: [
      { if: END, lines: ['I brought the records back down from the top shelf. My arms are grateful. The shelves are sulking.'] },
      { if: RES, lines: ['The water went down and I did not move a single box. I did not know what to do with my hands.'] },
      { if: 'keep_f2_arrived', ifNot: 'coffer_found', lines: [
        'The Keepers kept a coffer in the archives below. True ink, they said, does not mind water.',
        'If you find their marks, lift a light to them. Under water, if you have to.',
      ] },
      { lines: [
        'The charter had an open gate drawn over the last line. I saw it, once, as a girl.',
        'Rope, wax, Lamp Oil. Buy something. I carry the records up and down all day for free.',
      ] },
    ],
  },
  sori: {
    name: 'Sori', sprite: 'npc_sori', map: 'ep4_valewyn', spot: 'On the narrow stones by the canal works (mark canal_works)',
    move: 'wander', radius: 2,
    about: "Joss's apprentice, a child. Jumps the narrow stones at low tide, whistles in the palace for the echo.",
    talk: [
      { if: END, lines: ['Joss says I can turn the great lock when I am taller. I am standing on a crate. That counts.'] },
      { if: RES, lines: ['All the stones are out of the water! I jumped every one. Twice. One of them twice more.'] },
      { lines: [
        'I can jump across the narrow stones when the tide is low.',
        'The palace has the best echo for a whistle. Do not tell the Regent. She knows.',
      ] },
    ],
  },
  ep4_innkeeper: {
    name: 'Wenna', sprite: 'npc_innkeeper', map: 'ep4_vw_inn', spot: 'Behind the Floodwatch counter (mark counter)', move: 'stand',
    service: { type: 'inn', price: 80 },
    about: 'Keeps the Floodwatch Inn. Dry beds, mostly. Not a Ledger name (a shop counter).',
    talk: [
      { if: RES, lines: ['Every bed is dry tonight. Every one. I checked twice. Eighty gold, and I will tuck you in.'] },
      { lines: ['Floodwatch Inn. Dry beds, mostly. Eighty gold. The mostly is free.'] },
    ],
  },
  ep4_smith: {
    name: 'Corvel', sprite: 'npc_smith', map: 'ep4_vw_forge', spot: 'At the anvil of the Crown Guard Forge (mark anvil)', move: 'turn',
    service: { type: 'shop', id: 'vw_forge' },
    about: 'The Crown Guard smith. Arms for the Watch; tier 8 after keep_f2_done. Not a Ledger name (a shop counter).',
    talk: [
      { if: F2, lines: ['New steel, for whatever is down there. I made it heavier than the Watch asks. Do not tell the Watch.'] },
      { lines: ['Crown Guard Forge. Arms for the Watch, and for anyone the Watch is too wet to stop.'] },
    ],
  },
};

/** Scene speakers that are not NPC records (map actors and voices). */
export const EP4_SPEAKERS = {
  paper_regent: 'The Paper Regent', barrister: 'The Inkbound Barrister', king_v: 'The King',
};

// ------------------------------------------------------------------------------------------------
// The returning cast: one Episode 4 line at the start (ep4_started) and one after (ep4_complete), and the Act I
// farewells in Emberpeak (EPISODE4 scene 3). Garrick's farewell is one exchange (no talk counter exists).
// ------------------------------------------------------------------------------------------------
export const EP4_TALK_PREPEND = {
  garrick_n: [
    { if: END, lines: ['Lyra, Bram writes. Regent. Signs her name every hour. Sounds like a woman who lost a hammer once.'] },
    { if: E4, ifNot: RES, lines: ['Bram. Say mine before you sleep.', b('Every night.')] },
  ],
  rusk: [
    { if: END, lines: ['Rope came back. Wet. I am keeping it. It has been somewhere.'] },
    { if: E4, ifNot: 'east_road_open', lines: ['Rope is rigged at the washout, east edge. Frost cools hot metal. Water is a different problem.'] },
    { if: E4, lines: ['Watch of Emberpeak. The ladder holds. I tested it with Taro. Taro held too.'] },
  ],
  bess: [
    { if: END, lines: ["A fourth stew. Wet, they call it in Valewyn. It is a soup. Don't tell them."] },
    { if: E4, lines: ['That courier ate three bowls and fell asleep in the fourth. Wherever you are off to, eat first.'] },
  ],
  taro: [
    { if: END, lines: ['Valewyn wants gauges. Water gauges. I have never been so excited about a cold number.'] },
    { if: E4, lines: ['Going east? Water has pressure too. Nobody listens to me about water.'] },
  ],
  ilya: [
    { if: END, lines: ['A bell under water, you said. Rung from a boat. I would give a year to hear what it was tuned to.'] },
    { if: E4, lines: ['If you find a bell under that water, listen before you ring it.'] },
  ],
  sella: [
    { if: END, lines: ['Valewyn bought our iron for a hundred years, Veyra says. I am making them a lock wheel. A good one.'] },
    { if: E4, lines: ['Bring back something that floats. I want to see what they make when they are not making iron.'] },
  ],
  veyra: [
    { if: END, lines: ['Valewyn sent an order. For iron. Signed. In a hand. I nearly framed it.'] },
    { if: E4, lines: ['Valewyn bought our iron for a hundred years. Pay them back. Can you do that? Please say yes.'] },
  ],
  harl: [
    { if: END, lines: ['The rain stopped in the east, the carters say. I wrote it down. The soot cannot reach this page.'] },
    { if: E4, lines: ['All the rain the mountain did not get went east. I have the readings. Take boots.'] },
  ],
  // Hollowmere
  wren: [
    { if: END, lines: ['A courier\'s satchel came through, dry as a bone. Sand in the seams. I have put it on the shelf. Just in case.'] },
    { if: E4, lines: ['Valewyn mail has been coming in wet for a month. I dry it on the stove. The ink runs anyway.'] },
  ],
  elian: [
    { if: END, lines: ['A Regent wrote to Hollowmere. Her name was on it, and it held. I wrote back. So did my father.'] },
    { if: E4, lines: ['There is talk of a city downriver that has forgotten who rules it. We know a little about that.'] },
  ],
  anwen: [
    { if: END, lines: ['A regent who says what she did. I will light a candle for that. It is rarer than names.'] },
    { if: E4, lines: ['The fountain has been cloudy all week. As if it is thinking about water somewhere else.'] },
  ],
  tovin: [
    { if: END, lines: ['A ferryman in Valewyn shouted a name across the water for thirty years of not being able to. Good man.'] },
    { if: E4, lines: ['Valewyn has more boats than people, they say. I have been thinking about that all morning.'] },
  ],
  vessa: [
    { if: END, lines: ['Glass from Valewyn sand is soft. Glass from desert sand, they say, is hard as an answer. I want some.'] },
    { if: E4, lines: ['Glass remembers heat. Paper remembers nothing. Mind what you trust down there.'] },
  ],
  // Willowmere
  holt: [
    { if: END, lines: ['Bram says there is a Regent called Lyra. Said it three times in one letter. Must matter.'] },
    { if: E4, lines: ["Got a letter from Bram. Wet. Couldn't read a word but his name."] },
  ],
  pip: [
    { if: END, lines: ['Twelve bells, and one in Emberpeak, and one under the water in Valewyn. I am keeping a list.'] },
    { if: E4, lines: ['The bells sound damp this week. That is not a thing bells do. I wrote it down.'] },
  ],
  hob: [
    { if: END, lines: ['A traveler from Valewyn paid me in coins that dripped. I hung them up to dry. They are still the best coins.'] },
    { if: E4, lines: ['Rain from the east on the wind, the farmers say. Rain in a dry month. Mind yourselves.'] },
  ],
  hazel: [
    { if: END, lines: ['A letter came in your hand, {hero}. Your name at the bottom, dark and clear. I read the bottom first.'] },
    { if: E4, lines: ['East now, Bram writes, to a city under water. Keep your feet dry. Keep writing.'] },
  ],
};

// ------------------------------------------------------------------------------------------------
const toList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const MAX_VARIANTS = 16;
/**
 * Split `entry` into variants that cannot match while `scene` would: scene matches iff all of scene.if and none of
 * scene.ifNot; so a variant adds one scene.if flag to ifNot, or one scene.ifNot flag to if. A scene entry with no
 * ifNot and no if always matches: nothing can go in front of it, so the result is empty.
 */
export function guardAgainst(entries, scene) {
  const out = [];
  for (const e of entries) {
    for (const f of toList(scene.if)) out.push({ ...e, ifNot: [...toList(e.ifNot), f] });
    for (const f of toList(scene.ifNot)) out.push({ ...e, if: [...toList(e.if), f] });
  }
  return out;
}

const built = new Map();   // npc id -> the entry objects prepended (built once, so register() twice adds nothing)
/** The guarded entries for one NPC as its talk list stands now (null when it would need too many variants). */
export function guardedFor(npcId, entries) {
  if (built.has(npcId)) return built.get(npcId);
  const n = NPCS[npcId];
  let list = entries;
  for (const e of (n && Array.isArray(n.talk) ? n.talk : [])) {
    if (!e || !e.scene || EP4_TALK_PREPEND[npcId].includes(e)) continue;
    list = guardAgainst(list, e);
    if (list.length > MAX_VARIANTS) { list = null; break; }
  }
  built.set(npcId, list);
  return list;
}

export function register() {
  for (const [id, rec] of Object.entries(EP4_NPCS)) if (!NPCS[id]) NPCS[id] = rec;
  for (const [id, name] of Object.entries(EP4_SPEAKERS)) if (!SPEAKER_NAMES[id]) SPEAKER_NAMES[id] = name;
  for (const [id, entries] of Object.entries(EP4_TALK_PREPEND)) {
    if (!NPCS[id]) continue;
    const list = guardedFor(id, entries);
    if (list && list.length) NPCMOD.prependTalk(id, list);
  }
}

export default register;
