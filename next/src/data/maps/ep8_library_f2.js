// The First Library, II: The Palimpsest Galleries (40 x 30, dungeon, dark 0.3, lamp pools). EPISODE8_PLAN 4.4, 4.6, 4.10
// and 5.1; exact cells and the book solutions in docs/MAPS_EP8_B.md. Galleries of grey vellum written over twice. The
// inversion: the books come in palimpsest pairs (one ribbon colour a pair); open one and its pair shuts. One pair starts
// with the wrong version open.
//
//   A  The Overwritten Stair (x 2..9, rows 23..28): arrival (5,27) by the lift from floor I's northern shelf (lift_down 3,24
//      goes back, landing beside floor I's lift up), the fountain font_l2 (7..8,24). North by the neck (4..5,22).
//   B  The Pair (2 reads): the west gallery (x 2..7, rows 14..21, one group). The Valewyn book v (7,16..17) read from the
//      west bridges east (x 8..10, rows 16..17) to the printing room island (x 11..16, rows 10..19, one group), stepped onto
//      from the notch (8,15). memory_b_trig (row 15) crosses the island under the printing desk. Its pair w (13..14,10)
//      read from the south bridges north (x 13..14, rows 7..9) to the Wrong Version landing; the Valewyn bridge folds
//      behind the party, harmlessly (everyone is on the island). The notch (12,9).
//   C  The Wrong Version (2 reads): the landing (x 11..22, rows 3..6) and the corridor (x 26..38, rows 3..5). The pair x/y:
//      y, the gallery door (28..29,6), starts open north, a wall of standing pages across the corridor (x 28..29, rows 3..5).
//      Read the desert book x (22,4..5) from the west: its pages bridge east (x 23..25, rows 4..5) from the notch (23,6)
//      into the corridor, and y folds. Then read y from the north (28,5): it stands south, a bridge (x 28..29, rows 7..9)
//      from the notch (27,7) down to the Seal Gallery, and x folds behind. The same book that shut the door opens the way.
//   D  The Side Galleries (optional, 2 reads): from the corridor's east end, a1 (34..35,5) read from the north bridges south
//      (x 34..35, rows 6..7) from the notch (33,6) to the side gallery (x 33..35, rows 8..16, one group, three evidence pages
//      and a Hi-Potion chest). Its pair a2 (37..38,8) starts open south, a wall in the mouth of the Archive alcove (x 37..38,
//      rows 9..13); a1 folds it. From the alcove's mouth a2 read from the south stands north (x 37..38, rows 6..7): the way
//      back up to the corridor (stepped onto from the notch 36,7), and a1 folds. The Archive (archive_obj) and, once
//      archive_open, its gold chest and the Book the Keeper Hid.
//   E  The Seal Gallery: the strip (x 27..30, rows 10..21, one group) with font_l2b (28..29,16) before the arena, the cache
//      (iron, 1,500 gold, 30,21; the gold line) and the lift (30,15): lift_back down to the Overwritten Stair until
//      library_f2_done, then lift_l2_down to floor I's fountain. Floor I's lift_l1_up and floor III's lift down land at
//      (28,17), under the font. The arena (x 18..25, rows 11..21) through the joint (26,19..21): sentry_trig (25,19..21)
//      stops the party on arena_stage (22,17), the Sentry at sentry_spot (22,13). After the win, lift_trig (22,12) and the
//      lift up (22,11) to floor III.
//
// The bot: v from (6,16) facing right; by the notch (8,15) east to the island (11,16), north across memory_b_trig; w from
// (13,11) facing up; by the notch (12,9) north to the landing (13,6); x from (21,5) facing right; by the notch (23,6) east
// into the corridor (26,4); y from (28,5) facing down; by (27,6) and (27,7) onto the bridge, south to the strip (28,10);
// font_l2b; south to the joint and west across sentry_trig; after the win lift_trig (22,12), lift_up (22,11).
import { object, trigger, enemy, chest, sign, book, actor, enter, light } from './_kit.js';
import { libGrid, popbook, fountain, lift } from './ep8_library_f1.js';

const W = 40, H = 30;
const S = libGrid(W, H, '_');
const { set, box } = S;

box(0, 0, W - 1, 2, '#');                  // the palimpsest wall along the top (faces on rows 1..2)
// A
box(2, 23, 9, 28, 'e');                    // the Overwritten Stair
box(4, 22, 5, 22, 'e');                    //   the neck north
// B
box(2, 14, 7, 21, 'e');                    // the west gallery
set(8, 15, 'e');                           //   the notch beside the Valewyn book's first page column
box(11, 10, 16, 19, 'e');                  // the printing room island
set(12, 9, 'e');                           //   the notch beside w's first page row
// C
box(11, 3, 22, 6, 'e');                    // the Wrong Version landing
set(23, 6, 'e');                           //   the notch beside the desert book's first page column
box(26, 3, 38, 5, 'e');                    // the corridor
box(27, 6, 29, 6, 'e'); set(27, 7, 'e');   //   the gallery door's step (y stands on 28..29,6) and the notch beside its south pages
// D
set(33, 6, 'e');                           //   the notch beside a1's first page row
box(33, 8, 35, 16, 'e');                   // the side gallery
box(36, 8, 36, 9, 'e'); set(36, 7, 'e');   //   its east lip and the notch beside a2's north pages
box(37, 8, 38, 13, 'e');                   // the Archive alcove (a2 stands on 37..38,8)
// E
box(27, 10, 30, 21, 'e');                  // the strip
box(26, 19, 26, 21, 'e');                  // the joint
box(18, 11, 25, 21, 'e');                  // the arena

const ground = S.rows();

const POPBOOKS = {
  books: {
    v: { x: 7, y: 16, axis: 'ew', length: 3, pair: 'w', realm: 'valewyn' },   // B: the west gallery to the island
    w: { x: 13, y: 10, axis: 'ns', length: 3, pair: 'v' },                    // B: the island to the Wrong Version
    x: { x: 22, y: 4, axis: 'ew', length: 3, pair: 'y', realm: 'desert' },    // C: into the corridor, folding y
    y: { x: 28, y: 6, axis: 'ns', length: 3, pair: 'x' },                     // C: the wrong version, then the way down
    a1: { x: 34, y: 5, axis: 'ns', length: 2, pair: 'a2' },                   // D: into the side gallery (optional)
    a2: { x: 37, y: 8, axis: 'ns', length: 2, pair: 'a1' },                   // D: the Archive's wall, then the way back
  },
  start: { y: 'n', a2: 's' },
  goal: ['printing_stage', 'arena_stage', 'lift_up'],
};

// ---------------------------------------------------------------- dressing (never on a page cell)
const decor = [
  { t: 'lift_page', x: 3, y: 24 }, { t: 'booktower', x: 2, y: 28 }, { t: 'booktower', x: 9, y: 28 },
  { t: 'booktower', x: 2, y: 14 }, { t: 'quill', x: 3, y: 21 },
  { t: 'reading_table', x: 15, y: 10 }, { t: 'book_stack', x: 11, y: 10 }, { t: 'lectern', x: 16, y: 19 },
  { t: 'goldscroll', x: 11, y: 3 }, { t: 'booktower', x: 17, y: 3 }, { t: 'booktower', x: 38, y: 3 },
  { t: 'booktower', x: 33, y: 16 }, { t: 'quill', x: 35, y: 8 },
  { t: 'lift_page', x: 30, y: 15 }, { t: 'booktower', x: 27, y: 21 },
  { t: 'lift_page', x: 22, y: 11, if: 'sentry_defeated' }, { t: 'booktower', x: 18, y: 11 }, { t: 'booktower', x: 25, y: 11 },
  { t: 'booktower', x: 18, y: 21 },
];

const events = [
  enter('f2_enter', 'palimpsest_arrival'),
  // ---- A: The Overwritten Stair
  lift('lift_down', 3, 24, ['ep8_library_f1', 29, 4, 'down']),
  fountain('font_l2', 7, 24),
  light('lamp_a', 7, 23, 4),
  // ---- B: The Pair
  popbook('pb_valewyn', 'v', 7, 16, { sprite: 'popbook_realm_ew', name: 'ep8_realm_valewyn' }),
  popbook('pb_w', 'w', 13, 10),
  trigger('memory_b_trig', 11, 15, 6, 1, 'keeper_memory_b', { if: 'lib_f2_arrived', ifNot: 'keeper_memory_b' }),
  sign('printing_sign', 12, 14, 'ep8_printing_room', { solid: false }),
  sign('overwritten_sign', 14, 2, 'ep8_overwritten', { solid: false, dir: 'up' }),
  light('lamp_b', 4, 17, 3.5), light('lamp_print', 14, 12, 4),
  enemy('e_bm', 4, 19, 'inkbound_librarian', 'e8l2_mixed', 'patrol', { path: ['up', 'up', 'down', 'down'] }),
  enemy('e_bc', 15, 18, 'paper_crane', 'e8l2_cranes', 'guard'),
  // ---- C: The Wrong Version
  popbook('pb_desert', 'x', 22, 4, { sprite: 'popbook_realm_ew', name: 'ep8_realm_desert' }),
  popbook('pb_y', 'y', 28, 6),
  light('lamp_c', 16, 4, 3.5), light('lamp_door', 27, 4, 3),
  // ---- D: The Side Galleries (optional)
  popbook('pb_a1', 'a1', 34, 5),
  popbook('pb_a2', 'a2', 37, 8),
  chest('page_names', 33, 10, 'wood', { item: 'evidence_page', flag: 'page_names_found' }),
  chest('page_order', 35, 12, 'wood', { item: 'evidence_page', flag: 'page_order_found' }),
  chest('page_correction', 33, 15, 'wood', { item: 'evidence_page', flag: 'page_correction_found' }),
  sign('names_sign', 34, 10, 'ep8_page_names', { solid: false }),
  sign('order_sign', 34, 12, 'ep8_page_order', { solid: false }),
  sign('correction_sign', 34, 15, 'ep8_page_correction', { solid: false }),
  chest('chest_d', 35, 16, 'wood', { item: 'hi_potion', qty: 2 }),
  enemy('e_sl', 34, 13, 'inkbound_librarian', 'e8l2_librarian', 'guard'),
  object('archive_obj', 38, 12, 'shelf_a', { script: 'uncensored_archive' }),
  sign('archive_sign', 37, 11, 'ep8_archive_shelf', { solid: false }),
  chest('chest_archive', 37, 13, 'gold', { gold: 500, item: 'hi_ether', qty: 3, if: 'archive_open' }),
  book('book_keeper_hid', 38, 13, 'keeper_hid', { if: 'archive_open' }),
  light('lamp_d', 34, 11, 3.5), light('lamp_archive', 38, 12, 2.5),
  // ---- E: The Seal Gallery
  fountain('font_l2b', 28, 16),
  chest('chest_gallery', 30, 21, 'iron', { gold: 1500, item: 'hi_potion', qty: 1 }),
  lift('lift_back', 30, 15, ['ep8_library_f2', 6, 25, 'down'], { ifNot: 'library_f2_done' }),        // down to the Overwritten Stair
  lift('lift_l2_down', 30, 15, ['ep8_library_f1', 22, 26, 'up'], { if: 'library_f2_done' }),         // the shortcut down (the fountain)
  enemy('e_em', 29, 12, 'inkbound_librarian', 'e8l2_mixed', 'guard'),
  sign('seal_sign', 19, 12, 'ep8_seal_gallery', { solid: false }),
  actor('sentry_figure', 22, 13, 'unnamed_sentry', 'down', { ifNot: 'sentry_defeated' }),
  trigger('sentry_trig', 25, 19, 1, 3, 'unnamed_sentry', { if: 'lib_f2_arrived', ifNot: 'sentry_defeated' }),
  trigger('lift_trig', 22, 12, 1, 1, 'library_f2_lift', { if: 'sentry_defeated', ifNot: 'library_f2_done' }),
  lift('lift_up', 22, 11, ['ep8_library_f3', 17, 36, 'up'], { if: 'sentry_defeated' }),
  light('lamp_font', 28, 15, 4), light('lamp_arena', 22, 15, 5),
];

export default {
  id: 'ep8_library_f2', name: 'The Palimpsest Galleries', area: 'dungeon',
  music: 'first_library', ambience: 'library_hush', tileset: 'ep8',
  lighting: { tint: 'none', dark: 0.3 },
  under: 'void_violet',
  legend: { _: 'void_violet', e: 'vellum', '#': 'palimpsest_wall_top', '|': 'palimpsest_wall_face', o: 'palimpsest_wall_out_face',
    v: 'palimpsest_wall_out_top', '.': 'vellum' },
  ground,
  popbooks: POPBOOKS,
  overlays: [],
  decor,
  overhead: [],
  events,
  exits: [],
  marks: {
    start: [5, 27], arrival: [5, 27], font: [7, 25], lift_down: [3, 25], back_in: [6, 25],
    pair: [12, 17], v_face: [6, 16],
    printing_room: [15, 12], fk_desk_m: [15, 11], nox_printing: [16, 12],
    printing_stage: [15, 14], printing_stage_m: [14, 14], printing_stage_b: [16, 14],
    scribe_row_m: [12, 12], lantern_keeper_m: [12, 13], lantern_exit_m: [11, 19], w_face: [13, 11],
    wrong_version: [28, 4], x_face: [21, 4], y_face: [28, 5],
    side_galleries: [34, 11], a1_face: [34, 4], a2_face: [37, 9], archive: [37, 12],
    font_b: [28, 17], shortcut_in: [28, 17],
    arena: [22, 15], sentry_spot: [22, 13], arena_stage: [22, 17], arena_stage_m: [21, 17], arena_stage_b: [23, 17],
    lift_up: [22, 12], lift_l2_down: [29, 15],
  },
  start: { x: 5, y: 27, dir: 'up' },
};
