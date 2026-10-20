// Hollow Provisioner (the Nameless Hollow). EPISODE2_PLAN 4.3: Willowmere Goods' layout and exit, re-dressed. Fitch
// behind the counter (shop hollow_items); every shelf labeled twice.
import { rows, npc, door, sign } from './_kit.js';

const ground = rows([
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
  id: 'nh_shop', name: 'Hollow Provisioner', area: 'interior',
  music: [{ if: 'nh_restored', id: 'hollowmere' }, { id: 'hollow' }], ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  under: 'wood_floor',
  legend: { '#': 'interior_top', '|': 'interior_face', '.': 'wood_floor', 'C': 'counter' },
  ground,
  overlays: [
    { t: 'window_in_curtain_blue', x: 9, y: 1 },
    { t: 'in_crate', x: 1, y: 3 }, { t: 'in_crate', x: 1, y: 4 }, { t: 'in_sacks', x: 2, y: 3 },
    { t: 'in_barrel', x: 10, y: 3 }, { t: 'in_barrel', x: 10, y: 4 }, { t: 'in_pot', x: 9, y: 3 },
    { t: 'in_crate', x: 10, y: 8 }, { t: 'in_crate', x: 10, y: 9 }, { t: 'in_sacks', x: 9, y: 9 },
    { t: 'in_barrel', x: 1, y: 9 },
  ],
  decor: [
    { t: 'shelf_potions', x: 3, y: 3 }, { t: 'shelf_bread', x: 5, y: 3 }, { t: 'shelf_potions', x: 7, y: 3 },
    { t: 'rug_round', x: 4, y: 8 },
    { t: 'signboard', x: 2, y: 7 },
  ],
  overhead: [],
  events: [
    npc('fitch', 5, 4, 'down'),
    door('shop_exit', 7, 10, ['nameless_hollow', 37, 20, 'down']),
    sign('fitch_shelves', 2, 5, 'fitch_shelves'),
  ],
  exits: [],
  marks: {},
  start: { x: 7, y: 9, dir: 'up' },
};
