// The name stone fixture (E7-world): one snow map with every case of the rule, registered by ../world.js (never in the
// first download, never a plan map id). Snow (`snowfield`) and flagstone (`stone_floor`) over the `fade` (E7-tiles'
// terrains, or the stand-ins of ./art.js), so it works before the ep7 sheet lands. 34 x 21, start (3, 17) facing up.
// Coordinates are x, y. Capacity 2; `start: ['d']` (the grip: the frost door D is shut on arrival).
//
//   S (start, snow x 1..6, y 12..19). Path a: row 15, x 7..12 to M. Cairns ns_a1 (6, 13) on S and ns_a2 (13, 18) on M:
//     one stone with a cairn at each end, so neither side can be stranded.
//   M (snow x 13..19, y 11..19). Path b: column x 16, y 4..10 to N; cairns ns_b1 (15, 11) on M and ns_b2 (17, 3) on N.
//     Path c: row 16, x 20..24 to E; cairns ns_c1 (13, 14) on M, right above path a's landing, and ns_c2 (25, 13) on E
//     (an iceglass plate).
//   N (snow x 12..20, y 1..3, a wolf wandering). Path e: row 2, x 7..11 to the island I (snow x 3..6, y 1..3, chest_i);
//     its only cairn ns_e (12, 1) is in Keeper ink (`lantern: true`): faint and unreadable until the Lantern finds it.
//   E (flagstone x 25..28, y 12..19). The frost door D at (29, 15), the one floor cell in the white column x 29; its stone
//     ns_d (28, 14). F (flagstone x 30..32, y 12..19): chest_f at (32, 15), the goal.
//
// The main path is two reads: ns_a1 (held d, a: the road and the shut door at once), cross; ns_c1 from the landing (held a,
// c: the third name lets the first go, and the door melts far off to the east, so the camera pans to it), along M, cross,
// through the door to chest_f. Every case the tests use: a read and a crossing (a1, row 15); two held at once (d + a); the
// third letting the first go (c lets d go); a re-read reordering (hold a, b; re-read a at ns_a2: b goes next); a refused
// read (the followers still on path a, read c1 with a oldest); a refused hold (a follower on the melted door, read ns_d from
// (28, 15)); a frost door melting and freezing; `start` holds on arrival and on re-entry; a save on a held path cell (it
// reloads on ground); the wolf never stepping on a path cell; the far change panning; the held-key read (ns_c1 from the
// landing while the pad is held right).

const W = 34, H = 21;

function grid(fill) { return Array.from({ length: H }, () => Array(W).fill(fill)); }
function box(g, x0, y0, x1, y1, c) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = c; }

function build() {
  const g = grid('_');
  box(g, 1, 12, 6, 19, 's');          // S
  box(g, 13, 11, 19, 19, 's');        // M
  box(g, 12, 1, 20, 3, 's');          // N
  box(g, 3, 1, 6, 3, 's');            // the island
  box(g, 25, 12, 28, 19, 'f');        // E
  box(g, 30, 12, 32, 19, 'f');        // F
  g[15][29] = 'f';                    // the frost door's floor
  const P = grid('.'), F = grid('.');
  for (let x = 7; x <= 12; x++) P[15][x] = 'a';
  for (let y = 4; y <= 10; y++) P[y][16] = 'b';
  for (let x = 20; x <= 24; x++) P[16][x] = 'c';
  for (let x = 7; x <= 11; x++) P[2][x] = 'e';
  F[15][29] = 'D';
  const rows = (a) => a.map((r) => r.join(''));
  return { ground: rows(g), paths: rows(P), frost: rows(F) };
}

const B = build();
const stone = (id, letter, x, y, name, extra = {}) => ({ id, type: 'namestone', stone: letter, x, y, name, ...extra });

export const TEST_REMEMBER = {
  id: 'ep7_testremember', name: 'Test Name Stones', area: 'field', music: null, ambience: null, tileset: 'town',
  lighting: { tint: 'none', dark: 0 },
  under: 'fade',
  start: { x: 3, y: 17, dir: 'up' },
  legend: { '_': 'fade', 's': 'snowfield', 'f': 'stone_floor' },
  ground: B.ground,
  remember: { capacity: 2, paths: B.paths, frost: B.frost, start: ['d'], goal: ['goal_f'] },
  overlays: [],
  decor: [],
  events: [
    stone('ns_a1', 'a', 6, 13, 'stone_asta'),
    stone('ns_a2', 'a', 13, 18, 'stone_asta'),
    stone('ns_b1', 'b', 15, 11, 'stone_bo'),
    stone('ns_b2', 'b', 17, 3, 'stone_bo'),
    stone('ns_c1', 'c', 13, 14, 'stone_nyx'),
    stone('ns_c2', 'c', 25, 13, 'stone_nyx', { sprite: 'name_plate' }),
    stone('ns_d', 'd', 28, 14, 'stone_dagny', { sprite: 'name_plate' }),
    stone('ns_e', 'e', 12, 1, 'stone_ida', { lantern: true }),
    { id: 'chest_i', type: 'chest', x: 4, y: 2, tier: 'wood', item: 'potion', qty: 1 },
    { id: 'chest_n', type: 'chest', x: 20, y: 1, tier: 'wood', item: 'potion', qty: 1 },
    { id: 'chest_f', type: 'chest', x: 32, y: 15, tier: 'iron', item: 'potion', qty: 2 },
    { id: 'wolf_n', type: 'enemy', x: 19, y: 2, sprite: 'briar_wolf', encounter: 'e7w_wolves', move: 'wander' },
  ],
  exits: [],
  marks: { start: [3, 17], a_face: [6, 14], a_in: [6, 15], a_land: [13, 15], m_mid: [16, 15], b_face: [15, 12], b_in: [16, 11],
    n_land: [16, 3], c_face: [13, 15], c_in: [19, 16], e_land: [25, 16], d_face: [28, 15], door: [29, 15], goal_f: [31, 15],
    e_face: [13, 1], island: [5, 2], wolf: [19, 2] },
};
