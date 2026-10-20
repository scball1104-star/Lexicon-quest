// Encounter groups per zone, which visible field enemy maps to which group, boss encounters.
// Pure data + a pure roller (takes an injected rng).
//
// Map authors: a visible enemy event is { type: 'enemy', sprite: <leader enemy id>, encounter: <id> }.
// The field sprite comes from enemies_field (frame id = the leader's enemy id). ZONES[z].plan lists
// how many of each group the zone should hold: the EXP curve in party.js assumes the player fights
// roughly that many (most visible enemies once). Keep the counts if you move enemies around.

import { ENEMIES, ELITE_RATE, ELITE_MODS } from './enemies.js';

export const ENCOUNTERS = {};
function enc(id, o) { ENCOUNTERS[id] = { id, boss: false, noFlee: false, music: 'battle', ...o }; }

// ---------------------------------------------------------------- Willowmere Valley
enc('valley_wolves', { zone: 'valley', leader: 'briar_wolf', enemies: ['briar_wolf', 'briar_wolf'] });
enc('valley_slimes', { zone: 'valley', leader: 'ink_slime', enemies: ['ink_slime', 'ink_slime', 'ink_slime'] });
enc('valley_scarab', { zone: 'valley', leader: 'moss_scarab', enemies: ['moss_scarab', 'ink_slime'] });
enc('valley_mixed', { zone: 'valley', leader: 'briar_wolf', enemies: ['briar_wolf', 'moss_scarab'] });
enc('valley_pack', { zone: 'valley', leader: 'briar_wolf', enemies: ['briar_wolf', 'briar_wolf', 'ink_slime'] });

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
  elite: { mods: ['splitting', 'vampiric'], index: 0 } });
enc('whisperwood_alpha', { zone: 'whisperwood_hollow', leader: 'briar_alpha', enemies: ['briar_alpha'], boss: true, noFlee: true,
  music: 'battle', noElite: true, flag: 'briar_alpha_defeated' });

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
export const OPTIONAL_ZONES = ['whisperwood_hollow'];

function rand(rng) { return typeof rng === 'function' ? rng() : rng.next(); }

/**
 * Build the enemy list for a battle. Ordinary groups have an ELITE_RATE chance that one enemy is an
 * elite with 1 or 2 modifiers. opts: { eliteRate, forceElite: true | [modIds], noElite }.
 * Returns { id, zone, boss, noFlee, music, enemies: [{ id, elite: [modIds] | null }] }.
 */
export function rollEncounter(id, rng, opts = {}) {
  const e = ENCOUNTERS[id];
  if (!e) throw new Error(`unknown encounter ${id}`);
  const enemies = e.enemies.map((eid) => ({ id: eid, elite: null }));
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
      const ids = Object.keys(ELITE_MODS);
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

/** Average EXP of a group (no elites). */
export function encounterExp(id) {
  return ENCOUNTERS[id].enemies.reduce((s, eid) => s + (ENEMIES[eid] ? ENEMIES[eid].exp : 0), 0);
}
