// The Chart Room (Zephyr Landing, in the Signal Beacon tower). EPISODE6_PLAN 4.3: the chapel's layout and exit (chapel.js),
// re-dressed: flight manifests pinned on every wall (inspect ep6_manifest_wall; the book flight_manifests on the stand),
// the Captain's Brass Skychart on its long table (skychart, 4..6, 5), Suri at the chart racks in the tower base
// (suri_spot (14,5)), the save bell. charts_trig is the whole row two tiles inside the door (y 11): chart_room (if
// met_aeris). Exact cells in docs/MAPS_EP6_A.md section 4.
import { rows, npc, door, sign, trigger, book } from './_kit.js';

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
  '#..........#.....#', // 7
  '#..........#.....#', // 8
  '#..........#.....#', // 9
  '#................#', // 10  doorway into the tower base at (11,10)
  '#..........#.....#', // 11
  '#..........#######', // 12
  '#########.########', // 13  door at (9,13)
  '##################', // 14
]);

const RES = 'isles_restored';
const manifests = (id, x, y) => [
  sign(id, x, y, 'ep6_manifest_wall', { w: 2, sprite: 'star_charts', state: 0, ifNot: RES }),
  sign(`${id}_new`, x, y, 'ep6_manifest_wall', { w: 2, sprite: 'star_charts', state: 1, if: RES }),
];

export default {
  id: 'ep6_zl_charts', name: 'The Chart Room', area: 'interior',
  music: 'mystery', ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  under: 'stone_floor',
  legend: { '#': 'interior_stone_top', '|': 'interior_stone_face', '.': 'stone_floor' },
  ground,
  overlays: [
    { t: 'window_in_curtain_blue', x: 5, y: 1 }, { t: 'window_in', x: 13, y: 1 },
    // the blue runner from the door to the skychart
    ...[9].flatMap((x) => [7, 8, 9, 10, 11, 12, 13].map((y) => ({ t: 'carpet_blue', x, y }))),
    ...[5, 6, 7, 8].map((x) => ({ t: 'carpet_blue', x, y: 7 })),
    { t: 'in_pot', x: 1, y: 3 }, { t: 'in_pot', x: 10, y: 3 }, { t: 'in_crate', x: 16, y: 11 },
  ],
  decor: [
    { t: 'lantern_hanging', x: 2, y: 5 }, { t: 'lantern_hanging', x: 8, y: 5 },
    { t: 'rug_round', x: 1, y: 11 }, { t: 'lectern', x: 1, y: 7 },     // the stand with the flight manifests
    // the tower base: chart racks, Suri's drafting table, the hand-bell stand
    { t: 'card_cabinet', x: 12, y: 3 }, { t: 'card_cabinet', x: 12, y: 6 },
    { t: 'reading_table', x: 14, y: 8 },
    { t: 'lantern_hanging', x: 16, y: 6 },
    { t: 'signboard', x: 12, y: 11 },
  ],
  overhead: [],
  events: [
    trigger('charts_trig', 1, 11, 10, 1, 'chart_room', { if: 'met_aeris' }),
    { id: 'skychart', type: 'object', x: 4, y: 5, w: 3, sprite: 'table_long', text: 'ep6_skychart' },
    npc('suri', 14, 5, 'down'),
    door('charts_exit', 9, 13, ['ep6_zephyr', 5, 10, 'down']),
    { id: 'save_bell_charts', type: 'save', x: 12, y: 11, text: 'ep6_charts_bell' },
    ...manifests('manifests_west', 2, 2), ...manifests('manifests_east', 7, 2), ...manifests('manifests_wing', 15, 2),
    book('manifest_book', 1, 7, 'flight_manifests', { solid: false }),
  ],
  exits: [],
  marks: {
    charts_stage: [7, 6], charts_stage_m: [6, 6], charts_stage_b: [8, 6], aeris_table: [7, 4],
    liora_door: [9, 12], suri_spot: [14, 5],
  },
  start: { x: 9, y: 12, dir: 'up' },
};
