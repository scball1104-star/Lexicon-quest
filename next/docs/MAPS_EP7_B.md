# Maps, Episode 7, part B: the Frostbound Vault and the Stillheart (E7-maps-b)

Owner: E7-maps-b, Thursday 2026-11-12 (wave 7c). Plan: `docs/EPISODE7_PLAN.md` 4.5 to 4.11, 5.4, 7.6. Staging:
`docs/story/STAGING_EP7.md` section 3. The rule and the map tool: `docs/WORLD_EP7.md`. Files: `src/data/maps/ep7_vault_f1.js`
(and the Vault kit the other three import: `vaultGrid`, `stone`, `thawFont`, `lift`), `ep7_vault_f2.js`, `ep7_vault_f3.js`,
`ep7_stillheart.js`. Tests: `qa/maps/ep7_b_maps.test.mjs`. Previews: `python qa/maps/ep7_b_preview.py [--phone]` writes
`tools/maps/previews/ep7_vault_f1*.png`, `ep7_vault_f2*.png`, `ep7_vault_f3*.png`, `ep7_stillheart*.png` (2x; the plain
`<id>.png` is annotated with every event and mark). Coordinates are x, y (tiles). Every stone is a dungeon `name_plate`.

## The decision budget (plan 4.10), as `node tools/maps/ep7_check.mjs <id>` prints it

| Map | Decisions (plan) | Walk / straight route | Reads in order (the cell read from) |
|---|---|---|---|
| `ep7_vault_f1` | **4** (4: B 2, C 2) | 81 / 81 | `ns_arvo`@14,18 `ns_liesl`@15,12 `ns_arvo_3`@28,13 `ns_sigrid`@28,10 |
| `ep7_vault_f2` | **3** (3: B 2, C 1) | 60 / 58 | `ns_hakon`@12,17 `ns_runa`@14,16 `ns_dagny_2`@18,8 |
| `ep7_vault_f3` | **5** (5) | 61 / 53 | `ns_ylva`@17,32 `ns_greta`@10,27 `ns_anders`@13,21 `ns_ylva_3`@22,19 `ns_ida`@13,12 |

12 on the Vault, plus the White Road's 4: 16. Optional: F1 1 (Oskar), F2 2 (Tuva, Kell), F3 1 (Solveig, the Lantern stone; the
plan's table said 0, the hidden stone is a read). No re-read on any critical path is more than 6 cells behind the party; the
only re-reads (F1's Arvo, F3's Ylva) are made at the furthest point reached. F3's section split: Anders is read on the
Remember landing and counted with Return (the hint's "Hold Anders, cross, then read Ida").

## `ep7_vault_f1`: The Vanishing Steps (40 x 30, dungeon, lighting none)

Ground: `_` fade, `b` frostbrick, `g` iceglass, the vault wall on rows 0..2. Music `frostbound_vault`, ambience `vault_hush`.

| Area | Cells | Contents |
|---|---|---|
| A. Thawlight Basin | b 17..23 x 24..28; the stair 19..21,29; bridge 20..21,23 | arrival (20,27) up; `to_palehaven` stairs (19..21,29, w 3, if `vault_entered`) to `ep7_palehaven` (31,7) down; **font `font_v1` (22..23,25)**, text `ep7_thawlight_basin`; `chest_a` wood `ember_tea` x2 (18,28); `lift_f1_up` (17,25, if `vault_f2_done`) to F2 (23,17); landing from F2's `lift_f2_down`: (22,26) |
| B. By Reach | the Reach gallery b 14..26 x 18..22; the Liesl landing g 10..15 x 10..14 | `ns_arvo` (15,18) path **a** column 14, rows 15..17; `ns_arvo_2` (13,14); `ns_liesl` (15,11) path **l** row 12, x 16..21; `chest_b` wood `hi_potion` x2 (25,22); foes `e_rg` mixed (23,20), `e_rw` wisps patrol (17,21), `e_ll` mixed (11,11) |
| C. Keep the Near One | the gate landing g 22..28 x 9..15; the islet g 30..34 x 3..7 | the icegate decor (23,12) is the frozen gate; `memory1_trig` (column 22, rows 9..15); `ns_liesl_2` (23,15); `ns_arvo_3` (28,14); `ns_sigrid` (28,9) path **s** (29..31,10) and (31,8..9); `ns_sigrid_2` (33,7); Arvo's second stretch **a** row 5, x 27..29 (islet to balcony; the read pans to it); foe `e_gl` wisps (26,14) |
| D. Side Gallery (optional) | lower b 2..5 x 12..15; upper b 4..9 x 4..7; neck (3,5), nook (2,5) | `ns_oskar` (10,12) path **o** row 13, x 6..9; `ns_oskar_2` (5,12); Liesl's third stretch **l** column 4, rows 8..11; `ns_liesl_3` (5,7); `chest_plaque2` iron `street_plaque` flag `street_2_found` if `streets_started` / `chest_plaque2_alt` `hi_ether` (8,4); Dash crate `crate_d` (3,5) before `chest_boots` gold `winterwatch_boots` (2,5); foe `e_sg` crawlers (7,6) |
| E. Northern Balcony | b 12..26 x 3..6; nook (13,7) | `chest_key` gold `stillheart_key` flag `stillheart_key_found` (13,3); `chest_cache` iron **1,500 gold** + `hi_potion` (19,3), the cache decor (20..21,3); Dash crate `crate_e` (13,6) before `chest_plaque3` wood plaque #3 / `ember_tea` (13,7); `lift_trig` (24,4) `vault_f1_lift`; `lift_up` (24,3) to F2 (6,26) |

Marks: `basin` (20,27), `font` (22,26), `by_reach` (20,20), `frozen_gate` and `mother_gate` (25,11), `girl_gate` (25,13),
`memory1_stage` (25,15) `_m` (24,15) `_b` (26,15), `keep_near` (25,13), `side_gallery` (4,13), `balcony` (20,5), `lift_up`
(24,4), `lift_f1_up` (17,26); bot helpers `arvo_face`, `liesl_face`, `arvo_again` (28,15), `sigrid_face` (28,10), `key_face`
(13,4), `oskar_face` (11,12), `dash_at` (4,5), `plaque3_face` (13,6).

Route as read: Arvo, cross north; Liesl, cross east onto the gate landing (the memory). Two held paths meet here; Arvo is the
oldest and his second stretch is the road to the balcony. Read Arvo again (28,14) so Liesl is the oldest, then Sigrid (28,9):
Liesl goes behind, Sigrid's bent path reaches the islet and Arvo's stretch the balcony. (Sigrid first, then Arvo again from the
landing, is the same two reads; Sigrid first and on to the islet means walking back.)

Bot: `ns_arvo` from (15,19) up; walk to (14,14); `ns_liesl` from (15,12) up; east to (22,12); `ns_arvo_3` from (28,15) up;
`ns_sigrid` from (28,10) up; (29,10) east, (31,10) north to (31,7); west along row 5 to (26,5); `chest_key` from (13,4) up;
`lift_trig` (24,4), `lift_up` (24,3). Optional: `ns_oskar` from (11,12) left, west on row 13, north on column 4; Dash at
`crate_d` from (4,5) facing left; `crate_e` from (13,5) facing down. **Font:** the bot rests at `font_v1` from (22,26) facing up
on arrival (no read).

## `ep7_vault_f2`: The Hall of Borrowed Light (40 x 30, dungeon, dark 0.45)

Ground: `.` letter_stone, `_` fade (the chasms), `#` the bell hall. `remember.start: ['d']`: Dagny held on every arrival.

| Area | Cells | Contents |
|---|---|---|
| A. Stair Foot | 2..10 x 23..27; gap 5..6,22 | arrival (6,26); `lift_down` (3,23) to F1 (23,4); **font `font_v2` (8..9,24)** |
| B. The Grip | hall 2..14 x 12..21 (letter wall block 9..14 x 12..14); the arch: frost **D** (15,16..17) in the wall column 15; the platform past it 16..20 x 14..19 | `ns_dagny` (14,18) lit beside the arch; `ns_hakon` (11,17); `ns_runa` (14,15); `ns_hakon_3` (19,14); `letter_wall` sign on the face (12,14); `memory2_trig` row 21, x 2..14; `chest_b` iron rolled (2,12); foes `e_hall` revenants (4,17), `e_hall2` mixed patrol (6,14), `e_plat` mixed (19,18) |
| C. The Bell Bay | near side 12..18 x 6..10; bell landing 22..27 x 5..10 | Hakon's path **h** column 18, rows 11..13; `ns_hakon_2` (17,10), `ns_runa_2` (12,6); `ns_dagny_2` (18,7) path **d** row 8, x 19..21; `ns_dagny_3` (22,10), `ns_runa_3` (27,10); the Listening Bell decor (24..25,5); `bell_trig` column 22, rows 6..9; Runa's path **r** column 26, rows 11..15 down to E |
| D. Side Galleries (optional) | lower 30..36 x 9..13; upper 30..33 x 4..6; nook 35..37 x 4..6 | `ns_tuva` (30,16) path **t** column 31, rows 14..15; `ns_tuva_2` (30,13); `ns_kell` (31,9) path **k** column 32, rows 7..8; `ns_kell_2` (33,6); frost **R** (34,5) is Runa's door; `page_door` (36,10), `page_flame` (36,13), `page_lost` (30,4) wood `witness_page`; `chest_d` wood `hi_potion` x2 (34,13); `reliquary_obj` (35..36,4, script `ep7_reliquary`); `chest_reliquary` gold 450 + `hi_ether` x2 (37,6) and `book_keeper` (35,6), both if `reliquary_open`; foe `e_side` knights (33,11) |
| E. Lamp Gallery | 22..33 x 16..26 | **font `font_v2b` (23..24,16)**; `ns_runa_4` (27,16); `chest_gallery` iron **1,200 gold** + `hi_ether` (32,17); `lantern_trig` row 18, x 22..33; actor `pale_lantern` (27,22) if not `lantern_defeated`; `lift_trig` row 25, x 24..30 (`vault_f2_lift`); `lift_up` (25,26, if `lantern_defeated`) to F3 (17,35); `lift_f2_down` (29,26, if `vault_f2_done`) to F1 (22,26). F1's basin lift and F3's stair land at (23,17) |

Marks: `arrival` (6,26), `grip` (12,17), `letter_wall` (12,14), `memory2_stage` (13,17) `_m` (12,17) `_b` (14,17),
`keeper_gate_m2` (12,15), `courier_snow` (6,20), `courier_stop` (13,15), `bell_bay` (24,7), `bell_stop` (24,8) `_m` (23,8) `_b`
(25,8), `side_galleries` (33,11), `reliquary` (35,5), `arena` (27,21), `lantern_spot` (27,22), `arena_stage` (27,19) `_m`
(26,19) `_b` (28,19), `lift_up` (25,25), `lift_f2_down` (29,25).

Route as read: Dagny's lamp burns by the frozen arch. Read Hakon, then Runa: Dagny, the oldest, lets go and the arch melts
(the order matters: Runa first leaves her the oldest at the bay). Over Hakon's path to the near side; read Dagny back at the
bay (18,7): her lamp lights her path to the bell, Hakon goes behind, the arch refreezes far below. From the bell, Runa's path
(still held) runs down into the Lamp Gallery. The Reliquary: from the Lamp Gallery read Tuva (Runa lets go, R melts), then Kell
in the lower gallery.

Bot: `ns_hakon` from (12,17) facing left; `ns_runa` from (14,16) facing up; east through the arch (15,16); north from (18,14)
over Hakon's path to (18,10); `ns_dagny_2` from (18,8) facing up; east along row 8 to (22,8) (`bell_trig`); south from (26,10)
over Runa's path to (26,16); rest at `font_v2b` from (24,17) facing up; south across `lantern_trig`; after the win
`lift_trig`, `lift_up` (25,26). **Fonts:** `font_v2` from (8,25) up on arrival (no read); `font_v2b` needs the three reads above
(the bot's static grid reaches it only over Runa's path, with Runa held).

## `ep7_vault_f3`: The Stillheart Sanctum (34 x 40, dungeon, tint `aurora`, dark 0.3)

Ground: `.` nave_ice, `_` fade, `#` the nave walls.

| Area | Cells | Contents |
|---|---|---|
| First landing | 8..26 x 32..37 | arrival (17,35); `lift_down` (10,33) to F2 (23,17); **font `font_v3` (21..22,33)**; `memory3_trig` row 34, x 11..26; `ns_ylva` (18,32) path **y** column 17, rows 30..31 |
| Shelter | 8..23 x 27..29 | `ns_ylva_2` (18,29); `ns_greta` (11,27) path **g** column 10, rows 24..26; `charter_shelter` (16,27); foe `e_sh` pages patrol (21,28) |
| Remember | west 7..13 x 19..23; east 19..26 x 19..23; the pillar (18,19..20 and 22..23) with the gap: frost **Y** (18,21) | `ns_greta_2` (11,23); `ns_anders` (13,20) path **a** row 21, x 14..17; `ns_solveig` (7,20, Lantern) path **s** row 21, x 4..6 to the islet 2..3 x 20..22, `ns_solveig_2` (3,22, Lantern), `chest_road_home` gold `road_home` (2,21); `ns_anders_2` (19,22); `ns_ylva_3` (21,19) her second stretch **y** column 22, rows 16..18; `keeper_trig` (22,19); `charter_remember` (24,19); foes `e_rw` knight (9,21), `e_re` mixed (25,22) |
| Return | 12..24 x 12..15; the islet 6..8 x 12..14; the low wall row 11 with frost **A** (17,11) | `ns_ylva_4` (23,15); `ns_ida` (12,12) path **i** row 13, x 9..11; `ns_ida_2` (8,12); `chest_return` iron rolled (6,13); `charter_return` (16,12); foe `e_rt` knight patrol (20,13) |
| The round door | landing 12..22 x 8..10; the passage (17,5..7); vestibule 15..19 x 3..4 | `round_door` object (16..18,7, if not `stillheart_open`, solid over the doorway) and `round_door_open` (if `stillheart_open`); `grate` locked door (16..18,2, `stillheart_key`, `door_boss`) to `ep7_stillheart` (16,20); `chest_door` wood `ember_tea` x2 (21,8); `charter_book` (13,8) |

Marks: `arrival` (17,35), `font` (21,34), `memory3_spot` (19,32), `memory3_stage` (15,32) `_m` (14,32) `_b` (16,32),
`memory3_run` (24,35), `memory3_bell` (21,32), `nave_dark` (17,20), `shelter` (16,28), `remember` and `remember_stage` (21,21)
`_m` (20,21) `_b` (22,21), `keeper_stair` (24,23), `keeper_wait_1` (20,19, beside `ns_ylva_3`), `keeper_wait_2` (13,12, beside
`ns_ida`), `keeper_wait_3` (15,8, by the round door), `return` (18,13), `round_door` (17,8), `party_stop_door` (17,10), `grate`
(17,3).

Route as read: Ylva, over to Shelter. Greta, over to the Remember landing's west half. Anders: his path through the pillar gap,
Ylva lets go and her frost door (the gap) melts. Across, read Ylva again: her second stretch opens north and the gap freezes
behind (cross first, then read). On the Return landing Anders still holds his door A shut in the low wall; read Ida and he, the
oldest, lets go: the door melts. Up to the round door; the Keeper opens it (`stillheart_open`); the key opens the grate.

Bot: `ns_ylva` from (18,33) facing up; north to (17,29); `ns_greta` from (11,28) up; north to (10,23); `ns_anders` from (13,21)
up; east through (18,21) to (19,21); `ns_ylva_3` from (21,20) up; north from (22,19) to (22,15); `ns_ida` from (12,13) up; north
through (17,11) to (17,10); after `keeper_comes`, north through (17,7..5) to (17,3); `grate` facing up. **Font:** `font_v3`
from (21,34) facing up on arrival (no read).

## `ep7_stillheart`: The Stillheart (34 x 24, dungeon, no banner)

Widened from the plan's 26 x 22 so the focus marks keep 12 from the sides (STAGING_EP7 asked for 30 or more). A round floor of
nave ice (an ellipse round (16.5, 12.5)). Lighting: tint `night` from `doors_reopened`, `none` (the thaw) from
`phantom_defeated`, else `aurora`; dark 0.25. Music none (the scenes set it), ambience `vault_hush`.

Events: `sh_after` (enter, `phantom_after`) and `sh_ending` (enter, `ep7_ending`), each guarded by its scene condition;
`nave_down` stairs (15..17,21) to F3 (17,9); `square_return` (5,12, if `phantom_defeated`) to `ep7_palehaven` (31,7), with the
`iced_door` decor (open frame) on its cell; `heart` (stillheart, 15..17 x 9..10, frame 0) and `heart_thawed` (frame 3, if
`stillheart_restored`); actor `white_phantom` (16,11, `phantom_avatar`, if not `phantom_defeated`); `page_block` (19,10, frame 0)
and `page_block_open` (frame 1, if `stillheart_restored`); `seventh_floor` inspect at `list_spot` (if `stillheart_restored`; no
floor decal exists in `ep7_tiles.json`); `phantom_trig` row 16, x 6..27 (if `stillheart_open`); the `star_stair` decor (19,8, if
`doors_reopened`) with `star_stair_sign`.

Marks: `entry` (16,20), `heart` (16,10), `party_stop` (16,14) `_m` (15,14) `_b` (17,14), `nox_enter` (16,18), `list_spot`
(16,12), `page_block` (19,11), `roof` (16,15) `_m` (15,15) `_b` (17,15), `nox_roof` (13,13), `vex_rail` (12,15), `aeris_rail`
(21,15), `stair_foot` (20,9), `square_door` (6,12). Kept for Episode 8: `stair_foot`, the `star_stair` decor, and the arrival
from Palehaven's `nave_door` (E7-maps-a; it lands on (13,14) in their draft, ground here; `roof` (16,15) is where the scene
stages the party).

## The lifts and shortcuts (plan 5.4)

| From | To | Present | Lands |
|---|---|---|---|
| F1 `lift_f1_up` (17,25) | F2 Lamp Gallery | `vault_f2_done` | (23,17), under `font_v2b`, no read to either F2 lift |
| F2 `lift_f2_down` (29,26) | F1 basin | `vault_f2_done` | (22,26), under `font_v1` |
| F1 `lift_up` (24,3) | F2 Stair Foot | always | (6,26) |
| F2 `lift_down` (3,23) | F1 balcony | always | (23,4) |
| F2 `lift_up` (25,26) | F3 first landing | `lantern_defeated` | (17,35) |
| F3 `lift_down` (10,33) | F2 Lamp Gallery | always | (23,17) |
| F1 `to_palehaven` | Palehaven's Vault door mark | `vault_entered` | (31,7) |
| Stillheart `square_return` | Palehaven's Vault door mark | `phantom_defeated` | (31,7) |

## Darkness (stand-in grades of `qa/maps/ep7_b_preview.py`, mean frame luma / the party's cell)

F1 0.85 / 0.41; F2 0.18 to 0.19 / 0.13 to 0.20 (lamp pools over the held stones); F3 0.46 / 0.25 to 0.33 (between F1 and F2,
the party at or above 0.22); the Stillheart 0.34 before, 0.39 thawed, 0.20 at night. These use ep7_mocks' assumed tints, not
the field's: E7-world's lab measures the real aurora floor at 0.597 (`WORLD_EP7.md` 4).

## Notes for the other agents

- **The integrator:** `EP7_MAPS_LISTED` is still `false`. Flipping it needs the White Road map in the same tree
  (`qa/maps/maps.test.mjs` walks every listed zone) and the assertion in `qa/battle/ep7_battle.test.mjs` (lines 88 to 91, "E7-maps-b
  flips it") turned to `true`, as E6-integrate did for Episode 6. Run `node --test qa/maps/ep7_b_maps.test.mjs` after the merge:
  with Palehaven present it also checks the two doors land on its ground.
- **E7-story:** F1's C reads re-read Arvo and let **Liesl** go; the vault_f1 hint "Arvo's lets go behind us" is loose. F1 uses
  Sigrid as C's third stone; Vidar and Lars are unused. F2's bay stone is Dagny's own (read back). F3: Ylva is read twice.
- **`tools/maps/ep7_check.mjs` (E7-world):** under `flags`, its base grid still holds every event (an absent closed door stays
  solid). The tests hand it `withFlags(map, flags)`; a one-line fix in the tool would make `mapcheck walk <id> <flags>` agree.
