// The Fading Stretch's fog bank (W11, CRITIQUE_4 item 4 with PLAYTEST_REVIEW_3 item 9). A map that declares `fog`
// gets a ground fog over a tile area: a grey veil (the stretch's own tint) and ordered-dither white mist at about
// half density that drifts, thins to nothing in a clear ring around the leader, and is drawn ABOVE the actors, so
// what stands out in it is lost too. The cairns are the guide: any cairn within `cairnLight` tiles of the leader
// burns a small pale light that shows through the fog, with a clear patch round it, so the next stone is always
// in sight from the last. A wrong step into the fog (the map's fog doors) lands the party back at the LAST CAIRN
// PASSED (a checkpoint), not at the start of the stretch, so a miss costs a few tiles.
//
//   map.mod.fog = { area: {x, y, w, h}, edge, clear: [inner, outer], density, color, veil, veilAlpha,
//                   cairns: [[x, y], ...], cairnLight, checkpoints: [{ x, y, dir }, ...] }      (tiles)
//   const fog = new FogBank(field); fog.reset() on map load; fog.update(); fog.draw(r, cam) in world space
//   fog.onLeaderArrived(tx, ty)   records the checkpoint the leader stands at (within one tile)
//   fog.landing()                 -> [x, y, dir] of the last checkpoint, or null (use the door's own target)
// Pure helpers (node-tested): fogDensityAt, checkpointNear.

import { BAYER4 } from '../core/renderer.js';

const T = 16;

/** Value noise in [0, 1] on a lattice of `cell` px (smoothstep between hashed corners). */
function hash(ix, iy) { let h = (ix * 374761393 + iy * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
export function noise2(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
}

const smooth = (e0, e1, v) => { const k = Math.max(0, Math.min(1, (v - e0) / (e1 - e0))); return k * k * (3 - 2 * k); };

/**
 * Fog density (0..1) at world pixel (wx, wy): the area ramp (fades in over `edge` tiles at the bank's sides), the
 * clear ring round the leader (none inside clear[0] tiles, full beyond clear[1]), the clear patches round lit cairns,
 * and a slow drift of noise. o = { spec, leader: [x, y], lit: [[x, y], ...] (px), t }.
 */
export function fogDensityAt(wx, wy, o) {
  const s = o.spec, a = s.area;
  const x0 = a.x * T, y0 = a.y * T, x1 = (a.x + a.w) * T, y1 = (a.y + a.h) * T, e = (s.edge || 2) * T;
  // the bank's sides are ragged, not ruled: the edge wanders with height
  const rx = wx + (noise2(wy / 22, 3.7) - 0.5) * 30;
  const inX = Math.min(smooth(x0 - e, x0 + e * 0.5, rx), 1 - smooth(x1 - e * 0.5, x1 + e, rx));
  const inY = Math.min(smooth(y0 - e * 0.5, y0 + e * 0.5, wy), 1 - smooth(y1 - e * 0.5, y1 + e * 0.5, wy));
  let d = Math.max(0, Math.min(inX, inY));
  if (d <= 0) return 0;
  if (o.leader) {
    const dist = Math.hypot(wx - o.leader[0], wy - o.leader[1]) / T;
    d *= smooth(s.clear[0], s.clear[1], dist);
  }
  if (o.lit) for (const [cx, cy] of o.lit) { const dist = Math.hypot(wx - cx, wy - cy); if (dist < 22) d *= smooth(9, 22, dist); }
  // billows: big slow banks drifting east with the river wind, finer wisps against them; thin gaps and thick drifts
  const t = o.t || 0;
  const n = noise2((wx - t * 0.16) / 58, wy / 34) * 0.68 + noise2((wx + t * 0.07) / 19, (wy - t * 0.03) / 14) * 0.32;
  return d * Math.max(0, Math.min(1, (s.density || 0.5) * (0.15 + 1.45 * n * n)));
}

/** The checkpoint a leader at tile (tx, ty) stands at (Chebyshev distance 1), or null. */
export function checkpointNear(spec, tx, ty) {
  for (const c of (spec && spec.checkpoints) || []) if (Math.abs(c.x - tx) <= 1 && Math.abs(c.y - ty) <= 1) return c;
  return null;
}

export class FogBank {
  constructor(field) {
    this.f = field;
    this.spec = null;
    this.t = 0;
    this.checkpoint = null;
    this.mapId = null;
    this.buf = null; this.canvas = null; this.img = null;
  }

  get active() { return !!this.spec; }

  reset() {
    const map = this.f.map, mod = map && map.mod;
    const id = mod ? mod.id : null;
    if (id !== this.mapId) this.checkpoint = null;     // a same-map fog landing keeps it; a new map forgets it
    this.mapId = id;
    this.spec = mod && mod.fog ? { edge: 2, clear: [3, 5], density: 0.5, color: '#e2e6ef', veil: '#9aa0b4', veilAlpha: 0.3, cairnLight: 6, ...mod.fog } : null;
  }

  update() { if (this.spec) this.t++; }

  onLeaderArrived(tx, ty) {
    if (!this.spec) return;
    const c = checkpointNear(this.spec, tx, ty);
    if (c) this.checkpoint = c;
  }

  landing() { return this.spec && this.checkpoint ? [this.checkpoint.x, this.checkpoint.y, this.checkpoint.dir || 'right'] : null; }

  /** Lit cairns (world px of the stone's top) within cairnLight tiles of the leader. */
  litCairns() {
    const L = this.f.leader, s = this.spec;
    if (!L || !s.cairns) return [];
    const out = [];
    for (const [x, y] of s.cairns) {
      const cx = x * T + 8, cy = y * T - 9;      // the top stone of the 16 x 32 cairn (anchored on its base tile)
      const dist = Math.hypot(cx - L.feetX, cy - L.feetY) / T;
      if (dist <= s.cairnLight) out.push([cx, cy, dist]);
    }
    return out;
  }

  /** Draw in world space (after the actors and the overhead layer, before the lighting). */
  draw(r, cam) {
    const s = this.spec;
    if (!s || typeof document === 'undefined') return;
    const a = s.area, e = (s.edge || 2) * T;
    const W = r.W, H = r.H;
    // the screen rect the bank (with its soft edges) covers
    const sx0 = Math.max(0, Math.floor(a.x * T - e - cam.x)), sx1 = Math.min(W, Math.ceil((a.x + a.w) * T + e - cam.x));
    const sy0 = Math.max(0, Math.floor(a.y * T - e - cam.y)), sy1 = Math.min(H, Math.ceil((a.y + a.h) * T + e - cam.y));
    if (sx1 <= sx0 || sy1 <= sy0) return;
    if (!this.canvas) {
      this.canvas = document.createElement('canvas'); this.canvas.width = W; this.canvas.height = H;
      this.ctx = this.canvas.getContext('2d');
      this.img = this.ctx.createImageData(W, H);
      this.buf = new Uint32Array(this.img.data.buffer);
    }
    const buf = this.buf;
    buf.fill(0);
    const L = this.f.leader;
    const lit = this.litCairns();
    const o = { spec: s, leader: L ? [L.feetX, L.feetY - 6] : null, lit: lit.map(([x, y]) => [x, y + 12]), t: this.t };
    const reduce = !!(this.f.engine.settings && this.f.engine.settings.reduceMotion);
    if (reduce) o.t = 0;
    const rgba = (hex, al) => { const n = parseInt(hex.slice(1), 16); return ((al & 255) << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | ((n >> 16) & 255); };
    const fogPx = rgba(s.color, 232), fogDim = rgba(s.color, 128);
    const veilA = Math.round(255 * s.veilAlpha), veil = parseInt(s.veil.slice(1), 16);
    const vr = (veil >> 16) & 255, vg = (veil >> 8) & 255, vb = veil & 255;
    // density per 4x4 block (world-aligned, so the dither never crawls when the camera moves)
    const bx0 = Math.floor((sx0 + cam.x) / 4), bx1 = Math.ceil((sx1 + cam.x) / 4), by0 = Math.floor((sy0 + cam.y) / 4), by1 = Math.ceil((sy1 + cam.y) / 4);
    const camX = Math.round(cam.x), camY = Math.round(cam.y);
    const x0 = a.x * T, x1 = (a.x + a.w) * T, y0 = a.y * T, y1 = (a.y + a.h) * T;
    for (let by = by0; by < by1; by++) {
      for (let bx = bx0; bx < bx1; bx++) {
        const wx = bx * 4 + 2, wy = by * 4 + 2;
        const d = fogDensityAt(wx, wy, o);
        // the veil: the stretch's grey, at full strength inside the bank, ramped over its edges
        const vin = Math.min(smooth(x0 - e, x0 + e * 0.5, wx), 1 - smooth(x1 - e * 0.5, x1 + e, wx), smooth(y0 - e * 0.5, y0 + e * 0.5, wy), 1 - smooth(y1 - e * 0.5, y1 + e * 0.5, wy));
        const va = Math.max(0, Math.round(veilA * vin));
        const veilPx = ((va & 255) << 24) | (vb << 16) | (vg << 8) | vr;
        const lvl = d * 16;
        for (let py = 0; py < 4; py++) {
          const wyy = by * 4 + py, syy = wyy - camY;
          if (syy < sy0 || syy >= sy1) continue;
          const row = syy * W;
          for (let px = 0; px < 4; px++) {
            const wxx = bx * 4 + px, sxx = wxx - camX;
            if (sxx < sx0 || sxx >= sx1) continue;
            const th = BAYER4[((wyy & 3) << 2) | (wxx & 3)];
            // full fog pixels where the dither says so; a dimmer second tier just past them; the veil elsewhere
            buf[row + sxx] = th < lvl ? fogPx : th < lvl * 1.45 ? fogDim : va ? veilPx : 0;
          }
        }
      }
    }
    this.ctx.putImageData(this.img, 0, 0, sx0, sy0, sx1 - sx0, sy1 - sy0);
    const g = r.ctx;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.drawImage(this.canvas, sx0, sy0, sx1 - sx0, sy1 - sy0, sx0, sy0, sx1 - sx0, sy1 - sy0);
    g.restore();
    // the cairn lights, over the fog: a pale pip on the top stone and a dithered halo, brighter the nearer it is
    for (const [cx, cy, dist] of lit) this.drawCairnLight(r, cx - camX, cy - camY, dist, reduce);
  }

  drawCairnLight(r, x, y, dist, reduce) {
    const g = r.ctx;
    const k = Math.max(0.4, Math.min(1, 1.3 - dist / this.spec.cairnLight));
    const pulse = reduce ? 1 : 0.8 + 0.2 * Math.sin(this.t / 22 + x * 0.1);
    const R = 9;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    // a dithered halo, denser toward the stone
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const d = Math.hypot(dx, dy * 1.15);
      if (d > R + 0.2 || d < 2) continue;
      const th = (BAYER4[(((y + dy) & 3) << 2) | ((x + dx) & 3)] + 0.5) / 16;
      if (th > ((R + 0.2 - d) / (R + 0.2)) * 0.8) continue;
      g.globalAlpha = (d < 5 ? 0.75 : 0.5) * k * pulse; g.fillStyle = d < 5 ? '#e4eeff' : '#a8c4ff'; g.fillRect(x + dx, y + dy, 1, 1);
    }
    // the flame: a small bright diamond on the top stone
    g.globalAlpha = Math.min(1, k * pulse + 0.15);
    g.fillStyle = '#cfe4ff'; g.fillRect(x - 2, y, 5, 1); g.fillRect(x, y - 2, 1, 5);
    g.fillStyle = '#ffffff'; g.fillRect(x - 1, y - 1, 3, 3);
    g.restore();
  }

  debugState() { return this.spec ? { checkpoint: this.checkpoint ? [this.checkpoint.x, this.checkpoint.y] : null, lit: this.litCairns().length } : null; }
}
