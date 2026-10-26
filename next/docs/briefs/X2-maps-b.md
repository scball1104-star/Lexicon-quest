# X2-maps-b: Heronwade, the Lodge, the Isle, the Cottage and the Hollow's new gates (X2 wave XC)

Read `docs/briefs/COMMON.md`, `DESIGN.md` 5.1 to 5.3, `docs/EXPANSION_RECONCILIATION.md`, `docs/briefs/XP-packs.md` sections 1 and 4 (your maps are pack files; `nameless_hollow` and `nh_chapel` are `touches` maps gated by `x2On()`), `docs/MAPS.md` (all of section 6), `docs/EXPANSION2_PLAN.md` sections 1 (the cost rules), 2, 4.5, 4.6, 4.8, 4.9, 5 and 6 (your contract), `docs/story/STAGING_X2.md` and the reports of XP-packs, X2-battle, X2-story, X2-tiles and X2-world. Model the fields on
`east_road.js` and `valley.js`, the interiors on `nh_inn.js` and `nh_smithy.js`.

## Items, in order

1. **The four new maps** with every mark, event, enemy, chest and secret of plan 4: `x2_heronwade` (72 x 44: four boardwalk branches and an east road), `x2_reed_lodge` (shop, inn bed, the slate), `x2_isle` (48 x 32: pier, cottage, the Light's door, the boathouse, the open-air sundial puzzle, the west rocks) and `x2_keeper_cottage` (Ines, the lens
   bench, the hearth). Fields set `respawn: 'reentry'`, no `fog`, at most 12 light sources, a module at most 26 KB raw; foe placements follow plan 1 rule 3; one tall landmark and one far-off decal per large field.
2. **The `nameless_hollow` edit** of plan 5: the north-west gate (exit to `x2_weald` `entry_e`), the south gate (exit to `x2_southmere` `entry_n`, landing on the road strip outside the wall), ferry post 2, `mirror_warp_sq2` with its dull twin (to Cairnwatch `overlook`), the `lamp_beam` overhead, `crack_wall`, the pier's ink and the three signs. Keep every cell
   with x >= 36 and y 22 to 30 clear (Episode 3's sand gate) and every existing mark and NPC spot untouched. **The `nh_chapel` edit**: the crypt hatch (locked object before `x2_cistern_open`, stairs door after).
3. **Tests** `qa/maps/x2_b_*.test.mjs`: every chest reachable under its verb, every mark walkable, the toll bridge's landing joins the road's south exit, the boardwalk gap needs the Lantern, the sluice plug needs the Shove, the Nest's hollow cairn `cache_heron` appears only after Mother Glassback (`if: mother_glassback_defeated`; there is no Nest waystone chest any more), the sundial puzzle's start lights nothing and its solution opens the gate, both new Hollow gates are walkable from the town and
   land on walkable cells both ways, the Hollow's east region is untouched, the Isle ferry rides only with `court_ferry_open`; plus the shared checks green.
4. **Previews** of every new and edited map viewed at 2x and 3x; `docs/MAPS_X2_B.md`.

## Rules

- Owned paths: `src/data/maps/x2_heronwade.js`, `x2_reed_lodge.js`, `x2_isle.js`, `x2_keeper_cottage.js`, the edits to `nameless_hollow.js` and `nh_chapel.js`, `qa/maps/x2_b_*.test.mjs`, `docs/MAPS_X2_B.md`, the previews of these maps. Append only to existing maps; never change an existing id, cell, target or mark; no new enemy event on `nameless_hollow`.
- Every puzzle readable on a phone without text; dead ends hold chests; `X2_APPRAISE` fallback if needed (Appraise-on-object is X1-world's). No git, no em dashes, bounded commands.
- Verify: `node tools/maps/mapcheck.mjs check`; previews viewed; `node qa/run.mjs maps world`.
- Report under 400 words: marks that differ from the plan, exact gate, ferry and mirror cells, puzzle solutions, enemy and chest tables, module sizes, preview paths.
