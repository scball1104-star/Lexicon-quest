// Hero's home: a sleeping loft (left) and the main room with Hazel's hearth (right).
// START_POS in game/state.js is (4,3) facing down: that is the bed's foot cell (mark `bed`).
import { rows, npc, door, sign, enter } from './_kit.js';

const ground = rows([
  //0         1
  //012345678901234567
  '##################', // 0
  '#|||||||#||||||||#', // 1
  '#|||||||#||||||||#', // 2
  '#.......#........#', // 3   bed at (4,2..3); loft cols 1-7, main room cols 9-16
  '#.......#........#', // 4
  '#................#', // 5   doorway between the rooms at (8,5)
  '#.......#........#', // 6
  '#########........#', // 7
  '#########........#', // 8
  '#########........#', // 9
  '#########........#', // 10
  '############.#####', // 11  front door at (12,11)
  '##################', // 12
]);

export default {
  id: 'hero_home', name: 'Home', area: 'interior',
  music: 'willowmere', ambience: null, tileset: 'interior',
  lighting: { tint: 'dawn', dark: 0 },
  under: 'wood_floor',
  legend: { '#': 'interior_top', '|': 'interior_face', '.': 'wood_floor' },
  ground,
  overlays: [
    { t: 'window_in_curtain_red', x: 3, y: 1 }, { t: 'window_in_curtain_red', x: 16, y: 1 },
    { t: 'carpet_red', x: 2, y: 4 }, { t: 'carpet_red', x: 3, y: 4 }, { t: 'carpet_red', x: 2, y: 5 }, { t: 'carpet_red', x: 3, y: 5 },
    { t: 'in_crate', x: 1, y: 3 },
    { t: 'chair_right', x: 11, y: 7 }, { t: 'chair_left', x: 14, y: 7 },
    { t: 'in_barrel', x: 16, y: 9 }, { t: 'in_sacks', x: 16, y: 10 }, { t: 'in_pot', x: 9, y: 10 },
  ],
  decor: [
    { t: 'bed_single', x: 4, y: 3 },
    { t: 'shelf_potions', x: 9, y: 3 },
    { t: 'hearth', x: 11, y: 3 },
    { t: 'bookshelf', x: 14, y: 3 },
    { t: 'printing_press', x: 15, y: 5 },
    { t: 'table_round', x: 12, y: 7 },
    { t: 'rug_round', x: 11, y: 10 },
  ],
  overhead: [],
  events: [
    enter('wake_up_enter', 'wake_up'),
    enter('ep2_morning_enter', 'ep2_morning'),      // Episode 2 (E2-world asked): the scene guards itself
    npc('hazel', 13, 4, 'up'),
    door('home_exit', 12, 11, ['willowmere', 4, 16, 'down']),
    sign('home_doorframe', 11, 11, 'home_doorframe'),
    sign('home_blanket', 1, 3, 'home_blanket', { solid: false }),
    sign('home_loom', 15, 5, 'home_loom', { solid: false }),
    sign('home_hearth', 12, 3, 'home_hearth', { solid: false }),
    sign('home_window', 16, 2, 'home_window', { solid: false }),
    sign('home_bookshelf', 14, 3, 'home_bookshelf', { solid: false }),
  ],
  exits: [],
  marks: { bed: [4, 3], bedside: [3, 3], hazel_start: [13, 4] },
  start: { x: 4, y: 3, dir: 'down' },
};
