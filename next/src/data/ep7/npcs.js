// Episode 7, "The Vanishing World": the Palehaven cast (plan 2.6) and the Episode 7 lines for the Zephyr Landing, Saffron
// Haven, Valewyn, Emberpeak, Hollowmere and Willowmere residents. register() adds the records to NPCS, the scene speakers to
// SPEAKER_NAMES, and prepends the returning-cast lines through prependTalk (the npcs.js seam). Idempotent. Part of the lazy
// `ep7` pack (the ep6 pack, and so the ep5 and ep4 packs, is always up before this one).
//
// Record shape is src/data/npcs.js's. Stages: palehaven_arrived, met_keeper, vault_f2_done, nox_named, doors_reopened,
// ep7_complete. No portrait aliases: Nox and the town speak without portraits (plan 9.5).
//
// THE NAME. The Keeper is the record `keeper` ("The Keeper", by her lamp in the square) until her name comes back in
// whole_page; from nox_named she is the record `nox_t` ("Nox", by her stove in the Keeper's Watch, where the credits wake the
// party). Bryn, Eira, Torr and Mirael say "the Keeper" until nox_named and canon's words, with her name, after it (one word
// changed: EPISODE7 section 3). No line here says "Nox" before nox_named; qa/content/ep7_data.test.mjs reads every one.
//
// AWAY. The Keeper walks with the party from keeper_came (the Sanctum, the Stillheart, the hearth): the square's record
// stands down from then on, and nox_t takes over from nox_named.
//
// TWO POSTS. Eira keeps the Armory counter (`eira_forge`, shop glassice_armory) and the hearth (`eira`, the witness); Sol
// keeps his stake on the White Road (`sol`) and a peddler's counter at the Waystation (`sol_waystation`, shop
// waystation_pack). The second record of each is a Ledger alias of the first.
//
// Never hide an old scene. A returning-cast entry is put in front of the NPC's list, so for every scene entry already in
// that list it is split into variants that cannot match while the scene entry would (guardAgainst, the Episode 4 helper).

import * as NPCMOD from '../npcs.js';
import { guardAgainst } from '../ep4/npcs.js';

const { NPCS, SPEAKER_NAMES } = NPCMOD;

const ARR = 'palehaven_arrived';
const MET = 'met_keeper';
const F2 = 'vault_f2_done';
const NAMED = 'nox_named';
const OPEN = 'doors_reopened';
const END = 'ep7_complete';
const E7 = 'ep7_started';
const STREETS = ['street_1_found', 'street_2_found', 'street_3_found'];

const m = (text) => ({ who: 'mira', text });
const b = (text) => ({ who: 'bram', text });

export const EP7_NPCS = {
  keeper: {
    name: 'The Keeper', sprite: 'npc_keeper', map: 'ep7_palehaven', spot: 'Lighting a lamp at the foot of the Watch (mark keeper_lamp)',
    move: 'stand', show: { if: ARR, ifNot: 'keeper_came' },
    about: 'The Keeper of the Hollow North, seventies, long blue coat, white hair pinned up, ink on her right hand. Her name is gone. Never fights.',
    talk: [
      { if: ARR, ifNot: MET, scene: 'meet_keeper' },
      { if: 'vault_open', lines: ['The Vault is past the pines. Mind the floors.', 'They forget too.'] },
      { if: 'keeper_told', lines: ['The north gate. I said I would open it. Walk with me, then.'] },
      { if: MET, lines: ['I keep the lamps. Somebody has to light them by hand now.'] },
      { lines: ['...'] },
    ],
  },
  nox_t: {
    name: 'Nox', sprite: 'npc_keeper', map: 'ep7_ph_watch', spot: 'In her chair by the stove (mark keeper_chair)', move: 'stand',
    show: { if: NAMED },
    about: 'Nox, named. Takes over from the record keeper when nox_named is set. The Watch is where the credits wake the party.',
    talk: [
      { if: END, lines: [
        'The cots are yours as long as you want them. I turned the letters over. Every one.',
        'Go on up when you are ready. Ask me at the top.',
      ] },
      { if: OPEN, lines: ['The nave door, in the square. I will meet you at the top.'] },
      { lines: ['Nox. I write it on the back of a letter every morning, to see if it stays. It does.'] },
    ],
  },
  bryn: {
    name: 'Bryn', sprite: 'npc_bryn', map: 'ep7_palehaven', spot: 'At the south gate, staff and lantern hook (mark bryn_gate)', move: 'turn',
    about: 'Bryn the Frost Keeper, forties, a guard\'s fur hood. Tends the south and north gates and the watchfires.',
    talk: [
      { if: END, lines: [
        'Keeper Nox can explain why the snow hides gaps in the world.',
        'The watchfires burn yellow now. I keep looking at them to check.',
      ] },
      { if: NAMED, lines: ['Keeper Nox can explain why the snow hides gaps in the world.'] },
      { if: F2, lines: ['The watchfires turn pale blue when a page vanishes from the map. They went blue twice this morning.'] },
      { if: ARR, lines: [
        'The watchfires turn pale blue when a page vanishes from the map.',
        'I tend the north gate and keep the pathways clear of ice.',
        'The Keeper can explain why the snow hides gaps in the world.',
      ] },
      { lines: ['I tend the north gate and keep the pathways clear of ice.'] },
    ],
  },
  eira: {
    name: 'Eira', sprite: 'npc_eira', map: 'ep7_palehaven', spot: 'By the cold hearth in the square, a lens on a cord (mark hearth_w)',
    move: 'turn',
    about: 'Eira the Glassblower, thirties, glass-cut fingers. Blows the lantern glass and keeps the last lantern. Gives the Hearth. Witness.',
    talk: [
      { if: MET, ifNot: 'hearth_started', scene: 'hearth_start' },
      { if: END, lines: ['My sister wrote again. A new letter, not frozen. I read it standing up in the snow.'] },
      { if: NAMED, lines: ['Keeper Nox promised to keep my sister safe. She did, in the end. Just not the way she meant.'] },
      { if: 'hearth_lit', lines: ['The hearth burns. People sit by it and say names. I had forgotten that was what it was for.'] },
      { if: 'hearth_started', lines: ['Mirael at her house. Sol down on the road. Then the hearth.'] },
      { if: ARR, lines: [
        'My iceglass never breaks in cold, only when the story inside is forgotten.',
        'I make lantern lenses from aurora crystals.',
      ] },
      { lines: ['I make lantern lenses from aurora crystals.'] },
    ],
  },
  eira_forge: {
    name: 'Eira', sprite: 'npc_eira', map: 'ep7_ph_armory', spot: 'At the glass furnace (mark forge)', move: 'turn',
    service: { type: 'shop', id: 'glassice_armory' },
    about: 'Eira again, at the Glass-Ice Armory counter (shop glassice_armory; tier 14 after vault_f2_done). Ledger: see eira.',
    talk: [
      { if: END, lines: ['Iceglass, warm from the furnace. It holds a story better now that people tell them.'] },
      { if: F2, lines: ['New glass, for whatever is at the top of that cathedral. I did not let a single one crack.'] },
      { lines: [
        'My iceglass never breaks in cold, only when the story inside is forgotten.',
        'The Glass-Ice Armory. Coats, helms, and glass that holds.',
      ] },
    ],
  },
  sol: {
    name: 'Sol', sprite: 'npc_sol', map: 'ep7_white_road', spot: 'On his pack by the first gap, tying twine (mark sol_twine)', move: 'turn',
    about: 'Sol the Trail Scout, twenties, twine round both wrists, a pack of stakes. Carries canon Oren\'s testimony. Witness.',
    talk: [
      { if: 'hearth_started', ifNot: 'testimony_sol', scene: 'testimony_sol' },
      { if: END, lines: ['The paths stay put now. I leave the twine anyway. Habit is a kind of marker.'] },
      { if: 'first_stone_read', lines: [
        'Some paths disappear while I am walking them. I leave twine markers now.',
        'Read the stone, and the road remembers who walked it.',
      ] },
      { lines: ['Some paths disappear while I am walking them. I leave twine markers now.'] },
    ],
  },
  sol_waystation: {
    name: 'Sol', sprite: 'npc_sol', map: 'ep7_waystation', spot: 'Behind the counter by the post box (mark sol_counter)', move: 'turn',
    service: { type: 'shop', id: 'waystation_pack' },
    about: 'Sol again, at the Courier\'s Waystation (shop waystation_pack, peddler prices). Ledger: see sol.',
    talk: [
      { if: 'hearth_started', ifNot: 'testimony_sol', scene: 'testimony_sol' },
      { if: END, lines: ['I carry bundles to the watch tower before dark. Nobody minds the dark so much now.'] },
      { lines: [
        'I carry bundles to the watch tower before dark.',
        'Supplies, if you need them. Road prices. The stove is free.',
      ] },
    ],
  },
  maera: {
    name: 'Maera', sprite: 'npc_maera', map: 'ep7_ph_shop', spot: 'Behind the counter of Northwind Provisions (mark counter)', move: 'turn',
    service: { type: 'shop', id: 'northwind' },
    about: 'Maera the Herbalist, fifties, a basket of winter moss. Keeps Northwind Provisions and sells Ember Tea.',
    talk: [
      { if: END, lines: ['The winter moss leans south this week. Everyone it was waiting for came home.'] },
      { if: ARR, lines: [
        'Even the winter moss can tell whether a traveler will return.',
        'I keep warm infusions for the south-bound patrols. Ember Tea, if the cold gets into your names.',
      ] },
      { lines: ['Northwind Provisions. Warm things, mostly.'] },
    ],
  },
  torr: {
    name: 'Torr', sprite: 'npc_torr', map: 'ep7_palehaven', spot: 'On the steps of the Watch with his book (mark torr_steps)', move: 'turn',
    about: 'Torr the Northern Scribe, sixties, ink-blue fingers, a book under his arm. Gives Torr\'s Missing Streets.',
    talk: [
      { if: ARR, ifNot: 'streets_started', scene: 'streets_start' },
      { if: STREETS, ifNot: 'streets_done', scene: 'streets_done' },
      { if: END, lines: ['Keeper Nox taught me to press names into iceglass. I am teaching the children now.'] },
      { if: NAMED, lines: ['Keeper Nox taught me to press names into iceglass.'] },
      { if: 'streets_done', lines: ['Three streets back in the book. I read them out every morning, in case.'] },
      { if: 'streets_started', lines: ['One plaque on the White Road. Two blew into the Vault. Bring them back.'] },
      { lines: [
        'I write the missing streets in a book so they remain in memory.',
        'The Keeper taught me to press names into iceglass.',
      ] },
    ],
  },
  mirael: {
    name: 'Mirael', sprite: 'npc_mirael', map: 'ep7_palehaven', spot: 'At her house door in the south-west (mark mirael_door)', move: 'turn',
    about: 'Mirael the Winter Physician, forties, a physician\'s bag, a frost-grey scarf. Witness.',
    talk: [
      { if: 'hearth_started', ifNot: 'testimony_mirael', scene: 'testimony_mirael' },
      { if: END, lines: ['I have no patients this week. Everyone is out in the square, saying names.'] },
      { if: NAMED, lines: ['Keeper Nox tried to spare us grief by hiding every loss. It was the wrong medicine.'] },
      { if: ARR, lines: [
        'The vault held our names in ice, but the dead never asked us to lock the doors.',
        'The Keeper tried to spare us grief by hiding every loss.',
      ] },
      { lines: ['The cold keeps people in. It keeps people quiet, too.'] },
    ],
  },
  ep7_innkeeper: {
    name: 'The North Watchkeeper', sprite: 'npc_north_watchkeeper', map: 'ep7_ph_inn', spot: 'Behind the Thawlight Lodge counter (mark counter)',
    move: 'stand', service: { type: 'inn', price: 140 },
    about: 'Keeps the Thawlight Lodge (canon inn and interior title). Not a Ledger name (a shop counter).',
    talk: [
      { if: OPEN, lines: ['The Thawlight Lodge. A fur bedroll by the stove, one hundred and forty gold. The windows have thawed.'] },
      { lines: ['The Thawlight Lodge. A fur bedroll by the stove, one hundred and forty gold. Frost on the inside, free.'] },
    ],
  },
};

/** Scene speakers that are not NPC records (map actors, memory voices, scene spawns). */
export const EP7_SPEAKERS = {
  white_phantom: 'The Phantom', phantom_v: 'The Phantom', keeper_t: 'The Keeper', keeper_mid_m: 'The Keeper',
  keeper_young_m: 'A Girl', keeper_mother_m: "The Keeper's Mother", courier_m: 'A Courier', marten_m: 'Marten',
  aeris_t: 'Aeris', vex_k: 'Vex Quill',
};

// ------------------------------------------------------------------------------------------------
// The returning cast: one Episode 7 line at the start (ep7_started) and one after (ep7_complete); the Zephyr farewells
// (EPISODE7 scene 2) are the start lines of Pippa, Liora and Bennet. Tess's, Hazel's and Holt's lines are the bible's.
// ------------------------------------------------------------------------------------------------
export const EP7_TALK_PREPEND = {
  // Zephyr Landing
  aeris: [
    { if: END, lines: ["Snowrest is back on my chart. A village, a lamp-maker's, a road. I drew it in myself."] },
    { if: 'ep7_boarded', lines: ["The Kestrel's been north and back. Say the word and she goes again."] },
    { if: E7, lines: ['North dock. The Kestrel is ready. Hold on to something.'] },
  ],
  pippa: [
    { if: END, lines: ['A letter went south on the Kestrel, for a woman named Tess. I lit every lamp to see it off.'] },
    { if: E7, lines: ['Every ship answers the lights now. Even yours.'] },
  ],
  liora: [
    { if: END, lines: ['Aeris came back with letters. One addressed in a hand that crosses its sevens. I sorted it first.'] },
    { if: E7, lines: ["Dock four. If you come back, I'll be at the right one."] },
  ],
  bennet: [
    { if: END, lines: ['North wind in the rigging, and warm for once. Something up there let go.'] },
    { if: E7, lines: ['Wrap your hands. Rope freezes. So do fingers.'] },
  ],
  // Saffron Haven
  sel: [
    { if: END, lines: ['A letter from the north, in a careful hand. It says a door opened. I read it walking.'] },
    { if: E7, lines: ['North, the sky says. Snow. Take a coat, and take your time.'] },
  ],
  laleh: [
    { if: END, lines: ['The reading turned up. A stair, going into the sky. I did not believe it. I checked twice.'] },
    { if: E7, lines: ['The reading says a white road, and a door at the top of it.'] },
  ],
  kamal: [
    { if: END, lines: ['The water shows a stair tonight, all the way up. I will wait, slowly.'] },
    { if: E7, lines: ['Cold water is still water. Drink it anyway.'] },
  ],
  yara: [
    { if: END, lines: ['The stacks run fine. Somebody up north sent word their doors are open. Good weather for it.'] },
    { if: E7, lines: ["Snow, up north? I'll keep to water, thank you."] },
  ],
  // Valewyn
  lyra_n: [
    { if: END, lines: ['A letter from the North, signed by a Keeper. The signature stayed. I watched it a long time.'] },
    { if: E7, lines: ['North, to the cold. Write. Tell me the ink stays on the page up there.'] },
  ],
  hale: [
    { if: END, lines: ['Ice in the river this week, and then none. Something thawed a long way up.'] },
    { if: E7, lines: ['Snow and an airship. Two things I want nothing to do with. Tell me everything.'] },
  ],
  joss: [
    { if: END, lines: ['Warm wind in the lock this morning. From the north. I oiled it anyway.'] },
    { if: E7, lines: ['Up a white road? Mind your footing.', b('I always mind my footing.'), 'Mind it anyway.'] },
  ],
  // Emberpeak
  garrick_n: [
    { if: END, lines: ["Bram writes he found his mother's bell up north. He didn't say more. He didn't need to."] },
    { if: E7, lines: ['North, Bram writes. Tell him iron gets cold. Tell him to wear his gloves.'] },
  ],
  ilya: [
    { if: END, lines: ['A bell far north rang this week, they say, tuned like ours. I know whose tuning that is.'] },
    { if: E7, lines: ['She tuned every bell on this mountain. Maybe one up north as well. Listen for it.'] },
  ],
  bess: [
    { if: END, lines: ['Bram sent a recipe for something called Ember Tea. It is very hot. I approve.'] },
    { if: E7, lines: ['A seventh stew for the road. Thick. It is cold up there.'] },
  ],
  veyra: [
    { if: END, lines: ['A town up north ordered iron hinges. Every door at once. I have never sent so many.'] },
    { if: E7, lines: ['North, where the roads forget. Mark your way. Iron does not forget.'] },
  ],
  // Hollowmere
  wren: [
    { if: END, lines: ['The empty portrait in the Court has a face again. An old woman with a lamp. I put the lost-property shelf in order.'] },
    { if: E7, lines: ['A courier\'s satchel on my shelf has frost on it this week. I do not know why. I dusted it.'] },
  ],
  anwen: [
    { if: END, lines: ['The fountain shows a hearth this week, burning in the snow. I lit a candle to keep it company.'] },
    { if: E7, lines: ['The fountain shows white mountains, and a road. It looks cold. Go anyway.'] },
  ],
  vessa: [
    { if: END, lines: ['Mira sent me a lens of iceglass. It is clearer than anything I make. I am furious again.'] },
    { if: E7, lines: ['Ice that holds a story, they say. Bring me a piece. A small piece.'] },
  ],
  // Willowmere
  holt: [
    { if: END, lines: ["Letter from Bram. He found his mother's bell. He says he read the date. That's all he says."] },
    { if: E7, lines: ["Bram's letter says they're going up a white road with holes in it. I've read it twice. It still says holes."] },
  ],
  pip: [
    { if: END, lines: ['The thirteenth bell rang this week, all by itself, and nobody was sad after. I counted. Many times, then one.'] },
    { if: E7, lines: ['There is a bell up north that listens to ours, Mira wrote. I am going to ring very carefully.'] },
  ],
  hazel: [
    { if: END, lines: [
      'A courier left you on my step with a blanket and a laugh. I knew him.',
      "I couldn't say who, until today. Marten. Thank you, Marten.",
    ] },
    { if: E7, lines: ['North, Bram writes. Wrap up warm, {hero}. You came to me in the cold once. Come back out of it.'] },
  ],
  tess: [
    { if: END, lines: [
      'A letter came on an airship. In his hand. It says Marten at the bottom.',
      "Marten. I'm going to say it at every door on my route.",
    ] },
    { if: E7, lines: ["Bram's letter says they're going up the White Road. Dad's road. Tell them to mind the holes."] },
  ],
};

// ------------------------------------------------------------------------------------------------
const MAX_VARIANTS = 32;
/**
 * Flags every save that has started Episode 7 holds (ep7_morning needs ep6_complete, and each episode's morning needs the
 * last one's end; the quick start sets every Episode 1 to 6 main flag). Every entry above is guarded by an Episode 7 flag, so
 * a guard variant that needs one of these UNSET can never match: it is dropped, which keeps Tess's six scene entries under
 * the variant cap (2 entries x 2^6 would be 128).
 */
export const EP7_IMPLIED = ['intro_done', 'mira_joined', 'bram_joined', 'archivore_defeated', 'ep1_complete', 'ep2_complete', 'ep3_complete',
  'ep4_complete', 'ep5_complete', 'ep6_complete'];
const toList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const live = (e) => {
  const no = toList(e.ifNot);
  return !no.some((f) => EP7_IMPLIED.includes(f)) && !toList(e.if).some((f) => no.includes(f));
};
const built = new Map();   // npc id -> the entry objects prepended (built once, so register() twice adds nothing)
/** The guarded entries for one NPC as its talk list stands now (null when it would need too many variants). */
export function guardedFor(npcId, entries) {
  if (built.has(npcId)) return built.get(npcId);
  const n = NPCS[npcId];
  let list = entries;
  for (const e of (n && Array.isArray(n.talk) ? n.talk : [])) {
    if (!e || !e.scene) continue;
    list = guardAgainst(list, e).filter(live);
    if (list.length > MAX_VARIANTS) { list = null; break; }
  }
  built.set(npcId, list);
  return list;
}

export function register() {
  for (const [id, rec] of Object.entries(EP7_NPCS)) if (!NPCS[id]) NPCS[id] = rec;
  for (const [id, name] of Object.entries(EP7_SPEAKERS)) if (!SPEAKER_NAMES[id]) SPEAKER_NAMES[id] = name;
  for (const [id, entries] of Object.entries(EP7_TALK_PREPEND)) {
    if (!NPCS[id]) continue;
    const list = guardedFor(id, entries);
    if (list && list.length) NPCMOD.prependTalk(id, list);
  }
}

export default register;
