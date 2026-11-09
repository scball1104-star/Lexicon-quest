// The Oracle Labyrinth, II: Gallery of False Horizons (40 x 30, dungeon, roofed, dark 0.4, start dawn). EPISODE5_PLAN 4.7;
// exact cells and every solution in docs/MAPS_EP5_B.md. Indoors the rule turns over: the dark holds the sand and the
// light runs it. Tall horizon windows in the side walls throw shafts along their rows (east windows at dawn, west windows
// at dusk); at noon only two high oculi light single cells. A pillar in a shaft shades every cell behind it.
//
//   A  the Stair Foot (south-west): the stair up to Floor I (3..4,22), arrival (4,24), the spring font, dial_a. North
//      through the gap into the foot of the hall.
//   B  the Long Shafts (puzzle B): a sand hall x 2..14, rows 9..19. Two shafts cross it: row 9 and row 13, each with a
//      west window (dusk) and an east window (dawn). A balustrade of low blocks (row 14) closes the hall's foot except two gaps: the
//      walk gap (13,14) under the oculus cell (13,13), and the groove gap (14,14) under the stub pillar (14,12). The pillar
//      pl_b stands on its groove (14,13..16) at (14,15): Shove it north twice into the lower shaft at dawn and the whole
//      shaft west of it falls dark: walk up through (13,14). (Dusk lights the shaft from the other side, noon the oculus:
//      only dawn and the pillar cross.) The middle of the hall is never lit. The upper shaft has a fixed pillar (8,9): at
//      dawn its shade lies west (the way north into the map table room), at dusk east, where the iron chest waits in its
//      niche (12,8) over the second oculus (12,9). dial_b in the middle. One group.
//      The map table room (x 2..7, rows 3..8): memory2_trig (sel_memory_2), the table, its window. East along row 3 to C.
//   C  the Star Floor (x 18..28, rows 3..8): star-glass, painted horizons on the north face, vex_trig across its mouth so
//      the party stops two rows below Vex (vex_spot 23,4; party_stop 23,6). One group.
//   D  Two Windows (x 30..38, rows 4..21): three rooms down a column, cut by two shafts with a window at each end.
//      Upper (rows 4..6) -> shaft K1 (row 8, its only door from above the cell 35,8 under an oculus) -> middle (rows 9..14)
//      -> shaft K2 (row 15, its only door below the cell 33,15 under an oculus) -> lower (rows 17..21). K1 has a fixed
//      pillar (32,8): only dusk throws its shade east over the door cell. K2's pillar pl_d stands on its groove
//      (36,13..15): Shove it south twice into the shaft and only dawn throws its shade west over the door cell. Two
//      windows, two hours, one pillar, and the order is forced by reach (dial_u up, dial_m in the middle). The Dune Key
//      in the lower room; the way out south to the approach. The Reliquary: a west window (29,6) lights the upper room's
//      floor at dusk, and there (31,6) the Lantern finds the names (reliquary_obj, only at dusk); its hidden door (31,3)
//      opens on the cache. One group.
//   E  the Mirror Hall (x 18..27, rows 12..20): door_e (the Dune Key) from the approach, knight_trig two rows below the
//      Knight (22,13). After the win: lab_f2_stair (22,12) and the stair down (22,11), the brass lift up to Floor I (25,11).
//      The approach (x 11..38, rows 25..27) holds the second spring font; its back door (12,24) into the hall's foot opens
//      from the approach once the Dune Key is found (the way home from the far side). One group.
// A game saved anywhere reloads (dawn, every pillar home) onto a floor it can walk out of: the middle and the north by
// way of D (dusk crosses K1 with its fixed pillar), the lower room and the approach by the back door.
// Solution for the bot: B: stand (14,16), Shove up; step (14,15), Shove up (pl_b at 14,13). Dawn (the start): north
// through (13,14), (13,13), into the middle; north up column 2..7 of row 9 into the map table room (memory2_trig). East
// along row 3, through vex_trig into C. East to D: dial_u dusk; through (35,7), (35,8) into the middle. Stand (36,12),
// Shove down; step (36,13), Shove down (pl_d at 36,15). dial_m dawn; through (33,15), (33,16) into the lower room;
// chest_key. South to the approach, door_e, knight_trig. After the win: stair_trig, stairs_f3. Optional: dial_b dusk from
// the middle, the niche chest from (12,9); dial_u dusk, the Lantern at reliquary_obj from (31,5), the cache.
import { door, sign, object, trigger, enemy, chest, lockedDoor, steps, enter, book, actor, light } from './_kit.js';
import { labGrid, labLegend, dial, stone, windowEv, oasisFont, backDoor, lift } from './ep5_lab_f1.js';

const W = 40, H = 30;
const L = labGrid(W, H);
const { set, box, room, sand } = L;

room(2, 3, 7, 8);                            //    the map table room (faces 1..2)
room(8, 3, 17, 3);                           //    its way east to C (faces 1..2)
room(18, 3, 28, 8, '*');                     // C  the Star Floor (faces 1..2)
room(2, 9, 14, 19);                          // B  the Long Shafts (faces 7..8 east of the table room)
room(2, 23, 9, 27);                          // A  the Stair Foot (faces 21..22)
room(30, 4, 38, 6);                          // D  upper (faces 2..3)
box(30, 8, 38, 15, '.');                     //    shaft K1, the middle, shaft K2
box(30, 17, 38, 21, '.');                    //    lower
room(18, 12, 27, 20);                        // E  the Mirror Hall (faces 10..11)
room(11, 25, 38, 27);                        //    the approach (faces 23..24)
// passages
box(7, 20, 8, 22, '.');                      // A -> the hall's foot
box(12, 20, 12, 24, '.');                    // the approach's back door (12,24) -> the hall's foot
box(29, 4, 29, 5, '.');                      // C -> D upper
set(35, 7, '.'); set(33, 16, '.');           // D: the shafts' doors
box(34, 22, 34, 24, '.');                    // D lower -> the approach
box(22, 21, 23, 24, '.');                    // the approach -> door_e (22..23,24) -> E
set(12, 8, '.');                             // B: the iron chest's niche
set(22, 11, '.'); set(25, 11, '.');          // E: the stair and the lift alcoves
box(30, 1, 32, 1, '.'); box(31, 2, 31, 3, '.');   // D upper: the Reliquary cache behind its door (31,3)
// the floor: star-glass under the Star Floor's inlay, paving round the dials and the groove approaches
box(19, 3, 28, 8, '*');
box(14, 13, 14, 16, 'g');                    // B: pl_b's groove
box(36, 13, 36, 15, 'g');                    // D: pl_d's groove
// sand: the hall (every row but the foot), and the two shafts of D
sand(2, 9, 14, 13); set(8, 9, '.'); set(14, 13, 'g');
box(3, 11, 5, 11, '.'); box(4, 10, 4, 12, '.');          // B middle: the dial's paving (dial 4,11 faced from 4,10 / 3,11 / 5,11 / 4,12)
box(10, 11, 12, 11, '.');                    // B middle: the group's paving
set(14, 12, '.');                            // the stub pillar's cell
sand(30, 8, 38, 8); set(32, 8, '.');
sand(30, 15, 38, 15); set(36, 15, 'g');

const R = L.finish();

// ---------------------------------------------------------------- dressing (no dressing stands in a shaft's row)
const decor = [
  // A
  { t: 'stairs_up', x: 3, y: 22 }, { t: 'water_jars', x: 9, y: 27 },
  // the map table room and C: painted horizons on the faces
  { t: 'map_table', x: 4, y: 5 },
  { t: 'painted_horizon', x: 3, y: 2, state: 1 },
  { t: 'painted_horizon', x: 19, y: 2, state: 0 }, { t: 'painted_horizon', x: 26, y: 2, state: 2 },
  { t: 'painted_horizon', x: 10, y: 2, state: 0 }, { t: 'painted_horizon', x: 14, y: 2, state: 2 },
  // D: horizons in the upper room, the lower room's jars
  { t: 'painted_horizon', x: 33, y: 3, state: 1 }, { t: 'water_jars', x: 38, y: 21 },
  // E: the Mirror Hall's horizons and the stair
  { t: 'painted_horizon', x: 19, y: 11, state: 0 }, { t: 'painted_horizon', x: 26, y: 11, state: 2 },
  { t: 'stair_sand_down', x: 22, y: 11 }, { t: 'lift_cage', x: 25, y: 11 },
  // the approach
  { t: 'painted_horizon', x: 15, y: 24, state: 1 }, { t: 'painted_horizon', x: 28, y: 24, state: 0 },
];

const events = [
  enter('l2_enter', 'lab_f2_arrival'),
  // ---- A: the Stair Foot
  door('stairs_f1', 3, 22, ['ep5_lab_f1', 13, 2, 'down'], { kind: 'stairs', w: 2 }),
  oasisFont('font_l2', 6, 24),
  dial('dial_a', 2, 26),
  // ---- B: the Long Shafts (puzzle B)
  windowEv('win_b1w', 1, 9, 'east', ['dusk'], { reach: 14 }),
  windowEv('win_b1e', 15, 9, 'west', ['dawn'], { reach: 14 }),
  windowEv('win_b2w', 1, 13, 'east', ['dusk'], { reach: 14 }),
  windowEv('win_b2e', 15, 13, 'west', ['dawn'], { reach: 14 }),
  windowEv('oc_b1', 12, 9, 'down', ['noon']),
  windowEv('oc_b2', 13, 13, 'down', ['noon']),
  stone('pl_b1', 8, 9, 2, { sprite: 'pillar_gallery' }),
  stone('pl_stub', 14, 12, 1, { sprite: 'pillar_gallery' }),   // h 1: a field entity covers h cells down from its anchor, and pl_b must reach (14,13)
  ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((x) => stone(`col_${x}`, x, 14, 1)),
  stone('pl_b', 14, 15, 2, { sprite: 'pillar_gallery', shove: true }),
  dial('dial_b', 4, 11),
  chest('chest_side', 12, 8, 'iron'),
  enemy('e_bm', 11, 11, 'silt_reaver', 'e5l2_mixed', 'guard'),
  sign('win_sign', 15, 13, 'ep5_window', { solid: false }),
  // ---- the map table room
  trigger('memory2_trig', 2, 8, 6, 1, 'sel_memory_2'),
  sign('table_sign', 4, 5, 'ep5_map_table', { solid: false }),
  windowEv('win_table', 1, 4, 'east', ['dusk'], { reach: 3 }),
  sign('horizon_sign', 3, 2, 'ep5_painted_horizon', { solid: false }),
  // ---- C: the Star Floor
  trigger('vex_trig', 19, 3, 1, 6, 'vex_gallery'),
  object('star_dim', 22, 6, 'star_floor', { state: 0, text: 'ep5_star_floor', solid: false, ifNot: 'star_restored' }),
  object('star_lit', 22, 6, 'star_floor', { state: 2, text: 'ep5_star_floor', solid: false, if: 'star_restored' }),
  object('feather', 23, 4, 'feather_glass', { text: 'ep5_feather_glass', solid: false, if: 'vex_gallery_met' }),
  sign('sea_sign', 19, 2, 'ep5_painted_horizon', { solid: false }),
  sign('city_sign', 26, 2, 'ep5_painted_city', { solid: false }),
  enemy('e_c', 26, 7, 'horizon_shade', 'e5l2_shades', 'guard'),
  light('l_star', 23, 5, 4, '#9fc4ff'),
  // ---- D: Two Windows (puzzle D)
  windowEv('win_k1w', 29, 8, 'east', ['dusk'], { reach: 9 }),
  windowEv('win_k1e', 39, 8, 'west', ['dawn'], { reach: 9 }),
  windowEv('win_k2w', 29, 15, 'east', ['dusk'], { reach: 9 }),
  windowEv('win_k2e', 39, 15, 'west', ['dawn'], { reach: 9 }),
  windowEv('oc_k1', 35, 8, 'down', ['noon']),
  windowEv('oc_k2', 33, 15, 'down', ['noon']),
  stone('pl_k1', 32, 8, 2, { sprite: 'pillar_gallery' }),
  stone('pl_d', 36, 13, 2, { sprite: 'pillar_gallery', shove: true }),
  dial('dial_u', 37, 5),
  dial('dial_m', 31, 11),
  enemy('e_m', 34, 11, 'tomorrow_husk', 'e5l2_husk', 'guard'),
  chest('chest_key', 37, 19, 'wood', { item: 'dune_key', flag: 'dune_key_f2' }),
  // the Reliquary (side story 2): lit only at dusk, read only by the Lantern
  windowEv('win_rel', 29, 6, 'east', ['dusk'], { reach: 3 }),
  object('reliquary_obj', 31, 6, 'reliquary', { script: 'reliquary', lantern: true, if: 'hour:dusk', ifNot: 'reliquary_found' }),
  ...backDoor('cache', 31, 3, 'reliquary_found'),
  chest('chest_cache', 30, 1, 'gold', { gold: 300, item: 'hi_ether', qty: 2, if: 'reliquary_found' }),
  book('book_log', 32, 1, 'travelers_log', { if: 'reliquary_found' }),
  // ---- the approach and E: the Mirror Hall
  oasisFont('font_l2b', 19, 26),
  chest('chest_ap', 11, 27, 'wood', { item: 'hi_potion', qty: 2 }),
  enemy('e_ap', 30, 26, 'silt_reaver', 'e5l2_mixed', 'patrol', { path: steps('left', 3, 'right', 3) }),
  ...backDoor('back_s', 12, 24, 'dune_key_f2'),
  lockedDoor('door_e', 22, 24, 'dune_key'),
  trigger('knight_trig', 18, 15, 10, 1, 'mirage_knight'),
  actor('mirage_knight', 22, 13, 'mirage_knight', 'down', { ifNot: 'knight_defeated', name: 'The Mirage Knight' }),
  trigger('stair_trig', 22, 12, 1, 1, 'lab_f2_stair', { if: 'knight_defeated' }),
  door('stairs_f3', 22, 11, ['ep5_lab_f3', 16, 3, 'down'], { kind: 'stairs', if: 'knight_defeated' }),
  lift('lift_f2_short', 25, 11, ['ep5_lab_f1', 24, 26, 'down'], { if: 'lab_f2_done' }),
  light('l_hall_w', 20, 16, 4, '#ffd9a0'), light('l_hall_e', 25, 16, 4, '#ffd9a0'),
];

export default {
  id: 'ep5_lab_f2', name: 'Gallery of False Horizons', area: 'dungeon',
  music: 'labyrinth', ambience: 'well_hush', tileset: 'ep5',
  lighting: { tint: 'none', dark: 0.4 },
  under: 'gallery_tile',
  legend: labLegend('horizon_gallery', 'gallery_tile', { 'v': 'horizon_gallery_top' }),
  ground: R.ground,
  shade: { hour: 'dawn', sand: R.sand, roof: true },
  overlays: [],
  decor,
  overhead: [],
  events,
  exits: [],
  marks: {
    arrival: [4, 24], start: [4, 24], font: [6, 25], dial_a: [3, 26], shafts: [8, 13], pillar_shove: [14, 16], walk_gap: [13, 14],
    middle: [6, 11], dial_b: [4, 10], niche: [12, 9],
    map_table: [4, 5], table_stage: [4, 6], table_stage_m: [3, 6], table_stage_b: [5, 6],
    table_student: [4, 4], table_tamir: [6, 5], table_traveler: [2, 5], table_window: [2, 4],
    star_floor: [23, 5], vex_spot: [23, 4], party_stop: [23, 6], party_stop_m: [22, 6], party_stop_b: [24, 6], star_socket: [23, 5],
    windows: [34, 11], dial_u: [36, 5], k1_door: [35, 7], dial_m: [31, 12], pl_d_shove: [36, 12], k2_door: [33, 16],
    reliquary: [31, 5], cache: [31, 2], approach: [24, 26],
    arena: [22, 16], knight_spot: [22, 13], stairs_down: [22, 12], lift: [25, 12],
  },
  start: { x: 4, y: 24, dir: 'down' },
};
