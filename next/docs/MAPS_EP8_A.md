# Episode 8 maps, part A (E8-maps-a)

The two pack patches of Episode 7 maps, the Stair of Written Light, the Scriptorium, its four interiors and the bell tower at
night. Plan: `docs/EPISODE8_PLAN.md` 3, 4.1 to 4.4, 4.9 to 4.11. Staging: `docs/story/STAGING_EP8.md`. Books:
`docs/WORLD_EP8.md`. Tests: `qa/maps/ep8_a_maps.test.mjs` (13). Previews: `python tools/maps/previews/ep8_stair_render.py
[mapId] [--scale=N]` (EP8DB tiles, the book layer drawn through E8-tiles' mirror of the field, phone frames at 844 x 390).
`node tools/maps/ep8_check.mjs ep8_stair` prints the Stair's book report. Coordinates are tiles, (0,0) top-left; edge
distances are (left, right, top, bottom) = (x, W-1-x, y, H-1-y).

## 1. Patches (`src/data/maps/ep8_patches.js`, applied by `src/data/ep8/maps.js` after the ep7 pack registered)

| Map | Added | Cells |
|---|---|---|
| `ep7_ph_watch` (`withEp8Wake`) | enter trigger `ep8_wake` (`ep8_morning`, if `ep7_complete`, ifNot `ep8_morning_done`) | (0,0) |
| `ep7_stillheart` (`withStairDoor`) | enter trigger `ep8_roof_enter` (`ep8_roof`, if `ep8_started`, ifNot `ep8_roofed`) | (0,0) |
| | inspect `stair_door_look` (`ep8_stair_door`, if `ep8_started`, ifNot `ep8_roofed`); stairs door `stair_up` (if `ep8_roofed`) to `ep8_stair` (15,57,'up') | (20,9) = `stair_foot` |
| | marks `aeris_roof` (15,12), `stair_stage` (20,11), `stair_stage_m` (19,11), `stair_stage_b` (21,11) | |
| | overhead `kestrel` (the ep6 piece, collision none) at (8,12), covering 8..13 x 10..12, if `ep8_started` | |

Every Episode 7 cell, overlay, decor entry, mark and event is unchanged and the input is never mutated (tested). With
Episode 7 complete and `EP8_LIVE` off, both maps walk exactly as Episode 7's (tested): the wake trigger runs a scene that
returns at once, and nothing else is present until `ep8_started`. A trigger reads flags only, so `ep7_complete` stands for
counter `credits7_rolled` (the Episode 6 and 7 precedent). STAGING's `nox_table8` is not needed (Episode 7's `keeper_chair`).

## 2. `ep8_stair` (30 x 60, field, `orrery`, `sky_wind`, motes)

Ground `script_step` over `void_violet`; `goldscript` on the South Margin landing and the desk corner.

| Part | Cells | Contents |
|---|---|---|
| The foot | 11..19 x 49..57 | start / `stair_bottom` (15,57) = `STAIR_FOOT`; `stair_enter` (`stair_arrival`); `stair_down` (15,58) to `ep7_stillheart` (20,10) if `stair_arrived`; wood chest `chest_foot` (12,55) hi_potion x2; page lift `lift_foot` (19,56) to (23,13) if `saw_scriptorium` |
| The first rub | | `rub_row` 10..20 x 49 (`first_rub`, if `stair_arrived`); `first_trig` 10..20 x 48 (`first_book`, if `first_rub_done`); `e_e8s_first` (11,46) plan anchor, never present; `e_e8s_hounds` (19,45) wander r1, if `first_rub_done` |
| Gap A | void 41..42 across, notch 14..15 x 43 | book **a** `pb_willow` (ns 14..15 x 44, length 3, realm willowmere, text `ep8_realm_willowmere`); read from (15,45); pages 14..15 x 41..43; step on from (13,43)/(16,43); lands on 14..15 x 40 |
| Gap B | strip 14..17 x 35; column 14 x 36..38; way round (17,36); pocket 16..17 x 37; void 32..34 | book **b** `pb_b` (ns 15..16 x 36, length 4). From the strip (its north side, met first) it opens south: walls on the pocket and the landing 39..40, a bridge over (15..16,38). From the pocket (16,37) it opens north: a wall on the strip (15..16,35), a bridge 32..34; step on from (17,34) (or (14,34)) |
| The ledge (optional) | 22..25 x 37..41 | book **l** `pb_ledge` (ew 19 x 39..40, length 2) read from (18,39) bridges 20..21 x 39..40; step on from (20,38); iron chest (24,39): `chest_ledge_page` drift_page (flag `drift_1_found`, if `drift_started`) / `chest_ledge` hi_ether |
| The reading desk | 10..20 x 26..31 | `desk_save` (18..19,26) font, text `ep8_desk`, sprite reading_desk; gold chest `satchel` (10,30) 1,700 gold; `rubbed_trig` 10..20 x 27 (`rubbed_steps`, if `first_book_read`); `e_e8s_cranes` (19,30) wander r1 |
| Gap C | lower void 24..25, island 12..17 x 21..23, upper void 19..20 | book **c** `pb_c` (ns 14..15 x 22, length 3) **starts open south**: bridge 14..15 x 24..25 from the landing, wall on (14..15,23). Step off by (13,24)/(16,24); close it from the north (15,21); read it from the south (15,23): wall (14..15,21), bridge 19..20; step on from (13,20)/(16,20); lands on 14..15 x 18 |
| The high stair | 11..19 x 14..18 | `eraser_far` (15,14), `eraser_low` (15,18); from `eraser_seen` a parchment strip (15, 14..18) stays blank |
| The South Margin | landing 11..24 x 11..13; arch 19..23 x 9..10 | `margin_trig` 11..24 x 11 (`south_margin`, if `stair_arrived`); exit 20..22 x 9 to `ep8_scriptorium` (23,34); `lift_margin` (24,13) to (18,56) if `saw_scriptorium`; `library_far` overhead at (16,0), 16..26 x 0..7 |

**Books (E8-world's search).** Main-path solution (the bot): `pb_willow` from (15,45); `pb_b` from (16,37); `pb_c` from
(15,21) (closes it); `pb_c` from (15,23) (opens north). **Decisions 4** (A 1, B 1, C 2), optional 1 (`pb_ledge` from
(18,39)). 16 of 81 states reachable, 0 stranded, every chest reachable, walk 78 cells against a straight route of 60 (1.30),
goal `north_exit`. The page lift (two-way, from `saw_scriptorium`) is the way back down: no book can be read from its far
bank, so without it a party in the Scriptorium could never walk down the Stair again (an addition to plan 4.1).

**Changed from plan 4.1.** Lesson C: a book cannot be shut from the side its pages stand on (a reader on its own bridge is
refused, and pages over floor are walls), so "open, cross, close it from the far side" is built as a book that starts open
as a bridge and a wall: cross on its pages, close it from its far (north) side, reopen it the other way. `rub_row` is y 49
and `first_trig` y 48 (book a's south pages are rows 45..47). The arch sits east (19..23) to keep the walk within 1.3 of
the straight route.

| Focus mark | Cell | left | right | top | bottom |
|---|---|---|---|---|---|
| foot_stage (_m 14, _b 16) | (15,52) | 15 | 14 | 52 | 7 |
| nox_foot | (16,50) | 16 | 13 | 50 | 9 |
| foes_drop (foes_drop_b (17,45)) | (15,45) | 15 | 14 | 45 | 14 |
| gap_a | (15,42) | 15 | 14 | 42 | 17 |
| gap_a_stage (_m 16, _b 18) | (17,46) | 17 | 12 | 46 | 13 |
| nox_gap_a | (17,44) | 17 | 12 | 44 | 15 |
| desk_stage (_m 13, _b 15) | (14,29) | 14 | 15 | 29 | 30 |
| nox_desk | (14,27) | 14 | 15 | 27 | 32 |
| eraser_far | (15,14) | 15 | 14 | 14 | 45 |
| library_far | (17,8) | 17 | 12 | 8 | 51 |

Other marks: `rub_row` (15,49), `gap_b` (16,33), `ledge_b` (23,39), `desk` (18,26), `eraser_low` (15,18), `gap_c` (15,22),
`margin` (17,11), `north_exit` (21,9), `lift_top` (23,13), `lift_bottom` (18,56). Enemies against `ZONES.ep8_stair.plan`:
e8s_first 1 (anchor), e8s_hounds 1, e8s_cranes 1.

## 3. `ep8_scriptorium` (46 x 36, town, `scriptorium_town`, `library_hush`)

Legend: `marble_page` streets 2..43 x 9..31 and the avenue 21..25 x 28..35; `scriptmosaic` square 13..33 x 13..26;
`letterpath` script-road 25..33 x 15..16; `goldscript` school steps 25..28 x 20..21; `ink_canal` ring (rows 12 and 27, columns
12 and 34); the cliff (`book_tower` band row 6, face rows 7..8) with doorways (23,8) and (27,8); the dark beyond everywhere
else. Bridges (marble overlays): north 22..24 x 12, south 22..24 x 27, west (12,18..19), east (34,18..19).

| Thing | Cells |
|---|---|
| Arrival, exit | `sc_arrive` enter (`scriptorium_arrival`); exit 22..24 x 35 to `ep8_stair` (21,10); start / `south_gate` (23,34); `home_trig` 21..25 x 33 (if `scriptorium_open`) |
| first_word | `word_trig` (22..24,27), `word_trig_n` (22..24,12), `word_trig_w` (12,18..19), `word_trig_e` (34,18..19) |
| The Codex, the folio | `codex` object living_codex (23,18); `folio_shut` book concordance_folio (23,20) until `concordance_started`; `folio` (script `concordance_light`) until `concordance_lit`; `folio_lit` font `ep8_folio` from `concordance_lit` |
| Register house | decor bindery_stall at (14,20) (solid 14..19 x 19..20); signs `bindery` (14,20), `blankets` (16,20), `stall` (17,20) `ep8_register`, `infirmary_door` (19,20) |
| Half-signs | `sign_a` (21,26), `sign_b` (7,12), `sign_c` (11,26), `sign_d` (41,12), `sign_e` (43,24), `sign_f` (28,31): state 0, `_done` state 1 from `scriptorium_open` |
| Candles | `candle_1..3` (25/28/31, 14): dark, `_lit` and a light from `scriptorium_open` |
| North end | `gate_trig` 20..26 x 9..10 (`library_door`, if `card_read`+`elowen_met`, ifNot `library_open`); `library_gate` object at (22,8) states 0 / 1 (`library_open`) / 2 (`page_shelved`); `gate_shut` sign (23,8) until open; `library_door` (23,8) to `ep8_library_f1` (20,27,'up') if `library_open`; `lexicon_door` (27,8) to `ep8_last_word` (14,8,'down') if `page_shelved` (arch overlay shut before); `door_index` (17,10) to `ep8_sc_index` (9,12) |
| Doors | `door_inn` (5,20) to `ep8_sc_inn` (10,10); `door_shop` (39,18) to `ep8_sc_shop` (7,9); `door_atelier` (37,29) to `ep8_sc_atelier` (8,9) |
| NPCs | quinn (23,26), elowen (18,21), meya (26,21), ione (21,19), arun (27,16), fen (14,11), vex8 (29,20, if `scriptorium_open`) |
| Arrival from the Last Word | `sc_open` enter (`scriptorium_open`, if `page_shelved`); E8-maps-b's `square_return` lands on (23,9) |

| Focus mark | Cell | left | right | top | bottom |
|---|---|---|---|---|---|
| codex | (23,18) | 23 | 22 | 18 | 17 |
| sign_a | (21,26) | 21 | 24 | 26 | 9 |
| gate_stage (_m 22, _b 24) | (23,28) | 23 | 22 | 28 | 7 |
| quinn_gate | (23,26) | 23 | 22 | 26 | 9 |
| meya_steps | (26,21) | 26 | 19 | 21 | 14 |
| steps_stage (_m 25, _b 27) | (26,23) | 26 | 19 | 23 | 12 |
| stall | (17,21) | 17 | 28 | 21 | 14 |
| stall_stage (_m 17, _b 19) | (18,23) | 18 | 27 | 23 | 12 |
| library_gate | (23,8) | 23 | 22 | 8 | 27 |
| library_stage (_m 22, _b 24) | (23,11) | 23 | 22 | 11 | 24 |
| arun_post | (27,16) | 27 | 18 | 16 | 19 |
| vex_step | (29,20) | 29 | 16 | 20 | 15 |
| index_door | (17,10) | 17 | 28 | 10 | 25 |
| folio_stage (_m 22, _b 24) | (23,22) | 23 | 22 | 22 | 13 |

Other marks: `nox_gate_s` (22,27), `codex_n` (23,16), `codex_s` (23,20), `codex_w` = `nox_codex` (21,18), `codex_e` (26,18),
`elowen_stall` (18,21), `nox_stall` (20,22), `nox_gate` (23,9), `nox_index` (18,11), `ione_spot` (21,19), `fen_spot` (14,11),
`lexicon_door` (27,9), `crowd_a..f` (16,15) (30,18) (15,24) (31,22) (20,25) (27,25), `library_cliff` (39,4) (the decal,
overhead at (36,0)), `inn_door` (5,21), `shop_door` (39,19), `atelier_door` (37,30). No foes, no chests.

## 4. Interiors (each the Willowmere layout, start and exit cell; fits one screen: camera exempt)

| Map | From | Contents |
|---|---|---|
| `ep8_sc_inn` | `inn` | `ep8_innkeeper` (3,4) = `counter`; `inn_bed` (17,7); stairs (11,2)/(15,2); exit (10..11,11) to (5,21) |
| `ep8_sc_shop` | `item_shop` | `ep8_shopkeeper` (5,4) = `counter`; exit (7,10) to (39,19) |
| `ep8_sc_atelier` | `smithy` | `sorel` (4,5) = `counter`; Shove: block `atelier_crate` (11,4) before wood chest `atelier_chest` (11,3) hi_ether (barrels 10,3 and 12,3; push west from (12,4)); exit (8,10) to (37,30) |
| `ep8_sc_index` | `chapel` | `index_trig` 1..10 x 11 (`meet_librarian`, if `read_learned`); `ep8_librarian` (5,4) ifNot `librarian_met`; `first_keeper` (5,4) if `keeper_named`; marks `librarian_desk` (5,4), `desk` (5,5), `back_door` (5,3), `party_stop` (5,7) (_m 4, _b 6), `index_stage` (9,11); save `save_bell_index` (12,11) `ep8_index_bell`; dark 0.15, lamp (5,5); exit (9,13) to (17,11) |

## 5. `ep8_bell_night`

`bell_tower.js` exports its module as the default and `TOLL_STEPS` / `TOP_STEP`: the module spreads it under the new id
(nothing copied by hand) and replaces only the events: `bell_night_enter` (enter) and `trig_thirteenth` (12,6) run
`thirteenth_name`; `trig_toll_1..12` on `TOLL_STEPS` run `ep8_toll_1..12`; `keep_one` (12,4) inspect `ep8_keep_one`; the
cold open's lights kept. Marks: `stair_foot` (12,36) = `BELL_FOOT`, `bells` (12,4), `top` (12,6), `mira_beam` (10,4),
`bram_beam` (14,4), `keep_one` (12,4). Tint night. `party: 'solo'` is a stub field: no engine reads it yet (see the report).
