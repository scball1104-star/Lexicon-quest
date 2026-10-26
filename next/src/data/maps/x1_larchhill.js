// Larchhill, the Terraced Orchards: 68 x 38 field (EXPANSION1_PLAN 4.13; X1-maps-wild, X1 wave W4). The warmest map of the
// expansion: honey-coloured drystone terraces, orchards in rows, white hives in the sun, a whitewashed windmill on its mound
// and an old Keepers' aqueduct marching along the middle of the hill. A place people work, not a place people fled.
// Palette against the valley (CRITIQUE_4): yellow-green orchard turf, honey stone, fruit trees in ranks, no meadow noise.
//
// Three real ways from the north gate (31, 1) to the east gate (67, 18..19), all walkable on foot:
//   A  the Switchback Road   (about 105 cells) a cart road west along the top terrace, down through gaps in three drystone walls
//                            (east, west...), a hive stand (a spur and a wood chest), the road's high bend (e_lh_wolves) and the
//                            lower terraces (e_lh_beetles), past Yarrow's apiary and up to the east lane. The long, safe way.
//   B  the Terrace Stairs    (about 52 cells) east along the top lane under the orchard rows, then two flights of two-wide stairs
//                            with a middle landing and one guard group (e_lh_mixed) beside the stairs. The quick way, one fight.
//   C  the Aqueduct Walk     (about 60 cells, foe-free) round the aqueduct's west end to a stair plugged by a heavy cider barrel
//                            (Shove), up onto the deck, east along it (a cracked press wall for Dash: iron chest; a gold chest on
//                            the platform at the end) and down a stair to the east lane.
// Yarrow's apiary, the cider press and the Windmill (its ladder runs windmill_view) are a safe zone on the hill's south-east;
// the hay chute (60..61, 30..31) is a one-way pit area down to the Millrace, shut by a gate until yarrow_met.
//
// Pack file of the `x1` expansion: nothing imports it (the loadMap guard fetches it on first entry); ids come from
// assets/tiles/x1_tiles.json. `ambientFx: ['motes']` is the whole of the weather: pollen and bees, a few particles.
import { grid, box, put, rows, scatter, hash01, npc, sign, object, trigger, enemy, chest, enter, pit, steps } from './_kit.js';

const W = 68, H = 38;
const g = grid(W, H, '.');
const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
const at = (x, y) => (inb(x, y) ? g[y][x] : '^');

function vnoise(x, y, cell, salt) {
  const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
  const fx = x / cell - gx, fy = y / cell - gy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash01(gx, gy, salt), b = hash01(gx + 1, gy, salt), c = hash01(gx, gy + 1, salt), d = hash01(gx + 1, gy + 1, salt);
  return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
}
/** A ribbon of `ch` along a polyline in tile-corner coordinates, `w` wide, ragged; `only` lists the chars it may overwrite. */
function ribbon(pts, w, ch, salt = 5, only = null) {
  const r = w / 2;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const x0 = Math.floor(Math.min(ax, bx) - r - 1), x1 = Math.ceil(Math.max(ax, bx) + r + 1);
    const y0 = Math.floor(Math.min(ay, by) - r - 1), y1 = Math.ceil(Math.max(ay, by) + r + 1);
    for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) {
      const px = x + 0.5, py = y + 0.5;
      const dx = bx - ax, dy = by - ay;
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
      const d = Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
      const jig = (hash01(x, y, salt) - 0.5) * 0.3;
      if (d <= r + jig - 0.02 && (!only || only.includes(g[y][x]))) put(g, x, y, ch);
    }
  }
}
function blob(cx, cy, rx, ry, ch, seed = 1, only = null) {
  for (let y = Math.floor(cy - ry) - 2; y <= Math.ceil(cy + ry) + 2; y++) for (let x = Math.floor(cx - rx) - 2; x <= Math.ceil(cx + rx) + 2; x++) {
    if (!inb(x, y)) continue;
    const a = Math.atan2(y - cy, x - cx);
    const wob = 1 + 0.2 * Math.sin(a * 3 + seed) + 0.1 * Math.sin(a * 5 + seed * 2.3);
    if (Math.hypot((x - cx) / rx, (y - cy) / ry) <= wob && (!only || only.includes(g[y][x]))) put(g, x, y, ch);
  }
}
/** A retaining terrace wall: a cap row at y, two face rows under it (x0..x1). */
function terrace(x0, x1, y) { box(g, x0, y, x1, y, '^'); box(g, x0, y + 1, x1, y + 2, '|'); }

// ---------------------------------------------------------------- terrain
// grass patches on the lower terraces (the orchard turf is the base)
for (let y = 10; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
  const n = 0.6 * vnoise(x, y, 6, 21) + 0.4 * vnoise(x, y, 3, 22);
  if (n > 0.62) put(g, x, y, ',');
}
// the north retaining wall (the upper field is above the map), the gate gap, the west and east edge, the south edge
box(g, 0, 0, W - 1, 2, '^'); box(g, 0, 3, W - 1, 4, '|');
box(g, 30, 0, 33, 4, '=');
box(g, 0, 5, 1, H - 1, '^'); box(g, W - 2, 5, W - 1, H - 1, '^'); box(g, 0, H - 2, W - 1, H - 1, '^');
// the plaza by the gate and the lanes
box(g, 27, 5, 36, 8, 'p');
// A, the Switchback Road (corner coordinates, two wide): west on the top terrace, down three gaps, round the hill
const A = [[31, 5], [31, 10], [18.5, 10], [18, 14], [18.2, 15], [27, 15], [27, 19], [45.5, 19.6], [45.5, 24], [46, 31], [58.8, 31], [58.8, 20], [60.5, 19.2], [66, 19]];
const B = [[38, 8], [62.8, 8], [62.8, 12], [62.8, 17.4], [64, 19]];
const C_APPROACH = [[28, 10], [28, 15]];
// terrace walls (a gap each wall leaves open is the road's gate)
terrace(2, 16, 11); terrace(19, 25, 11);                  // under the top terrace: gap 1 at x 17..18
terrace(2, 25, 16);                                       // under leg 2: gap 2 at x 26..27
box(g, 28, 16, 30, 16, '^'); box(g, 28, 17, 37, 18, '|'); // the aqueduct's west abutment and the wall that closes the landing
terrace(2, 20, 21);                                       // a third wall on the lower terraces (the hive stand sits below it)
// the aqueduct complex: wall rows 12, 13 above the deck (x 30..50), the deck rows 14, 15 (x 31..54), arches row 16 (x 38..54)
box(g, 30, 12, 30, 16, '|'); box(g, 55, 12, 55, 16, '|');
box(g, 51, 11, 55, 11, '|');
box(g, 31, 12, 50, 13, 'h');                             // the wall (overlaid with the honey wall tiles)
box(g, 31, 11, 50, 11, 'h');                             // a low drystone cap along its north side (nothing can be reached across it)
box(g, 51, 12, 54, 13, 'p');                             // the platform at the east end
box(g, 31, 14, 54, 15, 'p');                             // the deck
box(g, 31, 16, 37, 16, 'p');                             // the landing in front of the barrel stair
box(g, 38, 16, 51, 16, 'h');                             // the arches (overlaid)
// the stair up to the landing (1 wide) and the stair down from the platform
put(g, 34, 17, 'S'); put(g, 34, 18, 't');
for (let x = 52; x <= 54; x++) put(g, x, 16, 'LMR'[x - 52]);                 // the east end is broken off: a one-way drop to the lane (the stair is the barrel's)
// the windmill's mound (the base stands on its south face), the retaining wall under the top lane's orchard, drystone field walls
box(g, 49, 20, 57, 27, '^'); box(g, 49, 28, 57, 29, '|');
// the two flights of the Terrace Stairs: walls x 58..67 with a two-wide stair at x 62..63; the landing between; a drystone line west of it
terrace(58, 67, 9); terrace(58, 67, 14);
for (const [y0, a, b, c] of [[9, 'A', 'C', 'E'], [14, 'A', 'C', 'E']]) {
  put(g, 62, y0, a); put(g, 63, y0, 'B'); put(g, 62, y0 + 1, c === 'E' ? 'C' : c); put(g, 63, y0 + 1, 'D'); put(g, 62, y0 + 2, 'E'); put(g, 63, y0 + 2, 'F');
}
for (let y = 9; y <= 16; y++) put(g, 57, y, 'w');
// the lanes: B, A, the approach C walks, the east lane and the gate yard, the spur to the hive stand
ribbon(B, 2, '=', 31, ['.', ',', 'p']);
ribbon(A, 2, '=', 32, ['.', ',', 'p']);
ribbon(C_APPROACH, 2, '=', 33, ['.', ',', 'p']);
ribbon([[54.8, 19.2], [60, 19.2], [66, 19]], 2, '=', 34, ['.', ',']);
ribbon([[26.5, 19.5], [12, 19.5], [11.5, 22], [11.5, 28.6]], 2, '=', 35, ['.', ',', 'p']);       // the spur west to the hive stand (a dead end)
blob(31, 19.4, 3.4, 1.4, '=', 36, ['.', ',']);                                                   // the stair foot
box(g, 33, 19, 35, 19, '=');
blob(11.5, 28.5, 2.4, 1.4, '=', 37, ['.', ',']);                                                  // the hive stand's yard
blob(63, 19, 3.4, 2.3, '=', 38, ['.', ',']);                                                      // the east gate yard
// the gaps in the walls and the lanes through them (rows the walls would have drawn over)
for (const [x0, x1, y0, y1] of [[17, 18, 11, 13], [26, 27, 16, 18], [10, 11, 21, 23]]) box(g, x0, y0, x1, y1, '=');
box(g, 33, 19, 35, 19, '=');
// the yard of the apiary: dirt round the cottage and the chute, the hay chute pit
blob(61, 34, 5, 2.2, '=', 39, ['.', ',']);
box(g, 60, 30, 61, 31, 'x');
// one-way ledge hops on the road: a short run of three, down (south), beside the hairpin; and one on the top terrace wall
for (const [x, y] of [[21, 11], [22, 11], [23, 11]]) put(g, x, y, 'LMR'[x - 21]);
for (const x of [21, 22, 23]) { put(g, x, 12, ','); put(g, x, 13, ','); }
for (const [x, y] of [[41, 22], [42, 22], [43, 22]]) put(g, x, y, 'LMR'[x - 41]);
const GRASS_CLEAR = [[41, 20, 43, 21], [41, 23, 43, 24], [21, 14, 23, 15], [21, 9, 23, 10]];
for (const [x0, y0, x1, y1] of GRASS_CLEAR) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (g[y][x] === '.') put(g, x, y, ',');
// the gate yard's exit and arrival
box(g, 64, 18, 66, 19, '=');
box(g, 66, 18, 67, 19, '=');
const ground = rows(g);

// ---------------------------------------------------------------- overlays: the aqueduct and its wall
const seg = (x, x0, x1) => (x === x0 ? 'l' : x === x1 ? 'r' : 'm');
const overlays = [];
for (let x = 31; x <= 50; x++) { overlays.push({ t: `x1_wall_honey_top_${seg(x, 31, 50)}`, x, y: 12 }); overlays.push({ t: `x1_wall_honey_bot_${seg(x, 31, 50)}`, x, y: 13 }); }
for (let x = 31; x <= 54; x++) { overlays.push({ t: `x1_aqueduct_n_${seg(x, 31, 54)}`, x, y: 14 }); overlays.push({ t: `x1_aqueduct_s_${seg(x, 31, 54)}`, x, y: 15 }); }
for (let x = 38; x <= 51; x++) overlays.push({ t: `x1_aqueduct_arch_${seg(x, 38, 51)}`, x, y: 16 });
overlays.push({ t: 'wall_broken', x: 45, y: 12 });                                         // the hollow behind the cracked press wall
const reserved = new Set();
const keep = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) reserved.add(`${x},${y}`); };
keep(28, 5, 38, 9); keep(30, 0, 33, 4); keep(30, 12, 56, 20); keep(48, 20, 58, 30); keep(57, 8, 67, 21); keep(55, 29, 67, 37); keep(9, 18, 14, 30);
keep(52, 16, 54, 19); keep(34, 22, 38, 26); keep(40, 22, 44, 26); keep(33, 17, 35, 19); keep(25, 9, 29, 20); keep(19, 10, 25, 14); keep(39, 19, 45, 25);
const nearDirt = (x, y, r = 1) => {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (inb(x + dx, y + dy) && '=p'.includes(g[y + dy][x + dx])) return true;
  return false;
};
overlays.push(
  ...scatter(ground, ['.'], ['flowers_yellow', 'flowers_white', 'tuft_0', 'tuft_1', 'pebbles_0'], 0.06, 71),
  ...scatter(ground, [','], ['flowers_yellow', 'flowers_pink', 'flowers_white', 'tuft_1'], 0.12, 72),
  ...scatter(ground, ['='], ['pebbles_0', 'pebbles_1', 'pebbles_2'], 0.06, 73),
);
const overlaysFiltered = overlays.filter((o) => !/^(flowers|tuft|pebbles)/.test(o.t) || !reserved.has(`${o.x},${o.y}`) || g[o.y][o.x] === '=');

// ---------------------------------------------------------------- events
const events = [
  enter('larchhill_enter', 'larchhill_arrival'),
  sign('hill_sign', 29, 6, 'hill_sign', { solid: false }),
  // Route C: the cider barrel plugs the aqueduct stair (Shove), the cracked press wall (Dash), the chests
  { id: 'x1_cider_barrel', type: 'block', x: 34, y: 16, sprite: 'x1_cider_barrel', heavy: true },
  object('x1_crack_press', 45, 12, 'wall_cracked', { breakable: 'rock', text: 'cliff_crack', h: 2 }),
  chest('chest_lh_press', 45, 13, 'iron', { behind: 'x1_crack_press' }),
  chest('chest_lh_aqueduct', 53, 12, 'gold', { item: 'orchard_axe' }),
  // Route A: the hive stand at the end of the spur
  chest('chest_lh_hive', 12, 29, 'wood', { item: 'honey_roll', qty: 3 }),
  // the apiary, the windmill and the hay chute
  npc('yarrow', 64, 35, 'up'),
  object('x1_mill_ladder', 53, 30, 'x1_mill_ladder', { script: 'windmill_view' }),
  sign('x1_windmill', 56, 30, 'x1_windmill', { solid: false }),
  // two hay ricks pile across the chute's mouth until Yarrow has been met (her chalk on the rick: a boat and a firm NO)
  object('x1_hay_gate', 60, 30, 'x1_haystack_a', { text: 'x1_hay_chute', w: 2, ifNot: 'yarrow_met' }),
  object('x1_hay_gate_b', 60, 31, 'x1_haystack_b', { text: 'x1_hay_chute', w: 2, ifNot: 'yarrow_met' }),
  pit('x1_hay_chute', 60, 30, 2, 2, ['x1_millrace', 12, 20, 'down']),
  // visible groups: 3 per ZONES.x1_larchhill.plan (respawn: 'reentry' below)
  enemy('e_lh_beetles', 36, 24, 'moss_scarab', 'lh_beetles', 'wander', { radius: 1 }),
  enemy('e_lh_wolves', 42, 25, 'briar_wolf', 'lh_wolves', 'patrol', { path: steps('up', 2, 'down', 2) }),
  enemy('e_lh_mixed', 59, 12, 'ink_blot', 'lh_mixed', 'guard'),
];

// ---------------------------------------------------------------- decor
const decor = [];
const taken = new Set();
const d1 = (t, x, y, extra = {}) => { decor.push({ t, x, y, ...extra }); taken.add(`${x},${y}`); };
// the windmill on its mound (the base stands on the south face; the ladder against its foot), the apiary, the cider press
d1('x1_windmill', 50, 29);
d1('x1_cottage_b', 62, 34);
d1('x1_cider_press', 66 - 3, 28 + 0);
for (const [x, y] of [[56, 33], [58, 32], [56, 35], [59, 35], [53, 33], [51, 34]]) d1('x1_hive_row', x, y);
for (const [x, y] of [[55, 32], [57, 36], [60, 33], [52, 36], [50, 32]]) d1('x1_hive', x, y);
d1('x1_haybale', 59, 29); d1('x1_haybale', 62, 30); d1('x1_haystack_a', 64, 29);
d1('barrel', 66, 33); d1('crate', 66, 34);
// the north gate: bench, lamp, signboard
d1('bench', 33, 7); d1('lamp_post', 28, 5, { state: 0 }); d1('lamp_post', 36, 5, { state: 0 }); d1('signboard', 29, 6);
// the stair foots and the lanes: lamp posts along the Terrace Stairs and the east lane
for (const [x, y] of [[61, 8], [61, 12], [64, 12], [61, 18], [64, 17]]) d1('lamp_post', x, y, { state: 0 });
for (const [x, y] of [[40, 6], [48, 6], [56, 6]]) d1('lamp_post', x, y, { state: 0 });
d1('bench', 38, 20); d1('lamp_post', 32, 20, { state: 0 });
// the hive terrace between the lane and the aqueduct wall: white hives in a row on the sunny strip
for (const x of [39, 43, 47, 51]) d1('x1_hive_row', x, 10);
for (const x of [41, 45, 49, 53]) d1('x1_bush_berry', x, 10);
// the hive stand
d1('x1_hive_row', 13, 29); d1('x1_hive', 10, 29); d1('x1_hive', 14, 27); d1('x1_haybale', 9, 27);
// orchards: ranks of fruit trees on the terraces, clear of every lane, structure and event cell
for (const e of events) for (let j = 0; j < (e.h || 1); j++) for (let i = 0; i < (e.w || 1); i++) taken.add(`${e.x + i},${e.y + j}`);
const clear = (x, y, r = 1) => {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const xx = x + dx, yy = y + dy;
    if (!inb(xx, yy)) return false;
    if (!'.,'.includes(g[yy][xx]) || reserved.has(`${xx},${yy}`) || taken.has(`${xx},${yy}`)) return false;
  }
  return true;
};
const ORCHARDS = [[3, 5, 24, 5], [38, 5, 56, 5], [3, 7, 24, 8], [38, 9, 55, 11], [3, 18, 24, 20], [3, 24, 24, 35], [29, 22, 47, 35], [3, 12, 10, 13]];
let n = 0;
for (const [x0, y0, x1, y1] of ORCHARDS) for (let y = y0; y <= y1; y += 3) for (let x = x0; x <= x1; x += 3) {
  const xx = x + (y / 3 % 2 ? 1 : 0), yy = y;
  if (!clear(xx, yy, 1)) continue;
  const h = hash01(xx, yy, 95);
  if (hash01(xx, yy, 96) < 0.05) continue;     // an empty place in the rank
  d1(h < 0.4 ? 'x1_tree_apple' : h < 0.7 ? 'x1_tree_apple_b' : 'x1_tree_plum', xx, yy); n++;
}
// berry bushes and boulders along walls and lanes, a hive here and there among the trees
for (let y = 6; y < H - 3; y += 2) for (let x = 3; x < W - 3; x += 2) {
  const r = hash01(x, y, 97);
  const xx = x + (hash01(x, y, 98) < 0.5 ? 0 : 1), yy = y + (hash01(x, y, 99) < 0.5 ? 0 : 1);
  if (!clear(xx, yy, 0) || reserved.has(`${xx},${yy}`)) continue;
  if (r < 0.06) d1(r < 0.03 ? 'x1_bush_berry' : 'x1_bush_plum', xx, yy);
  else if (r < 0.085) d1('x1_hive', xx, yy);
  else if (r < 0.1) d1('x1_haybale', xx, yy);
}
// the border trees along the top wall's foot and the edges (a few; the map is open)
for (const [x, y] of [[3, 6], [8, 6], [14, 6], [20, 6], [40, 5], [45, 5], [52, 5], [3, 35], [9, 35], [20, 35], [40, 35], [47, 35]]) if (clear(x, y, 0)) d1(x % 2 ? 'x1_tree_apple' : 'x1_tree_plum', x, y);

export default {
  id: 'x1_larchhill', name: 'Larchhill', area: 'field',
  music: 'larchhill', ambience: 'larchhill_hum', tileset: 'town',
  lighting: { tint: 'none', dark: 0 },
  respawn: 'reentry',
  ambientFx: ['motes'],
  under: 'x1_orchard_turf',
  pitTo: ['x1_larchhill', 34, 19, 'up'],
  legend: { '.': 'x1_orchard_turf', ',': 'grass', '=': 'dirt', 'p': 'stone_floor', 'h': 'x1_drystone_honey', 'w': 'x1_drystone_honey',
    '^': 'x1_terrace_top', '|': 'x1_terrace_face', 'x': 'pit',
    'S': 'x1_terrace_stairs_top', 't': 'x1_terrace_stairs_mid', 'z': 'x1_terrace_stairs_bot',
    'A': 'x1_terrace_stairs2_top_l', 'B': 'x1_terrace_stairs2_top_r', 'C': 'x1_terrace_stairs2_mid_l', 'D': 'x1_terrace_stairs2_mid_r',
    'E': 'x1_terrace_stairs2_bot_l', 'F': 'x1_terrace_stairs2_bot_r',
    'L': 'ledge_s_a', 'M': 'ledge_s_m', 'R': 'ledge_s_b' },
  ground,
  overlays: overlaysFiltered,
  decor,
  // the Windmill on its hilltop, seen from the north gate (a 64 x 64 decal on the upper field above the wall, in the sun)
  overhead: [{ t: 'x1_far_windmill', x: 35, y: 0 }, { t: 'x1_hay_chute', x: 60, y: 30, if: 'yarrow_met' }],
  events,
  exits: [
    { x: 30, y: 0, w: 4, h: 1, to: ['x1_downs', 11, 32, 'up'] },
    { x: 67, y: 18, w: 1, h: 2, to: ['x1_millrace', 1, 12, 'right'] },
  ],
  marks: {
    north_gate: [31, 1], windmill: [54, 25], ladder: [53, 31], apiary: [58, 33], yarrow: [63, 35], chute: [60, 30], barrel: [34, 16],
    aqueduct_end: [53, 13], press: [45, 14], east_gate: [66, 18], hive_stand: [12, 28],
  },
  start: { x: 31, y: 1, dir: 'down' },
};
