# E5-fixes: the Episode 5 fix pass (from CRITIQUE_7 and PLAYTEST_REVIEW_7)

Written by the orchestrator, Monday 2026-11-09. Two agents run at once with DISJOINT paths: **A** (battle and play) and
**B** (field art and maps). Read `D:\LexiconQuest\AGENTS.md`, `docs/briefs/COMMON.md`, `docs/CRITIQUE_7.md`,
`docs/PLAYTEST_REVIEW_7.md` (both in full: each item names its file and its smallest fix), `docs/EPISODE5_PLAN.md` sections
6 and 12, and the docs of the files you touch (`docs/BATTLE.md` 13, `docs/WORLD_EP5.md`, `docs/MAPS_EP5_A.md`, `_B.md`).

House rules: never run git; no em dashes; keep every edited file's line endings (count CRLF before, write back the same);
`EP5_LIVE` stays on; Episodes 1 to 4 unchanged in meaning; bound every command; look at your own output (phone 844x390 and
375x812, desktop). Report under 400 words: each item's outcome (fixed / partly / not, with why), tests with counts, files
touched (exact list), shots to view.

## A: battle and play (owned paths)

`src/battle/scene/menu.js` (core, item A1 only), `src/data/ep5/{ai,sky,scene,story,quests,skills}.js`, `qa/battlescene/**`,
`qa/realplay/**`, `qa/battle/ep5_*`, `qa/content/ep5_*`, `qa/autoplay.py`, `tools/sim/ep5.mjs`, `docs/BATTLE.md`.

- **A1 (BLOCKER).** Turn the Sky cannot be cast from the menu: `menu.js` `startTarget` returns false for `info.mode === 'none'`,
  so confirm buzzes. Make a `none`-target PARTY skill confirm straight to its action (keys and touch). Prefer the smallest core
  change; pay its gz bytes with a comment trim in core JS so the tap-prompt load does not grow (report before/after from
  `LQ_RELEASE=1 node qa/run.mjs pwa`). Add a scene test that casts Turn the Sky THROUGH the menu (not `LQ_DEBUG.battleAct`),
  and one real-input cast in `qa/realplay` (real keys and a touch tap). Check every other `none`-target party skill in every
  episode the same way.
- **A2 (major).** The reading can leave Mira no turn: read a star only at exactly 3 actions out; hold the Turn marker past
  Mira's turn if she has not acted; show "Mira can turn the sky." only when she can act before it lands. Re-run
  `simulate.mjs --check` and report the Oracle numbers.
- **A3 (major, CRITIQUE item 2).** The Day battle grade is the night painting brightened (moon and stars stay up). In
  `scene.js` `paintSky` (or the Day grade), hide the moon and stars by Day and warm the sky. Check every ep5 stage.
- **A4 (major, CRITIQUE item 3).** The False Futures stand on the party's side; Fear's rows sit over the hero. Put them in
  front-row foe slots by the Oracle with their rows under their own feet; add them to the row test.
- **A5.** Turn the Sky gets a menu icon (CRITIQUE item 10, the menu half).
- **A6 (story).** Trim `vex_gallery` to 12 boxes (PLAYTEST item 8; cut, do not rewrite: lines in the bible are final voice);
  the restored chart in three stages with the seal at step 4 (CRITIQUE item 8: you wire the calls in `story.js`; agent B builds
  the page modes in `pages.js`, named `restored_1`, `restored_2`, `restored_3`; guard on `PAGE_KINDS` so it works before B lands);
  Vex's staging in `story.js` (CRITIQUE item 9: opaque, kneeling, party two rows below; B moves the marks in the map).
- **A7.** Talk lines: one road line about fighting sun-things at dusk; Valewyn morning Talk names only the Episode 5 step
  and Mira (PLAYTEST items 7 and 9).
- **A8.** The bot reaches the Starwright Bow (rebuild its walk grid after a Lantern reveal, PLAYTEST item 5).
- **A9.** After A1 and A2: re-run the sim and one Continue bot run with optional fights on; confirm the Oracle at Lv 25 is in
  band (PLAYTEST item 10).

## B: field art and maps (owned paths)

`src/data/ep5/field/**`, `src/data/ep5/pages.js`, `src/data/maps/ep5_*.js`, `tools/art/tiles/ep5*.py`, `assets/tiles/ep5*`,
`qa/world/ep5_*`, `qa/maps/ep5_*`, `qa/core/ep5_tiles*`, `qa/core/ep5_pages*`, `docs/WORLD_EP5.md`, `docs/MAPS_EP5_*.md`.

- **B1.** Light the Saffron Wind's deck: lantern pools, one value lighter, stars at the edges (CRITIQUE item 4).
- **B2.** Saffron Haven reads saffron at dusk: warm paving, lit lamps, the armillary on the skyline, the waystone placed
  (CRITIQUE item 5). Re-run the tiles sheet only if a tile must change; keep `ep5_tiles.json` ids stable.
- **B3.** Shade on paving: cooler and lighter, rooted at the caster; keep the violet on sand (CRITIQUE item 6). Draw shade
  over the lower half of a caster's sprite so the noon island stair shows (CRITIQUE item 10 field half, PLAYTEST item 6).
  Keep the running/firm sand contrast at or above 0.25 on the phone (measure).
- **B4.** A visible dawn: a rose dawn tint, or the pale noon tint, so the hour change shows (CRITIQUE item 7, PLAYTEST 3).
- **B5.** `spring_return` (F3) becomes a rest and save font once filled (PLAYTEST item 4).
- **B6.** Vex's marks in `ep5_lab_f2.js`: the party two rows below him (A writes the staging in `story.js`).
- **B7.** Page modes `restored_1`, `restored_2`, `restored_3` for `ep5_chart` (the seal shows at step 4 = the existing
  `restored`); the hero's star stays the brightest thing on the final page.

Every map change keeps `node tools/maps/ep5_check.mjs`, `node qa/run.mjs maps world ep5` green and the critical path and
reload-home tests passing. The orchestrator runs the full gate list after both report.
