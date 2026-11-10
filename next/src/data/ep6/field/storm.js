// The storm's light (E6-world, docs/EPISODE6_PLAN.md 5.2): the pack tint `storm` and the soft lightning layer. Pure apart
// from draw(); ../world.js registers the tint, ./events.js draws the flash after the field's lighting.
//
// Lightning is a phone and photosensitivity rule, not a style: at most one flash in any 4 seconds (240 frames at 60 fps),
// a peak of at most +0.12 luma on the cells it touches (the far cloud only, never a full-screen white), nothing at all under
// reduceMotion. flashLevel() is the schedule (deterministic, no randomness); the luma of a frame rises by at most
// level * LIGHTNING.alpha * luma(LIGHTNING.color) <= LIGHTNING.peak.

/**
 * Slate, low saturation, for F3 and the Eyrie (the darkest maps of the episode). Measured in qa/world/ep6_lab.py (case
 * `storm`): the party's floor stays at or above luma 0.22 on the phone crop at dark 0.5 with a lamp pool in view.
 */
export const STORM_TINT = { color: '#8e9ab8', alpha: 0.42, desat: 0.38 };

export const LIGHTNING = {
  gapMin: 240,          // frames between two flash starts, at least (4 s)
  gapMax: 420,
  rise: 3,              // frames up to the peak
  fall: 22,             // frames back to nothing
  color: '#dfe6ff',
  peak: 0.12,           // the most a flash adds to any pixel's luma
  echo: 0.45,           // a second, smaller pulse inside the same flash (a flicker), as a fraction of the peak
};
/** Rec. 709 luma of a hex colour, 0..1. */
export function luma(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  const lin = (v) => v / 255;
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}
/** The fill alpha that keeps a full flash at LIGHTNING.peak luma (with a 5% margin). */
export const FLASH_ALPHA = (LIGHTNING.peak / luma(LIGHTNING.color)) * 0.95;

const gapOf = (k, seed) => {
  const v = Math.sin((k + 1) * 91.17 + seed * 13.31) * 43758.5453;
  const h = v - Math.floor(v);
  return LIGHTNING.gapMin + Math.floor(h * (LIGHTNING.gapMax - LIGHTNING.gapMin));
};
/** Start frames of the flashes up to `frame` (the first one gapMin frames in). Cached per seed. */
const starts = new Map();
function startsUpTo(frame, seed) {
  let s = starts.get(seed);
  if (!s) { s = [LIGHTNING.gapMin]; starts.set(seed, s); }
  while (s[s.length - 1] <= frame) s.push(s[s.length - 1] + gapOf(s.length, seed));
  return s;
}
/** The flash level at a frame, 0..1 (0 under reduceMotion). Deterministic per seed. */
export function flashLevel(frame, seed = 0, still = false) {
  if (still || frame < 0) return 0;
  const s = startsUpTo(frame, seed);
  let lo = 0, hi = s.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (s[mid] <= frame) lo = mid; else hi = mid - 1; }
  const t = frame - s[lo];
  if (t < 0) return 0;
  const { rise, fall, echo } = LIGHTNING;
  if (t < rise) return (t + 1) / rise;
  const d = t - rise;
  if (d >= fall) return 0;
  const main = 1 - d / fall;
  // a flicker: a dip and a smaller second pulse a few frames after the peak
  if (d >= 4 && d < 8) return Math.min(main, echo * (1 - (d - 4) / 4) + 0.15);
  return main;
}
/** Flash start frames in [0, frames): for tests and the lab. */
export function flashStarts(frames, seed = 0) { return startsUpTo(frames, seed).filter((f) => f < frames); }

/**
 * Draw a flash over the far cloud: every visible cell whose `cloud(x, y)` is true gets LIGHTNING.color added ('lighter') at
 * level * FLASH_ALPHA. Screen pixels (after the lighting). Returns the alpha used (0: nothing drawn).
 */
export function drawFlash(r, cam, level, cloud, W, H, T = 16) {
  if (level <= 0.001) return 0;
  const g = r.ctx, a = Math.min(1, level) * FLASH_ALPHA;
  const x0 = Math.max(0, Math.floor(cam.x / T)), y0 = Math.max(0, Math.floor(cam.y / T));
  const x1 = Math.min(W - 1, Math.floor((cam.x + r.W) / T)), y1 = Math.min(H - 1, Math.floor((cam.y + r.H) / T));
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = a;
  g.fillStyle = LIGHTNING.color;
  for (let y = y0; y <= y1; y++) {
    let run = -1;
    for (let x = x0; x <= x1 + 1; x++) {
      const on = x <= x1 && cloud(x, y);
      if (on && run < 0) run = x;
      else if (!on && run >= 0) { g.fillRect(Math.round(run * T - cam.x), Math.round(y * T - cam.y), (x - run) * T, T); run = -1; }
    }
  }
  g.restore();
  return a;
}
