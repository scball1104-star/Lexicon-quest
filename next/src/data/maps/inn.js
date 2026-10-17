// The Lantern Inn. Taproom on the left (Hob behind the counter, tables), the guest rooms upstairs drawn as
// the right-hand block, reached by the stair (same-map transfer). Barnaby sleeps in the far bed.
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
  id: 'inn', name: 'The Lantern Inn', area: 'interior',
  music: null, ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  under: 'wood_floor',
  legend: { '#': 'interior_wood_top', '|': 'interior_wood_face', '.': 'wood_floor', 'C': 'counter' },
  ground,
  overlays: [
    { t: 'window_in_curtain_red', x: 3, y: 1 }, { t: 'window_in_curtain_red', x: 10, y: 1 },
    { t: 'window_in_night', x: 16, y: 1 }, { t: 'window_in_night', x: 19, y: 1 },
    { t: 'in_barrel', x: 1, y: 3 }, { t: 'in_barrel', x: 2, y: 3 }, { t: 'in_crate', x: 1, y: 9 },
    { t: 'chair_right', x: 3, y: 8 }, { t: 'chair_left', x: 6, y: 8 },
    { t: 'chair_down', x: 9, y: 6 }, { t: 'chair_up', x: 9, y: 8 },
    { t: 'carpet_red', x: 10, y: 11 }, { t: 'carpet_red', x: 11, y: 11 },
    { t: 'in_pot', x: 20, y: 3 },
  ],
  decor: [
    { t: 'shelf_potions', x: 4, y: 3 },             // bottles behind the bar
    { t: 'shelf_bread', x: 8, y: 3 },
    { t: 'table_round', x: 4, y: 8 },
    { t: 'table_round', x: 8, y: 7 },
    { t: 'rug_round', x: 10, y: 5 },
    { t: 'stairs_in_up', x: 11, y: 2 },
    { t: 'stairs_in_down', x: 15, y: 2 },
    { t: 'bed_single_red', x: 15, y: 6 }, { t: 'bed_single', x: 18, y: 6 }, { t: 'bed_single', x: 20, y: 6 },
    { t: 'table_long', x: 16, y: 9 },
    { t: 'rug_round', x: 17, y: 5 },
  ],
  overhead: [],
  events: [
    npc('hob', 4, 4, 'down'),
    npc('barnaby', 20, 6, 'down'),
    door('inn_exit', 10, 11, ['willowmere', 33, 13, 'down'], { w: 2 }),
    stairs('inn_up', 11, 2, ['inn', 15, 2, 'down']),
    stairs('inn_down', 15, 2, ['inn', 11, 2, 'down']),
    sign('inn_guestbook', 7, 5, 'inn_guestbook', { solid: false }),
  ],
  exits: [],
  marks: {},
  start: { x: 10, y: 10, dir: 'up' },
};
