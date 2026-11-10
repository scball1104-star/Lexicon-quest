// The Storm Observatory, II: The Hall of Broken Signals (40 x 30, dungeon, roofed, dark 0.35). EPISODE6_PLAN 4.6 and 5.1;
// exact cells and every solution in docs/MAPS_EP6_B.md. Indoors the wind runs in the floor: duct lanes over dark shafts
// (void), brass relay grating on the platforms, relay lamps for light. The fans decide which way.
//
//   A  Stair Foot (x 2..10, rows 24..28): arrival (6,26) by the lift from floor I (lift_f1 at 3,24 goes back), the spring
//      font font_w2. North through the gap (5..6, 22..23) into the hall's south-west platform.
//   B  The Two Fans: the hall (x 2..22, rows 10..21) is cut into four grated platforms by a cross of shafts (x 11..13 and
//      rows 14..15). vane_b1 (9,17) on the south-west platform turns group a: the duct row 18 (x 11..13) blows west, home;
//      turned it blows east to the south-east platform (14,18). vane_b2 (20,17) there turns group b: the duct column x 18
//      (rows 14..15, and rows 8..9 through the hall's north wall) blows south, home; turned it blows north, first to the
//      manifest platform (18,13: memory2_trig, the manifest relay), then on up into the crown room (18,7). Reach decides
//      the order: b2 stands where only b1's duct goes.
//      The way home holds in every state: the north-west platform's duct (5,14..15) drops to the south-west platform; the
//      manifest platform's duct (11..13,12) and the crown room's west gallery duct (6,8..9) both feed it. The twin duct
//      above it (11..13,11) blows back east, so the north-west platform's chest is an out-and-back from the manifest
//      platform (one ride each way), never a second pass through the fans.
//   C  The Crown Relay (crown room x 4..25, rows 2..7): vex_trig (column x 19), Vex at vex_spot (21,4) facing the crown
//      relay (21,3), the party two clear rows below on party_stop (21,7). The feather in the grille (22,5). Vex's duct
//      (23,2..3) runs into the north wall (a live lane, a blocked stop: decor end).
//   D  The Side Decks (x 27..37, rows 2..9, through the crown room's east door 26,4..5): three flight logs and a potion
//      chest, any order. vane_d (31,8) turns group c: the duct x 30 (rows 10..13) blows south down into the bellows hall
//      (the main route); turned, it bends east at (30,11) along row 11 to the locker ledge (34,11): locker_obj (36..37,11),
//      the locker's gold chest (37,12) and the flight logs book (34,12). The ledge's duct (34,10) blows home to the decks.
//   E  The Bellows Hall (x 24..37, rows 14..25): font_w2b, engine_trig (row 18), the Gale Engine at engine_spot (31,22).
//      The duct x 27 (rows 10..13) blows back up to the side decks. After the win: lift_trig (24,15), lift_up (24,14) to
//      floor III; lift_f2_short (25,14) down to floor I's alcove once obs_f2_done.
// Solution for the bot: vane_b1 from (9,18); step east from (10,18): land (14,18). vane_b2 from (20,18); step north from
// (18,16): land (18,13) (memory2_trig); step north from (18,10): land (18,7). East across vex_trig. East door (26,4) to the
// side decks; step south from (30,9) (vane_d untouched): land (30,14). South across engine_trig (row 18). After the win:
// lift_trig (24,15), lift_up (24,14). Optional: from the manifest platform step west from (14,12): land (10,12) on the
// north-west platform (chest_b); step east from (10,11): land (14,11), back on the manifest platform. Optional: vane_d from (31,9), step south from (30,9): land on the locker ledge (34,11);
// locker_obj from (35,11) facing east, then chest_locker from (36,12); the ledge duct north from (34,11) to (34,9).
import { wallDepth, door, sign, object, trigger, enemy, chest, actor, book, steps, enter } from './_kit.js';
import { skyGrid, vane, windFont, lift, glow } from './ep6_obs_f1.js';

const W = 40, H = 30;
const S = skyGrid(W, H, '#');
const { set, box, lane, laneBox, turnBox } = S;

/** Carve a floor ('.') with its north faces ('|') where the rows above are still wall. */
function room(x0, y0, x1, y1, faces = 2) {
  for (let y = y0 - faces; y < y0; y++) for (let x = x0; x <= x1; x++) if (y >= 0 && S.g[y][x] === '#') set(x, y, '|');
  box(x0, y0, x1, y1, '.');
}

room(4, 2, 25, 7);                        // C  the crown room (west gallery x 4..13)
room(2, 10, 22, 21);                      // B  the hall
room(2, 24, 10, 28);                      // A  the stair foot
box(5, 22, 6, 23, '.');                   //    the gap from the stair foot into the hall
room(27, 2, 37, 9);                       // D  the side decks
box(26, 4, 26, 5, '.');                   //    the crown room's east door
room(24, 14, 37, 25);                     // E  the bellows hall
// shafts ('d' duct_shaft, void)
box(11, 10, 13, 21, 'd');                 // B  the cross: the north-south shaft
box(2, 14, 22, 15, 'd');                  //    and the east-west shaft
box(18, 8, 18, 9, 'd');                   //    the crown duct through the hall's north wall
box(6, 8, 6, 9, 'd');                     //    the west gallery's duct through the wall
box(23, 2, 23, 3, 'd');                   // C  Vex's duct into the north wall
box(26, 10, 37, 13, 'd');                 // D/E the shaft between the side decks and the bellows hall
box(34, 11, 37, 12, '.');                 //    the locker ledge in it

// lanes (base = the authored state)
laneBox(11, 18, 13, 18, '<');             // B  group a: west, home (lands 10,18)
turnBox('a', 11, 18, 13, 18, '>');        //    turned: east to the south-east platform (lands 14,18)
laneBox(18, 14, 18, 15, 'v');             //    group b: south to the south-east platform (lands 18,16)
turnBox('b', 18, 14, 18, 15, '^');        //    turned: north to the manifest platform (lands 18,13)
laneBox(18, 8, 18, 9, 'v');               //    group b: the crown room down to the manifest platform (lands 18,10)
turnBox('b', 18, 8, 18, 9, '^');          //    turned: up into the crown room (lands 18,7)
laneBox(11, 12, 13, 12, '<');             //    the manifest platform -> the north-west platform (lands 10,12)
laneBox(11, 11, 13, 11, '>');             //    and back: the north-west platform -> the manifest platform (lands 14,11)
laneBox(5, 14, 5, 15, 'v');               //    the north-west platform -> the south-west platform (lands 5,16)
laneBox(6, 8, 6, 9, 'v');                 // C  the west gallery -> the north-west platform (lands 6,10)
laneBox(23, 2, 23, 3, '^');               //    Vex's duct: into the wall (a blocked stop at 23,2)
laneBox(30, 10, 30, 13, 'v');             // D  group c: down into the bellows hall (lands 30,14)
turnBox('c', 30, 11, 33, 11, '>');        //    turned: bends east at (30,11) to the locker ledge (lands 34,11)
turnBox('c', 30, 12, 30, 13, 'x');        //    and the drop below the bend is calm
lane(34, 10, '^');                        //    the locker ledge -> the side decks (lands 34,9)
laneBox(27, 10, 27, 13, '^');             // E  the bellows hall -> the side decks (lands 27,9)

const R = S.rows();
const ground = wallDepth(R.ground);

// ---------------------------------------------------------------- dressing
const decor = [
  // A
  { t: 'lift_brass', x: 3, y: 24 }, { t: 'speaking_tube', x: 10, y: 24 }, { t: 'signal_lamp', x: 2, y: 28, state: 1 },
  // B
  { t: 'relay', x: 2, y: 16, state: 1 }, { t: 'speaking_tube', x: 3, y: 10 }, { t: 'relay', x: 9, y: 10, state: 0 },
  { t: 'signal_lamp', x: 22, y: 21, state: 1 }, { t: 'speaking_tube', x: 14, y: 21 }, { t: 'relay', x: 22, y: 16, state: 2 },
  { t: 'signal_lamp', x: 2, y: 21, state: 1 },
  // C: the west gallery and the crown
  { t: 'relay', x: 5, y: 2, state: 2 }, { t: 'relay', x: 8, y: 2, state: 0 }, { t: 'speaking_tube', x: 10, y: 2 },
  { t: 'relay', x: 12, y: 2, state: 1 }, { t: 'signal_lamp', x: 15, y: 2, state: 1 }, { t: 'speaking_tube', x: 25, y: 2 },
  { t: 'feather_grille', x: 22, y: 5 },
  // D
  { t: 'relay', x: 29, y: 2, state: 1 }, { t: 'speaking_tube', x: 31, y: 2 }, { t: 'signal_lamp', x: 35, y: 2, state: 1 },
  // E: the bellows
  { t: 'rotor', x: 24, y: 23 }, { t: 'rotor', x: 37, y: 20 }, { t: 'signal_lamp', x: 24, y: 19, state: 1 },
  { t: 'signal_lamp', x: 37, y: 15, state: 1 }, { t: 'lift_brass', x: 24, y: 14 }, { t: 'lift_brass', x: 25, y: 14 },
];

const events = [
  enter('f2_enter', 'obs_f2_arrival'),
  // ---- A: Stair Foot
  lift('lift_f1', 3, 24, ['ep6_obs_f1', 20, 2, 'down']),
  windFont('font_w2', 8, 24),
  glow('l_a', 6, 25, 4),
  // ---- B: The Two Fans
  vane('vane_b1', 9, 17, 'a', { sprite: 'fan_vane' }),
  vane('vane_b2', 20, 17, 'b', { sprite: 'fan_vane' }),
  enemy('e_b', 4, 19, 'signal_wraith', 'e6o2_mixed', 'patrol', { path: steps('right', 2, 'left', 2) }),
  enemy('e_nw', 8, 11, 'lightning_manta', 'e6o2_manta', 'guard'),
  chest('chest_b', 2, 10, 'iron'),
  object('relay_manifest', 20, 10, 'relay', { text: 'ep6_relay', state: 1 }),
  trigger('memory2_trig', 14, 13, 9, 1, 'aeris_memory_2'),
  sign('grille_b', 4, 16, 'ep6_grille', { solid: false }),
  glow('l_b1', 2, 20, 4), glow('l_b2', 21, 20, 4), glow('l_m', 20, 11, 3), glow('l_nw', 9, 11, 3),
  // ---- C: The Crown Relay
  object('crown_relay', 21, 3, 'relay', { text: 'ep6_relay', state: 2 }),
  trigger('vex_trig', 19, 2, 1, 6, 'vex_relay'),
  sign('feather_grille', 22, 5, 'ep6_feather_grille', { solid: false }),
  object('tube_c', 10, 2, 'speaking_tube', { text: 'ep6_speaking_tube' }),
  glow('l_c', 21, 5, 4), glow('l_g', 9, 4, 4),
  // ---- D: The Side Decks
  chest('log_1', 28, 3, 'wood', { item: 'hi_potion', flag: 'log_1_found' }),
  chest('log_2', 33, 2, 'wood', { item: 'hi_ether', flag: 'log_2_found' }),
  chest('log_3', 37, 6, 'wood', { item: 'ballast_stone', flag: 'log_3_found' }),
  chest('chest_d', 37, 3, 'wood', { item: 'hi_potion', qty: 2 }),
  vane('vane_d', 31, 8, 'c', { sprite: 'fan_vane' }),
  enemy('e_d', 34, 6, 'signal_wraith', 'e6o2_wraiths', 'guard'),
  object('locker_obj', 36, 11, 'supply_coffer', { w: 2, script: 'locker' }),
  chest('chest_locker', 37, 12, 'gold', { gold: 400, item: 'hi_ether', qty: 2, if: 'locker_found' }),
  book('book_logs', 34, 12, 'flight_logs', { if: 'locker_found' }),
  glow('l_d', 34, 4, 4), glow('l_ll', 36, 12, 2),
  // ---- E: The Bellows Hall
  windFont('font_w2b', 28, 16),
  enemy('e_e', 35, 16, 'signal_wraith', 'e6o2_mixed', 'guard'),
  trigger('engine_trig', 24, 18, 14, 1, 'gale_engine'),
  actor('gale_engine', 31, 22, 'gale_engine', 'up', { ifNot: 'engine_defeated' }),
  trigger('lift_trig', 24, 15, 1, 1, 'obs_f2_lift'),
  lift('lift_up', 24, 14, ['ep6_obs_f3', 18, 35, 'up'], { if: 'engine_defeated' }),
  lift('lift_f2_short', 25, 14, ['ep6_obs_f1', 21, 27, 'up'], { if: 'obs_f2_done' }),
  glow('l_e1', 25, 19, 4), glow('l_e2', 36, 16, 4), glow('l_e3', 31, 21, 5),
];

export default {
  id: 'ep6_obs_f2', name: 'The Hall of Broken Signals', area: 'dungeon',
  music: 'storm_observatory', ambience: 'storm_rumble', tileset: 'ep6',
  lighting: { tint: 'none', dark: 0.35 },
  under: 'relay_grate',
  legend: {
    '#': 'relay_hall_top', '|': 'relay_hall_face', 'o': 'relay_hall_out_face', 'v': 'relay_hall_out_top',
    '.': 'relay_grate', 'd': 'duct_shaft',
  },
  ground,
  wind: { kind: 'duct', lanes: R.lanes, turned: R.turned },
  overlays: [],
  decor,
  overhead: [],
  events,
  exits: [],
  marks: {
    start: [6, 26], arrival: [6, 26], font: [8, 25], fans: [9, 18], fan_b1: [9, 18], fan_b2: [20, 18],
    relay_manifest: [20, 10], manifest_stage: [20, 13], manifest_stage_m: [19, 13], manifest_stage_b: [21, 13],
    manifest_aeris: [20, 11], manifest_deck: [22, 11],
    crown: [21, 3], vex_spot: [21, 4], party_stop: [21, 7], party_stop_m: [20, 7], party_stop_b: [22, 7],
    side_decks: [32, 5], vane_d: [31, 9], locker: [35, 11], locker_in: [34, 11],
    arena: [31, 19], engine_spot: [31, 22], arena_stage: [31, 20], arena_stage_m: [30, 20], arena_stage_b: [32, 20],
    lift_up: [24, 15], lift_short: [25, 15],
  },
  start: { x: 6, y: 26, dir: 'up' },
};
