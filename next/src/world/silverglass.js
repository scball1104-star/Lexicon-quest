// Silverglass on the field (E2-world, EPISODE2_PLAN 5.1): the beams of the Court of Mirrors, traced by the pure
// world/beam.js, drawn, lighting crystal receptors and laying glass bridges.
//
//   const glass = new Silverglass(field);
//   glass.reset()                 after the map's entities are built: scan bridges and inlays, trace quietly
//   glass.markDirty()             something a beam reads changed (entity shown / hidden, block moved, gate)
//   glass.recompute({ quiet })    trace now: bridges, receptors (gates, latch, flag, script), inlays
//   glass.update()                per frame: a dirty trace, the bridge grace rule, the first-receptor bark
//   glass.drawBeams(r, t)         after the ground layer (actors and props stand in front of the light)
//   glass.drawFlares(r, t)        after the props: bounce flares, splash stars, receptor glows, the moving glint
//   glass.lights()                light sources for dark maps (the beam is the light in F3's west wing)
//   glass.takeScript()            a receptor script waiting for a quiet moment (the field runs it)
//
// Bridges: a cell holding glass_bridge_[hv]_dim (collision pit) swaps to the _lit tile (collision none) while a
// beam crosses it, whichever way. Grace rule: a lit bridge cell with an actor on it stays lit until vacated.
// Receptors: lit while a beam arrives through their face; `latch` keeps them lit, `flag` persists the latch, `script`
// runs the first time one lights (queued until the field is idle). Inlays: a map overlay with `inlay: '<receptor>'`
// shows its `_lit` tile while that receptor is lit.

import { traceBeams, BRIDGE_IDS, BRIDGE_DIM, DIRV } from './beam.js';
import { TILE } from './tilemap.js';
import { fireTarget } from './events.js';

const BEAM_TYPES = new Set(['beam', 'mirror', 'receptor']);
/** The beam runs this many pixels above the floor (the height of a mirror's glass and a receptor's crystal). */
export const BEAM_LIFT = 6;
const CORE = '#eef6ff';
const HALO = '#8af0e8';
const HALO_DEEP = '#2ec4d0';
const MAX_BEAM_LIGHTS = 24;
const GLINT_GAP = 56;          // px between the bright pixels that travel along a beam

export class Silverglass {
  constructor(field) {
    this.f = field;
    this.clear();
  }

  clear() {
    this.active = false;
    this.result = null;
    this.lit = new Set();
    this.bridges = new Map();      // 'x,y' -> { x, y, lit, dim, litId }
    this.grace = new Set();        // lit bridge cells kept lit for an actor standing on them
    this.inlays = [];              // [{ x, y, base, litId, rec, on }]
    this.passGrid = null;
    this.dirty = false;
    this.queue = [];
    this.paths = [];               // per beam: { pts: [[x, y]...], len, end }
    this.frame = 0;
    this.stats = { traces: 0, ms: 0 };
  }

  /** The map was (re)built: find bridges and inlays, then trace without sound, barks or scripts. */
  reset() {
    this.clear();
    const f = this.f, map = f.map;
    if (!map) return;
    const mod = map.mod || {};
    this.active = (mod.events || []).some((ev) => ev && BEAM_TYPES.has(ev.type));
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      for (const id of map.idsAt(x, y)) {
        if (BRIDGE_IDS[id]) this.bridges.set(`${x},${y}`, { x, y, lit: false, dim: id, litId: BRIDGE_IDS[id] });
        else if (BRIDGE_DIM[id]) this.bridges.set(`${x},${y}`, { x, y, lit: true, dim: BRIDGE_DIM[id], litId: id });
      }
    }
    for (const o of mod.overlays || []) {
      if (!o || !o.inlay) continue;
      const base = String(o.t).replace(/_lit$/, '');
      const litId = `${base}_lit`;
      if (!map.db.tiles[litId] || !map.db.tiles[base]) continue;
      this.inlays.push({ x: o.x, y: o.y, base, litId, rec: o.inlay, on: o.t === litId });
    }
    if (!this.active && !this.bridges.size) return;
    this.active = true;
    this.buildPassGrid();
    this.recompute({ quiet: true });
    // latched receptors (flag set) start lit: their gates open now, quietly
    for (const ent of f.entities.values()) {
      if (ent.present && ent.type === 'receptor' && ent.state === 'lit') for (const t of targetsOf(ent.ev)) fireTarget(f, t, { quiet: true });
    }
    this.dirty = false;
  }

  buildPassGrid() {
    const map = this.f.map, T = map.db.tiles || {};
    const g = new Uint8Array(map.w * map.h);
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      for (const id of map.idsAt(x, y)) if (T[id] && T[id].beam === 'pass') { g[y * map.w + x] = 1; break; }
    }
    this.passGrid = g;
  }

  markDirty() { if (this.active) this.dirty = true; }
  isBridge(x, y) { return this.bridges.has(`${x},${y}`); }
  litAt(x, y) { return this.lit.has(`${x},${y}`); }

  /** Present beam parts as beam.js wants them. */
  parts() {
    const sources = [], mirrors = [], receptors = [];
    for (const ent of this.f.entities.values()) {
      if (!ent.present || (ent.data && ent.data.concealed)) continue;
      if (ent.type === 'beam') sources.push({ id: ent.id, x: ent.x, y: ent.y, dir: ent.ev.dir || 'down' });
      else if (ent.type === 'mirror') mirrors.push({ id: ent.id, x: ent.x, y: ent.y, state: ent.state ? 1 : 0 });
      else if (ent.type === 'receptor') receptors.push({ id: ent.id, x: ent.x, y: ent.y, face: ent.ev.face || null });
    }
    return { sources, mirrors, receptors };
  }

  /** Trace every beam now and apply what it lights. o.quiet: map load (no sounds, barks or scripts). */
  recompute(o = {}) {
    const f = this.f, map = f.map;
    if (!map || !this.active) return null;
    this.dirty = false;
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    const W = map.w;
    const res = traceBeams({
      w: map.w, h: map.h,
      code: (x, y) => map.codeAt(x, y),
      pass: (x, y) => !!(this.passGrid && this.passGrid[y * W + x]),
      ...this.parts(),
    });
    this.result = res;
    this.lit = res.lit;
    this.paths = res.beams.map(polyline);
    // bridges
    let lightened = false;
    for (const [k, b] of this.bridges) {
      const want = res.lit.has(k);
      if (want) {
        this.grace.delete(k);
        if (!b.lit) { this.setBridge(b, true); lightened = true; }
      } else if (b.lit) {
        if (this.occupied(b.x, b.y)) this.grace.add(k);
        else this.setBridge(b, false);
      }
    }
    if (lightened && !o.quiet) {
      f.engine.audio.sfx('glass_bridge');
      f.bark('first_glass_bridge');
    }
    // receptors
    for (const ent of f.entities.values()) {
      if (!ent.present || ent.type !== 'receptor') continue;
      const want = res.litReceptors.has(ent.id) || !!ent.data.latched;
      if (want !== (ent.state === 'lit')) this.setReceptor(ent, want, o);
    }
    this.syncInlays();
    if (t0) { this.stats.traces++; this.stats.ms = Math.round((performance.now() - t0) * 1000) / 1000; }
    return res;
  }

  setBridge(b, on) {
    const map = this.f.map;
    if (on) map.replaceTile(b.x, b.y, b.dim, b.litId);
    else map.replaceTile(b.x, b.y, b.litId, b.dim);
    b.lit = on;
  }

  /** Is anyone (party, NPC, enemy, scripted actor) on this tile or stepping off it? */
  occupied(x, y) { return !!this.f.actorAt(x, y, null, true); }

  setReceptor(ent, on, o = {}) {
    const f = this.f, ev = ent.ev;
    ent.state = on ? 'lit' : 'dark';
    if (ent.prop) f.map.setPropState(ent.prop, on ? 1 : 0);
    if (on) {
      const first = !ent.data.everLit;
      ent.data.everLit = true;
      if (ev.latch) ent.data.latched = true;
      const flagWasSet = !!(ev.flag && f.hasFlag(ev.flag));
      if (ev.flag && !flagWasSet && (ev.latch || ev.flag)) f.setFlag(ev.flag);
      if (!o.quiet) {
        f.engine.audio.sfx('beam_hit');
        if (f.particles) f.particles.sparkle(ent.x * TILE + 8, ent.y * TILE - 4, 6, '#e8fffb');
        if (ev.script && first && !flagWasSet) this.queue.push(ev.script);
      }
    }
    for (const t of targetsOf(ev)) fireTarget(f, t, { quiet: !!o.quiet });
  }

  syncInlays() {
    if (!this.inlays.length) return;
    const f = this.f, map = f.map;
    for (const s of this.inlays) {
      const rec = f.entities.get(s.rec);
      const want = !!(rec && rec.present && rec.state === 'lit');
      if (want === s.on) continue;
      if (map.replaceTile(s.x, s.y, want ? s.base : s.litId, want ? s.litId : s.base)) s.on = want;
    }
  }

  /** A receptor script waiting for a quiet moment, or null. */
  takeScript() { return this.queue.length ? this.queue.shift() : null; }

  update() {
    if (!this.active) return;
    this.frame++;
    if (this.dirty) this.recompute();
    if (this.grace.size) {
      for (const k of [...this.grace]) {
        const b = this.bridges.get(k);
        if (!b || this.lit.has(k)) { this.grace.delete(k); continue; }
        if (!this.occupied(b.x, b.y)) { this.setBridge(b, false); this.grace.delete(k); }
      }
    }
    // the first receptor the party sees on screen earns Mira's remark (once per save)
    const f = this.f;
    if (this.frame % 30 === 0 && f.camera && !(f.game.counters && f.game.counters['bark:first_receptor'])) {
      for (const ent of f.entities.values()) {
        if (!ent.present || ent.type !== 'receptor') continue;
        if (f.camera.visible(ent.x * TILE, ent.y * TILE - 16, 16, 32, -16)) { f.bark('first_receptor'); break; }
      }
    }
    // a little shimmer where the light bends
    if (f.particles && this.result && this.frame % 40 === 0 && !(f.engine.settings && f.engine.settings.reduceMotion)) {
      const list = this.result.bounces;
      if (list.length) {
        const b = list[(this.frame / 40 | 0) % list.length];
        f.particles.sparkle(b.x * TILE + 8, b.y * TILE + 8 - BEAM_LIFT, 1, '#e8fffb');
      }
    }
  }

  // ------------------------------------------------------------------ drawing
  /** The beams: a 2 px core with a dithered cyan halo, along the lifted tile centres. */
  drawBeams(r, t) {
    if (!this.active || !this.paths.length) return;
    const shimmer = !(this.f.engine.settings && this.f.engine.settings.reduceMotion);
    const phase = shimmer ? (this.frame >> 2) & 1 : 0;
    for (const p of this.paths) {
      const pts = p.pts;
      for (let i = 1; i < pts.length; i++) segment(r, pts[i - 1], pts[i], phase);
    }
  }

  /** Over the props: bounce flares, splash stars, glowing receptors and the bright pixels that run the beams. */
  drawFlares(r, t) {
    if (!this.active || !this.result) return;
    const f = this.f;
    const motion = !(f.engine.settings && f.engine.settings.reduceMotion);
    const pulse = motion ? (this.frame >> 3) & 3 : 1;
    for (const b of this.result.bounces) star(r, b.x * TILE + 8, b.y * TILE + 8 - BEAM_LIFT, pulse === 0 ? 1 : 2);
    for (const p of this.paths) {
      if (p.end && p.end.kind === 'splash') splash(r, p.endPt[0], p.endPt[1], p.end.dir, pulse);
      if (motion && p.len > 8) {
        for (let d = (this.frame * 1.5) % GLINT_GAP; d < p.len; d += GLINT_GAP) {
          const [x, y] = pointAt(p, d);
          r.rect(x - 1, y - 1, 2, 2, '#ffffff');
        }
      }
    }
    for (const ent of f.entities.values()) {
      if (!ent.present || ent.type !== 'receptor' || ent.state !== 'lit') continue;
      const cx = ent.x * TILE + 8, cy = ent.y * TILE - 5;
      const k = motion ? 0.25 + 0.1 * Math.sin(this.frame * 0.08) : 0.3;
      r.withAlpha(k, () => r.ditherEllipse(cx, cy, 9, 8, HALO, 0.5));
      r.withAlpha(0.8, () => r.rect(cx - 1, cy - 1, 2, 2, '#ffffff'));
    }
  }

  /** Light sources: in dark maps a small neutral light on every second lit cell (at most 24) and each lit receptor. */
  lights() {
    const out = [];
    if (!this.active || !this.paths.length) return out;
    const dark = this.f.lighting && this.f.lighting.dark > 0.01;
    if (!dark) return out;
    let n = 0;
    for (const p of this.paths) {
      for (let d = 8; d < p.len && n < MAX_BEAM_LIGHTS; d += 32) {
        const [x, y] = pointAt(p, d);
        out.push({ x, y, r: 18, color: null, kind: 'neutral', beam: true });
        n++;
      }
    }
    for (const ent of this.f.entities.values()) {
      if (ent.present && ent.type === 'receptor' && ent.state === 'lit') out.push({ x: ent.x * TILE + 8, y: ent.y * TILE - 4, r: 34, color: null, kind: 'neutral', beam: true });
    }
    return out;
  }

  debugState() {
    if (!this.active) return { active: false };
    const res = this.result;
    return {
      active: true,
      beams: res ? res.beams.map((b) => ({ id: b.id, cells: b.cells.length, end: b.end })) : [],
      lit: res ? res.lit.size : 0,
      litReceptors: res ? [...res.litReceptors] : [],
      receptors: [...this.f.entities.values()].filter((e) => e.present && e.type === 'receptor').map((e) => `${e.id}:${e.state}`),
      mirrors: [...this.f.entities.values()].filter((e) => e.present && e.type === 'mirror').map((e) => `${e.id}@${e.x},${e.y}:${e.state}`),
      bridges: [...this.bridges.values()].map((b) => `${b.x},${b.y}:${b.lit ? 'lit' : 'dim'}`),
      grace: [...this.grace], queue: [...this.queue], traceMs: this.stats.ms,
    };
  }
}

function targetsOf(ev) { return ev.target == null ? [] : Array.isArray(ev.target) ? ev.target : [ev.target]; }

/** The world-pixel point a beam passes through in a cell: the tile centre, lifted to glass height. */
export function beamPoint(x, y) { return [x * TILE + 8, y * TILE + 8 - BEAM_LIFT]; }

/**
 * A traced beam as a polyline in world pixels: the source centre, every turn, then the end (a receptor's centre,
 * or the edge of the last open cell where it meets the wall).
 */
export function polyline(beam) {
  const cells = beam.cells;
  const pts = [];
  if (!cells.length) return { pts, len: 0, end: beam.end, endPt: null };
  pts.push(beamPoint(cells[0].x, cells[0].y));
  for (let i = 1; i < cells.length; i++) {
    const c = cells[i];
    if (c.to && c.from && DIRV[c.to] && (DIRV[c.to][0] !== -DIRV[c.from][0] || DIRV[c.to][1] !== -DIRV[c.from][1])) pts.push(beamPoint(c.x, c.y));
  }
  const last = cells[cells.length - 1];
  const end = beam.end;
  let endPt = beamPoint(last.x, last.y);
  if (end && end.kind === 'splash' && DIRV[end.dir]) {
    const [px, py] = beamPoint(end.x, end.y);
    endPt = [px + DIRV[end.dir][0] * 8, py + DIRV[end.dir][1] * 8];
  }
  const lastPt = pts[pts.length - 1];
  if (lastPt[0] !== endPt[0] || lastPt[1] !== endPt[1]) pts.push(endPt);
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]);
  return { pts, len, end, endPt };
}

/** The point `d` px along a polyline. */
export function pointAt(p, d) {
  const pts = p.pts;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const seg = Math.abs(x1 - x0) + Math.abs(y1 - y0);
    if (d <= seg) {
      const k = seg ? d / seg : 0;
      return [Math.round(x0 + (x1 - x0) * k), Math.round(y0 + (y1 - y0) * k)];
    }
    d -= seg;
  }
  return pts[pts.length - 1];
}

function segment(r, a, b, phase) {
  const [x0, y0] = a, [x1, y1] = b;
  if (y0 === y1) {
    const x = Math.min(x0, x1), w = Math.abs(x1 - x0) + 1;
    r.dither(x, y0 - 2, w, 1, phase ? HALO_DEEP : HALO, 0.5);
    r.dither(x, y0 + 1, w, 1, phase ? HALO : HALO_DEEP, 0.5);
    r.rect(x, y0 - 1, w, 2, CORE);
  } else {
    const y = Math.min(y0, y1), h = Math.abs(y1 - y0) + 1;
    r.dither(x0 - 2, y, 1, h, phase ? HALO_DEEP : HALO, 0.5);
    r.dither(x0 + 1, y, 1, h, phase ? HALO : HALO_DEEP, 0.5);
    r.rect(x0 - 1, y, 2, h, CORE);
  }
}

/** A small four-point star (bounce flare). size 1 or 2. */
function star(r, x, y, size) {
  r.withAlpha(0.35, () => r.ditherEllipse(x, y, 4 + size, 4 + size, HALO, 0.5));
  r.rect(x - size - 1, y, size * 2 + 3, 1, '#ffffff');
  r.rect(x, y - size - 1, 1, size * 2 + 3, '#ffffff');
  r.rect(x - 1, y - 1, 3, 3, CORE);
}

/** Where a beam meets a wall: a flattened burst on the wall side. */
function splash(r, x, y, dir, pulse) {
  const s = 2 + (pulse & 1);
  r.withAlpha(0.4, () => r.ditherEllipse(x, y, 5, 5, HALO, 0.5));
  if (dir === 'left' || dir === 'right') {
    r.rect(x, y - s - 1, 1, s * 2 + 2, CORE);
    r.rect(x - (dir === 'right' ? 2 : -2), y - 1, 1, 2, '#ffffff');
  } else {
    r.rect(x - s - 1, y, s * 2 + 2, 1, CORE);
    r.rect(x - 1, y - (dir === 'down' ? 2 : -2), 2, 1, '#ffffff');
  }
  r.rect(x, y, 1, 1, '#ffffff');
}
