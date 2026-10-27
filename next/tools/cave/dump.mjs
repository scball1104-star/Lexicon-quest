// Dump generated Deep Stacks floors as JSON for tools/cave/preview.py (and for a quick look at a floor from the shell).
//
//   node tools/cave/dump.mjs <seed> <floor>            one floor module (+ `_walk`: the generator's reachable cells)
//   node tools/cave/dump.mjs <seed> <floor> --ascii    the ground rows and marks as text instead of JSON
//   node tools/cave/dump.mjs --prefabs <band>          every prefab of a band rendered as its own tiny map (a list)
//   node tools/cave/dump.mjs --time <seed> <floor>     generation time over 20 runs (ms per floor)
import { generateFloor, walkModel, BANDS } from '../../src/data/cave/gen.js';
import { PREFAB_SETS, LEGENDS, parsePrefab } from '../../src/data/cave/prefabs.js';
import { wallDepth } from '../../src/data/maps/_kit.js';

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const nums = args.filter((a) => /^-?\d+$/.test(a)).map(Number);

function withWalk(mod) {
  const w = walkModel(mod);
  const reach = [];
  for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) if (w.dist[y][x] >= 0) reach.push(`${x},${y}`);
  const floor = [];
  for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) if (w.open[y][x]) floor.push(`${x},${y}`);
  return { ...mod, _walk: { reachable: reach, floor } };
}

/** A prefab as a standalone map: walls round it, its faces, its dressing, every mark as an event or a mark. */
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
    const k = `${side}${v}`;
    marks[k] = side === 'n' ? [ox + v, oy] : side === 's' ? [ox + v, oy + p.h - 1] : side === 'w' ? [ox, oy + v] : [ox + p.w - 1, oy + v];
  }
  return { id: p.id, name: p.id, area: 'dungeon', music: b.music, tileset: b.tileset, lighting: b.lighting, under: b.under,
    legend: { ...LEGENDS[band] }, ground, overlays, decor, overhead, events, exits: [], marks, start: null, tags: p.tags, cols: p.cols };
}

if (flag('--prefabs')) {
  const band = args[args.indexOf('--prefabs') + 1];
  const list = PREFAB_SETS[band];
  if (!list) { console.error(`no band ${band}`); process.exit(1); }
  process.stdout.write(JSON.stringify(list.map((d) => prefabMap(band, d))));
} else if (flag('--time')) {
  const [seed, floor] = nums;
  const t0 = performance.now();
  const N = 20;
  for (let i = 0; i < N; i++) generateFloor(seed + i * 1000003, floor);
  const ms = (performance.now() - t0) / N;
  console.log(`B${floor}: ${ms.toFixed(2)} ms per floor (${N} seeds, fresh layouts)`);
} else {
  const [seed, floor] = nums;
  if (seed === undefined || floor === undefined) { console.error('usage: dump.mjs <seed> <floor> [--ascii]'); process.exit(1); }
  const mod = generateFloor(seed, floor);
  if (flag('--ascii')) {
    const g = mod.ground.map((r) => r.split(''));
    for (const [k, [x, y]] of Object.entries(mod.marks)) g[y][x] = k === 'arrival' ? 'A' : k === 'stairs' ? 'S' : k.startsWith('chest') ? 'C' : k === 'blue_chest' ? 'B' : k.startsWith('foe') ? 'F' : 'P';
    console.log(`${mod.id} ${mod.name} ${mod.ground[0].length}x${mod.ground.length} rooms ${mod.rooms.length} events ${mod.events.length}`);
    console.log(g.map((r) => r.join('')).join('\n'));
    console.log(JSON.stringify(mod.rooms));
  } else process.stdout.write(JSON.stringify(withWalk(mod)));
}
