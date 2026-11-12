// E7-pack (EPISODE7_PLAN 3.3, the order trap): the ep7 pack patches `ep6_zl_inn`, `ep6_zl_charts` and `ep6_zephyr` only on top of
// the modules the ep6 pack registered. With the ep6 pack alone the three maps are exactly as Episode 6 shipped; with both packs
// they are patched, and a second ep6 (or ep5) register() does not wash the patch away. Its own file: maps.register() is memoized
// per process.
import test from 'node:test';
import assert from 'node:assert/strict';
import { peekMap, registerMap } from '../../src/world/maps.js';
import * as ep6Maps from '../../src/data/ep6/maps.js';
import * as ep5Maps from '../../src/data/ep5/maps.js';
import ep6Inn from '../../src/data/maps/ep6_zl_inn.js';
import ep6Charts from '../../src/data/maps/ep6_zl_charts.js';
import ep6Zephyr from '../../src/data/maps/ep6_zephyr.js';
import { register as registerMaps, applyPatch, EP7_MAP_IDS, PATCHES, PATCH_FILE, prefetch, mapReport } from '../../src/data/ep7/maps.js';

// Stand-ins for ep7_patches.js (E7-maps-a, wave 7c): the shape the real ones have (a pure function of the registered module).
const mark = (id, script) => (base) => (base.events || []).some((e) => e.id === id) ? base
  : { ...base, events: [...base.events, { id, type: 'trigger', x: 0, y: 0, w: 1, h: 1, script, on: 'enter' }] };
const FAKE_PATCHES = { withEp7Wake: mark('test_ep7_wake', 'ep7_morning'), withEp7Charts: mark('test_ep7_charts', 'ep7_morning'),
  withNorthBerth: mark('test_north_gangway', 'ep7_board') };
const notFound = (p) => Object.assign(new Error(`Cannot find module '${p}' imported from maps.js`), { code: 'ERR_MODULE_NOT_FOUND' });
const ORIG = { ep6_zl_inn: ep6Inn, ep6_zl_charts: ep6Charts, ep6_zephyr: ep6Zephyr };
const EVENT = { ep6_zl_inn: 'test_ep7_wake', ep6_zl_charts: 'test_ep7_charts', ep6_zephyr: 'test_north_gangway' };

test('the map list is the eleven ids of plan 2.1, and the three patches of plan 3 are named', () => {
  assert.deepEqual(EP7_MAP_IDS, ['ep7_white_road', 'ep7_waystation', 'ep7_palehaven', 'ep7_ph_inn', 'ep7_ph_shop', 'ep7_ph_armory',
    'ep7_ph_watch', 'ep7_vault_f1', 'ep7_vault_f2', 'ep7_vault_f3', 'ep7_stillheart']);
  assert.deepEqual(PATCHES, { ep6_zl_inn: 'withEp7Wake', ep6_zl_charts: 'withEp7Charts', ep6_zephyr: 'withNorthBerth' });
  assert.equal(PATCH_FILE, '../maps/ep7_patches.js');
  for (const id of EP7_MAP_IDS) assert.match(id, /^ep7_/, 'every map id carries the pack prefix');
});

test('prefetch is a no-op in Node and with a test importer (nothing to fetch, nothing absent)', async () => {
  assert.equal((await prefetch({ importer: () => null })).size, 0);
  assert.equal((await prefetch()).size, 0);
});

test('before the ep6 pack registers there is nothing to patch (the trap: a patch first would be overwritten)', () => {
  for (const id of Object.keys(PATCHES)) {
    assert.equal(peekMap(id), null, `${id} is not registered yet`);
    assert.equal(applyPatch(id, FAKE_PATCHES[PATCHES[id]]), false);
  }
});

test('ep6 pack only: ep6_zl_inn, ep6_zl_charts and ep6_zephyr are exactly the Episode 6 modules', async () => {
  await ep6Maps.register();
  for (const [id, mod] of Object.entries(ORIG)) assert.equal(peekMap(id), mod, `${id} unpatched`);
});

test('the trap is real: a patch registered before the ep6 module is lost when the module registers', () => {
  for (const [id, name] of Object.entries(PATCHES)) {
    assert.equal(applyPatch(id, FAKE_PATCHES[name]), true);
    assert.ok(peekMap(id).events.some((e) => e.id === EVENT[id]));
    registerMap(ORIG[id]);   // what a late ep6 registration does
    assert.equal(peekMap(id), ORIG[id], `${id}: the patch is gone without a word`);
  }
});

test('both packs: the ep7 maps registry awaits the ep6 registry first, then patches the registered modules; ep6 again keeps it', async () => {
  const seen = [];
  const importer = async (p) => {
    seen.push(p);
    if (p === '../ep6/maps.js') return ep6Maps;
    if (p === PATCH_FILE) return FAKE_PATCHES;
    throw notFound(`D:/x/src/data/maps/${p.slice(p.lastIndexOf('/') + 1)}`);
  };
  const r = await registerMaps(null, {}, { importer });
  assert.equal(seen[0], '../ep6/maps.js', 'the ep6 registry is awaited before anything else');
  assert.deepEqual(r.patched.sort(), ['ep6_zephyr', 'ep6_zl_charts', 'ep6_zl_inn']);
  assert.equal(r.patchFile, true);
  assert.deepEqual(r.skipped, EP7_MAP_IDS, 'map modules that do not exist yet are skipped, not fatal');
  assert.equal(mapReport(), r);
  for (const [id, mod] of Object.entries(ORIG)) {
    const now = peekMap(id);
    assert.notEqual(now, mod);
    assert.ok(now.events.some((e) => e.id === EVENT[id]), `${id} patched`);
    for (const e of mod.events) assert.ok(now.events.includes(e), `${id}: kept ${e.id}`);   // every Episode 6 event, unchanged
    assert.deepEqual(now.marks, mod.marks, `${id}: every Episode 6 mark unchanged`);
  }
  await ep6Maps.register();
  await ep5Maps.register();
  for (const id of Object.keys(ORIG)) assert.ok(peekMap(id).events.some((e) => e.id === EVENT[id]), `${id}: a second ep6 or ep5 register() does not overwrite the patch`);
  assert.equal(registerMaps(), registerMaps(), 'idempotent');
});

test('a missing patch export is the identity (the patch file may land one export at a time)', () => {
  assert.equal(applyPatch('ep6_zl_inn', (m) => m), false, 'identity registers nothing');
  assert.equal(applyPatch('ep6_zl_inn', null), false);
});

test('a broken map module (not a missing one) is not swallowed', async () => {
  const { isMissing } = await import('../../src/data/ep7/index.js');
  assert.equal(isMissing(notFound('D:/x/src/data/maps/ep7_palehaven.js'), '/ep7_palehaven.js'), true);
  assert.equal(isMissing(notFound('D:/x/src/data/maps/_kit.js'), '/ep7_palehaven.js'), false, 'a missing import INSIDE the module is an error');
  assert.equal(isMissing(new SyntaxError('Unexpected token'), '/ep7_palehaven.js'), false);
});

// Plan 3.4's map cases with the real patches (no trigger or gangway while EP7_LIVE is off, the berth door lands on open ground)
// need ep7_patches.js (E7-maps-a, wave 7c): E7-integrate turns them on with the real patches and maps.
test('plan 3.4 with the real patches: no trigger or gangway while EP7_LIVE is off; the berth lands on a walkable cell',
  { skip: 'pending: src/data/maps/ep7_patches.js and ep7_white_road.js (E7-maps-a, wave 7c); E7-integrate turns this on' }, () => {});
