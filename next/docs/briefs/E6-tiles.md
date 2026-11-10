# E6-tiles: the ep6 tile sheet, the town and Airstair kits, backdrops, the close-up pages (wave 6b, beside E6-sprites and E6-world)

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md` 6.1 to 6.2, `docs/EPISODE6_PLAN.md` sections 0.1, 4 (what the
maps need), 4.4 and 5.1 (the lane drawing rules), 5.2 (lightning), 9.0, 9.1, 9.3 and 9.4 (your contract),
`docs/CRITIQUE_7.md` items 1, 3 to 5 and 7 and its protect list, and how Episode 5 built its fragment, backdrops, grades and
pages (`assets/tiles/ep5.png`, `ep5_tiles.json`, `tools/art/tiles/ep5_*`, `tools/art/backdrops/ep5_*`,
`src/data/ep5/pages.js`, the `DAY_TONE` OKLab recipe in `src/data/ep5/scene.js` and BATTLE 13.7).

## Owned paths

`tools/art/tiles/ep6_*.py` (+ one line in `build_tiles.py`), `tools/art/tiles/out/ep6/**`, `assets/tiles/ep6.png`,
`assets/tiles/ep6_tiles.json`, `tools/art/backdrops/ep6_*.py`, `assets/backdrops/ep6_*`, `src/data/ep6/pages.js`,
`qa/core/ep6_tiles*`, `qa/core/ep6_pages*`. Prefixed files only, so the pack rule keeps them out of the first download.

## Outputs (items, in order)

1. **`assets/tiles/ep6.png` + `ep6_tiles.json`** (a fragment merged at pack load; never edit `tiles.json`): the terrains
   of plan 9.1 (the A1 `cloudbank` and `gust_lane` in 3 frames each, `skyplank`, `skywalk`, `stormglass`, `skybridge`,
   `relay_grate`, `duct_shaft`, `spire_stone`), three wall systems, every object of 9.1 with exact ids and collision codes,
   the Zephyr Landing kit (prefabs with `doorAt`, the beacon tower, the board and the chimes in two states, the Kestrel, the
   post rack), and the Airstair kit (the basalt stack, landings, rope stairs, the great chain overhead). Three Observatory
   floors that look nothing alike (sunlit plank and glass; brass and dark grating; white stone in slate cloud). Cloudbank
   must never read as walkable; a lane must read as moving.
2. **Phone contrast checks** on a rendered 844x390 crop: a live lane against plain cloud (mean luma difference at least
   0.2 at the chevrons), a vane's arrow from two tiles away in each state, a mooring post against a lane. Give E6-world the
   chevron size and colour and the streak recipe that hit those numbers (E6-world draws the chevrons in code).
3. **Source art:** environments cell 5 only (the sky and causeway backdrops, `isles_far`, `storm_far`, the key art). Do
   not touch environments cells 6 and 7 (held for Episodes 7 and 8).
4. **Backdrops** of 9.3 as `assets/backdrops/ep6_*` with `bandY` / `bandAlpha`: two painted crops, three composed in code
   (relays, storm, eyrie). For the storm stages, the storm and clear grade recipes (OKLab, code, no extra files: never a
   screen over the storm, CRITIQUE_7 item 1) and their measured luma (clear at least 0.12 above storm on the phone crop);
   the soft lightning layer's recipe within plan 5.2's limits (at most +0.12 luma, at most once in 4 s). Mock stages via
   `mock_stage.py`, both grades.
5. **Close-up pages** `src/data/ep6/pages.js` (9.4), registered on `PAGE_KINDS` by the pack: `ep6_slip` (`burned`),
   `ep6_manifest` (`struck`, `restored`), `ep6_letter`, `ep6_page` (`name`, `seal`, `torn`). Render each mode at 3x and look
   at it: the warm hand's "k" drawn as Episode 5's `ep5_page` drew Ishra's (seen, not told); the hero's name is the
   brightest thing on `name`; the counter-seal reads as an open book with one line; the torn edge on `torn` is a real tear,
   not a straight crop.
6. A contact sheet and mock rooms at 3x: the Airstair's lane A, the town's board plaza, F1's vane deck in both states,
   F2's ducts with a lamp pool, F3's ring landing in the storm tint.

## Done when

Every id of 9.1 is in the fragment with its collision code; every sheet, mock and page has been viewed at 3x or 4x; the
contrast and grade numbers are measured and inside the plan's floors; `node qa/run.mjs core pwa` is green and the initial
download did not move.

## Tests to run

Your build script; `node qa/core/sync-manifest.mjs --pack ep6`; `node qa/run.mjs core pwa`. Tests you add: every fragment
id unique against `tiles.json` and the ep3 to ep5 fragments; every page kind registered with its modes; the grades' luma
numbers asserted.

## Traps

- **Runway-painted pack stages leave `backdropLayer.painted` false.** Any test of a painted ep6 stage waits on
  `usedAsset`, never on `painted`.
- **`assets/ep6_manifest.json` is generated** by sync-manifest; the orchestrator must `git add` it at wave close: say so in
  your report.
- **The initial download must not move.** If it did, a file is missing its `ep6_` prefix.
- Palette discipline: new colors only where `palette.json` cannot carry sky blue, peach, brass and storm slate (report
  each). No non-integer scaling of pixel art.
- **Lightning is a safety rule**, not a style choice (plan 5.2).
- House rules: no git; LF endings (count CR bytes before and after: zero); no em dashes; stay in owned paths; bound every
  command; one browser job at a time; no paid generation (Runway and Suno are Scott's).

## Report (under 400 words)

Ids delivered with collision codes, new colors, the contrast, grade and lightning numbers, preview paths, anything from
the plan you changed, and the manifest note for the orchestrator.
