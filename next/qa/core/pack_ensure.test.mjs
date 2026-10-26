// ensurePack and its helpers (src/game/packs.js): loads once, survives a failed import and retries, never rejects, never
// blocks, never fetches while a pack is switched off (XP-packs, docs/PWA_PACKS.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PACKS, ensurePack, packReady, onPackReady, packWanted, packsToAwait, packForMap, awaitPacks, mergeTileFragment,
  resetPacks, setPackDefaults, packEnabled, FAIL_TOAST,
} from '../../src/game/packs.js';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const table = { t1: { entry: 'e1', prefix: 't1_', assets: 'assets/t1_manifest.json', audioPack: 't1', touches: ['valley'], wanted: (f) => !!f.go, enabled: () => true } };
const quiet = { table, quiet: true, warm: false, packFiles: null, retryMs: 20 };

function mod() {
  const m = { calls: 0, register() { m.calls++; return Promise.resolve({ id: 't1', loaded: [], skipped: [] }); } };
  return m;
}

test('the real table: x1 and x2, the prefix rule, wanted(), the x1 switch is on and the x2 switch is off', () => {
  assert.deepEqual(Object.keys(PACKS), ['x1', 'x2']);
  assert.equal(PACKS.x1.prefix, 'x1_');
  assert.equal(PACKS.x2.audioPack, 'ep2');
  assert.deepEqual(PACKS.x1.touches, ['valley', 'willowmere', 'archive_f1', 'archive_f2', 'archive_f3']);
  assert.deepEqual(PACKS.x2.touches, ['east_road', 'nameless_hollow', 'nh_chapel', 'court_f1', 'court_f2', 'court_f3']);
  assert.equal(PACKS.x1.enabled(), true, 'X1_LIVE is on since X1-integrate flipped it');
  assert.equal(PACKS.x2.enabled(), false, 'X2_LIVE is false until X2-integrate flips it');
});

test('packWanted per flag set', () => {
  resetPacks();
  assert.equal(packWanted('x1', {}), false);
  assert.equal(packWanted('x1', { first_fight_done: true }), true);
  assert.equal(packWanted('x1', { ep1_complete: true }), false);
  assert.equal(packWanted('x2', { first_fight_done: true }), false);
  assert.equal(packWanted('x2', { ep1_complete: true }), true);
  assert.equal(packWanted('nope', { ep1_complete: true }), false);
  assert.equal(packWanted('x1'), false, 'no flags at all is fine');
});

test('enabled() false never fetches and never imports', async () => {
  resetPacks();
  let imports = 0;
  const r = await ensurePack('x1', { enabled: false, importer: () => { imports++; return {}; }, quiet: true });
  assert.deepEqual({ id: r.id, ok: r.ok, skipped: r.skipped }, { id: 'x1', ok: true, skipped: true });
  assert.equal(imports, 0);
  assert.equal(packReady('x1'), false, 'skipped is not ready');
  assert.deepEqual(packsToAwait({ first_fight_done: true, ep1_complete: true }, { enabled: false }), [], 'a switched-off pack is never awaited');
  const sw = await ensurePack('x2');
  assert.equal(sw.skipped, true);
});

test('ensurePack loads once and returns the same promise', async () => {
  resetPacks();
  const m = mod();
  let imports = 0;
  const importer = async (p) => { imports++; assert.equal(p, 'e1'); return m; };
  const a = ensurePack('t1', { ...quiet, importer });
  const b = ensurePack('t1', { ...quiet, importer });
  assert.equal(a, b, 'the same promise while loading');
  const r = await a;
  assert.equal(r.ok, true); assert.equal(r.id, 't1'); assert.deepEqual(r.failed, []); assert.equal(typeof r.ms, 'number');
  assert.equal(ensurePack('t1', { ...quiet, importer }), a, 'and after success');
  assert.equal(imports, 1); assert.equal(m.calls, 1);
  assert.equal(packReady('t1', { table }), true);
});

test('onPackReady fires once on ready, and at once when already ready', async () => {
  resetPacks();
  const seen = [];
  onPackReady('t1', (id) => seen.push(['early', id]));
  assert.deepEqual(seen, []);
  await ensurePack('t1', { ...quiet, importer: async () => mod() });
  assert.deepEqual(seen, [['early', 't1']]);
  onPackReady('t1', (id) => seen.push(['late', id]));
  assert.deepEqual(seen.at(-1), ['late', 't1']);
  const off = onPackReady('zz', () => seen.push('never'));
  off();
});

test('a failed import resolves ok:false, then a retry (the next call, and one automatic) succeeds', async () => {
  resetPacks();
  let n = 0;
  const importer = async () => { if (++n <= 1) throw new Error('network down'); return mod(); };
  const r1 = await ensurePack('t1', { ...quiet, importer });
  assert.equal(r1.ok, false);
  assert.ok(r1.failed[0].startsWith('entry:'));
  assert.equal(packReady('t1'), false);
  // the automatic retry (20 ms here, 5 s for real) loads it without anyone asking again
  await new Promise((r) => setTimeout(r, 120));
  assert.equal(packReady('t1'), true, 'the automatic retry succeeded');
  assert.equal(n, 2);

  resetPacks();
  n = -4;                      // fails for several calls: the next explicit call retries, the automatic one does not repeat
  const importer2 = async () => { if (++n <= -2) throw new Error('down'); return mod(); };
  const a = await ensurePack('t1', { ...quiet, importer: importer2, retryMs: 10000 });
  assert.equal(a.ok, false);
  const b = await ensurePack('t1', { ...quiet, importer: importer2, retryMs: 10000 });
  assert.equal(b.ok, false);
  const c = await ensurePack('t1', { ...quiet, importer: importer2, retryMs: 10000 });
  assert.equal(c.ok, true, 'the third explicit call got through');
  resetPacks();
});

test('ensurePack never rejects (sync throw, a rejecting register, a garbage module, an unknown id)', async () => {
  resetPacks();
  const cases = [
    () => { throw new Error('sync'); },
    async () => ({ register() { throw new Error('register blew up'); } }),
    async () => null,
    async () => 42,
  ];
  for (const importer of cases) {
    resetPacks();
    const r = await ensurePack('t1', { ...quiet, importer, retryMs: 10000 });
    assert.equal(typeof r.ok, 'boolean');
  }
  const u = await ensurePack('nope', quiet);
  assert.equal(u.ok, false);
  resetPacks();
});

test('boot timing: a hung import never blocks the caller, and awaitPacks gives up at its ceiling', async () => {
  resetPacks();
  const hang = () => new Promise(() => {});
  const t0 = Date.now();
  const p = ensurePack('t1', { ...quiet, importer: hang });       // returns at once, pending
  assert.ok(Date.now() - t0 < 50, 'ensurePack returns immediately');
  assert.ok(p instanceof Promise);
  const r = await awaitPacks(['t1'], 60, { table, enabled: true });
  assert.equal(r, 'timeout');
  assert.ok(Date.now() - t0 >= 55 && Date.now() - t0 < 1000);
  assert.deepEqual(await awaitPacks([], 60), [], 'nothing to wait for resolves at once');
  assert.deepEqual(await awaitPacks(['x1'], 60, { enabled: false }), [], 'a switched-off pack is not waited for');
  resetPacks();
  // main.js must never await a pack on the boot path (static check)
  const main = fs.readFileSync(path.join(NEXT, 'src/main.js'), 'utf8');
  assert.ok(!/await\s+(ensurePack|awaitPacks|startPackWatch)/.test(main), 'main.js does not await a pack');
  assert.ok(main.indexOf('startPackWatch(engine') > main.indexOf('engine.push(first)'), 'the pack watch starts after the title is pushed');
});

test('skipped modules that pack_files.json lists count as failed (a fetch error looks like "missing" in a browser)', async () => {
  resetPacks();
  const importer = async () => ({ register: async () => ({ id: 't1', loaded: [], skipped: ['enemies', 'items'] }) });
  const r = await ensurePack('t1', { ...quiet, importer, packFiles: { t1: ['src/data/t1/index.js', 'src/data/t1/items.js'] }, retryMs: 10000 });
  assert.equal(r.ok, false);
  assert.deepEqual(r.failed, ['module:items']);
  resetPacks();
  const ok = await ensurePack('t1', { ...quiet, importer, packFiles: { t1: ['src/data/t1/index.js'] } });
  assert.equal(ok.ok, true, 'skipped and not listed: really missing, which is fine');
  resetPacks();
});

test('assets: the manifest fragment loads, tiles merge into the live database, audio pack starts; failures are quiet and toast once', async () => {
  resetPacks();
  const db = { terrains: { grass: { id: 'grass' } }, tiles: {}, objects: {}, terrainOrder: ['a'] };
  const toasts = [];
  const calls = { audio: [], manifest: [] };
  let fail = true;
  const engine = {
    toasts: { flash: (t) => toasts.push(t) },
    audio: { loadPack: (n) => { calls.audio.push(n); return Promise.resolve(); } },
    assets: {
      loadPackManifest: async (p) => { calls.manifest.push(p); return { done: 1, total: 1, failed: fail ? ['image:t1'] : [] }; },
      has: (k) => k === 't1_tiles',
      json: (k) => (k === 'tiles' ? db : { terrains: { peat: { id: 'peat' }, grass: { id: 'WRONG' } }, objects: { cairn: { w: 1 } }, terrainOrder: ['peat'] }),
    },
  };
  const r1 = await ensurePack('t1', { ...quiet, importer: async () => mod(), engine, retryMs: 10000 });
  assert.equal(r1.ok, false); assert.deepEqual(r1.failed, ['image:t1']);
  assert.deepEqual(toasts, [FAIL_TOAST], 'one single-line toast');
  assert.deepEqual(calls.audio, [], 'the audio pack waits for a clean load');
  fail = false;
  const r2 = await ensurePack('t1', { ...quiet, importer: async () => mod(), engine, retryMs: 10000 });
  assert.equal(r2.ok, true);
  assert.deepEqual(calls.manifest, ['assets/t1_manifest.json', 'assets/t1_manifest.json']);
  assert.deepEqual(calls.audio, ['t1']);
  assert.equal(db.terrains.peat.id, 'peat'); assert.equal(db.terrains.grass.id, 'grass', 'a shared id is never overwritten');
  assert.ok(db.objects.cairn); assert.deepEqual(db.terrainOrder, ['a', 'peat']);
  // a second failure in the same session does not toast again
  resetPacks();
  const e2 = { ...engine, assets: { ...engine.assets, loadPackManifest: async () => { throw new Error('404'); } } };
  const toasts2 = [];
  e2.toasts = { flash: (t) => toasts2.push(t) };
  const r3 = await ensurePack('t1', { ...quiet, importer: async () => mod(), engine: e2, retryMs: 10000 });
  assert.equal(r3.ok, false); assert.equal(toasts2.length, 1);
  await ensurePack('t1', { ...quiet, importer: async () => mod(), engine: e2, retryMs: 10000 });
  assert.equal(toasts2.length, 1, 'once per session');
  resetPacks();
});

test('mergeTileFragment: adds, never overwrites, appends terrainOrder once', () => {
  const db = { terrains: { grass: { a: 1 } }, walls: {}, tiles: {}, objects: { house: { a: 1 } }, overlays: {}, terrainOrder: ['grass'] };
  const frag = { terrains: { grass: { a: 2 }, peat: { a: 3 } }, walls: { quarry: { s: 1 } }, objects: { cairn_block: { w: 1 } }, terrainOrder: ['peat', 'grass'], junk: { x: 1 } };
  const r = mergeTileFragment(db, frag);
  assert.deepEqual(r.clashes, ['terrains.grass']);
  assert.equal(db.terrains.grass.a, 1); assert.equal(db.terrains.peat.a, 3); assert.ok(db.walls.quarry); assert.ok(db.objects.cairn_block);
  assert.deepEqual(db.terrainOrder, ['grass', 'peat']);
  assert.equal(db.junk, undefined);
  const again = mergeTileFragment(db, frag);
  assert.equal(again.added, 0, 'idempotent');
  assert.deepEqual(mergeTileFragment(null, frag), { added: 0, clashes: [] });
});

test('packForMap: a prefixed map and a touched map both resolve to their pack', () => {
  assert.deepEqual(packForMap('x1_downs'), { id: 'x1', prefixed: true, touched: false });
  assert.deepEqual(packForMap('x2_quarry'), { id: 'x2', prefixed: true, touched: false });
  assert.deepEqual(packForMap('valley'), { id: 'x1', prefixed: false, touched: true });
  assert.deepEqual(packForMap('court_f2'), { id: 'x2', prefixed: false, touched: true });
  assert.equal(packForMap('inn'), null);
  assert.equal(packForMap(''), null);
  assert.equal(packForMap('x1'), null, 'the bare id is not a prefixed map');
});

test('setPackDefaults reaches calls that pass no options (maps.js and the call sites use this door in tests)', async () => {
  resetPacks();
  setPackDefaults({ table, enabled: true, importer: async () => mod(), quiet: true, warm: false, packFiles: null });
  assert.equal(packEnabled('t1'), true);
  const r = await ensurePack('t1');
  assert.equal(r.ok, true);
  assert.deepEqual(packsToAwait({ go: 1 }), [], 'ready packs are not awaited');
  resetPacks();
  assert.equal(packEnabled('x1'), PACKS.x1.enabled(), 'back to the real switch');
});
