// E6-pack (EPISODE6_PLAN 3.3, the order trap): the ep6 pack patches `ep5_sh_inn` and `ep5_saffron` only on top of the modules
// the ep5 pack registered. With the ep5 pack alone both maps are exactly as Episode 5 shipped; with both packs they are patched,
// and a second ep5 (or ep4) register() does not wash the patch away. Its own file: maps.register() is memoized per process.
import test from 'node:test';
import assert from 'node:assert/strict';
import { peekMap, registerMap } from '../../src/world/maps.js';
import * as ep5Maps from '../../src/data/ep5/maps.js';
import * as ep4Maps from '../../src/data/ep4/maps.js';
import ep5Inn from '../../src/data/maps/ep5_sh_inn.js';
import ep5Saffron from '../../src/data/maps/ep5_saffron.js';
import { register as registerMaps, applyPatch, EP6_MAP_IDS, PATCHES, PATCH_FILE, prefetch } from '../../src/data/ep6/maps.js';

// Stand-ins for ep6_patches.js (E6-maps-a, wave 6c): the shape the real ones have (a pure function of the registered module).
const mark = (id, script) => (base) => (base.events || []).some((e) => e.id === id) ? base
  : { ...base, events: [...base.events, { id, type: 'trigger', x: 0, y: 0, w: 1, h: 1, script, on: 'enter' }] };
const FAKE_PATCHES = { withEp6Wake: mark('test_ep6_wake', 'ep6_morning'), withSkyBerth: mark('test_sky_berth', 'ep6_board') };
const notFound = (p) => Object.assign(new Error(`Cannot find module '${p}' imported from maps.js`), { code: 'ERR_MODULE_NOT_FOUND' });

test('the map list is the eleven ids of plan 2.1, and the two patches are named', () => {
  assert.deepEqual(EP6_MAP_IDS, ['ep6_airstair', 'ep6_zephyr', 'ep6_zl_inn', 'ep6_zl_shop', 'ep6_zl_workshop', 'ep6_zl_charts',
    'ep6_obs_f1', 'ep6_obs_f2', 'ep6_obs_f3', 'ep6_obs_eyrie', 'ep6_library']);
  assert.deepEqual(PATCHES, { ep5_sh_inn: 'withEp6Wake', ep5_saffron: 'withSkyBerth' });
  assert.equal(PATCH_FILE, '../maps/ep6_patches.js');
  for (const id of EP6_MAP_IDS) assert.match(id, /^ep6_/, 'every map id carries the pack prefix');
});

test('prefetch is a no-op in Node and with a test importer (nothing to fetch, nothing absent)', async () => {
  assert.equal((await prefetch({ importer: () => null })).size, 0);
  assert.equal((await prefetch()).size, 0);
});

test('before the ep5 pack registers there is nothing to patch (the trap: a patch first would be overwritten)', () => {
  assert.equal(peekMap('ep5_sh_inn'), null);
  assert.equal(applyPatch('ep5_sh_inn', FAKE_PATCHES.withEp6Wake), false);
});

test('ep5 pack only: ep5_sh_inn and ep5_saffron are exactly the Episode 5 modules', async () => {
  await ep5Maps.register();
  assert.equal(peekMap('ep5_sh_inn'), ep5Inn);
  assert.equal(peekMap('ep5_saffron'), ep5Saffron);
});

test('the trap is real: a patch registered before the ep5 module is lost when the module registers', () => {
  assert.equal(applyPatch('ep5_sh_inn', FAKE_PATCHES.withEp6Wake), true);
  assert.ok(peekMap('ep5_sh_inn').events.some((e) => e.id === 'test_ep6_wake'));
  registerMap(ep5Inn);   // what a late ep5 registration does
  assert.equal(peekMap('ep5_sh_inn'), ep5Inn, 'the patch is gone without a word');
  assert.ok(!peekMap('ep5_sh_inn').events.some((e) => e.id === 'test_ep6_wake'));
});

test('both packs: the ep6 maps registry awaits the ep5 registry first, then patches the registered modules; ep5 again keeps it', async () => {
  const seen = [];
  const importer = async (p) => {
    seen.push(p);
    if (p === '../ep5/maps.js') return ep5Maps;
    if (p === PATCH_FILE) return FAKE_PATCHES;
    throw notFound(`D:/x/src/data/maps/${p.slice(p.lastIndexOf('/') + 1)}`);
  };
  const r = await registerMaps(null, {}, { importer });
  assert.equal(seen[0], '../ep5/maps.js', 'the ep5 registry is awaited before anything else');
  assert.deepEqual(r.patched.sort(), ['ep5_saffron', 'ep5_sh_inn']);
  assert.equal(r.patchFile, true);
  assert.deepEqual(r.skipped, EP6_MAP_IDS, 'map modules that do not exist yet are skipped, not fatal');
  const inn = peekMap('ep5_sh_inn'), sh = peekMap('ep5_saffron');
  assert.notEqual(inn, ep5Inn);
  assert.ok(inn.events.some((e) => e.id === 'test_ep6_wake'));
  assert.ok(sh.events.some((e) => e.id === 'test_sky_berth'));
  // every Episode 5 event and mark is still there, unchanged
  for (const e of ep5Inn.events) assert.ok(inn.events.includes(e), `kept ${e.id}`);
  for (const e of ep5Saffron.events) assert.ok(sh.events.includes(e), `kept ${e.id}`);
  assert.deepEqual(inn.marks, ep5Inn.marks);
  assert.deepEqual(sh.marks, ep5Saffron.marks);
  await ep5Maps.register();
  await ep4Maps.register();
  assert.ok(peekMap('ep5_sh_inn').events.some((e) => e.id === 'test_ep6_wake'), 'a second ep5 or ep4 register() does not overwrite the patch');
  assert.ok(peekMap('ep5_saffron').events.some((e) => e.id === 'test_sky_berth'));
  assert.equal(registerMaps(), registerMaps(), 'idempotent');
});

test('a broken map module (not a missing one) is not swallowed', async () => {
  const { isMissing } = await import('../../src/data/ep6/index.js');
  assert.equal(isMissing(notFound('D:/x/src/data/maps/ep6_zephyr.js'), '/ep6_zephyr.js'), true);
  assert.equal(isMissing(notFound('D:/x/src/data/maps/_kit.js'), '/ep6_zephyr.js'), false, 'a missing import INSIDE the module is an error');
  assert.equal(isMissing(new SyntaxError('Unexpected token'), '/ep6_zephyr.js'), false);
});

// Plan 3.4's map cases with the real patches (no trigger or ship while EP6_LIVE is off, the berth doors land on open ground)
// are in qa/integrate/ep6_integrate.test.mjs (E6-integrate), with the real patches and maps.
