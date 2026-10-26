// X1 fix pass (M4): a save made inside an x1 map never loads into the developer test town. field.loadMap waits for the pack (bounded),
// then lands the party on a real map beside the pack's door and remembers where it was. The blocked-pack run itself is
// qa/saves/x1_blocked_pack.py (a real browser); these are the landing cells and the wiring.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { landing } from '../../src/game/packFallback.js';
import { X1_MAP_REGION } from '../../src/data/x1/flags.js';
import { loadDb, walk, NEXT } from '../../tools/maps/mapcheck.mjs';

const FIELD = fs.readFileSync(path.join(NEXT, 'src', 'scenes', 'field.js'), 'utf8');

test('every x1 map has a landing on a real main-game map, and the cell is walkable on the unpatched (baseline) map', async () => {
  const db = await loadDb();
  const base = (id) => JSON.parse(fs.readFileSync(path.join(NEXT, 'qa', 'maps', 'x1_baseline', `${id}.json`), 'utf8'));
  const maps = { valley: base('valley'), willowmere: base('willowmere') };
  const flags = ['first_fight_done', 'archive_f1_done', 'ep1_complete', 'lantern_get'];
  const reach = Object.fromEntries(Object.entries(maps).map(([id, m]) => [id, new Set(walk(m, db, { flags }).reachable)]));
  const ids = [...Object.keys(X1_MAP_REGION), 'x1_somethingnew'];
  for (const id of ids) {
    const l = landing(id);
    assert.ok(l && maps[l[0]], `${id}: lands on a baseline map, got ${l && l[0]}`);
    assert.ok(!l[0].startsWith('_') && !l[0].startsWith('x1_'), `${id}: not the test town and not a pack map`);
    assert.ok(reach[l[0]].has(`${l[1]},${l[2]}`), `${id}: ${l[0]} (${l[1]}, ${l[2]}) is open ground`);
  }
  assert.deepEqual(landing('x1_downs').slice(0, 3), ['valley', 1, 28], 'the Downs land on the valley west lane');
  assert.equal(landing('x1_terrace')[2], 10, 'the Terrace lands under the cleft');
  assert.equal(landing('x1_culvert')[2], 34, 'the Culvert lands on the south track');
  assert.equal(landing('willowmere'), null, 'a main-game map has no landing');
});

test('field.loadMap: a missing pack map waits, falls back to a real map and remembers the way back; the test town is only for maps no pack owns', () => {
  const i = FIELD.indexOf('async loadMap(');
  const body = FIELD.slice(i, FIELD.indexOf('// tear down the old map', i));
  assert.ok(/packForMap\(mapId\)/.test(body) && /hit\.prefixed/.test(body) && /packEnabled\(hit\.id\)/.test(body), 'only a prefixed map of an enabled pack');
  assert.ok(body.indexOf('awaitPacks') < body.indexOf('landing(') && body.indexOf('landing(') < body.indexOf("using the test town"), 'wait, then land, and the test town stays last');
  assert.ok(/awaitPacks\(\[hit\.id\], 8000\)/.test(body), 'the wait is bounded (the 5 s retry of the pack falls inside it)');
  assert.ok(/this\.packReturn = \{ pack: hit\.id, map: mapId, x, y, dir/.test(body), 'the saved place is kept');
  // the way back: once the pack is ready and the party is still on the landing map and quiet
  const u = FIELD.slice(FIELD.indexOf('  update(dt, below) {'));
  assert.ok(/this\.packReturn/.test(u) && /packReady\(r\.pack\)/.test(u) && /this\.warpTo\(r\.map, r\.x, r\.y, r\.dir/.test(u), 'it goes back when the pack is up');
  assert.ok(/this\.mapId !== r\.via\) this\.packReturn = null/.test(u), 'it forgets when the party walked on');
});
