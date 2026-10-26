# X1 hub: the edits to the valley, the town and the Archive (X1-maps-hub, X1 wave W5)

Edits to `src/data/maps/valley.js`, `willowmere.js`, `archive_f1.js`, `archive_f2.js`, `archive_f3.js` from `docs/EXPANSION1_PLAN.md` 3.2, 4.10, 4.11, 6.1 and 12.
Every addition is behind `x1On()` (`src/data/x1/live.js`): with the switch off (`X1_LIVE` false, today), a region off, or the `x1` pack not loaded, each of the five
modules resolves to exactly the module it was before (byte for byte, `JSON.stringify` equal to `qa/maps/x1_baseline/<id>.json`). Once the pack becomes ready
`src/world/maps.js` re-imports the five (`touches` in `src/game/packs.js`), so the gates are read at the top level of each module on purpose.

```bash
node qa/run.mjs maps world content                 # includes qa/maps/x1_hub.test.mjs (38 tests)
node --test qa/maps/x1_hub.test.mjs                # just this file
# the ON state of the five maps for mapcheck and the previews (X1_LIVE is a const until X1-integrate flips it):
NODE_OPTIONS="--import file:///D:/LexiconQuest/next/qa/maps/x1_baseline/force_on.mjs" LQ_X1_ON=all node tools/maps/mapcheck.mjs check --pack x1
NODE_OPTIONS="--import file:///D:/LexiconQuest/next/qa/maps/x1_baseline/force_on.mjs" LQ_X1_ON=all python tools/maps/preview.py valley willowmere archive_f1 archive_f2 archive_f3 --tag=x1 --previews
```

Previews (`tools/maps/previews/`, annotated at 2x, the ON state with every region on; the `_clean` twins are in `tools/maps/out/`): `valley_x1.png`, `willowmere_x1.png`,
`archive_f1_x1.png`, `archive_f2_x1.png`, `archive_f3_x1.png`. They draw every event whatever its flags (gates and doors both) and show the faint ink bridges as the tiles they are.

## 1. How the gate works, and the test oracle

- `qa/maps/x1_baseline/<id>.json` is the resolved module of each map as `mapcheck dump` printed it, captured by `capture.mjs` BEFORE the first edit; `<id>.walk.json` is
  the reachability (row runs), event reach, mark reach and log of `walk()` under five flag sets (`walks.mjs`: `ep1_fresh` none, `ep1_mid`, `ep1_done` = `EP1_DONE_FLAGS`,
  `ep2` = done + `ep2_started,crossing_done`, `ep3` = done + `ep3_started`), each with and without the Lantern. `capture.mjs` refuses to overwrite them. Never regenerate them after an edit.
- `qa/maps/x1_baseline/force_on.mjs` registers a synchronous resolve hook (`node:module` `registerHooks`) that gives ONE importing map module a stub `x1/live.js`: the `?x1=` query
  of the map URL names the state (`all`, `none`, `west,north`, or `real:all` to keep the real `packReady('x1')`), or the `LQ_X1_ON` environment variable does for the CLI.
  Nothing in `src/` knows about it.
- Regions: `west` (the Willowmere gate and the valley's west lane, `stray_4`), `south` (the south track, the oak, the door, the sandbar), `north` (the cleft, the stair, the two valley star marks,
  the F2 note), `wild` (the far Watchtower). The two secrets in the cliff and the three Archive alcoves belong to no region: they follow `x1On()` alone (the switch and the pack).

## 2. valley (60 x 40): exact cells

| Thing | Cells | Gate | Notes |
|---|---|---|---|
| door to the Downs `x1_downs_door` | (0, 28), 1 x 2, to `x1_downs` (54, 11, left) | west, `if: first_fight_done` | the plan's table 3.2 |
| drovers' gate `x1_drovers_gate`, `x1_drovers_gate_b` | (0, 28), (0, 29), solid objects (sprite `signpost`, text `x1_drovers_gate`) | west, `ifNot: first_fight_done` | the arrival (1, 28) stays free; **the gate art is a stand-in**: no 1-cell gate sprite exists in `x1_tiles.json` (the chain gate is 3 wide and would cover the arrival) |
| pasture stray `stray_4` | (7, 20), inside the fence (3..11, 18..23), on column 7 | west, `if: strays_started` | the first-fight trigger's column is unchanged; the stray only takes its own cell |
| south track | dirt on x 22..24, rows 36..39 | south | the road runs from (22..25, 35) to the edge |
| fallen oak `x1_fallen_oak` | (21, 37), sprite footprint (21..24, 37) | south, `ifNot: archive_f1_done` | lies across the track |
| door `x1_millrace_door` | (22..24, 39), to `x1_millrace` (23, 1, down) | south, `if: archive_f1_done` | the party can still walk round the oak to the edge; the door is what is shut |
| driftlog `x1_driftlog` | heavy block (26, 37) | south | Shove it west or east; (25, 37) and (27, 37) are open floor |
| `x1_chest_sandbar` | (26, 38), iron, 2 hi_potions | south | closed in by bushes (25, 38), (26, 39) and a boulder (27, 38); (27, 39), the sand cell they cut off, is the one walkable cell this map loses |
| stair | `S t z` at (21, 3), (21, 4), (21, 5); door `x1_terrace_stair` on (21, 3) to `x1_terrace` (6, 19, up) | north | |
| cleft | ink on x 19..23, rows 6..8, except the landing (21, 6); faint ink bridge `ink_bridge_v_faint` (21, 7), (21, 8) | north | a pit until the Lantern |
| `x1_cleft_fall` | pit area (21, 7), 1 x 2, to `valley` (21, 9, down) | north | a party that came down the stair without the Lantern steps on the bridge and lands on the cleft's south lip, not at the Whisperwood pool |
| `x1_cleft_sign` | sign (23, 9) on a `signboard` | north | |
| `x1_cleft_trig` | trigger (19..23, 9), `cleft_hint`, `if: lantern_get` | north | |
| star marks | `x1_star_mark_milestone` (38, 20), `x1_star_mark_door` (38, 6), objects with the Lantern, `if: stars_started`, scenes `star_read_1`, `star_read_2` | north | (38, 6) is beside the carving at (37, 5) |
| far Watchtower | overhead `x1_far_tower` at (9, -2) | wild | the Downs' own decal is at (44, -2) |
| secret: roots | `x1_roots_valley` (13, 4), h 2 (Dash); `wall_broken` overlay (13, 4); `x1_chest_roots` (13, 5), iron, rolled, `behind` it | any | stand at (13, 6) on the strip under the cliff face |
| marks | `downs_gate` (1, 28) west; `cleft` (21, 9) and `stair_foot` (21, 6) north; `south_track` (23, 38) south | | |
| pines | the filters drop (19, 2), (20, 0), (22, 2), (23, 1), (19, 7) (north: the notch x 19..23, rows 0..8) and (23, 37) (south: x 21..25, rows 35 and down) | | nothing else; the west filter (x 0..3, rows 27..30) drops none |

## 3. willowmere (48 x 32), all `west`

| Thing | Cells | Notes |
|---|---|---|
| door `x1_west_gate` | (0, 16), 1 x 2, to `x1_downs` (54, 25, left), `if: first_fight_done` | |
| `x1_orchard_gate`, `x1_orchard_gate_b` | (0, 16), (0, 17), solid, `ifNot: first_fight_done`, text `x1_orchard_gate` (Holt's notice) | the same stand-in sprite as the valley gate |
| lantern | `lamp_post` decor (1, 15) | next to the arrival, not on it |
| Wick's hole | `x1_wall_crack` (6, 30), `wall_cracked`, rock, h 2 (Dash), `wall_broken` overlay (6, 30); `x1_chest_wall` (6, 31), wood, 2 echo herbs, `behind` it | stand at (6, 29) on the south lane; the pine that stood at (6, 31) is dropped |
| mark | `west_gate` (1, 16) | |

## 4. The three Archive alcoves (no region: `x1On()`)

| Floor | Alcove | Cells | Needs |
|---|---|---|---|
| F1 | in the **key alcove D's east wall**: a two-cell doorway (12, 5..6) under `x1_f1_roots` (`root_drape`, roots, h 2); alcove floor x 13..17, rows 5..6 (faces rows 3..4, `depth()` applied); `x1_chest_f1` (15, 5), iron, rolled; a candelabra (17, 5) | `g` carved only when on | Dash. D is on the critical path (the key), so everyone passes it |
| F2 | the **Reader's Alcove** west of the entry hall: doorway (13..14, 7..8) through the hall's west wall, an ink moat (10..12, 7..8) crossed by three faint bridge cells `ink_bridge_h_faint` (10..12, 7), alcove floor x 6..9, rows 5..8 (faces rows 3..4); `x1_chest_f2` (7, 6), gold, rolled; a lectern (9, 6) with the book `x1_keeper_note_f2` (`lantern: true`, **north**) | `g` carved only when on | the Lantern |
| F2 | `x1_f2_bridge`: pit area (10..12, 7) to `archive_f2` (13, 7, left) | | a fall before the bridge is shown lands back at the doorway |
| F3 | in the western stacks' north face: `wall_broken` overlay (9, 9) (the niche, rows 9..10), `x1_chest_f3` (9, 10), iron, 2 ethers; the heavy bookcase `x1_f3_shelf` (9, 11) in front | no ground change | Shove (open floor at (8, 11) and (10, 11)) |

## 5. Differences from the plan

- **F1, F2 and F3 alcoves are not where 4.10 puts them.** F1's entrance hall has no free wall (B and the west corridor share its west side); the key alcove's east wall has a whole block of unused fill behind it and
  every party passes it. F2's "east of the rotunda" is the hub, so the alcove hangs off the entry hall instead (the fill north-west of the gallery band). F3's niche stands in the first stacks aisle the party meets.
- **F3 chest**: 2 ethers only (a placed chest pays one item; the antidotes are dropped, as the sibling maps did). **Wick's chest**: 2 echo herbs only.
- **The cleft is three rows (6..8) with a one-cell landing**, not rows 7..8: with only two rows the cells (19..23, 6) stay grass and the stair foot is reachable on foot. `x1_cleft_fall` is new.
- **Gates**: two `signpost` objects each (stand-ins), see section 2.
- **Marks and ids** are the plan's (4.11), plus the new ids `x1_downs_door`, `x1_drovers_gate_b`, `x1_cleft_fall`, `x1_orchard_gate_b`.
- **The sandbar chest cell (26, 38) and the log (26, 37)** are the plan's; the pocket round them is new (it is what makes the chest unreachable without the Shove).
- The plan's `x1_far_tower` is an overhead decal, not an event (as in the Downs).

## 6. What changed in existing lines (baseline behaviour is identical; none of these is a rename, a move or a removal of an event, mark, overlay or exit)

- `valley.js`: the import line of `_kit.js` also imports `pit`; `pine()` gained three early-return lines; `overhead: []` became `X1_V ? [...] : []`; the `marks` literal ends with three conditional spreads;
  `const ground = rows(g)` is preceded by two conditional carves; each array literal (`overlays`, `decor`, `events`) ends with conditional spreads. **Two comment blocks were shortened for the load budget** (the W9 and shapes paragraph of the header, the Episode 2 washout paragraph; no code).
- `willowmere.js`: `chest` is imported; one decor entry (the pine at (6, 31)) is now `...(X1_W ? [] : [{ ... }])` so it is dropped while the west region is on; the arrays end with spreads.
- `archive_f1.js`, `archive_f2.js`, `archive_f3.js`: the import line; the notch/floor carve line; spreads at the end of `overlays`, `decor` and `events`. **The four-line `depth()` comment in each of the three was shortened to one line (load budget).**
- `src/data/x1/encounters.js`: `X1_MAPS_LISTED = true` (the one line outside the owned paths).

## 7. Verification

- `node qa/run.mjs maps world content`: all green (the hub's own test: 38 tests; baseline equality byte for byte; the listed additions only, per map and per region; the walk oracle for the five flag sets with and without the Lantern;
  no protected cell closed; first-fight trigger and gates; the cleft; the oak; every secret; the F2 alcove; the plan 3.2 links both ways; the loops on foot; the listing; the late registration through `src/world/maps.js`).
- `mapcheck check` (ON, `--pack x1`): the five edited maps 0 errors; every other existing map 0 errors. The x1 maps still report the seams their own docs name (the two gate sprites, the sprite atlases the CLI does not merge).
- `qa/pwa/precache.test.mjs` is green but **thin**: the tap-prompt ratchet is 2.32 MB and the module bytes in front of it are now 2,432,411 of 2,432,696 allowed (285 bytes of headroom). The hub's additions cost about 2.8 KB gzipped (an estimate: the files' gzip size minus their X1 lines), partly paid back by the two comment trims named in section 6. X1-integrate should expect no room here.
