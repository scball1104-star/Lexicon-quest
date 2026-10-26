// The Keepers' Terrace (60 x 22, field): a long, high, windy stone walk the Keepers built along the cliff above the valley
// (EXPANSION1_PLAN 4.4). A low parapet on the south, the cliff rising on the north, carved cairns, a ruined beacon and a
// domed observatory. Bright, open and a little lonely.
//
//   T0 the West Stile   x 0..6,  y 11..14   the moor's way in: arrival (1,13), exit (0,13..14); a stone stile (2..4,15) in the
//                                            low wall leads down to the landing
//   T1 the Landing      x 1..12, y 16..19   arrival (6,19) from the valley stair (the door at (6,20) goes back); a cairn bench;
//                                            terrace_sign
//   T2 the Broken Beacon x 13..24, y 10..17 a fallen fire tower; chest_beacon; e_tr_wolves guards beside the lane at (22,14)
//   the neck            x 25..26, y 12..15
//   T3 the Orrery Court x 27..39, y 4..16   the domed Orrery (door (32,9)), two armillary statues, benches facing the view, the
//                                            Keepers' standing stones; e_tr_golem patrols the east half
//   T4 the Long Walk    x 40..55, y 10..17  a narrow ledge east; thin roots choke a nook in the north face at (47,8..9) (Dash:
//                                            chest_terrace); at the east end the edge gap (56..57, 10..11) drops, one way, to the valley
//
// Pack file: loaded by the `x1` pack on first entry (src/game/packs.js); tile and object ids are the x1 fragment's.
import { grid, put, rows, scatter, hash01, door, sign, object, trigger, enemy, chest, pit, enter, steps } from './_kit.js';

const W = 60, H = 22;

// ---------------------------------------------------------------- the floor mask
const F = Array.from({ length: H }, () => new Array(W).fill(false));
const floor = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) F[y][x] = true; };
floor(0, 11, 6, 14);          // T0 the yard
floor(0, 15, 6, 15);          // the stile row (low wall and the stile)
floor(1, 16, 12, 19);         // T1 the landing
floor(13, 10, 24, 17);        // T2 the Broken Beacon
floor(25, 12, 26, 15);        // the neck
floor(27, 8, 39, 16);         // T3 the Orrery Court
floor(27, 4, 29, 7);          // its west wing
floor(37, 4, 39, 7);          // its east wing (the golem's)
floor(40, 10, 55, 17);        // T4 the Long Walk
floor(47, 8, 47, 9);          // the roots nook (two face rows; the breakable stands here)
floor(56, 10, 57, 11);        // the edge gap (pit)

// ---------------------------------------------------------------- terrain
const g = grid(W, H, '^');
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (F[y][x]) put(g, x, y, 'p');
// north faces: the two rows above any floor cell
for (let y = H - 1; y >= 0; y--) for (let x = 0; x < W; x++) {
  if (F[y][x] || g[y][x] === '|') continue;
  if (y + 1 < H && (F[y + 1][x] || (g[y + 1][x] === '|' && y + 2 < H && F[y + 2][x]))) put(g, x, y, '|');
}
// the south drop: a low parapet, two rock faces, then the lowland (columns 1..55 only; the east end is cliff mass)
for (let x = 1; x <= 55; x++) {
  let yb = -1;
  for (let y = 0; y < H; y++) if (F[y][x]) yb = y;
  if (yb < 0) continue;
  if (yb >= 18) { for (const y of [yb + 1, yb + 2]) if (y < H) put(g, x, y, '|'); continue; }
  put(g, x, yb + 1, 'P');
  put(g, x, yb + 2, '|'); put(g, x, yb + 3, '|');
  for (let y = yb + 4; y < H; y++) put(g, x, y, 'g');
}
// the lawns of the two court wings; the court's stone runner to the Orrery door; the yard's moor turf and its dirt path
for (let y = 4; y <= 7; y++) for (let x = 27; x <= 29; x++) put(g, x, y, 'g');
for (let y = 4; y <= 7; y++) for (let x = 37; x <= 39; x++) put(g, x, y, 'g');
for (let y = 10; y <= 15; y++) for (let x = 31; x <= 33; x++) put(g, x, y, 's');
for (let y = 16; y <= 19; y++) for (let x = 5; x <= 7; x++) put(g, x, y, 's');
for (let y = 11; y <= 14; y++) for (let x = 0; x <= 6; x++) put(g, x, y, 'g');
for (const [x, y] of [[0, 13], [1, 13], [2, 13], [0, 14], [1, 14], [2, 14], [3, 14], [3, 13], [3, 15], [4, 14]]) put(g, x, y, 'd');
for (const [x, y] of [[14, 10], [15, 10], [22, 17], [23, 17], [24, 17], [13, 17], [23, 10], [24, 10]]) put(g, x, y, 'g');
for (const [x, y] of [[41, 10], [42, 10], [52, 10], [53, 10], [44, 17], [45, 17], [50, 17], [51, 17]]) put(g, x, y, 'g');
for (const x of [0, 1, 5, 6]) put(g, x, 15, 'P');           // the low wall, with the stile gap in the middle
put(g, 6, 19, 'S'); put(g, 6, 20, 't'); put(g, 6, 21, 'z'); // the Keepers' stair down to the valley
for (const [x, y] of [[56, 10], [57, 10], [56, 11], [57, 11]]) put(g, x, y, 'x'); // the edge gap
const ground = rows(g);

// ---------------------------------------------------------------- overlays
const overlays = [
  { t: 'wall_broken', x: 47, y: 8 },                         // the nook behind the roots is open floor (the roots draw over it)
  ...scatter(ground, ['p'], ['pebbles_0', 'pebbles_1', 'pebbles_2', 'tuft_0', 'leaves'], 0.05, 71),
  ...scatter(ground, ['g'], ['flowers_white', 'flowers_yellow', 'flowers_violet', 'tuft_0', 'tuft_1'], 0.18, 72),
  // the fallen beacon: ash and char on the stone
  { t: 'ash_drift_a', x: 17, y: 12 }, { t: 'ash_drift_b', x: 18, y: 13 }, { t: 'ash_drift_c', x: 19, y: 12 }, { t: 'ash_drift_a', x: 17, y: 14 },
  { t: 'ash_drift_b', x: 16, y: 13 }, { t: 'ash_drift_a', x: 20, y: 13 },
];

// ---------------------------------------------------------------- decor
const pines = [];
// the upland above the cliff: a few pines and boulders, clear of the Orrery's tower and the wings
for (const [x, y] of [[2, 3], [6, 6], [10, 2], [14, 5], [19, 3], [23, 6], [9, 8], [3, 9], [22, 1], [26, 3], [41, 4], [44, 7], [48, 3], [52, 6], [55, 2], [58, 8], [45, 1], [58, 14], [36, 1], [31, 1]]) pines.push({ t: 'tree_pine', x, y });
for (const [x, y] of [[2, 21], [9, 21], [14, 21], [17, 21], [20, 21], [23, 21], [32, 21], [36, 21], [41, 21], [44, 21], [48, 21], [52, 21], [27, 21], [30, 20], [38, 20]]) pines.push({ t: 'tree_pine', x, y });
const decor = [
  ...pines,
  // T0 / T1
  { t: 'x1_stile', x: 2, y: 15 },
  { t: 'x1_cairn_moor', x: 8, y: 16 }, { t: 'bench', x: 10, y: 17 }, { t: 'signboard', x: 8, y: 18 },
  { t: 'lamp_post', x: 1, y: 17, state: 1 }, { t: 'bush', x: 12, y: 19 }, { t: 'x1_boulder_a', x: 16, y: 3 }, { t: 'x1_boulder_b', x: 50, y: 5 }, { t: 'x1_boulder_a', x: 7, y: 4 }, { t: 'x1_boulder_b', x: 40, y: 6 }, { t: 'bush', x: 1, y: 12 }, { t: 'bush', x: 5, y: 11 },
  // T2: the Broken Beacon, a fire tower fallen on its side
  { t: 'pillar', x: 15, y: 11 }, { t: 'pillar', x: 17, y: 11 }, { t: 'pillar', x: 19, y: 11 },
  { t: 'brazier_unlit', x: 16, y: 12 }, { t: 'charred_stump', x: 21, y: 12 }, { t: 'charred_stump', x: 14, y: 14 },
  { t: 'x1_boulder_a', x: 21, y: 11 }, { t: 'x1_boulder_b', x: 15, y: 15 }, { t: 'x1_boulder_a', x: 19, y: 15 },
  { t: 'lamp_post', x: 13, y: 16, state: 1 }, { t: 'bush', x: 23, y: 10 }, { t: 'bush', x: 23, y: 15 },
  { t: 'x1_cairn_moor', x: 24, y: 10 }, { t: 'x1_cairn_moor', x: 24, y: 16 },
  // T3: the court
  { t: 'x1_orrery_tower', x: 30, y: 9 },
  { t: 'x1_armillary_statue', x: 27, y: 6 }, { t: 'x1_armillary_statue', x: 37, y: 5 },
  { t: 'bench', x: 29, y: 16 }, { t: 'bench', x: 35, y: 16 },
  { t: 'lamp_post', x: 28, y: 11, state: 1 }, { t: 'lamp_post', x: 36, y: 11, state: 1 },
  { t: 'x1_cairn_moor', x: 28, y: 9 }, { t: 'x1_cairn_moor', x: 37, y: 9 }, { t: 'x1_cairn_moor', x: 28, y: 14 }, { t: 'x1_cairn_moor', x: 37, y: 14 },
  { t: 'bush', x: 27, y: 4 }, { t: 'bush', x: 39, y: 4 },
  // T4: the Long Walk
  { t: 'lamp_post', x: 42, y: 11, state: 1 }, { t: 'lamp_post', x: 50, y: 12, state: 1 },
  { t: 'x1_cairn_moor', x: 44, y: 10 }, { t: 'x1_cairn_moor', x: 52, y: 16 }, { t: 'signboard', x: 54, y: 11 },
  { t: 'x1_boulder_a', x: 41, y: 16 }, { t: 'bush', x: 46, y: 16 }, { t: 'bush', x: 53, y: 12 },
];

// ---------------------------------------------------------------- events
const events = [
  enter('terrace_enter', 'terrace_arrival'),
  door('stair_down', 6, 20, ['valley', 21, 6, 'down'], { kind: 'stairs' }),
  door('orrery_door', 32, 9, ['x1_orrery', 8, 12, 'up']),
  sign('terrace_sign', 8, 18, 'terrace_sign', { solid: false }),
  sign('edge_sign', 54, 11, 'edge_sign', { solid: false }),
  // the quick way down: the gap at the east end drops, one way, to the valley beside the Archive door
  pit('edge_drop', 56, 10, 2, 2, ['valley', 36, 8, 'down']),
  // chests: the beacon's (rolled), the nook behind thin roots (Dash; rolled)
  chest('chest_beacon', 18, 12, 'wood'),
  object('x1_roots_terrace', 47, 8, 'root_drape', { breakable: 'roots', text: 'root_wall_thin', h: 2 }),
  chest('chest_terrace', 47, 9, 'wood', { behind: 'x1_roots_terrace' }),
  // visible enemies: 2 per ZONES.x1_terrace.plan. The wolves guard beside the lane (T2), the golem walks the court's east wing
  enemy('e_tr_wolves', 22, 14, 'thornback_wolf', 'tr_wolves', 'guard'),
  enemy('e_tr_golem', 38, 6, 'tome_golem', 'tr_golem', 'patrol', { path: steps('down', 6, 'up', 6) }),
];

export default {
  id: 'x1_terrace', name: "The Keepers' Terrace", area: 'field',
  music: 'orrery', ambience: 'wind_valley', tileset: 'town',
  lighting: { tint: 'none', dark: 0 },
  respawn: 'reentry',
  under: 'plaza',
  pitTo: ['x1_terrace', 6, 19, 'up'],
  legend: { '^': 'cliff_top', '|': 'cliff_face', 'p': 'plaza', 's': 'stone_floor', 'g': 'grass', 'd': 'dirt', 'P': 'wall_low',
    'S': 'cliff_stairs_top', 't': 'cliff_stairs_mid', 'z': 'cliff_stairs_bot', 'x': 'pit' },
  ground,
  overlays,
  decor,
  overhead: [],
  events,
  exits: [{ x: 0, y: 13, w: 1, h: 2, to: ['x1_highmoor', 70, 13, 'left'] }],
  marks: { stair_in: [6, 19], stair_door: [6, 20], cairn: [8, 17], beacon: [18, 13], court: [32, 11], orrery_door: [32, 9],
    walk_east: [48, 14], roots: [47, 10], edge: [55, 10], moor_gate: [1, 13] },
  start: { x: 6, y: 19, dir: 'up' },
};
