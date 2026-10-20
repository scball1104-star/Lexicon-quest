// Rootbound Archive, F3: The Rootbound Stacks (40 x 30). Dark (lighting.dark 0.7): braziers light the rooms.
//
// Main path: entry (north-west) -> the western stacks WS (dark; letter 3 wedged in the roots) -> south corridor
// -> the bell hollow BH (the thirteenth bell, on the path) -> east -> the great door hall GD (boss door, the
// Keeper's font, the shortcut stairs back to F1).
// Branches: WS -> east -> crystal room CR (three crystal switches open the barred door to the key room BK:
// the Stacks Key); CR -> east -> pit room PR: the pits drop into the cache C below (gold chest; a hidden ink
// bridge to the First Quill), the cache's stairs lead back up (one way).
import { grid, box, put, rows, room, wallShelf, door, sign, book, object, trigger, enemy, chest, crystal, gate,
  brazier, font, light, pit, steps, enter } from './_kit.js';

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

const W = 40, H = 30;
const g = grid(W, H, '#');
room(g, 2, 4, 9, 7, '.', '|');             // E entry
room(g, 17, 4, 24, 7, '.', '|');           // BK key room
room(g, 2, 11, 14, 18, '.', '|');          // WS western stacks
room(g, 17, 11, 24, 18, '.', '|');         // CR crystal room
room(g, 27, 11, 37, 18, '.', '|');         // PR pit room
room(g, 2, 22, 9, 27, '.', '|');           // BH bell hollow
room(g, 13, 22, 26, 27, '.', '|');         // GD great door hall
room(g, 29, 23, 37, 27, '.', '|');         // C the cache below the pits
box(g, 5, 8, 6, 10, '.');                  // entry down into WS (through WS's north face)
box(g, 15, 14, 16, 15, '.');               // WS -> CR
box(g, 25, 14, 26, 15, '.');               // CR -> PR
box(g, 5, 19, 6, 21, '.');                 // WS -> BH (through BH's north face)
box(g, 10, 25, 12, 26, '.');               // BH -> GD
put(g, 20, 8, '.');                        // BK notch
put(g, 5, 3, '.'); put(g, 24, 21, '.'); put(g, 33, 22, '.');   // stairs doorAt cells (objects draw them)
// pits in the pit room
box(g, 29, 13, 31, 14, 'p'); box(g, 33, 15, 35, 16, 'p'); put(g, 32, 12, 'p'); put(g, 36, 13, 'p');
// W8-archive (CRITIQUE_3 #4): ragged pit outlines (no rectangles); the doorway, the braziers and the landing stay clear
put(g, 30, 12, 'p'); put(g, 31, 12, 'p'); put(g, 30, 15, 'p'); put(g, 34, 17, 'p'); put(g, 35, 17, 'p'); put(g, 36, 16, 'p');
// ink in the cache with the First Quill beyond it
box(g, 34, 24, 35, 27, 'i');
// floor dressing
box(g, 19, 22, 21, 27, 'c'); box(g, 20, 4, 21, 7, 'b');
put(g, 2, 18, 'm'); put(g, 3, 18, 'm'); put(g, 2, 17, 'm'); put(g, 14, 11, 'm'); put(g, 9, 27, 'm'); put(g, 8, 27, 'm');
put(g, 37, 18, 'm'); put(g, 36, 18, 'm'); put(g, 29, 27, 'm');
const ground = rows(depth(g));

const overlays = [
  { t: 'ink_bridge_h_faint', x: 34, y: 25 }, { t: 'ink_bridge_h_faint', x: 35, y: 25 },
  { t: 'wall_glyph_faint', x: 17, y: 20 },    // hidden_ink_3, beside the great door
  { t: 'wall_glyph_revealed', x: 23, y: 2 },  // the broken chronicle
  { t: 'wall_glyph_revealed', x: 22, y: 9 },  // the crystal plaque beside the barred door
  ...wallShelf(2, 4, 9), ...wallShelf(7, 13, 9),
  ...wallShelf(2, 4, 2), ...wallShelf(7, 9, 2),
  ...wallShelf(18, 23, 2),
  ...wallShelf(28, 31, 9), ...wallShelf(33, 36, 9),
  // W8-archive: the landmark. Two great roots climb the walls either side of the great door and knot over its arch
  // (the `root_arch` overhead tile); ink weeps from the panelling beside the door's plate.
  ...wallShelf(13, 15, 20), { t: 'wall_ink_seep', x: 16, y: 20 }, { t: 'root_drape', x: 18, y: 20 },
  { t: 'root_drape', x: 22, y: 20 }, ...wallShelf(23, 23, 20), ...wallShelf(26, 26, 20),
  { t: 'wall_ink_seep', x: 3, y: 20 }, { t: 'root_drape', x: 8, y: 20 }, { t: 'wall_ink_seep', x: 36, y: 21 },
  // root masses swelling out of the wall tops and the dark between the rooms (wall cells only: they are solid)
  ...rootMasses(ground, [['a', 8, 8], ['a', 12, 8], ['a', 23, 8], ['a', 30, 8], ['a', 35, 8], ['a', 2, 19],
    ['a', 8, 19], ['a', 27, 19], ['a', 33, 19], ['a', 3, 28], ['a', 14, 28], ['a', 23, 28], ['a', 31, 28],
    ['a', 3, 1], ['a', 20, 1], ['b', 15, 11], ['b', 26, 16], ['b', 10, 21], ['b', 38, 13], ['b', 1, 14],
    ['b', 27, 24], ['b', 16, 4]]),
  { t: 'wall_cracked', x: 17, y: 9 }, { t: 'wall_cracked', x: 30, y: 21 },
  // roots everywhere: this floor is inside the willow
  { t: 'roots_0', x: 2, y: 11 }, { t: 'roots_1', x: 3, y: 16 }, { t: 'roots_2', x: 2, y: 16 }, { t: 'roots_0', x: 4, y: 17 },
  { t: 'roots_1', x: 13, y: 18 }, { t: 'roots_2', x: 14, y: 12 }, { t: 'roots_0', x: 24, y: 18 }, { t: 'roots_1', x: 17, y: 18 },
  { t: 'roots_2', x: 37, y: 11 }, { t: 'roots_0', x: 27, y: 18 }, { t: 'roots_1', x: 2, y: 22 }, { t: 'roots_2', x: 9, y: 22 },
  { t: 'roots_0', x: 2, y: 27 }, { t: 'roots_1', x: 13, y: 27 }, { t: 'roots_2', x: 26, y: 22 }, { t: 'roots_0', x: 26, y: 27 },
  { t: 'roots_1', x: 29, y: 23 }, { t: 'roots_2', x: 37, y: 27 }, { t: 'roots_0', x: 4, y: 23 }, { t: 'roots_1', x: 8, y: 23 },
  { t: 'ink_puddle_0', x: 7, y: 15 }, { t: 'ink_puddle_1', x: 22, y: 16 }, { t: 'ink_puddle_0', x: 30, y: 17 }, { t: 'ink_puddle_1', x: 16, y: 26 },
];

const decor = [
  // entry
  { t: 'stairs_up', x: 5, y: 3 }, { t: 'brazier_lit', x: 2, y: 4 }, { t: 'brazier_lit', x: 9, y: 4 },
  // western stacks: aisles of shelves split by roots
  { t: 'shelf_wide', x: 4, y: 13 }, { t: 'shelf_rooted', x: 9, y: 13 }, { t: 'shelf_b', x: 12, y: 13 },
  { t: 'shelf_wide', x: 7, y: 16 }, { t: 'shelf_rooted', x: 12, y: 16 },
  { t: 'root_column', x: 4, y: 15 }, { t: 'root_column', x: 13, y: 18 },
  { t: 'pillar', x: 2, y: 13 }, { t: 'pillar', x: 14, y: 13 }, { t: 'pillar', x: 10, y: 18 },
  // crystal room
  { t: 'root_column', x: 20, y: 15 },
  // pit room
  { t: 'root_column', x: 27, y: 13 }, { t: 'shelf_rooted', x: 35, y: 12 },
  // key room
  { t: 'candelabra', x: 17, y: 4 }, { t: 'candelabra', x: 24, y: 4 }, { t: 'reading_table', x: 22, y: 6 },
  // bell hollow
  { t: 'prop_thirteenth_bell', x: 5, y: 25 },
  { t: 'root_column', x: 2, y: 26 }, { t: 'root_column', x: 8, y: 26 },
  { t: 'brazier_lit', x: 3, y: 23 }, { t: 'brazier_lit', x: 8, y: 23 },
  // great door hall
  { t: 'stairs_up', x: 24, y: 21 },
  { t: 'brazier_lit', x: 13, y: 22 }, { t: 'brazier_lit', x: 26, y: 22 },
  { t: 'brazier_lit', x: 18, y: 23 }, { t: 'brazier_lit', x: 22, y: 23 },
  { t: 'reading_table', x: 14, y: 26 },
  // cache
  { t: 'stairs_up', x: 33, y: 22 }, { t: 'brazier_lit', x: 29, y: 24 },
];

const events = [
  enter('f3_enter', 'archive_f3_arrival'),
  door('stairs_f2', 5, 3, ['archive_f2', 35, 11, 'down'], { kind: 'stairs' }),
  door('shortcut_f1', 24, 21, ['archive_f1', 10, 23, 'down'], { kind: 'stairs' }),
  // dark rooms: the braziers the party lights (each becomes a light source), and the lit braziers' light
  brazier('brazier_ws1', 3, 11), brazier('brazier_ws2', 13, 11), brazier('brazier_ws3', 8, 18),
  brazier('brazier_cr1', 17, 11), brazier('brazier_cr2', 24, 11),
  brazier('brazier_pr1', 28, 11), brazier('brazier_pr2', 36, 11), brazier('brazier_pr3', 32, 18),
  light('light_entry', 5, 5, 5), light('light_bh', 5, 24, 5), light('light_gd', 20, 24, 7), light('light_cache', 31, 25, 4),
  // the crystal gate: all three crystals lit open the barred door to the key room
  crystal('crystal_a', 18, 12, 'gate_bk', 'blue'), crystal('crystal_b', 23, 12, 'gate_bk', 'gold'), crystal('crystal_c', 21, 17, 'gate_bk', 'blue'),
  gate('gate_bk', 20, 10, 'door_locked', { to: ['archive_f3', 20, 8, 'up'] }),
  door('notch_bk', 20, 8, ['archive_f3', 20, 11, 'down']),
  sign('crystal_plaque', 22, 10, 'crystal_plaque', { solid: false }),
  // the pits drop into the cache; the cache stairs climb back to the pit room (one way)
  pit('pits_pr', 27, 11, 11, 8, ['archive_f3', 31, 24, 'down']),
  door('cache_up', 33, 22, ['archive_f3', 32, 11, 'down'], { kind: 'stairs' }),
  // the great door
  object('boss_door', 19, 21, 'door_boss_closed', { script: 'boss_door', ifNot: 'boss_door_open' }),
  object('boss_door_open', 19, 21, 'door_boss_open', { if: 'boss_door_open', solid: false }),
  door('boss_passage', 20, 21, ['archive_boss', 12, 17, 'up'], { if: 'boss_door_open' }),
  sign('boss_door_plate', 18, 21, 'boss_door_plate', { solid: false }),
  sign('hidden_ink_3', 17, 21, 'hidden_ink_3', { solid: false, lantern: true }),
  font('keeper_font', 22, 26),
  // the thirteenth bell, on the main path
  trigger('bell_trig', 5, 22, 2, 1, 'thirteenth_bell'),
  object('thirteenth_bell_prop', 5, 25, 'prop_thirteenth_bell', { text: 'thirteenth_bell' }),
  // Tess's third letter, wedged between roots in the western stacks
  object('prop_letter', 3, 17, 'prop_letter', { script: 'find_letter_3', ifNot: 'tess_letter_3_found', solid: false }),
  // chests
  chest('chest_key', 20, 5, 'gold', { item: 'stacks_key', flag: 'stacks_key_found' }),
  chest('chest_cache', 30, 26, 'gold'),
  chest('chest_quill', 37, 25, 'gold', { item: 'first_quill' }),
  // signs and books
  sign('broken_chronicle', 23, 3, 'broken_chronicle', { solid: false }),
  book('keeper_journal_3', 22, 6, 'keeper_journal_3', { solid: false }),
  // visible enemies: 8 per ZONES.archive_f3.plan. The two-wraith group guards the letter alcove (avoidable);
  // the corridor to the bell hollow, which cannot be avoided, carries the lighter ink group (PLAYTEST_REVIEW_1 3).
  enemy('e_ws_ink_a', 6, 12, 'ink_wraith', 'f3_ink', 'chase'),
  enemy('e_ws_mixed', 11, 17, 'tome_golem', 'f3_mixed', 'patrol', { path: steps('left', 4, 'right', 4) }),
  enemy('e_ws_wraiths', 3, 14, 'ink_wraith', 'f3_wraiths', 'guard'),
  enemy('e_cr_golem', 19, 14, 'tome_golem', 'f3_golem', 'guard'),
  enemy('e_pr_golem', 34, 13, 'tome_golem', 'f3_golem', 'chase'),
  enemy('e_pr_mixed', 29, 16, 'tome_golem', 'f3_mixed', 'wander', { radius: 1 }),
  enemy('e_cor_ink', 5, 20, 'ink_wraith', 'f3_ink', 'patrol', { path: steps('down', 1, 'up', 1) }),
  enemy('e_gd_wraiths', 16, 24, 'ink_wraith', 'f3_wraiths', 'chase'),
];

export default {
  id: 'archive_f3', name: 'The Rootbound Stacks', area: 'dungeon',
  // CRITIQUE_3 #12: the deepest floor and the boss approach (the great door hall) get their own track
  music: 'mystery', ambience: 'archive_hush', tileset: 'archive',
  lighting: { tint: 'none', dark: 0.7 },
  // the pit tell (PLAYTEST_REVIEW_1 fix 6): the first time the leader steps into the pit room a single page
  // drifts down into the pit nearest its doorway (W5-systems ambientFx contract; once per map load)
  ambientFx: [{ fx: 'page_fall', at: [29, 14], area: { x: 27, y: 11, w: 11, h: 8 } }],
  under: 'stacks_wood',
  pitTo: ['archive_f3', 31, 24, 'down'],
  legend: { '#': 'stacks_top', '|': 'stacks_face', 'v': 'stacks_out_top', 'o': 'stacks_out_face', '.': 'stacks_wood',
    'c': 'carpet_red', 'b': 'carpet_blue', 'm': 'moss',
    'i': 'ink', 'p': 'pit' },
  ground,
  overlays,
  decor,
  overhead: [{ t: 'root_arch', x: 18, y: 19 }],   // W8-archive: roots knotted over the great door (above actors)
  events,
  exits: [],
  marks: { thirteenth_bell: [6, 25], boss_door: [20, 21], entrance: [5, 4], font: [23, 26] },
  start: { x: 5, y: 4, dir: 'down' },
};
