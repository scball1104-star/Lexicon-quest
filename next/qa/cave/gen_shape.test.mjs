// Shape of a generated floor (C1-gen brief, deliverable 4): 8 to 12 rooms, the stair in the room farthest by walk
// distance from the arrival and never adjacent to it, chest counts in range, one blue chest at most, foes per the plan's
// count, landings with no foes and one red chest and the plaque mark, every tile id real, every event id unique, the
// opts contract honoured, and a floor generated in under 30 ms.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateFloor, walkModel, foeCount, BANDS, registerBand } from '../../src/data/cave/gen.js';
import { PREFAB_SETS, LEGENDS, parsePrefab, PROPS } from '../../src/data/cave/prefabs.js';
import { LANDINGS } from '../../src/data/cave/landing.js';
import { loadDb, isTileId, isObjectId, objectCells } from '../../tools/maps/mapcheck.mjs';
import { SEEDS, FLOORS } from './gen_helpers.mjs';

const man = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);

test('rooms: 8 to 12 per floor, every room inside the grid, the arrival room and the stair room distinct', () => {
  for (const seed of SEEDS.slice(0, 40)) for (const floor of [1, 9, 19, 35, 55, 99]) {
    const m = generateFloor(seed, floor);
    assert.ok(m.rooms.length >= 8 && m.rooms.length <= 12, `seed ${seed} B${floor}: ${m.rooms.length} rooms`);
    const W = m.ground[0].length, H = m.ground.length;
    for (const r of m.rooms) assert.ok(r.x >= 1 && r.y >= 3 && r.x + r.w <= W - 1 && r.y + r.h <= H - 1, `seed ${seed} B${floor}: room ${r.id} leaves the grid`);
    const roles = m.rooms.map((r) => r.role);
    assert.equal(roles.filter((x) => x === 'arrival').length, 1);
    assert.equal(roles.filter((x) => x === 'stairs').length, 1);
    assert.ok(m.links.length >= m.rooms.length - 1, 'a spanning set of links');
  }
});

test('the stair is in the room farthest by walk distance from the arrival, never a graph neighbour of it, never adjacent', () => {
  for (const seed of SEEDS.slice(0, 60)) for (const floor of [1, 9, 19, 35, 99]) {
    const m = generateFloor(seed, floor);
    const w = walkModel(m);
    const dist = (r) => { let best = Infinity; for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) { const d = w.dist[r.y + y][r.x + x]; if (d >= 0 && d < best) best = d; } return best; };
    const arrival = m.rooms.find((r) => r.role === 'arrival'), stairs = m.rooms.find((r) => r.role === 'stairs');
    const neighbours = new Set(m.links.filter(([a, b]) => a === arrival.id || b === arrival.id).map(([a, b]) => (a === arrival.id ? b : a)));
    // a stair needs two free face columns (the object is 32 px wide); rooms whose north face the corridors used up cannot take it
    const cands = m.rooms.filter((r) => r.id !== arrival.id && !neighbours.has(r.id) && r.stairCols > 0);
    const pool = cands.length ? cands : m.rooms.filter((r) => r.id !== arrival.id && r.stairCols > 0);
    const far = Math.max(...pool.map(dist));
    assert.equal(dist(stairs), far, `seed ${seed} B${floor}: stair room ${stairs.id} at ${dist(stairs)}, farthest is ${far}`);
    assert.ok(!neighbours.has(stairs.id) || !cands.length, `seed ${seed} B${floor}: the stair room is a graph neighbour of the arrival`);
    assert.ok(man(m.marks.stairs, m.marks.arrival) >= 6, `seed ${seed} B${floor}: stair ${m.marks.stairs} too close to arrival ${m.marks.arrival}`);
    assert.ok(w.dist[m.marks.stairs[1]][m.marks.stairs[0]] >= 12, `seed ${seed} B${floor}: stair only ${w.dist[m.marks.stairs[1]][m.marks.stairs[0]]} steps from the arrival`);
    // the stairs object sits in the north face above the mark, the stairs_up above the arrival
    assert.ok(m.decor.some((d) => d.t === 'stairs_down' && d.x === m.marks.stairs[0] && d.y === m.marks.stairs[1] - 1));
    assert.ok(m.decor.some((d) => d.t === 'stairs_up' && d.x === m.marks.arrival[0] && d.y === m.marks.arrival[1] - 1));
  }
});

test('chests: red 2 to 4 (dead ends first), at most one blue, ids and marks deterministic; the opts.chests contract', () => {
  for (const seed of SEEDS.slice(0, 40)) for (const floor of [2, 5, 15, 25, 35]) {
    const m = generateFloor(seed, floor);
    const reds = m.events.filter((e) => e.type === 'chest' && e.tier === 'red');
    const blues = m.events.filter((e) => e.type === 'chest' && e.tier === 'blue');
    assert.ok(reds.length >= 2 && reds.length <= 4, `seed ${seed} B${floor}: ${reds.length} red chests`);
    assert.ok(blues.length <= 1);
    assert.equal(blues.length, floor % 10 === 5 ? 1 : 0, 'default stub: a blue chest on floors ending in 5');
    const w = walkModel(m);
    const inFront = (c, mk) => Math.abs(mk[0] - c.x) + Math.abs(mk[1] - c.y) === 1 && w.reached(mk[0], mk[1]);
    reds.forEach((c, i) => { assert.equal(c.id, `chest_${i + 1}`); assert.ok(inFront(c, m.marks[c.id]), `${c.id} mark is the walkable cell beside it`); assert.equal(c.floor, floor); });
    if (blues.length) { assert.equal(blues[0].id, 'blue_chest'); assert.ok(inFront(blues[0], m.marks.blue_chest)); }
    // dead ends are filled first: every dead-end room with a reachable chest spot holds a chest, as long as there are
    // chests enough to go round (chestSpots counts the spots the walk can touch)
    const inRoom = (c, r) => c.x >= r.x && c.x < r.x + r.w && c.y >= r.y && c.y < r.y + r.h;
    const chests = [...reds, ...blues];
    const dead = m.rooms.filter((r) => r.degree === 1 && r.role !== 'arrival' && r.chestSpots > 0);
    const filled = dead.filter((r) => chests.some((c) => inRoom(c, r))).length;
    assert.equal(filled, Math.min(dead.length, chests.length), `seed ${seed} B${floor}: ${filled} of ${dead.length} dead ends hold a chest (${chests.length} chests)`);
    if (blues.length && dead.length) assert.ok(dead.some((r) => inRoom(blues[0], r)), `seed ${seed} B${floor}: the blue chest is not in a dead end`);
  }
  const m3 = generateFloor(11, 7, { chests: { red: 3, blue: true } });
  assert.equal(m3.events.filter((e) => e.type === 'chest' && e.tier === 'red').length, 3);
  assert.equal(m3.events.filter((e) => e.type === 'chest' && e.tier === 'blue').length, 1);
  const m0 = generateFloor(11, 7, { chests: { red: 2, blue: false } });
  assert.equal(m0.events.filter((e) => e.type === 'chest').length, 2);
});

test('foes: 4 + floor/10 (max 12), never in the arrival room, never within 3 of the arrival, chase or wander or guard; the opts.foes contract', () => {
  for (const seed of SEEDS.slice(0, 40)) for (const floor of [1, 9, 19, 35, 55, 99]) {
    const m = generateFloor(seed, floor);
    const foes = m.events.filter((e) => e.type === 'enemy');
    assert.equal(foes.length, foeCount(floor), `seed ${seed} B${floor}: ${foes.length} foes`);
    const arrival = m.rooms.find((r) => r.role === 'arrival');
    for (const f of foes) {
      assert.ok(!(f.x >= arrival.x && f.x < arrival.x + arrival.w && f.y >= arrival.y && f.y < arrival.y + arrival.h), `${f.id} in the arrival room`);
      assert.ok(man([f.x, f.y], m.marks.arrival) >= 4, `${f.id} too close to the arrival`);
      assert.ok(['chase', 'wander', 'guard'].includes(f.move));
      if (f.move === 'wander') assert.equal(f.radius, 2);
      assert.deepEqual(m.marks[f.id], [f.x, f.y]);
      assert.ok(BANDS[m.band].foes.some((p) => p.enc === f.encounter && p.sprite === f.sprite), 'default stub pool');
    }
  }
  assert.equal(foeCount(1), 4); assert.equal(foeCount(10), 5); assert.equal(foeCount(80), 12); assert.equal(foeCount(99), 12);
  // injected pools: strings with opts.sprites, or objects with a fixed move
  const pool = ['cave_test_a', { enc: 'cave_test_b', sprite: 'tome_golem', move: 'guard' }];
  const m = generateFloor(5, 88, { foes: () => pool, sprites: { cave_test_a: 'ink_wraith' } });   // twelve foes: both entries show up
  const foes = m.events.filter((e) => e.type === 'enemy');
  assert.ok(foes.every((f) => (f.encounter === 'cave_test_a' && f.sprite === 'ink_wraith') || (f.encounter === 'cave_test_b' && f.sprite === 'tome_golem' && f.move === 'guard')));
  assert.ok(foes.some((f) => f.encounter === 'cave_test_a') && foes.some((f) => f.encounter === 'cave_test_b'));
});

test('landings (every tenth floor): the band template, no foes, one red chest, the plaque mark, landing: true, the plaque sign only when opts.plaque says so', () => {
  for (const seed of SEEDS.slice(0, 10)) for (const floor of [10, 20, 30, 50, 90]) {
    const m = generateFloor(seed, floor);
    assert.equal(m.landing, true);
    assert.equal(m.events.filter((e) => e.type === 'enemy').length, 0);
    const chests = m.events.filter((e) => e.type === 'chest');
    assert.equal(chests.length, 1); assert.equal(chests[0].tier, 'red'); assert.equal(chests[0].id, 'chest_1');
    for (const k of ['arrival', 'stairs', 'plaque', 'chest_1']) assert.ok(m.marks[k], `mark ${k}`);
    assert.ok(m.overlays.some((o) => o.t === 'wall_glyph_revealed' && o.x === m.marks.plaque[0] && o.y === m.marks.plaque[1] - 2), 'the glyph sits in the face above the plaque mark');
    assert.equal(m.events.filter((e) => e.type === 'sign').length, 0);
    assert.equal(m.rooms.length, 0);
    assert.equal(generateFloor(seed, floor).id, `cave_b${floor}`);
  }
  const p = generateFloor(3, 20, { plaque: (floor, band) => `cave_plaque_${band}_${floor}` });
  const sign = p.events.find((e) => e.type === 'sign');
  assert.ok(sign && sign.id === 'plaque' && sign.text === 'cave_plaque_cellars_20' && sign.solid === false);
  assert.deepEqual([sign.x, sign.y], [p.marks.plaque[0], p.marks.plaque[1] - 1]);
});

test('every tile, object, prop and sprite id on 60 floors exists in tiles.json / props.json / the field atlas; every event id unique', async () => {
  const db = await loadDb();
  for (const seed of SEEDS.slice(0, 10)) for (const floor of [1, 9, 10, 19, 20, 35]) {
    const m = generateFloor(seed, floor);
    for (const [ch, id] of Object.entries(m.legend)) assert.ok(isTileId(db, id), `seed ${seed} B${floor}: legend '${ch}' -> ${id} unknown`);
    const used = new Set(m.ground.join(''));
    for (const ch of used) assert.ok(m.legend[ch], `seed ${seed} B${floor}: '${ch}' not in the legend`);
    for (const row of m.ground) assert.equal(row.length, m.ground[0].length);
    for (const o of m.overlays) assert.ok(isTileId(db, o.t), `seed ${seed} B${floor}: overlay ${o.t} unknown`);
    for (const o of m.overhead) assert.ok(isTileId(db, o.t), `seed ${seed} B${floor}: overhead ${o.t} unknown`);
    for (const d of m.decor) {
      assert.ok(isObjectId(db, d.t), `seed ${seed} B${floor}: decor ${d.t} unknown`);
      // the generator's footprint table agrees with tiles.json / props.json
      const cells = objectCells(db, d.t, d.x, d.y);
      const fp = PROPS[d.t];
      assert.ok(fp, `PROPS lacks ${d.t}`);
      assert.equal(cells.solid.length, fp[0] * fp[1], `${d.t}: PROPS says ${fp[0]}x${fp[1]}, tiles.json says ${cells.solid.length} solid cells`);
    }
    for (const e of m.events) if (e.type === 'enemy') assert.ok(db.enemiesField.sprites[e.sprite], `field sprite ${e.sprite}`);
    assert.ok(db.tiles.terrains[m.under], `under ${m.under}`);
    const ids = m.events.map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length, `seed ${seed} B${floor}: duplicate event ids`);
    for (const e of m.events) assert.ok(e.id && e.type && Number.isInteger(e.x) && Number.isInteger(e.y));
    for (const [name, mk] of Object.entries(m.marks)) assert.ok(Array.isArray(mk) && mk.length === 2 && mk[0] >= 0 && mk[1] >= 0 && mk[0] < m.ground[0].length && mk[1] < m.ground.length, `mark ${name}`);
    for (const k of ['id', 'name', 'area', 'music', 'ambience', 'tileset', 'backdrop', 'lighting', 'under', 'legend', 'ground', 'overlays', 'decor', 'overhead', 'events', 'exits', 'marks', 'start']) assert.ok(k in m, `field ${k}`);
    assert.equal(typeof m.lighting.dark, 'number');
    assert.equal(m.start.dir, 'down');
  }
});

test('prefab library: 30 to 40 rooms per band, at least six dead-end rooms, two or three set pieces, sizes 5x4 to 14x9, every id real', async () => {
  const db = await loadDb();
  for (const band of ['catalogue', 'cellars']) {
    const list = PREFAB_SETS[band].map(parsePrefab);
    assert.ok(list.length >= 30 && list.length <= 40, `${band}: ${list.length} prefabs`);
    assert.ok(list.filter((p) => p.tags.includes('dead')).length >= 6, `${band}: dead-end rooms`);
    const sets = list.filter((p) => p.tags.includes('set')).length;
    assert.ok(sets >= 2 && sets <= 5, `${band}: ${sets} set pieces`);
    assert.equal(new Set(list.map((p) => p.id)).size, list.length, `${band}: unique ids`);
    for (const p of list) {
      assert.ok(p.w >= 5 && p.w <= 14 && p.h >= 4 && p.h <= 9, `${p.id}: ${p.w}x${p.h}`);
      for (const [t] of p.decor) assert.ok(isObjectId(db, t), `${p.id}: decor ${t}`);
      for (const [t] of [...p.face, ...p.decals, ...p.overhead]) assert.ok(isTileId(db, t), `${p.id}: overlay ${t}`);
      for (const ch of new Set(p.cells.join(''))) assert.ok(LEGENDS[band][ch], `${p.id}: char '${ch}' not in the ${band} legend`);
    }
  }
  for (const t of Object.values(LANDINGS)) assert.ok(t.rows.length && t.rows.every((r) => r.length === t.rows[0].length));
});

test('registerBand: bands three to five borrow the cellars kit until C2 plugs their prefabs; a registered band is used', () => {
  for (const id of ['court', 'ember', 'forge']) assert.equal(BANDS[id].borrowed, true);
  const m = generateFloor(9, 45);
  assert.equal(m.band, 'court'); assert.equal(m.music, 'court'); assert.equal(m.legend['#'], 'stacks_top');
  // a custom band: three tiny prefabs would not make a floor; a copy of the cellars list under a new name does
  const before = JSON.stringify(generateFloor(9, 65));
  registerBand('ember', { prefabs: PREFAB_SETS.cellars.slice(0, 30), music: 'emberpeak' });
  assert.equal(BANDS.ember.borrowed, false);
  const after = generateFloor(9, 65);
  assert.equal(after.band, 'ember');
  assert.notEqual(JSON.stringify(after), before, 'a registered prefab list changes the floor');
});

test('performance: a fresh floor (plus its stairs target layout) generates in under 30 ms on average', () => {
  for (const floor of [3, 55, 99]) {
    const t0 = performance.now();
    const N = 12;
    for (let i = 0; i < N; i++) generateFloor(500000 + i * 7919 + floor, floor);
    const ms = (performance.now() - t0) / N;
    assert.ok(ms < 30, `B${floor}: ${ms.toFixed(1)} ms per floor`);
  }
});
