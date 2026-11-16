// Episode 8 ("The Last Word") battle AI (E8-battle; docs/EPISODE8_PLAN.md 6.3 to 6.5). Pure: no DOM, canvas or audio; randomness only
// through ctx.R. The pack's register() adds four scripts to ai.js SCRIPTS, one rule to POLICY_EXT and wraps PARTY_POLICIES.naive.
//
// Scripts (by enemy `ai` id):
//   erasing         basic (moves, the charge rule) and the Erasure bridge: an erasing move's `{ keep: 'erasure', erasure: 'rub' }` reaches
//                   erasure.js rub() with the members it hit. Every ordinary Episode 8 foe, and the Sentry's Struck-Out Pages.
//   unnamed_sentry  Strike Out and Cancel. Unwrite: at the end of a turn with nothing pinned it is pinned on the non-hero member with the
//                   most rubbed-out commands (ties: lowest HP share), Mira included, and lands on the Sentry's next turn, which
//                   erasure.js holdForMira keeps after Mira's. Read Aloud on the target breaks it (the Sentry a full turn back, and no
//                   new pin on its next turn); a Break cancels it. Never the hero ("It cannot find that name to unwrite."). At 50% HP,
//                   once: its faceplate cracks and two Struck-Out Pages (2 shields each, no reward) join.
//   eraser          1 The Closed Book (100% to 70%, HP locked at 70%): armored (DEF x1.4), Rub Out, Margin Sweep, Unwrite. 2 The Rejected
//                   Truths (from 70%): Grief and Change; while either stands the Erasure Ward holds (12% damage taken, shields locked,
//                   HP stops at 32%). Both gone: 3 The Keeper Remembers: armor down, weak fire, the party +30 Fury, the Eraser Broken a
//                   turn; Margin Sweep at most every 3rd turn; HP locked at 26%. 4 The Last Silence (below 26%): Haste, the Last
//                   Silence every 3rd Eraser turn (a charge; Answer breaks it: the Eraser a full turn back and Broken; a Break cancels
//                   it). One telegraph at a time: nothing is pinned while the Silence charges, the Silence never starts while a pin is
//                   up, and no new pin or Silence comes on the Eraser's turn after one breaks. Unwrite in every phase between.
//   rejected_truth  Grief: Rub Out, then Weep Ink (the Eraser +5% of its HP, never above the 70% lock). Change: Turn the Page; Stand In
//                   (rules.js cover: single-target hits aimed at the Eraser strike Change while it stands and is not Broken).
//
// Every `phase` event carries `sprite` (the Eraser's four looks: eraser, eraser_truths, eraser_keeper, eraser_silence). Messages of kind
// 'ward', 'ward_break', 'blessing', 'stand_in', 'weep', 'faceplate', 'no_unwrite', 'silence', 'silence_hint', 'silence_broken'.

import { SCRIPTS, POLICY_EXT, PARTY_POLICIES, competentPolicy } from '../../battle/ai.js';
import { ENEMIES } from '../enemies.js';
import { SKILLS } from '../skills.js';
import { erasureSpecial, pin, land, onSourceBroken, erasureState, commandsOf, isErasing, holdCharges, HERO, MIRA, READ, INK } from './erasure.js';

export const FIRST_PIN_TURN = 1;       // the first Unwrite comes at the end of the boss's first turn
export const WARD_ADDS = ['truth_grief', 'truth_change'];
export const PIN_BOSSES = ['unnamed_sentry', 'eraser'];
export const SILENCE = 'last_silence';
export const ANSWER = 'answer';
export const SILENCE_PUSH = 1.0;       // an answered Last Silence: the Eraser a full turn back (and Broken)
const FURY_MAX = 100;
const ARMOR = 'armor';

const basic = SCRIPTS.basic;
const foesOf = (ctx) => ctx.living('party').filter((p) => !ctx.kept(p));
const wardStanding = (ctx) => ctx.living('enemy').filter((e) => WARD_ADDS.includes(e.id));
const eraserOf = (ctx) => ctx.living('enemy').find((e) => e.id === 'eraser') || null;
const heroIn = (ctx) => ctx.living('party').find((p) => p.id === HERO) || null;

/** The member an Unwrite goes on: the non-hero member with the most rubbed-out commands, ties the lowest HP share; never Unwritten. */
export function pinTarget(ctx) {
  const S = erasureState(ctx.state);
  const pool = foesOf(ctx).filter((p) => p.id !== HERO && !(S && S.unwritten[p.uid]));
  if (!pool.length) return null;
  const n = (u) => ((S && S.rub[u.uid]) || []).length;
  return pool.slice().sort((a, b) => n(b) - n(a) || a.hp / a.maxHp - b.hp / b.maxHp || a.tie - b.tie)[0];
}
/** End of a boss turn: pin an Unwrite when nothing is pinned, nothing is charging, the gap has passed and no break just happened. */
function tryPin(ctx, u) {
  const S = erasureState(ctx.state);
  if (!S || S.pin || !u.alive || u.broken || u.charging || u.ai.turns < (u.ai.pinAt ?? FIRST_PIN_TURN)) return false;
  if (S.rest[u.uid]) { delete S.rest[u.uid]; return false; }
  const t = pinTarget(ctx);
  if (!t) {
    if (!u.ai.heroNoted && heroIn(ctx)) {
      u.ai.heroNoted = true;
      ctx.emit({ type: 'message', text: 'It cannot find that name to unwrite.', kind: 'no_unwrite', target: u.uid });
    }
    return false;
  }
  if (!pin(ctx, u, t, 'unwrite')) return false;
  u.ai.pins = (u.ai.pins || 0) + 1;
  u.ai.pinAt = u.ai.turns + 2 + ((ENEMIES[u.id] || {}).pinGap ?? 0);   // the landing turn, then pinGap clear turns
  return true;
}
/** Its turn with a pin up: the Unwrite lands (rules.js enemyAct runs a `special` plan through special() with { summon: true }). */
function pinnedPlan(ctx, u) {
  const S = erasureState(ctx.state);
  return S && S.pin && S.pin.source === u.uid ? { skill: S.pin.skill, special: true } : null;
}
function partyFury(ctx, amount, reason) {
  for (const m of ctx.living('party')) {
    const before = m.fury || 0;
    m.fury = Math.min(FURY_MAX, before + amount);
    if (m.fury !== before) ctx.emit({ type: 'fury_gain', target: m.uid, amount: m.fury - before, fury: m.fury, reason });
    if (before < FURY_MAX && m.fury >= FURY_MAX) ctx.emit({ type: 'fury_ready', target: m.uid });
  }
}
function special(ctx, u, sk, e, targets) {
  if (e && e.summon) { land(ctx, u); return sk.rank || 80; }
  return erasureSpecial(ctx, u, sk, e, targets);
}
/** A boss's single-target move goes to an Unwritten member (the gap in the page) `unwrittenFocus` of the time. */
function focusUnwritten(ctx, u, plan) {
  const S = erasureState(ctx.state);
  if (!S || !plan || !plan.target || plan.special) return plan;
  const sk = SKILLS[plan.skill];
  if (!sk || sk.target !== 'enemy') return plan;
  const gap = foesOf(ctx).filter((p) => S.unwritten[p.uid]);
  if (gap.length && ctx.R() < ((ENEMIES[u.id] || {}).unwrittenFocus ?? 0)) return { ...plan, target: gap[0].uid };
  return plan;
}
function pinDeath(ctx, dead) {
  if (dead && dead.side === 'enemy' && PIN_BOSSES.includes(dead.id)) onSourceBroken(ctx, dead);
}

// --- ordinary foes ---------------------------------------------------------------------------------------------------
const erasing = { ...basic, special };

// --- the Unnamed Sentry ----------------------------------------------------------------------------------------------
const sentry = {
  start(ctx, u) { u.ai.pagesCalled = false; u.ai.pinAt = FIRST_PIN_TURN; u.ai.pins = 0; },
  decide(ctx, u, d) { return pinnedPlan(ctx, u) || focusUnwritten(ctx, u, basic.decide(ctx, u, d)); },
  afterTurn(ctx, u) { if (u.alive) tryPin(ctx, u); },
  onBreak(ctx, u) { onSourceBroken(ctx, u); },
  onDamaged(ctx, u) {
    const d = ENEMIES[u.id];
    if (u.ai.pagesCalled || u.hp > Math.floor(u.maxHp * (d.pagesAt || 0.5))) return;
    u.ai.pagesCalled = true;
    ctx.emit({ type: 'message', text: 'The Sentry\'s faceplate cracks. Two struck-out pages tear loose.', kind: 'faceplate', target: u.uid });
    for (let i = 0; i < 2; i++) {
      const a = ctx.summon('struck_page', { by: u, summoned: true, firstTurn: 0.5 + 0.3 * i, rewardScale: 0 });
      if (a && d.pageShields) { a.shields = d.pageShields; a.maxShields = d.pageShields; }
    }
  },
  onDeath: pinDeath,
  special,
};

// --- the Eraser, Grief and Change ------------------------------------------------------------------------------------
function setArmor(ctx, u, on) {
  const d = ENEMIES[u.id];
  const had = u.mods.some((m) => m.source === ARMOR);
  if (on === had) return;
  if (on) u.mods.push({ stat: 'def', mult: d.armor || 1.4, turns: 999, source: ARMOR });
  else {
    u.mods = u.mods.filter((m) => m.source !== ARMOR);
    ctx.emit({ type: 'stat_mod', target: u.uid, stat: 'def', mult: 1, turns: 0, reason: 'armor' });
  }
}
/** Change stands in front of the Eraser (rules.js cover; startTurn clears a guard's cover, so it is set again after each turn). */
function standIn(ctx, change, announce) {
  const s = eraserOf(ctx);
  if (!s || !change || !change.alive) return;
  if (change.cover && change.cover !== s.uid) { const o = ctx.U(change.cover); if (o) o.coveredBy = null; }
  change.cover = s.uid;
  s.coveredBy = change.uid;
  if (announce) ctx.emit({ type: 'message', text: 'Change stands in the way.', kind: 'stand_in', target: change.uid });
}
function planSilence(ctx, u, d) {
  ctx.planCharge(u, SILENCE, null);
  holdCharges(ctx);   // never before the hero's next turn (erasure.js keeps holding it until the hero has acted)
  u.ai.silences = (u.ai.silences || 0) + 1;
  if ((u.ai.phase ?? 0) === 3) u.ai.breaths = (u.ai.breaths || 0) + 1;
  u.ai.silenceAt = u.ai.turns + (d.silenceEvery || 3);
  ctx.emit({ type: 'message', text: 'The page goes quiet.', kind: 'silence', target: u.uid, sfx: 'silence_gather' });
  if (heroCanCtx(ctx)) ctx.emit({ type: 'message', text: `${heroIn(ctx).name} can answer it.`, kind: 'silence_hint', target: u.uid });
}
function enterEraserPhase(ctx, u, idx) {
  const d = ENEMIES[u.id];
  const p = d.phases[idx];
  u.ai.phase = idx;
  ctx.cancelCharge(u, 'phase');
  // the phase's look (AGENTS.md trap: drop `sprite` and the Eraser never changes look)
  ctx.emit({ type: 'phase', actor: u.uid, phase: idx + 1, id: p.id, name: p.name, text: p.text, sprite: p.sprite || null });
  ctx.setWeak(u, p.weak, p.resist, idx < 2 ? `${u.id}:armored` : `${u.id}:${p.id}`);
  if (idx > 0) ctx.setShields(u, p.shields);
  setArmor(ctx, u, idx < 2);
  if (p.summon) {
    const adds = p.summon.map((id, i) => ctx.summon(id, { by: u, summoned: true, firstTurn: 0.4 + 0.3 * i, rewardScale: 0 }));
    u.ai.ward = true;
    ctx.emit({ type: 'message', text: 'The Erasure Ward closes. While Grief and Change stand, little reaches him.', kind: 'ward', target: u.uid });
    const change = adds.find((a) => a && a.id === 'truth_change');
    if (change) standIn(ctx, change, true);
  }
  if (p.haste) ctx.addStatus(u, 'haste', 99, u);
  if (p.magMult) ctx.addMod(u, 'mag', p.magMult, 999, `${u.id}:${p.id}`);
  if (idx === 2) u.ai.sweepAt = u.ai.turns + (d.sweepEvery || 3);
  if (idx === 3) {
    // the first Last Silence gathers as the phase opens (unless an Unwrite is up: one telegraph at a time), the next every
    // `silenceEvery` Eraser turns after it
    u.ai.silenceAt = u.ai.turns + 1;
    const S = erasureState(ctx.state);
    if (!(S && S.pin) && !u.broken) planSilence(ctx, u, d);
  }
}
/** Grief and Change are both gone: the ward breaks, the Keeper Remembers: Broken a turn, the party +30 Fury. */
export function breakWard(ctx, u) {
  if (!u || !u.alive || !u.ai.ward) return;
  u.ai.ward = false;
  u.coveredBy = null;
  ctx.emit({ type: 'message', text: 'The Erasure Ward breaks!', kind: 'ward_break', target: u.uid });
  enterEraserPhase(ctx, u, 2);
  ctx.breakUnit(u);
  const n = (ENEMIES[u.id] || {}).keeperFury ?? 30;
  partyFury(ctx, n, 'ward_break');
  ctx.emit({ type: 'message', text: `The party remembers with him. Fury rises! (+${n})`, kind: 'blessing' });
}
/** Can the hero Answer on the hero's own turn (alive, knows it, not Silenced, the MP there)? */
function heroCanCtx(ctx) {
  const h = heroIn(ctx);
  return !!(h && (h.skills || []).includes(ANSWER) && !(h.statuses && h.statuses.silence) && h.mp >= ((SKILLS[ANSWER] && SKILLS[ANSWER].mp) || 10));
}
/** The hero answers the Last Silence (the Eraser's reflect hook sees Answer's part before the damage). */
function answerSilence(ctx, tgt, part) {
  if (!part || part.id !== ANSWER || !tgt || !tgt.alive || !tgt.charging || tgt.charging.skill !== SILENCE) return null;
  const S = erasureState(ctx.state);
  if (S) S.stats.answered = (S.stats.answered || 0) + 1;
  ctx.cancelCharge(tgt, 'answered');   // never 'answer': Episode 4's planner wrap keys on that reason (skills.js header)
  const h = heroIn(ctx);
  ctx.emit({ type: 'silence_broken', source: tgt.uid, reason: 'answer', sfx: 'unwrite_break' });
  ctx.emit({ type: 'message', text: `${h ? h.name : 'The hero'} answers to the name. The silence breaks.`, kind: 'silence_broken', target: tgt.uid });
  if (S) S.rest[tgt.uid] = 1;
  ctx.delayUnit(tgt, SILENCE_PUSH, 'answer');
  ctx.breakUnit(tgt);
  return null;
}
const eraser = {
  start(ctx, u) { u.ai.phase = 0; u.ai.ward = false; u.ai.pinAt = FIRST_PIN_TURN; u.ai.pins = 0; u.ai.silences = 0; enterEraserPhase(ctx, u, 0); },
  decide(ctx, u, d) {
    const pinned = pinnedPlan(ctx, u);
    if (pinned) return pinned;
    const ph = d.phases[u.ai.phase ?? 0];
    let moves = (ph && ph.moves) || d.moves;
    if ((u.ai.phase ?? 0) === 2 && u.ai.turns < (u.ai.sweepAt ?? 0)) moves = moves.filter((m) => m.skill !== 'margin_sweep');
    const plan = focusUnwritten(ctx, u, basic.decide(ctx, u, { ...d, moves, opener: null }));
    if (plan && plan.skill === 'margin_sweep' && (u.ai.phase ?? 0) === 2) u.ai.sweepAt = u.ai.turns + (d.sweepEvery || 3);
    return plan;
  },
  afterTurn(ctx, u, d) {
    if (!u.alive) return;
    const S = erasureState(ctx.state);
    if ((u.ai.phase ?? 0) === 3 && !u.charging && !u.broken && !(S && S.pin) && u.ai.turns >= (u.ai.silenceAt ?? 99)) {
      if (S && S.rest[u.uid]) { delete S.rest[u.uid]; u.ai.silenceAt = u.ai.turns + 1; return; }
      planSilence(ctx, u, d);
      return;
    }
    tryPin(ctx, u);
  },
  onChargeEnd(ctx, u, reason, skillId) {
    if (skillId !== SILENCE) return;
    const S = erasureState(ctx.state);
    if (reason === 'break') {
      if (S) { S.stats.silenceBroke = (S.stats.silenceBroke || 0) + 1; S.rest[u.uid] = 1; }
      ctx.emit({ type: 'silence_broken', source: u.uid, reason: 'break' });
    } else if (!reason && S) S.stats.silenceLanded = (S.stats.silenceLanded || 0) + 1;
  },
  clampDamage(ctx, u, amt) {
    const d = ENEMIES[u.id];
    const ph = u.ai.phase ?? 0;
    let floorHp = null;
    if (ph === 0) floorHp = Math.floor(u.maxHp * d.phases[1].at);
    else if (ph === 1 && u.ai.ward) floorHp = Math.floor(u.maxHp * d.phases[1].floor);
    else if (ph === 2) floorHp = Math.floor(u.maxHp * d.phases[3].at);
    // the last phase: no name falls in the silence until it has drawn `finalBreaths` Last Silences (HP stops at `breathFloor`)
    else if (ph === 3 && (u.ai.breaths || 0) < (d.finalBreaths || 0)) floorHp = Math.max(1, Math.floor(u.maxHp * (d.breathFloor || 0)));
    if (floorHp === null) return amt;
    return u.hp - amt < floorHp ? Math.max(0, u.hp - floorHp) : amt;
  },
  onDamaged(ctx, u) {
    const d = ENEMIES[u.id];
    const ph = u.ai.phase ?? 0;
    if (ph === 0 && u.hp <= Math.floor(u.maxHp * d.phases[1].at)) enterEraserPhase(ctx, u, 1);
    else if (ph === 2 && u.hp <= Math.floor(u.maxHp * d.phases[3].at)) enterEraserPhase(ctx, u, 3);
    else if (ph === 3 && (u.ai.breaths || 0) < (d.finalBreaths || 0) && u.hp <= Math.max(1, Math.floor(u.maxHp * (d.breathFloor || 0)))) {
      // at the floor, no name survives the quiet: the Eraser stands up out of a Break and draws the next breath at once
      const S = erasureState(ctx.state);
      if (u.charging || (S && S.pin)) return;
      if (u.broken) {
        u.broken = false;
        u.shields = u.maxShields;
        ctx.emit({ type: 'shield_restore', target: u.uid, shields: u.shields });
      }
      if (S) delete S.rest[u.uid];
      ctx.emit({ type: 'message', text: 'The Eraser will not fall in the quiet.', kind: 'silence', target: u.uid });
      planSilence(ctx, u, d);
    }
  },
  damageTakenMult(ctx, u) { return u.ai.ward ? (ENEMIES[u.id].ward ?? 0.12) : 1; },
  shieldLocked(ctx, u) { return !!u.ai.ward; },
  onBreak(ctx, u) { onSourceBroken(ctx, u); },   // a Break cancels the Unwrite (and the Silence: the charge rule) and ends Unwritten
  // the last phase: back on its feet, the Eraser draws the next breath at once (`silenceOnRecover`), one telegraph at a time
  onRecover(ctx, u) {
    const d = ENEMIES[u.id];
    const S = erasureState(ctx.state);
    if ((u.ai.phase ?? 0) === 3 && d.silenceOnRecover && u.alive && !u.charging && !(S && S.pin)) { if (S) delete S.rest[u.uid]; planSilence(ctx, u, d); }
  },
  onDeath(ctx, dead) {
    pinDeath(ctx, dead);
    if (!dead || !WARD_ADDS.includes(dead.id)) return;
    const s = eraserOf(ctx);
    if (s && s.ai.ward && !wardStanding(ctx).length) breakWard(ctx, s);
  },
  special,
  reflect(ctx, tgt, part) { return answerSilence(ctx, tgt, part); },
};
const truth = {
  start(ctx, u) { if (u.id === 'truth_change') standIn(ctx, u, false); },
  decide: basic.decide,
  afterTurn(ctx, u, d) {
    if (!u.alive) return;
    if (u.id === 'truth_change') { standIn(ctx, u, false); return; }
    const s = eraserOf(ctx);
    if (!s) return;
    const cap = Math.floor(s.maxHp * ENEMIES.eraser.phases[1].at);
    const amt = Math.min(Math.round(s.maxHp * (d.weepPct || 0.05)), cap - s.hp);
    if (amt > 0) {
      ctx.emit({ type: 'message', text: 'Grief weeps ink into the Eraser.', kind: 'weep', target: s.uid });
      ctx.heal(s, amt, u, { skill: 'weep_ink' });
    }
  },
  special,
};

export const EP8_SCRIPTS = { erasing, unnamed_sentry: sentry, eraser, rejected_truth: truth };

// =============================================================================== Auto (the competent policy)
// Asked before the core policy (POLICY_EXT). Quiet outside Episode 8: it returns null at once unless the battle has Erasure. Every
// policy reads commandsOf() (rules.js validate does not check the Attack row, so the policies keep to the legal rows themselves).
// Careful play only (plan 6.3):
//   1. An Unwrite is pinned and Mira acts before it lands (erasure.js holdForMira sees to that): Mira Reads Aloud its target.
//   2. The Last Silence is charging and the hero acts before it lands: the hero Answers the Eraser.
//   3. An ally is Unwritten: Mira Reads them back on her next turn, unless 1 applies.
//   4. An erasing foe acts before the member's next turn: they keep the command they most need next unused (Mira: Magic for heals and
//      Read Aloud; Bram: Tech for Guard), an Attack instead, else Defend.
//   5. Two or more members with a rub-out and Fresh Ink in the bag: one Ink.
//   6. Against the Sentry and the Eraser, Mira keeps 12 MP: an MP action that would spend it becomes an Attack; under 12 an Ether.
// The reckless policy (ignoreTelegraphs) and attack-only never Read Aloud, Answer, Defend for Erasure or use Ink: they only keep to the
// legal rows (attack-only: Attack, or Defend when Attack is rubbed out).
export let ERASURE_POLICY = { read: true, answer: true, unwritten: true, self: true, variety: true, ink: true, reserve: true, rain: true };
let inner = false;

const readCost = () => (SKILLS[READ] ? SKILLS[READ].mp : 12);
function entry(cmds, group, id) {
  const c = cmds.find((x) => x.id === group);
  const e = c && c.list ? c.list.find((x) => x.skill === id || x.item === id) : null;
  return e && e.enabled ? e : null;
}
const rowOn = (cmds, id) => { const c = cmds.find((x) => x.id === id); return !!(c && c.enabled); };
/** The command group an action uses ('attack' | 'tech' | 'magic' | 'item' | 'defend' | 'fury' | 'combo' | 'swap' | 'flee'). */
export function groupOf(a) {
  if (!a) return null;
  if (a.type === 'skill' || a.type === 'tech' || a.type === 'magic' || a.type === 'fury') {
    const sk = SKILLS[a.skill];
    return sk ? (sk.kind === 'magic' ? 'magic' : sk.kind === 'fury' ? 'fury' : 'tech') : null;
  }
  return a.type;
}
/** Is `a` legal for `me` under Erasure (its row and its entry enabled)? */
export function legal(b, me, a, cmds = commandsOf(b, me)) {
  if (!a) return false;
  const g = groupOf(a);
  if (g === 'attack' || g === 'defend' || g === 'swap' || g === 'flee') return rowOn(cmds, g) || g === 'defend';
  if (g === 'item') return !!entry(cmds, 'item', a.item);
  if (g === 'combo') return !!entry(cmds, 'combo', a.skill);
  return !!entry(cmds, g, a.skill);
}
/** A legal stand-in for an action Erasure forbids: Attack, else the strongest enabled damaging tech or spell, else Defend. */
export function fallback(b, me, a, cmds = commandsOf(b, me)) {
  const foes = b.living('enemy');
  const tgt = a && a.target && b.unit(a.target) && b.unit(a.target).side === 'enemy' && b.unit(a.target).alive ? a.target : foes[0] && foes[0].uid;
  if (rowOn(cmds, 'attack') && tgt) return { type: 'attack', target: tgt };
  for (const g of ['tech', 'magic']) {
    const c = cmds.find((x) => x.id === g);
    const picks = ((c && c.list) || []).filter((e) => e.enabled && SKILLS[e.skill] && SKILLS[e.skill].target === 'enemy'
      && (SKILLS[e.skill].formula === 'phys' || SKILLS[e.skill].formula === 'mag'));
    picks.sort((x, y) => SKILLS[y.skill].power - SKILLS[x.skill].power);
    if (picks.length && tgt) return { type: 'skill', skill: picks[0].skill, target: tgt };
  }
  return { type: 'defend' };
}
function proxy(b) {
  const pb = Object.create(b);
  pb.commands = (u) => commandsOf(b, u);
  return pb;
}
function core(b, me, opts) {
  inner = true;
  try { return competentPolicy(proxy(b), me, opts); } finally { inner = false; }
}
function costOf(me, a) {
  if (!a || (a.type !== 'skill' && a.type !== 'combo')) return 0;
  const sk = SKILLS[a.skill];
  if (!sk) return 0;
  return a.type === 'combo' ? (sk.cost && sk.cost[me.id]) || 0 : sk.mp || 0;
}
/** Does an erasing foe act before `me` acts again (after this action)? */
function erasingBefore(b, me, a) {
  const p = b.previewTimeline(me, a && a.type ? a : { type: 'defend' });
  const order = p.order.map((r) => r.uid);
  const mine = order.indexOf(me.uid);
  return order.slice(0, mine < 0 ? order.length : mine).some((uid) => { const u = b.unit(uid); return u && u.alive && isErasing(u) && !u.broken; });
}
/** Is the action one the member cannot do without (a heal, a revive, Read Aloud, a Guard, an answer to a telegraph)? */
function needed(b, me, a) {
  const sk = a && a.skill && SKILLS[a.skill];
  if (!sk) return a && a.type === 'item';
  if (sk.id === READ || sk.formula === 'heal' || sk.target === 'ko_ally' || sk.target === 'ally' || sk.target === 'allies' || sk.target === 'self') return true;
  const t = a.target && b.unit(a.target);
  return !!(t && t.side === 'enemy' && (t.charging || t.boss && t.shields <= 2));
}
const KEY = { mira: 'magic', bram: 'tech' };

/** For the scene's line under a pin ("Mira can read him back."): Mira can Read Aloud, and her turn comes before it lands. */
export function miraReads(b) {
  const S = b.state.erasure;
  if (!S || !S.pin) return false;
  const m = b.living('party').find((u) => u.id === MIRA);
  if (!m || S.unwritten[m.uid] || !entry(commandsOf(b, m), 'magic', READ)) return false;
  const order = b.timeline(14).map((r) => r.uid);
  const mi = order.indexOf(m.uid), si = order.indexOf(S.pin.source);
  return mi >= 0 && (si < 0 || mi < si);
}
/** For the scene's line under the Last Silence ("{hero} can answer it."): the hero can Answer before it lands. */
export function heroAnswers(b) {
  const f = b.living('enemy').find((u) => u.charging && u.charging.skill === SILENCE);
  const h = b.living('party').find((u) => u.id === HERO);
  if (!f || !h || !entry(commandsOf(b, h), 'tech', ANSWER)) return false;
  const order = b.timeline(14).map((r) => r.uid);
  const hi = order.indexOf(h.uid), si = order.indexOf(f.uid);
  return hi >= 0 && (si < 0 || hi < si);
}

export function ep8Policy(b, me, opts = {}) {
  if (inner) return null;
  const S = b.state.erasure;
  if (!S) return null;
  const cmds = commandsOf(b, me);
  if (opts.ignoreTelegraphs) {
    const a = core(b, me, opts);
    return legal(b, me, a, cmds) ? a : fallback(b, me, a, cmds);
  }
  const P = ERASURE_POLICY;
  const inv = b.state.inventory;
  const foes = b.living('enemy');
  const party = b.living('party');
  const readOk = me.id === MIRA && entry(cmds, 'magic', READ);
  const p = S.pin;
  // 1. an Unwrite pinned: Mira reads its target back
  if (P.read && p && readOk && b.unit(p.target) && b.unit(p.target).alive) return { type: 'skill', skill: READ, target: p.target };
  // 2. the Last Silence: the hero answers it
  const quiet = foes.find((f) => f.charging && f.charging.skill === SILENCE);
  if (P.answer && quiet && me.id === HERO && entry(cmds, 'tech', ANSWER)) return { type: 'skill', skill: ANSWER, target: quiet.uid };
  // 3. an ally Unwritten: Mira reads them back
  const unw = party.find((u) => S.unwritten[u.uid] && u.uid !== me.uid);
  if (P.unwritten && unw && readOk) return { type: 'skill', skill: READ, target: unw.uid };
  if (S.unwritten[me.uid]) {
    if (me.id === MIRA && readOk) return { type: 'skill', skill: READ, target: me.uid };
    return { type: 'defend' };
  }
  // 3b. Mira's own Magic rubbed out with a heal coming: she reads her own lines back (the rubbed row still opens on Read Aloud)
  const magicOut = me.id === MIRA && (S.rub[me.uid] || []).some((r) => r.cmd === 'magic');
  if (P.self && magicOut && readOk && party.some((u) => u.hp / u.maxHp < 0.5)) return { type: 'skill', skill: READ, target: me.uid };
  // 5. two members with a rub-out: one Fresh Ink
  const up = foes.some((f) => isErasing(f));
  const rubbed = party.filter((u) => (S.rub[u.uid] || []).length).length;
  const calm = party.every((u) => u.hp / u.maxHp >= 0.5);   // a heal comes first
  if (P.ink && up && calm && rubbed >= 2 && (inv[INK] || 0) > 0 && entry(cmds, 'item', INK)) return { type: 'item', item: INK, target: me.uid };
  // 7. against the Sentry and the Eraser a sweep can drop two members at once: Mira's Mending Rain at 65%, not the core's 55%
  const pinBossUp = foes.some((f) => PIN_BOSSES.includes(f.id));
  if (P.rain && pinBossUp && me.id === MIRA && party.filter((u) => u.hp / u.maxHp < 0.65).length >= 2 && entry(cmds, 'magic', 'mending_rain')
    && me.mp - ((SKILLS.mending_rain && SKILLS.mending_rain.mp) || 10) >= readCost()) {
    return { type: 'skill', skill: 'mending_rain' };
  }
  let a = core(b, me, opts);
  // 6. Mira keeps the MP for Read Aloud against the Sentry and the Eraser
  const pinBoss = foes.some((f) => PIN_BOSSES.includes(f.id));
  if (P.reserve && pinBoss && me.id === MIRA && me.skills.includes(READ)) {
    if (me.mp < readCost()) for (const id of ['hi_ether', 'ether']) if (entry(cmds, 'item', id)) return { type: 'item', item: id, target: me.uid };
    const cost = costOf(me, a);
    if (cost && me.mp - cost < readCost() && a.skill !== READ && !needed(b, me, a)) a = fallback(b, me, { type: 'attack', target: a.target }, cmds);
  }
  // 1b. nobody spends Mira's turn on a combo while she owes a pin its answer; nor the hero's while the Silence charges
  if (a && a.type === 'combo' && SKILLS[a.skill]) {
    const mem = SKILLS[a.skill].members || [];
    const m = party.find((u) => u.id === MIRA);
    const owesRead = p && m && me.id !== MIRA && mem.includes(MIRA) && entry(commandsOf(b, m), 'magic', READ);
    const owesAnswer = quiet && me.id !== HERO && mem.includes(HERO);
    if (owesRead || owesAnswer) a = fallback(b, me, { type: 'attack', target: a.target }, cmds);
  }
  // 4. an erasing foe acts before my next turn: keep the command I will need next unused (Mira's Magic when a heal is coming,
  // Bram's Tech when Mira will want a Guard)
  const key = KEY[me.id];
  const soon = me.id === MIRA ? party.some((u) => u.hp / u.maxHp < 0.6) : me.id === 'bram' ? party.some((u) => u.id === MIRA && u.hp / u.maxHp < 0.6) : false;
  if (P.variety && key && up && soon && groupOf(a) === key && !needed(b, me, a) && erasingBefore(b, me, a)) {
    const alt = fallback(b, me, a, cmds);
    if (groupOf(alt) !== key) a = alt.type === 'defend' ? a : alt;
  }
  return legal(b, me, a, cmds) ? a : fallback(b, me, a, cmds);
}

/** Attack-only under Erasure: Attack, or Defend when Attack is rubbed out (or the member is Unwritten). */
function naiveErasure(prev) {
  const f = function (b, me) {
    if (!b.state.erasure) return prev(b, me);
    const foes = b.living('enemy');
    return rowOn(commandsOf(b, me), 'attack') && foes[0] ? { type: 'attack', target: foes[0].uid } : { type: 'defend' };
  };
  f.ep8Erasure = true;
  return f;
}

let done = false;
/** Add the scripts (never replacing one), the Auto rule and the attack-only wrap. Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, s] of Object.entries(EP8_SCRIPTS)) if (!SCRIPTS[id]) SCRIPTS[id] = s;
  if (!POLICY_EXT.includes(ep8Policy)) POLICY_EXT.push(ep8Policy);
  if (PARTY_POLICIES.naive && !PARTY_POLICIES.naive.ep8Erasure) PARTY_POLICIES.naive = naiveErasure(PARTY_POLICIES.naive);
  done = true;
}
export default register;
