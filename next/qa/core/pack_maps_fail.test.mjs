// The field guard when a pack does not arrive (src/world/maps.js): a prefixed map is not reachable, a touched map loads
// unpatched, and neither waits longer than the 1.5 s ceiling, whether the import fails or hangs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadMap } from '../../src/world/maps.js';
import { setPackDefaults, packReady, GUARD_MS } from '../../src/game/packs.js';

const base = { enabled: true, quiet: true, warm: false, packFiles: null, retryMs: 100000 };

// The clocks below time the GUARD (the wait for a pack), not a cold import of the map file that follows it. Under a
// busy CPU that first import alone took 1.5 s (waited 3076 ms against 1500 + 600, issue #76), so the two maps the
// tests load are imported once up front; loadMap's own import then hits the module cache.
await import('../../src/data/maps/willowmere.js');
await import('../../src/data/maps/east_road.js');

test('the import fails: a prefixed map is not reachable, a touched map loads unpatched, quickly', async () => {
  let n = 0;
  setPackDefaults({ ...base, importer: async () => { n++; throw new Error('offline'); } });
  const t0 = Date.now();
  assert.equal(await loadMap('x1_downs'), null);
  const w = await loadMap('willowmere');
  assert.equal(w.id, 'willowmere', 'the town still loads');
  assert.ok(Date.now() - t0 < GUARD_MS + 500);
  assert.equal(packReady('x1'), false);
  assert.ok(n >= 2, 'every call retried the pack (the next call is a retry)');
});

test('the import hangs: the guard gives up at its 1.5 s ceiling', async () => {
  setPackDefaults({ ...base, importer: () => new Promise(() => {}) });
  const t0 = Date.now();
  const e = await loadMap('east_road');
  const dt = Date.now() - t0;
  assert.equal(e.id, 'east_road', 'a touched map loads unpatched');
  assert.ok(dt >= GUARD_MS - 100 && dt < GUARD_MS + 600, `waited ${dt} ms`);
  const t1 = Date.now();
  assert.equal(await loadMap('x2_quarry'), null, 'a prefixed map is not reachable');
  assert.ok(Date.now() - t1 < GUARD_MS + 600);
});
