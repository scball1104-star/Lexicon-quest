// Pop-up books on the field (E8-world, docs/EPISODE8_PLAN.md 4.4 and 5.1): the books a map's `popbooks` block declares. The
// rule itself is the pure ./popbooks.js; ./events.js attaches this to a field (field.books) and registers the event type.
// Never in the first download (the ep8 pack).
//
//   const b = new Books(field);
//   b.reset()               after the map's entities are built: the authored states (`start`), the collision overrides, the
//                           book frames, the rescue of a party saved on a bridge that is void again
//   b.update()              per frame: the open / fold animation, the ghost of the book the leader faces, Lantern reveals
//   b.readBook(ent)         confirm on a popbook (async): the rule, the sounds, the float line, the animation (input held only
//                           for its 16 open / 12 fold frames by the field's interact lock; instant under reduceMotion), the
//                           pan to a far change, the barks
//   b.mayEnter(actor, x, y) false for an enemy or an NPC on any page cell, in any state (they never stand on one)
//   b.drawLow(r)            after the ground, under the actors: the motes over the void, the pages, the realm models, the ghost
//   b.lights()              on a dark map: a warm pool over every open book and faint light along its bridge
//
// Collision: every page cell keeps its own code (origCode) while uncovered; covered, it is 'none' over void (a bridge) and
// 'solid' over anything else (a wall). One override per cell, re-applied whenever the map recomputes that cell.
// State: reset to the authored `start` on every arrival (the entities are rebuilt). No new save field.

import { compile, initial, read, changed, covered, sideOf, openDir, describe, AXES, SHUT } from './popbooks.js';
import { ensureArt, PAL, NB, MOTES, BOOK_FRAMES, REALM_MODELS, paintBridgeCell, paintShadow, paintWallCell, paintGhostEdge, paintRealm, paintMotes, SHEET } from './art.js';
import { TILE } from '../../../world/tilemap.js';
import { setPosition, markOpened, isOpened } from '../../../game/state.js';
import { LINES } from '../../../game/story.js';

/** Frames of an open (pages rising from the spine outward) and of a fold; the input is held only for these. */
export const OPEN_FRAMES = 16, FOLD_FRAMES = 12;
/** A change farther than this from the party (and off screen) pans the camera to it (Episode 4's reveal). */
export const FAR_TILES = 6;
/** The Lantern finds a book in Keeper ink within this many tiles (the Episode 1 hidden-ink rule's radius). */
export const INK_RADIUS = 6;
const NB4 = [[0, -1], [0, 1], [-1, 0], [1, 0]];
const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const round3 = (v) => Math.round(v * 1000) / 1000;
/** Kinds of actor that never stand on a page cell (scene actors and the party follow the map's collision). */
const KEEP_OFF = new Set(['enemy', 'npc']);
/** The realm names a float line falls back to while text.js has no `ep8_realm_<realm>` key (E8-story's). */
export const REALM_NAMES = { willowmere: 'WILLOWMERE', hollow: 'THE HOLLOW', emberpeak: 'EMBERPEAK', valewyn: 'VALEWYN', desert: 'THE DESERT',
  isles: 'THE ISLES', north: 'THE NORTH' };
/** The one realm line the plan gives word for word (4.11); the others wait on E8-story's keys. */
const PLAN_REALM_LINES = { willowmere: 'WILLOWMERE. The willow stands up out of the page.' };

/**
 * The ribbon colour of a book (0 ivory, 1 crimson, 2 teal, 3 azure): ivory unpaired; each palimpsest pair its own colour, in
 * the order of its first book's id. Pure: read from the map's block.
 */
export function ribbonOf(mod, book) {
  const B = (mod && mod.popbooks && mod.popbooks.books) || {};
  const ids = Object.keys(B).sort();
  let n = 0;
  const seen = new Map();
  for (const id of ids) {
    const p = B[id].pair != null ? String(B[id].pair) : ids.find((o) => B[o].pair === id) || null;
    if (!p) continue;
    const key = [id, p].sort().join('+');
    if (!seen.has(key)) seen.set(key, 1 + (n++ % 3));
    if (id === book) return seen.get(key);
  }
  return 0;
}

export class Books {
  constructor(field) { this.f = field; this.clear(); }

  clear() {
    this.active = false;
    this.m = null;
    this.state = '';
    this.origCode = new Map();      // page cell -> its own code (what it is uncovered: 'void' or a floor code)
    this.dist = null;               // page cell -> its distance from its book (0 nearest)
    this.anim = null;               // { k, frames, cells: Map(i -> { kind: 'open' | 'fold', d }), books: Map(k -> 'open' | 'fold'), done, promise }
    this.tiles = null;
    this.busy = false;
    this.revealing = false;
    this.reads = 0;
    this.refusals = 0;
    this.lastRead = null;           // { book, side, ok, refused, opened, dir, closed, ms, far, state }
    this.line = null;               // the float line: { text, x, y, t }
    this.ghost = null;              // { k, cells: [i], mode: 'open' | 'clear' }
    this.moteFrame = null;
    this.stats = { readMs: 0, updateMs: 0, maxUpdateMs: 0, drawMs: 0, maxDrawMs: 0, moteMs: 0, maxMoteMs: 0, resetMs: 0 };
  }

  get map() { return this.f.map; }
  get mod() { return this.f.map && this.f.map.mod; }
  get still() { const s = this.f.engine.settings; return !!(s && s.reduceMotion); }
  isPage(i) { return !!this.m && this.m.owner[i] >= 0; }
  isRuleCell(x, y) { const m = this.m; return !!m && x >= 0 && y >= 0 && x < m.W && y < m.H && m.owner[y * m.W + x] >= 0; }
  /** Is cell i a page over void (a bridge when covered)? */
  overVoid(i) { return this.origCode.get(i) === 'void'; }

  /** The map was (re)built: the authored states, the overrides, the book frames, the rescue. */
  reset() {
    const t0 = now();
    this.clear();
    const f = this.f, map = f.map;
    if (!map || !map.mod) return;
    const m = compile(map.mod);
    if (!m) return;
    for (const e of m.errors) if (f.warnOnce) f.warnOnce('books:' + e, `${map.id}: ${e}`);
    this.m = m;
    this.active = true;
    this.state = initial(m);
    ensureArt(map.db, f.engine, map);
    this.wrapMap(map);
    for (let i = 0; i < m.N; i++) if (m.owner[i] >= 0) this.origCode.set(i, map.base[(i / m.W) | 0][i % m.W]);
    for (const i of this.origCode.keys()) this.applyCell(i);
    this.measure();
    this.setFrames();
    this.rescue();
    this.stats.resetMs = round3(now() - t0);
  }

  /** Per page cell: its distance from its book along the pages (0 the row next to the spine). */
  measure() {
    const m = this.m;
    this.dist = new Int16Array(m.N);
    for (const d of m.def) for (const dir of Object.keys(d.pagesOf)) {
      const cells = d.pagesOf[dir];
      for (let j = 0; j < cells.length; j++) this.dist[cells[j]] = Math.floor(j / 2);
    }
  }

  /** The collision code a page cell has now. */
  codeFor(i) {
    if (!this.isPage(i)) return null;
    const o = this.origCode.get(i);
    if (!covered(this.m, this.state, i)) return o;
    return o === 'void' ? 'none' : 'solid';
  }
  applyCell(i) {
    const c = this.codeFor(i);
    if (c != null) this.f.map.base[(i / this.m.W) | 0][i % this.m.W] = c;
  }

  /** map.recomputeCell keeps this system's override on the cell (and re-reads the cell's own code first). */
  wrapMap(map) {
    if (map.recomputeCell.ep8) return;
    const orig = map.recomputeCell.bind(map), self = this;
    const w = function (x, y) {
      orig(x, y);
      if (self.f.map !== map || !self.active || !self.isRuleCell(x, y)) return;
      const i = y * map.w + x;
      self.origCode.set(i, map.base[y][x]);
      self.applyCell(i);
    };
    w.ep8 = true; w.ep7 = orig.ep7; w.ep6 = orig.ep6; w.ep5 = orig.ep5; w.ep4 = orig.ep4;
    map.recomputeCell = w;
  }

  /** The party stands where the authored states give no ground (a save on a bridge, or a page wall): to the nearest ground. */
  rescue() {
    const f = this.f, L = f.leader, m = this.m;
    if (!L) return false;
    const i0 = L.ty * m.W + L.tx;
    if (!this.isPage(i0) || this.codeFor(i0) === 'none') return false;
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

  // ------------------------------------------------------------------ books and their frames
  entOf(k) { const ev = this.m.events.find((e) => e.book === this.m.books[k]); return ev ? this.f.entities && this.f.entities.get(ev.id) : null; }
  /** A book in Keeper ink that the Lantern has not found yet (`lantern: true`). */
  hidden(ent) {
    const ev = ent && ent.ev;
    return !!(ev && ev.lantern && !isOpened(this.f.game, this.f.map.id, `ink:${ent.x},${ent.y}`));
  }

  /** Every book's prop frame: shut, opening (1, 2), open; its ribbon colour picks the frame row on the stand-in sheet. */
  setFrames() {
    const f = this.f, m = this.m;
    if (!m) return;
    for (let k = 0; k < m.books.length; k++) {
      const ent = this.entOf(k), p = ent && ent.prop;
      if (!p) continue;
      const o = f.map.db.objects && f.map.db.objects[p.t];
      const n = o && o.frames ? o.frames.length : 1;
      let phase = this.state[k] !== SHUT ? BOOK_FRAMES.open : BOOK_FRAMES.shut;
      const a = this.anim && this.anim.books.get(k);
      if (a === 'open') phase = this.anim.k < 5 ? 1 : this.anim.k < 10 ? 2 : 3;
      else if (a === 'fold') phase = this.anim.k < 4 ? 2 : this.anim.k < 8 ? 1 : 0;
      let fr = phase;
      if (n >= 16) fr = 4 * (ent.ribbon || 0) + phase;
      fr = Math.min(Math.max(0, n - 1), fr);
      if (p.state !== fr) f.map.setPropState(p, fr);
      const alpha = this.hidden(ent) ? 0.3 : 1;
      if (p.alpha !== alpha) p.alpha = alpha;
    }
  }

  /** The Lantern raised near a book in Keeper ink: it is found (saved like Episode 1's ink). */
  lanternReveal() {
    const f = this.f, L = f.leader, m = this.m;
    if (!L || !(f.lantern > 0)) return;
    for (const e of m.events) {
      if (!e.ev.lantern || isOpened(f.game, f.map.id, `ink:${e.x},${e.y}`)) continue;
      if (Math.abs(e.x - L.tx) + Math.abs(e.y - L.ty) > INK_RADIUS + 1) continue;
      markOpened(f.game, f.map.id, `ink:${e.x},${e.y}`);
      if (f.particles && f.particles.sparkle) f.particles.sparkle(e.x * TILE + 8, e.y * TILE + 2, 4, '#9fffd0');
      this.setFrames();
    }
  }
  /** An unfound book in Keeper ink within reach (the field's Lantern hint asks this as well as its own ink tiles). */
  inkNear() {
    const f = this.f, L = f.leader, m = this.m;
    if (!this.active || !L || !f.game.items || !f.game.items.lantern_of_recall) return false;
    return m.events.some((e) => e.ev.lantern && !isOpened(f.game, f.map.id, `ink:${e.x},${e.y}`) && Math.abs(e.x - L.tx) + Math.abs(e.y - L.ty) <= INK_RADIUS);
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
  /** The cells pages may not open onto: every NPC and foe on the map (and the cell it steps from), every trigger. */
  blockers() {
    const f = this.f, out = [];
    for (const a of f.actors || []) {
      if (!a || !KEEP_OFF.has(a.kind)) continue;
      out.push([a.tx, a.ty]);
      if (a.moving) out.push([Math.round(a.fromX / TILE), Math.round(a.fromY / TILE)]);
    }
    for (const ent of f.entities ? f.entities.values() : []) {
      if (!ent || !ent.present || ent.type !== 'trigger') continue;
      for (const c of ent.cells || [[ent.x, ent.y]]) out.push(c);
    }
    return out;
  }

  /** The float line of a realm book (its text key, else the plan's words, else the realm's name). */
  realmLine(k, ent) {
    const d = this.m.def[k];
    if (!d.realm) return null;
    const key = (ent && ent.ev && ent.ev.name) || `ep8_realm_${d.realm}`;
    const v = LINES[key];
    if (typeof v === 'string') return v;
    if (Array.isArray(v) && v.length) return typeof v[0] === 'string' ? v[0] : v[0] && v[0].text;
    return PLAN_REALM_LINES[d.realm] || `${REALM_NAMES[d.realm] || d.realm.toUpperCase()}.`;
  }

  /** One float line over a book (or the leader): a dark plate with cream text, drawn after the lighting. 90 frames. */
  float(text, ent = null) {
    if (!text) return;
    const f = this.f, L = f.leader;
    const x = ent ? ent.x * TILE + 16 : L ? L.feetX : 0, y = ent ? ent.y * TILE - 18 : L ? L.feetY - 34 : 0;
    this.line = { text, x, y, t: 0 };
  }
  drawLine(r, cam) {
    const l = this.line;
    if (!l || !r.text) return;
    const a = l.t < 75 ? 1 : Math.max(0, 1 - (l.t - 75) / 15);
    const w = (r.measure ? r.measure(l.text) : l.text.length * 5) + 10, h = 13;
    let x = Math.round(l.x - cam.x - w / 2), y = Math.round(l.y - cam.y - h - Math.min(4, l.t >> 3));
    x = Math.max(2, Math.min(r.W - w - 2, x)); y = Math.max(2, Math.min(r.H - h - 2, y));
    r.withAlpha(a, () => {
      r.withAlpha(0.84, () => r.rect(x, y, w, h, '#1a1230'));
      r.rect(x, y, w, 1, '#e3bd5a'); r.rect(x, y + h - 1, w, 1, '#5a3c20');
      r.text(l.text, x + 5, y + 2, { color: 'cream', shadow: true });
    });
  }

  /** The book index of a popbook entity (or a book id / letter), or -1. */
  kOf(entOrId) {
    if (!this.m) return -1;
    const id = entOrId && typeof entOrId === 'object' ? entOrId.ev && entOrId.ev.book : entOrId;
    return this.m.index.has(String(id)) ? this.m.index.get(String(id)) : -1;
  }

  /** Confirm on a popbook. Resolves true when the books changed. */
  async readBook(ent) {
    const f = this.f, e = f.engine, L = f.leader;
    if (!this.active || this.busy || !ent || !ent.ev || !L) return false;
    const k = this.kOf(ent);
    if (k < 0) return false;
    if (this.hidden(ent)) { this.float('The ink is too pale to read.', ent); return false; }
    const book = this.m.books[k];
    const side = sideOf(this.m, k, L.tx, L.ty);
    if (side !== 'n' && side !== 's' && side !== 'e' && side !== 'w') {
      // a short end: it opens away from whoever reads it, so it is read from a long side
      if (!f.game.counters['bark:first_side']) f.bark('first_side');
      else this.float('Read it from a long side.', ent);
      this.lastRead = { book, side, ok: false, refused: 'side', opened: null, dir: null, closed: [], ms: 0, far: 0, state: this.state };
      return false;
    }
    const t0 = now();
    const before = this.state;
    const res = read(this.m, before, k, side, this.partyCells(), this.blockers());
    const ms = round3(now() - t0);
    this.stats.readMs = ms;
    this.lastRead = { book, side, ok: res.ok, refused: res.refused || null, opened: res.opened || null, dir: res.dir || null, closed: res.closed, ms, far: 0, state: null };
    if (!res.ok) {
      this.refusals++;
      e.audio.sfx('buzzer', { volume: 0.5 });
      if (ent.prop) { ent.prop.offX = 1; e.after(3, () => { if (ent.prop) ent.prop.offX = 0; }); }
      if (!f.game.counters['bark:would_fold']) f.bark('would_fold');
      else this.float(res.refused === 'onto_actor' ? 'Something is standing there.' : "Not while we're standing on it.", ent);
      this.lastRead.state = this.state;
      return false;
    }
    this.state = res.state;
    this.lastRead.state = this.state;
    const cells = changed(this.m, before, this.state);
    for (const i of cells) this.applyCell(i);
    this.reads++;
    const pairClosed = res.opened && res.closed.length > 0;
    if (res.opened) e.audio.sfx('page_open');
    if (!res.opened || pairClosed) e.after(res.opened ? 6 : 0, () => e.audio.sfx('page_fold'));
    // the realm's float line, once a save
    if (res.opened && this.m.def[k].realm) {
      const ck = `realm:${this.m.def[k].realm}`;
      if (!f.game.counters[ck]) { f.game.counters[ck] = 1; this.float(this.realmLine(k, ent), ent); }
    }
    const walls = res.opened ? this.m.def[k].pagesOf[res.dir].some((i) => !this.overVoid(i)) : false;
    const bridges = res.opened ? this.m.def[k].pagesOf[res.dir].some((i) => this.overVoid(i)) : false;
    this.setFrames();
    if (cells.length) await this.animate(before, this.state, cells);
    this.setFrames();
    const far = this.farChanges(cells);
    this.lastRead.far = far ? far.length : 0;
    if (far && !f.dead) await this.reveal(far);
    // first-time barks (once per save; spoken when the field is idle)
    if (res.opened && bridges) f.bark('first_open');
    if (walls) f.bark('first_wall');
    if (pairClosed) f.bark('first_pair');
    return cells.length > 0;
  }

  /** The open (pages rising from the spine outward) and the fold (outer pages first): OPEN_FRAMES / FOLD_FRAMES. */
  async animate(a, b, cells) {
    if (this.still) { this.anim = null; return; }
    const map = new Map(), books = new Map();
    for (let k = 0; k < this.m.books.length; k++) if (a[k] !== b[k]) books.set(k, b[k] !== SHUT ? 'open' : 'fold');
    let frames = 0;
    for (const i of cells) {
      const k = this.m.owner[i];
      const on = covered(this.m, b, i), was = covered(this.m, a, i);
      if (on === was) continue;
      const len = this.m.def[k].length;
      if (on) { map.set(i, { kind: 'open', d: Math.round((this.dist[i] / Math.max(1, len - 1 || 1)) * (OPEN_FRAMES - 5)) }); frames = Math.max(frames, OPEN_FRAMES); }
      else { map.set(i, { kind: 'fold', d: Math.round(((len - 1 - this.dist[i]) / Math.max(1, len - 1 || 1)) * (FOLD_FRAMES - 4)) }); frames = Math.max(frames, FOLD_FRAMES); }
    }
    if (!map.size) return;
    this.busy = true;
    this.anim = { k: 0, frames, cells: map, books, before: a, done: null, promise: null };
    this.anim.promise = new Promise((res) => { this.anim.done = res; });
    try { await this.anim.promise; } finally { this.busy = false; }
  }
  stepAnim() {
    const a = this.anim;
    if (!a) return;
    a.k++;
    if (a.k >= a.frames) { this.anim = null; a.done(); }
  }
  /** 0..1: how much of a page cell shows this frame. */
  look(i) {
    const a = this.anim, c = a && a.cells.get(i);
    if (!c) return covered(this.m, this.state, i) ? 1 : 0;
    if (c.kind === 'open') return Math.max(0, Math.min(1, (a.k - c.d) / 4));
    return Math.max(0, Math.min(1, 1 - (a.k - c.d) / 3));
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
      await cam.panTo((best % m.W) * TILE + 8, ((best / m.W) | 0) * TILE + 8, 28);
      for (let k = 0; k < 50 && !f.dead && !(e.input.pressed('confirm') || e.input.pressed('cancel')); k++) await e.waitFrames(1);
      if (!f.dead) await cam.returnTo(f.leader, 28);
    } finally { f.unlockInput(); this.revealing = false; }
  }

  /** Scripts and labs: set the books directly (a state string, or { a: 'n', b: '-' }), no sound, no animation. */
  setState(s) {
    if (!this.active) return '';
    let next = this.state;
    if (typeof s === 'string' && s.length === this.m.books.length) next = s;
    else if (s && typeof s === 'object') for (const [id, dir] of Object.entries(s)) {
      const k = this.kOf(id);
      if (k < 0) continue;
      const d = this.m.def[k];
      const c = dir === SHUT || dir == null || dir === false ? SHUT : AXES[d.axis].includes(dir) ? dir : null;
      if (c == null) continue;
      next = next.slice(0, k) + c + next.slice(k + 1);
      if (c !== SHUT && this.m.pair[k] >= 0) next = next.slice(0, this.m.pair[k]) + SHUT + next.slice(this.m.pair[k] + 1);
    }
    const before = this.state;
    this.state = next;
    for (const i of changed(this.m, before, next)) this.applyCell(i);
    this.setFrames();
    return this.state;
  }

  /** May this actor step onto (x, y)? Enemies and NPCs never stand on a page cell, in any state. */
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
    if (this.anim) this.setFrames();
    this.lanternReveal();
    this.ghost = this.ghostNow();
    const ms = round3(now() - t0);
    this.stats.updateMs = ms;
    this.stats.maxUpdateMs = Math.max(this.stats.maxUpdateMs, ms);
  }

  /**
   * The ghost of the book the leader faces from a long side, standing still: a shut book shows where its pages will stand
   * (they open away from the reader), an open one the cells that will clear. Nothing while a read runs or a book is hidden.
   */
  ghostNow() {
    const f = this.f, L = f.leader, m = this.m;
    if (!L || this.busy || L.moving || !L.facingTile) return null;
    const [fx, fy] = L.facingTile();
    if (fx < 0 || fy < 0 || fx >= m.W || fy >= m.H) return null;
    const k = m.bookAt[fy * m.W + fx];
    if (k < 0) return null;
    const ent = this.entOf(k);
    if (!ent || !ent.present || this.hidden(ent)) return null;
    const side = sideOf(m, k, L.tx, L.ty);
    if (!side || side === 'end') return null;
    const cur = this.state[k];
    const mode = cur === SHUT ? 'open' : 'clear';
    const cells = Array.from(m.def[k].pagesOf[cur === SHUT ? OPP[side] : cur]);
    return { k, cells, mode, set: new Set(cells) };
  }

  // ------------------------------------------------------------------ drawing
  ensureTiles() {
    if (this.tiles) return this.tiles;
    const r = this.f.engine.renderer;
    if (!r || !r.createLayer) return null;
    const mk = (w, h, paint) => { const L = r.createLayer(w, h); if (L.ctx && typeof L.ctx.fillRect === 'function') paint(L.ctx); return L; };
    const bridge = { h: [], v: [] }, wall = { h: [], v: [] };
    for (let n = 0; n < 16; n++) {
      bridge.h.push(mk(TILE, TILE, (g) => paintBridgeCell(g, 0, 0, n, 'h', n)));
      bridge.v.push(mk(TILE, TILE, (g) => paintBridgeCell(g, 0, 0, n, 'v', n)));
      wall.h.push(mk(TILE, 22, (g) => paintWallCell(g, 0, 0, n, n, 'h')));
      wall.v.push(mk(TILE, 22, (g) => paintWallCell(g, 0, 0, n, n, 'v')));
    }
    const motes = [];
    for (let k = 0; k < MOTES.frames; k++) motes.push(mk(MOTES.pattern, MOTES.pattern, (g) => paintMotes(g, k)));
    const realms = {};
    for (const id of REALM_MODELS) realms[id] = mk(14, 16, (g) => paintRealm(g, 1, 1, id));
    this.tiles = { bridge, wall, motes, realms };
    return this.tiles;
  }

  /** The neighbour mask of a page cell: which neighbours are showing pages of the same book (look > 0) of the same kind. */
  nbMask(i, lookFn) {
    const m = this.m, x = i % m.W, y = (i / m.W) | 0, k = m.owner[i], v = this.overVoid(i);
    let n = 0;
    const same = (dx, dy) => {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= m.W || ny >= m.H) return false;
      const j = ny * m.W + nx;
      return m.owner[j] === k && lookFn(j) > 0 && this.overVoid(j) === v;
    };
    if (same(0, -1)) n |= NB.N;
    if (same(0, 1)) n |= NB.S;
    if (same(-1, 0)) n |= NB.W;
    if (same(1, 0)) n |= NB.E;
    return n;
  }

  /** The motes frame now (null: none drawn). Off under reduceMotion; paused (frame 0) under the rubout tint. */
  moteFrameNow() {
    if (this.still) return null;
    const lt = this.f.lighting;
    if (lt && lt.tintName === 'rubout') return 0;
    return Math.floor((this.f.frame | 0) / MOTES.every) % MOTES.frames;
  }

  drawLow(r) {
    if (!this.active || !this.ensureTiles()) return;
    const t0 = now();
    const cam = this.f.camera, m = this.m, g = r.ctx, T = this.tiles, map = this.f.map;
    if (!cam || !g) return;
    const x0 = Math.max(0, Math.floor(cam.x / TILE) - 1), y0 = Math.max(0, Math.floor(cam.y / TILE) - 1);
    const x1 = Math.min(m.W - 1, x0 + Math.ceil((r.W || 384) / TILE) + 2), y1 = Math.min(m.H - 1, y0 + Math.ceil((r.H || 216) / TILE) + 3);
    const looks = new Map();
    const lookFn = (j) => { let v = looks.get(j); if (v == null) { v = this.look(j); looks.set(j, v); } return v; };
    const blit = (L, x, y, a = 1) => {
      if (!L || !L.canvas || a <= 0.02) return;
      if (a < 1) { g.globalAlpha = a; g.drawImage(L.canvas, x, y); g.globalAlpha = 1; } else g.drawImage(L.canvas, x, y);
    };
    // 1. the motes: added light over every void cell no page covers (3 frames, one every 30 game frames)
    const mk = this.moteFrameNow();
    this.moteFrame = mk;
    if (mk != null && typeof g.drawImage === 'function') {
      const tm = now();
      const L = T.motes[mk];
      if (L && L.canvas && typeof g.createPattern === 'function') {
        // one 'lighter' fill per run of void cells in a row; the pattern is anchored to the map, so the motes stay put
        if (!this.motePats || this.motePats.ctx !== g) this.motePats = { ctx: g, pats: [] };
        const pat = this.motePats.pats[mk] || (this.motePats.pats[mk] = g.createPattern(L.canvas, 'repeat'));
        const op = g.globalCompositeOperation, fs = g.fillStyle;
        g.globalCompositeOperation = 'lighter';
        g.fillStyle = pat;
        for (let y = y0; y <= y1; y++) {
          let run = -1;
          for (let x = x0; x <= x1 + 1; x++) {
            let isVoid = false;
            if (x <= x1) {
              const i = y * m.W + x;
              const code = this.isPage(i) ? this.origCode.get(i) : map.base[y][x];
              isVoid = code === 'void' && !(this.isPage(i) && lookFn(i) > 0);
            }
            if (isVoid && run < 0) run = x;
            else if (!isVoid && run >= 0) { g.fillRect(run * TILE, y * TILE, (x - run) * TILE, TILE); run = -1; }
          }
        }
        g.globalCompositeOperation = op;
        g.fillStyle = fs;
      }
      const mm = round3(now() - tm);
      this.stats.moteMs = mm; this.stats.maxMoteMs = Math.max(this.stats.maxMoteMs, mm);
    }
    // 2. bridges (pages over void), with a 2 px shadow onto the void below and to the right
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * m.W + x;
      if (!this.isPage(i) || !this.overVoid(i)) continue;
      const a = lookFn(i);
      if (a <= 0) continue;
      const ax = m.def[m.owner[i]].axis;
      blit(T.bridge[ax === 'ns' ? 'h' : 'v'][this.nbMask(i, lookFn)], x * TILE, y * TILE, a);
      const below = i + m.W, right = i + 1;
      const shadowOn = (j, jx, jy) => jx < m.W && jy < m.H && !(this.isPage(j) && lookFn(j) > 0 && this.overVoid(j)) && (this.isPage(j) ? this.overVoid(j) : map.base[jy][jx] === 'void');
      if (shadowOn(below, x, y + 1)) { g.globalAlpha = 0.85 * a; paintShadow(g, x * TILE, (y + 1) * TILE, true); g.globalAlpha = 1; }
      if (shadowOn(right, x + 1, y)) { g.globalAlpha = 0.85 * a; paintShadow(g, (x + 1) * TILE, y * TILE, false); g.globalAlpha = 1; }
    }
    // 3. walls (pages standing on floor): top to bottom, each cap over the cell above; rising with its look
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * m.W + x;
      if (!this.isPage(i) || this.overVoid(i)) continue;
      const a = lookFn(i);
      if (a <= 0) continue;
      const L = T.wall[m.def[m.owner[i]].axis === 'ns' ? 'h' : 'v'][this.nbMask(i, lookFn)];
      if (!L || !L.canvas) continue;
      const hgt = Math.max(2, Math.round(22 * a));
      // rising: the whole block squashed to its height so far, standing on the floor line
      if (typeof g.drawImage === 'function') g.drawImage(L.canvas, 0, 0, TILE, 22, x * TILE, y * TILE + 16 - hgt, TILE, hgt);
    }
    // 4. the realm models, standing up from the middle of an open realm book's pages
    for (let k = 0; k < m.books.length; k++) {
      const d = m.def[k], dir = this.state[k];
      if (!d.realm || !T.realms[d.realm]) continue;
      // folding: the model goes down with the pages it stands on (the state before the read)
      const showDir = dir !== SHUT ? dir : this.anim && this.anim.books.get(k) === 'fold' ? this.anim.before[k] : null;
      if (!showDir) continue;
      const cells = d.pagesOf[showDir];
      const mid = cells[Math.min(cells.length - 1, 2 * Math.floor((d.length - 1) / 2))];
      const a = lookFn(mid);
      if (a <= 0) continue;
      const mx = (mid % m.W), my = (mid / m.W) | 0;
      const px = d.axis === 'ns' ? mx * TILE + 16 - 7 : mx * TILE + 1, py = d.axis === 'ns' ? my * TILE - 2 : my * TILE + 16 - 2;
      blit(T.realms[d.realm], px, py, a);
    }
    // 5. the ghost: a dotted gold outline round the cells to be (open) or to clear, and a faint fill
    const gh = this.ghost;
    if (gh && typeof g.fillRect === 'function') {
      for (const i of gh.cells) {
        const x = i % m.W, y = (i / m.W) | 0;
        if (x < x0 || x > x1 || y < y0 || y > y1) continue;
        // a faint wash on floor only: over the void a fill would muddy it toward floor (the phone rule), so dots alone there
        if (!this.overVoid(i) && !(covered(m, this.state, i))) {
          g.globalAlpha = gh.mode === 'open' ? 0.07 : 0.05;
          g.fillStyle = PAL.ghost.fill; g.fillRect(x * TILE, y * TILE, TILE, TILE);
          g.globalAlpha = 1;
        }
        const out = (dx, dy) => { const nx = x + dx, ny = y + dy; return nx < 0 || ny < 0 || nx >= m.W || ny >= m.H || !gh.set.has(ny * m.W + nx); };
        if (out(0, -1)) paintGhostEdge(g, x * TILE, y * TILE, 'N');
        if (out(0, 1)) paintGhostEdge(g, x * TILE, y * TILE, 'S');
        if (out(-1, 0)) paintGhostEdge(g, x * TILE, y * TILE, 'W');
        if (out(1, 0)) paintGhostEdge(g, x * TILE, y * TILE, 'E');
      }
    }
    const ms = round3(now() - t0);
    this.stats.drawMs = ms;
    this.stats.maxDrawMs = Math.max(this.stats.maxDrawMs, ms);
  }

  /** Lights for the field's lighting pass on a dark map: a warm pool over every open book, faint light along its bridge. */
  lights() {
    const f = this.f, m = this.m;
    if (!this.active || !(f.lighting && f.lighting.dark > 0.01)) return [];
    const out = [];
    for (let k = 0; k < m.books.length; k++) {
      if (this.state[k] === SHUT) continue;
      const d = m.def[k];
      const ent = this.entOf(k);
      if (ent && this.hidden(ent)) continue;
      out.push({ x: d.x * TILE + (d.axis === 'ns' ? 16 : 8), y: d.y * TILE + (d.axis === 'ns' ? 8 : 16), r: 40, kind: 'warm', color: '#ffd890' });
      let n = 0;
      for (const i of d.pagesOf[this.state[k]]) {
        if (n >= 8 || this.dist[i] % 2 !== 1 || this.look(i) < 1) continue;
        out.push({ x: (i % m.W) * TILE + 8, y: ((i / m.W) | 0) * TILE + 8, r: 22, kind: 'warm' });
        n++;
      }
    }
    return out;
  }

  debugState() {
    if (!this.active) return { active: false };
    const f = this.f, m = this.m, L = f.leader;
    let bridges = 0, walls = 0;
    for (const i of this.origCode.keys()) if (covered(m, this.state, i)) { if (this.overVoid(i)) bridges++; else walls++; }
    return {
      active: true, books: m.books, state: this.state, open: Object.fromEntries(m.books.map((id, k) => [id, openDir(m, this.state, k)])),
      describe: describe(m, this.state), bridges, walls, busy: this.busy, anim: this.anim ? this.anim.k : null, reads: this.reads,
      refusals: this.refusals, lastRead: this.lastRead, leader: L ? [L.tx, L.ty] : null, rescued: this.rescued || null,
      ghost: this.ghost ? { book: m.books[this.ghost.k], mode: this.ghost.mode, cells: this.ghost.cells.length } : null,
      moteFrame: this.moteFrame, line: this.line ? this.line.text : null,
      events: m.events.map((e) => { const ent = f.entities.get(e.id); return { id: e.id, book: e.book, frame: ent && ent.prop ? ent.prop.state : null, sprite: ent && ent.prop ? ent.prop.t : null, hidden: ent ? this.hidden(ent) : null }; }),
      readMs: this.stats.readMs, resetMs: this.stats.resetMs, updateMs: this.stats.updateMs, maxUpdateMs: this.stats.maxUpdateMs,
      drawMs: this.stats.drawMs, maxDrawMs: this.stats.maxDrawMs, moteMs: this.stats.moteMs, maxMoteMs: this.stats.maxMoteMs, sheet: SHEET,
    };
  }
}
