// The Deep Stacks (docs/DEEP_STACKS_PLAN.md sections 4, 5, 11): the five bands and their foe pools, the per-floor scaling
// curve, the deterministic encounter picker, the per-floor encounter registration and the Binder (B100). Pure data and
// pure helpers over the shared tables; nothing here touches the DOM. Written by C1-data; C3-sim-bot owns the numbers next.
//
// HOW THE CURVE WORKS (scale(floor) -> { hp, power, speed, expMul, elite })
//   The pools reuse foes the main game tuned for a known party level (the valley for Lv 2 to 3, the Court for Lv 10 to 13 ...).
//   The cave party is somewhere else entirely: Lv 1 with empty hands on B1, about Lv 59 with tier 6 finds on B99. So the
//   multipliers are RATIOS of party strength, read from the party's own stat tables (data/party.js statsAt) plus the gear
//   the floor's item level hands out, over the strength of the party the pool was tuned for:
//     hp     = ramp(f) x  offence(cave party at floor f) / offence(native party of the band)
//              offence = mean ATK of the three + the weapon ATK the floor's item level gives
//     power  = ramp(f) x  toughness(cave party) / toughness(native party)
//              toughness = mean HP x the DEF_K/(DEF_K + DEF) armour term (0.6 physical, 0.4 magical)
//     speed  = mean SPD(cave party) / mean SPD(native), clamped 0.8 to 2
//     ramp   = 1 + DEPTH_RAMP x (f - 1) / 98: the Stacks get harder than parity the deeper they go (plan 11's rising death bands)
//     expMul = what the plan's level curve needs (plan 2.4: Lv 12 by B10, 25 by B30, 40 by B60, 55 by B90), per fight, from
//              the band's mean raw EXP and the plan's 4 + floor/10 fights a floor (landings fight nothing, their share goes to the
//              nine floors before them). EXP_BASE_MUL (1.5) is the plan's figure; the rest of the multiple is depth pace.
//   The party level on a floor is read back from the EXP the curve pays (the fit lands LEVEL_ANCHORS: Lv 12 leaving B9, 25
//   leaving B29, 40 leaving B59, 55 leaving B89, 59 leaving B99), so the curve and the EXP agree by construction. The floor is
//   tuned to the level the party ARRIVES with (its first fight is the hardest). Within a band the raw multipliers rise with the
//   floor; at a band edge they DROP because the new pool is natively stronger: the product (foe x multiplier) keeps rising.
//   `power` is also capped by the W15 rule (powerCapAt: no ordinary action may fell a full-HP member, Mira being the softest),
//   and B1 and B2 carry an opening ease (OPENING_EASE). qa/cave/data_foes.test.mjs pins all of it.
//
//   The numbers (TUNING kHp 1.25, kPower 1.5, hpRamp -0.45, powerRamp 1.2; EP3_LIVE=false, so bands 4 and 5 are the fallback
//   court pools with a two-mod elite leader on every group; the pace knots [floor, pace] are [0, 2.03] [9, 2.03] [29, 2.06]
//   [59, 1.46] [89, 0.74] [99, 0.98], and refit themselves when the Episode 3 pools go live):
//     floor  party  hp    power  speed  expMul  elite      floor  party  hp    power  speed  expMul  elite
//     B1     Lv 1   0.56   0.69   0.91   3.05    0         B45    Lv 33  2.89  11.69   2.01   2.62    1
//     B10    Lv 12  2.82   6.43   1.43   3.05    0         B60    Lv 40  2.78  18.06   2.15   2.16    2
//     B20    Lv 17  2.43   7.07   1.46   3.08    1         B90    Lv 55  3.57  39.91   3.04   1.15    2
//     B30    Lv 25  3.58  16.22   1.89   3.06    1         B99    Lv 59  3.49  45.00   3.23   1.48    2
//   Sim (qa/cave/out/cave_sanity.md, 60 fights a floor, the cave party of qa/cave/data_cave_harness.mjs): careful play wins
//   100% at every checkpoint in 3.3 to 5.1 rounds losing 14 to 28% HP; attack-only wins 90% on B1, 72% on B10, 27% on B30,
//   3 to 22% from B60. Regenerate with `node qa/cave/out/cave_sanity.mjs --n 60 --binder`.
//
// ELITES: none before B20, one modifier B20 to B49, two from B50 (plan 5.2), rolled deterministically by encounterFor at
//   ELITE_RATE_DEEP and written into the spec as a fixed `elite: { mods, index }` (encounters.js honours a fixed elite whatever
//   the caller's noElite says), so a floor's elites are the same on every machine. Every cave encounter is `noElite: true` so the
//   live rollEncounter adds no second, random one. Band 5 and the fallback pools carry `elite: 2` on the template: a two-mod
//   elite leader every time ("every earlier pool's elites").
//
// THE hp MULTIPLIER NEEDS ONE SHARED LINE: battle/rules.js makeEnemyUnit applies spec.hp, but encounters.js rollEncounter copies
//   only power, speed and expMul into the unit spec (checked 2026-10-26: the H1 yard slime's hp 0.55 is dropped the same way).
//   The integrator adds `if (e.hp) spec.hp = e.hp;` beside the power line there. Until then every cave foe has its base HP.

import { ENEMIES, enemy, ELITE_BASE, RANDOM_ELITE_MODS } from '../enemies.js';
import { ENCOUNTERS, ZONES, enc } from '../encounters.js';
import { statsAt, expForLevel, levelForExp, PARTY_IDS } from '../party.js';
import { SKILLS } from '../skills.js';
import { VARIANCE, ENEMY_CRIT, CRIT_MULT } from '../../battle/rules.js';
import { EP3_LIVE } from '../../game/episodes.js';
import { createRng, hashSeed } from '../../core/rng.js';

// ---------------------------------------------------------------- floors
export const FLOORS = 100;
export const LANDING_EVERY = 10;
export const BOSS_FLOOR = 100;
/** B10, B20 ... B90: no foes, one red chest, the Bookmark when the party holds none, the suspend save. */
export function isLanding(floor) { return floor > 0 && floor < BOSS_FLOOR && floor % LANDING_EVERY === 0; }
/** Band number 1..5 of a floor (B100 reads as band 5 for lookups). */
export function bandIndex(floor) { return floor <= 19 ? 1 : floor <= 39 ? 2 : floor <= 59 ? 3 : floor <= 79 ? 4 : 5; }
/** Visible foes on a floor: 4 + floor/10, at most 12; none on a landing or on B100 (plan 4). C1-gen places this many. */
export function foesPerFloor(floor) {
  if (floor < 1 || floor >= BOSS_FLOOR || isLanding(floor)) return 0;
  return Math.min(12, 4 + Math.floor(floor / 10));
}
/** The floor's item level (plan 6.1): min(16, 1 + floor/6), whole numbers. B1 1, B6 2, B30 6, B60 11, B90 16. */
export function itemLevel(floor) { return Math.max(1, Math.min(16, Math.floor(1 + floor / 6))); }
/** The loot and battle zone id of a floor's band (registered on ZONES and ZONE_LOOT by the pack). */
export function zoneIdFor(floor) { return floor >= BOSS_FLOOR ? 'cave_boss' : `cave_band_${bandIndex(floor)}`; }

// ---------------------------------------------------------------- the party level curve (plan 2.4)
/** [floor left, party level on leaving it]: the plan's "Lv 12 by B10" is Lv 12 on leaving B9. The EXP pace is fitted to these. */
export const LEVEL_ANCHORS = [[0, 1], [9, 12], [29, 25], [59, 40], [89, 55], [99, 59]];
/** Total EXP at a (fractional) level, interpolating the party's EXP table. */
export function expAtLevel(level) {
  const lo = Math.floor(level), frac = level - lo;
  return expForLevel(lo) + (frac ? (expForLevel(lo + 1) - expForLevel(lo)) * frac : 0);
}
/** Fractional level at a total EXP (the inverse of expAtLevel). */
export function levelAtExp(exp) {
  const L = levelForExp(Math.max(0, exp));
  if (L >= 99) return 99;
  const a = expForLevel(L), b = expForLevel(L + 1);
  return L + (exp - a) / (b - a);
}

// ---------------------------------------------------------------- bands and pools (plan 4 and 5.1)
// A template: { id, leader, enemies, weight, move, elite? }. `leader` is the field sprite (first in `enemies`); `move` is the
// field behaviour the generator gives the event ('chase' | 'wander'); `elite: 2` fixes a two-mod elite on the leader every time.
const T = (id, enemies, weight, move = 'chase', extra = {}) => ({ id, leader: enemies[0], enemies, weight, move, ...extra });

const POOL_CATALOGUE = [   // valley and Archive F1 foes (Lv 2 to 4)
  T('slimes', ['ink_slime', 'ink_slime'], 3, 'wander'),
  T('wolves', ['briar_wolf', 'briar_wolf'], 3),
  T('scarab', ['moss_scarab', 'ink_slime'], 2, 'wander'),
  T('mites', ['bookmite', 'bookmite', 'bookmite'], 2),
  T('wraith', ['page_wraith', 'bookmite'], 2, 'wander'),
  T('mixed', ['briar_wolf', 'moss_scarab', 'ink_slime'], 2),
  T('pack', ['briar_wolf', 'briar_wolf', 'briar_wolf'], 1),
  T('wraiths', ['page_wraith', 'page_wraith'], 1, 'wander'),
];
const POOL_CELLARS = [     // Archive F2, F3 and Whisperwood Hollow foes (Lv 6 to 7)
  T('golem', ['tome_golem', 'bookmite'], 2, 'wander'),
  T('wraiths', ['ink_wraith', 'page_wraith'], 3, 'wander'),
  T('blots', ['ink_blot', 'ink_blot'], 2, 'wander'),
  T('thornbacks', ['thornback_wolf', 'thornback_wolf'], 3),
  T('golem_wraith', ['tome_golem', 'ink_wraith'], 2, 'wander'),
  T('mixed', ['thornback_wolf', 'ink_blot', 'bookmite'], 2),
  T('ink', ['ink_wraith', 'ink_wraith'], 1, 'wander'),
  T('shelf', ['tome_golem', 'tome_golem'], 1, 'wander'),
];
const POOL_COURT = [       // Episode 2 road and Court foes (Lv 9 to 13)
  T('wolves', ['mist_wolf', 'mist_wolf'], 2),
  T('beetles', ['glassback', 'quicksilver'], 2, 'wander'),
  T('wisps', ['glint_wisp', 'glint_wisp'], 2, 'wander'),
  T('sentinel', ['glass_sentinel', 'quicksilver'], 2, 'wander'),
  T('knight', ['faceless_knight', 'glint_wisp'], 3),
  T('shadows', ['borrowed_shadow', 'shard_swarm'], 2),
  T('shards', ['shard_swarm', 'shard_swarm'], 2, 'wander'),
  T('court', ['faceless_knight', 'glass_sentinel', 'shard_swarm'], 1),
  T('shadow_pair', ['borrowed_shadow', 'borrowed_shadow'], 1),
];
const POOL_EMBER = [       // Episode 3 road and Foundry F1/F2 foes (Lv 13 to 15); needs EP3_LIVE
  T('hounds', ['cinder_hound', 'cinder_hound'], 3),
  T('beetles', ['cinder_beetle', 'cinder_beetle'], 2, 'wander'),
  T('slimes', ['slag_slime', 'slag_slime', 'slag_slime'], 2, 'wander'),
  T('miners', ['ashbound_miner', 'ashbound_miner'], 2),
  T('phantoms', ['soot_phantom', 'soot_phantom'], 2, 'wander'),
  T('construct', ['furnace_construct', 'soot_phantom'], 2, 'wander'),
  T('mixed', ['cinder_hound', 'slag_slime', 'cinder_beetle'], 2),
  T('foundry', ['furnace_construct', 'ashbound_miner'], 1, 'wander'),
];
const POOL_FORGE = [       // Foundry F3 foes plus every earlier pool's elites (Lv 16 and two-mod elites); needs EP3_LIVE
  T('defenders', ['forge_defender', 'soot_phantom'], 3),
  T('furnace', ['furnace_construct', 'furnace_construct'], 2, 'wander'),
  T('defender_pair', ['forge_defender', 'forge_defender'], 2),
  T('forge_mixed', ['forge_defender', 'slag_slime', 'slag_slime'], 2),
  T('elite_knights', ['faceless_knight', 'faceless_knight'], 2, 'chase', { elite: 2 }),
  T('elite_shelf', ['tome_golem', 'ink_wraith', 'ink_wraith'], 1, 'wander', { elite: 2 }),
  T('elite_pack', ['thornback_wolf', 'thornback_wolf', 'thornback_wolf'], 1, 'chase', { elite: 2 }),
  T('elite_shadows', ['borrowed_shadow', 'shard_swarm'], 1, 'chase', { elite: 2 }),
];
// EP3_LIVE false: bands 4 and 5 fall back to the hardest earlier pools with a two-mod elite leader on every group (the brief).
const POOL_FALLBACK_4 = [
  T('knight', ['faceless_knight', 'glint_wisp'], 3, 'chase', { elite: 2 }),
  T('sentinel', ['glass_sentinel', 'shard_swarm'], 2, 'wander', { elite: 2 }),
  T('shadows', ['borrowed_shadow', 'shard_swarm'], 2, 'chase', { elite: 2 }),
  T('shards', ['shard_swarm', 'shard_swarm'], 2, 'wander', { elite: 2 }),
  T('court', ['faceless_knight', 'glass_sentinel', 'shard_swarm'], 1, 'chase', { elite: 2 }),
  T('shadow_pair', ['borrowed_shadow', 'borrowed_shadow'], 1, 'chase', { elite: 2 }),
];
const POOL_FALLBACK_5 = [
  T('knights', ['faceless_knight', 'faceless_knight'], 3, 'chase', { elite: 2 }),
  T('court', ['faceless_knight', 'glass_sentinel', 'shard_swarm'], 2, 'chase', { elite: 2 }),
  T('shadow_pair', ['borrowed_shadow', 'borrowed_shadow'], 2, 'chase', { elite: 2 }),
  T('sentinels', ['glass_sentinel', 'glass_sentinel', 'glint_wisp'], 2, 'wander', { elite: 2 }),
  T('shards', ['shard_swarm', 'shard_swarm', 'shard_swarm'], 1, 'wander', { elite: 2 }),
  T('elite_shelf', ['tome_golem', 'ink_wraith', 'ink_wraith'], 1, 'wander', { elite: 2 }),
];

const BAND_ROWS = [
  { k: 1, id: 'catalogue', name: 'The Catalogue', floors: [1, 19], tileset: 'archive', music: 'archive', backdrop: 'archive', wantsBackdrop: 'archive' },
  { k: 2, id: 'root_cellars', name: 'The Root Cellars', floors: [20, 39], tileset: 'hollow', music: 'hollow', backdrop: 'hollow', wantsBackdrop: 'hollow' },
  { k: 3, id: 'court_below', name: 'The Court Below', floors: [40, 59], tileset: 'court', music: 'court', backdrop: 'court_deep', wantsBackdrop: 'court_deep' },
  // battle.js has no ember or forge stage yet (an unknown key falls back to the valley), so these two name existing stages and
  // record the one they want for C2-sprites-boss / C4.
  { k: 4, id: 'ember_shelves', name: 'The Ember Shelves', floors: [60, 79], tileset: 'ember', music: 'ash_road', backdrop: 'archive_deep', wantsBackdrop: 'foundry' },
  { k: 5, id: 'forge_of_names', name: 'The Forge of Names', floors: [80, 99], tileset: 'forge', music: 'foundry', backdrop: 'boss', wantsBackdrop: 'crucible' },
];

/** Mean raw EXP a template's group pays (a fixed elite leader pays ELITE_BASE.exp times its row). */
function templateExp(t) {
  return t.enemies.reduce((s, id, i) => s + (ENEMIES[id] ? ENEMIES[id].exp : 0) * (t.elite && i === 0 ? ELITE_BASE.exp : 1), 0);
}
/** The party level a template was tuned for: the mean foe level, plus a level and a half for a fixed two-mod elite. */
function templateLevel(t) {
  const lv = t.enemies.reduce((s, id) => s + (ENEMIES[id] ? ENEMIES[id].level : 1), 0) / t.enemies.length;
  return lv + (t.elite ? 1.5 : 0);
}
function weightedMean(pool, fn) {
  const w = pool.reduce((s, t) => s + t.weight, 0);
  return pool.reduce((s, t) => s + fn(t) * t.weight, 0) / w;
}

/**
 * The five bands with their pools: { k, id, name, floors, tileset, music, backdrop, pool, nativeLevel, meanExp }.
 * `ep3Live` false swaps the Episode 3 pools for the fallbacks (the live value is game/episodes.js EP3_LIVE).
 */
export function buildBands(ep3Live = EP3_LIVE) {
  const pools = [POOL_CATALOGUE, POOL_CELLARS, POOL_COURT, ep3Live ? POOL_EMBER : POOL_FALLBACK_4, ep3Live ? POOL_FORGE : POOL_FALLBACK_5];
  return BAND_ROWS.map((row, i) => {
    const pool = pools[i].map((t) => ({ ...t, enemies: t.enemies.slice() }));
    return { ...row, pool, fallback: !ep3Live && i >= 3, nativeLevel: weightedMean(pool, templateLevel), meanExp: weightedMean(pool, templateExp) };
  });
}
export const BANDS = buildBands(EP3_LIVE);
export function bandAt(floor) { return BANDS[bandIndex(floor) - 1]; }

// ---------------------------------------------------------------- party strength proxies
// The three members' table stats at a (fractional) level: per member, and the mean.
function memberAt(id, level) {
  const L = Math.max(1, Math.min(99, level));
  const lo = Math.floor(L), frac = L - lo;
  const a = statsAt(id, lo), b = frac ? statsAt(id, lo + 1) : a;
  const out = {};
  for (const k of ['hp', 'atk', 'def', 'mag', 'spr', 'spd']) out[k] = a[k] + (b[k] - a[k]) * frac;
  return out;
}
function partyAt(level) {
  const ms = PARTY_IDS.map((id) => memberAt(id, level));
  const mean = (k) => ms.reduce((s, m) => s + m[k], 0) / ms.length;
  return { hp: mean('hp'), atk: mean('atk'), def: mean('def'), spr: mean('spr'), spd: mean('spd'), members: ms };
}
// Weapon mastery as a damage factor (party.js MASTERY_DAMAGE_PER_LEVEL, 3% a level over 1, and the M8 passive): the cave party
// earns about five points a fight from zero; the main game's party sits at the mastery of tools/sim/loadouts.mjs for its level.
const MASTERY_XP = [0, 25, 70, 140, 240, 380, 560, 800];
function masteryFactor(points) {
  let lv = 1;
  for (let i = 1; i < MASTERY_XP.length; i++) if (points >= MASTERY_XP[i]) lv = i + 1;
  return 1 + 0.03 * (lv - 1) + (lv >= 8 ? 0.05 : 0);
}
function cumulativeFights(floor) { let n = 0; for (let f = 1; f < floor; f++) n += foesPerFloor(f); return n; }
export const MASTERY_PER_FIGHT = 5;
function caveMastery(floor) { return Math.min(800, MASTERY_PER_FIGHT * cumulativeFights(floor)); }
const NATIVE_MASTERY = [[1, 12], [3.5, 45], [6.5, 100], [8, 170], [11, 290], [14.5, 460], [16.5, 580], [20, 800]];
function nativeMastery(level) {
  for (let i = 1; i < NATIVE_MASTERY.length; i++) {
    const [l0, m0] = NATIVE_MASTERY[i - 1], [l1, m1] = NATIVE_MASTERY[i];
    if (level <= l1) return m0 + (m1 - m0) * (level - l0) / (l1 - l0);
  }
  return 800;
}
// Gear the cave party typically wears at an item level: the best weapon and armour set that can roll there, less a little
// for what the chests really gave (data/items.js tiers). B1 starts with nothing; the first three floors ramp up to it.
const CAVE_WEAPON_ATK = [0, 6, 12, 12, 12, 19, 19, 19, 22, 22, 22, 27, 27, 27, 33, 33, 38];
const CAVE_ARMOR_DEF = [0, 3, 8, 9, 13, 18, 18, 21, 21, 24, 24, 30, 30, 30, 36, 36, 44];
function caveGear(floor) {
  const il = itemLevel(floor);
  const ramp = Math.min(1, Math.max(0, (floor - 1) / 3));
  return { W: CAVE_WEAPON_ATK[il] * ramp, A: CAVE_ARMOR_DEF[il] * ramp };
}
// The main game's party gear at the level a pool was tuned for (tools/sim/loadouts.mjs rows: weapon ATK, worn DEF).
const NATIVE_GEAR = [[1, 6, 3], [3.5, 7, 7], [6.5, 14, 14], [11, 25, 22], [14.5, 32, 32], [16.5, 38, 39], [20, 42, 46]];
function nativeGear(level) {
  for (let i = 1; i < NATIVE_GEAR.length; i++) {
    const [l0, w0, a0] = NATIVE_GEAR[i - 1], [l1, w1, a1] = NATIVE_GEAR[i];
    if (level <= l1) { const u = (level - l0) / (l1 - l0); return { W: w0 + (w1 - w0) * u, A: a0 + (a1 - a0) * u }; }
  }
  const [, w, a] = NATIVE_GEAR[NATIVE_GEAR.length - 1];
  return { W: w, A: a };
}
const DEF_K = 24;   // battle/rules.js: damage = stat x power x DEF_K / (DEF_K + DEF)
// Offence: the hero's and Bram's ATK with the weapon, Mira's MAG (her damage is spells), times the mastery factor.
function offence(level, W, masteryPts) {
  const [h, m, b] = partyAt(level).members;
  return ((h.atk + W) + m.mag + (b.atk + W)) / 3 * masteryFactor(masteryPts);
}
// Toughness: mean HP times the armour term, 0.6 physical (DEF plus worn armour) and 0.4 magical (SPR).
function toughness(level, A) {
  const p = partyAt(level);
  return p.hp * (0.6 * (DEF_K + p.def + A) / DEF_K + 0.4 * (DEF_K + p.spr) / DEF_K);
}

// ---------------------------------------------------------------- the curve
/**
 * The tuning constants (C3-sim-bot turns these): kHp and kPower scale parity; hpRamp and powerRamp are the extra multiple at
 * B99 over B1 (negative hpRamp: the deep fights hit harder rather than lasting longer). A plain object so a harness can try
 * other values in place (qa/cave/out/cave_sanity.mjs --grid).
 */
export const TUNING = { kHp: 1.25, kPower: 1.5, hpRamp: -0.45, powerRamp: 1.2, powerCap: 45 };
/** B1 and B2 ease in: three Lv 1 members with empty hands meet the first fight (the yard slime's own 0.55 / 0.5 is the model). */
export const OPENING_EASE = { 1: 0.8, 2: 0.9 };
export const SPEED_CAP = 3.5;
export const EXP_BASE_MUL = 1.5;
/**
 * The W15 rule, kept by data: at a floor's power no ordinary (non-telegraphed) move of any pool foe, elite or not, may fell a
 * full-HP member. Mira is the softest, so the cap is her table HP times ONE_SHOT_MARGIN over the worst such hit at power 1
 * (the engine's variance and crit included; her armour about 60% of the party's armour proxy).
 */
export const ONE_SHOT_MARGIN = 0.9;
function worstOrdinaryHit(band, floor, level, A) {
  const m = memberAt('mira', level);
  const def = m.def + 0.6 * A, spr = m.spr + 0.2 * A;
  const eliteAtk = floor >= ELITE_FROM ? ELITE_BASE.atk : 1;
  let worst = 0;
  for (const t of band.pool) for (const id of new Set(t.enemies)) {
    const e = ENEMIES[id];
    if (!e) continue;
    for (const mv of e.moves) {
      const sk = SKILLS[mv.skill];
      if (!sk || !sk.power || sk.telegraph) continue;
      const phys = sk.formula === 'phys';
      let hit = (phys ? e.atk : e.mag) * eliteAtk * sk.power / 100 * DEF_K / (DEF_K + (phys ? def : spr)) * (1 + VARIANCE) * (sk.hits || 1);
      if (phys && ENEMY_CRIT > 0) hit *= CRIT_MULT;
      if (hit > worst) worst = hit;
    }
  }
  return { worst, hp: m.hp };
}
/** The largest `power` a floor may carry under the one-shot rule (the band's pool, the floor's arrival level and gear). */
export function powerCapAt(floor, opts = {}) {
  const f = clamp(Math.round(floor), 1, FLOORS);
  const bands = opts.bands || BANDS;
  const band = bands[bandIndex(f) - 1];
  const level = opts.level != null ? opts.level : targetLevel(f - 1, opts.bands ? { bands } : {});
  const w = worstOrdinaryHit(band, f, level, caveGear(f).A);
  return w.worst > 0 ? round2(ONE_SHOT_MARGIN * w.hp / w.worst) : TUNING.powerCap;
}
export const ELITE_FROM = 20;
export const TWO_MODS_FROM = 50;
export const ELITE_RATE_DEEP = { 1: 0.125, 2: 0.2 };   // chance per encounter once elites appear (one mod, two mods)
const round2 = (v) => Math.round(v * 100) / 100;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Elite modifiers scale(floor).elite allows: 0 before B20, 1 to B49, 2 from B50. */
export function eliteModsAt(floor) { return floor < ELITE_FROM ? 0 : floor < TWO_MODS_FROM ? 1 : 2; }
/** Chance that encounterFor rolls an elite on a floor (templates with a fixed elite ignore it). */
export function eliteRateAt(floor) { const n = eliteModsAt(floor); return n ? ELITE_RATE_DEEP[n] : 0; }

// The EXP pace: expMul(f) = EXP_BASE_MUL x pace(f), pace piecewise linear between the LEVEL_ANCHORS floors, FITTED so that a
// party fighting every foe of every floor (foesPerFloor, the band's mean group EXP, no elites) holds the anchor level on leaving
// each anchor floor. The first segment is flat; each later knot is solved from its segment's EXP need; so the pace is continuous
// and the levels land by construction. The party level the curve then expects on a floor is read back from the EXP paid.
function fitCurve(bands) {
  const perFight = (f) => foesPerFloor(f) * bands[bandIndex(f) - 1].meanExp * EXP_BASE_MUL;   // EXP a floor pays at pace 1
  const knots = [];   // [floor, pace]
  for (let s = 1; s < LEVEL_ANCHORS.length; s++) {
    const [a, la] = LEVEL_ANCHORS[s - 1], [b, lb] = LEVEL_ANCHORS[s];
    const need = expAtLevel(lb) - expAtLevel(la);
    let sumW = 0, sumWU = 0;
    for (let f = a + 1; f <= b; f++) { const w = perFight(f), u = (f - a) / (b - a); sumW += w; sumWU += w * u; }
    if (s === 1) { const p = need / sumW; knots.push([a, p], [b, p]); continue; }
    const pa = knots[knots.length - 1][1];
    const pb = sumWU > 0 ? (need - pa * (sumW - sumWU)) / sumWU : pa;   // solve sum w (pa + (pb - pa) u) = need
    knots.push([b, Math.max(0.5, pb)]);
  }
  const paceAt = (f) => {
    const x = clamp(f, knots[0][0], knots[knots.length - 1][0]);
    for (let i = 1; i < knots.length; i++) {
      const [f0, p0] = knots[i - 1], [f1, p1] = knots[i];
      if (x <= f1) return p0 + (p1 - p0) * (x - f0) / (f1 - f0);
    }
    return knots[knots.length - 1][1];
  };
  const expMul = new Array(FLOORS + 1).fill(EXP_BASE_MUL);
  const cum = new Array(FLOORS + 1).fill(0);
  for (let f = 1; f <= FLOORS; f++) {
    expMul[f] = round2(EXP_BASE_MUL * paceAt(Math.min(f, FLOORS - 1)));
    cum[f] = cum[f - 1] + foesPerFloor(f) * bands[bandIndex(f) - 1].meanExp * expMul[f];
  }
  return { knots: knots.map(([f, p]) => [f, round2(p)]), expMul, cum };
}
const CURVES = new WeakMap();
function curveFor(bands) {
  if (bands === BANDS) return CURVE;
  if (!CURVES.has(bands)) CURVES.set(bands, fitCurve(bands));
  return CURVES.get(bands);
}
const CURVE = fitCurve(BANDS);
/** The fitted pace knots [[floor, pace] ...] of the live bands (for the report and the tests). */
export const EXP_PACE_KNOTS = CURVE.knots;
/** The depth pace of the EXP curve: expMul(floor) = EXP_BASE_MUL x expPace(floor). */
export function expPace(floor, opts = {}) { return round2(curveFor(opts.bands || BANDS).expMul[clamp(Math.round(floor), 1, FLOORS)] / EXP_BASE_MUL); }
/** Total EXP a party that fought every foe holds on leaving floor f (fractional floors interpolate; 0 at the trapdoor). */
export function expByFloor(floor, opts = {}) {
  const cum = curveFor(opts.bands || BANDS).cum;
  const f = clamp(floor, 0, FLOORS);
  const lo = Math.floor(f), frac = f - lo;
  return cum[lo] + (frac && lo < FLOORS ? (cum[lo + 1] - cum[lo]) * frac : 0);
}
/** The party level the curve expects on LEAVING floor f (f = 0 is the trapdoor, Lv 1). */
export function targetLevel(floor, opts = {}) { return levelAtExp(expByFloor(floor, opts)); }
/** The party level the curve expects on ARRIVING at floor f. */
export function arrivalLevel(floor, opts = {}) { return Math.round(targetLevel(floor - 1, opts)); }

/**
 * The encounter multipliers of a floor: { hp, power, speed, expMul, elite }. Pure; the same on every machine.
 * `opts.bands` (tests) swaps the band table; `opts.level` overrides the party level the floor is tuned for.
 */
export function scale(floor, opts = {}) {
  const f = clamp(Math.round(floor), 1, FLOORS);
  const bands = opts.bands || BANDS;
  const band = bands[bandIndex(f) - 1];
  // tuned to the level the party ARRIVES with (the first fight of the floor is the hardest one; a floor's EXP lifts the rest)
  const level = opts.level != null ? opts.level : targetLevel(f - 1, opts.bands ? { bands } : {});
  const d = (f - 1) / (FLOORS - 2);
  const cave = caveGear(f), nat = nativeGear(band.nativeLevel);
  const nl = band.nativeLevel;
  const ease = OPENING_EASE[f] || 1;
  const hp = clamp(ease * TUNING.kHp * (1 + TUNING.hpRamp * d) * offence(level, cave.W, caveMastery(f)) / offence(nl, nat.W, nativeMastery(nl)), 0.3, 30);
  const parityPower = ease * TUNING.kPower * (1 + TUNING.powerRamp * d) * toughness(level, cave.A) / toughness(nl, nat.A);
  const power = clamp(Math.min(parityPower, powerCapAt(f, { ...opts, level })), 0.3, TUNING.powerCap);
  const speed = clamp(partyAt(level).spd / partyAt(nl).spd, 0.8, SPEED_CAP);
  const expMul = curveFor(bands).expMul[f];
  return { hp: round2(hp), power: round2(power), speed: round2(speed), expMul, elite: eliteModsAt(f) };
}

// ---------------------------------------------------------------- encounters
function pickMods(rng, n) {
  const ids = RANDOM_ELITE_MODS.slice();
  const out = [];
  for (let i = 0; i < n && ids.length; i++) out.push(ids.splice(rng.int(ids.length), 1)[0]);
  return out;
}

/**
 * The encounter spec of visible foe `index` (0-based) on `floor` of the run `seed`: a deterministic pick from the band's pool
 * with the floor's scale applied. Returns an encounters.js row:
 *   { id: 'cave_b23_e4', zone: 'cave_band_2', leader, enemies, move, template, floor, band, cave: true,
 *     hp, power, speed, expMul, noFlee: false, noElite: true, music: 'battle', elite?: { mods, index: 0 } }
 * (`move` and `template` are for the generator; encounters.js ignores keys it does not know.)
 */
export function encounterFor(seed, floor, index, opts = {}) {
  const f = clamp(Math.round(floor), 1, FLOORS - 1);
  const bands = opts.bands || BANDS;
  const band = bands[bandIndex(f) - 1];
  const rng = createRng(hashSeed(`cave:${seed}:${f}:${index}`));
  const t = rng.weighted(band.pool, (x) => x.weight);
  const s = scale(f, opts.bands ? { bands } : {});
  const spec = {
    id: `cave_b${f}_e${index}`, zone: `cave_band_${band.k}`, leader: t.leader, enemies: t.enemies.slice(), move: t.move,
    template: t.id, floor: f, band: band.k, cave: true,
    hp: s.hp, power: s.power, speed: s.speed, expMul: s.expMul, noFlee: false, noElite: true, music: 'battle',
  };
  let mods = null;
  if (t.elite) mods = pickMods(rng, t.elite);
  else if (s.elite > 0 && rng.chance(eliteRateAt(f))) mods = pickMods(rng, s.elite);
  if (mods) spec.elite = { mods, index: 0 };
  return spec;
}

/** Every encounter of a floor, in index order (foesPerFloor of them; none on a landing or B100). */
export function floorEncounters(seed, floor, opts = {}) {
  const out = [];
  for (let i = 0; i < foesPerFloor(floor); i++) out.push(encounterFor(seed, floor, i, opts));
  return out;
}

/**
 * Put encounter specs into ENCOUNTERS so the field and battle can start them. Idempotent; clears nothing; an id already
 * registered is kept as it was (the same (seed, floor, index) always yields the same spec). Also makes sure the band zones
 * exist on ZONES. Returns { added: [ids], kept: [ids] }. The integrator calls it when a floor is generated.
 */
export function registerFloorEncounters(specs) {
  ensureZones();
  const out = { added: [], kept: [] };
  for (const spec of specs || []) {
    if (!spec || !spec.id) continue;
    if (ENCOUNTERS[spec.id]) { out.kept.push(spec.id); continue; }
    enc(spec.id, { ...spec, enemies: spec.enemies.slice() });
    out.added.push(spec.id);
  }
  return out;
}

// ---------------------------------------------------------------- zones (ZONES[id] works; not enumerable: qa/maps wants a map per listed zone)
export const CAVE_ZONE_IDS = ['cave_band_1', 'cave_band_2', 'cave_band_3', 'cave_band_4', 'cave_band_5', 'cave_boss'];
export const CAVE_ZONES = {};
for (const b of BAND_ROWS) {
  CAVE_ZONES[`cave_band_${b.k}`] = { id: `cave_band_${b.k}`, name: b.name, level: [arrivalLevel(b.floors[0]), arrivalLevel(b.floors[1])],
    backdrop: b.backdrop, music: 'battle', optional: true, cave: true, band: b.k, plan: [] };
}
CAVE_ZONES.cave_boss = { id: 'cave_boss', name: 'The Binding', level: [58, 60], backdrop: 'boss', music: 'boss_archivore', optional: true, cave: true, band: 5, plan: [['cave_binder', 1]] };
function ensureZones() {
  for (const [id, z] of Object.entries(CAVE_ZONES)) {
    if (!Object.prototype.hasOwnProperty.call(ZONES, id)) Object.defineProperty(ZONES, id, { value: z, enumerable: false, configurable: true, writable: true });
  }
}

// ---------------------------------------------------------------- the Binder (B100)
// Built on the Archivore's kit (ai 'archivore'): it is the Book's binder to the Archivore's eater, the same art family (a recolour,
// C2-sprites-boss), and the kit already carries the three telegraphs a final fight wants: Devour Name (Silence + Nameless +
// empower, answered by Defend), Ink Storm (party-wide, answered by Defend or a Break) and Feast (kill the pages first). The
// Nameless King's kit was the other candidate; its ward and adds are written into ai.js by id (Sorrow, Pride), the Archivore's
// script reads everything from `phases`. Two things for the ai.js owner (noted in the report): the script's three messages say
// "The Archivore" by name, and the Lost Pages it summons are the unscaled Lv 7 pages (phase 2 is a short armour window here).
export const BINDER_ID = 'binder';
export const BINDER = {
  name: 'The Binder', family: 'devourer', level: 58, size: 'boss', boss: true, ai: 'archivore',
  hp: 6500, mp: 99, atk: 1500, def: 70, mag: 2200, spr: 60, spd: 46, luk: 12,
  shields: 8, weak: ['fire', 'light'], resist: ['ice'],
  statusImmune: ['stun', 'silence', 'poison', 'blind', 'chill'],
  exp: 6000, gold: 5000, masteryPts: 40,
  moves: [{ skill: 'ink_lash', weight: 40 }, { skill: 'gnash', weight: 30, target: 'lowestHpPct' }, { skill: 'ink_spray', weight: 30 }],
  phases: [
    { id: 'the_spine', name: 'The Spine', at: 1.0, weak: ['fire', 'light'], resist: ['ice'], shields: 8,
      text: 'The Binder unfolds from the last shelf. Every name the Stacks kept is stitched along its spine.' },
    { id: 'loose_leaves', name: 'Loose Leaves', at: 0.7, weak: ['fire', 'light', 'thunder'], resist: ['ice'], shields: 9,
      summon: 2, text: 'The stitching gives. Loose leaves tear free and circle it, and each one still has a name.' },
    { id: 'the_last_binding', name: 'The Last Binding', at: 0.3, weak: ['light', 'axe', 'spear'], resist: [], shields: 10,
      haste: true, text: 'It burns its own pages for thread. What is left is the binding, and it wants yours.' },
  ],
  drops: [], lootZone: 'cave_band_5', uniqueDrop: 'cave_binders_quill',
  // C2-sprites-boss: swap frame to 'binder' once the recolour is in an atlas; the Archivore's frame keeps the fight playable.
  sprite: { atlas: 'enemies_battle', field: 'enemies_field', frame: 'archivore' },
  flavor: 'It bound every name the Stacks ever kept. It would like yours for the spine.',
};
export const BINDER_ENCOUNTER_ID = 'cave_binder';
export const BINDER_ENCOUNTER = { zone: 'cave_boss', leader: BINDER_ID, enemies: [BINDER_ID], boss: true, noFlee: true, canFlee: false,
  music: 'boss_archivore', noElite: true, flag: 'deep_stacks_cleared', bossLoot: BINDER_ID, backdrop: 'boss', cave: true, floor: BOSS_FLOOR, band: 5 };

let done = false;
/** Add the band zones, the Binder and its encounter. Safe to call twice. */
export function register() {
  if (done) return;
  ensureZones();
  if (!ENEMIES[BINDER_ID]) enemy(BINDER_ID, { ...BINDER, phases: BINDER.phases.map((p) => ({ ...p })) });
  if (!ENCOUNTERS[BINDER_ENCOUNTER_ID]) enc(BINDER_ENCOUNTER_ID, { ...BINDER_ENCOUNTER, enemies: BINDER_ENCOUNTER.enemies.slice() });
  done = true;
}
export default register;
