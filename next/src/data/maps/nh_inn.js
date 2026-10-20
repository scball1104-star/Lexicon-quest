// The Signless Inn (the Nameless Hollow). EPISODE2_PLAN 4.3: the Lantern Inn's layout and exits, re-dressed. Wren
// behind the counter (inn, 40 gold); the lost-property shelf (satchel_found); the guest book; the guest beds up the
// stair, with the mark inn_bed beside them (where the party wakes after the Episode 2 credits).
import { rows, npc, door, sign, stairs, object } from './_kit.js';

const ground = rows([
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
  id: 'nh_inn', name: 'The Signless Inn', area: 'interior',
  music: [{ if: 'nh_restored', id: 'hollowmere' }, { id: 'hollow' }], ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  under: 'wood_floor',
  legend: { '#': 'interior_wood_top', '|': 'interior_wood_face', '.': 'wood_floor', 'C': 'counter' },
  ground,
  overlays: [
    { t: 'window_in_curtain_blue', x: 3, y: 1 }, { t: 'window_in_curtain_blue', x: 10, y: 1 },
    { t: 'window_in_night', x: 16, y: 1 }, { t: 'window_in_night', x: 19, y: 1 },
    { t: 'in_barrel', x: 1, y: 3 }, { t: 'in_crate', x: 1, y: 9 }, { t: 'in_sacks', x: 2, y: 9 },
    { t: 'chair_right', x: 3, y: 8 }, { t: 'chair_left', x: 6, y: 8 },
    { t: 'chair_down', x: 9, y: 6 }, { t: 'chair_up', x: 9, y: 8 },
    { t: 'in_pot', x: 20, y: 3 },
  ],
  decor: [
    { t: 'shelf_potions', x: 4, y: 3 },
    { t: 'shelf_bread', x: 8, y: 3 },                       // the lost-property shelf
    { t: 'table_round', x: 4, y: 8 },
    { t: 'table_round', x: 8, y: 7 },
    { t: 'rug_round', x: 10, y: 5 },
    { t: 'stairs_in_up', x: 11, y: 2 },
    { t: 'stairs_in_down', x: 15, y: 2 },
    { t: 'bed_single', x: 15, y: 6 }, { t: 'bed_single', x: 18, y: 6 }, { t: 'bed_single', x: 20, y: 6 },
    { t: 'table_long', x: 16, y: 9 },
    { t: 'rug_round', x: 17, y: 5 },
  ],
  overhead: [],
  events: [
    npc('wren', 4, 4, 'down'),
    door('inn_exit', 10, 11, ['nameless_hollow', 8, 18, 'down'], { w: 2 }),
    stairs('inn_up', 11, 2, ['nh_inn', 15, 2, 'down']),
    stairs('inn_down', 15, 2, ['nh_inn', 11, 2, 'down']),
    object('lost_property', 8, 3, 'shelf_bread', { script: 'satchel_found', text: 'lost_property', solid: false }),
    sign('nh_guestbook', 7, 5, 'nh_guestbook', { solid: false }),
  ],
  exits: [],
  marks: { inn_bed: [17, 7] },
  start: { x: 10, y: 10, dir: 'up' },
};
