// The Ashen Foundry, I: The Cinder Liftworks (40 x 30, dungeon, dark 0.2). EPISODE3_PLAN 4.4.
//
// The teaching floor for quench (plan 5.1). Four spouts, five paddles, one wheel. Areas:
//   A  the Lift Landing (south): the lift from Emberpeak lands at start (19,27); the lift home in the notch below it; the
//      cistern font. North through the doorway into B.
//   B  the Slag Hall (puzzle B, permanence): a spout in the north face (19,13) pours down to sl_b (19,17). Two slag pools
//      run the full height of the hall: pool 1 (x 14..15) walls off the west ledge, pool 2 (x 24..25) the way east.
//      Start state '/': the water turns WEST, crosses pool 1 and crusts it (row 17) the moment the floor loads, in sight
//      of the door: a bridge to the dead-end ledge and its wood chest. Turned '\': EAST, across pool 2 (row 17), to the
//      passage into C. Pool 1 stays crusted. No enemies.
//   C  the Ore Lines (puzzle C, the dam): the cistern (30,14) pours east along row 14, but the heavy ore crate (32,14)
//      sits in the trough. Bram shoves it off the line (north or south); the water reaches the basin bs_c (35,14), which
//      cools the hot grate hg_c (32,4) in the north face: the alcove behind it holds the wood chest with the Ash Key.
//      The sand hopper's chest (if sand_started) waits in the south-east corner. Two groups. The long wheel line (row 6,
//      then down column 36) crosses C on its way to F; its paddle sl_f2 (36,6) stands here.
//   D  the Shaft (behind door_d, Ash Key): reached from A by the west corridor and the anteroom (5..9, 21..26). The old
//      shaft mouth (void, 2..3, 12..15) with shaft_trig beside it (bram_memory_1). Its spout (4,5) and sl_d (4,7):
//      start '/' splashes west on D's floor; turned '\' the water runs east along row 7 across the slag span (10..14,
//      6..7) into E and crusts the bridge. A cracked face (8,4..5, Dash Strike) hides the niche with the gold chest
//      (Ashwalker Boots). Two groups.
//   E  the North Balcony: over the crust bridge. The gold chest with the Crucible Hook; one group. Its spout (22,1) feeds
//      the wheel line through sl_f1 (22,6): start '/' splashes west on the balcony; '\' sends it east along row 6, through
//      the passage (27..28, 6) and across the little slag pool in C (29..30, 6..7: crusting it opens the passage as a
//      shortcut C <-> E), to sl_f2 (36,6) in C: start '/' splashes north onto C's floor (36,5); '\' sends it down column
//      36 through the passage (36, 20..22) to the waterwheel.
//   F  the Wheelhouse (puzzle F, power): the waterwheel bs_wheel (36,23: latch, flag lift_wheel_lit, script
//      liftworks_lift) opens the ore lift gate_lift (31,22) down to F2; foundry_f1_lift runs on the two cells in front of
//      it. Reached early from A by the east corridor (one group, the iron chest), powered last.
// Solution for the bot: B: turn sl_b once ('\'). C: Shove ore_c north (stand at (32,15), face up); open chest_key. A ->
// west corridor -> door_d (Ash Key). D: turn sl_d once ('\'), cross row 7 to E. E: turn sl_f1 once ('\'). C: turn sl_f2
// once ('\'). F: the wheel turns; step on the lift.
import { grid, box, put, rows, wallDepth, door, sign, object, trigger, enemy, chest, gate, lockedDoor, steps, enter } from '../_kit.js';
import { spout, sluice, basin, hotGate, cisternFont, oreCrate, layTroughs, TROUGH_LEGEND } from './_quench.js';

const W = 40, H = 30;
const g = grid(W, H, '#');
const room = (x0, y0, x1, y1, faces = 2) => { box(g, x0, y0 - faces, x1, y0 - 1, '|'); box(g, x0, y0, x1, y1, '.'); };
room(16, 23, 23, 27);                       // A  Lift Landing
room(12, 14, 27, 20);                       // B  Slag Hall
room(29, 5, 38, 19);                        // C  Ore Lines
room(2, 6, 9, 17);                          // D  Shaft
room(15, 2, 26, 7);                         // E  North Balcony
room(28, 23, 38, 27);                       // F  Wheelhouse
room(5, 23, 9, 26, 2);                      // the anteroom before door_d (its face holds the locked door)
// passages and notches
box(g, 19, 21, 20, 22, '.');                // A -> B
box(g, 19, 28, 20, 28, '.');                // the lift home's notch
box(g, 28, 17, 28, 17, '.');                // B -> C
box(g, 10, 25, 15, 26, '.');                // A -> the anteroom (west corridor)
box(g, 24, 25, 27, 26, '.');                // A -> F (east corridor)
box(g, 6, 18, 7, 18, '.');                  // D's south notch behind door_d
box(g, 27, 6, 28, 6, '.');                  // E -> C, the wheel line's passage (behind C's slag pool)
box(g, 36, 20, 36, 22, '.');                // C -> F, along the wheel line
box(g, 32, 1, 33, 3, '.');                  // the alcove behind hg_c
box(g, 7, 2, 9, 3, '.');                    // the niche behind D's cracked face
// slag: B's two pools (wall to wall), the span D -> E, C's little pool at the passage
box(g, 14, 14, 15, 20, 'S'); box(g, 24, 14, 25, 20, 'S');
box(g, 10, 6, 14, 7, 'S');
box(g, 29, 6, 30, 7, 'S');
// the old shaft mouth: a hole in D's floor (void)
box(g, 2, 12, 3, 15, ' ');
// troughs: B (spout -> sl_b -> both pools), C's dam line, D (spout -> sl_d -> the span), E -> the wheel line
layTroughs(g, [
  [[19, 14], [19, 17]], [[16, 17], [23, 17]], [[26, 17], [27, 17]],
  [[31, 14], [34, 14]],
  [[4, 6], [4, 7]], [[3, 7], [9, 7]],
  [[22, 2], [22, 6]], [[17, 6], [28, 6]], [[31, 6], [36, 6]], [[36, 6], [36, 22]],
], {
  '19,14': 'N', '16,17': 'W', '23,17': 'E', '26,17': 'W', '27,17': 'E', '31,14': 'W', '34,14': 'E',
  '4,6': 'N', '3,7': 'W', '9,7': 'E', '22,2': 'N', '17,6': 'W', '28,6': 'E', '31,6': 'W', '36,22': 'S',
});
put(g, 19, 17, '7'); put(g, 4, 7, '7'); put(g, 22, 6, '7');   // the T junctions under sl_b, sl_d, sl_f1 (arms N, W, E)
put(g, 36, 6, '4');                                           // sl_f2: in from the west, out south (or north onto the floor)
put(g, 27, 6, 'H'); put(g, 28, 6, 'H');
const ground = rows(wallDepth(g.map((r) => r.replace(/ /g, '#'))).map((r, y) => r.split('').map((c, x) => (g[y][x] === ' ' ? 'v' : c)).join('')));

// ---------------------------------------------------------------- dressing
const decor = [
  // B: furnace mouths and pipes in the north face, a tool rack by the door
  { t: 'furnace_mouth', x: 13, y: 13 }, { t: 'pipes_v', x: 17, y: 13 }, { t: 'pipes_v', x: 21, y: 13 }, { t: 'furnace_mouth', x: 26, y: 13 },
  { t: 'tool_rack', x: 16, y: 20 }, { t: 'bellows_decor', x: 21, y: 20 },
  // A: the landing's pipes
  { t: 'pipes_h', x: 17, y: 22 }, { t: 'pipes_valve', x: 22, y: 22 },
  // C: ore lines
  { t: 'pipes_v', x: 30, y: 4 }, { t: 'pipes_elbow', x: 35, y: 4 }, { t: 'furnace_mouth', x: 37, y: 4 },
  { t: 'tool_rack', x: 37, y: 11 }, { t: 'bellows_decor', x: 29, y: 10 },
  // D: the shaft's winch and racks
  { t: 'tool_rack', x: 6, y: 6 }, { t: 'pipes_v', x: 2, y: 5 }, { t: 'bellows_decor', x: 8, y: 16 },
  // E: the balcony rail of pipes
  { t: 'pipes_h', x: 16, y: 1 }, { t: 'pipes_h', x: 18, y: 1 }, { t: 'pipes_valve', x: 25, y: 1 },
  // F: the wheelhouse
  { t: 'pipes_v', x: 29, y: 22 }, { t: 'pipes_v', x: 34, y: 22 }, { t: 'bellows_decor', x: 29, y: 27 }, { t: 'tool_rack', x: 33, y: 27 },
];

const events = [
  enter('fo1_enter', 'foundry_f1_arrival'),
  // ---- A: the Lift Landing
  { id: 'lift_home', type: 'door', x: 19, y: 28, w: 2, h: 1, to: ['emberpeak', 19, 6, 'down'], kind: 'lift', sprite: 'ore_lift_open' },
  cisternFont('font_fo1', 21, 24),
  sign('ore_lift_sign', 18, 22, 'ore_lift', { solid: false }),
  // ---- B: the Slag Hall (puzzle B)
  spout('sp_b', 19, 13, 'down'),
  sluice('sl_b', 19, 17, 0),
  chest('chest_ledge', 12, 15, 'wood', { item: 'quench_flask', qty: 2 }),
  sign('slag_hall_sign', 23, 13, 'slag_pool'),
  // ---- C: the Ore Lines (puzzle C)
  spout('sp_c', 30, 14, 'right', 'spout_cistern'),
  oreCrate('ore_c', 32, 14),
  basin('bs_c', 35, 14, 'hg_c', { face: 'left' }),
  hotGate('hg_c', 32, 4),
  chest('chest_key', 33, 1, 'wood', { item: 'ash_key', flag: 'ash_key_f1' }),
  chest('chest_hopper', 38, 19, 'wood', { item: 'glass_sand', flag: 'glass_sand_found', if: 'sand_started' }),
  sign('sand_hopper', 37, 19, 'sand_hopper', { solid: false }),
  sluice('sl_f2', 36, 6, 0),
  enemy('e_c_beetles', 33, 10, 'cinder_beetle', 'fo1_beetles', 'wander', { radius: 2 }),
  enemy('e_c_miners', 31, 18, 'ashbound_miner', 'fo1_miners', 'patrol', { path: steps('right', 4, 'left', 4) }),
  // ---- D: the Shaft (behind door_d)
  lockedDoor('door_d', 6, 22, 'ash_key', ['foundry_f1', 6, 18, 'up']),
  door('notch_d', 6, 18, ['foundry_f1', 6, 23, 'down'], { w: 2 }),
  trigger('shaft_trig', 4, 12, 2, 4, 'bram_memory_1'),
  spout('sp_d', 4, 5, 'down'),
  sluice('sl_d', 4, 7, 0),
  object('crack_d', 8, 4, 'wall_cracked', { breakable: 'rock', text: 'cliff_crack', h: 2, opens: [[8, 4], [8, 5], [8, 3]] }),
  chest('chest_boots', 8, 2, 'gold', { item: 'ashwalker_boots', behind: 'crack_d' }),
  enemy('e_d_miners', 7, 10, 'ashbound_miner', 'fo1_miners', 'wander', { radius: 2 }),
  enemy('e_d_beetles', 7, 15, 'cinder_beetle', 'fo1_beetles', 'guard'),
  // ---- E: the North Balcony
  spout('sp_e', 22, 1, 'down'),
  sluice('sl_f1', 22, 6, 0),
  chest('chest_hook', 25, 3, 'gold', { item: 'crucible_hook', flag: 'crucible_hook_found' }),
  enemy('e_e_slimes', 19, 3, 'slag_slime', 'fo1_slimes', 'wander', { radius: 2 }),
  // ---- F: the Wheelhouse (puzzle F)
  basin('bs_wheel', 36, 23, 'gate_lift', { w: 2, sprite: 'waterwheel', face: 'up', flag: 'lift_wheel_lit', script: 'liftworks_lift' }),
  gate('gate_lift', 31, 22, 'ore_lift', { to: ['foundry_f2', 6, 27, 'up'], kind: 'lift', text: 'ore_lift' }),
  trigger('lift_trig', 31, 23, 2, 1, 'foundry_f1_lift', { if: 'lift_wheel_lit' }),
  chest('chest_f', 38, 26, 'iron'),
  enemy('e_f_mixed', 32, 25, 'ashbound_miner', 'fo1_mixed', 'patrol', { path: steps('right', 3, 'left', 3) }),
];

export default {
  id: 'foundry_f1', name: 'The Cinder Liftworks', area: 'dungeon',
  music: 'foundry', ambience: 'forge_rumble', tileset: 'forge',
  lighting: { tint: 'none', dark: 0.2, lights: [] },
  floorShade: { color: '#14101e', alpha: 0.45, rows: 8, side: 3 },
  under: 'foundry_floor',
  legend: {
    ...TROUGH_LEGEND,
    '#': 'foundry_top', '|': 'foundry_face', 'v': 'foundry_out_top', 'o': 'foundry_out_face', '.': 'foundry_floor',
  },
  ground,
  overlays: [],
  decor,
  overhead: [],
  events,
  exits: [],
  marks: {
    start: [19, 27], font: [21, 25], slag_hall: [19, 18], shaft: [2, 13], shaft_bram: [4, 16], shaft_foreman: [5, 11],
    balcony: [20, 4], wheel: [36, 24], lift_down: [31, 23], ledge: [12, 17], ore_c: [32, 14],
  },
  start: { x: 19, y: 27, dir: 'up' },
};
