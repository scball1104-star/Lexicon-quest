// Tide locks on the field (E4-world, docs/EPISODE4_PLAN.md 5.1): the water a map's `tide` block declares, its wheels,
// posts, pontoons, forged seals and floodgates. The rule itself is the pure ./tide.js; ./events.js attaches this to a
// field (field.tide) and registers the event types. Never in the first download (the ep4 pack).
//
//   const t = new Tide(field);
//   t.reset()            after the map's entities are built: start levels, saved washes and latches, a quiet apply
//   t.update()           per frame: the band-by-band rise or fall, re-apply on a block move, barks, scripts, bobbing
//   t.turn(ent)          a wheel was confirmed (async: resolves when the water has settled)
//   t.drawLow(r, t)      after the ground: the water layer, lantern reflections
//   t.drawHigh(r, t)     after the props: the waterline carried up wall faces, the red ink cloud of a wash
//   t.lights()           dark maps: lantern reflections on high water
//
// Collision goes through one override per cell (map.base), re-applied whenever the map recomputes that cell: water
// cells `water`, floating pontoons and open floodgates `none`, grounded pontoons, unwashed seals and shut floodgates
// `solid`. Water is painted into three cached layers (the tide_water frames), cell by cell as the bands arrive.
// State: levels reset to each basin's start on every arrival; washed seals live in game.washed[mapId] (sorted ids);
// latched floodgates in game.opened and their flag.

import { compile, classify, washes, gateOpen, nextLevel, bands, levelsOf, tideFlag, isTideFlag } from './tide.js';
import { a2Quarters, QUARTERS, QUARTER_OFFSET } from '../../../world/autotile.js';
import { TILE } from '../../../world/tilemap.js';
import { fireTarget, refreshEntities, SOURCE_TYPES } from '../../../world/events.js';
import { markOpened, isOpened, count } from '../../../game/state.js';
import { inspectBoxes } from '../../../game/story.js';

export const BAND_FRAMES = 24;
const WASH_FRAMES = 48;
const BOB_FRAMES = 22;
const WATCH = new Set(['block', 'pontoon', 'forgery', 'floodgate', 'tidewheel', 'tidepost']);
const NB = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0], NE: [1, -1], NW: [-1, -1], SE: [1, 1], SW: [-1, 1] };
// the turquoise ramp of the ep4 sheet (E4-tiles ep4_kit tq: deep, mid, bright, crest, foam)
const TQ = ['#123f4c', '#1a6f7a', '#2ec4d0', '#8af0e8', '#e8fffb'];
// the tide-mark rows of a 2-row wall face (E4-tiles ep4_kit MARK1_Y 26, MARK2_Y 18): the top of the water strip in the
// face's bottom row (16 px) for one and two marks of depth
const STRIP_TOP = [16, 10, 2];
const POST_SPRITE = 'tide_post', WHEEL_SPRITE = 'tide_wheel';

SOURCE_TYPES.add('forgery');
SOURCE_TYPES.add('floodgate');
SOURCE_TYPES.add('flagsrc');

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export class Tide {
  constructor(field) { this.f = field; this.clear(); }

  clear() {
    this.active = false;
    this.m = null;
    this.levels = {};
    this.washed = new Set();
    this.latched = new Set();
    this.over = new Map();        // cell index -> collision code forced on map.base
    this.wat = new Set();         // water drawn now (lags the rule during a band animation)
    this.target = new Set();      // water by the rule
    this.cls = null;
    this.anim = null;             // { list: [[i, frame]], k, t, resolve }
    this.layers = null;
    this.washFx = [];             // { i, x, y, t }
    this.queue = [];              // floodgate scripts waiting for a quiet moment
    this.deferred = [];           // floodgates to lift once the bands have arrived
    this.flagSrc = [];
    this.strips = [];             // [{ i, j }]: water cell i, the wall face cell j above it
    this.reflections = [];        // [{ i, x, y }]: lantern_chain cells (Mercy)
    this.sig = '';
    this.dirty = false;
    this.frame = 0;
    this.lastCell = -1;
    this.inkBarked = false;
    this.busy = false;
    this.stats = { applies: 0, ms: 0, maxMs: 0, updateMs: 0 };
  }

  get map() { return this.f.map; }
  get mod() { return this.f.map && this.f.map.mod; }
  get still() { const s = this.f.engine.settings; return !!(s && s.reduceMotion); }

  /** The map was (re)built: start levels, saved washes and latches, flag sources, then a quiet apply. */
  reset() {
    this.clear();
    const f = this.f, map = f.map;
    if (!map || !map.mod || !map.mod.tide) return;
    const m = compile(map.mod);
    if (!m) return;
    this.m = m;
    this.active = true;
    const g = f.game;
    this.levels = levelsOf(map.mod, {});
    this.washed = new Set((g.washed && g.washed[map.id]) || []);
    for (const fg of m.floodgates) if ((fg.ev.flag && g.flags[fg.ev.flag]) || (fg.latch && isOpened(g, map.id, fg.id))) this.latched.add(fg.id);
    this.wrapMap(map);
    this.buildFlagSources();
    this.buildDecor();
    this.apply({ quiet: true });
    // the virtual tide flags (`tide:c>=2`) are true now: events and overlays that read them appear
    if (map.hasFlag !== f.hasFlag) map.hasFlag = f.hasFlag;
    refreshEntities(f);
    if (map.gated && (map.gated.length || map.gatedOverhead.length)) map.refreshGated(f.hasFlag);
    for (const s of this.flagSrc) fireTarget(f, s.ev.target, { quiet: true });
    // a seal washed in an earlier visit, a floodgate latched open: their gates open quietly on arrival
    for (const r of [...m.forgeries, ...m.floodgates]) for (const t of targetsOf(r.ev)) fireTarget(f, t, { quiet: true });
    this.sig = this.signature();
    this.lastCell = f.leader ? f.leader.ty * m.W + f.leader.tx : -1;
  }

  /** map.recomputeCell keeps the tide's override on the cell (a door opening, a flag overlay, a reveal). */
  wrapMap(map) {
    if (map.recomputeCell.ep4) return;
    const orig = map.recomputeCell.bind(map), self = this;
    const w = function (x, y) {
      orig(x, y);
      if (self.f.map !== map) return;
      const c = self.over.get(y * map.w + x);
      if (c) map.base[y][x] = c;
    };
    w.ep4 = true;
    map.recomputeCell = w;
  }

  /** A `gate` with `flags: [...]` (the Petition Gate): one pseudo source per flag, as Episode 3's Bell Gate. */
  buildFlagSources() {
    const f = this.f;
    for (const ent of [...f.entities.values()]) {
      if (ent.type !== 'gate' || !Array.isArray(ent.ev.flags)) continue;
      for (const flag of ent.ev.flags) {
        const id = `${ent.id}~${flag}`;
        if (f.entities.has(id)) continue;     // Episode 3's quench already made it (a field that visited Emberpeak)
        const s = { ev: { target: ent.id }, id, type: 'flagsrc', x: -1, y: -1, cells: [], prop: null, actor: null,
          state: f.hasFlag(flag) ? 'on' : 'off', present: true, data: { flag } };
        f.entities.set(id, s);
        this.flagSrc.push(s);
      }
    }
  }

  /** Cells whose wall face shows the waterline, and the lantern chains whose light lies on high water. */
  buildDecor() {
    const m = this.m, map = this.map, mod = this.mod;
    for (const i of allBasinCells(m)) {
      const x = i % m.W, y = (i / m.W) | 0;
      if (y < 1) continue;
      const j = i - m.W;
      if (m.basinAt[j] >= 0) continue;
      const w = map.walls && map.walls[y - 1] && map.walls[y - 1][x];
      const face = (w && w.part === 'face') || map.idsAt(x, y - 1).some((id) => /ledge_face|_face$/.test(id))
        || [...(this.f.byTile.get(`${x},${y - 1}`) || [])].some((e) => e.type === 'gate' || e.type === 'forgery' || e.type === 'floodgate');
      if (face) this.strips.push({ i, j, x, y: y - 1 });
    }
    const chains = [...(mod.decor || []).filter((d) => d.t === 'lantern_chain'), ...(mod.events || []).filter((e) => e.sprite === 'lantern_chain')];
    for (const c of chains) {
      const i = c.y * m.W + c.x;
      if (m.basinAt[i] >= 0) this.reflections.push({ i, x: c.x, y: c.y });
    }
  }

  /** Cells of present blocks standing in a basin: dams. */
  dams() {
    const out = new Set(), m = this.m;
    for (const e of this.f.entities.values()) {
      if (e.type !== 'block' || !e.present || (e.data && e.data.sliding)) continue;
      const i = e.y * m.W + e.x;
      if (m.basinAt[i] >= 0) out.add(i);
    }
    return out;
  }

  absent() {
    const out = new Set();
    for (const e of this.f.entities.values()) if ((e.type === 'pontoon' || e.type === 'forgery' || e.type === 'floodgate') && !e.present) out.add(e.id);
    return out;
  }

  state() { return { levels: this.levels, dams: this.dams(), washed: this.washed, latched: this.latched, absent: this.absent() }; }

  /** What changes the water besides a wheel: block positions, presence of the tide's own things. */
  signature() {
    let s = '';
    for (const e of this.f.entities.values()) {
      if (!WATCH.has(e.type)) continue;
      s += `${e.id}${e.present ? 1 : 0}${e.x},${e.y}${e.data && e.data.sliding ? 's' : ''}|`;
    }
    return s;
  }

  markDirty() { if (this.active) this.dirty = true; }

  /**
   * Apply the rule now: washes (permanent), collision overrides, pontoon and seal frames, floodgates, wheel and post
   * frames, and the water to draw. o.quiet: map load (no sound, no animation). o.origin: [x, y] the bands spread from.
   */
  apply(o = {}) {
    if (!this.active) return null;
    const t0 = now();
    const f = this.f, map = this.map, m = this.m, g = f.game;
    let st = this.state();
    let cls = classify(map.mod, st);
    const fresh = washes(map.mod, st, cls.water);
    if (fresh.length) {
      for (const id of fresh) this.washed.add(id);
      g.washed = g.washed || {};
      g.washed[map.id] = [...this.washed].sort();
      st = this.state();
      cls = classify(map.mod, st);
    }
    this.cls = cls;
    const before = this.wat;
    this.target = cls.water;
    // collision
    const want = new Map();
    for (const i of cls.flooded) want.set(i, 'water');
    for (const i of cls.floats) want.set(i, 'none');
    for (const i of cls.solid) want.set(i, 'solid');
    const gates = [];
    for (const fg of m.floodgates) {
      const ent = f.entities.get(fg.id);
      if (!ent || !ent.present) continue;
      const open = gateOpen(map.mod, st, fg);
      gates.push([fg, ent, open]);
      for (let k = 0; k < fg.w; k++) if (map.inBounds(fg.x + k, fg.y)) want.set(fg.y * m.W + fg.x + k, open ? 'none' : 'solid');
    }
    for (const [i] of this.over) if (!want.has(i)) { this.over.delete(i); map.recomputeCell(i % m.W, (i / m.W) | 0); }
    for (const [i, c] of want) { this.over.set(i, c); map.base[(i / m.W) | 0][i % m.W] = c; }
    // props
    for (const p of m.pontoons) {
      const ent = f.entities.get(p.id);
      if (!ent || !ent.present || !ent.prop) continue;
      const s = cls.floats.has(p.i) ? 'float' : cls.sunk.has(p.i) ? 'sunk' : 'ground';
      if (ent.state !== s) { ent.state = s; map.setPropState(ent.prop, s === 'float' ? 1 : s === 'sunk' ? 3 : 0); ent.prop.offY = 0; }
    }
    for (const r of m.forgeries) {
      const ent = f.entities.get(r.id);
      if (!ent || !ent.present) continue;
      const washed = this.washed.has(r.id);
      const was = ent.state;
      ent.state = washed ? 'on' : 'off';
      ent.data.concealed = washed;            // a washed seal no longer answers confirm (the doorway is just a doorway)
      if (washed && was !== 'on') {
        if (o.quiet || !fresh.includes(r.id)) { if (ent.prop) map.setPropState(ent.prop, 2); }
        else this.washFx.push({ id: r.id, x: r.x, y: r.y, t: -this.delayFor(r.wet, o) });
        for (const t of targetsOf(r.ev)) fireTarget(f, t, { quiet: !!o.quiet });
      } else if (!washed && ent.prop && ent.prop.state !== 0) map.setPropState(ent.prop, 0);
    }
    // a floodgate lifts when the rising water reaches it (after the bands), not when the wheel turns
    const deferGates = !o.quiet && !this.still && !!this.layers;
    for (const [fg, ent, open] of gates) {
      if (deferGates && open && ent.state !== 'on') this.deferred.push(() => this.setGate(fg, ent, gateOpen(map.mod, this.state(), fg), o));
      else this.setGate(fg, ent, open, o);
    }
    for (const w of m.wheels) { const e = f.entities.get(w.id); if (e && e.prop && e.prop.state !== this.levels[w.b]) map.setPropState(e.prop, this.levels[w.b]); }
    for (const p of m.posts) { const e = f.entities.get(p.id); if (e && e.prop && e.prop.state !== this.levels[p.b]) map.setPropState(e.prop, this.levels[p.b]); }
    const logicMs = now() - t0;
    // water to draw
    if (o.quiet || this.still || !this.layers) {
      this.finishAnim();
      this.wat = new Set(cls.water);
      this.paintAll();
    } else {
      const list = bands(map.mod, before, cls.water, o.origin, BAND_FRAMES);
      if (this.anim) { const a = this.anim; this.anim = null; if (a.done) a.done(); }
      if (list.length) {
        const a = { list, k: 0, t: -1, done: null, promise: null };
        a.promise = new Promise((res) => { a.done = res; });
        this.anim = a;
      } else { this.paintAll(); this.runDeferred(); }
    }
    const ms = logicMs;
    this.stats.paintMs = Math.round((now() - t0 - logicMs) * 1000) / 1000;
    this.stats.applies++; this.stats.ms = Math.round(ms * 1000) / 1000; this.stats.maxMs = Math.max(this.stats.maxMs, this.stats.ms);
    return cls;
  }

  /** The frame of a band animation on which cell i gets its water (a wash waits for the water to reach the seal). */
  delayFor(i, o) {
    if (o.quiet || this.still || i < 0) return 0;
    const list = bands(this.map.mod, this.wat, this.target, o.origin, BAND_FRAMES);
    const hit = list.find((c) => c[0] === i);
    return hit ? hit[1] + 4 : BAND_FRAMES;
  }

  setGate(fg, ent, open, o) {
    const f = this.f, map = this.map, ev = fg.ev;
    const want = open ? 'on' : 'off';
    if (ent.state === want) return;
    const first = !ent.data.everOpen;
    ent.state = want;
    ent.data.concealed = open;                // an open floodgate is a doorway, nothing to read
    if (ent.prop) map.setPropSprite(ent.prop, open ? openSprite(ev) : closedSprite(ev), 0);
    if (!open) { for (const t of targetsOf(ev)) fireTarget(f, t, { quiet: !!o.quiet }); return; }
    ent.data.everOpen = true;
    if (fg.latch && !this.latched.has(fg.id)) { this.latched.add(fg.id); markOpened(f.game, map.id, fg.id); }
    const flagWasSet = !!(ev.flag && f.hasFlag(ev.flag));
    if (ev.flag && !flagWasSet) f.setFlag(ev.flag);
    for (const t of targetsOf(ev)) fireTarget(f, t, { quiet: !!o.quiet });
    if (o.quiet) return;
    f.engine.audio.sfx('gate_open');
    if (f.engine.renderer.shake && !this.still) f.engine.renderer.shake(1, 12);
    if (f.particles) for (let k = 0; k < fg.w; k++) f.particles.sparkle((fg.x + k) * TILE + 8, fg.y * TILE - 4, 4, TQ[3]);
    if (ev.script && first && !flagWasSet) this.queue.push(ev.script);
    else if (o.origin && Math.abs(fg.x - o.origin[0]) + Math.abs(fg.y - o.origin[1]) > 6) this.reveal(fg);
  }

  /** A floodgate far from its wheel opens on camera: pan, hold (confirm skips), back. */
  async reveal(fg) {
    const f = this.f, e = f.engine, cam = f.camera;
    if (!cam || !cam.panTo || !cam.returnTo || this.revealing) return;
    this.revealing = true;
    f.lockInput();
    try {
      await this.settled();
      await cam.panTo(fg.x * TILE + 16, fg.y * TILE, 40);
      for (let i = 0; i < 50 && !f.dead && !(e.input.pressed('confirm') || e.input.pressed('cancel')); i++) await e.waitFrames(1);
      if (!f.dead) await cam.returnTo(f.leader, 40);
    } finally { f.unlockInput(); this.revealing = false; }
  }

  /** Resolves once the band animation (if any) has finished. */
  settled() { return this.anim && this.anim.promise ? this.anim.promise : Promise.resolve(); }

  runDeferred() { const d = this.deferred; this.deferred = []; for (const fn of d) fn(); }

  finishAnim() {
    const a = this.anim;
    if (!a) { this.runDeferred(); return; }
    this.anim = null;
    this.wat = new Set(this.target);
    this.paintAll();
    this.runDeferred();
    if (a.done) a.done();
  }

  // ------------------------------------------------------------------ the wheel
  /** Confirm on a wheel: read its line the first time, check the crank, cycle the basin, wait for the water. */
  async turn(ent) {
    const f = this.f, e = f.engine, g = f.game, ev = ent.ev;
    if (!this.active || this.busy) return false;
    const w = this.m.wheels.find((r) => r.id === ent.id);
    if (!w) return false;
    const text = ev.text || (w.crank ? 'ep4_lock_wheel' : 'ep4_farm_wheel');
    if (g.counters && !g.counters[`read:${text}`]) {
      g.counters[`read:${text}`] = 1;
      await f.showBoxes(inspectBoxes(text, f.hasFlag));
      if (f.dead) return false;
    }
    if (w.crank && count(g, 'lock_crank') <= 0) {
      e.audio.sfx('door_locked');
      if (ent.prop) { ent.prop.offX = 1; e.after(3, () => { if (ent.prop) ent.prop.offX = 0; }); }
      if (ev.lockedText) await f.showBoxes(inspectBoxes(ev.lockedText, f.hasFlag));
      return false;
    }
    this.busy = true;
    try {
      const from = this.levels[w.b], to = nextLevel(from, this.m.basins[w.b].levels);
      e.audio.sfx('tide_wheel');
      this.levels = { ...this.levels, [w.b]: to };
      if (ent.prop) {
        this.map.setPropState(ent.prop, to);
        ent.prop.offY = -1;
        e.after(4, () => { if (ent.prop) ent.prop.offY = 0; });
      }
      if (f.particles) f.particles.sparkle(ent.x * TILE + 8, ent.y * TILE - 10, 3, TQ[3]);
      await e.waitFrames(6);
      this.apply({ origin: [ent.x, ent.y] });
      e.audio.sfx(to > from ? 'water_rise' : 'water_drain');
      refreshEntities(f);
      if (this.map.gated && (this.map.gated.length || this.map.gatedOverhead.length)) this.map.refreshGated(f.hasFlag);
      this.sig = this.signature();
      await this.settled();
      if (g.counters && !g.counters['tide:turned']) g.counters['tide:turned'] = 1;
    } finally { this.busy = false; }
    f.bark('first_tide');
    return true;
  }

  // ------------------------------------------------------------------ per frame
  update() {
    if (!this.active) return;
    const t0 = now();
    this.frame++;
    const f = this.f, m = this.m;
    if (this.dirty) { this.dirty = false; this.syncFlags(false); }
    // a block moved (a dam), a pontoon or seal appeared: the water follows
    if (!this.busy && !this.anim) {
      const sig = this.signature();
      if (sig !== this.sig) {
        this.sig = sig;
        const moved = [...f.entities.values()].find((e) => e.type === 'block' && e.present);
        this.apply({ origin: moved ? [moved.x, moved.y] : null });
        this.sig = this.signature();
      }
    }
    this.stepAnim();
    this.stepWash();
    // bobbing: floating pontoons and boats, one pixel (still under reduceMotion)
    if (!this.still && this.frame % BOB_FRAMES === 0) {
      const up = (this.frame / BOB_FRAMES) & 1;
      for (const p of m.pontoons) { const e = f.entities.get(p.id); if (e && e.prop && e.state === 'float') this.map.setPropState(e.prop, up ? 2 : 1); }
    }
    // the leader arrived somewhere: on a floating pontoon (Bram's word), in an open floodgate's doorway (its door)
    const L = f.leader;
    if (L && !L.moving) {
      const i = L.ty * m.W + L.tx;
      if (i !== this.lastCell) {
        this.lastCell = i;
        if (this.cls && this.cls.floats.has(i)) f.bark('first_float');
        for (const fg of m.floodgates) {
          const ent = f.entities.get(fg.id);
          if (ent && ent.present && ent.state === 'on' && fg.ev.to && L.ty === fg.y && L.tx >= fg.x && L.tx < fg.x + fg.w && !f.inputLocked && !f.pendingWarp) {
            const to = fg.ev.to;
            f.warpTo(to[0], to[1], to[2], to[3] || L.dir, 'door');
          }
        }
      }
    }
    // the Lantern over true ink under water (a `lantern: true` thing whose cell, or the one below it, is under water)
    if (!this.inkBarked && f.lantern > 0 && L) {
      for (const e of f.entities.values()) {
        if (!e.present || !e.ev || !e.ev.lantern) continue;
        if (Math.abs(e.x - L.tx) + Math.abs(e.y - L.ty) > 6) continue;
        const i = e.y * m.W + e.x;
        if (this.wat.has(i) || this.wat.has(i + m.W)) { this.inkBarked = true; f.bark('first_true_ink'); break; }
      }
    }
    // a floodgate's first-open scene, once the field is quiet
    if (this.queue.length && L && !L.moving && !f.inputLocked && !f.pendingWarp && f.engine.scene === f && !(f.cutscene && f.cutscene.running)) f.runScene(this.queue.shift());
    this.stats.updateMs = Math.round((now() - t0) * 1000) / 1000;
  }

  /** Flag lists of gates: a set flag turns its source on and the gate re-checks (sockets light on the Petition Gate). */
  syncFlags(quiet) {
    const f = this.f;
    for (const s of this.flagSrc) {
      const want = f.hasFlag(s.data.flag) ? 'on' : 'off';
      if (s.state === want) continue;
      s.state = want;
      fireTarget(f, s.ev.target, { quiet });
      const gate = f.entities.get(s.ev.target);
      if (!quiet && want === 'on' && gate && gate.prop && gate.prop.draw && f.particles) f.particles.sparkle(gate.prop.draw.dx + gate.prop.draw.w / 2, gate.prop.draw.dy + 14, 8, '#ffd27a');
    }
  }

  stepAnim() {
    const a = this.anim;
    if (!a) return;
    a.t++;
    const dirty = [];
    while (a.k < a.list.length && a.list[a.k][1] <= a.t) {
      const i = a.list[a.k][0];
      if (this.target.has(i)) this.wat.add(i); else this.wat.delete(i);
      dirty.push(i);
      a.k++;
    }
    if (dirty.length) this.paintCells(dirty);
    if (a.t >= BAND_FRAMES - 1 && a.k >= a.list.length) {
      this.anim = null;
      this.runDeferred();
      if (a.done) a.done();
    }
  }

  stepWash() {
    if (!this.washFx.length) return;
    const f = this.f, map = this.map;
    const keep = [];
    for (const w of this.washFx) {
      w.t++;
      const ent = f.entities.get(w.id);
      if (w.t === 0) {
        if (ent && ent.prop) map.setPropState(ent.prop, 1);
        f.engine.audio.sfx('seal_wash');
        if (f.particles) f.particles.burst('ember', w.x * TILE + 8, w.y * TILE - 6, 8, '#d8434a');
      }
      if (w.t === WASH_FRAMES) {
        if (ent && ent.prop) map.setPropState(ent.prop, 2);
        f.bark('first_wash');
      }
      if (w.t < WASH_FRAMES + 30) keep.push(w);
    }
    this.washFx = keep;
  }

  // ------------------------------------------------------------------ drawing
  ensureLayers() {
    if (this.layers || !this.active) return this.layers;
    const r = this.f.engine.renderer, m = this.m;
    if (!r || !r.createLayer) return null;
    const meta = this.map.db.terrains && this.map.db.terrains.tide_water;
    if (!meta) { this.f.warnOnce('ep4:tide_water', 'tide_water terrain missing (ep4 tiles not merged)'); return null; }
    const n = meta.anim ? Math.max(...meta.anim.frames) + 1 : 1;
    this.layers = [];
    for (let k = 0; k < n; k++) this.layers.push(r.createLayer(Math.max(1, m.W * TILE), Math.max(1, m.H * TILE)));
    this.waterMeta = meta;
    return this.layers;
  }

  paintAll() {
    if (!this.ensureLayers()) return;
    for (const L of this.layers) L.ctx.clearRect(0, 0, L.w, L.h);
    for (const i of this.wat) this.paintCell(i);
  }

  /** Repaint cells and their neighbours (the rims follow). */
  paintCells(cells) {
    if (!this.ensureLayers()) return;
    const m = this.m, seen = new Set();
    for (const i of cells) {
      const x = i % m.W, y = (i / m.W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= m.W || ny >= m.H) continue;
        const j = ny * m.W + nx;
        if (seen.has(j)) continue;
        seen.add(j);
        for (const L of this.layers) L.ctx.clearRect(nx * TILE, ny * TILE, TILE, TILE);
        if (this.wat.has(j)) this.paintCell(j);
      }
    }
  }

  paintCell(i) {
    const m = this.m, meta = this.waterMeta, img = this.map.sheet(meta.sheet);
    if (!img) return;
    const x = i % m.W, y = (i / m.W) | 0;
    const nb = {};
    for (const k in NB) {
      const nx = x + NB[k][0], ny = y + NB[k][1];
      nb[k] = nx < 0 || ny < 0 || nx >= m.W || ny >= m.H ? true : this.wat.has(ny * m.W + nx);
    }
    const qs = a2Quarters(nb);
    const px = x * TILE, py = y * TILE;
    for (let k = 0; k < this.layers.length; k++) {
      const g = this.layers[k].ctx, sx = meta.x + k * (meta.anim ? meta.anim.frameDx : 0);
      for (let q = 0; q < 4; q++) {
        const [qx, qy] = qs[q];
        const [ox, oy] = QUARTER_OFFSET[QUARTERS[q]];
        g.drawImage(img, sx + qx * 8, meta.y + qy * 8, 8, 8, px + ox, py + oy, 8, 8);
      }
    }
  }

  drawLow(r, t) {
    if (!this.active || !this.wat.size) return;
    if (!this.ensureLayers()) return;
    const meta = this.waterMeta, cam = this.f.camera;
    const seq = meta.anim ? meta.anim.frames : [0];
    const k = this.still ? 0 : seq[Math.floor((t * 1000) / (meta.anim ? meta.anim.ms || 240 : 240)) % seq.length];
    const L = this.layers[Math.min(this.layers.length - 1, k)];
    const sx = Math.max(0, cam.x), sy = Math.max(0, cam.y);
    const sw = Math.min(L.w - sx, r.W), sh = Math.min(L.h - sy, r.H);
    if (sw > 0 && sh > 0) r.drawLayer(L, sx, sy, sw, sh, sx, sy);
    if (this.washFx.length) this.drawInk(r);
    // lantern light lying on high water (the Mercy wing): the reflection piece under each chain
    const obj = this.map.db.objects && this.map.db.objects.lantern_reflection;
    if (obj && this.reflections.length) {
      const an = obj.anim, fr = !this.still && an ? an.frames[Math.floor((t * 1000) / (an.ms || 180)) % an.frames.length] : 0;
      for (const c of this.reflections) {
        if (!this.wat.has(c.i)) continue;
        r.image(this.map.sheet(obj.sheet), c.x * TILE, c.y * TILE, { sx: obj.rect[0] + fr * (an ? an.frameDx : 16), sy: obj.rect[1], sw: 16, sh: 16 });
      }
    }
  }

  /** Under the props: the seal's red ink spreading through the water from the cell below it, thinning as it goes. */
  drawInk(r) {
    const m = this.m;
    for (const w of this.washFx) {
      if (w.t < 0) continue;
      const rec = m.forgeries.find((f) => f.id === w.id);
      const at = rec && rec.wet >= 0 ? rec.wet : w.y * m.W + w.x;
      const cx = (at % m.W) * TILE + 8, cy = ((at / m.W) | 0) * TILE + 4;
      const k = Math.min(1, w.t / (WASH_FRAMES + 30));
      const fade = w.t < 6 ? w.t / 6 : 1 - k;
      for (let n = 0; n < 12; n++) {
        const a = n * 0.7 + 0.3, reach = 3 + k * (10 + (n % 3) * 6);
        const x = Math.round(cx + Math.cos(a) * reach * 1.4), y = Math.round(cy + Math.abs(Math.sin(a)) * reach);
        const sz = n % 3 === 0 ? 4 : 3;
        r.withAlpha(Math.max(0, fade * 0.9), () => {
          r.rect(x - 1, y - 1, sz + 1, sz, '#a3202c');
          if (((x + y + (w.t >> 2)) & 1) === 0) r.rect(x, y - 1, 1, 1, '#d8434a');
        });
      }
    }
  }

  /** Over the props: the waterline up the bottom row of a wall face (to its level's mark), the red ink cloud of a wash. */
  drawHigh(r, t) {
    if (!this.active) return;
    const m = this.m, cam = this.f.camera;
    const x0 = Math.floor(cam.x / TILE) - 1, y0 = Math.floor(cam.y / TILE) - 1, x1 = x0 + 26, y1 = y0 + 16;
    const ph = this.still ? 0 : (this.frame >> 4) & 3;
    for (const s of this.strips) {
      if (s.x < x0 || s.x > x1 || s.y < y0 || s.y > y1 || !this.wat.has(s.i)) continue;
      const depth = Math.max(1, Math.min(2, this.levels[m.ids[m.basinAt[s.i]]] - m.height[s.i]));
      const top = STRIP_TOP[depth], px = s.x * TILE, py = s.y * TILE;
      r.withAlpha(0.6, () => r.rect(px, py + top + 2, TILE, TILE - top - 2, TQ[1]));
      r.withAlpha(0.68, () => r.rect(px, py + top + 1, TILE, 1, TQ[2]));
      r.rect(px, py + top, TILE, 1, TQ[3]);
      for (let k = (s.x * 3 + ph) & 3; k < TILE; k += 4) r.rect(px + k, py + top, 1, 1, TQ[4]);
    }
    // the red ink cloud: the seal's wax runs off into the water and spreads
    const obj = this.map.db.objects && this.map.db.objects.seal_wash;
    for (const w of this.washFx) {
      if (w.t < 0) continue;
      const k = Math.min(1, w.t / (WASH_FRAMES + 30));
      const alpha = w.t < 8 ? w.t / 8 : 1 - k * k;
      const rise = Math.round(k * 10);
      if (obj) {
        const an = obj.anim, fr = an && !this.still ? an.frames[(w.t >> 3) % an.frames.length] : 0;
        r.image(this.map.sheet(obj.sheet), w.x * TILE, w.y * TILE + 2 - rise, { sx: obj.rect[0] + fr * (an ? an.frameDx : 16), sy: obj.rect[1], sw: 16, sh: 16, alpha: Math.max(0, alpha) });
        if (w.t > 10) r.image(this.map.sheet(obj.sheet), w.x * TILE + (w.t & 16 ? -3 : 3), w.y * TILE + 10, { sx: obj.rect[0], sy: obj.rect[1], sw: 16, sh: 16, alpha: Math.max(0, alpha * 0.6) });
      } else r.withAlpha(Math.max(0, alpha * 0.6), () => r.rect(w.x * TILE + 2, w.y * TILE + 2 - rise, 12, 10, '#a3202c'));
    }
  }

  /** Dark maps: the lantern reflections on high water are the light (warm, small). */
  lights() {
    const out = [];
    if (!this.active) return out;
    for (const c of this.reflections) if (this.wat.has(c.i)) out.push({ x: c.x * TILE + 8, y: c.y * TILE + 8, r: 30, color: '#eba85a', kind: 'warm' });
    return out;
  }

  debugState() {
    if (!this.active) return { active: false };
    const f = this.f, m = this.m, cls = this.cls || { flooded: new Set(), floats: new Set(), grounded: new Set(), sunk: new Set() };
    const xy = (s) => [...s].sort((a, b) => a - b).map((i) => `${i % m.W},${(i / m.W) | 0}`);
    return {
      active: true, levels: { ...this.levels }, washed: [...this.washed].sort(), latched: [...this.latched].sort(),
      water: this.target.size, drawn: this.wat.size, flooded: cls.flooded.size, floats: xy(cls.floats), grounded: xy(cls.grounded), sunk: xy(cls.sunk),
      gates: m.floodgates.map((g) => `${g.id}:${(f.entities.get(g.id) || {}).state}`), anim: this.anim ? this.anim.t : null, busy: this.busy,
      saved: (f.game.washed && f.game.washed[this.map.id]) || [], applyMs: this.stats.ms, maxApplyMs: this.stats.maxMs, paintMs: this.stats.paintMs, updateMs: this.stats.updateMs,
    };
  }
}

function allBasinCells(m) { const out = []; for (const id of m.ids) out.push(...m.basins[id].cells); return out; }
function targetsOf(ev) { return ev.target == null ? [] : Array.isArray(ev.target) ? ev.target : [ev.target]; }
export function closedSprite(ev) { return ev.sprite ? `${ev.sprite.replace(/_(closed|open)$/, '')}_closed` : 'floodgate_closed'; }
export function openSprite(ev) { return ev.sprite ? `${ev.sprite.replace(/_(closed|open)$/, '')}_open` : 'floodgate_open'; }
export { WHEEL_SPRITE, POST_SPRITE, tideFlag, isTideFlag };
