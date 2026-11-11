// Cross-references across the world (issue #100, docs/WORLD_MAP_PLAN.md wave 5 and section 3): errands that send the party back
// to an earlier town with something from a later one, Penny's travelling cart, and the earlier towns' shop restocks.
// Part of the lazy `ep4` pack (every file under src/data/ep4/ is), so nothing here is in the first download. The ep5 and ep6
// packs call register() again from their own errands.js (a re-export): each call adds what has become possible (an NPC,
// item or shop that only a later pack registers) and puts the errand talk back in front. Idempotent.
//
// Nothing is written to a save but the errand flags (xr_*) in the open flag map, and every rule reads flags a save already has:
// an errand opens once the episode of its source town is complete, so an old save of any episode sees exactly what it has
// unlocked and a mid-episode save never sees a later errand. SAVE_VERSION does not move.
//
// The map hook (wave 2 and 3): errandsFor(game, placeId), errandLedger(game) and merchantAt(game) are pure and exported here,
// and also installed as globalThis.LQ_ERRANDS once the pack registers (docs/WORLD_MAP_PLAN.md section 12).

import { NPCS } from '../npcs.js';
import { ITEMS, KEY_ITEMS } from '../items.js';
import { SHOPS } from '../shops.js';
import { FLAGS, FLAG_IDS, ALL_SIDE_QUESTS } from '../quests.js';
import { registerStory } from '../../game/story.js';

const m = (text) => ({ who: 'mira', text });
const b = (text) => ({ who: 'bram', text });
const n = (text) => ({ who: null, text });

// ------------------------------------------------------------------------------------------------ the errands
// giver: the earlier person (npc id, world map place id, field maps). source: the later person who hands the item over.
// unlock: the flag that opens the errand (the source episode's completion: the source never has a story scene left then).
// label: the map plate (at most 26 characters), one per state. Lines: a string is said by the scene's NPC.
export const ERRANDS = [
  {
    id: 'nella_rope', title: 'A Rope That Sings', unlock: 'ep4_complete',
    giver: { npc: 'nella', place: 'willowmere', maps: ['willowmere'] },
    source: { npc: 'hale', place: 'flood_road', maps: ['ep4_flood_road'] },
    item: { id: 'flood_rope', name: 'Flood Rope', icon: 'key', desc: "Hale's oldest mooring line. It hums when the water climbs." },
    reward: { gold: 400, items: [['hi_potion', 2]] },
    label: { open: '! Nella wants a rope', fetch: '? A rope for Nella', deliver: '! Bring Nella the rope' },
    ask: [
      'A ferryman works the floods downriver, they say. A captain. Shouts across water.',
      'Ask him for an old rope. I want to hear what a flood sounds like on a line.',
    ],
    give: [
      'A rope for the Willowmere ferry? Take this one. Thirty floods on it.',
      'Tell her it hums when the water climbs. Tell her to listen.',
    ],
    deliver: [
      n('Nella runs the rope through her hands, slowly, end to end.'),
      'Listen to that. It hums. Low, like somebody humming in a cellar.',
      b("That's a good rope."),
      "It goes on the north post, where the bell was. Here. For the walk.",
    ],
    journal: {
      fetch: 'Nella wants an old rope from the ferryman on the Flood Road, Captain Hale.',
      deliver: 'You have Hale\'s Flood Rope. Take it to Nella at the Willowmere ferry landing.',
      done: 'The Flood Rope hums on the north post of the Willowmere ferry.',
    },
    chat: {
      fetch: [m('Captain Hale, at his landing on the Flood Road. Nella wants one of his old ropes.')],
      deliver: [b("Nella's rope. Willowmere, the ferry landing by the inn.")],
    },
  },
  {
    id: 'tovin_shell', title: 'What the Sea Looks Like', unlock: 'ep5_complete',
    giver: { npc: 'tovin', place: 'hollowmere', maps: ['nameless_hollow'] },
    source: { npc: 'yara', place: 'saffron', maps: ['ep5_saffron'] },
    item: { id: 'sea_shell', name: 'Sea Shell', icon: 'key', desc: 'A spiral shell from the water stairs. Hold it to an ear: the sea.' },
    reward: { gold: 600, items: [['hi_ether', 2]] },
    label: { open: '! Tovin asks about the sea', fetch: '? A shell for Tovin', deliver: '! Bring Tovin the shell' },
    ask: [
      'You have seen the sea. Do not tell me about it. Words are no good for water.',
      'Bring me something from it. Something small. I will know what to do.',
    ],
    give: [
      'For a ferryman on a lake? He wants the sea in his pocket. I like him already.',
      'This one. Hold it to your ear. The sea lives in there now.',
    ],
    deliver: [
      n('Tovin holds the shell to his ear for a long time.'),
      'So that is the sea. Loud. It never stops talking.',
      'I like my lake better. I will keep this anyway. Take these. Go on.',
    ],
    journal: {
      fetch: 'Tovin wants something from the sea. Yara, at the water stairs in Saffron Haven, might have it.',
      deliver: 'You have a Sea Shell. Take it to Tovin on his pier in Hollowmere.',
      done: 'Tovin keeps the sea on his pier, in a shell.',
    },
    chat: {
      fetch: [m('Yara, at the water stairs in Saffron Haven. Tovin wants something from the sea.')],
      deliver: [b('The shell for Tovin. His pier, north shore of the mere.')],
    },
  },
  {
    id: 'bess_spice', title: 'Desert Spice', unlock: 'ep5_complete',
    giver: { npc: 'bess', place: 'emberpeak', maps: ['pk_inn'] },
    source: { npc: 'yasmin', place: 'saffron', maps: ['ep5_sh_shop'] },
    item: { id: 'desert_spice', name: 'Desert Spice', icon: 'key', desc: 'A tin of saffron and red caravan pepper. Hot. Hotter.' },
    reward: { gold: 600, items: [['hi_potion', 3]] },
    label: { open: '! Bess wants desert spice', fetch: '? Spice for Bess', deliver: '! Bring Bess the spice' },
    ask: [
      "Three stews, and I've run out of ways to make them hotter.",
      'The desert sells a spice that makes a pot sweat, the carters say. Bring me a tin.',
    ],
    give: [
      'A cook in the ash hills wants our spice? Then she knows what she is doing.',
      'Saffron, and the red pepper the caravans carry. Mind your eyes when you open it.',
    ],
    deliver: [
      n('Bess opens the tin. The whole inn sneezes.'),
      'Oh, that is wicked. That is the fourth stew.',
      'Hot, hotter, safe, and Saffron. Breakfast is on me. Take these for the road.',
    ],
    journal: {
      fetch: "Bess wants desert spice for the Coal Lantern's stews. Yasmin keeps the shop in Saffron Haven.",
      deliver: 'You have a tin of Desert Spice. Take it to Bess at the Coal Lantern Inn in Emberpeak.',
      done: 'The Coal Lantern serves four stews now.',
    },
    chat: {
      fetch: [b("Yasmin's shop in Saffron Haven. Bess wants spice. I want what Bess makes with it.")],
      deliver: [m("Bess's spice. The Coal Lantern, in Emberpeak.")],
    },
  },
  {
    id: 'lyra_reading', title: 'News from the Desert', unlock: 'ep5_complete',
    giver: { npc: 'lyra_n', place: 'valewyn', maps: ['ep4_vw_palace'] },
    source: { npc: 'nasrin', place: 'saffron', maps: ['ep5_saffron'] },
    item: { id: 'road_reading', name: 'The Road Reading', icon: 'letter', desc: "Nasrin's copy of a night's reading. It ends in a road." },
    reward: { gold: 800, items: [['phoenix_feather', 1]] },
    label: { open: '! Lyra wants news', fetch: '? A reading for Lyra', deliver: '! Bring Lyra the reading' },
    ask: [
      'Come back through Valewyn, I said, and you did. Now tell me about the south.',
      'No. Bring me something written there. I trust ink more than travellers.',
    ],
    give: [
      'The Regent of Valewyn wants a reading? Then she gets tonight\'s. It ends in a road.',
      'Every one does now. I copied it in my best hand. Do not fold it.',
    ],
    deliver: [
      'A prophecy that ends in a road. Valewyn could use one of those.',
      'It goes in the palace archive, beside the charter. On the record.',
      'Thank you, {hero}. Take this. I signed for it.',
    ],
    journal: {
      fetch: 'Lyra wants something written in the south. Nasrin reads the nightly reading in Saffron Haven.',
      deliver: 'You have The Road Reading. Take it to Lyra in the palace at Valewyn.',
      done: 'The Road Reading sits in the Valewyn archive, beside the charter.',
    },
    chat: {
      fetch: [m('Nasrin, on her bench in the market court. Lyra wants the reading in writing.')],
      deliver: [b('The reading for Lyra. Valewyn, the palace. Do not fold it.')],
    },
  },
  {
    id: 'laleh_chart', title: 'A Sky from Above', unlock: 'ep6_complete',
    giver: { npc: 'laleh', place: 'saffron', maps: ['ep5_sh_observatory'] },
    source: { npc: 'suri', place: 'zephyr', maps: ['ep6_zl_charts'] },
    item: { id: 'cloud_chart', name: 'Cloud Chart', icon: 'letter', desc: "Suri's chart of the isles' sky, drawn from above the clouds." },
    reward: { gold: 1000, items: [['phoenix_feather', 2]] },
    label: { open: '! Laleh wants a chart', fetch: '? A chart for Laleh', deliver: '! Bring Laleh the chart' },
    ask: [
      'You went above the clouds. Above! The stars must sit differently up there.',
      'Bring me one of their charts. I will trade them a whole night of mine.',
    ],
    give: [
      'A stargazer in the desert wants our sky? Good. Somebody should check it.',
      'Drawn from the tower roof on a clear night. Tell her the north is new.',
    ],
    deliver: [
      'Look at it. Every star in its place, and three I have never seen.',
      m('The new ones are in the north. I checked.'),
      'Ink to the elbows again. I am delighted. Take these, for the road.',
    ],
    journal: {
      fetch: 'Laleh wants a star chart from the isles. Suri keeps the charts room in Zephyr Landing.',
      deliver: 'You have a Cloud Chart. Take it to Laleh at the armillary in Saffron Haven.',
      done: "Laleh's armillary has a sky from above the clouds.",
    },
    chat: {
      fetch: [m('Suri, in the charts room at Zephyr Landing. Laleh wants a sky drawn from above.')],
      deliver: [m("Laleh's chart. The observatory in Saffron Haven, up the tower.")],
    },
  },
  {
    id: 'sella_brass', title: 'Sky Brass', unlock: 'ep6_complete',
    giver: { npc: 'sella', place: 'emberpeak', maps: ['pk_smithy'] },
    source: { npc: 'ilex', place: 'zephyr', maps: ['ep6_zl_workshop'] },
    item: { id: 'sky_brass', name: 'Sky Brass', icon: 'key', desc: 'A bar of brass from the Galewing Workshop. Light, and it rings high.' },
    reward: { gold: 1000, items: [['hi_ether', 2]] },
    label: { open: '! Sella wants sky brass', fetch: '? Brass for Sella', deliver: '! Bring Sella the brass' },
    ask: [
      'You went up to the sky. Did you bring me any brass? No?',
      'Go back and get some. I want to see if it rings like ours.',
    ],
    give: [
      'A smith in Emberpeak? Then she will want the good bar. This one.',
      'Wind-cooled. It rings a fifth higher than ground brass. Tell her that.',
    ],
    deliver: [
      n('Sella taps the bar on the anvil. It rings, high and long.'),
      'A fifth higher. He was right. I hate that he was right.',
      'Here. For the trouble. I checked it twice.',
    ],
    journal: {
      fetch: 'Sella wants brass from the sky. Ilex keeps the Galewing Workshop in Zephyr Landing.',
      deliver: 'You have a bar of Sky Brass. Take it to Sella at the forge in Emberpeak.',
      done: 'Sky brass rings in the Emberpeak forge, a fifth high.',
    },
    chat: {
      fetch: [b('Ilex, at the Galewing Workshop. Sella wants sky brass. She will check it twice.')],
      deliver: [b("Sella's brass. The forge in Emberpeak.")],
    },
  },
  {
    id: 'vessa_glass', title: 'Glass That Floats', unlock: 'ep6_complete',
    giver: { npc: 'vessa', place: 'hollowmere', maps: ['nh_smithy'] },
    source: { npc: 'thea', place: 'zephyr', maps: ['ep6_zephyr'] },
    item: { id: 'cloudglass', name: 'Cloudglass', icon: 'key', desc: 'A pane from the cloud gardens. Set it down and it drifts up a finger.' },
    reward: { gold: 1000, items: [['hi_potion', 3]] },
    label: { open: '! Vessa wants cloudglass', fetch: '? Glass for Vessa', deliver: '! Bring Vessa the glass' },
    ask: [
      'Glass that floats on cloud. You saw it with your own eyes, and you brought me none.',
      'A piece. A small piece. A big small piece.',
    ],
    give: [
      'Cloudglass, for a glassmaker below? Take a pane from the old frames.',
      'Hold it flat. It wants to go up. Everything here does.',
    ],
    deliver: [
      n('Vessa lets go of the pane. It drifts up a finger, and stays.'),
      'Oh. Oh, that is not fair. I am going to make one of these.',
      'Take these. And do not tell Mira she was right.',
    ],
    journal: {
      fetch: 'Vessa wants a piece of floating glass. Thea tends the cloud gardens in Zephyr Landing.',
      deliver: 'You have a pane of Cloudglass. Take it to Vessa at the Silverglass Smithy in Hollowmere.',
      done: 'A pane of cloudglass floats in the Silverglass Smithy.',
    },
    chat: {
      fetch: [m('Thea, in the cloud gardens at Zephyr Landing. Vessa wants floating glass.')],
      deliver: [m("Vessa's glass. The Silverglass Smithy, Hollowmere. Hold it flat.")],
    },
  },
];
export const ERRAND = Object.fromEntries(ERRANDS.map((e) => [e.id, e]));

/** The three flags of an errand: started (asked, or the item came first), got (the item is carried), done (delivered). */
export function errandFlags(e) {
  return { started: `xr_${e.id}_started`, got: `xr_${e.id}_got`, done: `xr_${e.id}_done` };
}

// ------------------------------------------------------------------------------------------------ Penny's travelling cart
// Penny goes where the roads still go (her records penny, penny_e, penny_s): one town behind the party from Episode 4 on,
// selling the road goods of every region she has crossed. Her stock grows by stop; older boots leave when newer ones come.
const ROAD = (item, price, ifFlag, ifNotFlag) => ({ item, price, ...(ifFlag ? { ifFlag } : {}), ...(ifNotFlag ? { ifNotFlag } : {}) });
export const MERCHANT = {
  id: 'penny_t', shop: 'travel_cart',
  stops: [
    { flag: 'ep3_complete', place: 'emberpeak', map: 'emberpeak', x: 27, y: 29, dir: 'up', lines: [
      "Emberpeak! I said I'd see it with the bell ringing, and here I am, with a cart full of sand road.",
      'Downriver there is a city that floods every spring, the carters say. I hear it buys rope.',
    ] },
    { flag: 'ep4_complete', place: 'valewyn', map: 'ep4_valewyn', x: 14, y: 18, dir: 'down', lines: [
      'Valewyn, dry! Well, drier. I sold three umbrellas on the Flood Road and I regret nothing.',
      'A ship came in from the south with sand in its sails. Sand! I know a girl who sells sand.',
    ] },
    { flag: 'ep5_complete', place: 'saffron', map: 'ep5_saffron', x: 13, y: 24, dir: 'down', lines: [
      'Saffron Haven. The caravans leave at dawn now, and I leave with them. I keep a list.',
      'Islands in the sky, the camel men say. I have sold to stranger places. Not many.',
    ] },
    { flag: 'ep6_complete', place: 'zephyr', map: 'ep6_zephyr', x: 19, y: 20, dir: 'down', lines: [
      'Up a chain, with a cart. Do not ask how. Bennet asked. Bennet is still thinking about it.',
      'White mountains, north. The Sky Compass points there. So does my cart. Eventually.',
    ] },
  ],
};
const [S1, S2, S3, S4] = MERCHANT.stops.map((s) => s.flag);
export const TRAVEL_CART = {
  id: 'travel_cart', name: "Penny's Travelling Cart", map: 'emberpeak', keeper: 'penny_t', kind: 'items',
  stock: [
    ROAD('potion', 24), ROAD('hi_potion', 100), ROAD('ether', 70), ROAD('hi_ether', 230), ROAD('antidote', 12),
    ROAD('eye_drops', 14), ROAD('echo_herb', 30), ROAD('phoenix_feather', 170), ROAD('tent', 90), ROAD('silver_salve', 135),
    ROAD('quench_flask', 100, S1), ROAD('lamp_oil', 120, S2), ROAD('hourglass_sand', 150, S3), ROAD('ballast_stone', 160, S4),
    ROAD('cinder_boots', 970, S1, S2), ROAD('wader_boots', 1620, S2, S3), ROAD('sandstrider_boots', 2160, S3, S4),
    ROAD('cloudstep_boots', 1940, S4),
  ],
};

// ------------------------------------------------------------------------------------------------ shop restocks
// "The carts run again" (plan 3.4): when the next region's episode is complete, each town's shops gain the next tier (that
// region's arrival stock), at list price. Willowmere follows Hollowmere: both restock with Episode 3 done, the moment this pack
// first loads. Never newer than what the party could already buy at the frontier, so battle balance and the episode gold
// checks are untouched (qa/worldmap/errands.test.mjs runs them with the restocks in place).
export const RESTOCKS = [
  { shop: 'willowmere_items', ifFlag: 'ep3_complete', items: ['hi_ether', 'silver_salve', 'lantern_charm', 'mirror_charm'] },
  { shop: 'willowmere_smithy', ifFlag: 'ep3_complete', items: ['silverglass_blade', 'moonsteel_axe', 'mere_pike', 'mirror_rod',
    'glasswing_bow', 'silver_mail', 'mirrorweave_robe', 'glass_helm'] },
  { shop: 'hollow_items', ifFlag: 'ep3_complete', items: ['quench_flask', 'coalheart_charm', 'bellchime_charm', 'carter_mantle'] },
  { shop: 'hollow_smithy', ifFlag: 'ep3_complete', items: ['ashsteel_cuirass', 'ashsteel_helm', 'cinder_boots'] },
  { shop: 'ventworks', ifFlag: 'ep4_complete', items: ['lamp_oil', 'waxseal_charm', 'tidemark_charm', 'ferry_mantle'] },
  { shop: 'pk_smithy', ifFlag: 'ep4_complete', items: ['riverguard_plate', 'scribes_robe', 'riverguard_helm', 'oilskin_hood', 'wader_boots'] },
  { shop: 'riverbank', ifFlag: 'ep5_complete', items: ['hourglass_sand', 'shade_charm', 'lodestar_charm', 'dune_mantle'] },
  { shop: 'vw_forge', ifFlag: 'ep5_complete', items: ['dunewalker_mail', 'starweave_robe', 'copper_helm', 'saffron_hood', 'sandstrider_boots'] },
  { shop: 'saffron_supplies', ifFlag: 'ep6_complete', items: ['ballast_stone', 'ballast_charm', 'signal_charm', 'sailcloth_mantle'] },
  { shop: 'copperwind', ifFlag: 'ep6_complete', items: ['skysteel_mail', 'windweave_robe', 'aviator_helm', 'gale_hood', 'cloudstep_boots'] },
];

// ------------------------------------------------------------------------------------------------ reading the flags (pure)
const flagsOf = (game) => (game && game.flags) || game || {};
const has = (flags, f) => !!flags[f];

/** 'locked' | 'open' (unlocked, nobody asked yet) | 'fetch' (asked, item not carried) | 'deliver' | 'done'. Pure. */
export function errandState(game, idOrErrand) {
  const e = typeof idOrErrand === 'string' ? ERRAND[idOrErrand] : idOrErrand;
  if (!e) return 'locked';
  const flags = flagsOf(game), f = errandFlags(e);
  if (has(flags, f.done)) return 'done';
  if (has(flags, f.got)) return 'deliver';
  if (!has(flags, e.unlock)) return 'locked';
  return has(flags, f.started) ? 'fetch' : 'open';
}

/**
 * The errand marks the map shows at one place (world map place or point id, data.js PLACES / layout.js POINTS):
 * [{ id, title, state, mark, label, npc }]. An open errand and one to deliver are marked '!' at the giver's place, one being
 * fetched '?' at the source's. Locked and done errands are not marked. Pure: reads game.flags (or a flag map), writes nothing.
 */
export function errandsFor(game, placeId) {
  const out = [];
  for (const e of ERRANDS) {
    const state = errandState(game, e);
    const at = state === 'fetch' ? e.source : state === 'open' || state === 'deliver' ? e.giver : null;
    if (!at || at.place !== placeId) continue;
    out.push({ id: e.id, title: e.title, state, mark: state === 'fetch' ? '?' : '!', label: e.label[state], npc: at.npc });
  }
  return out;
}

/** Every unlocked errand, done ones included, in list order (the post-game ledger): [{ id, title, state, giver, source }]. Pure. */
export function errandLedger(game) {
  return ERRANDS.map((e) => ({ id: e.id, title: e.title, state: errandState(game, e), giver: e.giver.place, source: e.source.place }))
    .filter((r) => r.state !== 'locked');
}

/** Penny's stop for these flags ({ place, map, x, y, dir, index }) or null before Episode 3 is done. Pure. */
export function merchantAt(game) {
  const flags = flagsOf(game);
  let at = null;
  MERCHANT.stops.forEach((s, index) => { if (has(flags, s.flag)) at = { place: s.place, map: s.map, x: s.x, y: s.y, dir: s.dir, index }; });
  return at;
}

// ------------------------------------------------------------------------------------------------ registration
const portraitOf = (who) => (NPCS[who] && NPCS[who].portrait) || undefined;
const line = (l, npc) => (typeof l === 'string' ? { who: npc, text: l } : l);
async function sayAll(s, lines, npc) {
  for (const l of lines) {
    const { who, text } = line(l, npc);
    const portrait = who === 'mira' || who === 'bram' || who === 'hero' ? who : who ? portraitOf(who) : undefined;
    await s.say(who, text, portrait ? { portrait } : {});
  }
}
const toList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const guarded = (fn, cond) => async (s) => {
  for (const f of toList(cond.if)) if (!(await s.hasFlag(f))) return;
  for (const f of toList(cond.ifNot)) if (await s.hasFlag(f)) return;
  await s.lockInput();
  try { await fn(s); } finally { await s.unlockInput(); }
};

/** Scene ids and guards of one errand. */
export function errandScenes(e) {
  const f = errandFlags(e);
  const ids = { ask: `xr_${e.id}_ask`, give: `xr_${e.id}_give`, deliver: `xr_${e.id}_deliver` };
  const cond = {
    [ids.ask]: { if: e.unlock, ifNot: f.started },
    [ids.give]: { if: e.unlock, ifNot: f.got },
    [ids.deliver]: { if: f.got, ifNot: f.done },
  };
  const raw = {
    [ids.ask]: async (s) => {
      await s.face(e.giver.npc, 'hero');
      await sayAll(s, e.ask, e.giver.npc);
      await s.setFlag(f.started);
    },
    [ids.give]: async (s) => {
      await s.face(e.source.npc, 'hero');
      await sayAll(s, e.give, e.source.npc);
      await s.give(e.item.id, 1);
      await s.setFlag(f.started);
      await s.setFlag(f.got);
    },
    [ids.deliver]: async (s) => {
      await s.face(e.giver.npc, 'hero');
      await sayAll(s, e.deliver, e.giver.npc);
      await s.take(e.item.id, 1);
      if (e.reward.gold) await s.give('gold', e.reward.gold);
      for (const [id, qty] of e.reward.items || []) await s.give(id, qty);
      await s.setFlag(f.done);
    },
  };
  const scenes = Object.fromEntries(Object.entries(raw).map(([id, fn]) => [id, guarded(fn, cond[id])]));
  return { ids, scenes, conditions: cond };
}

/** The journal entry (a side quest) of one errand. */
export function errandQuest(e) {
  const f = errandFlags(e);
  return {
    id: `xr_${e.id}`, title: e.title, giver: e.giver.npc, start: f.started, done: f.done, reward: e.reward.items[0] ? e.reward.items[0][0] : null,
    doneText: e.journal.done, errand: true,
    steps: [
      { id: 'fetch', done: f.got, journal: e.journal.fetch,
        chat: [{ map: e.source.maps, lines: e.chat.fetch }, { lines: e.chat.fetch }] },
      { id: 'deliver', done: f.done, journal: e.journal.deliver,
        chat: [{ map: e.giver.maps, lines: e.chat.deliver }, { lines: e.chat.deliver }] },
    ],
  };
}

/** The talk entries an errand puts on its two NPCs. */
function talkEntries(e) {
  const f = errandFlags(e), sc = errandScenes(e).ids;
  return {
    [e.giver.npc]: [{ if: f.got, ifNot: f.done, scene: sc.deliver, errand: e.id }, { if: e.unlock, ifNot: f.started, scene: sc.ask, errand: e.id }],
    [e.source.npc]: [{ if: e.unlock, ifNot: f.got, scene: sc.give, errand: e.id }],
  };
}
const TALK = new Map();   // npc id -> the entry objects (made once, so re-fronting moves the same objects)
for (const e of ERRANDS) for (const [npc, list] of Object.entries(talkEntries(e))) TALK.set(npc, [...(TALK.get(npc) || []), ...list]);

/**
 * Put an NPC's errand entries in front of its talk list again, after any leading story scene entries (a scene a later pack
 * puts first still wins), so a later pack's flavour lines never shadow an errand. Only this module's own entries move.
 */
export function frontTalk(npcId) {
  const rec = NPCS[npcId], mine = TALK.get(npcId);
  if (!rec || !Array.isArray(rec.talk) || !mine) return false;
  for (let j = rec.talk.length - 1; j >= 0; j--) if (mine.includes(rec.talk[j])) rec.talk.splice(j, 1);   // in place: others hold the array
  let i = 0;
  while (i < rec.talk.length && rec.talk[i] && rec.talk[i].scene) i++;
  rec.talk.splice(i, 0, ...mine);
  return true;
}

export const MERCHANT_NPC = {
  // map: null, she stands on no map module (the map checker counts placed NPCs per map); errands_field.js places her
  name: 'Penny', sprite: 'npc_shopkeeper', map: null, spot: 'Her cart, one town behind the party (errands.js MERCHANT)',
  move: 'stand', service: { type: 'shop', id: 'travel_cart' },
  about: 'Penny the peddler on the move again (issue #100): Emberpeak, Valewyn, Saffron Haven, Zephyr Landing. Same person as penny.',
  talk: MERCHANT.stops.slice().reverse().map((s) => ({ if: s.flag, lines: s.lines })).concat([{ lines: ['Supplies for the road!'] }]),
};

/** Every flag this module sets, with its meaning. */
export function errandFlagTable() {
  const out = {};
  for (const e of ERRANDS) {
    const f = errandFlags(e);
    out[f.started] = `Errand ${e.title}: ${e.giver.npc} asked, or ${e.source.npc} handed the ${e.item.name} over first (src/data/ep4/errands.js).`;
    out[f.got] = `Errand ${e.title}: the party carries the ${e.item.name}.`;
    out[f.done] = `Errand ${e.title}: delivered to ${e.giver.npc}, the reward paid once.`;
  }
  return out;
}

const state = { story: new Set(), quests: false, flags: false, merchant: false, hooked: null };
/** Which restock entries this module added (shop id -> entries), for tests. */
export const ADDED = new Map();

function installRestocks() {
  for (const r of RESTOCKS) {
    const shop = SHOPS[r.shop];
    if (!shop || !Array.isArray(shop.stock)) continue;
    const mine = ADDED.get(r.shop) || [];
    for (const item of r.items) {
      if (!ITEMS[item] || shop.stock.some((s) => s.item === item)) continue;   // not registered yet, or already sold here
      const entry = { item, ifFlag: r.ifFlag, restock: true };
      shop.stock.push(entry);
      mine.push(entry);
    }
    ADDED.set(r.shop, mine);
  }
}

function installMerchant() {
  if (!SHOPS.travel_cart) SHOPS.travel_cart = { ...TRAVEL_CART, stock: [] };
  const cart = SHOPS.travel_cart;
  for (const s of TRAVEL_CART.stock) if (ITEMS[s.item] && !cart.stock.includes(s)) cart.stock.push(s);
  if (!NPCS.penny_t) NPCS.penny_t = MERCHANT_NPC;
  // her sand road record steps aside once she has moved on (as penny_e does at sand_gate_open)
  if (NPCS.penny_s && !NPCS.penny_s.show) NPCS.penny_s.show = { ifNot: S1 };
}

/**
 * Register what the loaded packs make possible: flags, the errand items, scenes, journal entries, talk (in front again),
 * the restocks, Penny and her cart, the field hook (with an engine) and globalThis.LQ_ERRANDS. Idempotent; safe in Node.
 */
export async function register(engine) {
  if (!state.flags) {
    Object.assign(FLAGS, errandFlagTable());
    for (const id of Object.keys(errandFlagTable())) if (!FLAG_IDS.includes(id)) FLAG_IDS.push(id);
    state.flags = true;
  }
  for (const e of ERRANDS) {
    if (!ITEMS[e.item.id]) {
      const it = { id: e.item.id, name: e.item.name, icon: e.item.icon, key: true, desc: e.item.desc };
      KEY_ITEMS[e.item.id] = it;
      ITEMS[e.item.id] = { ...it, kind: 'key' };
    }
    if (!state.story.has(e.id)) {
      const { scenes, conditions } = errandScenes(e);
      registerStory({ scenes, lines: {}, conditions });
      state.story.add(e.id);
    }
  }
  if (!state.quests) {
    for (const e of ERRANDS) { const q = errandQuest(e); if (!ALL_SIDE_QUESTS.some((x) => x.id === q.id)) ALL_SIDE_QUESTS.push(q); }
    state.quests = true;
  }
  for (const npc of TALK.keys()) frontTalk(npc);
  installRestocks();
  installMerchant();
  if (typeof globalThis !== 'undefined') globalThis.LQ_ERRANDS = { errandsFor, errandLedger, errandState, merchantAt, ERRANDS };
  if (engine && typeof engine.on === 'function' && state.hooked !== engine) {
    state.hooked = engine;
    const { attach } = await import('./errands_field.js');
    engine.on('scene', (s) => { if (s && s.name === 'field') attach(s); });
    for (const s of engine.stack || []) if (s && s.name === 'field') attach(s);
  }
  return { errands: ERRANDS.length, talk: [...TALK.keys()].filter((k) => NPCS[k]) };
}

export default register;
