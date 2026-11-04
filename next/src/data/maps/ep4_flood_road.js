// The Flood Road (52 x 30, field). EPISODE4_PLAN 4.1; exact cells in docs/MAPS_EP4_A.md.
//
// The road drops out of Emberpeak's washed-out east road (the rope ladder at the west edge) into a farming valley gone to
// water, and runs east to Hale's landing on the river. Four stretches, west to east:
//   The Washout (x 0..13): a rocky ravine under the ridge (rows 3..5), the drop to the drowned fields on the south (cliff
//      rows 18..20). The ladder foot (0, 13..15) is the way back up to Emberpeak. first_fight_trig is column 7 (every
//      passable cell of it); the e4r_first pair waits at the bend (11,17). The broken cart lies on the scree.
//   The Drowned Lane (x 12..27): basin `l` (2 levels, start 1 = mid). The road runs down a sunken lane (rows 14..17,
//      canal stairs at both ends) that is under a hand of water at mid and dry at low. The farm sluice and its wheel
//      wh_lane stand at the lane's north-west corner; the wheel is faced from the road apron (13,13) and from the sluice
//      stand (15,13), a dry stone step that drops into the lane by a stair (15,14). North of the stand the punt pt_lane
//      sits in the farm ditch (15,12), the only way to the fenced plot with the wood chest. At low the punt is aground
//      (solid); at mid it floats. So: drain from the road, walk the dry lane up to the stand, raise from the stand (it
//      never floods), ride the punt to the chest, drain again and walk on east. The far lock wh_lane_e on the east bank
//      (26,13) turns the same basin, so a party that comes back from Valewyn by the ferry can always drain the lane west.
//   Hale's Landing (x 28..50): the road on to the river: the peddler's tarp (a cloth stall), the campfire ferry_fire
//      (rest, a safe point), Hale and Nilo, the jetty and the ferry (a boat door to Valewyn once saw_valewyn). Two groups
//      on the dry banks. North of the road the old farm meadow (a well, the farmhouse, the cracked boulder in the ridge
//      face that hides the iron chest).
//   The Bluff (x 36..51, rows 6..8): stairs up at x 38; the lookout over the bay where valewyn_far (environments cell 3)
//      stands on the far shore (overhead, (41,0)); vw_view_trig is column 44. One group patrols the far end.
import { grid, box, put, rows, scatter, hash01, sign, object, trigger, enemy, chest, steps, enter, npc, bridgeH, door, pot } from './_kit.js';

const W = 52, H = 30;
const g = grid(W, H, '.');
const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

// ---------------------------------------------------------------- terrain
// the ridge along the north (top row 3, faces 4..5) with hills above it; over the meadow the rock runs to the map edge and
// holds the grotto behind the cracked boulder (28,4..5)
box(g, 0, 3, 35, 3, '^');
box(g, 0, 4, 35, 5, '|');
box(g, 23, 0, 33, 2, '^');
box(g, 27, 1, 29, 2, ':');
put(g, 28, 3, ':');
// the spur between the meadow and the bluff (x 35, rows 3..12)
box(g, 35, 3, 35, 12, '^'); put(g, 35, 11, '|'); put(g, 35, 12, '|');
// the bay north-east (water to the edges) and the bluff floor over it
box(g, 36, 0, 51, 5, '~');
box(g, 36, 6, 51, 6, 's');
box(g, 36, 7, 51, 8, '.');
box(g, 36, 9, 51, 9, '^'); box(g, 36, 10, 51, 11, '|');
put(g, 38, 9, 'T'); put(g, 38, 10, 't'); put(g, 38, 11, 'z');
// the river along the east and the south-east
box(g, 45, 12, 51, 29, '~');
box(g, 26, 24, 44, 29, '~');
for (const [x0, y] of [[43, 23], [41, 22], [44, 21]]) box(g, x0, y, 44, y, '~');
// the washout: scree under the ridge, the road, the drop to the drowned fields (cliff top 18, faces 19..20)
box(g, 0, 6, 12, 17, ':');
for (let y = 6; y < 13; y++) for (let x = 0; x < 13; x++) if (hash01(x, y, 3) < 0.25 + (12 - y) * 0.07) put(g, x, y, '.');
box(g, 0, 18, 12, 18, '^'); box(g, 0, 19, 12, 20, '|');
box(g, 0, 21, 25, 29, '~');
box(g, 13, 17, 25, 23, '~');
// two islets in the drowned fields (a willow on each) and the old hedge line half under water
box(g, 4, 24, 6, 25, '.'); put(g, 5, 23, '.'); box(g, 16, 25, 18, 26, '.'); put(g, 17, 27, '.');
// the farm north of the lane: the plot (14..16, 9..11) behind its fence, the ditch (13..17, 12), the meadow (18..34, 6..12)
box(g, 13, 6, 13, 11, 'F'); box(g, 13, 8, 17, 8, 'F'); box(g, 17, 8, 17, 11, 'F');
box(g, 14, 9, 16, 11, '.');
box(g, 13, 12, 17, 12, '~');
put(g, 15, 12, 'd');                         // the punt's berth: a ditch-floor cell of the basin
box(g, 18, 13, 25, 13, 'F');
// the lane: basin cells (14..25, 14..17); stairs at both ends of the road rows, the stair down from the sluice stand
box(g, 14, 14, 25, 17, 'f');
box(g, 14, 15, 25, 16, 'l');
put(g, 14, 17, '~'); put(g, 25, 14, '~'); put(g, 25, 17, '~');
put(g, 14, 14, '~');                         // the tide post stands in the water at the lane's corner (never a floor)
// roads: the ravine road (rows 14..15) bending down to the lane (rows 15..16), the apron at the sluice, the east bank,
// the road to the jetty, the path up to the bluff stairs, the bluff path
box(g, 0, 14, 8, 15, '=');
box(g, 8, 15, 13, 16, '=');
box(g, 12, 13, 13, 14, '=');
put(g, 15, 13, ':');                         // the sluice stand
box(g, 26, 14, 27, 16, '='); put(g, 27, 13, '=');
box(g, 28, 15, 44, 16, '=');
box(g, 38, 12, 38, 14, '=');
box(g, 39, 7, 50, 7, '='); box(g, 38, 8, 39, 8, '=');
// the landing's sand along the river and the bay shore
for (let y = 12; y < 24; y++) for (let x = 26; x < 45; x++) {
  if (!'.'.includes(g[y][x])) continue;
  const near = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1]].some(([dx, dy]) => inb(x + dx, y + dy) && g[y + dy][x + dx] === '~');
  if (near || (x >= 39 && y >= 17)) put(g, x, y, 's');
}
// tall grass in the meadow and on the south bank
for (let y = 6; y < 24; y++) for (let x = 18; x < 44; x++) if (g[y][x] === '.' && hash01(x, y, 5) < 0.12) put(g, x, y, ',');
const ground = rows(g.map((r) => r));

// ---------------------------------------------------------------- the tide grid (basin `l`, 2 levels)
const basin = grid(W, H, '.');
const height = grid(W, H, '.');
for (let y = 14; y <= 17; y++) for (let x = 14; x <= 25; x++) if (ground[y][x] !== '~') { put(basin, x, y, 'l'); put(height, x, y, '0'); }
put(basin, 15, 12, 'l'); put(height, 15, 12, '0');

// ---------------------------------------------------------------- dressing
const overlays = [
  ...scatter(ground, ['.'], ['tuft_0', 'tuft_1', 'flowers_blue', 'pebbles_0'], 0.07, 61),
  ...scatter(ground, [':'], ['pebbles_0', 'pebbles_1', 'pebbles_2'], 0.16, 62),
  ...scatter(ground, ['s'], ['pebbles_0', 'pebbles_2'], 0.12, 63),
  ...scatter(ground, ['='], ['pebbles_0', 'pebbles_1'], 0.05, 64),
  // reeds where the field drowned
  // (reeds stand on the dry edge: an overlay's collision replaces its cell's, so never on the water)
  ...[[24, 18], [30, 23], [36, 23], [44, 13], [27, 23], [33, 23], [4, 23], [17, 25], [43, 20]].filter(([x, y]) => ground[y][x] !== '~').map(([x, y], i) => ({ t: `reeds_${i % 3}`, x, y })),
  // the lane's stairs (basin cells: they go under at mid) and the stand's step down
  { t: 'canal_stair_e', x: 14, y: 15 }, { t: 'canal_stair_e', x: 14, y: 16 },
  { t: 'canal_stair_w', x: 25, y: 15 }, { t: 'canal_stair_w', x: 25, y: 16 },
  { t: 'canal_stair_s', x: 15, y: 14 },
  // the jetty to the ferry
  ...bridgeH(45, 50, 15, 'wood'),
  { t: 'wall_broken', x: 28, y: 5 },           // the grotto mouth behind the cracked boulder
];
const TREES = [
  [1, 0], [5, 1], [9, 0], [13, 1], [17, 0], [20, 1], [34, 0],
  [2, 7], [10, 9], [4, 11], [19, 7], [31, 8], [33, 11], [22, 10], [29, 21], [35, 20], [27, 21], [41, 8], [49, 8],
];
const walkable = (x, y) => inb(x, y) && '.,=:s'.includes(ground[y][x]);
const decor = [
  ...TREES.filter(([x, y]) => walkable(x, y) && ground[y][x] !== '=').map(([x, y], i) => ({ t: i % 3 === 1 ? 'tree_willow' : 'tree_pine', x, y })),
  { t: 'rope_ladder', x: 0, y: 15 },            // the way back up to Emberpeak (the exit cells under it)
  { t: 'floodwrack', x: 3, y: 11 },             // the broken cart's spill
  { t: 'crates_barrels', x: 5, y: 12 },
  { t: 'bush', x: 10, y: 7 }, { t: 'bush', x: 2, y: 9 }, { t: 'bush', x: 11, y: 12 },
  // the farm: the sluice housing beside the wheel, the farmhouse, the well, a hay cart, fences' posts
  { t: 'sluice_farm', x: 16, y: 13 },
  { t: 'house_small', x: 20, y: 11 },
  { t: 'well', x: 27, y: 9 },
  { t: 'bush', x: 18, y: 12 }, { t: 'bush', x: 25, y: 12 }, { t: 'bush', x: 31, y: 12 },
  { t: 'roof_drowned_a', x: 17, y: 18 }, { t: 'roof_drowned_b', x: 9, y: 27 }, { t: 'chimney_drowned', x: 21, y: 21 },
  { t: 'tree_willow', x: 4, y: 25 }, { t: 'tree_willow', x: 16, y: 26 }, { t: 'bush', x: 6, y: 24 },
  // the old hedge line, half under water, and the posts of a drowned fence
  ...[[1, 22], [3, 22], [8, 23], [11, 23], [13, 24], [20, 24], [23, 23]].map(([x, y]) => ({ t: 'bush', x, y })),
  ...[[19, 20], [22, 20], [12, 26], [21, 27], [24, 26]].map(([x, y]) => ({ t: 'mooring_post', x, y })),
  { t: 'sandbags', x: 12, y: 17 }, { t: 'sandbag', x: 26, y: 17 },
  // the landing: the tarp, crates, the posts on the bank
  { t: 'market_stall_cloth', x: 40, y: 13 },
  { t: 'crate', x: 43, y: 13 }, { t: 'barrel', x: 39, y: 13 },
  { t: 'mooring_post', x: 44, y: 14 }, { t: 'mooring_post', x: 44, y: 17 },
  { t: 'lamp_post', x: 37, y: 17 },
  // the bluff
  { t: 'bench', x: 41, y: 6 },
];

// ---------------------------------------------------------------- events
const events = [
  enter('flood_enter', 'flood_road_arrival'),
  // ---- the washout
  trigger('first_fight_trig', 7, 6, 1, 12, 'flood_first_fight'),
  enemy('e_e4r_first', 11, 17, 'ink_bloom', 'e4r_first', 'guard'),
  sign('broken_cart', 3, 11, 'ep4_broken_cart'),
  // ---- the drowned lane
  trigger('lane_trig', 12, 13, 1, 4, 'flood_lane'),
  sign('lane_sign', 12, 13, 'ep4_lane_sign', { solid: false }),
  { id: 'wh_lane', type: 'tidewheel', x: 14, y: 13, basin: 'l', crank: false, sprite: 'tide_wheel', text: 'ep4_farm_wheel' },
  { id: 'wh_lane_e', type: 'tidewheel', x: 26, y: 13, basin: 'l', crank: false, sprite: 'tide_wheel', text: 'ep4_farm_wheel' },
  { id: 'post_lane', type: 'tidepost', x: 14, y: 14, basin: 'l', sprite: 'tide_post', text: 'ep4_tide_post' },
  { id: 'pt_lane', type: 'pontoon', x: 15, y: 12, basin: 'l', rides: [1], sprite: 'pontoon', text: 'ep4_pontoon' },
  chest('chest_punt', 15, 9, 'wood', { item: 'hi_potion', qty: 2 }),
  sign('farm_roof', 17, 18, 'ep4_farm_roof'),
  // ---- the meadow: the cracked boulder and the grotto
  object('crack_boulder_fr', 28, 4, 'wall_cracked', { breakable: 'rock', text: 'cliff_crack', h: 2, opens: [[28, 4], [28, 5], [28, 3]] }),
  chest('chest_grotto_fr', 28, 1, 'iron', { behind: 'crack_boulder_fr' }),
  // ---- Hale's landing
  object('ferry_fire', 41, 18, 'carters_fire', { script: 'ferry_rest', safe: true, rest: true }),
  npc('hale', 40, 17, 'down'),
  npc('nilo', 42, 19, 'left'),
  sign('ferry_post', 44, 17, 'ep4_ferry_post'),
  object('ferry_moored', 49, 16, 'boat', { w: 2, text: 'ep4_ferry_post', ifNot: 'saw_valewyn' }),
  door('ferry_vw', 49, 16, ['ep4_valewyn', 21, 32, 'up'], { w: 2, kind: 'boat', sprite: 'boat', if: 'saw_valewyn' }),
  enemy('e_e4r_hounds', 31, 20, 'flood_hound', 'e4r_hounds', 'wander', { radius: 2 }),
  enemy('e_e4r_crabs', 41, 21, 'lockjaw_crab', 'e4r_crabs', 'wander', { radius: 1 }),
  // ---- the bluff
  trigger('vw_view_trig', 44, 6, 1, 3, 'vw_view'),
  sign('valewyn_far_sign', 46, 6, 'ep4_valewyn_far', { solid: false }),
  enemy('e_e4r_mixed', 48, 8, 'flood_hound', 'e4r_mixed', 'patrol', { path: steps('left', 2, 'right', 2) }),
  pot('pot_bluff', 51, 7, { item: 'hi_ether' }),
];

export default {
  id: 'ep4_flood_road', name: 'The Flood Road', area: 'field',
  respawn: 'reentry',
  music: 'millrace', ambience: 'canal_rain', tileset: 'town',
  lighting: { tint: 'flood_grey', dark: 0 },
  weather: 'rain',
  under: 'flood_grass',
  legend: {
    '.': 'flood_grass', ',': 'tallgrass', '=': 'mud_path', ':': 'dirt', 's': 'sand', '~': 'tide_water', 'F': 'fence_wood',
    'l': 'mud_path', 'f': 'flood_grass', 'd': 'canal_floor',
    '^': 'cliff_top', '|': 'cliff_face', 'T': 'cliff_stairs_top', 't': 'cliff_stairs_mid', 'z': 'cliff_stairs_bot',
  },
  ground,
  overlays,
  decor,
  overhead: [{ t: 'valewyn_far', x: 41, y: 0 }],
  tide: {
    basins: { l: { start: 1, levels: 2, wheel: 'wh_lane' } },
    basin: rows(basin),
    height: rows(height),
  },
  events,
  exits: [{ x: 0, y: 14, w: 1, h: 2, to: ['emberpeak', 37, 15, 'left'] }],
  marks: {
    entry: [1, 15], lane: [19, 15], fire: [41, 17], hale_spot: [40, 17], nilo_spot: [42, 19], bluff: [45, 7],
    valewyn_far: [46, 2], ferry: [48, 16],
    sluice: [15, 13], punt: [15, 12], plot: [15, 10],
  },
  start: { x: 1, y: 15, dir: 'right' },
};
