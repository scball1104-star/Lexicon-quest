// The Sunken Keep, II: Archives Below Water (40 x 30, dungeon, dark 0.45). EPISODE4_PLAN 4.6; exact cells in
// docs/MAPS_EP4_B.md. Stacks rising out of black water, book crates for boats, lanterns on chains for light. The floor
// combines F1's ideas: two heights in one basin (B), then two basins in series (D).
//
//   A  the Stair Foot (south-west): the stair from F1's lift landing (6..7,22), arrival (6,24); the tide font.
//   B  the Stacks (puzzle B, two heights): basin a (3 levels, START MID: the water is already up). A drowned hall (h0)
//      full of shelves; the dock (rows 16..18, outside the basin) with wh_a. Mid: crates C1 (7,13..14) float from the dock
//      to the reading island W (h1, x 5..9, rows 8..12), crates C2 (10..11, 8..9) from W to the north landing (x 10..12,
//      rows 4..6, wh_a2) and the way east. The column at x 3 ends on a crate (3,12) moored on an h1 sill: at mid it sits
//      on the sill, aground. High: W goes under, (3,12) floats, and the column reaches the top gallery G (x 2..4, rows
//      8..10, wh_a3) with the iron chest. Low: every crate aground, nothing to walk. One group on the dock, one on the
//      landing.
//   S  the Scriptorium ring (x 15..23, rows 6..11): reading floors round the drowned scriptorium, a pit (17..21, 8..9) that
//      drops to F1's west bank (never a dead end). memory2_trig on column 16 (lyra_memory_2).
//   D  Two Locks (puzzle D, series): basins b (outer, start low) and c (inner, start low). The west stand (x 25..26,
//      wh_b), a kerb with a stair (27,9) down into the b channel (x 28..29, rows 6..13). wh_c stands IN the b channel
//      (29,10): it can be reached only while b is low. The channel's north end climbs (29,5) into the Dry Room C. The
//      crates C3 (28..30,13) cross from the kerb gap (27,13) to the c walkway (column 31, row 7; h1). The canal door
//      (34,6) at the walkway's end is papered over (seal_d, basin c, h 1). Solve: wh_c x2 (c high: seal_d washes),
//      wh_c x1 (c low: the walkway is dry again), wh_b x1 (b mid: C3 floats; wh_c is now under water), cross, walk the
//      walkway to the door, up into the key room (wood chest, Tide Key; wh_b2). Washing is permanent, so the order is
//      forced by reach, never by a wrong answer. The Public Coffer: the Keeper marks on the pool's south kerb (36,14)
//      show only while c is high (coffer_obj, lantern), read from the south stand (row 15..17); they open the cache
//      niche (37..38,18). Two groups (west stand, south stand). The east descent (35..36, 18..24) down to the approach.
//   C  the Dry Room (x 27..31, rows 2..3): the glass dome, vex_trig, the black feather (after vex_archive).
//   E  the Court Room (x 16..23, rows 15..21): reached from the approach (row 25..27) through door_e (19..20,24, the Tide
//      Key). barrister_trig crosses row 20; the Barrister on its bench. After the win: the stair down (20..21,14) with
//      keep_f2_stair in front, and the boat boat_f2_short (16..17,18) to F1's Water Gate once keep_f2_done. The font
//      font_k2b and one group on the approach.
// Solution for the bot (wheel inputs): B: start mid, no turn: the dock, C1, W, C2, the north landing, east into S
// (memory2_trig). Optional: wh_a x1 (high), the column at x 3 to G and chest_gallery, wh_a3 x2 (low, mid), back.
// D: the stair (27,9) into the b channel; wh_c x2 (c high: seal_d washes), wh_c x1 (c low); the channel north up (29,5)
// into the Dry Room (vex_trig); back to the west stand; wh_b x1 (b mid: C3 floats, wh_c goes under); the kerb gap
// (27,13), C3, the walkway (column 31, row 7) to the door (34,6) and the key room: chest_tide_key. Back over C3 (still
// mid). Optional coffer: wh_b x2 (high, low), the stair, wh_c x2 (c high), the south stand, the Lantern at coffer_obj
// (36,14); the cache niche. The south stand, the east descent, the approach, door_e (Tide Key), barrister_trig. After the
// win: stair_trig, stairs_f3 (or boat_f2_short to F1).
import { door, sign, object, trigger, enemy, chest, lockedDoor, steps, enter, book, pit, actor, light } from './_kit.js';
import { keepGrid, keepLegend, wheel, post, pontoon, forgery, boat, tideFont, canalDoor } from './ep4_keep_f1.js';

const W = 40, H = 30;
const K = keepGrid(W, H);
const { set, box, room } = K;

room(2, 4, 12, 18);                          // B  the Stacks (faces 2..3)
room(15, 6, 23, 11);                         // S  the Scriptorium ring (faces 4..5)
room(25, 6, 30, 17);                         // D  west part (faces 4..5)
room(31, 7, 38, 17);                         // D  east part (faces 5..6)
room(27, 2, 31, 3);                          // C  the Dry Room, raised over D (faces 0..1)
room(33, 3, 36, 4);                          //    the key room, raised over D (faces 1..2)
room(16, 15, 23, 21);                        // E  the Court Room (faces 13..14)
room(2, 23, 10, 27);                         // A  the Stair Foot (faces 21..22)
room(12, 25, 38, 27);                        //    the approach (faces 23..24)
// passages
box(4, 19, 5, 22, '.');                      // A -> B
box(13, 6, 14, 6, '.');                      // B's north landing -> S
box(24, 7, 24, 8, '.');                      // S -> D's west stand
box(29, 4, 29, 4, '.'); set(29, 5, 'S', 'b', 0);   // the b channel's north end -> the Dry Room
box(34, 5, 34, 5, '.');                      // seal_d's door (34,6) -> the key room
box(19, 22, 20, 23, '.');                    // door_e (19..20,24) -> E
box(11, 25, 11, 26, '.');                    // A -> the approach
box(35, 18, 36, 24, '.');                    // D's south stand -> the approach (the east descent)
box(37, 18, 38, 18, '.');                    // the cache niche
// S: the drowned scriptorium (a pit to F1)
box(17, 8, 21, 9, 'x');
// E: the drowned bench channel
box(16, 15, 17, 21, '~');

// B, basin a (start mid): the drowned hall, the dock's kerb, the reading island W, the north landing N, the gallery G
box(2, 4, 12, 14, 'c', 'a', 0);
box(2, 15, 12, 15, 'L'); set(7, 15, '.'); set(3, 15, '.');
box(5, 8, 9, 12, 'L', 'a', 1); box(6, 9, 8, 11, '.', 'a', 1); set(7, 12, '.', 'a', 1); set(9, 9, '.', 'a', 1);
box(10, 4, 12, 6, '.'); box(9, 4, 9, 6, 'L'); set(10, 7, 'F'); set(11, 7, '.'); set(12, 7, 'F');
box(2, 8, 4, 10, '.'); box(2, 7, 4, 7, 'L'); set(2, 11, 'F'); set(3, 11, '.'); set(4, 11, 'F');
set(2, 12, 'L', 'a', 1); set(3, 12, 'c', 'a', 1); set(4, 12, 'L', 'a', 1);
// D, basins b and c
box(27, 6, 27, 14, 'L'); set(27, 13, '.'); set(27, 9, 'E', 'b', 0);
box(28, 6, 29, 13, 'c', 'b', 0);
box(30, 6, 30, 14, 'L'); set(30, 13, 'c', 'b', 0);
box(28, 14, 29, 14, 'L');
box(31, 7, 38, 7, '.', 'c', 1); box(31, 8, 31, 13, '.', 'c', 1);
box(32, 8, 32, 13, 'L', 'c', 1); box(33, 8, 38, 8, 'L', 'c', 1);
box(33, 9, 38, 13, 'c', 'c', 0);
box(31, 14, 38, 14, 'L', 'c', 1);

const R = K.finish();

// ---------------------------------------------------------------- dressing
const decor = [
  // B: the stacks standing in the water, lanterns on chains
  { t: 'shelf_a', x: 2, y: 5 }, { t: 'shelf_a', x: 5, y: 5 }, { t: 'shelf_a', x: 7, y: 5 },
  { t: 'shelf_a', x: 9, y: 13 }, { t: 'shelf_a', x: 11, y: 13 }, { t: 'shelf_a', x: 10, y: 11 },
  { t: 'lantern_chain', x: 6, y: 7 }, { t: 'lantern_chain', x: 10, y: 10 }, { t: 'lantern_chain', x: 4, y: 13 },
  { t: 'reading_table', x: 6, y: 10 }, { t: 'book_stack', x: 3, y: 8 },
  { t: 'mooring_post', x: 6, y: 16 }, { t: 'mooring_post', x: 8, y: 16 }, { t: 'book_stack', x: 12, y: 18 },
  // S: reading floors round the pit
  { t: 'lectern', x: 15, y: 9 }, { t: 'lectern', x: 23, y: 9 }, { t: 'candelabra', x: 17, y: 6 }, { t: 'candelabra', x: 21, y: 6 },
  { t: 'reading_table', x: 18, y: 11 }, { t: 'book_stack', x: 22, y: 11 }, { t: 'book_stack', x: 15, y: 11 },
  // C: the Dry Room
  { t: 'reading_table', x: 30, y: 2 }, { t: 'book_stack', x: 27, y: 2 }, { t: 'chair_down', x: 29, y: 2 },
  // D: shelves on the stands, lanterns over the water
  { t: 'lantern_chain', x: 28, y: 9 }, { t: 'lantern_chain', x: 35, y: 10 }, { t: 'lantern_chain', x: 37, y: 12 },
  { t: 'shelf_a', x: 25, y: 6 }, { t: 'book_stack', x: 26, y: 17 }, { t: 'mooring_post', x: 26, y: 12 },
  { t: 'lectern', x: 37, y: 18 }, { t: 'book_stack', x: 34, y: 3 },
  // E: the court
  { t: 'stairs_down', x: 20, y: 14 }, { t: 'bench_iron', x: 18, y: 17 }, { t: 'bench_iron', x: 21, y: 17 },
  { t: 'candelabra', x: 23, y: 15 }, { t: 'lantern_chain', x: 17, y: 16 },
  // A and the approach
  { t: 'stairs_up', x: 6, y: 22 }, { t: 'lantern_chain', x: 3, y: 24 }, { t: 'book_stack', x: 10, y: 27 },
  { t: 'shelf_a', x: 14, y: 25 }, { t: 'shelf_a', x: 27, y: 25 }, { t: 'lantern_chain', x: 31, y: 25 },
  { t: 'candelabra', x: 18, y: 25 }, { t: 'candelabra', x: 21, y: 25 },
];

const events = [
  enter('k2_enter', 'keep_f2_arrival'),
  // ---- A: the Stair Foot
  door('stairs_f1', 6, 22, ['ep4_keep_f1', 33, 3, 'down'], { kind: 'stairs', w: 2 }),
  tideFont('font_k2', 8, 26),
  // ---- B: the Stacks (puzzle B)
  wheel('wh_a', 10, 17, 'a'),
  wheel('wh_a2', 12, 5, 'a'),
  wheel('wh_a3', 2, 9, 'a'),
  post('post_a', 8, 14, 'a'),
  ...[[7, 14], [7, 13]].map(([x, y], k) => pontoon(`crate_c1_${k}`, x, y, 'a', { sprite: 'book_crate' })),
  ...[[10, 9], [11, 9], [11, 8]].map(([x, y], k) => pontoon(`crate_c2_${k}`, x, y, 'a', { sprite: 'book_crate' })),
  ...[[3, 14], [3, 13]].map(([x, y], k) => pontoon(`crate_g_${k}`, x, y, 'a', { sprite: 'book_crate' })),
  pontoon('crate_g_sill', 3, 12, 'a', { sprite: 'book_crate', rides: [2] }),
  chest('chest_gallery', 4, 8, 'iron'),
  enemy('e_b_phantoms', 4, 17, 'gutter_phantom', 'e4k2_phantoms', 'patrol', { path: steps('right', 3, 'left', 3) }),
  enemy('e_b_sentinel', 10, 5, 'waterlogged_sentinel', 'e4k2_sentinel', 'guard'),
  // ---- S: the Scriptorium ring
  trigger('memory2_trig', 16, 6, 1, 6, 'lyra_memory_2'),
  pit('scriptorium_pit', 17, 8, 5, 2, ['ep4_keep_f1', 28, 14, 'down']),
  sign('scriptorium_sign', 19, 10, 'ep4_scriptorium', { solid: false }),
  // ---- C: the Dry Room
  trigger('vex_trig', 27, 3, 5, 1, 'vex_archive'),
  object('feather_dry', 30, 2, 'prop_feather_black', { text: 'ep4_vex_feather', solid: false, if: 'vex_archive_met' }),
  sign('dome_sign', 28, 2, 'ep4_glass_dome', { solid: false }),
  // ---- D: Two Locks (puzzle D)
  wheel('wh_b', 25, 11, 'b'),
  wheel('wh_c', 29, 10, 'c'),
  wheel('wh_b2', 33, 4, 'b'),
  wheel('wh_b3', 31, 6, 'b'),
  post('post_b', 28, 7, 'b'),
  post('post_c', 35, 11, 'c'),
  ...[[28, 13], [29, 13], [30, 13]].map(([x, y], k) => pontoon(`crate_c3_${k}`, x, y, 'b', { sprite: 'book_crate' })),
  canalDoor('door_keyroom', 34, 6),
  forgery('seal_d', 34, 6, 'c', 1, 'door_keyroom'),
  chest('chest_tide_key', 36, 3, 'wood', { item: 'tide_key', flag: 'tide_key_f2' }),
  object('coffer_obj', 36, 14, 'wall_glyph_revealed', { lantern: true, script: 'coffer_records', text: 'ep4_keeper_marks', if: 'tide:c>=2' }),
  chest('chest_cache', 38, 18, 'gold', { item: 'hi_ether', qty: 2, gold: 190, if: 'coffer_found' }),
  book('book_ledger', 37, 18, 'keep_ledger', { if: 'coffer_found' }),
  enemy('e_d_phantoms', 26, 15, 'gutter_phantom', 'e4k2_phantoms', 'wander', { radius: 1 }),
  enemy('e_d_mixed', 32, 16, 'drowned_watch', 'e4k2_mixed', 'patrol', { path: steps('right', 4, 'left', 4) }),
  // ---- E: the Court Room and its approach
  lockedDoor('door_e', 19, 24, 'tide_key'),
  tideFont('font_k2b', 23, 26),
  chest('chest_approach', 12, 27, 'wood', { item: 'hi_potion', qty: 2 }),
  enemy('e_ap_mixed', 30, 26, 'drowned_watch', 'e4k2_mixed', 'patrol', { path: steps('left', 3, 'right', 3) }),
  trigger('barrister_trig', 18, 20, 6, 1, 'barrister'),
  actor('barrister', 20, 16, 'barrister', 'down', { ifNot: 'barrister_defeated', name: 'The Inkbound Barrister' }),
  sign('court_bench', 22, 17, 'ep4_court_bench', { solid: false }),
  trigger('stair_trig', 20, 15, 2, 1, 'keep_f2_stair', { if: 'barrister_defeated' }),
  door('stairs_f3', 20, 14, ['ep4_keep_f3', 17, 12, 'down'], { kind: 'stairs', w: 2, if: 'barrister_defeated' }),
  boat('boat_f2_short', 16, 18, ['ep4_keep_f1', 18, 26, 'down'], { if: 'keep_f2_done' }),
  // lights: lanterns on chains (the floor is dark)
  light('l_dock', 7, 17, 4), light('l_w', 7, 10, 4), light('l_n', 11, 5, 3), light('l_s', 19, 7, 5), light('l_c', 29, 3, 4),
  light('l_d', 28, 9, 4), light('l_pool', 35, 11, 4), light('l_ss', 33, 16, 4), light('l_e', 20, 18, 5), light('l_ap', 25, 26, 5),
  light('l_a', 6, 25, 4),
];

export default {
  id: 'ep4_keep_f2', name: 'Archives Below Water', area: 'dungeon',
  music: 'sunken_keep', ambience: 'keep_drip', tileset: 'ep4',
  lighting: { tint: 'none', dark: 0.45, lights: [] },
  floorShade: { color: '#14101e', alpha: 0.5, rows: 8, side: 3 },
  pitTo: ['ep4_keep_f1', 28, 14, 'down'],
  under: 'keep_archive_floor',
  legend: keepLegend('archive_stacks', 'keep_archive_floor', { 'x': 'pit' }),
  ground: R.ground,
  tide: {
    basins: { a: { start: 1, levels: 3, wheel: 'wh_a' }, b: { start: 0, levels: 3, wheel: 'wh_b' }, c: { start: 0, levels: 3, wheel: 'wh_c' } },
    basin: R.basin,
    height: R.height,
  },
  overlays: [],
  decor,
  overhead: [{ t: 'glass_dome', x: 28, y: 3 }],
  events,
  exits: [],
  marks: {
    arrival: [6, 24], stacks: [7, 10], scriptorium: [19, 8], dry_room: [29, 3], vex_chair: [29, 2], locks: [29, 10],
    coffer: [36, 15], arena: [20, 19], barrister_spot: [20, 16], stairs_down: [20, 15],
    scriptorium_regent: [18, 7], scriptorium_scribe: [20, 7], north_landing: [11, 5], gallery: [3, 9], key_room: [35, 4],
  },
  start: { x: 6, y: 24, dir: 'down' },
};
