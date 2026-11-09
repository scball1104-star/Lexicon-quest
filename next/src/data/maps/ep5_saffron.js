// Saffron Haven (44 x 34, town). EPISODE5_PLAN 4.3; exact cells in docs/MAPS_EP5_A.md section 4.
//
// A Dragon Quest town that reads at a glance on a phone around one image: the great golden armillary on the Armillary
// Tower, standing right over the oasis pool and its palms, with the copper-domed houses round them. A low sandstone wall
// (wall_sandstone) closes the town north, east and south; the south-west opens on the sea at the quay.
//   The north gate (21..22, 4): the nomad path runs up to the map edge, where the door north_door (21..22, 0) to the
//      Labyrinth's Oasis Gate appears with gnomon_get. gate_trig (the gap) runs sel_gate after star_reading_done. The
//      arrival from the Labyrinth (and the shaft's lift) is north_gate (21,5); every_road gathers the town here.
//   The northern market court (x 1..17, rows 5..13): Sel under her striped awning (sel_spot (8,10)), Nasrin by her bench
//      (nasrin_bench (11,10)), an indigo stall, a house and the dome house against the wall.
//   The Armillary Tower (24..28, 8..13, door (26,13)) with the armillary (decor, rows 5..8) on its roof; the oasis pool
//      (23..29, 15..17) in a ring of grass and palms below it: the three in one phone frame. North-east of the tower a dome house and the roof
//      terrace (36..42, 5..10, a parapet round it) where the town watches the sky in ep5_ending.
//   The Moonwell Caravanserai (rows 12..22): two arcades (11..16 and 31..36, rows 12..14) for the camels, the mural of
//      the seven wandering stars on the west arcade, packed loads (gone after haven_restored), the Moonwell (19..20, 18)
//      with Kamal behind it (moonwell (19,17)).
//   West: the Dune Lantern Rest (1..8, 15..21, door (4,21)). East: Saffron Caravan Supplies (37..41, 16..19, door (40,19))
//      with Yasmin's saffron stall outside. South-east: the Copperwind Smithy (30..34, 26..29, door (33,29)) with Hassan's
//      bell rack (28..29, 29) between it and the gate.
//   The south gate (21..22, 31): the arrival from the Caravan Road (south_gate (21,30)); the waystone (20,25) on the gate's
//      axis between a brass lamp (18,25) and Yasmin's mark, the first thing the party walks up to (E5-fixes B2), and the
//      Sandstone Bulletin (24..25, 28) by the gate; the exit at the map's south edge back to the road.
//   The quay (south-west, rows 25..27): the water stairs (4..5, 28) down to the boat (haven_boat (4..5, 29), present from
//      road_landed) that carries the party to Valewyn's south quay; Yara at the top of the stairs (water_stairs (7,27)),
//      her ship moored in the bay (decor).
// Tint dusk until haven_restored (the brass lamps lit), then none.
import { grid, box, put, rows, hash01, npc, door, sign, object, enter, trigger } from './_kit.js';

const W = 44, H = 34;
const g = grid(W, H, 'p');
const RES = 'haven_restored';

// ---------------------------------------------------------------- terrain
// outside the walls: dunes north and south, the nomad path and the south road
box(g, 0, 0, 43, 3, 'd'); box(g, 21, 0, 22, 3, 'p');
box(g, 13, 32, 43, 33, 'd'); box(g, 20, 32, 23, 33, 'p');
// the town wall (line16): north with the gate gap, west to the quay, east, south with the gate gap, the harbour wall
box(g, 0, 4, 43, 4, 'W'); put(g, 21, 4, 'p'); put(g, 22, 4, 'p');
box(g, 0, 5, 0, 24, 'W');
box(g, 43, 5, 43, 31, 'W');
box(g, 13, 31, 43, 31, 'W'); put(g, 21, 31, 'p'); put(g, 22, 31, 'p');
box(g, 13, 28, 13, 30, 'W');
// the sea in the south-west, the quay, the water stairs
box(g, 0, 28, 12, 33, 'w'); box(g, 0, 25, 0, 27, 'w');
put(g, 4, 28, 'S'); put(g, 5, 28, 'S');
// the oasis: a pool in a ring of grass under the tower
box(g, 22, 14, 30, 18, 'g'); box(g, 23, 15, 29, 17, 'w');
// gardens and sand drifts that break the paving
box(g, 1, 9, 3, 10, 'g'); box(g, 33, 22, 35, 24, 'g'); box(g, 11, 20, 13, 22, 'g');
// wind-blown sand along the foot of the walls
box(g, 7, 5, 11, 5, 'd'); box(g, 29, 5, 33, 5, 'd'); box(g, 42, 12, 42, 16, 'd'); box(g, 1, 11, 1, 13, 'd');
box(g, 35, 30, 42, 30, 'd'); box(g, 23, 30, 26, 30, 'd');
// the roof terrace's parapet (south and west sides, an opening at x 38)
box(g, 35, 5, 35, 11, 'W'); box(g, 35, 11, 42, 11, 'W'); put(g, 38, 11, 'p'); put(g, 39, 11, 'p');
const ground = rows(g.map((r) => r));

// ---------------------------------------------------------------- dressing
const overlays = [
  ...(() => {
    const out = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = ground[y][x];
      if (c === 'g' && hash01(x, y, 81) < 0.3) out.push({ t: ['flowers_yellow', 'flowers_red', 'tuft_0'][Math.floor(hash01(x, y, 82) * 3)], x, y });
      if (c === 'd' && hash01(x, y, 83) < 0.06) out.push({ t: 'pebbles_' + Math.floor(hash01(x, y, 84) * 3), x, y });
    }
    return out;
  })(),
];
const decor = [
  // the great buildings
  { t: 'tower_armillary', x: 24, y: 13 },               // door (26,13)
  { t: 'armillary', x: 25, y: 8 },                      // on the tower's roof (rows 5..8, all overhead)
  { t: 'inn_lantern', x: 1, y: 21 },                    // door (4,21)
  { t: 'shop_cloth', x: 37, y: 19 },                    // door (40,19)
  { t: 'smithy_copper', x: 30, y: 29 },                 // door (33,29)
  { t: 'arcade_serai', x: 11, y: 14 }, { t: 'arcade_serai', x: 31, y: 14 },
  { t: 'mural_stars', x: 12, y: 14 },                   // the seven wandering stars on the west arcade
  // houses (not enterable)
  { t: 'house_dome_b', x: 1, y: 8 }, { t: 'house_flat', x: 13, y: 8 }, { t: 'house_dome_a', x: 30, y: 9 },
  { t: 'house_dome_a', x: 14, y: 30 }, { t: 'house_dome_b', x: 36, y: 30 }, { t: 'house_flat', x: 40, y: 25 },
  // the market court
  { t: 'tent_omar', x: 7, y: 10 },                      // Sel's striped awning: poles (7,10) and (9,10), Sel between them
  { t: 'bench', x: 11, y: 9 },
  { t: 'stall_indigo', x: 2, y: 12 },
  { t: 'lamp_brass', x: 6, y: 7 }, { t: 'lamp_brass', x: 16, y: 11 }, { t: 'palm', x: 4, y: 7 },
  { t: 'water_jars', x: 12, y: 12 }, { t: 'cloth_bolts', x: 5, y: 12 },
  // the oasis and the caravanserai
  { t: 'palm', x: 22, y: 14 }, { t: 'palm', x: 30, y: 14 }, { t: 'palm', x: 22, y: 18 }, { t: 'palm', x: 30, y: 18 },
  { t: 'palm', x: 17, y: 20 }, { t: 'palm', x: 26, y: 20 },
  { t: 'camel_rest', x: 12, y: 16 }, { t: 'camel_stand', x: 34, y: 16 },
  { t: 'lamp_brass', x: 17, y: 16 }, { t: 'lamp_brass', x: 23, y: 19 }, { t: 'lamp_brass', x: 29, y: 19 },
  { t: 'water_jars', x: 21, y: 18 },
  // the east: Yasmin's stall outside her shop
  { t: 'stall_saffron', x: 37, y: 22 },
  { t: 'lamp_brass', x: 36, y: 18 },
  // the gate plaza: two caravans packed for the road and never gone (their loads are events, below)
  { t: 'lamp_brass', x: 18, y: 25 }, { t: 'lamp_brass', x: 25, y: 25 },
  { t: 'palm', x: 12, y: 21 }, { t: 'palm', x: 34, y: 23 }, { t: 'palm', x: 29, y: 26 },
  { t: 'tent_caravan', x: 15, y: 23 }, { t: 'camel_stand', x: 15, y: 25 },
  { t: 'tent_caravan', x: 26, y: 23 }, { t: 'camel_rest', x: 27, y: 25 },
  { t: 'rug_saffron', x: 22, y: 21 },
  // the roof terrace
  { t: 'rug_saffron', x: 37, y: 9 }, { t: 'water_jars', x: 42, y: 5 }, { t: 'lamp_brass', x: 36, y: 6 },
  // the quay
  { t: 'mooring_post', x: 2, y: 27 }, { t: 'mooring_post', x: 11, y: 27 },
  { t: 'crates_barrels', x: 8, y: 25 }, { t: 'barrel', x: 1, y: 25 },
  { t: 'ship_moored', x: 6, y: 33, state: 1 },          // the Saffron Wind in the bay, her sail set to dry
];

// ---------------------------------------------------------------- events
const events = [
  enter('haven_enter', 'haven_arrival'),
  enter('haven_every_road', 'every_road'),
  // doors (each interior's exit cell, facing up)
  door('door_inn', 4, 21, ['ep5_sh_inn', 10, 10, 'up']),
  door('door_shop', 40, 19, ['ep5_sh_shop', 7, 9, 'up']),
  door('door_smithy', 33, 29, ['ep5_sh_smithy', 8, 9, 'up']),
  door('door_tower', 26, 13, ['ep5_sh_observatory', 9, 12, 'up']),
  // the north gate: Sel's scene in the gap, the nomad path to the Labyrinth from gnomon_get
  trigger('gate_trig', 21, 4, 2, 1, 'sel_gate', { if: 'star_reading_done' }),
  door('north_door', 21, 0, ['ep5_lab_f1', 20, 27, 'up'], { w: 2, if: 'gnomon_get' }),
  sign('north_gate_sign', 23, 4, 'sign_ep5_north_gate'),
  // the quay: the boat to Valewyn's south quay, the ship
  { id: 'haven_boat', type: 'door', x: 4, y: 29, w: 2, to: ['ep4_valewyn', 32, 30, 'up'], kind: 'boat', sprite: 'boat', if: 'road_landed' },
  sign('water_stairs_sign', 2, 27, 'ep5_water_stairs'),
  sign('haven_ship_sign', 8, 28, 'ep5_ship_moored', { solid: false }),
  // the south gate: the waystone and the bulletin, each in two states
  object('waystone', 20, 25, 'waystone', { state: 0, text: 'ep5_waystone', ifNot: RES }),
  object('waystone_still', 20, 25, 'waystone', { state: 3, text: 'ep5_waystone', if: RES }),
  sign('bulletin', 24, 28, 'ep5_bulletin', { w: 2, sprite: 'bulletin', state: 0, ifNot: RES }),
  sign('bulletin_open', 24, 28, 'ep5_bulletin', { w: 2, sprite: 'bulletin', state: 1, if: RES }),
  // the caravanserai
  object('moonwell', 19, 18, 'moonwell', { w: 2, state: 0, script: 'moonwell', ifNot: 'moonwell_woken' }),
  object('moonwell_rest', 19, 18, 'moonwell', { w: 2, state: 1, script: 'moonwell', safe: true, rest: true, if: 'moonwell_woken' }),
  sign('mural_sign', 13, 14, 'ep5_mural'),
  sign('camels_sign', 12, 16, 'ep5_camels'),
  sign('camels_sign_b', 34, 16, 'ep5_camels'),
  object('loads_a', 14, 16, 'camel_load', { text: 'ep5_packed_loads', ifNot: RES }),
  object('loads_b', 15, 16, 'camel_load', { text: 'ep5_packed_loads', ifNot: RES }),
  object('loads_c', 32, 16, 'camel_load', { text: 'ep5_packed_loads', ifNot: RES }),
  object('loads_d', 18, 23, 'camel_load', { text: 'ep5_packed_loads', ifNot: RES }),
  object('loads_e', 25, 23, 'camel_load', { text: 'ep5_packed_loads', ifNot: RES }),
  object('loads_f', 29, 25, 'camel_load', { text: 'ep5_packed_loads', ifNot: RES }),
  sign('loads_marks', 14, 16, 'ep5_packed_loads', { solid: false, if: RES }),
  sign('loads_marks_b', 18, 23, 'ep5_packed_loads', { solid: false, if: RES }),
  sign('armillary_sign', 27, 13, 'ep5_armillary'),
  // Hassan's bells: empty hooks, then the three bells
  object('bell_rack', 28, 29, 'bell_rack', { w: 2, state: 0, text: 'ep5_bell_rack', ifNot: 'bells_done' }),
  object('bell_rack_full', 28, 29, 'bell_rack', { w: 2, state: 3, text: 'ep5_bell_rack', if: 'bells_done' }),
  // signs by the doors
  sign('sign_inn', 3, 21, 'sign_ep5_inn', { solid: false }),
  sign('sign_shop', 39, 19, 'sign_ep5_shop', { solid: false }),
  sign('sign_smithy', 32, 29, 'sign_ep5_smithy', { solid: false }),
  sign('sign_tower', 25, 13, 'sign_ep5_tower', { solid: false }),
  // NPCs (sprites, movement, presence and talk come from the pack's npcs.js)
  npc('sel', 8, 10, 'down'),
  npc('nasrin', 11, 10, 'down'),
  npc('kamal', 19, 17, 'down'),
  npc('yara', 7, 27, 'left'),
  npc('tamir', 9, 27, 'left'),
];

export default {
  id: 'ep5_saffron', name: 'Saffron Haven', area: 'town',
  music: 'saffron', ambience: 'desert_wind', tileset: 'town',
  // E5-fixes B2 (CRITIQUE_7 item 5): at dusk the town darkens a step round its lit brass lamps (their pools on the warm
  // paving, the pack's lamp lights), the lilac kept for the shade between them; the party carries no light of its own here
  lighting: { tint: [{ if: RES, id: 'none' }, { id: 'dusk' }], dark: 0, tintDark: { dusk: 0.24 }, partyLight: false },
  under: 'caravan_paving',
  legend: {
    'p': 'dune_court', 'd': 'dune_sand', 'g': 'grass', 'w': 'water', 'W': 'wall_sandstone', 'S': 'water_stair',
  },
  ground,
  overlays,
  decor,
  overhead: [],
  events,
  exits: [{ x: 21, y: 33, w: 2, h: 1, to: ['ep5_caravan_road', 50, 7, 'left'] }],
  marks: {
    // the south gate (haven_arrival)
    south_gate: [21, 30], waystone: [20, 25], bulletin: [24, 28], yasmin_gate: [21, 25],
    waystone_stage: [21, 27], waystone_stage_m: [20, 27], waystone_stage_b: [22, 27],
    // the market court (meet_sel)
    market: [6, 11], sel_spot: [8, 10], sel_stage: [8, 12], sel_stage_m: [7, 12], sel_stage_b: [9, 12], nasrin_bench: [11, 10],
    // the caravanserai (moonwell, every_road)
    moonwell: [19, 17], moonwell_stage: [19, 19], moonwell_stage_m: [18, 19], moonwell_stage_b: [20, 19], moonwell_sel: [18, 18],
    // doors
    inn_door: [4, 22], shop_door: [40, 20], smithy_door: [33, 30], tower_door: [26, 14],
    // the north gate (sel_gate, every_road)
    north_gate: [21, 5], gate_sel: [22, 5], gate_stage: [22, 7], gate_stage_m: [21, 7], gate_stage_b: [23, 7],
    gather_sel: [23, 5], gather_yara: [19, 8], gather_nasrin: [18, 8], gather_tamir: [19, 6],
    gather_trav_a: [18, 6], gather_trav_b: [20, 5],
    caravan_in: [21, 2], caravan_in_b: [22, 2], caravan_in_c: [22, 1],
    // the quay
    water_stairs: [7, 27], tamir_spot: [9, 27], dock: [4, 27],
    // the roof terrace (ep5_ending)
    // the tower, its armillary and the oasis in one frame (a camera mark for haven_arrival's first look, E5-fixes B2)
    armillary_view: [26, 11],
    roof_view: [30, 7], roof_stage: [39, 8], roof_stage_m: [38, 8], roof_stage_b: [40, 8],
    roof_laleh: [39, 6], roof_sel: [37, 6], roof_yara: [41, 6],
  },
  start: { x: 21, y: 30, dir: 'up' },
};
