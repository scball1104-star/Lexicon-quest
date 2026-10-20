// Chapel of the Twelve Bells. Nave with pews, the altar under the round window, the bell-tower base on the
// right (twelve ropes, one empty hook) where Pip stands, and the small hand-bell by the door: the save point.
import { rows, npc, door, sign, object, mirrorDoor, dullMirror } from './_kit.js';

const ground = rows([
  //0         1
  //012345678901234567
  '##################', // 0
  '#||||||||||#|||||#', // 1
  '#||||||||||#|||||#', // 2
  '#..........#.....#', // 3
  '#..........#.....#', // 4
  '#..........#.....#', // 5
  '#..........#.....#', // 6
  '#..........#.....#', // 7
  '#..........#.....#', // 8
  '#..........#.....#', // 9
  '#................#', // 10  doorway into the tower base at (11,10)
  '#..........#.....#', // 11
  '#..........#######', // 12
  '#########.########', // 13  door at (9,13)
  '##################', // 14
]);

export default {
  id: 'chapel', name: 'Chapel of the Twelve Bells', area: 'interior',
  music: null, ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  under: 'stone_floor',
  legend: { '#': 'interior_stone_top', '|': 'interior_stone_face', '.': 'stone_floor' },
  ground,
  overlays: [
    { t: 'window_in_curtain_blue', x: 2, y: 1 }, { t: 'window_in_curtain_blue', x: 9, y: 1 },
    { t: 'window_in', x: 14, y: 1 },
    ...[5, 6].flatMap((x) => [3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((y) => ({ t: 'carpet_red', x, y }))),
    { t: 'carpet_red', x: 7, y: 3 },
    { t: 'in_pot', x: 1, y: 3 }, { t: 'in_pot', x: 10, y: 3 },
    { t: 'carpet_red', x: 9, y: 13 },
  ],
  decor: [
    { t: 'lectern', x: 5, y: 3 },                  // the altar
    { t: 'candelabra', x: 3, y: 3 }, { t: 'candelabra', x: 8, y: 3 },
    // pews, two columns with the aisle between
    { t: 'bench', x: 2, y: 6 }, { t: 'bench', x: 8, y: 6 },
    { t: 'bench', x: 2, y: 8 }, { t: 'bench', x: 8, y: 8 },
    { t: 'bench', x: 2, y: 10 }, { t: 'bench', x: 8, y: 10 },
    // tower base: the stair up to the bells and the rope wall
    { t: 'stairs_in_up', x: 15, y: 2 },
    { t: 'candelabra', x: 12, y: 3 }, { t: 'candelabra', x: 16, y: 5 },
    { t: 'signboard', x: 1, y: 11 },               // the plaque
    { t: 'signboard', x: 12, y: 11 },              // the hand-bell stand
  ],
  overhead: [],
  events: [
    npc('pip', 14, 4, 'up'),
    door('chapel_exit', 9, 13, ['willowmere', 18, 14, 'down']),
    { id: 'save_bell', type: 'save', x: 12, y: 11, text: 'save_bell' },
    sign('chapel_plaque', 1, 11, 'chapel_plaque', { solid: false }),
    sign('chapel_ropes', 13, 2, 'chapel_ropes', { solid: false }),
    sign('chapel_pews', 8, 8, 'chapel_pews', { solid: false }),
    // Episode 2 (E2-maps): the tall old mirror behind the altar; after the Mirror Sigil it opens onto the Hollow's chapel
    dullMirror('wm_mirror', 4, 3, 'mirror_sigil_get', 'wm_chapel_mirror'),
    mirrorDoor('mirror_wm', 4, 3, ['nh_chapel', 9, 4, 'down'], 'mirror_sigil_get'),
  ],
  exits: [],
  marks: {},
  start: { x: 9, y: 12, dir: 'up' },
};
