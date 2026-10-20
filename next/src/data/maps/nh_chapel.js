// Chapel of the Candles (the Nameless Hollow). EPISODE2_PLAN 4.3: Willowmere's chapel layout and exit, re-dressed.
// Pews; the register lectern (the white line) where the altar would be, Anwen beside it; forty-one candles
// (candelabra) along the walls; in the tower base a bell rope hanging from an empty frame; the small silver hand-bell by
// the door (save point). After the Mirror Sigil the tall Keeper mirror between the candles opens to Willowmere's chapel.
import { rows, npc, door, sign, book, trigger, mirrorDoor, dullMirror } from './_kit.js';

const ground = rows([
  //0         1
  //012345678901234567
  '##################', // 0
  '#||||||||||#|||||#', // 1
  '#||||||||||#|||||#', // 2
  '#..........#.....#', // 3
  '#....cc....#.....#', // 4
  '#....cc....#.....#', // 5
  '#....cc....#.....#', // 6
  '#....cc....#.....#', // 7
  '#....cc....#.....#', // 8
  '#....cc....#.....#', // 9
  '#....cc..........#', // 10  doorway into the tower base at (11,10)
  '#....cc....#.....#', // 11
  '#....cc....#######', // 12
  '#########.########', // 13  door at (9,13)
  '##################', // 14
]);

export default {
  id: 'nh_chapel', name: 'Chapel of the Candles', area: 'interior',
  music: [{ if: 'nh_restored', id: 'hollowmere' }, { id: 'hollow' }], ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  under: 'stone_floor',
  legend: { '#': 'interior_stone_top', '|': 'interior_stone_face', '.': 'stone_floor', 'c': 'carpet_blue' },
  ground,
  overlays: [
    { t: 'window_in_night', x: 2, y: 1 }, { t: 'window_in_night', x: 9, y: 1 }, { t: 'window_in', x: 14, y: 1 },
  ],
  decor: [
    { t: 'lectern', x: 5, y: 3 },                           // the register
    // forty-one candles: candelabra along both walls and before the lectern
    { t: 'candelabra', x: 1, y: 3 }, { t: 'candelabra', x: 3, y: 3 }, { t: 'candelabra', x: 8, y: 3 }, { t: 'candelabra', x: 10, y: 3 },
    { t: 'candelabra', x: 1, y: 6 }, { t: 'candelabra', x: 10, y: 6 }, { t: 'candelabra', x: 1, y: 9 }, { t: 'candelabra', x: 10, y: 9 },
    // pews, two columns with the aisle between
    { t: 'bench', x: 2, y: 6 }, { t: 'bench', x: 8, y: 6 },
    { t: 'bench', x: 2, y: 8 }, { t: 'bench', x: 8, y: 8 },
    { t: 'bench', x: 2, y: 10 }, { t: 'bench', x: 8, y: 10 },
    // tower base: the stair up to the empty frame
    { t: 'stairs_in_up', x: 15, y: 2 },
    { t: 'candelabra', x: 12, y: 3 }, { t: 'candelabra', x: 16, y: 5 },
    { t: 'signboard', x: 12, y: 11 },                       // the hand-bell stand
    { t: 'reading_table', x: 15, y: 9 },
  ],
  overhead: [],
  events: [
    npc('anwen', 4, 4, 'down'),
    door('chapel_exit', 9, 13, ['nameless_hollow', 32, 30, 'down']),
    trigger('anwen_trig', 8, 11, 3, 1, 'anwen_register'),
    { id: 'save_bell', type: 'save', x: 12, y: 11, text: 'nh_save_bell' },
    sign('register', 5, 3, 'register'),
    book('register_page', 15, 9, 'nh_register_page', { solid: false }),
    sign('nh_candles', 3, 3, 'nh_candles', { solid: false }),
    sign('nh_bell_frame', 13, 2, 'nh_bell_frame', { solid: false }),
    // the Keeper mirror between the candles: dull until the Mirror Sigil, then a door to Willowmere's chapel
    dullMirror('chapel_mirror', 9, 3, 'mirror_sigil_get', 'nh_chapel_mirror'),
    mirrorDoor('mirror_nh_wm', 9, 3, ['chapel', 4, 4, 'down'], 'mirror_sigil_get'),
  ],
  exits: [],
  marks: { anwen_spot: [4, 4], register: [5, 3] },
  start: { x: 9, y: 12, dir: 'up' },
};
