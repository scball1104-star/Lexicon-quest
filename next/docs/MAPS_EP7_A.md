# Episode 7 maps, part A (E7-maps-a)

The three pack patches of Episode 6 maps, the White Road, the Courier's Waystation, Palehaven and its four interiors. Plan:
`docs/EPISODE7_PLAN.md` 3, 4.1 to 4.5, 4.10, 4.11. Staging: `docs/story/STAGING_EP7.md`. Name stones: `docs/WORLD_EP7.md`.
Tests: `qa/maps/ep7_a_maps.test.mjs` (17). Previews: `python tools/maps/previews/ep7_white_road_render.py [mapId]
[--scale=N]` (EP7DB tiles: core + x1 + ep4 to ep7 fragments; the name-stone layer drawn as E7-world's field draws it: held
path cells as `icepath`, unheld ones as the fade with the ghost trail under everything that stands, cairns dim, lit, or on
the flicker frame for the oldest held; ep4 to ep7 sprites; phone frames at 844 x 390). Coordinates are tiles, (0,0)
top-left. `node tools/maps/ep7_check.mjs ep7_white_road` prints the road's stone report.

## 1. Patches (`src/data/maps/ep7_patches.js`, applied by `src/data/ep7/maps.js` after the ep6 pack registered)

| Map | Added | Cells |
|---|---|---|
| `ep6_zl_inn` (`withEp7Wake`) | enter trigger `ep7_wake` (`ep7_morning`, `on: enter`, if `ep6_complete`, ifNot `ep7_morning_done`) | (0,0) |
| `ep6_zl_charts` (`withEp7Charts`) | enter trigger `ep7_wake_charts` (same script and flags) and the ep3 pack's `opening_stage` event | (0,0) |
| | object `north_frost` (sprite `frost_door`: a clear ice slab over the curtained north window; text `ep7_north_window`; if `ep6_complete`, ifNot `ep7_started`) | (5,1..2) |
| | sign `north_window_look` (text `ep7_north_window`, if `ep7_started`) | (5,2) |
| | marks `charts_dawn` (6,6) = `CHARTS_STAGE`, `charts_dawn_m` (5,6), `charts_dawn_b` (7,6), `aeris_table7` (6,4), `compass_table` (4,5), `north_window` (5,1) | |
| `ep6_zephyr` (`withNorthBerth`) | object `north_gangway` (sprite `gangway`, `ep7_board`, text `ep6_kestrel`, if `ep7_started`, ifNot `ep7_boarded`), read from (19,4) facing up | (19,3) |
| | step trigger `north_gangway_trig` (same script and flags): the gangway is a doorway | (19,3) |
| | boat door `berth_white_road` (sprite `gangway`, if `ep7_boarded`) to `ep7_white_road` (15,74,'up') | (19,3) |
| | marks `aeris_gangway7` (19,5), `vex_seat` (23,5), `gangway7` (21,7), `gangway7_m` (20,7), `gangway7_b` (22,7) | |

Every Episode 6 cell, overlay, decor entry, mark and event is unchanged and the input is never mutated (tested); with Episode 6
complete the three maps walk exactly as Episode 6's, and with `EP7_LIVE` off nothing sets `ep7_started`, so no gangway, no
frost after the morning and no door. `north_dock` (22,5), where `isles_return` and the road's `kestrel_back` land, is
untouched; the gangway sits west of it under the Kestrel's bow. **Differs from STAGING:** `north_window` is (5,1) (the
window the room already has), not (6,1); `north_frost` is an object, not an overlay (no frosted window tile exists, and
the frost_door slab reads as frost on the inside at phone size). `CHARTS_STAGE` = (6,6) as E7-story proposed: no
`story.js` change needed. The Chart Room is 18 x 15: across it fits the screen; down it scrolls a tile and a half, so the
camera holds `charts_dawn` (6 rows from the top) half a tile off centre. A trigger reads flags only; `ep6_complete` is set
as the credits roll, so it stands for `credits6_rolled` (the Episode 6 precedent).

## 2. `ep7_white_road` (33 x 80, field, `high_moor`, `snow_wind`, tint `none`)

Wider and taller than the plan's 30 x 56 for the camera rule (focus band x 12..20, y 7..72) and for Gap A's one-screen lesson
(eight cells across, so the road crosses it east-west between two spurs). Ground: `snowfield`, the road `icepath`, the fade
`fade` across the whole width at each gap, the lake `frozen_lake` with an open lead of `lake_water`. Black pines (2 x 4, solid
feet) ring the road; the treeline at y 12 closes the top either side of the Icegate.

| Part | Cells | Contents |
|---|---|---|
| The lake | ice (3..29, 68..78) | `road_landing` on enter (`ep7_landing`); the Kestrel (decor 8..13, 72..74; sign `kestrel_hull` over it, solid, `ep7_kestrel_lake`); boat door `kestrel_back` (14,74, sprite `gangway`, if `road_arrived`) to `ep6_zephyr` (22,5); wood chest `chest_lake` (26,70) hi_potion x2; signs lake (20,76), pine (2,64) |
| The Traveler's Wall | wall decor (9..14, 59..61) | `wall_trig` row y 66, whole width (`name_under_ice`, if `road_arrived`, ifNot `vex_carved`); sign `travelers_wall` (11,61) |
| The first bite | | `fight_row` row y 57, whole width (`road_fight`, if `vex_carved`); enemy `e_e7w_first` (14,55) plan anchor only (never present); `e_e7w_wolves` (25,55) if `road_fight_done` |
| Gap A | fade 43..48; west spur (9..12, 45..48), east spur (21..24, 43..46) | **path a** (13..20, 45..46); cairns `ns_asta` (12,48), `ns_asta_n` (23,46); Sol (15,50); `first_trig` row y 53 (`first_stone`); twine stake sign (17,49); fade sign (14,42), ghost-trail sign (13,47) |
| Gap B | fade 31..38; ledge (18..22, 34..36); Ilka's ledge (5..8, 34..36) | **path b** (19..20, 37..38), **path n** (19..20, 31..33), **path i** (9..17, 35); cairns `ns_bo` (18,39), `ns_bo_n` (22,36), `ns_nyx` (22,34), `ns_nyx_n` (21,30), `ns_ilka` (18,36), `ns_ilka_w` (8,34); iron chests on (6,35): `chest_ilka_plaque` (street_plaque, flag `street_1_found`, if `streets_started`), `chest_ilka` (hi_ether, ifNot `streets_started`); `e_e7w_owls` (26,28) |
| The high stretch | (0..32, 25..30) | `whiteout_trig` row y 29 (`whiteout`, if `first_stone_read`) |
| Gap C | fade 22..24 | **path s** (15..16, 22..24); cairns `ns_senna` (14,25), `ns_senna_n` (17,21) |
| The Waystation | hut decor (22..25, 16..19) | door `door_waystation` (24,19) to `ep7_waystation` (7,7,'up'); gold chest `strongbox` (26,16) 1,500 gold, sign (25,17) |
| The Icegate | arch (14..18, 9..12) | `icegate_trig` row y 13 (`palehaven_view`); signs icegate (14,12), Palehaven far (18,12); exit (15..17, 10) to `ep7_palehaven` (23,34,'up'); overhead `palehaven_far` (11..21, 0..6) over unreachable rows |

**Stones.** `remember: { capacity: 2, paths, goal: ['waystation_door', 'exit'] }`, five stones, ten cairns (one at each end
of every path), no frost. 20 held orders, 0 stranded states, every chest reachable, 0 errors. **Decisions: main path 4 (A 1:
asta; B 2: bo, nyx, which lets Asta go behind; C 1: senna, which lets the oldest go behind), optional 1 (Ilka, read on the
ledge with Bo held).** Walk 88 cells against a straight route of 81 (1.09). Panned reads: none (every path is within half a
phone screen of a cairn).

**Phone frames.** Gap A from the spur (reading Asta at (12,48) from (12,47)): the stone, all sixteen path cells with their
ghost trail and the far spur with its cairn on one screen (`ep7_white_road_gap_a_phone.png`); after the read the far side
stays in view (`ep7_white_road_gap_a_read_phone.png`). Gap B from Bo's stone (18,39): both of Bo's cairns, Nyx's cairn on the
ledge and the ledge itself together (`ep7_white_road_gap_b_phone.png`).

| Mark | Cell | left | right | top | bottom |
|---|---|---|---|---|---|
| lake_landing | (15,74) | 15 | 17 | 74 | 5 |
| landing_stage (_m 14, _b 16) | (15,72) | 15 | 17 | 72 | 7 |
| aeris_landing | (15,70) | 15 | 17 | 70 | 9 |
| vex_landing, vex_ahead_l | (17,72), (16,58) | | | | |
| vex_wall | (13,62) | 13 | 19 | 62 | 17 |
| wall_stop (_m 12, _b 14) | (13,65) | 13 | 19 | 65 | 14 |
| vex_ahead, fight_row | (16,54), (15,57) | | | | |
| foes_drop | (14,55) | 14 | 18 | 55 | 24 |
| foes_drop_b | (17,55) | 17 | 15 | 55 | 24 |
| sol_twine | (15,50) | 15 | 17 | 50 | 29 |
| stone_stage (_m 14, _b 16) | (15,52) | 15 | 17 | 52 | 27 |
| gap_a (camera, over the white) | (16,45) | 16 | 16 | 45 | 34 |
| gap_b (camera), ledge_b, ilka_ledge | (16,36), (20,35), (6,36) | | | | |
| whiteout_mid | (16,26) | 16 | 16 | 26 | 53 |
| mira_fade | (14,27) | 14 | 18 | 27 | 52 |
| bram_fade | (18,27) | 18 | 14 | 27 | 52 |
| gap_c (camera), waystation_door, strongbox | (16,23), (24,20), (26,17) | | | | |
| icegate, north_exit, palehaven_far (camera, clamps by design) | (16,11), (16,12), (16,3) | | | | |

**The bot's route (autoplay).** From `lake_landing` (15,74): north up the road to `wall_trig` (y 66; the scene stops the party
on (13,65)); on north to `fight_row` (y 57; `e7w_first`); to `first_trig` (y 53; the scene stages on (15,52)); west along
y 52 to (11,52), north up the spur to (12,47); **read** `ns_asta` facing down; east along y 46 to (22,46), north to (21,40),
west to (19,40), north to (19,39); **read** `ns_bo` facing left; north to (21,34); **read** `ns_nyx` facing right; north up
(19, 33..30) to `whiteout_trig` (y 29; the scene walks the party to y 26..27); to (15,25); **read** `ns_senna` facing left;
north across (15, 24..21) to (16,20); east along y 20 to `waystation_door` (24,20), up into the Waystation (it rests at the
stove from `saw_sevens`); back out, west to (16,20), north to `icegate_trig` (y 13), north through the arch to the exit (y 10).
Optional: Ilka from (18,35) facing down with Bo held (before Nyx), then west along y 35 to the chest (6,35) and back.

## 3. `ep7_waystation` (14 x 10, interior, `high_moor`, no ambience): fits one screen, exempt from the camera rule

| What | Cells |
|---|---|
| door `waystation_exit` (7,8) to the road (24,20,'down'); start (7,7) facing up | |
| `tally_trig` row y 6 (1..12) (`waystation`) | |
| the stove: `stove` (state 0, `ep7_stove`, ifNot `saw_sevens`), `stove_lit` (state 1, `ep7_stove`, rest + safe, if `saw_sevens`), light (2,4) | (1..2, 4) |
| the tally (decor `tally_frame` on the inner wall; sign `tally`, `ep7_tally`) | (5, 1..2) |
| Sol `sol_waystation` behind the counter (8..10, 5) | (9,4) |
| `post_box` (object, `ep7_post_box`), bench decor (2..3, 7) with sign (3,7) | (6,3) |
| woodpile `woodpile` (block, heavy: Shove) (11,4); pushed down from (11,3) it frees `chest_woodpile` (12,4) ember_tea x2; sign `ep7_woodpile` on the crate (12,3) | |

Marks: `stove` (1,4), `tally` (5,3), `party_stop` (5,5), `party_stop_m` (4,5), `party_stop_b` (6,5), `sol_counter` (9,4).

## 4. `ep7_palehaven` (46 x 36, town, `palehaven`, `snow_wind`)

Ground: `icebrick` streets (2..43, 9..31) and the avenue (21..25, 32..35), the `frostmosaic` square (13..32, 13..25),
`snowfield` round the town; across the north an ice rampart (`icewall`: the beyond 0..5, the band 6, the face 7..8) with one
passage (30..32, 6..8). Overhead: `cathedral_far` (28..34, 0..5) over the beyond, behind the passage.

| Part | Cells | Contents |
|---|---|---|
| South gate | arch (21..25, 32..35) | exit (22..24, 35) to `ep7_white_road` (16,12,'down'); enter trigger `palehaven_enter` (`palehaven_arrival`); Bryn (25,26) |
| The square | (13..32, 13..25) | the hearth (decor of 4 objects, sprite `returning_hearth`, at (22,19), cells 22..23, 17..19): `hearth` (cold, ifNot `hearth_started`, `hearth_lit`, `doors_reopened`), `hearth_ring` (cold, script `hearth_light`, if `hearth_started`), `hearth_lit` (lit, script `hearth_light`, rest + safe, if `hearth_lit`), `hearth_dawn` (lit, rest + safe, if `doors_reopened`, ifNot `hearth_lit`), each `ep7_hearth_cold`; lights (22,18) when lit; `vanishing_mark` / `vanishing_mark_filled` (26,16); `beacon_north` (18,15, `auroraobelisk`); crystal sign (32,14); Eira (20,18); enter triggers `square_page` (`whole_page`, if `stillheart_restored`, ifNot `page_whole`) and `square_doors` (`doors_reopen`, if `page_whole`, ifNot `doors_reopened`) |
| Iced doors | `iced_a` (15,12), `iced_b` (25,12), `iced_c` (4,23), `iced_d` (38,24), `iced_e` (13,30), `iced_f` (31,30) | each two objects (`iced_door` state 0 ifNot `doors_reopened`; `<id>_open` state 1 if it), `ep7_iced_door`, solid: the houses are not entered |
| The Watch | (18..22, 6..11), door (21,11) to `ep7_ph_watch` (9,10) | sign board (20,11), notice (22,11); the Keeper (24,12) by her lamp (24,11); Torr (19,12), his book `missing_streets` (18,12) |
| The north gate | the passage (30..32, 6..8) | grille: overlays `fence_iron` (30..32, 8) ifNot `vault_open`; sign `vault_gate_obj` (31,8, ifNot `vault_open`), `vault_gate_open` on the brazier (33,9, if `vault_open`), `cathedral_sign` (29,8); `vault_trig` (30..32, 9) (`vault_gate`, if `keeper_told`); door `vault_door` (32,6, if `vault_open`) to `ep7_vault_f1` (20,27,'up'); door `nave_door` (30,6, if `doors_reopened`) to `ep7_stillheart` (16,15,'up'), the `roof` mark where `ep7_ending` stages the party (E7-integrate); crystal (31,6) between them |
| West | Lodge (3..9, 11..16), door (6,16) to `ep7_ph_inn` (10,10) | sign (7,16); Mirael's house (3..7, 27..30), Mirael (7,31) |
| East | Northwind (36..40, 14..17), door (37,17) to `ep7_ph_shop` (7,9); Armory (35..40, 28..31), door (37,31) to `ep7_ph_armory` (8,9) | signs (38,17), (36,31) |

No foes. Focus band x 12..33, y 7..28.

| Mark | Cell | left | right | top | bottom |
|---|---|---|---|---|---|
| south_gate (arrival) | (23,34) | 23 | 22 | 34 | 1 |
| bryn_gate | (25,26) | 25 | 20 | 26 | 9 |
| gate_stage (_m 24, _b 26) | (25,28) | 25 | 20 | 28 | 7 |
| hearth (camera, the hearth's cell) | (22,18) | 22 | 23 | 18 | 17 |
| hearth_n | (22,16) | 22 | 23 | 16 | 19 |
| hearth_s (_m 21, _b 23) | (22,21) | 22 | 23 | 21 | 14 |
| hearth_w | (20,18) | 20 | 25 | 18 | 17 |
| hearth_e | (25,18) | 25 | 20 | 18 | 17 |
| aeris_square | (26,21) | 26 | 19 | 21 | 14 |
| vex_square | (25,20) | 25 | 20 | 20 | 15 |
| iced_a (the cell before the door) | (15,13) | 15 | 30 | 13 | 22 |
| keeper_lamp | (24,12) | 24 | 21 | 12 | 23 |
| keeper_stage (_m 23, _b 25) | (24,14) | 24 | 21 | 14 | 21 |
| watch_door | (21,12) | 21 | 24 | 12 | 23 |
| vault_gate (camera, the grille) | (31,8) | 31 | 14 | 8 | 27 |
| gate_keeper | (31,10) | 31 | 14 | 10 | 25 |
| north_gate_stage (_m 30, _b 32) | (31,12) | 31 | 14 | 12 | 23 |
| vex_step | (33,10) | 33 | 12 | 10 | 25 |

Other marks: `vex_run` (33,21), `gate_keeper_back` (34,11), `torr_steps` (19,12), `vault_door` (31,7) (the arrival from the
Vault: `square_return` lands here), `nave_door` (30,7), `cathedral_far` (31,2), `crowd_a` to `crowd_f` (16,17), (29,17),
(16,22), (29,22), (19,24), (27,24), `inn_door` (6,17), `shop_door` (37,18), `armory_door` (37,32), `mirael_door` (7,31).

## 5. Interiors (each fits one screen: exempt from the camera rule)

| Map | From | Size | Contents |
|---|---|---|---|
| `ep7_ph_inn` | `inn` | 22 x 13 | the North Watchkeeper `ep7_innkeeper` (3,4) (mark `counter`); door (10..11,11) to (6,17); the stairs (11,2) / (15,2); a lit stove (11..12, 4); bedrolls; sign `sign_ep7_inn` (7,5); mark `inn_bed` (17,7) |
| `ep7_ph_shop` | `item_shop` | 12 x 12 | Maera (5,4) (mark `counter`); door (7,10) to (37,18); the kettle's stove (8..9, 8); sign (2,7) |
| `ep7_ph_armory` | `smithy` | 14 x 12 | Eira `eira_forge` (10,5) (mark `forge`); door (8,10) to (37,32); the glass furnace (7..8, 3), a frostfire (5,4); sign (8,3) |
| `ep7_ph_watch` | `chapel`, two floor rows shorter | 18 x 13 | door (9,11) to (21,12); `watch_trig` row y 9 (1..10) (`keeper_and_vex`, if `met_keeper`, ifNot `keeper_told`); letters (2..4, 9) and (6..7, 9); empty frame (3,2); cold lamp (7,2); oath over the inner doorway (11,6); save bell `save_bell_watch` (12,3) text `ep7_watch_bell`; `watch_cots` (13..15, 4, rest + safe, if `doors_reopened`); Nox `nox_t` (5,5); lights (4,4) and, from `doors_reopened`, the morning at the window (7,3); dark 0.2 |

Watch marks: `keeper_chair` (5,5), `watch_stage` (5,7) (_m 4, _b 6), `vex_door` (9,10), `vex_door_out` (9,11), `frame` (3,3),
`watch_cot` (14,5) (the post-credits wake point).

## 6. Handoffs and open calls

- **Core list filters (orchestrator):** `tools/maps/mapcheck.mjs` `listMapIds` skips `ep[456]_patches.js`; it needs
  `ep[4-7]` (else `qa/maps/x1_hub.test.mjs` reads `ep7_patches` as a map and fails), and `qa/maps/maps.test.mjs` line 22
  filters `ep[456]_` and needs `ep[4-7]_` (every Episode 7 map file trips it). Neither file is in a 7c brief.
- **E7-maps-b:** `square_return` lands on `ep7_palehaven` `vault_door` (31,7); the Vault door targets `ep7_vault_f1` (20,27)
  (plan 4.6's `basin`); `nave_door` targets `ep7_stillheart` (16,15), the real `roof` (E7-integrate moved it from the guess (13,14)).
- **E7-world:** `ep7_stone_dim` and `ep7_stone_lit` are not read by any map event (the namestone event has no text field); snowfall
  needs a field particle kind (no map field exists for it).
- **E7-audio / E7-pack:** the Watch's music is flag-driven (E7-fixes, 2026-11-12): `palehaven` from `doors_reopened`, `mystery`
  before (the plan's 0.6 volume is not expressible; the track plays at its own level). The Waystation's 0.5 / 0.4 volumes are
  not expressible in a map module either, so it plays `high_moor` at its own level with no ambience, the way every other
  interior does (`ambience: null`): no wind indoors.
