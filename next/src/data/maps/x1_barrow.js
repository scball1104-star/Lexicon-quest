// The Wethers' Barrow (28 x 20, dungeon, dark 0.45, music wethers_barrow): the shepherds' barrow under the Standing Stones.
// EXPANSION1_PLAN 4.3, laid out for the 3/4-view wall system (every room has two face rows above it; a doorway between
// stacked rooms is a wall row plus the face rows; side-by-side rooms are joined by a gap in a vertical wall).
// A pack file of the `x1` expansion: nothing imports it directly.
//
// Two bands. The bottom band is the landing A (west) and the Long Hall B (east, three rows) with the two chambers under it,
// each behind a sliding slab (`shelf`, the F2 hub pattern: ONE floor switch moves both, so exactly one is open):
//   C the Ewe Chamber (west)    behind slab_n, shut at the start: opens when sw_slab is thrown. A heavy block stands
//                               before a niche in its north face; Bram's Shove clears it: the gold chest `chest_bw_bow`.
//   D the Ossuary (east)        behind slab_s, open at the start: a guard group, and a cracked wall (Dash) over the iron chest.
// The stair at the hall's east end climbs to the top band: the Counting Room E (a block, a plate, a barred gate) and, behind
// the gate, the Shepherds' Hearth and the Reeve's Hall as one long room (the hearth first, then the trigger row, then the
// hall of thirteen niches and the Reeve). The block is the only push puzzle; blocks reset on re-entry, so the notch
// stairs are two cells wide (a block can never seal both) and the barrow door is never guarded by a block.
//
//   Solution: from the landing east into the hall. Leave the switch alone and take the south slab (the Ossuary, Dash for its
//   chest); throw sw_slab for the west chamber (Bram's Shove the block aside, then the bow). Stair up at (21, 9).
//   In the Counting Room push block_c down two (from (20, 3)) then east five (from (19, 6)) onto plate_c (25, 6): the gate
//   opens. Through it to the hearth (rest, save), then the trigger row at x 11 and the Reeve.
//
// Open seam (owned by X1-integrate): the gate names the sprite `x1_gate_barrow`, the key of the pair
// `x1_gate_barrow_closed` / `x1_gate_barrow_open` (art in x1_tiles.json) that events.js GATE_SPRITES and mapcheck's
// GATE_SPRITE_IDS must list. Until they do, mapcheck reports exactly that one sprite error and the field draws the key door.
import { grid, box, put, rows, room, wallDepth, door, stairs, sign, book, trigger, enemy, chest, actor, block, floorSwitch,
  plate, gate, shelf, light, steps, enter, object } from './_kit.js';

const GATE_SPRITE = 'x1_gate_barrow';

const W = 28, H = 20;
const g = grid(W, H, '#');
room(g, 1, 3, 16, 6, '.', '|');                     // G + F: the Reeve's Hall (west) and the Hearth (east): one room
room(g, 19, 3, 26, 6, 'a', '|');                    // E: the Counting Room
put(g, 17, 4, '.'); put(g, 18, 4, '.');             // the corridor behind the barred gate (gate_reeve, 17..18 x 4)
put(g, 21, 7, '.'); put(g, 22, 7, '.');             // the stair's notch below E (two cells wide)
room(g, 1, 10, 6, 15, '.', '|');                    // A: the landing
room(g, 7, 10, 26, 12, '.', '|');                   // B: the Long Hall
room(g, 8, 16, 13, 17, 'a', '|', 1);                // C: the Ewe Chamber
room(g, 15, 16, 24, 17, 'a', '|', 1);               // D: the Ossuary
for (const [x0, x1] of [[12, 13], [19, 20]]) box(g, x0, 13, x1, 15, '.');   // the slab doorways through the wall and the chamber faces
box(g, 9, 16, 12, 16, 'r');                         // a wool runner in the Ewe Chamber (the lamb-wool the barrow was laid with)
box(g, 2, 4, 10, 4, 'r');                           // and one down the Reeve's Hall
for (const x of [9, 10, 14, 17, 18, 23, 24]) put(g, x, 12, 'a');   // a few worn flags along the hall's south edge
for (const x of [8, 12, 16, 21, 25]) put(g, x, 10, 'a');
const ground = wallDepth(rows(g));

// ---------------------------------------------------------------- overlays
const overlays = [
  // the thirteen niches in the north wall of the Reeve's Hall: twelve lettered, one apart and blank (lit once the Reeve is named)
  ...Array.from({ length: 12 }, (_, i) => ({ t: 'x1_niche_lettered', x: 2 + i, y: 1 })),
  { t: 'x1_niche_blank', x: 15, y: 1, ifNot: 'reeve_named' }, { t: 'x1_niche_lit', x: 15, y: 1, if: 'reeve_named' },
  // the Counting Room: twelve niches that hold nothing yet (eight on this wall)
  ...Array.from({ length: 8 }, (_, i) => ({ t: 'x1_niche_blank', x: 19 + i, y: 1 })),
  { t: 'wall_glyph_revealed', x: 5, y: 8 },             // the landing slab: A NAME FOR EACH STONE (always readable)
  { t: 'wall_broken', x: 10, y: 14 },                  // the Ewe Chamber's niche (behind the heavy block)
  { t: 'wall_broken', x: 23, y: 14 },                  // the Ossuary's hollow behind the cracked wall
  { t: 'roots_0', x: 1, y: 3 }, { t: 'roots_1', x: 16, y: 5 }, { t: 'roots_2', x: 26, y: 6 }, { t: 'roots_1', x: 13, y: 12 },
  { t: 'roots_0', x: 24, y: 12 }, { t: 'roots_2', x: 8, y: 17 }, { t: 'roots_1', x: 24, y: 17 },
];

// ---------------------------------------------------------------- decor
const decor = [
  { t: 'stairs_up', x: 3, y: 9 },                        // up to the Downs (the stair notch is the door)
  { t: 'stairs_up', x: 21, y: 9 },                       // up to the Counting Room
  { t: 'x1_slab_doorway', x: 10, y: 14 },                // the Ewe Chamber's doorway (cells 12..13), pockets either side
  { t: 'x1_slab_doorway', x: 17, y: 14 },                // the Ossuary's doorway (cells 19..20)
  { t: 'brazier_lit', x: 1, y: 10 }, { t: 'brazier_lit', x: 6, y: 10 },   // the landing's two braziers
  { t: 'brazier_lit', x: 26, y: 10 }, { t: 'brazier_lit', x: 7, y: 10 },
  { t: 'brazier_lit', x: 19, y: 3 }, { t: 'brazier_lit', x: 26, y: 3 },
  { t: 'brazier_lit', x: 1, y: 3 }, { t: 'brazier_lit', x: 10, y: 3 },
  { t: 'pillar', x: 23, y: 4 }, { t: 'pillar', x: 23, y: 5 },     // the pillars that make the plate puzzle bend
  { t: 'pillar', x: 11, y: 3 }, { t: 'pillar', x: 11, y: 6 },     // the mouth of the Reeve's Hall (rows 4..5 are the way in)
  { t: 'x1_boulder_a', x: 24, y: 17 }, { t: 'x1_haybale', x: 15, y: 17 }, { t: 'x1_boulder_a', x: 8, y: 17 },
  // the Reeve's Hall: candelabra at his niches, a drover's sack by the wall, a trough where the lamp oil was kept
  { t: 'candelabra', x: 5, y: 3 }, { t: 'candelabra', x: 9, y: 3 }, { t: 'x1_trough_dry', x: 2, y: 4 }, { t: 'x1_flour_sacks', x: 9, y: 6 },
  { t: 'pillar', x: 6, y: 6 }, { t: 'pillar', x: 2, y: 3 },
  // the landing: a bench of stones and the first torch of the way down
  { t: 'x1_boulder_b', x: 1, y: 14 }, { t: 'candelabra', x: 1, y: 12 }, { t: 'x1_boulder_a', x: 6, y: 13 },
  // the Counting Room: twelve empty niches and a lamp
  { t: 'candelabra', x: 21, y: 3 }, { t: 'x1_boulder_a', x: 26, y: 5 },
];

// ---------------------------------------------------------------- events
const events = [
  enter('barrow_enter', 'barrow_entry'),
  stairs('barrow_exit', 3, 9, ['x1_downs', 14, 6, 'down']),
  sign('barrow_slab_a', 5, 9, 'barrow_slab_a', { solid: false }),
  chest('chest_bw_landing', 5, 14, 'wood', { item: 'antidote', qty: 2 }),
  // the hall: one floor switch, two slabs on rails (start: the Ossuary open, the Ewe Chamber shut)
  // `stateFlag`: the switch keeps its place in a save (a save made in the Ewe Chamber reloads with its slab open, not sealed in)
  { ...floorSwitch('sw_slab', 15, 11, ['slab_n', 'slab_s']), stateFlag: 'x1_barrow_slab_thrown' },
  shelf('slab_n', [[12, 14], [14, 14]], { sprite: 'x1_slab', sfx: 'slab_slide' }),
  shelf('slab_s', [[21, 14], [19, 14]], { sprite: 'x1_slab', sfx: 'slab_slide' }),
  // the Ewe Chamber: a heavy block before the niche; the gold chest holds the Drover's Bow
  { id: 'block_niche', type: 'block', x: 10, y: 16, sprite: 'push_block', heavy: true },
  chest('chest_bw_bow', 10, 15, 'gold', { item: 'drovers_bow' }),
  // the Ossuary: a cracked wall (Dash) over the iron chest
  object('x1_crack_oss', 23, 14, 'wall_cracked', { breakable: 'rock', text: 'cliff_crack', h: 2 }),
  chest('chest_bw_oss', 23, 15, 'iron', { item: 'phoenix_feather', behind: 'x1_crack_oss' }),
  // the stair up and its two-cell notch
  stairs('stairs_e', 21, 9, ['x1_barrow', 21, 7, 'up'], { w: 2 }),
  door('notch_e', 21, 7, ['x1_barrow', 21, 10, 'down'], { w: 2, kind: 'stairs' }),
  // the Counting Room: block -> plate -> the barred gate to the hearth
  block('block_c', 20, 4),
  plate('plate_c', 25, 6, 'gate_reeve'),
  light('plate_glow', 25, 6, 30, '#e0b860'),   // integrate: the plate is grey on grey, a small warm glow marks it
  gate('gate_reeve', 17, 4, GATE_SPRITE, { flag: 'x1_gate_reeve_open' }),   // integrate: once the block has been on the plate the gate stays open (blocks reset on a reload, and the hearth saves behind this gate)
  // the Shepherds' Hearth (a font: rest, full heal, save) before the trigger row
  { id: 'barrow_hearth', type: 'font', x: 13, y: 6, w: 3, h: 2, text: 'barrow_hearth', sprite: 'rune_shrine', safe: true },
  trigger('reeve_trig', 11, 4, 1, 2, 'reeve_intro'),
  // the Reeve's Hall: the Reeve himself, then (after the battle) the chest, and the names that only the Lantern reads
  actor('barrow_reeve', 4, 5, 'barrow_reeve', 'down', { ifNot: 'barrow_reeve_defeated' }),
  chest('chest_bw_reeve', 2, 6, 'iron', { if: 'barrow_reeve_defeated' }),   // integrate: gold tier -> iron (plan 8.5: the completionist's gold stayed over 5,300)
  book('barrow_names', 8, 2, 'barrow_names', { solid: false, lantern: true, if: 'barrow_reeve_defeated' }),
  // light: the dungeon is dark (0.45); the braziers and the hearth carry it
  light('light_a1', 1, 10, 5, '#ffb070'), light('light_a2', 6, 10, 5, '#ffb070'), light('light_h1', 26, 10, 5, '#ffb070'),
  light('light_h2', 7, 10, 5, '#ffb070'), light('light_e1', 19, 3, 5, '#ffb070'), light('light_e2', 26, 3, 5, '#ffb070'),
  light('light_g1', 1, 3, 5, '#ffb070'), light('light_g2', 10, 3, 5, '#ffb070'), light('light_hearth', 14, 5, 5, '#9fe8d8'),
  // visible enemies: 2 per ZONES.x1_barrow.plan plus the Reeve (dungeon rule: they step when the player steps)
  enemy('e_bw_shades', 11, 11, 'barrow_shade', 'bw_shades', 'patrol', { path: steps('right', 8, 'left', 8) }),
  enemy('e_bw_mixed', 22, 17, 'barrow_shade', 'bw_mixed', 'guard'),
];

export default {
  id: 'x1_barrow', name: "The Wethers' Barrow", area: 'dungeon',
  music: 'wethers_barrow', ambience: 'wind_valley', tileset: 'x1',
  lighting: { tint: 'none', dark: 0.45 },
  under: 'x1_barrow_floor',
  pitTo: ['x1_barrow', 3, 10, 'down'],
  legend: { '#': 'x1_barrow_top', '|': 'x1_barrow_face', 'v': 'x1_barrow_out_top', 'o': 'x1_barrow_out_face', '.': 'x1_barrow_floor',
    'a': 'x1_barrow_flag', 'r': 'x1_barrow_runner' },
  ground,
  overlays,
  decor,
  overhead: [],
  events,
  exits: [],
  marks: {
    entrance: [3, 10], hall_w: [8, 11], switch: [15, 11], niche: [10, 16], ossuary: [17, 16], counting: [21, 5], plate: [25, 6],
    hearth: [14, 4], reeve_spot: [4, 5], names: [8, 3], reeve_chest: [3, 6],
  },
  start: { x: 3, y: 10, dir: 'down' },
};
