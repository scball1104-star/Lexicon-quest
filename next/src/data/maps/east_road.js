// The Fading Road (64 x 36, field). EPISODE2_PLAN 4.1.
//
// The tributary runs along the south edge from the mere in the north-east down to the valley in the west, so the
// road follows it upstream. Four stretches, west to east:
//   The Bank Road (x 0..19): the valley's east exit lands at (1,16). Meadow north, river south, silver birches. The blank
//      signpost; the first-fight cut down the whole of column 6; the Mist Wolf pack waiting at the bend, two tiles
//      outside its chase radius; the old milestone. North, a low rock outcrop with a cracked face (Dash Strike) hides
//      a clearing: a wood chest and a quicksilver group.
//   The Fading Stretch (x 20..39): the dirt ends. Between the rock line and the river, the mist. The true path zigzags
//      from cairn to cairn (each visible from the last); the cells beside it make a three-wide forgiving corridor and
//      every other cell of the stretch is a fog door that lands on fog_return (19,18), back at the start (plan 5.4).
//      A beetle group stands guard on the path halfway.
//   The Waystation (x 40..51): the ruined toll house (a wood chest inside), the toll board, the campfire (rest and a
//      safe point), the log bench, Penny's cart. Two groups nearby.
//   The Mere Shore (x 52..63): reeds, the still mere, the Court far off over the water (overhead decal). The rise with
//      the mere_view trigger. A heavy block plugs the causeway to a reed island (Shove it aside: iron chest). The
//      wolf pack guards the shore path. The road leaves east to the Nameless Hollow.
import { grid, box, put, rows, scatter, hash01, bridgeH, door, sign, object, trigger, enemy, chest, steps, enter, npc, fogDoor } from './_kit.js';

const W = 64, H = 36;
const g = grid(W, H, '.');
const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

// ---------------------------------------------------------------- terrain
// north edge: a pine fringe on a low cliff (rows 0..2), the rock line over the Fading Stretch
box(g, 0, 0, 51, 1, '^');
box(g, 0, 2, 51, 2, '|');
box(g, 20, 3, 39, 8, '^');                  // the rock line north of the stretch
box(g, 20, 9, 39, 10, '|');
// the outcrop with the cracked face (Dash Strike) and the clearing on top
box(g, 5, 4, 15, 9, '^');
box(g, 6, 5, 14, 8, '.');
box(g, 5, 10, 15, 11, '|');
// the tributary along the south: three or four rows of water with sand banks that swell and narrow in runs
const vnoise = (x, cell, salt) => {
  const gx = Math.floor(x / cell), fx = x / cell - gx, sx = fx * fx * (3 - 2 * fx);
  return hash01(gx, 0, salt) * (1 - sx) + hash01(gx + 1, 0, salt) * sx;
};
for (let x = 0; x < W; x++) {
  const top = 22 - (vnoise(x, 6, 72) > 0.62 ? 1 : 0);
  const bot = 24 + (vnoise(x, 5, 76) > 0.6 ? 1 : 0);
  for (let y = top; y <= bot; y++) put(g, x, y, '~');
  put(g, x, top - 1, 's');
  if (vnoise(x, 4, 77) > 0.55) put(g, x, top - 2, 's');
  put(g, x, bot + 1, 's');
  if (vnoise(x, 4, 78) > 0.5) put(g, x, bot + 2, 's');
}
// the south bank: meadow under a broken tree line (scenery)
for (let y = 28; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] === '.' && hash01(x, y, 73) < 0.3) put(g, x, y, ',');
// the mere in the north-east (still water, ragged shore), its outflow down the east edge to the tributary, the reed
// island with its causeway and the shore ledge where the heavy block stands
const MERE = [50, 50, 50, 54, 54, 54, 55, 53, 53, 53, 52, 52, 61];
MERE.forEach((x0, y) => box(g, x0, y, 63, y, 'm'));
put(g, 53, 4, 'm'); put(g, 55, 6, 'm'); put(g, 54, 8, '.'); put(g, 52, 10, '.');
for (let y = 13; y <= 21; y++) box(g, 61, y, 63, y, 'm');
put(g, 60, 19, 'm'); put(g, 60, 20, 'm'); put(g, 61, 13, 's');
box(g, 57, 7, 60, 8, 's');                  // the reed island
box(g, 58, 9, 58, 11, 's');                 // its causeway
box(g, 54, 12, 60, 12, 's'); box(g, 55, 13, 60, 13, 's');   // the shore ledge
// the roads: the bank road (dirt, bending and widening), the waystation yard, the shore path
const ROAD = { 15: [[9, 13]], 16: [[0, 19]], 17: [[0, 16]], 18: [[3, 7]] };
for (const [y, spans] of Object.entries(ROAD)) for (const [x0, x1] of spans) box(g, x0, +y, x1, +y, '=');
box(g, 40, 15, 51, 17, '='); box(g, 42, 18, 49, 18, '='); box(g, 52, 16, 60, 17, '=');
put(g, 52, 15, '='); put(g, 57, 15, '=');
// the rise above the mere (the mere_view trigger)
box(g, 52, 13, 54, 14, ',');

// ---------------------------------------------------------------- the Fading Stretch: cairn path, corridor, fog
// The true path (exact): right 4, up 3, right 4, down 5, right 4, up 3, right 7, down 1 -> the waystation at (40,16).
const PATH = [[20, 16]];
for (const [dir, n] of [['r', 4], ['u', 3], ['r', 4], ['d', 5], ['r', 4], ['u', 3], ['r', 7], ['d', 1], ['r', 1]]) {
  for (let i = 0; i < n; i++) {
    const [x, y] = PATH[PATH.length - 1];
    PATH.push(dir === 'r' ? [x + 1, y] : dir === 'u' ? [x, y - 1] : [x, y + 1]);
  }
}
const onPath = new Set(PATH.map(([x, y]) => `${x},${y}`));
const corridor = new Set();
for (const [px, py] of PATH) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) corridor.add(`${px + dx},${py + dy}`);
// the stretch floor is grass with tall drifts off the corridor; the cairn path itself is worn, not dirt
for (let y = 11; y <= 20; y++) for (let x = 20; x <= 39; x++) {
  if (g[y][x] !== '.') continue;
  if (!corridor.has(`${x},${y}`) && hash01(x, y, 75) < 0.5) put(g, x, y, ',');
}
for (const [x, y] of PATH) if (x >= 20 && x <= 39 && g[y][x] !== '~') put(g, x, y, 'p');
// cairns beside the path every 3 to 4 tiles (each visible from the last), on corridor cells off the path
const CAIRNS = [[22, 17], [25, 15], [27, 12], [27, 15], [27, 18], [31, 17], [33, 14], [36, 16], [38, 14]];

const ground = rows(g.map((r) => r));
const walkableGround = (x, y) => inb(x, y) && ['.', ',', '=', 's', 'p'].includes(ground[y][x]);
// fog: every walkable stretch cell that is not corridor, merged into horizontal runs (same-map fog doors)
const fogRuns = [];
for (let y = 11; y <= 20; y++) {
  let x = 20;
  while (x <= 39) {
    if (walkableGround(x, y) && !corridor.has(`${x},${y}`)) {
      const x0 = x;
      while (x <= 39 && walkableGround(x, y) && !corridor.has(`${x},${y}`)) x++;
      fogRuns.push([x0, y, x - x0]);
    } else x++;
  }
}

// ---------------------------------------------------------------- overlays
const overlays = [
  ...scatter(ground, ['.'], ['flowers_white', 'flowers_blue', 'tuft_0', 'tuft_1', 'pebbles_0', 'flowers_violet'], 0.06, 81),
  ...scatter(ground, [','], ['flowers_white', 'hydrangea_blue'], 0.05, 82),
  ...scatter(ground, ['s'], ['pebbles_0', 'pebbles_1', 'pebbles_2'], 0.25, 83),
  // reeds along the mere shore and around the island
  ...[[52, 11], [53, 12], [54, 11], [57, 9], [59, 9], [60, 9], [56, 8], [61, 8], [55, 12], [60, 12], [61, 14], [60, 18]]
    .filter(([x, y]) => ground[y][x] !== 'm').map(([x, y], i) => ({ t: `reeds_${i % 3}`, x, y })),
  ...bridgeH(60, 63, 16, 'wood', true),     // the little bridge over the mere's outflow, at the Hollow road
  { t: 'wall_broken', x: 10, y: 10 },       // W9: the clearing behind the cracked face (drawn over by the crack)
];

// ---------------------------------------------------------------- decor
const pines = [];
const pine = (x, y) => { if (walkableGround(x, y) || ground[y][x] === '^') pines.push({ t: 'tree_pine', x, y }); };
// the north fringe along the cliff top and the south bank's tree line
for (let x = 0; x < 50; x += 2) pine(x + (hash01(x, 1, 84) < 0.5 ? 0 : 1), hash01(x, 2, 84) < 0.5 ? 0 : 1);
for (let x = 0; x < W; x += 2) { const y = 29 + Math.floor(hash01(x, 6, 85) * 6); pine(x + (hash01(x, 7, 85) < 0.5 ? 0 : 1), y); }
// the stretch's rock line and the mist meadow beyond the corridor: scattered birches and pines
for (const [x, y] of [[21, 4], [25, 5], [29, 4], [34, 6], [38, 4]]) pine(x, y);
const decor = [
  ...pines,
  { t: 'tree_birch_silver', x: 2, y: 13 }, { t: 'tree_birch_silver', x: 15, y: 12 }, { t: 'tree_birch_silver', x: 18, y: 19 },
  { t: 'tree_birch_silver', x: 42, y: 7 }, { t: 'tree_birch_silver', x: 49, y: 8 },
  { t: 'bush', x: 1, y: 19 }, { t: 'bush', x: 9, y: 19 }, { t: 'bush', x: 13, y: 13 }, { t: 'bush', x: 17, y: 14 },
  { t: 'bush', x: 8, y: 6 }, { t: 'bush', x: 13, y: 8 },
  ...CAIRNS.map(([x, y]) => ({ t: 'cairn', x, y })),
  { t: 'signpost_blank', x: 3, y: 15 },
  // the Waystation
  { t: 'toll_ruin', x: 42, y: 14 },
  { t: 'bench', x: 44, y: 18 },
  { t: 'market_stall_cloth', x: 49, y: 14 },
  { t: 'crates_barrels', x: 48, y: 13 },
  { t: 'lamp_post', x: 41, y: 14, state: 1 }, { t: 'lamp_post', x: 51, y: 14, state: 1 },
  // the shore
  { t: 'tree_birch_silver', x: 53, y: 20 },
];

// ---------------------------------------------------------------- events
const events = [
  enter('east_enter', 'east_road_arrival'),
  // ---- the Bank Road
  sign('east_signpost', 3, 15, 'east_signpost'),
  // the first-fight cut: every passable cell of column 6 (rows 3 and 12..21; the outcrop fills the rest), as Episode 1's
  // column 7
  trigger('first_fight_trig', 6, 3, 1, 19, 'east_first_fight'),
  object('old_milestone', 16, 14, 'prop_milestone', { script: 'old_milestone' }),
  // W9 Dash Strike: the cracked face of the outcrop opens onto the clearing on top
  object('crack_clearing', 10, 10, 'wall_cracked', { breakable: 'rock', text: 'cliff_crack', h: 2, opens: [[10, 10], [10, 11], [10, 9]] }),
  chest('chest_clearing', 12, 6, 'wood', { item: 'hi_ether', qty: 1 }),
  // ---- the Fading Stretch
  trigger('fading_trig', 19, 16, 1, 1, 'fading_stretch'),
  trigger('fog_return_trig', 19, 18, 1, 1, 'fog_loop'),
  ...fogRuns.map(([x, y, w], i) => fogDoor(`fog_${i}`, x, y, w, 1, ['east_road', 19, 18, 'left'])),
  sign('cairn_sign', CAIRNS[0][0], CAIRNS[0][1], 'cairn'),
  sign('cairn_sign_2', CAIRNS[4][0], CAIRNS[4][1], 'cairn'),
  // ---- the Waystation
  object('waystation_fire', 46, 17, 'brazier_lit', { script: 'waystation_rest', text: 'waystation_bench', safe: true, rest: true }),
  sign('waystation_bench', 44, 18, 'waystation_bench', { solid: false }),
  sign('toll_board', 44, 14, 'toll_board'),
  sign('toll_house', 47, 14, 'toll_house'),
  chest('chest_toll', 44, 13, 'wood'),
  npc('penny_e', 49, 15, 'down'),
  // ---- the Mere Shore
  trigger('mere_view_trig', 52, 13, 3, 2, 'mere_view'),
  sign('mere_shore', 52, 12, 'mere_shore', { solid: false }),
  { id: 'heavy_shore', type: 'block', x: 58, y: 12, sprite: 'push_block', heavy: true },
  chest('chest_reeds', 59, 8, 'iron'),
  // ---- enemies: 7 per ZONES.east_road.plan
  enemy('e_road_mixed', 13, 16, 'mist_wolf', 'road_mixed', 'chase'),
  enemy('e_bank_wolves', 17, 11, 'mist_wolf', 'road_wolves', 'wander', { radius: 2 }),
  enemy('e_clearing_quick', 9, 6, 'quicksilver', 'road_quick', 'wander', { radius: 2 }),
  enemy('e_fog_beetles', 28, 16, 'glassback', 'road_beetles', 'guard'),
  enemy('e_way_wolves', 46, 19, 'mist_wolf', 'road_wolves', 'wander', { radius: 2 }),
  enemy('e_way_beetles', 50, 11, 'glassback', 'road_beetles', 'patrol', { path: steps('left', 3, 'right', 3) }),
  enemy('e_shore_pack', 57, 17, 'mist_wolf', 'road_pack', 'guard'),
];

export default {
  id: 'east_road', name: 'The Fading Road', area: 'field',
  music: 'fading_road', ambience: 'wind_valley', tileset: 'town',
  lighting: { tint: 'none', dark: 0 },
  ambientFx: [{ fx: 'mist', area: { x: 20, y: 9, w: 20, h: 13 } }],
  under: 'grass',
  legend: { '.': 'grass', ',': 'tallgrass', '=': 'dirt', 'p': 'dirt', 's': 'sand', '~': 'water', 'm': 'mere_water',
    '^': 'cliff_top', '|': 'cliff_face' },
  ground,
  overlays,
  decor,
  overhead: [{ t: 'court_far', x: 56, y: 0 }],
  events,
  exits: [
    { x: 0, y: 16, w: 1, h: 2, to: ['valley', 58, 16, 'left'] },
    { x: 63, y: 16, w: 1, h: 2, to: ['nameless_hollow', 1, 32, 'right'] },
  ],
  marks: {
    entry: [1, 16], fog_start: [19, 16], fog_return: [19, 18], fog_end: [40, 16], cairn_first: CAIRNS[0],
    waystation_fire: [46, 17], penny_cart: [49, 15], mere_view: [53, 13], court_far: [59, 3], town_gate: [62, 16],
  },
  start: { x: 1, y: 16, dir: 'right' },
};
