// The Emberpeak Weaponsmith (the family forge). EPISODE3_PLAN 4.3: the smithy's layout and exit, re-dressed: Sella at
// the anvil (shop pk_smithy); the old forge in the back wall, cold until forge_relit, then lit; the Smith in the corner
// by it (garrick_e, then garrick_n once he is named: two records on one spot, never both); tool racks, bellows.
import { rows, npc, door, object } from '../_kit.js';

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
  id: 'pk_smithy', name: 'Emberpeak Weaponsmith', area: 'interior',
  music: [{ if: 'pk_restored', id: 'first_bell' }, { id: 'emberpeak' }], ambience: null, tileset: 'interior',
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
    { t: 'tool_rack', x: 2, y: 3 },
    { t: 'rack_weapons', x: 4, y: 3 },
    { t: 'bellows_decor', x: 10, y: 3 },
    { t: 'anvil', x: 9, y: 7 },
    { t: 'table_long', x: 3, y: 8 },
  ],
  overhead: [],
  events: [
    object('forge_cold', 6, 3, 'hearth', { w: 3, text: 'forge_cold', ifNot: 'forge_relit' }),
    object('forge_lit', 6, 2, 'furnace_mouth', { w: 2, text: 'forge_lit', if: 'forge_relit' }),
    npc('sella', 8, 7, 'up'),
    npc('garrick_e', 11, 5, 'left'),
    npc('garrick_n', 11, 5, 'left'),
    door('smithy_exit', 8, 10, ['emberpeak', 9, 29, 'down']),
  ],
  exits: [],
  marks: { forge: [11, 5], anvil: [8, 7] },
  start: { x: 8, y: 9, dir: 'up' },
};
