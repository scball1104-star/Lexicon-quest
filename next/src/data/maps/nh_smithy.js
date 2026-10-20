// Silverglass Smithy (the Nameless Hollow). EPISODE2_PLAN 4.3: Mossforge's layout and exit, re-dressed. Vessa at the
// glass furnace (shop hollow_smithy); racks of glass-edged steel; a cooling bench.
import { rows, npc, door, sign } from './_kit.js';

const ground = rows([
  '##############', // 0
  '#||||||||||||#', // 1
  '#||||||||||||#', // 2
  '#............#', // 3
  '#............#', // 4
  '#............#', // 5
  '#..CCCC......#', // 6   sales counter
  '#............#', // 7
  '#............#', // 8
  '#............#', // 9
  '########.#####', // 10  door at (8,10)
  '##############', // 11
]);

export default {
  id: 'nh_smithy', name: 'Silverglass Smithy', area: 'interior',
  music: [{ if: 'nh_restored', id: 'hollowmere' }, { id: 'hollow' }], ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  under: 'stone_floor',
  legend: { '#': 'interior_stone_top', '|': 'interior_stone_face', '.': 'stone_floor', 'C': 'counter' },
  ground,
  overlays: [
    { t: 'window_in_night', x: 2, y: 1 }, { t: 'mirror_wall', x: 11, y: 1 },
    { t: 'in_barrel', x: 12, y: 3 }, { t: 'in_barrel', x: 12, y: 4 }, { t: 'in_crate', x: 12, y: 8 },
    { t: 'in_crate', x: 1, y: 9 }, { t: 'in_sacks', x: 2, y: 9 },
  ],
  decor: [
    { t: 'hearth', x: 7, y: 3 },                            // the glass furnace
    { t: 'glass_bench', x: 10, y: 4 },                      // the cooling bench
    { t: 'rack_weapons', x: 3, y: 3 },
    { t: 'rack_weapons', x: 5, y: 3 },
    { t: 'crates_barrels', x: 10, y: 9 },
    { t: 'table_long', x: 3, y: 8 },
  ],
  overhead: [],
  events: [
    npc('vessa', 9, 5, 'up'),
    door('smithy_exit', 8, 10, ['nameless_hollow', 9, 30, 'down']),
    sign('glass_furnace', 8, 3, 'glass_furnace', { solid: false }),
  ],
  exits: [],
  marks: {},
  start: { x: 8, y: 9, dir: 'up' },
};
