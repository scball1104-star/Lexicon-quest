// The Glyphsmith Atelier (EPISODE8_PLAN 4.3, 5.5): the Mossforge Smithy's layout and exit (smithy.js), re-dressed: Sorel at
// the bench (shop glyphsmith), a press, gilt tools on a rack. Shove (optional): the crate atelier_crate (11,4) stands in
// front of a wood chest (11,3) between two barrels; push it west from (12,4) and the chest opens from (11,4). Fits one
// screen (14 x 12): the camera rule is exempt. Exact cells in docs/MAPS_EP8_A.md 4.
import { rows, npc, door, sign, chest, block } from './_kit.js';

const ground = rows([
  '##############', // 0
  '#||||||||||||#', // 1
  '#||||||||||||#', // 2
  '#............#', // 3
  '#............#', // 4
  '#............#', // 5
  '#..CCCC......#', // 6   the bench
  '#............#', // 7
  '#............#', // 8
  '#............#', // 9
  '########.#####', // 10  door at (8,10)
  '##############', // 11
]);

export default {
  id: 'ep8_sc_atelier', name: 'The Glyphsmith Atelier', area: 'interior',
  music: 'scriptorium_town', ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  under: 'stone_floor',
  legend: { '#': 'interior_stone_top', '|': 'interior_stone_face', '.': 'stone_floor', 'C': 'counter' },
  ground,
  overlays: [
    { t: 'window_in', x: 2, y: 1 }, { t: 'window_in', x: 7, y: 1 },
    { t: 'in_barrel', x: 10, y: 3 }, { t: 'in_barrel', x: 12, y: 3 },
    { t: 'in_crate', x: 1, y: 9 }, { t: 'in_sacks', x: 2, y: 9 },
  ],
  decor: [
    { t: 'reading_table', x: 6, y: 3 },        // the press
    { t: 'rack_weapons', x: 1, y: 3 },         // gilt tools
    { t: 'shelf_a', x: 3, y: 3 },
    { t: 'table_long', x: 3, y: 8 },
    { t: 'book_stack', x: 12, y: 8 },
  ],
  overhead: [],
  events: [
    npc('sorel', 4, 5, 'down'),
    door('atelier_exit', 8, 10, ['ep8_scriptorium', 37, 30, 'down']),
    sign('atelier_sign', 9, 6, 'sign_ep8_atelier', { solid: false }),
    block('atelier_crate', 11, 4),
    chest('atelier_chest', 11, 3, 'wood', { item: 'hi_ether', qty: 1 }),
  ],
  exits: [],
  marks: { counter: [4, 5], crate: [11, 4] },
  start: { x: 8, y: 9, dir: 'up' },
};
