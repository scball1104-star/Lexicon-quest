// The Oracle Labyrinth, III: The Well of Tomorrow (32 x 40, dungeon, hour night, dark 0.55). EPISODE5_PLAN 4.8; exact
// cells and every solution in docs/MAPS_EP5_B.md. Night inside the earth: no sun, no dial. The only light is the
// sun-lamps on their rails, and the rule is the episode's one rule: the lamplight runs the sand, the dark holds it. Each
// lamp lights every cell within 3 (a square) except the cells of its own row and column that stand behind a stone.
// The darkest map of the episode. The shaft goes down in landings, north to south, each one stair below the last.
//
//   Top (rows 3..6): the stair from Floor II (15..16,2), arrival (16,3), the last spring font, the vows on their stand,
//      a fixed lamp running a bed of sand (the lesson shown, nothing at stake). lab_f3_arrival, then sel_walks_in.
//   Shelter (rows 10..15): ONE LAMP ON A RAIL. The moat (x 14..18, rows 12..13) runs under lamp_s (17,11). Shove it
//      east along its groove (row 11, x 17..21) to (21,11) and the moat's west four columns fall dark: cross to the island
//      (rows 14..15). shelter_trig at the island's edge runs landing_shelter at spring_shelter. One group.
//   Truth (rows 19..24): A LAMP AND A STONE. The fixed lamp lamp_t (16,19) runs the moat (x 13..19, rows 21..22). The
//      stone ss_t rides its groove on row 20 (x 13..16) from (14,20): Shove it east twice, between the lamp and the moat,
//      and the lamp's column behind it, (16,21) and (16,22), falls dark: from the ledge (15,21) down the column to the
//      island. Keeper marks under the sand: a faint ink bridge (7,24) over the shaft's edge to the Starwright's Bow, read
//      only by the Lantern. Iron chest. Two groups.
//   Return (rows 28..33): TWO LAMPS, ONE STONE, A SHADE PLATE. The moon plate plate_r (16,30) opens the moon gate
//      (16,31) to the last spring only in the dark. The stone (14,30) already keeps lamp_r1's row off it; lamp_r2 (18,29)
//      still reaches it across the diagonal. Shove lamp_r2 east twice to (20,29), out of reach: the plate falls dark and
//      latches. return_trig runs landing_return (then sel_memory_3) at spring_return; Ishra's page under it. One group.
//      Once filled, spring_return is a rest and save font (the last before the Eye; E5-fixes B5).
//   The Sun Keyhole (rows 37..38): the stair down from Return; door_oracle (15..17,36), the Nomad Sun Key, once
//      oracle_door_open; the hourglass chest.
// Every landing is two-way by its stairs, and the two islands a lamp or a stone cuts off have a brass lift to the top,
// so a game saved anywhere reloads (every lamp and stone home, latched plates kept) onto a floor it can walk out of.
// Solution for the bot (Shoves): Shelter: stand (16,11), Shove right x4 (lamp_s to 21,11; step east after each).
// Truth: stand (13,20), Shove right; step (14,20), Shove right (ss_t at 16,20); (15,21), down column 16 to the island.
// Return: stand (17,29), Shove right; step (18,29), Shove right (lamp_r2 at 20,29): plate_r latches; through the
// gate. Keyhole: door_oracle with the Sun Key. Optional: the Lantern at the faint bridge (7,24) for the Bow.
import { door, sign, object, trigger, enemy, chest, lockedDoor, enter, book, light, pit } from './_kit.js';
import { labGrid, labLegend, stone, lamp, sunPlate, sunGate, oasisFont, lift } from './ep5_lab_f1.js';

const W = 32, H = 40;
const L = labGrid(W, H);
const { set, box, room, sand } = L;

room(8, 3, 23, 6);                           // Top (faces 1..2)
room(4, 10, 27, 15);                         // Shelter (faces 8..9)
room(4, 19, 27, 24);                         // Truth (faces 17..18)
room(4, 28, 27, 33);                         // Return (faces 26..27)
room(10, 37, 22, 38);                        // the Sun Keyhole (faces 35..36)
// Shelter: walls either side of the moat; Truth: walls either side of the moat and the shaft's edge
box(4, 12, 13, 13, '#'); box(19, 12, 27, 13, '#');
box(4, 21, 12, 23, '#'); box(20, 21, 27, 23, '#'); set(13, 23, '#'); set(19, 23, '#');
box(4, 24, 5, 24, '#'); box(20, 23, 27, 23, '.'); box(7, 23, 12, 23, '.');   // Truth's island widens either side of the moat
// Return: the wall between the plate and the last spring, the gate's doorway
box(4, 31, 27, 31, '#'); set(16, 31, '.');
// doorways in the faces: the stairs and the keyhole
box(15, 1, 16, 2, '.');                      // Top: the stair up to Floor II
box(15, 8, 16, 9, '.');                      // Shelter: the stair up to the top
box(9, 17, 10, 18, '.');                     // Truth: the stair up to Shelter
box(9, 26, 10, 27, '.');                     // Return: the stair up to Truth
box(21, 35, 22, 36, '.');                    // the Keyhole: the stair up to Return
box(15, 35, 17, 36, '.');                    // the Sun Keyhole's doorway
// sand: the top's lamp bed, the moats, the beds by Return's lamps
sand(22, 3, 23, 6);
sand(14, 12, 18, 13);
sand(13, 21, 19, 22); sand(14, 23, 18, 23); set(15, 21, '.');
sand(10, 30, 12, 30); sand(19, 30, 22, 30);
// the shaft's edge on Truth's island (a void under the faint ink bridge)
set(7, 24, 'x'); set(6, 24, '.');
// grooves
box(17, 11, 21, 11, 'g');                    // Shelter: lamp_s
box(13, 20, 16, 20, 'g');                    // Truth: ss_t
box(18, 29, 20, 29, 'g');                    // Return: lamp_r2

const R = L.finish();

// ---------------------------------------------------------------- dressing (no dressing stands in a lamp's row or column)
const decor = [
  { t: 'stairs_up', x: 15, y: 2 }, { t: 'stair_well_down', x: 16, y: 6 },
  { t: 'stairs_up', x: 15, y: 9 }, { t: 'stair_well_down', x: 22, y: 15 }, { t: 'lift_cage', x: 25, y: 14 },
  { t: 'vow_stone', x: 7, y: 14, state: 0 },
  { t: 'stairs_up', x: 9, y: 18 }, { t: 'stair_well_down', x: 22, y: 24 }, { t: 'lift_cage', x: 25, y: 24 },
  { t: 'vow_stone', x: 20, y: 23, state: 1 },
  { t: 'stairs_up', x: 9, y: 27 }, { t: 'stair_well_down', x: 22, y: 33 },
  { t: 'vow_stone', x: 10, y: 32, state: 2 },
  { t: 'stairs_up', x: 21, y: 36 },
];

// rest: the filled spring is a rest and save font too (the last landing's: E5-fixes B5, PLAYTEST_REVIEW_7 item 4)
const springs = (n, id, x, y, flag, rest = false) => [
  object(id, x, y, 'spring', { w: 2, state: 0, text: `ep5_${id}`, script: flag, ifNot: flag }),
  object(`${id}_full`, x, y, 'spring', { w: 2, state: 1, text: `ep5_${id}`, if: flag, ...(rest ? { safe: true, rest: true } : {}) }),
];

const events = [
  enter('l3_enter', 'lab_f3_arrival'),
  // ---- Top
  door('stairs_f2', 15, 2, ['ep5_lab_f2', 22, 12, 'down'], { kind: 'stairs', w: 2 }),
  oasisFont('font_l3', 10, 4),
  book('book_vows', 13, 3, 'well_vows'),
  lamp('lamp_top', 21, 4),
  sign('shaft_sign', 8, 6, 'ep5_well_shaft', { solid: false }),
  door('down_shelter', 16, 6, ['ep5_lab_f3', 16, 10, 'down'], { kind: 'stairs' }),
  // ---- Shelter: one lamp on a rail
  door('up_top_s', 15, 9, ['ep5_lab_f3', 17, 6, 'down'], { kind: 'stairs', w: 2 }),
  lamp('lamp_s', 17, 11, { shove: true }),
  trigger('shelter_trig', 14, 14, 5, 1, 'landing_shelter'),
  ...springs(1, 'spring_shelter', 8, 14, 'landing_shelter'),
  door('down_truth', 22, 15, ['ep5_lab_f3', 11, 19, 'down'], { kind: 'stairs' }),
  lift('lift_s', 25, 14, ['ep5_lab_f3', 11, 6, 'down']),
  enemy('e_s', 6, 11, 'horizon_shade', 'e5l3_shades', 'patrol', { path: ['right', 'right', 'left', 'left'] }),
  // ---- Truth: a lamp and a stone
  door('up_shelter', 9, 18, ['ep5_lab_f3', 21, 15, 'left'], { kind: 'stairs', w: 2 }),
  lamp('lamp_t', 16, 19),
  stone('ss_t', 14, 20, 2, { shove: true }),
  trigger('truth_trig', 14, 24, 5, 1, 'landing_truth'),
  ...springs(2, 'spring_truth', 9, 24, 'landing_truth'),
  { id: 'keeper_marks', type: 'pit', x: 7, y: 24, w: 1, h: 1, to: ['ep5_lab_f3', 8, 24, 'left'] },
  chest('chest_bow', 6, 24, 'gold', { item: 'starwright_bow' }),
  chest('chest_truth', 26, 19, 'iron'),
  door('down_return', 22, 24, ['ep5_lab_f3', 10, 28, 'down'], { kind: 'stairs' }),
  lift('lift_t', 25, 24, ['ep5_lab_f3', 11, 6, 'down']),
  enemy('e_t', 24, 20, 'tomorrow_husk', 'e5l3_husks', 'guard'),
  enemy('e_t2', 12, 20, 'horizon_shade', 'e5l3_shades', 'guard'),
  // ---- Return: two lamps, one stone, a shade plate
  door('up_truth', 9, 27, ['ep5_lab_f3', 21, 24, 'left'], { kind: 'stairs', w: 2 }),
  lamp('lamp_r1', 13, 30),
  stone('ss_r', 14, 30, 2),
  lamp('lamp_r2', 18, 29, { shove: true }),
  sunPlate('plate_r', 16, 30, 'shade', 'gate_r', { sprite: 'sun_plate' }),
  sunGate('gate_r', 16, 31, { sprite: 'moon_gate' }),
  trigger('return_trig', 16, 32, 1, 1, 'landing_return'),
  ...springs(3, 'spring_return', 11, 32, 'landing_return', true),
  object('page', 11, 33, 'page_glass', { state: 0, text: 'ep5_page_glass', ifNot: 'sel_memory_3' }),
  object('page_gone', 11, 33, 'page_glass', { state: 1, text: 'ep5_page_glass', solid: false, if: 'sel_memory_3' }),
  door('down_keyhole', 22, 33, ['ep5_lab_f3', 22, 37, 'down'], { kind: 'stairs' }),
  enemy('e_r', 24, 28, 'tomorrow_husk', 'e5l3_mixed', 'guard'),
  // ---- the Sun Keyhole
  door('up_return', 21, 36, ['ep5_lab_f3', 21, 33, 'left'], { kind: 'stairs', w: 2 }),
  object('keyhole_shut', 15, 36, 'sun_keyhole_closed', { w: 3, text: 'ep5_sun_keyhole', ifNot: 'oracle_door_open' }),
  lockedDoor('door_oracle', 15, 36, 'sun_key', ['ep5_lab_oracle', 11, 18, 'up'], { w: 3, sprite: 'sun_keyhole', text: 'ep5_sun_keyhole', if: 'oracle_door_open' }),
  chest('chest_hourglass', 11, 38, 'wood', { item: 'hourglass_sand', qty: 2 }),
  light('l_keyhole', 16, 37, 3, '#ffd27a'),
];

export default {
  id: 'ep5_lab_f3', name: 'The Well of Tomorrow', area: 'dungeon',
  music: 'mystery', ambience: 'well_hush', tileset: 'ep5',
  lighting: { tint: 'none', dark: 0.55 },
  under: 'well_basalt',
  legend: labLegend('well_shaft', 'well_basalt', { 'x': 'pit' }),
  ground: R.ground,
  shade: { hour: 'night', sand: R.sand, roof: true },
  pitTo: ['ep5_lab_f3', 8, 24, 'left'],
  overlays: [{ t: 'ink_bridge_h_faint', x: 7, y: 24 }],
  decor,
  overhead: [],
  events,
  exits: [],
  marks: {
    arrival: [16, 3], start: [16, 3], stair_above: [15, 2], sel_top: [19, 4], top_stage: [19, 6], top_stage_m: [18, 6], top_stage_b: [20, 6],
    font: [10, 5],
    shelter: [10, 14], sel_wait_1: [10, 14], shelter_stage: [12, 14], shelter_stage_m: [11, 14], shelter_stage_b: [13, 14],
    lamp_s_shove: [16, 11],
    truth: [11, 24], sel_wait_2: [11, 24], truth_stage: [13, 24], truth_stage_m: [12, 24], truth_stage_b: [14, 24],
    ss_t_shove: [13, 20], truth_ledge: [15, 21], bow: [6, 24],
    return: [12, 32], sel_wait_3: [13, 32], return_stage: [15, 32], return_stage_m: [14, 32], return_stage_b: [16, 32],
    lamp_r2_shove: [17, 29], plate_r: [16, 30],
    page_spot: [11, 33], page_sel: [12, 33], page_stage: [14, 33], page_stage_m: [13, 33], page_stage_b: [15, 33],
    keyhole: [16, 37],
  },
  start: { x: 16, y: 3, dir: 'down' },
};
