// Renderer: draws the game into a 384x216 offscreen canvas, then presents it to the visible
// canvas (#game) with nearest-neighbor scaling (DESIGN 3). Letterbox/pillarbox areas get a dark
// themed backdrop (gradient + vignette, optionally an "ambient" blurred copy of the game frame or a
// scene-provided backdrop image).
//
// All draw helpers work in GAME pixels on the offscreen canvas and round positions (pixel integrity).

export const GAME_W = 384;
export const GAME_H = 216;

// ------------------------------------------------------------------ layout (pure)

/**
 * Compute where the game image goes on the visible canvas. Pure: unit-tested in node.
 * @param {object} p
 *   devW, devH   visible canvas size in DEVICE pixels
 *   dpr          device pixel ratio
 *   gameW, gameH internal resolution (384 x 216)
 *   mode         'integer' (default) | 'fit' | 'sharp'
 *   safe         {l,t,r,b} safe-area insets in CSS px
 *   touch        null, or { minBar: css px wanted beside the game for controls, portraitAnchor }
 * @returns view: { scale (device px per game px), x, y, w, h (device px), cssScale, cssX, cssY, cssW, cssH,
 *                 screenW, screenH (css), dpr, integer, touchMode: 'none'|'bars'|'below'|'overlay', bars:{left,right,top,bottom} }
 */
export function computeLayout(p) {
  const gameW = p.gameW || GAME_W, gameH = p.gameH || GAME_H;
  const dpr = p.dpr || 1;
  const devW = Math.max(1, Math.round(p.devW)), devH = Math.max(1, Math.round(p.devH));
  const safe = p.safe || { l: 0, t: 0, r: 0, b: 0 };
  const mode = p.mode || 'integer';
  const sl = Math.round(safe.l * dpr), st = Math.round(safe.t * dpr);
  const availW = Math.max(1, devW - sl - Math.round(safe.r * dpr));
  const availH = Math.max(1, devH - st - Math.round(safe.b * dpr));
  const fit = Math.min(availW / gameW, availH / gameH);
  const maxInt = Math.floor(fit);

  let scale;
  if (mode === 'integer' && maxInt >= 2) scale = maxInt;
  else if (mode === 'sharp' || mode === 'fit' || maxInt < 2) scale = fit;
  else scale = maxInt;

  let touchMode = 'none';
  let anchorY = 0.5;
  const portrait = devH > devW;
  if (p.touch) {
    const minBar = (p.touch.minBar || 84) * dpr;
    if (portrait) {
      touchMode = 'below';
      anchorY = p.touch.portraitAnchor ?? 0.16;
    } else {
      const barsAt = (s) => (availW - gameW * s) / 2;
      if (barsAt(scale) >= minBar) touchMode = 'bars';
      else if (Number.isInteger(scale) && scale - 1 >= 2 && barsAt(scale - 1) >= minBar
               && (gameH * (scale - 1)) / availH >= 0.6) { scale -= 1; touchMode = 'bars'; }
      else touchMode = 'overlay';
    }
  }

  const w = Math.round(gameW * scale), h = Math.round(gameH * scale);
  const x = sl + Math.round((availW - w) / 2);
  const y = st + Math.round((availH - h) * anchorY);
  return {
    scale, x, y, w, h, dpr, devW, devH,
    cssScale: scale / dpr, cssX: x / dpr, cssY: y / dpr, cssW: w / dpr, cssH: h / dpr,
    screenW: devW / dpr, screenH: devH / dpr,
    integer: Number.isInteger(scale), mode, portrait, touchMode,
    safe: { ...safe },
    bars: { left: x / dpr, right: (devW - x - w) / dpr, top: y / dpr, bottom: (devH - y - h) / dpr },
  };
}

// ------------------------------------------------------------------ color helpers

const colorCache = new Map();
/** Parse '#rgb', '#rrggbb', '#rrggbbaa' into [r,g,b,a(0..1)]. */
export function parseColor(c) {
  let v = colorCache.get(c);
  if (v) return v;
  let s = String(c).trim();
  if (s[0] === '#') {
    s = s.slice(1);
    if (s.length === 3 || s.length === 4) s = s.split('').map((ch) => ch + ch).join('');
    const n = parseInt(s.slice(0, 6), 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255, s.length === 8 ? parseInt(s.slice(6, 8), 16) / 255 : 1];
  } else {
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (m) { const parts = m[1].split(',').map((x) => parseFloat(x)); v = [parts[0], parts[1], parts[2], parts[3] ?? 1]; }
    else v = [255, 0, 255, 1];
  }
  colorCache.set(c, v);
  return v;
}
export function mixColor(a, b, t) {
  const A = parseColor(a), B = parseColor(b);
  const r = Math.round(A[0] + (B[0] - A[0]) * t), g = Math.round(A[1] + (B[1] - A[1]) * t), bl = Math.round(A[2] + (B[2] - A[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

// 4x4 Bayer matrix for ordered dithering (values 0..15).
export const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0);
  return c;
}
function ctx2d(c, opts) {
  const g = c.getContext('2d', opts);
  g.imageSmoothingEnabled = false;
  return g;
}

// ------------------------------------------------------------------ renderer

export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas the visible canvas (#game)
   * @param {object} opts { width, height, fonts, assets, settings }
   */
  constructor(canvas, opts = {}) {
    this.W = opts.width || GAME_W;
    this.H = opts.height || GAME_H;
    this.fonts = opts.fonts || null;
    this.assets = opts.assets || null;
    this.settings = opts.settings || {};
    this.visible = canvas;
    // The visible canvas is transparent outside the game image: the letterbox shows a tiny backdrop canvas
    // behind it (upscaled smoothly by the compositor, so its glow costs almost nothing per frame).
    this.vctx = ctx2d(canvas);
    this._initBackLayer();
    this.canvas = makeCanvas(this.W, this.H);
    this.ctx = ctx2d(this.canvas, { alpha: false });
    this.view = computeLayout({ devW: this.W, devH: this.H, dpr: 1 });
    this.touch = null;              // set by input when touch controls are active: { minBar }
    this._camStack = [];
    this.camera = { x: 0, y: 0 };
    this._clipDepth = 0;
    this._shake = { mag: 0, frames: 0, total: 0, x: 0, y: 0 };
    this._flash = { color: '#fff', frames: 0, total: 0, alpha: 1 };
    this._tintCache = new WeakMap();
    this._ditherCache = new Map();
    this._gradCache = new Map();
    this._backdropDirty = true;
    this._backdropImage = null;
    this._ambient = null;           // { small, mid, frame }
    this._safe = { l: 0, t: 0, r: 0, b: 0 };
    this._listeners = new Set();
    this.frame = 0;
    this._initResize();
  }

  // ---------------------------------------------------------------- sizing
  _initResize() {
    const c = this.visible;
    this._probe = document.createElement('div');
    this._probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;'
      + 'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);';
    document.body.appendChild(this._probe);
    this._devSize = null;
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver((entries) => {
        const e = entries[entries.length - 1];
        const box = e.devicePixelContentBoxSize && e.devicePixelContentBoxSize[0];
        if (box) this._devSize = [box.inlineSize, box.blockSize];
        else this._devSize = null;
        this.resize();
      });
      try { this._ro.observe(c, { box: 'device-pixel-content-box' }); } catch { this._ro.observe(c); }
    }
    const onResize = () => this.resize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', () => setTimeout(onResize, 120));
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);
    this._watchDpr();
    this.resize();
  }

  _watchDpr() {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    const handler = () => { this._devSize = null; this.resize(); this._watchDpr(); };
    if (mq.addEventListener) mq.addEventListener('change', handler, { once: true });
  }

  _readSafe() {
    const cs = getComputedStyle(this._probe);
    this._safe = {
      t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0,
      b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0,
    };
  }

  /** Recompute the layout. Called automatically on resize/DPR change; call after changing scale settings. */
  resize() {
    const c = this.visible;
    const dpr = window.devicePixelRatio || 1;
    const cssW = c.clientWidth || window.innerWidth, cssH = c.clientHeight || window.innerHeight;
    let devW, devH;
    if (this._devSize && Math.abs(this._devSize[0] / dpr - cssW) < 2) [devW, devH] = this._devSize;
    else { devW = Math.round(cssW * dpr); devH = Math.round(cssH * dpr); }
    this._readSafe();
    const view = computeLayout({
      devW, devH, dpr, gameW: this.W, gameH: this.H,
      mode: this.settings.scaleMode || 'integer', safe: this._safe, touch: this.touch,
    });
    if (c.width !== devW || c.height !== devH) { c.width = devW; c.height = devH; this.vctx.imageSmoothingEnabled = false; }
    const changed = JSON.stringify(view) !== JSON.stringify(this.view);
    this.view = view;
    this._backdropDirty = true;
    if (changed) for (const fn of this._listeners) { try { fn(view); } catch (e) { console.warn(e); } }
  }

  /** Subscribe to layout changes: fn(view). Returns an unsubscribe function. */
  onLayout(fn) { this._listeners.add(fn); return () => this._listeners.delete(fn); }

  /** Enable/disable touch-aware layout (controls beside or below the game). */
  setTouchLayout(touch) {
    const next = touch ? { minBar: 84, ...(typeof touch === 'object' ? touch : {}) } : null;
    if (JSON.stringify(next) === JSON.stringify(this.touch)) return;
    this.touch = next;
    this.resize();
  }

  /** Convert page (CSS) coordinates to game pixel coordinates. */
  toGame(clientX, clientY) {
    const v = this.view;
    const rect = this.visible.getBoundingClientRect();
    return { x: (clientX - rect.left - v.cssX) / v.cssScale, y: (clientY - rect.top - v.cssY) / v.cssScale };
  }

  // ---------------------------------------------------------------- backdrop
  // Layers, back to front: body background (CSS) -> back canvas (128x72 glow: theme gradient + a blurred
  // sample of the game frame or the scene's backdrop image, stretched by the compositor) -> #game (transparent
  // bars carrying a static vignette/darkening/frame drawn once per resize, opaque game image).

  _initBackLayer() {
    const b = document.createElement('canvas');
    b.width = 128; b.height = 72;
    b.setAttribute('aria-hidden', 'true');
    b.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;image-rendering:auto;z-index:0;';
    const parent = this.visible.parentNode || document.body;
    parent.insertBefore(b, this.visible);
    if (!this.visible.style.zIndex) this.visible.style.zIndex = '1';
    this.back = b;
    this.bctx = b.getContext('2d');
    this._backNeedsUpdate = true;
  }

  /** Scene backdrop for the letterbox areas: an image/canvas (shown dark and blurred), or null for ambient. */
  setBackdrop(img) {
    this._backdropImage = img || null;
    this._ambientPrimed = false;
    this._backNeedsUpdate = true;
  }

  _hasBars() {
    const v = this.view;
    return v.x > 0 || v.y > 0 || v.x + v.w < v.devW || v.y + v.h < v.devH;
  }

  _layoutBack() {
    const v = this.view;
    // Cover the whole screen with the 16:9 glow, centered, slightly oversized so no edge ever shows.
    const k = Math.max(v.screenW / 128, v.screenH / 72) * 1.06;
    const w = 128 * k, h = 72 * k;
    Object.assign(this.back.style, { width: `${w}px`, height: `${h}px`, left: `${(v.screenW - w) / 2}px`, top: `${(v.screenH - h) / 2}px` });
    this.back.style.display = this._hasBars() ? 'block' : 'none';
  }

  /** Refresh the small glow canvas (theme gradient + sampled frame). Cheap: 128x72 pixels. */
  _updateBack() {
    const g = this.bctx;
    const lg = g.createLinearGradient(0, 0, 0, 72);
    lg.addColorStop(0, '#1a1530'); lg.addColorStop(0.55, '#110e20'); lg.addColorStop(1, '#09080f');
    g.globalAlpha = 1; g.fillStyle = lg; g.fillRect(0, 0, 128, 72);
    if ((this.settings.backdrop || 'ambient') === 'plain') return;
    const a = this._ambient || (this._ambient = { small: makeCanvas(32, 18) });
    const sg = a.small.getContext('2d');
    sg.imageSmoothingEnabled = true; sg.imageSmoothingQuality = 'high';
    const src = this._backdropImage || this.canvas;
    const sw = src.naturalWidth || src.width || this.W, sh = src.naturalHeight || src.height || this.H;
    // Ease toward the current frame so the glow drifts instead of flickering with every cut.
    sg.globalAlpha = this._ambientPrimed ? 0.25 : 1;
    sg.drawImage(src, 0, 0, sw, sh, 0, 0, 32, 18);
    sg.globalAlpha = 1;
    this._ambientPrimed = true;
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.globalAlpha = 0.8;
    g.drawImage(a.small, -4, -2, 136, 76);
    g.globalAlpha = 1;
  }

  /** Static bar dressing on #game (once per resize): darkening, vignette, weave, soft shadow, frame line. */
  _drawBars() {
    const v = this.view;
    const g = this.vctx;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, v.devW, v.devH);
    if (!this._hasBars()) { g.restore(); return; }
    g.beginPath();
    g.rect(0, 0, v.devW, v.devH);
    g.rect(v.x + v.w, v.y, -v.w, v.h);
    g.clip('evenodd');
    g.fillStyle = 'rgba(9,7,17,0.58)'; g.fillRect(0, 0, v.devW, v.devH);
    const cx = v.x + v.w / 2, cy = v.y + v.h / 2;
    const rg = g.createRadialGradient(cx, cy, Math.min(v.w, v.h) * 0.45, cx, cy, Math.hypot(v.devW, v.devH) * 0.62);
    rg.addColorStop(0, 'rgba(6,5,12,0)'); rg.addColorStop(1, 'rgba(6,5,12,0.8)');
    g.fillStyle = rg; g.fillRect(0, 0, v.devW, v.devH);
    // Very faint woven dots so wide bars never read as flat programmer black.
    g.globalAlpha = 0.04; g.fillStyle = '#b8a8ff';
    const step = Math.max(3, Math.round(4 * v.dpr)), dot = Math.max(1, Math.round(v.dpr));
    for (let yy = 0, row = 0; yy < v.devH; yy += step, row++) for (let xx = row % 2 ? step : 0; xx < v.devW; xx += step * 2) g.fillRect(xx, yy, dot, dot);
    g.globalAlpha = 1;
    g.shadowColor = 'rgba(0,0,0,0.8)'; g.shadowBlur = Math.round(18 * v.dpr);
    g.fillStyle = '#000'; g.fillRect(v.x, v.y, v.w, v.h);
    g.shadowBlur = 0; g.shadowColor = 'transparent';
    g.strokeStyle = 'rgba(160,148,220,0.16)'; g.lineWidth = Math.max(1, Math.round(v.dpr));
    const o = g.lineWidth;
    g.strokeRect(v.x - o * 1.5, v.y - o * 1.5, v.w + o * 3, v.h + o * 3);
    g.restore();
  }

  // ---------------------------------------------------------------- frame lifecycle
  /** Begin a game frame: resets transform, applies screen shake. */
  beginFrame() {
    const g = this.ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    this._camStack.length = 0;
    this.camera = { x: 0, y: 0 };
    const s = this._shake;
    if (s.frames > 0 && !this.settings.reduceMotion) {
      const k = s.frames / Math.max(1, s.total);
      const m = Math.max(1, Math.round(s.mag * k));
      s.x = ((this.frame * 7919) % (m * 2 + 1)) - m;
      s.y = ((this.frame * 104729 + 13) % (m * 2 + 1)) - m;
      if (s.x === 0 && s.y === 0) s.x = m;
      g.translate(s.x, s.y);
    } else { s.x = 0; s.y = 0; }
  }

  /** End a game frame: draws the screen flash. */
  endFrame() {
    const f = this._flash;
    if (f.frames > 0) {
      const k = f.frames / Math.max(1, f.total);
      const reduce = this.settings.reduceMotion ? 0.3 : 1;
      const g = this.ctx;
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = Math.min(1, f.alpha * k * reduce);
      g.fillStyle = f.color; g.fillRect(0, 0, this.W, this.H);
      g.restore();
    }
  }

  /** Advance timed screen effects. Called once per logic step by the engine. */
  tick() {
    this.frame++;
    if (this._shake.frames > 0) this._shake.frames--;
    if (this._flash.frames > 0) this._flash.frames--;
    // The glow follows the game frame ~10 times a second (only when bars are visible).
    if ((this.settings.backdrop || 'ambient') !== 'plain' && this._hasBars() && this.frame % 6 === 0) this._backNeedsUpdate = true;
  }

  /** Copy the game frame to the visible canvas (and refresh the letterbox layers when needed). */
  present() {
    const v = this.view;
    const g = this.vctx;
    if (this._backdropDirty) {
      this._backdropDirty = false;
      this._layoutBack();
      this._drawBars();
      this._backNeedsUpdate = true;
    }
    if (this._backNeedsUpdate && this._hasBars()) {
      this._backNeedsUpdate = false;
      this._updateBack();
    }
    if (v.mode === 'sharp' && !v.integer) {
      // Sharp-bilinear: integer nearest upscale, then a smooth downscale to the exact fit.
      const k = Math.max(1, Math.ceil(v.scale));
      const tmp = this._sharpCanvas || (this._sharpCanvas = makeCanvas(1, 1));
      if (tmp.width !== this.W * k) { tmp.width = this.W * k; tmp.height = this.H * k; }
      const tg = tmp.getContext('2d'); tg.imageSmoothingEnabled = false;
      tg.drawImage(this.canvas, 0, 0, tmp.width, tmp.height);
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(tmp, v.x, v.y, v.w, v.h);
      g.imageSmoothingEnabled = false;
    } else {
      g.imageSmoothingEnabled = false;
      g.drawImage(this.canvas, 0, 0, this.W, this.H, v.x, v.y, v.w, v.h);
    }
  }

  // ---------------------------------------------------------------- screen fx
  /** Screen shake: magnitude in game px, duration in frames. Ignored when reduceMotion is on. */
  shake(mag = 3, frames = 12) {
    if (this.settings.reduceMotion) return;
    if (mag >= this._shake.mag * (this._shake.frames / Math.max(1, this._shake.total))) {
      this._shake = { mag, frames, total: frames, x: 0, y: 0 };
    }
  }
  /** Full-screen flash that fades out over `frames`. Softened when reduceMotion is on. */
  flash(color = '#ffffff', frames = 8, alpha = 0.85) { this._flash = { color, frames, total: frames, alpha }; }
  get shakeOffset() { return { x: this._shake.x, y: this._shake.y }; }

  // ---------------------------------------------------------------- basic drawing
  clear(color = '#14101e') {
    const g = this.ctx;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1; g.fillStyle = color; g.fillRect(0, 0, this.W, this.H);
    g.restore();
  }
  snap(v) { return Math.round(v); }
  rect(x, y, w, h, color) {
    const g = this.ctx; g.fillStyle = color;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  fillRect(x, y, w, h, color) { this.rect(x, y, w, h, color); }
  /** 1 px crisp outline (inside the rect). */
  strokeRect(x, y, w, h, color, t = 1) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const g = this.ctx; g.fillStyle = color;
    g.fillRect(x, y, w, t); g.fillRect(x, y + h - t, w, t);
    g.fillRect(x, y + t, t, h - 2 * t); g.fillRect(x + w - t, y + t, t, h - 2 * t);
  }
  pixel(x, y, color) { const g = this.ctx; g.fillStyle = color; g.fillRect(Math.round(x), Math.round(y), 1, 1); }
  /** Bresenham line, 1 px, no anti-aliasing. */
  line(x0, y0, x1, y1, color) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const g = this.ctx; g.fillStyle = color;
    if (y0 === y1) { g.fillRect(Math.min(x0, x1), y0, Math.abs(x1 - x0) + 1, 1); return; }
    if (x0 === x1) { g.fillRect(x0, Math.min(y0, y1), 1, Math.abs(y1 - y0) + 1); return; }
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let i = 0; i < 4096; i++) {
      g.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  /** Pixel circle (filled by default). */
  circle(cx, cy, radius, color, fill = true) {
    this.ellipse(cx, cy, radius, radius, color, fill);
  }
  /** Pixel ellipse built from horizontal spans (crisp, no anti-aliasing). */
  ellipse(cx, cy, rx, ry, color, fill = true) {
    cx = Math.round(cx); cy = Math.round(cy); rx = Math.max(0, Math.round(rx)); ry = Math.max(0, Math.round(ry));
    const g = this.ctx; g.fillStyle = color;
    if (rx === 0 || ry === 0) { g.fillRect(cx - rx, cy - ry, rx * 2 + 1, ry * 2 + 1); return; }
    let prev = -1;
    for (let dy = -ry; dy <= ry; dy++) {
      const t = 1 - (dy * dy) / ((ry + 0.5) * (ry + 0.5));
      const half = Math.floor(Math.sqrt(Math.max(0, t)) * (rx + 0.5));
      if (fill) g.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
      else {
        const span = Math.max(1, Math.abs(half - (prev < 0 ? half : prev)));
        g.fillRect(cx - half, cy + dy, span, 1);
        g.fillRect(cx + half - span + 1, cy + dy, span, 1);
        if (dy === -ry || dy === ry) g.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
      }
      prev = half;
    }
  }
  /**
   * Vertical gradient fill. `steps` > 0 quantizes into bands (SNES look); default one band per row.
   */
  gradientV(x, y, w, h, top, bottom, steps = 0) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    if (h <= 0 || w <= 0) return;
    const g = this.ctx;
    const n = steps > 0 ? Math.min(steps, h) : h;
    const A = parseColor(top), B = parseColor(bottom);
    for (let i = 0; i < n; i++) {
      const y0 = y + Math.floor((i * h) / n), y1 = y + Math.floor(((i + 1) * h) / n);
      const t = n === 1 ? 0 : i / (n - 1);
      g.fillStyle = `rgba(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)},${A[3] + (B[3] - A[3]) * t})`;
      g.fillRect(x, y0, w, y1 - y0);
    }
  }
  /**
   * Ordered-dither fill (4x4 Bayer). density 0..1 (0.5 = checkerboard). The pattern is anchored to
   * world space (it moves with the camera), so dithered shadows do not shimmer while scrolling.
   */
  dither(x, y, w, h, color, density = 0.5) {
    const level = Math.max(0, Math.min(16, Math.round(density * 16)));
    if (level === 0) return;
    const key = `${color}|${level}`;
    let pat = this._ditherCache.get(key);
    if (!pat) {
      const c = makeCanvas(4, 4);
      const g = c.getContext('2d');
      g.fillStyle = color;
      for (let i = 0; i < 16; i++) if (BAYER4[i] < level) g.fillRect(i % 4, (i / 4) | 0, 1, 1);
      pat = this.ctx.createPattern(c, 'repeat');
      this._ditherCache.set(key, pat);
    }
    const g = this.ctx;
    g.fillStyle = pat;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  /** Dithered ellipse (soft ground shadow), density 0..1. */
  ditherEllipse(cx, cy, rx, ry, color = '#14101e', density = 0.5) {
    cx = Math.round(cx); cy = Math.round(cy); rx = Math.round(rx); ry = Math.round(ry);
    for (let dy = -ry; dy <= ry; dy++) {
      const t = 1 - (dy * dy) / ((ry + 0.5) * (ry + 0.5));
      const half = Math.floor(Math.sqrt(Math.max(0, t)) * (rx + 0.5));
      this.dither(cx - half, cy + dy, half * 2 + 1, 1, color, density);
    }
  }

  // ---------------------------------------------------------------- images and sprites
  _resolveAtlas(atlas) {
    if (typeof atlas === 'string') return this.assets ? this.assets.atlas(atlas) : null;
    return atlas;
  }
  _tinted(img, sx, sy, sw, sh, color) {
    let per = this._tintCache.get(img);
    if (!per) { per = new Map(); this._tintCache.set(img, per); }
    const key = `${sx},${sy},${sw},${sh},${color}`;
    let c = per.get(key);
    if (!c) {
      c = makeCanvas(sw, sh);
      const g = ctx2d(c);
      g.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = color; g.fillRect(0, 0, sw, sh);
      if (per.size > 512) per.clear();
      per.set(key, c);
    }
    return c;
  }

  /**
   * Draw a sprite frame so that its origin pixel lands on (x, y).
   * atlas: atlas object (from assets.atlas) or id. frame: frame name (or a frame record).
   * opts: { flipX, flipY, alpha, tint (color), tintAmount (0..1, default 1), scale (integer preferred),
   *         topLeft: true to treat (x, y) as the top-left corner instead of the origin }
   */
  sprite(atlas, frame, x, y, opts) {
    const a = this._resolveAtlas(atlas);
    if (!a) return;
    const f = typeof frame === 'object' && frame ? frame : (a.frame ? a.frame(frame) : a.frames[frame]);
    if (!f) return;
    const img = a.image;
    const o = opts || {};
    const scale = o.scale || 1;
    const fx = o.flipX ? -1 : 1, fy = o.flipY ? -1 : 1;
    let dx, dy;
    if (o.topLeft) { dx = Math.round(x); dy = Math.round(y); }
    else {
      const ox = o.flipX ? f.w - 1 - f.ox : f.ox;
      const oy = o.flipY ? f.h - 1 - f.oy : f.oy;
      dx = Math.round(x - ox * scale); dy = Math.round(y - oy * scale);
    }
    const w = Math.round(f.w * scale), h = Math.round(f.h * scale);
    this._blit(img, f.x, f.y, f.w, f.h, dx, dy, w, h, fx, fy, o);
  }

  _blit(img, sx, sy, sw, sh, dx, dy, dw, dh, fx, fy, o) {
    const g = this.ctx;
    const alpha = o.alpha == null ? 1 : o.alpha;
    if (alpha <= 0) return;
    const prevA = g.globalAlpha;
    const flipped = fx < 0 || fy < 0;
    if (flipped) {
      g.save();
      g.translate(fx < 0 ? dx + dw : dx, fy < 0 ? dy + dh : dy);
      g.scale(fx, fy);
      dx = 0; dy = 0;
    }
    g.globalAlpha = prevA * alpha;
    const tintAmt = o.tint ? (o.tintAmount == null ? 1 : o.tintAmount) : 0;
    if (tintAmt < 1) g.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    if (tintAmt > 0) {
      const t = this._tinted(img, sx, sy, sw, sh, o.tint);
      g.globalAlpha = prevA * alpha * tintAmt;
      g.drawImage(t, 0, 0, sw, sh, dx, dy, dw, dh);
    }
    g.globalAlpha = prevA;
    if (flipped) g.restore();
  }

  /**
   * Draw an image. image(img, x, y, opts) draws it whole at top-left (x, y);
   * opts: { sx, sy, sw, sh (source rect), w, h (dest size), flipX, flipY, alpha, tint, tintAmount }.
   * img may be an asset id string.
   */
  image(img, x, y, opts) {
    if (typeof img === 'string') img = this.assets ? this.assets.img(img) : null;
    if (!img) return;
    const o = opts || {};
    const sw = o.sw ?? (img.naturalWidth || img.width), sh = o.sh ?? (img.naturalHeight || img.height);
    const w = Math.round(o.w ?? sw), h = Math.round(o.h ?? sh);
    this._blit(img, o.sx || 0, o.sy || 0, sw, sh, Math.round(x), Math.round(y), w, h, o.flipX ? -1 : 1, o.flipY ? -1 : 1, o);
  }
  /** Draw one tile (default 16x16) from a sheet: tile(img, sx, sy, dx, dy, w, h). */
  tile(img, sx, sy, dx, dy, w = 16, h = w) {
    if (typeof img === 'string') img = this.assets ? this.assets.img(img) : null;
    if (!img) return;
    this.ctx.drawImage(img, sx, sy, w, h, Math.round(dx), Math.round(dy), w, h);
  }
  /**
   * 9-slice: nineSlice(img, [sx,sy,sw,sh], border, dx, dy, dw, dh, { center: true, mode: 'stretch'|'tile' })
   * border: number or [left, top, right, bottom].
   */
  nineSlice(img, src, border, dx, dy, dw, dh, opts = {}) {
    if (typeof img === 'string') img = this.assets ? this.assets.img(img) : null;
    if (!img) return;
    const [sx, sy, sw, sh] = src;
    const [l, t, r, b] = Array.isArray(border) ? border : [border, border, border, border];
    dx = Math.round(dx); dy = Math.round(dy); dw = Math.round(dw); dh = Math.round(dh);
    const g = this.ctx;
    const cw = sw - l - r, ch = sh - t - b, dcw = dw - l - r, dch = dh - t - b;
    const tile = opts.mode === 'tile';
    const part = (px, py, pw, ph, qx, qy, qw, qh) => {
      if (pw <= 0 || ph <= 0 || qw <= 0 || qh <= 0) return;
      if (!tile || (pw === qw && ph === qh)) { g.drawImage(img, px, py, pw, ph, qx, qy, qw, qh); return; }
      for (let yy = 0; yy < qh; yy += ph) for (let xx = 0; xx < qw; xx += pw) {
        const w2 = Math.min(pw, qw - xx), h2 = Math.min(ph, qh - yy);
        g.drawImage(img, px, py, w2, h2, qx + xx, qy + yy, w2, h2);
      }
    };
    part(sx, sy, l, t, dx, dy, l, t);
    part(sx + l, sy, cw, t, dx + l, dy, dcw, t);
    part(sx + sw - r, sy, r, t, dx + dw - r, dy, r, t);
    part(sx, sy + t, l, ch, dx, dy + t, l, dch);
    if (opts.center !== false) part(sx + l, sy + t, cw, ch, dx + l, dy + t, dcw, dch);
    part(sx + sw - r, sy + t, r, ch, dx + dw - r, dy + t, r, dch);
    part(sx, sy + sh - b, l, b, dx, dy + dh - b, l, b);
    part(sx + l, sy + sh - b, cw, b, dx + l, dy + dh - b, dcw, b);
    part(sx + sw - r, sy + sh - b, r, b, dx + dw - r, dy + dh - b, r, b);
  }

  // ---------------------------------------------------------------- text
  /** Draw text with the bitmap font. opts: { font='main', color, shadow, outline, align, width, chars, alpha, lineHeight } */
  text(str, x, y, opts = {}) {
    if (!this.fonts) return { width: 0, height: 0, drawn: 0 };
    return this.fonts.get(opts.font || 'main').draw(this.ctx, str, x, y, opts);
  }
  measure(str, font = 'main') { return this.fonts ? this.fonts.get(font).measure(str) : 0; }
  wrap(str, maxWidth, font = 'main') { return this.fonts ? this.fonts.get(font).wrap(str, maxWidth) : [String(str)]; }
  font(id = 'main') { return this.fonts ? this.fonts.get(id) : null; }

  // ---------------------------------------------------------------- camera, clip, alpha
  /** Translate subsequent drawing so world point (x, y) maps to screen (0, 0). Rounded to whole pixels. */
  pushCamera(x, y) {
    const g = this.ctx;
    g.save();
    const cx = Math.round(x), cy = Math.round(y);
    g.translate(-cx, -cy);
    this._camStack.push(this.camera);
    this.camera = { x: this.camera.x + cx, y: this.camera.y + cy };
  }
  popCamera() {
    if (!this._camStack.length) return;
    this.ctx.restore();
    this.camera = this._camStack.pop();
  }
  pushClip(x, y, w, h) {
    const g = this.ctx;
    g.save(); g.beginPath(); g.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); g.clip();
    this._clipDepth++;
  }
  popClip() { if (this._clipDepth > 0) { this._clipDepth--; this.ctx.restore(); } }
  withAlpha(alpha, fn) {
    const g = this.ctx; const prev = g.globalAlpha;
    g.globalAlpha = prev * alpha;
    try { fn(); } finally { g.globalAlpha = prev; }
  }
  /** Fill the whole screen with color at alpha, ignoring camera and shake. */
  fade(color = '#000', alpha = 1) {
    if (alpha <= 0) return;
    const g = this.ctx;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = Math.min(1, alpha); g.fillStyle = color; g.fillRect(0, 0, this.W, this.H);
    g.restore();
  }
  /** Ordered-dither fade to color (0..1): a crisp SNES-style dissolve. Ignores camera. */
  ditherFade(color = '#000', amount = 1) {
    if (amount <= 0) return;
    if (amount >= 1) { this.fade(color, 1); return; }
    const g = this.ctx;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    this.dither(0, 0, this.W, this.H, color, amount);
    g.restore();
  }
  /** SNES mosaic: pixelate the current frame into size x size blocks. */
  mosaic(size) {
    size = Math.round(size);
    if (size <= 1) return;
    const sw = Math.ceil(this.W / size), sh = Math.ceil(this.H / size);
    const tmp = this._mosaicCanvas || (this._mosaicCanvas = makeCanvas(1, 1));
    if (tmp.width !== sw || tmp.height !== sh) { tmp.width = sw; tmp.height = sh; }
    const tg = tmp.getContext('2d'); tg.imageSmoothingEnabled = false;
    tg.drawImage(this.canvas, 0, 0, sw * size, sh * size, 0, 0, sw, sh);
    const g = this.ctx;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
    g.drawImage(tmp, 0, 0, sw, sh, 0, 0, sw * size, sh * size);
    g.restore();
  }
  /** Iris: fill everything outside a circle of radius r centered at (cx, cy) (screen coords), crisp. */
  iris(cx, cy, radius, color = '#000') {
    const g = this.ctx;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = color;
    cx = Math.round(cx); cy = Math.round(cy); radius = Math.max(0, radius);
    if (radius <= 0) { g.fillRect(0, 0, this.W, this.H); g.restore(); return; }
    for (let y = 0; y < this.H; y++) {
      const dy = y + 0.5 - cy;
      if (Math.abs(dy) >= radius) { g.fillRect(0, y, this.W, 1); continue; }
      const half = Math.floor(Math.sqrt(radius * radius - dy * dy));
      const x0 = cx - half, x1 = cx + half;
      if (x0 > 0) g.fillRect(0, y, Math.min(this.W, x0), 1);
      if (x1 < this.W) g.fillRect(Math.max(0, x1), y, this.W - Math.max(0, x1), 1);
    }
    g.restore();
  }
  /** A copy of the current game frame (for pause backgrounds, battle intro shatter, etc.). */
  snapshot() {
    const c = makeCanvas(this.W, this.H);
    c.getContext('2d').drawImage(this.canvas, 0, 0);
    return c;
  }

  // ---------------------------------------------------------------- layers
  /** Offscreen layer for caching static content (map ground, window backgrounds). */
  createLayer(w, h) {
    const canvas = makeCanvas(w, h);
    const ctx = ctx2d(canvas);
    return { canvas, ctx, w, h, clear() { ctx.clearRect(0, 0, w, h); } };
  }
  /** drawLayer(layer, sx, sy, sw, sh, dx, dy): blit part of a layer (1:1). Omit the rect to draw it whole at (0,0). */
  drawLayer(layer, sx = 0, sy = 0, sw = layer.w, sh = layer.h, dx = sx, dy = sy) {
    const src = layer.canvas || layer;
    sx = Math.round(sx); sy = Math.round(sy); sw = Math.round(sw); sh = Math.round(sh);
    // Clamp the source rect to the layer to avoid drawImage edge cases.
    const lw = src.width, lh = src.height;
    let ox = 0, oy = 0;
    if (sx < 0) { ox = -sx; sw += sx; sx = 0; }
    if (sy < 0) { oy = -sy; sh += sy; sy = 0; }
    sw = Math.min(sw, lw - sx); sh = Math.min(sh, lh - sy);
    if (sw <= 0 || sh <= 0) return;
    this.ctx.drawImage(src, sx, sy, sw, sh, Math.round(dx) + ox, Math.round(dy) + oy, sw, sh);
  }
}
