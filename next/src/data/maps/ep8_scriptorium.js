// The Scriptorium (46 x 36, town; EPISODE8_PLAN 4.2). Exact cells, edge distances and states in docs/MAPS_EP8_A.md 3.
//
// A Dragon Quest town built round one image: a square of page-stones (scriptmosaic, 13..33 x 13..26) round the Living Codex
// (codex 23..24, 18), an ink canal in a ring round the square (column 12 and 34, rows 12 and 27) crossed by four marble
// bridges (north 22..24, 12; south 22..24, 27; west 12, 18..19; east 34, 18..19), book towers for houses, and the First
// Library's great door at the north end under the cliff of shelves (a two-row book_tower face, rows 7..8; the library_cliff
// decal overhead at 36..42, 0..7).
//   The South Margin gate: the avenue (21..25, 28..35); the exit (22..24, 35) to ep8_stair (21, 10); south_gate (23,34),
//      where the Stair lands; home_trig (21..25, 33) from scriptorium_open. Quinn at quinn_gate (23,26), the party staged on
//      gate_stage (23,28) for scriptorium_arrival (on enter), the half-sign sign_a (21,26) by the gate.
//   The square: the Codex (23..24, 18); the Concordance folio (23..24, 20, at codex_s): shut, then (concordance_started)
//      its scene concordance_light, then lit, a rest and save with its own key ep8_folio (concordance_lit); the register
//      house (the bindery_stall, 14..19 x 19..20 solid) with Elowen at her desk elowen_stall (18,21), its four inspects on
//      its cells; the school steps (goldscript 25..28, 20..21) with Meya at meya_steps (26,21); Arun's script-road
//      (letterpath 25..33, 15..16) and its three candle posts (25,28,31 x 14: dark, lit from scriptorium_open), Arun at
//      arun_post (27,16); Ione west of the Codex at ione_spot (21,19); Vex on the step vex_step (29,20) from scriptorium_open.
//      word_trig on each bridge (south, north, west, east) runs first_word.
//   The north end: the great door library_gate (the object 22..24 x 5..8; doorway (23,8)): shut with its empty seal until
//      library_open, then open (the door to ep8_library_f1 arrival (20,27)), from page_shelved open with the seal's one line;
//      gate_trig (20..26, 9..10) runs library_door; the lexicon door (27,8) to ep8_last_word dais (14,8) from
//      page_shelved (an arch door in the face, closed before); the First Library Index (tower_index 15..19, door (17,10)) to
//      ep8_sc_index; Fen by its steps at fen_spot (14,11).
//   West: the Keeper's Quiet Rooms (door (5,20)). East: Bibliotheca Supplies (door (39,18)). South-east: the Glyphsmith
//      Atelier (door (37,29)). Six book-tower houses, each with a half-sign (sign_b to sign_f) by its door.
// No foes in town. Every focus mark of STAGING_EP8 sits inside x 12..33, y 7..28 (the camera rule).
import { grid, box, put, rows, sign, trigger, enter, npc, door, object } from './_kit.js';

const W = 46, H = 36;
const g = grid(W, H, 'v');
const OPEN = 'scriptorium_open';

// ---------------------------------------------------------------- terrain
box(g, 0, 6, W - 1, 6, '#');             // the cliff of shelves: its band
box(g, 0, 7, W - 1, 8, '|');             // and its two-row face
put(g, 23, 8, 'm');                      // the great door's doorway
put(g, 27, 8, 'm');                      // the lexicon door's doorway
box(g, 2, 9, 43, 31, 'm');               // the streets (page-stone)
// the town's sides and the south margin fall away to the dark beyond (the out-top fill the grid starts with)
box(g, 21, 28, 25, 35, 'm');             // the avenue through the South Margin gate
box(g, 13, 13, 33, 26, 'q');             // the square
box(g, 25, 15, 33, 16, 'l');             // Arun's script-road
box(g, 25, 20, 28, 21, 'g');             // the school steps
// the ink canal ring round the square
box(g, 12, 12, 34, 12, 'c'); box(g, 12, 27, 34, 27, 'c');
box(g, 12, 12, 12, 27, 'c'); box(g, 34, 12, 34, 27, 'c');
const ground = rows(g);

// the four bridges (marble decks over the canal)
const overlays = [
  ...[22, 23, 24].map((x, i) => ({ t: `marble_bridge_v_m_${'wme'[i]}`, x, y: 12 })),
  ...[22, 23, 24].map((x, i) => ({ t: `marble_bridge_v_m_${'wme'[i]}`, x, y: 27 })),
  { t: 'marble_bridge_h_n_m', x: 12, y: 18 }, { t: 'marble_bridge_h_s_m', x: 12, y: 19 },
  { t: 'marble_bridge_h_n_m', x: 34, y: 18 }, { t: 'marble_bridge_h_s_m', x: 34, y: 19 },
  // the lexicon door: an arch shut in the face until page_shelved, then open
  { t: 'door_arch_closed', x: 27, y: 7, ifNot: 'page_shelved' },
  { t: 'door_arch_open', x: 27, y: 7, if: 'page_shelved' },
];

// ---------------------------------------------------------------- dressing
const decor = [
  // the great buildings
  { t: 'tower_index', x: 15, y: 10 },          // door (17,10)
  { t: 'tower_quiet_rooms', x: 4, y: 20 },     // door (5,20)
  { t: 'tower_bibliotheca', x: 38, y: 18 },    // door (39,18)
  { t: 'tower_atelier', x: 36, y: 29 },        // door (37,29)
  // book-tower houses (doors (x+1) for b, (x) for a)
  { t: 'tower_house_b', x: 4, y: 12 }, { t: 'tower_house_a', x: 9, y: 26 }, { t: 'tower_house_b', x: 6, y: 30 },
  { t: 'tower_house_a', x: 39, y: 12 }, { t: 'tower_house_b', x: 40, y: 24 }, { t: 'tower_house_a', x: 29, y: 31 },
  // the register house and the square's furniture
  { t: 'bindery_stall', x: 14, y: 20 },
  { t: 'booktower', x: 30, y: 10 }, { t: 'booktower', x: 33, y: 10 }, { t: 'booktower', x: 11, y: 10 },
  { t: 'booktower', x: 2, y: 17 }, { t: 'booktower', x: 43, y: 21 }, { t: 'booktower', x: 17, y: 30 },
  { t: 'quill', x: 31, y: 24 }, { t: 'goldscroll', x: 15, y: 25 }, { t: 'pagefountain', x: 29, y: 23 },
  { t: 'quill', x: 20, y: 30 }, { t: 'goldscroll', x: 26, y: 30 },
];
const overhead = [{ t: 'library_cliff', x: 36, y: 0 }];

// ---------------------------------------------------------------- events
const SIGNS = [['sign_a', 'half_sign_a', 21, 26], ['sign_b', 'half_sign_b', 7, 12], ['sign_c', 'half_sign_c', 11, 26],
  ['sign_d', 'half_sign_d', 41, 12], ['sign_e', 'half_sign_e', 43, 24], ['sign_f', 'half_sign_f', 28, 31]];
const CANDLES = [25, 28, 31];
const events = [
  // scenes on arrival: the first time by the South Margin; the arrival by the Library door after the last page
  { ...enter('sc_arrive', 'scriptorium_arrival'), if: 'stair_arrived', ifNot: 'scriptorium_arrived' },
  { ...enter('sc_open', 'scriptorium_open'), if: 'page_shelved', ifNot: OPEN },
  // the first word, on every bridge into the square
  trigger('word_trig', 22, 27, 3, 1, 'first_word', { if: 'scriptorium_arrived', ifNot: 'read_learned' }),
  trigger('word_trig_n', 22, 12, 3, 1, 'first_word', { if: 'scriptorium_arrived', ifNot: 'read_learned' }),
  trigger('word_trig_w', 12, 18, 1, 2, 'first_word', { if: 'scriptorium_arrived', ifNot: 'read_learned' }),
  trigger('word_trig_e', 34, 18, 1, 2, 'first_word', { if: 'scriptorium_arrived', ifNot: 'read_learned' }),
  // the great door, the Index, the lexicon door
  trigger('gate_trig', 20, 9, 7, 2, 'library_door', { if: ['card_read', 'elowen_met'], ifNot: 'library_open' }),
  object('library_gate', 22, 8, 'library_gate', { state: 0, text: 'ep8_library_gate', ifNot: 'library_open' }),
  object('library_gate_open', 22, 8, 'library_gate', { state: 1, text: 'ep8_library_gate', if: 'library_open', ifNot: 'page_shelved' }),
  object('library_gate_sealed', 22, 8, 'library_gate', { state: 2, text: 'ep8_library_gate', if: 'page_shelved' }),
  sign('gate_shut', 23, 8, 'ep8_library_gate', { ifNot: 'library_open' }),
  door('library_door', 23, 8, ['ep8_library_f1', 20, 27, 'up'], { if: 'library_open' }),
  sign('lexicon_shut', 27, 8, 'ep8_lexicon_door', { ifNot: 'page_shelved' }),
  door('lexicon_door', 27, 8, ['ep8_last_word', 14, 8, 'down'], { if: 'page_shelved' }),
  door('door_index', 17, 10, ['ep8_sc_index', 9, 12, 'up']),
  sign('sign_index', 14, 10, 'sign_ep8_index'),
  // the square: the Codex, the folio, the register house
  object('codex', 23, 18, 'living_codex', { text: 'ep8_living_codex' }),
  { id: 'folio_shut', type: 'book', x: 23, y: 20, w: 2, book: 'concordance_folio', sprite: 'concordance', state: 0, ifNot: 'concordance_started' },
  object('folio', 23, 20, 'concordance', { w: 2, state: 0, script: 'concordance_light', text: 'ep8_living_codex', if: 'concordance_started', ifNot: 'concordance_lit' }),
  { id: 'folio_lit', type: 'font', x: 23, y: 20, w: 2, h: 1, text: 'ep8_folio', sprite: 'concordance', state: 1, safe: true, if: 'concordance_lit' },
  sign('stall', 17, 20, 'ep8_register'),
  sign('bindery', 14, 20, 'ep8_bindery'),
  sign('blankets', 16, 20, 'ep8_blankets'),
  sign('infirmary_door', 19, 20, 'ep8_infirmary_door'),
  // the half-signs (the word stops halfway; finished from scriptorium_open)
  ...SIGNS.flatMap(([id, t, x, y]) => [
    object(id, x, y, t, { state: 0, text: `ep8_${id}`, ifNot: OPEN }),
    object(`${id}_done`, x, y, t, { state: 1, text: `ep8_${id}`, if: OPEN }),
  ]),
  // Arun's candle posts (dark, then lit)
  ...CANDLES.flatMap((x, i) => [
    object(`candle_${i + 1}`, x, 14, 'candle_post', { state: 0, text: 'ep8_candle_post', ifNot: OPEN }),
    object(`candle_${i + 1}_lit`, x, 14, 'candle_post', { state: 1, text: 'ep8_candle_post', if: OPEN }),
    { id: `candle_${i + 1}_glow`, type: 'light', x, y: 13, r: 3, color: '#f9d77a', if: OPEN },
  ]),
  // the canal, its dry pens, a book window
  sign('ink_canal', 12, 24, 'ep8_ink_canal'),
  sign('dry_pens', 34, 24, 'ep8_dry_pens'),
  sign('book_window', 6, 11, 'ep8_book_window'),
  // the doors and their signs
  door('door_inn', 5, 20, ['ep8_sc_inn', 10, 10, 'up']),
  door('door_shop', 39, 18, ['ep8_sc_shop', 7, 9, 'up']),
  door('door_atelier', 37, 29, ['ep8_sc_atelier', 8, 9, 'up']),
  sign('sign_inn', 7, 20, 'sign_ep8_inn'),
  sign('sign_shop', 37, 18, 'sign_ep8_shop'),
  sign('sign_atelier', 35, 29, 'sign_ep8_atelier'),
  // home, from the South Margin gate
  trigger('home_trig', 21, 33, 5, 1, 'home', { if: OPEN, ifNot: 'home_reached' }),
  // NPCs (sprites, movement, presence and talk come from the pack's npcs.js; the presence flags mirror their `show`)
  npc('quinn', 23, 26, 'down'),
  npc('elowen', 18, 21, 'down'),
  npc('meya', 26, 21, 'down'),
  npc('ione', 21, 19, 'right'),
  npc('arun', 27, 16, 'down'),
  npc('fen', 14, 11, 'down'),
  npc('vex8', 29, 20, 'down', { if: OPEN }),
];

export default {
  id: 'ep8_scriptorium', name: 'The Scriptorium', area: 'town',
  music: 'scriptorium_town', ambience: 'library_hush', tileset: 'town',
  lighting: { tint: 'none', dark: 0 },
  under: 'marble_page',
  legend: {
    m: 'marble_page', q: 'scriptmosaic', l: 'letterpath', g: 'goldscript', c: 'ink_canal',
    '#': 'book_tower_top', '|': 'book_tower_face', v: 'book_tower_out_top',
  },
  ground,
  overlays,
  decor,
  overhead,
  events,
  exits: [{ x: 22, y: 35, w: 3, h: 1, to: ['ep8_stair', 21, 10, 'down'] }],
  marks: {
    // the South Margin gate (scriptorium_arrival, home)
    south_gate: [23, 34], quinn_gate: [23, 26], nox_gate_s: [22, 27],
    gate_stage: [23, 28], gate_stage_m: [22, 28], gate_stage_b: [24, 28], sign_a: [21, 26],
    // the square
    codex: [23, 18], codex_n: [23, 16], codex_s: [23, 20], codex_w: [21, 18], codex_e: [26, 18], nox_codex: [21, 18],
    meya_steps: [26, 21], steps_stage: [26, 23], steps_stage_m: [25, 23], steps_stage_b: [27, 23],
    stall: [17, 21], elowen_stall: [18, 21], stall_stage: [18, 23], stall_stage_m: [17, 23], stall_stage_b: [19, 23],
    nox_stall: [20, 22], folio_stage: [23, 22], folio_stage_m: [22, 22], folio_stage_b: [24, 22],
    arun_post: [27, 16], vex_step: [29, 20], ione_spot: [21, 19],
    crowd_a: [16, 15], crowd_b: [30, 18], crowd_c: [15, 24], crowd_d: [31, 22], crowd_e: [20, 25], crowd_f: [27, 25],
    // the north end
    library_gate: [23, 8], nox_gate: [23, 9], library_stage: [23, 11], library_stage_m: [22, 11], library_stage_b: [24, 11],
    lexicon_door: [27, 9], index_door: [17, 10], nox_index: [18, 11], fen_spot: [14, 11], library_cliff: [39, 4],
    // the doors
    inn_door: [5, 21], shop_door: [39, 19], atelier_door: [37, 30],
  },
  start: { x: 23, y: 34, dir: 'up' },
};
