# X2-integrate: one playable expansion, two routes, the gates (X2 wave XE)

Read `docs/briefs/COMMON.md`, `DESIGN.md` section 10, `docs/EXPANSION_RECONCILIATION.md`, `docs/EXPANSION2_PLAN.md` sections 9.6, 13 and 15 to 18, `docs/briefs/XP-packs.md`, `docs/HANDOFF.md` (the gate list) and every X2 report so far. The Episode 1 expansion is already published; you are the only integrate agent running.

## Items, in order

1. **Check the pack and the seams** (plan 17.2) are in and that nothing outside the owned paths of the other briefs was edited; there are no data merges (registration is by mutation); flip `X2_MAPS_LISTED` only after the maps are green; confirm every node tool imports `src/data/x2/index.js`; re-run the id grep against Episode 1's registry (no `barrow_shade`, `bw_*` or `x1_` collision).
2. **Play it** from an Episode 2 credits save and from `newGameEp2`: walk every new area, finish all six quests, fight the four bosses, with the pack loaded and with it forced to fail once. Fix seams in files whose owner's brief is closed (list every touched file).
3. **The critical-path test** `qa/integrate/x2_critical_path`: Valley to the Episode 2 credits with no optional step from an Episode 1 save and from `newGameEp2`; compare the scene order and reachable marks to the pre-X2 golden.
4. **Autoplay** `qa/autoplay_x2.py` with two routes: the **regular route** (the existing bot from `newGameEp2`, unchanged: zero game overs, today's levels) and the **completionist** route (scripted inputs from the maps' reported solutions for every optional leg, fights on Auto): beats the King at Lv 13 or 14 with zero game overs. Desktop and phone, one device at a time.
   Assert the ledger caps of plan 9.6 at the Other Selves and the King, and that every existing reward and level on the main route is unchanged.
5. **The secrets walk** `qa/integrate/x2_secrets`: every secret of plan 6 triggered with its verb, each tell visible in a shot.
6. **Story timer and playtime**: `qa/integrate/story_time.py` on the optional legs plus the autoplay clock. Target 150 to 210 minutes added for the complete run; above 210, report the three biggest pieces (plan 16 holds the cut lines, unused; do not take one without Scott).
7. **Load budget and shots**: `node --test qa/pwa/precache.test.mjs` shows the initial download at most 6.45 MB (raise the ratchet in `qa/pwa/budget_ratchet.json` to exactly that and no more; cap 6.5 MB untouched), the tap prompt at most 2.32 MB, the `x2` pack at most 0.8 MB wire, no `x2` file in `sw.js`; shots (append to `qa/shots_x2.json`, one seam line in the shots runner): the fourteen
   names of plan 18.8, desktop and phone, zero console errors.
8. **Turn on the switch last**: set `X2_LIVE = true` in `src/data/x2/live.js`, rerun the full gate list of HANDOFF.md, and report. The orchestrator publishes (P2).
9. Write a paragraph for PROGRESS.md in your report (the orchestrator's file).

## Rules

- Owned paths: `qa/autoplay_x2.py`, `qa/integrate/x2_*`, `qa/shots_x2.json`, the flip in `src/data/x2/live.js`, the `X2_MAPS_LISTED` line, the ratchet file, and seam fixes as above.
- No git (the orchestrator publishes after the full gate list). No em dashes. Bounded commands; one browser job at a time.
- Verify: `node qa/run.mjs` (everything); `node tools/sim/simulate.mjs --check`; `python qa/shots.py` on the new shots; the autoplay logs.
- Report under 400 words: both routes (levels at each entry, game overs, minutes), seams fixed with files, shot paths, the budget line, the timer result, the PROGRESS.md paragraph.
