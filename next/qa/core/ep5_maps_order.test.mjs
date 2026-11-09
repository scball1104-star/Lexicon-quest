// E5-pack (EPISODE5_PLAN 3.3, the order trap): the ep5 pack patches `ep4_vw_inn` and `ep4_valewyn` only on top of the modules
// the ep4 pack registered. With the ep4 pack alone both maps are exactly as Episode 4 shipped; with both packs they are patched,
// and a second ep4 (or ep3) register() does not wash the patch away. Its own file: maps.register() is memoized per process.
import test from 'node:test';
import assert from 'node:assert/strict';
import { peekMap, registerMap } from '../../src/world/maps.js';
import * as ep4Maps from '../../src/data/ep4/maps.js';
import * as ep3 from '../../src/data/maps/ep3/index.js';
import ep4Inn from '../../src/data/maps/ep4_vw_inn.js';
import ep4Valewyn from '../../src/data/maps/ep4_valewyn.js';
import { register as registerMaps, applyPatch, EP5_MAP_IDS, PATCHES, PATCH_FILE, prefetch } from '../../src/data/ep5/maps.js';

// Stand-ins for ep5_patches.js (E5-maps-a, wave 5c): the shape the real ones have (a pure function of the registered module).
const mark = (id, script) => (base) => (base.events || []).some((e) => e.id === id) ? base
  : { ...base, events: [...base.events, { id, type: 'trigger', x: 0, y: 0, w: 1, h: 1, script, on: 'enter' }] };
const FAKE_PATCHES = { withEp5Wake: mark('test_ep5_wake', 'ep5_morning'), withShipBerth: mark('test_ship_berth', 'ep5_board') };
const notFound = (p) => Object.assign(new Error(`Cannot find module '${p}' imported from maps.js`), { code: 'ERR_MODULE_NOT_FOUND' });

test('the map list is the eleven ids of plan 2.1, and the two patches are named', () => {
  assert.deepEqual(EP5_MAP_IDS, ['ep5_ship', 'ep5_caravan_road', 'ep5_saffron', 'ep5_sh_inn', 'ep5_sh_shop', 'ep5_sh_smithy',
    'ep5_sh_observatory', 'ep5_lab_f1', 'ep5_lab_f2', 'ep5_lab_f3', 'ep5_lab_oracle']);
  assert.deepEqual(PATCHES, { ep4_vw_inn: 'withEp5Wake', ep4_valewyn: 'withShipBerth' });
  assert.equal(PATCH_FILE, '../maps/ep5_patches.js');
  for (const id of EP5_MAP_IDS) assert.match(id, /^ep5_/, 'every map id carries the pack prefix');
});

test('prefetch is a no-op in Node and with a test importer (nothing to fetch, nothing absent)', async () => {
  assert.equal((await prefetch({ importer: () => null })).size, 0);
  assert.equal((await prefetch()).size, 0);
});

test('before the ep4 pack registers there is nothing to patch (the trap: a patch first would be overwritten)', () => {
  assert.equal(peekMap('ep4_vw_inn'), null);
  assert.equal(applyPatch('ep4_vw_inn', FAKE_PATCHES.withEp5Wake), false);
});

test('ep4 pack only: ep4_vw_inn and ep4_valewyn are exactly the Episode 4 modules', async () => {
  await ep4Maps.register();
  assert.equal(peekMap('ep4_vw_inn'), ep4Inn);
  assert.equal(peekMap('ep4_valewyn'), ep4Valewyn);
});

test('the trap is real: a patch registered before the ep4 module is lost when the module registers', () => {
  assert.equal(applyPatch('ep4_vw_inn', FAKE_PATCHES.withEp5Wake), true);
  assert.ok(peekMap('ep4_vw_inn').events.some((e) => e.id === 'test_ep5_wake'));
  registerMap(ep4Inn);   // what a late ep4 registration does
  assert.equal(peekMap('ep4_vw_inn'), ep4Inn, 'the patch is gone without a word');
  assert.ok(!peekMap('ep4_vw_inn').events.some((e) => e.id === 'test_ep5_wake'));
});

test('both packs: the ep5 maps registry awaits the ep4 registry first, then patches the registered modules; ep4 again keeps it', async () => {
  const seen = [];
  const importer = async (p) => {
    seen.push(p);
    if (p === '../ep4/maps.js') return ep4Maps;
    if (p === PATCH_FILE) return FAKE_PATCHES;
    throw notFound(`D:/x/src/data/maps/${p.slice(p.lastIndexOf('/') + 1)}`);
  };
  const r = await registerMaps(null, {}, { importer });
  assert.equal(seen[0], '../ep4/maps.js', 'the ep4 registry is awaited before anything else');
  assert.deepEqual(r.patched.sort(), ['ep4_valewyn', 'ep4_vw_inn']);
  assert.equal(r.patchFile, true);
  assert.deepEqual(r.skipped, EP5_MAP_IDS, 'map modules that do not exist yet are skipped, not fatal');
  const inn = peekMap('ep4_vw_inn'), vw = peekMap('ep4_valewyn');
  assert.notEqual(inn, ep4Inn);
  assert.ok(inn.events.some((e) => e.id === 'test_ep5_wake'));
  assert.ok(vw.events.some((e) => e.id === 'test_ship_berth'));
  // every Episode 4 event and mark is still there, unchanged
  for (const e of ep4Inn.events) assert.ok(inn.events.includes(e), `kept ${e.id}`);
  for (const e of ep4Valewyn.events) assert.ok(vw.events.includes(e), `kept ${e.id}`);
  assert.deepEqual(inn.marks, ep4Inn.marks);
  assert.deepEqual(vw.marks, ep4Valewyn.marks);
  await ep4Maps.register();
  await ep3.register();
  assert.ok(peekMap('ep4_vw_inn').events.some((e) => e.id === 'test_ep5_wake'), 'a second ep4 or ep3 register() does not overwrite the patch');
  assert.equal(registerMaps(), registerMaps(), 'idempotent');
});

test('a broken map module (not a missing one) is not swallowed', async () => {
  const { isMissing } = await import('../../src/data/ep5/index.js');
  assert.equal(isMissing(notFound('D:/x/src/data/maps/ep5_saffron.js'), '/ep5_saffron.js'), true);
  assert.equal(isMissing(notFound('D:/x/src/data/maps/_kit.js'), '/ep5_saffron.js'), false, 'a missing import INSIDE the module is an error');
  assert.equal(isMissing(new SyntaxError('Unexpected token'), '/ep5_saffron.js'), false);
});

// Plan 3.4's map cases (with EP5_LIVE off no wake trigger fires and no ship is drawn; the berth doors land on walkable cells)
// are in qa/integrate/ep5_integrate.test.mjs (E5-integrate), with the real patches and maps.
