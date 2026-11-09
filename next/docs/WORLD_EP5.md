# World, Episode 5: sun and shade (E5-world)

Owner: E5-world, 2026-11-08. Plan: `docs/EPISODE5_PLAN.md` 4.5, 5.1, 5.2. Code: `src/data/ep5/field/` (pure rule `shade.js`,
field system `system.js`, event types and attach `events.js`, stand-in art and textures `art.js`, test maps `_testshade.js`),
`src/data/ep5/world.js` (the pack's `world` module). Tools: `tools/maps/ep5_check.mjs` (+ one line in `mapcheck.mjs`).
Tests: `qa/world/ep5_shade.test.mjs` (node), `qa/world/ep5_lab.py` (browser shots, `qa/world/ep5_out/<device>_*.png`).
Everything is in the ep5 pack; nothing loads before the tap prompt, and no core file was edited.

**The one rule.** Sand that light reaches RUNS (collision `water`: impassable, drawn as flowing gold). Sand in shade or in the
dark HOLDS (firm, walkable, drawn under a violet shade). Nothing else in this file changes that.

## 1. The `shade` block

```js
shade: {
  hour: 'noon',                      // on entry: 'dawn' | 'noon' | 'dusk' | 'night' (night: no sun; lamps only)
  sand:   [ '....sss.....', ... ],   // 's' = sand; same size as ground (the ground tile under it is your choice)
  roof:   [ '############', ... ],   // optional, or `roof: true`: '#' = roofed, the sun never reaches it
  groove: [ '..ggggg.....', ... ],   // optional: 'g' = groove cell. A cell whose legend id starts with `groove` is one too
  tint:   false,                     // optional: keep the map's own tint (default: the tint follows the hour)
}
```

- **Sun** (dawn, noon, dusk; open-sky cells). Every open cell is lit except shadows. A caster of height h throws its shadow
  west 2h cells at dawn, north h at noon, east 2h at dusk. A shadow stops at the first **stopper**: a solid tile or wall,
  a closed gate or locked door, another caster, a lamp, a dial. Push blocks, chests, pots and NPCs do NOT stop light.
- **Windows** (roofed maps). At their `hours`, a beam `lanes` cells wide runs `reach` cells from the cell in front of the
  window; a wall ends it; a caster or lamp in it shades every cell behind it to the end of the reach.
- **Lamps** (any hour). Every cell within `r` (Chebyshev) is lit, except the cells of the lamp's own row and column behind a
  stopper. Diagonal cells are always lit (even past a wall: keep lamps away from walls you do not want lit through).
- The hour resets to `hour` on every arrival; Shoved stones and lamps stand on their authored cells again. Latched plates
  persist (`game.opened["<map>:<id>"]` and their `flag`). **No new save field.** A save made on firm sand that runs at the
  start hour wakes the party on the nearest safe cell.
- Tint per hour: dawn `dawn`, noon `desert_noon` (pack tint), dusk `dusk`, night: the map's own `lighting.tint`.

## 2. Event types (on `EXT`, registered when the pack loads)

| type | fields (defaults) | behaviour |
|---|---|---|
| `sundial` | `free` (false: needs the `gnomon` key item), `sprite` (`sundial`), `lockedText` (a lines id; else a built-in line) | Solid. Confirm opens Dawn / Noon / Dusk, the current hour marked "(now)" with the cursor on it; Cancel keeps it. Another hour: `sun_dial`, the 30-frame sweep (input held only then; instant under reduceMotion), then the camera pans to sand more than 6 tiles away that changed off screen. Frame 0 dawn, 1 noon, 2 dusk; every dial on the map shows the map's one hour. |
| `standstone` | `h` (2: 1 low block, 2 standing stone, 3 obelisk), `shove`, `push`, `sprite` (`low_block` / `standing_stone` / `obelisk` by h; `pillar_gallery` for F2) | A caster. Solid. `shove: true`: Bram's Shove (the ability, faced from the next cell) moves it one cell along its groove; `push: true` (the fallback): walking into it does. Refused when the next cell is not on its groove, not free, or when any party member would then stand on running sand (bark `sand_would_run` once, then a float line; the stone does not budge). |
| `window` | `faces` (`west` / `east` / `north` / `south`; `down` = an oculus that lights its own floor cell), `hours` (e.g. `['dawn']`), `reach` (12), `lanes` (1; extra lanes run south for east-west beams, east for north-south ones), `sprite` (`window_horizon`) | Sits ON a wall cell (an oculus on floor). Frame 1 at its hours, else 0. Not interactable. |
| `lampcart` | `r` (3), `shove`, `push`, `sprite` (`lamp_cart`) | A light (a warm `Lighting` pool on dark maps) and a stopper. Solid. Moves like a stone (`lamp_roll`). |
| `sunplate` | `when` (`'lit'` / `'shade'`), `latch`, `flag` (implies latch), `script` (once, on the first opening, when the field is quiet), `target` (gate ids), `sprite` (`sun_plate`) | A gate source (`SOURCE_TYPES`): on while its cell's light matches `when` (or latched). Frames: 0 sun dark, 1 sun glowing, 2 moon dark, 3 moon glowing. Walkable. Gates take `sprite: 'sun_gate'` or `'moon_gate'` (`GATE_SPRITES` pairs `<id>_closed` / `<id>_open`). |

**Virtual flags.** `if` / `ifNot` may name `hour:<dawn|noon|dusk|night>` (e.g. a reliquary present only at dusk). Events and
gated overlays re-check on every hour change; mapcheck models them per state.

**Barks** (first time, in `BARKS`; text.js wins, world.js fills only missing ids with the plan's lines): `first_shade` (the
leader first stands on firm sand), `first_shove_shade` (first Shove of a stone), `first_lamp` (within 4 tiles of a lamp, or
the first lamp Shove), `first_window` (a lit window within 10 tiles), `sand_would_run` (a refused Shove).

## 3. Authoring rules (mapcheck errors) and traps

- Dials, plates, groove cells and every caster and lamp stand on pavement, never sand; a dial is faced only from pavement.
- No enemy, NPC, actor or step trigger on sand; no arrival point (start, in-map landing) on sand.
- At most 3 movable casters and lamps per map; each groove (the 4-connected groove cells around a mover) at most 6 cells.
- Every arrival reaches a dial at the start hour (if the floor has dials); from every reachable state the entrance (or a way
  off the map) is reachable again; a plate's `target` is a gate of the map; a window sits on a solid cell.
- **A shadow bridge starts at its caster.** A caster right at the edge of a band makes a bridge that leads into the stone:
  leave one pavement cell between the caster and the sand, so the party can step off (the test map's obelisk, `(16, 18)`).
- **A tall caster's sprite covers the cells north of it** (h - 1 of them: 2 for an obelisk). Never put a plate or a dial
  there; a noon-shaded plate goes h cells north of its caster.
- Followers trail on cells the leader walked; mapcheck checks the leader's cell for a Shove, the field checks all three.

## 4. Drawing

Running sand: the A1 `running_sand` terrain when E5-tiles ships it (3 frames, autotiled), else a code texture (deep gold,
streaks drifting down-right, 3 frames); both get a soft bright rim where they meet anything that does not run. Shade: a
violet wash plus a 50% checker (`art.js` SHADE: `#2e1a62` at 0.54, dots `#1a0c3a` at 0.32, a darker rim on outer sides)
over every shadow cell nothing lights, and on open-sky maps over roofed cells while the sun is up. Window shafts: a warm
wash with drifting motes, plus a small light per beam cell on dark maps. All of it is drawn after the ground and under the
actors (`glass.drawBeams`). Measured (phone and desktop crop, `ep5_lab.py tint`): running minus firm sand luma 0.287 to 0.295
at no tint, 0.284 to 0.291 under `desert_noon` (96 to 102% kept), so `desert_noon` stays (`{ color: '#fff1d6', alpha: 0.22,
glow: '#fff4dc', glowAlpha: 0.05 }`). E5-tiles should re-measure with its sand.

**Stand-in art.** Until E5-tiles ships them, `art.js` adds code-drawn objects for any of these ids the tile database lacks
(after the pack's fragment merged, so a real id always wins): `sundial`, `obelisk`, `standing_stone`, `low_block`,
`pillar_gallery`, `lamp_cart`, `sun_plate` (4 frames), `window_horizon` (2), `sun_gate_closed` / `_open`, `moon_gate_closed`
/ `_open`. E5-tiles: keep these ids and frame orders, or say which differ.

## 5. Hooks used (no core edit)

`attach(field)` wraps, per field instance: `glass.reset` (then `shade.reset`), `glass.update`, `glass.drawBeams`,
`collectLights`, `syncTimeOfDay` (the hour's tint on arrival), `setFlag` (a flag set outside a scene keeps the hour's tint),
`tryLeaderStep` (`push`), `hasFlag` (`hour:`), `debugState`, the field's `abilities.resolve` (a faced `shove` stone or lamp is
Bram's first) and `abilities.shove`; and `map.recomputeCell` per map (keeps the `water` override). It runs from every shade
type's `create` and from an `engine.on('scene')` hook set in `world.js register(engine)`. **The battle sky:** every map
entry calls `setFieldHour` (src/data/ep5/sky.js) with the shade hour, an Episode 5 map's tint hour (`ep5_*` without a shade
block: dawn, dusk or night from its tint, else noon), or null; every hour change calls it again. Debug: `LQ_DEBUG.shade()`,
`LQ_DEBUG.setHour(h)`, `LQ_DEBUG.shoveCaster(id, dir)`.

E5-integrate added three small things to `attach` (pack-only): `lighting.draw` is wrapped so that on an Episode 5 map under
the night or dusk tint every field foe on screen is drawn once more over the tinted frame at `FOE_LIFT` (0.55), so its outline
and side-coded rim stay readable instead of sinking into a silhouette (measured on F1 under a forced night tint: edge contrast
0.23 to 0.54); `glass.update` steps props whose object lists `shiftFrames` (the Haven's waystone) about every 200 ms at dusk and
night; and the field's cutscene API gains `leaderAt()` (the leader's tile), which `ep5_morning` reads to stage in the guest
room or the taproom. The sundial and door gate sprites `sun_keyhole` and `door_dune` are registered here too.

## 6. mapcheck

`tools/maps/ep5_check.mjs` is installed by one line of `mapcheck.mjs`; for maps with a `shade` block or a shade event it
replaces `walk`, adds its errors to `buildGrid` (so `validate` reports them) and merges `ep5_tiles.json` and the ep5 sprite
fragments in `loadDb`. The walk searches (state, cell): every dial hour, every groove cell of every mover (one Shove per
step, refused as in the field), latched plates as one-way unlocks, with an outer fixpoint for keys, locked doors, Dash
walls, the Lantern and flag gates. Report: the usual walk shape plus `shade: { hour, dials, movers: [{ id, track }], plates,
states, nodes, stranded, firstAt }`; `firstAt[eventId]` is the breadth-first first state that touches it, as
`'<hour>|<x,y of each mover; joined>|<latched bits>'` (autoplay's dial and Shove solution), and `sandAt(hour, pos)` gives
running, firm and shade cells for previews. `node tools/maps/ep5_check.mjs <mapId>` prints one map (the two test maps by
id). `tools/maps/preview.py` does not draw shade (not E5-world's file).

## 7. Test maps and measures

`ep5_testshade` (36 x 26, open sky, noon): Lesson A's obelisk bridge at dawn, two dials, a stone Shoved three cells up its
groove and a dusk bridge to a nook, the refused Shove over a 1-cell noon shadow, a dusk-latching sun plate and its sun gate,
an `hour:dusk` light. `ep5_testshade_in` (30 x 22, roofed, dark 0.45, dawn): a dawn and a dusk window on one sand row, a
pillar Shoved into the shaft, a 7 x 7 sand square lit by a lamp on a groove with a stone throwing its line shadow.

Timings: `shade.js` 0.04 to 0.06 ms per state for 40 x 40 with 12 casters, 4 lamps and 4 windows; an hour change applies in
0.2 to 0.4 ms in the browser; shade update under 0.01 ms a frame (0.2 ms max during a sweep). Phone profile at 4x CPU
throttle: idle 56 to 61 fps, a sweep 52 to 62 fps, at parity with a plain core tint cross-fade (whose frames drop the same
way); the field's own JS stays under about 5 ms a frame there.
