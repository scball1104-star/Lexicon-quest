// Autotile rules: every one of the 47 blob cases composes from valid quarters, layering and variants are
// deterministic, wall faces and line16 indices follow the tiles README.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { a2Quarters, BLOB_CASES, nbFromBits, blobIndex, terrainLayers, faceQuarters, line16Index, pickVariant, variantHash, neighbours, allConnected } from '../../src/world/autotile.js';

test('all 47 blob cases produce in-range quarters and distinct tiles', () => {
  assert.equal(BLOB_CASES.length, 47);
  const seen = new Map();
  for (const bits of BLOB_CASES) {
    const nb = nbFromBits(bits);
    const qs = a2Quarters(nb);
    assert.equal(qs.length, 4);
    for (const [qx, qy] of qs) {
      assert.ok(qx >= 0 && qx <= 3, `qx ${qx}`);
      assert.ok(qy >= 0 && qy <= 5, `qy ${qy}`);
    }
    const key = qs.map((q) => q.join(',')).join('|');
    assert.ok(!seen.has(key), `case ${bits} duplicates case ${seen.get(key)}`);
    seen.set(key, bits);
    assert.equal(blobIndex(nb), BLOB_CASES.indexOf(bits));
  }
});

test('diagonal neighbours only matter when both edges connect (256 raw patterns map onto 47)', () => {
  const keys = new Set();
  for (let b = 0; b < 256; b++) keys.add(a2Quarters(nbFromBits(b)).map((q) => q.join(',')).join('|'));
  assert.equal(keys.size, 47);
});

test('isolated, fully connected and edge cases pick the documented quarters', () => {
  const none = a2Quarters(nbFromBits(0));
  assert.deepEqual(none, [[0, 2], [3, 2], [0, 5], [3, 5]]);           // four outer corners
  const all = a2Quarters(nbFromBits(255));
  assert.deepEqual(all, [[2, 4], [1, 4], [2, 3], [1, 3]]);            // centre quarters
  const noNorth = a2Quarters({ N: false, E: true, S: true, W: true, NE: true, NW: true, SE: true, SW: true });
  assert.deepEqual(noNorth[0], [2, 2]); assert.deepEqual(noNorth[1], [1, 2]);   // top edge quarters
  const innerNW = a2Quarters({ N: true, E: true, S: true, W: true, NE: true, NW: false, SE: true, SW: true });
  assert.deepEqual(innerNW[0], [2, 0]);                                // inner corner
});

test('terrainLayers draws the lowest terrain as a fill and higher ones as edges', () => {
  const order = (id) => ['dirt', 'grass', 'water'].indexOf(id);
  const grid = [
    ['grass', 'grass', 'grass'],
    ['grass', 'water', 'grass'],
    ['dirt', 'grass', 'grass'],
  ];
  // the water cell's 3x3 neighbourhood holds dirt (the SW corner), so dirt is the fill, grass an edge, water an edge
  const centre = terrainLayers(grid, 1, 1, order);
  assert.deepEqual(centre.map((l) => l.id), ['dirt', 'grass', 'water']);
  assert.equal(centre[0].full, true);
  assert.equal(centre[1].full, false);
  assert.equal(centre[1].nb.SW, false);                            // grass is not connected toward the dirt
  assert.equal(centre[2].full, false);
  assert.equal(centre[2].nb.N, false);                             // water edge against the grass
  const plain = terrainLayers([['grass', 'grass'], ['grass', 'water']], 1, 1, order);
  assert.deepEqual(plain.map((l) => l.id), ['grass', 'water']);
  assert.equal(plain[0].full, true);
  const corner = terrainLayers(grid, 0, 2, order);
  assert.deepEqual(corner.map((l) => l.id), ['dirt']);            // dirt is lowest: its own fill only
  const grassNextToDirt = terrainLayers(grid, 1, 2, order);
  assert.deepEqual(grassNextToDirt.map((l) => l.id), ['dirt', 'grass']);
  assert.equal(grassNextToDirt[1].nb.W, false);                   // grass edge faces the dirt
  assert.equal(grassNextToDirt[1].nb.S, true);                    // off-map counts as connected
  assert.deepEqual(terrainLayers([[null]], 0, 0, order), []);
});

test('wall faces and line16 indices', () => {
  assert.deepEqual(faceQuarters(false, false, false, false), [[0, 0], [3, 0], [0, 3], [3, 3]]);
  assert.deepEqual(faceQuarters(true, true, true, true), [[2, 2], [1, 2], [2, 1], [1, 1]]);
  assert.equal(line16Index(false, false, false, false), 0);
  assert.equal(line16Index(true, true, true, true), 15);
  assert.equal(line16Index(false, true, false, true), 10);
});

test('variants are deterministic, in range and weighted', () => {
  const weights = [4, 2, 2, 2];
  const counts = [0, 0, 0, 0];
  for (let y = 0; y < 50; y++) for (let x = 0; x < 50; x++) {
    const k = pickVariant(x, y, weights);
    assert.ok(k >= 0 && k < 4);
    assert.equal(k, pickVariant(x, y, weights));
    counts[k]++;
  }
  assert.ok(counts[0] > counts[1] && counts[0] > counts[2] && counts[0] > counts[3], `weights respected: ${counts}`);
  assert.equal(variantHash(3, 7), variantHash(3, 7));
  assert.notEqual(variantHash(3, 7), variantHash(7, 3));
});

test('neighbours helper treats the map edge as connected and reports allConnected', () => {
  const grid = [['a', 'a'], ['a', 'b']];
  const nb = neighbours(grid, 0, 0, (o) => o === 'a');
  assert.equal(nb.NW, true); assert.equal(nb.SE, false); assert.equal(allConnected(nb), false);
  assert.equal(allConnected(neighbours([['a']], 0, 0, (o) => o === 'a')), true);
});
