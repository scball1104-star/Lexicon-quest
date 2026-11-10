# E6-world: gust lanes, from inside the pack (wave 6b, beside E6-tiles and E6-sprites)

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md` section 5, `docs/EPISODE6_PLAN.md` sections 0.1, 4.4, 5 and
13.2 (your contract), `docs/WORLD.md`, `docs/WORLD_EP5.md`, `src/data/ep5/field/**` and `src/data/ep5/world.js` (how sun
and shade attaches to the field from `EXT.sundial.create` and from `world.js` on every map, overrides collision on
`map.base`, wraps `tryLeaderStep`, `canStep`-adjacent methods and `onLeaderArrived`, calls `reveal()`, locks input for an
animation, snaps followers), `src/scenes/field.js` (`tryLeaderStep`, `canStep`, `onLeaderArrived`, `partyFollow`: read
only), `src/world/actors.js` (`startStep`, `forceStep`), `src/world/events.js` (`EXT`, `INTERACT_TYPES`),
`src/world/lighting.js` (`TINTS`, `NIGHT_TINTS`, `LAMP_TINTS`, light pools), W9's Shove in `src/world/abilities.js`, and the
reports of E6-pack (the skeleton) and E6-tiles (the chevron and streak recipe) when they land.

## Owned paths

`src/data/ep6/field/**` (`wind.js`, `events.js`, `system.js`, `art.js`, `_testwind.js`), `src/data/ep6/world.js`
(registers the EXT types, the `storm` tint, the soft lightning layer, the test map), `tools/maps/ep6_check.mjs` (+ one line
in `tools/maps/mapcheck.mjs`), `qa/world/ep6_*`, `docs/WORLD_EP6.md`. Not `field.js`, `events.js`, `state.js`,
`episodes.js`, any `ep5` file (ask in the report).

## Outputs (items, in order)

1. **`wind.js`** (pure, node-tested): the rule of plan 4.4 and 5.1: `compile`, `live`, `ride` (stops: land, post,
   blocked, guard; bends; lane to lane), `canTurn`. Under 1 ms for a 42 x 40 map with 3 vanes and 300 lane cells.
2. **Events** on `EXT` (registered from `world.js` when the pack loads): `vane` (`group`, toggles its group, refused with
   bark `vane_would_drop` if a party member's cell would go calm; every vane of a group moves together) and `mooring` (a
   stop on a lane cell). Attach the system from inside `EXT.vane.create` (idempotent per field instance) and from
   `world.js` on every map with a `wind` block (maps with lanes and no vane). **Do not edit `src/scenes/field.js`**; wrap a
   field method as Episodes 3 to 5 do if a hook is missing, and name the one line only as a last resort.
3. **The carry.** Wrap the leader's step so stepping from ground onto a live lane cell is allowed (only the leader: enemies
   and walkers never enter lanes); on `onLeaderArrived` on a lane cell, lock input, step the leader along `ride` with
   `startStep` at RUN pace, followers through `partyFollow`, play `gust_carry`, then `gust_land` or `mooring_catch`, and
   unlock. **A direction key held through a ride must not take an extra step on landing**: read input fresh after the
   unlock (clear the held direction once if the input layer repeats it).
4. **Drawing:** the A1 lane frames, chevrons in code (one every other cell, following each cell's arrow, size and colour
   from E6-tiles), calm cells plain cloud, vanes' arrows on the tile above the pole agreeing with their lanes, the 20-frame
   vane swing (input locked only for those frames; instant under reduceMotion), the off-screen pan through `reveal()` when
   a lane cell more than 6 tiles away changes (PLAYTEST_REVIEW_6 fix 6). Barks `first_ride`, `first_post`, `first_vane`,
   `first_duct`, `first_ring`.
5. **Tint and lightning:** the pack tint `storm` (on `TINTS`, `NIGHT_TINTS` and `LAMP_TINTS` so lamps light), measured on
   the phone crop with the party's floor at or above 0.22; the soft lightning layer of plan 5.2 (at most +0.12 luma, at
   most once in 4 s, off under reduceMotion), with a test that asserts both limits.
6. **mapcheck:** `tools/maps/ep6_check.mjs` and one line in `mapcheck.mjs`: enumerate every state (vane groups x the
   party's cell), the authoring rules of plan 4.4 and the softlock rules of 5.1 (every lane path terminates in every state;
   every `blocked` stop cell can step off or ride back; the entrance reachable from every reachable state; every landing
   cell within one phone screen of its entry or the ride pans).
7. **Tests and a test map** (`_testwind.js`, registered by the pack): a straight ride, a bend, a post stop, a blocked stop
   and stepping off it, lane to lane, a vane toggle and its refusal, the loop guard, vanes resetting on re-entry, no new
   save field, a save on a lane cell reloading on that cell able to step off, an enemy never entering a lane, a headless
   walk of the test map, and the held-key landing (one cell, no extra step).

## Done when

The test map plays every case above headless and in `fieldlab` shots; field logic is under 3 ms a frame and a vane toggle
under 1 ms of recompute; `node qa/run.mjs world` is green; `docs/WORLD_EP6.md` records the event contracts and the `wind`
block as built.

## Tests to run

`node qa/run.mjs world`; `python qa/world/fieldlab.py` shots of the test map (a ride before and after, a post, a vane in
both states, a ring, the storm tint with a lamp pool); `node tools/maps/mapcheck.mjs check` on the test map.

## Traps

- **`field.js` remembers defeated foes per map id for the scene's whole life.** Nothing here should depend on that; if you
  rebuild a map's entities on re-entry, foes stay as the field decides.
- **Forced movement and held keys** (item 3): bots press and release cleanly; real thumbs hold. The realplay test of plan 12
  (E6-integrate's `qa/realplay/ep6field.py`) will catch it; catch it first in your own test.
- **`qa/world/out` images are rewritten by the world suite**: restore them with `git checkout -- next/qa/world/out` (the
  orchestrator does; you never run git: say so if you rewrote them). Never commit them.
- **No new save field.** Vanes reset on every arrival.
- **Hot file `field.js`**: not yours. Wrap.
- Pure modules stay pure. No timers in puzzles. House rules: no git; LF endings (count CR bytes before and after: zero); no
  em dashes; stay in owned paths; bound every command; one browser job at a time; rerun a flaky `walks` or
  `abilities_walks` alone.

## Report (under 400 words)

Event contracts (fields, defaults), the `wind` block format as built, save fields (expected: none new), the held-key
handling, test counts, shot paths, any hook you needed, the tint and lightning numbers.
