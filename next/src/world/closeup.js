// Close-up inserts (W11, CRITIQUE_4 item 2): "the faces in the water do not read". On a phone the party stands
// between the camera and the Fountain of Faces, and a face drawn into the field's 20 px of water is a smudge
// whatever it holds. So the three fountain beats (fountain_faces, fountain_check, the Episode 2 ending, and Mira's
// beat in hollowmere_restored) cut to a framed close-up of the basin, the way Chrono Trigger and FF6 put the
// camera on the thing that matters: an oval of still water inside the stone rim, the sky in it, and whole
// upright faces looking back (the 48 px dialogue portraits, keyed, masked to an oval and tinted by the water).
// Everything is drawn at the game's own pixel density (no zoomed crop), with ordered dithering, no smoothing.
//
//   field.closeup.open('fountain', { faces, strangers, mode })   resolves when the insert has opened
//   field.closeup.close()                                         resolves when it has closed
//   field.closeup.update(); field.closeup.draw(r)                 screen space, after lighting (never tinted)
//
// Cutscene primitive: `await s.closeup('fountain', opts)` / `await s.closeup(null)`.
// opts.faces: ids in order left to right (default: the party, the hero in the middle); opts.strangers: the
// fountain_check beat ("every face in town, looking up"); opts.mode: 'dusk' | 'day' | 'night' (default: night
// under the night tint, day once nh_restored, else dusk). Night lays the town's lanterns on the water.
// The hero's face follows nh_restored: a blank pale smudge before (no features), faint and greyed after.

import { BAYER4 } from '../core/renderer.js';

export const INSERT = { w: 208, h: 96 };            // the framed basin on the 384 x 216 screen
export const INSERT_Y = 16;                         // clear of the bottom dialogue window and its name tab
export const OPEN_FRAMES = 12;
const RIM = 7;                                      // stone rim thickness (px)

// Water ramps, far side (top) to near side (bottom): the sky the water holds.
export const WATER = {
  dusk: ['#a9a6d2', '#8d8bc2', '#706fab', '#555993', '#3e467c', '#2d3567'],
  day: ['#d4e6f4', '#aecdec', '#86addf', '#5f8ac9', '#4369a9', '#2f4d88'],
  night: ['#2b3368', '#232a59', '#1c2249', '#161b3c', '#111531', '#0c1027'],
};
const STONE = {
  dusk: ['#211d33', '#383651', '#55536f', '#74728e', '#9796ae', '#bdbccf'],
  day: ['#2a2536', '#47425a', '#68637c', '#8b879e', '#b0adc0', '#d8d6e2'],
  night: ['#120f1f', '#1f1c33', '#2f2d48', '#43415e', '#5a5878', '#757394'],
};
const WATER_TINT = { dusk: [62, 84, 150], day: [70, 120, 190], night: [24, 34, 84] };
const GLINT = { dusk: '#e2e4ff', day: '#ffffff', night: '#9fb0ff' };
const OUTLINE = '#14101e';

/** The hero's face in the water: a blank smudge before the town is restored, faint and greyed after. */
export function heroFaceStyle(restored) { return restored ? 'faint' : 'smudge'; }

/**
 * Where each face sits in the insert (pure, tested): party faces 48 px in a row across the middle; strangers
 * (fountain_check) 32 px portraits and 1x sprite heads crowding the water behind them. Coordinates are the
 * face's centre relative to the water's centre.
 */
export function faceLayout(faces, strangers = false) {
  const out = [];
  const n = faces.length;
  const gap = 54;
  faces.forEach((id, i) => out.push({ id, size: 48, x: Math.round((i - (n - 1) / 2) * gap), y: 2, party: true }));
  if (strangers) {
    const S = [['elian', -78, -16], ['lena', 80, -14], ['anwen', -30, -26], ['tovin', 30, -27]];
    for (const [id, x, y] of S) out.unshift({ id, size: 32, x, y, stranger: true });
    const H = [['npc_sava', -60, 24], ['npc_corin', 60, 24], ['npc_nico', -84, 12], ['npc_orla', 86, 12], ['npc_wren', -6, -31], ['npc_fitch', 8, 30]];
    for (const [id, x, y] of H) out.unshift({ id, size: 12, x, y, stranger: true, head: true });
  }
  return out;
}

/** Is (x, y) inside the ellipse with centre (cx, cy) and radii (rx, ry)? Returns the normalized distance. */
const ell = (x, y, cx, cy, rx, ry) => Math.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2);
const hex = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
/** Pick ramp[i] or ramp[i+1] by a Bayer threshold for a fractional ramp index (ordered dithering). */
function dithered(ramp, v, x, y) {
  const f = Math.max(0, Math.min(ramp.length - 1, v));
  const i = Math.floor(f), frac = f - i;
  const th = (BAYER4[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
  return ramp[Math.min(ramp.length - 1, frac > th ? i + 1 : i)];
}

export class Closeup {
  constructor(field) {
    this.f = field;
    this.kind = null;
    this.t = 0;              // frames since open
    this.k = 0;              // 0 closed .. 1 open
    this.dir = 0;            // +1 opening, -1 closing
    this.waiters = [];
    this.opts = null;
    this.faceCache = new Map();
    this.base = null; this.rim = null; this.work = null;
  }

  get isOpen() { return this.kind != null && this.k > 0; }

  open(kind, opts = {}) {
    if (typeof document === 'undefined') return Promise.resolve();
    const f = this.f;
    const restored = !!(f.hasFlag && f.hasFlag('nh_restored'));
    const tint = f.lighting && f.lighting.tintName;
    const mode = opts.mode || (tint === 'night' ? 'night' : restored ? 'day' : 'dusk');
    const faces = opts.faces || ['mira', 'hero', 'bram'];
    this.kind = kind;
    this.opts = { ...opts, mode, faces, restored };
    this.layout = faceLayout(faces, !!opts.strangers);
    this.build();
    this.t = 0;
    this.dir = 1;
    if (this.reduceMotion()) { this.k = 1; this.dir = 0; return Promise.resolve(); }
    return new Promise((res) => this.waiters.push(res));
  }

  close() {
    if (!this.kind) return Promise.resolve();
    if (this.reduceMotion()) { this.kind = null; this.k = 0; this.dir = 0; return Promise.resolve(); }
    this.dir = -1;
    return new Promise((res) => this.waiters.push(res));
  }

  /** Drop it at once (map change, cancelled scene). */
  reset() { this.kind = null; this.k = 0; this.dir = 0; const w = this.waiters; this.waiters = []; for (const r of w) r(); }

  reduceMotion() { const s = this.f.engine && this.f.engine.settings; return !!(s && s.reduceMotion); }

  update() {
    if (!this.kind) return;
    this.t++;
    if (this.dir) {
      this.k = Math.max(0, Math.min(1, this.k + this.dir / OPEN_FRAMES));
      if ((this.dir > 0 && this.k >= 1) || (this.dir < 0 && this.k <= 0)) {
        if (this.dir < 0) this.kind = null;
        this.dir = 0;
        const w = this.waiters; this.waiters = [];
        for (const r of w) r();
      }
    }
  }

  // ------------------------------------------------------------------------------------------------ art
  /** The static layers for this opening: the water (sky gradient) and the stone rim. */
  build() {
    const { w, h } = INSERT, mode = this.opts.mode;
    const mk = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    this.base = this.base || mk(); this.rim = this.rim || mk(); this.work = this.work || mk();
    // Three ellipses: the rim's outer edge, the lip's inner edge (the rim's flat top lies between them), and the
    // water, set 3 px lower so the far inner wall of the basin shows between lip and water (we look down at an angle).
    const cx = w / 2 - 0.5, cy = h / 2 - 0.5;
    const orx = w / 2 - 1, ory = h / 2 - 1, lrx = orx - RIM - 3, lry = ory - RIM - 1;
    const wcy = cy + 2, wrx = lrx - 1, wry = lry - 3;
    this.geom = { cx, cy: wcy, orx, ory, irx: wrx, iry: wry };
    const water = WATER[mode], stone = STONE[mode];
    const bg = this.base.getContext('2d');
    const wimg = bg.createImageData(w, h);
    const rimg = this.rim.getContext('2d').createImageData(w, h);
    const put = (img, i, c) => { const [R, G, B] = hex(c); img.data[i] = R; img.data[i + 1] = G; img.data[i + 2] = B; img.data[i + 3] = 255; };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dw = ell(x, y, cx, wcy, wrx, wry), dl = ell(x, y, cx, cy, lrx, lry), d = ell(x, y, cx, cy, orx, ory);
      const i = (y * w + x) * 4;
      if (dw < 1) {
        // Water: the sky, lighter on the far side; the inner wall's shadow along the far-left edge (light from the
        // upper left); a dark line where the water meets the stone.
        let v = (y - (wcy - wry)) / (2 * wry) * (water.length - 1) * 0.92;
        const nx = (x - cx) / wrx, ny = (y - wcy) / wry;
        if (dw > 0.86 && (nx * -0.6 + ny * -0.8) > 0.1) v += 1.2 * (dw - 0.86) / 0.14 + 0.3;
        if (water === WATER.night && ((x * 37 + y * 91) % 211) === 0 && dw < 0.9) v = -1;       // a star in the water
        put(wimg, i, dw > 0.975 ? stone[0] : v < 0 ? '#c8d0ff' : dithered(water, v, x, y));
      } else if (dl < 1) {
        // The basin's inner wall: the far side faces us (mid stone, darker low down), the near side is hidden.
        const k = Math.max(0, Math.min(1, (y - (cy - lry)) / Math.max(1, (wcy - wry) - (cy - lry) + 6)));
        put(rimg, i, dithered(stone, 2.2 - k * 1.6, x, y));
      } else if (d < 1) {
        // The rim's top: a rounded lip (lighter along its crest), the outer slope lit on the upper left, the inner
        // edge lit on the lower right, cut into dressed blocks by dark seams; outlined in ink.
        const ring = Math.max(0, Math.min(1, (dl - 1) / (dl / d - 1)));   // 0 at the lip's inner edge, 1 at the outside
        const nx = (x - cx) / orx, ny = (y - cy) / ory, nl = Math.hypot(nx, ny) || 1;
        const lit = (nx / nl) * -0.6 + (ny / nl) * -0.8;
        const crest = 1 - Math.abs(ring - 0.45) / 0.55;
        let v = 1.4 + crest * 2.4 + (ring > 0.45 ? lit : -lit) * 1.3;
        const f = ((Math.atan2(ny, nx) / (2 * Math.PI)) * 18 + 1.25) % 1;   // 18 dressed blocks round the rim
        const seam = f < 0.045;
        if (seam && ring > 0.12 && ring < 0.9) v -= 1.6;
        if (ring < 0.1) v = 0.6;                   // the inner edge of the lip
        if (d > 0.982) v = -1;                     // the outline
        put(rimg, i, v < 0 ? OUTLINE : dithered(stone, v, x, y));
      }
    }
    bg.putImageData(wimg, 0, 0);
    this.rim.getContext('2d').putImageData(rimg, 0, 0);
    this.faces = this.layout.map((L) => ({ ...L, img: this.face(L) })).filter((L) => L.img);
  }

  /** A face prepared for the water (cached): keyed portrait or sprite head, oval mask, styled by who it is. */
  face(L) {
    const style = L.id === 'hero' && L.party ? heroFaceStyle(this.opts.restored) : L.stranger ? 'stranger' : 'party';
    const key = `${L.id}|${L.size}|${style}|${this.opts.mode}`;
    if (this.faceCache.has(key)) return this.faceCache.get(key);
    const assets = this.f.engine.assets;
    let src = null, fr = null;
    if (L.head) {
      const a = assets.has('npcs') ? assets.atlas('npcs') : null;
      fr = a && a.frames[`${L.id}_down_0`];
      if (fr) src = a.image;
    } else {
      const a = assets.has('portraits') ? assets.atlas('portraits') : null;
      fr = a && a.frames[`${L.id}_${L.size}`];
      if (fr) src = a.image;
    }
    if (!src || !fr) { this.faceCache.set(key, null); return null; }
    const w = L.head ? fr.w : fr.w - 2, h = L.head ? 13 : fr.h - 2;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    // a portrait loses its 1 px frame; a sprite head is the top 13 rows of the down-facing stand frame
    if (L.head) g.drawImage(src, fr.x, fr.y + 2, w, h, 0, 0, w, h);
    else g.drawImage(src, fr.x + 1, fr.y + 1, w, h, 0, 0, w, h);
    const img = g.getImageData(0, 0, w, h), px = img.data;
    // Key out the portrait's navy backdrop: flood from the border through near-backdrop pixels, so dark hair and
    // eyes inside the face keep their colour.
    const bgc = [14, 21, 59];
    const near = (i) => Math.abs(px[i] - bgc[0]) + Math.abs(px[i + 1] - bgc[1]) + Math.abs(px[i + 2] - bgc[2]) < 46;
    if (!L.head) {
      const seen = new Uint8Array(w * h), stack = [];
      for (let x = 0; x < w; x++) { stack.push(x, (h - 1) * w + x); }
      for (let y = 0; y < h; y++) { stack.push(y * w, y * w + w - 1); }
      while (stack.length) {
        const p = stack.pop();
        if (seen[p]) continue;
        seen[p] = 1;
        if (!near(p * 4)) continue;
        px[p * 4 + 3] = 0;
        const x = p % w, y = (p / w) | 0;
        if (x > 0) stack.push(p - 1); if (x < w - 1) stack.push(p + 1);
        if (y > 0) stack.push(p - w); if (y < h - 1) stack.push(p + w);
      }
    }
    const tint = WATER_TINT[this.opts.mode];
    const ocx = (w - 1) / 2, ocy = L.head ? (h - 1) / 2 : h * 0.47, orx = w * 0.47, ory = h * 0.52;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (!px[i + 3]) continue;
      // the oval: whole inside, a dithered fade over its last ring, nothing outside (hair and shoulders melt)
      const d = L.head ? 0 : ell(x, y, ocx, ocy, orx, ory);
      const th = (BAYER4[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
      if (d > 1 || (d > 0.82 && (d - 0.82) / 0.18 > th)) { px[i + 3] = 0; continue; }
      let r = px[i], gg = px[i + 1], b = px[i + 2];
      const lum = 0.3 * r + 0.59 * gg + 0.11 * b;
      if (style === 'smudge') {
        // breath on glass: a flat pale blank, every other pixel, no features at all
        if (((x + y) & 1) && th > 0.3) { px[i + 3] = 0; continue; }
        r = 223; gg = 230; b = 242; px[i + 3] = 200;
      } else if (style === 'faint') {
        // the hero, restored but faint: greyed, lifted toward the water's silver, thinned by a dither
        if (th > 0.74) { px[i + 3] = 0; continue; }
        const v = 64 + lum * 0.9;
        r = v * 0.92; gg = v * 0.97; b = v * 1.1; px[i + 3] = 235;
      } else {
        // a face in the water: its own colours, pulled toward the water and a little darker (strangers more so)
        const k = style === 'stranger' ? 0.42 : 0.26;
        r = r * (1 - k) + tint[0] * k; gg = gg * (1 - k) + tint[1] * k; b = b * (1 - k) + tint[2] * k;
      }
      px[i] = Math.round(Math.min(255, r)); px[i + 1] = Math.round(Math.min(255, gg)); px[i + 2] = Math.round(Math.min(255, b));
    }
    g.putImageData(img, 0, 0);
    this.faceCache.set(key, c);
    return c;
  }

  // ------------------------------------------------------------------------------------------------ draw
  draw(r) {
    if (!this.kind || this.k <= 0 || !this.base) return;
    const { w, h } = INSERT;
    const x0 = Math.round((r.W - w) / 2), y0 = INSERT_Y;
    const k = this.dir === 0 ? this.k : this.k * this.k * (3 - 2 * this.k);
    const g = r.ctx;
    const motion = !this.reduceMotion();
    const t = this.t;
    const mode = this.opts.mode;
    // dim the field behind so the eye goes to the water
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 0.42 * k; g.fillStyle = '#0c0a18'; g.fillRect(0, 0, r.W, r.H);
    g.restore();
    // compose: water, faces on the water only (source-atop), glints and lanterns, then the rim over it all
    const W = this.work.getContext('2d');
    W.setTransform(1, 0, 0, 1, 0, 0);
    W.globalCompositeOperation = 'source-over'; W.globalAlpha = 1;
    W.clearRect(0, 0, w, h);
    W.drawImage(this.base, 0, 0);
    W.globalCompositeOperation = 'source-atop';
    const { cx, cy } = this.geom;
    const strangerK = this.opts.strangers ? Math.min(1, Math.max(0, (t - 8) / 40)) : 0;
    this.faces.forEach((F, idx) => {
      const img = F.img;
      let alpha = F.stranger ? 0.62 * Math.min(1, Math.max(0, strangerK * 1.6 - idx * 0.07)) : F.id === 'hero' && F.party ? (this.opts.restored ? 0.78 : 0.62) : 0.9;
      if (alpha <= 0.01) return;
      const fx = Math.round(cx + F.x - img.width / 2), fy = Math.round(cy + F.y - img.height / 2);
      W.globalAlpha = alpha;
      // ripple: the face wavers a pixel, two rows at a time (still water, so slow and small)
      for (let band = 0; band < img.height; band += 2) {
        const dx = motion ? Math.round(Math.sin(t / 22 + (fy + band) * 0.45 + idx) * 0.8) : 0;
        W.drawImage(img, 0, band, img.width, Math.min(2, img.height - band), fx + dx, fy + band, img.width, Math.min(2, img.height - band));
      }
    });
    W.globalAlpha = 1;
    // glints: short bright ripples that drift (the sky's light on the surface)
    const glints = [[-62, -26, 12], [40, -22, 8], [-20, 22, 10], [70, 18, 7], [6, -32, 6]];
    W.fillStyle = GLINT[mode];
    glints.forEach(([gx, gy, len], i) => {
      const drift = motion ? Math.round(Math.sin(t / 50 + i * 1.7) * 3) : 0;
      const on = motion ? ((t >> 4) + i) % 5 !== 0 : true;
      if (!on) return;
      W.globalAlpha = 0.55;
      W.fillRect(Math.round(cx + gx + drift - len / 2), Math.round(cy + gy), len, 1);
      W.globalAlpha = 0.3;
      W.fillRect(Math.round(cx + gx + drift - len / 2 + 2), Math.round(cy + gy + 1), Math.max(2, len - 4), 1);
    });
    W.globalAlpha = 1;
    if (mode === 'night') this.drawLanterns(W, cx, cy, t, motion);
    W.globalCompositeOperation = 'source-over';
    W.drawImage(this.rim, 0, 0);
    // open / close: the insert grows from its middle line (a window opening), whole pixels only
    const vis = Math.max(2, Math.round(h * k));
    const sy = Math.round((h - vis) / 2);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.imageSmoothingEnabled = false;
    g.drawImage(this.work, 0, sy, w, vis, x0, y0 + sy, w, vis);
    g.restore();
  }

  /** Night: the town's lanterns on the water ("one for every face that came home"), each with its reflection. */
  drawLanterns(W, cx, cy, t, motion) {
    const L = [[-84, -6], [-28, -30], [26, -31], [84, -4], [-60, 28], [58, 28], [0, 33]];
    L.forEach(([lx, ly], i) => {
      const bob = motion ? Math.round(Math.sin(t / 40 + i) * 1) : 0;
      const x = Math.round(cx + lx + (motion ? Math.sin(t / 90 + i * 2) * 2 : 0)), y = Math.round(cy + ly + bob);
      // halo: a dithered warm ring
      for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) {
        const d = Math.hypot(dx, dy);
        if (d > 5.2 || d < 2) continue;
        const th = (BAYER4[(((y + dy) & 3) << 2) | ((x + dx) & 3)] + 0.5) / 16;
        if (th > (5.2 - d) / 5.2 * 0.7) continue;
        W.globalAlpha = 0.5; W.fillStyle = '#e8944a'; W.fillRect(x + dx, y + dy, 1, 1);
      }
      // the reflection: a broken vertical streak under the lantern
      W.globalAlpha = 0.55; W.fillStyle = '#f0b060';
      for (let s = 3; s < 10; s += 2) { const wob = motion ? Math.round(Math.sin(t / 14 + s + i) * 0.7) : 0; W.fillRect(x + wob, y + s, s < 7 ? 2 : 1, 1); }
      // the paper lantern: a warm body with a bright core and a dark cap
      W.globalAlpha = 1;
      W.fillStyle = '#c86a32'; W.fillRect(x - 1, y - 2, 3, 4);
      W.fillStyle = '#ffd27a'; W.fillRect(x - 1, y - 1, 3, 2);
      W.fillStyle = '#fff4c8'; W.fillRect(x, y - 1, 1, 1);
      W.fillStyle = '#3a2418'; W.fillRect(x - 1, y - 3, 3, 1);
    });
    W.globalAlpha = 1;
  }

  debugState() { return this.kind ? { kind: this.kind, k: Math.round(this.k * 100) / 100, mode: this.opts.mode, faces: this.faces ? this.faces.map((F) => F.id) : [] } : null; }
}
