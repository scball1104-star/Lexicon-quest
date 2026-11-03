// The Ashen Foundry, III: The Heartforge Crucible (44 x 32, dungeon, dark 0.5). EPISODE3_PLAN 4.6.
//
// Three wings, three anvils, one gate. The slag is the light (the field puts a light on every second molten cell; crust
// gives none, so cooling a pool darkens it). Areas:
//   Hub (16..27, 14..21): the stair up from F2 lands at (17,21). The Bell Gate (20..22, 13: a gate whose sources are the
//      three oath flags, its sockets lighting as each lands), the Smelter Proclamation cast beside it, lift_f3_short
//      (25,13) up to F1's landing once foundry_f3_arrived. West to the Hand, east to the Heart, south to the Home.
//   West, the Hand (3..13, 4..22): a slag lake in three pools and two islands. The cistern on the east shore (13,14) pours
//      down to sl_h1 (13,17). Start '\': it splashes into the passage to the hub (14,17). Turned '/': WEST across pool 1
//      (10..11, the whole height) to the island and sl_h2 (8,17). sl_h2 start '/': SOUTH across pool 3 (20..21) to the
//      south bank (an iron chest); turned '\': NORTH across pool 2 (9..11) to the north bank and anvil_hand. Order is
//      forced by reach (pool 1 first); no answer is wrong. Two groups.
//   East, the Heart (30..41): three chambers stacked north, each darker. H1 (rows 17..23): the spout (32,16) pours to
//      sl_k1 (32,21); start '/' splashes on the west wall; '\' runs east across H1's slag pool (37..38, 19..23: the room
//      goes dark as it cools) into bs_k1 (40,21), which cools hg_k1 (33,16). H2 (rows 11..14): the spout (31,10) to
//      sl_k2 (31,13); '\' crosses the slag band (35..37) into bs_k2 (39,13), cooling hg_k2 (38,10). H3 (rows 4..7): the
//      hottest furnace's mouth in the north face (40,3) with vex_trig in front of it and the feather, and anvil_heart.
//      Two groups.
//   South, the Home (10..33, 26..30): the spout (14,25) pours into the junction (14,27). Its short branch runs straight on
//      into a pool that does nothing (13..15, 30). Bram shoves the ore crate (16,28) west twice into that branch (14,28):
//      dammed, the water turns east and runs the long way along row 27 to the slag ring round the anvil island (28..32,
//      26..30), which cools: anvil_home. Lantern secret: Keeper ink on the north face (10,24) beside a hidden ink bridge
//      (9,28) west into the Keeper's cache: the gold chest with the Tempered Lexicon Blade. One group.
//   The Gate Antechamber (17..26, 5..10): behind the Bell Gate. bram_memory_3 runs on gate_trig (the cells in front of
//      the gate, once all three oaths are struck), the cistern font, the Crucible Hook door door_heart (20..22, 4) up to
//      the Heartforge, a wood chest (Quench Flasks).
// Solution for the bot: Hand: turn sl_h1 ('/'), cross to the island, turn sl_h2 ('\'), cross north, strike anvil_hand
// (south bank chest: before turning sl_h2). Heart: turn sl_k1 ('\'), through hg_k1, turn sl_k2 ('\'), through hg_k2,
// strike anvil_heart (vex_trig fires at the furnace mouth). Home: stand at (17,28) facing left, Shove ore_home twice
// (it ends at (14,28)), cross the cooled ring, strike anvil_home. Hub: gate_trig, through the Bell Gate, unlock door_heart.
import { grid, box, put, rows, wallDepth, door, sign, object, trigger, enemy, chest, gate, lockedDoor, steps, enter } from '../_kit.js';
import { spout, sluice, basin, hotGate, cisternFont, oreCrate, layTroughs, TROUGH_LEGEND } from './_quench.js';

const W = 44, H = 32;
const g = grid(W, H, '#');
const room = (x0, y0, x1, y1, faces = 2) => { box(g, x0, y0 - faces, x1, y0 - 1, '|'); box(g, x0, y0, x1, y1, '.'); };
room(16, 14, 27, 21);                       // Hub
room(17, 5, 26, 10);                        // Gate Antechamber
room(3, 4, 13, 22);                         // the Hand
room(30, 17, 41, 23);                       // the Heart, H1
room(30, 11, 41, 14, 2);                    // H2
room(30, 4, 41, 7);                         // H3
room(10, 26, 33, 30);                       // the Home
room(6, 27, 8, 29, 1);                      // the Keeper's cache
// passages and notches
box(g, 14, 17, 15, 18, '.');                // Hub -> Hand
box(g, 28, 17, 29, 18, '.');                // Hub -> Heart
box(g, 25, 22, 26, 25, '.');                // Hub -> Home
box(g, 17, 22, 17, 22, '.');                // the stair up's notch
box(g, 21, 11, 21, 12, '.');                // through the Bell Gate
box(g, 33, 15, 34, 15, '.');                // behind hg_k1
box(g, 38, 8, 39, 9, '.');                  // behind hg_k2
put(g, 9, 28, 'i');                         // the hidden ink bridge into the Keeper's cache
// the Hand: banks, pools and islands west of pool 1 (column 9 is rock beside the banks and pools 2 and 3)
box(g, 10, 4, 11, 22, 'S');                 // pool 1, the whole height
box(g, 3, 9, 8, 11, 'S');                   // pool 2
box(g, 3, 20, 8, 21, 'S');                  // pool 3
for (const y of [4, 5, 6, 7, 8, 9, 10, 11, 20, 21, 22]) put(g, 9, y, '#');
// the Heart: H1's pool, H2's band
box(g, 37, 19, 38, 23, 'S');
box(g, 35, 11, 37, 14, 'S');
// the Home: the useless pool, the ring round the anvil island
box(g, 13, 30, 15, 30, 'S');
box(g, 28, 26, 32, 30, 'S'); box(g, 29, 27, 31, 29, '.');
// troughs
layTroughs(g, [
  [[13, 15], [13, 17]], [[12, 17], [14, 17]], [[8, 17], [9, 17]], [[8, 12], [8, 19]],
  [[32, 17], [32, 21]], [[30, 21], [36, 21]], [[39, 21], [39, 21]],
  [[31, 11], [31, 13]], [[30, 13], [34, 13]], [[38, 13], [38, 13]],
  [[14, 26], [14, 29]], [[14, 27], [27, 27]],
], {
  '13,15': 'N', '12,17': 'W', '14,17': 'E', '9,17': 'E', '8,12': 'N', '8,19': 'S',
  '32,17': 'N', '30,21': 'W', '36,21': 'E', '39,21': 'WE',
  '31,11': 'N', '30,13': 'W', '34,13': 'E', '38,13': 'WE',
  '14,26': 'N', '14,29': 'S', '27,27': 'E',
});
put(g, 13, 17, '7'); put(g, 32, 21, '7'); put(g, 31, 13, '7');   // T junctions under sl_h1, sl_k1, sl_k2 (arms N, W, E)
const ground = rows(wallDepth(g.map((r) => r)));

const decor = [
  // Hub: bronze-ribbed walls, pipes, the bellows
  { t: 'pipes_v', x: 18, y: 13 }, { t: 'pipes_v', x: 24, y: 13 }, { t: 'furnace_mouth', x: 16, y: 13 },
  { t: 'tool_rack', x: 26, y: 20 }, { t: 'bellows_decor', x: 16, y: 20 },
  // Antechamber
  { t: 'pipes_h', x: 18, y: 4 }, { t: 'pipes_h', x: 24, y: 4 }, { t: 'tool_rack', x: 25, y: 10 },
  // Hand
  { t: 'pipes_v', x: 12, y: 3 }, { t: 'furnace_mouth', x: 4, y: 3 },
  // Heart
  { t: 'pipes_v', x: 36, y: 16 }, { t: 'pipes_v', x: 33, y: 10 }, { t: 'furnace_mouth', x: 31, y: 3 },
  // Home
  { t: 'pipes_h', x: 17, y: 25 }, { t: 'pipes_valve', x: 22, y: 25 }, { t: 'bellows_decor', x: 11, y: 30 }, { t: 'tool_rack', x: 23, y: 30 },
];

const OATHS = ['oath_hand', 'oath_heart', 'oath_home'];
const events = [
  enter('fo3_enter', 'foundry_f3_arrival'),
  // ---- Hub
  { id: 'stairs_f2', type: 'door', x: 17, y: 22, to: ['foundry_f2', 19, 17, 'down'], kind: 'stairs' },
  gate('bell_gate', 20, 13, 'bell_gate', { w: 3, flags: OATHS, text: 'bell_gate' }),
  trigger('gate_trig', 20, 14, 3, 1, 'bram_memory_3'),
  sign('proclamation_gate', 23, 13, 'proclamation_gate'),
  { id: 'lift_f3_short', type: 'door', x: 25, y: 13, w: 2, h: 1, to: ['foundry_f1', 19, 26, 'down'], kind: 'lift', sprite: 'ore_lift_open', if: 'foundry_f3_arrived' },
  // ---- the Hand (sequence)
  spout('sp_h', 13, 14, 'down', 'spout_cistern'),
  sluice('sl_h1', 13, 17, 1),
  sluice('sl_h2', 8, 17, 0),
  object('anvil_hand', 5, 6, 'anvil_oath', { script: 'oath_hand', state: 0 }),
  chest('chest_hand', 5, 22, 'iron'),
  enemy('e_h_defenders', 12, 21, 'forge_defender', 'fo3_defenders', 'guard'),
  // ---- the Heart (the dark)
  spout('sp_k1', 32, 16, 'down'),
  sluice('sl_k1', 32, 21, 0),
  basin('bs_k1', 40, 21, 'hg_k1', { face: 'left' }),
  hotGate('hg_k1', 33, 16),
  spout('sp_k2', 31, 10, 'down'),
  sluice('sl_k2', 31, 13, 0),
  basin('bs_k2', 39, 13, 'hg_k2', { face: 'left' }),
  hotGate('hg_k2', 38, 10),
  object('furnace_heart', 40, 3, 'furnace_mouth', { w: 2, text: 'heartforge' }),
  trigger('vex_trig', 39, 4, 3, 1, 'vex_furnace'),
  object('vex_feather', 38, 4, 'prop_letter', { text: 'vex_feather', solid: false }),
  object('anvil_heart', 33, 5, 'anvil_oath', { script: 'oath_heart', state: 0 }),
  enemy('e_k_defenders', 33, 19, 'forge_defender', 'fo3_defenders', 'wander', { radius: 2 }),
  enemy('e_k_mixed', 33, 12, 'forge_defender', 'fo3_mixed', 'guard'),
  // ---- the Home (the dam)
  spout('sp_home', 14, 25, 'down'),
  oreCrate('ore_home', 16, 28),
  object('anvil_home', 30, 28, 'anvil_oath', { script: 'oath_home', state: 0 }),
  chest('chest_blade', 7, 28, 'gold', { item: 'tempered_blade' }),
  enemy('e_home_furnace', 21, 29, 'furnace_construct', 'fo3_furnace', 'patrol', { path: steps('right', 4, 'left', 4) }),
  // ---- the Gate Antechamber
  lockedDoor('door_heart', 20, 4, 'crucible_hook', ['foundry_heart', 12, 18, 'up'], { w: 3, sprite: 'door_crucible' }),
  cisternFont('font_fo3', 24, 7),
  chest('chest_ante', 18, 6, 'wood', { item: 'quench_flask', qty: 2 }),
];

export default {
  id: 'foundry_f3', name: 'The Heartforge Crucible', area: 'dungeon',
  music: 'mystery', ambience: 'forge_rumble', tileset: 'forge',
  lighting: { tint: 'none', dark: 0.5, lights: [] },
  floorShade: { color: '#14101e', alpha: 0.55, rows: 8, side: 3 },
  pitTo: ['foundry_f3', 17, 21, 'up'],
  under: 'crucible_floor',
  legend: {
    ...TROUGH_LEGEND,
    '#': 'crucible_top', '|': 'crucible_face', 'v': 'crucible_out_top', 'o': 'crucible_out_face', '.': 'crucible_floor',
    'i': 'crucible_floor',
  },
  ground,
  overlays: [
    { t: 'ink_bridge_h_faint', x: 9, y: 28 },
    { t: 'wall_glyph_faint', x: 10, y: 24 },
  ],
  decor,
  overhead: [],
  events,
  exits: [],
  marks: {
    arrival: [17, 21], hub: [21, 17], gate_spot: [21, 14], anvil_hand: [5, 7], anvil_heart: [33, 6], anvil_home: [30, 29],
    furnace_mouth: [40, 4], vex_ledge: [41, 3], font: [24, 8], heart_door: [21, 5],
  },
  start: { x: 17, y: 21, dir: 'up' },
};
