# E6-integrate: one playable Episode 6, then the switch on the branch (wave 6d, after E6-scene-ui, alone)

## Inputs (read first, in this order)

The repo's `AGENTS.md` (the gate list and the traps), `docs/briefs/COMMON.md`, `DESIGN.md` section 10,
`docs/EPISODE6_PLAN.md` sections 0.1 and 10 to 13 (your contract), `docs/HANDOFF.md`, `docs/PLAYTEST_REVIEW_7.md` (what
Episode 5's integration missed), `docs/BATTLE.md` 13.7 (the `--all-fights` fix), `qa/integrate/ep5_shots.py` and
`ep5_integrate.test.mjs` (your models), and every E6 report so far.

## Owned paths

`qa/autoplay.py` (an Episode 6 segment), `qa/autoplay_grid.mjs`, `qa/integrate/ep6_*`, `qa/integrate/story_time.py`
(Episode 6 input and the lane weighting), `qa/shots.json` (append only, LF), `qa/realplay/ep6field.py` and its entry in
`qa/realplay/run.py`, the `EP6_LIVE` line in `src/game/episodes.js`, seam fixes in files whose owner's brief is closed
(list every one).

## Outputs (items, in order)

1. **Play it end to end** from an Episode 5 credits save and from `newGameEp6`, with `EP6_LIVE` true in a local copy of the
   switch (or `?pack=ep5,ep6&ep=6`); fix seams (list every touched file; only in files whose owner's brief is closed; any
   core line paid by a trim). If `EP6_MAPS_LISTED` is still false, flip it once the path passes. Record the party's real
   arrival level from the Episode 5 save; if it is Lv 26, tell the orchestrator before anyone tunes anything.
2. **Autoplay**: an Episode 6 segment in `qa/autoplay.py` (`--episode 6`) following plan 12's route, vane and ride inputs
   from `MAPS_EP6_A.md` and `MAPS_EP6_B.md`, fights on Auto; it must beat the Storm Scribe at Lv 27 with zero game overs,
   desktop and phone, one device at a time, from both starts. The bot notes every rewrite and how it was answered (Anchor,
   Break, landed). Assert the quick start wrote no slot it did not own, and **assert zero "unknown ... id" warnings in every
   run** (PLAYTEST_REVIEW_6 fix 3). Run once with `--all-fights` (each placed foe hunted once; foes revived by a reload are
   not hunted again) and report that level too.
3. **Real input in the field**: `qa/realplay/ep6field.py` rides the Airstair's lane A with real keys, the direction held
   through the ride, and asserts exactly one landing cell and no extra step after the unlock; then one ride by a touch tap.
   Rerun E6-scene-ui's `qa/realplay/ep6battle.py` (Anchor by keys and by tap).
4. **Story timer**: `qa/integrate/story_time.py` on the Episode 6 logs, with lane puzzles counted by decisions (one per vane
   toggled, one per ride chosen), not steps. Target 60 to 90 minutes first play, first fight under 5 minutes after
   `ep6_morning`. If over, report the three biggest scenes and the fights to cut; do not cut story on your own.
5. **Shots**: append plan 12's list to `qa/shots.json` (write it with `qa/integrate/ep6_shots.py`, LF only; count the file's
   CR bytes before and after: zero); desktop and phone; zero console errors.
6. **Turn on the pending tests** from E6-pack; rerun the order-trap test with ep5 and ep6; the pack-failure landing test;
   the offline check `python qa/pwa/pwa.py --only packoffline` with `?pack=ep5,ep6`.
7. **The full gate list** (plan 12, all green), then flip `EP6_LIVE = true` in `src/game/episodes.js` **on the branch only**,
   last, and rerun `node qa/run.mjs`. Shipping to players is not yours: it stays Scott's or Stephen's word.
8. PROGRESS.md is the orchestrator's: send a paragraph in your report instead.

## Done when

Both autoplay runs reach the Cloudhouse Inn after the credits with zero game overs and zero unknown-id warnings, both
realplay files pass, the timer is in band, the full gate list is green, and `EP6_LIVE` is true on the branch.

## Tests to run

`node qa/run.mjs` (everything); `node qa/run-gate.cjs`; `python qa/shots.py --only <new shots> --device all`; `node
tools/sim/simulate.mjs --check` (and `--cave`, `--tier 1`); `node qa/pwa/precache.test.mjs` (tap-prompt bytes not grown);
`python qa/realplay/run.py` (local only, under 10 minutes); the autoplay logs; the timer.

## Traps

- **Menu-path bugs are invisible to bots** (`LQ_DEBUG.battleAct` closes the menu itself): the realplay casts are part of the
  gate, not extras.
- **Reload-revived floor foes make bot levels look easy**: report the `--all-fights` level separately and never tune from a
  run that hunted revived foes.
- **Shot generators can rewrite `qa/shots.json` with CRLF** (Episode 4's `ep4_shots.py` did): write LF and count CR bytes.
- **`assets/ep6_manifest.json` is generated**; remind the orchestrator to `git add` it.
- **The switch flips last**, on the branch, after the whole gate list. `next/sw.js` is regenerated only by
  `build_pwa.py` from this LF worktree.
- Run alone: you touch seam files of closed briefs. One browser job at a time; autoplay one device at a time.
- House rules: no git (the orchestrator commits and opens the pull request); LF endings; no em dashes; bound every command;
  rerun a flaky timeout alone (`x1_gate`, `x1_wild`, `walks`, `abilities_walks`, `qa/battle/sim.test.mjs`).

## Report (under 400 words)

Both runs (levels, game overs, minutes, rewrites broken), the `--all-fights` level, the realplay results, seams fixed with
files and bytes, shot paths, the timer, the budget numbers, a paragraph for PROGRESS.md.
