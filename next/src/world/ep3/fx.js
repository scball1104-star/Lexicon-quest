// Episode 3 field dressing (E3-world, EPISODE3_PLAN 5.2): the `ash_haze` tint, the `ash` and `steam` particles and the
// memory vignette. Attached to the field by ./index.js as `field.ep3fx`.
//
//   const fx = new Ep3Fx(field);
//   fx.reset()            per map: reads ambientFx 'ash' / { fx: 'ash', area, if, ifNot }
//   fx.update()           per frame: spawn and move flakes and puffs, memory actors' tint
//   fx.draw(r)            in world space before the lighting (ash and steam take the tint and the dark)
//   fx.drawScreen(r)      in screen space after the lighting (the memory vignette)
//   fx.steam(x, y, n)     a few white puffs at a world point (off under reduceMotion)

import { TINTS } from '../lighting.js';
import { matches } from '../../data/story/dialogue.js';
import { BAYER4 } from '../../core/renderer.js';

// A warm grey multiply with most of the colour drained first, a faint orange lift in the light: the Ash Hills.
// Measured by qa/world/e3_lab.py (tint): mean luminance at least 12% under 'none' on the same frame.
TINTS.ash_haze = TINTS.ash_haze || { color: '#b4a496', alpha: 0.62, desat: 0.38, desatFirst: true, glow: '#ff8a3a', glowAlpha: 0.035 };

/** Scene spawns drawn as memories: warm sepia, a little translucent, with the screen's vignette while any is present. */
export const MEMORY_IDS = new Set(['bram_m', 'mara_m', 'foreman_m']);
export const MEMORY_TINT = { color: '#d9a066', amount: 0.55 };
const ASH_CAP = 24;
const STEAM_CAP = 40;

export class Ep3Fx {
  constructor(field) {
    this.f = field;
    this.ash = []; this.puffs = [];
    this.areas = null; this.ashOn = false; this.ashEntry = null;
    this.mem = 0; this.vig = null; this.frame = 0;
  }

  reset() {
    this.ash = []; this.puffs = []; this.mem = 0;
    const mod = (this.f.map && this.f.map.mod) || {};
    this.entries = (mod.ambientFx || []).filter((k) => k === 'ash' || (k && typeof k === 'object' && k.fx === 'ash'));
    this.refreshAsh();
    if (this.ashOn) for (let i = 0; i < 40; i++) this.update(true);   // the air is already full on arrival
  }
  refreshAsh() {
    const hf = this.f.hasFlag;
    const on = this.entries.filter((k) => k === 'ash' || matches(k, hf));
    this.ashOn = on.length > 0;
    const areas = on.filter((k) => k && k.area).map((k) => k.area);
    this.areas = on.some((k) => k === 'ash' || !k.area) ? null : areas;
  }

  steam(x, y, n = 3) {
    const f = this.f;
    if (f.engine.settings && f.engine.settings.reduceMotion) return;
    const rng = f.rng;
    for (let i = 0; i < n && this.puffs.length < STEAM_CAP; i++) {
      this.puffs.push({ x: x + rng.int(-5, 5), y: y + rng.int(-3, 3), vx: rng.range(-0.12, 0.12), vy: -rng.range(0.25, 0.5), t: 0, life: 34 + rng.int(0, 18), s: rng.int(0, 1) });
    }
  }

  update(prewarm = false) {
    const f = this.f, cam = f.camera, rng = f.rng;
    this.frame++;
    if (!prewarm && this.frame % 30 === 0 && this.entries && this.entries.length) this.refreshAsh();
    if (this.ashOn && cam && this.frame % 6 === 0 && this.ash.length < ASH_CAP) {
      const W = cam.W || 384, H = cam.H || 216;
      const x = cam.x + rng.int(-16, W), y = prewarm ? cam.y + rng.int(-8, H) : cam.y - 6;
      if (!this.areas || this.areas.some((a) => x >= a.x * 16 && x < (a.x + a.w) * 16 && y + 60 >= a.y * 16 && y < (a.y + a.h) * 16)) {
        this.ash.push({ x, y, vx: rng.range(0.05, 0.2), vy: rng.range(0.12, 0.26), ph: rng.range(0, 6.28), t: 0, life: 420 + rng.int(0, 200), c: rng.int(0, 2) });
      }
    }
    if (this.ash.length) {
      const keep = [];
      const H = (cam && cam.H) || 216;
      for (const p of this.ash) {
        p.t++;
        p.x += p.vx + Math.sin(p.ph + p.t * 0.04) * 0.22;
        p.y += p.vy;
        if (p.t < p.life && (!cam || p.y < cam.y + H + 8)) keep.push(p);
      }
      this.ash = keep;
    }
    if (this.puffs.length) {
      const keep = [];
      for (const p of this.puffs) { p.t++; p.x += p.vx; p.y += p.vy; p.vy *= 0.97; if (p.t < p.life) keep.push(p); }
      this.puffs = keep;
    }
    if (prewarm) return;
    // memory actors: sepia and a little translucent; the vignette follows their presence
    let any = false;
    for (const a of f.actors) {
      if (!MEMORY_IDS.has(a.id)) continue;
      any = true;
      if (!a.memory) { a.memory = true; a.tint = MEMORY_TINT; a.alpha = 0.88; }
    }
    this.mem = Math.max(0, Math.min(30, this.mem + (any ? 1 : -1)));
  }

  /** World space, before the lighting: ash flakes and steam puffs. */
  draw(r) {
    const cam = this.f.camera;
    if (!cam) return;
    for (const p of this.ash) {
      const x = Math.round(p.x), y = Math.round(p.y);
      if (x < cam.x - 4 || x > cam.x + r.W + 4 || y < cam.y - 4 || y > cam.y + r.H + 4) continue;
      const k = p.t / p.life, a = k < 0.1 ? k * 10 : k > 0.85 ? (1 - k) / 0.15 : 1;
      r.withAlpha(0.8 * a, () => {
        r.rect(x, y, p.c ? 2 : 1, 1, p.c === 2 ? '#d6d0c8' : '#9a948e');
        if (p.c) r.rect(x + (Math.floor(p.t / 14) % 2), y + 1, 1, 1, '#6e6862');
      });
    }
    for (const p of this.puffs) {
      const k = p.t / p.life, x = Math.round(p.x), y = Math.round(p.y);
      const s = k < 0.3 ? 2 : k < 0.7 ? 3 : 4;
      r.withAlpha(0.7 * (1 - k), () => {
        r.rect(x - (s >> 1), y - (s >> 1), s, s, '#f2f4f6');
        if (s > 2) r.rect(x - (s >> 1) + 1, y - (s >> 1) - 1, s - 2, 1, '#ffffff');
      });
    }
  }

  /** Screen space, after the lighting: the memory vignette (a soft warm dithered edge), faded by presence. */
  drawScreen(r) {
    if (this.mem <= 0) return;
    if (!this.vig && typeof document !== 'undefined') this.vig = vignette(r.W, r.H);
    if (!this.vig) return;
    r.withAlpha(this.mem / 30, () => r.ctx.drawImage(this.vig, 0, 0));
  }
}

/** A warm brown dithered border, densest at the corners, clear in the middle (Bayer 4x4 thresholds). */
function vignette(W, H) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#2a1608';
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = Math.abs(x + 0.5 - W / 2) / (W / 2), dy = Math.abs(y + 0.5 - H / 2) / (H / 2);
    const d = Math.max(dx, dy * 0.92) * 0.6 + Math.sqrt(dx * dx + dy * dy) * 0.4;
    const k = Math.max(0, (d - 0.72) / 0.3);
    if (k <= 0) continue;
    if ((BAYER4[((y & 3) << 2) | (x & 3)] + 0.5) / 16 < Math.min(0.9, k)) g.fillRect(x, y, 1, 1);
  }
  return c;
}
