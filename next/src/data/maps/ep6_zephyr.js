// Zephyr Landing (46 x 34, town). EPISODE6_PLAN 4.2; exact cells in docs/MAPS_EP6_A.md section 3.
//
// A Dragon Quest town that reads at a glance on a phone around one image: the board plaza on the central island (the
// Skyport Departure Board, Piri's post rack, the tied chimes), rope bridges out to the smaller islands, the docks on the
// north and east rims, and the dark storm knot on the north-east skyline (the storm_far decal, overhead, 26..33, 8..12, in
// the cloud gap just past the plaza's north-east corner), in one phone frame with the board from the board's mark (22,15).
//   The board plaza (15..30, 13..25): the board (21..23, 13..15, posts solid) with Bennet coiling line beside it
//      (bennet_spot (24,16)); Piri at his post rack (18..19, 15); the three chimes on brass posts (tied with black thread
//      until isles_restored, then ringing); Aeris Flight Provisions (26..30, 14..17, door (27,17)) on its east side; two
//      houses flank the head of the south stair.
//   The south stair (21..24, 26..33): the stone causeway up from the Airstair; the exit is its south edge (22..23, 33);
//      zephyr_arrival on the first enter (south_stair (22,32)).
//   The north dock (16..25, 3..9), over a rope bridge (20..21, 10..12): the Kestrel moored over the cloud north of it
//      (overhead, 17..22, 0..2), Aeris by the cargo net (aeris_net (19,6)). Its comfort lane N (column x 17, rows 10..12,
//      'v') drops the party onto the plaza at (17,13). north_dock (22,5) is where the Kestrel's door from the library lands.
//   The east rim (36..39, 5..24), over a rope bridge (31..35, 18..19): dock four (40..45, 9..12; Liora at liora_spot
//      (42,10), the berth's end gangway (45,10)); the east dock (40..45, 15..17; anchor_trig its whole column x 40, the
//      edge mira_lift (45,16)); the east airstair (40..45, 5..7) toward the storm, east_trig its column x 41 (after
//      anchor_learned) and the Windward Pass door (45, 5..7) to the Observatory from windward_pass. Comfort lane E (row 22,
//      x 31..35, '<') carries the party from the rim to the plaza at (30,22).
//   West: the Cloudhouse Inn island (2..12, 14..23, door (6,21)), over a rope bridge (13..14, 19..20).
//   North-west: the Signal Beacon tower island (2..13, 1..11, tower door (5,9)), over a rope bridge from the inn island
//      (6..7, 12..13). East of the tower its roof deck (8..13, 1..4, white spire stone), up a stone stair (10..11, 5..7):
//      the Signal Beacon (10..11, 1..3) dark until beacon_lit, then a rest and save object; the ending's roof marks.
//   South-west: the cloud gardens (2..11, 26..31; Thea), floating flower beds round them, over a rope bridge (6..7, 24..25).
//   South-east: the Galewing Workshop island (33..43, 27..32, door (38,31)), over a rope bridge from the rim (37..38, 25..26).
// wind: two one-way comfort lanes (N, E), no vane; the bridges always walk back.
import { grid, box, put, rows, hash01, sign, object, trigger, enter, npc, door, stoneStairs } from './_kit.js';

const W = 46, H = 34;
const g = grid(W, H, '~');
const RES = 'isles_restored';

// ---------------------------------------------------------------- terrain
// the board plaza and the south stair
box(g, 15, 13, 30, 25, 'k');
box(g, 21, 26, 24, 33, 'b');
// the north dock and its bridge
box(g, 16, 3, 25, 9, 'p');
box(g, 20, 10, 21, 12, 'w');
// the east rim, its bridge, dock four, the east dock, the east airstair
box(g, 36, 5, 39, 24, 'p');
box(g, 31, 18, 35, 19, 'w');
box(g, 40, 9, 45, 12, 'p');
box(g, 40, 15, 45, 17, 'p');
box(g, 40, 5, 45, 7, 'b');
// the inn island and its bridge
box(g, 2, 14, 12, 23, 'k');
box(g, 13, 19, 14, 20, 'w');
// the beacon tower island, its roof deck (a white stone plinth with a stair), the bridge down to the inn island
box(g, 2, 1, 13, 11, 'k');
box(g, 8, 1, 13, 4, 'q');
box(g, 8, 5, 13, 5, '%'); box(g, 8, 6, 13, 7, '!');
box(g, 6, 12, 7, 13, 'w');
// the cloud gardens and their bridge
box(g, 2, 26, 11, 31, 'g');
box(g, 6, 24, 7, 25, 'w');
// the workshop island and its bridge
box(g, 33, 27, 43, 32, 'k');
box(g, 37, 25, 38, 26, 'w');
const ground = rows(g.map((r) => r));

// ---------------------------------------------------------------- the wind: two comfort lanes
const L = grid(W, H, '.');
for (let y = 10; y <= 12; y++) put(L, 17, y, 'v');          // N: the north dock down to the plaza
for (let x = 31; x <= 35; x++) put(L, x, 22, '<');          // E: the east rim across to the plaza
const lanes = rows(L.map((r) => r));

// ---------------------------------------------------------------- dressing
const overlays = [
  ...stoneStairs(10, 11, 5), ...stoneStairs(10, 11, 6), ...stoneStairs(10, 11, 7),
];
const decor = [
  // skyflowers in the paving's cracks and on the garden grass (floor decor)
  ...(() => {
    const out = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = ground[y][x];
      if ((c === 'k' && hash01(x, y, 71) < 0.035) || (c === 'g' && hash01(x, y, 72) < 0.22)) out.push({ t: 'skyflowers', x, y });
    }
    return out;
  })(),
  // the great buildings
  { t: 'inn_cloudhouse', x: 3, y: 21 },                 // door (6,21)
  { t: 'tower_signal', x: 3, y: 9 },                    // door (5,9)
  { t: 'shop_aeris', x: 26, y: 17 },                    // door (27,17)
  { t: 'workshop_galewing', x: 36, y: 31 },             // door (38,31)
  // two houses flank the head of the south stair (not enterable)
  { t: 'house_sky_a', x: 16, y: 24 }, { t: 'house_sky_b', x: 25, y: 25 },
  // the board plaza
  { t: 'lamp_sky', x: 15, y: 13 }, { t: 'lamp_sky', x: 15, y: 20 }, { t: 'lamp_sky', x: 30, y: 24 },
  { t: 'lamp_sky', x: 20, y: 25 },
  { t: 'windstone', x: 25, y: 13 }, { t: 'rotor', x: 16, y: 18 },
  // the north dock: the Kestrel moored over the cloud north of it, the net of cargo, bollards, a windsock
  { t: 'kestrel', x: 17, y: 2 },
  { t: 'cargo_net', x: 17, y: 6 },
  { t: 'bollard', x: 25, y: 4 }, { t: 'bollard', x: 25, y: 8 }, { t: 'bollard', x: 16, y: 3 },
  { t: 'windsock', x: 24, y: 3 }, { t: 'crates_barrels', x: 23, y: 9 },
  { t: 'bridge_post', x: 19, y: 9 }, { t: 'bridge_post', x: 22, y: 9 },
  // the east rim: bollards on the docks, lamps, crates
  { t: 'bollard', x: 45, y: 9 }, { t: 'bollard', x: 45, y: 12 }, { t: 'bollard', x: 45, y: 15 },
  { t: 'lamp_sky', x: 39, y: 13 }, { t: 'lamp_sky', x: 36, y: 24 }, { t: 'crates_barrels', x: 36, y: 10 },
  { t: 'windsock', x: 40, y: 9 }, { t: 'cargo_net', x: 38, y: 23 },
  // bridge posts at the ends of the rope bridges
  { t: 'bridge_post', x: 12, y: 18 }, { t: 'bridge_post', x: 36, y: 20 }, { t: 'bridge_post', x: 36, y: 17 },
  { t: 'bridge_post', x: 5, y: 11 }, { t: 'bridge_post', x: 5, y: 26 }, { t: 'bridge_post', x: 39, y: 24 },
  // the inn island
  { t: 'lamp_sky', x: 2, y: 22 }, { t: 'lamp_sky', x: 11, y: 22 }, { t: 'bench', x: 9, y: 23 },
  // the beacon island: a lamp, a rotor, the windstone at the roof stair
  { t: 'lamp_sky', x: 9, y: 10 }, { t: 'rotor', x: 2, y: 2 }, { t: 'windstone', x: 13, y: 9 },
  // the cloud gardens: flower beds floating over the cloud round the grass, a windstone among the flowers
  { t: 'flower_bed', x: 0, y: 28 }, { t: 'flower_bed', x: 0, y: 31 }, { t: 'flower_bed', x: 12, y: 28 },
  { t: 'flower_bed', x: 12, y: 31 }, { t: 'flower_bed', x: 4, y: 33 }, { t: 'flower_bed', x: 8, y: 33 },
  { t: 'windstone', x: 9, y: 27 },
  // the workshop island
  { t: 'lamp_sky', x: 33, y: 31 }, { t: 'rotor', x: 43, y: 28 }, { t: 'crates_barrels', x: 41, y: 32 },
];
// the storm knot on the north-east skyline, over the cloud between the north dock, the plaza and the east rim: from the board's
// mark (22,15) the phone frame (24 x 13.5 tiles) holds the board, Piri, Bennet, the shop and the whole storm
const overhead = [
  { t: 'storm_far', x: 26, y: 8 },
];

// ---------------------------------------------------------------- events
const events = [
  enter('zephyr_enter', 'zephyr_arrival'),
  enter('zephyr_return', 'isles_return'),
  // doors (each interior's exit cell, facing up)
  door('door_inn', 6, 21, ['ep6_zl_inn', 10, 10, 'up']),
  door('door_shop', 27, 17, ['ep6_zl_shop', 7, 9, 'up']),
  door('door_workshop', 38, 31, ['ep6_zl_workshop', 8, 9, 'up']),
  door('door_tower', 5, 9, ['ep6_zl_charts', 9, 12, 'up']),
  // the board plaza: the board, the post rack, the chimes, each in its two states
  object('board', 21, 15, 'departure_board', { state: 0, text: 'ep6_board', w: 3, ifNot: RES }),
  object('board_landed', 21, 15, 'departure_board', { state: 3, text: 'ep6_board', w: 3, if: RES }),
  object('post_rack', 18, 15, 'post_rack', { text: 'ep6_post_rack', w: 2 }),
  object('chimes_a', 17, 20, 'chimes', { state: 0, text: 'ep6_chimes', ifNot: RES }),
  object('chimes_b', 27, 20, 'chimes', { state: 0, text: 'ep6_chimes', ifNot: RES }),
  object('chimes_c', 22, 23, 'chimes', { state: 0, text: 'ep6_chimes', ifNot: RES }),
  object('chimes_a_ring', 17, 20, 'chimes', { state: 1, text: 'ep6_chimes', if: RES }),
  object('chimes_b_ring', 27, 20, 'chimes', { state: 1, text: 'ep6_chimes', if: RES }),
  object('chimes_c_ring', 22, 23, 'chimes', { state: 1, text: 'ep6_chimes', if: RES }),
  sign('lane_n_sign', 16, 9, 'ep6_gust_lane', { solid: false }),
  sign('lane_e_sign', 36, 23, 'ep6_gust_lane', { solid: false }),
  // the north dock
  sign('kestrel_sign', 21, 3, 'ep6_kestrel', { solid: false }),
  sign('cloud_sign', 16, 8, 'ep6_cloudbank', { solid: false }),
  // the east rim: dock four, the east dock, the east airstair
  sign('dock_four_sign', 45, 11, 'ep6_dock_four', { solid: false }),
  trigger('anchor_trig', 40, 15, 1, 3, 'anchor_lesson', { if: 'charts_seen' }),
  trigger('east_trig', 41, 5, 1, 3, 'east_gate', { if: 'anchor_learned' }),
  sign('east_airstair_sign', 40, 7, 'sign_ep6_east_airstair', { sprite: 'signpost' }),
  door('east_airstair', 45, 5, ['ep6_obs_f1', 21, 27, 'up'], { h: 3, if: 'windward_pass' }),
  sign('storm_sign', 39, 5, 'ep6_storm_far', { solid: false }),
  // the beacon: before Suri asks, waiting for its witnesses, lit (a rest and save point)
  object('beacon_cold', 10, 3, 'beacon', { state: 0, w: 2, text: 'ep6_beacon', ifNot: 'beacon_started' }),
  object('beacon_ring', 10, 3, 'beacon', { state: 0, w: 2, script: 'beacon_light', text: 'ep6_beacon', if: 'beacon_started', ifNot: 'beacon_lit' }),
  object('beacon_rest', 10, 3, 'beacon', { state: 1, w: 2, script: 'beacon_light', text: 'ep6_beacon', safe: true, rest: true, if: 'beacon_lit' }),
  // signs by the doors, the gardens
  sign('sign_inn', 7, 22, 'sign_ep6_inn', { solid: false }),
  sign('sign_shop', 28, 18, 'sign_ep6_shop', { solid: false }),
  sign('sign_workshop', 39, 32, 'sign_ep6_workshop', { solid: false }),
  sign('sign_tower', 6, 10, 'sign_ep6_tower', { solid: false }),
  sign('garden_sign', 9, 26, 'ep6_cloud_garden', { solid: false }),
  // NPCs (sprites, movement, presence and talk come from the pack's npcs.js)
  npc('aeris', 19, 6, 'down'),
  npc('liora', 42, 10, 'down'),
  npc('bennet', 24, 16, 'left'),
  npc('piri', 17, 16, 'down'),
  npc('thea', 6, 28, 'down'),
  npc('pippa', 7, 10, 'down'),
];

export default {
  id: 'ep6_zephyr', name: 'Zephyr Landing', area: 'town',
  music: 'zephyr', ambience: 'sky_wind', tileset: 'town',
  lighting: { tint: 'none', dark: 0 },
  under: 'cloudbank',
  legend: {
    '~': 'cloudbank', 'k': 'skyport_paving', 'p': 'skyplank', 'b': 'skybridge', 'w': 'skywalk', 'g': 'grass',
    'q': 'spire_stone', '%': 'spire_top', '!': 'spire_face',
  },
  ground,
  wind: { kind: 'open', lanes },
  overlays,
  decor,
  overhead,
  events,
  exits: [{ x: 22, y: 33, w: 2, h: 1, to: ['ep6_airstair', 16, 1, 'down'] }],
  marks: {
    // the south stair and the board plaza (zephyr_arrival)
    south_stair: [22, 32], board: [22, 15], bennet_spot: [24, 16],
    board_stage: [22, 18], board_stage_m: [21, 18], board_stage_b: [23, 18],
    post_rack: [18, 16], piri_spot: [17, 16],
    crowd_a: [15, 22], crowd_b: [29, 19], crowd_c: [16, 14], crowd_d: [24, 21],
    // dock four (liora_dock, isles_return)
    dock_four: [44, 11], liora_spot: [42, 10], dock_stage: [42, 12], dock_stage_m: [41, 12], dock_stage_b: [43, 12],
    gangway: [45, 10], pippa_down: [43, 10],
    // the north dock (meet_aeris, isles_return)
    north_dock: [22, 5], aeris_net: [19, 6], net_stage: [19, 8], net_stage_m: [18, 8], net_stage_b: [20, 8],
    kestrel_rail: [20, 3], gift_aeris: [22, 6], home_stage: [22, 8], home_stage_m: [21, 8], home_stage_b: [23, 8],
    // the east dock (anchor_lesson)
    east_dock: [42, 16], aeris_east: [43, 15], anchor_stage: [43, 17], anchor_stage_m: [42, 17], anchor_stage_b: [44, 17],
    mira_lift: [45, 16], bram_spear: [45, 17],
    // the east airstair (east_gate)
    east_gate: [44, 6], aeris_gate: [43, 5], gate_stage: [43, 7], gate_stage_m: [42, 7], gate_stage_b: [44, 7],
    // doors
    inn_door: [6, 22], shop_door: [27, 18], workshop_door: [38, 32], tower_door: [5, 10],
    // the beacon (beacon_light) on the tower's roof deck; the ending on the same roof
    beacon_stage6: [10, 4], beacon_stage6_m: [9, 4], beacon_stage6_b: [11, 4],
    tower_roof: [9, 2], roof_view: [22, 12], roof_vex: [13, 2], roof_aeris: [8, 2],
    roof_stage: [12, 4], roof_stage_m: [11, 4], roof_stage_b: [13, 4], north_far: [24, 0],
    // the gardens, Pippa's place at home, the storm on the skyline
    gardens: [6, 28], pippa_tower: [7, 10], storm_far: [30, 10],
  },
  start: { x: 22, y: 32, dir: 'up' },
};
