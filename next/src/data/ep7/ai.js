// Episode 7 ("The Vanishing World") battle AI (E7-battle; docs/EPISODE7_PLAN.md 6.3 to 6.5). Pure: no DOM, canvas or audio;
// randomness only through ctx.R. The pack's register() adds four scripts to ai.js SCRIPTS and one rule to POLICY_EXT.
//
// Scripts (by enemy `ai` id):
//   cold           basic (moves, the charge rule) and the Rime bridge: a cold move's `{ keep: 'rime', rime: n }` reaches rime.js
//                  addRime() with the members it hit. Every ordinary Episode 7 foe, and the Snow Wisps the Lantern calls.
//   pale_lantern   Pale Flame and Lamplight Chill. Borrowed Light: at the end of a turn with nothing pinned (at most every
//                  `pinGap` + 1 of its turns) it is pinned on the non-hero member with the most Rime (ties: lowest HP) and lands on
//                  the Lantern's next turn, which rime.js holdForHero keeps after the hero's. Landed: that member is Frozen whatever
//                  their Rime and the Lantern heals `borrowHeal` (8%). Call on the target breaks it (the Lantern a full turn back); a
//                  Break cancels it. It never borrows the hero ("It cannot hold a kept light."). At 50% HP, once: two Snow Wisps.
//   white_phantom  1 Outer Frost (100% to 68%, HP locked at 68%): armored (DEF x1.4), Whiteout Breath, Icicle Lance. 2 The Frozen
//                  Ward (from 68%): the Closed Gate and the Lost Letter; while either stands the ward holds (20% damage taken,
//                  shields locked, HP stops at 33%). Both down: the ward thaws, the Phantom is Broken, the party gains 25 Fury.
//                  3 Thawlight: armor gone, weak fire, spear, light, no resists, 9 shields, Haste, Stillheart Blizzard every 4th
//                  turn (a charge: Defend or Break; Call does not stop it; the first a turn early). Every phase: Farewell, pinned
//                  like Borrowed Light (never on the hero; not used when only the hero stands); landed, its target is Stilled.
//   phantom_ward   the Closed Gate: Shut on the hero every `shutEvery` turn (Silence 50%: it closes the mouth that can call), Bar
//                  between. The Lost Letter: Cold Ink, then it Mends the Phantom `mendPct` (4%), never above the 68% lock.
//
// The hero's Answer on a pin's owner is a plain light hit and says "A farewell is not a decree." (the reflect hook). Every `phase`
// event carries `sprite` (the Phantom's three looks: white_phantom, white_phantom_ward, white_phantom_thaw). Messages of kind
// 'hood', 'ward', 'ward_break', 'blessing', 'shut', 'mend', 'farewell_answer', 'kept_light'.

import { SCRIPTS, POLICY_EXT, competentPolicy } from '../../battle/ai.js';
import { ENEMIES } from '../enemies.js';
import { SKILLS } from '../skills.js';
import { rimeSpecial, pin, land, onSourceBroken, onSourceGone, rimeState, isCold, CALL, HERO, RIME_MAX } from './rime.js';

export const WARD_MULT = 0.2;          // damage the Phantom takes under the Frozen Ward (plan 6.5)
export const WARD_FURY = 25;           // Fury each party member gains when the ward thaws (canon +25 Focus)
export const WARD_ADDS = ['closed_gate', 'lost_letter'];
export const PIN_BOSSES = ['pale_lantern', 'white_phantom'];
export const FIRST_PIN_TURN = 1;       // the first pin comes at the end of the boss's first turn
const FURY_MAX = 100;
const ARMOR = 'armor';

const basic = SCRIPTS.basic;
const foesOf = (ctx) => ctx.living('party').filter((p) => !ctx.kept(p));
const wardStanding = (ctx) => ctx.living('enemy').filter((e) => WARD_ADDS.includes(e.id));
const phantomOf = (ctx) => ctx.living('enemy').find((e) => e.id === 'white_phantom') || null;

/** The member a pin goes on: the non-hero member with the most Rime, ties the lowest HP share; never Stilled. */
export function pinTarget(ctx) {
  const S = rimeState(ctx.state);
  const pool = foesOf(ctx).filter((p) => p.id !== HERO && !(S && S.stilled[p.uid]));
  if (!pool.length) return null;
  const r = (u) => (S && S.r[u.uid]) || 0;
  return pool.slice().sort((a, b) => r(b) - r(a) || a.hp / a.maxHp - b.hp / b.maxHp || a.tie - b.tie)[0];
}
/** End of a boss turn: pin `skillId` when nothing is pinned, nothing is charging and the gap has passed. */
function tryPin(ctx, u, skillId) {
  const S = rimeState(ctx.state);
  if (!S || S.pin || !u.alive || u.broken || u.charging || u.ai.turns < (u.ai.pinAt ?? FIRST_PIN_TURN)) return false;
  const t = pinTarget(ctx);
  if (!t) {
    if (skillId === 'borrowed_light' && !u.ai.keptNoted && ctx.living('party').some((p) => p.id === HERO)) {
      u.ai.keptNoted = true;
      ctx.emit({ type: 'message', text: 'It cannot hold a kept light.', kind: 'kept_light', target: u.uid });
    }
    return false;
  }
  if (!pin(ctx, u, t, skillId)) return false;
  u.ai.pins = (u.ai.pins || 0) + 1;
  u.ai.pinAt = u.ai.turns + 2 + ((ENEMIES[u.id] || {}).pinGap ?? 0);   // the landing turn, then pinGap clear turns
  return true;
}
/** Its turn with a pin up: the pin lands (rules.js enemyAct runs a `special` plan through special() with { summon: true }). */
function pinnedPlan(ctx, u) {
  const S = rimeState(ctx.state);
  return S && S.pin && S.pin.source === u.uid ? { skill: S.pin.skill, special: true } : null;
}
function answerNote(ctx, tgt, part) {
  const S = rimeState(ctx.state);
  if (part && part.id === 'answer' && S && S.pin && S.pin.source === tgt.uid) {
    ctx.emit({ type: 'message', text: 'A farewell is not a decree.', kind: 'farewell_answer', target: tgt.uid });
  }
  return null;
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
  return rimeSpecial(ctx, u, sk, e, targets);
}
function pinDeath(ctx, dead) {
  if (dead && dead.side === 'enemy' && PIN_BOSSES.includes(dead.id)) onSourceGone(ctx, dead);
}

// --- ordinary foes ---------------------------------------------------------------------------------------------------
const cold = { ...basic, special };

// --- the Pale Lantern ------------------------------------------------------------------------------------------------
const lantern = {
  start(ctx, u) { u.ai.wispsCalled = false; u.ai.pinAt = FIRST_PIN_TURN; u.ai.pins = 0; },
  decide(ctx, u, d) { return pinnedPlan(ctx, u) || basic.decide(ctx, u, d); },
  afterTurn(ctx, u) { if (u.alive) tryPin(ctx, u, 'borrowed_light'); },
  onBreak(ctx, u) { onSourceBroken(ctx, u); },
  onDamaged(ctx, u) {
    const d = ENEMIES[u.id];
    if (u.ai.wispsCalled || u.hp > Math.floor(u.maxHp * (d.wispsAt || 0.5))) return;
    u.ai.wispsCalled = true;
    ctx.emit({ type: 'message', text: 'The Lantern opens its hood. Two Snow Wisps drift out of the light.', kind: 'hood', target: u.uid });
    for (let i = 0; i < 2; i++) ctx.summon('snow_wisp', { by: u, summoned: true, firstTurn: 0.5 + 0.3 * i, rewardScale: 0 });
  },
  onDeath: pinDeath,
  special,
  reflect(ctx, tgt, part) { return answerNote(ctx, tgt, part); },
};

// --- the White Phantom, the Closed Gate and the Lost Letter ----------------------------------------------------------
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
function enterPhantomPhase(ctx, u, idx) {
  const d = ENEMIES[u.id];
  const p = d.phases[idx];
  u.ai.phase = idx;
  ctx.cancelCharge(u, 'phase');
  // the phase's look (AGENTS.md trap: drop `sprite` and the Phantom never changes look)
  ctx.emit({ type: 'phase', actor: u.uid, phase: idx + 1, id: p.id, name: p.name, text: p.text, sprite: p.sprite || null });
  ctx.setWeak(u, p.weak, p.resist, idx < 2 ? `${u.id}:armored` : `${u.id}:${p.id}`);
  if (idx > 0) ctx.setShields(u, p.shields);
  setArmor(ctx, u, idx < 2);
  if (p.summon) {
    p.summon.forEach((id, i) => ctx.summon(id, { by: u, summoned: true, firstTurn: 0.4 + 0.3 * i, rewardScale: 0 }));
    u.ai.ward = true;
    ctx.emit({ type: 'message', text: 'The Frozen Ward closes around the Phantom. While the gate and the letter stand, little reaches it.', kind: 'ward', target: u.uid });
  }
  if (p.haste) ctx.addStatus(u, 'haste', 99, u);
  if (idx === 2) u.ai.blizzardAt = u.ai.turns + (d.blizzardEvery || 4) - 1;   // the first Blizzard comes a turn early
}
/** Both the Gate and the Letter are gone: the ward thaws, the Phantom is Broken a turn, the party gains 25 Fury, Thawlight begins. */
export function thawWard(ctx, u) {
  if (!u || !u.alive || !u.ai.ward) return;
  u.ai.ward = false;
  ctx.emit({ type: 'message', text: 'The Frozen Ward thaws!', kind: 'ward_break', target: u.uid });
  enterPhantomPhase(ctx, u, 2);
  ctx.breakUnit(u);
  partyFury(ctx, WARD_FURY, 'ward_break');
  ctx.emit({ type: 'message', text: `The party takes heart. Fury rises! (+${WARD_FURY})`, kind: 'blessing' });
}
const phantom = {
  start(ctx, u) { u.ai.phase = 0; u.ai.ward = false; u.ai.pinAt = FIRST_PIN_TURN; u.ai.pins = 0; enterPhantomPhase(ctx, u, 0); },
  decide(ctx, u, d) {
    const pinned = pinnedPlan(ctx, u);
    if (pinned) return pinned;
    const p = d.phases[u.ai.phase ?? 0];
    return basic.decide(ctx, u, { ...d, moves: (p && p.moves) || d.moves, opener: null });
  },
  afterTurn(ctx, u, d) {
    if (!u.alive) return;
    const S = rimeState(ctx.state);
    if ((u.ai.phase ?? 0) >= 2 && !u.charging && !u.broken && !(S && S.pin) && u.ai.turns >= (u.ai.blizzardAt ?? 99)) {
      ctx.planCharge(u, 'stillheart_blizzard', null);
      u.ai.blizzardAt = u.ai.turns + (d.blizzardEvery || 4);
    }
    tryPin(ctx, u, 'farewell');
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
    if ((u.ai.phase ?? 0) === 0 && u.hp <= Math.floor(u.maxHp * ENEMIES[u.id].phases[1].at)) enterPhantomPhase(ctx, u, 1);
  },
  damageTakenMult(ctx, u) { return u.ai.ward ? WARD_MULT : 1; },
  shieldLocked(ctx, u) { return !!u.ai.ward; },
  onBreak(ctx, u) { onSourceBroken(ctx, u); },   // a Break cancels the farewell (the charge rule) and returns the Stilled
  onDeath(ctx, dead) {
    pinDeath(ctx, dead);
    if (!WARD_ADDS.includes(dead.id)) return;
    const s = phantomOf(ctx);
    if (s && s.ai.ward && !wardStanding(ctx).length) thawWard(ctx, s);
  },
  special,
  reflect(ctx, tgt, part) { return answerNote(ctx, tgt, part); },
};
const phantomWard = {
  decide(ctx, u, d) {
    if (u.id === 'closed_gate') {
      const hero = foesOf(ctx).find((f) => f.id === HERO && !ctx.has(f, 'silence'));
      if (hero && u.ai.turns % (d.shutEvery || 3) === 0) { u.ai.shutAt = u.ai.turns; return { skill: 'shut', target: hero.uid }; }
      const pool = foesOf(ctx);
      return { skill: 'gate_bar', target: pool.length ? pool[Math.floor(ctx.R() * pool.length)].uid : null };
    }
    return basic.decide(ctx, u, d);
  },
  afterTurn(ctx, u, d) {
    if (!u.alive) return;
    if (u.id === 'closed_gate' && u.ai.shutAt === u.ai.turns) {
      const hero = ctx.living('party').find((f) => f.id === HERO);
      if (hero && ctx.has(hero, 'silence')) ctx.emit({ type: 'message', text: `The gate shuts. ${hero.name} cannot call.`, kind: 'shut', target: hero.uid });
    }
    if (u.id === 'lost_letter') {
      const s = phantomOf(ctx);
      if (!s) return;
      const cap = Math.floor(s.maxHp * ENEMIES.white_phantom.phases[1].at);
      const amt = Math.min(Math.round(s.maxHp * (d.mendPct || 0.04)), cap - s.hp);
      if (amt > 0) {
        ctx.emit({ type: 'message', text: 'The Lost Letter mends the Phantom with cold ink.', kind: 'mend', target: s.uid });
        ctx.heal(s, amt, u, { skill: 'letter_mend' });
      }
    }
  },
  special,
};

export const EP7_SCRIPTS = { cold, pale_lantern: lantern, white_phantom: phantom, phantom_ward: phantomWard };

// =============================================================================== Auto (the competent policy)
// Asked before the core policy (POLICY_EXT). Careful play only: the reckless policy (ignoreTelegraphs) and the naive one never Call,
// Defend for Rime or use Ember Tea. Quiet outside Episode 7: it returns null at once unless the battle has Rime. Every policy but the
// naive one is kept from spending a turn on Recall or a Silver Salve aimed at a Stilled ally (rime.js puts the seal back). Plan 6.3:
//   1. A Farewell or Borrowed Light is pinned and the hero acts before it lands (rime.js holdForHero sees to that): the hero Calls
//      its target. When the hero is Silenced, the member on turn uses an Echo Herb on the hero first. While the hero owes a pin its
//      answer, nobody takes the hero into a combo (it would spend the hero's turn).
//   2. An ally is Stilled: the hero Calls them on the hero's next turn, unless 1 applies to someone else.
//   3. A member at Rime 2 with a cold foe still standing: that member Defends (the hero only if no pin is up; Mira not while an
//      ally is under half HP, she heals first).
//   4. Two or more members at Rime 2 and Ember Tea in the bag: one Tea.
//   5. Against the Lantern and the Phantom the hero keeps 12 MP for Call: an MP action that would spend it becomes an Attack, and
//      under 12 MP the hero drinks an Ether.
export let RIME_POLICY = { call: true, stilled: true, defend: true, tea: true, reserve: true, echo: true };
let inner = false;

function entry(cmds, group, id) {
  const c = cmds.find((x) => x.id === group);
  const e = c && c.list ? c.list.find((x) => x.skill === id || x.item === id) : null;
  return e && e.enabled ? e : null;
}
const callCost = () => (SKILLS[CALL] ? SKILLS[CALL].mp : 12);
const heroOf = (b) => b.living('party').find((u) => u.id === HERO) || null;
/** The hero can Call on the hero's own turn: alive, not silenced, the skill known, the MP there. */
function heroCan(b) {
  const h = heroOf(b);
  return !!(h && h.skills && h.skills.includes(CALL) && !(h.statuses && h.statuses.silence) && h.mp >= callCost());
}
/** For the scene's line under a pin ("{hero} can call her."): the hero can Call, and the hero's turn comes before it lands. */
export function heroAnswers(b) {
  const S = b.state.rime;
  if (!S || !S.pin || !heroCan(b)) return false;
  const order = b.timeline(14).map((r) => r.uid);
  const hi = order.indexOf(HERO), si = order.indexOf(S.pin.source);
  return hi >= 0 && (si < 0 || hi < si);
}
function costOf(me, a) {
  if (!a || (a.type !== 'skill' && a.type !== 'combo')) return 0;
  const sk = SKILLS[a.skill];
  if (!sk) return 0;
  return a.type === 'combo' ? (sk.cost && sk.cost[me.id]) || 0 : sk.mp || 0;
}
function core(b, me, opts) {
  inner = true;
  try { return competentPolicy(b, me, opts); } finally { inner = false; }
}

/** Recall and a Silver Salve cannot free a Stilled ally (rime.js puts the seal back): never spend a turn on one. */
function stilledGuard(b, me, opts, S) {
  const a = core(b, me, opts);
  const aimed = a && a.target && S.stilled[a.target] && ((a.type === 'skill' && a.skill === 'recall') || (a.type === 'item' && a.item === 'silver_salve'));
  if (!aimed) return a;
  const foes = b.living('enemy');
  return { type: 'attack', target: foes.length ? foes[0].uid : undefined };
}

export function ep7Policy(b, me, opts = {}) {
  if (inner) return null;
  const S = b.state.rime;
  if (!S) return null;
  const anyStilled = Object.keys(S.stilled).length > 0;
  if (opts.ignoreTelegraphs) return anyStilled ? stilledGuard(b, me, opts, S) : null;
  const P = RIME_POLICY;
  const cmds = b.commands(me);
  const inv = b.state.inventory;
  const callOk = me.id === HERO && entry(cmds, 'tech', CALL);
  const foes = b.living('enemy');
  const p = S.pin;
  // 1. a pin: the hero Calls its target
  if (P.call && p && callOk && b.unit(p.target) && b.unit(p.target).alive) return { type: 'skill', skill: CALL, target: p.target };
  // 1a. the hero is Silenced with a pin up: an Echo Herb gets the voice back
  const hero = heroOf(b);
  if (P.echo && p && hero && me.id !== HERO && hero.statuses.silence && (inv.echo_herb || 0) > 0 && entry(cmds, 'item', 'echo_herb')) {
    return { type: 'item', item: 'echo_herb', target: hero.uid };
  }
  // 2. a Stilled ally: the hero Calls them back
  const stilled = Object.keys(S.stilled).filter((uid) => b.unit(uid) && b.unit(uid).alive);
  if (P.stilled && stilled.length && callOk) return { type: 'skill', skill: CALL, target: stilled[0] };
  // 3. Rime 2 and a cold foe standing: Defend and shake it off
  const coldUp = foes.some((f) => isCold(f) && !f.broken);
  const r = (u) => S.r[u.uid] || 0;
  const hurtAlly = b.living('party').some((a) => a.uid !== me.uid && a.hp / a.maxHp < 0.5);
  if (P.defend && coldUp && r(me) >= RIME_MAX - 1 && !S.warm[me.uid] && !(me.id === HERO && p) && !(me.id === 'mira' && hurtAlly)) {
    return { type: 'defend' };
  }
  // 4. two or more members at Rime 2: one Ember Tea
  if (P.tea && coldUp && b.living('party').filter((u) => r(u) >= RIME_MAX - 1).length >= 2 && (inv.ember_tea || 0) > 0 && entry(cmds, 'item', 'ember_tea')) {
    return { type: 'item', item: 'ember_tea', target: me.uid };
  }
  const pinBoss = foes.some((f) => PIN_BOSSES.includes(f.id));
  // 1b. nobody spends the hero's turn on a combo while the hero owes a pin its answer
  if (p && me.id !== HERO && heroCan(b)) {
    const a = stilledGuard(b, me, opts, S);
    const sk = a && a.type === 'combo' && SKILLS[a.skill];
    if (sk && (sk.members || []).includes(HERO)) return { type: 'attack', target: foes[0].uid };
    return a;
  }
  // 5. the hero keeps the MP for Call while a pin can come
  if (P.reserve && pinBoss && me.id === HERO && me.skills.includes(CALL)) {
    const a = stilledGuard(b, me, opts, S);
    const cost = costOf(me, a);
    if (me.mp < callCost()) for (const id of ['hi_ether', 'ether']) if (entry(cmds, 'item', id)) return { type: 'item', item: id, target: me.uid };
    if (cost && me.mp - cost < callCost() && a.skill !== CALL) {
      const t = a.target && b.unit(a.target) && b.unit(a.target).side === 'enemy' ? a.target : foes[0].uid;
      return { type: 'attack', target: t };
    }
    return a;
  }
  return anyStilled ? stilledGuard(b, me, opts, S) : null;
}

let done = false;
/** Add the scripts (never replacing one) and the Auto rule. Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, s] of Object.entries(EP7_SCRIPTS)) if (!SCRIPTS[id]) SCRIPTS[id] = s;
  if (!POLICY_EXT.includes(ep7Policy)) POLICY_EXT.push(ep7Policy);
  done = true;
}
export default register;
