# E5-maps-b: the Oracle Labyrinth, three floors and the Eye of the Oracle (wave 5c, beside E5-maps-a and E5-audio)

Read `docs/briefs/COMMON.md`, `DESIGN.md` 5.1 to 5.3, `docs/MAPS.md`, `docs/EPISODE5_PLAN.md` sections 0.1, 4.5 to 4.10,
5 and 6.1 (your contract), `docs/story/STAGING_EP5.md`, `docs/CRITIQUE_6.md` items 6, 7 and 11, the E5-tiles, E5-world
and E5-story reports. Model the files on `src/data/maps/ep4_keep_f1.js` to `ep4_keep_crown.js` and `docs/MAPS_EP4_B.md`.

## Items, in order

1. **The maps** `ep5_lab_f1`, `ep5_lab_f2`, `ep5_lab_f3`, `ep5_lab_oracle` (`src/data/maps/ep5_lab_*.js`) with every
   area, `shade` block, dial, caster, groove, window, lamp, plate, mark, enemy count, chest and puzzle of plan 4.6 to
   4.9, signs and inspect ids from the pack's `text.js`. Floors must look different from each other room by room: ochre
   courts under the sky, a dark lapis gallery with shafts of light, a basalt well lit only by lamps. F3 is the darkest map
   of the episode (measure: F3 mean luma at or below F2's). The teaching ladder of plan 5.1 holds in order: each step
   introduces one idea.
2. **Staging marks** (CRITIQUE_6 item 11): `vex_trig` and every scene trigger placed so the party stops two rows from the
   speaker; Sel's three wait marks in the Well beside, not on, the spring.
3. **Authoring rules** (plan 4.5) and **softlock rules** (plan 5.1) hold on every floor: dials, grooves and plate
   approaches on pavement; nothing starting on sand; every arrival reaching a dial (or a lamp) at the start state; the
   entrance reachable from every reachable state; island chests reachable in some state.
4. **Tests** `qa/maps/ep5_b_*`: the critical path from F1's Oasis Gate to the Eye and back by the lifts, through
   E5-world's state search; each puzzle's start state blocks and the intended solution opens it; every chest reachable;
   STAGING_EP5 marks present and walkable on your maps. Then set `EP5_MAPS_LISTED = true` in `src/data/ep5/encounters.js`
   (one line, the only edit outside your paths; note it), only if E5-maps-a's maps exist and the whole jetty-to-Eye path
   passes; otherwise leave it to E5-integrate and say so.
5. **Previews** for every floor at its start state plus each hour (`_dawn`, `_noon`, `_dusk`) for F1 and F2, and F3 with
   its lamps at start and solved, viewed; `docs/MAPS_EP5_B.md` in the house style with exact cells and every puzzle's
   solution as dial choices and Shove sequences (for the autoplay bot).

## Rules

- Owned paths: plan 11.1, row E5-maps-b.
- Every puzzle readable on a phone without text; lit paths lead forward; dead ends hold chests. No git, no em dashes,
  bounded commands.
- Verify: `node tools/maps/mapcheck.mjs check`; `python tools/maps/preview.py` on your maps at scale 2; view each;
  `node qa/run.mjs maps world`.
- Report under 400 words: marks that differ from the plan, puzzle solutions, enemy and chest tables, the F1 to F3 luma
  numbers, preview paths, whether you flipped `EP5_MAPS_LISTED`.
