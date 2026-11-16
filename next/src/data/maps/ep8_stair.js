// The Stair of Written Light (30 x 60, field, tall; EPISODE8_PLAN 4.1). Exact cells, book solutions and margins in
// docs/MAPS_EP8_A.md 2. Broad steps of gold handwriting (script_step) climbing from the Stillheart roof (the foot, south)
// through the violet void (void_violet) to the South Margin (north). Four pop-up books (E8-world's popbooks block):
//
//   The foot (11..19, 49..57). stair_bottom (15,57) = story.js STAIR_FOOT, where ep8_roof warps; the stair down stair_down
//      (15,58) to ep7_stillheart (20,10) from stair_arrived; stair_arrival on enter; a wood chest (12,55). From
//      saw_scriptorium the page lift lift_foot (19,56) rises to the South Margin (lift_margin (19,13)): two-way, so the
//      Stair can be walked down again once its books are learned (the books cannot be read from their far banks).
//   The first rub. rub_row (10..20, 48) runs first_rub (hounds at foes_drop (15,45), foes_drop_b (17,45)); the placed group
//      e8s_hounds (19,45) from first_rub_done. e_e8s_first (15,46) is the plan anchor of the scripted fight, never present.
//   Gap A (void 41..42 and the notch 14..15, 43): Lesson A. The Willowmere book pb_willow (book a, ns at 14..15, 44, length
//      3), read from the south (foes_drop is its reading cell), bridges north over 41..43 to the landing (12..19, 39..40).
//      The party steps on from (13,43) or (16,43). first_trig (10..20, 47) runs first_book. 1 decision.
//   Gap B (void 32..34): Lesson B, the side decides the way. The column (12, 35..38) climbs from the landing to the strip
//      (12..17, 35), which passes the NORTH side of pb_b (book b, ns at 14..15, 36, length 4): read from there, its pages
//      fall back south over the pocket and the stair below as walls. Walk round by (16, 36) to the pocket (14..16, 37) and
//      read it from the south: its pages wall the strip (14..15, 35) and bridge the gap (32..34) to the desk landing; step
//      on from (13,34) or (16,34). 1 decision. Optional: the ledge book pb_ledge (book l, ew at 19, 39..40, length 3) read
//      from the west bridges east (20..22, 39..40; step on from (20,38)) to the side ledge (23..26, 37..41) and its iron chest
//      (25,39): Quinn's page #1 if drift_started, else a Hi-Ether. 1 optional decision. The cranes (19,30) on the far side.
//   The reading desk (10..20, 26..31). The desk (18..19, 26): rest and save, its own key ep8_desk. The gold chest, the
//      Forgotten Traveler Satchel (10,30): 2,000 gold (E8-battle EP8_GOLD_LINE). rubbed_trig (10..20, 27) runs rubbed_steps: the figure at eraser_far
//      (15,14) walks down to eraser_low (15,18) on the high stair and back; from eraser_seen its line stays blank.
//   Gap C (void 24..25 and 19..20, the island 12..17, 21..23): Lesson C, pages are walls too. pb_c (book c, ns at 14..15, 22,
//      length 3) STARTS OPEN to the south: its pages bridge the lower gap (24..25) from the desk landing and stand as a wall
//      on the island (14..15, 23). Cross, step off by (13,24) or (16,24), close it from its far (north) side (14,21), then
//      read it from the south (14,23): its pages wall the island's north row and bridge the upper gap (19..20) to the high
//      stair; step on from (13,20) or (16,20). 2 decisions (bark first_wall on the second).
//   The South Margin (11..19, 11..13; the arch 13..17, 9..10). margin_trig (11..19, 11) runs south_margin; the exit (14..16, 9)
//      to ep8_scriptorium south_gate; library_far (overhead, 10..20, 0..7) over the void beyond the gate.
// Main-path decisions 4 (A 1, B 1, C 2), optional 1 (the ledge). Every focus mark of STAGING_EP8 sits in x 12..17, y 7..52.
import { grid, box, put, rows, trigger, enter, door, chest, enemy, sign } from './_kit.js';

const W = 30, H = 60;
const g = grid(W, H, 'V');
// the South Margin: the arch's passage and the gold landing
box(g, 19, 9, 23, 10, 's');
box(g, 11, 11, 24, 13, 'g');
// the high stair (beyond Gap C)
box(g, 11, 14, 19, 18, 's');
// Gap C: the island between the upper gap (19..20) and the lower gap (24..25), with its four step-on cells
box(g, 12, 21, 17, 23, 's');
for (const [x, y] of [[13, 20], [16, 20], [13, 24], [16, 24]]) put(g, x, y, 's');
// the reading desk landing
box(g, 10, 26, 20, 31, 's');
box(g, 17, 26, 20, 27, 'g');
// Gap B: the strip on the gap's edge, its two step-on cells, the column up from the landing, the way round, the pocket
box(g, 14, 35, 17, 35, 's');
put(g, 14, 34, 's'); put(g, 17, 34, 's');
box(g, 14, 36, 14, 38, 's');
put(g, 15, 36, 'sss');
box(g, 16, 37, 17, 37, 's');
// the landing above Gap A, the ledge book's step-on corner, and the side ledge
box(g, 13, 39, 19, 40, 's');
put(g, 18, 38, 'ss'); put(g, 20, 38, 's');
box(g, 22, 37, 25, 41, 's');
// Gap A's near bank (the notch at 14..15, 43 stays void) and the foot
box(g, 10, 43, 20, 48, 's');
put(g, 14, 43, 'VV');
box(g, 11, 49, 19, 57, 's');
put(g, 15, 58, 's');
const ground = rows(g);

const ARR = 'stair_arrived';

const events = [
  { ...enter('stair_enter', 'stair_arrival'), if: 'ep8_roofed', ifNot: ARR },
  // the foot
  door('stair_down', 15, 58, ['ep7_stillheart', 20, 10, 'down'], { kind: 'stairs', if: ARR }),
  door('lift_foot', 19, 56, ['ep8_stair', 23, 13, 'down'], { kind: 'lift', sprite: 'lift_page', if: 'saw_scriptorium' }),
  chest('chest_foot', 12, 55, 'wood', { item: 'hi_potion', qty: 2 }),
  sign('script_step', 15, 54, 'ep8_script_step', { solid: false }),
  sign('void_foot', 10, 53, 'ep8_void'),
  // the first rub, then the first book
  trigger('rub_row', 10, 49, 11, 1, 'first_rub', { if: ARR, ifNot: 'first_rub_done' }),
  trigger('first_trig', 10, 48, 11, 1, 'first_book', { if: 'first_rub_done', ifNot: 'first_book_read' }),
  enemy('e_e8s_first', 11, 46, 'index_hound', 'e8s_first', 'guard', { if: 'first_rub_done', ifNot: 'first_rub_done' }),
  enemy('e_e8s_hounds', 19, 45, 'index_hound', 'e8s_hounds', 'wander', { radius: 1, if: 'first_rub_done' }),
  sign('rubbed_line', 19, 50, 'ep8_rubbed_line', { solid: false }),
  // Gap A: the Willowmere book
  { id: 'pb_willow', type: 'popbook', book: 'a', x: 14, y: 44, text: 'ep8_realm_willowmere' },
  sign('book_note', 11, 45, 'ep8_book_shut', { solid: false }),
  // Gap B: the book read from the far side; the ledge book and its chest
  { id: 'pb_b', type: 'popbook', book: 'b', x: 15, y: 36 },
  { id: 'pb_ledge', type: 'popbook', book: 'l', x: 19, y: 39 },
  chest('chest_ledge_page', 24, 39, 'iron', { item: 'drift_page', qty: 1, flag: 'drift_1_found', if: 'drift_started' }),
  chest('chest_ledge', 24, 39, 'iron', { item: 'hi_ether', qty: 1, ifNot: 'drift_started' }),
  enemy('e_e8s_cranes', 19, 30, 'paper_crane', 'e8s_cranes', 'wander', { radius: 1 }),
  // the reading desk: rest and save (its own key), the satchel, the figure on the stair
  { id: 'desk_save', type: 'font', x: 18, y: 26, w: 2, h: 1, text: 'ep8_desk', sprite: 'reading_desk', safe: true },
  chest('satchel', 10, 30, 'gold', { gold: 2000 }),
  trigger('rubbed_trig', 10, 27, 11, 1, 'rubbed_steps', { if: 'first_book_read', ifNot: 'eraser_seen' }),
  // Gap C: the book that starts open as a wall
  { id: 'pb_c', type: 'popbook', book: 'c', x: 14, y: 22 },
  sign('book_open_note', 12, 22, 'ep8_book_open', { solid: false }),
  // the South Margin
  trigger('margin_trig', 11, 11, 14, 1, 'south_margin', { if: ARR, ifNot: 'saw_scriptorium' }),
  door('lift_margin', 24, 13, ['ep8_stair', 18, 56, 'down'], { kind: 'lift', sprite: 'lift_page', if: 'saw_scriptorium' }),
  sign('margin_arch_w', 19, 10, 'ep8_margin_arch'),
  sign('margin_arch_e', 23, 10, 'ep8_library_far'),
];

export default {
  id: 'ep8_stair', name: 'The Stair of Written Light', area: 'field',
  music: 'orrery', ambience: 'sky_wind', tileset: 'ep8',
  lighting: { tint: 'none', dark: 0 },
  ambientFx: ['motes'],
  under: 'void_violet',
  legend: { V: 'void_violet', s: 'script_step', g: 'goldscript' },
  ground,
  // from eraser_seen the line the figure walked stays blank (a plain page strip down the high stair)
  overlays: [14, 15, 16, 17, 18].map((y) => ({ t: 'parchment', x: 15, y, if: 'eraser_seen' })),
  decor: [
    { t: 'margin_arch', x: 19, y: 10 },
    { t: 'goldscroll', x: 11, y: 13 }, { t: 'quill', x: 12, y: 13 },
    { t: 'quill', x: 11, y: 50 }, { t: 'goldscroll', x: 19, y: 52 },
    { t: 'goldscroll', x: 25, y: 37 },
  ],
  overhead: [{ t: 'library_far', x: 16, y: 0 }],
  popbooks: {
    books: {
      a: { x: 14, y: 44, axis: 'ns', length: 3, realm: 'willowmere' },
      b: { x: 15, y: 36, axis: 'ns', length: 4 },
      c: { x: 14, y: 22, axis: 'ns', length: 3 },
      l: { x: 19, y: 39, axis: 'ew', length: 2 },
    },
    start: { c: 's' },
    goal: ['north_exit'],
  },
  events,
  exits: [{ x: 20, y: 9, w: 3, h: 1, to: ['ep8_scriptorium', 23, 34, 'up'] }],
  marks: {
    start: [15, 57], stair_bottom: [15, 57],
    nox_foot: [16, 50], foot_stage: [15, 52], foot_stage_m: [14, 52], foot_stage_b: [16, 52],
    rub_row: [15, 49], foes_drop: [15, 45], foes_drop_b: [17, 45],
    gap_a: [15, 42], nox_gap_a: [17, 44], gap_a_stage: [17, 46], gap_a_stage_m: [16, 46], gap_a_stage_b: [18, 46],
    gap_b: [16, 33], ledge_b: [23, 39],
    desk: [18, 26], nox_desk: [14, 27], desk_stage: [14, 29], desk_stage_m: [13, 29], desk_stage_b: [15, 29],
    eraser_far: [15, 14], eraser_low: [15, 18], gap_c: [15, 22],
    margin: [17, 11], library_far: [17, 8], north_exit: [21, 9],
    lift_top: [23, 13], lift_bottom: [18, 56],
  },
  start: { x: 15, y: 57, dir: 'up' },
};
