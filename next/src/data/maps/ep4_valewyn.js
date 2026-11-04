// Valewyn (44 x 34, town). EPISODE4_PLAN 4.2; exact cells in docs/MAPS_EP4_A.md.
//
// A Dragon Quest town that reads at a glance on a phone, built around one image: the faceless crowned statue in a plaza of
// white marble and turquoise canals, with the drowned Keep's wall standing out of the water beyond the north moat.
//   The north (rows 0..7): the Keep's outer wall (causeway wall, rows 0..2) over the moat (rows 3..5); the Regent's Hall
//      (x 17..26, door (21,13)) backs onto the water; the north landing's jetty (29..30, 3..5) with Hale's boat, the
//      Keep ferry (keep_ferry_obj, then the boat door keep_boat to ep4_keep_f1 once keep_ferry_open). keep_landing (29,4)
//      is where every boat from the Keep lands.
//   The Drowned Crown Plaza (x 13..30, rows 14..25): the statue (20..22, 18..19), the flood board (25..26, 19) in its
//      three states, sandbags, lamps, benches; the two council switches by the canal (from witnesses_started); the shelter
//      tent with a rest point (council_shelter).
//   West: the Floodwatch Inn (door (5,18)). East, across the east canal (bridges at rows 6..7 and 15..16): the canal works
//      with the great lock and Joss (canal_works (39,12)), the Riverbank Provisioner (door (38,17)), the Crown Guard Forge
//      (door (39,24)).
//   The south canal (rows 26..27, bridges at x 20..22 and 35..37), the south quay and the ferry landing: ferry_in (21,32)
//      on the jetty, the boat door ferry_back (21..22,33) to the Flood Road.
//   The river quarter (south-west, x 0..12, rows 19..33): streets under water (terrain patches of tide_water, ifNot
//      vw_restored) with roofs and chimneys standing out of it; after vw_restored the patches lift, the cobbles show and
//      the houses stand (gated objects), and the district can be walked.
// Flags: banner sub, tint and rain follow vw_restored (rain: `weather` with `weatherIf`, see MAPS_EP4_A.md: E4-world reads
// it, the core field does not).
import { grid, box, put, rows, scatter, hash01, npc, door, sign, object, enter, pot, bridgeV } from './_kit.js';

const W = 44, H = 34;
const g = grid(W, H, 'm');
const RES = 'vw_restored';

// ---------------------------------------------------------------- terrain
box(g, 0, 0, 43, 0, 'K'); box(g, 0, 1, 43, 2, 'k');      // the Keep's outer wall, drowned to its tide marks
box(g, 0, 3, 43, 5, '~');                                 // the moat
box(g, 16, 6, 27, 7, '~');                                // the Hall backs onto the water (its roof overhangs it)
// the east canal (x 32..33) from the moat to the south canal, the south canal (rows 26..27), the river (rows 31..33)
box(g, 32, 6, 33, 27, '~');
box(g, 0, 26, 43, 27, '~');
box(g, 0, 31, 43, 33, '~');
// cobbled back streets and the plaza's cobble border; the plaza itself is marble
box(g, 0, 6, 15, 12, 'c'); box(g, 28, 6, 31, 13, 'c');
box(g, 34, 6, 43, 25, 'c');
box(g, 0, 28, 43, 30, 'c');
box(g, 12, 13, 31, 25, 'c'); box(g, 14, 14, 30, 24, 'm');
box(g, 19, 13, 23, 13, 'm');                              // the Hall's steps
box(g, 15, 17, 17, 18, 'g'); box(g, 28, 17, 29, 18, 'g');   // flower beds either side of the statue
// gardens (flood grass) with willows, at the corners
box(g, 10, 6, 15, 11, 'g'); box(g, 40, 6, 43, 8, 'g'); box(g, 40, 18, 43, 22, 'g'); box(g, 36, 28, 43, 30, 'g');
// the river quarter: wet cobbles under water until vw_restored (the patches are overlays, below)
box(g, 0, 19, 13, 25, 'c'); box(g, 0, 28, 17, 30, 'c');
const ground = rows(g.map((r) => r));

// the flooded river quarter: tide_water terrain patches over its streets while not vw_restored
const QUARTER = [];
for (let y = 21; y <= 30; y++) for (let x = 0; x <= 17; x++) {
  if (y >= 26 && y <= 27) continue;                       // the canal is water anyway
  if (y <= 25 && x > 12) continue;
  QUARTER.push([x, y]);
}

// ---------------------------------------------------------------- dressing
const marbleBridgeH = (x0, x1, y) => {
  const out = [];
  const end = (x) => (x === x0 ? 'l' : x === x1 ? 'r' : 'm');
  for (let x = x0; x <= x1; x++) {
    out.push({ t: `bridge_marble_h_n_${end(x)}`, x, y }, { t: `bridge_marble_h_s_${end(x)}`, x, y: y + 1 }, { t: `bridge_marble_h_arch_${end(x)}`, x, y: y + 2 });
  }
  return out;
};
const overlays = [
  ...scatter(ground, ['c'], ['pebbles_0', 'pebbles_1'], 0.05, 71, [13, 6, 43, 30]),
  ...scatter(ground, ['g'], ['flowers_blue', 'flowers_white', 'tuft_0', 'tuft_1'], 0.3, 72),
  ...scatter(ground, ['m'], ['leaves'], 0.02, 73),
  // bridges over the east canal (north quay, mid) and the south canal (to the ferry, to the south-east)
  ...marbleBridgeH(31, 34, 6), ...marbleBridgeH(31, 34, 15),
  ...bridgeV(20, 26, 27, 'marble'), ...bridgeV(35, 26, 27, 'marble'),
  // the north jetty and the ferry jetty (wood)
  ...bridgeV(29, 3, 5, 'wood'), ...bridgeV(21, 31, 33, 'wood'),
  // the river quarter under water
  ...QUARTER.map(([x, y]) => ({ t: 'tide_water', x, y, ifNot: RES })),
  // flower boxes and planters in the plaza
  { t: 'hydrangea_blue', x: 14, y: 14 }, { t: 'hydrangea_blue', x: 30, y: 14 }, { t: 'hydrangea_violet', x: 14, y: 24 }, { t: 'hydrangea_violet', x: 30, y: 24 },
];
const decor = [
  { t: 'regent_hall', x: 17, y: 13 },                     // door (21,13)
  { t: 'inn_flood', x: 1, y: 18 },                        // door (5,18)
  { t: 'shop_river', x: 35, y: 17 },                      // door (38,17)
  { t: 'forge_crown', x: 35, y: 24 },                     // door (39,24)
  { t: 'house_vw_b', x: 2, y: 11 }, { t: 'house_vw_a', x: 28, y: 13 },
  // the plaza
  { t: 'sandbags', x: 15, y: 25 }, { t: 'sandbags', x: 26, y: 25 }, { t: 'sandbag', x: 19, y: 25 }, { t: 'sandbag', x: 23, y: 25 },
  { t: 'sandbags', x: 24, y: 14 }, { t: 'sandbag', x: 17, y: 21 },
  ...[[13, 21], [13, 22], [13, 24], [13, 25], [0, 21], [6, 21], [11, 21], [12, 21]].map(([x, y]) => ({ t: 'sandbag', x, y })),   // the quarter's edge (gaps at (13,23), (1,21), (6..10,21 between the houses))
  { t: 'lamp_post', x: 16, y: 16 }, { t: 'lamp_post', x: 27, y: 16 }, { t: 'lamp_post', x: 16, y: 23 }, { t: 'lamp_post', x: 27, y: 23 },
  { t: 'bench', x: 17, y: 15 }, { t: 'bench', x: 25, y: 15 },
  { t: 'mooring_post', x: 18, y: 25 }, { t: 'mooring_post', x: 24, y: 25 }, { t: 'mooring_post', x: 28, y: 5 }, { t: 'mooring_post', x: 23, y: 30 },
  { t: 'mooring_post', x: 31, y: 5 }, { t: 'mooring_post', x: 19, y: 30 },
  // gardens and edges
  { t: 'tree_willow', x: 11, y: 9 }, { t: 'tree_willow', x: 41, y: 21 }, { t: 'tree_willow', x: 40, y: 30 },
  { t: 'bush', x: 15, y: 17 }, { t: 'bush', x: 17, y: 17 }, { t: 'bush', x: 29, y: 17 },
  // the Keep's drowned outbuildings in the moat
  { t: 'roof_drowned_b', x: 4, y: 4 }, { t: 'chimney_drowned', x: 9, y: 3 }, { t: 'roof_drowned_a', x: 38, y: 4 }, { t: 'chimney_drowned', x: 42, y: 5 },
  { t: 'bush', x: 14, y: 11 }, { t: 'bush', x: 40, y: 7 }, { t: 'bush', x: 43, y: 18 }, { t: 'bush', x: 30, y: 30 },
  { t: 'crates_barrels', x: 40, y: 12 }, { t: 'barrel', x: 37, y: 9 }, { t: 'crate', x: 34, y: 25 },
  { t: 'crates_barrels', x: 26, y: 29 }, { t: 'barrel', x: 12, y: 18 }, { t: 'barrel', x: 30, y: 28 },
];
// the river quarter's houses: roofs in the flood, whole houses after vw_restored
const quarter = [
  object('roof_q1', 3, 22, 'roof_drowned_b', { text: 'ep4_drowned_roofs', ifNot: RES }),
  object('roof_q2', 8, 23, 'roof_drowned_a', { text: 'ep4_drowned_roofs', ifNot: RES }),
  object('roof_q3', 4, 30, 'roof_drowned_a', { text: 'ep4_drowned_roofs', ifNot: RES }),
  object('chimney_q1', 1, 22, 'chimney_drowned', { text: 'ep4_drowned_roofs', ifNot: RES }), object('chimney_q2', 15, 29, 'chimney_drowned', { text: 'ep4_drowned_roofs', ifNot: RES }),
  object('house_q1', 2, 24, 'house_vw_a', { text: 'ep4_drowned_roofs', if: RES }),
  object('house_q2', 7, 24, 'house_vw_a', { text: 'ep4_drowned_roofs', if: RES }),
  // south of the canal the quarter is a strip of quay: a boat shed's roof in the flood, its sheds' crates after
  object('shed_q3', 4, 29, 'crates_barrels', { text: 'ep4_drowned_roofs', if: RES }), object('shed_q4', 12, 29, 'crate', { text: 'ep4_drowned_roofs', if: RES }),
];

// ---------------------------------------------------------------- events
const events = [
  enter('vw_enter', 'vw_arrival'),
  enter('vw_crown_enter', 'crown_remembers'),
  // doors (the interior's exit cell, facing up)
  door('door_vw_palace', 21, 13, ['ep4_vw_palace', 9, 12, 'up']),
  door('door_vw_inn', 5, 18, ['ep4_vw_inn', 10, 10, 'up']),
  door('door_vw_shop', 38, 17, ['ep4_vw_shop', 7, 9, 'up']),
  door('door_vw_forge', 39, 24, ['ep4_vw_forge', 8, 9, 'up']),
  // the ferry landing (south) and the north landing (the Keep)
  door('ferry_back', 21, 33, ['ep4_flood_road', 48, 16, 'left'], { w: 2, kind: 'boat', sprite: 'boat' }),
  object('keep_ferry_obj', 29, 3, 'boat', { w: 2, script: 'keep_ferry', text: 'ep4_drowned_bell', ifNot: 'keep_ferry_open' }),
  door('keep_boat', 29, 3, ['ep4_keep_f1', 19, 27, 'up'], { w: 2, kind: 'boat', sprite: 'boat', if: 'keep_ferry_open' }),
  sign('drowned_bell', 31, 4, 'ep4_drowned_bell'),
  // the plaza
  object('statue', 20, 19, 'statue_faceless', { script: 'vw_statue' }),
  sign('statue_plaque', 23, 19, 'ep4_inscription', { sprite: 'signboard' }),
  sign('flood_board_wet', 25, 19, 'ep4_flood_board', { sprite: 'flood_board', state: 0, ifNot: 'vw_arrived' }),
  sign('flood_board', 25, 19, 'ep4_flood_board', { sprite: 'flood_board', state: 1, if: 'vw_arrived', ifNot: RES }),
  sign('flood_board_blank', 25, 19, 'ep4_flood_board', { sprite: 'flood_board', state: 2, if: RES }),
  object('switch_shelter', 16, 24, 'switch_off', { script: 'council_choice', text: 'ep4_council_switches', if: 'witnesses_started', ifNot: 'council_shelter' }),
  object('switch_shelter_on', 16, 24, 'switch_on', { script: 'council_choice', text: 'ep4_council_switches', if: 'council_shelter' }),
  object('switch_records', 26, 24, 'switch_off', { script: 'council_choice', text: 'ep4_council_switches', if: 'witnesses_started', ifNot: 'council_records' }),
  object('switch_records_on', 26, 24, 'switch_on', { script: 'council_choice', text: 'ep4_council_switches', if: 'council_records' }),
  object('vw_shelter', 14, 21, 'market_stall_cloth', { text: 'ep4_shelter', safe: true, rest: true, if: 'council_shelter' }),
  sign('sandbags_sign', 15, 25, 'ep4_sandbags'),
  sign('canal_sign', 22, 25, 'ep4_canal', { solid: false }),
  // the canal works
  object('great_lock', 34, 10, 'great_lock', { state: 0, text: 'ep4_great_lock', ifNot: RES }),
  object('great_lock_open', 34, 10, 'great_lock', { state: 1, text: 'ep4_great_lock', if: RES }),
  // signs beside the doors
  sign('sign_ep4_inn', 4, 18, 'sign_ep4_inn', { solid: false }),
  sign('sign_ep4_shop', 37, 17, 'sign_ep4_shop', { solid: false }),
  sign('sign_ep4_forge', 38, 24, 'sign_ep4_forge', { solid: false }),
  sign('sign_ep4_palace', 20, 13, 'sign_ep4_palace', { solid: false }),
  // the river quarter
  sign('drowned_roofs', 13, 23, 'ep4_drowned_roofs', { solid: false, ifNot: RES }),
  ...quarter,
  // NPCs (sprites, movement, presence and talk come from the pack's npcs.js)
  npc('vance', 26, 20, 'down'),
  npc('ada', 27, 19, 'left'),
  npc('joss', 37, 11, 'left'),
  npc('sori', 39, 8, 'left'),
  pot('pot_vw_inn', 8, 19, { item: 'hi_potion' }), pot('pot_vw_forge', 41, 25, { gold: 120 }), pot('pot_vw_quay', 13, 7, { item: 'lamp_oil' }),
];

export default {
  id: 'ep4_valewyn', name: 'Valewyn', area: 'town',
  music: 'valewyn',
  ambience: 'canal_rain',
  tileset: 'town',
  lighting: { tint: [{ if: RES, id: 'none' }, { id: 'flood_grey' }], dark: 0 },
  weather: 'rain', weatherIf: { ifNot: RES },
  under: 'marble_walk',
  legend: {
    'm': 'marble_walk', 'c': 'plaza', 'g': 'flood_grass', '~': 'tide_water', 'K': 'causeway_top', 'k': 'causeway_face',
  },
  ground,
  overlays,
  decor,
  overhead: [],
  events,
  exits: [],
  marks: {
    ferry_in: [21, 32], plaza: [21, 22], statue: [21, 20], board: [25, 20], palace_door: [21, 14], inn_door: [5, 19],
    shop_door: [38, 18], forge_door: [39, 25], canal_works: [35, 11], keep_landing: [29, 4],
    crowd_a: [18, 22], crowd_b: [20, 23], crowd_c: [23, 23], crowd_d: [25, 22],
    gather_lyra: [22, 20], gather_hale: [23, 21], gather_joss: [19, 21], gather_vance: [27, 21], night_view: [21, 16],
  },
  start: { x: 21, y: 32, dir: 'up' },
};
