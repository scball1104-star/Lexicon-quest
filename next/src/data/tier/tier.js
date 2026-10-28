// Fine Print (tier_1): the one post-credits tier (docs/HARD_ROAD.md, Scott 2026-10-27: carry the character, one tier, the
// name Fine Print; the player-facing rules: docs/TIER.md). Pure: no DOM, no engine. Part of the `tier` pack (src/game/packs.js),
// so none of it is in the first download; register() in ./index.js installs the hooks below as globalThis.LQ_TIER, which the
// shell reads at its seams (each one guarded line):
//   battle/rules.js makeEnemyUnit   LQ_TIER.foe(...)    the foe numbers and the EXP and gold a foe pays
//   battle/loot.js rollBattleDrops  LQ_TIER.drops(...)  item level, the tier rarity table, rollable legendaries
//   scenes/title.js enter           LQ_TIER.title(...)  the row under Continue (./title.js)
//   game/state.js addMember         a carried member waiting in `reserve` joins at the story's own join scene
// The shops' tier_1 rows are data, pushed into SHOPS by register(). A cave battle (the Deep Stacks) ignores all of it.

import { hasFlag, memberStats } from '../../battle/rules.js';
import { rollItem, rollRarity, makeUnique } from '../../battle/loot.js';
import { ZONE_LOOT, BOSS_LOOT } from '../loot-tables.js';
import { ENCOUNTERS } from '../encounters.js';
import { UNIQUES, CONSUMABLES, KEY_ITEMS } from '../items.js';
import { expForLevel, levelForExp } from '../party.js';
import { createGame, deserialize, normSlot } from '../../game/state.js';
import { EP3_LIVE } from '../../game/episodes.js';

/** The flag a Fine Print run carries (and the id of the tier: the only one). */
export const TIER_FLAG = 'tier_1';

/**
 * The tier's numbers. `foe` is HARD_ROAD's surcharge on every foe and boss: HP x1.6, ATK and MAG x1.35, SPD +1. `lift` first
 * raises each foe to the carried party (HARD_ROAD's table assumed a party of the foe's own level; a carried Lv 13 party walks
 * through Episode 1 in one to four rounds at x1.6 alone: docs/TIER.md "Why the lift"). The party meets a foe of level L at
 * levelForExp(carryExp + exp x expForLevel(L)); `carryExp` is the record the tier is written for, the simulator's Episode 2
 * finish (tools/sim progression(1, 2): 3,335 EXP, Lv 13; qa/tier pins the two together). `lag` says how many levels under that
 * each stat is lifted to: HP sits five under so the x1.6 lands the fights in DESIGN 7's bands, the hit (ATK and MAG) and the
 * tempo (SPD, against the party's own speed growth) at the party's level. DEF is not lifted. `terms` are the per-encounter
 * corrections the simulator needed, the way encounters.js tunes a group with `hp` and `power` (tools/sim/simulate.mjs
 * --tier 1 --check holds every one of them in its band).
 */
export const TIER_TABLE = {
  1: {
    id: TIER_FLAG,
    foe: { hp: 1.6, pow: 1.35, spd: 1 },
    lift: { carryExp: 3335, lag: { hp: 5, pow: 0, spd: 0 } },
    terms: {
      // Episode 1, the main route
      valley_wolves: { hp: 1.5 }, valley_scarab: { hp: 1.11 }, f1_mites: { hp: 1.32 }, f1_mixed: { hp: 1.33 },
      echo_warden: { hp: 1.42 }, f3_ink: { hp: 1.3 }, f3_wraiths: { hp: 1.39 }, f3_mixed: { hp: 0.72 },
      archivore: { hp: 1.29, pow: 1.57 },
      // Whisperwood Hollow and the Wider Valley
      hollow_wolves: { hp: 1.11 }, dn_scarab: { hp: 1.11 }, mo_wolves: { hp: 1.24 }, mo_scarabs: { hp: 0.79 },
      mo_wraiths: { hp: 1.12 }, bw_shades: { hp: 1.38 }, bw_mixed: { hp: 1.29 }, barrow_reeve: { hp: 1.49, pow: 1.52 },
      lh_beetles: { hp: 0.81 }, mr_weevils: { hp: 0.86 }, cl_wraiths: { hp: 1.3 }, cv_blots: { hp: 1.13 },
      cv_wraith: { hp: 1.25 },
      // Episode 2
      road_wolves: { hp: 1.22 }, c1_quick: { hp: 0.87 }, other_selves: { hp: 0.88, pow: 1.14 }, c3_mixed: { hp: 0.66 },
      nameless_king: { hp: 0.72, pow: 1.13 },
    },
    exp: 1.5,                                      // EXP x1.5
    gold: 1.5,                                     // battle gold x1.5 (the economy check runs with it)
    ilvl: 6, ilvlCap: 16,                          // drop item level +6, capped at 16
    rarity: {
      normal: { common: 50, magic: 35, rare: 15 },
      elite: { magic: 35, rare: 60, legendary: 5 },
      boss: { rare: 85, legendary: 15 },
    },
    price: 1.25,                                   // the tier rows' price over list, rounded to 10
  },
};

/**
 * Stat lines by level, value(L) = a * L + b. hp and pow (the higher of ATK and MAG): least squares through the game's own
 * ordinary foes of the three episodes (22 foes, Lv 2 to 16), the intercepts raised so the Episode 1 foes sit on the line.
 * spd: the party's own speed growth (data/party.js, about 0.6 a level), so a lifted foe keeps the base game's tempo. A lifted
 * foe keeps its shape: each stat is multiplied by line(target) / line(own level).
 */
export const FOE_LINES = { hp: [24.5, 40], pow: [5.4, 5], spd: [0.6, 11.5] };
const line = (k, L) => FOE_LINES[k][0] * L + FOE_LINES[k][1];

/** The twelve placed legendaries (src/data/items.js UNIQUES) and the six made for the tier (./legendaries.js). */
export const LEGENDARY_POOL = ['lanternheart', 'first_quill', 'pilgrim_reach', 'thornwake', 'mirrorguard_mail', 'twinfold_charm',
  'kept_promise', 'hollowcrown', 'first_bell_hammer', 'tempered_blade', 'warden_heart', 'updraft_charm',
  'codicil', 'marginalia', 'errata', 'countersign', 'strikethrough', 'witness_seal'];

/** The tier rows: tier 4 and 5 at the Willowmere Forge, tier 5 and 6 at the Silverglass Smithy, at the tier's price. */
export const TIER_SHOP_ROWS = {
  willowmere_smithy: ['silverglass_blade', 'moonsteel_axe', 'mere_pike', 'mirror_rod', 'glasswing_bow', 'silver_mail', 'mirrorweave_robe',
    'glass_helm', 'mirror_circlet', 'mere_boots', 'veil_mantle', 'ashsteel_cuirass', 'founders_robe', 'ashsteel_helm', 'soot_hood',
    'cinder_boots', 'carter_mantle'],
  hollow_smithy: ['ashsteel_cuirass', 'founders_robe', 'ashsteel_helm', 'soot_hood', 'cinder_boots', 'carter_mantle',
    'tempered_sword', 'forge_axe', 'heartforge_pike', 'founders_rod', 'bellwire_bow', 'tempered_mail', 'ashweave_robe', 'forge_helm'],
};
/** A list price at the tier's price, rounded to 10. */
export function tierPrice(list, T = TIER_TABLE[1]) { return Math.round((list * T.price) / 10) * 10; }

/** 1 for a Fine Print game (game.tier or its flag), else 0. */
export function tierOf(game) {
  return game && (game.tier === 1 || hasFlag(game.flags, TIER_FLAG)) ? 1 : 0;
}

/** The flag a record must hold to be carried: the latest live episode's complete flag. */
export function unlockFlag(ep3Live = EP3_LIVE) { return ep3Live ? 'ep3_complete' : 'ep2_complete'; }

/** The level the party meets a foe of level L at on the tier (the record's EXP plus the tier's pay up to that point). */
export function metLevel(L, T = TIER_TABLE[1]) { return levelForExp(T.lift.carryExp + T.exp * expForLevel(L)); }

/** The level a foe of level L has one stat (hp, pow, spd) lifted to on the tier (never below its own). */
export function liftLevel(L, stat = 'hp', T = TIER_TABLE[1]) {
  const lag = T.lift.lag[stat] ?? T.lift.lag.hp;
  return Math.max(L, metLevel(L, T) - lag);
}

/** True when a battle's options are a Deep Stacks fight (a cave zone or a cave encounter row): the tier never applies there. */
export function caveBattle(o = {}) {
  const e = o.encounter ? ENCOUNTERS[o.encounter] : null;
  return !!(e && e.cave) || /^cave/.test(String(o.zone || ''));
}

let building = null;   // the tier battle whose foes are being built: { zone, encounter } (tierDrops checks it), else null

/**
 * rules.js makeEnemyUnit: the foe's numbers on the tier. d = the ENEMIES record, s = { hp, atk, mag, def, spd, exp, gold } after
 * the elite, encounter and summon multipliers, flags = the battle's story flags, state = the battle state (zone, encounter),
 * extra = the summon options (a split child with an absolute HP taken from its lifted parent is not lifted again). Off the
 * tier, and in any cave battle, it returns `s` itself.
 */
export function tierFoe(d, s, flags, state, extra = {}) {
  building = null;
  const o = (state && state.options) || {};
  if (!d || !hasFlag(flags, TIER_FLAG) || caveBattle(o)) return s;
  building = { zone: o.zone || null, encounter: o.encounter || null };
  const T = TIER_TABLE[1], L = d.level || 1;
  const up = (k) => line(k, liftLevel(L, k, T)) / line(k, L);
  const term = (o.encounter && T.terms[o.encounter]) || {};
  const pow = up('pow') * T.foe.pow * (term.pow || 1);
  return {
    hp: extra && extra.hp ? s.hp : s.hp * up('hp') * T.foe.hp * (term.hp || 1),
    atk: s.atk * pow, mag: s.mag * pow, def: s.def,
    spd: s.spd * up('spd') + T.foe.spd,
    exp: s.exp * T.exp, gold: s.gold * T.gold,
  };
}

function rand(rng) { return typeof rng === 'function' ? rng() : rng.next(); }

/** A legendary for a drop of item level `ilvl`, newer ones likelier (as rollBase weighs bases), or null. */
export function pickLegendary(rng, ilvl) {
  const pool = LEGENDARY_POOL.filter((id) => UNIQUES[id] && UNIQUES[id].ilvl <= ilvl);
  if (!pool.length) return null;
  const total = pool.reduce((n, id) => n + 1 + UNIQUES[id].ilvl, 0);
  let r = rand(rng) * total;
  for (const id of pool) { r -= 1 + UNIQUES[id].ilvl; if (r < 0) return id; }
  return pool[pool.length - 1];
}

/** One equipment drop on the tier: the tier's rarity table; a legendary roll is one of LEGENDARY_POOL (a rare when none fits). */
export function tierItem(rng, ilvl, table, T = TIER_TABLE[1]) {
  let rarity = rollRarity(rng, T.rarity[table] || T.rarity.normal);
  if (rarity === 'legendary') {
    const id = pickLegendary(rng, ilvl);
    if (id) return makeUnique(id);
    rarity = 'rare';
  }
  return rollItem(rng, { ilvl, rarity });
}

/**
 * loot.js rollBattleDrops on the tier: the same rules (consumable drops, an item per elite, boss uniques and rolls, the zone's
 * equipment chance), with every item level +6 (capped at 16) and the tier's rarity table. Null (the base roll runs) unless the
 * battle being rewarded is the tier battle tierFoe() just built.
 */
export function tierDrops(rng, killed, opts = {}, T = TIER_TABLE[1]) {
  const b = building;
  if (!b || b.zone !== (opts.zone || null) || b.encounter !== (opts.encounter || null)) return null;
  const il = (n) => Math.min(T.ilvlCap, n + T.ilvl);
  const items = [];
  const consumables = {};
  const addC = (id, qty = 1) => { consumables[id] = (consumables[id] || 0) + qty; };
  let zone = opts.zone || null;
  const dropBoss = (boss) => {
    if (boss.unique) items.push(makeUnique(boss.unique));
    for (let i = 0; i < boss.rolls; i++) items.push(tierItem(rng, il(boss.ilvl), boss.table || 'boss', T));
    for (const c of boss.consumables || []) addC(c.item, c.qty);
  };
  for (const k of killed || []) {
    zone = zone || k.lootZone;
    for (const dr of k.drops || []) if (rand(rng) < dr.chance) addC(dr.item, 1);
    if (k.elite && k.elite.length) items.push(tierItem(rng, il((ZONE_LOOT[k.lootZone] || { ilvl: 3 }).ilvl + 1), 'elite', T));
    const boss = BOSS_LOOT[k.id];
    if (boss && !boss.encounter) dropBoss(boss);
  }
  const group = opts.encounter && BOSS_LOOT[opts.encounter] && BOSS_LOOT[opts.encounter].encounter ? BOSS_LOOT[opts.encounter] : null;
  if (group) dropBoss(group);
  const z = ZONE_LOOT[zone];
  const anyBoss = !!group || (killed || []).some((k) => BOSS_LOOT[k.id] && !BOSS_LOOT[k.id].encounter);
  if (z && !anyBoss && rand(rng) < z.equipChance) items.push(tierItem(rng, il(z.ilvl), 'normal', T));
  return { items, consumables: Object.entries(consumables).map(([item, qty]) => ({ item, qty })) };
}

/** Tests and tools: forget the battle being built (as a fresh page would). */
export function resetTierBattle() { building = null; }

// ---------------------------------------------------------------- the carry
const clone = (x) => JSON.parse(JSON.stringify(x));

/** A carried member, whole and rested: level, EXP, mastery, gear and weapon as they were; full HP and MP, no Fury. */
function rested(m) {
  const c = clone(m);
  let s = null;
  try { s = memberStats(c); } catch (e) { s = null; }
  if (s) { c.hp = s.maxHp; c.mp = s.maxMp; }
  c.fury = 0;
  return c;
}

/**
 * The Fine Print run from a finished record (a save's `data`): the hero carried into the party, Mira and Bram carried into
 * `reserve` until their join scenes, the bag's consumables, the gear, gold, the bestiary and the vows kept (marked chapter 0,
 * so this lap's vows pay again). Story flags, key items, opened chests and counters start over; the flag tier_1 and
 * game.tier = 1 are set; chapter 1, so the cold open plays. o: { slot (the run's own autosave slot), seed }. Pure.
 */
export function carryRecord(data, o = {}) {
  const src = deserialize(data);
  if (!src) return null;
  const g = createGame(src.heroName || 'Hero', { seed: o.seed, autosaveSlot: o.slot });
  const all = [...(src.party || []), ...(src.reserve || [])];
  const hero = all.find((m) => m.id === 'hero');
  if (hero) g.party = [rested(hero)];
  g.reserve = ['mira', 'bram'].map((id) => all.find((m) => m.id === id)).filter(Boolean).map(rested);
  g.items = {};
  for (const [id, q] of Object.entries(src.items || {})) if (CONSUMABLES[id] && !KEY_ITEMS[id] && q > 0) g.items[id] = q;
  g.gear = clone(src.gear || []);
  g.gearNext = Math.max(src.gearNext || 1, 1 + g.gear.reduce((n, it) => Math.max(n, it.uid || 0), 0));
  g.gold = src.gold || 0;
  g.bestiary = clone(src.bestiary || {});
  g.vowsKept = (src.vowsKept || []).map((k) => ({ ...k, chapter: 0 }));
  g.playtime = src.playtime || 0;
  g.tier = 1;
  g.flags = { [TIER_FLAG]: true };
  g.autosaveSlot = normSlot(o.slot);
  return g;
}

/**
 * The records the title may carry: every slot (0 is the autosave) whose flags hold the unlock flag, newest first:
 * [{ slot, name, level, map, savedAt }]. Pure (fake saves in tests).
 */
export function tierRecords(save, flag = unlockFlag()) {
  const out = [];
  const last = save && Number.isFinite(save.slots) ? save.slots : 3;
  for (let n = 0; save && n <= last; n++) {
    let env = null;
    try { env = save.loadEnvelope(n); } catch (e) { env = null; }
    const d = env && env.data;
    if (!d || !d.flags || !d.flags[flag]) continue;
    const m = env.meta || {};
    out.push({ slot: n, name: m.name || d.heroName || 'Hero', level: m.level || (d.party && d.party[0] && d.party[0].level) || 1,
      map: m.map || d.map || '', savedAt: Date.parse(env.savedAt || '') || 0 });
  }
  return out.sort((a, b) => b.savedAt - a.savedAt || a.slot - b.slot);
}
