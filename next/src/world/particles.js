// Field particles: ambient life per map (leaves, fireflies, dust motes, ink drips, rain) and one-shots
// (footstep puffs, sparkles, reveal glitter, pot shards). Cheap: fixed caps, no allocation per frame.
//
//   const fx = new Particles(field);
//   fx.setAmbient(['leaves', 'fireflies'])   per map (field decides from area, tint and weather)
//   fx.spawn('puff', x, y) / fx.sparkle(x, y, n) / fx.burst('shard', x, y, n)
//   fx.update(cam) ; fx.draw(r, cam, 'below' | 'above')
//
// 'below' particles sit under the overhead layer and lighting (puffs, shards, drips); 'above' particles are
// drawn last (leaves, fireflies, motes, rain, sparkles) so they stay bright in dark rooms.

const CAPS = { leaves: 18, fireflies: 16, motes: 26, drips: 5, rain: 70, embers: 10 };
const ABOVE = new Set(['leaf', 'firefly', 'mote', 'rain', 'sparkle', 'glint', 'ember']);

export class Particles {
  constructor(field) {
    this.field = field;
    this.engine = field.engine;
    this.list = [];
    this.ambient = new Set();
    this.frame = 0;
    this.rainIntensity = 0;    // 0..1 (eased toward target)
    this.rainTarget = 0;
    this.leafColors = ['#8fbf4a', '#b7d35a', '#6f9c3b', '#d8b84a'];
  }

  setAmbient(kinds) { this.ambient = new Set(kinds || []); }
  setRain(on) { this.rainTarget = on ? 1 : 0; }

  spawn(kind, x, y, o = {}) {
    const p = { kind, x, y, vx: o.vx || 0, vy: o.vy || 0, t: 0, life: o.life || 40, phase: o.phase || 0, size: o.size || 1, color: o.color || '#fff', g: o.g || 0, data: o.data || null };
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
  drip(x, y, h) { this.spawn('drip', x, y, { vy: 0.4, g: 0.08, life: 60, data: { floor: y + h } }); }

  count(kind) { let n = 0; for (const p of this.list) if (p.kind === kind) n++; return n; }

  update(cam) {
    this.frame++;
    const rng = this.field.rng;
    const W = cam.W, H = cam.H;
    this.rainIntensity += (this.rainTarget - this.rainIntensity) * 0.02;
    // ambient spawns inside (and just above) the view
    if (this.ambient.has('leaves') && this.frame % 9 === 0 && this.count('leaf') < CAPS.leaves) {
      this.spawn('leaf', cam.x + rng.int(-20, W), cam.y - 8, { vx: rng.range(0.25, 0.6), vy: rng.range(0.35, 0.65), life: 420, phase: rng.range(0, 6.28), color: rng.pick(this.leafColors) });
    }
    if (this.ambient.has('fireflies') && this.frame % 14 === 0 && this.count('firefly') < CAPS.fireflies) {
      this.spawn('firefly', cam.x + rng.int(0, W), cam.y + rng.int(0, H), { life: 240 + rng.int(0, 200), phase: rng.range(0, 6.28), vx: rng.range(-0.1, 0.1), vy: rng.range(-0.08, 0.08) });
    }
    if (this.ambient.has('motes') && this.frame % 7 === 0 && this.count('mote') < CAPS.motes) {
      this.spawn('mote', cam.x + rng.int(0, W), cam.y + rng.int(0, H), { life: 200 + rng.int(0, 160), phase: rng.range(0, 6.28), vx: rng.range(-0.06, 0.06), vy: rng.range(-0.05, 0.02) });
    }
    if (this.ambient.has('drips') && this.frame % 70 === 0 && this.count('drip') < CAPS.drips) {
      this.drip(cam.x + rng.int(16, W - 16), cam.y + rng.int(-10, 20), rng.int(80, 160));
    }
    if (this.ambient.has('embers') && this.frame % 20 === 0 && this.count('ember') < CAPS.embers && this.field.lightSources) {
      const src = this.field.lightSources.filter((l) => l.color);
      if (src.length) { const l = rng.pick(src); this.spawn('ember', l.x + rng.int(-3, 3), l.y, { vy: -0.35, vx: rng.range(-0.12, 0.12), life: 40 + rng.int(0, 20), phase: rng.range(0, 6.28) }); }
    }
    if (this.rainIntensity > 0.02 && this.count('rain') < CAPS.rain * this.rainIntensity) {
      for (let i = 0; i < 3; i++) this.spawn('rain', cam.x + rng.int(-10, W + 10), cam.y - rng.int(0, H), { vx: -0.6, vy: 4.2, life: 90 });
    }
    // integrate
    const keep = [];
    for (const p of this.list) {
      p.t++;
      switch (p.kind) {
        case 'leaf': p.x += p.vx + Math.sin(p.phase + p.t * 0.08) * 0.35; p.y += p.vy; break;
        case 'firefly': p.x += p.vx + Math.sin(p.phase + p.t * 0.05) * 0.15; p.y += p.vy + Math.cos(p.phase * 1.3 + p.t * 0.04) * 0.12; break;
        case 'mote': p.x += p.vx + Math.sin(p.phase + p.t * 0.03) * 0.08; p.y += p.vy; break;
        case 'rain': p.x += p.vx; p.y += p.vy; if (p.y > cam.y + H + 4) p.t = p.life; break;
        case 'drip': p.vy += p.g; p.y += p.vy; if (p.data && p.y >= p.data.floor) { p.t = p.life; this.spawn('splash', p.x, p.data.floor, { life: 8 }); } break;
        default: p.vy += p.g; p.x += p.vx; p.y += p.vy;
      }
      if (p.t < p.life && (p.kind === 'rain' || cam.visible(p.x, p.y, 2, 2, 48))) keep.push(p);
    }
    this.list = keep;
  }

  /** Draw one pass. The field calls this under pushCamera, so positions are world pixels; `cam` only culls. */
  draw(r, cam, pass) {
    const g = r.ctx;
    const x0 = cam.x - 4, y0 = cam.y - 4, x1 = cam.x + r.W + 4, y1 = cam.y + r.H + 4;
    for (const p of this.list) {
      const above = ABOVE.has(p.kind);
      if ((pass === 'above') !== above) continue;
      const x = Math.round(p.x), y = Math.round(p.y);
      if (x < x0 || y < y0 || x > x1 || y > y1) continue;
      const k = p.t / p.life;
      switch (p.kind) {
        case 'leaf': {
          const flip = Math.floor(p.t / 8) % 2;
          g.fillStyle = p.color; g.fillRect(x, y, 2, 1); g.fillRect(x + (flip ? 1 : 0), y + 1, 1, 1);
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
        case 'drip': g.fillStyle = '#2a2250'; g.fillRect(x, y, 1, 2); break;
        case 'splash': g.fillStyle = '#3a3270'; g.fillRect(x - 1 - (p.t >> 2), y, 1, 1); g.fillRect(x + 1 + (p.t >> 2), y, 1, 1); break;
        case 'rain': {
          g.globalAlpha = 0.55 * this.rainIntensity; g.fillStyle = '#cfe0ff';
          g.fillRect(x, y, 1, 4); g.fillRect(x + 1, y - 2, 1, 2);
          g.globalAlpha = 1;
          break;
        }
        case 'puff': g.globalAlpha = 0.5 * (1 - k); g.fillStyle = '#e8dcc0'; g.fillRect(x - 1, y - 1, 3 - (k > 0.5 ? 1 : 0), 2); g.globalAlpha = 1; break;
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
