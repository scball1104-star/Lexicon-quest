// The Binder's page burst (CRITIQUE_STACKS 18): at each phase change its paper body tears open and its leaves fly, where the
// Nameless King's veil breaks as glass. Cave pack only: register() adds `fx_page_burst` to the battle fx table (BattleFx.spawn
// looks a kind up as `fx_<kind>`), and the animator asks for it on a phase that has a Binder sting (o.big carries the phase).
// Phase 2 (Loose Leaves): the spine splits and the leaves storm out and flutter down. Phase 3 (The Last Binding): the same
// tear, but each leaf catches at its lower edge, burns up into itself and ends as rising embers. Reduced motion: fewer leaves,
// a third of their flight (REDUCED_TRAVEL), and the scraps and embers thinned by BattleFx.particles itself.

import { BattleFx, C, REDUCED_TRAVEL } from '../../battle/fx.js';
import { hash2d } from '../../core/rng.js';

const FIRE = ['#fff1a8', '#ffcf5a', '#eba14d', '#e06b39', '#8a2a2a'];
const PAGE = '#e8dcb8', PAGE_LIT = '#fff7d6', PAGE_DIM = '#b9a57e', RULE = '#6a5a7a', STITCH = '#8a2a2a';
const PAGE_LIFE = 58;

/** One leaf's track at frame t (deterministic: hash2d of the leaf index and the burst's seed). */
function leafAt(L, t) {
  const drag = Math.pow(0.93, t);
  const travel = (1 - drag) / 0.07;   // the sum of a velocity that loses 7% a frame
  const x = L.x0 + L.vx * travel + Math.sin(t * L.wob + L.ph) * L.amp * Math.min(1, t / 14);
  const y = L.y0 + L.vy * travel + L.g * t * t * 0.5;
  // the leaf turns about its long axis: its drawn width runs |cos| of the spin, never under a one-pixel edge
  const turn = Math.abs(Math.cos(t * L.spin + L.ph));
  return { x: Math.round(x), y: Math.round(y), w: Math.max(1, Math.round(L.w * turn)), face: turn > 0.45 };
}

/** Draw one leaf: ink rim, paper, two ruled lines when it shows its face; burn = 0..1 eats it from its lower edge. */
function drawLeaf(r, p, h, burn) {
  const left = h - Math.round(h * burn);
  if (left <= 0) return;
  const x = p.x - (p.w >> 1), y = p.y - (h >> 1) + (h - left);
  r.rect(x - 1, y - 1, p.w + 2, left + 2, C.ink);
  r.rect(x, y, p.w, left, p.face ? PAGE : PAGE_DIM);
  if (p.face && p.w >= 4) {
    r.rect(x, y, p.w, 1, PAGE_LIT);
    for (let ly = y + 2; ly < y + left - 1; ly += 2) r.rect(x + 1, ly, p.w - 2 - (ly & 2 ? 1 : 0), 1, RULE);
  }
  if (burn > 0) {
    r.rect(x, y + left - 1, p.w, 1, FIRE[1]);
    r.rect(x - 1, y + left, p.w + 2, 1, FIRE[3]);
  }
}

export function fx_page_burst(o) {
  const { cx, cy } = this.center(o);
  const h = o.h || 120, hw = Math.max(20, Math.round((o.w || 120) * 0.32));
  const burn = Number(o.big) >= 3;
  const seed = this.seed++;
  const n = this.reduce ? 10 : 26;
  const leaves = [];
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1;
    const ang = (hash2d(i, 1, seed) - 0.5) * 2.1;          // mostly sideways, out of the split spine
    const sp = (2.6 + hash2d(i, 2, seed) * 3) * (this.reduce ? REDUCED_TRAVEL : 1);
    leaves.push({
      x0: cx + side * Math.round(hash2d(i, 3, seed) * 6), y0: Math.round(cy - h * 0.3 + hash2d(i, 4, seed) * h * 0.6),
      vx: side * Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 0.6,
      g: burn ? -0.004 : 0.05, wob: 0.18 + hash2d(i, 5, seed) * 0.14, ph: hash2d(i, 6, seed) * 6.28, amp: 1.5 + hash2d(i, 7, seed) * 2.5,
      spin: 0.12 + hash2d(i, 8, seed) * 0.2, w: 6 + Math.round(hash2d(i, 9, seed) * 2), h: 9 + Math.round(hash2d(i, 10, seed) * 3),
      delay: Math.floor(hash2d(i, 11, seed) * 6), catchAt: 10 + Math.floor(hash2d(i, 12, seed) * 14),
    });
  }
  // the tear: a white-hot seam opens down the spine and its stitches spring off
  this.add(14, (r, t) => {
    const k = t / 14, half = Math.round(h * 0.42 * Math.min(1, t / 4)), gap = Math.round(1 + k * 5);
    r.withAlpha(1 - k, () => {
      r.rect(cx - gap - 1, cy - half, 2, half * 2, burn ? FIRE[2] : PAGE);
      r.rect(cx + gap - 1, cy - half, 2, half * 2, burn ? FIRE[2] : PAGE);
      r.rect(cx - 1, cy - half, 2, half * 2, burn ? FIRE[0] : C.white);
      for (let s = -half + 3; s < half; s += 7) {
        const d = Math.round(t * 1.6 + (s & 7));
        r.rect(cx - gap - 3 - d, cy + s, 3, 1, STITCH); r.rect(cx + gap + d, cy + s + 3, 3, 1, STITCH);
      }
    });
  }, 'top');
  // the leaves
  this.add(PAGE_LIFE + 8, (r, t) => {
    for (const L of leaves) {
      const lt = t - L.delay;
      if (lt < 0 || lt >= PAGE_LIFE) continue;
      const p = leafAt(L, lt);
      const b = burn ? Math.max(0, Math.min(1, (lt - L.catchAt) / 22)) : 0;
      const fade = burn ? 1 : Math.min(1, (PAGE_LIFE - lt) / 12);
      r.withAlpha(fade, () => drawLeaf(r, p, L.h, b));
      if (b > 0 && b < 1 && (lt + L.ph * 10 | 0) % 3 === 0) r.rect(p.x + ((lt * 7) % p.w) - (p.w >> 1), p.y + (L.h >> 1) - Math.round(L.h * b) - 2, 1, 1, FIRE[lt % 2]);
    }
  }, 'top');
  // torn scraps, and for the last binding the embers each leaf leaves behind
  this.particles(cx, cy, 22, { colors: [PAGE, PAGE_LIT, PAGE_DIM, C.white], speed: 2.6, life: 26, gravity: 0.1, size: 2, shrink: true, radius: 4, radiusY: Math.round(h * 0.3) });
  if (burn) {
    this.particles(cx, cy, 30, { colors: FIRE.slice(0, 4), speed: 1.6, life: 44, gravity: -0.04, drift: 0.6, size: 2, shrink: true, radius: hw, radiusY: Math.round(h * 0.35), delay: 26 });
    this.particles(cx, cy + Math.round(h * 0.2), 12, { colors: [FIRE[4], '#3a2a3a'], speed: 0.6, life: 50, gravity: -0.03, drift: 0.4, size: 3, radius: hw, delay: 34 });
  }
  this.fx_ring({ ...o, y: cy + 4 }, { color: burn ? FIRE[1] : PAGE, r0: 4, r1: hw + 26, frames: 14, squash: 0.5 });
}

let done = false;
/** Idempotent: installs the burst on the battle fx table (the precached animator only names the kind). */
export function register() {
  if (!done) { BattleFx.prototype.fx_page_burst = fx_page_burst; done = true; }
  return { id: 'fx', kinds: ['page_burst'] };
}
export default register;
