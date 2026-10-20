// Whisperwood Hollow (28 x 20): an optional secret dungeon under the Whisperwood pines, one floor, dark (0.5).
//
// A sunken root hollow: cliff walls with pines on their tops, a dirt floor split by roots and moss, braziers.
// Entered from the valley through the root arch at the Whisperwood pool (the arch's door lands on the stairs
// landing L, bottom left). The black pool P cuts the landing off from the hollow proper: the pilgrims' "lost
// bridge" is hidden ink across it (needs the Lantern of Recall; without it the party sees the far side and
// turns back). The main hollow M holds the three visible enemies, two braziers to light, the iron chest in a
// bay (guarded by the Ink Blot elite) and the push-block puzzle: the block on the plate opens the barred door
// in M's north face, which leads up into the boss room B. The Briar Alpha stands in B in front of the plaque
// with the pilgrims' three names (hidden ink on the north face); the gold chest sits in the corner behind it.
//
// Flow: stairs (2,13) -> landing -> hidden bridge row 16 -> M (10,16) -> fights, braziers, chest bay -> block
// (14,14) onto plate (18,16): the root column blocks the straight push, so it goes down two then right four ->
// gate_b (20,12) -> notch (20,8) -> B -> alpha_trig (row 7) -> the Alpha -> plaque (20,4) -> gold chest (25,4).
import { grid, box, put, rows, room, scatter, door, sign, trigger, enemy, chest, actor, block, plate, gate,
  brazier, light, steps, enter } from './_kit.js';

const W = 28, H = 20;
const g = grid(W, H, '^');
room(g, 16, 4, 25, 7, '.', '|');           // B boss room (faces rows 2-3)
put(g, 20, 8, '.');                        // notch below B (the barred door's far side)
room(g, 1, 13, 25, 18, '.', '|');          // the hollow band: landing L | pool P | main hollow M (faces rows 11-12)
room(g, 10, 11, 12, 12, '.', '|');         // the chest bay, a 3 x 2 notch in M's north wall (faces rows 9-10)
// the pool: ragged ink between the landing (x 1..4) and the hollow (x 10..25)
box(g, 5, 13, 9, 18, 'i');
put(g, 5, 13, '.'); put(g, 5, 18, '.'); put(g, 9, 18, '.'); put(g, 9, 13, '.');
put(g, 4, 17, 'i'); put(g, 10, 14, 'i');
// moss where the roots drip and under the plaque
box(g, 11, 17, 13, 18, 'm'); box(g, 23, 13, 25, 14, 'm'); box(g, 19, 4, 21, 4, 'm'); put(g, 24, 7, 'm');
put(g, 1, 13, 'm'); put(g, 2, 18, 'm'); put(g, 3, 18, 'm');
const ground = rows(g);

const overlays = [
  // the lost bridge: five cells of hidden ink straight across the pool at row 16
  { t: 'ink_bridge_h_faint', x: 5, y: 16 }, { t: 'ink_bridge_h_faint', x: 6, y: 16 }, { t: 'ink_bridge_h_faint', x: 7, y: 16 },
  { t: 'ink_bridge_h_faint', x: 8, y: 16 }, { t: 'ink_bridge_h_faint', x: 9, y: 16 },
  // what is left of the pilgrims' wooden bridge: two rows of rotten piles beside the ink line
  { t: 'bridge_wood_h_piles_l', x: 5, y: 17 }, { t: 'bridge_wood_h_piles_m', x: 7, y: 17 }, { t: 'bridge_wood_h_piles_r', x: 9, y: 17 },
  // the plaque with the three names, written in ink that only the Lantern reads (B's north face)
  { t: 'wall_glyph_faint', x: 20, y: 2 },
  // roots everywhere: this hollow is the pines' cellar
  { t: 'roots_0', x: 10, y: 13 }, { t: 'roots_1', x: 13, y: 13 }, { t: 'roots_2', x: 25, y: 13 }, { t: 'roots_1', x: 25, y: 18 },
  { t: 'roots_0', x: 16, y: 18 }, { t: 'roots_2', x: 21, y: 18 }, { t: 'roots_1', x: 1, y: 14 }, { t: 'roots_0', x: 4, y: 18 },
  { t: 'roots_2', x: 16, y: 4 }, { t: 'roots_0', x: 25, y: 7 }, { t: 'roots_1', x: 17, y: 7 }, { t: 'roots_2', x: 12, y: 11 },
  { t: 'roots_1', x: 19, y: 13 }, { t: 'roots_0', x: 22, y: 4 },
  { t: 'ink_puddle_0', x: 11, y: 15 }, { t: 'ink_puddle_1', x: 20, y: 17 }, { t: 'ink_puddle_0', x: 23, y: 6 }, { t: 'ink_puddle_1', x: 3, y: 15 },
  ...scatter(ground, ['.'], ['leaves', 'pebbles_1', 'tuft_1', 'leaves'], 0.12, 61),
  ...scatter(ground, ['m'], ['leaves', 'flowers_violet'], 0.2, 62),
];

// pines on the cliff tops around the rim, clear of the notch and the stairs (none on the south rim row: a pine
// there would grow up over the floor)
const pines = [];
const pine = (x, y) => pines.push({ t: 'tree_pine', x, y });
for (const [x, y] of [[1, 1], [4, 0], [7, 1], [10, 0], [13, 1], [26, 1], [27, 5], [0, 7], [2, 9], [5, 8], [8, 9], [11, 7],
  [14, 9], [27, 9], [0, 12], [27, 12], [27, 16],
  [3, 2], [9, 3], [13, 4], [1, 5], [7, 5], [12, 1], [20, 0]]) pine(x, y);

const decor = [
  ...pines,
  { t: 'stairs_up', x: 2, y: 12 },                    // up to the valley (the root arch)
  // the hollow: root columns as pillars, the one that blocks the straight push, braziers already burning
  { t: 'root_column', x: 16, y: 14 }, { t: 'root_column', x: 23, y: 16 },
  { t: 'brazier_lit', x: 10, y: 18 }, { t: 'brazier_lit', x: 25, y: 15 },
  { t: 'bush', x: 14, y: 18 }, { t: 'bush', x: 24, y: 18 }, { t: 'bush', x: 1, y: 18 },
  // the boss room: braziers flank the plaque, a column the gold chest's corner
  { t: 'brazier_lit', x: 18, y: 4 }, { t: 'brazier_lit', x: 22, y: 4 },
  { t: 'root_column', x: 23, y: 7 },
  { t: 'bush', x: 16, y: 7 },
];

const events = [
  enter('hollow_enter', 'hollow_entry'),
  door('hollow_exit', 2, 12, ['valley', 51, 28, 'down'], { kind: 'stairs' }),
  // the push-block puzzle: block (14,14) onto the plate (18,16) opens the barred door into the boss room
  block('block_m', 14, 14),
  plate('plate_m', 18, 16, 'gate_b'),
  gate('gate_b', 20, 12, 'door_locked', { to: ['whisperwood_hollow', 20, 8, 'up'] }),
  door('notch_b', 20, 8, ['whisperwood_hollow', 20, 13, 'down']),
  // dark hollow: two braziers the party lights, and the light of the ones already burning
  brazier('brazier_m1', 13, 18), brazier('brazier_m2', 22, 13),
  light('light_stairs', 2, 13, 4), light('light_m1', 10, 18, 5, '#ffb070'), light('light_m2', 25, 15, 5, '#ffb070'),
  light('light_b1', 18, 4, 5, '#ffb070'), light('light_b2', 22, 4, 5, '#ffb070'),
  // the Briar Alpha, in front of the plaque; the trigger across the room's mouth runs the boss intro
  actor('whisperwood_alpha', 20, 5, 'briar_wolf', 'down', { ifNot: 'briar_alpha_defeated' }),
  trigger('alpha_trig', 17, 7, 7, 1, 'hollow_alpha'),
  sign('lost_bridge_plaque', 20, 3, 'lost_bridge_plaque', { solid: false, lantern: true }),
  // chests: the iron one in the bay behind the Blot, the gold one in the corner behind the Alpha
  chest('chest_bay', 11, 11, 'iron'),
  chest('chest_alpha', 25, 4, 'gold'),
  // inspectables
  sign('old_piles', 5, 17, 'hollow_piles', { solid: false }),   // read from the near shore, before the Lantern
  // visible enemies: 3 per ZONES.whisperwood_hollow.plan (dungeon rule: they step when the player steps)
  enemy('h_wolves_a', 12, 15, 'briar_wolf', 'hollow_wolves', 'chase'),
  enemy('h_wolves_b', 21, 17, 'briar_wolf', 'hollow_wolves', 'patrol', { path: steps('left', 3, 'right', 3) }),
  enemy('h_blot', 11, 12, 'ink_slime', 'hollow_blot', 'guard'),
];

export default {
  id: 'whisperwood_hollow', name: 'Whisperwood Hollow', area: 'dungeon',
  music: 'mystery', ambience: 'wind_valley', tileset: 'town',
  lighting: { tint: 'none', dark: 0.5 },
  under: 'dirt',
  pitTo: ['whisperwood_hollow', 3, 16, 'right'],
  legend: { '^': 'cliff_top', '|': 'cliff_face', '.': 'dirt', 'm': 'moss', 'i': 'ink' },
  ground,
  overlays,
  decor,
  overhead: [],
  events,
  exits: [],
  marks: { entrance: [2, 13], bridge_near: [4, 16], bridge_far: [10, 16], alpha_spot: [20, 5], plaque: [20, 4], gold_chest: [25, 5] },
  start: { x: 2, y: 13, dir: 'down' },
};
