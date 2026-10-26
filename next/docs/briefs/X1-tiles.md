# X1-tiles: the x1 tile sheet, the Thornfold, Millrace, moor and Larchhill kits, backdrops (X1 wave W2)

Read `docs/briefs/COMMON.md`, `DESIGN.md` 6.1 to 6.2, `docs/EXPANSION_RECONCILIATION.md`, `docs/briefs/XP-packs.md` section 5 (pack asset fragments), `docs/EXPANSION1_PLAN.md` sections 4 (what each map needs, with
objects named), 10.1 and 10.3 (your contract), `docs/CRITIQUE_3.md` item 3 and `docs/CRITIQUE_4.md` items 3, 6, 7 and 13
(floors must differ; resting states must read on a phone), and the `forge.png` and `ember.png` builders in `tools/art/tiles/`
as the model for "a new sheet, existing rects untouched".

## Items, in order

1. **`assets/tiles/x1.png` and its fragment `assets/tiles/x1_tiles.json`** (never appended to `tiles.json`; the pack loader merges it): three terrains (`x1_barrow_floor`, `x1_cellar_floor`, `x1_culvert_floor`) and three wall systems with outer
   faces (`x1_barrow`, `x1_cellar`, `x1_culvert`, each a different material: turf-capped stone with burial niches, blue-grey
   ashlar with star bands, red-brown brick vaults with iron ribs). Per-room variety from the start (a second floor variant,
   a border treatment, a rug or inlay), so no dungeon is one grey grid in black.
2. **The overworld kit** (the same sheet): standing stones (`x1_menhir_a`, `x1_menhir_b`, `x1_menhir_lettered`), the blank
   slab, the turf mound with a barrow door (`x1_barrow_door_closed`, `_open`), haystacks, the scarecrow (`x1_scarecrow`), a
   fallen oak (`x1_fallen_oak`), a drift log (`x1_drift_log`, a heavy-block skin), the drovers' chain gate (`x1_chain_gate`),
   a drystone wall line, troughs, the Loom House prefab (`x1_loomhouse`, with `doorAt` and a loom sign), two Thornfold
   cottage recolors, the weir-keeper's shed (a recolor of `smithy`), the Mill prefab (`x1_mill_building`, with a wheel slot and
   `doorAt`), `x1_mill_wheel` (still, turning, 4 frames), the dry weir with a failed sluice, the culvert arch
   (`x1_culvert_arch`), flour sacks and carts, `x1_orrery_tower` (domed prefab with `doorAt`), the armillary statue.
3. **The wide-map kits** (plan 10.1, 4.12, 4.13; two maps of 72 x 36 and 68 x 38 that must not read as green valley copies): the moor's heath and gorse
   (recolored tall-grass blobs and a gorse bush), grey crags, the black tarn (a mere palette on `ink` and `water` edges), nine `x1_chimepost`
   variants (a post with a hanging wooden chime, two frames so it can sway), the Watchtower prefab (`x1_watchtower`), a turf hut, the Keepers' stile
   with its root choke (`x1_roots_stile`); Larchhill's terrace walls and stairs (reuse `wall_stone_*` and `cliff_stairs_*`, recolored warm), orchard
   trees and bushes (recolored apple and plum), white hives, a cider press, a heavy cider barrel (`x1_cider_barrel`, a heavy-block skin), the
   aqueduct arches and walk, the Windmill prefab (`x1_windmill`, sails in two frames), a hay chute, a ladder; **far-off decals** `x1_far_tower` (a
   tall broken silhouette), `x1_far_windmill` (sails turning on a hilltop) and `x1_far_dome` (a brass dome catching light), drawn for the overhead
   layer at horizon scale like `emberpeak_far`.
4. **Mechanism skins**: the sliding slab (the `shelf` skin, two states), `x1_millstone` (heavy block skin), `x1_drain_grate`,
   `x1_star_plate`, `x1_hatch` (closed, open), `x1_armillary` (three stars dark, aligned: two states), the hearth
   (`x1_hearth` for `thornfold_hearth`; the Barrow and Culvert fonts reuse `rune_shrine`), a barred-gate recolor for the
   culvert, `x1_crack_*` reuse `wall_cracked`.
5. **Backdrops** (plan 10.3): `battle_downs`, `battle_moor`, `battle_barrow`, `battle_larchhill`, `battle_culvert` with `bandY` / `bandAlpha` (mock stages
   via `mock_stage.py`); each has the fallback named in plan 7.3.
6. **Phone check**: render the crop of a revealed ink bridge on `x1_cellar_floor`, a pressed plate and an opened slab on
   `x1_barrow_floor`, and a turning mill wheel, at phone scale, and say in the report that each reads.
7. A contact sheet of all new tiles and mocks at 3x for the critics: the Barrow's Long Hall (slabs, switch, a block, a plate), the Millrace yard, a moor
   crop with a chime post and the tower on the horizon, a Larchhill crop with hives and the windmill.

## Rules

- Owned paths: `tools/art/tiles/x1_*` and `tools/art/tiles/out/x1/**` (new builders, plus the one `x1` entry line in `tools/art/tiles/build_tiles.py`; do not edit `forge`, `ember`, `court`, `hollow` builders), `assets/tiles/x1.png`, `assets/tiles/x1_tiles.json`,
  `tools/art/backdrops/x1_*` (new x1 files), `assets/backdrops/x1_*` (new; ids stay `battle_downs` and so on, file names carry the prefix). **You edit no shared file**: not `tiles.json`, not `assets/manifest.json`, not `qa/core`.
  Register your files with `node qa/core/sync-manifest.mjs --pack x1` (it writes `assets/x1_manifest.json`; the orchestrator runs it again at wave close).
- Palette discipline: new colors only where `palette.json` cannot carry them (report each). No non-integer scaling. Collision
  codes as `tiles.json` defines. No git, no em dashes, bounded commands, one browser job at a time.
- Verify: `python tools/art/tiles/build_tiles.py`; view every sheet and mock at 3x or 4x; `node qa/run.mjs core`;
  `node qa/core/sync-manifest.mjs --pack x1`; the precache budget test (`qa/pwa/precache.test.mjs`) stays green and shows no `x1` file in the precache.
- Report under 400 words: ids delivered with their collision codes, new colors, preview paths, anything the plan asked for that
  you changed.
