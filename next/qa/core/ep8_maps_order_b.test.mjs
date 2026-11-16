// E8-pack (EPISODE8_PLAN 3.3, the order trap, the other order): the ep7 pack alone registers first (the Watch and the Stillheart
// exactly as Episode 7 shipped), then the ep8 registry patches them. qa/core/ep8_maps_order.test.mjs is the ep8-first order;
// each file has its own process because maps.register() is memoized.
import test from 'node:test';
import assert from 'node:assert/strict';
import { peekMap } from '../../src/world/maps.js';
import * as ep7Maps from '../../src/data/ep7/maps.js';
import ep7Watch from '../../src/data/maps/ep7_ph_watch.js';
import ep7Stillheart from '../../src/data/maps/ep7_stillheart.js';
import { register as registerMaps, PATCH_FILE } from '../../src/data/ep8/maps.js';

const add = (id) => (base) => ({ ...base, events: [...base.events, { id, type: 'trigger', x: 0, y: 0, w: 1, h: 1, on: 'enter' }] });
const notFound = (p) => Object.assign(new Error(`Cannot find module '${p}' imported from maps.js`), { code: 'ERR_MODULE_NOT_FOUND' });

test('ep7 first: unpatched with the ep7 pack only, patched once the ep8 registry runs, and kept through a second ep7 register', async () => {
  await ep7Maps.register();
  assert.equal(peekMap('ep7_ph_watch'), ep7Watch, 'ep7 only: the Watch is Episode 7\'s module');
  assert.equal(peekMap('ep7_stillheart'), ep7Stillheart, 'ep7 only: the Stillheart is Episode 7\'s module');
  const importer = async (p) => {
    if (p === '../ep7/maps.js') return ep7Maps;
    if (p === PATCH_FILE) return { withEp8Wake: add('w8'), withStairDoor: add('s8') };
    throw notFound(`D:/x/src/data/maps/${p.slice(p.lastIndexOf('/') + 1)}`);
  };
  const r = await registerMaps(null, {}, { importer });
  assert.deepEqual(r.patched.sort(), ['ep7_ph_watch', 'ep7_stillheart']);
  assert.ok(peekMap('ep7_ph_watch').events.some((e) => e.id === 'w8'));
  assert.ok(peekMap('ep7_stillheart').events.some((e) => e.id === 's8'));
  await ep7Maps.register();
  assert.ok(peekMap('ep7_ph_watch').events.some((e) => e.id === 'w8'), 'a second ep7 register() keeps the patch (memoized)');
  assert.deepEqual(peekMap('ep7_ph_watch').marks, ep7Watch.marks, 'every Episode 7 mark unchanged');
});
