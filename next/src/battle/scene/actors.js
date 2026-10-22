// Battle actors: the on-screen view of every unit (position, pose, flash, dissolve, bob) and how it is
// drawn. Data-driven by atlas frame names (assets/sprites/README.md): party_battle `<id>_<weapon>_<pose>`
// plus shared `<id>_{cast,hurt,defend,kneel,ko,combo,levelup}`; enemies_battle `<id>` facing right, bosses_battle
// via enemies_battle.json `external`; lost_page uses its flutter anim. Nothing here touches the rules.
//
// W6-anim: enemies play generator-made frames when the atlas has them, `<stem>_<state>` with stem = the enemy
// id or its ENEMIES[id].sprite.frame (an enemy that borrows another's art): idle_1 (2-frame breathe, a beat
// every BREATHE frames), attack (pose 'attack'), hurt, cast (pose 'cast', telegraphs, falls back to attack),
// devour (falls back to cast), die_0..2 (pose 'die', DIE_STEP frames each, held through the white flash and
// dissolved from die_2), and Echo Warden stance sets `<stem>_<stance>[_<state>]` (pose 'stance_<name>',
// dropped while broken). Any missing frame falls back to the code-driven bob / squash / breathe.

import { dissolveSprite } from '../fx.js';
import { animFrameAt } from '../../core/assets.js';
import { ENEMIES } from '../../data/enemies.js';
import { partySlots, enemySlots, summonSlot, BOSS_SLOT, BASELINE, shadowFor, touchEnemySlot, planStage } from './layout.js';

const WEAPON_POSES = new Set(['idle', 'ready', 'windup', 'strike', 'victory', 'crit', 'combo', 'levelup']);
const SHARED_POSES = new Set(['cast', 'hurt', 'defend', 'kneel', 'ko', 'combo', 'levelup']);
/** Party poses added by W6-anim fall back to the closest original pose when an atlas lacks them. */
const POSE_FALLBACK = { crit: 'windup', combo: 'ready', levelup: 'victory' };
/** Enemy state -> frame suffixes to try, in order. */
const ENEMY_STATES = {
  attack: ['attack'], cast: ['cast', 'attack'], devour: ['devour', 'cast', 'attack'], hurt: ['hurt'], idle_1: ['idle_1'],
  die_0: ['die_0'], die_1: ['die_1'], die_2: ['die_2'],
};
const HURT_FRAMES = 10;
export const ENEMY_HURT_FRAMES = 16;   // an enemy with a hurt frame holds it past the white hit flash
export const BREATHE = 36;             // game frames per idle beat (2-frame breathe, both sides)
export const DIE_STEP = 4;             // game frames per die_0..2 step
export const STANCE_FLASH = 20;        // frames the Warden shows its new stance charged (_cast) after a swap
export const LEVELUP_FRAMES = 26;      // the level-up hop
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
    this.pose = 'idle'; this.poseT = 0; this.hurtT = 0; this.hurtMax = HURT_FRAMES;
    this.stance = null; this.stanceT = 0;
    this.flash = null; this.dissolve = null; this.dead = false; this.ko = false;
    this.move = null; this.fallT = 0; this.enterT = 0;
    this.backRow = false;           // on the touch stage's raised back row (layout.touchEnemySlot)
    this.hp = unit.hp; this.maxHp = unit.maxHp; this.mp = unit.mp; this.maxMp = unit.maxMp; this.fury = unit.fury || 0;
    this.shownHp = unit.hp; this.lagHp = unit.hp; this.lagWait = 0; this.shownMp = unit.mp; this.shownFury = unit.fury || 0;
    this.shields = unit.shields; this.maxShields = unit.shields; this.broken = false; this.shieldFlash = 0;
    this.statuses = {}; this.charging = null; this.defending = false; this.covering = null;
    this.rowFlash = 0; this.furyFlash = 0; this.koLabel = false;
    this.bobPhase = (unit.uid.charCodeAt(unit.uid.length - 1) * 7) % 60;
    this.def = unit.side === 'enemy' ? ENEMIES[unit.id] || null : null;
    this.rowBeside = !!(this.def && this.def.rowBeside);   // W11: the weakness row stands beside the sprite
    this.backlight = !!(this.def && this.def.family === 'reflection');   // W11: the Other Selves' pale backlight
    this.size = this.def ? this.def.size : 'medium';
    this.flying = !!(this.def && this.def.flying);
    // Borrowed art (ENEMIES[id].sprite = { frame, scale, tint }): drawn scaled, and tinted when the unit has no tint.
    const spr = (this.def && this.def.sprite) || null;
    this.scale = spr && spr.scale > 0 ? spr.scale : 1;
    if (!this.tint && spr && spr.tint) this.tint = spr.tint;
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
    const en = assets.has('enemies_battle') ? assets.atlas('enemies_battle') : null;
    const bo = assets.has('bosses_battle') ? assets.atlas('bosses_battle') : null;
    const ext = (en && en.meta && en.meta.external) || {};
    // The frame stem: the enemy's own frame, else the frame it borrows (ENEMIES[id].sprite.frame).
    const spr = (this.def && this.def.sprite) || null;
    // artId lets a boss swap its battle frames mid-fight (the Nameless King's veil shatters to
    // `nameless_king_unmasked`); the unit's logical id and uid are unchanged, so only the drawn frames differ.
    const baseId = this.artId || this.id;
    const stems = [baseId];
    if (spr && spr.frame && spr.frame !== baseId) stems.push(spr.frame);
    let atlasId = 'enemies_battle', stem = baseId;
    for (const c of stems) {
      if (en && en.frames[c]) { atlasId = 'enemies_battle'; stem = c; break; }
      if (ext[c] && assets.has(ext[c])) { atlasId = ext[c]; stem = c; break; }
      if (bo && bo.frames[c]) { atlasId = 'bosses_battle'; stem = c; break; }
    }
    this.atlasId = atlasId;
    this.stem = stem;
    this.atlas = assets.has(atlasId) ? assets.atlas(atlasId) : null;
    this.anim = this.atlas && this.atlas.anims[`${stem}_flutter`] ? this.atlas.anims[`${stem}_flutter`] : null;
    const f = this.atlas && (this.atlas.frames[stem] || (this.anim && this.atlas.frames[this.anim.frames[0]]));
    this.w = f ? Math.round(f.w * this.scale) : 48; this.h = f ? Math.round(f.h * this.scale) : 48;
  }

  /** Swap the drawn battle frames (and a white flash) without touching the logical id: the King's unmask. */
  swapSprite(id) { if (!id || id === this.artId) return; this.artId = id; this.resolveArt(); this.flash = { color: '#ffffff', frames: 8, total: 10, hold: false, soft: true }; }

  get alive() { return !this.dead && !this.ko; }
  get cx() { return Math.round(this.x); }
  get cy() { return Math.round(this.y - this.h / 2); }
  /** Point an effect or number should appear at. */
  get top() { return Math.round(this.y - this.h); }

  setPose(p) {
    // 'stance_<name>' (animator ev_stance) switches the Echo Warden's frame set; the pose itself is unchanged.
    if (typeof p === 'string' && p.startsWith('stance_')) { this.stance = p.slice(7) || null; this.stanceT = STANCE_FLASH; return; }
    if (p === 'hurt') {
      if (this.ko || this.dead) return;
      this.hurtMax = this.side === 'enemy' && this.enemyName(['hurt'], false) ? ENEMY_HURT_FRAMES : HURT_FRAMES;
      this.hurtT = this.hurtMax; this.pose = 'hurt'; this.poseT = 0; return;
    }
    if (p === 'idle' && this.ko) { this.pose = 'ko'; return; }
    // The rewards' level-up page re-sends 'victory' to the unit that levelled: play the level-up hop.
    if (p === 'victory' && this.side === 'party' && (this.pose === 'victory' || this.pose === 'levelup')) { this.pose = 'levelup'; this.poseT = 0; this.hurtT = 0; return; }
    this.pose = p; this.poseT = 0; this.hurtT = 0;
  }
  /** The first `<stem>[_<stance>]_<suffix>` frame the atlas has for these suffixes; else the base frame (or null). */
  enemyName(suffixes, base = true) {
    const a = this.atlas;
    if (!a) return null;
    const stem = this.stem || this.id;
    const st = this.stance && !this.broken && a.frames[`${stem}_${this.stance}`] ? `${stem}_${this.stance}` : null;
    for (const sfx of suffixes) {
      if (st && a.frames[`${st}_${sfx}`]) return `${st}_${sfx}`;
      if (a.frames[`${stem}_${sfx}`]) return `${stem}_${sfx}`;
    }
    if (!base) return null;
    return st || (a.frames[stem] ? stem : null);
  }
  /** Which enemy state shows now: a key of ENEMY_STATES, or null for the base (idle) frame. */
  enemyState() {
    if (this.pose === 'die') return `die_${Math.min(2, Math.floor(this.poseT / DIE_STEP))}`;
    if (this.ko || this.dissolve) return null;
    if (this.hurtT > 0) return 'hurt';
    if (this.pose === 'attack' || this.pose === 'cast' || this.pose === 'devour') return this.pose;
    if (this.stanceT > 0) return 'cast';
    if (this.alive && !this.move) return Math.floor((this.engine.frame + this.bobPhase) / BREATHE) % 2 ? 'idle_1' : null;
    return null;
  }
  /** The frame record for the current state (party). */
  partyFrame() {
    const a = this.atlas;
    if (!a) return null;
    let pose = this.pose;
    if (this.hurtT > 0 && pose !== 'ko') pose = 'hurt';
    if (pose === 'idle' && this.alive && this.hp > 0 && this.hp <= this.maxHp * 0.25) pose = 'kneel';
    if (pose === 'idle' && this.defending) pose = 'defend';
    const id = this.id, w = this.weapon;
    let name;
    if (pose === 'idle') {
      // 2-frame breathe: idle_0 / idle_1, a beat every BREATHE frames
      const an = a.anims[`${id}_${w}_idle`];
      const beat = Math.floor((this.engine.frame + this.bobPhase) / BREATHE) % 2;
      name = an && an.frames[beat] ? an.frames[beat] : `${id}_${w}_idle_0`;
    } else if (WEAPON_POSES.has(pose) || SHARED_POSES.has(pose)) {
      const fb = POSE_FALLBACK[pose];
      const tries = [`${id}_${w}_${pose}`, `${id}_${pose}`];
      if (fb) tries.push(`${id}_${w}_${fb}`, `${id}_${fb}`);
      name = tries.find((n) => a.frames[n]) || `${id}_${w}_idle_0`;
    } else name = `${id}_${w}_idle_0`;
    return a.frames[name] || a.frames[`${id}_${w}_idle_0`] || null;
  }
  enemyFrame() {
    const a = this.atlas;
    if (!a) return null;
    const state = this.enemyState();
    if (state) { const n = this.enemyName(ENEMY_STATES[state] || [state], false); if (n) return a.frames[n]; }
    if (this.anim) { const n = animFrameAt(this.anim, (this.engine.frame + this.bobPhase) / 60); return a.frames[n] || null; }
    const n = this.enemyName([]);
    return n ? a.frames[n] : null;
  }
  /** True when the atlas has a frame for this enemy state (so the code-driven stand-in is off). */
  hasStateFrame(state) { return !!(this.atlas && this.enemyName(ENEMY_STATES[state] || [state], false)); }

  update() {
    this.poseT++;
    if (this.hurtT > 0) { this.hurtT--; if (this.hurtT === 0 && this.pose === 'hurt') this.pose = this.ko ? 'ko' : 'idle'; }
    if (this.stanceT > 0) this.stanceT--;
    if (this.pose === 'levelup' && this.poseT >= LEVELUP_FRAMES) this.pose = 'victory';
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

  /** The resting tint (no flash): a variant or borrowed-art tint at 0.35, else the elite gold at 0.14, else none. */
  baseTint() {
    if (this.tint) return { tint: this.tint, amount: 0.35 };
    if (this.elite) return { tint: '#ffd34d', amount: 0.14 };
    return { tint: null, amount: 0 };
  }
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
    if (this.hasStateFrame('idle_1')) return 0;   // the atlas breathes (idle_1 frame)
    const f = this.engine.frame + this.bobPhase;
    return (Math.floor(f / BREATHE) % 2) ? 1 : 0;
  }
  /** Level-up hop height (party): a small jump arc early in LEVELUP_FRAMES, then the landing holds. */
  hop() {
    if (this.pose !== 'levelup') return 0;
    const k = Math.min(1, (this.poseT / LEVELUP_FRAMES) * 1.6);
    return -Math.round(Math.sin(Math.PI * k) * 6);
  }

  draw(r, opts = {}) {
    if (this.dead) return;
    const frame = this.side === 'party' ? this.partyFrame() : this.enemyFrame();
    if (!frame || !this.atlas) { r.rect(this.cx - 8, this.y - 24, 16, 24, '#ff00ff'); return; }
    const o = frameOrigin(this.atlas, frame.name, frame);
    const fr = { ...frame, ox: o.ox, oy: o.oy };
    const bob = (this.pose === 'idle' || this.pose === 'kneel') && !this.move ? this.bob() : 0;
    let dx = 0;
    if (this.hurtT > this.hurtMax - 4) dx = this.side === 'enemy' ? -2 : 2;
    const enterDx = this.enterT > 0 ? Math.round((this.enterT / ENTER_FRAMES) ** 2 * 120) : 0;
    const x = this.cx + dx + enterDx, y = Math.round(this.y) + bob + this.hop();
    const sc = this.scale || 1;
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
    // W11 (CRITIQUE_4 item 9): the Other Selves stand in a pale backlight, the glass catching the mirror's light, so
    // the violet reflections separate from the violet stage
    if (this.backlight && !this.dissolve && this.alive) {
      const hw = Math.round(this.w / 2) + 5, hh = Math.round(this.h / 2) + 4;
      r.withAlpha(0.3, () => r.ditherEllipse(x, y - Math.round(this.h / 2), hw, hh, '#d8ecff', 0.55));
      r.withAlpha(0.22, () => r.ditherEllipse(x, y - Math.round(this.h / 2), hw - 4, hh - 4, '#ffffff', 0.5));
    }
    if (this.dissolve) {
      // W8-art: the dissolve draws at the unit's own scale with its resting tint (variant / borrowed-art tint or
      // the elite gold), the same as the frame before it, so nothing jumps when the dissolve starts.
      const k = this.dissolve.t / this.dissolve.frames;
      const bt = this.baseTint();
      dissolveSprite(r, this.atlas, fr, x, y, k, { flipX, scale: sc, tint: bt.tint, tintAmount: bt.amount, drop: Math.round(k * 8 * sc), rows: true });
      return;
    }
    let tint = null, amount = 0;
    if (this.flash) { tint = this.flash.color; amount = this.flash.hold ? 1 : Math.min(1, 0.4 + 0.6 * (this.flash.frames / Math.max(1, this.flash.total))) * (this.flash.soft ? 0.55 : 1); }
    else ({ tint, amount } = this.baseTint());
    const sopts = { flipX, alpha: 1, tint, tintAmount: amount };
    // Enemy hurt squash (stand-in when the atlas has no hurt frame): the first 4 hurt frames draw the sprite
    // 2 px wider and 2 px shorter, feet planted.
    if (this.side === 'enemy' && this.hurtT > this.hurtMax - 4 && !this.ko && !this.hasStateFrame('hurt')) {
      const img = this.atlas.image;
      const squash = this.hurtT > this.hurtMax - 2 ? 2 : 1;
      r.image(img, x - Math.round(fr.ox * sc) - squash, y - Math.round(fr.oy * sc) + squash, { sx: fr.x, sy: fr.y, sw: fr.w, sh: fr.h, w: Math.round(fr.w * sc) + squash * 2, h: Math.round(fr.h * sc) - squash, ...sopts });
      return;
    }
    const br = this.breath();
    if (br > 0) {
      // Breathe stand-in: the top part of the sprite settles 1 px; the lower part stays put so the feet never leave the ground.
      const img = this.atlas.image;
      const split = Math.max(1, Math.round(fr.h * 0.55));
      const dx0 = x - Math.round(fr.ox * sc), dy0 = y - Math.round(fr.oy * sc);
      r.image(img, dx0, dy0 + Math.round(split * sc), { sx: fr.x, sy: fr.y + split, sw: fr.w, sh: fr.h - split, w: Math.round(fr.w * sc), h: Math.round((fr.h - split) * sc), ...sopts });
      r.image(img, dx0, dy0 + br, { sx: fr.x, sy: fr.y, sw: fr.w, sh: split, w: Math.round(fr.w * sc), h: Math.round(split * sc), ...sopts });
      return;
    }
    r.sprite(this.atlas, fr, x, y, sc !== 1 ? { ...sopts, scale: sc } : sopts);
  }
}

const approach = (c, t, step) => (c < t ? Math.min(c + step, t) : Math.max(c - step, t));

/** Build the actor map for a battle_start unit list. opts.touch: the touch stage (layout.touchEnemySlot lifts a
 *  foe that would stand behind the taller touch command window onto the back row). */
export function createActors(engine, units, opts = {}) {
  const actors = new Map();
  const party = units.filter((u) => u.side === 'party');
  const enemies = units.filter((u) => u.side === 'enemy');
  const pslots = partySlots(party.length);
  party.forEach((u, i) => actors.set(u.uid, new Actor(engine, u, pslots[i])));
  const boss = enemies.find((u) => u.boss);
  const foes = [];
  if (boss && enemies.length === 1) {
    // a tall floating boss (ENEMIES[id].stageFeet, the Nameless King) stands lower so its crown clears the help window
    const def = ENEMIES[boss.id];
    const a = new Actor(engine, boss, def && def.stageFeet ? { x: BOSS_SLOT.x, y: def.stageFeet } : BOSS_SLOT);
    actors.set(boss.uid, a); foes.push(a);
  }
  else {
    const eslots = enemySlots(enemies.length);
    enemies.forEach((u, i) => { const a = new Actor(engine, u, eslots[i]); actors.set(u.uid, a); foes.push(a); });
  }
  if (opts.touch) for (const a of foes) placeOnTouchStage(a);
  // W13: a foe whose crown would sit under a two-line help window docks the help window under the timeline
  planStage(foes, actors);
  return actors;
}
/** Move an enemy actor to its touch-stage home (back row when the touch command window would hide it). */
export function placeOnTouchStage(a) {
  const s = touchEnemySlot({ x: a.homeX, y: a.homeY }, { w: a.w, h: a.h });
  a.homeX = a.x = s.x; a.homeY = a.y = s.y; a.backRow = s.back;
  return a;
}

/** Add a summoned unit (Lost Page, split child) at the next free summon slot. */
export function addSummon(engine, actors, unit, index) {
  const a = new Actor(engine, unit, summonSlot(index));
  // The summon slots are hover lines for flying adds (Lost Pages). A grounded summon (the Briar Alpha's
  // Thornback Wolf) stands on the enemy baseline at the slot's x instead of floating in the air.
  if (!a.flying) { a.y = a.homeY = BASELINE.enemy; }
  a.enterT = 0;
  actors.set(unit.uid, a);
  return a;
}

/** Draw order: by feet y (back to front); on the shared baseline the moving unit, then the rightmost, is in front. */
export function sortedActors(actors) {
  return [...actors.values()].filter((a) => !a.dead).sort((a, b) => (a.y - b.y) || ((a.move ? 1 : 0) - (b.move ? 1 : 0)) || (a.x - b.x));
}
