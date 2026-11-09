// The Dune Lantern Rest (Saffron Haven). EPISODE5_PLAN 4.4: the Lantern Inn's layout and exit (inn.js), re-dressed for the
// desert: whitewashed walls, a lamp for every bed (canon), saffron rugs, water jars, the Dune Host behind the counter (inn,
// 100 gold). The guest beds up the stair with the mark inn_bed beside them: where the party wakes after the Episode 5
// credits (CREDITS_HANDOFF[5], src/data/ep5/hooks.js). Exact cells in docs/MAPS_EP5_A.md section 5.
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
  id: 'ep5_sh_inn', name: 'The Dune Lantern Rest', area: 'interior',
  music: 'saffron', ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  under: 'wood_floor',
  legend: { '#': 'interior_top', '|': 'interior_face', '.': 'wood_floor', 'C': 'counter' },
  ground,
  overlays: [
    { t: 'window_in_curtain_red', x: 3, y: 1 }, { t: 'window_in_curtain_red', x: 10, y: 1 },
    { t: 'window_in_curtain_red', x: 19, y: 1 },
    { t: 'in_pot', x: 1, y: 3 }, { t: 'in_pot', x: 12, y: 3 }, { t: 'in_sacks', x: 1, y: 9 },
    { t: 'chair_right', x: 3, y: 8 }, { t: 'chair_left', x: 7, y: 8 },
    { t: 'chair_down', x: 10, y: 6 }, { t: 'chair_up', x: 10, y: 8 },
    { t: 'carpet_red', x: 10, y: 11 }, { t: 'carpet_red', x: 11, y: 11 },
    { t: 'in_pot', x: 20, y: 3 },
  ],
  decor: [
    { t: 'shelf_potions', x: 4, y: 3 },             // bottles and lamp oil behind the counter
    { t: 'water_jars', x: 7, y: 3 }, { t: 'water_jars', x: 8, y: 3 },
    { t: 'table_long', x: 4, y: 8 },
    { t: 'table_round', x: 9, y: 7 },
    { t: 'rug_saffron', x: 9, y: 5 },
    { t: 'lantern_hanging', x: 5, y: 7 }, { t: 'lantern_hanging', x: 10, y: 4 },
    { t: 'stairs_in_up', x: 11, y: 2 },
    { t: 'stairs_in_down', x: 15, y: 2 },
    // a lamp for every bed
    { t: 'bed_single_red', x: 15, y: 6 }, { t: 'bed_single_red', x: 18, y: 6 }, { t: 'bed_single_red', x: 20, y: 6 },
    { t: 'lantern_hanging', x: 16, y: 5 }, { t: 'lantern_hanging', x: 19, y: 5 },
    { t: 'table_long', x: 16, y: 9 },
    { t: 'rug_saffron', x: 16, y: 8 },
  ],
  overhead: [],
  events: [
    npc('ep5_innkeeper', 3, 4, 'down'),
    door('inn_exit', 10, 11, ['ep5_saffron', 4, 22, 'down'], { w: 2 }),
    stairs('inn_up', 11, 2, ['ep5_sh_inn', 15, 2, 'down']),
    stairs('inn_down', 15, 2, ['ep5_sh_inn', 11, 2, 'down']),
    sign('dune_inn_sign', 7, 5, 'sign_ep5_inn', { solid: false }),
  ],
  exits: [],
  marks: { counter: [3, 4], inn_bed: [17, 7] },
  start: { x: 10, y: 10, dir: 'up' },
};
