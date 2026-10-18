// Key art backdrops for the title, name entry, prologue, title cards and credits.
//
// Preferred source: the palette-quantized 384x216 stages in assets/backdrops (manifest atlases `title` and
// `dialog_keyart`, see assets/backdrops/README.md). They sit at the same pixel density as the tiles and
// sprites (CRITIQUE_1 C1), so they are drawn 1:1 with nearest-neighbor and never scaled. A slow drift of at
// most 2 px is kept by sliding the image by whole pixels and replicating its edge column/row into the strip
// that opens up (the vignette hides that strip anyway). Fallback when the atlas is missing: the old runtime
// crop of ../assets/art/environments.webp (2 columns x 4 rows; cell 0 = Willowmere).
//
//   const art = new KeyArt(engine, { backdrop: 'title', cell: 0 });   // atlas id + fallback cell
//   art.update(dt); art.draw(r, { dark: 0.2, vignette: true });
//   drawBackdrop(r, 'dialog_keyart', { ox, oy, dark, vignette })      // one-off; false when missing
//   drawKeyArt(r, cell, { ox, oy, dark, vignette, zoom })             // the crop fallback (no drift state)

const COLS = 2, ROWS = 4;
export const BACKDROP_DRIFT = 2;     // max px a quantized backdrop slides (per axis)

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
}

/**
 * Draw a 384x216 backdrop 1:1, slid by whole pixels (ox, oy) with its edge replicated into the gap.
 * Returns false (drawing nothing) when the atlas is not loaded so callers can fall back.
 */
export function drawBackdrop(r, id, o = {}) {
  const img = backdropImage(r, id);
  if (!img) return false;
  const W = r.W, H = r.H;
  const ox = Math.max(-BACKDROP_DRIFT, Math.min(BACKDROP_DRIFT, Math.round(o.ox || 0)));
  const oy = Math.max(-BACKDROP_DRIFT, Math.min(BACKDROP_DRIFT, Math.round(o.oy || 0)));
  r.image(img, ox, oy, { sx: 0, sy: 0, sw: W, sh: H, w: W, h: H, alpha: o.alpha });
  // Edge replication: a 1 px source sliver stretched across the exposed strip (integer scale, no blur).
  const strip = (sx, sy, sw, sh, dx, dy, dw, dh) => { if (dw > 0 && dh > 0) r.image(img, dx, dy, { sx, sy, sw, sh, w: dw, h: dh, alpha: o.alpha }); };
  if (oy > 0) strip(0, 0, W, 1, ox, 0, W, oy);                       // top
  if (oy < 0) strip(0, H - 1, W, 1, ox, H + oy, W, -oy);             // bottom
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
