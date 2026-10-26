// The Orrery (16 x 14, interior): a Keeper's observatory under a brass dome (EXPANSION1_PLAN 4.5).
//
// A round room cut to the grid (the four corners are clipped): pale star-tile floor with an inlaid ring under the great
// armillary (two states: three stars dark, then aligned), Hesper at her telescope on the east side, the drafting desk and the
// ledger shelf on the west, the star plate in the north face and, behind it once Mira has Appraised it, the drawer with the
// chest. The hatch in the north-east floor is sealed until `orrery_aligned`, then it is a stair down to the Cellar.
//
// Pack file: loaded by the `x1` pack on first entry (src/game/packs.js); tile and object ids are the x1 fragment's.
import { grid, box, put, rows, door, sign, book, object, chest, npc, enter, light } from './_kit.js';

const W = 16, H = 14;
const g = grid(W, H, '#');
// the room: faces on rows 1..2 above the floor (rows 3..12), corners clipped, the exit gap in the south wall at (8,13)
box(g, 2, 1, 13, 2, '|');
box(g, 2, 3, 13, 3, '.');
box(g, 1, 4, 14, 11, '.');
box(g, 2, 12, 13, 12, '.');
put(g, 8, 13, '.');
// the star inlay under the great armillary
box(g, 6, 6, 9, 9, 'i');
const ground = rows(g);

const overlays = [
  // night windows in the north face: the dome's own sky
  { t: 'window_in_night', x: 8, y: 1 }, { t: 'window_in_night', x: 11, y: 1 },
  { t: 'window_in_night', x: 2, y: 1 },
];

const decor = [
  { t: 'rug_round', x: 7, y: 11 },                             // before the door
  { t: 'x1_drafting_desk', x: 2, y: 8 },                       // Hesper's desk and star chart, west wall
  { t: 'bookshelf', x: 3, y: 3 },                              // the ledger shelf (the `book` event stands on it)
  { t: 'x1_telescope', x: 12, y: 6 },                          // the telescope; Hesper stands beside it
  { t: 'candelabra', x: 7, y: 3 }, { t: 'candelabra', x: 10, y: 3 },
  { t: 'candelabra', x: 2, y: 11 }, { t: 'candelabra', x: 13, y: 11 },
  { t: 'book_stack', x: 2, y: 5 },
];

const events = [
  enter('orrery_enter', 'hesper_meet'),
  light('light_dome', 8, 7, 8, '#bfe6ff'),
  // the great Orrery: two states, one event each (the swap is a flag)
  object('x1_armillary', 7, 8, 'x1_armillary', { text: 'x1_armillary', state: 0, ifNot: 'orrery_aligned' }),
  object('x1_armillary_lit', 7, 8, 'x1_armillary', { text: 'x1_armillary', state: 1, if: 'orrery_aligned' }),
  npc('hesper', 11, 6, 'right'),
  book('keeper_star_ledger', 3, 3, 'keeper_star_ledger', { solid: false }),
  // the star plate in the north face (an Appraise object; the drawer behind it holds the chest)
  object('x1_star_plate', 5, 2, 'x1_star_plate', { text: 'x1_star_plate', appraise: true, appraiseText: 'appraise_star_plate', appraiseBark: false }),
  chest('chest_orrery', 6, 3, 'wood', { item: 'ether', qty: 3, behind: 'appraise:x1_star_plate' }),
  // the hatch: sealed until the stars are aligned, then a stair to the Cellar (its landing is (3,14) in x1_cellar)
  object('x1_hatch', 12, 4, 'x1_hatch_closed', { text: 'x1_hatch', ifNot: 'orrery_aligned' }),
  object('x1_hatch_open', 12, 4, 'x1_hatch_open', { text: 'x1_hatch', if: 'orrery_aligned', solid: false }),
  door('hatch_stair', 12, 4, ['x1_cellar', 3, 14, 'down'], { kind: 'stairs', if: 'orrery_aligned' }),
  door('orrery_exit', 8, 13, ['x1_terrace', 32, 10, 'down']),
];

export default {
  id: 'x1_orrery', name: "The Orrery", area: 'interior',
  music: 'orrery', ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  under: 'x1_cellar_floor',
  legend: { '#': 'interior_stone_top', '|': 'interior_stone_face', '.': 'x1_cellar_floor', 'a': 'x1_cellar_slate', 'i': 'x1_cellar_inlay' },
  ground,
  overlays,
  decor,
  overhead: [],
  events,
  exits: [],
  marks: { hesper: [11, 6], orrery: [8, 8], plate: [5, 4], hatch: [12, 5], door: [8, 12] },
  start: { x: 8, y: 12, dir: 'up' },
};
