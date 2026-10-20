// Key art backdrops for the title, name entry, prologue, title cards and credits.
//
// Preferred source: the palette-quantized 384x216 stages in assets/backdrops (manifest atlases `title` and
// `dialog_keyart`, see assets/backdrops/README.md). They sit at the same pixel density as the tiles and
// sprites (CRITIQUE_1 C1), so they are drawn 1:1 with nearest-neighbor and never scaled. A slow drift of at
// most 2 px is kept by sliding the image by whole pixels and replicating its edge column/row into the strip
// that opens up. Fallback when the atlas is missing: the old runtime crop of ../assets/art/environments.webp
// (2 columns x 4 rows; cell 0 = Willowmere).
//
// Darkening (CRITIQUE_2 D1): the vignette, the flat `dark` tint and the prologue's text band are NOT alpha
// blended (that multiplied the 78 backdrop colours into thousands). Every pixel is instead mapped to one of
// the backdrop's OWN colours: each colour gets a ladder of darker palette colours (DARK_LEVELS brightness
// steps, nearest strictly darker colour in the image), and the wanted darkness per screen pixel picks a rung,
// with a Bayer 4x4 ordered dither between neighbouring rungs where the amount is fractional (the vignette).
// A flat `dark` that lands exactly on a rung (DARK.one .. DARK.five) draws with no dither pattern at all.
// The composed frame is cached per (backdrop, drift offset, darkening), so the per-pixel pass runs only when
// the drift steps, not every frame.
//
//   const art = new KeyArt(engine, { backdrop: 'title', cell: 0 });   // atlas id + fallback cell
//   art.update(dt); art.draw(r, { dark: DARK.one, vignette: true });
//   drawBackdrop(r, 'dialog_keyart', { ox, oy, dark, vignette, band })  // one-off; false when missing
//   drawKeyArt(r, cell, { ox, oy, dark, vignette, zoom })               // the crop fallback (no drift state)
//
//   dark:     0..1 (alpha of an ink tint, as before). DARK.one .. DARK.five are the rung-exact values.
//   vignette: true adds the radial + bottom falloff (dithered between rungs).
//   band:     { y, h, dark, alpha } darkens rows y..y+h by `dark` (times alpha): the prologue's text strip.

const COLS = 2, ROWS = 4;
export const BACKDROP_DRIFT = 2;     // max px a quantized backdrop slides (per axis)

/** Brightness multiplier of each darkening rung (rung 0 = the backdrop as painted). Roughly geometric. */
export const DARK_LEVELS = [1, 0.78, 0.6, 0.45, 0.32, 0.2];
/** `dark` values that land exactly on a rung (no dither pattern): alpha = 1 - DARK_LEVELS[i]. */
export const DARK = { none: 0, one: 0.22, two: 0.4, three: 0.55, four: 0.68, five: 0.8 };

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** Darkening alpha (0..1) -> rung units (0..DARK_LEVELS.length - 1, fractional between rungs). */
export function darkUnits(alpha) {
  const b = 1 - Math.max(0, Math.min(1, alpha || 0));
  const L = DARK_LEVELS;
  if (b >= L[0]) return 0;
  for (let i = 0; i < L.length - 1; i++) {
    if (b <= L[i] && b >= L[i + 1]) return i + (L[i] - b) / (L[i] - L[i + 1]);
  }
  return L.length - 1;
}

// ---------------------------------------------------------------- vignette (alpha blended, crop fallback only)
let vignetteLayer = null;
function vignette(r) {
  if (vignetteLayer && vignetteLayer.w === r.W) return vignetteLayer;
  const L = r.createLayer(r.W, r.H);
  const g = L.ctx;
  const rg = g.createRadialGradient(r.W / 2, r.H * 0.42, r.H * 0.35, r.W / 2, r.H * 0.5, r.W * 0.72);
  rg.addColorStop(0, 'rgba(8,6,16,0)');
  rg.addColorStop(0.6, 'rgba(8,6,16,0.28)');
  rg.addColorStop(1, 'rgba(8,6,16,0.82)');
  g.fillStyle = rg; g.fillRect(0, 0, r.W, r.H);
  const lg = g.createLinearGradient(0, r.H * 0.55, 0, r.H);
  lg.addColorStop(0, 'rgba(8,6,16,0)'); lg.addColorStop(1, 'rgba(8,6,16,0.55)');
  g.fillStyle = lg; g.fillRect(0, 0, r.W, r.H);
  vignetteLayer = L;
  return L;
}

/** The same falloff as the gradient vignette, as rung units per screen pixel (computed once per size). */
let vignetteUnits = null;
function vignetteTable(W, H) {
  if (vignetteUnits && vignetteUnits.W === W && vignetteUnits.H === H) return vignetteUnits.t;
  const t = new Float32Array(W * H);
  const cx = W / 2, cy = H * 0.42, r0 = H * 0.35, r1 = W * 0.72;
  for (let y = 0; y < H; y++) {
    const lin = y > H * 0.55 ? ((y - H * 0.55) / (H * 0.45)) * 0.55 : 0;
    for (let x = 0; x < W; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const k = Math.max(0, Math.min(1, (d - r0) / (r1 - r0)));
      const rad = k < 0.6 ? (k / 0.6) * 0.28 : 0.28 + ((k - 0.6) / 0.4) * (0.82 - 0.28);
      t[y * W + x] = darkUnits(1 - (1 - rad) * (1 - lin));
    }
  }
  vignetteUnits = { W, H, t };
  return t;
}

export function keyArtImage(r) {
  return r.assets && r.assets.has('environments') ? r.assets.img('environments') : null;
}

/** The quantized backdrop image for an atlas id (assets/backdrops), or null when it is not loaded. */
export function backdropImage(r, id) {
  if (!id || !r.assets || !r.assets.has(id)) return null;
  const atlas = r.assets.atlas(id);
  const img = atlas && !atlas.placeholder ? atlas.image : null;
  if (!img) return null;
  const w = img.naturalWidth || img.width || 0, h = img.naturalHeight || img.height || 0;
  return w >= r.W && h >= r.H ? img : null;
}

export function cellRect(img, cell) {
  const cw = Math.floor((img.naturalWidth || img.width) / COLS), ch = Math.floor((img.naturalHeight || img.height) / ROWS);
  const col = cell % COLS, row = Math.floor(cell / COLS);
  return { x: col * cw, y: row * ch, w: cw, h: ch };
}

function finish(r, o) {
  if (o.dark) r.withAlpha(o.dark, () => r.rect(0, 0, r.W, r.H, '#08060f'));
  if (o.vignette) r.drawLayer(vignette(r), 0, 0, r.W, r.H, 0, 0);
  if (o.band && o.band.h > 0) r.withAlpha((o.band.dark || 0) * (o.band.alpha ?? 1), () => r.rect(0, o.band.y, r.W, o.band.h, '#08060f'));
}

// ---------------------------------------------------------------- palette ladders (pure helpers, node-testable)
function lum(c) { return 0.299 * (c >> 16) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255); }
function dist2(a, b) {
  const ar = a >> 16, ag = (a >> 8) & 255, ab = a & 255, br = b >> 16, bg = (b >> 8) & 255, bb = b & 255;
  const rm = (ar + br) / 2, dr = ar - br, dg = ag - bg, db = ab - bb;
  return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
}
function scaled(c, k) {
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return (f(c >> 16) << 16) | (f((c >> 8) & 255) << 8) | f(c & 255);
}

/**
 * For a list of packed colours, build one row per rung: rung 0 is the colour itself; rung i is the nearest
 * colour in the list that is strictly darker than rung i - 1 (closest to colour * DARK_LEVELS[i]). The
 * darkest colour of the list is the floor. Pure (qa/ui/primitives.test.mjs).
 */
export function darkLadders(colors, levels = DARK_LEVELS) {
  const n = colors.length;
  const lums = colors.map(lum);
  let darkest = 0;
  for (let i = 1; i < n; i++) if (lums[i] < lums[darkest]) darkest = i;
  const rungs = [Uint16Array.from(colors.map((_, i) => i))];
  for (let l = 1; l < levels.length; l++) {
    const prev = rungs[l - 1];
    const row = new Uint16Array(n);
    for (let i = 0; i < n; i++) {
      const target = scaled(colors[i], levels[l]);
      const ceiling = lums[prev[i]] - 0.5;
      let best = -1, bestD = Infinity;
      for (let j = 0; j < n; j++) {
        if (lums[j] >= ceiling) continue;
        const d = dist2(colors[j], target);
        if (d < bestD) { bestD = d; best = j; }
      }
      row[i] = best < 0 ? (lums[prev[i]] <= lums[darkest] + 0.5 ? prev[i] : darkest) : best;
    }
    rungs.push(row);
  }
  return rungs;
}

/**
 * Compose one frame of a prepared backdrop into `out` (Uint8ClampedArray, W*H*4). Pure, so the node tests can
 * check colour counts. prep: { W, H, idx (Uint16Array colour index per source pixel), colors (packed), rungs }.
 * o: { ox, oy, dark (alpha), vignette (bool), band: { y, h, dark, alpha }, vig (rung-unit table) }.
 */
export function composeFrame(prep, out, o = {}) {
  const { W, H, idx, colors, rungs } = prep;
  const maxRung = rungs.length - 1;
  const ox = o.ox || 0, oy = o.oy || 0;
  const flat = darkUnits(o.dark || 0);
  const vig = o.vignette ? o.vig : null;
  const band = o.band && o.band.h > 0 ? { y0: Math.round(o.band.y), y1: Math.round(o.band.y + o.band.h), u: darkUnits((o.band.dark || 0) * (o.band.alpha ?? 1)) } : null;
  let p = 0;
  for (let y = 0; y < H; y++) {
    const sy = Math.max(0, Math.min(H - 1, y - oy));
    const inBand = band && y >= band.y0 && y < band.y1;
    const rowBase = flat + (inBand ? band.u : 0);
    const by = (y & 3) << 2;
    for (let x = 0; x < W; x++, p += 4) {
      const sx = Math.max(0, Math.min(W - 1, x - ox));
      let u = rowBase + (vig ? vig[y * W + x] : 0);
      let rung = u | 0;
      const frac = u - rung;
      if (frac * 16 > BAYER4[by + (x & 3)]) rung++;
      if (rung > maxRung) rung = maxRung;
      const c = colors[rungs[rung][idx[sy * W + sx]]];
      out[p] = c >> 16; out[p + 1] = (c >> 8) & 255; out[p + 2] = c & 255; out[p + 3] = 255;
    }
  }
  return out;
}

/** Index the pixels of an RGBA buffer: { idx, colors } (packed 0xRRGGBB, alpha ignored). Pure. */
export function indexPixels(data, W, H) {
  const map = new Map();
  const colors = [];
  const idx = new Uint16Array(W * H);
  for (let i = 0, p = 0; i < W * H; i++, p += 4) {
    const c = (data[p] << 16) | (data[p + 1] << 8) | data[p + 2];
    let k = map.get(c);
    if (k === undefined) { k = colors.length; colors.push(c); map.set(c, k); }
    idx[i] = k;
  }
  return { idx, colors };
}

// ---------------------------------------------------------------- prepared backdrops + composed frame cache
const prepared = new Map();      // id -> { W, H, idx, colors, rungs } | { failed: true }
const frames = new Map();        // key -> layer
const FRAME_CACHE = 12;

function prepare(r, id) {
  const img = backdropImage(r, id);
  if (!img) return null;
  const key = `${id}|${r.W}x${r.H}`;
  let prep = prepared.get(key);
  if (prep) return prep;
  try {
    const W = r.W, H = r.H;
    const L = r.createLayer(W, H);
    L.ctx.drawImage(img, 0, 0, W, H, 0, 0, W, H);
    const data = L.ctx.getImageData(0, 0, W, H).data;
    const { idx, colors } = indexPixels(data, W, H);
    prep = { W, H, idx, colors, rungs: darkLadders(colors), vig: vignetteTable(W, H) };
  } catch (e) {
    console.warn('[keyart] backdrop pixels unavailable, alpha fallback', id, e && e.message);
    prep = { failed: true };
  }
  prepared.set(key, prep);
  return prep;
}

function q16(v) { return Math.round((v || 0) * 16) / 16; }

function composedLayer(r, id, prep, o) {
  const ox = Math.max(-BACKDROP_DRIFT, Math.min(BACKDROP_DRIFT, Math.round(o.ox || 0)));
  const oy = Math.max(-BACKDROP_DRIFT, Math.min(BACKDROP_DRIFT, Math.round(o.oy || 0)));
  const band = o.band && o.band.h > 0 ? { y: Math.round(o.band.y), h: Math.round(o.band.h), dark: q16(o.band.dark), alpha: q16(o.band.alpha ?? 1) } : null;
  const dark = q16(o.dark);
  const key = `${id}|${ox},${oy}|${dark}|${o.vignette ? 'v' : '-'}|${band ? `${band.y},${band.h},${band.dark},${band.alpha}` : ''}`;
  let layer = frames.get(key);
  if (layer) { frames.delete(key); frames.set(key, layer); return layer; }   // refresh LRU order
  layer = r.createLayer(prep.W, prep.H);
  const img = layer.ctx.createImageData(prep.W, prep.H);
  composeFrame(prep, img.data, { ox, oy, dark, vignette: !!o.vignette, band, vig: prep.vig });
  layer.ctx.putImageData(img, 0, 0);
  frames.set(key, layer);
  if (frames.size > FRAME_CACHE) frames.delete(frames.keys().next().value);
  return layer;
}

/**
 * Draw a 384x216 backdrop 1:1, slid by whole pixels (ox, oy) with its edge replicated into the gap, darkened
 * to its own palette (see the header). Returns false (drawing nothing) when the atlas is not loaded so callers
 * can fall back.
 */
export function drawBackdrop(r, id, o = {}) {
  const img = backdropImage(r, id);
  if (!img) return false;
  const prep = prepare(r, id);
  if (prep && !prep.failed) {
    const layer = composedLayer(r, id, prep, o);
    if (o.alpha != null && o.alpha < 1) r.withAlpha(o.alpha, () => r.drawLayer(layer, 0, 0, prep.W, prep.H, 0, 0));
    else r.drawLayer(layer, 0, 0, prep.W, prep.H, 0, 0);
    return true;
  }
  // Pixel access failed (tainted canvas): the old alpha-blended path.
  const W = r.W, H = r.H;
  const ox = Math.max(-BACKDROP_DRIFT, Math.min(BACKDROP_DRIFT, Math.round(o.ox || 0)));
  const oy = Math.max(-BACKDROP_DRIFT, Math.min(BACKDROP_DRIFT, Math.round(o.oy || 0)));
  r.image(img, ox, oy, { sx: 0, sy: 0, sw: W, sh: H, w: W, h: H, alpha: o.alpha });
  const strip = (sx, sy, sw, sh, dx, dy, dw, dh) => { if (dw > 0 && dh > 0) r.image(img, dx, dy, { sx, sy, sw, sh, w: dw, h: dh, alpha: o.alpha }); };
  if (oy > 0) strip(0, 0, W, 1, ox, 0, W, oy);
  if (oy < 0) strip(0, H - 1, W, 1, ox, H + oy, W, -oy);
  if (ox > 0) { strip(0, 0, 1, H, 0, oy, ox, H); if (oy > 0) strip(0, 0, 1, 1, 0, 0, ox, oy); if (oy < 0) strip(0, H - 1, 1, 1, 0, H + oy, ox, -oy); }
  if (ox < 0) { strip(W - 1, 0, 1, H, W + ox, oy, -ox, H); if (oy > 0) strip(W - 1, 0, 1, 1, W + ox, 0, -ox, oy); if (oy < 0) strip(W - 1, H - 1, 1, 1, W + ox, H + oy, -ox, -oy); }
  finish(r, o);
  return true;
}

/** Draw one painted cell filling the screen (fallback). ox/oy: drift offset in screen px. zoom > 1 crops tighter. */
export function drawKeyArt(r, cell = 0, o = {}) {
  const img = keyArtImage(r);
  if (!img) { r.gradientV(0, 0, r.W, r.H, '#2a2456', '#0b0a1f', 18); finish(r, o); return false; }
  const c = cellRect(img, cell);
  const zoom = o.zoom || 1.08;
  // 16:9 window inside the cell, shrunk by zoom so the drift never shows an edge.
  let sw = c.w, sh = Math.round(sw * r.H / r.W);
  if (sh > c.h) { sh = c.h; sw = Math.round(sh * r.W / r.H); }
  sw = Math.round(sw / zoom); sh = Math.round(sh / zoom);
  const scale = sw / r.W;
  const maxOx = (c.w - sw) / 2, maxOy = (c.h - sh) / 2;
  const ox = Math.max(-maxOx, Math.min(maxOx, (o.ox || 0) * scale));
  const oy = Math.max(-maxOy, Math.min(maxOy, (o.oy || 0) * scale));
  const sx = Math.round(c.x + (c.w - sw) / 2 + ox), sy = Math.round(c.y + (c.h - sh) / 2 + oy);
  r.image(img, 0, 0, { sx, sy, sw, sh, w: r.W, h: r.H, alpha: o.alpha });
  finish(r, o);
  return true;
}

export class KeyArt {
  /**
   * o: backdrop (atlas id in assets/backdrops, preferred), cell (fallback crop cell), drift (px/s, fallback
   * crop), range (+- px, fallback crop), t (phase), zoom (fallback crop). The quantized backdrop drifts on
   * its own slow schedule (whole pixels, at most BACKDROP_DRIFT).
   */
  constructor(engine, o = {}) {
    this.engine = engine;
    this.backdrop = o.backdrop || null;
    this.cell = o.cell || 0;
    this.drift = o.drift ?? 1;         // screen px per second (crop fallback)
    this.range = o.range ?? 10;        // +- px (crop fallback)
    this.t = o.t || 0;
    this.zoom = o.zoom || 1.08;
    this.period = o.period || 14;      // seconds per full ping-pong of the quantized backdrop
  }
  update(dt) { this.t += dt; }
  /** True when the quantized backdrop is loaded (so draw() will not fall back to the crop). */
  get usesBackdrop() { const r = this.engine && this.engine.renderer; return !!(r && backdropImage(r, this.backdrop)); }
  get ox() {
    if (!this.drift) return 0;
    const period = (this.range * 4) / this.drift;      // full ping-pong cycle
    const p = (this.t % period) / period;
    const tri = p < 0.5 ? p * 2 : 2 - p * 2;             // 0..1..0
    return Math.round((tri - 0.5) * 2 * this.range);
  }
  get oy() { return Math.round(Math.sin(this.t / 23) * 2); }
  /** Whole-pixel drift for the quantized backdrop: a slow triangle on x (+-2) and a slower sine on y (+-1). */
  get bx() {
    if (!this.drift) return 0;
    const p = (this.t % this.period) / this.period;
    const tri = p < 0.5 ? p * 2 : 2 - p * 2;
    return Math.round((tri - 0.5) * 2 * BACKDROP_DRIFT);
  }
  get by() { return this.drift ? Math.round(Math.sin(this.t / 9)) : 0; }
  draw(r, o = {}) {
    if (this.backdrop && drawBackdrop(r, this.backdrop, { ox: this.bx, oy: this.by, ...o })) return true;
    return drawKeyArt(r, this.cell, { ox: this.ox, oy: this.oy, zoom: this.zoom, ...o });
  }
}
