// The Deep Stacks: run state (docs/DEEP_STACKS_PLAN.md sections 2, 7, 8; docs/briefs/C1-state.md). Pure over `game`:
// no engine, no scenes, no DOM, no Math.random. The scenes call these; C1-state wrote them. Every function mutates and
// returns; nothing here registers data (src/data/cave/index.js register() must have run before `enter` or `foundBlue`,
// because the vault's instances come from the shared UNIQUES table the pack fills).
//
//   ensureCave(g) -> g.cave        creates { vault: [], record: { floor, readings, clears, time }, run: null, snapshot: null }
//                                  on an old save (deserialize leaves `cave` undefined; nothing in state.js changed)
//   canEnter(g) -> { ok, why }     why: 'in_run' | 'ep1_incomplete' | 'no_party' | null
//   enter(g, { seed, playtime })   snapshot the overworld, reset the party to level 1, gear = vault instances, items {}, gold 0
//   descend(g) -> floor            floor + 1 (capped at 100), the record's deepest kept up
//   foundBlue(g, uniqueId) -> uid  this run's blue find: into run.blues and into `gear` (null when held already)
//   foundBookmark(g, qty) / hasBookmark(g) / bookmarks(g)      the Keeper's Bookmark (key item keepers_bookmark, counted)
//   noteChest(g) / noteKills(g, n)                              run.chests, run.kills
//   bank(g, { playtime })          RESTORE FIRST, then this run's blues join the vault and the restored inventory; one Bookmark
//                                  spent; { ok, floor, blues, elapsed, bookmarkUsed } or { ok: false, why }
//   die(g, { playtime })           restore; this run's blues are lost; the record keeps the floor; { ok, floor, lost, elapsed, cause }
//   quit(g, { playtime })          the menu's Quit inside the Stacks: die with cause 'quit'
//   clear(g, { playtime })         B100: bank with no Bookmark spent, the Quill into the vault, deep_stacks_cleared, clears + 1
//   resumeInfo(g) -> { floor, seed, blues } | null             for the title's "Resume the Deep Stacks (B23)"
//   inRun(g) floorOf(g) vaultIds(g) recordOf(g) bluesOf(g)     read-only views (copies)
//   reconcileVault(g)              the no-duplicate rule: every vault unique exists exactly once across worn slots and `gear`
//   riseAvailable(g, memberId) / takeRise(g, memberId)          the second_life prop (one free rise per member per reading)
//   suspendMeta(g)                 saveMeta(g) plus { cave: { floor, seed } } for the suspend save's envelope
//
// WHAT THE SNAPSHOT HOLDS (plan 2.2, deep copies): party (every member record: level, exp, hp, mp, fury, weapon, worn gear,
// mastery; skills are derived from level and mastery so they ride along), reserve, items, gear, gearNext, gold, map, pos,
// lastSafe, playtime. Flags, counters, opened (except the floors' one-shots, see below), bestiary, the Ledger, Vows and quests
// are NOT snapshotted: they persist through the run and out of it, as the plan's table says.
//
// WHAT RESETS ON ENTER: every active member to level 1 (exp 0, level-1 HP and MP, fury 0, the start weapon type, nothing
// worn in any slot, mastery 0 in every type). `gear` = one fresh instance of every vault unique (uids from 1; the snapshot's
// gearNext comes back on exit). `items` = {}. `gold` = 0. `opened` keys of generated floors (`cave_b*:`) are dropped so the
// next reading's chests are closed again (the entrance hall `cave_landing0` keeps its one-shots). Reserve members are left as
// they are: nothing in the game reads `reserve` today and the plan says only the current party enters.
//
// THE VAULT holds unique IDS (strings, no duplicates, in the order found), not instances: a cave unique has a fixed affix set
// folded into its stats, so an instance is rebuilt from the id (battle/loot.js toInstance) whenever one is needed. The
// overworld keeps the real instances: after `bank` they sit worn or in `gear` like any other item, `enter` snapshots them
// where they are and hands the run fresh copies, and `bank` or `die` restores the snapshot (the old copies come back) and
// then reconcileVault() makes sure every vault id exists exactly once (a missing one is added to `gear`, a surplus is removed
// from `gear`, never from a worn slot). A blue found this run is restored worn on the same member in the same slot when that
// slot is free on the restored member, else into `gear`.
//
// THE BOOKMARK is run inventory: `bank` needs one held and reports it spent; spares are lost with the rest of the run's items
// (the Stacks lend; the next reading's first landing guarantees one again). `clear` needs none and spends none.
//
// THE SUSPEND SAVE (plan 2.9; written by the field, C2-world, not here). On every floor arrival, after descend() and the
// floor's map is registered:   engine.save.save(SUSPEND_SLOT, serialize(game), suspendMeta(game))
// and engine.save.remove(SUSPEND_SLOT) inside bank, die, quit and clear's callers. Loading it: deserialize(env.data), then
// resumeInfo(g) gives the floor and seed to rebuild `cave_bNN` from; the party stands at the floor's arrival point.
// core/save.js checkSlot() accepts 0..3 only today; the exact change (owner: C2-world, the report repeats it):
//     export const SUSPEND_SLOTS = ['cave'];
//     function checkSlot(n) { if (typeof n === 'string' && SUSPEND_SLOTS.includes(n)) return; ...the old check... }
// list() never shows it (it loops 1..SLOT_COUNT); the title asks save.exists('cave') itself. The field's autosave must go
// to SUSPEND_SLOT while inRun(game) (never to slot 0, which Continue would load into a floor no longer registered).

import { newMember } from '../data/party.js';
import { UNIQUES } from '../data/items.js';
import { toInstance } from '../battle/loot.js';
import { hashSeed } from '../core/rng.js';
import { hasFlag, setFlag, give, take, count, addGear, removeGear, saveMeta } from './state.js';

export const FLOORS = 100;
export const BOSS_FLOOR = 100;
export const BOOKMARK_ID = 'keepers_bookmark';           // src/data/cave/items.js KEEPERS_BOOKMARK_ID
export const BINDER_QUILL_ID = 'cave_binders_quill';     // src/data/cave/items.js BINDER_QUILL_ID (B100's prize, never a blue chest)
export const ENTRY_FLAG = 'ep1_complete';
export const CLEARED_FLAG = 'deep_stacks_cleared';
export const SUSPEND_SLOT = 'cave';
export const SECOND_LIFE_PROP = 'second_life';
export const RISE_HP = 0.3;                              // the Rebound prop: the wearer rises at 30% of max HP
const FLOOR_OPENED_PREFIX = 'cave_b';                    // generated floors are cave_b1 .. cave_b100 (cave_landing0 is not one)

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const num = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const baseIdOf = (v) => (v ? (typeof v === 'string' ? v : v.base || null) : null);

export function emptyCave() {
  return { vault: [], record: { floor: 0, readings: 0, clears: 0, time: 0 }, run: null, snapshot: null };
}

/** game.cave, created or repaired in place (old saves load with it undefined). */
export function ensureCave(g) {
  if (!g.cave || typeof g.cave !== 'object') g.cave = emptyCave();
  const c = g.cave;
  if (!Array.isArray(c.vault)) c.vault = [];
  if (c.vault.some((id, i) => typeof id !== 'string' || c.vault.indexOf(id) !== i)) {   // repair only when needed: inRun() runs every frame
    c.vault = c.vault.filter((id, i) => typeof id === 'string' && c.vault.indexOf(id) === i);
  }
  if (!c.record || typeof c.record !== 'object') c.record = emptyCave().record;
  for (const k of ['floor', 'readings', 'clears', 'time']) c.record[k] = num(c.record[k], 0);
  if (!c.run || typeof c.run !== 'object') c.run = null;
  if (!c.snapshot || typeof c.snapshot !== 'object') c.snapshot = null;
  if (c.run) {
    c.run.floor = Math.max(1, Math.min(FLOORS, num(c.run.floor, 1)));
    if (!Array.isArray(c.run.blues)) c.run.blues = [];
    if (!Array.isArray(c.run.rises)) c.run.rises = [];
    c.run.chests = num(c.run.chests, 0); c.run.kills = num(c.run.kills, 0);
    c.run.started = num(c.run.started, 0); c.run.lastBlueFloor = num(c.run.lastBlueFloor, 0);
    c.run.seed = num(c.run.seed, 0) >>> 0;
  }
  if (c.run && !c.snapshot) { c.run = null; c.inRun = false; }   // a run with nothing to restore cannot be resumed or banked
  if (c.run && typeof c.inRun !== 'boolean') c.inRun = true;   // `inRun` appears with the first enter; an old save has the four fields only
  return c;
}

// ---- read-only views ------------------------------------------------------------------------------
export function inRun(g) { const c = ensureCave(g); return !!(c.inRun && c.run && c.snapshot); }
export function floorOf(g) { return inRun(g) ? g.cave.run.floor : 0; }
export function vaultIds(g) { return ensureCave(g).vault.slice(); }
export function recordOf(g) { return { ...ensureCave(g).record }; }
export function bluesOf(g) { return inRun(g) ? g.cave.run.blues.slice() : []; }
export function hasBookmark(g) { return count(g, BOOKMARK_ID) > 0; }
export function bookmarks(g) { return count(g, BOOKMARK_ID); }
/** For the title: the floor to resume at and the seed its map was built from, or null. */
export function resumeInfo(g) {
  if (!inRun(g)) return null;
  const r = g.cave.run;
  return { floor: r.floor, seed: r.seed, blues: r.blues.length };
}
/** The suspend save's envelope meta: the usual summary plus the floor (the title shows "B23" from it without deserializing). */
export function suspendMeta(g) {
  const m = saveMeta(g);
  return inRun(g) ? { ...m, cave: { floor: g.cave.run.floor, seed: g.cave.run.seed } } : m;
}

// ---- entry ------------------------------------------------------------------------------------------
export function canEnter(g) {
  const c = ensureCave(g);
  if (c.inRun && c.run) return { ok: false, why: 'in_run' };
  if (!hasFlag(g, ENTRY_FLAG)) return { ok: false, why: 'ep1_incomplete' };
  if (!Array.isArray(g.party) || !g.party.length) return { ok: false, why: 'no_party' };
  return { ok: true, why: null };
}

/** A fresh instance of a registered unique (no uid; addGear assigns one). Throws when the cave pack has not registered it. */
export function uniqueInstance(id) {
  if (!UNIQUES[id]) throw new Error(`cave unique ${id} is not registered (run src/data/cave/index.js register() first)`);
  return toInstance(id);
}

/** The member at level 1 with nothing worn and no mastery; name and any extra fields kept. */
function freshMember(m) {
  const f = newMember(m.id, { level: 1, name: m.name });
  return {
    ...m, level: 1, exp: f.exp, hp: f.hp, mp: f.mp, fury: 0, weapon: f.weapon,
    equip: Object.fromEntries(Object.keys(f.equip).map((k) => [k, null])),
    mastery: Object.fromEntries(Object.keys(f.mastery).map((k) => [k, 0])),
  };
}

function dropFloorOneShots(g) {
  if (!g.opened) return;
  for (const k of Object.keys(g.opened)) if (k.startsWith(FLOOR_OPENED_PREFIX) && /^cave_b\d+:/.test(k)) delete g.opened[k];
}

/**
 * Start a reading. opts.seed (a uint32; default from the game's seed and the reading number), opts.playtime (default
 * g.playtime). Returns { seed, floor: 1, vault: [ids] } or null when canEnter says no.
 */
export function enter(g, opts = {}) {
  if (!canEnter(g).ok) return null;
  const c = ensureCave(g);
  const playtime = num(opts.playtime, num(g.playtime, 0));
  const reading = c.record.readings + 1;
  const seed = (opts.seed != null ? Number(opts.seed) : hashSeed(`${g.seed}:reading:${reading}`)) >>> 0;
  c.snapshot = {
    party: clone(g.party), reserve: clone(g.reserve || []), items: clone(g.items || {}), gear: clone(g.gear || []),
    gearNext: num(g.gearNext, 1), gold: num(g.gold, 0), map: g.map, pos: clone(g.pos), lastSafe: clone(g.lastSafe), playtime,
  };
  g.party = g.party.map(freshMember);
  g.gear = []; g.gearNext = 1;
  for (const id of c.vault) addGear(g, uniqueInstance(id));
  g.items = {};
  g.gold = 0;
  dropFloorOneShots(g);
  c.run = { seed, floor: 1, blues: [], chests: 0, kills: 0, started: playtime, lastBlueFloor: 0, rises: [] };
  c.record.readings = reading;
  if (c.record.floor < 1) c.record.floor = 1;
  c.inRun = true;
  return { seed, floor: 1, vault: c.vault.slice() };
}

// ---- inside a run ---------------------------------------------------------------------------------------
export function descend(g) {
  if (!inRun(g)) return 0;
  const c = g.cave;
  c.run.floor = Math.min(FLOORS, c.run.floor + 1);
  if (c.run.floor > c.record.floor) c.record.floor = c.run.floor;
  return c.run.floor;
}

/** A blue chest's unique: into run.blues and into `gear`. Returns the uid, or null (not in a run, held already, not a cave unique). */
export function foundBlue(g, id) {
  if (!inRun(g)) return null;
  const c = g.cave;
  if (c.vault.includes(id) || c.run.blues.includes(id)) return null;
  const u = UNIQUES[id];
  if (!u || !u.cave) return null;
  c.run.blues.push(id);
  c.run.lastBlueFloor = c.run.floor;
  return addGear(g, uniqueInstance(id));
}

export function foundBookmark(g, qty = 1) { return give(g, BOOKMARK_ID, Math.max(1, Math.floor(qty))); }
export function noteChest(g) { if (!inRun(g)) return 0; return ++g.cave.run.chests; }
export function noteKills(g, n = 1) { if (!inRun(g)) return 0; g.cave.run.kills += Math.max(0, Math.floor(n)); return g.cave.run.kills; }

/** Which run member wears each of `ids` and in which equip key: { id: { member, key } }. */
function wornBy(g, ids) {
  const out = {};
  for (const m of g.party || []) for (const [key, v] of Object.entries(m.equip || {})) {
    const id = baseIdOf(v);
    if (id && ids.includes(id) && !out[id]) out[id] = { member: m.id, key };
  }
  return out;
}

/** True when the member wears a cave unique carrying `prop` (CAVE_PROPS ids in src/data/cave/items.js). */
export function wearsProp(m, prop) {
  for (const v of Object.values((m && m.equip) || {})) {
    const u = UNIQUES[baseIdOf(v)];
    if (u && u.cave && u.prop === prop) return true;
  }
  return false;
}

/** The second_life prop: a wearer who falls in a cave battle rises once per reading. The battle seam asks, then takes. */
export function riseAvailable(g, memberId) {
  if (!inRun(g)) return false;
  const m = (g.party || []).find((x) => x.id === memberId);
  if (!m || g.cave.run.rises.includes(memberId)) return false;
  return wearsProp(m, SECOND_LIFE_PROP);
}
/** Spend the member's rise. Returns { member, hpFrac } (set hp = max(1, ceil(maxHp * hpFrac))) or null. */
export function takeRise(g, memberId) {
  if (!riseAvailable(g, memberId)) return null;
  g.cave.run.rises.push(memberId);
  return { member: memberId, hpFrac: RISE_HP };
}

// ---- the exits: restore FIRST, then anything else -------------------------------------------------------
function restore(g) {
  const s = g.cave.snapshot;
  g.party = clone(s.party);
  g.reserve = clone(s.reserve) || [];
  g.items = clone(s.items) || {};
  g.gear = clone(s.gear) || [];
  g.gearNext = num(s.gearNext, 1);
  g.gold = num(s.gold, 0);
  g.map = s.map;
  g.pos = clone(s.pos);
  g.lastSafe = clone(s.lastSafe);
}

function elapsedOf(g, playtime) { return Math.max(0, num(playtime, num(g.playtime, 0)) - num(g.cave.run.started, 0)); }

function closeRun(g, floor, elapsed) {
  const c = g.cave;
  c.record.time += elapsed;
  if (floor > c.record.floor) c.record.floor = floor;
  c.run = null; c.snapshot = null; c.inRun = false;
}

/**
 * Every vault unique exists exactly once across worn slots (party and reserve) and `gear`: a missing one is added to `gear`,
 * a surplus is removed from `gear` (a worn copy is never taken off). Returns { added: [ids], removed: [ids] }.
 */
export function reconcileVault(g) {
  const c = ensureCave(g);
  const added = [], removed = [];
  for (const id of c.vault) {
    let worn = 0;
    for (const m of [...(g.party || []), ...(g.reserve || [])]) for (const v of Object.values(m.equip || {})) if (baseIdOf(v) === id) worn++;
    const inGear = (g.gear || []).filter((it) => baseIdOf(it) === id);
    const n = worn + inGear.length;
    if (n === 0) { addGear(g, uniqueInstance(id)); added.push(id); }
    else if (n > 1) for (const it of inGear.slice(0, n - 1)) { removeGear(g, it.uid); removed.push(id); }
  }
  return { added, removed };
}

/**
 * Bank the reading. opts.playtime (default g.playtime), opts.free (true: no Bookmark needed or spent; `clear` uses it).
 * Restores the snapshot first, then this run's blues join the vault and the restored inventory (worn where they were worn and
 * the restored slot is free, else `gear`), then the record. Returns { ok, floor, blues, elapsed, bookmarkUsed } or { ok: false, why }.
 */
export function bank(g, opts = {}) {
  if (!inRun(g)) return { ok: false, why: 'not_in_run' };
  if (!opts.free && !hasBookmark(g)) return { ok: false, why: 'no_bookmark' };
  const c = g.cave;
  const floor = c.run.floor;
  const blues = c.run.blues.slice();
  const elapsed = elapsedOf(g, opts.playtime);
  const worn = wornBy(g, blues);
  if (!opts.free) take(g, BOOKMARK_ID, 1);
  restore(g);
  for (const id of blues) {
    if (!c.vault.includes(id)) c.vault.push(id);
    const w = worn[id];
    const m = w && g.party.find((x) => x.id === w.member);
    if (m && m.equip && m.equip[w.key] == null) m.equip[w.key] = uniqueInstance(id);
    else addGear(g, uniqueInstance(id));
  }
  reconcileVault(g);
  closeRun(g, floor, elapsed);
  return { ok: true, floor, blues, elapsed, bookmarkUsed: !opts.free };
}

/** A party wipe (or Quit) inside the Stacks: restore; this run's blues are lost; the record keeps the floor and the time. */
export function die(g, opts = {}) {
  if (!inRun(g)) return { ok: false, why: 'not_in_run' };
  const c = g.cave;
  const floor = c.run.floor;
  const lost = c.run.blues.slice();
  const elapsed = elapsedOf(g, opts.playtime);
  restore(g);
  reconcileVault(g);
  closeRun(g, floor, elapsed);
  return { ok: true, floor, lost, elapsed, cause: opts.cause || 'wipe' };
}
export function quit(g, opts = {}) { return die(g, { ...opts, cause: 'quit' }); }

/** B100 beaten: bank without a Bookmark, the Binder's Quill into the vault, deep_stacks_cleared, clears + 1. */
export function clear(g, opts = {}) {
  if (!inRun(g)) return { ok: false, why: 'not_in_run' };
  const c = g.cave;
  if (!c.vault.includes(BINDER_QUILL_ID) && !c.run.blues.includes(BINDER_QUILL_ID)) c.run.blues.push(BINDER_QUILL_ID);
  const r = bank(g, { playtime: opts.playtime, free: true });
  if (!r.ok) return r;
  c.record.clears += 1;
  setFlag(g, CLEARED_FLAG);
  return { ...r, cleared: true };
}
