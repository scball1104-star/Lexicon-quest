# C3-sim-bot: the Deep Stacks balance proof and the bot descent

You are **C3-sim-bot**, wave C3 of the Deep Stacks (`docs/DEEP_STACKS_PLAN.md` sections 2.4, 5, 6, 11, 12). You
own the balance now: the simulated descent with death-rate targets per band, the bot route that descends from the
library, and the tuning of `foes.js` and `loot.js` until both pass. A read-only critic (H6-critic) runs beside you
on the base game; it writes nothing you touch. Stay in your owned paths.

## Read, in this order
1. `docs/briefs/COMMON.md`, `DESIGN.md` section 7, `docs/DEEP_STACKS_PLAN.md` section 11 (your targets are there).
2. `PLAN.md` Wave C: every C1 and C2 report's notes, especially C2-world's `LQ_DEBUG` surface
   (`caveBegin`, `caveEnd`, `caveResume`, `caveDescend`, `caveStairs`, `caveChests`, `caveWipe`, `caveArt`,
   `state().cave`) and C1-data's curve numbers (`qa/cave/out/cave_sanity.md`).
3. `tools/sim/simulate.mjs` (`runBattle`, `runSet`, `runSuite`, `--check`, the route and economy checks),
   `src/data/cave/foes.js` (`BANDS`, `scale`, `encounterFor`, `floorEncounters`, `BINDER`), `loot.js`,
   `items.js` (`wornProps`), `src/game/cave.js`, `src/data/cave/world.js`, `src/data/cave/gen.js`
   (`generateFloor`, `walkModel`, `foeCount`).
4. `qa/autoplay.py` end to end (the grid helper `qa/autoplay_grid.mjs`, `settle`, `handle`, how a route marks
   progress and reports), `qa/cave/world_headless.py` (how C2-world drove a descent).
5. C2-sprites-boss's handoff in `PLAN.md`: `BINDER` needs `sprite.frame: 'binder'` and phase sprites
   `binder_loose`, `binder_binding` (you own `foes.js`, so you set them; confirm the battle scene swaps them).

## Owned paths (create or modify nothing else)
`tools/sim/cave.mjs` (new) and the `--cave` switch in `tools/sim/simulate.mjs` (its one import and dispatch),
`qa/autoplay.py` (a `--cave N` route and `--cave-resume`, nothing else in the file changes), `qa/autoplay_grid.mjs`
only if generated floors need a flag, `src/data/cave/foes.js`, `src/data/cave/loot.js`, `qa/cave/sim_*.test.mjs`,
`qa/cave/bot_*`, `qa/cave/out/sim_*`, `qa/cave/out/bot_*`, `docs/DEEP_STACKS_BALANCE.md` (new).
Not owned: the generator, `items.js`, `cave.js`, `world.js`, story, maps, art, every shared file.

## Deliverables
1. **`node tools/sim/simulate.mjs --cave`** (`tools/sim/cave.mjs`): a scripted descent from B1 on 50 seeds: the
   party at level 1 with nothing worn; per floor, `foeCount(floor)` encounters from `floorEncounters(seed, floor)`
   with the scale applied; EXP and levels by the real curve; drops and red chests by `loot.js` rolls; equip the
   best item per slot by a simple score; heal between floors only by what consumables the run has (no rests); a
   wipe ends the seed. Prints per band: level on arrival, deaths, rounds per fight, HP lost, Bookmark floors, blue
   floors; fails (`--check`) when a band's death rate for the competent policy is outside the plan's targets
   (B1 to B9 under 5%, B10 to B29 under 15%, B30 to B59 under 30%, B60 to B99 under 45%) or when the arrival
   level drifts more than 4 from the plan's (12 at B10, 25 at B30, 40 at B60, 55 at B90). Also the Binder at
   the B99 arrival level: careful play wins at least 80% within 20 rounds.
2. **Tune** `foes.js` (`scale`, pools, `expMul`) and `loot.js` (item level, rarity, consumables, Bookmark chance)
   until `--cave --check` passes with margin. Write every change and the before and after numbers in
   `docs/DEEP_STACKS_BALANCE.md`. The base game's sim (`--check` without `--cave`) must stay "All targets met".
3. **`python qa/autoplay.py --cave 30`** (default 30; `--seeds 10`): from a game with `ep1_complete` (via
   `LQ_DEBUG.newGame` with the flags the bot already uses for Episode 2), `?cave=1`, walk to the library trapdoor,
   through Hollis's offer, descend to floor N with the real walk model (the stairs room, chests on the way when
   cheap, fights by the generic battle handler), bank with a Bookmark when one is held at or after floor N, else
   keep going to the next landing; then re-enter and reach B5 with a vault unique worn; report floors, fights,
   wipes, time per floor, zero softlocks, zero console errors. `--cave-resume`: suspend at B7, reload the title's
   resume row, land on B7. Ten seeds on desktop, three on phone, logs under `qa/cave/out/bot_*`.
4. **The Binder's sprites** in `foes.js` per the handoff; prove the phase swap in one headless battle via
   `LQ_DEBUG.caveArt` or the battle scene's debug (one screenshot per phase).
5. **Tests** (`qa/cave/sim_*.test.mjs`): the sim is deterministic per seed; the check's targets are the plan's; a
   tuned curve is monotone; the Bookmark chance table; one short `--cave` run (5 seeds, 20 floors) inside the test
   time budget.

## Verify before you report
`node tools/sim/simulate.mjs --cave --check` and `node tools/sim/simulate.mjs --check` both green; the bot runs
above; `node qa/run.mjs cave battle` green (an `arc` or critic file is not yours); no em dash; bound every command;
the pack stays under its cap (`node qa/run.mjs pwa`).

## Report (last message, under 450 words)
The death-rate and level tables per band before and after tuning, every table you changed, the bot's numbers
(floors, fights, wipes, minutes per floor, seeds), the Binder phase proof paths, log paths, known gaps, and what
C3-critic should look at first.
