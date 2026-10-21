// Battle animator: turns the rules' event array (docs/BATTLE.md section 7) into a flat list of
// presentation ops the scene runs frame by frame. Pure (no DOM, no engine): node tests check that every
// event type produces ops, that unknown types never stall, and that the frame budget is bounded.
//
//   const ops = planEvents(events, { units });
//
// Op shapes (the scene's runner interprets them; see docs/BATTLE_SCENE.md):
//   blocking:  { op:'wait', frames }  { op:'move', uid, to:'home'|'target'|'cover', target, frames }
//              { op:'dissolve', uid, frames }  { op:'hitstop', frames, uid, crit }  { op:'fall', uid, frames }
//   instant:   help, pose, flash, number, word, fx, sfx, shake, screenFlash, hp, mp, fury, shield, break,
//              shieldRestore, status, telegraph, telegraphCancel, timeline, turn, reveal, summon, split,
//              ko, revive, defendPose, swap, slow, banner, elite, knockback, cover, start, victory,
//              defeat, escape, end
// `frames` values are for battle speed 1x; the runner divides by the speed setting.
// W6-anim frame selection (actors.js plays them, with a code fallback when a frame is missing): enemies take
// pose 'attack' for a melee lunge, 'cast' for spells and telegraphs, 'devour' for the Archivore's devour / feast,
// 'die' (die_0..2, FRAMES.dieSteps) before the white death flash, and 'stance_<name>' on a stance change; the
// party takes 'crit' instead of 'windup' when the swing crits and 'combo' while a combo gathers.

export const FRAMES = Object.freeze({
  start: 30, ready: 6, stepIn: 8, windup: 6, strikeHold: 3, hitHold: 14, multiStagger: 5, randomStagger: 9,
  stepBack: 8, bowDraw: 8, arrowFlight: 8, castWindup: 22, castRelease: 10, buffWindup: 18,
  item: 24, defend: 14, swap: 16, hitstop: 2, hitstopHeavy: 4, flash: 6,
  enemyLunge: 8, enemyWindup: 6, enemySpell: 20, enemyRelease: 10,
  heal: 16, miss: 14, status: 18, statusQuiet: 8, tick: 16, reveal: 22, delay: 14, reflect: 22,
  breakSlow: 18, breakHold: 30, shieldChip: 8, telegraph: 36, telegraphCancel: 16,
  dieSteps: 12, dieFlash: 8, dissolve: 30, bossShake: 70, bossDissolve: 90, koKneel: 10, koFall: 16, revive: 26,
  summon: 26, split: 22, devour: 46, feast: 34, phase: 72, stance: 54, message: 24, elite: 40, skip: 20,
  fury: 18, escape: 40, escapeFail: 24, combo: 30, victory: 12, defeat: 40, invalid: 8, mpPop: 10,
});

const SWING_SFX = { sword: 'sword_slash', axe: 'axe_chop', spear: 'spear_thrust', staff: 'staff_hit', bow: 'bow_shot' };
const ARC_FX = { sword: 'slash', axe: 'chop', spear: 'thrust', staff: 'bonk', bow: 'arrow' };
const STATUS_SFX = { poison: 'poison', burn: 'fire', chill: 'ice', stun: 'stun', silence: 'debuff', blind: 'debuff',
  regen: 'buff', protect: 'buff', haste: 'buff', focus: 'buff', taunt: 'buff', nameless: 'name_devour' };
const STATUS_TEXT = { poison: 'is poisoned', burn: 'is burning', chill: 'is chilled', stun: 'is stunned',
  silence: 'is silenced', blind: 'is blinded', regen: 'gains Regen', protect: 'gains Protect', haste: 'gains Haste',
  focus: 'is focused', taunt: 'draws attention', nameless: 'has lost its name' };
const STATUS_GONE = { poison: 'Poison fades', burn: 'the flames go out', chill: 'the chill thaws', stun: 'shakes off the stun',
  silence: 'can speak again', blind: 'can see again', regen: 'Regen fades', protect: 'Protect fades', haste: 'Haste fades',
  focus: 'loses focus', taunt: 'stops taunting', nameless: 'remembers its name' };
const GOOD = new Set(['regen', 'protect', 'haste', 'focus', 'taunt']);
// Enemy skill fx hints (skills.js `fx`) -> presentation fx id + sound.
const ENEMY_FX = {
  hit: ['claw', 'hit_light'], bump: ['bump', 'hit_light'], bite: ['bite', 'hit_light'], cut: ['cut', 'sword_slash'],
  slam: ['slam', 'hit_heavy'], bash: ['bump', 'hit_heavy'], slash: ['slash', 'sword_slash'], lash: ['lash', 'hit_heavy'],
  bite_big: ['bite_big', 'hit_heavy'], charge: ['charge', 'block_push'],
  ink_spit: ['ink_splash', 'ink_gurgle'], hush: ['hush', 'debuff'], pages: ['pages', 'page_flutter'],
  ink_lance: ['ink_lance', 'ink_gurgle'], ink_wave: ['ink_wave', 'ink_gurgle'], ink_wave_big: ['ink_wave_big', 'ink_gurgle'],
  drain: ['drain', 'poison'], shockwave: ['shockwave', 'thunder'], quake: ['quake', 'door_rumble'], bind: ['bind', 'debuff'],
  howl: ['howl', 'buff'], buff: ['buff', 'buff'], recite: ['recite', 'heal'], devour: ['devour', 'name_devour'],
  ink_storm: ['ink_storm', 'thunder'], summon: ['summon', 'summon'], feast: ['feast', 'page_flutter'],
};
// Party non-weapon fx hints -> [caster circle fx, target fx, sfx at release]
const PARTY_FX = {
  fire: ['circle_fire', 'burst_fire', 'fire'], ice: ['circle_ice', 'burst_ice', 'ice'], thunder: ['circle_thunder', 'burst_thunder', 'thunder'],
  light: ['circle_light', 'burst_light', 'heal'], heal: ['circle_heal', 'heal', 'heal'], heal_all: ['circle_heal', 'heal', 'heal'],
  cleanse: ['circle_heal', 'cleanse', 'heal'], scan: ['circle_light', 'scan', 'confirm'], focus: [null, 'focus', 'buff'],
  guard: [null, 'guard', 'buff'], taunt: [null, 'taunt', 'buff'], rally: [null, 'rally', 'buff'],
  fury_sword: ['circle_light', null, 'fury_art'], fury_axe: ['circle_fire', null, 'fury_art'], fury_spear: ['circle_light', null, 'fury_art'],
  fury_staff: ['circle_heal', 'heal', 'fury_art'], fury_bow: ['circle_light', null, 'fury_art'],
  combo_ember: ['circle_fire', 'burst_fire', 'combo_start'], combo_cross: [null, 'cross', 'combo_start'],
  combo_thorn: ['circle_heal', 'thorns', 'combo_start'], combo_dawn: ['circle_light', 'burst_light', 'combo_start'],
};
const WIDE_FX = new Set(['ink_storm', 'quake', 'shockwave', 'ink_wave_big']);
const BOUNDARY = new Set(['turn_start', 'action_start', 'victory', 'defeat', 'battle_start']);

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

/** Build the planner's unit info table from battle units (or a battle_start event's units). */
export function unitInfo(units) {
  const out = {};
  for (const u of units || []) {
    out[u.uid] = { uid: u.uid, id: u.id, name: u.name, side: u.side, weapon: u.weapon || null, boss: !!u.boss,
      elite: !!(u.elite && u.elite.length), maxHp: u.maxHp || 1 };
  }
  return out;
}

/** Plan presentation ops for an event list. info: { units: unitInfo(...) }. */
export function planEvents(events, info = {}) {
  const P = new Planner(info);
  P.plan(events || []);
  return P.ops;
}

/** Total blocking frames of an op list (at 1x). */
export function totalFrames(ops) {
  let n = 0;
  for (const o of ops) if (o.frames) n += o.frames;
  return n;
}

/** True when this action's hits include a critical (the party swings with the bigger crit wind-up). */
const critIn = (rest) => (rest || []).some((e) => e && e.type === 'damage' && e.crit);

class Planner {
  constructor(info) {
    this.units = info.units || {};
    this.ops = [];
    this.moved = new Set();     // uids currently away from home
    this.posed = new Set();     // uids not in their idle pose
    this.seg = null;            // current action segment context
  }
  push(op) { this.ops.push(op); return op; }
  wait(frames) { if (frames > 0) this.push({ op: 'wait', frames }); }
  name(uid) {
    const u = this.units[uid];
    if (u) return u.name;
    return uid === 'hero' || uid === 'mira' || uid === 'bram' ? cap(uid) : 'Enemy';
  }
  side(uid) { const u = this.units[uid]; return u ? u.side : (uid && uid[0] === 'e' ? 'enemy' : 'party'); }
  isBoss(uid) { const u = this.units[uid]; return !!(u && u.boss); }
  weaponOf(uid) { const u = this.units[uid]; return (u && u.weapon) || 'sword'; }
  help(text, color) { this.push({ op: 'help', text, color: color || null }); }
  pose(uid, pose) {
    this.push({ op: 'pose', uid, pose });
    if (pose === 'idle') this.posed.delete(uid); else this.posed.add(uid);
  }
  returnHome() {
    for (const uid of [...this.moved]) { this.push({ op: 'move', uid, to: 'home', frames: FRAMES.stepBack }); this.moved.delete(uid); }
    for (const uid of [...this.posed]) this.pose(uid, 'idle');
  }

  plan(events) {
    let i = 0;
    while (i < events.length) {
      const ev = events[i];
      if (ev && ev.type === 'action_start') {
        let j = i + 1;
        while (j < events.length && !(events[j] && BOUNDARY.has(events[j].type))) j++;
        this.segment(ev, events.slice(i + 1, j));
        i = j;
        continue;
      }
      this.event(ev);
      i++;
    }
    this.returnHome();
    this.push({ op: 'end' });
  }

  // ---------------------------------------------------------------------------- one action
  segment(start, rest) {
    const actor = start.actor;
    const a = start.action || {};
    const side = this.side(actor);
    const targets = start.targets || [];
    const hasMove = rest.some((e) => e.type === 'move_to' && e.actor === actor);
    const nm = this.name(actor);
    const label = a.name || cap(a.type || 'Attack');
    this.seg = { actor, type: a.type, targets, multi: targets.length > 1, random: false };
    this.push({ op: 'turn', actor, acting: true });
    if (side === 'party') this.help(`${nm}: {c:gold}${label}{/c}`);
    else if (start.charged) this.help(`{c:orange}${nm} unleashes ${label}!{/c}`);
    else this.help(`${nm}: ${label}`);

    const kind = a.type;
    const weapon = start.weapon || this.weaponOf(actor);
    const isBow = weapon === 'bow' && (start.fx === 'weapon' || start.fx === 'arrow' || start.fx === 'arrows' || start.fx === 'fury_bow');
    if (side === 'party') {
      if (kind === 'defend') {
        this.pose(actor, 'defend'); this.push({ op: 'sfx', id: 'defend' }); this.push({ op: 'fx', kind: 'guard', uid: actor });
        this.wait(FRAMES.defend);
      } else if (kind === 'swap') {
        this.pose(actor, 'ready'); this.push({ op: 'sfx', id: 'equip' }); this.push({ op: 'fx', kind: 'swap', uid: actor });
        this.wait(FRAMES.swap);
      } else if (kind === 'flee') { this.pose(actor, 'ready'); this.wait(FRAMES.ready); }
      else if (kind === 'item') {
        this.pose(actor, 'cast');
        this.push({ op: 'sfx', id: 'item_use' });
        for (const t of targets) this.push({ op: 'fx', kind: 'item', uid: t, item: a.item || null });
        this.wait(FRAMES.item);
      } else if (kind === 'combo') this.comboOpen(start);
      else if (isBow) this.bowOpen(actor, start, targets, rest);
      else if (hasMove || start.fx === 'weapon') this.meleeOpen(actor, start, rest, weapon);
      else this.castOpen(actor, start, targets);
    } else this.enemyOpen(actor, start, rest, targets);

    // the hits and effects of this action
    for (const e of rest) {
      if (!e) continue;
      if (e.type === 'move_to') {
        if (kind === 'combo') this.comboStrike(e);
        continue; // melee step-ins are folded into meleeOpen / enemyOpen
      }
      this.event(e);
    }
    this.wait(2);
    this.returnHome();
    this.seg = null;
  }

  meleeOpen(actor, start, rest, w) {
    const mv = rest.find((e) => e.type === 'move_to' && e.actor === actor);
    const target = mv ? mv.target : (start.targets || [])[0];
    const fury = !!(start.fx && String(start.fx).startsWith('fury_'));
    this.pose(actor, 'ready'); this.wait(FRAMES.ready);
    if (fury) {
      this.push({ op: 'sfx', id: 'fury_art' });
      this.push({ op: 'fx', kind: 'fury_flash', uid: actor });
      this.push({ op: 'screenFlash', color: '#fff7d6', frames: 6, alpha: 0.5 });
      this.wait(10);
    }
    if (target && this.side(target) === 'enemy') { this.push({ op: 'move', uid: actor, to: 'target', target, frames: FRAMES.stepIn }); this.moved.add(actor); }
    this.pose(actor, critIn(rest) ? 'crit' : 'windup'); this.wait(FRAMES.windup);
    this.pose(actor, 'strike');
    const arc = start.fx === 'slash_up' ? 'slash_up' : (start.fx === 'slash_wide' || start.fx === 'spin') ? 'slash_wide'
      : start.fx === 'dash_cut' ? 'dash' : start.fx === 'thrust_big' ? 'thrust_big' : fury ? `fury_${w}` : ARC_FX[w] || 'slash';
    const tgts = this.seg.multi ? this.seg.targets : [target];
    for (const t of tgts) if (t) this.push({ op: 'fx', kind: arc, uid: t, from: actor, weapon: w, big: fury });
    this.push({ op: 'sfx', id: SWING_SFX[w] || 'sword_slash' });
    this.wait(FRAMES.strikeHold);
  }

  bowOpen(actor, start, targets, rest = []) {
    this.pose(actor, 'ready'); this.wait(FRAMES.ready);
    this.pose(actor, critIn(rest) ? 'crit' : 'windup'); this.wait(FRAMES.bowDraw);
    this.pose(actor, 'strike');
    const fury = start.fx === 'fury_bow';
    if (fury) this.push({ op: 'sfx', id: 'fury_art' });
    this.push({ op: 'sfx', id: 'bow_shot' });
    const many = start.fx === 'arrows' || fury;
    for (const t of targets) this.push({ op: 'fx', kind: many ? 'arrows' : 'arrow', uid: t, from: actor });
    this.wait(FRAMES.arrowFlight);
    if (many) this.seg.random = true;
  }

  castOpen(actor, start, targets) {
    const hint = PARTY_FX[start.fx] || PARTY_FX.light;
    const [circle, burst, sfx] = hint;
    const buff = !circle;
    this.pose(actor, 'cast');
    if (circle) this.push({ op: 'fx', kind: circle, uid: actor });
    this.push({ op: 'sfx', id: buff ? sfx : 'buff', volume: buff ? 1 : 0.5 });
    this.wait(buff ? FRAMES.buffWindup : FRAMES.castWindup);
    if (!buff) this.push({ op: 'sfx', id: sfx });
    const list = targets.length ? targets : [actor];
    if (burst) for (const t of list) this.push({ op: 'fx', kind: burst, uid: t, from: actor });
    if (burst === 'burst_thunder') {
      this.push({ op: 'screenFlash', color: '#fff6c8', frames: 4, alpha: 0.6 });
      this.push({ op: 'shake', mag: 2, frames: 6 });
    }
    this.wait(FRAMES.castRelease);
  }

  comboOpen(start) {
    const members = (start.action && start.action.members) || [start.actor];
    const hint = PARTY_FX[start.fx] || PARTY_FX.combo_cross;
    this.push({ op: 'banner', text: start.action.name, style: 'combo' });
    this.push({ op: 'sfx', id: 'combo_start' });
    for (const m of members) this.pose(m, 'combo');
    this.push({ op: 'fx', kind: 'combo_link', uids: members });
    this.wait(FRAMES.combo);
    const targets = start.targets || [];
    if (hint[0]) for (const m of members) this.push({ op: 'fx', kind: hint[0], uid: m });
    if (hint[1] === 'thorns' || hint[1] === 'burst_light' || hint[1] === 'burst_fire') for (const t of targets) this.push({ op: 'fx', kind: hint[1], uid: t });
    if (hint[1] === 'thorns') { this.push({ op: 'sfx', id: 'buff' }); this.wait(FRAMES.castRelease); }
    this.seg.combo = members;
    this.seg.comboFx = hint;
  }
  comboStrike(mv) {
    const w = this.weaponOf(mv.actor);
    this.push({ op: 'move', uid: mv.actor, to: 'target', target: mv.target, frames: FRAMES.stepIn }); this.moved.add(mv.actor);
    this.pose(mv.actor, 'windup'); this.wait(FRAMES.windup);
    this.pose(mv.actor, 'strike');
    const cross = this.seg && this.seg.comboFx && this.seg.comboFx[1] === 'cross';
    this.push({ op: 'fx', kind: cross ? 'cross' : ARC_FX[w] || 'slash', uid: mv.target, from: mv.actor, weapon: w, big: true });
    this.push({ op: 'sfx', id: SWING_SFX[w] || 'sword_slash' });
    this.wait(FRAMES.strikeHold);
  }

  enemyOpen(actor, start, rest, targets) {
    const mv = rest.find((e) => e.type === 'move_to' && e.actor === actor);
    const [fxKind, sfx] = ENEMY_FX[start.fx] || ['claw', 'hit_light'];
    this.pose(actor, mv ? 'attack' : (start.fx === 'devour' || start.fx === 'feast') ? 'devour' : 'cast');
    this.push({ op: 'flash', uid: actor, color: '#bc94e2', frames: FRAMES.enemyWindup + 2, soft: true });
    if (start.charged) {
      this.push({ op: 'telegraphCancel', actor, fired: true });
      this.push({ op: 'screenFlash', color: '#2a1030', frames: 8, alpha: 0.5 });
    }
    this.wait(FRAMES.enemyWindup);
    if (mv) {
      this.push({ op: 'move', uid: actor, to: 'target', target: mv.target, frames: FRAMES.enemyLunge }); this.moved.add(actor);
      this.push({ op: 'fx', kind: fxKind, uid: mv.target, from: actor });
      this.push({ op: 'sfx', id: sfx });
      this.wait(FRAMES.strikeHold);
      this.seg.enemyHitSfx = false;
    } else {
      this.push({ op: 'fx', kind: 'enemy_cast', uid: actor });
      this.push({ op: 'sfx', id: sfx });
      this.wait(start.charged ? FRAMES.enemySpell + 8 : FRAMES.enemySpell);
      for (const t of targets) this.push({ op: 'fx', kind: fxKind, uid: t, from: actor });
      if (WIDE_FX.has(fxKind)) {
        this.push({ op: 'shake', mag: 4, frames: 18 });
        this.push({ op: 'screenFlash', color: fxKind === 'shockwave' ? '#ffffff' : '#1a1030', frames: 8, alpha: 0.55 });
      }
      this.wait(FRAMES.enemyRelease);
    }
  }

  // ---------------------------------------------------------------------------- single events
  event(e) {
    if (!e || typeof e.type !== 'string') return;
    const fn = this[`ev_${e.type}`];
    if (typeof fn === 'function') fn.call(this, e);
    // unknown event types are ignored on purpose: the runner never stalls on them
  }

  ev_battle_start(e) {
    this.push({ op: 'start', units: e.units, start: e.start, boss: !!e.boss });
    const foes = (e.units || []).filter((u) => u.side === 'enemy');
    const counts = {};
    for (const f of foes) counts[f.name] = (counts[f.name] || 0) + 1;
    const text = Object.entries(counts).map(([n, c]) => (c > 1 ? `${n} x${c}` : n)).join(', ');
    this.help(e.boss ? `{c:orange}${text}{/c}` : `${text} ${foes.length > 1 ? 'appear' : 'appears'}!`);
    this.wait(FRAMES.start);
  }
  ev_turn_start(e) { this.returnHome(); this.push({ op: 'turn', actor: e.actor, round: e.round }); }
  ev_timeline(e) { this.push({ op: 'timeline', order: e.order }); }
  ev_move_to(e) { this.push({ op: 'move', uid: e.actor, to: 'target', target: e.target, frames: FRAMES.stepIn }); this.moved.add(e.actor); }
  ev_damage(e) {
    const tgt = this.units[e.target];
    const max = e.maxHp || (tgt && tgt.maxHp) || 1;
    const heavy = !!e.crit || e.amount >= max * 0.2;
    const status = e.kind === 'status';
    if (!status) {
      // Hit-stop: 4 frames on a crit, 2 on any other hit; the scene also kicks the camera 1 px toward the target.
      this.push({ op: 'hitstop', frames: e.crit ? FRAMES.hitstopHeavy : FRAMES.hitstop, uid: e.target, crit: !!e.crit });
      this.push({ op: 'flash', uid: e.target, color: '#ffffff', frames: FRAMES.flash });
      this.push({ op: 'fx', kind: 'hit_spark', uid: e.target, big: heavy });
      const quiet = this.seg && this.seg.enemyHitSfx === false && !heavy;
      if (!quiet) this.push({ op: 'sfx', id: e.crit ? 'crit' : heavy ? 'hit_heavy' : 'hit_light' });
      if (heavy) this.push({ op: 'shake', mag: e.crit ? 4 : 3, frames: 8 });
      if (e.reflected) this.push({ op: 'fx', kind: 'reflect_hit', uid: e.target });
    }
    this.pose(e.target, 'hurt');
    const variant = e.crit ? 'crit' : status ? (e.status === 'poison' ? 'poison' : 'white') : e.resist ? 'gray' : 'white';
    this.push({ op: 'number', uid: e.target, text: String(e.amount), variant, big: !!e.crit });
    if (e.crit) this.push({ op: 'word', uid: e.target, word: 'CRITICAL' });
    else if (e.weak) this.push({ op: 'word', uid: e.target, word: 'WEAK' });
    else if (e.resist) this.push({ op: 'word', uid: e.target, word: 'RESIST' });
    this.push({ op: 'hp', uid: e.target, hp: e.hp, maxHp: e.maxHp });
    if (e.shieldLost) this.push({ op: 'shield', uid: e.target, shields: e.shields, lost: e.shieldLost });
    if (e.weak || e.resist) this.push({ op: 'reveal', uid: e.target, flash: true, types: e.types || [] });
    const stagger = this.seg && this.seg.random ? FRAMES.randomStagger : this.seg && this.seg.multi ? FRAMES.multiStagger : FRAMES.hitHold;
    this.wait(status ? FRAMES.tick : stagger);
  }
  ev_shield(e) {
    this.push({ op: 'shield', uid: e.target, shields: e.shields, lost: e.lost });
    this.push({ op: 'sfx', id: 'hit_light', pitch: 1.5 });
    this.wait(FRAMES.shieldChip);
  }
  ev_break(e) {
    this.push({ op: 'hitstop', frames: FRAMES.hitstopHeavy, uid: e.target, crit: true });
    this.push({ op: 'slow', factor: 0.5, frames: FRAMES.breakSlow });
    this.push({ op: 'break', uid: e.target });
    this.push({ op: 'fx', kind: 'break_burst', uid: e.target });
    this.push({ op: 'word', uid: e.target, word: 'BREAK', big: true });
    this.push({ op: 'sfx', id: 'break' });
    this.push({ op: 'shake', mag: 3, frames: 10 });
    this.push({ op: 'screenFlash', color: '#ffe9a8', frames: 5, alpha: 0.5 });
    this.help(`{c:gold}${this.name(e.target)} is BROKEN!{/c}`);
    this.wait(FRAMES.breakHold);
  }
  ev_shield_restore(e) { this.push({ op: 'shieldRestore', uid: e.target, shields: e.shields }); }
  ev_reveal(e) {
    this.push({ op: 'reveal', uid: e.target, weak: e.weak || [], resist: e.resist || [], all: !!e.all, hp: e.hp, maxHp: e.maxHp, flash: true });
    const nm = this.name(e.target);
    if (e.all) this.help(`${nm}: weak to {c:gold}${(e.weak || []).map(cap).join(', ') || 'nothing known'}{/c}`);
    else if (e.weak && e.weak.length) this.help(`${nm} is weak to {c:gold}${e.weak.map(cap).join(', ')}{/c}!`);
    else if (e.resist && e.resist.length) this.help(`${nm} resists ${e.resist.map(cap).join(', ')}.`);
    if (e.all || (e.resist && e.resist.length && !(e.weak && e.weak.length))) this.wait(FRAMES.reveal);
  }
  ev_heal(e) {
    if (!(e.amount > 0) && !e.absorbed) return;
    const outside = !this.seg || e.status || e.drain || e.lifesteal || e.feast || e.absorbed;
    if (outside) this.push({ op: 'fx', kind: 'heal', uid: e.target, small: true });
    if (!this.seg) this.push({ op: 'sfx', id: 'heal', volume: 0.6 });
    this.push({ op: 'number', uid: e.target, text: `+${e.amount}`, variant: 'heal' });
    this.push({ op: 'hp', uid: e.target, hp: e.hp, maxHp: e.maxHp });
    this.wait(this.seg && this.seg.multi ? FRAMES.multiStagger : FRAMES.heal);
  }
  ev_mp(e) {
    this.push({ op: 'mp', uid: e.target, mp: e.mp, maxMp: e.maxMp });
    if (!e.cost && e.amount && (e.item || e.skill || e.drained)) {
      this.push({ op: 'number', uid: e.target, text: `${e.amount > 0 ? '+' : ''}${e.amount}`, variant: 'mp', small: true });
      this.wait(FRAMES.mpPop);
    }
  }
  ev_miss(e) {
    const word = e.reason === 'immune' ? 'IMMUNE' : e.reason === 'evade' ? 'DODGE' : 'MISS';
    this.push({ op: 'word', uid: e.target, word });
    this.push({ op: 'sfx', id: 'miss' });
    if (e.reason === 'immune') this.push({ op: 'reveal', uid: e.target, resist: e.types || [], flash: true });
    this.wait(FRAMES.miss);
  }
  ev_status_add(e) {
    // Kept (the Nameless King): the member is sealed in a mirror shard on the stage. The shard seals over it, a
    // glassy freeze plays, and the party-status window shows the icon_kept badge (hud PARTY_STATUS_ORDER).
    if (e.status === 'kept') {
      this.push({ op: 'status', uid: e.target, status: 'kept', on: true, turns: e.turns });
      this.push({ op: 'pose', uid: e.target, pose: 'hurt' });
      this.push({ op: 'fx', kind: 'kept_seal', uid: e.target });
      this.push({ op: 'sfx', id: 'kept' });
      this.push({ op: 'screenFlash', color: '#cfefff', frames: 8, alpha: 0.3 });
      this.help(`{c:violet}${this.name(e.target)} is kept in the mirror!{/c}`);
      this.wait(FRAMES.status);
      return;
    }
    const good = GOOD.has(e.status);
    this.push({ op: 'status', uid: e.target, status: e.status, on: true, turns: e.turns });
    this.push({ op: 'fx', kind: good ? 'status_good' : 'status_bad', uid: e.target, status: e.status });
    this.push({ op: 'sfx', id: STATUS_SFX[e.status] || (good ? 'buff' : 'debuff') });
    if (e.status === 'nameless') this.pose(e.target, 'hurt');
    this.help(`${this.name(e.target)} ${STATUS_TEXT[e.status] || 'is affected'}!`, good ? 'green' : 'violet');
    this.wait(FRAMES.status);
  }
  ev_status_remove(e) {
    this.push({ op: 'status', uid: e.target, status: e.status, on: false });
    // Freed from Kept (Recall, Silver Salve, or the King Broken): the shard shatters and the member stands again.
    if (e.status === 'kept' && e.reason === 'freed') {
      this.push({ op: 'fx', kind: 'kept_shatter', uid: e.target });
      this.push({ op: 'sfx', id: 'kept_break' });
      this.push({ op: 'pose', uid: e.target, pose: 'idle' });
      this.help(`{c:cyan}${this.name(e.target)} breaks free of the mirror!{/c}`);
      this.wait(FRAMES.status);
      return;
    }
    if (e.reason === 'cured' || e.reason === 'countered') {
      this.push({ op: 'fx', kind: 'cleanse', uid: e.target, small: true });
      this.help(`${this.name(e.target)}: ${STATUS_GONE[e.status] || 'recovers'}.`);
      this.wait(FRAMES.statusQuiet);
    }
  }
  ev_status_resist(e) { this.push({ op: 'word', uid: e.target, word: 'RESIST' }); this.wait(FRAMES.statusQuiet); }
  ev_status_tick(e) {
    if (!e.amount) return;
    const heal = e.amount > 0;
    this.push({ op: 'fx', kind: heal ? 'heal' : e.status === 'burn' ? 'burst_fire' : 'poison_bubbles', uid: e.target, small: true });
    this.push({ op: 'sfx', id: heal ? 'heal' : e.status === 'burn' ? 'fire' : 'poison', volume: 0.5 });
    if (!heal) this.pose(e.target, 'hurt');
    this.push({ op: 'number', uid: e.target, text: heal ? `+${e.amount}` : String(-e.amount), variant: heal ? 'heal' : e.status === 'poison' ? 'poison' : 'white' });
    this.push({ op: 'hp', uid: e.target, hp: e.hp, maxHp: e.maxHp });
    this.wait(FRAMES.tick);
  }
  ev_stat_mod(e) {
    const down = e.mult < 1;
    const stat = { atk: 'ATK', def: 'DEF', mag: 'MAG', spr: 'SPR', spd: 'SPD' }[e.stat] || String(e.stat).toUpperCase();
    this.push({ op: 'fx', kind: down ? 'status_bad' : 'status_good', uid: e.target });
    this.push({ op: 'sfx', id: down ? 'debuff' : 'buff' });
    this.help(`${this.name(e.target)}: ${stat} ${down ? 'down' : 'up'}!`, down ? 'violet' : 'green');
    this.wait(FRAMES.status);
  }
  ev_fury_gain(e) { this.push({ op: 'fury', uid: e.target, fury: e.fury, amount: e.amount }); }
  ev_fury_ready(e) {
    this.push({ op: 'fx', kind: 'fury_ready', uid: e.target });
    this.push({ op: 'sfx', id: 'fury_ready' });
    this.help(`{c:orange}${this.name(e.target)}'s Fury is ready!{/c}`);
    this.wait(FRAMES.fury);
  }
  ev_defend(e) { this.push({ op: 'defendPose', uid: e.actor, on: true }); }
  ev_defend_end(e) { this.push({ op: 'defendPose', uid: e.actor, on: false }); }
  ev_guard(e) {
    this.push({ op: 'cover', actor: e.actor, target: e.target, on: true });
    this.push({ op: 'fx', kind: 'guard', uid: e.target });
    this.help(`${this.name(e.actor)} guards ${this.name(e.target)}!`, 'green');
    this.wait(FRAMES.statusQuiet);
  }
  ev_cover(e) {
    this.push({ op: 'move', uid: e.actor, to: 'cover', target: e.target, frames: 6 }); this.moved.add(e.actor);
    this.pose(e.actor, 'defend');
    this.push({ op: 'sfx', id: 'defend' });
    this.help(`${this.name(e.actor)} takes the blow for ${this.name(e.target)}!`, 'green');
    this.wait(4);
  }
  ev_swap(e) { this.push({ op: 'swap', uid: e.actor, weapon: e.weapon }); this.help(`${this.name(e.actor)} readies the ${e.weapon}.`); }
  ev_delay(e) {
    if (e.reason === 'interrupt') return;
    this.push({ op: 'knockback', uid: e.target, amount: e.amount });
    this.push({ op: 'fx', kind: 'knockback', uid: e.target });
    this.help(`${this.name(e.target)} is knocked back in line!`);
    this.wait(FRAMES.delay);
  }
  ev_reflect(e) {
    this.push({ op: 'fx', kind: 'reflect', uid: e.actor, to: e.target });
    this.push({ op: 'sfx', id: 'crystal_hit' });
    this.help(`{c:cyan}${this.name(e.actor)} reflects the ${e.kind === 'magic' ? 'spell' : 'blow'}!{/c}`);
    this.wait(FRAMES.reflect);
  }
  ev_stance(e) {
    // the Warden settles out of any attack pose and its new stance set flashes in (actors.js STANCE_FLASH)
    if (this.posed.has(e.actor)) this.pose(e.actor, 'idle');
    this.push({ op: 'pose', uid: e.actor, pose: `stance_${e.stance}` });
    this.push({ op: 'banner', text: e.name || 'Stance change', style: 'stance' });
    this.push({ op: 'fx', kind: 'stance', uid: e.actor, stance: e.stance });
    this.push({ op: 'sfx', id: 'equip' });
    this.push({ op: 'reveal', uid: e.actor, reset: true });
    this.help(e.text || `${this.name(e.actor)} changes stance.`, 'cyan');
    this.wait(FRAMES.stance);
  }
  ev_phase(e) {
    this.push({ op: 'banner', text: e.name || `Phase ${e.phase}`, style: 'phase' });
    // A phase that carries a new sprite (the Nameless King's veil shattering to `nameless_king_unmasked`): the
    // glass breaks, then the frames swap mid-flash (the swap op also white-flashes the actor).
    if (e.sprite) {
      this.push({ op: 'fx', kind: 'shatter', uid: e.actor, big: true });
      this.push({ op: 'sfx', id: 'glass_break' });
      this.push({ op: 'screenFlash', color: '#ffffff', frames: 10, alpha: 0.7 });
      this.push({ op: 'shake', mag: 4, frames: 20 });
      this.wait(6);
      this.push({ op: 'swapSprite', uid: e.actor, sprite: e.sprite });
    } else {
      this.push({ op: 'fx', kind: 'phase', uid: e.actor, phase: e.phase });
      this.push({ op: 'sfx', id: e.phase >= 3 ? 'door_rumble' : 'summon' });
      this.push({ op: 'shake', mag: 3, frames: 24 });
    }
    this.push({ op: 'reveal', uid: e.actor, reset: true });
    this.help(e.text || `${this.name(e.actor)} changes.`, 'orange');
    this.wait(FRAMES.phase);
  }
  ev_summon(e) {
    this.push({ op: 'summon', uid: e.enemy, id: e.id, name: e.name, variant: e.variant, tint: e.tint, hp: e.hp, by: e.by, split: !!e.split });
    this.push({ op: 'fx', kind: e.split ? 'split_pop' : 'summon_pop', uid: e.enemy });
    this.push({ op: 'sfx', id: e.split ? 'ink_gurgle' : 'page_flutter', volume: 0.7 });
    this.help(e.split ? `${e.name} splits apart!` : `${e.name} appears!`, 'violet');
    this.wait(e.split ? FRAMES.split : FRAMES.summon);
  }
  ev_split(e) { this.push({ op: 'split', source: e.source, into: e.into || [] }); }
  ev_devour(e) {
    if (e.actor) this.pose(e.actor, 'devour');
    this.push({ op: 'fx', kind: 'devour', uid: e.target, from: e.actor, success: !!e.success });
    this.push({ op: 'sfx', id: e.success ? 'name_devour' : 'defend' });
    if (e.success) {
      this.push({ op: 'screenFlash', color: '#0a0612', frames: 20, alpha: 0.7 });
      this.push({ op: 'shake', mag: 2, frames: 20 });
      this.pose(e.target, 'kneel');
    }
    this.help(e.success ? `{c:violet}${this.name(e.target)}'s name is devoured!{/c}` : `{c:green}${this.name(e.target)} holds on to the name!{/c}`);
    this.wait(e.success ? FRAMES.devour : FRAMES.status);
  }
  ev_feast(e) {
    this.pose(e.actor, 'devour');
    this.push({ op: 'fx', kind: 'feast', uid: e.actor, pages: e.pages || [] });
    this.push({ op: 'sfx', id: 'page_flutter' });
    this.help((e.pages && e.pages.length) ? `{c:violet}${this.name(e.actor)} devours its pages!{/c}` : `${this.name(e.actor)} snaps at empty air.`);
    this.wait(FRAMES.feast);
  }
  ev_ko(e) {
    const side = this.side(e.target);
    this.push({ op: 'status', uid: e.target, status: null, on: false, clear: true });
    this.moved.delete(e.target);
    this.posed.delete(e.target);
    if (side === 'enemy') {
      const boss = this.isBoss(e.target);
      // die_0..2: the sprite crumbles from the top, then the white flash and the dissolve (pose before 'ko':
      // the runner ignores poses for KO'd units)
      this.push({ op: 'pose', uid: e.target, pose: 'die' });
      this.wait(FRAMES.dieSteps);
      this.push({ op: 'ko', uid: e.target });
      this.push({ op: 'flash', uid: e.target, color: '#ffffff', frames: boss ? FRAMES.bossShake : FRAMES.dieFlash, hold: true });
      this.push({ op: 'sfx', id: boss ? 'boss_die' : 'enemy_die' });
      if (boss) {
        this.push({ op: 'shake', mag: 5, frames: FRAMES.bossShake });
        this.wait(FRAMES.bossShake);
        this.push({ op: 'screenFlash', color: '#ffffff', frames: 40, alpha: 0.9 });
      } else this.wait(FRAMES.dieFlash);
      this.push({ op: 'dissolve', uid: e.target, frames: boss ? FRAMES.bossDissolve : FRAMES.dissolve });
    } else {
      this.push({ op: 'ko', uid: e.target });
      this.push({ op: 'pose', uid: e.target, pose: 'kneel' });
      this.push({ op: 'sfx', id: 'hit_heavy', volume: 0.6 });
      this.wait(FRAMES.koKneel);
      this.push({ op: 'fall', uid: e.target, frames: FRAMES.koFall });
      this.help(`{c:red}${this.name(e.target)} has fallen!{/c}`);
      this.wait(FRAMES.statusQuiet);
    }
  }
  ev_revive(e) {
    this.push({ op: 'revive', uid: e.target, hp: e.hp });
    this.push({ op: 'fx', kind: 'revive', uid: e.target });
    this.push({ op: 'sfx', id: 'revive' });
    this.pose(e.target, 'idle');
    this.help(`{c:green}${this.name(e.target)} rises again!{/c}`);
    this.wait(FRAMES.revive);
  }
  ev_skip(e) {
    const nm = this.name(e.actor);
    this.push({ op: 'turn', actor: null });
    if (e.reason === 'stun') {
      this.push({ op: 'fx', kind: 'status_bad', uid: e.actor, status: 'stun' });
      this.push({ op: 'sfx', id: 'stun', volume: 0.5 });
      this.help(`${nm} is stunned and cannot move!`, 'violet');
    } else if (e.reason === 'kept') {
      this.help(`${nm} is kept in the mirror.`, 'violet');
    } else this.help(`${nm} is broken and loses the turn!`, 'gold');
    this.wait(e.reason === 'kept' ? FRAMES.statusQuiet : FRAMES.skip);
  }
  ev_telegraph(e) {
    this.pose(e.actor, 'cast');
    // `partner` + `mirrorCombo` (the Other Selves' Mirrored Combo): the scene draws a silver bracket between the
    // two reflections' timeline slots (hud.drawMirrorBracket).
    this.push({ op: 'telegraph', actor: e.actor, skill: e.skill, name: e.name, text: e.text, target: e.target, targets: e.targets || [], nextTurn: e.nextTurn, partner: e.partner || null, mirrorCombo: !!e.mirrorCombo });
    this.push({ op: 'sfx', id: 'telegraph' });
    this.push({ op: 'fx', kind: 'telegraph', uid: e.actor });
    this.help(`{c:orange}${e.text}{/c}`);
    this.wait(FRAMES.telegraph);
  }
  ev_telegraph_cancel(e) {
    this.push({ op: 'telegraphCancel', actor: e.actor, reason: e.reason });
    const why = { break: 'is broken: the charge fizzles!', stun: 'is stunned: the charge fizzles!', interrupt: 'is interrupted!', phase: 'loses its focus.' }[e.reason] || 'stops.';
    this.help(`{c:cyan}${this.name(e.actor)} ${why}{/c}`);
    this.wait(FRAMES.telegraphCancel);
  }
  ev_message(e) {
    if (e.kind === 'elite' && e.target) {
      this.push({ op: 'elite', uid: e.target });
      this.push({ op: 'sfx', id: 'telegraph', volume: 0.6 });
      this.help(`{c:gold}${e.text}{/c}`);
      this.wait(FRAMES.elite);
      return;
    }
    // "The mirror cracks!" (the King is Broken and frees every Kept member): a glass crack and a bright beat;
    // the per-member shatter follows on each status_remove 'freed'.
    if (e.kind === 'kept_break') {
      if (e.target) this.push({ op: 'fx', kind: 'mirror_crack', uid: e.target });
      this.push({ op: 'sfx', id: 'glass_break' });
      this.push({ op: 'screenFlash', color: '#ffffff', frames: 8, alpha: 0.5 });
      this.push({ op: 'shake', mag: 3, frames: 12 });
      this.help(`{c:cyan}${e.text}{/c}`);
      this.wait(FRAMES.message);
      return;
    }
    const col = e.kind === 'taunt' ? 'green' : e.kind === 'interrupt' ? 'cyan'
      : e.kind === 'ward' || e.kind === 'ward_break' ? 'orange' : e.kind === 'kept' || e.kind === 'kept_hold' ? 'violet' : null;
    this.help(e.text, col);
    this.wait(FRAMES.message);
  }
  ev_escape(e) {
    this.push({ op: 'escape', success: !!e.success });
    if (e.success) { this.push({ op: 'sfx', id: 'flee' }); this.help('Got away safely!'); this.wait(FRAMES.escape); }
    else this.push({ op: 'sfx', id: 'buzzer', volume: 0.5 });
  }
  ev_victory(e) {
    this.returnHome();
    this.push({ op: 'victory', exp: e.exp, gold: e.gold, mastery: e.mastery, items: e.items, consumables: e.consumables });
    this.wait(FRAMES.victory);
  }
  ev_defeat() { this.returnHome(); this.push({ op: 'defeat' }); this.wait(FRAMES.defeat); }
  ev_invalid(e) { this.help(`{c:red}${e.reason || 'Invalid action'}{/c}`); this.wait(FRAMES.invalid); }
  ev_decision() { /* simulator trace only */ }
}

/** Every event type documented in docs/BATTLE.md section 7 (for tests). */
export const EVENT_TYPES = ['battle_start', 'turn_start', 'timeline', 'telegraph', 'telegraph_cancel', 'action_start', 'move_to',
  'damage', 'shield', 'break', 'shield_restore', 'reveal', 'heal', 'mp', 'miss', 'status_add', 'status_remove', 'status_tick',
  'status_resist', 'stat_mod', 'fury_gain', 'fury_ready', 'defend', 'defend_end', 'guard', 'cover', 'swap', 'delay', 'reflect',
  'stance', 'phase', 'summon', 'split', 'devour', 'feast', 'ko', 'revive', 'skip', 'message', 'escape', 'victory', 'defeat'];
