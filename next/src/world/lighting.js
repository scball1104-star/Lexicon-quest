// Field lighting: darkness with banded light radii (dungeons), day tints (dawn/day/dusk/night/ink) and the
// Lantern of Recall glow. Drawn after the overhead layer, before emotes and windows.
//
//   const light = new Lighting(engine);
//   light.setTint('dawn', 0)            cut; setTint('night', 60) cross-fades over 60 frames
//   light.setDark(0.7)                  0 = fully lit; dungeons use 0.6 to 0.8
//   light.update()                      once per logic frame
//   light.draw(r, cam, lights)          lights: [{ x, y, r, color?, flicker? }] in world pixels
//
// Darkness is an offscreen layer filled with indigo at `dark` alpha, with each light erased in four
// concentric bands (SNES style: no smooth gradients). Tints multiply the whole frame.

export const TINTS = {
  none: null,
  day: null,
  dawn: { color: '#ffd6a6', alpha: 0.30 },
  dusk: { color: '#d08cb4', alpha: 0.42 },
  night: { color: '#4b5ab4', alpha: 0.66 },
  ink: { color: '#a498c4', alpha: 0.42 },
};
const BANDS = [[1.0, 0.32], [0.78, 0.36], [0.56, 0.45], [0.34, 0.7]];

export function tintSpec(name) {
  if (!name || name === 'none' || name === 'day') return null;
  if (TINTS[name]) return TINTS[name];
  if (typeof name === 'string' && name[0] === '#') return { color: name, alpha: 0.4 };
  return null;
}

export class Lighting {
  constructor(engine) {
    this.engine = engine;
    this.r = engine.renderer;
    this.layer = this.r.createLayer(this.r.W, this.r.H);
    this.dark = 0;
    this.tint = null;           // { color, alpha }
    this.tintFade = null;       // { from, to, t, dur }
    this.frame = 0;
    this.lantern = 0;           // frames left of the lantern glow
    this.lanternTotal = 120;
  }

  /** A pre-rendered banded light disc (alpha = how much darkness it erases), cached per radius. */
  stamp(rad) {
    if (!this.stamps) this.stamps = new Map();
    let c = this.stamps.get(rad);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = rad * 2 + 1; c.height = rad * 2 + 1;
    const g = c.getContext('2d');
    g.globalCompositeOperation = 'source-over';
    // bands erase cumulatively: alpha_n = 1 - prod(1 - a_k) for the bands a pixel lies in
    for (const [k, a] of BANDS) { g.globalAlpha = a; fillCircle(g, rad, rad, Math.round(rad * k), '#000'); }
    if (this.stamps.size > 40) this.stamps.clear();
    this.stamps.set(rad, c);
    return c;
  }

  setTint(name, frames = 0) {
    const to = tintSpec(name);
    if (frames <= 0) { this.tint = to; this.tintFade = null; return Promise.resolve(); }
    return new Promise((resolve) => { this.tintFade = { from: this.tint, to, t: 0, dur: frames, resolve }; });
  }
  setDark(v) { this.dark = Math.max(0, Math.min(1, v || 0)); }
  raiseLantern(frames = 120) { this.lantern = frames; this.lanternTotal = frames; }

  update() {
    this.frame++;
    if (this.lantern > 0) this.lantern--;
    if (this.tintFade) {
      const f = this.tintFade;
      f.t++;
      if (f.t >= f.dur) { this.tint = f.to; this.tintFade = null; f.resolve(); }
    }
  }

  /** Alpha-weighted tint pair while cross-fading. */
  currentTints() {
    if (!this.tintFade) return this.tint ? [[this.tint.color, this.tint.alpha]] : [];
    const f = this.tintFade, k = f.t / f.dur;
    const out = [];
    if (f.from) out.push([f.from.color, f.from.alpha * (1 - k)]);
    if (f.to) out.push([f.to.color, f.to.alpha * k]);
    return out;
  }

  draw(r, cam, lights, lanternAt) {
    // Tints: multiply the frame (camera-independent).
    const g = r.ctx;
    for (const [color, alpha] of this.currentTints()) {
      if (alpha <= 0.005) continue;
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'multiply';
      g.globalAlpha = alpha; g.fillStyle = color; g.fillRect(0, 0, r.W, r.H);
      g.restore();
    }
    if (this.dark <= 0.01 && this.lantern <= 0) return;
    if (this.dark > 0.01) {
      const L = this.layer, lg = L.ctx;
      lg.save();
      lg.setTransform(1, 0, 0, 1, 0, 0);
      lg.globalCompositeOperation = 'source-over';
      lg.clearRect(0, 0, L.w, L.h);
      lg.globalAlpha = 1;
      lg.fillStyle = `rgba(13,10,22,${this.dark})`;
      lg.fillRect(0, 0, L.w, L.h);
      lg.globalCompositeOperation = 'destination-out';
      lg.globalAlpha = 1;
      for (const l of lights) {
        const sx = Math.round(l.x - cam.x), sy = Math.round(l.y - cam.y);
        let rad = l.r || 48;
        if (l.flicker) rad += ((this.frame >> 2) % 3) - 1;
        if (sx + rad < 0 || sy + rad < 0 || sx - rad > L.w || sy - rad > L.h) continue;
        const st = this.stamp(rad);
        lg.drawImage(st, sx - rad, sy - rad);
      }
      lg.restore();
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      g.drawImage(L.canvas, 0, 0);
      g.restore();
    }
    // Warm glow discs on lit sources (additive, subtle) so braziers read as fire.
    if (lights.length) {
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'lighter';
      for (const l of lights) {
        if (!l.color) continue;
        const sx = Math.round(l.x - cam.x), sy = Math.round(l.y - cam.y);
        const rad = Math.round((l.r || 48) * 0.45);
        if (sx + rad < 0 || sy + rad < 0 || sx - rad > r.W || sy - rad > r.H) continue;
        g.globalAlpha = 0.10; fillCircle(g, sx, sy, rad, l.color);
        g.globalAlpha = 0.06; fillCircle(g, sx, sy, Math.round(rad * 0.55), l.color);
      }
      g.restore();
    }
    if (this.lantern > 0 && lanternAt) {
      const k = this.lantern / this.lanternTotal;
      const a = k > 0.8 ? (1 - k) / 0.2 : k < 0.3 ? k / 0.3 : 1;
      const sx = Math.round(lanternAt[0] - cam.x), sy = Math.round(lanternAt[1] - cam.y);
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.16 * a; fillCircle(g, sx, sy, 84 + ((this.frame >> 1) % 2), '#4ef0a8');
      g.globalAlpha = 0.14 * a; fillCircle(g, sx, sy, 52, '#9fffd0');
      g.globalAlpha = 0.10 * a; fillCircle(g, sx, sy, 24, '#ffffff');
      g.restore();
    }
  }
}

/** Crisp pixel circle from horizontal spans (no anti-aliasing). */
export function fillCircle(ctx, cx, cy, rad, color) {
  if (rad <= 0) return;
  ctx.fillStyle = color;
  for (let dy = -rad; dy <= rad; dy++) {
    const t = 1 - (dy * dy) / ((rad + 0.5) * (rad + 0.5));
    const half = Math.floor(Math.sqrt(Math.max(0, t)) * (rad + 0.5));
    ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
}
