// Reference implementation of the tile rules used by next/assets/tiles (mirror of autotile.py + compose.py).
// Pure functions, no DOM. W2-world can copy these into src/world/autotile.js.
// Verified against the Python generator by verify_ref.py (node + python, same outputs).

// ---------------------------------------------------------------- A2 / A1 terrain autotile
// nb = {N,E,S,W,NE,NW,SE,SW}: true when that neighbour is "connected" (see terrainLayers below).
// Returns four [qx, qy] quarter sources (8 px units inside the 32x48 block) for TL, TR, BL, BR.
const Q = {
  TL: ['N', 'W', 'NW', [0, 2], [2, 2], [0, 4], [2, 0], [2, 4]],
  TR: ['N', 'E', 'NE', [3, 2], [1, 2], [3, 4], [3, 0], [1, 4]],
  BL: ['S', 'W', 'SW', [0, 5], [2, 5], [0, 3], [2, 1], [2, 3]],
  BR: ['S', 'E', 'SE', [3, 5], [1, 5], [3, 3], [3, 1], [1, 3]],
};
export function quarterSrc(q, nb) {
  const [v, h, d, outer, vedge, hedge, inner, center] = Q[q];
  if (!nb[v] && !nb[h]) return outer;
  if (!nb[v]) return vedge;
  if (!nb[h]) return hedge;
  if (!nb[d]) return inner;
  return center;
}
export function a2Quarters(nb) {
  return ['TL', 'TR', 'BL', 'BR'].map((q) => quarterSrc(q, nb));
}
// Destination offsets of the quarters inside the 16x16 cell.
export const QUARTER_OFFSET = { TL: [0, 0], TR: [8, 0], BL: [0, 8], BR: [8, 8] };

// ---------------------------------------------------------------- A4 wall face (32x32 block)
// left/top/right/bottom: true when that neighbour is the same face.
export function faceQuarters(left, top, right, bottom) {
  return [
    [left ? 2 : 0, top ? 2 : 0],      // TL
    [right ? 1 : 3, top ? 2 : 0],     // TR
    [left ? 2 : 0, bottom ? 1 : 3],   // BL
    [right ? 1 : 3, bottom ? 1 : 3],  // BR
  ];
}

// ---------------------------------------------------------------- line16 (fences, low walls, counters)
// Index = N*1 + E*2 + S*4 + W*8 (true when the neighbour carries the same tile id).
// Tile i sits at (x + (i % 8) * 16, y + floor(i / 8) * 16).
export function line16Index(n, e, s, w) {
  return (n ? 1 : 0) + (e ? 2 : 0) + (s ? 4 : 0) + (w ? 8 : 0);
}

// ---------------------------------------------------------------- fill variants
export function variantHash(x, y, salt = 0) {
  let h = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(salt, 83492791)) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h;
}
// weights from tiles.json "variantWeights" (or [4, 2, 2, ...]). Only for fully connected cells.
export function pickVariant(x, y, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let hv = variantHash(x, y) % total;
  let k = 0;
  while (hv >= weights[k]) { hv -= weights[k]; k++; }
  return k;
}

// ---------------------------------------------------------------- terrain layering
// grid[y][x] = terrain id or null. order = tiles.json terrainOrder.indexOf(id).
// Returns the draw list for one cell, low to high: [{id, nb, full}] where full = draw a fill/variant tile.
// Off-map neighbours count as connected.
const DIRS = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0], NE: [1, -1], NW: [-1, -1], SE: [1, 1], SW: [-1, 1] };
export function terrainLayers(grid, x, y, order) {
  const H = grid.length, W = grid[0].length;
  const id = grid[y][x];
  if (id == null || order(id) < 0) return [];
  const present = new Set();
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const xx = x + dx, yy = y + dy;
    if (xx >= 0 && yy >= 0 && xx < W && yy < H && grid[yy][xx] != null && order(grid[yy][xx]) >= 0) present.add(grid[yy][xx]);
  }
  const layers = [...present].filter((t) => order(t) <= order(id)).sort((a, b) => order(a) - order(b));
  return layers.map((t, i) => {
    if (i === 0) return { id: t, nb: allConnected(), full: true };
    const ot = order(t);
    const nb = {};
    for (const [k, [dx, dy]] of Object.entries(DIRS)) {
      const xx = x + dx, yy = y + dy;
      nb[k] = !(xx >= 0 && yy >= 0 && xx < W && yy < H) || (grid[yy][xx] != null && order(grid[yy][xx]) >= ot);
    }
    return { id: t, nb, full: Object.values(nb).every(Boolean) };
  });
}
function allConnected() { return { N: true, E: true, S: true, W: true, NE: true, NW: true, SE: true, SW: true }; }
