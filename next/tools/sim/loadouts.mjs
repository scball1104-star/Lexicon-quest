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
  // boss adds are met first inside their boss fight (the Archivore's pages, the Nameless King's Sorrow and Pride)
  const adds = ['lost_page', 'false_sorrow', 'false_pride', 'bellows_coil', 'smelter_coil'];
  for (const e of Object.values(ENEMIES)) if (!e.boss && !adds.includes(e.id)) out[e.id] = [...e.weak, ...e.resist, ...e.immune, ...e.absorb];
  return out;
}

// ------------------------------------------------------------------ Episode 2 (EPISODE2_PLAN.md 6.8)
// east_road: the Archivore's loadout with Lanternheart on the hero, mastery about 10% up, one Hi-Ether more.
// court_f1: + Bearded Axe (hero), Archivist's Staff and Hunter's Bow (Mira), Winged Lance and Bronze Plate (Bram), an Iron
// Helm and Traveler's Boots (hero), Silver Circlet and Owl Charm (Mira) (the plan's calibration stats need the helm).
// court_f2: + a tier 3 helm and body (Steel Helm, Steel Cuirass on the hero; Moon Circlet on Mira). court_f3: + Mere Pike
// (Bram), Mirror Rod (Mira), Silver Mail (hero). court_throne: + the Twinfold Charm (hero), mastery up a step.
// Mastery climbs from M5 (240) to about M6 (380) across the episode.
const AB = LOADOUTS.archive_boss;
LOADOUTS.east_road = {
  hero: { weapon: 'sword', equip: { ...AB.hero.equip, sword: 'lanternheart' }, mastery: { sword: 245, axe: 70 } },
  mira: { weapon: 'staff', equip: { ...AB.mira.equip }, mastery: { staff: 160, bow: 50 } },
  bram: { weapon: 'spear', equip: { ...AB.bram.equip }, mastery: { spear: 245, axe: 70 } },
  inventory: { potion: 6, hi_potion: 3, ether: 3, hi_ether: 1, antidote: 1, eye_drops: 2, echo_herb: 3, phoenix_feather: 2 },
};
const ER = LOADOUTS.east_road;
LOADOUTS.court_f1 = {
  hero: { weapon: 'sword', equip: { ...ER.hero.equip, axe: 'bearded_axe', head: 'iron_helm', boots: 'traveler_boots' }, mastery: { sword: 290, axe: 90 } },
  mira: { weapon: 'staff', equip: { ...ER.mira.equip, staff: 'archivist_staff', bow: 'hunters_bow', head: 'silver_circlet', charm: 'owl_charm' },
    mastery: { staff: 200, bow: 70 } },
  bram: { weapon: 'spear', equip: { ...ER.bram.equip, spear: 'winged_lance', body: 'bronze_plate' }, mastery: { spear: 290, axe: 90 } },
  inventory: { potion: 6, hi_potion: 4, ether: 3, hi_ether: 1, antidote: 1, eye_drops: 2, echo_herb: 3, phoenix_feather: 2, silver_salve: 1 },
};
const C1 = LOADOUTS.court_f1;
LOADOUTS.court_f2 = {
  hero: { weapon: 'sword', equip: { ...C1.hero.equip, head: 'steel_helm', body: 'steel_cuirass' }, mastery: { sword: 330, axe: 110 } },
  mira: { weapon: 'staff', equip: { ...C1.mira.equip, head: 'moon_circlet' }, mastery: { staff: 240, bow: 90 } },
  bram: { weapon: 'spear', equip: { ...C1.bram.equip }, mastery: { spear: 330, axe: 110 } },
  inventory: { potion: 6, hi_potion: 4, ether: 3, hi_ether: 2, antidote: 1, eye_drops: 2, echo_herb: 3, phoenix_feather: 2, silver_salve: 1 },
};
const C2 = LOADOUTS.court_f2;
LOADOUTS.court_f3 = {
  hero: { weapon: 'sword', equip: { ...C2.hero.equip, body: 'silver_mail' }, mastery: { sword: 380, axe: 130 } },
  mira: { weapon: 'staff', equip: { ...C2.mira.equip, staff: 'mirror_rod' }, mastery: { staff: 280, bow: 110 } },
  bram: { weapon: 'spear', equip: { ...C2.bram.equip, spear: 'mere_pike' }, mastery: { spear: 380, axe: 130 } },
  inventory: { potion: 6, hi_potion: 5, ether: 3, hi_ether: 2, antidote: 1, eye_drops: 3, echo_herb: 3, phoenix_feather: 2, silver_salve: 2 },
};
const C3 = LOADOUTS.court_f3;
LOADOUTS.court_throne = {
  hero: { weapon: 'sword', equip: { ...C3.hero.equip, charm: 'twinfold_charm' }, mastery: { sword: 420, axe: 150 } },
  mira: { weapon: 'staff', equip: { ...C3.mira.equip }, mastery: { staff: 320, bow: 130 } },
  bram: { weapon: 'spear', equip: { ...C3.bram.equip }, mastery: { spear: 420, axe: 150 } },
  inventory: { potion: 5, hi_potion: 5, ether: 3, hi_ether: 3, antidote: 1, eye_drops: 2, echo_herb: 3, phoenix_feather: 3, silver_salve: 2 },
};

// ------------------------------------------------------------------ Episode 3 (EPISODE3_PLAN.md 6.6)
// sand_road: the court_throne row plus the Kept Promise (Mira's bow) and tier 4 gear (Moonsteel Axe, Glass Helm and Mere Boots
// on the hero; Silver Mail, Glass Helm and Mere Boots on Bram; Mirror Circlet on Mira), mastery up a step, three Quench Flasks
// (Vessa's gift at the sand gate). This is also the Episode 3 quick start's party (src/game/state.js EP3_START mirrors it).
// foundry_f1: + two tier 5 pieces (Ashsteel Helm, Cinder Boots on the hero). foundry_f2: + Ashwalker Boots (Bram), Soot Hood
// (Mira). foundry_f3: + two tier 6 pieces (Heartforge Pike, Founder's Rod). foundry_heart: + the Updraft Charm (Mira) and
// mastery up one step; `flags` carries bram_memory_3, so Bram knows Tempered Oath (rules.js reads `options.flags`).
const CT = LOADOUTS.court_throne;
LOADOUTS.sand_road = {
  hero: { weapon: 'sword', equip: { ...CT.hero.equip, axe: 'moonsteel_axe', head: 'glass_helm', boots: 'mere_boots' }, mastery: { sword: 460, axe: 170 } },
  mira: { weapon: 'staff', equip: { ...CT.mira.equip, bow: 'kept_promise', head: 'mirror_circlet' }, mastery: { staff: 350, bow: 150 } },
  bram: { weapon: 'spear', equip: { ...CT.bram.equip, body: 'silver_mail', head: 'glass_helm', boots: 'mere_boots' }, mastery: { spear: 460, axe: 170 } },
  inventory: { potion: 6, hi_potion: 5, ether: 3, hi_ether: 3, antidote: 1, eye_drops: 2, echo_herb: 3, phoenix_feather: 3, silver_salve: 2, quench_flask: 3 },
};
const SR = LOADOUTS.sand_road;
LOADOUTS.foundry_f1 = {
  hero: { weapon: 'sword', equip: { ...SR.hero.equip, head: 'ashsteel_helm', boots: 'cinder_boots' }, mastery: { sword: 500, axe: 190 } },
  mira: { weapon: 'staff', equip: { ...SR.mira.equip }, mastery: { staff: 380, bow: 170 } },
  bram: { weapon: 'spear', equip: { ...SR.bram.equip }, mastery: { spear: 500, axe: 190 } },
  inventory: { ...SR.inventory, quench_flask: 4 },
};
const F1 = LOADOUTS.foundry_f1;
LOADOUTS.foundry_f2 = {
  hero: { weapon: 'sword', equip: { ...F1.hero.equip }, mastery: { sword: 540, axe: 210 } },
  mira: { weapon: 'staff', equip: { ...F1.mira.equip, head: 'soot_hood' }, mastery: { staff: 410, bow: 190 } },
  bram: { weapon: 'spear', equip: { ...F1.bram.equip, boots: 'ashwalker_boots' }, mastery: { spear: 540, axe: 210 } },
  inventory: { ...F1.inventory, quench_flask: 5 },
};
const F2 = LOADOUTS.foundry_f2;
LOADOUTS.foundry_f3 = {
  hero: { weapon: 'sword', equip: { ...F2.hero.equip }, mastery: { sword: 580, axe: 230 } },
  mira: { weapon: 'staff', equip: { ...F2.mira.equip, staff: 'founders_rod' }, mastery: { staff: 440, bow: 210 } },
  bram: { weapon: 'spear', equip: { ...F2.bram.equip, spear: 'heartforge_pike' }, mastery: { spear: 580, axe: 230 } },
  inventory: { ...F2.inventory, quench_flask: 5 },
};
const F3 = LOADOUTS.foundry_f3;
LOADOUTS.foundry_heart = {
  hero: { weapon: 'sword', equip: { ...F3.hero.equip }, mastery: { sword: 620, axe: 250 } },
  mira: { weapon: 'staff', equip: { ...F3.mira.equip, charm: 'updraft_charm' }, mastery: { staff: 480, bow: 230 } },
  bram: { weapon: 'spear', equip: { ...F3.bram.equip }, mastery: { spear: 620, axe: 250 } },
  inventory: { ...F3.inventory, quench_flask: 4, hi_potion: 6 },
  flags: ['bram_memory_3'],
};
