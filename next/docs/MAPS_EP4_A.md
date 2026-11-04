# Episode 4 maps, part A (E4-maps-a)

The Flood Road, Valewyn, its four interiors, and the two pack patches of Episode 3 maps. Plan: `docs/EPISODE4_PLAN.md` 3,
4.1 to 4.3, 4.9. Tests: `qa/maps/ep4_a_maps.test.mjs`. Previews: `python tools/maps/previews/ep4_vw_render.py` (EP4DB
tiles, the pack's tide rule, ep4 sprites; `tools/maps/preview.py` draws no water and no ep4 tiles).

## 1. Patches (`src/data/maps/ep4_patches.js`, applied by `src/data/ep4/maps.js` after the ep3 pack)

| Map | Added | Cells |
|---|---|---|
| `emberpeak` (`withEastRoad`) | `east_road_trig` (scene `east_road_gate`, if `ep4_started`) | (36, 14..15) |
| | terrain patches `cinder_path` (if `east_road_open`) | (38,14), (38,15), (39,15) |
| | object `rope_ladder` (sprite `rope_ladder`, text `ep4_rope_ladder`, if `east_road_open`) and door `east_road_down` to `ep4_flood_road` (1,15,'right') | (39,15) |
| | sign `east_road_sign` now reads `east_road_sign_ep4` (its last two states are Episode 3's line) | (36,13) |
| | enter trigger `ep4_wake_pk` (`ep4_morning`, if `ep3_complete`), mark `east_road_brink` | (38,15) |
| `pk_inn` (`withEp4Wake`) | enter trigger `ep4_wake` (`ep4_morning`, if `ep3_complete`), marks `ada_hearth`, `garrick_door` | (5,4), (11,10) |

Nothing else changes: ground, marks and every Episode 3 event are identical (tested). Triggers cannot read the counter
`credits3_rolled`; the credits roll the moment `ep3_complete` is set, so `if: ep3_complete` is enough.

## 2. `ep4_flood_road` (52 x 30, field, `millrace`, `canal_rain`, tint `flood_grey`, `weather: 'rain'`)

Enter (1,15) from Emberpeak; the exit back is x 0, rows 14..15 (the ladder foot) to `emberpeak` (37,15).
Marks: `entry` (1,15), `lane` (19,15), `fire` (41,17), `hale_spot` (40,17), `nilo_spot` (42,19), `bluff` (45,7),
`valewyn_far` (46,2, camera only, over the bay), `ferry` (48,16); extra `sluice` (15,13), `punt` (15,12), `plot` (15,10).

Triggers: `first_fight_trig` column 7, rows 6..17 (every passable cell); `lane_trig` column 12, rows 13..16; `vw_view_trig`
column 44, rows 6..8. Ferry: object `ferry_moored` (ifNot `saw_valewyn`) then door `ferry_vw` (kind boat, if `saw_valewyn`)
at (49..50,16) to `ep4_valewyn` (21,32).

**The drowned lane.** Basin `l` (2 levels, start 1). Basin cells: (14..25, 14..17) minus water corners, plus the punt berth
(15,12). Canal stairs at (14,15..16), (25,15..16) and (15,14). Wheels `wh_lane` (14,13; faced from the apron (13,13) and the
sluice stand (15,13)) and `wh_lane_e` (26,13; faced from the east bank (26,14), (27,13)), both `crank: false`. Post
`post_lane` (14,14, in the water). Pontoon `pt_lane` (15,12), `rides: [1]`. Wood chest `chest_punt` (15,9).
The second wheel is not in the plan: without it a party arriving by the ferry (levels reset to mid) could not drain the
lane to go home.

**Solution (autoplay):** at (13,13) face right, turn `wh_lane` (mid to low). Walk the dry lane, go up the stair (15,14) to
the stand (15,13), face left, turn `wh_lane` (low to mid). Step up onto the floating punt (15,12), on to (15,10), open the
chest (15,9). Back to (15,13), turn `wh_lane` (mid to low), down the stair, east along rows 15..16 to the landing.

| Enemies | Cell | Move |
|---|---|---|
| `e_e4r_first` (`e4r_first`, ink_bloom) | (11,17) | guard (the scene runs it at the hero) |
| `e_e4r_hounds` | (31,20) | wander r2 |
| `e_e4r_crabs` | (41,21) | wander r1 |
| `e_e4r_mixed` | (48,8) | patrol left 2, right 2 |

| Chests and finds | Cell | Contents |
|---|---|---|
| `chest_punt` wood | (15,9) | hi_potion x2 |
| `chest_grotto_fr` iron | (28,1) | rolled; behind `crack_boulder_fr` (28,4..5, Dash) |
| `pot_bluff` | (51,7) | hi_ether |

Rest: `ferry_fire` (41,18), `safe`, `rest`, script `ferry_rest`. Signs: `broken_cart` (3,11), `lane_sign` (12,13),
`farm_roof` (17,18), `ferry_post` (44,17), `valewyn_far_sign` (46,6).

## 3. `ep4_valewyn` (44 x 34, town, `valewyn`, `canal_rain`)

Lighting tint `flood_grey` until `vw_restored`, then `none`. Rain: `weather: 'rain'` with `weatherIf: { ifNot: 'vw_restored' }`.
The core field reads only `weather`, so until a hook reads `weatherIf` it rains after the restore too (see section 5).

| Mark | Cell | | Mark | Cell |
|---|---|---|---|---|
| ferry_in | (21,32) | | keep_landing | (29,4) |
| plaza | (21,22) | | canal_works | (35,11) |
| statue | (21,20) | | board | (25,20) |
| palace_door | (21,14) | | inn_door | (5,19) |
| shop_door | (38,18) | | forge_door | (39,25) |
| crowd_a..d | (18,22) (20,23) (23,23) (25,22) | | night_view | (21,16), camera |
| gather_lyra | (22,20) | | gather_hale | (23,21) |
| gather_joss | (19,21) | | gather_vance | (27,21) |

Doors: palace (21,13), inn (5,18), shop (38,17), forge (39,24); each interior lands back on the cell below its door.
`ferry_back` (21..22,33, boat) to the road (48,16). North landing: `keep_ferry_obj` (29..30,3, script `keep_ferry`, ifNot
`keep_ferry_open`) then `keep_boat` (same cells, boat, if `keep_ferry_open`) to `ep4_keep_f1` (19,27,'up'). Boats from the
Keep (F1 Water Gate, `boat_crown_out`) should land on `keep_landing` (29,4); Hale's punt (`council_shelter`) on `ferry_in`.

Plaza: `statue` object (20..22, 18..19), `statue_plaque` (23,19, `ep4_inscription`), the flood board as three signs on
(25..26,19): `flood_board_wet` (state 0, ifNot `vw_arrived`), `flood_board` (state 1, if `vw_arrived` ifNot `vw_restored`),
`flood_board_blank` (state 2, if `vw_restored`). Council switches `switch_shelter` (16,24), `switch_records` (26,24) (if
`witnesses_started`; a `_on` twin shows the thrown one), shelter `vw_shelter` (14..16,21, rest, if `council_shelter`).
Great lock: `great_lock` / `great_lock_open` (34..36, 9..10). NPCs: vance (26,20), ada (27,19), joss (37,11), sori (39,8).

River quarter: terrain patches `tide_water` ifNot `vw_restored` on (0..12, 21..25) and (0..17, 28..30); roofs and chimneys
in the flood, houses `house_q1` (2,24), `house_q2` (7,24) after it.

## 4. Interiors

| Map | From | NPCs | Marks | Exit |
|---|---|---|---|---|
| `ep4_vw_inn` | `inn` | ep4_innkeeper (3,4) | counter (3,4), inn_bed (17,7) | (10..11,11) |
| `ep4_vw_shop` | `item_shop` | linn (5,4) | counter (5,4) | (7,10) |
| `ep4_vw_forge` | `smithy` | ep4_smith (10,5) | anvil (10,5) | (8,10) |
| `ep4_vw_palace` | `chapel` | regent_e and lyra_n (5,4), dorian (14,5) | regent_spot (5,4), table (5,6), dorian_spot (14,5) | (9,13) |

The Hall: `regent_trig` row 11 (x 1..10), save `save_bell_vw` (12,11), signs `decree_table` (4..6,5) and `archive_shelf`
(13,4), book `vw_records_book` (15,4, if `council_records`).

## 5. Notes for other agents

- `qa/maps/maps.test.mjs` line 22 needs `!/^(x[12]|ep4)_/.test(id)` in place of `!/^x[12]_/.test(id)` (Episode 4 maps are
  covered by `qa/maps/ep4_a_*` and `ep4_b_*`).
- Valewyn's rain after `vw_restored` needs one hook reading `weatherIf` (E4-world or E4-integrate).
- Story staging: the NPC `joss` stands at (37,11) beside `canal_works`, `vance` beside `board`, and `ada` beside the board,
  so the scene walks land on free cells; but the NPCs Joss and Ada have no `show` that hides them while `joss_t` / `ada_t`
  are spawned in `crown_remembers` and `ep4_ending` (two of each on screen). E4-story's npcs.js can add `show: { ifNot: ... }`.
- `vw_shelter` has no inspect line (mapcheck warns); a `ep4_shelter` line would fix it.
