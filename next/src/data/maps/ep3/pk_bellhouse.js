// The Bell House (Emberpeak). EPISODE3_PLAN 4.3: the chapel's layout and exit, re-dressed as the founder's workshop:
// Ilya at the founder's workbench, the bench of bell molds, a practice bell hanging in the tower base, the hand-bell save,
// `ilya_trig` two tiles inside the door (ilya_bellhouse), and the Keeper mirror between the molds (plan 5.4: to
// Hollowmere's square once the Mirror Sigil is carried and the party has reached Emberpeak).
import { rows, npc, door, sign, trigger, mirrorDoor, dullMirror } from '../_kit.js';

const ground = rows([
  '##################', // 0
  '#||||||||||#|||||#', // 1
  '#||||||||||#|||||#', // 2
  '#..........#.....#', // 3
  '#..........#.....#', // 4
  '#..........#.....#', // 5
  '#....cc....#.....#', // 6
  '#....cc....#.....#', // 7
  '#....cc....#.....#', // 8
  '#....cc....#.....#', // 9
  '#....cc..........#', // 10  doorway into the tower base at (11,10)
  '#....cc....#.....#', // 11
  '#....cc....#######', // 12
  '#########.########', // 13  door at (9,13)
  '##################', // 14
]);

export default {
  id: 'pk_bellhouse', name: 'The Bell House', area: 'interior',
  music: [{ if: 'pk_restored', id: 'first_bell' }, { id: 'emberpeak' }], ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  under: 'stone_floor',
  legend: { '#': 'interior_stone_top', '|': 'interior_stone_face', '.': 'stone_floor', 'c': 'carpet_red' },
  ground,
  overlays: [
    { t: 'window_in', x: 2, y: 1 }, { t: 'window_in', x: 6, y: 1 }, { t: 'window_in', x: 14, y: 1 },
    { t: 'in_crate', x: 10, y: 11 }, { t: 'in_sacks', x: 1, y: 11 },
  ],
  decor: [
    { t: 'reading_table', x: 3, y: 4 },
    { t: 'table_long', x: 6, y: 4 },
    { t: 'tool_rack', x: 1, y: 3 },
    { t: 'candelabra', x: 1, y: 7 }, { t: 'candelabra', x: 10, y: 7 },
    { t: 'bench', x: 2, y: 9 }, { t: 'bench', x: 8, y: 9 },
    { t: 'prop_thirteenth_bell', x: 14, y: 5 },
    { t: 'stairs_in_up', x: 15, y: 2 },
    { t: 'signboard', x: 12, y: 11 },
  ],
  overhead: [],
  events: [
    npc('ilya', 4, 5, 'up'),
    door('bellhouse_exit', 9, 13, ['emberpeak', 6, 21, 'down']),
    trigger('ilya_trig', 8, 11, 3, 1, 'ilya_bellhouse'),
    { id: 'save_bell', type: 'save', x: 12, y: 11, text: 'practice_bell' },
    sign('workbench', 3, 4, 'founder_bench'),
    sign('bell_molds', 7, 4, 'bell_molds'),
    sign('practice_bell', 14, 5, 'practice_bell'),
    dullMirror('bh_mirror', 9, 3, 'mirror_sigil_get', 'pk_mirror'),
    mirrorDoor('mirror_pk_sq', 9, 3, ['nameless_hollow', 26, 19, 'down'], ['mirror_sigil_get', 'pk_arrived']),
  ],
  exits: [],
  marks: { ilya_spot: [4, 5], bellhouse_in: [9, 11], workbench: [3, 4], mirror: [9, 4], bellhouse_door: [9, 12] },   // bellhouse_door: where the Smith leaves in ilya_bellhouse (E3-integrate)
  start: { x: 9, y: 12, dir: 'up' },
};
