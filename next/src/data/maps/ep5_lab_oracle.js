// The Oracle Labyrinth: The Eye of the Oracle (24 x 20, dungeon, dark 0.3). EPISODE5_PLAN 4.9; exact cells in
// docs/MAPS_EP5_B.md.
//
// A round chamber of star-glass at the Well's floor, open to the night sky through the shaft: a pool of starlight in the
// middle. The Sun Keyhole from F3's keyhole room lands at the south mouth (11,18); the way back is the doorway below it.
// The golden ring (10..13, 5..8, a 4 x 4 object: coiled, then empty) on the north side, and the Sand Oracle's map actor
// oracle (sprite oracle_avatar) coiled round it at (11,7) until it falls. oracle_trig crosses row 13 from wall to wall,
// so the party stops on party_stop (11,11) with the Oracle two rows above its head. After oracle_defeated: the chart's
// glow in the ring, the black feather by it (feather_spot), and the brass lift up the shaft (17,5) to Saffron Haven's north
// gate, whose arrival runs every_road. oracle_after also runs on entry after a reload between the win and the chart.
import { rows, wallDepth, put, box, grid, door, sign, object, trigger, actor, enter, light } from './_kit.js';
import { labLegend, lift } from './ep5_lab_f1.js';

const W = 24, H = 20;
const g = grid(W, H, '#');
// the round floor: an ellipse round (11.5, 10.5), its north face rows 2..3
for (let y = 4; y <= 18; y++) for (let x = 1; x < W - 1; x++) {
  const dx = (x - 11.5) / 10.6, dy = (y - 11) / 7.4;
  if (dx * dx + dy * dy <= 1) put(g, x, y, '*');
}
for (let x = 0; x < W; x++) if (g[4][x] === '*' || g[5][x] === '*') { put(g, x, 2, '|'); put(g, x, 3, '|'); }
box(g, 11, 18, 12, 19, '*');                 // the south mouth and its doorway
box(g, 17, 4, 17, 4, '*'); put(g, 17, 3, '*');   // the lift's alcove in the north face
const ground = rows(wallDepth(g));

export default {
  id: 'ep5_lab_oracle', name: 'The Eye of the Oracle', area: 'dungeon',
  music: null, ambience: 'well_hush', tileset: 'ep5',
  lighting: { tint: 'none', dark: 0.3 },
  under: 'star_glass',
  legend: labLegend('well_shaft', 'star_glass', { 'v': 'well_shaft_top' }),
  ground,
  overlays: [],
  decor: [
    { t: 'lift_cage', x: 17, y: 4 },
    { t: 'vow_stone', x: 5, y: 7, state: 0 }, { t: 'vow_stone', x: 18, y: 8, state: 1 }, { t: 'vow_stone', x: 4, y: 14, state: 2 },
  ],
  overhead: [],
  events: [
    enter('eye_enter', 'oracle_after'),
    object('ring', 10, 8, 'oracle_ring', { state: 0, text: 'ep5_oracle_ring', ifNot: 'oracle_defeated' }),
    object('ring_empty', 10, 8, 'oracle_ring', { state: 1, text: 'ep5_oracle_ring', if: 'oracle_defeated' }),
    actor('oracle', 11, 7, 'oracle_avatar', 'down', { ifNot: 'oracle_defeated', name: 'The Sand Oracle' }),
    trigger('oracle_trig', 1, 13, 22, 1, 'oracle'),
    object('chart', 11, 7, 'chart_glow', { text: 'ep5_chart_glass', solid: false, if: 'chart_restored' }),
    object('feather_eye', 14, 10, 'feather_glass', { text: 'ep5_feather_eye', solid: false, if: 'oracle_defeated' }),
    door('eye_exit', 11, 19, ['ep5_lab_f3', 16, 37, 'down'], { w: 2 }),
    lift('lift_out', 17, 4, ['ep5_saffron', 21, 5, 'down'], { if: 'oracle_defeated' }),
    light('l_shaft', 11, 7, 6, '#bcd6ff'), light('l_pool', 11, 11, 4, '#9fc4ff'),
  ],
  exits: [],
  marks: {
    ring: [11, 6], party_stop: [11, 11], party_stop_m: [10, 11], party_stop_b: [12, 11], sel_enter: [11, 17],
    chart_spot: [11, 9], chart_spot_m: [10, 9], chart_spot_b: [12, 9], chart_sel: [13, 9], feather_spot: [14, 10],
    entry: [11, 18], lift_out: [17, 5],
  },
  start: { x: 11, y: 18, dir: 'up' },
};
