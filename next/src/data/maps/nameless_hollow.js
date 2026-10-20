// The Nameless Hollow / Hollowmere (44 x 34, town). EPISODE2_PLAN 4.2.
//
// A Dragon Quest town that reads on a phone at a glance, built around one image: a fountain where only strangers have
// faces. The road from the Fading Road comes in along the south-west and turns north through the low stone gate (the
// blank gate sign; Nico's chalk crown) into the town. The Unwritten Square in the middle: the Fountain of Faces (the
// fountain_check object, the fountain_faces step ring), the proclamation board, the empty plinth, benches, lamps; after
// the Mirror Sigil a Keeper mirror beside the fountain leads to the Court. North: the Mayor's Hall. North-east: Lena's
// clocktower (no hands until the town is restored). West: the Signless Inn (Sava at her loom bench on the porch).
// East: the Hollow Provisioner. South-west: the Silverglass Smithy. South-east: the Chapel of the Candles. North shore:
// the mere along the top and down the east edge, Tovin's pier and the ferry to the Court, Orla at the rune shrine. The
// Court far off over the water. Three private homes, silver-blue gardens.
// Signs: every shop and the gate show a blank board; the lettered board is an overhead overlay gated on nh_restored
// (buildings paint over ground overlays). Music and tint follow nh_restored (plan 5.5).
import { grid, box, put, rows, scatter, bridgeV, hash01, npc, door, sign, object, trigger, enter, pot, mirrorDoor, dullMirror } from './_kit.js';

const W = 44, H = 34;
const g = grid(W, H, '.');

// ---------------------------------------------------------------- terrain
// the mere along the north and down the east edge, a ragged shore of sand
const SHORE = [];
for (let x = 0; x < W; x++) {
  const top = 3 + (hash01(x, 0, 91) < 0.3 ? 1 : 0) - (x >= 38 ? 0 : 0);
  SHORE[x] = top;
  box(g, x, 0, x, top, '~');
  put(g, x, top + 1, 's');
}
for (let y = 0; y < 22; y++) {
  const x0 = 41 + (hash01(0, y, 92) < 0.3 ? 1 : 0) - (y < 6 ? 1 : 0);
  box(g, x0, y, 43, y, '~');
  if (g[y][x0 - 1] === '.') put(g, x0 - 1, y, 's');
}
// the Unwritten Square: a round plaza around the fountain
for (let y = 13; y <= 25; y++) for (let x = 14; x <= 30; x++) {
  const dx = (x - 22) / 8.2, dy = (y - 19) / 6.2;
  if (dx * dx + dy * dy <= 1) put(g, x, y, 'o');
}
// roads: the gate road north to the square, the square's spokes to every door, the pier path
box(g, 0, 32, 15, 33, '=');                 // the road in from the Fading Road (west edge)
box(g, 14, 26, 15, 31, '=');                // through the gate and north to the square
box(g, 8, 19, 14, 19, '=');                 // west: the inn porch
box(g, 30, 21, 37, 21, '='); put(g, 37, 20, '=');   // east: the shop
box(g, 21, 12, 23, 13, '=');                // north: the hall door
box(g, 29, 13, 33, 13, '=');                // north-east: the clocktower
box(g, 9, 26, 13, 26, '='); box(g, 9, 26, 9, 29, '=');   // south-west: the smithy
box(g, 26, 26, 32, 26, '='); box(g, 32, 27, 32, 30, '=');   // south-east: the chapel
box(g, 12, 6, 13, 13, '='); box(g, 13, 13, 16, 13, '=');   // the pier path
put(g, 20, 30, '='); box(g, 20, 26, 20, 29, '=');   // the south house
put(g, 38, 14, '='); box(g, 33, 14, 38, 14, '=');   // the east house
put(g, 3, 11, '='); box(g, 3, 12, 3, 18, '='); box(g, 3, 18, 8, 18, '=');   // the north-west house to the inn
// the town wall along the south, broken by the gate (x 12..17 is the gate prefab)
for (let x = 0; x <= 11; x++) put(g, x, 31, 'W');
for (let x = 18; x <= 43; x++) put(g, x, 31, 'W');
// gardens and verges
for (const [x0, y0, x1, y1] of [[1, 20, 2, 29], [16, 27, 18, 29], [24, 27, 25, 30], [38, 23, 40, 30], [27, 6, 29, 10], [6, 6, 9, 8]]) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (g[y][x] === '.' && hash01(x, y, 93) < 0.55) put(g, x, y, ',');
}
const ground = rows(g.map((r) => r));

// ---------------------------------------------------------------- overlays
const overlays = [
  ...bridgeV(12, 1, SHORE[12] + 1, 'wood'),  // Tovin's pier
  ...scatter(ground, ['.'], ['flowers_blue', 'flowers_white', 'tuft_0', 'tuft_1', 'pebbles_0', 'hydrangea_blue'], 0.06, 94),
  ...scatter(ground, [','], ['hydrangea_blue', 'hydrangea_violet', 'flowers_blue'], 0.3, 95),
  ...scatter(ground, ['s'], ['pebbles_0', 'pebbles_1', 'pebbles_2'], 0.2, 96),
  // reeds along the shore
  ...[[2, 5], [7, 5], [17, 5], [25, 5], [33, 5], [36, 5], [39, 8], [39, 15], [40, 19]].filter(([x, y]) => ground[y][x] !== '~')
    .map(([x, y], i) => ({ t: `reeds_${i % 3}`, x, y })),
  // the square's dressing
  { t: 'hydrangea_blue', x: 16, y: 16 }, { t: 'hydrangea_violet', x: 28, y: 16 }, { t: 'hydrangea_blue', x: 16, y: 22 },
  { t: 'hydrangea_violet', x: 28, y: 22 },
];

// ---------------------------------------------------------------- decor
const decor = [
  // buildings (anchor = bottom-left footprint tile)
  { t: 'hall_hollow', x: 17, y: 11 },        // door (22,11)
  { t: 'clocktower', x: 30, y: 12 },         // door (32,12)
  { t: 'inn_hollow', x: 4, y: 17 },          // door (8,17)
  { t: 'shop_hollow', x: 34, y: 19 },        // door (37,19)
  { t: 'smithy_hollow', x: 5, y: 29 },       // door (9,29)
  { t: 'chapel_hollow', x: 30, y: 29 },      // door (32,29)
  { t: 'house_hollow_s', x: 2, y: 10 },      // door (3,10)
  { t: 'house_hollow_m', x: 19, y: 29 },     // door (20,29)
  { t: 'house_hollow_s', x: 37, y: 13 },     // door (38,13)
  { t: 'gate_hollow', x: 12, y: 31 },        // opening (14..15,31)
  // the square
  { t: 'signboard', x: 17, y: 15 },          // the proclamation board
  { t: 'lantern_pedestal_empty', x: 27, y: 15 },   // the empty plinth
  { t: 'bench', x: 16, y: 21 }, { t: 'bench', x: 27, y: 21 },
  { t: 'lamp_post', x: 15, y: 18, state: 1 }, { t: 'lamp_post', x: 29, y: 18, state: 1 },
  { t: 'lamp_post', x: 19, y: 24, state: 1 }, { t: 'lamp_post', x: 25, y: 24, state: 1 },
  { t: 'lamp_post', x: 16, y: 26, state: 1 }, { t: 'lamp_post', x: 11, y: 14, state: 1 },
  { t: 'lamp_post', x: 34, y: 14, state: 1 }, { t: 'lamp_post', x: 14, y: 5, state: 1 },
  // the shore: the rune shrine by the pier, nets and crates
  { t: 'rune_shrine', x: 8, y: 7 },
  { t: 'crates_barrels', x: 15, y: 6 },
  // trees: silver birches and a few pines
  { t: 'tree_birch_silver', x: 1, y: 15 }, { t: 'tree_birch_silver', x: 26, y: 9 }, { t: 'tree_birch_silver', x: 39, y: 11 },
  { t: 'tree_birch_silver', x: 1, y: 28 }, { t: 'tree_birch_silver', x: 27, y: 30 }, { t: 'tree_birch_silver', x: 40, y: 28 },
  { t: 'tree_pine', x: 11, y: 22 }, { t: 'tree_pine', x: 36, y: 8 },
  { t: 'bench', x: 11, y: 18 },             // Sava's loom bench on the inn porch
  { t: 'bush', x: 13, y: 23 }, { t: 'bush', x: 31, y: 16 }, { t: 'bush', x: 17, y: 9 }, { t: 'bush', x: 10, y: 11 },
  { t: 'bush', x: 25, y: 28 }, { t: 'bush', x: 38, y: 24 },
];

// ---------------------------------------------------------------- events
const events = [
  enter('nh_enter', 'nh_arrival'),
  enter('nh_restored_enter', 'hollowmere_restored'),
  // doors into the interiors (target = the interior's exit cell, facing up)
  door('door_hall', 22, 11, ['nh_hall', 10, 14, 'up']),
  door('door_inn', 8, 17, ['nh_inn', 10, 11, 'up']),
  door('door_shop', 37, 19, ['nh_shop', 7, 10, 'up']),
  door('door_smithy', 9, 29, ['nh_smithy', 8, 10, 'up']),
  door('door_chapel', 32, 29, ['nh_chapel', 9, 13, 'up']),
  // the square
  object('fountain_obj', 20, 19, 'fountain', { script: 'fountain_check', w: 4 }),
  trigger('fountain_trig', 19, 17, 6, 4, 'fountain_faces'),
  sign('proclamation', 17, 15, 'proclamation'),
  sign('plinth', 27, 15, 'plinth'),
  sign('fountain_sign', 22, 19, 'fountain'),
  dullMirror('square_mirror', 26, 18, 'mirror_sigil_get', 'nh_chapel_mirror'),
  mirrorDoor('mirror_warp_sq', 26, 18, ['court_f1', 14, 26, 'down'], 'mirror_sigil_get'),
  // signs: read from the street at the facade's foot beside each door (the board itself hangs at the prefab's signAt)
  sign('gate_sign', 14, 31, 'gate_sign', { solid: false, on: 'interact' }),
  sign('sign_nh_inn', 7, 17, 'sign_nh_inn'),
  sign('sign_nh_shop', 36, 19, 'sign_nh_shop'),
  sign('sign_nh_smithy', 8, 29, 'sign_nh_smithy'),
  sign('sign_nh_hall', 23, 11, 'sign_nh_hall'),
  sign('sign_nh_chapel', 33, 29, 'sign_nh_chapel'),
  sign('clocktower_sign', 31, 12, 'clocktower'),
  sign('house_nw', 3, 10, 'nh_house', { solid: false }),
  sign('house_s', 20, 29, 'nh_house', { solid: false }),
  sign('house_e', 38, 13, 'nh_house', { solid: false }),
  sign('rune_shrine', 9, 7, 'rune_shrine'),
  sign('flowers_nh', 38, 26, 'nh_flowers', { solid: false }),
  // the pier and the ferry to the Court (the post reads always; the ride needs court_ferry_open)
  { id: 'ferry_court', type: 'ferry', x: 13, y: 1, text: 'nh_pier', to: ['court_f1', 19, 27, 'up'], rideIf: 'court_ferry_open', solid: false },
  // NPCs (sprites, movement, presence and talk come from npcs.js)
  npc('corin', 11, 29, 'right'),
  npc('nico', 17, 28, 'left'),
  npc('sava', 10, 18, 'down'),
  npc('lena', 33, 13, 'down'),
  npc('tovin', 12, 5, 'up'),
  npc('orla', 11, 8, 'down'),
  npc('aurel', 18, 22, 'up'),
  // pots and barrels with small things
  pot('pot_inn', 3, 16, { item: 'potion' }), pot('pot_smithy', 11, 28, { gold: 30 }), pot('pot_shore', 16, 7, { item: 'ether' }),
  pot('pot_chapel', 36, 30, { item: 'antidote' }),
];

export default {
  id: 'nameless_hollow', name: 'Nameless Hollow', area: 'town',
  music: [{ if: 'nh_restored', id: 'hollowmere' }, { id: 'hollow' }],
  ambience: 'mere_still', tileset: 'town',
  lighting: { tint: [{ if: 'nh_restored', id: 'none' }, { id: 'hollow_dusk' }], dark: 0 },
  under: 'grass',
  legend: { '.': 'grass', ',': 'tallgrass', '=': 'dirt', 'o': 'plaza', 's': 'sand', '~': 'mere_water', 'W': 'wall_low' },
  ground,
  overlays,
  decor,
  // restored signs, the clock's hands and Nico's chalk crown hang on the buildings (drawn after them)
  overhead: [
    { t: 'court_far', x: 34, y: 0 },
    { t: 'sign_hollow_gate', x: 14, y: 29, if: 'nh_restored' },
    { t: 'chalk_crown', x: 15, y: 29 },
    { t: 'sign_hollow_inn', x: 6, y: 16, if: 'nh_restored' },
    { t: 'sign_hollow_shop', x: 36, y: 18, if: 'nh_restored' },
    { t: 'sign_hollow_smithy', x: 8, y: 28, if: 'nh_restored' },
    { t: 'sign_hollow_hall', x: 24, y: 10, if: 'nh_restored' },
    { t: 'sign_hollow_chapel', x: 35, y: 28, if: 'nh_restored' },
    { t: 'clock_hands', x: 31, y: 8, if: 'nh_restored' },
  ],
  events,
  exits: [{ x: 0, y: 32, w: 1, h: 2, to: ['east_road', 62, 16, 'left'] }],
  marks: {
    gate_in: [1, 32], gate_sign: [14, 30], fountain: [21, 18], fountain_view: [21, 20], fountain_out: [24, 21],
    meet_elian: [22, 21], elian_from: [22, 12], hall_door: [22, 12], chapel_door: [32, 30], inn_door: [8, 18],
    ferry_landing: [12, 2], tovin_spot: [12, 5], pier_end: [12, 1], plinth: [27, 16], clocktower: [32, 13],
    nico_spot: [17, 28], crowd_a: [19, 20], crowd_b: [24, 20], crowd_c: [18, 19], crowd_d: [25, 19],
    gather_anwen: [20, 23], gather_lena: [24, 23], gather_corin: [18, 23], gather_nico: [22, 23],
    restored_spot: [22, 21], restored_aurel: [18, 22], restored_elian: [23, 22], night_view: [22, 6],
    emberpeak_glow: [41, 1], mirror_warp_sq: [26, 18],
  },
  start: { x: 1, y: 32, dir: 'right' },
};
