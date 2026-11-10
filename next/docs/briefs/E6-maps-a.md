# E6-maps-a: the Airstair, Zephyr Landing, four interiors, the Saffron Haven patches (wave 6c, beside E6-maps-b and E6-audio)

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md` 5.1 to 5.3, `docs/MAPS.md`, `docs/EPISODE6_PLAN.md` sections
0.1, 3, 4.1 to 4.4, 4.10 and 5 (your contract), `docs/story/STAGING_EP6.md`, the E6-tiles, E6-world and E6-story reports.
Model the files on `src/data/maps/ep5_caravan_road.js`, `ep5_saffron.js`, the `ep5_sh_*` interiors and `ep5_patches.js`
(the patch pattern); the `ep6_` prefix is what keeps them in the pack.

## Owned paths

`src/data/maps/ep6_airstair.js`, `ep6_zephyr.js`, `ep6_zl_inn.js`, `ep6_zl_shop.js`, `ep6_zl_workshop.js`,
`ep6_zl_charts.js`, `ep6_patches.js`, `qa/maps/ep6_a_*`, `docs/MAPS_EP6_A.md`, `tools/maps/previews/ep6_airstair*`,
`ep6_zephyr*`, `ep6_zl_*`, `ep5_saffron_ep6*`, `ep5_sh_inn_ep6*`. Never `src/data/maps/ep5_*.js`, `ep4_*.js`,
`src/data/maps/ep3/**` or any core map file.

## Outputs (items, in order)

1. **`ep6_patches.js`**: `withEp6Wake(ep5_sh_inn)` and `withSkyBerth(ep5_saffron)` per plan 3, pure, every Episode 5 cell,
   event, mark and walk result unchanged (Valewyn's `haven_boat` on the same quay untouched). E6-pack's `maps.js` applies
   them after the ep5 pack.
2. **The maps** of plan 4.1 to 4.3 (`ep6_airstair`, `ep6_zephyr`, `ep6_zl_inn`, `ep6_zl_shop`, `ep6_zl_workshop`,
   `ep6_zl_charts`) with every mark, event, enemy count, chest, sign and inspect id from the pack's `text.js`, NPC events
   for every Episode 6 NPC record, the Airstair's `wind` block (lane A, the post lane B), the town's two comfort lanes, the
   board, chimes and beacon in their two states (`isles_restored`, `beacon_lit`), the boat door at the stack's foot, the
   east airstair gate (`windward_pass`). The town reads at a glance on a phone around one image: the board plaza, the
   islands and the storm on the north-east skyline.
3. **Teaching:** lane A must teach without text: the landing, the stream, its chevrons and the far ledge in one screen at
   the approach (phone frame), and the landing cell in view. Lane B's post must be visible from the lane's entry.
4. **Tests** `qa/maps/ep6_a_*`: Saffron Haven with Episode 5 complete flags and `EP6_LIVE` off (no ship, no trigger), with
   `ep6_boarded` (the berth lands at the stack's foot); the Airstair from the foot to the town exit through E6-world's
   state search; every chest reachable in some state; every lane path terminates; STAGING_EP6 marks present and walkable on
   your maps, none on a lane cell.
5. **Previews** in `tools/maps/previews/` (the Airstair with its lanes drawn; the town before and after `isles_restored`;
   the four interiors; Saffron's water stairs and the inn patched), viewed; `docs/MAPS_EP6_A.md` in the house style with
   exact cells and the Airstair's route as step sequences for the autoplay bot.

## Done when

`node tools/maps/mapcheck.mjs check` is clean on your maps, every preview has been viewed until it reads like a shipped
SNES map, `node qa/run.mjs maps world` is green, and `MAPS_EP6_A.md` lists every mark and the bot's route.

## Tests to run

`node tools/maps/mapcheck.mjs check`; `node tools/maps/ep6_check.mjs` (E6-world's); `python tools/maps/preview.py` on your
maps at scale 2; `node qa/run.mjs maps world`.

## Traps

- **Patch registered maps, never the files.** `src/data/maps/ep5_*.js` belong to Episode 5; your patch is applied after the
  ep5 pack registers (the order trap is E6-pack's to enforce; keep your patch functions pure so the test can call them in
  both orders).
- **Old saves.** A player may have saved anywhere in Saffron Haven after the Episode 5 credits: the berth and the wake
  trigger must work from any of those saves, and change nothing for a save before `ep5_complete`.
- **Lanes:** no actor start, trigger, NPC or enemy on a lane cell; every vane and post approach on ground; a stop on a lane
  cell can always step off (plan 4.4 authoring rules; mapcheck enforces).
- Every puzzle readable on a phone without text; lit paths lead forward; dead ends hold chests.
- House rules: no git; LF endings (count CR bytes before and after: zero); no em dashes; stay in owned paths; bound every
  command; restore `qa/world/out` if a suite rewrote it (the orchestrator runs the git command).

## Report (under 400 words)

Marks that differ from the plan, the Airstair's route, enemy and chest tables, preview paths, the phone-frame checks for
lanes A and B.
