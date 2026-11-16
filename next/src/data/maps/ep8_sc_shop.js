// Bibliotheca Supplies (EPISODE8_PLAN 4.3): Willowmere Goods' layout and exit (item_shop.js), re-dressed: shelves of ink and
// binding cord, the Archive Keeper behind the counter (shop bibliotheca). Fits one screen (12 x 12): the camera rule is
// exempt. Exact cells in docs/MAPS_EP8_A.md 4.
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
  id: 'ep8_sc_shop', name: 'Bibliotheca Supplies', area: 'interior',
  music: 'scriptorium_town', ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  under: 'wood_floor',
  legend: { '#': 'interior_top', '|': 'interior_face', '.': 'wood_floor', 'C': 'counter' },
  ground,
  overlays: [
    { t: 'window_in_curtain_blue', x: 9, y: 1 },
    { t: 'in_crate', x: 1, y: 3 }, { t: 'in_sacks', x: 1, y: 4 },
    { t: 'in_barrel', x: 10, y: 3 }, { t: 'in_pot', x: 10, y: 4 },
    { t: 'in_crate', x: 10, y: 9 }, { t: 'in_sacks', x: 9, y: 9 },
    { t: 'carpet_blue', x: 7, y: 10 },
  ],
  decor: [
    { t: 'shelf_potions', x: 3, y: 3 },   // inks
    { t: 'shelf_a', x: 5, y: 3 },         // binding cord and quires
    { t: 'shelf_potions', x: 7, y: 3 },
    { t: 'book_stack', x: 1, y: 8 },
    { t: 'rug_round', x: 4, y: 8 },
  ],
  overhead: [],
  events: [
    npc('ep8_shopkeeper', 5, 4, 'down'),
    door('shop_exit', 7, 10, ['ep8_scriptorium', 39, 19, 'down']),
    sign('shop_sign', 2, 7, 'sign_ep8_shop'),
  ],
  exits: [],
  marks: { counter: [5, 4] },
  start: { x: 7, y: 9, dir: 'up' },
};
