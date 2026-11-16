// The First Library Index (EPISODE8_PLAN 4.3): the Chapel of the Twelve Bells' layout and exit (chapel.js), re-dressed: card
// drawers to the ceiling down both walls, the high desk where the altar stood (the Librarian at librarian_desk (5,4) until
// librarian_met; the First Keeper there from keeper_named), the door behind the desk (back_door (5,3), locked, flavor), the
// tower base as the stacks' anteroom with the save bell, its own key ep8_index_bell (12,11). index_trig (the whole nave row
// y 11, two tiles in from the door (9,13)) runs meet_librarian. Dark 0.15, a lamp pool on the desk. Fits one screen
// (18 x 15): the camera rule is exempt. Exact cells in docs/MAPS_EP8_A.md 4.
import { rows, npc, door, sign, trigger } from './_kit.js';

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
  '#................#', // 10  doorway into the anteroom at (11,10)
  '#..........#.....#', // 11
  '#..........#######', // 12
  '#########.########', // 13  door at (9,13)
  '##################', // 14
]);

export default {
  id: 'ep8_sc_index', name: 'The First Library Index', area: 'interior',
  music: 'mystery', ambience: 'library_hush', tileset: 'interior',
  lighting: { tint: 'none', dark: 0.15 },
  under: 'stone_floor',
  legend: { '#': 'interior_stone_top', '|': 'interior_stone_face', '.': 'stone_floor' },
  ground,
  overlays: [
    ...[6, 7, 8, 9, 10, 11, 12].map((y) => ({ t: 'carpet_red', x: 5, y })),
    { t: 'carpet_red', x: 9, y: 13 },
  ],
  decor: [
    // card drawers to the ceiling down both walls of the nave
    { t: 'card_cabinet', x: 1, y: 3 }, { t: 'card_cabinet', x: 1, y: 6 }, { t: 'card_cabinet', x: 1, y: 9 },
    { t: 'card_cabinet', x: 9, y: 3 }, { t: 'card_cabinet', x: 9, y: 6 }, { t: 'card_cabinet', x: 9, y: 9 },
    { t: 'lectern', x: 4, y: 5 }, { t: 'lectern', x: 6, y: 5 },          // the high desk
    { t: 'candelabra', x: 3, y: 3 }, { t: 'candelabra', x: 7, y: 3 },
    // the anteroom
    { t: 'shelf_wide', x: 13, y: 3 }, { t: 'book_stack', x: 16, y: 5 }, { t: 'card_cabinet', x: 16, y: 8 },
    { t: 'signboard', x: 12, y: 11 },                                    // the hand-bell stand
  ],
  overhead: [],
  events: [
    door('index_exit', 9, 13, ['ep8_scriptorium', 17, 11, 'down']),
    trigger('index_trig', 1, 11, 10, 1, 'meet_librarian', { if: 'read_learned', ifNot: 'librarian_met' }),
    npc('ep8_librarian', 5, 4, 'down', { ifNot: 'librarian_met' }),
    npc('first_keeper', 5, 4, 'down', { if: 'keeper_named' }),
    sign('index_desk_l', 4, 5, 'ep8_index_desk'),
    sign('index_desk_r', 6, 5, 'ep8_index_desk'),
    sign('card_drawers', 1, 4, 'ep8_card_drawers'),
    sign('card_drawers_e', 9, 4, 'ep8_card_drawers'),
    sign('back_door', 5, 3, 'ep8_back_door', { solid: false, dir: 'up' }),
    { id: 'save_bell_index', type: 'save', x: 12, y: 11, text: 'ep8_index_bell' },
    { id: 'desk_lamp', type: 'light', x: 5, y: 5, r: 4, color: '#f9d77a' },
  ],
  exits: [],
  marks: {
    librarian_desk: [5, 4], desk: [5, 5], back_door: [5, 3],
    party_stop: [5, 7], party_stop_m: [4, 7], party_stop_b: [6, 7], index_stage: [9, 11],
  },
  start: { x: 9, y: 12, dir: 'up' },
};
