# X1-maps-south: the Lower Millrace, Hal's Mill and the Weir Culvert (X1 wave W3)

Read `docs/briefs/COMMON.md`, `DESIGN.md` 5.1 to 5.3, `docs/EXPANSION_RECONCILIATION.md` (the decision log), `docs/briefs/XP-packs.md` sections 1 and 4 (your maps are pack files), `docs/MAPS.md` (conventions, vocabulary, walk model),
`docs/EXPANSION1_PLAN.md` sections 2, 3, 4.7 to 4.9, 4.11, 5.4, 6, 7.3 and 7.4 (your contract), `docs/story/STAGING_X1.md` and the
reports of X1-story, X1-battle, X1-world, X1-tiles and X1-sprites. Model the code on `east_road.js` (a field map with a
shop and a campfire), `whisperwood_hollow.js` (a mini-dungeon with a font and a boss trigger) and `archive_f1.js` (plates,
blocks and a heavy block).

## Items, in order

1. **`x1_millrace`** (52 x 32): every area, event, mark, enemy and chest of 4.7: the road, the Drovers' Road from the
   north-west (arrival (4, 1)), the mill (prefab; the door `door_mill` has `if: archivore_defeated` and a barred-door sign `x1_mill_barred` stands until then; the wheel object `x1_mill_wheel` with `script: 'pin_place'`,
   the Shove millstone and its hatch chest), the drained weir, Ferrick's Landing with the stall (shop `millrace_stall`), the
   culvert arch, the east bank with its Dash crack, **the west exit to Larchhill's east gate and the jetty where the hay chute lands (plan 3.2)**, the
   far-off decal `x1_far_windmill` on the south-west horizon, two visible groups (`respawn: 'reentry'`; `e_mr_weevils` behind the mill at (24, 21),
   `e_mr_wolves` on the east bank at (34 to 40, 28)), a safe zone around Ferrick and the mill door. The valley arrival is (23, 1).
2. **`x1_mill`** (16 x 12): copy an interior's layout and exit; the millstones, the flour table (`x1_flour_table`), the
   ledger (`mill_ledger_obj`, a `book` that sets `list_ledger` when `list_started`), four sill rolls after `mill_done`.
3. **`x1_culvert`** (28 x 20, dark 0.4): rooms A to E of 4.9: the Drain Hall with two plates (a light block pushed along
   row 15, a heavy block Shoved) opening `gate_drain` (AND), the Dash crack and its chest, the Pump Room with
   `chest_cv_pin` (`millstone_pin`, flag `pin_found`), the font `culvert_font`, the trigger `golem_trig`, the Golem actor and
   the gold chest behind it. Boss encounter `millstone_golem`; the trigger runs `golem_intro` first.
4. **Cross-links**: the Drovers' Road NW exit to `x1_downs` and the valley link (plan 3.2) may target maps that do not exist
   yet; they are in `tools/maps/x1_links.json` (a warning). Never edit that file.
5. **`mapcheck`**: `check` clean for your maps (plan counts: 2, then 2 + the boss actor), `walk x1_millrace archive_f1_done`
   (everything reachable but the Dash and Shove chests until the ability), `walk x1_culvert` (the gate opens only with both
   plates; the Shove block can always be moved back out of any dead end; no softlock; leaving works from every cell).
6. **`qa/maps/x1_south.test.mjs`**: the marks of 4.11, the placement rules of plan 3.6, the puzzle solutions as walks, every
   chest reachable by its stated ability, return doors land in front of their doors, the wheel object and the pin chest exist
   and the pin chest sets `pin_found`.
7. **Previews** named `x1_millrace*`, `x1_mill*`, `x1_culvert*` (a `_solved` Culvert with both plates down), viewed at 2x;
   `docs/maps/X1_SOUTH.md` with exact cells, solutions (for the autoplay bot), enemy and chest tables, preview paths.

## Rules

- Owned paths: `src/data/maps/x1_millrace.js`, `x1_mill.js`, `x1_culvert.js`, `tools/maps/previews/x1_millrace*`, `x1_mill*`,
  `x1_culvert*`, `qa/maps/x1_south.test.mjs`, `docs/maps/X1_SOUTH.md`. Not `valley.js` (X1-maps-hub) and not `X1_MAPS_LISTED`.
  Missing tile or sprite ids are stubbed with the nearest existing id and named in your report.
- The Millrace road and the Culvert open at `archive_f1_done` (the toll shook the oak clear); only the mill door waits for `archivore_defeated`. Every door the
  hub adds is flag-gated. The mill is lived in, not a shrine. Every puzzle reads on a phone without text.
- Your map modules are `x1` pack files: nothing imports them directly (the `loadMap` guard fetches them on first entry); node tests import `src/data/x1/index.js` and call `register()` first. EXP is not yours: encounter data and `expMul` are X1-battle's.
- No git, no em dashes, bounded commands, one browser job at a time.
- Verify: the mapcheck commands above; `python tools/maps/preview.py --all --scale=2` for your maps; `node qa/run.mjs maps`.
- Report under 400 words: marks that differ from the plan, puzzle solutions, enemy and chest tables, preview paths.
