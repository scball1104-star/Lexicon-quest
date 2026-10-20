// Field abilities (W9-abilities): Lufia II gave every hero a field tool that opened the map. Here each party
// member has one, used with the field's tool button.
//
//   Hero  Dash Strike  a short forward dash (3 tiles). Plows through pots, breaks thin root walls and cracked
//                      rock, and a visible enemy struck from behind starts the fight `preemptive` (free first turn).
//   Mira  Appraise     face a visible enemy (5 tiles, one tile either side of the line): its weaknesses and
//                      resistances go straight into the Bestiary, so the battle shows them instead of "?".
//         Lantern      the Lantern of Recall (FieldScene.useLantern), once it is carried.
//   Bram  Shove        pushes a heavy block (`block` + `heavy`) one tile; the hero alone only makes it rock.
//
// Controls: pageR (keyboard E, pad RB) uses, pageL (Q, LB) switches the selected ability and shows the wheel over
// the leader. Touch: the on-canvas ability button (ABILITY_BTN, where the old Lantern button sat) uses, the swap
// tab beside it (CYCLE_BTN) switches; both show whenever there is something to use an ability on.
//
// What pageR does (resolve): an object that needs one particular ability wins (a heavy block in front -> Shove;
// a root wall or cracked rock in the dash lane -> Dash Strike); then the selected ability when it has a target;
// then the Lantern when unrevealed ink lies within its reach (so "raise the Lantern with pageR" stays true
// whatever is selected); then the selected ability on its own (a free dash, a raised Lantern, "nothing here").
// The selection is saved in engine.game.fieldAbility.
//
// Pure helpers (node tests): abilitiesFor, selectedAbility, cycleAbility, scanLane, appraiseTarget,
// appraisalRows, writeAppraisal. The FieldAbilities class is the field glue (input, actions, effects, drawing).

import { DIRS, OPPOSITE } from './pathfind.js';
import { TILE, WALK_FRAMES } from './actors.js';
import * as EV from './events.js';
import { ICONS, installFieldArt } from './fieldart.js';
import { ENCOUNTERS } from '../data/encounters.js';
import { ENEMIES } from '../data/enemies.js';
import { FIELD_ABILITIES, HELP } from '../data/text.js';
import { mergeBestiary } from '../battle/scene/rewards.js';
import { drawWindow, drawIcon } from '../ui/window.js';
import { touchUi } from '../ui/list.js';

export const ORDER = ['dash', 'appraise', 'lantern', 'shove'];
export const DASH_TILES = 3;
export const DASH_FRAMES = 4;            // frames per tile while dashing (running is 8)
export const APPRAISE_RANGE = 5;
export const LANTERN_REACH = 6;          // events.revealInk's radius: pageR picks the Lantern when ink is this close
export const RING_FRAMES = 96;
/** Touch: the ability button (the old Lantern button's rect, so a tap there still raises the Lantern) and its swap tab. */
export const ABILITY_BTN = { x: 322, y: 128, w: 58, h: 18 };
export const CYCLE_BTN = { x: 302, y: 128, w: 18, h: 18 };
const SHORT = { dash: 'Dash', appraise: 'Appraise', lantern: 'Lantern', shove: 'Shove' };
const ICON = { dash: ICONS.dash, appraise: ICONS.appraise, lantern: null, shove: ICONS.shove };

// ---------------------------------------------------------------------------------------------- pure helpers
const inParty = (game, id) => !!(game && game.party && game.party.some((m) => m.id === id));

/** The abilities this party can use now, in wheel order. The hero's Dash Strike is always there. */
export function abilitiesFor(game) {
  const out = [];
  for (const id of ORDER) {
    const owner = FIELD_ABILITIES[id].owner;
    if (owner !== 'hero' && !inParty(game, owner)) continue;
    if (id === 'lantern' && !(game && game.items && game.items.lantern_of_recall)) continue;
    out.push(id);
  }
  return out;
}
/** The selected ability (falls back to the first available one when the saved pick is gone). */
export function selectedAbility(game) {
  const list = abilitiesFor(game);
  return list.includes(game && game.fieldAbility) ? game.fieldAbility : list[0];
}
/** Step the selection by d (+1 / -1) through the available abilities; returns the new id. */
export function cycleAbility(game, d = 1) {
  const list = abilitiesFor(game);
  const i = list.indexOf(selectedAbility(game));
  const next = list[(i + d + list.length * 4) % list.length];
  if (game) game.fieldAbility = next;
  return next;
}

/**
 * What a dash from (x, y) toward dir meets within `max` tiles. q: { inBounds(x,y), code(x,y) (props included),
 * ents(x,y) (present entities), actor(x,y) (a solid actor or null), stop(x,y) (a door / step trigger / exit
 * that ends a dash on it) }. Returns { path: [[x,y]...] tiles the dasher enters, pots: [ent...] smashed on the
 * way, stopAt: bool, hit: null | { kind, ent?, actor?, at: [x,y] } } where kind is 'roots' | 'rock' (a
 * breakable), 'enemy', 'heavy', 'block', 'actor' (an NPC or scripted actor), 'wall', 'edge' (water, pit, ledge).
 */
export function scanLane(q, x, y, dir, max = DASH_TILES) {
  const [dx, dy] = DIRS[dir];
  const path = [], pots = [];
  for (let i = 1; i <= max; i++) {
    const nx = x + dx * i, ny = y + dy * i;
    const at = [nx, ny];
    if (!q.inBounds(nx, ny)) return { path, pots, hit: { kind: 'wall', at } };
    const ents = q.ents(nx, ny);
    const brk = ents.find((e) => e.type === 'object' && e.ev.breakable && e.state !== 'broken' && !(e.data && e.data.concealed));
    if (brk) return { path, pots, hit: { kind: brk.ev.breakable, ent: brk, at } };
    // blocks, and E2's sliding mirrors (heavy: Bram's Shove; push: a light push)
    const blk = ents.find((e) => e.type === 'block' || (e.type === 'mirror' && (e.ev.heavy || e.ev.push)));
    if (blk) return { path, pots, hit: { kind: blk.ev.heavy ? 'heavy' : 'block', ent: blk, at } };
    const a = q.actor(nx, ny);
    if (a) return { path, pots, hit: { kind: a.kind === 'enemy' ? 'enemy' : 'actor', actor: a, at } };
    const pot = ents.find((e) => e.type === 'pot' && e.state !== 'broken');
    if (pot) { pots.push(pot); path.push(at); continue; }
    const code = q.code(nx, ny);
    if (code === 'pit' || code === 'water' || code.startsWith('ledge')) return { path, pots, hit: { kind: 'edge', at } };
    if (code !== 'none') return { path, pots, hit: { kind: 'wall', at } };
    path.push(at);
    if (q.stop(nx, ny)) return { path, pots, hit: null, stopAt: true };
  }
  return { path, pots, hit: null };
}

/**
 * The visible enemy Appraise reads from (x, y) facing dir: the nearest one up to `range` tiles ahead, on the
 * line or one tile either side of it, with no wall on the line between. q as scanLane plus enemyAt(x, y).
 */
export function appraiseTarget(q, x, y, dir, range = APPRAISE_RANGE) {
  const [dx, dy] = DIRS[dir];
  const px = -dy, py = dx;                       // the perpendicular
  for (let i = 1; i <= range; i++) {
    const cx = x + dx * i, cy = y + dy * i;
    if (!q.inBounds(cx, cy)) return null;
    for (const s of [0, -1, 1]) {
      if (s && i < 2) continue;                  // beside the leader is not "ahead"
      const e = q.enemyAt(cx + px * s, cy + py * s);
      if (e) return e;
    }
    const code = q.code(cx, cy);
    if (code === 'solid' || code === 'void') {
      const a = q.actor(cx, cy);
      if (!a) return null;                       // a wall ends the line of sight (an NPC does too)
      if (a.kind !== 'enemy') return null;
    }
  }
  return null;
}

/** One row per distinct enemy of an encounter: { id, name, level, shields, count, weak, resist }. */
export function appraisalRows(encounterId) {
  const enc = ENCOUNTERS[encounterId];
  if (!enc) return [];
  const rows = [];
  for (const id of enc.enemies) {
    const d = ENEMIES[id];
    if (!d) continue;
    const row = rows.find((r) => r.id === id);
    if (row) { row.count++; continue; }
    rows.push({ id, name: d.name, level: d.level, shields: d.shields, count: 1, weak: d.weak.slice(),
      resist: [...d.resist, ...d.immune, ...d.absorb], elite: !!(enc.elite && enc.elite.index === rows.length) });
  }
  return rows;
}

/** Write an encounter's weaknesses and resistances into game.bestiary (the battle's contract). Returns the keys. */
export function writeAppraisal(game, encounterId) {
  const revealed = {};
  for (const r of appraisalRows(encounterId)) revealed[r.id] = [...r.weak, ...r.resist];
  mergeBestiary(game, revealed);
  for (const k of Object.keys(revealed)) if (game.bestiary[k]) game.bestiary[k].appraised = true;
  return Object.keys(revealed);
}

/** True when every enemy of the encounter is already fully appraised in the bestiary. */
export function encounterAppraised(game, encounterId) {
  const rows = appraisalRows(encounterId);
  return rows.length > 0 && rows.every((r) => game.bestiary && game.bestiary[r.id] && game.bestiary[r.id].appraised);
}

// ---------------------------------------------------------------------------------------------- field glue
export class FieldAbilities {
  constructor(field) {
    this.f = field;
    this.busy = false;
    this.ring = 0;              // frames left on the wheel
    this.ringSlide = 0;         // slide offset when the selection changes
    this.ghosts = [];           // dash afterimages { x, y, atlas, name, flip, life, max }
    this.fx = [];               // short effects { kind, x, y, t, life, ... }
    this.ctx = null;            // cached resolve() for prompts: { id, kind, x, y, target }
    this.ctxKey = null;
    this.float = null;          // { text, t } a short line over the leader ("Nothing here to read.")
    this.panel = null;          // the Appraise window { rows, t }
    this.lean = null;           // { actor, dx, dy } a pixel lean during Shove
    this.label = null;          // { id, t } the ability name over the leader while it runs
    this.lastHit = null;        // debug: what the last dash hit
    this.used = 0;              // debug: abilities used this map
  }
  get engine() { return this.f.engine; }
  get game() { return this.f.game; }
  list() { return abilitiesFor(this.game); }
  has(id) { return this.list().includes(id); }
  selected() { return selectedAbility(this.game); }
  reset() { this.ghosts = []; this.fx = []; this.ctx = null; this.ctxKey = null; this.panel = null; this.float = null; this.lean = null; this.label = null; this.ring = 0; }

  /** pageL: switch to the next ability and show the wheel. */
  cycle(d = 1) {
    if (this.busy) return;
    const before = this.selected();
    const now = cycleAbility(this.game, d);
    this.ring = RING_FRAMES;
    this.ringSlide = now !== before ? 6 * d : 0;
    this.engine.audio.sfx(now !== before ? 'cursor' : 'buzzer', { volume: 0.8 });
    this.ctxKey = null;
  }

  // ------------------------------------------------------------------ queries over the live field
  query() {
    const f = this.f, map = f.map;
    return {
      inBounds: (x, y) => map.inBounds(x, y),
      code: (x, y) => map.codeAt(x, y),
      ents: (x, y) => EV.entitiesAt(f, x, y).filter((e) => e.present),
      actor: (x, y) => f.actorAt(x, y),
      enemyAt: (x, y) => f.actors.find((a) => a.kind === 'enemy' && a.visible && !(a.data && a.data.fighting) && a.tx === x && a.ty === y) || null,
      stop: (x, y) => this.stopsDash(x, y),
    };
  }
  /** A dash ends on a door, a step trigger, an exit cell or an open doorway (the field then fires it). */
  stopsDash(x, y) {
    const f = this.f;
    for (const e of EV.entitiesAt(f, x, y)) {
      if (!e.present) continue;
      if (e.type === 'door' && e.ev.to) return true;
      if (e.type === 'trigger' && (e.ev.on == null || e.ev.on === 'step')) return true;
      if ((e.type === 'gate' || e.type === 'locked_door') && e.state === 'open' && e.ev.to) return true;
    }
    for (const ex of f.map.mod.exits || []) if (x >= ex.x && x < ex.x + (ex.w || 1) && y >= ex.y && y < ex.y + (ex.h || 1)) return true;
    return false;
  }
  /** Unrevealed ink within the Lantern's reach (events.revealInk's radius). */
  inkWithin(cx, cy, R = LANTERN_REACH) {
    const map = this.f.map;
    for (let y = cy - R; y <= cy + R; y++) for (let x = cx - R; x <= cx + R; x++) {
      if (!map.inBounds(x, y) || Math.abs(x - cx) + Math.abs(y - cy) > R + 1) continue;
      if (map.idsAt(x, y).some((id) => id.endsWith('_faint'))) return true;
    }
    return false;
  }

  /**
   * What pageR would do now: { id, kind?, target?, lane?, at? } (see the header for the order). `target` is set
   * when the ability has something to work on; the prompt and the touch button follow it.
   */
  resolve() {
    const f = this.f, L = f.leader;
    if (!L || !f.map) return null;
    const list = this.list();
    const sel = this.selected();
    const q = this.query();
    const lane = scanLane(q, L.tx, L.ty, L.dir, DASH_TILES);
    const hit = lane.hit;
    // 1. an object that needs one ability
    if (hit && hit.kind === 'heavy' && hit.at[0] === L.tx + DIRS[L.dir][0] && hit.at[1] === L.ty + DIRS[L.dir][1] && list.includes('shove')) {
      return { id: 'shove', kind: 'heavy', target: hit.ent, at: hit.at };
    }
    // the Lantern prompt is showing (ink within two tiles): pageR is the Lantern, as the scripted lines promise
    const lanternUp = list.includes('lantern') && f.lantern <= 0;
    if (lanternUp && f.hiddenInkNear && f.hiddenInkNear()) return { id: 'lantern', kind: 'ink', target: true };
    if (hit && (hit.kind === 'roots' || hit.kind === 'rock') && list.includes('dash')) return { id: 'dash', kind: hit.kind, target: hit.ent, at: hit.at, lane };
    // 2. the selected ability, when it has a target
    if (sel === 'dash' && hit && hit.kind === 'enemy') return { id: 'dash', kind: 'enemy', target: hit.actor, at: hit.at, lane };
    if (sel === 'appraise') {
      const e = appraiseTarget(q, L.tx, L.ty, L.dir);
      if (e) return { id: 'appraise', kind: 'enemy', target: e, at: [e.tx, e.ty] };
    }
    if (sel === 'shove' && hit && hit.kind === 'heavy' && lane.path.length === 0) return { id: 'shove', kind: 'heavy', target: hit.ent, at: hit.at };
    // 3. the Lantern near unrevealed ink
    if (lanternUp && this.inkWithin(L.tx, L.ty)) return { id: 'lantern', kind: 'ink', target: true };
    // 4. the selected ability on its own
    return { id: sel, kind: null, target: null, lane };
  }

  /** The cached resolve() for prompts (recomputed when the leader's tile or facing changes, or every 10 frames). */
  context() {
    const L = this.f.leader;
    const key = L ? `${L.tx},${L.ty},${L.dir},${this.selected()}` : null;
    if (key !== this.ctxKey || this.f.frame - (this.ctxFrame || 0) >= 10) {
      this.ctxKey = key; this.ctxFrame = this.f.frame;
      this.ctx = this.resolve();
    }
    return this.ctx;
  }

  // ------------------------------------------------------------------ per frame
  /** Called every field frame. canIdle: the player could act now (no lock, no step under way). */
  update(canIdle) {
    if (this.ring > 0) this.ring--;
    if (this.ringSlide) this.ringSlide -= Math.sign(this.ringSlide);
    for (const g of this.ghosts) g.life--;
    this.ghosts = this.ghosts.filter((g) => g.life > 0);
    for (const x of this.fx) x.t++;
    this.fx = this.fx.filter((x) => x.t < x.life);
    if (this.float) { this.float.t++; if (this.float.t > 70) this.float = null; }
    if (this.label) { this.label.t++; if (this.label.t > 44) this.label = null; }
    if (this.panel) this.panel.t++;
    // the first time the party meets an ability's target, the companion who owns it says how
    if (canIdle && !this.busy) {
      const c = this.context();
      if (c && c.target && c.at) {
        const L = this.f.leader;
        const d = Math.abs(c.at[0] - L.tx) + Math.abs(c.at[1] - L.ty);
        if ((c.kind === 'roots' || c.kind === 'rock') && d <= 2 && !this.game.counters['bark:first_dash_target']) this.f.bark('first_dash_target');
      }
      if (!this.game.counters['bark:first_appraise_target'] && this.has('appraise') && this.selected() !== 'appraise' && this.f.map.mod.area !== 'town') {
        const L = this.f.leader;
        const e = appraiseTarget(this.query(), L.tx, L.ty, L.dir, 4);
        if (e && !encounterAppraised(this.game, this.encounterOf(e))) this.f.bark('first_appraise_target');
      }
    }
  }

  encounterOf(actor) {
    for (const ent of this.f.entities.values()) if (ent.actor === actor && ent.type === 'enemy') return ent.ev.encounter;
    return null;
  }

  /** pageR or the touch button. */
  usePressed() {
    if (this.busy) return;
    const c = this.resolve();
    if (!c || !c.id) return;
    this.ctxKey = null;
    this.used++;
    if (c.id === 'lantern') { this.f.useLantern(); this.showLabel('lantern'); return; }
    if (c.id === 'dash') { this.run(() => this.dash(c)); return; }
    if (c.id === 'shove') { this.run(() => this.shove(c)); return; }
    if (c.id === 'appraise') { this.run(() => this.appraise(c)); return; }
  }

  async run(fn) {
    const f = this.f;
    this.busy = true;
    f.lockInput();
    try { await fn(); }
    catch (err) { console.error('[abilities] failed', err); }
    finally {
      this.restoreSwap();
      this.busy = false;
      this.lean = null;
      f.unlockInput();
    }
  }

  showLabel(id) { this.label = { id, t: 0 }; }
  wait(n) { return this.engine.waitFrames(n); }
  async until(cond, max = 120) { for (let i = 0; i < max && !cond() && !this.f.dead; i++) await this.wait(1); }

  // ------------------------------------------------------------------ tag-in: the owner steps to the front
  /** Swap the leader's sprite with the follower `id` (a quick change of places, with a puff) for an action. */
  async tagIn(id) {
    const f = this.f, L = f.leader;
    const other = f.followers.find((a) => a.id === id);
    if (!other || L.id === id) return false;
    this.swap = { a: L, b: other, sa: L.spr, sb: other.spr, ida: L.spriteId, idb: other.spriteId };
    L.spr = this.swap.sb; L.spriteId = this.swap.idb;
    other.spr = this.swap.sa; other.spriteId = this.swap.ida;
    other.face(L.dir);
    for (const a of [L, other]) { f.particles.puff(a.feetX, a.feetY); f.particles.puff(a.feetX + 3, a.feetY - 2); }
    L.jump(8, 3);
    await this.wait(8);
    return true;
  }
  restoreSwap() {
    const s = this.swap;
    if (!s) return;
    s.a.spr = s.sa; s.a.spriteId = s.ida;
    s.b.spr = s.sb; s.b.spriteId = s.idb;
    this.swap = null;
  }
  async tagOut() {
    if (!this.swap) return;
    const f = this.f;
    const { a, b } = this.swap;
    this.restoreSwap();
    for (const x of [a, b]) f.particles.puff(x.feetX, x.feetY);
    await this.wait(4);
  }

  // ------------------------------------------------------------------ Dash Strike
  async dash(c) {
    const f = this.f, L = f.leader, e = this.engine;
    const dir = L.dir;
    const [dx, dy] = DIRS[dir];
    const lane = scanLane(this.query(), L.tx, L.ty, dir, DASH_TILES);
    // wind-up: a lean back and a scuff of dust
    this.lean = { actor: L, dx: -dx, dy: -dy };
    f.particles.puff(L.feetX - dx * 4, L.feetY);
    await this.wait(5);
    this.lean = null;
    e.audio.sfx('flee', { volume: 0.7 });
    const start = [L.tx, L.ty];
    if (lane.path.length) this.fx.push({ kind: 'streak', actor: L, dir, t: 0, life: lane.path.length * DASH_FRAMES + 8 });
    for (const [nx, ny] of lane.path) {
      if (f.dead) return;
      const pot = lane.pots.find((p) => p.x === nx && p.y === ny);
      if (pot) {
        EV.breakPot(f, pot);
        e.audio.sfx('sword_slash', { volume: 0.6 });
        this.addFx('slash', nx, ny, dir, 10);
        this.fx.push({ kind: 'spark', x: nx * TILE + 8, y: ny * TILE + 8, t: 0, life: 8 });
      }
      this.addGhost(L);
      L.startStep(nx, ny, DASH_FRAMES);       // the party does not keep up: it catches up after (catchUp)
      f.particles.puff(L.feetX, L.feetY);
      // an afterimage every other frame along the way (CT / SoM dash trail)
      for (let k = 0; k < 20 && L.moving && !f.dead; k++) { if (k % 2 === 1) this.addGhost(L); await this.wait(1); }
    }
    const catching = this.catchUp(start, lane.path);
    this.catching = catching;
    const hit = lane.hit;
    this.lastHit = hit ? { kind: hit.kind, at: hit.at, id: hit.ent ? hit.ent.id : hit.actor ? hit.actor.id : null } : { kind: lane.stopAt ? 'stop' : 'none' };
    // dungeon enemies answer the dash as one step (it is faster than they can react)
    for (const a of f.actors) if (a.kind === 'enemy' && a.brain) a.brain.onPlayerStep();
    if (!hit) { await catching; await this.recover(); this.afterDash(); return; }
    const [hx, hy] = hit.at;
    if (hit.kind === 'roots' || hit.kind === 'rock') {
      const ent = hit.ent;
      const ix = hx * TILE + 8 - dx * 4, iy = hy * TILE + 8 - dy * 4;    // where the blade meets it
      this.addFx('slash', hx, hy, dir, 14);
      this.fx.push({ kind: 'spark', x: ix, y: iy, t: 0, life: 10 });
      e.audio.sfx('sword_slash');
      await this.hitStop(4, 2);
      e.audio.sfx(hit.kind === 'roots' ? 'axe_chop' : 'hit_heavy');
      const cx = ent.x * TILE + 8, cy = ent.y * TILE + 14;
      const [lite, dark] = hit.kind === 'roots' ? ['#e4cb96', '#896042'] : ['#ebdfc8', '#7e6d6e'];
      f.particles.burst('shard', cx, cy, 12, lite);
      f.particles.burst('shard', cx, cy + 8, 8, dark);
      f.particles.puff(cx, cy + 16); f.particles.puff(cx - 5, cy + 14); f.particles.puff(cx + 5, cy + 14);
      EV.breakWall(f, ent);
      this.addFx('ring', ent.x, ent.y + 1, dir, 14);
      e.renderer.shake(2, 10);
      await this.wait(10);
      e.audio.sfx(hit.kind === 'roots' ? 'door_open' : 'gate_open', { volume: 0.6 });
      await this.recover();
      this.afterDash();
      return;
    }
    if (hit.kind === 'enemy') {
      const enemy = hit.actor;
      const behind = enemy.dir === dir;
      this.addFx('slash', hx, hy, dir, 14);
      e.audio.sfx(behind ? 'crit' : 'sword_slash');
      if (behind) { this.addFx('stars', hx, hy, dir, 40); enemy.tint = { color: '#ffffff', amount: 0.8 }; }
      await this.hitStop(behind ? 6 : 3, behind ? 3 : 1);
      enemy.tint = null;
      if (enemy.brain) enemy.brain.stun = Math.max(enemy.brain.stun || 0, 60);
      await catching;
      this.lastHit.preemptive = behind;
      L.face(dir);
      // the field decides the start: struck from behind -> 'preemptive', the free first turn (FieldScene.touchEnemy)
      f.unlockInput();
      try { await f.touchEnemy(enemy, 'player'); } finally { f.lockInput(); }
      return;
    }
    if (hit.kind === 'block') { EV.pushBlock(f, hit.ent, dir); await this.recover(); this.afterDash(); return; }
    // heavy block, wall, NPC, water's edge: a bonk
    if (hit.kind !== 'edge') {
      e.audio.sfx('hit_light');
      e.renderer.shake(1, 6);
      this.addFx('bonk', hx, hy, dir, 12);
      if (hit.kind === 'heavy') EV.pushBlock(f, hit.ent, dir);
      if (hit.kind === 'actor' && hit.actor.showEmote) hit.actor.showEmote('!', 40);
      this.lean = { actor: L, dx: -dx, dy: -dy };
      await this.wait(6);
      this.lean = null;
    }
    await this.recover();
    this.afterDash();
  }
  async recover() { if (this.catching) await this.catching; this.catching = null; await this.wait(6); }

  /**
   * After a dash the party runs to catch up: each follower walks the leader's trail one tile per step (6 frames),
   * the way the caterpillar would have, so nobody cuts a corner or lands on a wall.
   */
  async catchUp(start, path) {
    const f = this.f, fol = f.followers;
    if (!fol.length || !path.length) return;
    let chain = [start, ...fol.map((a) => [a.tx, a.ty])];
    for (const cell of path) {
      if (f.dead) return;
      const next = [cell, ...chain.slice(0, fol.length)];
      fol.forEach((a, i) => {
        const [x, y] = next[i + 1];
        if (a.tx === x && a.ty === y) return;
        if (Math.abs(a.tx - x) + Math.abs(a.ty - y) > 1 || a.moving) a.setPos(x, y, a.dir);
        else a.startStep(x, y, 6);
      });
      chain = next;
      await this.until(() => !fol.some((a) => a.moving), 14);
    }
  }
  /** The tile the dash ended on may be a door or a step trigger: let the field fire it once the lock lifts. */
  afterDash() {
    const f = this.f;
    f.engine.after(1, () => { if (!f.dead && !f.inputLocked && !f.pendingWarp) f.onLeaderArrived(); });
  }
  async hitStop(frames, shake) {
    const e = this.engine;
    if (shake) e.renderer.shake(shake, frames + 4);
    await this.wait(frames);
  }
  addGhost(a) {
    const fr = a.frame(this.f.time);
    this.ghosts.push({ x: a.feetX, y: a.feetY - a.lift, atlas: fr.atlas, name: fr.name, flip: fr.flip, life: 12, max: 12 });
  }
  addFx(kind, x, y, dir, life) { this.fx.push({ kind, x, y, dir, t: 0, life }); }

  // ------------------------------------------------------------------ Shove
  async shove(c) {
    const f = this.f, L = f.leader, e = this.engine;
    const ent = c.target;
    const dir = L.dir;
    const [dx, dy] = DIRS[dir];
    this.showLabel('shove');
    await this.tagIn('bram');
    if (EV.blockCanMove(f, ent, dir)) {
      this.lean = { actor: L, dx, dy };
      e.audio.sfx('hit_heavy', { volume: 0.7 });
      await this.wait(6);
      const slide = EV.moveBlock(f, ent, dir, { frames: 22, sfx: 'block_push' });
      e.renderer.shake(1, 18);
      for (let i = 0; i < 4; i++) {
        f.engine.after(i * 5, () => { if (ent.prop) f.particles.puff(ent.prop.x * TILE + 8 - dx * 6, ent.prop.y * TILE + 14); });
      }
      if (slide) await slide;
      this.lean = null;
      e.audio.sfx('land', { volume: 0.6 });
      this.addFx('dust', ent.x, ent.y, dir, 16);
      this.lastHit = { kind: 'shove', id: ent.id, at: [ent.x, ent.y] };
      await this.wait(10);
    } else {
      // something is in the way: Bram strains, the block rocks, nothing moves
      this.lean = { actor: L, dx, dy };
      e.audio.sfx('hit_light');
      if (ent.prop) { ent.prop.offX = dx; ent.prop.offY = dy; }
      L.showEmote('sweat', 40);
      await this.wait(14);
      if (ent.prop) { ent.prop.offX = 0; ent.prop.offY = 0; }
      this.lean = null;
      e.audio.sfx('buzzer', { volume: 0.5 });
      this.lastHit = { kind: 'stuck', id: ent.id };
      await this.wait(16);
    }
    await this.tagOut();
  }

  // ------------------------------------------------------------------ Appraise
  async appraise(c) {
    const f = this.f, L = f.leader, e = this.engine;
    this.showLabel('appraise');
    await this.tagIn('mira');
    const enemy = c.target;
    if (!enemy) {
      L.showEmote('?', 40);
      this.float = { text: HELP.field.nothing, t: 0 };
      e.audio.sfx('cancel', { volume: 0.6 });
      await this.wait(30);
      await this.tagOut();
      return;
    }
    const enc = this.encounterOf(enemy);
    const dir0 = L.dir;
    L.faceToward(enemy);
    e.audio.sfx('buff', { volume: 0.8 });
    this.fx.push({ kind: 'beam', from: L, to: enemy, t: 0, life: 34 });
    this.fx.push({ kind: 'reticle', to: enemy, t: 0, life: 34 });
    await this.wait(26);
    e.audio.sfx('crystal_hit');
    enemy.tint = { color: '#8af0e8', amount: 0.6 };
    await this.wait(8);
    enemy.tint = null;
    const keys = enc ? writeAppraisal(this.game, enc) : [];
    this.lastHit = { kind: 'appraise', encounter: enc, keys };
    this.panel = { rows: appraisalRows(enc), t: 0 };
    // the window waits for confirm / cancel / a tap (but at least 20 frames, so a held button does not skip it)
    const input = e.input;
    for (let i = 0; i < 60 * 30 && !f.dead; i++) {
      await this.wait(1);
      if (this.panel.t < 20) continue;
      if (input.pressed('confirm') || input.pressed('cancel') || input.pressed('pageR') || (input.pointer && input.pointer.pressed)) break;
    }
    e.audio.sfx('confirm', { volume: 0.7 });
    this.panel = null;
    L.face(dir0);
    await this.tagOut();
    if (e.toasts && keys.length) e.toasts.show({ text: HELP.field.recorded, icon: 'book', frames: 60 });
  }

  // ------------------------------------------------------------------ drawing
  /** Afterimages, y-sorted with the actors (FieldScene.draw pushes them as items). */
  drawGhost(r, g) {
    const a = g.life / g.max;
    r.sprite(g.atlas, g.name, g.x, g.y, { flipX: g.flip, alpha: 0.45 * a, tint: '#6891d9', tintAmount: 0.7 });
  }
  /** World-space effects over the actors (camera pushed). */
  drawFx(r) {
    const f = this.f;
    for (const x of this.fx) {
      const k = x.t / x.life;
      if (x.kind === 'slash') this.drawSlash(r, x, k);
      else if (x.kind === 'ring') { const rad = 4 + Math.round(k * 14); r.withAlpha(0.7 * (1 - k), () => r.ditherEllipse(x.x * TILE + 8, x.y * TILE + 10, rad, Math.max(2, rad >> 1), '#e8dcc0', 0.5)); }
      else if (x.kind === 'dust') { const rad = 5 + Math.round(k * 9); r.withAlpha(0.6 * (1 - k), () => r.ditherEllipse(x.x * TILE + 8, x.y * TILE + 15, rad, 3, '#e8dcc0', 0.5)); }
      else if (x.kind === 'bonk') {
        const cx = x.x * TILE + 8 - DIRS[x.dir][0] * 7, cy = x.y * TILE + 4 - DIRS[x.dir][1] * 7;
        const s = x.t < 6 ? 3 : 2;
        r.withAlpha(1 - k, () => { r.rect(cx - s, cy, s * 2 + 1, 1, '#fff7d6'); r.rect(cx, cy - s, 1, s * 2 + 1, '#fff7d6'); });
      } else if (x.kind === 'stars') {
        const cx = x.x * TILE + 8, cy = x.y * TILE - 6;
        for (let i = 0; i < 3; i++) {
          const ang = x.t * 0.18 + i * 2.09;
          const sx = Math.round(cx + Math.cos(ang) * 7), sy = Math.round(cy + Math.sin(ang) * 2.5);
          r.rect(sx, sy - 1, 1, 3, '#f9d77a'); r.rect(sx - 1, sy, 3, 1, '#f9d77a'); r.rect(sx, sy, 1, 1, '#fff7d6');
        }
      } else if (x.kind === 'beam') this.drawBeam(r, x, k);
      else if (x.kind === 'spark') {
        // a hit spark: eight short rays flying out of the point of impact
        const len = 2 + Math.min(6, x.t), gap = 1 + (x.t >> 1);
        r.withAlpha(1 - k * 0.8, () => {
          for (let i = 0; i < 8; i++) {
            const ang = i * Math.PI / 4 + 0.39;
            for (let j = gap; j < gap + len; j += 1) r.rect(Math.round(x.x + Math.cos(ang) * j), Math.round(x.y + Math.sin(ang) * j), 1, 1, j < gap + 2 ? '#ffffff' : '#f9d77a');
          }
        });
      } else if (x.kind === 'streak') {
        // speed lines behind the dasher while it moves
        const L = x.actor, [ddx, ddy] = DIRS[x.dir];
        if (!L.moving && x.t > 4) continue;
        const px = -ddy, py = ddx;
        for (const [o, n] of [[-5, 7], [0, 10], [5, 6]]) {
          const bx = L.feetX - ddx * 12 + px * o, by = L.feetY - 9 - ddy * 10 + py * o;
          r.withAlpha(0.7, () => { for (let j = 0; j < n; j++) r.rect(Math.round(bx - ddx * j), Math.round(by - ddy * j), 1, 1, j < 2 ? '#ffffff' : '#b4e4f2'); });
        }
      }
      else if (x.kind === 'reticle') this.drawReticle(r, x, k);
    }
    void f;
  }
  drawSlash(r, x, k) {
    // a wide bright crescent across the struck tile, bowed toward the target, two pixels thick, fading from its tips
    const [dx, dy] = DIRS[x.dir];
    const cx = x.x * TILE + 8 - dx * 3, cy = x.y * TILE + 8 - dy * 3;
    const px = -dy, py = dx;
    const n = 15, half = 10;
    const a = k < 0.35 ? 1 : 1 - (k - 0.35) / 0.65;
    const grow = Math.min(1, (x.t + 1) / 3);
    r.withAlpha(a, () => {
      for (let i = 0; i < n; i++) {
        const t = (i / (n - 1) - 0.5) * grow;
        const bow = (1 - 4 * t * t) * 5;
        const sx = Math.round(cx + px * t * half * 2 + dx * bow), sy = Math.round(cy + py * t * half * 2 + dy * bow);
        const tip = Math.abs(t) > 0.38;
        r.rect(sx, sy, 1, 1, tip ? '#b4e4f2' : '#ffffff');
        if (!tip) r.rect(sx - dx, sy - dy, 1, 1, Math.abs(t) < 0.2 ? '#fff7d6' : '#8af0e8');
      }
    });
  }
  drawBeam(r, x, k) {
    const a = x.from, b = x.to;
    const x0 = a.feetX, y0 = a.feetY - 14, x1 = b.feetX, y1 = b.feetY - 8;
    const len = Math.max(1, Math.hypot(x1 - x0, y1 - y0));
    const reach = Math.min(1, x.t / 12);
    const n = Math.floor(len * reach / 3);
    for (let i = 0; i <= n; i++) {
      const t = (i * 3) / len;
      if ((i + (x.t >> 1)) % 3 === 0) continue;
      const px = Math.round(x0 + (x1 - x0) * t), py = Math.round(y0 + (y1 - y0) * t);
      r.withAlpha(0.85 * (1 - Math.max(0, k - 0.75) * 4), () => r.rect(px, py, 1, 1, i % 2 ? '#8af0e8' : '#e8fffb'));
    }
  }
  drawReticle(r, x, k) {
    const ui = r.assets && r.assets.has('ui') ? r.assets.atlas('ui') : null;
    const b = x.to;
    const cx = b.feetX, cy = b.feetY - 8;
    if (ui && ui.frames.reticle_0) {
      const fr = ui.frames[Math.floor(x.t / 6) % 2 ? 'reticle_1' : 'reticle_0'];
      r.withAlpha(Math.min(1, x.t / 6) * (1 - Math.max(0, k - 0.8) * 5), () => r.sprite(ui, fr, cx - (fr.w >> 1), cy - (fr.h >> 1), { topLeft: true }));
    } else {
      const s = Math.max(5, 14 - x.t);
      r.withAlpha(0.8, () => { r.rect(cx - s, cy - s, s * 2, 1, '#8af0e8'); r.rect(cx - s, cy + s, s * 2, 1, '#8af0e8'); r.rect(cx - s, cy - s, 1, s * 2, '#8af0e8'); r.rect(cx + s, cy - s, 1, s * 2 + 1, '#8af0e8'); });
    }
  }

  /** A 12 px ability icon at (x, y). */
  drawAbilityIcon(r, id, x, y, o = {}) { drawAbilityIcon(r, id, x, y, o); }

  /** Prompts, the wheel and the floating label over the leader (camera pushed; drawn after lighting). */
  drawOverlay(r, canIdle) {
    const f = this.f, L = f.leader;
    if (!L) return;
    const bob = Math.floor(f.frame / 10) % 2;
    const touch = touchUi(this.engine);
    // the prompt over an ability's target (the Lantern keeps its own prompt over the leader)
    const c = canIdle && !this.busy && this.ring <= 0 ? this.context() : null;
    if (c && c.target && c.at && c.id !== 'lantern') {
      const [tx, ty] = c.at;
      let topY = ty * TILE - 4;
      if (c.kind === 'enemy' && c.target.spr) topY = c.target.feetY - c.target.spr.h - 2;
      if (c.kind === 'heavy') topY = c.target.y * TILE - 12;
      if (c.kind === 'roots' || c.kind === 'rock') topY = c.target.y * TILE;
      const glyphW = touch ? 0 : r.measure('{i:btn_pageR}');
      const w = 12 + (glyphW ? glyphW + 2 : 0);
      const x = tx * TILE + 8 - Math.round(w / 2), y = topY - 12 - bob;
      this.drawAbilityIcon(r, c.id, x, y);
      if (glyphW) r.text('{i:btn_pageR}', x + 14, y + 1, { shadow: true });
    }
    // the ability name over the leader while it runs
    if (this.label) {
      const name = FIELD_ABILITIES[this.label.id] ? FIELD_ABILITIES[this.label.id].name : '';
      const a = this.label.t < 36 ? 1 : Math.max(0, 1 - (this.label.t - 36) / 8);
      const w = r.measure(name) + 18;
      // over the head, or under the feet when the action goes upward (the label never hides what is struck)
      const up = L.dir === 'up';
      const x = Math.round(L.feetX - w / 2), y = up ? L.feetY + 4 : L.feetY - L.spr.h - 18;
      r.withAlpha(a, () => {
        drawWindow(r, x, y, w, 15, { kind: 'thin', alpha: 0.9 });
        this.drawAbilityIcon(r, this.label.id, x + 3, y + 2);
        r.text(name, x + 16, y + 3, { color: 'cream' });
      });
    }
    if (this.float) {
      const a = this.float.t < 55 ? 1 : Math.max(0, 1 - (this.float.t - 55) / 15);
      r.withAlpha(a, () => r.text(this.float.text, L.feetX, L.feetY - L.spr.h - 14 - Math.min(4, this.float.t >> 3), { align: 'center', shadow: true, color: 'cream' }));
    }
    if (this.ring > 0) this.drawRing(r);
  }

  /** The wheel: every available ability in a row over the leader, the selected one framed, its name and owner below. */
  drawRing(r) {
    const f = this.f, L = f.leader;
    const list = this.list();
    const sel = this.selected();
    const a = this.ring > RING_FRAMES - 6 ? (RING_FRAMES - this.ring) / 6 : this.ring < 14 ? this.ring / 14 : 1;
    const slot = 18;
    const w = list.length * slot + 6, h = 22;
    const cam = f.camera;
    let x = Math.round(L.feetX - w / 2);
    x = Math.max(cam.x + 4, Math.min(cam.x + r.W - w - 4, x));
    const y = Math.max(cam.y + 15, L.feetY - L.spr.h - h - 16);
    r.withAlpha(a, () => {
      drawWindow(r, x, y, w, h, { kind: 'thin', alpha: 0.94 });
      list.forEach((id, i) => {
        const sx = x + 3 + i * slot + (id === sel ? this.ringSlide : 0);
        const lift = id === sel ? 2 : 0;
        if (id === sel) {
          r.rect(sx, y + 2 - lift, 18, 18, '#1d2a67');
          r.rect(sx, y + 2 - lift, 18, 1, '#f9d77a'); r.rect(sx, y + 19 - lift, 18, 1, '#c38334');
          r.rect(sx, y + 2 - lift, 1, 18, '#f9d77a'); r.rect(sx + 17, y + 2 - lift, 1, 18, '#c38334');
        }
        this.drawAbilityIcon(r, id, sx + 3, y + 5 - lift, { alpha: id === sel ? 1 : 0.55 });
      });
      // name tag under the wheel: the owner's head, the name, the use / switch glyphs
      const name = FIELD_ABILITIES[sel].name;
      const heads = r.assets && r.assets.has('heads') ? r.assets.atlas('heads') : null;
      const hf = heads && heads.frames[`head_${FIELD_ABILITIES[sel].owner}`];
      const help = touchUi(this.engine) ? '' : HELP.field.wheel;
      const tw = r.measure(name) + (hf ? 15 : 0) + 8;
      const tx = Math.round(x + w / 2 - tw / 2), ty = y + h + 1;
      drawWindow(r, tx, ty, tw, 14, { kind: 'thin', alpha: 0.94 });
      if (hf) r.sprite(heads, hf, tx + 3, ty + 1, { topLeft: true });
      r.text(name, tx + (hf ? 17 : 4), ty + 2, { color: 'gold' });
      if (help) r.text(help, Math.round(x + w / 2), y - 11, { align: 'center', shadow: true, color: 'cream' });
    });
  }

  /** Screen space: the touch ability button and its swap tab, and the Appraise window. */
  drawScreen(r, canIdle) {
    if (this.panel) this.drawPanel(r);
    if (!touchUi(this.engine) || !this.showTouchButton(canIdle)) return;
    const c = this.context() || { id: this.selected() };
    const b = ABILITY_BTN, s = CYCLE_BTN;
    const live = !!(c && c.target);
    const pulse = live && Math.floor(this.f.frame / 20) % 2 === 0;
    drawWindow(r, b.x, b.y, b.w, b.h, { kind: 'thin', alpha: 0.94 });
    this.drawAbilityIcon(r, c.id, b.x + 4, b.y + 3);
    r.text(SHORT[c.id] || '', b.x + 19, b.y + 4, { color: pulse ? 'cream' : live ? 'white' : 'gray' });
    if (this.list().length > 1) {
      drawWindow(r, s.x, s.y, s.w, s.h, { kind: 'thin', alpha: 0.94 });
      drawIcon(r, 'swap', s.x + 3, s.y + 3);
    }
  }
  showTouchButton(canIdle) {
    if (!canIdle && !this.busy) return false;
    if (this.ring > 0 || this.f.lanternHint) return true;
    const c = this.context();
    return !!(c && c.target);
  }
  /** Touch taps on the button / tab (FieldScene.update calls this while the player can act). Returns true when used. */
  handleTouch(input, canIdle) {
    if (!touchUi(this.engine) || !this.showTouchButton(canIdle)) return false;
    const b = ABILITY_BTN, s = CYCLE_BTN;
    if (input.tapIn(b.x, b.y, b.w, b.h)) { this.usePressed(); return true; }
    if (this.list().length > 1 && input.tapIn(s.x, s.y, s.w, s.h)) { this.cycle(1); return true; }
    return false;
  }

  /**
   * The Appraise window: one block per kind of creature (head, name, level, shields, the weaknesses and
   * resistances as the battle shows them, and its one-line Bestiary flavor), then where it was recorded.
   */
  drawPanel(r) {
    const p = this.panel;
    const rows = p.rows;
    const ui = r.assets && r.assets.has('ui') ? r.assets.atlas('ui') : null;
    const heads = r.assets && r.assets.has('heads') ? r.assets.atlas('heads') : null;
    const w = 248;
    const flavor = rows.map((row) => (rows.length <= 2 && ENEMIES[row.id] && ENEMIES[row.id].flavor ? r.wrap(ENEMIES[row.id].flavor, w - 36).slice(0, 2) : []));
    const heights = rows.map((row, i) => 30 + flavor[i].length * 10);
    const h = 24 + heights.reduce((a, b) => a + b, 0) + 17;
    const x = Math.round((r.W - w) / 2), y = 34;
    const open = Math.min(1, p.t / 6);
    drawWindow(r, x, y, w, h, { open });
    if (open < 1) return;
    this.drawAbilityIcon(r, 'appraise', x + 8, y + 6);
    r.text('Appraise', x + 24, y + 5, { font: 'large', color: 'gold' });
    let ry = y + 24;
    rows.forEach((row, i) => {
      const hf = heads && heads.frames[`head_${row.id}`];
      if (hf) r.sprite(heads, hf, x + 9, ry + 1, { topLeft: true });
      r.text(`${row.name}${row.count > 1 ? ` x${row.count}` : ''}`, x + 25, ry + 1, { color: row.elite ? 'gold' : 'cream' });
      r.text(`Lv ${row.level}`, x + w - 50, ry + 1, { color: 'gray' });
      if (ui && ui.frames.shield_badge) {
        r.sprite(ui, ui.frames.shield_badge, x + w - 24, ry, { topLeft: true });
        r.text(String(row.shields), x + w - 18, ry + 1, { align: 'center', color: 'white', shadow: false });
      }
      let ix = x + 25;
      r.text('Weak', ix, ry + 15, { color: 'gold' }); ix += r.measure('Weak') + 4;
      for (const t of row.weak) ix += this.drawWeakSlot(r, ui, t, ix, ry + 13, false);
      if (!row.weak.length) { r.text('-', ix, ry + 15, { color: 'dim' }); ix += 8; }
      ix += 8;
      if (row.resist.length) {
        r.text('Resists', ix, ry + 15, { color: 'gold' }); ix += r.measure('Resists') + 4;
        for (const t of row.resist.slice(0, 4)) ix += this.drawWeakSlot(r, ui, t, ix, ry + 13, true);
      }
      flavor[i].forEach((line, k) => r.text(line, x + 25, ry + 29 + k * 10, { color: 'gray' }));
      ry += heights[i];
    });
    r.text(HELP.field.recorded, x + w / 2, y + h - 14, { align: 'center', color: 'dim' });
    if (p.t >= 20 && Math.floor(p.t / 16) % 2 === 0 && ui && ui.frames.more_0) r.sprite(ui, ui.frames.more_0, x + w - 12, y + h - 10, { topLeft: true });
  }
  drawWeakSlot(r, ui, t, x, y, resist) {
    if (!ui) { r.text(t, x, y + 2, { color: resist ? 'gray' : 'white' }); return r.measure(t) + 4; }
    const fr = ui.frames[resist ? 'weak_frame_resist' : 'weak_frame'];
    if (fr) r.sprite(ui, fr, x, y - 1, { topLeft: true });
    const ic = ui.frames[`icon_${t}`];
    if (ic) r.sprite(ui, ic, x + 1, y, { topLeft: true });
    if (resist && ui.frames.weak_null) r.sprite(ui, ui.frames.weak_null, x + 1, y, { topLeft: true });
    return 15;
  }

  debugState() {
    const c = this.ctx;
    return { selected: this.selected(), list: this.list(), busy: this.busy, ring: this.ring, panel: !!this.panel,
      context: c ? { id: c.id, kind: c.kind || null, at: c.at || null } : null, lastHit: this.lastHit, used: this.used };
  }
}

/** Sheet positions of the 12 px ability icons (fieldart.js SPRITES). */
const ABILITY_ICON_AT = { dash: [80, 0], appraise: [92, 0], shove: [80, 12] };

/** A 12 px ability icon at (x, y): the fieldart sheet's icons, the ui `lantern` icon, ui stand-ins without the sheet. */
export function drawAbilityIcon(r, id, x, y, o = {}) {
  if (id === 'lantern') { drawIcon(r, 'lantern', x, y, o); return; }
  if (r.assets && !r.assets.has('fieldart')) installFieldArt({ assets: r.assets });   // a menu opened before any map
  const img = r.assets && r.assets.has('fieldart') ? r.assets.img('fieldart') : null;
  const at = ABILITY_ICON_AT[id];
  if (!img || !at) { drawIcon(r, id === 'dash' ? 'sword' : id === 'appraise' ? 'focus' : 'axe', x, y, o); return; }
  r.image(img, x, y, { sx: at[0], sy: at[1], sw: 12, sh: 12, alpha: o.alpha });
}

/** The field abilities a party member brings (Status screen): ids in wheel order. */
export function abilitiesOf(game, memberId) {
  return abilitiesFor(game).filter((id) => FIELD_ABILITIES[id].owner === memberId);
}
void OPPOSITE; void WALK_FRAMES;
