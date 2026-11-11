// Episode 6 ("The Skybound Isles") for the balance simulator (E6-battle; docs/EPISODE6_PLAN.md 6.6). ADDITIONS ONLY: no Episode 1
// to 5 zone, boss, target or loadout changes meaning.
//
// simulate.mjs calls attach() once at import (one line after Episode 5's) and gets EPISODES[6] = EP6_ZONE_ORDER, the suite and boss
// levels, TARGETS.gale_engine / .scribe / .levels.ep6_*, BOSS_TARGETS; attach also chains Episode 6 onto the Episode 4 hooks the CLI
// already calls (EP4.progression adds the Episode 6 rows, EP4.check adds check() below: the Eye of the Storm as the tightest
// ordinary floor, careful play breaking at least half the Rewrites with Anchor, the Gale in every Episode 6 battle, and every fight
// before the Scribe staying under Lv 28's 16,887 EXP). registerData() adds the ep4, ep5 and ep6 packs' battle data. It never
// imports simulate.mjs (the CLI's top-level await would deadlock a cycle).
//
//   node tools/sim/simulate.mjs --episode 6 [--check]       the Episode 6 suite only
//   node tools/sim/simulate.mjs --zone ep6_obs_f3           one zone (tuning)
//   node tools/sim/simulate.mjs --trace scribe 1            one battle's events

import { LOADOUTS } from './loadouts.mjs';
import { registerData as registerEp5 } from './ep5.mjs';
import registerEnemies from '../../src/data/ep6/enemies.js';
import registerItems from '../../src/data/ep6/items.js';
import registerSkills from '../../src/data/ep6/skills.js';
import registerLoot from '../../src/data/ep6/loot.js';
import registerEncounters, { EP6_ZONE_ORDER } from '../../src/data/ep6/encounters.js';
import registerGale from '../../src/data/ep6/gale.js';
import registerShops from '../../src/data/ep6/shops.js';
import registerAi from '../../src/data/ep6/ai.js';
import { ENCOUNTERS, ZONES, encounterExp } from '../../src/data/encounters.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { levelForExp, expForLevel } from '../../src/data/party.js';

/**
 * Register the ep4, ep5 and ep6 packs' battle data (the same idempotent register() functions the pack entries call). Not done at
 * import, as ep4.mjs and ep5.mjs: the Episode 1 to 5 suites never see it unless run from the CLI.
 */
export function registerData() {
  registerEp5();
  registerEnemies(); registerItems(); registerSkills(); registerLoot(); registerEncounters(); registerGale(); registerShops(); registerAi();
}

export { EP6_ZONE_ORDER };
/**
 * The Episode 6 quick start's EXP and gold (plan 6.1: 13,300 EXP, Lv 25). E6-pack's src/data/ep6/start.js (EP6_START) is read when
 * it exists; until then the plan's numbers stand in.
 */
let START = { exp: 13300, gold: 3600 };
try {
  const m = await import('../../src/data/ep6/start.js');
  if (m && m.EP6_START && m.EP6_START.exp) START = { exp: m.EP6_START.exp, gold: m.EP6_START.gold ?? START.gold };
} catch { /* not written yet (wave 6a): the plan's numbers */ }
export const EP6_START_EXP = START.exp;
export const EP6_START_GOLD = START.gold;
/** The Scribe must be met under this (Lv 28): 100% of the fights before it stay below (plan 6.1). */
export const LV28_EXP = expForLevel(28);

// ------------------------------------------------------------------ loadouts (plan 6.6)
// ep6_airstair: the ep5_lab_oracle loadout plus the Oracle's Mask (Mira's charm), Sel's Caravan Compass (Bram's charm) and two tier
// 10 pieces (Sunplate Mail on Bram, Sunplate Helm on the hero). F1: + two tier 11 pieces (Skysteel Mail on the hero, Windweave Robe
// on Mira) and Anchor (anchor_learned, the anchor lesson in town). F2: + Skyhand Boots (Bram). F3: + two tier 12 pieces (Galewing
// Sword, Compass Rod). The Scribe: + Bellows Heart (the hero's charm) and mastery a step up. Ballast Stones from Bennet and Nova.
const O = LOADOUTS.ep5_lab_oracle;
const BASE_INV = { potion: 6, hi_potion: 8, hi_ether: 5, phoenix_feather: 3, silver_salve: 3, ether: 2, eye_drops: 2, echo_herb: 2 };
const MAST = (s) => ({
  hero: { sword: 800 + 40 * s, axe: 300 + 10 * s }, mira: { staff: 620 + 30 * s, bow: 280 + 10 * s }, bram: { spear: 800 + 40 * s, axe: 300 + 10 * s } });
const row = (id, equip, s) => ({ weapon: O[id].weapon, equip: { ...O[id].equip, ...equip }, mastery: MAST(s)[id] });
const FLAGS = [...(O.flags || [])];
const ANCHOR_FLAGS = [...FLAGS, 'anchor_learned'];
const A = { hero: { head: 'sunplate_helm' }, mira: { charm: 'oracle_mask' }, bram: { body: 'sunplate_mail', charm: 'caravan_compass' } };
LOADOUTS.ep6_airstair = {
  hero: row('hero', A.hero, 5), mira: row('mira', A.mira, 5), bram: row('bram', A.bram, 5),
  inventory: { ...BASE_INV, ballast_stone: 2 }, flags: FLAGS,
};
const F1 = { hero: { ...A.hero, body: 'skysteel_mail' }, mira: { ...A.mira, body: 'windweave_robe' }, bram: A.bram };
LOADOUTS.ep6_obs_f1 = {
  hero: row('hero', F1.hero, 6), mira: row('mira', F1.mira, 6), bram: row('bram', F1.bram, 6),
  inventory: { ...BASE_INV, ballast_stone: 3 }, flags: ANCHOR_FLAGS,
};
const F2 = { hero: F1.hero, mira: F1.mira, bram: { ...F1.bram, boots: 'skyhand_boots' } };
LOADOUTS.ep6_obs_f2 = {
  hero: row('hero', F2.hero, 7), mira: row('mira', F2.mira, 7), bram: row('bram', F2.bram, 7),
  inventory: { ...BASE_INV, ballast_stone: 3 }, flags: ANCHOR_FLAGS,
};
const F3 = { hero: { ...F2.hero, sword: 'galewing_sword' }, mira: { ...F2.mira, staff: 'compass_rod' }, bram: F2.bram };
LOADOUTS.ep6_obs_f3 = {
  hero: row('hero', F3.hero, 8), mira: row('mira', F3.mira, 8), bram: row('bram', F3.bram, 8),
  inventory: { ...BASE_INV, ballast_stone: 4 }, flags: ANCHOR_FLAGS,
};
const SC = { hero: { ...F3.hero, charm: 'bellows_heart' }, mira: F3.mira, bram: F3.bram };
LOADOUTS.ep6_obs_eyrie = {
  hero: row('hero', SC.hero, 9), mira: row('mira', SC.mira, 9), bram: row('bram', SC.bram, 9),
  inventory: { ...BASE_INV, ballast_stone: 4 }, flags: ANCHOR_FLAGS,
};

// ------------------------------------------------------------------ levels and targets
export const SUITE_LEVELS_EP6 = {
  ep6_airstair: [25], ep6_obs_f1: [25, 26], ep6_obs_f2: [26, 27], ep6_obs_f3: [27], ep6_obs_eyrie: [27, 28],
};
// The first level is where the plan meets the boss (reckless play is measured there); the second is a full clear's and the Continue
// arrival's (BATTLE 13.7: a save that fought every placed foe arrives a level up).
export const BOSS_LEVELS_EP6 = { gale_engine: [26, 27], scribe: [27, 28] };
export const TARGETS_EP6 = {
  // #87 (2026-11-11): both bosses lost HP and gained ATK/MAG/SPD (BATTLE.md 15); hpLossMin pins it, the Scribe's band moved down
  gale_engine: { roundsMin: 7, roundsMax: 9, winMin: 0.85, naiveWinMax: 0.6, recklessWorse: 0.10, hpLossMin: 0.14 },
  // anchorMin: careful play breaks at least half the Rewrites it sees with Anchor (check() below)
  scribe: { roundsMin: 11, roundsMax: 14, winMin: 0.85, naiveWinMax: 0.6, recklessWorse: 0.15, anchorMin: 0.5, hpLossMin: 0.17 },
  // the Eye of the Storm is the tightest ordinary floor: careful play loses 18 to 24% HP, attack-only wins 70 to 85%
  tightFloor: { zone: 'ep6_obs_f3', hpLoss: [0.18, 0.24], naiveWin: [0.70, 0.85] },
  // Plan 6.1: the Airstair 25, F1 25 -> 26, F2 26 -> 27 (just), F3 27, the Scribe at 27 -> 28
  levels: {
    ep6_airstair: { start: [25, 25], end: [25, 25] },
    ep6_obs_f1: { start: [25, 25], end: [26, 26] },
    ep6_obs_f2: { start: [26, 26], end: [27, 27] },
    ep6_obs_f3: { start: [27, 27], end: [27, 27] },
    ep6_obs_eyrie: { start: [27, 27], end: [28, 28] },
  },
};

/** Party level through Episode 6 if the player fights `share` of each zone plan (bosses always), from the quick start's EXP. */
export function progression(share = 1) {
  let exp = EP6_START_EXP;
  const rows = [];
  for (const z of EP6_ZONE_ORDER) {
    const startLevel = levelForExp(exp);
    const before = exp;
    let fights = 0;
    for (const [enc, count] of ZONES[z].plan) {
      const n = ENCOUNTERS[enc].boss ? count : count * share;
      exp += encounterExp(enc) * n; fights += n;
    }
    exp = Math.round(exp);
    rows.push({ zone: z, share, fights: Math.round(fights * 10) / 10, startLevel, endLevel: levelForExp(exp), exp, before });
  }
  return rows;
}
/** EXP on reaching the Scribe at `share` of the fights, and its margin under Lv 28. */
export function scribeMargin(share = 1) {
  const r = progression(share).find((x) => x.zone === 'ep6_obs_eyrie');
  return { exp: r.before, margin: LV28_EXP - r.before, level: r.startLevel };
}

/** Battle gold along Episode 6 (each plan once, no elites, no chests or sales: a floor), from the quick start's gold. */
export function economy6({ startGold = EP6_START_GOLD } = {}) {
  const zoneGold = (z) => ZONES[z].plan.reduce((g, [enc, n]) => g + ENCOUNTERS[enc].enemies.reduce((s, e) => s + ENEMIES[e].gold, 0) * n, 0);
  let gold = startGold;
  const rows = [];
  for (const z of EP6_ZONE_ORDER) { rows.push({ zone: z, arrive: gold, earned: zoneGold(z) }); gold += zoneGold(z); }
  return { rows, end: gold };
}

const avg = (a) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
const pct = (v) => `${Math.round(v * 100)}%`;

/**
 * The pinned moves careful play sees in one boss fight and how each ended, over n seeded fights at `level`: broken by Anchor, by a
 * Break, or landed. Also the Gusts, the Anchors cast and the Ballast Stones used per fight.
 */
export function rewriteShare(runBattle, { n = 60, level = 27, policy = 'competent', encounter = 'scribe' } = {}) {
  let pinned = 0, anchored = 0, broke = 0, landed = 0, gone = 0, gusts = 0, anchors = 0, ballast = 0, wins = 0;
  const zone = ENCOUNTERS[encounter].zone;
  for (let i = 0; i < n; i++) {
    const r = runBattle({ zone, level, encounter, seed: 1 + i, policy, trace: true });
    if (r.win) wins++;
    for (const ev of r.log) {
      if (ev.type === 'rewrite' && !ev.moved) pinned++;
      if (ev.type === 'rewrite_broken' && ev.reason === 'anchor') anchored++;
      if (ev.type === 'rewrite_broken' && ev.reason === 'break') broke++;
      if (ev.type === 'rewrite_broken' && ev.reason === 'gone') gone++;
      if (ev.type === 'rewrite_land') landed++;
      if (ev.type === 'gust') gusts++;
      if (ev.type === 'anchored' && ev.on) anchors++;
      if (ev.type === 'braced' && ev.on && ev.by === 'ballast') ballast++;
    }
  }
  return { pinned: pinned / n, share: pinned ? anchored / pinned : 1, broke: pinned ? broke / pinned : 0, landed: pinned ? landed / pinned : 0,
    gone: pinned ? gone / pinned : 0, gusts: gusts / n, anchors: anchors / n, ballast: ballast / n, win: wins / n };
}

/** Every Episode 6 encounter opens with a Gale (plan 6.3: "every isle battle"). Returns the ids that did not. */
export function galeless(runBattle) {
  const out = [];
  for (const z of EP6_ZONE_ORDER) for (const [enc] of ZONES[z].plan) {
    const r = runBattle({ zone: z, level: ZONES[z].level[0], encounter: enc, seed: 1, trace: true });
    if (!r.log.some((ev) => ev.type === 'gale' && ev.reason === 'start')) out.push(enc);
  }
  return out;
}

/** What checkTargets cannot see for Episode 6 (the rows it gets are runSuite's). Returns failure strings. */
export function check(rows, { runBattle, n = 400, log = null } = {}) {
  const fails = [];
  const T = TARGETS_EP6;
  const mine = rows.filter((r) => EP6_ZONE_ORDER.includes(r.zone));
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
    for (const z of EP6_ZONE_ORDER.filter((x) => x !== tf.zone)) {
      const rz = ord.filter((r) => r.zone === z && r.policy === 'competent');
      if (rz.length && avg(rz.map((r) => r.hpLoss)) > hp) fails.push(`${z}: careful HP lost ${pct(avg(rz.map((r) => r.hpLoss)))} is above ${tf.zone}'s ${pct(hp)}`);
    }
    if (log) log(`Eye of the Storm (tightest floor, Lv ${lv}): careful HP lost ${pct(hp)}, attack-only wins ${nv.length ? pct(avg(nv.map((r) => r.win))) : '-'}`);
  }
  const m = scribeMargin(1);
  if (m.margin <= 0) fails.push(`progression: every fight reaches the Scribe with ${m.exp} EXP, at or over Lv 28's ${LV28_EXP}`);
  if (log) log(`Episode 6 EXP: the Scribe met with ${m.exp} EXP at 100% of the fights (Lv ${m.level}, ${m.margin} under Lv 28), `
    + `${scribeMargin(0.8).exp} at 80% (Lv ${scribeMargin(0.8).level})`);
  if (runBattle) {
    const none = galeless(runBattle);
    if (none.length) fails.push(`Episode 6 battles without a Gale: ${none.join(', ')}`);
  }
  if (runBattle && mine.some((r) => r.encounter === 'scribe')) {
    const lv = BOSS_LEVELS_EP6.scribe[0];
    const a = rewriteShare(runBattle, { n: Math.min(n, 100), level: lv });
    if (log) log(`Storm Scribe (Lv ${lv}, careful): ${a.pinned.toFixed(2)} Rewrites a fight; ${pct(a.share)} broken by Anchor, `
      + `${pct(a.broke)} by a Break, ${pct(a.landed)} landed; ${a.anchors.toFixed(2)} Anchors, ${a.ballast.toFixed(2)} Ballast Stones, ${a.gusts.toFixed(2)} Gusts a fight`);
    if (a.pinned && a.share < T.scribe.anchorMin) fails.push(`scribe: careful play breaks only ${pct(a.share)} of the Rewrites with Anchor (want >= ${pct(T.scribe.anchorMin)})`);
  }
  if (runBattle && log && mine.some((r) => r.encounter === 'gale_engine')) {
    const a = rewriteShare(runBattle, { n: Math.min(n, 100), level: BOSS_LEVELS_EP6.gale_engine[0], encounter: 'gale_engine' });
    log(`Gale Engine (Lv ${BOSS_LEVELS_EP6.gale_engine[0]}, careful): ${a.pinned.toFixed(2)} Full Blasts a fight; ${pct(a.share)} broken by Anchor, `
      + `${pct(a.broke)} by a Break, ${pct(a.landed)} landed; ${a.anchors.toFixed(2)} Anchors, ${a.gusts.toFixed(2)} Gusts a fight`);
  }
  if (log) {
    const e = economy6();
    log(`Economy (Episode 6, battle gold only): ${e.rows.map((r) => `${r.zone} arrive ${r.arrive} +${r.earned}`).join(', ')}; end ${e.end}`);
  }
  return fails;
}

/**
 * Hook Episode 6 into the simulator's tables (simulate.mjs, once). Adds only new keys, and chains its progression and check onto
 * the Episode 4 hooks the CLI calls (`EP4`, which Episode 5 already chains onto). Returns { progression, check, startExp }.
 */
export function attach({ EPISODES, TARGETS, SUITE_LEVELS, BOSS_LEVELS, BOSS_TARGETS, EP4 = null }, { register } = {}) {
  if (register ?? /simulate\.mjs$/.test(String(process.argv[1] || '').replace(/\\/g, '/'))) registerData();
  if (!EPISODES[6]) EPISODES[6] = EP6_ZONE_ORDER.slice();
  for (const [z, lv] of Object.entries(SUITE_LEVELS_EP6)) if (!SUITE_LEVELS[z]) SUITE_LEVELS[z] = lv;
  for (const [b, lv] of Object.entries(BOSS_LEVELS_EP6)) if (!BOSS_LEVELS[b]) BOSS_LEVELS[b] = lv;
  for (const id of ['gale_engine', 'scribe']) {
    if (!TARGETS[id]) TARGETS[id] = TARGETS_EP6[id];
    if (!BOSS_TARGETS.includes(id)) BOSS_TARGETS.push(id);
  }
  for (const [z, t] of Object.entries(TARGETS_EP6.levels)) if (!TARGETS.levels[z]) TARGETS.levels[z] = t;
  if (EP4 && !EP4.ep6) {
    const p4 = EP4.progression, c4 = EP4.check;
    EP4.progression = (share = 1) => [...p4(share), ...progression(share)];
    EP4.check = (rows, o = {}) => [...c4(rows, o), ...check(rows, o)];
    EP4.ep6 = true;
  }
  return { progression, check, startExp: EP6_START_EXP };
}
export default attach;
