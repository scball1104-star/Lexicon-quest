// Episode 4, "The Sunken Keep": banners, inspect lines, books, barks, bestiary, the credits and the end cards. register()
// assigns them into BANNERS, BOOKS, BARKS, BESTIARY and (through registerStory) the shared LINES table. Idempotent. Pure
// data. Part of the lazy `ep4` pack.
//
// Box rules (qa/content/ep4_*.test.mjs): at most 3 lines of 42 characters per box with an 8-letter hero name, ASCII, no
// em dashes, {hero} for the player's name. Until `lyra_named` nothing here says the Regent's name.

import { BANNERS, BOOKS, BARKS, BESTIARY } from '../text.js';
import * as STORY from '../../game/story.js';

const m = (text) => ({ who: 'mira', text });
const b = (text) => ({ who: 'bram', text });

// ------------------------------------------------------------------------------------------------
// Banners (plan 2.1): 10 maps, Valewyn's with a second state.
// ------------------------------------------------------------------------------------------------
export const EP4_BANNERS = {
  ep4_flood_road: { title: 'The Flood Road', sub: 'Down to Valewyn' },
  ep4_valewyn: { title: 'Valewyn', sub: 'The Drowned Crown Plaza',
    states: [{ if: 'vw_restored', title: 'Valewyn', sub: 'The Crown Remembers' }] },
  ep4_vw_inn: { title: 'The Floodwatch Inn' },
  ep4_vw_shop: { title: 'Riverbank Provisioner' },
  ep4_vw_forge: { title: 'Crown Guard Forge' },
  ep4_vw_palace: { title: "The Regent's Hall" },
  ep4_keep_f1: { title: 'The Sunken Keep', sub: 'I. Tidegate Causeway' },
  ep4_keep_f2: { title: 'The Sunken Keep', sub: 'II. Archives Below Water' },
  ep4_keep_f3: { title: 'The Sunken Keep', sub: 'III. The Court of Witnesses' },
  ep4_keep_crown: { title: 'The Drowned Throne' },
};

// ------------------------------------------------------------------------------------------------
// Inspect lines (plan 4; signs and objects point at these ids). A string, a list of boxes, or a conditional list
// [{ if, ifNot, lines }] whose last entry is the fallback. Nothing names the Regent before lyra_named.
// ------------------------------------------------------------------------------------------------
export const EP4_LINES = {
  // emberpeak (the ep4 patch): the sign keeps its Episode 3 states underneath its new ones
  east_road_sign_ep4: [
    { if: 'east_road_open', lines: ['The east road. Flooded past the ridge.', 'A rope ladder hangs down the washout. Under the sign, in chalk: RUSK WAS HERE. MIND YOUR BOOTS.'] },
    { if: 'ep4_started', lines: ['The east road. Flooded past the ridge.', 'Somebody has hung a coil of rope on the post. It is waiting for a reason.'] },
    { if: 'pk_restored', lines: ['The east road. Flooded past the ridge.', 'Someone has scratched a bell and an arrow under it.'] },
    { lines: 'The east road. Flooded past the ridge.' },
  ],
  ep4_rope_ladder: "Rusk's rope ladder, lashed to an iron stake. It goes down the washout into rain.",

  // ep4_flood_road
  ep4_broken_cart: 'A cart on its side, one wheel in the ditch. Its load was barrels. The barrels have gone downstream.',
  ep4_farm_roof: 'A farmhouse roof standing out of the water. A cat on the ridge looks at you as if this is your fault.',
  ep4_valewyn_far: 'Valewyn, far below: canals, white walks, a statue, and the Keep, half under water to its belfry.',
  ep4_ferry_post: [
    { if: 'saw_valewyn', lines: "Hale's ferry, tied to its post. The rope is new. The post is older than Hale." },
    { lines: "A ferry tied to a post. Its pole lies across the seats. Somebody takes good care of it." },
  ],
  ep4_lane_sign: 'A farm sign, half under water: KEEP THE LOCK SHUT IN FLOOD. Under it, in pencil: BY ORDER.',

  // the tide kit (the road, the town and the Keep share these)
  ep4_tide_post: 'A tide post, striped at three heights. The water stands where it stands. The post only tells you.',
  ep4_lock_wheel: 'A lock wheel on a stone stand, iron and heavy. Three marks on its rim: low, middle, high.',
  ep4_farm_wheel: 'A farm lock wheel, rusted but sound. It turns by hand. Somebody greased it, not long ago.',
  ep4_pontoon: 'A pontoon on a chain. When the water comes up, it comes up with it. It does not argue.',
  ep4_book_crate: 'A crate of books, tarred shut and moored to the shelf. It floats. The books inside are dry.',
  ep4_papered_door: ['A door papered over with a notice: CLOSED BY DECREE.', 'The seal is bright red and bone dry. It has never been rained on.'],
  ep4_washed_door: 'A door with nail holes where a notice was. A faint red stain in the grain, like a blush.',
  ep4_floodgate: [
    { if: 'tidegate_open', lines: 'The Eastern Tidegate stands open, its counterweight float up and chained. It stays.' },
    { lines: 'A floodgate with a float on a chain. The float sits on dry stone. It wants water under it.' },
  ],
  ep4_font_tide: 'A Keeper font, fed from somewhere above the water. It tastes of rain and clears your head.',
  ep4_lantern_chain: 'A lantern on a long chain. The flame is low and steady. Someone keeps it filled.',
  ep4_keeper_marks: 'Green marks at three heights on the wall. Keeper tide lines. The water has never moved them.',

  // ep4_valewyn
  ep4_statue: [
    { if: 'vw_restored', lines: 'The coronation statue. The face is still blank. Someone has left a wreath of reeds at its feet.' },
    { lines: 'The coronation statue: a crown, robes, a scepter, and no face. The stone of the face is smooth.' },
  ],
  ep4_inscription: 'A crown without a name is a shadow. The law is meant to shelter the people, not to drown them in ink.',
  ep4_flood_board: [
    { if: 'vw_restored', lines: ['The flood board. The notices have dried. The orders with the red seal are blank paper.', 'Someone has pinned up a new one in plain ink: GATES OPEN. ASK FOR LYRA.'] },
    { if: 'vw_arrived', lines: ['The flood board. Every notice runs in grey streaks except one, crisp and dry, with a red seal.', 'GATES TO REMAIN SHUT. BY ORDER OF THE REGENT. The hand is nobody\'s.'] },
    { lines: 'A board of flood notices. The rain has got into all of them.' },
  ],
  ep4_sandbags: 'Sandbags, three high. Someone has written names on them in tar, so they come back.',
  ep4_great_lock: [
    { if: 'vw_restored', lines: 'The great lock stands open. Its wheel has been turned, and greased, and turned again.' },
    { lines: "The city's great lock wheel, as tall as a door. Its pointer sits at SHUT. It has not moved in a long time." },
  ],
  ep4_drowned_roofs: [
    { if: 'vw_restored', lines: 'The river quarter, wet but dry. Doors stand open to let the damp out. Someone is sweeping a step.' },
    { lines: 'The river quarter. Roofs stand out of the water like stepping stones. A curtain moves in one window.' },
  ],
  ep4_canal: 'A canal, green and slow. Rain dimples the water. Something small with whiskers watches you from a step.',
  ep4_drowned_bell: [
    { if: 'tide_bell_rung', lines: "The Keep's bell tower, out over the water. The bell hangs a hand above the tide now, green and quiet." },
    { lines: "Out over the water, the Keep's bell tower, drowned to the belfry. Now and then the water around it hums." },
  ],
  ep4_council_switches: [
    { if: 'witnesses_done', lines: 'Two council switches. One is thrown. The canals under the plaza run the way they were told.' },
    { lines: 'Two iron switches by the plaza canal, painted SHELTER and RECORDS. Both rusted down.' },
  ],
  sign_ep4_inn: 'THE FLOODWATCH INN. DRY BEDS. MOSTLY.',
  sign_ep4_shop: 'RIVERBANK PROVISIONER. ROPE, WAX, LAMP OIL AND BOOTS THAT DO NOT LEAK.',
  sign_ep4_forge: 'CROWN GUARD FORGE. ARMS FOR THE WATCH. KNOCK, THE ANVIL IS LOUD.',
  sign_ep4_palace: [
    { if: 'lyra_named', lines: "THE REGENT'S HALL. Under it, in fresh paint: LYRA, REGENT OF VALEWYN." },
    { lines: "THE REGENT'S HALL. There is a space under the words where a name was painted. The paint is gone." },
  ],

  // ep4_vw_palace
  ep4_decree_table: [
    { if: 'lyra_named', lines: 'A long table of decrees. The forged ones are blank. On top, in fresh ink: OPEN. It has not run.' },
    { lines: 'A long table of decrees. Every one she wrote has run. Every one she did not write is dry.' },
  ],
  ep4_archive_shelf: "The royal archive shelf. Charters in boxes, every box labeled in the same careful hand. One box is empty.",

  // ep4_keep_f2
  ep4_glass_dome: 'An old glass dome over a dry room. The water stops at its rim as if it had been asked to.',
  ep4_vex_feather: 'A black feather on the reading table. It is dry. It is the driest thing for a mile.',
  ep4_scriptorium: 'A drowned scriptorium. Desks under water, pens still in their wells. One desk has two inkpots.',
  ep4_court_bench: [
    { if: 'barrister_defeated', lines: 'The advocate\'s bench. Wet paper lies in drifts across it. None of it says anything now.' },
    { lines: "An advocate's bench, stacked with sealed papers. Every paper is an argument. They all agree." },
  ],

  // ep4_keep_f3
  ep4_principles: ['Carved over the gate: First the Voice: hear the people.', 'Then the Truth: keep the record. Last the Mercy: shelter the living.'],
  ep4_petition_gate: [
    { if: 'petition_gate_open', lines: 'The Petition Gate stands open. Its three sockets are lit: blue, white and gold.' },
    { lines: 'The Petition Gate, three dark sockets in its face. Each wants a note from one of the stones.' },
  ],
  ep4_stone_voice: [
    { if: 'principle_voice', lines: 'The stone of the Voice. Its little bell is still humming.' },
    { lines: 'A stone under a small dome, with a bell set in it. Carved round the rim: VOICE.' },
  ],
  ep4_stone_truth: [
    { if: 'principle_truth', lines: 'The stone of the Truth. Its little bell is still humming.' },
    { lines: 'A stone under a small dome, with a bell set in it. Carved round the rim: TRUTH.' },
  ],
  ep4_stone_mercy: [
    { if: 'principle_mercy', lines: 'The stone of the Mercy. Its little bell is still humming.' },
    { lines: 'A stone under a small dome, with a bell set in it. Carved round the rim: MERCY.' },
  ],
  ep4_keeper_note: [
    'A Keeper\'s note, in green ink that will not lift: Keep the roll where the water can read it.',
    'Under it, smaller: Forgery runs. We are counting on it.',
  ],
  ep4_witness_lectern: [
    { if: 'hero_signed', lines: 'The Witness Book of Valewyn. Your name is on the last page, dark, under water, holding.' },
    { lines: 'The Witness Book of Valewyn on a lectern of white stone. The pen is in its well. The page is open.' },
  ],

  // ep4_keep_crown
  ep4_throne: [
    { if: 'paper_regent_defeated', lines: 'The drowned throne, empty. Wet decrees lie round it in a heap. The seal is gone from the arm.' },
    { lines: 'A throne in ankle-deep water. Something tall sits on it, folded out of paper, and it is very still.' },
  ],
  ep4_witness_page: [
    { if: 'lyra_named', lines: "The Witness Book page, under a black feather: your name, Lyra's name, and a single V." },
    { lines: 'A side table by the throne. A page waits on it, and a pen.' },
  ],
};

// ------------------------------------------------------------------------------------------------
// Books (plan 4 and 7): vw_records (the council's Records reward, a book on Dorian's shelf, present if council_records),
// keep_ledger (the Public Coffer cache on F2), tide_log (floor I, the Water Gate).
// ------------------------------------------------------------------------------------------------
export const EP4_BOOKS = {
  vw_records: {
    title: 'The Public Records of Valewyn', where: 'ep4_vw_palace',
    pages: [
      'Births, ferries, bridges, debts and floods, in one hand for forty years and another for twelve.',
      'Twelve years ago the entries stop for a month. The next page begins: The river quarter is to be rebuilt.',
      'Nobody wrote who closed the gates. Somebody wrote, in the margin, very small: we all did.',
    ],
  },
  keep_ledger: {
    title: 'The Keep Ledger', where: 'ep4_keep_f2',
    pages: [
      'The Public Coffer, in Keeper ink: what the city paid in, what it paid out, and who signed for each.',
      'The last true entry: relief for the river quarter, by charter of the king. Paid out: nothing.',
      'Below it, in ordinary ink, the line has run to grey. You can still see where somebody wrote CLOSED.',
    ],
  },
  tide_log: {
    title: 'The Tide Log', where: 'ep4_keep_f1',
    pages: [
      'A lockwright\'s log. Every day: the water at the post, the wheel set, the name of whoever turned it.',
      'Low for the road. Middle for the boats. High to clean the doors. The Keepers built the Keep to be washed.',
      'The last line is twelve years old: Order to hold the gates shut. Seal is good. Joss.',
    ],
  },
};

// ------------------------------------------------------------------------------------------------
// First-time barks (plan 5.1, once per save). first_tide: the road wheel's first turn. first_wash: a forged seal is
// first washed off. first_float: a pontoon first floats under the party. first_true_ink: a Keeper mark under water.
// ------------------------------------------------------------------------------------------------
export const EP4_BARKS = {
  first_tide: [
    { if: ['ep4_started', 'mira_joined'], lines: [m("Down for the road, up for the boat. It's a staircase made of water.")] },
  ],
  first_wash: [
    { if: ['ep4_started', 'mira_joined'], lines: [m('Forged ink runs. It ran.')] },
  ],
  first_float: [
    { if: ['ep4_started', 'bram_joined'], lines: [b("Boats. Of course. It's a city.")] },
  ],
  first_true_ink: [
    { if: ['ep4_started', 'mira_joined'], lines: [m("That didn't run. That one's real.")] },
  ],
};

// ------------------------------------------------------------------------------------------------
// Bestiary (plan 6.2, 6.4, 6.5): the 12 new foes. Three lore lines each: what it is, what it does, what hurts it.
// ------------------------------------------------------------------------------------------------
export const EP4_BESTIARY = {
  flood_hound: {
    name: 'Floodhound', where: 'The Flood Road',
    lore: [
      'A hound with a mane of river weed and a coat the grey of high water. It hunts the drowned fields.',
      'It bites, and its Undertow drags at the legs and chills. Quick on its feet: slow blows miss it.',
      'Thunder and spears. Ice only makes it feel at home.',
    ],
  },
  lockjaw_crab: {
    name: 'Lockjaw Crab', where: 'The Flood Road',
    lore: [
      'A crab the size of a cart wheel, barnacled and rusty in the claw. It lives in the locks and hates being moved.',
      'Its Clamp can stun. When it is struck hard it pulls in and shells up.',
      'Thunder and axes crack it. Swords, arrows and ice slide off the shell.',
    ],
  },
  ink_bloom: {
    name: 'Ink Bloom', where: 'The Flood Road and the Keep',
    lore: [
      'A puddle of runny decree ink with a red wax seal floating in it. It stamps itself, and it gets surer.',
      'Each Stamp adds a seal. At three it reads out its decree: Runoff, over the whole party.',
      'Fire, Lamp Oil or a Break voids the decree. Light hurts it. Ice only thickens the ink.',
    ],
  },
  drowned_watch: {
    name: 'Drowned Watch', where: 'The Sunken Keep',
    lore: [
      'A Keep guard in waterlogged plate, weed in the joints. It still stands its post, twelve years on.',
      'It covers its friends and raises a shield wall. Hit what it is guarding, or hit it first.',
      'Light and thunder. Ice does nothing to a thing already this cold.',
    ],
  },
  gutter_phantom: {
    name: 'Gutter Phantom', where: 'The Archives Below Water',
    lore: [
      'A murky green shape with drowned lanterns for eyes. It drifts out of the drains and does not touch the floor.',
      'Its murk blinds and its cold touch can silence a caster. Hard to pin down.',
      'Light and fire. Ice passes through it.',
    ],
  },
  blank_decree: {
    name: 'Blank Decree', where: 'The Sunken Keep',
    lore: [
      'An order with nothing written on it, on cream paper wings, with a red seal for an eye.',
      'It stamps itself toward an Edict: one hard spell and a Silence. Void it before it reads.',
      'Fire and arrows. Thunder only makes the paper crackle.',
    ],
  },
  waterlogged_sentinel: {
    name: 'Waterlogged Sentinel', where: 'The Sunken Keep',
    lore: [
      'A Keep construct of stone and paper, swollen with water, kelp hanging off it like a cloak.',
      'Slow, and it hits like a falling wall. When it draws back, it is winding up a Breach. Defend.',
      'Thunder and axes. Swords and spears thud off it. Ice is nothing to it.',
    ],
  },
  barrister: {
    name: 'The Inkbound Barrister', where: 'The Archives Below Water',
    lore: [
      'The Keep\'s clerk of argument, given a body by twelve years of sealed paper. A black gown, a white collar.',
      'It stamps every turn. At three seals it rises to object. Later it calls a witness to stamp for it.',
      'Fire, light and spears. Burn the paper before it objects. Silence does not touch it.',
    ],
  },
  barrister_witness: {
    name: 'Paper Witness', where: 'The Archives Below Water',
    lore: [
      'A small blank order the Barrister calls to the stand. It has no testimony. It only stamps.',
      'Each turn it stamps the Barrister\'s case stronger. Strike it down, or keep voiding.',
      'Fire.',
    ],
  },
  paper_regent: {
    name: 'The Paper Regent', where: 'The Drowned Throne',
    lore: [
      'The Keepers\' Clerk of the Charter, folded out of decrees. It kept Valewyn\'s names and sealed what agreed with them.',
      'It stamps toward a Flood Decree, raises a Royal Ward with two Forged Writs, and at the end unrolls your name.',
      'Fire and spears, and light at the last. When it reads your name, answer it.',
    ],
  },
  writ_silence: {
    name: 'Forged Writ of Silence', where: 'The Drowned Throne',
    lore: [
      'A forged writ on a brass stand, its seal still warm. It keeps the Regent\'s ward.',
      'It mends the Regent every turn and hushes casters. Take it down and the healing stops.',
      'Fire. Ice runs off it.',
    ],
  },
  writ_oblivion: {
    name: 'Forged Writ of Oblivion', where: 'The Drowned Throne',
    lore: [
      'A forged writ on a brass stand, sealed twice. It keeps the Regent\'s ward.',
      'It stamps the Regent every turn, so the Flood Decree comes sooner. Take it down and the decree slows.',
      'Spears and fire. Ice runs off it.',
    ],
  },
};

/** One line the battle scene may show when the Paper Regent enters phase 3 (EPISODE4 scene 26). */
export const EP4_BATTLE_TEXT = {
  paper_regent_phase3: 'The crown is paper. The trident is a pen.',
  answer_help: 'Answer to your name. Voids a decree.',
  answer_void: '{hero} answers to their name. The decree will not stand.',
};

// ------------------------------------------------------------------------------------------------
// Credits and cards. CREDITS_EP4 plays over `valewyn` after ep4_complete (hooks.js CREDITS_HANDOFF[4]); END_CARD_EP4
// follows it. END_CARD_EP3_LIVE replaces the Episode 3 end card while EP4_LIVE. EPISODE5_CARD closes ep4_ending
// (placeholder wording, Scott's or Stephen's to change: EPISODE4.md section 10.7).
// ------------------------------------------------------------------------------------------------
export const END_CARD_EP4 = { text: 'To be continued', sub: 'Episode 5 is not playable yet.', frames: 300, backdrop: 'ep4_dialog_keyart' };
export const END_CARD_EP3_LIVE = { text: 'To be continued', sub: 'Episode 4 begins in the morning.', frames: 300, backdrop: 'dialog_keyart_ep3' };
export const EPISODE5_CARD = { text: 'Episode 5: The Last Prophecy', sub: 'In the desert, the words change at night.' };

export const CREDITS_EP4 = [
  { heading: 'LEXICON QUEST', lines: ['Episode 4: The Sunken Keep'] },
  { heading: 'Created by', lines: ['Scott Ball'] },
  { heading: 'Story, World and Direction', lines: ['Scott Ball'] },
  { heading: 'Music', lines: ['Composed for Lexicon Quest', 'with Suno, and in code'] },
  { heading: 'The Party', lines: ['{hero}, who signed', 'Mira, who read the line', 'Bram, son of Garrick and Mara'] },
  { heading: 'Valewyn', lines: ['Lyra, Regent of Valewyn', 'Captain Hale of the ferry', 'Joss the Lockwright'] },
  { heading: 'Valewyn', lines: ['Dorian the Royal Scribe', 'Linn the Archivist', 'Vance of the Watch', 'Sori, who whistles'] },
  { heading: 'On the Water', lines: ['Nilo, and his bell', 'Ada the Courier, soaked to the knees'] },
  { heading: 'The Sunken Keep', lines: ['The Inkbound Barrister', 'The Forged Writs', 'The Paper Regent, who kept every word'] },
  { heading: 'The King', lines: ['He wrote it down.'] },
  { heading: 'And', lines: ['Vex Quill, who witnessed'] },
  { heading: 'Emberpeak, Hollowmere, Willowmere', lines: ['Garrick, who said come home after', 'Rusk and his rope', 'Holt, who reads wet letters'] },
  { heading: '', lines: ['True ink holds.', 'Forged ink runs.'] },
  { heading: 'Thank you for playing', lines: ['Far south, the sand is saying your name.'] },
];

export function register() {
  for (const [id, v] of Object.entries(EP4_BANNERS)) if (!(id in BANNERS)) BANNERS[id] = v;
  for (const [id, v] of Object.entries(EP4_BOOKS)) if (!(id in BOOKS)) BOOKS[id] = v;
  for (const [id, v] of Object.entries(EP4_BARKS)) if (!(id in BARKS)) BARKS[id] = v;
  for (const [id, v] of Object.entries(EP4_BESTIARY)) if (!(id in BESTIARY)) BESTIARY[id] = v;
  STORY.registerStory({ scenes: {}, lines: EP4_LINES, conditions: {} });
}

export default register;
