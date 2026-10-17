// Party members: base stats, level growth, EXP curve, weapon mastery. Pure data + pure helpers.
//
// A party member record (what saves store and what createBattle() takes) looks like:
//   { id: 'hero', name: 'Rowan', level: 1, exp: 0, hp: 48, mp: 12, fury: 0, weapon: 'sword',
//     equip: { sword: 'short_sword', axe: null, body: 'cloth_tunic', head: null,
//              charm: null, boots: null, mantle: null },
//     mastery: { sword: 0, axe: 0 } }
// Equip entries are either a base item id string (a plain common item) or an item instance from
// battle/loot.js ({ base, rarity, affixes, ... }). hp/mp may be omitted (= full).

import { SKILLS } from './skills.js';

export const STAT_KEYS = ['hp', 'mp', 'atk', 'def', 'mag', 'spr', 'spd', 'luk'];
export const MAX_LEVEL = 99;
export const PARTY_IDS = ['hero', 'mira', 'bram'];

export const PARTY = {
  hero: {
    id: 'hero', name: 'Hero', role: 'Striker',
    weapons: ['sword', 'axe'],
    blurb: 'Balanced fighter. Sword for speed, axe for raw power.',
    start: { weapon: 'sword', equip: { sword: 'short_sword', axe: null, body: 'cloth_tunic', head: null,
      charm: null, boots: null, mantle: null } },
  },
  mira: {
    id: 'mira', name: 'Mira', role: 'Archivist',
    weapons: ['staff', 'bow'],
    blurb: 'Magic, healing and Appraise. Bow for flying foes.',
    start: { weapon: 'staff', equip: { staff: 'oak_staff', bow: 'short_bow', body: 'cloth_tunic', head: null,
      charm: null, boots: null, mantle: null } },
  },
  bram: {
    id: 'bram', name: 'Bram', role: 'Guardian',
    weapons: ['spear', 'axe'],
    blurb: 'Takes hits for others. Spear pierces, axe breaks.',
    start: { weapon: 'spear', equip: { spear: 'ash_spear', axe: 'hatchet', body: 'leather_vest', head: 'cloth_cap',
      charm: null, boots: null, mantle: null } },
  },
};

// Hand-tuned stat table for levels 1..15 (index = level - 1). Columns follow STAT_KEYS:
//            hp   mp  atk def mag spr spd luk
export const LEVEL_TABLE = {
  hero: [
    [48, 12, 12, 8, 6, 7, 12, 8], // 1
    [58, 14, 14, 9, 7, 8, 13, 9], // 2
    [69, 15, 16, 11, 8, 9, 13, 9], // 3
    [80, 17, 18, 12, 9, 11, 14, 10], // 4
    [92, 19, 20, 14, 10, 12, 14, 10], // 5
    [104, 21, 23, 15, 11, 14, 15, 11], // 6
    [117, 23, 25, 17, 12, 15, 15, 12], // 7
    [130, 25, 27, 18, 13, 16, 16, 12], // 8
    [144, 27, 30, 20, 15, 18, 16, 13], // 9
    [158, 29, 32, 21, 16, 19, 17, 13], // 10
    [173, 31, 35, 23, 17, 21, 18, 14], // 11
    [188, 33, 38, 25, 18, 23, 18, 15], // 12
    [204, 36, 40, 26, 19, 24, 19, 15], // 13
    [220, 38, 43, 28, 21, 26, 19, 16], // 14
    [237, 40, 46, 30, 22, 28, 20, 16], // 15
  ],
  mira: [
    [36, 22, 7, 6, 14, 12, 11, 10], // 1
    [44, 25, 8, 7, 16, 14, 12, 11], // 2
    [52, 29, 9, 8, 19, 16, 12, 11], // 3
    [60, 32, 10, 9, 21, 18, 13, 12], // 4
    [69, 36, 12, 10, 24, 20, 13, 13], // 5
    [79, 39, 13, 11, 27, 22, 14, 14], // 6
    [88, 43, 14, 12, 29, 24, 14, 14], // 7
    [98, 47, 15, 13, 32, 27, 15, 15], // 8
    [109, 51, 16, 15, 35, 29, 16, 16], // 9
    [120, 55, 18, 16, 38, 32, 16, 16], // 10
    [131, 59, 19, 17, 41, 34, 17, 17], // 11
    [143, 63, 20, 18, 44, 37, 18, 18], // 12
    [155, 68, 22, 19, 47, 39, 18, 18], // 13
    [167, 72, 23, 21, 51, 42, 19, 19], // 14
    [180, 77, 24, 22, 54, 44, 20, 20], // 15
  ],
  bram: [
    [60, 10, 11, 12, 4, 8, 9, 6], // 1
    [73, 11, 13, 14, 5, 9, 9, 7], // 2
    [86, 13, 15, 16, 5, 10, 10, 7], // 3
    [100, 14, 17, 18, 6, 12, 10, 8], // 4
    [115, 16, 19, 20, 6, 13, 11, 8], // 5
    [130, 17, 21, 22, 7, 15, 11, 9], // 6
    [146, 19, 23, 24, 7, 16, 12, 9], // 7
    [162, 20, 26, 27, 8, 17, 12, 10], // 8
    [179, 22, 28, 29, 8, 19, 12, 10], // 9
    [197, 23, 31, 32, 9, 20, 13, 11], // 10
    [215, 25, 33, 34, 9, 22, 13, 11], // 11
    [234, 27, 36, 37, 10, 24, 14, 12], // 12
    [253, 28, 38, 39, 10, 25, 14, 12], // 13
    [273, 30, 41, 42, 11, 27, 15, 13], // 14
    [294, 32, 43, 44, 11, 29, 15, 13], // 15
  ],
};

// Growth formula used past level 15: f(L) = g * (L - 1) + q * (L - 1)^2, anchored on the table's
// level-15 row so the curve continues smoothly to 99. [g, q] per stat, same order as STAT_KEYS.
export const GROWTH = {
  hero: [[10, 0.25], [1.6, 0.03], [2.0, 0.03], [1.3, 0.02], [1.0, 0.01], [1.2, 0.02], [0.5, 0.005], [0.6, 0]],
  mira: [[7.5, 0.2], [3.2, 0.05], [1.1, 0.01], [1.0, 0.01], [2.3, 0.04], [1.9, 0.03], [0.55, 0.005], [0.7, 0]],
  bram: [[12.5, 0.3], [1.3, 0.02], [1.9, 0.03], [1.9, 0.03], [0.5, 0], [1.2, 0.02], [0.4, 0.004], [0.5, 0]],
};
const STAT_CAP = { hp: 9999, mp: 999, atk: 255, def: 255, mag: 255, spr: 255, spd: 99, luk: 99 };

/** Base stats (no equipment) for a party member at a level. */
export function statsAt(id, level) {
  const table = LEVEL_TABLE[id];
  if (!table) throw new Error(`unknown party member ${id}`);
  const L = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  const out = {};
  if (L <= table.length) {
    STAT_KEYS.forEach((k, i) => { out[k] = table[L - 1][i]; });
    return out;
  }
  const top = table.length;
  STAT_KEYS.forEach((k, i) => {
    const [g, q] = GROWTH[id][i];
    const f = (n) => g * (n - 1) + q * (n - 1) ** 2;
    out[k] = Math.min(STAT_CAP[k], Math.round(table[top - 1][i] + f(L) - f(top)));
  });
  return out;
}

// --- Experience -------------------------------------------------------------------------------
// Total EXP needed to reach each level (index = level - 1). Every living member receives the full
// EXP of a victory. Tuned with tools/sim so that fighting most visible enemies once lands:
// valley Lv 2-3, Archive F1 Lv 4, F2 Lv 5-6, F3 Lv 7, the Archivore at Lv 8 (see docs/BATTLE.md).
export const EXP_TABLE = [0, 20, 68, 148, 266, 424, 623, 867, 1156, 1493, 1878, 2314, 2800, 3339, 3931];

/** Total EXP required to reach `level`. Continues the table with 10(L-1)^2.25 + 10(L-1). */
export function expForLevel(level) {
  const L = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  if (L <= EXP_TABLE.length) return EXP_TABLE[L - 1];
  const f = (n) => 10 * (n - 1) ** 2.25 + 10 * (n - 1);
  return Math.round(EXP_TABLE[EXP_TABLE.length - 1] + f(L) - f(EXP_TABLE.length));
}

export function levelForExp(exp) {
  let L = 1;
  while (L < MAX_LEVEL && exp >= expForLevel(L + 1)) L++;
  return L;
}

/** EXP still needed for the next level (0 at max level). */
export function expToNext(member) {
  if (member.level >= MAX_LEVEL) return 0;
  return Math.max(0, expForLevel(member.level + 1) - (member.exp || 0));
}

// --- Weapon mastery (Secret of Mana) ------------------------------------------------------------
// Mastery levels 1..8 per weapon type. Points come from using the weapon in battle (1 per use) and
// from each victory (the enemies' masteryPts, split between the weapon types used in that fight).
export const MASTERY_XP = [0, 25, 70, 140, 240, 380, 560, 800];
export const MAX_MASTERY = 8;
// Passive bonus per mastery level above 1 with that weapon type.
export const MASTERY_DAMAGE_PER_LEVEL = 0.03;
// Extra crit chance at mastery 4+, and at mastery 7+.
export const MASTERY_PASSIVES = [
  { level: 4, crit: 0.03, text: '+3% critical rate' },
  { level: 6, furyGain: 0.15, text: '+15% Fury gain' },
  { level: 7, crit: 0.03, text: '+3% critical rate' },
  { level: 8, power: 0.05, text: '+5% damage' },
];

export function masteryLevel(points) {
  let L = 1;
  for (let i = 1; i < MASTERY_XP.length; i++) if ((points || 0) >= MASTERY_XP[i]) L = i + 1;
  return L;
}

/** Unlocks (skill ids) for a weapon type at exactly mastery level `lv`. */
export function masteryUnlocks(type, lv) {
  return Object.values(SKILLS).filter((s) => s.weapon === type && s.learn && s.learn.mastery === lv
    && (s.kind === 'tech' || s.kind === 'fury')).map((s) => s.id);
}

// --- Members ----------------------------------------------------------------------------------

/** A fresh member record at a level (full HP/MP, starting equipment). */
export function newMember(id, opts = {}) {
  const def = PARTY[id];
  if (!def) throw new Error(`unknown party member ${id}`);
  const level = opts.level || 1;
  const m = {
    id, name: opts.name || def.name, level, exp: expForLevel(level), fury: 0,
    weapon: def.start.weapon,
    equip: { ...def.start.equip },
    mastery: Object.fromEntries(def.weapons.map((w) => [w, 0])),
  };
  const s = statsAt(id, level);
  m.hp = s.hp; m.mp = s.mp;
  return m;
}

/** Skills a member knows now: character skills by level, weapon techs and Fury arts by mastery. */
export function knownSkills(member) {
  const def = PARTY[member.id];
  const out = [];
  for (const s of Object.values(SKILLS)) {
    if (!s.learn) continue;
    if (s.user === member.id && s.learn.level && member.level >= s.learn.level) out.push(s.id);
    else if (s.weapon && def.weapons.includes(s.weapon) && s.learn.mastery
      && masteryLevel((member.mastery || {})[s.weapon]) >= s.learn.mastery) out.push(s.id);
  }
  return out;
}

/**
 * Add EXP. Mutates and returns { member, levelUps: [{ level, gains: {hp,...}, learned: [skillIds] }] }.
 * HP/MP rise by the gained max so a level-up mid-dungeon feels good (FF style).
 */
export function grantExp(member, amount) {
  const levelUps = [];
  member.exp = (member.exp || 0) + Math.max(0, Math.floor(amount));
  while (member.level < MAX_LEVEL && member.exp >= expForLevel(member.level + 1)) {
    const before = statsAt(member.id, member.level);
    const beforeSkills = new Set(knownSkills(member));
    member.level++;
    const after = statsAt(member.id, member.level);
    const gains = {};
    for (const k of STAT_KEYS) gains[k] = after[k] - before[k];
    if (member.hp > 0) member.hp = (member.hp ?? before.hp) + gains.hp;
    member.mp = (member.mp ?? before.mp) + gains.mp;
    const learned = knownSkills(member).filter((s) => !beforeSkills.has(s));
    levelUps.push({ level: member.level, gains, learned });
  }
  return { member, levelUps };
}

/** Add mastery points to one weapon type. Returns { type, from, to, unlocked: [skillIds] }. */
export function grantMastery(member, type, points) {
  member.mastery = member.mastery || {};
  const from = masteryLevel(member.mastery[type]);
  member.mastery[type] = Math.min(MASTERY_XP[MASTERY_XP.length - 1], (member.mastery[type] || 0) + Math.max(0, Math.floor(points)));
  const to = masteryLevel(member.mastery[type]);
  const unlocked = [];
  for (let lv = from + 1; lv <= to; lv++) unlocked.push(...masteryUnlocks(type, lv));
  return { type, from, to, unlocked };
}
