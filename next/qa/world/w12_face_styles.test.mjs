// W12 (CRITIQUE_4 item 6): per-room Court wall art. tiles.json faceStyles + faceStyleByMap, resolved by the pure
// faceBlockGrid in src/world/tilemap.js: every room's wall run takes one style, the pinned rooms keep theirs, F3 and the
// throne room do not share a strip, and every block lies inside court.png.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { faceRuns, runStyles, faceBlockGrid } from '../../src/world/tilemap.js';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const db = JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'tiles', 'tiles.json'), 'utf8'));

function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

async function mapIds(id) {
  const mod = (await import(pathToFileURL(path.join(NEXT, 'src', 'data', 'maps', id + '.js')).href)).default;
  return mod.ground.map((row) => [...row].map((ch) => mod.legend[ch] ?? null));
}

const key = (b) => (b ? b.join(',') : 'plain');

test('Court wall systems carry face styles inside court.png', () => {
  const { w, h } = pngSize(path.join(NEXT, 'assets', 'tiles', 'court.png'));
  for (const sys of ['court', 'court_throne']) {
    const m = db.walls[sys];
    assert.ok(Array.isArray(m.faceStyles) && m.faceStyles.length >= 4, `${sys}: four styles or more`);
    assert.deepEqual(m.faceStyles[0], [m.face], `${sys}: style 0 is the system's own face`);
    for (const st of m.faceStyles) for (const [x, y] of st) {
      assert.ok(x >= 0 && y >= 0 && x + 32 <= w && y + 32 <= h, `${sys}: block ${x},${y} inside court.png`);
      assert.equal(x % 8, 0); assert.equal(y % 8, 0);
    }
  }
});

test('runs and the style plan: pins win, the rest cycle in reading order', () => {
  const ids = [
    ['f', 'f', '.', 'f'],
    ['.', '.', '.', 'f'],
    ['f', '.', '.', '.'],
  ];
  const runs = faceRuns(ids, 'f');
  assert.equal(runs.length, 3);
  assert.deepEqual(runStyles(runs, 3, { cycle: [1, 2], at: [[3, 1, 0]] }), [1, 0, 2]);
  assert.deepEqual(runStyles(runs, 2, null), [0, 1, 0]);
});

test('F1: the entry hall and the teaching room keep the arched mirrors; the other rooms vary', async () => {
  const ids = await mapIds('court_f1');
  const grid = faceBlockGrid(ids, db, 'court_f1');
  const s0 = key(db.walls.court.faceStyles[0][0]);
  assert.equal(key(grid[23][19]), s0, 'entry hall');
  assert.equal(key(grid[16][12]), s0, 'teaching room');
  const runs = faceRuns(ids, 'court_face');
  const firstBlocks = new Set(runs.map((r) => key(grid[r.cells[0][1]][r.cells[0][0]])));
  assert.ok(firstBlocks.size >= 4, `F1 rooms use at least four looks (got ${firstBlocks.size})`);
});

test('a map without a plan keeps the plain face', async () => {
  const ids = await mapIds('court_f1');
  const grid = faceBlockGrid(ids, db, 'some_other_map');
  assert.ok(grid.every((r) => r.every((b) => b === null)));
});

test('F3 and the throne room do not share one strip', async () => {
  const f3 = await mapIds('court_f3');
  const th = await mapIds('court_throne');
  const g3 = faceBlockGrid(f3, db, 'court_f3');
  const gt = faceBlockGrid(th, db, 'court_throne');
  const blocks = (ids, g) => new Set(ids.flatMap((r, y) => r.map((id, x) => (id === 'court_throne_face' ? key(g[y][x]) : null))).filter(Boolean));
  const b3 = blocks(f3, g3), bt = blocks(th, gt);
  assert.ok(b3.size >= 3, 'F3 rooms vary');
  for (const b of bt) assert.ok(!b3.has(b), `the throne room's block ${b} is not used on F3`);
});
