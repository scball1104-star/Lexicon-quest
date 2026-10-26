// The Weir Culvert (28 x 20, dungeon, dark 0.4, `mystery`). EXPANSION1_PLAN 4.9; X1-maps-south.
//
// The brick drain under the weir, dry because the pond has drained: wet red-brown brick and iron grating. Plates and heavy
// blocks, no switches to learn, one boss.
//   A The Mouth (x 1..6, y 14..18): arrival (3,14) from the Millrace arch (the 2 x 2 stair foot at (3..4,13..14) goes back up); `culvert_entry`.
//   B The Drain Hall (x 7..26, y 14..17): a long vault, grated drain across row 16. Two plates open the barred gate `gate_drain`
//     (AND): `plate_b1` (21,15) takes the light block `block_b1` (start (9,15), pushed east along row 15), `plate_b2` (22,17)
//     takes the heavy block `block_b2` (start (17,17), Shoved east along row 17). `e_cv_blots` guards the hall. A cracked
//     wall (`x1_crack_drain`, rock, Dash) in the north face at (17,12) hides the iron chest `chest_cv_drain` at (17,13).
//   C The Pump Room (x 4..14, y 4..10): through the gate (a door in the hall's north face at (11..12,13); its far side is the
//     notch (11,11) in the room's south wall, the archive pattern). `e_cv_wraith` guards it. The wood chest `chest_cv_pin`
//     (fixed `millstone_pin`, sets `pin_found`) is tucked behind the old pipes at (6,5).
//   D The Hearth Landing (x 14..17, y 6..8): the font `culvert_font` (a rune shrine, `safe`) before the boss. The trigger
//     column `golem_trig` at x 18, y 4..9 is the only way into E.
//   E The Sluice Chamber (x 18..26, y 3..10): the Millstone Golem (`millstone_golem`, map actor, `ifNot:
//     millstone_golem_defeated`) before the broken sluice gate; the gold chest `chest_cv_golem` (25,4) behind it.
// Solution: row 15 east pushing `block_b1` onto `plate_b1`; Shove `block_b2` east onto `plate_b2`; the gate opens; north to
// the pump room; take the pin (also required for Four Rolls); rest at the hearth; boss.
// Blocks reset on re-entry, so no block can trap the party (the hall is four rows tall and no block can reach a door cell).
//
// X1 seams this map relies on (owned by the integrate wave): events.js GATE_SPRITES pair `x1_gate_culvert` ->
// [x1_gate_culvert_closed, x1_gate_culvert_open] (tiles exist); mapcheck GATE_SPRITE_IDS lists it.
import { grid, box, put, rows, room, wallDepth, scatter, door, trigger, enemy, chest, actor, block, plate, gate, brazier, light,
  steps, enter, object } from './_kit.js';

const W = 28, H = 20;
const g = grid(W, H, '#');
room(g, 1, 14, 6, 18, 'a', '|');            // A the mouth (faces rows 12..13)
room(g, 7, 14, 26, 17, '.', '|');           // B the drain hall (faces rows 12..13)
room(g, 4, 4, 14, 10, '.', '|');            // C the pump room (faces rows 2..3)
room(g, 15, 6, 17, 8, 'a', '|');            // D the hearth landing (faces rows 4..5)
room(g, 18, 3, 26, 10, 'a', '|');           // E the sluice chamber (faces rows 1..2)
put(g, 11, 11, '.');                        // the notch: the far side of the drain gate, in the pump room's south wall
// wet brick: standing water in the hall and the pump room, a flagstone dais under the Golem
box(g, 13, 16, 16, 16, 'w'); box(g, 10, 17, 11, 17, 'w'); box(g, 24, 16, 25, 16, 'w');
box(g, 6, 8, 9, 9, 'w'); box(g, 12, 5, 12, 6, 'w'); box(g, 5, 18, 5, 18, 'w');
box(g, 20, 9, 22, 10, 'w'); box(g, 25, 8, 25, 9, 'w');
box(g, 20, 5, 24, 7, '.');                  // the dais: plain brick under the Golem
const ground = rows(wallDepth(g));

const overlays = [
  // the grated drain across row 16 (walkable): two runs, the second rusted
  ...[9, 10, 11].map((x, i) => ({ t: i % 2 ? 'x1_drain_grate' : 'x1_drain_grate_b', x, y: 16 })),
  ...[20, 21, 22, 23].map((x, i) => ({ t: i % 2 ? 'x1_drain_grate_b' : 'x1_drain_grate', x, y: 16 })),
  // the cracked wall's hole (drawn over by the crack until Dash Strike breaks it)
  { t: 'wall_broken', x: 17, y: 12 },
  ...scatter(ground, ['.', 'a'], ['pebbles_0', 'pebbles_1', 'pebbles_2', 'leaves'], 0.05, 71),
  { t: 'roots_0', x: 2, y: 18 }, { t: 'roots_2', x: 26, y: 17 },
];

const decor = [
  { t: 'stairs_up', x: 3, y: 13 },                         // up to the arch
  { t: 'brazier_lit', x: 1, y: 14 }, { t: 'brazier_lit', x: 6, y: 14 },
  // the drain hall: iron pillars hold the vault, braziers at both ends
  { t: 'pillar', x: 14, y: 14 }, { t: 'pillar', x: 20, y: 14 },
  { t: 'brazier_lit', x: 8, y: 14 }, { t: 'brazier_lit', x: 25, y: 14 },
  // the pump room: the old pipes along the north face and down to the pin chest, the pump, a brazier
  { t: 'pipes_elbow', x: 5, y: 3 }, { t: 'pipes_v', x: 5, y: 4 }, { t: 'pipes_v', x: 5, y: 5 },
  { t: 'pipes_h', x: 6, y: 3 }, { t: 'pipes_h', x: 7, y: 3 }, { t: 'pipes_valve', x: 8, y: 3 }, { t: 'pipes_h', x: 9, y: 3 },
  { t: 'pipes_h', x: 10, y: 3 }, { t: 'pipes_h', x: 11, y: 3 }, { t: 'pipes_elbow', x: 12, y: 3 },
  { t: 'waterwheel', x: 8, y: 6 }, { t: 'basin', x: 11, y: 4 },
  { t: 'brazier_lit', x: 13, y: 4 }, { t: 'brazier_lit', x: 4, y: 10 },
  { t: 'ore_crate', x: 13, y: 9 },
  // the sluice chamber: the failed gate the Golem stands before, braziers
  { t: 'x1_sluice_failed', x: 21, y: 5 },
  { t: 'brazier_lit', x: 19, y: 3 }, { t: 'brazier_lit', x: 26, y: 3 }, { t: 'brazier_lit', x: 19, y: 10 }, { t: 'brazier_lit', x: 26, y: 10 },
  { t: 'pillar', x: 24, y: 9 },
];

const events = [
  enter('culvert_enter', 'culvert_entry'),
  // ---- A: the way back up to the arch
  // a 2 x 2 stair foot (the art is 2 wide): door cells cannot hold a block, so two blocks can never seal the way out
  door('culvert_exit', 3, 13, ['x1_millrace', 43, 23, 'down'], { kind: 'stairs', w: 2, h: 2 }),
  // ---- B: the two plates, two blocks, the barred gate and its far side
  block('block_b1', 9, 15),
  { id: 'block_b2', type: 'block', x: 17, y: 17, sprite: 'push_block', heavy: true },
  plate('plate_b1', 21, 15, 'gate_drain'),
  plate('plate_b2', 22, 17, 'gate_drain'),
  gate('gate_drain', 11, 13, 'x1_gate_culvert', { to: ['x1_culvert', 11, 11, 'up'] }),
  door('notch_pump', 11, 11, ['x1_culvert', 11, 14, 'down']),
  object('x1_crack_drain', 17, 12, 'wall_cracked', { breakable: 'rock', text: 'cliff_crack', h: 2 }),
  chest('chest_cv_drain', 17, 13, 'iron', { behind: 'x1_crack_drain' }),
  // ---- C: the pin
  chest('chest_cv_pin', 6, 5, 'wood', { item: 'millstone_pin', flag: 'pin_found' }),
  // ---- D: the hearth landing's font, a safe point before the boss
  { id: 'culvert_font', type: 'font', x: 15, y: 7, w: 3, h: 2, text: 'culvert_font', sprite: 'rune_shrine', safe: true },
  light('light_font', 16, 7, 3, '#9fe8d8'),
  // ---- E: the Golem and what is behind it
  trigger('golem_trig', 18, 4, 1, 6, 'golem_intro'),
  actor('millstone_golem', 22, 6, 'millstone_golem', 'down', { ifNot: 'millstone_golem_defeated' }),
  chest('chest_cv_golem', 25, 4, 'gold'),
  // ---- light: the braziers' own glow, so the hall reads on a phone (the map is dark 0.4)
  light('light_a', 3, 15, 5, '#ffb070'), light('light_b1', 8, 14, 6, '#ffb070'), light('light_b2', 25, 14, 6, '#ffb070'),
  light('light_b3', 16, 15, 5), light('light_c1', 13, 4, 6, '#ffb070'), light('light_c2', 4, 10, 5, '#ffb070'), light('light_c3', 8, 7, 4),
  light('light_e1', 19, 3, 5, '#ffb070'), light('light_e2', 26, 3, 5, '#ffb070'), light('light_e3', 19, 10, 5, '#ffb070'),
  light('light_e4', 26, 10, 5, '#ffb070'), light('light_e5', 22, 6, 5),
  // ---- visible groups: 2 per ZONES.x1_culvert.plan, plus the boss actor (dungeon foes step when the party steps)
  enemy('e_cv_blots', 14, 16, 'ink_blot', 'cv_blots', 'guard'),
  enemy('e_cv_wraith', 9, 5, 'ink_wraith', 'cv_wraith', 'wander', { radius: 2 }),
];

export default {
  id: 'x1_culvert', name: 'The Weir Culvert', area: 'dungeon',
  music: 'mystery', ambience: 'river_birds', tileset: 'town',
  lighting: { tint: 'none', dark: 0.4 },
  under: 'x1_culvert_floor',
  legend: { '#': 'x1_culvert_top', '|': 'x1_culvert_face', 'o': 'x1_culvert_out_face', 'v': 'x1_culvert_out_top',
    '.': 'x1_culvert_floor', 'a': 'x1_culvert_flag', 'w': 'x1_culvert_wet' },
  ground,
  overlays,
  decor,
  overhead: [],
  events,
  exits: [],
  marks: { entrance: [3, 14], plate_1: [21, 15], plate_2: [22, 17], gate: [11, 14], pump: [8, 7], pin_chest: [6, 6], hearth: [16, 8],
    golem_spot: [22, 6], golem_chest: [25, 5] },
  start: { x: 3, y: 14, dir: 'down' },
};
