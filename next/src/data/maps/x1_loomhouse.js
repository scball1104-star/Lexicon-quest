// The Loom House (14 x 11, interior): Tamsin at the great loom (her talk opens the shop `thornfold_loom`), a spinning wheel,
// fleece and dyed wool, the framed sampler of the twelve names (pale thread until stones_lettered), a bed, and the hearth
// `thornfold_hearth` (a font, `safe`: full heal and save). Same shape as the smithy: one gap in the south wall; the Downs'
// door lands on the gap cell facing up, the exit lands on (36, 21) in front of the door facing down (tested both ways).
// A pack file of the `x1` expansion; the ids come from assets/tiles/x1_tiles.json (x1_loom, x1_hearth, x1_sampler ...).
import { rows, npc, door, object } from './_kit.js';

const ground = rows([
  //01234567890123
  '##############', // 0
  '#||||||||||||#', // 1
  '#||||||||||||#', // 2
  '#............#', // 3
  '#............#', // 4
  '#............#', // 5
  '#............#', // 6
  '#............#', // 7
  '#............#', // 8
  '#######.######', // 9   the door gap is (7, 9)
  '##############', // 10
]);

export default {
  id: 'x1_loomhouse', name: 'The Loom House', area: 'interior',
  music: 'the_downs', ambience: null, tileset: 'interior',
  lighting: { tint: 'none', dark: 0 },
  under: 'wood_floor',
  legend: { '#': 'interior_wood_top', '|': 'interior_wood_face', '.': 'wood_floor' },
  ground,
  overlays: [
    { t: 'window_in', x: 2, y: 1 }, { t: 'window_in_curtain_red', x: 8, y: 1 },
    { t: 'in_barrel', x: 1, y: 3 }, { t: 'in_crate', x: 2, y: 3 }, { t: 'in_sacks', x: 1, y: 8 },
    { t: 'in_pot', x: 12, y: 8 },
    { t: 'carpet_red', x: 7, y: 8 }, { t: 'carpet_red', x: 7, y: 7 }, { t: 'carpet_red', x: 7, y: 9 },
  ],
  decor: [
    { t: 'x1_loom', x: 3, y: 5 },                         // footprint (3..5, 5); Tamsin stands just below it
    { t: 'x1_spinning_wheel', x: 8, y: 5 },
    { t: 'x1_wool_shelf', x: 5, y: 3 },                   // footprint (5..6, 3), the dyed hanks on the north wall
    { t: 'x1_wool_bales', x: 2, y: 7 },
    { t: 'bed_single', x: 11, y: 5 },
    { t: 'table_round', x: 9, y: 7 },
    { t: 'chair_left', x: 11, y: 7 }, { t: 'chair_right', x: 7, y: 6 },
    { t: 'rug_round', x: 4, y: 7 },
  ],
  overhead: [],
  events: [
    npc('tamsin', 4, 6, 'up'),
    door('loom_exit', 7, 9, ['x1_downs', 36, 21, 'down']),
    // the hearth: a Keeper's-font style rest point (full heal, save), warm and woolly
    { id: 'thornfold_hearth', type: 'font', x: 9, y: 3, w: 3, h: 1, text: 'thornfold_hearth', sprite: 'x1_hearth', safe: true },
    // the sampler: pale thread, then dark again once the stones have their names (frame 0 / frame 1)
    object('x1_sampler', 3, 2, 'x1_sampler', { text: 'x1_sampler', state: 0, ifNot: 'stones_lettered' }),
    object('x1_sampler_dark', 3, 2, 'x1_sampler', { text: 'x1_sampler', state: 1, if: 'stones_lettered' }),
  ],
  exits: [],
  marks: { tamsin: [4, 7], hearth: [10, 4], sampler: [3, 3], door: [7, 9] },
  start: { x: 7, y: 8, dir: 'up' },
};
