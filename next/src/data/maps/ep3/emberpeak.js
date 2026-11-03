// Emberpeak (40 x 32, town). EPISODE3_PLAN 4.2.
//
// A Dragon Quest town that reads at a glance on a phone, built around one image: a silent bell over a square of ash.
// The Ashen Foundry closes the whole north side (its brick-and-iron face, rows 4..5), with the foundry gate in the middle
// (18..21, 5) at the head of the main street and the furnace glow over it. The road from the sand hills comes in at the
// south gate (19..20, 31) in the slag-brick town wall, where Rusk keeps the watch, and runs north up the main street to
// Bellows Square (x 12..27, rows 13..21): the memorial "Names Etched in Iron" on the west side (Harl with his slate), the
// coolant station on the east (Veyra), the Smelter Proclamation board, ember pits, iron benches, lamps. North-west: the
// bell tower with the First Bell (its door is the bell rope's foot). West: the Bell House. East: the Coal Lantern Inn.
// South-east: Ventworks Supplies. South-west: the Emberpeak Weaponsmith (Garrick's old forge). Two private homes either
// side of the foundry ramp. The east road (rows 14..15) ends at a washed-out drop with a sign: Episode 4's promise.
// Flags: music, tint and banner follow pk_restored (the first_bell scene); the memorial plates are lettered after
// pk_restored; the furnace glow dims; the foundry gate opens (a lift to foundry_f1) after foundry_entered.
import { grid, box, put, rows, scatter, hash01, npc, door, sign, object, trigger, enter, pot } from '../_kit.js';

const W = 40, H = 32;
const g = grid(W, H, 'a');

// ---------------------------------------------------------------- terrain
box(g, 0, 0, 39, 3, '#');                   // the foundry's iron roof line
box(g, 0, 4, 39, 5, '|');                   // its brick-and-iron face
// Bellows Square and the streets (cinder path)
box(g, 12, 13, 27, 21, 'p');
for (const [x, y] of [[12, 13], [27, 13], [12, 21], [27, 21]]) put(g, x, y, 'a');   // the square's corners are worn round
box(g, 19, 6, 20, 12, 'p');                 // the ramp to the foundry gate
box(g, 19, 22, 20, 31, 'p');                // the main street to the south gate
box(g, 5, 12, 11, 13, 'p');                 // the bell tower's forecourt
box(g, 6, 21, 11, 21, 'p');                 // to the Bell House door
box(g, 9, 22, 9, 29, 'p'); box(g, 10, 29, 18, 29, 'p');   // to the smithy
box(g, 28, 14, 37, 15, 'p'); box(g, 34, 13, 34, 13, 'p');   // the east road and the inn door
box(g, 31, 22, 31, 27, 'p'); box(g, 21, 22, 30, 22, 'p');   // to Ventworks
box(g, 11, 11, 11, 11, 'p'); box(g, 27, 11, 27, 12, 'p');   // the homes' doors
// the east road's washed-out drop (Episode 4 is that way)
box(g, 38, 12, 39, 17, 'w'); put(g, 37, 12, 'w'); put(g, 37, 17, 'w');
// the town wall (slag brick, two rows) along the south, the gate gap at 19..20
for (let x = 0; x < W; x++) {
  if (x === 19 || x === 20) continue;
  const end = x === 0 || x === 21 ? 'l' : x === 18 || x === 39 ? 'r' : 'm';
  put(g, x, 30, end.toUpperCase()); put(g, x, 31, end);
}
const ground = rows(g.map((r) => r));

// ---------------------------------------------------------------- dressing
const overlays = [
  ...scatter(ground, ['a'], ['ash_drift_a', 'ash_drift_b', 'ash_drift_c', 'pebbles_2'], 0.09, 41),
  ...scatter(ground, ['p'], ['ash_drift_a', 'pebbles_0'], 0.04, 42),
];
const MEMORIAL = [13, 14];
const decor = [
  { t: 'bell_tower_ember', x: 3, y: 11, state: 0 },    // door (5,11): the bell rope's foot
  { t: 'house_ember_b', x: 10, y: 10 },               // door (11,10)
  { t: 'house_ember_a', x: 26, y: 10 },               // door (27,10)
  { t: 'inn_coal', x: 30, y: 12 },                    // door (34,12)
  { t: 'bellhouse', x: 3, y: 20 },                    // door (6,20)
  { t: 'smithy_ember', x: 5, y: 28 },                 // door (9,28)
  { t: 'shop_vent', x: 28, y: 27 },                   // door (31,27)
  // the square
  { t: 'proclamation_board', x: 15, y: 19 },
  { t: 'ember_pit', x: 17, y: 17 }, { t: 'ember_pit', x: 22, y: 17 }, { t: 'ember_pit', x: 14, y: 21 }, { t: 'ember_pit', x: 25, y: 21 },
  { t: 'bench_iron', x: 21, y: 20 }, { t: 'bench_iron', x: 16, y: 13 },
  { t: 'lamp_ember', x: 12, y: 12 }, { t: 'lamp_ember', x: 25, y: 12 }, { t: 'lamp_ember', x: 18, y: 22 }, { t: 'lamp_ember', x: 21, y: 23 },
  { t: 'lamp_ember', x: 18, y: 7 }, { t: 'lamp_ember', x: 21, y: 7 },
  // the edges of town: charred pines, stumps, crates by the smithy and the shop
  { t: 'charred_pine', x: 0, y: 23 }, { t: 'charred_pine', x: 24, y: 27 },
  { t: 'charred_pine', x: 35, y: 21 }, { t: 'charred_pine', x: 0, y: 14 }, { t: 'charred_pine', x: 36, y: 27 },
  { t: 'charred_stump', x: 15, y: 9 }, { t: 'charred_stump', x: 24, y: 8 }, { t: 'charred_stump', x: 2, y: 27 },
  { t: 'crates_barrels', x: 11, y: 26 }, { t: 'crate', x: 33, y: 26 }, { t: 'barrel', x: 27, y: 26 },
  { t: 'signpost', x: 36, y: 13 },
  { t: 'bench_iron', x: 7, y: 15 },
];

// ---------------------------------------------------------------- events
const events = [
  enter('pk_enter', 'pk_arrival'),
  enter('pk_bell_enter', 'first_bell'),
  // doors into the interiors (the interior's exit cell, facing up)
  door('door_pk_bellhouse', 6, 20, ['pk_bellhouse', 9, 13, 'up']),
  door('door_pk_inn', 34, 12, ['pk_inn', 10, 11, 'up']),
  door('door_pk_shop', 31, 27, ['pk_shop', 7, 10, 'up']),
  door('door_pk_smithy', 9, 28, ['pk_smithy', 8, 10, 'up']),
  // the foundry gate: shut (lift_key), then the open lift down to the Cinder Liftworks
  object('foundry_door', 18, 5, 'foundry_gate_closed', { w: 4, script: 'foundry_gate', text: 'foundry_door', ifNot: 'foundry_entered' }),
  object('foundry_door_open', 18, 5, 'foundry_gate_open', { solid: false, text: 'foundry_door', if: 'foundry_entered' }),
  { id: 'foundry_lift', type: 'door', x: 19, y: 5, w: 2, h: 1, to: ['foundry_f1', 19, 27, 'up'], kind: 'lift', if: 'foundry_entered' },
  // the square
  object('memorial', MEMORIAL[0], MEMORIAL[1], 'memorial', { w: 4, script: 'memorial_wall' }),
  object('coolant_obj', 24, 16, 'coolant_station', { w: 2, script: 'coolant_check' }),
  trigger('veyra_trig', 13, 18, 14, 1, 'veyra_square'),
  sign('smelter_proclamation', 15, 19, 'smelter_proclamation'),
  sign('safety_board', 25, 16, 'safety_board', { solid: false }),
  sign('fire_pit', 17, 17, 'fire_pit'),
  sign('silent_bell', 4, 11, 'silent_bell'),
  // signs beside the doors
  sign('sign_pk_inn', 33, 12, 'sign_pk_inn'),
  sign('sign_pk_shop', 30, 27, 'sign_pk_shop'),
  sign('sign_pk_smithy', 8, 28, 'sign_pk_smithy'),
  sign('sign_pk_bellhouse', 5, 20, 'sign_pk_bellhouse'),
  sign('east_road_sign', 36, 13, 'east_road_sign'),
  // NPCs (sprites, movement, presence and talk come from npcs.js)
  npc('rusk', 21, 29, 'left'),
  npc('veyra', 26, 17, 'left'),
  npc('harl', 17, 15, 'left'),
  // pots by the doors
  pot('pot_pk_inn', 28, 13, { item: 'potion' }), pot('pot_pk_smithy', 12, 28, { gold: 40 }), pot('pot_pk_shop', 33, 27, { item: 'eye_drops' }),
];

export default {
  id: 'emberpeak', name: 'Emberpeak', area: 'town',
  music: [{ if: 'pk_restored', id: 'first_bell' }, { id: 'emberpeak' }],
  ambience: 'ash_wind', tileset: 'town',
  lighting: { tint: [{ if: 'pk_restored', id: 'none' }, { id: 'ash_haze' }], dark: 0 },
  ambientFx: ['ash'],
  under: 'ash_ground',
  legend: {
    'a': 'ash_ground', 'p': 'cinder_path', 'w': 'water', '#': 'foundry_top', '|': 'foundry_face',
    'L': 'wall_slag_top_l', 'M': 'wall_slag_top_m', 'R': 'wall_slag_top_r', 'l': 'wall_slag_bot_l', 'm': 'wall_slag_bot_m', 'r': 'wall_slag_bot_r',
  },
  ground,
  overlays,
  decor,
  // the furnace glow over the gate (bright, then dim), the memorial's plates (blank, then lettered) at its plate slots
  overhead: [
    { t: 'furnace_glow', x: 18, y: 1, state: 0, ifNot: 'pk_restored' },
    { t: 'furnace_glow', x: 18, y: 1, state: 1, if: 'pk_restored' },
    { t: 'memorial_plate_soft', x: MEMORIAL[0], y: MEMORIAL[1] - 2, dx: 8, dy: 10, ifNot: 'pk_restored' },
    { t: 'memorial_plate_flat', x: MEMORIAL[0] + 2, y: MEMORIAL[1] - 2, dx: 0, dy: 10, ifNot: 'pk_restored' },
    { t: 'memorial_plate_soft_lettered', x: MEMORIAL[0], y: MEMORIAL[1] - 2, dx: 8, dy: 10, if: 'pk_restored' },
    { t: 'memorial_plate_flat_lettered', x: MEMORIAL[0] + 2, y: MEMORIAL[1] - 2, dx: 0, dy: 10, if: 'pk_restored' },
  ],
  events,
  exits: [{ x: 19, y: 31, w: 2, h: 1, to: ['sand_road', 50, 7, 'left'] }],
  marks: {
    gate_in: [19, 30], gate_smith: [20, 29], square: [19, 17], coolant: [24, 17], memorial: [14, 15], memorial_smith: [16, 15],
    bell_tower: [4, 13], bell_rope: [5, 12], bellhouse_door: [6, 21], inn_door: [34, 13], smithy_door: [9, 29],
    foundry_door: [19, 6], east_road: [37, 15],
    crowd_a: [13, 16], crowd_b: [18, 15], crowd_c: [21, 15], crowd_d: [23, 19],
    gather_veyra: [9, 13], gather_ilya: [8, 13], gather_rusk: [10, 14], gather_bess: [7, 14], gather_garrick: [6, 13],
    restored_spot: [19, 16], night_view: [19, 11],
  },
  start: { x: 19, y: 30, dir: 'up' },
};
