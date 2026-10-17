// CTB timeline math (FFX style). Pure: no DOM, no randomness.
//
// Every combatant has an absolute time `next` at which its next turn begins. The unit with the
// smallest `next` acts (ties: lower `tie` first, party before enemies). After acting, its `next`
// becomes now + actionDelay(spd, rank). Speed lowers delay; Haste and Chill scale it; Stun and Break
// cost a whole turn (the unit's next turn is skipped). A "round" is ROUND_TICKS: the time a SPD 10
// unit needs for one normal action.

export const TICK_SCALE = 3000;
export const SPEED_OFFSET = 10;
export const ROUND_TICKS = TICK_SCALE / (10 + SPEED_OFFSET); // 150
export const HASTE_FACTOR = 2 / 3;
export const CHILL_FACTOR = 1.5;
export const BREAK_PUSH = 0.5; // a Break pushes the victim back by half a normal turn

// Standard action ranks (100 = a normal action). Skills carry their own `rank`.
export const RANK = { attack: 100, defend: 50, item: 80, swap: 40, flee: 100, skip: 100 };

/** Ticks for one rank-100 action at a speed. */
export function baseDelay(spd) {
  return TICK_SCALE / (Math.max(1, spd) + SPEED_OFFSET);
}

/** Speed multiplier from statuses: { haste: {turns}, chill: {turns} } (either may be absent). */
export function statusFactor(statuses = {}) {
  const h = statuses.haste && statuses.haste.turns > 0;
  const c = statuses.chill && statuses.chill.turns > 0;
  if (h && c) return 1;
  if (h) return HASTE_FACTOR;
  if (c) return CHILL_FACTOR;
  return 1;
}

/** Delay in whole ticks for an action of `rank` by a unit with `spd` and `statuses`. */
export function actionDelay(spd, rank = 100, statuses = {}) {
  return Math.max(1, Math.round(baseDelay(spd) * (rank / 100) * statusFactor(statuses)));
}

/** Pick the next actor from a list of timeline entries { uid, next, tie }. */
export function nextActor(entries) {
  let best = null;
  for (const e of entries) {
    if (!best || e.next < best.next || (e.next === best.next && e.tie < best.tie)) best = e;
  }
  return best;
}

/**
 * Project the next `n` turns. entries: [{ uid, next, tie, spd, statuses, stunned, broken, charging }].
 * Assumes every unit takes a normal (rank 100) action on each projected turn; Haste/Chill wear off
 * as their turns run out; a stunned or broken unit's first turn is a skipped turn.
 * Returns [{ uid, at, skip?: 'stun'|'break', charging?: skillId }].
 */
export function peek(entries, n = 8) {
  const sim = entries.map((e) => ({
    uid: e.uid, next: e.next, tie: e.tie, spd: e.spd,
    haste: (e.statuses && e.statuses.haste && e.statuses.haste.turns) || 0,
    chill: (e.statuses && e.statuses.chill && e.statuses.chill.turns) || 0,
    stunned: !!e.stunned, broken: !!e.broken, charging: e.charging || null,
  }));
  const out = [];
  if (!sim.length) return out;
  for (let i = 0; i < n; i++) {
    const u = nextActor(sim);
    const row = { uid: u.uid, at: u.next };
    if (u.stunned) { row.skip = 'stun'; u.stunned = false; }
    else if (u.broken) { row.skip = 'break'; u.broken = false; }
    else if (u.charging) { row.charging = u.charging; u.charging = null; }
    out.push(row);
    const st = { haste: { turns: u.haste }, chill: { turns: u.chill } };
    u.next += actionDelay(u.spd, 100, st);
    if (u.haste > 0) u.haste--;
    if (u.chill > 0) u.chill--;
  }
  return out;
}

/** Rounds elapsed for a time value (for summaries and the simulator). */
export function roundsAt(time) { return time / ROUND_TICKS; }
