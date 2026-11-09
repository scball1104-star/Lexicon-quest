# Episode 5 maps, part B (E5-maps-b)

The Oracle Labyrinth: three floors and the Eye of the Oracle. Plan: `docs/EPISODE5_PLAN.md` 4.5 to 4.10, 5.1. Modules:
`src/data/maps/ep5_lab_f1.js` (also exports the Labyrinth kit the other three import: `labGrid`, `labLegend`, `dial`,
`stone`, `lamp`, `windowEv`, `sunPlate`, `sunGate`, `oasisFont`, `backDoor`, `lift`), `ep5_lab_f2.js`, `ep5_lab_f3.js`,
`ep5_lab_oracle.js`. Test: `qa/maps/ep5_b_maps.test.mjs` (11 tests, about 20 s) with its helper `qa/maps/ep5_b_lib.mjs`
(one state's light as the field sees it). Previews: `python tools/maps/previews/ep5_lab_render.py` (EP5DB tiles, the pack's
shade rule, E5-world's shade layer, the field's darkness and the hour's tint), one image per state, annotated, `_clean`,
`_x1` and `_phone` (the 844 x 390 frame round the state's focus). In the real game: `python
tools/maps/previews/ep5_lab_ingame.py [--device phone]` loads each floor with `?pack=ep5`, solves every puzzle with
`LQ_DEBUG.setHour` and `shoveCaster`, reads the field's collision back (30 checks), saves frames in `tools/maps/out/ep5_lab/`
and fails on any console error or unknown-id warning.

## How to check

```bash
node --test qa/maps/ep5_b_maps.test.mjs
node tools/maps/mapcheck.mjs check --pack ep5 ep5_lab_f1 ep5_lab_f2 ep5_lab_f3 ep5_lab_oracle
node tools/maps/ep5_check.mjs ep5_lab_f2          # one floor's shade report: states, nodes, firstAt per event
python tools/maps/previews/ep5_lab_render.py      # 15 previews (+ _clean, _x1, _phone) into tools/maps/previews/
```

## Rules these maps keep (beyond plan 4.5 and 5.1)

- **Every barrier holds at every hour until its stone or lamp moves.** The hour is one for the whole floor and every dial
  offers all three, so a plate or a crossing that one hour alone opens would be opened from another room before the player
  ever saw it. F1 D's plate is boxed in shade at all three hours until its block moves; F2's shafts each have a window at
  both ends and an oculus over their one door cell (noon), so only a pillar opens them.
- **Every court the sand can cut off has its own dial**, and every court a moved stone or lamp opens has a one-way way
  home: F1's camp court has its back door into B (opens on `sel_memory_1`), F2's far side the approach's back door into the
  hall's foot (opens on `dune_key_f2`), F3's islands their brass lifts to the top landing. The test's reload rule checks
  it: from every reachable cell, with every subset of plates latched, woken where the field wakes a party (off sand that
  runs at the start hour), every stone and lamp home, the arrival is reachable again.
- **No dressing in a shadow's line.** The field's light stops at map walls and closed gates; mapcheck's also at decor
  props. The test runs every hour and every stone and lamp position with both and asserts the same light.
- Dials, plates, grooves, casters, lamps, triggers, enemies, arrivals and every staged mark stand on pavement. A shadow
  bridge leaves one pavement cell between its caster and the sand. No plate or dial in the cells a tall caster's sprite
  hides. Every Shove leaves the leader on pavement.

## 1. `ep5_lab_f1` The Shifting Dunes (40 x 30, `labyrinth`, `desert_wind`, open sky, start noon)

Walls `dune_court`, floor `dune_court`, paving `caravan_paving` on approaches. Arrival `start` (20,27) up, from the Haven's
`north_door`.

| Area | Cells | Contents |
|---|---|---|
| A Oasis Gate | floor x 14..24, rows 25..28 | `to_haven` (19..21,29) to `ep5_saffron` (21,5) if `lab_entered`; `font_l1` (21..22,25); `dial_a` (16,26); `chest_a` wood hourglass_sand x2 (14,25); `lift_f1` (24,25) to F2 (25,12) if `lab_f2_done`. Steps north (17..19, 22..24). |
| B Two Shadows | floor x 15..36, rows 14..21; strip sand x 22..26 | `ob_bw` (20,17, h 3, obelisk_scraped, the arrival pan `scraped`); `ob_be` (28,19, h 3); `chest_dune` wood dune_key (24,19) on the strip; `chest_b` iron (36,21); back door `back_b` (18,13). |
| C the Groove | floor x 29..37, rows 3..10; corridor (26..28,4) sand | `ss_c` (30,6, h 2, Shove) on groove x 30 rows 4..8; `dial_b` (36,4). Passage from B (33..34, 11..13). |
| Camp court | floor x 16..25, rows 3..10 | `memory1_trig` column x 24 rows 3..10; marks `camp` (20,6), `camp_stage` (20,8) +m (19,8) +b (21,8), `camp_tamir` (19,6), `camp_student` (21,6), `camp_child` (20,5), `camp_traveler` (22,6), `camp_out` (18,10); sign `ep5_camp_court` (22,9). Corridor west (8..15,10) to `door_d`. |
| D Sun Plate | floor x 2..11, rows 14..21 | `door_d` (8..9,13, dune_key); `dial_c` (11,15); colonnade `col_4..7` (4..7,15, h 1) under the path (4..7,14) sand; plate cluster: `plate_d` (10,18, lit, flag plate_f1_open), `plt_s` (10,20, h 2), `plt_l` (9,18, h 1), `plt_m` (11,18, h 1, Shove, groove 11,17..18); `gate_d` sun gate (3,13); `crack_d` (5,12, Dash) to the niche (5..6,10..11): `chest_wraps` gold nomad_wraps (5,10), `chest_bell3` wood caravan_bell (6,10) if bells_started. |
| E Far Court | floor x 2..14, rows 2..6; pool sand x 5..12 rows 2..5 | `ob_e` (14,4, h 3); `ss_e` (2,3, h 2); `chest_sunkey` gold sun_key (7,4); `chest_bell2` wood caravan_bell (7,3) if bells_started, else `chest_bell2_alt` hi_potion x2; `dial_d` (2,6); `stair_trig` (13,2) lab_f1_stair; `stair_f2` (13,1) to F2 (4,24). |

**Solution (autoplay):** dial_a dawn; from (23,19) open chest_dune. dial_a dusk; east along row 17 to (27,17). North to C:
stand (30,7), Shove up; step (30,6), Shove up (ss_c at 30,4). dial_b dawn; west along row 4 into the camp court
(memory1_trig). West along row 10, door_d. Stand (11,19), Shove up (plt_m at 11,17); dial_c dawn (plate_d latches, gate_d
opens); dial_c noon; west along row 14 to (3,14), north through gate_d (3,13) up the passage into E. dial_d dawn; along row 4
to (8,4), open chest_sunkey (7,4). stair_trig, stair_f2. Optional: dial_d dusk, chest_bell2 from (6,3); crack_d by Dash from
(5,14) at noon.

| Enemies | Cell | Move | | Enemies | Cell | Move |
|---|---|---|---|---|---|---|
| `e_bw` e5l1_stalkers | (16,19) | patrol up/down 2 | | `e_cor` e5l1_stalkers | (12,10) | patrol 2 |
| `e_be` e5l1_mixed | (32,17) | patrol right/left 2 | | `e_d` e5l1_mixed | (9,21) | guard |
| `e_c` e5l1_harriers | (34,8) | wander r1 | | `e_e` e5l1_reavers | (13,6) | guard |

## 2. `ep5_lab_f2` Gallery of False Horizons (40 x 30, `labyrinth`, `well_hush`, roofed, dark 0.4, start dawn)

Walls `horizon_gallery`, floor `gallery_tile`, the Star Floor `star_glass`. Arrival (4,24) down from F1's stair.

| Area | Cells | Contents |
|---|---|---|
| A Stair Foot | floor x 2..9, rows 23..27 | `stairs_f1` (3..4,22) to F1 (13,2); `font_l2` (6..7,24); `dial_a` (2,26). Gap north (7..8, 20..22). |
| B Long Shafts | hall x 2..14, rows 9..19 | shaft row 9: `win_b1w` (1,9) east at dusk, `win_b1e` (15,9) west at dawn, fixed `pl_b1` (8,9), oculus `oc_b1` (12,9) noon, niche `chest_side` iron (12,8). Middle rows 10..12 (sand, never lit): `dial_b` (4,11), `e_bm`. Shaft row 13: `win_b2w` (1,13), `win_b2e` (15,13), oculus `oc_b2` (13,13), stub `pl_stub` (14,12). Balustrade `col_2..12` (row 14, h 1) with the walk gap (13,14) and the groove gap (14,14). `pl_b` (14,15, Shove) on groove x 14 rows 13..16. |
| Map table room | floor x 2..7, rows 3..8 | `memory2_trig` (2..7,8); table (4..5,5); `win_table` (1,4) dusk; marks `table_stage` (4,6) +m (3,6) +b (5,6), `table_student` (4,4), `table_tamir` (6,5), `table_traveler` (2,5), `table_window` (2,4). East along row 3 to C. |
| C Star Floor | floor x 18..28, rows 3..8 | `vex_trig` column x 19 rows 3..8; `vex_spot` (23,4), `party_stop` (23,6) +m (22,6) +b (24,6), `star_socket` (23,5); inlay `star_dim` / `star_lit` (22..23, 5..6); `feather` (23,4) if vex_gallery_met; horizons signs (19,2) sea, (26,2) city. |
| D Two Windows | x 30..38: upper rows 4..6, K1 row 8, middle rows 9..14, K2 row 15, lower rows 17..21 | K1: `win_k1w` (29,8) dusk, `win_k1e` (39,8) dawn, fixed `pl_k1` (32,8), door cell (35,8) under (35,7), oculus `oc_k1`. K2: `win_k2w` (29,15), `win_k2e` (39,15), `pl_d` (36,13, Shove, groove 36,13..15), door cell (33,15) over (33,16), oculus `oc_k2`. `dial_u` (37,5), `dial_m` (31,11), `chest_key` wood dune_key (37,19). Reliquary: `win_rel` (29,6) dusk lights (30..32,6); `reliquary_obj` (31,6) if hour:dusk; back door `cache` (31,3) on reliquary_found; `chest_cache` gold 300 + hi_ether x2 (30,1), `book_log` travelers_log (32,1). |
| E Mirror Hall | floor x 18..27, rows 12..20; approach x 11..38 rows 25..27 | `door_e` (22..23,24, dune_key); `knight_trig` (18..27,15); actor `mirage_knight` (22,13); `stair_trig` (22,12) and `stairs_f3` (22,11) to F3 (16,3) if knight_defeated; `lift_f2_short` (25,11) to F1 (24,26) if lab_f2_done; `font_l2b` (19..20,26); `chest_ap` wood hi_potion x2 (11,27); back door `back_s` (12,24) on dune_key_f2. |

**Solution (autoplay):** stand (14,16), Shove up; step (14,15), Shove up (pl_b at 14,13). Dawn (the start): through (13,14),
(13,13) into the middle; north at x 2..7 across row 9 into the table room (memory2_trig). East along row 3 through
vex_trig. East into D: dial_u dusk; through (35,7), (35,8). Stand (36,12), Shove down; step (36,13), Shove down (pl_d at
36,15). dial_m dawn; through (33,15), (33,16); chest_key. South to the approach, door_e, knight_trig. After the win:
stair_trig, stairs_f3. Optional: dial_b dusk, chest_side from (12,9); dial_u dusk, the Lantern at reliquary_obj from (31,5),
the cache.

Enemies: `e_bm` e5l2_mixed (11,11) guard; `e_c` e5l2_shades (26,7) guard; `e_m` e5l2_husk (34,11) guard; `e_ap`
e5l2_mixed (30,26) patrol 3. The Knight is the actor and its arena trigger.

## 3. `ep5_lab_f3` The Well of Tomorrow (32 x 40, `mystery`, `well_hush`, hour night, dark 0.55)

Walls `well_shaft`, floor `well_basalt`, the shaft's edge `pit`. No dial: only lamps light (r 3). Arrival (16,3) down.

| Landing | Cells | Contents |
|---|---|---|
| Top | floor x 8..23, rows 3..6 | `stairs_f2` (15..16,2) to F2 (22,12); `font_l3` (10..11,4); `book_vows` (13,3); `lamp_top` (21,4) over a sand bed (22..23, 3..6); `down_shelter` (16,6). Marks `stair_above` (15,2), `sel_top` (19,4), `top_stage` (19,6) +m (18,6) +b (20,6). |
| Shelter | floor x 4..27, rows 10..15; moat (14..18, 12..13) | `up_top_s` (15..16,9); `lamp_s` (17,11, Shove, groove 17..21,11); island rows 14..15: `shelter_trig` (14..18,14), `spring_shelter` (8..9,14), `sel_wait_1` (10,14), `shelter_stage` (12,14) +m (11,14) +b (13,14), `down_truth` (22,15), `lift_s` (25,14) to the top (11,6). |
| Truth | floor x 4..27, rows 19..24; moat (13..19, 21..22), (14..18, 23) | `up_shelter` (9..10,18); `lamp_t` (16,19); `ss_t` (14,20, Shove, groove 13..16,20); ledge (15,21); island row 24 (and row 23 either side): `truth_trig` (14..18,24), `spring_truth` (9..10,24), `sel_wait_2` (11,24), `truth_stage` (13,24) +m (12,24) +b (14,24), `down_return` (22,24), `lift_t` (25,24); the faint bridge (7,24) over the shaft's edge to `chest_bow` gold starwright_bow (6,24); `chest_truth` iron (26,19). |
| Return | floor x 4..27, rows 28..33; wall row 31 | `up_truth` (9..10,27); `lamp_r1` (13,30), `ss_r` (14,30, fixed), `plate_r` moon (16,30, shade, latch), `lamp_r2` (18,29, Shove, groove 18..20,29); `gate_r` moon gate (16,31); `return_trig` (16,32); `spring_return` (11..12,32), `sel_wait_3` (13,32), `return_stage` (15,32) +m (14,32) +b (16,32); `page` (11,33), `page_sel` (12,33), `page_stage` (14,33) +m +b; `down_keyhole` (22,33). |
| Sun Keyhole | floor x 10..22, rows 37..38 | `up_return` (21..22,36); `keyhole_shut` (15..17,36) until oracle_door_open, then `door_oracle` (sun_key) to the Eye (11,18); `chest_hourglass` wood hourglass_sand x2 (11,38). |

**Solution (autoplay):** Shelter: stand (16,11), Shove right; step east and Shove right twice more (lamp_s at 20,11 or 21,11);
cross at x 14..16 to the island (shelter_trig). Truth: stand (13,20), Shove right; step (14,20), Shove right (ss_t at 16,20);
(15,20), (15,21), down column 16 to (16,24) (truth_trig). Return: stand (17,29), Shove right; step (18,29), Shove right
(lamp_r2 at 20,29): plate_r falls dark and latches, gate_r opens; (16,32) (return_trig, then sel_memory_3). down_keyhole;
door_oracle. Optional: the Lantern from (8,24) over the faint bridge to chest_bow.

Enemies: `e_s` e5l3_shades (6,11) patrol; `e_t` e5l3_husks (24,20) guard; `e_t2` e5l3_shades (12,20) guard; `e_r`
e5l3_mixed (24,28) guard.

## 4. `ep5_lab_oracle` The Eye of the Oracle (24 x 20, music none, dark 0.3)

A round star-glass floor (an ellipse round 11.5, 11). `start` (11,18) up, from the Sun Keyhole; `eye_exit` (11..12,19) back.
`ring` / `ring_empty` oracle_ring (10..13, 5..8; frame 0 before, 1 after oracle_defeated); actor `oracle` oracle_avatar
(11,7) until oracle_defeated; `oracle_trig` (1..22,13); `chart` chart_glow (11..12,6..7) if chart_restored; `feather_eye`
(14,10) if oracle_defeated; `lift_out` (17,4) to `ep5_saffron` (21,5) if oracle_defeated; enter trigger `eye_enter`
(oracle_after after a reload). Marks `ring` (11,6), `party_stop` (11,11) +m (10,11) +b (12,11), `sel_enter` (11,17),
`chart_spot` (11,9) +m (10,9) +b (12,9), `chart_sel` (13,9), `feather_spot` (14,10).

## 5. Measures (`ep5_lab_render.py`, Rec. 709 luma on sRGB, whole map / floor cells)

F1 at noon 0.609 / 0.642 (dawn 0.541, dusk 0.463); F2 at dawn 0.207 / 0.220 (noon 0.249, dusk 0.177); F3 at night 0.127 /
0.192; the Eye 0.165 / 0.151. F3 is the darkest floor at its start state (CRITIQUE_6 item 6).

## 6. For other agents

- `sun_keyhole` and `door_dune` are not gate sprites yet (GATE_SPRITES / mapcheck GATE_SPRITE_IDS): `door_oracle` draws
  `door_boss` (its shut stand-in `keyhole_shut` the same art) and `door_d`, `door_e` draw `door_key`. Once registered as
  `[<id>_closed, <id>_open]` pairs, swap the sprite on those three events.
- The Dash crack `crack_d` draws the breakable `rock` art (`ab_cliff_crack`): `cracked_base` is an object, and breakables
  draw tiles, so it is not used.
- The back doors are objects (`door_dune_closed` until the flag, `door_dune_open` after) with no inspect line: E5-story wrote
  none (6 mapcheck warnings). A line `ep5_back_door` would clear them.
- mapcheck's grid counts every event whatever its flags, so a door gone once its flag is set still stands in the bare
  `ep5_check` report (`chest_cache`, `book_log` show as unreached there); the test searches each floor as the field sees it
  under its flags.
- **A field entity spans `h` cells down from its anchor** (`eventCells` reads `h` as rows), and a standstone's `h` is its
  height: an obelisk's event covers its cell and the two below. A Shove into a covered cell is refused as blocked
  (`canShove`). F2's stub pillar is `h: 1` for that reason (h means nothing under a roof); the test checks no groove cell
  lies under another caster's event.
- A save made on a stone's or lamp's home cell (after it was Shoved away) reloads with the stone on the party: the field's
  `rescue` moves the party only off running sand.
