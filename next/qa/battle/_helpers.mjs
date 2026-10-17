// Shared helpers for battle tests (not a test file itself).
import { createBattle, makeRng } from '../../src/battle/rules.js';
import { partyAction } from '../../src/battle/ai.js';
import { newMember } from '../../src/data/party.js';

/** A constant rng: hits always land, never crit, variance exactly 1.0, AI picks the middle option. */
export const midRng = () => 0.5;

export function party(level = 4, edit = {}) {
  return ['hero', 'mira', 'bram'].map((id) => {
    const m = newMember(id, { level });
    if (edit[id]) Object.assign(m, edit[id]);
    return m;
  });
}

export function battle(enemies, opts = {}) {
  return createBattle({
    party: opts.party || party(opts.level || 4, opts.edit || {}),
    enemies,
    rng: opts.rng || makeRng(opts.seed || 1),
    options: { inventory: { potion: 3, ether: 2, phoenix_feather: 1 }, ...(opts.options || {}) },
  });
}

/** Advance (party defends, enemies act) until `uid` has the turn. Returns all events seen. */
export function untilTurn(b, uid, max = 60) {
  const seen = [];
  for (let i = 0; i < max && !b.isOver(); i++) {
    const u = b.current();
    if (u.uid === uid) return seen;
    seen.push(...(u.side === 'party' ? b.perform({ type: 'defend' }) : b.runEnemyTurn()));
  }
  if (!b.isOver()) throw new Error(`never reached ${uid}'s turn`);
  return seen;
}

/** Play to the end with a policy; returns every event. */
export function playOut(b, policy = 'competent', max = 1500) {
  const evs = [...b.startEvents];
  for (let i = 0; i < max && !b.isOver(); i++) {
    const u = b.current();
    if (u.side === 'party') {
      let e = b.perform(partyAction(b, policy));
      if (e.length === 1 && e[0].type === 'invalid') e = b.perform({ type: 'defend' });
      evs.push(...e);
    } else evs.push(...b.runEnemyTurn());
  }
  return evs;
}

export const ofType = (evs, type) => evs.filter((e) => e.type === type);
