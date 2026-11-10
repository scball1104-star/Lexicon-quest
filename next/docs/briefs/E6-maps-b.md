# E6-maps-b: the Storm Observatory, three floors, the Scribe's Eyrie and the Cloud Library (wave 6c, beside E6-maps-a and E6-audio)

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md` 5.1 to 5.3, `docs/MAPS.md`, `docs/EPISODE6_PLAN.md` sections
0.1, 4.4 to 4.10, 5 and 6.1 (your contract), `docs/story/STAGING_EP6.md`, `docs/CRITIQUE_7.md` items 8 and 9, the E6-tiles,
E6-world and E6-story reports. Model the files on `src/data/maps/ep5_lab_f1.js` to `ep5_lab_oracle.js` and
`docs/MAPS_EP5_B.md`.

## Owned paths

`src/data/maps/ep6_obs_f1.js`, `ep6_obs_f2.js`, `ep6_obs_f3.js`, `ep6_obs_eyrie.js`, `ep6_library.js`, `qa/maps/ep6_b_*`,
`docs/MAPS_EP6_B.md`, `tools/maps/previews/ep6_obs_*`, `ep6_library*`, and the one `EP6_MAPS_LISTED` line in
`src/data/ep6/encounters.js` (the only edit outside your paths; note it).

## Outputs (items, in order)

1. **The maps** `ep6_obs_f1`, `ep6_obs_f2`, `ep6_obs_f3`, `ep6_obs_eyrie`, `ep6_library` with every area, `wind` block,
   vane, post, Lantern lane, lamp, mark, enemy count, chest and puzzle of plan 4.5 to 4.9, signs and inspect ids from the
   pack's `text.js`. Floors must look different from each other room by room: sunlit plank and glass on cloud; brass relays
   and dark ducts; white stone in slate storm. F3 is the darkest map of the episode (measure: F3 mean luma at or below F2's,
   with the party's floor at or above 0.22 on the phone). The teaching ladder of plan 5.1 holds in order: each step
   introduces one idea.
2. **Staging marks** (CRITIQUE_7 item 8): `vex_trig` (F2) and `fall_trig` (F3) placed so the party stops two rows from Vex;
   no foe path crosses a staging cell; Aeris's three wait marks on the spire beside, not on, each lamp; the rope in
   `vex_falls` runs from `bram_line` to `vex_hang` over cloud, and no party member stands off the edge.
3. **Authoring rules** (plan 4.4) and **softlock rules** (plan 5.1) hold on every floor: vanes and post approaches on
   ground; nothing starting on a lane; every arrival reaching a vane at the start state; the entrance reachable from every
   reachable state, including every `blocked` stop cell; every lane path terminates in every vane state; island chests
   reachable in some state.
4. **Tests** `qa/maps/ep6_b_*`: the critical path from F1's Recovery Alcove to the Eyrie, the Kestrel's doors to the library
   and back to the town, and the F2 lift back to F1, through E6-world's state search; each puzzle's start state blocks and
   the intended solution opens it; every chest reachable; STAGING_EP6 marks present and walkable on your maps. Then set
   `EP6_MAPS_LISTED = true` in `src/data/ep6/encounters.js` (one line), only if E6-maps-a's maps exist and the whole
   stack-foot-to-library path passes; otherwise leave it to E6-integrate and say so.
5. **Previews** for every floor at its start state plus each vane state for F1, F2 and F3, viewed; `docs/MAPS_EP6_B.md` in
   the house style with exact cells and every puzzle's solution as vane toggles and ride sequences (for the autoplay bot).

## Done when

`node tools/maps/mapcheck.mjs check` is clean on your maps, the critical path test passes, every preview has been viewed,
the luma numbers are measured, and `MAPS_EP6_B.md` lists every solution.

## Tests to run

`node tools/maps/mapcheck.mjs check`; `node tools/maps/ep6_check.mjs`; `python tools/maps/preview.py` on your maps at scale
2; `node qa/run.mjs maps world`.

## Traps

- **Reload-revived floor foes** make bot level readings look easy: `field.js` keeps beaten foes gone only for the scene's
  life. Keep the placed counts exactly as `ZONES[zone].plan`; the bot's `--all-fights` hunts each placed foe once.
- **A save on a lane cell** (after a `blocked` stop) must reload able to step off: check every such cell.
- **No prop covers a lane's landing cell or a post** (CRITIQUE_7 item 9's lesson).
- Every puzzle readable on a phone without text; lit paths lead forward; dead ends hold chests.
- House rules: no git; LF endings (count CR bytes before and after: zero); no em dashes; stay in owned paths; bound every
  command; restore `qa/world/out` if a suite rewrote it.

## Report (under 400 words)

Marks that differ from the plan, puzzle solutions, enemy and chest tables, the F1 to F3 luma numbers, preview paths,
whether you flipped `EP6_MAPS_LISTED`.
