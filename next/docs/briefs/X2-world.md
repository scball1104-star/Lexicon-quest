# X2-world: block art by id, ink over water, the map tool (X2 wave XA)

The small engine items the Episode 2 expansion still needs after the Episode 1 build. Read `docs/briefs/COMMON.md`, `DESIGN.md` section 5, `docs/EXPANSION_RECONCILIATION.md`, `docs/EXPANSION2_PLAN.md` sections 6 and 15 (your contract), `docs/WORLD.md` (1b abilities, breakables and `behind`, and the "Expansion 1" section X1-world wrote),
`src/world/abilities.js`, `events.js`, `cutscene.js`, `tools/maps/mapcheck.mjs` and the Episode 1 build's `tools/maps/x1_links.json` approach.

**Already built, do not rebuild:** Appraise on objects (`appraise: true`, `appraiseText`, `behind: 'appraise:<id>'`, at the existing Appraise range) and the quest-EXP primitive `give('exp', n)` are X1-world's (Episode 1 build, wave 2); atlas resolution across atlases and the pack plumbing are XP-packs'. The first draft's N1, N8 and N10 are retired. Use them; if one is missing or behaves differently from the plan, report it
rather than writing a second version.

## Items, in order

1. **N3 Block art by id.** `block` events (including `heavy`) draw any tiles.json object id given as `sprite` (`cairn_block`, `fallen_oak`, `driftwood_log`, `sluice_plug`); a heavy block satisfies a `plate` in play and in the walk model. Verify first; edit `events.js` only if the check fails (tell the maps agents what you find).
2. **N4 Hidden ink over water in a field map.** Confirm and test that an `ink_bridge_*_faint` overlay over a `water` cell is a pit until the Lantern reveals it, that the reveal radius works in a `field` area and that a fall lands on `pitTo`. Edit only if the check fails.
3. **`tools/maps/x2_check.mjs`** and its one seam line in `mapcheck.mjs` (N6): load `STAGING_X2.md` marks, treat a second ferry post, the stairs and a Keeper mirror pair as exits, and a pack-guarded door as walkable (the Appraise unlocker already exists). Used by all three maps agents.
4. **Tests** `qa/world/x2_*`: block sprite resolution and the plate rule, ink over water, two ferry events on one map, the Appraise-object walk model on a fixture (adopted, not rebuilt), and a headless walk of a test map with every new combination and zero console errors.

## Rules

- Owned paths: `src/world/x2_*.js`, minimal edits to `src/world/events.js` only if items 1 or 2 fail, `tools/maps/x2_check.mjs`, the seam line in `tools/maps/mapcheck.mjs`, `qa/world/x2_*`, `docs/WORLD_X2.md`. Not `abilities.js`, `cutscene.js`, `field.js` or `assets.js` (ask in the report).
- Pure modules stay pure. No timers in puzzles. If Appraise-on-object turned out unusable, ship the fallback switch (`X2_APPRAISE = false`, read by the maps) and say so.
- Verify: `node qa/run.mjs world`; a shot of a heavy cairn block on a plate and of a faint ink bridge over water.
- Report under 400 words: the event contracts you verified or changed (fields, defaults, save keys), the plate and heavy-block finding, the ink-over-water finding, test counts, shot paths.
