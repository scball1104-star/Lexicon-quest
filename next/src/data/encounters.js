// Encounter groups per zone, which visible field enemy maps to which group, boss encounters.
// Pure data + a pure roller (takes an injected rng).
//
// Map authors: a visible enemy event is { type: 'enemy', sprite: <leader enemy id>, encounter: <id> }.
// The field sprite comes from enemies_field (frame id = the leader's enemy id). ZONES[z].plan lists
// how many of each group the zone should hold: the EXP curve in party.js assumes the player fights
// roughly that many (most visible enemies once). Keep the counts if you move enemies around.

import { ENEMIES, ELITE_RATE, RANDOM_ELITE_MODS } from './enemies.js';
import { scaleForEpisode, scaleExp, OPTIONAL_FOE_EXP_MUL } from './expcurve.js';

export const ENCOUNTERS = {};
// `export` is the registry seam: an expansion pack's register() adds its groups through enc() (src/data/x1/encounters.js).
// Options beyond enemies/zone/leader: boss, noFlee, music, noElite, elite, flag, power, speed, startFury, bossLoot, backdrop and
// `expMul` (the group pays that multiple of its foes' EXP; default 1; see expcurve.js).
export function enc(id, o) { ENCOUNTERS[id] = { id, boss: false, noFlee: false, music: 'battle', ...o }; }

// ---------------------------------------------------------------- Willowmere Valley
enc('valley_wolves', { zone: 'valley', leader: 'briar_wolf', enemies: ['briar_wolf', 'briar_wolf'] });
enc('valley_slimes', { zone: 'valley', leader: 'ink_slime', enemies: ['ink_slime', 'ink_slime', 'ink_slime'] });
enc('valley_scarab', { zone: 'valley', leader: 'moss_scarab', enemies: ['moss_scarab', 'ink_slime'] });
enc('valley_mixed', { zone: 'valley', leader: 'briar_wolf', enemies: ['briar_wolf', 'moss_scarab'] });
enc('valley_pack', { zone: 'valley', leader: 'briar_wolf', enemies: ['briar_wolf', 'briar_wolf', 'ink_slime'] });
enc('yard_slime', { zone: 'valley', leader: 'ink_slime', enemies: ['ink_slime'], noFlee: true, noElite: true, power: 0.5, speed: 0.7, hp: 0.55 });   // H1: the Lv 1 hero alone (ep1.js yard_slime); not in a plan, proved by qa/content/h1_opening.test.mjs

// ---------------------------------------------------------------- Archive F1: The Catalog Halls
enc('f1_slimes', { zone: 'archive_f1', leader: 'ink_slime', enemies: ['ink_slime', 'ink_slime', 'bookmite'] });
enc('f1_mites', { zone: 'archive_f1', leader: 'bookmite', enemies: ['bookmite', 'bookmite', 'bookmite'] });
enc('f1_wraith', { zone: 'archive_f1', leader: 'page_wraith', enemies: ['page_wraith', 'bookmite', 'bookmite'] });
enc('f1_mixed', { zone: 'archive_f1', leader: 'page_wraith', enemies: ['page_wraith', 'ink_slime'] });

// ---------------------------------------------------------------- Archive F2: The Reading Galleries
enc('f2_golem', { zone: 'archive_f2', leader: 'tome_golem', enemies: ['tome_golem', 'bookmite'] });
enc('f2_wraiths', { zone: 'archive_f2', leader: 'page_wraith', enemies: ['page_wraith', 'page_wraith', 'bookmite'] });
enc('f2_mites', { zone: 'archive_f2', leader: 'bookmite', enemies: ['bookmite', 'bookmite', 'bookmite', 'page_wraith'] });
enc('f2_mixed', { zone: 'archive_f2', leader: 'tome_golem', enemies: ['tome_golem', 'page_wraith'] });
enc('echo_warden', { zone: 'archive_f2', leader: 'echo_warden', enemies: ['echo_warden'], boss: true, noFlee: true,
  music: 'battle', noElite: true, flag: 'echo_warden_defeated' });

// ---------------------------------------------------------------- Archive F3: The Rootbound Stacks
enc('f3_ink', { zone: 'archive_f3', leader: 'ink_wraith', enemies: ['ink_wraith', 'page_wraith'] });
enc('f3_golem', { zone: 'archive_f3', leader: 'tome_golem', enemies: ['tome_golem', 'ink_wraith'] });
enc('f3_wraiths', { zone: 'archive_f3', leader: 'ink_wraith', enemies: ['ink_wraith', 'ink_wraith'] });
enc('f3_mixed', { zone: 'archive_f3', leader: 'tome_golem', enemies: ['tome_golem', 'page_wraith', 'page_wraith'] });
enc('archivore', { zone: 'archive_boss', leader: 'archivore', enemies: ['archivore'], boss: true, noFlee: true,
  music: 'boss_archivore', noElite: true, flag: 'archivore_defeated' });

// ---------------------------------------------------------------- Whisperwood Hollow (optional, Lv 6-7)
// A named elite leads the blot group: `elite` on an encounter fixes its modifiers (and which enemy carries
// them), so the "ink slime elite" of the W6-content brief is the same gold-named foe every time.
enc('hollow_wolves', { zone: 'whisperwood_hollow', leader: 'thornback_wolf', enemies: ['thornback_wolf', 'thornback_wolf'] });
enc('hollow_blot', { zone: 'whisperwood_hollow', leader: 'ink_blot', enemies: ['ink_blot', 'ink_blot'],
  elite: { mods: ['vampiric', 'stoneskin'], index: 0 } });
enc('whisperwood_alpha', { zone: 'whisperwood_hollow', leader: 'briar_alpha', enemies: ['briar_alpha'], boss: true, noFlee: true,
  music: 'battle', noElite: true, flag: 'briar_alpha_defeated' });
// W10: the same Alpha for a party that comes late (PLAYTEST_REVIEW_2 3). ep1.js hollow_alpha picks the tier from story
// flags (alphaEncounter below): F3 cleared (Lv 8) -> t1, the Archivore beaten (Lv 9 to 10) -> t2. Fixed `elder` mods
// keep the bestiary entry and the Thornwake drop; the simulator holds each tier to the Alpha's 6 to 9 round target.
enc('whisperwood_alpha_t1', { zone: 'whisperwood_hollow', leader: 'briar_alpha', enemies: ['briar_alpha'], boss: true, noFlee: true,
  music: 'battle', noElite: true, flag: 'briar_alpha_defeated', elite: { mods: ['elder'], index: 0 }, tierOf: 'whisperwood_alpha' });
enc('whisperwood_alpha_t2', { zone: 'whisperwood_hollow', leader: 'briar_alpha', enemies: ['briar_alpha'], boss: true, noFlee: true,
  music: 'battle', noElite: true, flag: 'briar_alpha_defeated', elite: { mods: ['elder_ii'], index: 0 }, tierOf: 'whisperwood_alpha' });

/** The Briar Alpha encounter for the party's progress: flags -> encounter id (see the tiers above). */
export const ALPHA_TIERS = [
  { flag: 'archivore_defeated', encounter: 'whisperwood_alpha_t2', level: [9, 10] },
  { flag: 'boss_door_open', encounter: 'whisperwood_alpha_t1', level: [8, 8] },
];
export function alphaEncounter(hasFlag) {
  for (const t of ALPHA_TIERS) if (hasFlag(t.flag)) return t.encounter;
  return 'whisperwood_alpha';
}

// ---------------------------------------------------------------- Episode 2 (EPISODE2_PLAN.md 6.7)
// The Fading Road. road_mixed is the scripted first fight of the episode (ep2.js passes canFlee false).
enc('road_wolves', { zone: 'east_road', leader: 'mist_wolf', enemies: ['mist_wolf', 'mist_wolf'] });
enc('road_beetles', { zone: 'east_road', leader: 'glassback', enemies: ['glassback', 'quicksilver'] });
enc('road_quick', { zone: 'east_road', leader: 'quicksilver', enemies: ['quicksilver', 'quicksilver', 'quicksilver'] });
enc('road_mixed', { zone: 'east_road', leader: 'mist_wolf', enemies: ['mist_wolf', 'glassback'] });
enc('road_pack', { zone: 'east_road', leader: 'mist_wolf', enemies: ['mist_wolf', 'mist_wolf', 'mist_wolf'] });
// Court of Mirrors F1: The Silverglass Antechamber
enc('c1_quick', { zone: 'court_f1', leader: 'quicksilver', enemies: ['quicksilver', 'quicksilver', 'glint_wisp'] });
enc('c1_wisps', { zone: 'court_f1', leader: 'glint_wisp', enemies: ['glint_wisp', 'glint_wisp'] });
enc('c1_sentinel', { zone: 'court_f1', leader: 'glass_sentinel', enemies: ['glass_sentinel', 'quicksilver'] });
enc('c1_mixed', { zone: 'court_f1', leader: 'glass_sentinel', enemies: ['glass_sentinel', 'glint_wisp'] });
// F2: The Hall of Other Selves. W11 (PLAYTEST_REVIEW_3 fix 4): c2_shadows (two Borrowed Shadows, the longest live fight
// of the floor) is no longer placed; it stays defined for old saves' bestiary and the battle tests.
enc('c2_shadows', { zone: 'court_f2', leader: 'borrowed_shadow', enemies: ['borrowed_shadow', 'borrowed_shadow'] });
enc('c2_knight', { zone: 'court_f2', leader: 'faceless_knight', enemies: ['faceless_knight', 'glint_wisp'] });
enc('c2_sentinel', { zone: 'court_f2', leader: 'glass_sentinel', enemies: ['glass_sentinel', 'borrowed_shadow'] });
enc('c2_mixed', { zone: 'court_f2', leader: 'faceless_knight', enemies: ['faceless_knight', 'borrowed_shadow'] });
// The mini-boss: the party's own reflections. Boss loot is keyed by the encounter (loot-tables BOSS_LOOT.other_selves).
enc('other_selves', { zone: 'court_f2', leader: 'refl_hero', enemies: ['refl_hero', 'refl_mira', 'refl_bram'], boss: true,
  noFlee: true, music: 'battle', noElite: true, flag: 'other_selves_defeated', backdrop: 'court', bossLoot: 'other_selves' });
// F3: The Unnamed Throne. W15 (PLAYTEST_REVIEW_4 fix 8): the last floor before the King was the softest ordinary floor
// of the game (careful play lost 11 to 13% HP a fight, attack-only won 90 to 97%). C3_POWER makes its foes hit harder
// (ATK and MAG) on this floor only, with the same fights, HP, shields and rounds: at Lv 12 careful play now loses about
// 18% a fight and attack-only wins about 78% (tools/sim). c3_mixed was already the hardest group, so it gets the least.
// qa/battle/data.test.mjs checks no boosted foe can fell a full-HP member with one ordinary action.
export const C3_POWER = { c3_shards: 1.9, c3_knights: 2.1, c3_shadow: 1.9, c3_mixed: 1.1 };
enc('c3_shards', { zone: 'court_f3', leader: 'shard_swarm', enemies: ['shard_swarm', 'shard_swarm'], power: C3_POWER.c3_shards });
enc('c3_knights', { zone: 'court_f3', leader: 'faceless_knight', enemies: ['faceless_knight', 'faceless_knight'], power: C3_POWER.c3_knights });
enc('c3_shadow', { zone: 'court_f3', leader: 'borrowed_shadow', enemies: ['borrowed_shadow', 'shard_swarm'], power: C3_POWER.c3_shadow });
enc('c3_mixed', { zone: 'court_f3', leader: 'faceless_knight', enemies: ['faceless_knight', 'glass_sentinel', 'shard_swarm'], power: C3_POWER.c3_mixed });
// The King's Mirror. startFury: with the story flag set the party starts with +25 Fury (the Fountain of Faces).
enc('nameless_king', { zone: 'court_throne', leader: 'nameless_king', enemies: ['nameless_king'], boss: true, noFlee: true,
  music: 'boss_king', noElite: true, flag: 'nameless_king_defeated', startFury: { flag: 'fountain_done', amount: 25 } });

// ---------------------------------------------------------------- Episode 3 (EPISODE3_PLAN.md 6.2)
// The Old Sand Road. sr_first is the scripted first fight of the episode (ep3.js sand_first_fight passes canFlee false):
// the Cinder Beetle's first move is always Stoke (`opener` in enemies.js), so the Heat rule is taught by the first turn.
enc('sr_first', { zone: 'sand_road', leader: 'cinder_beetle', enemies: ['cinder_beetle', 'cinder_hound'] });
enc('sr_hounds', { zone: 'sand_road', leader: 'cinder_hound', enemies: ['cinder_hound', 'cinder_hound'] });
enc('sr_beetles', { zone: 'sand_road', leader: 'cinder_beetle', enemies: ['cinder_beetle', 'cinder_beetle'] });
enc('sr_mixed', { zone: 'sand_road', leader: 'cinder_hound', enemies: ['cinder_hound', 'slag_slime'] });
// The Ashen Foundry F1: The Cinder Liftworks
enc('fo1_beetles', { zone: 'foundry_f1', leader: 'cinder_beetle', enemies: ['cinder_beetle', 'cinder_beetle', 'slag_slime'] });
enc('fo1_slimes', { zone: 'foundry_f1', leader: 'slag_slime', enemies: ['slag_slime', 'slag_slime', 'slag_slime'] });
enc('fo1_miners', { zone: 'foundry_f1', leader: 'ashbound_miner', enemies: ['ashbound_miner', 'ashbound_miner'] });
enc('fo1_mixed', { zone: 'foundry_f1', leader: 'ashbound_miner', enemies: ['ashbound_miner', 'cinder_beetle'] });
// F2: The Ventilation Galleries, and the Bellows Specter (mini-boss; boss loot keyed by the enemy id)
enc('fo2_phantoms', { zone: 'foundry_f2', leader: 'soot_phantom', enemies: ['soot_phantom', 'soot_phantom'] });
enc('fo2_constructs', { zone: 'foundry_f2', leader: 'furnace_construct', enemies: ['furnace_construct', 'soot_phantom'] });
enc('fo2_mixed', { zone: 'foundry_f2', leader: 'furnace_construct', enemies: ['furnace_construct', 'ashbound_miner'] });
enc('bellows_specter', { zone: 'foundry_f2', leader: 'bellows_specter', enemies: ['bellows_specter'], boss: true, noFlee: true,
  music: 'battle', noElite: true, flag: 'bellows_specter_defeated', backdrop: 'foundry' });
// F3: The Heartforge Crucible
// The tightest ordinary floor (PLAYTEST_REVIEW_4 fix 8, the Court F3 lesson): `power` makes this floor's foes hit harder (ATK and
// MAG) without touching the Defenders' and Constructs' other floors; qa/battle/data.test.mjs checks that no boosted foe fells a
// full-HP member with one ordinary action.
export const F3_POWER = { fo3_defenders: 2.3, fo3_mixed: 1.9, fo3_furnace: 2.2 };
export const F3_SPEED = 1.5;
enc('fo3_defenders', { zone: 'foundry_f3', leader: 'forge_defender', enemies: ['forge_defender', 'soot_phantom'], power: F3_POWER.fo3_defenders, speed: F3_SPEED });
enc('fo3_mixed', { zone: 'foundry_f3', leader: 'forge_defender', enemies: ['forge_defender', 'slag_slime', 'slag_slime'], power: F3_POWER.fo3_mixed, speed: F3_SPEED });
enc('fo3_furnace', { zone: 'foundry_f3', leader: 'furnace_construct', enemies: ['furnace_construct', 'furnace_construct'], power: F3_POWER.fo3_furnace, speed: F3_SPEED });
// The Heartforge. startFury: with the story flag set (the Coolant Station side story) the party starts with +25 Fury.
// The Warden's coils join mid-fight (ai 'cinder_warden'), so the encounter lists only the Warden.
enc('cinder_warden', { zone: 'foundry_heart', leader: 'cinder_warden', enemies: ['cinder_warden'], boss: true, noFlee: true,
  music: 'boss_warden', noElite: true, flag: 'cinder_warden_defeated', backdrop: 'heartforge',
  startFury: { flag: 'coolant_done', amount: 25, text: 'The station still runs cold behind you. Fury rises! (+25)' } });

// ---------------------------------------------------------------- Zones
// level: the party level the zone is tuned for. plan: [encounterId, count] visible enemies to place.
export const ZONES = {
  valley: { id: 'valley', name: 'Willowmere Valley', level: [2, 3], backdrop: 'valley', music: 'battle',
    plan: [['valley_wolves', 2], ['valley_slimes', 1], ['valley_scarab', 2], ['valley_mixed', 1], ['valley_pack', 1]] },
  archive_f1: { id: 'archive_f1', name: 'The Catalog Halls', level: [4, 4], backdrop: 'archive', music: 'battle',
    plan: [['f1_slimes', 2], ['f1_mites', 2], ['f1_wraith', 2], ['f1_mixed', 2]] },
  archive_f2: { id: 'archive_f2', name: 'The Reading Galleries', level: [5, 6], backdrop: 'archive', music: 'battle',
    plan: [['f2_golem', 2], ['f2_wraiths', 2], ['f2_mites', 1], ['f2_mixed', 2], ['echo_warden', 1]] },
  archive_f3: { id: 'archive_f3', name: 'The Rootbound Stacks', level: [7, 7], backdrop: 'archive_deep', music: 'battle',
    plan: [['f3_ink', 2], ['f3_golem', 2], ['f3_wraiths', 2], ['f3_mixed', 2]] },
  archive_boss: { id: 'archive_boss', name: 'Heart of the Archive', level: [8, 8], backdrop: 'archive_deep',
    music: 'boss_archivore', plan: [['archivore', 1]] },
  // Optional: not in ZONE_ORDER, so the EXP curve (progression) never counts on it. Entered after the Lantern.
  whisperwood_hollow: { id: 'whisperwood_hollow', name: 'Whisperwood Hollow', level: [6, 7], backdrop: 'valley', music: 'battle',
    optional: true, plan: [['hollow_wolves', 2], ['hollow_blot', 1], ['whisperwood_alpha', 1]] },
};
export const ZONE_ORDER = ['valley', 'archive_f1', 'archive_f2', 'archive_f3', 'archive_boss'];
/** Side zones the story does not require (the simulator runs them, progression() does not count them). */
export const OPTIONAL_ZONES = ['whisperwood_hollow'];   // a pack's register() pushes its optional zones here

// ---------------------------------------------------------------- Episode 2 zones
// W11 (PLAYTEST_REVIEW_3 fixes 1 to 4): 27 placed groups, not 31 (the Waystation wolves, one F1 quicksilver patrol
// and both F2 Shadow pairs are gone); Episode 2's ordinary foes give about 10% more EXP so the curve still holds.
// EP2_ZONE_ORDER continues progression() from Episode 1's last EXP (tools/sim). Episode 1's ZONE_ORDER is untouched.
export const EP2_ZONES = {
  east_road: { id: 'east_road', name: 'The Fading Road', level: [9, 10], backdrop: 'east_road', music: 'battle', episode: 2,
    plan: [['road_wolves', 1], ['road_beetles', 2], ['road_quick', 1], ['road_mixed', 1], ['road_pack', 1]] },
  court_f1: { id: 'court_f1', name: 'The Silverglass Antechamber', level: [10, 11], backdrop: 'court', music: 'battle', episode: 2,
    plan: [['c1_quick', 1], ['c1_wisps', 2], ['c1_sentinel', 2], ['c1_mixed', 2]] },
  court_f2: { id: 'court_f2', name: 'The Hall of Other Selves', level: [11, 12], backdrop: 'court', music: 'battle', episode: 2,
    plan: [['c2_knight', 2], ['c2_sentinel', 2], ['c2_mixed', 2], ['other_selves', 1]] },
  court_f3: { id: 'court_f3', name: 'The Unnamed Throne', level: [12, 13], backdrop: 'court_deep', music: 'battle', episode: 2,
    plan: [['c3_shards', 2], ['c3_knights', 2], ['c3_shadow', 2], ['c3_mixed', 2]] },
  court_throne: { id: 'court_throne', name: "The King's Mirror", level: [13, 13], backdrop: 'throne', music: 'boss_king', episode: 2,
    plan: [['nameless_king', 1]] },
};
export const EP2_ZONE_ORDER = ['east_road', 'court_f1', 'court_f2', 'court_f3', 'court_throne'];
// Every lookup by id works (ZONES.court_f1, the battle scene's backdropKey, chest ilvl, mapcheck's enemy plan check),
// but until the Episode 2 maps exist the zones stay out of Object.keys(ZONES): qa/maps iterates ZONES and needs a map
// per zone. E2-maps (wave 10c): once the five maps are in src/data/maps, set EP2_MAPS_LISTED to true.
export const EP2_MAPS_LISTED = true;
for (const [id, z] of Object.entries(EP2_ZONES)) {
  Object.defineProperty(ZONES, id, { value: z, enumerable: EP2_MAPS_LISTED, configurable: true, writable: true });
}
// ---------------------------------------------------------------- Episode 3 zones (EPISODE3_PLAN.md 6.1, 6.2)
// EP3_ZONE_ORDER continues progression() from the Episode 3 quick start (Lv 13, 2,900 EXP; tools/sim). Same pattern as
// Episode 2: the zones resolve through ZONES[id] but stay non-enumerable until E3-maps lists them (EP3_MAPS_LISTED), because
// qa/maps iterates ZONES and wants a map per listed zone. Backdrops are the battle_<id> keys of the plan (E3-sprites).
export const EP3_ZONES = {
  sand_road: { id: 'sand_road', name: 'The Old Sand Road', level: [13, 14], backdrop: 'ash_road', music: 'battle', episode: 3,
    plan: [['sr_first', 1], ['sr_hounds', 1], ['sr_beetles', 1], ['sr_mixed', 1]] },
  foundry_f1: { id: 'foundry_f1', name: 'The Cinder Liftworks', level: [14, 15], backdrop: 'foundry', music: 'battle', episode: 3,
    plan: [['fo1_beetles', 2], ['fo1_slimes', 1], ['fo1_miners', 2], ['fo1_mixed', 1]] },
  foundry_f2: { id: 'foundry_f2', name: 'The Ventilation Galleries', level: [15, 16], backdrop: 'foundry', music: 'battle', episode: 3,
    plan: [['fo2_phantoms', 2], ['fo2_constructs', 1], ['fo2_mixed', 2], ['bellows_specter', 1]] },
  foundry_f3: { id: 'foundry_f3', name: 'The Heartforge Crucible', level: [16, 16], backdrop: 'crucible', music: 'battle', episode: 3,
    plan: [['fo3_defenders', 2], ['fo3_mixed', 2], ['fo3_furnace', 1]] },
  foundry_heart: { id: 'foundry_heart', name: 'The Heartforge', level: [16, 17], backdrop: 'heartforge', music: 'boss_warden', episode: 3,
    plan: [['cinder_warden', 1]] },
};
export const EP3_ZONE_ORDER = ['sand_road', 'foundry_f1', 'foundry_f2', 'foundry_f3', 'foundry_heart'];
/** E3-maps: set to true once the five Episode 3 maps are in src/data/maps (lists the zones for qa/maps and the quick start). */
export const EP3_MAPS_LISTED = false;
for (const [id, z] of Object.entries(EP3_ZONES)) {
  Object.defineProperty(ZONES, id, { value: z, enumerable: EP3_MAPS_LISTED, configurable: true, writable: true });
}
/** Zone order of an episode (1, 2 or 3). */
export function zoneOrder(episode = 1) { return episode === 3 ? EP3_ZONE_ORDER : episode === 2 ? EP2_ZONE_ORDER : ZONE_ORDER; }

function rand(rng) { return typeof rng === 'function' ? rng() : rng.next(); }

/**
 * Build the enemy list for a battle. Ordinary groups have an ELITE_RATE chance that one enemy is an
 * elite with 1 or 2 modifiers. opts: { eliteRate, forceElite: true | [modIds], noElite }.
 * Returns { id, zone, boss, noFlee, music, enemies: [{ id, elite: [modIds] | null }] }.
 */
export function rollEncounter(id, rng, opts = {}) {
  const e = ENCOUNTERS[id];
  if (!e) throw new Error(`unknown encounter ${id}`);
  // `power` (W15): the encounter's foes hit this much harder (ATK and MAG), so a floor can be tightened without
  // changing an enemy that other floors share. HP, shields and rewards stay the enemy's own.
  // `speed` (Episode 3, Foundry F3) does the same for SPD: the floor's foes act more often, so careful play takes steady chip damage
  // without any single hit growing past what `power` allows.
  const enemies = e.enemies.map((eid) => {
    const spec = { id: eid, elite: null };
    if (e.power) spec.power = e.power;
    if (e.speed) spec.speed = e.speed;
    const mul = encounterExpMul(id);
    if (mul !== 1) spec.expMul = mul;   // expcurve.js: only a group that pays differently carries it
    return spec;
  });
  const rate = opts.eliteRate ?? ELITE_RATE;
  // A fixed elite written into the encounter (`elite: { mods, index? }`) is part of the group: it ignores the
  // rate and the caller's noElite (which exists to keep scripted and simulated fights from rolling extras).
  if (e.elite && Array.isArray(e.elite.mods) && e.elite.mods.length) {
    const idx = Math.min(enemies.length - 1, Math.max(0, e.elite.index ?? 0));
    enemies[idx].elite = e.elite.mods.slice();
    return { id, zone: e.zone, boss: e.boss, noFlee: e.noFlee, music: e.music, enemies };
  }
  const wantElite = !e.noElite && !opts.noElite && (opts.forceElite || rand(rng) < rate);
  if (wantElite) {
    const idx = Math.floor(rand(rng) * enemies.length);
    let mods;
    if (Array.isArray(opts.forceElite)) mods = opts.forceElite.slice();
    else {
      const ids = RANDOM_ELITE_MODS;
      const first = ids[Math.floor(rand(rng) * ids.length)];
      mods = [first];
      if (rand(rng) < 0.3) {
        const rest = ids.filter((m) => m !== first);
        mods.push(rest[Math.floor(rand(rng) * rest.length)]);
      }
    }
    enemies[idx].elite = mods;
  }
  return { id, zone: e.zone, boss: e.boss, noFlee: e.noFlee, music: e.music, enemies };
}

// ---------------------------------------------------------------- EXP (expcurve.js)
/** The EXP scale of a zone: scaleForEpisode(the zone's episode). Every scale is 1 today. */
export function expScale(zoneId) {
  const z = ZONES[zoneId];
  return scaleForEpisode(z && z.episode ? z.episode : 1);
}
/** The multiple an encounter's foes pay: its own `expMul`, else OPTIONAL_FOE_EXP_MUL in an optional zone, else 1. */
export function encounterExpMul(id) {
  const e = ENCOUNTERS[id];
  if (!e) return 1;
  if (e.expMul !== undefined && e.expMul !== null) return e.expMul;
  const z = ZONES[e.zone];
  return z && z.optional ? OPTIONAL_FOE_EXP_MUL : 1;
}

/** EXP of a group (no elites): the sum of each foe's EXP scaled and rounded per unit, exactly as makeEnemyUnit pays it. */
export function encounterExp(id) {
  const e = ENCOUNTERS[id];
  const ep = ZONES[e.zone] && ZONES[e.zone].episode ? ZONES[e.zone].episode : 1;
  const mul = encounterExpMul(id);
  return e.enemies.reduce((s, eid) => s + (ENEMIES[eid] ? scaleExp(ENEMIES[eid].exp, ep, mul) : 0), 0);
}
