// E4-integrate (EPISODE4_PLAN 10.7, 3.3, 12): the three tests E4-pack left pending (qa/core/ep4_pack.test.mjs), turned on now
// that the story, the patches and the keep maps exist, plus the order trap with both real packs (no stand-ins).
// Pure node: no browser. Its own file: the ep4 maps registry is memoized per process.
import test from 'node:test';
import assert from 'node:assert/strict';
import { peekMap } from '../../src/world/maps.js';
import ep3Emberpeak from '../../src/data/maps/ep3/emberpeak.js';
import ep3Inn from '../../src/data/maps/ep3/pk_inn.js';
import { register as registerMaps, mapReport } from '../../src/data/ep4/maps.js';
import { scenes, GATE } from '../../src/data/ep4/story.js';
import { newGameEp4 } from '../../src/data/ep4/start.js';
import { serialize, deserialize, markOpened, isOpened } from '../../src/game/state.js';
import { compile, classify, gateOpen, levelsOf } from '../../src/data/ep4/field/tide.js';
import { loadDb, buildGrid, withFlags, present } from '../../tools/maps/mapcheck.mjs';
import { runOnce } from '../content/_harness.mjs';
import keepF1 from '../../src/data/maps/ep4_keep_f1.js';

const ran = (log) => log.filter((e) => e.op !== 'hasFlag').length;
const EP3_CREDITS_FLAGS = () => Object.keys(newGameEp4('Arden').flags).filter((f) => newGameEp4('Arden').flags[f]);

test('order trap, both real packs: the ep3 pack registers first, then the real ep4 patches land on its modules', async () => {
  const r = await registerMaps();
  assert.deepEqual(r.patched.sort(), ['emberpeak', 'pk_inn']);
  assert.equal(r.skipped.length, 0, `every Episode 4 map module loads (${r.skipped})`);
  assert.equal(mapReport().patchFile, true);
  const em = peekMap('emberpeak'), inn = peekMap('pk_inn');
  assert.notEqual(em, ep3Emberpeak);
  assert.notEqual(inn, ep3Inn);
  for (const id of ['east_road_trig', 'rope_ladder', 'east_road_down', 'ep4_wake_pk']) assert.ok(em.events.some((e) => e.id === id), id);
  assert.ok(inn.events.some((e) => e.id === 'ep4_wake'));
  for (const e of ep3Emberpeak.events) assert.ok(em.events.some((x) => x.id === e.id), `kept ${e.id}`);
  for (const e of ep3Inn.events) assert.ok(inn.events.includes(e), `kept ${e.id}`);
  assert.deepEqual(em.ground, ep3Emberpeak.ground);
  const again = await registerMaps();
  assert.equal(again, r, 'idempotent');
  assert.ok(peekMap('emberpeak').events.some((e) => e.id === 'east_road_trig'), 'the patch survives');
});

test('an Episode 3 credits fixture reaches ep4_morning with EP4_LIVE on, and not with it off; Fine Print never does', async () => {
  await registerMaps();
  const flags = EP3_CREDITS_FLAGS();
  assert.ok(flags.includes('ep3_complete'));
  const wake = peekMap('pk_inn').events.find((e) => e.id === 'ep4_wake');
  assert.equal(wake.script, 'ep4_morning');
  assert.equal(wake.on, 'enter');
  assert.ok(present(wake, new Set(flags)), 'the wake trigger is present for the credits fixture');
  const was = GATE.live;
  try {
    GATE.live = true;
    const on = await runOnce(scenes.ep4_morning, { flags, branchFlags: false });
    const set = on.log.filter((e) => e.op === 'setFlag').map((e) => e.args[0]);
    assert.ok(set.includes('ep4_started') && set.includes('ep4_morning_done'), `live: the morning plays (${set})`);
    assert.ok(on.log.some((e) => e.op === 'give' && e.args[0] === 'running_decree'));
    const tier = await runOnce(scenes.ep4_morning, { flags: [...flags, 'tier_1'], branchFlags: false });
    assert.equal(ran(tier.log), 0, 'a Fine Print save never starts Episode 4');
    const twice = await runOnce(scenes.ep4_morning, { flags: [...flags, 'ep4_morning_done'], branchFlags: false });
    assert.equal(ran(twice.log), 0, 'the morning runs once');
    GATE.live = false;
    const off = await runOnce(scenes.ep4_morning, { flags, branchFlags: false });
    assert.equal(ran(off.log), 0, 'switch off: nothing runs');
  } finally { GATE.live = was; }
});

test('Episode 3 complete and EP4_LIVE off: the washout is impassable; with east_road_open the way down is reachable', async () => {
  await registerMaps();
  const db = await loadDb();
  const em = peekMap('emberpeak');
  const reach = (flags) => {
    const shaped = withFlags(em, new Set(flags));
    const g = buildGrid({ ...shaped, events: [] }, db);
    const [sx, sy] = em.marks.east_road;
    const seen = new Set([`${sx},${sy}`]);
    const q = [[sx, sy]];
    while (q.length) {
      const [x, y] = q.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
        if (nx < 0 || ny < 0 || nx >= g.W || ny >= g.H || seen.has(k) || g.code[ny][nx] !== 'none') continue;
        seen.add(k); q.push([nx, ny]);
      }
    }
    return { seen, door: shaped.events.find((e) => e.id === 'east_road_down') || null, trig: shaped.events.find((e) => e.id === 'east_road_trig') || null };
  };
  const done = EP3_CREDITS_FLAGS();
  const off = reach(done);
  assert.equal(off.door, null, 'no way down while east_road_open is unset');
  assert.equal(off.trig, null, 'and no east road trigger before ep4_started (only ep4_morning sets it, and only while live)');
  assert.ok(!off.seen.has('39,15') && !off.seen.has('38,15'), 'the drop stays water');
  const open = reach([...done, 'ep4_started', 'east_road_open']);
  assert.ok(open.door, 'the ladder door is there');
  assert.ok(open.seen.has('38,15'), 'the brink is walkable');
  assert.ok([[38, 15], [39, 14], [39, 16], [40, 15]].some(([x, y]) => open.seen.has(`${x},${y}`)) || open.seen.has('39,15'), 'the ladder foot is reachable');
  assert.deepEqual(open.door.to, ['ep4_flood_road', 1, 15, 'right']);
});

test('an Episode 4 save made mid-keep reloads with washed seals and latched floodgates, and every basin at its start level', () => {
  const g = newGameEp4('Arden', { slot: 1 });
  g.map = 'ep4_keep_f1';
  g.pos = { x: 33, y: 4, dir: 'up' };
  g.washed = { ep4_keep_f1: ['seal_b'] };
  markOpened(g, 'ep4_keep_f1', 'tidegate');
  g.flags.tidegate_open = true;
  const back = deserialize(JSON.parse(JSON.stringify(serialize(g))));
  assert.deepEqual(back.washed, { ep4_keep_f1: ['seal_b'] });
  assert.ok(isOpened(back, 'ep4_keep_f1', 'tidegate') && back.flags.tidegate_open);
  assert.equal(back.autosaveSlot, 1, 'the run keeps its own slot');
  const m = compile(keepF1);
  assert.ok(m, 'F1 has a tide block');
  const start = levelsOf(keepF1, {});
  for (const id of m.ids) assert.equal(start[id], m.basins[id].start, `basin ${id} reloads at its start level`);
  const seal = m.forgeries.find((f) => f.id === 'seal_b');
  const gate = m.floodgates.find((f) => f.id === 'tidegate');
  assert.ok(seal && gate);
  // the field's reset: washed from game.washed, latched from the flag or game.opened (system.js Tide.reset)
  const latched = m.floodgates.filter((fg) => (fg.ev.flag && back.flags[fg.ev.flag]) || (fg.latch && isOpened(back, 'ep4_keep_f1', fg.id))).map((fg) => fg.id);
  const st = { washed: new Set(back.washed.ep4_keep_f1), latched: new Set(latched) };
  assert.ok(!classify(keepF1, st).solid.has(seal.i), 'the washed seal stays washed');
  assert.ok(gateOpen(keepF1, st, gate), 'the latched floodgate stays open at the start level');
  // and an old save (no washed, nothing latched) sees both shut
  const old = deserialize(JSON.parse(JSON.stringify({ ...serialize(newGameEp4('Arden')), washed: undefined })));
  const st0 = { washed: new Set((old.washed || {}).ep4_keep_f1 || []), latched: new Set() };
  assert.ok(classify(keepF1, st0).solid.has(seal.i));
  assert.ok(!gateOpen(keepF1, st0, gate));
});

test('Valewyn: canal_rain follows the rain (weatherIf): it plays before vw_restored and eases out the moment the flag is set', async () => {
  const { syncWeather } = await import('../../src/data/ep4/field/seams.js');
  const VALEWYN = (await import('../../src/data/maps/ep4_valewyn.js')).default;
  assert.equal(VALEWYN.ambience, 'canal_rain');
  const calls = [];
  const flags = new Set(['vw_arrived']);
  const field = { particles: { setRain() {}, rainIntensity: 1 }, map: { mod: VALEWYN }, hasFlag: (k) => flags.has(k),
    engine: { audio: { ambience: (id, o) => calls.push(id) } } };
  syncWeather(field);
  assert.deepEqual(calls, ['canal_rain'], 'a wet arrival keeps the rain ambience');
  syncWeather(field);
  assert.equal(calls.length, 1, 'no call while nothing changes');
  flags.add('vw_restored');
  syncWeather(field);
  assert.deepEqual(calls, ['canal_rain', null], 'the restore stops it');
  const dry = { ...field, ep4WeatherMap: null, ep4AmbWant: undefined, map: { mod: VALEWYN } };
  calls.length = 0;
  syncWeather(dry);
  assert.deepEqual(calls, [null], 'a dry arrival is quiet from the first frame');
  const road = (await import('../../src/data/maps/ep4_flood_road.js')).default;
  calls.length = 0;
  syncWeather({ ...field, map: { mod: road } });
  assert.deepEqual(calls, [], 'the Flood Road (no weatherIf) keeps its map ambience untouched');
  for (const id of ['ep4_keep_f1', 'ep4_keep_f2', 'ep4_keep_f3', 'ep4_keep_crown']) {
    assert.equal((await import(`../../src/data/maps/${id}.js`)).default.ambience, 'keep_drip', id);
  }
  assert.equal(road.ambience, 'canal_rain');
});

test('the Keep boats moored on water are boarded: their cells walk while the boat door is present (moorBoats)', async () => {
  const { moorBoats } = await import('../../src/data/ep4/field/events.js');
  const tile = [['none', 'water', 'water', 'none']];
  const map = { w: 4, h: 1, base: [['none', 'water', 'water', 'none']], inBounds: (x, y) => x >= 0 && y === 0 && x < 4,
    recomputeCell(x, y) { this.base[y][x] = tile[y][x]; } };
  const boat = { id: 'boat_crown_out', type: 'door', x: 1, y: 0, present: true, ev: { kind: 'boat', w: 2, to: ['ep4_valewyn', 29, 4, 'down'] } };
  const field = { map, entities: new Map([[boat.id, boat]]) };
  moorBoats(field);
  assert.deepEqual(map.base[0], ['none', 'none', 'none', 'none'], 'the boat cells walk');
  map.recomputeCell(1, 0);
  assert.equal(map.base[0][1], 'none', 'kept through a recompute');
  boat.present = false;
  moorBoats(field);
  assert.deepEqual(map.base[0], ['none', 'water', 'water', 'none'], 'no boat, the water is water again');
  // every Episode 4 boat door: on a keep floor it stands on tide_water (the case this fixes), in town on a jetty
  for (const id of ['ep4_keep_f1', 'ep4_keep_f2', 'ep4_keep_f3', 'ep4_keep_crown']) {
    const m = (await import(`../../src/data/maps/${id}.js`)).default;
    assert.ok(m.events.some((e) => e.type === 'door' && e.kind === 'boat'), `${id} has a boat`);
  }
});
