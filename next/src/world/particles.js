// Field particles: ambient life per map (leaves, fireflies, dust motes, ink drips, chimney smoke, birds, rain)
// and one-shots (footstep puffs, sparkles, reveal glitter, pot shards, grass sway). Cheap: fixed caps, no
// allocation per frame, every draw is a handful of fillRects.
//
//   const fx = new Particles(field);
//   fx.setAmbient(['leaves', 'fireflies'])   per map and time of day (field decides from area, tint, weather)
//   fx.setChimneys([{ x, y }])              world px of chimney tops (smoke rises from a visible one)
//   fx.spawn('puff', x, y) / fx.sparkle(x, y, n) / fx.burst('shard', x, y, n) / fx.sway(tx, ty)
//   fx.update(cam) ; fx.draw(r, cam, 'below' | 'mid' | 'above')
//   fx.setMist([{ x, y, w, h }] | null)     E2: slow dithered fog blobs ('mist' ambient), limited to tile areas
//
// Passes: 'below' sits under props and actors (puffs, shards, drips, resting birds); 'mid' is drawn right
// after the actors and before the overhead layer and the lighting, so it is tinted and darkened with the
// world (grass sway over the party's feet, drip splashes); 'above' is drawn last so it stays bright in dark
// rooms (fireflies, motes, sparkles, rain). Leaves, smoke and flying birds are 'above' too but take the day
// tint through `shade` so they do not glow at night.

const CAPS = { leaves: 14, fireflies: 16, motes: 26, drips: 5, rain: 70, embers: 10, smoke: 14, birds: 3, mist: 14 };
const ABOVE = new Set(['leaf', 'firefly', 'mote', 'rain', 'sparkle', 'glint', 'ember', 'smoke', 'page']);
const MID = new Set(['sway', 'splash', 'mist']);
const MIST_SIZES = [[44, 12], [32, 10], [56, 14]];
const MIST_LIFE = 520;
const GRASS = new Set(['grass', 'tallgrass']);
const BIRD_FLEE_PX = 44;

export class Particles {
  constructor(field) {
    this.field = field;
    this.engine = field.engine;
    this.list = [];
    this.ambient = new Set();
    this.frame = 0;
    this.rainIntensity = 0;    // 0..1 (eased toward target)
    this.rainTarget = 0;
    this.leafColors = ['#d2a83c', '#b07a2e', '#8fbf4a', '#e0bc52', '#c45a32'];
    this.chimneys = [];
    this.shade = [1, 1, 1];    // multiplier for 'above' particles that are things, not lights (set by the field)
    this.windX = 0.3;
    this._shadeCache = new Map();
  }

  setAmbient(kinds) { this.ambient = new Set(kinds || []); }
  /** E2 (EPISODE2_PLAN 5.5): where the mist may spawn, as tile rects; null = anywhere in view. */
  setMist(areas) { this.mistAreas = areas && areas.length ? areas : null; }
  /** Fill the view with mist at once on a map load (so the Fading Stretch is not clear for the first seconds). */
  prewarmMist(cam) {
    if (!this.ambient.has('mist') || !cam) return;
    const rng = this.field.rng, W = cam.W || 384, H = cam.H || 216;
    for (let i = 0; i < 40 && this.count('mist') < CAPS.mist; i++) {
      const tx = cam.x + rng.int(-24, W), ty = cam.y + rng.int(0, H);
      if (this.mistAreas && !this.mistAreas.some((a) => tx >= a.x * 16 && ty >= a.y * 16 && tx < (a.x + a.w) * 16 && ty < (a.y + a.h) * 16)) continue;
      const life = MIST_LIFE + rng.int(0, 200);
      const p = this.spawn('mist', tx, ty, { vx: rng.range(0.06, 0.16), vy: rng.range(-0.015, 0.015), life, phase: rng.range(0, 6.28), state: rng.int(0, MIST_SIZES.length - 1) });
      p.t = rng.int(Math.round(life * 0.2), Math.round(life * 0.7));
    }
  }
  /** Soft fog blob sprites: three nested Bayer-dithered ellipses, cached once per size. */
  mistSprite(i) {
    this._mist = this._mist || [];
    if (this._mist[i] !== undefined) return this._mist[i];
    let c = null;
    if (typeof document !== 'undefined') {
      const [w, h] = MIST_SIZES[i];
      c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d');
      const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
      g.fillStyle = '#eef2f8';
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dx = (x + 0.5 - w / 2) / (w / 2), dy = (y + 0.5 - h / 2) / (h / 2);
        const d = Math.sqrt(dx * dx + dy * dy);
        const density = d < 0.45 ? 0.62 : d < 0.75 ? 0.4 : d < 1 ? 0.18 : 0;
        if (B[(y % 4) * 4 + (x % 4)] < density * 16) g.fillRect(x, y, 1, 1);
      }
    }
    this._mist[i] = c;
    return c;
  }
  setRain(on) { this.rainTarget = on ? 1 : 0; }
  setChimneys(list) { this.chimneys = list || []; }
  setShade(rgb) {
    if (!rgb) rgb = [1, 1, 1];
    if (rgb[0] !== this.shade[0] || rgb[1] !== this.shade[1] || rgb[2] !== this.shade[2]) { this.shade = rgb; this._shadeCache.clear(); }
  }

  /** A colour multiplied by the current day tint (cached per colour). */
  shaded(hex) {
    const s = this.shade;
    if (s[0] === 1 && s[1] === 1 && s[2] === 1) return hex;
    let v = this._shadeCache.get(hex);
    if (v) return v;
    const n = parseInt(hex.slice(1), 16);
    const r = Math.round(((n >> 16) & 255) * s[0]), g = Math.round(((n >> 8) & 255) * s[1]), b = Math.round((n & 255) * s[2]);
    v = `rgb(${r},${g},${b})`;
    this._shadeCache.set(hex, v);
    return v;
  }

  spawn(kind, x, y, o = {}) {
    const p = { kind, x, y, vx: o.vx || 0, vy: o.vy || 0, t: 0, life: o.life || 40, phase: o.phase || 0, size: o.size || 1, color: o.color || '#fff', g: o.g || 0, data: o.data || null, state: o.state || 0 };
    this.list.push(p);
    return p;
  }
  sparkle(x, y, n = 3, color) {
    const rng = this.field.rng;
    for (let i = 0; i < n; i++) this.spawn('sparkle', x + rng.int(-6, 6), y + rng.int(-6, 6), { life: 18 + rng.int(0, 12), phase: rng.int(0, 2), color: color || '#fff7d6' });
  }
  burst(kind, x, y, n = 6, color) {
    const rng = this.field.rng;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + rng.range(-0.3, 0.3);
      const sp = rng.range(0.6, 1.6);
      this.spawn(kind, x, y, { vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 1.2, g: 0.12, life: 26 + rng.int(0, 10), color: color || '#c9b89a', size: rng.int(1, 2) });
    }
  }
  puff(x, y) {
    const rng = this.field.rng;
    for (let i = 0; i < 2; i++) this.spawn('puff', x + rng.int(-3, 3), y - 1, { vx: rng.range(-0.25, 0.25), vy: -0.15, life: 14 + rng.int(0, 6), size: 1 });
  }
  drip(x, y, h) { this.spawn('drip', x, y, { vy: 0.4, g: 0.08, life: 90, data: { floor: y + h } }); }
  /**
   * The pit tell (PLAYTEST fix 6): one loose page drifts down from above and is swallowed by the pit whose
   * center is (x, y) world px. It sways, tumbles between a wide and a narrow frame, and fades as it crosses the
   * pit's rim. One-shot; the field fires it from a map `ambientFx` page_fall entry.
   */
  pageFall(x, y) {
    const rng = this.field.rng;
    this.engine.audio.sfx('page_flutter', { volume: 0.6 });
    return this.spawn('page', x + rng.int(-3, 3), y - 46, { vy: 0.4, life: 124, phase: rng.range(0, 6.28), data: { rim: y - 6 } });
  }
  /** Tall grass bends under a step: three blades over the tile's feet row, leaning for a quarter second. */
  sway(tx, ty) {
    for (const p of this.list) if (p.kind === 'sway' && p.data && p.data.tx === tx && p.data.ty === ty) { p.t = 0; return; }
    this.spawn('sway', tx * 16, ty * 16, { life: 18, phase: this.field.rng.range(0, 6.28), data: { tx, ty } });
  }

  count(kind) { let n = 0; for (const p of this.list) if (p.kind === kind) n++; return n; }

  /** A random grass tile inside the view, away from the party (null when none within a few tries). */
  grassSpot(cam, minDist = 0) {
    const map = this.field.map, rng = this.field.rng, L = this.field.leader;
    if (!map || !map.terrainAt) return null;
    const W = cam.W, H = cam.H;
    for (let i = 0; i < 6; i++) {
      const tx = Math.floor((cam.x + rng.int(0, W)) / 16), ty = Math.floor((cam.y + rng.int(0, H)) / 16);
      if (!map.inBounds(tx, ty) || !GRASS.has(map.terrainAt(tx, ty)) || map.blockedAt(tx, ty)) continue;
      if (minDist && L && Math.abs(L.tx - tx) + Math.abs(L.ty - ty) < minDist) continue;
      return [tx, ty];
    }
    return null;
  }

  update(cam) {
    this.frame++;
    const rng = this.field.rng;
    const W = cam.W, H = cam.H;
    this.rainIntensity += (this.rainTarget - this.rainIntensity) * 0.02;
    // ambient spawns inside (and just above) the view
    if (this.ambient.has('leaves') && this.frame % 11 === 0 && this.count('leaf') < CAPS.leaves) {
      this.spawn('leaf', cam.x + rng.int(-20, W), cam.y - 8, { vx: rng.range(0.2, 0.55), vy: rng.range(0.3, 0.55), life: 460, phase: rng.range(0, 6.28), color: rng.pick(this.leafColors) });
    }
    if (this.ambient.has('fireflies') && this.frame % 12 === 0 && this.count('firefly') < CAPS.fireflies) {
      const spot = this.grassSpot(cam);
      if (spot) this.spawn('firefly', spot[0] * 16 + rng.int(2, 13), spot[1] * 16 + rng.int(-6, 10), { life: 240 + rng.int(0, 200), phase: rng.range(0, 6.28), vx: rng.range(-0.1, 0.1), vy: rng.range(-0.08, 0.08) });
    }
    if (this.ambient.has('motes') && this.frame % 7 === 0 && this.count('mote') < CAPS.motes) {
      this.spawn('mote', cam.x + rng.int(0, W), cam.y + rng.int(0, H), { life: 200 + rng.int(0, 160), phase: rng.range(0, 6.28), vx: rng.range(-0.06, 0.06), vy: rng.range(-0.05, 0.02) });
    }
    if (this.ambient.has('drips') && this.frame % 60 === 0 && this.count('drip') < CAPS.drips) {
      this.drip(cam.x + rng.int(16, W - 16), cam.y + rng.int(-10, 20), rng.int(80, 160));
    }
    if (this.ambient.has('embers') && this.frame % 20 === 0 && this.count('ember') < CAPS.embers && this.field.lightSources) {
      const src = this.field.lightSources.filter((l) => l.color);
      if (src.length) { const l = rng.pick(src); this.spawn('ember', l.x + rng.int(-3, 3), l.y, { vy: -0.35, vx: rng.range(-0.12, 0.12), life: 40 + rng.int(0, 20), phase: rng.range(0, 6.28) }); }
    }
    if (this.ambient.has('smoke') && this.chimneys.length && this.frame % 9 === 0 && this.count('smoke') < CAPS.smoke) {
      const vis = this.chimneys.filter((c) => c.x >= cam.x - 8 && c.x <= cam.x + W + 8 && c.y >= cam.y - 40 && c.y <= cam.y + H);
      if (vis.length) {
        const c = vis[(this.frame / 9 | 0) % vis.length];
        this.spawn('smoke', c.x + rng.int(-1, 1), c.y - 1, { vx: this.windX * rng.range(0.4, 1) , vy: -rng.range(0.22, 0.34), life: 110 + rng.int(0, 40), phase: rng.range(0, 6.28) });
      }
    }
    if (this.ambient.has('birds') && this.frame % 75 === 0 && this.count('bird') < CAPS.birds && rng.range(0, 1) < 0.6) {
      const spot = this.grassSpot(cam, 5);
      if (spot) this.spawn('bird', spot[0] * 16 + rng.int(3, 12), spot[1] * 16 + 14, { life: 900 + rng.int(0, 600), phase: rng.int(0, 40), state: 0, data: { dir: rng.range(0, 1) < 0.5 ? -1 : 1 } });
    }
    const mistN = this.ambient.has('mist') ? this.count('mist') : CAPS.mist;
    if (mistN < CAPS.mist && this.frame % (mistN < 8 ? 6 : 23) === 0) {
      const tx = cam.x + rng.int(-24, W), ty = cam.y + rng.int(0, H);
      const inArea = !this.mistAreas || this.mistAreas.some((a) => tx >= a.x * 16 && ty >= a.y * 16 && tx < (a.x + a.w) * 16 && ty < (a.y + a.h) * 16);
      if (inArea) this.spawn('mist', tx, ty, { vx: rng.range(0.06, 0.16) * (this.windX >= 0 ? 1 : -1), vy: rng.range(-0.015, 0.015), life: MIST_LIFE + rng.int(0, 200), phase: rng.range(0, 6.28), state: rng.int(0, MIST_SIZES.length - 1) });
    }
    if (this.rainIntensity > 0.02 && this.count('rain') < CAPS.rain * this.rainIntensity) {
      for (let i = 0; i < 3; i++) this.spawn('rain', cam.x + rng.int(-10, W + 10), cam.y - rng.int(0, H), { vx: -0.6, vy: 4.2, life: 90 });
    }
    // integrate
    const keep = [];
    const L = this.field.leader;
    for (const p of this.list) {
      p.t++;
      switch (p.kind) {
        case 'leaf': p.x += p.vx + Math.sin(p.phase + p.t * 0.07) * 0.4; p.y += p.vy + Math.cos(p.phase + p.t * 0.11) * 0.12; break;
        case 'firefly': p.x += p.vx + Math.sin(p.phase + p.t * 0.05) * 0.15; p.y += p.vy + Math.cos(p.phase * 1.3 + p.t * 0.04) * 0.12; break;
        case 'mote': p.x += p.vx + Math.sin(p.phase + p.t * 0.03) * 0.08; p.y += p.vy; break;
        case 'smoke': p.x += p.vx + Math.sin(p.phase + p.t * 0.05) * 0.18; p.y += p.vy; p.vy *= 0.995; break;
        case 'rain': p.x += p.vx; p.y += p.vy; if (p.y > cam.y + H + 4) p.t = p.life; break;
        case 'drip': p.vy += p.g; p.y += p.vy; if (p.data && p.y >= p.data.floor) { p.t = p.life; this.spawn('splash', p.x, p.data.floor, { life: 10 }); } break;
        case 'bird': {
          if (p.state === 0) {
            // resting: pecks, and takes off when the party comes close
            if (L && Math.abs(L.feetX - p.x) < BIRD_FLEE_PX && Math.abs(L.feetY - p.y) < BIRD_FLEE_PX) {
              p.state = 1; p.t = 0; p.life = 120;
              p.data.dir = L.feetX > p.x ? -1 : 1;
              p.vx = p.data.dir * 1.1; p.vy = -1.4;
            }
          } else { p.x += p.vx; p.y += p.vy; p.vy = Math.max(-1.6, p.vy - 0.02); p.vx *= 1.004; }
          break;
        }
        case 'sway': break;
        case 'mist': p.x += p.vx + Math.sin(p.phase + p.t * 0.01) * 0.04; p.y += p.vy; break;
        case 'page': p.x += Math.sin(p.phase + p.t * 0.09) * 0.55; p.y += p.vy; if (p.data && p.y > p.data.rim + 10) p.t = Math.max(p.t, p.life - 1); break;
        default: p.vy += p.g; p.x += p.vx; p.y += p.vy;
      }
      if (p.t < p.life && (p.kind === 'rain' || cam.visible(p.x, p.y, p.kind === 'mist' ? 56 : 2, 2, 48))) keep.push(p);
    }
    this.list = keep;
  }

  passOf(p) {
    if (p.kind === 'bird') return p.state === 0 ? 'below' : 'above';
    if (MID.has(p.kind)) return 'mid';
    return ABOVE.has(p.kind) ? 'above' : 'below';
  }

  /** Draw one pass. The field calls this under pushCamera, so positions are world pixels; `cam` only culls. */
  draw(r, cam, pass) {
    const g = r.ctx;
    const x0 = cam.x - 8, y0 = cam.y - 8, x1 = cam.x + r.W + 8, y1 = cam.y + r.H + 8;
    for (const p of this.list) {
      if (this.passOf(p) !== pass) continue;
      const x = Math.round(p.x), y = Math.round(p.y);
      if ((x < x0 || y < y0 || x > x1 || y > y1) && p.kind !== 'mist') continue;
      const k = p.t / p.life;
      switch (p.kind) {
        case 'leaf': {
          // a 3x2 leaf that tumbles: two shapes, a dark stem pixel so it reads on grass
          const f = Math.floor(p.t / 9) % 2;
          g.fillStyle = this.shaded(p.color);
          if (f === 0) { g.fillRect(x, y, 3, 1); g.fillRect(x + 1, y + 1, 2, 1); }
          else { g.fillRect(x + 1, y, 2, 1); g.fillRect(x, y + 1, 3, 1); }
          g.fillStyle = this.shaded('#5a3a1e'); g.fillRect(f === 0 ? x : x + 2, y + 1 - f, 1, 1);
          break;
        }
        case 'firefly': {
          const bright = 0.5 + 0.5 * Math.sin(p.phase + p.t * 0.12);
          if (bright < 0.3) break;
          g.globalAlpha = Math.min(1, bright) * (k < 0.1 ? k * 10 : k > 0.85 ? (1 - k) / 0.15 : 1);
          g.fillStyle = '#f2ffb0'; g.fillRect(x, y, 1, 1);
          g.globalAlpha *= 0.35; g.fillStyle = '#d8ff80'; g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3);
          g.globalAlpha = 1;
          break;
        }
        case 'mote': {
          const a = (0.35 + 0.25 * Math.sin(p.phase + p.t * 0.07)) * (k < 0.15 ? k / 0.15 : k > 0.85 ? (1 - k) / 0.15 : 1);
          g.globalAlpha = a; g.fillStyle = '#f0e6c8'; g.fillRect(x, y, 1, 1); g.globalAlpha = 1;
          break;
        }
        case 'drip': {
          // a bead of ink: dark body with a wet highlight on top
          g.fillStyle = '#1c1640'; g.fillRect(x, y, 1, 3);
          g.fillStyle = '#7a6cc8'; g.fillRect(x, y, 1, 1);
          break;
        }
        case 'splash': {
          const s = p.t < 4 ? 1 : 2;
          g.fillStyle = '#4a3f8a'; g.fillRect(x - s, y, 1, 1); g.fillRect(x + s, y, 1, 1);
          if (p.t < 5) { g.fillStyle = '#8a7cd8'; g.fillRect(x, y - 1, 1, 1); }
          break;
        }
        case 'smoke': {
          const a = (k < 0.15 ? k / 0.15 : 1) * (1 - k) * 0.78;
          const s = k < 0.3 ? 2 : 3;
          g.globalAlpha = a; g.fillStyle = this.shaded('#e6e4ee');
          g.fillRect(x, y, s, s);
          if (s === 3) { g.fillStyle = this.shaded('#aeaabd'); g.fillRect(x, y + 2, 1, 1); g.fillRect(x + 2, y, 1, 1); }
          g.globalAlpha = 1;
          break;
        }
        case 'bird': {
          const body = this.shaded('#3c2a1c'), wing = this.shaded('#5a4030'), beak = this.shaded('#e0a030');
          const d = p.data.dir;
          if (p.state === 0) {
            // resting, pecking: body 3x2, head 1 px forward, beak; head dips every so often
            const peck = (p.t + p.phase) % 40 < 6 ? 1 : 0;
            g.fillStyle = body; g.fillRect(x - 1, y - 2, 3, 2);
            g.fillStyle = wing; g.fillRect(x, y - 2, 1, 1);
            g.fillStyle = body; g.fillRect(x + d * 2, y - 3 + peck, 1, 1);
            g.fillStyle = beak; g.fillRect(x + d * 3, y - 3 + peck, 1, 1);
          } else {
            // flying: two wing frames, four frames each
            const up = Math.floor(p.t / 4) % 2 === 0;
            g.fillStyle = body; g.fillRect(x - 1, y, 3, 1); g.fillRect(x + d * 2, y, 1, 1);
            g.fillStyle = wing;
            if (up) { g.fillRect(x - 2, y - 2, 1, 1); g.fillRect(x - 1, y - 1, 1, 1); g.fillRect(x + 1, y - 1, 1, 1); g.fillRect(x + 2, y - 2, 1, 1); }
            else { g.fillRect(x - 3, y, 2, 1); g.fillRect(x + 2, y, 2, 1); }
          }
          break;
        }
        case 'sway': {
          // three blades leaning with a damped wobble, drawn over the feet row so the party wades through
          const lean = Math.round(Math.sin(p.phase + p.t * 0.75) * 2 * (1 - k));
          const hi = '#c4ea62', lo = '#5c9a32';
          for (const bx of [3, 8, 12]) {
            g.fillStyle = lo; g.fillRect(x + bx, y + 13, 1, 3);
            g.fillStyle = hi; g.fillRect(x + bx + lean, y + 11, 1, 2);
          }
          break;
        }
        case 'rain': {
          g.globalAlpha = 0.55 * this.rainIntensity; g.fillStyle = '#cfe0ff';
          g.fillRect(x, y, 1, 4); g.fillRect(x + 1, y - 2, 1, 2);
          g.globalAlpha = 1;
          break;
        }
        case 'mist': {
          const img = this.mistSprite(p.state || 0);
          if (!img || x + img.width < x0 || x > x1 || y + img.height < y0 || y > y1) break;
          g.globalAlpha = 0.55 * (k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) / 0.2 : 1);
          g.drawImage(img, x, y);
          g.globalAlpha = 1;
          break;
        }
        case 'puff': g.globalAlpha = 0.5 * (1 - k); g.fillStyle = '#e8dcc0'; g.fillRect(x - 1, y - 1, 3 - (k > 0.5 ? 1 : 0), 2); g.globalAlpha = 1; break;
        case 'page': {
          // a loose page: cream sheet with two ink lines, tumbling between a wide and an edge-on frame,
          // fading as it crosses the pit's rim
          const rim = p.data ? p.data.rim : Infinity;
          const past = Math.max(0, y - rim);
          const a = (k < 0.1 ? k * 10 : 1) * Math.max(0, 1 - past / 10);
          if (a <= 0) break;
          const edgeOn = Math.floor(p.t / 9) % 3 === 2;
          g.globalAlpha = a;
          if (edgeOn) { g.fillStyle = '#f4ecd2'; g.fillRect(x - 1, y - 3, 2, 7); }
          else {
            g.fillStyle = '#f8f1dc'; g.fillRect(x - 3, y - 3, 6, 7);
            g.fillStyle = '#cdbf9a'; g.fillRect(x + 2, y - 3, 1, 7); g.fillRect(x - 3, y + 3, 6, 1);
            g.fillStyle = '#4a3f8a'; g.fillRect(x - 2, y - 1, 4, 1); g.fillRect(x - 2, y + 1, 3, 1);
          }
          g.globalAlpha = 1;
          break;
        }
        case 'shard': g.fillStyle = p.color; g.fillRect(x, y, p.size, p.size); break;
        case 'ember': {
          g.globalAlpha = 1 - k; g.fillStyle = k < 0.5 ? '#ffd080' : '#ff8a2a'; g.fillRect(x + Math.round(Math.sin(p.phase + p.t * 0.2)), y, 1, 1); g.globalAlpha = 1;
          break;
        }
        case 'sparkle': case 'glint': {
          const s = k < 0.5 ? Math.round(k * 2 * 3) : Math.round((1 - k) * 2 * 3);
          g.fillStyle = p.color;
          g.fillRect(x, y - s, 1, s * 2 + 1); g.fillRect(x - s, y, s * 2 + 1, 1);
          if (s >= 2) { g.fillStyle = '#ffffff'; g.fillRect(x, y, 1, 1); }
          break;
        }
        default: g.fillStyle = p.color; g.fillRect(x, y, 1, 1);
      }
    }
  }
}
