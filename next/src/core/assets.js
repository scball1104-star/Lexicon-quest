// Asset loader driven by assets/manifest.json (paths relative to next/):
// {
//   "images":  { "id": "assets/tiles/terrain.png", ... },
//   "atlases": { "id": "assets/sprites/party_field.json", ... },   // JSON with "image" (relative to the JSON)
//   "json":    { "id": "assets/palette.json", ... },
//   "fonts":   { "main": "assets/ui/font.json", "large": "...", "num": "..." },
//   "lazy":    { "story": ["dialog_keyart"], "world": ["terrain", ...], "battle": [...], "art": [...] }
// }
// An entry may also be { "path": "...", "optional": true }. Ids are file stems by convention.
// Missing assets never crash the game: they log one console.warn and return a visible placeholder.
//
// Load order (W6-pwa): loadManifest() loads every id that is NOT in a "lazy" group (the critical set the
// title needs), then loadLazy() loads the groups one after another in manifest order (world, portraits,
// battle, ...) while the player sits on the title / name entry / prologue. Scenes keep using img() /
// atlas() / has() as before; a lazy asset that has not arrived yet behaves like a missing one (placeholder,
// has() false) and the scenes' existing fallbacks cover that window.
//
//   assets.img(id)            HTMLImageElement or a magenta checker placeholder
//   assets.atlas(id)          normalized atlas (see normalizeAtlas) or a placeholder atlas
//   assets.json(id, fallback) parsed JSON or fallback (default null)
//   assets.has(id)            true if loaded for real (any kind)
//   assets.loadGroup('battle') -> Promise (idempotent), assets.whenLoaded('battle') -> Promise
//   assets.groupState('battle') -> 'pending' | 'loading' | 'done' | 'unknown'
//   assets.criticalMissing()  ['image:town', ...] eager, non-optional entries that failed (plus 'manifest')
//   assets.retryMissing(onProgress) -> Promise: reloads every entry in `missing`

/** URL of the next/ folder (this file lives in next/src/core/). */
export const BASE_URL = new URL('../../', import.meta.url).href;

export const KINDS = ['images', 'json', 'atlases', 'fonts'];
const KIND_NAME = { images: 'image', json: 'json', atlases: 'atlas', fonts: 'font' };

/**
 * Normalize an atlas JSON into { id, image, frames: {name: {x,y,w,h,ox,oy,...extra}}, anims, origin, cell, meta,
 * frame(name), anim(name) }. Frame entries may be [x,y,w,h], [x,y,w,h,ox,oy], or objects
 * { frame|rect: [x,y,w,h], anchor|origin|pivot: [ox,oy] (relative to the frame's top-left), ...extra }.
 * Default origin: the atlas "origin", else bottom-center of the frame. Pure (node-testable).
 */
export function normalizeAtlas(json, image = null, id = 'atlas') {
  const frames = {};
  const origin = Array.isArray(json.origin) ? json.origin : null;
  // Optional per-frame origin table: "origins": { "sparkle_0": [4, 4] } (also accepted as "anchors").
  const origins = json.origins || json.anchors || {};
  const src = json.frames || {};
  const entries = Array.isArray(src) ? src.map((f, i) => [f.name ?? f.id ?? String(i), f]) : Object.entries(src);
  for (const [name, f] of entries) {
    let x = 0, y = 0, w = 0, h = 0, ox, oy, extra = null;
    if (Array.isArray(f)) {
      [x, y, w, h] = f;
      if (f.length >= 6) { ox = f[4]; oy = f[5]; }
    } else if (f && typeof f === 'object') {
      const r = f.frame || f.rect || [f.x, f.y, f.w, f.h];
      [x, y, w, h] = r;
      const a = f.anchor || f.origin || f.pivot;
      if (Array.isArray(a)) { ox = a[0]; oy = a[1]; }
      extra = f;
    } else continue;
    if (ox === undefined && Array.isArray(origins[name])) { ox = origins[name][0]; oy = origins[name][1]; }
    if (ox === undefined) {
      if (origin) { ox = origin[0]; oy = origin[1]; }
      else { ox = Math.floor(w / 2); oy = h - 1; }
    }
    const rec = { x, y, w, h, ox, oy, name };
    if (extra) for (const k of Object.keys(extra)) if (!(k in rec) && k !== 'frame' && k !== 'rect') rec[k] = extra[k];
    frames[name] = rec;
  }
  const atlas = {
    id, image, frames, anims: json.anims || {}, origin, cell: json.cell || null, meta: json,
    frame(name) { return frames[name] || null; },
    anim(name) { return atlas.anims[name] || null; },
    has(name) { return !!frames[name]; },
  };
  return atlas;
}

/**
 * Frame name of an animation at time t (seconds). anim: { frames: [...], fps, loop }.
 * Non-looping animations hold their last frame. Pure.
 */
export function animFrameAt(anim, t) {
  if (!anim || !anim.frames || !anim.frames.length) return null;
  const n = anim.frames.length;
  const i = Math.floor(Math.max(0, t) * (anim.fps || 8));
  return anim.frames[anim.loop === false ? Math.min(i, n - 1) : i % n];
}

export function entryPath(e) { return typeof e === 'string' ? e : e && e.path; }
export function entryOptional(e) { return !!(e && typeof e === 'object' && e.optional); }

/**
 * Split a manifest into the eager part and its lazy groups. Pure (node-testable).
 * Returns { eager: {images, json, atlases, fonts}, groups: [{ name, manifest, ids }], lazyIds: Set }.
 * Ids listed under "lazy" that no kind defines are ignored (reported in `unknown`).
 */
export function splitManifest(m) {
  const lazy = (m && m.lazy && typeof m.lazy === 'object') ? m.lazy : {};
  const lazyIds = new Set();
  const unknown = [];
  const groups = [];
  for (const [name, ids] of Object.entries(lazy)) {
    const gm = { images: {}, json: {}, atlases: {}, fonts: {} };
    const found = [];
    for (const id of Array.isArray(ids) ? ids : []) {
      let hit = false;
      for (const kind of KINDS) {
        if (m[kind] && Object.prototype.hasOwnProperty.call(m[kind], id)) { gm[kind][id] = m[kind][id]; hit = true; }
      }
      if (hit) { lazyIds.add(id); found.push(id); } else unknown.push(`${name}:${id}`);
    }
    groups.push({ name, manifest: gm, ids: found });
  }
  const eager = { images: {}, json: {}, atlases: {}, fonts: {} };
  for (const kind of KINDS) {
    for (const [id, e] of Object.entries((m && m[kind]) || {})) if (!lazyIds.has(id)) eager[kind][id] = e;
  }
  return { eager, groups, lazyIds, unknown };
}

/** Number of load jobs a manifest object describes (one per entry, any kind). Pure. */
export function countJobs(m) {
  let n = 0;
  for (const kind of KINDS) n += Object.keys((m && m[kind]) || {}).length;
  return n;
}

let placeholderImg = null;
function placeholder() {
  if (placeholderImg) return placeholderImg;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  const g = c.getContext('2d');
  for (let y = 0; y < 16; y += 4) for (let x = 0; x < 16; x += 4) {
    g.fillStyle = ((x + y) / 4) % 2 ? '#ff00ff' : '#200020';
    g.fillRect(x, y, 4, 4);
  }
  placeholderImg = c;
  return c;
}

export function createAssets(opts = {}) {
  const base = opts.base || BASE_URL;
  const log = opts.log || ((...a) => console.warn('[assets]', ...a));
  const images = new Map(), atlases = new Map(), jsons = new Map(), fonts = new Map();
  const missing = new Set();
  const warned = new Set();
  const groupPromises = new Map();   // group name -> Promise
  const groupStates = new Map();     // group name -> 'pending' | 'loading' | 'done'
  let placeholderAtlas = null;
  let split = null;                  // splitManifest(api.manifest)
  let lazyAll = null;                // Promise from loadLazy()

  const url = (p) => new URL(p, base).href;

  function warnOnce(key, msg) {
    if (warned.has(key)) return;
    warned.add(key);
    log(msg);
  }

  function loadImage(href) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        if (img.decode) img.decode().then(() => resolve(img), () => resolve(img));
        else resolve(img);
      };
      img.onerror = () => reject(new Error(`image failed: ${href}`));
      img.src = href;
    });
  }
  async function loadJson(href) {
    const res = await fetch(href, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${href}`);
    return res.json();
  }

  const stores = { images, json: jsons, atlases, fonts };
  function loadedKind(kind, id) { return stores[kind].has(id); }

  const api = {
    base,
    url,
    manifest: null,
    missing,
    /** Set when the manifest JSON itself could not be fetched (offline first visit, bad deploy). */
    manifestError: null,
    /** Promise for the parsed manifest JSON (resolves to {} when it could not be fetched). Set by loadManifest(). */
    manifestReady: null,

    /**
     * Fetch a manifest JSON (path relative to next/) and load its EAGER entries (everything not in a lazy
     * group). onProgress(done, total) counts load jobs. Lazy groups load later via loadLazy() / loadGroup().
     */
    async loadManifest(path = 'assets/manifest.json', onProgress) {
      let m;
      let resolveReady;
      api.manifestReady = new Promise((r) => { resolveReady = r; });
      api.manifestError = null;
      try { m = await loadJson(url(path)); missing.delete('manifest'); }
      catch (e) {
        api.manifestError = e;
        missing.add('manifest');
        warnOnce('manifest', `manifest not loaded (${e.message}); continuing with no assets`);
        m = {};
      }
      api.manifest = m;
      api.manifestPath = path;
      resolveReady(m);
      split = splitManifest(m);
      for (const u of split.unknown) warnOnce(`lazy:${u}`, `manifest lazy group lists unknown id ${u}`);
      for (const g of split.groups) if (!groupStates.has(g.name)) groupStates.set(g.name, 'pending');
      await api.load(split.eager, onProgress);
      return m;
    },

    /**
     * Load a manifest object (can be called again later for extra assets). onProgress(done, total).
     * Entries already loaded under the same kind and id are skipped unless opts.force.
     */
    async load(m, onProgress, o = {}) {
      const jobs = [];
      const add = (kind, id, entry, fn) => {
        if (!o.force && loadedKind(kind, id)) return;
        jobs.push({ kind: KIND_NAME[kind], id, entry, fn });
      };
      for (const [id, e] of Object.entries(m.images || {})) add('images', id, e, async () => images.set(id, await loadImage(url(entryPath(e)))));
      for (const [id, e] of Object.entries(m.json || {})) add('json', id, e, async () => jsons.set(id, await loadJson(url(entryPath(e)))));
      for (const [id, e] of Object.entries(m.atlases || {})) add('atlases', id, e, async () => {
        const p = entryPath(e);
        const json = await loadJson(url(p));
        let img = null;
        if (json.image) img = await loadImage(new URL(json.image, url(p)).href);
        atlases.set(id, normalizeAtlas(json, img, id));
      });
      for (const [id, e] of Object.entries(m.fonts || {})) add('fonts', id, e, async () => {
        const p = entryPath(e);
        const json = await loadJson(url(p));
        const img = json.image ? await loadImage(new URL(json.image, url(p)).href) : null;
        fonts.set(id, { def: json, image: img });
      });
      const total = jobs.length;
      let done = 0;
      if (onProgress) onProgress(0, total);
      await Promise.all(jobs.map(async (j) => {
        const key = `${j.kind}:${j.id}`;
        try { await j.fn(); missing.delete(key); }
        catch (err) {
          missing.add(key);
          warnOnce(key, `${entryOptional(j.entry) ? 'optional ' : ''}${j.kind} "${j.id}" missing (${err.message})`);
        }
        done++;
        if (onProgress) onProgress(done, total);
      }));
      return { done, total };
    },

    // ---------------------------------------------------------------- lazy groups
    /** Names of the lazy groups in manifest order. */
    groupNames() { return split ? split.groups.map((g) => g.name) : []; },
    /** 'pending' | 'loading' | 'done' | 'unknown'. */
    groupState(name) { return groupStates.get(name) || 'unknown'; },
    /** True when the id is listed in a lazy group. */
    isLazy(id) { return !!(split && split.lazyIds.has(id)); },
    /** Group an id belongs to, or null. */
    groupOf(id) {
      if (!split) return null;
      for (const g of split.groups) if (g.ids.includes(id)) return g.name;
      return null;
    },
    /** Load one lazy group (idempotent). Resolves to { done, total } (or null for an unknown group). */
    loadGroup(name, onProgress) {
      if (groupPromises.has(name)) return groupPromises.get(name);
      const g = split && split.groups.find((x) => x.name === name);
      if (!g) { warnOnce(`group:${name}`, `loadGroup("${name}"): no such lazy group`); return Promise.resolve(null); }
      groupStates.set(name, 'loading');
      const p = api.load(g.manifest, onProgress).then((r) => { groupStates.set(name, 'done'); return r; });
      groupPromises.set(name, p);
      return p;
    },
    /** Load every lazy group one after another in manifest order (priority). Idempotent. onProgress(done, total, group). */
    loadLazy(onProgress) {
      if (lazyAll) return lazyAll;
      lazyAll = (async () => {
        const groups = split ? split.groups : [];
        const total = groups.reduce((n, g) => n + countJobs(g.manifest), 0);
        let base_ = 0;
        for (const g of groups) {
          const n = countJobs(g.manifest);
          await api.loadGroup(g.name, (d) => { if (onProgress) onProgress(base_ + d, total, g.name); });
          base_ += n;
        }
        if (onProgress) onProgress(total, total, null);
        return { total };
      })();
      return lazyAll;
    },
    /** Promise that resolves when the group is loaded (starts it when nobody has). */
    whenLoaded(name) { return api.loadGroup(name).then(() => true); },
    /** True once every lazy group has finished. */
    lazyDone() { return !!split && split.groups.every((g) => groupStates.get(g.name) === 'done'); },

    // ---------------------------------------------------------------- failures and retry
    /** Eager, non-optional entries that failed ('kind:id'), plus 'manifest' when the manifest did not load. */
    criticalMissing() {
      const out = [];
      if (missing.has('manifest')) out.push('manifest');
      if (!split) return out;
      for (const key of missing) {
        if (key === 'manifest') continue;
        const i = key.indexOf(':');
        const kindName = key.slice(0, i), id = key.slice(i + 1);
        const kind = Object.keys(KIND_NAME).find((k) => KIND_NAME[k] === kindName);
        const e = kind && split.eager[kind][id];
        if (e !== undefined && !entryOptional(e)) out.push(key);
      }
      return out;
    },
    /** Reload every entry in `missing` (the manifest itself first when it failed). onProgress(done, total). */
    async retryMissing(onProgress) {
      if (missing.has('manifest') || !api.manifest || !split) {
        await api.loadManifest(api.manifestPath || 'assets/manifest.json', onProgress);
        return { retried: true };
      }
      const m = { images: {}, json: {}, atlases: {}, fonts: {} };
      const all = { images: {}, json: {}, atlases: {}, fonts: {} };
      for (const kind of KINDS) {
        Object.assign(all[kind], split.eager[kind]);
        for (const g of split.groups) if (groupStates.get(g.name) !== 'pending') Object.assign(all[kind], g.manifest[kind]);
      }
      let n = 0;
      for (const key of [...missing]) {
        const i = key.indexOf(':');
        const kindName = key.slice(0, i), id = key.slice(i + 1);
        const kind = Object.keys(KIND_NAME).find((k) => KIND_NAME[k] === kindName);
        if (kind && all[kind][id] !== undefined) { m[kind][id] = all[kind][id]; n++; }
      }
      if (!n) { if (onProgress) onProgress(0, 0); return { retried: false }; }
      // The earlier failures were logged once; a retry that fails again should say so again.
      for (const key of [...missing]) warned.delete(key);
      await api.load(m, onProgress, { force: true });
      return { retried: true, count: n };
    },

    /** Load a single image by URL path at runtime (cached by id). */
    async loadImage(id, path) {
      try { const img = await loadImage(url(path)); images.set(id, img); return img; }
      catch (e) { missing.add(`image:${id}`); warnOnce(`image:${id}`, `image "${id}" missing (${e.message})`); return placeholder(); }
    },

    img(id) {
      const i = images.get(id);
      if (i) return i;
      const a = atlases.get(id);
      if (a && a.image) return a.image;
      warnOnce(`img:${id}`, `img("${id}") not loaded; using placeholder`);
      return placeholder();
    },
    atlas(id) {
      const a = atlases.get(id);
      if (a) return a;
      warnOnce(`atlas:${id}`, `atlas("${id}") not loaded; using placeholder`);
      if (!placeholderAtlas) {
        const ph = { x: 0, y: 0, w: 16, h: 16, ox: 8, oy: 15, name: 'placeholder', placeholder: true };
        placeholderAtlas = {
          id: 'placeholder', image: placeholder(), frames: new Proxy({}, { get: () => ph }), anims: {}, origin: null,
          cell: [16, 16], meta: {}, placeholder: true,
          frame: () => ph, anim: () => null, has: () => false,
        };
      }
      return placeholderAtlas;
    },
    json(id, fallback = null) {
      if (jsons.has(id)) return jsons.get(id);
      warnOnce(`json:${id}`, `json("${id}") not loaded`);
      return fallback;
    },
    font(id) { return fonts.get(id) || null; },
    fontIds() { return [...fonts.keys()]; },
    has(id) { return images.has(id) || atlases.has(id) || jsons.has(id) || fonts.has(id); },
    ids(kind) {
      const m = { image: images, atlas: atlases, json: jsons, font: fonts }[kind];
      return m ? [...m.keys()] : [...images.keys(), ...atlases.keys(), ...jsons.keys(), ...fonts.keys()];
    },
    /** Register an already-built image/canvas under an id (generated textures). */
    setImage(id, img) { images.set(id, img); },
    setAtlas(id, json, img) { const a = normalizeAtlas(json, img, id); atlases.set(id, a); return a; },
    setJson(id, data) { jsons.set(id, data); },
    /** Snapshot for LQ_DEBUG.state(): groups and their states, missing ids. */
    debugState() {
      const groups = {};
      for (const [k, v] of groupStates) groups[k] = v;
      return { groups, missing: [...missing], critical: api.criticalMissing(), manifest: !!api.manifest && !api.manifestError };
    },
  };
  return api;
}
