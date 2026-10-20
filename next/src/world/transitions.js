// Map transitions and the location banner (W2-world).
//
//   transitionOpts('door' | 'stairs' | 'edge' | 'pit' | 'same' | 'ferry' | 'fall' | 'mirror' | 'fog', { dir, x, y })
//       -> options for engine.fadeTo (style, duration, hold, iris centre, wipe direction)
//   const banner = new Banner(engine); banner.show('Willowmere', 'Lantern Square'); banner.update(); banner.draw(r)
//
// Doors fade, stairs iris on the player, map edges wipe in the travel direction, pits drop through black.

import { ease } from '../core/tween.js';
import { drawBanner } from '../ui/window.js';

const KINDS = {
  door: { style: 'fade', duration: 0.5 },
  same: { style: 'fade', duration: 0.34 },
  stairs: { style: 'iris', duration: 0.8, hold: 0.08 },
  edge: { style: 'wipe', duration: 0.46 },
  pit: { style: 'fade', duration: 0.6, hold: 0.25 },
  fall: { style: 'fade', duration: 0.6, hold: 0.25 },
  ferry: { style: 'fade', duration: 1.0, hold: 0.35 },
  warp: { style: 'dither', duration: 0.4 },
  // E2: a Keeper mirror dissolves to white; the Fading Stretch's fog folds back on itself in a soft grey-white
  mirror: { style: 'dither', duration: 0.8, hold: 0.12, color: '#f2f6ff' },
  fog: { style: 'dither', duration: 0.7, hold: 0.1, color: '#d8dde6' },
};

/** Vertical wipe (the engine's wipe is horizontal only). */
function wipeV(dir) {
  return (r, k, o) => {
    const h = Math.ceil(r.H * k);
    if (dir === 'up') r.fillRect(0, r.H - h, r.W, h, o.color);
    else r.fillRect(0, 0, r.W, h, o.color);
  };
}

export function transitionOpts(kind, o = {}) {
  const base = { color: '#06050c', ...(KINDS[kind] || KINDS.door) };
  if (kind === 'stairs' && o.x != null) { base.x = o.x; base.y = o.y; }
  if (kind === 'edge') {
    if (o.dir === 'up' || o.dir === 'down') base.style = wipeV(o.dir);
    else base.dir = o.dir === 'left' ? 'left' : 'right';
  }
  return base;
}

export class Banner {
  constructor(engine) {
    this.engine = engine;
    this.title = null; this.sub = null;
    this.t = 0;
    this.total = 150;   // 2.5 s including slide in/out
  }
  show(title, sub = null) {
    if (!title) { this.title = null; return; }
    this.title = title; this.sub = sub || null; this.t = 0;
  }
  hide() { this.title = null; }
  get active() { return !!this.title && this.t < this.total; }
  update() { if (this.title) { this.t++; if (this.t >= this.total) this.title = null; } }
  draw(r) {
    if (!this.title) return;
    const t = this.t;
    const inK = ease.outCubic(Math.min(1, t / 18));
    const outK = t > this.total - 22 ? ease.inCubic(Math.min(1, (t - (this.total - 22)) / 22)) : 0;
    const y = Math.round(-26 + 36 * inK - 36 * outK);
    const text = this.sub ? `${this.title}` : this.title;
    const box = drawBanner(r, text, Math.round(r.W / 2), y);
    if (this.sub) {
      const sy = box.y + box.h + 2;
      const w = r.measure(this.sub) + 14;
      const x = Math.round(r.W / 2 - w / 2);
      r.withAlpha(0.8, () => r.rect(x, sy, w, 12, '#14101e'));
      r.text(this.sub, Math.round(r.W / 2), sy + 1, { align: 'center', color: 'cream' });
    }
  }
}
