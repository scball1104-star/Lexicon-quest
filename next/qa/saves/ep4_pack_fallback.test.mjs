// E4-fixes-A (PLAYTEST_REVIEW_6 fix 1): an Episode 4 save loaded while the ep4 pack cannot be fetched never lands in the
// developer test town, and nothing autosaves over the run's real place while the party waits for the pack.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createSave } from '../../src/core/save.js';
import { FieldScene } from '../../src/scenes/field.js';
import { serialize, saveMeta, setPosition } from '../../src/game/state.js';
import { newGameEp4 } from '../../src/data/ep4/start.js';
import { landing, ROOT } from '../../src/game/packFallback.js';
import { loadDb, loadMap, walk, NEXT } from '../../tools/maps/mapcheck.mjs';

const FIELD = fs.readFileSync(path.join(NEXT, 'src', 'scenes', 'field.js'), 'utf8');

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; }, _m: m };
}
const autosave = (self) => FieldScene.prototype.autosave.call({ warnOnce() {}, ...self });

test('every ep4 map lands on open ground on Emberpeak (the ep3 map beside the Flood Road), with the valley as the core fallback', async () => {
  const db = await loadDb();
  for (const id of ['ep4_flood_road', 'ep4_valewyn', 'ep4_keep_f1', 'ep4_keep_f2', 'ep4_keep_f3', 'ep4_keep_crown', 'ep4_vw_inn', 'ep4_somethingnew']) {
    const l = landing(id);
    assert.ok(l && l[0] === 'emberpeak', `${id}: lands on emberpeak, got ${l && l[0]}`);
  }
  const ember = new Set(walk(await loadMap('emberpeak'), db, { flags: ['ep3_complete'] }).reachable);
  const l = landing('ep4_keep_f1');
  assert.ok(ember.has(`${l[1]},${l[2]}`), `emberpeak (${l[1]}, ${l[2]}) is open ground`);
  assert.ok(!ROOT[0].startsWith('_') && fs.existsSync(path.join(NEXT, 'src', 'data', 'maps', `${ROOT[0]}.js`)), 'the second fallback is a core map file');
  assert.equal(landing('pk_inn'), null, 'a main-game map has no landing');
});

test('field.loadMap: a landing that cannot load tries the core map before the test town, and attaches the ep3 field code', () => {
  const i = FIELD.indexOf('async loadMap(');
  const body = FIELD.slice(i, FIELD.indexOf('// tear down the old map', i));
  assert.ok(/if \(l && !back\) back = await loadMap\(\(l = ROOT\)\[0\]\)/.test(body), 'the ROOT fallback');
  assert.ok(body.indexOf('ROOT') < body.indexOf('using the test town'), 'the test town stays last');
  assert.ok(/via: l\[0\]/.test(body) && /EP3_MAP\.test\(mapId\)\) await ep3\(this\); \}/.test(body), 'the way back is kept and Emberpeak gets its field code');
});

test('the s2b repro: an Episode 4 save keeps its Keep position through a test-town or fallback-landing autosave', () => {
  const storage = memoryStorage();
  const save = createSave({ storage, log: () => {} });
  const g = newGameEp4('Pia', { slot: 0 });
  g.flags.ep4_started = true;
  setPosition(g, 'ep4_keep_f1', 22, 26, 'up');
  save.save(0, serialize(g), saveMeta(g));
  const before = save.exportSlot(0);
  // the old failure: the field fell back to the test town and the first door autosaved it
  setPosition(g, '_testtown', 12, 18, 'down');
  autosave({ engine: { save }, game: g });
  assert.equal(save.exportSlot(0), before, 'no autosave on the test town');
  // the fallback landing on Emberpeak, waiting for the pack
  setPosition(g, 'emberpeak', 36, 15, 'left');
  autosave({ engine: { save }, game: g, packReturn: { pack: 'ep4', map: 'ep4_keep_f1', x: 22, y: 26, dir: 'up', via: 'emberpeak' } });
  assert.equal(save.exportSlot(0), before, 'no autosave while a pack return is pending');
  assert.equal(save.load(0).map, 'ep4_keep_f1');
  // back on a real map with the pack up: the autosave runs as before
  setPosition(g, 'ep4_keep_f1', 22, 25, 'up');
  autosave({ engine: { save }, game: g, packReturn: null });
  assert.equal(save.load(0).map, 'ep4_keep_f1');
  assert.equal(save.load(0).pos.y, 25, 'the ordinary autosave still writes');
});
