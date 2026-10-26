# X1-maps-north: the Keepers' Terrace, the Orrery and the Keepers' Cellar (X1 wave W3)

Read `docs/briefs/COMMON.md`, `DESIGN.md` 5.1 to 5.3, `docs/EXPANSION_RECONCILIATION.md` (the decision log), `docs/briefs/XP-packs.md` sections 1 and 4 (your maps are pack files), `docs/MAPS.md` (conventions, vocabulary, hidden ink and the walk model;
the Court F3 entry for hidden bridges), `docs/EXPANSION1_PLAN.md` sections 2, 3, 4.4 to 4.6, 4.11, 5.5, 6 and 7.3 (your
contract), `docs/story/STAGING_X1.md` and the reports of X1-story, X1-battle, X1-world, X1-tiles and X1-sprites. Model the code
on `valley.js` (a field map), `archive_f2.js` (hidden ink bridges that stay revealed), `court_f3.js` (a long hidden-ink
route in the dark) and an existing interior. Scott chose to build everything (plan 16: every cut line is unused), but keep it a clean slice: nothing outside your files depends on it.

## Items, in order

1. **`x1_terrace`** (60 x 22): areas T0 to T4 of 4.4 (T0 is the moor's west stile, arrival (1, 13), exit (0, 13 to 14); plan 3.2): the landing with the stair door, the Broken Beacon, the Orrery Court with
   the Orrery door, the Long Walk with its Dash roots and the one-way edge drop (a `pit` area with `to` into the valley,
   landing facing down at (36, 8)), two visible groups (`respawn: 'reentry'`), a view that makes the player want to look.
2. **`x1_orrery`** (16 x 14): the Orrery object (two states), Hesper's desk, the bookshelf, the Appraise star plate with its
   chest `behind` it, the locked hatch that becomes a stair when `orrery_aligned` is set. `hesper_meet` plays on first enter.
3. **`x1_cellar`** (28 x 20, dark 0.6): rooms A to D of 4.6: the landing with the font, the Well Hall ring and its group, the
   Constellation Floor: a pit field crossed by a route of about 30 faint ink bridge cells (a zigzag of single cells so the
   route reads as a figure; one fork to the nook, the main route to the dais and the chart chest and note), the Seed Vault with
   its Dash crack. Falling from the floor lands harmlessly at the landing (`pitTo`). The route must be walkable with the
   Lantern and impossible without it (a pit otherwise); revealed cells stay revealed.
4. **`mapcheck`**: `check` clean (plan counts: 2 and 1), `walk x1_terrace lantern_get` and `walk x1_cellar` (with `{ lantern:
   true }`; every chest reachable by its ability; the Seed Vault only after the Dash; no softlock; leaving works from every cell).
5. **`qa/maps/x1_north.test.mjs`**: the marks of 4.11, the placement rules of plan 3.6, the ink route as a walk (every cell
   reachable only after reveal), the Appraise chest (`behind` the plate), the hatch gate (`orrery_aligned`), the edge drop lands
   on a walkable cell of the valley, return doors land in front of their doors.
6. **Previews** named `x1_terrace*`, `x1_orrery*`, `x1_cellar*` (a `_revealed` Cellar with the route lit), viewed at 2x;
   `docs/maps/X1_NORTH.md` with exact cells, the ink route as a list of cells (for the autoplay bot), enemy and chest tables.

## Rules

- Owned paths: `src/data/maps/x1_terrace.js`, `x1_orrery.js`, `x1_cellar.js`, `tools/maps/previews/x1_terrace*`, `x1_orrery*`,
  `x1_cellar*`, `qa/maps/x1_north.test.mjs`, `docs/maps/X1_NORTH.md`. Not `valley.js` (the hub adds the cleft, the stair and the
  star marks) and not `X1_MAPS_LISTED`. Missing tile or sprite ids are stubbed and named in your report.
- Phone rule: a revealed bridge cell must read at phone scale on the cellar floor; the route's first cell is visible from the
  door (a small star motif), so a first-time player finds the Lantern's job without text.
- Your map modules are `x1` pack files: nothing imports them directly (the `loadMap` guard fetches them on first entry); node tests import `src/data/x1/index.js` and call `register()` first. EXP is not yours: encounter data and `expMul` are X1-battle's.
- No git, no em dashes, bounded commands, one browser job at a time.
- Verify: the mapcheck commands above; `python tools/maps/preview.py --all --scale=2` for your maps; `node qa/run.mjs maps`.
- Report under 400 words: marks that differ from the plan, the ink route, enemy and chest tables, preview paths.
