# H7-hard-road: one post-credits tier, the character carried

You are **H7-hard-road**. You build the difficulty tier proposed in `docs/HARD_ROAD.md` (H3-vows, 2026-10-27), which
Scott approved on 2026-10-27 with these answers, verbatim: "1. Default, carry the character into the tier. 2. Default
3. let's keeping trying to come up with a better name." So: the character is carried (levels, EXP, mastery, gear, bag,
gold, the Ledger, the vows kept; story flags reset; Mira and Bram wait in `reserve` until their join scenes), ONE tier,
and the name is not settled: build it under the working id `tier_1` with every player-facing string in one place
(`src/data/text.js` TIER), so the name is one edit when Scott picks it. Scott's original words are in
`docs/RESPONSIBILITY_ARC.md` section 7 C.

## Read, in this order
1. `docs/briefs/COMMON.md`, `DESIGN.md` sections 2, 7 and 10, `docs/HARD_ROAD.md` in full (the levers table is the
   build list; every Fact there was read from the code on 10/26, re-read it), `docs/RESPONSIBILITY_ARC.md` 7 C.
2. The code the levers name: `src/battle/rules.js makeEnemyUnit` (the multiplier seam), `src/data/expcurve.js scaleExp`,
   `src/data/loot-tables.js` (`ZONE_LOOT`, `RARITY_TABLES`, `tierFor`), `src/battle/loot.js rollBase` / `rollItem`
   (legendary today becomes rare: the tier turns that off), `src/data/shops.js` (`ifFlag` rows), `src/scenes/title.js`
   (the "Episode 2: new party" row on `ep1_complete`: the tier row follows it), `src/core/save.js` (slots, the Episode 3
   runs' own slot), `src/game/state.js` (`reserve`, `createGame`), `src/game/episodes.js`, `tools/sim/simulate.mjs`
   (`runSuite`, `checkTargets`, `checkEconomy`), `qa/autoplay.py` (how a route starts from a save).
3. The Deep Stacks must not change: `src/data/cave/**` is not yours, and a cave battle ignores the tier (the Stacks
   have their own curve; `scale(floor)` wins). Vows unchanged.

## Owned paths
`src/game/tier.js` (new: `tierOf(game)`, `TIER_TABLE`, the carry function), the one-line reads of it at the five levers
(rules.js, expcurve.js, loot-tables.js or loot.js, shops.js data rows, title.js), `src/data/text.js` TIER strings,
`src/data/shops.js` new `tier_1` rows only, `tools/sim/simulate.mjs --tier 1`, `qa/autoplay.py --tier 1` (the Episode 1
route from a carried record), `qa/tier/**` (new tests), `docs/HARD_ROAD.md` (append "Built"), `docs/TIER.md` (new, the
player-facing rules). Every edit outside `tier.js` and `qa/tier` is one guarded line; list each in the report.

## The build (HARD_ROAD's defaults, now decisions)
1. **Unlock and start.** A title row under Continue once any slot holds the latest live episode's complete flag
   (`ep2_complete` today; `ep3_complete` when Episode 3 ships). It asks which completed record to carry, writes the run to
   its own slot, sets `game.tier = 1` and the flag `tier_1`, resets story flags, parks Mira and Bram in `reserve`, and
   starts Episode 1 from the top (the cold open plays again; `cold_open_done` resets with the rest).
2. **Foes.** HP x1.6, ATK and MAG x1.35, SPD +1 at `makeEnemyUnit` when `tierOf(game) === 1`; bosses too. Never in a
   cave battle.
3. **EXP.** x1.5 in `scaleExp`'s product.
4. **Loot.** Zone item level +6, capped at 16; the tier rarity table (normal 50/35/15, elites rare 60 / legendary 5, bosses
   rare 85 / legendary 15); legendaries roll as legendaries on the tier (the twelve placed ones become rollable; add six
   made for the tier with fixed affix sets and lore in the game's voice).
5. **Shops.** `tier_1` rows: tier 4 to 6 bases in Willowmere and the Hollow at tier prices.
6. **Proof.** `node tools/sim/simulate.mjs --tier 1 --check` at the carried party's level (the sim's Episode 2 finish
   state): 3 to 5 rounds normal, 8 to 12 bosses, `checkEconomy` green with the higher EXP and gold; `--check` without the
   flag unchanged. The bot: `python qa/autoplay.py --tier 1` clears Episode 1 from a carried record on desktop and phone.
7. **Bytes.** Core code: measure the gzipped delta; the tap-prompt ratchet has 771 B of room (`qa/pwa/budget_ratchet.json`),
   so put the tier's tables and strings behind a lazy import on the title row (the pack pattern), not in the shell.

## Name
Working title in the strings: "Hard Road". Scott wants a better one; do not spend time on it, but if a name comes to
you from the game's own words (bells, names, pages, readings, tolls), put it in the report under "names".

## Verify before you report
`node qa/run.mjs battle saves ui core pwa` green; both sims green; both bot runs clean; `qa/tier` proves the unlock row,
the carry (levels and gear kept, flags reset, reserve), every lever's number on the tier and off it, and that a cave battle
ignores the tier; no em dash; every command bounded.

## Report (last message, under 450 words)
What a player sees (the row, the ask, the first fight); the five levers with their numbers; the sim tables on and off the
tier; the bot's numbers; bytes; every line outside your paths; names, if any; what is left for Scott.
