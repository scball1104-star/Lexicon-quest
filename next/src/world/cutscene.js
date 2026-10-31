// Cutscene runner: the exact API of docs/story/STAGING.md section 1, run against the field scene.
//
//   const cs = new Cutscene(field);
//   await cs.run('mael_intro');            // scenes[id] from data/story/ep1.js (self-guarded, locks input)
//   cs.cancel();                           // the field is leaving: every pending primitive resolves at once
//
// Every primitive resolves on game time (engine.waitFrames), so LQ_DEBUG.setSpeed(x) speeds scenes up and
// a cancelled scene never leaves a hanging promise. Unknown actor ids are logged once and skipped.

import { sceneById, nameFor } from '../game/story.js';
import { addMember as stateAddMember, hasFlag as stateHasFlag, setFlag as stateSetFlag } from '../game/state.js';
import { Actor, SPEEDS, WALK_FRAMES } from './actors.js';
import { findPath, nearestAdjacent, dirBetween, DIRS } from './pathfind.js';
import { TILE } from './tilemap.js';
import { encounterFor } from './events.js';
import { ENCOUNTERS } from '../data/encounters.js';
import { grantExp } from '../data/party.js';
import { SKILLS } from '../data/skills.js';

const PORTRAITS = { hero: 'hero', mira: 'mira', bram: 'bram', mael: 'mael' };

/**
 * X1 (EXPANSION1_PLAN 11.3), pure: give every living party member `amount` EXP through grantExp() (party.js).
 * Never scaled (no expcurve, no expMul). Returns { amount, members: [{ id, name, ups }] } where ups is grantExp's
 * levelUps list (empty when the member did not level). amount is floored; 0 or less grants nothing.
 */
export function grantPartyExp(game, amount) {
  const n = Math.max(0, Math.floor(Number(amount) || 0));
  const members = [];
  if (!n || !game || !game.party) return { amount: 0, members };
  for (const m of game.party) {
    if (!(m.hp > 0)) continue;
    members.push({ id: m.id, name: m.name, ups: grantExp(m, n).levelUps });
  }
  return { amount: n, members };
}
/** Pure: the message-box lines for a grantPartyExp result: one box per member who leveled ("Mira reaches Lv 7."). */
export function levelUpBoxes(result) {
  const boxes = [];
  for (const m of result.members) {
    if (!m.ups.length) continue;
    const learned = m.ups.flatMap((u) => u.learned || []).map((id) => (SKILLS[id] ? SKILLS[id].name : id));
    let text = `{c:gold}${m.name}{/c} reaches Lv {c:gold}${m.ups[m.ups.length - 1].level}{/c}.`;
    if (learned.length) text += ` ${m.name} learns {c:cyan}${learned.join(', ')}{/c}.`;
    boxes.push({ who: null, text });
  }
  return boxes;
}
/** The toast text. */
export const expToastText = (n) => `The party gains {c:gold}${n}{/c} EXP.`;

export class Cutscene {
  constructor(field) {
    this.field = field;
    this.engine = field.engine;
    this.running = null;         // scene id while a scene runs
    this.dead = false;
    this.spawned = new Map();
    this.lastSay = null;
    this.warned = new Set();
    this.api = this.makeApi();
  }

  warn(key, msg) { if (!this.warned.has(key)) { this.warned.add(key); console.warn(`[cutscene] ${msg}`); } }
  cancel() { this.dead = true; }

  async run(id) {
    const fn = sceneById(id);
    if (!fn) { this.warn('scene:' + id, `no scene "${id}"`); return false; }
    if (this.running) { this.warn('nested:' + id, `scene "${id}" requested while "${this.running}" runs; skipped`); return false; }
    this.running = id;
    try { await fn(this.api); }
    catch (e) { console.error(`[cutscene] scene "${id}" failed`, e); }
    finally {
      this.running = null;
      // a close-up never outlives its scene (a scene that throws or forgets to close it)
      if (this.field.closeup && this.field.closeup.kind) this.field.closeup.reset();
    }
    return true;
  }

  // ---------------------------------------------------------------- helpers
  actor(who) {
    const a = this.field.actorById(who);
    if (!a) this.warn('actor:' + who, `no actor "${who}" on ${this.field.map.id}`);
    return a;
  }
  /** Resolve a mark / event / actor name or (x, y) to a tile. */
  tileOf(target, y) {
    if (typeof target === 'number') return [target | 0, y | 0];
    if (Array.isArray(target)) return [target[0] | 0, target[1] | 0];
    const m = this.field.map.mark(target);
    if (m) return m;
    const ent = this.field.entities && this.field.entities.get(target);
    if (ent) return [ent.x, ent.y];
    const a = this.field.actorById(target);
    if (a) return [a.tx, a.ty];
    this.warn('target:' + target, `unknown target "${target}" on ${this.field.map.id}`);
    return null;
  }
  frames(n) { return this.dead ? Promise.resolve() : this.engine.waitFrames(Math.max(0, n | 0)); }

  async stepActor(a, dir, dur, forced) {
    if (this.dead) return;
    while (a.moving && !this.dead) await this.frames(1);
    if (this.dead) return;
    const ok = forced ? a.forceStep(dir, dur) : a.tryStep(dir, dur);
    if (!ok && !forced) {
      // blocked by something: wait a little and try to force the step so scripts never stall forever
      await this.frames(6);
      if (this.dead || a.moving) return;
      if (!a.tryStep(dir, dur)) a.forceStep(dir, dur);
    }
    if (a.isLeader) this.field.partyFollow(dur);
    while (a.moving && !this.dead) await this.frames(1);
  }

  // ---------------------------------------------------------------- the API
  makeApi() {
    const F = this.field, E = this.engine;
    const self = this;
    const api = {
      async lockInput() { F.lockInput(); },
      async unlockInput() { F.unlockInput(); },

      async say(who, text, opts = {}) {
        if (self.dead) return;
        const a = who ? F.actorById(who) : null;
        const name = who ? nameFor(who, a && a.kind === 'spawn' ? a.name : null) : null;
        const portrait = opts.portrait !== undefined ? opts.portrait : (PORTRAITS[who] || undefined);
        if (a && a.kind !== 'party') a.talking = true;
        self.lastSay = { who, name, portrait, text };
        await F.dialog({ who, name: name || undefined, portrait, text, position: opts.position });
        if (a) a.talking = false;
      },
      async choice(options) {
        if (self.dead) return options.length - 1;
        const last = self.lastSay;
        const r = await F.dialog({ who: last ? last.who : null, name: last ? last.name || undefined : undefined, portrait: last ? last.portrait : undefined,
          text: last ? last.text : '', choices: options, instant: true });
        return typeof r === 'number' ? r : options.length - 1;
      },
      async walk(who, path, opts = {}) {
        const a = self.actor(who);
        if (!a || self.dead) return;
        const dur = SPEEDS[opts.speed] || WALK_FRAMES;
        a.busy++;
        try {
          if (Array.isArray(path)) {
            for (const d of path) { if (self.dead) break; await self.stepActor(a, d, dur, true); }
            return;
          }
          const goalEnt = F.entities && F.entities.get(path);
          const goalActor = F.actorById(path);
          let goal = self.tileOf(path);
          if (!goal) return;
          const occupied = (x, y) => F.actorAt(x, y, a) != null;
          const canStand = (x, y) => F.canStep(a, x, y, x, y, 'down') === true || (!F.map.blockedAt(x, y) && !occupied(x, y));
          if ((goalActor && goalActor !== a) || (goalEnt && (F.map.blockedAt(goal[0], goal[1]) || occupied(goal[0], goal[1])))) {
            const adj = nearestAdjacent((x, y) => F.map.inBounds(x, y) && !F.map.blockedAt(x, y) && !occupied(x, y) && F.map.codeAt(x, y) !== 'pit', goal, [a.tx, a.ty]);
            if (adj) goal = adj;
          }
          if (a.tx === goal[0] && a.ty === goal[1]) { if (goalActor && goalActor !== a) a.faceToward(goalActor); return; }
          const canStep = (x, y, nx, ny, d) => {
            const v = F.canStep(a, x, y, nx, ny, d);
            if (v === true) return true;
            return nx === goal[0] && ny === goal[1] && !F.map.blockedAt(nx, ny);
          };
          let route = findPath(canStep, [a.tx, a.ty], goal);
          if (!route) route = findPath((x, y, nx, ny, d) => F.map.inBounds(nx, ny) && !F.map.blockedAt(nx, ny), [a.tx, a.ty], goal);
          if (!route) { self.warn('path:' + who + ':' + path, `no path for "${who}" to "${path}"`); a.face(dirBetween([a.tx, a.ty], goal) || a.dir); return; }
          for (const d of route) { if (self.dead) break; await self.stepActor(a, d, dur, false); }
          if (goalActor && goalActor !== a) a.faceToward(goalActor);
        } finally { a.busy--; }
      },
      async face(who, dirOrActor) {
        const a = self.actor(who);
        if (!a) return;
        if (DIRS[dirOrActor]) a.face(dirOrActor);
        else { const o = F.actorById(dirOrActor); if (o) a.faceToward(o); else self.warn('face:' + dirOrActor, `face: unknown "${dirOrActor}"`); }
      },
      async jump(who) { const a = self.actor(who); if (a && !self.dead) await a.jump(); },
      async emote(who, kind) {
        const a = self.actor(who);
        if (!a || self.dead) return;
        await Promise.race([a.showEmote(kind), self.frames(60)]);
      },
      async wait(frames) { await self.frames(frames); },
      camera: {
        async panTo(target, y, frames) {
          if (self.dead) return;
          let tile, n;
          if (typeof target === 'number') { tile = [target, y]; n = frames; } else { tile = self.tileOf(target); n = y; }
          if (!tile) return;
          await F.camera.panTo(tile[0] * TILE + 8, tile[1] * TILE + 8, n == null ? 30 : n);
        },
        async follow(who) {
          if (self.dead) return;
          const a = self.actor(who) || F.leader;
          await F.camera.returnTo(a, 30);
        },
      },
      async shake(intensity, frames) { E.renderer.shake(intensity, frames); await self.frames(Math.min(frames, 20)); },
      async flash(color, frames) { E.renderer.flash(color || '#ffffff', frames || 8, 0.85); await self.frames(frames || 8); },
      async fade(dir, frames) { await F.fadeScreen(dir === 'out' ? 1 : 0, frames == null ? 30 : frames); },
      async tint(name, frames) { await F.lighting.setTint(name, frames || 0); },
      /** W11: a framed close-up insert ('fountain'); closeup(null) closes it. See world/closeup.js. */
      async closeup(kind, o = {}) { if (self.dead) return; if (kind) await F.closeup.open(kind, o); else await F.closeup.close(); },
      async music(id) { if (id) E.audio.music(id); else E.audio.stopMusic(0.8); F.sceneMusic = id || null; },
      async sfx(id) { E.audio.sfx(id); },
      async spawn(id, o = {}) {
        if (self.dead) return;
        let tile = o.at != null ? self.tileOf(o.at) : (o.x != null ? [o.x, o.y] : null);
        if (!tile) { self.warn('spawn:' + id, `spawn "${id}": no position`); tile = [F.leader.tx, F.leader.ty]; }
        const old = F.actorById(id);
        if (old) F.removeActor(old);
        const a = new Actor(F, { id, kind: 'spawn', sprite: o.sprite || 'npc_farmer', x: tile[0], y: tile[1], dir: o.dir || 'down', name: o.name || id, solid: o.solid !== false });
        F.addActor(a);
        self.spawned.set(id, a);
      },
      async despawn(id) {
        const a = F.actorById(id);
        if (!a) { self.warn('despawn:' + id, `despawn: no actor "${id}"`); return; }
        F.despawn(a);
        self.spawned.delete(id);
      },
      async setFlag(flag, value = true) { F.setFlag(flag, value); },
      async hasFlag(flag) { return stateHasFlag(F.game, flag); },
      /**
       * give(itemId, qty); give('gold', n) adds n gold with the coin sound and the "Received n gold." toast;
       * give('exp', n) (X1) grants n EXP to every living party member: the toast "The party gains n EXP.", then the
       * level_up jingle and one box per member who leveled. Never scaled; idempotent only through the caller's flag guard.
       */
      async give(itemId, qty = 1) {
        if (self.dead) return;
        if (itemId === 'gold') { await F.giveGold(qty); return; }
        if (itemId === 'exp') {
          const res = grantPartyExp(F.game, qty);
          if (!res.amount) return;
          const text = expToastText(res.amount);
          if (E.toasts) await E.toasts.show({ text, icon: 'book', sfx: 'confirm', frames: 70 });
          else await F.dialog({ who: null, text });
          const boxes = levelUpBoxes(res);
          if (boxes.length && !self.dead) {
            E.audio.sfx('level_up_sparkle');
            E.audio.jingle('level_up', { duckMusic: 0.3 });
            await F.showBoxes(boxes);
          }
          return;
        }
        await F.giveItem(itemId, qty);
      },
      async take(itemId, qty = 1) { if (!self.dead) await F.takeItem(itemId, qty); },
      async battle(encounterId, o = {}) {
        if (self.dead) return 'lose';
        const enc = ENCOUNTERS[encounterId];
        const boss = o.boss != null ? !!o.boss : !!(enc && enc.boss);
        const canFlee = o.canFlee != null ? !!o.canFlee : !(enc && enc.noFlee);
        return F.startBattle(encounterId, { boss, canFlee, start: 'normal' });
      },
      async addMember(id) {
        if (self.dead) return;
        stateAddMember(F.game, id);
        F.rebuildParty();
        await E.audio.jingle('party_join');
      },
      async title(text, o = {}) {
        if (self.dead) return;
        if (E.hasScene('titleCard')) await E.pushAwait('titleCard', { text, sub: o.sub, frames: o.frames || 240, card: o.card });
        else { await F.dialog({ who: null, text: o.sub ? `{c:gold}${text}{/c}\n${o.sub}` : `{c:gold}${text}{/c}` }); }
      },
    };
    return api;
  }
}

export { encounterFor };
