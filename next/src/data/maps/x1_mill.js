// Hal's Mill (16 x 12, interior). EXPANSION1_PLAN 4.8; X1-maps-south. Laid out like the bakery and the inn: wall rows 0..2,
// floor rows 3..9, the door gap in the south wall (8,10).
//
// Lived in, not a shrine. The working half (west): two millstones, the hopper on its trestle, the flour bin, sacks, the loft
// ladder. The living half (east): the hearth, a bed, and Hal's table with four bowls and four sacks set out for a brother he
// could not name (`x1_flour_table`, inspect). The ledger (`mill_ledger_obj`) stands on a lectern between the two halves: an
// `object` that runs `list_ledger` (a `book` event cannot run a scene; the pages stay in BOOKS as `mill_ledger`). After
// `mill_done` four rolls sit on the windowsill (`x1_sill_rolls`).
import { rows, door, object } from './_kit.js';

const ground = rows([
  //0123456789012345
  '################', // 0
  '#||||||||||||||#', // 1
  '#||||||||||||||#', // 2
  '#..............#', // 3
  '#..............#', // 4
  '#..............#', // 5
  '#..............#', // 6
  '#..............#', // 7
  '#..............#', // 8
  '#..............#', // 9
  '########.#######', // 10  door gap at (8,10)
  '################', // 11
]);

export default {
  id: 'x1_mill', name: "Hal's Mill", area: 'interior',
  music: 'millrace', ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  under: 'wood_floor',
  legend: { '#': 'interior_stone_top', '|': 'interior_stone_face', '.': 'wood_floor' },
  ground,
  overlays: [
    { t: 'window_in', x: 3, y: 1 }, { t: 'window_in', x: 8, y: 1 }, { t: 'window_in', x: 12, y: 1 },
    { t: 'in_sacks', x: 1, y: 3 }, { t: 'in_sacks', x: 2, y: 3 }, { t: 'in_sacks', x: 1, y: 4 },
    { t: 'in_barrel', x: 14, y: 8 }, { t: 'in_crate', x: 1, y: 9 }, { t: 'in_pot', x: 14, y: 4 },
    { t: 'chair_right', x: 9, y: 7 }, { t: 'chair_left', x: 12, y: 7 }, { t: 'chair_up', x: 11, y: 8 },
  ],
  decor: [
    { t: 'x1_hopper', x: 4, y: 5 },                       // the hopper on its trestle, over the near millstones
    { t: 'x1_millstones', x: 4, y: 7 }, { t: 'x1_millstones', x: 6, y: 9 },
    { t: 'x1_flour_bin', x: 1, y: 6 }, { t: 'x1_sack_stack', x: 2, y: 8 },
    { t: 'x1_loft_ladder', x: 6, y: 3 },                  // the ladder to the loft (decor)
    { t: 'x1_flour_sacks', x: 4, y: 9 },
    { t: 'hearth', x: 12, y: 3 },                          // Hal's hearth, a kettle on it
    { t: 'bed_single', x: 14, y: 6 },
    { t: 'rug_round', x: 11, y: 6 },
  ],
  overhead: [],
  events: [
    door('mill_exit', 8, 10, ['x1_millrace', 28, 15, 'down']),
    // Hal's table: four bowls, four sacks (a flag-driven line: `mill_done` settles it)
    object('x1_flour_table', 10, 7, 'x1_flour_table', { text: 'x1_flour_table' }),
    // the ledger on its lectern: thirty years of customers; reading it sets `list_ledger` while `list_started`
    object('mill_ledger_obj', 8, 5, 'lectern', { script: 'list_ledger', solid: true }),
    // four rolls on the windowsill once the wheel turns again (a bread shelf under the middle window)
    object('x1_sill_rolls', 8, 3, 'shelf_bread', { text: 'x1_flour_table', if: 'mill_done' }),
  ],
  exits: [],
  marks: { door: [8, 9], table: [10, 8], ledger: [8, 6], stones: [5, 8] },
  start: { x: 8, y: 9, dir: 'up' },
};
