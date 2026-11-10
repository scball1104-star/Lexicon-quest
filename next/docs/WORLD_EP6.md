# World, Episode 6: gust lanes (E6-world)

Owner: E6-world, 2026-11-09. Plan: `docs/EPISODE6_PLAN.md` 4.4, 5.1, 5.2. Code: `src/data/ep6/field/` (pure rule `wind.js`,
field system `system.js`, event types and attach `events.js`, stand-in art and lane textures `art.js`, the storm tint and
lightning `storm.js`, test maps `_testwind.js`), `src/data/ep6/world.js` (the pack's `world` module). Tools:
`tools/maps/ep6_check.mjs` (+ one line in `mapcheck.mjs`). Tests: `qa/world/ep6_wind.test.mjs` (node, the real FieldScene
methods), `qa/world/ep6_lab.py` (browser, real held input; shots in `qa/world/ep6_out/<device>_*.png`). Everything is in the
ep6 pack; nothing loads before the tap prompt, and no core file was edited (mapcheck's one line aside).

**The one rule.** White wind you can see streaming one way carries the party along its arrows until something stops it.
Nothing is global and nothing has a timer: the ride is the game's, never the thumb's.

## 1. The `wind` block

```js
wind: {
  kind: 'open',                       // optional: 'open' (sky), 'duct' (F2, indoors) or 'ring' (F3): which first-ride bark
  lanes: [ '....>>>>v.....', ... ],   // a lane cell and the way it blows: '>' '<' '^' 'v'; '.' = not a lane. Map-sized.
  turned: {                           // optional: one grid per vane group (at most 3 groups), the same size as `lanes`
    a: [ '....<<<<x.....', ... ],     // when group a is turned: an arrow sets that cell's way, 'x' = calm, '.' = not in a
  },
}
```

- **Lane cells sit over void**: `cloudbank` outdoors, a duct shaft indoors. Every cell that is a lane in ANY state is `void` on
  `map.base` for every actor; only the leader, stepping from input (never in a scene, a lock or a ride), may enter a live one.
  Enemies and NPC walkers never enter lanes. A calm cell is plain cloud.
- **Entering.** The leader steps from ground (or from a stopped lane cell) onto a live lane cell, in any direction. The field
  then carries the party one cell per `RIDE_FRAMES` (8, RUN pace: the camera follows the leader, so a long ride pans by
  itself), followers through `partyFollow`; input is held for the ride; `gust_carry` at the start.
- **Stops** (`wind.js follow`). On a present mooring post: stop on that cell (`post`, `mooring_catch`). The next cell along the
  arrow is a live lane: go on (a bend is just a cell with another arrow; a ride passes from one lane into the next). The next
  cell is walkable ground (code `none`, no solid prop, no actor): land on it (`land`, `gust_land`). Anything else (solid,
  void that is not a live lane, water, a ledge, a pit, a solid prop, an actor, the map edge): stop on the current lane cell
  (`blocked`). After 64 cells or on revisiting a cell: `guard` (mapcheck forbids authoring either).
- **After a landing** followers left on lane cells hurry in along the path (input still held); the lock lifts when all stand on
  ground. Then the landing cell's own events run (a door, an exit, a step trigger), then the barks.
- **Standing on a lane** (after a post or blocked stop): step any way onto ground, or onto a live lane cell (a new ride). A
  step the way the stopped lane blows is refused when the cell ahead is closed (it is what stopped you); from a post, a step
  ahead rides on.
- **Held keys.** A direction held through a ride takes no extra step when it ends: the field refuses that direction until it is
  released (or another direction is pressed), so input is read fresh after the unlock. This applies to every stop (land,
  post, blocked). Tested with real Actors and a holding input layer (node) and with `LQ_DEBUG.press('right', 170)` (browser).
- **Vanes reset** to the authored lanes on every arrival. **No new save field.** A save on a stopped lane cell reloads there
  (able to step off: mapcheck checks every such cell in the authored lanes); one on a cell calm in the authored lanes wakes the
  party on the nearest ground; one recorded mid-lane is carried on to its stop once the field is quiet.

## 2. Event types (on `EXT`, registered when the pack loads)

| type | fields (defaults) | behaviour |
|---|---|---|
| `vane` | `group` (required: a key of `wind.turned`), `sprite` (`vane`; `fan_vane` indoors) | Solid, on ground that is never a lane, faced from ground or a mooring cell. Confirm turns its group (`vane_turn`, a 20-frame swing: input held only then, instant under reduceMotion; then the `reveal()` pan, Episode 4's, to lane cells more than 6 tiles away that changed off screen; confirm skips). Every vane of the group moves together. Refused (`buzzer`, bark `vane_would_drop` once, then a float line) when any party cell (leader, followers, a cell being stepped from) is live now and would be calm after. Frames: see section 4. |
| `mooring` | `if` / `ifNot` (a post that is not present does not stop a ride) | A post on a lane cell (in some state). Not solid; not interactable; drawn with the lanes (under the chevrons, over the streaks), its pennant streaming downwind. |

Scripts may turn a group with `field.wind.turn(group, { quiet: true })` (no sound, no swing, no pan).

**Barks** (first time, `BARKS`; E6-story's text.js lines win, world.js fills only missing ids with the plan's words):
`first_ride` (the first ride on an open map), `first_duct` (on a `kind: 'duct'` map), `first_ring` (`kind: 'ring'`),
`first_post` (the first post stop), `first_vane` (the first vane turned), `vane_would_drop` (a refused vane).

## 3. Authoring rules (mapcheck errors) and what mapcheck models

`node tools/maps/ep6_check.mjs <mapId>` prints one map's wind report; `mapcheck check` reports the same errors.
- The block parses: row counts, characters, at most 3 groups, one group per cell, every vane's group exists, every mooring on
  a lane cell. At most 3 vanes per map.
- Every lane cell (any state) sits over void, never walkable ground. A vane stands on ground that is never a lane.
- No enemy, NPC, actor or step trigger, and no arrival point (start, an in-map door landing), on a lane cell.
- Every ride from every live cell, in every state, ends (no loop, at most 64 cells).
- The search: (turned groups) x (cell); a step onto a live lane is the whole ride; a vane faced from a cell toggles its group
  when `canTurn` allows. Keys, locked doors, Dash walls, the Lantern and flag gates as the base walk (outer fixpoint).
- From every reachable state the entrance (the start or any way off the map) is reachable again.
- Every reachable stop cell on a lane can be left (ground beside it, or a ride that ends elsewhere), and a reload there in the
  authored lanes still gets home (calm on reload: listed as `rescued`).
- Every arrival reaches a vane of its floor in the authored lanes, without turning one (if the floor has vanes).
- Reported, not errors: `longRides` (a landing more than half a phone screen, 12 x 6 tiles, from the entry: the camera
  follows), `firstAt` (the state in which each event is first reached: the solution for autoplay).

## 4. Art contracts (E6-tiles' ids win; `art.js` stands in until they land)

- Terrains: `cloudbank` (collision `void`, lowest in `terrainOrder` so decks draw their edges over it), `gust_lane` (the A1
  bed with `anim`, autotiled by live lane neighbours; duct maps use `gust_duct`) with the `gust_streak` object drawn over it
  (frame = arrow * 3 + k, k following the bed). Without the bed the system draws its own body and streaks. `storm_cloud`
  counts as cloud for the lightning. Chevrons: E6-tiles' `gust_chevron` (frame = state * 4 + arrow) when present.
- `vane` / `fan_vane` objects: 16 x 32, anchor `[0, 1]` (the pole on its cell, the arrow on the tile above). With 8 frames the
  system sets `state * 4 + arrow` (arrow 0 up, 1 right, 2 down, 3 left; state 0 authored, 1 turned); with 4 frames `arrow`;
  with fewer it sets `turned` and draws a code arrow over the head itself, so a head always agrees with its lanes.
- `gust_mooring`: 16 x 32, anchor `[0, 1]`, walkable; 12 frames = downwind arrow * 3 + pennant frame, or 3 frames (pennant).
  The system draws a stop ring round its foot (`art.js paintPostRing`: a pale 2 px ellipse with a dark rim under its lower
  arc, the back half before the post and the front half after it), so a post reads as "the lane ends here".
- Chevrons are code (`art.js CHEVRON`): 7 x 7, one every other cell (`(x + y)` even), white, gold on a turned group, a dark
  trailing edge. Streaks: 3 frames, three dashes across the stream, period 16, 5 px a frame along the arrow (120 ms a frame).
- Ducts (`kind: 'duct'`): a blue bed under the grille bars on every live duct cell (`art.js tintDuctBed` recolours the bed
  art's dark gaps to `DUCT.bed` / `bedHi`; a dead shaft stays dark), and the code chevron on every cell (not every other),
  white or gold with the dark trailing edge and a 1 px dark outline (`CHEVRON.ductOl`) so it stands off the bars.
- Measured on the frame (`ep6_lab.py contrast`), two pairs, never chevron against plain cloud (a chevron always sits on its
  band): the chevron fill at least 0.2 luma above the lane band it sits on (0.957 on 0.681: +0.276), and the band at least
  0.15 luma below plain cloud (0.877: +0.196), so the lane reads across the screen. `ep6_lab.py duct`: the duct chevron at
  least 0.2 above the duct bed (+0.546). The lane art is protected: tune the measure, never brighten the art to pass it.

## 5. The storm (plan 5.2)

- Pack tint `storm` (`storm.js STORM_TINT`), on `TINTS`, `NIGHT_TINTS` and `LAMP_TINTS` (lamps light under it). Measured on
  `ep6_testring` (dark 0.5, a lamp pool): the party's floor at or above luma 0.22 (`ep6_lab.py storm`).
- Lightning: drawn after the lighting on maps under `storm` (or `lighting.lightning: true`), over cloud cells only (terrain
  `cloudbank` or none), never full screen. At most one flash start in any 240 frames (4 s), a peak of at most +0.12 luma
  (`FLASH_ALPHA` keeps `alpha * luma(color)` at 0.114), nothing under reduceMotion. `flashLevel(frame, seed, still)` is the
  deterministic schedule (E6-scene-ui may reuse it for the battle stage).

## 6. Debug

`LQ_DEBUG.wind()` (the state: live cells, turned groups, riding, hold, last ride and turn, vane frames, timings, the last
flash), `LQ_DEBUG.turnVane(vaneId)` (as confirm would; a group id turns that group), `LQ_DEBUG.windLive()` (live arrows as rows).
