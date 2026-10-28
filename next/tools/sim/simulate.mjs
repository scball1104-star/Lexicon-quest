// Balance simulator: plays thousands of deterministic battles per zone with a competent policy
// (uses weaknesses, heals at 40%, answers telegraphs), a reckless one (competent but ignores
// telegraphs) and a naive one (attack only), at the expected level and gear for each zone.
//
//   node tools/sim/simulate.mjs                 full report (400 battles per encounter and policy)
//   node tools/sim/simulate.mjs --n 100         fewer battles
//   node tools/sim/simulate.mjs --zone valley   one zone (valley | archive_f1 | archive_f2 | archive_f3 | archive_boss
//                                               | whisperwood_hollow, the optional side dungeon; included by default
//                                               | Episode 2: east_road | court_f1 | court_f2 | court_f3 | court_throne
//                                               | Episode 3: sand_road | foundry_f1 | foundry_f2 | foundry_f3 | foundry_heart
//                                               | Episode 1 expansion: x1_downs | x1_highmoor | x1_barrow | x1_larchhill | x1_millrace
//                                               |   x1_terrace | x1_cellar | x1_culvert; ledger: node tools/sim/optional_exp.mjs)
//   node tools/sim/simulate.mjs --episode 2     one episode (1 = Episode 1 and Whisperwood, 2 = Episode 2, 3 = Episode 3)
//   node tools/sim/simulate.mjs --check         exit 1 if a target is missed (also runs the route, economy and optional-EXP checks)
//   node tools/sim/simulate.mjs --json          also write tools/sim/out/sim.json
//   node tools/sim/simulate.mjs --trace enc seed policy   print one battle's events
//   node tools/sim/simulate.mjs --cave [--check]        the Deep Stacks descent instead (tools/sim/cave.mjs: 50 seeds, B1 to B100)
//   node tools/sim/simulate.mjs --tier 1 [--check]      Fine Print, the post-credits tier (tools/sim/tier.mjs, docs/TIER.md)
//
// Also importable: runSuite(), checkTargets(), progression(), LOADOUTS, TARGETS.

import { createBattle, makeRng } from '../../src/battle/rules.js';
import { partyAction } from '../../src/battle/ai.js';
import { newMember, expForLevel, levelForExp } from '../../src/data/party.js';
import { ENCOUNTERS, ZONES, ZONE_ORDER, OPTIONAL_ZONES, EP2_ZONE_ORDER, EP3_ZONE_ORDER, rollEncounter, encounterExp } from '../../src/data/encounters.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { ITEMS } from '../../src/data/items.js';
import { SHOPS } from '../../src/data/shops.js';

import { LOADOUTS, ALPHA_TIER_RUNS, knownBestiary } from './loadouts.mjs';
export { LOADOUTS, ALPHA_TIER_RUNS, knownBestiary };
// Expansion registry (EXPANSION_RECONCILIATION.md 1, EXPANSION1_PLAN.md 7.5): one import and one list entry per episode pack.
// Episode 2's x2.mjs joins here with `import { SIM_EXTENSION as X2 } from './x2.mjs';` and `X2` appended to EXTENSIONS.
import { SIM_EXTENSION as X1 } from './x1.mjs';
const EXTENSIONS = [X1];

// ------------------------------------------------------------------ targets (DESIGN 7 + brief)
export const TARGETS = {
  ordinary: { roundsMin: 3, roundsMax: 5, winMin: 0.97, hpLossMax: 0.5, naiveWorse: 1.2 },
  echo_warden: { roundsMin: 6, roundsMax: 8, winMin: 0.9 },
  archivore: { roundsMin: 8, roundsMax: 12, winMin: 0.85, naiveWinMax: 0.6, recklessWorse: 0.15 },
  // W6-content: the Briar Alpha (Whisperwood Hollow mini-boss) at Lv 6-7; naive play (attack only) loses often.
  whisperwood_alpha: { roundsMin: 6, roundsMax: 9, winMin: 0.85, naiveWinMax: 0.6 },
  // Episode 2 (EPISODE2_PLAN.md 6.4, 6.5, 6.8). keptMax: careful play averages one Kept member or fewer per fight.
  other_selves: { roundsMin: 7, roundsMax: 9, winMin: 0.85, naiveWinMax: 0.6, recklessWorse: 0.10 },
  nameless_king: { roundsMin: 9, roundsMax: 13, winMin: 0.85, naiveWinMax: 0.6, recklessWorse: 0.15, keptMax: 1, winMinAt: { 12: 0.9 } },
  // Episode 3 (EPISODE3_PLAN.md 6.6). The Specter: 7 to 9 rounds, careful play wins, ignoring the telegraph costs 10 points.
  // The Warden: 9 to 13 rounds, careful play turns at least half the Last Hammers with Tempered Oath (oathMin). Foundry F3
  // is the tightest ordinary floor (PLAYTEST_REVIEW_4 fix 8): careful play loses 18 to 24% HP a fight, attack-only wins
  // 70 to 85% (zone averages).
  bellows_specter: { roundsMin: 7, roundsMax: 9, winMin: 0.85, naiveWinMax: 0.6, recklessWorse: 0.10 },
  cinder_warden: { roundsMin: 9, roundsMax: 13, winMin: 0.85, naiveWinMax: 0.6, recklessWorse: 0.15, oathMin: 0.5 },
  tightFloor: { zone: 'foundry_f3', hpLoss: [0.18, 0.24], naiveWin: [0.70, 0.85] },
  // Party level on entering and leaving each zone if the player fights each zone's plan once
  // (brief: valley Lv 2-3, Archive F1 Lv 4, F2 Lv 5-6, F3 Lv 7, Archivore Lv 8). Also checked at 80%
  // of the plan ("most visible enemies") with a one-level allowance below.
  levels: {
    valley: { start: [1, 1], end: [3, 3] },
    archive_f1: { start: [3, 3], end: [4, 5] },
    archive_f2: { start: [4, 5], end: [6, 6] },
    archive_f3: { start: [6, 6], end: [7, 8] },
    archive_boss: { start: [8, 8], end: [8, 10] },
    // Episode 2 continues from Episode 1's last EXP (6.1): road 9 -> 10, F1 10 -> 11, F2 11 -> 12, F3 12 -> 13, King 13.
    east_road: { start: [9, 9], end: [10, 10] },
    court_f1: { start: [10, 10], end: [11, 11] },
    court_f2: { start: [11, 11], end: [12, 12] },
    court_f3: { start: [12, 12], end: [13, 13] },
    court_throne: { start: [13, 13], end: [13, 14] },
    // Episode 3 starts at the quick start's Lv 13 / 2,900 EXP (EP3_START_EXP) and climbs 13 -> 14 -> 15 -> 16 -> 17 -> 18 if
    // every fight is fought, one level lower on the 80% route (the Warden is met at Lv 16 there, as the plan says).
    sand_road: { start: [13, 13], end: [14, 14] },
    foundry_f1: { start: [14, 14], end: [15, 15] },
    foundry_f2: { start: [15, 15], end: [16, 16] },
    foundry_f3: { start: [16, 16], end: [17, 17] },
    foundry_heart: { start: [17, 17], end: [18, 18] },
  },
};
/** The Episode 3 quick start's EXP (src/game/state.js EP3_START; the plan's figure between the Episode 2 80% and 100% routes). */
export const EP3_START_EXP = 2900;
/** Boss encounters measured like the Archivore: careful vs attack-only vs ignoring telegraphs. */
export const BOSS_TARGETS = ['archivore', 'other_selves', 'nameless_king', 'bellows_specter', 'cinder_warden'];
// Party levels the suite plays each zone at, and boss fights at (the level the player meets them).
export const SUITE_LEVELS = {
  valley: [2, 3], archive_f1: [4], archive_f2: [5, 6], archive_f3: [7], archive_boss: [8], whisperwood_hollow: [6, 7],
  east_road: [9, 10], court_f1: [10, 11], court_f2: [11, 12], court_f3: [12, 13], court_throne: [13],
  sand_road: [13, 14], foundry_f1: [14, 15], foundry_f2: [15, 16], foundry_f3: [16, 17], foundry_heart: [16, 17],
};
// The first level is where the plan meets the boss (fighting every plan fight); reckless play is measured there.
// W11 (PLAYTEST_REVIEW_3 fix 1): the Episode 2 bosses are also played at the 80% route's level (one under the plan:
// the Other Selves at Lv 10, the King at Lv 12), where most players and the autoplay bot meet them; the King must win
// 90% there (TARGETS.nameless_king.winMinAt).
// Episode 3: the Specter is met at Lv 15 (the plan; the 80% route) or 16 (every ordinary fight of F1 and F2 first); the Warden at
// Lv 16 (the plan; the 80% route) or 17 after a full clear. Reckless play is measured at the first level.
export const BOSS_LEVELS = { echo_warden: [5, 6], whisperwood_alpha: [6, 7], archivore: [8], other_selves: [11, 10, 12], nameless_king: [13, 12],
  bellows_specter: [15, 16], cinder_warden: [16, 17] };
export const EPISODES = { 1: [...ZONE_ORDER, ...OPTIONAL_ZONES], 2: EP2_ZONE_ORDER, 3: EP3_ZONE_ORDER };
/** zone -> { level: loadout row } for a zone whose levels use different rows (the expansions' zones; empty for the main route). */
export const LOADOUT_AT = {};
// Merge the packs' additions. Only new keys are added: an extension can never change an existing zone, boss or target.
for (const x of EXTENSIONS) {
  for (const [z, lv] of Object.entries(x.suiteLevels || {})) if (!SUITE_LEVELS[z]) SUITE_LEVELS[z] = lv;
  for (const [b, lv] of Object.entries(x.bossLevels || {})) if (!BOSS_LEVELS[b]) BOSS_LEVELS[b] = lv;
  for (const [id, t] of Object.entries(x.targets || {})) if (!TARGETS[id]) TARGETS[id] = t;
  for (const id of x.bossTargets || []) if (!BOSS_TARGETS.includes(id)) BOSS_TARGETS.push(id);
  for (const [z, at] of Object.entries(x.loadoutAt || {})) LOADOUT_AT[z] = at;
  for (const [ep, zs] of Object.entries(x.zones || {})) for (const z of zs) if (!EPISODES[ep].includes(z)) EPISODES[ep].push(z);
}

export function makeParty(zone, level) {
  const L = LOADOUTS[zone];
  return ['hero', 'mira', 'bram'].map((id) => {
    const m = newMember(id, { level });
    m.weapon = L[id].weapon;
    m.equip = { ...m.equip, ...Object.fromEntries(Object.keys(m.equip).map((k) => [k, null])), ...L[id].equip };
    m.mastery = { ...m.mastery, ...L[id].mastery };
    return m;
  });
}

const quantile = (arr, q) => {
  if (!arr.length) return 0;
  const s = arr.slice().sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};


/** One battle. Returns metrics. */
export function runBattle({ zone, level, encounter, seed, policy = 'competent', elite = false, trace = false, bestiary = true, loadout = zone }) {
  const rng = makeRng(seed * 7919 + 17);
  const party = makeParty(loadout, level);
  const spec = rollEncounter(encounter, rng, { eliteRate: elite ? 1 : 0, noElite: !elite });
  const e = ENCOUNTERS[encounter];
  const b = createBattle({ party, enemies: spec.enemies, rng,
    options: { inventory: { ...LOADOUTS[loadout].inventory }, boss: e.boss, canFlee: !e.noFlee, zone: e.zone, encounter,
      bestiary: bestiary ? knownBestiary() : {}, flags: LOADOUTS[loadout].flags || [] } });
  const log = trace ? [...b.startEvents] : null;
  let steps = 0;
  let kos = 0;
  let kept = 0;
  let hammers = 0, turned = 0, named = 0, quenched = 0;
  const count = (evs) => {
    for (const ev of evs) {
      if (ev.type === 'ko' && b.unit(ev.target).side === 'party') kos++;
      if (ev.type === 'status_add' && ev.status === 'kept') kept++;
      if (ev.type === 'status_add' && ev.status === 'nameless') named++;
      if (ev.type === 'telegraph' && ev.skill === 'last_hammer') hammers++;
      if (ev.type === 'oath_ring') turned++;
      if (ev.type === 'quench') quenched++;
    }
  };
  count(b.startEvents);
  while (!b.isOver() && steps++ < 1500) {
    const u = b.current();
    let evs;
    if (u.side === 'party') {
      const a = partyAction(b, policy);
      if (trace) log.push({ type: 'decision', actor: u.uid, action: a });
      evs = b.perform(a);
      if (evs.length === 1 && evs[0].type === 'invalid') {
        if (trace) log.push(evs[0]);
        evs = b.perform({ type: 'defend' });
      }
    } else evs = b.runEnemyTurn();
    count(evs);
    if (trace) log.push(...evs);
  }
  const r = b.result() || { outcome: 'timeout', party: [], rounds: 99 };
  const units = b.units().filter((x) => x.side === 'party');
  const maxHp = units.reduce((s, x) => s + x.maxHp, 0);
  const hpEnd = units.reduce((s, x) => s + (x.alive ? x.hp : 0), 0);
  const itemsUsed = Object.values(r.itemsUsed || {}).reduce((s, v) => s + v, 0);
  return { outcome: r.outcome, win: r.outcome === 'victory', rounds: r.rounds, hpLoss: 1 - hpEnd / maxHp, kos, kept, itemsUsed,
    hammers, turned, named, quenched, enemyTurns: r.enemyTurns || 0, exp: r.exp, log };
}

/** Run N battles for an encounter + policy. */
export function runSet({ zone, level, encounter, n, policy, elite = false, seed0 = 1, loadout = zone }) {
  const rows = [];
  for (let i = 0; i < n; i++) rows.push(runBattle({ zone, level, encounter, seed: seed0 + i, policy, elite, loadout }));
  const wins = rows.filter((r) => r.win);
  return {
    zone, level, encounter, policy, elite, n,
    win: wins.length / n,
    rounds: rows.reduce((s, r) => s + r.rounds, 0) / n,
    p10: quantile(rows.map((r) => r.rounds), 0.1), p90: quantile(rows.map((r) => r.rounds), 0.9),
    hpLoss: rows.reduce((s, r) => s + r.hpLoss, 0) / n,
    kos: rows.reduce((s, r) => s + r.kos, 0) / n,
    kept: rows.reduce((s, r) => s + r.kept, 0) / n,
    items: rows.reduce((s, r) => s + r.itemsUsed, 0) / n,
    // Episode 3: Last Hammers announced, turned by Tempered Oath, names struck, foes quenched (per fight / share turned)
    hammers: rows.reduce((s, r) => s + r.hammers, 0) / n,
    oathShare: rows.reduce((s, r) => s + r.hammers, 0) ? rows.reduce((s, r) => s + r.turned, 0) / rows.reduce((s, r) => s + r.hammers, 0) : 0,
    named: rows.reduce((s, r) => s + r.named, 0) / n,
    quenched: rows.reduce((s, r) => s + r.quenched, 0) / n,
  };
}

/** The whole suite: every zone's plan at its tuned levels. */
export function runSuite({ n = 400, zones = ZONE_ORDER, policies = ['competent', 'naive'], elites = true } = {}) {
  const out = [];
  for (const z of zones) {
    const zone = ZONES[z];
    const levels = SUITE_LEVELS[z] || [zone.level[0]];
    for (const [enc] of zone.plan) {
      const isBoss = ENCOUNTERS[enc].boss;
      const lv = BOSS_LEVELS[enc] || (isBoss ? [zone.level[0]] : levels);
      // reckless (ignoring telegraphs) is measured at the level the plan fights the boss at (the first listed)
      const pols = (level) => (BOSS_TARGETS.includes(enc) && level === lv[0] ? [...new Set([...policies, 'reckless'])] : policies);
      const row = (level) => (LOADOUT_AT[z] && LOADOUT_AT[z][level]) || z;   // a zone's per-level loadout (expansions only)
      for (const level of lv) for (const policy of pols(level)) out.push(runSet({ zone: z, level, encounter: enc, n, policy, loadout: row(level) }));
      if (elites && !isBoss) out.push(runSet({ zone: z, level: lv[lv.length - 1], encounter: enc, n: Math.max(20, Math.floor(n / 4)), policy: 'competent', elite: true, loadout: row(lv[lv.length - 1]) }));
    }
    if (z === 'whisperwood_hollow') {
      for (const t of ALPHA_TIER_RUNS) for (const level of t.levels) for (const policy of policies) {
        out.push(runSet({ zone: z, level, encounter: t.encounter, n, policy, loadout: t.loadout }));
      }
    }
  }
  return out;
}

/**
 * Party level through Episode 1 if the player fights `share` of each zone's plan (no elites). episode 2 continues from
 * Episode 1's last EXP at the same share through EP2_ZONE_ORDER.
 * Episode 3 starts from the quick start's 2,900 EXP (EP3_START_EXP) at any share and runs EP3_ZONE_ORDER.
 */
export function progression(share = 1, episode = 1) {
  let exp = 0;
  const rows = [];
  if (episode === 2) exp = progression(share, 1).slice(-1)[0].exp;
  if (episode === 3) exp = EP3_START_EXP;
  for (const z of episode === 3 ? EP3_ZONE_ORDER : episode === 2 ? EP2_ZONE_ORDER : ZONE_ORDER) {
    const startLv = levelForExp(exp);
    let fights = 0;
    for (const [enc, count] of ZONES[z].plan) {
      const n = ENCOUNTERS[enc].boss ? count : count * share;
      exp += encounterExp(enc) * n; fights += n;
    }
    exp = Math.round(exp);
    rows.push({ zone: z, share, fights: Math.round(fights * 10) / 10, startLevel: startLv, endLevel: levelForExp(exp), exp });
  }
  return rows;
}

export function checkTargets(rows, prog = [...progression(1), ...progression(0.8)]) {
  const fails = [];
  const T = TARGETS;
  const ord = rows.filter((r) => !r.elite && !ENCOUNTERS[r.encounter].boss);
  const comp = ord.filter((r) => r.policy === 'competent');
  for (const r of comp) {
    if (r.win < T.ordinary.winMin) fails.push(`${r.encounter} Lv${r.level}: competent win ${pct(r.win)} < ${pct(T.ordinary.winMin)}`);
    if (r.rounds < T.ordinary.roundsMin - 0.5 || r.rounds > T.ordinary.roundsMax + 0.5) fails.push(`${r.encounter} Lv${r.level}: competent rounds ${r.rounds.toFixed(2)} outside ${T.ordinary.roundsMin}-${T.ordinary.roundsMax} (+-0.5)`);
    if (r.hpLoss > T.ordinary.hpLossMax) fails.push(`${r.encounter} Lv${r.level}: competent HP loss ${pct(r.hpLoss)} > ${pct(T.ordinary.hpLossMax)}`);
  }
  const zoneAvg = {};
  for (const r of comp) (zoneAvg[r.zone] = zoneAvg[r.zone] || []).push(r.rounds);
  for (const [z, arr] of Object.entries(zoneAvg)) {
    const a = arr.reduce((s, v) => s + v, 0) / arr.length;
    if (a < T.ordinary.roundsMin || a > T.ordinary.roundsMax) fails.push(`${z}: average competent rounds ${a.toFixed(2)} outside ${T.ordinary.roundsMin}-${T.ordinary.roundsMax}`);
  }
  // naive noticeably worse: per zone, more rounds or more HP lost or lower win rate
  for (const z of Object.keys(zoneAvg)) {
    const c = comp.filter((r) => r.zone === z);
    const nv = ord.filter((r) => r.zone === z && r.policy === 'naive');
    if (!nv.length) continue;
    const cScore = avg(c.map((r) => r.rounds * (1 + r.hpLoss)));
    const nScore = avg(nv.map((r) => r.rounds * (1 + r.hpLoss) / Math.max(0.05, r.win)));
    if (nScore < cScore * T.ordinary.naiveWorse) fails.push(`${z}: naive policy only ${(nScore / cScore).toFixed(2)}x worse (want >= ${T.ordinary.naiveWorse})`);
  }
  for (const r of rows.filter((x) => x.encounter === 'echo_warden' && x.policy === 'competent')) {
    if (r.win < T.echo_warden.winMin) fails.push(`echo_warden Lv${r.level}: win ${pct(r.win)} < ${pct(T.echo_warden.winMin)}`);
    if (r.rounds < T.echo_warden.roundsMin - 0.5 || r.rounds > T.echo_warden.roundsMax + 0.5) fails.push(`echo_warden Lv${r.level}: rounds ${r.rounds.toFixed(2)} outside 6-8`);
  }
  // the Alpha and its Elder tiers (W10) share one target: 6 to 9 rounds, careful play wins, attack-only does not walk it
  for (const r of rows.filter((x) => x.encounter === 'whisperwood_alpha' || ENCOUNTERS[x.encounter].tierOf === 'whisperwood_alpha')) {
    const t = T.whisperwood_alpha;
    if (r.policy === 'competent') {
      if (r.win < t.winMin) fails.push(`${r.encounter} Lv${r.level}: competent win ${pct(r.win)} < ${pct(t.winMin)}`);
      if (r.rounds < t.roundsMin - 0.5 || r.rounds > t.roundsMax + 0.5) fails.push(`${r.encounter} Lv${r.level}: rounds ${r.rounds.toFixed(2)} outside ${t.roundsMin}-${t.roundsMax}`);
    }
    if (r.policy === 'naive' && r.win > t.naiveWinMax) fails.push(`${r.encounter} Lv${r.level}: naive wins ${pct(r.win)} > ${pct(t.naiveWinMax)}`);
  }
  // the Archivore, the Other Selves and the Nameless King: careful wins in the round band, attack-only does not, and
  // ignoring telegraphs costs win rate (every level the suite plays the boss at)
  for (const id of BOSS_TARGETS) {
    const t = T[id];
    for (const level of [...new Set(rows.filter((x) => x.encounter === id).map((x) => x.level))]) {
      const at = rows.filter((x) => x.encounter === id && x.level === level);
      const ac = at.find((r) => r.policy === 'competent');
      const an = at.find((r) => r.policy === 'naive');
      const ar = at.find((r) => r.policy === 'reckless');
      const tag = `${id} Lv${level}`;
      if (ac) {
        const winMin = Math.max(t.winMin, (t.winMinAt && t.winMinAt[level]) || 0);
        if (ac.win < winMin) fails.push(`${tag}: competent win ${pct(ac.win)} < ${pct(winMin)}`);
        if (ac.rounds < t.roundsMin || ac.rounds > t.roundsMax) fails.push(`${tag}: rounds ${ac.rounds.toFixed(2)} outside ${t.roundsMin}-${t.roundsMax}`);
        if (t.keptMax !== undefined && ac.kept > t.keptMax) fails.push(`${tag}: careful play is Kept ${ac.kept.toFixed(2)} times per fight (want <= ${t.keptMax})`);
      }
      if (an && an.win > t.naiveWinMax) fails.push(`${tag}: naive wins ${pct(an.win)} > ${pct(t.naiveWinMax)}`);
      if (t.oathMin !== undefined && ac && ac.hammers > 0 && ac.oathShare < t.oathMin) fails.push(`${tag}: careful play turns only ${pct(ac.oathShare)} of the Last Hammers with Tempered Oath (want >= ${pct(t.oathMin)})`);
      if (ac && ar && ac.win - ar.win < t.recklessWorse) fails.push(`${tag}: ignoring telegraphs only costs ${pct(ac.win - ar.win)} win rate`);
    }
  }
  // Episode 3: Foundry F3 is the tightest ordinary floor (zone averages over its plan, at the level the suite plays it)
  const tf = T.tightFloor;
  const f3all = comp.filter((r) => r.zone === tf.zone);
  const f3lv = f3all.length ? Math.min(...f3all.map((r) => r.level)) : 0;   // the plan level (the suite also plays the next one)
  const f3c = f3all.filter((r) => r.level === f3lv);
  const f3n = ord.filter((r) => r.zone === tf.zone && r.policy === 'naive' && r.level === f3lv);
  if (f3c.length) {
    const hp = avg(f3c.map((r) => r.hpLoss));
    if (hp < tf.hpLoss[0] || hp > tf.hpLoss[1]) fails.push(`${tf.zone}: careful HP lost ${pct(hp)} outside ${pct(tf.hpLoss[0])}-${pct(tf.hpLoss[1])}`);
  }
  if (f3n.length) {
    const w = avg(f3n.map((r) => r.win));
    if (w < tf.naiveWin[0] || w > tf.naiveWin[1]) fails.push(`${tf.zone}: attack-only wins ${pct(w)} outside ${pct(tf.naiveWin[0])}-${pct(tf.naiveWin[1])}`);
  }
  for (const p of prog) {
    const t = T.levels[p.zone];
    const slack = p.share < 1 ? 1 : 0;
    if (p.startLevel < t.start[0] - slack || p.startLevel > t.start[1]) fails.push(`progression (${pct(p.share)} of fights): entering ${p.zone} at Lv ${p.startLevel}, want ${t.start[0]}-${t.start[1]}`);
    if (p.endLevel < t.end[0] - slack || p.endLevel > t.end[1]) fails.push(`progression (${pct(p.share)} of fights): leaving ${p.zone} at Lv ${p.endLevel}, want ${t.end[0]}-${t.end[1]}`);
  }
  return fails;
}

const avg = (a) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
const pct = (v) => `${Math.round(v * 100)}%`;

// ------------------------------------------------------------------ economy (W10, PLAYTEST_REVIEW_2 fix 7)
/**
 * Battle gold along the main route (each zone plan once, no elites, no chests or sales: a floor, not a forecast)
 * against what the shops sell. Rows: gold on arriving in each zone and the gear the zone's LOADOUT adds.
 */
export function economy({ startGold = 80 } = {}) {
  let gold = startGold;
  const owned = new Set(['short_sword', 'cloth_tunic', 'oak_staff', 'short_bow', 'ash_spear', 'hatchet', 'leather_vest',
    'cloth_cap', 'mirrorguard_mail', 'iron_pike', 'chain_shirt']);   // start kit, gifts, the F2 chests, the Warden's mail
  const rows = [];
  let earned = 0;
  for (const z of ZONE_ORDER) {
    const need = new Set();
    for (const id of ['hero', 'mira', 'bram']) for (const it of Object.values(LOADOUTS[z][id].equip)) if (it && !owned.has(it)) need.add(it);
    let buy = 0;
    for (const it of need) { buy += ITEMS[it].price; owned.add(it); }
    rows.push({ zone: z, arrive: gold, buys: [...need], cost: buy });
    gold -= buy;
    let g = 0;
    for (const [enc, n] of ZONES[z].plan) g += ENCOUNTERS[enc].enemies.reduce((s, e) => s + ENEMIES[e].gold, 0) * n;
    gold += g; earned += g;
  }
  const salvage = SHOPS.archive_salvage.stock.filter((s) => ITEMS[s.item].slot);
  const t3 = salvage.map((s) => s.price ?? ITEMS[s.item].price);
  const boss = rows.find((r) => r.zone === 'archive_boss');
  const f3 = rows.find((r) => r.zone === 'archive_f3');
  return { rows, earned, end: gold, sinkTotal: t3.reduce((a, b) => a + b, 0), cheapestT3: Math.min(...t3),
    // a player who skips the optional F3 town trip (crystal rod, iron helm) reaches Rook with that gold unspent
    atRook: boss.arrive + f3.cost };
}

export function checkEconomy(e = economy()) {
  const fails = [];
  if (e.atRook < e.cheapestT3) fails.push(`economy: ${e.atRook} gold at Rook's salvage, the cheapest tier-3 piece costs ${e.cheapestT3}`);
  if (e.sinkTotal < e.earned) fails.push(`economy: the Archive salvage sells ${e.sinkTotal} gold of gear, the route pays ${e.earned}: gold piles up again`);
  return fails;
}

/**
 * Episode 2 gold (EPISODE2_PLAN.md 7.6): battle gold per zone from Episode 1's leftover, against the Hollow's prices.
 * The plan: enough for two tier 3 pieces on reaching the Hollow and two tier 4 pieces before F3, never everything.
 * (A floor: chests, sales and drops come on top, which is what the LOADOUTS' fuller kit leans on.)
 */
export function economy2({ startGold = economy().end } = {}) {
  const zoneGold = (z) => ZONES[z].plan.reduce((g, [enc, n]) => g + ENCOUNTERS[enc].enemies.reduce((s, e) => s + ENEMIES[e].gold, 0) * n, 0);
  const rows = [];
  let gold = startGold;
  for (const z of EP2_ZONE_ORDER) { rows.push({ zone: z, arrive: gold, earned: zoneGold(z) }); gold += zoneGold(z); }
  const price = (id) => ITEMS[id].price;
  const smithy = SHOPS.hollow_smithy.stock;
  const t3 = smithy.filter((x) => !x.ifFlag && ITEMS[x.item].ilvl >= 9).map((x) => price(x.item)).sort((a, b) => a - b);
  const t4 = smithy.filter((x) => x.ifFlag === 'court_f2_done').map((x) => price(x.item)).sort((a, b) => a - b);
  const atHollow = rows[1].arrive;                       // after the Fading Road
  const beforeF3 = rows[3].arrive;                       // after F1, F2 and the Other Selves (nothing spent)
  const typicalT3 = price('steel_cuirass') + price('sage_robe');
  const typicalT4 = price('silverglass_blade') + price('mirror_rod');
  return { rows, end: gold, atHollow, beforeF3, typicalT3, typicalT4, everything: [...t3, ...t4].reduce((a, b) => a + b, 0) };
}
export function checkEconomy2(e = economy2()) {
  const fails = [];
  if (e.atHollow < e.typicalT3) fails.push(`economy (Episode 2): ${e.atHollow} gold at the Hollow, two tier 3 pieces cost ${e.typicalT3}`);
  if (e.beforeF3 - e.typicalT3 < e.typicalT4) fails.push(`economy (Episode 2): ${e.beforeF3 - e.typicalT3} gold before F3 after the Hollow buys, two tier 4 pieces cost ${e.typicalT4}`);
  if (e.end >= e.everything) fails.push(`economy (Episode 2): ${e.end} gold by the end buys the whole Silverglass Smithy (${e.everything})`);
  return fails;
}

/**
 * Episode 3 gold (EPISODE3_PLAN.md 7.6): the quick start's 1,500 plus battle gold per zone against Emberpeak's prices. A floor (no
 * chests, sales or drops). The plan: two tier 5 pieces in town, two tier 6 pieces before F3, never everything.
 */
export function economy3({ startGold = 1500 } = {}) {
  const zoneGold = (z) => ZONES[z].plan.reduce((g, [enc, n]) => g + ENCOUNTERS[enc].enemies.reduce((s, e) => s + ENEMIES[e].gold, 0) * n, 0);
  const rows = [];
  let gold = startGold;
  for (const z of EP3_ZONE_ORDER) { rows.push({ zone: z, arrive: gold, earned: zoneGold(z) }); gold += zoneGold(z); }
  const price = (id) => ITEMS[id].price;
  const stock = SHOPS.pk_smithy.stock;
  const t5 = stock.filter((x) => !x.ifFlag && ITEMS[x.item].ilvl >= 14).map((x) => price(x.item)).sort((a, b) => a - b);
  const t6 = stock.filter((x) => x.ifFlag).map((x) => price(x.item)).sort((a, b) => a - b);
  const typicalT5 = price('ashsteel_helm') + price('cinder_boots');
  return { rows, end: gold, atTown: rows[1].arrive, beforeF3: rows[3].arrive, typicalT5, cheapestT6: t6[0],
    secondT6: t6[1], everything: [...t5, ...t6].reduce((a, b) => a + b, 0) };
}
export function checkEconomy3(e = economy3()) {
  const fails = [];
  if (e.atTown < e.typicalT5) fails.push(`economy (Episode 3): ${e.atTown} gold at Emberpeak, two tier 5 pieces cost ${e.typicalT5}`);
  if (e.beforeF3 - e.typicalT5 < e.cheapestT6) fails.push(`economy (Episode 3): ${e.beforeF3 - e.typicalT5} gold before F3 after the town buys, the cheapest tier 6 piece costs ${e.cheapestT6}`);
  if (e.end >= e.everything) fails.push(`economy (Episode 3): ${e.end} gold by the end buys the whole smithy (${e.everything})`);
  return fails;
}

export function formatTable(rows) {
  const head = ['zone', 'encounter', 'Lv', 'policy', 'win', 'rounds', 'p10-p90', 'hp lost', 'KOs', 'items', 'kept', 'quench', 'named', 'oath'];
  const lines = [head.join(' | '), head.map(() => '---').join(' | ')];
  for (const r of rows) {
    lines.push([r.zone, r.encounter + (r.elite ? ' (elite)' : ''), r.level, r.policy, pct(r.win), r.rounds.toFixed(2),
      `${r.p10.toFixed(1)}-${r.p90.toFixed(1)}`, pct(r.hpLoss), r.kos.toFixed(2), r.items.toFixed(2), (r.kept || 0).toFixed(2),
      (r.quenched || 0).toFixed(2), (r.named || 0).toFixed(2), r.hammers ? pct(r.oathShare) : '-'].join(' | '));
  }
  return lines.join('\n');
}

// ------------------------------------------------------------------ CLI
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const args = process.argv.slice(2);
  const get = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
  if (args.includes('--cave')) {
    // The Deep Stacks descent (tools/sim/cave.mjs, docs/DEEP_STACKS_PLAN.md 11): its own seeds, tables and targets.
    const { caveMain } = await import('./cave.mjs');
    process.exit(await caveMain(args));
  } else if (args.includes('--tier')) {
    // Fine Print, the post-credits tier (tools/sim/tier.mjs, docs/TIER.md): the tier suite at the carried party's level.
    const { tierMain } = await import('./tier.mjs');
    process.exit(await tierMain(args, { runSet, checkTargets, formatTable, progression, EPISODES, SUITE_LEVELS, BOSS_LEVELS, BOSS_TARGETS }));
  } else if (args.includes('--trace')) {
    const i = args.indexOf('--trace');
    const enc = args[i + 1];
    const seed = Number(args[i + 2] || 1);
    const policy = args[i + 3] || 'competent';
    const z = ENCOUNTERS[enc].zone;
    const level = Number(get('--level', (BOSS_LEVELS[enc] || ZONES[z].level).slice(-1)[0]));
    const r = runBattle({ zone: z, level, encounter: enc, seed, policy, trace: true });
    for (const ev of r.log) {
      if (ev.type === 'timeline') continue;
      const { type, ...rest } = ev;
      console.log(type.padEnd(16), JSON.stringify(rest).slice(0, 180));
    }
    console.log(JSON.stringify({ outcome: r.outcome, rounds: r.rounds, hpLoss: r.hpLoss, kos: r.kos }));
  } else {
    const n = Number(get('--n', 400));
    const zone = get('--zone', null);
    const episode = get('--episode', null);
    const t0 = Date.now();
    const zones = zone ? [zone] : episode ? EPISODES[episode] : [...EPISODES[1], ...EPISODES[2], ...EPISODES[3]];
    const rows = runSuite({ n, zones });
    const prog = [...progression(1), ...progression(0.8), ...progression(1, 2), ...progression(0.8, 2), ...progression(1, 3), ...progression(0.8, 3)];
    console.log(formatTable(rows));
    console.log('\nProgression (fight each zone plan once, then 80% of it; Episode 2 continues from Episode 1, Episode 3 starts at 2,900 EXP):');
    for (const p of prog) console.log(`  ${pct(p.share).padStart(4)} ${p.zone.padEnd(13)} ${String(p.fights).padStart(4)} fights  Lv ${p.startLevel} -> ${p.endLevel}  (total EXP ${p.exp})`);
    const fails = checkTargets(rows, prog.filter((p) => zones.includes(p.zone)));
    if (!zone && (!episode || episode === '1')) {
      // W10: the route (HP and MP carried between fights, elites at the live rate) and the gold flow
      const { routeSummary, checkRoute, REST_PLANS } = await import('./route.mjs');
      const careful = routeSummary({ n: 100, rests: REST_PLANS.current });
      const bot = routeSummary({ n: 100, rests: REST_PLANS.current, bot: true });
      console.log(`\nRoute (100 runs, HP/MP carried): careful ${careful.overall.toFixed(2)} rounds per ordinary fight `
        + `(${Object.entries(careful.zones).map(([z, v]) => `${z} ${v.rounds.toFixed(2)}`).join(', ')}); autoplay-like ${bot.overall.toFixed(2)} `
        + `(${Object.entries(bot.zones).map(([z, v]) => `${z} ${v.rounds.toFixed(2)}`).join(', ')})`);
      fails.push(...checkRoute(careful, 'careful'), ...checkRoute(bot, 'bot'));
      const eco = economy();
      console.log(`Economy: ${eco.earned} battle gold on the route, ${eco.atRook} at Rook's salvage, tier-3 stock ${eco.sinkTotal}`);
      fails.push(...checkEconomy(eco));
    }
    if (!zone && (!episode || episode === '1' || episode === '2')) {
      // The optional-EXP ledger (Scott, 2026-10-25: full EXP, the extra levels are accepted): REPORTS the completionist's level at every main
      // boss and plays each boss at that level; fails only when a main boss turns into a pushover. optional_exp.mjs does not import this
      // file (the CLI's top-level await would deadlock a cycle), so the import is dynamic and runSet is passed in.
      const { checkOptionalCaps, completionRows, bossRows, formatRows, OPTIONAL_SOURCES } = await import('./optional_exp.mjs');
      const bossN = Math.min(n, 200);
      for (const ep of [1, 2]) {
        if (episode && episode !== String(ep)) continue;
        const rows = completionRows(ep, { n });
        console.log(`\nOptional EXP (Episode ${ep} completionist${ep === 2 && !OPTIONAL_SOURCES[2].length ? ', Episode 1 carry only' : ''}, ${n} elite-roll runs; each main boss played at that level):\n${formatRows(rows, bossRows(rows, { runSet, n: bossN }))}`);
      }
      fails.push(...checkOptionalCaps({ n, episodes: episode ? [Number(episode)] : [1, 2], runSet, bossN }));
    }
    if (!zone && (!episode || episode === '3')) {
      const e3 = economy3();
      console.log(`Economy (Episode 3): ${e3.rows.map((r) => `${r.zone} arrive ${r.arrive} +${r.earned}`).join(', ')}; at Emberpeak ${e3.atTown} `
        + `(two tier 5: ${e3.typicalT5}), before F3 ${e3.beforeF3} (cheapest tier 6: ${e3.cheapestT6}), end ${e3.end} (the whole smithy: ${e3.everything})`);
      fails.push(...checkEconomy3(e3));
    }
    if (!zone && (!episode || episode === '2')) {
      const e2 = economy2();
      console.log(`Economy (Episode 2): ${e2.rows.map((r) => `${r.zone} arrive ${r.arrive} +${r.earned}`).join(', ')}; at the Hollow ${e2.atHollow} `
        + `(two tier 3: ${e2.typicalT3}), before F3 ${e2.beforeF3} (two tier 4: ${e2.typicalT4}), end ${e2.end} (the whole smithy: ${e2.everything})`);
      fails.push(...checkEconomy2(e2));
    }
    console.log(`\n${fails.length ? 'TARGETS MISSED:\n  ' + fails.join('\n  ') : 'All targets met.'}`);
    console.log(`(${rows.reduce((s, r) => s + r.n, 0)} battles in ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    if (args.includes('--json')) {
      const fs = await import('node:fs');
      const path = new URL('./out/sim.json', import.meta.url);
      fs.mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
      fs.writeFileSync(path, JSON.stringify({ rows, progression: prog, fails }, null, 1));
    }
    if (args.includes('--check') && fails.length) process.exit(1);
  }
}
