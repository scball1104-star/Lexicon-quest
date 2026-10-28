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
//   opts.props  the party's active cave-unique props (items.js wornProps): bookmark_more, bookmark_twice, lent_more, feather_find,
//               red_rarity_up, larder_1 and larder act here (C4-uniques; gold_double is gone: the Stacks' gold buys nothing,
//               CRITIQUE_STACKS 15).
// C4-uniques (Scott, plan 13 E): a blue chest rolls a GRADE by floor first (GRADE_ODDS: Lesser likely shallow, Named likely deep),
// then an unheld unique of that grade weighted to the floor's band; and blueChestDue adds a second, depth-rising roll so a deep run
// finds about fourteen (BLUE_SECOND), with the first blue by B9 (BLUE_PITY_FIRST, CRITIQUE_STACKS 9).
// Note: battle/loot.js rollItem turns a 'legendary' rarity into 'rare' today (Episode 1's placed-only rule), so the 2 to 3%
// legendary weight of deep floors reads as "rare" (kept: the blue chests are the Stacks' legendaries). Pinned in
// qa/cave/data_loot.test.mjs.
// C3-sim-bot's balance pass (docs/DEEP_STACKS_BALANCE.md): the larder (CONSUMABLES_BY_BAND, CONSUMABLE_EXTRA, LANDING_SUPPLY,
// one row at most four), the first band's weapons leaning to the start kinds (EARLY_WEAPON_TYPES), and red-chest bases drawn at
// item level 2 at least (BASE_ILVL_MIN: no base has item level 1, so B1 to B5 lent nothing but Short Swords). Battle drops on
// B1 to B5 roll at item level 1 through the engine; since C4-fixes battle/loot.js rollBase draws the slot's lowest bases of every
// type there (it fell back to the single Short Sword). C4-fixes also: no gold in red chests (a gear chest may carry a supply),
// the first red chest of B1 to B3 lends a bare-handed reader a weapon (world.js redChestOpts), no cures from foes (CURE_IDS).

import { ZONE_LOOT, BOSS_LOOT, SLOT_WEIGHTS } from '../loot-tables.js';
import { CONSUMABLES } from '../items.js';
import { rollItem, rollRarity, rollBase } from '../../battle/loot.js';
import { bandIndex, isLanding, itemLevel, zoneIdFor, BOSS_FLOOR, FLOORS } from './foes.js';
import { CAVE_UNIQUES, CAVE_UNIQUE_IDS, BINDER_QUILL_ID, GRADE_IDS } from './items.js';

export { itemLevel };

function rand(rng) { return typeof rng === 'function' ? rng() : rng.next(); }
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
// C3-sim-bot (docs/DEEP_STACKS_BALANCE.md): the Stacks have no rests, so these are the party's whole larder. Potions and Ethers
// lead (Mira's MP is the healing budget), Phoenix Feathers from the first band (a member who falls with none in the bag stays down
// for the rest of the reading), the cures that have no use outside a fight stay rare.
// C4-fixes (CRITIQUE_STACKS 8, DEEP_STACKS_BALANCE 7.7): foes drop no cures in the Stacks now (CURE_IDS), so the chests keep a few;
// the deep bands lean to Hi-Potions and Hi-Ethers (the careful party met the Binder with MP 0, 5 and 3), and Feathers are rarer
// from band 2 (about twenty sat in the bag by B90).
export const CONSUMABLES_BY_BAND = {
  1: [{ item: 'potion', weight: 44 }, { item: 'ether', weight: 34 }, { item: 'phoenix_feather', weight: 6 }, { item: 'echo_herb', weight: 4 }, { item: 'antidote', weight: 2 }, { item: 'eye_drops', weight: 2 }],
  2: [{ item: 'potion', weight: 18 }, { item: 'hi_potion', weight: 29 }, { item: 'ether', weight: 30 }, { item: 'hi_ether', weight: 16 }, { item: 'phoenix_feather', weight: 4 }, { item: 'echo_herb', weight: 2 }, { item: 'antidote', weight: 1 }],
  3: [{ item: 'hi_potion', weight: 48 }, { item: 'ether', weight: 8 }, { item: 'hi_ether', weight: 37 }, { item: 'phoenix_feather', weight: 3 }, { item: 'silver_salve', weight: 2 }, { item: 'echo_herb', weight: 1 }, { item: 'eye_drops', weight: 1 }],
  4: [{ item: 'hi_potion', weight: 50 }, { item: 'hi_ether', weight: 42 }, { item: 'phoenix_feather', weight: 2 }, { item: 'silver_salve', weight: 2 }, { item: 'echo_herb', weight: 1 }, { item: 'antidote', weight: 1 }],
  5: [{ item: 'hi_potion', weight: 50 }, { item: 'hi_ether', weight: 42 }, { item: 'phoenix_feather', weight: 2 }, { item: 'silver_salve', weight: 2 }, { item: 'echo_herb', weight: 1 }, { item: 'eye_drops', weight: 1 }],
};
/** The consumable table of a floor: [{ item, weight }]. */
export function consumablesAt(floor) { return CONSUMABLES_BY_BAND[bandIndex(clampFloor(floor))].map((c) => ({ ...c })); }
/**
 * How many consumable rolls a red chest that holds no gear makes: one, a second at CONSUMABLE_EXTRA[0], a third at [1]. The
 * Stacks have no rests (plan 3), so the chests are the party's only larder (C3-sim-bot; the numbers are the balance pass's).
 */
export const CONSUMABLE_EXTRA = [0.6, 0.3];
export function consumableCount(rng, floor) {
  let n = 1;
  for (const p of CONSUMABLE_EXTRA) if (p > 0 && rand(rng) < p) n++;
  return n;
}
/**
 * The landing's red chest is also the Keepers' larder (C3-sim-bot): every landing (B10 ... B90) adds this bundle to its roll,
 * so a reading that reaches a landing can stand up again before the next band. [{ item, qty }] by band.
 */
export const LANDING_SUPPLY = {
  1: [{ item: 'potion', qty: 4 }, { item: 'ether', qty: 3 }, { item: 'phoenix_feather', qty: 1 }],
  2: [{ item: 'hi_potion', qty: 3 }, { item: 'ether', qty: 3 }, { item: 'phoenix_feather', qty: 1 }],
  3: [{ item: 'hi_potion', qty: 3 }, { item: 'hi_ether', qty: 2 }],
  4: [{ item: 'hi_potion', qty: 3 }, { item: 'hi_ether', qty: 2 }],
  5: [{ item: 'hi_potion', qty: 3 }, { item: 'hi_ether', qty: 2 }],
};
export function landingSupply(floor) { return (LANDING_SUPPLY[bandIndex(clampFloor(floor))] || []).map((c) => ({ ...c })); }
const CHEST_ROW_MAX = 4;   // one consumable at most four to a chest roll (a third Potion roll adds nothing past it)
function addConsumable(out, id, qty, max = CHEST_ROW_MAX) {
  const row = out.consumables.find((c) => c.item === id);
  if (row) row.qty = Math.min(max, row.qty + qty); else out.consumables.push({ item: id, qty: Math.min(max, qty) });
}

// ---------------------------------------------------------------- zones (ZONE_LOOT, battle drops)
/**
 * The cures foes never drop inside the Stacks (C4-fixes, CRITIQUE_STACKS 8 and DEEP_STACKS_BALANCE 7.7: a careful party reached
 * B95 with 62 Eye Drops and 62 Echo Herbs and one Potion). battle/loot.js rollBattleDrops reads a zone's `noDrops` (the rng is
 * drawn as before, so nothing else moves); the red chests keep a few of each. `cave: true` also rolls an elite's drop at the
 * floor's item level instead of its home zone's (Known 4).
 */
export const CURE_IDS = ['antidote', 'eye_drops', 'echo_herb', 'silver_salve', 'quench_flask'];
/** From the Ember Shelves the valley's foes walk in too: their plain Potions (a few HP at that depth) stay with them. */
const DEEP_NO_DROPS = [...CURE_IDS, 'potion'];
export const CAVE_ZONE_LOOT = {
  cave_band_1: { ilvl: itemLevel(1), equipChance: 0.12, cave: true, noDrops: CURE_IDS },
  cave_band_2: { ilvl: itemLevel(20), equipChance: 0.14, cave: true, noDrops: CURE_IDS },
  cave_band_3: { ilvl: itemLevel(40), equipChance: 0.16, cave: true, noDrops: CURE_IDS },
  cave_band_4: { ilvl: itemLevel(60), equipChance: 0.18, cave: true, noDrops: DEEP_NO_DROPS },
  cave_band_5: { ilvl: itemLevel(80), equipChance: 0.20, cave: true, noDrops: DEEP_NO_DROPS },
};
/** Point the band's loot zone at a floor's item level (call on every floor arrival). Returns the zone id. */
export function setLootFloor(floor) {
  const id = zoneIdFor(clampFloor(floor));
  if (ZONE_LOOT[id] && ZONE_LOOT[id].cave) ZONE_LOOT[id].ilvl = itemLevel(floor);
  return id;
}

// ---------------------------------------------------------------- the Bookmark (plan 2.6)
export const BOOKMARK_CHANCE = [[1, 0.04], [10, 0.08], [30, 0.12]];
/**
 * Chance a red chest holds a Keeper's Bookmark: 4% B1 to B9, 8% B10 to B29, 12% deeper; half again with the bookmark_more prop,
 * doubled by bookmark_twice (both: three times), capped at 50%.
 */
export function bookmarkChance(floor, opts = {}) {
  const f = clampFloor(floor);
  let p = BOOKMARK_CHANCE[0][1];
  for (const [from, chance] of BOOKMARK_CHANCE) if (f >= from) p = chance;
  if (has(opts, 'bookmark_more')) p *= 1.5;
  if (has(opts, 'bookmark_twice')) p *= 2;
  return Math.min(0.5, Math.round(p * 1e6) / 1e6);
}

// ---------------------------------------------------------------- red chests (plan 2.5, 6.1)
/** Chance a red chest holds gear rather than consumables: the first floors lend weapons to empty hands; the lent_more prop adds LENT_MORE. */
export function redEquipChance(floor, opts = {}) {
  const f = clampFloor(floor);
  const p = f <= 3 ? 0.6 : f <= 19 ? 0.5 : 0.45;
  return has(opts, 'lent_more') ? Math.min(0.8, p + LENT_MORE) : p;
}
/** What the lent_more prop (Juror's Mantle) adds to a red chest's gear chance. */
export const LENT_MORE = 0.15;
/** larder_1 (Hearth Charm, Warm Larder): the chance a supply chest makes one more roll; larder (Kept Stores) always does. */
export const LARDER_1 = 0.5;
/** feather_find (Cinder-Step Shoes, Carried Out): the Phoenix Feather's weight in a supply roll is this many times the band's. */
export const FEATHER_FIND = 3;
const EARLY_SLOTS = { weapon: 60, body: 15, head: 10, charm: 5, boots: 5, mantle: 5 };
/**
 * B1 to B19 (C3-sim-bot): a lent weapon is mostly a kind each reader starts with (the hero's sword, Mira's staff, Bram's spear),
 * so three empty pairs of hands fill in the first floors; the axe and the bow still turn up. Before this, two readers in five
 * were still bare-handed on B4 and the descent died there (docs/DEEP_STACKS_BALANCE.md).
 */
export const EARLY_WEAPON_TYPES = { sword: 3, staff: 3, spear: 3, axe: 1, bow: 1 };
/** The last floor whose red-chest weapons lean to the start kinds (the first band). */
export const EARLY_WEAPON_FLOORS = 19;
/**
 * The lowest item level any base has: the tier 1 bases (data/items.js) are item level 2. Below it battle/loot.js rollBase has an
 * empty pool and falls back to the slot's single lowest base whatever the type (every B1 to B5 weapon was a Short Sword), so a
 * red chest draws its BASE at this level at least; the instance keeps the floor's item level (plan 6.1). C3-sim-bot.
 */
export const BASE_ILVL_MIN = 2;
/**
 * No gold in a red chest any more (C4-fixes, CRITIQUE_STACKS 15: there is nothing to buy and it is lost on exit): a chest that
 * lends gear carries a supply roll at GEAR_CHEST_SUPPLY instead. goldAt stays as the record of what the chests used to hold.
 */
export function goldAt(floor) { const f = clampFloor(floor); return [8 + 4 * f, 20 + 9 * f]; }
export const GEAR_CHEST_SUPPLY = 0.35;
/** A spare is all a reading needs: a red chest rolls no Bookmark while the party holds this many (CRITIQUE_STACKS 8: 25 spares by B90). */
export const BOOKMARK_SPARES = 2;
/** B1 to B3: the first red chest opened on the floor lends a weapon of opts.lend's type (an empty-handed reader's own kind, world.js). */
export const LEND_FLOORS = 3;

/**
 * Roll a red chest's contents. The Stacks LEND: everything here is lost on exit except a Bookmark that gets used.
 *   { items: [instances], consumables: [{ item, qty }], gold (0 since C4-fixes), bookmark: bool }
 * opts: { props: [propIds], landing: bool, holdsBookmark: bool, bookmarks: count held, lend: a weapon type }. On a landing the Bookmark is guaranteed when the party holds none
 * (plan 2.6). vaultIds is accepted for signature symmetry with rollBlueChest and not read: red chests never hold uniques.
 * The props: lent_more (gear more often), red_rarity_up (gear one rarity better), larder (a supply chest makes one more roll),
 * larder_1 (one more at LARDER_1), feather_find (Phoenix Feathers FEATHER_FIND times as likely in a supply roll), bookmark_more
 * and bookmark_twice (bookmarkChance). With none worn the rng is drawn exactly as before C4.
 */
export function rollRedChest(rng, floor, vaultIds = [], opts = {}) {
  const f = clampFloor(floor);
  const out = { items: [], consumables: [], gold: 0, bookmark: false };
  const lend = f <= LEND_FLOORS && opts.lend ? opts.lend : null;
  const lean = has(opts, 'feather_find') ? FEATHER_FIND : 1;
  const table = consumablesAt(f).map((c) => [c.item, c.item === 'phoenix_feather' ? c.weight * lean : c.weight]);
  const supply = () => { const id = weighted(rng, table); addConsumable(out, id, CONSUMABLES[id] && CONSUMABLES[id].price < 30 ? 2 : 1); };
  if (lend || rand(rng) < redEquipChance(f, opts)) {
    let weights = rarityAt(f);
    if (has(opts, 'red_rarity_up')) weights = shiftRarityUp(weights);
    const rarity = rollRarity(rng, weights);
    const il = itemLevel(f);
    // B1 to B5 lend weapons first (EARLY_SLOTS); the rest of the first band rolls the engine's own slot weights, but a weapon there
    // is still mostly a start kind (EARLY_WEAPON_FLOORS), so Mira finds a staff (Channel is her only MP back between rests that
    // never come) and Bram a spear. opts.lend (B1 to B3, the floor's first red chest, an empty-handed reader): that reader's kind.
    const slot = lend ? 'weapon' : f <= 5 ? weighted(rng, Object.entries(EARLY_SLOTS)) : f <= EARLY_WEAPON_FLOORS ? weighted(rng, Object.entries(SLOT_WEIGHTS)) : undefined;
    const type = lend || (slot === 'weapon' ? weighted(rng, Object.entries(EARLY_WEAPON_TYPES)) : undefined);
    const base = il < BASE_ILVL_MIN ? rollBase(rng, { slot, ilvl: BASE_ILVL_MIN, type }) : null;
    out.items.push(rollItem(rng, { ilvl: il, rarity, slot, type, base: base ? base.id : undefined }));
    if (rand(rng) < GEAR_CHEST_SUPPLY) supply();
  } else {
    const n = consumableCount(rng, f) + (has(opts, 'larder') ? 1 : has(opts, 'larder_1') && rand(rng) < LARDER_1 ? 1 : 0);
    for (let i = 0; i < n; i++) supply();
  }
  if (opts.landing) for (const c of landingSupply(f)) addConsumable(out, c.item, c.qty, 99);
  const held = opts.bookmarks != null ? opts.bookmarks : opts.holdsBookmark ? 1 : 0;
  const guaranteed = !!opts.landing && !held;
  out.bookmark = guaranteed || (rand(rng) < bookmarkChance(f, opts) && held < BOOKMARK_SPARES);
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
 * The grade odds by floor (Scott, plan 13 E): [floor, [Lesser, Greater, Named]] knots, linear between them, held past the last.
 * Shallow floors mostly give Lesser and rarely Named; the odds turn over near B60; deep floors mostly give Named.
 */
export const GRADE_ODDS = [
  [1, [85, 14, 1]],
  [20, [60, 33, 7]],
  [40, [35, 45, 20]],
  [60, [18, 42, 40]],
  [80, [7, 28, 65]],
  [99, [3, 17, 80]],
];
/** The grade weights of a floor: { 1: Lesser, 2: Greater, 3: Named }, summing to 100 (one decimal). */
export function gradeOdds(floor) {
  const f = clampFloor(Math.min(floor, GRADE_ODDS[GRADE_ODDS.length - 1][0]));
  let lo = GRADE_ODDS[0], hi = GRADE_ODDS[GRADE_ODDS.length - 1];
  for (let i = 1; i < GRADE_ODDS.length; i++) if (f <= GRADE_ODDS[i][0]) { lo = GRADE_ODDS[i - 1]; hi = GRADE_ODDS[i]; break; }
  const u = hi[0] === lo[0] ? 1 : (f - lo[0]) / (hi[0] - lo[0]);
  const out = {};
  GRADE_IDS.forEach((g, i) => { out[g] = Math.round((lo[1][i] + (hi[1][i] - lo[1][i]) * u) * 10) / 10; });
  return out;
}
/** Roll a grade for a floor (one rng draw). */
export function rollGrade(rng, floor) {
  const w = gradeOdds(floor);
  return weighted(rng, GRADE_IDS.map((g) => [g, w[g]]));
}
/**
 * Which unique a blue chest gives: first a grade by floor (gradeOdds), then one unique of that grade not in the vault (and not in
 * opts.exclude, this run's unbanked finds), weighted toward the band's own (blueWeight). A grade with nothing left falls to the
 * nearest grade that has something (a tie goes to the grade the floor favours). null when every one is held (the chest then lends
 * a red roll one rarity better, world.js). The Quill is never rolled: it is the Binder's.
 */
export function rollBlueChest(rng, floor, vaultIds = [], opts = {}) {
  const held = new Set([...(vaultIds || []), ...((opts && opts.exclude) || [])]);
  const pools = Object.fromEntries(GRADE_IDS.map((g) => [g, []]));
  for (const id of CAVE_UNIQUE_IDS) if (!held.has(id) && id !== BINDER_QUILL_ID && pools[CAVE_UNIQUES[id].grade]) pools[CAVE_UNIQUES[id].grade].push(id);
  if (!GRADE_IDS.some((g) => pools[g].length)) return null;
  let grade = rollGrade(rng, floor);
  if (!pools[grade].length) {
    const w = gradeOdds(floor);
    grade = GRADE_IDS.filter((g) => pools[g].length).sort((a, b) => Math.abs(a - grade) - Math.abs(b - grade) || w[b] - w[a])[0];
  }
  return weighted(rng, pools[grade].map((id) => [id, blueWeight(id, floor)]));
}
/** True when the vault still misses a blue-chest unique (the pity rule only places blue chests while this holds). */
export function vaultIncomplete(vaultIds = []) { const v = new Set(vaultIds || []); return CAVE_UNIQUE_IDS.some((id) => !v.has(id)); }

/**
 * The blue-chest pity rule (plan 4): a blue chest appears on a floor when ten floors have passed since the last one (nine before
 * the first: the first landing's Bookmark always has a blue to bank, CRITIQUE_STACKS 9), or on the plan's 7% roll, or on the
 * second roll (C4-uniques: BLUE_SECOND, rising with depth, so a deep reading finds about fourteen and the sixty are seen in about
 * five); never two floors in a row, never on a landing or B100, and only while the vault is incomplete. Pure; `rng` is consumed
 * only when a roll is reached. lastBlueFloor is 0 when the run has had none.
 */
export const BLUE_PITY_FLOORS = 10;
export const BLUE_PITY_FIRST = 9;
export const BLUE_CHANCE = 0.07;
/** The second blue roll: [floor, chance] knots, linear between, held past the last. */
export const BLUE_SECOND = [[1, 0], [99, 0.1]];
export function secondBlueChance(floor) {
  const f = clampFloor(floor);
  const [[f0, p0], [f1, p1]] = BLUE_SECOND;
  if (f <= f0) return p0;
  if (f >= f1) return p1;
  return p0 + ((p1 - p0) * (f - f0)) / (f1 - f0);
}
export function blueChestDue(rng, floor, lastBlueFloor = 0, vaultIds = []) {
  const f = clampFloor(floor);
  if (isLanding(f) || f >= BOSS_FLOOR || !vaultIncomplete(vaultIds)) return false;
  if (lastBlueFloor && f - lastBlueFloor <= 1) return false;
  if (f - (lastBlueFloor || 0) >= (lastBlueFloor ? BLUE_PITY_FLOORS : BLUE_PITY_FIRST)) return true;
  if (rand(rng) < BLUE_CHANCE) return true;
  const p2 = secondBlueChance(f);
  return p2 > 0 && rand(rng) < p2;
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
