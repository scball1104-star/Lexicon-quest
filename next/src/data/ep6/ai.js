// Episode 6 ("The Skybound Isles") battle AI (E6-battle; docs/EPISODE6_PLAN.md 6.3 to 6.5). Pure: no DOM, canvas or audio;
// randomness only through ctx.R. The pack's register() adds four scripts to ai.js SCRIPTS and one rule to POLICY_EXT.
//
// Scripts (by enemy `ai` id):
//   gale          basic (moves, the charge rule). Every ordinary Episode 6 foe; the Gale does the rest (gale.js).
//   gale_engine   Fan Blade and Piston. Its bellows run from the start (data `gustEvery: 3`: the Gust every 3 actions, gale.js);
//                 a Break stalls them for 2 of its turns. Full Blast: when the Gust is 2 actions away or less and nothing is pinned,
//                 it winds up ("The Engine winds the bellows...") and the blast is pinned to the Gust (gale.js pin(): it lands
//                 exactly 2 actions out, and never before Bram's next turn), then ENGINE_TUNE.blastGap Gusts pass clear. Braced
//                 against its own Gusts while the bellows run (gale.js ownsWind). At 50% HP, once: two Gale Sprites (Aloft, no reward).
//   scribe        1 The Wind Script (100% to 68%, HP locked at 68%): armored (DEF x1.4), Quillstorm, Ink Squall. 2 The Storm Script
//                 Ward (from 68%): the False Beacon and the Broken Compass; while either stands the ward holds (20% damage taken,
//                 shields locked, HP stops at 33%). Both down: the ward tears, the Scribe is Broken, the party gains 25 Fury.
//                 3 The True Sky Chart: armor gone, weak fire, spear, light, no resists, 9 shields, Haste, Thunderhead every 4th
//                 turn (a charge: Defend or Break; Anchor does not stop it). Every phase: Rewrite the Course, pinned to the Gust
//                 exactly 2 actions out and never before Bram's next turn.
//   scribe_ward   the False Beacon: False Light (Covers the Scribe) every turn. The Broken Compass: Spin (the soonest member half
//                 a turn back) every turn; Misdirect on Bram every 3rd turn (it targets the one who can anchor).
//
// The hero's Answer and Mira's Turn the Sky do nothing to a pinned move (the reflect hook and gale.js say why: "A course is not a
// decree." / "The wind is not the sky."). Every `phase` event carries `sprite` (the Scribe's three looks: scribe, scribe_ward,
// scribe_chart). Messages of kind 'bellows', 'vents', 'ward', 'ward_break', 'blessing', 'rewrite_answer'.

import { SCRIPTS, POLICY_EXT, competentPolicy } from '../../battle/ai.js';
import { ENEMIES } from '../enemies.js';
import { SKILLS } from '../skills.js';
import { pin, cancelPin, refreshEvery, ANCHOR, BALLAST, isAloft, windOf } from './gale.js';

export const WARD_MULT = 0.2;         // damage the Scribe takes under the Storm Script Ward (plan 6.5)
export const WARD_FURY = 25;          // Fury each party member gains when the ward tears (canon +25 Focus)
export const PIN_AT = 2;
export const FIRST_REWRITE_TURN = 2;   // the Scribe's first Rewrite on its second turn at the latest (E6-fixes A10)              // a pinned move lands exactly this many actions out (they pin when the Gust is this near)
export const WARD_ADDS = ['false_beacon', 'broken_compass'];
// The Engine winds a Full Blast for one Gust, then lets `blastGap` Gusts pass clear (E6-fixes A1: braced against its own wind it
// acts every turn, and a blast on every 3-action Gust left attack-only play no turn to strike in)
export const ENGINE_TUNE = { blastGap: 3 };
const FURY_MAX = 100;
const ARMOR = 'armor';

const basic = SCRIPTS.basic;
const foesOf = (ctx) => ctx.living('party').filter((p) => !ctx.kept(p));
const wardStanding = (ctx) => ctx.living('enemy').filter((e) => WARD_ADDS.includes(e.id));
const scribeOf = (ctx) => ctx.living('enemy').find((e) => e.id === 'scribe') || null;

/** Pin `skillId` when the Gust is PIN_AT actions away or less and nothing is pinned. The Gust is set to exactly PIN_AT. */
function tryPin(ctx, u, skillId, early = false) {
  const S = ctx.state.gale;
  if (!S || S.pinned || !u.alive || u.broken || u.charging || (S.gustIn > PIN_AT && !early)) return false;
  S.gustIn = PIN_AT;
  return pin(ctx, u, skillId);
}
function answerNote(ctx, tgt, part) {
  const S = ctx.state.gale;
  if (part && part.id === 'answer' && S && S.pinned && S.pinned.source === tgt.uid) {
    ctx.emit({ type: 'message', text: 'A course is not a decree.', kind: 'rewrite_answer', target: tgt.uid });
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

// --- ordinary foes ---------------------------------------------------------------------------------------------------
const gale = { ...basic };

// --- the Gale Engine -------------------------------------------------------------------------------------------------
const engine = {
  start(ctx, u) { u.ai.spritesCalled = false; u.ai.blastAt = 0; u.ai.blastGust = 0; u.ai.bellowsOff = false; u.ai.blasts = 0; },
  decide(ctx, u, d) { return basic.decide(ctx, u, d); },
  afterTurn(ctx, u, d) {
    if (!u.alive) return;
    if (u.ai.bellowsOff && u.ai.turns >= u.ai.bellowsOnAt) {
      u.ai.bellowsOff = false;
      ctx.emit({ type: 'message', text: 'The bellows start again. The wind comes faster.', kind: 'bellows', target: u.uid });
      refreshEvery(ctx, 'bellows');
    }
    const S = ctx.state.gale;
    if (u.ai.turns >= u.ai.blastAt && S && S.gusts >= u.ai.blastGust && tryPin(ctx, u, 'full_blast')) {
      u.ai.blasts++;
      u.ai.blastAt = u.ai.turns + 1 + (d.blastCooldown || 0);
      u.ai.blastGust = S.gusts + 1 + ENGINE_TUNE.blastGap;   // the Gust it lands on, then blastGap clear Gusts
    }
  },
  onBreak(ctx, u) {
    const S = ctx.state.gale;
    if (S && S.pinned && S.pinned.source === u.uid) cancelPin(ctx, 'break');
    const d = ENEMIES[u.id];
    if (!u.ai.bellowsOff) {
      u.ai.bellowsOff = true;
      u.ai.bellowsOnAt = u.ai.turns + (d.bellowsOff || 2);
      ctx.emit({ type: 'message', text: 'The bellows stall!', kind: 'bellows', target: u.uid });
      refreshEvery(ctx, 'bellows');
    }
  },
  onDamaged(ctx, u) {
    const d = ENEMIES[u.id];
    if (u.ai.spritesCalled || u.hp > Math.floor(u.maxHp * (d.spritesAt || 0.5))) return;
    u.ai.spritesCalled = true;
    ctx.emit({ type: 'message', text: 'The Engine opens its vents! Two Gale Sprites ride out on the wind.', kind: 'vents', target: u.uid });
    for (let i = 0; i < 2; i++) ctx.summon('gale_sprite', { by: u, summoned: true, firstTurn: 0.5 + 0.3 * i, rewardScale: 0 });
  },
  onDeath(ctx, dead) {   // ai.js onDeath reaches every script
    const S = ctx.state.gale;
    if (!S || dead.id !== 'gale_engine') return;
    if (S.pinned && S.pinned.source === dead.uid) cancelPin(ctx, 'gone');
    refreshEvery(ctx, 'bellows');
  },
  reflect(ctx, tgt, part) { return answerNote(ctx, tgt, part); },
};

// --- the Storm Scribe, the False Beacon and the Broken Compass -------------------------------------------------------
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
function enterScribePhase(ctx, u, idx) {
  const d = ENEMIES[u.id];
  const p = d.phases[idx];
  u.ai.phase = idx;
  ctx.cancelCharge(u, 'phase');
  ctx.emit({ type: 'phase', actor: u.uid, phase: idx + 1, id: p.id, name: p.name, text: p.text, sprite: p.sprite || null });
  ctx.setWeak(u, p.weak, p.resist, idx < 2 ? `${u.id}:armored` : `${u.id}:${p.id}`);
  if (idx > 0) ctx.setShields(u, p.shields);
  setArmor(ctx, u, idx < 2);
  if (p.summon) {
    p.summon.forEach((id, i) => ctx.summon(id, { by: u, summoned: true, firstTurn: 0.4 + 0.3 * i, rewardScale: 0 }));
    u.ai.ward = true;
    ctx.emit({ type: 'message', text: 'The Storm Script Ward closes around the Scribe. While its lights stand, little reaches it.', kind: 'ward', target: u.uid });
  }
  if (p.haste) ctx.addStatus(u, 'haste', 99, u);
  if (idx === 2) u.ai.thunderAt = u.ai.turns + (d.thunderheadEvery || 4) - 1;   // the first Thunderhead comes a turn early
}
/** Both lights are gone: the ward tears, the Scribe is Broken a turn, the party gains 25 Fury, phase 3 begins. */
export function tearWard(ctx, u) {
  if (!u || !u.alive || !u.ai.ward) return;
  u.ai.ward = false;
  ctx.emit({ type: 'message', text: 'The Storm Script Ward tears!', kind: 'ward_break', target: u.uid });
  enterScribePhase(ctx, u, 2);
  ctx.breakUnit(u);
  partyFury(ctx, WARD_FURY, 'ward_break');
  ctx.emit({ type: 'message', text: `The party takes heart. Fury rises! (+${WARD_FURY})`, kind: 'blessing' });
}
const scribe = {
  start(ctx, u) { u.ai.phase = 0; u.ai.ward = false; u.ai.rewriteAt = 0; u.ai.rewrites = 0; enterScribePhase(ctx, u, 0); },
  decide(ctx, u, d) {
    const p = d.phases[u.ai.phase ?? 0];
    return basic.decide(ctx, u, { ...d, moves: (p && p.moves) || d.moves, opener: null });
  },
  afterTurn(ctx, u, d) {
    if (!u.alive) return;
    if ((u.ai.phase ?? 0) >= 2 && !u.charging && !u.broken && u.ai.turns >= (u.ai.thunderAt ?? 99)) {
      ctx.planCharge(u, 'thunderhead', null);
      u.ai.thunderAt = u.ai.turns + (d.thunderheadEvery || 4);
    }
    // E6-fixes A10 (PLAYTEST_REVIEW_8 item 10): the first Rewrite comes on the Scribe's FIRST_REWRITE_TURN turn at the latest
    // (it pulls the Gust in to PIN_AT), so even a short fight shows the climax's decision more than once
    const early = !u.ai.rewrites && u.ai.turns >= FIRST_REWRITE_TURN;
    if (u.ai.turns >= (u.ai.rewriteAt || 0) && tryPin(ctx, u, 'rewrite_course', early)) {
      u.ai.rewrites++;
      u.ai.rewriteAt = u.ai.turns + 1 + (d.rewriteCooldown || 0);
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
    if ((u.ai.phase ?? 0) === 0 && u.hp <= Math.floor(u.maxHp * ENEMIES[u.id].phases[1].at)) enterScribePhase(ctx, u, 1);
  },
  damageTakenMult(ctx, u) { return u.ai.ward ? WARD_MULT : 1; },
  shieldLocked(ctx, u) { return !!u.ai.ward; },
  onBreak(ctx, u) {   // a Break cancels the rewrite (the charge rule)
    const S = ctx.state.gale;
    if (S && S.pinned && S.pinned.source === u.uid) cancelPin(ctx, 'break');
  },
  onDeath(ctx, dead) {
    const S = ctx.state.gale;
    if (dead.id === 'scribe' && S && S.pinned && S.pinned.source === dead.uid) cancelPin(ctx, 'gone');
    if (!WARD_ADDS.includes(dead.id)) return;
    const s = scribeOf(ctx);
    if (s && s.ai.ward && !wardStanding(ctx).length) tearWard(ctx, s);
  },
  reflect(ctx, tgt, part) { return answerNote(ctx, tgt, part); },
};
const scribeWard = {
  decide(ctx, u) {
    if (u.id === 'false_beacon') {
      const s = scribeOf(ctx);
      return { skill: 'false_light', target: s ? s.uid : u.uid };
    }
    const d = ENEMIES[u.id];
    const bram = foesOf(ctx).find((f) => f.id === 'bram' && !ctx.has(f, 'silence'));
    if (bram && u.ai.turns % (d.misdirectEvery || 3) === 0) return { skill: 'misdirect', target: bram.uid };
    // Spin: the party member who acts soonest
    const order = ctx.timeline(8).map((r) => r.uid);
    const at = (uid) => { const i = order.indexOf(uid); return i < 0 ? 99 : i; };
    const soon = foesOf(ctx).sort((a, b) => at(a.uid) - at(b.uid))[0];
    return { skill: 'compass_spin', target: soon ? soon.uid : null };
  },
  afterTurn() {},
};

export const EP6_SCRIPTS = { gale, gale_engine: engine, scribe, scribe_ward: scribeWard };

// =============================================================================== Auto (the competent policy)
// Asked before the core policy (POLICY_EXT). Careful play only: the reckless policy (ignoreTelegraphs) and the naive one never
// Anchor, brace or use a Ballast Stone. Quiet outside Episode 6: it returns null at once unless the battle has a Gale.
//   1. A move pinned to the Gust: Bram Anchors when the Gust is PIN_AT actions away or less, or when his next turn would come after
//      it. When Bram cannot (down, silenced, short of MP, or he will not act before it), the member on turn braces: Defend against
//      a Full Blast; against a Rewrite Mira holds a Ballast Stone. While Bram still owes a pinned move its answer, nobody takes him
//      into a combo (it would spend his turn).
//   2. The Gust 1 or 2 actions away, Aloft foes outnumber grounded ones, nothing Anchored, and Bram keeps 28 MP after it: he Anchors.
//   3. The Gust 1 action away and a member under 35% HP (not Mira, who heals): that member Defends.
//   4. With a pinned move possible (the Engine, the Scribe) Bram keeps 14 MP for Anchor: an MP action that would spend it becomes
//      an Attack, and under 14 MP he drinks an Ether.
export const ANCHOR_MP_KEEP = 28;
export let GALE_POLICY = { general: true, defendLow: true, reserve: true, ballast: true };
let inner = false;

function entry(cmds, group, id) {
  const c = cmds.find((x) => x.id === group);
  const e = c && c.list ? c.list.find((x) => x.skill === id || x.item === id) : null;
  return e && e.enabled ? e : null;
}
const bramUnit = (b) => b.living('party').find((u) => u.id === 'bram') || null;
const anchorCost = () => (SKILLS[ANCHOR] ? SKILLS[ANCHOR].mp : 14);
/** Bram can Anchor on his own turn: alive, not silenced or kept, the tech known, the MP there. */
function bramCan(b) {
  const m = bramUnit(b);
  return !!(m && m.alive && m.skills && m.skills.includes(ANCHOR) && !(m.statuses && (m.statuses.silence || m.statuses.kept)) && m.mp >= anchorCost());
}
/** Actions until `me` acts again after acting now (1 = this action, so its next is action landing + 2). */
function nextActionNo(b, me) {
  const p = b.previewTimeline(me, { type: 'attack' });
  const i = p.order.findIndex((r) => r.uid === me.uid);
  return i < 0 ? 99 : i + 2;
}
/** Has Bram a turn before the Gust falls (counting from now, the current action being action 1)? */
function bramBeforeGust(b, S, me) {
  if (me.id === 'bram') return nextActionNo(b, me) <= S.gustIn;
  const br = bramUnit(b);
  if (!br) return false;
  const order = b.timeline(14).map((r) => r.uid);
  const i = order.indexOf(br.uid);   // order[0] is the current actor
  return i > 0 && i + 1 <= S.gustIn;
}
/** For the scene's line under a pinned move: Bram can Anchor, and his turn comes before the Gust (the actor on turn = action 1). */
export function bramAnswers(b) {
  const S = b.state.gale, m = bramUnit(b);
  if (!S || !S.pinned || !m || !bramCan(b)) return false;
  const i = b.timeline(14).findIndex((r) => r.uid === m.uid && !r.skip);
  return i >= 0 && i + 1 <= S.gustIn;
}
function costOf(me, a) {
  if (!a || (a.type !== 'skill' && a.type !== 'combo')) return 0;
  const sk = SKILLS[a.skill];
  if (!sk) return 0;
  return a.type === 'combo' ? (sk.cost && sk.cost[me.id]) || 0 : sk.mp || 0;
}
const braced = (S, u) => !!(u.defending || (S.ballast && S.ballast[u.uid]));
const pinners = (foes) => foes.some((f) => f.id === 'scribe' || f.id === 'gale_engine');

export function ep6Policy(b, me, opts = {}) {
  if (inner || opts.ignoreTelegraphs) return null;
  const S = b.state.gale;
  if (!S) return null;
  const P = GALE_POLICY;
  const cmds = b.commands(me);
  const inv = b.state.inventory;
  const anchorOk = me.id === 'bram' && entry(cmds, 'tech', ANCHOR);
  const ballastOk = P.ballast && (inv[BALLAST] || 0) > 0 && entry(cmds, 'item', BALLAST);
  const foes = b.living('enemy');
  // 1. a move pinned to the Gust
  if (S.pinned && !S.anchored) {
    if (anchorOk && (S.gustIn <= PIN_AT || !bramBeforeGust(b, S, me))) return { type: 'skill', skill: ANCHOR };
    const bramWill = bramCan(b) && bramBeforeGust(b, S, me);
    if (me.id !== 'bram' && !bramWill && !braced(S, me)) {
      if (S.pinned.skill === 'full_blast') return { type: 'defend' };
      if (me.id === 'mira' && ballastOk) return { type: 'item', item: BALLAST, target: me.uid };
    }
  }
  // 1b. nobody spends Bram's turn on a combo while he still owes a pinned move its answer
  if (S.pinned && !S.pinned.answered && me.id !== 'bram' && bramCan(b)) {
    inner = true;
    let a;
    try { a = competentPolicy(b, me, opts); } finally { inner = false; }
    const sk = a && a.type === 'combo' && SKILLS[a.skill];
    if (sk && (sk.members || []).includes('bram')) return { type: 'attack', target: foes[0].uid };
    return a;
  }
  // 2. the wind favours the foes: Anchor through it
  if (P.general && anchorOk && !S.anchored && S.gustIn <= 2 && me.mp - anchorCost() >= ANCHOR_MP_KEEP) {
    let up = 0, down = 0;
    for (const f of foes) { if (!windOf(f)) continue; if (isAloft(f)) up++; else down++; }
    if (up > down) return { type: 'skill', skill: ANCHOR };
  }
  // 3. a member near the floor braces as the Gust comes
  if (P.defendLow && S.gustIn === 1 && !S.anchored && me.id !== 'mira' && me.hp / me.maxHp < 0.35 && !braced(S, me)) return { type: 'defend' };
  // 4. Bram keeps the MP for the anchor while a pinned move can come
  if (P.reserve && pinners(foes) && me.id === 'bram' && me.skills.includes(ANCHOR)) {
    inner = true;
    let a;
    try { a = competentPolicy(b, me, opts); } finally { inner = false; }
    const cost = costOf(me, a);
    if (cost && me.mp - cost < anchorCost() && a.skill !== ANCHOR) {
      if (me.mp < anchorCost()) for (const id of ['hi_ether', 'ether']) if (entry(cmds, 'item', id)) return { type: 'item', item: id, target: me.uid };
      const t = a.target && b.unit(a.target) && b.unit(a.target).side === 'enemy' ? a.target : foes[0].uid;
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
  for (const [id, s] of Object.entries(EP6_SCRIPTS)) if (!SCRIPTS[id]) SCRIPTS[id] = s;
  if (!POLICY_EXT.includes(ep6Policy)) POLICY_EXT.push(ep6Policy);
  done = true;
}
export default register;
