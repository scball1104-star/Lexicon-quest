// The Courier's Waystation (14 x 10, interior). EPISODE7_PLAN 4.2; exact cells in docs/MAPS_EP7_A.md 3.
//
// A courier's rest hut on the White Road: the cold stove on the west wall (a rest and save once saw_sevens is set: its own
// text key ep7_stove, never a bell line), a plank bench, the post box, the tally on the inner wall (the close-up ep7_tally),
// Sol behind his counter as sol_waystation (shop waystation_pack), and the woodpile in the north-east corner: Shove it down
// (Bram) and the wood chest behind it opens up (optional, plan 5.5). tally_trig is the whole row two tiles inside the door
// (y 6): waystation. The room fits one screen (14 x 10), so the camera rule does not apply.
import { rows, npc, door, sign, trigger, chest, object } from './_kit.js';

const ground = rows([
  //01234567890123
  '##############', // 0
  '#||||||||||||#', // 1
  '#||||||||||||#', // 2
  '#............#', // 3
  '#............#', // 4
  '#.......CCC..#', // 5   Sol's counter
  '#............#', // 6   tally_trig
  '#............#', // 7
  '#######.######', // 8   door at (7,8)
  '##############', // 9
]);

export default {
  id: 'ep7_waystation', name: "The Courier's Waystation", area: 'interior',
  music: 'high_moor', ambience: null, tileset: 'interior',   // no wind indoors: an ambience has no volume of its own (MAPS_EP7_A.md 3)
  lighting: { tint: 'none', dark: 0 },
  under: 'wood_floor',
  legend: { '#': 'interior_wood_top', '|': 'interior_wood_face', '.': 'wood_floor', 'C': 'counter' },
  ground,
  overlays: [
    { t: 'window_in', x: 3, y: 1 }, { t: 'window_in', x: 10, y: 1 },
    { t: 'in_crate', x: 12, y: 3 }, { t: 'in_crate', x: 12, y: 5 },    // the woodpile's niche
    { t: 'in_barrel', x: 1, y: 7 },
    { t: 'carpet_red', x: 7, y: 8 },
  ],
  decor: [
    { t: 'tally_frame', x: 5, y: 2 },            // the tally, cut into the inner wall
    { t: 'bench', x: 2, y: 7 },
    { t: 'lantern_hanging', x: 7, y: 4 },
  ],
  overhead: [],
  events: [
    door('waystation_exit', 7, 8, ['ep7_white_road', 24, 20, 'down']),
    trigger('tally_trig', 1, 6, 12, 1, 'waystation', { if: 'road_arrived', ifNot: 'saw_sevens' }),
    npc('sol_waystation', 9, 4, 'down'),
    // the stove: cold, then lit (a rest and save from saw_sevens)
    object('stove', 1, 4, 'courier_stove', { state: 0, text: 'ep7_stove', ifNot: 'saw_sevens' }),
    object('stove_lit', 1, 4, 'courier_stove', { state: 1, text: 'ep7_stove', safe: true, rest: true, if: 'saw_sevens' }),
    { id: 'stove_light', type: 'light', x: 2, y: 4, r: 4, if: 'saw_sevens' },
    sign('tally', 5, 2, 'ep7_tally'),
    object('post_box', 6, 3, 'post_box', { text: 'ep7_post_box' }),
    sign('bench_sign', 3, 7, 'ep7_bench', { solid: false }),
    // the woodpile (Shove, optional): pushed down from (11,3), it frees the wood chest at (12,4)
    { id: 'woodpile', type: 'block', x: 11, y: 4, sprite: 'push_block', heavy: true },
    sign('woodpile_sign', 12, 3, 'ep7_woodpile'),
    chest('chest_woodpile', 12, 4, 'wood', { item: 'ember_tea', qty: 2 }),
  ],
  exits: [],
  marks: { stove: [1, 4], tally: [5, 3], party_stop: [5, 5], party_stop_m: [4, 5], party_stop_b: [6, 5], sol_counter: [9, 4] },
  start: { x: 7, y: 7, dir: 'up' },
};
