// E6-integrate (EPISODE6_PLAN 3.4, 10, 12): the tests E6-pack left pending (qa/saves/ep6_saves.test.mjs,
// qa/core/ep6_maps_order.test.mjs), turned on now that the story, the patches, the Observatory and the field code exist, plus
// the order trap with both real packs (no stand-ins). Pure node: no browser. Its own file: the ep5 and ep6 map registries are
// memoized per process.
import test from 'node:test';
import assert from 'node:assert/strict';
import { peekMap } from '../../src/world/maps.js';
import ep5Inn from '../../src/data/maps/ep5_sh_inn.js';
import ep5Saffron from '../../src/data/maps/ep5_saffron.js';
import { register as registerMaps, mapReport, EP6_MAP_IDS } from '../../src/data/ep6/maps.js';
import { register as registerEp6 } from '../../src/data/ep6/index.js';
import { scenes, GATE, SCENE_CONDITIONS } from '../../src/data/ep6/story.js';
import { newGameEp6 } from '../../src/data/ep6/start.js';
import { serialize, deserialize, markOpened, isOpened } from '../../src/game/state.js';
import { compile, follow, live, maskOf } from '../../src/data/ep6/field/wind.js';
import { loadDb, buildGrid, withFlags, present } from '../../tools/maps/mapcheck.mjs';
import { GATE_SPRITES } from '../../src/world/events.js';
import { runOnce } from '../content/_harness.mjs';
import obsF1 from '../../src/data/maps/ep6_obs_f1.js';
import obsF2 from '../../src/data/maps/ep6_obs_f2.js';
import obsF3 from '../../src/data/maps/ep6_obs_f3.js';

const ran = (log) => log.filter((e) => e.op !== 'hasFlag').length;
let credits = null;   // Episodes 1 to 5 done, ep6 not begun (the quick start's flags are an Episode 5 credits save's)
async function creditsFlags() {
  if (!credits) { await registerEp6(); const g = newGameEp6('Arden'); credits = Object.keys(g.flags).filter((f) => g.flags[f]); }
  return credits;
}

test('order trap, both real packs: the ep5 maps register first, then the real ep6 patches land on their modules', async () => {
  const r = await registerMaps();
  assert.deepEqual(r.patched.sort(), ['ep5_saffron', 'ep5_sh_inn']);
  assert.deepEqual(r.loaded, EP6_MAP_IDS, `every Episode 6 map module loads (skipped ${r.skipped})`);
  assert.equal(r.skipped.length, 0);
  assert.equal(mapReport().patchFile, true);
  const inn = peekMap('ep5_sh_inn'), sh = peekMap('ep5_saffron');
  assert.notEqual(inn, ep5Inn);
  assert.notEqual(sh, ep5Saffron);
  assert.ok(inn.events.some((e) => e.id === 'ep6_wake'));
  for (const id of ['ship_moored', 'sky_berth', 'sky_berth_trig', 'berth_north']) assert.ok(sh.events.some((e) => e.id === id), id);
  for (const e of ep5Inn.events) assert.ok(inn.events.includes(e), `kept ${e.id}`);
  for (const e of ep5Saffron.events) assert.ok(sh.events.includes(e), `kept ${e.id}`);
  assert.deepEqual(sh.ground, ep5Saffron.ground);
  assert.equal(await registerMaps(), r, 'idempotent');
});

test('an Episode 5 credits fixture reaches ep6_morning with EP6_LIVE on, and not with it off; never Fine Print, never an Episode 4 save, never twice', async () => {
  await registerMaps();
  const flags = await creditsFlags();
  assert.ok(flags.includes('ep5_complete'));
  const wake = peekMap('ep5_sh_inn').events.find((e) => e.id === 'ep6_wake');
  assert.deepEqual([wake.type, wake.script], ['trigger', 'ep6_morning']);
  assert.ok(present(wake, new Set(flags)), 'the wake trigger is present for the credits fixture');
  assert.ok(!present(wake, new Set([...flags, 'ep6_morning_done'])), 'and gone once the morning has played');
  assert.ok(!present(wake, new Set(flags.filter((f) => f !== 'ep5_complete'))), 'an Episode 4 save (no ep5_complete) has no wake trigger');
  const was = GATE.live;
  try {
    GATE.live = true;
    const on = await runOnce(scenes.ep6_morning, { flags, branchFlags: false, mapId: 'ep5_sh_inn' });
    const set = on.log.filter((e) => e.op === 'setFlag').map((e) => e.args[0]);
    assert.ok(set.includes('ep6_started') && set.includes('ep6_morning_done'), `live: the morning plays (${set})`);
    assert.ok(on.log.some((e) => e.op === 'give' && e.args[0] === 'boarding_slip'));
    const tier = await runOnce(scenes.ep6_morning, { flags: [...flags, 'tier_1'], branchFlags: false });
    assert.equal(ran(tier.log), 0, 'a Fine Print (tier_1) save never starts Episode 6');
    const ep4 = await runOnce(scenes.ep6_morning, { flags: flags.filter((f) => f !== 'ep5_complete'), branchFlags: false });
    assert.equal(ran(ep4.log), 0, 'an Episode 4 save (no ep5_complete) never starts Episode 6');
    const twice = await runOnce(scenes.ep6_morning, { flags: [...flags, 'ep6_morning_done', 'ep6_started'], branchFlags: false });
    assert.equal(ran(twice.log), 0, 'the morning runs once');
    GATE.live = false;
    const off = await runOnce(scenes.ep6_morning, { flags, branchFlags: false });
    assert.equal(ran(off.log), 0, 'switch off: nothing runs');
  } finally { GATE.live = was; }
  assert.deepEqual([SCENE_CONDITIONS.ep6_morning.ifNot].flat().sort(), ['ep6_morning_done', 'tier_1']);
  assert.equal(SCENE_CONDITIONS.ep6_morning.live, true);
});

test('plan 3.4 with the real patches: no ship, gangway, trigger or door before Episode 6; the berth doors land on open ground', async () => {
  await registerMaps();
  const db = await loadDb();
  const sh = peekMap('ep5_saffron');
  const flags = new Set(await creditsFlags());
  // nothing sets ep6_started while the switch is off (only ep6_morning does, and it needs the switch): no ship, no berth
  for (const id of ['ship_moored', 'sky_berth', 'sky_berth_trig', 'berth_north']) {
    assert.ok(!present(sh.events.find((e) => e.id === id), flags), `${id} absent before Episode 6`);
  }
  const started = new Set([...flags, 'ep6_started']);
  for (const id of ['ship_moored', 'sky_berth', 'sky_berth_trig']) assert.ok(present(sh.events.find((e) => e.id === id), started), `${id} present once started`);
  assert.ok(!present(sh.events.find((e) => e.id === 'berth_north'), started), 'the boat door waits for ep6_boarded');
  const walkable = (mapId, x, y, f) => {
    const g = buildGrid({ ...withFlags(peekMap(mapId), new Set(f)), events: [] }, db);
    return g.code[y][x] === 'none';
  };
  const north = sh.events.find((e) => e.id === 'berth_north').to;
  assert.deepEqual(north.slice(0, 3), ['ep6_airstair', 12, 43]);
  assert.ok(walkable(north[0], north[1], north[2], [...started, 'ep6_boarded']), `berth_north lands on ${north}`);
  const back = peekMap('ep6_airstair').events.find((e) => e.id === 'stack_boat').to;
  assert.deepEqual(back.slice(0, 3), ['ep5_saffron', 10, 27]);
  assert.ok(walkable(back[0], back[1], back[2], [...started, 'ep6_boarded', 'airstair_arrived']), 'the boat home lands on the quay');
  // the gangway: the berth object, its step trigger and the boat door share the one cell
  const cells = sh.events.filter((e) => ['sky_berth', 'sky_berth_trig', 'berth_north'].includes(e.id)).map((e) => [e.x, e.y].join(','));
  assert.equal(new Set(cells).size, 1);
});

test('a save made on a lane cell after a blocked stop reloads on that cell with the authored lanes, the party able to step off', async () => {
  // The real F2: Vex's duct (23,2..3) blows up into the crown room's wall, so a ride on it stops blocked on (23,2). The FieldScene
  // behaviour of a reload on such a cell (no ride on load, stepping off) is ep6_wind.test.mjs's, on the test map; here, the real
  // map: the stop is where a reload would put the party, the authored lanes (vanes reset, no save field) keep it live, and
  // ground beside it lets the party step off.
  const m = compile(obsF2);
  const A = live(m, 0);
  const db = await loadDb();
  const grid = buildGrid({ ...withFlags(obsF2, new Set(['ep6_started', 'obs_f2_arrived'])), events: [] }, db);
  const blocked = (x, y, lane) => !lane && grid.code[y][x] !== 'none';
  const start = [23, 3];
  assert.ok(A[start[1] * m.W + start[0]] >= 0, 'Vex\'s duct is live in the authored state');
  const r = follow(m, 0, start, blocked);
  assert.equal(r.stop, 'blocked');
  const stop = r.path[r.path.length - 1];
  assert.deepEqual(stop, [23, 2]);
  const g = newGameEp6('Arden', { slot: 1 });
  g.flags.obs_f2_arrived = true;
  g.map = 'ep6_obs_f2'; g.pos = { x: stop[0], y: stop[1], dir: 'up' };
  const back = deserialize(serialize(g));
  assert.deepEqual([back.map, back.pos.x, back.pos.y], ['ep6_obs_f2', 23, 2], 'the save reloads on the lane cell');
  assert.ok(!JSON.stringify(serialize(g)).match(/"wind"|"vane|"turned"/), 'no new save field: the lanes come back authored');
  assert.ok(live(m, 0)[stop[1] * m.W + stop[0]] >= 0, 'the cell is live in the authored lanes the reload brings');
  const off = [[1, 0], [-1, 0], [0, 1]].map(([dx, dy]) => [stop[0] + dx, stop[1] + dy]).filter(([x, y]) => grid.code[y][x] === 'none' && A[y * m.W + x] < 0);
  assert.ok(off.length > 0, `ground beside the stop to step off onto (${JSON.stringify(off)})`);
});

test('an Episode 6 save made mid-Observatory reloads with every vane authored and every opened door open', () => {
  const g = newGameEp6('Arden', { slot: 1 });
  for (const f of ['ep6_started', 'windward_pass', 'obs_entered', 'obs_f1_arrived', 'obs_f1_done', 'obs_f2_arrived', 'engine_defeated', 'obs_f2_done',
    'aeris_came', 'pledge_anchor', 'pledge_listen', 'pledge_return', 'pippa_found', 'scribe_door_open']) g.flags[f] = true;
  markOpened(g, 'ep6_obs_f3', 'door_scribe');
  markOpened(g, 'ep6_obs_f1', 'crate_d');
  g.map = 'ep6_obs_f3'; g.pos = { x: 22, y: 3, dir: 'up' };
  const back = deserialize(serialize(g));
  for (const [map, id] of [['ep6_obs_f3', 'door_scribe'], ['ep6_obs_f1', 'crate_d']]) assert.ok(isOpened(back, map, id), `${map}:${id}`);
  // every floor compiles to its authored lanes on every arrival: no group turned, whatever was turned before the save
  for (const mod of [obsF1, obsF2, obsF3]) {
    const c = compile(mod);
    assert.ok(c && c.groups.length >= 1, `${mod.id} has vane groups`);
    assert.deepEqual([...live(c, maskOf(c, { turned: [] }))], [...c.base], `${mod.id}: a fresh arrival is the authored lanes`);
  }
});

test('the Sky Compass Keyhole opens with its own art (GATE_SPRITES.sky_keyhole), as the Sun Keyhole does', async () => {
  await import('../../src/data/ep6/field/events.js');
  assert.deepEqual(GATE_SPRITES.sky_keyhole, ['sky_keyhole_closed', 'sky_keyhole_open']);
  const door = obsF3.events.find((e) => e.id === 'door_scribe');
  assert.equal(door.sprite, 'sky_keyhole');
  assert.equal(door.key, 'compass_key');
});
