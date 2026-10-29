// Autotile rules for next/assets/tiles (pure: no DOM, no canvas). Mirrors tools/art/tiles/autotile_ref.mjs,
// which is verified against the Python tile generator by verify_ref.py. Keep the two in step.
//
//   a2Quarters(nb)                  four [qx, qy] quarter sources (8 px units) for TL, TR, BL, BR of a cell
//   faceQuarters(l, t, r, b)        the same for a 32x32 wall face block
//   line16Index(n, e, s, w)         index into a 16-tile fence/counter row
//   pickVariant(x, y, weights)      stable fill-variant choice for fully connected cells
//   terrainLayers(grid, x, y, order) draw list (low to high) for one terrain cell
//   blobIndex(nb)                   0..46 case id of a neighbourhood (tests, debugging)

// nb = {N,E,S,W,NE,NW,SE,SW}: true when that neighbour is "connected".
const Q = {
  TL: ['N', 'W', 'NW', [0, 2], [2, 2], [0, 4], [2, 0], [2, 4]],
  TR: ['N', 'E', 'NE', [3, 2], [1, 2], [3, 4], [3, 0], [1, 4]],
  BL: ['S', 'W', 'SW', [0, 5], [2, 5], [0, 3], [2, 1], [2, 3]],
  BR: ['S', 'E', 'SE', [3, 5], [1, 5], [3, 3], [3, 1], [1, 3]],
};
export const QUARTERS = ['TL', 'TR', 'BL', 'BR'];
export const QUARTER_OFFSET = { TL: [0, 0], TR: [8, 0], BL: [0, 8], BR: [8, 8] };

export function quarterSrc(q, nb) {
  const [v, h, d, outer, vedge, hedge, inner, center] = Q[q];
  if (!nb[v] && !nb[h]) return outer;
  if (!nb[v]) return vedge;
  if (!nb[h]) return hedge;
  if (!nb[d]) return inner;
  return center;
}
export function a2Quarters(nb) {
  return QUARTERS.map((q) => quarterSrc(q, nb));
}

// A4 wall face (32x32 block): left/top/right/bottom true when that neighbour is the same face.
export function faceQuarters(left, top, right, bottom) {
  return [
    [left ? 2 : 0, top ? 2 : 0],
    [right ? 1 : 3, top ? 2 : 0],
    [left ? 2 : 0, bottom ? 1 : 3],
    [right ? 1 : 3, bottom ? 1 : 3],
  ];
}

// line16 (fences, low walls, counters): index = N*1 + E*2 + S*4 + W*8; tile i at (x + (i % 8) * 16, y + floor(i / 8) * 16).
export function line16Index(n, e, s, w) {
  return (n ? 1 : 0) + (e ? 2 : 0) + (s ? 4 : 0) + (w ? 8 : 0);
}

export function variantHash(x, y, salt = 0) {
  let h = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(salt, 83492791)) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h;
}
export function pickVariant(x, y, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let hv = variantHash(x, y) % total;
  let k = 0;
  while (hv >= weights[k]) { hv -= weights[k]; k++; }
  return k;
}

export const NB_DIRS = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0], NE: [1, -1], NW: [-1, -1], SE: [1, 1], SW: [-1, 1] };
export const ALL_CONNECTED = Object.freeze({ N: true, E: true, S: true, W: true, NE: true, NW: true, SE: true, SW: true });

/** Neighbourhood of (x, y) by a predicate on the neighbour's id; off-map counts as `offMap` (default connected). */
export function neighbours(grid, x, y, same, offMap = true) {
  const H = grid.length, W = grid[0].length;
  const nb = {};
  for (const k in NB_DIRS) {
    const xx = x + NB_DIRS[k][0], yy = y + NB_DIRS[k][1];
    nb[k] = (xx < 0 || yy < 0 || xx >= W || yy >= H) ? offMap : same(grid[yy][xx], xx, yy);
  }
  return nb;
}
export function allConnected(nb) {
  return nb.N && nb.E && nb.S && nb.W && nb.NE && nb.NW && nb.SE && nb.SW;
}

/**
 * Terrain layering for one cell. grid[y][x] = terrain id or null; order(id) = tiles.json terrainOrder index.
 * Returns [{id, nb, full}] low to high: the lowest present terrain is a full fill, each higher one an A2 cell
 * whose neighbour n is connected iff order(n) >= order(layer). Off-map neighbours count as connected.
 */
export function terrainLayers(grid, x, y, order) {
  const H = grid.length, W = grid[0].length;
  const id = grid[y][x];
  if (id == null || order(id) < 0) return [];
  const present = new Set();
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const xx = x + dx, yy = y + dy;
    if (xx >= 0 && yy >= 0 && xx < W && yy < H) {
      const t = grid[yy][xx];
      if (t != null && order(t) >= 0) present.add(t);
    }
  }
  const layers = [...present].filter((t) => order(t) <= order(id)).sort((a, b) => order(a) - order(b));
  return layers.map((t, i) => {
    if (i === 0) return { id: t, nb: ALL_CONNECTED, full: true };
    const ot = order(t);
    const nb = neighbours(grid, x, y, (o) => o != null && order(o) >= ot, true);
    return { id: t, nb, full: allConnected(nb) };
  });
}

/**
 * Canonical 0..46 blob case for a neighbourhood: diagonals only count when both adjacent edges are
 * connected (the standard 47-tile reduction). Used by tests to prove every case composes.
 */
export function blobIndex(nb) {
  const n = nb.N ? 1 : 0, e = nb.E ? 1 : 0, s = nb.S ? 1 : 0, w = nb.W ? 1 : 0;
  const ne = n && e && nb.NE ? 1 : 0, nw = n && w && nb.NW ? 1 : 0, se = s && e && nb.SE ? 1 : 0, sw = s && w && nb.SW ? 1 : 0;
  const bits = n | (ne << 1) | (e << 2) | (se << 3) | (s << 4) | (sw << 5) | (w << 6) | (nw << 7);
  return BLOB_CASES.indexOf(bits);
}
/** The 47 distinct bit patterns (N=1, NE=2, E=4, SE=8, S=16, SW=32, W=64, NW=128) after the diagonal reduction. */
export const BLOB_CASES = (() => {
  const seen = new Set();
  for (let b = 0; b < 256; b++) {
    const n = b & 1, e = (b >> 2) & 1, s = (b >> 4) & 1, w = (b >> 6) & 1;
    const ne = n && e ? (b >> 1) & 1 : 0, se = s && e ? (b >> 3) & 1 : 0, sw = s && w ? (b >> 5) & 1 : 0, nw = n && w ? (b >> 7) & 1 : 0;
    seen.add(n | (ne << 1) | (e << 2) | (se << 3) | (s << 4) | (sw << 5) | (w << 6) | (nw << 7));
  }
  return [...seen].sort((a, b) => a - b);
})();
/** Neighbourhood object for one of the 256 raw bit patterns. */
export function nbFromBits(bits) {
  return {
    N: !!(bits & 1), NE: !!(bits & 2), E: !!(bits & 4), SE: !!(bits & 8),
    S: !!(bits & 16), SW: !!(bits & 32), W: !!(bits & 64), NW: !!(bits & 128),
  };
}
