# E7-maps-a: the White Road, the Waystation, Palehaven, four interiors, the Zephyr Landing patches (wave 7c, beside E7-maps-b and E7-audio)

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md` 5.1 to 5.3, `docs/MAPS.md`, `docs/EPISODE7_PLAN.md` sections
0.1, 3, 4.1 to 4.5, 4.10, 4.11 and 5 (your contract), `docs/story/STAGING_EP7.md`, `docs/WORLD_EP7.md`, and the E7-tiles,
E7-world and E7-story reports. Model the files on `src/data/maps/ep6_airstair.js`, `ep6_zephyr.js`, the `ep6_zl_*`
interiors and `ep6_patches.js` (the patch pattern); the `ep7_` prefix is what keeps them in the pack.

## Owned paths

`src/data/maps/ep7_white_road.js`, `ep7_waystation.js`, `ep7_palehaven.js`, `ep7_ph_inn.js`, `ep7_ph_shop.js`,
`ep7_ph_armory.js`, `ep7_ph_watch.js`, `ep7_patches.js`, `qa/maps/ep7_a_*`, `docs/MAPS_EP7_A.md`,
`tools/maps/previews/ep7_white_road*`, `ep7_waystation*`, `ep7_palehaven*`, `ep7_ph_*`, `ep6_zephyr_ep7*`,
`ep6_zl_inn_ep7*`. Never `src/data/maps/ep6_*.js` or any earlier episode's map file.

## Outputs (items, in order)

1. **`ep7_patches.js`**: `withEp7Wake(ep6_zl_inn)` and `withNorthBerth(ep6_zephyr)` per plan 3, pure, every Episode 6
   cell, event, mark and walk result unchanged (`isles_return`'s north-dock arrival untouched; the Kestrel prop already
   there). E7-pack's `maps.js` applies them after the ep6 pack.
2. **The maps** of plan 4.1 to 4.4 (`ep7_white_road`, `ep7_waystation`, `ep7_palehaven`, `ep7_ph_inn`, `ep7_ph_shop`,
   `ep7_ph_armory`, `ep7_ph_watch`) with every mark, event, enemy count, chest, sign and inspect id from the pack's
   `text.js`, NPC events for every Episode 7 NPC record, the road's `remember` block (gaps A, B and C, Ilka's ledge; 5
   stones at most), the hearth, iced doors and Vanishing Mark in their two states (`hearth_lit`, `doors_reopened`), the
   boat-kind door at the lake back to Zephyr Landing, the Vault gate (`vault_open`), the nave door (`doors_reopened`), the
   save bells with their **own** text keys (`ep7_watch_bell`, `ep7_stove`). Palehaven reads at a glance on a phone around
   one image: the square and the cold hearth, iced doors all round it, the cathedral on the north skyline.
3. **The decision budget** (plan 4.10): the road's main path is **4** stone decisions (A 1, B 2, C 1) and Ilka's ledge 1
   optional. If a map needs more, take them from E7-maps-b's table only by agreement in your reports, never add.
4. **The camera rule** (plan 4): every staged focus mark from STAGING_EP7 at least 12 tiles from the map's left and right
   edges and 7 from its top and bottom (the hearth, the wall, the gaps, the whiteout's marks, the Watch's stage); widen a map
   rather than move a beat. Record each mark's edge distances in `MAPS_EP7_A.md`.
5. **Teaching:** gap A must teach without text: the stone, the white gap, its ghost trail and the far side in one screen at
   the approach (phone frame), and the far side in view after the read. Gap B's two stones and the ledge between visible
   together; the Asta path's let-go happens behind the party and is never needed again.
6. **Tests** `qa/maps/ep7_a_*`: Zephyr Landing with Episode 6 complete flags and `EP7_LIVE` off (no gangway, no trigger),
   with `ep7_boarded` (the berth lands at the lake); the road from the lake to the Icegate through E7-world's state search;
   every chest reachable in some state; no loop home; STAGING_EP7 marks present, walkable and inside the camera rule on your
   maps, none on a path or frost cell; no event uses an Episode 1 text key.
7. **Previews** in `tools/maps/previews/` (the road with each gap before and after its read; the town before and after
   `doors_reopened`; the Waystation; the four interiors; Zephyr's north dock and the inn patched), viewed; `docs/MAPS_EP7_A.md`
   in the house style with exact cells, the decision count per gap and the road's route as step and read sequences for the
   autoplay bot (where it rests: the Waystation stove).

## Done when

`node tools/maps/mapcheck.mjs check` is clean on your maps, every preview has been viewed until it reads like a shipped
SNES map, `node qa/run.mjs maps world` is green, and `MAPS_EP7_A.md` lists every mark, its edge distances, the decision
count and the bot's route.

## Tests to run

`node tools/maps/mapcheck.mjs check`; `node tools/maps/ep7_check.mjs` (E7-world's); `python tools/maps/preview.py` on your
maps at scale 2; `node qa/run.mjs maps world`.

## Traps

- **Patch registered maps, never the files.** `src/data/maps/ep6_*.js` belong to Episode 6; your patch is applied after the
  ep6 pack registers (the order trap is E7-pack's to enforce; keep your patch functions pure so the test can call them in
  both orders).
- **Old saves.** A player may have saved anywhere in Zephyr Landing after the Episode 6 credits: the gangway and the wake
  trigger must work from any of those saves, and change nothing for a save before `ep6_complete`.
- **Stones:** no actor start, trigger, NPC or enemy on a path or frost cell; every stone and its approach on ground; no cell
  in two paths; from every reachable state the way back is reachable (mapcheck enforces).
- **The bell lesson.** A copied interior keeps its Willowmere text keys unless you change them (Episode 6's chart room
  spoke Episode 1's bell line). Change every one.
- Every puzzle readable on a phone without text; lit paths lead forward; dead ends hold chests.
- House rules: no git; LF endings (count CR bytes before and after: zero); no em dashes; stay in owned paths; bound every
  command; restore `qa/world/out` if a suite rewrote it (the orchestrator runs the git command).

## Report (under 400 words)

Marks that differ from the plan, edge distances that needed a wider map, the road's route and decision count, enemy and
chest tables, preview paths, the phone-frame checks for gaps A and B.
