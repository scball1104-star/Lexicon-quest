// E5-integrate (EPISODE5_PLAN 3.3, 10, 12): the tests E5-pack left pending (qa/saves/ep5_saves.test.mjs,
// qa/core/ep5_maps_order.test.mjs), turned on now that the story, the patches, the Labyrinth and the field code exist, plus
// the order trap with both real packs (no stand-ins) and the integration seams fixed in this wave: the taproom staging of
// ep5_morning, the berth's step trigger, and the cold first entry's re-landing. Pure node: no browser. Its own file: the ep4
// and ep5 map registries are memoized per process.
import test from 'node:test';
import assert from 'node:assert/strict';
import { peekMap } from '../../src/world/maps.js';
import ep4Inn from '../../src/data/maps/ep4_vw_inn.js';
import ep4Valewyn from '../../src/data/maps/ep4_valewyn.js';
import { register as registerMaps, mapReport } from '../../src/data/ep5/maps.js';
import { scenes, GATE, SCENE_CONDITIONS } from '../../src/data/ep5/story.js';
import { newGameEp5, EP4_DONE_FLAGS } from '../../src/data/ep5/start.js';
import { relandPatched, PATCHED_MAPS } from '../../src/data/ep5/hooks.js';
import { serialize, deserialize, markOpened, isOpened } from '../../src/game/state.js';
import { compile } from '../../src/data/ep5/field/shade.js';
import { loadDb, buildGrid, withFlags, present } from '../../tools/maps/mapcheck.mjs';
import { runOnce } from '../content/_harness.mjs';
import labF1 from '../../src/data/maps/ep5_lab_f1.js';
import labF2 from '../../src/data/maps/ep5_lab_f2.js';
import labF3 from '../../src/data/maps/ep5_lab_f3.js';

const ran = (log) => log.filter((e) => e.op !== 'hasFlag').length;
const credits = () => { const g = newGameEp5('Arden'); return Object.keys(g.flags).filter((f) => g.flags[f]); };   // Episodes 1 to 4 done, ep5 not begun

test('order trap, both real packs: the ep4 maps register first, then the real ep5 patches land on their modules', async () => {
  const r = await registerMaps();
  assert.deepEqual(r.patched.sort(), ['ep4_valewyn', 'ep4_vw_inn']);
  assert.equal(r.skipped.length, 0, `every Episode 5 map module loads (${r.skipped})`);
  assert.equal(mapReport().patchFile, true);
  const inn = peekMap('ep4_vw_inn'), vw = peekMap('ep4_valewyn');
  assert.notEqual(inn, ep4Inn);
  assert.notEqual(vw, ep4Valewyn);
  assert.ok(inn.events.some((e) => e.id === 'ep5_wake'));
  for (const id of ['ship_moored', 'ship_berth', 'berth_trig', 'berth_sail', 'berth_south']) assert.ok(vw.events.some((e) => e.id === id), id);
  for (const e of ep4Inn.events) assert.ok(inn.events.includes(e), `kept ${e.id}`);
  for (const e of ep4Valewyn.events) assert.ok(vw.events.includes(e), `kept ${e.id}`);
  assert.deepEqual(vw.ground, ep4Valewyn.ground);
  const again = await registerMaps();
  assert.equal(again, r, 'idempotent');
});

test('an Episode 4 credits fixture reaches ep5_morning with EP5_LIVE on, and not with it off; never Fine Print, never twice', async () => {
  await registerMaps();
  const flags = credits();
  for (const f of ['ep4_complete', ...EP4_DONE_FLAGS]) assert.ok(flags.includes(f), f);
  const wake = peekMap('ep4_vw_inn').events.find((e) => e.id === 'ep5_wake');
  assert.deepEqual([wake.script, wake.on], ['ep5_morning', 'enter']);
  assert.ok(present(wake, new Set(flags)), 'the wake trigger is present for the credits fixture');
  const was = GATE.live;
  try {
    GATE.live = true;
    const on = await runOnce(scenes.ep5_morning, { flags, branchFlags: false, mapId: 'ep4_vw_inn' });
    const set = on.log.filter((e) => e.op === 'setFlag').map((e) => e.args[0]);
    assert.ok(set.includes('ep5_started') && set.includes('ep5_morning_done'), `live: the morning plays (${set})`);
    assert.ok(on.log.some((e) => e.op === 'give' && e.args[0] === 'star_letter'));
    const tier = await runOnce(scenes.ep5_morning, { flags: [...flags, 'tier_1'], branchFlags: false });
    assert.equal(ran(tier.log), 0, 'a Fine Print save never starts Episode 5');
    // plan 10 / open item 9: a save already past the morning (ep5_morning_done, set with ep5_started) never plays it again,
    // wherever it was made: the inn, the street, the Haven, the Labyrinth
    const twice = await runOnce(scenes.ep5_morning, { flags: [...flags, 'ep5_morning_done', 'ep5_started', 'ship_boarded'], branchFlags: false });
    assert.equal(ran(twice.log), 0, 'the morning runs once');
    const early = await runOnce(scenes.ep5_morning, { flags: flags.filter((f) => f !== 'ep4_complete'), branchFlags: false });
    assert.equal(ran(early.log), 0, 'an Episode 4 save before its ending never starts Episode 5');
    GATE.live = false;
    const off = await runOnce(scenes.ep5_morning, { flags, branchFlags: false });
    assert.equal(ran(off.log), 0, 'switch off: nothing runs');
  } finally { GATE.live = was; }
  assert.deepEqual([SCENE_CONDITIONS.ep5_morning.ifNot].flat().sort(), ['ep5_morning_done', 'tier_1']);
});

test('with EP5_LIVE off no wake trigger fires and no ship is drawn; the berth doors land on walkable cells', async () => {
  await registerMaps();
  const db = await loadDb();
  const vw = peekMap('ep4_valewyn');
  const flags = new Set(credits());
  // nothing sets ep5_started while the switch is off (only ep5_morning does, and it needs the switch): no ship, no berth
  for (const id of ['ship_moored', 'ship_moored_sign', 'ship_berth', 'berth_trig', 'berth_sail', 'berth_south']) {
    assert.ok(!present(vw.events.find((e) => e.id === id), flags), `${id} absent before Episode 5`);
  }
  const walkable = (mapId, x, y, f) => {
    const m = peekMap(mapId);
    const g = buildGrid({ ...withFlags(m, new Set(f)), events: [] }, db);
    return g.code[y][x] === 'none';
  };
  const sail = vw.events.find((e) => e.id === 'berth_sail').to, south = vw.events.find((e) => e.id === 'berth_south').to;
  assert.ok(walkable(sail[0], sail[1], sail[2], [...flags, 'ep5_started', 'ship_boarded']), `berth_sail lands on ${sail}`);
  assert.ok(walkable(south[0], south[1], south[2], [...flags, 'ep5_started', 'ship_boarded', 'road_landed']), `berth_south lands on ${south}`);
  const back = peekMap('ep5_saffron').events.find((e) => e.id === 'haven_boat').to;
  assert.deepEqual(back.slice(0, 3), ['ep4_valewyn', 32, 30]);
  assert.ok(walkable(back[0], back[1], back[2], [...flags, 'ep5_started', 'road_landed']), 'the Haven boat lands on the quay');
  // the gangway: the berth object and its step trigger share the cell the boat door takes once aboard
  const berth = vw.events.filter((e) => ['ship_berth', 'berth_trig', 'berth_sail'].includes(e.id)).map((e) => [e.x, e.y].join(','));
  assert.equal(new Set(berth).size, 1);
  const trig = vw.events.find((e) => e.id === 'berth_trig');
  assert.deepEqual([trig.type, trig.script, trig.if, trig.ifNot], ['trigger', 'ep5_board', 'ep5_started', 'ship_boarded']);
});

test('ep5_morning stages in the room the party is in: the guest room after the credits, the taproom from the street', async () => {
  await registerMaps();
  const db = await loadDb();
  const inn = peekMap('ep4_vw_inn');
  const flags = credits();
  const grid = buildGrid({ ...withFlags(inn, new Set(flags)), events: [] }, db);
  const reach = (from) => {
    const seen = new Set([from.join(',')]), q = [from];
    while (q.length) {
      const [x, y] = q.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
        if (nx < 0 || ny < 0 || nx >= grid.W || ny >= grid.H || seen.has(k) || grid.code[ny][nx] !== 'none') continue;
        seen.add(k); q.push([nx, ny]);
      }
    }
    return seen;
  };
  // a scene API that records where everyone is sent, with the pack's leaderAt (field/events.js attach)
  const play = async (at) => {
    const walks = [];
    const s = new Proxy({}, {
      has: (t, k) => k === 'leaderAt',
      get: (t, k) => {
        if (k === 'then' || typeof k === 'symbol') return undefined;
        if (k === 'leaderAt') return () => at;
        if (k === 'hasFlag') return async (f) => flags.includes(f);
        if (k === 'mapId') return 'ep4_vw_inn';
        if (k === 'camera') return { panTo: async (m) => { walks.push(['camera', m]); }, follow: async () => {} };
        if (k === 'walk') return async (who, m) => { walks.push([who, m]); };
        if (k === 'spawn') return async (who, o) => { walks.push([who, o.at]); };
        if (k === 'choice') return async () => 0;
        return async () => {};
      },
    });
    const was = GATE.live;
    GATE.live = true;
    try { await scenes.ep5_morning(s); } finally { GATE.live = was; }
    return walks;
  };
  const guest = await play([17, 7]), tap = await play([10, 10]);
  assert.deepEqual(guest.map(([, m]) => m), ['yara_table', 'inn_stage', 'mira_window', 'inn_stage_b', 'mira_window']);
  assert.deepEqual(tap.map(([, m]) => m), ['yara_table_tap', 'inn_stage_tap', 'mira_window_tap', 'inn_stage_b_tap', 'mira_window_tap']);
  const fromBed = reach(inn.marks.inn_bed), fromDoor = reach([10, 10]);
  for (const [, m] of guest) assert.ok(fromBed.has(inn.marks[m].join(',')), `${m} ${inn.marks[m]} is reached from the bed`);
  for (const [, m] of tap) assert.ok(fromDoor.has(inn.marks[m].join(',')), `${m} ${inn.marks[m]} is reached from the front door`);
  assert.ok(!fromDoor.has(inn.marks.inn_stage.join(',')), 'the guest room is not reached from the taproom (the stair is a door)');
});

test('the cold first entry: an unpatched inn or Valewyn is re-entered once the patches are registered, only when it matters', async () => {
  await registerMaps();
  assert.deepEqual(PATCHED_MAPS, ['ep4_vw_inn', 'ep4_valewyn']);
  const later = [];
  const field = (mapId, flags, extra = {}) => {
    const warps = [];
    const f = { name: 'field', mapId, map: { mod: mapId === 'ep4_vw_inn' ? ep4Inn : ep4Valewyn }, game: { flags }, leader: { tx: 17, ty: 7, dir: 'down', moving: false },
      dead: false, loading: false, pendingWarp: null, inputLocked: 0, cutscene: { running: null }, warpTo: (...a) => warps.push(a), ...extra };
    const engine = { stack: [f], scene: f, after: (n, fn) => later.push(fn) };
    return { f, engine, warps };
  };
  const done = Object.fromEntries(credits().map((k) => [k, true]));
  let t = field('ep4_vw_inn', done);
  assert.equal(relandPatched(t.engine), true, 'the unpatched inn before the morning is re-entered');
  assert.deepEqual(t.warps, [['ep4_vw_inn', 17, 7, 'down', 'warp']]);
  t = field('ep4_vw_inn', { ...done, ep5_morning_done: true, ep5_started: true });
  assert.equal(relandPatched(t.engine), false, 'past the morning: nothing to do');
  t = field('ep4_valewyn', done);
  assert.equal(relandPatched(t.engine), false, 'Valewyn before Episode 5: no berth to show');
  t = field('ep4_valewyn', { ...done, ep5_started: true });
  assert.equal(relandPatched(t.engine), true, 'Valewyn in Episode 5: the berth comes in');
  t = field('ep4_vw_inn', done, { map: { mod: peekMap('ep4_vw_inn') } });
  assert.equal(relandPatched(t.engine), false, 'already patched');
  t = field('ep4_vw_inn', done, { inputLocked: 1 });
  later.length = 0;
  assert.equal(relandPatched(t.engine), false, 'busy: not now');
  assert.equal(later.length, 1, 'busy: it looks again later');
  t.f.inputLocked = 0;
  later[0]();
  assert.deepEqual(t.warps, [['ep4_vw_inn', 17, 7, 'down', 'warp']], 'and re-enters once idle');
});

test('an Episode 5 save made mid-Labyrinth reloads with latched plates and opened doors, every floor at its start hour', () => {
  const g = newGameEp5('Arden', { slot: 1 });
  for (const f of ['ep5_started', 'lab_entered', 'lab_f1_arrived', 'sel_memory_1', 'plate_f1_open', 'lab_f1_done', 'lab_f2_arrived']) g.flags[f] = true;
  markOpened(g, 'ep5_lab_f1', 'door_d');
  markOpened(g, 'ep5_lab_f1', 'plate_d');
  markOpened(g, 'ep5_lab_f3', 'plate_r');
  g.map = 'ep5_lab_f2'; g.pos = { x: 20, y: 25, dir: 'up' };
  const back = deserialize(serialize(g));
  for (const [m, id] of [['ep5_lab_f1', 'door_d'], ['ep5_lab_f1', 'plate_d'], ['ep5_lab_f3', 'plate_r']]) assert.ok(isOpened(back, m, id), `${m}:${id}`);
  assert.ok(back.flags.plate_f1_open);
  // no save field holds an hour or a stone: each floor compiles to its start hour and its authored casters on every arrival
  assert.ok(!JSON.stringify(serialize(g)).match(/"hour"|"shade"/), 'no new save field');
  const hours = Object.fromEntries([labF1, labF2, labF3].map((m) => [m.id, compile(m).hour]));
  assert.deepEqual(hours, { ep5_lab_f1: 'noon', ep5_lab_f2: 'dawn', ep5_lab_f3: 'night' });
  for (const m of [labF1, labF2, labF3]) {
    const c = compile(m);
    for (const e of m.events.filter((x) => (x.type === 'standstone' || x.type === 'lampcart') && (x.shove || x.push))) {
      const rec = c.byId.get(e.id);
      assert.ok(rec, `${m.id}:${e.id} compiled`);
      assert.equal(rec.i, e.y * c.W + e.x, `${m.id}:${e.id} starts on its authored cell`);
    }
  }
});
