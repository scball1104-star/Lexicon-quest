# X1-battle: the EXP constants, encounters, the three foes, loot, shops and the sim additions (X1 wave W1, job 3 of 3; XP-packs runs first)

Read `docs/briefs/COMMON.md`, `DESIGN.md` section 7, `docs/EXPANSION_RECONCILIATION.md` (the decision log; it wins over the plan), `docs/EXPANSION1_PLAN.md` sections 2.3, 2.4, 6.3, **7 (the EXP budget: your contract)**,
8 and 11.2, `docs/BATTLE.md`, `docs/PLAYTEST_REVIEW_2.md` section 3 (the Hollow's calibration), `docs/EPISODE2_PLAN.md` 6.8, `docs/briefs/XP-packs.md` (how your data modules are registered) and
`docs/EXPANSION2_PLAN.md` 9.6 (the sibling's ledger uses your file and your checker). The Briar Alpha (`enemies.js`, `encounters.js` `ALPHA_TIERS`) is your model for a data-only optional boss.

## Items, in order

1. **The constants file and `expMul`** (plan 7.1; the one mechanism for both episodes). Create `src/data/expcurve.js` (a leaf module, no imports): `EP1_EXP_SCALE = EP2_EXP_SCALE = EP3_EXP_SCALE = 1`, `OPTIONAL_FOE_EXP_MUL = 1`, `EXPANSION_FOE_EXP_MUL = 0.1`,
   `scaleForEpisode(episode)`, `scaleExp(raw, episode, expMul)`. In `src/data/encounters.js`: `expScale(zoneId)` and `encounterExp()` applying it and the encounter's `expMul` (per-unit rounding, no elites). In `src/battle/rules.js` `makeEnemyUnit`: multiply the unit's EXP by
   `expScale(options.zone) * expMul` after the elite multiplier (summons inherit the summoner's `expMul`); gold and mastery are not scaled. `rollEncounter()` copies `expMul` onto each enemy spec as it copies `power` and `speed`. Check `scenes/battle.js` passes `zone` in the battle options
   (add it through the existing options if absent). **Every existing reward must be byte-identical**: a test pins it for every existing encounter. You are the only agent in either expansion that edits `rules.js` or the EXP block of `encounters.js`; the Episode 2 build only writes data.
2. **The registry seams for both episodes' battle data**: the word `export` on `enemy` (enemies.js), `enc` (encounters.js), `eq` and `weapon` (items.js), plus whatever one-word or one-line seam `loot-tables.js` and `shops.js` need so a pack's `register()` can add rows; nothing else in those files.
3. **Enemies** (`src/data/x1/enemies.js`, plain rows; default export `register()` adding them through `enemy()`): `barrow_shade`, `barrow_reeve`, `millstone_golem` as in 7.4 (first-pass numbers; tune to the targets). Reuse existing enemy skills where one fits; add at most two new
   skills (a chilling touch, a stone slam), exported in `skills.js` shape. The bosses use `ai: 'phased'` with `charge`, `phases`, `summon` and `haste`; nothing new in `ai.js`.
4. **Encounters and zones** (`src/data/x1/encounters.js`): the 18 groups and two boss encounters of 7.4 (every one `expMul: EXPANSION_FOE_EXP_MUL`), the eight zones of 7.3 (`optional: true`, in `OPTIONAL_ZONES`, `X1_MAPS_LISTED = false` with the non-enumerable pattern of
   `EP2_MAPS_LISTED` and `EP3_MAPS_LISTED`; X1-maps-hub flips it). Boss encounters: `boss: true`, `noFlee`, `noElite`, `flag` (`barrow_reeve_defeated`, `millstone_golem_defeated`), `bossLoot`.
5. **Loot** (`src/data/x1/loot.js`): `ZONE_LOOT` of 7.3, `BOSS_LOOT.barrow_reeve` and `.millstone_golem` (7.4), chest rules unchanged.
6. **Items** (`src/data/x1/items.js`): `honey_roll`, the key items of 2.3, the nine equipment rows of 8.2 with `source` text, the set `drovers_road` (+25 HP, +2 DEF). A unit test pins the budgets of 8.2 (no row beats its peers by more than one tier; the set stays below Wayfarer's Promise).
7. **Shops** (`src/data/x1/shops.js`): `thornfold_loom` and `millrace_stall` (8.3) and the `willowmere_items` price-card variant (`pell_stamp`).
8. **The simulator: additions only** (plan 7.5; you own `tools/sim/**` for the whole Episode 1 build): `progression()`, `TARGETS`, `TARGETS.levels`, `BOSS_LEVELS`, `route.mjs`, `loadouts.mjs` and every main-route number stay exactly as they are. Add `tools/sim/x1.mjs` (loadouts, suite levels, boss levels and targets for the eight new zones and
   the two bosses, imported by `simulate.mjs` through a small registry list that the Episode 2 files join with one line) and `tools/sim/optional_exp.mjs` (`OPTIONAL_SOURCES` for each episode, `INTENDED_ORDER` = the worst order, `completionRows(episode)`, `checkOptionalCaps()`; shaped so Episode 2 adds its rows from `x2.mjs`).
   Run the ledger of plan 7.2 at 400 battles and keep every cap: **the completionist is at most one level over today's plan at the Echo Warden, the Archivore and the end of Episode 1**, margins as in the plan. Tune only quest EXP down or `EXPANSION_FOE_EXP_MUL` within 0.05 to 0.15, never a main-route foe.
   `node tools/sim/simulate.mjs --check` prints "All targets met" with every main-route number unchanged. Write down the framework in `docs/BATTLE_X1.md` for the Episode 2 author.
9. **Tests** `qa/battle/x1_*.test.mjs`: every existing encounter's reward byte-identical; a new group's reward equals the sum of `ENEMIES` EXP times `expMul` times the elite multiplier, rounded per unit, and `encounterExp` agrees; stored EXP, levels and quick starts untouched; the 7.2 caps hold; every new id resolves; no foe fells a full-HP member with
   one ordinary action (the W15 test).

## Rules

- Owned paths: `src/data/expcurve.js`, `src/data/x1/{enemies,encounters,loot,items,shops}.js`, the EXP block and the registry seams of `src/data/{encounters,enemies,items,loot-tables,shops}.js`, `src/battle/rules.js` (the reward line and the `expMul` copy only), `src/scenes/battle.js` (the `zone` option, only if absent),
  `tools/sim/**`, `qa/battle/**`, `docs/BATTLE_X1.md`. Nothing else; `src/data/x1/index.js` and `live.js` are XP-packs'.
- Pure modules stay pure. No git, no em dashes, bounded commands (the sim gets a timeout; prefer `--zones` runs while tuning, one full `--check` at the end). Main-path numbers, the Echo Warden, the Archivore and the Hollow rows are not touched.
- Verify: `node qa/run.mjs battle`; `node tools/sim/simulate.mjs --check`; `--trace barrow_reeve` and `--trace millstone_golem` read once by eye; one informational pass of the two bosses with their uniques equipped.
- Report under 400 words: the final `EXPANSION_FOE_EXP_MUL` and the 7.2 ledger with margins, numbers that moved from the plan, the contracts for maps (ids, boss flags) and for the Episode 2 author (the framework), test counts.
