// Moving paintings (docs/MEDIA_BUILD.md 5): a short looped clip drawn in place of a painted still, in the four places
// Scott approved (the title attract loop, the episode ending cards, the Deep Stacks B100 clear, three battle stages).
// Lazy: ui/keyart.js imports this module the first time one of those paintings is drawn, never before, never for
// reduce motion. The build is lazy and runtime-cached too (tools/pwa/build_pwa.py LAZY_PREFIXES).
//
// How a frame is made: a hidden, detached <video muted playsinline loop> plays assets/clips/<id>.webm (fetched whole
// as a blob, so the service worker caches it like any lazy file and no Range request is involved). On each new video
// frame the pixels are read back and RE-DITHERED to the still's own colours (a 6-bit RGB lookup of the nearest two
// colours in OKLab, the pixel's projection along that pair, the Bayer 4x4 threshold fixed to the pixel grid: build.py),
// which undoes VP9's chroma smear and keeps every pixel on the painting's palette. The palette indices then go through
// keyart.js composeFrame, so drift, darkening and the vignette work exactly as on the still. The first DISSOLVE frames
// dissolve from the still into the video on the same Bayer grid, so the swap never pops.
//
// The still is the first frame and the fallback: layer() returns null (the caller draws the still) until the clip is
// playing, and forever when the clip is missing from assets/clips/clips.json, fails to fetch or decode, or the browser
// cannot play VP9. A clip not drawn for PAUSE_MS pauses (the scene left); after RELEASE_MS it is unloaded. A hidden tab
// pauses everything. Pure parts (clipUrl, buildLut, redither) are node-tested in qa/ui/clips.test.mjs.

import { composeFrame, BACKDROP_DRIFT, CLIP_IDS, clipUrl } from '../keyart.js';

export { CLIP_IDS, clipUrl };
export const DISSOLVE = 8;          // video frames from the still into the clip
export const MAX_PAIR = 0.14;       // as quantize_still.py: colours further apart than this are never dithered
export const HOLD = 0.2;            // temporal hysteresis of the re-dither (build_clips.py HOLD)
const PAUSE_MS = 400, RELEASE_MS = 10000;
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// ---------------------------------------------------------------- the re-dither (pure)
function lin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }
/** sRGB 0..255 -> OKLab [L, a, b] (build.py to_oklab). */
export function oklab(r, g, b) {
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

/** A lazy lookup for one colour list (packed 0xRRGGBB): cells of 6 bits per channel, filled on first use. */
export function buildLut(colors) {
  const n = colors.length, lab = new Float32Array(n * 3), rgb = new Float32Array(n * 3);
  colors.forEach((c, i) => { lab.set(oklab(c >> 16, (c >> 8) & 255, c & 255), i * 3); rgb.set([c >> 16, (c >> 8) & 255, c & 255], i * 3); });
  // pair table: for i1 * n + i2, the sRGB direction i1 -> i2 and 16 / |direction|^2 (filled with the cells)
  return { colors, lab, rgb, cells: new Int32Array(1 << 18).fill(-1), pairs: new Float32Array(n * n * 4) };
}

/** The cell's pair: i1 | i2 << 8, the nearest two colours in OKLab (i2 = i1 when the pair is too far apart to dither). */
function cellOf(lut, key) {
  const [L, A, B] = oklab(((key >> 12) << 2) + 2, (((key >> 6) & 63) << 2) + 2, ((key & 63) << 2) + 2);
  const p = lut.lab, n = lut.colors.length;
  let i1 = 0, i2 = 0, d1 = Infinity, d2 = Infinity;
  for (let i = 0; i < n; i++) {
    const dl = L - p[i * 3], da = A - p[i * 3 + 1], db = B - p[i * 3 + 2];
    const d = dl * dl + da * da + db * db;
    if (d < d1) { d2 = d1; i2 = i1; d1 = d; i1 = i; } else if (d < d2) { d2 = d; i2 = i; }
  }
  const vl = p[i2 * 3] - p[i1 * 3], va = p[i2 * 3 + 1] - p[i1 * 3 + 1], vb = p[i2 * 3 + 2] - p[i1 * 3 + 2];
  if (n < 2 || Math.sqrt(vl * vl + va * va + vb * vb) > MAX_PAIR) i2 = i1;
  if (i2 !== i1) {
    const c = lut.rgb, q = (i1 * n + i2) * 4, dr = c[i2 * 3] - c[i1 * 3], dg = c[i2 * 3 + 1] - c[i1 * 3 + 1], dB = c[i2 * 3 + 2] - c[i1 * 3 + 2];
    lut.pairs[q] = dr; lut.pairs[q + 1] = dg; lut.pairs[q + 2] = dB; lut.pairs[q + 3] = 16 / (dr * dr + dg * dg + dB * dB);
  }
  return (lut.cells[key] = i1 | (i2 << 8));
}

/**
 * RGBA pixels -> palette indices into `out` (Uint16Array W*H). The cell gives the pair; the pixel's own projection
 * along it (sRGB) against the Bayer threshold of its grid cell picks one, so a dither the encoder blurred comes back
 * as the same pattern and a palette pixel comes back as itself. hold (0..1, with `out` holding the previous frame):
 * a pixel whose projection is within `hold` of its threshold keeps last frame's colour when that is one of the pair,
 * so encoder noise does not make the dither boil.
 */
export function redither(lut, data, W, H, out, hold = 0) {
  const m = hold * 16, c = lut.rgb, P = lut.pairs, cells = lut.cells, n = lut.colors.length;
  for (let y = 0, i = 0; y < H; y++) {
    const by = (y & 3) << 2;
    for (let x = 0; x < W; x++, i++) {
      const p = i << 2, r = data[p], g = data[p + 1], b = data[p + 2];
      const key = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
      let v = cells[key];
      if (v < 0) v = cellOf(lut, key);
      const i1 = v & 255, i2 = v >> 8;
      if (i1 === i2) { out[i] = i1; continue; }
      const a = i1 * 3, q = (i1 * n + i2) * 4;
      const e = ((r - c[a]) * P[q] + (g - c[a + 1]) * P[q + 1] + (b - c[a + 2]) * P[q + 2]) * P[q + 3] - BAYER4[by + (x & 3)] - 0.5;
      const was = out[i];
      out[i] = m && e < m && e > -m && (was === i1 || was === i2) ? was : e > 0 ? i2 : i1;
    }
  }
  return out;
}

/** Bayer dissolve: step k of n (0 = all `from`, n = all `to`). Pure. */
export function dissolve(from, to, W, H, k, n, out) {
  for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) out[i] = BAYER4[((y & 3) << 2) + (x & 3)] < (k * 16) / n ? to[i] : from[i];
  return out;
}

// ---------------------------------------------------------------- players
const clips = new Map();     // id -> clip record
let manifest = null;         // Promise<{ clips: {id: {...}}, fps }>
let vp9 = null;
let timer = 0;

function canPlay() {
  if (vp9 === null) {
    try { vp9 = typeof document !== 'undefined' && !!document.createElement('video').canPlayType('video/webm; codecs="vp9"'); } catch (e) { vp9 = false; }
  }
  return vp9;
}

function href(r, path) { return r.assets && r.assets.url ? r.assets.url(path) : path; }

function loadManifest(r) {
  if (!manifest) {
    manifest = fetch(href(r, 'assets/clips/clips.json')).then((res) => (res.ok ? res.json() : null)).catch(() => null)
      .then((m) => (m && m.clips ? m : { clips: {}, fps: 12 }));
  }
  return manifest;
}

function release(c) {
  const v = c.video;
  if (v) { try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) { /* ignore */ } }
  if (c.url) { try { URL.revokeObjectURL(c.url); } catch (e) { /* ignore */ } }
  c.video = null; c.url = null;
}

function tick() {
  const now = performance.now();
  for (const [id, c] of clips) {
    if (c.state !== 'ready') continue;
    const idle = now - c.lastUse;
    if (idle > RELEASE_MS) { release(c); clips.delete(id); } else if (idle > PAUSE_MS && !c.video.paused) c.video.pause();
  }
  if (![...clips.values()].some((c) => c.state === 'ready' || c.state === 'loading')) { clearInterval(timer); timer = 0; }
}

function pauseAll() { for (const c of clips.values()) if (c.video && !c.video.paused) c.video.pause(); }
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.hidden) pauseAll(); });

function start(r, id) {
  const c = { id, state: 'loading', video: null, url: null, lastUse: performance.now(), f: -1, key: '', n: 0, seen: 0, layer: null, idx: null, vid: null, lut: null, fps: 12 };
  clips.set(id, c);
  if (!timer) timer = setInterval(tick, 250);
  const fail = () => { if (c.state !== 'gone') { release(c); c.state = 'failed'; } };
  loadManifest(r).then(async (m) => {
    if (!m.clips[id]) { c.state = 'failed'; return; }
    c.fps = m.fps || 12;
    const res = await fetch(href(r, clipUrl(id)));
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    if (c.state !== 'loading') return;
    const v = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    v.addEventListener('error', fail);
    v.addEventListener('loadeddata', () => { if (c.state === 'loading') c.state = 'ready'; }, { once: true });
    c.video = v;
    c.url = URL.createObjectURL(blob);
    v.src = c.url;
  }).catch(fail);
  return c;
}

function grab(c, prep) {
  const { W, H } = prep, v = c.video;
  if (!c.read) {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    c.read = cv.getContext('2d', { willReadFrequently: true });
    c.read.imageSmoothingEnabled = false;
    c.vid = new Uint16Array(W * H); c.idx = new Uint16Array(W * H);
  }
  c.read.drawImage(v, 0, 0, W, H);
  const data = c.read.getImageData(0, 0, W, H).data;
  if (!c.lut || c.lut.colors !== prep.colors) c.lut = buildLut(prep.colors);
  redither(c.lut, data, W, H, c.vid, c.seen ? HOLD : 0);
  if (c.seen < DISSOLVE) dissolve(prep.idx, c.vid, W, H, ++c.seen, DISSOLVE, c.idx);
  else c.idx.set(c.vid);
}

/**
 * The composed layer of the clip for this painting this frame (r.drawLayer it), or null to draw the still. `prep` is
 * keyart.js's prepared still ({ W, H, idx, colors, rungs, vig }); `o` the drawBackdrop options. layer.n counts frames.
 */
export function layer(r, id, prep, o = {}) {
  if (!prep || !CLIP_IDS.includes(id) || !canPlay() || (r.settings && r.settings.reduceMotion)) {
    const c = clips.get(id);
    if (c && c.video && !c.video.paused) c.video.pause();
    return null;
  }
  const c = clips.get(id) || start(r, id);
  c.lastUse = performance.now();
  if (c.state !== 'ready' || !c.video || prep.W !== 384 || prep.H !== 216) return null;
  const v = c.video;
  if (v.paused && !(typeof document !== 'undefined' && document.hidden)) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
  if (v.readyState < 2 || v.videoWidth !== prep.W) return c.layer;
  const f = Math.floor(v.currentTime * c.fps + 0.01);
  const ox = Math.max(-BACKDROP_DRIFT, Math.min(BACKDROP_DRIFT, Math.round(o.ox || 0)));
  const oy = Math.max(-BACKDROP_DRIFT, Math.min(BACKDROP_DRIFT, Math.round(o.oy || 0)));
  const q = (x) => Math.round((x || 0) * 16) / 16;
  const band = o.band && o.band.h > 0 ? { y: Math.round(o.band.y), h: Math.round(o.band.h), dark: q(o.band.dark), alpha: q(o.band.alpha ?? 1) } : null;
  const key = `${ox},${oy}|${q(o.dark)}|${o.vignette ? 1 : 0}|${band ? `${band.y},${band.h},${band.dark},${band.alpha}` : ''}`;
  if (f === c.f && key === c.key && c.layer) return c.layer;
  if (f !== c.f) grab(c, prep);
  c.f = f; c.key = key;
  if (!c.layer) { c.layer = r.createLayer(prep.W, prep.H); c.img = c.layer.ctx.createImageData(prep.W, prep.H); }
  if (!ox && !oy && !q(o.dark) && !o.vignette && !band) {      // the battle stage: palette indices straight to pixels
    if (!c.rgba || c.rgbaFor !== prep.colors) { c.rgba = Uint32Array.from(prep.colors, (k) => (255 << 24 | (k & 255) << 16 | (k & 0xff00) | k >> 16) >>> 0); c.rgbaFor = prep.colors; c.px = new Uint32Array(c.img.data.buffer); }
    for (let i = 0; i < c.idx.length; i++) c.px[i] = c.rgba[c.idx[i]];
  } else composeFrame({ W: prep.W, H: prep.H, idx: c.idx, colors: prep.colors, rungs: prep.rungs }, c.img.data, { ox, oy, dark: q(o.dark), vignette: !!o.vignette, band, vig: prep.vig });
  c.layer.ctx.putImageData(c.img, 0, 0);
  c.layer.n = ++c.n;
  return c.layer;
}

/** QA and tests: the state of every clip ({ id: { state, playing, frame, n } }). */
export function clipState() {
  const out = {};
  for (const [id, c] of clips) out[id] = { state: c.state, playing: !!(c.video && !c.video.paused), frame: c.f, n: c.n, seen: c.seen };
  return out;
}
