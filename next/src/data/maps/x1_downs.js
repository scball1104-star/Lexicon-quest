// Shepherd's Downs: 56 x 34 field (EXPANSION1_PLAN 4.1). Rolling grass under a high sky, drystone walls, a few stands of
// hawthorn, gentle ledges. Calm, wide, and a long way from anywhere. A pack file of the `x1` expansion: nothing imports
// it directly (the loadMap guard fetches it on first entry). Tile and object ids come from assets/tiles/x1_tiles.json.
//
//   gate lanes   the valley lane (east edge, y 10..11) and the town lane (east edge, y 24..25) join one N-S lane (x 45..46)
//                with the signpost at (44, 18). A third lane runs west under the Ridge to the Stones.
//   Thornfold    x 20..44, y 13..32: the Loom House (door_loom (36, 20)), four cottages (two shuttered), the well, the sheep fold
//                with Brindle at its gate, haystacks, a trough, a bench. A safe zone (no foe within 6 tiles of the lanes).
//   the Stones   a low rise with twelve standing stones round a cairn, a thirteenth blank slab apart, and the barrow door
//                set into the mound under the north cliff.
//   the Old Fold a ruined drystone fold; the knoll on its north side is cracked (Dash) and hides the iron chest and stray_5.
//   the Ridge    a grassy bluff over Thornfold: stairs up, a one-way ledge down, Patch the scarecrow (Appraise) and the moor gap.
//   Drovers' Road a walled cart track south to the Millrace, shut by a chain until the bell has tolled (archive_f1_done).
//   Larchhill Road a lane round the south of the Old Fold to the south-west exit.
//
// Shapes (CRITIQUE_2 item 6): bending lanes (ribbons with a ragged edge), value-noise grass blobs, ragged drystone walls.
import { grid, box, put, rows, scatter, hash01, npc, actor, door, sign, object, trigger, enemy, chest, enter, light } from './_kit.js';

const W = 56, H = 34;
const g = grid(W, H, '.');

/** Smooth value noise in [0,1): bilinear blend of hash01 at a lattice of `cell` tiles. */
function vnoise(x, y, cell, salt) {
  const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
  const fx = x / cell - gx, fy = y / cell - gy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash01(gx, gy, salt), b = hash01(gx + 1, gy, salt), c = hash01(gx, gy + 1, salt), d = hash01(gx + 1, gy + 1, salt);
  return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
}

/** Paint a ribbon of `ch` along a polyline given in tile-corner coordinates (cell (x, y) spans [x, x+1]); `w` tiles wide, ragged. */
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

/** A wobbly ellipse of `ch` (the Stones' rise, the pasture blobs). */
function blob(cx, cy, rx, ry, ch, seed = 1, only = null) {
  for (let y = Math.floor(cy - ry) - 2; y <= Math.ceil(cy + ry) + 2; y++) for (let x = Math.floor(cx - rx) - 2; x <= Math.ceil(cx + rx) + 2; x++) {
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const a = Math.atan2(y - cy, x - cx);
    const wob = 1 + 0.2 * Math.sin(a * 3 + seed) + 0.1 * Math.sin(a * 5 + seed * 2.3);
    if (Math.hypot((x - cx) / rx, (y - cy) / ry) <= wob && (!only || only.includes(g[y][x]))) put(g, x, y, ch);
  }
}

// ---------------------------------------------------------------- terrain
// the north cliff band, with the Ridge's plateau cut out of it (x 26..38)
for (const [x0, x1] of [[0, 25], [39, 55]]) { box(g, x0, 0, x1, 3, '^'); box(g, x0, 4, x1, 5, '|'); }
box(g, 26, 0, 26, 9, '^'); box(g, 38, 0, 38, 9, '^');                 // the rim columns
box(g, 26, 9, 38, 9, '^');                                           // the south ring
box(g, 26, 10, 38, 11, '|');                                         // its face
for (const x of [27, 28, 33, 34, 35, 36, 37]) put(g, x, 0, '^');     // the moor gap is x 29..32 only
box(g, 29, 0, 32, 0, '=');
for (const [x, y] of [[27, 1], [37, 1], [37, 8], [27, 7], [27, 8], [28, 1], [36, 1]]) put(g, x, y, '^');   // the plateau's corners are bitten, not square
put(g, 28, 9, 'S'); put(g, 28, 10, 't'); put(g, 28, 11, 'z');        // stairs up to the Ridge
put(g, 34, 9, 'L'); put(g, 35, 9, 'M'); put(g, 36, 9, 'R');          // the one-way ledge hop (35, 9) back down
box(g, 34, 10, 36, 11, '.');

// the Stones: a low moss rise round the ring, tall grass blobs round it
blob(14, 10.5, 10, 6.8, 'm', 3, ['.']);
blob(8, 14, 3.2, 2.2, ',', 7, ['.']);
blob(24, 5, 2.5, 1.6, ',', 9, ['.']);

// lanes (tile-corner coordinates; even widths sit on a boundary so they cover whole cells)
ribbon([[56, 11], [52, 10.6], [49, 11.4], [46.5, 12.6]], 2, '=', 11);                       // valley lane (east edge rows 10..11)
ribbon([[46, 10], [46, 18], [46, 26.5]], 2, '=', 12);                                       // the N-S lane, x 45..46
ribbon([[56, 25], [52, 24.8], [49, 24.3], [46.5, 24.4]], 2, '=', 13);                       // town lane (east edge rows 24..25)
ribbon([[47, 13], [41, 13.2], [35, 13], [29, 13], [26, 12.3], [22.5, 11.4]], 2, '=', 14);   // under the Ridge, west to the Stones
ribbon([[46, 22], [41, 22], [35, 22], [30, 22], [27, 21.8]], 2, '=', 15);                   // Thornfold's main lane
ribbon([[30, 22], [29.2, 17], [29, 13.5]], 2, '=', 16);                                     // north branch to the stairs foot
ribbon([[27, 22.4], [26.6, 26], [26.2, 29.5], [25.2, 31.4], [21, 31.8], [16, 31.8], [13, 32.4], [11.5, 34]], 2, '=', 17);   // Larchhill Road
ribbon([[40.5, 22], [40.5, 27], [40.5, 34]], 3, '=', 18);                                   // Drovers' Road (x 39..41)
ribbon([[26, 24.5], [23, 24.5]], 2, '=', 19);                                               // the Old Fold's east gap
ribbon([[25, 11.6], [22, 10.4], [20.5, 9.6], [19, 9.6]], 2, '=', 20);                       // into the ring from the east
ribbon([[14.5, 6], [13.6, 7.2], [13.6, 8.4]], 2, '=', 21);                                  // the barrow door down to the ring
ribbon([[28.5, 8.5], [29.5, 6], [30, 3], [31, 0.5]], 2, '=', 22);                           // the Ridge path to the moor gap
ribbon([[31.5, 6.5], [33, 6.5]], 2, '=', 23, ['.']);                                        // Patch's patch
blob(36, 24.5, 6.5, 1.8, '=', 24, ['.']);                                                   // the hamlet's yard, wide dirt under the cottages
blob(32, 30.5, 3.5, 1.4, '=', 25, ['.']);

// low drystone field walls with gaps (ragged on purpose): the west pasture and the farmstead's yard
function wallRun(x0, y0, x1, y1, salt, gap = 0.2) {
  const dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0);
  let x = x0, y = y0;
  for (;;) {
    if (hash01(x, y, salt) > gap && g[y][x] !== '=' && g[y][x] !== '^') put(g, x, y, 'w');
    if (x === x1 && y === y1) break;
    x += dx; y += dy;
  }
}
wallRun(0, 17, 8, 17, 61, 0.12); wallRun(8, 17, 8, 22, 62, 0.12); wallRun(0, 6, 7, 6, 63, 0.2); wallRun(2, 28, 9, 28, 64, 0.15); wallRun(9, 28, 9, 33, 65, 0.15);
wallRun(48, 13, 54, 13, 66, 0.25); wallRun(48, 13, 48, 21, 67, 0.3); wallRun(48, 21, 55, 21, 68, 0.3);
wallRun(50, 27, 55, 27, 69, 0.4); wallRun(30, 4, 30, 4, 70); wallRun(26, 14, 26, 14, 71);
// the sheep fold (drystone, a two-cell gate gap at (41..42, 20)) and the sunk walls of the Drovers' Road
box(g, 40, 14, 43, 14, 'w'); box(g, 40, 20, 43, 20, 'w'); box(g, 40, 14, 40, 20, 'w'); box(g, 43, 14, 43, 20, 'w');
put(g, 41, 20, '.'); put(g, 42, 20, '.');
for (let y = 24; y <= 33; y++) { put(g, 38, y, 'w'); put(g, 42, y, 'w'); }
put(g, 38, 23, 'w'); put(g, 42, 23, 'w');

// the Old Fold: a ruin (gaps east and south), the cracked knoll on its north side, hay inside
const FOLD = { x0: 10, x1: 24, y0: 22, y1: 30 };
for (let x = FOLD.x0; x <= FOLD.x1; x++) { put(g, x, FOLD.y0, 'w'); put(g, x, FOLD.y1, 'w'); }
for (let y = FOLD.y0; y <= FOLD.y1; y++) { put(g, FOLD.x0, y, 'w'); put(g, FOLD.x1, y, 'w'); }
for (const [x, y] of [[10, 26], [10, 27], [13, 30], [14, 30], [24, 24], [24, 25], [21, 22], [22, 22], [19, 30], [11, 22]]) put(g, x, y, '.');
box(g, 15, 17, 19, 17, '^'); box(g, 15, 20, 19, 20, '^');            // the knoll: ring of cliff top,
box(g, 15, 17, 15, 20, '^'); box(g, 19, 17, 19, 20, '^');
box(g, 16, 18, 18, 19, '.');                                          // the little hollow inside,
box(g, 15, 21, 19, 22, '|');                                          // and its two-row face, cracked at (17, 21)
put(g, 17, 20, '^');

// tall-grass blobs (value noise), kept one cell off every lane and building
for (let y = 4; y < H; y++) for (let x = 0; x < W; x++) {
  if (g[y][x] !== '.') continue;
  const n = 0.55 * vnoise(x, y, 6, 31) + 0.3 * vnoise(x, y, 3, 33) + 0.15 * hash01(x, y, 32);
  if (n > 0.62) put(g, x, y, ',');
}
const nearDirt = (x, y, r = 1) => {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const xx = x + dx, yy = y + dy;
    if (xx >= 0 && yy >= 0 && xx < W && yy < H && (g[yy][xx] === '=' || g[yy][xx] === 'S')) return true;
  }
  return false;
};
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (g[y][x] !== ',') continue;
  const inHamlet = x >= 22 && x <= 47 && y >= 13 && y <= 33;
  if (nearDirt(x, y) || inHamlet) put(g, x, y, '.');
}

const ground = rows(g);

// ---------------------------------------------------------------- the cells the decor must keep clear
const reserved = new Set(), built = new Set();
const keep = (x0, y0, x1, y1, isBuilding = false) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { reserved.add(`${x},${y}`); if (isBuilding) built.add(`${x},${y}`); }
};
keep(33, 14, 43, 20, true);   // Loom House and the fold
keep(24, 14, 27, 18, true);   // cottage 1
keep(29, 22, 33, 27, true);   // cottage 2
keep(34, 23, 37, 27, true);   // cottage 3
keep(49, 14, 53, 19, true);   // cottage 4
keep(12, 2, 16, 6, true);     // the barrow mound
keep(42, 0, 48, 7);     // the far tower on the skyline
keep(7, 6, 21, 14);     // the ring
keep(30, 19, 32, 21);   // the well
keep(26, 5, 38, 9);     // the Ridge top
keep(28, 8, 31, 11);    // the stairs
keep(10, 21, 24, 30);   // the Old Fold (hand dressed)
keep(14, 16, 20, 21);   // the knoll
keep(39, 23, 41, 33);   // Drovers' Road
keep(0, 28, 9, 33);     // clear south-west corner round the exit
keep(10, 31, 14, 33);

// ---------------------------------------------------------------- overlays
const overlays = [
  { t: 'wall_broken', x: 17, y: 21 },                                  // the hollow behind the cracked face (drawn over by the crack)
  // flowers, tufts and pebbles (decals; none of them has collision)
  ...scatter(ground, ['.'], ['flowers_white', 'flowers_yellow', 'tuft_0', 'tuft_1', 'pebbles_0', 'flowers_violet', 'leaves'], 0.07, 41),
  ...scatter(ground, [','], ['flowers_yellow', 'flowers_white', 'flowers_pink'], 0.11, 42),
  ...scatter(ground, ['m'], ['tuft_0', 'tuft_1', 'pebbles_1', 'leaves', 'flowers_white'], 0.12, 43),
  ...scatter(ground, ['='], ['pebbles_0', 'pebbles_1', 'pebbles_2'], 0.09, 44),
].filter((o) => !built.has(`${o.x},${o.y}`) || o.t === 'wall_broken');

// ---------------------------------------------------------------- events
const RING = [[14, 7], [17, 7], [19, 8], [20, 10], [19, 12], [17, 13], [14, 13], [11, 13], [9, 12], [8, 10], [9, 8], [11, 7]];
const events = [
  enter('downs_enter', 'downs_arrival'),
  // doors
  door('door_loom', 36, 20, ['x1_loomhouse', 7, 9, 'up']),
  door('door_barrow', 14, 5, ['x1_barrow', 3, 10, 'down']),
  door('drovers_door', 39, 33, ['x1_millrace', 4, 1, 'down'], { w: 3, if: 'archive_f1_done' }),
  // story triggers (each scene guards itself and runs once)
  trigger('thornfold_trig_e', 44, 21, 1, 2, 'thornfold_arrival'),
  trigger('thornfold_trig_n', 28, 15, 2, 1, 'thornfold_arrival'),
  trigger('thornfold_trig_s', 26, 25, 2, 1, 'thornfold_arrival'),
  trigger('thornfold_trig_d', 39, 25, 3, 1, 'thornfold_arrival'),
  trigger('stones_trig', 9, 8, 11, 5, 'stones_arrival'),
  // signs
  sign('downs_signpost', 44, 18, 'downs_signpost', { solid: false }),
  sign('thornfold_well', 31, 20, 'thornfold_well', { solid: false }),
  sign('thornfold_sign', 43, 23, 'thornfold_sign', { solid: false }),
  // the drovers' chain: shut until the bell has tolled, then the chain lies in the road
  object('x1_drovers_chain', 39, 29, 'x1_drovers_chain', { text: 'x1_drovers_chain', w: 3, ifNot: 'archive_f1_done' }),
  object('x1_drovers_chain_open', 39, 29, 'x1_chain_gate_open', { text: 'x1_drovers_chain', if: 'archive_f1_done' }),
  // the Ridge: Patch the scarecrow (Appraise) and the hatch chest at his feet
  object('x1_old_scarecrow', 31, 6, 'x1_old_scarecrow', { text: 'x1_old_scarecrow', appraise: true, appraiseText: 'appraise_scarecrow' }),
  chest('chest_ridge', 32, 6, 'iron', { behind: 'appraise:x1_old_scarecrow' }),
  // the Old Fold's cracked knoll (Dash): the iron chest and the fifth stray
  object('x1_crack_fold', 17, 21, 'wall_cracked', { breakable: 'rock', text: 'cliff_crack', h: 2, opens: [[17, 21], [17, 22], [17, 20]] }),
  chest('chest_fold', 18, 19, 'iron', { behind: 'x1_crack_fold' }),
  npc('stray_5', 16, 19, 'down', { behind: 'x1_crack_fold' }),
  // the well chest, three potions
  chest('chest_well', 30, 20, 'wood', { item: 'potion', qty: 3 }),
  // the ring: twelve stones, blank until stones_lettered, then lettered; the cairn at the heart runs the naming
  ...RING.flatMap(([x, y], i) => [
    object(`menhir_${i + 1}`, x, y, i % 3 === 1 ? 'x1_menhir_b' : 'x1_menhir_a', { text: 'x1_menhir', ifNot: 'stones_lettered' }),
    object(`menhir_${i + 1}_l`, x, y, i % 3 === 1 ? 'x1_menhir_lettered_b' : 'x1_menhir_lettered', { text: 'x1_menhir', if: 'stones_lettered' }),
  ]),
  object('stones_center_obj', 14, 10, 'x1_cairn_moor', { script: 'rollcall_stones' }),
  object('blank_stone_obj', 22, 8, 'x1_blank_slab', { text: 'blank_slab', ifNot: 'reeve_named' }),
  object('blank_stone_named', 22, 8, 'x1_menhir_lettered', { text: 'blank_slab', if: 'reeve_named' }),
  // people: Brindle at the fold gate, the strays, the fold's sheep
  npc('brindle', 43, 21, 'left'),
  npc('stray_1', 20, 26, 'down'),
  npc('stray_2', 12, 11, 'down'),
  npc('stray_3', 33, 5, 'down'),
  npc('fold_sheep_a', 41, 16, 'down'),
  npc('fold_sheep_b', 41, 18, 'right'),
  // after strays_done five more sheep join the fold (still life: scripted actors, no wandering)
  ...[[42, 16, 'down'], [42, 17, 'left'], [41, 17, 'right'], [42, 18, 'down'], [41, 19, 'left']].map(([x, y, d], i) =>
    actor(`fold_sheep_${'cdefg'[i]}`, x, y, 'animal_sheep', d, { if: 'strays_done' })),
  // far-off light on the tower's skyline (cheap; the decal itself is in `overhead`)
  light('x1_far_light', 45, 5, 3, '#ffe9b0'),
  // visible enemies: 3 per ZONES.x1_downs.plan (field rules: chase 3, guard when adjacent; re-entry respawn)
  enemy('e_dn_wolves', 19, 14, 'briar_wolf', 'dn_wolves', 'guard'),
  enemy('e_dn_scarab', 13, 25, 'moss_scarab', 'dn_scarab', 'wander', { radius: 1 }),
  enemy('e_dn_pack', 47, 31, 'briar_wolf', 'dn_pack', 'chase'),
];

const occupied = new Set();
for (const e of events) for (let j = 0; j < (e.h || 1); j++) for (let i = 0; i < (e.w || 1); i++) occupied.add(`${e.x + i},${e.y + j}`);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] === 'w') occupied.add(`${x},${y}`);

// ---------------------------------------------------------------- decor
const decor = [];
const put1 = (t, x, y, extra = {}) => { decor.push({ t, x, y, ...extra }); };
// the buildings
put1('x1_loomhouse', 33, 20);                                          // door cell (36, 20)
put1('x1_cottage_a', 24, 18); put1('x1_cottage_b', 29, 27); put1('x1_cottage_a', 34, 27); put1('x1_cottage_b', 49, 19);
put1('crate', 25, 18); put1('crate', 35, 27);                           // the two shuttered doors are boarded up
put1('barrel', 30, 27); put1('barrel', 50, 19);                         // the other two have a barrel on the step
put1('x1_barrow_door_open', 12, 5);                                    // the mound; the door cell is (14, 5)
// Thornfold: the well, hay, a trough and a bench
put1('well', 31, 20);
put1('x1_haystack_a', 22, 19); put1('x1_haystack_b', 35, 29); put1('x1_haybale', 38, 20); put1('x1_haybale', 28, 20);
put1('x1_trough', 41, 15); put1('x1_trough_dry', 25, 20);
put1('bench', 33, 23); put1('barrel', 27, 22); put1('crate', 28, 22);
// the ring of twelve (events draw them), the Old Fold's hay and ruin
put1('x1_haystack_b', 21, 26); put1('x1_haystack_a', 16, 26); put1('x1_haybale', 20, 27); put1('x1_haybale', 19, 26);
put1('x1_trough_dry', 12, 28); put1('x1_haybale', 22, 24); put1('x1_haystack_a', 15, 28);
put1('bush', 12, 24); put1('bush', 23, 23); put1('bush', 11, 29); put1('tree_willow', 6, 25); put1('tree_willow', 49, 29);
// signposts and the hamlet board
put1('signpost_arrow', 44, 18); put1('signboard', 43, 23);
// hawthorn stands and a few pines along the cliff top (clear of lanes, the Ridge path, the mound and every building)
const trees = [];
const free = (x, y) => x > 0 && y > 0 && x < W - 1 && y < H - 1 && !reserved.has(`${x},${y}`) && !occupied.has(`${x},${y}`) && '.,m'.includes(g[y][x]) && !nearDirt(x, y, 1);
for (let x = 1; x < W - 1; x++) {
  if (x >= 24 && x <= 40) continue;
  const r = hash01(x, 1, 51);
  const y = Math.floor(hash01(x, 2, 52) * 2);
  if (r < 0.34 && !reserved.has(`${x},${y}`)) trees.push({ t: 'tree_pine', x, y });
}
for (let y = 4; y < H - 1; y += 2) for (let x = 1; x < W - 1; x += 2) {
  const r = hash01(x, y, 53);
  const xx = x + (hash01(x, y, 54) < 0.5 ? 0 : 1), yy = y + (hash01(x, y, 55) < 0.5 ? 0 : 1);
  if (r < 0.17 && free(xx, yy) && free(xx + 1, yy) && free(xx - 1, yy)) trees.push({ t: r < 0.05 ? 'x1_boulder_a' : 'bush', x: xx, y: yy });
}
// stands of hawthorn on purpose: the pasture hedge, the Stones' flanks, the ford meadow, the Ridge
for (const [x, y] of [[2, 12], [3, 13], [5, 9], [6, 16], [4, 17], [22, 16], [23, 8], [24, 12], [50, 28], [52, 30], [49, 32], [53, 26], [31, 5], [27, 7], [37, 7], [36, 3], [27, 3],
  [8, 20], [6, 22], [3, 24], [7, 28], [4, 30], [34, 31], [37, 31], [28, 31]]) if (free(x, y) || (y < 10 && x > 26 && x < 38)) trees.push({ t: 'bush', x, y });
decor.push(...trees);

export default {
  id: 'x1_downs', name: "Shepherd's Downs", area: 'field',
  music: 'the_downs', ambience: 'wind_valley', tileset: 'town',
  lighting: { tint: 'none', dark: 0 },
  respawn: 'reentry',
  under: 'grass',
  legend: { '.': 'grass', ',': 'tallgrass', '=': 'dirt', 'm': 'x1_moor_turf', 'w': 'x1_drystone',
    '^': 'cliff_top', '|': 'cliff_face', 'S': 'cliff_stairs_top', 't': 'cliff_stairs_mid', 'z': 'cliff_stairs_bot',
    'L': 'ledge_s_a', 'M': 'ledge_s_m', 'R': 'ledge_s_b' },
  ground,
  overlays,
  decor,
  // the Watchtower on the north skyline and the Windmill on the south-east horizon (overhead decals at horizon scale)
  overhead: [{ t: 'x1_far_tower', x: 44, y: -2 }, { t: 'x1_far_windmill', x: 50, y: 30 }],
  events,
  exits: [
    { x: 55, y: 10, w: 1, h: 2, to: ['valley', 1, 28, 'right'] },
    { x: 55, y: 24, w: 1, h: 2, to: ['willowmere', 1, 16, 'right'] },
    { x: 29, y: 0, w: 4, h: 1, to: ['x1_highmoor', 35, 34, 'up'] },
    { x: 10, y: 33, w: 4, h: 1, to: ['x1_larchhill', 31, 1, 'down'] },
  ],
  marks: {
    valley_gate: [54, 11], town_gate: [54, 25], lane: [45, 17], signpost: [44, 19], thornfold: [36, 22], loom_door: [36, 20],
    fold_gate: [42, 21], brindle: [43, 22], well: [31, 21],
    stones_center: [14, 10], ring_n: [14, 8], ring_e: [19, 10], ring_s: [14, 12], ring_w: [9, 10], blank_stone: [22, 8],
    barrow_door: [14, 5], fold_ruin: [18, 26], ridge: [31, 7], moor_gate: [30, 1], larch_gate: [11, 32],
    drovers: [40, 31], drovers_exit: [40, 32],
  },
  start: { x: 54, y: 25, dir: 'left' },
};
