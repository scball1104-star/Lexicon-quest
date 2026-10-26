# X1-integrate: one playable expansion, then the switch (X1 wave W6)

Everything exists but nothing is switched on. Read `docs/briefs/COMMON.md`, `DESIGN.md` section 10, `docs/EXPANSION_RECONCILIATION.md` (the decision log), `docs/EXPANSION1_PLAN.md` sections 7, 11.7, 12, 13, 14 and 15 (your contract), `docs/briefs/XP-packs.md`,
`docs/HANDOFF.md` (the gate list) and every X1 report so far. The Episode 2 expansion has not started (it waits for P1b): you are the only integrate agent.

## Items, in order

1. **No data merges.** Registration is by mutation when the `x1` pack loads (`XP-packs.md`); nothing is appended to `enemies.js`, `encounters.js`, `items.js`, `loot-tables.js`, `shops.js`, `npcs.js`, `quests.js`, `text.js` or `story.js`. Check that every `src/data/x1/*` module registers, that `src/data/x1/index.js`
   imports all of them, that every node tool and test imports the index, and re-run the id grep of plan 2 against the repo **and the Episode 2 registry in `docs/EXPANSION2_PLAN.md`**; report collisions.
2. **Play it end to end** with `X1_LIVE` set true in a local copy: from the Episode 1 credits fixture, from a fresh game, from an Archive F2 mid-run save, from an Episode 2 mid-Court save and from `newGameEp3`; walk the three loops, every region and every route of the two wide maps, every quest to its reward
   (and its `give('exp')`), both bosses, every ability-gated chest. Fix seams (list every touched file; only in files whose owner's brief is closed).
3. **EXP check**: every scale is 1.0 and every existing reward is unchanged (the byte-identical test is green); the new groups pay at `expMul` 0.1; quest EXP lands once per quest; `simulate.mjs --check` is "All targets met" with every main-route number unchanged and `checkOptionalCaps()` passing with the margins of plan 7.2.
4. **Autoplay, two routes** (`qa/autoplay.py`, flag-gated; the default route stays byte-identical with the flag off): the **regular route** (the existing bot, unchanged: Echo Warden Lv 6, Archivore Lv 8, end Lv 9, zero game overs) and the **completionist route** (every optional piece in the intended order of plan 7.2: the Barrow and the Reeve at
   Lv 5 to 6, the Cellar, the Culvert and the Golem at Lv 6 to 7, the Echo Warden, the Archivore at Lv 8 or 9, Episode 1's end at Lv 9 or 10, zero game overs on desktop and phone, gold at the end under 5,300 (8.5)); both routes also run from the Episode 1 credits fixture into the new areas. Use the solutions in `docs/maps/X1_*.md`.
5. **Story timer**: `qa/integrate/story_time.py` on the logs. The main path must be within one minute of the baseline log; the expansion's boxes at most 190, none over 12; report the minutes per slice against plan 13 and, if the total is over +125 or under +70 typical,
   say which cut line (plan 16) to apply (all are unused); do not cut on your own.
6. **Fixtures**: `qa/saves/x1_compat.test.mjs`: the fixture saves of plan 12.1 load and play with `X1_LIVE` on and off and with the pack forced to fail once; with it off, resolved maps, NPC talk, shops, quests, journal and every encounter's rewards are deep-equal to the baseline for a matrix of Episode 1, 2 and 3 flag states;
   every previously reachable save position stays standable.
7. **Load budget**: `node --test qa/pwa/precache.test.mjs` shows the initial download at most 6.38 MB (raise the ratchet in `qa/pwa/budget_ratchet.json` to exactly that and no more; the 6.5 MB cap is untouched), the tap prompt at most 2.32 MB, the `x1` pack at most 1.0 MB wire, no `x1` file in `sw.js`, an offline replay after one pack load.
8. **Shots** (append to `qa/shots.json`): the fifteen of plan 15 (including `field_highmoor_tower` and `field_larchhill_windmill`), desktop and phone, zero console errors; the phone shots show the revealed bridge, the pressed plate and the turning wheel clearly.
9. **Turn on the switch last**: with everything green, set `X1_LIVE = true` (and `X1_REGIONS` all true; Scott chose to build everything) in `src/data/x1/live.js` and `X1_MAPS_LISTED` if the hub left it, rerun the full gate list of HANDOFF.md, and report. The orchestrator publishes (P1) and writes PROGRESS.md, so send a
   plain-language paragraph in your report instead (what a player now sees, how much longer it is).

## Rules

- Owned paths: the flip in `src/data/x1/live.js` and the ratchet file, `qa/autoplay.py`, `qa/autoplay_grid.mjs`, `qa/integrate/**`, `qa/saves/x1_*`, `qa/shots.json` (append only), and seam fixes as above.
- No git (the orchestrator publishes after the gate list). No em dashes. Bounded commands; one browser job at a time; autoplay runs one device at a time.
- Verify: `node qa/run.mjs` (everything); `python qa/shots.py --only <new shots> --device all`; `node tools/sim/simulate.mjs --check`; the autoplay logs; the timer.
- Report under 400 words: every file touched, the runs on both routes (levels at each boss, game overs, minutes, gold), the timer table against plan 13, the budget line, seams fixed, shot paths, collisions found, a paragraph for PROGRESS.md.
