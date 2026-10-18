// Battle actors: the on-screen view of every unit (position, pose, flash, dissolve, bob) and how it is
// drawn. Data-driven by atlas frame names (assets/sprites/README.md): party_battle `<id>_<weapon>_<pose>`
// plus shared `<id>_{cast,hurt,defend,kneel,ko}`; enemies_battle `<id>` facing right, bosses_battle via
// enemies_battle.json `external`; lost_page uses its flutter anim. Nothing here touches the rules.

import { dissolveSprite } from '../fx.js';
import { animFrameAt } from '../../core/assets.js';
import { ENEMIES } from '../../data/enemies.js';
import { partySlots, enemySlots, summonSlot, BOSS_SLOT, shadowFor } from './layout.js';

const WEAPON_POSES = new Set(['idle', 'ready', 'windup', 'strike', 'victory']);
const SHARED_POSES = new Set(['cast', 'hurt', 'defend', 'kneel', 'ko']);
const HURT_FRAMES = 10;
export const ENTER_FRAMES = 22;

/** Origin of a frame: per-frame origin table (object `origin` in the JSON) wins, else the normalized one. */
export function frameOrigin(atlas, name, f) {
  const o = atlas && atlas.meta && atlas.meta.origin;
  if (o && !Array.isArray(o) && Array.isArray(o[name])) return { ox: o[name][0], oy: o[name][1] };
  return { ox: f.ox, oy: f.oy };
}

export class Actor {
  constructor(engine, unit, slot) {
    this.engine = engine;
    this.uid = unit.uid; this.side = unit.side; this.id = unit.id; this.name = unit.name;
    this.boss = !!unit.boss; this.elite = !!(unit.elite && unit.elite.length); this.eliteMods = unit.elite || null;
    this.variant = unit.variant || null; this.tint = unit.tint || null;
    this.weapon = unit.weapon || null;
    this.homeX = slot.x; this.homeY = slot.y; this.x = slot.x; this.y = slot.y;
    this.pose = 'idle'; this.poseT = 0; this.hurtT = 0;
    this.flash = null; this.dissolve = null; this.dead = false; this.ko = false;
    this.move = null; this.fallT = 0; this.enterT = 0;
    this.hp = unit.hp; this.maxHp = unit.maxHp; this.mp = unit.mp; this.maxMp = unit.maxMp; this.fury = unit.fury || 0;
    this.shownHp = unit.hp; this.lagHp = unit.hp; this.lagWait = 0; this.shownMp = unit.mp; this.shownFury = unit.fury || 0;
    this.shields = unit.shields; this.maxShields = unit.shields; this.broken = false; this.shieldFlash = 0;
    this.statuses = {}; this.charging = null; this.defending = false; this.covering = null;
    this.rowFlash = 0; this.furyFlash = 0; this.koLabel = false;
    this.bobPhase = (unit.uid.charCodeAt(unit.uid.length - 1) * 7) % 60;
    this.def = unit.side === 'enemy' ? ENEMIES[unit.id] || null : null;
    this.size = this.def ? this.def.size : 'medium';
    this.flying = !!(this.def && this.def.flying);
    this.resolveArt();
  }

  resolveArt() {
    const assets = this.engine.assets;
    if (this.side === 'party') {
      this.atlasId = 'party_battle';
      const a = assets.has('party_battle') ? assets.atlas('party_battle') : null;
      this.atlas = a;
      const f = a && a.frames[`${this.id}_${this.weapon}_idle_0`];
      this.w = f ? f.w : 32; this.h = f ? f.h : 40;
      return;
    }
    let atlasId = 'enemies_battle';
    const en = assets.has('enemies_battle') ? assets.atlas('enemies_battle') : null;
    if (en && !en.frames[this.id] && en.meta && en.meta.external && en.meta.external[this.id]) atlasId = en.meta.external[this.id];
    else if (en && !en.frames[this.id] && assets.has('bosses_battle') && assets.atlas('bosses_battle').frames[this.id]) atlasId = 'bosses_battle';
    this.atlasId = atlasId;
    this.atlas = assets.has(atlasId) ? assets.atlas(atlasId) : null;
    this.anim = this.atlas && this.atlas.anims[`${this.id}_flutter`] ? this.atlas.anims[`${this.id}_flutter`] : null;
    const f = this.atlas && (this.atlas.frames[this.id] || (this.anim && this.atlas.frames[this.anim.frames[0]]));
    this.w = f ? f.w : 48; this.h = f ? f.h : 48;
    if (!f) { this.w = 48; this.h = 48; }
  }

  get alive() { return !this.dead && !this.ko; }
  get cx() { return Math.round(this.x); }
  get cy() { return Math.round(this.y - this.h / 2); }
  /** Point an effect or number should appear at. */
  get top() { return Math.round(this.y - this.h); }

  setPose(p) {
    if (p === 'hurt') { if (this.ko || this.dead) return; this.hurtT = HURT_FRAMES; this.pose = 'hurt'; this.poseT = 0; return; }
    if (p === 'idle' && this.ko) { this.pose = 'ko'; return; }
    this.pose = p; this.poseT = 0; this.hurtT = 0;
  }
  /** The frame record for the current state (party). */
  partyFrame() {
    const a = this.atlas;
    if (!a) return null;
    let pose = this.pose;
    if (this.hurtT > 0 && pose !== 'ko') pose = 'hurt';
    if (pose === 'idle' && this.alive && this.hp > 0 && this.hp <= this.maxHp * 0.25) pose = 'kneel';
    if (pose === 'idle' && this.defending) pose = 'defend';
    let name;
    if (pose === 'idle') {
      const an = a.anims[`${this.id}_${this.weapon}_idle`];
      name = an ? animFrameAt(an, (this.engine.frame + this.bobPhase) / 60) : `${this.id}_${this.weapon}_idle_0`;
    } else if (WEAPON_POSES.has(pose)) name = `${this.id}_${this.weapon}_${pose}`;
    else if (SHARED_POSES.has(pose)) name = `${this.id}_${pose}`;
    else name = `${this.id}_${this.weapon}_idle_0`;
    return a.frames[name] || a.frames[`${this.id}_${this.weapon}_idle_0`] || null;
  }
  enemyFrame() {
    const a = this.atlas;
    if (!a) return null;
    if (this.anim) { const n = animFrameAt(this.anim, (this.engine.frame + this.bobPhase) / 60); return a.frames[n] || null; }
    return a.frames[this.id] || null;
  }

  update() {
    this.poseT++;
    if (this.hurtT > 0) { this.hurtT--; if (this.hurtT === 0 && this.pose === 'hurt') this.pose = this.ko ? 'ko' : 'idle'; }
    if (this.flash && !this.flash.hold) { this.flash.frames--; if (this.flash.frames <= 0) this.flash = null; }
    if (this.move) {
      const m = this.move; m.t++;
      const k = Math.min(1, m.t / m.frames);
      const e = k < 1 ? 1 - (1 - k) * (1 - k) : 1;
      this.x = m.fromX + (m.toX - m.fromX) * e; this.y = m.fromY + (m.toY - m.fromY) * e;
      if (k >= 1) this.move = null;
    }
    if (this.dissolve) { this.dissolve.t++; if (this.dissolve.t >= this.dissolve.frames) { this.dissolve = null; this.dead = true; } }
    if (this.fallT > 0) this.fallT--;
    if (this.enterT > 0) this.enterT--;
    if (this.shieldFlash > 0) this.shieldFlash--;
    if (this.rowFlash > 0) this.rowFlash--;
    if (this.furyFlash > 0) this.furyFlash--;
    // Gauges: the shown value eases toward the real one; the white lag trail follows after a pause.
    this.shownHp = approach(this.shownHp, this.hp, Math.max(1, Math.ceil(Math.abs(this.shownHp - this.hp) / 6)));
    if (this.lagHp > this.shownHp) { if (this.lagWait > 0) this.lagWait--; else this.lagHp = approach(this.lagHp, this.shownHp, Math.max(1, Math.ceil(this.maxHp / 40))); }
    else this.lagHp = this.shownHp;
    this.shownMp = approach(this.shownMp, this.mp, 1);
    this.shownFury = approach(this.shownFury, this.fury, 2);
  }

  setHp(hp, maxHp) {
    if (hp < this.hp) { this.lagHp = Math.max(this.lagHp, this.shownHp); this.lagWait = 18; }
    this.hp = hp; if (maxHp) this.maxHp = maxHp;
  }
  startMove(toX, toY, frames) { this.move = { fromX: this.x, fromY: this.y, toX, toY, t: 0, frames: Math.max(1, frames) }; }
  startDissolve(frames) { this.dissolve = { t: 0, frames: Math.max(1, frames) }; this.flash = null; this.ko = true; }

  /** Hover offset for flying units (whole sprite). Grounded enemies breathe instead (see breath()). */
  bob() {
    const f = this.engine.frame + this.bobPhase;
    if (this.flying) return Math.round(Math.sin(f / 18) * 2);
    return 0;
  }
  /** 2-frame breathe for grounded enemies: 1 px vertical squash (the top of the sprite settles 1 px) on alternate beats. */
  breath() {
    if (this.side !== 'enemy' || this.flying || !this.alive || this.move || this.dissolve) return 0;
    if (this.hurtT > 0 || (this.pose !== 'idle' && this.pose !== 'kneel')) return 0;
    const f = this.engine.frame + this.bobPhase;
    return (Math.floor(f / 36) % 2) ? 1 : 0;
  }

  draw(r, opts = {}) {
    if (this.dead) return;
    const frame = this.side === 'party' ? this.partyFrame() : this.enemyFrame();
    if (!frame || !this.atlas) { r.rect(this.cx - 8, this.y - 24, 16, 24, '#ff00ff'); return; }
    const o = frameOrigin(this.atlas, frame.name, frame);
    const fr = { ...frame, ox: o.ox, oy: o.oy };
    const bob = (this.pose === 'idle' || this.pose === 'kneel') && !this.move ? this.bob() : 0;
    let dx = 0;
    if (this.hurtT > HURT_FRAMES - 4) dx = this.side === 'enemy' ? -2 : 2;
    const enterDx = this.enterT > 0 ? Math.round((this.enterT / ENTER_FRAMES) ** 2 * 120) : 0;
    const x = this.cx + dx + enterDx, y = Math.round(this.y) + bob;
    const flipX = false;
    // Ground shadow (misc atlas) scaled to the sprite's width (about 0.8 of it, so it shows past the feet), centred
    // 2 px below the feet so most of the ellipse shows in front of the sprite. The atlas pixels are 42% ink, so
    // grounded units get two passes to read on the dark band; hovering units get one lighter pass.
    const misc = this.engine.assets.has('misc') ? this.engine.assets.atlas('misc') : null;
    const shadowName = shadowFor((this.flying ? 0.6 : 0.8) * this.w);
    if (misc && misc.frames[shadowName] && !opts.noShadow) {
      const k = this.dissolve ? 1 - this.dissolve.t / this.dissolve.frames : 1;
      // misc.json keeps the shadows' centre origins in a per-frame table: resolve it, or the ellipse lands above the feet.
      const so = frameOrigin(misc, shadowName, misc.frames[shadowName]);
      const sf = { ...misc.frames[shadowName], ox: so.ox, oy: so.oy };
      const sx = this.cx + enterDx, sy = Math.round(this.y) + 2;
      r.sprite(misc, sf, sx, sy, { alpha: (this.flying ? 0.6 : 1) * k });
      if (!this.flying) r.sprite(misc, sf, sx, sy, { alpha: k });
    }
    if (this.dissolve) {
      const k = this.dissolve.t / this.dissolve.frames;
      dissolveSprite(r, this.atlas, fr, x, y, k, { flipX, tint: this.tint, tintAmount: this.tint ? 0.35 : 0, drop: Math.round(k * 8), rows: true });
      return;
    }
    let tint = null, amount = 0;
    if (this.flash) { tint = this.flash.color; amount = this.flash.hold ? 1 : Math.min(1, 0.4 + 0.6 * (this.flash.frames / Math.max(1, this.flash.total))) * (this.flash.soft ? 0.55 : 1); }
    else if (this.tint) { tint = this.tint; amount = 0.35; }
    else if (this.elite) { tint = '#ffd34d'; amount = 0.14; }
    const sopts = { flipX, alpha: 1, tint, tintAmount: amount };
    // Enemy hurt squash: the first 4 hurt frames draw the sprite 2 px wider and 2 px shorter, feet planted.
    if (this.side === 'enemy' && this.hurtT > HURT_FRAMES - 4 && !this.ko) {
      const img = this.atlas.image;
      const squash = this.hurtT > HURT_FRAMES - 2 ? 2 : 1;
      r.image(img, x - fr.ox - squash, y - fr.oy + squash, { sx: fr.x, sy: fr.y, sw: fr.w, sh: fr.h, w: fr.w + squash * 2, h: fr.h - squash, ...sopts });
      return;
    }
    const br = this.breath();
    if (br > 0) {
      // Breathe: the top part of the sprite settles 1 px; the lower part stays put so the feet never leave the ground.
      const img = this.atlas.image;
      const split = Math.max(1, Math.round(fr.h * 0.55));
      const dx0 = x - fr.ox, dy0 = y - fr.oy;
      r.image(img, dx0, dy0 + split, { sx: fr.x, sy: fr.y + split, sw: fr.w, sh: fr.h - split, ...sopts });
      r.image(img, dx0, dy0 + br, { sx: fr.x, sy: fr.y, sw: fr.w, sh: split, ...sopts });
      return;
    }
    r.sprite(this.atlas, fr, x, y, sopts);
  }
}

const approach = (c, t, step) => (c < t ? Math.min(c + step, t) : Math.max(c - step, t));

/** Build the actor map for a battle_start unit list. */
export function createActors(engine, units) {
  const actors = new Map();
  const party = units.filter((u) => u.side === 'party');
  const enemies = units.filter((u) => u.side === 'enemy');
  const pslots = partySlots(party.length);
  party.forEach((u, i) => actors.set(u.uid, new Actor(engine, u, pslots[i])));
  const boss = enemies.find((u) => u.boss);
  if (boss && enemies.length === 1) actors.set(boss.uid, new Actor(engine, boss, BOSS_SLOT));
  else {
    const eslots = enemySlots(enemies.length);
    enemies.forEach((u, i) => actors.set(u.uid, new Actor(engine, u, eslots[i])));
  }
  return actors;
}

/** Add a summoned unit (Lost Page, split child) at the next free summon slot. */
export function addSummon(engine, actors, unit, index) {
  const a = new Actor(engine, unit, summonSlot(index));
  a.enterT = 0;
  actors.set(unit.uid, a);
  return a;
}

/** Draw order: by feet y (back to front); on the shared baseline the moving unit, then the rightmost, is in front. */
export function sortedActors(actors) {
  return [...actors.values()].filter((a) => !a.dead).sort((a, b) => (a.y - b.y) || ((a.move ? 1 : 0) - (b.move ? 1 : 0)) || (a.x - b.x));
}
