// The Crown Guard Forge (Valewyn). EPISODE4_PLAN 4.3: the Mossforge Smithy's layout and exit (smithy.js), re-dressed: the
// forge on the back wall, the anvil, Corvel at it (shop vw_forge), racks of the Watch's halberds, stone floor.
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
  id: 'ep4_vw_forge', name: 'Crown Guard Forge', area: 'interior',
  music: 'valewyn', ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  under: 'stone_floor',
  legend: { '#': 'interior_stone_top', '|': 'interior_stone_face', '.': 'stone_floor', 'C': 'counter' },
  ground,
  overlays: [
    { t: 'window_in_curtain_blue', x: 2, y: 1 }, { t: 'window_in', x: 11, y: 1 },
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
    npc('ep4_smith', 10, 5, 'up'),
    door('forge_exit', 8, 10, ['ep4_valewyn', 39, 25, 'down']),
    sign('vw_forge_sign', 8, 3, 'sign_ep4_forge', { solid: false }),
  ],
  exits: [],
  marks: { anvil: [10, 5] },
  start: { x: 8, y: 9, dir: 'up' },
};
