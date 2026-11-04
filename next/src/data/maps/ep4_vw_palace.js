// The Regent's Hall (Valewyn). EPISODE4_PLAN 4.3: the Chapel of the Twelve Bells' layout and exit (chapel.js), re-dressed
// as an audience hall: the long table of decrees under the tall windows with the Regent behind it (regent_e, then lyra_n
// on the same spot), petitioners' benches either side of the blue carpet, the archive wing on the right with the royal
// shelf and Dorian, and the hand-bell by the archive door (the save point). regent_trig is the row two tiles in from the
// door (row 11, the whole nave), so the scene starts however the party walks in.
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
  '#................#', // 10  doorway into the archive wing at (11,10)
  '#..........#.....#', // 11
  '#..........#######', // 12
  '#########.########', // 13  door at (9,13)
  '##################', // 14
]);

export default {
  id: 'ep4_vw_palace', name: "The Regent's Hall", area: 'interior',
  music: 'valewyn', ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  under: 'stone_floor',
  legend: { '#': 'interior_stone_top', '|': 'interior_stone_face', '.': 'stone_floor' },
  ground,
  overlays: [
    { t: 'window_in_curtain_blue', x: 2, y: 1 }, { t: 'window_in_curtain_blue', x: 5, y: 1 }, { t: 'window_in_curtain_blue', x: 8, y: 1 },
    { t: 'window_in', x: 14, y: 1 },
    ...[5, 6].flatMap((x) => [6, 7, 8, 9, 10, 11, 12].map((y) => ({ t: 'carpet_blue', x, y }))),
    { t: 'carpet_blue', x: 9, y: 13 }, { t: 'carpet_blue', x: 9, y: 12 }, { t: 'carpet_blue', x: 8, y: 12 }, { t: 'carpet_blue', x: 7, y: 12 },
    { t: 'in_pot', x: 1, y: 3 }, { t: 'in_pot', x: 10, y: 3 }, { t: 'in_crate', x: 16, y: 11 },
  ],
  decor: [
    { t: 'reading_table_long', x: 4, y: 5 },       // the long table of decrees
    { t: 'candelabra', x: 2, y: 4 }, { t: 'candelabra', x: 8, y: 4 },
    // petitioners' benches, two columns with the aisle between
    { t: 'bench', x: 2, y: 8 }, { t: 'bench', x: 8, y: 8 },
    { t: 'bench', x: 2, y: 10 }, { t: 'bench', x: 8, y: 10 },
    // the archive wing: the royal shelf, a reading desk
    { t: 'shelf_a', x: 13, y: 4 }, { t: 'shelf_a', x: 15, y: 4 },
    { t: 'desk', x: 14, y: 7 },
    { t: 'candelabra', x: 16, y: 8 },
    { t: 'signboard', x: 12, y: 11 },              // the hand-bell stand
  ],
  overhead: [],
  events: [
    trigger('regent_trig', 1, 11, 10, 1, 'regent_hall'),
    npc('regent_e', 5, 4, 'down'),
    npc('lyra_n', 5, 4, 'down'),
    npc('dorian', 14, 5, 'down'),
    door('palace_exit', 9, 13, ['ep4_valewyn', 21, 14, 'down']),
    { id: 'save_bell_vw', type: 'save', x: 12, y: 11, text: 'save_bell' },
    sign('decree_table', 4, 5, 'ep4_decree_table', { w: 3 }),
    sign('archive_shelf', 13, 4, 'ep4_archive_shelf'),
    book('vw_records_book', 15, 4, 'vw_records', { if: 'council_records' }),
  ],
  exits: [],
  marks: { regent_spot: [5, 4], table: [5, 6], dorian_spot: [14, 5] },
  start: { x: 9, y: 12, dir: 'up' },
};
