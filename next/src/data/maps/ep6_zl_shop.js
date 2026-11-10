// Aeris Flight Provisions (Zephyr Landing). EPISODE6_PLAN 4.3: Willowmere Goods' layout and exit (item_shop.js), re-dressed
// as a flight chandlery: cargo under nets, crates of rope and ballast, potion shelves, blue-curtained windows full of
// cloud. Nova behind the counter (shop aeris_provisions). Exact cells in docs/MAPS_EP6_A.md section 4.
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
  id: 'ep6_zl_shop', name: 'Aeris Flight Provisions', area: 'interior',
  music: 'zephyr', ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  under: 'wood_floor',
  legend: { '#': 'interior_top', '|': 'interior_face', '.': 'wood_floor', 'C': 'counter' },
  ground,
  overlays: [
    { t: 'window_in_curtain_blue', x: 9, y: 1 }, { t: 'window_in_curtain_blue', x: 2, y: 1 },
    { t: 'in_crate', x: 10, y: 3 }, { t: 'in_crate', x: 10, y: 4 }, { t: 'in_sacks', x: 9, y: 3 },
    { t: 'in_barrel', x: 1, y: 9 }, { t: 'in_crate', x: 10, y: 9 },
    { t: 'carpet_blue', x: 7, y: 10 },
  ],
  decor: [
    { t: 'shelf_potions', x: 3, y: 3 }, { t: 'shelf_potions', x: 5, y: 3 },
    { t: 'lantern_hanging', x: 7, y: 4 },
    { t: 'cargo_net', x: 1, y: 4 },
    { t: 'cargo_net', x: 8, y: 8 },
    { t: 'rug_round', x: 4, y: 8 },
  ],
  overhead: [],
  events: [
    npc('nova', 5, 4, 'down'),
    door('shop_exit', 7, 10, ['ep6_zephyr', 27, 18, 'down']),
    sign('provisions_sign', 8, 5, 'sign_ep6_shop', { solid: false }),
  ],
  exits: [],
  marks: { counter: [5, 4] },
  start: { x: 7, y: 9, dir: 'up' },
};
