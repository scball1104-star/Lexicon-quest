// The Thawlight Lodge (Palehaven). EPISODE7_PLAN 4.4: the Lantern Inn's layout and exits (inn.js), re-dressed for the North:
// frosted windows, fur bedrolls along the guest room up the stair, an iron stove in the taproom, the North Watchkeeper
// behind the counter (inn, 140 gold). inn_bed (17,7) is a rest, no longer the post-credits wake (that is the Keeper's Watch,
// 2026-11-11). Every text key is Episode 7's own. Exact cells in docs/MAPS_EP7_A.md 5. Fits one screen (22 x 13): exempt.
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
  id: 'ep7_ph_inn', name: 'The Thawlight Lodge', area: 'interior',
  music: 'palehaven', ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  under: 'wood_floor',
  legend: { '#': 'interior_wood_top', '|': 'interior_wood_face', '.': 'wood_floor', 'C': 'counter' },
  ground,
  overlays: [
    { t: 'window_in', x: 3, y: 1 }, { t: 'window_in', x: 9, y: 1 },
    { t: 'window_in_night', x: 16, y: 1 }, { t: 'window_in_night', x: 19, y: 1 },
    { t: 'in_sacks', x: 1, y: 3 }, { t: 'in_barrel', x: 1, y: 9 }, { t: 'in_crate', x: 12, y: 9 },
    { t: 'chair_right', x: 3, y: 8 }, { t: 'chair_left', x: 7, y: 8 },
    { t: 'chair_down', x: 9, y: 6 }, { t: 'chair_up', x: 9, y: 8 },
    { t: 'carpet_blue', x: 10, y: 11 }, { t: 'carpet_blue', x: 11, y: 11 },
    { t: 'in_pot', x: 20, y: 3 },
  ],
  decor: [
    { t: 'shelf_potions', x: 4, y: 3 },             // teas and lamp oil behind the counter
    { t: 'shelf_bread', x: 7, y: 3 },
    { t: 'courier_stove', x: 11, y: 4, state: 1 },  // the stove that stays lit
    { t: 'table_long', x: 4, y: 8 },
    { t: 'table_round', x: 8, y: 7 },
    { t: 'stairs_in_up', x: 11, y: 2 },
    { t: 'stairs_in_down', x: 15, y: 2 },
    // the guest room: fur bedrolls under the frosted windows
    { t: 'bed_single', x: 15, y: 6 }, { t: 'bed_single', x: 18, y: 6 }, { t: 'bed_single', x: 20, y: 6 },
    { t: 'lantern_hanging', x: 16, y: 5 }, { t: 'lantern_hanging', x: 19, y: 5 },
    { t: 'table_long', x: 16, y: 9 },
    { t: 'rug_round', x: 17, y: 4 },
  ],
  overhead: [],
  events: [
    npc('ep7_innkeeper', 3, 4, 'down'),
    door('inn_exit', 10, 11, ['ep7_palehaven', 6, 17, 'down'], { w: 2 }),
    stairs('inn_up', 11, 2, ['ep7_ph_inn', 15, 2, 'down']),
    stairs('inn_down', 15, 2, ['ep7_ph_inn', 11, 2, 'down']),
    sign('lodge_sign', 7, 5, 'sign_ep7_inn', { solid: false }),
  ],
  exits: [],
  marks: { counter: [3, 4], inn_bed: [17, 7] },
  start: { x: 10, y: 10, dir: 'up' },
};
