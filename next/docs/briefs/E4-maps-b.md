# E4-maps-b: the Sunken Keep, three floors and the Drowned Throne (wave 4c, beside E4-maps-a and E4-audio)

Read `docs/briefs/COMMON.md`, `DESIGN.md` 5.1 to 5.3, `docs/MAPS.md`, `docs/EPISODE4_PLAN.md` sections 4.4 to 4.9, 5
and 6.1 (your contract), `docs/story/STAGING_EP4.md`, the E4-tiles, E4-world and E4-story reports. Model the files on
`src/data/maps/ep3/foundry_f1.js` to `foundry_heart.js`.

## Items, in order

1. **The maps** `ep4_keep_f1`, `ep4_keep_f2`, `ep4_keep_f3`, `ep4_keep_crown` (`src/data/maps/ep4_keep_*.js`) with
   every area, `tide` block, wheel, post, pontoon, forgery, floodgate, mark, enemy count, chest and puzzle of plan 4.5
   to 4.8, signs and inspect ids from the pack's `text.js`. Floors must look different from each other room by room
   (CRITIQUE_4 items 6 and 13). The teaching ladder of plan 5.1 holds in order: each step introduces one idea.
2. **Authoring rules** (plan 4.4) and **softlock rules** (plan 5.1) hold on every floor: wheels faced from dry cells,
   nothing standing on a floodable cell, every arrival reaching its wheels at the start levels, the entrance reachable
   from every reachable state, chests on channel floors reachable at low water.
3. **Tests** `qa/maps/ep4_b_*`: the Episode 4 critical path from F1's Water Gate to the Drowned Throne and back by the
   boats, through E4-world's mapcheck state search; each puzzle's start state washes nothing critical and the intended
   solution does; every chest reachable; STAGING_EP4 marks present and walkable on your maps. Then set
   `EP4_MAPS_LISTED = true` in `src/data/ep4/encounters.js` (one line, the only edit outside your paths; note it), only
   if E4-maps-a's maps exist and the whole road-to-throne path passes; otherwise leave it to E4-integrate and say so.
4. **Previews** for every floor at its start levels plus `_low` and `_high` variants, viewed; `docs/MAPS_EP4_B.md` in
   the house style with exact cells and every puzzle's solution as wheel inputs (for the autoplay bot).

## Rules

- Owned paths: plan 11.1, row E4-maps-b.
- Every puzzle readable on a phone without text; lit paths lead forward; dead ends hold chests. No git, no em dashes,
  bounded commands.
- Verify: `node tools/maps/mapcheck.mjs check`; `python tools/maps/preview.py` on your maps at scale 2; view each;
  `node qa/run.mjs maps world`.
- Report under 400 words: marks that differ from the plan, puzzle solutions, enemy and chest tables, preview paths,
  whether you flipped `EP4_MAPS_LISTED`.
