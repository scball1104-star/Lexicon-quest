// The Armillary Tower (Saffron Haven). EPISODE5_PLAN 4.4: the Chapel of the Twelve Bells' layout and exit (chapel.js),
// re-dressed as the star readers' hall at night: the great rings (armillary_rings, 3 x 3) in the nave with Laleh beside
// them, a blue runner from the door to the rings, star charts on every wall in two states (Laleh's empty space; a star in
// it from chart_restored), candles, the reading wing on the right with the Haven Charts and the hand-bell (the save point).
// reading_trig is the whole nave row two tiles in from the door (row 11), so star_reading starts however the party walks
// in once Sel has asked them up (met_sel). Exact cells in docs/MAPS_EP5_A.md section 5.
import { rows, npc, door, sign, trigger, book } from './_kit.js';

const ground = rows([
  //0         1
  //012345678901234567
  '##################', // 0
  '#||||||||||#|||||#', // 1
  '#||||||||||#|||||#', // 2
  '#..........#.....#', // 3
  '#..........#.....#', // 4
  '#..........#.....#', // 5
  '#..........#.....#', // 6
  '#..........#.....#', // 7
  '#..........#.....#', // 8
  '#..........#.....#', // 9
  '#................#', // 10  doorway into the reading wing at (11,10)
  '#..........#.....#', // 11
  '#..........#######', // 12
  '#########.########', // 13  door at (9,13)
  '##################', // 14
]);

const CH = 'chart_restored';
const charts = (id, x, y) => [
  sign(id, x, y, 'ep5_star_charts', { w: 2, sprite: 'star_charts', state: 0, ifNot: CH }),
  sign(`${id}_new`, x, y, 'ep5_star_charts', { w: 2, sprite: 'star_charts', state: 1, if: CH }),
];

export default {
  id: 'ep5_sh_observatory', name: 'The Armillary Tower', area: 'interior',
  music: 'orrery', ambience: null, tileset: 'interior',
  lighting: { tint: 'night', dark: 0 },
  under: 'stone_floor',
  legend: { '#': 'interior_stone_top', '|': 'interior_stone_face', '.': 'stone_floor' },
  ground,
  overlays: [
    { t: 'window_in_night', x: 5, y: 1 }, { t: 'window_in_night', x: 13, y: 1 },
    // the blue runner from the door to the rings
    ...[9].flatMap((x) => [8, 9, 10, 11, 12, 13].map((y) => ({ t: 'carpet_blue', x, y }))),
    ...[5, 6, 7, 8].map((x) => ({ t: 'carpet_blue', x, y: 8 })),
    { t: 'in_pot', x: 1, y: 3 }, { t: 'in_pot', x: 10, y: 3 }, { t: 'in_crate', x: 16, y: 11 },
  ],
  decor: [
    { t: 'armillary_rings', x: 4, y: 6 },           // footprint (4..6, 6) and (5,5)
    { t: 'candelabra', x: 2, y: 4 }, { t: 'candelabra', x: 8, y: 4 },
    { t: 'rug_saffron', x: 1, y: 11 },
    // the reading wing: shelves of charts, a reading desk
    { t: 'shelf_a', x: 13, y: 4 }, { t: 'shelf_a', x: 15, y: 4 },
    { t: 'desk', x: 14, y: 7 },
    { t: 'candelabra', x: 16, y: 8 },
    { t: 'signboard', x: 12, y: 11 },              // the hand-bell stand
  ],
  overhead: [],
  events: [
    trigger('reading_trig', 1, 11, 10, 1, 'star_reading', { if: 'met_sel' }),
    npc('laleh', 5, 7, 'down'),
    door('tower_exit', 9, 13, ['ep5_saffron', 26, 14, 'down']),
    { id: 'save_bell_tower', type: 'save', x: 12, y: 11, text: 'save_bell' },
    ...charts('charts_west', 2, 2), ...charts('charts_east', 7, 2), ...charts('charts_wing', 15, 2),
    sign('rings_sign', 4, 6, 'ep5_rings', { w: 3, solid: false }),
    book('haven_charts_book', 14, 7, 'haven_charts'),
  ],
  exits: [],
  marks: {
    laleh_spot: [5, 7], rings: [7, 6], nasrin_spot: [7, 7], door_sel: [8, 12],
    reading_stage: [5, 9], reading_stage_m: [4, 9], reading_stage_b: [6, 9],
  },
  start: { x: 9, y: 12, dir: 'up' },
};
