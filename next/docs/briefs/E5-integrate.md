# E5-integrate: one playable Episode 5, then the switch on the branch (wave 5d, after E5-scene-ui, alone)

Read `docs/briefs/COMMON.md`, `DESIGN.md` section 10, `docs/EPISODE5_PLAN.md` sections 0.1 and 10 to 13 (your contract),
`docs/HANDOFF.md` and `AGENTS.md` (the gate list), `docs/PLAYTEST_REVIEW_6.md` (what Episode 4's integration missed), and
every E5 report so far.

## Items, in order

1. **Play it end to end** from an Episode 4 credits save and from `newGameEp5`, with `EP5_LIVE` true in a local copy of
   the switch (or `?pack=ep4,ep5&ep=5`); fix seams (list every touched file; only in files whose owner's brief is closed;
   any core line paid by a trim). If `EP5_MAPS_LISTED` is still false, flip it once the path passes. Record the party's
   real arrival level from the Episode 4 save; if it is Lv 22, tell the orchestrator before tuning anything.
2. **Autoplay**: an Episode 5 segment in `qa/autoplay.py` (`--episode 5`) following plan 12's route, dial and Shove inputs
   from `MAPS_EP5_A.md` and `MAPS_EP5_B.md`, fights on Auto; it must beat the Sand Oracle at Lv 24 with zero game overs,
   desktop and phone, one device at a time, from both starts. The bot notes every prophecy and how it was answered (Turn
   the Sky, Break, landed). Assert the quick start wrote no slot it did not own, and **assert zero "unknown ... id"
   warnings in every run** (PLAYTEST_REVIEW_6 fix 3).
3. **Story timer**: `qa/integrate/story_time.py` on the Episode 5 logs, with shade puzzles counted by decisions (one per
   hour chosen, one per Shove sequence), not clicks. Target 60 to 90 minutes first play, first fight under 5 minutes after
   `ep5_morning`. If over, report the three biggest scenes and the fights to cut; do not cut story on your own.
4. **Shots**: append plan 12's list to `qa/shots.json`; desktop and phone; zero console errors.
5. **Turn on the pending tests** from E5-pack; rerun the order-trap test with ep4 and ep5; the pack-failure landing test;
   the offline check `python qa/pwa/pwa.py --only packoffline` with `?pack=ep4,ep5`.
6. **The full gate list** (plan 12, all green), then flip `EP5_LIVE = true` in `src/game/episodes.js` **on the branch
   only**, last, and rerun `node qa/run.mjs`. Shipping to players is not yours: it stays Scott's or Stephen's word.
7. PROGRESS.md is the orchestrator's: send a paragraph in your report instead.

## Rules

- Owned paths: plan 11.1, row E5-integrate.
- No git (the orchestrator commits and opens the pull request). No em dashes. Bounded commands; one browser job at a
  time; autoplay runs one device at a time.
- Verify: `node qa/run.mjs` (everything); `node qa/run-gate.cjs`; `python qa/shots.py --only <new shots> --device all`;
  `node tools/sim/simulate.mjs --check` (and `--cave`, `--tier 1`); `node qa/pwa/precache.test.mjs` (tap-prompt bytes not
  grown); the autoplay logs; the timer.
- Report under 400 words: both runs (levels, game overs, minutes, prophecies broken), seams fixed with files and bytes,
  shot paths, the timer, the budget numbers, a paragraph for PROGRESS.md.
