# X2-tiles: the Quarry, the Light, the marsh, the Weald and the shore (X2 wave XB)

Read `docs/briefs/COMMON.md`, `DESIGN.md` section 6, `docs/EXPANSION_RECONCILIATION.md`, `docs/briefs/XP-packs.md` section 5 (pack asset fragments), the Episode 1 expansion's finished `x1` tile notes (do not repeat its barrow look: turf-capped stone and burial niches), `docs/EXPANSION2_PLAN.md` sections 4 and 12.1 (your contract), `tools/art/tiles/hollow.py` and `court.py` (the recolor and kit approach), `assets/tiles/README.md`, `docs/CRITIQUE_4.md` items 6, 7 and 13 (floors that differ room by
room, dim states that read on a phone, no rectangle floating in black).

## Items, in order

1. **Terrains**: `quarry_rock` (cut grey-brown rock with sledge-track ruts), `mercury` (reflective, `water` collision, 3-frame shimmer), `birch_floor`, `saltpan`; everything else reuses existing terrains.
2. **Wall systems** `quarry` (timbered rock and cut stone) and `lighthouse` (`_top`, `_face`, outer face, the W8 depth scheme).
3. **Buildings and objects** exactly as the ids of plan 12.1: the nine buildings and prefabs (`reed_lodge`, `reed_hut`, `cairn_hut`, `keeper_cottage`, `lighthouse` with unlit and lit frames, `boathouse_ruin`, `watchtower_ruin`, `mill_ruin`, `wreck_tern`), the objects (`cairn_block`, `fallen_oak`, `driftwood_log`,
   `great_cairn`, `waymark_pedestal` (one state: every plinth carries its cairn), `cache_cairn` (a cairn with a hollow side; empty and stocked), `quarry_door_*` (a timbered adit mouth, closed and open), `heron_statue`, `hide_hut`, `spotting_scope`, `drying_rack`, `reed_bundle_stack`, `nest_mound`, `sluice_plug`, `boat_moored`, `net_rack`, `lamp_great` (empty, lens, lit), `lens_bench`, `sundial`, `crypt_hatch`, `tide_door`, `skinning_rack`, `birch_carved`)
   and the overlays and overhead decals (`lamp_beam`, `light_far`, `watchtower_far`, four `sign_blank_*`). Collision codes, `doorAt` footprints, `reflect` and `beam` keys as the E2 kit.
4. **Packaging**: everything goes in the **new sheet `assets/tiles/x2.png`** with entries in `assets/tiles/x2_tiles.json` (never appended to `tiles.json`, a shared sheet or an atlas). The pack loader merges the fragment into the tile database on `ensurePack('x2')`; register the sheet with `node qa/core/sync-manifest.mjs --pack x2` (it writes `assets/x2_manifest.json`). A tall landmark
   (`watchtower_ruin`, `great_cairn`, `lighthouse`) is drawn in the overhead layer when it hides actors.
5. **Phone readability**: a lit lamp, an open hatch, a revealed ink bridge and a lit glass bridge read at a glance against their dim states at 1x on a dark floor; boardwalk planks have a pale edge so they read over shallow water.
6. **A contact sheet** of every new tile and object, and mock rooms with the real tiles: the Quarry's cutting hall, the Light's signal gallery, a Heronwade boardwalk with a gap, a Weald aisle with the watchtower, a Southmere beach with the wreck. View them at 3x.

## Rules

- Owned paths: `tools/art/tiles/x2_*.py` (plus the one `x2` entry line in `tools/art/tiles/build_tiles.py`), `assets/tiles/x2.png`, `assets/tiles/x2_tiles.json`, `tools/art/tiles/out/x2/**`. No shared file is edited (not `tiles.json`, not `assets/manifest.json`).
- Palette discipline: new colors only where `palette.json` cannot carry the thing; report each. The sheet is at most 140 KB. No non-integer scaling. No git, no em dashes, bounded commands.
- Verify: the x2 build entry in `tools/art/tiles/`, `node qa/run.mjs core pwa`, view every sheet and mock at 3x or 4x; a pixel artist would sign off against Chrono Trigger and Lufia II.
- Report under 400 words: the ids added, collision codes, every new color, sheet size, the contact-sheet and mock paths, anything the maps agents must know (footprints, door cells).
