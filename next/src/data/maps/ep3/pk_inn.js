// The Coal Lantern Inn (Emberpeak). EPISODE3_PLAN 4.3: the Lantern Inn's layout and exit, re-dressed for a smelting town.
// Bess behind the counter (inn, 60 gold); the stew pots simmering on the counter end; the miners' long table; the guest
// beds up the stair, with the mark inn_bed beside them (where the party wakes after the Episode 3 credits).
import { rows, npc, door, sign, stairs } from '../_kit.js';

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
  id: 'pk_inn', name: 'The Coal Lantern Inn', area: 'interior',
  music: [{ if: 'pk_restored', id: 'first_bell' }, { id: 'emberpeak' }], ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  under: 'wood_floor',
  legend: { '#': 'interior_wood_top', '|': 'interior_wood_face', '.': 'wood_floor', 'C': 'counter' },
  ground,
  overlays: [
    { t: 'window_in_curtain_red', x: 3, y: 1 }, { t: 'window_in_curtain_red', x: 10, y: 1 },
    { t: 'window_in', x: 16, y: 1 }, { t: 'window_in', x: 19, y: 1 },
    { t: 'in_pot', x: 6, y: 5 }, { t: 'in_pot', x: 7, y: 5 },
    { t: 'in_barrel', x: 1, y: 3 }, { t: 'in_crate', x: 1, y: 9 }, { t: 'in_sacks', x: 2, y: 9 },
    { t: 'chair_right', x: 3, y: 8 }, { t: 'chair_left', x: 7, y: 8 },
    { t: 'chair_down', x: 10, y: 6 }, { t: 'chair_up', x: 10, y: 8 },
    { t: 'in_pot', x: 20, y: 3 },
  ],
  decor: [
    { t: 'hearth', x: 4, y: 3 },
    { t: 'shelf_potions', x: 8, y: 3 },
    { t: 'table_long', x: 4, y: 8 },
    { t: 'table_round', x: 9, y: 7 },
    { t: 'stairs_in_up', x: 11, y: 2 },
    { t: 'stairs_in_down', x: 15, y: 2 },
    { t: 'bed_single', x: 15, y: 6 }, { t: 'bed_single', x: 18, y: 6 }, { t: 'bed_single', x: 20, y: 6 },
    { t: 'table_long', x: 16, y: 9 },
    { t: 'rug_round', x: 17, y: 5 },
  ],
  overhead: [],
  events: [
    npc('bess', 3, 4, 'down'),
    door('inn_exit', 10, 11, ['emberpeak', 34, 13, 'down'], { w: 2 }),
    stairs('inn_up', 11, 2, ['pk_inn', 15, 2, 'down']),
    stairs('inn_down', 15, 2, ['pk_inn', 11, 2, 'down']),
    sign('stew_pots', 7, 5, 'stew_pots', { solid: false }),
  ],
  exits: [],
  marks: { inn_bed: [17, 7] },
  start: { x: 10, y: 10, dir: 'up' },
};
