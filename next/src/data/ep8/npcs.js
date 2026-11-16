// Episode 8, "The Last Word": the Scriptorium cast (plan 2.6), the First Keeper as a post-game resident at the Index, Vex
// on the bindery step after the end, and the Episode 8 and post-game lines for every earlier town. register() adds the
// records to NPCS, the scene speakers to SPEAKER_NAMES, and prepends the returning-cast lines through prependTalk (the
// npcs.js seam). Idempotent. Part of the lazy `ep8` pack (the ep7 pack, and so ep6 to ep3, is always up before this one).
//
// Record shape is src/data/npcs.js's. Stages: scriptorium_arrived, read_learned, library_open, keeper_named,
// scriptorium_open, ep8_complete. No portrait aliases: the Scriptorium speaks without portraits (plan 9.2).
//
// THE NAME. Until keeper_named no Scriptorium line calls the Librarian the First Keeper, and none says the two are one man:
// Ione's canon third line ("The First Keeper knows what the Eraser believed forgetting would accomplish.") treats them as
// two, so it is held to keeper_named, where it reads true of a man who knows his own mind. Arun's and Meya's third lines are
// held to scriptorium_open. Quinn's third canon line (read backwards) is never used (DESIGN hard rule 2).
// qa/content/ep8_data.test.mjs reads every one.
//
// Never hide an old scene. A returning-cast entry is put in front of the NPC's list, so for every scene entry already in
// that list it is split into variants that cannot match while the scene entry would (guardAgainst, the Episode 4 helper).

import * as NPCMOD from '../npcs.js';
import { guardAgainst } from '../ep4/npcs.js';
import { X1_LIVE } from '../x1/live.js';

const { NPCS, SPEAKER_NAMES } = NPCMOD;

const ARR = 'scriptorium_arrived';
const READ = 'read_learned';
const OPENED = 'library_open';
const NAMED = 'keeper_named';
const SOPEN = 'scriptorium_open';
const END = 'ep8_complete';
const E8 = 'ep8_started';
const DRIFT = ['drift_1_found', 'drift_2_found', 'drift_3_found'];

const m = (text) => ({ who: 'mira', text });
const b = (text) => ({ who: 'bram', text });

export const EP8_NPCS = {
  elowen: {
    name: 'Elowen', sprite: 'npc_elowen', map: 'ep8_scriptorium', spot: 'At her desk under the register house awning (mark elowen_stall)',
    move: 'stand',
    about: 'Elowen, Keeper of the Scriptorium: forties, a Keeper\'s grey, ink to the wrists, a quill behind one ear. Keeps the register and the bindery. Witness.',
    talk: [
      { if: READ, ifNot: 'elowen_met', scene: 'elowen_scriptorium' },
      { if: ['concordance_started', 'elowen_met'], ifNot: 'testimony_elowen', scene: 'testimony_elowen' },
      { if: END, lines: ['A letter came up the stair in a hand I know now. It is at the top of a clean page of the register.'] },
      { if: SOPEN, lines: ['The line in my register is plain writing now. I read it every morning, before the others.'] },
      { if: 'elowen_met', lines: ['Every spring I miss something. This spring too, so far.'] },
      { lines: ['The register of the Scriptorium. Every name in the street passes my desk.'] },
    ],
  },
  ione: {
    name: 'Ione', sprite: 'npc_ione', map: 'ep8_scriptorium', spot: 'At the west side of the Living Codex, a ring of drawer keys (mark ione_spot)',
    move: 'turn',
    about: 'Ione, Archivist of True Names: sixties, ink to the wrists. Keeps the Living Codex; carries canon Iona the Indexer\'s lines too. Gives the Concordance. Witness.',
    talk: [
      { if: ARR, ifNot: 'concordance_started', scene: 'concordance_start' },
      { if: END, lines: ['I keep the living catalogue by author, place and vow. It grew a whole shelf this week.'] },
      { if: NAMED, lines: ['The First Keeper knows what the Eraser believed forgetting would accomplish.'] },
      { if: 'concordance_lit', lines: ['The folio is lit. People stop to read it on their way past. That is all I wanted.'] },
      { if: 'concordance_started', lines: ['Fen by the Index steps. Elowen at the register. Then the folio.'] },
      { lines: [
        'Every new book creates another shelf. The final hall is growing again.',
        'I keep the living catalogue by author, place and vow.',
      ] },
    ],
  },
  fen: {
    name: 'Fen', sprite: 'npc_fen', map: 'ep8_scriptorium', spot: 'By the Index steps, sleeves too long (mark fen_spot)', move: 'turn',
    about: 'Fen, Apprentice Keeper: late teens, a Keeper\'s grey with the hood down. The Library\'s last apprentice. Witness.',
    talk: [
      { if: 'concordance_started', ifNot: 'testimony_fen', scene: 'testimony_fen' },
      { if: END, lines: ['He is teaching me the drawers. All of them. He says it will take two lifetimes, and to start now.'] },
      { if: SOPEN, lines: ['I went past the Index door today. Nobody stopped me. I did not know where to stand.'] },
      { lines: ["I'm the Library's last apprentice. They never let me past the Index door."] },
    ],
  },
  quinn: {
    name: 'Quinn', sprite: 'npc_quinn', map: 'ep8_scriptorium', spot: 'At the South Margin gate, pages under both arms (mark quinn_gate)',
    move: 'turn', service: { type: 'shop', id: 'quinn_satchel' },
    about: 'Quinn the Page Runner: twenties, a runner\'s satchel. Gives Quinn\'s Drifting Pages; sells from the satchel (shop quinn_satchel, peddler prices).',
    talk: [
      { if: ARR, ifNot: 'drift_started', scene: 'drift_start' },
      { if: DRIFT, ifNot: 'drift_done', scene: 'drift_done' },
      { if: END, lines: ['Pages still drift out of the stacks. Now they come back on their own. I just walk beside them.'] },
      { if: 'drift_done', lines: ['Three pages back in the satchel book. I read them every morning, in case.'] },
      { if: 'drift_started', lines: ['One page on a ledge of the Stair. Two blew into the first floor. Bring them back.'] },
      { lines: [
        'Pages drift out of the stacks when nobody is looking.',
        'I carry fresh ink and binding cord between the library wings.',
      ] },
    ],
  },
  sorel: {
    name: 'Sorel', sprite: 'npc_sorel', map: 'ep8_sc_atelier', spot: 'At the bench of the Glyphsmith Atelier, a lens on a cord (mark counter)',
    move: 'turn', service: { type: 'shop', id: 'glyphsmith' },
    about: 'Sorel the Restorer: fifties, a magnifying lens on a cord. Keeps the Glyphsmith Atelier (shop glyphsmith; tier 16 after library_f2_done).',
    talk: [
      { if: END, lines: ['A broken binding can be repaired. A lost name needs a friend. This week, it had a lot of them.'] },
      { if: 'library_f2_done', lines: ['New steel, for whatever is at the top. I restored every edge twice.'] },
      { if: READ, lines: ['The Eraser was not always the enemy; read the oldest histories.'] },
      { lines: [
        'A broken binding can be repaired. A lost name needs a friend.',
        'I restore torn volumes at the Glyphsmith Atelier.',
      ] },
    ],
  },
  arun: {
    name: 'Arun', sprite: 'npc_arun', map: 'ep8_scriptorium', spot: 'By his candle posts on the script-road, a taper on a pole (mark arun_post)',
    move: 'turn',
    about: 'Arun the Candlekeeper: seventies, a taper on a long pole. Lights the lamps along the script-road.',
    talk: [
      { if: END, lines: ['These candles burn with the light of remembered kindness. I have had to order more wick.'] },
      { if: SOPEN, lines: ['A new flame appears whenever someone tells the truth.'] },
      { lines: [
        'These candles burn with the light of remembered kindness.',
        'I watch the lamps along the script-road as the sun sets.',
      ] },
    ],
  },
  meya: {
    name: 'Meya', sprite: 'npc_meya', map: 'ep8_scriptorium', spot: 'On the school steps, a book on her knees (mark meya_steps)', move: 'stand',
    about: 'Meya the First Student: a child with ink on her nose and a book on her knees. No age is said on screen.',
    talk: [
      { if: END, lines: ['Mira wrote me a list of questions. Not answers. Questions. I am on number four.'] },
      { if: SOPEN, lines: ['The First Keeper sometimes leaves a blank page for visitors to fill.'] },
      { if: READ, lines: ['My word came back. I keep checking. It is still there.'] },
      { lines: ['I practise reading the old glyphs before class.'] },
    ],
  },
  ep8_innkeeper: {
    name: 'The Scriptorium Host', sprite: 'npc_innkeeper', map: 'ep8_sc_inn', spot: "Behind the Keeper's Quiet Rooms counter (mark counter)",
    move: 'stand', service: { type: 'inn', price: 160 },
    about: "Keeps the Keeper's Quiet Rooms (canon inn and interior title). Not a Ledger name (a shop counter).",
    talk: [
      { if: SOPEN, lines: ["The Keeper's Quiet Rooms. A bed under the books, one hundred and sixty gold. The books finish now."] },
      { lines: ["The Keeper's Quiet Rooms. A bed under the books, one hundred and sixty gold. Quiet is free."] },
    ],
  },
  ep8_shopkeeper: {
    name: 'The Archive Keeper', sprite: 'npc_shopkeeper', map: 'ep8_sc_shop', spot: 'Behind the Bibliotheca Supplies counter (mark counter)',
    move: 'stand', service: { type: 'shop', id: 'bibliotheca' },
    about: 'Keeps Bibliotheca Supplies (canon shop and interior title). Not a Ledger name (a shop counter).',
    talk: [
      { if: SOPEN, lines: ['Bibliotheca Supplies. We are out of red ink. Everybody is correcting something.'] },
      { lines: ['Bibliotheca Supplies. Ink, cord, and Fresh Ink for the rubbed-out kind of day.'] },
    ],
  },
  ep8_librarian: {
    name: 'The Librarian', sprite: 'npc_librarian', map: 'ep8_sc_index', spot: 'At the high desk, hood up, writing (mark librarian_desk)',
    move: 'stand', show: { ifNot: 'librarian_met' },
    about: 'The Librarian: very old, a violet robe, hood up, no portrait. One man in three records (with eraser_v and first_keeper). He goes up through the door behind the desk in meet_librarian.',
    talk: [
      { lines: ['Readers. Mind the drawers. They are older than they look.'] },
    ],
  },
  first_keeper: {
    name: 'The First Keeper', sprite: 'npc_first_keeper', map: 'ep8_sc_index', spot: 'At the high desk, every drawer open (mark librarian_desk)',
    move: 'stand', show: { if: NAMED }, portrait: 'first_keeper',
    about: 'The First Keeper, his face back: a post-game resident at the Index. His own name is never shown (EPISODE8 choice 26).',
    talk: [
      { lines: [
        'I cannot repair what I erased, but I can help return the keys to those whose names were stolen.',
        'The Library belongs to them now.',
      ] },
    ],
  },
  vex8: {
    name: 'Vex Quill', sprite: 'npc_vex_kneel', map: 'ep8_scriptorium', spot: 'On the bindery step, a needle and a split spine (mark vex_step)',
    move: 'stand', show: { if: SOPEN },
    about: 'Vex after the end: he stopped moving. Ledger: see vex (Episode 7\'s row).',
    talk: [
      { if: END, lines: ['Mending. Do not watch, it makes the needle shy.'] },
      { lines: ['Somebody has to mend all this. I am done moving.'] },
    ],
  },
};

/** Scene speakers that are not NPC records (map actors, memory voices, scene spawns). */
export const EP8_SPEAKERS = {
  eraser_v: 'The Eraser', first_keeper_m: 'The First Keeper', elowen_m: 'A Young Keeper', nurse_m: 'A Nurse',
  rootbound_keeper_m: 'The Keeper with the Lantern', scribe_m: 'A Scribe', traveler_m: 'A Traveler',
  mira_beam: 'Mira', bram_beam: 'Bram', aeris_t: 'Aeris', vex_k: 'Vex Quill', nox_t: 'Nox',
};

// ------------------------------------------------------------------------------------------------
// The returning cast. Palehaven: Bryn, Eira and Torr say one line each on the morning (ep8_started, before the roof); all
// six one line after (ep8_complete) naming the gold watchfires. Every earlier town: one post-game line each. Hazel's two by
// the home choice; Tess's and Mael's are the bible's; Hollis in the Deep Stacks; Hesper only while X1 is live.
// ------------------------------------------------------------------------------------------------
const MORNING = { if: E8, ifNot: 'ep8_roofed' };
export const EP8_TALK_PREPEND = {
  // Palehaven
  nox_t: [
    { if: END, lines: ['I come down to light the lamps, then back up the stair. Somebody has to keep him honest.'] },
    { ...MORNING, lines: ['The nave door, in the square. I will be at the first step.'] },
  ],
  bryn: [
    { if: END, lines: ['The watchfires burn gold now, every night. I have stopped checking them. Nearly.'] },
    { ...MORNING, lines: ['The watchfires are gold this morning. Never seen gold.'] },
  ],
  eira: [
    { if: END, lines: ['Gold in the watchfires, and my sister home for tea. I blew her a cup. It did not break.'] },
    { ...MORNING, lines: ["Bring the Keeper back. We've only just got her name."] },
  ],
  torr: [
    { if: END, lines: ['I wrote down the streets up there, from what Bram told me. The watchfires lit the page gold.'] },
    { ...MORNING, lines: ['Write down the streets up there. Somebody should.'] },
  ],
  maera: [{ if: END, lines: ['The winter moss turned gold with the watchfires. I have never seen it do that. It smells of honey.'] }],
  sol: [{ if: END, lines: ['I walk the road by the gold of the watchfires now. I still tie the twine. Habit.'] }],
  mirael: [{ if: END, lines: ['The watchfires are gold, and nobody has come to me with a cold in a week. I am almost bored.'] }],
  // Zephyr Landing
  aeris: [{ if: END, lines: ['Every realm on the chart, and a stair of light on top of the north. I drew it in myself. Twice.'] }],
  pippa: [{ if: END, lines: ['Every lamp on the docks is lit, and nobody asked me to. I lit them anyway.'] }],
  liora: [{ if: END, lines: ['A letter came for every lost pilot this week. I sorted them in a row, by name.'] }],
  bennet: [{ if: END, lines: ['The wind brought paper down out of the north. Every scrap of it had a name on it.'] }],
  // Saffron Haven
  sel: [{ if: END, lines: ['The caravans are coming home. Every one of them, by name. I am counting them in.'] }],
  laleh: [{ if: END, lines: ['The reading came true. An eighth star, with a sign. I checked it three times.'] }],
  kamal: [{ if: END, lines: ['The water shows an open book tonight. Slowly. It is in no hurry, and neither am I.'] }],
  yara: [{ if: END, lines: ['The stacks run fine, and a new shelf went up by itself. I did not ask who built it.'] }],
  // Valewyn
  lyra_n: [{ if: END, lines: ['I read the amended charter to the city this morning. Nobody hurried me. It was a long charter.'] }],
  hale: [{ if: END, lines: ['The river runs clear. Something up there finished a sentence. Tell me what it said.'] }],
  joss: [{ if: END, lines: ['The lock opened by itself at dawn. I oiled it anyway. Then I sat and watched the water.'] }],
  // Emberpeak
  garrick_n: [{ if: END, lines: ['Bram writes that he stood in front of somebody. He would. He always did.'] }],
  ilya: [{ if: END, lines: ["Mara's forge bell rang this week, one long note. I know whose hand that was."] }],
  bess: [{ if: END, lines: ['Bram sent word he wants a kitchen. Strong walls. Weak soup. I will not allow the soup.'] }],
  veyra: [{ if: END, lines: ['Every forge on the mountain lit at once this week. Nobody pulled a lever.'] }],
  // Hollowmere
  wren: [{ if: END, lines: ['Every name on my lost-property shelf has been collected. The shelf is empty. I dusted it anyway.'] }],
  anwen: [{ if: END, lines: ['The fountain shows a library tonight, with every door open. I lit a candle for the old man in it.'] }],
  vessa: [{ if: END, lines: ['Mira opened the mirrors and showed me every name she brought back. I am not crying. It is the glass.'] }],
  // Willowmere
  hazel: [
    { if: [END, 'told_hazel'], lines: [
      'You found them. I can tell. You stand like somebody who knows where they came from.',
      'Somebody loved you enough to choose it. And then I got to. Both are true.',
    ] },
    { if: END, lines: [
      'You said no, at the door. You never could lie to me. I let you.',
      'Wherever it was, you came home on purpose. That one I know.',
    ] },
  ],
  tess: [{ if: END, lines: ['Bram says the bells rang every name today. Even yours. Especially yours.'] }],
  mael: [{ if: END, lines: ["Sixty years I've counted thirteen. Tonight I heard who the thirteenth was for."] }],
  holt: [{ if: END, lines: ["Letter from Bram. He says it's done. He says it twice. I've read it three times."] }],
  pip: [{ if: END, lines: ['Thirteen bells, and the thirteenth said a name. Yours. I rang it again, very carefully.'] }],
  oren: [{ if: END, lines: ['My sign says BAKERY, all of it, and it said it all night. I baked something to celebrate.'] }],
  garrick: [{ if: END, lines: ['Bram writes he stood in front of the girl who reads. Good lad. That is what the forge is for.'] }],
  // The Deep Stacks
  hollis: [{ if: END, lines: ['Finished up there, are we. Down here it never is.'] }],
};
/** X1's Hesper, only while the Wider Valley is live. */
export const EP8_TALK_PREPEND_X1 = {
  hesper: [{ if: END, lines: ["There's a light in the eighth ring that was never there before."] }],
};

// ------------------------------------------------------------------------------------------------
const MAX_VARIANTS = 32;
/**
 * Flags every save that has started Episode 8 holds (met_mael included: Episode 1's first errand) (ep8_morning needs ep7_complete, and each episode's morning needs the
 * last one's end; the quick start sets every Episode 1 to 7 main flag). Every entry above is guarded by an Episode 8 flag,
 * so a guard variant that needs one of these UNSET can never match: it is dropped, which keeps the variant count small.
 */
export const EP8_IMPLIED = ['intro_done', 'met_mael', 'mira_joined', 'bram_joined', 'archivore_defeated', 'ep1_complete', 'ep2_complete', 'ep3_complete',
  'ep4_complete', 'ep5_complete', 'ep6_complete', 'ep7_complete', 'nox_named', 'doors_reopened'];
const toList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const live = (e) => {
  const no = toList(e.ifNot);
  return !no.some((f) => EP8_IMPLIED.includes(f)) && !toList(e.if).some((f) => no.includes(f));
};
const built = new Map();   // npc id -> the entry objects prepended (built once, so register() twice adds nothing)
/** The guarded entries for one NPC as its talk list stands now (null when it would need too many variants). */
export function guardedFor(npcId, entries) {
  if (built.has(npcId)) return built.get(npcId);
  const n = NPCS[npcId];
  let list = entries;
  for (const e of (n && Array.isArray(n.talk) ? n.talk : [])) {
    // an entry every Episode 8 save matches shadows everything after it: a scene entry there can never answer anyway
    if (e && !e.scene && toList(e.if).every((f) => EP8_IMPLIED.includes(f)) && !toList(e.ifNot).length) break;
    if (!e || !e.scene) continue;
    list = guardAgainst(list, e).filter(live);
    if (list.length > MAX_VARIANTS) { list = null; break; }
  }
  built.set(npcId, list);
  return list;
}

export function register(opts) {
  const x1 = opts && typeof opts.x1Live === 'boolean' ? opts.x1Live : X1_LIVE === true;
  for (const [id, rec] of Object.entries(EP8_NPCS)) if (!NPCS[id]) NPCS[id] = rec;
  for (const [id, name] of Object.entries(EP8_SPEAKERS)) if (!SPEAKER_NAMES[id]) SPEAKER_NAMES[id] = name;
  const tables = x1 ? { ...EP8_TALK_PREPEND, ...EP8_TALK_PREPEND_X1 } : EP8_TALK_PREPEND;
  for (const [id, entries] of Object.entries(tables)) {
    if (!NPCS[id]) continue;
    const list = guardedFor(id, entries);
    if (list && list.length) NPCMOD.prependTalk(id, list);
  }
}

export default register;
