// Episode 7's light (E7-world, docs/EPISODE7_PLAN.md 5.2): the pack tints `whiteout` and `aurora`, and the aurora overhead
// layer of F3 and the Stillheart. Pure apart from paintAurora() / drawAurora(); ../world.js registers the tints.
//
// The aurora is a phone and photosensitivity rule as much as a look: 3 frames, one every 30 game frames, never a flash. Each
// pixel's cover is quantised to steps of AURORA.step (0.04) and moves by at most one step between two frames (the cycle
// wraps: frame 2 to frame 0 is a step too), so no pixel's luma changes by more than 0.04 between frames whatever it covers
// (the limit is 0.05). Nothing under reduceMotion.

/** The White Road's whiteout (the `whiteout` scene only): a pale lift, the colour drained, a white haze screened over it. */
export const WHITEOUT_TINT = { color: '#e6ecf6', alpha: 0.22, desat: 0.45, haze: '#f4f7fc', hazeAlpha: 0.42 };
/** In 2 s, out 1 s (the scene calls s.tint('whiteout', WHITEOUT_IN) and back with WHITEOUT_OUT frames). */
export const WHITEOUT_IN = 120, WHITEOUT_OUT = 60;
/** F3 and the Stillheart: low, cool, slightly violet; the party's floor kept at luma 0.22 or more (measured, WORLD_EP7). */
export const AURORA_TINT = { color: '#9aa6dc', alpha: 0.34, desat: 0.18 };

export const AURORA = {
  frames: 3,
  every: 30,             // game frames per aurora frame
  step: 0.04,            // the cover quantum: at most one step a pixel between frames (+0.04 luma at worst)
  levels: 6,             // cover 0, 0.04 ... 0.24 (soft: a curtain, never a wash)
  colors: ['#8cffc8', '#c4a8ff'],   // green above, violet at the lower hem
  rows: 9,               // default band height in tiles (lighting.aurora: { y0, y1 } on the map overrides)
  limit: 0.05,
};

/** Rec. 709 luma of a hex colour, 0..1. */
export function luma(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  return 0.2126 * ((n >> 16) & 255) / 255 + 0.7152 * ((n >> 8) & 255) / 255 + 0.0722 * (n & 255) / 255;
}

const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const TAU = Math.PI * 2;

/**
 * The continuous cover of the ribbons at pixel (x, y) of the band for frame k (0..2), 0..1. Two slow sine ribbons whose
 * centre lines drift a little each frame (phase k / 3 of a cycle), so frame 2 leads back into frame 0.
 */
export function cover(k, x, y, h) {
  const ph = (k % AURORA.frames) * TAU / AURORA.frames;
  let best = 0;
  const ribbons = [[0.34, 0.11, 0.021, 0.0], [0.6, 0.08, 0.015, 2.1]];
  for (const [mid, amp, fq, off] of ribbons) {
    const cy = h * (mid + amp * Math.sin(x * fq + off) + 0.004 * Math.sin(ph + x * 0.009 + off));
    const half = h * (0.1 + 0.025 * Math.sin(x * 0.031 + off * 2));
    const d = Math.abs(y - cy) / Math.max(1, half);
    const curtain = 0.8 + 0.2 * Math.sin(x * 0.19 + off + 0.15 * Math.sin(ph + off));
    best = Math.max(best, Math.max(0, 1 - d) * curtain);
  }
  return Math.min(1, best);
}

/** The quantised level (0..levels) of a pixel in frame k: the cover in steps, dithered with a fixed Bayer threshold. */
export function level(k, x, y, h) {
  const v = cover(k, x, y, h) * AURORA.levels;
  const t = (B4[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
  return Math.max(0, Math.min(AURORA.levels, Math.floor(v + t)));
}

/** The alpha of a pixel in frame k (level * step). */
export const alphaAt = (k, x, y, h) => level(k, x, y, h) * AURORA.step;

/** The colour of the ribbon at row y of a band h tall: green above, violet at the hem. */
export const colorAt = (y, h) => (y < h * 0.52 ? AURORA.colors[0] : AURORA.colors[1]);

/** Which aurora frame shows at a game frame (0 under reduceMotion: the layer is not drawn then anyway). */
export const frameAt = (gameFrame, still = false) => (still ? 0 : Math.floor(Math.max(0, gameFrame) / AURORA.every) % AURORA.frames);

/** The band of a map in tile rows: [y0, y1) (lighting.aurora { y0, y1 }, or the top AURORA.rows rows). */
export function bandOf(mod) {
  const a = mod && mod.lighting && mod.lighting.aurora;
  const H = mod && mod.ground ? mod.ground.length : 0;
  const y0 = a && Number.isInteger(a.y0) ? a.y0 : 0;
  const y1 = a && Number.isInteger(a.y1) ? a.y1 : Math.min(H, AURORA.rows);
  return [Math.max(0, y0), Math.max(y0, Math.min(H || y1, y1))];
}
/** Does this map show the aurora? Tint `aurora` or lighting.aurora set. */
export const wantsAurora = (mod) => !!(mod && mod.lighting && (mod.lighting.aurora || mod.lighting.tint === 'aurora'));

/** Paint frame k of a band W x H px into an ImageData-capable context (browser). Returns false when it cannot. */
export function paintAurora(ctx, k, W, H) {
  if (!ctx || typeof ctx.createImageData !== 'function') return false;
  const img = ctx.createImageData(W, H), d = img.data;
  const rgb = AURORA.colors.map((c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const a = alphaAt(k, x, y, H);
    if (a <= 0) continue;
    const c = rgb[y < H * 0.52 ? 0 : 1], i = (y * W + x) * 4;
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = Math.round(a * 255);
  }
  ctx.putImageData(img, 0, 0);
  return true;
}
