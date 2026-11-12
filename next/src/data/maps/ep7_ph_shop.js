// Northwind Provisions (Palehaven). EPISODE7_PLAN 4.4: Willowmere Goods' layout and exit (item_shop.js), re-dressed: drying
// herbs on the shelves, sacks of tea, a kettle always on the stove, Maera behind the counter (shop northwind). Every text key
// is Episode 7's own. Exact cells in docs/MAPS_EP7_A.md 5. Fits one screen (12 x 12): exempt.
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
  id: 'ep7_ph_shop', name: 'Northwind Provisions', area: 'interior',
  music: 'palehaven', ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  under: 'wood_floor',
  legend: { '#': 'interior_top', '|': 'interior_face', '.': 'wood_floor', 'C': 'counter' },
  ground,
  overlays: [
    { t: 'window_in', x: 9, y: 1 },
    { t: 'in_sacks', x: 1, y: 3 }, { t: 'in_sacks', x: 1, y: 4 }, { t: 'in_crate', x: 2, y: 3 },
    { t: 'in_pot', x: 10, y: 3 }, { t: 'in_barrel', x: 10, y: 4 },
    { t: 'in_crate', x: 10, y: 8 }, { t: 'in_sacks', x: 10, y: 9 }, { t: 'in_pot', x: 9, y: 9 },
    { t: 'in_barrel', x: 1, y: 9 }, { t: 'carpet_blue', x: 7, y: 10 },
  ],
  decor: [
    { t: 'shelf_potions', x: 3, y: 3 }, { t: 'shelf_bread', x: 5, y: 3 }, { t: 'shelf_potions', x: 7, y: 3 },
    { t: 'courier_stove', x: 8, y: 8, state: 1 },   // the kettle's stove, always on
    { t: 'rug_round', x: 4, y: 8 },
  ],
  overhead: [],
  events: [
    npc('maera', 5, 4, 'down'),
    door('shop_exit', 7, 10, ['ep7_palehaven', 37, 18, 'down']),
    sign('northwind_sign', 2, 7, 'sign_ep7_shop', { solid: false }),
  ],
  exits: [],
  marks: { counter: [5, 4] },
  start: { x: 7, y: 9, dir: 'up' },
};
