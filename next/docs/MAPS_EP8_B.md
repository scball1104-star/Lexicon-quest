# Maps, Episode 8, part B: the First Library and the Last Word (E8-maps-b)

Owner: E8-maps-b, wave 8c (2026-11-16). Plan: `docs/EPISODE8_PLAN.md` 4.4 to 4.11, 5.1, 5.4, 7.6. Staging:
`docs/story/STAGING_EP8.md` sections 2 and 3. The rule and the map tool: `docs/WORLD_EP8.md`, `tools/maps/ep8_check.mjs`.
Files: `src/data/maps/ep8_library_f1.js` (and the Library kit the other three import: `libGrid`, `popbook`, `fountain`,
`lift`, `LIBRARY_GATE`), `ep8_library_f2.js`, `ep8_library_f3.js`, `ep8_last_word.js`. Tests: `qa/maps/ep8_b_maps.test.mjs`.
Previews: `python qa/maps/ep8_b_preview.py [--phone]` writes `tools/maps/previews/ep8_library_f1*.png`, `ep8_library_f2*.png`,
`ep8_library_f3*.png`, `ep8_last_word*.png` (2x; the plain `<id>.png` is annotated with every event and mark). Coordinates
are x, y (tiles). A book's (x, y) is its top-left cell: an `ns` book covers (x..x+1, y), an `ew` book (x, y..y+1).

## The decision budget (plan 4.10), as `node tools/maps/ep8_check.mjs <id> <flags>` prints it

| Map | Decisions (plan) | Walk / straight route | Reads in order (the cell read from) | Optional |
|---|---|---|---|---|
| `ep8_library_f1` | **4** (4: B 2, C 1, E 1) | 105 / 99 | `pb_a`@21,19 `pb_b`@24,11 `pb_ember`@34,9 `pb_hollow`@23,5 | 1 (`pb_d`) |
| `ep8_library_f2` | **4** (4: B 2, C 2) | 84 / 80 | `pb_valewyn`@6,16 `pb_w`@13,11 `pb_desert`@21,5 `pb_y`@28,5 | 2 (`pb_a1`, `pb_a2`) |
| `ep8_library_f3` | **4** (4: SEE 1, SHELTER 2, CHOOSE 1) | 58 / 52 | `pb_s`@24,28 `pb_isles`@21,22 `pb_north`@23,17 `pb_c2`@21,15 (or `pb_c1`@13,15) | 1 (`pb_lantern`) |

12 in the Library, plus the Stair's 4: 16. No re-read on any critical path (no loop home). Every page cell is readable
without a pan (`panned` 0 on all three floors). The flag sets searched (the real run's, plus none): `qa/maps/ep8_b_maps.test.mjs`
`RUNS`. Note for E8-world: `ep8_check.mjs` `MAIN_FLAGS` names the arrival flags `f1_arrived`, `f2_arrived`, `f3_arrived`; the
story's are `lib_f1_arrived`, `lib_f2_arrived`, `lib_f3_arrived`, so its F1 to F3 sets leave the memory triggers out. My
tests pass the story's flags.

## `ep8_library_f1`: The Catalog of Lost Lives (40 x 30, lighting tint `dawn`, dark 0)

Ground: `_` `void_violet`, `p` `parchment`, `g` `goldscript`, the drawer wall on rows 0..2 (and the alcove block 11..16,
12..14). Music `first_library`, ambience `library_hush`. The plan's "warm gold cast" is the core `dawn` tint (it also keeps
floor I darker than floor III: the brightness gate below).

| Area | Cells | Contents |
|---|---|---|
| A. Restoring Fountain | g 17..23 x 24..28; stair 19..21,29; neck 20..21,23 | arrival/start (20,27) up; `to_scriptorium` stairs (19..21,29) to `ep8_scriptorium` (23,9) down; **font `font_l1` (22..23,25)**, `ep8_fountain`; `chest_a` wood `fresh_ink` x2 (18,28); `lift_l1_up` (18,25, if `library_f2_done`) to F2 (28,17); F2's `lift_l2_down` lands (22,26) |
| B. Crossing Pages | gallery p 5..29 x 18..22; alcove 12..15 x 15..17; island g 18..25 x 9..13 | book **a** ns (21,18) len 4, north pages 21..22 x 14..17, notch (20,17); book **b** ew (25,10) len 4, east pages 26..29 x 10..11, notch (26,12); `memory_a_trig` (12..15,17); `chest_b` wood `hi_potion` x2 (24,9); foes `e_gw` wraiths patrol (10,20), `e_gm` mixed (27,20) |
| C. The Wall Behind | p 30..37 x 8..16; notch (35,7), ledge (32,6) | Emberpeak book **c** ns (33,8) len 4: bridge 33..34 x 6..7, wall 33..34 x 4..5 on the shelf; foe `e_cw` worms (35,13) |
| D. Side Alcove (optional) | p 3..9 x 9..14; nook (3,8); notch (8,17) | book **d** ns (6,18) len 3, bridge 6..7 x 15..17; `chest_page2` iron `drift_page` flag `drift_2_found` if `drift_started` / `chest_page2_alt` `hi_ether` (9,9); Dash stack `stack_d` (3,9) before `chest_boots` gold `margin_boots_set` (3,8); foe `e_dw` wraiths (6,11) |
| E. Northern Shelf | p 22..37 x 3..5, lip 21..23,6; far end g 12..17 x 3..6, nook (16,7) | Hollow book **h** ew (22,4) len 4, bridge 18..21 x 4..5, notch (21,6); `chest_key` gold `ink_key` flag `ink_key_found` (13,3); Dash stack `stack_e` (16,6) before `chest_page3` wood `drift_page` flag `drift_3_found` / `chest_page3_alt` `hi_potion` (16,7); `chest_cache` iron **1,500 gold** + `hi_ether` (37,3); `lift_trig` (28,4) `library_f1_lift`; `lift_up` (28,3) to F2 (5,27); F2's `lift_down` lands (29,4); foe `e_em` mixed (30,4) |

Books: B, C, E as above. Solution: read a from (21,19) up, cross by (20,17); b from (24,11) right, cross by (26,12); c from
(34,9) up, step on at (35,7), off at (32,6); h from (23,5) left, step on at (21,6); the key; back to the lift. The Emberpeak
wall closes rows 4..5 of the shelf behind the party (the shelf's top row stays open to the cache).

## `ep8_library_f2`: The Palimpsest Galleries (40 x 30, dark 0.3, lamp pools)

Ground: `e` `vellum`, the palimpsest wall on rows 0..2. Pairs: v/w (Valewyn and its plain pair), x/y (the desert book and the
gallery door), a1/a2 (the side galleries). `start: { y: 'n', a2: 's' }`.

| Area | Cells | Contents |
|---|---|---|
| A. Overwritten Stair | e 2..9 x 23..28; neck 4..5,22 | arrival/start (5,27) up from F1's `lift_up`; `lift_down` (3,24) to F1 (29,4); **font `font_l2` (7..8,24)**; `lift_back` lands (6,25) |
| B. The Pair | west gallery 2..7 x 14..21, notch (8,15); island 11..16 x 10..19, notch (12,9) | Valewyn **v** ew (7,16) len 3, bridge 8..10 x 16..17; **w** ns (13,10) len 3, bridge 13..14 x 7..9; `memory_b_trig` (11..16,15); foes `e_bm` mixed patrol (4,19), `e_bc` cranes (15,18) |
| C. The Wrong Version | landing 11..22 x 3..6, notch (23,6); corridor 26..38 x 3..5, door step 27..29,6, notch (27,7) | desert **x** ew (22,4) len 3, bridge 23..25 x 4..5; **y** ns (28,6) len 3: start open north, a wall 28..29 x 3..5 across the corridor; read from the north it bridges 28..29 x 7..9 down to the Seal Gallery |
| D. Side Galleries (optional) | notch (33,6); gallery 33..35 x 8..16; lip 36,8..9, notch (36,7); Archive alcove 37..38 x 8..13 | **a1** ns (34,5) len 2, bridge 34..35 x 6..7; **a2** ns (37,8) len 2: start south (a wall 37..38 x 9..10 in the alcove mouth), read from the south it bridges 37..38 x 6..7 back up; `page_names` (33,10), `page_order` (35,12), `page_correction` (33,15) wood `evidence_page` with their flags; `chest_d` wood `hi_potion` x2 (35,16); `archive_obj` (38,12, `uncensored_archive`); `chest_archive` gold 500 + `hi_ether` x3 (37,13) and `book_keeper_hid` (38,13), both if `archive_open`; foe `e_sl` librarian (34,13) |
| E. Seal Gallery | strip 27..30 x 10..21; joint 26,19..21; arena 18..25 x 11..21 | **font `font_l2b` (28..29,16)**; landing (28,17) for F1's `lift_l1_up` and F3's `lift_down`; `chest_gallery` iron **1,500 gold** + `hi_potion` (30,21); one cage (30,15): `lift_back` to A (6,25) while not `library_f2_done`, then `lift_l2_down` to F1 (22,26); `sentry_figure` actor (22,13, ifNot `sentry_defeated`); `sentry_trig` (25,19..21) `unnamed_sentry`; `lift_trig` (22,12) `library_f2_lift` and `lift_up` (22,11) to F3 (17,36), both after `sentry_defeated`; foe `e_em` mixed (29,12) |

Solution: v from (6,16) right; w from (13,11) up (v folds behind, harmlessly: everyone is on the island); x from (21,5)
right (y folds, the corridor opens); y from (28,5) down, step on at (27,7) (x folds behind). Optional: a1 from (34,4) down
(a2's wall folds: the Archive opens); a2 from (37,9) up (the way back; a1 folds).

## `ep8_library_f3`: The Unwritten Page (34 x 40, lighting none)

Ground: `b` `blank_page`, `g` `goldscript` (the keyhole landing), the shelf shaft on rows 0..6 (faces 5..6) and the pillar
22..25 x 30..32. Music `mystery`. Pairs: i/n (SHELTER), c1/c2 (CHOOSE).

| Area | Cells | Contents |
|---|---|---|
| First landing | b 8..29 x 28..37 | arrival/start (17,36) up from F2's `lift_up`; `lift_down` (12,36) to F2 (28,17); **font `font_l3` (20..21,36)**; `memory_c_trig` (8..26,35); the memory marks on rows 28..32 |
| SEE | niche 23..25 x 28..29 (closed west), step (25,27), notch (25,26); islet 2..4 x 32..35, notch (7,35) | **s** ns (23,27) len 2, bridge 23..24 x 25..26; Lantern **l** ew (8,33) len 3 (`lantern: true`), bridge 5..7 x 33..34; `chest_quill` gold `quill_of_return` (2,33); foe `e_lp` pages (25,33) |
| SHELTER | b 8..29 x 21..24, notch (20,20); neck 21..22,17; pocket 23,17..19 + ledge 24..25,19; stair 26,17..18, 27,18..20 | isles **i** ns (21,21) len 4: bridge 21..22 x 18..20, wall on the neck; North **n** ew (24,17) len 1: bridge (25,17..18) to the stair home; foes `e_sl` librarian patrol (10,23), `e_sp` pages (25,22) |
| CHOOSE | b 4..30 x 14..15, 6..22 x 16; notches (12,13), (22,13) | **c1** ns (13,14) len 2, bridge 13..14 x 12..13; **c2** ns (20,14) len 2, bridge 20..21 x 12..13; foes `e_cl` librarian (8,15), `e_cm` mixed (26,15) |
| The keyhole | g 12..22 x 7..11 | `name_trig` (12..22,11) `the_name`; decor `ink_door` (16,7) state 0 / 1 by `name_told`; `keyhole` inspect (17,7, ifNot `name_told`, solid: the shut doorway); door `ink_door` (17,7, if `name_told`) to `ep8_last_word` (14,20); `charter` (14,6) `ep8_charter`; `charter_book` (20,8) `living_charter`; `chest_ink` wood `fresh_ink` x2 (12,8); the Last Word's `word_down` lands (17,9) |

Solution: s from (24,28) up (round the pillar by the east); i from (21,22) up, step on at (20,20), off east into the pocket;
n from (23,17) right (i folds: the neck opens; n's bridge is the way home); c2 from (21,15) up, or c1 from (13,15): both
reach the keyhole (tested each alone). Optional: l from (9,33) left, Lantern lit.

## `ep8_last_word`: The Last Word (28 x 24, tint `violet`, dark 0.2; after `eraser_defeated` tint `hollow_dawn`)

Ground: `m` `scriptmosaic` (an ellipse round 13.5, 14), `g` `goldscript` dais 9..18 x 7..11, the book towers round it. Music
none (the scene sets it), ambience `library_hush`. No books, no foes.

`great_lexicon` object (12,7, w 4: states 0 / 3 / 6 by `lexicon_restored`, `page_shelved`), `star_dome` object (11,5, an
overhead piece on the wall band, states 0 / 3 by `eighth_star`), `lectern_obj` (15,8), `first_shelf` object (13,12, w 3,
states 0 / 1 by `page_shelved`); `word_down` stairs (13..15,21) to F3 (17,9), **always present** so a lost fight (the party
wakes at the entry, the map's arrival) can walk out to rest; `eraser_trig` (3..24,17) `eraser` (if `name_told`, ifNot
`eraser_defeated`); enter triggers `lw_after`, `lw_choice`, `lw_page`; `lectern_trig` (13..15,10) `last_choice` (if
`keeper_named`, no ending); `square_return` lift (5,13, if `eraser_defeated`) to the Scriptorium (23,9). The Scriptorium's
`lexicon_door` lands on `dais` (14,8).

## Camera margins (STAGING_EP8 focus marks: mark (cell) sides/ends; the rule 12/7)

- F1: `crossing` (17,19) 17/10, `doorway_alcove` (13,16) 13/13, `alcove_stage` (14,18) 14/11, `nox_alcove` (15,16) 15/13,
  `fk_door_m` (13,15) 13/14.
- F2: `pair` (12,17) 12/12, `printing_room` (15,12) 15/12, `printing_stage` (15,14) 15/14, `nox_printing` (16,12) 16/12,
  `fk_desk_m` (15,11) 15/11, `sentry_spot` (22,13) 17/13, `arena_stage` (22,17) 17/12.
- F3: `memory_c_spot` (17,31) 16/8, `memory_c_stage` (16,32) 16/7, `nox_landing` (18,30) 15/9, `mc_desk` (14,30) 14/9,
  `mc_vault` (20,31) 13/8, `mc_stand` (19,29) 14/10, `mc_bed` (13,28) 13/11, `mc_nurse` (16,28) 16/11, `mc_oldest` (14,29)
  14/10, `shelter` (18,22) 15/17, `keyhole` (17,7) 16/7, `party_stop_door` (17,10) 16/10, `nox_key` (17,8) 16/8, `ink_door`
  (17,7) 16/7.
- Last Word: `lectern` (14,9) 13/9, `dais` (14,8) 13/8, `dome` (14,7) 13/7, `book_front` (14,10) 13/10, `party_stop` (14,14)
  13/9, `nox_spot` (12,13) 12/10, `vex_stop` (15,13) 12/10, `shelf` (14,12) 13/11, `shelf_stage` (14,14) 13/9, `nox_shelf`
  (12,12) 12/11.

Note for E8-world: `ep8_check.mjs` `focusMarks()` matches `Focus marks, \`<map>\`[^:]*: ` and then wants a backtick, but each
STAGING line reads `(40 x 30: x 12 to 27, y 7 to 22): \`crossing\` ...`, so it finds no marks and the camera check runs on
none. `qa/maps/ep8_b_maps.test.mjs` parses the paragraph itself and asserts every mark above.

## Fonts (the bot's rests), enemies, the gold line

Fonts: `font_l1` F1 (22..23,25), stand (22,26); `font_l2` F2 (7..8,24), stand (7,25); `font_l2b` F2 (28..29,16), stand
(28,17); `font_l3` F3 (20..21,36), stand (20,37). Enemies match `ZONES` (E8-battle): F1 wraiths 2, worms 1, mixed 2; F2
librarian 1, cranes 1, mixed 2 and the Sentry (`sentry_trig`); F3 pages 2, librarian 2, mixed 1; the Last Word the Eraser
(`eraser_trig`). Gold line (7.6): F1 `chest_cache` 1,500, F2 `chest_gallery` 1,500, both on the main path.

## Brightness (stand-in grades of `qa/maps/ep8_b_preview.py`, mean frame luma)

F1 0.312 to 0.327 (the `dawn` cast); F3 0.343 to 0.349: floor III is the brighter. On F3 the hero's sprite (mean luma 0.32
of its opaque pixels) sits 0.30 under the `blank_page` floor (0.62): over the 0.12 gate. F2 0.236 to 0.240 (dark 0.3);
the Last Word 0.239 before, 0.358 after the gold lift.

## Changes to plan 4 and why

- F2's shortcut down `lift_l2_down` is in the Seal Gallery (E), not the Overwritten Stair (A): it is the other end of F1's
  `lift_l1_up`, which lands there. A lift in A would make the trip down walk F2 backwards with its books reset (the Episode 6
  trap). One cage serves `lift_back` (to A, before `library_f2_done`) and `lift_l2_down` (after).
- `lift_back` (F2 E to A, one way, same map) is new: once the pairs fold behind the party, nothing else leads back to the
  start before the Sentry falls, and the softlock rule wants a way home from every state.
- F1 C: by rule 4.4 a book's far long side is its own first page row, so an open book can only be shut from the side it was
  read from; "close it from the far side" is not possible. The Emberpeak book bridges and walls the shelf behind the party
  (1 read, as planned); F3's SHELTER uses the pair to fold from the far side, which is the rule's own way.
- F3's keyhole landing is at rows 7..11 (STAGING's camera note); the map stays 34 x 40.
- The Last Word's `word_down` is present from the start (STAGING listed it with `eraser_defeated`): the retry wakes at the
  entry and must be able to leave. The Librarian is not a standing map actor at the lectern: the `eraser` scene spawns him
  there itself, and a second sprite would stay behind after the swap.
- Two F2 pairs start open (`y`, the wrong version, and `a2`, the Archive's wall): the plan's one main-path start plus the
  Archive's "page wall".

## Contracts for the other agents

- E8-maps-a: the Library doors land on `ep8_scriptorium` (23, 9) facing down (`LIBRARY_GATE` in `ep8_library_f1.js`):
  the cell below `library_gate`'s seal. `library_gate` should land on F1 (20, 27); `lexicon_door` on the Last Word (14, 8).
- E8-story: `EP8_BANNERS` has no `ep8_last_word` entry (plan 2.1 gives "The Last Word"); mapcheck warns.
- E8-world: `popbook_ew` and `popbook_realm_ew` are anchored at their bottom cell, but `EXT.popbook.create` places the prop at
  the book's top-left (x, y), so an `ew` book draws one row high; the previews draw it at y + 1.
- Orchestrator: `qa/maps/maps.test.mjs` line 22 filters `ep[4-7]_`; with Episode 8 maps present it must read `ep[4-8]_`.
  The `EP8_MAPS_LISTED` line in `src/data/ep8/encounters.js` becomes `export const EP8_MAPS_LISTED = true;`.
