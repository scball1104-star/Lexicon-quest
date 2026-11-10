// The gust lane fixture (E6-world): one sky map with every case of the rule, registered by ../world.js (never in the first
// download, never a plan map id). Plank decks (base `wood_floor`) float on `cloudbank` (E6-tiles' terrain, or the stand-in of
// ./art.js), so it works before the ep6 sheet lands. 32 x 23, start (3, 20) facing up. Coordinates are x, y.
//
//   Deck S (start, x 1..6, y 17..21) -- lane A, row 19, x 7..12 '>' (a straight ride) -- deck E (x 13..18, y 16..21).
//   Lane B, the bend: (15, 15) and (15, 14) '^', then row 13 x 15..19 '>' onto deck NE (x 20..26, y 10..14) at (20, 13).
//   Lane C, the post: column x 3, rows 16..7 '^' from deck S to deck N (x 1..7, y 2..6); the post mo_c at (3, 13) beside
//     the ledge (x 1..2, y 12..14, chest_l). Stop at the post, step off west; or step on north and ride to deck N.
//   Lane D, home: column x 6, rows 7..16 'v', deck N back to deck S.
//   Lane E, blocked: row 4, x 8..11 '>' from deck N toward deck P (x 12..15, y 3..4 and x 11..15, y 5..6), where a pillar
//     stands at (12, 4): the ride stops on (11, 4); step off south onto (11, 5). chest_p at (15, 3). Lane F, row 6, x 8..10
//     '<', from deck P back to deck N.
//   The vane (group a): vane_a on deck NE at (21, 10) and vane_a2 on a one-cell buoy deck at (24, 7). Authored: lane G,
//     column x 25, rows 9..5 '^' up to deck T (x 18..27, y 1..4, chest_t), with the post mo_g at (25, 7) beside vane_a2.
//     Turned: G is calm and lane K (row 12, x 27..28 '>') runs from deck NE to deck X (x 29..30, y 11..14, chest_x); lane M
//     (row 14, x 27..28 '<', always live) brings the party back. Standing on mo_g, vane_a2 is refused: the turn would make
//     the party's cell calm. Every vane of group a shows up (authored) or right (turned).
//   Lane H, deck T home: column x 19, rows 5..9 'v', then (19, 10) '>' onto deck NE. Lane I, deck NE home: (19, 14) and
//     (19, 15) 'v', then (19, 16) '<' onto deck E at (18, 16). Lane J: row 18, x 7..12 '<' from deck E back to deck S.

const W = 32, H = 23;

function grid(fill) { return Array.from({ length: H }, () => Array(W).fill(fill)); }
function box(g, x0, y0, x1, y1, c) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = c; }

function build() {
  const g = grid('~');
  box(g, 1, 17, 6, 21, 'w');         // deck S
  box(g, 13, 16, 18, 21, 'w');       // deck E
  box(g, 20, 10, 26, 14, 'w');       // deck NE
  box(g, 1, 2, 7, 6, 'w');           // deck N
  box(g, 1, 12, 2, 14, 'w');         // the ledge by the post
  box(g, 12, 3, 15, 4, 'w'); box(g, 11, 5, 15, 6, 'w');   // deck P
  box(g, 18, 1, 27, 4, 'w');         // deck T
  box(g, 29, 11, 30, 14, 'w');       // deck X
  g[7][24] = 'w';                    // the buoy under vane_a2
  const L = grid('.');
  const T = grid('.');
  for (let x = 7; x <= 12; x++) L[19][x] = '>';                      // A
  L[15][15] = '^'; L[14][15] = '^'; for (let x = 15; x <= 19; x++) L[13][x] = '>';   // B
  for (let y = 7; y <= 16; y++) L[y][3] = '^';                       // C
  for (let y = 7; y <= 16; y++) L[y][6] = 'v';                       // D
  for (let x = 8; x <= 11; x++) L[4][x] = '>';                       // E
  for (let x = 8; x <= 10; x++) L[6][x] = '<';                       // F
  for (let y = 5; y <= 9; y++) L[y][19] = 'v'; L[10][19] = '>';      // H
  L[14][19] = 'v'; L[15][19] = 'v'; L[16][19] = '<';                 // I
  for (let x = 7; x <= 12; x++) L[18][x] = '<';                      // J
  for (let y = 5; y <= 9; y++) L[y][25] = '^';                       // G (group a: calm when turned)
  L[14][27] = '<'; L[14][28] = '<';                                  // M
  for (let y = 5; y <= 9; y++) T[y][25] = 'x';
  T[12][27] = '>'; T[12][28] = '>';                                  // K (group a, turned)
  const rows = (a) => a.map((r) => r.join(''));
  return { ground: rows(g), lanes: rows(L), turned: rows(T) };
}

const B = build();

export const TEST_WIND = {
  id: 'ep6_testwind', name: 'Test Gust Lanes', area: 'dungeon', music: null, ambience: null, tileset: 'town',
  lighting: { tint: 'none', dark: 0 },
  under: 'cloudbank',
  start: { x: 3, y: 20, dir: 'up' },
  legend: { '~': 'cloudbank', 'w': 'wood_floor' },
  ground: B.ground,
  wind: { kind: 'open', lanes: B.lanes, turned: { a: B.turned } },
  overlays: [],
  decor: [{ t: 'pillar', x: 12, y: 4 }],
  events: [
    { id: 'mo_c', type: 'mooring', x: 3, y: 13 },
    { id: 'mo_g', type: 'mooring', x: 25, y: 7 },
    { id: 'vane_a', type: 'vane', x: 21, y: 10, group: 'a' },
    { id: 'vane_a2', type: 'vane', x: 24, y: 7, group: 'a' },
    { id: 'chest_l', type: 'chest', x: 1, y: 13, tier: 'wood', item: 'potion', qty: 1 },
    { id: 'chest_p', type: 'chest', x: 15, y: 3, tier: 'wood', item: 'potion', qty: 1 },
    { id: 'chest_t', type: 'chest', x: 27, y: 2, tier: 'iron', item: 'potion', qty: 2 },
    { id: 'chest_x', type: 'chest', x: 30, y: 12, tier: 'wood', item: 'potion', qty: 1 },
  ],
  exits: [],
  marks: { start: [3, 20], lane_a_in: [6, 19], lane_a_land: [13, 19], bend_in: [15, 16], bend_land: [20, 13], post_in: [3, 17],
    post: [3, 13], ledge: [2, 13], deck_n: [3, 6], lane_e_in: [7, 4], lane_e_stop: [11, 4], lane_e_off: [11, 5],
    vane_face: [22, 10], g_in: [25, 10], g_post: [25, 7], deck_t: [25, 4], k_in: [26, 12], deck_x: [29, 12], view_a: [9, 19], view_vane: [23, 8] },
};

// ep6_testring (20 x 16, tint `storm`, dark 0.5): the ring and the storm. A stone spire (x 8..11, y 6..9) with a ring lane
// round it (clockwise: row 5 '>', column x 12 'v', row 10 '<', column x 7 '^'); the post mo_r at (12, 7) beside the east
// deck (x 13..15, y 6..8, the "stair up", a lamp pool). Step in from the south deck (x 6..13, y 11..14) and the ring carries
// the party round to the post. Lane R (x 14, rows 9 and 10 'v', then (14, 11)) brings it back down; it lands on (14, 11).
function buildRing() {
  const W2 = 20, H2 = 16;
  const g = Array.from({ length: H2 }, () => Array(W2).fill('~'));
  const L = Array.from({ length: H2 }, () => Array(W2).fill('.'));
  for (let y = 6; y <= 9; y++) for (let x = 8; x <= 11; x++) g[y][x] = y === 9 ? '|' : '#';
  for (let y = 11; y <= 14; y++) for (let x = 6; x <= 14; x++) g[y][x] = 'p';
  for (let y = 6; y <= 8; y++) for (let x = 13; x <= 15; x++) g[y][x] = 'w';
  for (let x = 7; x <= 11; x++) L[5][x] = '>';
  for (let y = 5; y <= 9; y++) L[y][12] = 'v';
  for (let x = 8; x <= 12; x++) L[10][x] = '<';
  for (let y = 6; y <= 10; y++) L[y][7] = '^';
  L[9][14] = 'v'; L[10][14] = 'v';
  return { ground: g.map((r) => r.join('')), lanes: L.map((r) => r.join('')) };
}
const R = buildRing();

export const TEST_RING = {
  id: 'ep6_testring', name: 'Test Storm Ring', area: 'dungeon', music: null, ambience: null, tileset: 'town',
  lighting: { tint: 'storm', dark: 0.5, lights: [{ x: 14 * 16 + 8, y: 6 * 16 + 4, r: 56, color: '#ffd27a' }] },
  under: 'cloudbank',
  start: { x: 9, y: 12, dir: 'up' },
  legend: { '~': 'cloudbank', 'w': 'wood_floor', 'p': 'plaza', '#': 'foundry_top', '|': 'foundry_face' },
  ground: R.ground,
  wind: { kind: 'ring', lanes: R.lanes },
  overlays: [],
  decor: [],
  events: [
    { id: 'mo_r', type: 'mooring', x: 12, y: 7 },
    { id: 'chest_r', type: 'chest', x: 15, y: 6, tier: 'wood', item: 'potion', qty: 1 },
  ],
  exits: [],
  marks: { start: [9, 12], ring_in: [9, 11], post: [12, 7], deck: [13, 7], view: [10, 8] },
};

export default TEST_WIND;
