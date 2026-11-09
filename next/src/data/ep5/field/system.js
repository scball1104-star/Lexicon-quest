// Sun and shade on the field (E5-world, docs/EPISODE5_PLAN.md 5.1): the light a map's `shade` block declares, its sundials,
// standing stones, windows, lamp carts and sun plates. The rule itself is the pure ./shade.js; ./events.js attaches this to a
// field (field.shade) and registers the event types. Never in the first download (the ep5 pack).
//
//   const s = new Shade(field);
//   s.reset()              after the map's entities are built: the start hour, saved latches, a quiet apply, the sky link
//   s.update()             per frame: the hour sweep, a re-apply when a gate or a stone moved, barks, plate scenes
//   s.chooseHour(ent)      a dial was confirmed: Dawn / Noon / Dusk by name (async)
//   s.setHour(h, o)        set the hour now: the 30-frame sweep, then the pan to far sand that changed (async)
//   s.shoveWith(ab, c)     Bram's Shove on a stone or lamp (FieldAbilities wraps to this); s.pushCaster for `push: true`
//   s.drawLow(r, t)        after the ground, under the actors: grooves, running sand, window shafts, the shade layer
//   s.lights()             lamp pools (always) and window shafts (dark maps) for Lighting
//
// Collision: one override per cell (map.base), re-applied whenever the map recomputes that cell: running sand is `water`
// (impassable, never solid-looking). Casters, lamps and dials are solid props. State: the hour resets to the block's `hour`
// on every arrival and stones and lamps stand on their authored cells again (the entities are rebuilt); latched plates live
// in game.opened and their flag. No new save field.

import { compile, light, runMask, plates as platesOf, latches, grooveNext, isHourFlag, hourFlag, tintForHour, DIAL_HOURS, HOURS, SUN } from './shade.js';
import { a2Quarters, QUARTERS, QUARTER_OFFSET } from '../../../world/autotile.js';
import { TILE } from '../../../world/tilemap.js';
import { fireTarget, refreshEntities, entitiesAt } from '../../../world/events.js';
import { markOpened, isOpened, count, setPosition } from '../../../game/state.js';
import { inspectBoxes, tintFor } from '../../../game/story.js';
import { DIRS } from '../../../world/pathfind.js';
import { setFieldHour } from '../sky.js';
import { ensureArt, paintRunTile, paintRunEdges, paintRunEdgeSet, paintShadeTile, paintShadeCell, paintRut, SHADE, SHADE_PAVE } from './art.js';

export const SWEEP_FRAMES = 30;
export const FAR_TILES = 6;
/** The pack's noon tint (world.js sets `id` to 'desert_noon' when it keeps that tint). */
export const NOON_TINT = { id: 'none' };
/**
 * Dawn under the open sky: a rose light about as strong as the dusk tint, warm where dusk is violet, so choosing Dawn changes
 * the screen and not only the shadows (CRITIQUE_7 item 6, PLAYTEST_REVIEW_7 item 6). Roofed floors keep the core `dawn`.
 * Registered on TINTS by ./events.js; measured in qa/world/ep5_lab.py (case `tint`) and qa/world/ep5_fixes.py (case hours).
 */
export const DAWN_TINT = { id: 'sun_dawn', spec: { color: '#ff9fb4', alpha: 0.34, glow: '#ffc2b0', glowAlpha: 0.035 } };
/** Pack tints and the hour each stands for (the battle sky's field hour, the foe lift, lamps). */
export const TINT_HOURS = { sun_dawn: 'dawn', sea_night: 'night', desert_noon: 'noon' };
const CAP = { dawn: 'Dawn', noon: 'Noon', dusk: 'Dusk' };
const SHADE_ENT = new Set(['standstone', 'lampcart', 'sundial', 'window', 'sunplate']);
const NB4 = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] };
const NB8 = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0], NE: [1, -1], NW: [-1, -1], SE: [1, 1], SW: [-1, 1] };
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const isWall = (c) => c === 'solid' || c === 'void';
const round3 = (v) => Math.round(v * 1000) / 1000;

/** The hour the battle sky reads for a map: its shade hour, an Episode 5 map's tint, else null (plan 5.1 item 4). */
export function fieldHourFor(mod, model, hasFlag) {
  if (!mod) return null;
  if (model && mod.shade) return model.hour;
  if (!/^ep5_/.test(mod.id || '')) return null;
  const t0 = tintFor(mod.id, (mod.lighting || {}).tint, hasFlag || (() => false)), t = TINT_HOURS[t0] || t0;
  return t === 'dawn' || t === 'dusk' || t === 'night' ? t : 'noon';
}

export class Shade {
  constructor(field) { this.f = field; this.clear(); }

  clear() {
    this.active = false;
    this.m = null;
    this.mapRef = null;
    this.hour = null;
    this.latched = new Set();
    this.over = new Set();          // cell indices forced to `water` on map.base
    this.wallSolid = null;          // Uint8Array: the map's own solid cells (before this system's overrides)
    this.L = null;                  // the current light() result
    this.target = null;             // { run, shade }: what the rule says now
    this.shownRun = null;           // what is drawn now (lags the rule during a sweep)
    this.shownShade = null;
    this.shownRoot = null;          // the roots of the stones' sun shadows (drawn one step darker)
    this.layerRoot = null;
    this.beamShown = null;
    this.anim = null;
    this.layers = null;             // three running-sand frames
    this.shadeLayer = null;
    this.tex = null;                // the code-drawn running-sand texture (when the A1 terrain is missing)
    this.ruts = [];                 // groove cells whose ground has no rut art: [{ x, y, v }]
    this.queue = [];                // plate scenes waiting for a quiet moment
    this.sig = '';
    this.frame = 0;
    this.lastCell = -1;
    this.busy = false;
    this.tintPending = false;
    this.refusals = 0;
    this.lastChange = null;         // debug: { at, run, hold, far }
    this.stats = { applies: 0, ms: 0, maxMs: 0, updateMs: 0, maxUpdateMs: 0, paintMs: 0, sweepMs: 0 };
  }

  get map() { return this.f.map; }
  get mod() { return this.f.map && this.f.map.mod; }
  get still() { const s = this.f.engine.settings; return !!(s && s.reduceMotion); }

  /** The map was (re)built: the start hour, saved latches, the overrides, a quiet apply, the sky link. */
  reset() {
    this.clear();
    const f = this.f, map = f.map;
    if (!map || !map.mod) { setFieldHour(null); return; }
    const m = compile(map.mod);
    setFieldHour(fieldHourFor(map.mod, m, f.hasFlag));
    if (!m) return;
    this.m = m;
    this.mapRef = map;
    this.active = true;
    this.hour = m.hour;
    ensureArt(map.db, f.engine, map);
    const g = f.game;
    for (const p of m.plates) if ((p.ev.flag && g.flags[p.ev.flag]) || (p.latch && isOpened(g, map.id, p.id))) this.latched.add(p.id);
    this.wallSolid = new Uint8Array(m.N);
    for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) if (isWall(map.base[y] && map.base[y][x])) this.wallSolid[y * m.W + x] = 1;
    this.wrapMap(map);
    this.buildRuts();
    this.tintPending = m.tintFollows && !f.tintOverride;
    this.apply({ quiet: true });
    if (map.hasFlag !== f.hasFlag) map.hasFlag = f.hasFlag;
    refreshEntities(f);
    if (map.gated && (map.gated.length || map.gatedOverhead.length)) map.refreshGated(f.hasFlag);
    this.rescue();
    this.sig = this.signature();
    this.lastCell = f.leader ? f.leader.ty * m.W + f.leader.tx : -1;
  }

  /** map.recomputeCell keeps this system's override on the cell, and the wall record follows the map's own code. */
  wrapMap(map) {
    if (map.recomputeCell.ep5) return;
    const orig = map.recomputeCell.bind(map), self = this;
    const w = function (x, y) {
      orig(x, y);
      if (self.f.map !== map || !self.active) return;
      const i = y * map.w + x;
      self.wallSolid[i] = isWall(map.base[y][x]) ? 1 : 0;
      if (self.over.has(i)) map.base[y][x] = 'water';
    };
    w.ep5 = true;
    w.ep4 = orig.ep4;
    map.recomputeCell = w;
  }

  /** Groove cells from the shade block's rows whose ground tile is not a groove: the rut is drawn in code. */
  buildRuts() {
    const m = this.m, mod = this.mod, legend = mod.legend || {};
    for (let i = 0; i < m.N; i++) {
      if (!m.groove[i]) continue;
      const x = i % m.W, y = (i / m.W) | 0;
      const id = legend[(mod.ground[y] || '')[x]];
      if (id && /^groove/.test(id)) continue;
      const v = (y > 0 && m.groove[i - m.W]) || (y < m.H - 1 && m.groove[i + m.W]);
      this.ruts.push({ x, y, v: !!v });
    }
  }

  // ------------------------------------------------------------------ state
  positions() {
    const out = {};
    for (const r of [...this.m.casters, ...this.m.lamps]) { const e = this.f.entities.get(r.id); if (e) out[r.id] = e.y * this.m.W + e.x; }
    return out;
  }
  absent() {
    const out = new Set();
    for (const e of this.f.entities.values()) if (SHADE_ENT.has(e.type) && !e.present) out.add(e.id);
    return out;
  }
  /** The map's own walls plus every closed gate and locked door: what stops light besides casters, lamps and dials. */
  stopper() {
    const s = new Uint8Array(this.wallSolid), W = this.m.W;
    for (const e of this.f.entities.values()) {
      if ((e.type !== 'gate' && e.type !== 'locked_door') || !e.present || e.state === 'open') continue;
      for (const [x, y] of e.cells) if (x >= 0 && y >= 0 && x < W && y < this.m.H) s[y * W + x] = 1;
    }
    return s;
  }
  state(extra) { return { hour: this.hour, pos: this.positions(), absent: this.absent(), solid: this.stopper(), latched: this.latched, ...(extra || {}) }; }

  /** What moves light besides an hour: stone and lamp cells, shade things appearing, gates opening or closing. */
  signature() {
    let s = '';
    for (const e of this.f.entities.values()) {
      if (SHADE_ENT.has(e.type)) s += `${e.id}${e.present ? 1 : 0}${e.x},${e.y}|`;
      else if (e.type === 'gate' || e.type === 'locked_door') s += `${e.id}${e.present && e.state !== 'open' ? 1 : 0}|`;
    }
    return s;
  }

  /** Shade drawn: every cell in a shadow that nothing lights, and on an open-sky map under the sun, every roofed cell. */
  shadeMask(L) {
    const m = this.m, out = new Uint8Array(m.N), sunUp = !!SUN[L.hour] && m.openSky;
    for (let i = 0; i < m.N; i++) {
      if (L.lit[i] || this.wallSolid[i]) continue;
      if (L.shadow[i] || (sunUp && m.roof[i])) out[i] = 1;
    }
    return out;
  }

  // ------------------------------------------------------------------ apply
  /**
   * Apply the rule now: latches (permanent), collision overrides, plates and the gates they open, dial and window frames,
   * and what to draw. o.quiet: map load (no sound, no animation). o.sweep: { L, run, shade } of the hour before (animate).
   * o.sounds: a stone moved (the sand's sounds, no sweep).
   */
  apply(o = {}) {
    if (!this.active) return null;
    const t0 = now();
    const f = this.f, map = this.map, m = this.m, g = f.game, mod = this.mod;
    const st = this.state();
    const L = light(mod, st);
    const run = runMask(mod, st, L);
    const fresh = latches(mod, st, L);
    for (const id of fresh) this.latched.add(id);
    // collision
    const was = this.target ? this.target.run : null;
    for (const i of [...this.over]) if (!run[i]) { this.over.delete(i); map.recomputeCell(i % m.W, (i / m.W) | 0); }
    for (let i = 0; i < m.N; i++) if (run[i]) { this.over.add(i); map.base[(i / m.W) | 0][i % m.W] = 'water'; }
    // plates and their gates
    for (const p of platesOf(mod, { ...st, latched: this.latched }, L)) this.setPlate(p, fresh.includes(p.id), o);
    // frames
    this.setFrames(o.sweep ? null : L);
    this.L = L;
    this.target = { run, shade: this.shadeMask(L) };
    const ms = now() - t0;
    this.stats.applies++; this.stats.ms = round3(ms); this.stats.maxMs = Math.max(this.stats.maxMs, this.stats.ms);
    let nRun = 0, nHold = 0;
    if (was) for (let i = 0; i < m.N; i++) if (was[i] !== run[i]) { if (run[i]) nRun++; else nHold++; }
    this.lastChange = { run: nRun, hold: nHold };
    // drawing
    const p0 = now();
    if (o.sweep && !o.quiet && !this.still && this.shownRun) this.startSweep(o.sweep);
    else {
      this.finishAnim();
      this.show(run, this.target.shade, L.beam);
      if (o.sounds && !o.quiet) { if (nRun) f.engine.audio.sfx('sand_run'); else if (nHold) f.engine.audio.sfx('sand_hold'); }
    }
    this.stats.paintMs = round3(now() - p0);
    return L;
  }

  /** A plate's state, frame, gate and latch. */
  setPlate(p, freshLatch, o) {
    const f = this.f, ent = f.entities.get(p.id);
    if (!ent || !ent.present) return;
    const want = p.on ? 'on' : 'off';
    const glyph = (ent.ev.when === 'shade' ? 2 : 0) + (p.on ? 1 : 0);
    if (ent.prop && ent.prop.state !== glyph) f.map.setPropState(ent.prop, glyph);
    if (ent.state === want) return;
    const first = !ent.data.everOn && want === 'on';
    ent.state = want;
    if (want === 'on') ent.data.everOn = true;
    const ev = ent.ev, g = f.game;
    if (want === 'on' && (freshLatch || (ev.latch && !isOpened(g, f.map.id, ent.id)))) markOpened(g, f.map.id, ent.id);
    const flagWasSet = !!(ev.flag && f.hasFlag(ev.flag));
    if (want === 'on' && ev.flag && !flagWasSet) f.setFlag(ev.flag);
    for (const t of targetsOf(ev)) fireTarget(f, t, { quiet: !!o.quiet });
    if (o.quiet || want !== 'on') return;
    f.engine.audio.sfx('switch_on');
    if (f.particles) f.particles.sparkle(ent.x * TILE + 8, ent.y * TILE + 4, 6, ev.when === 'shade' ? '#cbb0ff' : '#ffe08a');
    if (ev.script && first && !flagWasSet) this.queue.push(ev.script);
  }

  /** Dials show the hour; windows show lit or dark (null: leave them, the sweep sets them). */
  setFrames(L) {
    const f = this.f, map = f.map, k = Math.max(0, DIAL_HOURS.indexOf(this.hour));
    for (const d of this.m.dials) { const e = f.entities.get(d.id); if (e && e.prop && e.prop.state !== k) map.setPropState(e.prop, k); }
    if (!L) return;
    for (const w of this.m.windows) {
      const e = f.entities.get(w.id);
      const on = w.hours.has(this.hour) ? 1 : 0;
      if (e && e.prop && e.prop.state !== on) map.setPropState(e.prop, on);
    }
  }
  setWindowFrames(hour) {
    const f = this.f;
    for (const w of this.m.windows) { const e = f.entities.get(w.id); const on = w.hours.has(hour) ? 1 : 0; if (e && e.prop && e.prop.state !== on) f.map.setPropState(e.prop, on); }
  }

  /** The party stands on sand that runs at this map's start hour (a save made on a shadow): to the nearest safe cell. */
  rescue() {
    const f = this.f, L = f.leader, m = this.m;
    if (!L || !this.target) return false;
    const i0 = L.ty * m.W + L.tx;
    if (!this.target.run[i0]) return false;
    const seen = new Set([i0]), q = [i0];
    while (q.length) {
      const i = q.shift(), x = i % m.W, y = (i / m.W) | 0;
      if (!this.target.run[i] && f.map.codeAt(x, y) === 'none') {
        setPosition(f.game, f.map.id, x, y, L.dir);
        if (typeof f.rebuildParty === 'function') f.rebuildParty(x, y, L.dir);
        else { L.tx = x; L.ty = y; }
        if (f.camera && f.camera.snapTo && f.leader) f.camera.snapTo(f.leader);
        return true;
      }
      for (const [dx, dy] of Object.values(NB4)) {
        const nx = x + dx, ny = y + dy, j = ny * m.W + nx;
        if (nx < 0 || ny < 0 || nx >= m.W || ny >= m.H || seen.has(j) || this.wallSolid[j]) continue;
        seen.add(j); q.push(j);
      }
    }
    return false;
  }

  // ------------------------------------------------------------------ the hour
  hourTint() {
    const t = tintForHour(this.hour, NOON_TINT.id, this.m.openSky ? DAWN_TINT.id : 'dawn');
    if (t) return t;
    const mod = this.mod;
    return tintFor(mod.id, (mod.lighting || {}).tint, this.f.hasFlag) || 'none';
  }
  applyTint(frames = 0) {
    if (!this.active || !this.m.tintFollows || !this.f.lighting) return;
    const want = this.hourTint();
    if (this.f.lighting.tintName !== want) this.f.lighting.setTint(want, frames);
  }

  /** Confirm on a dial: the gnomon check, then the hour by name (the current one marked and under the cursor). */
  async chooseHour(ent) {
    const f = this.f, e = f.engine, g = f.game, ev = ent.ev;
    if (!this.active || this.busy) return false;
    if (!ev.free && count(g, 'gnomon') <= 0) {
      e.audio.sfx('door_locked');
      if (ent.prop) { ent.prop.offX = 1; e.after(3, () => { if (ent.prop) ent.prop.offX = 0; }); }
      if (ev.lockedText) await f.showBoxes(inspectBoxes(ev.lockedText, f.hasFlag));
      else await f.showBoxes([{ who: null, text: "A brass socket at the dial's heart, empty. Something must fit there." }]);
      return false;
    }
    const cur = DIAL_HOURS.indexOf(this.hour);
    const labels = DIAL_HOURS.map((h, k) => (k === cur ? `${CAP[h]} (now)` : CAP[h]));
    if (cur < 0) labels.push('Leave it');
    let pick;
    if (e.hasScene && e.hasScene('choice') && e.pushAwait) pick = await e.pushAwait('choice', { options: labels, index: Math.max(0, cur), cancel: cur >= 0 ? cur : labels.length - 1 });
    else pick = await f.choice(labels);
    if (f.dead || typeof pick !== 'number' || pick === cur || pick >= DIAL_HOURS.length) return false;
    return this.setHour(DIAL_HOURS[pick], { origin: [ent.x, ent.y] });
  }

  /**
   * Set the hour: `sun_dial`, every dial's face, the 30-frame sweep (shadows shrink to their casters and grow again the other
   * way, the tint cross-fades, sand switches as the shadow passes), then the pan to far sand that changed. Input is held for
   * the sweep only; under reduceMotion it is instant. Resolves true when the hour changed.
   */
  async setHour(h, o = {}) {
    const f = this.f, e = f.engine;
    if (!this.active || this.busy || h === this.hour || !HOURS.includes(h)) return false;
    this.busy = true;
    f.lockInput();
    const before = this.target.run;
    try {
      const from = { L: this.L, run: this.target.run, shade: this.target.shade, hour: this.hour };
      this.hour = h;
      e.audio.sfx('sun_dial');
      this.applyTint(this.still ? 0 : SWEEP_FRAMES);
      const t0 = now();
      this.apply({ sweep: from, origin: o.origin || null });
      this.stats.sweepMs = round3(now() - t0);
      setFieldHour(h);
      refreshEntities(f);
      if (this.map.gated && (this.map.gated.length || this.map.gatedOverhead.length)) this.map.refreshGated(f.hasFlag);
      this.snapFollowers();
      this.sig = this.signature();
      await this.settled();
    } finally { f.unlockInput(); this.busy = false; }
    const far = this.farChanges(before, this.target.run);
    if (this.lastChange) this.lastChange.far = far ? far.length : 0;
    if (far && !f.dead) await this.reveal(far);
    return true;
  }

  /** Followers left standing on sand that now runs fall in on the leader's cell (they walk out with the leader). */
  snapFollowers() {
    const f = this.f, m = this.m, L = f.leader;
    if (!L || !f.followers) return;
    for (const a of f.followers) if (a && this.target.run[a.ty * m.W + a.tx] && typeof a.setPos === 'function') a.setPos(L.tx, L.ty, a.dir);
  }

  /** Changed sand far from the party and off screen (null if none): plan 5.1, PLAYTEST_REVIEW_6 fix 6. */
  farChanges(before, after) {
    const f = this.f, m = this.m, L = f.leader, cam = f.camera;
    if (!before || !after || !L) return null;
    const out = [];
    for (let i = 0; i < m.N; i++) {
      if (before[i] === after[i]) continue;
      const x = i % m.W, y = (i / m.W) | 0;
      if (Math.abs(x - L.tx) + Math.abs(y - L.ty) <= FAR_TILES) continue;
      if (cam && cam.visible && cam.visible(x * TILE, y * TILE, TILE, TILE, -8)) continue;
      out.push(i);
    }
    return out.length ? out : null;
  }

  /** Pan to the far change (the changed cell nearest its centre), hold (confirm skips), sparkle it, come back. */
  async reveal(cells) {
    const f = this.f, e = f.engine, cam = f.camera, m = this.m;
    if (!cam || !cam.panTo || !cam.returnTo || this.revealing) return;
    this.revealing = true;
    f.lockInput();
    try {
      let sx = 0, sy = 0;
      for (const i of cells) { sx += i % m.W; sy += (i / m.W) | 0; }
      const cx = sx / cells.length, cy = sy / cells.length;
      let best = cells[0], bd = Infinity;
      for (const i of cells) { const d = Math.abs((i % m.W) - cx) + Math.abs(((i / m.W) | 0) - cy); if (d < bd) { bd = d; best = i; } }
      const bx = best % m.W, by = (best / m.W) | 0;
      await cam.panTo(bx * TILE + 8, by * TILE + 8, 28);
      if (f.particles) for (const i of cells.slice(0, 24)) if (Math.abs((i % m.W) - bx) + Math.abs(((i / m.W) | 0) - by) <= 6) f.particles.sparkle((i % m.W) * TILE + 8, ((i / m.W) | 0) * TILE + 8, 1, this.target.run[i] ? '#ffe08a' : '#cbb0ff');
      e.audio.sfx(this.target.run[best] ? 'sand_run' : 'sand_hold');
      for (let k = 0; k < 50 && !f.dead && !(e.input.pressed('confirm') || e.input.pressed('cancel')); k++) await e.waitFrames(1);
      if (!f.dead) await cam.returnTo(f.leader, 28);
    } finally { f.unlockInput(); this.revealing = false; }
  }

  // ------------------------------------------------------------------ the sweep
  /** Cell -> [index from the caster, length] for every sun shadow of a light() result. */
  sunIndex(L) {
    const out = new Map();
    for (const s of L.segs) if (s.kind === 'sun') s.cells.forEach((i, j) => out.set(i, [j, s.cells.length]));
    return out;
  }

  startSweep(from) {
    const m = this.m, F = SWEEP_FRAMES, to = { L: this.L, run: this.target.run, shade: this.target.shade };
    const oldAt = this.sunIndex(from.L), newAt = this.sunIndex(to.L), mid = Math.floor(F / 2);
    const sw = [];
    for (let i = 0; i < m.N; i++) {
      if (from.run[i] === to.run[i]) continue;
      let k = mid;
      if (to.run[i]) { const o = oldAt.get(i); if (o) k = Math.ceil(((1 - o[0] / o[1]) / 2) * (F - 1)); }
      else { const n = newAt.get(i); if (n) k = Math.min(F - 1, Math.floor(((1 + n[0] / n[1]) / 2) * (F - 1)) + 1); }
      sw.push([i, k]);
    }
    const persist = new Uint8Array(m.N);
    for (let i = 0; i < m.N; i++) if (from.shade[i] && to.shade[i]) persist[i] = 1;
    const sunOld = new Uint8Array(m.N), sunNew = new Uint8Array(m.N);
    for (const i of oldAt.keys()) sunOld[i] = 1;
    for (const i of newAt.keys()) sunNew[i] = 1;
    if (this.anim && this.anim.done) this.anim.done();
    const a = { k: -1, F, from, to, sw, persist, sunOld, sunNew, oldSegs: from.L.segs.filter((s) => s.kind === 'sun'), newSegs: to.L.segs.filter((s) => s.kind === 'sun'),
      run: new Uint8Array(from.run), shade: new Uint8Array(m.N), beamsSwapped: false, playedRun: false, playedHold: false, done: null, promise: null };
    a.promise = new Promise((res) => { a.done = res; });
    this.anim = a;
  }

  stepAnim() {
    const a = this.anim;
    if (!a) return;
    const m = this.m, f = this.f;
    a.k++;
    const t = a.k / (a.F - 1);
    const sh = a.shade;
    sh.set(a.persist);
    if (t < 0.5) {
      for (const s of a.oldSegs) { const n = Math.ceil(s.cells.length * (1 - 2 * t)); for (let j = 0; j < n; j++) { const i = s.cells[j]; if (a.from.shade[i]) sh[i] = 1; } }
      for (let i = 0; i < m.N; i++) if (a.from.shade[i] && !a.sunOld[i]) sh[i] = 1;
    } else {
      if (!a.beamsSwapped) { a.beamsSwapped = true; this.beamShown = a.to.L.beam; this.setWindowFrames(this.hour); }
      for (const s of a.newSegs) { const n = Math.ceil(s.cells.length * (2 * t - 1)); for (let j = 0; j < n; j++) { const i = s.cells[j]; if (a.to.shade[i]) sh[i] = 1; } }
      for (let i = 0; i < m.N; i++) if (a.to.shade[i] && !a.sunNew[i]) sh[i] = 1;
    }
    let ran = false, held = false;
    for (const [i, k] of a.sw) if (k === a.k) { a.run[i] = a.to.run[i]; if (a.run[i]) ran = true; else held = true; }
    if (ran && !a.playedRun) { a.playedRun = true; f.engine.audio.sfx('sand_run'); }
    if (held && !a.playedHold) { a.playedHold = true; f.engine.audio.sfx('sand_hold'); }
    if (a.k >= a.F - 1) { this.finishAnim(); return; }
    this.show(a.run, sh, this.beamShown, true);
  }

  finishAnim() {
    const a = this.anim;
    if (!a) return;
    this.anim = null;
    this.setWindowFrames(this.hour);
    this.show(this.target.run, this.target.shade, this.L.beam);
    if (a.done) a.done();
  }

  /** Resolves once the sweep (if any) has finished. */
  settled() { return this.anim && this.anim.promise ? this.anim.promise : Promise.resolve(); }

  // ------------------------------------------------------------------ Shove
  /**
   * May this stone or lamp move one cell toward dir? { ok, why: 'fixed' | 'groove' | 'blocked' | 'sand', to: [x, y] }.
   * Along its groove only, onto a free cell, and never so that any party member would stand on running sand after.
   */
  canShove(ent, dir) {
    const f = this.f, m = this.m;
    const rec = m && m.byId.get(ent.id);
    if (!rec || !rec.mover || !ent.present) return { ok: false, why: 'fixed' };
    if (ent.data.sliding) return { ok: false, why: 'blocked' };
    const [dx, dy] = DIRS[dir];
    const j = grooveNext(m, rec, ent.y * m.W + ent.x, dx, dy);
    if (j < 0) return { ok: false, why: 'groove' };
    const nx = j % m.W, ny = (j / m.W) | 0;
    if (f.map.codeAt(nx, ny) !== 'none' || f.actorAt(nx, ny, null, true)) return { ok: false, why: 'blocked' };
    if (entitiesAt(f, nx, ny).some((e) => e.present && e !== ent && e.type !== 'trigger' && e.type !== 'light' && e.type !== 'sunplate')) return { ok: false, why: 'blocked' };
    const st = this.state();
    st.pos[ent.id] = j;
    const run = runMask(this.mod, st, light(this.mod, st));
    for (const a of [f.leader, ...(f.followers || [])]) if (a && run[a.ty * m.W + a.tx]) return { ok: false, why: 'sand', to: [nx, ny] };
    return { ok: true, to: [nx, ny] };
  }

  /** Slide a caster or lamp to its new cell, then let the light follow it. */
  async moveCaster(ent, to, frames, sfx) {
    const f = this.f, e = f.engine;
    const [nx, ny] = to, ox = ent.x, oy = ent.y;
    ent.x = nx; ent.y = ny; ent.cells = [[nx, ny]];
    reindex(f, ent, [[ox, oy]], [[nx, ny]]);
    ent.data.sliding = true;
    if (sfx) e.audio.sfx(sfx);
    const slide = ent.prop && typeof f.slideProp === 'function' ? f.slideProp(ent.prop, nx, ny, frames, null) : null;
    if (slide && typeof slide.then === 'function') await slide;
    ent.data.sliding = false;
    this.apply({ sounds: true, origin: [nx, ny] });
    this.sig = this.signature();
  }

  /** Bram's Shove on a stone or a lamp (the field's FieldAbilities.shove hands these here). */
  async shoveWith(ab, c) {
    const f = this.f, L = f.leader, e = f.engine, ent = c.target, dir = L.dir;
    const [dx, dy] = DIRS[dir];
    ab.showLabel('shove');
    await ab.tagIn('bram');
    const v = this.canShove(ent, dir);
    if (v.ok) {
      ab.lean = { actor: L, dx, dy };
      e.audio.sfx('hit_heavy', { volume: 0.7 });
      await ab.wait(6);
      if (e.renderer.shake && !this.still) e.renderer.shake(1, 18);
      for (let i = 0; i < 4; i++) e.after(i * 5, () => { if (ent.prop && f.particles) f.particles.puff(ent.prop.x * TILE + 8 - dx * 6, ent.prop.y * TILE + 14); });
      await this.moveCaster(ent, v.to, 22, ent.type === 'lampcart' ? 'lamp_roll' : 'block_push');
      ab.lean = null;
      e.audio.sfx('land', { volume: 0.6 });
      ab.addFx('dust', ent.x, ent.y, dir, 16);
      ab.lastHit = { kind: 'shove', id: ent.id, at: [ent.x, ent.y] };
      await ab.wait(10);
      f.bark(ent.type === 'lampcart' ? 'first_lamp' : 'first_shove_shade');
    } else {
      // Bram strains, the stone rocks, nothing moves (and if the sand would run under the party, Mira says so)
      ab.lean = { actor: L, dx, dy };
      e.audio.sfx('hit_light');
      if (ent.prop) { ent.prop.offX = dx; ent.prop.offY = dy; }
      if (L.showEmote) L.showEmote('sweat', 40);
      await ab.wait(14);
      if (ent.prop) { ent.prop.offX = 0; ent.prop.offY = 0; }
      ab.lean = null;
      e.audio.sfx('buzzer', { volume: 0.5 });
      ab.lastHit = { kind: v.why === 'sand' ? 'sand' : 'stuck', id: ent.id };
      if (v.why === 'sand') { this.refusals++; this.refuseLine(); }
      await ab.wait(16);
    }
    await ab.tagOut();
  }

  /** `push: true` (the fallback when Shove is not on hand): walking into the stone slides it, with the same rules. */
  pushCaster(ent, dir) {
    const f = this.f;
    if (this.busy || ent.data.sliding) return false;
    const v = this.canShove(ent, dir);
    if (!v.ok) {
      if (v.why === 'sand' && (ent.data.refusedAt == null || f.frame - ent.data.refusedAt > 30)) { ent.data.refusedAt = f.frame; this.refusals++; f.engine.audio.sfx('buzzer', { volume: 0.5 }); this.refuseLine(); }
      return false;
    }
    this.moveCaster(ent, v.to, 14, ent.type === 'lampcart' ? 'lamp_roll' : 'block_push').then(() => f.bark(ent.type === 'lampcart' ? 'first_lamp' : 'first_shove_shade'));
    return true;
  }

  /** The refusal, said: Mira's line the first time (bark), a short float over the leader after. */
  refuseLine() {
    const f = this.f;
    if (!f.game.counters['bark:sand_would_run']) f.bark('sand_would_run');
    else if (f.abilities) f.abilities.float = { text: 'The sand would run.', t: 0 };
  }

  // ------------------------------------------------------------------ per frame
  update() {
    if (!this.active) return;
    const t0 = now();
    this.frame++;
    const f = this.f, m = this.m;
    this.stepAnim();
    // a gate opened, a stone moved, a shade thing appeared: the light follows (no sweep)
    if (!this.busy && !this.anim && this.frame % 6 === 0) {
      const sig = this.signature();
      if (sig !== this.sig) { this.sig = sig; this.apply({ sounds: true }); this.sig = this.signature(); }
    }
    const L = f.leader;
    if (L && !L.moving) {
      const i = L.ty * m.W + L.tx;
      if (i !== this.lastCell) {
        this.lastCell = i;
        if (m.sand[i] && !this.target.run[i]) f.bark('first_shade');
      }
    }
    if (L && this.frame % 20 === 0) {
      if (m.windows.length && !f.game.counters['bark:first_window'] && this.L) {
        for (const w of m.windows) if (w.hours.has(this.hour) && Math.abs(w.x - L.tx) + Math.abs(w.y - L.ty) <= 10) { f.bark('first_window'); break; }
      }
      if (m.lamps.length && !f.game.counters['bark:first_lamp']) {
        const near = [...this.m.lamps].some((r) => { const e = f.entities.get(r.id); return e && e.present && Math.abs(e.x - L.tx) + Math.abs(e.y - L.ty) <= 4; });
        if (near) f.bark('first_lamp');
      }
    }
    if (this.queue.length && L && !L.moving && !f.inputLocked && !f.pendingWarp && f.engine.scene === f && !(f.cutscene && f.cutscene.running)) f.runScene(this.queue.shift());
    const ms = round3(now() - t0);
    this.stats.updateMs = ms;
    this.stats.maxUpdateMs = Math.max(this.stats.maxUpdateMs, ms);
  }

  // ------------------------------------------------------------------ drawing
  ensureLayers() {
    if (this.layers || !this.active) return this.layers;
    const r = this.f.engine.renderer, m = this.m;
    if (!r || !r.createLayer) return null;
    const meta = this.map.db.terrains && this.map.db.terrains.running_sand;
    this.runMeta = meta || null;
    const n = meta && meta.anim ? Math.max(...meta.anim.frames) + 1 : 3;
    this.layers = [];
    for (let k = 0; k < n; k++) this.layers.push(r.createLayer(Math.max(1, m.W * TILE), Math.max(1, m.H * TILE)));
    this.shadeLayer = r.createLayer(Math.max(1, m.W * TILE), Math.max(1, m.H * TILE));
    // cached pieces, so a sweep frame blits instead of painting pixel by pixel (the 4x-throttle frame budget)
    this.shadeTile = r.createLayer(TILE, TILE);
    paintShadeTile(this.shadeTile.ctx, 0, 0, SHADE);
    this.shadePave = r.createLayer(TILE, TILE);
    paintShadeTile(this.shadePave.ctx, 0, 0, SHADE_PAVE);
    this.capWork = r.createLayer(TILE, TILE);
    this.edges = r.createLayer(TILE * 4, TILE * n);
    for (let k = 0; k < n; k++) paintRunEdgeSet(this.edges.ctx, 0, k * TILE, k);
    if (!meta) {
      this.tex = r.createLayer(TILE * 3, TILE);
      for (let k = 0; k < 3; k++) paintRunTile(this.tex.ctx, k * TILE, 0, k);
    }
    return this.layers;
  }

  /**
   * Draw state := (run, shade, beam); repaint only what changed (cell and neighbours, for the rims). direct: a sweep frame:
   * the shade is drawn cell by cell from the mask (drawLow) and the cached shade layer waits for the end of the sweep, so a
   * sweep frame never re-uploads a map-sized layer for the shadows (it does for the few sand cells that switch).
   */
  show(run, shade, beam, direct = false) {
    const m = this.m;
    this.beamShown = beam;
    const roots = this.rootsOf(shade);
    if (!this.ensureLayers()) { this.shownRun = new Uint8Array(run); this.shownShade = new Uint8Array(shade); this.layerShade = this.shownShade; this.shownRoot = roots; return; }
    if (!this.shownRun) {
      this.shownRun = new Uint8Array(run); this.shownShade = new Uint8Array(shade); this.layerShade = new Uint8Array(shade);
      this.shownRoot = roots; this.layerRoot = new Uint8Array(roots);
      for (const L of this.layers) L.ctx.clearRect(0, 0, L.w, L.h);
      this.shadeLayer.ctx.clearRect(0, 0, this.shadeLayer.w, this.shadeLayer.h);
      for (let i = 0; i < m.N; i++) { if (run[i]) this.paintRun(i); if (shade[i]) this.paintShade(i); }
      return;
    }
    const dr = [];
    for (let i = 0; i < m.N; i++) if (this.shownRun[i] !== run[i]) dr.push(i);
    this.shownRun.set(run);
    this.shownShade.set(shade);
    this.shownRoot = roots;
    this.shadeDirect = direct;
    if (dr.length) this.repaint(dr, (i) => this.paintRun(i), this.layers);
    if (direct) return;
    const ds = [];
    for (let i = 0; i < m.N; i++) if (this.layerShade[i] !== shade[i] || this.layerRoot[i] !== roots[i]) ds.push(i);
    this.layerShade.set(shade);
    this.layerRoot.set(roots);
    if (ds.length) this.repaint(ds, (i) => this.paintShade(i), [this.shadeLayer]);
  }

  /**
   * The root of every stone's sun shadow: the shaded cell next to the stone on the side the hour throws it (west at dawn,
   * north at noon, east at dusk). Drawn one step darker so a shadow grows from its stone (CRITIQUE_7 item 3).
   */
  rootsOf(shade) {
    const m = this.m, out = new Uint8Array(m.N), sun = SUN[this.hour];
    if (!sun || !m.openSky) return out;
    const [dx, dy] = { west: [-1, 0], north: [0, -1], east: [1, 0] }[sun[0]];
    for (const r of m.casters) {
      const e = this.f.entities.get(r.id);
      if (!e || !e.present) continue;
      const x = e.x + dx, y = e.y + dy;
      if (x < 0 || y < 0 || x >= m.W || y >= m.H) continue;
      if (shade[y * m.W + x]) out[y * m.W + x] = 1;
    }
    return out;
  }

  /** The cached shade tile for cell i: the strong violet on sand, the paler indigo-grey on paving and every other floor. */
  shadeStyle(i) {
    return this.m.sand[i] ? [SHADE, this.shadeTile && this.shadeTile.canvas] : [SHADE_PAVE, this.shadePave && this.shadePave.canvas];
  }

  /**
   * Shade over the part of a stone's sprite that stands on shaded cells (the rows north of its own cell that its art covers),
   * clipped to the stone's own pixels: so a noon shadow that falls under a stone's head still shows as one band (the road
   * island's stair, CRITIQUE_7 item 10, PLAYTEST_REVIEW_7 item 7). World pixels, after the props and actors are drawn.
   */
  drawOverCasters(r) {
    if (!this.active || !this.shownShade || !this.capWork || !this.capWork.ctx) return;
    const m = this.m, sh = this.shownShade, cam = this.f.camera, W = this.capWork, g = W.ctx;
    for (const rec of m.casters) {
      const e = this.f.entities.get(rec.id), p = e && e.prop;
      if (!e || !e.present || !p || !p.visible || !p.draw || !p.draw.img) continue;
      const d = p.draw, x0 = d.dx + p.offX, y0 = d.dy + p.offY, rows = Math.round(d.h / TILE);
      if (!cam.visible(x0, y0, d.w, d.h, 8) || d.w !== TILE) continue;
      for (let k = 0; k < rows - 1; k++) {
        const cy = Math.round((y0 + k * TILE) / TILE), cx = Math.round(x0 / TILE);
        if (cx < 0 || cy < 0 || cx >= m.W || cy >= m.H || !sh[cy * m.W + cx]) continue;
        const [, tile] = this.shadeStyle(cy * m.W + cx);
        if (!tile) continue;
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        g.clearRect(0, 0, TILE, TILE);
        g.drawImage(d.img, d.sx, d.sy + k * TILE, TILE, TILE, 0, 0, TILE, TILE);
        g.globalCompositeOperation = 'source-atop';
        g.drawImage(tile, 0, 0);
        if (this.shownRoot && this.shownRoot[cy * m.W + cx]) { g.globalAlpha = 0.2; g.fillStyle = '#1a1636'; g.fillRect(0, 0, TILE, TILE); g.globalAlpha = 1; }
        g.globalCompositeOperation = 'source-over';
        r.ctx.drawImage(W.canvas, Math.round(x0), Math.round(y0 + k * TILE));
      }
    }
  }

  repaint(cells, paint, layers) {
    const m = this.m, seen = new Set();
    for (const i of cells) {
      const x = i % m.W, y = (i / m.W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= m.W || ny >= m.H) continue;
        const j = ny * m.W + nx;
        if (seen.has(j)) continue;
        seen.add(j);
        for (const L of layers) L.ctx.clearRect(nx * TILE, ny * TILE, TILE, TILE);
        paint(j);
      }
    }
  }

  paintRun(i) {
    const m = this.m, run = this.shownRun;
    if (!run[i]) return;
    const x = i % m.W, y = (i / m.W) | 0, px = x * TILE, py = y * TILE;
    const nb = {};
    for (const k in NB8) {
      const nx = x + NB8[k][0], ny = y + NB8[k][1];
      nb[k] = nx < 0 || ny < 0 || nx >= m.W || ny >= m.H ? true : !!run[ny * m.W + nx];
    }
    const meta = this.runMeta;
    const img = meta ? this.map.sheet(meta.sheet) : null;
    for (let k = 0; k < this.layers.length; k++) {
      const g = this.layers[k].ctx;
      if (meta && img) {
        const qs = a2Quarters(nb), sx = meta.x + k * (meta.anim ? meta.anim.frameDx : 0);
        for (let q = 0; q < 4; q++) {
          const [qx, qy] = qs[q], [ox, oy] = QUARTER_OFFSET[QUARTERS[q]];
          g.drawImage(img, sx + qx * 8, meta.y + qy * 8, 8, 8, px + ox, py + oy, 8, 8);
        }
      } else if (this.tex && this.tex.canvas) g.drawImage(this.tex.canvas, k * TILE, 0, TILE, TILE, px, py, TILE, TILE);
      const E = this.edges && this.edges.canvas;
      if (!E) { paintRunEdges(g, px, py, nb, k); continue; }
      ['N', 'S', 'W', 'E'].forEach((side, s) => { if (!nb[side]) g.drawImage(E, s * TILE, k * TILE, TILE, TILE, px, py, TILE, TILE); });
    }
  }

  paintShade(i) {
    const m = this.m, sh = this.shownShade;
    if (!sh[i]) return;
    const x = i % m.W, y = (i / m.W) | 0;
    const nb = {};
    for (const k in NB4) { const nx = x + NB4[k][0], ny = y + NB4[k][1]; nb[k] = nx < 0 || ny < 0 || nx >= m.W || ny >= m.H ? true : !!sh[ny * m.W + nx] || !!this.wallSolid[ny * m.W + nx]; }
    const [P, tile] = this.shadeStyle(i);
    paintShadeCell(this.shadeLayer.ctx, x * TILE, y * TILE, nb, tile, P, !!(this.shownRoot && this.shownRoot[i]));
  }

  drawLow(r, t) {
    if (!this.active || !this.ensureLayers()) return;
    const cam = this.f.camera, m = this.m;
    const x0 = Math.floor(cam.x / TILE) - 1, y0 = Math.floor(cam.y / TILE) - 1, x1 = x0 + Math.ceil(r.W / TILE) + 2, y1 = y0 + Math.ceil(r.H / TILE) + 2;
    for (const c of this.ruts) if (c.x >= x0 && c.x <= x1 && c.y >= y0 && c.y <= y1) paintRut(r, c.x * TILE, c.y * TILE, c.v);
    const sx = Math.max(0, cam.x), sy = Math.max(0, cam.y);
    const meta = this.runMeta;
    const seq = meta && meta.anim ? meta.anim.frames : [0, 1, 2];
    const ms = meta && meta.anim ? meta.anim.ms || 200 : 170;
    const k = this.still ? 0 : seq[Math.floor((t * 1000) / ms) % seq.length];
    const Lr = this.layers[Math.min(this.layers.length - 1, k)];
    const sw = Math.min(Lr.w - sx, r.W), sh = Math.min(Lr.h - sy, r.H);
    if (sw > 0 && sh > 0) r.drawLayer(Lr, sx, sy, sw, sh, sx, sy);
    // window shafts: a warm wash with motes drifting along the beam
    const beam = this.beamShown;
    if (beam) {
      const ph = this.still ? 0 : Math.floor(t * 12);
      for (let y = Math.max(0, y0); y <= Math.min(m.H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(m.W - 1, x1); x++) {
        if (!beam[y * m.W + x]) continue;
        const px = x * TILE, py = y * TILE;
        r.withAlpha(0.2, () => r.rect(px, py, TILE, TILE, '#ffe6a4'));
        r.withAlpha(0.32, () => { for (let q = 0; q < 3; q++) r.rect(px + ((x * 5 + q * 6 + ph) % TILE), py + ((y * 7 + q * 5 + (ph >> 1)) % TILE), 1, 1, '#fff6d8'); });
      }
    }
    if (this.shadeDirect && this.anim) {
      const sm = this.shownShade, rt = this.shownRoot, g = r.ctx;
      for (let y = Math.max(0, y0); y <= Math.min(m.H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(m.W - 1, x1); x++) {
        const i = y * m.W + x;
        if (!sm[i]) continue;
        const nb = { N: y === 0 || !!sm[i - m.W] || !!this.wallSolid[i - m.W], S: y === m.H - 1 || !!sm[i + m.W] || !!this.wallSolid[i + m.W],
          W: x === 0 || !!sm[i - 1] || !!this.wallSolid[i - 1], E: x === m.W - 1 || !!sm[i + 1] || !!this.wallSolid[i + 1] };
        const [P, tile] = this.shadeStyle(i);
        paintShadeCell(g, x * TILE, y * TILE, nb, tile, P, !!(rt && rt[i]));    // world pixels: drawLow runs under the field's pushCamera
      }
    } else if (sw > 0 && sh > 0) r.drawLayer(this.shadeLayer, sx, sy, sw, sh, sx, sy);
  }

  /** Light sources for Lighting: lamp pools always, window shafts on dark maps. */
  lights() {
    const out = [];
    if (!this.active) return out;
    const f = this.f, m = this.m;
    for (const r of m.lamps) {
      const e = f.entities.get(r.id);
      if (!e || !e.present) continue;
      const px = (e.prop ? e.prop.x + e.prop.offX / TILE : e.x) * TILE + 8, py = (e.prop ? e.prop.y + e.prop.offY / TILE : e.y) * TILE + 6;
      out.push({ x: px, y: py, r: Math.round((r.r + 0.5) * TILE * 1.25), color: '#ffcf7a', kind: 'warm', flicker: false });
    }
    if (f.lighting && f.lighting.dark > 0.01 && this.beamShown) {
      const cam = f.camera;
      for (let i = 0; i < m.N; i++) {
        if (!this.beamShown[i]) continue;
        const x = (i % m.W) * TILE + 8, y = ((i / m.W) | 0) * TILE + 8;
        if (cam && cam.visible && !cam.visible(x - 24, y - 24, 48, 48, 0)) continue;
        out.push({ x, y, r: 22, color: '#ffe6b0', kind: 'warm', flicker: false });
      }
    }
    return out;
  }

  /** The virtual flag `hour:<name>` for this field (the start hour of a map this system has not reset for yet). */
  hourFlag(key) {
    const mod = this.mod, m = mod && compile(mod);
    if (!m) return false;
    const h = this.active && this.mapRef === this.f.map ? this.hour : m.hour;
    return !!hourFlag(key, h);
  }

  debugState() {
    if (!this.active) return { active: false };
    const f = this.f, m = this.m, xy = (i) => `${i % m.W},${(i / m.W) | 0}`;
    let running = 0, firmN = 0;
    for (let i = 0; i < m.N; i++) if (m.sand[i]) { if (this.target.run[i]) running++; else firmN++; }
    const pos = {};
    for (const [id, i] of Object.entries(this.positions())) pos[id] = xy(i);
    return {
      active: true, hour: this.hour, latched: [...this.latched].sort(), running, firm: firmN, pos,
      plates: m.plates.map((p) => `${p.id}:${(f.entities.get(p.id) || {}).state}`), anim: this.anim ? this.anim.k : null, busy: this.busy,
      refusals: this.refusals, lastChange: this.lastChange, tint: f.lighting ? f.lighting.tintName : null,
      applyMs: this.stats.ms, maxApplyMs: this.stats.maxMs, paintMs: this.stats.paintMs, sweepMs: this.stats.sweepMs,
      updateMs: this.stats.updateMs, maxUpdateMs: this.stats.maxUpdateMs,
    };
  }
}

function targetsOf(ev) { return ev.target == null ? [] : Array.isArray(ev.target) ? ev.target : [ev.target]; }
function reindex(field, ent, oldCells, newCells) {
  for (const [x, y] of oldCells) {
    const list = field.byTile.get(`${x},${y}`);
    if (list) { const i = list.indexOf(ent); if (i >= 0) list.splice(i, 1); }
  }
  for (const [x, y] of newCells) {
    const k = `${x},${y}`;
    if (!field.byTile.has(k)) field.byTile.set(k, []);
    field.byTile.get(k).push(ent);
  }
}
export { isHourFlag };
