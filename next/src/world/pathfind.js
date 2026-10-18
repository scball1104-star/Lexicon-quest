// Grid path finding for actors and cutscenes (pure: no DOM). 4-direction BFS over a step predicate, so
// one-way ledges, counters and other direction-dependent rules live in the caller.
//
//   findPath(canStep, [sx, sy], [gx, gy], { maxNodes }) -> ['up', 'right', ...] | null
//     canStep(x, y, nx, ny, dir) -> true when an actor on (x, y) may step to (nx, ny) in direction dir
//   nearestAdjacent(canStand, [tx, ty], [fromX, fromY]) -> the free neighbour of the target closest to `from`
//   dirBetween([x, y], [tx, ty]) -> the dominant 4-way direction from one tile toward another

export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const DIR_LIST = ['up', 'down', 'left', 'right'];
export const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

export function dirBetween(a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  if (Math.abs(dy) > Math.abs(dx)) return dy > 0 ? 'down' : 'up';
  return dy > 0 ? 'down' : 'up';   // diagonal tie: vertical reads better for 4-way sprites
}

/**
 * Breadth-first search from start to goal. Returns the list of directions (shortest, ties broken in the
 * order up, down, left, right so routes look deliberate), [] when already there, null when unreachable.
 * `maxNodes` bounds the search (default 4096 cells) so a huge sealed map never stalls a frame.
 */
export function findPath(canStep, start, goal, opts = {}) {
  const maxNodes = opts.maxNodes || 4096;
  const [sx, sy] = start, [gx, gy] = goal;
  if (sx === gx && sy === gy) return [];
  const key = (x, y) => y * 65536 + x;
  const came = new Map();
  came.set(key(sx, sy), null);
  const queue = [[sx, sy]];
  let head = 0;
  while (head < queue.length && came.size <= maxNodes) {
    const [x, y] = queue[head++];
    for (const d of DIR_LIST) {
      const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
      const k = key(nx, ny);
      if (came.has(k)) continue;
      if (!canStep(x, y, nx, ny, d)) continue;
      came.set(k, { from: key(x, y), dir: d });
      if (nx === gx && ny === gy) {
        const path = [];
        let cur = k;
        while (cur !== null) { const rec = came.get(cur); if (!rec) break; path.push(rec.dir); cur = rec.from; }
        return path.reverse();
      }
      queue.push([nx, ny]);
    }
  }
  return null;
}

/**
 * Pick the neighbour of `target` where an actor can stand, preferring the one nearest `from` (Manhattan),
 * then the one in front of the target's facing (`facing`, optional). Returns [x, y] or null.
 */
export function nearestAdjacent(canStand, target, from, facing = null) {
  const [tx, ty] = target;
  const cands = [];
  for (const d of DIR_LIST) {
    const x = tx + DIRS[d][0], y = ty + DIRS[d][1];
    if (!canStand(x, y)) continue;
    const dist = Math.abs(x - from[0]) + Math.abs(y - from[1]);
    const pref = facing && d === facing ? -0.5 : 0;
    cands.push({ x, y, score: dist + pref });
  }
  if (!cands.length) return null;
  cands.sort((a, b) => a.score - b.score);
  return [cands[0].x, cands[0].y];
}

/**
 * Where followers stand when the party appears at (x, y) facing `dir`: the two tiles behind the leader when
 * they are open, else the tiles beside the first trailing tile, then beside the leader, then in front. Never
 * the leader's own tile, never a tile twice. `open(x, y)` says whether a tile can hold a follower.
 * Returns up to n [x, y] tiles (fewer when the map is that cramped; the caller stacks the rest).
 */
export function trailingTiles(open, x, y, dir, n) {
  const d = DIRS[dir] || DIRS.down;
  const back = [x - d[0], y - d[1]];
  const back2 = [x - 2 * d[0], y - 2 * d[1]];
  const perp = [[d[1], -d[0]], [-d[1], d[0]]];
  const cands = [back, back2,
    [back[0] + perp[0][0], back[1] + perp[0][1]], [back[0] + perp[1][0], back[1] + perp[1][1]],
    [x + perp[0][0], y + perp[0][1]], [x + perp[1][0], y + perp[1][1]],
    [x + d[0], y + d[1]]];
  const out = [];
  const seen = new Set([`${x},${y}`]);
  for (const c of cands) {
    const k = `${c[0]},${c[1]}`;
    if (seen.has(k) || !open(c[0], c[1])) continue;
    seen.add(k);
    out.push(c);
    if (out.length >= n) break;
  }
  return out;
}

/** Flood fill of reachable tiles (for tests and map checks): returns a Set of "x,y" keys. */
export function reachable(canStep, start, maxNodes = 65536) {
  const seen = new Set([`${start[0]},${start[1]}`]);
  const queue = [start];
  let head = 0;
  while (head < queue.length && seen.size < maxNodes) {
    const [x, y] = queue[head++];
    for (const d of DIR_LIST) {
      const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
      const k = `${nx},${ny}`;
      if (seen.has(k) || !canStep(x, y, nx, ny, d)) continue;
      seen.add(k);
      queue.push([nx, ny]);
    }
  }
  return seen;
}
