// The field guard and the late-ready rebuild (src/world/maps.js): a prefixed map and a touched map both ask their pack first;
// a touched map cached before the pack was ready is rebuilt (re-imported) on its next load. One process per scenario family
// (module state is shared), so the failure paths are in pack_maps_fail.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadMap, peekMap, staleMaps } from '../../src/world/maps.js';
import { setPackDefaults, packReady, ensurePack } from '../../src/game/packs.js';

const imported = [];
const importer = async (entry) => { imported.push(entry); return { register: async () => ({ id: 'stub', loaded: [], skipped: [] }) }; };
const on = { enabled: true, importer, quiet: true, warm: false, packFiles: null, retryMs: 100000 };

test('switched off: loadMap behaves exactly as before and never touches a pack', async () => {
  setPackDefaults({ ...on, enabled: false });
  const a = await loadMap('east_road');          // a touched map of x2, loaded while the pack is off
  assert.equal(a.id, 'east_road');
  assert.equal((await loadMap('inn')).id, 'inn');
  assert.equal(await loadMap('x1_downs'), null, 'a prefixed map that has no file is simply absent');
  assert.deepEqual(imported, [], 'no pack was fetched');
  assert.deepEqual(staleMaps(), []);
  globalThis.__east_a = a;
});

test('the guard fires for a prefixed map and for a touched map, and a map with no pack does not', async () => {
  setPackDefaults(on);
  assert.equal((await loadMap('inn')).id, 'inn');
  assert.deepEqual(imported, [], 'inn belongs to no pack');
  const v = await loadMap('valley');
  assert.equal(v.id, 'valley');
  assert.deepEqual(imported, ['../data/x1/index.js'], 'a touched map asked for x1 first');
  assert.equal(packReady('x1'), true);
  assert.equal(await loadMap('x1_downs'), null, 'a prefixed map waits for the (ready) pack, then finds no file');
  assert.deepEqual(imported, ['../data/x1/index.js'], 'x1 loaded once');
  assert.deepEqual(staleMaps(), [], 'valley loaded after the pack was ready: nothing to rebuild');
});

test('late-ready: a touched map cached before its pack was ready is rebuilt on its next load, and peekMap keeps the old one meanwhile', async () => {
  const a = globalThis.__east_a;
  assert.equal(peekMap('east_road'), a);
  assert.equal(packReady('x2'), false);
  setPackDefaults(on);
  const r = await ensurePack('x2');
  assert.equal(r.ok, true);
  assert.deepEqual(staleMaps(), ['east_road'], 'only the touched map that was already cached is stale');
  assert.equal(peekMap('east_road'), a, 'the module being played is not pulled away');
  const b = await loadMap('east_road');
  assert.notEqual(b, a, 'the next transition re-imports the module (?v=1), so x2On()-gated edits are evaluated again');
  assert.equal(b.id, 'east_road');
  assert.deepEqual(staleMaps(), []);
  assert.equal(await loadMap('east_road'), b, 'and it is cached again');
  assert.equal(peekMap('east_road'), b);
  // a touched map that was never cached is not "stale": it simply loads patched
  assert.equal((await loadMap('court_f1')).id, 'court_f1');
  assert.deepEqual(staleMaps(), []);
});
