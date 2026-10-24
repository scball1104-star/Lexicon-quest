# E3-integrate: one playable Episode 3, then launch (wave 17d, run 10 of 10)

Read `docs/briefs/COMMON.md`, `DESIGN.md` section 10, `docs/EPISODE3_PLAN.md` sections 10 to 12 (your contract),
`docs/HANDOFF.md` (the gate list), and every E3 report so far.

## Items, in order

1. **Play it end to end** from an Episode 2 credits save and from `newGameEp3`, with `EP3_LIVE` set true in a local
   copy of the switch; fix seams (list every touched file; only in files whose owner's brief is closed).
2. **Autoplay**: extend `qa/autoplay.py` to Episode 3 (quench puzzles solved by scripted inputs from E3-maps' reported
   solutions; fights on Auto); it must beat the Cinder Warden at Lv 16 with zero game overs, desktop and phone, from
   both starts. Assert the quick start wrote no slot it did not own.
3. **Story timer**: `qa/integrate/story_time.py` on the Episode 3 logs. Target 60 to 90 minutes first play, first fight
   under 5 minutes after `ep3_morning`. If over, report the three biggest scenes and the fights to cut; do not cut story
   on your own.
4. **Shots** (append to `qa/shots.json`): `field_sand_road_slag`, `field_emberpeak_square`, `field_foundry_f1_quench`,
   `field_foundry_f2_hot_gate`, `field_foundry_f3_dark`, `story_ep3_morning`, `story_vex_furnace`,
   `story_bram_memory_3`, `battle_heat_pips`, `battle_bellows_specter`, `battle_warden_oath`, `story_warden_after`,
   `story_first_bell`, `story_ep3_ending`, `ui_title_ep3`, on desktop and phone.
5. **Turn on the pending save tests** from E3-saves; flip `EP3_LIVE = true` in `src/game/episodes.js` last, after
   everything above is green.
6. PROGRESS.md is the orchestrator's: send a paragraph in your report instead.

## Rules

- Owned paths: `qa/autoplay.py`, `qa/autoplay_grid.mjs`, `qa/integrate/**`, `qa/shots.json` (append only), the
  `EP3_LIVE` line, and seam fixes as above.
- No git (the orchestrator publishes after the full gate list in HANDOFF.md). No em dashes. Bounded commands; one
  browser job at a time; autoplay runs one device at a time.
- Verify: `node qa/run.mjs` (everything); `python qa/shots.py --only <new shots> --device all`, zero console errors;
  `node tools/sim/simulate.mjs --check`; the autoplay logs; the timer.
- Report under 400 words: both runs (levels, game overs, minutes), seams fixed with files, shot paths, the timer
  result, a paragraph for PROGRESS.md.
