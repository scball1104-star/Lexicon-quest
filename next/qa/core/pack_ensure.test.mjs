// ensurePack and its helpers (src/game/packs.js): loads once, survives a failed import and retries, never rejects, never
// blocks, never fetches while a pack is switched off (XP-packs, docs/PWA_PACKS.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PACKS, ensurePack, packReady, onPackReady, packWanted, packsToAwait, packForMap, packsForMap, awaitPacks, mergeTileFragment,
  resetPacks, setPackDefaults, packEnabled, FAIL_TOAST, storedAll, startPackWatch, refetchUsed, packState,
} from '../../src/game/packs.js';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const table = { t1: { entry: 'e1', prefix: 't1_', assets: 'assets/t1_manifest.json', audioPack: 't1', touches: ['valley'], wanted: (f) => !!f.go, enabled: () => true } };
const quiet = { table, quiet: true, warm: false, packFiles: null, retryMs: 20 };

function mod() {
  const m = { calls: 0, register() { m.calls++; return Promise.resolve({ id: 't1', loaded: [], skipped: [] }); } };
  return m;
}

test('the real table: x1 and x2, the prefix rule, wanted(), the x1 switch is on and the x2 switch is off', () => {
  assert.deepEqual(Object.keys(PACKS), ['x1', 'x2', 'cave', 'ep3', 'ep4', 'ep5', 'ep6', 'tier', 'worldmap']);   // cave: the Deep Stacks (2026-10-27); tier: Fine Print (2026-10-28); ep3: Episode 3's maps (2026-11-02); ep4: Episode 4 (2026-11-03); ep5: Episode 5 (2026-11-08); ep6: Episode 6 (2026-11-09); worldmap: the world map (#97, 2026-11-11)
  assert.equal(PACKS.x1.prefix, 'x1_');
  assert.equal(PACKS.x2.audioPack, 'ep2');
  assert.deepEqual(PACKS.x1.touches, ['valley', 'willowmere', 'archive_f1', 'archive_f2', 'archive_f3']);
  assert.deepEqual(PACKS.x2.touches, ['east_road', 'nameless_hollow', 'nh_chapel', 'court_f1', 'court_f2', 'court_f3']);
  assert.equal(PACKS.x1.enabled(), true, 'X1_LIVE is on since X1-integrate flipped it');
  assert.equal(PACKS.x2.enabled(), false, 'X2_LIVE is false until X2-integrate flips it');
  // ep3 (E3-integrate): the maps folder, the two Hollowmere edits, the hard wait, wanted from Episode 2 on
  assert.equal(PACKS.ep3.prefix, 'ep3/'); assert.equal(PACKS.ep3.entry, '../data/maps/ep3/index.js'); assert.equal(PACKS.ep3.hard, true);
  assert.ok(PACKS.ep3.touches.includes('nameless_hollow') && PACKS.ep3.touches.includes('nh_inn') && PACKS.ep3.touches.includes('foundry_heart'));
  assert.deepEqual([{}, { ep1_complete: true }, { ep2_started: true }, { ep2_complete: true }, { ep3_started: true }].map((f) => PACKS.ep3.wanted(f)), [false, false, true, true, true]);
  assert.deepEqual(packsForMap('nameless_hollow').map((h) => h.id), ['x2', 'ep3'], 'both packs that edit the Hollow');
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
  // the automatic retry (20 ms here, 5 s for real) loads it without anyone asking again. Wait on the condition, not a
  // fixed 120 ms sleep, which a busy CPU could outrun (issue #76); the 3 s ceiling only bounds a real failure.
  for (const end = Date.now() + 3000; !packReady('t1') && Date.now() < end;) await new Promise((r) => setTimeout(r, 10));
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
  // ensurePack is synchronous up to its promise: getting here at all proves the hung import did not block it. The clock
  // only catches a gross stall; 50 ms was within reach of a preempted thread on a busy CPU (issue #76).
  assert.ok(Date.now() - t0 < 500, 'ensurePack returns immediately');
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

test('storedAll (issue #56): false with no service worker in control, so Node and a first visit keep the up-front fetch', async () => {
  assert.equal(await storedAll(['https://example.test/next/src/data/ep6/flags.js']), false);
  assert.equal(await storedAll([]), false);
  assert.equal(await storedAll(null), false);
});

test('startPackWatch (issue #56): the side packs wait until no hard pack is loading', async () => {
  resetPacks();
  const order = [];
  const gates = {};
  const hardIds = Object.keys(PACKS).filter((id) => PACKS[id].hard);
  const importer = (p) => {
    const id = Object.keys(PACKS).find((k) => PACKS[k].entry === p);
    order.push(id);
    const m = { register: () => ({ id, loaded: [], skipped: [] }) };
    if (!PACKS[id].hard) return Promise.resolve(m);
    return new Promise((ok) => { gates[id] = () => ok(m); });
  };
  setPackDefaults({ importer, enabled: true, quiet: true, warm: false, packFiles: null });
  let onScene = null;
  const flags = { first_fight_done: true, ep1_complete: true, ep2_complete: true, ep3_complete: true, ep4_complete: true, ep5_complete: true };
  const engine = { game: { flags }, save: null, on: (name, fn) => { if (name === 'scene') onScene = fn; return () => {}; } };
  const stop = startPackWatch(engine, null);
  try {
    onScene();
    await new Promise((r) => setTimeout(r, 10));
    assert.deepEqual([...order].sort(), [...hardIds].sort(), 'only the hard packs start while they load');
    for (const id of hardIds.slice(0, -1)) gates[id]();
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(order.length, hardIds.length, 'one hard pack still loading: the side packs still wait');
    gates[hardIds[hardIds.length - 1]]();
    await new Promise((r) => setTimeout(r, 10));
    const side = order.slice(hardIds.length);
    assert.ok(side.includes('x1') && side.includes('cave'), `the side packs start once every hard pack is up: ${side}`);
    assert.ok(side.every((id) => !PACKS[id].hard));
  } finally {
    stop();
    resetPacks();
  }
});

test('refetchUsed (issue #63): re-fetches only the same-origin game files no cache holds, once each, three at a time', async () => {
  const O = 'https://lq.test';
  const names = [
    `${O}/Lexicon-quest/next/assets/pack_files.json`,
    `${O}/Lexicon-quest/next/src/data/maps/ep3/emberpeak.js?v=2`,
    `${O}/Lexicon-quest/next/src/data/maps/ep3/emberpeak.js`,          // the same file again: one fetch
    `${O}/Lexicon-quest/assets/art/environments.webp`,                  // the painted title art lives beside next/
    `${O}/Lexicon-quest/next/src/main.js`,                              // cached (precache): left alone
    `${O}/Lexicon-quest/next/sw.js`,                                    // the worker script: never through the worker
    `${O}/other-site/next/a.js`,                                        // outside the game
    'https://fonts.example/f.woff2',                                    // another origin
    'not a url',
  ];
  const cached = new Set([`${O}/Lexicon-quest/next/src/main.js`]);
  const got = [];
  let inFlight = 0;
  let most = 0;
  const r = await refetchUsed({
    names, root: `${O}/Lexicon-quest/`,
    match: async (h) => cached.has(h.split('?')[0]),
    fetch: async (h) => { inFlight++; most = Math.max(most, inFlight); await new Promise((ok) => setTimeout(ok, 5)); inFlight--; got.push(h); },
  });
  assert.deepEqual(r, { checked: 4, fetched: 3 });
  assert.deepEqual(got.map((h) => h.split('?')[0].replace(O, '')).sort(),
    ['/Lexicon-quest/assets/art/environments.webp', '/Lexicon-quest/next/assets/pack_files.json', '/Lexicon-quest/next/src/data/maps/ep3/emberpeak.js']);
  assert.ok(most <= 3, `at most three fetches at once (saw ${most})`);
});

test('refetchUsed (issue #63): a failed fetch or match never rejects, and Node with no caches API does nothing', async () => {
  const O = 'https://lq.test';
  const r = await refetchUsed({ names: [`${O}/g/next/a.js`, `${O}/g/next/b.js`], root: `${O}/g/`,
    match: async (h) => { if (h.endsWith('a.js')) throw new Error('boom'); return null; }, fetch: async () => { throw new Error('offline'); } });
  assert.equal(r.checked, 2);
  assert.deepEqual(await refetchUsed(), { checked: 0, fetched: 0 }, 'Node: no performance entries of the game, no caches');
});

// Issue #96 (WORLD_MAP_PLAN 5.2, EP8 13.5): a resume fetches every hard pack it needs at once; registration stays in order.
const hardDef = (id, hard = true, on = true) => ({ entry: id, prefix: `${id}_`, assets: null, audioPack: null, hard, touches: [], wanted: () => true, enabled: () => on });
function chain(t, fail = {}) {
  const started = [], inited = [], gates = {};
  const dep = (id) => { const ids = Object.keys(t).filter((k) => t[k].hard); const i = ids.indexOf(id); return i > 0 ? ids[i - 1] : null; };
  const o = { table: t, quiet: true, warm: false, packFiles: null, retryMs: 20 };
  // each entry is held until its gate opens (its download); its register() awaits the pack before it, as the ep4..ep6 entries do
  o.importer = (p) => {
    started.push(p);
    if (fail[p] > 0) { fail[p]--; return Promise.reject(new Error(`${p}: network`)); }
    return new Promise((ok) => { gates[p] = () => ok({ register: async () => {
      const d = dep(p);
      if (d) { const r = await ensurePack(d, o); if (!r.ok) throw new Error(`${d} did not load`); }
      inited.push(p); return { id: p, loaded: [], skipped: [] };
    } }); });
  };
  return { o, started, inited, gates };
}
const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));

test('#96: the real table lists the hard packs in chain order (ep3, ep4, ep5, ep6), which the fetch-at-once rule reads', () => {
  assert.deepEqual(Object.keys(PACKS).filter((id) => PACKS[id].hard), ['ep3', 'ep4', 'ep5', 'ep6']);
});

test('#96: one ensurePack of the last hard pack starts every hard pack above it at once, and they register in order', async () => {
  resetPacks();
  const t = { h1: hardDef('h1'), s1: hardDef('s1', false), h2: hardDef('h2'), h3: hardDef('h3'), s2: hardDef('s2', false) };
  const c = chain(t);
  const p3 = ensurePack('h3', c.o);
  await tick();
  assert.deepEqual([...c.started].sort(), ['h1', 'h2', 'h3'], 'all three downloads start on the one call; no side pack does');
  assert.equal(c.started[0], 'h1', 'the first pack of the chain starts first');
  c.gates.h3(); c.gates.h2();
  await tick();
  assert.deepEqual(c.inited, [], 'h3 and h2 arrived first: neither registers before h1');
  assert.equal(packReady('h2'), false);
  c.gates.h1();
  const r = await p3;
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(c.inited, ['h1', 'h2', 'h3'], 'registered in dependency order');
  assert.deepEqual(c.started.length, 3, 'each entry imported once');
  assert.ok(['h1', 'h2', 'h3'].every(packReady));
  resetPacks();
});

test('#96: the first pack of a chain starts nothing else; a switched-off pack above is skipped, never imported', async () => {
  resetPacks();
  const t = { h1: hardDef('h1'), h2: hardDef('h2', true, false), h3: hardDef('h3') };
  const c = chain({ h1: t.h1, h3: t.h3 });
  c.o.table = t;
  const p1 = ensurePack('h1', c.o);
  await tick();
  assert.deepEqual(c.started, ['h1'], 'nothing below h1 starts');
  const p3 = ensurePack('h3', c.o);
  await tick();
  assert.deepEqual(c.started, ['h1', 'h3'], 'h2 is off: never imported');
  c.gates.h1(); c.gates.h3();
  assert.equal((await p1).ok, true); assert.equal((await p3).ok, true);
  assert.deepEqual(c.inited, ['h1', 'h3']);
  resetPacks();
});

test('#96: a bad connection on the first pack of the chain fails it quietly, and the retries bring every pack up in order', { timeout: 10000 }, async () => {
  resetPacks();
  const t = { h1: hardDef('h1'), h2: hardDef('h2'), h3: hardDef('h3') };
  const c = chain(t, { h1: 1 });
  const p3 = ensurePack('h3', c.o);
  await tick();
  assert.equal(packState('h1').last && packState('h1').last.ok, false, 'the first h1 download failed');
  assert.deepEqual(c.inited, [], 'nothing registered past the failure');
  // the retries (the next call and the automatic one after retryMs 20): open every gate as it appears
  for (let i = 0; i < 200 && !['h1', 'h2', 'h3'].every(packReady); i++) { for (const g of Object.values(c.gates)) g(); await tick(10); }
  assert.ok(['h1', 'h2', 'h3'].every(packReady), 'all three up after the retries');
  assert.equal((await ensurePack('h3', c.o)).ok, true);
  assert.deepEqual(c.inited, ['h1', 'h2', 'h3'], 'each registered once, in order');
  void p3;
  resetPacks();
});

test('#96: packs loading at once share one assets/pack_files.json fetch; a later load fetches it fresh', async () => {
  resetPacks();
  const t = { h1: hardDef('h1'), h2: hardDef('h2'), h3: hardDef('h3') };
  const asked = [];
  const real = globalThis.fetch;
  globalThis.fetch = (h) => { asked.push(String(h)); return Promise.resolve({ ok: true, json: async () => ({ h1: [], h2: [], h3: [] }) }); };
  try {
    const engine = { assets: { url: (p) => `http://lq.test/next/${p}`, base: 'http://lq.test/next/' } };
    const o = { table: t, engine, quiet: true, warm: false, retryMs: 20, importer: async (p) => ({ register: () => ({ id: p, loaded: [], skipped: [] }) }) };
    const r = await Promise.all([ensurePack('h3', o), ensurePack('h2', o)]);
    assert.ok(r.every((x) => x.ok), JSON.stringify(r));
    assert.ok(['h1', 'h2', 'h3'].every(packReady));
    assert.deepEqual(asked, ['http://lq.test/next/assets/pack_files.json'], 'one fetch for the three packs');
    resetPacks();
    await ensurePack('h1', o);
    assert.equal(asked.length, 2, 'not kept after it settled: the next load asks again');
  } finally {
    globalThis.fetch = real;
    resetPacks();
  }
});
