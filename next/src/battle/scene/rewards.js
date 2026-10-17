// Battle outcome -> game state (pure; node tests import it). The scene calls applyBattleOutcome() once the
// rules say the battle is over, before showing the rewards windows, so a closed tab never loses loot.
//
//   const summary = applyBattleOutcome(game, result, encounter, { partyBefore })
//   summary = { outcome, exp, gold, levelUps: {hero: [...]}, mastery: {hero: [{type, from, to, unlocked}]},
//               items: [{ uid, inst, name, rarity, color }], consumables: [{ item, qty, name }], used: {...},
//               bestiary: { key: entry }, flag }
//
// Bestiary contract (engine.game.bestiary, keyed by the rules' weakKey: 'briar_wolf' or 'lost_page:kindling'):
//   { seen: n, killed: n, known: ['fire', ...], weak: [...], resist: [...], appraised: bool }
// `known` is what createEncounterBattle({ bestiary }) wants back (bestiaryForBattle below), so a "?" that was
// revealed once stays revealed in every later fight.

import { applyResult } from '../rules.js';
import { give, take, addGear, setFlag, bump } from '../../game/state.js';
import { ENEMIES } from '../../data/enemies.js';
import { CONSUMABLES } from '../../data/items.js';
import { RARITIES } from '../../data/items.js';
import { itemName } from '../loot.js';

/** The `bestiary` option for createEncounterBattle: weakKey -> known type list. */
export function bestiaryForBattle(game) {
  const out = {};
  for (const [key, entry] of Object.entries((game && game.bestiary) || {})) {
    if (Array.isArray(entry)) out[key] = entry.slice();
    else if (entry && Array.isArray(entry.known)) out[key] = entry.known.slice();
    else if (entry && (entry.weak || entry.resist)) out[key] = [...(entry.weak || []), ...(entry.resist || [])];
  }
  return out;
}

function enemyIdOf(key) { return String(key).split(':')[0]; }

/** Merge result().revealed (weakKey -> types) and the kills into game.bestiary. Returns the touched entries. */
export function mergeBestiary(game, revealed, killed = [], seen = []) {
  if (!game.bestiary) game.bestiary = {};
  const touched = {};
  const ensure = (key) => {
    let e = game.bestiary[key];
    if (!e || Array.isArray(e)) e = { seen: 0, killed: 0, known: Array.isArray(e) ? e.slice() : [], weak: [], resist: [], appraised: false };
    game.bestiary[key] = e;
    touched[key] = e;
    return e;
  };
  for (const key of seen) ensure(key).seen += 1;
  for (const key of killed) ensure(key).killed += 1;
  for (const [key, types] of Object.entries(revealed || {})) {
    const e = ensure(key);
    for (const t of types || []) if (!e.known.includes(t)) e.known.push(t);
    const def = ENEMIES[enemyIdOf(key)];
    if (def) {
      e.weak = e.known.filter((t) => def.weak.includes(t));
      e.resist = e.known.filter((t) => def.resist.includes(t) || def.immune.includes(t) || def.absorb.includes(t));
      if (def.weak.every((t) => e.known.includes(t))) e.appraised = true;
    }
  }
  return touched;
}

/**
 * Apply a finished battle to the game: member HP/MP/Fury/weapon, EXP + levels, mastery, gold, dropped gear
 * (instances via addGear), consumables used and found, bestiary, the encounter's story flag, counters.
 * Only victories grant rewards; escapes and defeats still carry HP/MP/Fury and consumables used.
 */
export function applyBattleOutcome(game, result, encounter = {}, opts = {}) {
  const summary = { outcome: result.outcome, exp: 0, gold: 0, levelUps: {}, mastery: {}, items: [], consumables: [],
    used: { ...(result.itemsUsed || {}) }, bestiary: {}, flag: null, masteryPoints: result.mastery || {} };
  // Members: HP/MP/Fury carry over on every outcome; EXP and mastery on victory (applyResult handles both).
  const ups = applyResult(game.party, result);
  summary.levelUps = ups.levelUps || {};
  summary.mastery = ups.mastery || {};
  // Consumables used in battle leave the bag even on a loss or escape.
  for (const [id, n] of Object.entries(result.itemsUsed || {})) take(game, id, n);
  if (result.outcome === 'victory') {
    summary.exp = result.exp || 0;
    summary.gold = result.gold || 0;
    game.gold = Math.max(0, (game.gold || 0) + summary.gold);
    for (const inst of result.items || []) {
      const copy = typeof inst === 'string' ? inst : JSON.parse(JSON.stringify(inst));
      const uid = addGear(game, copy);
      const rarity = (typeof inst === 'string' ? 'common' : inst.rarity) || 'common';
      const name = typeof inst === 'string' ? inst : (inst.name || itemName(inst));
      summary.items.push({ uid, inst: copy, name, rarity, color: (RARITIES[rarity] || RARITIES.common).color, sfx: (RARITIES[rarity] || RARITIES.common).sfx });
    }
    for (const c of result.consumables || []) {
      give(game, c.item, c.qty);
      summary.consumables.push({ item: c.item, qty: c.qty, name: (CONSUMABLES[c.item] && CONSUMABLES[c.item].name) || c.item, icon: (CONSUMABLES[c.item] && CONSUMABLES[c.item].icon) || 'potion' });
    }
    if (encounter && encounter.flag) { setFlag(game, encounter.flag, true); summary.flag = encounter.flag; }
    bump(game, 'battles_won');
    if (encounter && encounter.boss) bump(game, 'bosses_defeated');
  } else if (result.outcome === 'escape') bump(game, 'battles_fled');
  else bump(game, 'battles_lost');
  // Bestiary: everything the party saw, whatever the outcome.
  const seen = (opts.seenKeys || []);
  const killed = result.outcome === 'victory' ? (opts.killedKeys || []) : [];
  summary.bestiary = mergeBestiary(game, result.revealed, killed, seen);
  return summary;
}

/** Stat lines for the level-up window: [{ id, label, from, to, gain }]. */
export function levelGainRows(levelUp) {
  const labels = { hp: 'hp', mp: 'mp', atk: 'atk', def: 'def', mag: 'mag', spr: 'spr', spd: 'spd', luk: 'luk' };
  const out = [];
  for (const k of ['hp', 'mp', 'atk', 'def', 'mag', 'spr', 'spd', 'luk']) {
    const g = (levelUp.gains || {})[k] || 0;
    if (g) out.push({ id: k, label: labels[k], gain: g });
  }
  return out;
}
