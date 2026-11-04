// E4-pack (EPISODE4_PLAN 3.3, the order trap): the ep4 pack patches `emberpeak` and `pk_inn` only on top of the modules the
// ep3 pack registered. With the ep3 pack alone both maps are exactly as Episode 3 shipped; with both packs they are patched,
// and a second ep3 register() (idempotent) does not wash the patch away. Its own file: maps.register() is memoized per process.
import test from 'node:test';
import assert from 'node:assert/strict';
import { peekMap } from '../../src/world/maps.js';
import * as ep3 from '../../src/data/maps/ep3/index.js';
import ep3Emberpeak from '../../src/data/maps/ep3/emberpeak.js';
import ep3Inn from '../../src/data/maps/ep3/pk_inn.js';
import { register as registerMaps, applyPatch, EP4_MAP_IDS, PATCHES } from '../../src/data/ep4/maps.js';

// Stand-ins for ep4_patches.js (E4-maps-a, wave 4c): the shape the real ones have (a pure function of the registered module).
const mark = (id) => (base) => (base.events || []).some((e) => e.id === id) ? base
  : { ...base, events: [...base.events, { id, type: 'trigger', x: 0, y: 0, w: 1, h: 1, script: 'ep4_morning', on: 'enter' }] };
const FAKE_PATCHES = { withEastRoad: mark('test_east_road'), withEp4Wake: mark('test_ep4_wake') };
const notFound = (p) => Object.assign(new Error(`Cannot find module '${p}' imported from maps.js`), { code: 'ERR_MODULE_NOT_FOUND' });

test('the map list is the ten ids of plan 2.1, and the two patches are named', () => {
  assert.deepEqual(EP4_MAP_IDS, ['ep4_flood_road', 'ep4_valewyn', 'ep4_vw_inn', 'ep4_vw_shop', 'ep4_vw_forge', 'ep4_vw_palace',
    'ep4_keep_f1', 'ep4_keep_f2', 'ep4_keep_f3', 'ep4_keep_crown']);
  assert.deepEqual(PATCHES, { emberpeak: 'withEastRoad', pk_inn: 'withEp4Wake' });
});

test('before the ep3 pack registers there is nothing to patch (the trap: a patch first would be overwritten)', () => {
  assert.equal(peekMap('emberpeak'), null);
  assert.equal(applyPatch('emberpeak', FAKE_PATCHES.withEastRoad), false);
});

test('ep3 pack only: emberpeak and pk_inn are exactly the Episode 3 modules', async () => {
  await ep3.register();
  assert.equal(peekMap('emberpeak'), ep3Emberpeak);
  assert.equal(peekMap('pk_inn'), ep3Inn);
});

test('both packs: the ep4 maps registry awaits ep3 first, then patches the registered modules; ep3 again keeps the patch', async () => {
  const seen = [];
  const importer = async (p) => {
    seen.push(p);
    if (p === '../maps/ep3/index.js') return ep3;
    if (p === '../maps/ep4_patches.js') return FAKE_PATCHES;
    throw notFound(`D:/x/src/data/maps/${p.slice(p.lastIndexOf('/') + 1)}`);
  };
  const r = await registerMaps(null, {}, { importer });
  assert.equal(seen[0], '../maps/ep3/index.js', 'the ep3 pack is awaited before anything else');
  assert.deepEqual(r.patched.sort(), ['emberpeak', 'pk_inn']);
  assert.deepEqual(r.skipped, EP4_MAP_IDS, 'map modules that do not exist yet are skipped, not fatal');
  const em = peekMap('emberpeak');
  assert.notEqual(em, ep3Emberpeak);
  assert.ok(em.events.some((e) => e.id === 'test_east_road'));
  assert.ok(peekMap('pk_inn').events.some((e) => e.id === 'test_ep4_wake'));
  // every Episode 3 event and mark is still there, unchanged
  for (const e of ep3Emberpeak.events) assert.ok(em.events.includes(e), `kept ${e.id}`);
  assert.deepEqual(em.marks, ep3Emberpeak.marks);
  await ep3.register();
  assert.ok(peekMap('emberpeak').events.some((e) => e.id === 'test_east_road'), 'a second ep3 register() does not overwrite the patch');
  assert.equal(registerMaps(), registerMaps(), 'idempotent');
});

test('a broken map module (not a missing one) is not swallowed', async () => {
  const { isMissing } = await import('../../src/data/ep4/index.js');
  assert.equal(isMissing(notFound('D:/x/src/data/maps/ep4_valewyn.js'), '/ep4_valewyn.js'), true);
  assert.equal(isMissing(notFound('D:/x/src/data/maps/_kit.js'), '/ep4_valewyn.js'), false, 'a missing import INSIDE the module is an error');
  assert.equal(isMissing(new SyntaxError('Unexpected token'), '/ep4_valewyn.js'), false);
});
