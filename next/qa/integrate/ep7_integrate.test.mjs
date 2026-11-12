// E7-integrate (EPISODE7_PLAN 3.4, 10, 12): the test E7-pack left pending (qa/core/ep7_maps_order.test.mjs, plan 3.4 with the
// real patches), turned on now that the story, the patches, the maps and the field code exist, plus the order trap with both
// real packs (no stand-ins), the seams this wave closed (the nave door lands on the ending's mark; Piri never hands over a second
// White Road letter) and the mid-Vault reload. Pure node: no browser. Its own file: the map registries are memoized per process.
import test from 'node:test';
import assert from 'node:assert/strict';
import { peekMap } from '../../src/world/maps.js';
import ep6Inn from '../../src/data/maps/ep6_zl_inn.js';
import ep6Charts from '../../src/data/maps/ep6_zl_charts.js';
import ep6Zephyr from '../../src/data/maps/ep6_zephyr.js';
import { register as registerMaps, mapReport, EP7_MAP_IDS } from '../../src/data/ep7/maps.js';
import { register as registerEp7 } from '../../src/data/ep7/index.js';
import { scenes, GATE, SCENE_CONDITIONS, CHARTS_STAGE } from '../../src/data/ep7/story.js';
import { scenes as scenes6 } from '../../src/data/ep6/story.js';
import { newGameEp7 } from '../../src/data/ep7/start.js';
import { serialize, deserialize, markOpened, isOpened } from '../../src/game/state.js';
import { compile, initial, held } from '../../src/data/ep7/field/remember.js';
import { loadDb, buildGrid, withFlags, present } from '../../tools/maps/mapcheck.mjs';
import { runOnce } from '../content/_harness.mjs';
import vaultF1 from '../../src/data/maps/ep7_vault_f1.js';
import vaultF2 from '../../src/data/maps/ep7_vault_f2.js';
import vaultF3 from '../../src/data/maps/ep7_vault_f3.js';
import palehaven from '../../src/data/maps/ep7_palehaven.js';
import stillheart from '../../src/data/maps/ep7_stillheart.js';

const ran = (log) => log.filter((e) => e.op !== 'hasFlag').length;
let credits = null;   // Episodes 1 to 6 done, ep7 not begun (the quick start's flags are an Episode 6 credits save's)
async function creditsFlags() {
  if (!credits) {
    await registerEp7();
    const g = newGameEp7('Arden');
    credits = Object.keys(g.flags).filter((f) => g.flags[f] && !['ep7_started', 'ep7_morning_done'].includes(f));
  }
  return credits;
}
const walkable = (db, mapId, x, y, f) => {
  const g = buildGrid({ ...withFlags(peekMap(mapId), new Set(f)), events: [] }, db);
  return g.code[y][x] === 'none';
};

test('order trap, both real packs: the ep6 maps register first, then the real ep7 patches land on their modules', async () => {
  const r = await registerMaps();
  assert.deepEqual(r.patched.sort(), ['ep6_zephyr', 'ep6_zl_charts', 'ep6_zl_inn']);
  assert.deepEqual(r.loaded, EP7_MAP_IDS, `every Episode 7 map module loads (skipped ${r.skipped})`);
  assert.equal(r.skipped.length, 0);
  assert.equal(mapReport().patchFile, true);
  const inn = peekMap('ep6_zl_inn'), charts = peekMap('ep6_zl_charts'), zl = peekMap('ep6_zephyr');
  for (const [m, base] of [[inn, ep6Inn], [charts, ep6Charts], [zl, ep6Zephyr]]) {
    assert.notEqual(m, base);
    for (const e of base.events) assert.ok(m.events.includes(e), `${base.id}: kept ${e.id}`);
    for (const [k, v] of Object.entries(base.marks || {})) assert.deepEqual(m.marks[k], v, `${base.id}: mark ${k}`);
  }
  assert.ok(inn.events.some((e) => e.id === 'ep7_wake' && e.script === 'ep7_morning' && e.on === 'enter'));
  assert.ok(charts.events.some((e) => e.id === 'ep7_wake_charts' && e.script === 'ep7_morning' && e.on === 'enter'));
  assert.deepEqual(charts.marks.charts_dawn, CHARTS_STAGE, 'the morning stages on the patch mark');
  for (const id of ['north_gangway', 'north_gangway_trig', 'berth_white_road']) assert.ok(zl.events.some((e) => e.id === id), id);
  assert.equal(await registerMaps(), r, 'idempotent');
});

test('an Episode 6 credits fixture reaches ep7_morning with EP7_LIVE on, and not with it off; never Fine Print, never an Episode 5 save, never twice', async () => {
  await registerMaps();
  const flags = await creditsFlags();
  assert.ok(flags.includes('ep6_complete'));
  const wake = peekMap('ep6_zl_inn').events.find((e) => e.id === 'ep7_wake');
  assert.ok(present(wake, new Set(flags)), 'the wake trigger is present for the credits fixture');
  assert.ok(!present(wake, new Set([...flags, 'ep7_morning_done'])), 'and gone once the morning has played');
  assert.ok(!present(wake, new Set(flags.filter((f) => f !== 'ep6_complete'))), 'an Episode 5 save (no ep6_complete) has no wake trigger');
  const was = GATE.live;
  try {
    GATE.live = true;
    const inn = await runOnce(scenes.ep7_morning, { flags, branchFlags: false, mapId: 'ep6_zl_inn' });
    assert.deepEqual(inn.log.find((e) => e.op === 'warp').args, ['ep6_zl_charts', ...CHARTS_STAGE, 'up'], 'from the inn: to the Chart Room');
    assert.ok(!inn.log.some((e) => e.op === 'setFlag'), 'and sets nothing there');
    const on = await runOnce(scenes.ep7_morning, { flags, branchFlags: false, mapId: 'ep6_zl_charts' });
    const set = on.log.filter((e) => e.op === 'setFlag').map((e) => e.args[0]);
    assert.ok(set.includes('ep7_started') && set.includes('ep7_morning_done'), `live: the morning plays (${set})`);
    const tier = await runOnce(scenes.ep7_morning, { flags: [...flags, 'tier_1'], branchFlags: false, mapId: 'ep6_zl_charts' });
    assert.equal(ran(tier.log), 0, 'a Fine Print (tier_1) save never starts Episode 7');
    const ep5 = await runOnce(scenes.ep7_morning, { flags: flags.filter((f) => f !== 'ep6_complete'), branchFlags: false, mapId: 'ep6_zl_charts' });
    assert.equal(ran(ep5.log), 0, 'an Episode 5 save (no ep6_complete) never starts Episode 7');
    const twice = await runOnce(scenes.ep7_morning, { flags: [...flags, 'ep7_morning_done', 'ep7_started'], branchFlags: false, mapId: 'ep6_zl_charts' });
    assert.equal(ran(twice.log), 0, 'the morning runs once');
    GATE.live = false;
    const off = await runOnce(scenes.ep7_morning, { flags, branchFlags: false, mapId: 'ep6_zl_charts' });
    assert.equal(ran(off.log), 0, 'switch off: nothing runs');
  } finally { GATE.live = was; }
  assert.equal(SCENE_CONDITIONS.ep7_morning.live, true);
});

test('plan 3.4 with the real patches: no gangway, trigger or door before Episode 7; the berth and the boat home land on open ground', async () => {
  await registerMaps();
  const db = await loadDb();
  const zl = peekMap('ep6_zephyr');
  const flags = new Set(await creditsFlags());
  for (const id of ['north_gangway', 'north_gangway_trig', 'berth_white_road']) {
    assert.ok(!present(zl.events.find((e) => e.id === id), flags), `${id} absent before Episode 7`);
  }
  const started = new Set([...flags, 'ep7_started']);
  for (const id of ['north_gangway', 'north_gangway_trig']) assert.ok(present(zl.events.find((e) => e.id === id), started), `${id} present once started`);
  assert.ok(!present(zl.events.find((e) => e.id === 'berth_white_road'), started), 'the boat door waits for ep7_boarded');
  const north = zl.events.find((e) => e.id === 'berth_white_road').to;
  assert.deepEqual(north.slice(0, 3), ['ep7_white_road', 15, 74]);
  assert.ok(walkable(db, north[0], north[1], north[2], [...started, 'ep7_boarded']), `berth_white_road lands on ${north}`);
  const back = peekMap('ep7_white_road').events.find((e) => e.id === 'kestrel_back').to;
  assert.deepEqual(back.slice(0, 3), ['ep6_zephyr', 22, 5]);
  assert.ok(walkable(db, back[0], back[1], back[2], [...started, 'ep7_boarded', 'road_arrived']), 'the boat home lands on the dock');
  const cells = zl.events.filter((e) => ['north_gangway', 'north_gangway_trig', 'berth_white_road'].includes(e.id)).map((e) => [e.x, e.y].join(','));
  assert.equal(new Set(cells).size, 1, 'the gangway object, its step trigger and the boat door share one cell');
});

test("seam: Palehaven's nave door lands on the Stillheart's roof mark, where ep7_ending stages the party; the square door lands on the street", async () => {
  await registerMaps();
  const db = await loadDb();
  const nave = palehaven.events.find((e) => e.id === 'nave_door').to;
  assert.deepEqual(nave.slice(0, 3), ['ep7_stillheart', ...stillheart.marks.roof]);
  const end = new Set([...(await creditsFlags()), 'phantom_defeated', 'stillheart_restored', 'page_whole', 'doors_reopened']);
  assert.ok(walkable(db, 'ep7_stillheart', nave[1], nave[2], end), 'the roof mark is open ground');
  const sq = stillheart.events.find((e) => e.id === 'square_return').to;
  assert.deepEqual(sq.slice(0, 3), ['ep7_palehaven', ...palehaven.marks.vault_door]);
  assert.ok(walkable(db, 'ep7_palehaven', sq[1], sq[2], end), 'the Vault door mark is open ground');
});

test('seam: Piri hands over the White Road letter once; a letters_done after the Episode 6 credits leaves it to ep7_morning, never a second', async () => {
  const done = ['zephyr_arrived', 'letters_started', 'letter_1_found', 'letter_2_found', 'letter_3_found'];
  const gave = (log) => log.filter((e) => e.op === 'give' && e.args[0] === 'white_road_letter').length;
  const early = await runOnce(scenes6.letters_done, { flags: done, branchFlags: false });
  assert.equal(gave(early.log), 1, 'in Episode 6: the letter');
  assert.ok(early.log.some((e) => e.op === 'setFlag' && e.args[0] === 'letters_done'));
  const late = await runOnce(scenes6.letters_done, { flags: [...done, 'ep6_complete'], branchFlags: false });
  assert.equal(gave(late.log), 0, 'after the Episode 6 credits Piri leaves it to ep7_morning: never a second letter');
  assert.ok(late.log.some((e) => e.op === 'setFlag' && e.args[0] === 'letters_done'), 'the side quest still finishes');
  const was = GATE.live;
  try {
    GATE.live = true;
    const base = (await creditsFlags()).filter((f) => f !== 'white_road_letter_get' && f !== 'letters_done');
    const morning = await runOnce(scenes.ep7_morning, { flags: base, branchFlags: false, mapId: 'ep6_zl_charts' });
    assert.equal(gave(morning.log), 1, 'ep7_morning gives it when Piri had not');
    const had = await runOnce(scenes.ep7_morning, { flags: [...base, 'white_road_letter_get'], branchFlags: false, mapId: 'ep6_zl_charts' });
    assert.equal(gave(had.log), 0, 'and not when Piri already had');
  } finally { GATE.live = was; }
});

test('an Episode 7 save made mid-Vault reloads with every stone authored and every opened door open', () => {
  const g = newGameEp7('Arden', { slot: 1 });
  for (const f of ['ep7_started', 'road_arrived', 'palehaven_arrived', 'met_keeper', 'keeper_told', 'vault_open', 'vault_entered', 'vault_f1_arrived',
    'vault_f1_done', 'vault_f2_arrived', 'lantern_defeated', 'vault_f2_done', 'vault_f3_arrived', 'keeper_memory_3']) g.flags[f] = true;
  markOpened(g, 'ep7_vault_f1', 'chest_key');
  markOpened(g, 'ep7_vault_f1', 'crate_e');
  g.items.stillheart_key = 1;
  g.map = 'ep7_vault_f3'; g.pos = { x: 17, y: 29, dir: 'up' };
  const back = deserialize(serialize(g));
  for (const [map, id] of [['ep7_vault_f1', 'chest_key'], ['ep7_vault_f1', 'crate_e']]) assert.ok(isOpened(back, map, id), `${map}:${id}`);
  assert.ok(!JSON.stringify(serialize(g)).match(/"stones"|"held"|"remember"/), 'no new save field: the stones come back authored');
  for (const mod of [vaultF1, vaultF2, vaultF3]) {
    const m = compile(mod);
    assert.ok(m, `${mod.id} has a remember block`);
    assert.deepEqual(held(m, initial(m)), [...(mod.remember.start || [])], `${mod.id}: a fresh arrival holds the authored start`);
  }
});
