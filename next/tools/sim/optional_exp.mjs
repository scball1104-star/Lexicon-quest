// The optional-EXP ledger (EXPANSION_RECONCILIATION.md 1, EXPANSION1_PLAN.md 7.2): how much EXP a completionist (a player who
// does every optional fight and quest, in the WORST order: all of it as early as it opens) holds at each main boss, and what level
// that is.
//
// SCOTT'S DECISION (2026-10-25): accept the extra levels, full EXP (EXPANSION_FOE_EXP_MUL = 1). The plan's "at most one level over
// today's plan" cap is therefore NOT enforced any more: the ledger REPORTS the completionist's level at every main boss and at the end
// of Episode 1. checkOptionalCaps() fails only on something broken: a main boss that has become trivially easy for that level (the
// sim plays the boss at the completionist's level with the zone's plain loadout; see PUSHOVER). The fix for a pushover is boss-side
// (a harder main boss), never cutting EXP.
//
//   node tools/sim/optional_exp.mjs             the ledger (Episode 1 and the Episode 1 carry into Episode 2), 400 elite-roll runs
//   node tools/sim/optional_exp.mjs --n 1000    more runs
//   node tools/sim/optional_exp.mjs --check     exit 1 if a main boss is a pushover
//
// Importable: OPTIONAL_SOURCES, INTENDED_ORDER, CHECKPOINTS, completionRows(episode), checkOptionalCaps({ runSet }), registerOptionalSources().
// It never imports simulate.mjs at load (a cycle with that CLI's top-level await would deadlock); callers pass `runSet` in.
//
// One place for the math, shaped for both episodes. Episode 2's x2.mjs adds its rows with registerOptionalSources(2, [...]) and its
// checkpoints already exist below (Other Selves, the King), so X2-battle writes data, not logic.
//
// What a row is paid. A zone source plays the zone's `plan` once (ZONES[z].plan counts) in the engine's own arithmetic
// (round(raw x elite multiplier x expScale x expMul) per unit, rules.js makeEnemyUnit), including the adds a boss calls (a phase
// `summon` pays like any foe) and the elites ordinary groups roll at the live rate (rollEncounter): n seeded runs. A quest source
// pays its `give('exp', n)` unscaled. The Hollow is counted (284 EXP with the Alpha's pack call, plus its fixed elite).

import { ZONES, ZONE_ORDER, EP2_ZONE_ORDER, ENCOUNTERS, rollEncounter, expScale, encounterExpMul } from '../../src/data/encounters.js';
import { ENEMIES, ELITE_BASE } from '../../src/data/enemies.js';
import { expForLevel, levelForExp } from '../../src/data/party.js';
import { makeRng } from '../../src/battle/rules.js';
import './x1.mjs';   // registers the x1 content (enemies, encounters, ...) so ZONES.x1_* resolve

// ------------------------------------------------------------------ the main route (same arithmetic as simulate.mjs progression(1))
function routeExp(episode) {
  let exp = episode === 2 ? routeExp(1).slice(-1)[0].exp : 0;
  const rows = [];
  for (const z of episode === 2 ? EP2_ZONE_ORDER : ZONE_ORDER) {
    for (const [enc, n] of ZONES[z].plan) exp += ENCOUNTERS[enc].enemies.reduce((s, e) => s + ENEMIES[e].exp, 0) * n;
    exp = Math.round(exp);
    rows.push({ zone: z, exp });
  }
  return rows;
}
const R1 = routeExp(1), R2 = routeExp(2);
const planExp = (z, skip) => ZONES[z].plan.filter(([e]) => e !== skip).reduce((s, [enc, n]) => s + ENCOUNTERS[enc].enemies.reduce((t, e) => t + ENEMIES[e].exp, 0) * n, 0);

/**
 * The main bosses and where today's route stands when the party meets them. Echo Warden: Archive F1 done (335) plus about half of
 * F2's ordinary fights (the plan's 448; Inference: the Warden stands at the end of the floor; sensitivity below). Other Selves:
 * about 90% of F2's ordinary fights (the plan's "about 2,180"; Inference). The others are plain progression(1) numbers.
 */
export const CHECKPOINTS = [
  { id: 'echo_warden', episode: 1, label: 'Echo Warden', boss: { zone: 'archive_f2', encounter: 'echo_warden' }, regular: R1[1].exp + Math.round(0.5 * planExp('archive_f2', 'echo_warden')) },
  { id: 'archivore', episode: 1, label: 'Archivore', boss: { zone: 'archive_boss', encounter: 'archivore' }, regular: R1[3].exp },
  { id: 'ep1_end', episode: 1, label: 'Episode 1 end', regular: R1[4].exp },
  { id: 'other_selves', episode: 2, label: 'Other Selves', boss: { zone: 'court_f2', encounter: 'other_selves' }, regular: R2[1].exp + Math.round(0.9 * planExp('court_f2', 'other_selves')) },
  { id: 'nameless_king', episode: 2, label: 'The King', boss: { zone: 'court_throne', encounter: 'nameless_king' }, regular: R2[3].exp },
];
const ORDER = CHECKPOINTS.map((c) => c.id);

/** The old cap, kept for the report only: the last EXP that is still one level over today's plan. */
export function capFor(regularExp) { return expForLevel(levelForExp(regularExp) + 2) - 1; }

/**
 * A main boss is a PUSHOVER for the completionist when the sim (careful play, the zone's plain loadout, the completionist's level)
 * wins it in fewer than PUSHOVER.roundsFrac of the boss target's minimum rounds, or loses under PUSHOVER.hpLoss of the party's HP.
 * Either one means the fight no longer teaches or tests anything; the fix is boss-side. (The sim loadout has none of the placed
 * gear the completionist also carries, so this is the optimistic view of the boss.)
 */
export const PUSHOVER = { roundsFrac: 0.6, hpLoss: 0.06 };
export const BOSS_ROUNDS_MIN = { echo_warden: 6, archivore: 8, other_selves: 7, nameless_king: 9 };

// ------------------------------------------------------------------ the sources
// kind 'zone': the zone's plan fought once. kind 'quest': give('exp', exp). `by`: the first checkpoint it can count at.
// gate: what opens it (documentation; the plan's 3.3 table and 5.8).
export const QUEST_EXP = { strays: 8, rollcall: 12, dark_stars: 8, pell_crates: 6, four_rolls: 12, not_to_forget: 8 };
export const OPTIONAL_SOURCES = {
  1: [
    { id: 'x1_barrow', kind: 'zone', zone: 'x1_barrow', gate: 'always', by: 'echo_warden' },
    { id: 'x1_downs', kind: 'zone', zone: 'x1_downs', gate: 'first_fight_done', by: 'echo_warden' },
    { id: 'x1_highmoor', kind: 'zone', zone: 'x1_highmoor', gate: 'first_fight_done', by: 'echo_warden' },
    { id: 'x1_larchhill', kind: 'zone', zone: 'x1_larchhill', gate: 'first_fight_done', by: 'echo_warden' },
    { id: 'x1_millrace', kind: 'zone', zone: 'x1_millrace', gate: 'archive_f1_done', by: 'echo_warden' },
    { id: 'x1_culvert', kind: 'zone', zone: 'x1_culvert', gate: 'archive_f1_done', by: 'echo_warden' },
    // the moor's stile (Dash) opens the Terrace before the Lantern: the plan's table left it out at the Warden; the worst order counts it
    { id: 'x1_terrace', kind: 'zone', zone: 'x1_terrace', gate: 'lantern_get or the stile', by: 'echo_warden' },
    { id: 'quest_strays', kind: 'quest', exp: QUEST_EXP.strays, gate: 'first_fight_done', by: 'echo_warden' },
    { id: 'quest_rollcall', kind: 'quest', exp: QUEST_EXP.rollcall, gate: 'first_fight_done', by: 'echo_warden' },
    { id: 'x1_cellar', kind: 'zone', zone: 'x1_cellar', gate: 'orrery_aligned', by: 'archivore' },
    { id: 'quest_dark_stars', kind: 'quest', exp: QUEST_EXP.dark_stars, gate: 'lantern_get', by: 'archivore' },
    { id: 'whisperwood_hollow', kind: 'zone', zone: 'whisperwood_hollow', gate: 'lantern_get', by: 'archivore' },
    { id: 'quest_pell_crates', kind: 'quest', exp: QUEST_EXP.pell_crates, gate: 'archivore_defeated', by: 'ep1_end' },
    { id: 'quest_four_rolls', kind: 'quest', exp: QUEST_EXP.four_rolls, gate: 'archivore_defeated', by: 'ep1_end' },
    { id: 'quest_not_to_forget', kind: 'quest', exp: QUEST_EXP.not_to_forget, gate: 'archivore_defeated', by: 'ep1_end' },
  ],
  2: [],   // X2-battle: registerOptionalSources(2, [...]) from tools/sim/x2.mjs
};
/** The worst order: every source as early as it opens (by checkpoint, then the list order above). Episode 2 appends to its list. */
export const INTENDED_ORDER = { 1: OPTIONAL_SOURCES[1].map((s) => s.id), 2: [] };

/** Episode 2's tools/sim/x2.mjs adds its sources here (same shape; `by` is one of the Episode 2 checkpoint ids). */
export function registerOptionalSources(episode, sources) {
  const have = new Set(OPTIONAL_SOURCES[episode].map((s) => s.id));
  for (const s of sources) if (!have.has(s.id)) { OPTIONAL_SOURCES[episode].push(s); INTENDED_ORDER[episode].push(s.id); }
}

// ------------------------------------------------------------------ arithmetic
/** The EXP one spec pays: the engine's own rule (rules.js makeEnemyUnit), no summons. */
function specExp(encId, spec) {
  const e = ENCOUNTERS[encId];
  const d = ENEMIES[spec.id];
  let x = d.exp;
  if (spec.elite && spec.elite.length) x *= ELITE_BASE.exp;
  x *= expScale(e.zone);
  x *= encounterExpMul(encId);
  return Math.round(x);
}
/** The foes a boss calls in its phases (their EXP is paid like any foe, with the boss encounter's expMul). */
function summonsOf(enemyId) {
  const out = [];
  for (const p of ENEMIES[enemyId].phases || []) {
    if (!p.summon) continue;
    for (const id of Array.isArray(p.summon) ? p.summon : [p.summon]) out.push(id);
  }
  return out;
}
/** One fight of an encounter: its units' EXP (elites rolled at the live rate) plus its bosses' calls. Returns { exp, gold }. */
function fightExp(encId, rng) {
  const e = ENCOUNTERS[encId];
  const spec = rollEncounter(encId, rng, {});
  let exp = 0, gold = 0;
  for (const s of spec.enemies) {
    exp += specExp(encId, s);
    gold += ENEMIES[s.id].gold * (s.elite && s.elite.length ? ELITE_BASE.gold : 1);
    for (const sid of summonsOf(s.id)) { exp += specExp(encId, { id: sid }); gold += ENEMIES[sid].gold; }
  }
  return { exp, gold };
}
/** One source's EXP and gold in one run. */
function sourcePay(src, rng) {
  if (src.kind === 'quest') return { exp: src.exp, gold: 0 };
  let exp = 0, gold = 0;
  for (const [enc, n] of ZONES[src.zone].plan) for (let i = 0; i < n; i++) { const f = fightExp(enc, rng); exp += f.exp; gold += f.gold; }
  return { exp, gold };
}
/** The no-elite, deterministic EXP of a source (the plan's 7.2 supply table, with the boss calls). */
export function sourceBase(src) {
  if (src.kind === 'quest') return src.exp;
  let exp = 0;
  for (const [enc, n] of ZONES[src.zone].plan) {
    const e = ENCOUNTERS[enc];
    for (const id of e.enemies) {
      exp += specExp(enc, { id }) * n;
      for (const sid of summonsOf(id)) exp += specExp(enc, { id: sid }) * n;
    }
  }
  return exp;
}

/** The sources that count at a checkpoint of an episode's run: every source of that episode and earlier whose `by` is at or before it. */
function sourcesAt(episode, checkpointId) {
  const at = ORDER.indexOf(checkpointId);
  const out = [];
  for (const ep of [1, 2]) {
    if (ep > episode) continue;
    for (const s of OPTIONAL_SOURCES[ep]) if (ORDER.indexOf(s.by) >= 0 && ORDER.indexOf(s.by) <= at) out.push(s);
  }
  return out;
}

/**
 * The completionist's EXP at each main boss of an episode (episode 2's rows carry Episode 1's completionist). Three views of the
 * same extra EXP: `base` (every source once, no random elites: the plan's 7.2 arithmetic, plus the boss calls and the Hollow's fixed
 * elite), `mean` and `worst` of n seeded runs that roll elites at the live rate. The level reported is the mean's.
 * Rows: { id, label, boss, regular, regularLevel, extraBase, extraMean, extraWorst, exp (regular + base), expMean, expWorst, level (of
 * the mean), levelBase, levelWorst, over (levels over today's), oldCap, parts: { sourceId: base EXP }, goldMean, sources }.
 */
export function completionRows(episode = 1, { n = 400, seed = 20261025 } = {}) {
  const rows = [];
  for (const cp of CHECKPOINTS.filter((c) => c.episode === episode)) {
    const srcs = sourcesAt(episode, cp.id);
    let sum = 0, worst = 0, goldSum = 0;
    for (let r = 0; r < n; r++) {
      const rng = makeRng(seed + r * 101 + ORDER.indexOf(cp.id));
      let x = 0, g = 0;
      for (const s of srcs) { const p = sourcePay(s, rng); x += p.exp; if (s.id !== 'whisperwood_hollow') g += p.gold; }   // gold the NEW zones add
      sum += x; goldSum += g; if (x > worst) worst = x;
    }
    const regularLevel = levelForExp(cp.regular);
    const parts = {};
    for (const s of srcs) parts[s.id] = sourceBase(s);
    const extraBase = Object.values(parts).reduce((a, b) => a + b, 0);
    const extraMean = sum / n;
    const cap = capFor(cp.regular);
    const exp = cp.regular + extraBase, expMean = cp.regular + extraMean, expWorst = cp.regular + worst;
    rows.push({ id: cp.id, label: cp.label, episode, boss: cp.boss || null, regular: cp.regular, regularLevel, extraBase, extraMean, extraWorst: worst,
      exp, expMean, expWorst, level: levelForExp(Math.round(expMean)), levelBase: levelForExp(exp), levelWorst: levelForExp(Math.round(expWorst)),
      over: levelForExp(Math.round(expMean)) - regularLevel, oldCap: cap, parts, goldMean: goldSum / n, sources: srcs.map((s) => s.id) });
  }
  return rows;
}

/**
 * Play each main boss at the completionist's level (careful play, the zone's plain loadout) and say whether it is still a fight.
 * Needs `runSet` from simulate.mjs. Returns [{ id, label, level, win, rounds, hpLoss, roundsMin, pushover, why }].
 */
export function bossRows(rows, { runSet, n = 100 } = {}) {
  if (!runSet) return [];
  const out = [];
  for (const r of rows) {
    if (!r.boss) continue;
    const t = runSet({ zone: r.boss.zone, level: r.level, encounter: r.boss.encounter, n, policy: 'competent' });
    const roundsMin = BOSS_ROUNDS_MIN[r.id];
    let why = null;
    if (t.rounds < roundsMin * PUSHOVER.roundsFrac) why = `${t.rounds.toFixed(1)} rounds, under ${(roundsMin * PUSHOVER.roundsFrac).toFixed(1)}`;
    else if (t.hpLoss < PUSHOVER.hpLoss) why = `${Math.round(t.hpLoss * 100)}% HP lost, under ${Math.round(PUSHOVER.hpLoss * 100)}%`;
    out.push({ id: r.id, label: r.label, level: r.level, win: t.win, rounds: t.rounds, hpLoss: t.hpLoss, roundsMin, pushover: !!why, why });
  }
  return out;
}

/** [] unless something is broken: a main boss that is a pushover (or lost) at the completionist's level. Levels are reported, not capped. */
export function checkOptionalCaps({ n = 400, episodes = [1, 2], runSet = null, bossN = 100 } = {}) {
  const fails = [];
  for (const ep of episodes) {
    if (ep === 2 && !OPTIONAL_SOURCES[2].length) continue;   // until X2-battle registers its sources the Episode 1 carry is shown, not enforced
    for (const b of bossRows(completionRows(ep, { n }), { runSet, n: bossN })) {
      if (b.pushover) fails.push(`optional EXP: the ${b.label} is a pushover for the completionist at Lv ${b.level} (${b.why}); adjust the boss, not the EXP`);
      if (b.win < 0.5) fails.push(`optional EXP: the ${b.label} is lost ${Math.round((1 - b.win) * 100)}% of the time at the completionist's Lv ${b.level}`);
    }
  }
  return fails;
}

export function formatRows(rows, bosses = []) {
  const head = ['At', 'Regular EXP', 'Today Lv', 'Extra (base)', 'Completionist EXP (mean, elites)', 'Lv', 'Over today', 'Worst run', 'Lv', 'Boss at that Lv: win', 'rounds (target min)', 'HP lost'];
  const lines = [head.join(' | '), head.map(() => '---').join(' | ')];
  for (const r of rows) {
    const b = bosses.find((x) => x.id === r.id);
    lines.push([r.label, r.regular, r.regularLevel, r.extraBase, Math.round(r.expMean), r.level, `+${r.over}`, Math.round(r.expWorst), r.levelWorst,
      b ? `${Math.round(b.win * 100)}%${b.pushover ? ' PUSHOVER' : ''}` : '-', b ? `${b.rounds.toFixed(1)} (${b.roundsMin})` : '-', b ? `${Math.round(b.hpLoss * 100)}%` : '-'].join(' | '));
  }
  return lines.join('\n');
}

// ------------------------------------------------------------------ CLI
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const { runSet } = await import('./simulate.mjs');
  const args = process.argv.slice(2);
  const get = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
  const n = Number(get('--n', 400));
  const bossN = Number(get('--boss-n', 200));
  for (const ep of [1, 2]) {
    const rows = completionRows(ep, { n });
    console.log(`\nEpisode ${ep}${ep === 2 ? ' (carries the Episode 1 completionist' + (OPTIONAL_SOURCES[2].length ? '' : '; no Episode 2 sources registered yet') + ')' : ''}, ${n} elite-roll runs:`);
    console.log(formatRows(rows, bossRows(rows, { runSet, n: bossN })));
    if (ep === 1) {
      console.log('\nBase EXP per source (no elites), and the order it opens:');
      for (const id of INTENDED_ORDER[1]) {
        const s = OPTIONAL_SOURCES[1].find((x) => x.id === id);
        console.log(`  ${id.padEnd(22)} ${String(sourceBase(s)).padStart(4)}  by ${s.by}  (${s.gate})`);
      }
      const last = rows[rows.length - 1];
      console.log(`  battle gold the new zones add (fights, bosses and their calls; mean of runs; no target): ${Math.round(rows[0].goldMean)} by the Echo Warden, ${Math.round(rows[1].goldMean)} by the Archivore, ${Math.round(last.goldMean)} in all`);
    }
  }
  const fails = checkOptionalCaps({ n, runSet, bossN });
  console.log(`\n${fails.length ? 'BROKEN:\n  ' + fails.join('\n  ') : 'No main boss is a pushover at the completionist level (levels are reported, not capped).'}`);
  if (args.includes('--check') && fails.length) process.exit(1);
}
