// The High Moor: 72 x 36 field (EXPANSION1_PLAN 4.12; X1-maps-wild, X1 wave W4). A wide heath under a bigger sky than the
// valley's: purple heather, gorse, grey crag, a black tarn with ragged peat banks and, against the north rock, the broken
// Watchtower the player has seen from the Downs. Cooler and sparser than the valley (CRITIQUE_4): moor turf, heath and bracken
// instead of meadow, long shadows under the tower.
//
// Three real ways from the south entry (35, 34) to the east stile (69, 13), all of them walkable on foot:
//   A  the Chime Road     (about 100 cells) west under the tarn, north along its west bank, east along the north shore, down to
//                         the tower spur at (43, 15) and east along the Stile Road. Nine chime posts, a bench, one guard group
//                         (e_mo_wolves) three cells off the road, a cairn cache. The long, safe way.
//   B  the Ridgeline      (about 60 cells) north-east over the heath ridge: two one-way ledge hops east, the view point and its
//                         iron chest on a dead-end knoll (e_mo_scarabs patrol it), e_mo_wraiths wander the south-east bank
//                         beside the road. The short, risky way. Joins the stile yard from the south.
//   C  the Hidden Fold    (about 67 cells, no foes within 6) from the south shore along a faint ink route (Lantern: 8 cells to the
//                         islet's gold chest, 8 more to the east shore), then a one-wide gorse tunnel (Dash through the roots,
//                         an iron chest in a recess) that comes out beside the stile.
// The Watchtower, Odo's turf hut and the third star mark stand on a yard off the Stile Road (a spur from A and B at (43..44, 15)).
// The Stile (x 64..71): Keepers' pillars with thin roots across the gap (Dash), the Terrace beyond. The Orrery's brass dome
// shows over the north-east rim (x1_far_dome). No fog object, no lighting: the cheapest way to say "wide" is empty ground.
//
// Pack file of the `x1` expansion: nothing imports it (the loadMap guard fetches it on first entry); ids come from
// assets/tiles/x1_tiles.json. Shapes: ribbons with ragged edges, value-noise heath, ragged crag masses.
import { grid, box, put, rows, scatter, hash01, npc, door, sign, object, trigger, enemy, chest, enter, pit, tile, steps } from './_kit.js';

const W = 72, H = 36;
const g = grid(W, H, '.');
const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
const at = (x, y) => (inb(x, y) ? g[y][x] : '^');

/** Smooth value noise in [0,1). */
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

/** A wobbly ellipse of `ch`. */
function blob(cx, cy, rx, ry, ch, seed = 1, only = null) {
  for (let y = Math.floor(cy - ry) - 2; y <= Math.ceil(cy + ry) + 2; y++) for (let x = Math.floor(cx - rx) - 2; x <= Math.ceil(cx + rx) + 2; x++) {
    if (!inb(x, y)) continue;
    const a = Math.atan2(y - cy, x - cx);
    const wob = 1 + 0.2 * Math.sin(a * 3 + seed) + 0.1 * Math.sin(a * 5 + seed * 2.3);
    if (Math.hypot((x - cx) / rx, (y - cy) / ry) <= wob && (!only || only.includes(g[y][x]))) put(g, x, y, ch);
  }
}

// ---------------------------------------------------------------- the paths (tile-corner coordinates, two wide)
// A: Chime Road out of the Ridge Path (west, north, east), then the Stile Road past the tower spur to the yard.
const A = [[37, 29], [30, 29], [22, 29], [16, 29], [15.2, 25], [15, 19], [15.5, 13], [16, 10.5], [22, 10], [31, 10], [37, 11.5], [41, 14], [43.5, 16],
  [49, 15.5], [56, 15.3], [62, 15.2], [66, 14.8], [68.4, 14.4]];
// B: Ridgeline, north-east out of the Ridge Path, with two ledge hops; into the yard from the south.
const B = [[40, 30], [43, 27.4], [47, 26.8], [52, 26.6], [58, 26], [62, 23], [65, 21], [67, 19], [67.2, 16.5], [67, 14.8]];

// ---------------------------------------------------------------- terrain
// heath, bracken and peat as value-noise blobs: cool and sparse, mostly bare turf
for (let y = 6; y < H - 2; y++) for (let x = 0; x < W; x++) {
  const n = 0.55 * vnoise(x, y, 7, 11) + 0.3 * vnoise(x, y, 3, 13) + 0.15 * hash01(x, y, 12);
  const m = 0.6 * vnoise(x + 40, y + 9, 8, 21) + 0.4 * vnoise(x, y, 4, 22);
  if (n > 0.5) put(g, x, y, ',');
  else if (m > 0.6) put(g, x, y, 'b');
}
// crag: a band along the north, the tower's mass, ragged masses on the west and east edges and along the south
box(g, 0, 0, W - 1, 3, '^');
for (let x = 0; x < W; x++) { if (hash01(x, 0, 31) < 0.45) put(g, x, 4, '^'); if (hash01(x, 1, 31) < 0.18) put(g, x, 5, '^'); }
box(g, 40, 0, 55, 7, '^'); box(g, 43, 8, 48, 10, '^');                         // the mass the tower stands against
for (let y = 0; y < H; y++) {
  const wx = Math.round(3 + 4.5 * vnoise(y, 3, 6, 33) + 2.2 * hash01(y, 4, 34));        // west edge
  for (let x = 0; x < wx; x++) put(g, x, y, '^');
  const ex = Math.round(70 - 1.2 * hash01(y, 6, 36));                                    // east edge: a band two to three wide
  for (let x = ex; x < W; x++) put(g, x, y, '^');
}
for (let y = H - 2; y < H; y++) box(g, 0, y, W - 1, y, '^');                              // the south edge
for (const [cx, cy, rx, ry, s] of [[10, 22, 4.2, 2.6, 41], [60, 31, 3.4, 2.2, 42], [24, 33, 3.6, 1.8, 43], [8, 8, 3.4, 2.2, 44], [64, 24, 2.6, 1.8, 45],
  [18, 21, 2.2, 1.6, 46], [47, 31, 2.8, 1.6, 47], [33, 6, 3, 1.4, 48]]) blob(cx, cy, rx, ry, '^', s, ['.', ',', 'b']);
// the two spaces the map is entered by: the Ridge Path through the south crag, the stile gap in the east
box(g, 33, 34, 38, 35, '.');
box(g, 70, 13, 71, 14, '.');

// the black tarn: a ragged blob, an islet, a peat bank, the south shore the Hidden Fold starts from
blob(29, 20.5, 10, 6.1, 'T', 3, ['.', ',', 'b', '^']);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (g[y][x] === 'T') continue;
  let wet = 0;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (at(x + dx, y + dy) === 'T') wet = Math.max(wet, 3 - Math.max(Math.abs(dx), Math.abs(dy)));
  if (wet && g[y][x] !== '^' && hash01(x, y, 51) < (wet === 2 ? 0.95 : 0.55)) put(g, x, y, 'p');
}
box(g, 24, 14, 32, 16, 'T'); box(g, 26, 17, 30, 18, 'T'); box(g, 27, 17, 29, 18, 'p');         // the islet, water all round it
box(g, 26, 27, 30, 28, 'p');                                                                        // the south shore
for (let y = 19; y <= 26; y++) put(g, 28, y, 'T');                                                  // the water the first ink run crosses
// a few smaller pools and peat patches on the open moor, away from every route
for (const [cx, cy, rx, ry, s] of [[6, 30, 2.2, 1.4, 61], [50, 7.5, 0, 0, 62], [66, 28, 1.6, 1.1, 63], [12, 14, 2.4, 1.6, 64], [58, 6.5, 0, 0, 65]]) if (rx) blob(cx, cy, rx, ry, 'p', s, ['.', ',', 'b']);

// the paths (dirt): Ridge Path, the three routes, the tower yard, the stile yard
blob(36, 32, 5.6, 3.3, '=', 71, ['.', ',', 'b', 'p', '^']);                                    // M1 the Ridge Path
box(g, 34, 33, 37, 35, '=');
ribbon(A, 2, '=', 72, ['.', ',', 'b', 'p']);
ribbon(B, 2, '=', 73, ['.', ',', 'b', 'p']);
ribbon([[29, 29.4], [28.8, 27.6]], 2, '=', 74, ['.', ',', 'b', 'p']);                          // the way down to the tarn's south shore
ribbon([[50, 26], [50, 21.4]], 2, '=', 75, ['.', ',', 'b', 'p']);                              // the spur up to the view knoll
blob(47, 13.6, 5.5, 2.0, '=', 76, ['.', ',', 'b', 'p']);                                       // the tower yard, off the road
blob(63, 13.5, 4.2, 3.0, '=', 77, ['.', ',', 'b', 'p']);                                       // the stile yard
blob(50, 21.2, 3.6, 1.8, 'b', 78, ['.', ',', 'p']);                                            // the view knoll: bracken, one step above the road
// the ink route's bank: the east shore of the tarn and the way in to the tunnel
for (let x = 38; x <= 41; x++) if (g[18][x] !== 'T') put(g, x, 18, '=');
// the Hidden Fold: the east shore is a pocket inside a ruined drystone sheepfold, so it is reached by water or by the tunnel only
for (let x = 36; x <= 41; x++) for (const y of [16, 20]) if (g[y][x] !== 'T') put(g, x, y, 'w');
for (let y = 17; y <= 19; y++) { if (g[y][36] !== 'T') put(g, 36, y, 'w'); if (y !== 18) put(g, 41, y, 'w'); }
for (let y = 17; y <= 19; y++) for (let x = 37; x <= 40; x++) if (g[y][x] !== 'T' && y !== 18) put(g, x, y, hash01(x, y, 5) < 0.5 ? 'p' : '.');
// the Hidden Fold's gorse tunnel: one wide, y 18, x 38..62, then north at x 62 into the stile yard
box(g, 40, 18, 62, 18, '='); box(g, 50, 19, 50, 19, '=');                                     // the roots stand across (50, 18..19)
box(g, 62, 16, 62, 17, '='); box(g, 53, 17, 53, 17, '=');                                     // up into the yard; the chest recess
for (let x = 41; x <= 63; x++) { for (const y of [17, 19]) if (!'=T'.includes(g[y][x])) put(g, x, y, ','); }   // heather under the hedge
// the stile wall: drystone along x = 69 with the gap rows 13..14
for (let y = 8; y <= 19; y++) if (y !== 13 && y !== 14) put(g, 69, y, 'w');
put(g, 69, 13, '='); put(g, 69, 14, '='); box(g, 70, 13, 71, 14, '=');
// the one-way ledge hops on the Ridgeline: a vertical run of three, entered only by walking east
for (const [x, y0] of [[44, 26], [57, 24]]) { put(g, x, y0, 'e'); put(g, x, y0 + 1, 'f'); put(g, x, y0 + 2, 'g'); }
// crag faces: two rows under every top cell with open ground south of it
for (let y = 0; y < H - 1; y++) for (let x = 0; x < W; x++) {
  if (g[y][x] !== '^') continue;
  for (const d of [1, 2]) {
    if (!inb(x, y + d)) break;
    if ('^|'.includes(g[y + d][x])) break;
    put(g, x, y + d, '|');
  }
}
// the exits must stay open whatever the faces did
box(g, 33, 34, 38, 35, '.'); box(g, 34, 33, 37, 35, '=');
box(g, 70, 13, 71, 14, '=');
// re-cut the one-way ledges, the tunnel and the yards where the faces may have crossed them
for (const [x, y0] of [[44, 26], [57, 24]]) { put(g, x, y0, 'e'); put(g, x, y0 + 1, 'f'); put(g, x, y0 + 2, 'g'); }
// keep the route cells off the tarn banks: the south shore and the ink route's two ends stay peat, the east landing stays dirt
ribbon([[29, 29.4], [28.8, 27.6]], 2, '=', 74, ['.', ',', 'b', 'p']);
const ground = rows(g);

// ---------------------------------------------------------------- the ink route over the tarn (Lantern)
const INK = [];
for (let y = 26; y >= 19; y--) INK.push({ t: 'ink_bridge_v_faint', x: 28, y });           // south shore to the islet: 8 cells
for (let x = 29; x <= 44 && (ground[18][x] === 'T' || x < 30); x++) if (ground[18][x] === 'T') INK.push({ t: 'ink_bridge_h_faint', x, y: 18 });   // islet to the east shore

// ---------------------------------------------------------------- the cells the decor and the scatter must keep clear
const reserved = new Set();
const keep = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) reserved.add(`${x},${y}`); };
keep(42, 9, 54, 13);          // the tower and the hut
keep(49, 10, 53, 13);
keep(33, 33, 38, 35);         // the arrival
keep(27, 16, 29, 18);         // the islet
keep(68, 12, 71, 15);         // the stile
keep(40, 17, 63, 20);         // the tunnel and its hedge
keep(48, 20, 53, 24);         // the view knoll
const nearDirt = (x, y, r = 1) => {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (inb(x + dx, y + dy) && g[y + dy][x + dx] === '=') return true;
  return false;
};

// ---------------------------------------------------------------- overlays
const overlays = [
  ...INK,
  ...scatter(ground, ['.'], ['tuft_0', 'tuft_1', 'pebbles_0', 'pebbles_1', 'pebbles_2', 'flowers_white'], 0.06, 81),
  ...scatter(ground, [','], ['flowers_violet', 'flowers_violet', 'flowers_pink', 'tuft_1'], 0.14, 82),
  ...scatter(ground, ['b'], ['tuft_0', 'pebbles_1', 'leaves'], 0.1, 83),
  ...scatter(ground, ['p'], ['pebbles_2', 'tuft_0'], 0.1, 84),
  ...scatter(ground, ['='], ['pebbles_0', 'pebbles_1', 'pebbles_2'], 0.07, 85),
  // reeds on the peat where the tarn touches it
  ...scatter(ground, ['p'], ['reeds_0', 'reeds_1', 'reeds_2'], 0.28, 86).filter((o) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(o.x + dx, o.y + dy) === 'T') return true;
    return false;
  }),
].filter((o) => !reserved.has(`${o.x},${o.y}`) || o.t.startsWith('ink_'));

// ---------------------------------------------------------------- the nine chime posts, along the Chime Road
/** Point and unit normal at arc length s along a polyline. */
function along(pts, s) {
  let acc = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    if (acc + len >= s || i + 2 === pts.length) {
      const t = Math.min(1, (s - acc) / len);
      return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t, nx: -(by - ay) / len, ny: (bx - ax) / len };
    }
    acc += len;
  }
  return null;
}
const polyLen = (pts) => pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);
const AL = polyLen(A);
const taken = new Set();
const floorOk = (x, y) => inb(x, y) && '.,bp='.includes(g[y][x]) && !reserved.has(`${x},${y}`) && !taken.has(`${x},${y}`);
const POSTS = [];
const POST_AT = [6, 16, 27, 38, 49, 60, 83, 88];       // arc lengths along A (about every ten cells)
for (let k = 1; k <= 8; k++) {
  const p = along(A, POST_AT[k - 1]);
  let found = null;
  for (const off of [2.3, -2.3, 3.2, -3.2, 4.2, -4.2, 1.8, -1.8]) {
    const x = Math.floor(p.x + p.nx * off), y = Math.floor(p.y + p.ny * off);
    if (floorOk(x, y)) { found = [x, y]; break; }
  }
  if (!found) throw new Error(`no free cell for chime post ${k} at ${JSON.stringify(p)}`);
  POSTS.push(found); taken.add(found.join(','));
}
POSTS.push([66, 12]); taken.add('66,12');                       // the ninth, beside the stile yard (mark chime_9)
POSTS.forEach(([x, y]) => keep(x, y, x, y));

// ---------------------------------------------------------------- events
const events = [
  enter('moor_enter', 'moor_arrival'),
  sign('moor_sign', 37, 32, 'moor_sign', { solid: false }),
  ...POSTS.map(([x, y], i) => sign(`chime_${i + 1}`, x, y, `chime_${i + 1}`, { solid: false })),
  sign('moor_bench', 24, 30, 'moor_bench', { solid: false }),
  // the Watchtower, Odo's hut, the third star mark at the tower's foot
  sign('x1_watchtower', 45, 12, 'x1_watchtower', { solid: false }),
  npc('odo', 51, 12, 'left'),
  object('x1_star_mark_tower', 48, 12, 'x1_cairn_moor', { script: 'star_read_3', lantern: true, if: 'stars_started' }),
  // the Hidden Fold: the black tarn and its islet
  chest('chest_moor_islet', 28, 17, 'gold', { item: 'chime_staff' }),
  // the thin roots across the gorse tunnel (Dash) and the recess beyond them
  object('x1_roots_gorse', 50, 18, 'x1_roots_gorse', { breakable: 'roots', text: 'root_wall_thin', h: 2 }),
  chest('chest_moor_gorse', 53, 17, 'iron', { behind: 'x1_roots_gorse' }),
  // the stile: thin roots between the Keepers' pillars (Dash; persists), the terrace beyond
  object('x1_roots_stile', 69, 13, 'root_drape', { breakable: 'roots', text: 'root_wall_thin', h: 2 }),
  // the chests of the visible ways
  chest('chest_moor_cairn', 12, 17, 'wood', { item: 'antidote', qty: 2 }),
  chest('chest_moor_view', 50, 21, 'iron'),
  // visible groups: 3 per ZONES.x1_highmoor.plan (respawn: 'reentry' below)
  enemy('e_mo_wolves', 22, 25, 'thornback_wolf', 'mo_wolves', 'guard'),
  enemy('e_mo_scarabs', 50, 23, 'moss_scarab', 'mo_scarabs', 'patrol', { path: steps('right', 3, 'left', 3) }),
  enemy('e_mo_wraiths', 55, 31, 'page_wraith', 'mo_wraiths', 'wander', { radius: 1 }),
];

// ---------------------------------------------------------------- decor
const decor = [];
const d1 = (t, x, y, extra = {}) => { decor.push({ t, x, y, ...extra }); taken.add(`${x},${y}`); };
d1('x1_watchtower', 44, 12);
d1('x1_turf_hut', 49, 11);
d1('signpost', 37, 32);
d1('bench', 24, 30);
POSTS.forEach(([x, y], i) => d1(`x1_chimepost_${i + 1}`, x, y));
// the cairn cache, the view knoll, the islet
d1('x1_cairn_moor', 11, 17); d1('x1_cairn_moor', 13, 17);
d1('x1_boulder_a', 48, 22); d1('x1_boulder_b', 52, 21); d1('x1_boulder_a', 54, 23); d1('x1_boulder_b', 47, 23);
d1('x1_boulder_a', 27, 16); d1('x1_boulder_b', 29, 16);
// the gorse hedge of the tunnel: rows 17 and 19 from x 41 to 63, the recess at (53, 17), the roots' two-cell gap at x 50
const hedge = (x, y, gx) => { d1(gx % 3 === 0 && x < 61 && !taken.has(`${x + 1},${y}`) && !(x + 1 === 53 && y === 17) && !(x + 1 === 50) ? 'x1_gorse_b' : 'x1_gorse_a', x, y); if (decor[decor.length - 1].t === 'x1_gorse_b') taken.add(`${x + 1},${y}`); };
for (let x = 41; x <= 63; x++) {
  for (const y of [17, 19]) {
    if (taken.has(`${x},${y}`)) continue;
    if (y === 17 && (x === 53 || x === 62)) continue;   // the recess; the way up into the yard
    if (y === 19 && x === 50) continue;                 // the roots' lower cell is floor
    hedge(x, y, x + y);
  }
}
for (const [x, y] of [[50, 20], [61, 16], [63, 16], [63, 18], [53, 16]]) if (!taken.has(`${x},${y}`) && inb(x, y)) d1('x1_gorse_a', x, y);
// scatter: gorse and boulders on the open moor, kept off the routes and the yards
const free = (x, y) => x > 1 && y > 5 && x < W - 2 && y < H - 3 && '.,bp'.includes(g[y][x]) && !reserved.has(`${x},${y}`) && !taken.has(`${x},${y}`) && !nearDirt(x, y, 2);
for (let y = 6; y < H - 3; y += 2) for (let x = 2; x < W - 2; x += 2) {
  const r = hash01(x, y, 91);
  const xx = x + (hash01(x, y, 92) < 0.5 ? 0 : 1), yy = y + (hash01(x, y, 93) < 0.5 ? 0 : 1);
  if (!free(xx, yy)) continue;
  if (r < 0.1) d1(r < 0.04 ? 'x1_gorse_b' : 'x1_gorse_a', xx, yy, {});
  else if (r < 0.15) d1(r < 0.12 ? 'x1_boulder_a' : 'x1_boulder_b', xx, yy);
  else if (r < 0.17) d1('x1_cairn_moor', xx, yy);
}
// a few wind-bent pines on the crag tops (the moor is open: no tree rows)
for (const [x, y] of [[9, 2], [26, 1], [38, 3], [62, 1], [3, 27], [20, 34], [52, 34]]) if (inb(x, y)) d1('tree_pine', x, y);
// the stile: the Keepers' pillars flank the gap (drystone line above, thorn below)
d1('x1_boulder_b', 68, 11); d1('x1_boulder_a', 68, 16); d1('x1_gorse_a', 68, 18);

export default {
  id: 'x1_highmoor', name: 'The High Moor', area: 'field',
  music: 'high_moor', ambience: 'moor_wind', tileset: 'town',
  lighting: { tint: 'none', dark: 0 },
  respawn: 'reentry',
  under: 'x1_moor_turf',
  pitTo: ['x1_highmoor', 28, 28, 'up'],
  legend: { '.': 'x1_moor_turf', ',': 'x1_heath', 'b': 'x1_bracken', 'p': 'x1_peat', '=': 'dirt', 'T': 'x1_tarn',
    '^': 'x1_crag_top', '|': 'x1_crag_face', 'w': 'x1_drystone',
    'e': 'ledge_e_a', 'f': 'ledge_e_m', 'g': 'ledge_e_b' },
  ground,
  overlays,
  decor,
  // the Orrery's brass dome catching the light over the north-east rim (the Watchtower itself stands on this map)
  overhead: [{ t: 'x1_far_dome', x: 65, y: 0 }],
  events,
  exits: [
    { x: 34, y: 35, w: 4, h: 1, to: ['x1_downs', 30, 1, 'down'] },
    { x: 71, y: 13, w: 1, h: 2, to: ['x1_terrace', 1, 13, 'right'] },
  ],
  marks: {
    south_entry: [35, 34], chime_1: POSTS[0], chime_9: [66, 12], tarn: [28, 20], islet: [28, 18], tower: [46, 8], odo: [50, 12], bench: [24, 30],
    view: [50, 22], gorse: [53, 18], stile: [69, 13], terrace_west: [70, 13],
  },
  start: { x: 35, y: 34, dir: 'up' },
};
