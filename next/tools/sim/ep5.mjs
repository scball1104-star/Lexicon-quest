// Episode 5 ("The Last Prophecy") for the balance simulator (E5-battle; docs/EPISODE5_PLAN.md 6.6). ADDITIONS ONLY: no Episode 1
// to 4 zone, boss, target or loadout changes meaning.
//
// simulate.mjs calls attach() once at import (one line after Episode 4's) and gets EPISODES[5] = EP5_ZONE_ORDER, the suite and boss
// levels, TARGETS.mirage_knight / .oracle / .levels.ep5_*, BOSS_TARGETS; attach also chains Episode 5 onto the Episode 4 hooks the CLI
// already calls (EP4.progression adds the Episode 5 rows, EP4.check adds check() below: Well F3 as the tightest ordinary floor, careful
// play breaking at least half the Last Prophecies with Turn the Sky, the sky present in every Episode 5 battle).
// registerData() adds the ep4 and ep5 packs' battle data and the simulator's field-hour hook (the hour each zone's map is entered at,
// encounters.js ZONE_HOURS, set before every battle's sky starts). It never imports simulate.mjs (the CLI's top-level await would
// deadlock a cycle).
//
//   node tools/sim/simulate.mjs --episode 5 [--check]       the Episode 5 suite only
//   node tools/sim/simulate.mjs --zone ep5_lab_f3           one zone (tuning)
//   node tools/sim/simulate.mjs --trace oracle 1            one battle's events

import { LOADOUTS } from './loadouts.mjs';
import { registerData as registerEp4 } from './ep4.mjs';
import registerEnemies from '../../src/data/ep5/enemies.js';
import registerItems from '../../src/data/ep5/items.js';
import registerSkills from '../../src/data/ep5/skills.js';
import registerLoot from '../../src/data/ep5/loot.js';
import registerEncounters, { EP5_ZONE_ORDER, ZONE_HOURS } from '../../src/data/ep5/encounters.js';
import registerSky, { setFieldHour } from '../../src/data/ep5/sky.js';
import registerShops from '../../src/data/ep5/shops.js';
import registerAi from '../../src/data/ep5/ai.js';
import { EP5_START } from '../../src/data/ep5/start.js';
import { RULE_EXT } from '../../src/battle/rules.js';
import { ENCOUNTERS, ZONES, encounterExp } from '../../src/data/encounters.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { levelForExp } from '../../src/data/party.js';

/** The simulator's stand-in for the field (E5-world calls setFieldHour in the game): each battle starts at its zone's hour. */
export const SIM_HOUR = { id: 'ep5_sim_hour', start(ctx) { setFieldHour(ZONE_HOURS[ctx.state.options.zone] || null); } };

/**
 * Register the ep4 and ep5 packs' battle data (the same idempotent register() functions the pack entries call, in their ORDER)
 * and the field-hour hook, ahead of the sky. Not done at import, as ep4.mjs: the Episode 1 to 4 suites never see it.
 */
export function registerData() {
  registerEp4();
  registerEnemies(); registerItems(); registerSkills(); registerLoot(); registerEncounters(); registerSky(); registerShops(); registerAi();
  if (!RULE_EXT.includes(SIM_HOUR)) RULE_EXT.unshift(SIM_HOUR);
}

export { EP5_ZONE_ORDER };
/** The Episode 5 quick start's EXP (src/data/ep5/start.js EP5_START). */
export const EP5_START_EXP = EP5_START.exp;

// ------------------------------------------------------------------ loadouts (plan 6.6)
// ep5_ship: the Episode 5 quick start's party, member for member (src/data/ep5/start.js EP5_START: the ep4_keep_crown row plus The
// Broken Seal and the Tidewarden's Trident on Bram; qa/core/ep5_pack.test.mjs holds the two equal). The plan's "two tier 8 pieces"
// are not in the quick start, so they are not here either: Episode 5 is tuned for the weaker party. Road: the same (Saffron
// Haven's shops come after it), plus Hourglass Sand from Omar. lab_f1: + two tier 9 pieces (Dunewalker Mail on the hero,
// Starweave Robe on Mira) and Turn the Sky (sky_learned, the star reading). lab_f2: + Nomad Wraps (Mira's boots). lab_f3: + two
// tier 10 pieces (Copperwind Sword, Armillary Rod). The Oracle: + Horizon Glass (the hero's charm) and mastery a step up.
const M = EP5_START.members;
const BASE_INV = { potion: 6, hi_potion: 8, hi_ether: 5, phoenix_feather: 3, silver_salve: 3, ether: 2, eye_drops: 2, echo_herb: 2 };
const row = (id, equip, mastery) => ({ weapon: M[id].weapon, equip: { ...M[id].equip, ...equip }, mastery });
const MAST = (s) => ({
  hero: { sword: 800 + 40 * s, axe: 300 + 10 * s }, mira: { staff: 620 + 30 * s, bow: 280 + 10 * s }, bram: { spear: 800 + 40 * s, axe: 300 + 10 * s } });
const FLAGS = ['bram_memory_3', 'hero_signed'];
const SKY = [...FLAGS, 'sky_learned'];
LOADOUTS.ep5_ship = {
  hero: row('hero', {}, MAST(0).hero), mira: row('mira', {}, MAST(0).mira), bram: row('bram', {}, MAST(0).bram),
  inventory: { ...BASE_INV }, flags: FLAGS,
};
LOADOUTS.ep5_caravan_road = {
  hero: row('hero', {}, MAST(0).hero), mira: row('mira', {}, MAST(0).mira), bram: row('bram', {}, MAST(0).bram),
  inventory: { ...BASE_INV, hourglass_sand: 2 }, flags: FLAGS,
};
const T9 = { hero: { body: 'dunewalker_mail' }, mira: { body: 'starweave_robe' }, bram: {} };
LOADOUTS.ep5_lab_f1 = {
  hero: row('hero', T9.hero, MAST(1).hero), mira: row('mira', T9.mira, MAST(1).mira), bram: row('bram', T9.bram, MAST(1).bram),
  inventory: { ...BASE_INV, hourglass_sand: 3 }, flags: SKY,
};
const F2 = { hero: T9.hero, mira: { ...T9.mira, boots: 'nomad_wraps' }, bram: T9.bram };
LOADOUTS.ep5_lab_f2 = {
  hero: row('hero', F2.hero, MAST(2).hero), mira: row('mira', F2.mira, MAST(2).mira), bram: row('bram', F2.bram, MAST(2).bram),
  inventory: { ...BASE_INV, hourglass_sand: 3 }, flags: SKY,
};
const F3 = { hero: { ...F2.hero, sword: 'copperwind_sword' }, mira: { ...F2.mira, staff: 'armillary_rod' }, bram: F2.bram };
LOADOUTS.ep5_lab_f3 = {
  hero: row('hero', F3.hero, MAST(3).hero), mira: row('mira', F3.mira, MAST(3).mira), bram: row('bram', F3.bram, MAST(3).bram),
  inventory: { ...BASE_INV, hourglass_sand: 4 }, flags: SKY,
};
const OR = { hero: { ...F3.hero, charm: 'horizon_glass' }, mira: F3.mira, bram: F3.bram };
LOADOUTS.ep5_lab_oracle = {
  hero: row('hero', OR.hero, MAST(4).hero), mira: row('mira', OR.mira, MAST(4).mira), bram: row('bram', OR.bram, MAST(4).bram),
  inventory: { ...BASE_INV, hourglass_sand: 4 }, flags: SKY,
};

// ------------------------------------------------------------------ levels and targets
export const SUITE_LEVELS_EP5 = {
  ep5_ship: [21], ep5_caravan_road: [21, 22], ep5_lab_f1: [22, 23], ep5_lab_f2: [23, 24], ep5_lab_f3: [23, 24], ep5_lab_oracle: [24, 25],
};
// The first level is where the plan meets the boss (reckless play is measured there); the second is a full clear's.
export const BOSS_LEVELS_EP5 = { mirage_knight: [23, 24], oracle: [24, 25] };
export const TARGETS_EP5 = {
  // #87 (2026-11-11): both bosses lost HP and gained ATK/MAG/SPD (BATTLE.md 15); hpLossMin pins it, the Oracle's band moved down
  mirage_knight: { roundsMin: 6, roundsMax: 9, winMin: 0.85, naiveWinMax: 0.6, recklessWorse: 0.10, hpLossMin: 0.17 },
  // breakMin: careful play breaks at least half the Last Prophecies it sees with Turn the Sky (check() below)
  oracle: { roundsMin: 10, roundsMax: 13, winMin: 0.85, naiveWinMax: 0.6, recklessWorse: 0.15, breakMin: 0.5, hpLossMin: 0.22 },
  // Well F3 is the tightest ordinary floor (as Foundry F3 and Keep F3): careful play loses 18 to 24% HP, attack-only wins 70 to 85%
  tightFloor: { zone: 'ep5_lab_f3', hpLoss: [0.18, 0.24], naiveWin: [0.70, 0.85] },
  // Plan 6.1: ship 21, road 21 -> 22, F1 22 -> 23, F2 23 (near 24), F3 23 to 24 -> 24, the Oracle at 24 -> 25
  levels: {
    ep5_ship: { start: [21, 21], end: [21, 21] },
    ep5_caravan_road: { start: [21, 21], end: [22, 22] },
    ep5_lab_f1: { start: [22, 22], end: [23, 23] },
    ep5_lab_f2: { start: [23, 23], end: [23, 24] },
    ep5_lab_f3: { start: [23, 24], end: [24, 24] },
    ep5_lab_oracle: { start: [24, 24], end: [25, 25] },
  },
};

/** Party level through Episode 5 if the player fights `share` of each zone plan (bosses always), from the quick start's EXP. */
export function progression(share = 1) {
  let exp = EP5_START_EXP;
  const rows = [];
  for (const z of EP5_ZONE_ORDER) {
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

/** Battle gold along Episode 5 (each plan once, no elites, no chests or sales: a floor), from the quick start's 3,200. */
export function economy5({ startGold = EP5_START.gold } = {}) {
  const zoneGold = (z) => ZONES[z].plan.reduce((g, [enc, n]) => g + ENCOUNTERS[enc].enemies.reduce((s, e) => s + ENEMIES[e].gold, 0) * n, 0);
  let gold = startGold;
  const rows = [];
  for (const z of EP5_ZONE_ORDER) { rows.push({ zone: z, arrive: gold, earned: zoneGold(z) }); gold += zoneGold(z); }
  return { rows, end: gold };
}

const avg = (a) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
const pct = (v) => `${Math.round(v * 100)}%`;

/**
 * The Last Prophecies careful play sees and how each ended, over n seeded fights at `level`: broken by Turn the Sky, held off and
 * broken by a Break, or fallen (Starless). Also the Turns, Turn the Sky casts and Hourglass Sand used per fight.
 */
export function prophecyShare(runBattle, { n = 60, level = 24, policy = 'competent' } = {}) {
  let read = 0, turned = 0, broke = 0, fell = 0, casts = 0, sand = 0, turns = 0, wins = 0;
  for (let i = 0; i < n; i++) {
    const r = runBattle({ zone: 'ep5_lab_oracle', level, encounter: 'oracle', seed: 1 + i, policy, trace: true });
    if (r.win) wins++;
    for (const ev of r.log) {
      if (ev.type === 'foretell' && !ev.moved) read++;
      if (ev.type === 'foretell_broken' && ev.reason === 'turned') turned++;
      if (ev.type === 'foretell_broken' && ev.reason === 'break') broke++;
      if (ev.type === 'foretell_fall') fell++;
      if (ev.type === 'sky_turn') { turns++; if (!ev.natural) casts++; }
      if (ev.type === 'message' && ev.kind === 'sky_hold') sand++;
    }
  }
  return { read: read / n, share: read ? turned / read : 1, broke: read ? broke / read : 0, fell: read ? fell / read : 0,
    casts: casts / n, sand: sand / n, turns: turns / n, win: wins / n };
}

/** Every Episode 5 encounter opens with a sky (plan 6.3: "every desert battle"). Returns the ids that did not. */
export function skyless(runBattle) {
  const out = [];
  for (const z of EP5_ZONE_ORDER) for (const [enc] of ZONES[z].plan) {
    const r = runBattle({ zone: z, level: ZONES[z].level[0], encounter: enc, seed: 1, trace: true });
    if (!r.log.some((ev) => ev.type === 'sky' && ev.reason === 'start')) out.push(enc);
  }
  return out;
}

/** What checkTargets cannot see for Episode 5 (the rows it gets are runSuite's). Returns failure strings. */
export function check(rows, { runBattle, n = 400, log = null } = {}) {
  const fails = [];
  const T = TARGETS_EP5;
  const mine = rows.filter((r) => EP5_ZONE_ORDER.includes(r.zone));
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
    for (const z of EP5_ZONE_ORDER.filter((x) => x !== tf.zone)) {
      const rz = ord.filter((r) => r.zone === z && r.policy === 'competent');
      if (rz.length && avg(rz.map((r) => r.hpLoss)) > hp) fails.push(`${z}: careful HP lost ${pct(avg(rz.map((r) => r.hpLoss)))} is above ${tf.zone}'s ${pct(hp)}`);
    }
    if (log) log(`Well F3 (tightest floor, Lv ${lv}): careful HP lost ${pct(hp)}, attack-only wins ${nv.length ? pct(avg(nv.map((r) => r.win))) : '-'}`);
  }
  if (runBattle) {
    const none = skyless(runBattle);
    if (none.length) fails.push(`Episode 5 battles without a sky: ${none.join(', ')}`);
  }
  if (runBattle && mine.some((r) => r.encounter === 'oracle')) {
    const lv = BOSS_LEVELS_EP5.oracle[0];
    const a = prophecyShare(runBattle, { n: Math.min(n, 100), level: lv });
    if (log) log(`Sand Oracle (Lv ${lv}, careful): ${a.read.toFixed(2)} Last Prophecies a fight; ${pct(a.share)} broken by Turn the Sky, `
      + `${pct(a.broke)} by a Break, ${pct(a.fell)} fell; ${a.casts.toFixed(2)} Turn the Sky, ${a.sand.toFixed(2)} Hourglass Sand, ${a.turns.toFixed(2)} Turns a fight`);
    if (a.read && a.share < T.oracle.breakMin) fails.push(`oracle: careful play breaks only ${pct(a.share)} of the Last Prophecies with Turn the Sky (want >= ${pct(T.oracle.breakMin)})`);
  }
  if (log) {
    const e = economy5();
    log(`Economy (Episode 5, battle gold only): ${e.rows.map((r) => `${r.zone} arrive ${r.arrive} +${r.earned}`).join(', ')}; end ${e.end}`);
  }
  return fails;
}

/**
 * Hook Episode 5 into the simulator's tables (simulate.mjs, once). Adds only new keys, and chains its progression and check onto
 * the Episode 4 hooks the CLI calls (`EP4`). Returns { progression, check, startExp }.
 */
export function attach({ EPISODES, TARGETS, SUITE_LEVELS, BOSS_LEVELS, BOSS_TARGETS, EP4 = null }, { register } = {}) {
  if (register ?? /simulate\.mjs$/.test(String(process.argv[1] || '').replace(/\\/g, '/'))) registerData();
  if (!EPISODES[5]) EPISODES[5] = EP5_ZONE_ORDER.slice();
  for (const [z, lv] of Object.entries(SUITE_LEVELS_EP5)) if (!SUITE_LEVELS[z]) SUITE_LEVELS[z] = lv;
  for (const [b, lv] of Object.entries(BOSS_LEVELS_EP5)) if (!BOSS_LEVELS[b]) BOSS_LEVELS[b] = lv;
  for (const id of ['mirage_knight', 'oracle']) {
    if (!TARGETS[id]) TARGETS[id] = TARGETS_EP5[id];
    if (!BOSS_TARGETS.includes(id)) BOSS_TARGETS.push(id);
  }
  for (const [z, t] of Object.entries(TARGETS_EP5.levels)) if (!TARGETS.levels[z]) TARGETS.levels[z] = t;
  if (EP4 && !EP4.ep5) {
    const p4 = EP4.progression, c4 = EP4.check;
    EP4.progression = (share = 1) => [...p4(share), ...progression(share)];
    EP4.check = (rows, o = {}) => [...c4(rows, o), ...check(rows, o)];
    EP4.ep5 = true;
  }
  return { progression, check, startExp: EP5_START_EXP };
}
export default attach;
