// Battle presentation effects (W2-battle-scene). Everything here is drawn with the renderer's crisp pixel
// helpers at the internal resolution: weapon arcs, projectiles, magic circles, element bursts, status
// sparkles, ink splashes, enemy attack marks, the BREAK burst, the Fury flash, summon pops, the devour
// vortex, pixel dissolves and the battle-intro slice transition. No game logic lives here.
// Impact language (W4-battle-polish, CRITIQUE C11): weapon arcs are 2 px with a trailing fade, every hit lands a
// 4-frame impact star, thrusts leave motion lines, chops a wedge, arrows a trail and magic a brief bloom.
//
//   const fx = new BattleFx(engine);
//   fx.spawn('slash', { x, y, h, fromX, fromY, weapon, big })     target feet (x, y), sprite height h
//   fx.update();  fx.drawUnder(r);  fx.drawOver(r);  fx.active;  fx.clear();
//   dissolveSprite(r, atlas, frame, x, y, k, opts)                 pixel dissolve (k 0 = whole, 1 = gone)
//   new SliceTransition(snapshotCanvas, rng, { reduceMotion })      .update(), .draw(r), .done  (battle intro)
//
// Coordinates: (x, y) is the target's feet (sprite origin); cy = y - h / 2 is the body center.

import { animFrameAt } from '../core/assets.js';
import { hash2d } from '../core/rng.js';
import { BAYER4 } from '../core/renderer.js';

export const C = {
  white: '#f6f4ee', cream: '#fff7d6', cyan: '#8af0e8', blue: '#6ab3e4', gold: '#f9d77a', orange: '#eba14d',
  red: '#e06b39', green: '#b6cc58', heal: '#8fe07a', violet: '#bc94e2', purple: '#a77bff', ink: '#14101e',
  inkBlue: '#2a2258', ice: '#cfefff', paper: '#e8dcb8', dark: '#0d0b16',
};
const FIRE = ['#fff1a8', '#ffcf5a', '#eba14d', '#e06b39', '#8a2a2a'];
const ICE = ['#ffffff', '#cfefff', '#8fd0ff', '#6ab3e4'];
const LIGHT = ['#ffffff', '#fff7d6', '#f9d77a'];
const HEAL = ['#ffffff', '#c8ffb0', '#8fe07a', '#b6cc58'];
const INK = ['#2a2258', '#4a3888', '#6a54b0', '#9a86d8'];
const STATUS_COLORS = { poison: ['#a77bff', '#6a54b0'], burn: FIRE, chill: ICE, stun: ['#f9d77a', '#fff7d6'], silence: ['#bc94e2', '#8e8997'],
  blind: ['#4a4560', '#8e8997'], regen: HEAL, protect: ['#8af0e8', '#6ab3e4'], haste: ['#f9d77a', '#eba14d'], focus: ['#e06b39', '#f9d77a'],
  taunt: ['#eba14d', '#e06b39'], nameless: INK };

function sin(a) { return Math.sin(a); }
function cos(a) { return Math.cos(a); }
const TAU = Math.PI * 2;

/** Simple deterministic jitter so effects look the same every run of a seeded battle. */
function jit(seed, i, k = 0) { return hash2d(i, k, seed) * 2 - 1; }

// ------------------------------------------------------------------------------------------- pixel dissolve
const dissolveCache = new Map();
function ditherPattern(ctx, level, color) {
  const key = `${level}|${color}`;
  let p = dissolveCache.get(key);
  if (p) return p;
  const c = document.createElement('canvas'); c.width = 4; c.height = 4;
  const g = c.getContext('2d'); g.fillStyle = color;
  for (let i = 0; i < 16; i++) if (BAYER4[i] < level) g.fillRect(i % 4, (i / 4) | 0, 1, 1);
  p = ctx.createPattern(c, 'repeat');
  dissolveCache.set(key, p);
  return p;
}
let scratch = null;
/**
 * Draw a sprite frame with k (0..1) of its pixels removed in a Bayer dither (SNES death dissolve).
 * opts: { flipX, tint, tintAmount, scale, drop: px the remaining pixels sink, rows: dissolve bottom-up }.
 * W8-art: `scale` and `tint` match Renderer.sprite (feet anchored at (x, y), destination rounded to whole pixels,
 * tint = a tintAmount blend toward the colour), so a scaled or tinted unit does not pop as it starts to dissolve.
 * The dither runs on the frame's own pixels (one Bayer cell per source pixel), so it scales with the sprite.
 */
export function dissolveSprite(r, atlas, frame, x, y, k, opts = {}) {
  const f = typeof frame === 'object' ? frame : atlas.frames[frame];
  if (!f || !atlas.image) return;
  if (!scratch) { scratch = document.createElement('canvas'); }
  if (scratch.width < f.w || scratch.height < f.h) { scratch.width = Math.max(scratch.width, f.w); scratch.height = Math.max(scratch.height, f.h); }
  const g = scratch.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, f.w, f.h);
  g.drawImage(atlas.image, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
  if (opts.tint && (opts.tintAmount ?? 1) > 0) {
    g.globalCompositeOperation = 'source-atop';
    g.globalAlpha = opts.tintAmount ?? 1; g.fillStyle = opts.tint; g.fillRect(0, 0, f.w, f.h); g.globalAlpha = 1;
  }
  const level = Math.round(Math.max(0, Math.min(1, k)) * 16);
  if (level > 0) {
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = ditherPattern(g, level, '#000');
    g.fillRect(0, 0, f.w, f.h);
    // Rows go first from the top so the sprite seems to sink into the floor.
    if (opts.rows) { const cut = Math.round(f.h * Math.max(0, k * 1.3 - 0.3)); if (cut > 0) g.clearRect(0, 0, f.w, cut); }
  }
  g.restore();
  const sc = opts.scale > 0 ? opts.scale : 1;
  const w = Math.round(f.w * sc), h = Math.round(f.h * sc);
  const ox = opts.flipX ? f.w - 1 - f.ox : f.ox;
  const dx = Math.round(x - ox * sc), dy = Math.round(y - f.oy * sc + (opts.drop || 0));
  const ctx = r.ctx;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (opts.flipX) { ctx.translate(dx + w, dy); ctx.scale(-1, 1); ctx.drawImage(scratch, 0, 0, f.w, f.h, 0, 0, w, h); }
  else ctx.drawImage(scratch, 0, 0, f.w, f.h, dx, dy, w, h);
  ctx.restore();
}

// ------------------------------------------------------------------------------------------- the effect pool
export class BattleFx {
  constructor(engine) {
    this.engine = engine;
    this.items = [];
    this.parts = [];
    this.seed = 7;
    this.frame = 0;
  }
  get active() { return this.items.length + this.parts.length; }
  clear() { this.items.length = 0; this.parts.length = 0; }
  get reduce() { return !!(this.engine && this.engine.settings && this.engine.settings.reduceMotion); }
  uiAtlas() { const a = this.engine && this.engine.assets; return a && a.has('ui') ? a.atlas('ui') : null; }

  add(frames, draw, layer = 'over', extra = {}) {
    const it = { t: 0, frames, draw, layer, ...extra };
    this.items.push(it);
    return it;
  }
  /** Burst of particles: n, from (cx, cy), opts { speed, spread (radians), dir (radians), gravity, life, colors, size, drift, rise } */
  particles(cx, cy, n, o = {}) {
    const seed = this.seed++;
    const colors = o.colors || [C.white];
    for (let i = 0; i < n; i++) {
      const ang = (o.dir ?? -Math.PI / 2) + (o.spread ?? TAU) * (hash2d(i, 1, seed) - 0.5);
      const sp = (o.speed ?? 1.5) * (0.5 + hash2d(i, 2, seed));
      this.parts.push({
        x: cx + (o.radius ? jit(seed, i, 3) * o.radius : 0), y: cy + (o.radius ? jit(seed, i, 4) * (o.radiusY ?? o.radius) : 0),
        vx: cos(ang) * sp + (o.vx || 0), vy: sin(ang) * sp + (o.vy || 0), g: o.gravity || 0, drift: o.drift || 0,
        t: -(o.delay ? Math.floor(hash2d(i, 5, seed) * o.delay) : 0), life: Math.round((o.life ?? 20) * (0.7 + 0.6 * hash2d(i, 6, seed))),
        color: colors[i % colors.length], size: o.size ?? 1, shrink: !!o.shrink, blink: !!o.blink, seed: seed * 31 + i,
      });
    }
  }

  update() {
    this.frame++;
    for (const it of this.items) it.t++;
    this.items = this.items.filter((it) => it.t < it.frames);
    for (const p of this.parts) {
      p.t++;
      if (p.t < 0) continue;
      p.x += p.vx + (p.drift ? sin((p.t + p.seed) * 0.3) * p.drift : 0);
      p.y += p.vy;
      p.vy += p.g;
    }
    this.parts = this.parts.filter((p) => p.t < p.life);
  }
  drawUnder(r) { for (const it of this.items) if (it.layer === 'under') it.draw(r, it.t, it); }
  drawOver(r) {
    for (const it of this.items) if (it.layer === 'over') it.draw(r, it.t, it);
    for (const p of this.parts) {
      if (p.t < 0) continue;
      if (p.blink && ((p.t >> 1) & 1)) continue;
      const s = p.shrink ? Math.max(1, Math.round(p.size * (1 - p.t / p.life))) : p.size;
      r.rect(Math.round(p.x), Math.round(p.y), s, s, p.color);
    }
    for (const it of this.items) if (it.layer === 'top') it.draw(r, it.t, it);
  }

  // ----------------------------------------------------------------------------------------- spawn table
  /**
   * spawn(kind, o): o = { x, y (target feet), h (target sprite height), w, fromX, fromY, fromH, weapon, big,
   *                        status, item, color, uids, stance, phase, success, pages (positions) }
   */
  spawn(kind, o = {}) {
    const fn = this[`fx_${kind}`];
    if (typeof fn === 'function') { fn.call(this, o); return true; }
    // Unknown fx ids degrade to a plain hit spark so nothing ever looks like "nothing happened".
    this.fx_hit_spark(o);
    return false;
  }
  center(o) { return { cx: Math.round(o.x || 0), cy: Math.round((o.y || 0) - (o.h || 32) / 2) }; }

  // --- weapon arcs (party faces left: arcs sweep from upper-right to lower-left of the target) ----------
  /**
   * Weapon arc: a 2 px head (3 px when thick) sweeping a0 -> a1 over the first ~55% of `frames`, with a trail
   * behind it that fades and thins toward the tail (colors[0] at the head ... colors[last] at the tail), then the
   * whole arc fades out. Every point is ink-outlined so it reads over any backdrop.
   */
  arc(cx, cy, radius, a0, a1, frames, colors, o = {}) {
    const n = Math.max(4, Math.round(Math.abs(a1 - a0) * radius / 2));
    const thick = o.thick ? 3 : 2;
    const tailLen = o.tailLen ?? 0.5;
    this.add(frames, (r, t) => {
      const sweep = Math.max(1, frames * (o.sweep ?? 0.55));
      const k = Math.min(1, (t + 1) / sweep);
      const tail = Math.max(0, k - tailLen);
      const after = t > sweep ? (t - sweep) / Math.max(1, frames - sweep) : 0;
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        if (u > k || u < tail) continue;
        const back = Math.min(1, (k - u) / tailLen);          // 0 at the head, 1 at the end of the trail
        const a = a0 + (a1 - a0) * u;
        const w = back < 0.3 ? thick : Math.max(2, thick - 1);
        const x = Math.round(cx + cos(a) * radius - w / 2), y = Math.round(cy + sin(a) * radius * (o.squash ?? 0.8) - w / 2);
        const ci = Math.min(colors.length - 1, Math.floor(back * colors.length));
        pts.push([x, y, w, colors[ci], Math.max(0.12, 1 - back * 0.85) * (1 - after)]);
      }
      for (const [x, y, w, , al] of pts) r.withAlpha(al, () => r.rect(x - 1, y - 1, w + 2, w + 2, C.ink));
      for (const [x, y, w, c, al] of pts) r.withAlpha(al, () => r.rect(x, y, w, w, c));
      // A bright 1 px core on the head while the sweep is still moving.
      if (k < 1 && pts.length) { const h = pts[pts.length - 1]; r.rect(h[0] + 1, h[1] + 1, Math.max(1, h[2] - 2), Math.max(1, h[2] - 2), C.white); }
    }, 'over');
  }
  /**
   * Chop wedge: the filled sector the blade sweeps, drawn as rays from the pivot (narrow where the swing began,
   * full radius at the blade), fading once the swing lands.
   */
  wedge(cx, cy, radius, a0, a1, frames, colors, o = {}) {
    this.add(frames, (r, t) => {
      const sweep = Math.max(1, frames * (o.sweep ?? 0.5));
      const k = Math.min(1, (t + 1) / sweep);
      const after = t > sweep ? (t - sweep) / Math.max(1, frames - sweep) : 0;
      const a = a0 + (a1 - a0) * k;
      const steps = Math.max(3, Math.round(Math.abs(a - a0) * radius / 1.6));
      r.withAlpha(0.7 * (1 - after), () => {
        for (let i = 0; i <= steps; i++) {
          const u = i / steps;
          const ang = a0 + (a - a0) * u;
          const rr = radius * (0.3 + 0.7 * u);
          r.line(cx, cy, cx + cos(ang) * rr, cy + sin(ang) * rr * (o.squash ?? 1), i >= steps - 1 ? colors[0] : colors[1]);
        }
      });
    }, 'over');
  }
  /** Brief magic bloom at the point of effect: three dithered discs (white core, element rim) that swell and fade. */
  bloom(cx, cy, color, big = false) {
    const R = big ? [8, 14, 20] : [5, 10, 15];
    this.add(3, (r, t) => {
      const rad = R[t];
      r.withAlpha(0.8 - t * 0.25, () => {
        r.ditherEllipse(cx, cy, rad + 3, Math.round((rad + 3) * 0.75), color, 0.45);
        r.ditherEllipse(cx, cy, rad, Math.round(rad * 0.75), C.white, t === 0 ? 0.8 : 0.5);
      });
    }, 'over');
  }
  targetRadius(o, big) {
    const size = Math.max(o.w || 32, o.h || 32);
    return Math.max(big ? 22 : 16, Math.round(size * (big ? 0.5 : 0.4)));
  }
  fx_slash(o) {
    const { cx, cy } = this.center(o);
    const big = !!o.big;
    const rad = this.targetRadius(o, big);
    this.arc(cx, cy, rad, -1.1, 2.6, big ? 14 : 10, big ? [C.white, C.gold, C.orange] : [C.white, C.cyan, C.blue], { thick: big });
    this.particles(cx, cy, big ? 10 : 5, { colors: [C.white, C.cyan], speed: 1.6, life: 12, gravity: 0.08 });
  }
  fx_slash_up(o) {
    const { cx, cy } = this.center(o);
    this.arc(cx, cy, this.targetRadius(o, true), 2.4, -0.9, 12, [C.white, C.gold, C.cyan], { thick: true });
    this.particles(cx, cy + 6, 8, { colors: [C.white, C.gold], dir: -Math.PI / 2, spread: 1.2, speed: 2.4, life: 14, gravity: 0.1 });
  }
  fx_slash_wide(o) {
    const { cx, cy } = this.center(o);
    this.arc(cx, cy, this.targetRadius(o, true) + 6, -0.6, 3.2, 14, [C.white, C.cyan, C.blue], { thick: true, squash: 0.5 });
    this.particles(cx, cy, 6, { colors: [C.white, C.cyan], speed: 2, life: 12 });
  }
  fx_dash(o) {
    const { cx, cy } = this.center(o);
    this.add(10, (r, t) => {
      for (let i = 0; i < 3; i++) {
        const y = cy - 6 + i * 6, len = 26 - t * 2;
        if (len > 0) r.line(cx + 18 - t * 3, y, cx + 18 - t * 3 - len, y, i === 1 ? C.white : C.cyan);
      }
    });
    this.particles(cx, cy, 6, { colors: [C.white, C.cyan], dir: Math.PI, spread: 0.6, speed: 2.5, life: 10 });
  }
  fx_chop(o) {
    const { cx, cy } = this.center(o);
    const big = !!o.big;
    const rad = this.targetRadius(o, big) + 2;
    this.wedge(cx + 6, cy - 4, rad, -1.9, 1.2, big ? 14 : 10, big ? [C.gold, C.orange] : [C.cream, C.orange], { squash: 1.1, sweep: 0.5 });
    this.arc(cx + 6, cy - 4, rad, -1.9, 1.2, big ? 14 : 10, big ? [C.white, C.gold, C.orange] : [C.white, C.cream, C.orange], { thick: true, squash: 1.1, sweep: 0.5 });
    this.add(12, (r, t) => {
      if (t < 4) return;
      const k = (t - 4) / 8;
      r.withAlpha(1 - k, () => { r.ellipse(cx, o.y - 1, 10 + Math.round(k * 10), 3, '#c8b48a', false); });
    });
    this.particles(cx, o.y - 2, big ? 14 : 8, { colors: ['#c8b48a', '#8a6a4a', C.white], dir: -Math.PI / 2, spread: 2.4, speed: 1.8, life: 16, gravity: 0.12, delay: 4 });
  }
  fx_thrust(o) {
    const { cx, cy } = this.center(o);
    const big = !!o.big;
    this.add(big ? 12 : 9, (r, t) => {
      const k = Math.min(1, t / 4);
      const len = Math.round((big ? 34 : 24) * k);
      const x0 = cx + 14;
      // Motion lines: speed streaks trailing behind the point, longest on the first frame, gone by the hit.
      if (t < 6) {
        const fade = 1 - t / 6;
        r.withAlpha(fade, () => {
          for (let i = -1; i <= 1; i++) {
            const y = cy + i * (big ? 7 : 5) - (i === 0 ? 1 : 0);
            const l = Math.round((big ? 44 : 32) * (1 - t / 7) * (i === 0 ? 1 : 0.65));
            if (l > 1) { r.rect(x0 + 6, y, l, 1, C.ink); r.rect(x0 + 6, y - 1, l, 1, i === 0 ? C.white : C.cyan); }
          }
        });
      }
      if (t < 7) {
        r.rect(x0 - len - 1, cy - (big ? 6 : 5), len + 3, big ? 13 : 11, C.ink);
        for (let i = -1; i <= 1; i++) {
          const y = cy + i * (big ? 4 : 3);
          const col = i === 0 ? C.white : (big ? C.gold : C.cyan);
          r.rect(x0 - len, y - 1, len, i === 0 ? 3 : 2, col);
        }
      }
      if (t >= 2 && t < 8) { r.rect(cx - 3, cy - 3, 7, 7, C.ink); r.rect(cx - 2, cy - 2, 5, 5, C.white); r.rect(cx - 1, cy - 1, 3, 3, big ? C.gold : C.cyan); }
    });
    this.particles(cx, cy, big ? 12 : 6, { colors: [C.white, C.cyan, C.gold], dir: Math.PI, spread: 1.2, speed: 2, life: 12, delay: 2 });
  }
  fx_thrust_big(o) { this.fx_thrust({ ...o, big: true }); this.fx_ring(o, { color: C.cyan, r0: 4, r1: 22, frames: 12 }); }
  fx_bonk(o) {
    const { cx, cy } = this.center(o);
    this.add(10, (r, t) => {
      const k = t / 10;
      const rad = 4 + Math.round(k * 10);
      r.withAlpha(1 - k, () => { r.ellipse(cx, cy - 6, rad, Math.round(rad * 0.7), C.gold, false); });
      if (t < 5) for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; r.line(cx + cos(a) * 3, cy - 6 + sin(a) * 3, cx + cos(a) * 9, cy - 6 + sin(a) * 9, C.white); }
    });
    this.particles(cx, cy - 6, 6, { colors: [C.gold, C.white], speed: 1.4, life: 12, blink: true });
  }
  fx_arrow(o) { this.arrowFrom(o, 0); }
  fx_arrows(o) { for (let i = 0; i < 4; i++) this.arrowFrom(o, i * 3, i); }
  arrowFrom(o, delay, i = 0) {
    const { cx, cy } = this.center(o);
    const fx = (o.fromX ?? (cx + 120)), fy = (o.fromY ?? o.y) - (o.fromH ? o.fromH * 0.55 : 18);
    const tx = cx + jit(this.seed++, i, 1) * (i ? 10 : 0), ty = cy + jit(this.seed++, i, 2) * (i ? 8 : 0);
    const frames = 8;
    this.add(frames + delay, (r, t) => {
      if (t < delay) return;
      const k = Math.min(1, (t - delay) / (frames - 1));
      const x = fx + (tx - fx) * k, y = fy + (ty - fy) * k - sin(k * Math.PI) * 6;
      const dx = Math.sign(tx - fx) || -1;
      // Trail: three fading marks where the arrow just was.
      for (let j = 1; j <= 3; j++) {
        const kk = k - j * 0.09;
        if (kk <= 0) continue;
        const px = fx + (tx - fx) * kk, py = fy + (ty - fy) * kk - sin(kk * Math.PI) * 6;
        r.withAlpha(0.8 - j * 0.22, () => r.rect(Math.round(px), Math.round(py), 2, 1, j === 1 ? C.white : C.cream));
      }
      r.line(x, y, x - dx * 7, y + 1, '#8a6a4a');
      r.rect(Math.round(x) - (dx < 0 ? 1 : 0), Math.round(y), 2, 1, C.white);
      r.pixel(x - dx * 7, y, C.cream); r.pixel(x - dx * 6, y + 2, C.cream);
    }, 'top');
    this.add(frames + delay + 6, (r, t) => {
      if (t < frames + delay) return;
      const k = (t - frames - delay) / 6;
      r.withAlpha(1 - k, () => { r.ellipse(tx, ty, 2 + Math.round(k * 6), 2 + Math.round(k * 4), C.white, false); });
    });
  }
  fx_cross(o) {
    const { cx, cy } = this.center(o);
    this.add(14, (r, t) => {
      const k = Math.min(1, t / 5);
      const len = Math.round(26 * k);
      const col = t < 8 ? C.white : C.gold;
      r.line(cx + 13, cy - 13, cx + 13 - len, cy - 13 + len, col);
      r.line(cx + 14, cy - 13, cx + 14 - len, cy - 13 + len, C.gold);
      if (t > 3) { const k2 = Math.min(1, (t - 3) / 5); const l2 = Math.round(26 * k2); r.line(cx - 13, cy - 13, cx - 13 + l2, cy - 13 + l2, col); r.line(cx - 14, cy - 13, cx - 14 + l2, cy - 13 + l2, C.orange); }
    });
    this.particles(cx, cy, 12, { colors: [C.white, C.gold, C.orange], speed: 2.2, life: 14, gravity: 0.06 });
  }
  fx_fury_sword(o) { this.fx_slash({ ...o, big: true }); this.fx_rays(o, { color: C.gold, n: 8, len: 30, frames: 16 }); }
  fx_fury_axe(o) {
    this.fx_chop({ ...o, big: true });
    const { cx } = this.center(o);
    this.add(20, (r, t) => {
      const k = t / 20;
      for (let i = 0; i < 5; i++) { const x = cx - 30 + i * 15 + Math.round(jit(3, i) * 4); const h = Math.round((12 - i % 2 * 4) * sin(Math.min(1, k * 2) * Math.PI)); if (h > 0) r.rect(x, o.y - h, 3, h, i % 2 ? C.orange : C.gold); }
    });
    this.particles(cx, o.y, 16, { colors: [C.gold, C.orange, '#8a6a4a'], dir: -Math.PI / 2, spread: 2.6, speed: 2.5, life: 20, gravity: 0.14, radius: 30, radiusY: 2 });
  }
  fx_fury_spear(o) { this.fx_thrust({ ...o, big: true }); this.fx_bolt({ ...o, color: C.gold }); }
  fx_fury_staff(o) { this.fx_heal({ ...o, big: true }); }
  fx_fury_bow(o) { this.fx_arrows(o); this.fx_rays(o, { color: C.gold, n: 6, len: 24, frames: 14 }); }
  fx_fury_flash(o) { this.fx_rays(o, { color: C.gold, n: 12, len: 36, frames: 18 }); this.fx_ring(o, { color: C.gold, r0: 2, r1: 30, frames: 14 }); }

  // --- generic shapes ---------------------------------------------------------------------------------------
  fx_ring(o, p = {}) {
    const { cx, cy } = this.center(o);
    const frames = p.frames || 12, r0 = p.r0 ?? 2, r1 = p.r1 ?? 20, color = p.color || o.color || C.white;
    this.add(frames, (r, t) => {
      const k = t / frames;
      const rad = Math.round(r0 + (r1 - r0) * (1 - (1 - k) * (1 - k)));
      r.withAlpha(1 - k * 0.8, () => r.ellipse(cx, cy + (p.dy || 0), rad, Math.round(rad * (p.squash ?? 0.8)), color, false));
    }, p.layer || 'over');
  }
  fx_rays(o, p = {}) {
    const { cx, cy } = this.center(o);
    const n = p.n || 8, len = p.len || 24, frames = p.frames || 14, color = p.color || C.white;
    this.add(frames, (r, t) => {
      const k = t / frames;
      const inner = Math.round(len * k), outer = Math.round(len * Math.min(1, k + 0.3));
      for (let i = 0; i < n; i++) {
        const a = i * TAU / n + k * 0.4;
        r.withAlpha(1 - k, () => r.line(cx + cos(a) * inner, cy + sin(a) * inner * 0.8, cx + cos(a) * outer, cy + sin(a) * outer * 0.8, color));
      }
    });
  }
  fx_bolt(o) {
    const { cx, cy } = this.center(o);
    const color = o.color || C.white;
    const seed = this.seed++;
    this.add(10, (r, t) => {
      if (t > 7) return;
      const top = 0, bottom = cy + 4;
      let x = cx + Math.round(jit(seed, 0) * 10), y = top;
      const segs = 7;
      for (let i = 1; i <= segs; i++) {
        const ny = top + Math.round((bottom - top) * i / segs);
        const nx = i === segs ? cx : cx + Math.round(jit(seed + t % 2, i) * 12);
        r.line(x, y, nx, ny, i % 2 ? color : C.gold);
        r.line(x + 1, y, nx + 1, ny, C.cream);
        x = nx; y = ny;
      }
    }, 'top');
  }
  fx_hit_spark(o) {
    const { cx, cy } = this.center(o);
    const big = !!o.big;
    this.star(cx, cy, big);
    this.particles(cx, cy, big ? 10 : 5, { colors: [C.white, C.cream, C.gold], speed: big ? 2.4 : 1.6, life: 12, gravity: 0.1 });
  }
  /** 4-frame impact star at the hit point: flash block, 8-point star, thinner bigger star, fading tips. */
  star(cx, cy, big = false) {
    const R = big ? [3, 7, 11, 14] : [2, 5, 8, 10];
    this.add(4, (r, t) => {
      const rad = R[t];
      if (t === 0) {
        r.rect(cx - rad - 1, cy - rad - 1, rad * 2 + 3, rad * 2 + 3, C.ink);
        r.rect(cx - rad, cy - rad, rad * 2 + 1, rad * 2 + 1, C.white);
        return;
      }
      const col = t === 1 ? C.white : t === 2 ? C.cream : C.gold;
      const d = Math.round(rad * 0.62);
      if (t === 3) {
        r.withAlpha(0.6, () => {
          r.rect(cx - rad, cy, 3, 1, col); r.rect(cx + rad - 2, cy, 3, 1, col);
          r.rect(cx, cy - rad, 1, 3, col); r.rect(cx, cy + rad - 2, 1, 3, col);
          r.pixel(cx - d, cy - d, col); r.pixel(cx + d, cy + d, col); r.pixel(cx - d, cy + d, col); r.pixel(cx + d, cy - d, col);
        });
        return;
      }
      r.rect(cx - rad - 1, cy - 1, rad * 2 + 3, 3, C.ink); r.rect(cx - 1, cy - rad - 1, 3, rad * 2 + 3, C.ink);
      r.rect(cx - rad, cy, rad * 2 + 1, 1, col); r.rect(cx, cy - rad, 1, rad * 2 + 1, col);
      r.line(cx - d, cy - d, cx + d, cy + d, col); r.line(cx - d, cy + d, cx + d, cy - d, col);
      if (t === 1) { r.rect(cx - 2, cy - 2, 5, 5, C.ink); r.rect(cx - 1, cy - 1, 3, 3, C.white); }
      else r.pixel(cx, cy, C.white);
    }, 'top');
  }

  // --- magic ------------------------------------------------------------------------------------------------
  circle(o, colors, frames = 26) {
    const cx = Math.round(o.x), cy = Math.round(o.y);
    this.add(frames, (r, t) => {
      const k = t / frames;
      const grow = Math.min(1, t / 6);
      const fade = t > frames - 8 ? (frames - t) / 8 : 1;
      r.withAlpha(fade, () => {
        r.ellipse(cx, cy, Math.round(16 * grow), Math.round(6 * grow), colors[1], false);
        r.ellipse(cx, cy, Math.round(11 * grow), Math.round(4 * grow), colors[0], false);
        for (let i = 0; i < 6; i++) {
          const a = i * TAU / 6 + k * TAU * 0.8;
          r.rect(Math.round(cx + cos(a) * 14 * grow), Math.round(cy + sin(a) * 5 * grow), 2, 2, i % 2 ? colors[0] : colors[2] || colors[0]);
        }
      });
    }, 'under');
    this.particles(cx, cy - 4, 10, { colors, dir: -Math.PI / 2, spread: 0.8, speed: 0.9, life: 26, radius: 12, radiusY: 3, delay: 10, blink: true });
  }
  fx_circle_fire(o) { this.circle(o, [C.gold, C.orange, C.red]); }
  fx_circle_ice(o) { this.circle(o, [C.white, C.blue, C.ice]); }
  fx_circle_thunder(o) { this.circle(o, [C.cream, C.gold, C.white]); }
  fx_circle_light(o) { this.circle(o, [C.white, C.cream, C.gold]); }
  fx_circle_heal(o) { this.circle(o, [C.heal, C.green, C.white]); }
  fx_burst_fire(o) {
    const { cx, cy } = this.center(o);
    const small = !!o.small;
    const n = small ? 8 : 22;
    if (!small) this.bloom(cx, cy, FIRE[1]);
    this.particles(cx, o.y - 4, n, { colors: FIRE, dir: -Math.PI / 2, spread: 1.3, speed: small ? 1.2 : 2.2, life: small ? 14 : 24, radius: small ? 6 : 12, radiusY: 2, size: small ? 2 : 3, shrink: true, gravity: -0.05 });
    if (!small) {
      this.add(16, (r, t) => {
        const k = t / 16;
        const rad = Math.round(6 + 16 * k);
        r.withAlpha(1 - k * 0.9, () => {
          r.ellipse(cx, cy, rad + 1, Math.round(rad * 1.2) + 1, C.ink, false);
          r.ellipse(cx, cy, rad, Math.round(rad * 1.2), FIRE[1], false);
          r.ellipse(cx, cy, Math.max(1, rad - 2), Math.max(1, Math.round(rad * 1.2) - 2), FIRE[2], false);
        });
        if (t < 8) { const h = Math.round((8 - t) * 3); r.rect(cx - 5, cy - h, 10, h, FIRE[1]); r.rect(cx - 3, cy - h - 4, 6, h + 4, FIRE[0]); }
      });
    }
  }
  fx_burst_ice(o) {
    const { cx, cy } = this.center(o);
    const seed = this.seed++;
    this.bloom(cx, cy, ICE[1]);
    this.add(18, (r, t) => {
      const k = Math.min(1, t / 6);
      const fade = t > 12 ? (18 - t) / 6 : 1;
      r.withAlpha(fade, () => {
        for (let i = 0; i < 6; i++) {
          const a = i * TAU / 6 - Math.PI / 2 + jit(seed, i) * 0.3;
          const len = Math.round((8 + 6 * hash2d(i, 3, seed)) * k);
          const x1 = cx + cos(a) * len, y1 = cy + sin(a) * len;
          r.line(cx, cy, x1, y1, ICE[1]);
          r.line(cx + 1, cy, x1 + 1, y1, C.white);
          r.rect(Math.round(x1) - 1, Math.round(y1) - 1, 3, 3, C.white);
        }
      });
    });
    this.particles(cx, cy, 12, { colors: ICE, speed: 1.2, life: 20, gravity: 0.05, blink: true, delay: 6 });
  }
  fx_burst_thunder(o) {
    this.fx_bolt(o);
    const { cx, cy } = this.center(o);
    this.bloom(cx, cy, C.gold);
    this.particles(cx, cy, 12, { colors: [C.white, C.gold, C.cream], speed: 2.4, life: 12, delay: 4 });
    this.fx_ring(o, { color: C.gold, r0: 2, r1: 18, frames: 10 });
  }
  fx_burst_light(o) {
    const { cx, cy } = this.center(o);
    this.bloom(cx, cy, C.cream, true);
    this.fx_rays(o, { color: C.cream, n: 10, len: 26, frames: 16 });
    this.particles(cx, cy, 14, { colors: LIGHT, speed: 1.4, life: 20, blink: true, gravity: -0.03 });
  }
  fx_heal(o) {
    const { cx, cy } = this.center(o);
    const small = !!o.small, big = !!o.big;
    const n = small ? 8 : big ? 26 : 16;
    if (!small) this.bloom(cx, cy, HEAL[2], big);
    this.particles(cx, o.y, n, { colors: HEAL, dir: -Math.PI / 2, spread: 0.5, speed: big ? 1.3 : 1, life: 28, radius: big ? 18 : 12, radiusY: 2, blink: true, delay: 8, drift: 0.4 });
    if (!small) this.add(16, (r, t) => {
      const k = t / 16;
      r.withAlpha(1 - k, () => r.ellipse(cx, o.y, Math.round(8 + 10 * k), Math.round(3 + 3 * k), HEAL[2], false));
    }, 'under');
    this.sparkles(cx, cy, small ? 3 : 7, HEAL, 22);
  }
  sparkles(cx, cy, n, colors, frames = 20, spread = 14) {
    const seed = this.seed++;
    this.add(frames, (r, t) => {
      for (let i = 0; i < n; i++) {
        const born = Math.floor(hash2d(i, 1, seed) * (frames - 8));
        const age = t - born;
        if (age < 0 || age > 8) continue;
        const x = Math.round(cx + jit(seed, i, 2) * spread), y = Math.round(cy + jit(seed, i, 3) * spread * 0.9);
        const s = age < 4 ? age : 8 - age;
        const col = colors[i % colors.length];
        r.rect(x - s, y, s * 2 + 1, 1, col); r.rect(x, y - s, 1, s * 2 + 1, col);
        if (s > 1) r.pixel(x, y, C.white);
      }
    }, 'top');
  }
  fx_cleanse(o) { const { cx, cy } = this.center(o); this.sparkles(cx, cy, 5, [C.cyan, C.white, C.blue], 18); this.particles(cx, cy, 6, { colors: [C.cyan, C.white], dir: -Math.PI / 2, spread: 1, speed: 1, life: 16 }); }
  fx_scan(o) {
    const { cx, cy } = this.center(o);
    const h = o.h || 32, w = o.w || 32;
    this.add(24, (r, t) => {
      const k = t / 24;
      const y = Math.round(o.y - h + h * k);
      r.withAlpha(0.8, () => r.rect(Math.round(cx - w / 2), y, w, 1, C.cyan));
      r.withAlpha(0.35, () => r.rect(Math.round(cx - w / 2), y - 3, w, 3, C.cyan));
      const bx = Math.round(cx - w / 2) - 2, by = Math.round(o.y - h) - 2;
      const bw = w + 4, bh = h + 4;
      const c = t % 8 < 4 ? C.cyan : C.white;
      for (const [x0, y0, dx, dy] of [[bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1]]) { r.line(x0, y0, x0 + dx * 4, y0, c); r.line(x0, y0, x0, y0 + dy * 4, c); }
    });
    void cy;
  }
  fx_focus(o) { const { cx, cy } = this.center(o); this.fx_ring(o, { color: C.orange, r0: 18, r1: 4, frames: 14 }); this.particles(cx, cy, 8, { colors: [C.red, C.orange, C.gold], dir: -Math.PI / 2, spread: 0.6, speed: 1.2, life: 18, radius: 10, radiusY: 4 }); }
  fx_guard(o) {
    const { cx, cy } = this.center(o);
    const h = o.h || 32;
    this.add(20, (r, t) => {
      const k = t / 20;
      const fade = 1 - k;
      r.withAlpha(fade, () => { r.ellipse(cx, cy, 14, Math.round(h / 2) + 4, C.cyan, false); r.ellipse(cx, cy, 13, Math.round(h / 2) + 3, C.white, false); });
    });
    this.sparkles(cx, cy, 4, [C.cyan, C.white], 18);
  }
  fx_taunt(o) { const { cx, cy } = this.center(o); this.fx_ring(o, { color: C.orange, r0: 4, r1: 26, frames: 14 }); this.fx_ring(o, { color: C.red, r0: 2, r1: 20, frames: 18 }); this.particles(cx, cy, 6, { colors: [C.red, C.orange], speed: 1.5, life: 14 }); }
  fx_rally(o) { const { cx, cy } = this.center(o); this.sparkles(cx, cy, 6, [C.gold, C.cream], 22); this.particles(cx, o.y, 8, { colors: [C.gold, C.orange], dir: -Math.PI / 2, spread: 0.6, speed: 1.1, life: 22, radius: 10, radiusY: 2 }); }
  fx_thorns(o) {
    const { cx, cy } = this.center(o);
    this.add(22, (r, t) => {
      const k = Math.min(1, t / 8), fade = t > 14 ? (22 - t) / 8 : 1;
      r.withAlpha(fade, () => {
        for (let i = 0; i < 8; i++) { const a = i * TAU / 8; const len = 16 * k; r.line(cx + cos(a) * 8, cy + sin(a) * 6, cx + cos(a) * (8 + len), cy + sin(a) * (6 + len * 0.7), i % 2 ? C.green : C.heal); }
        r.ellipse(cx, cy, Math.round(10 + 8 * k), Math.round(7 + 6 * k), C.green, false);
      });
    });
  }
  fx_item(o) {
    const { cx } = this.center(o);
    const icon = o.icon || 'potion';
    const ui = this.uiAtlas();
    const f = ui && (ui.frames['icon_' + icon] || ui.frames.icon_potion);
    this.add(26, (r, t) => {
      const y = o.y - (o.h || 32) - 6 - Math.round(Math.min(1, t / 10) * 8);
      if (t > 20 && t % 2) return;
      if (f) r.sprite(ui, f, cx - 6, y, { topLeft: true });
      else r.rect(cx - 3, y, 6, 8, C.heal);
    }, 'top');
    this.sparkles(cx, o.y - (o.h || 32) / 2, 4, [C.white, C.heal], 24);
  }
  fx_swap(o) {
    const { cx } = this.center(o);
    const ui = this.uiAtlas();
    const f = ui && ui.frames['icon16_' + (o.weapon || 'sword')];
    this.add(16, (r, t) => {
      const y = o.y - (o.h || 40) - 8 - Math.round(sin(Math.min(1, t / 16) * Math.PI) * 6);
      if (f) r.sprite(ui, f, cx - 8, y, { topLeft: true });
    }, 'top');
    this.fx_ring(o, { color: C.white, r0: 2, r1: 16, frames: 10 });
  }
  fx_combo_link(o) {
    const pts = o.points || [];
    if (pts.length < 2) return;
    this.add(28, (r, t) => {
      const k = Math.min(1, t / 10);
      for (let i = 0; i + 1 < pts.length; i++) {
        const a = pts[i], b = pts[i + 1];
        const x1 = a.x + (b.x - a.x) * k, y1 = a.y + (b.y - a.y) * k;
        if (t < 22) { r.line(a.x, a.y, x1, y1, C.gold); r.line(a.x, a.y + 1, x1, y1 + 1, C.white); }
      }
    }, 'top');
    for (const p of pts) this.sparkles(p.x, p.y, 5, [C.gold, C.white], 26);
  }

  // --- enemy attacks ---------------------------------------------------------------------------------------
  fx_claw(o) {
    const { cx, cy } = this.center(o);
    this.add(10, (r, t) => {
      const k = Math.min(1, t / 4);
      for (let i = 0; i < 3; i++) { const ox = -8 + i * 7; const len = Math.round(18 * k); r.line(cx + ox - 8, cy - 9, cx + ox - 8 + len * 0.6, cy - 9 + len, t < 6 ? C.white : C.red); }
    });
    this.particles(cx, cy, 5, { colors: [C.white, C.red], speed: 1.5, life: 10 });
  }
  fx_bump(o) { this.fx_ring(o, { color: C.white, r0: 3, r1: 16, frames: 8 }); this.particles(o.x, o.y - 2, 6, { colors: ['#c8b48a', C.white], dir: -Math.PI / 2, spread: 2, speed: 1.4, life: 12, gravity: 0.1 }); }
  fx_bite(o) {
    const { cx, cy } = this.center(o);
    const big = !!o.big;
    const s = big ? 14 : 8;
    this.add(10, (r, t) => {
      const k = Math.min(1, t / 4);
      const gap = Math.round(s * (1 - k));
      for (let i = -s; i <= s; i += 3) { r.rect(cx + i, cy - gap - 2, 2, 3, C.white); r.rect(cx + i + 1, cy + gap, 2, 3, C.white); }
      if (t >= 4 && t < 8) r.rect(cx - 2, cy - 1, 4, 3, C.red);
    });
  }
  fx_bite_big(o) { this.fx_bite({ ...o, big: true }); this.particles(o.x, o.y - (o.h || 32) / 2, 10, { colors: [C.red, C.white, C.paper], speed: 2, life: 14 }); }
  fx_cut(o) { const { cx, cy } = this.center(o); this.add(8, (r, t) => { const k = Math.min(1, t / 3); r.line(cx + 10, cy - 10, cx + 10 - 20 * k, cy - 10 + 20 * k, C.paper); r.line(cx + 11, cy - 10, cx + 11 - 20 * k, cy - 10 + 20 * k, C.white); }); this.particles(cx, cy, 6, { colors: [C.paper, C.white], speed: 1.8, life: 14, gravity: 0.08 }); }
  fx_slam(o) {
    const { cx } = this.center(o);
    this.add(10, (r, t) => { const h = Math.round(Math.min(1, t / 3) * ((o.h || 32) + 10)); r.rect(cx - 5, o.y - h, 10, h, t < 5 ? '#c8b48a' : '#8a6a4a'); r.rect(cx - 3, o.y - h, 6, h, t < 5 ? C.cream : '#c8b48a'); });
    this.particles(cx, o.y, 12, { colors: ['#c8b48a', '#8a6a4a', C.white], dir: -Math.PI / 2, spread: 2.8, speed: 2, life: 16, gravity: 0.14, delay: 3 });
  }
  fx_lash(o) {
    const { cx, cy } = this.center(o);
    const seed = this.seed++;
    this.add(10, (r, t) => {
      const k = Math.min(1, t / 4);
      let px = cx - 30, py = cy - 14;
      for (let i = 1; i <= 8; i++) { const nx = cx - 30 + i * 8 * k, ny = cy - 14 + i * 3 + Math.round(sin(i + t) * 3); if (nx <= cx + 10) { r.line(px, py, nx, ny, INK[1]); r.line(px, py + 1, nx, ny + 1, INK[3]); } px = nx; py = ny; }
      void seed;
    });
    this.particles(cx, cy, 8, { colors: INK, speed: 1.6, life: 14, gravity: 0.1 });
  }
  fx_charge(o) { this.fx_bump(o); this.particles(o.x + 20, o.y, 14, { colors: ['#c8b48a', '#8a6a4a'], dir: 0, spread: 1.4, speed: 2.4, life: 18, gravity: 0.08 }); }
  fx_ink_splash(o) {
    const { cx, cy } = this.center(o);
    this.particles(cx, cy, 18, { colors: INK.concat([C.paper]), speed: 2.2, life: 18, gravity: 0.15, size: 2, shrink: true });
    this.add(12, (r, t) => { const k = t / 12; r.withAlpha(1 - k, () => { r.ellipse(cx, cy, Math.round(5 + 10 * k), Math.round(4 + 8 * k), C.paper, false); r.ellipse(cx, cy, Math.round(4 + 10 * k), Math.round(3 + 8 * k), INK[0], false); }); });
  }
  fx_ink_lance(o) {
    const { cx, cy } = this.center(o);
    const fx = o.fromX ?? (cx - 80), fy = (o.fromY ?? o.y) - (o.fromH || 40) * 0.5;
    this.add(10, (r, t) => {
      const k = Math.min(1, t / 5);
      const x = fx + (cx - fx) * k, y = fy + (cy - fy) * k;
      r.line(x - 16, y - 2, x, y, INK[1]); r.line(x - 16, y, x, y, INK[3]); r.rect(Math.round(x) - 1, Math.round(y) - 1, 3, 3, C.violet);
    }, 'top');
    this.add(14, (r, t) => { if (t < 5) return; const k = (t - 5) / 9; r.withAlpha(1 - k, () => r.ellipse(cx, cy, Math.round(3 + 12 * k), Math.round(2 + 9 * k), C.violet, false)); });
    this.particles(cx, cy, 10, { colors: INK, speed: 1.8, life: 14, delay: 5, gravity: 0.1 });
  }
  fx_ink_wave(o) { this.inkWave(o, false); }
  fx_ink_wave_big(o) { this.inkWave(o, true); }
  inkWave(o, big) {
    const { cx, cy } = this.center(o);
    this.add(big ? 18 : 14, (r, t) => {
      const frames = big ? 18 : 14;
      const k = t / frames;
      const x = Math.round(cx - 40 + 80 * k);
      const h = Math.round((big ? 26 : 16) * sin(k * Math.PI));
      r.withAlpha(0.9, () => {
        r.rect(x - 7, cy - h - 1, 14, h * 2 + 2, C.paper);
        r.rect(x - 6, cy - h, 12, h * 2, INK[0]);
        r.rect(x - 3, cy - h - 2, 6, 3, INK[3]); r.rect(x - 8, cy - h + 4, 3, h, INK[2]); r.rect(x + 2, cy - 2, 2, h, INK[3]);
      });
    });
    this.particles(cx, cy, big ? 16 : 8, { colors: INK.concat([C.violet]), speed: 1.6, life: 18, gravity: 0.12, delay: 6 });
  }
  fx_ink_storm(o) {
    const { cx, cy } = this.center(o);
    this.particles(cx, cy - 60, 30, { colors: INK.concat([C.violet, C.purple]), dir: Math.PI / 2, spread: 0.6, speed: 3.5, life: 22, radius: 30, radiusY: 10, size: 2, delay: 10 });
    this.add(24, (r, t) => { const k = t / 24; r.withAlpha(0.5 * (1 - k), () => r.rect(cx - 24, cy - 40, 48, 80 * k, INK[1])); });
  }
  fx_hush(o) { const { cx, cy } = this.center(o); this.fx_ring(o, { color: C.violet, r0: 14, r1: 2, frames: 14, dy: -6 }); this.particles(cx, cy - 10, 6, { colors: [C.violet, C.purple], speed: 0.8, life: 16, blink: true }); }
  fx_pages(o) {
    const { cx, cy } = this.center(o);
    const seed = this.seed++;
    this.add(20, (r, t) => {
      for (let i = 0; i < 8; i++) {
        const a = t * 0.35 + i * TAU / 8;
        const rad = 18 - t * 0.5;
        const x = Math.round(cx + cos(a) * rad), y = Math.round(cy + sin(a) * rad * 0.6 + jit(seed, i) * 3);
        r.rect(x - 2, y - 3, 4, 6, C.paper); r.rect(x - 1, y - 2, 2, 1, INK[1]); r.rect(x - 1, y, 2, 1, INK[1]);
      }
    });
    this.particles(cx, cy, 6, { colors: [C.paper, C.white], speed: 1.5, life: 12, delay: 8 });
  }
  fx_drain(o) {
    const { cx, cy } = this.center(o);
    const tx = o.fromX ?? (cx - 60), ty = (o.fromY ?? o.y) - (o.fromH || 40) / 2;
    this.add(22, (r, t) => {
      for (let i = 0; i < 6; i++) {
        const k = Math.min(1, Math.max(0, (t - i * 2) / 14));
        if (k <= 0 || k >= 1) continue;
        const x = cx + (tx - cx) * k, y = cy + (ty - cy) * k - sin(k * Math.PI) * 10;
        r.rect(Math.round(x), Math.round(y), 2, 2, i % 2 ? C.red : C.purple);
      }
    }, 'top');
  }
  fx_shockwave(o) { this.fx_ring(o, { color: C.white, r0: 4, r1: 60, frames: 14, squash: 0.5 }); this.fx_ring(o, { color: C.cyan, r0: 2, r1: 48, frames: 18, squash: 0.5 }); this.particles(o.x, o.y - (o.h || 32) / 2, 10, { colors: [C.white, C.cyan], speed: 2.2, life: 14 }); }
  fx_quake(o) {
    const { cx } = this.center(o);
    this.particles(cx, o.y, 16, { colors: ['#c8b48a', '#8a6a4a', '#5a4a3a'], dir: -Math.PI / 2, spread: 1.6, speed: 2.4, life: 20, gravity: 0.16, radius: 20, radiusY: 2 });
    this.add(16, (r, t) => { for (let i = 0; i < 4; i++) { const x = cx - 16 + i * 10; const h = Math.round(10 * sin(Math.min(1, (t - i) / 10) * Math.PI)); if (h > 0) r.rect(x, o.y - h, 3, h, '#8a6a4a'); } });
  }
  fx_bind(o) {
    const { cx, cy } = this.center(o);
    this.add(18, (r, t) => {
      const k = Math.min(1, t / 6), fade = t > 12 ? (18 - t) / 6 : 1;
      r.withAlpha(fade, () => { for (let i = -2; i <= 2; i++) { const y = cy + i * 6; r.line(cx - 16 * k, y, cx + 16 * k, y + 2, i % 2 ? '#8a6a4a' : C.paper); } });
    });
  }
  fx_howl(o) { this.fx_ring(o, { color: C.white, r0: 2, r1: 22, frames: 12, dy: -8 }); this.fx_ring(o, { color: C.gold, r0: 2, r1: 30, frames: 18, dy: -8 }); }
  fx_buff(o) { this.fx_status_good(o); }
  fx_recite(o) { const { cx, cy } = this.center(o); this.sparkles(cx, cy, 4, [C.paper, C.white], 20); this.particles(cx, cy, 6, { colors: [C.paper, C.heal], dir: Math.PI, spread: 0.8, speed: 1.2, life: 20 }); }
  fx_devour(o) {
    const { cx, cy } = this.center(o);
    const ok = !!o.success;
    this.add(ok ? 40 : 18, (r, t) => {
      const frames = ok ? 40 : 18;
      const k = t / frames;
      for (let i = 0; i < 12; i++) {
        const a = -t * 0.25 + i * TAU / 12;
        const rad = (26 - 22 * k) * (0.6 + 0.4 * ((i % 3) / 2));
        r.rect(Math.round(cx + cos(a) * rad), Math.round(cy + sin(a) * rad * 0.7), 2, 2, INK[1 + (i % 3)]);
      }
      if (!ok && t > 6) r.withAlpha(0.8, () => r.ellipse(cx, cy, 14, Math.round((o.h || 40) / 2) + 2, C.cyan, false));
    }, 'top');
    if (ok) this.particles(cx, cy, 14, { colors: [C.paper, C.white, C.violet], dir: Math.PI, spread: 0.6, speed: 2, life: 26, delay: 10 });
  }
  fx_feast(o) {
    const { cx, cy } = this.center(o);
    const pages = o.pages || [];
    this.add(28, (r, t) => {
      for (const p of pages) {
        const k = Math.min(1, t / 20);
        const x = p.x + (cx - p.x) * k, y = p.y + (cy - p.y) * k - sin(k * Math.PI) * 12;
        if (k < 1) { r.rect(Math.round(x) - 3, Math.round(y) - 4, 6, 8, C.paper); r.rect(Math.round(x) - 2, Math.round(y) - 2, 4, 1, INK[1]); }
      }
    }, 'top');
    this.particles(cx, cy, 10, { colors: [C.paper, C.violet], speed: 1.5, life: 16, delay: 20 });
  }
  fx_summon(o) { this.fx_summon_pop(o); }
  fx_summon_pop(o) { const { cx, cy } = this.center(o); this.fx_ring(o, { color: C.violet, r0: 2, r1: 20, frames: 14 }); this.fx_ring(o, { color: C.paper, r0: 2, r1: 14, frames: 18 }); this.particles(cx, cy, 12, { colors: [C.paper, C.violet, C.white], speed: 1.6, life: 18, blink: true }); }
  fx_split_pop(o) { const { cx, cy } = this.center(o); this.particles(cx, cy, 14, { colors: INK, speed: 2, life: 16, gravity: 0.1, size: 2, shrink: true }); this.fx_ring(o, { color: INK[2], r0: 2, r1: 18, frames: 12 }); }
  fx_enemy_ready(o) {
    const { cx, cy } = this.center(o);
    this.add(6, (r, t) => { if (t % 2) return; r.withAlpha(0.6, () => r.ellipse(cx, cy, Math.round((o.w || 40) / 2) + 2 - t, Math.round((o.h || 40) / 2) + 2 - t, C.white, false)); });
  }
  fx_enemy_cast(o) {
    const { cx, cy } = this.center(o);
    this.particles(cx, o.y, 14, { colors: INK.concat([C.violet]), dir: -Math.PI / 2, spread: 0.7, speed: 1.2, life: 24, radius: (o.w || 40) / 2, radiusY: 3, blink: true, delay: 8 });
    this.fx_ring(o, { color: C.violet, r0: 24, r1: 4, frames: 18, squash: 0.6, dy: (o.h || 40) / 2, layer: 'under' });
    void cy;
  }

  // --- statuses, break, fury, misc ---------------------------------------------------------------------------
  fx_status_good(o) {
    const { cx, cy } = this.center(o);
    const cols = STATUS_COLORS[o.status] || [C.gold, C.cream];
    this.particles(cx, o.y, 10, { colors: cols, dir: -Math.PI / 2, spread: 0.4, speed: 1.2, life: 22, radius: 10, radiusY: 2, blink: true, delay: 6 });
    this.add(14, (r, t) => { const k = t / 14; r.withAlpha(1 - k, () => r.ellipse(cx, o.y, Math.round(6 + 8 * k), Math.round(2 + 3 * k), cols[0], false)); }, 'under');
    void cy;
  }
  fx_status_bad(o) {
    const { cx, cy } = this.center(o);
    const cols = STATUS_COLORS[o.status] || [C.violet, C.purple];
    if (o.status === 'stun') {
      this.add(30, (r, t) => { for (let i = 0; i < 3; i++) { const a = t * 0.3 + i * TAU / 3; const x = Math.round(cx + cos(a) * 10), y = Math.round(o.y - (o.h || 32) - 4 + sin(a) * 3); r.rect(x - 1, y, 3, 1, C.gold); r.rect(x, y - 1, 1, 3, C.gold); } }, 'top');
      return;
    }
    this.particles(cx, cy - 8, 8, { colors: cols, dir: Math.PI / 2, spread: 0.5, speed: 0.9, life: 20, radius: 10, radiusY: 4, gravity: 0.05 });
    this.add(12, (r, t) => { const k = t / 12; r.withAlpha(1 - k, () => r.ellipse(cx, cy, Math.round(12 - 8 * k), Math.round(14 - 9 * k), cols[0], false)); });
  }
  fx_poison_bubbles(o) {
    const { cx, cy } = this.center(o);
    this.particles(cx, o.y - 4, 7, { colors: [C.purple, C.violet], dir: -Math.PI / 2, spread: 0.4, speed: 0.7, life: 20, radius: 8, radiusY: 2, size: 2, shrink: true, delay: 6 });
    void cy;
  }
  fx_break_burst(o) {
    const { cx, cy } = this.center(o);
    const ui = this.uiAtlas();
    const anim = ui && ui.anims.break_burst;
    this.add(anim ? 18 : 12, (r, t) => {
      const name = anim && animFrameAt(anim, t / 60);
      const f = name && ui.frames[name];
      if (f && t < 16) r.sprite(ui, f, cx, cy);
      else if (!f) { const k = t / 12; r.withAlpha(1 - k, () => r.ellipse(cx, cy, Math.round(10 + 30 * k), Math.round(6 + 18 * k), C.orange, false)); }
    }, 'top');
    this.particles(cx, cy, 18, { colors: [C.white, C.gold, C.orange, C.cyan], speed: 2.6, life: 18, gravity: 0.08, size: 2, shrink: true });
  }
  fx_fury_ready(o) { this.fx_ring(o, { color: C.orange, r0: 2, r1: 24, frames: 14 }); this.fx_rays(o, { color: C.gold, n: 8, len: 20, frames: 14 }); this.sparkles(o.x, o.y - (o.h || 40) / 2, 6, [C.gold, C.orange, C.white], 24); }
  fx_telegraph(o) { this.fx_ring(o, { color: C.orange, r0: 30, r1: 6, frames: 20 }); this.fx_ring(o, { color: C.red, r0: 40, r1: 8, frames: 26 }); }
  fx_revive(o) {
    const { cx } = this.center(o);
    this.add(26, (r, t) => { const k = t / 26; const h = Math.round(60 * Math.min(1, t / 8)); r.withAlpha(0.7 * (1 - k), () => { r.rect(cx - 6, o.y - h, 12, h, C.gold); r.rect(cx - 2, o.y - h, 4, h, C.cream); }); });
    this.particles(cx, o.y, 16, { colors: LIGHT, dir: -Math.PI / 2, spread: 0.5, speed: 1.6, life: 26, radius: 8, radiusY: 2, blink: true });
    this.sparkles(cx, o.y - (o.h || 40) / 2, 8, LIGHT, 26);
  }
  fx_knockback(o) {
    const { cx, cy } = this.center(o);
    this.add(12, (r, t) => { const k = Math.min(1, t / 6); for (let i = 0; i < 3; i++) { const x = cx - 16 + i * 8 - Math.round(k * 10); r.line(x, cy - 6, x - 5, cy, i === 1 ? C.white : C.cyan); r.line(x - 5, cy, x, cy + 6, i === 1 ? C.white : C.cyan); } });
  }
  fx_reflect(o) {
    const { cx, cy } = this.center(o);
    this.add(22, (r, t) => {
      if (t < 8) { r.withAlpha((8 - t) / 8, () => r.ellipse(cx, cy, 20, 26, C.white, false)); }
      if (o.toX != null && t >= 6) {
        const k = Math.min(1, (t - 6) / 10);
        const x = cx + (o.toX - cx) * k, y = cy + (o.toY - cy) * k - sin(k * Math.PI) * 14;
        r.rect(Math.round(x) - 1, Math.round(y) - 1, 3, 3, C.cyan); r.pixel(x, y, C.white);
      }
    }, 'top');
    this.sparkles(cx, cy, 6, [C.white, C.cyan], 18, 20);
  }
  fx_reflect_hit(o) { this.fx_hit_spark(o); }
  fx_stance(o) { this.fx_ring(o, { color: o.stance === 'bulwark' ? C.blue : C.cyan, r0: 4, r1: 40, frames: 20, squash: 1 }); this.sparkles(o.x, o.y - (o.h || 40) / 2, 8, [C.white, C.cyan], 30, 30); }
  fx_phase(o) {
    const { cx, cy } = this.center(o);
    this.fx_ring(o, { color: C.violet, r0: 4, r1: 70, frames: 30, squash: 0.9 });
    this.particles(cx, cy, 30, { colors: [C.paper, C.violet, C.purple, C.white], speed: 2.2, life: 30, radius: 30, radiusY: 30, blink: true });
    if (o.phase >= 3) this.particles(cx, cy, 24, { colors: FIRE, dir: -Math.PI / 2, spread: 1.2, speed: 1.6, life: 30, radius: 40, radiusY: 30, delay: 10 });
  }
  // --- Episode 2: glass (the Court of Mirrors, the Kept status, the King's veil) ----------------------------
  /** A mirror shard seals over a Kept member: angular facets snap in with a freezing shimmer. */
  fx_kept_seal(o) {
    const { cx, cy } = this.center(o);
    const h = o.h || 40, hw = Math.max(12, Math.round((o.w || 28) / 2) + 3);
    const top = cy - h / 2 - 2, bot = (o.y || cy) + 1;
    this.add(16, (r, t) => {
      const grow = Math.min(1, t / 6);
      const fade = t < 12 ? 1 : (16 - t) / 4;
      const w = Math.round(hw * grow);
      const pts = [[cx, top], [cx + w, cy - 4], [cx + w - 2, bot], [cx - w + 2, bot], [cx - w, cy - 4]];
      r.withAlpha(0.55 * fade, () => {
        for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; r.line(a[0], a[1], b[0], b[1], C.cyan); }
        r.line(cx - w + 3, top + 6, cx + w - 5, bot - 5, C.white);
        r.line(cx + w - 3, top + 7, cx - w + 5, bot - 6, C.ice);
      });
    }, 'top');
    this.sparkles(cx, cy, 7, [C.cyan, C.white, C.ice], 18, hw);
  }
  /** The Kept shard breaks: fracture rays and glass motes fly out. */
  fx_kept_shatter(o) {
    const { cx, cy } = this.center(o);
    this.add(10, (r, t) => {
      const k = t / 10;
      for (let i = 0; i < 5; i++) { const a = i * TAU / 5 + 0.3; const r0 = 2 + k * 6, r1 = 6 + k * 24; r.withAlpha(1 - k, () => r.line(cx + cos(a) * r0, cy + sin(a) * r0, cx + cos(a) * r1, cy + sin(a) * r1, i % 2 ? C.white : C.cyan)); }
    }, 'top');
    this.particles(cx, cy, 14, { colors: [C.white, C.cyan, C.ice], speed: 2.6, life: 16, gravity: 0.12, size: 2, shrink: true });
  }
  /** "The mirror cracks!": the view cracks from the King outward (jagged rays, branches, a spider ring; 46 frames). */
  fx_mirror_crack(o) {
    const { cx, cy } = this.center(o);
    const seed = this.seed++;
    const N = 10;
    const rays = [];
    for (let i = 0; i < N; i++) {
      let a = (i / N) * TAU + jit(seed, i, 1) * 0.25;
      const len = 80 + hash2d(i, 2, seed) * 170;
      const segs = 6;
      const pts = [[Math.round(cx + cos(a) * 6), Math.round(cy + sin(a) * 6)]];
      for (let s = 1; s <= segs; s++) {
        a += jit(seed, i * 10 + s, 3) * 0.28;
        const d = 6 + (len * s) / segs;
        pts.push([Math.round(cx + cos(a) * d), Math.round(cy + sin(a) * d * 0.85)]);
      }
      const bi = 2 + Math.floor(hash2d(i, 4, seed) * 3);
      const ba = a + (hash2d(i, 5, seed) < 0.5 ? -0.7 : 0.7);
      const bl = 16 + hash2d(i, 6, seed) * 26;
      const b0 = pts[bi];
      rays.push({ pts, branch: [b0, [Math.round(b0[0] + cos(ba) * bl), Math.round(b0[1] + sin(ba) * bl)]], bi });
    }
    const ring = rays.map((ry) => ry.pts[1]);
    const seg = (r, p, q, col, alpha) => r.withAlpha(alpha, () => {
      r.line(p[0] + 1, p[1] + 1, q[0] + 1, q[1] + 1, C.ink);
      r.line(p[0], p[1], q[0], q[1], col);
    });
    this.add(46, (r, t) => {
      const grow = Math.min(1, (t + 1) / 8);
      const alpha = t < 30 ? 1 : Math.max(0, 1 - (t - 30) / 16);
      if (alpha <= 0) return;
      for (const ry of rays) {
        const upto = Math.max(1, Math.round(grow * (ry.pts.length - 1)));
        for (let s = 0; s < upto; s++) seg(r, ry.pts[s], ry.pts[s + 1], s % 2 ? C.white : C.ice, alpha * (1 - s * 0.06));
        if (upto > ry.bi) seg(r, ry.branch[0], ry.branch[1], C.ice, alpha * 0.8);
        const tip = ry.pts[upto];
        if (t < 10) r.withAlpha(alpha, () => r.rect(tip[0] - 1, tip[1] - 1, 3, 3, C.white));
      }
      if (grow >= 0.5) for (let i = 0; i < ring.length; i++) seg(r, ring[i], ring[(i + 1) % ring.length], C.cyan, alpha * 0.85);
    }, 'top');
    this.particles(cx, cy, 18, { colors: [C.white, C.cyan, C.ice], speed: 2.4, life: 22, gravity: 0.1, size: 2, shrink: true, radius: 10 });
  }
  /** A pane of glass shatters over a unit (the King's veil; o.big by default). */
  fx_shatter(o) {
    const { cx, cy } = this.center(o);
    const big = o.big !== false;
    const h = o.h || 40;
    const R = big ? Math.max(46, Math.round(h * 0.5)) : 28;
    const fy = big && h > 90 ? Math.round(cy - h * 0.25) : cy;
    this.add(16, (r, t) => {
      const k = t / 16;
      for (let i = 0; i < 10; i++) {
        const a = i * TAU / 10 + 0.2, r1 = R * (0.7 + 0.3 * ((i * 7) % 3) / 2) * Math.min(1, k * 1.6);
        r.withAlpha(1 - k, () => { r.line(cx + 1, fy + 1, Math.round(cx + cos(a) * r1) + 1, Math.round(fy + sin(a) * r1 * 0.9) + 1, C.ink); r.line(cx, fy, Math.round(cx + cos(a) * r1), Math.round(fy + sin(a) * r1 * 0.9), i % 2 ? C.white : C.cyan); });
      }
    }, 'top');
    this.particles(cx, fy, big ? 22 + Math.round(h / 8) : 12, { colors: [C.white, C.cyan, C.ice, C.violet], speed: big ? 3 : 2, life: 20, gravity: 0.14, size: 2, shrink: true, radius: big ? Math.round(R * 0.2) : 0 });
    if (big) this.particles(cx, fy, 18, { colors: [C.white, C.ice, C.cyan], speed: 0.8, life: 40, gravity: 0.18, size: 3, shrink: true, radius: Math.round(R * 0.6), radiusY: Math.round(h * 0.2), delay: 6 });
    this.fx_ring({ ...o, y: fy + (o.h || 40) / 2 }, { color: C.white, r0: 2, r1: big ? R : 24, frames: 12 });
  }
  /** A reflection steps out of the great mirror: a reversed shimmer that settles into the figure, with a low gleam. */
  fx_reflection_out(o) {
    const { cx, cy } = this.center(o);
    const h = o.h || 40, hw = Math.max(14, Math.round((o.w || 28) / 2) + 2);
    this.add(22, (r, t) => {
      const k = t / 22;
      r.withAlpha(0.6 * (1 - k), () => {
        for (let y = Math.round(cy - h / 2); y < (o.y || cy); y += 2) {
          const off = Math.round(sin((y + t * 3) * 0.3) * 5 * (1 - k));
          r.rect(cx - hw + off, y, hw * 2, 1, (t + y) % 4 < 2 ? C.cyan : C.white);
        }
      });
    }, 'top');
    this.sparkles(cx, cy, 8, [C.cyan, C.white, C.violet], 22, hw);
  }
}

// ------------------------------------------------------------------------------------------- intro slices
/**
 * Battle intro (CRITIQUE C5): the field snapshot mosaics in two steps (2 px then 4 px blocks) under a white flash
 * for 8 frames, then splits into 12 axis-aligned vertical slices that slide out alternately up and down over 18
 * frames, revealing the stage beneath. Nothing rotates and nothing is drawn off the pixel grid. 26 frames.
 * reduceMotion: the mosaic, then a plain white fade. Deterministic (the rng only staggers the slices).
 */
export class SliceTransition {
  constructor(snapshot, rng, opts = {}) {
    this.snap = snapshot;
    this.mosaicFrames = 8;
    this.slideFrames = opts.slideFrames || 18;
    this.frames = this.mosaicFrames + this.slideFrames;
    this.t = 0;
    this.cols = opts.cols || 12;
    const r = rng || { next: () => 0.5 };
    this.W = snapshot.width; this.H = snapshot.height;
    this.sw = Math.ceil(this.W / this.cols);
    // Each slice starts a frame or two apart so the row does not move as one block.
    this.delay = [];
    for (let i = 0; i < this.cols; i++) this.delay.push(Math.floor(r.next() * 3));
    this.reduce = !!opts.reduceMotion;
  }
  get done() { return this.t >= this.frames; }
  update() { this.t++; }
  draw(r) {
    const g = r.ctx;
    const t = this.t;
    if (t < this.mosaicFrames) {
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(this.snap, 0, 0);
      g.restore();
      r.mosaic(t < 4 ? 2 : 4);
      r.fade('#ffffff', Math.min(0.6, t / 12));
      return;
    }
    if (this.reduce) { r.fade('#ffffff', Math.max(0, 1 - (t - this.mosaicFrames) / 12)); return; }
    const H = this.H;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
    for (let i = 0; i < this.cols; i++) {
      const age = t - this.mosaicFrames - this.delay[i];
      const sx = i * this.sw, sw = Math.min(this.sw, this.W - sx);
      if (sw <= 0) continue;
      if (age < 0) { g.drawImage(this.snap, sx, 0, sw, H, sx, 0, sw, H); continue; }
      const k = Math.min(1, age / Math.max(1, this.slideFrames - 3));
      const dist = Math.round(H * k * k);                // accelerating slide, whole pixels
      if (dist >= H) continue;
      const dy = (i % 2 ? 1 : -1) * dist;
      g.drawImage(this.snap, sx, 0, sw, H, sx, dy, sw, H);
      // A 1 px ink seam on the leading edge keeps neighbouring slices from reading as one image.
      if (dist > 0) { g.fillStyle = '#14101e'; g.fillRect(sx, dy < 0 ? H + dy - 1 : dy, sw, 1); }
    }
    g.restore();
    if (t < this.mosaicFrames + 6) r.fade('#ffffff', (this.mosaicFrames + 6 - t) / 10);
  }
}
/** @deprecated name kept for older imports; the battle now uses SliceTransition. */
export const ShardTransition = SliceTransition;
