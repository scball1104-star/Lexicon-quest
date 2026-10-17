// Willowmere Goods. Pell behind the counter, potion shelves, crates of everything, labels on the labels.
import { rows, npc, door } from './_kit.js';

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
  id: 'item_shop', name: 'Willowmere Goods', area: 'interior',
  music: null, ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  under: 'wood_floor',
  legend: { '#': 'interior_top', '|': 'interior_face', '.': 'wood_floor', 'C': 'counter' },
  ground,
  overlays: [
    { t: 'window_in_curtain_blue', x: 9, y: 1 },
    { t: 'in_crate', x: 1, y: 3 }, { t: 'in_crate', x: 1, y: 4 }, { t: 'in_sacks', x: 2, y: 3 },
    { t: 'in_barrel', x: 10, y: 3 }, { t: 'in_barrel', x: 10, y: 4 }, { t: 'in_pot', x: 9, y: 3 },
    { t: 'in_crate', x: 10, y: 8 }, { t: 'in_crate', x: 10, y: 9 }, { t: 'in_sacks', x: 9, y: 9 },
    { t: 'in_barrel', x: 1, y: 9 }, { t: 'carpet_blue', x: 7, y: 10 },
  ],
  decor: [
    { t: 'shelf_potions', x: 3, y: 3 }, { t: 'shelf_potions', x: 5, y: 3 }, { t: 'shelf_potions', x: 7, y: 3 },
    { t: 'rug_round', x: 4, y: 8 },
    { t: 'signboard', x: 2, y: 7 },
  ],
  overhead: [],
  events: [
    npc('pell', 5, 4, 'down'),
    door('shop_exit', 7, 10, ['willowmere', 13, 26, 'down']),
  ],
  exits: [],
  marks: {},
  start: { x: 7, y: 9, dir: 'up' },
};
