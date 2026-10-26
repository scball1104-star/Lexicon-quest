// Expansion packs (x1, x2): files with a prefix that are kept out of the initial download and loaded by ensurePack(id) on first need;
// their data registers by mutation (src/data/<id>/index.js). API and rules: docs/PWA_PACKS.md. Pure enough for Node (opts.importer).
// ensurePack never rejects and never blocks boot; while X1_LIVE / X2_LIVE are false nothing here fetches anything.

import { X1_LIVE } from '../data/x1/live.js';
import { X2_LIVE } from '../data/x2/live.js';

export const PACKS = {
  x1: { entry: '../data/x1/index.js', prefix: 'x1_', assets: 'assets/x1_manifest.json', audioPack: 'x1',
        touches: ['valley', 'willowmere', 'archive_f1', 'archive_f2', 'archive_f3'],
        wanted: (flags) => !!flags.first_fight_done, enabled: () => X1_LIVE },
  x2: { entry: '../data/x2/index.js', prefix: 'x2_', assets: 'assets/x2_manifest.json', audioPack: 'ep2',
        touches: ['east_road', 'nameless_hollow', 'nh_chapel', 'court_f1', 'court_f2', 'court_f3'],
        wanted: (flags) => !!flags.ep1_complete, enabled: () => X2_LIVE },
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
  if (typeof window !== 'undefined') window.LQ_PACKS = { PACKS, ensurePack, packReady, packState, forcePack, awaitPacks };
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

// ---------------------------------------------------------------- tiles fragment
/**
 * Merge a pack's tile fragment (assets/tiles/<id>_tiles.json, same shape as tiles.json) into the live tile database, IN
 * PLACE (the tile map holds the object). Never overwrites an id the database already has (reported in `clashes`).
 * terrainOrder is appended without duplicates. Pure. Returns { added, clashes: ['terrains.peat', ...] }.
 */
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

// ---------------------------------------------------------------- ensurePack
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
      const code = lists0 && Array.isArray(lists0[id]) ? lists0[id].filter((f) => f.startsWith(`src/data/${id}/`) && f.endsWith('.js')) : [];
      const base = engine && engine.assets ? engine.assets.base : new URL('../../', import.meta.url).href;
      if (code.length && /^https?:/.test(base)) {
        await Promise.all(code.map(async (f) => { const r = await fetch(new URL(f, base).href); if (!r.ok) throw new Error(`${f}: ${r.status}`); }));
      }
    }
    const mod = await importer(def.entry);
    if (mod && typeof mod.register === 'function') reg = await mod.register();
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
  const go = () => { for (let i = 0; i < 3; i++) worker(); };
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
 * Load a pack: import its entry, register its data, load its asset fragment, merge its tiles, start its audio pack, then
 * (idle) warm every file so the service worker's runtime cache holds the whole pack for offline play.
 * Idempotent: repeat calls return the same promise while it is loading or has succeeded. After a failure the next call
 * (and one automatic retry after 5 s) tries again. Resolves { id, ok, failed, skipped, ms }; never rejects.
 * opts (tests and QA): engine, importer(path), packFiles, table, enabled, warm:false, retryMs, quiet.
 */
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

// ---------------------------------------------------------------- the watchers (main.js)
function slotFlags(engine) {
  const out = [];
  const save = engine && engine.save;
  const last = save && Number.isFinite(save.slots) ? save.slots : 3;
  for (let n = 0; save && n <= last; n++) {
    try { const env = save.loadEnvelope(n); if (env && env.data && env.data.flags) out.push(env.data.flags); } catch (e) { /* unreadable slot */ }
  }
  return out;
}

/**
 * Warm in the background: once after the title is up for every pack any save slot wants, and again the moment a running game
 * first satisfies wanted(flags) (checked on every scene change and every 3 s). Does nothing at all, not even a timer, while
 * every pack is disabled. `params` is a URLSearchParams: ?pack=x1,x2 forces packs on (QA). Returns a stop() function.
 */
export function startPackWatch(engine, params) {
  bindPacks(engine);
  const q = params && params.get ? params.get('pack') : null;
  if (q) for (const id of q.split(',')) if (PACKS[id.trim()]) forcePack(id.trim());
  const live = () => packIds().filter((id) => packEnabled(id) && !packReady(id));
  if (!live().length) return () => {};
  const asked = new Set();
  const check = (flags) => {
    for (const id of live()) if (!asked.has(id) && packWanted(id, flags)) { asked.add(id); ensurePack(id); }
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
