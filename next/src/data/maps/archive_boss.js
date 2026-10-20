// Heart of the Archive: a hollow inside the willow (24 x 20). The party enters from the south; the Archivore
// feeds at the north end over the Book's fragment. After the fight a root passage opens in the east wall and
// leads out to the valley beside the Archive door (valley mark root_exit).
import { grid, box, put, rows, room, door, object, actor, trigger, enter, light } from './_kit.js';

// W8-archive (CRITIQUE_3 #3): wall depth. A wall cell that touches a room stays the wall band '#' (a full tile of
// wall top: the walls have thickness); wall cells further out become the deep 'v'; under a band's south side the
// structure shows its outer face 'o' (one or two rows) falling away into the dark. Collision is unchanged: all
// three are wall.
function depth(g) {
  const H = g.length, W = g[0].length;
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? '#' : g[y][x]);
  const band = (x, y) => {
    if (at(x, y) !== '#') return false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(x + dx, y + dy) !== '#') return true;
    return false;
  };
  const out = g.map((r) => r.split(''));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (g[y][x] !== '#' || band(x, y)) continue;
    if (band(x, y - 1)) out[y][x] = 'o';
    else if (y >= 2 && out[y - 1][x] === 'o' && band(x, y - 2)) out[y][x] = 'o';
    else out[y][x] = 'v';
  }
  return out.map((r) => r.join(''));
}

// Root masses lie on wall tops only (they are solid): any placement that would touch a floor or face cell is dropped.
// a = a braid along a north/south wall (2 x 1 cells), b = a braid down a side wall (1 x 2 cells).
function rootMasses(ground, list) {
  const wall = (x, y) => 'v#o'.includes((ground[y] || '')[x] || '.');
  return list.filter(([k, x, y]) => (k === 'a' ? [[0, 0], [1, 0]] : [[0, 0], [0, 1]]).every(([dx, dy]) => wall(x + dx, y + dy)))
    .map(([k, x, y]) => ({ t: `root_mass_${k}`, x, y }));
}

const W = 24, H = 20;
const g = grid(W, H, '#');
room(g, 4, 4, 19, 17, '.', '|');
// the hollow narrows at the top and bottom
box(g, 4, 4, 5, 5, '#'); box(g, 18, 4, 19, 5, '#');
box(g, 4, 16, 5, 17, '#'); box(g, 18, 16, 19, 17, '#');
put(g, 12, 18, '.');                       // entry notch from the great door
box(g, 4, 2, 5, 3, '#'); box(g, 18, 2, 19, 3, '#');   // no face above the narrowed corners (W8-archive)
// ink seeps from the roots
box(g, 5, 7, 6, 9, 'i'); box(g, 17, 10, 18, 12, 'i'); put(g, 6, 14, 'i');
put(g, 7, 14, 'i');                        // W8-archive: the small pool is a 2-cell seep (ragged edges are in the art)
// the carpet of pages up the middle
box(g, 11, 6, 12, 17, 'c');
box(g, 10, 5, 13, 7, 'b');
put(g, 4, 10, 'm'); put(g, 4, 11, 'm'); put(g, 19, 14, 'm'); put(g, 19, 15, 'm');
const ground = rows(depth(g));

const overlays = [
  { t: 'roots_0', x: 6, y: 4 }, { t: 'roots_1', x: 17, y: 4 }, { t: 'roots_2', x: 4, y: 6 }, { t: 'roots_0', x: 19, y: 7 },
  { t: 'roots_1', x: 4, y: 13 }, { t: 'roots_2', x: 19, y: 9 }, { t: 'roots_0', x: 7, y: 17 }, { t: 'roots_1', x: 16, y: 17 },
  { t: 'roots_2', x: 8, y: 11 }, { t: 'roots_0', x: 15, y: 13 },
  { t: 'ink_puddle_0', x: 9, y: 9 }, { t: 'ink_puddle_1', x: 14, y: 8 }, { t: 'ink_puddle_0', x: 15, y: 15 }, { t: 'ink_puddle_1', x: 8, y: 15 },
  { t: 'wall_glyph_revealed', x: 7, y: 2 }, { t: 'wall_glyph_revealed', x: 16, y: 2 },
  // W8-archive: ink weeping from the wall behind the Archivore, roots pouring over the panelling, root masses in the
  // narrowed corners and in the dark round the hollow (wall cells only: they are solid)
  { t: 'wall_ink_seep', x: 11, y: 2 }, { t: 'wall_ink_seep', x: 12, y: 2 }, { t: 'root_drape', x: 6, y: 2 },
  { t: 'root_drape', x: 17, y: 2 },
  ...rootMasses(ground, [['a', 4, 4], ['a', 18, 5], ['a', 5, 1], ['a', 15, 1], ['a', 7, 18], ['a', 15, 18],
    ['b', 3, 7], ['b', 3, 12], ['b', 20, 9], ['b', 20, 13]]),
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
  // W8-archive (CRITIQUE_3 #10): the field avatar is the hovering winged eye of the battle (w8-art, enemies_field)
  actor('archivore', 12, 6, 'archivore_avatar', 'up', { ifNot: 'archivore_defeated' }),
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
  under: 'stacks_wood',
  pitTo: ['archive_boss', 12, 16, 'up'],
  legend: { '#': 'stacks_top', '|': 'stacks_face', 'v': 'stacks_out_top', 'o': 'stacks_out_face', '.': 'stacks_wood',
    'c': 'carpet_red', 'b': 'carpet_blue', 'm': 'moss', 'i': 'ink' },
  ground,
  overlays,
  decor,
  overhead: [],
  events,
  exits: [],
  marks: { archivore: [12, 6], fragment_spot: [12, 9], entrance: [12, 17], root_exit: [16, 4] },
  start: { x: 12, y: 17, dir: 'up' },
};
