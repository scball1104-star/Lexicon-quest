# Episode 4 maps, part B (E4-maps-b)

The Sunken Keep: three floors and the Drowned Throne. Plan: `docs/EPISODE4_PLAN.md` 4.4 to 4.9, 5.1. Modules:
`src/data/maps/ep4_keep_f1.js` (also exports the keep kit the other three import: `keepGrid`, `keepLegend`, `wheel`,
`post`, `pontoon`, `forgery`, `boat`, `tideFont`, `canalDoor`), `ep4_keep_f2.js`, `ep4_keep_f3.js`, `ep4_keep_crown.js`.
Test: `qa/maps/ep4_b_maps.test.mjs` (8 tests, about 18 s). Previews: `python tools/maps/previews/ep4_keep_render.py`
(EP4DB tiles, the pack's tide rule, the waterline carried up the faces), one image per level state, annotated and `_clean`.

## How to check

```bash
node --test qa/maps/ep4_b_maps.test.mjs
node tools/maps/mapcheck.mjs check --pack ep4 ep4_keep_f1 ep4_keep_f2 ep4_keep_f3 ep4_keep_crown
node tools/maps/ep4_check.mjs ep4_keep_f3          # one floor's tide report: states, nodes, firstAt per event
python tools/maps/previews/ep4_keep_render.py      # 14 previews (+ _clean) into tools/maps/previews/
```

## Rules these maps keep (beyond plan 4.4 and 5.1)

- **Start levels are low wherever the party walks a channel floor** (h0). A save reloads with every basin at its start
  level; a party saved on a drained channel floor would otherwise reload standing in water with nowhere to step.
  F2's Stacks start mid because no stair ever leads onto their floor.
- **Every landing that only water reaches has its own wheel** (F1 wh_b2, wh_b3; F2 wh_a2, wh_a3, wh_b2, wh_b3; F3 wh_v2,
  wh_v3, wh_t2, wh_m2). The test's reload rule checks it: for every set of washed seals and latched floodgates, every
  cell reachable with exactly that set, reloaded at start levels, gets back to the arrival.
- Enemies, triggers, arrivals and boat landings stand outside every basin. Kerbs (`ledge_lip`, `ledge_face` where the
  high side is north) separate heights; `canal_stair_*` takes the lower side's height.

## 1. `ep4_keep_f1` The Tidegate Causeway (40 x 30, `sunken_keep`, `keep_drip`, dark 0.2)

Basins: `a` (B, 3 levels, start 0, `wh_a`), `b` (C, 3 levels, start 0, `wh_b`). Arrival `start` (19,27) up, from
Valewyn's `keep_boat`.

| Area | Cells | Contents |
|---|---|---|
| A Water Gate | floor x 15..24, rows 24..27 | `boat_vw` (19..20,28) to `ep4_valewyn` (29,4) if `keep_entered`; `hale_punt` (22..23,28) to (21,32) if `council_shelter`; `font_k1` (22..23,25); book `tide_log` (16,25). The flooded outer court (x 26..38, rows 24..28) with drowned roofs. |
| B Papered Door | floor x 10..25, rows 10..19 | canal h0 rows 10..12; kerb row 13 (stair 21,13); walkway h1 rows 14..15; kerb row 16 (stair 12,16); stand rows 17..19. `wh_a` (15,18), `post_a` (11,11). `door_papered` + `seal_b` (17,9; basin a, h 1). |
| X Notice Hall | x 10..25, rows 4..6 | `chest_x` wood hi_potion x2 (10,4). Passage east (26..27, 4..7) into C. |
| C Pontoons | x 27..38, rows 8..20 | west bank x 27..30, kerb x 31 (stair 31,10; gap 31,16), channel h0 x 32..33, kerb x 34 (gap 34,16), east bank x 35..38 rows 13..20. `wh_b` (29,12), `wh_b2` (37,15), `post_b` (33,12), `pt_c1` (32,16), `pt_c2` (33,16). `chest_nilo` (32,9) if `nilo_started`; `chest_tide_key` (38,19). |
| E North Gallery | x 35..38, rows 8..11 | lip row 12 (basin b, h1); `pt_e` (36,12) rides [2]; `wh_b3` (38,10); `chest_seal_key` gold (38,8). |
| F Tidegate | `tidegate` floodgate (32..33,7), b at 2, latch, flag `tidegate_open` | lift landing x 29..36 rows 2..4: `lift_trig` (33..34,2) `keep_f1_lift`, `lift_f2` stairs (33..34,1) to F2 (6,24); `chest_f` iron (29,2). |
| D Audience Hall | x 1..8, rows 5..20; anteroom rows 24..27 | `door_d` (4..5,23, tide_key); `memory1_trig` row 14 x 1..8; `crack_d` (6,3, Dash) to `chest_boots` gold tidewalker_boots (6,1). |

Marks: `start` (19,27), `font` (22,26), `papered` (17,10), `pontoons` (32,15), `audience` (4,10), `gallery` (36,9),
`tidegate` (32,8), `lift_down` (33,2), `audience_regent` (4,6), `audience_boatman` (4,13), `audience_guard` (6,7).

**Solution (autoplay):** wh_a x2 (mid, high: seal_b washes), wh_a x1 (low). Stair (21,13), canal floor, door (17,9),
X, east into C. wh_b x1 (mid); cross row 16; chest_tide_key. wh_b2 x1 (high: tidegate latches); north over pt_e;
chest_seal_key; back over pt_e. wh_b2 x2 (low, mid); cross west. wh_b x2 (high, low); stair (31,10); channel north
through the tidegate; lift_trig; lift_f2. Optional D: back to A, west corridor, door_d, Dash at crack_d.

| Enemies | Cell | Move | | Enemies | Cell | Move |
|---|---|---|---|---|---|---|
| `e_c_watch` e4k1_watch | (28,17) | patrol up/down 3 | | `e_d_watch` e4k1_watch | (4,11) | patrol |
| `e_c_crabs` e4k1_crabs | (36,18) | wander r1 | | `e_d_crabs` e4k1_crabs | (5,17) | wander r1 |
| `e_e_blooms` e4k1_blooms | (35,9) | guard | | `e_f_mixed` e4k1_mixed | (30,4) | guard |

## 2. `ep4_keep_f2` Archives Below Water (40 x 30, `sunken_keep`, dark 0.45, lights at the lanterns)

Basins: `a` (B, start 1), `b` and `c` (D, start 0). Arrival (6,24) down; `stairs_f1` (6..7,22) to F1 (33,3).
`pitTo` F1 (28,14) (west bank, dry).

| Area | Cells | Contents |
|---|---|---|
| A Stair Foot | x 2..10, rows 23..27 | `font_k2` (8..9,26). |
| B Stacks | x 2..12, rows 4..18 | hall h0; dock rows 16..18 (kerb row 15, gaps 3,15 and 7,15); island W h1 x 5..9 rows 8..12 (gaps 7,12 and 9,9); north landing x 10..12 rows 4..6 (gap 11,7); gallery G x 2..4 rows 8..10 (gap 3,11). Crates C1 (7,13..14), C2 (10,9), (11,9), (11,8), column (3,13..14) and `crate_g_sill` (3,12, h1, rides [2]). `wh_a` (10,17), `wh_a2` (12,5), `wh_a3` (2,9), `post_a` (8,14). `chest_gallery` iron (4,8). |
| S Scriptorium ring | x 15..23, rows 6..11 | pit (17..21, 8..9); `memory2_trig` column 16 rows 6..11. |
| D Two Locks | west part x 25..30 rows 6..17, east part x 31..38 rows 7..17 | west stand x 25..26; kerb x 27 (stair 27,9; gap 27,13); b channel x 28..29 rows 6..13; C3 crates (28..30,13); c walkway (h1) column 31 rows 8..13 and row 7 x 31..38; c pool h0 x 33..38 rows 9..13; south kerb row 14 (c h1); south stand rows 15..17. `wh_b` (25,11), `wh_c` (29,10, in the b channel), `wh_b2` (33,4), `wh_b3` (31,6). `door_keyroom` + `seal_d` (34,6; basin c, h 1); key room x 33..36 rows 3..4, `chest_tide_key` (36,3). `coffer_obj` (36,14, if `tide:c>=2`, lantern); cache niche (37..38,18): `chest_cache` gold 190 + hi_ether x2, `book_ledger`, both if `coffer_found`. |
| C Dry Room | x 27..31, rows 2..3 (up the stair 29,5) | `vex_trig` (27..31,3); `feather_dry` (30,2) if `vex_archive_met`; glass dome overhead (28,3). |
| E Court Room | x 16..23, rows 15..21; approach x 12..38, rows 25..27 | `door_e` (19..20,24, tide_key); `font_k2b` (23..24,26); `chest_approach` wood hi_potion x2 (12,27); `barrister_trig` (18..23,20); actor `barrister` (20,16) until defeated; `stair_trig` (20..21,15) and `stairs_f3` (20..21,14) to F3 (17,12), both if `barrister_defeated`; `boat_f2_short` (16..17,18) to F1 (18,26) if `keep_f2_done`. East descent (35..36, 18..24). |

**Solution (autoplay):** B at start mid: dock, C1, W, C2, north landing, S (memory2_trig). D: stair (27,9), wh_c x2
(seal_d washes), wh_c x1 (c low), up (29,5) into C (vex_trig), back to the west stand, wh_b x1 (mid), gap (27,13), C3,
the walkway to (34,6), key room, chest_tide_key, back over C3. South stand, east descent, approach, door_e,
barrister_trig; after the win stair_trig, stairs_f3. Optional: wh_a x1 (high) for G; the coffer at c high from the south
stand with the Lantern.

Enemies: `e_b_phantoms` e4k2_phantoms (4,17) patrol; `e_b_sentinel` e4k2_sentinel (10,5) guard; `e_d_phantoms`
e4k2_phantoms (26,15) wander; `e_d_mixed` e4k2_mixed (32,16) patrol; `e_ap_mixed` e4k2_mixed (30,26) patrol.

## 3. `ep4_keep_f3` The Court of Witnesses (44 x 32, `mystery`, dark 0.7, tint `#4e686c`)

Basins: `v` (Voice), `t` (Truth, inlet (38,7)), `m` (Mercy), all start 0. Arrival (17,12) down; `stairs_f2` (17..18,11)
to F2 (20,15). `pitTo` (21,24): an unrevealed ink bridge drops the party into Mercy's landing.

| Area | Cells | Contents |
|---|---|---|
| Hub | x 16..27, rows 12..19 | `petition_gate` (21..23,11, doorway 22, flags the three principles); `principles_sign` (24,11); `gate_trig` (22,12) `lyra_memory_3`; mooring (16..18, 18..19), `boat_f3_short` (17..18,18) to F1 (20,26) if `keep_f3_arrived`. |
| Antechamber | x 17..26, rows 4..8 | `witness_lectern` (24,5; `witness_book` until `hero_signed`, then a sign); `font_k3` (18..19,7); `chest_ante` wood lamp_oil x2 (26,6); `door_throne` (21..23,3, seal_key, `door_seal`) to the crown (11,18). |
| Voice | x 1..13, rows 4..19, open water | L1 x 10..13 rows 13..18 (`wh_v` 12,14); stair (9,16); causeway h0 (8..5,16), (5,15..12); stair (5,11); L2 x 3..7 rows 8..10 (`wh_v2` 4,9); pontoons `pt_v1` (8,9), `pt_v2` (9,9) rides [1]; island x 10..12 rows 5..9 (`wh_v3` 10,6), `stone_voice` (11..12,6). |
| Truth | x 30..42, rows 8..19 | culvert (38,7, inlet); `dam_t` heavy block (38,8); pocket (37,8); shove step (39,8); dry causeway x 40..42 rows 8..16; walkway h1 (30..32, 8..9) under `seal_t2` (31,7, h 1); alcove h0 (34..35, 8..9) under `seal_t1` (35,7, h 0); pool h0 rows 11..15 (stairs 31,10 and 34,16); L3 rows 17..19 (`wh_t` 33,18). Stone room x 30..32 rows 3..5 (`stone_truth` 30..31,4); alcove room x 34..37 rows 3..5 (`chest_alcove` iron 37,3; `wh_t2` 34,4). |
| Mercy | x 2..35, rows 23..30 | landing LM x 18..25 rows 23..24 (`wh_m` 19,23; gap 20,25; stair 23,25); boats `boat_m0..7` (20..13, 26), m3 (17,26) and m6 (14,26) on h1 sills, rides [2]; island IS x 8..11 rows 26..30 (`wh_m2` 8,29; `stone_mercy` 9..10,27); `keeper_note` (12,28, lantern, under high water); faint ink bridge (5..7,28) to the alcove (2..4, 27..29), `chest_spear` gold tidewarden_spear (3,28). No lights of its own: the lanterns over the boats light only high water. |

**Solution (autoplay; any wing order):** Voice: stair (9,16), causeway to L2, wh_v2 x1 (mid), pontoons, stone_voice;
wh_v3 x2 (high, low), back. Truth: down the causeway to (39,8), Shove west; wh_t x1 (mid: seal_t1), x1 (high: seal_t2),
x1 (low); stair (31,10), walkway, (31,7), stone_truth. Mercy: wh_m x2 (high), the boats to IS, stone_mercy (Lantern at
(12,28) and (6,28) for the spear); back over the boats while high. Then gate_spot, "Sign.", door_throne.

Enemies: `e_v_watch` e4k3_watch (11,17); `e_t_decrees` e4k3_decrees (41,12); `e_m_sentinels` e4k3_sentinels (33,24). (`e_v_decrees` and `e_t_watch` were cut in E4-fixes so the Regent
is met at Lv 20.)

## 4. `ep4_keep_crown` The Drowned Throne (24 x 20, music none, dark 0.15)

Round hall of wet canal stone, open water in two crescents and a south pool. Arrival (11,18) up; `crown_exit` (11..12,19)
to F3 (22,4). `throne` / `throne_empty` (10..13, 4..7) by `paper_regent_defeated`; actor `paper_regent` (11,6) until
defeated; `regent_trig` row 14 (x 1..22); `witness_page` sign (16,8) and `feather_page` (17,8) after the win;
`boat_crown_out` (5..6,17) to `ep4_valewyn` (29,4); enter trigger `crown_enter` (`regent_after` after a reload).
Marks: `throne` (11,6), `party_stop` (11,12), `table` (16,9), `lyra_enter` (11,17), `lyra_sign` (12,10),
`charter_spot` (11,9), `entry` (11,18). The scene spawns `regent_t`, `hale_t`, `joss_t` itself, so the map places no
actors for them (plan 4.8 listed them as map actors; a placed actor would clash with the spawn ids).

## 4b. Dressing pass (E4-fixes-B, CRITIQUE_6 items 6 and 7)

Dressing only: no cell's walkability, event, warp or basin changed (`ep4_check`, `mapcheck` and
`qa/maps/ep4_b_maps.test.mjs` unchanged and clean).

- **F1 has its own stone.** The causeway kit (floor, band, faces, the deep, and F1's own kerbs, drop faces, stairs and
  channel floor: `ledge_lip_causeway`, `ledge_face_causeway`, `canal_stair_*_causeway`, `canal_floor_causeway`) is a cool
  grey-green ramp (eight pack colours in `ep4_kit.EXTRA`), not the master violet `stone_cool`. `keepLegend('causeway')`
  names the causeway ids; F2 keeps the shared ones. More puddles, moss and cracked slabs in the floor's variant weights.
  Props: the sodden audience carpet in D's aisle, flood wrack in B, C and the stand, ledgers in the Notice Hall; overlays
  of silt and weed (no collision).
- **F3 is the darkest floor.** Dark 0.3 -> 0.7 with a cold grey-green tint; the white marble greys one step toward the
  same green, and verdigris where water stood is common in the floor. Phone luma (qa/out/fixes6): hub 0.52 -> 0.25,
  Mercy 0.45 -> 0.20, against F2 0.17 to 0.19 and F1 0.26 to 0.28. The lanterns and candelabra are the light.

## 5. Differences from the plan

- F1 basin a starts low, not mid (the reload rule); seal_b washes at high (h 1). The gallery E sits inside C (x 35..38),
  and the tidegate opens straight into the lift landing (x 29..36, rows 2..4) north of the channel.
- F2 adds wheels wh_a2, wh_a3, wh_b2, wh_b3; the Dry Room is reached up the b channel's north stair; the cache appears
  in a niche (if `coffer_found`) rather than behind a drawn hidden door.
- F3 adds wh_v2, wh_v3, wh_t2, wh_m2; the Mercy secret is a faint ink bridge (the Lantern), not a wall glyph door.
- `EP4_MAPS_LISTED` is left `false`: `qa/battle/ep4_battle.test.mjs` asserts it is false and that no `ep4_` zone is
  enumerable. E4-integrate flips the line in `src/data/ep4/encounters.js` and those two asserts together.
