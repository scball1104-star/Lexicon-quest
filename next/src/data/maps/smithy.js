// Mossforge Smithy. The forge (hearth) on the back wall with the anvil beside it, Garrick at the anvil,
// the runaway starter rising on the warm bricks next to the forge, Anvil the dog lying by the door.
import { rows, npc, door, sign } from './_kit.js';

const ground = rows([
  //01234567890123
  '##############', // 0
  '#||||||||||||#', // 1
  '#||||||||||||#', // 2
  '#............#', // 3
  '#............#', // 4
  '#............#', // 5
  '#..CCCC......#', // 6   sales counter (gear)
  '#............#', // 7
  '#............#', // 8
  '#............#', // 9
  '########.#####', // 10  door at (8,10)
  '##############', // 11
]);

export default {
  id: 'smithy', name: 'Mossforge Smithy', area: 'interior',
  music: null, ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  under: 'stone_floor',
  legend: { '#': 'interior_stone_top', '|': 'interior_stone_face', '.': 'stone_floor', 'C': 'counter' },
  ground,
  overlays: [
    { t: 'window_in', x: 2, y: 1 },
    { t: 'in_barrel', x: 12, y: 3 }, { t: 'in_barrel', x: 12, y: 4 }, { t: 'in_crate', x: 12, y: 8 },
    { t: 'in_crate', x: 1, y: 9 }, { t: 'in_sacks', x: 2, y: 9 },
  ],
  decor: [
    { t: 'hearth', x: 7, y: 3 },                   // the forge
    { t: 'anvil', x: 10, y: 4 },
    { t: 'rack_weapons', x: 3, y: 3 },
    { t: 'rack_weapons', x: 5, y: 3 },
    { t: 'crates_barrels', x: 10, y: 9 },
    { t: 'table_long', x: 3, y: 8 },
  ],
  overhead: [],
  events: [
    npc('garrick', 10, 5, 'up'),
    npc('anvil', 6, 9, 'left'),     // radius 1 keeps him off (8,9), the one tile in front of the door
    npc('starter_dough', 6, 4, 'down'),
    door('smithy_exit', 8, 10, ['willowmere', 29, 26, 'down']),
    sign('forge', 8, 3, 'forge', { solid: false }),
  ],
  exits: [],
  marks: {},
  start: { x: 8, y: 9, dir: 'up' },
};
