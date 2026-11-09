// Saffron Caravan Supplies (Saffron Haven). EPISODE5_PLAN 4.4: Willowmere Goods' layout and exit (item_shop.js),
// re-dressed: Yasmin behind the counter (shop saffron_supplies), bolts of saffron cloth on stands along the back wall, water
// jars, a saffron rug, a hanging lamp. Exact cells in docs/MAPS_EP5_A.md section 5.
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
  id: 'ep5_sh_shop', name: 'Saffron Caravan Supplies', area: 'interior',
  music: 'saffron', ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  under: 'wood_floor',
  legend: { '#': 'interior_top', '|': 'interior_face', '.': 'wood_floor', 'C': 'counter' },
  ground,
  overlays: [
    { t: 'window_in_curtain_red', x: 9, y: 1 },
    { t: 'in_sacks', x: 1, y: 8 }, { t: 'in_sacks', x: 1, y: 9 },
    { t: 'in_crate', x: 10, y: 8 }, { t: 'in_crate', x: 10, y: 9 }, { t: 'in_pot', x: 9, y: 9 },
    { t: 'carpet_red', x: 7, y: 10 },
  ],
  decor: [
    { t: 'cloth_bolts', x: 1, y: 3 }, { t: 'cloth_bolts', x: 2, y: 3 }, { t: 'cloth_bolts', x: 3, y: 3 },
    { t: 'shelf_potions', x: 5, y: 3 },
    { t: 'cloth_bolts', x: 8, y: 3 },
    { t: 'water_jars', x: 10, y: 3 }, { t: 'water_jars', x: 10, y: 4 },
    { t: 'rug_saffron', x: 4, y: 8 },
    { t: 'lantern_hanging', x: 6, y: 7 },
  ],
  overhead: [],
  events: [
    npc('yasmin', 5, 4, 'down'),
    door('shop_exit', 7, 10, ['ep5_saffron', 40, 20, 'down']),
    sign('supplies_sign', 8, 5, 'sign_ep5_shop', { solid: false }),
  ],
  exits: [],
  marks: { counter: [5, 4] },
  start: { x: 7, y: 9, dir: 'up' },
};
