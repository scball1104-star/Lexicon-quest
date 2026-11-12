// Name stones on the field (E7-world, docs/EPISODE7_PLAN.md 4.5 and 5.1): the stones a map's `remember` block declares. The
// rule itself is the pure ./remember.js; ./events.js attaches this to a field (field.stones) and registers the event type.
// Never in the first download (the ep7 pack).
//
//   const s = new Stones(field);
//   s.reset()              after the map's entities are built: the authored holds (`start`), the collision overrides, the
//                          stone frames, the rescue of a party saved on a path cell that is fade again
//   s.update()             per frame: the draw-in / let-go animation, the oldest stone's flicker, Lantern reveals, first_grip
//   s.readCairn(ent)       confirm on a namestone (async): the rule, the sounds, the float line, the animation (input held
//                          only for its 16 frames; instant under reduceMotion), the pan to a far change, the barks
//   s.mayEnter(actor, x, y) false for an enemy or an NPC on any path or frost cell (they never stand on one)
//   s.drawLow(r, t)        after the ground, under the actors: ghost trails, held paths, frost doors
//   s.lights()             a lamp pool over every held stone (and a faint one along its path) on a dark map
//   s.drawAurora(r)        the aurora band over F3 and the Stillheart (under the roof decals)
//
// Collision: every path cell is `void` on map.base unless its stone is held ('none' then); every frost cell is 'solid' while
// its stone is held, its own floor code otherwise. One override per cell, re-applied whenever the map recomputes that cell.
// State: the holds reset to the authored `start` on every arrival (the entities are rebuilt). No new save field.

import { compile, initial, held, read, changed, oldest, keyOf } from './remember.js';
import { ensureArt, paintHeldCell, paintGhostCell, paintPrints, paintFrostBlock, paintMelt, NB, PAL, STONE_FRAMES, SHEET } from './art.js';
import { AURORA, wantsAurora, bandOf, frameAt, paintAurora } from './aurora.js';
import { TILE } from '../../../world/tilemap.js';
import { setPosition, markOpened, isOpened } from '../../../game/state.js';
import { a2Quarters, QUARTERS, QUARTER_OFFSET } from '../../../world/autotile.js';
import { LINES } from '../../../game/story.js';

/** Frames of a read's draw-in (from the stone outward) or a let-go's fade; the input is held only for these. */
export const DRAW_FRAMES = 16;
/** A change farther than this from the party (and off screen) pans the camera to it (Episode 4's reveal). */
export const FAR_TILES = 6;
/** Game frames per flicker frame of the oldest held stone (slow: never a strobe). */
export const FLICKER_FRAMES = 30;
/** The Lantern finds a stone in Keeper ink within this many tiles (the Episode 1 hidden-ink rule's radius). */
export const INK_RADIUS = 6;
const NB4 = [[0, -1], [0, 1], [-1, 0], [1, 0]];
const NB8 = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0], NE: [1, -1], NW: [-1, -1], SE: [1, 1], SW: [-1, 1] };
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const round3 = (v) => Math.round(v * 1000) / 1000;
/** Kinds of actor that never stand on a path or frost cell (scene actors and the party follow the map's collision). */
const KEEP_OFF = new Set(['enemy', 'npc']);

export class Stones {
  constructor(field) { this.f = field; this.clear(); }

  clear() {
    this.active = false;
    this.m = null;
    this.mapRef = null;
    this.state = { order: [] };
    this.origCode = new Map();      // frost cell -> its own floor code (what it is when melted)
    this.dist = null;               // path cell -> its draw-in delay (frames from the stone)
    this.orient = null;             // path cell -> 'h' | 'v' (which way the footprints go)
    this.anim = null;               // { k, cells: Map(i -> 'in' | 'out' | 'freeze' | 'melt'), done, promise }
    this.tiles = null;
    this.aurora = null;
    this.busy = false;
    this.revealing = false;
    this.reads = 0;
    this.refusals = 0;
    this.lastRead = null;           // { stone, ok, refused, letGo, reread, ms, far }
    this.line = null;               // the float line: { text, x, y, t }
    this.gripSaid = false;
    this.stats = { readMs: 0, updateMs: 0, maxUpdateMs: 0, drawMs: 0, maxDrawMs: 0, resetMs: 0 };
  }

  get map() { return this.f.map; }
  get mod() { return this.f.map && this.f.map.mod; }
  get still() { const s = this.f.engine.settings; return !!(s && s.reduceMotion); }
  held() { return held(this.m, this.state); }
  isHeld(stone) { return this.held().includes(stone); }
  isPath(i) { return !!this.m && this.m.owner[i] >= 0; }
  isFrost(i) { return !!this.m && this.m.frostOwner[i] >= 0; }
  isRuleCell(x, y) { const m = this.m; if (!m || x < 0 || y < 0 || x >= m.W || y >= m.H) return false; const i = y * m.W + x; return m.owner[i] >= 0 || m.frostOwner[i] >= 0; }

  /** The map was (re)built: the authored holds, the overrides, the stone frames, the rescue. */
  reset() {
    const t0 = now();
    this.clear();
    const f = this.f, map = f.map;
    if (!map || !map.mod) return;
    const m = compile(map.mod);
    if (!m) return;
    for (const e of m.errors) if (f.warnOnce) f.warnOnce('stones:' + e, `${map.id}: ${e}`);
    this.m = m;
    this.mapRef = map;
    this.active = true;
    this.state = initial(m);
    ensureArt(map.db, f.engine, map);
    this.wrapMap(map);
    for (const s of m.stones) for (const i of m.frostOf[s]) this.origCode.set(i, map.base[(i / m.W) | 0][i % m.W]);
    for (let i = 0; i < m.N; i++) if (m.owner[i] >= 0 || m.frostOwner[i] >= 0) this.applyCell(i);
    this.measure();
    this.setFrames();
    this.rescue();
    this.stats.resetMs = round3(now() - t0);
  }

  /** Per path cell: its draw-in delay (by distance from the nearest cairn of its stone) and its footprints' direction. */
  measure() {
    const m = this.m;
    this.dist = new Int16Array(m.N);
    this.orient = new Uint8Array(m.N);      // 0 'v', 1 'h'
    for (const s of m.stones) {
      const cairns = m.cairns.filter((c) => c.stone === s);
      let far = 1;
      const d = new Map();
      for (const i of m.pathOf[s]) {
        const x = i % m.W, y = (i / m.W) | 0;
        let best = Infinity;
        for (const c of cairns) best = Math.min(best, Math.abs(c.x - x) + Math.abs(c.y - y));
        d.set(i, best); far = Math.max(far, best);
        const same = (dx, dy) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < m.W && ny < m.H && m.owner[ny * m.W + nx] === m.owner[i]; };
        this.orient[i] = same(-1, 0) || same(1, 0) ? (same(0, -1) || same(0, 1) ? ((x + y) & 1) : 1) : 0;
      }
      for (const [i, v] of d) this.dist[i] = Math.round((v / far) * (DRAW_FRAMES - 5));
    }
  }

  /** The collision code a rule cell has now. */
  codeFor(i) {
    const m = this.m, h = this.held();
    if (m.owner[i] >= 0) return h.includes(m.stones[m.owner[i]]) ? 'none' : 'void';
    if (m.frostOwner[i] >= 0) return h.includes(m.stones[m.frostOwner[i]]) ? 'solid' : (this.origCode.get(i) || 'none');
    return null;
  }
  applyCell(i) {
    const c = this.codeFor(i);
    if (c != null) this.f.map.base[(i / this.m.W) | 0][i % this.m.W] = c;
  }

  /** map.recomputeCell keeps this system's override on the cell (and re-reads a frost cell's own floor). */
  wrapMap(map) {
    if (map.recomputeCell.ep7) return;
    const orig = map.recomputeCell.bind(map), self = this;
    const w = function (x, y) {
      orig(x, y);
      if (self.f.map !== map || !self.active || !self.isRuleCell(x, y)) return;
      const i = y * map.w + x;
      if (self.isFrost(i)) self.origCode.set(i, map.base[y][x]);
      self.applyCell(i);
    };
    w.ep7 = true; w.ep6 = orig.ep6; w.ep5 = orig.ep5; w.ep4 = orig.ep4;
    map.recomputeCell = w;
  }

  /** The party stands on a path cell that is fade in the authored holds (a save on a held path): to the nearest ground. */
  rescue() {
    const f = this.f, L = f.leader, m = this.m;
    if (!L) return false;
    const i0 = L.ty * m.W + L.tx;
    if (!(m.owner[i0] >= 0 || m.frostOwner[i0] >= 0) || this.codeFor(i0) === 'none') return false;
    const seen = new Set([i0]), q = [i0];
    while (q.length) {
      const i = q.shift(), x = i % m.W, y = (i / m.W) | 0;
      if (i !== i0 && f.map.codeAt(x, y) === 'none' && !f.actorAt(x, y, L)) {
        setPosition(f.game, f.map.id, x, y, L.dir);
        if (typeof f.rebuildParty === 'function') f.rebuildParty(x, y, L.dir);
        else if (L.setPos) L.setPos(x, y, L.dir);
        if (f.camera && f.camera.snapTo && f.leader) f.camera.snapTo(f.leader);
        this.rescued = [x, y];
        return true;
      }
      for (const [dx, dy] of NB4) {
        const nx = x + dx, ny = y + dy, j = ny * m.W + nx;
        if (nx < 0 || ny < 0 || nx >= m.W || ny >= m.H || seen.has(j)) continue;
        seen.add(j); q.push(j);
      }
    }
    return false;
  }

  // ------------------------------------------------------------------ stones and their lamps
  /** A cairn in Keeper ink that the Lantern has not found yet (`lantern: true`). */
  hidden(ent) {
    const ev = ent && ent.ev;
    return !!(ev && ev.lantern && !isOpened(this.f.game, this.f.map.id, `ink:${ent.x},${ent.y}`));
  }

  /** Every cairn's frame: dim, lit, or guttering (the oldest held, every FLICKER_FRAMES; resting on it under reduceMotion). */
  setFrames() {
    const f = this.f, m = this.m;
    if (!m) return;
    const h = this.held(), old = oldest(m, this.state), phase = this.still ? 1 : Math.floor((f.frame | 0) / FLICKER_FRAMES) % 2;
    for (const c of m.cairns) {
      const ent = f.entities && f.entities.get(c.id), p = ent && ent.prop;
      if (!p) continue;
      const o = f.map.db.objects && f.map.db.objects[p.t];
      const n = o && o.frames ? o.frames.length : 1;
      let fr = STONE_FRAMES.dim;
      if (h.includes(c.stone)) {
        fr = STONE_FRAMES.lit;
        if (c.stone === old) fr = n >= 4 ? 2 + phase : phase ? STONE_FRAMES.gutter : STONE_FRAMES.lit;
      }
      fr = Math.min(Math.max(0, n - 1), fr);
      if (p.state !== fr) f.map.setPropState(p, fr);
      const a = this.hidden(ent) ? 0.3 : 1;
      if (p.alpha !== a) p.alpha = a;
    }
  }

  /** The Lantern raised near a stone in Keeper ink: it is found (saved like Episode 1's ink). */
  lanternReveal() {
    const f = this.f, L = f.leader, m = this.m;
    if (!L || !(f.lantern > 0)) return;
    for (const c of m.cairns) {
      if (!c.ev.lantern || isOpened(f.game, f.map.id, `ink:${c.x},${c.y}`)) continue;
      if (Math.abs(c.x - L.tx) + Math.abs(c.y - L.ty) > INK_RADIUS + 1) continue;
      markOpened(f.game, f.map.id, `ink:${c.x},${c.y}`);
      if (f.particles && f.particles.sparkle) f.particles.sparkle(c.x * TILE + 8, c.y * TILE + 2, 4, '#9fffd0');
      this.setFrames();
    }
  }
  /** An unfound stone in Keeper ink within reach (the field's Lantern hint asks this as well as its own ink tiles). */
  inkNear() {
    const f = this.f, L = f.leader, m = this.m;
    if (!this.active || !L || !f.game.items || !f.game.items.lantern_of_recall) return false;
    return m.cairns.some((c) => c.ev.lantern && !isOpened(f.game, f.map.id, `ink:${c.x},${c.y}`) && Math.abs(c.x - L.tx) + Math.abs(c.y - L.ty) <= INK_RADIUS);
  }

  // ------------------------------------------------------------------ the read
  /** The cells the party stands on (and is stepping from). */
  partyCells() {
    const f = this.f, out = [];
    for (const a of [f.leader, ...(f.followers || [])]) {
      if (!a) continue;
      out.push([a.tx, a.ty]);
      if (a.moving) out.push([Math.round(a.fromX / TILE), Math.round(a.fromY / TILE)]);
    }
    return out;
  }

  /** The stone's name for the float line (its text key in the pack's text.js; nothing if the key is missing). */
  nameLine(ent) {
    const v = ent && ent.ev && ent.ev.name ? LINES[ent.ev.name] : null;
    if (typeof v === 'string') return v;
    if (Array.isArray(v) && v.length) return typeof v[0] === 'string' ? v[0] : v[0] && v[0].text;
    return null;
  }

  /**
   * One float line over a stone (or the leader): a dark plate with cream text, drawn after the lighting so it reads on the
   * white fade and in a dark hall alike. 90 frames, the last 15 fading.
   */
  float(text, ent = null) {
    if (!text) return;
    const f = this.f, L = f.leader;
    const x = ent ? ent.x * TILE + 8 : L ? L.feetX : 0, y = ent ? ent.y * TILE - 22 : L ? L.feetY - 34 : 0;
    this.line = { text, x, y, t: 0 };
  }
  /** The float line (screen space: called after the field's lighting pass). */
  drawLine(r, cam) {
    const l = this.line;
    if (!l || !r.text) return;
    const a = l.t < 75 ? 1 : Math.max(0, 1 - (l.t - 75) / 15);
    const w = (r.measure ? r.measure(l.text) : l.text.length * 5) + 10, h = 13;
    let x = Math.round(l.x - cam.x - w / 2), y = Math.round(l.y - cam.y - h - Math.min(4, l.t >> 3));
    x = Math.max(2, Math.min(r.W - w - 2, x)); y = Math.max(2, Math.min(r.H - h - 2, y));
    r.withAlpha(a, () => {
      r.withAlpha(0.82, () => r.rect(x, y, w, h, '#14182a'));
      r.rect(x, y, w, 1, '#8ea2cc'); r.rect(x, y + h - 1, w, 1, '#3c4a70');
      r.text(l.text, x + 5, y + 2, { color: 'cream', shadow: true });
    });
  }

  /** Confirm on a namestone. Resolves true when the hold changed (a re-read that reorders counts). */
  async readCairn(ent) {
    const f = this.f, e = f.engine;
    if (!this.active || this.busy || !ent || !ent.ev) return false;
    if (this.hidden(ent)) { this.float('The name is too pale to read.', ent); return false; }
    const stone = String(ent.ev.stone || '').toLowerCase();
    const t0 = now();
    const before = this.state;
    const res = read(this.m, before, stone, this.partyCells());
    const ms = round3(now() - t0);
    this.stats.readMs = ms;
    this.lastRead = { stone, ok: res.ok, refused: res.refused || null, letGo: res.letGo, reread: res.reread, ms, far: 0, held: null };
    if (!res.ok) {
      this.refusals++;
      e.audio.sfx('buzzer', { volume: 0.5 });
      if (ent.prop) { ent.prop.offX = 1; e.after(3, () => { if (ent.prop) ent.prop.offX = 0; }); }
      if (res.refused === 'fade' || res.refused === 'frost') {
        if (!f.game.counters['bark:would_fade']) f.bark('would_fade');
        else this.float(res.refused === 'frost' ? 'Not while we stand there.' : "Not while we're on it.", ent);
      }
      return false;
    }
    const wasNewest = before.order.length && before.order[before.order.length - 1] === stone;
    this.state = res.state;
    this.lastRead.held = keyOf(this.m, this.state);
    const cells = changed(this.m, before, this.state);
    for (const i of cells) this.applyCell(i);
    this.reads++;
    const freezes = !res.reread && this.m.frostOf[stone].length > 0;
    e.audio.sfx('stone_hold');
    if (res.letGo.length) e.after(6, () => e.audio.sfx('stone_letgo'));
    if (freezes) e.after(10, () => e.audio.sfx('frost_seal'));
    this.float(this.nameLine(ent), ent);
    this.setFrames();
    if (cells.length) await this.animate(before, this.state, cells);
    const far = this.farChanges(cells);
    this.lastRead.far = far ? far.length : 0;
    if (far && !f.dead) await this.reveal(far);
    // first-time barks (once per save; spoken when the field is idle)
    if (!res.reread) f.bark('first_held');
    if (res.letGo.length) f.bark('first_letgo');
    if (res.reread && !wasNewest) f.bark('first_reread');
    return cells.length > 0 || (res.reread && !wasNewest);
  }

  /** The draw-in (from the stone outward), the let-go fade, the freeze and the melt: DRAW_FRAMES, instant when still. */
  async animate(a, b, cells) {
    if (this.still) { this.anim = null; return; }
    const ha = new Set(held(this.m, a)), hb = new Set(held(this.m, b)), map = new Map();
    for (const i of cells) {
      const s = this.m.stones[this.m.owner[i] >= 0 ? this.m.owner[i] : this.m.frostOwner[i]];
      const on = hb.has(s), was = ha.has(s);
      if (on === was) continue;
      if (this.m.owner[i] >= 0) map.set(i, on ? 'in' : 'out');
      else map.set(i, on ? 'freeze' : 'melt');
    }
    if (!map.size) return;
    this.busy = true;
    this.anim = { k: 0, cells: map, done: null, promise: null };
    this.anim.promise = new Promise((res) => { this.anim.done = res; });
    try { await this.anim.promise; } finally { this.busy = false; }
  }
  stepAnim() {
    const a = this.anim;
    if (!a) return;
    a.k++;
    if (a.k >= DRAW_FRAMES) { this.anim = null; a.done(); }
  }
  /** 0..1: how far a cell is into its held look (path ice, frost block) this frame. */
  heldLook(i) {
    const a = this.anim, kind = a && a.cells.get(i);
    if (!kind) return this.codeFor(i) === (this.isPath(i) ? 'none' : 'solid') ? 1 : 0;
    if (kind === 'in') return Math.max(0, Math.min(1, (a.k - this.dist[i]) / 4));
    if (kind === 'freeze') return Math.min(1, a.k / DRAW_FRAMES);
    return Math.max(0, 1 - a.k / DRAW_FRAMES);
  }

  /** Changed cells far from the party and off screen (null if none): the reveal pans to them. */
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
      for (let k = 0; k < 50 && !f.dead && !(e.input.pressed('confirm') || e.input.pressed('cancel')); k++) await e.waitFrames(1);
      if (!f.dead) await cam.returnTo(f.leader, 28);
    } finally { f.unlockInput(); this.revealing = false; }
  }

  /** Scripts: set the holds directly (oldest first), no sound, no animation. Returns the held list. */
  setHeld(order) {
    if (!this.active) return [];
    const before = this.state;
    this.state = { order: order.map((s) => String(s).toLowerCase()).filter((s) => this.m.index.has(s)).slice(-this.m.capacity) };
    for (const i of changed(this.m, before, this.state)) this.applyCell(i);
    this.setFrames();
    return this.held();
  }

  /** May this actor step onto (x, y)? Enemies and NPCs never stand on a path or frost cell, in any state. */
  mayEnter(actor, x, y) {
    if (!this.active || !actor || !KEEP_OFF.has(actor.kind)) return true;
    return !this.isRuleCell(x, y);
  }

  // ------------------------------------------------------------------ per frame
  update() {
    if (!this.active) return;
    const t0 = now(), f = this.f;
    this.stepAnim();
    if (this.line && ++this.line.t > 90) this.line = null;
    if ((f.frame | 0) % FLICKER_FRAMES === 0 || this.anim) this.setFrames();
    this.lanternReveal();
    if (!this.gripSaid && f.leader && !f.inputLocked) this.gripCheck();
    const ms = round3(now() - t0);
    this.stats.updateMs = ms;
    this.stats.maxUpdateMs = Math.max(this.stats.maxUpdateMs, ms);
  }
  /** first_grip: the first time the party comes within 4 tiles of a frost door its stone holds shut. */
  gripCheck() {
    const f = this.f, L = f.leader, m = this.m;
    for (const s of this.held()) for (const i of m.frostOf[s]) {
      if (Math.abs((i % m.W) - L.tx) + Math.abs(((i / m.W) | 0) - L.ty) > 4) continue;
      this.gripSaid = true;
      f.bark('first_grip');
      return;
    }
  }

  // ------------------------------------------------------------------ drawing
  /** Cached code tiles: held path (16 neighbour masks x 2 directions), ghost prints (2), frost block and melt. */
  ensureTiles() {
    if (this.tiles) return this.tiles;
    const r = this.f.engine.renderer;
    if (!r || !r.createLayer) return null;
    const mk = (w, h, paint) => { const L = r.createLayer(w, h); if (L.ctx && typeof L.ctx.fillRect === 'function') paint(L.ctx); return L; };
    const heldT = [], ghost = [], prints = [];
    for (let o = 0; o < 2; o++) {
      const row = [];
      for (let n = 0; n < 16; n++) row.push(mk(TILE, TILE, (g) => paintHeldCell(g, 0, 0, n, o ? 'h' : 'v', n * 7, o * 5)));
      heldT.push(row);
      ghost.push(mk(TILE, TILE, (g) => paintGhostCell(g, 0, 0, o ? 'h' : 'v')));
      prints.push(mk(TILE, TILE, (g) => paintPrints(g, 0, 0, o ? 'h' : 'v', PAL.ice.print, PAL.ice.printLt, 3)));
    }
    this.tiles = { held: heldT, ghost, prints, frost: mk(16, 21, (g) => paintFrostBlock(g, 0, 0)), melt: mk(TILE, TILE, (g) => paintMelt(g, 0, 0)), icepath: new Map() };
    return this.tiles;
  }

  /** The 4-neighbour mask of a path cell: connected to held path and to ground, open (an edge) to the fade. */
  nbMask(i, lookFn) {
    const m = this.m, x = i % m.W, y = (i / m.W) | 0;
    let n = 0;
    const on = (dx, dy) => {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= m.W || ny >= m.H) return true;
      const j = ny * m.W + nx;
      if (m.owner[j] >= 0) return lookFn(j) > 0;
      return this.f.map.terrain[ny][nx] !== 'fade' && this.f.map.terrain[ny][nx] != null;
    };
    if (on(0, -1)) n |= NB.N;
    if (on(0, 1)) n |= NB.S;
    if (on(-1, 0)) n |= NB.W;
    if (on(1, 0)) n |= NB.E;
    return n;
  }

  /** E7-tiles' `icepath` (an A2 terrain) for a held cell, cached per 8-neighbour key, or null without it. */
  icepathTile(i, lookFn) {
    const T = this.f.map.db.terrains || {}, meta = T.icepath;
    if (!meta || meta.fallback) return null;
    const img = this.f.map.sheet(meta.sheet);
    if (!img) return null;
    const m = this.m, x = i % m.W, y = (i / m.W) | 0, nb = {};
    let key = 0, bit = 1;
    for (const k in NB8) {
      const nx = x + NB8[k][0], ny = y + NB8[k][1];
      let c = true;
      if (nx >= 0 && ny >= 0 && nx < m.W && ny < m.H) { const j = ny * m.W + nx; c = m.owner[j] >= 0 ? lookFn(j) > 0 : this.f.map.terrain[ny][nx] !== 'fade'; }
      nb[k] = c; if (c) key |= bit; bit <<= 1;
    }
    const cache = this.tiles.icepath;
    const ck = key * 2 + this.orient[i];
    if (cache.has(ck)) return cache.get(ck);
    const r = this.f.engine.renderer, L = r.createLayer(TILE, TILE);
    if (L.ctx && typeof L.ctx.drawImage === 'function') {
      const qs = a2Quarters(nb);
      for (let q = 0; q < 4; q++) { const [qx, qy] = qs[q], [ox, oy] = QUARTER_OFFSET[QUARTERS[q]]; L.ctx.drawImage(img, meta.x + qx * 8, meta.y + qy * 8, 8, 8, ox, oy, 8, 8); }
    }
    cache.set(ck, L);
    return L;
  }

  drawLow(r) {
    if (!this.active || !this.ensureTiles()) return;
    const t0 = now();
    const cam = this.f.camera, m = this.m, g = r.ctx, T = this.tiles;
    const x0 = Math.max(0, Math.floor(cam.x / TILE) - 1), y0 = Math.max(0, Math.floor(cam.y / TILE) - 1);
    const x1 = Math.min(m.W - 1, x0 + Math.ceil(r.W / TILE) + 2), y1 = Math.min(m.H - 1, y0 + Math.ceil(r.H / TILE) + 3);
    const look = new Map();
    const lookFn = (j) => { let v = look.get(j); if (v == null) { v = this.heldLook(j); look.set(j, v); } return v; };
    const blit = (L, x, y, a = 1) => {
      if (!L || !L.canvas || a <= 0.02) return;
      if (a < 1) { g.globalAlpha = a; g.drawImage(L.canvas, x, y); g.globalAlpha = 1; } else g.drawImage(L.canvas, x, y);
    };
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * m.W + x;
      if (m.owner[i] < 0) continue;
      const a = lookFn(i), o = this.orient[i];
      if (a < 1) blit(T.ghost[o], x * TILE, y * TILE);
      if (a <= 0) continue;
      const ice = this.icepathTile(i, lookFn);
      if (ice) { blit(ice, x * TILE, y * TILE, a); blit(T.prints[o], x * TILE, y * TILE, a); }
      else blit(T.held[o][this.nbMask(i, lookFn)], x * TILE, y * TILE, a);
    }
    // frost doors: the melted floor under, the ice block over (its cap reaches 5 px into the cell above)
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * m.W + x;
      if (m.frostOwner[i] < 0) continue;
      const a = lookFn(i);
      if (a < 1) blit(T.melt, x * TILE, y * TILE);
      if (a > 0) blit(T.frost, x * TILE, y * TILE - 5, a);
    }
    const ms = round3(now() - t0);
    this.stats.drawMs = ms;
    this.stats.maxDrawMs = Math.max(this.stats.maxDrawMs, ms);
  }

  /** Lights for the field's lighting pass on a dark map: a lamp pool over every held stone, faint light along its path. */
  lights() {
    const f = this.f, m = this.m;
    if (!this.active || !(f.lighting && f.lighting.dark > 0.01)) return [];
    const out = [], h = this.held(), old = oldest(m, this.state);
    for (const c of m.cairns) {
      if (!h.includes(c.stone)) continue;
      const ent = f.entities && f.entities.get(c.id);
      if (ent && this.hidden(ent)) continue;
      out.push({ x: c.x * TILE + 8, y: c.y * TILE - 6, r: 46, kind: 'warm', color: '#ffd890', flicker: c.stone === old && !this.still });
    }
    let n = 0;
    for (const s of h) for (const i of m.pathOf[s]) {
      if (this.dist[i] % 3 !== 0 || n >= 24 || this.heldLook(i) < 1) continue;
      out.push({ x: (i % m.W) * TILE + 8, y: ((i / m.W) | 0) * TILE + 8, r: 22, kind: 'cool' });
      n++;
    }
    return out;
  }

  /** The aurora band (F3, the Stillheart): 3 cached frames, a frame every 30 game frames, nothing under reduceMotion. */
  drawAurora(r) {
    if (!this.mod || !wantsAurora(this.mod) || this.still) return;
    const rr = this.f.engine.renderer;
    if (!rr || !rr.createLayer) return;
    if (!this.aurora || this.aurora.map !== this.f.map) {
      const [y0, y1] = bandOf(this.mod), W = this.f.map.w * TILE, H = Math.max(1, (y1 - y0) * TILE);
      const layers = [];
      for (let k = 0; k < AURORA.frames; k++) { const L = rr.createLayer(W, H); paintAurora(L.ctx, k, W, H); layers.push(L); }
      this.aurora = { map: this.f.map, layers, y0, H };
    }
    const k = frameAt(this.f.frame | 0, false), L = this.aurora.layers[k];
    if (!L || !L.canvas) return;
    this.auroraFrame = k;
    r.ctx.drawImage(L.canvas, 0, this.aurora.y0 * TILE);
  }

  debugState() {
    if (!this.active) return { active: false };
    const f = this.f, m = this.m, L = f.leader;
    let open = 0;
    for (let i = 0; i < m.N; i++) if (m.owner[i] >= 0 && this.codeFor(i) === 'none') open++;
    return {
      active: true, stones: m.stones, capacity: m.capacity, held: this.held(), oldest: oldest(m, this.state), openPath: open,
      solidFrost: [...m.stones].reduce((n, s) => n + (this.isHeld(s) ? m.frostOf[s].length : 0), 0),
      busy: this.busy, anim: this.anim ? this.anim.k : null, reads: this.reads, refusals: this.refusals, lastRead: this.lastRead,
      leader: L ? [L.tx, L.ty] : null, rescued: this.rescued || null, aurora: this.auroraFrame ?? null,
      cairns: m.cairns.map((c) => { const e = f.entities.get(c.id); return { id: c.id, stone: c.stone, frame: e && e.prop ? e.prop.state : null, hidden: e ? this.hidden(e) : null }; }),
      readMs: this.stats.readMs, resetMs: this.stats.resetMs, updateMs: this.stats.updateMs, maxUpdateMs: this.stats.maxUpdateMs,
      drawMs: this.stats.drawMs, maxDrawMs: this.stats.maxDrawMs, sheet: SHEET,
    };
  }
}
