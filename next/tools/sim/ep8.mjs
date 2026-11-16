// Episode 8 ("The Last Word") for the balance simulator (E8-battle; docs/EPISODE8_PLAN.md 6.6). ADDITIONS ONLY: no Episode 1 to 7
// zone, boss, target or loadout changes meaning.
//
// simulate.mjs calls attach() once at import (one line after Episode 7's) and gets EPISODES[8] = EP8_ZONE_ORDER, the suite and boss
// levels, TARGETS.unnamed_sentry / .eraser / .levels.ep8_*, BOSS_TARGETS; attach also chains Episode 8 onto the Episode 4 hooks the
// CLI already calls (EP4.progression adds the Episode 8 rows, EP4.check adds check() below). registerData() adds the ep4 to ep8 packs'
// battle data. It never imports simulate.mjs (the CLI's top-level await would deadlock a cycle).
//
// check() adds the plan 6.6 lines: the Unwritten Page (F3) as the tightest ordinary floor; each boss's careful HP-lost band and win
// ceiling; `toughNotLong` (each boss no longer than its Episode 6 counterpart, harder on the party, careful win 85%+); `economy8` (the
// binding gold line of 7.6, from the quick start: the poorest way in) with the real save's line beside it; `erasureOn` (Erasure in every
// Episode 8 battle and in no Episode 1 to 7 one); `noFoeErased` (no foe ever rubbed out, the hero never rubbed out or Unwritten, each
// boss acting at least once every two party rounds); `readShare` and `answerShare` (careful play breaks at least half the Unwrites with
// Read Aloud and half the Last Silences with Answer); `telegraphCount` (two Unwrites a Sentry fight; three Unwrites and two Last
// Silences an Eraser fight); and the EXP margin under Lv 34 with elites counted at their real rate.
//
//   node tools/sim/simulate.mjs --episode 8 [--check]       the Episode 8 suite only
//   node tools/sim/simulate.mjs --zone ep8_library_f3       one zone (tuning)
//   node tools/sim/simulate.mjs --trace eraser 1            one battle's events

import { LOADOUTS } from './loadouts.mjs';
import { registerData as registerEp7, economy7 } from './ep7.mjs';
import registerEnemies from '../../src/data/ep8/enemies.js';
import registerItems from '../../src/data/ep8/items.js';
import registerSkills from '../../src/data/ep8/skills.js';
import registerLoot from '../../src/data/ep8/loot.js';
import registerEncounters, { EP8_ZONE_ORDER } from '../../src/data/ep8/encounters.js';
import registerErasure from '../../src/data/ep8/erasure.js';
import registerShops, { EP8_GOLD_LINE, EP8_SHOPS } from '../../src/data/ep8/shops.js';
import registerAi from '../../src/data/ep8/ai.js';
import { ENCOUNTERS, ZONES, encounterExp } from '../../src/data/encounters.js';
import { ENEMIES, ELITE_RATE, ELITE_BASE } from '../../src/data/enemies.js';
import { ITEMS } from '../../src/data/items.js';
import { levelForExp, expForLevel } from '../../src/data/party.js';

/**
 * Register the ep4 to ep8 packs' battle data (the same idempotent register() functions the pack entries call). Not done at import, as
 * ep4.mjs to ep7.mjs: the Episode 1 to 7 suites never see it unless run from the CLI.
 */
export function registerData() {
  registerEp7();
  registerEnemies(); registerItems(); registerSkills(); registerLoot(); registerEncounters(); registerErasure(); registerShops(); registerAi();
}

export { EP8_ZONE_ORDER, LOADOUTS };   // LOADOUTS.ep8_stair is the quick start's party (E8-pack's start.js test reads it)
/**
 * The Episode 8 quick start's EXP and gold (plan 6.1 and 10.4: 22,200 EXP, Lv 31; 4,300 gold). src/data/ep8/start.js (EP8_START,
 * E8-pack) is read when it exists; until then the plan's numbers stand in.
 */
let START = { exp: 22200, gold: 4300 };
try {
  const m = await import('../../src/data/ep8/start.js');
  if (m && m.EP8_START && m.EP8_START.exp) START = { exp: m.EP8_START.exp, gold: m.EP8_START.gold ?? START.gold };
} catch { /* not written yet (wave 8a, E8-pack): the plan's numbers */ }
export const EP8_START_EXP = START.exp;
export const EP8_START_GOLD = START.gold;
/** Every fight before the Eraser must stay under this (Lv 34), elites counted (plan 6.1). */
export const LV34_EXP = expForLevel(34);
/**
 * What a real Episode 7 finish carries in (BATTLE.md 16.5: an Episode 6 save reached Episode 7 with about 9,400 G against the quick
 * start's 4,400, so a real run is about 5,000 G richer than the quick-start chain). The chain's own end is economy7's (5,360 at 100%
 * of the fights, main chests; 4,478 at 80%, every chest). `bare` adds the 5,000 to the chain's end; `spent` takes off the review's
 * 1,400 of other spending (16.5: 4,100 to 5,600 left after the F3 pieces against the bare 6,000 to 6,500).
 */
export function arrival() {
  const chain = economy7({ share: 1 }).end, chain80 = economy7({ share: 0.8, optional: true }).end;
  return { quickStart: EP8_START_GOLD, chain, chain80, realBare: chain + 5000, realSpent: chain + 5000 - 1400 };
}

// ------------------------------------------------------------------ loadouts (plan 6.6)
// ep8_stair: the ep7_stillheart loadout plus the Stillheart Shard (Mira's charm: the Phantom's guaranteed drop) and one Nox gift (the
// Open Gate on the hero: the truth path the quick start takes). F1: + Vellum Plate (hero), Glyphweave Robe (Mira) and Read Aloud
// (read_learned, learned in `first_word` in the Scriptorium). F2: + Margin-Walker Boots (Bram). F3: + Quillsteel Sword and Lexicon
// Staff. The Eraser: + the Blank Faceplate (Bram's charm) and mastery a step up. Fresh Ink from Bibliotheca and Quinn (2 to 4).
const O = LOADOUTS.ep7_stillheart;
const BASE_INV = { potion: 6, hi_potion: 8, hi_ether: 5, phoenix_feather: 3, silver_salve: 3, ether: 2, eye_drops: 2, echo_herb: 2 };
const MAST = (s) => ({
  hero: { sword: 800 + 40 * s, axe: 300 + 10 * s }, mira: { staff: 620 + 30 * s, bow: 280 + 10 * s }, bram: { spear: 800 + 40 * s, axe: 300 + 10 * s } });
const row = (id, equip, s) => ({ weapon: O[id].weapon, equip: { ...O[id].equip, ...equip }, mastery: MAST(s)[id] });
const FLAGS = [...(O.flags || [])];
const READ_FLAGS = [...FLAGS, 'read_learned'];
const A = { hero: { charm: 'open_gate' }, mira: { charm: 'stillheart_shard' }, bram: {} };
LOADOUTS.ep8_stair = {
  hero: row('hero', A.hero, 15), mira: row('mira', A.mira, 15), bram: row('bram', A.bram, 15),
  inventory: { ...BASE_INV, fresh_ink: 2 }, flags: FLAGS,
};
const F1 = { hero: { ...A.hero, body: 'vellum_plate' }, mira: { ...A.mira, body: 'glyphweave_robe' }, bram: A.bram };
LOADOUTS.ep8_library_f1 = {
  hero: row('hero', F1.hero, 16), mira: row('mira', F1.mira, 16), bram: row('bram', F1.bram, 16),
  inventory: { ...BASE_INV, fresh_ink: 3 }, flags: READ_FLAGS,
};
const F2 = { hero: F1.hero, mira: F1.mira, bram: { ...F1.bram, boots: 'margin_boots_set' } };
LOADOUTS.ep8_library_f2 = {
  hero: row('hero', F2.hero, 17), mira: row('mira', F2.mira, 17), bram: row('bram', F2.bram, 17),
  inventory: { ...BASE_INV, fresh_ink: 3 }, flags: READ_FLAGS,
};
const F3 = { hero: { ...F2.hero, sword: 'quillsteel_sword' }, mira: { ...F2.mira, staff: 'lexicon_staff' }, bram: F2.bram };
LOADOUTS.ep8_library_f3 = {
  hero: row('hero', F3.hero, 18), mira: row('mira', F3.mira, 18), bram: row('bram', F3.bram, 18),
  inventory: { ...BASE_INV, fresh_ink: 4 }, flags: READ_FLAGS,
};
const LW = { hero: F3.hero, mira: F3.mira, bram: { ...F3.bram, charm: 'blank_faceplate' } };
LOADOUTS.ep8_last_word = {
  hero: row('hero', LW.hero, 19), mira: row('mira', LW.mira, 19), bram: row('bram', LW.bram, 19),
  inventory: { ...BASE_INV, fresh_ink: 4 }, flags: READ_FLAGS,
};

// ------------------------------------------------------------------ levels and targets
export const SUITE_LEVELS_EP8 = {
  ep8_stair: [31], ep8_library_f1: [31, 32], ep8_library_f2: [32, 33], ep8_library_f3: [33], ep8_last_word: [33, 34],
};
// The first level is where the plan meets the boss (reckless play is measured there); the second is a full clear's and the Continue
// arrival's (BATTLE 13.7: a save that fought every placed foe arrives a level up).
export const BOSS_LEVELS_EP8 = { unnamed_sentry: [32, 33], eraser: [33, 34] };
/** The Episode 6 counterparts toughNotLong compares with (BATTLE 14.6, plan 6.6): careful mean rounds and careful HP lost. */
export const EP6_COUNTERPART = { unnamed_sentry: { id: 'gale_engine', rounds: 8.88, hpLoss: 0.13 }, eraser: { id: 'scribe', rounds: 14.55, hpLoss: 0.17 } };
export const TARGETS_EP8 = {
  // Plan 6.4: careful 7 to 9 rounds (mean no higher than the Gale Engine's 8.88: toughNotLong), win 85% and below 100%, attack-only 0%,
  // ignoring the pin costs at least 10 points, careful HP lost 20 to 28%.
  unnamed_sentry: { roundsMin: 7, roundsMax: 9, winMin: 0.85, winMax: 0.995, naiveWinMax: 0.01, recklessWorse: 0.10, hpLossMin: 0.20, hpLossMax: 0.28 },
  // Plan 6.5: careful 11 to 15 rounds (mean no higher than the Storm Scribe's 14.55), win 85 to 95% at the plan level, attack-only 0%,
  // ignoring telegraphs wins 50% or less and costs at least 15 points, careful HP lost 26 to 34%, Read Aloud breaks half the Unwrites
  // and Answer half the Last Silences.
  // Moved (BATTLE.md 17.1): the band floor 11 -> 10 (a full clear's Lv 34 wins in about 11.7; a fast win is not a miss) and the HP-lost
  // floor 26% -> 17% (the Scribe's, which toughNotLong must beat: careful play's win rate and its HP lost trade one for one past it).
  eraser: { roundsMin: 10, roundsMax: 15, winMin: 0.85, winMax: 0.95, naiveWinMax: 0.01, recklessWorse: 0.15, recklessWinMax: 0.50,
    hpLossMin: 0.17, hpLossMax: 0.34, readMin: 0.5, answerMin: 0.5 },
  // the Unwritten Page is the tightest ordinary floor: careful play loses 18 to 24% HP, attack-only wins 70 to 85%
  tightFloor: { zone: 'ep8_library_f3', hpLoss: [0.18, 0.24], naiveWin: [0.70, 0.85] },
  // telegraphCount (PLAYTEST_REVIEW_8 item 10): Unwrites a careful Sentry fight; Unwrites and Last Silences a careful Eraser fight
  telegraphs: { unnamed_sentry: { unwrites: 2 }, eraser: { unwrites: 3, silences: 2 } },
  // Plan 6.1: the Stair 31, F1 31 -> 32, F2 32 -> 33 (just), F3 33, the Eraser at 33 -> 34
  levels: {
    ep8_stair: { start: [31, 31], end: [31, 31] },
    ep8_library_f1: { start: [31, 31], end: [32, 32] },
    ep8_library_f2: { start: [32, 32], end: [33, 33] },
    ep8_library_f3: { start: [33, 33], end: [33, 33] },
    ep8_last_word: { start: [33, 33], end: [34, 34] },
  },
};

/** Party level through Episode 8 if the player fights `share` of each zone plan (bosses always), from the quick start's EXP. */
export function progression(share = 1, { elites = false, startExp = EP8_START_EXP } = {}) {
  let exp = startExp;
  const rows = [];
  for (const z of EP8_ZONE_ORDER) {
    const startLevel = levelForExp(exp);
    const before = exp;
    let fights = 0;
    for (const [enc, count] of ZONES[z].plan) {
      const e = ENCOUNTERS[enc];
      const n = e.boss ? count : count * share;
      exp += (encounterExp(enc) + (elites ? eliteExtra(enc) : 0)) * n; fights += n;
    }
    exp = Math.round(exp);
    rows.push({ zone: z, share, fights: Math.round(fights * 10) / 10, startLevel, endLevel: levelForExp(exp), exp, before });
  }
  return rows;
}
/** The EXP an elite adds to a group on average at the live rate: one foe of the group pays ELITE_BASE.exp times its EXP. */
export function eliteExtra(enc) {
  const e = ENCOUNTERS[enc];
  if (!e || e.boss || e.noElite) return 0;
  const per = encounterExp(enc) / e.enemies.length;
  return ELITE_RATE * per * (ELITE_BASE.exp - 1);
}
/** EXP on reaching the Eraser at `share` of the fights (elites counted at their real rate when asked), and its margin under Lv 34. */
export function eraserMargin(share = 1, opts = {}) {
  const r = progression(share, opts).find((x) => x.zone === 'ep8_last_word');
  return { exp: r.before, margin: LV34_EXP - r.before, level: r.startLevel };
}

// ------------------------------------------------------------------ economy8 (plan 7.6, binding)
const zoneGold = (z, share = 1) => ZONES[z].plan.reduce((g, [enc, n]) => {
  const e = ENCOUNTERS[enc];
  return g + e.enemies.reduce((s, id) => s + ENEMIES[id].gold, 0) * (e.boss ? n : n * share);
}, 0);
const chestGold = (list, zones) => list.filter(([z]) => zones.includes(z)).reduce((s, [, , g]) => s + g, 0);
const priceOf = (ids) => ids.reduce((s, id) => s + ITEMS[id].price, 0);
/** Everything the Glyphsmith Atelier sells (both tiers): what the gold must never buy whole. */
export function atelierTotal() { return EP8_SHOPS.glyphsmith.stock.filter((e) => ITEMS[e.item]).reduce((s, e) => s + (e.price ?? ITEMS[e.item].price), 0); }
/**
 * The gold line: from `startGold` (the quick start's by default), battle gold at `share` of the fights (bosses always) plus the
 * main-path chests (and the optional ones with `optional`) buys the two town pieces on arrival at the Scriptorium and the two tier 16
 * pieces before F3. Returns the gold at each buy-point and what is left after it.
 */
export function economy8({ startGold = EP8_START_GOLD, share = 1, optional = false } = {}) {
  const G = EP8_GOLD_LINE;
  const chests = optional ? [...G.mainChests, ...G.optionalChests] : G.mainChests;
  const stair = zoneGold('ep8_stair', share) + chestGold(chests, ['ep8_stair']);
  const atTown = startGold + stair;
  const town = priceOf(G.townPieces);
  const afterTown = atTown - town;
  const library = zoneGold('ep8_library_f1', share) + zoneGold('ep8_library_f2', share)
    + chestGold(chests, ['ep8_library_f1', 'ep8_library_f2', 'ep8_scriptorium']);
  const beforeF3 = afterTown + library;
  const pre = priceOf(G.preF3Pieces);
  const afterF3buy = beforeF3 - pre;
  return { share, optional, startGold, stair, atTown, town, afterTown, library, beforeF3, pre, afterF3buy,
    end: afterF3buy + zoneGold('ep8_library_f3', share) + zoneGold('ep8_last_word', share) };
}
/**
 * economy8's failure strings: each buy-point keeps EP8_GOLD_LINE.spare (300) at 100% (main chests) and at 80% (every chest) from the
 * quick start; and a real save, at its richest (bare), still cannot buy the whole Atelier by the end (never everything).
 */
export function checkEconomy8() {
  const fails = [];
  const spare = EP8_GOLD_LINE.spare;
  for (const e of [economy8({ share: 1 }), economy8({ share: 0.8, optional: true })]) {
    const tag = `economy8 (${Math.round(e.share * 100)}% of the fights${e.optional ? ', every chest' : ', main chests'})`;
    if (e.afterTown < spare) fails.push(`${tag}: ${e.atTown} gold at the Scriptorium, the two town pieces cost ${e.town}: ${e.afterTown} left (want >= ${spare})`);
    if (e.afterF3buy < spare) fails.push(`${tag}: ${e.beforeF3} gold before F3, the two tier 16 pieces cost ${e.pre}: ${e.afterF3buy} left (want >= ${spare})`);
  }
  const rich = economy8({ startGold: arrival().realBare, share: 1, optional: true });
  const whole = atelierTotal();
  if (rich.end + rich.town + rich.pre >= whole) fails.push(`economy8 (real save): ${rich.end + rich.town + rich.pre} gold over the episode buys the whole Atelier (${whole})`);
  return fails;
}

const avg = (a) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
const pct = (v) => `${Math.round(v * 100)}%`;

/**
 * The telegraphs careful play sees in one boss fight and how each ended over n seeded fights at `level`: Unwrites (broken by Read
 * Aloud, by a Break, landed), Last Silences (answered, broken, landed), Unwritten members, rubs, Fresh Inks; any rub or Unwritten on a
 * foe or on the hero; how often the boss acts (its turns per party round, mean) and the longest run of party rounds with no boss turn.
 */
export function readShare(runBattle, { n = 60, level = 33, policy = 'competent', encounter = 'eraser' } = {}) {
  let pins = 0, read = 0, broke = 0, landed = 0, silences = 0, answered = 0, sBroke = 0, sLanded = 0, unwritten = 0, rubs = 0, inks = 0;
  let wins = 0, foeErased = 0, heroErased = 0, rate = 0, worstGap = 0, last = 0, lastSil = 0;
  const zone = ENCOUNTERS[encounter].zone;
  const bossId = ENCOUNTERS[encounter].enemies[0];
  const party = new Set(['hero', 'mira', 'bram']);
  for (let i = 0; i < n; i++) {
    const r = runBattle({ zone, level, encounter, seed: 1 + i, policy, trace: true });
    if (r.win) wins++;
    let bossTurns = 0, partyTurns = 0, sinceBoss = 0, bossUid = null, inLast = false, sil = 0;
    for (const ev of r.log) {
      if (ev.type === 'battle_start') bossUid = (ev.units.find((u) => u.id === bossId) || {}).uid;
      if (ev.type === 'phase' && ev.actor === bossUid && ev.id === 'last_silence') inLast = true;
      if (ev.type === 'telegraph' && ev.skill === 'last_silence') sil++;
      if (ev.type === 'unwrite_pin' && !ev.moved) pins++;
      if (ev.type === 'unwrite_broken' && ev.reason === 'read') read++;
      if (ev.type === 'unwrite_broken' && ev.reason === 'break') broke++;
      if (ev.type === 'unwrite_land') landed++;
      if (ev.type === 'telegraph' && ev.skill === 'last_silence') silences++;
      if (ev.type === 'silence_broken' && ev.reason === 'answer') answered++;
      if (ev.type === 'silence_broken' && ev.reason === 'break') sBroke++;
      if (ev.type === 'action_start' && ev.action && ev.action.skill === 'last_silence' && ev.charged) sLanded++;
      if (ev.type === 'unwritten') { unwritten++; if (ev.target === 'hero') heroErased++; else if (!party.has(ev.target)) foeErased++; }
      if (ev.type === 'rub') { rubs++; if (!party.has(ev.target)) foeErased++; else if (ev.target === 'hero') heroErased++; }
      if (ev.type === 'message' && ev.kind === 'fresh_ink') inks++;
      if (ev.type === 'turn_start') {
        if (ev.actor === bossUid) { bossTurns++; sinceBoss = 0; }
        else if (party.has(ev.actor)) { partyTurns++; sinceBoss++; worstGap = Math.max(worstGap, sinceBoss / 3); }
      }
    }
    rate += bossTurns / Math.max(1, partyTurns / 3);
    if (inLast) { last++; lastSil += sil; }
  }
  return { pins: pins / n, read: pins ? read / pins : 1, broke: pins ? broke / pins : 0, landed: pins ? landed / pins : 0,
    silences: silences / n, answered: silences ? answered / silences : 1, sBroke: silences ? sBroke / silences : 0,
    sLanded: silences ? sLanded / silences : 0, lastFights: last / n, lastSilences: last ? lastSil / last : 0, unwritten: unwritten / n, rubs: rubs / n, inks: inks / n,
    win: wins / n, foeErased, heroErased, bossRate: rate / n, worstGap };
}

/** Every Episode 8 encounter opens with Erasure, and no Episode 1 to 7 zone's first encounter does. Returns the ids that fail. */
export function erasureOn(runBattle, EPISODES) {
  const out = [];
  for (const z of EP8_ZONE_ORDER) for (const [enc] of ZONES[z].plan) {
    const r = runBattle({ zone: z, level: ZONES[z].level[0], encounter: enc, seed: 1, trace: true });
    if (!r.log.some((ev) => ev.type === 'erasure' && ev.reason === 'start')) out.push(enc);
  }
  for (const ep of [1, 2, 3, 4, 5, 6, 7]) for (const z of (EPISODES && EPISODES[ep]) || []) {
    const zone = ZONES[z];
    if (!zone || !zone.plan || !zone.plan.length || !LOADOUTS[z]) continue;
    const enc = zone.plan[0][0];
    const r = runBattle({ zone: z, level: zone.level[0], encounter: enc, seed: 1, trace: true });
    if (r.log.some((ev) => ev.type === 'erasure' || ev.type === 'rub' || ev.type === 'unwritten')) out.push(`${enc} (Episode ${ep})`);
  }
  return out;
}

/** What checkTargets cannot see for Episode 8 (the rows it gets are runSuite's). Returns failure strings. */
export function check(rows, { runBattle, n = 400, log = null, EPISODES = null } = {}) {
  const fails = [];
  const T = TARGETS_EP8;
  const mine = rows.filter((r) => EP8_ZONE_ORDER.includes(r.zone));
  if (!mine.length) return fails;
  const ord = mine.filter((r) => !r.elite && ENCOUNTERS[r.encounter] && !ENCOUNTERS[r.encounter].boss);
  const tf = T.tightFloor;
  const all = ord.filter((r) => r.zone === tf.zone && r.policy === 'competent');
  if (all.length) {
    const lv = Math.min(...all.map((r) => r.level));
    const hp = avg(all.filter((r) => r.level === lv).map((r) => r.hpLoss));
    const nv = ord.filter((r) => r.zone === tf.zone && r.policy === 'naive' && r.level === lv);
    if (hp < tf.hpLoss[0] || hp > tf.hpLoss[1]) fails.push(`${tf.zone}: careful HP lost ${pct(hp)} outside ${pct(tf.hpLoss[0])}-${pct(tf.hpLoss[1])}`);
    if (nv.length) {
      const w = avg(nv.map((r) => r.win));
      if (w < tf.naiveWin[0] || w > tf.naiveWin[1]) fails.push(`${tf.zone}: attack-only wins ${pct(w)} outside ${pct(tf.naiveWin[0])}-${pct(tf.naiveWin[1])}`);
    }
    for (const z of EP8_ZONE_ORDER.filter((x) => x !== tf.zone)) {
      const rz = ord.filter((r) => r.zone === z && r.policy === 'competent');
      if (rz.length && avg(rz.map((r) => r.hpLoss)) > hp) fails.push(`${z}: careful HP lost ${pct(avg(rz.map((r) => r.hpLoss)))} is above ${tf.zone}'s ${pct(hp)}`);
    }
    if (log) log(`The Unwritten Page (tightest floor, Lv ${lv}): careful HP lost ${pct(hp)}, attack-only wins ${nv.length ? pct(avg(nv.map((r) => r.win))) : '-'}`);
  }
  // each boss: the careful HP-lost band and the win ceiling (checkTargets has the floor), the reckless ceiling, toughNotLong
  for (const id of ['unnamed_sentry', 'eraser']) {
    const t = T[id];
    const at = mine.filter((r) => r.encounter === id && r.policy === 'competent');
    for (const r of at.filter((x) => x.level === BOSS_LEVELS_EP8[id][0])) {
      if (r.win > t.winMax) fails.push(`${id} Lv${r.level}: careful win ${pct(r.win)} > ${pct(t.winMax)} (too safe)`);
      if (r.hpLoss > t.hpLossMax) fails.push(`${id} Lv${r.level}: careful HP lost ${pct(r.hpLoss)} > ${pct(t.hpLossMax)}`);
    }
    const rr = mine.find((r) => r.encounter === id && r.policy === 'reckless');
    if (rr && t.recklessWinMax !== undefined && rr.win > t.recklessWinMax) fails.push(`${id}: ignoring telegraphs wins ${pct(rr.win)} > ${pct(t.recklessWinMax)}`);
    const plan = at.find((r) => r.level === BOSS_LEVELS_EP8[id][0]);
    if (plan) {
      const c = EP6_COUNTERPART[id];
      const live = rows.find((r) => r.encounter === c.id && r.policy === 'competent');
      if (log) log(`toughNotLong ${id} (Lv ${plan.level}): careful rounds ${plan.rounds.toFixed(2)} vs ${c.id} ${c.rounds}, HP lost ${pct(plan.hpLoss)} vs ${pct(c.hpLoss)}, `
        + `win ${pct(plan.win)} (want >= 85%)${live ? `; ${c.id} today ${live.rounds.toFixed(2)} rounds, ${pct(live.hpLoss)} HP lost` : ''}`);
      if (plan.rounds > c.rounds) fails.push(`toughNotLong: ${id} careful rounds ${plan.rounds.toFixed(2)} > ${c.id}'s ${c.rounds}`);
      if (plan.hpLoss <= c.hpLoss) fails.push(`toughNotLong: ${id} careful HP lost ${pct(plan.hpLoss)} not above ${c.id}'s ${pct(c.hpLoss)}`);
      if (plan.win < 0.85) fails.push(`toughNotLong: ${id} careful win ${pct(plan.win)} < 85%`);
    }
  }
  // the EXP margin under Lv 34, elites at their real rate
  const m = eraserMargin(1, { elites: true });
  if (m.margin <= 0) fails.push(`progression: every fight (elites counted) reaches the Eraser with ${m.exp} EXP, at or over Lv 34's ${LV34_EXP}`);
  if (log) log(`Episode 8 EXP: the Eraser met with ${eraserMargin(1).exp} EXP at 100% of the fights (Lv ${eraserMargin(1).level}, `
    + `${eraserMargin(1).margin} under Lv 34); elites counted ${m.exp} (${m.margin} under); at 80% ${eraserMargin(0.8).exp} (Lv ${eraserMargin(0.8).level})`);
  // economy8 (binding on the quick start), the real save beside it
  fails.push(...checkEconomy8());
  if (log) {
    const a = arrival();
    for (const e of [economy8({ share: 1 }), economy8({ share: 0.8, optional: true }), economy8({ startGold: a.realSpent, share: 1 }), economy8({ startGold: a.realBare, share: 1 })]) {
      log(`economy8 (${pct(e.share)} of the fights, ${e.optional ? 'every chest' : 'main chests'}, from ${e.startGold}): ${e.atTown} at the Scriptorium - `
        + `${e.town} (two town pieces) = ${e.afterTown}; ${e.beforeF3} before F3 - ${e.pre} (two tier 16 pieces) = ${e.afterF3buy}; end ${e.end}`);
    }
    log(`economy8 arrivals: quick start ${a.quickStart}; the Episode 7 quick-start chain ends with ${a.chain} (100%) / ${a.chain80} (80%); a real save about `
      + `${a.realSpent} to ${a.realBare}; the whole Atelier ${atelierTotal()}`);
  }
  if (runBattle) {
    const none = erasureOn(runBattle, EPISODES);
    if (none.length) fails.push(`erasureOn: ${none.join(', ')}`);
  }
  if (runBattle) {
    for (const id of ['unnamed_sentry', 'eraser']) {
      if (!mine.some((r) => r.encounter === id)) continue;
      const lv = BOSS_LEVELS_EP8[id][0];
      const a = readShare(runBattle, { n: Math.min(n, 100), level: lv, encounter: id });
      if (log) log(`${id} (Lv ${lv}, careful): ${a.pins.toFixed(2)} Unwrites a fight; ${pct(a.read)} broken by Read Aloud, ${pct(a.broke)} by a Break, `
        + `${pct(a.landed)} landed; ${a.unwritten.toFixed(2)} Unwritten; ${a.silences.toFixed(2)} Last Silences, ${pct(a.answered)} answered, `
        + `${pct(a.sBroke)} broken, ${pct(a.sLanded)} landed (${a.lastSilences.toFixed(2)} in each of the ${pct(a.lastFights)} of fights that reach the last phase); ${a.rubs.toFixed(2)} rubs and ${a.inks.toFixed(2)} Fresh Inks a fight; `
        + `the boss acts ${a.bossRate.toFixed(2)} times a party round (longest wait ${a.worstGap.toFixed(2)} rounds)`);
      if (a.pins && a.read < T.eraser.readMin) fails.push(`readShare: ${id} careful play breaks only ${pct(a.read)} of the Unwrites with Read Aloud (want >= 50%)`);
      if (id === 'eraser' && a.silences && a.answered < T.eraser.answerMin) fails.push(`answerShare: careful play answers only ${pct(a.answered)} of the Last Silences (want >= 50%)`);
      const tc = T.telegraphs[id];
      if (a.pins < tc.unwrites) fails.push(`telegraphCount: ${id} ${a.pins.toFixed(2)} Unwrites a careful fight (want >= ${tc.unwrites})`);
      // the Last Silences are counted over the fights that reach the last phase (a fight lost earlier never meets one)
      if (tc.silences && a.lastSilences < tc.silences) fails.push(`telegraphCount: ${id} ${a.lastSilences.toFixed(2)} Last Silences a careful fight that reaches the last phase (want >= ${tc.silences})`);
      if (a.foeErased) fails.push(`noFoeErased: ${a.foeErased} rubs or unwritings on a foe in ${id} fights`);
      if (a.heroErased) fails.push(`noFoeErased: the hero was rubbed out or Unwritten ${a.heroErased} times in ${id} fights`);
      if (a.bossRate < 0.5) fails.push(`noFoeErased: ${id} acts ${a.bossRate.toFixed(2)} times a party round (want >= 0.5: once every two rounds)`);
    }
  }
  return fails;
}

/**
 * Hook Episode 8 into the simulator's tables (simulate.mjs, once). Adds only new keys, and chains its progression and check onto the
 * Episode 4 hooks the CLI calls (`EP4`, which Episodes 5 to 7 already chain onto).
 */
export function attach({ EPISODES, TARGETS, SUITE_LEVELS, BOSS_LEVELS, BOSS_TARGETS, EP4 = null }, { register } = {}) {
  if (register ?? /simulate\.mjs$/.test(String(process.argv[1] || '').replace(/\\/g, '/'))) registerData();
  if (!EPISODES[8]) EPISODES[8] = EP8_ZONE_ORDER.slice();
  for (const [z, lv] of Object.entries(SUITE_LEVELS_EP8)) if (!SUITE_LEVELS[z]) SUITE_LEVELS[z] = lv;
  for (const [b, lv] of Object.entries(BOSS_LEVELS_EP8)) if (!BOSS_LEVELS[b]) BOSS_LEVELS[b] = lv;
  for (const id of ['unnamed_sentry', 'eraser']) {
    if (!TARGETS[id]) TARGETS[id] = TARGETS_EP8[id];
    if (!BOSS_TARGETS.includes(id)) BOSS_TARGETS.push(id);
  }
  for (const [z, t] of Object.entries(TARGETS_EP8.levels)) if (!TARGETS.levels[z]) TARGETS.levels[z] = t;
  if (EP4 && !EP4.ep8) {
    const p4 = EP4.progression, c4 = EP4.check;
    EP4.progression = (share = 1) => [...p4(share), ...progression(share)];
    EP4.check = (rows, o = {}) => [...c4(rows, o), ...check(rows, { ...o, EPISODES })];
    EP4.ep8 = true;
  }
  return { progression, check, startExp: EP8_START_EXP };
}
export default attach;
