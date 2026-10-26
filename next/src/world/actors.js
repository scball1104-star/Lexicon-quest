// Field actors: party members, NPCs, map enemies, scripted sprites (W2-world).
//
//   const a = new Actor(field, { id, kind: 'party'|'npc'|'enemy'|'actor'|'spawn', sprite, x, y, dir, solid, name });
//   a.tryStep('left', WALK_FRAMES)       -> true when the step started (collision via field.canStep)
//   a.forceStep('left', dur)             scripted step, ignores collision
//   a.hop('down')                        one-way ledge hop (arc, jump + land sfx)
//   a.jump()                             small hop in place
//   a.face('up')  a.faceToward(other)    turn
//   a.update()                           one logic frame: interpolation, hop arcs, timers; returns true on arrival
//   a.draw(r, t)                         shadow + sprite at the rounded pixel position
//   a.showEmote('!')                     balloon over the head (drawn by the field above lighting)
//
// Grid movement: 16 px per step over `dur` frames (12 walk, 8 run, 18 slow), interpolated; a new step can
// start on the very frame the previous one ends so held input moves at a constant speed with no idle frame.
// Sprites: party_field (hero, mira, bram), npcs (humanoids, animals, dough), enemies_field (face left).

import { DIRS, OPPOSITE, dirBetween } from './pathfind.js';

export const TILE = 16;
export const WALK_FRAMES = 12;
export const RUN_FRAMES = 8;
export const SLOW_FRAMES = 18;
export const SPEEDS = { walk: WALK_FRAMES, run: RUN_FRAMES, slow: SLOW_FRAMES, fast: 6 };
export const PARTY_IDS = new Set(['hero', 'mira', 'bram']);
const ANIMALS = { animal_cat: 'catdog', animal_dog: 'catdog', animal_chicken: 'chicken', animal_duck: 'duck', animal_sheep: 'sheep' };
const EMOTE_KINDS = { '!': 'exclaim', '?': 'question', '...': 'dots', heart: 'heart', sweat: 'sweat', anger: 'anger', music: 'music', zzz: 'zzz', idea: 'idea' };
export const EMOTE_FRAMES = 54;

/** Resolve a sprite id to its atlas and drawing rules. Never throws: unknown ids fall back to the hero. */
export function resolveSprite(assets, id) {
  if (PARTY_IDS.has(id)) return { atlas: 'party_field', kind: 'char', id, shadow: 'medium', w: 24, h: 32 };
  if (ANIMALS[id]) return { atlas: 'npcs', kind: 'animal', sub: ANIMALS[id], id, shadow: 'small', w: 16, h: 16 };
  if (id === 'npc_dough') return { atlas: 'npcs', kind: 'dough', id, shadow: 'small', w: 16, h: 16 };
  const npcs = assets.has('npcs') ? assets.atlas('npcs') : null;
  if (npcs && npcs.frames[`${id}_down_0`]) return { atlas: 'npcs', kind: 'char', id, shadow: 'medium', w: 24, h: 32 };
  const ef = assets.has('enemies_field') ? assets.atlas('enemies_field') : null;
  if (ef && ef.frames[`${id}_0`]) {
    const s = ef.meta && ef.meta.sprites && ef.meta.sprites[id];
    const w = s ? s.size[0] : 16, h = s ? s.size[1] : 16;
    return { atlas: 'enemies_field', kind: 'enemy', id, shadow: w >= 32 ? 'huge' : w >= 24 ? 'large' : 'small', w, h };
  }
  return { atlas: 'party_field', kind: 'char', id: 'hero', shadow: 'medium', w: 24, h: 32, missing: id };
}

// W11 (CRITIQUE_4 item 8): the Court's visible enemies were camouflaged (a grey blob on a grey floor, dark grey on
// dark violet). Each gets a 1 px outline in its own material's dark (DESIGN 6.1) and, where the art has no bright
// spot, one accent cluster (the knight's visor glint), built once per frame into a padded copy. Episode 1's field
// enemies are untouched. accent: [x, y, colour] relative to the top-left of the opaque art of the frame.
export const FIELD_LOOK = {
  quicksilver: { outline: '#22223c' },
  quicksilver_bead: { outline: '#22223c' },
  glint_wisp: { outline: '#24123e' },
  glass_sentinel: { outline: '#121828' },
  faceless_knight: { outline: '#06050c', accent: [[8, 5, '#5fd8e8'], [9, 5, '#d8ffff'], [10, 5, '#5fd8e8']] },
  borrowed_shadow: { outline: '#0a0614' },
  shard_swarm: { outline: '#142238' },
};
const lookCache = new Map();
/** The outlined, accented copy of an atlas frame for FIELD_LOOK[id]: { atlas, frame } for renderer.sprite. */
export function lookFrame(atlas, name, look) {
  const key = `${name}`;
  let c = lookCache.get(key);
  if (c) return c;
  const f = atlas.frames[name];
  if (!f || typeof document === 'undefined') return null;
  const w = f.w + 2, h = f.h + 2;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  g.drawImage(atlas.image, f.x, f.y, f.w, f.h, 1, 1, f.w, f.h);
  const img = g.getImageData(0, 0, w, h), px = img.data;
  const op = (x, y) => x >= 0 && y >= 0 && x < w && y < h && px[(y * w + x) * 4 + 3] > 0;
  const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const ol = hex(look.outline);
  let top = h, left = w;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (op(x, y)) { if (y < top) top = y; if (x < left) left = x; }
  const add = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (op(x, y)) continue;
    if (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1)) add.push(x, y);
  }
  for (let i = 0; i < add.length; i += 2) { const j = (add[i + 1] * w + add[i]) * 4; px[j] = ol[0]; px[j + 1] = ol[1]; px[j + 2] = ol[2]; px[j + 3] = 255; }
  for (const [ax, ay, col] of look.accent || []) {
    const x = left + ax, y = top + ay;
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const j = (y * w + x) * 4, cc = hex(col);
    px[j] = cc[0]; px[j + 1] = cc[1]; px[j + 2] = cc[2]; px[j + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  c = { atlas: { image: cv, frames: {} }, frame: { x: 0, y: 0, w, h, ox: (f.ox || 0) + 1, oy: (f.oy || 0) + 1 } };
  lookCache.set(key, c);
  return c;
}

let nextSerial = 1;

// Field foes notice you from CHASE_RANGE tiles and close in a little slower than you walk (a pause of CHASE_PACE
// frames between steps), so a fight is something you can walk away from. (Was 5 tiles and a 2 frame pause.)
// Dungeon foes (step rule 'player') keep their 5 tile sight: they are puzzle pieces, not roamers.
const CHASE_RANGE = 3, CHASE_PACE = 10;

export class Actor {
  constructor(field, o = {}) {
    this.field = field;
    this.engine = field.engine;
    this.serial = nextSerial++;
    this.id = o.id || `actor_${this.serial}`;
    this.kind = o.kind || 'npc';
    this.name = o.name || null;
    this.portrait = o.portrait || null;
    this.spriteId = o.sprite || 'hero';
    this.spr = resolveSprite(this.engine.assets, this.spriteId);
    if (this.spr.missing) console.warn(`[actors] no sprite for "${this.spr.missing}", using hero`);
    this.solid = o.solid !== false;
    this.visible = o.visible !== false;
    this.alpha = o.alpha == null ? 1 : o.alpha;
    this.tint = o.tint || null;             // { color, amount }
    this.tx = o.x | 0; this.ty = o.y | 0;
    this.px = this.tx * TILE; this.py = this.ty * TILE;
    this.fromX = this.px; this.fromY = this.py; this.toX = this.px; this.toY = this.py;
    this.dir = DIRS[o.dir] ? o.dir : 'down';
    this.moving = false; this.t = 0; this.dur = WALK_FRAMES; this.steps = 0;
    this.hopping = null;                   // { t, dur, h, move }
    this.bob = !!o.bob;
    this.idleT = (this.serial * 37) % 180;
    this.blinkAt = 180 + ((this.serial * 53) % 240);
    this.emote = null;                     // { kind, t, total, resolve }
    this.talking = false;
    this.busy = 0;                         // scripted actions in flight
    this.brain = null;                     // NPC / enemy behaviour state
    this.data = o.data || null;
    this.stepSfx = o.stepSfx !== false;
    this.lastSurface = null;
    this.ev = o.ev || null;
  }

  get feetX() { return Math.round(this.px) + 8; }
  get feetY() { return Math.round(this.py) + 15; }
  get sortY() { return Math.round(this.py) + 15; }
  get isParty() { return this.kind === 'party'; }
  get isLeader() { return this.field.leader === this; }

  setPos(x, y, dir) {
    this.tx = x; this.ty = y;
    this.px = x * TILE; this.py = y * TILE;
    this.fromX = this.toX = this.px; this.fromY = this.toY = this.py;
    this.moving = false; this.t = 0; this.hopping = null;
    if (dir && DIRS[dir]) this.dir = dir;
  }
  face(dir) { if (DIRS[dir]) this.dir = dir; }
  faceToward(other) {
    const d = dirBetween([this.tx, this.ty], [other.tx, other.ty]);
    if (d) this.dir = d;
  }
  facingTile() { const [dx, dy] = DIRS[this.dir]; return [this.tx + dx, this.ty + dy]; }

  startStep(nx, ny, dur) {
    this.fromX = this.tx * TILE; this.fromY = this.ty * TILE;
    if (nx !== this.tx || ny !== this.ty) this.dir = nx > this.tx ? 'right' : nx < this.tx ? 'left' : ny > this.ty ? 'down' : 'up';
    const field = this.field;
    if (field.onActorLeave) field.onActorLeave(this, this.tx, this.ty);
    this.tx = nx; this.ty = ny;
    this.toX = nx * TILE; this.toY = ny * TILE;
    this.t = 0; this.dur = Math.max(1, dur | 0); this.moving = true; this.steps++;
    if (field.onActorEnter) field.onActorEnter(this, nx, ny);
  }

  /** Attempt a collision-checked step. Returns true when the step started. */
  tryStep(dir, dur = WALK_FRAMES) {
    if (this.moving) return false;
    this.dir = dir;
    const [dx, dy] = DIRS[dir];
    const nx = this.tx + dx, ny = this.ty + dy;
    const verdict = this.field.canStep(this, this.tx, this.ty, nx, ny, dir);
    if (verdict === true) { this.startStep(nx, ny, dur); return true; }
    if (verdict === 'hop') { this.hop(dir); return true; }
    return false;
  }
  /** Scripted step: ignores collision (map authors clear the path), stays inside the map. */
  forceStep(dir, dur = WALK_FRAMES) {
    if (this.moving) return false;
    this.dir = dir;
    const [dx, dy] = DIRS[dir];
    const nx = this.tx + dx, ny = this.ty + dy;
    if (!this.field.map.inBounds(nx, ny)) return false;
    this.startStep(nx, ny, dur);
    return true;
  }
  /** Ledge hop: one tile in `dir` on a small arc. */
  hop(dir, dur = 14) {
    if (this.moving) return false;
    const [dx, dy] = DIRS[dir];
    this.startStep(this.tx + dx, this.ty + dy, dur);
    this.hopping = { t: 0, dur, h: 7, move: true };
    this.engine.audio.sfx('jump');
    return true;
  }
  /** Small hop in place (surprise). */
  jump(dur = 12, h = 5) {
    this.hopping = { t: 0, dur, h, move: false };
    this.engine.audio.sfx('jump');
    return this.engine.waitFrames(dur);
  }

  /** One logic frame. Returns true on the frame a step completes. */
  update() {
    let arrived = false;
    if (this.moving) {
      this.t++;
      const k = Math.min(1, this.t / this.dur);
      this.px = this.fromX + (this.toX - this.fromX) * k;
      this.py = this.fromY + (this.toY - this.fromY) * k;
      if (k >= 1) { this.moving = false; this.px = this.toX; this.py = this.toY; arrived = true; }
    } else {
      this.idleT++;
    }
    if (this.hopping) {
      const h = this.hopping;
      h.t++;
      if (h.t >= h.dur) { this.hopping = null; this.engine.audio.sfx('land'); }
    }
    if (this.emote) {
      this.emote.t++;
      if (this.emote.t >= this.emote.total) { const e = this.emote; this.emote = null; if (e.resolve) e.resolve(); }
    }
    return arrived;
  }

  /** Vertical lift from a hop arc (0 when grounded). */
  get lift() {
    if (!this.hopping) return 0;
    const h = this.hopping;
    return Math.round(h.h * Math.sin(Math.PI * Math.min(1, h.t / h.dur)));
  }

  /** Walk-cycle slot: 0 stand, 1 step A, 2 step B, 3 blink. */
  walkFrame() {
    if (this.moving) {
      // Two animation frames per tile: a step pose for the first half, the stand pose for the second.
      const half = this.t < this.dur / 2;
      const alt = this.steps % 2 === 0;
      return half ? (alt ? 1 : 2) : 0;
    }
    if (this.idleT >= this.blinkAt && this.idleT < this.blinkAt + 7) return 3;
    if (this.idleT >= this.blinkAt + 7) { this.idleT = 0; this.blinkAt = 150 + ((this.serial * 31 + this.steps * 17) % 260); }
    return 0;
  }

  /** Atlas frame name and flip flag for this frame. */
  frame(t) {
    const s = this.spr;
    const a = this.engine.assets.atlas(s.atlas);
    if (s.kind === 'char') {
      const wf = this.walkFrame();
      const name = `${s.id}_${this.dir}_${wf === 3 ? 'blink' : wf}`;
      return { atlas: a, name: a.frames[name] ? name : `${s.id}_${this.dir}_0`, flip: false };
    }
    if (s.kind === 'animal') {
      const flip = this.dir === 'right';
      if (this.moving) return { atlas: a, name: `${s.id}_walk_0`, flip };
      const slow = Math.floor(t * 0.8) % 2;
      let name;
      if (s.sub === 'catdog') name = `${s.id}_sit_${slow}`;
      else if (s.sub === 'chicken') name = slow && Math.floor(t * 2.4) % 3 === 0 ? `${s.id}_peck_0` : `${s.id}_stand_0`;
      else name = `${s.id}_stand_${slow}`;
      return { atlas: a, name: a.frames[name] ? name : `${s.id}_stand_0`, flip };
    }
    if (s.kind === 'dough') return { atlas: a, name: `${s.id}_${Math.floor(t * 3) % 2}`, flip: false };
    // enemy: 2-frame idle hop; frame 1 while stepping; face left, flip for right
    const idle = Math.floor(t * 4) % 2;
    return { atlas: a, name: `${s.id}_${this.moving ? 1 : idle}`, flip: this.dir === 'right' };
  }

  draw(r, t, o = {}) {
    if (!this.visible) return;
    const fx = this.feetX, fy = this.feetY;
    if (this.spr.shadow && o.shadow !== false && this.engine.assets.has('misc')) {
      r.sprite('misc', `shadow_${this.spr.shadow}`, fx, fy + 1, { alpha: this.alpha * 0.9 });
    }
    const f = this.frame(t);
    let bob = 0;
    if (this.bob && this.moving && this.t < this.dur / 2) bob = 1;
    const y = fy - this.lift - bob;
    const opts = { flipX: f.flip, alpha: this.alpha };
    if (this.tint) { opts.tint = this.tint.color; opts.tintAmount = this.tint.amount; }
    if (o.tint) { opts.tint = o.tint; opts.tintAmount = o.tintAmount == null ? 1 : o.tintAmount; }
    const look = this.spr.kind === 'enemy' && FIELD_LOOK[this.spr.id] ? lookFrame(f.atlas, f.name, FIELD_LOOK[this.spr.id]) : null;
    if (look) r.sprite(look.atlas, look.frame, fx, y, opts);
    else r.sprite(f.atlas, f.name, fx, y, opts);
  }

  /** Balloon over the head. kinds: ! ? ... heart sweat anger music zzz idea. Returns a Promise. */
  showEmote(kind, frames = EMOTE_FRAMES) {
    const name = EMOTE_KINDS[kind] || EMOTE_KINDS[String(kind).toLowerCase()] || (Object.values(EMOTE_KINDS).includes(kind) ? kind : 'exclaim');
    this.engine.audio.sfx('emote_pop');
    return new Promise((resolve) => { this.emote = { kind: name, t: 0, total: frames, resolve }; });
  }

  /** Draw the emote balloon (called by the field after lighting so it stays readable). */
  drawEmote(r) {
    const e = this.emote;
    if (!e || !this.engine.assets.has('ui')) return;
    const ui = this.engine.assets.atlas('ui');
    let name;
    if (e.t < 4) name = e.t < 2 ? 'emote_pop_0' : 'emote_pop_1';
    else name = `emote_${e.kind}_${Math.floor((e.t - 4) / 20) % 2}`;
    if (!ui.frames[name]) name = `emote_${e.kind}_0`;
    if (!ui.frames[name]) return;
    const fade = e.total - e.t < 6 ? (e.total - e.t) / 6 : 1;
    const headY = this.feetY - this.lift - (this.spr.h - 2);
    r.sprite(ui, name, this.feetX + 2, headY, { alpha: fade });
  }

  debugState() {
    return { id: this.id, x: this.tx, y: this.ty, px: Math.round(this.px), py: Math.round(this.py), dir: this.dir, moving: this.moving, sprite: this.spriteId };
  }
}

// ---------------------------------------------------------------- enemy brains (Lufia II visible enemies)
/**
 * Map enemy behaviour. In dungeons the enemy acts once per player step (`stepRule: 'player'`); in the field
 * it acts on its own timer. Modes: wander (random steps near home), patrol (path, then reverse), chase
 * (toward the leader within 5 tiles, else wander), guard (still until the leader is adjacent, then lunges).
 */
export class EnemyBrain {
  constructor(actor, ev, stepRule) {
    this.actor = actor;
    this.mode = ev.move || 'wander';
    this.radius = ev.radius || 3;
    this.path = Array.isArray(ev.path) && ev.path.length ? ev.path.slice() : null;
    this.pathI = 0; this.pathDir = 1;
    this.home = [actor.tx, actor.ty];
    this.stepRule = stepRule;   // 'player' | 'free'
    this.timer = 20 + ((actor.serial * 29) % 40);
    this.aggro = false;
    this.pending = 0;           // player steps not yet answered (dungeon rule)
    this.stun = 0;              // frames to sit still (after a flee)
    this.encounter = ev.encounter;
    this.sideDir = null;
  }

  onPlayerStep() { if (this.stepRule === 'player') this.pending++; }

  tick(field) {
    const a = this.actor;
    if (a.moving || a.talking || field.inputLocked) return;
    if (this.stun > 0) { this.stun--; return; }
    if (this.stepRule === 'player') {
      if (this.pending <= 0) return;
      this.pending = Math.min(this.pending - 1, 1);
      this.act(field, field.leader.dur || WALK_FRAMES);
    } else {
      if (--this.timer > 0) return;
      const chasing = this.mode === 'chase' && this.nearLeader(field, CHASE_RANGE);
      this.timer = chasing ? CHASE_PACE : this.mode === 'patrol' ? 10 : 36 + ((a.serial * 13 + a.steps * 7) % 50);
      this.act(field, chasing ? WALK_FRAMES : WALK_FRAMES + 2);
    }
  }

  nearLeader(field, n) {
    const L = field.leader, a = this.actor;
    return Math.abs(L.tx - a.tx) + Math.abs(L.ty - a.ty) <= n;
  }

  act(field, dur) {
    const a = this.actor;
    const L = field.leader;
    const rng = field.rng;
    const dist = Math.abs(L.tx - a.tx) + Math.abs(L.ty - a.ty);
    let dir = null;
    if (this.mode === 'guard') {
      if (dist <= 3) a.faceToward(L);
      if (dist === 1) dir = dirBetween([a.tx, a.ty], [L.tx, L.ty]);
    } else if (this.mode === 'chase' && dist <= (this.stepRule === 'player' ? 5 : CHASE_RANGE)) {
      this.aggro = true;
      dir = this.stepToward(field, L);
    } else if (this.mode === 'patrol' && this.path) {
      const raw = this.path[this.pathI];
      dir = this.pathDir > 0 ? raw : OPPOSITE[raw];
      const [dx, dy] = DIRS[dir];
      if (field.canStep(a, a.tx, a.ty, a.tx + dx, a.ty + dy, dir) !== true && !this.leaderAt(field, a.tx + dx, a.ty + dy)) { a.face(dir); return; }
      this.pathI += this.pathDir;
      if (this.pathI >= this.path.length) { this.pathI = this.path.length - 1; this.pathDir = -1; }
      else if (this.pathI < 0) { this.pathI = 0; this.pathDir = 1; }
    } else {
      // wander within radius of home; sometimes just turn
      if (rng.chance(0.25)) { a.face(rng.pick(['up', 'down', 'left', 'right'])); return; }
      const opts = ['up', 'down', 'left', 'right'].filter((d) => {
        const nx = a.tx + DIRS[d][0], ny = a.ty + DIRS[d][1];
        return Math.abs(nx - this.home[0]) <= this.radius && Math.abs(ny - this.home[1]) <= this.radius;
      });
      dir = opts.length ? rng.pick(opts) : null;
    }
    if (!dir) return;
    const [dx, dy] = DIRS[dir];
    const nx = a.tx + dx, ny = a.ty + dy;
    if (this.leaderAt(field, nx, ny)) { a.face(dir); field.touchEnemy(a, 'enemy'); return; }
    if (field.canStep(a, a.tx, a.ty, nx, ny, dir) === true) a.startStep(nx, ny, dur);
    else a.face(dir);
  }

  leaderAt(field, x, y) { return field.leader.tx === x && field.leader.ty === y; }

  stepToward(field, L) {
    const a = this.actor;
    const dx = L.tx - a.tx, dy = L.ty - a.ty;
    const first = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    const second = Math.abs(dx) >= Math.abs(dy) ? (dy > 0 ? 'down' : dy < 0 ? 'up' : null) : (dx > 0 ? 'right' : dx < 0 ? 'left' : null);
    const open = (d) => {
      const nx = a.tx + DIRS[d][0], ny = a.ty + DIRS[d][1];
      return this.leaderAt(field, nx, ny) || field.canStep(a, a.tx, a.ty, nx, ny, d) === true;
    };
    for (const d of [first, second]) {
      if (!d || (this.sideDir && d === OPPOSITE[this.sideDir])) continue;
      if (open(d)) { if (d === first) this.sideDir = null; return d; }
    }
    // W7: boxed in by a prop, side-step round it (sticky side, never straight back) instead of freezing
    const sides = Math.abs(dx) >= Math.abs(dy) ? ['up', 'down'] : ['left', 'right'];
    const s0 = this.sideDir && sides.includes(this.sideDir) ? this.sideDir : sides[a.serial % 2];
    for (const d of [s0, OPPOSITE[s0]]) if (open(d)) { this.sideDir = d; return d; }
    return first;
  }
}
