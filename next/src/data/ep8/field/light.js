// Episode 8's light (E8-world, docs/EPISODE8_PLAN.md 2.8 and 5.2): the pack tints `rubout` and `violet`. Pure data and two
// small helpers; ../world.js registers the tints on TINTS, NIGHT_TINTS and LAMP_TINTS (so lamps light under both).
//
// rubout   the Stair's `rubbed_steps` and the square's `first_word`: a violet dim, the colour drained a little; the gold
//          motes pause under it (./system.js). In over 2 s, out over 1 s (RUBOUT_IN / RUBOUT_OUT frames).
// violet   the Last Word (with the map's dark 0.2): low and warm, a rose-violet multiply with a faint warm glow so the
//          party's floor never sinks. The gold grade after `eraser_defeated` is the map's own lighting (tint off).
// Both keep the party's floor at or above luma 0.22 (measured on the phone crop by qa/world/ep8_lab.py; estimated here).

export const RUBOUT_TINT = { color: '#8c7cc8', alpha: 0.42, desat: 0.3 };
export const RUBOUT_IN = 120, RUBOUT_OUT = 60;
export const VIOLET_TINT = { color: '#b48ac0', alpha: 0.36, desat: 0.12, glow: '#ffb070', glowAlpha: 0.04 };
export const FLOOR_MIN = 0.22;

/** Rec. 709 luma of a hex colour, 0..1. */
export function luma(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  return 0.2126 * ((n >> 16) & 255) / 255 + 0.7152 * ((n >> 8) & 255) / 255 + 0.0722 * (n & 255) / 255;
}

/**
 * A floor colour under a tint and a darkness, estimated the way lighting.js composes it: the multiply, the saturation pull
 * (toward the pixel's own grey, which keeps luma), the glow added, then the darkness's ambient multiply (lighting.js ambientFor:
 * about 0.92 (1 - d) of the light where no lamp falls). Returns luma 0..1. The lab measures the real frame.
 */
export function tintedLuma(hex, tint, dark = 0) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  let c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  if (tint) {
    const t = parseInt(tint.color.replace('#', ''), 16), tc = [(t >> 16) & 255, (t >> 8) & 255, t & 255].map((v) => v / 255);
    c = c.map((v, i) => v * (1 - tint.alpha + tint.alpha * tc[i]));
    if (tint.glow && tint.glowAlpha) {
      const gl = parseInt(tint.glow.replace('#', ''), 16), gc = [(gl >> 16) & 255, (gl >> 8) & 255, gl & 255].map((v) => v / 255);
      c = c.map((v, i) => Math.min(1, v + tint.glowAlpha * gc[i]));
    }
  }
  const y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return dark > 0.01 ? y * Math.min(1, (1 - dark) * 0.92) : y;
}
