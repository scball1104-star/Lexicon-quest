// The Lower Millrace (52 x 32, field). EXPANSION1_PLAN 4.7; X1-maps-south (X1 wave W3).
//
// The river below the valley, sunlit, a mill on its bank and a dry weir above a pond that has drained. Warmer and busier
// than the Downs: birds, flour on the wind, a cat on a cart (no cat NPC exists, so the cart stands alone).
//   M1 The Millrace Road (x 21..24, y 0..14): from the valley (arrival (23,1), open from `archive_f1_done`: the bell's toll
//      shook the fallen oak off the track). Signpost at (20,7). `millrace_arrival` runs on enter.
//   M2 The Drovers' Road (x 3..21, y 0..8): from the north-west edge (arrival (4,1)) east, a gentle bend, to join the road.
//   M3 Hal's Mill (x 25..33, y 7..15): the prefab with its wheel on the east side (`x1_mill_wheel`, still until the pin is set:
//      `script: 'pin_place'`), the barred door (`x1_mill_barred` sign until `archivore_defeated`, then `door_mill`), a yard
//      with flour carts and sacks, and the heavy millstone `block_stone` (31,15) over a stone-lined cellar with two chests
//      (Shove). `e_mr_weevils` wanders the granary south of the yard at (22,24).
//   M4 The Weir (x 34..49, y 8..21): the drained pond (cracked mud) under a stone dam with a failed sluice and a narrow
//      ledge path across its top (y 16), a dry river bed coming out of the north-east cliff.
//   M5 Ferrick's Landing (x 8..21, y 12..21): Ferrick and his stall by the weir-keeper's shed, benches, the jetty (x 11..12,
//      y 20..25) where the hay chute from Larchhill lands, an orchard (wood chest) and the west exit to Larchhill's
//      east gate. A safe zone: no group within 6 tiles of Ferrick.
//   M6 The Culvert Mouth (x 37..49, y 21..26): the brick arch at the foot of the dam (`culvert_door` (43,22)).
//   M7 The East Bank (x 36..50, y 24..31): a tall-grass meadow along the dry channel; a cracked river wall (`x1_crack_bank`,
//      Dash) hides the iron chest `chest_mr_bank`; the wolf patrol walks row 28 from x 34 to 40, eight tiles from the arch.
// The Windmill on Larchhill shows on the south-west horizon (`x1_far_windmill`).
import { grid, box, put, rows, scatter, hash01, bridgeV, door, sign, object, enemy, chest, steps, enter, npc } from './_kit.js';

const W = 52, H = 32;
const g = grid(W, H, '.');
const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
const at = (x, y) => (inb(x, y) ? g[y][x] : '#');

/** Smooth value noise in [0,1): bilinear blend of hash01 at a lattice of `cell` tiles. */
function vnoise(x, y, cell, salt) {
  const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
  const fx = x / cell - gx, fy = y / cell - gy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash01(gx, gy, salt), b = hash01(gx + 1, gy, salt), c = hash01(gx, gy + 1, salt), d = hash01(gx + 1, gy + 1, salt);
  return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
}

/** A wobbly ellipse of `ch` (the same shape as the X1-tiles mocks); `only` lists the chars it may overwrite. */
function blob(cx, cy, rx, ry, ch, seed, only = null) {
  for (let y = Math.floor(cy - ry) - 2; y <= Math.ceil(cy + ry) + 2; y++) {
    for (let x = Math.floor(cx - rx) - 2; x <= Math.ceil(cx + rx) + 2; x++) {
      if (!inb(x, y)) continue;
      const a = Math.atan2(y - cy, x - cx);
      const wob = 1 + 0.2 * Math.sin(a * 3 + seed) + 0.1 * Math.sin(a * 5 + seed * 2.3);
      if (Math.hypot((x - cx) / rx, (y - cy) / ry) <= wob && (!only || only.includes(g[y][x]))) put(g, x, y, ch);
    }
  }
}

// ---------------------------------------------------------------- terrain
// the north-east cliff the old river came out of (its bed 'p' cuts the cliff and runs down to the pond)
box(g, 33, 0, 51, 3, '^');
box(g, 33, 4, 51, 5, '|');
box(g, 44, 0, 47, 5, 'p');
box(g, 44, 6, 47, 8, 'p'); put(g, 43, 7, 'p'); put(g, 48, 6, 'p');
// the drained pond above the dam, and the dry race to the wheel
blob(42, 12, 6.4, 3.6, 'p', 2);
box(g, 34, 13, 36, 14, 'p');
box(g, 36, 9, 38, 11, '.');                       // the pond's north-west shore stays grass
blob(42, 12, 6.4, 3.6, 'p', 2);
// the lower river along the south edge, the cove at Ferrick's Landing and its sand banks
box(g, 7, 29, 35, 31, 'w');
put(g, 36, 31, 'w'); put(g, 36, 30, 'w');
blob(13, 25, 7.4, 3.6, 'w', 5);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (g[y][x] !== '.') continue;
  let wet = false;
  for (let dy = -1; dy <= 1 && !wet; dy++) for (let dx = -1; dx <= 1; dx++) if (at(x + dx, y + dy) === 'w') { wet = true; break; }
  if (wet && hash01(x, y, 21) < 0.88) put(g, x, y, 's');
}
// the roads and the yard (dirt): the Millrace Road, the Drovers' Road, the mill yard, the Landing and its lanes
box(g, 22, 0, 24, 4, '=');
box(g, 21, 5, 23, 14, '=');
const droverY = (x) => 5 + Math.round(1.1 * Math.sin((x - 3) / 3.1));
box(g, 3, 0, 5, 4, '=');
for (let x = 3; x <= 21; x++) { const y = droverY(x); box(g, x, y, x, y + 1, '='); if (x < 7) box(g, x, 4, x, y + 1, '='); }
box(g, 14, 15, 34, 19, '=');                      // the mill yard (and the lane west)
put(g, 14, 15, '.'); put(g, 14, 19, '.'); put(g, 34, 15, '.'); put(g, 34, 19, '.'); put(g, 33, 19, '.'); put(g, 20, 19, '.'); put(g, 21, 19, '.');
box(g, 21, 15, 23, 15, '=');
blob(13, 17, 5.2, 3.4, '=', 7);                   // Ferrick's Landing
box(g, 1, 11, 9, 13, '=');                        // the lane in from Larchhill's gate
box(g, 8, 13, 11, 16, '=');
box(g, 12, 19, 14, 20, '=');                      // down to the jetty
box(g, 11, 19, 12, 20, '=');
// the lane east: from the yard past the dam to the culvert mouth and the east bank
box(g, 33, 19, 36, 21, '=');
box(g, 36, 21, 41, 22, '=');
// the dam: cap walk (row 16) and the ground under its face
box(g, 35, 16, 49, 20, '=');
box(g, 49, 16, 50, 22, '=');
// the dry bed below the dam (the culvert mouth) and the gully that runs on to the river
blob(43, 23.2, 6.2, 2.6, 'p', 9);
box(g, 39, 24, 41, 26, 'p'); box(g, 37, 26, 39, 27, 'p'); box(g, 35, 27, 37, 28, 'p');
box(g, 42, 22, 44, 22, 'p');
// the orchard (turf under the apple rows), the south-west hill and the granary meadow
blob(5, 19, 4.6, 5.2, 'o', 11, ['.']);
// the east bank: a low river wall (cliff) with a cracked face at x 46
box(g, 44, 26, 48, 26, '^');
box(g, 44, 27, 48, 28, '|');
// tall grass: value-noise blobs kept off the roads and the yard, thick on the east bank
for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
  if (g[y][x] !== '.') continue;
  let near = false;
  for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if ('=ps'.includes(at(x + dx, y + dy))) { near = true; break; }
  const bank = x >= 36 && y >= 22;
  const n = vnoise(x, y, 5, 31);
  if (!near && (bank ? n > 0.36 : n > 0.66)) put(g, x, y, ',');
}
// ragged edge of the lane at the yard's north side (grass tufts out of the dirt)
for (let x = 14; x <= 34; x++) if (g[15][x] === '=' && hash01(x, 15, 40) < 0.3) put(g, x, 15, '.');
// the stone-lined cellar under the millstone (drystone, a line16 wall): a T whose only mouth is (31, 15)
for (const [x, y] of [[30, 16], [32, 16], [29, 17], [33, 17], [30, 18], [31, 18], [32, 18]]) put(g, x, y, 'D');
for (const [x, y] of [[31, 16], [31, 17], [30, 17], [32, 17]]) put(g, x, y, '=');
// keep the exits' arrival lanes clear of tall grass
for (const [x0, x1, y0, y1] of [[3, 5, 0, 3], [22, 24, 0, 3], [0, 3, 10, 14]]) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (g[y][x] === ',') put(g, x, y, '.');
const ground = rows(g);

// ---------------------------------------------------------------- overlays
const overlays = [
  ...scatter(ground, ['.'], ['flowers_white', 'flowers_yellow', 'tuft_0', 'tuft_1', 'pebbles_0', 'flowers_blue'], 0.05, 61),
  ...scatter(ground, [','], ['flowers_white', 'tuft_1', 'flowers_pink'], 0.04, 62),
  ...scatter(ground, ['s'], ['pebbles_0', 'pebbles_1', 'pebbles_2'], 0.2, 63),
  ...scatter(ground, ['p'], ['pebbles_1', 'pebbles_2', 'pebbles_0'], 0.12, 64),
  ...scatter(ground, ['o'], ['leaves', 'tuft_1', 'flowers_white'], 0.12, 65),
  // reeds along the cove and the river bank
  ...[[7, 28], [8, 27], [15, 28], [18, 27], [20, 26], [6, 25], [20, 24], [25, 28], [29, 28], [32, 28], [19, 22]]
    .filter(([x, y]) => ground[y][x] !== 'w' && ground[y][x] !== '#').map(([x, y], i) => ({ t: `reeds_${i % 3}`, x, y })),
  // the wooden jetty out over the cove (a 2-wide deck, y 20..25; the hay chute lands at its head)
  ...bridgeV(11, 20, 25, 'wood'),
  // the dam: the walk along its top, then the two courses of its face (16 x 32 pieces); two dark drain mouths
  { t: 'x1_weir_cap_l', x: 35, y: 16 },
  ...Array.from({ length: 13 }, (_, i) => ({ t: 'x1_weir_cap_m', x: 36 + i, y: 16 })),
  { t: 'x1_weir_cap_r', x: 49, y: 16 },
  { t: 'x1_weir_face_l', x: 35, y: 17 }, { t: 'x1_weir_face_l', x: 35, y: 19 },
  ...Array.from({ length: 13 }, (_, i) => ({ t: [37, 47].includes(36 + i) ? 'x1_weir_face_arch' : 'x1_weir_face_m', x: 36 + i, y: 17 })),
  ...Array.from({ length: 13 }, (_, i) => ({ t: 'x1_weir_face_m', x: 36 + i, y: 19 })),
  { t: 'x1_weir_face_r', x: 49, y: 17 }, { t: 'x1_weir_face_r', x: 49, y: 19 },
  // the cracked river wall: the hole (drawn over by the crack until Dash Strike breaks it)
  { t: 'wall_broken', x: 46, y: 27 },
];

// ---------------------------------------------------------------- decor
const pines = [];
const pine = (x, y) => { if (inb(x, y)) pines.push({ t: 'tree_pine', x, y }); };
const clearOfExits = (x, y) => !((x >= 2 && x <= 6 && y <= 3) || (x >= 21 && x <= 25 && y <= 3) || (x <= 3 && y >= 10 && y <= 15));
// a broken tree line along the top, the west and east edges and the south-west hill
for (let x = 0; x < W; x += 2) {
  const y = hash01(x, 1, 51) < 0.5 ? 0 : 1;
  const xx = x + (hash01(x, 2, 51) < 0.5 ? 0 : 1);
  if (clearOfExits(xx, y) && ground[y][xx] !== '^' && ground[y][xx] !== 'p') pine(xx, y);
}
for (let y = 3; y < 28; y += 2) {
  if (clearOfExits(0, y) && ground[y][0] === '.') pine(0 + (hash01(0, y, 52) < 0.4 ? 1 : 0), y);
  if (ground[y][51] === '.' || ground[y][51] === ',') pine(50 + (hash01(51, y, 52) < 0.5 ? 1 : 0), y);
}
for (const [x, y] of [[1, 27], [4, 28], [6, 30], [0, 30], [3, 31], [41, 30], [44, 30], [50, 30], [38, 31], [37, 29]]) pine(x, y);
// a few on the cliff top over the dry river bed
for (const [x, y] of [[34, 1], [37, 2], [40, 1], [42, 3], [49, 2], [50, 0], [36, 0], [46, 1]]) if (ground[y][x] === '^') pine(x, y);

const tree = (t, x, y) => ({ t, x, y });
const apples = [];
for (const [x, y] of [[3, 15], [6, 15], [3, 18], [6, 18], [3, 22], [7, 22], [2, 25], [8, 20]]) apples.push(tree(((x + y) & 1) ? 'x1_tree_apple' : 'x1_tree_apple_b', x, y));
apples.push(tree('x1_tree_plum', 6, 21), tree('x1_tree_plum', 4, 24));

const decor = [
  ...pines,
  ...apples,
  // the mill, its wheel slot at (32, 14) (the wheel is an event), the yard
  { t: 'x1_mill_building', x: 25, y: 14 },
  { t: 'x1_flour_cart', x: 24, y: 17 }, { t: 'x1_sack_stack', x: 28, y: 17 }, { t: 'x1_flour_sacks', x: 20, y: 16 },
  { t: 'x1_flour_sacks', x: 22, y: 19 }, { t: 'x1_sack_stack', x: 18, y: 15 },
  { t: 'x1_trough_dry', x: 26, y: 19 },
  { t: 'barrel', x: 35, y: 15 }, { t: 'crate', x: 35, y: 14 },
  { t: 'lamp_post', x: 20, y: 15, state: 0 }, { t: 'lamp_post', x: 29, y: 19, state: 0 },
  // the signpost where the Drovers' Road meets the road
  { t: 'signpost', x: 20, y: 7 },
  // the cellar of the millstone: a stone-lined T under the yard, a hatch at its head (the block stands over the mouth)
  { t: 'x1_hatch_open', x: 31, y: 16 },
  // the weir: the failed sluice in the dam, a stile of rock at the east end
  { t: 'x1_sluice_failed', x: 41, y: 17 },
  { t: 'x1_boulder_b', x: 40, y: 7 }, { t: 'x1_boulder_a', x: 38, y: 9 },
  // the culvert arch at the foot of the dam
  { t: 'x1_culvert_arch', x: 42, y: 22 },
  // Ferrick's Landing: the weir-keeper's shed, his stall, benches, crates
  { t: 'x1_weir_shed', x: 13, y: 17 },
  { t: 'market_stall_cloth', x: 15, y: 19 }, { t: 'crates_barrels', x: 19, y: 18 },
  { t: 'bench', x: 9, y: 18 }, { t: 'bench', x: 9, y: 21 }, { t: 'lamp_post', x: 15, y: 15, state: 0 },
  { t: 'x1_haybale', x: 20, y: 20 },
  // the granary meadow south of the yard
  { t: 'x1_haystack_b', x: 21, y: 22 }, { t: 'x1_haystack_a', x: 27, y: 22 }, { t: 'x1_haybale', x: 27, y: 25 },
  { t: 'x1_flour_sacks', x: 25, y: 24 }, { t: 'barrel', x: 24, y: 23 }, { t: 'crate', x: 29, y: 24 }, { t: 'x1_scarecrow', x: 30, y: 21 },
  // the Drovers' Road: a haystack in the meadow, bushes
  { t: 'x1_haystack_a', x: 10, y: 2 }, { t: 'bush', x: 14, y: 9 }, { t: 'bush', x: 8, y: 9 }, { t: 'x1_haybale', x: 12, y: 10 },
  { t: 'bush', x: 17, y: 3 }, { t: 'x1_gorse_a', x: 16, y: 11 }, { t: 'x1_gorse_a', x: 6, y: 8 },
  // the east bank: boulders and bushes along the dry channel
  { t: 'x1_boulder_b', x: 49, y: 24 }, { t: 'x1_boulder_a', x: 40, y: 28 + 1 }, { t: 'x1_gorse_a', x: 44, y: 30 }, { t: 'x1_gorse_a', x: 48, y: 30 },
  { t: 'x1_gorse_a', x: 38, y: 25 }, { t: 'bush', x: 47, y: 23 }, { t: 'x1_boulder_a', x: 34, y: 25 },
  { t: 'bush', x: 31, y: 12 }, { t: 'bush', x: 35, y: 10 },
];

// ---------------------------------------------------------------- events
const events = [
  enter('millrace_enter', 'millrace_arrival'),
  // ---- Hal's Mill: barred until the Archivore is down, then the door; the wheel; the stone over the cellar
  door('door_mill', 28, 14, ['x1_mill', 8, 10, 'up'], { if: 'archivore_defeated' }),
  sign('x1_mill_barred', 28, 14, 'x1_mill_barred', { ifNot: 'archivore_defeated' }),
  object('x1_mill_wheel', 32, 14, 'x1_mill_wheel', { script: 'pin_place', state: 0, w: 2, ifNot: 'mill_turning' }),
  object('x1_mill_wheel_turning', 32, 14, 'x1_mill_wheel', { text: 'x1_mill_wheel', state: 1, w: 2, if: 'mill_turning' }),
  { id: 'block_stone', type: 'block', x: 31, y: 15, sprite: 'x1_millstone', heavy: true },
  chest('chest_mr_stone', 30, 17, 'iron', { item: 'phoenix_feather' }),
  chest('chest_mr_stone_b', 32, 17, 'wood', { item: 'honey_roll', qty: 3 }),
  // ---- the road, the weir, the signs
  sign('millrace_sign', 20, 7, 'millrace_signpost'),
  sign('x1_weir_sign', 45, 17, 'x1_weir', { solid: false }),
  // ---- Ferrick's Landing: the stall, the orchard
  npc('ferrick', 14, 18, 'down'),
  chest('chest_mr_orchard', 4, 20, 'wood'),
  // ---- the culvert arch and the cracked river wall
  door('culvert_door', 43, 22, ['x1_culvert', 3, 14, 'down']),
  object('x1_crack_bank', 46, 27, 'wall_cracked', { breakable: 'rock', text: 'cliff_crack', h: 2 }),
  chest('chest_mr_bank', 46, 28, 'iron', { behind: 'x1_crack_bank' }),
  // ---- visible groups: 2 per ZONES.x1_millrace.plan (respawn: 'reentry' below)
  enemy('e_mr_weevils', 22, 24, 'moss_scarab', 'mr_weevils', 'wander', { radius: 1 }),
  enemy('e_mr_wolves', 34, 28, 'thornback_wolf', 'mr_wolves', 'patrol', { path: steps('right', 6, 'left', 6) }),
];

export default {
  id: 'x1_millrace', name: 'The Lower Millrace', area: 'field',
  respawn: 'reentry',
  music: 'millrace', ambience: 'river_birds', tileset: 'town',
  lighting: { tint: 'none', dark: 0 },
  under: 'grass',
  legend: { '.': 'grass', ',': 'tallgrass', '=': 'dirt', 's': 'sand', 'w': 'water', 'p': 'x1_pond_bed', 'o': 'x1_orchard_turf',
    '^': 'cliff_top', '|': 'cliff_face', 'D': 'x1_drystone' },
  ground,
  overlays,
  decor,
  // the Windmill on Larchhill, far off on the south-west horizon (X1-tiles: a 64 x 64 overhead decal)
  overhead: [{ t: 'x1_far_windmill', x: 0, y: 26 }],
  events,
  exits: [
    { x: 22, y: 0, w: 3, h: 1, to: ['valley', 23, 38, 'up'] },
    { x: 3, y: 0, w: 3, h: 1, to: ['x1_downs', 40, 32, 'up'] },
    { x: 0, y: 12, w: 1, h: 2, to: ['x1_larchhill', 66, 18, 'left'] },
  ],
  marks: {
    valley_gate: [23, 1], drovers_gate: [4, 1], signpost: [21, 7], mill_door: [28, 15], wheel: [33, 13], pin_socket: [33, 15],
    weir: [42, 12], ferrick: [14, 18], jetty: [12, 20], larch_gate: [1, 12], culvert: [43, 23], bank_crack: [46, 29], stone: [31, 15],
  },
  start: { x: 23, y: 1, dir: 'down' },
};
