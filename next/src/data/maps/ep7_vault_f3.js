// The Frostbound Vault, III: The Stillheart Sanctum (34 x 40, dungeon, tint aurora, dark 0.3). EPISODE7_PLAN 4.8, 4.10 and 5.1;
// exact cells and the solution in docs/MAPS_EP7_B.md. The cathedral's nave from below, bottom (south) to top (north): landings
// of nave ice between ice pillars, the fade between them, the aurora through the broken roof, and the round door at the top.
// The quietest floor, not the darkest.
//
//   The first landing (x 8..26, rows 32..37): arrival (17,35) by the lift from floor II (lift_down 10,33 goes back to the
//      Lamp Gallery, landing under font_v2b), the font font_v3 (21..22,33), memory3_trig (row 34).
//   Shelter (1 read): Ylva's stone (18,32) holds her path north (column x 17, rows 30..31) to the Shelter landing (x 8..23,
//      rows 27..29). The charter's first word over the stair (16,27). One group.
//   Remember (2 reads): Greta's stone (11,27) holds hers (column x 10, rows 24..26) to the west half of the Remember landing
//      (x 7..13, rows 19..23). There Anders's stone (13,20) holds his path east (row 21, x 14..17) through the pillar gap
//      (18,21) to the east half (x 19..26, rows 19..23); Ylva, the oldest, lets go. The gap is Ylva's frost door Y: across,
//      read Ylva again (21,19) and her second stretch (column x 22, rows 16..18) runs on north, and the gap freezes behind the
//      party (cross first, then read). keeper_trig (22,19), the Keeper up the stair (keeper_stair) to keeper_wait_1. Off the
//      west pillar, Solveig's stone in Keeper ink (7,20, Lantern) holds a short path (row 21, x 4..6) to the Road Home
//      (gold, 2,21). One group each half.
//   Return (Anders + Ida, 2 reads, Anders counted above): the Return landing (x 12..24, rows 12..15) and the low wall on row
//      11 with Anders's frost door A (17,11). Anders is still held, so it is shut. Read Ida (12,12): Anders, the oldest, lets
//      go and the door melts; Ida's path (row 13, x 9..11) reaches the islet's iron chest. One group.
//   The round door (x 12..22, rows 8..10, 0 reads): the round door (16..18, 5..7; shut until stillheart_open, the Keeper's
//      hand), behind it the passage (17,5..7) and the vestibule (x 15..19, rows 3..4), and the inner grate (16..18,2, the
//      Stillheart Crystal Key) to ep7_stillheart. A wood chest, the Keeper Charter.
//
// The decisions on the main path: ylva, greta, anders, ylva again (a re-read further on, never a loop home), ida: 5.
// The bot: ylva from (18,33) facing up; north to (17,29); greta from (11,28) facing up; north to (10,23); anders from (13,21)
// facing up; east through the gap to (19,21); ylva_3 from (21,20) facing up; north over her second stretch to (22,15); ida
// from (12,13) facing up; north through the melted door to (17,10); with stillheart_open, north through the round door to
// the grate (17,3), open it with the key and step in.
import { door, object, trigger, enemy, chest, sign, book, lockedDoor, enter } from './_kit.js';
import { vaultGrid, stone, thawFont, lift } from './ep7_vault_f1.js';

const W = 34, H = 40;
const S = vaultGrid(W, H, '#');
const { set, box, path, frost } = S;

box(2, 8, 31, 37, '_');                    // the nave's white
// the round door, the passage and the vestibule
box(15, 3, 19, 4, '.');                    // the vestibule under the grate (faces rows 1..2)
box(17, 5, 17, 7, '.');                    // the passage behind the round door
box(12, 8, 22, 10, '.');                   // the round door landing
box(12, 11, 22, 11, '#');                  // the low wall, and Anders's door in it
frost(17, 11, 'a', '.');
// Return
box(12, 12, 24, 15, '.');                  // the Return landing
box(6, 12, 8, 14, '.');                    //   the islet (Ida's path)
// Remember
box(19, 19, 26, 23, '.');                  // the east half
set(18, 19, '#'); set(18, 20, '#'); set(18, 22, '#'); set(18, 23, '#');   // the ice pillar, and the gap in it
frost(18, 21, 'y', '.');                   //   Ylva's frost door
box(7, 19, 13, 23, '.');                   // the west half
box(2, 20, 3, 22, '.');                    //   the Keeper's islet (Solveig's path)
// Shelter
box(8, 27, 23, 29, '.');                   // the Shelter landing
// the first landing
box(8, 32, 26, 37, '.');
box(2, 38, 31, 39, '#');

path(17, 30, 17, 31, 'y');                 // Ylva: the first landing to Shelter
path(22, 16, 22, 18, 'y');                 //   her second stretch: the Remember landing's east half to Return
path(10, 24, 10, 26, 'g');                 // Greta: Shelter to the west half
path(14, 21, 17, 21, 'a');                 // Anders: the west half to the pillar gap
path(9, 13, 11, 13, 'i');                  // Ida: Return to the islet
path(4, 21, 6, 21, 's');                   // Solveig (Keeper ink): the west half to the Road Home

const R = S.rows();

const decor = [
  { t: 'lift_frost', x: 10, y: 33 }, { t: 'crystal', x: 8, y: 37 }, { t: 'crystal', x: 26, y: 37 }, { t: 'frostfire', x: 26, y: 32 },
  { t: 'crystal', x: 8, y: 27 }, { t: 'crystal', x: 23, y: 29 },
  { t: 'auroraobelisk', x: 7, y: 23 }, { t: 'crystal', x: 26, y: 19 },
  { t: 'crystal', x: 24, y: 12 }, { t: 'auroraobelisk', x: 12, y: 15 },
  { t: 'frostfire', x: 12, y: 8 }, { t: 'frostfire', x: 22, y: 10 },
];

const events = [
  enter('f3_enter', 'vault_f3_arrival'),
  // ---- the first landing
  lift('lift_down', 10, 33, ['ep7_vault_f2', 23, 17, 'down']),
  thawFont('font_v3', 21, 33),
  trigger('memory3_trig', 11, 34, 16, 1, 'keeper_memory_3'),
  stone('ns_ylva', 'y', 18, 32),
  // ---- Shelter
  stone('ns_ylva_2', 'y', 18, 29),
  stone('ns_greta', 'g', 11, 27),
  sign('charter_shelter', 16, 27, 'ep7_charter_shelter', { solid: false }),
  enemy('e_sh', 21, 28, 'rimed_page', 'e7v3_pages', 'patrol', { path: ['left', 'left', 'right', 'right'] }),
  // ---- Remember
  stone('ns_greta_2', 'g', 11, 23),
  stone('ns_anders', 'a', 13, 20),
  stone('ns_solveig', 's', 7, 20, { lantern: true }),
  stone('ns_solveig_2', 's', 3, 22, { lantern: true }),   // the islet end: a reload there reads the way back
  sign('keeper_ink', 8, 19, 'ep7_keeper_ink', { solid: false, lantern: true }),
  chest('chest_road_home', 2, 21, 'gold', { item: 'road_home' }),
  enemy('e_rw', 9, 21, 'ice_knight', 'e7v3_knight', 'guard'),
  stone('ns_anders_2', 'a', 19, 22),
  stone('ns_ylva_3', 'y', 21, 19),
  sign('ice_pillar', 18, 20, 'ep7_ice_pillar', { solid: false }),
  sign('charter_remember', 24, 19, 'ep7_charter_remember', { solid: false }),
  trigger('keeper_trig', 22, 19, 1, 1, 'keeper_comes'),
  enemy('e_re', 25, 22, 'frostbound_revenant', 'e7v3_mixed', 'guard'),
  // ---- Return
  stone('ns_ylva_4', 'y', 23, 15),
  stone('ns_ida', 'i', 12, 12),
  stone('ns_ida_2', 'i', 8, 12),
  sign('charter_return', 16, 12, 'ep7_charter_return', { solid: false }),
  chest('chest_return', 6, 13, 'iron'),
  enemy('e_rt', 20, 13, 'ice_knight', 'e7v3_knight', 'patrol', { path: ['right', 'right', 'left', 'left'] }),
  // ---- the round door
  chest('chest_door', 21, 8, 'wood', { item: 'ember_tea', qty: 2 }),
  book('charter_book', 13, 8, 'keeper_charter'),
  object('round_door', 16, 7, 'round_door', { w: 3, state: 0, text: 'ep7_round_door', ifNot: 'stillheart_open' }),
  object('round_door_open', 16, 7, 'round_door', { state: 1, text: 'ep7_round_door', if: 'stillheart_open' }),
  lockedDoor('grate', 16, 2, 'stillheart_key', ['ep7_stillheart', 16, 20, 'up'], { w: 3, sprite: 'door_boss', text: 'ep7_inner_grate' }),
];

export default {
  id: 'ep7_vault_f3', name: 'The Stillheart Sanctum', area: 'dungeon',
  music: 'mystery', ambience: 'vault_hush', tileset: 'ep7',
  lighting: { tint: 'aurora', dark: 0.3 },
  under: 'fade',
  legend: { _: 'fade', '.': 'nave_ice', '#': 'nave_top', '|': 'nave_face', o: 'nave_out_face', v: 'nave_out_top' },
  ground: R.ground,
  remember: { capacity: 2, paths: R.paths, frost: R.frost, goal: ['memory3_stage', 'remember_stage', 'party_stop_door'] },
  overlays: [],
  decor,
  overhead: [],
  events,
  exits: [],
  marks: {
    start: [17, 35], arrival: [17, 35], font: [21, 34], lift_down: [10, 34],
    memory3_spot: [19, 32], memory3_stage: [15, 32], memory3_stage_m: [14, 32], memory3_stage_b: [16, 32],
    memory3_run: [24, 35], memory3_bell: [21, 32], nave_dark: [17, 20],
    ylva_face: [18, 33], shelter: [16, 28], greta_face: [11, 28],
    remember: [21, 21], west_half: [10, 21], anders_face: [13, 21], gap: [18, 21],
    remember_stage: [21, 21], remember_stage_m: [20, 21], remember_stage_b: [22, 21],
    keeper_stair: [24, 23], keeper_wait_1: [20, 19], keeper_wait_2: [13, 12], keeper_wait_3: [15, 8],
    ylva_again: [21, 20], solveig_face: [7, 21], road_home: [3, 21],
    return: [18, 13], ida_face: [12, 13], door_a: [17, 11],
    round_door: [17, 8], party_stop_door: [17, 10], grate: [17, 3],
  },
  start: { x: 17, y: 35, dir: 'up' },
};
