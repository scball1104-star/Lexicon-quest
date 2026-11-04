# E4-world: tide locks, boat doors, the tint, from inside the pack (wave 4b, beside E4-tiles and E4-sprites)

Read `docs/briefs/COMMON.md`, `DESIGN.md` section 5, `docs/EPISODE4_PLAN.md` sections 4.4, 5 and 13.2 (your contract),
`docs/WORLD.md`, `src/world/events.js` (`EXT`, `SOURCE_TYPES`, gates), `src/world/ep3/index.js` and `quench.js` (how
Episode 3 attaches to the field, swaps cells, stores permanence and adds gate sources), `src/world/lighting.js`
(`TINTS`), and the reports of E4-pack (the pack skeleton) when it lands.

## Items, in order

1. **`src/data/ep4/field/tide.js`** (pure, node-tested): per-basin levels, the flooded set (`h < level`, minus floating
   pontoons), solids (grounded pontoons, unwashed forgeries), monotone washes, from a map's `tide` block (plan 4.4).
2. **Events** on `EXT` (registered from `src/data/ep4/world.js` when the pack loads): `tidewheel` (needs `lock_crank`
   unless `crank: false`; cycles its basin), `tidepost`, `pontoon`, `forgery` (permanent wash into `g.washed[mapId]`),
   `floodgate` (a gate source with `at`, `latch`, `flag`, `script`); `door` `kind: 'boat'`. The field attaches the
   tide system from inside `EXT.tidewheel.create` (idempotent per field instance). **Do not edit `src/scenes/field.js`**;
   if a draw or update hook is truly missing, wrap the field method the way `src/world/ep3/index.js` does, and if even
   that cannot work, say exactly which one line you need.
3. **Drawing:** water over flooded cells (3 frames, rim, foam), drained wet stone with weed lines, the 24-frame band by
   band rise and fall (input locked only for those frames; instant under reduceMotion), `water_rise`/`water_drain`,
   pontoon bob, the red ink cloud of a wash. Barks `first_tide`, `first_wash`, `first_float`, `first_true_ink`.
4. **Tint `flood_grey`** on `TINTS` (E4-tiles' number; at least 10% darker than `none` on a phone crop); rain uses the
   existing `rain` particles within 0.3 ms per frame.
5. **mapcheck:** `tools/maps/ep4_check.mjs` and one line in `mapcheck.mjs`: enumerate every level state (`3^k`,
   `k <= 3`) with washes as one-way unlocks, Shove dams and floodgate latches; the authoring rules of plan 4.4 and the
   softlock rules of 5.1.
6. **Tests and a test map** (`src/data/ep4/field/_testtide.js`, registered by the pack): every level, floating and
   grounded pontoons, a wash surviving a reload, a latched floodgate, a 2-level basin, levels resetting on re-entry, a
   wheel never flooding its own stand, a headless walk of the test map.

## Rules

- Owned paths: plan 11.1, row E4-world. Not `field.js`, `events.js`, `state.js`, `episodes.js` (ask in the report).
- Pure modules stay pure. No timers in puzzles. No git, no em dashes, bounded commands, one browser job at a time.
- Verify: `node qa/run.mjs world`; `python qa/world/fieldlab.py` shots of the test map at low, mid and high, a wash
  before and after, a floodgate lifting; field logic under 3 ms and a level change under 2 ms of recompute.
- Report under 400 words: event contracts (fields, defaults), the `tide` block format as built, save fields, test
  counts, shot paths, any hook you needed.
