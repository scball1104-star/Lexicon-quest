// The Old Sand Road (52 x 30, field). EPISODE3_PLAN 4.1.
//
// The road climbs from Hollowmere's shore (south-west) to Emberpeak (north-east) through hills that go from grey grass
// to ash, under one long ridge (the cliff along rows 3..5). A river of slag runs out of the ridge at x 18..20 and down
// to the south edge: the road can cross it only where water has crusted it. Four stretches, west to east:
//   The Shore Climb (x 0..14): the gate from Hollowmere lands at (1,22). Grey grass, charred pines, the mere in the
//      south-west, the carters' milestone (3,22; its Lantern line is hidden ink beside it) and a wood chest on the shore.
//      The first-fight cut is column 6 (rows 6..25: every passable cell of it); the sr_first pair waits at the bend
//      (11,21). The stream's old stone trough comes down the ridge beside the slag and turns west along the road.
//   The Slag River (x 15..20): snowmelt pours from a spout in the ridge face (15,5) down the trough (15, 6..19) to the
//      paddle sl_road at a T (15,20). Start state '/': the water turns WEST along row 20 and splashes into the gully pool
//      (9,20), in plain sight of the road. Turned '\': it runs EAST, across the slag (18..20, 20), which crusts into a
//      bridge, and on to the trough's end (23,20). slag_trig (column 16) runs slag_crossing on the bank. In the ridge
//      face above the bank a cracked boulder (17,4..5) hides a grotto with the iron chest (Dash Strike).
//   The Carters' Shelter (x 21..32): ash from here on. The roofless shelter with the fire carters_fire (rest, a safe
//      point), Penny's cart; two groups (hounds south of the road, beetles patrolling the ash north of the shelter).
//   The Rise (x 34..51): two cliff tiers make a switchback: east along the bottom, stairs up at x 47, west along the
//      middle tier past sr_mixed, stairs up at x 38, east along the crest past ash_view (column 44) to the exit
//      (51, 6..7) -> emberpeak (19,30). The Emberpeak silhouette rises over the ridge (overhead, (42,0)).
import { grid, box, put, rows, scatter, hash01, sign, object, trigger, enemy, chest, steps, enter, npc } from '../_kit.js';
import { spout, sluice, layTroughs, TROUGH_LEGEND } from './_quench.js';

const W = 52, H = 30;
const g = grid(W, H, '.');
const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

// ---------------------------------------------------------------- terrain
// the ridge along the north: top row 3, faces 4..5; above it the ash hills (scenery). Over the slag's source the ridge
// is solid rock up to the map edge, with the boulder grotto cut into it.
box(g, 0, 3, 51, 3, '^');
box(g, 0, 4, 51, 5, '|');
box(g, 13, 0, 24, 2, '^');
box(g, 16, 1, 18, 2, '.');                  // the grotto behind the cracked boulder (17,4..5)
put(g, 17, 3, '.');
// the slag river: out of the ridge face, down to the south edge (rows 6..29)
for (let y = 6; y < H; y++) {
  const wob = y > 9 && hash01(0, y, 31) < 0.35 ? 1 : 0;
  box(g, 18, y, 20 + wob, y, 'S');
}
// the mere in the south-west corner with a sand shore
const MERE = [10, 9, 9, 8];
MERE.forEach((x1, i) => box(g, 0, 26 + i, x1, 26 + i, 'm'));
for (let y = 24; y < H; y++) for (let x = 0; x <= 12; x++) {
  if (g[y][x] !== '.') continue;
  const near = [[1, 0], [-1, 0], [0, 1], [1, 1], [-1, 1]].some(([dx, dy]) => inb(x + dx, y + dy) && g[y + dy][x + dx] === 'm');
  if (near) put(g, x, y, 's');
}
// the gully pool where the turned-away water falls (west end of the trough)
box(g, 7, 19, 8, 20, 'w'); put(g, 9, 20, 'w'); put(g, 7, 18, 'w');
// the rise: cliff A (top 15, faces 16..17) and cliff B (top 8, faces 9..10) across x 34..51, closed on the west by a
// rock spur down column 33 (rows 6..17); stairs at x 47 (A) and x 38 (B)
box(g, 34, 15, 51, 15, '^'); box(g, 34, 16, 51, 17, '|');
box(g, 34, 8, 51, 8, '^'); box(g, 34, 9, 51, 10, '|');
box(g, 33, 6, 33, 17, '^'); put(g, 33, 16, '|'); put(g, 33, 17, '|');
put(g, 47, 15, 'T'); put(g, 47, 16, 't'); put(g, 47, 17, 'z');
put(g, 38, 8, 'T'); put(g, 38, 9, 't'); put(g, 38, 10, 'z');
// grey grass going to ash: grass east of x 13 turns to ash in a ragged seam (all ash past the river); tall grass tufts
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (g[y][x] !== '.') continue;
  if (x >= 21 || (x >= 12 && hash01(x, y, 12) < (x - 10) / 8)) put(g, x, y, 'a');
  else if (hash01(x, y, 13) < 0.14 && y > 6 && y < 25) put(g, x, y, ',');
}
// roads: dirt over the grass, cinder path over the ash, one span per row (bends and widens)
const ROAD = { 22: [[0, 13]], 23: [[0, 8]], 21: [[7, 17]] };
const PATH = {
  20: [[21, 31]], 21: [[21, 46]], 22: [[30, 47]], 19: [[26, 30]], 18: [[47, 47]],
  14: [[38, 47]], 13: [[38, 42]], 12: [[38, 39]], 11: [[38, 38]],
  7: [[38, 51]], 6: [[43, 51]],
};
for (const [y, spans] of Object.entries(ROAD)) for (const [x0, x1] of spans) for (let x = x0; x <= x1; x++) if ('.,a'.includes(g[+y][x])) put(g, x, +y, '=');
for (const [y, spans] of Object.entries(PATH)) for (const [x0, x1] of spans) for (let x = x0; x <= x1; x++) if (g[+y][x] === 'a') put(g, x, +y, 'p');
// the stream: spout (15,5) -> down (15,6..19) -> the T under sl_road (15,20) -> west (14..10, 20) into the gully pool, or
// east (16..17, 20) -> slag (18..20, 20) -> (21..23, 20)
layTroughs(g, [[[15, 6], [15, 20]], [[10, 20], [17, 20]], [[21, 20], [23, 20]]], { '15,6': 'N', '17,20': 'E', '21,20': 'W', '10,20': 'W' });
put(g, 15, 20, '7');                          // the T under the paddle: arms N, W, E
const ground = rows(g.map((r) => r));

// ---------------------------------------------------------------- dressing
const walkable = (x, y) => inb(x, y) && '.,=ap'.includes(ground[y][x]);
const overlays = [
  ...scatter(ground, ['.'], ['tuft_0', 'tuft_1', 'pebbles_0', 'pebbles_1'], 0.07, 21),
  ...scatter(ground, ['a'], ['ash_drift_a', 'ash_drift_b', 'ash_drift_c', 'pebbles_2'], 0.1, 22),
  ...scatter(ground, ['s'], ['pebbles_0', 'pebbles_1', 'pebbles_2'], 0.2, 23),
  ...scatter(ground, ['p', '='], ['pebbles_0', 'pebbles_2'], 0.05, 24),
  { t: 'reeds_0', x: 6, y: 21 }, { t: 'reeds_1', x: 10, y: 19 }, { t: 'reeds_2', x: 6, y: 18 },
  { t: 'reeds_1', x: 11, y: 25 }, { t: 'reeds_0', x: 3, y: 25 },
  { t: 'wall_broken', x: 17, y: 5 },          // the grotto mouth behind the cracked boulder (drawn over by the crack)
];
// charred pines: the hills above the ridge, the slopes south of the road, the tiers of the rise (never on the road)
const PINES = [
  [0, 0], [4, 1], [8, 0], [26, 0], [30, 1], [35, 0], [39, 1], [2, 8], [9, 7], [12, 10], [1, 14], [4, 12], [11, 14],
  [2, 17], [13, 24], [16, 27], [23, 14], [24, 9], [31, 8], [27, 12], [23, 26], [30, 26], [36, 25], [42, 26], [48, 25],
  [35, 19], [44, 18], [50, 19], [35, 11], [44, 11], [49, 12],
];
const decor = [
  ...PINES.filter(([x, y]) => walkable(x + 1, y) && ground[y][x + 1] !== 'p' && ground[y][x + 1] !== '=').map(([x, y]) => ({ t: 'charred_pine', x, y })),
  { t: 'charred_stump', x: 10, y: 16 }, { t: 'charred_stump', x: 24, y: 26 }, { t: 'charred_stump', x: 45, y: 13 },
  { t: 'charred_stump', x: 40, y: 24 }, { t: 'charred_stump', x: 5, y: 10 }, { t: 'charred_stump', x: 29, y: 10 },
  { t: 'shelter_ruin', x: 26, y: 18 },          // interior (27..30, 17..18), open to the south
  { t: 'cart_penny', x: 32, y: 19 },
  { t: 'crate', x: 30, y: 17 },
  { t: 'lamp_ember', x: 25, y: 19 }, { t: 'lamp_ember', x: 36, y: 20 },
  { t: 'bush', x: 4, y: 17 }, { t: 'bush', x: 12, y: 17 }, { t: 'bush', x: 3, y: 24 },
];

// ---------------------------------------------------------------- events
const events = [
  enter('sand_enter', 'sand_road_arrival'),
  // ---- the shore climb
  trigger('first_fight_trig', 6, 6, 1, 20, 'sand_first_fight'),
  enemy('e_sr_first', 11, 21, 'cinder_beetle', 'sr_first', 'guard'),
  object('sand_milestone', 3, 21, 'sand_milestone', { text: 'sand_milestone' }),
  sign('sand_milestone_ink', 4, 21, 'sand_milestone_ink', { lantern: true, solid: false }),
  chest('chest_shore', 1, 25, 'wood', { item: 'hi_potion', qty: 2 }),
  // ---- the slag river
  trigger('slag_trig', 16, 6, 1, 18, 'slag_crossing'),
  spout('sp_road', 15, 5, 'down'),
  sluice('sl_road', 15, 20, 0),
  sign('slag_sign', 17, 24, 'slag_pool', { solid: false }),
  object('crack_boulder', 17, 4, 'wall_cracked', { breakable: 'rock', text: 'cliff_crack', h: 2, opens: [[17, 4], [17, 5], [17, 3]] }),
  chest('chest_grotto', 17, 1, 'iron', { behind: 'crack_boulder' }),
  // ---- the carters' shelter
  object('carters_fire', 28, 18, 'carters_fire', { script: 'carters_rest', safe: true, rest: true }),
  npc('penny_s', 34, 20, 'down'),
  enemy('e_sr_hounds', 27, 24, 'cinder_hound', 'sr_hounds', 'wander', { radius: 2 }),
  enemy('e_sr_beetles', 27, 12, 'cinder_beetle', 'sr_beetles', 'patrol', { path: steps('right', 3, 'left', 3) }),
  // ---- the rise
  enemy('e_sr_mixed', 43, 12, 'cinder_hound', 'sr_mixed', 'patrol', { path: steps('left', 3, 'right', 3) }),
  trigger('ash_view_trig', 44, 6, 1, 2, 'ash_view'),
  sign('rise_sign', 41, 7, 'emberpeak_far', { solid: false }),
];

export default {
  id: 'sand_road', name: 'The Old Sand Road', area: 'field',
  respawn: 'reentry',
  music: 'ash_road', ambience: 'ash_wind', tileset: 'town',
  lighting: { tint: 'ash_haze', dark: 0 },
  ambientFx: ['ash'],
  under: 'grass',
  legend: {
    ...TROUGH_LEGEND,
    '.': 'grass', ',': 'tallgrass', '=': 'dirt', 's': 'sand', 'm': 'mere_water', 'w': 'water', 'a': 'ash_ground', 'p': 'cinder_path',
    '^': 'cliff_top', '|': 'cliff_face', 'T': 'cliff_stairs_top', 't': 'cliff_stairs_mid', 'z': 'cliff_stairs_bot',
  },
  ground,
  overlays,
  decor,
  overhead: [{ t: 'emberpeak_far', x: 42, y: 0 }],
  events,
  exits: [
    { x: 0, y: 22, w: 1, h: 2, to: ['nameless_hollow', 41, 26, 'left'] },
    { x: 51, y: 6, w: 1, h: 2, to: ['emberpeak', 19, 30, 'up'] },
  ],
  marks: {
    entry: [1, 22], slag: [19, 20], fire: [28, 19], penny_cart: [34, 20], smith_crate: [29, 18], rise: [44, 7],
    rise_smith: [45, 7], emberpeak_far: [46, 2], town_gate: [50, 7], sluice: [15, 20], grotto: [17, 2],
  },
  start: { x: 1, y: 22, dir: 'right' },
};
