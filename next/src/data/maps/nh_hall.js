// Mayor's Hall (the Nameless Hollow). EPISODE2_PLAN 4.3: the library's layout and exits, re-dressed. Elian's desk with
// the ledger faces the door; benches for petitioners; a cracked wall mirror; the town notice with a blank title; the
// records room up the stair (the mezzanine). The step trigger two tiles inside the door runs elian_hall; Elian himself
// sits at the desk once the party has met him at the fountain (npcs.js `show`), before that his note lies there.
import { rows, npc, door, sign, book, trigger, stairs, object } from './_kit.js';

const ground = rows([
  //0         1         2
  //0123456789012345678901
  '######################', // 0
  '#|||||||||||||#|||||||', // 1
  '#|||||||||||||#|||||||', // 2
  '#.............#......#', // 3
  '#.............#......#', // 4
  '#.............#......#', // 5
  '#........cc...#......#', // 6
  '#........cc...#......#', // 7
  '#........cc...#......#', // 8
  '#........cc...#......#', // 9
  '#........cc...########', // 10
  '#........cc...#       ', // 11
  '#........cc...#       ', // 12
  '#........cc...#       ', // 13
  '##########.###########', // 14  door at (10,14)
  '######################', // 15
]);

export default {
  id: 'nh_hall', name: "Mayor's Hall", area: 'interior',
  music: [{ if: 'nh_restored', id: 'hollowmere' }, { id: 'hollow' }], ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  ambientFx: ['motes'],
  under: 'stone_floor',
  legend: { '#': 'interior_stone_top', '|': 'interior_stone_face', '.': 'stone_floor', 'c': 'carpet_blue', ' ': 'interior_stone_top' },
  ground,
  overlays: [
    { t: 'window_in_curtain_blue', x: 3, y: 1 }, { t: 'window_in_curtain_blue', x: 11, y: 1 }, { t: 'window_in', x: 18, y: 1 },
    { t: 'mirror_wall', x: 7, y: 1 },                       // the cracked wall mirror
    { t: 'in_crate', x: 1, y: 13 }, { t: 'in_pot', x: 13, y: 3 }
  ],
  decor: [
    { t: 'desk', x: 8, y: 5 },                              // Elian's desk, facing the door
    { t: 'bench', x: 2, y: 8 }, { t: 'bench', x: 2, y: 11 }, { t: 'bench', x: 12, y: 8 },
    { t: 'bookshelf', x: 1, y: 3 }, { t: 'bookshelf', x: 4, y: 3 },
    { t: 'signboard', x: 12, y: 12 },                       // the town notice
    { t: 'stairs_in_up', x: 12, y: 2 },
    { t: 'stairs_in_down', x: 15, y: 2 },
    { t: 'bookshelf', x: 17, y: 3 }, { t: 'bookshelf', x: 19, y: 3 }, { t: 'reading_table', x: 17, y: 7 },
    { t: 'candelabra', x: 20, y: 5 },
  ],
  overhead: [],
  events: [
    npc('elian', 9, 4, 'down'),
    door('hall_exit', 10, 14, ['nameless_hollow', 22, 12, 'down']),
    trigger('hall_trig', 9, 12, 3, 1, 'elian_hall'),
    stairs('hall_up', 12, 2, ['nh_hall', 15, 2, 'down']),
    stairs('hall_down', 15, 2, ['nh_hall', 12, 2, 'down']),
    book('nh_ledger_book', 8, 5, 'nh_ledger', { solid: false }),
    sign('elian_desk_note', 9, 5, 'elian_desk_note', { solid: false }),
    sign('hall_mirror', 7, 2, 'hall_mirror'),
    sign('hall_notice', 12, 12, 'hall_notice', { solid: false }),
    sign('hall_records', 17, 3, 'fitch_shelves', { solid: false }),
  ],
  exits: [],
  marks: { elian_desk: [9, 4], hall_entry: [10, 13] },
  start: { x: 10, y: 13, dir: 'up' },
};
