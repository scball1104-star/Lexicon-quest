// The First Library, I: The Catalog of Lost Lives (40 x 30, dungeon, a warm gold cast). EPISODE8_PLAN 4.4, 4.5, 4.10 and
// 5.1; exact cells and the book solutions in docs/MAPS_EP8_B.md. The teaching floor: walls of card drawers along the top,
// galleries of parchment hanging over the violet void, a great book shut on every landing. No pairs on this floor.
//
//   A  the Restoring Fountain (x 17..23, rows 24..28): arrival (20,27) from the Scriptorium's Library gate (the stair
//      to_scriptorium 19..21,29 goes back), the fountain font_l1 (22..23,25), a wood chest, and once library_f2_done the
//      lift lift_l1_up (18,25) up to floor II's Seal Gallery; floor II's lift_l2_down lands at (22,26), under the fountain.
//      North over the neck (20..21,23) onto the gallery.
//   B  Crossing Pages (2 reads): the gallery (x 5..29, rows 18..22, two groups) and the doorway alcove (x 12..15, rows
//      15..17) with memory_a_trig (row 17) under the alcove of drawers (the wall block x 11..16, rows 12..14). Book a (21,18)
//      read from the south stands its pages north (x 21..22, rows 14..17): a bridge to the island (x 18..25, rows 9..13),
//      stepped onto from the notch (20,17). On the island book b (25,10..11) read from the west stands its pages east
//      (x 26..29, rows 10..11): a bridge to the Wall Behind landing, stepped onto from the notch (26,12).
//   C  The Wall Behind (1 read): the landing (x 30..37, rows 8..16, one group). The Emberpeak book c (33..34,8) read from
//      the south stands its pages north four cells: a bridge over the gap (rows 6..7), stepped onto from the notch (35,7),
//      and a wall of standing pages on the northern shelf (x 33..34, rows 4..5) that closes the shelf's lower rows behind
//      the party. Step off west by the ledge (32,6).
//   D  The Side Alcove (optional, 1 read): book d (6..7,18) on the gallery read from the south bridges north (x 6..7, rows
//      15..17) from the notch (8,17) to the alcove (x 3..9, rows 9..14, one group): the iron chest (Quinn's page #2, or a
//      Hi-Ether) and a Dash-cracked drawer stack (3,9) before the gold chest of the Margin-Walker Boots (3,8).
//   E  The Northern Shelf (x 22..37, rows 3..5, plus x 12..17, rows 3..6 across a gap; 1 read): the Hollow book h (22,4..5)
//      read from the east stands its pages west (x 18..21, rows 4..5): a bridge to the far end, stepped onto from the notch
//      (21,6). There the Original Ink Key (gold, 13,3) and a Dash stack (16,6) over Quinn's page #3 (16,7). Back east: the
//      lift up (28,3) with lift_trig (28,4) (library_f1_lift); floor II's lift_down lands at (29,4). Past the wall of
//      pages by the shelf's top row, the cache (iron, 1,500 gold, 37,3; the gold line). One group (30,4).
//
// The bot: a from (21,19) facing up; by the notch (20,17) north over the bridge to (21,13); b from (24,11) facing right;
// by the notch (26,12) east over the bridge to (30,11); c from (34,9) facing up; by the notch (35,7) over the bridge, off by
// (32,6) to (32,5); h from (23,5) facing left; by the notch (21,6) west over the bridge to the key (13,4) facing up; back
// east to lift_trig (28,4), lift_up (28,3). Every page cell lies over the void or
// plain floor; no event stands on one (tools/maps/ep8_check.mjs).
import { door, object, trigger, enemy, chest, sign, enter, wallDepth, stoneStairs } from './_kit.js';

// ------------------------------------------------------------------------------------------------ the Library kit
// Shared by the four maps of this family (ep8_library_f2, ep8_library_f3 and ep8_last_word import it). Pure data helpers.

/**
 * A Library grid: ground chars (fill, the void '_' by default). rows() turns every wall '#' within two cells above a
 * non-wall cell into a face '|' (a 2-row face, E8-tiles' wall systems), runs the W8 wall depth over the rest and returns
 * the ground rows.
 */
export function libGrid(W, H, fill = '_') {
  const g = Array.from({ length: H }, () => Array(W).fill(fill));
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const set = (x, y, ch) => { if (inb(x, y)) g[y][x] = ch; };
  const box = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, ch); };
  const rows = () => {
    const out = g.map((r) => r.slice());
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (out[y][x] !== '#') continue;
      for (let d = 1; d <= 2; d++) if (y + d < H && g[y + d][x] !== '#') { out[y][x] = '|'; break; }
    }
    return wallDepth(out.map((r) => r.join('')));
  };
  return { W, H, g, inb, set, box, rows };
}

/** A pop-up book event (E8-world's `popbook`): at its block's (x, y), the book's top-left cell. */
export const popbook = (id, letter, x, y, extra = {}) => ({ id, type: 'popbook', book: letter, x, y, ...extra });
/** The Restoring Fountain of Names (rest and save, 2 x 1, its own text key ep8_fountain). */
export const fountain = (id, x, y, extra = {}) =>
  ({ id, type: 'font', x, y, w: 2, h: 1, text: 'ep8_fountain', sprite: 'restoring_fountain', safe: true, ...extra });
/** A Library lift: a door of kind lift; the brass cage lift_page is decor on the same cell (its door cell is (0, 0)). */
export const lift = (id, x, y, to, extra = {}) => ({ id, type: 'door', x, y, to, kind: 'lift', ...extra });
/** The Scriptorium's Library gate, as the Library's doors land on it (E8-maps-a: the cell below the gate's seal). */
export const LIBRARY_GATE = ['ep8_scriptorium', 23, 9, 'down'];

// ------------------------------------------------------------------------------------------------ the floor
const W = 40, H = 30;
const S = libGrid(W, H, '_');
const { set, box } = S;

box(0, 0, W - 1, 2, '#');                  // the drawer wall along the top (faces on rows 1..2)
// A
box(17, 24, 23, 28, 'g');                  // the Restoring Fountain
box(19, 29, 21, 29, 'g');                  //   the stair down to the Scriptorium
box(20, 23, 21, 23, 'p');                  //   the neck north
// B
box(5, 18, 29, 22, 'p');                   // the gallery
box(12, 15, 15, 17, 'p');                  // the doorway alcove
box(11, 12, 16, 14, '#');                  //   the alcove of drawers behind it (faces rows 13..14)
set(20, 17, 'p');                          //   the notch beside book a's first page row
box(18, 9, 25, 13, 'g');                   // the island
set(26, 12, 'g');                          //   the notch beside book b's first page column
// C
box(30, 8, 37, 16, 'p');                   // the Wall Behind landing
set(35, 7, 'p'); set(32, 6, 'p');          //   the step onto the Emberpeak bridge (east) and off it (west)
// D
box(3, 9, 9, 14, 'p');                     // the side alcove
set(3, 8, 'p');                            //   the boots' nook
set(8, 17, 'p');                           //   the notch beside book d's first page row
// E
box(22, 3, 37, 5, 'p');                    // the northern shelf
box(21, 6, 23, 6, 'p');                    //   the lip under the Hollow book and the notch beside its first page column
box(12, 3, 17, 6, 'g');                    // its far end, across the gap
set(16, 7, 'g');                           //   the nook under the far end's drawer stack

const ground = S.rows();

const POPBOOKS = {
  books: {
    a: { x: 21, y: 18, axis: 'ns', length: 4 },                       // B: gallery to the island
    b: { x: 25, y: 10, axis: 'ew', length: 4 },                       // B: the island to the Wall Behind
    c: { x: 33, y: 8, axis: 'ns', length: 4, realm: 'emberpeak' },    // C: a bridge and a wall
    d: { x: 6, y: 18, axis: 'ns', length: 3 },                        // D: the side alcove (optional)
    h: { x: 22, y: 4, axis: 'ew', length: 4, realm: 'hollow' },       // E: to the key
  },
  goal: ['doorway_alcove', 'north_shelf', 'lift_up'],
};

// ---------------------------------------------------------------- dressing (never on a page cell)
const decor = [
  { t: 'lift_page', x: 18, y: 25, if: 'library_f2_done' },
  { t: 'booktower', x: 17, y: 28 }, { t: 'booktower', x: 23, y: 28 },
  { t: 'booktower', x: 5, y: 22 }, { t: 'quill', x: 12, y: 22 }, { t: 'booktower', x: 29, y: 22 },
  { t: 'goldscroll', x: 18, y: 9 }, { t: 'booktower', x: 37, y: 16 }, { t: 'quill', x: 30, y: 16 },
  { t: 'booktower', x: 9, y: 14 }, { t: 'booktower', x: 12, y: 6 },
  { t: 'lift_page', x: 28, y: 3 }, { t: 'goldscroll', x: 36, y: 5 }, { t: 'booktower', x: 22, y: 3 },
];

const events = [
  enter('f1_enter', 'catalog_arrival'),
  // ---- A: the Restoring Fountain
  door('to_scriptorium', 19, 29, LIBRARY_GATE, { w: 3, kind: 'stairs' }),
  fountain('font_l1', 22, 25),
  chest('chest_a', 18, 28, 'wood', { item: 'fresh_ink', qty: 2 }),
  lift('lift_l1_up', 18, 25, ['ep8_library_f2', 28, 17, 'down'], { if: 'library_f2_done' }),   // the shortcut up (the Seal Gallery)
  // ---- B: Crossing Pages
  popbook('pb_a', 'a', 21, 18),
  popbook('pb_b', 'b', 25, 10),
  trigger('memory_a_trig', 12, 17, 4, 1, 'keeper_memory_a', { if: 'lib_f1_arrived', ifNot: 'keeper_memory_a' }),
  sign('doorway', 13, 14, 'ep8_doorway', { solid: false, dir: 'up' }),
  sign('alcove_drawers', 14, 14, 'ep8_alcove', { solid: false, dir: 'up' }),
  sign('drawer_wall', 25, 2, 'ep8_drawer_wall', { solid: false, dir: 'up' }),
  chest('chest_b', 24, 9, 'wood', { item: 'hi_potion', qty: 2 }),
  enemy('e_gw', 10, 20, 'catalog_wraith', 'e8l1_wraiths', 'patrol', { path: ['right', 'right', 'left', 'left'] }),
  enemy('e_gm', 27, 20, 'index_hound', 'e8l1_mixed', 'guard'),
  // ---- C: The Wall Behind
  popbook('pb_ember', 'c', 33, 8, { sprite: 'popbook_realm', name: 'ep8_realm_ember' }),
  enemy('e_cw', 35, 13, 'gnawing_bookworm', 'e8l1_worms', 'guard'),
  // ---- D: The Side Alcove (optional)
  popbook('pb_d', 'd', 6, 18),
  chest('chest_page2', 9, 9, 'iron', { item: 'drift_page', flag: 'drift_2_found', if: 'drift_started' }),
  chest('chest_page2_alt', 9, 9, 'iron', { item: 'hi_ether', ifNot: 'drift_started' }),
  object('stack_d', 3, 9, 'drawer_stack_dash', { breakable: 'rock', text: 'ep8_dash_drawers', opens: [[3, 9]] }),
  chest('chest_boots', 3, 8, 'gold', { item: 'margin_boots_set', behind: 'stack_d' }),
  enemy('e_dw', 6, 11, 'catalog_wraith', 'e8l1_wraiths', 'guard'),
  // ---- E: The Northern Shelf
  popbook('pb_hollow', 'h', 22, 4, { sprite: 'popbook_realm_ew', name: 'ep8_realm_hollow' }),
  chest('chest_key', 13, 3, 'gold', { item: 'ink_key', flag: 'ink_key_found' }),
  sign('north_shelf_sign', 14, 2, 'ep8_north_shelf', { solid: false, dir: 'up' }),
  object('stack_e', 16, 6, 'drawer_stack_dash', { breakable: 'rock', text: 'ep8_dash_drawers', opens: [[16, 6]] }),
  chest('chest_page3', 16, 7, 'wood', { item: 'drift_page', flag: 'drift_3_found', if: 'drift_started', behind: 'stack_e' }),
  chest('chest_page3_alt', 16, 7, 'wood', { item: 'hi_potion', ifNot: 'drift_started', behind: 'stack_e' }),
  chest('chest_cache', 37, 3, 'iron', { gold: 1500, item: 'hi_ether', qty: 1 }),
  enemy('e_em', 30, 4, 'index_hound', 'e8l1_mixed', 'guard'),
  trigger('lift_trig', 28, 4, 1, 1, 'library_f1_lift', { if: 'lib_f1_arrived', ifNot: 'library_f1_done' }),
  lift('lift_up', 28, 3, ['ep8_library_f2', 5, 27, 'up']),
];

export default {
  id: 'ep8_library_f1', name: 'The Catalog of Lost Lives', area: 'dungeon',
  music: 'first_library', ambience: 'library_hush', tileset: 'ep8',
  lighting: { tint: 'dawn', dark: 0 },   // the warm gold cast (plan 2.1); floor III, untinted, reads brighter
  under: 'void_violet',
  legend: { _: 'void_violet', p: 'parchment', g: 'goldscript', '#': 'drawer_wall_top', '|': 'drawer_wall_face',
    o: 'drawer_wall_out_face', v: 'drawer_wall_out_top', '.': 'parchment' },   // '.': the floor a Dash carves, never the void
  ground,
  popbooks: POPBOOKS,
  overlays: stoneStairs(19, 21, 29),
  decor,
  overhead: [],
  events,
  exits: [],
  marks: {
    start: [20, 27], arrival: [20, 27], font: [22, 26], lift_l1_up: [18, 26], shortcut_in: [22, 26],
    crossing: [17, 19], a_face: [21, 19],
    doorway_alcove: [13, 16], fk_door_m: [13, 15], nox_alcove: [15, 16],
    alcove_stage: [14, 18], alcove_stage_m: [13, 18], alcove_stage_b: [15, 18],
    traveler_in_m: [12, 15], traveler_past_m: [15, 15],
    island: [21, 11], b_face: [24, 10],
    wall_behind: [33, 12], ember_face: [33, 9],
    side_alcove: [6, 11], d_face: [6, 19], dash_d: [4, 9],
    north_shelf: [13, 4], hollow_face: [23, 4], dash_e: [16, 5],
    lift_up: [28, 4], lift_down_in: [29, 4],
  },
  start: { x: 20, y: 27, dir: 'up' },
};
