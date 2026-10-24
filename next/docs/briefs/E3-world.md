# E3-world: quench channels, gates, lifts, tint, plumbing (wave 17c, run 7 of 10)

Read `docs/briefs/COMMON.md`, `DESIGN.md` section 5, `docs/EPISODE3_PLAN.md` sections 5 and 10.5 (your contract),
`docs/WORLD.md`, `src/world/beam.js`, `src/world/silverglass.js` and `src/world/events.js` (the beam, mirror and
receptor code you are extending), and the reports of E3-tiles and E3-saves.

## Items, in order

1. **Quench channels** (plan 5.1): the `spout`, `sluice`, `basin` events; `beam.js` traced with `medium: 'water'` over
   `flow` tiles only (or a sibling pure `flow.js` with the same tests if the generalization is ugly; say which);
   permanent crust in `g.quenched[mapId]`; wet/dry trough frames; slag lights within budget; steam and `quench_hiss`;
   dams by blocks; basins as latched gate sources with scripts.
2. **Flag-source gates** (`flags: [...]`), **lift doors** (`kind: 'lift'`), the **`ash_haze`** tint (measured at least
   12% darker than `none` on a phone crop) and the **`ash`** and **`steam`** particle kinds (5.2).
3. **Memory vignette tint** for `bram_m`, `mara_m`, `foreman_m`, and the **speaker swap** for The Smith to Garrick.
4. **Story plumbing** (5.3): Episode 3 scenes in `story.js`, the `ep3_complete` credits handoff with `END_CARD_EP3`
   and the wake at `pk_inn`, the Keeper mirror pair (5.4).
5. **Tests**: tracing (each sluice orientation, splash, dams, crust permanence across reloads, loop guard, multiple
   spouts), basin latches and AND gates, flag gates, lift transfers, tint luminance, particle budget, and a headless
   walk of a test map with every new event (the real maps come next).

## Rules

- Owned paths: `src/world/**`, `src/scenes/field.js`, `src/game/story.js`, `src/game/inventory.js` (only if needed),
  `qa/world/**`, `docs/WORLD.md`. Not `src/game/state.js` or `episodes.js` (E3-saves'; ask through your report).
- Pure modules stay pure. No timers in puzzles. No git, no em dashes, bounded commands, one browser job at a time.
- Verify: `node qa/run.mjs world`; `python qa/world/fieldlab.py` shots of a Slag Hall test room before and after the
  sluice turn, a dammed trough, a basin opening a hot grate, the dark F3-style room lit by slag; field draw under 1 ms
  with 24 slag lights.
- Report under 400 words: the event contracts (fields, defaults), the save fields, the tracer decision, test counts,
  shot paths.
