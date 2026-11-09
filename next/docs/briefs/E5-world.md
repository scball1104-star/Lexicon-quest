# E5-world: sun and shade, from inside the pack (wave 5b, beside E5-tiles and E5-sprites)

Read `docs/briefs/COMMON.md`, `DESIGN.md` section 5, `docs/EPISODE5_PLAN.md` sections 0.1, 4.5, 5 and 13.2 (your
contract), `docs/WORLD.md`, `docs/WORLD_EP4.md`, `src/data/ep4/field/**` and `src/data/ep4/world.js` (how tide locks
attach to the field from `EXT.tidewheel.create`, swap collision through overlays, call `reveal()`, lock input for an
animation and store latches), `src/world/events.js` (`EXT`, gate sources), `src/world/lighting.js` (`TINTS`, light pools),
W9's Shove in `src/world/abilities.js`, and the reports of E5-pack (the skeleton) and E5-tiles (the shade overlay recipe)
when they land.

## Items, in order

1. **`src/data/ep5/field/shade.js`** (pure, node-tested): the light rule of plan 4.5 for sun (dawn west 2h, noon north h,
   dusk east 2h, stopping at solids), windows (beam along a row or column at their hours, a caster shading the rest of the
   beam) and lamps (Chebyshev radius, shadows only along the lamp's row and column); `lit`, `running`, `plates`,
   `latches` (monotone). Under 1 ms for 40 x 40 with 12 casters and 4 lamps.
2. **Events** on `EXT` (registered from `src/data/ep5/world.js` when the pack loads): `sundial` (needs `gnomon` unless
   `free: true`; a three-row choice Dawn / Noon / Dusk, current marked, Cancel keeps it; every dial on a map shares the
   hour), `standstone` (`h`, `shove` along `groove` cells only; refuse a Shove that would leave the party on running sand,
   bark `sand_would_run`), `window`, `lampcart`, `sunplate` (`when`, `latch`, `flag`, `script`). Attach the system from
   inside `EXT.sundial.create` (idempotent per field instance; maps with only lamps attach from `EXT.lampcart.create`).
   **Do not edit `src/scenes/field.js`**; wrap a field method as Episodes 3 and 4 do if a hook is missing, and name the
   one line only as a last resort.
3. **Drawing:** running sand (the A1 frames plus a soft edge glow), the dithered violet shade layer over every shaded
   cell, lamp pools through `Lighting`, the 30-frame hour sweep (shadows shrink and regrow, tint cross-fade `dawn`, none or
   `desert_noon`, `dusk`; sand switches as the shadow passes; `sand_run`, `sand_hold`, `sun_dial`; input locked only for
   those frames; instant under reduceMotion), the off-screen pan through `reveal()` when sand more than 6 tiles away
   changes (PLAYTEST_REVIEW_6 fix 6). Barks `first_shade`, `first_shove_shade`, `first_window`, `first_lamp`.
4. **The battle sky's field link:** call `setFieldHour(hour)` (exported by E5-battle's pure `src/data/ep5/sky.js`) on
   every map entry and hour change: the current map's hour, or null off an Episode 5 map. Never import field code into
   `sky.js`.
5. **Tint `desert_noon`** (optional): measure on a phone crop; keep it only if noon reads as heat without losing the
   running/firm contrast E5-tiles measured.
6. **mapcheck:** `tools/maps/ep5_check.mjs` and one line in `mapcheck.mjs`: enumerate every state (the hours x groove
   positions of each movable caster or lamp, at most 3 movable per map, grooves at most 6) with latches as one-way unlocks;
   the authoring rules of plan 4.5 and the softlock rules of 5.1.
7. **Tests and a test map** (`src/data/ep5/field/_testshade.js`, registered by the pack): every hour, a window at its hour
   and not, a lamp shadow on its row and a lit diagonal, a Shove refused over running sand, a latched plate surviving a
   reload, hours and casters resetting on re-entry, a dial never on sand, a headless walk of the test map.

## Rules

- Owned paths: plan 11.1, row E5-world. Not `field.js`, `events.js`, `state.js`, `episodes.js`, any `ep4` file (ask in the
  report).
- Pure modules stay pure. No timers in puzzles. No git, no em dashes, bounded commands, one browser job at a time.
- Verify: `node qa/run.mjs world`; `python qa/world/fieldlab.py` shots of the test map at dawn, noon and dusk, a Shove
  before and after, a lamp room, a plate latching; field logic under 3 ms and an hour change under 1 ms of recompute.
- Report under 400 words: event contracts (fields, defaults), the `shade` block format as built, save fields (expected:
  none new), test counts, shot paths, any hook you needed, where `setFieldHour` is called.
