// Loot generation (Diablo II style): rarity tiers, base items, prefix/suffix affixes with rolled
// values, elite and boss drop rules, chests. Pure: every roll takes an injected rng.
//
// rng: an object with next() -> [0,1) (core/rng.js createRng) or a plain function returning floats.
//
// Item instance format:
//   { base: 'iron_pike', rarity: 'magic', ilvl: 5, name: 'Gleaming Iron Pike of Embers',
//     affixes: [{ id: 'gleaming', tier: 2, value: 5 }, { id: 'of_embers', tier: 2, value: 14 }] }
//   uniques/sets: { base: 'lanternheart', rarity: 'legendary', unique: true, name: 'Lanternheart', affixes: [] }

import { EQUIPMENT, UNIQUES, SETS, AFFIXES, RARITIES, RARE_NAME_A, RARE_NAME_B, CONSUMABLES } from '../data/items.js';
import { RARITY_TABLES, ZONE_LOOT, SLOT_WEIGHTS, BOSS_LOOT, CHEST_TIERS, AFFIX_COUNTS, RARITY_SELL_MULT } from '../data/loot-tables.js';

function rand(rng) { return typeof rng === 'function' ? rng() : rng.next(); }
function int(rng, a, b) { return a + Math.floor(rand(rng) * (b - a + 1)); }
function weighted(rng, entries) { // entries: [[value, weight], ...]
  const total = entries.reduce((s, e) => s + Math.max(0, e[1]), 0);
  if (total <= 0) return entries.length ? entries[0][0] : undefined;
  let r = rand(rng) * total;
  for (const [v, w] of entries) { r -= Math.max(0, w); if (r < 0) return v; }
  return entries[entries.length - 1][0];
}

/** Base definition for an item instance, a base id string, or a unique id. */
export function baseOf(item) {
  if (!item) return null;
  const id = typeof item === 'string' ? item : item.base;
  return EQUIPMENT[id] || UNIQUES[id] || null;
}

/** Group keys an affix can match for a base: 'weapon' + type for weapons, else the slot. */
export function groupsOf(base) {
  return base.slot === 'weapon' ? ['weapon', base.type] : [base.slot];
}

export function affixAllowed(affixId, base) {
  const a = AFFIXES[affixId];
  if (!a || !base) return false;
  const g = groupsOf(base);
  return a.groups.some((x) => g.includes(x));
}

/** Highest tier index an affix can roll at an item level (or -1). */
export function tierFor(affix, ilvl) {
  let t = -1;
  affix.tiers.forEach((tier, i) => { if (ilvl >= tier[0]) t = i; });
  return t;
}

/** Roll the rarity from a table name or a weights object. */
export function rollRarity(rng, table = 'normal') {
  const w = typeof table === 'string' ? RARITY_TABLES[table] : table;
  return weighted(rng, Object.entries(w));
}

/** Pick a base of a slot whose ilvl <= cap. Prefers the highest eligible tier (weighted). */
export function rollBase(rng, { slot, ilvl = 1, type } = {}) {
  const pickSlot = slot || weighted(rng, Object.entries(SLOT_WEIGHTS));
  const pool = Object.values(EQUIPMENT).filter((b) => b.slot === pickSlot && b.ilvl <= Math.max(1, ilvl)
    && (!type || b.type === type));
  if (!pool.length) {
    const any = Object.values(EQUIPMENT).filter((b) => b.slot === pickSlot);
    return any.sort((a, b) => a.ilvl - b.ilvl)[0];
  }
  // Newer (higher ilvl) bases are more likely, older ones still show up.
  return weighted(rng, pool.map((b) => [b, 1 + b.ilvl]));
}

function rareName(rng, base) {
  const a = RARE_NAME_A[int(rng, 0, RARE_NAME_A.length - 1)];
  const list = RARE_NAME_B[base.slot] || RARE_NAME_B.weapon;
  const b = list[int(rng, 0, list.length - 1)];
  return `${a} ${b}`;
}

/**
 * Roll one equipment item.
 * opts: { ilvl, rarity?, table?, slot?, base?, type? }
 */
export function rollItem(rng, opts = {}) {
  const ilvl = Math.max(1, opts.ilvl || 1);
  let rarity = opts.rarity || rollRarity(rng, opts.table || 'normal');
  if (rarity === 'legendary' || rarity === 'set') rarity = 'rare'; // Episode 1 uniques are placed
  const base = opts.base ? baseOf(opts.base) : rollBase(rng, { slot: opts.slot, ilvl, type: opts.type });
  const item = { base: base.id, rarity, ilvl, affixes: [], name: base.name };
  const counts = AFFIX_COUNTS[rarity] || AFFIX_COUNTS.common;
  if (counts.max > 0) {
    const n = int(rng, counts.min, counts.max);
    const used = { prefix: 0, suffix: 0 };
    const taken = new Set();
    const takenStats = new Set();
    for (let i = 0; i < n; i++) {
      const pool = Object.values(AFFIXES).filter((a) => affixAllowed(a.id, base) && tierFor(a, ilvl) >= 0
        && !taken.has(a.id) && !takenStats.has(a.stat) && used[a.kind] < counts[a.kind]);
      if (!pool.length) break;
      const a = weighted(rng, pool.map((x) => [x, x.weight]));
      const maxTier = tierFor(a, ilvl);
      // Lower tiers stay possible at high item level, but the top tier is most likely.
      const tier = weighted(rng, a.tiers.slice(0, maxTier + 1).map((t, idx) => [idx, idx === maxTier ? 3 : 1]));
      const [, lo, hi] = a.tiers[tier];
      item.affixes.push({ id: a.id, tier: tier + 1, value: int(rng, lo, hi) });
      taken.add(a.id); takenStats.add(a.stat); used[a.kind]++;
    }
  }
  item.name = itemName(item, rng);
  return item;
}

/** Display name: magic = "Prefix Base Suffix"; rare = generated two-word name; else base name. */
export function itemName(item, rng) {
  const base = baseOf(item);
  if (!base) return '???';
  if (item.unique || item.rarity === 'legendary' || item.rarity === 'set') return base.name;
  if (item.rarity === 'rare') return item.name && item.name !== base.name ? item.name : (rng ? rareName(rng, base) : base.name);
  if (item.rarity === 'magic') {
    const pre = item.affixes.find((a) => AFFIXES[a.id] && AFFIXES[a.id].kind === 'prefix');
    const suf = item.affixes.find((a) => AFFIXES[a.id] && AFFIXES[a.id].kind === 'suffix');
    return [pre && AFFIXES[pre.id].name, base.name, suf && AFFIXES[suf.id].name].filter(Boolean).join(' ');
  }
  return base.name;
}

/** A unique or set item instance. */
export function makeUnique(id) {
  const u = UNIQUES[id];
  if (!u) throw new Error(`unknown unique ${id}`);
  return { base: id, rarity: u.rarity, ilvl: u.ilvl, unique: true, set: u.set || null, affixes: [], name: u.name };
}

/** Normalize a base id string or an instance into an instance. */
export function toInstance(item) {
  if (!item) return null;
  if (typeof item === 'string') {
    if (UNIQUES[item]) return makeUnique(item);
    const b = EQUIPMENT[item];
    return b ? { base: item, rarity: 'common', ilvl: b.ilvl, affixes: [], name: b.name } : null;
  }
  return item;
}

/** Total stats of one item: base stats + affix values. */
export function itemStats(item) {
  const base = baseOf(item);
  const out = {};
  if (!base) return out;
  for (const [k, v] of Object.entries(base.stats || {})) out[k] = (out[k] || 0) + v;
  if (typeof item !== 'string') {
    for (const a of item.affixes || []) {
      const def = AFFIXES[a.id];
      if (def) out[def.stat] = (out[def.stat] || 0) + a.value;
    }
  }
  return out;
}

/** Set bonuses for a list of equipped items. */
export function setBonuses(items) {
  const out = {};
  const counts = {};
  for (const it of items) {
    const b = baseOf(it);
    if (b && b.set) counts[b.set] = (counts[b.set] || 0) + 1;
  }
  for (const [setId, n] of Object.entries(counts)) {
    const set = SETS[setId];
    if (!set) continue;
    for (const [need, bonus] of Object.entries(set.bonus)) {
      if (n >= Number(need)) for (const [k, v] of Object.entries(bonus)) out[k] = (out[k] || 0) + v;
    }
  }
  return out;
}

/** Text lines describing an item's stats (for tooltips): ['+6 ATK', '+12% Fire']. */
export function describeItem(item) {
  const stats = itemStats(item);
  return Object.entries(stats).filter(([, v]) => v).map(([k, v]) => {
    const pct = /Dmg|Res|crit|furyGain|lifesteal|healPow|res[A-Z]|OnHit/.test(k);
    const label = { atk: 'ATK', def: 'DEF', mag: 'MAG', spr: 'SPR', spd: 'SPD', luk: 'LUK', hp: 'HP', mp: 'MP',
      crit: 'Critical', fireDmg: 'Fire', iceDmg: 'Ice', thunderDmg: 'Thunder', lightDmg: 'Light', inkRes: 'Ink resist',
      furyGain: 'Fury gain', lifesteal: 'Life steal', healPow: 'Healing', resPoison: 'Poison resist',
      resBlind: 'Blind resist', resSilence: 'Silence resist', resBurn: 'Burn resist', resChill: 'Chill resist',
      mpCostDown: 'MP cost', poisonOnHit: 'Poison on hit', startHaste: 'Haste at start' }[k] || k;
    if (k === 'mpCostDown') return `-${v} MP cost`;
    return `${v > 0 ? '+' : ''}${v}${pct ? '%' : ''} ${label}`;
  });
}

export function rarityColor(item) {
  const r = typeof item === 'string' ? (UNIQUES[item] ? UNIQUES[item].rarity : 'common') : item.rarity;
  return (RARITIES[r] || RARITIES.common).color;
}

/** Sell price of an instance (half base price times a rarity multiplier). */
export function itemValue(item) {
  const base = baseOf(item);
  if (!base) return 0;
  const r = typeof item === 'string' ? 'common' : item.rarity;
  const affixBonus = typeof item === 'string' ? 0 : (item.affixes || []).length * 10;
  return Math.floor(((base.price || 0) * 0.5 + affixBonus) * (RARITY_SELL_MULT[r] || 1));
}

/**
 * Battle drops. killed: [{ id, elite: [...]|null, lootZone, drops: [{item, chance}], boss, uniqueDrop }].
 * Returns { items: [instances], consumables: [{ item, qty }] }.
 */
export function rollBattleDrops(rng, killed, opts = {}) {
  const items = [];
  const consumables = {};
  const addC = (id, qty = 1) => { consumables[id] = (consumables[id] || 0) + qty; };
  let zone = opts.zone || null;
  for (const k of killed) {
    zone = zone || k.lootZone;
    for (const d of k.drops || []) if (rand(rng) < d.chance) addC(d.item, 1);
    if (k.elite && k.elite.length) {
      const z = ZONE_LOOT[k.lootZone] || { ilvl: 3 };
      items.push(rollItem(rng, { ilvl: z.ilvl + 1, table: 'elite' }));
    }
    const boss = BOSS_LOOT[k.id];
    if (boss) {
      if (boss.unique) items.push(makeUnique(boss.unique));
      for (let i = 0; i < boss.rolls; i++) items.push(rollItem(rng, { ilvl: boss.ilvl, table: boss.table }));
      for (const c of boss.consumables || []) addC(c.item, c.qty);
    }
  }
  const z = ZONE_LOOT[zone];
  const anyBoss = killed.some((k) => BOSS_LOOT[k.id]);
  if (z && !anyBoss && rand(rng) < z.equipChance) items.push(rollItem(rng, { ilvl: z.ilvl, table: 'normal' }));
  return { items, consumables: Object.entries(consumables).map(([item, qty]) => ({ item, qty })) };
}

/** Roll a random chest's contents. tier: 'wood' | 'iron' | 'gold'. ilvl from the zone. */
export function rollChest(rng, tier, ilvl) {
  const t = CHEST_TIERS[tier] || CHEST_TIERS.wood;
  const out = { gold: int(rng, t.gold[0], t.gold[1]), items: [], consumables: [] };
  if (rand(rng) < t.equipChance) out.items.push(rollItem(rng, { ilvl: ilvl + (tier === 'gold' ? 1 : 0), table: t.table }));
  else if (t.consumables.length) {
    const id = weighted(rng, t.consumables.map((c) => [c.item, c.weight]));
    out.consumables.push({ item: id, qty: CONSUMABLES[id] && CONSUMABLES[id].price < 30 ? 2 : 1 });
  }
  return out;
}
