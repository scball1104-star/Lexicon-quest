# X1 south: the Lower Millrace, Hal's Mill and the Weir Culvert (X1-maps-south, X1 wave W3)

Modules: `src/data/maps/x1_millrace.js` (52 x 32 field), `x1_mill.js` (16 x 12 interior), `x1_culvert.js` (28 x 20 dungeon, dark 0.4).
They are `x1` pack files: nothing imports them; the `loadMap` guard fetches them on first entry. Tests: `qa/maps/x1_south.test.mjs`
(imports `mapcheck` and merges the x1 tile fragment, the x1 atlases and the pack's `register()` the way `ensurePack` does).
Previews (2x, annotated; the unannotated 3x versions are in `tools/maps/out/`): `tools/maps/previews/x1_millrace.png`,
`x1_mill.png`, `x1_culvert.png`, `x1_culvert_solved.png` (both plates down, blocks on them, the gate open).

Coordinates are tiles, (0,0) top-left. "Arrival" cells are where another map's link lands here.

## x1_millrace

Music `millrace`, ambience `river_birds`, `respawn: 'reentry'`, no lighting. Opens at `archive_f1_done` (the hub's oak and door gate the valley
side); the map itself is always open. `millrace_arrival` runs on enter (trigger at (0,0), `on: 'enter'`).

| Area | Cells | Contents |
|---|---|---|
| M1 Millrace Road | dirt x 22..24 y 0..4, x 21..23 y 5..14 | exit (22..24,0) to `valley` (23,38,up); arrival `valley_gate` (23,1); signpost (20,7) (`millrace_sign`, text `millrace_signpost`), mark `signpost` (21,7) |
| M2 Drovers' Road | x 3..21, a gentle bend, y 0..8 | exit (3..5,0) to `x1_downs` (40,32,up); arrival `drovers_gate` (4,1) |
| M3 Hal's Mill | prefab `x1_mill_building` anchored (25,14), x 25..31 y 8..14 | `door_mill` (28,14) to `x1_mill` (8,10,up), `if: archivore_defeated`; the sign `x1_mill_barred` on the same cell, `ifNot: archivore_defeated`; mark `mill_door` (28,15). The wheel `x1_mill_wheel` (32,14) (an `object`, 2 wide, `script: 'pin_place'`, `ifNot: mill_turning`) with `x1_mill_wheel_turning` (`if: mill_turning`, state 1). Marks `wheel` (33,13), `pin_socket` (33,15) (the cell in front of the wheel) |
| The millstone cellar | block (31,15); T of drystone x 29..33 y 16..18 | `block_stone` (31,15), heavy, sprite `x1_millstone`; mouth cell (31,16) with a hatch; `chest_mr_stone` (30,17) iron `phoenix_feather`; `chest_mr_stone_b` (32,17) wood 3 `honey_roll`. Open floor on both sides of the block (row 15), so it can be shoved either way. Mark `stone` (31,15) |
| M4 The Weir | pond bed x 36..48 y 9..15; dam cap walk y 16 x 35..49; dam face y 17..20 | dry river bed out of the north-east cliff; failed sluice (41,17); `x1_weir_sign` (45,17) (text `x1_weir`); mark `weir` (42,12). The cap row is the "narrow ledge path across the top" |
| M5 Ferrick's Landing | x 8..21 y 12..21 | `ferrick` (14,18) (mark `ferrick` is his own cell), shed `x1_weir_shed` anchored (13,17), stall, benches, the jetty x 11..12 y 20..25 (mark `jetty` (12,20): where the hay chute lands), west exit (0,12..13) to `x1_larchhill` (66,18,left), arrival `larch_gate` (1,12); orchard x 2..8 y 14..25 with `chest_mr_orchard` (4,20) wood, rolled |
| M6 Culvert Mouth | x 37..49 y 21..26 | arch `x1_culvert_arch` anchored (42,22); `culvert_door` (43,22) to `x1_culvert` (3,14,down); mark `culvert` (43,23) |
| M7 East Bank | x 36..50 y 24..31 | outcrop (cliff) x 44..48 y 26..28; `x1_crack_bank` (46,27) (rock, Dash, 2 high); `chest_mr_bank` (46,28) iron, rolled, `behind` the crack; mark `bank_crack` (46,29) (the standing cell) |
| Horizon | overhead `x1_far_windmill` at (0,26) | the Windmill, south-west corner |

Groups (2, `respawn: 'reentry'`): `e_mr_weevils` (22,24) `moss_scarab`, `mr_weevils`, wander radius 1 (the granary meadow south of the yard);
`e_mr_wolves` patrol from (34,28) right 6 / left 6 (x 34..40, y 28) `thornback_wolf`, `mr_wolves`, 8 tiles from the arch. No `chase` foe on this map.
Placement rules of plan 3.6 are tested (6 tiles from Ferrick, arrivals, doors; 3 tiles off every lane: valley gate, Drovers' gate, Larchhill gate, jetty to the
mill door, Ferrick, pin socket and the culvert mouth).

Reach (walk with `first_fight_done,archive_f1_done`): everything is reached. Without Dash `chest_mr_bank` is hidden; without Shove the two
cellar chests are sealed behind `block_stone`; nothing else needs an ability.

## x1_mill

Interior, stone walls over a wood floor, laid out like the bakery (rows 0..2 wall, floor rows 3..9, the door gap (8,10)). Arrival from the Millrace: (8,10) facing up.
Exit `mill_exit` (8,10) to `x1_millrace` (28,15,down), the cell in front of `door_mill`. Start (8,9).
Working half (west): hopper (4,5), millstones (4,7) and (6,9), flour bin (1,6), sacks, loft ladder (6,3). Living half (east): hearth (12,3), bed (14,6), rug,
`x1_flour_table` (10,7) (inspect, text `x1_flour_table`, its two states are flag driven), `mill_ledger_obj` (8,5) on a lectern
(an `object` running `list_ledger`: a `book` event cannot run a scene; the pages stay in `BOOKS` as `mill_ledger`),
`x1_sill_rolls` (8,3) (`shelf_bread`, `if: mill_done`: the four rolls on the sill). Marks `door` (8,9), `table` (10,8), `ledger` (8,6), `stones` (5,8).

## x1_culvert

Music `mystery`, ambience `river_birds`, `dark 0.4`, wall system `x1_culvert`, floors `x1_culvert_floor`, `x1_culvert_flag`, `x1_culvert_wet`.

| Room | Cells | Contents |
|---|---|---|
| A The Mouth | x 1..6 y 14..18 | arrival (3,14); `culvert_enter` on enter; the stair foot `culvert_exit` is a 2 x 2 door (3..4,13..14) to `x1_millrace` (43,23,down): door cells cannot hold a block, so two blocks can never seal the way out |
| B The Drain Hall | x 7..26 y 14..17 | `block_b1` light (9,15); `block_b2` heavy (17,17); `plate_b1` (21,15); `plate_b2` (22,17); `gate_drain` (11,13), 2 wide, sprite `x1_gate_culvert`, a door to the notch (11,11); grates on row 16 (walkable); `e_cv_blots` guard (14,16); `x1_crack_drain` (17,12) rock, Dash; `chest_cv_drain` (17,13) iron, rolled, `behind` it |
| C The Pump Room | x 4..14 y 4..10 | notch `notch_pump` (11,11) back to (11,14); `chest_cv_pin` (6,5) wood, `millstone_pin`, flag `pin_found`, behind the pipes; `e_cv_wraith` wander (9,5) radius 2; the pump (waterwheel prop) at (8,6), mark `pump` (8,7) |
| D The Hearth Landing | x 14..17 y 6..8 | `culvert_font` (15,7), 3 x 2 rune shrine, `safe`; mark `hearth` (16,8) |
| E The Sluice Chamber | x 18..26 y 3..10 | `golem_trig` column (18,4..9) (the only way in); `millstone_golem` actor (22,6) `ifNot: millstone_golem_defeated`; the failed sluice prop (21,5); `chest_cv_golem` (25,4) gold, rolled; marks `golem_spot` (22,6), `golem_chest` (25,5) |

Differences from plan 4.9: the gate is at (11,13) (under the Pump Room, whose south wall holds the notch) instead of (24,13), because (24,13) lies under the
Sluice Chamber and would have skipped the pin and the font; the Dash crack is in the hall's north face (17,12) (breakable walls need a visible face), not the south wall.

### Puzzle solution (for the autoplay bot)

Start at (3,15) (below the arrival). The shortest solution is 28 moves: walk right 5 to (8,15); push the light block right 12 (it travels (9,15) to the plate (21,15); the party ends at
(20,15); the guard at (14,16) fights on the way: it stands next to row 15); walk down 1, left 4, down 1 to (16,17); Shove the heavy block right 5 (it travels (17,17) to the plate (22,17)). The
gate opens (both plates are sources of `gate_drain`; with no Shove the heavy block does not move, so the gate stays shut). Walk to (11,14) and step up onto the gate cell (11,13) or (12,13): it lands on the notch (11,11); go
north into the Pump Room, open `chest_cv_pin` (6,5) from (6,6), come back east along row 8 to the Hearth Landing (rest at the font from (16,8)), then step into the column x 18 (rows 6..8): `golem_intro`. After
the battle `chest_cv_golem` (25,4) is opened from (25,5). The qa test searches the whole state space (light block, heavy block, party; about 1.3 million states): it is solvable only with Shove, and from every
reachable state the party can still reach a cell beside the stair foot (a block parked in front is always pushable on, and no two blocks can seal the exit).

## What differs from the plan (marks and cells)

- `x1_millrace`: `signpost` (21,7) is the road cell in front of the sign at (20,7) (the plan's (22,7) is road); `wheel` (33,13), `pin_socket` (33,15) (the plan's (33,13) lies under the wheel's overhead art);
  `bank_crack` (46,29) is the standing cell (the plan's (46,28) is the chest); `culvert` (43,23) and `mill_door` (28,15) are as planned; `door_mill` and the barred sign are on (28,14).
- `x1_mill`: the arrival is (8,10) (the interior pattern: the door gap in the second last row), not (8,11).
- `chest_mr_stone` holds only `phoenix_feather` (a placed chest pays one item plus gold); the three honey rolls are in the sibling wood chest `chest_mr_stone_b`.
- `x1_culvert`: see above (gate at (11,13), crack at (17,12)), `pin_chest` (6,6) is the standing cell, `gate` (11,14) the cell in front of the gate.
- `mill_ledger_obj` is an `object` with `script: 'list_ledger'`, not a `book`.
- The mill cat of the plan has no NPC record, so none is placed (a flour cart stands in the yard).

## Ids this map relies on (owned by the later integrate wave unless noted)

- `src/world/events.js` GATE_SPRITES pair `x1_gate_culvert` -> `[x1_gate_culvert_closed, x1_gate_culvert_open]` (tiles exist in `x1_tiles.json`) and `GATE_SPRITE_IDS` in `tools/maps/mapcheck.mjs`: today `mapcheck check x1_culvert` reports exactly one error, `gate gate_drain: sprite x1_gate_culvert`.
- Heavy block sprite override: `block_stone` has `sprite: 'x1_millstone'` (the millstone skin); `block_b2` has the default `push_block`.
- The turning wheel: `x1_mill_wheel` frames 1..4 (`turnAnim`) are not played by the engine yet; `x1_mill_wheel_turning` draws frame 1.
- `battle.js` BACKDROPS entries for `x1_battle_*` (the zones fall back to `valley` and `archive_deep` meanwhile).
- `mapcheck.mjs` `loadDb()` reads `tiles.json` and the base atlases only: until it merges `x1_tiles.json` and the x1 atlases (`mergeTileFragment`), `check x1_*` from the CLI reports every x1 id as unknown. The qa test and
  `tools/maps/out/x1_south_check.mjs` (git-ignored scratch) do the merge themselves.
- `qa/maps/maps.test.mjs` asserts the exact list of map ids; it fails once any x1 map exists (X1-maps-hub / integrate owns the update).
- Scenes: `millrace_arrival`, `culvert_entry`, `golem_intro`, `pin_place` (chains `mill_done`), `list_ledger`; text ids `millrace_signpost`, `x1_mill_barred`, `x1_mill_wheel`, `x1_weir`, `x1_flour_table`, `culvert_font`, `cliff_crack`; NPC `ferrick`; encounters `mr_weevils`, `mr_wolves`, `cv_blots`, `cv_wraith`, `millstone_golem`; sprites `npc_ferrick`, `millstone_golem`; flags `archivore_defeated`, `mill_turning`, `mill_done`, `pin_found`, `millstone_golem_defeated`; item `millstone_pin`.

## Verify

```bash
node --test qa/maps/x1_south.test.mjs           # 21 tests
node tools/maps/out/x1_south_check.mjs archive_f1_done   # scratch: check + walks with the x1 merge (git-ignored)
python tools/maps/out/x1_south_preview.py x1_millrace --scale=2 --previews   # scratch driver (merges the x1 atlases for Ferrick and the Golem)
SOLVED=1 python tools/maps/out/x1_south_preview.py x1_culvert --scale=2 --previews --tag=solved
```
