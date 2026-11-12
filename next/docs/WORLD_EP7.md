# World, Episode 7: name stones (E7-world)

Owner: E7-world, 2026-11-12 (wave 7b). Plan: `docs/EPISODE7_PLAN.md` 4.5, 4.10, 5.1, 5.2. Code: `src/data/ep7/field/` (pure rule
`remember.js`, field system `system.js`, event type and attach `events.js`, stand-in art and code textures `art.js`, the tints
and the aurora `aurora.js`, the test map `_testremember.js`), `src/data/ep7/world.js` (the pack's `world` module). Tools:
`tools/maps/ep7_check.mjs` (+ one line in `mapcheck.mjs`). Tests: `qa/world/ep7_remember.test.mjs` (node, the real FieldScene
methods), `qa/world/ep7_lab.py` (browser, real input; shots in `qa/world/ep7_out/<device>_*.png`, contact sheet
`qa/out/e7_world_contact.png` with `--sheet`). Everything is in the ep7 pack; no core file was edited (mapcheck's one line
aside). `EP7_LIVE` is untouched.

**The one rule.** Reading a name stone holds its path across the white. The party holds two names at once; reading a third
lets the oldest go. Names are flavor: nothing in the rule reads a name, a stone is read by confirm, and the puzzle is which two
paths, seen on the floor (DESIGN hard rule 2, EPISODE7 choice 13).

## 1. The `remember` block

```js
remember: {
  capacity: 2,                        // names held at once (2 on every Episode 7 map)
  paths: [ '....aaaa....', ... ],     // lowercase: a fade cell that is that stone's path; '.' none. Map-sized.
  frost: [ '......D.....', ... ],     // optional, uppercase: an ice cell, SOLID while that stone is held
  start: ['d'],                       // optional: held on arrival, oldest first (F2's grip)
  goal: ['lift_up'],                  // optional, mapcheck only: marks the critical path visits in order ('exit' = any way off)
  budget: 4,                          // optional, mapcheck only: a decision figure traded under plan 4.10 (say so in the map)
}
```

- Path cells sit over `fade` (collision `void`); frost cells over walkable floor. A cell has one owner.
- **Read**: the stone becomes newest held (a re-read moves it to newest); over capacity the oldest lets go. **Refused**
  (nothing changes; `buzzer`, bark `would_fade` once, then a float line) when the let-go would put fade under any party cell
  (leader, followers, a cell being stepped from) or the new hold would freeze ice under one.
- **Collision** through the override path Episode 6 uses (`map.base`, re-applied on `recomputeCell`): a path cell is `none`
  while held, `void` otherwise; a frost cell is `solid` while held, its own floor code otherwise. Enemies and NPCs never step
  onto a path or frost cell in any state (`canStep` wrap); the party and scene actors follow the collision.
- **No new save field.** Holds reset to `start` on every arrival. A save on a held path cell (or under ice) reloads on the
  nearest ground (`rescued` in `LQ_DEBUG.stones()`). A stone in Keeper ink, once found, is remembered like Episode 1's ink
  (`game.opened['<map>:ink:x,y']`, an existing field).
- **Held keys.** A read holds input for its 16-frame draw-in or fade only (instant under reduceMotion); nothing moves the
  party, so no held-key rule: a direction held across a read takes no step while locked, steps on the first free frame, and
  stops on release (tested with real Actors and a holding input layer).

## 2. The event (on `EXT`, registered when the pack loads)

| type | fields (defaults) | behaviour |
|---|---|---|
| `namestone` | `stone` (one letter, required), `name` (text key for the float line, required by mapcheck), `sprite` (`namestone` on field and town maps, `name_plate` in dungeons and interiors), `lantern` (false) | Solid, on ground, faced from ground. Confirm reads it. Two cairns with one letter are one stone (put one at each end of a path so neither side can be stranded). One float line over the stone (the name text, a dark plate drawn over the lighting, 90 frames); `stone_hold`, `stone_letgo` on a let-go, `frost_seal` when a hold freezes a door. `lantern: true`: drawn faint, "The name is too pale to read." until the raised Lantern passes within 6 tiles; the field's Lantern hint counts it. |

Frames: 0 dim, 1 lit, 2 lit and guttering. The oldest held of a full hold (the one that goes next) flickers 1 and 2 every 30
frames; under reduceMotion it rests on 2. With 4 frames (E7-tiles' choice) the oldest alternates 2 and 3.

Barks (first time, `BARKS`; E7-story's text.js lines win, world.js fills only missing ids with the plan's words):
`first_held` (first new hold), `first_letgo` (first let-go), `first_reread` (first re-read that reorders), `first_grip` (first
time within 4 tiles of a frost door its stone holds shut), `would_fade` (a refused read). Note: `first_held` names Asta, which
is right because the main path's first stone is `ns_asta`.

Scripts and labs: `field.stones.setHeld(['a', 'b'])` sets holds with no sound or animation. Debug: `LQ_DEBUG.stones()`,
`readStone(idOrLetter)`, `holdStones(order)`, `stonesOpen()`.

## 3. Drawing (art contracts; E7-tiles' ids win, `art.js` stands in until they land)

- Terrains: `fade` (void, lowest in `terrainOrder`), `snowfield`; the held path draws E7-tiles' `icepath` (A2, autotiled by
  held neighbours; ground counts as connected, fade does not) when it exists, else the code ice; footprints over it either way.
- Code layers under the actors: the ghost trail (2 px prints on every unheld path cell), the held path (draw-in from the stone
  outward over 16 frames, let-go fade over 16), frost doors (a 16 x 21 clear ice block with a frozen folded letter and a 5 px
  cap; melted: a wet patch on the floor).
- On a dark map: a warm lamp pool over every held cairn (the oldest flickers) and a faint cool light every third held path
  cell (at most 24), through `collectLights`.
- A change more than 6 tiles away and off screen pans the camera there (Episode 4's `reveal()`; confirm skips).

**Contrast, measured** (`ep7_lab.py contrast`, stand-in art, desktop and phone frames are the same 384 x 216 canvas):

| pair | rule | measured |
|---|---|---|
| ghost trail against fade | at least 0.08 below | fade 0.932, prints 0.826: **0.106** |
| held path against fade | at least 0.2 below, textured | 0.666 (sd 0.106): **0.267** |
| snow against fade | at least 0.1 below, textured | 0.809 (sd 0.039): **0.123** |
| the fade itself | flat | sd 0.008 |

Re-measure when E7-tiles' `fade`, `snowfield` and `icepath` merge; tune the measure's sampling, never brighten art to pass.

## 4. Tints and the aurora (plan 5.2)

- `whiteout` (`aurora.js WHITEOUT_TINT`, on `TINTS` only): a pale lift, drained, white haze screened over. `WHITEOUT_IN` 120
  frames, `WHITEOUT_OUT` 60 (the scene calls `s.tint`). Party floor luma **0.853**.
- `aurora` (on `TINTS`, `NIGHT_TINTS`, `LAMP_TINTS`): low, cool, slightly violet. Party floor luma **0.597** at dark 0.3 with
  lamp pools in view.
- The aurora layer: maps with `lighting.tint: 'aurora'` or `lighting.aurora: { y0, y1 }` (tile rows; default the top 9). Two
  ribbons, green over violet, 3 frames, a frame every 30 game frames, drawn under the roof decals, nothing under reduceMotion.
  Cover is quantised in 0.04 steps (at most 0.24) and moves at most one step a pixel between frames, the 2-to-0 wrap
  included (node test); measured on the real painted layers over black, grey and white: worst **0.038** luma (limit 0.05).

## 5. mapcheck (`tools/maps/ep7_check.mjs`)

`node tools/maps/ep7_check.mjs <mapId>` prints one map's report (`ep7_testremember` too); `mapcheck check` reports the same
errors. The search is (ordered hold) x (cell): at most 26 holds. A read is a move; it is allowed only if the leader's cell has
a neighbour that stays walkable (the followers can step off what fades or freezes). Keys, locked doors, Dash walls, flag gates
and the Lantern as the base walk (the party carries the Lantern on every `ep7_` map).

Errors: the block parses; at most 5 stones; every path cell over the fade and every frost cell over floor; every cairn on
ground that is never a rule cell, with such ground beside it, and a `name`; no event or arrival on a rule cell; no stranded
state (the entrance reachable from every reachable state); every chest reachable; and on the critical path (`goal`): reached,
no re-read more than 6 cells (of straight-route progress) behind the party's furthest point, a walk at most 1.3 times the
straight route (every path open), and decisions within plan 4.10 (`ep7_white_road` 4, `ep7_vault_f1` 4, `ep7_vault_f2` 3,
`ep7_vault_f3` 5: 16) or the map's traded `budget`. Reported: decisions, steps, straight route, the reads in order, and the
cells the read pans to.

## 6. The test map `ep7_testremember`

34 x 21, five stones, eight cairns, `start: ['d']`. Main path: two reads (a, then c, which lets d go and melts the far door);
walk 34, straight 32; 0 errors. Every case of the rule is reachable on it (see the file's header).
