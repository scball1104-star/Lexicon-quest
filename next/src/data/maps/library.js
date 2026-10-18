// Willowmere Library. Ground floor: Iris's desk facing the door, Mira's reading table under the window,
// stacks along the walls, the globe, the returns cart. The mezzanine (right block) holds the rare shelves
// and the child's map, reached by the stair (same-map transfer).
import { rows, npc, door, sign, book, enter, stairs } from './_kit.js';

const ground = rows([
  //0         1         2
  //0123456789012345678901
  '######################', // 0
  '#|||||||||||||#|||||||', // 1
  '#|||||||||||||#|||||||', // 2
  '#.............#......#', // 3
  '#.............#......#', // 4
  '#.............#......#', // 5
  '#.............#......#', // 6
  '#.............#......#', // 7
  '#.............#......#', // 8
  '#.............#......#', // 9
  '#.............########', // 10
  '#.............#       ', // 11
  '#.............#       ', // 12
  '#.............#       ', // 13
  '##########.###########', // 14  door at (10,14)
  '######################', // 15
]);

export default {
  id: 'library', name: 'Willowmere Library', area: 'interior',
  music: null, ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  ambientFx: ['motes'],                       // dust drifting in the window light (CRITIQUE_1 C17)
  under: 'wood_floor',
  legend: { '#': 'interior_top', '|': 'interior_face', '.': 'wood_floor', ' ': 'interior_top' },
  ground,
  overlays: [
    { t: 'window_in_curtain_blue', x: 4, y: 1 }, { t: 'window_in_curtain_blue', x: 10, y: 1 }, { t: 'window_in', x: 18, y: 1 },
    { t: 'carpet_blue', x: 5, y: 7 }, { t: 'carpet_blue', x: 6, y: 7 }, { t: 'carpet_blue', x: 7, y: 7 }, { t: 'carpet_blue', x: 8, y: 7 },
    { t: 'carpet_blue', x: 5, y: 8 }, { t: 'carpet_blue', x: 6, y: 8 }, { t: 'carpet_blue', x: 7, y: 8 }, { t: 'carpet_blue', x: 8, y: 8 },
    { t: 'carpet_blue', x: 5, y: 9 }, { t: 'carpet_blue', x: 6, y: 9 }, { t: 'carpet_blue', x: 7, y: 9 }, { t: 'carpet_blue', x: 8, y: 9 },
    { t: 'chair_up', x: 5, y: 5 },
    { t: 'in_crate', x: 1, y: 13 }, { t: 'in_crate', x: 2, y: 13 },
  ],
  decor: [
    // ground floor stacks
    { t: 'bookshelf', x: 1, y: 3 }, { t: 'bookshelf', x: 6, y: 3 }, { t: 'bookshelf', x: 8, y: 3 },
    { t: 'bookshelf', x: 10, y: 3 },
    { t: 'bookshelf', x: 1, y: 7 }, { t: 'bookshelf', x: 1, y: 10 },
    { t: 'bookshelf', x: 12, y: 9 },
    { t: 'desk', x: 7, y: 6 },                     // Iris's desk, facing the door
    { t: 'reading_table_long', x: 2, y: 4 },       // Mira's table, piled with books
    { t: 'lectern', x: 11, y: 12 },                // the globe stand
    { t: 'crates_barrels', x: 1, y: 12 },          // the returns cart
    { t: 'stairs_in_up', x: 12, y: 2 },
    // mezzanine
    { t: 'stairs_in_down', x: 15, y: 2 },
    { t: 'bookshelf', x: 17, y: 3 }, { t: 'bookshelf', x: 19, y: 3 }, { t: 'bookshelf', x: 12, y: 6 },
    { t: 'bookshelf', x: 15, y: 7 },
    { t: 'reading_table', x: 18, y: 9 },
    { t: 'candelabra', x: 20, y: 5 },
  ],
  overhead: [],
  events: [
    enter('mira_joins_enter', 'mira_joins'),
    npc('iris', 8, 5, 'down'),
    npc('mira', 3, 5, 'up'),
    door('library_exit', 10, 14, ['willowmere', 38, 23, 'down']),
    stairs('library_up', 12, 2, ['library', 15, 2, 'down']),
    stairs('library_down', 15, 2, ['library', 12, 2, 'down']),
    sign('library_desk', 7, 6, 'library_desk', { solid: false }),
    sign('library_globe', 11, 12, 'library_globe', { solid: false }),
    sign('library_returns', 1, 12, 'library_returns', { solid: false }),
    sign('mira_desk', 2, 4, 'mira_desk', { solid: false }),
    book('book_tales', 1, 3, 'tales_of_the_keepers', { solid: false }),
    book('book_guide', 6, 3, 'archive_visitors_guide', { solid: false }),
    book('book_beasts', 8, 3, 'keeper_beasts', { solid: false }),
    book('book_bells', 10, 3, 'on_bells', { solid: false }),
    book('book_river', 1, 10, 'riverwise', { solid: false }),
    book('book_map', 17, 3, 'childs_map', { solid: false }),
    book('book_history', 19, 3, 'willowmere_history', { solid: false }),
  ],
  exits: [],
  marks: { mira_meet: [10, 12] },
  start: { x: 10, y: 13, dir: 'up' },
};
