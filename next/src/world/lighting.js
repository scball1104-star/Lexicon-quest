// Field lighting: day tints (dawn/day/dusk/night/ink), darkness with dithered light radii (dungeons), warm
// glows on fire and lamps, and the Lantern of Recall glow. Drawn after the overhead layer, before emotes.
//
//   const light = new Lighting(engine);
//   light.setTint('dawn', 0)            cut; setTint('night', 60) cross-fades over 60 frames
//   light.setDark(0.7)                  0 = fully lit; dungeons use 0.6 to 0.8
//   light.update()                      once per logic frame
//   light.draw(r, cam, lights, lanternAt)
//       lights: [{ x, y, r, kind?: 'cool'|'warm'|'lantern'|'neutral', color?, flicker? }] in world pixels
//
// Darkness (CRITIQUE_1 C7): one light map per frame. It starts as the room's ambient (a cool, dim multiplier),
// every light stamps a radial falloff into it with `lighten` (per-channel max, so overlapping lights never add
// up into a Venn diagram), and the map multiplies the frame. A stamp is 4 brightness bands whose edges are
// Bayer-ordered dithered rings (no smooth gradients, DESIGN 6.5 / SNES look). Fire and lamps are slightly warm,
// the party's own light in a dark room slightly cool, the Lantern of Recall pale green. Stamps are cached per
// (radius, kind, ambient).
//
// Tints multiply the whole frame; dusk and night also lower saturation (`desat`) so night reads as night, not
// as a blue evening (PLAYTEST section 7).

import { BAYER4 } from '../core/renderer.js';

export const TINTS = {
  none: null,
  day: null,
  dawn: { color: '#ffd6a6', alpha: 0.30 },
  dusk: { color: '#c48ab8', alpha: 0.46, desat: 0.14 },
  night: { color: '#262a66', alpha: 0.84, desat: 0.42 },
  ink: { color: '#a498c4', alpha: 0.42 },
  // E2: the Nameless Hollow's evening. W11 (CRITIQUE_4 item 3): it read as daylight (0.36 of #b6b0d4 took about a
  // tenth off each channel; luminance 0.444 against 0.491 restored). Now most of the colour is drained FIRST
  // (desatFirst), so the cold violet multiply lays one silver-violet over grass and cobble alike, and a pale haze
  // screened back over it lifts the shadows into mist: a town without colour, the lamps the only warm thing in it.
  // Measured (qa/integrate/w11_hollow_tint.py): luminance 0.36, saturation 0.17 (restored: 0.49, 0.43).
  hollow_dusk: { color: '#6c6aac', alpha: 0.64, desat: 0.75, desatFirst: true, haze: '#d4d4f4', hazeAlpha: 0.07 },
  // W11: the restoration's light (hollowmere_restored): a warm gold that lifts the square above plain day, so the
  // moment the name comes back the town gets brighter, not just less grey.
  hollow_dawn: { color: '#ffdcae', alpha: 0.2, glow: '#ffc27a', glowAlpha: 0.12 },
};

/** Tints under which lamps are lit, windows glow and fireflies come out. */
export const NIGHT_TINTS = new Set(['dusk', 'night']);
/** Tints under which lamps are lit and windows glow but nothing lives in the air (E2: hollow_dusk). */
export const LAMP_TINTS = new Set(['dusk', 'night', 'hollow_dusk']);

// Light colours at full brightness (centre band), per kind.
export const LIGHT_TINTS = {
  neutral: [255, 255, 255],
  cool: [220, 228, 255],
  warm: [255, 226, 184],
  lantern: [196, 255, 220],
  glow: [255, 184, 96],       // additive halo on fire and lamps (orange, so it reads as flame at night)
};
// Radial falloff: [outer edge as a fraction of the radius, brightness inside that edge]. Beyond the last edge: 0.
export const BANDS = [[0.30, 1.0], [0.56, 0.72], [0.80, 0.44], [1.0, 0.20]];
const EDGE = 0.07;                // half-width of the dithered transition at each band edge (fraction of r)
const LIFT = '#1a1430';           // indigo lift so unlit floor never reaches pure black (DESIGN 6.1)

export function tintSpec(name) {
  if (!name || name === 'none' || name === 'day') return null;
  if (TINTS[name]) return TINTS[name];
  if (typeof name === 'string' && name[0] === '#') return { color: name, alpha: 0.4 };
  return null;
}

/**
 * Brightness of a light at normalized distance d (0 = centre, 1 = edge) for the pixel (x, y): the band value,
 * with the Bayer 4x4 threshold deciding which side of a band edge a pixel in the transition zone falls on.
 * Pure (exported for tests).
 */
export function bandBrightness(d, x, y) {
  const th = (BAYER4[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
  for (let i = 0; i < BANDS.length; i++) {
    const [edge, inner] = BANDS[i];
    const outer = i + 1 < BANDS.length ? BANDS[i + 1][1] : 0;
    if (d < edge - EDGE) return inner;
    if (d < edge + EDGE) { const f = (d - (edge - EDGE)) / (2 * EDGE); return th < f ? outer : inner; }
  }
  return 0;
}

/** Ambient multiplier (0..255 per channel) for a darkness level: dim and slightly cool (shadows go violet). */
export function ambientFor(dark) {
  const base = 1 - dark;
  const c = (k) => Math.round(Math.max(0, Math.min(1, base * k)) * 255);
  return [c(0.92), c(0.90), c(1.12)];
}

export class Lighting {
  constructor(engine) {
    this.engine = engine;
    this.r = engine.renderer;
    this.layer = this.r.createLayer(this.r.W, this.r.H);
    this.dark = 0;
    this.tint = null;           // { color, alpha, desat? }
    this.tintName = 'none';
    this.tintFade = null;       // { from, to, t, dur }
    this.frame = 0;
    this.lantern = 0;           // frames left of the lantern glow
    this.lanternTotal = 120;
    this.stamps = new Map();
  }

  /**
   * A cached radial light stamp. kind 'cool'|'warm'|'lantern'|'neutral'. For the light map (`ambient` given)
   * the pixel is ambient + (tint - ambient) * brightness on an ambient background; for an additive glow
   * (`ambient` null) it is tint * brightness on black. Returns { canvas, R } with R the canvas half-size.
   */
  stamp(rad, kind = 'neutral', ambient = null) {
    rad = Math.max(2, rad | 0);
    const key = `${rad}|${kind}|${ambient ? ambient.join(',') : 'glow'}`;
    let s = this.stamps.get(key);
    if (s) return s;
    const tint = LIGHT_TINTS[kind] || LIGHT_TINTS.neutral;
    const R = Math.ceil(rad * (1 + EDGE)) + 1;
    const size = R * 2 + 1;
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const g = c.getContext('2d');
    const img = g.createImageData(size, size);
    const px = img.data;
    const bg = ambient || [0, 0, 0];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - R, dy = y - R;
        const d = Math.sqrt(dx * dx + dy * dy) / (rad + 0.5);
        const b = d >= 1 + EDGE ? 0 : bandBrightness(d, x, y);
        const i = (y * size + x) * 4;
        px[i] = Math.round(bg[0] + (tint[0] - bg[0]) * b);
        px[i + 1] = Math.round(bg[1] + (tint[1] - bg[1]) * b);
        px[i + 2] = Math.round(bg[2] + (tint[2] - bg[2]) * b);
        px[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    if (this.stamps.size > 64) this.stamps.clear();
    s = { canvas: c, R };
    this.stamps.set(key, s);
    return s;
  }

  setTint(name, frames = 0) {
    const to = tintSpec(name);
    this.tintName = typeof name === 'string' ? name : 'none';
    if (frames <= 0) { this.tint = to; this.tintFade = null; return Promise.resolve(); }
    return new Promise((resolve) => { this.tintFade = { from: this.tint, to, t: 0, dur: frames, resolve }; });
  }
  setDark(v) { this.dark = Math.max(0, Math.min(1, v || 0)); }
  raiseLantern(frames = 120) { this.lantern = frames; this.lanternTotal = frames; }
  /** True while the scene reads as evening or night (lamps lit, windows glowing, fireflies out). */
  get isNight() { return NIGHT_TINTS.has(this.tintName); }
  /** True while lamps should be lit (night, dusk, and the Hollow's still evening). */
  get lampsLit() { return LAMP_TINTS.has(this.tintName); }
  /** How strongly lamps and windows glow for the current tint: 0 by day, up to 1 at night. */
  get glowStrength() {
    if (this.tintName === 'night') return 1;
    if (this.tintName === 'dusk') return 0.6;
    if (this.tintName === 'hollow_dusk') return 0.6;
    if (this.tintName === 'dawn') return 0.25;
    return 0;
  }

  update() {
    this.frame++;
    if (this.lantern > 0) this.lantern--;
    if (this.tintFade) {
      const f = this.tintFade;
      f.t++;
      if (f.t >= f.dur) { this.tint = f.to; this.tintFade = null; f.resolve(); }
    }
  }

  /** Alpha-weighted tint list while cross-fading: [{ color, alpha, desat, haze, hazeAlpha, glow, glowAlpha }]. */
  currentTints() {
    const spec = (t, k) => ({ color: t.color, alpha: t.alpha * k, desat: (t.desat || 0) * k, desatFirst: !!t.desatFirst,
      haze: t.haze || null, hazeAlpha: (t.hazeAlpha || 0) * k, glow: t.glow || null, glowAlpha: (t.glowAlpha || 0) * k });
    if (!this.tintFade) return this.tint ? [spec(this.tint, 1)] : [];
    const f = this.tintFade, k = f.t / f.dur;
    const out = [];
    if (f.from) out.push(spec(f.from, 1 - k));
    if (f.to) out.push(spec(f.to, k));
    return out;
  }

  /** Multiplier the current tint applies to a colour (approximate), for particles drawn above the lighting. */
  shade() {
    let r = 1, g = 1, b = 1;
    for (const t of this.currentTints()) {
      if (t.alpha <= 0.005) continue;
      const c = hexRgb(t.color);
      r *= 1 - t.alpha + t.alpha * c[0] / 255;
      g *= 1 - t.alpha + t.alpha * c[1] / 255;
      b *= 1 - t.alpha + t.alpha * c[2] / 255;
    }
    return [r, g, b];
  }

  draw(r, cam, lights, lanternAt) {
    const g = r.ctx;
    // 1. Tints: multiply the frame, then pull saturation down for dusk and night (camera-independent).
    for (const t of this.currentTints()) {
      if (t.alpha <= 0.005) continue;
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
      // W11: `desatFirst` drains the colour before the multiply, so the tint colours a near-grey frame evenly
      // (a silver evening) instead of being drained with it.
      if (t.desatFirst && t.desat > 0.005) {
        g.globalCompositeOperation = 'saturation';
        g.globalAlpha = t.desat; g.fillStyle = '#808080'; g.fillRect(0, 0, r.W, r.H);
      }
      g.globalCompositeOperation = 'multiply';
      g.globalAlpha = t.alpha; g.fillStyle = t.color; g.fillRect(0, 0, r.W, r.H);
      if (t.desat > 0.005 && !t.desatFirst) {
        g.globalCompositeOperation = 'saturation';
        g.globalAlpha = t.desat; g.fillStyle = '#808080'; g.fillRect(0, 0, r.W, r.H);
      }
      // W11: a pale haze screened over the tint lifts the shadows into mist (hollow_dusk); a warm glow added on
      // top brightens the frame (hollow_dawn). Both flat fills: no gradient, so no banding.
      if (t.haze && t.hazeAlpha > 0.005) {
        g.globalCompositeOperation = 'screen';
        g.globalAlpha = t.hazeAlpha; g.fillStyle = t.haze; g.fillRect(0, 0, r.W, r.H);
      }
      if (t.glow && t.glowAlpha > 0.005) {
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = t.glowAlpha; g.fillStyle = t.glow; g.fillRect(0, 0, r.W, r.H);
      }
      g.restore();
    }
    // 2. Darkness: the light map (ambient + max of every stamp) multiplies the frame.
    if (this.dark > 0.01) {
      const L = this.layer, lg = L.ctx;
      const amb = ambientFor(this.dark);
      lg.save();
      lg.setTransform(1, 0, 0, 1, 0, 0);
      lg.globalCompositeOperation = 'source-over';
      lg.globalAlpha = 1;
      lg.fillStyle = `rgb(${amb[0]},${amb[1]},${amb[2]})`;
      lg.fillRect(0, 0, L.w, L.h);
      lg.globalCompositeOperation = 'lighten';
      for (const l of lights) {
        const sx = Math.round(l.x - cam.x), sy = Math.round(l.y - cam.y);
        let rad = l.r || 48;
        if (l.flicker) rad += ((this.frame >> 2) % 3) - 1;
        if (sx + rad < 0 || sy + rad < 0 || sx - rad > L.w || sy - rad > L.h) continue;
        const st = this.stamp(rad, l.kind || (l.color ? 'warm' : 'cool'), amb);
        lg.drawImage(st.canvas, sx - st.R, sy - st.R);
      }
      lg.restore();
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'multiply';
      g.globalAlpha = 1;
      g.drawImage(L.canvas, 0, 0);
      // never pure black: a faint indigo lift over everything (lit areas barely notice it)
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = this.dark * 0.5; g.fillStyle = LIFT; g.fillRect(0, 0, r.W, r.H);
      g.restore();
    }
    // 3. Glow halos on fire and lamps (additive, dithered): faint by day, strong at night, modest in dark rooms
    //    where the light map already carries the warmth.
    const glowK = this.dark > 0.01 ? 0.12 : 0.03 + 0.19 * this.glowStrength;
    if (lights.length && glowK > 0.01) {
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'lighter';
      for (const l of lights) {
        if (!l.color && l.kind !== 'warm') continue;
        const sx = Math.round(l.x - cam.x), sy = Math.round(l.y - cam.y);
        const rad = Math.max(8, Math.round((l.r || 48) * 0.42)) + (l.flicker ? ((this.frame >> 3) % 2) : 0);
        if (sx + rad < 0 || sy + rad < 0 || sx - rad > r.W || sy - rad > r.H) continue;
        const st = this.stamp(rad, 'glow', null);
        g.globalAlpha = glowK * (l.glow == null ? 1 : l.glow);
        g.drawImage(st.canvas, sx - st.R, sy - st.R);
      }
      g.restore();
    }
    // 4. The Lantern of Recall: a pale green pulse around the leader while it is raised.
    if (this.lantern > 0 && lanternAt) {
      const k = this.lantern / this.lanternTotal;
      const a = k > 0.8 ? (1 - k) / 0.2 : k < 0.3 ? k / 0.3 : 1;
      const sx = Math.round(lanternAt[0] - cam.x), sy = Math.round(lanternAt[1] - cam.y);
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'lighter';
      const outer = this.stamp(84 + ((this.frame >> 2) % 2), 'lantern', null);
      g.globalAlpha = 0.24 * a; g.drawImage(outer.canvas, sx - outer.R, sy - outer.R);
      const core = this.stamp(26, 'lantern', null);
      g.globalAlpha = 0.12 * a; g.drawImage(core.canvas, sx - core.R, sy - core.R);
      g.restore();
    }
  }
}

function hexRgb(c) {
  const s = String(c).replace('#', '');
  const n = parseInt(s.length === 3 ? s.split('').map((ch) => ch + ch).join('') : s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Crisp pixel circle from horizontal spans (no anti-aliasing). Kept for callers outside the lighting pass. */
export function fillCircle(ctx, cx, cy, rad, color) {
  if (rad <= 0) return;
  ctx.fillStyle = color;
  for (let dy = -rad; dy <= rad; dy++) {
    const t = 1 - (dy * dy) / ((rad + 0.5) * (rad + 0.5));
    const half = Math.floor(Math.sqrt(Math.max(0, t)) * (rad + 0.5));
    ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
}
