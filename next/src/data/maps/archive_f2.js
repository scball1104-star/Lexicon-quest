// Rootbound Archive, F2: The Reading Galleries (40 x 30).
//
// One long gallery band (rows 12..17) cut by ink moats: the Echo Warden's rotunda (west, cols 2..7) | ink |
// the Reading Hall hub (cols 10..29) | ink | the stairs room (cols 33..38). The hub's floor switch slides two
// shelves on their rails so only one of the two south doorways is open at a time ("rotate which gallery is
// open"). West wing: long gallery, then north into the rotunda from the south: the Warden faces down over the
// lantern pedestal. East wing: the reading rooms (letter 2, Iron Pike). With the Lantern, hidden ink bridges
// appear: one beside the pedestal straight back into the hub (the shortcut), one from the hub to the stairs.
// The stairs room holds the floor's Keeper's font (heal, save, `safe` landmark): the last one before F3's. It sits
// past the east hidden-ink bridge, so it only opens with the Lantern. W10 (PLAYTEST_REVIEW_2 fix 1): a second font
// stands in the entry hall beside the stairs up, the rest point before the Warden after the long F1 stretch.
import { grid, box, put, rows, room, wallShelf, door, sign, book, object, trigger, enemy, chest, actor,
  floorSwitch, shelf, font, light, steps, enter } from './_kit.js';

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

const W = 40, H = 30;
const g = grid(W, H, '#');
room(g, 15, 4, 25, 8, '.', '|');           // N entry hall
room(g, 2, 12, 38, 17, '.', '|');          // the gallery band: rotunda | ink | hub | ink | stairs room
box(g, 8, 12, 9, 17, 'i');                 // west moat
box(g, 30, 12, 32, 17, 'i');               // east moat
// W8-archive (CRITIQUE_3 #4): ragged moat outlines, so the ink reads as pools cut into the floor and never as
// rectangles; the hidden-bridge rows and every prop cell stay as they were
put(g, 10, 15, 'i'); put(g, 7, 16, 'i');   // west moat bulges
put(g, 32, 12, '.'); put(g, 29, 15, 'i'); put(g, 33, 16, 'i');   // east moat
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
const ground = rows(depth(g));

const overlays = [
  // hidden ink: the shortcut bridge beside the pedestal and the exit bridge to the stairs room
  { t: 'ink_bridge_h_faint', x: 8, y: 14 }, { t: 'ink_bridge_h_faint', x: 9, y: 14 },
  { t: 'ink_bridge_h_faint', x: 30, y: 14 }, { t: 'ink_bridge_h_faint', x: 31, y: 14 }, { t: 'ink_bridge_h_faint', x: 32, y: 14 },
  { t: 'wall_glyph_faint', x: 6, y: 10 },     // hidden_ink_1, beside the pedestal
  { t: 'wall_glyph_faint', x: 34, y: 10 },    // hidden_ink_2, by the stairs
  // W8-archive: the Reading Galleries are glass. The landmark is the rose window over the Lantern's pedestal in
  // the Warden's rotunda; tall lancets of blue-green glass stand between the shelves of the hub, the entry hall and
  // the reading rooms.
  { t: 'gallery_rose', x: 3, y: 10 },
  ...wallShelf(10, 12, 10), { t: 'gallery_window', x: 13, y: 10 }, ...wallShelf(14, 15, 10),
  { t: 'gallery_window', x: 16, y: 10 }, ...wallShelf(17, 18, 10),
  ...wallShelf(22, 23, 10), { t: 'gallery_window', x: 24, y: 10 }, ...wallShelf(25, 26, 10),
  { t: 'gallery_window', x: 27, y: 10 }, ...wallShelf(28, 29, 10),
  { t: 'gallery_window', x: 15, y: 2 }, ...wallShelf(16, 18, 2), ...wallShelf(22, 24, 2), { t: 'gallery_window', x: 25, y: 2 },
  ...wallShelf(30, 33, 20), { t: 'gallery_window', x: 34, y: 20 }, ...wallShelf(35, 37, 20),
  { t: 'gallery_window', x: 6, y: 20 }, ...wallShelf(7, 11, 20),
  { t: 'wall_cracked', x: 36, y: 10 }, { t: 'wall_cracked', x: 2, y: 20 },
  { t: 'roots_0', x: 2, y: 12 }, { t: 'roots_1', x: 38, y: 12 }, { t: 'roots_2', x: 14, y: 17 }, { t: 'roots_1', x: 27, y: 27 },
  { t: 'roots_0', x: 13, y: 27 }, { t: 'roots_2', x: 2, y: 26 }, { t: 'roots_1', x: 15, y: 8 }, { t: 'roots_0', x: 25, y: 8 },
  { t: 'ink_puddle_0', x: 11, y: 16 }, { t: 'ink_puddle_1', x: 28, y: 13 }, { t: 'ink_puddle_0', x: 35, y: 26 }, { t: 'ink_puddle_1', x: 6, y: 25 },
];

const decor = [
  // W8-archive: lecterns in the hub and the reading rooms
  { t: 'lectern', x: 12, y: 13 }, { t: 'lectern', x: 27, y: 13 }, { t: 'lectern', x: 33, y: 27 },
  // entry hall: desks where the ink readers sit
  // (W10: the west desk moved down a row and the west candelabra gave way to the hall's Keeper's font)
  { t: 'reading_table', x: 16, y: 7 }, { t: 'reading_table', x: 23, y: 6 },
  { t: 'candelabra', x: 25, y: 4 },
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
  // W8-archive: the hanging glass lamps (overhead tiles below) cast a little light of their own
  light('lamp_e1', 17, 7, 3, '#9fe8d8'), light('lamp_e2', 24, 5, 3, '#9fe8d8'),
  light('lamp_h1', 14, 13, 3, '#9fe8d8'), light('lamp_h2', 25, 13, 3, '#9fe8d8'), light('lamp_w', 4, 25, 3, '#9fe8d8'),
  door('stairs_f1', 20, 3, ['archive_f1', 31, 3, 'down'], { kind: 'stairs' }),
  door('stairs_f3', 35, 11, ['archive_f3', 5, 3, 'down'], { kind: 'stairs' }),
  // the rotating galleries: one switch, two shelves on rails along the hub's south wall
  floorSwitch('switch_hub', 20, 17, ['shelf_w', 'shelf_e']),
  shelf('shelf_w', [[12, 17], [10, 17]]),      // blocks the west doorway until the switch fires
  shelf('shelf_e', [[29, 17], [27, 17]]),      // parked; the switch slides it over the east doorway
  // the Echo Warden and the Lantern
  actor('echo_warden', 4, 14, 'echo_warden', 'down', { ifNot: 'echo_warden_defeated' }),
  trigger('warden_trig', 3, 16, 4, 1, 'echo_warden'),
  // the pedestal is a game over landmark (`safe`): a lost fight on F2 returns the party here, not to the stairs
  object('lantern_pedestal', 4, 13, 'lantern_pedestal', { script: 'lantern_get', ifNot: 'lantern_get', safe: true }),
  object('lantern_pedestal_empty', 4, 13, 'lantern_pedestal_empty', { if: 'lantern_get', text: 'hidden_ink_1', safe: true }),
  sign('hidden_ink_1', 6, 11, 'hidden_ink_1', { solid: false, lantern: true }),
  sign('hidden_ink_2', 34, 11, 'hidden_ink_2', { solid: false, lantern: true }),
  trigger('f2_exit_trig', 33, 13, 3, 3, 'archive_f2_exit'),
  // the Keeper's fonts of the Galleries: the entry hall's (before the Warden) and the stairs room's (after the Lantern)
  { ...font('keeper_font_f2_hall', 15, 5, 'keeper_font_hall'), safe: true },
  { ...font('keeper_font_f2', 34, 17, 'keeper_font_galleries'), safe: true },
  // Tess's second letter, in the south-east reading room
  object('prop_letter', 37, 23, 'prop_letter', { script: 'find_letter_2', ifNot: 'tess_letter_2_found', solid: false }),
  // faint ink readers (ink-tinted, translucent, non-solid: see docs/MAPS.md)
  actor('reader_1', 16, 8, 'npc_scholar', 'up', { ghost: true, solid: false }),
  actor('reader_2', 23, 7, 'npc_scholar', 'up', { ghost: true, solid: false }),
  actor('reader_3', 25, 15, 'npc_scholar', 'up', { ghost: true, solid: false }),
  // chests: the simulator assumes Iron Pike and Chain Shirt come from F2
  chest('chest_eg', 33, 23, 'iron', { item: 'iron_pike' }),
  chest('chest_wg', 11, 23, 'iron', { item: 'chain_shirt' }),
  // signs and books
  sign('reading_desk', 16, 7, 'reading_desk', { solid: false }),
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
  under: 'gallery_stone',
  pitTo: ['archive_f2', 20, 16, 'down'],
  legend: { '#': 'gallery_top', '|': 'gallery_face', 'v': 'gallery_out_top', 'o': 'gallery_out_face', '.': 'gallery_stone',
    'c': 'carpet_red', 'b': 'carpet_blue', 'm': 'moss', 'i': 'ink' },
  ground,
  overlays,
  decor,
  // hanging glass lamps over the readers' desks (drawn above actors; the light events above match them)
  overhead: [
    { t: 'hanging_lamp', x: 17, y: 6 }, { t: 'hanging_lamp', x: 24, y: 4 },
    { t: 'hanging_lamp', x: 14, y: 12 }, { t: 'hanging_lamp', x: 25, y: 12 }, { t: 'hanging_lamp', x: 4, y: 24 },
  ],
  events,
  exits: [],
  marks: { lantern_pedestal: [4, 13], warden_spot: [4, 14], stairs_down: [35, 12], entrance: [20, 4], font: [35, 15], font_hall: [17, 6] },
  start: { x: 20, y: 4, dir: 'down' },
};
