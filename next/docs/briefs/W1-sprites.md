# W1-sprites: characters, NPCs, props, enemies, bosses, portraits

**Owned paths:** `next/tools/art/sprites/**`, `next/assets/sprites/**`.

Source art (strong, painted, high resolution) is in `../assets/art/` (relative to `next/`):
`party-sprites.png` (384x384: 3 rows hero/Mira/Bram x 4 columns front/left/right/back, 96x128 cells),
`townsfolk-sprites.png` (1344x66 strip, inspect it), `world-sprites.png` (1024x1024, 4x4 props: 4 houses,
willow, pine, snowy pine, violet tree, fountain, ruined arch, rune shrine, chest, lamp post, bench, anvil, hedge),
`interior-sprites.png` (1024x1024, inspect), `enemies.webp` and `bosses.webp` (1774x887, 4x2 grids),
`portraits.webp` (1774x887, 4x2 grid; top row hero, Mira, Bram, Elder Mael).

The job: turn painted sources into **crisp, hand-pixeled-looking game sprites** at the game's pixel density.
A blurry downscale is a failure. Use good resampling (area/box or a custom majority-cluster downscale), then
quantize to a tight per-sprite palette (consider `next/assets/palette.json` if it exists by then; keep your
pipeline re-runnable so a later pass can re-quantize to the master palette), then clean up: remove orphan pixels,
enforce a selective 1 px outline (darkest shade of the adjacent material, not pure black), sharpen eyes/faces by
hand-placed pixel fixes in code where needed. Light comes from the top-left.

## Deliverables (all with atlas JSON per DESIGN 4)
1. **Party field sprites** `party_field.png/json`: hero, mira, bram in 24x32 cells: 4 directions x (stand, step A,
   step B), plus idle blink. Derive walk frames (alternate leg forward/back, arm swing, 1 px body bob). Render a
   walking strip and verify it reads as walking at 8 fps.
2. **Party battle sprites** `party_battle.png/json` (32x40 cells, facing LEFT toward enemies): idle (2-frame
   breathe), ready, attack wind-up, attack strike (one per weapon type they use), cast, hurt, defend, victory,
   low-HP kneel, KO. Can be built by posing/deforming the side view (lean, arm offsets, weapon swing overlays).
3. **NPCs** `npcs.png/json`: every NPC sprite id in COMMON.md (24x32, 4 dirs x 3 frames). Source from the
   townsfolk strip; create variety with hair/clothing palette swaps and small accessory edits (apron for the
   baker, hammer for the smith, robe for the scholar, lantern for the bellkeeper). Animals (cat, dog, chicken,
   duck) at 16x16 with 2 to 3 frames, original pixel art.
4. **Props** `props.png/json` from world-sprites and interior-sprites, downscaled to tile scale: `tree_willow`
   (big, ~4x5 tiles, canopy marked overhead), `tree_pine`, `tree_violet`, `bush`, `hedge_flowers`, `fountain`,
   `lamp_post` (lit glow frame), `bench`, `anvil`, `arch_ruin`, `rune_shrine`, `chest_wood/iron/gold` (closed,
   open), barrels, crates, pots (whole, broken), signboard, interior furniture from interior-sprites. JSON per
   object: `frame:[x,y,w,h]`, `anchor:[px,py]` (bottom-center of footprint in image px), `footprint:[wTiles,hTiles]`,
   `solid:true|false`, `overheadY:` pixel row above which the sprite draws over actors.
5. **Enemies** `enemies_battle.png/json`: every enemy id in COMMON.md at battle size (small 40 to 56 px tall,
   medium 64 to 88, mini-boss ~96) with the listed recolors; plus `enemies_field.png/json`: a 16x16 or 24x24
   field sprite per enemy id (2-frame idle/hop, faces left/right) for visible map enemies.
6. **Bosses** `bosses_battle.png/json`: `archivore` (~150x130 from bosses.webp cell 0), `echo_warden` mini-boss,
   `lost_page` add (original 24 to 32 px flying page with an ink eye, 3-frame flutter).
7. **Portraits** `portraits.png/json`: 48x48 and 32x32 for `hero`, `mira`, `bram`, `mael`, plus any other
   bottom-row cells that can serve named NPCs (document which). Portraits may keep more detail (they are
   FF6/Lufia-style talking portraits) but must sit cleanly at the pixel density (no blur).
8. **Shadows and misc**: ground shadow ellipses (small, medium, large), a sparkle and a dust-puff (3 frames each)
   for footsteps and interactions.
9. Contact sheets at 4x in `tools/art/sprites/out/` for everything; `assets/sprites/README.md` listing ids.

## Quality bar
Readable faces at 1x, clear silhouettes, consistent outline and light, 3 to 5 shades per material, no noise
pixels, no halo from the transparent background. Party sprites must be instantly recognizable as the painted
characters (hero: brown hair, blue tunic, cream scarf; Mira: violet hair, purple cloak, blue crystal staff;
Bram: armored, blue cape, round shield).
