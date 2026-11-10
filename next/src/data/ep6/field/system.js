// Gust lanes on the field (E6-world, docs/EPISODE6_PLAN.md 4.4 and 5.1): the wind a map's `wind` block declares, its vanes and
// mooring posts. The rule itself is the pure ./wind.js; ./events.js attaches this to a field (field.wind) and registers the
// event types. Never in the first download (the ep6 pack).
//
//   const w = new Wind(field);
//   w.reset()               after the map's entities are built: the authored state, the collision overrides, vane frames,
//                           the rescue of a party saved on a calm cell, a pending carry for one saved mid-lane
//   w.update()              per frame: the follower settle after a landing, the swing animation, the held-key release
//   w.arrived(orig)         the leader finished a step (field.onLeaderArrived): start, continue or end a ride
//   w.mayEnter(nx, ny)      the leader may step onto this cell now (a live lane cell): field.canStep for the leader only
//   w.holding(dir)          a direction held through a ride and not yet released (field.tryLeaderStep refuses it)
//   w.turnVane(ent)         confirm on a vane (async): canTurn, the 20-frame swing, the pan to far lanes that changed
//   w.turn(group, o)        turn a group now (vanes and scripts)
//   w.drawLow(r, t)         after the ground, under the actors: lane bodies and streaks, posts, chevrons
//
// Collision: every cell that is a lane in any state stays `void` on map.base (one override per cell, re-applied whenever the
// map recomputes that cell), so enemies and walkers never enter a lane; only the leader may, by a step from input. State: the
// turned groups reset to the authored lanes on every arrival (the entities are rebuilt). No new save field.

import { compile, live, follow, canTurn, toggled, vaneArrow, changed, maskOf, stateOf, DXY, DIR_NAMES } from './wind.js';
import { ensureArt, paintLaneBody, paintDuctBody, paintStreaks, paintChevron, paintVaneHead, SHEET } from './art.js';
import { TILE } from '../../../world/tilemap.js';
import { RUN_FRAMES } from '../../../world/actors.js';
import { setPosition } from '../../../game/state.js';
import { a2Quarters, QUARTERS, QUARTER_OFFSET } from '../../../world/autotile.js';

/** Frames per cell of a ride: RUN pace, so the camera (which follows the leader) always keeps up. */
export const RIDE_FRAMES = RUN_FRAMES;
export const SWING_FRAMES = 20;
export const FAR_TILES = 6;
const STREAK_MS = 120;
const POST_MS = 160;
const NB4 = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] };
const NB8 = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0], NE: [1, -1], NW: [-1, -1], SE: [1, 1], SW: [-1, 1] };
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const round3 = (v) => Math.round(v * 1000) / 1000;
/** The first-time bark of a ride on a map of this `wind.kind`. */
const RIDE_BARK = { open: 'first_ride', duct: 'first_duct', ring: 'first_ring' };

export class Wind {
  constructor(field) { this.f = field; this.clear(); }

  clear() {
    this.active = false;
    this.m = null;
    this.mapRef = null;
    this.mask = 0;                  // the turned groups (bit k: group k)
    this.shownMask = 0;             // what the lane layer shows (lags the rule during a swing)
    this.over = new Set();          // cell indices forced to `void` on map.base
    this.carry = null;              // a ride in progress: { path, k, stop, at: Map(cell -> path index) }
    this.settle = null;             // followers catching up after a landing
    this.hold = null;               // the direction held through the last ride, until it is released
    this.pending = false;           // the party stands mid-lane (a reload): carry it when the field is quiet
    this.anim = null;               // the vane swing: { k, from, to, cells, done, promise }
    this.layers = null;
    this.tiles = null;
    this.busy = false;
    this.revealing = false;
    this.rides = 0;
    this.refusals = 0;
    this.lastRide = null;           // { path, stop, bends, ms }
    this.lastTurn = null;           // { group, far, ms }
    this.cloudMask = null;
    this.stats = { ms: 0, maxMs: 0, updateMs: 0, maxUpdateMs: 0, rideMs: 0, turnMs: 0, drawMs: 0, maxDrawMs: 0 };
  }

  get map() { return this.f.map; }
  get mod() { return this.f.map && this.f.map.mod; }
  get still() { const s = this.f.engine.settings; return !!(s && s.reduceMotion); }
  get kind() { const w = this.mod && this.mod.wind; return (w && w.kind) || 'open'; }
  state(mask = this.mask) { const s = stateOf(this.m, mask); s.absent = this.absentPosts(); return s; }
  arrows(mask = this.mask) { return live(this.m, mask); }
  isLive(x, y) { const m = this.m; return !!m && x >= 0 && y >= 0 && x < m.W && y < m.H && this.arrows()[y * m.W + x] >= 0; }

  /** Mooring posts whose event is not present (if / ifNot): a ride does not stop on them. */
  absentPosts() {
    const out = new Set(), f = this.f;
    if (!this.m) return out;
    for (const id of this.m.posts.values()) { const e = f.entities && f.entities.get(id); if (e && !e.present) out.add(id); }
    return out;
  }

  /** The map was (re)built: the authored lanes, the overrides, the vane frames, the rescue, a pending carry. */
  reset() {
    this.clear();
    const f = this.f, map = f.map;
    if (!map || !map.mod) return;
    const m = compile(map.mod);
    if (!m) return;
    for (const e of m.errors) if (f.warnOnce) f.warnOnce('wind:' + e, `${map.id}: ${e}`);
    this.m = m;
    this.mapRef = map;
    this.active = true;
    ensureArt(map.db, f.engine, map);
    this.wrapMap(map);
    for (let i = 0; i < m.N; i++) if (m.anyLane[i]) { this.over.add(i); map.base[(i / m.W) | 0][i % m.W] = 'void'; }
    this.setVaneFrames();
    this.rescue();
    const L = f.leader;
    if (L && this.isLive(L.tx, L.ty) && follow(m, this.state(), [L.tx, L.ty], this.blocker()).path.length > 1) this.pending = true;
  }

  /** map.recomputeCell keeps this system's override on the cell. */
  wrapMap(map) {
    if (map.recomputeCell.ep6) return;
    const orig = map.recomputeCell.bind(map), self = this;
    const w = function (x, y) {
      orig(x, y);
      if (self.f.map !== map || !self.active) return;
      if (self.over.has(y * map.w + x)) map.base[y][x] = 'void';
    };
    w.ep6 = true; w.ep5 = orig.ep5; w.ep4 = orig.ep4;
    map.recomputeCell = w;
  }

  /** The party stands on a cell that is calm in the authored state (a save made on a turned lane): to the nearest ground. */
  rescue() {
    const f = this.f, L = f.leader, m = this.m;
    if (!L) return false;
    const i0 = L.ty * m.W + L.tx;
    if (!m.anyLane[i0] || this.arrows()[i0] >= 0) return false;
    const seen = new Set([i0]), q = [i0];
    while (q.length) {
      const i = q.shift(), x = i % m.W, y = (i / m.W) | 0;
      if (!m.anyLane[i] && f.map.codeAt(x, y) === 'none' && !f.actorAt(x, y, L)) {
        setPosition(f.game, f.map.id, x, y, L.dir);
        if (typeof f.rebuildParty === 'function') f.rebuildParty(x, y, L.dir);
        else if (L.setPos) L.setPos(x, y, L.dir);
        if (f.camera && f.camera.snapTo && f.leader) f.camera.snapTo(f.leader);
        return true;
      }
      for (const [dx, dy] of Object.values(NB4)) {
        const nx = x + dx, ny = y + dy, j = ny * m.W + nx;
        if (nx < 0 || ny < 0 || nx >= m.W || ny >= m.H || seen.has(j)) continue;
        const c = f.map.codeAt(nx, ny);
        if (c === 'solid' && !m.anyLane[j]) continue;
        seen.add(j); q.push(j);
      }
    }
    return false;
  }

  // ------------------------------------------------------------------ the carry
  /** blocked(x, y, lane) for wind.follow: a lane cell is blocked by an actor or a solid prop; a ground cell by anything not walkable. */
  blocker() {
    const f = this.f, map = f.map, L = f.leader;
    return (x, y, lane) => {
      if (!map.inBounds(x, y)) return true;
      const a = f.actorAt(x, y, L);
      if (a && a.kind !== 'party') return true;
      if (lane) return map.propSolid ? map.propSolid[y][x] > 0 : false;
      return map.codeAt(x, y) !== 'none';
    };
  }

  /** May the leader step onto (nx, ny) now? Only a live lane cell, never during a ride, a scene or a lock. */
  mayEnter(nx, ny) {
    const f = this.f;
    if (!this.active || this.carry || this.settle || this.busy || f.inputLocked || (f.cutscene && f.cutscene.running)) return false;
    return this.isLive(nx, ny);
  }

  /** A direction held through the last ride is refused until released (the input is read fresh after the unlock). */
  holding(dir) {
    if (!this.hold) return false;
    const input = this.f.engine.input, held = input && input.heldDir ? input.heldDir() : null;
    if (held !== this.hold) { this.hold = null; return false; }
    return dir === this.hold;
  }

  /**
   * The leader finished a step: orig is the field's own onLeaderArrived (called first; it returns early while input is
   * held). Mid-ride: the next cell. Otherwise, a step that ended on a live lane cell starts a ride.
   */
  arrived(orig) {
    const f = this.f;
    const locked = !!f.inputLocked, mapId = f.mapId;
    orig();
    if (!this.active || f.map !== this.mapRef) return;
    if (this.carry) { this.advance(); return; }
    if (locked || f.pendingWarp || f.mapId !== mapId || (f.cutscene && f.cutscene.running)) return;
    const L = f.leader;
    if (!this.isLive(L.tx, L.ty)) return;
    this.begin(L.tx, L.ty);
  }

  /** Start the wind's ride from the lane cell the leader stands on. */
  begin(x, y) {
    const f = this.f, t0 = now();
    const res = follow(this.m, this.state(), [x, y], this.blocker());
    this.lastRide = { path: res.path.map(([a, b]) => `${a},${b}`), stop: res.stop, bends: res.bends, ms: round3(now() - t0) };
    this.stats.rideMs = this.lastRide.ms;
    if (res.path.length <= 1) {
      // stopped where it stands: a post, or the cell ahead is closed
      f.engine.audio.sfx(res.stop === 'post' ? 'mooring_catch' : 'gust_land', { volume: res.stop === 'post' ? 1 : 0.5 });
      this.noteStop(res.stop, false);
      return;
    }
    f.lockInput();
    const at = new Map();
    res.path.forEach(([a, b], k) => at.set(b * this.m.W + a, k));
    this.carry = { path: res.path, k: 0, stop: res.stop, at };
    f.engine.audio.sfx('gust_carry');
    this.advance();
  }

  /** One cell further along the ride, or its end. */
  advance() {
    const c = this.carry, f = this.f, L = f.leader;
    c.k++;
    if (c.k >= c.path.length) { this.finish(); return; }
    const [x, y] = c.path[c.k];
    L.startStep(x, y, RIDE_FRAMES);
    f.partyFollow(RIDE_FRAMES);
    if (f.particles && f.particles.puff && !this.still && c.k % 2 === 0) f.particles.puff(L.feetX, L.feetY);
  }

  finish() {
    const c = this.carry, f = this.f;
    const stop = c.stop;
    f.engine.audio.sfx(stop === 'post' ? 'mooring_catch' : 'gust_land', { volume: stop === 'land' || stop === 'post' ? 1 : 0.6 });
    if (stop === 'land' && this.followersOnLane()) { this.settle = { path: c.path, at: c.at, t: 0 }; return; }
    this.end();
  }

  followersOnLane() { const m = this.m; return (this.f.followers || []).some((a) => a && m.anyLane[a.ty * m.W + a.tx]); }

  /** The ride is over: unlock, remember the held direction, the landing cell's own events, the barks. */
  end() {
    const f = this.f, c = this.carry;
    this.carry = null;
    this.settle = null;
    this.rides++;
    f.unlockInput();
    const input = f.engine.input;
    this.hold = input && input.heldDir ? input.heldDir() : null;
    if (c && c.stop === 'land' && this.origArrive && !f.pendingWarp) this.origArrive();
    this.noteStop(c ? c.stop : 'land', true);
  }

  /** The first-time barks: the post (first_post), and the first ride on this kind of wind (first_ride / duct / ring). */
  noteStop(stop, rode) {
    const f = this.f;
    if (!rode) { const input = f.engine.input; this.hold = input && input.heldDir ? input.heldDir() : null; }
    if (stop === 'post') f.bark('first_post');
    if (rode) f.bark(RIDE_BARK[this.kind] || 'first_ride');
  }

  /** Followers left on lane cells after a landing hurry in along the path; the lock lifts when all stand on ground. */
  stepSettle() {
    const s = this.settle, f = this.f, m = this.m, L = f.leader;
    if (!s) return;
    s.t++;
    let waiting = false;
    for (const a of f.followers || []) {
      if (!a) continue;
      if (a.moving) { waiting = true; continue; }
      const i = a.ty * m.W + a.tx;
      if (!m.anyLane[i]) continue;
      waiting = true;
      const k = s.at.get(i);
      const next = k == null ? [L.tx, L.ty] : s.path[Math.min(s.path.length - 1, k + 1)];
      if (s.t > 90) a.setPos(L.tx, L.ty, a.dir);
      else a.startStep(next[0], next[1], RIDE_FRAMES);
    }
    if (!waiting) this.end();
  }

  // ------------------------------------------------------------------ vanes
  /** The cells the party stands on (and is stepping from). */
  partyCells() {
    const f = this.f, out = [];
    for (const a of [f.leader, ...(f.followers || [])]) {
      if (!a) continue;
      out.push([a.tx, a.ty]);
      if (a.moving) out.push([a.fromX / TILE, a.fromY / TILE]);
    }
    return out;
  }

  /** Confirm on a vane: refused if a party member's cell would go calm (bark vane_would_drop), else the group turns. */
  async turnVane(ent) {
    const f = this.f, e = f.engine;
    if (!this.active || this.busy || this.carry || this.settle) return false;
    const group = ent.ev.group != null ? String(ent.ev.group) : null;
    const v = canTurn(this.m, this.mask, group, this.partyCells());
    if (!v.ok) {
      this.refusals++;
      e.audio.sfx('buzzer', { volume: 0.5 });
      if (ent.prop) { ent.prop.offX = 1; e.after(3, () => { if (ent.prop) ent.prop.offX = 0; }); }
      if (v.why === 'drop') {
        if (!f.game.counters['bark:vane_would_drop']) f.bark('vane_would_drop');
        else if (f.abilities) f.abilities.float = { text: "Not while we're on it.", t: 0 };
      }
      return false;
    }
    const ok = await this.turn(group, { origin: [ent.x, ent.y] });
    if (ok) f.bark('first_vane');
    return ok;
  }

  /**
   * Turn a group now: vane_turn, every vane of the group swings (20 frames, input held only for those; instant under
   * reduceMotion), then a pan to lane cells more than FAR_TILES away that changed off screen. o.quiet: no sound, no swing,
   * no pan (a script). Resolves true when the lanes changed.
   */
  async turn(group, o = {}) {
    const f = this.f, e = f.engine, m = this.m;
    const k = m ? m.groups.indexOf(String(group)) : -1;
    if (!this.active || this.busy || k < 0) return false;
    this.busy = true;
    const t0 = now();
    const from = this.mask, to = from ^ (1 << k);
    const cells = changed(m, from, to);
    this.mask = to;
    this.lastTurn = { group: String(group), cells: cells.length, far: 0, ms: round3(now() - t0) };
    this.stats.turnMs = this.lastTurn.ms;
    if (!o.quiet) e.audio.sfx('vane_turn');
    f.lockInput();
    try {
      if (o.quiet || this.still) { this.show(to); this.setVaneFrames(); }
      else {
        this.anim = { k: -1, from, to, cells: new Set(cells), group: k, done: null, promise: null };
        this.anim.promise = new Promise((res) => { this.anim.done = res; });
        await this.anim.promise;
      }
    } finally { f.unlockInput(); this.busy = false; }
    const far = o.quiet ? null : this.farChanges(cells);
    this.lastTurn.far = far ? far.length : 0;
    if (far && !f.dead) await this.reveal(far);
    return cells.length > 0;
  }

  stepAnim() {
    const a = this.anim;
    if (!a) return;
    a.k++;
    if (a.k === SWING_FRAMES >> 1) { this.show(a.to); this.setVaneFrames(); }
    else if (a.k < SWING_FRAMES >> 1) this.swayVanes(a.group, a.k);
    if (a.k >= SWING_FRAMES - 1) { this.anim = null; for (const v of this.m.vanes) { const ent = this.f.entities.get(v.id); if (ent && ent.prop) ent.prop.offX = 0; } a.done(); }
  }
  swayVanes(k, t) {
    for (const v of this.m.vanes) {
      if (v.k !== k) continue;
      const ent = this.f.entities.get(v.id);
      if (ent && ent.prop) ent.prop.offX = [0, 1, 1, 0, -1, -1][t % 6];
    }
  }

  /** Every vane's frame: its group's arrow in the current state (see art.js for the frame layout). */
  setVaneFrames() {
    const f = this.f, m = this.m;
    if (!m) return;
    for (const v of m.vanes) {
      const ent = f.entities && f.entities.get(v.id);
      if (!ent || !ent.prop) continue;
      const frame = this.vaneFrame(v, ent.prop.t);
      if (ent.prop.state !== frame) f.map.setPropState(ent.prop, frame);
    }
  }
  vaneArrowNow(v) {
    let a = vaneArrow(this.m, this.mask, v.group);
    if (a < 0) a = vaneArrow(this.m, this.mask ^ (1 << Math.max(0, v.k)), v.group);
    return a;
  }
  vaneFrame(v, objId) {
    const o = this.f.map.db.objects && this.f.map.db.objects[objId];
    const n = o && o.frames ? o.frames.length : 1;
    const turned = v.k >= 0 && (this.mask & (1 << v.k)) ? 1 : 0;
    const a = Math.max(0, this.vaneArrowNow(v));
    if (n >= 8) return turned * 4 + a;
    if (n >= 4) return a;
    return n >= 2 ? turned : 0;
  }

  /** Lane cells that changed far from the party and off screen (null if none): PLAYTEST_REVIEW_6 fix 6. */
  farChanges(cells) {
    const f = this.f, m = this.m, L = f.leader, cam = f.camera;
    if (!L || !cells.length) return null;
    const out = [];
    for (const i of cells) {
      const x = i % m.W, y = (i / m.W) | 0;
      if (Math.abs(x - L.tx) + Math.abs(y - L.ty) <= FAR_TILES) continue;
      if (cam && cam.visible && cam.visible(x * TILE, y * TILE, TILE, TILE, -8)) continue;
      out.push(i);
    }
    return out.length ? out : null;
  }

  /** Pan to the far change (Episode 4's reveal): the changed cell nearest its centre, hold (confirm skips), come back. */
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
      if (f.particles && f.particles.sparkle) for (const i of cells.slice(0, 24)) if (Math.abs((i % m.W) - bx) + Math.abs(((i / m.W) | 0) - by) <= 6) f.particles.sparkle((i % m.W) * TILE + 8, ((i / m.W) | 0) * TILE + 8, 1, '#f6f9ff');
      e.audio.sfx('gust_carry', { volume: 0.5 });
      for (let k = 0; k < 50 && !f.dead && !(e.input.pressed('confirm') || e.input.pressed('cancel')); k++) await e.waitFrames(1);
      if (!f.dead) await cam.returnTo(f.leader, 28);
    } finally { f.unlockInput(); this.revealing = false; }
  }

  // ------------------------------------------------------------------ per frame
  update() {
    if (!this.active) return;
    const t0 = now(), f = this.f;
    this.stepAnim();
    this.stepSettle();
    if (this.hold) this.holding(null);
    if (this.pending && !this.carry && !f.loading && !f.inputLocked && !f.pendingWarp && f.engine.scene === f && !(f.cutscene && f.cutscene.running) && f.leader && !f.leader.moving) {
      this.pending = false;
      if (this.isLive(f.leader.tx, f.leader.ty)) this.begin(f.leader.tx, f.leader.ty);
    }
    const ms = round3(now() - t0);
    this.stats.updateMs = ms;
    this.stats.maxUpdateMs = Math.max(this.stats.maxUpdateMs, ms);
  }

  // ------------------------------------------------------------------ drawing
  /** Cached pieces: 16 lane bodies (by N, S, W, E neighbours), streaks (4 arrows x 3 frames), chevrons (4 x 2 tones). */
  ensureTiles() {
    if (this.tiles) return this.tiles;
    const r = this.f.engine.renderer;
    if (!r || !r.createLayer) return null;
    const body = [], streak = [], chev = { white: [], gold: [] };
    const paintBody = this.kind === 'duct' ? paintDuctBody : paintLaneBody;
    for (let n = 0; n < 16; n++) {
      const L = r.createLayer(TILE, TILE);
      paintBody(L.ctx, 0, 0, { N: !!(n & 1), S: !!(n & 2), W: !!(n & 4), E: !!(n & 8) });
      body.push(L);
    }
    for (let a = 0; a < 4; a++) {
      const row = [];
      for (let k = 0; k < 3; k++) { const L = r.createLayer(TILE, TILE); paintStreaks(L.ctx, 0, 0, a, k, 0, 0); row.push(L); }
      streak.push(row);
      for (const tone of ['white', 'gold']) { const L = r.createLayer(9, 9); paintChevron(L.ctx, 4, 4, a, tone); chev[tone].push(L); }
    }
    this.tiles = { body, streak, chev };
    return this.tiles;
  }

  ensureLayers() {
    if (this.layers || !this.active) return this.layers;
    const r = this.f.engine.renderer, m = this.m;
    if (!r || !r.createLayer || !this.ensureTiles()) return null;
    // E6-tiles' A1 bed (`gust_lane`; duct maps `gust_duct`) with its `gust_streak` object (frame dir * 3 + k); else the code
    // body and streaks. Chevrons: E6-tiles' `gust_chevron` (frame state * 4 + dir) if present, else the code chevrons.
    const T = this.map.db.terrains || {}, O = this.map.db.objects || {};
    const meta = this.kind === 'duct' ? T.gust_duct || T.gust_lane : T.gust_lane;
    this.laneMeta = meta && !meta.fallback ? meta : null;
    this.streakObj = this.laneMeta && O.gust_streak && (O.gust_streak.frames || []).length >= 12 ? O.gust_streak : null;
    this.chevObj = O.gust_chevron && (O.gust_chevron.frames || []).length >= 8 ? O.gust_chevron : null;
    const n = this.laneMeta && this.laneMeta.anim ? Math.max(...this.laneMeta.anim.frames) + 1 : 3;
    this.layers = [];
    for (let k = 0; k < n; k++) this.layers.push(r.createLayer(Math.max(1, m.W * TILE), Math.max(1, m.H * TILE)));
    this.shown = null;
    this.show(this.mask);
    return this.layers;
  }

  /** The lane layer shows the lanes of `mask`: repaint only the cells that changed (and their neighbours, for the rims). */
  show(mask) {
    this.shownMask = mask;
    if (!this.layers) return;
    const m = this.m, A = this.arrows(mask);
    if (!this.shown) {
      this.shown = new Int8Array(A);
      for (const L of this.layers) L.ctx.clearRect(0, 0, L.w, L.h);
      for (let i = 0; i < m.N; i++) if (A[i] >= 0) this.paintCell(i);
      return;
    }
    const dirty = [];
    for (let i = 0; i < m.N; i++) if (this.shown[i] !== A[i]) dirty.push(i);
    this.shown.set(A);
    const seen = new Set();
    for (const i of dirty) {
      const x = i % m.W, y = (i / m.W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= m.W || ny >= m.H) continue;
        const j = ny * m.W + nx;
        if (seen.has(j)) continue;
        seen.add(j);
        for (const L of this.layers) L.ctx.clearRect(nx * TILE, ny * TILE, TILE, TILE);
        this.paintCell(j);
      }
    }
  }

  paintCell(i) {
    const m = this.m, A = this.shown, a = A[i];
    if (a < 0) return;
    const x = i % m.W, y = (i / m.W) | 0, px = x * TILE, py = y * TILE;
    const on = (dx, dy) => { const nx = x + dx, ny = y + dy; return nx < 0 || ny < 0 || nx >= m.W || ny >= m.H ? false : A[ny * m.W + nx] >= 0; };
    const meta = this.laneMeta, img = meta ? this.map.sheet(meta.sheet) : null;
    for (let k = 0; k < this.layers.length; k++) {
      const g = this.layers[k].ctx;
      if (meta && img) {
        const nb = {};
        for (const key in NB8) nb[key] = on(NB8[key][0], NB8[key][1]);
        const qs = a2Quarters(nb), sx = meta.x + k * (meta.anim ? meta.anim.frameDx : 0);
        for (let q = 0; q < 4; q++) {
          const [qx, qy] = qs[q], [ox, oy] = QUARTER_OFFSET[QUARTERS[q]];
          g.drawImage(img, sx + qx * 8, meta.y + qy * 8, 8, 8, px + ox, py + oy, 8, 8);
        }
        const so = this.streakObj, simg = so && this.map.sheet(so.sheet);
        if (simg) { const [fx, fy, fw, fh] = so.frames[a * 3 + (k % 3)]; g.drawImage(simg, fx, fy, fw, fh, px, py, fw, fh); }
        else { const s = this.tiles.streak[a][k % 3]; if (s.canvas) g.drawImage(s.canvas, px, py); }
      } else {
        const n = (on(0, -1) ? 1 : 0) | (on(0, 1) ? 2 : 0) | (on(-1, 0) ? 4 : 0) | (on(1, 0) ? 8 : 0);
        const b = this.tiles.body[n];
        if (b.canvas) g.drawImage(b.canvas, px, py);
        const s = this.tiles.streak[a][k % 3];
        if (s.canvas) g.drawImage(s.canvas, px, py);
      }
    }
  }

  /** The cloud cells (terrain cloudbank or none, lanes included): where the storm's lightning shows. */
  cloud(x, y) {
    const map = this.f.map;
    if (!this.cloudMask || this.cloudMask.map !== map) {
      const c = new Uint8Array(map.w * map.h);
      for (let yy = 0; yy < map.h; yy++) for (let xx = 0; xx < map.w; xx++) {
        const t = map.terrain[yy][xx];
        if ((t == null || t === 'cloudbank' || t === 'storm_cloud') && !map.walls[yy][xx]) c[yy * map.w + xx] = 1;
      }
      this.cloudMask = { map, c };
    }
    return x >= 0 && y >= 0 && x < map.w && y < map.h && this.cloudMask.c[y * map.w + x] === 1;
  }

  drawLow(r, t) {
    if (!this.active || !this.ensureLayers()) return;
    const t0 = now();
    const cam = this.f.camera, m = this.m, f = this.f;
    const k = this.still ? 0 : Math.floor((t * 1000) / (this.laneMeta && this.laneMeta.anim ? this.laneMeta.anim.ms || STREAK_MS : STREAK_MS));
    const seq = this.laneMeta && this.laneMeta.anim ? this.laneMeta.anim.frames : [0, 1, 2];
    const Lr = this.layers[Math.min(this.layers.length - 1, seq[k % seq.length])];
    const sx = Math.max(0, cam.x), sy = Math.max(0, cam.y);
    const sw = Math.min(Lr.w - sx, r.W), sh = Math.min(Lr.h - sy, r.H);
    if (sw > 0 && sh > 0) r.drawLayer(Lr, sx, sy, sw, sh, sx, sy);
    const x0 = Math.max(0, Math.floor(cam.x / TILE) - 1), y0 = Math.max(0, Math.floor(cam.y / TILE) - 1);
    const x1 = Math.min(m.W - 1, x0 + Math.ceil(r.W / TILE) + 2), y1 = Math.min(m.H - 1, y0 + Math.ceil(r.H / TILE) + 2);
    const g = r.ctx;
    // mooring posts (under the chevrons where they overlap, plan 0.1)
    const absent = this.absentPosts();
    const pk = this.still ? 0 : Math.floor((t * 1000) / POST_MS) % 3;
    for (const [i, id] of m.posts) {
      if (absent.has(id)) continue;
      const x = i % m.W, y = (i / m.W) | 0;
      if (x < x0 || x > x1 || y < y0 || y > y1 + 1) continue;
      this.drawPost(g, x, y, this.shown ? this.shown[i] : -1, pk);
    }
    // chevrons: one every other cell ((x + y) even), following each cell's arrow; white, or gold on a turned group
    const a = this.anim, half = SWING_FRAMES >> 1;
    for (let y = y0; y <= y1; y++) for (let x = x0 + ((x0 + y) & 1); x <= x1; x += 2) {
      const i = y * m.W + x, arrow = this.shown[i];
      if (arrow < 0) continue;
      let alpha = 1;
      if (a && a.cells.has(i)) alpha = a.k < half ? 1 - (a.k + 1) / half : (a.k - half + 1) / half;
      if (alpha <= 0.02) continue;
      const turned = m.groupOf[i] >= 0 && (this.shownMask & (1 << m.groupOf[i]));
      if (alpha < 1) g.globalAlpha = alpha;
      const co = this.chevObj, cimg = co && this.map.sheet(co.sheet);
      if (cimg) { const [fx, fy, fw, fh] = co.frames[(turned ? 4 : 0) + arrow]; g.drawImage(cimg, fx, fy, fw, fh, x * TILE, y * TILE, fw, fh); }
      else { const c = this.tiles.chev[turned ? 'gold' : 'white'][arrow]; if (c.canvas) g.drawImage(c.canvas, x * TILE + 4, y * TILE + 4); }
      if (alpha < 1) g.globalAlpha = 1;
    }
    const ms = round3(now() - t0);
    this.stats.drawMs = ms;
    this.stats.maxDrawMs = Math.max(this.stats.maxDrawMs, ms);
    void f;
  }

  drawPost(g, x, y, arrow, k) {
    const db = this.f.map.db, o = db.objects && db.objects.gust_mooring;
    if (!o) return;
    const img = this.f.map.sheet(o.sheet);
    if (!img) return;
    const fr = o.frames || [o.rect];
    const n = fr.length;
    const idx = n >= 12 ? Math.max(0, arrow) * 3 + k : n >= 3 ? k : 0;
    const [fx, fy, fw, fh] = fr[Math.min(n - 1, idx)];
    const an = o.anchor || [0, Math.round(fh / TILE) - 1];
    g.drawImage(img, fx, fy, fw, fh, (x - an[0]) * TILE, (y - an[1]) * TILE, fw, fh);
  }

  /** A code arrow over vanes whose art has fewer than 4 frames (so the head always agrees with the lanes). World pixels. */
  drawVaneHeads(r) {
    if (!this.active) return;
    const f = this.f, db = f.map.db;
    for (const v of this.m.vanes) {
      const ent = f.entities.get(v.id), p = ent && ent.prop;
      if (!p || !p.visible) continue;
      const o = db.objects[p.t];
      if (o && o.frames && o.frames.length >= 4) continue;
      const turned = v.k >= 0 && (this.mask & (1 << v.k));
      paintVaneHead(r.ctx, v.x * TILE + 8 + (p.offX || 0), (v.y - 1) * TILE + 6, this.vaneArrowNow(v), turned);
    }
  }

  debugState() {
    if (!this.active) return { active: false };
    const f = this.f, m = this.m, A = this.arrows();
    let liveN = 0;
    for (let i = 0; i < m.N; i++) if (A[i] >= 0) liveN++;
    const L = f.leader;
    return {
      active: true, groups: m.groups, turned: m.groups.filter((_, k) => this.mask & (1 << k)), live: liveN,
      riding: !!this.carry, settling: !!this.settle, hold: this.hold, pending: this.pending, busy: this.busy, anim: this.anim ? this.anim.k : null,
      rides: this.rides, refusals: this.refusals, lastRide: this.lastRide, lastTurn: this.lastTurn,
      leader: L ? [L.tx, L.ty] : null, onLane: L ? A[L.ty * m.W + L.tx] >= 0 : false,
      arrowHere: L ? (A[L.ty * m.W + L.tx] >= 0 ? DIR_NAMES[A[L.ty * m.W + L.tx]] : null) : null,
      vanes: m.vanes.map((v) => { const e = f.entities.get(v.id); return { id: v.id, group: v.group, arrow: DIR_NAMES[this.vaneArrowNow(v)] || null, frame: e && e.prop ? e.prop.state : null }; }),
      updateMs: this.stats.updateMs, maxUpdateMs: this.stats.maxUpdateMs, rideMs: this.stats.rideMs, turnMs: this.stats.turnMs,
      drawMs: this.stats.drawMs, maxDrawMs: this.stats.maxDrawMs, sheet: SHEET,
    };
  }
}

export { DXY, maskOf, toggled };
