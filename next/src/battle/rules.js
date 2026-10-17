// Battle rules: pure, deterministic, event-emitting. No DOM, canvas, audio or timers.
//
//   const b = createBattle({ party, enemies, rng, options });
//   b.begin()                      -> start events (also in b.startEvents)
//   b.current()                    -> the unit whose turn it is (party: wait for input; enemy: runEnemyTurn)
//   b.commands(unit)               -> command list with enabled flags, reasons and sub-lists
//   b.targets(unit, action)        -> { mode, side, ids, default }
//   b.previewTimeline(unit, action)-> { order, landing, effects: [{ target, min, max, weak, breaks, kills }] }
//   b.perform(action)              -> events (the party unit's action, then turn processing up to the next actor)
//   b.runEnemyTurn()               -> events
//   b.isOver(), b.result()
//
// Actions: { type: 'attack', target } | { type: 'skill', skill, target } (techs, magic, Fury arts)
//          | { type: 'combo', skill, target } | { type: 'item', item, target } | { type: 'defend' }
//          | { type: 'swap' } | { type: 'flee' }
// Unit ids (uids): party 'hero' 'mira' 'bram'; enemies 'e0', 'e1', ... (summons continue the count).
// See docs/BATTLE.md for every event type and its fields.

import { SKILLS, STATUSES, FURY_ARTS } from '../data/skills.js';
import { PARTY, statsAt, knownSkills, masteryLevel, MASTERY_DAMAGE_PER_LEVEL, MASTERY_PASSIVES,
  grantExp, grantMastery } from '../data/party.js';
import { CONSUMABLES, ITEM_RANK, ARMOR_SLOTS, UNIQUES } from '../data/items.js';
import { ENEMIES, ELITE_BASE, ELITE_MODS, LOST_PAGE_VARIANTS, CURSE_STATUSES } from '../data/enemies.js';
import * as CTB from './ctb.js';
import * as ST from './status.js';
import * as AI from './ai.js';
import { itemStats, setBonuses, toInstance, rollBattleDrops, baseOf } from './loot.js';
import { ENCOUNTERS, rollEncounter } from '../data/encounters.js';

// ------------------------------------------------------------------------------- tunables
export const DEF_K = 24;          // damage = stat * power * DEF_K / (DEF_K + DEF)
export const WEAK_MULT = 1.3;
export const RESIST_MULT = 0.5;
export const BREAK_MULT = 1.5;
export const CRIT_MULT = 1.5;
export const VARIANCE = 0.1;      // +-10%
export const PARTY_HIT = 0.97;
export const ENEMY_HIT = 0.95;
export const PARTY_CRIT = 0.04;   // + LUK/500 + gear + mastery passives
export const ENEMY_CRIT = 0.03;
export const FURY_MAX = 100;
export const FURY = { deal: 8, weak: 4, brk: 12, takenScale: 35, takenFlat: 3, defend: 10 };
export const DEFEND_MP = 0.05;    // Defend restores 5% max MP (min 1)
export const REFLECT_PHYS = 0.5;  // Echo Warden Bulwark: the attacker takes half the blow
export const BOSS_INTERRUPT_DELAY = 0.35;
export const SPLIT_EXP = 0.25;

// ------------------------------------------------------------------------------- rng
/** mulberry32 seeded rng with next() -> [0,1); same algorithm as core/rng.js. */
export function makeRng(seed = 1) {
  let s = seed >>> 0;
  return {
    next() {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    get state() { return s; },
    set state(v) { s = v >>> 0; },
  };
}
function toFn(rng) {
  if (!rng) return makeRng(1).next;
  if (typeof rng === 'function') return rng;
  if (typeof rng.next === 'function') return () => rng.next();
  if (typeof rng.float === 'function') return () => rng.float();
  if (typeof rng.random === 'function') return () => rng.random();
  throw new Error('rng must be a function or have next()');
}

// ------------------------------------------------------------------------------- party stats
const STAT_ZERO = { crit: 0, fireDmg: 0, iceDmg: 0, thunderDmg: 0, lightDmg: 0, inkRes: 0, furyGain: 0, lifesteal: 0,
  healPow: 0, resPoison: 0, resBlind: 0, resSilence: 0, resBurn: 0, resChill: 0, mpCostDown: 0, poisonOnHit: 0,
  startHaste: 0 };

/**
 * Effective stats of a member record with its gear (active weapon only, except that max HP/MP
 * bonuses of both carried weapons always count so a Swap never changes max HP/MP).
 * Returns { maxHp, maxMp, atk, def, mag, spr, spd, luk, crit, ...gear stats, weapon, extraTypes }.
 */
export function memberStats(member, weaponOverride) {
  const def = PARTY[member.id];
  if (!def) throw new Error(`unknown party member ${member.id}`);
  const base = statsAt(member.id, member.level || 1);
  const equip = member.equip || {};
  const weapon = weaponOverride || member.weapon || def.weapons[0];
  const sum = { ...STAT_ZERO, atk: 0, def: 0, mag: 0, spr: 0, spd: 0, luk: 0, hp: 0, mp: 0 };
  const add = (stats, only) => {
    for (const [k, v] of Object.entries(stats)) if (!only || only.includes(k)) sum[k] = (sum[k] || 0) + v;
  };
  const worn = [];
  for (const slot of ARMOR_SLOTS) if (equip[slot]) { const it = toInstance(equip[slot]); if (it) { worn.push(it); add(itemStats(it)); } }
  let extraTypes = [];
  for (const w of def.weapons) {
    if (!equip[w]) continue;
    const it = toInstance(equip[w]);
    if (!it) continue;
    worn.push(it);
    if (w === weapon) {
      add(itemStats(it));
      const b = baseOf(it);
      if (b && b.extraTypes) extraTypes = b.extraTypes.slice();
    } else add(itemStats(it), ['hp', 'mp']);
  }
  add(setBonuses(worn));
  const out = { ...sum };
  out.maxHp = Math.max(1, base.hp + sum.hp);
  out.maxMp = Math.max(0, base.mp + sum.mp);
  for (const k of ['atk', 'def', 'mag', 'spr', 'spd', 'luk']) out[k] = Math.max(1, base[k] + sum[k]);
  delete out.hp; delete out.mp;
  out.weapon = weapon;
  out.extraTypes = extraTypes;
  return out;
}

/** Stat changes if `item` (instance, base id or null) went into equip key `key` (a slot or weapon type). */
export function equipDelta(member, key, item) {
  const before = memberStats(member);
  const m2 = { ...member, equip: { ...(member.equip || {}), [key]: item } };
  const after = memberStats(m2);
  const out = {};
  for (const k of ['maxHp', 'maxMp', 'atk', 'def', 'mag', 'spr', 'spd', 'luk', ...Object.keys(STAT_ZERO)]) {
    const d = (after[k] || 0) - (before[k] || 0);
    if (d) out[k] = d;
  }
  return out;
}

/**
 * Apply a victory result to member records (mutates them): EXP, mastery, HP/MP/Fury carry-over.
 * Returns { levelUps: { hero: [...] }, mastery: { hero: [{type, from, to, unlocked}] } }.
 */
export function applyResult(members, result) {
  const out = { levelUps: {}, mastery: {} };
  for (const m of members) {
    const p = (result.party || []).find((x) => x.id === m.id);
    if (p) { m.hp = p.hp; m.mp = p.mp; m.fury = p.fury; m.weapon = p.weapon || m.weapon; }
    if (result.outcome !== 'victory') continue;
    if (m.hp > 0) out.levelUps[m.id] = grantExp(m, result.exp).levelUps;
    out.mastery[m.id] = [];
    for (const [type, pts] of Object.entries((result.mastery || {})[m.id] || {})) {
      const r = grantMastery(m, type, pts);
      if (r.to > r.from) out.mastery[m.id].push(r);
    }
  }
  return out;
}

// ------------------------------------------------------------------------------- helpers
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const uniq = (arr) => [...new Set(arr)];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const ELEMENT_BONUS = { fire: 'fireDmg', ice: 'iceDmg', thunder: 'thunderDmg', light: 'lightDmg' };
const MELEE = ['sword', 'axe', 'spear', 'staff'];

function fill(text, vars) {
  return String(text || '').replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
}

/**
 * Convenience for the field/battle scenes: build a battle from an encounter id (rolls elites,
 * applies boss/flee/zone/music rules). opts: { party, rng, inventory, bestiary, start, eliteRate,
 * forceElite, noElite }. Returns { battle, encounter } where encounter = { id, zone, music, boss, enemies }.
 */
export function createEncounterBattle(encounterId, opts = {}) {
  const e = ENCOUNTERS[encounterId];
  if (!e) throw new Error(`unknown encounter ${encounterId}`);
  const rng = opts.rng || makeRng(1);
  const enc = rollEncounter(encounterId, rng, { eliteRate: opts.eliteRate, forceElite: opts.forceElite, noElite: opts.noElite });
  const battle = createBattle({
    party: opts.party, enemies: enc.enemies, rng,
    options: { inventory: opts.inventory || {}, bestiary: opts.bestiary || {}, boss: e.boss, canFlee: !e.noFlee,
      start: opts.start || 'normal', zone: e.zone, encounter: encounterId },
  });
  return { battle, encounter: { ...enc, music: e.music, flag: e.flag || null } };
}

// =============================================================================== createBattle
export function createBattle(cfg = {}) {
  const R = toFn(cfg.rng);
  const options = cfg.options || {};
  let state;
  let E = [];
  const emit = (ev) => { E.push(ev); return ev; };

  // ----------------------------------------------------------------------------- setup
  function makePartyUnit(m, i) {
    const s = memberStats(m);
    const def = PARTY[m.id];
    const hp = m.hp === undefined || m.hp === null ? s.maxHp : clamp(Math.round(m.hp), 0, s.maxHp);
    const mp = m.mp === undefined || m.mp === null ? s.maxMp : clamp(Math.round(m.mp), 0, s.maxMp);
    const equip = {};
    for (const [k, v] of Object.entries(m.equip || {})) equip[k] = v ? (typeof v === 'string' ? v : JSON.parse(JSON.stringify(v))) : null;
    return {
      uid: m.id, side: 'party', id: m.id, name: m.name || def.name, level: m.level || 1,
      hp, maxHp: s.maxHp, mp, maxMp: s.maxMp, startMp: mp, fury: clamp(m.fury || 0, 0, FURY_MAX),
      weapon: s.weapon, weapons: def.weapons.filter((w) => equip[w]), equip,
      mastery: { ...(m.mastery || {}) }, stats: s, skills: knownSkills(m),
      statuses: {}, mods: [], defending: false, cover: null, coveredBy: null,
      alive: hp > 0, next: 0, tie: i, uses: {}, lastTarget: null,
    };
  }

  function makeEnemyUnit(spec, n, extra = {}) {
    const id = typeof spec === 'string' ? spec : spec.id;
    const d = ENEMIES[id];
    if (!d) throw new Error(`unknown enemy ${id}`);
    const elite = (spec && spec.elite && spec.elite.length) ? spec.elite.slice() : null;
    let hp = d.hp, atk = d.atk, mag = d.mag, spd = d.spd, def = d.def, shields = d.shields;
    let exp = d.exp, gold = d.gold, masteryPts = d.masteryPts;
    let lifesteal = 0, curse = 0, split = 0;
    let name = d.name;
    if (elite) {
      hp *= ELITE_BASE.hp; atk *= ELITE_BASE.atk; mag *= ELITE_BASE.mag;
      exp *= ELITE_BASE.exp; gold *= ELITE_BASE.gold; masteryPts *= ELITE_BASE.masteryPts;
      for (const mid of elite) {
        const m = ELITE_MODS[mid];
        if (!m) continue;
        if (m.spd) spd *= m.spd;
        if (m.def) def *= m.def;
        if (m.shields) shields += m.shields;
        if (m.lifesteal) lifesteal = m.lifesteal;
        if (m.curse) curse = m.curse;
        if (m.split) split = m.split;
      }
      name = `${elite.map((x) => ELITE_MODS[x] ? ELITE_MODS[x].name : x).join(' ')} ${d.name}`;
    }
    let weak = d.weak.slice();
    let weakKey = id;
    let variant = null;
    if (spec && spec.variant) {
      variant = LOST_PAGE_VARIANTS.find((v) => v.id === spec.variant) || null;
      if (variant) { weak = variant.weak.slice(); name = variant.name; weakKey = `${id}:${variant.id}`; }
    }
    if (extra.hpScale) hp *= extra.hpScale;
    hp = Math.round(hp);
    return {
      uid: `e${n}`, side: 'enemy', id, name, elite, level: d.level, boss: !!d.boss,
      hp, maxHp: hp, mp: d.mp || 0, maxMp: d.mp || 0, fury: 0,
      stats: { atk: Math.round(atk), def: Math.round(def), mag: Math.round(mag), spr: d.spr, spd: Math.round(spd), luk: d.luk },
      shields, maxShields: shields, weak, resist: d.resist.slice(), immune: d.immune.slice(), absorb: d.absorb.slice(),
      statusImmune: d.statusImmune.slice(), evade: d.evade || 0, flying: !!d.flying,
      weakKey, variant: variant ? variant.id : null, tint: variant ? variant.tint : null,
      stoneskin: !!(elite && elite.includes('stoneskin')), lifesteal, curse, split,
      broken: false, charging: null, statuses: {}, mods: [], defending: false, cover: null, coveredBy: null,
      alive: true, next: 0, tie: 10 + n, summoned: !!extra.summoned, splitChild: !!extra.splitChild,
      rewards: { exp: Math.round(exp * (extra.rewardScale ?? 1)), gold: Math.round(gold * (extra.rewardScale ?? 1)),
        masteryPts: Math.round(masteryPts * (extra.rewardScale ?? 1)) },
      lootZone: d.lootZone, ai: { turns: 0, used: {}, chargeAt: null },
    };
  }

  if (cfg.state) {
    state = JSON.parse(JSON.stringify(cfg.state));
  } else {
    const party = (cfg.party || []).map((m, i) => makePartyUnit(m, i));
    if (!party.length) throw new Error('createBattle needs a party');
    state = {
      version: 1, now: 0, turn: 0, partyTurns: 0, enemyTurns: 0, current: null, over: false, outcome: null,
      units: {}, order: [], enemyCount: 0, partySize: party.length,
      inventory: { ...(options.inventory || {}) }, itemsUsed: {},
      revealed: JSON.parse(JSON.stringify(options.bestiary || {})), appraised: {},
      options: { canFlee: options.canFlee !== false && !options.boss, boss: !!options.boss,
        start: options.start || 'normal', encounter: options.encounter || null, zone: options.zone || null },
      killed: [], fleeAttempts: 0, rewards: null, startEvents: [],
    };
    for (const u of party) { state.units[u.uid] = u; state.order.push(u.uid); }
    for (const spec of cfg.enemies || []) {
      const u = makeEnemyUnit(spec, state.enemyCount++);
      state.units[u.uid] = u; state.order.push(u.uid);
    }
    if (!Object.values(state.units).some((u) => u.side === 'enemy')) throw new Error('createBattle needs enemies');
  }

  // ----------------------------------------------------------------------------- queries
  const U = (uid) => state.units[uid] || null;
  const all = () => state.order.map((id) => state.units[id]);
  const living = (side) => all().filter((u) => u.alive && (!side || u.side === side));
  const opponentsOf = (u) => living(u.side === 'party' ? 'enemy' : 'party');
  const alliesOf = (u) => living(u.side);
  const has = (u, id) => ST.has(u, id);

  function eff(u, k) {
    let v = u.stats[k] || 0;
    for (const m of u.mods || []) if (m.stat === k) v *= m.mult;
    if (k === 'def' && has(u, 'burn')) v *= ST.BURN_DEF;
    if ((k === 'atk' || k === 'mag') && has(u, 'nameless')) v *= ST.NAMELESS_MULT;
    return Math.max(1, v);
  }
  function delayOf(u, rank) { return CTB.actionDelay(eff(u, 'spd'), rank, u.statuses); }

  function entries(override, statusOverride) {
    return living().map((u) => ({
      uid: u.uid, next: override && override[u.uid] !== undefined ? override[u.uid] : u.next, tie: u.tie,
      spd: eff(u, 'spd'), statuses: (statusOverride && statusOverride[u.uid]) || u.statuses, stunned: has(u, 'stun'),
      broken: u.broken, charging: u.charging ? u.charging.skill : null,
    }));
  }
  /** Statuses as they will be after a unit's turn ends (durations tick down). */
  function afterTurnStatuses(u) {
    const out = {};
    for (const [id, st] of Object.entries(u.statuses)) {
      if (id === 'focus' || id === 'nameless' || id === 'stun') out[id] = { ...st };
      else if (st.turns - 1 > 0) out[id] = { turns: st.turns - 1 };
    }
    return out;
  }
  function timeline(n = 8, override) { return CTB.peek(entries(override), n); }
  /** Turns until `uid` acts next (0 = it is next), using the current timeline. */
  function turnsUntil(uid, override) {
    const order = timeline(12, override);
    const i = order.findIndex((r) => r.uid === uid);
    return i < 0 ? 99 : i;
  }

  // ----------------------------------------------------------------------------- weakness knowledge
  function revealedFor(u) {
    if (!state.revealed[u.weakKey]) state.revealed[u.weakKey] = [];
    return state.revealed[u.weakKey];
  }
  function learnTypes(u, types) {
    if (u.side !== 'enemy') return;
    const known = revealedFor(u);
    const fresh = types.filter((t) => !known.includes(t));
    if (!fresh.length) return;
    known.push(...fresh);
    const weakNew = fresh.filter((t) => u.weak.includes(t));
    const resistNew = fresh.filter((t) => u.resist.includes(t) || u.immune.includes(t) || u.absorb.includes(t));
    if (weakNew.length || resistNew.length) emit({ type: 'reveal', target: u.uid, enemy: u.id, weak: weakNew, resist: resistNew });
  }
  function revealAll(u) {
    const known = revealedFor(u);
    for (const t of [...u.weak, ...u.resist, ...u.immune, ...u.absorb]) if (!known.includes(t)) known.push(t);
    state.appraised[u.weakKey] = true;
    emit({ type: 'reveal', target: u.uid, enemy: u.id, weak: u.weak.slice(), resist: [...u.resist, ...u.immune, ...u.absorb],
      all: true, hp: u.hp, maxHp: u.maxHp, shields: u.shields });
  }
  /** What the player knows about a foe: { weak, resist, unknown, appraised }. */
  function knowledge(uid) {
    const u = U(uid);
    if (!u || u.side !== 'enemy') return null;
    const known = revealedFor(u);
    const weak = u.weak.filter((t) => known.includes(t));
    return { weak, resist: [...u.resist, ...u.immune, ...u.absorb].filter((t) => known.includes(t)),
      unknown: u.weak.length - weak.length, appraised: !!state.appraised[u.weakKey] };
  }

  // ----------------------------------------------------------------------------- damage math
  function hitTypes(src, part) {
    let types = (part.types || []).map((t) => (t === '$weapon' ? src.weapon : t));
    if (part.weaponTyped && src.weapon) types = [part.types.includes(src.weapon) ? src.weapon : part.types[0]];
    if (src.side === 'party' && part.formula === 'phys' && src.stats.extraTypes && src.stats.extraTypes.length
      && types.includes(src.weapon)) types = types.concat(src.stats.extraTypes);
    return uniq(types.filter(Boolean));
  }
  function affinity(tgt, types) {
    const out = { mult: 1, weak: [], resist: false, immune: false, absorb: false };
    if (!types.length || tgt.side !== 'enemy') return out;
    if (types.some((t) => tgt.absorb.includes(t))) { out.absorb = true; out.mult = -1; return out; }
    if (types.every((t) => tgt.immune.includes(t))) { out.immune = true; out.mult = 0; return out; }
    out.weak = types.filter((t) => tgt.weak.includes(t));
    if (out.weak.length) { out.mult = WEAK_MULT; return out; }
    if (types.some((t) => tgt.resist.includes(t) || tgt.immune.includes(t))) { out.resist = true; out.mult = RESIST_MULT; }
    return out;
  }
  function masteryBonus(src) {
    if (src.side !== 'party') return { power: 0, crit: 0, fury: 0 };
    const lv = masteryLevel((src.mastery || {})[src.weapon]);
    const o = { power: (lv - 1) * MASTERY_DAMAGE_PER_LEVEL, crit: 0, fury: 0 };
    for (const p of MASTERY_PASSIVES) if (lv >= p.level) { o.crit += p.crit || 0; o.fury += p.furyGain || 0; o.power += p.power || 0; }
    return o;
  }
  function critChance(src) {
    if (src.side !== 'party') return ENEMY_CRIT;
    return PARTY_CRIT + eff(src, 'luk') / 500 + (src.stats.crit || 0) / 100 + masteryBonus(src).crit;
  }
  function hitChance(src, tgt, part, types) {
    if (part.formula !== 'phys') return 1;
    if (has(src, 'focus')) return 1;
    let c = src.side === 'party' ? PARTY_HIT : ENEMY_HIT;
    if (has(src, 'blind')) c *= ST.BLIND_HIT;
    if (tgt.evade && src.side === 'party' && !types.includes('bow') && types.some((t) => MELEE.includes(t))) c *= 1 - tgt.evade;
    return c;
  }
  /**
   * Deterministic core of one hit: damage before variance and crit, plus its affinity.
   * Used by both resolution and preview, so preview ranges match what happens.
   */
  function baseHit(src, tgt, part) {
    const types = hitTypes(src, part);
    const phys = part.formula === 'phys';
    const A = eff(src, phys ? 'atk' : 'mag');
    const D = eff(tgt, phys ? 'def' : 'spr') * (1 - (part.pierce || 0));
    let dmg = A * ((part.power || 0) / 100) * DEF_K / (DEF_K + D);
    if (src.side === 'party') {
      if (phys && types.includes(src.weapon)) dmg *= 1 + masteryBonus(src).power;
      let el = 0;
      for (const t of types) if (ELEMENT_BONUS[t]) el = Math.max(el, src.stats[ELEMENT_BONUS[t]] || 0);
      dmg *= 1 + el / 100;
      if (has(src, 'focus')) dmg *= ST.FOCUS_MULT;
    }
    const aff = affinity(tgt, types);
    dmg *= aff.mult;
    if (tgt.broken) dmg *= BREAK_MULT;
    if (tgt.defending) dmg *= ST.DEFEND_MULT;
    if (has(tgt, 'protect')) dmg *= ST.PROTECT_MULT;
    if (tgt.side === 'party' && types.includes('ink')) dmg *= 1 - clamp(tgt.stats.inkRes || 0, 0, 80) / 100;
    if (tgt.stoneskin && phys) dmg *= 0.75;
    dmg *= AI.damageTakenMult(ctx, tgt, part);
    return { dmg, aff, types };
  }

  // ----------------------------------------------------------------------------- state changes
  function addStatus(tgt, id, turns, src) {
    if (!tgt || !tgt.alive || !STATUSES[id]) return false;
    if (tgt.statusImmune && tgt.statusImmune.includes(id)) { emit({ type: 'status_resist', target: tgt.uid, status: id, immune: true }); return false; }
    const res = tgt.side === 'party' ? (tgt.stats[`res${cap(id)}`] || 0) : 0;
    if (res > 0 && R() * 100 < res) { emit({ type: 'status_resist', target: tgt.uid, status: id }); return false; }
    for (const r of ST.REPLACES[id] || []) if (has(tgt, r)) removeStatus(tgt, r, 'replaced');
    const t = turns || ST.defaultTurns(id);
    const cur = tgt.statuses[id];
    tgt.statuses[id] = { turns: cur ? Math.max(cur.turns, t) : t };
    emit({ type: 'status_add', target: tgt.uid, status: id, turns: tgt.statuses[id].turns, source: src ? src.uid : null });
    if (id === 'stun') cancelCharge(tgt, 'stun');
    return true;
  }
  function removeStatus(tgt, id, reason = 'cured') {
    if (!tgt.statuses[id]) return false;
    delete tgt.statuses[id];
    emit({ type: 'status_remove', target: tgt.uid, status: id, reason });
    return true;
  }
  function addMod(tgt, stat, mult, turns, source) {
    const existing = tgt.mods.find((m) => m.stat === stat && m.source === source);
    if (existing) existing.turns = Math.max(existing.turns, turns);
    else tgt.mods.push({ stat, mult, turns, source });
    emit({ type: 'stat_mod', target: tgt.uid, stat, mult, turns });
  }
  function gainFury(u, amount, reason) {
    if (u.side !== 'party' || !u.alive || amount <= 0) return;
    const mult = 1 + (u.stats.furyGain || 0) / 100 + masteryBonus(u).fury;
    const before = u.fury;
    u.fury = clamp(Math.round(u.fury + amount * mult), 0, FURY_MAX);
    if (u.fury !== before) emit({ type: 'fury_gain', target: u.uid, amount: u.fury - before, fury: u.fury, reason });
    if (before < FURY_MAX && u.fury >= FURY_MAX) emit({ type: 'fury_ready', target: u.uid });
  }
  function heal(tgt, amount, src, info = {}) {
    if (!tgt.alive || amount <= 0) return 0;
    const before = tgt.hp;
    tgt.hp = clamp(tgt.hp + Math.round(amount), 0, tgt.maxHp);
    const gained = tgt.hp - before;
    if (!info.quiet) emit({ type: 'heal', target: tgt.uid, amount: gained, hp: tgt.hp, maxHp: tgt.maxHp, source: src ? src.uid : null, ...info });
    return gained;
  }
  function changeMp(tgt, amount, info = {}) {
    const before = tgt.mp;
    tgt.mp = clamp(tgt.mp + Math.round(amount), 0, tgt.maxMp);
    if (tgt.mp !== before) emit({ type: 'mp', target: tgt.uid, amount: tgt.mp - before, mp: tgt.mp, maxMp: tgt.maxMp, ...info });
    return tgt.mp - before;
  }
  function cancelCharge(u, reason) {
    if (!u.charging) return;
    const skillId = u.charging.skill;
    emit({ type: 'telegraph_cancel', actor: u.uid, skill: skillId, reason });
    u.charging = null;
    AI.onChargeCancelled(ctx, u, reason, skillId);
  }
  function delayUnit(u, frac, reason) {
    const amount = Math.round(CTB.baseDelay(eff(u, 'spd')) * frac);
    u.next += amount;
    emit({ type: 'delay', target: u.uid, amount, reason });
  }
  function breakUnit(u) {
    if (u.broken || !u.alive) return;
    u.broken = true;
    u.shields = 0;
    emit({ type: 'break', target: u.uid });
    cancelCharge(u, 'break');
    u.next = Math.max(u.next, state.now) + Math.round(CTB.BREAK_PUSH * CTB.baseDelay(eff(u, 'spd')));
    AI.onBreak(ctx, u);
  }
  function chipShields(u, n, src) {
    if (u.side !== 'enemy' || u.broken || !u.alive || n <= 0) return 0;
    const lost = Math.min(n, u.shields);
    u.shields -= lost;
    if (lost) emit({ type: 'shield', target: u.uid, lost, shields: u.shields, source: src ? src.uid : null });
    if (u.shields <= 0) breakUnit(u);
    return lost;
  }
  function kill(u, reason = 'damage') {
    if (!u.alive) return;
    u.alive = false;
    u.hp = 0;
    u.charging = null;
    u.statuses = {};
    u.mods = [];
    u.defending = false;
    if (u.cover) { const c = U(u.cover); if (c) c.coveredBy = null; u.cover = null; }
    if (u.coveredBy) { const g = U(u.coveredBy); if (g) g.cover = null; u.coveredBy = null; }
    emit({ type: 'ko', target: u.uid, reason });
    if (u.side === 'enemy') {
      if (reason !== 'devoured') state.killed.push({ uid: u.uid, id: u.id, elite: u.elite, rewards: u.rewards, lootZone: u.lootZone,
        summoned: u.summoned });
      if (u.split && !u.splitChild && reason !== 'devoured') {
        const kids = [];
        for (let i = 0; i < 2; i++) {
          const k = summon(u.id, { hpScale: u.split, splitChild: true, rewardScale: SPLIT_EXP, after: u });
          kids.push(k.uid);
        }
        emit({ type: 'split', source: u.uid, into: kids });
      }
      AI.onDeath(ctx, u);
    }
  }
  function damage(tgt, amount, src, info = {}) {
    if (!tgt.alive) return 0;
    let amt = Math.max(0, Math.round(amount));
    if (info.nonLethal && tgt.side === 'party') amt = Math.min(amt, tgt.hp - 1);
    amt = AI.clampDamage(ctx, tgt, amt);
    tgt.hp = Math.max(0, tgt.hp - amt);
    if (!info.quiet) emit({ type: 'damage', source: src ? src.uid : null, target: tgt.uid, amount: amt, hp: tgt.hp, maxHp: tgt.maxHp, ...info });
    if (tgt.side === 'party' && amt > 0) gainFury(tgt, FURY.takenFlat + FURY.takenScale * amt / tgt.maxHp, 'hurt');
    if (tgt.hp <= 0) kill(tgt, info.status ? info.status : 'damage');
    else AI.onDamaged(ctx, tgt);
    return amt;
  }
  function summon(enemyId, opts = {}) {
    const u = makeEnemyUnit({ id: enemyId, variant: opts.variant }, state.enemyCount++, opts);
    state.units[u.uid] = u;
    state.order.push(u.uid);
    u.next = state.now + Math.round(CTB.baseDelay(u.stats.spd) * (opts.firstTurn ?? 0.6));
    emit({ type: 'summon', enemy: u.uid, id: u.id, name: u.name, variant: u.variant, tint: u.tint, hp: u.hp,
      by: opts.by ? opts.by.uid : null, split: !!opts.splitChild });
    if (u.variant) learnTypes(u, u.weak); // the ink color tells the player the weakness
    return u;
  }

  // ----------------------------------------------------------------------------- one hit
  /**
   * Resolve a single damaging hit from src on tgt. part: { formula, power, types, pierce }.
   * Returns { amount, miss, weak, broke } and emits damage/miss/shield/break/reveal events.
   */
  function strike(src, tgt, part, act) {
    const types = hitTypes(src, part);
    // Echo Warden stances
    const reflect = AI.reflect(ctx, tgt, part, src);
    if (reflect === 'magic' && src.side === 'party') {
      const victims = living('party');
      const victim = victims[Math.floor(R() * victims.length)];
      emit({ type: 'reflect', actor: tgt.uid, source: src.uid, kind: 'magic', target: victim.uid });
      const b = baseHit(src, victim, { ...part, types: [] });
      const amt = Math.max(1, b.dmg * (1 - VARIANCE + R() * 2 * VARIANCE));
      damage(victim, amt, tgt, { kind: part.formula, reflected: true, crit: false, weak: false, types });
      return { amount: 0, miss: false, weak: false, reflected: true };
    }
    if (reflect === 'phys' && src.side === 'party') {
      const b = baseHit(src, tgt, part);
      const amt = Math.max(1, b.dmg * REFLECT_PHYS * (1 - VARIANCE + R() * 2 * VARIANCE));
      emit({ type: 'reflect', actor: tgt.uid, source: src.uid, kind: 'phys', target: src.uid });
      damage(src, amt, tgt, { kind: 'phys', reflected: true, crit: false, weak: false, types: [] });
      return { amount: 0, miss: false, weak: false, reflected: true };
    }
    const chance = hitChance(src, tgt, part, types);
    if (chance < 1 && R() >= chance) {
      const evaded = tgt.evade && src.side === 'party' && !types.includes('bow');
      emit({ type: 'miss', source: src.uid, target: tgt.uid, reason: evaded ? 'evade' : 'miss' });
      return { amount: 0, miss: true, weak: false };
    }
    const b = baseHit(src, tgt, part);
    let amt = b.dmg * (1 - VARIANCE + R() * 2 * VARIANCE);
    let crit = false;
    if (part.formula === 'phys' && b.aff.mult > 0 && R() < critChance(src)) { crit = true; amt *= CRIT_MULT; }
    if (b.aff.immune) {
      learnTypes(tgt, types);
      emit({ type: 'miss', source: src.uid, target: tgt.uid, reason: 'immune', types });
      return { amount: 0, miss: true, weak: false };
    }
    if (b.aff.absorb) {
      learnTypes(tgt, types);
      heal(tgt, Math.abs(amt), src, { absorbed: true });
      return { amount: 0, miss: false, weak: false };
    }
    // weakness -> shield
    let shieldLost = 0;
    const weakHit = b.aff.weak.length > 0;
    if (weakHit && tgt.side === 'enemy' && !tgt.broken) shieldLost = Math.min(1, tgt.shields);
    if (shieldLost) tgt.shields -= shieldLost;
    const wasBroken = tgt.broken;
    learnTypes(tgt, types);
    const dealt = damage(tgt, Math.max(1, amt), src, { kind: part.formula, crit, weak: weakHit, resist: b.aff.resist,
      types, element: types[0] || null, shieldLost, shields: tgt.side === 'enemy' ? tgt.shields : null, broken: wasBroken });
    let broke = false;
    if (shieldLost && tgt.alive && tgt.shields <= 0 && !tgt.broken) { breakUnit(tgt); broke = true; }
    // status interplay: fire thaws Chill, ice puts out Burn
    for (const t of types) for (const s of ST.CURED_BY_TYPE[t] || []) if (tgt.alive && has(tgt, s)) removeStatus(tgt, s, 'countered');
    // on-hit extras
    if (src.side === 'party' && tgt.alive && part.formula === 'phys' && src.stats.poisonOnHit && R() * 100 < src.stats.poisonOnHit) {
      addStatus(tgt, 'poison', 0, src);
    }
    if (src.side === 'party' && src.stats.lifesteal && dealt > 0) heal(src, dealt * src.stats.lifesteal / 100, src, { lifesteal: true });
    if (src.side === 'enemy' && src.lifesteal && dealt > 0) heal(src, dealt * src.lifesteal, src, { lifesteal: true });
    if (src.side === 'enemy' && src.curse && tgt.alive && R() < src.curse) {
      addStatus(tgt, CURSE_STATUSES[Math.floor(R() * CURSE_STATUSES.length)], 0, src);
    }
    if (act) { act.dealt += dealt; act.weak = act.weak || weakHit; act.broke = act.broke || broke; }
    return { amount: dealt, miss: false, weak: weakHit, broke };
  }

  // ----------------------------------------------------------------------------- targets
  function targetInfo(actor, action) {
    const sk = actionSkill(actor, action);
    if (action.type === 'item') {
      const it = CONSUMABLES[action.item];
      if (!it) return { mode: 'none', side: 'party', ids: [], default: null };
      if (it.target === 'ko_ally') {
        const ids = all().filter((u) => u.side === 'party' && !u.alive).map((u) => u.uid);
        return { mode: 'single', side: 'party', ids, default: ids[0] || null };
      }
      const ids = living('party').map((u) => u.uid);
      return { mode: 'single', side: 'party', ids, default: lowestPct(living('party')) };
    }
    if (!sk) return { mode: 'none', side: null, ids: [], default: null };
    const foes = opponentsOf(actor).map((u) => u.uid);
    const friends = alliesOf(actor).filter((u) => !(sk.excludeSelf && u.uid === actor.uid)).map((u) => u.uid);
    switch (sk.target) {
      case 'enemy': {
        const def = actor.lastTarget && foes.includes(actor.lastTarget) ? actor.lastTarget : foes[0] || null;
        return { mode: 'single', side: 'enemy', ids: foes, default: def };
      }
      case 'enemies': return { mode: 'all', side: 'enemy', ids: foes, default: null };
      case 'random': return { mode: 'random', side: 'enemy', ids: foes, default: null };
      case 'ally': return { mode: 'single', side: 'party', ids: friends,
        default: sk.excludeSelf ? lowestPct(friends.map(U)) : lowestPct(alliesOf(actor)) };
      case 'allies': return { mode: 'all', side: 'party', ids: friends, default: null };
      case 'ko_ally': {
        const ids = all().filter((u) => u.side === actor.side && !u.alive).map((u) => u.uid);
        return { mode: 'single', side: 'party', ids, default: ids[0] || null };
      }
      case 'self': return { mode: 'self', side: 'party', ids: [actor.uid], default: actor.uid };
      default: return { mode: 'none', side: null, ids: [], default: null };
    }
  }
  function lowestPct(units) {
    let best = null;
    for (const u of units) if (u && (!best || u.hp / u.maxHp < best.hp / best.maxHp)) best = u;
    return best ? best.uid : null;
  }
  function actionSkill(actor, action) {
    if (!action) return null;
    if (action.type === 'attack') return SKILLS.attack;
    if (['skill', 'tech', 'magic', 'fury', 'combo'].includes(action.type)) return SKILLS[action.skill] || null;
    return null;
  }

  // ----------------------------------------------------------------------------- commands
  function mpCost(u, sk) {
    if (!sk.mp) return 0;
    return Math.max(1, sk.mp - (u.side === 'party' ? (u.stats.mpCostDown || 0) : 0));
  }
  function silenced(u) { return has(u, 'silence'); }

  /** Combo check for an actor: { ok, reason, partners }. */
  function comboCheck(actor, sk) {
    if (!sk.members.includes(actor.id)) return { ok: false, reason: 'Not a member' };
    const partners = sk.members.filter((m) => m !== actor.id);
    for (const m of sk.members) {
      const u = U(m);
      if (!u || !u.alive) return { ok: false, reason: 'A partner is down', partners };
      if (sk.learn && sk.learn.level && u.level < sk.learn.level) return { ok: false, reason: `Needs level ${sk.learn.level}`, partners };
      if (silenced(u)) return { ok: false, reason: `${u.name} is silenced`, partners };
      if (has(u, 'stun')) return { ok: false, reason: `${u.name} is stunned`, partners };
      if (u.mp < (sk.cost[m] || 0)) return { ok: false, reason: `${u.name} lacks MP`, partners };
    }
    // the partners must hold the next slots after this turn
    const over = { [actor.uid]: state.now + delayOf(actor, 100) };
    const upcoming = timeline(partners.length, over).map((r) => r.uid);
    const ok = partners.every((p) => upcoming.includes(p));
    return ok ? { ok: true, partners } : { ok: false, reason: 'Partners not next in line', partners };
  }

  function commands(unit) {
    const u = typeof unit === 'string' ? U(unit) : unit || U(state.current);
    if (!u || u.side !== 'party') return [];
    const out = [];
    const sil = silenced(u);
    out.push({ id: 'attack', name: 'Attack', enabled: true });
    const techs = u.skills.map((id) => SKILLS[id]).filter((s) => s.kind === 'tech' && (!s.weapon || s.weapon === u.weapon));
    out.push({ id: 'tech', name: 'Tech', enabled: !sil && techs.length > 0, reason: sil ? 'Silenced' : techs.length ? null : 'No techs',
      list: techs.map((s) => {
        const cost = mpCost(u, s);
        const enabled = !sil && u.mp >= cost;
        return { skill: s.id, name: s.name, mp: cost, help: s.help, enabled, reason: sil ? 'Silenced' : enabled ? null : 'Not enough MP' };
      }) });
    const spells = u.skills.map((id) => SKILLS[id]).filter((s) => s.kind === 'magic');
    if (spells.length) {
      out.push({ id: 'magic', name: 'Magic', enabled: !sil, reason: sil ? 'Silenced' : null,
        list: spells.map((s) => {
          const cost = mpCost(u, s);
          const noTarget = s.target === 'ko_ally' && !all().some((x) => x.side === 'party' && !x.alive);
          const enabled = !sil && u.mp >= cost && !noTarget;
          return { skill: s.id, name: s.name, mp: cost, help: s.help, enabled,
            reason: sil ? 'Silenced' : u.mp < cost ? 'Not enough MP' : noTarget ? 'No target' : null };
        }) });
    }
    const art = FURY_ARTS[u.weapon];
    const knowsArt = art && u.skills.includes(art);
    const furyOk = u.fury >= FURY_MAX && knowsArt && !sil;
    out.push({ id: 'fury', name: 'Fury', enabled: furyOk, fury: u.fury,
      reason: !knowsArt ? 'Learn at mastery 2' : sil ? 'Silenced' : u.fury < FURY_MAX ? 'Fury not full' : null,
      list: knowsArt ? [{ skill: art, name: SKILLS[art].name, help: SKILLS[art].help, enabled: furyOk }] : [] });
    const combos = Object.values(SKILLS).filter((s) => s.kind === 'combo' && s.members.includes(u.id));
    const comboList = combos.map((s) => {
      const c = comboCheck(u, s);
      return { skill: s.id, name: s.name, help: s.help, partners: c.partners || [], mp: s.cost[u.id], enabled: c.ok, reason: c.ok ? null : c.reason };
    });
    const anyCombo = comboList.some((c) => c.enabled);
    out.push({ id: 'combo', name: 'Combo', visible: anyCombo, enabled: anyCombo, reason: anyCombo ? null : 'No partner ready', list: comboList });
    const items = Object.entries(state.inventory).filter(([id, q]) => q > 0 && CONSUMABLES[id] && CONSUMABLES[id].battle)
      .map(([id, q]) => {
        const it = CONSUMABLES[id];
        const noTarget = it.target === 'ko_ally' && !all().some((x) => x.side === 'party' && !x.alive);
        return { item: id, name: it.name, qty: q, help: it.desc, enabled: !noTarget, reason: noTarget ? 'No target' : null };
      });
    out.push({ id: 'item', name: 'Item', enabled: items.some((i) => i.enabled), reason: items.length ? null : 'No items', list: items });
    out.push({ id: 'defend', name: 'Defend', enabled: true });
    const other = u.weapons.find((w) => w !== u.weapon);
    out.push({ id: 'swap', name: 'Swap', label: other ? `Swap: ${cap(other)}` : 'Swap', weapon: other || null,
      enabled: !!other, reason: other ? null : 'No second weapon' });
    out.push({ id: 'flee', name: 'Flee', enabled: !!state.options.canFlee, reason: state.options.canFlee ? null : 'Cannot flee' });
    return out;
  }

  function validate(u, action) {
    if (!action || !action.type) return 'no action';
    const cmds = commands(u);
    const find = (id) => cmds.find((c) => c.id === id);
    switch (action.type) {
      case 'attack': break;
      case 'skill': case 'tech': case 'magic': case 'fury': {
        const sk = SKILLS[action.skill];
        if (!sk) return 'unknown skill';
        const group = sk.kind === 'magic' ? 'magic' : sk.kind === 'fury' ? 'fury' : 'tech';
        const c = find(group);
        const entry = c && c.list && c.list.find((x) => x.skill === sk.id);
        if (!entry) return 'skill not available';
        if (!entry.enabled) return entry.reason || 'skill disabled';
        break;
      }
      case 'combo': {
        const entry = find('combo').list.find((x) => x.skill === action.skill);
        if (!entry) return 'combo not available';
        if (!entry.enabled) return entry.reason;
        break;
      }
      case 'item': {
        const entry = find('item').list.find((x) => x.item === action.item);
        if (!entry || !entry.enabled) return 'item not available';
        break;
      }
      case 'defend': break;
      case 'swap': if (!find('swap').enabled) return 'no second weapon'; break;
      case 'flee': if (!state.options.canFlee) return 'cannot flee'; break;
      default: return `unknown action ${action.type}`;
    }
    const t = targetInfo(u, action);
    if (t.mode === 'single') {
      const target = action.target || t.default;
      if (!target || !t.ids.includes(target)) return 'invalid target';
    }
    if ((t.mode === 'all' || t.mode === 'random') && !t.ids.length && action.type !== 'item') return 'no targets';
    return null;
  }

  // ----------------------------------------------------------------------------- skill resolution
  function resolveTargets(user, sk, target) {
    switch (sk.target) {
      case 'enemy': case 'ally': case 'ko_ally': return target ? [U(target)].filter(Boolean) : [];
      case 'enemies': return opponentsOf(user);
      case 'allies': return alliesOf(user).filter((u) => !(sk.excludeSelf && u.uid === user.uid));
      case 'self': return [user];
      case 'boss': return living(user.side).filter((u) => u.boss);
      default: return [];
    }
  }

  /** Generic skill resolution for party and enemies. Returns an action record. */
  function useSkill(user, sk, target, opts = {}) {
    const act = { dealt: 0, weak: false, broke: false, hitTargets: [] };
    let targets = resolveTargets(user, sk, target);
    // enemy single-target attacks: Taunt pulls them, Guard redirects them
    if (user.side === 'enemy' && sk.target === 'enemy' && targets.length) targets = targets.map((t) => redirect(t, sk));
    if (!opts.silentStart) {
      emit({ type: 'action_start', actor: user.uid, action: { type: sk.kind === 'enemy' ? 'enemy' : sk.kind, skill: sk.id, name: sk.name },
        targets: sk.target === 'random' ? opponentsOf(user).map((u) => u.uid) : targets.map((t) => t.uid),
        fx: sk.fx || null, sfx: sk.sfx || null, charged: !!opts.charged, weapon: user.side === 'party' ? user.weapon : null });
    }
    if (sk.formula === 'phys' && sk.target === 'enemy' && targets[0] && !hitTypes(user, sk).includes('bow')) {
      emit({ type: 'move_to', actor: user.uid, target: targets[0].uid });
    }
    const part = { id: sk.id, formula: sk.formula, power: sk.power, types: sk.types, pierce: sk.pierce };
    const landed = new Set();
    if (sk.formula === 'phys' || sk.formula === 'mag') {
      if (sk.target === 'random') {
        for (let h = 0; h < sk.hits; h++) {
          const foes = opponentsOf(user);
          if (!foes.length) break;
          const t = foes[Math.floor(R() * foes.length)];
          const r = strike(user, t, part, act);
          if (!r.miss && !r.reflected) landed.add(t.uid);
        }
      } else {
        for (const t of targets) {
          for (let h = 0; h < sk.hits; h++) {
            if (!t.alive) break;
            const r = strike(user, t, part, act);
            if (!r.miss && !r.reflected) landed.add(t.uid);
          }
        }
      }
    } else if (sk.formula === 'heal') {
      for (const t of targets) {
        if (!t.alive) continue;
        let amt = eff(user, 'mag') * (sk.power / 100);
        amt *= 1 + (user.stats.healPow || 0) / 100;
        if (has(user, 'focus')) amt *= ST.FOCUS_MULT;
        amt *= 1 - VARIANCE / 2 + R() * VARIANCE;
        heal(t, amt, user, { skill: sk.id });
        landed.add(t.uid);
      }
    } else {
      for (const t of targets) landed.add(t.uid);
    }
    // effects
    const effTargets = sk.target === 'random' ? [...landed].map(U) : targets.filter((t) => landed.has(t.uid) || sk.formula === 'none');
    for (const e of sk.effects || []) applyEffect(user, sk, e, effTargets, act);
    // consume Focus on any damaging or healing action
    if ((sk.formula === 'phys' || sk.formula === 'mag' || sk.formula === 'heal') && has(user, 'focus')) removeStatus(user, 'focus', 'consumed');
    if (user.side === 'party' && act.dealt > 0) {
      gainFury(user, FURY.deal + (act.weak ? FURY.weak : 0) + (act.broke ? FURY.brk : 0), 'strike');
    }
    if (user.side === 'party' && sk.formula === 'phys' && (sk.kind === 'attack' || sk.kind === 'tech' || sk.kind === 'fury')) {
      user.uses[user.weapon] = (user.uses[user.weapon] || 0) + 1;
    }
    if (target && user.side === 'party' && sk.target === 'enemy') user.lastTarget = target;
    return act;
  }

  function redirect(t, sk) {
    const taunter = living('party').find((u) => has(u, 'taunt'));
    let out = t;
    if (taunter && taunter.uid !== t.uid) {
      emit({ type: 'message', text: `${taunter.name} draws the attack!`, kind: 'taunt' });
      out = taunter;
    }
    if (out.coveredBy) {
      const g = U(out.coveredBy);
      if (g && g.alive && !has(g, 'stun')) {
        emit({ type: 'cover', actor: g.uid, target: out.uid });
        out = g;
      }
    }
    return out;
  }

  function applyEffect(user, sk, e, targets, act) {
    if (e.selfStatus) { addStatus(user, e.selfStatus, e.turns, user); return; }
    const toUser = !(sk.target === 'ally' || sk.target === 'allies');
    if (e.furyGain && toUser) { gainFury(user, e.furyGain, 'skill'); return; }
    if (e.mpGain && toUser) { changeMp(user, e.mpGain, { skill: sk.id }); return; }
    if (e.partyHeal) {
      for (const a of alliesOf(user)) heal(a, a.maxHp * e.partyHeal, user, { skill: sk.id });
      return;
    }
    if (e.feast || e.devour) { AI.special(ctx, user, sk, e, targets); return; }
    for (const t of targets) {
      if (!t) continue;
      if (e.revive) continue;
      if (!t.alive) continue;
      if (e.status) {
        const chance = e.chance === undefined ? 1 : e.chance;
        if (chance >= 1 || R() < chance) addStatus(t, e.status, e.turns, user);
      }
      if (e.furyGain) gainFury(t, e.furyGain, 'skill');
      if (e.mpGain) changeMp(t, e.mpGain, { skill: sk.id });
      if (e.delay) delayUnit(t, e.delay, sk.id);
      if (e.shieldChip) { const lost = chipShields(t, e.shieldChip, user); if (lost && act) { act.weak = true; if (t.broken) act.broke = true; } }
      if (e.interrupt && t.charging) {
        if (t.boss) {
          delayUnit(t, BOSS_INTERRUPT_DELAY, 'interrupt');
          emit({ type: 'message', text: `${t.name} reels back!`, kind: 'interrupt' });
        } else {
          cancelCharge(t, 'interrupt');
        }
      }
      if (e.reveal) revealAll(t);
      if (e.cure) for (const s of e.cure) if (has(t, s)) removeStatus(t, s, 'cured');
      if (e.statMod) for (const [stat, d] of Object.entries(e.statMod)) addMod(t, stat, 1 + d, e.turns || 3, sk.id);
      if (e.cover) {
        if (user.cover) { const old = U(user.cover); if (old) old.coveredBy = null; }
        user.cover = t.uid; t.coveredBy = user.uid; user.defending = true;
        emit({ type: 'guard', actor: user.uid, target: t.uid });
      }
      if (e.heal) heal(t, t.maxHp * e.heal, user, { skill: sk.id });
      if (e.mpDrain) {
        const got = -changeMp(t, -e.mpDrain, { drained: true });
        if (got > 0 && user.maxMp) changeMp(user, got);
      }
      if (e.drain && act && act.dealt > 0) heal(user, act.dealt * e.drain, user, { drain: true });
    }
  }

  // ----------------------------------------------------------------------------- party actions
  function doAction(u, action) {
    const sk = actionSkill(u, action);
    const tInfo = targetInfo(u, action);
    const target = action.target || tInfo.default;
    switch (action.type) {
      case 'attack': {
        useSkill(u, sk, target);
        return [u, 100];
      }
      case 'skill': case 'tech': case 'magic': case 'fury': {
        if (sk.kind === 'fury') {
          u.fury = 0;
          emit({ type: 'fury_gain', target: u.uid, amount: -FURY_MAX, fury: 0, reason: 'spent' });
        } else {
          const cost = mpCost(u, sk);
          if (cost) changeMp(u, -cost, { cost: true });
        }
        useSkill(u, sk, target);
        return [u, sk.rank];
      }
      case 'combo': return doCombo(u, sk, target);
      case 'item': return doItem(u, action, target);
      case 'defend': {
        u.defending = true;
        emit({ type: 'action_start', actor: u.uid, action: { type: 'defend', name: 'Defend' }, targets: [u.uid] });
        emit({ type: 'defend', actor: u.uid });
        gainFury(u, FURY.defend, 'defend');
        if (u.maxMp) changeMp(u, Math.max(1, Math.round(u.maxMp * DEFEND_MP)));
        return [u, CTB.RANK.defend];
      }
      case 'swap': {
        const other = u.weapons.find((w) => w !== u.weapon);
        const s = memberStats({ id: u.id, level: u.level, equip: u.equip, weapon: other });
        u.weapon = other; u.stats = s;
        emit({ type: 'action_start', actor: u.uid, action: { type: 'swap', name: 'Swap' }, targets: [u.uid] });
        emit({ type: 'swap', actor: u.uid, weapon: other });
        return [u, CTB.RANK.swap];
      }
      case 'flee': {
        emit({ type: 'action_start', actor: u.uid, action: { type: 'flee', name: 'Flee' }, targets: [] });
        const ps = living('party'), es = living('enemy');
        const avg = (arr) => arr.reduce((s, x) => s + eff(x, 'spd'), 0) / Math.max(1, arr.length);
        const chance = clamp(0.5 + (avg(ps) - avg(es)) * 0.04 + state.fleeAttempts * 0.15, 0.2, 0.95);
        state.fleeAttempts++;
        if (R() < chance) {
          state.over = true; state.outcome = 'escape';
          emit({ type: 'escape', success: true });
        } else {
          emit({ type: 'escape', success: false });
          emit({ type: 'message', text: 'Could not get away!' });
        }
        return [u, CTB.RANK.flee];
      }
      default: return [u, 100];
    }
  }

  function doCombo(u, sk, target) {
    const members = sk.members.map(U);
    for (const m of members) if (sk.cost[m.id]) changeMp(m, -sk.cost[m.id], { cost: true });
    let targets = sk.target === 'enemies' ? opponentsOf(u) : sk.target === 'allies' ? alliesOf(u) : [U(target)].filter(Boolean);
    emit({ type: 'action_start', actor: u.uid, action: { type: 'combo', skill: sk.id, name: sk.name, members: sk.members.slice() },
      targets: targets.map((t) => t.uid), fx: sk.fx, sfx: sk.sfx });
    const act = { dealt: 0, weak: false, broke: false };
    const perMember = {};
    for (const part of sk.parts) {
      const by = U(part.by);
      for (const t of targets) {
        if (!t.alive) continue;
        if (part.formula === 'phys' && !hitTypes(by, part).includes('bow')) emit({ type: 'move_to', actor: by.uid, target: t.uid });
        const before = act.dealt;
        strike(by, t, part, act);
        perMember[by.uid] = (perMember[by.uid] || 0) + (act.dealt - before);
        if (part.formula === 'phys') by.uses[by.weapon] = (by.uses[by.weapon] || 0) + 1;
      }
      targets = targets.filter((t) => t.alive || sk.target === 'allies');
    }
    const live = sk.target === 'allies' ? alliesOf(u) : targets.filter((t) => t.alive);
    for (const e of sk.effects || []) applyEffect(u, sk, e, live, act);
    for (const m of members) {
      if (has(m, 'focus') && sk.parts.some((p) => p.by === m.id)) removeStatus(m, 'focus', 'consumed');
      if (act.dealt > 0) gainFury(m, FURY.deal + (act.weak ? FURY.weak : 0) + (act.broke ? FURY.brk : 0), 'combo');
    }
    return [members, sk.rank];
  }

  function doItem(u, action, target) {
    const it = CONSUMABLES[action.item];
    state.inventory[action.item] -= 1;
    state.itemsUsed[action.item] = (state.itemsUsed[action.item] || 0) + 1;
    const t = U(target);
    emit({ type: 'action_start', actor: u.uid, action: { type: 'item', item: it.id, name: it.name }, targets: [t.uid] });
    const e = it.effect;
    if (e.revive) {
      if (!t.alive) {
        t.alive = true; t.hp = Math.max(1, Math.round(t.maxHp * e.revive)); t.statuses = {}; t.mods = [];
        t.next = state.now + delayOf(t, 100);
        emit({ type: 'revive', target: t.uid, hp: t.hp });
      }
    }
    if (e.heal && t.alive) heal(t, e.heal, u, { item: it.id });
    if (e.mp && t.alive) changeMp(t, e.mp, { item: it.id });
    if (e.cure && t.alive) for (const s of e.cure) if (has(t, s)) removeStatus(t, s, 'cured');
    return [u, ITEM_RANK];
  }

  // ----------------------------------------------------------------------------- turn flow
  function endTurn(units, rank) {
    for (const u of [].concat(units)) {
      if (!u.alive) continue;
      u.next = state.now + delayOf(u, rank);
      const expired = ST.decrement(u);
      for (const id of expired) emit({ type: 'status_remove', target: u.uid, status: id, reason: 'expired' });
      state.turn++;
      if (u.side === 'party') state.partyTurns++; else state.enemyTurns++;
    }
  }

  function checkEnd() {
    if (state.over) return true;
    if (!living('enemy').length) { victory(); return true; }
    if (!living('party').length) {
      state.over = true; state.outcome = 'defeat';
      emit({ type: 'defeat' });
      return true;
    }
    return false;
  }

  function victory() {
    state.over = true; state.outcome = 'victory';
    let exp = 0, gold = 0, mp = 0;
    for (const k of state.killed) { exp += k.rewards.exp; gold += k.rewards.gold; mp += k.rewards.masteryPts; }
    const killedDefs = state.killed.filter((k) => !k.summoned).map((k) => ({ id: k.id, elite: k.elite, lootZone: k.lootZone,
      drops: (ENEMIES[k.id] && ENEMIES[k.id].drops) || [] }));
    const drops = rollBattleDrops(R, killedDefs, { zone: state.options.zone });
    // mastery: enemy points split between the weapon types each member used, plus 1 per use
    const mastery = {};
    for (const u of all().filter((x) => x.side === 'party')) {
      const uses = u.uses;
      const total = Object.values(uses).reduce((s, v) => s + v, 0);
      mastery[u.uid] = {};
      if (!u.alive) continue;
      if (!total) { mastery[u.uid][u.weapon] = Math.round(mp / 2); continue; }
      for (const [w, n] of Object.entries(uses)) mastery[u.uid][w] = Math.round(mp * n / total) + n;
    }
    for (const [id, q] of Object.entries(drops.consumables.reduce((o, c) => { o[c.item] = (o[c.item] || 0) + c.qty; return o; }, {}))) {
      state.inventory[id] = (state.inventory[id] || 0) + q;
    }
    state.rewards = { exp, gold, mastery, items: drops.items, consumables: drops.consumables };
    emit({ type: 'victory', exp, gold, mastery, items: drops.items, consumables: drops.consumables });
  }

  function startTurn(u) {
    emit({ type: 'turn_start', actor: u.uid, time: state.now, round: Math.floor(state.partyTurns / state.partySize) + 1 });
    if (u.defending) { u.defending = false; emit({ type: 'defend_end', actor: u.uid }); }
    if (u.cover) { const c = U(u.cover); if (c) c.coveredBy = null; u.cover = null; }
    for (const t of ST.turnTicks(u)) {
      if (t.amount > 0) {
        const got = heal(u, t.amount, null, { status: t.status, quiet: true });
        emit({ type: 'status_tick', target: u.uid, status: t.status, amount: got, hp: u.hp, maxHp: u.maxHp });
      } else {
        const ev = emit({ type: 'status_tick', target: u.uid, status: t.status, amount: 0, hp: u.hp, maxHp: u.maxHp });
        const lost = damage(u, -t.amount, null, { status: t.status, nonLethal: true, kind: 'status', quiet: true });
        ev.amount = -lost; ev.hp = u.hp;
      }
      if (!u.alive) return false;
    }
    if (has(u, 'stun')) {
      removeStatus(u, 'stun', 'consumed');
      emit({ type: 'skip', actor: u.uid, reason: 'stun' });
      endTurn(u, CTB.RANK.skip);
      return false;
    }
    if (u.broken) {
      emit({ type: 'skip', actor: u.uid, reason: 'break' });
      u.broken = false;
      u.shields = u.maxShields;
      emit({ type: 'shield_restore', target: u.uid, shields: u.shields });
      endTurn(u, CTB.RANK.skip);
      AI.onRecover(ctx, u);
      return false;
    }
    return true;
  }

  function advance() {
    let guard = 0;
    while (!state.over && guard++ < 500) {
      if (checkEnd()) break;
      const pick = CTB.nextActor(entries());
      if (!pick) break;
      const u = U(pick.uid);
      state.now = Math.max(state.now, u.next);
      state.current = u.uid;
      if (!startTurn(u)) { if (checkEnd()) break; continue; }
      if (checkEnd()) break;
      emit({ type: 'timeline', order: timeline(8) });
      return;
    }
    if (state.over) state.current = null;
  }

  function finish(actorsAndRank) {
    if (!state.over) {
      const [who, rank] = actorsAndRank;
      endTurn(who, rank);
    }
    if (!checkEnd()) advance();
    else state.current = null;
  }

  // ----------------------------------------------------------------------------- enemy turn
  function enemyAct(u) {
    u.ai.turns++;
    let rank = 100;
    if (u.charging) {
      const c = u.charging;
      u.charging = null;
      const sk = SKILLS[c.skill];
      let target = c.target;
      if (sk.target === 'enemy' && (!target || !U(target) || !U(target).alive)) {
        const foes = living('party');
        target = foes.length ? foes[Math.floor(R() * foes.length)].uid : null;
      }
      useSkill(u, sk, target, { charged: true });
      AI.onChargeFired(ctx, u, sk);
      rank = sk.rank;
    } else {
      const plan = AI.decide(ctx, u);
      if (plan && plan.skill) {
        const sk = SKILLS[plan.skill];
        if (plan.skill === 'summon_pages' || plan.special) {
          emit({ type: 'action_start', actor: u.uid, action: { type: 'enemy', skill: sk.id, name: sk.name }, targets: [], fx: sk.fx });
          AI.special(ctx, u, sk, { summon: true }, []);
        } else {
          useSkill(u, sk, plan.target);
        }
        rank = sk.rank;
      } else {
        emit({ type: 'message', text: `${u.name} watches warily.` });
      }
    }
    return rank;
  }

  // ----------------------------------------------------------------------------- the context AI uses
  const ctx = {
    get state() { return state; }, R, emit, U, all, living, opponentsOf, alliesOf, has, eff,
    addStatus, removeStatus, heal, damage, kill, summon, cancelCharge, delayUnit, breakUnit, chipShields, changeMp,
    addMod, revealAll, learnTypes, turnsUntil, timeline, fill, skill: (id) => SKILLS[id],
    setWeak(u, weak, resist, key) {
      u.weak = weak.slice(); u.resist = resist ? resist.slice() : u.resist; u.weakKey = key;
    },
    setShields(u, n) {
      u.maxShields = n;
      if (!u.broken) { u.shields = n; emit({ type: 'shield_restore', target: u.uid, shields: n }); }
    },
    planCharge(u, skillId, target) {
      const sk = SKILLS[skillId];
      u.charging = { skill: skillId, target: target || null };
      const t = target ? U(target) : null;
      const text = fill(sk.telegraph || `${u.name} gathers its strength...`, { name: u.name, target: t ? t.name : 'the party' });
      emit({ type: 'telegraph', actor: u.uid, skill: skillId, name: sk.name, text, target: target || null,
        targets: sk.target === 'enemies' ? living('party').map((x) => x.uid) : target ? [target] : [],
        nextTurn: turnsUntil(u.uid) });
    },
  };

  // ----------------------------------------------------------------------------- start
  function begin() {
    if (state.startEvents && state.startEvents.length) return state.startEvents.slice();
    E = [];
    const start = state.options.start;
    for (const u of all()) {
      let t = Math.round(CTB.baseDelay(eff(u, 'spd')) * (0.5 + 0.5 * R()));
      if (start === 'preemptive' && u.side === 'party') t = Math.round(t * 0.3);
      if (start === 'ambush' && u.side === 'enemy') t = Math.round(t * 0.3);
      u.next = t;
    }
    emit({ type: 'battle_start', start, boss: state.options.boss,
      units: all().map((u) => ({ uid: u.uid, id: u.id, side: u.side, name: u.name, hp: u.hp, maxHp: u.maxHp, mp: u.mp,
        maxMp: u.maxMp, fury: u.fury, elite: u.elite || null, shields: u.side === 'enemy' ? u.shields : null, boss: !!u.boss,
        weapon: u.weapon || null, variant: u.variant || null })) });
    if (start === 'preemptive') emit({ type: 'message', text: 'You caught them off guard!' });
    if (start === 'ambush') emit({ type: 'message', text: 'Ambushed!' });
    for (const u of living('enemy')) if (u.elite) emit({ type: 'message', text: `${u.name} appears! (Elite)`, kind: 'elite', target: u.uid });
    for (const u of living('party')) {
      if (u.stats.startHaste) addStatus(u, 'haste', u.stats.startHaste, u);
      if (u.fury >= FURY_MAX) emit({ type: 'fury_ready', target: u.uid });
    }
    AI.onStart(ctx);
    advance();
    state.startEvents = E.slice();
    return E;
  }

  // ----------------------------------------------------------------------------- public api
  const api = {
    get state() { return state; },
    begin,
    get startEvents() { return state.startEvents.slice(); },
    current() { return state.current ? U(state.current) : null; },
    unit: U,
    units: () => all(),
    living,
    commands,
    targets(unit, action) {
      const u = typeof unit === 'string' ? U(unit) : unit || U(state.current);
      return targetInfo(u, action || { type: 'attack' });
    },
    knowledge,
    timeline: (n = 8) => timeline(n),
    previewTimeline(unit, action) {
      const u = typeof unit === 'string' ? U(unit) : unit || U(state.current);
      return preview(u, action || { type: 'attack' });
    },
    estimate(unit, action) {
      const u = typeof unit === 'string' ? U(unit) : unit || U(state.current);
      return estimateEffects(u, action || { type: 'attack' });
    },
    perform(action) {
      E = [];
      if (!state.startEvents || !state.startEvents.length) begin(), E = [];
      if (state.over) return [{ type: 'invalid', reason: 'battle is over' }];
      const u = U(state.current);
      if (!u || u.side !== 'party') return [{ type: 'invalid', reason: 'not a party turn' }];
      const a = { ...action };
      if (['tech', 'magic', 'fury'].includes(a.type)) a.type = 'skill';
      const err = validate(u, a);
      if (err) return [{ type: 'invalid', reason: err }];
      const res = doAction(u, a);
      finish(res);
      return E;
    },
    runEnemyTurn() {
      E = [];
      if (!state.startEvents || !state.startEvents.length) begin(), E = [];
      if (state.over) return [{ type: 'invalid', reason: 'battle is over' }];
      const u = U(state.current);
      if (!u || u.side !== 'enemy') return [{ type: 'invalid', reason: 'not an enemy turn' }];
      const rank = enemyAct(u);
      if (!state.over && u.alive) {
        endTurn(u, rank);
        if (!checkEnd()) AI.afterTurn(ctx, u);
      }
      if (!checkEnd()) advance(); else state.current = null;
      return E;
    },
    isOver() { return !!state.over; },
    result() {
      if (!state.over) return null;
      const r = state.rewards || { exp: 0, gold: 0, mastery: {}, items: [], consumables: [] };
      return {
        outcome: state.outcome,
        exp: state.outcome === 'victory' ? r.exp : 0,
        gold: state.outcome === 'victory' ? r.gold : 0,
        mastery: state.outcome === 'victory' ? r.mastery : {},
        items: state.outcome === 'victory' ? r.items : [],
        consumables: state.outcome === 'victory' ? r.consumables : [],
        inventory: { ...state.inventory }, itemsUsed: { ...state.itemsUsed },
        party: all().filter((u) => u.side === 'party').map((u) => ({ id: u.id, hp: u.alive ? u.hp : 0, mp: u.mp,
          fury: u.fury, weapon: u.weapon })),
        revealed: JSON.parse(JSON.stringify(state.revealed)),
        turns: state.turn, partyTurns: state.partyTurns, enemyTurns: state.enemyTurns,
        rounds: state.partyTurns / state.partySize, time: state.now,
      };
    },
  };

  // ----------------------------------------------------------------------------- preview
  function estimateEffects(u, action) {
    const out = [];
    if (!u) return out;
    const sk = actionSkill(u, action);
    const tInfo = targetInfo(u, action);
    const target = action.target || tInfo.default;
    const known = (t, types) => {
      if (t.side !== 'enemy') return true;
      const k = revealedFor(t);
      return types.every((x) => k.includes(x));
    };
    const one = (src, t, part, hits = 1) => {
      const b = baseHit(src, t, part);
      const lo = Math.max(1, Math.floor(b.dmg * (1 - VARIANCE))) * hits;
      const hi = Math.max(1, Math.ceil(b.dmg * (1 + VARIANCE))) * hits;
      const isKnown = known(t, b.types);
      return { lo, hi, avg: b.dmg * hits, weak: isKnown ? b.aff.weak.length > 0 : '?', resist: isKnown ? b.aff.resist : '?',
        weakTrue: b.aff.weak.length > 0, hit: hitChance(src, t, part, b.types), crit: part.formula === 'phys' ? critChance(src) : 0 };
    };
    if (!sk) {
      if (action.type === 'item') {
        const it = CONSUMABLES[action.item];
        const t = U(target);
        if (it && t) out.push({ target: t.uid, heal: it.effect.heal || 0, mp: it.effect.mp || 0, revive: !!it.effect.revive,
          cure: it.effect.cure || [] });
      }
      return out;
    }
    if (sk.kind === 'combo') {
      const ts = sk.target === 'enemies' ? opponentsOf(u) : sk.target === 'allies' ? [] : [U(target)].filter(Boolean);
      for (const t of ts) {
        let lo = 0, hi = 0, avg = 0, weak = false, weakTrue = false, weakHits = 0;
        for (const p of sk.parts) {
          const r = one(U(p.by), t, p);
          lo += r.lo; hi += r.hi; avg += r.avg;
          if (r.weak === true) weak = true; else if (r.weak === '?' && !weak) weak = '?';
          if (r.weakTrue) { weakTrue = true; weakHits++; }
        }
        const chip = (sk.effects || []).reduce((s, e) => s + (e.shieldChip || 0), 0);
        const shieldsAfter = t.broken ? 0 : Math.max(0, t.shields - weakHits - chip);
        out.push({ target: t.uid, min: lo, max: hi, avg, weak, breaks: !t.broken && (weakTrue || chip > 0) && shieldsAfter <= 0,
          shieldsAfter, kills: lo >= t.hp });
      }
      return out;
    }
    if (sk.formula === 'phys' || sk.formula === 'mag') {
      const ts = sk.target === 'random' || sk.target === 'enemies' ? opponentsOf(u) : [U(target)].filter(Boolean);
      const hits = sk.target === 'random' ? 1 : sk.hits;
      const chip = (sk.effects || []).reduce((s, e) => s + (e.shieldChip || 0), 0);
      for (const t of ts) {
        const r = one(u, t, sk, hits);
        const weakHits = r.weakTrue ? (sk.target === 'random' ? 1 : hits) : 0;
        const shieldsAfter = t.broken ? 0 : Math.max(0, t.shields - weakHits - chip);
        out.push({ target: t.uid, min: r.lo, max: r.hi, avg: r.avg, perHit: sk.target === 'random', hits: sk.hits,
          weak: r.weak, resist: r.resist, hit: r.hit, crit: r.crit,
          breaks: !t.broken && (r.weakTrue || chip > 0) && shieldsAfter <= 0, shieldsAfter, kills: r.lo >= t.hp && r.hit >= 1 });
      }
      return out;
    }
    if (sk.formula === 'heal') {
      const ts = sk.target === 'allies' ? alliesOf(u) : [U(target)].filter(Boolean);
      for (const t of ts) {
        let amt = eff(u, 'mag') * (sk.power / 100) * (1 + (u.stats.healPow || 0) / 100);
        if (has(u, 'focus')) amt *= ST.FOCUS_MULT;
        out.push({ target: t.uid, heal: Math.round(amt), min: Math.round(amt * (1 - VARIANCE / 2)), max: Math.round(amt * (1 + VARIANCE / 2)) });
      }
      return out;
    }
    const ts = resolveTargets(u, sk, target);
    for (const t of ts) out.push({ target: t.uid, effects: (sk.effects || []).map((e) => Object.keys(e)[0]) });
    return out;
  }

  function preview(u, action) {
    if (!u) return { order: [], landing: -1, effects: [] };
    let rank = 100;
    const sk = actionSkill(u, action);
    if (sk && action.type !== 'attack') rank = sk.rank;
    if (action.type === 'defend') rank = CTB.RANK.defend;
    if (action.type === 'item') rank = ITEM_RANK;
    if (action.type === 'swap') rank = CTB.RANK.swap;
    if (action.type === 'flee') rank = CTB.RANK.flee;
    const effects = estimateEffects(u, action);
    const override = {};
    const movers = action.type === 'combo' && sk ? sk.members.map(U) : [u];
    // statuses the action grants for sure (Haste on self) affect its own delay only from next turn on
    for (const m of movers) override[m.uid] = state.now + delayOf(m, rank);
    // deterministic pushes on targets (Pin Shot, Shield Bash) and guaranteed kills
    const tInfo = targetInfo(u, action);
    const target = action.target || tInfo.default;
    const removed = new Set();
    if (sk) {
      for (const e of sk.effects || []) {
        if (e.delay && target && U(target)) override[target] = U(target).next + Math.round(CTB.baseDelay(eff(U(target), 'spd')) * e.delay);
      }
      for (const ef of effects) if (ef.kills) removed.add(ef.target);
    }
    const stOver = {};
    for (const m of movers) stOver[m.uid] = afterTurnStatuses(m);
    const ents = entries(override, stOver).filter((e) => !removed.has(e.uid)).map((e) => {
      if (sk && sk.formula !== 'none') {
        const ef = effects.find((x) => x.target === e.uid);
        if (ef && ef.breaks) {
          const t = U(e.uid);
          return { ...e, broken: true, charging: null,
            next: Math.max(e.next, state.now) + Math.round(CTB.BREAK_PUSH * CTB.baseDelay(eff(t, 'spd'))) };
        }
      }
      return e;
    });
    const order = CTB.peek(ents, 8);
    const landing = order.findIndex((r) => r.uid === u.uid);
    return { order, landing, rank, delay: override[u.uid] - state.now, effects };
  }

  if (!cfg.state && !cfg.deferBegin) begin();
  return api;
}
