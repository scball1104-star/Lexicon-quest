// Battle scene (W2-battle-scene): FF6 / Chrono Trigger staging over the pure rules in src/battle/rules.js.
//
//   const r = await engine.pushAwait('battle', { encounterId, start: 'normal'|'preemptive'|'ambush', canFlee, gameover });
//   r === 'win' | 'lose' | 'flee'
//
// Flow: field snapshot -> encounter sfx + shard shatter -> backdrop -> party slides in -> CTB loop
// (enemy turns and the player's commands become event arrays; battle/scene/animator.js turns them into
// frame-timed ops this scene runs) -> victory (poses, fanfare, rewards + level-up windows) | defeat (fade
// to the gameover scene unless { gameover: false }) | flee (dash out). Rewards are applied to engine.game
// (battle/scene/rewards.js) the moment the rules say the battle is over.
//
// Debug (install): LQ_DEBUG.battle(encId, { start, level, seed, auto, fresh }) starts a battle and returns at
// once; LQ_DEBUG.battleWait() -> Promise of the result; LQ_DEBUG.battleResult() -> last result;
// LQ_DEBUG.battleAct(action) performs an action for the waiting party member; LQ_DEBUG.battleUntil(cond)
// fast-forwards with Auto decisions until cond ('hero' | 'mira' | 'bram' = that member's command,
// 'telegraph' = a party turn with a telegraph pending, 'over' = the end).

import { createEncounterBattle } from '../battle/rules.js';
import { partyAction } from '../battle/ai.js';
import { ENCOUNTERS, ZONES } from '../data/encounters.js';
import { CONSUMABLES } from '../data/items.js';
import { describeItem } from '../battle/loot.js';
import { SKILLS } from '../data/skills.js';
import { newMember } from '../data/party.js';
import { createGame } from '../game/state.js';
import { BattleFx, ShardTransition, C } from '../battle/fx.js';
import { planEvents, unitInfo, totalFrames } from '../battle/scene/animator.js';
import { createActors, addSummon, sortedActors, ENTER_FRAMES } from '../battle/scene/actors.js';
import { CommandMenu } from '../battle/scene/menu.js';
import { applyBattleOutcome, bestiaryForBattle, levelGainRows } from '../battle/scene/rewards.js';
import { meleeSpot, enemyMeleeSpot, partySlots, summonSlot, REWARD_WIN, LEVEL_WIN, STATUS_WIN, W, H } from '../battle/scene/layout.js';
import * as HUD from '../battle/scene/hud.js';
import { drawWindow, drawLabel, drawIcon, drawIcon16, drawPortrait, drawDivider, uiAtlas } from '../ui/window.js';
import { NumberPopups } from '../ui/numberPopup.js';
import { animFrameAt } from '../core/assets.js';

const ZONE_LEVEL = { valley: 2, archive_f1: 4, archive_f2: 5, archive_f3: 7, archive_boss: 8 };
// Backdrop recipe per zone: environments.webp cell, brightness, tint multiply color, band darkening.
const BACKDROPS = {
  valley: { cell: 0, bright: 1.0, tint: null },
  archive: { cell: 7, bright: 0.82, tint: 'rgba(60,50,120,0.22)' },
  archive_deep: { cell: 7, bright: 0.66, tint: 'rgba(40,30,90,0.35)' },
  boss: { cell: 7, bright: 0.72, tint: 'rgba(110,60,160,0.32)' },
};
const WEAPON_ICON = { sword: 'sword', axe: 'axe', spear: 'spear', staff: 'staff', bow: 'bow' };
const VICTORY_WAIT = 54;
const DEFEAT_WAIT = 100;
const FLEE_WAIT = 44;
const DROP_X = 150, DROP_Y = 150;
const DROP_INTRO = 46;
const AUTO_PAGE_HOLD = 150;

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

/** Build the zone backdrop layer: 16:9 crop of the key art, box-downscaled, posterized, tinted, banded. */
export function buildBackdrop(engine, zoneId, isBoss) {
  const r = engine.renderer;
  const layer = r.createLayer(W, H);
  const g = layer.ctx;
  const zone = ZONES[zoneId];
  const key = isBoss && zoneId === 'archive_boss' ? 'boss' : zone && zone.backdrop ? zone.backdrop : zoneId === 'valley' ? 'valley' : 'archive';
  const rec = BACKDROPS[key] || BACKDROPS.valley;
  const img = engine.assets.has('environments') ? engine.assets.img('environments') : null;
  if (img) {
    const cw = Math.floor(img.width / 2), ch = Math.floor(img.height / 4);
    let tw = cw, th = Math.round(tw * H / W);
    if (th > ch) { th = ch; tw = Math.round(th * W / H); }
    const sx = (rec.cell % 2) * cw + Math.floor((cw - tw) / 2), sy = Math.floor(rec.cell / 2) * ch + Math.floor((ch - th) / 2);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(img, sx, sy, tw, th, 0, 0, W, H);
    g.imageSmoothingEnabled = false;
    // Posterize to a 5-bit-per-channel feel so the painted art sits with the pixel sprites.
    try {
      const id = g.getImageData(0, 0, W, H);
      const d = id.data;
      const b = rec.bright;
      for (let i = 0; i < d.length; i += 4) {
        d[i] = Math.min(255, Math.round((d[i] * b) / 10) * 10);
        d[i + 1] = Math.min(255, Math.round((d[i + 1] * b) / 10) * 10);
        d[i + 2] = Math.min(255, Math.round((d[i + 2] * b) / 10) * 10);
      }
      g.putImageData(id, 0, 0);
    } catch (e) { /* tainted canvas (file://): keep the smooth copy */ }
  } else {
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#2a2458'); grad.addColorStop(1, '#0d0b16');
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
  }
  if (rec.tint) { g.fillStyle = rec.tint; g.fillRect(0, 0, W, H); }
  // Darkened lower band under the windows (DESIGN 7), banded per row like the mocks.
  for (let y = Math.floor(H * 0.62); y < H; y++) {
    const t = (y - H * 0.62) / (H * 0.38);
    const k = 0.55 * Math.min(1, t * 1.4);
    g.fillStyle = `rgba(10,8,22,${k.toFixed(3)})`;
    g.fillRect(0, y, W, 1);
  }
  return layer;
}

export class BattleScene {
  constructor(engine) {
    this.engine = engine;
    this.name = 'battle';
    this.frame = 0;
    this.phase = 'idle';
    this.ops = []; this.opIndex = 0; this.waitLeft = 0; this.hitstop = 0; this.slow = null;
    this.b = null; this.encounter = null; this.actors = new Map();
    this.fx = new BattleFx(engine);
    this.pops = new NumberPopups();
    this.menu = new CommandMenu(this);
    this.help = { text: '', color: null, chars: 0 };
    this.timeline = []; this.currentUid = null; this.telegraphs = new Map();
    this.banner = null; this.result = null; this.summary = null;
    this.eliteTag = null; this.rowShow = new Map();
    this.fast = null; this.autoHold = 0;
    this.shard = null; this.backdropLayer = null;
    this.rewards = null; this.drops = [];
    this.summons = 0;
    this.timer = 0;
    this.fanfare = null;
  }

  // ---------------------------------------------------------------------------------------------- lifecycle
  enter(data = {}) {
    const e = this.engine;
    this.data = data;
    this.snapshot = e.renderer.snapshot();
    if (!e.game) e.game = makeDebugGame(data.encounterId, data);
    const g = e.game;
    g.counters = g.counters || {};
    const n = (g.counters.battles = (g.counters.battles || 0) + 1);
    const rng = e.rng.fork(`battle:${n}:${data.seed ?? ''}`);
    const { battle, encounter } = createEncounterBattle(data.encounterId, {
      party: g.party, rng, inventory: g.items, bestiary: bestiaryForBattle(g), start: data.start || 'normal',
      forceElite: data.forceElite, noElite: data.noElite, eliteRate: data.eliteRate,
    });
    if (data.canFlee != null) battle.state.options.canFlee = !!data.canFlee && !battle.state.options.boss;
    this.b = battle; this.encounter = encounter;
    this.zone = encounter.zone || (ENCOUNTERS[data.encounterId] && ENCOUNTERS[data.encounterId].zone) || 'valley';
    this.backdropLayer = buildBackdrop(e, this.zone, !!encounter.boss);
    e.renderer.setBackdrop(this.backdropLayer.canvas);
    const startEvents = battle.startEvents.length ? battle.startEvents : battle.begin();
    const startEv = startEvents.find((x) => x.type === 'battle_start');
    this.units = startEv ? startEv.units : battle.units();
    this.info = unitInfo(battle.units());
    this.actors = createActors(e, this.units);
    for (const a of this.actors.values()) if (a.side === 'party') a.enterT = ENTER_FRAMES;
    this.seenKeys = battle.units().filter((u) => u.side === 'enemy').map((u) => u.weakKey);
    // Intro: encounter sound, battle music over the field track, shatter the field snapshot.
    e.audio.sfx('encounter');
    e.audio.pushMusic(encounter.music || 'battle');
    this.shard = new ShardTransition(this.snapshot, e.rng.fork('shards'), { reduceMotion: !!e.settings.reduceMotion });
    this.phase = 'intro';
    this.startOps = planEvents(startEvents, { units: this.info });
    this.timeline = battle.timeline(8);
    this.help = { text: '', color: null, chars: 0 };
    if (data.auto != null) e.settings.autoBattle = !!data.auto;
    this.fast = data.fast || null;
  }
  exit() {
    this.engine.renderer.setBackdrop(null);
    this.fx.clear(); this.pops.clear();
  }

  // ---------------------------------------------------------------------------------------------- helpers
  get speed() { return Math.max(1, Number(this.engine.settings.battleSpeed) || 1); }
  get auto() { return !!this.engine.settings.autoBattle; }
  scaled(frames) { return this.fast ? 0 : Math.max(1, Math.round(frames / this.speed / (this.slow ? 1 / this.slow.factor : 1))); }
  actor(uid) { return this.actors.get(uid) || null; }
  unit(uid) { return this.b.unit(uid); }
  setHelp(text, color) { this.help = { text: text || '', color: color || null, chars: 0 }; }
  party() { return [...this.actors.values()].filter((a) => a.side === 'party'); }
  livingEnemies() { return [...this.actors.values()].filter((a) => a.side === 'enemy' && !a.dead); }
  fxAt(kind, uid, extra = {}) {
    const a = this.actor(uid);
    const o = a ? { x: a.x, y: a.y, h: a.h, w: a.w } : { x: W / 2, y: 120, h: 32, w: 32 };
    const from = extra.from ? this.actor(extra.from) : null;
    if (from) { o.fromX = from.x; o.fromY = from.y; o.fromH = from.h; }
    if (extra.to) { const t = this.actor(extra.to); if (t) { o.toX = t.x; o.toY = t.cy; } }
    this.fx.spawn(kind, { ...o, ...extra });
  }

  // ---------------------------------------------------------------------------------------------- update
  update(dt, below) {
    const e = this.engine;
    this.below = !!below;      // an overlay scene (dialog, choice) is on top: animate, but do not read input
    this.frame++;
    if (e.game && typeof e.game.playtime === 'number') e.game.playtime += dt;   // the field is paused under us: keep the clock honest
    if (this.banner) { this.banner.t++; if (this.banner.t >= this.banner.frames) this.banner = null; }
    if (this.slow) { if (--this.slow.frames <= 0) this.slow = null; }
    if (this.hitstop > 0) { this.hitstop--; return; }
    for (const a of this.actors.values()) a.update();
    this.fx.update();
    this.pops.update();
    for (const [uid, t] of this.rowShow) { if (t <= 1) this.rowShow.delete(uid); else this.rowShow.set(uid, t - 1); }

    switch (this.phase) {
      case 'intro': {
        this.shard.update();
        if (this.shard.done) { this.phase = 'enter'; this.timer = ENTER_FRAMES; }
        break;
      }
      case 'enter': {
        if (--this.timer <= 0) { this.loadOps(this.startOps); this.startOps = null; this.phase = 'play'; }
        break;
      }
      case 'play': this.updatePlay(); break;
      case 'victory': this.updateVictory(); break;
      case 'rewards': this.updateRewards(); break;
      case 'defeat': this.updateDefeat(); break;
      case 'flee': this.updateFlee(); break;
      default: break;
    }
    void dt; void e;
  }

  // ----------------------------------------------------------------------------------- the battle loop
  updatePlay() {
    const e = this.engine;
    const { input, audio } = e;
    if (this.below) { this.runOps(); return; }
    // Global toggles: start = Auto, pageR = speed (both persisted settings).
    if (input.pressed('start')) { e.setSetting('autoBattle', !this.auto); audio.sfx(this.auto ? 'confirm' : 'cancel'); input.consume('start'); if (!this.auto && this.menu.state === 'closed') this.autoHold = 0; }
    if (input.pressed('pageR') || input.pressed('pageL')) { e.setSetting('battleSpeed', this.speed === 1 ? 2 : 1); audio.sfx('cursor'); }
    if (this.menu.state !== 'closed') {
      if (this.auto) { this.menu.close(); }
      else {
        const action = this.menu.update(input, audio);
        if (action) this.performParty(action);
        return;
      }
    }
    if (this.runOps()) return;              // still animating
    if (this.b.isOver()) return;            // the end op switches phases
    const u = this.b.current();
    if (!u) return;
    if (u.side === 'enemy') {
      if (this.fast === 'enemy') this.endFast();
      this.loadOps(this.plan(this.b.runEnemyTurn()));
      return;
    }
    // Party turn.
    this.currentUid = u.uid;
    if (this.fast) {
      if (this.fastSatisfied(u)) { this.endFast(); }
      else { this.performParty(partyAction(this.b) || { type: 'defend' }); return; }
    }
    if (this.auto) {
      // A short beat so the player can read the timeline, and a chance to cancel Auto.
      if (input.pressed('cancel')) { e.setSetting('autoBattle', false); audio.sfx('cancel'); input.consume('cancel'); }
      else if (++this.autoHold >= this.scaled(12)) { this.autoHold = 0; this.performParty(partyAction(this.b) || { type: 'defend' }); }
      return;
    }
    if (this.menu.state === 'closed') {
      this.timeline = this.b.timeline(8);
      this.menu.open(u);
      audio.sfx('cursor', { volume: 0.4 });
      const a = this.actor(u.uid);
      if (a) a.setPose('ready');
    }
  }
  endFast() {
    this.fast = null;
    this.fx.clear(); this.pops.clear(); this.hitstop = 0; this.slow = null;
    for (const a of this.actors.values()) { a.flash = null; a.shownHp = a.hp; a.lagHp = a.hp; a.shownMp = a.mp; a.shownFury = a.fury; }
  }
  fastSatisfied(u) {
    const c = this.fast;
    if (!c) return true;
    if (c === 'over' || c === 'end' || c === 'enemy') return false;
    if (c === 'phase2' || c === 'phase3') { const boss = this.b.units().find((x) => x.boss); return !!(boss && boss.ai && (boss.ai.phase || 0) >= (c === 'phase2' ? 1 : 2)); }
    if (c === 'summoned') return this.b.units().some((x) => x.summoned && x.alive);
    if (c === 'ko') return this.b.units().some((x) => x.side === 'party' && !x.alive);
    if (c === 'telegraph') return this.telegraphs.size > 0;
    if (c === 'any') return true;
    return u.uid === c;
  }
  performParty(action) {
    (this.actionLog = this.actionLog || []).push(`${this.b.current() ? this.b.current().uid : '?'}:${action.type}${action.skill ? ':' + action.skill : ''}${action.target ? '>' + action.target : ''}`);
    if (this.actionLog.length > 60) this.actionLog.shift();
    let evs = this.b.perform(action);
    if (evs.length === 1 && evs[0].type === 'invalid') {
      this.lastInvalid = evs[0].reason;
      this.setHelp(`{c:red}${evs[0].reason}{/c}`);
      evs = this.b.perform({ type: 'defend' });
    }
    this.loadOps(this.plan(evs));
  }
  plan(events) { return planEvents(events, { units: this.info }); }
  loadOps(ops) { this.ops = ops; this.opIndex = 0; this.waitLeft = 0; }

  /** Run ops until one blocks. Returns true while ops remain. */
  runOps() {
    if (this.waitLeft > 0) { this.waitLeft--; if (this.waitLeft > 0) return true; }
    while (this.opIndex < this.ops.length) {
      const op = this.ops[this.opIndex++];
      const blocking = this.runOp(op);
      if (blocking && this.waitLeft > 0) return true;
      if (this.phase !== 'play') return true;
    }
    return false;
  }

  /** Execute one op; returns true when it blocks (waitLeft set). */
  runOp(op) {
    const e = this.engine, audio = e.audio, r = e.renderer;
    const a = op.uid ? this.actor(op.uid) : null;
    switch (op.op) {
      case 'wait': this.waitLeft = this.scaled(op.frames); return true;
      case 'hitstop': if (!this.fast) this.hitstop = Math.max(1, Math.round(op.frames / this.speed)); return false;
      case 'move': {
        if (!a) return false;
        let to;
        if (op.to === 'home') to = { x: a.homeX, y: a.homeY };
        else if (op.to === 'cover') { const t = this.actor(op.target); to = t ? { x: t.x - 14, y: t.y + 2 } : { x: a.homeX, y: a.homeY }; }
        else { const t = this.actor(op.target); to = !t ? { x: a.homeX, y: a.homeY } : a.side === 'party' ? meleeSpot(t, a) : enemyMeleeSpot(t, a); }
        if (this.fast) { a.x = to.x; a.y = to.y; return false; }
        a.startMove(to.x, to.y, this.scaled(op.frames));
        this.waitLeft = this.scaled(op.frames);
        return true;
      }
      case 'dissolve': {
        if (!a) return false;
        if (this.fast) { a.dead = true; a.ko = true; return false; }
        a.startDissolve(this.scaled(op.frames));
        this.waitLeft = this.scaled(op.frames);
        return true;
      }
      case 'fall': {
        if (!a) return false;
        a.ko = true; a.setPose('ko'); a.koLabel = true;
        this.waitLeft = this.scaled(op.frames);
        return true;
      }
      case 'help': this.setHelp(op.text, op.color); return false;
      case 'pose': if (a && !a.ko) a.setPose(op.pose); return false;
      case 'flash': if (a) a.flash = { color: op.color || '#fff', frames: Math.max(1, Math.round(op.frames / this.speed)), total: op.frames, hold: !!op.hold, soft: !!op.soft }; return false;
      case 'number': if (a && !this.fast) this.pops.spawn(a.cx, a.cy - (op.small ? 16 : 0), 0, { text: op.text, kind: op.big ? 'crit' : op.variant === 'white' ? 'damage' : op.variant, delay: op.small ? 6 : 0 }); return false;
      case 'word': if (a && !this.fast) this.pops.word(a.cx, a.cy - 10, op.word); return false;
      case 'fx': {
        if (this.fast) { if (op.kind === 'reveal' || op.kind === 'hit_spark') this.rowShow.set(op.uid, 90); return false; }
        if (op.kind === 'combo_link') { const pts = (op.uids || []).map((u) => this.actor(u)).filter(Boolean).map((x) => ({ x: x.cx, y: x.cy })); this.fx.spawn('combo_link', { points: pts }); return false; }
        if (op.kind === 'feast') { const pages = (op.pages || []).map((u) => this.actor(u)).filter(Boolean).map((x) => ({ x: x.cx, y: x.cy })); this.fxAt('feast', op.uid, { pages }); return false; }
        if (op.kind === 'item') { const it = CONSUMABLES[op.item]; this.fxAt('item', op.uid, { icon: it ? it.icon : 'potion' }); return false; }
        if (op.kind === 'swap') { this.fxAt('swap', op.uid, { weapon: a ? a.weapon : 'sword' }); return false; }
        this.fxAt(op.kind, op.uid, { from: op.from, to: op.to, big: op.big, small: op.small, status: op.status, stance: op.stance, phase: op.phase, success: op.success, weapon: op.weapon });
        if (op.kind === 'reveal' || op.kind === 'hit_spark') this.rowShow.set(op.uid, 90);
        return false;
      }
      case 'sfx': if (!this.fast) audio.sfx(op.id, { volume: op.volume, pitch: op.pitch }); return false;
      case 'shake': if (!this.fast) r.shake(op.mag, op.frames); return false;
      case 'screenFlash': if (!this.fast) r.flash(op.color, op.frames, op.alpha); return false;
      case 'hp': if (a) { a.setHp(op.hp, op.maxHp); if (a.side === 'enemy') this.rowShow.set(op.uid, 90); } return false;
      case 'mp': if (a) { a.mp = op.mp; if (op.maxMp) a.maxMp = op.maxMp; } return false;
      case 'fury': if (a) { a.fury = op.fury; } return false;
      case 'shield': if (a) { a.shields = op.shields; a.shieldFlash = 20; this.rowShow.set(op.uid, 120); } return false;
      case 'break': if (a) { a.broken = true; a.shields = 0; a.shieldFlash = 30; this.rowShow.set(op.uid, 180); this.telegraphs.delete(op.uid); } return false;
      case 'shieldRestore': if (a) { a.broken = false; a.shields = op.shields; a.maxShields = Math.max(a.maxShields, op.shields); } return false;
      case 'status': if (a) { if (op.clear) a.statuses = {}; else if (op.on) a.statuses[op.status] = op.turns || 1; else delete a.statuses[op.status]; } return false;
      case 'defendPose': if (a) { a.defending = !!op.on; if (!op.on && a.pose === 'defend') a.setPose('idle'); } return false;
      case 'cover': { const g = this.actor(op.actor); if (g) g.covering = op.on ? op.target : null; return false; }
      case 'swap': if (a) { a.weapon = op.weapon; a.resolveArt(); } return false;
      case 'slow': if (!this.fast && !e.settings.reduceMotion) this.slow = { factor: op.factor, frames: op.frames }; return false;
      case 'banner': if (!this.fast) this.banner = { text: op.text, style: op.style, t: 0, frames: this.scaled(op.style === 'combo' ? 48 : 70) }; return false;
      case 'elite': this.eliteTag = { uid: op.uid, t: this.scaled(90) }; return false;
      case 'knockback': return false;
      case 'turn': {
        this.currentUid = op.actor;
        if (op.actor) { const t = this.actor(op.actor); if (t && t.side === 'enemy') this.rowShow.set(op.actor, 60); }
        for (const x of this.actors.values()) if (x.side === 'party' && x.pose === 'ready' && x.uid !== op.actor) x.setPose('idle');
        return false;
      }
      case 'timeline': this.timeline = op.order || []; return false;
      case 'telegraph': {
        this.telegraphs.set(op.actor, { skill: op.skill, name: op.name, text: op.text, target: op.target, targets: op.targets, nextTurn: op.nextTurn });
        return false;
      }
      case 'telegraphCancel': this.telegraphs.delete(op.actor); return false;
      case 'reveal': if (a) { a.rowFlash = 24; this.rowShow.set(op.uid, 150); } return false;
      case 'summon': {
        const u = this.unit(op.uid);
        if (u && !this.actors.has(op.uid)) {
          const na = addSummon(e, this.actors, u, this.summons++);
          if (op.split) { const src = this.actor(u.uid) || null; const parent = [...this.actors.values()].find((x) => x.side === 'enemy' && x.id === u.id && x.dead); if (parent) { na.homeX = parent.homeX + (this.summons % 2 ? 18 : -18); na.homeY = parent.homeY; na.x = na.homeX; na.y = na.homeY; } void src; }
          this.info[u.uid] = { uid: u.uid, id: u.id, name: u.name, side: 'enemy', weapon: null, boss: false, elite: false, maxHp: u.maxHp };
          this.seenKeys.push(u.weakKey);
        }
        return false;
      }
      case 'split': return false;
      case 'ko': if (a) { a.ko = true; a.telegraph = null; this.telegraphs.delete(op.uid); if (a.side === 'enemy') { a.statuses = {}; } } return false;
      case 'revive': if (a) { a.ko = false; a.dead = false; a.koLabel = false; a.hp = op.hp; a.shownHp = 0; a.lagHp = 0; a.setPose('idle'); } return false;
      case 'start': return false;
      case 'escape': if (op.success) { this.result = 'flee'; this.beginFlee(); } return false;
      case 'victory': this.beginVictory(op); return false;
      case 'defeat': this.beginDefeat(); return false;
      case 'end': return false;
      default: return false;
    }
  }

  // ---------------------------------------------------------------------------------------------- endings
  finishOutcome() {
    const g = this.engine.game;
    const res = this.b.result();
    const killedKeys = this.b.state.killed.map((k) => { const u = this.unit(k.uid); return u ? u.weakKey : k.id; });
    this.summary = applyBattleOutcome(g, res, this.encounter, { seenKeys: this.seenKeys, killedKeys });
    return this.summary;
  }
  beginVictory() {
    const e = this.engine;
    if (this.fast === 'end') this.endFast();
    this.phase = 'victory';
    this.result = 'win';
    this.menu.close();
    this.telegraphs.clear();
    for (const a of this.party()) if (!a.ko) { a.setPose('victory'); a.defending = false; }
    e.audio.stopMusic(0.2);
    this.fanfare = e.audio.jingle('victory_fanfare', { duckMusic: false });
    if (this.fanfare && this.fanfare.then) this.fanfare.then(() => { if (this.phase === 'rewards' || this.phase === 'victory') e.audio.music('victory'); });
    this.finishOutcome();
    this.timer = this.fast ? 1 : this.scaled(VICTORY_WAIT);
    this.setHelp('{c:gold}Victory!{/c}');
  }
  updateVictory() {
    if (--this.timer > 0) return;
    this.phase = 'rewards';
    this.buildRewardPages();
  }
  buildRewardPages() {
    const s = this.summary;
    const pages = [{ kind: 'main' }];
    for (const a of this.party()) {
      const ups = (s.levelUps[a.uid] || []);
      if (ups.length) pages.push({ kind: 'level', uid: a.uid, ups });
    }
    const mast = [];
    for (const a of this.party()) for (const m of (s.mastery[a.uid] || [])) mast.push({ uid: a.uid, ...m });
    if (mast.length) pages.push({ kind: 'mastery', list: mast });
    this.rewards = { pages, index: 0, t: 0, dropsSpawned: false, intro: s.items.length ? DROP_INTRO : 0 };
    this.drops = [];
    this.timer = 0;
  }
  updateRewards() {
    const e = this.engine, input = e.input, audio = e.audio;
    const R = this.rewards;
    if (!R || this.below) return;
    const page = R.pages[R.index];
    R.t++;
    if (page.kind === 'main' && !R.dropsSpawned) {
      R.dropsSpawned = true;
      const items = this.summary.items;
      items.forEach((it, i) => {
        const x = DROP_X - Math.round((items.length - 1) * 14) + i * 28;
        this.drops.push({ x, y: DROP_Y, rarity: it.rarity, t: -i * 18, sfx: it.sfx, played: false });
      });
    }
    if (R.intro > 0) { R.intro = this.fast ? 0 : R.intro - 1; for (const d of this.drops) this.tickDrop(d); return; }
    for (const d of this.drops) this.tickDrop(d);
    if (page.kind === 'level' && R.t === 1) {
      audio.jingle('level_up', { duckMusic: 0.3 });
      audio.sfx('level_up_sparkle');
      const a = this.actor(page.uid);
      if (a) { this.fxAt('revive', page.uid); a.setPose('victory'); }
    }
    if (page.kind === 'mastery' && R.t === 1) audio.sfx('fury_ready', { volume: 0.7 });
    const minHold = this.fast ? 1 : 10;
    const tapped = input.pointer && input.pointer.pressed;
    const autoNext = this.auto && R.t > this.scaled(AUTO_PAGE_HOLD);
    if (R.t > minHold && (input.pressed('confirm') || input.pressed('start') || input.pressed('cancel') || tapped || autoNext || (this.fast && R.t > 2))) {
      input.consume('confirm'); input.consume('cancel'); input.consume('start');
      if (R.index + 1 < R.pages.length) { audio.sfx('confirm'); R.index++; R.t = 0; }
      else this.leave('win');
    }
  }
  tickDrop(d) {
    d.t++;
    if (d.t === 1 && !d.played) {
      d.played = true;
      this.engine.audio.sfx(d.sfx || 'drop_common');
      this.fx.sparkles(d.x, d.y - 30, 8, [C.white, C.gold], 30, 10);
      this.engine.renderer.flash(d.rarity === 'legendary' || d.rarity === 'set' ? '#fff7d6' : '#ffffff', 4, d.rarity === 'common' ? 0.15 : 0.35);
    }
  }
  beginDefeat() {
    const e = this.engine;
    if (this.fast === 'end') this.endFast();
    this.phase = 'defeat';
    this.result = 'lose';
    this.menu.close();
    this.telegraphs.clear();
    e.audio.stopMusic(0.5);
    // The gameover scene plays the sting itself; only a scripted loss (no gameover) needs it here.
    if (this.data.gameover === false || this.data.scripted || !e.hasScene('gameover')) e.audio.jingle('gameover_sting', { duckMusic: false });
    this.finishOutcome();
    this.setHelp('{c:red}The party has fallen...{/c}');
    this.timer = this.fast ? 1 : this.scaled(DEFEAT_WAIT);
  }
  updateDefeat() {
    if (--this.timer > 0) return;
    this.timer = 9999;
    this.leave('lose');
  }
  beginFlee() {
    if (this.fast === 'end') this.endFast();
    this.phase = 'flee';
    this.menu.close();
    this.finishOutcome();
    let i = 0;
    for (const a of this.party()) { if (!a.ko) { a.setPose('ready'); a.startMove(a.x + 160, a.y, this.scaled(FLEE_WAIT - 6) + i * 2); } i++; }
    this.timer = this.fast ? 1 : this.scaled(FLEE_WAIT);
  }
  updateFlee() {
    if (--this.timer > 0) return;
    this.timer = 9999;
    this.leave('flee');
  }
  leave(result) {
    const e = this.engine;
    if (this.leaving) return;
    this.leaving = true;
    this.result = result;
    const dur = this.fast ? 0.1 : result === 'lose' ? 1.2 : 0.7;
    const style = result === 'lose' ? 'fade' : 'dither';
    e.fadeTo(() => {
      if (result === 'lose') e.audio.stopMusic(0.1); else e.audio.popMusic(0.8);
      e.pop(result);
      if (result === 'lose' && this.data.gameover !== false && !this.data.scripted && e.hasScene('gameover')) e.push('gameover');
      if (typeof this.onDone === 'function') this.onDone(result);
    }, { duration: dur, style, color: result === 'lose' ? '#000000' : '#14101e' });
  }

  // ---------------------------------------------------------------------------------------------- draw
  draw(r) {
    const e = this.engine;
    if (this.phase === 'intro' && this.shard && this.shard.t < 8) { this.shard.draw(r); return; }
    r.drawLayer(this.backdropLayer);
    // Stage: under-fx, actors (y-sorted), over-fx, numbers.
    this.fx.drawUnder(r);
    const list = sortedActors(this.actors);
    const targetIds = this.menu.state === 'target' ? this.menu.highlightedIds() : [];
    for (const a of list) {
      if (this.phase === 'intro' || this.phase === 'enter') { if (a.side === 'party') { a.draw(r); } else a.draw(r); continue; }
      a.draw(r);
    }
    if (this.phase === 'intro') { this.shard.draw(r); return; }
    for (const d of this.drops) this.drawDrop(r, d);
    this.fx.drawOver(r);
    // Markers.
    const frame = this.frame;
    for (const [uid, t] of this.telegraphs) { const a = this.actor(uid); if (a && !a.dead) HUD.drawTelegraphMarker(r, a, frame, t.nextTurn); }
    if (this.eliteTag) { const a = this.actor(this.eliteTag.uid); if (a && !a.dead) HUD.drawEliteTag(r, a); if (--this.eliteTag.t <= 0) this.eliteTag = null; }
    for (const uid of targetIds) { const a = this.actor(uid); if (a && !a.dead) HUD.drawReticle(r, a, frame); }
    if (this.menu.state !== 'closed' && this.currentUid) { const a = this.actor(this.currentUid); if (a && !a.dead) HUD.drawTurnMarker(r, a, frame); }
    // Enemy rows: the targeted foe, the acting foe and anything hit recently.
    const rows = new Set([...targetIds.filter((u) => this.actor(u) && this.actor(u).side === 'enemy'), ...this.rowShow.keys()]);
    for (const uid of rows) {
      const a = this.actor(uid);
      if (!a || a.dead || a.side !== 'enemy') continue;
      HUD.drawEnemyRow(r, a, this.b.knowledge(uid), this.unit(uid), frame);
    }
    if (this.menu.state === 'target') {
      const t = this.menu.currentTarget();
      const a = t ? this.actor(t) : null;
      if (a && a.side === 'enemy') HUD.drawNameTag(r, a, this.b.knowledge(t), this.unit(t));
      const prev = this.menu.preview;
      if (prev) for (const ef of prev.effects || []) { const ta = this.actor(ef.target); if (ta && targetIds.includes(ef.target)) HUD.drawPreviewTag(r, ta, ef); }
    }
    this.pops.draw(r);
    // HUD windows. The help bar and the timeline make way for the rewards windows (they overlap them).
    if (this.phase !== 'rewards') {
      this.drawHelpWindow(r);
      const preview = this.menu.state === 'target' && this.menu.preview ? { landing: this.menu.preview.landing, uid: this.currentUid } : null;
      HUD.drawTimeline(r, this.timeline, this.actors, preview, frame);
    }
    HUD.drawPartyStatus(r, this.party(), this.menu.state !== 'closed' ? this.currentUid : null, frame);
    if (this.menu.state !== 'closed') this.menu.draw(r, frame);
    else drawWindow(r, 4, STATUS_WIN.y, 92, STATUS_WIN.h);
    if (this.banner) HUD.drawBigBanner(r, this.banner.text, this.banner.style, this.banner.t / this.banner.frames);
    if (this.phase === 'rewards') this.drawRewards(r);
    void e;
  }

  drawHelpWindow(r) {
    let text = this.help.text, color = this.help.color, chars = this.help.chars;
    if (this.menu.state !== 'closed') {
      const tele = this.telegraphs.size ? [...this.telegraphs.values()][0] : null;
      if (tele && !this.menu.showHelp) { text = tele.text; color = 'orange'; chars = undefined; }
      else if (this.menu.helpText) { text = this.menu.helpText; color = this.menu.helpColor; chars = undefined; }
      else if (tele) { text = tele.text; color = 'orange'; chars = undefined; }
      else { const a = this.actor(this.currentUid); text = a ? `${a.name}'s turn.` : ''; color = null; chars = undefined; }
    } else if (this.phase === 'play' && this.telegraphs.size && !text) { const t = [...this.telegraphs.values()][0]; text = t.text; color = 'orange'; chars = undefined; }
    const right = this.auto ? 'AUTO' : this.speed > 1 ? 'x2' : null;
    HUD.drawHelp(r, text, color, { right, rightColor: this.auto ? 'cyan' : 'gold', rightW: right ? 30 : 0 });
    void chars;
  }

  drawDrop(r, d) {
    if (d.t < 0) return;
    const ui = uiAtlas(r);
    const anim = ui && ui.anims[`beam_${d.rarity}`];
    const name = anim && animFrameAt(anim, d.t / 60);
    const f = name && ui.frames[name];
    const k = Math.min(1, d.t / 10);
    if (f) r.withAlpha(k, () => r.sprite(ui, f, d.x, d.y));
    else r.rect(d.x - 2, d.y - Math.round(40 * k), 5, Math.round(40 * k), '#f9d77a');
    const sp = ui && ui.anims[`sparkle_${d.rarity}`];
    if (sp && d.t % 24 < 12) { const sn = animFrameAt(sp, (d.t % 24) / 60); const sf = ui.frames[sn]; if (sf) r.sprite(ui, sf, d.x + ((d.t * 7) % 11) - 5, d.y - 20 - ((d.t * 3) % 30)); }
  }

  drawRewards(r) {
    const R = this.rewards;
    if (!R) return;
    const page = R.pages[R.index];
    const s = this.summary;
    const ui = uiAtlas(r);
    const k = Math.min(1, R.t / 6);
    if (R.intro > 0) return;
    if (page.kind === 'main') {
      const w = REWARD_WIN;
      drawWindow(r, w.x, w.y, w.w, w.h, { open: k });
      if (k < 1) return;
      r.text('Victory!', w.x + w.w / 2, w.y + 5, { font: 'large', align: 'center', color: 'cream' });
      drawDivider(r, w.x + 8, w.y + 23, w.w - 16);
      let y = w.y + 28;
      const x = w.x + 10;
      drawLabel(r, 'exp', x, y + 3); r.text(`+${s.exp}`, x + 22, y, { color: 'white' });
      drawIcon(r, 'gold', x + 78, y - 1); r.text(`+${s.gold}`, x + 92, y, { color: 'gold' });
      // Mastery points per member and weapon (one row, the member's name abbreviated).
      let mx = x + 134;
      for (const a of this.party()) {
        const pts = s.masteryPoints[a.uid] || {};
        for (const [wpn, n] of Object.entries(pts)) { if (!n || mx > w.x + w.w - 30) continue; drawIcon(r, WEAPON_ICON[wpn] || 'sword', mx, y - 1); r.text(`+${n}`, mx + 13, y, { color: 'violet' }); mx += 30; }
      }
      y += 13;
      const rows = [];
      for (const c of s.consumables) rows.push({ icon: c.icon, text: `Received {c:gold}${c.name}{/c} x${c.qty}` });
      for (const it of s.items) rows.push({ icon16: true, icon: iconForGear(it.inst), text: `Found {c:${it.rarity}}${it.name}{/c}!`, sub: describe(it.inst) });
      if (!rows.length) r.text('{c:gray}No drops this time.{/c}', x, y + 2);
      for (const row of rows.slice(0, 3)) {
        if (row.icon16 && ui) drawIcon16(r, row.icon, x, y); else drawIcon(r, row.icon, x + 2, y);
        r.text(row.text, x + 20, y + 1);
        y += row.sub ? 11 : 12;
        if (row.sub) { r.text(`{c:gray}${row.sub}{/c}`, x + 20, y); y += 11; }
      }
      if (ui && ui.frames.btn_key_z && Math.floor(this.frame / 20) % 2 === 0) r.text('{i:btn_confirm}', w.x + w.w - 18, w.y + w.h - 14);
      return;
    }
    if (page.kind === 'level') {
      const w = LEVEL_WIN;
      drawWindow(r, w.x, w.y, w.w, w.h, { open: k });
      if (k < 1) return;
      const a = this.actor(page.uid);
      const last = page.ups[page.ups.length - 1];
      const first = page.ups[0];
      drawPortrait(r, page.uid, w.x + 8, w.y + 8, 32);
      r.text(a ? a.name : page.uid, w.x + 48, w.y + 9, { font: 'large', color: 'cream' });
      drawLabel(r, 'lv', w.x + 48, w.y + 29);
      r.text(`${first.level - 1}  →  {c:gold}${last.level}{/c}`, w.x + 60, w.y + 26);
      r.text('{c:gold}Level up!{/c}', w.x + w.w - 10, w.y + 9, { align: 'right' });
      drawDivider(r, w.x + 8, w.y + 44, w.w - 16);
      const gains = {};
      for (const up of page.ups) for (const row of levelGainRows(up)) gains[row.id] = (gains[row.id] || 0) + row.gain;
      const ids = ['hp', 'mp', 'atk', 'def', 'mag', 'spr', 'spd', 'luk'].filter((id) => gains[id]);
      ids.forEach((id, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const gx = w.x + 14 + col * 92, gy = w.y + 50 + row * 11;
        if (['hp', 'mp', 'atk', 'def', 'mag', 'spd'].includes(id)) drawLabel(r, id, gx, gy + 3); else r.text(id.toUpperCase(), gx, gy, { color: 'gold' });
        r.text(`+${gains[id]}`, gx + 28, gy, { color: 'green' });
      });
      const learned = page.ups.flatMap((u) => u.learned || []);
      if (learned.length) r.text(`Learned {c:cyan}${learned.map((id) => (SKILLS[id] ? SKILLS[id].name : id)).join(', ')}{/c}!`, w.x + 10, w.y + w.h - 15);
      return;
    }
    if (page.kind === 'mastery') {
      const w = LEVEL_WIN;
      drawWindow(r, w.x, w.y, w.w, w.h, { open: k });
      if (k < 1) return;
      r.text('Mastery up!', w.x + w.w / 2, w.y + 6, { font: 'large', align: 'center', color: 'cream' });
      drawDivider(r, w.x + 8, w.y + 24, w.w - 16);
      let y = w.y + 30;
      for (const m of page.list.slice(0, 5)) {
        const a = this.actor(m.uid);
        drawIcon(r, WEAPON_ICON[m.type] || 'sword', w.x + 10, y - 1);
        r.text(`${a ? a.name : m.uid}: ${cap(m.type)} ${m.from} → {c:gold}${m.to}{/c}`, w.x + 26, y);
        if (m.unlocked && m.unlocked.length) { y += 11; r.text(`  Learned {c:cyan}${m.unlocked.map((id) => (SKILLS[id] ? SKILLS[id].name : id)).join(', ')}{/c}`, w.x + 26, y); }
        y += 12;
      }
    }
  }

  debugState() {
    return {
      phase: this.phase, result: this.result, menu: this.menu.state, current: this.currentUid, fast: this.fast || null,
      opsLeft: this.ops.length - this.opIndex, waitLeft: this.waitLeft, auto: this.auto, speed: this.speed,
      telegraphs: [...this.telegraphs.keys()], timeline: this.timeline.map((t) => t.uid),
      units: [...this.actors.values()].map((a) => ({ uid: a.uid, hp: a.hp, maxHp: a.maxHp, shields: a.shields, broken: a.broken, ko: a.ko, dead: a.dead, x: Math.round(a.x), y: Math.round(a.y), pose: a.pose })),
      target: this.menu.currentTarget ? this.menu.currentTarget() : null, preview: this.menu.preview ? this.menu.preview.landing : null,
      rewards: this.rewards ? { page: this.rewards.pages[this.rewards.index].kind, index: this.rewards.index, pages: this.rewards.pages.length } : null,
      over: this.b ? this.b.isOver() : null, round: this.b ? Math.floor(this.b.state.partyTurns / this.b.state.partySize) + 1 : 0,
      actions: (this.actionLog || []).slice(-40), partyTurns: this.b ? this.b.state.partyTurns : 0, enemyTurns: this.b ? this.b.state.enemyTurns : 0,
      commands: this.menu.state !== 'closed' && this.menu.unit ? this.b.commands(this.menu.unit).filter((c) => c.enabled && (c.id !== 'combo' || c.visible)).map((c) => c.id) : [],
      combos: this.menu.state !== 'closed' && this.menu.unit ? ((this.b.commands(this.menu.unit).find((c) => c.id === 'combo') || {}).list || []).filter((e) => e.enabled).map((e) => e.skill) : [],
      lastInvalid: this.lastInvalid || null,
    };
  }
}

function iconForGear(inst) {
  const base = typeof inst === 'string' ? inst : inst && inst.base;
  if (!base) return 'sword';
  for (const w of ['sword', 'axe', 'spear', 'staff', 'bow']) if (String(base).includes(w)) return w;
  if (/mail|vest|tunic|shirt|plate|robe/.test(base)) return 'armor';
  if (/cap|hood|helm|circlet/.test(base)) return 'helm';
  if (/boots/.test(base)) return 'boots';
  if (/mantle|cloak/.test(base)) return 'mantle';
  if (/charm|locket|ring/.test(base)) return 'charm';
  return 'sword';
}
function describe(inst) {
  if (!inst || typeof inst === 'string') return '';
  try { return describeItem(inst).slice(0, 3).join(', '); } catch (e) { return ''; }
}

/** A representative game for debug battles: expected level and loadout for the encounter's zone. */
export function makeDebugGame(encounterId, opts = {}) {
  const enc = ENCOUNTERS[encounterId];
  const zone = enc ? enc.zone : 'valley';
  const level = opts.level || ZONE_LEVEL[zone] || 2;
  const g = createGame(opts.name || 'Arden');   // the shots' hero; real battles read the member's own name
  const LOAD = {
    valley: { hero: { equip: { sword: 'short_sword', body: 'cloth_tunic' }, mastery: { sword: 12 } }, mira: { equip: { staff: 'oak_staff', bow: 'short_bow', body: 'cloth_tunic' }, mastery: { staff: 8, bow: 2 } }, bram: { equip: { spear: 'ash_spear', axe: 'hatchet', body: 'leather_vest', head: 'cloth_cap' }, mastery: { spear: 12, axe: 2 } }, items: { potion: 4, antidote: 1, eye_drops: 1 } },
    archive_f1: { hero: { equip: { sword: 'short_sword', axe: 'hatchet', body: 'leather_vest', head: 'cloth_cap' }, mastery: { sword: 45, axe: 6 } }, mira: { equip: { staff: 'oak_staff', bow: 'short_bow', body: 'cloth_tunic', head: 'leather_hood', charm: 'bronze_charm' }, mastery: { staff: 25, bow: 10 } }, bram: { equip: { spear: 'ash_spear', axe: 'hatchet', body: 'leather_vest', head: 'cloth_cap' }, mastery: { spear: 45, axe: 10 } }, items: { potion: 5, ether: 1, antidote: 1, eye_drops: 1, echo_herb: 1 } },
    archive_f2: { hero: { equip: { sword: 'longsword', axe: 'hatchet', body: 'leather_vest', head: 'leather_hood' }, mastery: { sword: 100, axe: 25 } }, mira: { equip: { staff: 'oak_staff', bow: 'short_bow', body: 'leather_vest', head: 'leather_hood', charm: 'bronze_charm' }, mastery: { staff: 60, bow: 25 } }, bram: { equip: { spear: 'ash_spear', axe: 'hatchet', body: 'leather_vest', head: 'leather_hood', boots: 'leather_boots' }, mastery: { spear: 100, axe: 25 } }, items: { potion: 5, hi_potion: 1, ether: 2, antidote: 1, eye_drops: 1, echo_herb: 2, phoenix_feather: 1 } },
    archive_f3: { hero: { equip: { sword: 'longsword', axe: 'hatchet', body: 'chain_shirt', head: 'leather_hood', boots: 'leather_boots' }, mastery: { sword: 170, axe: 50 } }, mira: { equip: { staff: 'crystal_rod', bow: 'short_bow', body: 'mirrorguard_mail', head: 'leather_hood', charm: 'bronze_charm' }, mastery: { staff: 110, bow: 40 } }, bram: { equip: { spear: 'iron_pike', axe: 'hatchet', body: 'chain_shirt', head: 'iron_helm', boots: 'leather_boots' }, mastery: { spear: 170, axe: 50 } }, items: { potion: 5, hi_potion: 2, ether: 2, antidote: 1, eye_drops: 2, echo_herb: 2, phoenix_feather: 1 } },
  };
  LOAD.archive_boss = { ...LOAD.archive_f3, hero: { ...LOAD.archive_f3.hero, mastery: { sword: 210, axe: 60 } }, mira: { ...LOAD.archive_f3.mira, mastery: { staff: 140, bow: 45 } }, bram: { ...LOAD.archive_f3.bram, mastery: { spear: 210, axe: 60 } } };
  const load = LOAD[zone] || LOAD.valley;
  const members = (opts.party || ['hero', 'mira', 'bram']).map((id) => {
    const m = newMember(id, { level, name: id === 'hero' ? g.heroName : undefined });
    const L = load[id] || {};
    if (L.equip) m.equip = { ...m.equip, ...L.equip };
    if (L.mastery) m.mastery = { ...m.mastery, ...L.mastery };
    return m;
  });
  g.party = members;
  g.items = { ...(load.items || { potion: 3 }) };
  g.gold = 120;
  return g;
}

export async function install(engine) {
  const D = typeof window !== 'undefined' ? window.LQ_DEBUG : null;
  if (!D) return;
  let pending = null, last = null;
  D.register('battle', (encounterId = 'valley_wolves', opts = {}) => {
    if (!ENCOUNTERS[encounterId]) throw new Error(`unknown encounter ${encounterId} (known: ${Object.keys(ENCOUNTERS).join(', ')})`);
    if (opts.fresh || !engine.game || opts.level || opts.party) engine.game = makeDebugGame(encounterId, { ...opts, name: opts.name || (engine.game && engine.game.heroName) || undefined });
    if (opts.settings) D.settings(opts.settings);
    last = null;
    pending = engine.pushAwait('battle', { encounterId, start: opts.start || 'normal', canFlee: opts.canFlee, gameover: opts.gameover ?? false,
      auto: opts.auto, fast: opts.fast || null, seed: opts.seed, forceElite: opts.forceElite, noElite: opts.noElite, scripted: opts.scripted });
    pending.then((r) => { last = r; });
    return encounterId;
  });
  D.register('battleWait', () => pending || Promise.resolve(last));
  D.register('battleResult', () => last);
  D.register('battleAct', (action) => {
    const s = engine.scene;
    if (!s || s.name !== 'battle') throw new Error('no battle on top');
    if (s.menu.state === 'closed') throw new Error('not waiting for a command');
    s.menu.close();
    s.performParty(action);
    return true;
  });
  D.register('battleUntil', (cond = 'any') => {
    const s = engine.scene;
    if (!s || s.name !== 'battle') throw new Error('no battle on top');
    s.menu.close();
    s.fast = cond;
    return cond;
  });
  D.provide('battle', () => { const s = engine.scene; return s && s.name === 'battle' ? s.debugState() : null; });
}

export default BattleScene;
