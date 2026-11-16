// The First Library, III: The Unwritten Page (34 x 40, dungeon, lighting none: the brightest and quietest floor).
// EPISODE8_PLAN 4.4, 4.7, 4.10 and 5.1; exact cells and the book solutions in docs/MAPS_EP8_B.md. Landings of blank white
// page climbing a shaft of shelves, bottom (south) to top (north), the void below, the Original Ink Keyhole at the top.
// SEE, SHELTER, CHOOSE are cut over the stairs as inscriptions, never an order to get right.
//
//   The first landing (x 8..29, rows 28..37): arrival (17,36) by the lift from floor II's Seal Gallery (lift_down 12,36
//      goes back, landing under font_l2b), the fountain font_l3 (20..21,36), memory_c_trig (row 35, x 8..26); the memory's
//      four pictures are staged on the landing's upper half (rows 28..32).
//   SEE (1 read): the book s (23..24,27) stands behind a pillar of shelves (x 22..25, rows 30..32), in a niche (x 23..25,
//      rows 28..29) closed on the west: walk round the pillar by the east, face it from the niche and it bridges north
//      (x 23..24, rows 25..26, stepped onto from the notch 25,26) to the SHELTER landing. Off the west end, the Lantern book l
//      (8,33..34) in Keeper ink bridges west (x 5..7, rows 33..34, from the notch 7,35) to the islet of the Quill of Return
//      (gold, 2,33). One group.
//   SHELTER (2 reads): the landing (x 8..29, rows 21..24, one group each end). The isles book i (21..22,21) read from the
//      south stands its pages north four cells: a bridge over the gap (rows 18..20, stepped onto from the notch 20,20) and a
//      wall on the neck (21..22,17) that is the only way up to the CHOOSE landing. Step off east into the pocket (23,17..19
//      and the ledge 24..25,19). There its pair, the North book n (24,17..18), read from the west folds the isles book (the
//      neck opens) and bridges east (25,17..18, stepped onto from the ledge 25,19) to the stair down (26,17..18, 27,18..20)
//      to SHELTER: the way home.
//   CHOOSE (1 read): the landing (x 4..30, rows 14..15, and x 6..22 on row 16, one group each end). The pair c1 (13..14,14)
//      and c2 (20..21,14), each read from the south, bridge north (rows 12..13) to the keyhole landing by its own route
//      (west from the notch 12,13; east from the notch 22,13). Either is right; only one stands.
//   The keyhole (x 12..22, rows 7..11): name_trig (row 11) stops the party on party_stop_door (17,10); the Original Ink
//      Keyhole door (16..18,7, the doorway 17,7) to ep8_last_word, open from name_told (until then the keyhole itself, an
//      inspect, fills the doorway); the Charter cut in the wall (14,6) and its book (20,8); a wood chest (12,8). The Last
//      Word's stair word_down lands at (17,9). 0 reads.
//
// The bot: s from (24,28) facing up (round the pillar by the east); by the notch (25,26) north over the bridge to (23,24);
// i from (21,22) facing up; by the notch (20,20) north over the bridge, off east to (23,18); n from (23,17) facing right;
// west through the neck (22,17) to the CHOOSE landing; c2 from (21,15) facing up (or c1 from (13,15)); by its notch north to
// the keyhole landing across name_trig.
import { door, object, trigger, enemy, chest, sign, book, enter } from './_kit.js';
import { libGrid, popbook, fountain, lift } from './ep8_library_f1.js';

const W = 34, H = 40;
const S = libGrid(W, H, '_');
const { set, box } = S;

box(0, 0, W - 1, 6, '#');                  // the shaft's shelves along the top (faces on rows 5..6)
// the keyhole landing
box(12, 7, 22, 11, 'g');
// CHOOSE
box(4, 14, 30, 15, 'b'); box(6, 16, 22, 16, 'b');
set(12, 13, 'b'); set(22, 13, 'b');        //   the notches beside c1's and c2's first page rows
// SHELTER
box(21, 17, 22, 17, 'b');                  //   the neck (the isles book's wall stands here)
box(23, 17, 23, 19, 'b'); box(24, 17, 24, 19, 'b'); set(25, 19, 'b');   //   the pocket, the North book's cells, the ledge
box(26, 17, 26, 18, 'b'); box(27, 18, 27, 20, 'b');   //   the stair down past the North book's bridge to SHELTER
box(8, 21, 29, 24, 'b');                   // the SHELTER landing
set(20, 20, 'b');                          //   the notch beside the isles book's first page row
// SEE and the first landing
box(8, 28, 29, 37, 'b');                   // the first landing
set(22, 28, '_'); set(22, 29, '_');        //   the niche is closed on the west
box(22, 30, 25, 32, '#');                  //   the pillar of shelves (top row 30, faces rows 31..32)
box(23, 27, 25, 27, 'b'); set(25, 26, 'b');   //   the SEE book's cells, the step up and the notch beside its first page row
set(7, 35, 'b');                           //   the notch beside the Lantern book's first page column
box(2, 32, 4, 35, 'b');                    // the islet of the Quill of Return

const ground = S.rows();

const POPBOOKS = {
  books: {
    s: { x: 23, y: 27, axis: 'ns', length: 2 },                       // SEE: behind the pillar
    l: { x: 8, y: 33, axis: 'ew', length: 3 },                        // SEE: the Lantern book (optional)
    i: { x: 21, y: 21, axis: 'ns', length: 4, pair: 'n', realm: 'isles' },   // SHELTER: a bridge and a wall
    n: { x: 24, y: 17, axis: 'ew', length: 1, pair: 'i', realm: 'north' },   // SHELTER: folds the isles book, the way home
    c1: { x: 13, y: 14, axis: 'ns', length: 2, pair: 'c2' },          // CHOOSE: the west way up
    c2: { x: 20, y: 14, axis: 'ns', length: 2, pair: 'c1' },          // CHOOSE: the east way up
  },
  goal: ['memory_c_stage', 'party_stop_door'],
};

// ---------------------------------------------------------------- dressing (never on a page cell)
const decor = [
  { t: 'ink_door', x: 16, y: 7, state: 0, ifNot: 'name_told' }, { t: 'ink_door', x: 16, y: 7, state: 1, if: 'name_told' },
  { t: 'lectern', x: 20, y: 8 }, { t: 'goldscroll', x: 22, y: 7 }, { t: 'goldscroll', x: 12, y: 7 },
  { t: 'booktower', x: 6, y: 14 }, { t: 'booktower', x: 28, y: 14 }, { t: 'quill', x: 9, y: 16 },
  { t: 'booktower', x: 8, y: 21 }, { t: 'booktower', x: 26, y: 21 }, { t: 'goldscroll', x: 13, y: 24 },
  { t: 'reading_table', x: 12, y: 30 }, { t: 'booktower', x: 8, y: 28 }, { t: 'booktower', x: 26, y: 28 },
  { t: 'lift_page', x: 12, y: 36 }, { t: 'booktower', x: 8, y: 37 }, { t: 'booktower', x: 26, y: 37 },
  { t: 'pillar', x: 9, y: 32 },
];

const events = [
  enter('f3_enter', 'unwritten_arrival'),
  // ---- the first landing
  lift('lift_down', 12, 36, ['ep8_library_f2', 28, 17, 'down']),
  fountain('font_l3', 20, 36),
  trigger('memory_c_trig', 8, 35, 19, 1, 'keeper_memory_c', { if: 'lib_f3_arrived', ifNot: 'keeper_memory_c' }),
  sign('blank_sign', 11, 29, 'ep8_blank_page', { solid: false }),
  // ---- SEE
  popbook('pb_s', 's', 23, 27),
  sign('see_sign', 23, 32, 'ep8_see', { solid: false, dir: 'up' }),
  popbook('pb_lantern', 'l', 8, 33, { lantern: true }),
  sign('hidden_ink', 9, 31, 'ep8_hidden_ink', { solid: false, lantern: true }),
  chest('chest_quill', 2, 33, 'gold', { item: 'quill_of_return' }),
  enemy('e_lp', 25, 33, 'struck_page', 'e8l3_pages', 'guard'),
  // ---- SHELTER
  popbook('pb_isles', 'i', 21, 21, { sprite: 'popbook_realm', name: 'ep8_realm_isles' }),
  popbook('pb_north', 'n', 24, 17, { sprite: 'popbook_realm_ew', name: 'ep8_realm_north' }),
  sign('shelter_sign', 18, 22, 'ep8_shelter', { solid: false }),
  enemy('e_sl', 10, 23, 'inkbound_librarian', 'e8l3_librarian', 'patrol', { path: ['right', 'right', 'left', 'left'] }),
  enemy('e_sp', 25, 22, 'struck_page', 'e8l3_pages', 'guard'),
  // ---- CHOOSE
  popbook('pb_c1', 'c1', 13, 14),
  popbook('pb_c2', 'c2', 20, 14),
  sign('choose_sign', 17, 15, 'ep8_choose', { solid: false }),
  enemy('e_cl', 8, 15, 'inkbound_librarian', 'e8l3_librarian', 'guard'),
  enemy('e_cm', 26, 15, 'catalog_wraith', 'e8l3_mixed', 'guard'),
  // ---- the keyhole
  trigger('name_trig', 12, 11, 11, 1, 'the_name', { if: ['keeper_memory_c', 'ink_key_found'], ifNot: 'name_told' }),
  sign('keyhole', 17, 7, 'ep8_keyhole', { ifNot: 'name_told' }),
  door('ink_door', 17, 7, ['ep8_last_word', 14, 20, 'up'], { if: 'name_told' }),
  sign('charter', 14, 6, 'ep8_charter', { solid: false, dir: 'up' }),
  book('charter_book', 20, 8, 'living_charter'),
  chest('chest_ink', 12, 8, 'wood', { item: 'fresh_ink', qty: 2 }),
];

export default {
  id: 'ep8_library_f3', name: 'The Unwritten Page', area: 'dungeon',
  music: 'mystery', ambience: 'library_hush', tileset: 'ep8',
  lighting: { tint: 'none', dark: 0 },
  under: 'void_violet',
  legend: { _: 'void_violet', b: 'blank_page', g: 'goldscript', '#': 'shelf_shaft_top', '|': 'shelf_shaft_face',
    o: 'shelf_shaft_out_face', v: 'shelf_shaft_out_top', '.': 'blank_page' },
  ground,
  popbooks: POPBOOKS,
  overlays: [],
  decor,
  overhead: [],
  events,
  exits: [],
  marks: {
    start: [17, 36], arrival: [17, 36], font: [20, 37], lift_down: [12, 37],
    memory_c_spot: [17, 31], memory_c_stage: [16, 32], memory_c_stage_m: [15, 32], memory_c_stage_b: [17, 32],
    nox_landing: [18, 30], mc_desk: [14, 30], mc_vault: [20, 31], mc_stand: [19, 29], mc_stand_bundle: [20, 29],
    mc_bed: [13, 28], mc_bed_bundle: [14, 28], mc_nurse: [16, 28], mc_nurse_blanket: [17, 28], mc_oldest: [14, 29],
    see: [25, 28], s_face: [23, 28], lantern_face: [9, 33], quill: [3, 33],
    shelter: [18, 22], i_face: [21, 22], pocket: [23, 18], n_face: [23, 18],
    choose: [17, 15], c1_face: [13, 15], c2_face: [20, 15],
    keyhole: [17, 7], ink_door: [17, 7], nox_key: [17, 8], word_down_in: [17, 9],
    party_stop_door: [17, 10], party_stop_door_m: [16, 10], party_stop_door_b: [18, 10],
  },
  start: { x: 17, y: 36, dir: 'up' },
};
