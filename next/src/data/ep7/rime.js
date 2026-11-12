// Rime (E7-battle; docs/EPISODE7_PLAN.md 6.3): Episode 7's one battle rule, as pack code on rules.js RULE_EXT (Episode 5's seam:
// `start`, `afterAction`). Pure: no DOM, canvas or audio; no randomness (it never draws from ctx.R).
//
// Every battle in which a foe has `cold: true` (src/data/ep7/enemies.js) has Rime, kept in `ctx.state.rime` (so it saves and
// restores with the battle state). Battles with no cold foe get no Rime, no events and no state: Episodes 1 to 6, the cave and
// the tier play exactly as before. No encounter field is added (the rollEncounter and rules.js double-entry trap is avoided).
//
// - PARTY ONLY. Rime is a count of 0 to 3 on each party member; no foe ever holds Rime, and nothing a foe does to the party slows
//   that foe (the Gale Engine lesson, PLAYTEST_REVIEW_8 item 1). addRime() refuses any unit that is not a party member.
// - HOW A COLD MOVE'S TARGETS REACH THE RULE (the brief's first check). RULE_EXT.afterAction(ctx, units) is told who ACTED, never
//   whom they hit, so it cannot add Rime. The move's effect `{ keep: 'rime', rime: n }` can: rules.js useSkill() applies effects to
//   the members the move actually hit (a miss is left out) and applyEffect() hands any `keep` effect to ai.js special() with those
//   targets. Every Episode 7 foe script answers `e.rime` through addRime() (src/data/ep7/ai.js). Call reaches the rule the same way
//   from the hero's `basic` script (register() below chains a `special` onto it, as Episodes 5 and 6 did).
// - FROZEN at 3: the member is pushed back a full turn (FROZEN_PUSH: it loses its next turn) and takes FROZEN_MULT (x1.4) damage
//   until it next acts; its Rime goes to 0 and no Rime builds while it is Frozen. rules.js has no damage-taken hook for a party
//   member (ai.js damageTakenMult asks enemy scripts only), so the multiplier is two timed stat mods (source 'frozen', one turn) on
//   DEF and SPR, sized at the moment of freezing so DEF_K / (DEF_K + D) grows by exactly FROZEN_MULT for that member's own DEF and
//   SPR (a member whose DEF is already tiny gets what is left: the mod never goes under 0.01).
// - SHEDDING. Defend sheds all of a member's Rime and keeps it Warm (no Rime added) until its next turn. Ember Tea sheds 1 from
//   every ally (party-wide, so it needs no item-target seam: BATTLE 14.8). Call sheds all from one ally.
// - PINS. Farewell (the White Phantom) and Borrowed Light (the Pale Lantern) are pinned on one non-hero member (pin()) and land on
//   their owner's next turn (the owner's script calls land()). holdForHero: the owner's turn is held until the hero has acted after
//   the pin (Episode 6's holdForBram pattern), at the pin and after every action until the hero has acted (a Frozen push included).
//   Call on the pin's target breaks it and throws its owner back a full turn (the party's double turn); a Break of its owner
//   cancels it (the charge rule); so does its owner's fall. A landed Borrowed Light Freezes its target whatever their Rime; a landed
//   Farewell Stills them.
// - STILLED (the brief's second check). Built on the existing untargetable rule, Episode 2's Kept seal (rules.js `kept`): a Stilled
//   member carries statuses.kept, set directly (no status_add event, so the scene draws no mirror), so rules.js skips their turns,
//   foes cannot target them and party-wide foe hits pass them by, while allies can (Call is `canTargetKept`). They return after
//   STILL_TURNS party turns (other members' turns), when Called, or when the source is Broken (or falls). Plan 14 assumption 3's
//   fallback (pushed back two turns and covered) is not needed. Mira's Recall and a Silver Salve cure Kept (`cure: ['kept']`), but a
//   farewell is not a mirror: afterAction puts the seal back at once ("The farewell holds."), their heal and Silence cure still
//   land, and Auto never spends a turn on it (src/data/ep7/ai.js). The answers stay the hero's Call, a Break, and time.
//
// Events (the scene draws them; E7-scene-ui): `rime` { reason: 'start', rime: { uid: n } }; `rime_add` { target, rime, delta,
// reason: 'cold' | 'defend' | 'tea' | 'call' | 'frozen', source? } (every change, sheds included: delta < 0); `frozen` { target,
// reason: 'rime' | 'borrowed' }; `warm` { target, on }; `farewell` { source, target, pinned, skill, moved? } and a `telegraph`
// with `farewell: true`; `farewell_broken` { source, target, reason: 'call' | 'break' | 'gone', skill }; `farewell_land` { source,
// target, skill }; `stilled` { target, on, source? }; `stilled_end` { target, reason: 'call' | 'time' | 'break' | 'freed' }.
// Messages carry kind 'rime_frozen', 'rime_warm', 'rime_tea', 'call', 'farewell_broken', 'farewell_land', 'stilled', 'stilled_hold',
// 'no_cold'.

import { RULE_EXT, DEF_K } from '../../battle/rules.js';
import { SCRIPTS } from '../../battle/ai.js';
import { baseDelay } from '../../battle/ctb.js';
import { ENEMIES } from '../enemies.js';
import { SKILLS } from '../skills.js';

export const RIME_MAX = 3;          // at 3 a member is Frozen
export const FROZEN_PUSH = 1.0;     // plan 6.6 knob 1: a full turn back
export const FROZEN_MULT = 1.4;     // knob 1: damage taken while Frozen (a landed Borrowed Light: the Lantern's `borrowMult`)
/** The live knobs (the simulator's tuning reads and writes these; the constants above are the shipped values). */
export const RIME_TUNE = { frozenPush: FROZEN_PUSH, frozenMult: FROZEN_MULT };
export const CALL_PUSH = -0.25;     // Call: the ally comes round sooner (clamped)
export const PIN_PUSH = 1.0;        // a pin broken by Call: its owner a full turn back
export const STILL_TURNS = 2;       // a Stilled member returns after this many party turns (a source's data `stillTurns` overrides)
export const TEA = 'ember_tea';
export const TEA_SHED = 1;
export const CALL = 'call_name';
export const HERO = 'hero';
export const RIME_SOURCE = 'frozen';

const POSS = { hero: 'their', mira: 'her', bram: 'his' };
const SUBJ = { mira: 'She', bram: 'He' };
const OBJ = { mira: 'her', bram: 'him' };

// ----------------------------------------------------------------------------- reads (for the policy, the scene and tests)
/** The battle's Rime state, or null (no cold foe). Takes a battle, its state, or a rule ctx. */
export function rimeState(x) {
  const st = x && x.state && x.state.units ? x.state : x;
  return (st && st.rime) || null;
}
/** Is `u` a cold foe (from its data)? */
export const isCold = (u) => !!(u && u.side === 'enemy' && ENEMIES[u.id] && ENEMIES[u.id].cold);
/** A party member's Rime (0 when the battle has none). */
export function rimeOf(x, uid) { const S = rimeState(x); return (S && S.r[uid]) || 0; }
/** Is the member Stilled (a landed Farewell holds them)? */
export function isStilled(x, uid) { const S = rimeState(x); return !!(S && S.stilled[uid]); }
/** Is the member Frozen (pushed back, x1.4 damage, until it acts)? */
export function isFrozen(x, uid) { const S = rimeState(x); return !!(S && S.frozen[uid]); }
/** Is the member Warm (Defended or Called since its last turn: no Rime is added)? */
export function isWarm(x, uid) { const S = rimeState(x); return !!(S && S.warm[uid]); }
/** The pinned Farewell or Borrowed Light, or null: { source, target, skill, heroActed }. */
export function pinOf(x) { const S = rimeState(x); return (S && S.pin) || null; }

// ----------------------------------------------------------------------------- the push (Episode 6's clamped push)
/**
 * Push `u` along the timeline by `frac` of its base delay through ctx.delayUnit. A negative push (sooner) is clamped to the room
 * the unit has, so its next turn never falls before now (BATTLE 14.2's negative-push check). Returns the fraction applied.
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
  if (u.next < ctx.state.now) u.next = ctx.state.now;
  return f;
}

// ----------------------------------------------------------------------------- Rime on a member
function set(ctx, u, n, reason, source) {
  const S = ctx.state.rime;
  const before = S.r[u.uid] || 0;
  const v = Math.max(0, Math.min(RIME_MAX, n));
  if (v === before) return 0;
  S.r[u.uid] = v;
  ctx.emit({ type: 'rime_add', target: u.uid, rime: v, delta: v - before, reason, source: source ? source.uid : null });
  return v - before;
}
/** A cold move hit `u` (a party member): add `n` Rime unless it is Warm, Frozen or Stilled. Frozen at 3. Returns the Rime added. */
export function addRime(ctx, u, n, source) {
  const S = ctx.state.rime;
  if (!S || !u || u.side !== 'party' || !u.alive || !(n > 0)) return 0;
  if (S.warm[u.uid] || S.frozen[u.uid] || S.stilled[u.uid]) return 0;
  const got = set(ctx, u, (S.r[u.uid] || 0) + n, 'cold', source);
  S.stats.added += got;
  if (S.r[u.uid] >= RIME_MAX) freeze(ctx, u, 'rime');
  return got;
}
/** Shed `n` Rime ('all' for every one) from `u`. Returns the Rime shed. */
export function shed(ctx, u, n, reason) {
  const S = ctx.state.rime;
  if (!S || !u || u.side !== 'party') return 0;
  const before = S.r[u.uid] || 0;
  return -set(ctx, u, n === 'all' ? 0 : before - n, reason);
}
function setWarm(ctx, u, on) {
  const S = ctx.state.rime;
  if (!!S.warm[u.uid] === on) return;
  if (on) S.warm[u.uid] = true; else delete S.warm[u.uid];
  ctx.emit({ type: 'warm', target: u.uid, on });
}
/** FROZEN_MULT as DEF and SPR mods: DEF_K / (DEF_K + D') = FROZEN_MULT * DEF_K / (DEF_K + D) for the member's D now. */
export function frozenMult(d, mult = RIME_TUNE.frozenMult) {
  const want = (DEF_K + d) / mult - DEF_K;
  return Math.max(0.01, Math.min(1, want / Math.max(1, d)));
}
/** Frozen: a full turn back, FROZEN_MULT (or `mult`) damage taken until it acts, Rime to 0. */
export function freeze(ctx, u, reason = 'rime', mult = RIME_TUNE.frozenMult) {
  const S = ctx.state.rime;
  if (!S || !u || u.side !== 'party' || !u.alive) return false;
  set(ctx, u, 0, 'frozen');
  u.mods = u.mods.filter((m) => m.source !== RIME_SOURCE);
  for (const stat of ['def', 'spr']) u.mods.push({ stat, mult: frozenMult(ctx.eff(u, stat), mult), turns: 1, source: RIME_SOURCE });
  S.frozen[u.uid] = true;
  S.stats.frozen++;
  push(ctx, u, RIME_TUNE.frozenPush, 'frozen');
  ctx.emit({ type: 'frozen', target: u.uid, reason, sfx: 'rime_freeze' });
  const tail = SUBJ[u.id] ? `${SUBJ[u.id]} misses ${POSS[u.id]} turn.` : `${u.name} misses a turn.`;
  ctx.emit({ type: 'message', text: `${u.name}'s name frosts over. ${tail}`, kind: 'rime_frozen', target: u.uid, sfx: 'rime_freeze' });
  return true;
}
function thaw(ctx, u) {
  const S = ctx.state.rime;
  if (!S.frozen[u.uid]) return;
  delete S.frozen[u.uid];
  u.mods = u.mods.filter((m) => m.source !== RIME_SOURCE);
}

// ----------------------------------------------------------------------------- Stilled
/** A landed Farewell: `t` keeps its place, has no turn, foes cannot target it (the Kept seal), allies can. */
export function still(ctx, t, source) {
  const S = ctx.state.rime;
  if (!S || !t || !t.alive || S.stilled[t.uid]) return false;
  t.statuses.kept = { turns: 99 };   // rules.js kept(): skipped turns, untargetable by foes; set directly so no mirror is drawn
  const d = source ? ENEMIES[source.id] || {} : {};
  S.stilled[t.uid] = { source: source ? source.uid : null, left: d.stillTurns ?? STILL_TURNS };
  S.stats.stilled++;
  ctx.emit({ type: 'stilled', target: t.uid, on: true, source: source ? source.uid : null });
  ctx.emit({ type: 'message', text: `${t.name} goes still. The farewell holds ${OBJ[t.id] || 'them'}.`,
    kind: 'stilled', target: t.uid, sfx: 'rime_freeze' });
  return true;
}
/** A Stilled member comes back: reason 'call' | 'time' | 'break'. */
export function unstill(ctx, t, reason) {
  const S = ctx.state.rime;
  if (!S || !t || !S.stilled[t.uid]) return false;
  delete S.stilled[t.uid];
  if (t.statuses && t.statuses.kept) delete t.statuses.kept;
  S.stats.back[reason] = (S.stats.back[reason] || 0) + 1;
  ctx.emit({ type: 'stilled', target: t.uid, on: false });
  ctx.emit({ type: 'stilled_end', target: t.uid, reason });
  if (t.alive) ctx.emit({ type: 'message', text: `${t.name} comes back.`, kind: 'stilled', target: t.uid });
  return true;
}

// ----------------------------------------------------------------------------- pins (Farewell, Borrowed Light)
const heroUnit = (ctx) => ctx.living('party').find((u) => u.id === HERO) || null;
/** Actions until the hero's next turn (1: the next action), or 0 when the hero is down. */
export function heroNext(ctx) {
  const h = heroUnit(ctx);
  if (!h) return 0;
  const i = ctx.timeline(14).findIndex((r) => r.uid === h.uid);
  return i < 0 ? 0 : i + 1;
}
/** A pin is fair only if the hero can answer it: hold its owner's turn until the hero has had one. Returns true if it moved. */
export function holdForHero(ctx) {
  const S = ctx.state.rime;
  const p = S && S.pin;
  if (!p || p.heroActed) return false;
  const h = heroUnit(ctx), src = ctx.U(p.source);
  if (!h || !src || !src.alive) return false;
  if (src.next > h.next) return false;
  src.next = h.next + 1;
  return true;
}
/** Pin `skillId` of `source` on party member `target` (never the hero). Returns false if one is already pinned. */
export function pin(ctx, source, target, skillId) {
  const S = ctx.state.rime;
  if (!S || S.pin || !source || !source.alive || !target || !target.alive || target.id === HERO || S.stilled[target.uid]) return false;
  if (!heroUnit(ctx)) return false;
  const sk = SKILLS[skillId];
  S.pin = { source: source.uid, target: target.uid, skill: skillId, heroActed: false };
  S.stats.pins++;
  holdForHero(ctx);
  ctx.emit({ type: 'farewell', source: source.uid, target: target.uid, pinned: true, skill: skillId });
  const text = (sk.telegraph || '').replace('{name}', source.name).replace('{target}', target.name);
  ctx.emit({ type: 'telegraph', actor: source.uid, skill: skillId, name: sk.name, text, target: target.uid, targets: [target.uid],
    nextTurn: ctx.turnsUntil(source.uid), farewell: true, sfx: sk.telegraphSfx || null });
  return true;
}
/** The pin ends early: reason 'break' (its owner was Broken) or 'gone' (its owner or its target fell). */
export function cancelPin(ctx, reason) {
  const S = ctx.state.rime;
  const p = S && S.pin;
  if (!p) return false;
  S.pin = null;
  S.stats[reason === 'break' ? 'broke' : 'gone']++;
  ctx.emit({ type: 'farewell_broken', source: p.source, target: p.target, reason, skill: p.skill });
  ctx.emit({ type: 'telegraph_cancel', actor: p.source, skill: p.skill, reason });
  return true;
}
/** Its owner's turn has come: the pin lands (the owner's script calls this from its own turn). Returns true if it landed. */
export function land(ctx, src) {
  const S = ctx.state.rime;
  const p = S && S.pin;
  if (!p || !src || p.source !== src.uid) return false;
  const t = ctx.U(p.target);
  // a Farewell that would leave no one standing who is not Stilled does not land (rules.js would read it as THE KING KEEPS YOU ALL)
  const others = ctx.living('party').filter((u) => u.uid !== p.target && !S.stilled[u.uid]);
  if (!t || !t.alive || (p.skill === 'farewell' && !others.length)) { cancelPin(ctx, 'gone'); return false; }
  S.pin = null;
  S.stats.landed++;
  ctx.emit({ type: 'farewell_land', source: src.uid, target: t.uid, skill: p.skill });
  ctx.emit({ type: 'telegraph_cancel', actor: src.uid, skill: p.skill, reason: 'landed' });
  if (p.skill === 'borrowed_light') {
    const d = ENEMIES[src.id] || {};
    ctx.emit({ type: 'message', text: `The Lantern takes ${t.name}'s light.`, kind: 'farewell_land', target: t.uid, sfx: 'rime_freeze' });
    freeze(ctx, t, 'borrowed', d.borrowMult || RIME_TUNE.frozenMult);
    ctx.heal(src, src.maxHp * (d.borrowHeal || 0.08), src, { skill: p.skill });
  } else {
    still(ctx, t, src);
  }
  return true;
}
function breakByCall(ctx, t) {
  const S = ctx.state.rime;
  const p = S.pin;
  if (!p || p.target !== t.uid) return false;
  S.pin = null;
  S.stats.called++;
  const src = ctx.U(p.source);
  const poss = POSS[t.id] || 'their';
  const tail = p.skill === 'borrowed_light' ? `The light stays with ${OBJ[t.id] || 'them'}.` : 'The farewell does not hold.';
  ctx.emit({ type: 'farewell_broken', source: p.source, target: t.uid, reason: 'call', skill: p.skill, sfx: 'farewell_break' });
  ctx.emit({ type: 'telegraph_cancel', actor: p.source, skill: p.skill, reason: 'call' });
  ctx.emit({ type: 'message', text: `${t.name} hears ${poss} name. ${tail}`, kind: 'farewell_broken', target: t.uid, sfx: 'farewell_break' });
  if (src && src.alive) ctx.delayUnit(src, PIN_PUSH, 'call');
  return true;
}
/** Its owner was Broken: the pin is cancelled and every member it Stilled comes back (reason 'break'). */
export function onSourceBroken(ctx, src) {
  const S = ctx.state.rime;
  if (!S || !src) return;
  if (S.pin && S.pin.source === src.uid) cancelPin(ctx, 'break');
  for (const [uid, s] of Object.entries(S.stilled)) if (s.source === src.uid) unstill(ctx, ctx.U(uid), 'break');
}
/** Its owner fell: the pin is gone and every member it Stilled comes back. */
export function onSourceGone(ctx, src) {
  const S = ctx.state.rime;
  if (!S || !src) return;
  if (S.pin && S.pin.source === src.uid) cancelPin(ctx, 'gone');
  for (const [uid, s] of Object.entries(S.stilled)) if (s.source === src.uid) unstill(ctx, ctx.U(uid), 'break');
}

// ----------------------------------------------------------------------------- Call
/** The hero says `t`'s name: sheds all Rime, Warm, a quarter turn sooner; breaks a pin on them; a Stilled ally returns. */
export function callName(ctx, by, t) {
  const S = ctx.state.rime;
  if (!S) { ctx.emit({ type: 'message', text: 'No cold to call through.', kind: 'no_cold' }); return false; }
  if (!t || t.side !== 'party' || !t.alive || (by && t.uid === by.uid)) return false;
  S.stats.calls++;
  ctx.emit({ type: 'message', text: `${by ? by.name : 'The hero'} calls ${t.name}.`, kind: 'call', target: t.uid, sfx: 'call_cast' });
  breakByCall(ctx, t);
  if (S.stilled[t.uid]) unstill(ctx, t, 'call');
  thaw(ctx, t);
  shed(ctx, t, 'all', 'call');
  setWarm(ctx, t, true);
  push(ctx, t, CALL_PUSH, 'call');
  return true;
}

// ----------------------------------------------------------------------------- the RULE_EXT hook
function cold(ctx) { return ctx.living('enemy').some((u) => isCold(u)); }
export const RIME_RULE = {
  id: 'ep7_rime',
  start(ctx) {
    const st = ctx.state;
    if (st.rime || !cold(ctx)) return;
    const r = {};
    for (const u of ctx.all()) if (u.side === 'party') r[u.uid] = 0;
    st.rime = { r, warm: {}, frozen: {}, stilled: {}, pin: null, teaUsed: st.itemsUsed[TEA] || 0,
      stats: { added: 0, frozen: 0, calls: 0, pins: 0, called: 0, broke: 0, gone: 0, landed: 0, stilled: 0, back: {} } };
    ctx.emit({ type: 'rime', reason: 'start', rime: { ...r } });
  },
  afterAction(ctx, units) {
    const S = ctx.state.rime;
    if (!S) return;
    const acted = [].concat(units).filter(Boolean);
    // Ember Tea (rules.js tells a rule which unit acted, not whom its item went to: the tea is party-wide by design)
    const used = ctx.state.itemsUsed[TEA] || 0;
    if (used > S.teaUsed) {
      for (let i = S.teaUsed; i < used; i++) for (const m of ctx.living('party')) shed(ctx, m, TEA_SHED, 'tea');
      S.teaUsed = used;
      ctx.emit({ type: 'message', text: 'The Ember Tea warms the party.', kind: 'rime_tea' });
    }
    for (const u of acted) {
      if (u.side !== 'party' || !u.alive) continue;
      thaw(ctx, u);
      setWarm(ctx, u, false);
      // Defend (not a Guard, which also sets `defending` but covers someone): shake it off, Warm until the next turn
      if (u.defending && !u.cover) {
        const had = S.r[u.uid] || 0;
        shed(ctx, u, 'all', 'defend');
        setWarm(ctx, u, true);
        if (had) ctx.emit({ type: 'message', text: `${u.name} shakes off the cold.`, kind: 'rime_warm', target: u.uid });
      }
    }
    // a pinned move waits for the hero's turn (once the hero has had it, the owner keeps its time)
    const p = S.pin;
    if (p && !p.heroActed) {
      if (acted.some((u) => u.id === HERO && u.side === 'party')) p.heroActed = true;
      else if (holdForHero(ctx)) ctx.emit({ type: 'farewell', source: p.source, target: p.target, pinned: true, skill: p.skill, moved: true });
    }
    // Stilled: back after STILL_TURNS turns of the other members; freed by Recall or a Silver Salve; its source gone
    for (const [uid, s] of Object.entries(S.stilled)) {
      const t = ctx.U(uid);
      if (!t || !t.alive) { delete S.stilled[uid]; continue; }
      if (!(t.statuses && t.statuses.kept)) {
        // Recall or a Silver Salve cured Kept: a farewell is not a mirror, the seal goes back on
        t.statuses.kept = { turns: 99 };
        const by = acted.find((u) => u.side === 'party');
        ctx.emit({ type: 'stilled_hold', target: t.uid, by: by ? by.uid : null });
        ctx.emit({ type: 'message', text: `The farewell holds. Only a name said in time reaches ${t.name}.`, kind: 'stilled_hold', target: t.uid });
      }
      const src = s.source ? ctx.U(s.source) : null;
      if (s.source && (!src || !src.alive)) { unstill(ctx, t, 'break'); continue; }
      if (acted.some((u) => u.side === 'party' && u.uid !== uid)) s.left--;
      if (s.left <= 0) unstill(ctx, t, 'time');
    }
    for (const u of ctx.all()) {
      if (u.side !== 'party' || u.alive) continue;
      S.r[u.uid] = 0; delete S.frozen[u.uid]; delete S.warm[u.uid];
    }
  },
};

// ----------------------------------------------------------------------------- Call with no cold
// Call in a battle with no cold foe (an Episode 1 to 6 revisit, the cave, the tier) is taken out of that battle's own copy of the
// hero's skills, as Episode 6's SKILL_GATE does for Turn the Sky and Anchor (src/data/ep6/gale.js: the saved member and every other
// battle keep it), with its reason kept in `state.gated` ({ unit, skill, reason }) for gale.js gateCommands() and the scene's menu
// wrap. Run after RIME_RULE and after Episode 6's SKILL_GATE (which returns early once `state.gated` exists): this one appends.
export const CALL_GATE = {
  id: 'ep7_call_gate',
  start(ctx) {
    const st = ctx.state;
    if (st.rime) return;
    for (const u of ctx.living('party')) {
      if (!(u.skills || []).includes(CALL)) continue;
      u.skills = u.skills.filter((s) => s !== CALL);
      (st.gated = st.gated || []).push({ unit: u.uid, skill: CALL, reason: 'No cold to call through.' });
    }
  },
};

// The bridge: rules.js applyEffect() -> ai.js special(ctx, user, sk, e, targets) -> the user's script; a party member's is `basic`.
function bridge(ctx, u, sk, e, targets) {
  if (e.rime === 'call') { callName(ctx, u, (targets || [])[0] || null); return sk.rank || 80; }
  if (typeof e.rime === 'number') { for (const t of targets || []) addRime(ctx, t, e.rime, u); return null; }
  return null;
}
/** For the Episode 7 foe scripts (src/data/ep7/ai.js): their `special` answers a cold move through here. */
export function rimeSpecial(ctx, u, sk, e, targets) { return bridge(ctx, u, sk, e, targets); }

let done = false;
/** Push the rule and the gate onto RULE_EXT and bridge Call (never twice). Safe to call twice. Run after the ep6 gale. */
export function register() {
  if (done) return;
  if (!RULE_EXT.includes(RIME_RULE)) RULE_EXT.push(RIME_RULE);
  if (!RULE_EXT.includes(CALL_GATE)) RULE_EXT.push(CALL_GATE);
  const basic = SCRIPTS.basic;
  if (basic && !(basic.special && basic.special.ep7Rime)) {
    const prev = basic.special;
    const special = function (ctx, u, sk, e, targets) {
      if (e && e.rime !== undefined) return bridge(ctx, u, sk, e, targets);
      return prev ? prev.call(this, ctx, u, sk, e, targets) : null;
    };
    special.ep7Rime = true;
    basic.special = special;
  }
  done = true;
}
export default register;
