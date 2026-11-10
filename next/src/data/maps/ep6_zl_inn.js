// The Cloudhouse Inn (Zephyr Landing). EPISODE6_PLAN 4.3: the Lantern Inn's layout and exits (inn.js), re-dressed for the
// skyport: blue-curtained windows full of cloud, berths along the guest room with a lantern between each pair, the
// Cloudhouse Host behind the counter (inn, 120 gold). The guest room up the stair holds inn_bed (17,7): where the party
// wakes after the Episode 6 credits (CREDITS_HANDOFF[6], src/data/ep6/hooks.js). Exact cells in docs/MAPS_EP6_A.md 4.
import { rows, npc, door, sign, stairs } from './_kit.js';

const ground = rows([
  //0         1         2
  //0123456789012345678901
  '######################', // 0
  '#||||||||||||#||||||||', // 1
  '#||||||||||||#||||||||', // 2
  '#............#.......#', // 3
  '#............#.......#', // 4
  '#.CCCCCC.....#.......#', // 5
  '#............#.......#', // 6
  '#............#.......#', // 7
  '#............#.......#', // 8
  '#............#.......#', // 9
  '#............#########', // 10
  '##########..##########', // 11   door at (10..11,11)
  '######################', // 12
]);

export default {
  id: 'ep6_zl_inn', name: 'The Cloudhouse Inn', area: 'interior',
  music: 'zephyr', ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  under: 'wood_floor',
  legend: { '#': 'interior_wood_top', '|': 'interior_wood_face', '.': 'wood_floor', 'C': 'counter' },
  ground,
  overlays: [
    { t: 'window_in_curtain_blue', x: 3, y: 1 }, { t: 'window_in_curtain_blue', x: 9, y: 1 },
    { t: 'window_in_curtain_blue', x: 16, y: 1 }, { t: 'window_in_curtain_blue', x: 19, y: 1 },
    { t: 'in_barrel', x: 1, y: 3 }, { t: 'in_sacks', x: 1, y: 9 }, { t: 'in_crate', x: 12, y: 9 },
    { t: 'chair_right', x: 3, y: 8 }, { t: 'chair_left', x: 7, y: 8 },
    { t: 'chair_down', x: 9, y: 6 }, { t: 'chair_up', x: 9, y: 8 },
    { t: 'carpet_blue', x: 10, y: 11 }, { t: 'carpet_blue', x: 11, y: 11 },
    { t: 'in_pot', x: 20, y: 3 },
  ],
  decor: [
    { t: 'shelf_potions', x: 4, y: 3 },             // bottles and lamp oil behind the counter
    { t: 'shelf_bread', x: 7, y: 3 },
    { t: 'table_long', x: 4, y: 8 },
    { t: 'table_round', x: 8, y: 7 },
    { t: 'rug_round', x: 10, y: 5 },
    { t: 'lantern_hanging', x: 6, y: 7 }, { t: 'lantern_hanging', x: 11, y: 4 },
    { t: 'stairs_in_up', x: 11, y: 2 },
    { t: 'stairs_in_down', x: 15, y: 2 },
    // the guest room: a row of berths under the cloud windows, a lantern between each pair
    { t: 'bed_single', x: 15, y: 6 }, { t: 'bed_single', x: 18, y: 6 }, { t: 'bed_single', x: 20, y: 6 },
    { t: 'lantern_hanging', x: 16, y: 5 }, { t: 'lantern_hanging', x: 19, y: 5 },
    { t: 'table_long', x: 16, y: 9 },
    { t: 'rug_round', x: 17, y: 4 },
  ],
  overhead: [],
  events: [
    npc('ep6_innkeeper', 3, 4, 'down'),
    door('inn_exit', 10, 11, ['ep6_zephyr', 6, 22, 'down'], { w: 2 }),
    stairs('inn_up', 11, 2, ['ep6_zl_inn', 15, 2, 'down']),
    stairs('inn_down', 15, 2, ['ep6_zl_inn', 11, 2, 'down']),
    sign('cloudhouse_sign', 7, 5, 'sign_ep6_inn', { solid: false }),
  ],
  exits: [],
  marks: { counter: [3, 4], inn_bed: [17, 7] },
  start: { x: 10, y: 10, dir: 'up' },
};
