// The Deep Stacks, the entrance hall under the library (22 x 16, dungeon, dark 0.2). DEEP_STACKS_PLAN 3; C2-sprites-boss.
//
// A small reading room gone wrong, in the Catalogue kit: the trapdoor's stair comes down at the north-west (the party
// arrives at `arrival`, facing down), a blue runner crosses to the first stair down at the north-east, the Keepers'
// glyph is the plaque in the north wall (mark `plaque`, the cell in front of it), and Hollis the Archivist keeps his
// desk in the middle (mark `archivist`, behind the long table, facing the party at `party_stop`). Roots have come
// through the panelling, ink seeps from the shelves, the index cards are everywhere.
//
// Seams the integrator wires (C2-world / C2-story-ui):
//   - the library's trapdoor event: `stairs('stacks_down', LIBRARY_TRAPDOOR..., ['cave_landing0', ...HALL_ARRIVAL, 'down'])`
//     (LIBRARY_TRAPDOOR is this file's suggestion for the library cell: the mezzanine's back wall, free floor today);
//   - the stair down: `stairs_down` lands on `cave_b1` at the generator's arrival for the run seed (gen.js arrivalOf(seed, 1)),
//     which a hand-made map cannot know: its `to` holds an off-map placeholder that C2-world rewrites when a run starts
//     (STAIRS_DOWN_ID); the tests patch it the same way;
//   - the Archivist: `npc('hollis', ...marks.archivist, 'down')` once npcs.js has him (C2-story-ui), and the plaque's
//     sign or object event on the face cell above `plaque` (the cave_props `plaque` sprite, or the glyph as drawn here).
import { rows, room, grid, box, wallDepth, stairs, light } from '../../maps/_kit.js';

export const HALL_ARRIVAL = [5, 5];
export const LIBRARY_TRAPDOOR = [16, 4];
export const STAIRS_DOWN_ID = 'stairs_down';
export const STAIRS_DOWN_PLACEHOLDER = ['cave_b1', -1, -1, 'down'];

const W = 22, H = 16;
const g = grid(W, H, '#');
room(g, 3, 5, 18, 11, '.', '|');            // the hall (faces on rows 3 and 4)
box(g, 5, 6, 15, 6, 'b');                   // the runner between the two stairs
box(g, 3, 9, 4, 10, 'm'); box(g, 17, 10, 18, 11, 'm');   // moss where the roots came through
const ground = rows(wallDepth(g.map((r) => r)));

const overlays = [
  // the north face: shelves and drawers, the Keepers' glyph as the plaque over the desk, a root drape and a crack
  { t: 'wall_shelf_l', x: 3, y: 3 }, { t: 'wall_shelf_r', x: 4, y: 3 },
  { t: 'wall_drawers_l', x: 7, y: 3 }, { t: 'wall_drawers_m', x: 8, y: 3 }, { t: 'wall_drawers_r', x: 9, y: 3 },
  { t: 'wall_glyph_revealed', x: 10, y: 3 },
  { t: 'wall_shelf_l', x: 12, y: 3 }, { t: 'wall_shelf_m', x: 13, y: 3 }, { t: 'wall_shelf_r', x: 14, y: 3 },
  { t: 'root_drape', x: 16, y: 3 }, { t: 'wall_cracked', x: 17, y: 3 }, { t: 'wall_ink_seep', x: 18, y: 3 },
  // the floor: roots, ink, cards
  { t: 'roots_1', x: 3, y: 8 }, { t: 'roots_0', x: 18, y: 9 }, { t: 'roots_2', x: 6, y: 11 }, { t: 'roots_0', x: 16, y: 11 },
  { t: 'ink_puddle_0', x: 15, y: 10 }, { t: 'ink_puddle_1', x: 17, y: 7 },
  { t: 'index_cards', x: 12, y: 7 }, { t: 'index_cards', x: 5, y: 10 }, { t: 'index_cards', x: 14, y: 10 }, { t: 'index_cards', x: 8, y: 5 },
];

const decor = [
  { t: 'stairs_up', x: 5, y: 4 }, { t: 'stairs_down', x: 15, y: 4 },
  { t: 'candelabra', x: 3, y: 5 }, { t: 'candelabra', x: 18, y: 5 }, { t: 'candelabra', x: 3, y: 11 },
  { t: 'reading_table_long', x: 9, y: 9 },            // the Archivist's desk
  { t: 'lectern', x: 13, y: 9 },                      // the record (the plaque screen's lectern)
  { t: 'card_cabinet', x: 16, y: 10 }, { t: 'shelf_a', x: 6, y: 8 },
  { t: 'book_stack', x: 4, y: 10 }, { t: 'book_stack', x: 17, y: 8 }, { t: 'book_stack', x: 12, y: 10 }, { t: 'book_stack', x: 7, y: 11 },
  { t: 'root_column', x: 17, y: 11 },
];

const events = [
  stairs('stairs_up', 5, 4, ['library', LIBRARY_TRAPDOOR[0], LIBRARY_TRAPDOOR[1], 'down']),
  stairs(STAIRS_DOWN_ID, 15, 4, STAIRS_DOWN_PLACEHOLDER.slice()),
  light('l_up', 5, 5, 3, '#ffe6b0'), light('l_down', 15, 5, 3, '#ffe6b0'),
  light('l_lamp_w', 7, 7, 3, '#ffd9a0'), light('l_lamp_e', 13, 7, 3, '#ffd9a0'),
  light('l_plaque', 10, 5, 3, '#9fe8d8'),
];

export default {
  id: 'cave_landing0', name: 'The Deep Stacks, the Entrance Hall', area: 'dungeon', floor: 0, band: 'catalogue', landing: true,
  music: 'archive', ambience: 'archive_hush', tileset: 'archive', backdrop: 'archive',
  lighting: { tint: 'none', dark: 0.2 },
  under: 'catalog_wood',
  legend: { '#': 'catalog_top', '|': 'catalog_face', 'v': 'catalog_out_top', 'o': 'catalog_out_face',
    '.': 'catalog_wood', 'b': 'carpet_blue', 'm': 'moss' },
  ground,
  overlays,
  decor,
  overhead: [{ t: 'hanging_lamp', x: 7, y: 6 }, { t: 'hanging_lamp', x: 13, y: 6 }],
  events,
  exits: [],
  // every mark is a cell the party can stand on (the desk is the long table at 9..11,9; record is the cell in front of the lectern at 13,9)
  marks: {
    arrival: HALL_ARRIVAL, stairs_up: [5, 5], stairs_down: [15, 5], plaque: [10, 5], archivist: [10, 8],
    record: [13, 10], party_stop: [10, 10], runner: [10, 6],
  },
  start: { x: HALL_ARRIVAL[0], y: HALL_ARRIVAL[1], dir: 'down' },
};
