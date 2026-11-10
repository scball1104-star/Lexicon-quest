# Episode 6 maps, part A (E6-maps-a)

The two pack patches of Episode 5 maps, the Airstair, Zephyr Landing and its four interiors. Plan: `docs/EPISODE6_PLAN.md`
3, 4.1 to 4.4, 4.10, 5.1. Staging: `docs/story/STAGING_EP6.md`. Tests: `qa/maps/ep6_a_maps.test.mjs` (14). Previews:
`python tools/maps/previews/ep6_airstair_render.py [mapId] [--scale=N]` (EP6DB tiles: core + x1 + ep4 + ep5 + ep6 fragments;
the live lanes drawn as E6-world's field draws them, bed, streaks and chevrons under the objects, posts as their objects;
ep4 to ep6 sprites; the variant's tint; phone frames). `tools/maps/preview.py` merges only the x1 fragment and draws no lanes.
Coordinates are tiles, (0,0) top-left. No map of part A has a vane: every lane is live in the one authored state.

## 1. Patches (`src/data/maps/ep6_patches.js`, applied by `src/data/ep6/maps.js` after the ep5 pack registered)

| Map | Added | Cells |
|---|---|---|
| `ep5_sh_inn` (`withEp6Wake`) | step trigger `ep6_wake` (`ep6_morning`, if `ep5_complete`, ifNot `ep6_morning_done`) over the guest room | (14..20, 3..9) |
| | marks `bird_sill` (the window in the wall face, a camera target), `mira_window6`, `inn_stage6`, `inn_stage6_b` | (19,2), (19,3), (18,4), (17,4) |
| `ep5_saffron` (`withSkyBerth`) | object `ship_moored` (the Saffron Wind, sail set, drawn where the bay decor has her; text `ep6_ship_berth`, if `ep6_started`) | (6..11, 33) |
| | object `sky_berth` (sprite `gangway`, `ep6_board`, if `ep6_started`, ifNot `ep6_boarded`), read from (10,27) facing down | (10,28) |
| | step trigger `sky_berth_trig` (same script and flags): the gangway is a doorway, so walking down it boards | (10,28) |
| | boat door `berth_north` (sprite `gangway`, if `ep6_boarded`) to `ep6_airstair` (12,43,'up') | (10,28) |
| | marks `berth_stage6` (6,25), `berth_stage6_m` (5,25), `berth_stage6_b` (7,25), `berth_land6` (10,27) | |

**Differs from the plan:** `ep6_wake` is a step trigger over the guest room, not an enter trigger at (0,0). The guest room and
the taproom are joined only by the stair doors and a cutscene walk never takes a door, so an enter trigger fired by a party
coming in from the street would start `ep6_morning` with every mark out of reach. The field runs the step trigger under the
leader on arrival (after the enter triggers), so it fires at `inn_bed` after the credits, on a save loaded upstairs, and on
the first step down from the stair landing (15,2) to (15,3). A trigger reads flags only; `ep5_complete` is set in the same
breath as the credits roll, so it stands for `credits5_rolled`. The plan's `berth_yara6` is not used (STAGING_EP6 agrees).
Every Episode 5 cell, overlay, decor, mark and event is unchanged and the input is never mutated (tested); with Episode 5
complete and `EP6_LIVE` off both maps walk exactly as Episode 5's. Valewyn's `haven_boat` (4..5, 29) is untouched.
Yara (`water_stairs` (7,27)) faces the sea, so the berth's triple stands two rows above her.

## 2. `ep6_airstair` (26 x 46, field, `high_moor`, `sky_wind`, tint `none`, `respawn: 'reentry'`)

Ground: `cloudbank` (void) round everything, `sea_foam` (water) rows 37..45 at the sides and under the quay, `skyplank`
decks, `skyport_paving` at the top, `basalt_stack_top` / `basalt_stack_face` faces between landings, `rope_stair` overlays
on the faces (collision none). Face styles (cycle of `ep6_tiles.json`): the base face (40..42) takes the surf style.

| Part | Cells | Contents |
|---|---|---|
| Foot | quay (6..20, 43), jetty (6..10, 44..45) | arrival `stack_foot` (12,43) (start); Yara's ship (decor, 0..5, 42..45); boat door `stack_boat` (12..13, 44, sprite `boat`, if `airstair_arrived`) to `ep5_saffron` (10,27,'up'); wood chest `chest_foot` (20,43) hi_potion x2; signs sea stack (14,42), chain (11,42), rope stair (9,42) |
| Landing 1 | (2..22, 37..39); rope stair (8, 40..42) | `mira_trig` the whole column x 12 (`mira_asks`) |
| Landing 2 | (2..22, 30..33); rope stair (18, 34..36) | `fight_row` the whole column x 11, if `mira_asked` (`airstair_fight`); enemy `e_e6a_first` (8,31) plan anchor only (never present); `e_e6a_wolves` (5,31) if `airstair_fight_done` |
| Landing 3 | west deck (2..8, 22..26), rope stair (4, 27..29); slot of cloud (9..14, 15..29); east ledge (15..22, 22..26) | **lane A** row 23, x 9..14 `>` lands (15,23); **lane A2** row 25, x 9..14 `<` lands (8,25); `first_trig` the whole column x 6 (`first_gust`); signs gust lane (8,22), cloudbank (2,26) |
| Landing 4 | deck (13..19, 15..18) + (20..23, 18); rope stair (19, 19..21) | **lane B** column x 15, rows 14..7 `^` lands (15,6); post `mo_b` (15,12); side ledge (13..14, 11..13) with `chest_post_letter` / `chest_post` (13,12) (dead_letter, flag `letter_1_found`, if `letters_started`; else hi_ether), post sign (14,11); **lane B2** column x 17, rows 7..14 `v` lands (17,15); outcrop (20..23, 12..17), cracked face `crack_outcrop` (21, 16..17, Dash, opens (21,15..17)) to the iron chest `chest_outcrop` (21,13); `e_e6a_mixed` (16,17) |
| Top | (13..20, 1..6), exit (16..17, 0) | `isles_trig` the whole row y 4 (`isles_view`); Bennet `bennet_winch` (19,2, shop `winch`), winch sign on the net (18,3); isles sign (13,3); exit north to `ep6_zephyr` (22,32,'up') |

Overhead: the great chain (11..12, rows 0..29: four copies), `isles_far` (0..9, 8..13), `storm_far` (18..25, 7..11).

| Mark | Cell | | Mark | Cell |
|---|---|---|---|---|
| stack_foot | (12,43) | | yara_boat | (6,44) |
| foot_stage, _m, _b | (8,44), (7,44), (9,44) | | chain_foot (the chain's foot on landing 2) | (12,30) |
| mira_rope, mira_stage | (15,38), (13,38) | | bram_rope (a landing below) | (9,43) |
| fight_row, foes_drop, foes_drop_b | (11,31), (8,31), (8,32) | | ilex_rope | (7,22) |
| gust_stage, _m, _b | (7,24), (6,24), (8,24) | | lane_a (lane A's mouth) | (8,23) |
| post_b (the ledge by the post) | (14,12) | | isles_far, storm_far (camera) | (5,11), (22,9) |
| bennet_winch | (19,2) | | north_exit | (16,1) |

**Phone frames (844 x 390).** Lesson A from the rope stair's top (4,26): the west deck, both streams with their chevrons and
the east ledge with lane A's landing (15,23) on one screen (`ep6_airstair_lane_a_phone.png`). Lesson B from the lane's entry
(15,15): the stream, the post with its pennant three cells up and the ledge's chest (`ep6_airstair_lane_b_phone.png`); the
top deck is the ride's end, off that screen (the camera follows: the ride is RUN pace). B2's 8-cell drop is the one long ride
(`longRides`, reported only).

**Route for the bot** (presses; `X*land` / `X*post` is one press that becomes a ride; triggers on the way run their scenes):
- Foot to the top exit (78): from (12,43) `L4 U6 R10 U6 L5 U L9 U7 R4 R*land U R4 U6 L2 U L2 U*post U*land U4 R U2`.
  Waypoints: rope stair (8,40) up to landing 1 (8,37) (crosses `mira_trig` at x 12), rope stair (18,34) to landing 2
  (18,31), west along row 30 (crosses `fight_row` at x 11) to the rope stair (4,29), up to (4,23) on landing 3 (crosses
  `first_trig` at x 6 on the way east), (8,23) then a press right: lane A to (15,23); rope stair (19,21) to landing 4
  (19,16), to (15,15), a press up: lane B stops at the post (15,12) (`first_post`), a press up: on to (15,6); up through
  `isles_trig` (y 4) to the exit (16,0).
- The letter chest: at the post (15,12) press `L` to (14,12), face left, confirm (13,12).
- The iron chest: from landing 4 stand on (21,18) facing up, Dash Strike the crack, walk up to (21,14), confirm (21,13).
- Home from the top (74): from (16,1) `D5 R D*land D3 R2 D7 L4 L*land L D L3 D6 R D R13 D6 L10 D4 R4` (lane B2 down to
  (17,15), the rope stair to the east ledge, lane A2 to (8,25), the stairs down to the quay).

Enemies: `e6a_first` 1 (scripted), `e6a_wolves` 1, `e6a_mixed` 1 (= `EP6_ZONES.ep6_airstair.plan`). Chests: wood (foot),
wood (post ledge: letter or ether), iron (behind the crack). Dash target is a cracked basalt face (`breakable: 'rock'`, the
field's rock art), not a crate: the field has no break art for `crate_dash` (see section 7).

## 3. `ep6_zephyr` (46 x 34, town, `zephyr`, `sky_wind`, tint `none`; scenes set `dawn` and `night`)

Ground: `cloudbank` round the islands, `skyport_paving` plazas, `skyplank` docks, `skybridge` stone (the south stair, the
east airstair), `skywalk` rope bridges, `grass` gardens, `spire_stone` / `spire_top` / `spire_face` for the beacon's roof
deck with `stairs_stone_*` up its face (10..11, 5..7). Overhead: `storm_far` (28..35, 5..9), framed from the plaza between the
north dock and the east rim (`ep6_zephyr_plaza_phone.png`: board, Piri, Bennet, the shop, the north dock and the storm).

| Part | Cells | Contents |
|---|---|---|
| Board plaza | (15..30, 13..25) | object `board` (21..23, 15, sprite `departure_board`, state 0, ifNot `isles_restored`) / `board_landed` (state 3, if); `post_rack` (18..19, 15); chimes `chimes_a` (17,20), `chimes_b` (27,20), `chimes_c` (22,23) (state 0, ifNot) and `_ring` twins (state 1, if `isles_restored`); shop `shop_aeris` door (27,17); houses (16..19, 21..24), (25..29, 22..25); NPCs `piri` (17,16), `bennet` (24,16) |
| South stair | (21..24, 26..33), exit (22..23, 33) to `ep6_airstair` (16,1,'down') | arrival `south_stair` (22,32), enter trigger `zephyr_arrival` |
| North dock | (16..25, 3..9), bridge (20..21, 10..12) | Kestrel (decor, overhead, 17..22, 0..2); cargo net (17..18, 6); `aeris` (19,6); **lane N** column x 17, rows 10..12 `v` lands (17,13); signs kestrel (21,3), cloudbank (16,8), lane (16,9) |
| East rim | (36..39, 5..24), bridge (31..35, 18..19) | **lane E** row 22, x 31..35 `<` lands (30,22); lane sign (36,23); storm sign (39,5) |
| Dock four | (40..45, 9..12) | `liora` (42,10); dock sign (45,11) |
| East dock | (40..45, 15..17) | `anchor_trig` the whole column x 40, if `charts_seen` (`anchor_lesson`) |
| East airstair | (40..45, 5..7) | `east_trig` the whole column x 41, if `anchor_learned` (`east_gate`); signpost (40,7); door `east_airstair` (45, 5..7, if `windward_pass`) to `ep6_obs_f1` (21,27,'up') |
| Inn island | (2..12, 14..23), bridge (13..14, 19..20) | `inn_cloudhouse` door (6,21) |
| Beacon island | (2..13, 1..11), bridge to the inn island (6..7, 12..13) | `tower_signal` door (5,9); roof deck (8..13, 1..4); beacon objects (10..11, 3): `beacon_cold` (ifNot `beacon_started`, inspect), `beacon_ring` (`beacon_light`, if `beacon_started`, ifNot `beacon_lit`), `beacon_rest` (lit, `beacon_light`, rest and save, if `beacon_lit`); `pippa` (7,10, shown from `pippa_home`) |
| Gardens | (2..11, 26..31), bridge (6..7, 24..25) | `thea` (6,28, wanders); floating flower beds over the cloud |
| Workshop island | (33..43, 27..32), bridge (37..38, 25..26) | `workshop_galewing` door (38,31) |

Enter triggers: `zephyr_enter` (`zephyr_arrival`), `zephyr_return` (`isles_return`, guarded by `library_reached`, not
`isles_restored`). No enemies.

| Mark | Cell | | Mark | Cell |
|---|---|---|---|---|
| south_stair | (22,32) | | board (camera; the board's middle) | (22,15) |
| bennet_spot | (24,16) | | board_stage, _m, _b | (22,18), (21,18), (23,18) |
| post_rack, piri_spot | (18,16), (17,16) | | crowd_a .. crowd_d | (15,22), (29,19), (16,14), (24,21) |
| dock_four (camera) | (44,11) | | liora_spot | (42,10) |
| dock_stage, _m, _b | (42,12), (41,12), (43,12) | | gangway, pippa_down | (45,10), (43,10) |
| north_dock (Kestrel arrival) | (22,5) | | aeris_net | (19,6) |
| net_stage, _m, _b | (19,8), (18,8), (20,8) | | kestrel_rail, gift_aeris | (20,3), (22,6) |
| home_stage, _m, _b | (22,8), (21,8), (23,8) | | east_dock | (42,16) |
| aeris_east | (43,15) | | anchor_stage, _m, _b | (43,17), (42,17), (44,17) |
| mira_lift, bram_spear (dock edge) | (45,16), (45,17) | | east_gate (F1's return arrival) | (44,6) |
| aeris_gate | (43,5) | | gate_stage, _m, _b | (43,7), (42,7), (44,7) |
| inn_door, shop_door | (6,22), (27,18) | | workshop_door, tower_door | (38,32), (5,10) |
| beacon_stage6, _m, _b | (10,4), (9,4), (11,4) | | tower_roof | (9,2) |
| roof_stage, _m, _b | (12,4), (11,4), (13,4) | | roof_vex, roof_aeris | (13,2), (8,2) |
| roof_view, north_far (camera) | (22,12), (24,0) | | gardens, pippa_tower | (6,28), (7,10) |
| storm_far (camera) | (31,7) | | | |

**Differs from the plan:** dock four's gangway is the berth's end cell (45,10), where Pippa steps off in `isles_return` (the
camera pans to dock four first); the Kestrel moors north of the north dock. The beacon is on a white stone roof deck east of
the tower (the tower sprite's own roof is not walkable), so the beacon scene and the ending stand on it. The plan's NPC list
for the town names `nova`; her record is in `ep6_zl_shop`.

**Routes for the bot** from `south_stair` (22,32): Aeris (19,7) `U8 L U8 L U9 L`; Liora (42,11) `U8 R U6 R14 U7 R5`; inn door
`U8 L U5 L7 D L2 D L2 D L4`; shop door `U8 R U6 R4`; tower door (5,10) `U8 L U5 L10 U5 L4 U3 L U L`; workshop door
`U8 R U5 R14 D8 L2 D5 R3`; `anchor_trig` (41,16) `U8 R U6 R14 U2 R4`; `east_trig` and the pass (44,6) `U8 R U6 R14 U7 R2 U5 R5`;
the beacon (10,4) `U8 L U5 L10 U5 L4 U3 R U3 R2 U4`. Lane N from Aeris: `D L D L D*land` to (17,13); lane E from the east
dock (41,16): `D L2 D5 L3 L*land` to (30,22).

## 4. Interiors (copied from Willowmere's, re-dressed)

| Map | From | Size | Exit | Contents |
|---|---|---|---|---|
| `ep6_zl_inn` | `inn` | 22 x 13 | (10..11, 11) to (6,22) | `ep6_innkeeper` (3,4) (inn 120); stairs (11,2) / (15,2); berths and lanterns in the guest room; marks `counter` (3,4), `inn_bed` (17,7) |
| `ep6_zl_shop` | `item_shop` | 12 x 12 | (7,10) to (27,18) | `nova` (5,4) (shop `aeris_provisions`); cargo nets, crates; mark `counter` (5,4) |
| `ep6_zl_workshop` | `smithy` | 14 x 12 | (8,10) to (38,32) | `ilex` (10,5) (shop `galewing`); brass forge (7..8, 3), anvil, rotors in for mending; mark `forge` (10,5) |
| `ep6_zl_charts` | `chapel` | 18 x 15 | (9,13) to (5,10) | `charts_trig` the whole row y 11, x 1..10, if `met_aeris` (`chart_room`); object `skychart` (4..6, 5); `suri` (14,5); save bell (12,11); manifests on the walls (2,2), (7,2), (15,2) (`star_charts` art, two states by `isles_restored`, text `ep6_manifest_wall`); book `flight_manifests` on the lectern (1,7); marks `charts_stage` (7,6), `_m` (6,6), `_b` (8,6), `aeris_table` (7,4), `liora_door` (9,12), `suri_spot` (14,5) |

## 5. Previews (`tools/maps/previews/`, 2x, `<name>.png` annotated and `<name>_clean.png`; phone frames `_phone.png` and `_2x.png`)

`ep6_airstair` (no letters) and `ep6_airstair_letters`; phone frames `ep6_airstair_lane_a`, `_lane_b`, `_top`, `_foot`.
`ep6_zephyr` (before), `ep6_zephyr_restored` (`isles_restored`, beacon lit, Pippa home), `ep6_zephyr_night` (the ending);
phone frames `ep6_zephyr_plaza`, `_arrive`, `_east`, `ep6_zephyr_restored_plaza`, `ep6_zephyr_roof`. `ep6_zl_inn`, `ep6_zl_shop`,
`ep6_zl_workshop`, `ep6_zl_charts`. `ep5_saffron_ep6` (`ep6_started`, phone `ep5_saffron_ep6_berth`), `ep5_saffron_ep6_off`
(Episode 5 complete, no Episode 6: identical to Episode 5), `ep5_sh_inn_ep6`.

## 6. Checks

`node tools/maps/mapcheck.mjs check <ids> --pack ep6` and `node tools/maps/ep6_check.mjs <id>`: no errors on the six maps
(the east airstair's door to `ep6_obs_f1` resolves once E6-maps-b's floor exists). The test covers: the patches (pure, only
add, idempotent, the input not mutated, registered over the ep5 modules by the pack), Episode 5 complete with the switch off
(the same walk, no ship, gangway, trigger or door), `ep6_started` / `ep6_boarded` (the berth, the boat to `stack_foot`, the boat
home to `berth_land6`), validation and every event reached on all six maps, NPC records once each, the zone plan, every line
read, the Airstair foot to exit through the state search (and not without the wind), every lane ride terminating with its
expected landing, nothing standing on a lane, the two lessons' phone frames, every chest reached, doors and interiors in both
directions, and every STAGING_EP6 mark of these maps present, walkable (camera targets excepted) and reached.

## 7. Notes for other agents

- **E6-maps-b:** F1's way home lands on `ep6_zephyr` `east_gate` (44,6) facing left (the causeway, off every lane);
  `kestrel_down` lands on `north_dock` (22,5). The east airstair targets `ep6_obs_f1` (21,27,'up') (plan 4.5's `alcove`).
- **Core tool files (not part A's to edit):** `tools/maps/mapcheck.mjs` `listMapIds` skips `ep[45]_patches.js` only, so
  `ep6_patches.js` is listed as a map (`x1_hub.test.mjs` then reads `undefined.events`), and `qa/maps/maps.test.mjs` line 22
  filters `^(x[12]|ep[45])_`. The one-character fixes: `ep[456]` in both.
- **Dash crates:** `createBreakable` (src/world/events.js) knows `roots`, `rock` and `glass`; a `crate_dash` object would draw
  nothing and stay walkable. Part A uses the rock crack; F1's Dash crate needs `BREAK_ART.crate` (E6-integrate).
