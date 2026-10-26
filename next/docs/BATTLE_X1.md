# BATTLE_X1: the Episode 1 expansion's battle data, the EXP mechanism and the sim framework

Written 2026-10-25 by X1-battle (X1 wave W1). For the Episode 2 author (X2-battle), the maps agents and the reviewers. Authority: `docs/EXPANSION_RECONCILIATION.md`, `docs/EXPANSION1_PLAN.md` sections 7 and 8, and this file where the build moved a number.

## 0. The decision that changed the budget (Scott, 2026-10-25)

**Full EXP; the extra levels are accepted.** `EXPANSION_FOE_EXP_MUL` is **1.0**: the new optional foes and bosses pay regular EXP. The plan's "at most one level over today's plan at each main boss" cap is **no longer enforced**. What stayed:

- The `expMul` mechanism and the per-encounter override (default 1; a group, or the constant, can be lowered again with no code change).
- Every existing reward is byte-identical (pinned by `qa/battle/x1_rewards.test.mjs` against a baseline written before the mechanism existed).
- No main-route foe, scale, `TARGETS.levels`, `BOSS_LEVELS` entry or main-route sim number moved.
- `checkOptionalCaps()` still runs in `simulate.mjs --check`, but it **reports** the completionist's level at every main boss and fails only on something broken: a main boss that is a **pushover** at that level (careful play wins it in under 60% of the target's minimum rounds, or loses under 6% of the party's HP), or is lost more than half the time. The fix for a pushover is boss-side, never cutting EXP.

### The ledger (worst order: everything optional first; 400 elite-roll runs; `node tools/sim/optional_exp.mjs`)

| At | Today (EXP, Lv) | Completionist EXP (mean, elites) | Lv | Over today | Worst of 400 runs (Lv) | The boss at that Lv (sim, plain loadout, careful play) |
|---|---|---|---|---|---|---|
| Echo Warden | 448, Lv 6 | 1,269 | **9** | +3 | 1,362 (9) | wins 100%, 5.7 rounds (target min 6), 12% HP lost |
| Archivore | 1,033, Lv 8 | 2,225 | **11** | +3 | 2,312 (11) | wins 100%, 7.5 rounds (target min 8), 22% HP lost |
| Episode 1 end | 1,433, Lv 9 | 2,647 | **12** | +3 | 2,742 (12) | (no boss) |
| Other Selves (Episode 1 carry only) | about 2,176, Lv 11 | 3,390 | 14 | +3 | 3,482 (14) | wins 100%, 6.7 rounds, 19% |
| The King (Episode 1 carry only) | 2,835, Lv 13 | 4,051 | 15 | +2 | 4,145 (15) | wins 100%, 9.5 rounds, 20% |

Base EXP the new content adds (no random elites): the eight new zones 815 (the eighteen groups 647, the two bosses 140, their calls 28), quests 54, Whisperwood Hollow 284 (the Alpha's pack call and the fixed elite blot included, which the plan's 258 left out). The Echo Warden figure counts the Terrace (the moor's stile opens it before the Lantern) and every quest and zone that opens before the Warden; the Archivore figure adds the Cellar, Dark Stars and the Hollow. Elites add a mean of about 30 by the Warden and 60 by the Archivore.

Read these with care: the sim party has **today's plain loadout**; the completionist also carries the placed gear. One informational pass (`tools/sim/out/x1_main_bosses_geared.mjs`): geared at the same levels, the Echo Warden (Lv 9) is won 100% in 5.3 rounds with 14% HP lost, and attack-only wins it 96% of the time; the Archivore (Lv 11) is won 100% in 7.3 rounds (26% lost) and attack-only wins 22%. **The Echo Warden is the soft spot**: at Lv 9 it is a short fight, not a pushover by the check, and the suggested boss-side adjustment (none applied: main-route rows are not X1-battle's) is a one-step HP or ATK raise for the 8-or-more-level case, or a phase that scales with the party (see the Alpha's Elder tiers, `ALPHA_TIERS`, for the pattern).

## 1. The EXP mechanism (one file, both episodes)

`src/data/expcurve.js` (a leaf module): `EP1_EXP_SCALE = EP2_EXP_SCALE = EP3_EXP_SCALE = 1`, `OPTIONAL_FOE_EXP_MUL = 1`, `EXPANSION_FOE_EXP_MUL = 1`, `scaleForEpisode(ep)`, `scaleExp(raw, episode, expMul)`.

- `src/data/encounters.js`: `expScale(zoneId)`, `encounterExpMul(id)` (the encounter's `expMul`, else `OPTIONAL_FOE_EXP_MUL` in an optional zone, else 1), `encounterExp(id)` (sum of per-unit rounded EXP, no elites), and `rollEncounter()` copies `expMul` onto each enemy spec **only when it is not 1** (so specs of every old encounter are unchanged).
- `src/battle/rules.js` `makeEnemyUnit`: after the elite multiplier, `exp *= expScale(zone)` then `exp *= expMul`, rounded once with the unit's `rewardScale`. `expMul` is the spec's, else the summoner's (`extra.by`) or the parent's (`extra.after`, a split child), else 1. A unit that pays x1 gets **no** `expMul` field (unit shape unchanged). The zone is read from `state.options.zone` (set by `createEncounterBattle`; the battle scene already passes it), so `scenes/battle.js` needed no change. Gold, mastery and cutscene EXP (`give('exp', n)`) are never scaled.
- To pay a new group less, write `expMul: 0.5` on its `enc()` row (or change the constant). Tests: `qa/battle/x1_rewards.test.mjs`.

Seams added to existing files (all one-word `export`s): `enemy` (enemies.js), `enc` (encounters.js), `eq` and `weapon` (items.js). `OPTIONAL_ZONES`, `ZONE_LOOT`, `BOSS_LOOT`, `SHOPS`, `ITEMS`, `UNIQUES`, `SETS`, `CONSUMABLES`, `KEY_ITEMS`, `SKILLS` were already exported plain objects, so `loot-tables.js` and `shops.js` needed no seam.

## 2. The data (`src/data/x1/{enemies,encounters,loot,items,shops}.js`)

Each module has a default `register()` (idempotent). The pack index (`src/data/x1/index.js`, XP-packs') calls them in its fixed order; the sim calls them itself (`tools/sim/x1.mjs`).

**Enemies.** `barrow_shade` (Lv 5, small, HP 175, ATK 14, DEF 6, MAG 24, weak fire and light, resists ice; EXP 16, gold 22), `barrow_reeve` (Lv 6, HP 430, ATK 38; EXP 60, gold 160), `millstone_golem` (Lv 7, HP 545, ATK 44; EXP 80, gold 220). Bosses use `ai: 'phased'` (a telegraph from turn 2 every 3, a call at 50%, Haste at 25%); nothing new in `ai.js`. Two new skills in `X1_SKILLS` (added to `SKILLS` by `register()`): `chilling_touch` (the shade) and `stone_slam` (the Golem, with the plan's DEF debuff folded in). Everything else is reused: the Reeve's sweep is Strike, his hook Shield Bash, both bosses' telegraph is Burrowing Charge (the Alpha's: "{name} digs in, eyes fixed on {target}."), the Golem's shove is Shield Bash. The plan's own telegraph texts ("The Reeve sets his crook...", "Millstone Roll") need a third and fourth skill and are left for a later pass.

**Encounters and zones.** Eighteen groups and two boss encounters (`barrow_reeve`, `millstone_golem`: `boss`, `noFlee`, `noElite`, flags `barrow_reeve_defeated` and `millstone_golem_defeated`, `bossLoot`, music `boss_reeve` and `boss_millstone`), eight optional zones in `OPTIONAL_ZONES`, non-enumerable in `ZONES` while `X1_MAPS_LISTED` (in `src/data/x1/encounters.js`) is false. **X1-maps-hub flips that one constant.** Zone `backdrop` keys are the plan's *fallbacks* (`valley`, `archive`, `archive_deep`) because `scenes/battle.js` only knows its own `BACKDROPS` table; `X1_BACKDROP_ART` lists the plan's art keys (`battle_downs`, `battle_moor`, `battle_barrow`, `battle_larchhill`, `battle_culvert`) for whoever wires them (X1-integrate).

**Loot.** `ZONE_LOOT` per 7.3 (ilvl 3 to 6, 0.10 to 0.12). `BOSS_LOOT.barrow_reeve` (Reeve's Crook, 1 rare roll at ilvl 6, Hi-Potion, 2 Antidotes) and `.millstone_golem` (Millwright's Apron, 1 rare roll at ilvl 7, 2 Hi-Potions, Phoenix Feather), keyed by enemy id. Chest rules unchanged.

**Items.** `honey_roll` (40 g, 100 HP), key items `burial_roll`, `quill_copy`, `pell_crate` (counted), `millstone_pin`, the nine pieces of 8.2 as `UNIQUES` (placed, never in the random pools) with `source` text, and the set `drovers_road` (+25 HP, +2 DEF; below Wayfarer's Promise, which keeps SPD and Haste). The budget test compares each piece with the peers the plan names.

**Shops.** `thornfold_loom` (keeper `tamsin`, map `x1_loomhouse`), `millrace_stall` (keeper `ferrick`, map `x1_millrace`), and `willowmere_items` rewritten with a tenth-off twin of every entry gated on `pell_stamp` (`ifFlag` list + `ifNotFlag`). Nothing in them is not already sold in Willowmere or the Archive.

## 3. Numbers that moved from the plan

| Item | Plan | Built | Why |
|---|---|---|---|
| `EXPANSION_FOE_EXP_MUL` | 0.1 | **1.0** | Scott's decision (section 0) |
| `barrow_shade` HP, DEF | 140, 5 | 175, 6 | `bw_*` groups were 2.7 rounds; the Barrow zone average must be 3 to 5 |
| `barrow_reeve` HP, ATK | 470, 33 | 430, 38 | careful 6 to 9 rounds at Lv 5 and 6 (with the stronger shade it ran 9.2); attack-only at Lv 6 won 67% (target 60% or less) |
| `millstone_golem` HP | 760 | 545 | 10.4 rounds at the plan's HP; target 6 to 9 |
| `dn_wolves` | briar_wolf x2 | briar_wolf x3 | two wolves at Lv 4 with the Archive F1 kit ran 2.5 rounds (bottom of the 3 to 5 band) |
| `tr_wolves` | thornback + briar | thornback x2 + briar | 2.2 rounds at the Terrace's Lv 6 to 7 kit |
| Boss EXP | counted raw | counts the add each calls (shade, scarab) | a summoned add pays like any foe |
| Hollow | 258 | 284 + the fixed elite blot | the Alpha's pack call and the elite were left out of the plan's ledger |
| Gold | +2,050 total | see 5 | the plan did not count ordinary fight gold |

## 4. The simulator (additions only)

`progression()`, `TARGETS`, `TARGETS.levels`, `BOSS_LEVELS`' existing keys, `route.mjs`, `loadouts.mjs` and every main-route number are untouched (a diff of `simulate.mjs --check` output before and after shows only added lines).

- `tools/sim/x1.mjs`: registers the x1 content and exports `SIM_EXTENSION` (`suiteLevels`, `bossLevels`, `loadoutAt`, `targets`, `bossTargets`, `zones`). It also sets `LOADOUTS.x1_*` (Downs: `valley` at Lv 3, `archive_f1` at Lv 4; Moor `archive_f1`; Barrow, Larchhill, Millrace `archive_f2`; Terrace, Cellar, Culvert `archive_f3`).
- `tools/sim/simulate.mjs`: a small `EXTENSIONS` list (`const EXTENSIONS = [X1]`) merges only **new** keys; `runSuite` picks `LOADOUT_AT[zone][level]` when present; `--check` prints the optional-EXP table and runs `checkOptionalCaps({ runSet })`.
- `tools/sim/optional_exp.mjs`: `OPTIONAL_SOURCES`, `INTENDED_ORDER` (the worst order), `CHECKPOINTS`, `completionRows(episode)`, `bossRows()`, `checkOptionalCaps()`, `registerOptionalSources()`. It does **not** import `simulate.mjs` (the CLI's top-level await would deadlock a cycle; `route.mjs` avoids it the same way), so the CLI passes `runSet` in.
- Targets for both bosses are the Alpha's (careful play 6 to 9 rounds and wins 85% or more at Lv 5 and 6 / Lv 6 and 7, attack-only 60% or less). Final 400-run table: Reeve Lv 5: 100% / 8.82 rounds, attack-only 2%; Lv 6: 100% / 7.71, attack-only 55%. Golem Lv 6: 100% / 8.86, attack-only 3%; Lv 7: 100% / 8.14, attack-only 40%. With all nine pieces equipped (`tools/sim/out/x1_bosses_geared.mjs`): careful play still wins 100% in 6.7 to 8.9 rounds (inside the band); attack-only now wins 43 to 100%, which is what gear is for.
- `node tools/sim/simulate.mjs --check` (400 battles per row, 127,100 battles): **All targets met.**

### For the Episode 2 author (X2-battle)

1. Write data only. Put `expMul: EXPANSION_FOE_EXP_MUL` (import it) on each new optional group and boss, or leave it off (they then pay x1 anyway; the constant is 1). Edit none of `expcurve.js`, `rules.js`, `encounters.js`.
2. Make `tools/sim/x2.mjs` the way `x1.mjs` is: import `LOADOUTS` from `loadouts.mjs`, register your content, export `SIM_EXTENSION` with the same keys, then add **one import and one entry** to `EXTENSIONS` in `simulate.mjs`.
3. In `x2.mjs` call `registerOptionalSources(2, [...])` (import from `./optional_exp.mjs`; no cycle). A source is `{ id, kind: 'zone', zone, gate, by }` (the zone's `plan` is fought once, boss calls and elites included) or `{ id, kind: 'quest', exp, gate, by }`; `by` is the first checkpoint it can count at (`other_selves` or `nameless_king`). The checkpoints and their "today" EXP exist (`CHECKPOINTS`); `checkOptionalCaps` plays each main boss at the completionist's level once Episode 2 has sources. The Episode 1 carry (3,390 EXP and Lv 14 at the Other Selves, 4,051 and Lv 15 at the King) is already in the Episode 2 rows.
4. Run `node tools/sim/optional_exp.mjs` for the table and `node tools/sim/simulate.mjs --check` for the gate.

## 5. For other agents

- **Maps** (ids): zones `x1_downs`, `x1_highmoor`, `x1_barrow`, `x1_larchhill`, `x1_millrace`, `x1_terrace`, `x1_cellar`, `x1_culvert`; groups as in `X1_GROUP_IDS` (leader = the field sprite, `ENCOUNTERS[id].leader`); boss encounters `barrow_reeve` and `millstone_golem` with flags `barrow_reeve_defeated` and `millstone_golem_defeated`; set `X1_MAPS_LISTED = true` in `src/data/x1/encounters.js` when the maps exist. Shop ids `thornfold_loom` (NPC `tamsin`) and `millrace_stall` (NPC `ferrick`): the shop scene finds the keeper from the NPC's `service: { type: 'shop', id }`, so X1-story's NPC records carry that.
- **Gold (a finding for the orchestrator and X1-integrate).** Plan 8.5 budgeted +2,050 gold for the completionist (bosses 380, quests 500, chests 1,180) and did not count ordinary fight gold. The eighteen new groups pay **992 gold** and the bosses with their calls 420, so the true added gold is about **+3,100**, over the plan's +2,300 cap. Gold is not scaled by `expMul`. Check the completionist autoplay's gold; the plan's remedy (the three gold-tier rolled chests down to wood or iron) is worth about 300, so a gold line may also need the shops' sink (tier 3 gear) or lower group gold. Not changed here: gold is not in this brief's levers.
- **Audio ids** used by the boss encounters: `boss_reeve`, `boss_millstone` (X1-audio).
- **Bestiary text** for `barrow_shade`, `barrow_reeve`, `millstone_golem` is X1-story's (`flavor` in `enemies.js` is the one-line hook).

## 6. Tests

`qa/battle/x1_rewards.test.mjs` (7: constants; every one of the 59 existing encounters byte-identical in units, elites, `encounterExp` and three played-out fights against `qa/battle/x1_baseline_rewards.json`; the main route and EXP table; new groups pay `raw x expMul x elite`, rounded per unit; boss calls inherit; the Hollow unchanged; the per-fight override), `x1_data.test.mjs` (10: ids resolve, enemies, zones unlisted, encounters, items, budgets, set, shops and the price card, the W15 one-action rule for the new foes at their levels, no em dashes), `x1_levels.test.mjs` (5: registry, sim targets for the new zones and bosses, the ledger, no pushover and the check can fire, Episode 2 plug-in). `qa/battle/fuzz.test.mjs` now also plays every x1 encounter. Whole battle area: 170 tests pass (`node qa/run.mjs battle`).
The baseline file is regenerated only by `tools/sim/out/x1_gen_baseline.mjs` against code that predates the mechanism; do not regenerate it from current code.

## W7 fix pass (2026-10-26): the four puzzle-gated weapons

Orchard Axe ATK 21 crit 5 (was 14 / 4), Drover's Bow ATK 17 SPD 1 crit 4 (was 14 / 1 / 3), Chime Staff ATK 5 MAG 15 SPR 4 MP 6 (was 4 / 13 / 3 / 6),
Reeve's Crook ATK 24 DEF 2 crit 4 Fury gain 10 (was 17): the Crook now beats the Winged Lance (22) because the Reeve is a boss behind a puzzle gate.
Each is a quarter or more over its tier 2 shop weapon, under the tier 3 shop weapon (except the Crook), and under Episode 2's ilvl 11 base of its type;
`qa/battle/x1_data.test.mjs` pins all of it. The sim equips none of them, so `simulate --check` and the main route do not move.

