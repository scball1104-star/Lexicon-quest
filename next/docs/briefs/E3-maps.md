# E3-maps: the ten maps and Hollowmere's east gate (wave 17c, run 8 of 10)

Read `docs/briefs/COMMON.md`, `DESIGN.md` 5.1 to 5.3, `docs/MAPS.md`, `docs/EPISODE3_PLAN.md` sections 3, 4 and 5 (your
contract), `docs/story/STAGING_EP3.md`, and the E3-tiles and E3-world reports. Model the files on
`src/data/maps/court_f1.js` and `nameless_hollow.js`.

## Items, in order

1. **Hollowmere's east gate** (plan 3): the spur, the chain, the trigger, the exit; every Episode 2 mark and walk
   result unchanged.
2. **The maps** of plan 4 with every mark, event, enemy count, chest and puzzle; signs and inspect ids from `ep3.js`;
   NPC events for every Episode 3 `npcs.js` entry. Floors must look different from each other room by room
   (CRITIQUE_4 items 6 and 13), and no room floats as a rectangle in black.
3. **`mapcheck.mjs`**: model water (enumerate sluice states per spout system, permanent crust as a one-way unlock,
   Shove and push dams), flag gates, lifts; walk once with Episode 2 complete flags (east gate shut) and once with
   Episode 3 progress flags.
4. **`qa/maps` tests**: the Episode 3 critical path from Hollowmere to `foundry_heart` and back by the lift; every
   chest reachable; each puzzle's start state crusts nothing critical and the intended solution does; the softlock
   rules of 5.1; STAGING_EP3 marks present and walkable. Then set `EP3_MAPS_LISTED = true` (in `encounters.js`, one
   line, the only edit you make outside your paths; note it in the report).
5. **Previews** for every new and edited map in `tools/maps/previews/` (including a `_solved` variant per foundry
   floor), viewed; MAPS.md sections in the house style.

## Rules

- Owned paths: `src/data/maps/**` (new maps; the `nameless_hollow.js` edit), `tools/maps/**`, `qa/maps/**`,
  `docs/MAPS.md`, and the one `EP3_MAPS_LISTED` line.
- Every puzzle readable on a phone without text; lit paths lead forward; dead ends hold chests. No git, no em dashes,
  bounded commands.
- Verify: `node tools/maps/mapcheck.mjs check`; `python tools/maps/preview.py --all --scale=2`; view each map until it
  reads like a shipped SNES map; `node qa/run.mjs maps world`.
- Report under 400 words: exact marks that differ from the plan, puzzle solutions (for the autoplay bot), enemy and
  chest tables, preview paths.
