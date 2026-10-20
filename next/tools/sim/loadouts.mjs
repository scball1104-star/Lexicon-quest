// Expected party per zone (gear, mastery, consumables) and the bestiary the player has by then. Shared by
// simulate.mjs (one fresh fight at a time) and route.mjs (the whole route with HP and MP carried); split out in W10
// so the two can import each other's results without a module cycle.
import { ENEMIES } from '../../src/data/enemies.js';

// ------------------------------------------------------------------ expected party per zone
// Gear the player can reasonably own on arrival (start kit, valley chest hatchet, a couple of smithy
// buys, the Echo Warden's Mirrorguard Mail). Plain bases only so results do not hinge on lucky rolls.
// mastery: points in each weapon type (25 = M2, 70 = M3, 140 = M4, 240 = M5).
export const LOADOUTS = {
  valley: {
    hero: { weapon: 'sword', equip: { sword: 'short_sword', body: 'cloth_tunic' }, mastery: { sword: 12 } },
    mira: { weapon: 'staff', equip: { staff: 'oak_staff', bow: 'short_bow', body: 'cloth_tunic' }, mastery: { staff: 8, bow: 2 } },
    bram: { weapon: 'spear', equip: { spear: 'ash_spear', axe: 'hatchet', body: 'leather_vest', head: 'cloth_cap' }, mastery: { spear: 12, axe: 2 } },
    inventory: { potion: 4, antidote: 1, eye_drops: 1 },
  },
  archive_f1: {
    hero: { weapon: 'sword', equip: { sword: 'short_sword', axe: 'hatchet', body: 'leather_vest', head: 'cloth_cap' }, mastery: { sword: 45, axe: 6 } },
    mira: { weapon: 'staff', equip: { staff: 'oak_staff', bow: 'short_bow', body: 'cloth_tunic', head: 'leather_hood', charm: 'bronze_charm' }, mastery: { staff: 25, bow: 10 } },
    bram: { weapon: 'spear', equip: { spear: 'ash_spear', axe: 'hatchet', body: 'leather_vest', head: 'cloth_cap' }, mastery: { spear: 45, axe: 10 } },
    inventory: { potion: 5, ether: 1, antidote: 1, eye_drops: 1, echo_herb: 1 },
  },
  archive_f2: {
    hero: { weapon: 'sword', equip: { sword: 'longsword', axe: 'hatchet', body: 'leather_vest', head: 'leather_hood' }, mastery: { sword: 100, axe: 25 } },
    mira: { weapon: 'staff', equip: { staff: 'oak_staff', bow: 'short_bow', body: 'leather_vest', head: 'leather_hood', charm: 'bronze_charm' }, mastery: { staff: 60, bow: 25 } },
    bram: { weapon: 'spear', equip: { spear: 'ash_spear', axe: 'hatchet', body: 'leather_vest', head: 'leather_hood', boots: 'leather_boots' }, mastery: { spear: 100, axe: 25 } },
    inventory: { potion: 5, hi_potion: 1, ether: 2, antidote: 1, eye_drops: 1, echo_herb: 2, phoenix_feather: 1 },
  },
  archive_f3: {
    hero: { weapon: 'sword', equip: { sword: 'longsword', axe: 'hatchet', body: 'chain_shirt', head: 'leather_hood', boots: 'leather_boots' }, mastery: { sword: 170, axe: 50 } },
    mira: { weapon: 'staff', equip: { staff: 'crystal_rod', bow: 'short_bow', body: 'mirrorguard_mail', head: 'leather_hood', charm: 'bronze_charm' }, mastery: { staff: 110, bow: 40 } },
    bram: { weapon: 'spear', equip: { spear: 'iron_pike', axe: 'hatchet', body: 'chain_shirt', head: 'iron_helm', boots: 'leather_boots' }, mastery: { spear: 170, axe: 50 } },
    inventory: { potion: 5, hi_potion: 2, ether: 2, antidote: 1, eye_drops: 2, echo_herb: 2, phoenix_feather: 1 },
  },
};
LOADOUTS.archive_boss = {
  ...LOADOUTS.archive_f3,
  hero: { ...LOADOUTS.archive_f3.hero, mastery: { sword: 210, axe: 60 } },
  mira: { ...LOADOUTS.archive_f3.mira, mastery: { staff: 140, bow: 45 } },
  bram: { ...LOADOUTS.archive_f3.bram, mastery: { spear: 210, axe: 60 } },
  inventory: { potion: 6, hi_potion: 3, ether: 3, antidote: 1, eye_drops: 2, echo_herb: 3, phoenix_feather: 2 },
};
// Whisperwood Hollow (optional, after the Lantern): F2 cleared, the F3 shop gear bought on the way back out,
// mastery between the F2 and F3 rows. Plain bases (the Pilgrim's Reach at the hollow mouth is not counted).
LOADOUTS.whisperwood_hollow = {
  ...LOADOUTS.archive_f3,
  hero: { ...LOADOUTS.archive_f3.hero, mastery: { sword: 140, axe: 40 } },
  mira: { ...LOADOUTS.archive_f3.mira, mastery: { staff: 90, bow: 35 } },
  bram: { ...LOADOUTS.archive_f3.bram, mastery: { spear: 140, axe: 40 } },
  inventory: { potion: 5, hi_potion: 2, ether: 2, antidote: 2, eye_drops: 1, echo_herb: 2, phoenix_feather: 1 },
};

// W10: a party that reaches the Briar Alpha late (after F3, after the Archivore) meets the Elder tiers
// (encounters.js ALPHA_TIERS). Boss-floor gear; the post-Archivore row adds the mastery of the boss and the way home.
LOADOUTS.hollow_late = {
  ...LOADOUTS.archive_boss,
  hero: { ...LOADOUTS.archive_boss.hero, mastery: { sword: 260, axe: 80 } },
  mira: { ...LOADOUTS.archive_boss.mira, mastery: { staff: 180, bow: 50 } },
  bram: { ...LOADOUTS.archive_boss.bram, mastery: { spear: 260, axe: 80 } },
};
export const ALPHA_TIER_RUNS = [
  { encounter: 'whisperwood_alpha_t1', loadout: 'archive_boss', levels: [8] },
  { encounter: 'whisperwood_alpha_t2', loadout: 'hollow_late', levels: [9, 10] },
];


/**
 * Bestiary the player has by the time they fight in a zone: every ordinary enemy's weaknesses are
 * known (they meet each type several times and the battle UI remembers hits). Bosses start unknown.
 */
export function knownBestiary() {
  const out = {};
  for (const e of Object.values(ENEMIES)) if (!e.boss && e.id !== 'lost_page') out[e.id] = [...e.weak, ...e.resist, ...e.immune, ...e.absorb];
  return out;
}
