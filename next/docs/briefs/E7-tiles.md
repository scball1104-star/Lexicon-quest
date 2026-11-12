# E7-tiles: the ep7 tile sheet, the road and Palehaven kits, backdrops, the close-up pages (wave 7b, beside E7-sprites and E7-world)

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md` 6.1 to 6.2, `docs/EPISODE7_PLAN.md` sections 0.1, 4 (what the
maps need), 4.5 and 5.1 (the fade, the ghost trail and the stones), 5.2 (the aurora), 9.0, 9.1, 9.3 and 9.4 (your
contract), `docs/story/EPISODE7.md` section 4 (the palette in words), `docs/CRITIQUE_8.md` items 3, 5, 8 and 9 and its
protect list, and how Episode 6 built its fragment, backdrops, grades and pages (`assets/tiles/ep6.png`, `ep6_tiles.json`,
`tools/art/tiles/ep6_*`, `tools/art/backdrops/ep6_*`, `src/data/ep6/pages.js`, the OKLab grade recipes).

## Owned paths

`tools/art/tiles/ep7_*.py` (+ one line in `build_tiles.py`), `tools/art/tiles/out/ep7/**`, `assets/tiles/ep7.png`,
`assets/tiles/ep7_tiles.json`, `tools/art/backdrops/ep7_*.py`, `assets/backdrops/ep7_*`, `src/data/ep7/pages.js`,
`qa/core/ep7_tiles*`, `qa/core/ep7_pages*`. Prefixed files only, so the pack rule keeps them out of the first download.

## Outputs (items, in order)

1. **`assets/tiles/ep7.png` + `ep7_tiles.json`** (a fragment merged at pack load; never edit `tiles.json`): the terrains
   of plan 9.1 (the A1 `fade` in 2 frames of a slow grain, `icepath`, `snowfield`, `frostbrick`, `iceglass`, `icebridge`,
   `letter_stone`, `nave_ice`, `permafrost`, `icebrick`, `frostmosaic`), four wall systems (`icewall`, `vault_wall`,
   `bell_hall`, `nave`), every object of 9.1 with exact ids and collision codes, the Palehaven kit (prefabs with `doorAt`,
   the Keeper's Watch, the hearth cold and lit, iced doors in two states, the Vanishing Mark in two states), and the road kit
   (the lake edge, pines, the Traveler's Wall, the Icegate arch). The Kestrel is Episode 6's prop: reuse it, never redefine
   it. Three Vault floors that look nothing alike (frost brick and glass over white; dark letter stone and lamp pools; white
   nave under aurora). **The fade must never read as walkable snow.**
2. **Phone contrast checks** on a rendered 844x390 crop, **three pairs separately** (CRITIQUE_8 item 9): ghost trail against
   fade (at least 0.08 luma), held path against fade (at least 0.2, textured), snow ground against fade (at least 0.1,
   textured); each stone state from two tiles away (dim, lit, flickering); a frost door against its floor. Give E7-world the
   ghost-trail recipe (footprint size, colour, spacing) and the stone frames that hit those numbers.
3. **Source art:** environments cell 6 only (the road, the Vault front, the Stillheart sky, `palehaven_far`,
   `cathedral_far`, the key art). Do not touch environments cell 7 (held for Episode 8). Clean the painted cut-outs with hard
   alpha and an outline at phone scale (CRITIQUE_8 item 8's lesson).
4. **Backdrops** of 9.3 as `assets/backdrops/ep7_*` with `bandY` / `bandAlpha`: two painted crops, three composed in code
   (hall, sanctum, Stillheart). For the Stillheart, the frozen and thaw grade recipes (OKLab, code, no extra files: never a
   screen over the frozen one, CRITIQUE_7 item 1) and their measured luma (thaw at least 0.10 above frozen on the phone
   crop); the slow aurora layer within plan 5.2's limits (at most +0.05 luma between frames). Mock stages via
   `mock_stage.py`, both grades.
5. **Close-up pages** `src/data/ep7/pages.js` (9.4), registered on `PAGE_KINDS` by the pack: `ep7_chart` (`fading`),
   `ep7_carving` (`fading`, `whole`), `ep7_tally`, `ep7_tag`, `ep7_seventh`, `ep7_page` (`half`, `joined`, `mark`,
   `signed`), `ep7_letter` (`restored`). Render each mode at 3x and look at it: the warm hand's "k" drawn as Episode 5's
   `ep5_page` and Episode 6's `ep6_page` drew it; Marten's sevens crossed with a bar, his hand rough and square; Mara's tag
   in a third, strong square hand; the tally's every seventh stroke crossed; the carving's letters going white one by one;
   the half page frosted unreadable; Nox's signature the brightest thing on `signed`. **Each mode's text reaches full alpha
   only when the scene's box says it** (CRITIQUE_8 item 5): expose a per-mode fade-in the scene calls.
6. A contact sheet and mock rooms at 3x: gap A on the road, gap B with two paths, the Palehaven square around the hearth,
   F1's re-read landing in two states, F2's grip with a frost door both ways and its lamp pools, F3's Remember landing under
   the aurora tint.

## Done when

Every id of 9.1 is in the fragment with its collision code; every sheet, mock and page has been viewed at 3x or 4x; the
three contrast pairs, the stone states, the grades and the aurora are measured and inside the plan's floors; `node
qa/run.mjs core pwa` is green and the initial download did not move.

## Tests to run

Your build script; `node qa/core/sync-manifest.mjs --pack ep7`; `node qa/run.mjs core pwa`. Tests you add: every fragment
id unique against `tiles.json` and **every** `ep*_tiles.json` fragment (Episode 6's `mooring_post` collided with Episode
4's); every page kind registered with its modes; the grades' luma numbers asserted; each page mode's fade-in exposed.

## Traps

- **Id collisions across fragments.** `waystone` (ep5), `kestrel` and `signal_lamp` (ep6) and `hearth` (core) are taken;
  grep every new id against all of them.
- **Runway-painted pack stages leave `backdropLayer.painted` false.** Any test of a painted ep7 stage waits on
  `usedAsset`, never on `painted`.
- **`assets/ep7_manifest.json` is generated** by sync-manifest; the orchestrator must `git add` it at wave close: say so in
  your report.
- **The initial download must not move.** If it did, a file is missing its `ep7_` prefix.
- Palette discipline: new colors only where `palette.json` cannot carry snow white, ice blue, pine black and aurora green
  and violet (report each). No non-integer scaling of pixel art.
- **The aurora is a safety rule**, not a style choice (plan 5.2).
- House rules: no git; LF endings (count CR bytes before and after: zero); no em dashes; stay in owned paths; bound every
  command; one browser job at a time; no paid generation (Runway and Suno are Scott's).

## Report (under 400 words)

Ids delivered with collision codes, new colors, the three contrast numbers, the stone and frost readings, the grade and
aurora numbers, preview paths, anything from the plan you changed, and the manifest note for the orchestrator.
