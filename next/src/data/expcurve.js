// The one place experience pay is tuned (EXPANSION_RECONCILIATION.md 1, EXPANSION1_PLAN.md 7.1). A leaf module: no imports.
//
// Experience in Episodes 1, 2 and 3 is exactly today's: every scale is 1. New optional content pays in gold, named gear and
// items, plus a small EXP bonus, through ONE per-encounter option, `expMul` (encounters.js). The mechanism:
//
//   unit EXP = round( ENEMIES[id].exp x elite multiplier x expScale(zone) x expMul )     (battle/rules.js makeEnemyUnit)
//
// `expScale(zoneId)` (encounters.js) is scaleForEpisode(the zone's episode). `expMul` is the encounter's own number; an
// encounter that sets none pays x1, so every reward that existed before the expansions is byte-identical (a test pins it).
// A summoned add inherits its summoner's `expMul`. Gold, mastery and cutscene EXP (`give('exp', n)`) are never scaled.
//
// Scott's decision (2026-10-25): the new optional content pays regular EXP (EXPANSION_FOE_EXP_MUL = 1) and a completionist may end up
// several levels over today's plan. tools/sim/optional_exp.mjs REPORTS the completionist's level at every main boss and fails only
// when a main boss turns trivially easy. The mechanism stays so a group (or the constant) can be lowered again without code changes.

export const EP1_EXP_SCALE = 1;   // Episode 1 zones (main path, Whisperwood Hollow, every x1_ zone)
export const EP2_EXP_SCALE = 1;   // Episode 2 zones
export const EP3_EXP_SCALE = 1;   // Episode 3 zones (E3-battle may revise; the expansion builds never do)

/** The default per-encounter expMul of an optional zone that sets none (Whisperwood Hollow keeps today's pay). */
export const OPTIONAL_FOE_EXP_MUL = 1;
/** The expMul every NEW optional group and optional boss of either expansion carries (full pay since Scott's decision). */
export const EXPANSION_FOE_EXP_MUL = 1;  // the expMul every NEW optional group and optional boss of either expansion carries. Scott (2026-10-25): FULL EXP, accept the extra levels. A group may still set its own smaller expMul (the per-fight override).

/** The scale of an episode (1, 2 or 3); anything else pays x1. */
export function scaleForEpisode(episode) {
  return episode === 2 ? EP2_EXP_SCALE : episode === 3 ? EP3_EXP_SCALE : episode === 1 ? EP1_EXP_SCALE : 1;
}

/** One unit's EXP from its raw number, the episode's scale and the encounter's expMul (rounded per unit). */
export function scaleExp(raw, episode, expMul = 1) {
  return Math.round(raw * scaleForEpisode(episode) * expMul);
}
