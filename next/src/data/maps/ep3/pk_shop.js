// Ventworks Supplies (Emberpeak). EPISODE3_PLAN 4.3: the item shop's layout and exit, re-dressed: Taro behind the counter
// (shop ventworks), pipes and pressure valves on the back wall, crates of flasks.
import { rows, npc, door } from '../_kit.js';

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
  id: 'pk_shop', name: 'Ventworks Supplies', area: 'interior',
  music: [{ if: 'pk_restored', id: 'first_bell' }, { id: 'emberpeak' }], ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  under: 'stone_floor',
  legend: { '#': 'interior_stone_top', '|': 'interior_stone_face', '.': 'stone_floor', 'C': 'counter' },
  ground,
  overlays: [
    { t: 'window_in', x: 9, y: 1 },
    { t: 'in_crate', x: 1, y: 3 }, { t: 'in_crate', x: 1, y: 4 }, { t: 'in_sacks', x: 2, y: 3 },
    { t: 'in_barrel', x: 10, y: 3 }, { t: 'in_barrel', x: 10, y: 4 },
    { t: 'in_crate', x: 10, y: 8 }, { t: 'in_crate', x: 10, y: 9 }, { t: 'in_barrel', x: 1, y: 9 },
  ],
  decor: [
    { t: 'pipes_v', x: 2, y: 2 }, { t: 'pipes_valve', x: 4, y: 2 }, { t: 'pipes_h', x: 5, y: 2 }, { t: 'pipes_elbow', x: 6, y: 2 },
    { t: 'shelf_potions', x: 7, y: 3 }, { t: 'shelf_potions', x: 3, y: 3 },
    { t: 'rug_round', x: 4, y: 8 },
  ],
  overhead: [],
  events: [
    npc('taro', 5, 4, 'down'),
    door('shop_exit', 7, 10, ['emberpeak', 31, 28, 'down']),
  ],
  exits: [],
  marks: {},
  start: { x: 7, y: 9, dir: 'up' },
};
