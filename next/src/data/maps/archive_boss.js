// Heart of the Archive: a hollow inside the willow (24 x 20). The party enters from the south; the Archivore
// feeds at the north end over the Book's fragment. After the fight a root passage opens in the east wall and
// leads out to the valley beside the Archive door (valley mark root_exit).
import { grid, box, put, rows, room, door, object, actor, trigger, enter, light } from './_kit.js';

const W = 24, H = 20;
const g = grid(W, H, '#');
room(g, 4, 4, 19, 17, '.', '|');
// the hollow narrows at the top and bottom
box(g, 4, 4, 5, 5, '#'); box(g, 18, 4, 19, 5, '#');
box(g, 4, 16, 5, 17, '#'); box(g, 18, 16, 19, 17, '#');
put(g, 12, 18, '.');                       // entry notch from the great door
// ink seeps from the roots
box(g, 5, 7, 6, 9, 'i'); box(g, 17, 10, 18, 12, 'i'); put(g, 6, 14, 'i');
// the carpet of pages up the middle
box(g, 11, 6, 12, 17, 'c');
box(g, 10, 5, 13, 7, 'b');
put(g, 4, 10, 'm'); put(g, 4, 11, 'm'); put(g, 19, 14, 'm'); put(g, 19, 15, 'm');
const ground = rows(g);

const overlays = [
  { t: 'roots_0', x: 6, y: 4 }, { t: 'roots_1', x: 17, y: 4 }, { t: 'roots_2', x: 4, y: 6 }, { t: 'roots_0', x: 19, y: 7 },
  { t: 'roots_1', x: 4, y: 13 }, { t: 'roots_2', x: 19, y: 9 }, { t: 'roots_0', x: 7, y: 17 }, { t: 'roots_1', x: 16, y: 17 },
  { t: 'roots_2', x: 8, y: 11 }, { t: 'roots_0', x: 15, y: 13 },
  { t: 'ink_puddle_0', x: 9, y: 9 }, { t: 'ink_puddle_1', x: 14, y: 8 }, { t: 'ink_puddle_0', x: 15, y: 15 }, { t: 'ink_puddle_1', x: 8, y: 15 },
  { t: 'wall_glyph_revealed', x: 8, y: 2 }, { t: 'wall_glyph_revealed', x: 15, y: 2 },
];

const decor = [
  { t: 'root_column', x: 6, y: 6 }, { t: 'root_column', x: 16, y: 7 },
  { t: 'root_column', x: 4, y: 15 }, { t: 'root_column', x: 18, y: 15 },
  { t: 'root_column', x: 7, y: 12 }, { t: 'root_column', x: 15, y: 11 },
  { t: 'brazier_lit', x: 9, y: 5 }, { t: 'brazier_lit', x: 14, y: 5 },
  { t: 'candelabra', x: 5, y: 12 }, { t: 'candelabra', x: 18, y: 8 },
  { t: 'shelf_wide', x: 8, y: 4 }, { t: 'shelf_wide', x: 13, y: 4 },
];

const events = [
  enter('boss_enter', 'archivore'),
  actor('archivore', 12, 6, 'archivore', 'up'),
  door('back_to_f3', 12, 18, ['archive_f3', 20, 22, 'down']),
  // the root passage that opens after the fight
  object('root_passage', 16, 3, 'door_locked_open', { if: 'archivore_defeated', solid: false }),
  door('root_passage_exit', 16, 3, ['valley', 39, 7, 'down'], { if: 'archivore_defeated', w: 2 }),
  light('light_heart', 12, 8, 9),
];

export default {
  id: 'archive_boss', name: 'Heart of the Archive', area: 'dungeon',
  music: null, ambience: 'archive_hush', tileset: 'archive',
  lighting: { tint: 'ink', dark: 0.45 },
  under: 'archive_floor',
  pitTo: ['archive_boss', 12, 16, 'up'],
  legend: { '#': 'archive_top', '|': 'archive_face', '.': 'archive_floor', 'c': 'carpet_red', 'b': 'carpet_blue', 'm': 'moss', 'i': 'ink' },
  ground,
  overlays,
  decor,
  overhead: [],
  events,
  exits: [],
  marks: { archivore: [12, 6], fragment_spot: [12, 9], entrance: [12, 17], root_exit: [16, 4] },
  start: { x: 12, y: 17, dir: 'up' },
};
