// The Deep Stacks (docs/DEEP_STACKS_PLAN.md 2.5, 2.6, 6): item level and rarity by depth, consumables by band, the five loot
// zones, the Bookmark odds, red and blue chest rolls, the Binder's drop. Pure: every roll takes the caller's rng (core/rng.js
// createRng, or a plain function returning floats). The pack's register() adds the zones to ZONE_LOOT and the Binder to BOSS_LOOT.
//
// What uses what:
//   red chest   rollRedChest(rng, floor, vaultIds, opts) -> { items, consumables, gold, bookmark }    (C2-world, the chest event)
//   blue chest  rollBlueChest(rng, floor, vaultIds, opts) -> uniqueId | null                          (C2-world)
//   battle drops  the engine's own rollBattleDrops with zone 'cave_band_k' (ZONE_LOOT): call setLootFloor(floor) on every floor
//               arrival so the band's zone rolls at that floor's item level. Rarity there is the engine's 'normal' table (the depth
//               weights of rarityAt apply to chests only; the sim pass that owns loot.js next can route drops through them).
//   opts.props  the party's active cave-unique props (items.js wornProps): bookmark_twice, red_rarity_up, gold_double act here.
// Note: battle/loot.js rollItem turns a 'legendary' rarity into 'rare' today (Episode 1's placed-only rule), so the 2 to 3%
// legendary weight of deep floors reads as "rare" until C3 decides otherwise. Pinned in qa/cave/data_loot.test.mjs.

import { ZONE_LOOT, BOSS_LOOT } from '../loot-tables.js';
import { CONSUMABLES } from '../items.js';
import { rollItem, rollRarity } from '../../battle/loot.js';
import { bandIndex, isLanding, itemLevel, zoneIdFor, BOSS_FLOOR, FLOORS } from './foes.js';
import { CAVE_UNIQUES, CAVE_UNIQUE_IDS, BINDER_QUILL_ID } from './items.js';

export { itemLevel };

function rand(rng) { return typeof rng === 'function' ? rng() : rng.next(); }
function int(rng, a, b) { return a + Math.floor(rand(rng) * (b - a + 1)); }
function weighted(rng, entries) {   // [[value, weight], ...]
  const total = entries.reduce((s, e) => s + Math.max(0, e[1]), 0);
  if (total <= 0) return entries.length ? entries[0][0] : undefined;
  let r = rand(rng) * total;
  for (const [v, w] of entries) { r -= Math.max(0, w); if (r < 0) return v; }
  return entries[entries.length - 1][0];
}
const has = (opts, prop) => !!(opts && Array.isArray(opts.props) && opts.props.includes(prop));
const clampFloor = (f) => Math.max(1, Math.min(FLOORS, Math.round(f)));

// ---------------------------------------------------------------- rarity by depth (plan 6.1)
/** [floor, { common, magic, rare, legendary }] anchors; weights interpolate between them and hold past the last. */
export const RARITY_ANCHORS = [
  [1, { common: 70, magic: 25, rare: 5, legendary: 0 }],
  [20, { common: 55, magic: 35, rare: 10, legendary: 0 }],
  [40, { common: 42, magic: 40, rare: 16, legendary: 2 }],
  [60, { common: 30, magic: 45, rare: 22, legendary: 3 }],
];
const RARITY_ORDER = ['common', 'magic', 'rare', 'legendary'];
/** The rarity weights of a floor (a weights object battle/loot.js rollRarity accepts). Whole numbers; they sum to about 100. */
export function rarityAt(floor) {
  const f = clampFloor(floor);
  let lo = RARITY_ANCHORS[0], hi = RARITY_ANCHORS[RARITY_ANCHORS.length - 1];
  for (let i = 1; i < RARITY_ANCHORS.length; i++) if (f <= RARITY_ANCHORS[i][0]) { lo = RARITY_ANCHORS[i - 1]; hi = RARITY_ANCHORS[i]; break; }
  const u = f >= hi[0] ? 1 : (f - lo[0]) / (hi[0] - lo[0]);
  const out = {};
  for (const k of RARITY_ORDER) out[k] = Math.round(lo[1][k] + (hi[1][k] - lo[1][k]) * u);
  return out;
}
/** The same weights one rarity better: each tier's weight moves up a tier (the red_rarity_up prop). */
export function shiftRarityUp(weights) {
  const out = { common: 0, magic: 0, rare: 0, legendary: 0 };
  for (let i = 0; i < RARITY_ORDER.length; i++) {
    const to = RARITY_ORDER[Math.min(RARITY_ORDER.length - 1, i + 1)];
    out[to] += weights[RARITY_ORDER[i]] || 0;
  }
  return out;
}

// ---------------------------------------------------------------- consumables by band (plan 6.1)
export const CONSUMABLES_BY_BAND = {
  1: [{ item: 'potion', weight: 50 }, { item: 'antidote', weight: 15 }, { item: 'eye_drops', weight: 15 }, { item: 'echo_herb', weight: 10 }, { item: 'ether', weight: 10 }],
  2: [{ item: 'potion', weight: 30 }, { item: 'hi_potion', weight: 20 }, { item: 'ether', weight: 25 }, { item: 'echo_herb', weight: 15 }, { item: 'phoenix_feather', weight: 10 }],
  3: [{ item: 'hi_potion', weight: 35 }, { item: 'ether', weight: 20 }, { item: 'hi_ether', weight: 10 }, { item: 'silver_salve', weight: 10 }, { item: 'phoenix_feather', weight: 15 }, { item: 'echo_herb', weight: 10 }],
  4: [{ item: 'hi_potion', weight: 35 }, { item: 'hi_ether', weight: 20 }, { item: 'phoenix_feather', weight: 15 }, { item: 'quench_flask', weight: 15 }, { item: 'echo_herb', weight: 15 }],
  5: [{ item: 'hi_potion', weight: 30 }, { item: 'hi_ether', weight: 25 }, { item: 'phoenix_feather', weight: 20 }, { item: 'quench_flask', weight: 10 }, { item: 'silver_salve', weight: 15 }],
};
/** The consumable table of a floor: [{ item, weight }]. */
export function consumablesAt(floor) { return CONSUMABLES_BY_BAND[bandIndex(clampFloor(floor))].map((c) => ({ ...c })); }

// ---------------------------------------------------------------- zones (ZONE_LOOT, battle drops)
export const CAVE_ZONE_LOOT = {
  cave_band_1: { ilvl: itemLevel(1), equipChance: 0.12, cave: true },
  cave_band_2: { ilvl: itemLevel(20), equipChance: 0.14, cave: true },
  cave_band_3: { ilvl: itemLevel(40), equipChance: 0.16, cave: true },
  cave_band_4: { ilvl: itemLevel(60), equipChance: 0.18, cave: true },
  cave_band_5: { ilvl: itemLevel(80), equipChance: 0.20, cave: true },
};
/** Point the band's loot zone at a floor's item level (call on every floor arrival). Returns the zone id. */
export function setLootFloor(floor) {
  const id = zoneIdFor(clampFloor(floor));
  if (ZONE_LOOT[id] && ZONE_LOOT[id].cave) ZONE_LOOT[id].ilvl = itemLevel(floor);
  return id;
}

// ---------------------------------------------------------------- the Bookmark (plan 2.6)
export const BOOKMARK_CHANCE = [[1, 0.04], [10, 0.08], [30, 0.12]];
/** Chance a red chest holds a Keeper's Bookmark: 4% B1 to B9, 8% B10 to B29, 12% deeper; doubled by the bookmark_twice prop. */
export function bookmarkChance(floor, opts = {}) {
  const f = clampFloor(floor);
  let p = BOOKMARK_CHANCE[0][1];
  for (const [from, chance] of BOOKMARK_CHANCE) if (f >= from) p = chance;
  if (has(opts, 'bookmark_twice')) p *= 2;
  return Math.min(0.5, p);
}

// ---------------------------------------------------------------- red chests (plan 2.5, 6.1)
/** Chance a red chest holds gear rather than consumables: the first floors lend weapons to empty hands. */
export function redEquipChance(floor) { const f = clampFloor(floor); return f <= 3 ? 0.6 : f <= 19 ? 0.5 : 0.45; }
const EARLY_SLOTS = { weapon: 60, body: 15, head: 10, charm: 5, boots: 5, mantle: 5 };
/** Gold in a red chest: [min, max], grows with the floor (there is nothing to buy; gold is lost on exit). */
export function goldAt(floor) { const f = clampFloor(floor); return [8 + 4 * f, 20 + 9 * f]; }

/**
 * Roll a red chest's contents. The Stacks LEND: everything here is lost on exit except a Bookmark that gets used.
 *   { items: [instances], consumables: [{ item, qty }], gold, bookmark: bool }
 * opts: { props: [propIds], landing: bool, holdsBookmark: bool }. On a landing the Bookmark is guaranteed when the party holds none
 * (plan 2.6). vaultIds is accepted for signature symmetry with rollBlueChest and not read: red chests never hold uniques.
 */
export function rollRedChest(rng, floor, vaultIds = [], opts = {}) {
  const f = clampFloor(floor);
  const out = { items: [], consumables: [], gold: 0, bookmark: false };
  const [g0, g1] = goldAt(f);
  out.gold = int(rng, g0, g1) * (has(opts, 'gold_double') ? 2 : 1);
  if (rand(rng) < redEquipChance(f)) {
    let weights = rarityAt(f);
    if (has(opts, 'red_rarity_up')) weights = shiftRarityUp(weights);
    const rarity = rollRarity(rng, weights);
    const slot = f <= 5 ? weighted(rng, Object.entries(EARLY_SLOTS)) : undefined;
    out.items.push(rollItem(rng, { ilvl: itemLevel(f), rarity, slot }));
  } else {
    const table = consumablesAt(f).map((c) => [c.item, c.weight]);
    const n = rand(rng) < 0.35 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const id = weighted(rng, table);
      const qty = CONSUMABLES[id] && CONSUMABLES[id].price < 30 ? 2 : 1;
      const row = out.consumables.find((c) => c.item === id);
      if (row) row.qty += qty; else out.consumables.push({ item: id, qty });
    }
  }
  const guaranteed = !!opts.landing && !opts.holdsBookmark;
  out.bookmark = guaranteed || rand(rng) < bookmarkChance(f, opts);
  return out;
}

// ---------------------------------------------------------------- blue chests (plan 2.5, 6.3)
/** Weight of a unique in a blue chest on a floor: 4 for the floor's band, 1 for an earlier band, a quarter for a deeper one. */
export function blueWeight(uniqueId, floor) {
  const u = CAVE_UNIQUES[uniqueId];
  if (!u || !u.band) return 0;
  const k = bandIndex(clampFloor(floor));
  return u.band === k ? 4 : u.band < k ? 1 : 0.25;
}
/**
 * Which unique a blue chest gives: one not in the vault (and not in opts.exclude, this run's unbanked finds), weighted toward
 * the band's own. null when every one is held (the generator then places a red chest with a rare roll, plan 4). The Quill is
 * never rolled: it is the Binder's.
 */
export function rollBlueChest(rng, floor, vaultIds = [], opts = {}) {
  const held = new Set([...(vaultIds || []), ...((opts && opts.exclude) || [])]);
  const pool = CAVE_UNIQUE_IDS.filter((id) => !held.has(id) && id !== BINDER_QUILL_ID);
  if (!pool.length) return null;
  return weighted(rng, pool.map((id) => [id, blueWeight(id, floor)]));
}
/** True when the vault still misses a blue-chest unique (the pity rule only places blue chests while this holds). */
export function vaultIncomplete(vaultIds = []) { const v = new Set(vaultIds || []); return CAVE_UNIQUE_IDS.some((id) => !v.has(id)); }

/**
 * The blue-chest pity rule (plan 4): a blue chest appears on a floor when ten floors have passed since the last one, or on a 7%
 * roll, never two floors in a row, never on a landing or B100, and only while the vault is incomplete. Pure; `rng` is consumed
 * only when the roll is reached. lastBlueFloor is 0 when the run has had none.
 */
export const BLUE_PITY_FLOORS = 10;
export const BLUE_CHANCE = 0.07;
export function blueChestDue(rng, floor, lastBlueFloor = 0, vaultIds = []) {
  const f = clampFloor(floor);
  if (isLanding(f) || f >= BOSS_FLOOR || !vaultIncomplete(vaultIds)) return false;
  if (lastBlueFloor && f - lastBlueFloor <= 1) return false;
  if (f - (lastBlueFloor || 0) >= BLUE_PITY_FLOORS) return true;
  return rand(rng) < BLUE_CHANCE;
}

// ---------------------------------------------------------------- the Binder's drop (plan 2.12)
export const BINDER_LOOT = { unique: BINDER_QUILL_ID, rolls: 2, table: 'boss', ilvl: 16,
  consumables: [{ item: 'phoenix_feather', qty: 2 }, { item: 'hi_ether', qty: 2 }] };

let done = false;
/** Add the five loot zones and the Binder's drop. Safe to call twice. */
export function register() {
  if (done) return;
  for (const [id, z] of Object.entries(CAVE_ZONE_LOOT)) if (!ZONE_LOOT[id]) ZONE_LOOT[id] = { ...z };
  if (!BOSS_LOOT.binder) BOSS_LOOT.binder = { ...BINDER_LOOT, consumables: BINDER_LOOT.consumables.map((c) => ({ ...c })) };
  done = true;
}
export default register;
