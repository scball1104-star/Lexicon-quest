// Erasure (E8-battle; docs/EPISODE8_PLAN.md 6.3): Episode 8's one battle rule, as pack code on rules.js RULE_EXT (Episode 5's seam:
// `start`, `afterAction`) plus the `commands` call point (E8-pack's seam 5: `RULE_EXT.commands(state, unit, out)` at the end of the
// rules.js commands builder). Pure: no DOM, canvas or audio; no randomness (it never draws from ctx.R).
//
// Every battle in which a foe has `erasing: true` (src/data/ep8/enemies.js) has Erasure, kept in `ctx.state.erasure` (so it saves and
// restores with the battle state). Battles with no erasing foe get no Erasure, no events, no state and no change to their commands:
// Episodes 1 to 7, the cave and the tier play exactly as before. No encounter field is added (the rollEncounter and rules.js
// double-entry trap is avoided).
//
// - PARTY ONLY. No foe is ever rubbed out (rub() refuses any unit that is not a party member), and nothing a foe does to the party
//   slows that foe (the Gale Engine lesson, PLAYTEST_REVIEW_8 item 1). THE HERO IS NEVER RUBBED OUT AND NEVER UNWRITTEN ("The ink
//   will not take on {hero}.", once a battle: kind 'ink_refused'; the scene keeps it to once a save).
// - THE LAST COMMAND. RULE_EXT.afterAction(ctx, units) is told who acted, never what they did. The rule reads it from the state the
//   action left behind, against a snapshot taken after the previous action: an item used (itemsUsed grew) is Item; a plain Defend
//   (`defending` without `cover`) is Defend; a Guard (`defending` with `cover`) is Tech; a weapon change is Swap; Fury spent from full
//   is Fury; two or more actors at once is a Combo; a weapon use (rules.js `uses`) with an MP change is a Tech (Channel gains MP),
//   without one an Attack; MP spent with no weapon use is Magic for a member who knows a spell (Mira) and a Tech for the others (the
//   hero's Answer, Bram's Taunt); an Appraise is Magic; a skipped turn changes nothing. Read Aloud marks itself Magic.
// - RUBBING OUT. An erasing move's effect `{ keep: 'erasure', erasure: 'rub' }` reaches rub() with the members it actually hit (rules.js
//   applyEffect hands `keep` effects to ai.js special() for the FOE's script; src/data/ep8/ai.js answers through erasureSpecial()). It
//   rubs out the member's last command if that was Attack, Tech, Magic or Item (never Defend, Fury, Combo, Swap or Flee: nothing),
//   for the member's next ERASURE_TUNE.rubTurns (2) turns; a second rub of the same command resets it to 2; at most RUB_MAX (2) at once
//   (a third replaces the oldest). A member who Defended takes none ("The ink slides off."). Counts fall at the end of each of the
//   member's own turns (a skipped turn counts).
// - THE COMMANDS (seam 5 calls the RULE_EXT.commands hook once a build as (state, unit, out, ctx); ctx is unused). erasureCommands() marks a rubbed row disabled with reason 'Rubbed out', `help` "Rubbed out. Try something else.",
//   `rubbed: { left, max }` (the scene's two pips) and every sub-entry disabled. A rubbed Magic row stays open with only Read Aloud lit
//   (Read Aloud is never rubbed out). An Unwritten member has every row but Defend disabled (reason 'Unwritten'), Read Aloud included.
//   rules.js validate() checks sub-entries but not the Attack row, so Auto and the simulator's policies read commandsOf() (ai.js).
// - UNWRITE. pin() puts an Unwrite on a non-hero member (holdForMira: its owner's turn is held behind Mira's next one); it lands on its
//   owner's next turn (land()): the member is Unwritten for ERASURE_TUNE.unwrittenTurns (2) turns and takes ERASURE_TUNE.unwrittenMult
//   (x1.8, UNWRITTEN_MULT; the plan's x1.3 moved in tuning) damage. rules.js has no damage-taken hook for a party member, so the
//   multiplier is two mods (source 'unwritten') on DEF and SPR, sized so DEF_K / (DEF_K + D) grows by exactly that much for that member (Episode 7's Frozen method). Ends: Read Aloud ('read'), its
//   turns ('turns'), a Break or the fall of its owner ('break').
// - READ ALOUD (`{ keep: 'erasure', erasure: 'read' }`, Mira's, any member including herself): every rubbed command returns, Unwritten
//   ends, the member acts sooner (push -0.25, clamped as Episode 6); a pinned Unwrite on them breaks and its owner is thrown back a
//   full turn (push 1.0): the party's window.
// - FRESH INK: rules.js tells a rule who used an item, not which: the rule reads itemsUsed, and every ally's counts fall by one (an
//   unwriting too). Party-wide by design (BATTLE 14.8: no item-target seam).
// - READ_GATE: Read Aloud in a battle with no erasing foe is taken out of that battle's copy of Mira's skills and noted in
//   `state.gated` ({ unit, skill, reason: 'Nothing to read back.', group: 'magic' }), after Episode 6's SKILL_GATE and Episode 7's
//   CALL_GATE (it appends). No Erasure battle has a sky, a wind or a cold foe, so Turn the Sky, Anchor and Call stay gated in each.
//
// Events (the scene draws them; E8-scene-ui): `erasure` { reason: 'start' }; `rub` { target, command, left, reset, reason: 'hit' |
// 'silence', source }; `rub_end` { target, command, reason: 'turns' | 'read' | 'ink' | 'replaced' | 'fall' }; `ink_slide` { target,
// source }; `unwrite_pin` { source, target, pinned, moved? } and a `telegraph` with `unwrite: true`; `unwritten` { target, source };
// `unwritten_end` { target, reason: 'read' | 'turns' | 'break' }; `unwrite_broken` { source, target, reason: 'read' | 'break' };
// `unwrite_land` { source, target }; `read` { actor, target }; `silence_broken` { source, reason: 'answer' | 'break' } (ai.js).
// Message kinds 'rub_out', 'ink_slide', 'ink_refused', 'unwrite', 'unwrite_hint', 'unwrite_broken', 'unwritten', 'unwritten_end',
// 'read', 'fresh_ink', 'no_erasure'.

import { RULE_EXT, DEF_K, FURY_MAX } from '../../battle/rules.js';
import { SCRIPTS } from '../../battle/ai.js';
import { baseDelay } from '../../battle/ctb.js';
import { ENEMIES } from '../enemies.js';
import { SKILLS } from '../skills.js';

export const RUB_TURNS = 2;         // plan 6.6 knob 1: a rubbed command's turns
export const RUB_MAX = 2;           // at most two rubbed commands a member
export const UNWRITTEN_TURNS = 2;
export const UNWRITTEN_MULT = 1.8;  // plan 6.6 knob 3 (the plan's 1.3: BATTLE.md 17.1)
/** The live knobs (the simulator's tuning reads and writes these; the constants above are the shipped values). */
export const ERASURE_TUNE = { rubTurns: RUB_TURNS, unwrittenTurns: UNWRITTEN_TURNS, unwrittenMult: UNWRITTEN_MULT };
export const READ_PUSH = -0.25;     // Read Aloud: the member comes round sooner (clamped)
export const PIN_PUSH = 1.0;        // an Unwrite broken by Read Aloud: its owner a full turn back
export const READ = 'read_aloud';
export const INK = 'fresh_ink';
export const HERO = 'hero';
export const MIRA = 'mira';
export const RUBBABLE = ['attack', 'tech', 'magic', 'item'];
export const CMD_NAME = { attack: 'Attack', tech: 'Tech', magic: 'Magic', item: 'Item' };
export const RUB_REASON = 'Rubbed out';
export const RUB_HELP = 'Rubbed out. Try something else.';
export const UNWRITTEN_REASON = 'Unwritten';
export const UNWRITTEN_HELP = 'Unwritten. Defend, or wait for Mira.';
export const GATE_REASON = 'Nothing to read back.';
export const UNWRITE_SOURCE = 'unwritten';

const OBJ = { mira: 'her', bram: 'him' };

// ----------------------------------------------------------------------------- reads (for the policy, the scene and tests)
/** The battle's Erasure state, or null (no erasing foe). Takes a battle, its state, or a rule ctx. */
export function erasureState(x) {
  const st = x && x.state && x.state.units ? x.state : x;
  return (st && st.erasure) || null;
}
/** Is `u` an erasing foe (from its data)? */
export const isErasing = (u) => !!(u && u.side === 'enemy' && ENEMIES[u.id] && ENEMIES[u.id].erasing);
/** A member's rubbed commands: [{ cmd, left }] (oldest first). */
export function rubsOf(x, uid) { const S = erasureState(x); return (S && S.rub[uid]) || []; }
/** Is `cmd` rubbed out for the member? */
export function isRubbed(x, uid, cmd) { return rubsOf(x, uid).some((r) => r.cmd === cmd); }
/** Is the member Unwritten? */
export function isUnwritten(x, uid) { const S = erasureState(x); return !!(S && S.unwritten[uid]); }
/** The member's last command as the rule read it, or null. */
export function lastOf(x, uid) { const S = erasureState(x); return (S && S.last[uid]) || null; }
/** The pinned Unwrite, or null: { source, target, skill, miraActed }. */
export function pinOf(x) { const S = erasureState(x); return (S && S.pin) || null; }

// ----------------------------------------------------------------------------- the commands (seam 5)
function mark(c, reason, help, left, keepRead) {
  c.rubbed = { left, max: ERASURE_TUNE.rubTurns };
  c.help = help;
  let lit = false;
  for (const e of c.list || []) {
    if (keepRead && e.skill === READ) { lit = lit || !!e.enabled; continue; }
    e.enabled = false;
    e.reason = reason;
  }
  c.enabled = lit;
  c.reason = lit ? null : reason;
}
/**
 * RULE_EXT.commands: mark a member's rubbed rows (and every row but Defend when Unwritten) disabled. Mutates `out` and returns it.
 * Idempotent (running it twice gives the same list), and it leaves the list untouched in a battle with no Erasure or for a member
 * with nothing rubbed (the deep-equal the pack's seam test holds).
 */
export function erasureCommands(state, u, out, ctx) {   // eslint-disable-line no-unused-vars
  const S = state && state.erasure;
  const unit = u && typeof u === 'object' ? u : state && state.units && state.units[u];
  if (!S || !unit || unit.side !== 'party' || !Array.isArray(out)) return out;
  const unw = S.unwritten[unit.uid];
  const rubs = S.rub[unit.uid] || [];
  if (!unw && !rubs.length) return out;
  for (const c of out) {
    if (unw) {
      if (c.id !== 'defend') mark(c, UNWRITTEN_REASON, UNWRITTEN_HELP, unw.left, false);
      continue;
    }
    const r = rubs.find((x) => x.cmd === c.id);
    if (r) mark(c, RUB_REASON, RUB_HELP, r.left, c.id === 'magic');
  }
  return out;
}
/** A battle's command list for `unit` with Erasure applied (whether or not rules.js has the seam yet: the hook is idempotent). */
export function commandsOf(b, unit) {
  const out = b.commands(unit);
  return erasureCommands(b.state, typeof unit === 'string' ? b.unit(unit) : unit || b.current(), out);
}

// ----------------------------------------------------------------------------- the push (Episode 6's clamped push)
/** Push `u` along the timeline by `frac` of its base delay; a negative push is clamped to the room the unit has. */
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

// ----------------------------------------------------------------------------- rubbing out
function endRub(ctx, u, cmd, reason) {
  const S = ctx.state.erasure;
  const list = S.rub[u.uid] || [];
  const i = list.findIndex((r) => r.cmd === cmd);
  if (i < 0) return false;
  list.splice(i, 1);
  if (!list.length) delete S.rub[u.uid];
  ctx.emit({ type: 'rub_end', target: u.uid, command: cmd, reason });
  return true;
}
/**
 * An erasing hit on party member `t` (reason 'hit', or 'silence' for the Last Silence): its last command is rubbed out. Returns the
 * command rubbed, or null (the hero, a Defend, an Unwritten member, or a last command that cannot be rubbed).
 */
export function rub(ctx, t, source, reason = 'hit') {
  const S = ctx.state.erasure;
  if (!S || !t || t.side !== 'party' || !t.alive) return null;
  if (t.id === HERO) {
    S.stats.heroRefused++;
    if (!S.heroNoted) {
      S.heroNoted = true;
      ctx.emit({ type: 'message', text: `The ink will not take on ${t.name}.`, kind: 'ink_refused', target: t.uid });
    }
    return null;
  }
  if (S.unwritten[t.uid]) return null;
  if (t.defending && !t.cover) {
    S.stats.slides++;
    ctx.emit({ type: 'ink_slide', target: t.uid, source: source ? source.uid : null, sfx: 'ink_slide' });
    ctx.emit({ type: 'message', text: 'The ink slides off.', kind: 'ink_slide', target: t.uid, sfx: 'ink_slide' });
    return null;
  }
  const cmd = S.last[t.uid];
  if (!RUBBABLE.includes(cmd)) return null;
  const list = (S.rub[t.uid] = S.rub[t.uid] || []);
  const had = list.find((r) => r.cmd === cmd);
  const turns = ERASURE_TUNE.rubTurns;
  if (had) {
    had.left = turns;
    // the reset moves it to the newest (a third rub replaces the oldest)
    list.splice(list.indexOf(had), 1);
    list.push(had);
  } else {
    if (list.length >= RUB_MAX) endRub(ctx, t, list[0].cmd, 'replaced');
    (S.rub[t.uid] = S.rub[t.uid] || []).push({ cmd, left: turns });
  }
  S.stats.rubs++;
  S.stats.byCmd[cmd] = (S.stats.byCmd[cmd] || 0) + 1;
  ctx.emit({ type: 'rub', target: t.uid, command: cmd, left: turns, reset: !!had, reason, source: source ? source.uid : null, sfx: 'rub_out' });
  ctx.emit({ type: 'message', text: `${t.name}'s ${CMD_NAME[cmd]} is rubbed out.`, kind: 'rub_out', target: t.uid, sfx: 'rub_out' });
  return cmd;
}

// ----------------------------------------------------------------------------- Unwritten
/** UNWRITTEN_MULT as DEF and SPR mods: DEF_K / (DEF_K + D') = mult * DEF_K / (DEF_K + D) for the member's D now. */
export function unwrittenMult(d, mult = ERASURE_TUNE.unwrittenMult) {
  const want = (DEF_K + d) / mult - DEF_K;
  return Math.max(0.01, Math.min(1, want / Math.max(1, d)));
}
/** A landed Unwrite: every command but Defend out for two turns, x1.8 damage taken (ERASURE_TUNE.unwrittenMult). */
export function unwrite(ctx, t, source) {
  const S = ctx.state.erasure;
  if (!S || !t || t.side !== 'party' || !t.alive || t.id === HERO || S.unwritten[t.uid]) return false;
  t.mods = t.mods.filter((m) => m.source !== UNWRITE_SOURCE);
  for (const stat of ['def', 'spr']) t.mods.push({ stat, mult: unwrittenMult(ctx.eff(t, stat)), turns: 99, source: UNWRITE_SOURCE });
  S.unwritten[t.uid] = { left: ERASURE_TUNE.unwrittenTurns, source: source ? source.uid : null };
  S.stats.unwritten++;
  ctx.emit({ type: 'unwritten', target: t.uid, source: source ? source.uid : null, sfx: 'rub_out' });
  ctx.emit({ type: 'message', text: `${t.name} is unwritten. Only Defend holds.`, kind: 'unwritten', target: t.uid, sfx: 'rub_out' });
  return true;
}
/** Unwritten ends: reason 'read' | 'turns' | 'break'. */
export function endUnwritten(ctx, t, reason) {
  const S = ctx.state.erasure;
  if (!S || !t || !S.unwritten[t.uid]) return false;
  delete S.unwritten[t.uid];
  t.mods = (t.mods || []).filter((m) => m.source !== UNWRITE_SOURCE);
  S.stats.back[reason] = (S.stats.back[reason] || 0) + 1;
  ctx.emit({ type: 'unwritten_end', target: t.uid, reason });
  if (t.alive && reason !== 'read') ctx.emit({ type: 'message', text: `${t.name}'s lines come back.`, kind: 'unwritten_end', target: t.uid });
  return true;
}

// ----------------------------------------------------------------------------- the Unwrite pin
const unitOf = (ctx, id) => ctx.living('party').find((u) => u.id === id) || null;
/** Can Mira Read Aloud on her own next turn (alive, knows it, not Unwritten, not Silenced, the MP there)? */
export function miraCan(ctx) {
  const S = ctx.state.erasure;
  const m = unitOf(ctx, MIRA);
  if (!S || !m || S.unwritten[m.uid] || (m.statuses && m.statuses.silence) || ctx.kept(m)) return false;
  return (m.skills || []).includes(READ) && m.mp >= ((SKILLS[READ] && SKILLS[READ].mp) || 12);
}
/** A pin is fair only if Mira can answer it: hold its owner's turn until Mira has had one. Returns true if it moved. */
export function holdForMira(ctx) {
  const S = ctx.state.erasure;
  const p = S && S.pin;
  if (!p || p.miraActed) return false;
  const m = unitOf(ctx, MIRA), src = ctx.U(p.source);
  if (!m || !src || !src.alive || ctx.kept(m)) return false;
  if (src.next > m.next) return false;
  src.next = m.next + 1;
  return true;
}
/** Pin an Unwrite of `source` on party member `target` (never the hero). Returns false if one is already pinned. */
export function pin(ctx, source, target, skillId = 'unwrite') {
  const S = ctx.state.erasure;
  if (!S || S.pin || !source || !source.alive || !target || !target.alive || target.id === HERO || S.unwritten[target.uid]) return false;
  const sk = SKILLS[skillId] || {};
  S.pin = { source: source.uid, target: target.uid, skill: skillId, miraActed: false };
  S.stats.pins++;
  holdForMira(ctx);
  ctx.emit({ type: 'unwrite_pin', source: source.uid, target: target.uid, pinned: true, skill: skillId });
  const text = (sk.telegraph || '{name} begins to unwrite {target}.').replace('{name}', source.name).replace('{target}', target.name);
  ctx.emit({ type: 'telegraph', actor: source.uid, skill: skillId, name: sk.name || 'Unwrite', text, target: target.uid, targets: [target.uid],
    nextTurn: ctx.turnsUntil(source.uid), unwrite: true });
  ctx.emit({ type: 'message', text, kind: 'unwrite', target: target.uid, sfx: 'unwrite_read' });
  if (miraCan(ctx)) {
    const who = target.id === MIRA ? 'herself' : OBJ[target.id] || 'them';
    ctx.emit({ type: 'message', text: `Mira can read ${who} back.`, kind: 'unwrite_hint', target: target.uid });
  }
  return true;
}
function dropPin(ctx, reason) {
  const S = ctx.state.erasure;
  const p = S.pin;
  S.pin = null;
  ctx.emit({ type: 'unwrite_broken', source: p.source, target: p.target, reason, skill: p.skill, sfx: reason === 'read' ? 'unwrite_break' : null });
  ctx.emit({ type: 'telegraph_cancel', actor: p.source, skill: p.skill, reason: reason === 'read' ? 'read' : 'break' });
  return p;
}
/** Its owner's turn has come: the Unwrite lands (the owner's script calls this). Returns true if it landed. */
export function land(ctx, src) {
  const S = ctx.state.erasure;
  const p = S && S.pin;
  if (!p || !src || p.source !== src.uid) return false;
  const t = ctx.U(p.target);
  if (!t || !t.alive) { S.stats.gone++; dropPin(ctx, 'break'); return false; }
  S.pin = null;
  S.stats.landed++;
  ctx.emit({ type: 'unwrite_land', source: src.uid, target: t.uid, skill: p.skill });
  ctx.emit({ type: 'telegraph_cancel', actor: src.uid, skill: p.skill, reason: 'landed' });
  unwrite(ctx, t, src);
  // the owner takes the lines it unwrote (its data `unwriteHeal`: a share of its max HP; the cost of a missed Read Aloud)
  const push1 = (ENEMIES[src.id] || {}).unwritePush || 0;   // and the page skips them (its data `unwritePush`: a share of a turn back)
  if (push1 > 0 && t.alive) push(ctx, t, push1, 'unwritten');
  const heal = (ENEMIES[src.id] || {}).unwriteHeal || 0;
  if (heal > 0 && src.alive) ctx.heal(src, src.maxHp * heal, src, { skill: p.skill });
  return true;
}
/** Its owner was Broken or fell: the pin is cancelled and every member it Unwrote comes back (reason 'break'). */
export function onSourceBroken(ctx, src) {
  const S = ctx.state.erasure;
  if (!S || !src) return;
  if (S.pin && S.pin.source === src.uid) { S.stats.broke++; dropPin(ctx, 'break'); }
  for (const [uid, w] of Object.entries(S.unwritten)) if (w.source === src.uid) endUnwritten(ctx, ctx.U(uid), 'break');
}

/**
 * A charge whose skill says `holdForHero` (the Last Silence) never lands before the hero's next turn: its owner's turn is held behind
 * the hero's until the hero has had a turn since it was planned (Episode 7's holdForHero, for a charge; counted on the hero's
 * `acted`). Returns true if a turn moved.
 */
export function holdCharges(ctx) {
  const h = unitOf(ctx, HERO);
  let moved = false;
  for (const f of ctx.living('enemy')) {
    const c = f.charging;
    if (!c || !SKILLS[c.skill] || !SKILLS[c.skill].holdForHero) continue;
    if (!h || ctx.kept(h)) continue;
    // the hero's turns counted from the plan (a plan made during the hero's own action waits for the next one)
    if (c.heroBase === undefined) c.heroBase = (h.acted || 0) + (ctx.state.current === h.uid ? 1 : 0);
    if ((h.acted || 0) > c.heroBase) c.heroActed = true;
    if (c.heroActed) continue;
    if (f.next <= h.next) { f.next = h.next + 1; moved = true; }
  }
  return moved;
}

// ----------------------------------------------------------------------------- Read Aloud
/** Mira reads `t` back: every rub returns, Unwritten ends, a quarter turn sooner; a pinned Unwrite on them breaks (owner +1 turn). */
export function readAloud(ctx, by, t) {
  const S = ctx.state.erasure;
  if (!S) { ctx.emit({ type: 'message', text: GATE_REASON, kind: 'no_erasure' }); return false; }
  if (!t || t.side !== 'party' || !t.alive) return false;
  S.stats.reads++;
  if (by) S.last[by.uid] = 'magic';
  ctx.emit({ type: 'read', actor: by ? by.uid : MIRA, target: t.uid, sfx: 'read_cast' });
  const p = S.pin;
  if (p && p.target === t.uid) {
    S.stats.read++;
    dropPin(ctx, 'read');
    ctx.emit({ type: 'message', text: `Mira reads ${t.name}'s name aloud. It stays.`, kind: 'unwrite_broken', target: t.uid, sfx: 'unwrite_break' });
    const src = ctx.U(p.source);
    if (src && src.alive) {
      ctx.delayUnit(src, PIN_PUSH, 'read');
      // one telegraph at a time: no new Unwrite on the owner's next turn when its data asks (the Eraser's `restAfterBreak`; ai.js)
      if ((ENEMIES[src.id] || {}).restAfterBreak) S.rest[src.uid] = 1;
      if (src.ai) src.ai.pinAt = Math.min(src.ai.pinAt ?? 0, (src.ai.turns || 0) + 1 + ((ENEMIES[src.id] || {}).readGap ?? 1));
    }
  } else {
    ctx.emit({ type: 'message', text: t.uid === (by && by.uid) ? 'Mira reads her own lines back.' : `Mira reads ${t.name} back.`,
      kind: 'read', target: t.uid, sfx: 'read_cast' });
  }
  endUnwritten(ctx, t, 'read');
  for (const r of (S.rub[t.uid] || []).slice()) endRub(ctx, t, r.cmd, 'read');
  if (!by || by.uid !== t.uid) push(ctx, t, READ_PUSH, 'read');
  return true;
}

// ----------------------------------------------------------------------------- the last command
const usesOf = (u) => Object.values(u.uses || {}).reduce((s, v) => s + v, 0);
const itemsOf = (st) => Object.values(st.itemsUsed || {}).reduce((s, v) => s + v, 0);
const knowsMagic = (u) => (u.skills || []).some((id) => SKILLS[id] && SKILLS[id].kind === 'magic');
function snapAll(ctx) {
  const S = ctx.state.erasure;
  for (const u of ctx.all()) {
    if (u.side !== 'party') continue;
    S.snap[u.uid] = { mp: u.mp, fury: u.fury || 0, uses: usesOf(u), weapon: u.weapon };
  }
  S.snapItems = itemsOf(ctx.state);
  S.snapAppraised = Object.keys(ctx.state.appraised || {}).length;
}
/** What member `u` just did, read from the state its action left (see the header). null: nothing to read (a skipped turn). */
export function readCommand(ctx, u, many = false) {
  const S = ctx.state.erasure;
  const s = S.snap[u.uid];
  if (!s) return null;
  if (S.cast[u.uid]) return S.cast[u.uid];
  if (many) return 'combo';
  if (itemsOf(ctx.state) > S.snapItems) return 'item';
  if (u.defending) return u.cover ? 'tech' : 'defend';
  if (u.weapon !== s.weapon) return 'swap';
  if (s.fury >= FURY_MAX && (u.fury || 0) < s.fury) return 'fury';
  if (usesOf(u) > s.uses) return u.mp !== s.mp ? 'tech' : 'attack';
  if (u.mp < s.mp) return knowsMagic(u) ? 'magic' : 'tech';
  if (u.mp > s.mp) return 'tech';
  if (Object.keys(ctx.state.appraised || {}).length > S.snapAppraised) return 'magic';
  return null;
}

// ----------------------------------------------------------------------------- the RULE_EXT hook
function erasing(ctx) { return ctx.living('enemy').some((u) => isErasing(u)); }
export const ERASURE_RULE = {
  id: 'ep8_erasure',
  start(ctx) {
    const st = ctx.state;
    if (st.erasure || !erasing(ctx)) return;
    st.erasure = { rub: {}, last: {}, unwritten: {}, pin: null, rest: {}, cast: {}, snap: {}, snapItems: 0, snapAppraised: 0,
      inkUsed: st.itemsUsed[INK] || 0, heroNoted: false,
      stats: { rubs: 0, byCmd: {}, slides: 0, heroRefused: 0, pins: 0, read: 0, broke: 0, gone: 0, landed: 0, unwritten: 0, reads: 0,
        inks: 0, back: {} } };
    snapAll(ctx);
    ctx.emit({ type: 'erasure', reason: 'start' });
  },
  afterAction(ctx, units) {
    const S = ctx.state.erasure;
    if (!S) return;
    const acted = [].concat(units).filter(Boolean);
    const partyActed = acted.filter((u) => u.side === 'party');
    // what each party actor did (read before Fresh Ink changes nothing it reads)
    for (const u of partyActed) {
      const cmd = readCommand(ctx, u, partyActed.length > 1);
      if (cmd) S.last[u.uid] = cmd;
    }
    S.cast = {};
    // Fresh Ink: every ally's counts fall by one, an unwriting too (party-wide: rules.js says who used an item, not which)
    const used = ctx.state.itemsUsed[INK] || 0;
    if (used > S.inkUsed) {
      for (let i = S.inkUsed; i < used; i++) {
        S.stats.inks++;
        for (const m of ctx.living('party')) {
          for (const r of (S.rub[m.uid] || []).slice()) { r.left--; if (r.left <= 0) endRub(ctx, m, r.cmd, 'ink'); }
          const w = S.unwritten[m.uid];
          if (w) { w.left--; if (w.left <= 0) endUnwritten(ctx, m, 'turns'); }
        }
      }
      S.inkUsed = used;
      ctx.emit({ type: 'message', text: 'Fresh Ink fills the rubbed lines.', kind: 'fresh_ink' });
    }
    // the member's own turn has ended: its counts fall by one
    for (const u of partyActed) {
      if (!u.alive) continue;
      for (const r of (S.rub[u.uid] || []).slice()) { r.left--; if (r.left <= 0) endRub(ctx, u, r.cmd, 'turns'); }
      const w = S.unwritten[u.uid];
      if (w) { w.left--; if (w.left <= 0) endUnwritten(ctx, u, 'turns'); }
    }
    // a pinned Unwrite waits for Mira's turn (once she has had it, the owner keeps its time)
    const p = S.pin;
    if (p && !p.miraActed) {
      if (partyActed.some((u) => u.id === MIRA)) p.miraActed = true;
      else if (holdForMira(ctx)) ctx.emit({ type: 'unwrite_pin', source: p.source, target: p.target, pinned: true, skill: p.skill, moved: true });
    }
    // a charge that only the hero can answer (`holdForHero` on the skill: the Last Silence) waits for the hero's turn
    holdCharges(ctx);
    // a fallen member loses its lines (a revive starts clean)
    for (const u of ctx.all()) {
      if (u.side !== 'party' || u.alive) continue;
      for (const r of (S.rub[u.uid] || []).slice()) endRub(ctx, u, r.cmd, 'fall');
      if (S.unwritten[u.uid]) { delete S.unwritten[u.uid]; ctx.emit({ type: 'unwritten_end', target: u.uid, reason: 'turns' }); }
      delete S.last[u.uid];
    }
    snapAll(ctx);
  },
  // No `commands` here: E8-pack's seam 5 calls RULE_EXT.commands and then each entry's own, so Erasure's rows are marked by the one
  // RULE_EXT.commands hook installCommands() puts on the array (E8-fixes: an entry hook as well ran erasureCommands twice a build).
};

// ----------------------------------------------------------------------------- Read Aloud with no erasing foe
export const READ_GATE = {
  id: 'ep8_read_gate',
  start(ctx) {
    const st = ctx.state;
    if (st.erasure) return;
    for (const u of ctx.living('party')) {
      if (!(u.skills || []).includes(READ)) continue;
      u.skills = u.skills.filter((s) => s !== READ);
      (st.gated = st.gated || []).push({ unit: u.uid, skill: READ, reason: GATE_REASON, group: 'magic' });
    }
  },
};

// The bridge: rules.js applyEffect() -> ai.js special(ctx, user, sk, e, targets) -> the user's script; a party member's is `basic`.
function bridge(ctx, u, sk, e, targets) {
  if (e.erasure === 'read') { readAloud(ctx, u, (targets || [])[0] || null); return sk.rank || 80; }
  if (e.erasure === 'rub' || e.erasure === 'silence') {
    for (const t of targets || []) rub(ctx, t, u, e.erasure === 'silence' ? 'silence' : 'hit');
    return null;
  }
  return null;
}
/** For the Episode 8 foe scripts (src/data/ep8/ai.js): their `special` answers an erasing move through here. */
export function erasureSpecial(ctx, u, sk, e, targets) { return bridge(ctx, u, sk, e, targets); }

/** RULE_EXT.commands, chained: a hook that was there first (another pack) runs before Erasure's. */
function installCommands() {
  const prev = RULE_EXT.commands;
  if (prev && prev.ep8Erasure) return;
  const hook = function (state, u, out, ctx) {
    const o = prev ? prev(state, u, out, ctx) || out : out;
    return erasureCommands(state, u, o, ctx);
  };
  hook.ep8Erasure = true;
  RULE_EXT.commands = hook;
}

let done = false;
/** Push the rule and the gate onto RULE_EXT, install the commands hook and bridge Read Aloud (never twice). Run after ep7's rime. */
export function register() {
  if (done) return;
  if (!RULE_EXT.includes(ERASURE_RULE)) RULE_EXT.push(ERASURE_RULE);
  if (!RULE_EXT.includes(READ_GATE)) RULE_EXT.push(READ_GATE);
  installCommands();
  const basic = SCRIPTS.basic;
  if (basic && !(basic.special && basic.special.ep8Erasure)) {
    const prev = basic.special;
    const special = function (ctx, u, sk, e, targets) {
      if (e && e.erasure !== undefined) return bridge(ctx, u, sk, e, targets);
      return prev ? prev.call(this, ctx, u, sk, e, targets) : null;
    };
    special.ep8Erasure = true;
    basic.special = special;
  }
  done = true;
}
export default register;
