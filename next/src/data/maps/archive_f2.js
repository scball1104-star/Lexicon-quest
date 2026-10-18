// Rootbound Archive, F2: The Reading Galleries (40 x 30).
//
// One long gallery band (rows 12..17) cut by ink moats: the Echo Warden's rotunda (west, cols 2..7) | ink |
// the Reading Hall hub (cols 10..29) | ink | the stairs room (cols 33..38). The hub's floor switch slides two
// shelves on their rails so only one of the two south doorways is open at a time ("rotate which gallery is
// open"). West wing: long gallery, then north into the rotunda from the south: the Warden faces down over the
// lantern pedestal. East wing: the reading rooms (letter 2, Iron Pike). With the Lantern, hidden ink bridges
// appear: one beside the pedestal straight back into the hub (the shortcut), one from the hub to the stairs.
import { grid, box, put, rows, room, wallShelf, door, sign, book, object, trigger, enemy, chest, actor,
  floorSwitch, shelf, steps, enter } from './_kit.js';

const W = 40, H = 30;
const g = grid(W, H, '#');
room(g, 15, 4, 25, 8, '.', '|');           // N entry hall
room(g, 2, 12, 38, 17, '.', '|');          // the gallery band: rotunda | ink | hub | ink | stairs room
box(g, 8, 12, 9, 17, 'i');                 // west moat
box(g, 30, 12, 32, 17, 'i');               // east moat
box(g, 19, 9, 21, 11, '.');                // entry hall down into the hub
room(g, 2, 22, 13, 27, '.', '|');          // WG west gallery
room(g, 27, 22, 38, 27, '.', '|');         // EG east reading rooms
box(g, 12, 18, 13, 21, '.');               // west doorway + corridor
box(g, 27, 18, 28, 21, '.');               // east doorway + corridor
box(g, 4, 18, 5, 21, '.');                 // from WG up into the rotunda
put(g, 20, 3, '.');                        // (stairs_up doorAt; drawn by the object)
// floor dressing
box(g, 19, 12, 21, 17, 'c');
box(g, 19, 4, 21, 8, 'c');
box(g, 3, 13, 6, 16, 'b');
put(g, 33, 17, 'm'); put(g, 34, 17, 'm'); put(g, 2, 27, 'm'); put(g, 3, 27, 'm'); put(g, 38, 27, 'm');
const ground = rows(g);

const overlays = [
  // hidden ink: the shortcut bridge beside the pedestal and the exit bridge to the stairs room
  { t: 'ink_bridge_h_faint', x: 8, y: 14 }, { t: 'ink_bridge_h_faint', x: 9, y: 14 },
  { t: 'ink_bridge_h_faint', x: 30, y: 14 }, { t: 'ink_bridge_h_faint', x: 31, y: 14 }, { t: 'ink_bridge_h_faint', x: 32, y: 14 },
  { t: 'wall_glyph_faint', x: 6, y: 10 },     // hidden_ink_1, beside the pedestal
  { t: 'wall_glyph_faint', x: 34, y: 10 },    // hidden_ink_2, by the stairs
  ...wallShelf(10, 18, 10), ...wallShelf(22, 29, 10),
  ...wallShelf(15, 18, 2), ...wallShelf(22, 25, 2),
  ...wallShelf(30, 33, 20), ...wallShelf(35, 37, 20),
  ...wallShelf(7, 11, 20),
  { t: 'wall_cracked', x: 36, y: 10 }, { t: 'wall_cracked', x: 2, y: 20 },
  { t: 'roots_0', x: 2, y: 12 }, { t: 'roots_1', x: 38, y: 12 }, { t: 'roots_2', x: 14, y: 17 }, { t: 'roots_1', x: 26, y: 27 },
  { t: 'roots_0', x: 13, y: 27 }, { t: 'roots_2', x: 2, y: 26 }, { t: 'roots_1', x: 15, y: 8 }, { t: 'roots_0', x: 25, y: 8 },
  { t: 'ink_puddle_0', x: 11, y: 16 }, { t: 'ink_puddle_1', x: 28, y: 13 }, { t: 'ink_puddle_0', x: 35, y: 26 }, { t: 'ink_puddle_1', x: 6, y: 25 },
];

const decor = [
  // entry hall: desks where the ink readers sit
  { t: 'reading_table', x: 16, y: 6 }, { t: 'reading_table', x: 23, y: 6 },
  { t: 'candelabra', x: 15, y: 4 }, { t: 'candelabra', x: 25, y: 4 },
  { t: 'stairs_up', x: 20, y: 3 },
  // hub: desks, columns, braziers at the moats
  { t: 'reading_table_long', x: 13, y: 14 }, { t: 'reading_table_long', x: 24, y: 14 },
  { t: 'root_column', x: 16, y: 16 }, { t: 'root_column', x: 22, y: 16 },
  { t: 'brazier_lit', x: 10, y: 13 }, { t: 'brazier_lit', x: 29, y: 13 },
  { t: 'brazier_lit', x: 10, y: 16 }, { t: 'brazier_lit', x: 29, y: 16 },
  // rotunda: the pedestal with the Lantern, candelabras, the Warden stands below it
  { t: 'candelabra', x: 2, y: 13 }, { t: 'candelabra', x: 7, y: 13 },
  { t: 'root_column', x: 2, y: 17 }, { t: 'root_column', x: 6, y: 17 },
  // stairs room
  { t: 'stairs_down', x: 35, y: 11 }, { t: 'candelabra', x: 33, y: 12 }, { t: 'candelabra', x: 38, y: 12 },
  // west gallery: shelf aisles
  { t: 'shelf_wide', x: 7, y: 24 }, { t: 'shelf_a', x: 10, y: 24 },
  { t: 'shelf_b', x: 2, y: 24 }, { t: 'reading_table', x: 4, y: 26 },
  { t: 'candelabra', x: 13, y: 22 },
  // east reading rooms
  { t: 'shelf_wide', x: 29, y: 24 }, { t: 'shelf_wide', x: 34, y: 24 },
  { t: 'reading_table', x: 36, y: 26 }, { t: 'reading_table', x: 30, y: 26 },
  { t: 'candelabra', x: 29, y: 22 }, { t: 'candelabra', x: 38, y: 22 },
];

const events = [
  enter('f2_enter', 'archive_f2_arrival'),
  door('stairs_f1', 20, 3, ['archive_f1', 31, 3, 'down'], { kind: 'stairs' }),
  door('stairs_f3', 35, 11, ['archive_f3', 5, 3, 'down'], { kind: 'stairs' }),
  // the rotating galleries: one switch, two shelves on rails along the hub's south wall
  floorSwitch('switch_hub', 20, 17, ['shelf_w', 'shelf_e']),
  shelf('shelf_w', [[12, 17], [10, 17]]),      // blocks the west doorway until the switch fires
  shelf('shelf_e', [[29, 17], [27, 17]]),      // parked; the switch slides it over the east doorway
  // the Echo Warden and the Lantern
  actor('echo_warden', 4, 14, 'echo_warden', 'down', { ifNot: 'echo_warden_defeated' }),
  trigger('warden_trig', 3, 16, 4, 1, 'echo_warden'),
  object('lantern_pedestal', 4, 13, 'lantern_pedestal', { script: 'lantern_get', ifNot: 'lantern_get' }),
  object('lantern_pedestal_empty', 4, 13, 'lantern_pedestal_empty', { if: 'lantern_get', text: 'hidden_ink_1' }),
  sign('hidden_ink_1', 6, 11, 'hidden_ink_1', { solid: false, lantern: true }),
  sign('hidden_ink_2', 34, 11, 'hidden_ink_2', { solid: false, lantern: true }),
  trigger('f2_exit_trig', 33, 13, 3, 3, 'archive_f2_exit'),
  // Tess's second letter, in the south-east reading room
  object('prop_letter', 37, 23, 'prop_letter', { script: 'find_letter_2', ifNot: 'tess_letter_2_found', solid: false }),
  // faint ink readers (ink-tinted, translucent, non-solid: see docs/MAPS.md)
  actor('reader_1', 16, 7, 'npc_scholar', 'up', { ghost: true, solid: false }),
  actor('reader_2', 23, 7, 'npc_scholar', 'up', { ghost: true, solid: false }),
  actor('reader_3', 25, 15, 'npc_scholar', 'up', { ghost: true, solid: false }),
  // chests: the simulator assumes Iron Pike and Chain Shirt come from F2
  chest('chest_eg', 33, 23, 'iron', { item: 'iron_pike' }),
  chest('chest_wg', 11, 23, 'iron', { item: 'chain_shirt' }),
  // signs and books
  sign('reading_desk', 16, 6, 'reading_desk', { solid: false }),
  book('readers_oath', 23, 6, 'readers_oath', { solid: false }),
  book('keeper_journal_2', 4, 26, 'keeper_journal_2', { solid: false }),
  // visible enemies: 7 ordinary per ZONES.archive_f2.plan plus the Warden
  enemy('e_hub_mites', 14, 16, 'bookmite', 'f2_mites', 'wander', { radius: 2 }),
  enemy('e_hub_golem', 27, 15, 'tome_golem', 'f2_golem', 'guard'),
  enemy('e_wg_wraiths', 5, 23, 'page_wraith', 'f2_wraiths', 'patrol', { path: steps('right', 5, 'left', 5) }),
  enemy('e_wg_golem', 12, 26, 'tome_golem', 'f2_golem', 'chase'),
  enemy('e_wg_mixed', 4, 19, 'tome_golem', 'f2_mixed', 'guard'),
  enemy('e_eg_wraiths', 32, 26, 'page_wraith', 'f2_wraiths', 'chase'),
  enemy('e_eg_mixed', 28, 23, 'tome_golem', 'f2_mixed', 'chase'),
];

export default {
  id: 'archive_f2', name: 'The Reading Galleries', area: 'dungeon',
  music: 'archive', ambience: 'archive_hush', tileset: 'archive',
  lighting: { tint: 'none', dark: 0.2 },
  under: 'archive_floor',
  pitTo: ['archive_f2', 20, 16, 'down'],
  legend: { '#': 'archive_top', '|': 'archive_face', '.': 'archive_floor', 'c': 'carpet_red', 'b': 'carpet_blue', 'm': 'moss', 'i': 'ink' },
  ground,
  overlays,
  decor,
  overhead: [],
  events,
  exits: [],
  marks: { lantern_pedestal: [4, 13], warden_spot: [4, 14], stairs_down: [35, 12], entrance: [20, 4] },
  start: { x: 20, y: 4, dir: 'down' },
};
