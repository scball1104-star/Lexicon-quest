// The Riverbank Provisioner (Valewyn). EPISODE4_PLAN 4.3: Willowmere Goods' layout and exit (item_shop.js), re-dressed:
// Linn helps behind the counter (shop riverbank), rope and lamp oil on the shelves, waxed ledgers stacked off the floor
// (the archivist's habit: everything high when the canal rises).
import { rows, npc, door, sign } from './_kit.js';

const ground = rows([
  //012345678901
  '############', // 0
  '#||||||||||#', // 1
  '#||||||||||#', // 2
  '#..........#', // 3
  '#..........#', // 4
  '#.CCCCCCC..#', // 5
  '#..........#', // 6
  '#..........#', // 7
  '#..........#', // 8
  '#..........#', // 9
  '#######.####', // 10  door at (7,10)
  '############', // 11
]);

export default {
  id: 'ep4_vw_shop', name: 'Riverbank Provisioner', area: 'interior',
  music: 'valewyn', ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  under: 'wood_floor',
  legend: { '#': 'interior_top', '|': 'interior_face', '.': 'wood_floor', 'C': 'counter' },
  ground,
  overlays: [
    { t: 'window_in_curtain_blue', x: 9, y: 1 },
    { t: 'in_crate', x: 1, y: 3 }, { t: 'in_crate', x: 1, y: 4 }, { t: 'in_sacks', x: 2, y: 3 },
    { t: 'in_barrel', x: 10, y: 3 }, { t: 'in_barrel', x: 10, y: 4 },
    { t: 'in_crate', x: 10, y: 8 }, { t: 'in_crate', x: 10, y: 9 }, { t: 'in_sacks', x: 9, y: 9 },
    { t: 'in_barrel', x: 1, y: 9 }, { t: 'carpet_blue', x: 7, y: 10 },
  ],
  decor: [
    { t: 'shelf_potions', x: 3, y: 3 }, { t: 'shelf_a', x: 5, y: 3 }, { t: 'shelf_potions', x: 7, y: 3 },
    { t: 'book_stack', x: 9, y: 3 },
    { t: 'rug_round', x: 4, y: 8 },
    { t: 'signboard', x: 2, y: 7 },
  ],
  overhead: [],
  events: [
    npc('linn', 5, 4, 'down'),
    door('shop_exit', 7, 10, ['ep4_valewyn', 38, 18, 'down']),
    sign('vw_shop_sign', 2, 7, 'sign_ep4_shop'),
  ],
  exits: [],
  marks: { counter: [5, 4] },
  start: { x: 7, y: 9, dir: 'up' },
};
