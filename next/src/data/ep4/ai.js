// Episode 4 ("The Sunken Keep") battle AI (E4-battle; docs/EPISODE4_PLAN.md 6.3 to 6.5). Pure: no DOM, canvas or audio;
// randomness only through ctx.R. The pack's register() adds five scripts to ai.js SCRIPTS and one rule to POLICY_EXT (seam 7).
//
// Scripts (by enemy `ai` id):
//   decree        basic + the Answer hook. Every ordinary Episode 4 foe (the Decree ones stamp toward their flare by data).
//   barrister     an attack each turn, then it stamps (+1 Seal) at the end of every turn; Objection at 3 Seals (its flare);
//                 at 50% HP it calls one witness (barrister_witness, ai 'counsel') that stamps it each turn.
//   counsel       the witness: Stamp the Brief (+1 Seal to the Barrister) every turn.
//   paper_regent  1 Forged Edicts (100% to 70%, HP locked at 70%, DEF x1.4): Trident Sweep, Wet Seal, Stamp; Flood Decree at 3
//                 2 Royal Ward (from 70%): the two Forged Writs; while either stands it takes 25% damage, its shields hold and
//                   its HP stops at 31%. Both down: the ward breaks, it is Broken a turn, the party gains 25 Fury.
//                 3 The True Charter: Haste, light weakness, DEF normal; Strike from the Roll announced on every 3rd turn on
//                   the hero (a charge, not a Decree: fire does not void it). If it lands: Nameless, and +20% ATK and MAG.
//   writ          writ_silence mends the Regent 6% every turn (Hush, which also mends, on every second turn);
//                 writ_oblivion stamps the Regent every turn.
//
// Answer (src/data/ep4/skills.js) has no rules.js hook of its own: rules.js strike() calls the target's script `reflect(ctx,
// tgt, part)` with the hit's part (part.id 'answer') before the damage, and every script here routes that to answerHook, which
// voids the Seals and any pending decree or Strike, Breaks the target when something was pending (not through the Royal Ward)
// and guards the hero from Nameless until the hero's next turn. It returns null, so nothing is reflected.
//
// Events the battle scene draws (docs/BATTLE.md 12.6): `answer` { actor, target, voided, seals, broke, guarded }, `heat` with
// reason 'stamp' (the seal pips; sfx seal_stamp), `quench` with sfx 'decree_void' (the void), `telegraph` of a skill with
// `decree: true` or `answerable: true` (telegraphSfx decree_unroll), messages of kind 'ward' | 'ward_break' | 'witness' |
// 'name_struck' | 'name_hold' | 'answer'.
//
// One ward-break note: ai.js onDeath() only tells the Episode 1 to 3 scripts about a death, so the writs watch their own
// killing blow in clampDamage (called by rules.js damage() just before the HP drops) and break the ward from there; the events
// arrive before the writ's damage and ko. A seam that lets onDeath reach SCRIPTS would let this move (docs/BATTLE.md 12.7).

import { SCRIPTS, POLICY_EXT, competentPolicy } from '../../battle/ai.js';
import { ENEMIES } from '../enemies.js';
import { SKILLS } from '../skills.js';

export const WARD_MULT = 0.25;        // damage the Regent takes under the Royal Ward
export const ROLL_EMPOWER = 0.3;      // ATK and MAG the Regent gains per name it strikes from the roll
export const WARD_FURY = 25;          // Fury each party member gains when the ward breaks
export const WRITS = ['writ_silence', 'writ_oblivion'];
const FURY_MAX = 100;

const basic = SCRIPTS.basic;
const writsStanding = (ctx) => ctx.living('enemy').filter((e) => WRITS.includes(e.id));
const regentOf = (ctx) => ctx.living('enemy').find((e) => e.id === 'paper_regent') || null;
const foesOf = (ctx) => ctx.living('party').filter((p) => !ctx.has(p, 'kept'));

/** Does the pending charge of `u` answer to Answer (its Decree flare, or Strike from the Roll)? Returns the skill id or null. */
export function answerablePending(u) {
  if (!u || !u.charging) return null;
  const id = u.charging.skill;
  if (u.heatFlare && id === u.heatFlare) return id;
  return SKILLS[id] && SKILLS[id].answerable ? id : null;
}

/** The hero cannot be made Nameless until the hero's next turn after an Answer. */
export function answerGuarded(hero) {
  return !!(hero && hero.answerGuard !== undefined && (hero.acted || 0) <= hero.answerGuard);
}

/** Answer's rules (see the header). Called from every Episode 4 script's reflect hook; never reflects. */
export function answerHook(ctx, tgt, part) {
  if (!part || part.id !== 'answer' || !tgt || !tgt.alive || tgt.side !== 'enemy') return null;
  const hero = ctx.U('hero');
  const pending = answerablePending(tgt);
  const seals = tgt.heat || 0;
  if (tgt.heatMax) ctx.quench(tgt, 'answer');                         // Seals to 0, a pending decree cancelled ('Voided!')
  if (pending && tgt.charging && tgt.charging.skill === pending) ctx.cancelCharge(tgt, 'answer');   // Strike from the Roll
  const ward = !!(tgt.ai && tgt.ai.ward);
  const broke = !!pending && !ward && !tgt.broken;
  if (hero) hero.answerGuard = (hero.acted || 0) + 1;
  ctx.emit({ type: 'answer', actor: hero ? hero.uid : 'hero', target: tgt.uid, voided: pending, seals, broke, guarded: true });
  if (pending) {
    const who = hero ? hero.name : 'The hero';
    ctx.emit({ type: 'message', text: `${who} answers to their name. The decree will not stand.`, kind: 'answer', target: tgt.uid });
  }
  if (broke) ctx.breakUnit(tgt);
  return null;
}

// --- ordinary foes ---------------------------------------------------------------------------------------------------
const decree = { ...basic, reflect: answerHook };

// --- the Inkbound Barrister and its witness --------------------------------------------------------------------------
const barrister = {
  // it argues fast: Haste for the whole hearing, so an Objection is never more than a turn or two away
  start(ctx, u) { u.ai.witnessCalled = false; if (ENEMIES[u.id].haste) ctx.addStatus(u, 'haste', 99, u); },
  decide: basic.decide,
  // its sleeves are full of paper: a Seal at the end of every turn it takes (a Break or a pending Objection skips it)
  afterTurn(ctx, u) { if (u.alive && !u.broken && !u.charging) ctx.stoke(u, ENEMIES[u.id].stampsPerTurn || 1, { reason: 'stamp' }); },
  onDamaged(ctx, u) {
    const d = ENEMIES[u.id];
    if (u.ai.witnessCalled || u.hp > Math.floor(u.maxHp * (d.witnessAt || 0.5))) return;
    u.ai.witnessCalled = true;
    ctx.emit({ type: 'message', text: 'The Barrister calls a witness!', kind: 'witness', target: u.uid });
    ctx.summon('barrister_witness', { by: u, summoned: true, firstTurn: 0.4 });
  },
  reflect: answerHook,
};
const counsel = {
  decide() { return { skill: 'counsel_stamp', target: null }; },
  afterTurn() {},
  reflect: answerHook,
};

// --- the Paper Regent and the Forged Writs ---------------------------------------------------------------------------
function dropArmor(ctx, u) {
  const had = u.mods.some((m) => m.source === 'regent_armor');
  if (!had) return;
  u.mods = u.mods.filter((m) => m.source !== 'regent_armor');
  ctx.emit({ type: 'stat_mod', target: u.uid, stat: 'def', mult: 1, turns: 0, reason: 'phase' });
}
function enterRegentPhase(ctx, u, idx) {
  const d = ENEMIES[u.id];
  const p = d.phases[idx];
  u.ai.phase = idx;
  // an announced Flood Decree survives the change (the water is already rising); anything else pending is dropped
  if (!(u.charging && u.charging.skill === d.heat.flare)) ctx.cancelCharge(u, 'phase');
  ctx.emit({ type: 'phase', actor: u.uid, phase: idx + 1, id: p.id, name: p.name, text: p.text, sprite: p.sprite || null });
  ctx.setWeak(u, p.weak, p.resist, idx < 2 ? `${u.id}:edicts` : `${u.id}:${p.id}`);
  if (idx > 0) ctx.setShields(u, p.shields);
  if (p.armor) ctx.addMod(u, 'def', p.armor, 999, 'regent_armor'); else dropArmor(ctx, u);
  if (p.summon) {
    p.summon.forEach((id, i) => ctx.summon(id, { by: u, summoned: true, firstTurn: 0.4 + 0.3 * i }));
    u.ai.ward = true;
    ctx.emit({ type: 'message', text: 'A Royal Ward closes around the Regent. While its writs stand, little reaches it.', kind: 'ward', target: u.uid });
  }
  if (p.haste) ctx.addStatus(u, 'haste', 99, u);
  if (idx === 2) u.ai.strikeAt = u.ai.turns + (d.strikeEvery || 3) - 1;   // the first Strike comes a turn early
}
function partyFury(ctx, amount) {
  for (const m of ctx.living('party')) {
    const before = m.fury || 0;
    m.fury = Math.min(FURY_MAX, before + amount);
    if (m.fury !== before) ctx.emit({ type: 'fury_gain', target: m.uid, amount: m.fury - before, fury: m.fury, reason: 'ward_break' });
    if (before < FURY_MAX && m.fury >= FURY_MAX) ctx.emit({ type: 'fury_ready', target: m.uid });
  }
}
/** Both writs are gone: the ward breaks, the Regent is Broken a turn, the party gains 25 Fury, phase 3 begins. */
export function breakWard(ctx, u) {
  if (!u || !u.alive || !u.ai.ward) return;
  u.ai.ward = false;
  ctx.emit({ type: 'message', text: 'The Royal Ward tears like wet paper!', kind: 'ward_break', target: u.uid });
  enterRegentPhase(ctx, u, 2);
  ctx.breakUnit(u);
  partyFury(ctx, WARD_FURY);
  ctx.emit({ type: 'message', text: `The party takes heart. Fury rises! (+${WARD_FURY})`, kind: 'blessing' });
}
function heroTarget(ctx) {
  const h = foesOf(ctx).find((p) => p.id === 'hero');
  return h ? h.uid : null;
}
const paperRegent = {
  start(ctx, u) {
    u.ai.phase = 0;
    u.ai.ward = false;
    enterRegentPhase(ctx, u, 0);
  },
  decide(ctx, u, d) {
    const p = d.phases[u.ai.phase ?? 0];
    return basic.decide(ctx, u, { ...d, moves: (p && p.moves) || d.moves, opener: null });
  },
  afterTurn(ctx, u, d) {
    if (u.charging || u.broken || (u.ai.phase ?? 0) < 2) return;
    if (u.ai.turns >= (u.ai.strikeAt ?? 99)) {
      const t = heroTarget(ctx);
      if (!t) return;   // the hero is down: the roll waits for the name to stand up again
      ctx.planCharge(u, 'strike_roll', t);
      u.ai.strikeAt = u.ai.turns + (d.strikeEvery || 3);   // every third turn (a void or a Break does not reset the beat)
    }
  },
  clampDamage(ctx, u, amt) {
    const d = ENEMIES[u.id];
    const ph = u.ai.phase ?? 0;
    let floorHp = null;
    if (ph === 0) floorHp = Math.floor(u.maxHp * d.phases[1].at);
    else if (ph === 1 && u.ai.ward) floorHp = Math.floor(u.maxHp * d.phases[1].floor);
    if (floorHp === null) return amt;
    return u.hp - amt < floorHp ? Math.max(0, u.hp - floorHp) : amt;
  },
  onDamaged(ctx, u) {
    if ((u.ai.phase ?? 0) === 0 && u.hp <= Math.floor(u.maxHp * ENEMIES[u.id].phases[1].at)) enterRegentPhase(ctx, u, 1);
  },
  damageTakenMult(ctx, u) { return u.ai.ward ? WARD_MULT : 1; },
  shieldLocked(ctx, u) { return !!u.ai.ward; },
  onDeath(ctx, dead) {   // not called by ai.js onDeath today (see the header); kept for the seam
    if (!WRITS.includes(dead.id)) return;
    const r = regentOf(ctx);
    if (r && r.ai.ward && !writsStanding(ctx).length) breakWard(ctx, r);
  },
  special(ctx, u, sk, e, targets) {
    if (!e.nameStrike) return null;
    for (const t of targets) {
      if (!t || !t.alive) continue;
      if (answerGuarded(t)) {
        ctx.emit({ type: 'message', text: `${t.name} has answered to that name. It holds!`, kind: 'name_hold', target: t.uid });
        continue;
      }
      if (!ctx.addStatus(t, 'nameless', 99, u)) continue;   // a resist (the Regent's Pardon) keeps the name
      ctx.addStatus(t, 'silence', 3, u);
      ctx.emit({ type: 'message', text: `${t.name}'s name is struck from the roll!`, kind: 'name_struck', target: t.uid });
      u.ai.struck = (u.ai.struck || 0) + 1;
      ctx.addMod(u, 'atk', 1 + ROLL_EMPOWER, 99, `roll${u.ai.struck}`);
      ctx.addMod(u, 'mag', 1 + ROLL_EMPOWER, 99, `roll${u.ai.struck}`);
    }
    return null;
  },
  reflect: answerHook,
};
const writ = {
  decide(ctx, u) {
    if (u.id === 'writ_oblivion') return { skill: 'stamp_regent', target: null };
    if (u.ai.turns % 2 === 1) return { skill: 'mend_seal', target: null };
    // Hush on a caster: Mira while she can still speak, else anyone
    const foes = foesOf(ctx);
    if (!foes.length) return { skill: 'mend_seal', target: null };
    const mira = foes.find((f) => f.id === 'mira' && !ctx.has(f, 'silence'));
    return { skill: 'seal_hush', target: (mira || foes[Math.floor(ctx.R() * foes.length)]).uid };
  },
  afterTurn() {},
  // the killing blow on the last writ breaks the Regent's ward (see the header: onDeath does not reach pack scripts)
  clampDamage(ctx, u, amt) {
    if (amt >= u.hp && u.hp > 0 && !writsStanding(ctx).some((w) => w.uid !== u.uid)) {
      const r = regentOf(ctx);
      if (r && r.ai.ward) breakWard(ctx, r);
    }
    return amt;
  },
  reflect: answerHook,
};

export const EP4_SCRIPTS = { decree, barrister, counsel, paper_regent: paperRegent, writ };

// =============================================================================== Auto (the competent policy)
// Asked before the core policy (POLICY_EXT). Careful play only: the reckless policy (ignoreTelegraphs) and the naive one never
// get here with anything to do. Quiet outside Episode 4: it returns null at once unless a living foe carries a Decree counter
// (heatQuench 'fire') or has Strike from the Roll pending, so Episodes 1 to 3 play exactly as before.
//   1. Strike from the Roll announced: the hero Answers it.
//   2. A decree announced, or a foe at 2 Seals or more: void it. Mira's fire first (she leaves it to herself when she acts
//      before the foe), then the hero's Answer on a boss or an announced decree, then Lamp Oil.
//   3. Against the Paper Regent the hero keeps 10 MP for Answer: an MP-costing action that would spend it becomes an Attack.
export const ANSWER_MP_RESERVE = 10;
let inner = false;

function entry(cmds, group, id) {
  const c = cmds.find((x) => x.id === group);
  const e = c && c.list ? c.list.find((x) => x.skill === id || x.item === id) : null;
  return e && e.enabled ? e : null;
}
function fireSkill(b, me, cmds, foe) {
  let best = null;
  for (const g of ['magic', 'tech']) {
    const c = cmds.find((x) => x.id === g);
    if (!c || !c.list) continue;
    for (const e of c.list) {
      const sk = SKILLS[e.skill];
      if (!e.enabled || sk.target !== 'enemy' || !sk.types.includes('fire') || !(sk.formula === 'mag' || sk.formula === 'phys')) continue;
      const est = b.estimate(me, { type: 'skill', skill: e.skill, target: foe.uid }).find((x) => x.target === foe.uid);
      if (!est || est.redirect) continue;
      const score = est.avg - (sk.mp || 0);
      if (!best || score > best.score) best = { score, action: { type: 'skill', skill: e.skill, target: foe.uid } };
    }
  }
  return best ? best.action : null;
}
function miraFirst(b, foe) {
  const m = b.unit('mira');
  if (!m || !m.alive || (m.statuses && (m.statuses.silence || m.statuses.kept)) || m.mp < 4) return false;
  const order = b.timeline(14).map((r) => r.uid);
  const mi = order.indexOf('mira'), fi = order.indexOf(foe.uid);
  return mi >= 0 && fi >= 0 && mi < fi;
}
function voidAction(b, me, cmds, foe, pending) {
  const fire = fireSkill(b, me, cmds, foe);
  if (fire) return fire;
  if (me.id !== 'mira' && miraFirst(b, foe)) return null;   // Mira's Ember is coming before the foe acts
  if (me.id === 'hero' && (pending || foe.boss) && entry(cmds, 'tech', 'answer')) return { type: 'skill', skill: 'answer', target: foe.uid };
  if (entry(cmds, 'item', 'lamp_oil') && (b.state.inventory.lamp_oil || 0) > 0) return { type: 'item', item: 'lamp_oil', target: foe.uid };
  return null;
}
function costOf(me, a) {
  if (!a || (a.type !== 'skill' && a.type !== 'combo')) return 0;
  const sk = SKILLS[a.skill];
  if (!sk) return 0;
  return a.type === 'combo' ? (sk.cost && sk.cost[me.id]) || 0 : sk.mp || 0;
}

export function ep4Policy(b, me, opts = {}) {
  if (inner || opts.ignoreTelegraphs) return null;
  const foes = b.living('enemy');
  const decreeFoes = foes.filter((f) => f.heatMax && f.heatQuench === 'fire');
  const strikes = foes.filter((f) => f.charging && SKILLS[f.charging.skill] && SKILLS[f.charging.skill].answerable);
  const regent = foes.find((f) => f.id === 'paper_regent');
  if (!decreeFoes.length && !strikes.length && !regent) return null;
  const cmds = b.commands(me);
  // 1. the hero answers a Strike from the Roll
  if (me.id === 'hero' && strikes.length && entry(cmds, 'tech', 'answer')) return { type: 'skill', skill: 'answer', target: strikes[0].uid };
  // 2. void a decree: an announced one first, then the foe with the most Seals (2 or more)
  const pending = decreeFoes.filter((f) => f.charging && f.charging.skill === f.heatFlare);
  const ripe = decreeFoes.filter((f) => !pending.includes(f) && f.heat >= 2).sort((x, y) => y.heat - x.heat || (y.boss ? 1 : 0) - (x.boss ? 1 : 0));
  for (const f of [...pending, ...ripe]) {
    const a = voidAction(b, me, cmds, f, pending.includes(f));
    if (a) return a;
  }
  // 3. against the Regent the hero keeps the MP for Answer
  if (regent && me.id === 'hero') {
    inner = true;
    let a;
    try { a = competentPolicy(b, me, opts); } finally { inner = false; }
    const cost = costOf(me, a);
    if (cost && me.mp - cost < ANSWER_MP_RESERVE) {
      if (me.mp < ANSWER_MP_RESERVE && (regent.ai.phase ?? 0) >= 1) {
        for (const id of ['hi_ether', 'ether']) if (entry(cmds, 'item', id)) return { type: 'item', item: id, target: me.uid };
      }
      return { type: 'attack', target: a.target && b.unit(a.target) && b.unit(a.target).side === 'enemy' ? a.target : regent.uid };
    }
    return a;
  }
  return null;
}

let done = false;
/** Add the scripts (never replacing one) and the Auto rule. Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, s] of Object.entries(EP4_SCRIPTS)) if (!SCRIPTS[id]) SCRIPTS[id] = s;
  if (!POLICY_EXT.includes(ep4Policy)) POLICY_EXT.push(ep4Policy);
  done = true;
}
export default register;
