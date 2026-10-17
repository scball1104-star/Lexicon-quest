# W2-maps: author every Episode 1 map

**Owned paths:** `next/src/data/maps/**`, `next/tools/maps/**`, `next/qa/maps/**`, `next/docs/MAPS.md`.

You are the level designer. Maps are data modules in the DESIGN 5.1 format plus `marks` (and the tile/object ids
from `assets/tiles/tiles.json` and prop ids from `assets/sprites/props.json`). Every scene in
`docs/story/STAGING.md` names the marks, NPC placements, props and triggers your maps must contain (section 5 is
the checklist). `docs/BATTLE.md` section 6 says how many visible enemies of each group each zone gets.
Benchmarks: Lufia II dungeons (readable rooms, machinery you can see, secrets, shortcuts), Chrono Trigger
towns (dense, composed, every building enterable and worth entering), Secret of Mana nature.

## Deliverables
1. `tools/maps/preview.py`: render any map module to a PNG at 3x from its data (parse the JS module with a small
   regex/JSON approach or run it through `node` to dump JSON), drawing ground autotiles (reuse
   `tools/art/tiles/compose.py` logic), decor, props, events as labeled markers, exits, marks. You will look at
   every map through it. Also a `--walk` check that BFS-floods walkable tiles and reports unreachable events.
2. Maps (ids from COMMON.md):
   - `hero_home` (interior, 2 rooms: loft with bed + main room with hearth; Hazel; mark `bedside`, `bed`).
   - `willowmere` (about 40 x 30): Lantern Square with the well and the chapel bell tower, the river with the
     stone bridge and the ferry landing, the grand library, inn, item shop, bakery, smithy, 4 to 6 homes with
     gardens, fences, lamp posts, flower beds, the willow (big), town gate south, side streets for the
     `gather_*` marks. All NPC events from `npcs.js npcsOnMap('willowmere')`. Signs with fading states.
   - Interiors `inn`, `item_shop`, `smithy`, `library` (two floors or a mezzanine, Iris, Mira's spot, books),
     `chapel` (the bell, save point), `bakery` (Oren, the oven, `starter_dough` spot).
   - `valley` (about 60 x 40): the pilgrim road north, the river and bridge, a meadow, Whisperwood edge, cliffs
     with a ledge shortcut, the milestone, the peddler Penny, 7 visible enemy events per the plan, 2 secrets
     (hollow tree cache, a cliff-top chest), the north landing bell post, rain trigger zone, the Archive entrance
     grown into a willow.
   - `archive_f1` The Catalog Halls (about 40 x 30): entrance hall with the SPEAK AND BE KEPT door, catalog drawer
     wall (`catalog_drawer`), push-block + plate puzzle opening the east wing, a locked door needing an
     `archive_key` found behind a pot puzzle, 8 enemy events, 2 chests (one wood, one iron), stairs down.
   - `archive_f2` The Reading Galleries: moving shelves, floor switches that rotate which gallery is open, the
     Echo Warden's rotunda guarding the Lantern pedestal (`lantern_pedestal`), after the lantern: hidden-ink
     bridges over ink pools that need the lantern, 8 enemies, 2 chests (Iron Pike and Chain Shirt per BATTLE.md),
     Tess letter 2, a shortcut back to F1's stairs.
   - `archive_f3` The Rootbound Stacks: dark rooms with braziers to light (lighting.dark 0.7), a crystal-switch
     sequence, a pit drop that lands you in a secret cache below (one-way ledge back), the boss key room, the boss
     door (`boss_door`), 8 enemies incl. ink wraiths, Tess letter 3.
   - `archive_boss`: the Archivore's chamber (`fragment_spot`, root passage that opens after the fight).
   Each dungeon floor must have a clear critical path, 1 to 2 optional branches with rewards, and read on screen
   without text: lit paths lead forward; dead ends hold chests.
3. `qa/maps/*.test.mjs`: every map loads, rows rectangular, legend complete, every tile/object/prop id exists in
   `tiles.json`/`props.json`, every door/exit target exists and lands on walkable ground, every STAGING.md mark
   and named event exists on its map (parse the checklist), enemy counts match `encounters.js` `ZONES[zone].plan`,
   critical path reachable with gates modeled (keys, lantern, switches), no unreachable chest.
4. `docs/MAPS.md`: an annotated overview image per map (from the preview tool) and design notes (critical path,
   puzzles, secrets).

## Verify
View every preview PNG; iterate on composition until each map reads like a shipped SNES map: focal landmarks,
varied edges (no straight tree walls), paths that lead the eye, interiors that match exterior door positions.
