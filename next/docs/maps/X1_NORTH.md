# X1 north maps: the Keepers' Terrace, the Orrery, the Keepers' Cellar (X1-maps-north, W3)

Modules: `src/data/maps/x1_terrace.js`, `x1_orrery.js`, `x1_cellar.js` (`x1` pack files; nothing imports them directly).
Test: `qa/maps/x1_north.test.mjs`. Previews (2x, annotated): `tools/maps/previews/x1_terrace.png`, `x1_orrery.png`,
`x1_cellar.png`, `x1_cellar_revealed.png` (the route lit; made by `python tools/maps/previews/x1_cellar_revealed.py`).

## How to check

```bash
node --test qa/maps/x1_north.test.mjs          # 11 tests; registers the x1 pack and merges assets/tiles/x1_tiles.json itself
python tools/maps/preview.py x1_terrace x1_orrery x1_cellar --scale=2 --previews
python tools/maps/previews/x1_cellar_revealed.py 2
```

`tools/maps/mapcheck.mjs loadDb()` reads `tiles.json` only, so the CLI (`mapcheck check`, `walk`) reports every `x1_` tile and object
id as unknown until it merges the fragment. Seam for the integrate wave (X1-world owns the file): after `const tiles = readJson(...)` in
`loadDb`, merge `assets/tiles/x1_tiles.json` (`terrains`, `walls`, `tiles`, `objects`, `overlays`, never overwriting an id). The test
does exactly that in memory, as does the scratch runner used for the reports below.

## x1_terrace (60 x 22, field, music `orrery`, `respawn: 'reentry'`)

Floor cells (exact): yard x 0..6 y 11..14; stile row y 15 (x 0, 1, 5, 6 low wall; the stile prop `x1_stile` at (2,15) with its gap at
(3,15)); Landing x 1..12 y 16..19; Broken Beacon x 13..24 y 10..17; neck x 25..26 y 12..15; Orrery Court x 27..39 y 8..16 plus the
wings x 27..29 and x 37..39, y 4..7 (lawns); Long Walk x 40..55 y 10..17; the roots nook (47,8..9); the edge gap (56..57, 10..11).
North of every floor row stand two cliff faces; south of every floor row (columns 1..55) a low parapet, two rock faces and, where
rows remain, lowland with pines. The cliff top is the shared `cliff` system (the upland above is dressed with pines and boulders).

| Link | Cell | To |
|---|---|---|
| exit | (0, 13..14) | `x1_highmoor` (70, 13, left) (pending link) |
| arrival from the moor | (1, 13) | |
| `stair_down` (stairs) | (6, 20) | `valley` (21, 6, down) |
| arrival from the valley stair | (6, 19), facing up (also `start`) | |
| `orrery_door` | (32, 9) | `x1_orrery` (8, 12, up) |
| `edge_drop` (pit area, one way) | (56..57, 10..11), `pit` terrain | `valley` (36, 8, down) |

Marks: `stair_in` (6,19), `stair_door` (6,20), `cairn` (8,17), `beacon` (18,13), `court` (32,11), `orrery_door` (32,9),
`walk_east` (48,14), `roots` (47,10), `edge` (55,10), `moor_gate` (1,13): all on the plan cells.

Events: `terrace_enter` (enter, `terrace_arrival`), `terrace_sign` (8,18), `edge_sign` (54,11), `x1_roots_terrace` (47,8; breakable
`roots`, h 2; art stand-in `root_drape`; `wall_broken` overlay under it as in the valley grotto), `chest_terrace` (47,9, `behind`
the roots), `chest_beacon` (18,12). The Orrery prefab `x1_orrery_tower` stands at (30,9) (door cell (32,9)).

| Enemy | Cell | Move | Encounter | Notes |
|---|---|---|---|---|
| `e_tr_wolves` | (22,14) | guard | `tr_wolves` (thornback x2, briar) | 3 or more tiles off the lane, 14 from the door |
| `e_tr_golem` | (38,6) | patrol `down 6, up 6` (x 38, y 6..12) | `tr_golem` (golem, 2 bookmites) | the court's east wing and half; 6 or more from (32,10) |

| Chest | Cell | Tier | Reward | Needs |
|---|---|---|---|---|
| `chest_beacon` | (18,12) | wood | rolled | nothing |
| `chest_terrace` | (47,9) | iron | rolled | Dash (the roots) |

## x1_orrery (16 x 14, interior, music `orrery`)

Round room cut to the grid: floor rows 3..12 (corners clipped), exit gap (8,13), start (8,12) facing up. Floor `x1_cellar_floor`,
walls `interior_stone`, the star inlay (`x1_cellar_inlay`) 6..9 x 6..9 under the armillary.

Events: `orrery_enter` (enter, `hesper_meet`), `hesper` npc (11,6) facing right (the telescope `x1_telescope` stands at (12,6)),
`x1_armillary` (7,8) state 0 `ifNot orrery_aligned` and `x1_armillary_lit` (7,8) state 1 `if orrery_aligned`,
`keeper_star_ledger` (3,3) (a `book` on the bookshelf), `x1_star_plate` (5,2) (object, `appraise: true`, `appraiseText:
'appraise_star_plate'`, in the north face), `chest_orrery` (6,3) (wood, 3 ether, `behind: 'appraise:x1_star_plate'`; read the plate
from row 4), `x1_hatch` (12,4) (`x1_hatch_closed`, `ifNot orrery_aligned`), `x1_hatch_open` (12,4) (object, not solid) and
`hatch_stair` (12,4) (stairs to `x1_cellar` (3,14,down), `if orrery_aligned`), `orrery_exit` (8,13) to `x1_terrace` (32,10,down).
Marks: `hesper` (11,6), `orrery` (8,8), `plate` (5,4), `hatch` (12,5), `door` (8,12). No enemy.

## x1_cellar (28 x 20, dungeon, dark 0.6, music `orrery`)

| Room | Cells | Notes |
|---|---|---|
| A Landing | x 1..6, y 14..18 | arrival (3,14) from the hatch; `cellar_exit` stairs (3,13) to `x1_orrery` (12,5,down); `cellar_font` (5..6,16), `safe`; `pitTo` lands (3,15) |
| B Well Hall | x 8..18, y 13..18 | a ring (slate border) round the dry well, pit cells (11..13, 15..16); four pillars; doorway to A at (7,16..17); corridor north (12..13, 10..12) |
| C Constellation Floor | x 1..26, y 3..9 | pits everywhere except: the entry platform (11..14, 9) with two inlaid star cells (12..13, 9) between two braziers; the nook platform (4..6, 4..6); the dais x 21..26, y 3..8 |
| D Seed Vault | x 20..26, y 14..17 | behind the cracked wall `x1_crack_vault` (19,15..16; Dash, `opens` both cells) |

Marks: `entrance` (3,14), `font` (5,17), `well` (12,14), `route_start` (12,9), `dais` (22,5), `nook` (5,5), `vault` (22,15).
Deviations from the plan marks: `well` (plan (12,15)) and `route_start` (plan (12,10)) moved one cell to stay on floor.

### The ink route (cells, for the autoplay bot)

Faint bridge overlays (`ink_bridge_v_faint` where the neighbour is north or south, else `ink_bridge_h_faint`), 31 cells. Exported as
`ROUTE` from `x1_cellar.js`. Stand on (12,9) and raise the Lantern (radius 6, Manhattan 7); walk the cells in order; raise it again
when the next cell is unlit (three to five uses). Revealed cells stay revealed (`game.opened` `ink:x,y`).

Main route (26): (12,8) (12,7) (12,6) (12,5) (12,4) (12,3) (13,3) (14,3) (14,4) (14,5) (14,6) (14,7) (15,7) (16,7) (16,6) (16,5) (16,4)
(16,3) (17,3) (18,3) (18,4) (18,5) (18,6) (18,7) (19,7) (20,7), then (21,7) is the dais platform.

Fork (5), leaving (12,6) westward: (11,6) (10,6) (9,6) (8,6) (7,6), then (6,6) is the nook platform; `chest_cl_nook` at (5,5).

Without the Lantern every route cell is a pit (the base grid and the walk agree); falling from the floor or into the well lands at (3,15).

| Enemy | Cell | Move | Encounter |
|---|---|---|---|
| `e_cl_wraiths` | (15,14) | patrol `right 3, down 4, left 3, up 4` (the east half of the ring, x 15..18, y 14..18) | `cl_wraiths` (ink wraith, page wraith) |

| Chest | Cell | Tier | Reward | Needs |
|---|---|---|---|---|
| `chest_cl_nook` | (5,5) | wood | rolled | Lantern (the fork) |
| `chest_cl_chart` | (22,4) | gold | `star_chart` | Lantern (the main route) |
| `chest_cl_vault` | (23,15) | iron | 3 `echo_herb` | Dash (the plan's "and 2 eye drops" is not expressible: a placed chest pays one item and gold) |

`cellar_note` (25,4) is an object (sprite `lectern`) running the scene `cellar_note`; `x1_armillary_statue` stands at (23,3).

## Ids the maps rely on from later waves (X1-integrate)

- `events.js` `GATE_SPRITES`: none (these maps use no `gate` or `locked_door`). No heavy block.
- `battle.js` `BACKDROPS`: the zones use the fallback keys named in `src/data/x1/encounters.js` (`valley`, `archive`); no `x1_battle_*` key is needed here.
- Tile and object ids from `assets/tiles/x1_tiles.json`: `x1_cellar_floor`, `x1_cellar_slate`, `x1_cellar_inlay`, wall system `x1_cellar`
  (`x1_cellar_top`, `_face`, `_out_top`, `_out_face`), `interior_stone` (existing), objects `x1_orrery_tower`, `x1_armillary`,
  `x1_armillary_statue`, `x1_star_plate`, `x1_hatch_closed`, `x1_hatch_open`, `x1_drafting_desk`, `x1_telescope`, `x1_stile`,
  `x1_cairn_moor`, `x1_boulder_a`, `x1_boulder_b`. Existing ids: `cliff`, `plaza`, `stone_floor`, `wall_low`, `cliff_stairs_*`, `pit`,
  `font_silver`, `pillar`, `candelabra`, `stairs_up`, `ink_bridge_*_faint` (and `_revealed`), `wall_cracked`, `root_drape`.
- Text ids used (all exist in `src/data/x1/text.js` or the Episode 1 lines): `terrace_sign`, `edge_sign`, `x1_armillary`,
  `x1_star_plate`, `appraise_star_plate`, `x1_hatch`, `cellar_font`, `root_wall_thin`, `cliff_crack`; books `keeper_star_ledger`.
- Scenes: `terrace_arrival`, `hesper_meet`, `cellar_entry`, `cellar_note`.
- NPC: `hesper` (sprite `npc_hesper`, merged into the NPC atlas by the pack; the preview tool does not draw it).
- Valley (hub): the stair's top door (21,3) and the arrival (21,6) are the hub's; the edge drop lands on (36,8) (walkable today).
- `tools/maps/mapcheck.mjs` tile merge (see above) and `qa/maps/maps.test.mjs` line 22 (`listMapIds()` equals the Episode 1 and 2 lists)
  will fail until the integrate wave lists the x1 maps.
