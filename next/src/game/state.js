// Game state (owned by the orchestrator; W2 agents extend through the documented helpers, not by reshaping).
// Pure: no DOM, no engine. `engine.game` holds the live object; save.js stores `serialize()` output.
//
//   const g = createGame('Arden');     g.flags, g.party, g.items, g.gear, g.map, g.pos, ...
//   hasFlag(g,'met_mael') setFlag(g,'met_mael') give(g,'potion',2) take(g,'potion') count(g,'potion')
//   addGear(g, itemInstance) -> id      removeGear(g, id)      findGear(g, id)
//   addMember(g,'mira')  partyMembers(g)  heal(g, {full:true})
//   serialize(g) -> plain JSON          deserialize(json) -> game (with migrations)
import { newMember, PARTY_IDS } from '../data/party.js';
import { CONSUMABLES, KEY_ITEMS } from '../data/items.js';
import { toInstance } from '../battle/loot.js';

export const SAVE_VERSION = 1;
export const START_MAP = 'hero_home';
export const START_POS = { x: 4, y: 3, dir: 'down' };   // map authors keep `marks.bedside` next to this

export function createGame(heroName = 'Hero', opts = {}) {
  const name = cleanName(heroName);
  const g = {
    v: SAVE_VERSION,
    heroName: name,
    party: [newMember('hero', { name })],       // active members, in marching order
    reserve: [],                                // members not in the active party (none in Episode 1)
    items: { potion: 2 },                       // consumables and key items: id -> qty
    gear: [],                                   // equipment instances not worn: [{uid, ...instance}]
    gearNext: 1,
    gold: 80,
    flags: {},                                  // story flags: name -> true | value
    counters: {},                               // free-form numeric counters (steps, chests opened, ...)
    opened: {},                                 // one-shot world objects: `${mapId}:${eventId}` -> true
    bestiary: {},                               // enemy id -> { seen, killed, weak:[], resist:[] } (battle result().revealed merged in)
    map: opts.map || START_MAP,
    pos: { ...START_POS, ...(opts.pos || {}) },
    lastSafe: { map: opts.map || START_MAP, pos: { ...START_POS } },   // where a lost fight returns the party
    playtime: 0,                                // seconds
    seed: (opts.seed ?? (Date.now() & 0x7fffffff)) >>> 0,
    chapter: 1,
    settingsSnapshot: null,
  };
  return g;
}

// ---- Episode 2 quick start (E2-world, EPISODE2_PLAN 5.6) ------------------------------------------
/** Episode 1 flags a save that saw the Episode 1 credits has: the main line plus the beats on the critical path. */
export const EP1_DONE_FLAGS = ['intro_done', 'met_mael', 'mira_joined', 'bram_joined', 'left_town', 'archive_entered',
  'archive_f1_done', 'echo_warden_defeated', 'lantern_get', 'archive_f2_done', 'boss_door_open', 'archivore_defeated',
  'ep1_complete', 'signs_fading', 'saw_fading_sign', 'hazel_farewell_done', 'garrick_farewell_done', 'valley_arrived',
  'saw_milestone', 'f1_arrived', 'f2_arrived', 'f3_arrived', 'found_thirteenth_bell', 'first_fight_done',
  'campfire_rested', 'archive_key_found', 'stacks_key_found', 'returned_home', 'hal_returned'];
/**
 * The party Episode 2 expects at Lv 9: the simulator's `east_road` loadout (tools/sim/loadouts.mjs; the test in
 * qa/world/ep2_plumbing.test.mjs keeps the two in step).
 */
export const EP2_START = {
  level: 9, gold: 900, map: 'hero_home', mark: 'bed',
  items: { potion: 6, hi_potion: 3, ether: 4, phoenix_feather: 1, name_fragment_1: 1, lantern_of_recall: 1 },
  members: {
    hero: { weapon: 'sword', equip: { sword: 'lanternheart', axe: 'hatchet', body: 'chain_shirt', head: 'leather_hood', boots: 'leather_boots' }, mastery: { sword: 245, axe: 70 } },
    mira: { weapon: 'staff', equip: { staff: 'crystal_rod', bow: 'short_bow', body: 'mirrorguard_mail', head: 'leather_hood', charm: 'bronze_charm' }, mastery: { staff: 160, bow: 50 } },
    bram: { weapon: 'spear', equip: { spear: 'iron_pike', axe: 'hatchet', body: 'chain_shirt', head: 'iron_helm', boots: 'leather_boots' }, mastery: { spear: 245, axe: 70 } },
  },
};

/**
 * A fresh game standing where Episode 2 begins: a Lv 9 party in the east_road loadout, every Episode 1 main flag
 * plus ep1_complete and the credits_rolled counter, the Lantern and the first name fragment, 900 gold and a stocked
 * bag, in bed at home (so `ep2_morning` runs). `pos` is the bed mark of hero_home when the caller passes it
 * (o.pos), else START_POS (hero_home keeps `bed` there). Pure.
 */
export function newGameEp2(heroName = 'Hero', o = {}) {
  const S = EP2_START;
  const g = createGame(heroName, { map: S.map, pos: o.pos, seed: o.seed });
  for (const id of ['mira', 'bram']) addMember(g, id);
  for (const m of g.party) {
    const spec = S.members[m.id];
    m.level = S.level;
    const fresh = newMember(m.id, { level: S.level, name: m.name });
    m.exp = fresh.exp;
    if (spec) { m.weapon = spec.weapon; m.equip = { ...m.equip, ...spec.equip }; m.mastery = { ...m.mastery, ...spec.mastery }; }
    m.hp = fresh.hp; m.mp = fresh.mp;
    const s = memberMax(m);
    m.hp = s.hp; m.mp = s.mp; m.fury = 0;
  }
  g.items = {};
  for (const [id, q] of Object.entries(S.items)) give(g, id, q);
  g.gold = S.gold;
  for (const f of EP1_DONE_FLAGS) g.flags[f] = true;
  g.counters.credits_rolled = 1;
  g.chapter = 2;
  g.lastSafe = { map: g.map, pos: { ...g.pos } };
  return g;
}

export function cleanName(s) {
  const t = String(s || '').replace(/[^A-Za-z0-9 '\-]/g, '').trim().slice(0, 8);
  return t || 'Hero';
}

// ---- flags -------------------------------------------------------------------------------------
export function hasFlag(g, flag) { return !!g.flags[flag]; }
export function setFlag(g, flag, value = true) { if (value === false) delete g.flags[flag]; else g.flags[flag] = value; return value; }
export function flagValue(g, flag) { return g.flags[flag]; }

// ---- consumables and key items -----------------------------------------------------------------
export function isKeyItem(id) { return !!KEY_ITEMS[id]; }
export function isConsumable(id) { return !!CONSUMABLES[id]; }
export function count(g, id) { return g.items[id] || 0; }
export function give(g, id, qty = 1) {
  if (isKeyItem(id) && !KEY_ITEMS[id].counted) { g.items[id] = 1; return 1; }
  g.items[id] = Math.min(99, (g.items[id] || 0) + qty);
  return g.items[id];
}
export function take(g, id, qty = 1) {
  const have = g.items[id] || 0;
  if (have < qty) return false;
  if (have === qty) delete g.items[id]; else g.items[id] = have - qty;
  return true;
}

// ---- equipment instances (Diablo-style items with affixes) -------------------------------------
export function addGear(g, itemOrBaseId) {
  const inst = toInstance(itemOrBaseId);
  if (!inst) return null;
  const copy = { ...inst, uid: g.gearNext++ };
  g.gear.push(copy);
  return copy.uid;
}
export function findGear(g, uid) { return g.gear.find((it) => it.uid === uid) || null; }
export function removeGear(g, uid) {
  const i = g.gear.findIndex((it) => it.uid === uid);
  if (i < 0) return null;
  return g.gear.splice(i, 1)[0];
}

// ---- party ---------------------------------------------------------------------------------------
export function partyMembers(g) { return g.party; }
export function member(g, id) { return g.party.find((m) => m.id === id) || g.reserve.find((m) => m.id === id) || null; }
export function addMember(g, id, opts = {}) {
  if (member(g, id)) return member(g, id);
  if (!PARTY_IDS.includes(id)) throw new Error('unknown member ' + id);
  const lead = g.party[0];
  const m = newMember(id, { level: opts.level || (lead ? lead.level : 1) });
  g.party.push(m);
  return m;
}
export function heal(g, { full = true, hp = 0, mp = 0, revive = true } = {}) {
  for (const m of g.party) {
    const s = memberMax(m);
    if (full) { m.hp = s.hp; m.mp = s.mp; }
    else { if (m.hp > 0 || revive) m.hp = Math.min(s.hp, Math.max(m.hp, 0) + hp); m.mp = Math.min(s.mp, m.mp + mp); }
    m.fury = 0;
  }
}
// Lazy import to keep state.js free of a hard dependency on rules.js for tests.
let _memberStats = null;
export function memberMax(m) {
  if (!_memberStats) {
    try { _memberStats = (globalThis.__LQ_memberStats || null); } catch (e) { _memberStats = null; }
  }
  if (_memberStats) { const s = _memberStats(m); return { hp: s.hp ?? s.maxHp, mp: s.mp ?? s.maxMp }; }
  return { hp: m.maxHp ?? m.hp, mp: m.maxMp ?? m.mp };
}
export function setStatsProvider(fn) { _memberStats = fn; }

// ---- world ----------------------------------------------------------------------------------------
export function markOpened(g, mapId, eventId) { g.opened[`${mapId}:${eventId}`] = true; }
export function isOpened(g, mapId, eventId) { return !!g.opened[`${mapId}:${eventId}`]; }
export function setPosition(g, map, x, y, dir) { g.map = map; g.pos = { x, y, dir: dir || g.pos.dir || 'down' }; }
export function setSafePoint(g) { g.lastSafe = { map: g.map, pos: { ...g.pos } }; }
export function bump(g, key, n = 1) { g.counters[key] = (g.counters[key] || 0) + n; return g.counters[key]; }

// ---- save / load ------------------------------------------------------------------------------------
export function serialize(g) { return JSON.parse(JSON.stringify(g)); }
export function deserialize(data) {
  if (!data || typeof data !== 'object') return null;
  const g = JSON.parse(JSON.stringify(data));
  // migrations by version
  if (!g.v || g.v < 1) g.v = 1;
  const base = createGame(g.heroName || 'Hero');
  for (const k of Object.keys(base)) if (g[k] === undefined) g[k] = base[k];
  return g;
}
export function saveMeta(g) {
  return { name: g.heroName, level: g.party[0]?.level || 1, map: g.map, playtime: g.playtime, chapter: g.chapter,
    gold: g.gold, party: g.party.map((m) => m.id) };
}
