# E4-integrate: one playable Episode 4, then the switch on the branch (wave 4d, after E4-scene-ui, alone)

Read `docs/briefs/COMMON.md`, `DESIGN.md` section 10, `docs/EPISODE4_PLAN.md` sections 10 to 13 (your contract),
`docs/HANDOFF.md` and `AGENTS.md` (the gate list), and every E4 report so far.

## Items, in order

1. **Play it end to end** from an Episode 3 credits save and from `newGameEp4`, with `EP4_LIVE` true in a local copy of
   the switch (or `?pack=ep4&ep=4`); fix seams (list every touched file; only in files whose owner's brief is closed;
   any core line paid by a trim). If `EP4_MAPS_LISTED` is still false, flip it once the path passes.
2. **Autoplay**: an Episode 4 segment in `qa/autoplay.py` (`--episode 4`) following plan 12's route, wheel inputs from
   `MAPS_EP4_A.md` and `MAPS_EP4_B.md`, fights on Auto; it must beat the Paper Regent at Lv 20 with zero game overs,
   desktop and phone, one device at a time, from both starts. Assert the quick start wrote no slot it did not own.
3. **Story timer**: `qa/integrate/story_time.py` on the Episode 4 logs. Target 60 to 90 minutes first play, first fight
   under 5 minutes after `ep4_morning`. If over, report the three biggest scenes and the fights to cut; do not cut story
   on your own.
4. **Shots**: append plan 12's list to `qa/shots.json`; desktop and phone; zero console errors.
5. **Turn on the pending tests** from E4-pack; rerun the order-trap test with both packs; the offline check
   `python qa/pwa/pwa.py --only packoffline` with `?pack=ep4`.
6. **The full gate list** (plan 12, all green), then flip `EP4_LIVE = true` in `src/game/episodes.js` **on the branch
   only**, last, and rerun `node qa/run.mjs`. Shipping to players is not yours: it stays Scott's or Stephen's word.
7. PROGRESS.md is the orchestrator's: send a paragraph in your report instead.

## Rules

- Owned paths: plan 11.1, row E4-integrate.
- No git (the orchestrator commits and opens the pull request). No em dashes. Bounded commands; one browser job at a
  time; autoplay runs one device at a time.
- Verify: `node qa/run.mjs` (everything); `node qa/run-gate.cjs`; `python qa/shots.py --only <new shots> --device all`;
  `node tools/sim/simulate.mjs --check` (and `--cave`, `--tier 1`); `node qa/pwa/precache.test.mjs` (tap-prompt bytes
  not grown); the autoplay logs; the timer.
- Report under 400 words: both runs (levels, game overs, minutes), seams fixed with files and bytes, shot paths, the
  timer, the budget numbers, a paragraph for PROGRESS.md.
