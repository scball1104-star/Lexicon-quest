// The Gale (E6-battle; docs/EPISODE6_PLAN.md 6.3): Episode 6's one battle rule, as pack code on rules.js RULE_EXT (Episode 5's
// seam: `start`, `afterAction`). Pure: no DOM, canvas or audio; no randomness (it never draws from ctx.R).
//
// Every battle in which a foe has a `wind` field ('aloft' | 'ground', src/data/ep6/enemies.js) has a Gale, kept in
// `ctx.state.gale` (so it saves and restores with the battle state). Battles with no wind foe get no Gale, no events and no state:
// Episodes 1 to 5, the cave and the tier play exactly as before.
//
// - The Gust falls after GUST_EVERY actions (any unit's ended turn counts; a combo is one), or a foe's `gustEvery` while it stands
//   and runs its bellows (the Gale Engine: 3). The first Gust: GALE_START[encounter] (encounters.js) if it names one.
// - A Gust: "The wind gusts." Every Aloft foe that is not Broken RIDES it (comes round sooner by GUST_PUSH of its base delay); every
//   grounded foe and every party member is BLOWN BACK by GUST_PUSH unless Braced (Defended since its last turn, `u.defending`, or
//   holding a Ballast Stone's brace; a foe whose bellows drive the wind is Braced against its own Gusts, ownsWind). An Anchored
//   party (Bram's Anchor) CATCHES it instead: each member comes round sooner. A Broken Aloft foe is Grounded until it recovers.
// - A move pinned to the Gust (`pin()`: the Scribe's Rewrite the Course, the Engine's Full Blast) falls with it. Anchored: it fails
//   ("The course holds.") and its owner is blown back a full turn. Else the Rewrite blows every member back a full turn (Braced:
//   half) and its owner acts at once; the Blast strikes the party (phys 140%, Defend halves) and blows every member back a full turn
//   (Defending: not at all; Ballast: half). A Break of its owner cancels it (the charge rule); so does its owner's fall.
// - holdForBram: a pinned move never lands before Bram's next turn (the Episode 5 holdForMira pattern): the Gust holds until he has
//   had one after the pin.
//
// NEGATIVE PUSHES (the plan's first check, qa/battle/ep6_battle.test.mjs): rules.js delayUnit(u, -f) adds a negative amount to
// `u.next` with no floor, so a unit whose turn is less than f of a turn away lands BEFORE `state.now` (CTB's invariant: no unit's
// next turn is in the past). advance() never moves time backwards, so that unit simply acts next, but the timeline would show a
// time behind the clock and two such units could swap places for no reason the player can see. So every ride and catch here goes
// through delayUnit with the fraction CLAMPED to the room the unit has (`next - now`): a unit already about to act stays where it
// is, and the order among the rest is kept. RIDE = false is the plan's fallback (Aloft foes are not moved at all); it is not used.
//
// Events (the scene draws them; E6-scene-ui): `gale` { gustIn, every, reason: 'start' | 'action' | 'bellows' | 'hold' }; `gust`
// { pushed: [{ target, amount, ticks }] } (amount: the fraction of a turn, negative = sooner); `aloft` { target, on };
// `anchored` { targets, on }; `braced` { target, on, by: 'ballast' }; `rewrite` { source, pinned, gustIn, skill, moved? } and a
// `telegraph` with `rewrite: true`; `rewrite_broken` { source, reason: 'anchor' | 'break' | 'gone' }; `rewrite_land` { source, skill }.
// Messages carry kind 'gust', 'anchor', 'ballast', 'rewrite_broken', 'rewrite_land', 'rewrite_sky', 'no_sky'.
//
// Wiring: register() pushes GALE_RULE onto RULE_EXT and bridges Anchor (skills.js `{ keep: 'gale' }`: ai.js special() of the
// `basic` script, as Episode 5's Turn the Sky), then pushes SKILL_GATE (Turn the Sky with no sky, Anchor with no wind: see below).

import { RULE_EXT } from '../../battle/rules.js';
import { SCRIPTS } from '../../battle/ai.js';
import { baseDelay } from '../../battle/ctb.js';
import { ENEMIES } from '../enemies.js';
import { SKILLS } from '../skills.js';
import { GALE_START } from './encounters.js';

export const GUST_EVERY = 5;       // actions between Gusts (plan 6.6 knob 1)
export const GUST_PUSH = 0.35;     // of a unit's base delay, each Gust (knob 2)
export const PIN_PUSH = 1.0;       // a pinned move that lands: a full turn back
export const PIN_BRACED = 0.5;     // ... half for a Braced member
export const RIDE = true;          // false: the plan's fallback (Aloft foes are not moved); see NEGATIVE PUSHES above
export const BALLAST = 'ballast_stone';
export const ANCHOR = 'anchor_line';
export const GALE_SOURCE = 'gale';

const blownMsg = 'The wind gusts.';

// ----------------------------------------------------------------------------- reads (for the policy, the scene and tests)
/** The battle's Gale state, or null (no wind foe). Takes a battle, its state, or a rule ctx. */
export function galeState(x) {
  const st = x && x.state && x.state.units ? x.state : x;
  return (st && st.gale) || null;
}
/** A foe's wind ('aloft' | 'ground') from its data, or null. */
export const windOf = (u) => (u && u.side === 'enemy' && ENEMIES[u.id] && ENEMIES[u.id].wind) || null;
/** Does `u` ride the next Gust (an Aloft foe that is not Broken)? */
export const isAloft = (u) => !!(u && u.alive && windOf(u) === 'aloft' && !u.broken);
/** Is `u` (a party member) Braced against the next Gust: Defended since its last turn, or a Ballast Stone's brace? */
export function isBraced(st, u) {
  const S = galeState(st);
  return !!(u && (u.defending || (S && S.ballast && S.ballast[u.uid])));
}

// ----------------------------------------------------------------------------- the push
/**
 * Push `u` along the timeline by `frac` of its base delay through ctx.delayUnit. A negative push (sooner) is clamped to the room
 * the unit has, so its next turn never falls before now. Returns the fraction applied.
 */
export function push(ctx, u, frac, reason) {
  if (!u || !u.alive || !frac) return 0;
  let f = frac;
  if (f < 0) {
    const base = baseDelay(ctx.eff(u, 'spd'));
    const room = Math.max(0, u.next - ctx.state.now);
    f = Math.max(f, -room / base);
    if (Math.round(base * -f) <= 0) return 0;
  }
  ctx.delayUnit(u, f, reason);
  if (u.next < ctx.state.now) u.next = ctx.state.now;   // rounding guard (never reached: the clamp keeps it at or after now)
  return f;
}

// ----------------------------------------------------------------------------- state
function windy(ctx) { return ctx.living('enemy').some((u) => windOf(u)); }
/**
 * A foe that drives the wind (data `gustEvery`: the Gale Engine) is Braced against its own Gusts while its bellows run
 * (PLAYTEST_REVIEW_8 item 1: blown back every 3 actions, it acted twice a fight). A Break stalls the bellows (ai.js
 * u.ai.bellowsOff), and a stalled Engine is blown back like any grounded foe.
 */
export const ownsWind = (u) => !!(u && ENEMIES[u.id] && ENEMIES[u.id].gustEvery && !(u.ai && u.ai.bellowsOff));
/** The Gust length now: the shortest `gustEvery` among standing foes whose bellows run (ai.js sets u.ai.bellowsOff), else GUST_EVERY. */
export function gustEvery(ctx) {
  let n = GUST_EVERY;
  for (const u of ctx.living('enemy')) {
    const d = ENEMIES[u.id];
    if (d && d.gustEvery && !(u.ai && u.ai.bellowsOff)) n = Math.min(n, d.gustEvery);
  }
  return n;
}
function tell(ctx, reason) {
  const S = ctx.state.gale;
  ctx.emit({ type: 'gale', gustIn: S.gustIn, every: S.every, reason });
}
/** Aloft badges: emit `aloft` on every change (a Break grounds a foe; recovering lifts it; a summon joins). */
function refreshAloft(ctx) {
  const S = ctx.state.gale;
  for (const u of ctx.living('enemy')) {
    if (!windOf(u)) continue;
    const on = isAloft(u);
    if (S.aloft[u.uid] === on) continue;
    if (S.aloft[u.uid] !== undefined || on) ctx.emit({ type: 'aloft', target: u.uid, on });
    S.aloft[u.uid] = on;
  }
}
/** Re-read the Gust length (the bellows start or stop); a shorter Gust brings the next one nearer at once. */
export function refreshEvery(ctx, reason = 'bellows') {
  const S = ctx.state.gale;
  if (!S) return;
  const n = gustEvery(ctx);
  if (n === S.every) return;
  S.every = n;
  if (S.gustIn > n) S.gustIn = n;
  holdForBram(ctx);
  tell(ctx, reason);
}

// ----------------------------------------------------------------------------- pinned moves (the Rewrite, Full Blast)
/** Actions until Bram's next turn (1: the next action), or 0 when he will not stand there (down, Kept, Anchor unknown). */
export function bramNext(ctx) {
  const m = ctx.living('party').find((u) => u.id === 'bram');
  if (!m || ctx.kept(m) || !(m.skills || []).includes(ANCHOR)) return 0;
  const i = ctx.timeline(14).findIndex((r) => r.uid === m.uid && !r.skip);
  return i < 0 ? 0 : i + 1;
}
/** A pinned move is fair only if Bram can answer it: hold the Gust until his next turn has come. Returns true if it moved. */
export function holdForBram(ctx) {
  const S = ctx.state.gale;
  if (!S || !S.pinned || S.pinned.answered) return false;
  const n = bramNext(ctx);
  if (!n || n <= S.gustIn) return false;
  S.gustIn = n;
  return true;
}
/** Pin `skillId` of `source` to the Gust marker. Returns false if one is already pinned. */
export function pin(ctx, source, skillId) {
  const S = ctx.state.gale;
  if (!S || S.pinned || !source || !source.alive) return false;
  const sk = SKILLS[skillId];
  S.pinned = { source: source.uid, skill: skillId, answered: false };
  holdForBram(ctx);
  const text = (sk.telegraph || '').replace('{name}', source.name);
  ctx.emit({ type: 'rewrite', source: source.uid, pinned: true, gustIn: S.gustIn, skill: skillId });
  // the help window and the signature Tech read telegraphs: this one is pinned to the Gust, not to the foe's next turn
  ctx.emit({ type: 'telegraph', actor: source.uid, skill: skillId, name: sk.name, text, target: null,
    targets: ctx.living('party').map((u) => u.uid), nextTurn: S.gustIn, rewrite: true, sfx: sk.telegraphSfx || null });
  tell(ctx, 'hold');
  return true;
}
/** The pinned move fails before the Gust: reason 'break' (its owner was Broken) or 'gone' (its owner fell). */
export function cancelPin(ctx, reason) {
  const S = ctx.state.gale;
  const p = S && S.pinned;
  if (!p) return false;
  S.pinned = null;
  ctx.emit({ type: 'rewrite_broken', source: p.source, reason, skill: p.skill });
  ctx.emit({ type: 'telegraph_cancel', actor: p.source, skill: p.skill, reason });
  return true;
}
function land(ctx, p) {
  const S = ctx.state.gale;
  const src = ctx.U(p.source);
  if (!src || !src.alive) { ctx.emit({ type: 'rewrite_broken', source: p.source, reason: 'gone', skill: p.skill }); return; }
  const party = ctx.living('party').filter((u) => !ctx.kept(u));
  if (S.anchored) {
    // Anchor: the course holds; its owner is thrown back a full turn (the party's double turn)
    ctx.emit({ type: 'rewrite_broken', source: src.uid, reason: 'anchor', skill: p.skill, sfx: 'rewrite_break' });
    ctx.emit({ type: 'message', text: 'The course holds.', kind: 'rewrite_broken', target: src.uid, sfx: 'rewrite_break' });
    ctx.emit({ type: 'telegraph_cancel', actor: src.uid, skill: p.skill, reason: 'anchor' });
    ctx.delayUnit(src, PIN_PUSH, 'anchor');
    S.held++;
    return;
  }
  const sk = SKILLS[p.skill];
  ctx.emit({ type: 'rewrite_land', source: src.uid, skill: sk.id });
  ctx.emit({ type: 'action_start', actor: src.uid, action: { type: 'enemy', skill: sk.id, name: sk.name }, targets: party.map((u) => u.uid),
    fx: sk.fx || null, sfx: sk.sfx || null, charged: true });
  S.landed++;
  if (sk.formula !== 'none') {
    for (const t of party) if (t.alive) ctx.strike(src, t, { id: sk.id, formula: sk.formula, power: sk.power, types: sk.types, pierce: sk.pierce || 0 });
    for (const t of party) {
      if (!t.alive || t.defending) continue;
      push(ctx, t, (S.ballast[t.uid] ? PIN_BRACED : 1) * PIN_PUSH, sk.id);
    }
    ctx.emit({ type: 'message', text: 'The blast throws the party back.', kind: 'rewrite_land', target: src.uid });
    return;
  }
  for (const t of party) push(ctx, t, (isBraced(ctx.state, t) ? PIN_BRACED : 1) * PIN_PUSH, sk.id);
  // the owner writes itself first: it acts at once
  src.next = ctx.state.now;
  ctx.emit({ type: 'message', text: `The course is rewritten. ${src.name} goes first.`, kind: 'rewrite_land', target: src.uid });
}

// ----------------------------------------------------------------------------- the Gust
function gust(ctx) {
  const S = ctx.state.gale;
  S.gusts++;
  S.every = gustEvery(ctx);
  S.gustIn = S.every;
  ctx.emit({ type: 'message', text: blownMsg, kind: 'gust', sfx: 'gale_gust' });
  const pushed = [];
  const note = (u, f) => { if (f) pushed.push({ target: u.uid, amount: Math.round(f * 100) / 100, ticks: Math.round(baseDelay(ctx.eff(u, 'spd')) * f) }); };
  for (const u of ctx.living('party')) {
    if (ctx.kept(u)) continue;
    if (S.anchored) note(u, push(ctx, u, -GUST_PUSH, 'gust'));
    else if (!isBraced(ctx.state, u)) note(u, push(ctx, u, GUST_PUSH, 'gust'));
  }
  for (const u of ctx.living('enemy')) {
    if (!windOf(u)) continue;
    if (isAloft(u)) { if (RIDE) note(u, push(ctx, u, -GUST_PUSH, 'gust')); }
    else if (!u.defending && !ownsWind(u)) note(u, push(ctx, u, GUST_PUSH, 'gust'));
  }
  ctx.emit({ type: 'gust', pushed });
  const p = S.pinned;
  S.pinned = null;
  if (p) land(ctx, p);
  if (S.anchored) {
    S.anchored = false;
    ctx.emit({ type: 'anchored', targets: ctx.living('party').map((u) => u.uid), on: false });
  }
  for (const uid of Object.keys(S.ballast)) ctx.emit({ type: 'braced', target: uid, on: false, by: 'ballast' });
  S.ballast = {};
}

// ----------------------------------------------------------------------------- the levers
/** Anchor: called once per use (the bridge). The whole party is Anchored through the next Gust. */
export function anchor(ctx, by) {
  const S = ctx.state.gale;
  if (!S) { ctx.emit({ type: 'message', text: 'No wind to hold.', kind: 'no_sky' }); return false; }
  if (S.handled === ctx.state.turn) return false;   // applied already this action
  S.handled = ctx.state.turn;
  S.anchors++;
  if (S.pinned && by && by.id === 'bram') S.pinned.answered = true;
  if (!S.anchored) {
    S.anchored = true;
    ctx.emit({ type: 'anchored', targets: ctx.living('party').map((u) => u.uid), on: true, by: by ? by.uid : null, sfx: 'anchor_set' });
  }
  ctx.emit({ type: 'message', text: 'Bram sets the anchor. The party holds through the next gust.', kind: 'anchor', target: by ? by.uid : null, sfx: 'anchor_set' });
  return true;
}
function ballast(ctx, units) {
  const S = ctx.state.gale;
  const used = ctx.state.itemsUsed[BALLAST] || 0;
  if (used <= S.ballastUsed) return;
  S.ballastUsed = used;
  // rules.js tells a rule which unit acted, not whom its item was used on: the stone braces the member who used it
  for (const u of [].concat(units)) {
    if (!u || u.side !== 'party' || !u.alive) continue;
    S.ballast[u.uid] = true;
    ctx.emit({ type: 'braced', target: u.uid, on: true, by: 'ballast' });
    ctx.emit({ type: 'message', text: `${u.name} braces with the Ballast Stone.`, kind: 'ballast', target: u.uid });
  }
}

// ----------------------------------------------------------------------------- the RULE_EXT hook
export const GALE_RULE = {
  id: 'ep6_gale',
  start(ctx) {
    const st = ctx.state;
    if (st.gale || !windy(ctx)) return;
    const forced = GALE_START[st.options.encounter] || null;
    const every = gustEvery(ctx);
    st.gale = { gustIn: Math.min((forced && forced.gustIn) || every, every), every, gusts: 0, pinned: null, anchored: false,
      ballast: {}, ballastUsed: st.itemsUsed[BALLAST] || 0, aloft: {}, handled: -1, anchors: 0, held: 0, landed: 0 };
    refreshAloft(ctx);
    tell(ctx, 'start');
  },
  afterAction(ctx, units) {
    const S = ctx.state.gale;
    if (!S) return;
    ballast(ctx, units);
    S.gustIn--;
    // a pinned move waits for Bram's turn (once he has had it, the Gust keeps its time)
    if (S.pinned && !S.pinned.answered) {
      if ([].concat(units).some((u) => u && u.id === 'bram')) S.pinned.answered = true;
      else if (holdForBram(ctx)) ctx.emit({ type: 'rewrite', source: S.pinned.source, pinned: true, gustIn: S.gustIn, skill: S.pinned.skill, moved: true });
    }
    if (S.gustIn <= 0) gust(ctx);
    refreshAloft(ctx);
    tell(ctx, 'action');
  },
};

// ----------------------------------------------------------------------------- Turn the Sky with no sky, Anchor with no wind
// Today (checked 2026-11-09, qa/battle/ep6_battle.test.mjs) Mira's Turn the Sky in a battle with no sky (an Episode 1 to 4 revisit,
// the cave, the tier, every Episode 6 battle) is listed, enabled, and spends her turn and 12 MP on "There is no sky to turn here.".
// rules.js commands() has no hook, so from inside the pack SKILL_GATE (a RULE_EXT `start`, after the sky and the Gale have
// started) takes the skill out of that battle's own copy of the member's skills (the saved member and every other battle keep
// it): it cannot be chosen, by the menu or by Auto. Episode 5 is untouched: every Episode 5 battle has a sky. Anchor is gated the
// same way in a battle with no wind. The reason is kept in `state.gated` ({ unit, skill, reason }); gateCommands() below puts the
// row back, disabled with that reason ("No sky to turn."), for a scene that wraps battle.commands (E6-scene-ui's seam: the
// vow view in src/scenes/battle.js is the pattern).
export const GATES = [
  { skill: 'turn_sky', when: (st) => !st.sky, reason: 'No sky to turn.' },
  { skill: ANCHOR, when: (st) => !st.gale, reason: 'No wind to hold.' },
];
export const SKILL_GATE = {
  id: 'ep6_skill_gate',
  start(ctx) {
    const st = ctx.state;
    if (st.gated) return;
    const gated = [];
    for (const u of ctx.living('party')) {
      for (const g of GATES) {
        if (!(u.skills || []).includes(g.skill) || !g.when(st)) continue;
        u.skills = u.skills.filter((s) => s !== g.skill);
        gated.push({ unit: u.uid, skill: g.skill, reason: g.reason });
      }
    }
    if (gated.length) st.gated = gated;   // a battle with nothing gated carries no new state
  },
};
/** A battle's command list with every gated skill shown again, disabled, with its reason (for the scene's menu). Pure. */
export function gateCommands(b, unit, cmds) {
  const gated = ((b && b.state && b.state.gated) || []).filter((g) => g.unit === (unit && unit.uid ? unit.uid : unit));
  if (!gated.length) return cmds;
  return cmds.map((c) => {
    if (c.id !== 'tech') return c;
    const extra = gated.filter((g) => SKILLS[g.skill] && !(c.list || []).some((e) => e.skill === g.skill)).map((g) => {
      const s = SKILLS[g.skill];
      return { skill: s.id, name: s.name, mp: s.mp, help: s.help, enabled: false, reason: g.reason };
    });
    return extra.length ? { ...c, list: [...(c.list || []), ...extra] } : c;
  });
}

// The bridge: rules.js applyEffect() -> ai.js special(ctx, user, sk, e, targets) -> the user's script; a party member's is `basic`.
// It answers Anchor, and Turn the Sky in a Gale with no sky (should it ever be cast there: the gate keeps it out of the list).
function bridge(ctx, u, sk, e) {
  if (e.gale === 'anchor') { anchor(ctx, u); return sk.rank || 80; }
  return null;
}

let done = false;
/** Push the rule and the gate onto RULE_EXT and bridge Anchor (never twice). Safe to call twice. Run after the ep5 sky. */
export function register() {
  if (done) return;
  if (!RULE_EXT.includes(GALE_RULE)) RULE_EXT.push(GALE_RULE);
  if (!RULE_EXT.includes(SKILL_GATE)) RULE_EXT.push(SKILL_GATE);
  const basic = SCRIPTS.basic;
  if (basic && !(basic.special && basic.special.ep6Gale)) {
    const prev = basic.special;
    const special = function (ctx, u, sk, e, targets) {
      if (e && e.gale) return bridge(ctx, u, sk, e, targets);
      if (e && e.sky === 'turn' && !ctx.state.sky && ctx.state.gale) {
        ctx.emit({ type: 'message', text: 'The wind is not the sky.', kind: 'rewrite_sky', target: u.uid });
        return sk.rank || 80;
      }
      return prev ? prev.call(this, ctx, u, sk, e, targets) : null;
    };
    special.ep6Gale = true;
    basic.special = special;
  }
  done = true;
}
export default register;
