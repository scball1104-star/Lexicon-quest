// Quench channels on the field (E3-world, EPISODE3_PLAN 5.1): spouts, sluices, troughs, slag and crust, basins.
// Traced by the pure ./flow.js; attached to the field by ./index.js (never in the first download).
//
//   const q = new Quench(field);
//   q.reset()           after the map's entities are built: flow grid, saved crust, flag gates, a quiet trace
//   q.update()          per frame: re-trace on change, the cooling front, a basin's first-fill scene, barks
//   q.drawLow(r, t)     after the ground: wet troughs, water over crust, fresh crust and rims, puddles
//   q.drawHigh(r, t)    after the props: wall splashes, dam foam
//   q.lights()          dark maps: molten slag is the light
//
// State: crust is permanent (game.quenched[mapId], sorted cell indices); latched basins live in game.opened (and their
// flag); sluices and blocks reset on re-entry, as mirrors and blocks do.

import { traceFlow, quenchCells, cellFlow } from './flow.js';
import { DIRV } from '../beam.js';
import { TILE } from '../tilemap.js';
import { fireTarget, entitiesAt, SOURCE_TYPES } from '../events.js';
import { markOpened, isOpened } from '../../game/state.js';

export const WATER_TYPES = new Set(['spout', 'sluice', 'basin']);
/** Entity types whose position, state or presence can change where water goes (the re-trace signature). */
const WATCH = new Set(['spout', 'sluice', 'basin', 'block', 'gate', 'locked_door', 'pot', 'chest', 'shelf', 'mirror', 'object', 'flagsrc']);
const FRESH = 120;               // frames a cooled cell keeps its bright cracks
const FRONT_STEP = 2;            // frames per ring of the cooling front
const MAX_SLAG_LIGHTS = 24;
const SLAG_LIGHT_R = 28;
const CRUST_IDS = ['slag_crust', 'slag_crust_b', 'slag_crust_c'];
const W_DEEP = '#2a64c8', W_MID = '#4aa6f0', W_HI = '#bfeaff';

SOURCE_TYPES.add('basin');
SOURCE_TYPES.add('flagsrc');

export class Quench {
  constructor(field) { this.f = field; this.clear(); }

  clear() {
    this.active = false;
    this.result = null;
    this.wet = new Set();
    this.grid = null;            // Int8: 0 none, 1 channel, 2 slag
    this.arms = null;            // per cell: arms string or null
    this.wetArt = null;          // per cell: the tiles.json entry with a `wet` frame, or null
    this.crust = new Set();      // crusted cell indices on this map
    this.fresh = new Map();      // cell index -> frame it cooled
    this.front = [];             // [{ i, x, y, d, t0 }] cells still to cool, in order
    this.queue = [];             // basin scripts waiting for a quiet moment
    this.sig = '';
    this.dirty = false;
    this.frame = 0;
    this.flagSrc = [];
    this.slagCells = [];         // candidate light cells (checkerboard), molten ones only at use
    this.ribbons = [];           // water drawn over cells that have no wet trough art: [{ x, y, h: bool, v: bool }]
    this.stats = { traces: 0, ms: 0 };
  }

  get map() { return this.f.map; }
  idx(x, y) { return y * this.map.w + x; }

  /** The map was (re)built: flow grid, saved crust, flag-gate sources, then a quiet trace. */
  reset() {
    this.clear();
    const f = this.f, map = f.map;
    if (!map) return;
    const evs = (map.mod && map.mod.events) || [];
    this.buildFlagSources();
    this.buildGrid();
    const hasWater = evs.some((ev) => ev && WATER_TYPES.has(ev.type));
    this.active = hasWater || this.slagCells.length > 0 || this.flagSrc.length > 0;
    if (!this.active) return;
    this.applySavedCrust();
    this.recompute({ quiet: true });
    // latched basins (flag or opened) start full: their gates open now, quietly; flag lists too
    for (const ent of f.entities.values()) if (ent.present && ent.type === 'basin' && ent.state === 'on') for (const t of targetsOf(ent.ev)) fireTarget(f, t, { quiet: true });
    for (const s of this.flagSrc) fireTarget(f, s.ev.target, { quiet: true });
    this.sig = this.signature();
    this.dirty = false;
  }

  /** `gate` events with `flags: [...]`: one pseudo source entity per flag (state on while the flag is set). */
  buildFlagSources() {
    const f = this.f;
    for (const ent of [...f.entities.values()]) {
      if (ent.type !== 'gate' || !Array.isArray(ent.ev.flags)) continue;
      for (const flag of ent.ev.flags) {
        const s = { ev: { target: ent.id }, id: `${ent.id}~${flag}`, type: 'flagsrc', x: -1, y: -1, cells: [], prop: null, actor: null,
          state: f.hasFlag(flag) ? 'on' : 'off', present: true, data: { flag } };
        f.entities.set(s.id, s);
        this.flagSrc.push(s);
      }
    }
  }

  buildGrid() {
    const map = this.map, W = map.w, H = map.h, db = map.db;
    this.grid = new Int8Array(W * H);
    this.arms = new Array(W * H).fill(null);
    this.wetArt = new Array(W * H).fill(null);
    this.slagCells = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) this.gridCell(x, y, db);
    // a lone slag cell (F3 Home's plug) off the checkerboard still gets its light: the hazard is the lamp
    for (let y = 0; y < H; y++) for (let x = (y + 1) & 1; x < W; x += 2) {
      const i = y * W + x;
      if (this.grid[i] === 2 && ![[0, -1], [1, 0], [0, 1], [-1, 0]].some(([dx, dy]) => this.slagAt(x + dx, y + dy))) this.slagCells.push(i);
    }
  }
  gridCell(x, y, db = this.map.db) {
    const map = this.map, i = this.idx(x, y);
    const ids = map.idsAt(x, y);
    const c = cellFlow(db, map.terrainAt(x, y), ids);
    this.grid[i] = c.flow === 'slag' ? 2 : c.flow ? 1 : 0;
    this.arms[i] = c.arms;
    let art = null;
    for (const id of ids) { const m = db.tiles[id]; if (m && m.wet) art = m; }
    this.wetArt[i] = art;
    if (c.flow === 'slag' && ((x + y) & 1) === 0) this.slagCells.push(i);
  }

  flowAt(x, y) { const v = this.grid[this.idx(x, y)]; return v === 2 ? 'slag' : v === 1 ? 'channel' : null; }

  /** Crust saved for this map (game.quenched) goes down quietly before the first trace. */
  applySavedCrust() {
    const g = this.f.game, list = g.quenched && g.quenched[this.map.id];
    if (!Array.isArray(list) || !list.length) return;
    const W = this.map.w;
    const cells = [];
    for (const i of list) {
      const x = i % W, y = (i / W) | 0;
      if (!this.map.inBounds(x, y) || this.grid[i] !== 2) continue;
      cells.push([x, y]);
    }
    this.crustCells(cells);
  }

  /** Lay crust on these cells now (overlay, collision, flow grid) and repaint them in one pass. */
  crustCells(cells, freshAt = null) {
    if (!cells.length) return;
    const map = this.map;
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    for (const [x, y] of cells) {
      const i = this.idx(x, y);
      if (this.crust.has(i)) continue;
      const id = CRUST_IDS[hash(x, y) % 3];
      const tid = map.db.tiles[id] ? id : 'slag_crust';
      (map.overlays[y][x] || (map.overlays[y][x] = [])).push(tid);
      map.recomputeCell(x, y);
      this.crust.add(i);
      this.grid[i] = 1;
      if (freshAt != null) this.fresh.set(i, freshAt);
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    if (x1 >= 0) map.repaint(Math.max(0, x0), Math.max(0, y0), Math.min(map.w - 1, x1), Math.min(map.h - 1, y1));
  }

  /** Remember crust for good (sorted, unique). */
  persist(cells) {
    const g = this.f.game, id = this.map.id;
    g.quenched = g.quenched || {};
    const set = new Set(g.quenched[id] || []);
    for (const [x, y] of cells) set.add(this.idx(x, y));
    g.quenched[id] = [...set].sort((a, b) => a - b);
  }

  markDirty() { if (this.active) this.dirty = true; }

  parts() {
    const sources = [], sluices = [], basins = [];
    for (const ent of this.f.entities.values()) {
      if (!ent.present || (ent.data && ent.data.concealed)) continue;
      if (ent.type === 'spout') sources.push({ id: ent.id, x: ent.x, y: ent.y, dir: ent.ev.dir || 'down' });
      else if (ent.type === 'sluice') sluices.push({ id: ent.id, x: ent.x, y: ent.y, state: ent.state ? 1 : 0 });
      else if (ent.type === 'basin') basins.push({ id: ent.id, x: ent.x, y: ent.y, face: ent.ev.face || null });
    }
    return { sources, sluices, basins };
  }

  /** What water reads, as one string: a change re-traces. */
  signature() {
    let s = '';
    for (const e of this.f.entities.values()) {
      if (!WATCH.has(e.type)) continue;
      s += `${e.id}${e.present ? 1 : 0}${e.x},${e.y}${e.state}${e.data && e.data.concealed ? 'c' : ''}${e.data && e.data.sliding ? 's' : ''}|`;
    }
    return s;
  }

  /** Trace now and apply it: basins (gates, latch, flag, script), the cooling front, wet cells. o.quiet: map load. */
  recompute(o = {}) {
    const f = this.f, map = this.map;
    if (!map || !this.active) return null;
    this.dirty = false;
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    const res = traceFlow({
      w: map.w, h: map.h,
      flow: (x, y) => this.flowAt(x, y),
      arms: (x, y) => this.arms[this.idx(x, y)],
      code: (x, y) => map.codeAt(x, y),
      ...this.parts(),
    });
    const before = this.wet.size;
    this.result = res;
    this.wet = res.wet;
    this.buildRibbons(res);
    // basins
    for (const ent of f.entities.values()) {
      if (!ent.present || ent.type !== 'basin') continue;
      const want = res.fullBasins.has(ent.id) || !!ent.data.latched;
      if (want !== (ent.state === 'on')) this.setBasin(ent, want, o);
    }
    // slag the water reached: the whole body cools, as a front from the entry cell
    const queued = new Set(this.front.map((c) => c.i));
    const cells = quenchCells(res, { w: map.w, h: map.h, flow: (x, y) => this.flowAt(x, y), skip: (x, y) => this.crust.has(this.idx(x, y)) || queued.has(this.idx(x, y)) });
    if (cells.length) {
      const start = this.frame + (o.quiet ? 24 : 4);
      for (const c of cells) this.front.push({ i: this.idx(c.x, c.y), x: c.x, y: c.y, at: start + c.d * FRONT_STEP });
      this.front.sort((a, b) => a.at - b.at);
      this.persist(cells.map((c) => [c.x, c.y]));
      this.frontSound = true;
    }
    if (!o.quiet && res.wet.size > before) f.engine.audio.sfx('water_flow', { volume: 0.7 });
    if (t0) { this.stats.traces++; this.stats.ms = Math.round((performance.now() - t0) * 1000) / 1000; }
    return res;
  }

  /** Cells to paint water on that have no wet trough frame (crust, slag under the front): straight or turning runs. */
  buildRibbons(res) {
    const out = new Map();
    for (const s of res.streams) {
      for (const c of s.cells) {
        const i = this.idx(c.x, c.y);
        if (!res.wet.has(`${c.x},${c.y}`) || this.wetArt[i]) continue;
        if (entitiesAt(this.f, c.x, c.y).some((e) => e.present && (e.type === 'sluice' || e.type === 'basin'))) continue;
        const r = out.get(i) || { x: c.x, y: c.y, sides: new Set() };
        if (c.from) r.sides.add(c.from);
        if (c.to) r.sides.add(c.to);
        out.set(i, r);
      }
    }
    this.ribbons = [...out.values()];
  }

  setBasin(ent, on, o = {}) {
    const f = this.f, ev = ent.ev, map = this.map;
    ent.state = on ? 'on' : 'off';
    if (ent.prop) basinFrame(map, ent.prop, on, f.engine.settings && f.engine.settings.reduceMotion);
    if (on) {
      const first = !ent.data.everFull;
      ent.data.everFull = true;
      if (ev.latch) { ent.data.latched = true; markOpened(f.game, map.id, ent.id); }
      const flagWasSet = !!(ev.flag && f.hasFlag(ev.flag));
      if (ev.flag && !flagWasSet) f.setFlag(ev.flag);
      if (!o.quiet) {
        f.engine.audio.sfx(ent.prop && /wheel/.test(ent.prop.t) ? 'wheel_turn' : 'water_flow');
        if (f.particles) f.particles.sparkle(ent.x * TILE + 8, ent.y * TILE - 2, 5, '#bfeaff');
        if (ev.script && first && !flagWasSet) this.queue.push(ev.script);
        else if (first) f.bark('first_basin');
      }
    }
    for (const t of targetsOf(ev)) {
      const g = f.entities.get(t);
      const was = g && g.state;
      fireTarget(f, t, { quiet: !!o.quiet });
      // a hot grate cooled: steam and the hiss
      if (!o.quiet && g && g.state === 'open' && was !== 'open' && /grate/.test(g.ev.sprite || '') && f.ep3fx) {
        f.engine.audio.sfx('quench_hiss');
        for (const [cx, cy] of g.cells) f.ep3fx.steam(cx * TILE + 8, cy * TILE + 4, 5);
        // E3-fixes-world (PLAYTEST_REVIEW_5 #7): a grate more than 6 tiles from its basin opens on camera
        if (on && !ev.script && Math.abs(g.x - ent.x) + Math.abs(g.y - ent.y) > 6) this.reveal(g);
      }
    }
  }

  /** A receptor-to-door reveal: pan to the opened gate, hold, and back (input held; confirm or cancel skips the hold). */
  async reveal(g) {
    const f = this.f, e = f.engine, cam = f.camera;
    if (!cam || !cam.panTo || !cam.returnTo || this.revealing) return;
    this.revealing = true;
    f.lockInput();
    try {
      await e.waitFrames(8);
      await cam.panTo(g.x * TILE + 8, g.y * TILE + 8, 40);
      for (let i = 0; i < 50 && !f.dead && !(e.input.pressed('confirm') || e.input.pressed('cancel')); i++) await e.waitFrames(1);
      if (!f.dead) await cam.returnTo(f.leader, 40);
    } finally { f.unlockInput(); this.revealing = false; }
  }

  /** Flag lists of gates: a set flag turns its source on and the gate re-checks (sockets light on the Bell Gate). */
  syncFlags(quiet) {
    const f = this.f;
    for (const s of this.flagSrc) {
      const want = f.hasFlag(s.data.flag) ? 'on' : 'off';
      if (s.state === want) continue;
      s.state = want;
      const gate = f.entities.get(s.ev.target);
      fireTarget(f, s.ev.target, { quiet });
      if (!quiet && want === 'on' && gate && gate.prop) {
        f.engine.audio.sfx('oath_ring');
        const d = gate.prop.draw;
        if (d && f.particles) f.particles.sparkle(d.dx + d.w / 2, d.dy + 14, 8, '#ffd27a');
      }
    }
  }

  takeScript() { return this.queue.length ? this.queue.shift() : null; }

  update() {
    if (!this.active) return;
    this.frame++;
    const f = this.f;
    if (this.dirty) { this.syncFlags(false); if (this.gridDirty) { this.gridDirty = false; this.buildGrid(); for (const i of this.crust) this.grid[i] = 1; } }
    const sig = this.signature();
    if (sig !== this.sig || this.dirty) { this.sig = sig; this.recompute(); this.sig = this.signature(); }
    // the cooling front
    if (this.front.length && this.front[0].at <= this.frame) {
      const now = [];
      while (this.front.length && this.front[0].at <= this.frame) now.push(this.front.shift());
      this.crustCells(now.map((c) => [c.x, c.y]), this.frame);
      const fx = f.ep3fx;
      if (this.frontSound) { this.frontSound = false; f.engine.audio.sfx('quench_hiss'); }
      if (fx) for (let k = 0; k < now.length; k += 2) fx.steam(now[k].x * TILE + 8, now[k].y * TILE + 6, 2);
      if (!this.front.length) f.bark('first_quench');
    }
    for (const [i, t] of this.fresh) if (this.frame - t > FRESH) this.fresh.delete(i);
    // the first sluice the party faces earns Bram's word
    const p = f.prompt;
    if (p && p.ent && p.ent.type === 'sluice' && !p.ent.ev.fixed && !f.game.counters['bark:first_sluice']) f.bark('first_sluice');
    // a basin's first-fill scene, once the field is quiet
    const L = f.leader;
    if (this.queue.length && L && !L.moving && !f.inputLocked && !f.pendingWarp && f.engine.scene === f && !(f.cutscene && f.cutscene.running)) f.runScene(this.takeScript());
  }

  // ------------------------------------------------------------------ drawing
  drawLow(r, t) {
    if (!this.active) return;
    const f = this.f, map = this.map, cam = f.camera, W = map.w;
    const motion = !(f.engine.settings && f.engine.settings.reduceMotion);
    const x0 = Math.max(0, (cam.x / TILE) | 0), y0 = Math.max(0, (cam.y / TILE) | 0);
    const x1 = Math.min(W - 1, ((cam.x + r.W) / TILE) | 0), y1 = Math.min(map.h - 1, ((cam.y + r.H) / TILE) | 0);
    const ms = t * 1000;
    // wet troughs: the tile's wet frames over the dry one
    for (const k of this.wet) {
      const c = k.indexOf(','), x = +k.slice(0, c), y = +k.slice(c + 1);
      if (x < x0 || x > x1 || y < y0 || y > y1) continue;
      const m = this.wetArt[y * W + x];
      if (!m) continue;
      const wv = m.wet, an = wv.anim;
      const fr = motion && an ? an.frames[Math.floor(ms / (an.ms || 160)) % an.frames.length] : 0;
      r.image(map.sheet(m.sheet), x * TILE, y * TILE, { sx: wv.x + fr * (an ? an.frameDx : 16), sy: wv.y, sw: 16, sh: 16 });
    }
    // crust: rims where molten slag still touches it, bright cracks while fresh
    const T = map.db.tiles;
    for (const i of this.crust) {
      const x = i % W, y = (i / W) | 0;
      if (x < x0 || x > x1 || y < y0 || y > y1) continue;
      const fresh = this.fresh.has(i);
      const mask = (this.slagAt(x, y - 1) ? 1 : 0) | (this.slagAt(x + 1, y) ? 2 : 0) | (this.slagAt(x, y + 1) ? 4 : 0) | (this.slagAt(x - 1, y) ? 8 : 0);
      const id = mask ? (fresh ? 'slag_crust_rim_fresh' : 'slag_crust_rim') : fresh ? 'slag_crust_fresh' : null;
      const m = id && T[id];
      if (!m) continue;
      const sx = mask ? m.x + (mask % 8) * 16 : m.x, sy = mask ? m.y + ((mask / 8) | 0) * 16 : m.y;
      r.image(map.sheet(m.sheet), x * TILE, y * TILE, { sx, sy, sw: 16, sh: 16 });
    }
    // water running over crust (and slag under the front): a shallow channel of light blue
    const ph = motion ? (this.frame >> 3) & 3 : 0;
    for (const rb of this.ribbons) {
      if (rb.x < x0 || rb.x > x1 || rb.y < y0 || rb.y > y1) continue;
      drawRibbon(r, rb, ph);
    }
    // puddles where water ran out onto the floor
    if (this.result) {
      const pm = T.splash_puddle;
      for (const s of this.result.splashes) {
        if (!s.floor || !pm || s.x < x0 || s.x > x1 || s.y < y0 || s.y > y1) continue;
        const fr = motion && pm.anim ? pm.anim.frames[Math.floor(ms / (pm.anim.ms || 200)) % pm.anim.frames.length] : 0;
        r.image(map.sheet(pm.sheet), s.x * TILE, s.y * TILE, { sx: pm.x + fr * 16, sy: pm.y, sw: 16, sh: 16 });
      }
    }
  }

  slagAt(x, y) { return this.map.inBounds(x, y) && this.grid[this.idx(x, y)] === 2; }

  /** Over the props: spray where water meets a wall or a basin's back, foam against a dam. */
  drawHigh(r) {
    if (!this.active || !this.result) return;
    const motion = !(this.f.engine.settings && this.f.engine.settings.reduceMotion);
    const k = motion ? (this.frame >> 2) & 1 : 0;
    for (const s of this.result.splashes) {
      if (s.floor || !DIRV[s.dir]) continue;
      const x = s.x * TILE + 8 + DIRV[s.dir][0] * 7, y = s.y * TILE + 8 + DIRV[s.dir][1] * 7;
      r.rect(x - 1, y - 1 - k, 2, 2, W_HI);
      r.rect(x - 3 + k, y + 1, 1, 1, '#ffffff');
      r.rect(x + 2 - k, y - 2, 1, 1, '#ffffff');
    }
    for (const d of this.result.dams) {
      const x = (d.x - DIRV[d.dir][0]) * TILE + 8 + DIRV[d.dir][0] * 6, y = (d.y - DIRV[d.dir][1]) * TILE + 8 + DIRV[d.dir][1] * 6;
      const horiz = d.dir === 'left' || d.dir === 'right';
      if (horiz) { r.rect(x, y - 3, 1, 6, W_HI); r.rect(x - DIRV[d.dir][0], y - 2 + k, 1, 1, '#ffffff'); }
      else { r.rect(x - 3, y, 6, 1, W_HI); r.rect(x - 2 + k, y - DIRV[d.dir][1], 1, 1, '#ffffff'); }
    }
    this.drawBellSockets(r);
  }

  /** The closed Bell Gates on this map, with their drawn rect (CRITIQUE_5 #6). */
  bellGates() {
    const out = [];
    for (const e of this.f.entities.values()) if (e.present && e.type === 'gate' && e.state !== 'open' && e.prop && e.prop.draw && /^bell_gate/.test(e.prop.t)) out.push(e);
    return out;
  }

  /**
   * CRITIQUE_5 #6: the Bell Gate's three oath sockets read at phone scale in F3's dark. An unlit socket gets a bronze rim
   * round a near-black well; a lit one a pulsing gold halo (and a light, below). Sockets sit 10 px apart in the 48 px frame.
   */
  drawBellSockets(r) {
    const pulse = this.f.engine.settings && this.f.engine.settings.reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(this.frame / 12);
    for (const g of this.bellGates()) {
      const d = g.prop.draw, lit = g.prop.state | 0;
      for (let i = 0; i < 3; i++) {
        const x = d.dx + 10 + i * 10, y = d.dy + 6;
        if (i < lit) {
          r.withAlpha(0.35 + 0.35 * pulse, () => { r.rect(x - 1, y - 1, 12, 1, '#fff0b0'); r.rect(x - 1, y + 12, 12, 1, '#fff0b0'); r.rect(x - 1, y, 1, 12, '#fff0b0'); r.rect(x + 10, y, 1, 12, '#fff0b0'); });
        } else {
          r.rect(x, y, 10, 1, '#d89a52'); r.rect(x, y + 11, 10, 1, '#8a5a2c'); r.rect(x, y + 1, 1, 10, '#b87a3e'); r.rect(x + 9, y + 1, 1, 10, '#b87a3e');
          r.withAlpha(0.4, () => r.rect(x + 1, y + 1, 8, 10, '#06040a'));
          r.rect(x + 4, y + 8, 2, 1, '#d89a52');   // the empty clapper hook: a socket waiting for its bell
        }
      }
    }
  }

  /** Dark maps: a warm light on every second molten slag cell (checkerboard), at most 24, nearest the view first. */
  lights() {
    const out = [];
    const f = this.f;
    if (!this.active || !(f.lighting && f.lighting.dark > 0.01)) return out;
    // the Bell Gate: a soft light on its socket row, and a gold one on each lit socket (CRITIQUE_5 #6)
    for (const g of this.bellGates()) {
      const d = g.prop.draw;
      out.push({ x: d.dx + 24, y: d.dy + 12, r: 30, color: '#b08850', kind: 'warm' });
      for (let i = 0; i < (g.prop.state | 0); i++) out.push({ x: d.dx + 15 + i * 10, y: d.dy + 12, r: 20, color: '#ffd27a', kind: 'warm' });
    }
    if (!this.slagCells.length) return out;
    const W = this.map.w, cam = f.camera, m = SLAG_LIGHT_R;
    const list = [];
    for (const i of this.slagCells) {
      if (this.grid[i] !== 2) continue;
      const x = (i % W) * TILE + 8, y = ((i / W) | 0) * TILE + 8;
      if (x < cam.x - m || y < cam.y - m || x > cam.x + 384 + m || y > cam.y + 216 + m) continue;
      list.push(x, y);
    }
    // more than the budget in view: an even spread (a big lake stays lit edge to edge, not just near the middle)
    const n = list.length >> 1, step = Math.max(1, n / MAX_SLAG_LIGHTS);
    for (let k = 0, o = out.length; k < n && out.length - o < MAX_SLAG_LIGHTS; k += step) {
      const j = (k | 0) << 1;
      out.push({ x: list[j], y: list[j + 1], r: SLAG_LIGHT_R, color: '#e06b39', kind: 'warm', slag: true });
    }
    return out;
  }

  debugState() {
    if (!this.active) return { active: false };
    const res = this.result;
    const ents = [...this.f.entities.values()].filter((e) => e.present);
    return {
      active: true,
      streams: res ? res.streams.map((s) => ({ id: s.id, cells: s.cells.length, end: s.end })) : [],
      wet: this.wet.size, wetCells: [...this.wet],
      basins: ents.filter((e) => e.type === 'basin').map((e) => `${e.id}:${e.state}`),
      sluices: ents.filter((e) => e.type === 'sluice').map((e) => `${e.id}@${e.x},${e.y}:${e.state}`),
      gates: ents.filter((e) => e.type === 'gate').map((e) => `${e.id}:${e.state}`),
      crust: this.crust.size, front: this.front.length, queue: [...this.queue],
      splashes: res ? res.splashes.length : 0, dams: res ? res.dams.map((d) => `${d.x},${d.y}`) : [],
      saved: (this.f.game.quenched && this.f.game.quenched[this.map.id]) || [], traceMs: this.stats.ms,
    };
  }
}

function targetsOf(ev) { return ev.target == null ? [] : Array.isArray(ev.target) ? ev.target : [ev.target]; }
function hash(x, y) { return ((x * 73856093) ^ (y * 19349663)) >>> 0; }

/** A basin's art by state: empty, or full (its glint cycle unless reduceMotion). The wheel turns through turnAnim. */
export function basinFrame(map, p, on, still) {
  map.setPropState(p, on ? 1 : 0);
  const m = map.db.objects[p.t];
  if (on && m && m.fullAnim && p.draw && !still) { p.draw.sx = m.rect[0]; p.draw.anim = m.fullAnim; }
}

/** Water over a cell without trough art: a 6 px channel to each side it runs through, a glint that moves. */
function drawRibbon(r, rb, ph) {
  const px = rb.x * TILE, py = rb.y * TILE, cx = px + 8, cy = py + 8;
  const s = rb.sides;
  const seg = (x, y, w, h) => { r.rect(x, y, w, h, W_DEEP); };
  if (s.has('left') || s.has('right') || (!s.has('up') && !s.has('down'))) {
    const xa = s.has('left') ? px : cx - 3, xb = s.has('right') ? px + 16 : cx + 3;
    seg(xa, cy - 3, xb - xa, 6);
    r.rect(xa, cy - 2, xb - xa, 3, W_MID);
    for (let x = xa + ((ph * 4) % 8); x < xb; x += 8) r.rect(x, cy - 2, 2, 1, W_HI);
  }
  if (s.has('up') || s.has('down')) {
    const ya = s.has('up') ? py : cy - 3, yb = s.has('down') ? py + 16 : cy + 3;
    seg(cx - 3, ya, 6, yb - ya);
    r.rect(cx - 2, ya, 3, yb - ya, W_MID);
    for (let y = ya + ((ph * 4) % 8); y < yb; y += 8) r.rect(cx - 2, y, 1, 2, W_HI);
  }
}
