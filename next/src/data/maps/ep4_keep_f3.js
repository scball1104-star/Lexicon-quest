// The Sunken Keep, III: The Court of Witnesses (44 x 32, dungeon, dark 0.7). EPISODE4_PLAN 4.7; exact cells in
// docs/MAPS_EP4_B.md. White marble going green at every tide mark. A hub before the Petition Gate, three wings, three
// principle stones (any order), one gate. The floor tests everything F1 taught and F2 combined, one wing at a time.
//
//   Hub (x 16..27, rows 12..19): the stair from F2's court room (17..18,11), arrival (17,12). The Petition Gate
//      (21..23,11; three sockets, one per principle) with the principles carved over it (sign, 24,11). gate_trig on
//      gate_spot (22,12) runs lyra_memory_3 once all three stones have rung. The boat boat_f3_short (25..26,18) to F1's
//      Water Gate once keep_f3_arrived. West, east and south passages to the wings.
//   West, Voice (puzzle: a sequence across a hall): basin v (3 levels, start low). Deep water that never drains (open
//      water, outside the basin) fills the hall; a causeway (h0) runs through it from the landing L1 (x 10..13, rows
//      13..18, wh_v) down a stair (9,16), west and north up a second stair (5,11) to the landing L2 (x 3..7, rows 8..10,
//      wh_v2). Low: walk the causeway. Mid (turned at L2): the causeway goes under, and two pontoons (8..9,9) float from
//      L2 to the island (x 10..12, rows 5..9, wh_v3) with stone_voice. Two groups (L1, L2).
//   East, Truth (puzzle: a dam and two seals): basin t (3 levels, start low) fills only from its culvert (36,7). A heavy
//      block (36,8) sits in the culvert's throat: the wheel turns, the water stands in the culvert and goes no further.
//      Walk the drained pool (stair 36,16) and the side channel (37,8..10); Shove the block west into its pocket (35,8).
//      Then mid floods the pool and the alcove under the low seal seal_t1 (40,7; h 0): it washes. High floods the
//      walkway (x 30..33, rows 8..9) under the high seal seal_t2 (33,7; h 1): it washes. Low again: the stair (31,10)
//      up to the walkway, through seal_t2's door to the stone room (stone_truth); seal_t1's door to the alcove room (an
//      iron chest). Two groups (L3, the alcove room).
//   South, Mercy (puzzle: the dark): basin m (3 levels, start low). The darkest wing (no lamps of its own). A line of
//      boats (row 26) from the landing LM (x 18..25, rows 23..24, wh_m) west to the island IS (x 8..11, rows 26..30,
//      wh_m2) with stone_mercy. Two boats sit on h1 sills: they float only at high, and only at high do the lanterns
//      on chains over the line throw their light on the water. The Keeper's note (12,28) is true ink: it reads under
//      high water with the Lantern. The Lantern shows the faint ink bridge (5..7,28) from IS over the open water to
//      the alcove with the gold chest (Tidewarden Spear). A stair (23,25) from LM into the pool floor. One group.
//   The Witness Antechamber (x 17..26, rows 4..8): behind the gate; the lectern (24,5) with the Witness Book, the font,
//      a wood chest (lamp_oil x2), and the Sunken Seal door door_throne (21..23,3; seal_key) up to the Drowned Throne.
// Solution for the bot (wheel inputs; any wing order): Voice: the stair (9,16), the causeway to L2, wh_v2 x1 (mid), the
//   pontoons, stone_voice; wh_v3 x2 (high, low), back over the causeway. Truth: the stair (36,16), the side channel to
//   (37,8), Shove west; wh_t x1 (mid: seal_t1), x1 (high: seal_t2), x1 (low); the stair (31,10), the walkway, (33,7) to
//   stone_truth. Mercy: wh_m x2 (high), the boats to IS, stone_mercy (Lantern at 12,28 and 6,28 for the spear); wh_m2 x1
//   (low) only after the boats are crossed back: from IS ride the boats while high, then wh_m x1 (low). The gate:
//   gate_spot, lyra_memory_3, witness_book ("Sign."), door_throne.
import { door, sign, object, trigger, enemy, chest, lockedDoor, steps, enter, light, block } from './_kit.js';
import { keepGrid, keepLegend, wheel, post, pontoon, forgery, boat, tideFont, canalDoor } from './ep4_keep_f1.js';

const W = 44, H = 32;
const K = keepGrid(W, H);
const { set, box, room } = K;

room(16, 12, 27, 19);                        // the hub (faces 10..11)
room(17, 4, 26, 8);                          // the Witness Antechamber (faces 2..3)
room(1, 4, 13, 19);                          // West, Voice (faces 2..3)
room(30, 8, 42, 19);                         // East, Truth (faces 6..7)
room(30, 3, 32, 5);                          //    the stone room, raised over the hall (faces 1..2)
room(34, 3, 37, 5);                          //    the alcove room (faces 1..2)
room(2, 23, 35, 30);                         // South, Mercy (faces 21..22)
// passages
box(22, 9, 22, 10, '.');                     // the Petition Gate (21..23,11, doorway 22) -> the antechamber
box(14, 15, 15, 16, '.');                    // hub -> Voice
box(28, 17, 29, 18, '.');                    // hub -> Truth
box(21, 20, 22, 22, '.');                    // hub -> Mercy
box(31, 6, 31, 6, '.');                      // seal_t2's door (31,7) -> the stone room
box(35, 6, 35, 6, '.');                      // seal_t1's door (35,7) -> the alcove room
box(37, 6, 37, 7, '.');                      // the alcove room's sluice stair down to the block's pocket (37,8)
box(16, 18, 18, 19, '~');                    // the hub's mooring (open water)

// Voice: open water everywhere, the causeway, the landings, the island
box(1, 4, 13, 19, '~');
box(10, 13, 13, 18, '.');                    // L1
box(3, 8, 7, 10, '.');                       // L2
box(10, 5, 12, 9, '.');                      // the island
set(9, 16, 'W', 'v', 0);                     // L1 -> the causeway (treads going down toward the west)
for (const [x, y] of [[8, 16], [7, 16], [6, 16], [5, 16], [5, 15], [5, 14], [5, 13], [5, 12]]) set(x, y, 'c', 'v', 0);
set(5, 11, 'S', 'v', 0);                     // the causeway -> L2 (treads going down toward the south)
set(8, 9, 'c', 'v', 0); set(9, 9, 'c', 'v', 0);   // the pontoons' moorings
// a little drowned court along the causeway (all h0: it shows the level)
box(6, 13, 8, 14, 'c', 'v', 0); set(6, 15, 'c', 'v', 0);

// Truth: basin t with its culvert (38,7), the walkway, the alcove, the pool, the dry causeway, the landing L3
set(38, 7, '|', 't', 0);                     // the culvert mouth (the inlet; a face cell, so nothing is ever shoved into it)
box(30, 8, 32, 9, '.', 't', 1);              // the walkway under seal_t2 (31,7)
box(33, 8, 33, 9, 'L', 't', 1);
box(34, 8, 35, 9, 'c', 't', 0); box(36, 8, 36, 9, 'L', 't', 1);   // the alcove under seal_t1 (35,7)
set(37, 8, 'E'); set(37, 9, 'L', 't', 1);    // the block's pocket (a dry step, outside the basin)
set(38, 8, 'c', 't', 0);                     // the culvert's lip: the heavy block sits on it
set(39, 8, 'W', 't', 0);                     // the step down from the causeway to the lip (Bram shoves from here)
box(38, 9, 38, 10, 'L', 't', 0);             // the culvert's throat (water runs under the kerbs)
box(30, 10, 37, 10, 'L', 't', 1); set(31, 10, 'S', 't', 0); set(35, 10, 'c', 't', 0);
box(30, 11, 38, 15, 'c', 't', 0);            // the pool
box(39, 9, 39, 16, 'L');                     // the causeway's kerb
box(30, 16, 38, 16, 'L'); set(34, 16, 'N', 't', 0);
// Mercy: the kerb, the pool, the sills, the island, the open water, the alcove
box(2, 25, 35, 25, 'L'); set(20, 25, '.'); set(23, 25, 'S', 'm', 0);
box(13, 26, 35, 30, 'c', 'm', 0);
set(17, 26, 'c', 'm', 1); set(14, 26, 'c', 'm', 1);   // the two sills under boats
box(12, 26, 12, 30, 'L'); set(12, 26, '.'); box(12, 27, 12, 29, 'L', 'm', 1);
box(8, 26, 11, 30, '.');                     // the island IS
box(5, 26, 7, 30, '~');                      // open water
box(2, 26, 4, 30, '~'); box(2, 27, 4, 29, '.');   // the alcove
box(2, 23, 17, 24, 'm'); box(26, 23, 35, 24, 'm');   // the dark galleries either side of LM (marble, dry)
box(2, 25, 4, 25, '~');

const R = K.finish();

// ---------------------------------------------------------------- dressing
const decor = [
  // the hub
  { t: 'stairs_up', x: 17, y: 11 }, { t: 'pillar', x: 16, y: 13 }, { t: 'pillar', x: 27, y: 13 },
  { t: 'candelabra', x: 20, y: 12 }, { t: 'candelabra', x: 24, y: 12 },
  { t: 'mooring_post', x: 19, y: 19 }, { t: 'lantern_chain', x: 17, y: 18 },
  // the antechamber
  { t: 'pillar', x: 17, y: 4 }, { t: 'pillar', x: 26, y: 4 }, { t: 'candelabra', x: 20, y: 4 }, { t: 'book_stack', x: 25, y: 8 },
  // Voice
  { t: 'mooring_post', x: 13, y: 13 }, { t: 'mooring_post', x: 7, y: 8 }, { t: 'lantern_chain', x: 6, y: 14 },
  { t: 'pillar', x: 3, y: 8 }, { t: 'mooring_post', x: 12, y: 9 },
  // Truth
  { t: 'pillar', x: 30, y: 17 }, { t: 'pillar', x: 42, y: 17 }, { t: 'lantern_chain', x: 33, y: 13 },
  { t: 'lantern_chain', x: 37, y: 12 }, { t: 'book_stack', x: 34, y: 3 }, { t: 'mooring_post', x: 38, y: 17 },
  // Mercy: lanterns on chains over the line of boats (they light only high water)
  { t: 'lantern_chain', x: 19, y: 26 }, { t: 'lantern_chain', x: 15, y: 26 }, { t: 'lantern_chain', x: 13, y: 27 },
  { t: 'lantern_chain', x: 28, y: 28 }, { t: 'lantern_chain', x: 32, y: 27 },
  { t: 'pillar', x: 6, y: 23 }, { t: 'pillar', x: 12, y: 23 }, { t: 'pillar', x: 29, y: 23 }, { t: 'pillar', x: 34, y: 23 },
  { t: 'mooring_post', x: 8, y: 26 }, { t: 'mooring_post', x: 25, y: 23 },
];
const overlays = [
  { t: 'ink_bridge_h_faint', x: 5, y: 28 }, { t: 'ink_bridge_h_faint', x: 6, y: 28 }, { t: 'ink_bridge_h_faint', x: 7, y: 28 },
  { t: 'wall_glyph_faint', x: 6, y: 21 },
];

const PRINCIPLES = ['principle_voice', 'principle_truth', 'principle_mercy'];
const stone = (id, x, y, kind) => [
  object(`stone_${kind}`, x, y, `principle_stone_${kind}`, { w: 2, script: `principle_${kind}`, text: `ep4_stone_${kind}`, state: 0, ifNot: `principle_${kind}` }),
  object(`stone_${kind}_rung`, x, y, `principle_stone_${kind}`, { w: 2, text: `ep4_stone_${kind}`, state: 1, if: `principle_${kind}` }),
];

const events = [
  enter('k3_enter', 'keep_f3_arrival'),
  // ---- the hub
  door('stairs_f2', 17, 11, ['ep4_keep_f2', 20, 15, 'down'], { kind: 'stairs', w: 2 }),
  { id: 'petition_gate', type: 'gate', x: 21, y: 11, w: 3, h: 1, sprite: 'petition_gate', state: 'closed', flags: PRINCIPLES, text: 'ep4_petition_gate' },
  sign('principles_sign', 24, 11, 'ep4_principles'),
  trigger('gate_trig', 22, 12, 1, 1, 'lyra_memory_3'),
  boat('boat_f3_short', 17, 18, ['ep4_keep_f1', 20, 26, 'down'], { if: 'keep_f3_arrived' }),
  // ---- the antechamber
  object('witness_lectern', 24, 5, 'witness_lectern', { script: 'witness_book', text: 'ep4_witness_lectern', state: 0, ifNot: 'hero_signed' }),
  sign('witness_lectern_signed', 24, 5, 'ep4_witness_lectern', { sprite: 'witness_lectern', state: 1, if: 'hero_signed' }),
  tideFont('font_k3', 18, 7),
  chest('chest_ante', 26, 6, 'wood', { item: 'lamp_oil', qty: 2 }),
  lockedDoor('door_throne', 21, 3, 'seal_key', ['ep4_keep_crown', 11, 18, 'up'], { w: 3, sprite: 'door_seal' }),
  // ---- West: Voice
  wheel('wh_v', 12, 14, 'v'),
  wheel('wh_v2', 4, 9, 'v'),
  wheel('wh_v3', 10, 6, 'v'),
  post('post_v', 7, 13, 'v'),
  pontoon('pt_v1', 8, 9, 'v', { rides: [1] }),
  pontoon('pt_v2', 9, 9, 'v', { rides: [1] }),
  ...stone('stone_voice', 11, 6, 'voice'),
  enemy('e_v_watch', 11, 17, 'drowned_watch', 'e4k3_watch', 'wander', { radius: 1 }),
  // ---- East: Truth
  wheel('wh_t', 33, 18, 't'),
  wheel('wh_t2', 34, 4, 't'),
  post('post_t', 33, 13, 't'),
  { ...block('dam_t', 38, 8), heavy: true },
  canalDoor('door_t1', 35, 7),
  forgery('seal_t1', 35, 7, 't', 0, 'door_t1'),
  canalDoor('door_t2', 31, 7),
  forgery('seal_t2', 31, 7, 't', 1, 'door_t2'),
  ...stone('stone_truth', 30, 4, 'truth'),
  chest('chest_alcove', 37, 3, 'iron'),
  enemy('e_t_decrees', 41, 12, 'blank_decree', 'e4k3_decrees', 'patrol', { path: steps('up', 3, 'down', 3) }),
  // ---- South: Mercy
  wheel('wh_m', 19, 23, 'm'),
  wheel('wh_m2', 8, 29, 'm'),
  post('post_m', 30, 29, 'm'),
  ...[[20, 26, null], [19, 26, null], [18, 26, null], [17, 26, [2]], [16, 26, null], [15, 26, null], [14, 26, [2]], [13, 26, null]]
    .map(([x, y, rides], k) => pontoon(`boat_m${k}`, x, y, 'm', rides ? { rides } : {})),
  ...stone('stone_mercy', 9, 27, 'mercy'),
  sign('keeper_note', 12, 28, 'ep4_keeper_note', { solid: false, lantern: true }),
  chest('chest_spear', 3, 28, 'gold', { item: 'tidewarden_spear' }),
  enemy('e_m_sentinels', 33, 24, 'waterlogged_sentinel', 'e4k3_sentinels', 'patrol', { path: steps('left', 4, 'right', 4) }),
  // lights (Mercy has none of its own: its light is the high water under the lanterns)
  light('l_hub', 21, 16, 6), light('l_ante', 22, 6, 5), light('l_l1', 11, 15, 4), light('l_l2', 5, 9, 4), light('l_isl', 11, 7, 3),
  light('l_l3', 36, 18, 5), light('l_pool', 34, 12, 4), light('l_cw', 41, 9, 3), light('l_stone_t', 31, 4, 3), light('l_alc', 36, 4, 3),
];

export default {
  id: 'ep4_keep_f3', name: 'The Court of Witnesses', area: 'dungeon',
  music: 'mystery', ambience: 'keep_drip', tileset: 'ep4',
  // E4-fixes-B (CRITIQUE_6 item 6): a drowned court, not a palace. Darker than F2 (0.45) with a cold grey-green cast, so
  // the lanterns and candelabra are the light and the descent reads dim, darker, darkest.
  lighting: { tint: '#4e686c', dark: 0.7, lights: [] },
  floorShade: { color: '#14101e', alpha: 0.4, rows: 8, side: 3 },
  pitTo: ['ep4_keep_f3', 21, 24, 'up'],
  under: 'witness_floor',
  legend: keepLegend('witness', 'witness_floor', { 'm': 'marble_walk' }),
  ground: R.ground,
  tide: {
    basins: {
      v: { start: 0, levels: 3, wheel: 'wh_v' },
      t: { start: 0, levels: 3, wheel: 'wh_t', inlet: [[38, 7]] },
      m: { start: 0, levels: 3, wheel: 'wh_m' },
    },
    basin: R.basin,
    height: R.height,
  },
  overlays,
  decor,
  overhead: [],
  events,
  exits: [],
  marks: {
    arrival: [17, 12], hub: [21, 16], gate_spot: [22, 12], stone_voice: [11, 7], stone_truth: [30, 5], stone_mercy: [9, 28],
    lectern: [24, 6], font: [18, 8], throne_door: [22, 4], memory3_regent: [22, 6],
    voice_l1: [11, 15], voice_l2: [5, 9], truth_l3: [35, 18], truth_shove: [39, 8], mercy_lm: [21, 23], mercy_island: [10, 28],
  },
  start: { x: 17, y: 12, dir: 'down' },
};
