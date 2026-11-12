// Episode 7 ("The Vanishing World") for the balance simulator (E7-battle; docs/EPISODE7_PLAN.md 6.6). ADDITIONS ONLY: no Episode 1
// to 6 zone, boss, target or loadout changes meaning.
//
// simulate.mjs calls attach() once at import (one line after Episode 6's) and gets EPISODES[7] = EP7_ZONE_ORDER, the suite and boss
// levels, TARGETS.pale_lantern / .white_phantom / .levels.ep7_*, BOSS_TARGETS; attach also chains Episode 7 onto the Episode 4 hooks
// the CLI already calls (EP4.progression adds the Episode 7 rows, EP4.check adds check() below). registerData() adds the ep4, ep5,
// ep6 and ep7 packs' battle data. It never imports simulate.mjs (the CLI's top-level await would deadlock a cycle).
//
// check() adds the plan 6.6 lines: the Stillheart Sanctum (F3) as the tightest ordinary floor; each boss's careful HP-lost band and
// win ceiling; `toughNotLong` (each boss no longer than its Episode 6 counterpart, harder on the party, careful win 85%+);
// `economy7` (the binding gold line of 7.6); `rimeless` (Rime in every Episode 7 battle and in no Episode 1 to 6 one); `noFoeRime`
// (no foe ever holds Rime, and each boss acts at least once every two party rounds); `callShare` (careful play breaks at least half
// the pins it sees with Call); and the EXP margin under Lv 31 with elites counted at their real rate.
//
//   node tools/sim/simulate.mjs --episode 7 [--check]       the Episode 7 suite only
//   node tools/sim/simulate.mjs --zone ep7_vault_f3         one zone (tuning)
//   node tools/sim/simulate.mjs --trace white_phantom 1     one battle's events

import { LOADOUTS } from './loadouts.mjs';
import { registerData as registerEp6 } from './ep6.mjs';
import registerEnemies from '../../src/data/ep7/enemies.js';
import registerItems from '../../src/data/ep7/items.js';
import registerSkills from '../../src/data/ep7/skills.js';
import registerLoot from '../../src/data/ep7/loot.js';
import registerEncounters, { EP7_ZONE_ORDER } from '../../src/data/ep7/encounters.js';
import registerRime from '../../src/data/ep7/rime.js';
import registerShops, { EP7_GOLD_LINE } from '../../src/data/ep7/shops.js';
import registerAi from '../../src/data/ep7/ai.js';
import { ENCOUNTERS, ZONES, encounterExp } from '../../src/data/encounters.js';
import { ENEMIES, ELITE_RATE, ELITE_BASE } from '../../src/data/enemies.js';
import { ITEMS } from '../../src/data/items.js';
import { levelForExp, expForLevel } from '../../src/data/party.js';

/**
 * Register the ep4, ep5, ep6 and ep7 packs' battle data (the same idempotent register() functions the pack entries call). Not done
 * at import, as ep4.mjs to ep6.mjs: the Episode 1 to 6 suites never see it unless run from the CLI.
 */
export function registerData() {
  registerEp6();
  registerEnemies(); registerItems(); registerSkills(); registerLoot(); registerEncounters(); registerRime(); registerShops(); registerAi();
}

export { EP7_ZONE_ORDER };
/**
 * The Episode 7 quick start's EXP and gold (plan 6.1 and 7.6: 17,900 EXP, Lv 28; 4,000 gold). E7-pack's src/data/ep7/start.js
 * (EP7_START) is read when it exists; until then the plan's numbers stand in.
 */
let START = { exp: 17900, gold: 4000 };
try {
  const m = await import('../../src/data/ep7/start.js');
  if (m && m.EP7_START && m.EP7_START.exp) START = { exp: m.EP7_START.exp, gold: m.EP7_START.gold ?? START.gold };
} catch { /* not written yet (wave 7a): the plan's numbers */ }
export const EP7_START_EXP = START.exp;
export const EP7_START_GOLD = START.gold;
/** Every fight before the Phantom must stay under this (Lv 31), elites counted (plan 6.1). */
export const LV31_EXP = expForLevel(31);

// ------------------------------------------------------------------ loadouts (plan 6.6)
// ep7_white_road: the ep6_obs_eyrie loadout plus the Scribe's Quill (Mira's charm), the Kestrel's Wings (the hero's charm; Aeris
// gives one of a pair, the same power) and Stormplate Mail (Bram's body). F1: + the two town pieces (Rimeplate Mail on the hero,
// Snowveil Robe on Mira) and Call (call_learned, learned in `whiteout` on the road). F2: + Winterwatch Boots (Bram). F3: + the two
// tier 14 pieces (Iceglass Sword, Aurora Staff). The Phantom: + Borrowed Flame (Bram's charm) and mastery a step up. Ember Teas
// from Sol and Maera (2 to 4).
const O = LOADOUTS.ep6_obs_eyrie;
const BASE_INV = { potion: 6, hi_potion: 8, hi_ether: 5, phoenix_feather: 3, silver_salve: 3, ether: 2, eye_drops: 2, echo_herb: 2 };
const MAST = (s) => ({
  hero: { sword: 800 + 40 * s, axe: 300 + 10 * s }, mira: { staff: 620 + 30 * s, bow: 280 + 10 * s }, bram: { spear: 800 + 40 * s, axe: 300 + 10 * s } });
const row = (id, equip, s) => ({ weapon: O[id].weapon, equip: { ...O[id].equip, ...equip }, mastery: MAST(s)[id] });
const FLAGS = [...(O.flags || [])];
const CALL_FLAGS = [...FLAGS, 'call_learned'];
const A = { hero: { charm: 'kestrel_wings' }, mira: { charm: 'scribe_quill' }, bram: { body: 'stormplate_mail' } };
LOADOUTS.ep7_white_road = {
  hero: row('hero', A.hero, 10), mira: row('mira', A.mira, 10), bram: row('bram', A.bram, 10),
  inventory: { ...BASE_INV, ember_tea: 2 }, flags: FLAGS,
};
const F1 = { hero: { ...A.hero, body: 'rimeplate_mail' }, mira: { ...A.mira, body: 'snowveil_robe' }, bram: A.bram };
LOADOUTS.ep7_vault_f1 = {
  hero: row('hero', F1.hero, 11), mira: row('mira', F1.mira, 11), bram: row('bram', F1.bram, 11),
  inventory: { ...BASE_INV, ember_tea: 3 }, flags: CALL_FLAGS,
};
const F2 = { hero: F1.hero, mira: F1.mira, bram: { ...F1.bram, boots: 'winterwatch_boots' } };
LOADOUTS.ep7_vault_f2 = {
  hero: row('hero', F2.hero, 12), mira: row('mira', F2.mira, 12), bram: row('bram', F2.bram, 12),
  inventory: { ...BASE_INV, ember_tea: 3 }, flags: CALL_FLAGS,
};
const F3 = { hero: { ...F2.hero, sword: 'iceglass_sword' }, mira: { ...F2.mira, staff: 'aurora_staff' }, bram: F2.bram };
LOADOUTS.ep7_vault_f3 = {
  hero: row('hero', F3.hero, 13), mira: row('mira', F3.mira, 13), bram: row('bram', F3.bram, 13),
  inventory: { ...BASE_INV, ember_tea: 4 }, flags: CALL_FLAGS,
};
const PH = { hero: F3.hero, mira: F3.mira, bram: { ...F3.bram, charm: 'borrowed_flame' } };
LOADOUTS.ep7_stillheart = {
  hero: row('hero', PH.hero, 14), mira: row('mira', PH.mira, 14), bram: row('bram', PH.bram, 14),
  inventory: { ...BASE_INV, ember_tea: 4 }, flags: CALL_FLAGS,
};

// ------------------------------------------------------------------ levels and targets
export const SUITE_LEVELS_EP7 = {
  ep7_white_road: [28], ep7_vault_f1: [29], ep7_vault_f2: [29, 30], ep7_vault_f3: [30], ep7_stillheart: [30, 31],
};
// The first level is where the plan meets the boss (reckless play is measured there); the second is a full clear's and the Continue
// arrival's (BATTLE 13.7: a save that fought every placed foe arrives a level up).
export const BOSS_LEVELS_EP7 = { pale_lantern: [29, 30], white_phantom: [30, 31] };
/** The Episode 6 counterparts toughNotLong compares with (BATTLE 14.6, plan 6.6): careful mean rounds and careful HP lost. */
export const EP6_COUNTERPART = { pale_lantern: { id: 'gale_engine', rounds: 8.88, hpLoss: 0.13 }, white_phantom: { id: 'scribe', rounds: 14.55, hpLoss: 0.17 } };
export const TARGETS_EP7 = {
  // Plan 6.4: careful 7 to 9 rounds, win 85% and below 100%, attack-only 0% (the house rule), ignoring the pin costs at least 10
  // points. HP lost: the plan's 20 to 28% floor moved to 16% (BATTLE.md 16.1: at 20% careful play sits at its 85% floor at 400
  // fights, with no room for a person; 16% is still above the Gale Engine's 13%, which toughNotLong holds).
  pale_lantern: { roundsMin: 7, roundsMax: 9, winMin: 0.85, winMax: 0.995, naiveWinMax: 0.01, recklessWorse: 0.10, hpLossMin: 0.16, hpLossMax: 0.28 },
  // Plan 6.5: careful rounds no higher than the Scribe's 14.55 (toughNotLong), win 85 to 95% at the plan level, attack-only 0%,
  // ignoring telegraphs wins 55% or less and costs at least 15 points, Call breaks half the Farewells (callMin). Moved (BATTLE.md
  // 16.1): the band floor 11 -> 10 (a full clear's Lv 31 wins in 11.0; a fast win is not a miss, as #87 did for the Knight) and
  // the HP-lost floor 24% -> 17% (the Scribe's 17%, which toughNotLong must beat: the plan's 24% puts careful play at its floor).
  white_phantom: { roundsMin: 10, roundsMax: 15, winMin: 0.85, winMax: 0.95, naiveWinMax: 0.01, recklessWorse: 0.15, recklessWinMax: 0.55,
    hpLossMin: 0.17, hpLossMax: 0.32, callMin: 0.5 },
  // the Stillheart Sanctum is the tightest ordinary floor: careful play loses 18 to 24% HP, attack-only wins 70 to 85%
  tightFloor: { zone: 'ep7_vault_f3', hpLoss: [0.18, 0.24], naiveWin: [0.70, 0.85] },
  // Plan 6.1: the White Road 28 -> 29 (just), F1 29, F2 29 -> 30 (just), F3 30, the Phantom at 30 -> 31
  levels: {
    ep7_white_road: { start: [28, 28], end: [29, 29] },
    ep7_vault_f1: { start: [29, 29], end: [29, 29] },
    ep7_vault_f2: { start: [29, 29], end: [30, 30] },
    ep7_vault_f3: { start: [30, 30], end: [30, 30] },
    ep7_stillheart: { start: [30, 30], end: [31, 31] },
  },
};

/** Party level through Episode 7 if the player fights `share` of each zone plan (bosses always), from the quick start's EXP. */
export function progression(share = 1, { elites = false } = {}) {
  let exp = EP7_START_EXP;
  const rows = [];
  for (const z of EP7_ZONE_ORDER) {
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
/** EXP on reaching the Phantom at `share` of the fights (elites counted at their real rate when asked), and its margin under Lv 31. */
export function phantomMargin(share = 1, opts = {}) {
  const r = progression(share, opts).find((x) => x.zone === 'ep7_stillheart');
  return { exp: r.before, margin: LV31_EXP - r.before, level: r.startLevel };
}

// ------------------------------------------------------------------ economy7 (plan 7.6, binding)
const zoneGold = (z, share = 1) => ZONES[z].plan.reduce((g, [enc, n]) => {
  const e = ENCOUNTERS[enc];
  return g + e.enemies.reduce((s, id) => s + ENEMIES[id].gold, 0) * (e.boss ? n : n * share);
}, 0);
const chestGold = (list, zones) => list.filter(([z]) => zones.includes(z)).reduce((s, [, , g]) => s + g, 0);
const priceOf = (ids) => ids.reduce((s, id) => s + ITEMS[id].price, 0);
/**
 * The gold line: from EP7_START.gold, battle gold at `share` of the fights (bosses always) plus the main-path chests (and the
 * optional ones with `optional`) buys the two town pieces on arrival at Palehaven and the two tier 14 pieces before F3. Returns
 * the gold at each buy-point and what is left after it.
 */
export function economy7({ startGold = EP7_START_GOLD, share = 1, optional = false } = {}) {
  const G = EP7_GOLD_LINE;
  const chests = optional ? [...G.mainChests, ...G.optionalChests] : G.mainChests;
  const road = zoneGold('ep7_white_road', share) + chestGold(chests, ['ep7_white_road']);
  const atTown = startGold + road;
  const town = priceOf(G.townPieces);
  const afterTown = atTown - town;
  const vault = zoneGold('ep7_vault_f1', share) + zoneGold('ep7_vault_f2', share) + chestGold(chests, ['ep7_vault_f1', 'ep7_vault_f2', 'ep7_palehaven']);
  const beforeF3 = afterTown + vault;
  const pre = priceOf(G.preF3Pieces);
  const afterF3buy = beforeF3 - pre;
  return { share, optional, startGold, road, atTown, town, afterTown, vault, beforeF3, pre, afterF3buy,
    end: afterF3buy + zoneGold('ep7_vault_f3', share) + zoneGold('ep7_stillheart', share) };
}
/** economy7's failure strings: each buy-point keeps EP7_GOLD_LINE.spare (300) at 100% (main chests) and at 80% (every chest). */
export function checkEconomy7() {
  const fails = [];
  const spare = EP7_GOLD_LINE.spare;
  for (const e of [economy7({ share: 1 }), economy7({ share: 0.8, optional: true })]) {
    const tag = `economy7 (${Math.round(e.share * 100)}% of the fights${e.optional ? ', every chest' : ', main chests'})`;
    if (e.afterTown < spare) fails.push(`${tag}: ${e.atTown} gold at Palehaven, the two town pieces cost ${e.town}: ${e.afterTown} left (want >= ${spare})`);
    if (e.afterF3buy < spare) fails.push(`${tag}: ${e.beforeF3} gold before F3, the two tier 14 pieces cost ${e.pre}: ${e.afterF3buy} left (want >= ${spare})`);
  }
  return fails;
}

const avg = (a) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
const pct = (v) => `${Math.round(v * 100)}%`;

/**
 * The pins careful play sees in one boss fight and how each ended over n seeded fights at `level`: broken by Call, by a Break,
 * landed, or gone. Also the Stilled allies Called back, Frozen members, Ember Teas and Calls per fight, and how often the boss acts:
 * its turns per party round (mean) and the longest run of party rounds with no boss turn.
 */
export function callShare(runBattle, { n = 60, level = 30, policy = 'competent', encounter = 'white_phantom' } = {}) {
  let pinned = 0, called = 0, broke = 0, landed = 0, gone = 0, back = 0, stilled = 0, frozen = 0, calls = 0, teas = 0, wins = 0;
  let foeRime = 0, rate = 0, worstGap = 0;
  const zone = ENCOUNTERS[encounter].zone;
  const bossId = ENCOUNTERS[encounter].enemies[0];
  for (let i = 0; i < n; i++) {
    const r = runBattle({ zone, level, encounter, seed: 1 + i, policy, trace: true });
    if (r.win) wins++;
    let bossTurns = 0, partyTurns = 0, sinceBoss = 0, bossUid = null;
    const party = new Set(['hero', 'mira', 'bram']);
    for (const ev of r.log) {
      if (ev.type === 'battle_start') bossUid = (ev.units.find((u) => u.id === bossId) || {}).uid;
      if (ev.type === 'farewell' && !ev.moved) pinned++;
      if (ev.type === 'farewell_broken' && ev.reason === 'call') called++;
      if (ev.type === 'farewell_broken' && ev.reason === 'break') broke++;
      if (ev.type === 'farewell_broken' && ev.reason === 'gone') gone++;
      if (ev.type === 'farewell_land') landed++;
      if (ev.type === 'stilled' && ev.on) stilled++;
      if (ev.type === 'stilled_end' && ev.reason === 'call') back++;
      if (ev.type === 'frozen') frozen++;
      if (ev.type === 'message' && ev.kind === 'call') calls++;
      if (ev.type === 'message' && ev.kind === 'rime_tea') teas++;
      if (ev.type === 'rime_add' && !party.has(ev.target)) foeRime++;
      if (ev.type === 'turn_start') {
        if (ev.actor === bossUid) { bossTurns++; sinceBoss = 0; }
        else if (party.has(ev.actor)) { partyTurns++; sinceBoss++; worstGap = Math.max(worstGap, sinceBoss / 3); }
      }
    }
    rate += bossTurns / Math.max(1, partyTurns / 3);
  }
  return { pinned: pinned / n, share: pinned ? called / pinned : 1, broke: pinned ? broke / pinned : 0, landed: pinned ? landed / pinned : 0,
    gone: pinned ? gone / pinned : 0, stilled: stilled / n, back: back / n, frozen: frozen / n, calls: calls / n, teas: teas / n,
    win: wins / n, foeRime, bossRate: rate / n, worstGap };
}

/** Every Episode 7 encounter opens with Rime, and no Episode 1 to 6 zone's first encounter does. Returns the ids that fail. */
export function rimeless(runBattle, EPISODES) {
  const out = [];
  for (const z of EP7_ZONE_ORDER) for (const [enc] of ZONES[z].plan) {
    const r = runBattle({ zone: z, level: ZONES[z].level[0], encounter: enc, seed: 1, trace: true });
    if (!r.log.some((ev) => ev.type === 'rime' && ev.reason === 'start')) out.push(enc);
  }
  for (const ep of [1, 2, 3, 4, 5, 6]) for (const z of (EPISODES && EPISODES[ep]) || []) {
    const zone = ZONES[z];
    if (!zone || !zone.plan || !zone.plan.length || !LOADOUTS[z]) continue;
    const enc = zone.plan[0][0];
    const r = runBattle({ zone: z, level: zone.level[0], encounter: enc, seed: 1, trace: true });
    if (r.log.some((ev) => ev.type === 'rime' || ev.type === 'rime_add')) out.push(`${enc} (Episode ${ep})`);
  }
  return out;
}

/** What checkTargets cannot see for Episode 7 (the rows it gets are runSuite's). Returns failure strings. */
export function check(rows, { runBattle, n = 400, log = null, EPISODES = null } = {}) {
  const fails = [];
  const T = TARGETS_EP7;
  const mine = rows.filter((r) => EP7_ZONE_ORDER.includes(r.zone));
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
    for (const z of EP7_ZONE_ORDER.filter((x) => x !== tf.zone)) {
      const rz = ord.filter((r) => r.zone === z && r.policy === 'competent');
      if (rz.length && avg(rz.map((r) => r.hpLoss)) > hp) fails.push(`${z}: careful HP lost ${pct(avg(rz.map((r) => r.hpLoss)))} is above ${tf.zone}'s ${pct(hp)}`);
    }
    if (log) log(`Stillheart Sanctum (tightest floor, Lv ${lv}): careful HP lost ${pct(hp)}, attack-only wins ${nv.length ? pct(avg(nv.map((r) => r.win))) : '-'}`);
  }
  // each boss: the careful HP-lost band and the win ceiling (checkTargets has the floor), the reckless ceiling, toughNotLong
  for (const id of ['pale_lantern', 'white_phantom']) {
    const t = T[id];
    const at = mine.filter((r) => r.encounter === id && r.policy === 'competent');
    // the ceilings hold at the plan level (the first listed); a full clear's level may be safer
    for (const r of at.filter((x) => x.level === BOSS_LEVELS_EP7[id][0])) {
      if (r.win > t.winMax) fails.push(`${id} Lv${r.level}: careful win ${pct(r.win)} > ${pct(t.winMax)} (too safe)`);
      if (r.hpLoss > t.hpLossMax) fails.push(`${id} Lv${r.level}: careful HP lost ${pct(r.hpLoss)} > ${pct(t.hpLossMax)}`);
    }
    const rr = mine.find((r) => r.encounter === id && r.policy === 'reckless');
    if (rr && t.recklessWinMax !== undefined && rr.win > t.recklessWinMax) fails.push(`${id}: ignoring telegraphs wins ${pct(rr.win)} > ${pct(t.recklessWinMax)}`);
    const plan = at.find((r) => r.level === BOSS_LEVELS_EP7[id][0]);
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
  // the EXP margin under Lv 31, elites at their real rate
  const m = phantomMargin(1, { elites: true });
  if (m.margin <= 0) fails.push(`progression: every fight (elites counted) reaches the Phantom with ${m.exp} EXP, at or over Lv 31's ${LV31_EXP}`);
  if (log) log(`Episode 7 EXP: the Phantom met with ${phantomMargin(1).exp} EXP at 100% of the fights (Lv ${phantomMargin(1).level}, `
    + `${phantomMargin(1).margin} under Lv 31); elites counted ${m.exp} (${m.margin} under); at 80% ${phantomMargin(0.8).exp} (Lv ${phantomMargin(0.8).level})`);
  // economy7 (binding)
  fails.push(...checkEconomy7());
  if (log) {
    for (const e of [economy7({ share: 1 }), economy7({ share: 0.8, optional: true })]) {
      log(`economy7 (${pct(e.share)} of the fights, ${e.optional ? 'every chest' : 'main chests'}): from ${e.startGold}, ${e.atTown} at Palehaven - `
        + `${e.town} (two town pieces) = ${e.afterTown}; ${e.beforeF3} before F3 - ${e.pre} (two tier 14 pieces) = ${e.afterF3buy}; end ${e.end}`);
    }
  }
  if (runBattle) {
    const none = rimeless(runBattle, EPISODES);
    if (none.length) fails.push(`rimeless: ${none.join(', ')}`);
  }
  if (runBattle) {
    for (const id of ['pale_lantern', 'white_phantom']) {
      if (!mine.some((r) => r.encounter === id)) continue;
      const lv = BOSS_LEVELS_EP7[id][0];
      const a = callShare(runBattle, { n: Math.min(n, 100), level: lv, encounter: id });
      const what = id === 'pale_lantern' ? 'Borrowed Lights' : 'Farewells';
      if (log) log(`${id} (Lv ${lv}, careful): ${a.pinned.toFixed(2)} ${what} a fight; ${pct(a.share)} broken by Call, ${pct(a.broke)} by a Break, `
        + `${pct(a.landed)} landed; ${a.stilled.toFixed(2)} Stilled and ${a.back.toFixed(2)} Called back, ${a.frozen.toFixed(2)} Frozen, `
        + `${a.calls.toFixed(2)} Calls and ${a.teas.toFixed(2)} Ember Teas a fight; the boss acts ${a.bossRate.toFixed(2)} times a party round `
        + `(longest wait ${a.worstGap.toFixed(2)} rounds)`);
      if (a.pinned && a.share < (T.white_phantom.callMin)) fails.push(`callShare: ${id} careful play breaks only ${pct(a.share)} of the ${what} with Call (want >= 50%)`);
      if (a.foeRime) fails.push(`noFoeRime: ${a.foeRime} Rime events on a foe in ${id} fights`);
      if (a.bossRate < 0.5) fails.push(`noFoeRime: ${id} acts ${a.bossRate.toFixed(2)} times a party round (want >= 0.5: once every two rounds)`);
    }
  }
  return fails;
}

/**
 * Hook Episode 7 into the simulator's tables (simulate.mjs, once). Adds only new keys, and chains its progression and check onto
 * the Episode 4 hooks the CLI calls (`EP4`, which Episodes 5 and 6 already chain onto). simulate.mjs has two Episode 7 lines, as
 * Episode 6 has: this attach and `...EPISODES[7]` in the CLI's default zone list.
 */
export function attach({ EPISODES, TARGETS, SUITE_LEVELS, BOSS_LEVELS, BOSS_TARGETS, EP4 = null }, { register } = {}) {
  if (register ?? /simulate\.mjs$/.test(String(process.argv[1] || '').replace(/\\/g, '/'))) registerData();
  if (!EPISODES[7]) EPISODES[7] = EP7_ZONE_ORDER.slice();
  for (const [z, lv] of Object.entries(SUITE_LEVELS_EP7)) if (!SUITE_LEVELS[z]) SUITE_LEVELS[z] = lv;
  for (const [b, lv] of Object.entries(BOSS_LEVELS_EP7)) if (!BOSS_LEVELS[b]) BOSS_LEVELS[b] = lv;
  for (const id of ['pale_lantern', 'white_phantom']) {
    if (!TARGETS[id]) TARGETS[id] = TARGETS_EP7[id];
    if (!BOSS_TARGETS.includes(id)) BOSS_TARGETS.push(id);
  }
  for (const [z, t] of Object.entries(TARGETS_EP7.levels)) if (!TARGETS.levels[z]) TARGETS.levels[z] = t;
  if (EP4 && !EP4.ep7) {
    const p4 = EP4.progression, c4 = EP4.check;
    EP4.progression = (share = 1) => [...p4(share), ...progression(share)];
    EP4.check = (rows, o = {}) => [...c4(rows, o), ...check(rows, { ...o, EPISODES })];
    EP4.ep7 = true;
  }
  return { progression, check, startExp: EP7_START_EXP };
}
export default attach;
