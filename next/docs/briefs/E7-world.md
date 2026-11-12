# E7-world: name stones, from inside the pack (wave 7b, beside E7-tiles and E7-sprites)

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md` section 5 (hard rule 2 above all: names are story, not
mechanics), `docs/EPISODE7_PLAN.md` sections 0.1, 4.5, 4.10, 5 and 13.2 (your contract), `docs/story/EPISODE7.md` choice
13, `docs/WORLD.md`, `docs/WORLD_EP6.md` (the gust lanes as built: the attach pattern, the collision override, the
lane-cell save rule), `src/data/ep6/field/**` and `src/data/ep6/world.js`, `src/scenes/field.js` (`tryLeaderStep`,
`canStep`, `onLeaderArrived`: read only), `src/world/events.js` (`EXT`, `INTERACT_TYPES`), `src/world/lighting.js`
(`TINTS`, `NIGHT_TINTS`, `LAMP_TINTS`, light pools), and the reports of E7-pack (the skeleton) and E7-tiles (the fade,
ghost trail and stone recipes) when they land.

## Owned paths

`src/data/ep7/field/**` (`remember.js`, `events.js`, `system.js`, `art.js`, `aurora.js`, `_testremember.js`),
`src/data/ep7/world.js` (registers the EXT type, the `whiteout` and `aurora` tints, the aurora layer, the test map),
`tools/maps/ep7_check.mjs` (+ one line in `tools/maps/mapcheck.mjs`), `qa/world/ep7_*`, `docs/WORLD_EP7.md`. Not
`field.js`, `events.js`, `state.js`, `episodes.js`, any `ep6` file (ask in the report).

## Outputs (items, in order)

1. **`remember.js`** (pure, node-tested): the rule of plan 4.5 and 5.1: `compile`, `held`, `read` (hold, re-read to
   newest, let the oldest go over capacity, refuse a read that would put fade or frost under any party cell), `walkable`.
   Under 1 ms for a 40 x 40 map with 5 stones and 200 path cells.
2. **The event** on `EXT` (registered from `world.js` when the pack loads): `namestone` (`stone`, `name`, `sprite?`,
   `lantern?`), solid, faced from ground; confirm reads it; one float line with the stone's name (from E7-story's text key);
   `stone_hold`, `stone_letgo`, `buzzer` and the bark `would_fade` on a refusal. Attach the system from inside
   `EXT.namestone.create` (idempotent per field instance) and from `world.js` on every map with a `remember` block. **Do not
   edit `src/scenes/field.js`**; wrap a field method as Episodes 3 to 6 do if a hook is missing, and name the one line only
   as a last resort.
3. **Collision and frost.** Through Episode 6's override path: a path cell is `void` on `map.base` unless its stone is held;
   a frost cell is solid while its stone is held, walkable floor otherwise. Every actor obeys it (no leader-only exception
   is needed: nothing carries the party). A read locks input only for its 16-frame draw-in or fade (instant under
   reduceMotion). **A direction held across a read neither drops nor adds a step** (test it with real Actors and a holding
   input layer, the Episode 6 approach).
4. **Drawing:** the fade (flat, E7-tiles' A1 frames), the ghost trail of footprints on every unheld path cell in code, the
   held path as `icepath` with footprints, frost doors as clear ice with a frozen glint and as melted floor, stones dim / lit
   / lit-and-flickering for the oldest held; on F2 a lamp pool over every held stone through the lighting layer (the hall's
   dark shows the held set); the off-screen pan through `reveal()` when a path or frost cell more than 6 tiles away changes.
   Barks `first_held`, `first_letgo`, `first_reread`, `first_grip`.
5. **Readability, measured on the 844x390 crop, three pairs separately** (CRITIQUE_8 item 9 measured the wrong pair):
   ghost trail at least 0.08 luma below the fade; held path at least 0.2 below the fade and textured; snow ground at least
   0.1 below the fade and textured. The fade must never read as snow. Record the numbers in WORLD_EP7.
6. **Tints and the aurora:** pack tints `whiteout` (2 s in, 1 s out, the road scene only) and `aurora` (on `TINTS`,
   `NIGHT_TINTS` and `LAMP_TINTS` so lamps light), each measured with the party's floor at or above 0.22 on the phone crop;
   the aurora overhead layer (3 frames, one every 30 game frames, never more than +0.05 luma between frames, off under
   reduceMotion), with a test that asserts both limits.
7. **mapcheck:** `tools/maps/ep7_check.mjs` and one line in `mapcheck.mjs`: enumerate every state (ordered holds of up to 2
   from at most 5 stones, x the party's cell), the authoring rules of plan 4.5 and the softlock rules of 5.1: the entrance
   reachable from every reachable state, every chest reachable, no cell in two paths or two frost doors, at most 5 stones a
   map, every path cell within one phone screen of its stone (or the read pans), and **no loop home** (the shortest
   critical-path solution never re-reads a stone more than 6 cells behind the party and walks at most 1.3 times the straight
   route). Print each map's decision count against plan 4.10.
8. **Tests and a test map** (`_testremember.js`, registered by the pack): a read and a crossing, two held at once, the third
   letting the first go, a re-read reordering, a refused read (fade under the party) and a refused hold (frost under the
   party), a frost door melting when its stone goes, `start` holds on arrival, holds resetting on re-entry, no new save
   field, a save on a held path cell reloading on ground, an enemy never standing on a path cell, a headless walk of the test
   map, and the held-key case.

## Done when

The test map plays every case above headless and in `fieldlab` shots; field logic is under 3 ms a frame and a read under 1
ms of recompute; `node qa/run.mjs world` is green; `docs/WORLD_EP7.md` records the event contract, the `remember` block as
built and the three contrast numbers.

## Tests to run

`node qa/run.mjs world`; `python qa/world/fieldlab.py` shots of the test map (a read before and after, a let-go, a frost
door both ways, the ghost trail beside a held path, the F2 lamp pools, the aurora tint with a lamp); `node
tools/maps/mapcheck.mjs check` on the test map.

## Traps

- **`field.js` remembers defeated foes per map id for the scene's whole life.** Nothing here should depend on that; if you
  rebuild a map's entities on re-entry, foes stay as the field decides.
- **Names are flavor** (EPISODE7 choice 13): nothing in the rule may depend on a stone's name; a stone is read by confirm.
- **`qa/world/out` images are rewritten by the world suite**: restore them with `git checkout -- next/qa/world/out` (the
  orchestrator does; you never run git: say so if you rewrote them). Never commit them.
- **No new save field.** Stones reset on every arrival.
- **Hot file `field.js`**: not yours. Wrap.
- Pure modules stay pure. No timers in puzzles. House rules: no git; LF endings (count CR bytes before and after: zero); no
  em dashes; stay in owned paths; bound every command; one browser job at a time; rerun a flaky `walks` or
  `abilities_walks` alone.

## Report (under 400 words)

The event contract (fields, defaults), the `remember` block as built, save fields (expected: none new), the held-key
result, the three contrast numbers and the tint and aurora numbers, test counts, shot paths, any hook you needed.
