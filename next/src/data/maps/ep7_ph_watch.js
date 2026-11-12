// The Keeper's Watch (Palehaven). EPISODE7_PLAN 4.4: the chapel's layout and exit (chapel.js), two floor rows shorter so the
// room fits one screen both ways (18 x 13: the camera never moves, so the camera rule does not apply), re-dressed as the
// Keeper's room: letters face down on every table (face up from doors_reopened), the Keeper's chair by the shuttered window,
// an empty frame on the wall, the cold lamp. The inner room (the chapel's tower base) holds the stove, the save bell with its
// own text key ep7_watch_bell, and from doors_reopened three cots (watch_cots, a rest): watch_cot (14,5) is the post-credits
// wake point, where Episode 8 opens (2026-11-11). The Keepers' oath is cut over the inner doorway. watch_trig is the whole
// row two tiles inside the door (y 9): keeper_and_vex. After nox_named Nox stands at her chair. Exact cells in
// docs/MAPS_EP7_A.md 5.
import { rows, npc, door, sign, trigger, object } from './_kit.js';

const ground = rows([
  //0         1
  //012345678901234567
  '##################', // 0
  '#||||||||||#|||||#', // 1
  '#||||||||||#|||||#', // 2
  '#..........#.....#', // 3
  '#..........#.....#', // 4
  '#..........#.....#', // 5
  '#..........#.....#', // 6
  '#................#', // 7   the inner doorway at (11,7)
  '#..........#.....#', // 8
  '#..........#.....#', // 9
  '#..........#######', // 10
  '#########.########', // 11  door at (9,11)
  '##################', // 12
]);

const REO = 'doors_reopened';

export default {
  id: 'ep7_ph_watch', name: "The Keeper's Watch", area: 'interior',
  music: 'mystery', ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0.2 },
  under: 'stone_floor',
  legend: { '#': 'interior_stone_top', '|': 'interior_stone_face', '.': 'stone_floor' },
  ground,
  overlays: [
    { t: 'window_in_night', x: 7, y: 1 },          // the shuttered window by her chair
    { t: 'window_in', x: 14, y: 1 },
    ...[3, 4, 5, 6, 7, 8, 9, 10].map((y) => ({ t: 'carpet_blue', x: 9, y })),
    { t: 'carpet_blue', x: 9, y: 11 },
    { t: 'in_pot', x: 1, y: 3 }, { t: 'in_crate', x: 16, y: 9 },
  ],
  decor: [
    // letters face down on every surface
    { t: 'table_long', x: 2, y: 9 }, { t: 'table_round', x: 6, y: 9 }, { t: 'reading_table', x: 2, y: 6 },
    { t: 'card_cabinet', x: 9, y: 3 },
    { t: 'lantern_hanging', x: 4, y: 4 },
    { t: 'courier_stove', x: 15, y: 8, state: 1 },   // the stove of the inner room
    { t: 'signboard', x: 12, y: 3 },               // the hand-bell stand (save_bell_watch)
  ],
  overhead: [],
  events: [
    door('watch_exit', 9, 11, ['ep7_palehaven', 21, 12, 'down']),
    trigger('watch_trig', 1, 9, 10, 1, 'keeper_and_vex', { if: 'met_keeper', ifNot: 'keeper_told' }),
    // the Keeper's room
    sign('letters', 2, 9, 'ep7_letters_face', { w: 3 }),
    sign('letters_round', 6, 9, 'ep7_letters_face', { w: 2 }),
    sign('empty_frame', 3, 2, 'ep7_empty_frame'),
    sign('cold_lamp', 7, 2, 'ep7_cold_lamp'),
    { id: 'watch_lamp', type: 'light', x: 4, y: 4, r: 3 },
    { id: 'watch_morning', type: 'light', x: 7, y: 3, r: 5, if: REO },
    sign('watch_oath', 11, 6, 'ep7_watch_oath'),
    // the inner room: the save bell (its own key), the cots from doors_reopened (a rest)
    { id: 'save_bell_watch', type: 'save', x: 12, y: 3, text: 'ep7_watch_bell' },
    object('watch_cots', 13, 4, 'watch_cots', { text: 'ep7_watch_cots', rest: true, safe: true, if: REO }),
    npc('nox_t', 5, 5, 'down'),
  ],
  exits: [],
  marks: {
    keeper_chair: [5, 5], watch_stage: [5, 7], watch_stage_m: [4, 7], watch_stage_b: [6, 7],
    vex_door: [9, 10], vex_door_out: [9, 11], frame: [3, 3], watch_cot: [14, 5],
  },
  start: { x: 9, y: 10, dir: 'up' },
};
