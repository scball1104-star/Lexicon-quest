// The Keeper's Quiet Rooms (EPISODE8_PLAN 4.3): the Lantern Inn's layout and exits (inn.js), re-dressed for the Scriptorium:
// book-lined walls, beds under the shelves up the stair, a reading lamp, the Scriptorium Host behind the counter (inn, 160
// gold). inn_bed (17,7) is a rest mark. Every text key is Episode 8's own. Fits one screen (22 x 13): the camera rule is exempt.
// Exact cells in docs/MAPS_EP8_A.md 4.
import { rows, npc, door, sign, stairs } from './_kit.js';

const ground = rows([
  //0         1         2
  //0123456789012345678901
  '######################', // 0
  '#||||||||||||#||||||||', // 1
  '#||||||||||||#||||||||', // 2
  '#............#.......#', // 3
  '#............#.......#', // 4
  '#.CCCCCC.....#.......#', // 5
  '#............#.......#', // 6
  '#............#.......#', // 7
  '#............#.......#', // 8
  '#............#.......#', // 9
  '#............#########', // 10
  '##########..##########', // 11   door at (10..11,11)
  '######################', // 12
]);

export default {
  id: 'ep8_sc_inn', name: "The Keeper's Quiet Rooms", area: 'interior',
  music: 'scriptorium_town', ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  under: 'wood_floor',
  legend: { '#': 'interior_wood_top', '|': 'interior_wood_face', '.': 'wood_floor', 'C': 'counter' },
  ground,
  overlays: [
    { t: 'window_in_curtain_blue', x: 3, y: 1 }, { t: 'window_in_curtain_blue', x: 9, y: 1 },
    { t: 'window_in_night', x: 17, y: 1 },
    { t: 'in_sacks', x: 1, y: 9 }, { t: 'in_crate', x: 12, y: 9 },
    { t: 'chair_right', x: 3, y: 8 }, { t: 'chair_left', x: 7, y: 8 },
    { t: 'carpet_blue', x: 10, y: 11 }, { t: 'carpet_blue', x: 11, y: 11 },
  ],
  decor: [
    { t: 'shelf_a', x: 1, y: 3 }, { t: 'shelf_b', x: 6, y: 3 },   // books behind the counter
    { t: 'book_stack', x: 8, y: 3 },
    { t: 'table_long', x: 4, y: 8 },
    { t: 'reading_table', x: 8, y: 7 },
    { t: 'lantern_hanging', x: 9, y: 6 },                         // the reading lamp
    { t: 'stairs_in_up', x: 11, y: 2 },
    { t: 'stairs_in_down', x: 15, y: 2 },
    // the rooms: beds under book-lined walls
    { t: 'shelf_wide', x: 17, y: 3 }, { t: 'shelf_a', x: 20, y: 3 },
    { t: 'bed_single', x: 15, y: 6 }, { t: 'bed_single', x: 18, y: 6 }, { t: 'bed_single', x: 20, y: 6 },
    { t: 'book_stack', x: 16, y: 9 }, { t: 'rug_round', x: 17, y: 4 },
  ],
  overhead: [],
  events: [
    npc('ep8_innkeeper', 3, 4, 'down'),
    door('inn_exit', 10, 11, ['ep8_scriptorium', 5, 21, 'down'], { w: 2 }),
    stairs('inn_up', 11, 2, ['ep8_sc_inn', 15, 2, 'down']),
    stairs('inn_down', 15, 2, ['ep8_sc_inn', 11, 2, 'down']),
    sign('inn_sign', 7, 5, 'sign_ep8_inn', { solid: false }),
    { id: 'inn_lamp', type: 'light', x: 9, y: 6, r: 3, color: '#f9d77a' },
  ],
  exits: [],
  marks: { counter: [3, 4], inn_bed: [17, 7] },
  start: { x: 10, y: 10, dir: 'up' },
};
