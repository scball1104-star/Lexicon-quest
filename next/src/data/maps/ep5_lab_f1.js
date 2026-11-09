// The Oracle Labyrinth, I: The Shifting Dunes (40 x 30, dungeon, open sky, start noon). EPISODE5_PLAN 4.6; exact cells
// and every puzzle's solution in docs/MAPS_EP5_B.md. The teaching floor for sun and shade: each court adds one idea (plan
// 5.1's ladder), and every court reads from the floor art alone (running gold sand, violet shade, the stone that throws it).
//
//   A  the Oasis Gate (south): arrival (20,27) from Saffron Haven's north gate, the oasis font, dial_a, the hourglass chest,
//      the way home (19..21,29) and the brass lift to Floor II (24,25) once lab_f2_done. North up the steps into B.
//   B  Two Shadows (puzzle B, which hour): a strip of sand x 22..26 splits the court. The scraped obelisk ob_bw (20,17)
//      stands one pavement cell west of it, ob_be (28,19) one cell east. Dawn: ob_be's long shadow lies west along row 19
//      to the Dune Key chest standing in the sand (24,19). Dusk: ob_bw's long shadow bridges row 17 east to the far bank.
//      Noon (the start): both shadows are short and fall north on pavement, the strip runs. Two groups.
//   C  the Groove (puzzle C, Shove the shade): the standing stone ss_c (30,6) on the groove x 30, rows 4..8. At dawn its
//      shadow falls west on pavement and a wall; Shoved two cells north to the groove's head (30,4) it lies along the
//      corridor row 4, across the sand (26..28,4), into the camp court. dial_b on the east side. One group.
//      The camp court (x 16..25, rows 3..10): memory1_trig (sel_memory_1). Its back door (18,13) into B opens from this
//      side once the memory is seen (the caravan turns back the way it came): the way home from the north half.
//   D  the Sun Plate (behind door_d, the Dune Key): the sun gate gate_d (3,13) to E, and its plate plate_d (10,18) boxed in
//      shade: the stone plt_s (10,20) shades it at noon, the block plt_l (9,18) at dusk, the block plt_m (11,18) at dawn. Shove
//      plt_m north up its groove and set dawn: the plate lights and latches (plate_f1_open), the gate opens. The way to the
//      gate is the sand row 14 (x 4..7) along a colonnade of low blocks: it runs at dawn and dusk and holds only at noon, so
//      the order is forced by reach (latch at dawn, walk at noon). dial_c by the door. A Dash crack (5,12) to the niche
//      with the Nomad Wraps (and the third bell). One group, and one in the corridor from the camp court.
//   E  the Far Court (north-west, through gate_d): a sand pool. Dawn: the tallest obelisk ob_e (14,4) lays its long shadow
//      west along row 4 to the Nomad Sun Key on its island (7,4). Dusk: the stone ss_e (2,3) lays a short one east along
//      row 3 into the dead end with the second bell (7,3). dial_d, the stair down (13,1) with lab_f1_stair. One group.
//
// Every court the sand can cut off has its own dial (dial_a A and B west, dial_b B east and C, dial_c the camp court and
// D, dial_d E); the camp court's back door and the latched gate mean a game saved anywhere reloads (noon, every stone home)
// onto a floor it can walk out of (qa/maps/ep5_b_maps.test.mjs, the reload rule).
// Solution for the bot (dial choices and Shoves): dial_a dawn; chest_dune from (23,19). dial_a dusk; cross row 17 east.
// C: stand (30,7), Shove up; step to (30,6), Shove up (ss_c at 30,4). dial_b dawn; west along row 4 into the camp court
// (memory1_trig). The corridor west, door_d (Dune Key). D: stand (11,19), Shove up (plt_m to 11,17); dial_c dawn (the
// plate latches, gate_d opens); dial_c noon; west along row 14 to (3,14), north through gate_d. E: dial_d dawn, the
// shadow on row 4 to (8,4), open chest_sunkey (7,4); lab_f1_stair, stair_f2. Optional: dial_d dusk for the bell chest
// from (6,3); Dash at crack_d from (5,14) at noon for the Nomad Wraps.
import { wallDepth, door, sign, object, trigger, enemy, chest, lockedDoor, steps, enter, rows } from './_kit.js';

// ------------------------------------------------------------------------------------------------ the Labyrinth kit
// Shared by the four Labyrinth maps (ep5_lab_f2, ep5_lab_f3 and ep5_lab_oracle import it). Pure data helpers.

/**
 * A blank Labyrinth grid: ground chars (all wall '#') and the shade block's sand rows. set/box write a cell (or a
 * rectangle); room() carves a floor with its two face rows above; sand() marks running-sand cells ('s', ground and shade
 * both). finish() runs the W8 wall depth and returns { ground, sand } as row strings.
 */
export function labGrid(W, H) {
  const g = Array.from({ length: H }, () => Array(W).fill('#'));
  const set = (x, y, ch) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = ch; };
  const box = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, ch); };
  const room = (x0, y0, x1, y1, floor = '.', faces = 2) => {
    for (let y = y0 - faces; y < y0; y++) for (let x = x0; x <= x1; x++) if (y >= 0 && g[y][x] === '#') set(x, y, '|');
    box(x0, y0, x1, y1, floor);
  };
  const sand = (x0, y0, x1, y1) => box(x0, y0, x1, y1, 's');
  const finish = () => {
    const ground = rows(wallDepth(g.map((r) => r.join(''))));
    return { ground, sand: ground.map((r) => r.replace(/[^s]/g, '.')) };
  };
  return { g, W, H, set, box, room, sand, finish };
}

/** The legend of a Labyrinth floor for one wall system (dune_court, horizon_gallery, well_shaft) and its floor terrain. */
export function labLegend(sys, floor, extra = {}) {
  return {
    '#': `${sys}_top`, '|': `${sys}_face`, 'o': `${sys}_out_face`, 'v': `${sys}_out_top`,
    '.': floor, 's': 'dune_sand', 'g': 'groove', 'p': 'caravan_paving', '*': 'star_glass',
    ...extra,
  };
}

export const dial = (id, x, y, extra = {}) => ({ id, type: 'sundial', x, y, ...extra });
/** A caster: h 1 low block, 2 standing stone, 3 obelisk (sprite by height unless given). */
export const stone = (id, x, y, h, extra = {}) => ({ id, type: 'standstone', x, y, h, ...extra });
export const lamp = (id, x, y, extra = {}) => ({ id, type: 'lampcart', x, y, r: 3, ...extra });
export const windowEv = (id, x, y, faces, hours, extra = {}) => ({ id, type: 'window', x, y, faces, hours, ...extra });
export const sunPlate = (id, x, y, when, target, extra = {}) => ({ id, type: 'sunplate', x, y, when, target, latch: true, ...extra });
/** A one-cell sun (or moon) gate in a doorway, opened by its plate. */
export const sunGate = (id, x, y, extra = {}) => ({ id, type: 'gate', x, y, w: 1, h: 1, sprite: 'sun_gate', state: 'closed', ...extra });
/** The oasis spring font: rest and save (font_oasis, 2 x 1). */
export const oasisFont = (id, x, y) => ({ id, type: 'font', x, y, w: 2, h: 1, text: 'ep5_oasis_spring', sprite: 'font_oasis', safe: true });
/**
 * A sandstone door that opens from the far side once `flag` is set (the way home from a court the sand cuts off): the
 * closed door is a solid object until the flag, the open doorway after it.
 */
export const backDoor = (id, x, y, flag) => [
  object(`${id}_shut`, x, y, 'door_dune_closed', { ifNot: flag, text: 'ep5_back_door' }),
  object(`${id}_open`, x, y, 'door_dune_open', { if: flag, solid: false, text: 'ep5_back_door_open' }),
];
/** A brass cage lift (a door of kind lift; the cage is drawn as decor on the same cell). */
export const lift = (id, x, y, to, extra = {}) => ({ id, type: 'door', x, y, to, kind: 'lift', ...extra });

// ------------------------------------------------------------------------------------------------ the floor
const W = 40, H = 30;
const L = labGrid(W, H);
const { set, box, room, sand } = L;

room(2, 2, 14, 6);                           // E  the Far Court (faces 0..1)
room(16, 3, 25, 10);                         //    the camp court (faces 1..2)
room(29, 3, 37, 10);                         // C  the Groove (faces 1..2)
room(15, 14, 36, 21);                        // B  Two Shadows (faces 12..13)
room(2, 14, 11, 21);                         // D  the Sun Plate (faces 12..13)
room(14, 25, 24, 28);                        // A  the Oasis Gate (faces 23..24)
room(8, 10, 15, 10);                         //    the corridor from the camp court to D (faces 8..9)
// passages
box(26, 4, 28, 4, '.'); box(26, 2, 28, 3, '|');   // C -> the camp court: the corridor on row 4 (faces 2..3)
box(33, 11, 34, 13, '.');                    // B east -> C
box(18, 11, 18, 13, '.');                    // the camp court's back door (18,13) into B west
box(8, 11, 9, 13, '.');                      // the corridor -> door_d (8..9,13) -> D
box(3, 7, 3, 13, '.');                       // E <- gate_d (3,13) <- D
box(5, 10, 6, 11, '.');                      // the niche behind crack_d (5,12)
box(17, 22, 19, 24, '.');                    // A -> B west, the steps
box(19, 29, 21, 29, '.');                    // A -> Saffron Haven
set(13, 1, '.');                             // E: the stair nook (13,1)
// sand
sand(22, 14, 26, 21);                        // B: the strip
sand(26, 4, 28, 4);                          // C: the corridor sand
sand(4, 14, 7, 14);                          // D: the colonnade path
sand(2, 15, 7, 21); set(4, 15, '.'); set(5, 15, '.'); set(6, 15, '.'); set(7, 15, '.');   // D: the pool (the colonnade on row 15)
sand(5, 2, 12, 5);                           // E: the pool
// grooves and paved approaches
box(30, 4, 30, 8, 'g');                      // C: ss_c's groove
box(11, 17, 11, 18, 'g');                    // D: plt_m's groove
for (const [x, y] of [[29, 4], [25, 4], [21, 17], [27, 19], [27, 17], [21, 19], [3, 14], [2, 14], [13, 4]]) set(x, y, 'p');
box(13, 2, 14, 6, 'p'); box(2, 2, 4, 5, 'p');      // E: the paved banks
box(8, 14, 11, 14, 'p');                     // D: the landing inside the door

const R = L.finish();

// ---------------------------------------------------------------- dressing (decor never stands in a shadow's line)
const decor = [
  // A: the oasis, palms and the gate home
  { t: 'palm', x: 15, y: 28 }, { t: 'palm', x: 24, y: 28 }, { t: 'water_jars', x: 18, y: 25 },
  { t: 'lift_cage', x: 24, y: 25 },
  // B: the court's corners
  { t: 'camel_load', x: 15, y: 14 }, { t: 'water_jars', x: 36, y: 14 },
  // C
  { t: 'camel_load', x: 37, y: 10 },
  // the camp court: the caravan that never left
  { t: 'camp_ruin', x: 22, y: 9 }, { t: 'tent_caravan', x: 16, y: 4 }, { t: 'camel_load', x: 25, y: 10 },
  // D
  { t: 'water_jars', x: 11, y: 21 },
  // E: the stair
  { t: 'stair_sand_down', x: 13, y: 1 },
];

const events = [
  enter('l1_enter', 'lab_f1_arrival'),
  // ---- A: the Oasis Gate
  door('to_haven', 19, 29, ['ep5_saffron', 21, 5, 'down'], { w: 3, if: 'lab_entered' }),
  oasisFont('font_l1', 21, 25),
  dial('dial_a', 16, 26),
  chest('chest_a', 14, 25, 'wood', { item: 'hourglass_sand', qty: 2 }),
  lift('lift_f1', 24, 25, ['ep5_lab_f2', 25, 12, 'down'], { if: 'lab_f2_done' }),
  // ---- B: Two Shadows (puzzle B)
  stone('ob_bw', 20, 17, 3, { sprite: 'obelisk_scraped' }),
  sign('scraped_sign', 20, 17, 'ep5_obelisk_scraped', { solid: false }),
  stone('ob_be', 28, 19, 3),
  chest('chest_dune', 24, 19, 'wood', { item: 'dune_key', flag: 'dune_key_f1' }),
  chest('chest_b', 36, 21, 'iron'),
  enemy('e_bw', 16, 19, 'dune_stalker', 'e5l1_stalkers', 'patrol', { path: steps('up', 2, 'down', 2) }),
  enemy('e_be', 32, 17, 'dune_scarab', 'e5l1_mixed', 'patrol', { path: steps('right', 2, 'left', 2) }),
  ...backDoor('back_b', 18, 13, 'sel_memory_1'),
  // ---- C: the Groove (puzzle C)
  stone('ss_c', 30, 6, 2, { shove: true }),
  dial('dial_b', 36, 4),
  enemy('e_c', 34, 8, 'dust_harrier', 'e5l1_harriers', 'wander', { radius: 1 }),
  // ---- the camp court
  trigger('memory1_trig', 24, 3, 1, 8, 'sel_memory_1'),
  sign('camp_sign', 22, 9, 'ep5_camp_court', { solid: false }),
  enemy('e_cor', 12, 10, 'dune_stalker', 'e5l1_stalkers', 'patrol', { path: steps('left', 2, 'right', 2) }),
  // ---- D: the Sun Plate (puzzle D)
  lockedDoor('door_d', 8, 13, 'dune_key'),
  dial('dial_c', 11, 15),
  ...[4, 5, 6, 7].map((x) => stone(`col_${x}`, x, 15, 1)),
  stone('plt_s', 10, 20, 2),
  stone('plt_l', 9, 18, 1),
  stone('plt_m', 11, 18, 1, { shove: true }),
  sunPlate('plate_d', 10, 18, 'lit', 'gate_d', { flag: 'plate_f1_open' }),
  sunGate('gate_d', 3, 13, { text: 'ep5_sun_gate' }),
  object('crack_d', 5, 12, 'wall_cracked', { breakable: 'rock', text: 'ep5_cracked_base', h: 2, opens: [[5, 12], [5, 13], [5, 11]] }),
  chest('chest_wraps', 5, 10, 'gold', { item: 'nomad_wraps', behind: 'crack_d' }),
  chest('chest_bell3', 6, 10, 'wood', { item: 'caravan_bell', flag: 'bell_3_found', if: 'bells_started', behind: 'crack_d' }),
  enemy('e_d', 9, 21, 'dune_scarab', 'e5l1_mixed', 'guard'),
  // ---- E: the Far Court
  stone('ob_e', 14, 4, 3),
  stone('ss_e', 2, 3, 2),
  chest('chest_sunkey', 7, 4, 'gold', { item: 'sun_key', flag: 'sun_key_found' }),
  chest('chest_bell2', 7, 3, 'wood', { item: 'caravan_bell', flag: 'bell_2_found', if: 'bells_started' }),
  chest('chest_bell2_alt', 7, 3, 'wood', { item: 'hi_potion', qty: 2, ifNot: 'bells_started' }),
  dial('dial_d', 2, 6),
  enemy('e_e', 13, 6, 'silt_reaver', 'e5l1_reavers', 'guard'),
  trigger('stair_trig', 13, 2, 1, 1, 'lab_f1_stair'),
  door('stair_f2', 13, 1, ['ep5_lab_f2', 4, 24, 'down'], { kind: 'stairs' }),
];

export default {
  id: 'ep5_lab_f1', name: 'The Shifting Dunes', area: 'dungeon',
  music: 'labyrinth', ambience: 'desert_wind', tileset: 'ep5',
  lighting: { tint: 'none', dark: 0 },
  under: 'dune_court',
  legend: labLegend('dune_court', 'dune_court'),
  ground: R.ground,
  shade: { hour: 'noon', sand: R.sand },
  overlays: [],
  decor,
  overhead: [],
  events,
  exits: [],
  marks: {
    start: [20, 27], font: [21, 26], scraped: [20, 17], dial_a: [16, 27], dial_b: [36, 5], dial_c: [10, 15], dial_d: [3, 6],
    two_shadows: [24, 17], dune_chest: [23, 19], groove_c: [30, 7],
    camp: [20, 6], camp_stage: [20, 8], camp_stage_m: [19, 8], camp_stage_b: [21, 8], camp_tamir: [19, 6], camp_student: [21, 6],
    camp_child: [20, 5], camp_traveler: [22, 6], camp_out: [18, 10],
    plate_d: [10, 18], plate_shove: [11, 19], gate_d: [3, 14], far_court: [8, 6], sun_key: [8, 4], stair_down: [13, 2],
    lift_f1: [24, 26],
  },
  start: { x: 20, y: 27, dir: 'up' },
};
