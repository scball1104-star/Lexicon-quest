// Episode 4 ("The Sunken Keep") for the balance simulator (E4-battle; docs/EPISODE4_PLAN.md 6.6). ADDITIONS ONLY: no Episode 1
// to 3 zone, boss, target or loadout changes meaning.
//
// simulate.mjs calls attach() once at import (one line after its extension merge) and uses the returned hooks in its CLI:
//   EPISODES[4] = EP4_ZONE_ORDER, the suite and boss levels, TARGETS.barrister / .paper_regent / .levels.ep4_*, BOSS_TARGETS,
//   progression(share) for Episode 4 (from the quick start's 5,600 EXP), and check(rows) for what checkTargets cannot see:
//   Keep F3 as the tightest ordinary floor, and careful play Answering at least half of the Strikes from the Roll.
// Importing this file adds the loadouts; registerData() adds the ep4 pack's battle data (the CLI does it through attach, the
// Episode 4 tests call it themselves). It never imports simulate.mjs (the CLI's
// top-level await would deadlock a cycle; x1.mjs and route.mjs avoid it the same way).
//
//   node tools/sim/simulate.mjs --episode 4 [--check]       the Episode 4 suite only
//   node tools/sim/simulate.mjs --zone ep4_keep_f3          one zone (tuning)
//   node tools/sim/simulate.mjs --trace paper_regent 1      one battle's events

import { LOADOUTS } from './loadouts.mjs';
import registerEnemies from '../../src/data/ep4/enemies.js';
import registerItems from '../../src/data/ep4/items.js';
import registerSkills from '../../src/data/ep4/skills.js';
import registerLoot from '../../src/data/ep4/loot.js';
import registerEncounters, { EP4_ZONE_ORDER } from '../../src/data/ep4/encounters.js';
import registerShops from '../../src/data/ep4/shops.js';
import registerAi from '../../src/data/ep4/ai.js';
import { EP4_START } from '../../src/data/ep4/start.js';
import { ENCOUNTERS, ZONES, encounterExp } from '../../src/data/encounters.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { levelForExp } from '../../src/data/party.js';

/**
 * Register the ep4 pack's battle data (the same idempotent register() functions src/data/ep4/index.js calls, in its ORDER).
 * Not done at import: the Episode 1 to 3 suites import simulate.mjs and walk every ENCOUNTERS and AFFIXES entry (fuzz, data,
 * ep3), so the pack's data is only added by the CLI (attach) and by the Episode 4 tests, as the browser adds it with the pack.
 */
export function registerData() {
  registerEnemies(); registerItems(); registerSkills(); registerLoot(); registerEncounters(); registerShops(); registerAi();
}

export { EP4_ZONE_ORDER };
/** The Episode 4 quick start's EXP (src/data/ep4/start.js EP4_START; the Episode 3 finish is about 5,585). */
export const EP4_START_EXP = EP4_START.exp;

// ------------------------------------------------------------------ loadouts (plan 6.6)
// ep4_flood_road: the foundry_heart row with the First Bell Hammer (Bram's axe) and the Ember Heart (the hero's charm): the
// Episode 4 quick start's party, member for member (src/data/ep4/start.js). Tier 6 weapons are already in that row.
// keep_f1: + two tier 7 pieces (Riverguard Helm on the hero, Scribe's Robe on Mira). keep_f2: + Tidewalker Boots (Bram).
// keep_f3: + two tier 8 pieces (Riverguard Halberd, Charter Rod). keep_crown: + the Barrister's Quill (Mira) and mastery a step up;
// `flags` carry bram_memory_3 (Tempered Oath) everywhere and hero_signed (Answer) at the throne.
const FH = LOADOUTS.foundry_heart;
const M = EP4_START.members;
LOADOUTS.ep4_flood_road = {
  hero: { weapon: 'sword', equip: { ...M.hero.equip }, mastery: { sword: 640, axe: 260 } },
  mira: { weapon: 'staff', equip: { ...M.mira.equip }, mastery: { staff: 500, bow: 240 } },
  bram: { weapon: 'spear', equip: { ...M.bram.equip }, mastery: { spear: 640, axe: 260 } },
  inventory: { ...FH.inventory, quench_flask: 0, lamp_oil: 2 },
  flags: ['bram_memory_3'],
};
const R = LOADOUTS.ep4_flood_road;
LOADOUTS.ep4_keep_f1 = {
  hero: { weapon: 'sword', equip: { ...R.hero.equip, head: 'riverguard_helm' }, mastery: { sword: 680, axe: 270 } },
  mira: { weapon: 'staff', equip: { ...R.mira.equip, body: 'scribes_robe' }, mastery: { staff: 530, bow: 250 } },
  bram: { weapon: 'spear', equip: { ...R.bram.equip }, mastery: { spear: 680, axe: 270 } },
  inventory: { ...R.inventory, lamp_oil: 4 },
  flags: ['bram_memory_3'],
};
const K1 = LOADOUTS.ep4_keep_f1;
LOADOUTS.ep4_keep_f2 = {
  hero: { weapon: 'sword', equip: { ...K1.hero.equip }, mastery: { sword: 720, axe: 280 } },
  mira: { weapon: 'staff', equip: { ...K1.mira.equip }, mastery: { staff: 560, bow: 260 } },
  bram: { weapon: 'spear', equip: { ...K1.bram.equip, boots: 'tidewalker_boots' }, mastery: { spear: 720, axe: 280 } },
  inventory: { ...K1.inventory, lamp_oil: 5 },
  flags: ['bram_memory_3'],
};
const K2 = LOADOUTS.ep4_keep_f2;
LOADOUTS.ep4_keep_f3 = {
  hero: { weapon: 'sword', equip: { ...K2.hero.equip }, mastery: { sword: 760, axe: 290 } },
  mira: { weapon: 'staff', equip: { ...K2.mira.equip, staff: 'charter_rod' }, mastery: { staff: 590, bow: 270 } },
  bram: { weapon: 'spear', equip: { ...K2.bram.equip, spear: 'riverguard_halberd' }, mastery: { spear: 760, axe: 290 } },
  inventory: { ...K2.inventory, lamp_oil: 5 },
  flags: ['bram_memory_3'],
};
const K3 = LOADOUTS.ep4_keep_f3;
LOADOUTS.ep4_keep_crown = {
  hero: { weapon: 'sword', equip: { ...K3.hero.equip }, mastery: { sword: 800, axe: 300 } },
  mira: { weapon: 'staff', equip: { ...K3.mira.equip, charm: 'barristers_quill' }, mastery: { staff: 620, bow: 280 } },
  bram: { weapon: 'spear', equip: { ...K3.bram.equip }, mastery: { spear: 800, axe: 300 } },
  inventory: { ...K3.inventory, lamp_oil: 4, hi_potion: 6 },
  flags: ['bram_memory_3', 'hero_signed'],
};

// ------------------------------------------------------------------ levels and targets
export const SUITE_LEVELS_EP4 = {
  ep4_flood_road: [17, 18], ep4_keep_f1: [18, 19], ep4_keep_f2: [19, 20], ep4_keep_f3: [19, 20], ep4_keep_crown: [20, 21],
};
// The first level is where the plan meets the boss (reckless play is measured there); the second is a full clear's.
export const BOSS_LEVELS_EP4 = { barrister: [19, 20], paper_regent: [20, 21] };
export const TARGETS_EP4 = {
  barrister: { roundsMin: 7, roundsMax: 9, winMin: 0.85, naiveWinMax: 0.6, recklessWorse: 0.10 },
  // answerMin: careful play Answers at least half of the Strikes from the Roll it sees (check() below)
  paper_regent: { roundsMin: 10, roundsMax: 14, winMin: 0.85, naiveWinMax: 0.6, recklessWorse: 0.15, answerMin: 0.5 },
  // Keep F3 is the tightest ordinary floor (as Foundry F3): careful play loses 18 to 24% HP a fight, attack-only wins 70 to 85%
  tightFloor: { zone: 'ep4_keep_f3', hpLoss: [0.18, 0.24], naiveWin: [0.70, 0.85] },
  // Plan 6.1: road 17 -> 18, F1 18 -> 19, F2 19 (near 20), F3 19 -> 20, the Regent at 20 -> 21
  levels: {
    ep4_flood_road: { start: [17, 17], end: [18, 18] },
    ep4_keep_f1: { start: [18, 18], end: [19, 19] },
    ep4_keep_f2: { start: [19, 19], end: [19, 20] },
    ep4_keep_f3: { start: [19, 20], end: [20, 20] },
    ep4_keep_crown: { start: [20, 20], end: [21, 21] },
  },
};

/** Party level through Episode 4 if the player fights `share` of each zone plan (bosses always), from the quick start's EXP. */
export function progression(share = 1) {
  let exp = EP4_START_EXP;
  const rows = [];
  for (const z of EP4_ZONE_ORDER) {
    const startLevel = levelForExp(exp);
    let fights = 0;
    for (const [enc, count] of ZONES[z].plan) {
      const n = ENCOUNTERS[enc].boss ? count : count * share;
      exp += encounterExp(enc) * n; fights += n;
    }
    exp = Math.round(exp);
    rows.push({ zone: z, share, fights: Math.round(fights * 10) / 10, startLevel, endLevel: levelForExp(exp), exp });
  }
  return rows;
}

/** Battle gold along Episode 4 (each plan once, no elites, no chests or sales: a floor), from the quick start's 2,400. */
export function economy4({ startGold = EP4_START.gold } = {}) {
  const zoneGold = (z) => ZONES[z].plan.reduce((g, [enc, n]) => g + ENCOUNTERS[enc].enemies.reduce((s, e) => s + ENEMIES[e].gold, 0) * n, 0);
  let gold = startGold;
  const rows = [];
  for (const z of EP4_ZONE_ORDER) { rows.push({ zone: z, arrive: gold, earned: zoneGold(z) }); gold += zoneGold(z); }
  return { rows, end: gold };
}

const avg = (a) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
const pct = (v) => `${Math.round(v * 100)}%`;

/** Strikes from the Roll announced and Answered (a void of that charge) by careful play, over n seeded fights at `level`. */
export function answerShare(runBattle, { n = 60, level = 20 } = {}) {
  let strikes = 0, answered = 0, named = 0;
  for (let i = 0; i < n; i++) {
    const r = runBattle({ zone: 'ep4_keep_crown', level, encounter: 'paper_regent', seed: 1 + i, policy: 'competent', trace: true });
    for (const ev of r.log) {
      if (ev.type === 'telegraph' && ev.skill === 'strike_roll') strikes++;
      if (ev.type === 'answer' && ev.voided === 'strike_roll') answered++;
      if (ev.type === 'status_add' && ev.status === 'nameless') named++;
    }
  }
  return { strikes, answered, share: strikes ? answered / strikes : 1, named: named / n };
}

/** What checkTargets cannot see for Episode 4 (the rows it gets are runSuite's). Returns failure strings. */
export function check(rows, { runBattle, n = 400, log = null } = {}) {
  const fails = [];
  const T = TARGETS_EP4;
  const ord = rows.filter((r) => !r.elite && ENCOUNTERS[r.encounter] && !ENCOUNTERS[r.encounter].boss);
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
    // the tightest floor: no other Episode 4 floor loses more HP to careful play
    for (const z of EP4_ZONE_ORDER.filter((x) => x !== tf.zone)) {
      const rz = ord.filter((r) => r.zone === z && r.policy === 'competent');
      if (rz.length && avg(rz.map((r) => r.hpLoss)) > hp) fails.push(`${z}: careful HP lost ${pct(avg(rz.map((r) => r.hpLoss)))} is above ${tf.zone}'s ${pct(hp)}`);
    }
    if (log) log(`Keep F3 (tightest floor, Lv ${lv}): careful HP lost ${pct(hp)}, attack-only wins ${nv.length ? pct(avg(nv.map((r) => r.win))) : '-'}`);
  }
  if (runBattle && rows.some((r) => r.encounter === 'paper_regent')) {
    const a = answerShare(runBattle, { n: Math.min(n, 100), level: BOSS_LEVELS_EP4.paper_regent[0] });
    if (log) log(`Paper Regent (Lv ${BOSS_LEVELS_EP4.paper_regent[0]}, careful): ${a.strikes} Strikes from the Roll, ${a.answered} Answered (${pct(a.share)}), Nameless ${a.named.toFixed(2)} a fight`);
    if (a.strikes && a.share < T.paper_regent.answerMin) fails.push(`paper_regent: careful play Answers only ${pct(a.share)} of the Strikes (want >= ${pct(T.paper_regent.answerMin)})`);
  }
  if (log && rows.some((r) => EP4_ZONE_ORDER.includes(r.zone))) {
    const e = economy4();
    log(`Economy (Episode 4, battle gold only): ${e.rows.map((r) => `${r.zone} arrive ${r.arrive} +${r.earned}`).join(', ')}; end ${e.end}`);
  }
  return fails;
}

/**
 * Hook Episode 4 into the simulator's tables (simulate.mjs, once). Adds only new keys; returns { progression, check }.
 */
export function attach({ EPISODES, TARGETS, SUITE_LEVELS, BOSS_LEVELS, BOSS_TARGETS }, { register } = {}) {
  // the simulator's own CLI (simulate.mjs run directly) plays Episode 4; a test that imports simulate.mjs gets none of it
  if (register ?? /simulate\.mjs$/.test(String(process.argv[1] || '').replace(/\\/g, '/'))) registerData();
  if (!EPISODES[4]) EPISODES[4] = EP4_ZONE_ORDER.slice();
  for (const [z, lv] of Object.entries(SUITE_LEVELS_EP4)) if (!SUITE_LEVELS[z]) SUITE_LEVELS[z] = lv;
  for (const [b, lv] of Object.entries(BOSS_LEVELS_EP4)) if (!BOSS_LEVELS[b]) BOSS_LEVELS[b] = lv;
  for (const id of ['barrister', 'paper_regent']) {
    if (!TARGETS[id]) TARGETS[id] = TARGETS_EP4[id];
    if (!BOSS_TARGETS.includes(id)) BOSS_TARGETS.push(id);
  }
  for (const [z, t] of Object.entries(TARGETS_EP4.levels)) if (!TARGETS.levels[z]) TARGETS.levels[z] = t;
  return { progression, check, startExp: EP4_START_EXP };
}
export default attach;
