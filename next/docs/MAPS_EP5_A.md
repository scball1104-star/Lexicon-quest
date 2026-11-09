# Episode 5 maps, part A (E5-maps-a)

The two pack patches of Episode 4 maps, the Saffron Wind, the Caravan Road, Saffron Haven and its four interiors. Plan:
`docs/EPISODE5_PLAN.md` 3, 4.1 to 4.5, 4.10, 5.1. Tests: `qa/maps/ep5_a_maps.test.mjs` (15). Previews:
`python tools/maps/previews/ep5_saffron_render.py [mapId] [--scale=N]` (EP5DB tiles, the pack's shade rule for running sand and
the violet shade, ep4 and ep5 sprites, the variant's tint and lamp glow, phone frames; `tools/maps/preview.py` merges only the
x1 fragment and draws no sun and shade). Coordinates are tiles, (0,0) top-left.

## 1. Patches (`src/data/maps/ep5_patches.js`, applied by `src/data/ep5/maps.js` after the ep4 pack registered)

| Map | Added | Cells |
|---|---|---|
| `ep4_vw_inn` (`withEp5Wake`) | enter trigger `ep5_wake` (`ep5_morning`, if `ep4_complete`) | (0,0) |
| | marks `mira_window` (under the guest-room window), `inn_stage`, `inn_stage_b`, `yara_table` (by the long table) | (19,3), (17,4), (16,4), (19,8) |
| `ep4_valewyn` (`withShipBerth`) | object `ship_moored` (the Saffron Wind, 6 x 4, footprint row 33, if `ep5_started`) | (30..35, 33) |
| | sign `ship_moored_sign` on the hull (`ep5_ship_moored`, read from (31,30)) | (31,31) |
| | object `ship_berth` (gangway, `ep5_board`, if `ep5_started`, ifNot `ship_boarded`), read from (32,30) facing down | (32,31) |
| | boat doors on the same cell: `berth_sail` to `ep5_ship` (5,7,'right') (if `ship_boarded`, ifNot `road_landed`); `berth_south` to `ep5_saffron` (4,27,'up') (if `road_landed`) | (32,31) |
| | marks `berth_yara` (34,28), `berth_stage` (34,30), `berth_stage_m` (33,30), `berth_stage_b` (35,30), `berth_land` (32,30) | |

Every Episode 4 cell, overlay, decor, mark and event is unchanged (tested); with Episode 4 complete and `EP5_LIVE` off the
patched maps walk exactly as Episode 4's. The berth sits on the south quay east of the Flood Road ferry (which stays at
(21..22,33)). Yara stands two rows above the party; the gangway's top cell (32,30) stays free so she can walk aboard. The
inn's marks are in the guest room, where the party wakes after the Episode 4 credits (`inn_bed` (17,7)). A save made in
the street that enters the inn by the front door starts the scene in the taproom: the walks to the guest room have no path
(the stair is a door) and the lines play where the party stands (the same limit Episode 4's wake had).

## 2. `ep5_ship` (28 x 14, field, `mystery`, `mere_still`, tint `night`, `dawn` from `ship_first_fight_done`)

Deck (`deck_planks`) x 2..21, rows 3..10, a stepped bow x 22..24; the copper rail (`ship_rail`) round it and one row of hull
planking under the south rail. Mast (16..17, 7), lanterns (6,3) and (19,3), helm (3,7), hatch (7..8, 8), lashed crates,
barrels, water jars.

| Mark | Cell | | Mark | Cell |
|---|---|---|---|---|
| deck_start (arrival, start) | (5,7) right | | yara_wheel | (2,7) |
| mira_rail | (9,3) | | deck_stage, deck_stage_b | (9,5), (10,5) |
| bram_bow | (23,6) | | bow_stage | (21,6) |
| foes_drop, foes_drop_b | (11,5), (11,9) | | gangway | (20,10) |

Triggers: `ship_enter` (`ship_night`); `bow_trig` the whole column x 21, rows 3..10 (`ship_bram`); `fight_row` the whole
column x 14, rows 3..10, if `bram_asked` (`ship_fight`): walking back aft past the mast. Door `gangway_down` (20,11, sprite
`gangway`, if `ship_first_fight_done`) to `ep5_caravan_road` (2,13,'right'). Enemy `e_e5s_first` (11,7) is the zone
plan's anchor only (`if: bram_asked, ifNot: bram_asked`: never present; the scene spawns its own two foes). No chest.
Signs: crates (3,10), (18,10); mast (16,7); lanterns (6,3), (19,3); wheel (3,7); the sea on the rails (11,2), (6,11).

## 3. `ep5_caravan_road` (52 x 28, field, `ash_road`, `desert_wind`, `respawn: 'reentry'`, shade: open sky, start `noon`)

Sand (`dune_sand` ground, the shade block's `s`): the Glass Flat x 17..21, rows 0..27, less the plinths (17,10), (18,9)
and the island (18..20, 5..6). The road (`caravan_paving`) rows 12..14 west, the east plaza (22..26, 9..15), rows 13..15 to
x 38, then up to the crest (42..51, 7..8). Sea x 0..3 and the bay (4..6, 3..11). The drop beyond the crest (41..51, 0..5,
`dune_court_out_top`) under the decal `haven_far` (overhead (41,0)).

**Casters and dials.** `ob_flat` obelisk h 3 (23,13); `ss_step` h 2 (17,10); `ss_isle` h 2 (18,9); `dial_road` (14,10, `free`,
faced from (14,11)); `dial_road_e` (27,16, `free`, faced from (27,15)).

| Hour | What the sun does on the flat |
|---|---|
| noon (start) | `ob_flat` shades (23,10..12): Omar's seat. `ss_step` (17,8..9) and `ss_isle` (18,7..8): the stair to the island. The flat runs. |
| dawn | `ob_flat` shades (17..22, 13): **the bridge**. The stones' shadows fall on the west bank; (17,9) is a dead end. |
| dusk | `ob_flat` shades the road east. The stones shade (18..21, 9..10), a patch that touches only the east bank. |

**Solution (autoplay).** From the jetty walk the road east to (14,11), face up, `dial_road` -> Dawn. Walk (16,13) east along
row 13 to (22,13), then the road east (rows 13..15) to the crest and out at (51,7). The island (noon, any time before the
dial is turned, or set noon again): from the west bank (16,8) go right to (17,8), right (18,8), up (18,7), up (18,6), right
(19,6), face up: the chest (19,5). Coming back from the Haven (arrival (50,7), noon): `dial_road_e` from (27,15) -> Dawn,
then row 13 west. The cistern: stand at (40,22) facing up, Dash Strike breaks `crack_cistern` (40,20..21, opens (40,19)),
walk to (40,18) and face up: the iron chest (40,17).

| Enemies | Cell | Move |
|---|---|---|
| `e_e5r_stalkers` (dune_stalker) | (9,20) | wander r2 |
| `e_e5r_scarabs` (dune_scarab) | (31,20) | wander r2 |
| `e_e5r_mixed` (dune_stalker) | (36,5) | wander r2 |

| Chests and finds | Cell | Contents |
|---|---|---|
| `chest_jetty` wood | (10,10) | hi_potion x2 |
| `chest_isle_bell` wood | (19,5) | caravan_bell x1, flag `bell_1_found` (if `bells_started`) |
| `chest_isle` wood | (19,5) | hi_ether x1 (ifNot `bells_started`) |
| `chest_cistern` iron | (40,17) | rolled; behind `crack_cistern` (Dash) |

Marks: `jetty` (2,13, start), `yara_jetty` (1,13), `jetty_stage` (3,13), `_m` (3,12), `_b` (3,14), `jetty_end` (0,13), `flat`
(19,13, camera), `dial` (14,10, camera), `omar_spot` (23,10), `isle` (19,6), `fire` (30,12), `fire_omar` (30,11), `fire_stage`
(30,13), `_m` (29,13), `_b` (31,13), `last_dune` (44,8), `haven_far` (46,3, camera), `east_exit` (50,7).
Triggers: `road_enter` (`road_landing`); `road_trig` the whole column x 12 (`road_shade`); `haven_view_trig` the whole column
x 44, rows 6..27 (`haven_view`). Omar (`omar`) at (23,10) in the obelisk's noon shade (the last cell of it; the obelisk's
sprite covers (23,11..12), where nothing stands). Campfire `tent_fire` (30,12, `campfire_desert`, `tent_rest`, `safe`,
`rest`) under Omar's awning (`tent_omar` (29..31, 9..11)). The Saffron Wind moored in the bay `ship_jetty` (footprint
(0..5,11), ifNot `haven_arrived`). Exit x 51, rows 6..9 to `ep5_saffron` (21,30,'up'). Signs: jetty (3,15), camp (7,10),
obelisk (23,13), flat signpost (16,15), tent (29,11), safe stones (35,17), the far Haven (46,5).

## 4. `ep5_saffron` (44 x 34, town, `saffron`, `desert_wind`, tint `dusk` until `haven_restored`, then `none`)

| Mark | Cell | | Mark | Cell |
|---|---|---|---|---|
| south_gate (start, from the road) | (21,30) | | north_gate (from the Labyrinth and the lift) | (21,5) |
| waystone (camera) | (19,28) | | bulletin (camera) | (24,28) |
| yasmin_gate | (21,25) | | waystone_stage, _m, _b | (21,27), (20,27), (22,27) |
| market | (6,11) | | sel_spot | (8,10) |
| sel_stage, _m, _b | (8,12), (7,12), (9,12) | | nasrin_bench | (11,10) |
| moonwell (Kamal) | (19,17) | | moonwell_stage, _m, _b | (19,19), (18,19), (20,19) |
| moonwell_sel | (18,18) | | inn_door, shop_door | (4,22), (40,20) |
| smithy_door, tower_door | (33,30), (26,14) | | gate_sel | (22,5) |
| gate_stage, _m, _b | (22,7), (21,7), (23,7) | | gather_sel, gather_yara | (23,5), (19,8) |
| gather_nasrin, gather_tamir | (18,8), (19,6) | | gather_trav_a, gather_trav_b | (18,6), (20,5) |
| caravan_in, _b, _c | (21,2), (22,2), (22,1) | | water_stairs (Yara), tamir_spot | (7,27), (9,27) |
| dock (the boat from Valewyn lands) | (4,27) | | roof_view (camera, the armillary) | (30,7) |
| roof_stage, _m, _b | (39,8), (38,8), (40,8) | | roof_laleh, roof_sel, roof_yara | (39,6), (37,6), (41,6) |

Doors (each lands on the interior's exit cell facing up; the interior lands back on the cell below the door): inn (4,21),
shop (40,19), smithy (33,29), tower (26,13). `north_door` (21..22, 0, if `gnomon_get`) to `ep5_lab_f1` (20,27,'up');
`gate_trig` (21..22, 4, the gap in the wall, if `star_reading_done`, `sel_gate`). `haven_boat` (4..5, 29, boat, if
`road_landed`) to `ep4_valewyn` (32,30,'up'). Exit (21..22, 33) to the road (50,7,'left').
Two-state objects: `waystone` / `waystone_still` (19,28, frame 0 / 3), `bulletin` / `bulletin_open` (24..25,28),
`moonwell` / `moonwell_rest` (19..20,18; from `moonwell_woken` also `rest`, `safe`), `bell_rack` / `bell_rack_full` (28..29,29,
frame 0 / 3); the six `loads_*` objects go with `haven_restored` (signs `loads_marks*` take their place).
NPCs: `sel` (8,10), `nasrin` (11,10), `kamal` (19,17), `yara` (7,27), `tamir` (9,27). Enter triggers `haven_enter`
(`haven_arrival`), `haven_every_road` (`every_road`). Signs: the mural (13,14, the west arcade), camels (12,16), (34,16), the
armillary (27,13), the north gate (23,4), the water stairs (2,27), the ship (8,28), each door's sign.

## 5. Interiors

| Map | From | NPCs | Marks | Exit |
|---|---|---|---|---|
| `ep5_sh_inn` | `inn` | ep5_innkeeper (3,4) | counter (3,4), inn_bed (17,7) | (10..11,11) to (4,22) |
| `ep5_sh_shop` | `item_shop` | yasmin (5,4) | counter (5,4) | (7,10) to (40,20) |
| `ep5_sh_smithy` | `smithy` | hassan (10,5) | anvil (10,5) | (8,10) to (33,30) |
| `ep5_sh_observatory` | `chapel` | laleh (5,7) | laleh_spot (5,7), rings (7,6), nasrin_spot (7,7), door_sel (8,12), reading_stage (5,9), _m (4,9), _b (6,9) | (9,13) to (26,14) |

The Armillary Tower: `reading_trig` the nave row 11 (x 1..10, if `met_sel`); the great rings `armillary_rings` (4..6, 4..6);
save bell `save_bell_tower` (12,11); star charts in two states (`charts_*` / `charts_*_new`, if/ifNot `chart_restored`) at
(2..3,1..2), (7..8,1..2), (15..16,1..2); book `haven_charts` (14,7); tint `night`, music `orrery`.

## 6. Previews (`tools/maps/previews/`, 2x, `<name>.png` annotated and `<name>_clean.png`)

`ep5_ship_night`, `ep5_ship_dawn`; `ep5_caravan_road_noon`, `_dawn`, `_dusk`, `_isle` (with `bells_started`);
`ep5_saffron` (dusk), `ep5_saffron_restored`; `ep5_sh_inn`, `ep5_sh_shop`, `ep5_sh_smithy`, `ep5_sh_observatory`;
`ep4_valewyn_ep5`, `ep4_valewyn_ep5_south`, `ep4_vw_inn_ep5`. Phone frames (844 x 390, plus the 384 x 216 screen as
`_1x`): `ep5_ship_night_phone`, `ep5_caravan_road_flat_noon_phone`, `ep5_caravan_road_flat_dawn_phone` (the teaching
screen: dial, flat, obelisk and far road in one frame, the dawn bridge landing in view), `ep5_caravan_road_isle_noon_phone`,
`ep5_saffron_centre_phone` (the armillary over the oasis), `ep5_saffron_gate_phone`, `ep5_saffron_restored_centre_phone`,
`ep4_valewyn_ep5_berth_phone`.

## 7. Notes for other agents

- `qa/maps/maps.test.mjs` line 22 needs `!/^(x[12]|ep[45])_/.test(id)` in place of `!/^(x[12]|ep4)_/.test(id)` (the Episode 5
  maps are covered by `qa/maps/ep5_a_*` and `ep5_b_*`). Until then that one test fails.
- E5-maps-b: the Labyrinth's way back to the Haven should land on `north_gate` (21,5) facing down (the gap cells (21..22,4)
  are walkable too, so the current (22,4) works). `lift_out` lands there as well; `every_road` runs on that arrival.
- `mapcheck check` needs `--pack ep5` for the pack's NPCs, lines and encounters (as `--pack ep4` for Episode 4).
- The waystone's shifting glyphs (`shiftFrames`) have no field code yet: the map shows frame 0 before `haven_restored` and
  the still frame 3 after.
