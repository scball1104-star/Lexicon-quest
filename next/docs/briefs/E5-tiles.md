# E5-tiles: the ep5 tile sheet, the town and ship kits, backdrops, the close-up pages (wave 5b, beside E5-sprites and E5-world)

Read `docs/briefs/COMMON.md`, `DESIGN.md` 6.1 to 6.2, `docs/EPISODE5_PLAN.md` sections 0.1, 4 (what the maps need), 4.5
and 5.1 (the shade drawing rules), 9.0, 9.1, 9.3 and 9.4 (your contract), `docs/CRITIQUE_6.md` items 3, 4, 5, 6 and 7 and
its protect list, and how Episode 4 built its fragment, backdrops and pages (`assets/tiles/ep4.png`, `ep4_tiles.json`,
`tools/art/tiles/ep4_*`, `tools/art/backdrops/ep4_*`, `src/data/ep4/pages.js`).

## Items, in order

1. **`assets/tiles/ep5.png` + `ep5_tiles.json`** (a fragment merged at pack load; never edit `tiles.json`): the terrains
   (`dune_sand`, `caravan_paving`, `groove`, the A1 `running_sand` in 3 frames, `dune_court`, `gallery_tile`,
   `well_basalt`), three wall systems (F2's with window cells lit and dark), every object of 9.1 with exact ids and
   collision codes, the Saffron Haven kit (prefabs with `doorAt`, the armillary roof prop, the waystone and bulletin in two
   states, the Moonwell, the mural), and the ship kit. Three floors that look nothing alike and **no violet stone**
   (CRITIQUE_6 item 7). The sundial's three notches must read at phone scale, with the face on the tile above the stand.
2. **Phone contrast checks** on a rendered 844x390 crop: running sand against firm shaded sand (mean luma difference at
   least 0.25), a dial's lit notch from two tiles away, a sun plate lit vs shaded. Give E5-world the shade overlay's
   dither recipe and colour that hit those numbers.
3. **Source art:** environments cell 4 only (the dunes and Oracle backdrops, `haven_far`, the key art). Do not touch cells
   5 to 7 (held for later episodes).
4. **Backdrops** of 9.3 as `assets/backdrops/ep5_*` with `bandY` / `bandAlpha`: two painted crops, three composed in code
   (sea, gallery, well). For each, the Day and Night grade recipes (code, no extra files) and their measured luma (Day at
   least 0.12 above Night on the phone crop). Mock stages via `mock_stage.py`, both grades.
5. **Close-up pages** `src/data/ep5/pages.js` (9.4), registered on `PAGE_KINDS` by the pack, the EP4_PAGES approach:
   `ep5_letter` (`full`, `blank`), `ep5_chart` (`prophecy`, `restored`, `road`), `ep5_page`. Render each mode at 3x and
   look at it: the hero's star must be the brightest thing in `restored`; the counter-seal in stars must read as an open
   book with one line.
6. A contact sheet and mock rooms at 3x: the road's Glass Flat at noon and at dawn (with E5-world's shade drawn or a mock
   of it), F2's long shafts at dawn, F3's top landing with two lamp pools.

## Rules

- Owned paths: plan 11.1, row E5-tiles. Prefixed files only, so the pack rule keeps them out of the first download.
- Palette discipline: new colors only where `palette.json` cannot carry desert gold, saffron and star-glass (report each).
  No git, no em dashes, bounded commands, one browser job at a time.
- Verify: your build script; view every sheet, mock and page at 3x or 4x; `node qa/core/sync-manifest.mjs --pack ep5`;
  `node qa/run.mjs core pwa` (the initial download must not move: if it did, a file is missing its prefix).
- Report under 400 words: ids delivered with collision codes, new colors, the contrast and grade numbers, preview paths,
  anything from the plan you changed.
