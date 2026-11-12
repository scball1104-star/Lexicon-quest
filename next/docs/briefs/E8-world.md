# E8-world: pop-up books, the void, the tints and the mote layer (wave 8b)

Build Episode 8's one field mechanic as a pure rule plus a pack-side system, without editing `field.js`.

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md` section 5, plan `docs/EPISODE8_PLAN.md` sections 4 (the phone
rule), 4.4 (the `popbooks` block and the rule), 4.10, 5.1 to 5.5 (your contract), the built Episode 7 field system
(`src/data/ep7/field/**`, `src/data/ep7/world.js`, `tools/maps/ep7_check.mjs`) as your model, Episode 6's lane-cell
precedent (`src/data/ep6/field/system.js`), `src/world/events.js` (`EXT`, `INTERACT_TYPES`), Episode 4's `reveal()`,
`qa/world/fieldlab.py` (`GPU_ARGS`, `GPU_JS`).

## Owned paths

`src/data/ep8/field/**` (popbooks.js, events, system, art), `src/data/ep8/world.js` (the EXT type, the `rubout` and `violet`
tints, the mote layer, the test map), `tools/maps/ep8_check.mjs` (+ one line in `tools/maps/mapcheck.mjs`), `qa/world/ep8_*`,
`docs/WORLD_EP8.md`.

## Outputs (items, in order)

1. **`popbooks.js`** (pure, node-tested): `compile`, `pages`, `read`, `walkable` exactly as plan 5.1: reading opens away from
   the reader; pages over void walk, over floor block; pairs close each other; the three refusals; deterministic; under 1 ms
   for 40 x 40 with 6 books.
2. **The `popbook` event type** on `EXT`, attached from `EXT.popbook.create` and from `world.js` on every map with a `popbooks`
   block (the ep7 pattern): facing a book from a long side shows the dotted gold ghost; confirm reads; the open and fold
   animations (16 and 12 frames, instant under reduceMotion); the collision override on `map.base`; `reveal()` when a change is
   over 6 tiles away; the bark hooks (`first_open`, `first_wall`, `first_side`, `first_pair`, `would_fold`) by id, words from
   E8-story; `page_open`/`page_fold`/`buzzer` by id. A held key neither drops nor adds a step across a read.
3. **Persistence:** reset to `start` on every entry; no save field; a save on a bridge cell loads with the party on the nearest
   ground.
4. **`world.js`:** the `rubout` and `violet` tints on `TINTS` and the night-tint sets (party floor at or above luma 0.22 under
   both), the void's mote layer (3 frames, at most +0.03 luma per frame, off under reduceMotion, under 0.5 ms), and a test map
   with one book of each kind and a pair.
5. **`ep8_check.mjs`** for mapcheck: the authoring rules of plan 4.4, the softlock rules of 5.1 (breadth-first over book states
   x the party's cell: critical path, no stranding, every chest reachable, no loop home), the decision count per map against
   4.10, and the camera margin per staged mark (reads `STAGING_EP8.md` when present).
6. **`docs/WORLD_EP8.md`**: the rule, the block, the checks, the numbers.
7. **Tests** `qa/world/ep8_*`: the rule's every clause, refusals, pairs, persistence, a fieldlab run on the test map with shots
   **viewed** (a book shut, open as a bridge, open as a wall, the ghost on void and on floor, a pair swapping) on the phone
   profile with `GPU_ARGS`.

## Done when

`node qa/run.mjs world` is green; mapcheck runs `ep8_check` on the test map clean; the fieldlab shots are viewed and the
readability pairs measured on them meet plan 5.1's floors.

## Tests to run

`node qa/run.mjs world`; `node tools/maps/mapcheck.mjs check`; `python qa/world/fieldlab.py` on the test map (bounded).

## Traps

- **`src/scenes/field.js` is not edited.** If you think it must be, stop and report.
- **Ids:** the event is `popbook`, the block `popbooks` (`popup` is the number popups' word).
- **No timers, no damage tiles, no randomness.**
- **`qa/world/out` is rewritten by the world suite:** restore it with `git checkout -- next/qa/world/out`; never commit it (the
  orchestrator does the git).
- **Timing measures need `fieldlab.GPU_ARGS`** or a phone reads 40% slow.
- House rules: no git; LF endings; no em dashes; owned paths only; bound every command.

## Report (under 400 words)

The rule's API, the block shape the map agents must write, the check's outputs, measured pairs and timings, the shots viewed
(paths), and anything the map agents must avoid.
