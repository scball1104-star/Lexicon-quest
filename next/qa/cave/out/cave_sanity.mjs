// C1-data's sanity harness for the Deep Stacks curve (docs/DEEP_STACKS_PLAN.md 11; C3-sim-bot builds the real --cave route).
//   node qa/cave/out/cave_sanity.mjs [--n 60] [--floors 1,1b,5,10,30,60,90,99] [--binder] [--runset]
// Plays n seeded battles per checkpoint floor with the cave party of qa/cave/data_cave_loadouts.mjs, each battle an
// encounterFor(seed, floor, index) pick (so the pool's weights decide the mix), with the encounter's hp, power, speed and elite
// applied the way battle/rules.js makeEnemyUnit reads them. Writes qa/cave/out/cave_sanity.md and .json.
// --runset also plays B1/B10/B30 through the sim's own runSet (rollEncounter path): identical except that rollEncounter drops
// the `hp` multiplier today, so those rows show what the engine does before the one-line fix lands in encounters.js.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENCOUNTERS } from '../../../src/data/encounters.js';
import { ENEMIES } from '../../../src/data/enemies.js';
import register from '../../../src/data/cave/index.js';
import { encounterFor, foesPerFloor, scale, arrivalLevel, BANDS, EXP_PACE_KNOTS, BINDER_ENCOUNTER_ID, registerFloorEncounters, floorEncounters } from '../../../src/data/cave/foes.js';
import { itemLevel } from '../../../src/data/cave/loot.js';
import { makeCaveParty, loadoutFor, unitSpecs, playBattle, summarize, checkpoint } from '../data_cave_harness.mjs';

await register();
const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const N = Number(get('--n', 60));
const FLOOR_KEYS = String(get('--floors', '1,1b,5,10,30,60,90,99')).split(',');

export function binderCheck({ n = Math.max(20, Math.floor(N / 2)), level = 58 } = {}) {
  const e = ENCOUNTERS[BINDER_ENCOUNTER_ID];
  const out = { level, byPolicy: {} };
  for (const policy of ['competent', 'naive', 'reckless']) {
    const rows = [];
    for (let i = 0; i < n; i++) {
      const party = makeCaveParty(100, { level });
      rows.push(playBattle({ party, units: e.enemies.map((id) => ({ id, elite: null })), seed: i + 1, policy, inventory: loadoutFor(100).inventory, boss: true, zone: e.zone, encounter: BINDER_ENCOUNTER_ID }));
    }
    out.byPolicy[policy] = summarize(rows);
  }
  return out;
}

const pct = (v) => `${Math.round(v * 100)}%`;
function line(key, c) {
  const s = c.scale;
  return `| B${key} | ${c.level} | ${c.ilvl} | ${s.hp} / ${s.power} / ${s.speed} / ${s.expMul} | ${pct(c.byPolicy.competent.win)} | ${c.byPolicy.competent.rounds.toFixed(2)} (${c.byPolicy.competent.p10}-${c.byPolicy.competent.p90}) | ${pct(c.byPolicy.competent.hpLoss)} | ${c.byPolicy.competent.kos.toFixed(2)} | ${c.byPolicy.naive ? pct(c.byPolicy.naive.win) : '-'} | ${c.byPolicy.naive ? c.byPolicy.naive.rounds.toFixed(2) : '-'} |`;
}

/**
 * The W15 rule for the cave: at a floor's power, no ordinary (non-telegraphed) move of any pool foe, elite or not, fells a
 * full-HP member of the cave party at the arrival level. Returns the worst ratio (max hit / max HP) and who takes it.
 */
export async function oneShot(floor) {
  const { SKILLS } = await import('../../../src/data/skills.js');
  const { memberStats, DEF_K, VARIANCE, ENEMY_CRIT, CRIT_MULT } = await import('../../../src/battle/rules.js');
  const { ELITE_BASE } = await import('../../../src/data/enemies.js');
  const { bandAt } = await import('../../../src/data/cave/foes.js');
  const s = scale(floor);
  const party = makeCaveParty(floor).map((m) => ({ m, s: memberStats(m) }));
  let worst = { ratio: 0 };
  for (const t of bandAt(floor).pool) for (const id of new Set(t.enemies)) {
    const e = ENEMIES[id];
    const boost = s.power * (floor >= 20 ? ELITE_BASE.atk : 1);
    for (const mv of e.moves) {
      const sk = SKILLS[mv.skill];
      if (!sk || !sk.power || sk.telegraph) continue;
      for (const { m, s: ms } of party) {
        const phys = sk.formula === 'phys';
        const A = (phys ? e.atk : e.mag) * boost;
        const D = phys ? ms.def : ms.spr;
        let max = A * sk.power / 100 * DEF_K / (DEF_K + D) * (1 + VARIANCE) * (sk.hits || 1);
        if (phys && ENEMY_CRIT > 0) max *= CRIT_MULT;
        if ((sk.types || []).includes('ink')) max *= 1 - Math.min(80, ms.inkRes || 0) / 100;
        const ratio = max / ms.maxHp;
        if (ratio > worst.ratio) worst = { ratio, foe: id, skill: sk.id, member: m.id, max: Math.ceil(max), hp: ms.maxHp };
      }
    }
  }
  return worst;
}

const isMain = process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]));
if (isMain && args.includes('--oneshot')) {
  const { TUNING } = await import('../../../src/data/cave/foes.js');
  const set = JSON.parse(get('--set', 'null'));
  if (set) Object.assign(TUNING, set);
  for (const key of FLOOR_KEYS) {
    const f = parseInt(key, 10);
    const w = await oneShot(f);
    console.log(`B${String(f).padEnd(3)} power ${String(scale(f).power).padStart(6)}  worst ${(w.ratio * 100).toFixed(0)}% of ${w.member}'s ${w.hp} HP: ${w.foe} ${w.skill} ${w.max}`);
  }
  process.exit(0);
}
if (isMain && args.includes('--grid')) {
  // try tuning sets in place (TUNING is a plain exported object) and print one compact row per floor
  const { TUNING } = await import('../../../src/data/cave/foes.js');
  const SETS = JSON.parse(get('--sets', 'null')) || [
    { kHp: 1.0, kPower: 1.0, hpRamp: 0.0, powerRamp: 0.3 },
    { kHp: 1.2, kPower: 1.2, hpRamp: -0.2, powerRamp: 0.6 },
    { kHp: 1.4, kPower: 1.3, hpRamp: -0.3, powerRamp: 0.8 },
    { kHp: 1.3, kPower: 1.5, hpRamp: -0.25, powerRamp: 1.0 },
    { kHp: 1.5, kPower: 1.4, hpRamp: -0.35, powerRamp: 1.2 },
  ];
  for (const set of SETS) {
    Object.assign(TUNING, set);
    console.log('\n== ' + JSON.stringify(set));
    for (const key of FLOOR_KEYS) {
      const c = checkpoint(key, { n: N });
      const s = c.scale, cp = c.byPolicy.competent, nv = c.byPolicy.naive;
      console.log(`B${String(key).padEnd(3)} Lv${String(c.level).padStart(2)} hp ${String(s.hp).padStart(5)} pw ${String(s.power).padStart(6)} sp ${s.speed} | careful win ${pct(cp.win).padStart(4)} r ${cp.rounds.toFixed(2)} hp ${pct(cp.hpLoss).padStart(3)} ko ${cp.kos.toFixed(2)} | naive win ${pct(nv.win).padStart(4)} r ${nv.rounds.toFixed(2)}`);
    }
  }
  process.exit(0);
}
if (isMain) {
  const t0 = Date.now();
  const md = [];
  md.push(`# Deep Stacks curve sanity (C1-data, ${new Date().toISOString().slice(0, 10)})`, '');
  md.push(`n = ${N} battles per floor and policy; the cave party of data_cave_loadouts.mjs at the curve's arrival level; bestiary known; no elites except the floor's own fixed ones.`, '');
  md.push('Bands: ' + BANDS.map((b) => `${b.k} ${b.id} (native Lv ${b.nativeLevel.toFixed(1)}, mean group EXP ${b.meanExp.toFixed(0)}${b.fallback ? ', EP3 fallback' : ''})`).join('; '), '');
  md.push('EXP pace knots [floor, pace]: ' + JSON.stringify(EXP_PACE_KNOTS), '');
  md.push('| floor | Lv | ilvl | hp / power / speed / expMul | careful win | rounds (p10-p90) | HP lost | KOs | attack-only win | rounds |');
  md.push('|---|---|---|---|---|---|---|---|---|---|');
  const json = { n: N, floors: {}, templates: {} };
  for (const key of FLOOR_KEYS) {
    const c = checkpoint(key, { n: N });
    json.floors[key] = c;
    md.push(line(key, c));
    console.log(line(key, c));
  }
  md.push('', '## Per template (careful play)', '');
  for (const key of FLOOR_KEYS) {
    const c = json.floors[key];
    md.push(`B${key}: ` + Object.entries(c.byTemplate).map(([t, s]) => `${t} ${pct(s.win)} ${s.rounds.toFixed(1)}r ${pct(s.hpLoss)} (n ${s.n})`).join('; '));
  }
  if (args.includes('--binder')) {
    const b = binderCheck();
    json.binder = b;
    md.push('', '## The Binder (B100) at Lv ' + b.level, '');
    for (const [p, s] of Object.entries(b.byPolicy)) md.push(`- ${p}: win ${pct(s.win)}, rounds ${s.rounds.toFixed(2)} (${s.p10}-${s.p90}), HP lost ${pct(s.hpLoss)}, KOs ${s.kos.toFixed(2)}`);
    console.log(md.slice(-4).join('\n'));
  }
  if (args.includes('--runset')) {
    // the sim's own path: LOADOUTS rows for the cave party and registered encounters; rollEncounter drops hp today
    const { runSet } = await import('../../../tools/sim/simulate.mjs');
    const { LOADOUTS } = await import('../../../tools/sim/loadouts.mjs');
    md.push('', '## Through the sim\'s runSet (rollEncounter path: hp multiplier DROPPED today; B10 and B30 are landings, so B11 and B31 fight)', '');
    for (const f of [1, 11, 31]) {
      const row = loadoutFor(f);
      LOADOUTS[`cave_b${f}`] = { hero: { weapon: 'sword', equip: row.hero, mastery: { sword: row.mastery, axe: row.mastery } }, mira: { weapon: row.mira.staff ? 'staff' : 'staff', equip: row.mira, mastery: { staff: row.mastery, bow: row.mastery } }, bram: { weapon: 'spear', equip: row.bram, mastery: { spear: row.mastery, axe: row.mastery } }, inventory: row.inventory };
      const specs = floorEncounters(1000, f);
      registerFloorEncounters(specs);
      const rows = specs.map((s) => runSet({ zone: s.zone, level: arrivalLevel(f), encounter: s.id, n: Math.max(10, Math.floor(N / specs.length)), policy: 'competent', loadout: `cave_b${f}` }));
      const win = rows.reduce((a, r) => a + r.win, 0) / rows.length, rounds = rows.reduce((a, r) => a + r.rounds, 0) / rows.length;
      const l = `- B${f} (${specs.length} encounters of seed 1000, Lv ${arrivalLevel(f)}): careful win ${pct(win)}, rounds ${rounds.toFixed(2)}`;
      md.push(l); console.log(l);
    }
  }
  md.push('', `(${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  fs.writeFileSync(path.join(HERE, 'cave_sanity.md'), md.join('\n') + '\n');
  fs.writeFileSync(path.join(HERE, 'cave_sanity.json'), JSON.stringify(json, null, 1));
  console.log(`written ${path.join(HERE, 'cave_sanity.md')} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
