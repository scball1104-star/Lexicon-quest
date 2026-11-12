// E7-pack (EPISODE7_PLAN 10.6, PLAYTEST_REVIEW_6 fix 1 carried over): an Episode 7 save loaded while the ep7 pack cannot be
// fetched never lands in the developer test town, and nothing autosaves over the run's real place while the party waits for
// the pack. The fixture is an ep7_vault_f2 save with every src/data/ep7/** import failing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSave } from '../../src/core/save.js';
import { FieldScene } from '../../src/scenes/field.js';
import { serialize, saveMeta, setPosition } from '../../src/game/state.js';
import { loadMap as loadWorldMap } from '../../src/world/maps.js';
import { ensurePack, forcePack, packReady, packForMap, resetPacks, setPackDefaults } from '../../src/game/packs.js';
import { newGameEp7 } from '../../src/data/ep7/start.js';
import { EP7_MAP_IDS } from '../../src/data/ep7/maps.js';
import { landing, ROOT } from '../../src/game/packFallback.js';
import { loadDb, loadMap, walk } from '../../tools/maps/mapcheck.mjs';

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; }, _m: m };
}
const autosave = (self) => FieldScene.prototype.autosave.call({ warnOnce() {}, ...self });
const PACKS_URL = new URL('../../src/game/packs.js', import.meta.url);
/** The packs' importer with src/data/ep7/** unreachable (a dropped connection, a blocked request). */
const blocked = (p) => (/\/ep7\//.test(p) ? Promise.reject(new TypeError('Failed to fetch dynamically imported module: ' + p)) : import(new URL(p, PACKS_URL).href));

test('every ep7 map lands on open ground on Emberpeak, with the valley as the core fallback', async () => {
  const db = await loadDb();
  const ember = new Set(walk(await loadMap('emberpeak'), db, { flags: ['ep3_complete', 'ep4_complete', 'ep5_complete', 'ep6_complete'] }).reachable);
  for (const id of EP7_MAP_IDS) {
    const l = landing(id);
    assert.ok(l && l[0] === 'emberpeak', `${id}: lands on emberpeak, got ${l && l[0]}`);
    assert.ok(ember.has(`${l[1]},${l[2]}`), `emberpeak (${l[1]}, ${l[2]}) is open ground`);
  }
  assert.ok(!ROOT[0].startsWith('_'), 'the second fallback is a core map');
});

test('the ep7 pack unreachable: its map does not load, the landing does, and the pack is not ready', async () => {
  resetPacks();
  setPackDefaults({ importer: blocked, quiet: true, retryMs: 600000, warm: false, packFiles: null });
  try {
    forcePack('ep7');   // as ?pack=ep7 or a live switch would
    const r = await ensurePack('ep7');
    assert.equal(r.ok, false, 'the pack failed');
    assert.equal(packReady('ep7'), false);
    assert.equal(packForMap('ep7_vault_f2').prefixed, true);
    assert.equal(await loadWorldMap('ep7_vault_f2'), null, 'no such place while the pack is down (never the test town by itself)');
    const l = landing('ep7_vault_f2');
    const back = await loadWorldMap(l[0]);
    assert.ok(back && back.id === 'emberpeak', 'the landing map loads');
  } finally { resetPacks(); }
});

test('an ep7_vault_f2 save keeps its slot\'s map through the test town, the fallback landing and the wait for the pack', () => {
  const storage = memoryStorage();
  const save = createSave({ storage, log: () => {} });
  const g = newGameEp7('Pia', { slot: 0 });
  g.flags.ep7_started = true;
  setPosition(g, 'ep7_vault_f2', 20, 28, 'up');
  save.save(0, serialize(g), saveMeta(g));
  const before = save.exportSlot(0);
  setPosition(g, '_testtown', 12, 18, 'down');
  autosave({ engine: { save }, game: g });
  assert.equal(save.exportSlot(0), before, 'no autosave on the test town');
  const l = landing('ep7_vault_f2');
  setPosition(g, l[0], l[1], l[2], l[3]);   // the map change: the fallback landing, waiting for the pack
  autosave({ engine: { save }, game: g, packReturn: { pack: 'ep7', map: 'ep7_vault_f2', x: 20, y: 28, dir: 'up', via: l[0] } });
  assert.equal(save.exportSlot(0), before, 'no autosave while a pack return is pending');
  assert.equal(save.load(0).map, 'ep7_vault_f2');
  assert.deepEqual([save.load(0).pos.x, save.load(0).pos.y], [20, 28]);
  // back on the real map with the pack up: the autosave runs as before
  setPosition(g, 'ep7_vault_f2', 20, 27, 'up');
  autosave({ engine: { save }, game: g, packReturn: null });
  assert.equal(save.load(0).map, 'ep7_vault_f2');
  assert.equal(save.load(0).pos.y, 27, 'the ordinary autosave still writes');
});
