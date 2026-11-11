# E8-maps-a: the Stair, the Scriptorium, its interiors, the bell tower at night, the two patches (wave 8c)

Build the open half of Episode 8: the climb, the town, and the ending's map.

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md` 5.1, `docs/MAPS.md`, plan `docs/EPISODE8_PLAN.md` sections 2.1, 3,
4.1 to 4.4, 4.9 to 4.11 and 5.4 (your contract), `docs/story/EPISODE8.md` Acts I to III and VI, `docs/story/STAGING_EP8.md`
(E8-story's marks), `docs/WORLD_EP8.md` (the `popbooks` block), E8-tiles' report (object ids), the built Episode 7 maps
`ep7_ph_watch` (2026-11-11: the credits wake there, not the Thawlight Lodge) and `ep7_stillheart` and `src/data/maps/ep7_patches.js` (your patch model), `src/data/maps/bell_tower.js` and the
Willowmere interiors you copy from.

## Owned paths

`src/data/maps/ep8_stair.js`, `ep8_scriptorium.js`, `ep8_sc_inn.js`, `ep8_sc_shop.js`, `ep8_sc_atelier.js`, `ep8_sc_index.js`,
`ep8_bell_night.js`, `ep8_patches.js`, `qa/maps/ep8_a_*`, `docs/MAPS_EP8_A.md`, `tools/maps/previews/ep8_stair*`,
`ep8_scriptorium*`, `ep8_sc_*`, `ep8_bell_night*`, `ep7_ph_watch_ep8*`, `ep7_stillheart_ep8*`.

## Outputs (items, in order)

1. **`ep8_patches.js`**: `withEp8Wake` and `withStairDoor` (plan 3), identity-safe, every Episode 7 mark and walk unchanged.
2. **`ep8_stair`** (30 x 60): plan 4.1, four main-path decisions (A 1, B 1, C 2) and one optional, the reading desk, the
   satchel chest (1,700), the Eraser figure's far mark at least 12 tiles from the sides, the South Margin and its decal.
3. **`ep8_scriptorium`** (46 x 36): plan 4.2, the Codex at least 12 tiles from each side, every object with both states, both
   Library doors with their flags, every NPC at its mark.
4. **The four interiors** (plan 4.3), each copied from its Willowmere counterpart's layout and exits, re-dressed; the Index's
   save bell with its own key.
5. **`ep8_bell_night`** (plan 4.9): import `bell_tower.js` read-only and return a copy under the new id with night, the beam
   marks and the enter trigger; if the module exposes nothing reusable, copy the layout into the new module and say so. The cold
   open's map is never edited.
6. **`docs/MAPS_EP8_A.md`**: exact cells, the book solutions (the sequence of reads per puzzle, for the bot), every mark's camera
   margin, enemy placements against `ZONES[zone].plan`, chests and contents.
7. **Previews** of every map, the patched maps, and each book state that matters (Gap A shut and open, Gap C as bridge and as
   wall), **viewed**.
8. **Tests** `qa/maps/ep8_a_*`: marks exist and are reachable; the camera rule for every staged mark; the patch order (only with
   ep7 and ep8); the stair door lands on ground; the critical path with books; no book cell under an actor; the decision count.

## Done when

`node tools/maps/mapcheck.mjs check` is clean for your maps (with `ep8_check`); every preview is viewed; `node qa/run.mjs maps`
is green for your tests.

## Tests to run

`node tools/maps/mapcheck.mjs check`; `python tools/maps/preview.py` on each map; `node qa/run.mjs maps`.

## Traps

- **The order trap:** your patches are applied by E8-pack's `maps.js` after ep7 registers; never import `src/data/maps/ep7_*.js`
  to edit it.
- **Decision budget:** 4 on the Stair, no more; take any extra from another map in plan 4.10's table only with the other
  agent's agreement through the orchestrator, and say so.
- **No loop home**, no state that strands the player, no page over a wall, water or door.
- **The camera rule:** 12 tiles from the sides, 7 from top and bottom, for every staged mark; widen the map if needed.
- **Never a bare `scriptorium` id** (Episode 4 uses it as a mark).
- House rules: no git; LF endings; no em dashes; owned paths only; bound every command.

## Report (under 400 words)

Map sizes, the book solutions, decision counts, camera margins, enemy counts, chest contents, previews viewed (paths), and any
change to plan 4 and why.
