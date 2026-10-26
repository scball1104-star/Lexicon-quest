# X2-maps-a: the heights, the Weald, Southmere, Maren's hut and the road's branches (X2 wave XC)

Read `docs/briefs/COMMON.md`, `DESIGN.md` 5.1 to 5.3, `docs/EXPANSION_RECONCILIATION.md`, `docs/briefs/XP-packs.md` sections 1 and 4 (your maps are pack files; the edited `east_road` is a `touches` map gated by `x2On()`), `docs/MAPS.md` (all of section 6), `docs/EXPANSION2_PLAN.md` sections 1 (rule 7, the cost rules), 2, 4.1, 4.2, 4.4, 4.7, 5 and 6 (your contract), `docs/story/STAGING_X2.md` and the reports of XP-packs, X2-battle, X2-story, X2-tiles and
X2-world. Model the fields on `src/data/maps/east_road.js` and `valley.js`, the interior on `nh_inn.js`.

## Items, in order

1. **The four new maps** with every mark, event, enemy, chest, secret and landmark of plan 4: `x2_cairnwatch` (80 x 40), `x2_hut_maren`, `x2_weald` (76 x 44) and `x2_southmere` (84 x 36). Each field sets `respawn: 'reentry'`, no `fog`, area-limited mist only, at most 12 light sources, a module at most 26 KB raw. Foe placements follow plan 1 rule
   3. Each large field has one tall landmark visible from two of its routes and one far-off decal; every route has a reward within 25 tiles (plan 4). Floors differ room by room and no room floats as a rectangle in black (CRITIQUE_4 items 6 and 13). Gate every addition to `east_road` on `x2On()`.
2. **The `east_road` edit** of plan 5: the west stair (`if: saw_court`), the east stair, the ink toll bridge and its sign, the south exit, the toll box, `crack_toll`, the signposts and the two chalk objects. Append only; never change an existing id, cell, target or mark; no new enemy event.
3. **The Keeper mirror** `mirror_overlook` in Cairnwatch (door kind `mirror`, `if: mirror_sigil_get`) with its dull twin; the pair's other end is X2-maps-b's `mirror_warp_sq2`: agree the cells through your report (target `nameless_hollow` approx. (26,20)).
4. **Tests** `qa/maps/x2_a_*.test.mjs`: every chest reachable under its verb, every mark walkable, the quarry door needs the Shove, the toll bridge needs the Lantern, the west stair needs `saw_court`, the Weald has three distinct east-west routes, both loops exist (walk from the Hollow's gate to the Waystation both ways), the module size and light
   budgets; plus the shared checks (`maps.test.mjs`) green.
5. **Previews** of every new and edited map in `tools/maps/previews/`, viewed at 2x and 3x; `docs/MAPS_X2_A.md`.

## Rules

- Owned paths: `src/data/maps/x2_cairnwatch.js`, `x2_hut_maren.js`, `x2_weald.js`, `x2_southmere.js`, the edits to `east_road.js`, `qa/maps/x2_a_*.test.mjs`, `docs/MAPS_X2_A.md`, the previews of these maps. `tools/maps/x2_check.mjs` is X2-world's. Maren's hut, the ring of twelve plinths (each with its cairn), the hollow-cairn decor and the Blazed Birches follow plan 4 as reconciled; EXP is not yours.
- Every puzzle readable on a phone without text; lit paths lead forward; dead ends hold chests. If `appraise` has not shipped use the fallback of plan 15 N1 behind `X2_APPRAISE`. No git, no em dashes, bounded commands.
- Verify: `node tools/maps/mapcheck.mjs check`; `python tools/maps/preview.py --all --scale=2` (your maps); view every map until it reads like a shipped SNES map; `node qa/run.mjs maps world`.
- Report under 400 words: marks that differ from the plan, exact stair, bridge, gate and mirror cells, puzzle solutions (for the autoplay bot), enemy and chest tables, module sizes, preview paths.
