# X1-maps-wild: the High Moor and Larchhill, the two wide outdoor maps (X1 wave W4, beside X1-audio)

Read `docs/briefs/COMMON.md`, `DESIGN.md` 5.1 to 5.3, `docs/EXPANSION_RECONCILIATION.md` (the decision log), `docs/briefs/XP-packs.md` sections 1 and 4 (your maps are pack files), `docs/MAPS.md` (conventions, vocabulary, the walk model, hidden ink; the Fading Road
and the valley entries), `docs/EXPANSION1_PLAN.md` sections 3 (all of it: routes, landmarks, far-off decals, fog and lighting cost, foe placement
rules), 4.12, 4.13, 4.11, 6, 7.4 and 10.1 (your contract), `docs/story/STAGING_X1.md`, `docs/maps/X1_WEST.md`, `X1_SOUTH.md` and
`X1_NORTH.md` (the edge cells your links must meet) and the reports of X1-story, X1-battle, X1-world, X1-tiles, X1-sprites and X1-audio. Model the
code on `valley.js` (a big field map: roads, noise blobs, rings, the pine filter) and `east_road.js` (a long map with a route and a shop).
`docs/CRITIQUE_4.md` items 4 and 6 are the warning: no green copies of the valley, no fog that costs more than it gives.

## Items, in order

1. **`x1_highmoor`** (72 x 36): every area, route, event, mark, enemy and chest of 4.12. **Three real routes** from the south entry to the east
   stile: the Chime Road (long, safe, nine chime posts, a bench, one guard group beside the road), the Ridgeline (short, one-way ledges, two groups, a view
   chest), the Hidden Fold (across the black tarn on a faint ink route to the islet's gold chest, then Dash through the gorse tunnel to the stile;
   foe-free). The Watchtower and Odo's hut on a spur reachable from both visible routes, the star mark on the tower base, the stile with its roots.
   Heath and gorse blobs, crags, a tarn with ragged banks; a palette that is cooler and sparser than the valley's. Overhead decals: `x1_far_tower` is
   on the Downs and the valley, not here; here the Orrery's dome `x1_far_dome` shows near the stile.
2. **`x1_larchhill`** (68 x 38): every area, route, event, mark, enemy and chest of 4.13. **Three real routes** from the lower gate to the east gate:
   the Switchback Road (long, a hive-stand chest, two groups), the Terrace Stairs (short, one group beside the stairs), the Aqueduct Walk (the cider
   barrel to Shove, then a high walk with a Dash press-wall chest and the gold chest at its end; foe-free). Yarrow's apiary and the Windmill with its
   ladder (`windmill_view`), the hay chute pit area into the Millrace (`if: yarrow_met`), `ambientFx: ['motes']` over the orchards, the Windmill
   decal on the horizon (`x1_far_windmill`) from the lower gate.
3. **Cross-links** (plan 3.2): the Downs' north edge, the stile and Terrace west edge, the Larchhill Road north gate, the east gate and the
   Millrace west edge, the hay chute. The other side of each exists now (W3); if one does not match your cells, say so in the report (the hub will
   not fix it).
4. **`mapcheck`**: `check` clean (plan counts 3 and 3), `walk x1_highmoor first_fight_done` and `{ lantern: true }`, `walk x1_larchhill first_fight_done`:
   each of the three routes reaches the exit by itself (the Hidden Fold only with the Lantern and the Dash, the Aqueduct Walk only after the Shove);
   no softlock; leaving works from every cell; the one-way ledges never trap (every ledge cell has a way back or a way on).
5. **`qa/maps/x1_wild.test.mjs`**: the marks of 4.11, the placement rules of plan 3.6 including **one foe-free route per map**, the three routes as
   walks, every chest by its ability, the stile and the chute links, return doors land in front of their doors, and a draw and logic timing check
   on the phone profile (field logic under 3 ms, draw under 1 ms extra; report the numbers).
6. **Previews** named `x1_highmoor*` and `x1_larchhill*` (a `_routes` variant with the three routes drawn in three colors), viewed at 2x, and
   `docs/maps/X1_WILD.md` with exact cells, the routes as cell lists (for the autoplay bot), enemy and chest tables, preview paths.

## Rules

- Owned paths: `src/data/maps/x1_highmoor.js`, `x1_larchhill.js`, `tools/maps/previews/x1_highmoor*`, `x1_larchhill*`, `qa/maps/x1_wild.test.mjs`,
  `docs/maps/X1_WILD.md`. Not `valley.js`, `willowmere.js` (X1-maps-hub) and not `X1_MAPS_LISTED`. Missing tile or sprite ids are stubbed with the
  nearest existing id and named in your report.
- Every puzzle reads on a phone without text; lit paths lead forward; dead ends hold chests; the far-off landmarks are visible from the places the
  plan names and not from everywhere; no new fog object.
- Your map modules are `x1` pack files: nothing imports them directly (the `loadMap` guard fetches them on first entry); node tests import `src/data/x1/index.js` and call `register()` first. EXP is not yours: encounter data and `expMul` are X1-battle's.
- No git, no em dashes, bounded commands, one browser job at a time.
- Verify: the mapcheck commands above; `python tools/maps/preview.py --all --scale=2` for your maps; `node qa/run.mjs maps`.
- Report under 400 words: marks that differ from the plan, the three routes of each map with lengths, enemy and chest tables, frame-time numbers,
  preview paths.
