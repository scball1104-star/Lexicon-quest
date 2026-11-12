# E8-integrate: the bot, the timer, the shots, the post-game walk, and the switch (wave 8d, after E8-scene-ui, alone)

Prove Episode 8 plays from both starts to the end title and on into the post-game, then flip `EP8_LIVE` on the branch.

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md` section 10, plan `docs/EPISODE8_PLAN.md` sections 0 ("Done
means"), 10 and 12 (your contract: the full gate list), every Episode 8 agent's report, `docs/MAPS_EP8_A.md` and
`MAPS_EP8_B.md` (book solutions, fonts' cells), `docs/story/STAGING_EP8.md`, the built Episode 7 integrate files
(`qa/integrate/ep7_*`, its `qa/autoplay.py` segment, `qa/realplay/ep7field.py`) as your models, `qa/integrate/story_time.py`.

## Owned paths

`qa/autoplay.py` (an Episode 8 segment), `qa/autoplay_grid.mjs`, `qa/integrate/ep8_*`, `qa/integrate/story_time.py` (Episode 8
input and the book weighting), `qa/shots.json` (append only, LF), `qa/realplay/ep8field.py` and its entry in `qa/realplay/run.py`,
the `EP8_LIVE` line in `src/game/episodes.js`, seam fixes in files whose owner's brief is closed (name each).

## Outputs (items, in order)

1. **Record the real arrival:** from an Episode 7 credits save, the level, EXP and gold at `ep8_morning`; if they differ from
   `EP8_START` (Lv 31, 22,200, 4,300) by more than 300 EXP or 500 gold, report it for E8-battle's re-tune before going on.
2. **The autoplay route** of plan 12, from an Episode 7 credits save and from `newGameEp8`, desktop and phone, one device at a
   time: both CHOOSE routes and **both endings** in separate runs; the bell walk; the credits; the wake; **the post-game walk**
   (the Kestrel, the Stair, `lexicon_door`, the Deep Stacks' first floor, save and reload, no ending scene again). Zero game
   overs, zero "unknown ... id" warnings, the quick start's slot read back from localStorage.
3. **`qa/realplay/ep8field.py`**: plan 12's book run with real keys and one tap; a held direction across every read.
4. **The story timer** (books by decisions): 70 to 100 minutes first play, credits excluded; first fight under 5 minutes; every
   main scene inside its budget; 16 decisions or fewer. Over 105: take Cut 1 (plan 14) with the orchestrator and re-time before
   anyone is asked about story.
5. **The shots** of plan 12 appended to `qa/shots.json` (LF, zero CR bytes), run with `python qa/shots.py`, zero console errors,
   every image **viewed**.
6. **The saves** of plan 10.9 that were pending, turned on; the ended-save cases above all.
7. **The budget:** `qa/pwa/precache.test.mjs`, the tap-prompt bytes against E8-pack's measure, `pwa.py --only packoffline` with
   `?pack=ep7,ep8`.
8. **The full gate list** of plan 12, every line, with its result. Then flip `EP8_LIVE = true` **on the branch only**.

## Done when

Every line of plan 12 passes and is reported with its number; `EP8_LIVE` is true on the build branch; nothing is shipped.

## Tests to run

The whole of plan 12: `node qa/run.mjs`, `node qa/run-gate.cjs`, `node tools/sim/simulate.mjs --check` (and `--cave`, `--tier
1`), `node tools/maps/mapcheck.mjs check`, `python qa/autoplay.py --episode 8` (and `--all-fights`), `python
qa/realplay/run.py` (local), `python qa/shots.py`, `python qa/integrate/story_time.py`, the pwa checks.

## Traps

- **You run alone.** You touch seam files of closed briefs; name every such fix in the report.
- **Shipping is not yours.** `EP8_LIVE` flips on the branch; `overhaul:main` stays Scott's or Stephen's explicit word.
- **The bot rests** at each floor's fountain on arrival and before the Sentry (PLAYTEST_REVIEW_8 item 9).
- **The permanent choice:** each ending needs its own run from a save before `last_choice`; never let one run's fixture leak into
  the other.
- **Flaky timeouts:** rerun `x1_gate`, `x1_wild`, `walks`, `abilities_walks`, `qa/battle/sim.test.mjs` alone first.
- **`qa/world/out`** restored, never committed; `next/qa/cave/out` files added only by name (the orchestrator does git).
- **Timing on headless Chromium needs `fieldlab.GPU_ARGS`.**
- House rules: no git; LF endings; no em dashes; bound every command; one browser job at a time.

## Report (under 400 words)

The arrival numbers, each run's result (level at the Eraser, game overs, warnings, time, both endings), the timer's number and
decisions, the gate list line by line, the seam fixes you made, the shots viewed, and the state of `EP8_LIVE`.
