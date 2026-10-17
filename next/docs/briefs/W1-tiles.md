# W1-tiles: master palette and tilesets (terrain + architecture)

**Owned paths:** `next/tools/art/tiles/**`, `next/assets/tiles/**`, `next/assets/palette.json`, `next/assets/palette.png`.

You create the ground the whole game stands on. Target look: Chrono Trigger's Truce/Guardia, Lufia II's towns,
Secret of Mana's lush color, in 16 px tiles, hue-shifted ramps, readable at a glance.

## Deliverables
1. **`assets/palette.json`** (do this FIRST, other agents will harmonize to it later): analyze the existing painted
   sheets in `../assets/art/` (environments, world-sprites, party-sprites, portraits, interior-sprites) and build
   ~56 colors in named hue-shifted ramps per DESIGN 6.1. Also write `assets/palette.png` (labelled swatches).
2. **Deterministic Python generators** in `tools/art/tiles/` producing these sheets in `assets/tiles/`:
   - `terrain.png`: VX/MV "A2" autotiles (2x3 tiles = 32x48 each) for grass, tall grass, dirt path, cobblestone
     plaza, sand bank, shallow water, stone floor (archive), wood floor, carpet (red and blue), dark pit/void,
     moss; "A1" animated (3 frames) for river water with foam edges and ink pool. Grass/path/plaza need 3 to 4 plain
     fill variants each so large areas do not tile visibly. Flower and pebble overlay tiles.
   - `cliffs.png`: 3/4-view cliffs (top autotile + face pieces with left/right/inner corners), stairs cut into
     cliffs, ledges (one-way drop).
   - `town.png`: modular architecture: roofs in red, blue, purple, green (shingle texture, ridge, eaves, gable
     ends), walls (timber-frame plaster, stone, wood planks), doors (open/closed), windows (lit/unlit, flower boxes),
     chimneys, awnings, fences (wood, stone low wall, iron), bridges (wood, stone arch), well, stone stairs, steps,
     signposts, lamp-post base, market stalls, banners. **Prefab buildings** assembled from those pieces:
     `house_small`, `house_medium`, `house_large`, `hero_home`, `inn`, `item_shop`, `smithy`, `bakery`, `library`
     (grand, with the Willowmere look from the key art), `chapel_bell_tower` (tall tower with a bell), `town_gate`.
   - `archive.png`: dungeon kit for the Rootbound Archive: stone-and-root walls (3/4 view, wall top autotile + face),
     floors, wall-mounted bookshelves, freestanding shelves (2 variants, plus a "moving shelf" sprite), reading
     tables, candelabras, root growths, pressure plate (up/down), floor switch (on/off), crystal switch, push block,
     locked door / key door / boss door (closed, open), pits, cracked wall, stairs up/down, ink pools, glowing
     hidden-ink bridge tiles (faint, revealed), lantern pedestal, braziers (lit 3-frame, unlit).
   - `interior.png`: house/inn/shop interiors: walls with trims and windows, wooden floors, rugs, counters, beds,
     tables, chairs, hearth (animated fire 3 frames), shelves with goods, barrels, pots, crates, stairs.
     (The sprites agent separately downscales painted props from `../assets/art/world-sprites.png` and
     `interior-sprites.png`: trees, fountain, lamp, bench, anvil, hedge, chests, arch, shrine, furniture. Do not
     duplicate those; build the tile-based architecture and floors they sit on.)
3. **`assets/tiles/tiles.json`**: every tile and object with `{sheet, x, y, w, h, collision, anim?, autotile?}`;
   objects with `{sheet, rect:[x,y,w,h], anchor:[tx,ty] (bottom-left footprint tile within the object), footprint:
   [[dx,dy],...] solid tiles, overheadRows: n (top rows drawn above actors), doorAt:[dx,dy]? }`. Document every
   collision code you use (`none, solid, water, ledge_s, ledge_e, ledge_w, pit, counter`).
4. A **Python preview composer** `tools/art/tiles/compose.py` that can render any small ASCII scene (same legend
   idea as DESIGN 5.1) with your autotile logic into a PNG. Use it to build, view and iterate on at least:
   a Willowmere riverside corner (river, bridge, path, plaza, 3 buildings, fences, flowers), the Lantern Square
   with the bell tower, an Archive room (walls, shelves, floor, plate, block, door, pit, ink), and a house interior.
   Save them as `tools/art/tiles/out/preview_*.png` at 3x.
5. `assets/tiles/README.md`: layout conventions, ids, how autotiles are laid out, how to regenerate.

## Quality bar (check every preview against it)
No visible seams or broken autotile corners; no obvious repetition over a 24x14 screen; walkable ground lower
contrast than blockers; consistent top-left light; soft dithered shadows under tall objects; roofs and walls
read as 3/4 view with depth; colors pulled from `palette.json`; nothing looks like flat programmer art.
