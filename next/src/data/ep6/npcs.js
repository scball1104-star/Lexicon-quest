// Episode 6, "The Skybound Isles": the Zephyr Landing cast (plan 2.6) and the Episode 6 lines for the Saffron Haven,
// Valewyn, Emberpeak, Hollowmere and Willowmere residents. register() adds the records to NPCS, the scene speakers to
// SPEAKER_NAMES, and prepends the returning-cast lines through prependTalk (the npcs.js seam). Idempotent. Part of the
// lazy `ep6` pack (the ep5 pack, and so the ep4 pack, is always up before this one).
//
// Record shape is src/data/npcs.js's. Stages: zephyr_arrived, charts_seen, obs_f2_done, isles_restored, ep6_complete.
// No portrait aliases: Aeris and the town speak without portraits (plan 9.5).
//
// THE NAME. The lost apprentice is the voice apprentice_v ("The Signal Apprentice") until fifth_voice, then pippa_t
// ("Pippa") and the record `pippa`, shown from pippa_home. No line here says her name before pippa_found.
//
// AWAY. Aeris flies with the party from aeris_came until the library (she is aeris_t on the spire, the Eyrie and the
// library), so her record stands down for that window with the ep4 pack's compound flag (`all:a,!b`,
// src/data/ep4/field/seams.js). On ep6_zephyr the scenes move the record itself (spawn by its own id), never a twin.
//
// BENNET keeps two posts (plan 2.6): the docks in town (`bennet`, the witness) and the winch stall at the top of the
// Airstair (`bennet_winch`, shop winch, the same man; Ledger-excluded as "see bennet").
//
// Never hide an old scene. A returning-cast entry is put in front of the NPC's list, so for every scene entry already in
// that list it is split into variants that cannot match while the scene entry would (guardAgainst, the Episode 4 helper).

import * as NPCMOD from '../npcs.js';
import { guardAgainst } from '../ep4/npcs.js';

const { NPCS, SPEAKER_NAMES } = NPCMOD;

const ARR = 'zephyr_arrived';
const CHARTS = 'charts_seen';
const F2 = 'obs_f2_done';
const RES = 'isles_restored';
const END = 'ep6_complete';
const E6 = 'ep6_started';
const LETTERS = ['letter_1_found', 'letter_2_found', 'letter_3_found'];
/** Aeris's away window (see the header). */
export const AERIS_AWAY = 'all:aeris_came,!library_reached';

const b = (text) => ({ who: 'bram', text });

export const EP6_NPCS = {
  aeris: {
    name: 'Aeris', sprite: 'npc_aeris', map: 'ep6_zephyr', spot: 'On a cargo net by the Kestrel at the north dock (mark aeris_net)',
    move: 'stand', show: { ifNot: AERIS_AWAY },
    about: 'Captain Aeris of the Kestrel, fifties, aviator coat, goggles in grey-streaked hair, the Sky Compass. The guest; never fights.',
    talk: [
      { if: ARR, ifNot: 'met_aeris', scene: 'meet_aeris' },
      { if: END, lines: [
        "The Kestrel flies the long way now. It's slower. Everybody gets off at the end.",
        "The compass still points north. I haven't asked it to stop.",
      ] },
      { if: RES, lines: ['I read the names at dawn. I am going to read them every dawn for a while.'] },
      { if: 'windward_pass', lines: ["The causeway's past the east gate. I'll be here. For now."] },
      { if: 'anchor_learned', lines: ['The east airstair. Come and find me at the gate.'] },
      { if: CHARTS, lines: ["Go and stand on the east dock a minute. The wind off the storm hits hardest there."] },
      { if: 'met_aeris', lines: ['Chart room, in the beacon tower. Go on in.'] },
      { lines: ['The needle spins. It has spun for a month.'] },
    ],
  },
  liora: {
    name: 'Liora', sprite: 'npc_liora', map: 'ep6_zephyr', spot: 'At dock four, letter in hand (mark liora_spot)', move: 'turn',
    about: 'Liora the Wind Navigator, thirties, a sash of knotted cords. Meets every arrival at dock four. Witness.',
    talk: [
      { if: ARR, ifNot: 'liora_met', scene: 'liora_dock' },
      { if: ['beacon_started', 'liora_met'], ifNot: 'testimony_liora', scene: 'testimony_liora' },
      { if: END, lines: [
        'Pippa sleeps at the signal tower. I walk her there and walk back. Some habits are worth keeping.',
        'I still meet the arrivals. Now they get off.',
      ] },
      { if: 'pippa_home', lines: ['She came down the gangway like she was only late for supper.'] },
      { if: CHARTS, lines: ['Mira has my letter. Good. Somebody should hold it who can still see the name.'] },
      { if: 'liora_met', lines: ["The next arrival is at noon. The board says. I'll be here."] },
      { lines: ['I meet every arrival.'] },
    ],
  },
  bennet: {
    name: 'Bennet', sprite: 'npc_bennet', map: 'ep6_zephyr', spot: 'Coiling line on the docks under the board (mark bennet_spot)',
    move: 'turn',
    about: 'Bennet the Rigging Master, sixties, grey, rope-burned hands. Keeps the rigging and the winch. Witness.',
    talk: [
      { if: 'beacon_started', ifNot: 'testimony_bennet', scene: 'testimony_bennet' },
      { if: END, lines: ['Every ship out this morning came back and landed. I counted. I had to sit down.'] },
      { if: RES, lines: ['The word RETURN is back on every flight plan. Somebody wrote it in by hand. Big letters.'] },
      { if: F2, lines: ['I watch the cloudbanks for storms with no horizon. That one has none. Mind yourselves up there.'] },
      { if: ARR, lines: [
        'Clouds underfoot make even old sailors nervous at first.',
        'Ships go out on the written course and come back without landing. I coil the line anyway.',
      ] },
      { lines: ['The board says ARRIVED. It says that a lot.'] },
    ],
  },
  bennet_winch: {
    name: 'Bennet', sprite: 'npc_bennet', map: 'ep6_airstair', spot: 'At the winch stall on top of the stack (mark bennet_winch)',
    move: 'turn', service: { type: 'shop', id: 'winch' },
    about: 'Bennet again, at his winch on top of the Airstair (shop winch, peddler prices). Ledger: see bennet.',
    talk: [
      { if: END, lines: ['Goods up, people walk, and everybody comes home. Busy winch.'] },
      { lines: [
        'Goods go up on the winch. People walk. The rope is for cargo.',
        'Supplies, if you need them. Winch prices. The view is free.',
      ] },
    ],
  },
  suri: {
    name: 'Suri', sprite: 'npc_suri', map: 'ep6_zl_charts', spot: 'At the chart racks (mark suri_spot)', move: 'turn',
    about: 'Suri the Sky Cartographer, twenties, ink to the wrists, dividers in her braid. Gives the Beacon. Witness.',
    talk: [
      { if: CHARTS, ifNot: 'beacon_started', scene: 'beacon_start' },
      { if: END, lines: ['I redrew every chart this week. In my own hand. They point the right way. I checked twice.'] },
      { if: 'beacon_lit', lines: ['The beacon burns. Every chart in this room bent toward it overnight. In a good way.'] },
      { if: 'beacon_started', lines: ['Liora at dock four. Bennet on the docks. Then the brass ring on the tower roof.'] },
      { lines: ['I drew every chart in this room. I would like to know who has been redrawing them.'] },
    ],
  },
  ilex: {
    name: 'Ilex', sprite: 'npc_ilex', map: 'ep6_zl_workshop', spot: 'At the brass forge (mark forge)', move: 'turn',
    service: { type: 'shop', id: 'galewing' },
    about: 'Ilex the Windwright, keeps the Galewing Workshop. Met on the Airstair mending a joint. Tier 12 after obs_f2_done.',
    talk: [
      { if: END, lines: ['Every joint in the town sings now. I mend them anyway. It is a pleasure to mend a singing joint.'] },
      { if: F2, lines: ["New steel, Galewing-forged, for whatever is on top of that spire. I checked every pin twice."] },
      { lines: [
        'The rigging hums today. There is a change brewing above the islands.',
        'I mend skybridge joints and check every brass pin twice.',
      ] },
    ],
  },
  nova: {
    name: 'Nova', sprite: 'npc_nova', map: 'ep6_zl_shop', spot: 'Behind the counter of Aeris Flight Provisions (mark counter)',
    move: 'turn', service: { type: 'shop', id: 'aeris_provisions' },
    about: 'Nova the Deckhand, keeps Aeris Flight Provisions. Cheerful, practical, always checking a net.',
    talk: [
      { if: END, lines: ['Ballast Stones are selling to people who just like holding something heavy. I understand them.'] },
      { if: ARR, lines: [
        'Clouds underfoot make even old sailors nervous at first.',
        'I check the cargo nets when the afternoon winds build. Ballast Stones, if you want to stand still in a gust.',
      ] },
      { lines: ['Aeris Flight Provisions. Everything for the long way round.'] },
    ],
  },
  piri: {
    name: 'Piri', sprite: 'npc_piri', map: 'ep6_zephyr', spot: 'At the post rack by the board (mark piri_spot)', move: 'turn',
    about: "Piri the Messenger. Runs the post rack and the silver-ribboned birds. Piri's Dead Letters.",
    talk: [
      { if: ARR, ifNot: 'letters_started', scene: 'letters_start' },
      { if: LETTERS, ifNot: 'letters_done', scene: 'letters_done' },
      { if: END, lines: ['The birds fly true again. One of them keeps landing on your window. It likes you.'] },
      { if: 'letters_done', lines: ['Keep that old letter dry. Willowmere is a long way down.'] },
      { if: 'letters_started', lines: ['One on the Airstair, by a post. Two on the Observatory causeways. Bring them back.'] },
      { lines: [
        'Letters arrive here tied to birds with silver ribbons.',
        'I sort the letters at the landing before the ships depart.',
      ] },
    ],
  },
  thea: {
    name: 'Thea', sprite: 'npc_thea', map: 'ep6_zephyr', spot: 'In the cloud gardens, south-west (mark gardens)', move: 'wander',
    about: 'Thea the Cloud Gardener. Tends the floating gardens. Says why the chimes were tied.',
    talk: [
      { if: END, lines: ['The chimes ring all night now. The flowers lean toward them. I did not know they could.'] },
      { if: RES, lines: ['Somebody cut the threads off the chimes at dawn. Every one. I think it was the wind.'] },
      { if: ARR, lines: [
        'Flowers float where the rain catches beneath the wind rails.',
        'The wind chimes are quiet whenever the navigation glyphs fade. This month, somebody tied them.',
      ] },
      { lines: ['Flowers float where the rain catches beneath the wind rails.'] },
    ],
  },
  ep6_innkeeper: {
    name: 'The Cloudhouse Host', sprite: 'npc_cloud_host', map: 'ep6_zl_inn', spot: 'Behind the Cloudhouse counter (mark counter)',
    move: 'stand', service: { type: 'inn', price: 120 },
    about: 'Keeps the Cloudhouse Inn (canon inn). Not a Ledger name (a shop counter).',
    talk: [
      { if: RES, lines: ['Every hammock full and the chimes going all night. One hundred and twenty gold. Earplugs free.'] },
      { lines: ['The Cloudhouse Inn. A hammock over the clouds, one hundred and twenty gold. Soft landings.'] },
    ],
  },
  pippa: {
    name: 'Pippa', sprite: 'npc_pippa', map: 'ep6_zephyr', spot: 'At the signal tower by the beacon (mark pippa_tower)', move: 'turn',
    show: { if: 'pippa_home' },
    about: 'Pippa Voss, the signal apprentice, about twenty. Struck from every manifest; home at dock four in isles_return.',
    talk: [
      { if: END, lines: [
        'I tend the signal lights now. Every ship is answering them.',
        'I say my name out loud every morning. Just to check. It is still there.',
      ] },
      { lines: ['Please remember that we came back for each other.'] },
    ],
  },
};

/** Scene speakers that are not NPC records (map actors, memory voices, scene spawns). */
export const EP6_SPEAKERS = {
  scribe: 'The Scribe', scribe_v: 'The Scribe', apprentice_v: 'The Signal Apprentice', pippa_t: 'Pippa',
  aeris_m: 'Aeris', aeris_t: 'Aeris', deckhand_m: 'A Deckhand', liora_t: 'Liora', ilex_t: 'Ilex',
};

// ------------------------------------------------------------------------------------------------
// The returning cast: one Episode 6 line at the start (ep6_started) and one after (ep6_complete); the Saffron farewells
// (EPISODE6 scene 2) are the start lines of Sel, Laleh, Kamal and Yara. Holt's two lines are the bible's.
// ------------------------------------------------------------------------------------------------
export const EP6_TALK_PREPEND = {
  // Saffron Haven
  sel: [
    { if: END, lines: ['A grey bird brought me a letter from the sky. It says you held on. I read it walking.'] },
    { if: E6, lines: ["I'm staying. Twenty years of walking to catch up on, and all of it's down here."] },
  ],
  laleh: [
    { if: END, lines: ['The reading has turned north. A white road, climbing. I check it every night, and it stays.'] },
    { if: E6, lines: ['The reading still says a road. I check every night.'] },
  ],
  kamal: [
    { if: END, lines: ['The water shows a road going north tonight, and a long way up it. I will wait, slowly.'] },
    { if: E6, lines: ["The water's still. That's the best thing water can be."] },
  ],
  yara: [
    { if: END, lines: ["I run the stacks and back twice a week now. The skyport's busy. Somebody fixed their board."] },
    { if: 'ep6_boarded', lines: ["The stack's a night north-west. I'll run you whenever you like."] },
    { if: E6, lines: ["Water stairs. I'll have her ready."] },
  ],
  nasrin: [
    { if: END, lines: ['I read a sky letter aloud in the square tonight. About islands. Nobody believed it. I did.'] },
    { if: E6, lines: ['Islands in the sky, the charts say. I have read stranger things aloud. Not many.'] },
  ],
  hassan: [
    { if: END, lines: ['A skyport ordered wind chimes. Brass, tuned high. I have never been so happy to make a bell.'] },
    { if: E6, lines: ['Up into the sky? Take a bell. It is very hard to lose a ship that rings.'] },
  ],
  // Valewyn
  lyra_n: [
    { if: END, lines: ['A grey bird with a silver ribbon flew in through the palace window. It had your name on it. I kept it.'] },
    { if: E6, lines: ['Islands in the sky. Write, and tell me the gates up there stay open.'] },
  ],
  hale: [
    { if: END, lines: ['A bird landed on my bow and stayed a whole crossing. Silver ribbon. I let it ride free.'] },
    { if: E6, lines: ['An airship. A ferry with no water under it. I want nothing to do with it. Tell me everything.'] },
  ],
  ada: [
    { if: END, lines: ["Letters by bird now, from the sky. They come in dry and smelling of rain. I don't understand it."] },
    { if: E6, lines: ["If anything comes down from the sky addressed to you, I'll carry it."] },
  ],
  joss: [
    { if: END, lines: ["Wind in the lock this week, from the north. Cold. I oiled it anyway. Open, shut, open."] },
    { if: E6, lines: ['Up a chain? Mind your grip.', b('I always mind my grip.'), 'Mind it anyway.'] },
  ],
  // Emberpeak
  garrick_n: [
    { if: END, lines: ["Bram writes that he held on to someone over nothing. He didn't think, he says. That is the best kind."] },
    { if: E6, lines: ['A chain into the sky, Bram writes. Tell him iron holds. Tell him to hold the iron.'] },
  ],
  rusk: [
    { if: END, lines: ['Wind from the north this week, cold off a white road. The watch post rattles. Taro loves it.'] },
    { if: E6, lines: ['Wind from the west, and high. Grit in the rope. Hold on to something.'] },
  ],
  bess: [
    { if: END, lines: ['Bram sent a recipe from a sky town. It has clouds in it. I do not know how. I am trying.'] },
    { if: E6, lines: ["A sixth stew for the road. Light. You'll be climbing."] },
  ],
  taro: [
    { if: END, lines: ['Mira wrote me about wind that runs like a river. I drew it. Then I drew it going round.'] },
    { if: E6, lines: ['Wind that carries you? It is only air going somewhere. Tell Mira. Fast air.'] },
  ],
  ilya: [
    { if: END, lines: ["A skyport wanted chimes tuned high, they say. Somebody up there is ringing Mara's tuning."] },
    { if: E6, lines: ['Chimes in the sky, the carters say. Tied silent. I would like to hear them untied.'] },
  ],
  sella: [
    { if: END, lines: ['Brass pins from the sky. Checked twice, the note says. I checked them a third time. Perfect.'] },
    { if: E6, lines: ['Bring me sky brass. I want to see if it rings like ours.'] },
  ],
  veyra: [
    { if: END, lines: ['The skyport ordered iron for a new board. In a hand I could read. Another one for the wall.'] },
    { if: E6, lines: ['A town hung off a chain? Somebody forged that chain. Find out who, and send them to me.'] },
  ],
  harl: [
    { if: END, lines: ['The wind comes from the north now, and it smells of snow. I wrote that down twice.'] },
    { if: E6, lines: ['High winds out west, my readings say. Very high. Hold on to your hats.'] },
  ],
  // Hollowmere
  wren: [
    { if: END, lines: ['A grey bird brought a bundle of thank-you notes from the sky. Dry. On the shelf. In front.'] },
    { if: E6, lines: ['A letter came through for you from somewhere very high. The ink had frost on it.'] },
  ],
  elian: [
    { if: END, lines: ['A girl was written off every list and came home anyway, the letters say. We know about that here.'] },
    { if: E6, lines: ['A town in the sky with a board that lies. We know a little about lying signs.'] },
  ],
  anwen: [
    { if: END, lines: ['A whole fleet came home by the long way. I lit a candle. The long way is the brave one.'] },
    { if: E6, lines: ['The fountain shows clouds this week, and an island in them. As if it is thinking of up.'] },
  ],
  tovin: [
    { if: END, lines: ['Ships in the sky that land where they say they will, they say. I rowed out to look up. Nothing. Still.'] },
    { if: E6, lines: ['An airship. A boat that does not know when to stop going up.'] },
  ],
  vessa: [
    { if: END, lines: ['Mira sent me stormglass from the sky. It is clearer than anything I make. I am furious.'] },
    { if: E6, lines: ['Glass that floats on cloud, they say. Bring me a piece. A small piece. A big small piece.'] },
  ],
  // Willowmere
  holt: [
    { if: END, lines: ["Letter from Bram. Says he held on to somebody. Says he didn't think. That's my boy."] },
    { if: E6, lines: ["Bram's letter says he's going up a chain to an island in the sky. I've read it four times. It still says that."] },
  ],
  pip: [
    { if: END, lines: ['A bird from the sky landed on the bell tower. I counted its feathers. One was silver.'] },
    { if: E6, lines: ['Islands in the sky! I count bells. They count chimes. We should write.'] },
  ],
  hob: [
    { if: END, lines: ['Wind off the north this week. Cold. The carters say there is a white road up there. I say mind it.'] },
    { if: E6, lines: ['A traveler said the sky has a port in it. I sold him a sandwich. He looked like he needed one.'] },
  ],
  hazel: [
    { if: END, lines: ['A grey bird brought a letter in your hand, {hero}. It says you read your first page. Come home and tell me.'] },
    { if: E6, lines: ['Up a chain into the sky, Bram writes. Hold on tight, {hero}. Keep writing.'] },
  ],
};

// ------------------------------------------------------------------------------------------------
const MAX_VARIANTS = 32;
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
  for (const [id, rec] of Object.entries(EP6_NPCS)) if (!NPCS[id]) NPCS[id] = rec;
  for (const [id, name] of Object.entries(EP6_SPEAKERS)) if (!SPEAKER_NAMES[id]) SPEAKER_NAMES[id] = name;
  for (const [id, entries] of Object.entries(EP6_TALK_PREPEND)) {
    if (!NPCS[id]) continue;
    const list = guardedFor(id, entries);
    if (list && list.length) NPCMOD.prependTalk(id, list);
  }
}

export default register;
