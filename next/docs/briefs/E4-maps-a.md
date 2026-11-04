# E4-maps-a: the Flood Road, Valewyn, four interiors, the Emberpeak and inn patches (wave 4c, beside E4-maps-b and E4-audio)

Read `docs/briefs/COMMON.md`, `DESIGN.md` 5.1 to 5.3, `docs/MAPS.md`, `docs/EPISODE4_PLAN.md` sections 3, 4.1 to 4.4,
4.9 and 5 (your contract), `docs/story/STAGING_EP4.md`, the E4-tiles, E4-world and E4-story reports. Model the files on
`src/data/maps/ep3/sand_road.js`, `emberpeak.js` and `hollow_gate.js` (the patch pattern), and the X1 map files (the
`ep4_` prefix is what keeps them in the pack).

## Items, in order

1. **`src/data/maps/ep4_patches.js`**: `withEastRoad(emberpeak)` and `withEp4Wake(pk_inn)` per plan 3, pure, every
   Episode 3 cell, event, mark and walk result unchanged. E4-pack's `maps.js` applies them after the ep3 pack.
2. **The maps** of plan 4.1 to 4.3 (`ep4_flood_road`, `ep4_valewyn`, `ep4_vw_inn`, `ep4_vw_shop`, `ep4_vw_forge`,
   `ep4_vw_palace`) with every mark, event, enemy count, chest, sign and inspect id from the pack's `text.js`, NPC
   events for every Episode 4 NPC record, the road's drowned lane as a 2-level `tide` basin, the ferry boat doors, the
   river quarter's flag-driven overlay. No room floats as a rectangle in black; the town reads at a glance on a phone.
3. **Tests** `qa/maps/ep4_a_*`: Emberpeak with Episode 3 complete flags and `EP4_LIVE` off (washout shut, no trigger),
   with `east_road_open` (exit reachable); the road from the washout to the ferry at the lane's start level and after
   the drain; every chest reachable; STAGING_EP4 marks present and walkable on your maps.
4. **Previews** in `tools/maps/previews/` (the road at mid and low, the town before and after `vw_restored`, the four
   interiors, Emberpeak patched), viewed; `docs/MAPS_EP4_A.md` in the house style with exact cells and the lane's
   solution for the autoplay bot.

## Rules

- Owned paths: plan 11.1, row E4-maps-a. Never the files in `src/data/maps/ep3/` or any core map file.
- Every puzzle readable on a phone without text; lit paths lead forward; dead ends hold chests. No git, no em dashes,
  bounded commands.
- Verify: `node tools/maps/mapcheck.mjs check`; `python tools/maps/preview.py` on your maps at scale 2; view each until
  it reads like a shipped SNES map; `node qa/run.mjs maps world`.
- Report under 400 words: marks that differ from the plan, the lane solution, enemy and chest tables, preview paths.
