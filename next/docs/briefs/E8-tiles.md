# E8-tiles: the ep8 tile sheet, the realm pop-ups, backdrops and close-up pages (wave 8b)

Draw Episode 8's ground, its books, its two grades and its seven close-ups, in code and from the held painted cell.

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md` section 6, plan `docs/EPISODE8_PLAN.md` sections 4 (the phone
rule and every map's look), 4.11 (the seven realm books), 5.1 (the readability pairs and their floors), 5.2, 9.0, 9.1, 9.3 and
9.4 (your contract), `docs/story/EPISODE8.md` section 4 (violet, gold and paper), `ART_PROMPTS.json` environments cell 7, the
Episode 7 tile, backdrop and pages tools (`tools/art/tiles/ep7_*.py`, `tools/art/backdrops/ep7_*.py`, `src/data/ep7/pages.js`)
as your models, the earlier list close-ups (the cold hand) and `ep5_page` to `ep7_page` (the warm hand's k).

## Owned paths

`tools/art/tiles/ep8_*.py` (+ one line in `build_tiles.py`), `tools/art/tiles/out/ep8/**`, `assets/tiles/ep8.png`,
`assets/tiles/ep8_tiles.json`, `tools/art/backdrops/ep8_*.py`, `assets/backdrops/ep8_*`, `src/data/ep8/pages.js`,
`qa/core/ep8_tiles*`, `qa/core/ep8_pages*`.

## Outputs (items, in order)

1. **Terrains and walls** of plan 9.1: the void (`void_violet`, flat violet, never walkable-looking; the motes are E8-world's
   layer, not baked), script steps (glyph bars, never legible letters), marble, ink canal, the canon `parchment`,
   `letterpath`, `vellum`, `scriptmosaic`, `goldscript`, `blank_page`, and five wall systems. The three Library floors must not
   look alike (plan 9.1).
2. **Objects** of plan 9.1: `popbook` in both orientations and every frame, the page 9-slice (cream, 1 px ink edge, a 2 px
   shadow onto void), **the seven realm pop-ups** (willow, mirror, forge and bell, keep, armillary, Kestrel, Stillheart, each
   readable as itself at phone scale and drawn on the open pages), the town objects with their two states, `great_lexicon`,
   `first_shelf`, `star_dome` (seven signs echoing Episode 5's mural, the eighth blank, then the counter-seal), `library_gate`
   (the empty seal; one line), `ink_door`, the Dash drawer stack, the canon decor.
3. **Backdrops** of plan 9.3 from environments cell 7 and in code, and the Last Word's **violet and gold grades** as separate
   OKLab recipes (gold at least 0.10 luma above violet on the phone crop), plus the phase 4 white-out overlay under its cap.
   The `library_far` and `library_cliff` decals, quantized.
4. **`pages.js`**: the seven kinds and twelve modes of plan 9.4 on `PAGE_KINDS`, each step's text reaching full alpha only on
   its box (expose a per-mode `reveal` the scene calls); the cold hand drawn as the lists were; the blanket's corner matching
   EPISODE1's inspect ("worn soft", the name in river-water thread); the eighth star's sign the brightest thing on `star`.
5. `node qa/core/sync-manifest.mjs --pack ep8`.
6. **Tests**: the fragment loads; every object id resolves; no id collides with any `assets/tiles/*.json`; every page kind
   draws each mode; the reveal timing; the contrast pairs of plan 5.1 measured on 844x390 mocks with their numbers printed.

## Done when

The sheet, the realm pop-ups, the backdrops with both grades and the pages render; you have **viewed** the contact sheet, a
phone-size mock of each map's kit (with a book shut, open as a bridge and open as a wall), each backdrop and every page mode;
the pairs meet their floors; `sync-manifest --pack ep8` ran.

## Tests to run

`python tools/art/tiles/build_tiles.py` (ep8 only), the backdrop builder, `node qa/run.mjs core`, your mock renders.

## Traps

- **The void is violet, never white**: Episode 7's fade is white; a player must never mix them up.
- **No legible text in tiles** (DESIGN hard rule 2): glyph bars and handwriting textures only; the pages' words are the
  story's lines drawn by `pages.js`.
- **Ids:** `popup` and `popups` are taken in `src/ui/`; check every `assets/tiles/*.json` fragment, not only the base.
- **Phone first:** measure on the 844x390 crop, not the sheet background. Pixel integrity: nearest neighbour, no smoothing.
- **Photosensitivity:** no frame-to-frame jump over +0.05 luma on any animated object; the white-out capped.
- The manifest is generated: the orchestrator `git add`s it. House rules: no git; LF endings; no em dashes; owned paths only;
  bound every command; never touch other episodes' sheets.

## Report (under 400 words)

What you drew, the measured pairs, the images you viewed (paths), the object ids and frame counts E8-world and the map agents
need, and the page kinds' call shapes for E8-story.
