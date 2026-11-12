// The Glass-Ice Armory (Palehaven). EPISODE7_PLAN 4.4: the Mossforge Smithy's layout and exit (smithy.js), re-dressed: the
// glass furnace on the back wall, an anvil, racks of glass-ice blades, a cold frostfire that tempers the glass, Eira at the
// forge as eira_forge (shop glassice_armory). Every text key is Episode 7's own. Exact cells in docs/MAPS_EP7_A.md 5. Fits
// one screen (14 x 12): exempt.
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
  id: 'ep7_ph_armory', name: 'The Glass-Ice Armory', area: 'interior',
  music: 'palehaven', ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  under: 'stone_floor',
  legend: { '#': 'interior_stone_top', '|': 'interior_stone_face', '.': 'stone_floor', 'C': 'counter' },
  ground,
  overlays: [
    { t: 'window_in', x: 2, y: 1 }, { t: 'window_in', x: 11, y: 1 },
    { t: 'in_barrel', x: 12, y: 3 }, { t: 'in_crate', x: 12, y: 8 },
    { t: 'in_crate', x: 1, y: 9 }, { t: 'in_sacks', x: 2, y: 9 },
    { t: 'carpet_blue', x: 8, y: 10 },
  ],
  decor: [
    { t: 'hearth', x: 7, y: 3 },                   // the glass furnace
    { t: 'anvil', x: 10, y: 4 },
    { t: 'rack_weapons', x: 1, y: 4 }, { t: 'rack_weapons', x: 3, y: 3 },
    { t: 'frostfire', x: 5, y: 4 },                // the cold flame that tempers the glass
    { t: 'crates_barrels', x: 10, y: 9 },
    { t: 'table_long', x: 3, y: 8 },
  ],
  overhead: [],
  events: [
    npc('eira_forge', 10, 5, 'up'),
    door('armory_exit', 8, 10, ['ep7_palehaven', 37, 32, 'down']),
    sign('armory_sign', 8, 3, 'sign_ep7_armory', { solid: false }),
  ],
  exits: [],
  marks: { forge: [10, 5] },
  start: { x: 8, y: 9, dir: 'up' },
};
