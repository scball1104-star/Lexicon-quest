// The pop-up book fixture (E8-world): one marble map over the violet void with every case of the rule, registered by
// ../world.js (never in the first download, never a plan map id). Marble (`marble_page`) over the void (`void_violet`):
// E8-tiles' terrains, or the stand-ins of ./art.js, so it works before the ep8 sheet lands. 30 x 22, start (4, 19) facing up.
// Coordinates are x, y. A book's (x, y) is its top-left cell; an `ns` book is 2 x 1, an `ew` book 1 x 2.
//
//   S (x 1..8, y 11..20; the row y 11 leaves a notch at x 3..4 for the book A). The bridge: A (ns at 3,12, length 4, the
//     Willowmere realm book) read from the south opens north over the gap (x 3..4, y 8..11) to N. Its first page row sits in
//     the notch, so the party steps onto the bridge from the floor beside it (2, 11) or (5, 11): a book's own cells are solid.
//     The walls: K (ns at 6,16, length 3) on open floor: read from the south its pages stand north (x 6..7, y 13..15), from
//     the north they stand south (y 17..19): the side decides the way, and pages on floor are walls. A slime wanders here.
//   N (x 1..10, y 2..7, and the lateral step 11,5). A pair: P (ew at 10,3, length 4, the Hollow book, pair Q) read from
//     the west bridges east (x 11..14, y 3..4) to the island I. chest_n (1, 2).
//   I (x 15..17, y 2..7, and the lateral step 18,7). Q (ew at 17,5, length 4, the Emberpeak book, pair P) read from the west
//     bridges east (x 18..21, y 5..6) to E1, and shuts P behind the party (harmlessly: everyone is on the island).
//   E1 (x 22..28, y 2..6). A bridge and a wall from one book: C (ns at 24,6, length 4) read from the north bridges the gap
//     (x 24..25, y 7..8) and stands as a wall on E2's floor (y 9..10). The party steps on from (23, 7) and off by the far
//     ledge (26, 8). A door at (28, 2) leads back to the start (the way home once P has shut).
//   E2 (x 22..28, y 9..13, and the lateral step 28,14). chest_e (28, 9), the goal. A book in Keeper ink: L (ns at 26,13,
//     length 4, `lantern: true`) read from the north bridges south (x 26..27, y 14..17) to the islet (x 25..28, y 18..20,
//     chest_l): faint and unreadable until the Lantern finds it.
//
// The main path is four reads: A, P, Q (P folds), C. Every case the tests use: a read and a crossing (A); a refusal with the
// party on a bridge (read A from (3, 11) while it stands: bridge_under_party); a book read from either side (K); a wall on a
// party cell (K with a follower set north of it: wall_on_party); pages onto a foe (the slime moved into K's pages: onto_actor);
// a pair swapping (Q shuts P); a pair refused (a follower set on P's bridge when Q is read); a book that is a bridge and a
// wall at once (C); `start` states on arrival (none here: the tests pass their own); states resetting on re-entry; a save on
// a bridge reloading on ground; the slime never stepping on a page cell; the Lantern book; the held-key read; the far
// change panning (Q read from I folds P's bridge 7 cells off; the tests narrow the camera so it is off screen).

const W = 30, H = 22;

function grid(fill) { return Array.from({ length: H }, () => Array(W).fill(fill)); }
function box(g, x0, y0, x1, y1, c) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = c; }

function build() {
  const g = grid('_');
  box(g, 1, 12, 8, 20, 'm');              // S
  box(g, 1, 11, 2, 11, 'm'); box(g, 5, 11, 8, 11, 'm');   // S's top row, the notch at x 3..4 left void for A's first pages
  box(g, 1, 2, 10, 7, 'm');               // N
  g[5][11] = 'm';                         // N's lateral step beside P's first page column
  box(g, 15, 2, 17, 7, 'm');              // I
  g[7][18] = 'm';                         // I's lateral step beside Q's first page column
  box(g, 22, 2, 28, 6, 'm');              // E1
  g[7][23] = 'm'; g[8][26] = 'm';         // C: the step on, the far ledge off
  box(g, 22, 9, 28, 13, 'm');             // E2
  g[14][28] = 'm';                        // E2's lateral step beside L's first page row
  box(g, 25, 18, 28, 20, 'm');            // the islet
  return g.map((r) => r.join(''));
}

const book = (id, letter, x, y, extra = {}) => ({ id, type: 'popbook', book: letter, x, y, ...extra });

export const TEST_BOOKS = {
  id: 'ep8_testbooks', name: 'Test Pop-up Books', area: 'dungeon', music: null, ambience: null, tileset: 'town',
  lighting: { tint: 'none', dark: 0 },
  under: 'void_violet',
  start: { x: 4, y: 19, dir: 'up' },
  legend: { '_': 'void_violet', 'm': 'marble_page' },
  ground: build(),
  popbooks: {
    books: {
      a: { x: 3, y: 12, axis: 'ns', length: 4, realm: 'willowmere' },
      c: { x: 24, y: 6, axis: 'ns', length: 4 },
      k: { x: 6, y: 16, axis: 'ns', length: 3 },
      l: { x: 26, y: 13, axis: 'ns', length: 4 },
      p: { x: 10, y: 3, axis: 'ew', length: 4, pair: 'q', realm: 'hollow' },
      q: { x: 17, y: 5, axis: 'ew', length: 4, pair: 'p', realm: 'emberpeak' },
    },
    goal: ['goal_e'],
  },
  overlays: [],
  decor: [],
  events: [
    book('pb_a', 'a', 3, 12),
    book('pb_c', 'c', 24, 6),
    book('pb_k', 'k', 6, 16),
    book('pb_l', 'l', 26, 13, { lantern: true }),
    book('pb_p', 'p', 10, 3),
    book('pb_q', 'q', 17, 5),
    { id: 'chest_n', type: 'chest', x: 1, y: 2, tier: 'wood', item: 'potion', qty: 1 },
    { id: 'chest_e', type: 'chest', x: 28, y: 9, tier: 'iron', item: 'potion', qty: 2 },
    { id: 'chest_l', type: 'chest', x: 27, y: 19, tier: 'wood', item: 'potion', qty: 1 },
    { id: 'way_back', type: 'door', x: 28, y: 2, to: ['ep8_testbooks', 4, 19, 'up'], kind: 'door' },
    { id: 'slime_s', type: 'enemy', x: 2, y: 18, sprite: 'ink_slime', encounter: 'valley_slimes', move: 'wander' },
  ],
  exits: [],
  marks: { start: [4, 19], a_read: [3, 13], a_bridge: [3, 11], a_step: [2, 11], n_land: [3, 7], p_read: [9, 3], p_step: [11, 5],
    i_land: [15, 4], q_read: [16, 5], q_step: [18, 7], e_land: [22, 5], c_read: [24, 5], c_step: [23, 7], ledge: [26, 8],
    goal_e: [28, 10], k_south: [6, 17], k_north: [6, 15], l_read: [26, 12], islet: [26, 19], slime: [2, 18] },
};
