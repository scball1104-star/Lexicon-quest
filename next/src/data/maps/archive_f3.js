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
// ink in the cache with the First Quill beyond it
box(g, 34, 24, 35, 27, 'i');
// floor dressing
box(g, 19, 22, 21, 27, 'c'); box(g, 20, 4, 21, 7, 'b');
put(g, 2, 18, 'm'); put(g, 3, 18, 'm'); put(g, 2, 17, 'm'); put(g, 14, 11, 'm'); put(g, 9, 27, 'm'); put(g, 8, 27, 'm');
put(g, 37, 18, 'm'); put(g, 36, 18, 'm'); put(g, 29, 27, 'm');
const ground = rows(g);

const overlays = [
  { t: 'ink_bridge_h_faint', x: 34, y: 25 }, { t: 'ink_bridge_h_faint', x: 35, y: 25 },
  { t: 'wall_glyph_faint', x: 17, y: 20 },    // hidden_ink_3, beside the great door
  { t: 'wall_glyph_revealed', x: 23, y: 2 },  // the broken chronicle
  ...wallShelf(2, 4, 9), ...wallShelf(7, 13, 9),
  ...wallShelf(2, 4, 2), ...wallShelf(7, 9, 2),
  ...wallShelf(18, 23, 2),
  ...wallShelf(28, 31, 9), ...wallShelf(33, 36, 9),
  ...wallShelf(13, 16, 20), ...wallShelf(22, 23, 20), ...wallShelf(26, 26, 20),
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
  { t: 'shelf_wide', x: 4, y: 13 }, { t: 'shelf_a', x: 9, y: 13 }, { t: 'shelf_b', x: 12, y: 13 },
  { t: 'shelf_wide', x: 7, y: 16 }, { t: 'shelf_a', x: 12, y: 16 },
  { t: 'root_column', x: 4, y: 15 }, { t: 'root_column', x: 13, y: 18 },
  { t: 'pillar', x: 2, y: 13 }, { t: 'pillar', x: 14, y: 13 }, { t: 'pillar', x: 10, y: 18 },
  // crystal room
  { t: 'root_column', x: 20, y: 15 },
  // pit room
  { t: 'root_column', x: 27, y: 13 }, { t: 'shelf_b', x: 35, y: 12 },
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
  // visible enemies: 8 per ZONES.archive_f3.plan
  enemy('e_ws_ink_a', 6, 12, 'ink_wraith', 'f3_ink', 'chase'),
  enemy('e_ws_mixed', 11, 17, 'tome_golem', 'f3_mixed', 'patrol', { path: steps('left', 4, 'right', 4) }),
  enemy('e_ws_ink_b', 3, 14, 'ink_wraith', 'f3_ink', 'guard'),
  enemy('e_cr_golem', 19, 14, 'tome_golem', 'f3_golem', 'guard'),
  enemy('e_pr_golem', 34, 13, 'tome_golem', 'f3_golem', 'chase'),
  enemy('e_pr_mixed', 29, 16, 'tome_golem', 'f3_mixed', 'wander', { radius: 1 }),
  enemy('e_cor_wraiths', 5, 20, 'ink_wraith', 'f3_wraiths', 'patrol', { path: steps('down', 1, 'up', 1) }),
  enemy('e_gd_wraiths', 16, 24, 'ink_wraith', 'f3_wraiths', 'chase'),
];

export default {
  id: 'archive_f3', name: 'The Rootbound Stacks', area: 'dungeon',
  music: 'archive', ambience: 'archive_hush', tileset: 'archive',
  lighting: { tint: 'none', dark: 0.7 },
  under: 'archive_floor',
  pitTo: ['archive_f3', 31, 24, 'down'],
  legend: { '#': 'archive_top', '|': 'archive_face', '.': 'archive_floor', 'c': 'carpet_red', 'b': 'carpet_blue', 'm': 'moss',
    'i': 'ink', 'p': 'pit' },
  ground,
  overlays,
  decor,
  overhead: [],
  events,
  exits: [],
  marks: { thirteenth_bell: [6, 25], boss_door: [20, 21], entrance: [5, 4], font: [23, 26] },
  start: { x: 5, y: 4, dir: 'down' },
};
