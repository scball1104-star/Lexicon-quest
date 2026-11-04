# E4-tiles: the ep4 tile sheet, the Valewyn kit, backdrops (wave 4b, beside E4-sprites and E4-world)

Read `docs/briefs/COMMON.md`, `DESIGN.md` 6.1 to 6.2, `docs/EPISODE4_PLAN.md` sections 4 (what the maps need), 4.4
and 5.1 (the tide drawing rules), 9.0, 9.1 and 9.3 (your contract), `docs/CRITIQUE_4.md` items 3, 6, 7 and 13,
`docs/CRITIQUE_5.md`, and how X1 built its fragment (`assets/tiles/x1.png`, `x1_tiles.json`, `tools/art/tiles/x1_*`).

## Items, in order

1. **`assets/tiles/ep4.png` + `ep4_tiles.json`** (a fragment merged at pack load; never edit `tiles.json`): the three
   keep terrains and wall systems (one per floor, visibly different, tide marks at heights 1 and 2), `canal_floor`,
   `canal_stair`, `ledge_face`, `tide_water` (A1, 3 frames, collision `water`, with rim and foam), the objects of 9.1
   with exact ids and collision codes, `flood_grass`, `mud_path`, and the Valewyn town kit (prefabs with `doorAt`, the
   faceless statue, the three-state flood board, the great lock wheel, drowned roofs) and the Emberpeak washout rope
   ladder. The wheel's three pointer states, every tide post's water line, a grounded versus floating pontoon and a
   drained versus flooded canal must read at phone scale (render the phone crop and check).
2. **Source art:** environments cell 3 (Valewyn) only, for `valewyn_far` and the backdrops. Do not touch cells 4 to 7
   (held for later episodes).
3. **Backdrops** of 9.3 as `assets/backdrops/ep4_*` with `bandY` / `bandAlpha`; mock stages via `mock_stage.py`.
4. **Tint check** for `flood_grey` (the tint itself is E4-world's): render a mock plaza crop with a cool grey-green
   multiply and give E4-world the multiply that measures at least 10% darker than `none`.
5. A contact sheet and two mock rooms at 3x: F1's Papered Door at low and at high water, and F1's Pontoons at low and
   mid.

## Rules

- Owned paths: plan 11.1, row E4-tiles. Prefixed files only, so the pack rule keeps them out of the first download.
- Palette discipline: new colors only where `palette.json` cannot carry turquoise water and wax red (report each).
  No git, no em dashes, bounded commands, one browser job at a time.
- Verify: your build script; view every sheet and mock at 3x or 4x; `node qa/core/sync-manifest.mjs --pack ep4`;
  `node qa/run.mjs core pwa` (the initial download must not move: if it did, a file is missing its prefix).
- Report under 400 words: ids delivered with collision codes, new colors, preview paths, anything from the plan you
  changed, and the `flood_grey` numbers.
