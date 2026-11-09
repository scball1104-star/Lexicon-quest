# E5-maps-a: the Saffron Wind, the Caravan Road, Saffron Haven, four interiors, the Valewyn patches (wave 5c, beside E5-maps-b and E5-audio)

Read `docs/briefs/COMMON.md`, `DESIGN.md` 5.1 to 5.3, `docs/MAPS.md`, `docs/EPISODE5_PLAN.md` sections 0.1, 3, 4.1 to 4.5,
4.10 and 5 (your contract), `docs/story/STAGING_EP5.md`, the E5-tiles, E5-world and E5-story reports. Model the files on
`src/data/maps/ep4_flood_road.js`, `ep4_valewyn.js`, the `ep4_vw_*` interiors and `ep4_patches.js` (the patch pattern);
the `ep5_` prefix is what keeps them in the pack.

## Items, in order

1. **`src/data/maps/ep5_patches.js`**: `withEp5Wake(ep4_vw_inn)` and `withShipBerth(ep4_valewyn)` per plan 3, pure,
   every Episode 4 cell, event, mark and walk result unchanged. E5-pack's `maps.js` applies them after the ep4 pack.
2. **The maps** of plan 4.1 to 4.4 (`ep5_ship`, `ep5_caravan_road`, `ep5_saffron`, `ep5_sh_inn`, `ep5_sh_shop`,
   `ep5_sh_smithy`, `ep5_sh_observatory`) with every mark, event, enemy count, chest, sign and inspect id from the pack's
   `text.js`, NPC events for every Episode 5 NPC record, the road's `shade` block (start `noon`, the Glass Flat, the
   island), the deck's night and dawn states, the Haven's two states (`haven_restored`), the water stairs, the north gate's
   door (`gnomon_get`). The town reads at a glance on a phone around one image: the armillary over the oasis.
3. **Teaching:** the Glass Flat must teach without text: the flat, the obelisk, the dial and the far road in one screen
   at the approach (phone frame), and the dawn shadow landing in view (no pan needed).
4. **Tests** `qa/maps/ep5_a_*`: Valewyn with Episode 4 complete flags and `EP5_LIVE` off (no ship, no trigger), with
   `ship_boarded` (the berth lands on the deck) and with `road_landed` (the berth goes to the Haven); the road from the
   jetty to the Haven at its start hour fails and at dawn passes; every chest reachable in some state; STAGING_EP5 marks
   present and walkable on your maps.
5. **Previews** in `tools/maps/previews/` (the deck at night and dawn; the road at dawn, noon and dusk; the Haven before
   and after `haven_restored`; the four interiors; Valewyn's landing and the inn patched), viewed; `docs/MAPS_EP5_A.md` in
   the house style with exact cells and the road's solution as dial inputs for the autoplay bot.

## Rules

- Owned paths: plan 11.1, row E5-maps-a. Never `src/data/maps/ep4_*.js`, `src/data/maps/ep3/**` or any core map file.
- Every puzzle readable on a phone without text; lit paths lead forward; dead ends hold chests; dials, grooves and actor
  starts on pavement, never sand. No git, no em dashes, bounded commands.
- Verify: `node tools/maps/mapcheck.mjs check`; `python tools/maps/preview.py` on your maps at scale 2; view each until it
  reads like a shipped SNES map; `node qa/run.mjs maps world`.
- Report under 400 words: marks that differ from the plan, the road's solution, enemy and chest tables, preview paths.
