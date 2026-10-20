// Rootbound Archive, F1: The Catalog Halls (40 x 30).
//
// Critical path: entrance hall (catalog wall) -> east corridor -> plate room H (push two blocks onto two plates,
// the barred door opens) -> east wing I (three fights, iron chest) -> key door (needs the Archive Key) -> stairs
// landing J (the bell tolls) -> stairs down.
// The key: west corridor -> pot storeroom C (break pots to free the push block, push it onto the plate, the
// barred door opens) -> key alcove D (wood chest with the Archive Key).
// Optional: moss alcove E (Tess's letter 1) with a broken wall into the hidden cell F (Wayfarer Mantle).
// Shortcuts: once the bell has tolled (archive_f1_done) a back-stair joins the stairs landing J and the
// antechamber B both ways, so a town trip from F2 skips the floor. The F3 shortcut surfaces in B on archive_f2_done.
// Doors set into wall faces are same-map transfers that land on a one-cell notch in the far room's south wall.
import { grid, box, put, rows, room, wallShelf, npc, door, sign, book, object, trigger, enemy, chest, pot,
  block, plate, gate, lockedDoor, steps, enter } from './_kit.js';

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
// rooms (floor rect + two face rows above)
room(g, 29, 4, 34, 6, '.', '|');           // J stairs landing
room(g, 6, 4, 11, 6, '.', '|');            // D key alcove
room(g, 3, 10, 12, 15, '.', '|');          // C pot storeroom
room(g, 25, 10, 37, 17, '.', '|');         // I east wing
room(g, 14, 12, 17, 13, '.', '|');         // F hidden cell
room(g, 6, 19, 11, 20, 'm', '|');          // E moss alcove
room(g, 27, 21, 36, 26, '.', '|');         // H plate room
room(g, 14, 22, 24, 27, '.', '|');         // A entrance hall
room(g, 5, 24, 12, 27, '.', '|');          // B west antechamber
// west corridor joining C, E and B (continuous floor, no faces needed on its sides)
box(g, 3, 16, 4, 27, '.');
put(g, 5, 19, '.'); put(g, 5, 20, '.');
// hall to B and hall to H
box(g, 13, 25, 13, 26, '.');
box(g, 25, 24, 26, 25, '.');
// notches: entrance (valley), D from C, J from I, I from H, F from E
put(g, 20, 28, '.'); put(g, 8, 7, '.'); put(g, 31, 7, '.'); put(g, 31, 18, '.'); put(g, 15, 14, '.');
// floor dressing: carpets in the hall and the landing, ink puddles, stone flags in the wing
box(g, 19, 22, 20, 27, 'c');
box(g, 30, 4, 33, 6, 'b');
put(g, 35, 15, 'm'); put(g, 36, 15, 'm'); put(g, 36, 16, 'm'); put(g, 26, 17, 'm');

const ground = rows(depth(g));

const overlays = [
  // W8-archive: the Great Catalog, the floor's landmark. Floor-to-ceiling card drawers across the hall's north face
  // and the brass index wheel in the middle of it, over the carpet (catalog_drawers is read at (19,21)).
  { t: 'wall_drawers_l', x: 15, y: 20 }, { t: 'wall_drawers_m', x: 16, y: 20 }, { t: 'wall_drawers_m', x: 17, y: 20 },
  { t: 'wall_drawers_m', x: 18, y: 20 }, { t: 'great_catalog_dial', x: 19, y: 20 },
  { t: 'wall_drawers_m', x: 21, y: 20 }, { t: 'wall_drawers_m', x: 22, y: 20 }, { t: 'wall_drawers_r', x: 23, y: 20 },
  // index cards spilled across the floors (decals)
  { t: 'index_cards', x: 17, y: 23 }, { t: 'index_cards', x: 23, y: 25 }, { t: 'index_cards', x: 9, y: 25 },
  { t: 'index_cards', x: 32, y: 14 }, { t: 'index_cards', x: 10, y: 5 }, { t: 'index_cards', x: 4, y: 22 },
  { t: 'wall_glyph_revealed', x: 14, y: 20 }, // the Catalog Promise plaque
  { t: 'wall_shelf_l', x: 26, y: 8 }, { t: 'wall_shelf_m', x: 27, y: 8 }, { t: 'wall_shelf_r', x: 28, y: 8 },
  { t: 'wall_shelf_l', x: 34, y: 8 }, { t: 'wall_shelf_m', x: 35, y: 8 }, { t: 'wall_shelf_r', x: 36, y: 8 },
  { t: 'wall_shelf_l', x: 5, y: 22 }, { t: 'wall_shelf_r', x: 6, y: 22 },
  { t: 'wall_shelf_l', x: 3, y: 8 }, { t: 'wall_shelf_r', x: 4, y: 8 },
  { t: 'wall_broken', x: 9, y: 17 },          // the hole into the hidden cell
  { t: 'wall_cracked', x: 11, y: 8 }, { t: 'wall_cracked', x: 29, y: 2 },
  { t: 'roots_0', x: 3, y: 27 }, { t: 'roots_1', x: 24, y: 27 }, { t: 'roots_2', x: 37, y: 17 }, { t: 'roots_1', x: 25, y: 10 },
  { t: 'roots_0', x: 12, y: 15 }, { t: 'roots_2', x: 6, y: 20 }, { t: 'roots_1', x: 14, y: 27 },
  { t: 'ink_puddle_0', x: 28, y: 15 }, { t: 'ink_puddle_1', x: 10, y: 26 }, { t: 'ink_puddle_0', x: 33, y: 24 },
  { t: 'ink_puddle_1', x: 4, y: 20 },
];

const decor = [
  // hall: pillars frame the carpet under the catalog wall and hold the side walls (CRITIQUE_1 C6)
  { t: 'reading_table_long', x: 16, y: 25 }, { t: 'reading_table', x: 22, y: 26 },
  { t: 'candelabra', x: 15, y: 22 }, { t: 'candelabra', x: 23, y: 22 },
  { t: 'pillar_oak', x: 18, y: 22 }, { t: 'pillar_oak', x: 21, y: 22 }, { t: 'pillar_oak', x: 14, y: 24 }, { t: 'pillar_oak', x: 24, y: 23 },
  // W8-archive: card catalogues and book piles (the Catalog Halls' furniture)
  { t: 'book_stack', x: 24, y: 27 }, { t: 'book_stack', x: 14, y: 27 },
  { t: 'brazier_lit', x: 18, y: 28 }, { t: 'brazier_lit', x: 22, y: 28 },
  // B
  { t: 'reading_table', x: 8, y: 26 }, { t: 'shelf_a', x: 11, y: 24 },
  // C
  { t: 'shelf_b', x: 11, y: 11 }, { t: 'candelabra', x: 3, y: 10 },
  // E
  { t: 'root_column', x: 10, y: 20 },
  // H
  { t: 'root_column', x: 30, y: 22 }, { t: 'root_column', x: 33, y: 22 },
  { t: 'brazier_lit', x: 27, y: 21 }, { t: 'brazier_lit', x: 36, y: 21 },
  // I
  { t: 'shelf_wide', x: 29, y: 11 }, { t: 'shelf_a', x: 33, y: 11 },
  { t: 'reading_table', x: 29, y: 16 }, { t: 'candelabra', x: 25, y: 12 }, { t: 'candelabra', x: 37, y: 12 },
  { t: 'root_column', x: 25, y: 17 },
  // J
  { t: 'stairs_down', x: 31, y: 3 }, { t: 'candelabra', x: 29, y: 4 }, { t: 'candelabra', x: 34, y: 4 },
  // D
  { t: 'candelabra', x: 11, y: 4 }, { t: 'card_cabinet', x: 6, y: 4 }, { t: 'book_stack', x: 10, y: 6 },
  // I and B: card catalogues against the walls
  { t: 'card_cabinet', x: 26, y: 11 }, { t: 'card_cabinet', x: 11, y: 27 },
  // J: the landing's book piles
  { t: 'book_stack', x: 29, y: 6 },
];

const events = [
  enter('f1_enter', 'archive_f1_arrival'),
  // doors (same-map transfers land on notches; the valley door returns to the forecourt)
  door('exit_valley', 20, 28, ['valley', 36, 7, 'down']),
  gate('gate_c', 8, 9, 'door_locked', { to: ['archive_f1', 8, 7, 'up'] }),
  door('notch_d', 8, 7, ['archive_f1', 8, 10, 'down']),
  gate('gate_h', 31, 20, 'door_locked', { to: ['archive_f1', 31, 18, 'up'] }),
  door('notch_i', 31, 18, ['archive_f1', 31, 21, 'down']),
  lockedDoor('keydoor_i', 31, 9, 'archive_key', ['archive_f1', 31, 7, 'up']),
  door('notch_j', 31, 7, ['archive_f1', 31, 10, 'down']),
  door('hole_e', 9, 18, ['archive_f1', 15, 14, 'up']),
  door('notch_f', 15, 14, ['archive_f1', 9, 19, 'down']),
  door('stairs_f2', 31, 3, ['archive_f2', 20, 3, 'down'], { kind: 'stairs' }),
  // the Keepers' back-stair: J (stairs landing) <-> B (antechamber), opened by the bell (archive_f1_done)
  object('shortcut_b_stairs', 33, 3, 'stairs_up', { if: 'archive_f1_done', solid: false }),
  door('shortcut_b', 33, 3, ['archive_f1', 7, 23, 'down'], { kind: 'stairs', if: 'archive_f1_done' }),
  object('shortcut_j_stairs', 7, 23, 'stairs_up', { if: 'archive_f1_done', solid: false }),
  door('shortcut_j', 7, 23, ['archive_f1', 33, 3, 'down'], { kind: 'stairs', if: 'archive_f1_done' }),
  // the F3 shortcut surfaces here once the party has reached F3
  object('shortcut_stairs', 10, 23, 'stairs_up', { if: 'archive_f2_done', solid: false }),
  door('shortcut_f3', 10, 23, ['archive_f3', 24, 21, 'down'], { kind: 'stairs', if: 'archive_f2_done' }),
  // story
  trigger('bell_trig', 30, 4, 3, 1, 'archive_f1_bell'),
  object('prop_letter', 9, 20, 'prop_letter', { script: 'find_letter_1', ifNot: 'tess_letter_1_found', solid: false }),
  // mechanisms: C (pots hide the push block; plate opens gate_c), H (two blocks, two plates open gate_h)
  block('block_c', 8, 13),
  plate('plate_c', 4, 11, 'gate_c'),
  pot('pot_c1', 7, 13), pot('pot_c2', 6, 13), pot('pot_c3', 5, 13, { item: 'potion' }), pot('pot_c4', 9, 13),
  pot('pot_c5', 4, 12), pot('pot_c6', 6, 11, { gold: 20 }), pot('pot_c7', 10, 11), pot('pot_c8', 11, 14, { item: 'antidote' }),
  pot('pot_c9', 5, 15), pot('pot_c10', 9, 12),
  block('block_h1', 31, 24), block('block_h2', 33, 24),
  plate('plate_h1', 28, 22, 'gate_h'), plate('plate_h2', 35, 22, 'gate_h'),
  // chests
  chest('chest_d', 8, 4, 'wood', { item: 'archive_key', flag: 'archive_key_found' }),
  chest('chest_b', 5, 24, 'wood', { item: 'potion', qty: 2 }),
  chest('chest_i', 36, 10, 'iron'),
  chest('chest_f', 16, 12, 'iron', { item: 'wayfarer_mantle' }),
  // signs and books
  sign('catalog_drawers', 19, 21, 'catalog_drawers', { solid: false }),
  sign('catalog_promise', 14, 21, 'catalog_promise', { solid: false }),
  book('catalog_ledger', 17, 25, 'catalog_ledger', { solid: false }),
  sign('marginalia', 22, 26, 'marginalia', { solid: false }),
  sign('reading_desk', 8, 26, 'reading_desk', { solid: false }),
  book('keeper_journal_1', 29, 16, 'keeper_journal_1', { solid: false }),
  // visible enemies: 8 per ZONES.archive_f1.plan (dungeon enemies step when the player steps)
  enemy('e_b_slimes', 10, 26, 'ink_slime', 'f1_slimes', 'wander', { radius: 2 }),
  enemy('e_cor_slimes', 4, 18, 'ink_slime', 'f1_slimes', 'patrol', { path: steps('down', 5, 'up', 5) }),
  enemy('e_c_mites', 7, 11, 'bookmite', 'f1_mites', 'guard'),
  enemy('e_e_mites', 7, 19, 'bookmite', 'f1_mites', 'wander', { radius: 1 }),
  enemy('e_h_wraith', 32, 25, 'page_wraith', 'f1_wraith', 'patrol', { path: steps('left', 4, 'right', 4) }),
  enemy('e_i_wraith', 27, 13, 'page_wraith', 'f1_wraith', 'chase'),
  enemy('e_i_mixed_a', 35, 16, 'page_wraith', 'f1_mixed', 'chase'),
  enemy('e_i_mixed_b', 31, 12, 'page_wraith', 'f1_mixed', 'guard'),
];

export default {
  id: 'archive_f1', name: 'The Catalog Halls', area: 'dungeon',
  music: 'archive', ambience: 'archive_hush', tileset: 'archive',
  lighting: { tint: 'none', dark: 0.15 },
  under: 'catalog_wood',
  legend: { '#': 'catalog_top', '|': 'catalog_face', 'v': 'catalog_out_top', 'o': 'catalog_out_face', '.': 'catalog_wood',
    'c': 'carpet_red', 'b': 'carpet_blue', 'm': 'moss' },
  ground,
  overlays,
  decor,
  overhead: [],
  events,
  exits: [],
  marks: { catalog_drawer: [19, 22], entrance: [20, 27], stairs_down: [31, 4] },
  start: { x: 20, y: 27, dir: 'up' },
};
