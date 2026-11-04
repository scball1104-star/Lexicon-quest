// The Sunken Keep: The Drowned Throne (24 x 20, dungeon, dark 0.15). EPISODE4_PLAN 4.8; exact cells in
// docs/MAPS_EP4_B.md.
//
// A round throne room under water to the ankles: the floor is wet canal stone, open water stands in two crescents either
// side of the aisle and round the dais. The Sunken Seal door from F3's antechamber lands at the south mouth (11,18); the
// way back is the notch below it. On the dais (rows 5..8) the Drowned Throne (10..13, 4..7, a 4 x 4 object: occupied,
// then empty), and the Paper Regent's map actor paper_regent (sprite paper_regent_avatar) in its seat (11,6) until it
// falls. regent_trig crosses row 14 from wall to wall. After paper_regent_defeated: the Witness Book page and the black
// feather on the side table (16..17,9), and the boat boat_crown_out (5..6,16) home to Valewyn's north landing (its
// arrival runs crown_remembers). regent_after's scene spawns Hale, Joss and the Regent at lyra_enter itself.
import { rows, wallDepth, put, box, grid, door, sign, object, trigger, actor, enter, light } from './_kit.js';
import { keepLegend, boat } from './ep4_keep_f1.js';

const W = 24, H = 20;
const g = grid(W, H, '#');
// the round hall: an ellipse of floor round (11.5, 11), its north face rows 3..4
for (let y = 5; y <= 18; y++) for (let x = 1; x < W - 1; x++) {
  const dx = (x - 11.5) / 10.4, dy = (y - 11.4) / 7.2;
  if (dx * dx + dy * dy <= 1) put(g, x, y, 'c');
}
for (let x = 0; x < W; x++) if (g[5][x] === 'c' || g[6][x] === 'c') { put(g, x, 3, '|'); put(g, x, 4, '|'); }
box(g, 11, 18, 12, 19, 'c');                 // the south mouth and its notch
box(g, 8, 5, 15, 8, 'd');                    // the dais (marble)
box(g, 10, 9, 13, 18, 'a');                  // the aisle (marble runner)
// open water: two crescents either side of the aisle and a moat before the dais
for (const [x0, x1, y] of [[3, 7, 10], [2, 7, 11], [2, 7, 12], [3, 6, 13], [16, 20, 10], [16, 21, 11], [16, 21, 12], [17, 20, 13]]) box(g, x0, y, x1, y, '~');
for (const [x0, x1, y] of [[3, 7, 15], [3, 7, 16], [4, 6, 17]]) box(g, x0, y, x1, y, '~');
box(g, 6, 9, 7, 9, '~'); box(g, 16, 9, 17, 9, '~');
const ground = rows(wallDepth(g));
// keep the moat off the side table: (16..17,9) is the table's floor, not water
const G = ground.map((r) => r.split(''));
G[9][16] = 'c'; G[9][17] = 'c'; G[8][17] = 'c'; G[8][16] = 'c';
const groundRows = G.map((r) => r.join(''));

export default {
  id: 'ep4_keep_crown', name: 'The Drowned Throne', area: 'dungeon',
  music: null, ambience: 'keep_drip', tileset: 'ep4',
  lighting: { tint: 'none', dark: 0.15, lights: [] },
  floorShade: { color: '#14101e', alpha: 0.4, rows: 8, side: 3 },
  under: 'canal_floor',
  legend: keepLegend('witness', 'witness_floor', { 'd': 'marble_walk', 'a': 'marble_walk' }),
  ground: groundRows,
  overlays: [],
  decor: [
    { t: 'candelabra', x: 8, y: 5 }, { t: 'candelabra', x: 15, y: 5 },
    { t: 'pillar', x: 4, y: 7 }, { t: 'pillar', x: 19, y: 7 }, { t: 'pillar', x: 4, y: 14 }, { t: 'pillar', x: 19, y: 14 },
    { t: 'lantern_chain', x: 5, y: 11 }, { t: 'lantern_chain', x: 18, y: 11 },
    { t: 'reading_table', x: 16, y: 8 }, { t: 'mooring_post', x: 3, y: 14 },
  ],
  overhead: [],
  events: [
    enter('crown_enter', 'regent_after'),
    object('throne', 10, 7, 'throne_paper', { w: 4, state: 0, text: 'ep4_throne', ifNot: 'paper_regent_defeated' }),
    object('throne_empty', 10, 7, 'throne_paper', { w: 4, state: 1, text: 'ep4_throne', if: 'paper_regent_defeated' }),
    actor('paper_regent', 11, 6, 'paper_regent_avatar', 'down', { ifNot: 'paper_regent_defeated', name: 'The Paper Regent' }),
    trigger('regent_trig', 1, 14, 22, 1, 'paper_regent'),
    sign('witness_page', 16, 8, 'ep4_witness_page', { solid: false, if: 'paper_regent_defeated' }),
    object('feather_page', 17, 8, 'prop_feather_black', { text: 'ep4_witness_page', solid: false, if: 'paper_regent_defeated' }),
    door('crown_exit', 11, 19, ['ep4_keep_f3', 22, 4, 'down'], { w: 2 }),
    boat('boat_crown_out', 5, 17, ['ep4_valewyn', 29, 4, 'down'], { if: 'paper_regent_defeated' }),
    light('l_throne', 11, 7, 6), light('l_aisle', 11, 13, 5),
  ],
  exits: [],
  marks: {
    throne: [11, 6], party_stop: [11, 12], table: [16, 9], lyra_enter: [11, 17], lyra_sign: [12, 10], charter_spot: [11, 9],
    entry: [11, 18],
  },
  start: { x: 11, y: 18, dir: 'up' },
};
