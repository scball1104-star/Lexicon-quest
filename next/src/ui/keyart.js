// Painted key art backdrops (../assets/art/environments.webp, 2 columns x 4 rows; cell 0 = Willowmere).
// Cropped to 16:9 and drawn at 384x216 with nearest-neighbor, optional slow drift and a dark vignette.
//
//   const art = new KeyArt(engine, { cell: 0, drift: 1 });   // drift in screen px per second (ping-pong)
//   art.update(dt); art.draw(r, { dark: 0.2, vignette: true, zoom: 1.0 });
//   drawKeyArt(r, cell, { ox, oy, dark, vignette })           // one-off (no drift state)

const COLS = 2, ROWS = 4;

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

export function cellRect(img, cell) {
  const cw = Math.floor((img.naturalWidth || img.width) / COLS), ch = Math.floor((img.naturalHeight || img.height) / ROWS);
  const col = cell % COLS, row = Math.floor(cell / COLS);
  return { x: col * cw, y: row * ch, w: cw, h: ch };
}

/** Draw one cell filling the screen. ox/oy: drift offset in screen px. zoom > 1 crops tighter. */
export function drawKeyArt(r, cell = 0, o = {}) {
  const img = keyArtImage(r);
  if (!img) { r.gradientV(0, 0, r.W, r.H, '#2a2456', '#0b0a1f', 18); return false; }
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
  if (o.dark) r.withAlpha(o.dark, () => r.rect(0, 0, r.W, r.H, '#08060f'));
  if (o.vignette) r.drawLayer(vignette(r), 0, 0, r.W, r.H, 0, 0);
  return true;
}

export class KeyArt {
  constructor(engine, o = {}) {
    this.engine = engine;
    this.cell = o.cell || 0;
    this.drift = o.drift ?? 1;         // screen px per second
    this.range = o.range ?? 10;        // +- px
    this.t = o.t || 0;
    this.zoom = o.zoom || 1.08;
  }
  update(dt) { this.t += dt; }
  get ox() {
    if (!this.drift) return 0;
    const period = (this.range * 4) / this.drift;      // full ping-pong cycle
    const p = (this.t % period) / period;
    const tri = p < 0.5 ? p * 2 : 2 - p * 2;             // 0..1..0
    return Math.round((tri - 0.5) * 2 * this.range);
  }
  get oy() { return Math.round(Math.sin(this.t / 23) * 2); }
  draw(r, o = {}) { return drawKeyArt(r, this.cell, { ox: this.ox, oy: this.oy, zoom: this.zoom, ...o }); }
}
