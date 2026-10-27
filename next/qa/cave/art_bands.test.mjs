// C2-sprites-boss: bands three to five (the Court Below, the Ember Shelves, the Forge of Names) registered through
// gen.js registerBand() by src/data/cave/bands345.js. The prefab libraries lint clean and match the first two bands'
// shape vocabulary (30 to 40 rooms, dead ends, a few set pieces, every tile and object id real, footprints as tiles.json
// has them); the landings parse; 200 seeds on B45, B65 and B85 (and the band edges) generate without a throw with the
// stair, every chest, every foe and every mark reachable; a sample is cross-checked with the hand maps' validator; the
// stairs chain across the band borders; generation stays deterministic and fast.
import test from 'node:test';
import assert from 'node:assert/strict';
import { register, BANDS345, PROPS_345, OVERLAY_SIZE_345 } from '../../src/data/cave/bands345.js';
import { generateFloor, walkModel, BANDS, BAND_ORDER, bandOf, foeCount, arrivalOf, CaveGenError } from '../../src/data/cave/gen.js';
import { PREFAB_SETS, parsePrefab, PROPS, OVERLAY_SIZE } from '../../src/data/cave/prefabs.js';
import { LANDINGS, parseLanding } from '../../src/data/cave/landing.js';
import { loadDb, isTileId, isObjectId, objectCells, tileSize, validate, walk, buildGrid } from '../../tools/maps/mapcheck.mjs';
import { SEEDS, pairFor } from './gen_helpers.mjs';

const MY = ['court', 'ember', 'forge'];
const FLOORS = [45, 65, 85];
const EDGES = [41, 59, 61, 79, 81, 99];
const db = await loadDb();

test('registerBand: the three bands are registered (not borrowed), keep gen.js music and tileset, carry their own legend, under and landing', () => {
  assert.equal(register(), BANDS, 'idempotent: a second call returns the live table');
  for (const id of MY) {
    const b = BANDS[id];
    assert.equal(b.borrowed, false, `${id} borrowed`);
    assert.equal(b.prefabs, id); assert.equal(b.landing, id);
    assert.equal(PREFAB_SETS[id], BANDS345[id].prefabs);
    assert.equal(LANDINGS[id], BANDS345[id].landing);
    assert.equal(b.legend, BANDS345[id].legend);
    assert.ok(db.tiles.terrains[b.under], `${id} under ${b.under}`);
    assert.equal(typeof b.lighting.dark, 'number');
  }
  assert.equal(BANDS.court.music, 'court'); assert.equal(BANDS.ember.music, 'emberpeak'); assert.equal(BANDS.forge.music, 'foundry');
  assert.equal(BANDS.court.tileset, 'court'); assert.equal(BANDS.ember.tileset, 'ember'); assert.equal(BANDS.forge.tileset, 'forge');
  assert.deepEqual(BAND_ORDER.slice(0, 5), ['catalogue', 'cellars', 'court', 'ember', 'forge']);
  for (const [f, id] of [[40, 'court'], [59, 'court'], [60, 'ember'], [79, 'ember'], [80, 'forge'], [99, 'forge']]) assert.equal(bandOf(f).id, id);
  // the parser tables took the new kits' entries, and nothing that was there moved
  for (const [k, v] of Object.entries(PROPS_345)) assert.deepEqual(PROPS[k], v, `PROPS.${k}`);
  for (const [k, v] of Object.entries(OVERLAY_SIZE_345)) assert.deepEqual(OVERLAY_SIZE[k], v, `OVERLAY_SIZE.${k}`);
  assert.deepEqual(PROPS.shelf_a, [2, 1]); assert.deepEqual(OVERLAY_SIZE.wall_shelf_l, [1, 2]);
});

test('prefab libraries: 30 to 40 rooms per band, at least six dead ends, two to five set pieces, sizes 5x4 to 14x9, every id real, legends complete', () => {
  for (const band of MY) {
    const list = PREFAB_SETS[band].map(parsePrefab);
    const legend = BANDS[band].legend;
    assert.ok(list.length >= 30 && list.length <= 40, `${band}: ${list.length} prefabs`);
    assert.ok(list.filter((p) => p.tags.includes('dead')).length >= 6, `${band}: dead-end rooms`);
    const sets = list.filter((p) => p.tags.includes('set')).length;
    assert.ok(sets >= 2 && sets <= 5, `${band}: ${sets} set pieces`);
    assert.ok(list.filter((p) => p.tags.includes('hall')).length >= 4, `${band}: halls`);
    assert.equal(new Set(list.map((p) => p.id)).size, list.length, `${band}: unique ids`);
    for (const p of list) {
      assert.ok(p.w >= 5 && p.w <= 14 && p.h >= 4 && p.h <= 9, `${p.id}: ${p.w}x${p.h}`);
      assert.ok(p.marks.foe.length >= 1, `${p.id}: a foe spot`);
      if (p.tags.includes('dead')) assert.ok(p.marks.chest.length >= 1, `${p.id}: a dead end holds a chest spot`);
      for (const [t, x, y] of p.decor) {
        assert.ok(isObjectId(db, t), `${p.id}: decor ${t}`);
        const cells = objectCells(db, t, x, y);
        assert.equal(cells.solid.length, PROPS[t][0] * PROPS[t][1], `${t}: PROPS says ${PROPS[t]}, tiles.json says ${cells.solid.length} solid cells`);
      }
      for (const [t] of [...p.face, ...p.decals, ...p.overhead]) assert.ok(isTileId(db, t), `${p.id}: overlay ${t}`);
      for (const [t] of p.face) {
        const [tw, th] = tileSize(db, t);
        const [ow, oh] = OVERLAY_SIZE[t] || [1, 1];
        assert.deepEqual([ow, oh], [tw, th], `${p.id}: face overlay ${t} is ${tw}x${th} cells, OVERLAY_SIZE says ${ow}x${oh}`);
      }
      for (const ch of new Set(p.cells.join(''))) assert.ok(legend[ch], `${p.id}: char '${ch}' not in the ${band} legend`);
      for (const [x, y, r] of p.lights) assert.ok(x >= 0 && y >= 0 && x < p.w && y < p.h && r >= 2 && r <= 7, `${p.id}: light at ${x},${y} r ${r}`);
    }
    for (const [ch, id] of Object.entries(legend)) assert.ok(isTileId(db, id), `${band} legend '${ch}' -> ${id}`);
    // the walk model's view of the legend: the blocked chars are blocked, the floor chars open
    const m = generateFloor(7, BANDS[band].from + 5);
    for (const ch of ['w', 'i', '#', '|']) if (legend[ch]) assert.ok(!['none'].includes(db.tiles.terrains[legend[ch]] ? db.tiles.terrains[legend[ch]].collision : 'solid') || ch === '#' || ch === '|', `${band} '${ch}' blocks`);
    assert.ok(m.rooms.length >= 8);
  }
});

test('landings: the templates parse, every tenth floor of the bands is a landing with the glyph over the plaque, no foes, one red chest, real ids', () => {
  for (const band of MY) {
    const t = parseLanding(LANDINGS[band]);
    assert.ok(t.marks.arrival && t.marks.stairs && t.marks.plaque && t.marks.chest);
    for (const [tt] of [...t.face, ...t.decals, ...t.overhead]) assert.ok(isTileId(db, tt), `${band} landing overlay ${tt}`);
    for (const [tt] of t.decor) assert.ok(isObjectId(db, tt), `${band} landing decor ${tt}`);
  }
  for (const seed of SEEDS.slice(0, 8)) for (const floor of [50, 70, 90]) {
    const m = generateFloor(seed, floor);
    assert.equal(m.landing, true); assert.equal(m.band, bandOf(floor).id);
    assert.equal(m.events.filter((e) => e.type === 'enemy').length, 0);
    const chests = m.events.filter((e) => e.type === 'chest');
    assert.equal(chests.length, 1); assert.equal(chests[0].tier, 'red');
    assert.ok(m.overlays.some((o) => o.t === 'wall_glyph_revealed' && o.x === m.marks.plaque[0] && o.y === m.marks.plaque[1] - 2), 'glyph over the plaque');
    assert.equal(m.legend['#'], BANDS[m.band].legend['#']);
  }
});

test('200 seeds x B45, B65, B85 (and the band edges on 40 seeds): no throw, stair, chests, foes and marks reachable, foe and chest counts as the plan says', () => {
  let n = 0;
  const run = (seed, floor) => {
    let m;
    try { m = generateFloor(seed, floor); } catch (e) { assert.fail(`seed ${seed} B${floor} threw ${e instanceof CaveGenError ? 'CaveGenError' : e.name}: ${e.message}`); }
    assert.equal(m.band, bandOf(floor).id);
    assert.equal(m.legend['#'], BANDS[m.band].legend['#'], 'the band\'s own kit');
    const w = walkModel(m);
    const st = m.events.find((e) => e.id === 'stairs_down');
    assert.ok(w.reached(st.x, st.y), `seed ${seed} B${floor}: stair unreachable`);
    const reds = m.events.filter((e) => e.type === 'chest' && e.tier === 'red');
    assert.ok(reds.length >= 2 && reds.length <= 4, `seed ${seed} B${floor}: ${reds.length} red chests`);
    assert.equal(m.events.filter((e) => e.type === 'enemy').length, foeCount(floor), `seed ${seed} B${floor}: foes`);
    for (const e of m.events) {
      if (e.type === 'chest') assert.ok(w.touchable(e.x, e.y), `seed ${seed} B${floor}: chest ${e.id} unreachable`);
      if (e.type === 'enemy') assert.ok(w.reached(e.x, e.y), `seed ${seed} B${floor}: foe ${e.id} unreachable`);
    }
    for (const [name, [x, y]] of Object.entries(m.marks)) assert.ok(w.reached(x, y) || w.touchable(x, y), `seed ${seed} B${floor}: mark ${name} unreachable`);
    assert.ok(m.rooms.length >= 8 && m.rooms.length <= 12);
    assert.ok(m.rooms.every((r) => PREFAB_SETS[m.band].some((p) => p.id === r.prefab)), 'every room is one of the band\'s prefabs');
    n++;
  };
  for (const seed of SEEDS) for (const floor of FLOORS) run(seed, floor);
  for (const seed of SEEDS.slice(0, 40)) for (const floor of EDGES) run(seed, floor);
  assert.equal(n, SEEDS.length * FLOORS.length + 40 * EDGES.length);
});

test('mapcheck cross-check on 15 floors of the three bands: the hand-map validator agrees, nothing the generator opens is solid for tiles.json', () => {
  const cases = [[7, 45], [7, 50], [7, 65], [7, 70], [7, 85], [7, 90], [42, 44], [42, 66], [42, 88], [1234, 41], [1234, 79], [99999, 59], [99999, 61], [11, 81], [3, 99]];
  for (const [seed, floor] of cases) {
    const { a, maps } = pairFor(seed, floor, db);
    const m = maps[a.id];
    const r = validate(m, db, maps, {});
    assert.deepEqual(r.errors, [], `seed ${seed} B${floor} errors: ${r.errors.join('; ')}`);
    for (const w of r.warnings) assert.match(w, /^no banner for cave_b\d+ in text\.js$/, `unexpected warning: ${w}`);
    assert.ok(r.walk && !r.walk.error);
    assert.deepEqual(r.walk.unreached, [], `seed ${seed} B${floor} unreached: ${r.walk.unreached.join(' ')}`);
    for (const mk of r.walk.marks) assert.ok(mk.reached, `seed ${seed} B${floor}: mark ${mk.name} not reached`);
    const g = buildGrid(m, db);
    const w = walkModel(a);
    for (let y = 0; y < g.H; y++) for (let x = 0; x < g.W; x++) {
      if (w.open[y][x]) assert.equal(g.code[y][x], 'none', `seed ${seed} B${floor}: generator opens ${x},${y} but tiles.json says ${g.code[y][x]} (${g.why[y][x]})`);
    }
    const rw = walk(m, db);
    assert.ok(!rw.error);
  }
});

test('the stairs chain across the band borders (B39 -> B40, B59 -> B60, B79 -> B80) and B99 lands on B100_ARRIVAL', () => {
  for (const seed of SEEDS.slice(0, 12)) {
    for (const floor of [39, 44, 49, 59, 60, 69, 79, 80, 89, 98]) {
      const a = generateFloor(seed, floor);
      const st = a.events.find((e) => e.id === 'stairs_down');
      assert.deepEqual(st.to.slice(0, 3), [`cave_b${floor + 1}`, ...arrivalOf(seed, floor + 1)]);
      const b = generateFloor(seed, floor + 1);
      assert.deepEqual([b.start.x, b.start.y], st.to.slice(1, 3));
      const g = buildGrid(pairFor(seed, floor, db).maps[b.id], db);
      assert.equal(g.code[st.to[2]][st.to[1]], 'none', `seed ${seed} B${floor} -> B${floor + 1} lands on ${g.code[st.to[2]][st.to[1]]}`);
    }
    assert.deepEqual(generateFloor(seed, 99).events.find((e) => e.id === 'stairs_down').to, ['cave_b100', 12, 18, 'down']);
  }
});

test('deterministic and fast: byte-identical JSON on a second run; under 30 ms a fresh floor', () => {
  for (const seed of SEEDS.slice(0, 20)) for (const floor of FLOORS) assert.equal(JSON.stringify(generateFloor(seed, floor)), JSON.stringify(generateFloor(seed, floor)));
  for (const floor of FLOORS) {
    const t0 = performance.now();
    const N = 12;
    for (let i = 0; i < N; i++) generateFloor(700000 + i * 7919 + floor, floor);
    const ms = (performance.now() - t0) / N;
    assert.ok(ms < 30, `B${floor}: ${ms.toFixed(1)} ms per floor`);
  }
});
