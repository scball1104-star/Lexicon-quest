# X1 West: Shepherd's Downs, the Loom House and the Wethers' Barrow

Maps written by X1-maps-west (X1 wave W3) from `docs/EXPANSION1_PLAN.md` 3.2, 3.6, 4.1 to 4.3, 4.11 and 6.1. All three are
**x1 pack files** (`src/data/maps/x1_*.js`): nothing imports them; the `loadMap` guard fetches them on first entry, and node
tools and tests import `src/data/x1/index.js` and call `register()` first. Coordinates are tiles, `(0, 0)` top-left.
Where this file and the plan differ, this file is what was built (section 5 lists every difference).

```bash
node qa/run.mjs maps                                  # includes qa/maps/x1_west.test.mjs (24 tests)
node --test qa/maps/x1_west.test.mjs                  # just this file
python tools/maps/previews/x1_downs_render.py         # every preview below (2x); add --scale=3 or a map id
```

Previews (`tools/maps/previews/`, annotated at 2x; the `_clean` twin has no labels):

| File | Shows |
|---|---|
| `x1_downs.png` | the Downs as a fresh save sees them (`first_fight_done`) |
| `x1_downs_late.png` | `archive_f1_done`, `stones_lettered`, `reeve_named`, `strays_done`: the chain lies in the road, the stones are lettered, five more sheep in the fold |
| `x1_loomhouse.png`, `x1_loomhouse_late.png` | the loom house; the sampler dark after `stones_lettered` |
| `x1_barrow.png` | the Barrow at the start (switch off: Ossuary open, Ewe Chamber shut) |
| `x1_barrow_solved.png` | switch thrown (the slabs swapped), plate down under `block_c`, gate open, the niche block shoved to (11, 16) |

`tools/maps/preview.py` draws every `shelf` as the Archive bookcase and does not know the x1 NPC and foe atlases; the render
script above reuses its `render()` and only changes what is drawn (the slab, the gate, the x1 sprites). The annotations come
from the real module. The same three maps were also run on the real field (headless, `?pack=x1`): the slabs slide to the cells
below, Bram's Shove moves the niche block, Dash breaks both cracks, Mira's Appraise on Patch reveals `chest_ridge`, the hollow
behind the Old Fold crack can be walked into.

## 1. `x1_downs`: Shepherd's Downs (56 x 34, field, music `the_downs`, ambience `wind_valley`, `respawn: 'reentry'`)

Legend: grass `.`, tall grass `,`, dirt `=`, `x1_moor_turf` `m` (the Stones' rise), `x1_drystone` `w` (a line16 wall), cliff top
`^`, cliff face `|`, cliff stairs `S t z`, one-way ledge `L M R`. Shapes: lanes are ragged ribbons, grass blobs are value noise,
every wall has gaps, the plateau's corners are bitten.

| Area | Cells | What is there |
|---|---|---|
| North cliff band | rows 0..3 top, 4..5 face, x 0..25 and 39..55 | pines on top; the Watchtower decal `x1_far_tower` at (44, -2) stands on it |
| The Ridge | plateau x 27..37, y 1..8; rim x 26 and 38; ring y 9; faces y 10..11 | stairs `S t z` at (28, 9..11) up from the lane foot (28, 12); the one-way ledge hop (34..36, 9) down onto the lane; Patch the scarecrow (31, 6), `chest_ridge` (32, 6), `stray_3` (33, 5); the path (28, 8) to (30..31, 1) to the moor gap |
| Moor gap | exit (29..32, 0) to `x1_highmoor` (35, 34, up) | mark `moor_gate` (30, 1) |
| Valley gate lane | dirt rows 10..11 from the east edge; exit (55, 10..11) to `valley` (1, 28, right) | arrival `valley_gate` (54, 11) |
| Town gate lane | dirt rows 24..25; exit (55, 24..25) to `willowmere` (1, 16, right) | arrival `town_gate` (54, 25), start cell |
| N-S lane | x 45..46, y 10..26 | `lane` (45, 17); the signpost (44, 18) with sign `downs_signpost`, mark `signpost` (44, 19) |
| North lane | y 12..13 from (47, 13) west under the Ridge to (22, 11) | the stairs foot, the ledge landing, the Stones path |
| Thornfold | x 20..44, y 13..32 | main lane rows 21..22; the Loom House (door `door_loom` (36, 20)); cottages (24, 18), (29, 27), (34, 27) and the farmstead (49, 19), two shuttered (crates on the step: (25, 18), (35, 27)), two with a barrel; the well (31, 20) with sign `thornfold_well`, mark `well` (31, 21) and `chest_well` (30, 20); the fold; haystacks, a trough, a bench; the board `thornfold_sign` (43, 23) |
| The sheep fold | walls x 40..43, y 14..20, gate gap (41..42, 20) | Brindle (43, 21) at the gate, marks `fold_gate` (42, 21), `brindle` (43, 22); `fold_sheep_a` (41, 16), `fold_sheep_b` (41, 18); after `strays_done` five `actor` sheep `fold_sheep_c..g` |
| The Stones | rise centred on (14, 10), x 5..23, y 6..16 | twelve stones (`menhir_1..12` blank, `_l` lettered, swapped by `stones_lettered`), the cairn `stones_center_obj` (14, 10) running `rollcall_stones`, the slab `blank_stone_obj` (22, 8) (`blank_stone_named` lettered after `reeve_named`), the barrow mound with `door_barrow` (14, 5) set into the cliff band, `stray_2` (12, 11) |
| The Old Fold | walls x 10..24, y 22..30 (ruined: gaps at the east (24, 24..25), the south, the west) | haystacks, a dry trough, `stray_1` (20, 26) between hay, mark `fold_ruin` (18, 26); the knoll x 15..19, y 17..22 with the cracked face `x1_crack_fold` (17, 21..22) over the hollow (16..18, 18..19): `chest_fold` (18, 19) and `stray_5` (16, 19), both `behind` the crack |
| Larchhill Road | dirt from the lane (27, 22) down x 25..26 and west along y 31..32 to the exit (10..13, 33) | exit to `x1_larchhill` (31, 1, down); arrival `larch_gate` (11, 32); runs south of the Fold, no foe near it |
| Drovers' Road | walled track x 39..41, y 23..33 | the chain `x1_drovers_chain` (39..41, 29) shut until `archive_f1_done` (then `x1_drovers_chain_open`, posts only); door `drovers_door` (39..41, 33) to `x1_millrace` (4, 1, down) with `if: archive_f1_done`; marks `drovers` (40, 31), `drovers_exit` (40, 32) |
| Ford meadow | x 43..55, y 26..33 | the chase pack `e_dn_pack`; the Windmill decal `x1_far_windmill` at (50, 30) on the south-east horizon |

### Marks (every one of 4.11; the first seven differ from the plan because of building footprints)

`valley_gate` (54, 11), `town_gate` (54, 25), `lane` (45, 17), `signpost` (44, 19) [plan (44, 18) is the post itself],
`thornfold` (36, 22) [plan (36, 19) is inside the Loom House], `loom_door` (36, 20), `fold_gate` (42, 21) [plan (41, 20)],
`brindle` (43, 22) [plan (40, 21)], `well` (31, 21), `stones_center` (14, 10) (the cairn's own cell), `ring_n` (14, 8),
`ring_e` (19, 10), `ring_s` (14, 12), `ring_w` (9, 10), `blank_stone` (22, 8) (the slab's own cell), `barrow_door` (14, 5),
`fold_ruin` (18, 26), `ridge` (31, 7), `moor_gate` (30, 1), `larch_gate` (11, 32), `drovers` (40, 31), `drovers_exit` (40, 32).
`stones_center` and `blank_stone` are camera targets standing on their own objects (not walkable by design); every other mark is
walkable and reached (the two drovers marks only after `archive_f1_done`).

### Triggers

`downs_enter` (enter, `downs_arrival`); `thornfold_arrival` from four small triggers catching every lane in:
`thornfold_trig_e` (44, 21..22), `_n` (28..29, 15), `_s` (26..27, 25), `_d` (39..41, 25); `stones_trig` (9..19, 8..12,
`stones_arrival`, covers every ring mark). The scenes guard themselves; the test proves the lane from each entrance to
Thornfold crosses a trigger.

### Enemies (`ZONES.x1_downs.plan`: three groups, Lv 3 to 4, `expMul` 0.1 in `encounters.js`)

| Event | Cell | Sprite | Encounter | Move | Why there |
|---|---|---|---|---|---|
| `e_dn_wolves` | (19, 14) | `briar_wolf` | `dn_wolves` (3 wolves) | guard | south-east of the ring, 4+ cells off every lane |
| `e_dn_scarab` | (13, 25) | `moss_scarab` | `dn_scarab` (scarab + slime) | wander r 1 | inside the Old Fold, far from the Larchhill lane (y 31..32) |
| `e_dn_pack` | (47, 31) | `briar_wolf` | `dn_pack` (2 wolves + slime) | chase | the ford meadow, 6 cells off the town lane, the N-S lane and the Drovers' track |

### Chests

| Id | Cell | Tier and content | Needs | Tell |
|---|---|---|---|---|
| `chest_well` | (30, 20) | wood, 3 potions | nothing | beside the well |
| `chest_ridge` | (32, 6) | iron, rolled | Appraise (Mira) on `x1_old_scarecrow` (31, 6), from any cell in line within 5 tiles (`behind: 'appraise:x1_old_scarecrow'`) | Patch's eleven pockets (`appraise_scarecrow`) |
| `chest_fold` | (18, 19) | iron, rolled | Dash on `x1_crack_fold` (17, 21), from (17, 23) or a few cells south; `stray_5` is behind it too | a cracked face on the knoll |

The crack carries `opens: [[17, 21], [17, 22], [17, 20]]`: once broken the face and the ring cell become grass and the party
walks up into the hollow (checked on the real field).

### Placement rules (3.6), all in `qa/maps/x1_west.test.mjs`

No foe within 7 (Manhattan) of any NPC or of the seven arrival cells, nor within 9 of `thornfold`; every foe 6 (chase) or 3
(others, counting a wander radius) from every dirt cell; nothing guards a quest cell; from each entrance (valley, town,
Drovers' Road, moor, Larchhill) a walk to Thornfold exists that never comes within 3 tiles of a foe.

## 2. `x1_loomhouse`: The Loom House (14 x 11, interior, music `the_downs`)

Smithy's shape: wall faces rows 1..2, floor rows 3..8, one gap `(7, 9)` in the south wall (`loom_exit` lands on the Downs
(36, 21, down); `door_loom` lands here on the gap cell facing up). Tamsin (4, 6) below the great loom (`x1_loom` at (3, 5)),
her shop opens from talk; spinning wheel, fleece, a wool shelf, a bed, a table. The hearth `thornfold_hearth` is a `font`
(`x1_hearth`, 3 x 1 at (9..11, 3), `safe`). The sampler `x1_sampler` (3, 2) is two events: frame 0 `ifNot: stones_lettered`, frame 1
`if: stones_lettered`. Marks: `tamsin` (4, 7), `hearth` (10, 4), `sampler` (3, 3), `door` (7, 9).

## 3. `x1_barrow`: The Wethers' Barrow (28 x 20, dungeon, dark 0.45, music `wethers_barrow`)

Rooms (floor cells; every room has two face rows above it, the chambers one):

| Room | Floor | Notes |
|---|---|---|
| A The Landing | x 1..6, y 10..15 | entrance (3, 10); the exit stair `barrow_exit` (3, 9) to the Downs (14, 6, down); the plaque `barrow_slab_a` sign (5, 9); `chest_bw_landing` (5, 14) |
| B The Long Hall | x 7..26, y 10..12 | joined to A; the floor switch `sw_slab` (15, 11); the stair `stairs_e` (21..22, 9) up; patrol `e_bw_shades` |
| C The Ewe Chamber | x 8..13, y 16..17 (doorway x 12..13, y 13..15) | behind `slab_n`; wool runner; `block_niche` (10, 16), niche (10, 14..15), `chest_bw_bow` (10, 15) |
| D The Ossuary | x 15..24, y 16..17 (doorway x 19..20, y 13..15) | behind `slab_s`; `e_bw_mixed` guards (22, 17); the crack `x1_crack_oss` (23, 14..15) over `chest_bw_oss` (23, 15) |
| E The Counting Room | x 19..26, y 3..6; notch (21..22, 7) | `block_c` (20, 4), pillars (23, 4) and (23, 5), `plate_c` (25, 6); eight blank niches on the north face |
| F + G The Hearth and the Reeve's Hall | x 1..16, y 3..6 (one long room) | `gate_reeve` (17..18, 4) between E and the hearth; `barrow_hearth` font (13..15, 5..6, `rune_shrine`, `safe`); the trigger row `reeve_trig` (11, 4..5) between two pillars (11, 3) and (11, 6); the Reeve `barrow_reeve` (4, 5); thirteen niches on the north wall: twelve lettered at x 2..13, the thirteenth, blank, apart at x 15 (lit after `reeve_named`) |

Every plate, block, switch and slab is on screen and readable without text: the two slabs are dark doorways with the carved slab
sliding in a pocket; the plate and block sit in a room of their own with two pillars beside the line.

### The mechanisms

- **The slab switch.** One floor switch targets both shelves, as in the F2 hub: `slab_n` positions `[[12, 14], [14, 14]]` (start
  across the Ewe Chamber's doorway, cells 12..13) and `slab_s` positions `[[21, 14], [19, 14]]` (start in its pocket, the Ossuary
  open). Switch off: Ossuary open, Ewe Chamber shut. Switch on: the reverse. The switch is in the hall, so the state can always be
  changed. The doorway art (`x1_slab_doorway`) is at (10, 14) and (17, 14): its tiles 2..3 are the doorway cells.
- **Shove niche.** `block_niche` (heavy) stands at (10, 16) before the niche chest (10, 15). Bram's Shove from (9, 16) moves it to
  (11, 16) (or from (11, 16) to (9, 16)); the party then stands at (10, 16) facing up. Both neighbours are floor. A push search over
  every (player, block) state of the lower band finds no state that cannot walk back to the exit stair.
- **Dash niche.** `x1_crack_oss` (23, 14, `rock`, `h: 2`), `chest_bw_oss` (23, 15) `behind` it; open the chest from (23, 16).
- **Plate puzzle.** `block_c` (20, 4) onto `plate_c` (25, 6), the pillars at (23, 4) and (23, 5) forcing the line.
- **No softlock.** The stair into E has a two-cell notch (21..22, 7) (a block can never seal both), the push search over all
  `(player, block)` states of E finds none from which the party cannot step back on a notch cell, and the minimum is exactly seven
  pushes. Blocks reset on re-entry; the barrow door is never guarded by one.

### Solutions (for the autoplay bot)

1. Arrive (3, 10). East along row 11 to (15, 12); face up, confirm: the switch (slabs swap). Press it again to swap back.
2. **Ossuary** (switch off): through the doorway (19..20, 13..15) to D; Dash at the crack from (23, 17) facing up (or (23, 16));
   open `chest_bw_oss` from (23, 16). The group `e_bw_mixed` guards (22, 17).
3. **Ewe Chamber** (switch on, press at (15, 12)): doorway (12..13, 13..15) to (13, 16), along row 17 to (9, 17), up to (9, 16),
   face right: Bram's Shove. Step to (10, 16), face up: `chest_bw_bow` (gold, `drovers_bow`).
4. **Stair**: hall (21, 10), up onto the stair (21, 9), land on the notch (21, 7), step up to (21, 6).
5. **Plate**: walk (21, 5), (21, 4), (21, 3), (20, 3). Face down, push twice: the block goes (20, 5), (20, 6) and the hero ends at
   (20, 5). Walk (19, 5), (19, 6). Face right, push five times: the block goes (21, 6) to (25, 6) and the hero ends at (24, 6).
   The gate (17..18, 4) opens while the block sits on the plate.
6. West along row 4: (19, 4), (18, 4), (17, 4), then to the hearth: stand (14, 4), face down, confirm (rest and save).
7. West to (12, 4) and onto the trigger (11, 4): `reeve_intro`, the battle `barrow_reeve`. After the win: `chest_bw_reeve`
   (2, 6) (gold, rolled) from (3, 6) facing left; `barrow_names` (8, 2) from (8, 3) with the Lantern.
8. Out: back east and down the stair, west to (3, 10), up onto (3, 9). Leaving works from every reachable cell.

### Enemies (`ZONES.x1_barrow.plan`: two groups and the boss actor, Lv 5 to 6)

| Event | Cell | Sprite | Encounter | Move |
|---|---|---|---|---|
| `e_bw_shades` | (11, 11) | `barrow_shade` | `bw_shades` | patrol, right 8 then left 8 along the hall's middle row |
| `e_bw_mixed` | (22, 17) | `barrow_shade` | `bw_mixed` (shade + page wraith) | guard, the Ossuary |
| `barrow_reeve` (actor) | (4, 5) | `barrow_reeve` | `barrow_reeve` (boss, no flee) | `ifNot: barrow_reeve_defeated`; the step row runs `reeve_intro` then the battle |

### Chests

| Id | Cell | Tier and content | Needs |
|---|---|---|---|
| `chest_bw_landing` | (5, 14) | wood, 2 antidotes | nothing |
| `chest_bw_bow` | (10, 15) | gold, `drovers_bow` (fixed) | the switch on, then Bram's Shove |
| `chest_bw_oss` | (23, 15) | iron, `phoenix_feather` (fixed) | the switch off (or on and back), then Dash |
| `chest_bw_reeve` | (2, 6) | gold, rolled | the Reeve beaten (`if: barrow_reeve_defeated`) |

### Marks

`entrance` (3, 10), `hall_w` (8, 11), `switch` (15, 11), `niche` (10, 16), `ossuary` (17, 16), `counting` (21, 5), `plate` (25, 6),
`hearth` (14, 4), `reeve_spot` (4, 5), `names` (8, 3), `reeve_chest` (3, 6). All walkable and reached in `walk x1_barrow`.

## 4. Ids this work relies on (open seams owned by X1-integrate, and the pack ids)

- **`events.js` GATE_SPRITES and mapcheck `GATE_SPRITE_IDS`**: the pair `x1_gate_barrow` -> `x1_gate_barrow_closed`,
  `x1_gate_barrow_open` (objects in `x1_tiles.json`). `gate_reeve` names the sprite `x1_gate_barrow`. Until the pair exists
  mapcheck reports exactly one error (`gate gate_reeve: sprite x1_gate_barrow`, tolerated by name in the test) and the field draws
  the key door.
- **Heavy-block sprite override**: not used. `block_niche` is `push_block` with `heavy: true` (the engine tints it dark).
- **`battle.js` BACKDROPS**: `battle_downs` (zone `x1_downs`) and `battle_barrow` (zone `x1_barrow`), as `X1_BACKDROP_ART` lists them.
- Pack tile and object ids: terrains `x1_barrow_floor`, `x1_barrow_flag`, `x1_barrow_runner`, `x1_moor_turf`; wall system
  `x1_barrow` (+ `_out`); tiles `x1_drystone`, `x1_niche_lettered`, `x1_niche_blank`, `x1_niche_lit`, `x1_far_tower`,
  `x1_far_windmill`; objects `x1_loomhouse`, `x1_cottage_a`, `x1_cottage_b`, `x1_barrow_door_open`, `x1_menhir_a`, `x1_menhir_b`,
  `x1_menhir_lettered`, `x1_menhir_lettered_b`, `x1_blank_slab`, `x1_cairn_moor`, `x1_old_scarecrow`, `x1_drovers_chain`,
  `x1_chain_gate_open`, `x1_haystack_a`, `x1_haystack_b`, `x1_haybale`, `x1_trough`, `x1_trough_dry`, `x1_boulder_a`,
  `x1_boulder_b`, `x1_flour_sacks`, `x1_loom`, `x1_spinning_wheel`, `x1_wool_shelf`, `x1_wool_bales`, `x1_hearth`, `x1_sampler`,
  `x1_slab`, `x1_slab_doorway`. Base ids: `well`, `bench`, `signpost_arrow`, `signboard`, `pillar`, `candelabra`, `brazier_lit`,
  `stairs_up`, `push_block`, `rune_shrine`, `wall_cracked`, `wall_broken`, `wall_glyph_revealed`, `bed_single`, `table_round`.
- Sprites: `npc_brindle`, `npc_tamsin` (through `npcs.js`), `animal_sheep`, `barrow_shade`, `barrow_reeve` (x1 atlases),
  `briar_wolf`, `moss_scarab`, `page_wraith` (base).
- Scenes the maps run: `downs_arrival`, `thornfold_arrival`, `stones_arrival`, `rollcall_stones`, `barrow_entry`, `reeve_intro`.
  Text ids: `downs_signpost`, `thornfold_well`, `thornfold_sign`, `x1_drovers_chain`, `x1_menhir`, `blank_slab`,
  `x1_old_scarecrow`, `appraise_scarecrow`, `x1_sampler`, `thornfold_hearth`, `barrow_slab_a`, `barrow_hearth`, the book
  `barrow_names`, and the base line `cliff_crack`. Flags read: `first_fight_done` (by the sources), `archive_f1_done`,
  `stones_lettered`, `reeve_named`, `strays_done`, `barrow_reeve_defeated`.

## 5. Differences from the plan

- **Barrow layout.** The 3/4 wall system needs two face rows above a room and three rows between stacked rooms, which the plan's
  rectangles did not leave, so the barrow was re-laid: both chambers lie **south** of the hall (the plan put the Ewe Chamber north),
  the hearth and the Reeve's Hall are one long room (the plan had two rooms, which cannot hold thirteen niches on a face the width
  of the plan's hall), `gate_reeve` is the gap between the Counting Room and the hearth, and the trigger row is a 1 x 2 column at
  x 11 (plan: a row at y 6). Ids, flags, scenes and the puzzle solution (down two, east five; both slabs and both chests) are the
  plan's. Barrow marks moved with it (entrance (3, 10), switch (15, 11), niche (10, 16), ossuary (17, 16), counting (21, 5),
  plate (25, 6), hearth (14, 4), names (8, 3), reeve_chest (3, 6); `hall_w` (8, 11); `reeve_spot` (4, 5) is unchanged). The door
  from the Downs lands on (3, 10), not (3, 13).
- **Chest contents.** A chest event holds one item type, so the landing chest holds 2 antidotes (plan: and an echo herb) and the
  Ossuary chest the phoenix feather (plan: and a hi-potion).
- **Downs.** The fold is x 40..43 (plan 39..43) so the signpost stands clear of it; `e_dn_scarab` is at (13, 25) and
  `e_dn_pack` at (47, 31) (plan (14, 27) and (47, 28)) so every chase foe is 6 cells off every lane and the Larchhill lane
  passes no foe; the Millrace door is x 39..41 (plan 38..41) because the walled track is three wide; the Old Fold crack is at
  (17, 21..22) (plan (17, 22)); the marks listed in section 1 moved by one to three cells.
- **`x1_far_tower`** is an overhead decal, not an event; `x1_far_light` is a `light` event at (45, 5).
- **Appraise chest** sits beside Patch at (32, 6), not under him, so Patch's cell and the `ridge` mark stay free.

## 6. Verification

- `node --test qa/maps/x1_west.test.mjs`: 24 tests, all pass. They validate the three modules, prove the 4.11 marks and named events
  against `STAGING_X1.md`, the walks (both flag sets for the Downs), each chest with and without its ability, the slab switch
  both ways, the Shove, the Dash cracks, the Appraise chest, the plate puzzle by a push search (seven pushes, no softlock),
  the heavy-block search, the placement rules, the foe-free lanes, and that every return door lands in front of its door.
- `mapcheck` itself reads `tiles.json` only, so `node tools/maps/mapcheck.mjs check x1_downs` (with or without `--pack x1`) reports
  unknown x1 tile ids for any x1 map. The test merges the fragment and the two x1 sprite atlases the way `ensurePack` does
  (`mergeTileFragment` from `src/game/packs.js`). The same merge, three lines at the end of `loadDb()`, would make the CLI clean.
  With the merge: `x1_downs` 0 errors, `x1_loomhouse` 0, `x1_barrow` 1 (the gate sprite seam above); warnings only for
  `x1_highmoor` and `x1_larchhill` (not built yet, listed in `tools/maps/x1_links.json`).
- Two existing tests assume no x1 map file exists: `qa/maps/maps.test.mjs` line 22 (the module list) and
  `qa/core/pack_maps.test.mjs` lines 18 and 32 (they load `x1_downs` and expect `null`). Both belong to other owners.
