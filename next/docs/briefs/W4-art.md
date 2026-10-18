# W4-art: one pixel density everywhere, cleaner enemies, deeper Archive, calmer plaza

**Owned paths:** `next/tools/art/**`, `next/assets/tiles/**`, `next/assets/sprites/**`, `next/assets/backdrops/**`
(new), `next/assets/palette.json`. Do not edit any `src/` file; other agents are coding in parallel and will
consume your new assets by the ids you report. Keep every existing frame name, origin, sheet layout and tile id
identical (code depends on them); add, do not rename.

Read `next/docs/CRITIQUE_1.md` first (items C1, C6, C8, C9, C16, plus the pit rim note), then DESIGN.md section 6,
`assets/tiles/README.md`, `assets/sprites/README.md`, and the generators you will extend.

## Deliverables
1. **Backdrops at game density (C1).** Build `tools/art/backdrops/build.py` that takes the painted
   `../assets/art/environments.webp` cells and produces `assets/backdrops/<id>.png` at exactly 384x216 for:
   `title` (cell 0, the Willowmere key art, framed for the logo at top), `battle_valley` (cell 0 variant with a
   darker lower band already baked), `battle_archive` (cell 7 or the archive cell the battle scene uses today; read
   `src/scenes/battle.js` to match), `battle_boss` (archive cell with the violet tint), `dialog_keyart` (for the
   prologue cards). Pipeline: box-downscale to 384x216, light unsharp mask, quantize to `palette.json` with
   ordered (Bayer 4x4) dither, optional 2 to 4 extra colors per backdrop for skies and water if the palette cannot
   carry them (report them). Also write `<id>.json` with `{bandY, bandAlpha}` for the battle stage band. View each
   at 3x; it must read as pixel art that belongs with the tiles, not a photo filter. Compare against the current
   `qa/out/desktop-battle_command.png` and `desktop-ui_title.png`.
2. **Enemy battle sprites (C8):** re-run the enemy/boss pipeline with a cleanup pass: remove downscale speckle
   (median/majority filter on isolated pixels), quantize tighter, add selective 1 px outlines in each material's
   darkest ramp step, keep sizes and frame names. Contact sheet at 4x; compare before/after.
3. **Archive depth (C6):** in the archive tileset add wall face variants with depth (a two-tone face with a
   darker lower course), a `pillar` object (2 tiles tall, overhead top), and change the void fill tile to flat
   `#14101e` (the palette's darkest) instead of the hatched brown; keep the hatched one under a new id in case
   a map wants it. Update `tiles.json` and the README. Re-render `preview_archive_room.png`.
4. **Pit rim:** pits need a visible rim (1 px lighter edge on the top and left, a 2 px dark lip at the bottom) so
   they read as holes; add as the pit autotile's edge treatment.
5. **Plaza contrast (C9):** lower the cobble value contrast by about a third so actors pop; keep the 16 px course
   from repeating by adding two more fill variants.
6. **Library rug (C16):** make the carpet autotile read as cloth (a border pattern, a soft center) instead of a
   tile grid.
7. **Timeline head icons (C4):** build `assets/ui/heads.png/json` with 12x12 chibi head icons for hero, mira,
   bram, and each enemy id plus archivore, echo_warden, lost_page (crop and simplify from the sprites), each with
   a 1 px frame; frame names `head_<id>`. (The battle agent will switch the timeline to these.)

Rebuild everything with the existing build scripts, keep output deterministic, run `node next/qa/run.mjs`
(assets tests must stay green) and `node next/qa/core/sync-manifest.mjs`. Report the new asset ids and any
palette additions.
