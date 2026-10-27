// Generated floors pass the checks qa/maps applies to hand maps (tools/maps/mapcheck.mjs validate): ids, legend, tile and
// object ids, standing events on walkable ground, door targets on walkable cells of the next floor, the walk. Twenty
// floors across the bands. Two seams the integrator owns are shimmed here exactly as C2-world will do at run time:
// chest tiers red / blue are mapped to wood / gold for the validator, and the stub encounter ids are registered as zones
// of the floor (see gen_helpers.mjs asHandMap).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDb, validate } from '../../tools/maps/mapcheck.mjs';
import { SEEDS, pairFor } from './gen_helpers.mjs';

const db = await loadDb();
const CASES = [[7, 1], [7, 3], [7, 9], [7, 10], [7, 15], [7, 19], [7, 20], [7, 25], [7, 35], [7, 39],
  [42, 2], [42, 12], [42, 30], [1234, 7], [1234, 22], [99999, 5], [99999, 33], [11, 45], [11, 70], [3, 99]];

for (const [seed, floor] of CASES) {
  test(`seed ${seed} B${floor}: validates like a hand map (no errors; only the banner warning); everything reachable`, () => {
    const { a, maps } = pairFor(seed, floor, db);
    const r = validate(maps[a.id], db, maps, {});
    assert.deepEqual(r.errors, [], `errors: ${r.errors.join('; ')}`);
    for (const w of r.warnings) assert.match(w, /^no banner for cave_b\d+ in text\.js$/, `unexpected warning: ${w}`);
    assert.ok(r.walk && !r.walk.error);
    assert.deepEqual(r.walk.unreached, [], `unreached: ${r.walk.unreached.join(' ')}`);
    for (const mk of r.walk.marks) assert.ok(mk.reached, `mark ${mk.name} at ${mk.x},${mk.y} not reached`);
  });
}

test('the chest tier and encounter seams are the only things the validator needs shimmed', () => {
  const { a, maps } = pairFor(7, 3, db);
  const raw = { ...a };
  const r = validate(raw, db, maps, {});
  // without the shim: only chest tier errors (red / blue are not wood / iron / gold)
  for (const e of r.errors) assert.match(e, /^chest (chest_\d+|blue_chest): tier (red|blue)$/, `unexpected raw error: ${e}`);
  assert.ok(r.errors.length >= 2);
});
