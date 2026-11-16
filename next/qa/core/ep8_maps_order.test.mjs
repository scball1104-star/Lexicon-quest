// E8-pack (EPISODE8_PLAN 3.3, the order trap): the ep8 pack patches `ep7_ph_watch` and `ep7_stillheart` only on top of the
// modules the ep7 pack registered. With the ep7 pack alone the two maps are exactly as Episode 7 shipped; with both packs they
// are patched, and a second ep7 (or ep6) register() does not wash the patch away. Both orders are tried: the ep7 registry first
// and then ep8, and ep8's register() called while ep7's has not run (it awaits ep7's itself). Its own file: maps.register() is
// memoized per process.
import test from 'node:test';
import assert from 'node:assert/strict';
import { peekMap, registerMap } from '../../src/world/maps.js';
import * as ep7Maps from '../../src/data/ep7/maps.js';
import * as ep6Maps from '../../src/data/ep6/maps.js';
import ep7Watch from '../../src/data/maps/ep7_ph_watch.js';
import ep7Stillheart from '../../src/data/maps/ep7_stillheart.js';
import { register as registerMaps, applyPatch, EP8_MAP_IDS, PATCHES, PATCH_FILE, prefetch, mapReport } from '../../src/data/ep8/maps.js';

// Stand-ins for ep8_patches.js (E8-maps-a, wave 8c): the shape the real ones have (a pure function of the registered module).
const mark = (id, extra) => (base) => (base.events || []).some((e) => e.id === id) ? base
  : { ...base, events: [...base.events, { id, x: 0, y: 0, w: 1, h: 1, ...extra }] };
const FAKE_PATCHES = { withEp8Wake: mark('test_ep8_wake', { type: 'trigger', script: 'ep8_morning', on: 'enter' }),
  withStairDoor: mark('test_stair_up', { type: 'door', to: ['ep8_stair', 'stair_bottom'], if: 'ep8_roofed' }) };
const notFound = (p) => Object.assign(new Error(`Cannot find module '${p}' imported from maps.js`), { code: 'ERR_MODULE_NOT_FOUND' });
const ORIG = { ep7_ph_watch: ep7Watch, ep7_stillheart: ep7Stillheart };
const EVENT = { ep7_ph_watch: 'test_ep8_wake', ep7_stillheart: 'test_stair_up' };

test('the map list is the eleven ids of plan 2.1, and the two patches of plan 3 are named', () => {
  assert.deepEqual(EP8_MAP_IDS, ['ep8_stair', 'ep8_scriptorium', 'ep8_sc_inn', 'ep8_sc_shop', 'ep8_sc_atelier', 'ep8_sc_index',
    'ep8_library_f1', 'ep8_library_f2', 'ep8_library_f3', 'ep8_last_word', 'ep8_bell_night']);
  assert.deepEqual(PATCHES, { ep7_ph_watch: 'withEp8Wake', ep7_stillheart: 'withStairDoor' });
  assert.equal(PATCH_FILE, '../maps/ep8_patches.js');
  for (const id of EP8_MAP_IDS) assert.match(id, /^ep8_/, 'every map id carries the pack prefix');
});

test('prefetch is a no-op in Node and with a test importer (nothing to fetch, nothing absent)', async () => {
  assert.equal((await prefetch({ importer: () => null })).size, 0);
  assert.equal((await prefetch()).size, 0);
});

test('before the ep7 pack registers there is nothing to patch (the trap: a patch first would be overwritten)', () => {
  for (const id of Object.keys(PATCHES)) {
    assert.equal(peekMap(id), null, `${id} is not registered yet`);
    assert.equal(applyPatch(id, FAKE_PATCHES[PATCHES[id]]), false);
  }
});

test('ep8 first: register() called before the ep7 registry ran awaits it, and only then patches', async () => {
  const seen = [];
  let ep7Done = false;
  const ep7Spy = { register: async () => { seen.push('ep7.register start'); await ep7Maps.register(); ep7Done = true; seen.push('ep7.register done'); } };
  const importer = async (p) => {
    seen.push(p);
    if (p === '../ep7/maps.js') return ep7Spy;
    if (p === PATCH_FILE) return new Proxy(FAKE_PATCHES, { get: (o, k) => { if (typeof k === 'string' && k.startsWith('with')) assert.ok(ep7Done, `${k} read only after ep7 registered`); return o[k]; } });
    throw notFound(`D:/x/src/data/maps/${p.slice(p.lastIndexOf('/') + 1)}`);
  };
  const r = await registerMaps(null, {}, { importer });
  assert.ok(seen.includes('../ep7/maps.js') && seen.indexOf('ep7.register done') >= 0, 'the ep7 registry was awaited');
  assert.ok(seen.includes(PATCH_FILE) && seen.includes('../maps/ep8_stair.js'), 'every ep8 file was asked for at once (the fetches overlap)');
  assert.deepEqual(r.patched.sort(), ['ep7_ph_watch', 'ep7_stillheart']);
  assert.equal(r.patchFile, true);
  assert.deepEqual(r.skipped, EP8_MAP_IDS, 'map modules that do not exist yet are skipped, not fatal');
  assert.equal(mapReport(), r);
  for (const [id, mod] of Object.entries(ORIG)) {
    const now = peekMap(id);
    assert.notEqual(now, mod);
    assert.ok(now.events.some((e) => e.id === EVENT[id]), `${id} patched`);
    for (const e of mod.events) assert.ok(now.events.includes(e), `${id}: kept ${e.id}`);   // every Episode 7 event, unchanged
    assert.deepEqual(now.marks, mod.marks, `${id}: every Episode 7 mark unchanged`);
  }
  // ep7 again (a second ensurePack, a retry) and ep6 below it do not overwrite the patch
  await ep7Maps.register();
  await ep6Maps.register();
  for (const id of Object.keys(ORIG)) assert.ok(peekMap(id).events.some((e) => e.id === EVENT[id]), `${id}: a second ep7 or ep6 register() keeps the patch`);
  assert.equal(registerMaps(), registerMaps(), 'idempotent');
});

test('the trap is real: a patch registered before the ep7 module is lost when the module registers', () => {
  for (const [id, name] of Object.entries(PATCHES)) {
    registerMap(ORIG[id]);   // what a late ep7 registration does
    assert.equal(peekMap(id), ORIG[id], `${id}: the patch is gone without a word`);
    assert.equal(applyPatch(id, FAKE_PATCHES[name]), true, 'and applying it on the registered module brings it back');
    assert.ok(peekMap(id).events.some((e) => e.id === EVENT[id]));
  }
});

test('a missing patch export is the identity (the patch file may land one export at a time)', () => {
  assert.equal(applyPatch('ep7_ph_watch', (m) => m), false, 'identity registers nothing');
  assert.equal(applyPatch('ep7_ph_watch', null), false);
});

test('a broken map module (not a missing one) is not swallowed', async () => {
  const { isMissing } = await import('../../src/data/ep8/index.js');
  assert.equal(isMissing(notFound('D:/x/src/data/maps/ep8_stair.js'), '/ep8_stair.js'), true);
  assert.equal(isMissing(notFound('D:/x/src/data/maps/_kit.js'), '/ep8_stair.js'), false, 'a missing import INSIDE the module is an error');
  assert.equal(isMissing(new SyntaxError('Unexpected token'), '/ep8_stair.js'), false);
});

// Plan 3.4's map cases with the real patches (no trigger or stair door while EP8_LIVE is off, the stair door on a walkable cell)
// need ep8_patches.js (E8-maps-a, wave 8c) and the field system: E8-integrate turns them on in qa/integrate/ep8_*.
test('plan 3.4 with the real patches', { skip: 'needs src/data/maps/ep8_patches.js (E8-maps-a, wave 8c); E8-integrate turns it on' }, () => {});
