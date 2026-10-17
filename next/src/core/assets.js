// Asset loader driven by assets/manifest.json (paths relative to next/):
// {
//   "images":  { "id": "assets/tiles/terrain.png", ... },
//   "atlases": { "id": "assets/sprites/party_field.json", ... },   // JSON with "image" (relative to the JSON)
//   "json":    { "id": "assets/palette.json", ... },
//   "fonts":   { "main": "assets/ui/font.json", "large": "...", "num": "..." }
// }
// An entry may also be { "path": "...", "optional": true }. Ids are file stems by convention.
// Missing assets never crash the game: they log one console.warn and return a visible placeholder.
//
//   assets.img(id)            HTMLImageElement or a magenta checker placeholder
//   assets.atlas(id)          normalized atlas (see normalizeAtlas) or a placeholder atlas
//   assets.json(id, fallback) parsed JSON or fallback (default null)
//   assets.has(id)            true if loaded for real (any kind)

/** URL of the next/ folder (this file lives in next/src/core/). */
export const BASE_URL = new URL('../../', import.meta.url).href;

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

function entryPath(e) { return typeof e === 'string' ? e : e && e.path; }
function entryOptional(e) { return !!(e && typeof e === 'object' && e.optional); }

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
  let placeholderAtlas = null;

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

  const api = {
    base,
    url,
    manifest: null,
    missing,

    /** Fetch a manifest JSON (path relative to next/) and load everything in it. */
    async loadManifest(path = 'assets/manifest.json', onProgress) {
      let m;
      try { m = await loadJson(url(path)); }
      catch (e) { warnOnce('manifest', `manifest not loaded (${e.message}); continuing with no assets`); m = {}; }
      api.manifest = m;
      await api.load(m, onProgress);
      return m;
    },

    /** Load a manifest object (can be called again later for extra assets). onProgress(done, total). */
    async load(m, onProgress) {
      const jobs = [];
      const add = (kind, id, entry, fn) => jobs.push({ kind, id, entry, fn });
      for (const [id, e] of Object.entries(m.images || {})) add('image', id, e, async () => images.set(id, await loadImage(url(entryPath(e)))));
      for (const [id, e] of Object.entries(m.json || {})) add('json', id, e, async () => jsons.set(id, await loadJson(url(entryPath(e)))));
      for (const [id, e] of Object.entries(m.atlases || {})) add('atlas', id, e, async () => {
        const p = entryPath(e);
        const json = await loadJson(url(p));
        let img = null;
        if (json.image) img = await loadImage(new URL(json.image, url(p)).href);
        atlases.set(id, normalizeAtlas(json, img, id));
      });
      for (const [id, e] of Object.entries(m.fonts || {})) add('font', id, e, async () => {
        const p = entryPath(e);
        const json = await loadJson(url(p));
        const img = json.image ? await loadImage(new URL(json.image, url(p)).href) : null;
        fonts.set(id, { def: json, image: img });
      });
      const total = jobs.length;
      let done = 0;
      if (onProgress) onProgress(0, total);
      await Promise.all(jobs.map(async (j) => {
        try { await j.fn(); }
        catch (err) {
          missing.add(`${j.kind}:${j.id}`);
          warnOnce(`${j.kind}:${j.id}`, `${entryOptional(j.entry) ? 'optional ' : ''}${j.kind} "${j.id}" missing (${err.message})`);
        }
        done++;
        if (onProgress) onProgress(done, total);
      }));
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
  };
  return api;
}
