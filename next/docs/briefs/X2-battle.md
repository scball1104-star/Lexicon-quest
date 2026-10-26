# X2-battle: foes, bosses, loot, shops and the Episode 2 sim rows (X2 wave XA)

Runs after the Episode 1 expansion is published (P1b). Read `docs/briefs/COMMON.md`, `DESIGN.md` section 7, `docs/EXPANSION_RECONCILIATION.md` (the decision log), `docs/BATTLE.md`, `docs/EXPANSION2_PLAN.md` sections 9, 10 and 13 (your contract; **9.6 is the EXP budget**),
`docs/EPISODE2_PLAN.md` 6 and 7 (the calibration method), `docs/BATTLE_X1.md` (the sim framework and the constants file the Episode 1 build left you), `src/data/enemies.js` (the Briar Alpha and the Episode 2 foes as models), `tools/sim/` and `PLAYTEST_REVIEW_4.md` section 3.

## Items, in order

1. **EXP: you edit no shared EXP file.** `src/data/expcurve.js` (every scale 1.0, `EXPANSION_FOE_EXP_MUL` 0.1), `expScale`, `encounterExp` and the `rules.js` line exist from the Episode 1 build. Every new optional group and boss you write carries `expMul: EXPANSION_FOE_EXP_MUL`; you may set a smaller explicit
   `expMul` on a group if your ledger needs it. Quest EXP is not yours (X2-story, via `give('exp', n)`).
2. **`src/data/x2/enemies.js`**: the 14 records of plan 9.1 and 9.3 (default export `register()`; note the ordinary Quarry foe is `delver_shade`, not `barrow_shade`, which Episode 1 owns), reusing existing frames through `sprite: { frame }` for the aliases. Boss phases with `ai: 'phased'`; no `ai.js` change. Adds pay 0 EXP and 0 gold. Raw EXP values as the plan.
3. **`src/data/x2/encounters.js`**: the 24 encounters (Quarry groups are `qy_*`) and nine zones (`episode: 2`, `optional: true`), enumerable once the pack registers them; `X2_MAPS_LISTED = false` until X2-integrate. Boss `flag: <id>_defeated`, `noFlee`, `noElite`, `bossLoot` by encounter id, music `x2_boss`.
4. **`src/data/x2/items.js`**: the 14 key items (including the counted `cache_tin`), the 17 placed items with the stats of plan 10.2 (check each against the tier-4-plus caps of 10.1; the Q1 mantle is `cairnwalker_mantle`, the cap `quarrymans_cap`), the third `merewardens_watch` piece and its 3-piece bonus (read `setBonus` in `rules.js` first), prices within 15% of the slot's
   nearest base. `loot.js`: `ZONE_LOOT` rows and the four `BOSS_LOOT` entries; `shops.js`: `reed_lodge` and `isle_chandlery`. New skills the foes use, with a telegraph line each (copy `glass_ram`).
5. **The sim: additions only.** Add `tools/sim/x2.mjs` (`X2_OPTIONAL`, X2 zone loadouts, X2 boss targets, `economyX2()`, and the Episode 2 rows of `checkOptionalCaps()` for the Other Selves and the King, using `optional_exp.mjs`) and one registration line in `tools/sim/simulate.mjs`. Nothing else in `tools/sim` changes meaning.
6. **Tune** until `node tools/sim/simulate.mjs --check` prints "All targets met" with every main-route number unchanged, the X2 zones and bosses at their plan-level targets (plan 9.3), and the ledger of plan 9.6 within its caps (a completionist at most about one level over today's plan at the Other Selves and the King, margins reported). If a cap breaks, lower quest EXP or the group
   `expMul` (0.05 to 0.15); never a plan-level enemy number or a main-route foe.
7. **Tests** `qa/battle/x2_*.test.mjs`: every encounter's enemies exist; zone plans sum; EXP and gold as the plan; every new group carries the expansion `expMul` and no add pays EXP; no item exceeds its slot cap; shop stock resolves; the 3-piece set resolves; the ledger caps; ids do not collide with Episode 1's (`barrow_shade`, `bw_*`).

## Rules

- Owned paths: `src/data/x2/{enemies,encounters,items,loot,shops}.js`, `tools/sim/x2.mjs`, one registration line in `tools/sim/simulate.mjs`, `qa/battle/x2_*`, `docs/BATTLE_X2.md`. **Not** `src/data/expcurve.js`, `rules.js`, `encounters.js`, `enemies.js`, `items.js`, `loot-tables.js`, `shops.js`, `ai.js` (ask in the report). Episode 3's tables and targets do not change in this run.
- Optional zones stay out of `ZONE_ORDER`, `EP2_ZONE_ORDER` and `progression()`. No git, no em dashes, bounded commands (the sim at `--n 100` while tuning).
- Verify: `node qa/run.mjs battle`; `node tools/sim/simulate.mjs --check`; `--trace waymarker 1`, `--trace last_lamplighter 1`, `--trace mercury_mother 1` read once; one informational pass of the four bosses with the named kit equipped.
- Report under 400 words: the final tables (foes, bosses, items), the 9.6 ledger with margins, the lever you pulled (if any), the shared-file edits (the one registration line), anything sprites, story or audio must match.
