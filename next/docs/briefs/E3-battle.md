# E3-battle: Heat, Tempered Oath, the roster, items, balance (wave 17a, run 3 of 10)

Read `docs/briefs/COMMON.md`, `DESIGN.md`, `docs/story/EPISODE3.md` (sections 1 Act V and 3), `docs/EPISODE3_PLAN.md`
sections 6 and 7 (your contract), `docs/BATTLE.md`, and `docs/EPISODE2_PLAN.md` 6.8 for the calibration method.

## Items, in order

1. **Enemies, encounters, zones** of plan 6.1 and 6.2: `EP3_ZONES`, `EP3_ZONE_ORDER`, `EP3_MAPS_LISTED = false` (the
   Episode 2 pattern; E3-maps flips it). Episode 1 and 2 orders and targets untouched.
2. **Heat** (plan 6.3): the trait, Stoke, the flare telegraph, Quench on ice / Quench Flask / Break, events the scene
   can draw (`heat` value per unit, a `quench` event, the flare announce). Keep it a counter on the foe, not a status.
3. **Tempered Oath** (plan 6.5) and `learn: { flag }` in the learn rules (fallback level 15 if the flag path is
   costly; say which). Redirects, Nameless immunity, the Last Hammer turned at 50% with a Break.
4. **AI**: `specter` (6.4) and `cinder_warden` (6.5: three phases, coils, the shell, HP locks at 70% and 31%,
   Strike the Name at Heat 3, Last Hammer every 3rd turn, Lunge knock-back).
5. **Items** (plan 7): `quench_flask`, the six key items, tier 5 and 6 bases, uniques, the Ashwalker set, affix tier 5,
   rare names, `ZONE_LOOT`, `BOSS_LOOT.bellows_specter` and `.cinder_warden`, the shops, the `startFury` option from
   `coolant_done`.
6. **Simulator**: zones, `LOADOUTS`, `TARGETS` (6.6; Foundry F3 the tightest ordinary floor), policies that quench and
   use the Oath. Tune until `--check` prints "All targets met" for all three episodes. Record the table in BATTLE.md.

## Rules

- Owned paths: `src/data/enemies.js`, `encounters.js`, `skills.js`, `items.js`, `loot-tables.js`, `shops.js`,
  `src/battle/rules.js`, `ai.js`, `status.js`, `loot.js`, `ctb.js` (only if needed), `tools/sim/**`, `qa/battle/**`,
  `docs/BATTLE.md` (a new "Episode 3" section). Not: the battle scene, story text, maps.
- Pure modules stay pure. No git, no em dashes, bounded commands (the sim gets a timeout; prefer `--zones` runs while
  tuning, one full `--check` at the end).
- Verify: `node qa/run.mjs battle`; `node tools/sim/simulate.mjs --check`; `--trace bellows_specter` and
  `--trace cinder_warden` read once by eye for phase flow, telegraph texts and Oath outcomes.
- Report under 400 words: final numbers that moved from the plan and why, the events the scene must draw (names and
  payloads), Auto behavior, test counts, the sim table.
