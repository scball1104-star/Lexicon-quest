// Grid path finding used by cutscenes and the goto debug command.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPath, nearestAdjacent, dirBetween, reachable, DIRS } from '../../src/world/pathfind.js';

const grid = [
  '.........',
  '.#######.',
  '.#.....#.',
  '.#.###.#.',
  '.#.#...#.',
  '.#.#####.',
  '.#.......',
  '.........',
];
const open = (x, y) => y >= 0 && y < grid.length && x >= 0 && x < grid[0].length && grid[y][x] === '.';
const can = (x, y, nx, ny) => open(nx, ny);

function walk(start, path) {
  let [x, y] = start;
  for (const d of path) { x += DIRS[d][0]; y += DIRS[d][1]; assert.ok(open(x, y), `stepped onto a wall at ${x},${y}`); }
  return [x, y];
}

test('finds the shortest route around walls', () => {
  const p = findPath(can, [0, 0], [4, 4]);
  assert.ok(p, 'route exists');
  assert.deepEqual(walk([0, 0], p), [4, 4]);
  // down the west column, along the south row, up the inner corridor, across the room's top, down to the alcove
  assert.equal(p.length, 22);
});

test('returns [] when already there and null when sealed off', () => {
  assert.deepEqual(findPath(can, [2, 2], [2, 2]), []);
  const sealed = (x, y, nx, ny) => open(nx, ny) && !(nx === 2 && ny === 2);
  assert.equal(findPath(sealed, [0, 0], [2, 2]), null);
  assert.equal(findPath(can, [0, 0], [40, 40], { maxNodes: 50 }), null);
});

test('one-way steps are honoured through the predicate', () => {
  // a ledge at (4,0): enterable only moving down from (4,-1)... here: only when dir === 'right'
  const ledge = (x, y, nx, ny, d) => open(nx, ny) && !(nx === 4 && ny === 0 && d !== 'right');
  const p = findPath(ledge, [0, 0], [8, 0]);
  assert.ok(p);
  const [x, y] = walk([0, 0], p);
  assert.deepEqual([x, y], [8, 0]);
  // the route must cross (4,0) moving right (it is the only way along row 0 from the left)
  let cx = 0, cy = 0, enteredRight = false;
  for (const d of p) { cx += DIRS[d][0]; cy += DIRS[d][1]; if (cx === 4 && cy === 0) enteredRight = d === 'right'; }
  assert.equal(enteredRight, true);
});

test('nearestAdjacent prefers the free neighbour closest to the walker', () => {
  const canStand = (x, y) => open(x, y);
  assert.deepEqual(nearestAdjacent(canStand, [4, 4], [8, 7]), [5, 4]);     // the only open neighbour
  assert.deepEqual(nearestAdjacent(canStand, [1, 1], [0, 0]), [1, 0]);     // tie: up wins over left
  assert.deepEqual(nearestAdjacent(canStand, [1, 1], [0, 3]), [0, 1]);     // closer to the walker
  assert.deepEqual(nearestAdjacent(canStand, [2, 1], [2, 3], 'down'), [2, 2]);
  assert.equal(nearestAdjacent(() => false, [4, 4], [0, 0]), null);
});

test('dirBetween picks the dominant axis', () => {
  assert.equal(dirBetween([0, 0], [3, 1]), 'right');
  assert.equal(dirBetween([0, 0], [-1, 4]), 'down');
  assert.equal(dirBetween([2, 2], [2, 0]), 'up');
  assert.equal(dirBetween([2, 2], [2, 2]), null);
  assert.equal(dirBetween([0, 0], [1, 1]), 'down');
});

test('reachable flood covers every open cell of the outer ring and the inner room', () => {
  const set = reachable(can, [0, 0]);
  let openCount = 0;
  for (let y = 0; y < grid.length; y++) for (let x = 0; x < grid[0].length; x++) if (open(x, y)) openCount++;
  assert.equal(set.size, openCount);
});
