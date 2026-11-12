// Palehaven (46 x 36, town). EPISODE7_PLAN 4.3; exact cells, edge distances and states in docs/MAPS_EP7_A.md 4.
//
// A Dragon Quest town that reads at a glance on a phone around one image: the frost-mosaic square with the cold Returning
// Hearth in the middle (22..23, 17..19), six iced doors round it, the Keeper's Watch at the north end (18..22, 6..11, door
// (21,11)) and, over the pine rampart, the frozen cathedral flickering on the skyline (the cathedral_far decal, overhead,
// 28..34, 0..5).
//   The south gate (an ice arch, 21..25, 32..35; the exit is the passage's row y 35) and the avenue up to the square: Bryn at
//      bryn_gate (25,26), the party staged on gate_stage (25,28) for palehaven_arrival.
//   The square (frostmosaic 13..32, 13..25): the hearth in four states (cold; waiting for its witnesses once hearth_started;
//      lit, a rest and save, from hearth_lit; lit by itself from doors_reopened), the Vanishing Mark (26,16) and the Northward
//      Beacon (18,15) in their states, aurora crystals at the corners. Eira at hearth_w (20,18).
//   The six iced doors (two objects each: iced, then open with the name back from doors_reopened): iced_a (15,12) and
//      iced_b (25,12) flank the Watch, iced_c (4,23) west, iced_d (38,24) east, iced_e (13,30) and iced_f (31,30) south.
//   The north end: the Keeper at keeper_lamp (24,12) by her lamp, Torr on the Watch steps (19,12) with his book, the north
//      gate in the pine rampart (an ice arch, 29..33, 5..8; its passage closed by an iron grille until vault_open), vault_trig
//      in front of it, and through it the walk to the cathedral's foot: the Vault door (32,6) to ep7_vault_f1 basin and, from
//      doors_reopened, the nave door (30,6) to ep7_stillheart roof.
//   West: the Thawlight Lodge (3..9, 11..16, door (6,16)) and Mirael's house (3..7, 27..30; Mirael at her door). East:
//      Northwind Provisions (36..40, 14..17, door (37,17)) and the Glass-Ice Armory (35..40, 28..31, door (37,31)).
// No foes in town. Every focus mark of STAGING_EP7 sits inside x 12..33, y 7..28 (the camera rule).
import { grid, box, put, rows, sign, trigger, enter, npc, door, object, book } from './_kit.js';

const W = 46, H = 36;
const g = grid(W, H, 's');
const REO = 'doors_reopened';

// ---------------------------------------------------------------- terrain
box(g, 2, 9, 43, 31, 'k');               // the streets (ice-blue brick)
box(g, 21, 32, 25, 35, 'k');             // the avenue through the south gate
box(g, 13, 13, 32, 25, 'm');             // the square
// the ice rampart across the north: the beyond (0..5), its band (6) and its two-row face (7..8), one passage (30..32)
box(g, 0, 0, W - 1, 5, 'v');
box(g, 0, 6, W - 1, 6, '#');
box(g, 0, 7, W - 1, 8, '|');
box(g, 30, 6, 32, 8, 'k');
const ground = rows(g.map((r) => r));

// ---------------------------------------------------------------- dressing
// pines in the snow beyond the rampart and round the town's other edges
const PINES = [
  [1, 4], [5, 3], [9, 5], [13, 2], [17, 4], [22, 3], [25, 5], [36, 3], [40, 5], [43, 2],
  [0, 13], [0, 19], [0, 25], [0, 31], [44, 13], [44, 19], [44, 26], [44, 32],
  [3, 34], [8, 33], [13, 34], [17, 33], [28, 34], [33, 33], [38, 34], [42, 35],
];
const decor = [
  ...PINES.map(([x, y]) => ({ t: 'snowpine', x, y })),
  // the great buildings
  { t: 'keepers_watch', x: 18, y: 11 },          // door (21,11)
  { t: 'lodge_thawlight', x: 3, y: 16 },         // door (6,16)
  { t: 'shop_northwind', x: 36, y: 17 },         // door (37,17)
  { t: 'armory_glassice', x: 35, y: 31 },        // door (37,31)
  // the houses of the iced doors, and Mirael's
  { t: 'house_snow_b', x: 12, y: 12 },           // door (15,12): iced_a
  { t: 'house_snow_a', x: 25, y: 12 },           // door (25,12): iced_b
  { t: 'house_snow_a', x: 4, y: 23 },            // door (4,23): iced_c
  { t: 'house_snow_b', x: 35, y: 24 },           // door (38,24): iced_d
  { t: 'house_snow_a', x: 13, y: 30 },           // door (13,30): iced_e
  { t: 'house_snow_b', x: 28, y: 30 },           // door (31,30): iced_f
  { t: 'house_snow_b', x: 3, y: 30 },            // Mirael's (door (6,30))
  // the two ice arches
  { t: 'icegate', x: 21, y: 35 },                // the south gate
  { t: 'frostfire', x: 33, y: 9 },               // the north gate's brazier
  { t: 'crystal', x: 31, y: 6 },                 // between the two doors at the cathedral's foot
  // the square: aurora crystals, frostfire braziers, the Keeper's lamp
  { t: 'crystal', x: 13, y: 14 }, { t: 'crystal', x: 32, y: 14 }, { t: 'crystal', x: 13, y: 25 }, { t: 'crystal', x: 32, y: 25 },
  { t: 'frostfire', x: 17, y: 20 }, { t: 'frostfire', x: 28, y: 20 },
  { t: 'frostfire', x: 24, y: 11 },              // the lamp the Keeper lights by hand
  { t: 'crystal', x: 20, y: 31 }, { t: 'crystal', x: 26, y: 31 },
  { t: 'snowbank', x: 9, y: 20 }, { t: 'snowbank', x: 40, y: 21 }, { t: 'snowbank', x: 18, y: 28 }, { t: 'snowbank', x: 34, y: 12 },
];
const overhead = [
  { t: 'cathedral_far', x: 28, y: 0 },          // the frozen cathedral beyond the pines (flickers: 2 frames)
];
// the north gate's iron grille, until the Keeper unlocks it (vault_gate)
const overlays = [30, 31, 32].map((x) => ({ t: 'fence_iron', x, y: 8, ifNot: 'vault_open' }));

// ---------------------------------------------------------------- events
const ICED = [['iced_a', 15, 12], ['iced_b', 25, 12], ['iced_c', 4, 23], ['iced_d', 38, 24], ['iced_e', 13, 30], ['iced_f', 31, 30]];
const events = [
  // scenes on arrival: the first time through the south gate; the square after the Stillheart; doors_reopen after a reload
  enter('palehaven_enter', 'palehaven_arrival'),
  { ...enter('square_page', 'whole_page'), if: 'stillheart_restored', ifNot: 'page_whole' },
  { ...enter('square_doors', 'doors_reopen'), if: 'page_whole', ifNot: REO },
  // doors (each interior's exit cell, facing up)
  door('door_watch', 21, 11, ['ep7_ph_watch', 9, 10, 'up']),
  door('door_inn', 6, 16, ['ep7_ph_inn', 10, 10, 'up']),
  door('door_shop', 37, 17, ['ep7_ph_shop', 7, 9, 'up']),
  door('door_armory', 37, 31, ['ep7_ph_armory', 8, 9, 'up']),
  // the hearth: cold, waiting for its witnesses, lit (a rest and save), lit by the doors' morning
  object('hearth', 22, 19, 'returning_hearth', { state: 0, text: 'ep7_hearth_cold', ifNot: ['hearth_started', 'hearth_lit', REO] }),
  object('hearth_ring', 22, 19, 'returning_hearth', { state: 0, text: 'ep7_hearth_cold', script: 'hearth_light', if: 'hearth_started', ifNot: ['hearth_lit', REO] }),
  object('hearth_lit', 22, 19, 'returning_hearth', { state: 1, text: 'ep7_hearth_cold', script: 'hearth_light', safe: true, rest: true, if: 'hearth_lit' }),
  object('hearth_dawn', 22, 19, 'returning_hearth', { state: 1, text: 'ep7_hearth_cold', safe: true, rest: true, if: REO, ifNot: 'hearth_lit' }),
  { id: 'hearth_glow', type: 'light', x: 22, y: 18, r: 5, if: 'hearth_lit' },
  { id: 'hearth_glow_dawn', type: 'light', x: 22, y: 18, r: 5, if: REO, ifNot: 'hearth_lit' },
  // the Vanishing Mark, the Northward Beacon, a crystal
  object('vanishing_mark', 26, 16, 'vanishing_mark', { state: 0, text: 'ep7_vanishing_mark', ifNot: REO }),
  object('vanishing_mark_filled', 26, 16, 'vanishing_mark', { state: 1, text: 'ep7_vanishing_mark', if: REO }),
  object('beacon_north', 18, 15, 'auroraobelisk', { text: 'ep7_beacon_north' }),
  sign('crystal_sign', 32, 14, 'ep7_aurora_crystal'),
  // the six iced doors
  ...ICED.flatMap(([id, x, y]) => [
    object(id, x, y, 'iced_door', { state: 0, text: 'ep7_iced_door', ifNot: REO }),
    object(`${id}_open`, x, y, 'iced_door', { state: 1, text: 'ep7_iced_door', if: REO }),
  ]),
  // the Watch: its board, the Keeper's notice, Torr's book on the steps
  sign('sign_watch', 20, 11, 'sign_ep7_watch'),
  sign('keeper_notice', 22, 11, 'ep7_keeper_notice'),
  book('streets_book', 18, 12, 'missing_streets', { solid: false }),
  // the north gate: the grille (closed), the arch, the cathedral; the Vault and the nave beyond
  trigger('vault_trig', 30, 9, 3, 1, 'vault_gate', { if: 'keeper_told', ifNot: 'vault_open' }),
  sign('vault_gate_obj', 31, 8, 'ep7_vault_gate', { ifNot: 'vault_open' }),
  sign('vault_gate_open', 33, 9, 'ep7_vault_gate', { if: 'vault_open' }),
  sign('cathedral_sign', 29, 8, 'ep7_cathedral_far'),
  door('vault_door', 32, 6, ['ep7_vault_f1', 20, 27, 'up'], { if: 'vault_open' }),
  door('nave_door', 30, 6, ['ep7_stillheart', 16, 15, 'up'], { if: REO }),
  // signs by the doors
  sign('sign_inn', 7, 16, 'sign_ep7_inn'),
  sign('sign_shop', 38, 17, 'sign_ep7_shop'),
  sign('sign_armory', 36, 31, 'sign_ep7_armory'),
  // NPCs (sprites, movement, presence and talk come from the pack's npcs.js)
  npc('keeper', 24, 12, 'left'),
  npc('bryn', 25, 26, 'down'),
  npc('eira', 20, 18, 'right'),
  npc('torr', 19, 12, 'down'),
  npc('mirael', 7, 31, 'down'),
];

export default {
  id: 'ep7_palehaven', name: 'Palehaven', area: 'town',
  music: 'palehaven', ambience: 'snow_wind', tileset: 'town',
  lighting: { tint: 'none', dark: 0 },
  under: 'icebrick',
  legend: { 's': 'snowfield', 'k': 'icebrick', 'm': 'frostmosaic', '#': 'icewall_top', '|': 'icewall_face', 'v': 'icewall_out_top' },
  ground,
  overlays,
  decor,
  overhead,
  events,
  exits: [{ x: 22, y: 35, w: 3, h: 1, to: ['ep7_white_road', 16, 12, 'down'] }],
  marks: {
    // the south gate (palehaven_arrival)
    south_gate: [23, 34], bryn_gate: [25, 26], gate_stage: [25, 28], gate_stage_m: [24, 28], gate_stage_b: [26, 28],
    // the square (palehaven_arrival, whole_page, doors_reopen, hearth_light)
    hearth: [22, 18], hearth_n: [22, 16], hearth_s: [22, 21], hearth_s_m: [21, 21], hearth_s_b: [23, 21],
    hearth_w: [20, 18], hearth_e: [25, 18], aeris_square: [26, 21], vex_run: [33, 21], vex_square: [25, 20],
    iced_a: [15, 13],
    crowd_a: [16, 17], crowd_b: [29, 17], crowd_c: [16, 22], crowd_d: [29, 22], crowd_e: [19, 24], crowd_f: [27, 24],
    // the north end (meet_keeper, vault_gate)
    keeper_lamp: [24, 12], keeper_stage: [24, 14], keeper_stage_m: [23, 14], keeper_stage_b: [25, 14],
    watch_door: [21, 12], torr_steps: [19, 12],
    vault_gate: [31, 8], gate_keeper: [31, 10], gate_keeper_back: [34, 11], vex_step: [33, 10],
    north_gate_stage: [31, 12], north_gate_stage_m: [30, 12], north_gate_stage_b: [32, 12],
    vault_door: [31, 7], nave_door: [30, 7], cathedral_far: [31, 2],
    // the doors
    inn_door: [6, 17], shop_door: [37, 18], armory_door: [37, 32], mirael_door: [7, 31],
  },
  start: { x: 23, y: 34, dir: 'up' },
};
