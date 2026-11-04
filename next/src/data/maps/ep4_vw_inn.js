// The Floodwatch Inn (Valewyn). EPISODE4_PLAN 4.3: the Lantern Inn's layout and exit (inn.js), re-dressed for a town that
// lives with the water: Wenna behind the counter (inn, 80 gold), oilskins and boots drying by the hearth, blue curtains,
// the guest beds up the stair with the mark inn_bed beside them (where the party wakes after the Episode 4 credits).
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
  id: 'ep4_vw_inn', name: 'The Floodwatch Inn', area: 'interior',
  music: 'valewyn', ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  under: 'wood_floor',
  legend: { '#': 'interior_wood_top', '|': 'interior_wood_face', '.': 'wood_floor', 'C': 'counter' },
  ground,
  overlays: [
    { t: 'window_in_curtain_blue', x: 3, y: 1 }, { t: 'window_in_curtain_blue', x: 10, y: 1 },
    { t: 'window_in_curtain_blue', x: 16, y: 1 }, { t: 'window_in_curtain_blue', x: 19, y: 1 },
    { t: 'in_barrel', x: 1, y: 3 }, { t: 'in_pot', x: 7, y: 5 }, { t: 'in_crate', x: 1, y: 9 }, { t: 'in_sacks', x: 2, y: 9 },
    { t: 'chair_right', x: 3, y: 8 }, { t: 'chair_left', x: 7, y: 8 },
    { t: 'chair_down', x: 10, y: 6 }, { t: 'chair_up', x: 10, y: 8 },
    { t: 'carpet_blue', x: 10, y: 11 }, { t: 'carpet_blue', x: 11, y: 11 },
    { t: 'in_pot', x: 20, y: 3 }, { t: 'in_barrel', x: 12, y: 9 },
  ],
  decor: [
    { t: 'hearth', x: 4, y: 3 },                    // boots and oilskins steaming on the fender
    { t: 'shelf_potions', x: 8, y: 3 },
    { t: 'table_long', x: 4, y: 8 },
    { t: 'table_round', x: 9, y: 7 },
    { t: 'rug_round', x: 10, y: 4 },
    { t: 'stairs_in_up', x: 11, y: 2 },
    { t: 'stairs_in_down', x: 15, y: 2 },
    { t: 'bed_single', x: 15, y: 6 }, { t: 'bed_single', x: 18, y: 6 }, { t: 'bed_single', x: 20, y: 6 },
    { t: 'table_long', x: 16, y: 9 },
    { t: 'rug_round', x: 17, y: 5 },
  ],
  overhead: [],
  events: [
    npc('ep4_innkeeper', 3, 4, 'down'),
    door('inn_exit', 10, 11, ['ep4_valewyn', 5, 19, 'down'], { w: 2 }),
    stairs('inn_up', 11, 2, ['ep4_vw_inn', 15, 2, 'down']),
    stairs('inn_down', 15, 2, ['ep4_vw_inn', 11, 2, 'down']),
    sign('vw_inn_sign', 7, 5, 'sign_ep4_inn', { solid: false }),
  ],
  exits: [],
  marks: { counter: [3, 4], inn_bed: [17, 7] },
  start: { x: 10, y: 10, dir: 'up' },
};
