// Oren's Ovens. Counter across the room, the oven on the back wall, the empty starter crock, the flour bin.
// Exit door at (9,9) (the facade door sits right of the awning on the town map).
import { rows, npc, door, sign, enter } from './_kit.js';

const ground = rows([
  //01234567890123
  '##############', // 0
  '#||||||||||||#', // 1
  '#||||||||||||#', // 2
  '#............#', // 3
  '#............#', // 4
  '#.CCCCCCCCC..#', // 5   counter: Oren serves across it
  '#............#', // 6
  '#............#', // 7
  '#............#', // 8
  '#########.####', // 9   door at (9,9)
  '##############', // 10
]);

export default {
  id: 'bakery', name: "Oren's Ovens", area: 'interior',
  music: null, ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  under: 'wood_floor',
  legend: { '#': 'interior_wood_top', '|': 'interior_wood_face', '.': 'wood_floor', 'C': 'counter' },
  ground,
  overlays: [
    { t: 'window_in', x: 2, y: 1 }, { t: 'window_in', x: 11, y: 1 },
    { t: 'in_sacks', x: 1, y: 3 }, { t: 'in_sacks', x: 2, y: 3 },
    { t: 'in_pot', x: 12, y: 4 },
    { t: 'in_barrel', x: 12, y: 7 }, { t: 'in_crate', x: 1, y: 8 },
    { t: 'chair_up', x: 4, y: 8 }, { t: 'chair_down', x: 4, y: 6 },
  ],
  decor: [
    { t: 'hearth', x: 6, y: 3 },                   // the oven
    { t: 'shelf_bread', x: 9, y: 3 },
    { t: 'shelf_bread', x: 3, y: 3 },
    { t: 'table_round', x: 10, y: 7 },
    { t: 'rug_round', x: 6, y: 8 },
  ],
  overhead: [],
  events: [
    npc('oren', 7, 4, 'down'),
    npc('hal', 3, 4, 'right'),
    door('bakery_exit', 9, 9, ['willowmere', 11, 16, 'down']),
    sign('bakery_crock', 12, 4, 'bakery_crock', { solid: false }),
    sign('flour_bin', 1, 3, 'flour_bin', { solid: false }),
  ],
  exits: [],
  marks: {},
  start: { x: 9, y: 8, dir: 'up' },
};
