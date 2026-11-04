// Fixture for the tide locks (E4-world): one causeway hall with every tide event, registered by ../world.js (never in the
// first download, never a plan map id). 34 x 26, start (16, 15) on the hub.
//
//   Basin a (west, 3 levels, start 1, wheel wh_a): a canal (h0) under the north wall, a walkway (h1), the wheel's stand.
//     The canal door g_paper is papered over (seal_a, h 1, target g_paper): at mid the water stands below the seal; raise
//     to high and it washes off for good; drain to low and walk through the door to closet A. Chest chest_a on the canal
//     floor (reachable at low water). Post post_a in the canal.
//   Basin b (east, 3 levels, start 0, wheel wh_b): a canal between two walkways (h1), five moored pontoons across it at
//     x 24. Low: they sit on the canal floor (solid). Mid: they float level with the walkways, a bridge north to chest_b.
//     High: the walkways flood too and the floodgate fg_b (at 2, latch, flag _t_tidegate) lifts; lower the water again
//     and it stays open: its doorway leads to closet B.
//   Basin c (south, 2 levels, start 1, wheel wh_c, the farm wheel: no crank): a lane (h0) between the hub and the south
//     room. Mid: under water, the punt pt_c floats in it. Low: the lane drains, the punt sits on the floor, walk south to
//     chest_c.

const W = 34, H = 26;

function build() {
  const g = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => {
    if (y < 2 || y >= 24 || x === 0 || x === W - 1) return '#';
    if ((x === 1 || x === W - 2) && y < 14) return y >= 2 && y < 4 ? '|' : '#';
    if (y < 4) return '|';
    return 'f';
  }));
  const B = Array.from({ length: H }, () => Array(W).fill('.'));
  const Hh = Array.from({ length: H }, () => Array(W).fill('.'));
  const put = (x, y, c, b, h) => { g[y][x] = c; if (b) { B[y][x] = b; Hh[y][x] = String(h); } };
  // the wall between a and b, rows 0 to 13
  for (let y = 0; y <= 13; y++) for (const x of [16, 17]) g[y][x] = y >= 2 && y <= 3 ? '|' : '#';
  for (let y = 4; y <= 13; y++) for (const x of [16, 17]) g[y][x] = '#';
  // basin a, x 2..15
  for (let x = 2; x <= 15; x++) {
    for (let y = 4; y <= 6; y++) put(x, y, 'c', 'a', 0);
    put(x, 7, x === 9 ? 'N' : 'L', 'a', x === 9 ? 0 : 1);
    for (let y = 8; y <= 10; y++) put(x, y, 'f', 'a', 1);
    put(x, 11, x === 12 ? 'N' : 'L', 'a', x === 12 ? 1 : 2);
  }
  // basin b, x 18..31
  for (let x = 18; x <= 31; x++) {
    for (let y = 4; y <= 6; y++) put(x, y, 'f', 'b', 1);
    put(x, 7, x === 24 ? 'c' : 'L', 'b', x === 24 ? 0 : 1);
    for (let y = 8; y <= 10; y++) put(x, y, 'c', 'b', 0);
    put(x, 11, x === 24 ? 'c' : 'L', 'b', x === 24 ? 0 : 1);
    put(x, 12, 'f', 'b', 1);
    put(x, 13, x === 26 ? 'N' : 'L', 'b', x === 26 ? 1 : 2);
  }
  // the south: closets A (x 2..5) and B (x 28..31), the lane (basin c, x 8..25), the south room
  for (let y = 16; y <= 23; y++) for (const x of [6, 7, 26, 27]) g[y][x] = '#';
  for (const x of [1, 2, 3, 4, 5, 28, 29, 30, 31, 32]) for (const y of [16, 17]) g[y][x] = '#';
  for (let x = 8; x <= 25; x++) {
    put(x, 16, x === 10 ? 'S' : 'L', 'c', x === 10 ? 0 : 1);
    for (let y = 17; y <= 19; y++) put(x, y, 'c', 'c', 0);
    put(x, 20, x === 24 ? 'N' : 'L', 'c', x === 24 ? 0 : 1);
  }
  return { ground: g.map((r) => r.join('')), basin: B.map((r) => r.join('')), height: Hh.map((r) => r.join('')) };
}

const R = build();

export const TEST_TIDE = {
  id: 'ep4_testtide', name: 'Test Tide Hall', area: 'dungeon', music: null, ambience: null, tileset: 'ep4',
  lighting: { tint: 'none', dark: 0 },
  under: 'causeway_floor',
  start: { x: 16, y: 15, dir: 'up' },
  legend: { '#': 'causeway_top', '|': 'causeway_face', 'f': 'causeway_floor', 'c': 'canal_floor', 'L': 'ledge_lip',
    'N': 'canal_stair_n', 'S': 'canal_stair_s' },
  ground: R.ground,
  tide: {
    basins: { a: { start: 1, levels: 3, wheel: 'wh_a' }, b: { start: 0, levels: 3, wheel: 'wh_b' }, c: { start: 1, levels: 2, wheel: 'wh_c' } },
    basin: R.basin,
    height: R.height,
  },
  overlays: [],
  decor: [],
  events: [
    { id: 'wh_a', type: 'tidewheel', x: 5, y: 12, basin: 'a' },
    { id: 'post_a', type: 'tidepost', x: 3, y: 5 },
    { id: 'g_paper', type: 'gate', x: 8, y: 3, sprite: 'door_canal', state: 'closed', to: ['ep4_testtide', 3, 20, 'down'] },
    { id: 'seal_a', type: 'forgery', x: 8, y: 3, basin: 'a', h: 1, target: 'g_paper' },
    { id: 'chest_a', type: 'chest', x: 14, y: 4, tier: 'wood', item: 'potion', qty: 1 },
    { id: 'wh_b', type: 'tidewheel', x: 20, y: 14, basin: 'b' },
    { id: 'post_b', type: 'tidepost', x: 30, y: 9 },
    ...[7, 8, 9, 10, 11].map((y) => ({ id: `pt_${y}`, type: 'pontoon', x: 24, y })),
    { id: 'chest_b', type: 'chest', x: 30, y: 4, tier: 'wood', item: 'potion', qty: 1 },
    { id: 'fg_b', type: 'floodgate', x: 20, y: 3, basin: 'b', at: 2, latch: true, flag: '_t_tidegate', to: ['ep4_testtide', 29, 20, 'down'] },
    { id: 'wh_c', type: 'tidewheel', x: 6, y: 15, basin: 'c', crank: false },
    { id: 'post_c', type: 'tidepost', x: 12, y: 18 },
    { id: 'pt_c', type: 'pontoon', x: 17, y: 18, rides: [1] },
    { id: 'chest_c', type: 'chest', x: 22, y: 22, tier: 'wood', item: 'potion', qty: 1 },
    { id: 'chest_ca', type: 'chest', x: 4, y: 19, tier: 'wood', item: 'potion', qty: 1 },
    { id: 'chest_cb', type: 'chest', x: 30, y: 19, tier: 'wood', item: 'potion', qty: 1 },
    { id: 'back_a', type: 'door', x: 2, y: 22, to: ['ep4_testtide', 4, 14, 'down'] },
    { id: 'back_b', type: 'door', x: 31, y: 22, to: ['ep4_testtide', 29, 14, 'down'] },
  ],
  exits: [],
  marks: { hub: [16, 15], stand_a: [5, 13], stand_b: [20, 15], stand_c: [6, 14], walk_a: [9, 9], canal_a: [8, 4], walk_b_s: [24, 12],
    walk_b_n: [24, 6], lane: [10, 18], south: [16, 22], closet_a: [3, 20], closet_b: [29, 20] },
};

export default TEST_TIDE;
