# Episode 6 maps, part B (E6-maps-b)

The Storm Observatory: three floors, the Scribe's Eyrie and the Cloud Library. Plan: `docs/EPISODE6_PLAN.md` 4.4 to 4.10, 5.1.
Modules: `src/data/maps/ep6_obs_f1.js` (also exports the Observatory kit the other four import: `skyGrid`, `vane`, `mooring`,
`windFont`, `lift`, `glow`), `ep6_obs_f2.js`, `ep6_obs_f3.js`, `ep6_obs_eyrie.js`, `ep6_library.js`. Test:
`qa/maps/ep6_b_maps.test.mjs` (8 tests, about 1 s). Previews, drawn by the real game (`?pack=ep6`, the field's own wind
system, storm tint, darkness and lamp pools, reduceMotion on): `python tools/maps/previews/ep6_obs_ingame.py [mapId]` writes
`tools/maps/previews/<variant>.png` (2x), `_x1.png`, `_phone.png` (844 x 390) and a `<map>_states.png` sheet of every vane
state per floor.

Coordinates are x, y (tiles). Groups: a vane turns its group between the authored lanes and `wind.turned[group]`; vanes
reset on every arrival. A ride: every cell in the arrow's way until ground (land), a post (stop on it) or anything else
(stop on the last lane cell).

## How to check

```bash
node --test qa/maps/ep6_b_maps.test.mjs
node tools/maps/mapcheck.mjs check --pack ep6 ep6_obs_f1 ep6_obs_f2 ep6_obs_f3 ep6_obs_eyrie ep6_library
node tools/maps/ep6_check.mjs ep6_obs_f2      # one floor's wind report: states, nodes, firstAt per event
python tools/maps/previews/ep6_obs_ingame.py   # 25 variants, about 3 minutes
```

## Rules these maps keep (beyond plan 4.4 and 5.1)

- **Every vane points the way its lanes blow.** A vane's head shows its group's most common arrow, so every lane of one
  group runs the same way: F1's group a is the whole Windward Run along row 7 (east, then west), never a column beside it.
- **Every way home holds in every state.** F1: the Run blows home east in the authored state and vane_cw sets it from the
  west deck. F2: three ducts outside every group (the crown room's west gallery 6,8..9, the manifest platform's 11..13,12,
  the north-west platform's 5,14..15) bring any state back to the stair foot. F3: the long gust (27, 9..31) blows from the
  east deck and the Listen deck's east stair to the landing in every state; Anchor's ring spills home at (21,31).
- **No foe, trigger, mark or prop on a lane cell or a landing cell**; no foe path within one cell of a Vex staging cell.
- **Every ring ends.** F3's rings are open (Anchor spills at 21,31; Listen clockwise spills west at 14,21; Return is parted
  by the causeway's head and the stone) or, counter-clockwise, closed on a post: no ride loops.

## 1. `ep6_obs_f1` The Windward Causeways (42 x 30, open sky, `cloudbank`, `storm_observatory`, `sky_wind`)

Decks `skyplank`, platforms `stormglass`, bridges `skybridge`. Arrival `start`/`alcove` (21,27) up, from `ep6_zephyr`'s
east airstair.

| Area | Cells | Contents |
|---|---|---|
| A Recovery Alcove | x 18..24, rows 24..28 | `to_zephyr` (20..22,29) to `ep6_zephyr` (44,6) if `obs_entered`; `font_w1` (22..23,25); `chest_a` wood ballast_stone x2 (18,25); `chimes_a` (19,24). Bridge north (20..21,23). |
| B Two Ways In | south ledge x 12..22 rows 20..22; west ledge x 8..11 rows 14..22; north deck x 9..22 rows 9..12; glass deck x 13..21 rows 13..18; east spur x 24..28 rows 15..20 | West arm (12, 13..19) `^` lands (12,12); south arm (13..23,19) `>` lands (24,19); gust (10,13) `v` north deck to west ledge; spur home (26,21) `v` + (23..26,22) `<` lands (22,22). `chest_es` wood hi_potion x2 (28,16); `chest_b` iron (20,14); `chimes_b` (9,9). |
| C First Vane | boardwalk x 23..33 rows 11..12; near deck x 34..39 rows 4..12; relay deck x 24..29 rows 3..8 | Group a lane (30..33,7): authored `>` lands (34,7), turned `<` lands (29,7). `vane_c` (35,6). `relay_old` (26,3); `memory1_trig` column x 29 rows 3..8; `chimes_c` (38,9). |
| D The Post | key balcony x 19..22 rows 5..6; west deck x 2..7 rows 6..11; niche x 2..5 rows 14..16 behind the neck (3,12..13) | The Run (8..23,7), group a: authored `>` with (18,7) `^` into the post `mo_d` (18,6); turned `<` lands (7,7). Column (18,4..6) `^` lands (18,3). `chest_key` gold compass_key flag compass_key_found (22,5); `vane_cw` (5,8, group a); `coffer_d` iron (2,6, the Star-Sail Supply Coffer); `crate_d` (3,12, Dash, opens 3,12..13); behind it `chest_boots` gold skyhand_boots (2,15), `chest_letter3` wood dead_letter if letters_started / `chest_letter3_alt` hi_ether (4,15). |
| E Upper Deck | x 12..22 rows 1..3; dead-end deck x 2..6 rows 1..3 | Group b lane (7..11,2): authored `>` lands (12,2), turned `<` lands (6,2). Gust (4,4..5) `v` lands (4,6) on the west deck; gust (23,3) `>` lands (24,3) on the relay deck. `vane_e` (13,1); `chest_letter2` wood dead_letter if letters_started / `chest_letter2_alt` hi_ether (2,2); `lift_trig` (21,2) obs_f1_lift; `lift_up` (21,1) to `ep6_obs_f2` (6,26). |

**Solution (autoplay):** north over the bridge; from (12,20) step north (or from the west ledge at x 11 step east): land
(12,12). East along the boardwalk to (35,7): `vane_c` (group a turned). From (34,7) step west: land (29,7) on the relay deck
(memory1_trig). From (24,7) step west: the Run carries the party to (7,7). `vane_cw` from (5,9) (group a back to authored).
From (7,7) step east: the post catches the party at (18,6). East to (19,6), (21,5): open `chest_key` (22,5) facing east.
West back onto the post (18,6), step north: land (18,3). East to (21,2): `lift_trig`, then north into `lift_up`.
Optional: from (16..22,20) step north: land on the spur (24,19), `chest_es` from (28,17); home by stepping south from (26,20).
Dash Strike from (3,11) facing south breaks `crate_d`. `vane_e` from (13,2), from (12,2) step west: land (6,2), the letter
chest; home by stepping south from (4,3).

| Enemies | Cell | Move | | Enemies | Cell | Move |
|---|---|---|---|---|---|---|
| `e_wl` e6o1_sprites | (9,17) | patrol up/down 2 | | `e_nc` e6o1_mixed | (37,11) | patrol left/right 1 |
| `e_nd` e6o1_beetles | (16,10) | guard | | `e_wd` e6o1_sprites | (6,10) | guard |
| `e_es` e6o1_mixed | (26,17) | guard | | `e_e` e6o1_harriers | (16,2) | patrol right/left 1 |

Marks: `alcove` (21,27), `font` (22,26), `ways_in` (14,17), `west_in` (11,16), `south_in` (16,20), `north_deck` (12,12),
`east_spur` (24,19), `vane_c` (35,7), `near_in` (34,7), `relay_old` (26,3), `relay_stage` (26,6) +m (25,6) +b (27,6),
`relay_aeris` (26,4), `relay_lamp` (28,4), `run_in` (24,7), `west_deck` (7,7), `vane_cw` (5,9), `post_d` (18,6),
`key_deck` (21,5), `upper_deck` (18,2), `lift_up` (21,2), `vane_e` (13,2), `dead_end` (3,2), `dash_at` (3,11).

## 2. `ep6_obs_f2` The Hall of Broken Signals (40 x 30, roofed, dark 0.35, `relay_hall` walls, `relay_grate`, `duct_shaft`)

`wind.kind: 'duct'`. Arrival `start`/`arrival` (6,26) up, from F1's lift.

| Area | Cells | Contents |
|---|---|---|
| A Stair Foot | x 2..10, rows 24..28; gap (5..6, 22..23) | `lift_f1` (3,24) to `ep6_obs_f1` (20,2); `font_w2` (8..9,24). |
| B Two Fans | the hall x 2..22 rows 10..21, cut by the shafts x 11..13 and rows 14..15 into: south-west x 2..10 rows 16..21, south-east x 14..22 rows 16..21, manifest x 14..22 rows 10..13, north-west x 2..10 rows 10..13 | Group a duct (11..13,18): authored `<` lands (10,18), turned `>` lands (14,18). Group b duct x 18: (18,14..15) authored `v` lands (18,16), turned `^` lands (18,13); (18,8..9) through the north wall authored `v` lands (18,10), turned `^` lands (18,7). Always: (11..13,12) `<` lands (10,12); (5,14..15) `v` lands (5,16). `vane_b1` (9,17, a), `vane_b2` (20,17, b), fan_vane art. `relay_manifest` (20,10); `memory2_trig` row 13 x 14..22; `chest_b` iron (2,10). |
| C Crown Relay | crown room x 4..25 rows 2..7 (west gallery x 4..13) | `crown_relay` (21,3); `vex_trig` column x 19 rows 2..7; Vex's duct (23,2..3) `^` into the wall (a blocked stop at 23,2); `feather_grille` (22,5); the west gallery's duct (6,8..9) `v` lands (6,10). East door (26,4..5). |
| D Side Decks | x 27..37 rows 2..9; locker ledge x 34..37 rows 11..12 | `log_1` wood hi_potion (28,3), `log_2` wood hi_ether (33,2), `log_3` wood ballast_stone (37,6), flags log_1..3_found; `chest_d` wood hi_potion x2 (37,3). Group c duct x 30: authored (30,10..13) `v` lands (30,14) in the bellows hall; turned it bends at (30,11) along (30..33,11) `>` to the ledge (34,11), (30,12..13) calm. Ledge home (34,10) `^` lands (34,9). `vane_d` (31,8, c); `locker_obj` (36..37,11, script locker); `chest_locker` gold 400 + hi_ether x2 (37,12) if locker_found; `book_logs` flight_logs (34,12) if locker_found. |
| E Bellows Hall | x 24..37 rows 14..25 | Duct (27,10..13) `^` lands (27,9) on the side decks. `font_w2b` (28..29,16); `engine_trig` row 18 x 24..37; actor `gale_engine` (31,22) ifNot engine_defeated; `lift_trig` (24,15) obs_f2_lift; `lift_up` (24,14) to `ep6_obs_f3` (18,35) if engine_defeated; `lift_f2_short` (25,14) to `ep6_obs_f1` (21,27) if obs_f2_done. |

**Solution (autoplay):** north through the gap to (9,18): `vane_b1`. From (10,18) step east: land (14,18). `vane_b2` from
(20,18). From (18,16) step north: land (18,13) (memory2_trig). From (18,10) step north: land (18,7). East across `vex_trig`
(x 19). East through the door (26,4) to the side decks; from (30,9) step south (vane_d untouched): land (30,14). South across
`engine_trig` (row 18): the Gale Engine. After the win: (24,15) `lift_trig`, north into `lift_up`.
Optional (the Locker): `vane_d` from (31,9); from (30,9) step south: the duct bends east, land (34,11). `locker_obj` from
(35,11) facing east; then `chest_locker` from (36,12) facing east, `book_logs` from (34,11) facing south. Home: from (34,11)
step north: land (34,9). Turn `vane_d` back before riding down to the bellows hall.

Enemies: `e_b` e6o2_mixed (4,19) patrol right/left 2; `e_nw` e6o2_manta (8,11) guard; `e_d` e6o2_wraiths (34,6) guard;
`e_e` e6o2_mixed (35,16) guard. The Engine is the trigger `engine_trig` and the actor `gale_engine`.

Marks: `arrival` (6,26), `font` (8,25), `fans` (9,18), `fan_b1` (9,18), `fan_b2` (20,18), `relay_manifest` (20,10),
`manifest_stage` (20,13) +m (19,13) +b (21,13), `manifest_aeris` (20,11), `manifest_deck` (22,11), `crown` (21,3),
`vex_spot` (21,4), `party_stop` (21,7) +m (20,7) +b (22,7) (two clear rows), `side_decks` (32,5), `vane_d` (31,9),
`locker` (35,11), `locker_in` (34,11), `arena` (31,19), `engine_spot` (31,22), `arena_stage` (31,20) +m (30,20) +b (32,20),
`lift_up` (24,15), `lift_short` (25,15).

## 3. `ep6_obs_f3` The Eye of the Storm (36 x 40, tint `storm`, dark 0.5, `spire` walls, `spire_stone`, `storm_cloud`)

`wind.kind: 'ring'`. Arrival `start`/`arrival` (18,35) up, from F2's lift. `pitTo` (11,22) for the faint bridge.

| Landing | Cells | Contents |
|---|---|---|
| First landing | x 8..27, rows 32..37 | `lift_down` (10,32) to `ep6_obs_f2` (24,16); `font_w3` (24..25,33); `kestrel_moored` (2,35, kestrel prop over cloud) if aeris_came. |
| Anchor | ring x 14..21 rows 27..31 round the block x 15..20 rows 28..30; deck x 11..21 rows 24..26 | Clockwise, no vane: (14..20,27) `>`, (21,27..31) `v` spilling onto (21,32); (15..20,31) `<`; (14,28..31) `^`. Post `mo_anchor` (17,27). `lamp_anchor` (19,24) dark / `lamp_anchor_lit` if pledge_anchor; `charter` pilot_charter (20,24); `vane_listen` (12,24). |
| Listen | ring x 14..21 rows 19..23 round the block rows 20..22; west ledge x 11..13 rows 21..23; island x 5..7 rows 21..23; deck x 13..22 rows 16..18 (east stair x 23..26 rows 17..18) | Group a. Authored clockwise: (14..20,19) `>`, (21,19..22) `v`, (21,23) and (15..20,23) `<`, (14,23..22) `^`, (14,21) `<` spilling onto the west ledge (13,21), (14,20) `^`. Turned counter-clockwise and closed: (15..21,19) `<`, (14,19..22) `v`, (14..20,23) `>`, (21,23..20) `^`. Post `mo_listen` (17,19). `lamp_listen` (14,16). Faint bridge `ink_bridge_h_faint` (8..10,22) to `chest_spear` gold windborne_spear (6,22). |
| Broken causeway | x 16..18 rows 12..15 (west edge broken at 16,13..14) | `fall_trig` row 15 x 16..18 (vex_falls); `causeway_sign` (16,12). |
| Return | ring x 14..21 rows 7..11 round the block x 15..20 rows 8..10; the stone (17..18,7) with its neck (17,6); the ring's open foot (16..18,11); east deck x 22..26 rows 8..11; stair x 24..25 rows 6..7 | West half, group c: authored (16..15,7) `<`, (14,7..10) `v`, (14..15,11) `>` lands (16,11); turned (15..14,11) `<`, (14,11..8) `^`, (14..16,7) `>` lands (17,7). East half, group b: authored (21,10..8) `^`, (21..19,7) `<` lands (18,7); turned (19..20,7) `>`, (21,7..10) `v` to the post `mo_return` (21,10). `vane_r_w` (18,11, c); `vane_r_e` (17,6, b); `lamp_return` (25,8); `chest_r` iron (26,11); `spire_sign` (17,10). |
| Beacon platform | x 12..26 rows 3..5; the crown face x 19..25 rows 0..2 | `crates` (13,3); `chest_ballast` wood ballast_stone x2 (12,5); `beacon_trig` column x 23 rows 3..5 (fifth_voice); `beacon_font` (19..20,3) if pippa_found; `keyhole_shut` (21..23,2) ifNot scribe_door_open; `door_scribe` locked_door compass_key (21..23,2) to `ep6_obs_eyrie` (11,18) if scribe_door_open. |
| The long gust | column x 27 rows 9..31 | `v`, lands (27,32). Entered from the east deck (26,9..11) or the Listen deck's east stair (26,17..18). |

**Solution (autoplay):** from (16,32) step north: the Anchor ring carries the party to `mo_anchor` (17,27). North to (17,26);
`lamp_anchor` from (19,25) facing up. `vane_listen` from (12,25) facing up (group a turned). From (16,24) step north: the ring
runs counter-clockwise to `mo_listen` (17,19). North to (17,18); `lamp_listen` from (14,17) facing up. North across
`fall_trig` (row 15, vex_falls). `vane_r_w` from (17,11) facing east (group c turned). From (16,11) step west: land on the
stone (17,7). `vane_r_e` from (17,7) facing up (group b turned). From (18,7) step east: the east half carries the party to
`mo_return` (21,10). East to (22,10); `lamp_return` from (25,9) facing up. North up the stair (24..25, 6..7) to the
platform, west across `beacon_trig` (x 23, fifth_voice). `door_scribe` from (22,3) facing up with the Sky Compass Key.
Home from anywhere above the first landing: from (26,9..11) or (26,17..18) step east onto the long gust.
Optional: with the Lantern, from (11,22) west over the faint bridge to `chest_spear` (6,22).

Enemies: `e_l` e6o3_manta (25,36) guard; `e_w` e6o3_pages (11,23) guard; `e_s` e6o3_manta (24,17) patrol right/left; `e_p`
e6o3_mixed (26,3) guard.

Marks: `arrival` (18,35), `font` (24,34), `spire_top` (16,4), `lift_down` (10,33), `kestrel_berth` (5,34), `aeris_top`
(9,33), `kestrel_stage` (9,35) +m (8,35) +b (10,35), `anchor_in` (16,32), `anchor` (19,24), `anchor_stage` (18,26) +m (17,26)
+b (19,26), `aeris_wait_1` (18,24), `vane_listen` (12,25), `listen_in` (16,24), `listen` (14,16), `listen_stage` (15,18) +m
(14,18) +b (16,18), `aeris_wait_2` (15,16), `west_ledge` (13,21), `lantern_at` (11,22), `vex_edge` (17,12), `vex_hang`
(19,13, over cloud), `bram_line` (18,13), `vex_ahead` (17,11), `party_stop_fall` (17,15) +m (16,15) +b (18,15) (two clear
rows), `vane_r_w` (17,11), `stone` (17,7), `return` (25,8), `return_stage` (24,10) +m (23,10) +b (25,10), `aeris_wait_3`
(24,8), `east_deck` (22,10), `pippa_spot` (15,3), `aeris_beacon` (17,3), `beacon_stage` (15,5) +m (14,5) +b (16,5), `keyhole`
(22,3).

## 4. `ep6_obs_eyrie` The Scribe's Eyrie (24 x 20, tint `storm` until scribe_defeated then `none`, dark 0.3)

An ellipse of `spire_stone` round (11.5, 9.6) with a `stormglass` ring, on `storm_cloud`. `start` (11,18) up from the keyhole;
`stair_f3` (11..12,19) back to `ep6_obs_f3` (22,3). `desk` / `desk_still` scribe_desk (10..13,8, frames 0 and 1 by
scribe_defeated); actor `scribe` scribe_avatar (11,7) ifNot scribe_defeated; `scribe_trig` row 14 x 1..22; `quills_sign`
(9,8); `feather_desk` (14,8) if scribe_defeated; `kestrel_rim` (15,2, kestrel prop) and actor `aeris_t` (16,3) if
scribe_defeated (aeris_t ifNot library_reached); `kestrel_up` (17,1) to `ep6_library` (10,11) if scribe_defeated; enter
trigger `eyrie_enter` (scribe_after). Overhead: quills (10,6), (13,6) ifNot scribe_defeated; wind_script (10,5) if
scribe_defeated. Marks: `desk` (11,7), `party_stop` (11,11) +m +b, `aeris_enter` (11,17), `chart_spot` (11,10) +m +b,
`feather_spot` (14,8), `kestrel_rim` (17,2), `kestrel_door` (17,2).
**Solution:** north across row 14 (the Storm Scribe); after the win, north-east to (17,2), north into `kestrel_up`.

## 5. `ep6_library` The Cloud Library (20 x 16, interior, bright)

Plank floor round a stormglass reading circle on `cloudbank`, the `spire` wall at the back (rows 0..2). `start`/`arrival`
(10,11) up (cloud_library on enter, `library_enter`); `first_shelf` (9..10,3) ifNot first_page_read / `first_shelf_open` (frame
1) if first_page_read; `reading_desk` (14..15,7); `shelves_sign` (5,3); `kestrel_down` (10,12) to `ep6_zephyr` (22,5,
north_dock) if library_reached. Marks: `shelf` (9,3), `vex_shelf` (11,4), `party_stop` (11,6) +m (10,6) +b (12,6),
`aeris_door` (12,10), `seat_four` (4,8). **Solution:** the scene runs on arrival; then south onto `kestrel_down`.

## 6. Measures (`ep6_obs_ingame.py`, the real game, Rec. 709 luma on sRGB, whole map / walkable floor cells)

F1 0.741 / 0.543; F2 0.202 / 0.244 (every vane state within 0.001); F3 0.199 / 0.355 at the arrival (no lamp lit), 0.212 /
0.397 with the three lamps lit; the Eyrie 0.354 / 0.470 (storm), 0.423 / 0.561 after the lid opens; the library 0.657 /
0.527. F3 is at or below F2 (the darkest floor). Under the real `storm` tint and dark 0.5, unlit `spire_stone` (cells off
any lamp: the Listen deck, the causeway, the Anchor deck, the east deck) reads 0.333; the party's floor at the arrival reads
0.499 (gate: 0.22).

## 7. For other agents

- `door_scribe` draws `door_boss` (a mapcheck and `GATE_SPRITES` id) because the ep6 pack registers no gate sprite for the
  Sky Compass Keyhole; until `scribe_door_open` the object `keyhole_shut` draws `sky_keyhole_closed`. E6-integrate: register
  `GATE_SPRITES.sky_keyhole = ['sky_keyhole_closed', 'sky_keyhole_open']` (as ep5's `sun_keyhole`) and mapcheck's list, then
  switch the sprite.
- The Dash targets use `breakable: 'rock'` (the field draws `ab_cliff_crack` and blocks it, as `ep6_airstair` does): the
  field has no crate breakable, so `crate_d` reads as a cracked rock face, not the `crate_dash` art. A `crate` entry in
  `world/events.js` BREAK_ART would let it switch.
- The Locker draws `supply_coffer` (there is no locker art in the ep6 sheet).
- mapcheck's `listMapIds` and maps.test's id regex still name `ep[45]` only, so `ep6_patches` is listed as a map (E6-integrate).
