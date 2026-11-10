// The Galewing Workshop (Zephyr Landing). EPISODE6_PLAN 4.3: the Mossforge Smithy's layout and exit (smithy.js), re-dressed
// for the windwrights: a brass forge, an anvil, wind rotors on poles in for mending, a weapon rack, crates of pins. Ilex at
// the forge (shop galewing). Exact cells in docs/MAPS_EP6_A.md section 4.
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
  id: 'ep6_zl_workshop', name: 'The Galewing Workshop', area: 'interior',
  music: 'zephyr', ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  under: 'stone_floor',
  legend: { '#': 'interior_stone_top', '|': 'interior_stone_face', '.': 'stone_floor', 'C': 'counter' },
  ground,
  overlays: [
    { t: 'window_in_curtain_blue', x: 2, y: 1 }, { t: 'window_in_curtain_blue', x: 11, y: 1 },
    { t: 'in_barrel', x: 12, y: 3 }, { t: 'in_crate', x: 12, y: 8 },
    { t: 'in_crate', x: 1, y: 9 }, { t: 'in_sacks', x: 2, y: 9 },
    { t: 'carpet_red', x: 8, y: 10 },
  ],
  decor: [
    { t: 'forge_copper', x: 7, y: 3 },             // the brass forge (7..8, 3)
    { t: 'anvil', x: 10, y: 4 },
    { t: 'rack_weapons', x: 1, y: 4 },
    { t: 'rotor', x: 3, y: 3 }, { t: 'rotor', x: 5, y: 3 },   // rotors on their poles, in for mending
    { t: 'tool_rack', x: 4, y: 8 },
    { t: 'crates_barrels', x: 10, y: 9 },
  ],
  overhead: [],
  events: [
    npc('ilex', 10, 5, 'up'),
    door('workshop_exit', 8, 10, ['ep6_zephyr', 38, 32, 'down']),
    sign('galewing_sign', 8, 3, 'sign_ep6_workshop', { solid: false }),
  ],
  exits: [],
  marks: { forge: [10, 5] },
  start: { x: 8, y: 9, dir: 'up' },
};
