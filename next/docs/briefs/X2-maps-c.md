# X2-maps-c: the Quarry, the Light, the Cistern and the Court secrets (X2 wave XD)

Read `docs/briefs/COMMON.md`, `DESIGN.md` 5.3, `docs/EXPANSION_RECONCILIATION.md`, `docs/briefs/XP-packs.md` sections 1 and 4 (your maps are pack files; the Court maps are `touches` maps gated by `x2On()`), `docs/MAPS.md` (sections 4 and 6, the beam walk), `docs/EXPANSION2_PLAN.md` sections 4.3, 4.10 to 4.12, 5, 6 and 13 (your contract), the reports of X2-maps-a and X2-maps-b, `tools/maps/x2_check.mjs` and the Court maps `court_f1.js`, `court_f2.js`, `court_f3.js` (their beam systems must not change).

## Items, in order

1. **The four dungeon maps**: `x2_quarry` (the Cairnmakers' Quarry: the two-block Shove room, the Foreman's Office, the gallery pit tell, the setting floor with the hollow cairn `cache_quarry` shown `if: waymarker_defeated`), `x2_light_f1` (the signal-gallery beam room, the oil store, the cellar's Dash pane), `x2_light_f2` (the lamp cradle, the boss ring, the hollow cairn `cache_light` shown `if: last_lamplighter_defeated`, the two-mirror lamp puzzle that sets `x2_light_lit`), `x2_cistern` (the channel with its bridges, the reservoir's heavy
   mirror, the heart, the Silver Stair). Boss actors have the encounter's id; each boss trigger runs the intro scene and the fight; a lost fight retries at a hearth or font (plan 4: hearth in the Quarry, a font in the Light, two fonts in the Cistern). Dungeons set `dark` as the plan says and respect the beam light cap (24).
2. **The three Court edits** of plan 5 (F1 closet and the Silver Stair return door, F2 niche, F3 pane and reflection). Append only. The Court's existing beam systems keep their configuration counts; `mapcheck beams` shows F1 at 32 configurations, F2 and F3 unchanged, no softlock.
3. **Tests** `qa/maps/x2_c_*.test.mjs`: every puzzle has a solving walk and no softlock; every chest is reachable under its verb; each boss plan equals its zone plan; `x2_cistern_through` opens the loop both ways; and **`qa/maps/x2_regression.test.mjs`**: flood-fill every edited map of all three maps agents (east_road, nameless_hollow, nh_chapel, court_f1, court_f2, court_f3) before and after under four flag
   sets (finished Episode 2; at the Waystation; at Court F1; at the throne), from stored goldens of the pre-X2 reachable sets, requiring old subset of new (plan 13.4). Run it against the already-built `east_road`, `nameless_hollow` and `nh_chapel` edits first and report any failure to their owners.
4. **Previews** (a `_solved` variant for Light F1, Light F2 and the Cistern puzzles) viewed; `docs/MAPS_X2_C.md`; hand over the puzzle solutions as an input list for the autoplay bot.

## Rules

- Owned paths: `src/data/maps/x2_quarry.js`, `x2_light_f1.js`, `x2_light_f2.js`, `x2_cistern.js`, the edits to `court_f1.js`, `court_f2.js`, `court_f3.js`, `qa/maps/x2_c_*.test.mjs`, `qa/maps/x2_regression.test.mjs`, `docs/MAPS_X2_C.md`, the previews of these maps.
- Heavy blocks and mirrors never enter door cells or lit bridge cells; a block or a pushable mirror never sits on a beam line without a way round. Every dungeon has a rest point before its boss. Never alter an existing Court event id, cell or mark. No git, no em dashes, bounded commands.
- Verify: `node tools/maps/mapcheck.mjs check`; `node tools/maps/mapcheck.mjs beams x2_light_f2 x2_lens_set`; previews viewed; `node qa/run.mjs maps world`.
- Report under 400 words: marks that differ from the plan, puzzle solutions, enemy and chest tables, the regression test's result, preview paths.
