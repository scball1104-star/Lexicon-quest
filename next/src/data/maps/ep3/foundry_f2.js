// The Ashen Foundry, II: The Ventilation Galleries (40 x 30, dungeon, dark 0.35). EPISODE3_PLAN 4.5.
//
// Fans and soot; water opens things. Areas:
//   A  the Lift Foot (south-west): the ore lift from F1 lands at (6,27); the lift back up in the notch below; the cistern
//      font. North up the stair passage into B.
//   B  the Bell Gallery (puzzle B, hot gates): the unstruck bell hangs over the walk (bell_trig2, row 14). A spout in the
//      north face (7,4) pours down to sl_g (7,9). Two basins, two hot grates in the same north face: '/' sends the water
//      WEST into bs_b1 (3,9), which cools hg_b1 (3,4): the side alcove with the iron chest; '\' sends it EAST into bs_b2
//      (11,9), which cools hg_b2 (9,4): the way on, a corridor north-east to C. Both basins latch, so both open in turn
//      (start '/': the side alcove is the first thing that opens, the lesson; the paddle then opens the way on). Two groups.
//   C  the Records Cage: the burned ledger (ledger_obj, Lantern, ledger_ash) and, once it is read, the apprentice's cache
//      (gold chest: 160 gold, 2 Hi-Ethers) and the foundry ledger book. East through the passage (23..25, 4) into D.
//   D  the Long Channel (puzzle D, series): the spout (28,1) -> sl_d1 (28,5) -> sl_d2 (34,5). Three outlets: sl_d1 '/'
//      splashes on D's floor at (26,5); sl_d1 '\' then sl_d2 '/' climbs to the trough's end and splashes at (34,2); the
//      right one, sl_d1 '\' and sl_d2 '\', runs down column 34 out of D, crosses the slag moat on the approach (33..35,
//      20..21: it crusts a path) and fills bs_d (34,25), which cools hg_d, the font room's grate. Wrong outlets lose
//      nothing. The wood chest with the Ash Key (flag ash_key_f2) and a wood chest with Hi-Potions. Two groups.
//   The approach (x 17..35, rows 25..26): one group; the font room (27..29, 20..22) behind hg_d; the locked door door_e
//      (20,24, Ash Key) into the Fan Hall.
//   E  the Fan Hall: the arena around the great fan (specter_trig, row 18). After the win the fan stops, the shaft stair
//      under it opens (19,15: foundry_f2_shaft on the cells in front of it sets foundry_f2_done) down to F3, and the lift
//      lift_f2_short (22,10) appears in the north face, up to F1's landing. The fan's shaft (pits each side of it) drops to
//      F1's Slag Hall, never a dead end.
// Solution for the bot: B: turn sl_g once ('\') after the start state has opened the alcove (optional). C (optional):
// raise the Lantern at ledger_obj. D: turn sl_d1 once ('\'), turn sl_d2 once ('\'), open chest_key2. Walk down the
// approach (crust at (34,20..21)), unlock door_e, step on specter_trig. After the win: step on (19,16), then (19,15).
import { grid, box, put, rows, wallDepth, door, sign, object, trigger, enemy, chest, lockedDoor, steps, enter, book, pit } from '../_kit.js';
import { spout, sluice, basin, hotGate, cisternFont, layTroughs, TROUGH_LEGEND } from './_quench.js';

const W = 40, H = 30;
const g = grid(W, H, '#');
const room = (x0, y0, x1, y1, faces = 2) => { box(g, x0, y0 - faces, x1, y0 - 1, '|'); box(g, x0, y0, x1, y1, '.'); };
room(2, 23, 9, 27);                         // A  Lift Foot
room(2, 5, 11, 18);                         // B  Bell Gallery
room(14, 2, 22, 7);                         // C  Records Cage
room(26, 2, 38, 17);                        // D  Long Channel
room(14, 11, 25, 21);                       // E  Fan Hall
room(17, 25, 35, 26);                       // the approach
room(27, 20, 29, 22);                       // the font room
// passages and notches
box(g, 5, 19, 6, 22, '.');                  // A -> B
box(g, 6, 28, 7, 28, '.');                  // the lift up's notch
box(g, 3, 1, 4, 3, '.');                    // B's side alcove behind hg_b1
box(g, 9, 1, 10, 3, '.'); box(g, 11, 1, 13, 2, '.');   // B -> C behind hg_b2
box(g, 23, 4, 25, 4, '.');                  // C -> D
box(g, 33, 18, 35, 24, '.');                // D -> the approach (the moat corridor)
box(g, 20, 22, 21, 22, '.');                // the Fan Hall's south notch behind door_e
box(g, 27, 23, 28, 23, '.');                // the font room behind hg_d
// slag: the moat across the approach corridor
box(g, 33, 20, 35, 21, 'S');
// the great fan's shaft: pits beside the fan
const PITS = [[17, 12], [17, 13], [17, 14], [21, 12], [21, 13], [21, 14]];
for (const [x, y] of PITS) put(g, x, y, 'x');
// troughs
layTroughs(g, [
  [[7, 5], [7, 9]], [[4, 9], [10, 9]],
  [[28, 2], [28, 5]], [[27, 5], [34, 5]], [[34, 3], [34, 5]], [[34, 5], [34, 19]], [[34, 22], [34, 24]],
], { '7,5': 'N', '4,9': 'W', '10,9': 'E', '28,2': 'N', '27,5': 'W', '34,3': 'N', '34,19': 'S', '34,22': 'N', '34,24': 'S' });
put(g, 7, 9, '7'); put(g, 28, 5, '7');      // T junctions (arms N, W, E) under sl_g and sl_d1
put(g, 34, 5, '8');                          // sl_d2: in from the west, out north or south (arms N, S, W)
const ground = rows(wallDepth(g.map((r) => r)));

const decor = [
  // A
  { t: 'pipes_v', x: 3, y: 22 }, { t: 'pipes_valve', x: 8, y: 22 }, { t: 'bellows_decor', x: 8, y: 27 },
  // B: the gallery walk under the unstruck bell, vent grilles and bellows
  { t: 'prop_thirteenth_bell', x: 7, y: 13 },
  { t: 'bellows_decor', x: 2, y: 16 }, { t: 'bellows_decor', x: 10, y: 16 }, { t: 'pipes_v', x: 6, y: 4 }, { t: 'pipes_v', x: 8, y: 4 },
  // C: the records cage
  { t: 'tool_rack', x: 15, y: 7 }, { t: 'pipes_h', x: 16, y: 1 }, { t: 'pipes_h', x: 20, y: 1 },
  // D
  { t: 'furnace_mouth', x: 31, y: 1 }, { t: 'pipes_v', x: 36, y: 1 }, { t: 'bellows_decor', x: 37, y: 10 }, { t: 'tool_rack', x: 27, y: 12 },
  // the approach and the Fan Hall
  { t: 'pipes_h', x: 23, y: 24 }, { t: 'pipes_valve', x: 31, y: 24 },
  { t: 'bellows_decor', x: 14, y: 20 }, { t: 'bellows_decor', x: 24, y: 20 }, { t: 'pipes_v', x: 15, y: 10 }, { t: 'pipes_v', x: 18, y: 10 },
];

const events = [
  enter('fo2_enter', 'foundry_f2_arrival'),
  // ---- A: the Lift Foot
  { id: 'lift_up', type: 'door', x: 6, y: 28, w: 2, h: 1, to: ['foundry_f1', 31, 23, 'down'], kind: 'lift', sprite: 'ore_lift_open' },
  cisternFont('font_fo2', 3, 24),
  // ---- B: the Bell Gallery (puzzle B)
  trigger('bell_trig2', 3, 14, 9, 1, 'bram_memory_2'),
  sign('bell_unstruck', 7, 13, 'bell_unstruck'),
  spout('sp_g', 7, 4, 'down'),
  sluice('sl_g', 7, 9, 0),
  basin('bs_b1', 3, 9, 'hg_b1', { face: 'right' }),
  basin('bs_b2', 11, 9, 'hg_b2', { face: 'left' }),
  hotGate('hg_b1', 3, 4),
  hotGate('hg_b2', 9, 4),
  chest('chest_alcove', 3, 1, 'iron'),
  enemy('e_b_phantoms', 5, 12, 'soot_phantom', 'fo2_phantoms', 'wander', { radius: 2 }),
  // ---- C: the Records Cage
  object('ledger_obj', 18, 4, 'ledger_burned', { lantern: true, script: 'ledger_ash', text: 'ledger_burned' }),
  sign('records_cage', 15, 1, 'records_cage'),
  chest('chest_cache', 21, 3, 'gold', { item: 'hi_ether', qty: 2, gold: 160, if: 'ledger_found' }),
  book('book_ledger', 20, 6, 'foundry_ledger', { if: 'ledger_found', solid: false }),
  // ---- D: the Long Channel (puzzle D)
  spout('sp_d2', 28, 1, 'down'),
  sluice('sl_d1', 28, 5, 0),
  sluice('sl_d2', 34, 5, 0),
  chest('chest_key2', 37, 3, 'wood', { item: 'ash_key', flag: 'ash_key_f2' }),
  chest('chest_d2', 26, 16, 'wood', { item: 'hi_potion', qty: 2 }),
  enemy('e_d_mixed', 37, 14, 'furnace_construct', 'fo2_mixed', 'patrol', { path: steps('up', 4, 'down', 4) }),
  // ---- the approach
  basin('bs_d', 34, 25, 'hg_d', { face: 'up' }),
  hotGate('hg_d', 27, 24),
  cisternFont('font_fo2b', 27, 21),
  lockedDoor('door_e', 20, 24, 'ash_key', ['foundry_f2', 20, 22, 'up']),
  door('notch_e', 20, 22, ['foundry_f2', 20, 25, 'down'], { w: 2 }),
  enemy('e_ap_constructs', 24, 26, 'furnace_construct', 'fo2_constructs', 'guard'),
  // ---- E: the Fan Hall
  object('fan', 18, 14, 'fan_great', { w: 3, state: 0, text: 'fan_great', ifNot: 'bellows_specter_defeated' }),
  object('fan_still', 18, 14, 'fan_great', { w: 3, state: 2, text: 'fan_great', if: 'bellows_specter_defeated' }),
  trigger('specter_trig', 14, 18, 12, 1, 'bellows_specter'),
  trigger('shaft_stairs_trig', 18, 16, 3, 1, 'foundry_f2_shaft', { if: 'bellows_specter_defeated' }),
  { id: 'stairs_f3', type: 'door', x: 19, y: 15, to: ['foundry_f3', 17, 21, 'up'], kind: 'stairs', if: 'bellows_specter_defeated' },
  { id: 'lift_f2_short', type: 'door', x: 22, y: 10, w: 2, h: 1, to: ['foundry_f1', 19, 26, 'down'], kind: 'lift', sprite: 'ore_lift_open', if: 'foundry_f2_done' },
  pit('fan_shaft', 17, 12, 5, 3, ['foundry_f1', 19, 19, 'down']),
];

export default {
  id: 'foundry_f2', name: 'The Ventilation Galleries', area: 'dungeon',
  music: 'foundry', ambience: 'forge_rumble', tileset: 'forge',
  lighting: { tint: 'none', dark: 0.35, lights: [] },
  floorShade: { color: '#14101e', alpha: 0.5, rows: 8, side: 3 },
  pitTo: ['foundry_f1', 19, 19, 'down'],
  under: 'ash_floor',
  legend: {
    ...TROUGH_LEGEND,
    '#': 'galleries_top', '|': 'galleries_face', 'v': 'galleries_out_top', 'o': 'galleries_out_face', '.': 'ash_floor', 'x': 'pit',
  },
  ground,
  overlays: [],
  decor,
  overhead: [],
  events,
  exits: [],
  marks: {
    arrival: [6, 26], bell: [7, 14], records: [18, 5], channel: [31, 8], arena: [19, 19], specter_spot: [19, 16],
    stairs_down: [19, 15], shaft_return: [22, 11], moat: [34, 20],
  },
  start: { x: 6, y: 27, dir: 'up' },
};
