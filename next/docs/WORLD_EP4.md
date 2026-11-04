# World, Episode 4: tide locks, boat doors, flood_grey (E4-world)

Owner: E4-world, 2026-11-04. Plan: `docs/EPISODE4_PLAN.md` 4.4, 5.1, 5.2. Code: `src/data/ep4/field/` (pure rule
`tide.js`, field system `system.js`, event types and attach `events.js`, test map `_testtide.js`), `src/data/ep4/world.js`
(the pack's `world` module). Tools: `tools/maps/ep4_check.mjs` (+ one line in `mapcheck.mjs`). Tests:
`qa/world/ep4_tide.test.mjs` (node), `qa/world/ep4_lab.py` (browser shots, `qa/world/out/ep4_*.png`). Everything is
in the ep4 pack; nothing loads before the tap prompt, and no core file was edited.

## 1. The `tide` block

```js
tide: {
  basins: { a: { start: 1, levels: 3, wheel: 'wh_a', inlet: [[x, y]] /* optional */ }, c: { start: 1, levels: 2, wheel: 'wh_c' } },
  basin:  [ '..aaaa..', ... ],   // one character per cell: the basin id, '.' none; same size as ground
  height: [ '..0012..', ... ],   // a digit on every basin cell: 0 channel floor, 1 walkway, 2 gallery
}
```

- At most 3 basins, ids one character, `levels` 2 or 3, `start` a level.
- At level L a basin cell of height h holds water when h < L. Level 0 is all dry; a basin's top (levels - 1) never floods.
- `inlet` (optional): water spreads only from those cells through water, never through a block standing on a basin cell
  (a Shove dam). Without `inlet`, every cell below the level floods.
- Give a solid ledge between two heights the height of its higher side (the step from 0 to 1 is height 1), so it goes
  under at high water and shows at mid. Stairs (`canal_stair_*`) take the lower side's height.
- Levels reset to `start` on every arrival. Washed seals and latched floodgates persist.

## 2. Event types (on `EXT`, registered when the pack loads)

| type | fields (defaults) | behaviour |
|---|---|---|
| `tidewheel` | `basin` (its cell's), `sprite` (`tide_wheel`), `crank` (true: needs `lock_crank`), `text` (`ep4_lock_wheel` / `ep4_farm_wheel` when `crank: false`, read once), `lockedText` | Confirm cycles the basin: low, mid, high, low (2 levels: low, mid, low). Frame = level. Solid. `tide_wheel`, then `water_rise` / `water_drain`, a 24-frame band animation from the wheel outward (falling: the far end first), input held only for those frames, instant under reduceMotion. Bark `first_tide` after. |
| `tidepost` | `basin`, `sprite` (`tide_post`), `text` (`ep4_tide_post`) | Frame = level. Solid. Stands on a basin cell. |
| `pontoon` | `basin`, `rides` ([1, 2]), `sprite` (`pontoon`; F2 uses `book_crate`) | On a water cell at a level in `rides`: floats (walkable, bobs 1 px, frames 1/2). Water cell, level not in rides: sunk (frame 3, water). Dry cell: grounded (frame 0, solid). Bark `first_float` when the leader first stands on one. Not interactable. |
| `forgery` | `basin` (its cell's, else give it), `h` (its cell's height; 0 off-basin), `target` (gate ids), `sprite` (`seal_paper`), `text` (`ep4_papered_door`) | Solid until washed. Washed for good the first time its basin's level is above `h` while its wet cell holds water (its own cell, or, set in a wall face, the basin cell beside it, south first). Then frame 1 with the red ink cloud and `seal_wash`, frame 2, bark `first_wash`; its `target` gates open (it is a gate source, on when washed); it stops answering confirm. Saved in `game.washed[mapId]` (sorted ids). |
| `floodgate` | `basin`, `at` (top level), `latch`, `flag`, `script`, `to`, `w` (2), `sprite` (`floodgate`), `target`, `text` (`ep4_floodgate`) | Open while its basin is at `at` or higher. `latch` or `flag`: stays open (`game.opened["<map>:<id>"]` and the flag). Its `w` cells are solid shut and walkable open; with `to`, stepping into the doorway warps. Lifts when the bands arrive (`gate_open`, shake, sparkle); far from the wheel (over 6 tiles) the camera pans to it; `script` runs once on the first opening, when the field is quiet. A gate source too (`target`). |
| `door` `kind: 'boat'` | `to`, `sprite` (default `boat`) | Episode 3's lift with a boat: `water_rise`, a short wait, the fade. The boat bobs. |

Also registered: `GATE_SPRITES` door pairs `door_canal`, `floodgate`, `door_seal`, `petition_gate` (each `_closed` /
`_open`), `petition_gate` in `COUNTING_GATES` (sockets 0 to 3), `gate` + `flags: [...]` sources on Episode 4 maps (the
Petition Gate; Episode 3's quench only attaches on its own maps), rim lights (`FIELD_LOOK`) on the eight Episode 4 field
foes, and `TINTS.flood_grey = { color: '#93a5a2', alpha: 0.62, desat: 0.38 }` (E4-tiles' mid option; measured in the game
at 23.2% darker than `none`).

**Virtual flags.** `if` / `ifNot` may name `tide:<basin><op><n>` (op `>=` `<=` `=` `<` `>`), e.g. `if: 'tide:c>=2'` for
the F2 coffer (present only while basin c is high). Events and gated overlays re-check on every level change. mapcheck
accepts them as declared. A `lantern: true` thing whose cell (or the cell under it) holds water earns `first_true_ink`
when the Lantern is raised within 6 tiles.

## 3. Drawing

Water is the `tide_water` A1 terrain autotiled over the visible water set into three cached map-sized layers (its
frames 0, 1, 2), repainted only where the water changes (cell plus neighbours, band by band). A wall face (or a door,
floodgate or seal) directly north of water gets the waterline carried up its bottom row to the tide mark of the depth
(mark 1 at face row 26, mark 2 at row 18, E4-tiles' `ep4_kit`). `lantern_chain` decor over a basin cell lays its
`lantern_reflection` and a warm light on high water (Mercy). Drained floors are the tile art (`canal_floor`).

## 4. Hooks used (no core edit)

`attach(field)` wraps, per field instance: `glass.reset` (then `tide.reset`), `glass.update`, `glass.markDirty`,
`glass.drawBeams` (water under the actors), `glass.drawFlares` (waterline, ink), `collectLights`, `useDoor` (boat),
`hasFlag` (virtual flags), `debugState`; and `map.recomputeCell` per map (keeps the collision override). It runs from
every tide type's `create` and from an `engine.on('scene')` hook set in `world.js register(engine)`, so boat doors work on
maps with no wheel. Debug: `LQ_DEBUG.tide()`, `LQ_DEBUG.turnWheel(id)`.

## 5. mapcheck

`tools/maps/ep4_check.mjs` is installed by one line of `mapcheck.mjs`; for maps with `tide` it replaces `walk`, adds its
errors to `buildGrid` (so `validate` reports them) and merges `ep4_tiles.json` and the ep4 sprite fragments in `loadDb`.
The walk searches (level state, cell): every basin at every level, washes and latches as one-way unlocks, Shove dams as
one-way removals, an outer fixpoint for keys, locked doors, Dash walls, the Lantern and flag gates (an object whose
`script` id equals a gate's flag sets it). Report: the usual walk shape plus `tide: { states, nodes, stranded,
firstAt: { eventId: 'a2b0|washedBits|latchedBits|damBits' } }` (the level state in which each event is first reached: the
wheel solution for autoplay) and `waterAt(levels)` for previews. Errors: parse problems; a free step between heights
(no stair, ledge or pontoon); a wheel whose own cell or faced cells its basin floods; an enemy, NPC, actor, step trigger
or arrival on a floodable cell; the start reaching no wheel at start levels; any reachable state that cannot get back to
the entrance or off the map; a chest on a floodable cell not reachable while dry. Tide posts count as reached by sight.
`node tools/maps/ep4_check.mjs <mapId>` prints one map. `tools/maps/preview.py` does not draw water or merge ep4 tiles
(not E4-world's file).
