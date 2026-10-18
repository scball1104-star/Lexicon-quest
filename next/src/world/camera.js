// Field camera: locked follow (Chrono Trigger style, no lag), clamped to the map, pans for cutscenes.
//
//   const cam = new Camera(field);
//   cam.follow(actor)                 lock onto an actor (snaps unless a pan is in flight)
//   await cam.panTo(cx, cy, frames)   ease the view center to a world pixel (frames 0 = cut)
//   await cam.returnTo(actor, frames) ease back to an actor, then follow it
//   cam.update()                      once per logic frame, after the actors moved
//   cam.x, cam.y                      top-left of the view in world pixels (whole numbers)
//
// Maps smaller than the screen are centred (negative offsets); the field clears the margins dark.

import { ease } from '../core/tween.js';

export class Camera {
  constructor(field) {
    this.field = field;
    this.r = field.engine.renderer;
    this.x = 0; this.y = 0;
    this.cx = 0; this.cy = 0;        // view centre (float, before clamping)
    this.target = null;
    this.pan = null;                 // { fromX, fromY, toX, toY, t, dur, resolve, thenFollow }
  }

  get W() { return this.r.W; }
  get H() { return this.r.H; }

  bounds() {
    const map = this.field.map;
    const mw = map.pixelW, mh = map.pixelH;
    const minX = mw <= this.W ? (mw - this.W) / 2 : 0;
    const maxX = mw <= this.W ? minX : mw - this.W;
    const minY = mh <= this.H ? (mh - this.H) / 2 : 0;
    const maxY = mh <= this.H ? minY : mh - this.H;
    return { minX, maxX, minY, maxY };
  }

  clampCenter(cx, cy) {
    const b = this.bounds();
    const x = Math.max(b.minX, Math.min(b.maxX, cx - this.W / 2));
    const y = Math.max(b.minY, Math.min(b.maxY, cy - this.H / 2));
    return [x + this.W / 2, y + this.H / 2];
  }

  actorCenter(a) { return [Math.round(a.px) + 8, Math.round(a.py) + 8]; }

  follow(actor) {
    this.target = actor;
    if (!this.pan) { const [cx, cy] = this.actorCenter(actor); this.cx = cx; this.cy = cy; this.apply(); }
  }

  snapTo(actor) { this.pan = null; this.follow(actor); }

  panTo(cx, cy, frames = 30) {
    this.target = null;
    return this.panCenter(cx, cy, frames, null);
  }

  returnTo(actor, frames = 30) {
    const [cx, cy] = this.actorCenter(actor);
    return this.panCenter(cx, cy, frames, actor);
  }

  panCenter(cx, cy, frames, thenFollow) {
    const [tx, ty] = this.clampCenter(cx, cy);
    if (this.pan && this.pan.resolve) this.pan.resolve();
    if (frames <= 0) {
      this.pan = null; this.cx = tx; this.cy = ty; this.apply();
      if (thenFollow) this.target = thenFollow;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.pan = { fromX: this.cx, fromY: this.cy, toX: tx, toY: ty, t: 0, dur: frames, resolve, thenFollow };
    });
  }

  update() {
    if (this.pan) {
      const p = this.pan;
      p.t++;
      const k = ease.inOutSine(Math.min(1, p.t / p.dur));
      if (p.thenFollow) { const [tx, ty] = this.clampCenter(...this.actorCenter(p.thenFollow)); p.toX = tx; p.toY = ty; }
      this.cx = p.fromX + (p.toX - p.fromX) * k;
      this.cy = p.fromY + (p.toY - p.fromY) * k;
      if (p.t >= p.dur) {
        this.pan = null;
        if (p.thenFollow) this.target = p.thenFollow;
        p.resolve();
      }
    } else if (this.target) {
      const [cx, cy] = this.actorCenter(this.target);
      this.cx = cx; this.cy = cy;
    }
    this.apply();
  }

  apply() {
    const [cx, cy] = this.clampCenter(this.cx, this.cy);
    this.x = Math.round(cx - this.W / 2);
    this.y = Math.round(cy - this.H / 2);
  }

  /** World pixel -> screen pixel. */
  toScreen(wx, wy) { return [Math.round(wx - this.x), Math.round(wy - this.y)]; }
  /** Is a world rect (px) inside the view (with margin)? */
  visible(x, y, w, h, margin = 32) {
    return x + w >= this.x - margin && x <= this.x + this.W + margin && y + h >= this.y - margin && y <= this.y + this.H + margin;
  }
}
