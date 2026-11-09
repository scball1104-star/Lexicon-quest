// The Turning Sky (E5-battle; docs/EPISODE5_PLAN.md 6.3): Episode 5's one battle rule, as pack code on rules.js RULE_EXT
// (plan 13.2 seam 4, E5-pack). Pure: no DOM, canvas or audio; no randomness (it never draws from ctx.R).
//
// Every battle in which a foe has a `sky` side ('sun' | 'star', src/data/ep5/enemies.js) has a sky, Day or Night, kept in
// `ctx.state.sky` (so it saves and restores with the battle state). Battles with no sided foe get no sky, no events and no
// state: Episodes 1 to 4, the cave and the tier play exactly as before.
//
// - The start: SKY_START[encounter] (encounters.js) if it names one, else the field hour (setFieldHour: dawn or noon Day, dusk
//   or night Night; Day if unset). The Turn falls after TURN_EVERY actions (any unit's ended turn counts; a combo is one).
// - Under its own sky a foe is Ascendant (ATK and MAG x1.2: a mod in addMod's shape, source 'sky'); under the other it is
//   Exposed (`u.exposed`, read by rules.js affinity(): every hit is a weakness hit for its shields and its damage, and the
//   bestiary never learns it). A Broken foe stays Broken across a Turn.
// - A natural Turn: "The sky turns. Night." Foes with `mirrorTurn` (the Mirage Knight, the Oracle's True Horizon) take the side
//   of the new sky; a Double (`u.mirrorOf`) takes the side opposite its Knight. Then a foretelling pinned to the Turn falls.
// - Turn the Sky (Mira): the sky turns now, the Turn resets to TURN_EVERY, no foe mirrors; a pinned foretelling fails ("The words
//   change.") and its owner is Broken.
// - Hourglass Sand: +HOLD actions before the next Turn (a pinned foretelling moves with the marker).
//
// Events (the scene draws them; E5-scene-ui): `sky` { sky, turnIn, reason } after every change of either; `sky_turn` { sky,
// natural, by }; `exposed` { target, on }; `ascendant` { target, on }; `foretell` { source, target, pinned, turnIn };
// `foretell_broken` { source, target, reason: 'turned' | 'break' | 'gone' }; `foretell_fall` { source, target }. Messages carry
// kind 'sky', 'mirror_turn', 'foretell', 'foretell_broken', 'starless', 'sky_hold'.
//
// Wiring: register() pushes SKY_RULE onto RULE_EXT ({ start, afterAction, skill }) and bridges Turn the Sky (see skills.js:
// ai.js special() of the `basic` script, the only path a party skill's own effect has today). If rules.js later calls
// `h.skill(ctx, user, sk, targets)` itself, the bridge stands down (each action is applied once).

import { RULE_EXT } from '../../battle/rules.js';
import { SCRIPTS } from '../../battle/ai.js';
import { ENEMIES } from '../enemies.js';
import { SKILLS } from '../skills.js';
import { SKY_START } from './encounters.js';

export const TURN_EVERY = 6;      // actions between Turns (plan 6.6 knob 1)
export const ASCENDANT = 0.2;     // ATK and MAG an Ascendant foe gains (knob 2)
export const HOLD = 3;            // actions Hourglass Sand adds before the next Turn
export const HOURS = ['dawn', 'noon', 'dusk', 'night'];
export const SKY_SOURCE = 'sky';  // the mods' source
const SAND = 'hourglass_sand';

// ----------------------------------------------------------------------------- the field hour
let fieldHour = null;
/** The field calls this on every hour change and map entry (E5-world); the simulator per zone. Unknown hours clear it. */
export function setFieldHour(h) { fieldHour = HOURS.includes(h) ? h : null; return fieldHour; }
export function getFieldHour() { return fieldHour; }
/** The sky an hour opens under: dawn and noon Day, dusk and night Night; Day when unset. */
export function skyForHour(h) { return h === 'dusk' || h === 'night' ? 'night' : 'day'; }
export const other = (s) => (s === 'day' ? 'night' : 'day');
/** The side at home under a sky. */
export const sideOf = (sky) => (sky === 'day' ? 'sun' : 'star');
const NAME = { day: 'Day', night: 'Night' };

// ----------------------------------------------------------------------------- reads (for the policy, the scene and tests)
/** The battle's sky state, or null (no sided foe). */
export function skyState(stateOrBattle) {
  const st = stateOrBattle && stateOrBattle.state && stateOrBattle.state.units ? stateOrBattle.state : stateOrBattle;
  return (st && st.sky) || null;
}
/** Is `u` (a unit) under the sky that is not its own? */
export const isExposed = (u) => !!(u && u.exposed);
export const isAscendant = (u) => !!(u && u.mods && u.mods.some((m) => m.source === SKY_SOURCE));

// ----------------------------------------------------------------------------- state changes
function sided(ctx) { return ctx.living('enemy').filter((u) => u.skySide); }
function ensureSides(ctx) {
  for (const u of ctx.living('enemy')) {
    if (u.skySide !== undefined) continue;
    const d = ENEMIES[u.id];
    u.skySide = (d && d.sky) || null;
    if (d && d.mirrorTurn) u.mirror = true;
  }
}
function setAscendant(ctx, u, on) {
  const had = u.mods.some((m) => m.source === SKY_SOURCE);
  if (on === had) return;
  if (on) {
    u.mods.push({ stat: 'atk', mult: 1 + ASCENDANT, turns: 999, source: SKY_SOURCE });
    u.mods.push({ stat: 'mag', mult: 1 + ASCENDANT, turns: 999, source: SKY_SOURCE });
  } else u.mods = u.mods.filter((m) => m.source !== SKY_SOURCE);
  ctx.emit({ type: 'ascendant', target: u.uid, on, side: u.skySide });
}
/** Recompute Exposed and Ascendant for every sided foe (a Double follows its Knight first). */
export function refresh(ctx) {
  const S = ctx.state.sky;
  if (!S) return;
  ensureSides(ctx);
  for (const u of ctx.living('enemy')) {
    if (!u.mirrorOf) continue;
    const k = ctx.U(u.mirrorOf);
    if (k && k.skySide) u.skySide = k.skySide === 'sun' ? 'star' : 'sun';
  }
  const home = sideOf(S.sky);
  for (const u of sided(ctx)) {
    const exposed = u.skySide !== home;
    const was = !!u.exposed;
    u.exposed = exposed;
    if (was !== exposed) ctx.emit({ type: 'exposed', target: u.uid, on: exposed, side: u.skySide });
    setAscendant(ctx, u, !exposed);
  }
}
function tell(ctx, reason) {
  const S = ctx.state.sky;
  ctx.emit({ type: 'sky', sky: S.sky, turnIn: S.turnIn, reason });
}
function turn(ctx, natural, by = null) {
  const S = ctx.state.sky;
  S.sky = other(S.sky);
  S.turnIn = TURN_EVERY;
  S.turns++;
  if (natural) S.natural++;
  ctx.emit({ type: 'sky_turn', sky: S.sky, natural, by, sfx: 'sky_turn' });
  ctx.emit({ type: 'message', text: `The sky turns. ${NAME[S.sky]}.`, kind: 'sky' });
  if (natural) {
    for (const u of sided(ctx).filter((x) => x.mirror)) {
      if (u.skySide === sideOf(S.sky)) continue;
      u.skySide = sideOf(S.sky);
      ctx.emit({ type: 'message', text: `${u.name} turns its mirror to the sky.`, kind: 'mirror_turn', target: u.uid, sfx: 'mirror_turn' });
    }
  }
  refresh(ctx);
}

// ----------------------------------------------------------------------------- foretellings (the Last Prophecy)
/** Pin a foretelling of `source` on `target` to the Turn. Returns false if one is already pinned. */
export function foretell(ctx, source, target, skillId = 'last_prophecy') {
  const S = ctx.state.sky;
  if (!S || S.pinned) return false;
  const t = ctx.U(target);
  const sk = SKILLS[skillId];
  S.pinned = { source: source.uid, target, skill: skillId };
  const text = (sk.telegraph || '').replace('{target}', t ? t.name : 'a').replace('{name}', source.name);
  ctx.emit({ type: 'foretell', source: source.uid, target, pinned: true, turnIn: S.turnIn, skill: skillId });
  // the help window and the signature Tech read telegraphs: this one is pinned to the Turn, not to the foe's next turn
  ctx.emit({ type: 'telegraph', actor: source.uid, skill: skillId, name: sk.name, text, target, targets: [target],
    nextTurn: S.turnIn, foretell: true, sfx: sk.telegraphSfx || null });
  return true;
}
/** The pinned foretelling fails. reason 'turned' (Turn the Sky: its owner is Broken), 'break', 'gone'. */
export function breakForetelling(ctx, reason) {
  const S = ctx.state.sky;
  const p = S && S.pinned;
  if (!p) return false;
  S.pinned = null;
  const src = ctx.U(p.source);
  ctx.emit({ type: 'foretell_broken', source: p.source, target: p.target, reason, sfx: reason === 'turned' ? 'prophecy_break' : null });
  if (reason === 'turned') {
    ctx.emit({ type: 'message', text: 'The words change.', kind: 'foretell_broken', target: p.source, sfx: 'prophecy_break' });
    if (src && src.alive && !src.broken) ctx.breakUnit(src);
  }
  return true;
}
function fall(ctx) {
  const S = ctx.state.sky;
  const p = S.pinned;
  S.pinned = null;
  const src = ctx.U(p.source);
  const t = ctx.U(p.target);
  if (!src || !src.alive) return;
  if (!t || !t.alive || ctx.kept(t)) {
    ctx.emit({ type: 'foretell_broken', source: p.source, target: p.target, reason: 'gone' });
    return;
  }
  const sk = SKILLS[p.skill];
  ctx.emit({ type: 'foretell_fall', source: src.uid, target: t.uid, skill: sk.id });
  ctx.emit({ type: 'action_start', actor: src.uid, action: { type: 'enemy', skill: sk.id, name: sk.name }, targets: [t.uid],
    fx: sk.fx || null, sfx: sk.sfx || null, charged: true });
  // a reading lands on the star it names: no Taunt, no Guard (a direct strike, not useSkill)
  ctx.strike(src, t, { id: sk.id, formula: sk.formula, power: sk.power, types: sk.types, pierce: sk.pierce || 0, trueStrike: true });
  if (t.alive && ctx.addStatus(t, 'nameless', 99, src)) {
    ctx.emit({ type: 'message', text: `${t.name} falls from the chart.`, kind: 'starless', target: t.uid });
  }
  src.ai.fell = (src.ai.fell || 0) + 1;
}

// ----------------------------------------------------------------------------- the levers
/** Turn the Sky: called once per use (the bridge or a core skill hook). */
export function turnSky(ctx, by) {
  const S = ctx.state.sky;
  if (!S) { ctx.emit({ type: 'message', text: 'There is no sky to turn here.', kind: 'sky' }); return false; }
  if (S.handled === ctx.state.turn) return false;   // applied already this action
  S.handled = ctx.state.turn;
  S.skip = true;                                   // the reset Turn does not count this action
  turn(ctx, false, by ? by.uid : null);
  breakForetelling(ctx, 'turned');
  tell(ctx, 'turned');
  return true;
}
function hold(ctx, n) {
  const S = ctx.state.sky;
  S.turnIn += HOLD * n;
  ctx.emit({ type: 'message', text: `The sand holds the sky. (+${HOLD * n})`, kind: 'sky_hold' });
  if (S.pinned) ctx.emit({ type: 'foretell', source: S.pinned.source, target: S.pinned.target, pinned: true, turnIn: S.turnIn, skill: S.pinned.skill, moved: true });
}

// ----------------------------------------------------------------------------- the RULE_EXT hook
export const SKY_RULE = {
  id: 'ep5_sky',
  start(ctx) {
    const st = ctx.state;
    if (st.sky) return;
    if (!ctx.living('enemy').some((u) => ENEMIES[u.id] && ENEMIES[u.id].sky)) return;
    const forced = SKY_START[st.options.encounter] || null;
    const sky = (forced && forced.sky) || skyForHour(fieldHour);
    st.sky = { sky, turnIn: (forced && forced.turnIn) || TURN_EVERY, every: TURN_EVERY, turns: 0, natural: 0, pinned: null,
      sand: st.itemsUsed[SAND] || 0, skip: false, handled: -1, hour: forced ? null : fieldHour };
    refresh(ctx);
    tell(ctx, 'start');
  },
  afterAction(ctx) {
    const S = ctx.state.sky;
    if (!S) return;
    ensureSides(ctx);
    const used = ctx.state.itemsUsed[SAND] || 0;
    if (used > S.sand) { hold(ctx, used - S.sand); S.sand = used; }
    if (S.skip) S.skip = false;
    else S.turnIn--;
    if (S.turnIn <= 0) {
      turn(ctx, true);
      if (S.pinned) fall(ctx);
    } else refresh(ctx);   // a summoned foe joins the sky at once
    tell(ctx, 'action');
  },
  /** A party skill's own effect (Turn the Sky). The future core hook; today the bridge below calls it. */
  skill(ctx, user, sk) {
    if (!sk || !sk.effects || !sk.effects.some((e) => e.sky === 'turn')) return;
    turnSky(ctx, user);
  },
};

// The bridge: rules.js applyEffect() -> ai.js special(ctx, user, sk, e, targets) -> the user's script; a party member's is `basic`.
function bridge(ctx, u, sk, e) {
  if (e.sky === 'turn') { turnSky(ctx, u); return 80; }
  return null;
}

let done = false;
/** Push the rule onto RULE_EXT and bridge Turn the Sky (never twice). Safe to call twice. */
export function register() {
  if (done) return;
  if (!RULE_EXT.includes(SKY_RULE)) RULE_EXT.push(SKY_RULE);
  const basic = SCRIPTS.basic;
  if (basic && !(basic.special && basic.special.ep5Sky)) {
    const prev = basic.special;
    const special = function (ctx, u, sk, e, targets) {
      if (e && e.sky) return bridge(ctx, u, sk, e, targets);
      return prev ? prev.call(this, ctx, u, sk, e, targets) : null;
    };
    special.ep5Sky = true;
    basic.special = special;
  }
  done = true;
}
export default register;
