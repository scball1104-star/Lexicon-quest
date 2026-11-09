// Episode 5 ("The Last Prophecy") battle AI (E5-battle; docs/EPISODE5_PLAN.md 6.3 to 6.5). Pure: no DOM, canvas or audio;
// randomness only through ctx.R. The pack's register() adds five scripts to ai.js SCRIPTS and one rule to POLICY_EXT.
//
// Scripts (by enemy `ai` id):
//   sky            basic (moves, the charge rule). Every ordinary Episode 5 foe; the Turning Sky does the rest (sky.js).
//   mirage_knight  Mirage Slash and Glare; Horizon Cleave announced on every 4th turn (party phys 150%); at 50% HP, once, its
//                  Mirage Double. Mirror Turn is data (`mirrorTurn`): sky.js turns its side on every natural Turn.
//   mirage_double  Mirror Copy: the Knight's last attack at half power, every turn. Its side is always opposite the Knight's.
//   oracle         1 The Read Sky (100% to 72%, HP locked at 72%): Stinger, Sandfall. 2 False Futures (from 72%): Hunger and Fear;
//                  while either stands the Mirage Veil holds (15% damage taken, shields locked, HP stops at 34%). Both down: the
//                  Veil tears, the Oracle is Broken, the party gains 25 Fury. 3 The True Horizon: weak ice, spear, light, no
//                  resists, 9 shields, Haste, Mirror of the Sky, the Unbound Sandstorm announced on every 4th turn.
//                  Every phase: the Last Prophecy, read when the Turn is READ_AT actions away or less and nothing is pinned
//                  (the hero first, then the member with the lowest HP), pinned to the Turn by sky.js foretell().
//   future         Hunger: Devour the Road (15 Fury from the member with most, the Oracle +5% HP) every turn. Fear: Dread (the
//                  soonest party member half a turn back) every turn; Hush the Reader on Mira every 3rd turn.
//
// The hero's Answer against a foretelling does nothing to it (the reflect hook says why: "A foretelling is not a decree.
// Nothing is written yet."). Events the scene draws besides sky.js's: `phase` (with `sprite`), messages of kind 'double',
// 'veil', 'veil_break', 'devour_road', 'foretell_answer', 'blessing'.

import { SCRIPTS, POLICY_EXT, competentPolicy } from '../../battle/ai.js';
import { ENEMIES } from '../enemies.js';
import { SKILLS } from '../skills.js';
import { foretell, breakForetelling, refresh, TURN_EVERY } from './sky.js';

export const VEIL_MULT = 0.15;        // damage the Oracle takes under the Mirage Veil (canon)
export const VEIL_FURY = 25;          // Fury each party member gains when the Veil tears (canon +25 Focus)
export const READ_AT = 3;             // the Oracle reads a star when the Turn is this many actions away or less
export const READ_COOLDOWN = 0;       // Oracle turns between readings (0: whenever nothing is pinned)
export const FUTURES = ['future_hunger', 'future_fear'];
const FURY_MAX = 100;

const basic = SCRIPTS.basic;
const foesOf = (ctx) => ctx.living('party').filter((p) => !ctx.kept(p));
const randomFoe = (ctx) => { const f = foesOf(ctx); return f.length ? f[Math.floor(ctx.R() * f.length)].uid : null; };
const futuresStanding = (ctx) => ctx.living('enemy').filter((e) => FUTURES.includes(e.id));
const oracleOf = (ctx) => ctx.living('enemy').find((e) => e.id === 'oracle') || null;

// --- ordinary foes ---------------------------------------------------------------------------------------------------
const sky = { ...basic };

// --- the Mirage Knight and its Double --------------------------------------------------------------------------------
const knight = {
  start(ctx, u) { const d = ENEMIES[u.id]; u.ai.doubleCalled = false; u.ai.cleaveAt = (d.cleaveEvery || 4) - 1; },
  decide(ctx, u, d) {
    const plan = basic.decide(ctx, u, d);
    if (plan && plan.skill && SKILLS[plan.skill].formula !== 'none') u.ai.lastAttack = plan.skill;
    return plan;
  },
  afterTurn(ctx, u, d) {
    if (!u.alive || u.charging || u.broken) return;
    if (u.ai.turns >= u.ai.cleaveAt) {
      ctx.planCharge(u, 'horizon_cleave', null);
      u.ai.cleaveAt = u.ai.turns + (d.cleaveEvery || 4);   // every 4th turn (a Break does not reset the beat)
    }
  },
  onChargeFired(ctx, u) { u.ai.lastAttack = 'horizon_cleave'; },
  onDamaged(ctx, u) {
    const d = ENEMIES[u.id];
    if (u.ai.doubleCalled || u.hp > Math.floor(u.maxHp * (d.doubleAt || 0.5))) return;
    u.ai.doubleCalled = true;
    ctx.emit({ type: 'message', text: "The Knight's mirror steps out beside it!", kind: 'double', target: u.uid });
    const dbl = ctx.summon('mirage_double', { by: u, summoned: true, firstTurn: 0.4 });
    dbl.mirrorOf = u.uid;
    dbl.skySide = u.skySide === 'sun' ? 'star' : 'sun';
    refresh(ctx);
  },
};
const double = {
  decide(ctx) { return { skill: 'mirror_copy', target: randomFoe(ctx) }; },
  afterTurn() {},
  special(ctx, u, sk, e, targets) {
    if (e.keep !== 'copy') return null;
    const k = ctx.U(u.mirrorOf);
    const last = (k && k.ai.lastAttack) || u.ai.copied || 'mirage_slash';
    u.ai.copied = last;
    const s2 = SKILLS[last];
    const part = { id: s2.id, formula: s2.formula, power: s2.power * (e.copy || 0.5), types: s2.types, pierce: s2.pierce || 0 };
    const tgts = s2.target === 'enemies' ? foesOf(ctx) : targets.filter((t) => t && t.alive);
    for (const t of tgts) if (t.alive) ctx.strike(u, t, part, null);
    return null;
  },
};

// --- the Sand Oracle and the False Futures ---------------------------------------------------------------------------
function enterOraclePhase(ctx, u, idx) {
  const d = ENEMIES[u.id];
  const p = d.phases[idx];
  u.ai.phase = idx;
  ctx.cancelCharge(u, 'phase');
  ctx.emit({ type: 'phase', actor: u.uid, phase: idx + 1, id: p.id, name: p.name, text: p.text, sprite: p.sprite || null });
  ctx.setWeak(u, p.weak, p.resist, idx < 2 ? `${u.id}:veiled` : `${u.id}:${p.id}`);
  if (idx > 0) ctx.setShields(u, p.shields);
  if (p.summon) {
    p.summon.forEach((id, i) => ctx.summon(id, { by: u, summoned: true, firstTurn: 0.4 + 0.3 * i }));
    u.ai.veil = true;
    ctx.emit({ type: 'message', text: 'A Mirage Veil closes around the Oracle. While its futures stand, little reaches it.', kind: 'veil', target: u.uid });
    refresh(ctx);
  }
  if (p.haste) ctx.addStatus(u, 'haste', 99, u);
  if (p.mirror) u.mirror = true;
  if (idx === 2) u.ai.stormAt = u.ai.turns + (d.sandstormEvery || 4) - 1;   // the first storm comes a turn early
}
function partyFury(ctx, amount) {
  for (const m of ctx.living('party')) {
    const before = m.fury || 0;
    m.fury = Math.min(FURY_MAX, before + amount);
    if (m.fury !== before) ctx.emit({ type: 'fury_gain', target: m.uid, amount: m.fury - before, fury: m.fury, reason: 'veil_break' });
    if (before < FURY_MAX && m.fury >= FURY_MAX) ctx.emit({ type: 'fury_ready', target: m.uid });
  }
}
/** Both futures are gone: the Veil tears, the Oracle is Broken a turn, the party gains 25 Fury, phase 3 begins. */
export function tearVeil(ctx, u) {
  if (!u || !u.alive || !u.ai.veil) return;
  u.ai.veil = false;
  ctx.emit({ type: 'message', text: 'The Mirage Veil tears!', kind: 'veil_break', target: u.uid });
  enterOraclePhase(ctx, u, 2);
  ctx.breakUnit(u);
  partyFury(ctx, VEIL_FURY);
  ctx.emit({ type: 'message', text: `The party takes heart. Fury rises! (+${VEIL_FURY})`, kind: 'blessing' });
}
/** Who the Oracle reads: the hero first (a name that is still on the chart), then the member with the lowest HP. */
export function readTarget(ctx) {
  const foes = foesOf(ctx);
  if (!foes.length) return null;
  const fresh = foes.filter((f) => !ctx.has(f, 'nameless'));
  const hero = fresh.find((f) => f.id === 'hero');
  if (hero) return hero.uid;
  const pool = fresh.length ? fresh : foes;
  return pool.reduce((a, b) => (b.hp < a.hp ? b : a)).uid;
}
function readStar(ctx, u) {
  const S = ctx.state.sky;
  if (!S || S.pinned || !u.alive || u.broken || S.turnIn > READ_AT) return;
  if (u.ai.turns < (u.ai.readAt || 0)) return;
  const t = readTarget(ctx);
  if (!t) return;
  if (foretell(ctx, u, t, 'last_prophecy')) u.ai.readAt = u.ai.turns + 1 + READ_COOLDOWN;
}
const oracle = {
  start(ctx, u) { u.ai.phase = 0; u.ai.veil = false; enterOraclePhase(ctx, u, 0); },
  decide(ctx, u, d) {
    const p = d.phases[u.ai.phase ?? 0];
    return basic.decide(ctx, u, { ...d, moves: (p && p.moves) || d.moves, opener: null });
  },
  afterTurn(ctx, u, d) {
    if (!u.alive) return;
    if ((u.ai.phase ?? 0) >= 2 && !u.charging && !u.broken && u.ai.turns >= (u.ai.stormAt ?? 99)) {
      ctx.planCharge(u, 'sandstorm', null);
      u.ai.stormAt = u.ai.turns + (d.sandstormEvery || 4);
    }
    readStar(ctx, u);
  },
  clampDamage(ctx, u, amt) {
    const d = ENEMIES[u.id];
    const ph = u.ai.phase ?? 0;
    let floorHp = null;
    if (ph === 0) floorHp = Math.floor(u.maxHp * d.phases[1].at);
    else if (ph === 1 && u.ai.veil) floorHp = Math.floor(u.maxHp * d.phases[1].floor);
    if (floorHp === null) return amt;
    return u.hp - amt < floorHp ? Math.max(0, u.hp - floorHp) : amt;
  },
  onDamaged(ctx, u) {
    if ((u.ai.phase ?? 0) === 0 && u.hp <= Math.floor(u.maxHp * ENEMIES[u.id].phases[1].at)) enterOraclePhase(ctx, u, 1);
  },
  damageTakenMult(ctx, u) { return u.ai.veil ? VEIL_MULT : 1; },
  shieldLocked(ctx, u) { return !!u.ai.veil; },
  onBreak(ctx, u) {   // a Break cancels the reading (the charge rule)
    const S = ctx.state.sky;
    if (S && S.pinned && S.pinned.source === u.uid) breakForetelling(ctx, 'break');
  },
  onDeath(ctx, dead) {   // ai.js onDeath reaches every script: the last future down tears the Veil
    const S = ctx.state.sky;
    if (dead.id === 'oracle' && S && S.pinned && S.pinned.source === dead.uid) breakForetelling(ctx, 'gone');
    if (!FUTURES.includes(dead.id)) return;
    const o = oracleOf(ctx);
    if (o && o.ai.veil && !futuresStanding(ctx).length) tearVeil(ctx, o);
  },
  reflect(ctx, tgt, part) {
    const S = ctx.state.sky;
    if (part && part.id === 'answer' && S && S.pinned && S.pinned.source === tgt.uid) {
      ctx.emit({ type: 'message', text: 'A foretelling is not a decree. Nothing is written yet.', kind: 'foretell_answer', target: tgt.uid });
    }
    return null;
  },
};
const future = {
  decide(ctx, u) {
    if (u.id === 'future_hunger') return { skill: 'devour_road', target: null };
    const d = ENEMIES[u.id];
    const mira = foesOf(ctx).find((f) => f.id === 'mira' && !ctx.has(f, 'silence'));
    if (mira && u.ai.turns % (d.hushEvery || 3) === 0) return { skill: 'hush_reader', target: mira.uid };
    // Dread: the party member who acts soonest
    const order = ctx.timeline(8).map((r) => r.uid);
    const at = (uid) => { const i = order.indexOf(uid); return i < 0 ? 99 : i; };
    const soon = foesOf(ctx).sort((a, b) => at(a.uid) - at(b.uid))[0];
    return { skill: 'dread', target: soon ? soon.uid : null };
  },
  afterTurn() {},
  special(ctx, u, sk, e) {
    if (e.keep !== 'road') return null;
    const foes = foesOf(ctx).filter((f) => (f.fury || 0) > 0);
    if (foes.length) {
      const top = foes.reduce((a, b) => ((b.fury || 0) > (a.fury || 0) ? b : a));
      const took = Math.min(e.fury || 15, top.fury);
      top.fury -= took;
      ctx.emit({ type: 'fury_gain', target: top.uid, amount: -took, fury: top.fury, reason: 'devoured' });
      ctx.emit({ type: 'message', text: `Hunger eats the road ahead of ${top.name}. (-${took} Fury)`, kind: 'devour_road', target: top.uid });
    }
    const o = oracleOf(ctx);
    if (o && e.bossHeal) ctx.heal(o, o.maxHp * e.bossHeal, u, { skill: sk.id });
    return null;
  },
};

export const EP5_SCRIPTS = { sky, mirage_knight: knight, mirage_double: double, oracle, future };

// =============================================================================== Auto (the competent policy)
// Asked before the core policy (POLICY_EXT). Careful play only: the reckless policy (ignoreTelegraphs) and the naive one never
// turn the sky or use Hourglass Sand. Quiet outside Episode 5: it returns null at once unless the battle has a sky.
//   1. A foretelling pinned: Mira turns the sky when the Turn is 2 actions away or less, or when her next turn would come after
//      it. When Mira cannot (down, silenced, short of MP), anyone holds the sky with Hourglass Sand on the last action.
//   2. More foe HP stands Ascendant than Exposed, the Turn 4 actions away or more, and Mira keeps 24 MP after it: she turns it.
//   3. A foe Exposed and one hit from Broken, the Turn 1 action away: Hourglass Sand.
//   4. With a foretelling possible (the Oracle) Mira keeps 12 MP for Turn the Sky: an MP action that would spend it becomes an
//      Attack, and under 12 MP she drinks an Ether.
export const TURN_MP_KEEP = 24;
export let SKY_POLICY = { turnMin: 4, breakAt: 2, sand: true, reserve: true, general: true };
let inner = false;

function entry(cmds, group, id) {
  const c = cmds.find((x) => x.id === group);
  const e = c && c.list ? c.list.find((x) => x.skill === id || x.item === id) : null;
  return e && e.enabled ? e : null;
}
const turnCost = () => (SKILLS.turn_sky ? SKILLS.turn_sky.mp : 12);
/** Mira can turn the sky on her own turn: alive, not silenced or kept, the tech known, the MP there. */
function miraCan(b) {
  const m = b.unit('mira');
  return !!(m && m.alive && m.skills && m.skills.includes('turn_sky') && !(m.statuses && (m.statuses.silence || m.statuses.kept)) && m.mp >= turnCost());
}
/** Actions until `me` acts again after acting now (1 = this action, so its next is action landing + 2). */
function nextActionNo(b, me) {
  const p = b.previewTimeline(me, { type: 'attack' });
  const i = p.order.findIndex((r) => r.uid === me.uid);
  return i < 0 ? 99 : i + 2;
}
/** Has Mira another turn before the Turn falls (counting from now, the current action being action 1)? */
function miraBeforeTurn(b, S, me) {
  if (me.id === 'mira') return nextActionNo(b, me) <= S.turnIn;
  const order = b.timeline(12).map((r) => r.uid);
  const i = order.indexOf('mira');   // order[0] is the current actor
  return i > 0 && i + 1 <= S.turnIn;
}
function costOf(me, a) {
  if (!a || (a.type !== 'skill' && a.type !== 'combo')) return 0;
  const sk = SKILLS[a.skill];
  if (!sk) return 0;
  return a.type === 'combo' ? (sk.cost && sk.cost[me.id]) || 0 : sk.mp || 0;
}

export function ep5Policy(b, me, opts = {}) {
  if (inner || opts.ignoreTelegraphs) return null;
  const S = b.state.sky;
  if (!S) return null;
  const P = SKY_POLICY;
  const cmds = b.commands(me);
  const inv = b.state.inventory;
  const sandOk = P.sand && (inv.hourglass_sand || 0) > 0 && entry(cmds, 'item', 'hourglass_sand');
  const turnOk = me.id === 'mira' && entry(cmds, 'tech', 'turn_sky');
  const foes = b.living('enemy');
  // 1. a foretelling pinned to the Turn
  if (S.pinned) {
    if (turnOk && (S.turnIn <= P.breakAt || !miraBeforeTurn(b, S, me))) return { type: 'skill', skill: 'turn_sky' };
    if (me.id !== 'mira' && S.turnIn <= 1 && sandOk && !(miraCan(b) && miraBeforeTurn(b, S, me))) {
      return { type: 'item', item: 'hourglass_sand', target: me.uid };
    }
  }
  // 2. the sky favours the foes: turn it
  if (P.general && turnOk && !S.pinned && S.turnIn >= P.turnMin && me.mp - turnCost() >= TURN_MP_KEEP) {
    let asc = 0, exp = 0;
    for (const f of foes) { if (!f.skySide) continue; if (f.exposed) exp += f.hp; else asc += f.hp; }
    if (asc > exp && asc > 0) return { type: 'skill', skill: 'turn_sky' };
  }
  // 3. one hit from a Break as the sky is about to close it: hold the sky
  if (sandOk && S.turnIn === 1 && foes.some((f) => f.exposed && !f.broken && f.shields === 1)) {
    return { type: 'item', item: 'hourglass_sand', target: me.uid };
  }
  // 4. Mira keeps the MP for the turn while a foretelling can come
  const oracle = foes.find((f) => f.id === 'oracle');
  if (P.reserve && oracle && me.id === 'mira' && me.skills.includes('turn_sky')) {
    inner = true;
    let a;
    try { a = competentPolicy(b, me, opts); } finally { inner = false; }
    const cost = costOf(me, a);
    if (cost && me.mp - cost < turnCost() && a.skill !== 'turn_sky') {
      if (me.mp < turnCost()) for (const id of ['hi_ether', 'ether']) if (entry(cmds, 'item', id)) return { type: 'item', item: id, target: me.uid };
      const t = a.target && b.unit(a.target) && b.unit(a.target).side === 'enemy' ? a.target : (foes.find((f) => f.exposed) || oracle).uid;
      return { type: 'attack', target: t };
    }
    return a;
  }
  return null;
}

let done = false;
/** Add the scripts (never replacing one) and the Auto rule. Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, s] of Object.entries(EP5_SCRIPTS)) if (!SCRIPTS[id]) SCRIPTS[id] = s;
  if (!POLICY_EXT.includes(ep5Policy)) POLICY_EXT.push(ep5Policy);
  done = true;
}
export default register;
export { TURN_EVERY };
