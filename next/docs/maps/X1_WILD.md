# X1 wild maps: the High Moor and Larchhill (X1-maps-wild, X1 wave W4)

Modules: `src/data/maps/x1_highmoor.js` (72 x 36 field) and `x1_larchhill.js` (68 x 38 field). They are `x1` pack files: nothing imports them, the
`loadMap` guard fetches them on first entry, node tools and tests import `src/data/x1/index.js` and call `register()` first. Coordinates are tiles,
`(0, 0)` top-left. Where this file and `EXPANSION1_PLAN.md` 4.12 and 4.13 differ, this file is what was built (section 5).

```bash
node qa/run.mjs maps                                              # includes qa/maps/x1_wild.test.mjs (22 tests, about 35 s: one is a real-browser timing run)
node --test qa/maps/x1_wild.test.mjs                              # just this file; X1_WILD_PRINT=1 prints route lengths and cells, X1_WILD_PERF=1 the timings
node tools/maps/mapcheck.mjs check x1_highmoor x1_larchhill --pack x1
python tools/maps/previews/x1_highmoor_render.py                  # the four previews below (and their _clean twins), 2x; --scale=3, or one map id
```

Previews (`tools/maps/previews/`, annotated at 2x; the `_clean` twin has no labels): `x1_highmoor.png`, `x1_highmoor_routes.png` (the ink route
revealed, the three routes drawn red A, blue B, green C, with their lengths), `x1_larchhill.png`, `x1_larchhill_routes.png`.

## 1. `x1_highmoor`: The High Moor (72 x 36, field, music `high_moor`, ambience `moor_wind`, `respawn: 'reentry'`, no lighting, no fog, no ambientFx)

Legend: moor turf `.` (`x1_moor_turf`, the base), heath `,` (`x1_heath`, purple), bracken `b`, peat `p`, dirt `=`, the black tarn `T` (`x1_tarn`),
crag `^` / `|` (`x1_crag_top` / `_face`, faces derived under every top that has open ground south of it), drystone `w` (`x1_drystone`, a line16 wall),
one-way ledges `e f g` (`ledge_e_a`, `_m`, `_b`). `pitTo` is (28, 28), the south shore: a fall from the ink lands there.

| Area | Cells | What is there |
|---|---|---|
| M1 The Ridge Path | x 30..42, y 28..35 | arrival `south_entry` (35, 34); exit (34..37, 35) to `x1_downs` (30, 1, down); the sign `moor_sign` (37, 32); post 1 `chime_1` at the road's start; no foes |
| Route A, the Chime Road | 104 cells | west under the tarn (the bench `moor_bench` (24, 30) on the road, the guard group at (22, 25), three cells off it), north along the west bank (the cairn cache), east along the north shore, down the west side of the tower mass to the tower yard at (43, 15), then the Stile Road east along y 14..15 to the stile yard |
| Route B, the Ridgeline | 52 cells | from M1 north-east over the heath ridge: a ledge hop east at (44, 26..28), the road on to (56, 26), a second hop at (57, 24..26), then north-east to the stile yard, entering it from the south at (67, 16). The view knoll (the dead-end spur at (49..50, 21..25)) holds `chest_moor_view` and the scarab patrol |
| Route C, the Hidden Fold | 68 cells | M1 to the south shore (28, 27); the faint ink route 8 cells north to the islet (28, 18) (Lantern); 10 more cells east along row 18; the east shore pocket (ruined drystone sheepfold walls round it); the one-wide gorse tunnel along row 18 (x 41..62), Dash through the roots at (50, 18..19); north at x 62 into the stile yard. No foe within 5 cells |
| The tarn | x 19..39, y 14..27 | ragged blob, peat banks and reeds, the islet at (27..29, 17..18) with the gold chest, water on every side of it |
| The Watchtower and Odo's hut | tower prefab at (44, 12) (footprint 44..47, 11..12), hut at (49, 11) (door cell (50, 11)) | against a crag mass (x 40..55, y 0..10) so nothing walks behind them; the yard in front (x 40..56, y 12..15) is a spur off the Stile Road; Odo at (51, 12), mark `odo` (50, 12) is the cell in front of the door; the star mark `x1_star_mark_tower` (48, 12): a cairn at the tower's foot, a Lantern object gated on `stars_started`, runs `star_read_3`. Safe zone: no group within 8 |
| The Stile and its yard | x 58..71, y 8..19 | the drystone wall x = 69 with the gap rows 13..14 closed by thin roots (`x1_roots_stile` (69, 13..14), Dash, saved); beyond it (70, 13..14) the arrival cell and the exit pair (71, 13..14) to `x1_terrace` (1, 13, right); post 9 `chime_9` (66, 12); the Orrery's dome `x1_far_dome` as an overhead decal at (65, 0) |

### Marks

`south_entry` (35, 34), `chime_1` (31, 31) (the first post, beside the road at the start), `chime_9` (66, 12), `tarn` (28, 20), `islet` (28, 18),
`tower` (46, 8), `odo` (50, 12), `bench` (24, 30), `view` (50, 22), `gorse` (53, 18), `stile` (69, 13), `terrace_west` (70, 13). `chime_1`, `chime_9`,
`tower`, `stile` and `bench` stand on solid props (camera targets); `tarn` and `islet` are water or ink until the Lantern; every other mark is walkable
and reached on foot.

### Enemies (`ZONES.x1_highmoor.plan`: three groups, Lv 4 to 5, `expMul` 0.1 in `encounters.js`)

| Event | Cell | Sprite | Encounter | Move | Beside |
|---|---|---|---|---|---|
| `e_mo_wolves` | (22, 25) | `thornback_wolf` | `mo_wolves` | guard | Route A, 3 cells north of the south leg (the plan's (22, 26)) |
| `e_mo_scarabs` | (50, 23) | `moss_scarab` | `mo_scarabs` | patrol right 3, left 3 (x 50..53, y 23) | Route B, 3 cells off the road, on the view knoll's spur |
| `e_mo_wraiths` | (55, 31) | `page_wraith` | `mo_wraiths` | wander r 1 | Route B's south-east bank, 4 cells off the road. The plan put them on the tarn's north shore (30, 8), which is Route A's road; they were moved so A keeps one group and B two |

### Chests

| Id | Cell | Tier and content | Needs |
|---|---|---|---|
| `chest_moor_cairn` | (12, 17) | wood, 2 antidotes (a placed chest pays one item: the plan's eye drops are dropped) | nothing (the cairn cache off Route A's west leg) |
| `chest_moor_view` | (50, 21) | iron, rolled | nothing (the knoll's spur, guarded by the scarabs) |
| `chest_moor_islet` | (28, 17) | gold, `chime_staff` (fixed) | the Lantern (the ink route) |
| `chest_moor_gorse` | (53, 17) | iron, rolled, `behind: 'x1_roots_gorse'` | Dash: the roots hide it, from either end of the tunnel |

### The routes (cells for the autoplay bot)

Notation: `(x,y)` start, then runs `U` up, `D` down, `L` left, `R` right with a count, `J` a one-way ledge hop (the `dx,dy` it covers; the count after it is 1),
`(x,y)` end. The cell lists the test asserts with are in `tools/maps/out/x1_wild_routes.json` (written by `X1_WILD_DUMP=<file> node --test qa/maps/x1_wild.test.mjs`).
Each ends at (68, 13), the cell west of the stile roots: Dash there (`ability dash`, facing right) breaks them, then three steps right reach the exit.

- **A, the Chime Road (104):** `(35,34) U5 L13 U1 L6 U2 L1 U16 R18 D1 R5 D1 R1 D1 R1 D1 R1 D1 R15 U1 R10 U1 R2 (68,13)`. Needs nothing.
- **B, the Ridgeline (52):** `(35,34) U4 R5 U2 R2 U1 R1 J2,0 R2 U1 R9 J2,0 U2 R2 U1 R1 U1 R2 U1 R1 U1 R2 U5 R1 U2 R1 (68,13)`. Needs nothing; the ledge hops are `ledge_e`
  cells entered walking east.
- **C, the Hidden Fold (68):** `(35,34) U5 L6 U2 L1 U9 R34 U4 R4 U1 R2 (68,13)`. The `U9` is the south shore (28, 27) to the islet (28, 18) over the ink, the
  `R34` runs from the islet along row 18 over the east ink run, the shore and the tunnel to x 62, Dash at (49, 18) facing right. Raise the Lantern at
  (28, 27) and again at (28, 19) and (33, 18) as the next cell is not lit (radius 6; revealed cells stay revealed).
- The chime posts: nine along A, about every ten cells: (31, 31) (21, 26) (16, 23) (17, 12) (25, 12) (35, 13) (57, 12) (62, 12) (66, 12); the ninth reads KEPT.

## 2. `x1_larchhill`: Larchhill, the Terraced Orchards (68 x 38, field, music `larchhill`, ambience `larchhill_hum`, `ambientFx: ['motes']`, `respawn: 'reentry'`, no lighting, no fog)

Legend: orchard turf `.` (`x1_orchard_turf`, the base), grass `,`, dirt `=`, stone floor `p`, honey drystone `h` and `w` (`x1_drystone_honey`, line16), terrace wall `^` /
`|` (`x1_terrace_top` / `_face`, a cap row and two face rows), stairs `S t z` (one wide) and `A B C D E F` (two wide), ledges `L M R` (`ledge_s`), `x` pit.
`pitTo` is (34, 19), the stair foot. The aqueduct and its wall are overlays (`x1_wall_honey_*`, `x1_aqueduct_n_*`, `_s_*`, `_arch_*`).

| Area | Cells | What is there |
|---|---|---|
| H1 The North Gate | x 25..37, y 0..9 | the plan's Lower Gate. Arrival `north_gate` (31, 1) through a gap (30..33, 0..4) in the top retaining wall; exit (30..33, 0) to `x1_downs` (11, 32, up); the sign `hill_sign` (29, 6), a bench, two lamp posts; the Windmill decal `x1_far_windmill` on the wall at (35, 0). No foes |
| Route A, the Switchback Road | 107 cells | west along the top terrace (y 9..10) to a gap at x 17..18, down it, east along y 14..15 to a second gap at x 26..27, down to y 19, east along the lane to x 45, the hairpin south at x 45 (the wolves patrol 3 cells west of it), east along y 30..31 past Yarrow's hives, north at x 58..59 to the east lane. A dead-end spur from the second gap runs west to the hive stand and its chest. Ledge hops (`ledge_s`) beside the first wall (21..23, 11) and the hairpin (41..43, 22) are optional shortcuts down |
| Route B, the Terrace Stairs | 57 cells | the top lane (y 7..8) east to x 62, two flights of two-wide stairs (x 62..63, y 9..11 and 14..16) with a landing between them (x 58..67, y 12..13), the guard group at (59, 12), then the yard and the east gate. A drystone line at x = 57 closes the landing's west side |
| Route C, the Aqueduct Walk | 72 cells, no foe within 6 | round the aqueduct's west abutment (down the second gap) to the stair foot (34, 19); the stair (34, 17..18) up to the landing (x 31..37, y 14..16); the heavy cider barrel `x1_cider_barrel` stands on (34, 16) (Shove moves it one cell north, the landing has room either side); east along the deck (rows 14..15, x 31..54); the cracked press wall (45, 12..13, Dash, the iron chest behind it, nothing reaches it from the north: a low drystone cap runs along the wall's north side); the platform (x 51..54, y 12..15) with the gold chest (53, 12); the east end is broken off, a one-way drop (ledge cells (52..54, 16)) to the east lane, so the deck can only be entered by the barrel stair |
| Yarrow's apiary and the Windmill | x 49..67, y 20..37 | the Windmill on its mound (prefab `x1_windmill` at (50, 29), footprint x 52..55, y 28..29; the mound x 49..57, y 20..27 is solid, so nothing walks behind it); the ladder `x1_mill_ladder` (53, 30) runs `windmill_view` (stand at (53, 31)); the cider press, hay, hives; Yarrow's cottage at (62, 34) with Yarrow at (64, 35); the hay chute (60..61, 30..31) |
| The East Gate | x 58..67, y 16..21 | the lane and yard; exit (67, 18..19) to `x1_millrace` (1, 12, right); arrival `east_gate` (66, 18) |

The hay chute: pit terrain at (60..61, 30..31) with a `pit` area event `x1_hay_chute` to `x1_millrace` (12, 20, down) (the jetty deck). Until `yarrow_met` two hay ricks
(`x1_hay_gate`, `x1_hay_gate_b`, solid objects with the `x1_hay_chute` line, "a boat and a firm NO") pile across it; the chute art (`x1_hay_chute`) is an overhead tile with
`if: yarrow_met`, because a floor tile would have replaced the pit's collision. The orchard has 51 fruit trees in ranks (`x1_tree_apple`, `_apple_b`, `_plum`) and 21 hives, none
within three cells of a lane.

### Marks

`north_gate` (31, 1), `windmill` (54, 25) (the mound under the sails: the camera target), `ladder` (53, 31) (the cell you stand on), `apiary` (58, 33), `yarrow` (63, 35),
`chute` (60, 30), `barrel` (34, 16), `aqueduct_end` (53, 13) (the cell in front of the gold chest), `press` (45, 14) (the deck cell below the crack), `east_gate` (66, 18),
`hive_stand` (12, 28) (the cell in front of the hive chest). `windmill`, `barrel` and `chute` are not walkable by design (a mound, a block, a gated pit).

### Enemies (`ZONES.x1_larchhill.plan`: three groups, Lv 5 to 6, `expMul` 0.1)

| Event | Cell | Sprite | Encounter | Move | Beside |
|---|---|---|---|---|---|
| `e_lh_beetles` | (36, 24) | `moss_scarab` | `lh_beetles` | wander r 1 | Route A's lane (y 19..20), 4 cells south of it; 7 from the stair foot (the plan's (28, 20) sat on the lane) |
| `e_lh_wolves` | (42, 25) | `briar_wolf` | `lh_wolves` | patrol up 2, down 2 | Route A's hairpin, 3 cells west of the road |
| `e_lh_mixed` | (59, 12) | `ink_blot` | `lh_mixed` | guard | Route B's middle landing, 3 cells from the stairs (the plan's (46, 12)) |

### Chests

| Id | Cell | Tier and content | Needs |
|---|---|---|---|
| `chest_lh_hive` | (12, 29) | wood, 3 honey rolls | nothing (the hive stand at the end of Route A's spur) |
| `chest_lh_press` | (45, 13) | iron, rolled, `behind: 'x1_crack_press'` | the Shove (the barrel) and Dash (the crack) |
| `chest_lh_aqueduct` | (53, 12) | gold, `orchard_axe` (fixed) | the Shove (the barrel) |

### The routes (cells for the autoplay bot)

Same notation as section 1; `J0,2` is the one-way drop at the deck's east end. All end at (67, 18), the exit cell.

- **A, the Switchback Road (107):** `(31,1) D9 L13 D5 R8 D4 R18 D1 R1 D10 R1 D1 R8 U1 R5 L1 U9 R1 U2 R7 U1 R1 (67,18)`. Needs nothing.
- **B, the Terrace Stairs (57):** `(31,1) D6 U1 R4 D1 R27 D12 R4 U1 R1 (67,18)`. Needs nothing.
- **C, the Aqueduct Walk (72):** `(31,1) D8 L2 D1 L1 D5 L1 D4 R7 U5 R19 D1 R1 J0,2 D2 R12 U1 R1 (67,18)`. The `U5` after `R7` is the stair and the landing: stand at (34, 17) facing up and use
  the Shove on the barrel at (34, 16), then step up and east. Dash at (45, 14) facing up breaks the press wall for `chest_lh_press`.

## 3. Cross-links (plan 3.2), all tested

| From | Cells | To | Arrival |
|---|---|---|---|
| `x1_downs` north edge | (29..32, 0) | `x1_highmoor` | (35, 34, up) |
| `x1_highmoor` south edge | (34..37, 35) | `x1_downs` | (30, 1, down) |
| `x1_highmoor` east stile | (71, 13..14) | `x1_terrace` | (1, 13, right); the roots at (69, 13..14) stand in the way until Dash |
| `x1_terrace` west edge | (0, 13..14) | `x1_highmoor` | (70, 13, left), floor, next to the roots |
| `x1_downs` SW edge | (10..13, 33) | `x1_larchhill` | (31, 1, down) |
| `x1_larchhill` north edge | (30..33, 0) | `x1_downs` | (11, 32, up) |
| `x1_larchhill` east edge | (67, 18..19) | `x1_millrace` | (1, 12, right) |
| `x1_millrace` west edge | (0, 12..13) | `x1_larchhill` | (66, 18, left) |
| `x1_larchhill` hay chute | pit area (60..61, 30..31), `yarrow_met` | `x1_millrace` | (12, 20, down), the jetty deck |

Every other side matches the cells above; nothing needed a change on the other maps. (The engine walks one cell on past an arrival, so a walk through an edge ends one cell inside.)

## 4. Cost (measured, Fact)

Real field, headless Chromium on the phone profile (844 x 390, dpr 3, touch), `?pack=x1`, `f.draw()` and `f.update()` in a tight loop, minimum of five runs of 60 (the test does this and asserts it):

| Place | Draw, full speed | Logic, full speed | Draw, CPU 4x | Logic, CPU 4x |
|---|---|---|---|---|
| valley (30, 30), the baseline | 0.10 ms | 0.01 ms | 0.46 ms | 0.02 ms |
| moor, arrival (35, 34) | 0.04 ms | 0.002 ms | 0.21 ms | 0.007 ms |
| moor, the tower yard (50, 15) | 0.10 ms | 0.007 ms | 0.47 ms | 0.02 ms |
| moor, the tunnel (45, 18) | 0.08 ms | 0.005 ms | 0.52 ms | 0.02 ms |
| Larchhill, the gate (31, 3) | 0.08 ms | 0.002 ms | 0.34 ms | 0.01 ms |
| Larchhill, the orchard (36, 30) | 0.60 ms | 0.007 ms | 3.45 ms | 0.02 ms |
| Larchhill, the apiary (58, 30) | 0.08 ms | 0.005 ms | 0.42 ms | 0.02 ms |

The busiest place is the orchard: +0.5 ms over the valley at full speed (budget +1 ms), +3.0 ms at 4x CPU (budget +4 ms): the cost is the fruit trees' overhead canopies (3 rows each),
nothing else. Logic is 0.02 ms or less against a 3 ms budget. In the running game (engine averages over two seconds, 4x CPU) the moor sits at 1.8 to 2.6 ms draw and the valley at 2.7. The moor has no
ambient effect (the cloud-shadow pass was not built: nothing to cost), Larchhill's motes are the shared 26-particle cap (X1-world's test: under 0.3 ms). No fog object, no lighting.

## 5. Differences from the plan, and ids this work relies on

Marks and cells that differ from plan 4.12 and 4.13:

- Moor: `view` (50, 22) (the chest is at (50, 21), the plan's mark cell), `gorse` (53, 18) (the tunnel cell in front of the chest recess; the plan's (60, 13)), `islet` (28, 18) is the cell in front of the
  chest (28, 17). Foes: wolves (22, 25) (plan (22, 26)), scarabs patrol from (50, 23) (plan (50, 22)), wraiths (55, 31) wandering (plan: the tarn's north shore (30, 8), which is on the Chime Road).
- Route lengths: A 104, B 52, C 68 (plan 90, 55, 40). The plan's 40 for the Hidden Fold cannot be built round its own marks (the Manhattan distance from the arrival to the stile is already 55 and the
  tarn lies to the west); the Fold is the foe-free route, not the shortest. The tower yard is a spur off the Stile Road: Route A passes it, Route B reaches it by turning back west along the Stile Road from
  where it joins (25 cells), because the gorse tunnel runs between them and cannot be crossed.
- The gorse chest is hidden behind the roots (`behind`), not walled in: the tunnel is open at its yard end, so the Fold's shore pocket can be entered from that side with Dash. The islet chest is the Lantern's.
- Larchhill: the aqueduct runs east from the barrel landing to the east lane; the plan's marks `aqueduct_end` (22, 22) and `press` (16, 12) lie in the west and cannot be on a walk that reaches the east gate.
  They are the gold chest's cell (53, 13) and the deck cell (45, 14). The Terrace Stairs are at x 62..63 (plan: a landing at (46, 12)), because the aqueduct occupies x 31..55 and the stairs may not cross it.
  `windmill` (54, 25), `ladder` (53, 31), `apiary` (58, 33), `yarrow` (63, 35) (plan (57, 26), (58, 24), (56, 30), (57, 31)): the Windmill stands on a mound clear of the east lane. Foes: beetles (36, 24)
  (plan (28, 20), on the lane), wolves patrol (42, 25) (plan (40, 26)), the mixed group (59, 12) (plan (46, 12)). Route lengths A 107, B 57, C 72 (plan 85, 55, 50).
- The Windmill decal `x1_far_windmill` stands on the north wall by the gate (35, 0), not on the horizon of the hill itself; the real Windmill is the prefab on its mound.
- No scenery pine appears on Larchhill (the plan says pine-less); the moor has seven wind-bent pines on its rim.

Ids this work relies on from later waves (X1-integrate owns the seams):

- `events.js` `GATE_SPRITES` and `mapcheck.mjs` `GATE_SPRITE_IDS`: none (no `gate` or `locked_door`).
- Heavy-block sprite override: `x1_cider_barrel` for the block `x1_cider_barrel` (like `x1_millstone`; until the override is wired the field draws the default heavy block).
- `battle.js` `BACKDROPS`: `battle_moor` for `x1_highmoor` and `battle_larchhill` for `x1_larchhill` (`X1_BACKDROP_ART` in `encounters.js`); the zones fall back to `valley` now.
- Audio: music `high_moor`, `larchhill`; ambience `moor_wind`, `larchhill_hum` (X1-audio).
- Tile and object ids from `assets/tiles/x1_tiles.json`: terrains `x1_moor_turf`, `x1_heath`, `x1_bracken`, `x1_peat`, `x1_orchard_turf`, `x1_tarn`; walls `x1_crag`, `x1_terrace`; tiles `x1_drystone`,
  `x1_drystone_honey`, `x1_terrace_stairs_*`, `x1_terrace_stairs2_*`, `x1_wall_honey_*`, `x1_aqueduct_n_*`, `_s_*`, `_arch_*`, `x1_hay_chute`, `x1_far_dome`, `x1_far_windmill`; objects `x1_watchtower`, `x1_turf_hut`,
  `x1_chimepost_1..9`, `x1_gorse_a`, `x1_gorse_b`, `x1_boulder_a`, `x1_boulder_b`, `x1_cairn_moor`, `x1_roots_gorse`, `x1_windmill`, `x1_cottage_b`, `x1_cider_press`, `x1_cider_barrel`, `x1_mill_ladder`,
  `x1_tree_apple`, `x1_tree_apple_b`, `x1_tree_plum`, `x1_bush_berry`, `x1_bush_plum`, `x1_hive`, `x1_hive_row`, `x1_haystack_a`, `x1_haystack_b`, `x1_haybale`. Existing ids: `dirt`, `grass`, `stone_floor`,
  `ledge_e_*`, `ledge_s_*`, `pit`, `ink_bridge_*_faint`, `wall_cracked`, `wall_broken`, `root_drape`, `signpost`, `bench`, `lamp_post`, `signboard`, `barrel`, `crate`, `tree_pine`, `reeds_*`. Stand-ins: the stile's roots
  draw `root_drape` and the press crack `wall_cracked` in the tools (the engine draws its own breakable art); the star mark is a plain `x1_cairn_moor`.
- Sprites: `npc_odo`, `npc_yarrow` (the `x1_npcs` atlas); foes `thornback_wolf`, `moss_scarab`, `page_wraith`, `briar_wolf`, `ink_blot` (existing field atlases).
- Scenes: `moor_arrival`, `larchhill_arrival`, `windmill_view`, `star_read_3`, and the talk scenes `odo_meet`, `list_song`, `yarrow_meet` (wired in `npcs.js`). Text ids: `moor_sign`, `chime_1..9`, `moor_bench`, `x1_watchtower`,
  `hill_sign`, `x1_windmill`, `x1_hay_chute`, `root_wall_thin`, `cliff_crack`. (`x1_cider_barrel` has a line in `text.js` but a heavy block carries no text.)
- Flags read: `first_fight_done` (by the sources), `stars_started`, `yarrow_met`. Items: `chime_staff`, `orchard_axe`, `honey_roll`, `antidote`.
