// Lazy packs: prefixed files kept out of the first download, loaded by ensurePack(id) on first need. docs/PWA_PACKS.md.

import { X1_LIVE } from '../data/x1/live.js';
import { X2_LIVE } from '../data/x2/live.js';
import { CAVE_LIVE } from '../data/cave/live.js';
import { EP3_LIVE, EP4_LIVE, EP5_LIVE, EP6_LIVE } from './episodes.js';

export const PACKS = {
  x1: { entry: '../data/x1/index.js', prefix: 'x1_', assets: 'assets/x1_manifest.json', audioPack: 'x1',
        touches: ['valley', 'willowmere', 'archive_f1', 'archive_f2', 'archive_f3'],
        wanted: (flags) => !!flags.first_fight_done, enabled: () => X1_LIVE },
  x2: { entry: '../data/x2/index.js', prefix: 'x2_', assets: 'assets/x2_manifest.json', audioPack: 'ep2',
        touches: ['east_road', 'nameless_hollow', 'nh_chapel', 'court_f1', 'court_f2', 'court_f3'],
        wanted: (flags) => !!flags.ep1_complete, enabled: () => X2_LIVE },
  // The Deep Stacks: the generator registers floors at run time
  cave: { entry: '../data/cave/index.js', prefix: 'cave_', assets: 'assets/cave_manifest.json', audioPack: null,
          touches: [],
          wanted: (flags) => !!flags.ep1_complete, enabled: () => CAVE_LIVE },
  // hard: unplayable unpatched, the field waits as for a prefixed map
  ep3: { entry: '../data/maps/ep3/index.js', prefix: 'ep3/', assets: null, audioPack: 'ep3', hard: true,
         touches: ['sand_road', 'emberpeak', 'pk_inn', 'pk_shop', 'pk_smithy', 'pk_bellhouse', 'foundry_f1', 'foundry_f2', 'foundry_f3', 'foundry_heart', 'nameless_hollow', 'nh_inn'],
         wanted: (f) => !!(f.ep2_started || f.ep2_complete || f.ep3_started), enabled: () => EP3_LIVE },
  ep4: { entry: '../data/ep4/index.js', prefix: 'ep4_', assets: 'assets/ep4_manifest.json', audioPack: 'ep4', hard: true, touches: ['emberpeak', 'pk_inn'],
         wanted: (f) => !!(f.ep3_complete || f.ep4_started), enabled: () => EP4_LIVE },
  ep5: { entry: '../data/ep5/index.js', prefix: 'ep5_', assets: 'assets/ep5_manifest.json', audioPack: 'ep5', hard: true, touches: ['ep4_vw_inn', 'ep4_valewyn'],
         wanted: (f) => !!(f.ep4_complete || f.ep5_started), enabled: () => EP5_LIVE },
  ep6: { entry: '../data/ep6/index.js', prefix: 'ep6_', assets: 'assets/ep6_manifest.json', audioPack: 'ep6', hard: true, touches: ['ep5_sh_inn', 'ep5_saffron'],
         wanted: (f) => !!(f.ep5_complete || f.ep6_started), enabled: () => EP6_LIVE },
  tier: { entry: '../data/tier/index.js', prefix: 'tier_', assets: 'assets/tier_manifest.json', audioPack: null, touches: [], wanted: (flags) => !!flags.tier_1, enabled: () => true },   // Fine Print
  worldmap: { entry: '../data/worldmap/index.js', prefix: 'worldmap_', assets: 'assets/worldmap_manifest.json', audioPack: null, touches: [], wanted: (f) => !!f.ep1_complete, enabled: () => true },   // #97
};

/** Where the generated list of every file of every pack lives (tools/pwa/build_pwa.py writes it). */
export const PACK_FILES_PATH = 'assets/pack_files.json';
/** The one toast a failed load shows, once per session. */
export const FAIL_TOAST = 'Some new places could not load. They will try again.';
export const RETRY_MS = 5000;
export const GUARD_MS = 1500;

const state = {};            // id -> { ready, promise, last, autoRetried, waiters: [fn], errors: [] }
const forced = new Set();    // ids turned on by ?pack=x1 or forcePack() (QA and tests), whatever enabled() says
let engineRef = null;
let toasted = false;
let defaults = {};          // tests: options every ensurePack call inherits (importer, retryMs ...), so maps.js and the call sites can be driven too

function st(id) { return state[id] || (state[id] = { ready: false, promise: null, last: null, autoRetried: false, waiters: [], errors: [] }); }
function tableOf(opts) { return (opts && opts.table) || defaults.table || PACKS; }
function defOf(id, opts) { return tableOf(opts)[id] || null; }
const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
// Issue #63: a first visit loads more than the 250 resource timings a browser keeps by default; keep them all for refetchUsed().
if (typeof navigator !== 'undefined' && navigator.serviceWorker && !navigator.serviceWorker.controller && performance.setResourceTimingBufferSize) performance.setResourceTimingBufferSize(5000);
const refetch = { state: 'idle', checked: 0, fetched: 0 };   // refetchUsed() progress (QA: LQ_PACKS.refetchState())

/** Tests: forget every pack's state. */
export function resetPacks() {
  for (const k of Object.keys(state)) { const s = state[k]; if (s.timer) clearTimeout(s.timer); delete state[k]; }
  forced.clear();
  engineRef = null;
  toasted = false;
  defaults = {};
}

/** Tests: options merged under every ensurePack/packEnabled call's own opts (importer, packFiles, retryMs, warm, quiet ...). */
export function setPackDefaults(o) { defaults = { ...(o || {}) }; }

/** Give the packs the engine (assets, audio, toasts). main.js calls this once after boot; Node code simply never does. */
export function bindPacks(engine) {
  engineRef = engine || null;
  if (typeof window !== 'undefined') window.LQ_PACKS = { PACKS, ensurePack, packReady, packState, forcePack, awaitPacks, refetchState: () => ({ ...refetch }) };
}

/** Turn a pack on regardless of its enabled() switch (QA: ?pack=x1; tests). Content stays gated by x1On()/x2On(). */
export function forcePack(id) { forced.add(id); }

export function packIds() { return Object.keys(PACKS); }
export function packEnabled(id, opts) {
  opts = { ...defaults, ...opts };
  if (opts && opts.enabled != null) return !!opts.enabled;
  const def = defOf(id, opts);
  return !!def && (forced.has(id) || !!def.enabled());
}
/** Sync: has ensurePack(id) finished with no failure? */
export function packReady(id) { return !!(state[id] && state[id].ready); }
/** Debug snapshot: { ready, loading, last, errors }. */
export function packState(id) { const s = state[id]; return s ? { ready: s.ready, loading: !!s.promise && !s.ready, last: s.last, errors: s.errors.slice(-5) } : { ready: false, loading: false, last: null, errors: [] }; }
/** Call fn once when the pack is ready (at once when it already is). Returns an unsubscribe function. */
export function onPackReady(id, fn) {
  const s = st(id);
  if (s.ready) { try { fn(id); } catch (e) { console.warn('[packs] onPackReady', e); } return () => {}; }
  s.waiters.push(fn);
  return () => { const i = s.waiters.indexOf(fn); if (i >= 0) s.waiters.splice(i, 1); };
}
/** Does a game with these flags want the pack (ignores whether it is enabled)? */
export function packWanted(id, flags, opts) { const def = defOf(id, opts); return !!def && !!def.wanted(flags || {}); }
/** Ids of the packs this game wants, that are enabled and not ready yet (the call sites await exactly these). */
export function packsToAwait(flags, opts) {
  const t = tableOf(opts);
  return Object.keys(t).filter((id) => packEnabled(id, opts) && !packReady(id) && packWanted(id, flags, opts));
}
/** Which pack a map id belongs to: { id, prefixed } for x1_*, { id, touched } for a map a pack edits, else null. */
export function packForMap(mapId, opts) {
  const t = tableOf(opts);
  const m = String(mapId || '');
  for (const [id, def] of Object.entries(t)) {
    if (m.startsWith(def.prefix)) return { id, prefixed: true, touched: false };
    if (def.touches.includes(m)) return { id, prefixed: false, touched: true };
  }
  return null;
}

/** Every pack a map id belongs to (nameless_hollow: x2 and ep3). */
export function packsForMap(mapId, opts) {
  const m = String(mapId || '');
  return Object.entries(tableOf(opts)).filter(([, d]) => m.startsWith(d.prefix) || d.touches.includes(m)).map(([id]) => ({ id }));
}

/**
 * Wait for these packs, but never longer than `ms`. Resolves to the list of results, or 'timeout'. Never rejects, and
 * resolves at once (synchronously settled) with [] when there is nothing to wait for.
 */
export function awaitPacks(ids, ms = GUARD_MS, opts) {
  const list = (ids || []).filter((id) => packEnabled(id, opts) && !packReady(id));
  if (!list.length) return Promise.resolve([]);
  return new Promise((resolve) => {
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; resolve('timeout'); } }, ms);
    Promise.all(list.map((id) => ensurePack(id, opts))).then((r) => { if (!done) { done = true; clearTimeout(t); resolve(r); } });
  });
}

/** Merge a pack's tile fragment into the live tile database in place; never overwrites an id. Returns { added, clashes }. */
export function mergeTileFragment(db, frag) {
  const out = { added: 0, clashes: [] };
  if (!db || !frag || typeof frag !== 'object') return out;
  for (const [key, val] of Object.entries(frag)) {
    if (key === 'terrainOrder') {
      db.terrainOrder = db.terrainOrder || [];
      for (const id of val || []) if (!db.terrainOrder.includes(id)) { db.terrainOrder.push(id); out.added++; }
    } else if (val && typeof val === 'object' && !Array.isArray(val) && ['terrains', 'walls', 'tiles', 'objects', 'overlays'].includes(key)) {
      db[key] = db[key] || {};
      for (const [id, v] of Object.entries(val)) {
        if (id in db[key]) out.clashes.push(`${key}.${id}`);
        else { db[key][id] = v; out.added++; }
      }
    }
  }
  // terrainInsertBefore: { id: existingId }: draw `id` below `existingId` (floors must sit under pit and ink rims).
  if (frag.terrainInsertBefore && typeof frag.terrainInsertBefore === 'object' && db.terrainOrder) {
    for (const [id, before] of Object.entries(frag.terrainInsertBefore)) {
      const bi = db.terrainOrder.indexOf(before);
      const ii = db.terrainOrder.indexOf(id);
      if (bi < 0 || ii < 0) continue;
      db.terrainOrder.splice(ii, 1);
      db.terrainOrder.splice(db.terrainOrder.indexOf(before), 0, id);
    }
  }
  return out;
}

function filesUrl(engine) {
  return engine && engine.assets && engine.assets.url ? engine.assets.url(PACK_FILES_PATH) : new URL('../../' + PACK_FILES_PATH, import.meta.url).href;
}
/** assets/pack_files.json as an object, or null (offline first visit, Node, 404). Never rejects. */
async function loadFileLists(engine, opts) {
  if (opts.packFiles !== undefined) return opts.packFiles;
  if (typeof fetch !== 'function') return null;
  try {
    const href = filesUrl(engine);
    if (!/^https?:/.test(href)) return null;
    const res = await fetch(href);
    return res.ok ? await res.json() : null;
  } catch (e) { return null; }
}

/**
 * In the browser with the service worker in control: does its cache already hold every one of these URLs? A pack then skips its
 * up-front fetch of them (issue #56: on a slow phone each extra request costs main-thread time). Anything else, a first visit
 * included, answers false and keeps the fetch, so a dropped connection still fails the pack and the retry can run. Never rejects.
 */
export async function storedAll(hrefs) {
  try {
    const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : null;
    if (!hrefs || !hrefs.length || typeof caches === 'undefined' || !sw || !sw.controller) return false;
    const hits = await Promise.all(hrefs.map((h) => caches.match(h, { ignoreSearch: true })));
    return hits.every(Boolean);
  } catch (e) { return false; }
}

function say(engine, text) {
  try { if (engine && engine.toasts && typeof engine.toasts.flash === 'function') engine.toasts.flash(text, { frames: 240 }); } catch (e) { /* toasts are optional */ }
}

async function attempt(id, def, opts) {
  const engine = opts.engine || engineRef;
  const s = st(id);
  const t0 = now();
  const failed = [];
  const importer = opts.importer || ((p) => import(p));
  const filesP = loadFileLists(engine, opts);
  let reg = null;
  try {
    // a failed import() is cached for the page's life: fetch the code first so a network failure leaves the retry possible
    if (!opts.importer) {
      const lists0 = await filesP;
      const dir = 'src/' + def.entry.slice(3).replace(/[^/]+$/, '');   // the entry's folder
      const code = lists0 && Array.isArray(lists0[id]) ? lists0[id].filter((f) => f.startsWith(dir) && f.endsWith('.js')) : [];
      const base = engine && engine.assets ? engine.assets.base : new URL('../../', import.meta.url).href;
      const hrefs = /^https?:/.test(base) ? code.map((f) => new URL(f, base).href) : [];
      if (hrefs.length && !(await storedAll(hrefs))) {
        await Promise.all(hrefs.map(async (h, i) => { const r = await fetch(h); if (!r.ok) throw new Error(`${code[i]}: ${r.status}`); }));
      }
    }
    const mod = await importer(def.entry);
    if (mod && typeof mod.register === 'function') reg = await mod.register(engine);
  } catch (e) {
    failed.push(`entry:${def.entry}`);
    s.errors.push(String((e && e.message) || e));
    if (!opts.quiet) console.warn(`[packs] ${id}: ${(e && e.message) || e}`);
  }
  const lists = await filesP;
  const files = lists && lists[id];
  // A data module that index.js skipped as "missing" but that the generated file list says exists is a failed fetch.
  if (reg && Array.isArray(reg.skipped) && Array.isArray(files)) {
    for (const name of reg.skipped) if (files.includes(`src/data/${id}/${name}.js`)) failed.push(`module:${name}`);
  }
  const assets = engine && engine.assets;
  if (!failed.length && assets && typeof assets.loadPackManifest === 'function' && def.assets) {
    try {
      const r = await assets.loadPackManifest(def.assets);
      for (const k of r.failed) failed.push(k);
      const key = `${id}_tiles`;
      if (assets.has(key)) {
        const db = assets.json('tiles', null);
        if (db) {
          const m = mergeTileFragment(db, assets.json(key, null));
          if (m.clashes.length) s.errors.push(`tile ids already defined (kept): ${m.clashes.join(', ')}`);
        }
      }
    } catch (e) {
      failed.push(`manifest:${def.assets}`);
      s.errors.push(String((e && e.message) || e));
    }
  }
  if (!failed.length && engine && engine.audio && typeof engine.audio.loadPack === 'function' && def.audioPack) {
    try { const p = engine.audio.loadPack(def.audioPack); if (p && p.catch) p.catch(() => {}); } catch (e) { /* audio is optional */ }
  }
  const ok = failed.length === 0;
  return { id, ok, failed, skipped: false, ms: Math.round(now() - t0), files: ok && Array.isArray(files) ? files : null, engine };
}

function warm(res, opts) {
  const files = res.files;
  if (opts.warm === false || !files || !files.length || typeof fetch !== 'function') return;
  const engine = res.engine;
  const base = engine && engine.assets ? engine.assets.base : new URL('../../', import.meta.url).href;
  if (!/^https?:/.test(base)) return;
  const queue = files.filter((f) => !/\.(mp3|ogg|wav)$/i.test(f));
  const worker = async () => { while (queue.length) { const f = queue.shift(); try { await fetch(new URL(f, base).href); } catch (e) { /* offline: it will load when used */ } } };
  const go = () => storedAll(queue.map((f) => new URL(f, base).href)).then((all) => { if (!all) for (let i = 0; i < 3; i++) worker(); });
  const idle = () => { if (typeof requestIdleCallback === 'function') requestIdleCallback(go, { timeout: 4000 }); else setTimeout(go, 1500); };
  // Only a fetch that passes through the service worker lands in its runtime cache. On a first visit the worker installs a few
  // seconds after the game is playable, so wait for it to take control (at most 30 s), then warm.
  const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : null;
  if (sw && !sw.controller && typeof sw.addEventListener === 'function' && opts.swWait !== false) {
    let started = false;
    const start = () => { if (!started) { started = true; idle(); } };
    sw.addEventListener('controllerchange', start, { once: true });
    setTimeout(start, 30000);
  } else idle();
}

/**
 * Issue #63: on a first visit the worker takes control seconds after the game is playable, so what loaded before then (title art
 * and music, early sounds, pack_files.json, the ep3 maps ep4 imports) missed its cache. Fetch again through it each same-origin
 * game file this visit used that no cache holds, three at a time, low priority. Never rejects. deps: tests.
 */
export async function refetchUsed(deps = {}) {
  const out = { checked: 0, fetched: 0 };
  try {
    const root = deps.root || location.origin + new URL('../../../', import.meta.url).pathname;   // the repo root: next/ and ../assets/art
    const names = deps.names || performance.getEntriesByType('resource').map((e) => e.name);
    const match = deps.match || ((h) => caches.match(h, { ignoreSearch: true }));
    const get = deps.fetch || ((h) => fetch(h, { priority: 'low' }));
    const seen = new Set();
    const todo = names.filter((h) => {
      const k = h.split('?')[0];
      if (!k.startsWith(root) || k.endsWith('/sw.js') || seen.has(k)) return false;
      seen.add(k); return true;
    });
    out.checked = todo.length;
    const worker = async () => { while (todo.length) { const h = todo.shift(); try { if (!(await match(h))) { out.fetched++; await get(h); } } catch (e) { /* offline */ } } };
    await Promise.all([worker(), worker(), worker()]);
  } catch (e) { /* no performance or caches API */ }
  return out;
}

/** A first visit (no worker in control at boot): run refetchUsed() once, when the idle page is first controlled. */
function armRefetch() {
  const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : null;
  if (refetch.state !== 'idle' || !sw || sw.controller || typeof caches === 'undefined') return;
  refetch.state = 'waiting';
  const go = () => { refetch.state = 'running'; refetchUsed().then((r) => Object.assign(refetch, r, { state: 'done' })); };
  sw.addEventListener('controllerchange', () => (typeof requestIdleCallback === 'function' ? requestIdleCallback(go, { timeout: 4000 }) : setTimeout(go, 1500)), { once: true });
}

/** Load a pack (entry, data, assets, tiles, audio, then an idle warm). Idempotent; retried after a failure; never rejects. */
export function ensurePack(id, opts = {}) {
  opts = { ...defaults, ...opts };
  const def = defOf(id, opts);
  if (!def) return Promise.resolve({ id, ok: false, failed: ['unknown pack'], skipped: false, ms: 0 });
  if (!packEnabled(id, opts)) return Promise.resolve({ id, ok: true, failed: [], skipped: true, ms: 0 });
  const s = st(id);
  if (s.promise) return s.promise;
  const p = attempt(id, def, opts).then((res) => {
    const engine = res.engine;
    const out = { id: res.id, ok: res.ok, failed: res.failed, skipped: false, ms: res.ms };
    s.last = out;
    if (res.ok) {
      s.ready = true; s.autoRetried = false;
      const waiters = s.waiters.splice(0);
      for (const fn of waiters) { try { fn(id); } catch (e) { console.warn('[packs] onPackReady', e); } }
      warm(res, opts);
    } else {
      s.promise = null;                       // the next call tries again
      if (!toasted) { toasted = true; say(engine, FAIL_TOAST); }
      if (!s.autoRetried) {
        s.autoRetried = true;
        s.timer = setTimeout(() => { s.timer = null; ensurePack(id, opts); }, opts.retryMs != null ? opts.retryMs : RETRY_MS);
        if (s.timer && s.timer.unref) s.timer.unref();
      }
    }
    return out;
  }, (e) => {                                  // attempt() should not throw; never reject anyway
    s.promise = null;
    return { id, ok: false, failed: [`error:${(e && e.message) || e}`], skipped: false, ms: 0 };
  });
  s.promise = p;
  return p;
}

function slotFlags(engine) {
  const out = [];
  const save = engine && engine.save;
  const last = save && Number.isFinite(save.slots) ? save.slots : 3;
  for (let n = 0; save && n <= last; n++) {
    try { const env = save.loadEnvelope(n); if (env && env.data && env.data.flags) out.push(env.data.flags); } catch (e) { /* unreadable slot */ }
  }
  return out;
}

/** Warm every pack a save or the running game wants (?pack=x1,x2 forces packs on). No timer while all are off. Returns stop(). */
export function startPackWatch(engine, params) {
  bindPacks(engine);
  armRefetch();
  const q = params && params.get ? params.get('pack') : null;
  if (q) for (const id of q.split(',')) if (PACKS[id.trim()]) forcePack(id.trim());
  const live = () => packIds().filter((id) => packEnabled(id) && !packReady(id));
  if (!live().length) return () => {};
  const asked = new Set();
  const later = new Set();   // wanted side packs (not hard) held until no hard pack is loading (issue #56: they shared the CPU)
  const hardBusy = () => packIds().some((id) => PACKS[id].hard && state[id] && state[id].promise && !state[id].ready);
  const flush = () => {
    if (hardBusy()) return;
    for (const id of later) { later.delete(id); asked.add(id); ensurePack(id); }
  };
  const check = (flags) => {
    for (const id of live()) {
      if (asked.has(id) || later.has(id) || !packWanted(id, flags)) continue;
      if (PACKS[id].hard) { asked.add(id); ensurePack(id).then(flush); } else later.add(id);
    }
    flush();
  };
  for (const id of forced) if (PACKS[id]) { asked.add(id); ensurePack(id); }
  const timers = [];
  timers.push(setTimeout(() => { for (const flags of slotFlags(engine)) check(flags); }, 1200));
  const tick = () => { const g = engine.game; if (g && g.flags) check(g.flags); if (!live().some((id) => !asked.has(id))) stop(); };
  const iv = setInterval(tick, 3000);
  const off = typeof engine.on === 'function' ? engine.on('scene', tick) : null;
  function stop() { clearInterval(iv); timers.forEach(clearTimeout); if (typeof off === 'function') off(); }
  return stop;
}
