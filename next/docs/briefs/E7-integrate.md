# E7-integrate: one playable Episode 7, then the switch on the branch (wave 7d, after E7-scene-ui, alone)

## Inputs (read first, in this order)

The repo's `AGENTS.md` (the gate list and the traps), `docs/briefs/COMMON.md`, `DESIGN.md` section 10,
`docs/EPISODE7_PLAN.md` sections 0.1, 4.10 and 10 to 13 (your contract), `docs/HANDOFF.md`, `docs/PLAYTEST_REVIEW_8.md`
(what Episode 6's integration missed: the pacing, the one-way lift, the gold, the level, the bot that never rested),
`docs/BATTLE.md` 13.7 (the `--all-fights` fix), `qa/integrate/ep6_shots.py` and `ep6_integrate.test.mjs` (your models),
and every E7 report so far.

## Owned paths

`qa/autoplay.py` (an Episode 7 segment), `qa/autoplay_grid.mjs`, `qa/integrate/ep7_*`, `qa/integrate/story_time.py`
(Episode 7 input and the stone weighting), `qa/shots.json` (append only, LF), `qa/realplay/ep7field.py` and its entry in
`qa/realplay/run.py`, the `EP7_LIVE` line in `src/game/episodes.js`, seam fixes in files whose owner's brief is closed
(list every one).

## Outputs (items, in order)

1. **Play it end to end** from an Episode 6 credits save and from `newGameEp7`, with `EP7_LIVE` true in a local copy of the
   switch (or `?pack=ep6,ep7&ep=7`); fix seams (list every touched file; only in files whose owner's brief is closed; any
   core line paid by a trim). If `EP7_MAPS_LISTED` is still false, flip it once the path passes. **Record the party's real
   arrival level and gold** from the Episode 6 save; if it is Lv 29, or the gold is far from `EP7_START.gold` (4,000), tell
   the orchestrator before anyone tunes anything.
2. **Autoplay**: an Episode 7 segment in `qa/autoplay.py` (`--episode 7`) following plan 12's route, stone reads and steps
   from `MAPS_EP7_A.md` and `MAPS_EP7_B.md`, fights on Auto; it must beat the White Phantom at Lv 30 with zero game overs,
   desktop and phone, one device at a time, from both starts. **The bot rests at every floor's font on arrival and at
   `font_v2b`** (PLAYTEST_REVIEW_8 item 9). The bot notes every Farewell and Borrowed Light and how it was answered (Call,
   Break, landed) and every Stilled ally Called back. Assert the quick start wrote no slot it did not own, and **assert zero
   "unknown ... id" warnings in every run** (PLAYTEST_REVIEW_6 fix 3). Run once with `--all-fights` (each placed foe hunted
   once; foes revived by a reload are not hunted again) and report that level, and the gold at Palehaven and before F3
   against plan 7.6.
3. **Real input in the field**: `qa/realplay/ep7field.py` reads `ns_asta` with real keys, walks the path with the direction
   held, reads `ns_bo` and `ns_nyx` and asserts Asta's path fades only once the party is off it; tries a read that would fade
   the party's own cell and asserts the refusal and that nothing changed; one read by a touch tap; a held direction neither
   drops nor adds a step across a read. Rerun E7-scene-ui's `qa/realplay/ep7battle.py` (Call by keys, by tap, on a Stilled
   ally).
4. **Story timer**: `qa/integrate/story_time.py` on the Episode 7 logs, with stones counted by decisions (one per read, a
   re-read counting), not steps. Target 60 to 90 minutes first play, first fight under 5 minutes after `ep7_morning`, the
   main path at 16 decisions or fewer. If the top is over 95, report the three biggest scenes and the fights, and the
   orchestrator takes Cut 1 (plan 14) before asking about story; do not cut story on your own.
5. **Shots**: append plan 12's list to `qa/shots.json` (write it with `qa/integrate/ep7_shots.py`, LF only; count the file's
   CR bytes before and after: zero); desktop and phone; zero console errors.
6. **Turn on the pending tests** from E7-pack; rerun the order-trap test with ep6 and ep7; the pack-failure landing test;
   the offline check `python qa/pwa/pwa.py --only packoffline` with `?pack=ep6,ep7`; the cold and warm pack-chain timings on
   the phone profile with `fieldlab.GPU_ARGS` (AGENTS.md: without them a slow-phone entry reads about 40% slow).
7. **The full gate list** (plan 12, all green), then flip `EP7_LIVE = true` in `src/game/episodes.js` **on the branch only**,
   last, and rerun `node qa/run.mjs`. Shipping to players is not yours: it stays Scott's or Stephen's word.
8. PROGRESS.md is the orchestrator's: send a paragraph in your report instead.

## Done when

Both autoplay runs reach the Thawlight Lodge after the credits with zero game overs and zero unknown-id warnings, both
realplay files pass, the timer is in band with the decision count at or under 16, the full gate list is green, and
`EP7_LIVE` is true on the branch.

## Tests to run

`node qa/run.mjs` (everything); `node qa/run-gate.cjs`; `python qa/shots.py --only <new shots> --device all`; `node
tools/sim/simulate.mjs --check` (and `--cave`, `--tier 1`); `node qa/pwa/precache.test.mjs` (tap-prompt bytes not grown);
`python qa/realplay/run.py` (local only, under 10 minutes); the autoplay logs; the timer.

## Traps

- **Menu-path bugs are invisible to bots** (`LQ_DEBUG.battleAct` closes the menu itself): the realplay casts are part of the
  gate, not extras.
- **Reload-revived floor foes make bot levels look easy**: report the `--all-fights` level separately and never tune from a
  run that hunted revived foes.
- **A bot that never rests overspends Ethers** and makes the MP risk look worse than it is (PLAYTEST_REVIEW_8 item 9).
- **Shot generators can rewrite `qa/shots.json` with CRLF** (Episode 4's `ep4_shots.py` did): write LF and count CR bytes.
- **`assets/ep7_manifest.json` is generated**; remind the orchestrator to `git add` it.
- **The switch flips last**, on the branch, after the whole gate list. `next/sw.js` is regenerated only by
  `build_pwa.py` from this LF worktree.
- Run alone: you touch seam files of closed briefs. One browser job at a time; autoplay one device at a time.
- House rules: no git (the orchestrator commits and opens the pull request); LF endings; no em dashes; bound every command;
  rerun a flaky timeout alone (`x1_gate`, `x1_wild`, `walks`, `abilities_walks`, `qa/battle/sim.test.mjs`).

## Report (under 400 words)

Both runs (levels, gold, game overs, minutes, Farewells broken), the `--all-fights` level, the realplay results, seams fixed
with files and bytes, shot paths, the timer and the decision count, the budget and pack-chain numbers, a paragraph for
PROGRESS.md.
