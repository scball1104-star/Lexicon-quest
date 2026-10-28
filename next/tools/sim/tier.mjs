// Fine Print (tier_1) in the balance simulator (H7-hard-road; docs/TIER.md, docs/HARD_ROAD.md "Built").
//
//   node tools/sim/simulate.mjs --tier 1            the tier suite: Episode 1 (main route, the Hollow, the Wider Valley) and
//                                                   Episode 2, every fight on the tier, at the carried party's level
//   node tools/sim/simulate.mjs --tier 1 --check    exit 1 if a target is missed (DESIGN 7's bands, every boss's own target, the
//                                                   tier economy); `--check` without --tier is unchanged
//   node tools/sim/simulate.mjs --tier 1 --n 100 --json   fewer battles; also write tools/sim/out/tier.json
//
// The carried party is the simulator's Episode 2 finish: `sand_road`'s kit (the court_throne row plus the Kept Promise and tier 4
// pieces; src/game/state.js EP3_START mirrors it) with the flag tier_1. Each zone is played at the level the tier's own progression
// meets it at: the record's 3,335 EXP plus 1.5x the base EXP to that point (tierLevelFor). The same TARGETS hold (ordinary 3 to 5
// rounds, HP lost at most half, careful play wins, attack-only noticeably worse; Echo Warden 6 to 8, Archivore 8 to 12 and the
// rest of the bosses their own bands); the main route's level bands do not apply on the tier (its levels are its own, printed).
// This module never imports simulate.mjs (the CLI's top-level await would deadlock the cycle): simulate.mjs passes its functions in.

import { LOADOUTS, ALPHA_TIER_RUNS, knownBestiary } from './loadouts.mjs';
import { createBattle, makeRng } from '../../src/battle/rules.js';
import { partyAction } from '../../src/battle/ai.js';
import { ENCOUNTERS as ENC, rollEncounter } from '../../src/data/encounters.js';
import { ENCOUNTERS, ZONES, ZONE_ORDER, EP2_ZONE_ORDER, encounterExp } from '../../src/data/encounters.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { ITEMS } from '../../src/data/items.js';
import { SHOPS, shopStock } from '../../src/data/shops.js';
import { expForLevel, levelForExp, newMember } from '../../src/data/party.js';
import { register } from '../../src/data/tier/index.js';
import { TIER_TABLE, TIER_FLAG, TIER_SHOP_ROWS, tierPrice, liftLevel, metLevel } from '../../src/data/tier/tier.js';

register();   // the legendaries, the shop rows and globalThis.LQ_TIER (the hooks rules.js and loot.js read)

export const T = TIER_TABLE[1];
/** The carried kit: the Episode 2 finish (sand_road) with the tier's flag. */
LOADOUTS.tier_carry = { ...LOADOUTS.sand_road, flags: [TIER_FLAG] };
export const TIER_LOADOUT = 'tier_carry';
/** The purse the record carries in: the Episode 3 quick start's (state.js EP3_START gold), an Episode 2 finisher's. */
export const CARRY_GOLD = 1500;

/** The party's level on the tier at the point where the base game is at level L (the record's EXP plus the tier's pay). */
export function tierLevelFor(L) { return metLevel(L); }

const groupGold = (enc) => ENCOUNTERS[enc].enemies.reduce((s, e) => s + ENEMIES[e].gold, 0);

/** The tier's progression: every zone plan of Episode 1 then Episode 2 once, from the record's EXP, at the tier's pay. */
export function tierProgression(start = T.lift.carryExp) {
  let exp = start;
  const rows = [];
  for (const [ep, order] of [[1, ZONE_ORDER], [2, EP2_ZONE_ORDER]]) {
    for (const z of order) {
      const startLevel = levelForExp(exp);
      let base = 0;
      for (const [enc, count] of ZONES[z].plan) base += encounterExp(enc) * count;
      exp = Math.round(exp + base * T.exp);
      rows.push({ episode: ep, zone: z, startLevel, endLevel: levelForExp(exp), exp });
    }
  }
  return rows;
}

/** The tier suite: like simulate.mjs runSuite, at the tier's levels with the carried kit. deps: { runSet, SUITE_LEVELS, BOSS_LEVELS, BOSS_TARGETS }. */
export function tierSuite({ n = 400, zones, policies = ['competent', 'naive'], elites = true } = {}, deps) {
  const { runSet, SUITE_LEVELS, BOSS_LEVELS, BOSS_TARGETS } = deps;
  const out = [];
  const lv = (list) => [...new Set(list.map(tierLevelFor))];
  for (const z of zones) {
    const zone = ZONES[z];
    if (!zone) continue;
    const levels = lv(SUITE_LEVELS[z] || [zone.level[0]]);
    for (const [enc] of zone.plan) {
      const isBoss = ENCOUNTERS[enc].boss;
      const at = BOSS_LEVELS[enc] ? lv(BOSS_LEVELS[enc]) : isBoss ? lv([zone.level[0]]) : levels;
      const pols = (level) => (BOSS_TARGETS.includes(enc) && level === at[0] ? [...new Set([...policies, 'reckless'])] : policies);
      for (const level of at) for (const policy of pols(level)) out.push(runSet({ zone: z, level, encounter: enc, n, policy, loadout: TIER_LOADOUT }));
      if (elites && !isBoss) out.push(runSet({ zone: z, level: at[at.length - 1], encounter: enc, n: Math.max(20, Math.floor(n / 4)), policy: 'competent', elite: true, loadout: TIER_LOADOUT }));
    }
    // the Briar Alpha's Elder tiers (a party that reaches the Hollow late; the story picks one by progress): the Alpha's own target
    if (z === 'whisperwood_hollow') {
      for (const run of ALPHA_TIER_RUNS) for (const level of lv(run.levels)) for (const policy of policies) {
        out.push(runSet({ zone: z, level, encounter: run.encounter, n, policy, loadout: TIER_LOADOUT }));
      }
    }
  }
  return out;
}

/**
 * The first fight on the tier: the bakery-yard slime (H1, encounters.js yard_slime) against the carried hero alone, Lv 13 in the
 * Episode 2 finish kit, careful play. Target: the hero wins every time in two to five rounds and loses some HP (the base game's
 * Lv 1 hero takes a few rounds; at HP x1.6 without the lift it would fall to one swing).
 */
export function firstFight({ n = 200, policy = 'competent' } = {}) {
  const L = LOADOUTS[TIER_LOADOUT];
  const rows = [];
  for (let seed = 1; seed <= n; seed++) {
    const rng = makeRng(seed * 7919 + 17);
    const hero = newMember('hero', { level: levelForExp(T.lift.carryExp) });
    hero.weapon = L.hero.weapon;
    hero.equip = { ...Object.fromEntries(Object.keys(hero.equip).map((k) => [k, null])), ...L.hero.equip };
    hero.mastery = { ...hero.mastery, ...L.hero.mastery };
    const spec = rollEncounter('yard_slime', rng, { noElite: true });
    const e = ENC.yard_slime;
    const b = createBattle({ party: [hero], enemies: spec.enemies, rng,
      options: { inventory: { potion: 2 }, boss: e.boss, canFlee: !e.noFlee, zone: e.zone, encounter: 'yard_slime', bestiary: knownBestiary(), flags: [TIER_FLAG] } });
    let steps = 0;
    while (!b.isOver() && steps++ < 600) {
      const u = b.current();
      if (u.side === 'party') { const evs = b.perform(partyAction(b, policy)); if (evs.length === 1 && evs[0].type === 'invalid') b.perform({ type: 'defend' }); }
      else b.runEnemyTurn();
    }
    const r = b.result() || { outcome: 'timeout', rounds: 99 };
    const h = b.units().find((x) => x.side === 'party');
    rows.push({ win: r.outcome === 'victory', rounds: r.rounds, hpLoss: 1 - (h.alive ? h.hp : 0) / h.maxHp });
  }
  const avg = (k) => rows.reduce((s, x) => s + Number(x[k]), 0) / rows.length;
  return { n, win: avg('win'), rounds: avg('rounds'), hpLoss: avg('hpLoss') };
}
export function checkFirstFight(f = firstFight()) {
  const fails = [];
  if (f.win < 1) fails.push(`first fight (yard slime, the hero alone): win ${pct(f.win)}`);
  if (f.rounds < 2 || f.rounds > 5) fails.push(`first fight (yard slime, the hero alone): ${f.rounds.toFixed(2)} rounds outside 2-5`);
  if (f.hpLoss <= 0) fails.push('first fight (yard slime, the hero alone): the slime never lands a hit');
  return fails;
}

/**
 * The tier's gold (the base economy() idea, on the tier): the carried purse plus battle gold at x1.5 along the main route of
 * Episode 1 (a floor: no chests, sales or drops), against the Willowmere Forge's tier rows. The plan: one tier 5 piece on the
 * first morning, two more before the Rootbound Stacks, never the whole tier stock by the credits, so gold keeps a use from
 * the first morning to the end.
 */
export function economyTier({ startGold = CARRY_GOLD } = {}) {
  const rows = [];
  let gold = startGold;
  for (const z of ZONE_ORDER) {
    const earned = Math.round(ZONES[z].plan.reduce((g, [enc, n]) => g + groupGold(enc) * n, 0) * T.gold);
    rows.push({ zone: z, arrive: gold, earned });
    gold += earned;
  }
  const flags = { [TIER_FLAG]: true };
  const stock = shopStock('willowmere_smithy', flags).filter((s) => s.ifFlag === TIER_FLAG);
  const price = (s) => s.price ?? ITEMS[s.item].price;
  const t5 = stock.filter((s) => ITEMS[s.item].ilvl >= 14).map(price).sort((a, b) => a - b);
  const everything = stock.reduce((n, s) => n + price(s), 0);
  const beforeF3 = rows.find((r) => r.zone === 'archive_f3').arrive;
  return { rows, start: startGold, end: gold, beforeF3, cheapestT5: t5[0] || 0, threeT5: (t5[0] || 0) + (t5[1] || 0) + (t5[2] || 0), everything,
    hollowRows: shopStock('hollow_smithy', flags).filter((s) => s.ifFlag === TIER_FLAG).length, stockRows: stock.length };
}
export function checkEconomyTier(e = economyTier()) {
  const fails = [];
  if (!e.stockRows || !e.hollowRows) fails.push(`economy (tier): the tier rows are missing (Willowmere ${e.stockRows}, the Hollow ${e.hollowRows})`);
  if (e.start < e.cheapestT5) fails.push(`economy (tier): the carried ${e.start} gold does not buy one tier 5 piece (${e.cheapestT5})`);
  if (e.beforeF3 < e.threeT5) fails.push(`economy (tier): ${e.beforeF3} gold before the Stacks, three tier 5 pieces cost ${e.threeT5}`);
  if (e.end >= e.everything) fails.push(`economy (tier): ${e.end} gold by the end of Episode 1 buys the whole tier stock (${e.everything})`);
  return fails;
}

/** The tier's own sanity: the table is the brief's, the shop rows sit at the tier's price, the carry point is the sim's. */
export function checkTable(progression) {
  const fails = [];
  const want = { hp: 1.6, pow: 1.35, spd: 1 };
  for (const [k, v] of Object.entries(want)) if (T.foe[k] !== v) fails.push(`tier table: foe ${k} is ${T.foe[k]}, the brief says ${v}`);
  if (T.exp !== 1.5) fails.push(`tier table: EXP x${T.exp}, the brief says x1.5`);
  if (T.ilvl !== 6 || T.ilvlCap !== 16) fails.push(`tier table: item level +${T.ilvl} capped at ${T.ilvlCap}, the brief says +6 capped at 16`);
  const ep2 = progression(1, 2).slice(-1)[0].exp;
  if (ep2 !== T.lift.carryExp) fails.push(`tier table: carryExp ${T.lift.carryExp} is not the simulator's Episode 2 finish (${ep2})`);
  for (const [shopId, ids] of Object.entries(TIER_SHOP_ROWS)) {
    for (const id of ids) {
      const row = SHOPS[shopId].stock.find((s) => s.item === id && s.ifFlag === TIER_FLAG);
      if (!row) fails.push(`tier rows: ${shopId} lacks ${id}`);
      else if (row.price !== tierPrice(ITEMS[id].price)) fails.push(`tier rows: ${shopId} ${id} at ${row.price}, the tier price is ${tierPrice(ITEMS[id].price)}`);
    }
  }
  return fails;
}

const pct = (v) => `${Math.round(v * 100)}%`;

/** The CLI (simulate.mjs --tier 1 hands over here). Returns the exit code. */
export async function tierMain(args, deps) {
  const get = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
  const which = Number(get('--tier', 1));
  if (which !== 1) { console.log(`There is one tier (Fine Print, tier_1); --tier ${which} does not exist.`); return 2; }
  const n = Number(get('--n', 400));
  const zone = get('--zone', null);
  const episode = get('--episode', null);
  const t0 = Date.now();
  const { EPISODES, checkTargets, formatTable, progression } = deps;
  const zones = zone ? [zone] : episode ? EPISODES[episode] : [...EPISODES[1], ...EPISODES[2]];
  const rows = tierSuite({ n, zones }, deps);
  const lag = T.lift.lag;
  console.log(`Fine Print (tier_1): foes HP x${T.foe.hp}, ATK and MAG x${T.foe.pow}, SPD +${T.foe.spd} after the lift (HP to the party's level less ${lag.hp}, `
    + `the hit less ${lag.pow}, the tempo less ${lag.spd}; ${Object.keys(T.terms).length} encounter terms); EXP x${T.exp}, gold x${T.gold}; drops item level +${T.ilvl} (cap ${T.ilvlCap})`);
  console.log(`Carried kit: sand_road (the Episode 2 finish) from ${T.lift.carryExp} EXP. The party meets a foe of level `
    + `${[2, 3, 4, 6, 7, 8, 11, 13].map((L) => `${L} at Lv ${metLevel(L)} (its HP as Lv ${liftLevel(L, 'hp')})`).join(', ')}\n`);
  console.log(formatTable(rows));
  console.log('\nProgression on the tier (each zone plan once, from the record):');
  for (const p of tierProgression()) console.log(`  Episode ${p.episode} ${p.zone.padEnd(13)} Lv ${p.startLevel} -> ${p.endLevel}  (total EXP ${p.exp})`);
  const fails = checkTargets(rows, []);
  if (!zone) {
    fails.push(...checkTable(progression));
    const ff = firstFight({ n: Math.min(n, 200) });
    console.log(`\nFirst fight (the yard slime, the carried hero alone at Lv ${levelForExp(T.lift.carryExp)}): win ${pct(ff.win)}, ${ff.rounds.toFixed(2)} rounds, ${pct(ff.hpLoss)} HP lost`);
    fails.push(...checkFirstFight(ff));
    const e = economyTier();
    console.log(`\nEconomy (tier): ${e.rows.map((r) => `${r.zone} arrive ${r.arrive} +${r.earned}`).join(', ')}; carried ${e.start} (one tier 5 at the tier price: ${e.cheapestT5}), before the Stacks ${e.beforeF3} `
      + `(three tier 5: ${e.threeT5}), end of Episode 1 ${e.end} (the whole Willowmere tier stock: ${e.everything}, ${e.stockRows} rows; the Hollow ${e.hollowRows} rows)`);
    fails.push(...checkEconomyTier(e));
  }
  console.log(`\n${fails.length ? 'TARGETS MISSED:\n  ' + fails.join('\n  ') : 'All targets met.'}`);
  console.log(`(${rows.reduce((s, r) => s + r.n, 0)} battles in ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  const summary = rows.filter((r) => r.policy === 'competent' && !r.elite).map((r) => ({ zone: r.zone, encounter: r.encounter, level: r.level, win: r.win, rounds: +r.rounds.toFixed(2), hpLoss: +r.hpLoss.toFixed(3) }));
  if (args.includes('--json')) {
    const fs = await import('node:fs');
    fs.mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
    fs.writeFileSync(new URL('./out/tier.json', import.meta.url), JSON.stringify({ rows, summary, progression: tierProgression(), economy: economyTier(), fails }, null, 1));
  }
  console.log(`TIER_SIM: ${JSON.stringify({ rows: rows.length, fails: fails.length, minCarefulWin: pct(Math.min(...summary.map((r) => r.win))) })}`);
  return args.includes('--check') && fails.length ? 1 : 0;
}
