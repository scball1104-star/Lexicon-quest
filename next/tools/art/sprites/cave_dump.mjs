// Dump Deep Stacks maps as JSON for tools/art/sprites/cave_map_preview.py (C2-sprites-boss). Bands three to five are
// registered first (src/data/cave/bands345.js), so floors B40 to B99 come out with their own prefabs.
//
//   node tools/art/sprites/cave_dump.mjs --map cave_b100            the hand-made map module (+ `_walk` from the generator's model)
//   node tools/art/sprites/cave_dump.mjs --floor <seed> <floor>      a generated floor with the registered bands
//   node tools/art/sprites/cave_dump.mjs --prefabs <band>            every prefab of a band as its own tiny map (a list)
//   node tools/art/sprites/cave_dump.mjs --landing <band>            the band's landing as a floor (seed 7, the band's first tenth floor)
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateFloor, walkModel, BANDS } from '../../../src/data/cave/gen.js';
import { PREFAB_SETS, LEGENDS, parsePrefab } from '../../../src/data/cave/prefabs.js';
import { wallDepth } from '../../../src/data/maps/_kit.js';
import '../../../src/data/cave/bands345.js';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const after = (f) => args[args.indexOf(f) + 1];
const nums = args.filter((a) => /^-?\d+$/.test(a)).map(Number);

function withWalk(mod) {
  const w = walkModel(mod);
  const reach = [], floor = [];
  for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) { if (w.dist[y][x] >= 0) reach.push(`${x},${y}`); if (w.open[y][x]) floor.push(`${x},${y}`); }
  return { ...mod, _walk: { reachable: reach, floor } };
}

/** A prefab as a standalone map (tools/cave/dump.mjs prefabMap, restated so this tool runs with the bands registered). */
function prefabMap(band, def) {
  const p = parsePrefab(def);
  const W = p.w + 4, H = p.h + 6;
  const g = [];
  for (let y = 0; y < H; y++) g.push(new Array(W).fill('#'));
  const ox = 2, oy = 4;
  for (let x = 0; x < p.w; x++) { g[oy - 2][ox + x] = '|'; g[oy - 1][ox + x] = '|'; }
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) g[oy + y][ox + x] = p.cells[y][x];
  const ground = wallDepth(g.map((r) => r.join('')));
  const b = BANDS[band];
  const overlays = [...p.decals.map(([t, x, y]) => ({ t, x: ox + x, y: oy + y })), ...p.face.map(([t, x, dy]) => ({ t, x: ox + x, y: oy + dy }))];
  const decor = p.decor.map(([t, x, y]) => ({ t, x: ox + x, y: oy + y }));
  const overhead = p.overhead.map(([t, x, y]) => ({ t, x: ox + x, y: oy + y }));
  const events = [];
  const marks = {};
  p.marks.chest.forEach(([x, y], i) => events.push({ id: `chest_${i + 1}`, type: 'chest', x: ox + x, y: oy + y, tier: p.marks.blue.some(([bx, by]) => bx === x && by === y) ? 'blue' : 'red' }));
  p.marks.foe.forEach(([x, y], i) => { marks[`foe_${i + 1}`] = [ox + x, oy + y]; });
  p.lights.forEach(([x, y, r, color], i) => events.push({ id: `light_${i}`, type: 'light', x: ox + x, y: oy + y, r, color }));
  for (const side of ['n', 's', 'e', 'w']) for (const v of p.doors[side]) {
    marks[`${side}${v}`] = side === 'n' ? [ox + v, oy] : side === 's' ? [ox + v, oy + p.h - 1] : side === 'w' ? [ox, oy + v] : [ox + p.w - 1, oy + v];
  }
  return { id: p.id, name: p.id, area: 'dungeon', music: b.music, tileset: b.tileset, lighting: b.lighting, under: b.under,
    legend: { ...(b.legend || LEGENDS[band]) }, ground, overlays, decor, overhead, events, exits: [], marks, start: null, tags: p.tags, cols: p.cols };
}

if (flag('--map')) {
  const id = after('--map');
  const mod = (await import(pathToFileURL(path.join(NEXT, 'src', 'data', 'cave', 'maps', `${id}.js`)).href)).default;
  process.stdout.write(JSON.stringify(withWalk(mod)));
} else if (flag('--prefabs')) {
  const band = after('--prefabs');
  const list = PREFAB_SETS[band];
  if (!list) { console.error(`no band ${band}`); process.exit(1); }
  process.stdout.write(JSON.stringify(list.map((d) => prefabMap(band, d))));
} else if (flag('--landing')) {
  const band = BANDS[after('--landing')];
  const floor = Math.ceil(band.from / 10) * 10;
  process.stdout.write(JSON.stringify(withWalk(generateFloor(7, floor))));
} else if (flag('--floor')) {
  const [seed, floor] = nums;
  process.stdout.write(JSON.stringify(withWalk(generateFloor(seed, floor))));
} else {
  console.error('usage: cave_dump.mjs --map <id> | --floor <seed> <floor> | --prefabs <band> | --landing <band>');
  process.exit(1);
}
