// The Deep Stacks balance proof (docs/DEEP_STACKS_PLAN.md 11; docs/briefs/C3-sim-bot.md). A scripted descent from B1 on many
// seeds through the game's own code: the real run state (game/cave.js enter, descend, foundBlue, clear), the real floors
// (data/cave/world.js buildFloor: the generator with the floor's encounters, the pity rule's blue chest), the real fights
// (rules.js createEncounterBattle, the scene's armBattle hook, ai.js partyAction), the real rewards (rewards.js
// applyBattleOutcome: EXP by the real curve, mastery, drops), the real chests (loot.js rollRedChest / rollBlueChest on the
// chest's own rng, world.js chestRng), and the equip prompt's own choice (inventory.js equipOffers). Nothing is averaged or
// modelled except the walk time per floor (an estimate, see TIME below).
//
//   node tools/sim/simulate.mjs --cave                  50 seeds, B1 to B99, then the Binder; prints the band tables
//   node tools/sim/simulate.mjs --cave --check          exit 1 when a target in CAVE_TARGETS is missed
//   node tools/sim/cave.mjs [same flags]                the same, run directly
//     --seeds N (50)   --seed0 S (1)   --floors N (99, stop after BN; the Binder only when N is 99)
//     --policy competent | naive | reckless (competent; the check reads competent only)
//     --all-policies   also run attack-only and reckless (printed, never checked)
//     --binder-per-seed N  Binder fights from each seed that reaches B100 (3; the first is the run's own)
//     --jobs N         worker threads (default min(6, cores - 1)); the numbers do not depend on it
//     --chests all | cheap   every chest (default, checked) or the bot's hurried profile (only cheap detours; printed)
//     --patch '<json>' a tuning what-if (applyPatch): { tuning, ease, early, band, cons, extra, landing, field, binder, equip }
//     --json           write tools/sim/out/cave_sim.json      --md   write qa/cave/out/sim_cave.md
//     --quiet          the summary only
//
// THE POLICY (one careful player, the bot's habits):
//   fights   every foe the floor places (the generator's enemy events, their encounter ids), in event order; the party
//            never flees; battle start 'normal'. Battle play is ai.js partyAction(policy).
//   chests   every red and blue chest on every floor (they sit in dead ends; the bot opens them when cheap).
//   gear     after every fight and chest: the equip prompt (equipOffers), answered for the member who really gains (a weapon
//            counts what it adds to that member's best weapon, so an empty hand comes first), until nothing gains; the active
//            weapon is the carried type with the best role-weighted stats (inventory.js ROLE_WEIGHTS).
//   healing  no rests, no fonts (plan 3): between fights a fallen member gets a Phoenix Feather when the bag has one; Mira casts
//            Mending Rain / Mend on anyone under 60% while she keeps a quarter of her MP; then a Potion or Hi-Potion for anyone
//            still under 45% (70% while the bag holds more than six); an Ether when Mira is under 30% MP.
//   bestiary Episode 1's foes known (the entry needs ep1_complete); everything else is learned by fighting, as in the game.
//   a wipe ends the seed (the run's record floor is where it fell).
//
// TIME (an Inference until the bot measures it, docs/DEEP_STACKS_BALANCE.md): walk = the greedy tour arrival -> every chest ->
// the stairs on the floor's own walk model, at run speed (8 frames a tile at 60 Hz) plus a quarter for turns and foes met on
// the way; a fight = BATTLE_FIXED_S + rounds x ROUND_S at battle speed 1x; a chest CHEST_S; the stairs STAIRS_S.
//
// Also importable: runDescent(), runCave(), checkCave(), formatCave(), CAVE_TARGETS.

import { createEncounterBattle, makeRng, memberStats } from '../../src/battle/rules.js';
import { partyAction } from '../../src/battle/ai.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { ENCOUNTERS, ZONES, ZONE_ORDER, OPTIONAL_ZONES } from '../../src/data/encounters.js';
import { newGameEp2, count, give, addGear } from '../../src/game/state.js';
import * as CAVE from '../../src/game/cave.js';
import { applyBattleOutcome, bestiaryForBattle } from '../../src/battle/scene/rewards.js';
import { equipOffers, equipGear, equipDeltaFor, optimize, useItemOnMember, useSkillOnMember, fieldSkills, isWeaponKey, weaponTypes, weightedGain } from '../../src/game/inventory.js';
import { hashSeed } from '../../src/core/rng.js';
import registerCave from '../../src/data/cave/index.js';
import { isLanding, BINDER_ENCOUNTER_ID, BOSS_FLOOR, TUNING, OPENING_EASE, EARLY_EASE, BAND_ADJUST } from '../../src/data/cave/foes.js';
import { setLootFloor, rollRedChest, rollBlueChest, CONSUMABLES_BY_BAND, CONSUMABLE_EXTRA, LANDING_SUPPLY } from '../../src/data/cave/loot.js';
import { wornProps, KEEPERS_BOOKMARK_ID } from '../../src/data/cave/items.js';
import { walkModel } from '../../src/data/cave/gen.js';
import os from 'node:os';
import { isMainThread, workerData, parentPort } from 'node:worker_threads';

await registerCave();
const W = await import('../../src/data/cave/world.js');

// ------------------------------------------------------------------ targets (plan 11, the brief)
/**
 * Death rate = of the seeds that reach a band's first floor, the share that wipe inside the band (competent policy).
 * Arrival level = the mean party level on arriving at the floor, over the seeds that got there; drift = |mean - plan|.
 * The Binder: every seed that reaches B100 fights it with what it carries; careful play wins within 20 rounds.
 */
export const CAVE_TARGETS = {
  deaths: [
    { id: 'B1-B9', from: 1, to: 9, max: 0.05 },
    { id: 'B10-B29', from: 10, to: 29, max: 0.15 },
    { id: 'B30-B59', from: 30, to: 59, max: 0.30 },
    { id: 'B60-B99', from: 60, to: 99, max: 0.45 },
  ],
  arrival: [[10, 12], [30, 25], [60, 40], [90, 55]],
  arrivalDrift: 4,
  binder: { winMin: 0.8, roundsMax: 20 },
};

export const TIME = { tileS: 8 / 60, walkOverhead: 1.25, BATTLE_FIXED_S: 14, ROUND_S: 7, CHEST_S: 3, STAIRS_S: 4 };
export const FIELD = { healBelow: 0.6, mpReserve: 0.25, potionBelow: 0.45, potionBelowRich: 0.7, richPotions: 6, etherBelow: 0.3, ambush: 0 };

// ------------------------------------------------------------------ helpers
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
const pct = (v) => `${Math.round(v * 100)}%`;
const pct1 = (v) => `${(Math.round(v * 1000) / 10).toFixed(1)}%`;
const r2 = (v) => Math.round(v * 100) / 100;
const clone = (v) => JSON.parse(JSON.stringify(v));

/** Every Episode 1 foe (main path and the Hollow): the party that may enter has met them all. */
function ep1Bestiary() {
  const out = {};
  for (const z of [...ZONE_ORDER, ...OPTIONAL_ZONES]) {
    const zone = ZONES[z];
    if (!zone || !zone.plan) continue;
    for (const [enc] of zone.plan) for (const id of (ENCOUNTERS[enc] || { enemies: [] }).enemies) {
      const e = ENEMIES[id];
      if (!e || e.boss) continue;
      out[id] = { seen: 1, killed: 1, known: [...e.weak, ...e.resist, ...e.immune, ...e.absorb], weak: e.weak.slice(), resist: e.resist.slice(), appraised: true };
    }
  }
  return out;
}
const EP1_BESTIARY = ep1Bestiary();

/** A game at the trapdoor: Episode 1 complete (newGameEp2's party and flags), the Stacks open, a reading entered. */
export function freshRun(seed, { vault = [] } = {}) {
  const g = newGameEp2('Sim', { seed });
  g.flags.deep_stacks_open = true;
  g.bestiary = clone(EP1_BESTIARY);
  CAVE.ensureCave(g).vault = vault.slice();
  if (!CAVE.enter(g, { seed: seed >>> 0, playtime: 0 })) throw new Error('cave.enter refused');
  return g;
}

const numericStats = (s) => Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v === 'number'));
/** The active weapon: the carried type whose stats score best for the member's role. */
function pickWeapon(m) {
  const keys = weaponTypes(m).filter((w) => m.equip && m.equip[w]);
  if (!keys.length) return;
  let best = keys[0], bestS = -Infinity;
  for (const k of keys) { const s = weightedGain(m, numericStats(memberStats(m, k))); if (s > bestS) { bestS = s; best = k; } }
  m.weapon = best;
}

/** The member's fighting strength with its best carried weapon active (bare hands when it carries none). */
function weaponScore(m) {
  const keys = weaponTypes(m).filter((w) => m.equip && m.equip[w]);
  if (!keys.length) return weightedGain(m, numericStats(memberStats(m, m.weapon)));
  return Math.max(...keys.map((k) => weightedGain(m, numericStats(memberStats(m, k)))));
}
/**
 * What a sensible player gains by putting `item` in `key`: armour is the equip prompt's own role-weighted delta; a weapon is
 * what it adds to the member's BEST weapon (an empty hand gains everything, a second weapon type only what beats the first),
 * plus a tenth of its own worth as the swap option.
 */
function realGain(g, m, key, item) {
  if (!isWeaponKey(m, key)) return weightedGain(m, numericStats(equipDeltaFor(m, key, item)));
  const before = weaponScore(m);
  const cur = m.equip[key];
  const m2 = { ...m, equip: { ...m.equip, [key]: item } };
  const after = weaponScore(m2);
  const own = weightedGain(m2, numericStats(memberStats(m2, key))) - (cur ? weightedGain(m, numericStats(memberStats(m, key))) : 0);
  return (after - before) + 0.1 * Math.max(0, own);
}
/**
 * The equip prompt, answered the way a player would (it offers every member who gains; the player picks the one who gains
 * most from it: realGain). Accepted until nothing gains. Gear already judged useless for everyone is not looked at again (`seen`).
 */
/**
 * mode 'real' (default): the equip prompt answered for the member who really gains. 'prompt': its first answer (equipOffers'
 * offers[0], what the bot's generic handler presses), plus Optimize for everyone every third floor (the bot's menu habit).
 */
export const EQUIP = { mode: 'real' };
function equipBest(g, seen) {
  let changes = 0;
  for (let guard = 0; guard < 60; guard++) {
    let best = null;
    for (const it of g.gear) {
      if (seen.has(it.uid)) continue;
      const o = equipOffers(g, it.uid);
      if (!o) { seen.add(it.uid); continue; }
      let mine = null;
      if (EQUIP.mode === 'prompt') mine = { uid: it.uid, member: o.offers[0].member, key: o.offers[0].key, gain: o.offers[0].gain };   // the prompt's first answer
      else for (const off of o.offers) {
        const gain = realGain(g, off.member, off.key, it);
        if (gain > 1e-6 && (!mine || gain > mine.gain)) mine = { uid: it.uid, member: off.member, key: off.key, gain };
      }
      if (!mine) { seen.add(it.uid); continue; }   // nobody really gains (members only ever get better): never again
      if (!best || mine.gain > best.gain) best = mine;
    }
    if (!best) break;
    const { member: m, key } = best;
    if (!equipGear(g, m, key, best.uid).ok) { seen.add(best.uid); continue; }
    if (isWeaponKey(m, key) && !m.equip[m.weapon]) m.weapon = key;
    changes++;
  }
  for (const m of g.party) pickWeapon(m);
  return changes;
}

const maxHp = (m) => memberStats(m).maxHp;
const hpFrac = (m) => (m.hp > 0 ? m.hp / maxHp(m) : 0);
/** Between fights (no rests in the Stacks): feathers, Mira's heals above her reserve, potions, an Ether. */
export function fieldCare(g, field = FIELD) {
  const used = { phoenix_feather: 0, potion: 0, hi_potion: 0, ether: 0, hi_ether: 0, mp: 0 };
  for (const m of g.party) if (m.hp <= 0 && count(g, 'phoenix_feather') > 0 && useItemOnMember(g, 'phoenix_feather', m).ok) used.phoenix_feather++;
  const alive = () => g.party.filter((m) => m.hp > 0);
  const mira = g.party.find((m) => m.id === 'mira');
  for (let guard = 0; guard < 30 && mira && mira.hp > 0; guard++) {
    const hurt = alive().filter((m) => hpFrac(m) < field.healBelow).sort((a, b) => hpFrac(a) - hpFrac(b));
    if (!hurt.length) break;
    const reserve = memberStats(mira).maxMp * field.mpReserve;
    const sk = Object.fromEntries(fieldSkills(mira).map((s) => [s.id, s]));
    let r = null;
    if (hurt.length >= 2 && sk.mending_rain && mira.mp - sk.mending_rain.mp >= reserve) r = useSkillOnMember(g, mira, 'mending_rain', alive());
    else if (sk.mend && mira.mp - sk.mend.mp >= reserve) r = useSkillOnMember(g, mira, 'mend', hurt[0]);
    if (!r || !r.ok) break;
    used.mp += r.cost || 0;
  }
  for (let guard = 0; guard < 12; guard++) {
    const rich = count(g, 'potion') + count(g, 'hi_potion') > field.richPotions;   // a full bag tops up sooner
    const low = alive().filter((m) => hpFrac(m) < (rich ? field.potionBelowRich : field.potionBelow)).sort((a, b) => hpFrac(a) - hpFrac(b))[0];
    if (!low) break;
    const missing = maxHp(low) - low.hp;
    const id = missing > 150 && count(g, 'hi_potion') > 0 ? 'hi_potion' : count(g, 'potion') > 0 ? 'potion' : count(g, 'hi_potion') > 0 ? 'hi_potion' : null;
    if (!id || !useItemOnMember(g, id, low).ok) break;
    used[id]++;
  }
  if (mira && mira.hp > 0) {
    const mx = memberStats(mira).maxMp;
    if (mira.mp < mx * field.etherBelow) {
      const id = mx - mira.mp > 30 && count(g, 'hi_ether') > 0 ? 'hi_ether' : count(g, 'ether') > 0 ? 'ether' : count(g, 'hi_ether') > 0 ? 'hi_ether' : null;
      if (id && useItemOnMember(g, id, mira).ok) used[id]++;
    }
  }
  return used;
}

/** One fight through the scene's own path. Returns { outcome, rounds, hpLost (share of the party's max HP), kos, exp }. */
export function fight(g, encId, seed, policy = 'competent', { trace = false, start = 'normal' } = {}) {
  const rng = makeRng(seed);
  const { battle: b, encounter } = createEncounterBattle(encId, { party: g.party, rng, inventory: g.items, bestiary: bestiaryForBattle(g), start, flags: g.flags });
  W.HOOKS.armBattle(b, g);
  const max0 = g.party.reduce((s, m) => s + maxHp(m), 0);
  const hp0 = g.party.reduce((s, m) => s + Math.max(0, m.hp), 0);
  const log = trace ? [] : null;
  let steps = 0, kos = 0;
  const countEvs = (evs) => { for (const ev of evs) { if (ev.type === 'ko' && b.unit(ev.target) && b.unit(ev.target).side === 'party') kos++; if (trace) log.push(ev); } };
  countEvs(b.startEvents);
  while (!b.isOver() && steps++ < 2000) {
    const u = b.current();
    let evs;
    if (u.side === 'party') {
      evs = b.perform(partyAction(b, policy));
      if (evs.length === 1 && evs[0].type === 'invalid') evs = b.perform({ type: 'defend' });
    } else evs = b.runEnemyTurn();
    countEvs(evs);
  }
  const res = b.result() || { outcome: 'timeout', rounds: 99, party: g.party.map((m) => ({ id: m.id, hp: 0, mp: m.mp, fury: 0, weapon: m.weapon })), itemsUsed: {} };
  const killedKeys = res.outcome === 'victory' ? b.state.killed.map((k) => { const u = b.unit(k.uid); return u ? u.weakKey : k.id; }) : [];
  const seenKeys = b.units().filter((x) => x.side === 'enemy').map((x) => x.weakKey);
  const summary = applyBattleOutcome(g, res, { ...encounter, id: encId }, { seenKeys, killedKeys });
  if (res.outcome === 'victory') CAVE.noteKills(g, (ENCOUNTERS[encId] || { enemies: [1] }).enemies.length);
  const hp1 = g.party.reduce((s, m) => s + Math.max(0, m.hp), 0);
  return { outcome: res.outcome, rounds: res.rounds, hpLost: Math.max(0, hp0 - hp1) / Math.max(1, max0), kos, exp: summary.exp, items: summary.items.length, log };
}

/** A red or blue chest, as world.js openCaveChest rolls it (the chest's rng, the worn props, the landing guarantee). */
function openChest(g, floor, ev, landing) {
  const seed = g.cave.run.seed;
  const rng = W.chestRng(seed, floor, ev.id);
  CAVE.noteChest(g);
  const props = wornProps(g.party);
  const holds = CAVE.hasBookmark(g);
  const out = { tier: ev.tier, unique: null, items: 0, bookmark: false };
  let roll;
  if (ev.tier === 'blue') {
    const id = rollBlueChest(rng, floor, CAVE.vaultIds(g), { exclude: CAVE.bluesOf(g) });
    const uid = id ? CAVE.foundBlue(g, id) : null;
    if (uid != null) { out.unique = id; return out; }
    roll = rollRedChest(rng, floor, CAVE.vaultIds(g), { props: props.includes('red_rarity_up') ? props : [...props, 'red_rarity_up'], landing: false, holdsBookmark: holds });
  } else roll = rollRedChest(rng, floor, CAVE.vaultIds(g), { props, landing, holdsBookmark: holds });
  if (roll.gold > 0) g.gold += roll.gold;
  for (const c of roll.consumables || []) give(g, c.item, c.qty || 1);
  for (const inst of roll.items || []) { addGear(g, inst); out.items++; }
  if (roll.bookmark) { give(g, KEEPERS_BOOKMARK_ID, 1); out.bookmark = true; }
  return out;
}

/** The greedy walk arrival -> nearest unopened chest ... -> the stairs on the floor's walk model. Tiles. */
function tourTiles(mod) {
  const marks = mod.marks || {};
  const chests = (mod.events || []).filter((e) => e.type === 'chest').map((e) => marks[e.id]).filter(Array.isArray);
  let at = marks.arrival || [mod.start.x, mod.start.y];
  let tiles = 0;
  const left = chests.slice();
  while (left.length) {
    const wm = walkModel(mod, at);
    let bi = -1, bd = Infinity;
    left.forEach(([x, y], i) => { const d = wm.dist[y] && wm.dist[y][x]; if (d >= 0 && d < bd) { bd = d; bi = i; } });
    if (bi < 0) break;
    tiles += bd; at = left.splice(bi, 1)[0];
  }
  const st = marks.stairs;
  if (st) { const wm = walkModel(mod, at); const d = wm.dist[st[1] - 1] ? wm.dist[st[1] - 1][st[0]] : -1; const d2 = wm.dist[st[1]] ? wm.dist[st[1]][st[0]] : -1; tiles += Math.max(0, d >= 0 ? d : d2); }
  return tiles;
}

/**
 * The bot's hurried profile (qa/autoplay.py --cave-chests cheap): a red chest only when the detour arrival -> chest -> stairs
 * over arrival -> stairs is at most CHEAP_DETOUR tiles (the bot measures from where it stands; this from the arrival).
 */
export const CHEAP_DETOUR = 24;
function chestDetour(mod, ev) {
  const marks = mod.marks || {};
  const a = marks.arrival || [mod.start.x, mod.start.y], st = marks.stairs, front = marks[ev.id];
  if (!st || !Array.isArray(front)) return 0;
  const d = (from, [x, y]) => { const wm = walkModel(mod, from); const v = wm.dist[y] ? wm.dist[y][x] : -1; return v >= 0 ? v : Infinity; };
  const stairsCell = [st[0], st[1]];
  return d(a, front) + d(front, stairsCell) - d(a, stairsCell);
}

const partyLevel = (g) => mean(g.party.map((m) => m.level));
function partySnapshot(g) {
  const ms = g.party.map((m) => ({ id: m.id, level: m.level, hp: Math.max(0, m.hp), maxHp: maxHp(m), mp: m.mp, maxMp: memberStats(m).maxMp }));
  return { level: mean(ms.map((m) => m.level)), hp: ms.reduce((s, m) => s + m.hp, 0) / ms.reduce((s, m) => s + m.maxHp, 0),
    mp: ms.find((m) => m.id === 'mira') ? ms.find((m) => m.id === 'mira').mp / Math.max(1, ms.find((m) => m.id === 'mira').maxMp) : 0,
    down: ms.filter((m) => m.hp <= 0).length,
    potions: count(g, 'potion') + count(g, 'hi_potion'), feathers: count(g, 'phoenix_feather'), ethers: count(g, 'ether') + count(g, 'hi_ether') };
}

/**
 * One reading from B1: returns { seed, policy, floors: [per-floor rows], died: floor | 0, reached, bookmarkFirst, bookmarks,
 * blues: [{ floor, id }], binder: { win, rounds } | null, game? }. opts.floors (99) stops after that floor; opts.binder (true)
 * plays B100 when B99 is cleared; opts.keepGame returns the game at the end (the Binder check clones it).
 */
export function runDescent({ seed = 1, policy = 'competent', floors = 99, binder = true, binderFights = 1, binderPolicies = null, vault = [], keepGame = false, field = FIELD, onFight = null, onFloor = null, beforeFight = null, refill = false, chests: chestPolicy = 'all' } = {}) {
  const g = freshRun(seed, { vault });
  const seen = new Set();
  equipBest(g, seen);
  const rows = [];
  const out = { seed, policy, floors: rows, died: 0, cause: null, reached: 1, bookmarkFirst: 0, bookmarks: 0, blues: [], binder: null };
  const last = Math.min(99, floors);
  for (let floor = 1; floor <= last; floor++) {
    if (floor > 1) CAVE.descend(g);
    setLootFloor(floor);
    out.reached = floor;
    let mod;
    try { mod = W.buildFloor(g.cave.run.seed, floor, CAVE.vaultIds(g)); }
    catch (e) {
      // the generator refused this (seed, floor): a game bug to report (C1-gen), not a death; the run is censored here
      out.genError = { floor, message: String(e && e.message || e) };
      out.reached = floor - 1;
      break;
    }
    const landing = isLanding(floor) || !!mod.landing;
    if (refill) for (const m of g.party) { const st = memberStats(m); m.hp = st.maxHp; m.mp = st.maxMp; }   // demand studies only (never the check)
    const arrive = partySnapshot(g);
    const mp0 = g.party.reduce((s, m) => s + m.mp, 0), mira0 = (g.party.find((m) => m.id === 'mira') || { mp: 0 }).mp;
    const row = { floor, level: arrive.level, hpIn: arrive.hp, mpIn: arrive.mp, downIn: arrive.down, potions: arrive.potions, feathers: arrive.feathers,
      ethers: arrive.ethers, fights: 0, rounds: [], hpLost: [], kos: 0, chests: 0, blue: null, bookmark: false, gear: 0, tiles: tourTiles(mod), seconds: 0 };
    const foes = (mod.events || []).filter((e) => e.type === 'enemy' && e.encounter);
    if (onFloor) onFloor({ floor, g, mod, row });
    const chests = (mod.events || []).filter((e) => e.type === 'chest' && (e.tier === 'red' || e.tier === 'blue'))
      .filter((e) => chestPolicy !== 'cheap' || landing || e.tier === 'blue' || chestDetour(mod, e) <= CHEAP_DETOUR);
    // interleave: chest i is opened after fight round(i x foes / chests) (they sit in dead ends between the fights)
    const chestAfter = chests.map((_, i) => Math.round(((i + 1) * foes.length) / (chests.length + 1)));
    let ci = 0;
    const openDue = (k) => {
      while (ci < chests.length && chestAfter[ci] <= k) {
        const c = openChest(g, floor, chests[ci], landing);
        row.chests++;
        if (c.unique) { row.blue = c.unique; out.blues.push({ floor, id: c.unique }); }
        if (c.bookmark) { row.bookmark = true; out.bookmarks++; if (!out.bookmarkFirst) out.bookmarkFirst = floor; }
        row.gear += c.items;
        ci++;
      }
      equipBest(g, seen);
    };
    openDue(0);
    for (let k = 0; k < foes.length; k++) {
      if (beforeFight) beforeFight({ floor, k, encounter: foes[k].encounter, g, seed: hashSeed(`cavesim:${seed}:${floor}:${k}:${policy}`) });
      // a chaser that touches the party from behind starts an ambush (field.js touchEnemy); FIELD.ambush is its share (0: never)
      const start = field.ambush > 0 && (hashSeed(`cavesim:${seed}:${floor}:${k}:start`) % 1000) / 1000 < field.ambush ? 'ambush' : 'normal';
      const r = fight(g, foes[k].encounter, hashSeed(`cavesim:${seed}:${floor}:${k}:${policy}`), policy, { start });
      row.fights++; row.rounds.push(r.rounds); row.hpLost.push(r.hpLost); row.kos += r.kos; row.gear += r.items;
      row.seconds += TIME.BATTLE_FIXED_S + r.rounds * TIME.ROUND_S;
      if (onFight) onFight({ floor, k, encounter: foes[k].encounter, r, g });
      if (r.outcome !== 'victory' && r.outcome !== 'escape') {
        out.died = floor; out.cause = r.outcome === 'defeat' ? foes[k].encounter : `${r.outcome} ${foes[k].encounter}`;
        break;
      }
      equipBest(g, seen);
      fieldCare(g, field);
      openDue(k + 1);
    }
    if (!out.died) openDue(Infinity);
    if (EQUIP.mode === 'prompt' && floor % 3 === 0) { for (const m of g.party) optimize(g, m); for (const m of g.party) if (!m.equip[m.weapon]) pickWeapon(m); }
    fieldCare(g, field);
    row.mpUsed = mp0 - g.party.reduce((s, m) => s + m.mp, 0);
    row.miraMpUsed = mira0 - (g.party.find((m) => m.id === 'mira') || { mp: 0 }).mp;
    row.seconds += row.tiles * TIME.tileS * TIME.walkOverhead + row.chests * TIME.CHEST_S + TIME.STAIRS_S;
    rows.push(row);
    if (out.died) { CAVE.die(g, { playtime: 0 }); break; }
  }
  if (!out.died && !out.genError && last === 99 && binder) {
    CAVE.descend(g);
    out.reached = BOSS_FLOOR;
    fieldCare(g, field);
    out.b100 = partySnapshot(g);
    if (keepGame) out.game = clone(g);
    // the Binder from the same B100 state, binderFights times on different battle seeds (the first is the run's own)
    out.binderFights = [];
    for (let k = 0; k < Math.max(1, binderFights); k++) {
      const r = fight(clone(g), BINDER_ENCOUNTER_ID, hashSeed(`cavesim:${seed}:binder:${k}:${policy}`), policy);
      out.binderFights.push({ win: r.outcome === 'victory', rounds: r.rounds, hpLost: r.hpLost, kos: r.kos });
    }
    out.binder = out.binderFights[0];
    // the same B100 state played attack-only and ignoring the telegraphs (printed beside the careful numbers, never checked)
    out.binderOther = {};
    for (const p of binderPolicies || []) {
      if (p === policy) continue;
      out.binderOther[p] = [];
      for (let k = 0; k < Math.max(1, binderFights); k++) {
        const r = fight(clone(g), BINDER_ENCOUNTER_ID, hashSeed(`cavesim:${seed}:binder:${k}:${p}`), p);
        out.binderOther[p].push({ win: r.outcome === 'victory', rounds: r.rounds, hpLost: r.hpLost, kos: r.kos });
      }
    }
  } else if (keepGame) out.game = clone(g);
  out.level = partyLevel(g);
  return out;
}

// ------------------------------------------------------------------ the suite
/** Bands for the tables: the four check bands and the ten decades. */
const DECADES = Array.from({ length: 10 }, (_, i) => ({ id: `B${i * 10 || 1}-B${i * 10 + 9}`, from: i * 10 || 1, to: i * 10 + 9 }));

function bandStats(runs, from, to) {
  // a run the generator stopped (genError) inside or before the band is left out of it: it neither died nor got through
  const entered = runs.filter((r) => r.reached >= from && !(r.genError && r.genError.floor <= to));
  const died = entered.filter((r) => r.died >= from && r.died <= to);
  const rows = entered.flatMap((r) => r.floors.filter((f) => f.floor >= from && f.floor <= to));
  const fightRows = rows.filter((f) => f.fights);
  const rounds = fightRows.flatMap((f) => f.rounds), hp = fightRows.flatMap((f) => f.hpLost);
  return {
    from, to, entered: entered.length, died: died.length, deathRate: entered.length ? died.length / entered.length : 0,
    fights: rounds.length, rounds: mean(rounds), hpLost: mean(hp), kos: rounds.length ? fightRows.reduce((s, f) => s + f.kos, 0) / rounds.length : 0,
    minutes: mean(rows.map((f) => f.seconds)) / 60, chests: mean(rows.map((f) => f.chests)), gear: mean(rows.map((f) => f.gear)),
    hpIn: mean(rows.map((f) => f.hpIn)), potions: mean(rows.map((f) => f.potions)), feathers: mean(rows.map((f) => f.feathers)),
  };
}

function arrivalAt(runs, floor) {
  const rows = runs.map((r) => r.floors.find((f) => f.floor === floor)).filter(Boolean);
  const lv = rows.map((f) => f.level);
  return { floor, n: rows.length, mean: mean(lv), min: lv.length ? Math.min(...lv) : 0, max: lv.length ? Math.max(...lv) : 0 };
}

/**
 * Tuning what-ifs without editing the sources: { tuning, ease, early, band, cons, extra, landing, field, binder, equip } overrides foes.js TUNING,
 * OPENING_EASE, EARLY_EASE and BAND_ADJUST, loot.js CONSUMABLES_BY_BAND, CONSUMABLE_EXTRA and LANDING_SUPPLY, this file's FIELD, and the Binder's stats
 * (ENEMIES.binder, after registration). `--patch '<json>'` on the CLI; every worker applies it before its first floor.
 */
export function applyPatch(patch) {
  if (!patch) return;
  if (patch.tuning) Object.assign(TUNING, patch.tuning);
  if (patch.ease) { for (const k of Object.keys(OPENING_EASE)) delete OPENING_EASE[k]; Object.assign(OPENING_EASE, patch.ease); }
  if (patch.early) Object.assign(EARLY_EASE, patch.early);
  if (patch.band) for (const [k, v] of Object.entries(patch.band)) Object.assign(BAND_ADJUST[k], v);
  if (patch.cons) Object.assign(CONSUMABLES_BY_BAND, patch.cons);
  if (patch.extra) { CONSUMABLE_EXTRA.length = 0; CONSUMABLE_EXTRA.push(...patch.extra); }
  if (patch.landing) Object.assign(LANDING_SUPPLY, patch.landing);
  if (patch.field) Object.assign(FIELD, patch.field);
  if (patch.binder) Object.assign(ENEMIES.binder, patch.binder);
  if (patch.equip) EQUIP.mode = patch.equip;
}

function runSeeds({ seeds, policy, floors, binderFights, binderPolicies = null, field = FIELD, keepB100 = false, chests = 'all' }) {
  return seeds.map((seed) => {
    const r = runDescent({ seed, policy, floors, binderFights, binderPolicies, field, keepGame: keepB100, chests });
    if (!keepB100 || !r.binder) delete r.game;   // keepB100: the B100 state rides along (Binder studies)
    return r;
  });
}

/** Seeds across worker threads (each seed is independent and deterministic, so the result does not depend on `jobs`). */
async function runParallel({ seedList, policy, floors, binderFights, binderPolicies, jobs, patch, keepB100, chests }) {
  const { Worker } = await import('node:worker_threads');
  const chunks = Array.from({ length: jobs }, () => []);
  seedList.forEach((s, i) => chunks[i % jobs].push(s));
  const parts = await Promise.all(chunks.filter((c) => c.length).map((seeds) => new Promise((resolve, reject) => {
    const w = new Worker(new URL(import.meta.url), { workerData: { caveSim: true, seeds, policy, floors, binderFights, binderPolicies, patch, keepB100, chests } });
    w.once('message', resolve);
    w.once('error', reject);
    w.once('exit', (code) => { if (code) reject(new Error(`cave sim worker exited ${code}`)); });
  })));
  const bySeed = new Map(parts.flat().map((r) => [r.seed, r]));
  return seedList.map((s) => bySeed.get(s));
}

/**
 * n seeds from seed0. Returns { policy, runs, bands, decades, arrival, binder, bookmarks, blues, ms }. Every seed that reaches
 * B100 fights the Binder binderPerSeed times from its own B100 state. jobs > 1 spreads the seeds over worker threads and
 * returns a promise; jobs 1 (the tests) runs here and returns the summary itself. A patch applies to this thread too.
 */
export function runCave(opts = {}) {
  const { seeds = 50, seed0 = 1, policy = 'competent', floors = 99, binderPerSeed = 3, binderPolicies = ['naive', 'reckless'], field = FIELD, jobs = 1, patch = null, keepB100 = false, chests = 'all' } = opts;
  const t0 = Date.now();
  const seedList = Array.from({ length: seeds }, (_, i) => seed0 + i);
  const meta = { seeds, seed0, policy, floors, t0, chests };
  if (jobs > 1) return runParallel({ seedList, policy, floors, binderFights: binderPerSeed, binderPolicies, jobs, patch, keepB100, chests }).then((runs) => summarize(runs, meta));
  applyPatch(patch);
  return summarize(runSeeds({ seeds: seedList, policy, floors, binderFights: binderPerSeed, binderPolicies, field, keepB100, chests }), meta);
}

function summarize(runs, { seeds, seed0, policy, floors, t0, chests = 'all' }) {
  const bands = CAVE_TARGETS.deaths.map((b) => ({ id: b.id, max: b.max, ...bandStats(runs, b.from, Math.min(b.to, floors)) })).filter((b) => b.from <= floors);
  const decades = DECADES.filter((d) => d.from <= floors).map((d) => ({ id: d.id, ...bandStats(runs, d.from, Math.min(d.to, floors)) }));
  const levelFloors = [1, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 99].filter((f) => f <= floors);
  const arrival = levelFloors.map((f) => ({ ...arrivalAt(runs, f), plan: (CAVE_TARGETS.arrival.find(([pf]) => pf === f) || [])[1] ?? null }));
  let binder = null;
  const at100 = runs.filter((r) => r.binder);
  if (at100.length) {
    const fights = at100.flatMap((r) => r.binderFights || [r.binder]);
    const within = fights.filter((f) => f.win && f.rounds <= CAVE_TARGETS.binder.roundsMax);
    binder = { seeds: at100.length, fights: fights.length, win: fights.filter((f) => f.win).length / fights.length, within: within.length / fights.length,
      rounds: mean(fights.filter((f) => f.win).map((f) => f.rounds)), hpLost: mean(fights.map((f) => f.hpLost)), kos: mean(fights.map((f) => f.kos)),
      level: mean(at100.map((r) => r.b100.level)), hpIn: mean(at100.map((r) => r.b100.hp)), other: {} };
    for (const p of [...new Set(at100.flatMap((r) => Object.keys(r.binderOther || {})))]) {
      const fs = at100.flatMap((r) => (r.binderOther || {})[p] || []);
      binder.other[p] = { fights: fs.length, win: fs.filter((f) => f.win).length / Math.max(1, fs.length), rounds: mean(fs.filter((f) => f.win).map((f) => f.rounds)), hpLost: mean(fs.map((f) => f.hpLost)) };
    }
  }
  const bm = runs.map((r) => r.bookmarkFirst).filter(Boolean).sort((a, b) => a - b);
  return {
    policy, chests, seeds, seed0, floors, runs, bands, decades, arrival, binder,
    bookmarks: { firstMedian: bm.length ? bm[Math.floor(bm.length / 2)] : 0, firstMean: mean(bm), perRun: mean(runs.map((r) => r.bookmarks)), noneBy10: runs.filter((r) => !r.bookmarkFirst || r.bookmarkFirst > 10).length },
    blues: { perRun: mean(runs.map((r) => r.blues.length)) },
    reachedMean: mean(runs.map((r) => r.reached)), clears: runs.filter((r) => r.binder && r.binder.win).length,
    ms: Date.now() - t0,
  };
}

/** Misses against CAVE_TARGETS (competent policy only). */
export function checkCave(s) {
  const fails = [];
  if (s.policy !== 'competent' || (s.chests && s.chests !== 'all')) return fails;   // other policies and profiles are printed, never checked
  for (const b of s.bands) {
    if (!b.entered) { fails.push(`${b.id}: no seed reached it`); continue; }
    if (b.deathRate > b.max) fails.push(`${b.id}: death rate ${pct1(b.deathRate)} (${b.died} of ${b.entered}) over ${pct(b.max)}`);
  }
  for (const [floor, plan] of CAVE_TARGETS.arrival) {
    if (floor > s.floors) continue;
    const a = s.arrival.find((x) => x.floor === floor);
    if (!a || !a.n) { fails.push(`B${floor}: no seed arrived`); continue; }
    if (Math.abs(a.mean - plan) > CAVE_TARGETS.arrivalDrift) fails.push(`B${floor}: arrival Lv ${a.mean.toFixed(1)}, plan ${plan} (drift > ${CAVE_TARGETS.arrivalDrift})`);
  }
  if (s.floors >= 99) {
    if (!s.binder) fails.push('the Binder: no seed reached B100');
    else if (s.binder.within < CAVE_TARGETS.binder.winMin) fails.push(`the Binder: careful play wins ${pct(s.binder.within)} within ${CAVE_TARGETS.binder.roundsMax} rounds (want >= ${pct(CAVE_TARGETS.binder.winMin)})`);
  }
  return fails;
}

/** The margin left on every check (for the doc): death-rate headroom, level drift, the Binder's margin. */
export function margins(s) {
  return {
    deaths: s.bands.map((b) => ({ id: b.id, rate: b.deathRate, max: b.max, headroom: b.max - b.deathRate })),
    arrival: CAVE_TARGETS.arrival.filter(([f]) => f <= s.floors).map(([f, plan]) => { const a = s.arrival.find((x) => x.floor === f); return { floor: f, plan, mean: a ? a.mean : 0, drift: a ? a.mean - plan : 0 }; }),
    binder: s.binder ? s.binder.within - CAVE_TARGETS.binder.winMin : null,
  };
}

export function formatCave(s) {
  const L = [];
  L.push(`Deep Stacks descent: ${s.seeds} seeds from ${s.seed0}, policy ${s.policy}${s.chests && s.chests !== 'all' ? `, chests ${s.chests}` : ''}, B1 to B${s.floors}; reached B${s.reachedMean.toFixed(1)} on average; ${s.clears} cleared B100`);
  L.push('');
  L.push('| band | entered | wiped | death rate | target | fights | rounds | HP lost / fight | KOs / fight | min / floor | chests | HP on arrival | potions held |');
  L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const b of s.bands) L.push(`| ${b.id} | ${b.entered} | ${b.died} | ${pct1(b.deathRate)} | < ${pct(b.max)} | ${b.fights} | ${b.rounds.toFixed(2)} | ${pct(b.hpLost)} | ${b.kos.toFixed(2)} | ${b.minutes.toFixed(1)} | ${b.chests.toFixed(1)} | ${pct(b.hpIn)} | ${b.potions.toFixed(1)} |`);
  L.push('');
  L.push('| decade | entered | wiped | death rate | rounds | HP lost / fight | KOs / fight | min / floor | gear found / floor | feathers held |');
  L.push('|---|---|---|---|---|---|---|---|---|---|');
  for (const b of s.decades) L.push(`| ${b.id} | ${b.entered} | ${b.died} | ${pct1(b.deathRate)} | ${b.rounds.toFixed(2)} | ${pct(b.hpLost)} | ${b.kos.toFixed(2)} | ${b.minutes.toFixed(1)} | ${b.gear.toFixed(1)} | ${b.feathers.toFixed(1)} |`);
  L.push('');
  L.push('| arrival | seeds | mean Lv | min | max | plan |');
  L.push('|---|---|---|---|---|---|');
  for (const a of s.arrival) L.push(`| B${a.floor} | ${a.n} | ${a.mean.toFixed(1)} | ${a.min.toFixed(1)} | ${a.max.toFixed(1)} | ${a.plan ?? '-'} |`);
  L.push('');
  L.push(`Bookmarks: first held on B${s.bookmarks.firstMedian} (median; mean B${s.bookmarks.firstMean.toFixed(1)}), ${s.bookmarks.perRun.toFixed(1)} found per run, ${s.bookmarks.noneBy10} runs without one by B10. Blue chests: ${s.blues.perRun.toFixed(1)} uniques per run.`);
  if (s.binder) {
    const b = s.binder;
    L.push(`The Binder: ${b.fights} fights from ${b.seeds} seeds at B100 (party Lv ${b.level.toFixed(1)}, ${pct(b.hpIn)} HP on arrival): win ${pct(b.win)}, within ${CAVE_TARGETS.binder.roundsMax} rounds ${pct(b.within)}, ${b.rounds.toFixed(1)} rounds per win, ${pct(b.hpLost)} HP lost, ${b.kos.toFixed(2)} KOs.`
      + Object.entries(b.other || {}).map(([p, o]) => ` ${p === 'naive' ? 'Attack-only' : p === 'reckless' ? 'Ignoring the telegraphs' : p}: win ${pct(o.win)} (${o.rounds.toFixed(1)} rounds, ${pct(o.hpLost)} HP lost).`).join(''));
  } else if (s.floors >= 99) L.push('The Binder: no seed reached B100.');
  const deaths = {};
  for (const r of s.runs) if (r.died) deaths[r.died] = (deaths[r.died] || 0) + 1;
  L.push(`Wipes by floor: ${Object.entries(deaths).map(([f, n]) => `B${f}${n > 1 ? ` x${n}` : ''}`).join(', ') || 'none'}`);
  const gen = s.runs.filter((r) => r.genError);
  if (gen.length) L.push(`Generator refusals (CaveGenError, censored, not deaths): ${gen.map((r) => `seed ${r.seed} B${r.genError.floor} (${r.genError.message})`).join('; ')}`);
  L.push(`(${s.runs.reduce((n, r) => n + r.floors.reduce((m, f) => m + f.fights, 0), 0)} fights in ${(s.ms / 1000).toFixed(1)} s)`);
  return L.join('\n');
}

// ------------------------------------------------------------------ CLI
/** The `--cave` dispatch of simulate.mjs lands here (and `node tools/sim/cave.mjs` directly). Resolves the exit code. */
export async function caveMain(args = []) {
  const get = (k, d) => { const i = args.indexOf(k); return i >= 0 && args[i + 1] !== undefined && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
  const seeds = Number(get('--seeds', 50)), seed0 = Number(get('--seed0', 1)), floors = Number(get('--floors', 99));
  const policy = get('--policy', 'competent'), binderPerSeed = Number(get('--binder-per-seed', 3));
  const jobs = Number(get('--jobs', Math.max(1, Math.min(6, os.cpus().length - 1))));
  const patch = get('--patch', null) ? JSON.parse(get('--patch', '{}')) : null;
  const quiet = args.includes('--quiet');
  const policies = args.includes('--all-policies') ? [...new Set([policy, 'naive', 'reckless'])] : [policy];
  const results = [];
  for (const p of policies) {
    if (!quiet) process.stderr.write(`  ${p}: ${seeds} seeds on ${jobs} worker${jobs > 1 ? 's' : ''}\n`);
    const s = await runCave({ seeds, seed0, policy: p, floors, binderPerSeed, jobs, patch, chests: get('--chests', 'all') });
    results.push(s);
    console.log(formatCave(s));
    console.log('');
  }
  const main = results[0];
  const fails = checkCave(main);
  console.log(fails.length ? `CAVE TARGETS MISSED:\n  ${fails.join('\n  ')}` : 'All cave targets met.');
  if (args.includes('--json')) {
    const fs = await import('node:fs');
    fs.mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
    fs.writeFileSync(new URL('./out/cave_sim.json', import.meta.url), JSON.stringify(results.map((s) => ({ ...s, runs: s.runs.map((r) => ({ ...r, floors: r.floors.map((f) => ({ ...f, rounds: r2(mean(f.rounds)), hpLost: r2(mean(f.hpLost)) })) })) })), null, 1));
  }
  if (args.includes('--md')) {
    const fs = await import('node:fs');
    const dir = new URL('../../qa/cave/out/', import.meta.url);
    fs.mkdirSync(dir, { recursive: true });
    const cmd = ['--cave', ...args.filter((a) => a !== '--md' && a !== '--cave')].join(' ');
    const body = [`# Deep Stacks descent (tools/sim/cave.mjs)`, '', `Written by \`node tools/sim/simulate.mjs ${cmd} --md\` (C3-sim-bot).`, '',
      ...results.map((s) => formatCave(s)), '', fails.length ? `Missed: ${fails.join('; ')}` : 'All cave targets met.', ''].join('\n');
    fs.writeFileSync(new URL('./sim_cave.md', dir), body);
  }
  return args.includes('--check') && fails.length ? 1 : 0;
}

// a worker of runParallel: its seeds, then the rows back to the parent
if (!isMainThread && workerData && workerData.caveSim) {
  applyPatch(workerData.patch);
  parentPort.postMessage(runSeeds(workerData));
}

const isMain = isMainThread && process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const code = await caveMain(process.argv.slice(2));
  if (code) process.exit(code);
}
