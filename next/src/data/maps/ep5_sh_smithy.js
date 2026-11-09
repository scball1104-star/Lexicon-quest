// The Copperwind Smithy (Saffron Haven). EPISODE5_PLAN 4.4: the Mossforge Smithy's layout and exit (smithy.js),
// re-dressed: the copper forge on the back wall, the anvil, Hassan at it (shop copperwind; his talk runs bells_start and
// bells_done), a rack of caravan bells he is tuning, copper sheet and tools. Exact cells in docs/MAPS_EP5_A.md section 5.
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
  id: 'ep5_sh_smithy', name: 'The Copperwind Smithy', area: 'interior',
  music: 'saffron', ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  under: 'stone_floor',
  legend: { '#': 'interior_stone_top', '|': 'interior_stone_face', '.': 'stone_floor', 'C': 'counter' },
  ground,
  overlays: [
    { t: 'window_in', x: 2, y: 1 }, { t: 'window_in', x: 11, y: 1 },
    { t: 'in_barrel', x: 12, y: 3 }, { t: 'in_crate', x: 12, y: 8 },
    { t: 'in_crate', x: 1, y: 9 }, { t: 'in_sacks', x: 2, y: 9 },
    { t: 'carpet_red', x: 8, y: 10 },
  ],
  decor: [
    { t: 'forge_copper', x: 7, y: 3 },             // (7..8, 3)
    { t: 'anvil', x: 10, y: 4 },
    { t: 'bell_rack', x: 3, y: 3, state: 2 },      // two bells tuned, a hook waiting
    { t: 'rack_weapons', x: 1, y: 4 },
    { t: 'tool_rack', x: 4, y: 8 },
    { t: 'water_jars', x: 12, y: 5 },
  ],
  overhead: [],
  events: [
    npc('hassan', 10, 5, 'up'),
    door('smithy_exit', 8, 10, ['ep5_saffron', 33, 30, 'down']),
    sign('copperwind_sign', 8, 3, 'sign_ep5_smithy', { solid: false }),
  ],
  exits: [],
  marks: { anvil: [10, 5] },
  start: { x: 8, y: 9, dir: 'up' },
};
