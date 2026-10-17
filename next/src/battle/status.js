// Status effect tunables and pure helpers. Statuses live on a unit as { id: { turns } }.
// Durations count the owner's own turns; they tick down at the end of each of its turns.

import { STATUSES } from '../data/skills.js';

export const POISON_PCT = 0.08;   // max HP lost per turn
export const BURN_PCT = 0.10;     // max HP lost per turn
export const BURN_DEF = 0.8;      // DEF multiplier while burning
export const REGEN_PCT = 0.08;    // max HP restored per turn
export const PROTECT_MULT = 2 / 3; // damage taken while protected
export const DEFEND_MULT = 0.5;    // damage taken while defending (until the defender's next turn)
export const BLIND_HIT = 0.5;      // physical hit chance multiplier while blind
export const FOCUS_MULT = 1.5;     // next damaging/healing action
export const NAMELESS_MULT = 0.8;  // ATK and MAG while nameless

export function has(unit, id) {
  const s = unit.statuses && unit.statuses[id];
  return !!(s && s.turns > 0);
}

export function isBad(id) { return STATUSES[id] && STATUSES[id].kind === 'bad'; }

/** Default duration for a status id. */
export function defaultTurns(id) { return (STATUSES[id] && STATUSES[id].turns) || 3; }

/**
 * Pairs that cancel: a fire hit thaws Chill, an ice hit puts out Burn (Burn and Chill also replace
 * each other when inflicted).
 */
export const CURED_BY_TYPE = { fire: ['chill'], ice: ['burn'] };
export const REPLACES = { burn: ['chill'], chill: ['burn'], haste: [], protect: [] };

/** Per-turn HP change at turn start: negative = damage. Returns [{ status, amount }]. */
export const BOSS_DOT_MULT = 0.3;  // bosses take 30% of normal Poison/Burn ticks (2.4% / 3% of max HP)

export function turnTicks(unit) {
  const out = [];
  const dot = unit.boss ? BOSS_DOT_MULT : 1;
  if (has(unit, 'regen')) out.push({ status: 'regen', amount: Math.max(1, Math.round(unit.maxHp * REGEN_PCT)) });
  if (has(unit, 'poison')) out.push({ status: 'poison', amount: -Math.max(1, Math.round(unit.maxHp * POISON_PCT * dot)) });
  if (has(unit, 'burn')) out.push({ status: 'burn', amount: -Math.max(1, Math.round(unit.maxHp * BURN_PCT * dot)) });
  return out;
}

/** Decrement timed statuses at the end of a turn. Returns ids that expired. Focus never times out. */
export function decrement(unit) {
  const expired = [];
  for (const [id, s] of Object.entries(unit.statuses || {})) {
    if (id === 'focus' || id === 'nameless') continue;
    s.turns -= 1;
    if (s.turns <= 0) { expired.push(id); delete unit.statuses[id]; }
  }
  if (unit.mods) {
    for (const m of unit.mods) m.turns -= 1;
    unit.mods = unit.mods.filter((m) => m.turns > 0);
  }
  return expired;
}
