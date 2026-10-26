# X1-maps-west: Shepherd's Downs, the Loom House and the Wethers' Barrow (X1 wave W3)

Read `docs/briefs/COMMON.md`, `DESIGN.md` 5.1 to 5.3, `docs/EXPANSION_RECONCILIATION.md` (the decision log), `docs/briefs/XP-packs.md` sections 1 and 4 (your maps are pack files), `docs/MAPS.md` (conventions, event vocabulary, the walk model; sections
1 to 4 and the Whisperwood Hollow entry), `docs/EXPANSION1_PLAN.md` sections 2, 3, 4.1 to 4.3, 4.11, 5.1, 5.2, 6 and 7.3 to 7.4
(your contract), `docs/story/STAGING_X1.md` and the reports of X1-story, X1-battle, X1-world, X1-tiles and X1-sprites. Model
the code on `src/data/maps/valley.js` (a field map: roads, blobs of tall grass, shapes), `whisperwood_hollow.js` (a
mini-dungeon with a plate, a font and a boss trigger) and `archive_f2.js` (the sliding `shelf` pair on a floor switch).

## Items, in order

1. **`x1_downs`** (56 x 34): every area, event, mark, enemy and chest of 4.1: the two gate lanes and their exits (valley,
   town), **the north exit up the Ridge to the High Moor and the south-west exit down the Larchhill Road (plan 3.2)**, the horizon decals
   `x1_far_tower` (north) and `x1_far_windmill` (south-east), Thornfold (the loom door, the fold with Brindle and two ambient sheep, the well and the fading sign), the Stones with
   the thirteenth slab and the barrow door, the Old Fold with its Dash crack, the Ridge with the Appraise scarecrow (`object`
   with `appraise: true` and the chest `behind` it) and its one-way ledge, the Drovers' Road with the chain object (`ifNot: archive_f1_done`) and the south-east
   exit (open from `archive_f1_done`), three visible groups (`respawn: 'reentry'`), five strays (`stray_1`, `_2`, `_3`, `_5` here; `_4` is the valley's).
   Shapes, not rectangles (CRITIQUE_2 item 6): bending lanes, value-noise grass blobs, ragged walls.
2. **`x1_loomhouse`** (14 x 11): copy `inn` or `smithy`'s layout and exit; Tamsin, the loom, the sampler, the hearth font.
3. **`x1_barrow`** (28 x 20, dark 0.45): rooms A to G of 4.3, the slab switch with both doorways, the Shove niche, the Ossuary
   with its Dash crack, the plate puzzle and gate, the hearth before the trigger row, the Reeve's Hall with the boss actor and
   the three chests; the boss trigger runs `reeve_intro` then the encounter `barrow_reeve`.
4. **Cross-links**: your exits to `x1_millrace` (the Drovers' Road), `x1_highmoor` (north) and `x1_larchhill` (south-west) and the loom and
   barrow doors are listed in plan 3.2; a target that does not exist yet is in `tools/maps/x1_links.json` (a warning). Never edit that file.
5. **`mapcheck`**: `node tools/maps/mapcheck.mjs check` clean for your maps (ids, targets, NPC coverage, plan counts: 3, then
   2 + the boss actor), `walk x1_downs first_fight_done` (everything reachable except what 6.1 gates), `walk x1_barrow` (the
   Shove niche and the Dash chest only after the stated ability; the switch both ways; no softlock: leaving the barrow works
   from every reachable cell).
6. **`qa/maps/x1_west.test.mjs`**: the marks of 4.11, the placement rules of plan 3.6 (no foe within 6 tiles of an NPC, an
   arrival, a font or the lane centerlines; a lane walkable entrance to hamlet without passing within 3 tiles of a foe), the
   puzzle solutions as walks (the slab switch, the niche, the plate), every chest reachable by its stated ability, the return
   door of every door lands in front of it.
7. **Previews** in `tools/maps/previews/` named `x1_downs*`, `x1_loomhouse*`, `x1_barrow*` (including a `_solved` Barrow with the
   switch thrown and the plate down), viewed at 2x until they read like shipped SNES maps; `docs/maps/X1_WEST.md` with the exact
   cells, the puzzle solutions (for the autoplay bot), the enemy and chest tables and the preview paths.

## Rules

- Owned paths: `src/data/maps/x1_downs.js`, `x1_loomhouse.js`, `x1_barrow.js`, `tools/maps/previews/x1_downs*`,
  `x1_loomhouse*`, `x1_barrow*`, `qa/maps/x1_west.test.mjs`, `docs/maps/X1_WEST.md`. Not `valley.js`, `willowmere.js` (X1-maps-hub)
  and not `X1_MAPS_LISTED` (the hub flips it). A tile or sprite id that is missing is stubbed with the nearest existing id and
  named in your report.
- Every puzzle reads on a phone without text; lit paths lead forward; dead ends hold chests; the barrow door is never guarded
  by a block (blocks reset on re-entry); the boss hall has a font before its trigger.
- Your map modules are `x1` pack files: nothing imports them directly (the `loadMap` guard fetches them on first entry); node tests import `src/data/x1/index.js` and call `register()` first. EXP is not yours: encounter data and `expMul` are X1-battle's.
- No git, no em dashes, bounded commands, one browser job at a time.
- Verify: the mapcheck commands above; `python tools/maps/preview.py --all --scale=2` for your maps; `node qa/run.mjs maps`.
- Report under 400 words: marks that differ from the plan, puzzle solutions, enemy and chest tables, preview paths.
